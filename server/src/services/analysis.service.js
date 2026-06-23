import axios from 'axios';

export const runAIAnalysis = async (fileContents, filePaths) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  let prompt = `You are an expert static analysis AI and software engineer. Analyze the following code file(s) and return a JSON object strictly matching the schema below.
Output MUST be strictly valid JSON. Do NOT include unescaped newlines or tabs inside strings. Escape them as \\n and \\t.
DO NOT include markdown formatting (like \`\`\`json), just return the raw JSON object.

Schema:
{
  "findings": [
    {
      "category": "String (one of: MAINTAINABILITY, SECURITY, RELIABILITY, PERFORMANCE, BUG, BEST_PRACTICE, STRUCTURE)",
      "severity": "String (critical, high, medium, low)",
      "issue": "String (short title)",
      "reason": "String (detailed explanation)",
      "suggestion": "String (concrete how-to-fix with example if possible)",
      "filePath": "String (path of the file)",
      "lineNumber": "Number (line number where the issue occurs)",
      "codeSnippet": "String (short snippet of the affected code)"
    }
  ],
  "score": "Number (0 to 100 overall health score)",
  "maintainabilityScore": "Number (0 to 100, how easy is this codebase to maintain and extend)",
  "summary": "String (2-3 sentence overall summary of the codebase health)",
  "goodPractices": [
    {
      "title": "String (name of the good practice observed)",
      "description": "String (where and how it is applied in the code)"
    }
  ],
  "structureIssues": [
    {
      "title": "String (short title of the structural problem)",
      "description": "String (detailed description of what is wrong structurally)",
      "recommendation": "String (how to restructure or improve it)"
    }
  ],
  "improvementPriorities": [
    "String (top things to improve, ordered by importance, max 5)"
  ],
  "fileSummaries": [
    {
      "filePath": "String (path of the file)",
      "purpose": "String (concise purpose of the file)",
      "architecture": "String (architectural patterns or structural role of the file)"
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
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    let rawJson = response.data.choices[0].message.content.trim();
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) rawJson = match[0];
    rawJson = rawJson.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

    const parsed = JSON.parse(rawJson);

    return {
      findings: parsed.findings || [],
      score: parsed.score !== undefined ? parsed.score : 100,
      maintainabilityScore: parsed.maintainabilityScore !== undefined ? parsed.maintainabilityScore : null,
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

export const runCodeExplorer = async (filename, content) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  // Number the lines so the AI can reference them accurately
  const lines = content.split('\n');
  const numberedContent = lines.map((line, i) => `${i + 1}: ${line}`).join('\n');

  const prompt = `You are an expert AI software engineer and security analyst. Analyze the following code file and return a JSON object strictly matching the schema below.
Output MUST be strictly valid JSON. Do NOT include unescaped newlines or tabs inside strings. Escape them as \\n and \\t.
DO NOT include markdown formatting (like \`\`\`json), just return the raw JSON object.

IMPORTANT: For the "notableLines" array, ONLY include lines that are interesting, complex, have issues, improvements, or security concerns. Do NOT include every line — only notable ones (max 60 lines). Skip blank lines, simple imports with no issues, and trivial closing braces.

Schema:
{
  "purpose": "String - concise description of what this file does",
  "architecture": "String - design patterns and architectural choices used",
  "notableLines": [
    {
      "number": 1,
      "code": "String - the exact line of code",
      "explanation": "String - what this line does and why it matters",
      "improvement": "String or null - specific improvement suggestion for this line",
      "securityFlag": "String or null - security concern on this line"
    }
  ],
  "improvements": ["String - high-level improvement suggestion for the whole file (max 6)"],
  "securityReport": {
    "overallRisk": "String - one of: LOW, MEDIUM, HIGH, CRITICAL",
    "summary": "String - overall security posture summary",
    "vulnerabilities": [
      {
        "title": "String - vulnerability title",
        "severity": "String - one of: LOW, MEDIUM, HIGH, CRITICAL",
        "lineNumbers": [1],
        "description": "String - detailed description",
        "recommendation": "String - how to fix it"
      }
    ]
  }
}

--- File: ${filename} ---
${numberedContent}
--- End File ---
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    let rawJson = response.data.choices[0].message.content.trim();
    const match = rawJson.match(/\{[\s\S]*\}/);
    if (match) {
      rawJson = match[0];
    }
    
    rawJson = rawJson.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '');

    try {
      const parsed = JSON.parse(rawJson);
      return {
        purpose: parsed.purpose || "",
        architecture: parsed.architecture || "",
        notableLines: parsed.notableLines || [],
        improvements: parsed.improvements || [],
        securityReport: parsed.securityReport || null
      };
    } catch (e) {
      if (e.message.includes('control character')) {
        rawJson = rawJson.replace(/\n/g, '\\n').replace(/\t/g, '\\t');
      }
      throw e;
    }
  } catch (error) {
    console.error("Error calling OpenRouter API for Code Explorer:", error?.response?.data || error.message);
    throw new Error("Failed to run code explorer AI analysis.");
  }
};

export const generateRepoDocs = async (repoName, fileDocs) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

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
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error generating repo docs:", error?.response?.data || error.message);
    throw new Error("Failed to generate repository documentation.");
  }
};
