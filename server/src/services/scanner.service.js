import prisma from '../utils/prisma.util.js';
import { fetchRepositoryTree, fetchFileContent } from './github.service.js';
import { ClassificationService } from './classification.service.js';
import { SASTEngine } from '../analysis/sast/SASTEngine.js';
import { DependencyVulnerabilityService } from './dependencyVulnerability.service.js';
import { ScoringEngineService } from './scoringEngine.service.js';
import { generateV1_5Insights } from './analysis.service.js';

// ── New CST analysis layer ──────────────────────────────────────────────────
import { TreeSitterParser }  from '../analysis/parser/TreeSitterParser.js';
import { CSTDataExtractor }  from '../analysis/representation/CSTDataExtractor.js';
import { CSTRepoProfile }    from '../analysis/representation/CSTRepoProfile.js';
import { DependencyAnalyzer } from '../analysis/analyzers/DependencyAnalyzer.js';
import { RuleEngine }        from '../analysis/rules/RuleEngine.js';
import { SecretDetector, isConfigFile } from '../analysis/sast/SecretDetector.js';
import { SecurityScoringEngine } from './securityScoring.service.js';
import { normalizeFindings, partitionFindings } from '../analysis/FindingNormalizer.js';

/** Max files to fetch content for — balances depth vs time budget */
const MAX_ANALYSIS_FILES = 100;

/** Number of files to fetch concurrently — respects GitHub rate limits */
const CONCURRENCY = 5;

export class ScannerService {
  constructor(userId, repositoryId, owner, repoName, githubAccessToken) {
    this.userId             = userId;
    this.repositoryId       = repositoryId;
    this.owner              = owner;
    this.repoName           = repoName;
    this.githubAccessToken  = githubAccessToken;

    // Per-scan instances — each scan is fully isolated
    this.classificationService = new ClassificationService();
    this.parser                = new TreeSitterParser();
    this.extractor             = new CSTDataExtractor();
    this.repoProfile           = new CSTRepoProfile();
    this.dependencyAnalyzer    = new DependencyAnalyzer();
    this.ruleEngine            = new RuleEngine();
    this.sastEngine            = new SASTEngine();
    this.secretDetector        = new SecretDetector();
    this.depVulnService        = new DependencyVulnerabilityService();
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  async startScan() {
    const scan = await prisma.repositoryScan.create({
      data: {
        repositoryId: this.repositoryId,
        status: 'SCANNING',
        startedAt: new Date(),
      }
    });

    // Fire-and-forget background pipeline
    this.runPipeline(scan.id).catch(async (err) => {
      console.error(`[Scanner] Pipeline failed for scan ${scan.id}:`, err);
      try {
        await prisma.repositoryScan.update({
          where: { id: scan.id },
          data: { status: 'FAILED', summary: `Error: ${err.message}` }
        });
      } catch (dbErr) {
        console.error('[Scanner] Failed to mark scan as FAILED:', dbErr);
      }
    });

    return scan.id;
  }

  // ── Pipeline ─────────────────────────────────────────────────────────────────

  async runPipeline(scanId) {
    const t0 = Date.now();

    // ── Step 1: Fetch entire repository tree (1 API call) ─────────────────────
    const { files: rawFiles } = await fetchRepositoryTree(
      this.githubAccessToken, this.owner, this.repoName
    );

    // ── Step 2: Classify all files — whitelist filter, importance scoring ──────
    //   ClassificationService.isIgnored() now uses a whitelist:
    //   only .js / .jsx / .ts / .tsx pass through.
    //   This runs on path strings — no content needed, no API calls.
    const classifiedFiles = this.classificationService.processTree(rawFiles);

    await prisma.repositoryScan.update({
      where: { id: scanId },
      data: { totalFiles: classifiedFiles.length, status: 'ANALYZING' }
    });

    // ── Step 3: Save all classified files to DB (batched) ─────────────────────
    const dbFiles = await this._saveFilesToDB(scanId, classifiedFiles);

    // ── Step 4: Select top files for deep analysis ─────────────────────────────
    //   Sort by importance score, cap at MAX_ANALYSIS_FILES.
    //   Files > 200KB are already rejected by TreeSitterParser — no need to
    //   filter by size here, but we could add it as a future optimisation.
    const topFiles = [...dbFiles]
      .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
      .slice(0, MAX_ANALYSIS_FILES);

    // ── Step 5: Streaming CST pipeline ────────────────────────────────────────
    //   Fetch content + parse + extract FileProfile — all per file,
    //   CONCURRENCY files at a time. Each FileProfile is written to DB
    //   immediately as it completes (no waiting for all files).
    let analyzedCount = 0;
    const allSecurityFindings = [];
    await this._processFilesInBatches(topFiles, scanId, async (dbFile, content) => {
      // Parse
      const extension   = dbFile.extension;
      const parseResult = this.parser.parse({ path: dbFile.path, content, extension });

      // Extract FileProfile
      const profile = this.extractor.extract(
        {
          path:           dbFile.path,
          name:           dbFile.path.split('/').pop(),
          extension,
          classification: dbFile.classification?.type || 'Generic Module',
          fileId:         dbFile.id,
          content,
        },
        parseResult
      );

      // Accumulate in CSTRepoProfile
      this.repoProfile.addFileProfile(profile);

      // Run SAST
      if (parseResult.success && parseResult.rootNode) {
        const fileSecurityFindings = this.sastEngine.scan(parseResult.rootNode, content, dbFile.path);
        allSecurityFindings.push(...fileSecurityFindings);
      }

      // Run SecretDetector
      if (isConfigFile(dbFile.path)) {
        allSecurityFindings.push(...this.secretDetector.scanConfigFile(dbFile.path, content));
      } else {
        allSecurityFindings.push(...this.secretDetector.scanContent(dbFile.path, content));
      }

      // Write FileMetrics to DB immediately
      await this._saveFileMetrics(dbFile.id, profile);

      // Mark file as analyzed
      await prisma.repositoryFile.update({
        where: { id: dbFile.id },
        data:  { isAnalyzed: true }
      });

      analyzedCount++;
      // Update progress every 5 files
      if (analyzedCount % 5 === 0) {
        await prisma.repositoryScan.update({
          where: { id: scanId },
          data:  { analyzedFiles: analyzedCount }
        });
      }
    });

    // Final analyzed count
    await prisma.repositoryScan.update({
      where: { id: scanId },
      data:  { analyzedFiles: analyzedCount }
    });

    // ── Step 6: Aggregate repo-level metrics ───────────────────────────────────
    const repoMetrics = this.repoProfile.aggregate();

    // ── Step 7: Dependency analysis ────────────────────────────────────────────
    const graphResult = this.dependencyAnalyzer.buildGraph(this.repoProfile);

    // ── Step 8: Rule engine ────────────────────────────────────────────────────
    const findings = this.ruleEngine.run(this.repoProfile, graphResult);

    // ── Step 9: Security scan ──────────────────────────────────────────────────
    // Security scan is now performed during the CST pipeline single-pass.
    let securityFindings = allSecurityFindings;

    // Run dependency vulnerability scan on package.json files
    const pkgFiles = rawFiles.filter(f => f.type === 'file' && f.path.endsWith('package.json'));
    const pkgFilesWithContent = [];
    for (const file of pkgFiles) {
       try {
          const content = await fetchFileContent(this.githubAccessToken, this.owner, this.repoName, file.path);
          pkgFilesWithContent.push({ path: file.path, content });
       } catch (err) {
          console.warn(`[Scanner] Failed to fetch ${file.path}:`, err.message);
       }
    }
    
    if (pkgFilesWithContent.length > 0) {
       const depFindings = await this.depVulnService.scanDependencies(pkgFilesWithContent);
       securityFindings.push(...depFindings);
    }
    
    // Normalize and deduplicate findings (e.g. merge same GHSA from multiple package.jsons)
    securityFindings = normalizeFindings(securityFindings);
    
    // Partition findings so ScoringEngineService doesn't double-count dep vulns
    const { sast: sastFindings, depVuln: depVulnFindings } = partitionFindings(securityFindings);

    // ── Step 10: Scoring ───────────────────────────────────────────────────────
    const scoringEngine = new ScoringEngineService(repoMetrics, sastFindings, findings, graphResult);
    const healthScores  = scoringEngine.calculateScores();

    // Security Scoring (Standalone 0-100 score + Breakdown)
    const securityScoring = new SecurityScoringEngine(securityFindings, depVulnFindings);
    const secResult = securityScoring.calculate();

    // ── Step 11: Write graph, findings, health to DB ───────────────────────────
    await this._saveDependencyGraph(scanId, graphResult);
    await this._saveFindings(scanId, findings);
    await this._saveSecurityFindings(scanId, securityFindings);

    await prisma.healthScore.create({
      data: {
        scanId,
        maintainability: healthScores.maintainability,
        security:        healthScores.security,
        architecture:    healthScores.architecture,
        documentation:   healthScores.documentation,
        overall:         healthScores.overall,
        securityScore:   secResult.score,
        securityGrade:   secResult.grade,
        securityBreakdown: { breakdown: secResult.breakdown, deductions: secResult.deductions },
      }
    });

    // ── Step 12: AI insights ───────────────────────────────────────────────────
    const aiInsights = await generateV1_5Insights(
      this.repoName,
      repoMetrics,
      healthScores,
      securityFindings,
      graphResult,
      findings
    );

    await prisma.architectureModel.create({
      data: {
        scanId,
        summary: aiInsights.summary || 'Architecture analysed.',
      }
    });

    await prisma.onboardingGuide.create({
      data: {
        scanId,
        content:     aiInsights.onboardingGuide?.content     || 'No guide generated.',
        entryPoints: aiInsights.onboardingGuide?.entryPoints || [],
        moduleFlow:  aiInsights.onboardingGuide?.moduleFlow  || [],
      }
    });

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    // ── Step 13: Complete ──────────────────────────────────────────────────────
    await prisma.repositoryScan.update({
      where: { id: scanId },
      data: {
        status:      'COMPLETED',
        completedAt: new Date(),
        summary:     aiInsights.summary || `Scan completed in ${elapsed}s. Analyzed ${analyzedCount} files.`,
      }
    });

    console.log(`[Scanner] Scan ${scanId} completed in ${elapsed}s — ${analyzedCount} files analyzed.`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * Save all classified files to DB in batches of 10.
   * Returns the created DB records (with id, path, extension, importanceScore, classification).
   */
  async _saveFilesToDB(scanId, classifiedFiles) {
    const dbFiles = [];
    const batchSize = 10;

    for (let i = 0; i < classifiedFiles.length; i += batchSize) {
      const batch = classifiedFiles.slice(i, i + batchSize);
      const created = await Promise.all(batch.map(async (file) => {
        const extension = file.path.split('.').pop() || '';
        return prisma.repositoryFile.create({
          data: {
            scanId,
            path:            file.path,
            extension,
            size:            file.size ?? 0,
            importanceScore: file.importanceScore,
            classification:  { create: { type: file.classification } }
          },
          include: { classification: true }
        });
      }));
      dbFiles.push(...created);
    }

    return dbFiles;
  }

  /**
   * Process files concurrently in groups of CONCURRENCY.
   * Fetches content from GitHub, then calls the provided handler.
   * Errors for individual files are caught and logged — they do not abort the scan.
   */
  async _processFilesInBatches(files, scanId, handler) {
    for (let i = 0; i < files.length; i += CONCURRENCY) {
      const batch = files.slice(i, i + CONCURRENCY);

      await Promise.all(batch.map(async (dbFile) => {
        try {
          const content = await fetchFileContent(
            this.githubAccessToken, this.owner, this.repoName, dbFile.path
          );
          await handler(dbFile, content);
        } catch (err) {
          console.warn(`[Scanner] Skipping ${dbFile.path}: ${err.message}`);
        }
      }));
    }
  }

  /**
   * Write a FileProfile's metrics to the FileMetrics table.
   * Called per file immediately after extraction.
   */
  async _saveFileMetrics(fileId, profile) {
    try {
      await prisma.fileMetrics.create({
        data: {
          fileId,
          linesOfCode:          profile.totalLines      || 0,
          functionCount:        profile.totalFunctions  || 0,
          componentCount:       profile.componentCount  || 0,
          hookUsage:            profile.hookUsageCount  || 0,
          avgFunctionLength:    profile.avgFunctionLength || 0,
          largestFunction:      profile.maxFunctionLength || 0,
          nestingDepth:         profile.maxNestingDepth || 0,
          dependencyCount:      profile.dependencyCount || 0,
          deadCodeIndicators:   profile.deadCodeCount   || 0,
          cyclomaticComplexity: profile.cyclomaticComplexity || 0,
          cognitiveComplexity:  profile.cognitiveComplexity  || 0,
          duplicateCodeBlocks:  profile.duplicateCodeBlocks  || 0,
          contentHash:          profile.contentHash     || null,
        }
      });
    } catch (err) {
      console.warn(`[Scanner] Failed to save metrics for ${profile.filePath}: ${err.message}`);
    }
  }



  async _saveDependencyGraph(scanId, graphResult) {
    try {
      await prisma.dependencyGraph.create({
        data: {
          scanId,
          nodes:    graphResult.nodes,
          edges:    graphResult.edges,
          cycles:   graphResult.cycles,
          hotspots: graphResult.hotspots,
          metrics:  graphResult.metrics,
        }
      });
    } catch (err) {
      console.warn('[Scanner] Failed to save dependency graph:', err.message);
    }
  }

  async _saveFindings(scanId, findings) {
    if (!findings.length) return;
    try {
      await prisma.finding.createMany({
        data: findings.map(f => ({
          scanId,
          ruleId:         f.ruleId,
          severity:       f.severity,
          category:       f.category,
          confidence:     f.confidence || 'HIGH',
          file:           f.file,
          line:           f.startLine ?? f.line ?? 1,
          startLine:      f.startLine ?? f.line ?? 0,
          endLine:        f.endLine ?? 0,
          symbol:         f.symbol || null,
          message:        f.message,
          explanation:    f.explanation,
          evidence:       f.evidence || null,
          metrics:        f.metrics || null,
          recommendation: f.recommendation,
          cwe:            f.cwe || null,
          cve:            f.cve || null,
          cvss:           f.cvss || null,
        }))
      });
    } catch (err) {
      console.warn('[Scanner] Failed to save findings:', err.message);
    }
  }

  async _saveSecurityFindings(scanId, securityFindings) {
    if (!securityFindings.length) return;
    try {
      await prisma.securityFinding.createMany({
        data: securityFindings.map(f => ({
          scanId,
          type:           f.type,
          severity:       f.severity,
          file:           f.file,
          lineNumber:     f.lineNumber,
          snippet:        (f.snippet || '').substring(0, 500),
          description:    f.description,
          recommendation: f.recommendation || 'Review and secure this code segment.',
          cwe:            f.cwe || null,
          cve:            f.cve || null,
          cvss:           f.cvss || null,
        }))
      });
    } catch (err) {
      console.warn('[Scanner] Failed to save security findings:', err.message);
    }
  }
}
