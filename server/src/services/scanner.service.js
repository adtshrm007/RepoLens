import prisma from '../utils/prisma.util.js';
import { fetchRepositoryTree, fetchFileContent } from './github.service.js';
import { ClassificationService } from './classification.service.js';
import { StaticAnalysisService } from './staticAnalysis.service.js';
import { DependencyGraphService } from './dependencyGraph.service.js';
import { SecurityScannerService } from './securityScanner.service.js';
import { ScoringEngineService } from './scoringEngine.service.js';
import { generateV1_5Insights } from './analysis.service.js'; // We will repurpose this or rewrite a new one

export class ScannerService {
  constructor(userId, repositoryId, owner, repoName, githubAccessToken) {
    this.userId = userId;
    this.repositoryId = repositoryId;
    this.owner = owner;
    this.repoName = repoName;
    this.githubAccessToken = githubAccessToken;
    this.classificationService = new ClassificationService();
  }

  async startScan() {
    // 1. Create the Scan Record
    const scan = await prisma.repositoryScan.create({
      data: {
        repositoryId: this.repositoryId,
        status: 'SCANNING',
        startedAt: new Date(),
      }
    });

    // 2. Launch background job (do not await)
    this.runPipeline(scan.id).catch(async (err) => {
      console.error(`Pipeline failed for scan ${scan.id}:`, err);
      try {
        await prisma.repositoryScan.update({
          where: { id: scan.id },
          data: { status: 'FAILED', summary: `Error: ${err.message}` }
        });
      } catch (dbErr) {
        console.error('Failed to mark scan as FAILED:', dbErr);
      }
    });

    return scan.id;
  }

  async runPipeline(scanId) {
    // 1. Fetch entire repository tree
    const { files: rawFiles } = await fetchRepositoryTree(this.githubAccessToken, this.owner, this.repoName);
    
    // 2. Filter, Classify, Score
    const classifiedFiles = this.classificationService.processTree(rawFiles);
    
    await prisma.repositoryScan.update({
      where: { id: scanId },
      data: { totalFiles: classifiedFiles.length, status: 'ANALYZING' }
    });

    // 3. Save all files to DB (batched to prevent connection pool exhaustion)
    const dbFiles = [];
    const batchSize = 10;
    for (let i = 0; i < classifiedFiles.length; i += batchSize) {
      const batch = classifiedFiles.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (file) => {
        const extension = file.path.split('.').pop() || '';
        return await prisma.repositoryFile.create({
          data: {
            scanId,
            path: file.path,
            extension,
            size: file.size ?? 0,
            importanceScore: file.importanceScore,
            classification: {
              create: {
                type: file.classification
              }
            }
          },
          include: { classification: true }
        });
      }));
      dbFiles.push(...batchResults);
    }

    // 4. Take top 50 files for deep AST analysis
    const topFiles = [...dbFiles].sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0)).slice(0, 50);

    // 5. Fetch content (sequentially to avoid rate limits, or batch of 5)
    const filesWithContent = [];
    let analyzedCount = 0;
    
    for (const file of topFiles) {
      // Only fetch content for source code files
      if (['js', 'jsx', 'ts', 'tsx'].includes(file.extension)) {
        try {
          const content = await fetchFileContent(this.githubAccessToken, this.owner, this.repoName, file.path);
          filesWithContent.push({ ...file, content });
          
          analyzedCount++;
          if (analyzedCount % 5 === 0) {
             await prisma.repositoryScan.update({
               where: { id: scanId },
               data: { analyzedFiles: analyzedCount }
             });
          }
        } catch (err) {
          console.warn(`Failed to fetch content for ${file.path}:`, err.message);
        }
      }
    }

    // Update final analyzed count
    await prisma.repositoryScan.update({
      where: { id: scanId },
      data: { analyzedFiles: filesWithContent.length }
    });

    // 6. Run Deterministic Engines
    const staticAnalyzer = new StaticAnalysisService();
    const metricsResult = staticAnalyzer.analyzeFiles(filesWithContent);

    const securityScanner = new SecurityScannerService();
    const securityFindings = securityScanner.scanFiles(filesWithContent);

    const graphBuilder = new DependencyGraphService();
    const dependencyGraph = graphBuilder.buildGraph(filesWithContent);

    const scoringEngine = new ScoringEngineService(metricsResult, securityFindings);
    const healthScores = scoringEngine.calculateScores();

    // 7. Save Deterministic Results to DB
    // Save File Metrics
    for (const file of filesWithContent) {
      // staticAnalyzer needs a way to get individual file metrics, but currently it aggregates.
      // We will adjust staticAnalyzer to provide per-file metrics, or we will just use aggregated for now.
      // Let's implement individual file metrics saving by parsing them individually.
      const individualMetrics = new StaticAnalysisService().analyzeFiles([file]);
      await prisma.fileMetrics.create({
        data: {
          fileId: file.id,
          linesOfCode: individualMetrics.totalLines || 0,
          functionCount: individualMetrics.functionCount || 0,
          componentCount: individualMetrics.componentCount || 0,
          hookUsage: individualMetrics.hookUsageCount || 0,
          avgFunctionLength: individualMetrics.avgFunctionLength || 0,
          largestFunction: individualMetrics.largestFunction || 0,
          nestingDepth: individualMetrics.maxNestingDepth || 0,
          dependencyCount: individualMetrics.dependencyCount || 0,
          deadCodeIndicators: individualMetrics.deadCodeIndicators || 0,
        }
      });
      await prisma.repositoryFile.update({ where: { id: file.id }, data: { isAnalyzed: true } });
    }

    // Save Security Findings
    if (securityFindings.length > 0) {
      await prisma.securityFinding.createMany({
        data: securityFindings.map(f => ({
          scanId,
          type: f.type,
          severity: f.severity,
          file: f.file,
          lineNumber: f.lineNumber,
          snippet: (f.snippet || '').substring(0, 500),
          description: f.description,
          recommendation: f.recommendation || "Review and secure this code segment."
        }))
      });
    }

    // Save Graph
    await prisma.dependencyGraph.create({
      data: {
        scanId,
        nodes: dependencyGraph.nodes,
        edges: dependencyGraph.edges
      }
    });

    // Save Health
    await prisma.healthScore.create({
      data: {
        scanId,
        ...healthScores
      }
    });

    // 8. Generate AI Intelligence
    const aiInsights = await generateV1_5Insights(this.repoName, metricsResult, healthScores, securityFindings, dependencyGraph);

    // Save Architecture & Onboarding
    await prisma.architectureModel.create({
      data: {
        scanId,
        summary: aiInsights.summary || "Architecture mapped successfully.",
        // We'll leave the layers null for now or parse them if AI provides them
      }
    });

    await prisma.onboardingGuide.create({
      data: {
        scanId,
        content: aiInsights.onboardingGuide?.content || "No guide generated.",
        entryPoints: aiInsights.onboardingGuide?.entryPoints || [],
        moduleFlow: aiInsights.onboardingGuide?.moduleFlow || []
      }
    });

    // 9. Mark Completed
    await prisma.repositoryScan.update({
      where: { id: scanId },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date(),
        summary: aiInsights.summary || "Scan completed successfully."
      }
    });
  }
}
