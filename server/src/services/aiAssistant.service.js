import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const callOpenRouter = async (messages, { temperature = 0.3, response_format = undefined } = {}) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set');

  const payload = {
    model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
    messages,
    temperature,
  };
  
  if (response_format) {
    payload.response_format = response_format;
  }

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    payload,
    { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );

  return response.data.choices[0].message.content.trim();
};

export class AIAssistantService {
  async processRequest(scanId, userId, conversation) {
    const scan = await prisma.repositoryScan.findFirst({
      where: { id: scanId, repository: { userId } },
      include: { repository: true, healthScore: true }
    });

    if (!scan) throw new Error('Scan not found');

    const lastUserMessage = conversation[conversation.length - 1].content;
    const category = await this._classifyIntent(lastUserMessage, conversation);
    const contextData = await this._retrieveContext(scanId, category, lastUserMessage);
    
    return await this._generateResponse(conversation, contextData, scan);
  }

  async _classifyIntent(question, conversation) {
    const prompt = `Classify the following user question about a codebase into ONE of these categories:
- SECURITY (vulnerabilities, secrets, SAST, CWE, injection, etc.)
- COMPLEXITY (cyclomatic/cognitive complexity, nesting, hard to understand code)
- DEPENDENCIES (npm packages, vulnerable dependencies, architecture graph)
- ARCHITECTURE (layering, structure, design patterns)
- REFACTORING (what to fix first, how to improve code, technical debt)
- FUNCTION (asking about a specific function's logic, metrics, or details)
- OVERVIEW (general summary, health score, onboarding)

Recent conversation context:
${conversation.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

Question: "${question}"

Reply with ONLY the exact category name.`;

    try {
      const result = await callOpenRouter([{ role: 'user', content: prompt }]);
      const category = result.trim().toUpperCase();
      const valid = ['SECURITY', 'COMPLEXITY', 'DEPENDENCIES', 'ARCHITECTURE', 'REFACTORING', 'FUNCTION', 'OVERVIEW'];
      return valid.includes(category) ? category : 'OVERVIEW';
    } catch (err) {
      console.warn('Classification failed, defaulting to OVERVIEW');
      return 'OVERVIEW';
    }
  }

  async _retrieveContext(scanId, category, question) {
    const context = {};
    
    // Always fetch general scan metadata
    const scanMeta = await prisma.repositoryScan.findUnique({
      where: { id: scanId },
      include: { healthScore: true }
    });
    context.health = scanMeta.healthScore;
    context.summary = scanMeta.summary;

    if (category === 'SECURITY' || category === 'REFACTORING') {
      const secFindings = await prisma.securityFinding.findMany({
        where: { scanId },
        orderBy: { severity: 'asc' }, 
        take: 30
      });
      // Sort critically: CRITICAL, HIGH, MEDIUM, LOW
      const sevMap = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
      secFindings.sort((a, b) => (sevMap[a.severity] || 5) - (sevMap[b.severity] || 5));
      context.securityFindings = secFindings.map(f => ({
        type: f.type, severity: f.severity, file: f.file, line: f.lineNumber,
        snippet: f.snippet, description: f.description, cwe: f.cwe
      }));
    }

    if (category === 'COMPLEXITY' || category === 'REFACTORING' || category === 'FUNCTION') {
      const compFindings = await prisma.finding.findMany({
        where: { scanId, category: 'COMPLEXITY' },
        orderBy: { severity: 'asc' },
        take: 20
      });
      // Unpack decision points from metrics JSON
      context.complexityFindings = compFindings.map(f => {
         const finding = {
           rule: f.ruleId, symbol: f.symbol, file: f.file,
           severity: f.severity, message: f.message,
         };
         if (f.metrics && typeof f.metrics === 'object') {
           finding.metrics = {
              cyclomatic: f.metrics.cyclomaticComplexity,
              cognitive: f.metrics.cognitiveComplexity,
              depth: f.metrics.maxNestingDepth
           };
           if (f.metrics.decisionPoints) {
              finding.decisionPoints = f.metrics.decisionPoints;
           }
         }
         return finding;
      });
      
      // If FUNCTION, try to extract function name and filter
      if (category === 'FUNCTION') {
         // Very basic heuristic to find a word that looks like a function name in the question
         const words = question.split(/[^a-zA-Z0-9_]/).filter(w => w.length > 2);
         const targetFn = compFindings.find(f => f.symbol && words.includes(f.symbol));
         if (targetFn) {
            context.targetFunction = context.complexityFindings.find(f => f.symbol === targetFn.symbol);
         }
      }
    }

    if (category === 'DEPENDENCIES' || category === 'ARCHITECTURE') {
      const graph = await prisma.dependencyGraph.findUnique({ where: { scanId } });
      if (graph) {
        context.dependencyMetrics = graph.metrics;
        context.hotspots = graph.hotspots;
        context.cycles = graph.cycles;
      }
      
      const arch = await prisma.architectureModel.findUnique({ where: { scanId } });
      if (arch) {
        context.architecture = arch;
      }
    }

    if (category === 'OVERVIEW') {
      const onboarding = await prisma.onboardingGuide.findUnique({ where: { scanId } });
      if (onboarding) context.onboarding = onboarding.content.substring(0, 2000);
    }

    return context;
  }

  async _generateResponse(conversation, contextData, scan) {
    const contextString = JSON.stringify(contextData, null, 2);

    const systemPrompt = `You are the RepoLens AI Assistant, a senior software engineer analyzing a repository.
Your CORE PRINCIPLE is to NEVER invent or hallucinate facts about the repository.
Every claim must be grounded in the provided Analysis Context.
Do not invent files, functions, vulnerabilities, CVEs, or complexities.
If the data is not in the context, explicitly say: "RepoLens does not currently have sufficient data to determine that."

Format your response strictly as JSON matching this schema:
{
  "answer": "Your detailed explanation, addressing the user's question directly. Use markdown.",
  "evidence": [
    { "file": "path/to/file.js", "startLine": 42, "findingId": "RULE_ID" }
  ],
  "recommendations": [
    "Specific, actionable recommendation 1",
    "Specific, actionable recommendation 2"
  ],
  "confidence": "HIGH|MEDIUM|LOW",
  "limitations": "Optional string if you lack data to fully answer the question, or null."
}

Prioritization rule: If asked what to fix first, prioritize: Confirmed critical security > High complexity > Architecture issues. Explain why.
When discussing complexity, refer to the decision points breakdown if available.
Security rule: Do not call a CWE a CVE. Only use data present. If you lack context on a function, state that you do not have its source code.

Repository: ${scan.repository.fullName}
Context Data:
${contextString}
`;

    // Strip previous system prompts from conversation to avoid clutter
    const userMessages = conversation.filter(m => m.role !== 'system');

    const responseFormat = { type: "json_object" };

    try {
      const result = await callOpenRouter(
        [
          { role: 'system', content: systemPrompt },
          ...userMessages
        ],
        { temperature: 0.1, response_format: responseFormat }
      );
      
      try {
        const parsed = JSON.parse(result);
        return parsed;
      } catch (e) {
        // Fallback if model doesn't return perfect JSON
        return {
          answer: result.replace(/```json|```/g, '').trim(),
          evidence: [],
          recommendations: [],
          confidence: "MEDIUM",
          limitations: "Response parsing failed."
        };
      }
    } catch (err) {
      console.error('LLM Generation Error:', err.message);
      throw err;
    }
  }
}
