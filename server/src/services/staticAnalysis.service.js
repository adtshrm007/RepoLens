/**
 * StaticAnalysisService — thin adapter (post tree-sitter upgrade)
 *
 * In the new pipeline, all static analysis is performed by CSTDataExtractor
 * during the per-file processing loop in ScannerService.
 *
 * This class now simply reads the aggregated metrics from a CSTRepoProfile
 * and returns them in the same shape that the rest of the system expects.
 *
 * This preserves backward compatibility with:
 *   - analysis.controller.js (V1.5 endpoints)
 *   - ScoringEngineService (still expects the same metric keys)
 *   - Any future code that calls analyzeFiles()
 *
 * The Babel-based implementation is removed. tree-sitter is the single parser.
 */
export class StaticAnalysisService {
  /**
   * Read metrics from a CSTRepoProfile.
   * Called after CSTRepoProfile.aggregate() has been called.
   *
   * @param {CSTRepoProfile} repoProfile
   * @returns {RepoMetrics}
   */
  analyzeFiles(repoProfile) {
    // If given a CSTRepoProfile (new path)
    if (repoProfile && typeof repoProfile.aggregate === 'function') {
      const m = repoProfile.aggregate();
      return {
        totalLines:        m.totalLines,
        fileCount:         m.fileCount,
        functionCount:     m.totalFunctions,
        avgFunctionLength: m.avgFunctionLength,
        largestFunction:   m.maxFunctionLength,
        maxNestingDepth:   m.maxNestingDepth,
        componentCount:    m.componentCount,
        hookUsageCount:    m.hookUsageCount,
        dependencyCount:   m.dependencyCount,
        largeFilesCount:   m.largeFilesCount,
        largeFunctionsCount: m.largeFunctionsCount,
        deadCodeIndicators: m.deadCodeIndicators,
        duplicateImports:  m.duplicateImports,
        // New metrics from CST
        avgCyclomaticComplexity: m.avgCyclomaticComplexity,
        avgCognitiveComplexity:  m.avgCognitiveComplexity,
        totalDuplicateCodeBlocks: m.totalDuplicateCodeBlocks,
        backendStats:      m.backendStats,
      };
    }

    // Fallback: if called with an empty/null profile, return safe zeros
    console.warn('[StaticAnalysisService] No CSTRepoProfile provided — returning empty metrics.');
    return this._emptyMetrics();
  }

  _emptyMetrics() {
    return {
      totalLines: 0, fileCount: 0, functionCount: 0,
      avgFunctionLength: 0, largestFunction: 0, maxNestingDepth: 0,
      componentCount: 0, hookUsageCount: 0, dependencyCount: 0,
      largeFilesCount: 0, largeFunctionsCount: 0, deadCodeIndicators: 0,
      duplicateImports: 0, avgCyclomaticComplexity: 0,
      avgCognitiveComplexity: 0, totalDuplicateCodeBlocks: 0,
      backendStats: {
        totalDbCalls: 0, middlewareCount: 0, controllerCount: 0,
        filesystemOpsCount: 0, asyncFunctionCount: 0, dbClients: []
      }
    };
  }
}
