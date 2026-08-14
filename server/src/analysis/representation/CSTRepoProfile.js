/**
 * CSTRepoProfile — The main aggregator class.
 *
 * This is the single object that flows between the pipeline and all downstream
 * services after the CST extraction pass. The controller creates one instance,
 * processes all files through it, then passes it to StaticAnalysisService,
 * DependencyAnalyzer, RuleEngine, and ScoringEngineService.
 *
 * Holds:
 *   1. fileProfiles[]      — one FileProfile per analyzed file
 *   2. metrics             — repo-level roll-up (computed by aggregate())
 *
 * Design principle:
 *   The pipeline calls addFileProfile() per file as it completes.
 *   aggregate() is called ONCE after all files are processed.
 *   No re-parsing ever happens here.
 */
export class CSTRepoProfile {
  constructor() {
    /** @type {FileProfile[]} */
    this.fileProfiles = [];

    /** @type {Map<string, FileProfile>} */
    this._profileMap = new Map();

    /** @type {RepoMetrics | null} — null until aggregate() is called */
    this.metrics = null;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Add a completed FileProfile to the repo model.
   * Called once per file in the pipeline as files finish processing.
   * @param {FileProfile} profile
   */
  addFileProfile(profile) {
    this.fileProfiles.push(profile);
    this._profileMap.set(profile.filePath, profile);
  }

  /**
   * Look up a specific file's profile by path.
   * @param {string} filePath
   * @returns {FileProfile | null}
   */
  getFileProfile(filePath) {
    return this._profileMap.get(filePath) ?? null;
  }

  /**
   * Convenience accessor for DependencyAnalyzer.
   * @param {string} filePath
   * @returns {ImportRecord[]}
   */
  getImportsFor(filePath) {
    return this._profileMap.get(filePath)?.imports ?? [];
  }

  /**
   * Compute and cache repo-level aggregate metrics.
   * Must be called after all files have been processed.
   * Idempotent — calling multiple times returns the same result.
   * @returns {RepoMetrics}
   */
  aggregate() {
    if (this.metrics) return this.metrics;

    const profiles = this.fileProfiles;

    if (profiles.length === 0) {
      this.metrics = this._emptyMetrics();
      return this.metrics;
    }

    // All function profiles across all files
    const allFunctions = profiles.flatMap(p => p.functions ?? []);
    const functionLengths = allFunctions.map(f => f.length);

    // Unique DB clients across all files
    const allDbClients = new Set(
      profiles.flatMap(p => p.backend?.dbClients ?? [])
    );

    // Files with parse errors (partial data — counted but flagged)
    const parseErrorCount = profiles.filter(p => p.parseError).length;

    this.metrics = {
      // ── Basic ────────────────────────────────────────────────────
      totalLines:          profiles.reduce((s, p) => s + (p.totalLines || 0), 0),
      fileCount:           profiles.length,
      parseErrorCount,
      totalFunctions:      allFunctions.length,
      avgFunctionLength:   functionLengths.length > 0
        ? functionLengths.reduce((a, b) => a + b, 0) / functionLengths.length
        : 0,
      maxFunctionLength:   functionLengths.length > 0 ? Math.max(...functionLengths) : 0,
      largeFilesCount:     profiles.filter(p => (p.totalLines || 0) > 300).length,
      largeFunctionsCount: profiles.reduce((s, p) => s + (p.largeFunctionsCount || 0), 0),
      deadCodeIndicators:  profiles.reduce((s, p) => s + (p.deadCodeCount || 0), 0),

      // ── Complexity ────────────────────────────────────────────────
      maxNestingDepth:        profiles.reduce((max, p) => Math.max(max, p.maxNestingDepth || 0), 0),
      avgCyclomaticComplexity: profiles.length > 0
        ? profiles.reduce((s, p) => s + (p.cyclomaticComplexity || 0), 0) / profiles.length
        : 0,
      avgCognitiveComplexity:  profiles.length > 0
        ? profiles.reduce((s, p) => s + (p.cognitiveComplexity || 0), 0) / profiles.length
        : 0,

      // ── React ─────────────────────────────────────────────────────
      componentCount: profiles.reduce((s, p) => s + (p.componentCount || 0), 0),
      hookUsageCount: profiles.reduce((s, p) => s + (p.hookUsageCount || 0), 0),

      // ── Imports ───────────────────────────────────────────────────
      dependencyCount: profiles.reduce((s, p) => s + (p.dependencyCount || 0), 0),
      duplicateImports: profiles.reduce((s, p) => s + (p.duplicateImports || 0), 0),

      // ── Duplicate code ────────────────────────────────────────────
      totalDuplicateCodeBlocks: profiles.reduce((s, p) => s + (p.duplicateCodeBlocks || 0), 0),

      // ── Backend stats ─────────────────────────────────────────────
      backendStats: {
        totalDbCalls:      profiles.reduce((s, p) => s + (p.backend?.dbCallCount || 0), 0),
        middlewareCount:   profiles.filter(p => p.backend?.hasMiddleware).length,
        controllerCount:   profiles.filter(p => p.backend?.hasController).length,
        filesystemOpsCount: profiles.filter(p => p.backend?.hasFilesystemOps).length,
        asyncFunctionCount: profiles.reduce((s, p) => s + (p.backend?.asyncFunctionCount || 0), 0),
        dbClients: [...allDbClients],
      },
    };

    return this.metrics;
  }

  /**
   * Returns profiles for files that contain at least one function exceeding
   * the given cyclomatic complexity threshold. Useful for finding hotspots.
   * @param {number} threshold
   * @returns {Array<{ filePath, functions: FunctionProfile[] }>}
   */
  getComplexityHotspots(threshold = 10) {
    return this.fileProfiles
      .map(p => ({
        filePath: p.filePath,
        functions: (p.functions ?? []).filter(f => f.cyclomaticComplexity >= threshold),
      }))
      .filter(item => item.functions.length > 0)
      .sort((a, b) => {
        const maxA = Math.max(...a.functions.map(f => f.cyclomaticComplexity));
        const maxB = Math.max(...b.functions.map(f => f.cyclomaticComplexity));
        return maxB - maxA;
      });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _emptyMetrics() {
    return {
      totalLines: 0, fileCount: 0, parseErrorCount: 0,
      totalFunctions: 0, avgFunctionLength: 0, maxFunctionLength: 0,
      largeFilesCount: 0, largeFunctionsCount: 0, deadCodeIndicators: 0,
      maxNestingDepth: 0, avgCyclomaticComplexity: 0, avgCognitiveComplexity: 0,
      componentCount: 0, hookUsageCount: 0,
      dependencyCount: 0, duplicateImports: 0,
      totalDuplicateCodeBlocks: 0,
      backendStats: {
        totalDbCalls: 0, middlewareCount: 0, controllerCount: 0,
        filesystemOpsCount: 0, asyncFunctionCount: 0, dbClients: [],
      },
    };
  }
}
