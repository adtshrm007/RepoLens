import prisma from "../utils/prisma.util.js";
import { fetchFileContent, fetchRepositoryTree } from "../services/github.service.js";
import { runAIAnalysis, runCodeExplorer, generateRepoDocs } from "../services/analysis.service.js";

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
    const fileContents = [];
    for (const path of filePaths) {
      try {
        const content = await fetchFileContent(user.githubAccessToken, owner, repoName, path);
        fileContents.push(content);
      } catch (err) {
        console.error(`Skipping ${path}: ${err.message}`);
        fileContents.push(""); // Push empty if failed, or handle better
      }
    }

    // 2. Run analysis
    const { findings, score, maintainabilityScore, summary, goodPractices, structureIssues, improvementPriorities, fileSummaries } = await runAIAnalysis(fileContents, filePaths);

    // 3. Upsert Repository record just to keep track
    let repo = await prisma.repository.findFirst({
      where: { name: repoName, userId: user.id }
    });

    if (!repo) {
      repo = await prisma.repository.create({
        data: {
          name: repoName,
          fullName: `${owner}/${repoName}`,
          githubRepoId: `${owner}-${repoName}`, // proxy id since we don't have the real github id here
          repoUrl: `https://github.com/${owner}/${repoName}`,
          isPrivate: false,
          userId: user.id,
        }
      });
    }

    // 4. Save analysis results
    const analysis = await prisma.analysis.create({
      data: {
        repositoryId: repo.id,
        overallScore: score,
        maintainabilityScore: maintainabilityScore,
        summary: summary,
        status: "Completed",
        findings: {
          create: findings.map((f) => ({
            category: f.category || "GENERAL",
            severity: f.severity || "low",
            issue: f.issue || "Issue",
            reason: f.reason || "",
            suggestion: f.suggestion || "",
            filePath: f.filePath || "",
            lineNumber: f.lineNumber || null,
            codeSnippet: f.codeSnippet || "",
          })),
        },
      },
      include: {
        findings: true,
      }
    });

    // 5. Upsert file documentations
    if (fileSummaries && fileSummaries.length > 0) {
      await Promise.all(
        fileSummaries.map(async (doc) => {
          if (!doc.filePath || (!doc.purpose && !doc.architecture)) return;

          // Precedence logic: Do not overwrite if source is "explorer"
          const existing = await prisma.fileDocumentation.findUnique({
            where: {
              userId_repoFullName_filePath: {
                userId: user.id,
                repoFullName: `${owner}/${repoName}`,
                filePath: doc.filePath,
              },
            }
          });

          if (existing && existing.source === 'explorer') {
            return; // Skip overwriting explorer documentation with bulk analysis
          }

          await prisma.fileDocumentation.upsert({
            where: {
              userId_repoFullName_filePath: {
                userId: user.id,
                repoFullName: `${owner}/${repoName}`,
                filePath: doc.filePath,
              },
            },
            update: {
              purpose: doc.purpose,
              architecture: doc.architecture,
              source: "analysis",
            },
            create: {
              userId: user.id,
              repoFullName: `${owner}/${repoName}`,
              filePath: doc.filePath,
              purpose: doc.purpose,
              architecture: doc.architecture,
              source: "analysis",
            },
          });
        })
      );
    }

    res.status(201).json({ analysis, maintainabilityScore, goodPractices, structureIssues, improvementPriorities });
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
    const history = await prisma.analysis.findMany({
      where: { repository: { userId: req.user.id } },
      include: { repository: true, findings: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
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
      include: { repository: true, findings: true },
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

