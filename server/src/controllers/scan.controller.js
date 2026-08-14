import prisma from '../utils/prisma.util.js';
import { ScannerService } from '../services/scanner.service.js';
import { fetchRepositoryDetails } from '../services/github.service.js';

export const startScan = async (req, res) => {
  try {
    const { owner, repoName } = req.body;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user || !user.githubAccessToken) {
      return res.status(401).json({ message: "GitHub access token missing" });
    }
    
    const githubAccessToken = user.githubAccessToken;

    // 1. Get or create Repository record
    const repoDetails = await fetchRepositoryDetails(githubAccessToken, owner, repoName);
    
    let repository = await prisma.repository.findFirst({
      where: { userId, fullName: repoDetails.full_name }
    });

    if (!repository) {
      repository = await prisma.repository.create({
        data: {
          name: repoDetails.name,
          fullName: repoDetails.full_name,
          githubRepoId: String(repoDetails.id),
          repoUrl: repoDetails.html_url,
          isPrivate: repoDetails.private,
          language: repoDetails.language,
          userId,
        }
      });
    }

    // 2. Start Scanner Service
    const scanner = new ScannerService(userId, repository.id, owner, repoName, githubAccessToken);
    const scanId = await scanner.startScan();

    res.status(202).json({ scanId, message: "Scan started." });
  } catch (error) {
    console.error("Start Scan Error:", error);
    res.status(500).json({ message: "Failed to start scan", error: error.message });
  }
};

export const getScanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const scan = await prisma.repositoryScan.findUnique({
      where: { id },
      include: { repository: true }
    });

    if (!scan) return res.status(404).json({ message: "Scan not found" });

    res.json({
      id: scan.id,
      status: scan.status,
      totalFiles: scan.totalFiles,
      analyzedFiles: scan.analyzedFiles,
      summary: scan.summary,
      repository: scan.repository
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getScanFullPayload = async (req, res) => {
  try {
    const { id } = req.params;
    const scan = await prisma.repositoryScan.findUnique({
      where: { id },
      include: {
        repository:      true,
        healthScore:     true,
        architecture:    true,
        onboardingGuide: true,
        dependencyGraph: true,
        securityFindings: true,
        findings:        { orderBy: { severity: 'asc' } },
      }
    });

    if (!scan) return res.status(404).json({ message: 'Scan not found' });

    // Aggregate file-level metrics from the DB
    const metrics = await prisma.fileMetrics.aggregate({
      where: { file: { scanId: id } },
      _sum: {
        linesOfCode:          true,
        functionCount:        true,
        componentCount:       true,
        hookUsage:            true,
        dependencyCount:      true,
        deadCodeIndicators:   true,
        duplicateCodeBlocks:  true,
        // Sum of per-file complexity totals — used for correct per-function avg
        cyclomaticComplexity: true,
        cognitiveComplexity:  true,
      },
      _avg: {
        avgFunctionLength:    true,
      },
      _max: {
        largestFunction: true,
        nestingDepth:    true,
      }
    });

    const largeFilesCount = await prisma.fileMetrics.count({
      where: { file: { scanId: id }, linesOfCode: { gt: 300 } }
    });

    // Compute true per-function complexity averages:
    // Each FileMetrics.cyclomaticComplexity = SUM of CC across all functions in that file.
    // Dividing by total function count gives the correct per-function average.
    const totalFunctionCount = metrics._sum.functionCount || 0;
    const avgCyclomaticComplexity = totalFunctionCount > 0
      ? (metrics._sum.cyclomaticComplexity || 0) / totalFunctionCount
      : 0;
    const avgCognitiveComplexity = totalFunctionCount > 0
      ? (metrics._sum.cognitiveComplexity || 0) / totalFunctionCount
      : 0;

    const aggregatedMetrics = {
      totalLines:              metrics._sum.linesOfCode          || 0,
      fileCount:               scan.analyzedFiles                || 0,
      functionCount:           totalFunctionCount,
      componentCount:          metrics._sum.componentCount       || 0,
      hookUsageCount:          metrics._sum.hookUsage            || 0,
      avgFunctionLength:       metrics._avg.avgFunctionLength    || 0,
      largestFunction:         metrics._max.largestFunction      || 0,
      maxNestingDepth:         metrics._max.nestingDepth         || 0,
      deadCodeIndicators:      metrics._sum.deadCodeIndicators   || 0,
      largeFilesCount:         largeFilesCount                   || 0,
      dependencyCount:         metrics._sum.dependencyCount      || 0,
      duplicateCodeBlocks:     metrics._sum.duplicateCodeBlocks  || 0,
      // Corrected: per-function averages, not per-file averages
      avgCyclomaticComplexity,
      avgCognitiveComplexity,
    };

    res.json({
      ...scan,
      metrics: aggregatedMetrics,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getScanFiles = async (req, res) => {
  try {
    const { id } = req.params;
    const files = await prisma.repositoryFile.findMany({
      where: { scanId: id },
      include: { classification: true, metrics: true },
      orderBy: { importanceScore: 'desc' }
    });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
