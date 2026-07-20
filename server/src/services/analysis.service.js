import axios from 'axios';

// ---------------------------------------------------------------------------
// Shared OpenRouter call — deduplicated from the 3 near-identical copies
// ---------------------------------------------------------------------------
const callOpenRouter = async (prompt, { json = true, retries = 1 } = {}) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  // Default to openrouter/free — zero cost, auto-routed, supports JSON mode.
  // Set OPENROUTER_MODEL env var to override (e.g. a paid model once credits are topped up).
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 4000,
  };
  if (json) body.response_format = { type: "json_object" };

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        body,
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 120000, // 2-minute timeout — prevents Render from silently killing the request
        }
      );
      return response.data.choices[0].message.content.trim();
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const providerErr = err?.response?.data?.error;

      // Log the detailed error so it appears in Render logs
      console.error(
        `[OpenRouter] Attempt ${attempt + 1} failed — HTTP ${status || 'N/A'} | ` +
        `Model: ${model} | ` +
        `Provider: ${providerErr?.metadata?.provider_name || 'unknown'} | ` +
        `Error: ${providerErr?.message || err.message}`
      );

      // Only retry on transient server errors (502, 503, 529 = overloaded)
      const isTransient = [502, 503, 529].includes(status);
      if (!isTransient || attempt === retries) break;

      // Brief pause before retry
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
    }
  }
  throw lastError;
};

// ---------------------------------------------------------------------------
// JSON parsing with a retry that actually retries (the original caught the
// control-character error, "fixed" the string, then threw anyway)
// ---------------------------------------------------------------------------
const parseModelJson = (raw) => {
  let rawJson = raw;
  const match = rawJson.match(/\{[\s\S]*\}/);
  if (match) rawJson = match[0];
  rawJson = rawJson.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

  try {
    return JSON.parse(rawJson);
  } catch (e) {
    if (e.message.includes('control character')) {
      const repaired = rawJson.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      return JSON.parse(repaired); // now actually re-parsed; throws naturally if still broken
    }
    throw e;
  }
};

// ---------------------------------------------------------------------------
// Line-number validation — drops any AI claim that doesn't match a real line
// in the real file, instead of trusting it blindly
// ---------------------------------------------------------------------------
const buildLineIndex = (fileContents, filePaths) => {
  const index = {};
  filePaths.forEach((path, i) => {
    index[path] = (fileContents[i] || '').split('\n');
  });
  return index;
};

const isValidLine = (lines, lineNumber) =>
  Array.isArray(lines) && Number.isInteger(lineNumber) && lineNumber >= 1 && lineNumber <= lines.length;

const validateFindings = (findings, lineIndex) => {
  return (findings || []).filter((f) => {
    const lines = lineIndex[f.filePath];
    if (!isValidLine(lines, f.lineNumber)) {
      console.warn(`Dropped finding "${f.issue}" — line ${f.lineNumber} invalid for ${f.filePath}`);
      return false;
    }
    return true;
  });
};

const validateNotableLines = (notableLines, lines) => {
  return (notableLines || []).filter((nl) => {
    if (!isValidLine(lines, nl.number)) {
      console.warn(`Dropped notable line — line ${nl.number} invalid (file has ${lines.length} lines)`);
      return false;
    }
    return true;
  });
};

const validateVulnerabilities = (vulnerabilities, lines) => {
  return (vulnerabilities || [])
    .map((v) => ({
      ...v,
      lineNumbers: (v.lineNumbers || []).filter((n) => isValidLine(lines, n)),
    }))
    .filter((v) => v.lineNumbers.length > 0); // drop vuln entirely if every cited line was hallucinated
};

const validateFunctions = (functions, lines) => {
  return (functions || []).filter((fn) => {
    if (!fn.lineRange) return false;
    const [start, end] = fn.lineRange.split('-').map(Number);
    if (!isValidLine(lines, start) || !isValidLine(lines, end)) {
      console.warn(`Dropped function ${fn.name} - lineRange ${fn.lineRange} invalid`);
      return false;
    }
    return true;
  });
};

const downgradeHedgedFindings = (findings) => {
  const hedgePhrases = ["may", "might", "could potentially", "if not properly", "can be exposed"];
  return (findings || []).map(f => {
    const hasHedge = hedgePhrases.some(phrase => f.reason.toLowerCase().includes(phrase));
    if (hasHedge) {
      return {
        ...f,
        severity: "low",
        issue: `[Unverified] ${f.issue}`
      };
    }
    return f;
  });
};

// ---------------------------------------------------------------------------
// Shared rules block — directly targets hedge language and pattern-matched
// false positives (e.g. "API key from env vars" flagged with no real issue)
// ---------------------------------------------------------------------------
const ACCURACY_RULES = `
Rules for findings — read carefully:
- Only report a finding if you can point to the exact problematic code on the cited line and quote it verbatim in the code/snippet field.
- Do NOT use hedge language: "may", "might", "could potentially", "if not properly secured", "can be exposed". If you are not certain something is a real, concrete problem in THIS code, omit it rather than hedge.
- The explanation must justify why this specific line, as written, is a problem — not a generic best-practice reminder that would apply to any codebase.
- Reading a value from process.env is NOT a finding by itself. Only flag it if you can see that value actually being logged, returned in a response, or hardcoded elsewhere in the provided code.
- Line numbers must exactly match the numbered lines provided below. Do not estimate or round.
`;

// ---------------------------------------------------------------------------
// 1. Bulk analysis across one or more files
// ---------------------------------------------------------------------------
export const runAIAnalysis = async (fileContents, filePaths) => {
  let prompt = `You are an expert static analysis AI and senior software engineer. Analyze the following code file(s) thoroughly and return a JSON object strictly matching the schema below.
Output MUST be strictly valid JSON. Do NOT include unescaped newlines or tabs inside strings. Escape them as \\n and \\t.
DO NOT include markdown formatting (like \`\`\`json), just return the raw JSON object.
${ACCURACY_RULES}

Quality bar for every field:
- "reason" must be 2-4 sentences explaining WHY the specific code on that line is a problem, not a generic reminder.
- "suggestion" must be a concrete, step-by-step fix (e.g., "Replace X with Y because Z") — include a corrected code snippet inside the string where helpful (escaped as a single line).
- "codeSnippet" must quote the EXACT problematic code verbatim from the file, not a paraphrase.
- "summary" must be 3-5 sentences covering: what the codebase does, its overall quality, the most critical risk, and what to prioritise.
- Each "improvementPriorities" entry must state the PROBLEM, then HOW TO FIX IT, then quote the specific line(s) of code that need changing.
- "fileSummaries[].purpose" must be 2-3 sentences describing what the file does, what it exports/exposes, and who/what depends on it.
- "fileSummaries[].architecture" must name the specific design patterns used (e.g., Repository Pattern, Factory, Singleton, MVC controller) and explain how they manifest in the code.

Schema:
{
  "findings": [
    {
      "category": "String (one of: MAINTAINABILITY, SECURITY, RELIABILITY, PERFORMANCE, BUG, BEST_PRACTICE, STRUCTURE). Prioritize SECURITY and MAINTAINABILITY. Only report PERFORMANCE, STRUCTURE, or BEST_PRACTICE if significant - do not pad with minor style notes.",
      "severity": "String (critical, high, medium, low)",
      "issue": "String (short title, max 8 words)",
      "reason": "String (2-4 sentences: what is wrong and why it matters for THIS specific code)",
      "suggestion": "String (concrete step-by-step fix with corrected code example where possible)",
      "filePath": "String (path of the file)",
      "lineNumber": "Number (line number where the issue occurs)",
      "codeSnippet": "String (exact verbatim snippet of the problematic code from the file)"
    }
  ],
  "score": "Number (0 to 100 overall health score)",
  "maintainabilityScore": "Number (0 to 100, how easy is this codebase to maintain and extend)",
  "summary": "String (3-5 sentences: what the codebase does, overall quality level, most critical risk, top priority)",
  "goodPractices": [
    {
      "title": "String (name of the good practice observed)",
      "description": "String (2-3 sentences: where exactly in the code it appears, how it is implemented, and why it is beneficial)"
    }
  ],
  "structureIssues": [
    {
      "title": "String (short title of the structural problem)",
      "description": "String (2-3 sentences: what is structurally wrong and the concrete downstream consequence)",
      "recommendation": "String (specific refactoring steps to fix the structure, referencing actual file/function names)"
    }
  ],
  "improvementPriorities": [
    {
      "title": "String (short name of the improvement, max 6 words)",
      "problem": "String (1-2 sentences describing what the current problem is and why it matters)",
      "howToFix": "String (concrete, actionable steps to fix it — be specific about what to change, add, or remove)",
      "codeQuote": "String (the exact line(s) from the code that demonstrate the problem, verbatim)"
    }
  ],
  "fileSummaries": [
    {
      "filePath": "String (path of the file)",
      "purpose": "String (2-3 sentences: what the file does, what it exports, and who depends on it)",
      "architecture": "String (specific design patterns used and how they manifest — e.g., 'Uses the Repository Pattern: the exported analyzeRepo function abstracts all DB access behind a clean interface')"
    }
  ]
}

Focus on:
- Maintainability: complexity, naming, modularity, separation of concerns
- Best practices: SOLID principles, DRY, error handling, consistent patterns
- Structure: file organization, coupling, cohesion, architectural patterns
- Security: vulnerabilities, unsafe operations, exposed secrets
- Performance: inefficient operations, unnecessary re-renders, memory leaks

Files to analyze:
`;

  fileContents.forEach((content, index) => {
    prompt += `\n--- File: ${filePaths[index]} ---\n`;
    const lines = content.split('\n');
    const numberedLines = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
    prompt += numberedLines;
    prompt += `\n--- End File: ${filePaths[index]} ---\n`;
  });

  try {
    const raw = await callOpenRouter(prompt);
    const parsed = parseModelJson(raw);
    const lineIndex = buildLineIndex(fileContents, filePaths);
    
    const validatedFindings = validateFindings(parsed.findings, lineIndex);
    const finalFindings = downgradeHedgedFindings(validatedFindings);

    return {
      findings: finalFindings,
      score: parsed.score ?? null,                         // was defaulting to 100 — null is honest about failure
      maintainabilityScore: parsed.maintainabilityScore ?? null,
      summary: parsed.summary || "Analysis completed.",
      goodPractices: parsed.goodPractices || [],
      structureIssues: parsed.structureIssues || [],
      improvementPriorities: parsed.improvementPriorities || [],
      fileSummaries: parsed.fileSummaries || [],
    };
  } catch (error) {
    console.error("Error calling OpenRouter API:", error?.response?.data || error.message);
    throw new Error("Failed to run AI analysis.");
  }
};

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// V1.5 Architecture: AI Explanation Layer
// ---------------------------------------------------------------------------

export const generateV1_5Insights = async (repoName, metrics, health, security, graph) => {
  const prompt = `You are an expert software architect. Analyze the following deterministic metrics, repository structure, and security findings to generate an onboarding guide and comprehensive documentation for the repository "${repoName}".
  
Repository Structure (Dependency Graph):
${JSON.stringify(graph, null, 2)}

Repository Metrics:
${JSON.stringify(metrics, null, 2)}

Health Scores:
${JSON.stringify(health, null, 2)}

Security Findings:
${JSON.stringify(security, null, 2)}

Output strictly valid JSON with this schema:
{
  "onboardingGuide": {
    "content": "String (Markdown formatted text explaining the repository architecture and flow)",
    "entryPoints": ["String (array of key file paths to start reading)"],
    "moduleFlow": ["String (array of step-by-step learning modules)"]
  },
  "summary": "String (Markdown formatted. Write a comprehensive documentation of the repository. Explain exactly what the repository does, how it works under the hood, its core architecture, and other necessary details to fully understand the project based on the provided metrics and file data. DO NOT use generic placeholders like '[insert project purpose here]'. Infer the actual purpose from the repository name and the file paths.)"
}
`;

  try {
    const rawResult = await callOpenRouter(prompt);
    return parseModelJson(rawResult);
  } catch (error) {
    console.error("V1.5 AI Generation Failed:", error);
    return {
      onboardingGuide: { content: "Failed to generate guide.", entryPoints: [], moduleFlow: [] },
      summary: "Analysis complete, but AI explanation failed."
    };
  }
};

// ---------------------------------------------------------------------------
// 2. Single-file line-by-line explorer
// ---------------------------------------------------------------------------
export const runCodeExplorer = async (filename, content) => {
  const lines = content.split('\n');
  const numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');

  const prompt = `You are an expert AI software engineer, code reviewer, and security analyst. Perform a deep, thorough analysis of the following code file and return a JSON object strictly matching the schema below.
Output MUST be strictly valid JSON. Do NOT include unescaped newlines or tabs inside strings. Escape them as \\n and \\t.
DO NOT include markdown formatting (like \`\`\`json), just return the raw JSON object.
${ACCURACY_RULES}

Quality bar — every field must meet this standard. DO NOT USE GENERIC OR SHALLOW DESCRIPTIONS:
- "purpose": Write 4-6 sentences. Do not just say "this is a React component" or "this is a service file". Explain specifically: (1) what exact business or technical problem this file solves, (2) the core logic it implements, (3) what it exports/exposes and how other files interact with it, and (4) any critical side effects, API calls, or state mutations.
- "architecture": Write 4-6 sentences. Name the specific design patterns present (e.g., Factory, Singleton, Observer, Repository, MVC, Higher-Order Component, Redux middleware). Explain EXACTLY HOW each pattern manifests in this specific code by referencing real function names, variable names, and data structures. Describe the data flow step-by-step.
- "notableLines[].explanation": Must be 3-4 sentences. Dive deep. Explain WHAT the line does mechanically at a low level, WHY it was written this way instead of a simpler way, how it impacts the broader context of the file, and what edge cases or performance implications it carries.
- "notableLines[].improvement": If present, must state WHAT to change, HOW to change it (with a concrete, corrected code example as a single escaped line), and WHY the change makes the code more robust, secure, or performant.
- "improvements[].what": 2-3 sentences describing the current gap, anti-pattern, or technical debt in detail.
- "improvements[].howToFix": Concrete, step-by-step instructions. Reference the actual function/variable names involved. You MUST include a corrected code snippet (escaped as a single line) that directly replaces the problematic code.
- "improvements[].codeQuote": The exact verbatim line(s) from the file that illustrate the problem — copy them character-for-character.
- "securityReport.summary": 4-5 sentences covering the specific attack surface of this file, the data it handles (e.g., PII, tokens, user input), what security controls are present, and the most urgent unmitigated risk.
- "vulnerabilities[].description": 3-4 sentences — explicitly explain the vulnerability mechanism (e.g., "User input from req.body.id is passed directly into a raw SQL query without sanitization"), how an attacker would exploit it, and the worst-case impact.
- "vulnerabilities[].recommendation": Specific fix steps with a fully corrected code example (escaped as a single line).

IMPORTANT: For the "functions" array, you MUST extract and include EVERY SINGLE function defined in the file. Do not skip any function, no matter how small or trivial it seems. The user wants a complete inventory of all functions.
IMPORTANT: For the "notableLines" array, ONLY include lines that are interesting, complex, have issues, improvements, or security concerns. Do NOT include every line — only notable ones (max 60 lines). Skip blank lines, simple imports with no issues, and trivial closing braces.

Schema:
{
  "purpose": "String - 4-6 sentence deep dive into what this file does, what business logic it implements, what it exports, and its role in the system",
  "architecture": "String - 4-6 sentences naming specific design patterns (e.g., MVC, Singleton, Redux Middleware) and explaining EXACTLY how they manifest using real variable/function names from this file",
  "functions": [
    {
      "name": "String - function name",
      "lineRange": "String - e.g., '42-67'",
      "purpose": "String - what the function does",
      "complexity": "String - LOW, MEDIUM, or HIGH, with a one-line reason",
      "improvement": "String or null - specific suggestion with reasoning, or null if the function is fine as-is"
    }
  ],
  "notableLines": [
    {
      "number": 1,
      "code": "String - the exact line of code verbatim",
      "explanation": "String - 2-3 sentences: what this line does mechanically, why it matters, and any subtle behavior",
      "improvement": "String or null - if improvable: WHAT to change + HOW (with corrected code example) + WHY it is better",
      "securityFlag": "String or null - if a security concern: what the risk is, how it could be exploited, and how to fix it"
    }
  ],
  "improvements": [
    {
      "what": "String - 1-2 sentences describing the current problem or gap in this file",
      "howToFix": "String - concrete step-by-step fix instructions referencing actual function/variable names, with a corrected code example where possible",
      "codeQuote": "String - the exact verbatim line(s) from the file that demonstrate the problem"
    }
  ],
  "securityReport": {
    "overallRisk": "String - one of: LOW, MEDIUM, HIGH, CRITICAL",
    "summary": "String - 3-4 sentences: overall attack surface, what is done well, and the most urgent risk",
    "vulnerabilities": [
      {
        "title": "String - vulnerability title",
        "severity": "String - one of: LOW, MEDIUM, HIGH, CRITICAL",
        "lineNumbers": [1],
        "description": "String - 2-3 sentences: what the vulnerability is, how it can be exploited, and the impact",
        "recommendation": "String - specific fix steps with corrected code example (escaped as a single line)"
      }
    ]
  }
}

--- File: ${filename} ---
${numberedContent}
--- End File ---
`;

  try {
    const raw = await callOpenRouter(prompt);
    const parsed = parseModelJson(raw);

    const securityReport = parsed.securityReport
      ? { ...parsed.securityReport, vulnerabilities: validateVulnerabilities(parsed.securityReport.vulnerabilities, lines) }
      : null;

    return {
      purpose: parsed.purpose || "",
      architecture: parsed.architecture || "",
      functions: validateFunctions(parsed.functions, lines),
      notableLines: validateNotableLines(parsed.notableLines, lines),
      improvements: parsed.improvements || [],
      securityReport,
    };
  } catch (error) {
    console.error("Error calling OpenRouter API for Code Explorer:", error?.response?.data || error.message);
    throw new Error("Failed to run code explorer AI analysis.");
  }
};

// ---------------------------------------------------------------------------
// 3. Repository documentation generator (returns markdown, not JSON)
// ---------------------------------------------------------------------------
export const generateRepoDocs = async (repoName, fileDocs) => {
  const prompt = `You are an expert technical writer and software architect. Write a comprehensive technical documentation markdown file for the repository "${repoName}".

I will provide you with the summaries and architectural notes of various files we have scanned from this repository.
Combine these into a cohesive, well-structured Developer Documentation.
Include sections like:
- **Overview**: What the project does based on the files seen.
- **Architecture**: The overall design patterns and tech stack used.
- **Directory/Component Structure**: Explain the major components based on the files provided.

Note: You only have partial context of the repository based on these files. State this limitation subtly if necessary.

Files Scanned:
${fileDocs.map(doc => `--- ${doc.filePath} ---\nPurpose: ${doc.purpose || 'Unknown'}\nArchitecture: ${doc.architecture || 'Unknown'}`).join('\n\n')}

Return ONLY the markdown text. Do not wrap in JSON. Do not add conversational filler.`;

  try {
    return await callOpenRouter(prompt, { json: false });
  } catch (error) {
    console.error("Error generating repo docs:", error?.response?.data || error.message);
    throw new Error("Failed to generate repository documentation.");
  }
};

// Expose internals for testing
export const __testing = {
  validateFindings,
  downgradeHedgedFindings,
  validateFunctions
};