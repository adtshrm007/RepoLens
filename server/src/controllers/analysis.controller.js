import prisma from "../utils/prisma.util.js";
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

    // 1. Fetch file contents from GitHub
    const files = [];
    for (const path of filePaths) {
      try {
        const content = await fetchFileContent(user.githubAccessToken, owner, repoName, path);
        files.push({ path, content });
      } catch (err) {
        console.error(`Skipping ${path}: ${err.message}`);
      }
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
    const aiInsights = await generateV1_5Insights(metrics, healthScores, securityFindingsList, graph);

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
    const analysis = await prisma.analysis.create({
      data: {
        repositoryId: repo.id,
        overallScore: healthScores.overall,
        maintainabilityScore: healthScores.maintainability,
        securityScore: healthScores.security,
        summary: aiInsights.summary,
        status: "Completed",
        metrics: {
          create: {
            totalLines: metrics.totalLines,
            fileCount: metrics.fileCount,
            functionCount: metrics.functionCount,
            avgFunctionLength: metrics.avgFunctionLength,
            largestFunction: metrics.largestFunction,
            maxNestingDepth: metrics.maxNestingDepth,
            componentCount: metrics.componentCount,
            hookUsageCount: metrics.hookUsageCount,
            dependencyCount: metrics.dependencyCount,
            largeFilesCount: metrics.largeFilesCount,
            largeFunctionsCount: metrics.largeFunctionsCount,
            deadCodeIndicators: metrics.deadCodeIndicators,
            duplicateImports: metrics.duplicateImports
          }
        },
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
        }
      },
      include: {
        metrics: true,
        healthScore: true,
        dependencyGraph: true,
        securityFindings: true,
        onboardingGuide: true
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
    const analysis = await prisma.analysis.create({
      data: {
        repositoryId: repo.id,
        overallScore: score,
        status: "COMPLETED",
        summary,
        findings: {
          create: findings.map(f => ({
            category: f.category,
            severity: f.severity,
            issue: f.issue,
            reason: f.reason,
            suggestion: f.suggestion,
            filePath: f.filePath,
            lineNumber: f.lineNumber,
            codeSnippet: f.codeSnippet
          }))
        }
      },
      include: {
        findings: true,
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
    const analysis = await prisma.analysis.findFirst({
      where: {
        id: req.params.id,
        repository: { userId: req.user.id },
      },
      include: { 
        repository: true, 
        findings: true,
        metrics: true,
        healthScore: true,
        dependencyGraph: true,
        securityFindings: true,
        onboardingGuide: true
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

const getLatestAnalysisData = async (repoId, includeModel) => {
  const analysis = await prisma.analysis.findFirst({
    where: { repositoryId: repoId, status: "Completed" },
    orderBy: { createdAt: "desc" },
    include: { [includeModel]: true }
  });
  return analysis;
};

export const getLatestMetrics = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, "metrics");
    if (!analysis || !analysis.metrics) return res.status(404).json({ message: "Metrics not found" });
    res.json(analysis.metrics);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestHealth = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, "healthScore");
    if (!analysis || !analysis.healthScore) return res.status(404).json({ message: "Health score not found" });
    res.json(analysis.healthScore);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestGraph = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, "dependencyGraph");
    if (!analysis || !analysis.dependencyGraph) return res.status(404).json({ message: "Graph not found" });
    res.json(analysis.dependencyGraph);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestSecurity = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, "securityFindings");
    if (!analysis || !analysis.securityFindings) return res.status(404).json({ message: "Security findings not found" });
    res.json(analysis.securityFindings);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const getLatestOnboarding = async (req, res) => {
  try {
    const analysis = await getLatestAnalysisData(req.params.repoId, "onboardingGuide");
    if (!analysis || !analysis.onboardingGuide) return res.status(404).json({ message: "Onboarding guide not found" });
    res.json(analysis.onboardingGuide);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
