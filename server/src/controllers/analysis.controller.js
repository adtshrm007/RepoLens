import prisma from "../utils/prisma.util.js";
import axios from 'axios';
import { fetchFileContent, fetchRepositoryTree } from "../services/github.service.js";
import { runAIAnalysis, runCodeExplorer, generateRepoDocs, generateV1_5Insights } from "../services/analysis.service.js";
import { StaticAnalysisService } from "../services/staticAnalysis.service.js";
import { DependencyGraphService } from "../services/dependencyGraph.service.js";
import { SecurityScannerService } from "../services/securityScanner.service.js";
import { ScoringEngineService } from "../services/scoringEngine.service.js";

// @desc    Run analysis on selected files
// @route   POST /analysis/run
// @access  Private
export const runAnalysis = async (req, res) => {
  try {
    const { owner, repoName, filePaths } = req.body;
    
    if (!owner || !repoName || !filePaths || filePaths.length === 0) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(403).json({ message: "GitHub access token missing" });
    }

    // 1. Fetch file contents from GitHub concurrently in batches
    const files = [];
    const batchSize = 15;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (path) => {
          try {
            const content = await fetchFileContent(user.githubAccessToken, owner, repoName, path);
            return { path, content };
          } catch (err) {
            console.error(`Skipping ${path}: ${err.message}`);
            return null;
          }
        })
      );
      files.push(...results.filter(Boolean));
    }

    // 2. Run Deterministic Services
    const staticAnalyzer = new StaticAnalysisService();
    const metrics = staticAnalyzer.analyzeFiles(files);

    const securityScanner = new SecurityScannerService();
    const securityFindingsList = securityScanner.scanFiles(files);

    const graphBuilder = new DependencyGraphService();
    const graph = graphBuilder.buildGraph(files);

    const scoringEngine = new ScoringEngineService(metrics, securityFindingsList);
    const healthScores = scoringEngine.calculateScores();

    // 3. Trigger AI Explanation Layer
    const aiInsights = await generateV1_5Insights(repoName, metrics, healthScores, securityFindingsList, graph);

    // 4. Upsert Repository record
    let repo = await prisma.repository.findFirst({
      where: { name: repoName, userId: user.id }
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          name: repoName,
          fullName: `${owner}/${repoName}`,
          githubRepoId: `${owner}-${repoName}`,
          repoUrl: `https://github.com/${owner}/${repoName}`,
          isPrivate: false,
          userId: user.id,
        }
      });
    }

    // 5. Save V1.5 analysis results to Database
    const analysis = await prisma.repositoryScan.create({
      data: {
        repositoryId: repo.id,
        summary: aiInsights.summary,
        status: "COMPLETED",
        totalFiles: filePaths.length,
        analyzedFiles: files.length,
        securityFindings: {
          create: securityFindingsList.map(f => ({
            type: f.type,
            severity: f.severity,
            file: f.file,
            lineNumber: f.lineNumber,
            snippet: f.snippet,
            description: f.description
          }))
        },
        dependencyGraph: {
          create: {
            nodes: graph.nodes,
            edges: graph.edges
          }
        },
        healthScore: {
          create: {
            maintainability: healthScores.maintainability,
            security: healthScores.security,
            documentation: healthScores.documentation,
            architecture: healthScores.architecture,
            overall: healthScores.overall
          }
        },
        onboardingGuide: {
          create: {
            content: aiInsights.onboardingGuide?.content || "No guide generated.",
            entryPoints: aiInsights.onboardingGuide?.entryPoints || [],
            moduleFlow: aiInsights.onboardingGuide?.moduleFlow || []
          }
        },
        files: {
          create: files.map((f, i) => ({
            path: f.path,
            extension: f.path.split('.').pop() || "",
            size: f.content ? f.content.length : 0,
            isAnalyzed: true,
            metrics: i === 0 ? {
              create: {
                linesOfCode: metrics.totalLines || 0,
                functionCount: metrics.functionCount || 0,
                componentCount: metrics.componentCount || 0,
                hookUsage: metrics.hookUsageCount || 0,
                avgFunctionLength: metrics.avgFunctionLength || 0,
                largestFunction: metrics.largestFunction || 0,
                nestingDepth: metrics.maxNestingDepth || 0,
                dependencyCount: metrics.dependencyCount || 0,
                deadCodeIndicators: metrics.deadCodeIndicators || 0
              }
            } : undefined
          }))
        }
      },
      include: {
        healthScore: true,
        dependencyGraph: true,
        securityFindings: true,
        onboardingGuide: true,
        files: { include: { metrics: true } }
      }
    });

    res.status(201).json({ 
      analysis, 
      healthScores, 
      metrics, 
      onboardingGuide: analysis.onboardingGuide 
    });
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Analysis Run Error:", error);
    res.status(500).json({ message: "Failed to run analysis" });
  }
};

// @desc    Run analysis on manual code/file upload
// @route   POST /analysis/manual
// @access  Private
export const runManualAnalysis = async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ message: "Filename and content are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 1. Run analysis
    const fileContents = [content];
    const filePaths = [filename];
    const { findings, score, summary } = await runAIAnalysis(fileContents, filePaths);

    // 2. Upsert a dummy "Local Uploads" repository
    const repoName = "Local Uploads";
    let repo = await prisma.repository.findFirst({
      where: { name: repoName, userId: user.id }
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          name: repoName,
          fullName: `local/${repoName}`,
          githubRepoId: `local-uploads-${user.id}`,
          repoUrl: ``,
          isPrivate: true,
          userId: user.id,
        }
      });
    }

    // 3. Save Analysis record
    const analysis = await prisma.repositoryScan.create({
      data: {
        repositoryId: repo.id,
        status: "COMPLETED",
        summary,
        totalFiles: 1,
        analyzedFiles: 1,
        healthScore: {
          create: {
            overall: score || 0,
            maintainability: 0,
            security: 0,
            documentation: 0,
            architecture: 0,
          }
        },
        securityFindings: {
          create: findings.map(f => ({
            type: f.category || "General",
            severity: f.severity || "LOW",
            description: (f.issue || "") + " - " + (f.reason || ""),
            recommendation: f.suggestion || "",
            file: f.filePath || filename,
            lineNumber: f.lineNumber || 1,
            snippet: f.codeSnippet || "",
          }))
        }
      },
      include: {
        securityFindings: true,
        healthScore: true,
      }
    });

    res.status(201).json({ analysis });
  } catch (error) {
    console.error("Manual Analysis Error:", error);
    res.status(500).json({ message: "Failed to run manual analysis" });
  }
};


// @desc    Get analysis history for user
// @route   GET /analysis/history
// @access  Private
export const getAnalysisHistory = async (req, res) => {
  try {
    const history = await prisma.repositoryScan.findMany({
      where: { repository: { userId: req.user.id } },
      include: { repository: true, securityFindings: true, healthScore: true },
      orderBy: { createdAt: 'desc' }
    });

    const formattedHistory = history.map(scan => ({
      id: scan.id,
      createdAt: scan.createdAt,
      repository: scan.repository,
      status: scan.status,
      findings: scan.securityFindings || [],
      healthScore: scan.healthScore || null
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error("Get History Error:", error);
    res.status(500).json({ message: "Failed to fetch history" });
  }
};

// @desc    Get single analysis by ID
// @route   GET /analysis/:id
// @access  Private
export const getAnalysisById = async (req, res) => {
  try {
    // Use findFirst with ownership check to prevent IDOR
    // (users cannot access analyses belonging to other users)
    const analysis = await prisma.repositoryScan.findFirst({
      where: {
        id: req.params.id,
        repository: { userId: req.user.id },
      },
      include: { 
        repository: true, 
        securityFindings: true,
        healthScore: true,
        dependencyGraph: true,
        onboardingGuide: true,
        files: { include: { metrics: true } }
      },
    });

    if (!analysis) {
      // Return 404 regardless of whether it doesn't exist or belongs to another user
      // (don't reveal that the ID exists but is forbidden)
      return res.status(404).json({ message: "Analysis not found" });
    }

    res.json(analysis);
  } catch (error) {
    console.error("Get Analysis By ID Error:", error);
    res.status(500).json({ message: "Failed to fetch analysis" });
  }
};

// @desc    Run code explorer on manual file
// @route   POST /analysis/explore
// @access  Private
export const exploreManualCode = async (req, res) => {
  try {
    const { filename, content } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ message: "Filename and content are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const explanation = await runCodeExplorer(filename, content);

    res.status(200).json({ explanation });
  } catch (error) {
    console.error("Explore Manual Code Error:", error);
    res.status(500).json({ message: "Failed to explore code" });
  }
};

// @desc    Explore a file from a GitHub repository
// @route   POST /analysis/explore-repo
// @access  Private
export const exploreRepoFile = async (req, res) => {
  try {
    const { owner, repoName, filePath } = req.body;

    if (!owner || !repoName || !filePath) {
      return res.status(400).json({ message: "owner, repoName, and filePath are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(403).json({ message: "GitHub access token missing" });
    }

    // Fetch file content from GitHub
    const content = await fetchFileContent(user.githubAccessToken, owner, repoName, filePath);
    const explanation = await runCodeExplorer(filePath, content);

    // Upsert the documentation
    if (explanation.purpose || explanation.architecture) {
      await prisma.fileDocumentation.upsert({
        where: {
          userId_repoFullName_filePath: {
            userId: user.id,
            repoFullName: `${owner}/${repoName}`,
            filePath: filePath
          }
        },
        update: {
          purpose: explanation.purpose,
          architecture: explanation.architecture,
          source: "explorer"
        },
        create: {
          userId: user.id,
          repoFullName: `${owner}/${repoName}`,
          filePath: filePath,
          purpose: explanation.purpose,
          architecture: explanation.architecture,
          source: "explorer"
        }
      });
    }

    res.status(200).json({ explanation, filePath, content });
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Explore Repo File Error:", error);
    res.status(500).json({ message: "Failed to explore repo file" });
  }
};



// @desc    Generate technical documentation for a repository
// @route   POST /analysis/generate-docs
// @access  Private
export const generateDocs = async (req, res) => {
  try {
    const { owner, repoName } = req.body;
    if (!owner || !repoName) {
      return res.status(400).json({ message: "owner and repoName are required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(401).json({ message: "User not found" });

    const repoFullName = `${owner}/${repoName}`;

    // Fetch all file documentations for this repo
    const fileDocs = await prisma.fileDocumentation.findMany({
      where: {
        userId: user.id,
        repoFullName: repoFullName
      }
    });

    if (!fileDocs || fileDocs.length === 0) {
      return res.status(404).json({ 
        message: "No files have been analyzed for this repository yet. Please analyze some files to generate documentation." 
      });
    }

    // Call AI to generate cohesive markdown
    const markdownDocs = await generateRepoDocs(repoFullName, fileDocs);

    res.status(200).json({ markdown: markdownDocs });
  } catch (error) {
    console.error("Generate Docs Error:", error);
    res.status(500).json({ message: "Failed to generate documentation" });
  }
};

// ---------------------------------------------------------------------------
// V1.5 Architecture Endpoints
// ---------------------------------------------------------------------------

const getLatestAnalysisData = async (repoId, userId, includeModel) => {
  const analysis = await prisma.repositoryScan.findFirst({
    where: { 
      repositoryId: repoId, 
      status: "COMPLETED",
      repository: { userId }
    },
    orderBy: { createdAt: "desc" },
    include: { [includeModel]: true }
  });
  return analysis;
};

export const getLatestMetrics = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, req.user.id, "metrics");
    if (!analysis || !analysis.metrics) return res.status(404).json({ message: "Metrics not found" });
    res.json(analysis.metrics);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestHealth = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, req.user.id, "healthScore");
    if (!analysis || !analysis.healthScore) return res.status(404).json({ message: "Health score not found" });
    res.json(analysis.healthScore);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestGraph = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, req.user.id, "dependencyGraph");
    if (!analysis || !analysis.dependencyGraph) return res.status(404).json({ message: "Graph not found" });
    res.json(analysis.dependencyGraph);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestSecurity = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, req.user.id, "securityFindings");
    if (!analysis || !analysis.securityFindings) return res.status(404).json({ message: "Security findings not found" });
    res.json(analysis.securityFindings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestOnboarding = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, req.user.id, "onboardingGuide");
    if (!analysis || !analysis.onboardingGuide) return res.status(404).json({ message: "Onboarding guide not found" });
    res.json(analysis.onboardingGuide);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------------------------------------
// V2 Dashboard Stats
// ---------------------------------------------------------------------------
export const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const repositories = await prisma.repository.findMany({
      where: { userId },
      include: {
        scans: {
          include: { healthScore: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const allScans = repositories.flatMap(r => r.scans);
    const completedScans = allScans.filter(s => s.status === 'COMPLETED');

    const totalFilesAnalyzed = completedScans.reduce((sum, s) => sum + (s.analyzedFiles || 0), 0);

    const functionsAgg = await prisma.fileMetrics.aggregate({
      where: { file: { scan: { repository: { userId } } } },
      _sum: { functionCount: true, componentCount: true }
    });

    const allFindings = await prisma.securityFinding.findMany({
      where: { scan: { repository: { userId } } },
      select: { severity: true }
    });

    const securityBySeverity = {
      CRITICAL: allFindings.filter(f => f.severity.toUpperCase() === 'CRITICAL').length,
      HIGH: allFindings.filter(f => f.severity.toUpperCase() === 'HIGH').length,
      MEDIUM: allFindings.filter(f => f.severity.toUpperCase() === 'MEDIUM').length,
      LOW: allFindings.filter(f => f.severity.toUpperCase() === 'LOW').length,
    };

    const healthScores = completedScans.map(s => s.healthScore?.overall).filter(v => v != null);
    const avgHealth = healthScores.length
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : null;

    // Largest repo by files
    const scanStats = completedScans.map(s => ({
      scanId: s.id,
      repositoryId: s.repositoryId,
      repoName: repositories.find(r => r.id === s.repositoryId)?.name || 'Unknown',
      repoFullName: repositories.find(r => r.id === s.repositoryId)?.fullName || 'Unknown',
      totalFiles: s.totalFiles || 0,
      health: s.healthScore?.overall || 0,
      createdAt: s.createdAt
    }));

    const largestRepo = [...scanStats].sort((a, b) => b.totalFiles - a.totalFiles)[0] || null;
    const mostComplexRepo = [...scanStats].sort((a, b) => a.health - b.health)[0] || null;

    const recentScans = await prisma.repositoryScan.findMany({
      where: { repository: { userId }, status: 'COMPLETED' },
      include: { repository: true, healthScore: true },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    // Health score trend (last 10 completed scans ordered by date)
    const trendScans = await prisma.repositoryScan.findMany({
      where: { repository: { userId }, status: 'COMPLETED' },
      include: { healthScore: true, repository: true },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    res.json({
      totalRepositories: repositories.length,
      totalScans: allScans.length,
      completedScans: completedScans.length,
      totalFilesAnalyzed,
      totalFunctions: functionsAgg._sum.functionCount || 0,
      totalComponents: functionsAgg._sum.componentCount || 0,
      securityBySeverity,
      avgHealth,
      largestRepo,
      mostComplexRepo,
      recentScans: recentScans.map(s => ({
        id: s.id,
        repository: s.repository,
        healthScore: s.healthScore,
        createdAt: s.createdAt,
        totalFiles: s.totalFiles,
        analyzedFiles: s.analyzedFiles
      })),
      healthTrend: trendScans.map(s => ({
        date: s.createdAt,
        overall: s.healthScore?.overall || 0,
        repoName: s.repository?.name || 'Unknown'
      }))
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
};

// ---------------------------------------------------------------------------
// V2 Compare Two Scans
// ---------------------------------------------------------------------------
export const compareScansByIds = async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) return res.status(400).json({ message: 'Provide two scan IDs: ?a=id1&b=id2' });

    const userId = req.user.id;

    const [scanA, scanB] = await Promise.all([
      prisma.repositoryScan.findFirst({
        where: { id: a, repository: { userId } },
        include: { repository: true, healthScore: true, securityFindings: true, architecture: true }
      }),
      prisma.repositoryScan.findFirst({
        where: { id: b, repository: { userId } },
        include: { repository: true, healthScore: true, securityFindings: true, architecture: true }
      })
    ]);

    if (!scanA || !scanB) return res.status(404).json({ message: 'One or both scans not found or access denied' });

    const [metricsA, metricsB] = await Promise.all([
      prisma.fileMetrics.aggregate({
        where: { file: { scanId: a } },
        _sum: { linesOfCode: true, functionCount: true, componentCount: true, dependencyCount: true },
        _max: { nestingDepth: true, largestFunction: true },
        _avg: { avgFunctionLength: true }
      }),
      prisma.fileMetrics.aggregate({
        where: { file: { scanId: b } },
        _sum: { linesOfCode: true, functionCount: true, componentCount: true, dependencyCount: true },
        _max: { nestingDepth: true, largestFunction: true },
        _avg: { avgFunctionLength: true }
      })
    ]);

    const largeFilesA = await prisma.fileMetrics.count({ where: { file: { scanId: a }, linesOfCode: { gt: 300 } } });
    const largeFilesB = await prisma.fileMetrics.count({ where: { file: { scanId: b }, linesOfCode: { gt: 300 } } });

    res.json({
      scanA: { ...scanA, metrics: { ...metricsA._sum, ...metricsA._max, avgFunctionLength: metricsA._avg.avgFunctionLength, largeFilesCount: largeFilesA } },
      scanB: { ...scanB, metrics: { ...metricsB._sum, ...metricsB._max, avgFunctionLength: metricsB._avg.avgFunctionLength, largeFilesCount: largeFilesB } }
    });
  } catch (error) {
    console.error('Compare Scans Error:', error);
    res.status(500).json({ message: 'Failed to compare scans' });
  }
};

// ---------------------------------------------------------------------------
// V2 AI Assistant (uses cached context, no re-analysis)
// ---------------------------------------------------------------------------
export const askAIAssistant = async (req, res) => {
  try {
    const { scanId, question } = req.body;
    if (!scanId || !question?.trim()) return res.status(400).json({ message: 'scanId and question are required' });

    const scan = await prisma.repositoryScan.findFirst({
      where: { id: scanId, repository: { userId: req.user.id } },
      include: {
        repository: true,
        healthScore: true,
        architecture: true,
        onboardingGuide: true,
        securityFindings: { take: 15, orderBy: { severity: 'asc' } }
      }
    });

    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'AI service not configured' });

    const context = `Repository: ${scan.repository.fullName}
Overall Health: ${scan.healthScore?.overall || 'N/A'}/100
Maintainability: ${scan.healthScore?.maintainability || 'N/A'}, Security: ${scan.healthScore?.security || 'N/A'}, Architecture: ${scan.healthScore?.architecture || 'N/A'}, Documentation: ${scan.healthScore?.documentation || 'N/A'}
Total Files: ${scan.totalFiles}, Files Analyzed: ${scan.analyzedFiles}
Scan Date: ${scan.createdAt}

Repository Summary:
${scan.summary || 'Not available.'}

Architecture Overview:
${scan.architecture?.summary || 'Not available.'}

Onboarding Guide:
${(scan.onboardingGuide?.content || 'Not available.').substring(0, 1500)}

Security Findings (${scan.securityFindings.length}):
${scan.securityFindings.map(f => `[${f.severity}] ${f.type} in ${f.file}: ${f.description.substring(0, 120)}`).join('\n')}`;

    const prompt = `You are a senior software engineer reviewing a repository analysis. Answer the following question based ONLY on the provided analysis data. Be concise, accurate, and developer-friendly. Do not make up information not present in the context.

Repository Analysis Context:
${context}

Question: ${question.trim()}

Answer:`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    res.json({ answer: response.data.choices[0].message.content.trim() });
  } catch (error) {
    console.error('AI Assistant Error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'AI assistant failed to respond' });
  }
};

// ---------------------------------------------------------------------------
// V2 Global Search
// ---------------------------------------------------------------------------
export const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ scans: [], findings: [], files: [] });

    const userId = req.user.id;
    const query = q.trim();

    const [scans, findings, files] = await Promise.all([
      prisma.repositoryScan.findMany({
        where: {
          repository: { userId },
          OR: [
            { repository: { name: { contains: query, mode: 'insensitive' } } },
            { repository: { fullName: { contains: query, mode: 'insensitive' } } },
            { summary: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: { repository: true, healthScore: true },
        take: 8,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.securityFinding.findMany({
        where: {
          scan: { repository: { userId } },
          OR: [
            { type: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { file: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: { scan: { include: { repository: true } } },
        take: 8
      }),
      prisma.repositoryFile.findMany({
        where: {
          scan: { repository: { userId } },
          path: { contains: query, mode: 'insensitive' }
        },
        include: { scan: { include: { repository: true } }, metrics: true, classification: true },
        take: 8
      })
    ]);

    res.json({
      scans: scans.map(s => ({ id: s.id, repository: s.repository, healthScore: s.healthScore, createdAt: s.createdAt, status: s.status })),
      findings: findings.map(f => ({ id: f.id, type: f.type, severity: f.severity, file: f.file, description: f.description, scanId: f.scanId, repository: f.scan?.repository })),
      files: files.map(f => ({ id: f.id, path: f.path, extension: f.extension, size: f.size, metrics: f.metrics, classification: f.classification, scanId: f.scanId, repository: f.scan?.repository }))
    });
  } catch (error) {
    console.error('Global Search Error:', error);
    res.status(500).json({ message: 'Search failed' });
  }
};
