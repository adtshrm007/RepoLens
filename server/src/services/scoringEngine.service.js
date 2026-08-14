/**
 * ScoringEngineService
 *
 * Computes the repository health score from deterministic analysis results.
 * All scores are on a 0–100 scale. Every deduction is documented.
 *
 * Score categories and weights:
 *   Maintainability  35%  — complexity, function size, nesting, dead code
 *   Security         30%  — security findings by severity
 *   Architecture     25%  — dependency quality, circular deps, fan-out
 *   Documentation    10%  — comment density
 *
 * Design principle:
 *   A developer should be able to answer "why did I score X and not Y?"
 *   Every deduction below has a comment explaining the formula.
 */
export class ScoringEngineService {
  /**
   * @param {RepoMetrics}        metrics         — from CSTRepoProfile.aggregate()
   * @param {SecurityFinding[]}  securityFindings — from SecurityScannerService
   * @param {Finding[]}          findings         — from RuleEngine (optional)
   * @param {DependencyGraph}    graphResult      — from DependencyAnalyzer (optional)
   */
  constructor(metrics, securityFindings, findings = [], graphResult = null) {
    this.metrics         = metrics          || {};
    this.securityFindings = securityFindings || [];
    this.findings        = findings;
    this.graphResult     = graphResult;
  }

  calculateScores() {
    const maintainability = this.calculateMaintainability();
    const security        = this.calculateSecurity();
    const architecture    = this.calculateArchitecture();
    const documentation   = this.calculateDocumentation();

    // Weighted average — weights sum to 1.0
    const overall = Math.round(
      maintainability * 0.35 +
      security        * 0.30 +
      architecture    * 0.25 +
      documentation   * 0.10
    );

    return { maintainability, security, architecture, documentation, overall };
  }

  // ── Maintainability (0–100) ─────────────────────────────────────────────────
  calculateMaintainability() {
    let score = 100;

    const {
      fileCount            = 1,
      totalFunctions       = 1,
      largeFilesCount      = 0,
      largeFunctionsCount  = 0,
      deadCodeIndicators   = 0,
      duplicateImports     = 0,
      maxNestingDepth      = 0,
      avgFunctionLength    = 0,
      avgCyclomaticComplexity = 0,
      avgCognitiveComplexity  = 0,
      totalDuplicateCodeBlocks = 0,
    } = this.metrics;

    const safeFileCount     = Math.max(1, fileCount);
    const safeFunctionCount = Math.max(1, totalFunctions);

    // Large files ratio: up to -20 points
    // Rationale: if >20% of files are large (>300 LOC), maintainability degrades.
    score -= (largeFilesCount / safeFileCount) * 20;

    // Large functions ratio: up to -25 points
    // Rationale: functions >50 lines are the primary code smell indicator.
    score -= (largeFunctionsCount / safeFunctionCount) * 25;

    // Cyclomatic complexity: up to -20 points
    // Thresholds: avg CC > 5 starts deducting; > 15 hits maximum penalty.
    if (avgCyclomaticComplexity > 5) {
      score -= Math.min(20, (avgCyclomaticComplexity - 5) * 2);
    }

    // Cognitive complexity: up to -15 points
    // Cognitive complexity > 10 on average indicates very hard-to-read code.
    if (avgCognitiveComplexity > 10) {
      score -= Math.min(15, (avgCognitiveComplexity - 10) * 1.5);
    }

    // Nesting depth: up to -10 points
    // Each nesting level beyond 4 costs 2 points.
    if (maxNestingDepth > 4) {
      score -= Math.min(10, (maxNestingDepth - 4) * 2);
    }

    // Avg function length: -5 if >50, -3 if >30
    if (avgFunctionLength > 50)      score -= 5;
    else if (avgFunctionLength > 30) score -= 3;

    // Dead code: up to -5 points
    score -= Math.min(5, deadCodeIndicators * 1);

    // Duplicate imports: up to -5 points
    score -= Math.min(5, duplicateImports * 0.5);

    // Structural duplicate code blocks: up to -5 points
    score -= Math.min(5, totalDuplicateCodeBlocks * 0.5);

    // HIGH/CRITICAL complexity findings from RuleEngine: -3 per finding (up to -10)
    const complexFindings = this.findings.filter(
      f => f.category === 'COMPLEXITY' && (f.severity === 'HIGH' || f.severity === 'CRITICAL')
    );
    score -= Math.min(10, complexFindings.length * 3);

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ── Security (0–100) ──────────────────────────────────────────────────────
  calculateSecurity() {
    let score = 100;

    // Deductions per finding severity
    // These caps prevent one misconfigured file from dropping score to 0.
    const deductionMap = { CRITICAL: 20, HIGH: 12, MEDIUM: 5, LOW: 2 };

    let totalDeduction = 0;
    for (const finding of this.securityFindings) {
      const deduction = deductionMap[finding.severity?.toUpperCase()] ?? 1;
      totalDeduction += deduction;
    }

    // Cap total deduction at 80 — a score of 0 is reserved for catastrophic failures
    score -= Math.min(80, totalDeduction);

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ── Architecture (0–100) ──────────────────────────────────────────────────
  calculateArchitecture() {
    let score = 100;

    const { dependencyCount = 0, fileCount = 1 } = this.metrics;

    // Dependencies per file > 10 indicates tight coupling: up to -10
    const depsPerFile = dependencyCount / Math.max(1, fileCount);
    if (depsPerFile > 10) {
      score -= Math.min(10, (depsPerFile - 10) * 1);
    }

    // Circular dependencies: -10 per cycle (up to -30)
    if (this.graphResult?.cycles?.length) {
      score -= Math.min(30, this.graphResult.cycles.length * 10);
    }

    // High fan-out findings: -5 per finding (up to -15)
    const fanOutFindings = this.findings.filter(f => f.ruleId === 'HIGH_FAN_OUT');
    score -= Math.min(15, fanOutFindings.length * 5);

    // DEPENDENCY findings: -3 per finding (up to -10)
    const depFindings = this.findings.filter(f => f.category === 'DEPENDENCY');
    score -= Math.min(10, depFindings.length * 3);

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ── Documentation (0–100) ─────────────────────────────────────────────────
  calculateDocumentation() {
    // Base: 60 (most JS projects have limited JSDoc)
    let score = 60;

    // If we have meaningful comment coverage, reward it.
    // Comment lines / total lines > 10% = +20 bonus.
    // This requires per-file profile data — use aggregate if available.
    const profiles = this.metrics._profiles || [];
    if (profiles.length > 0) {
      const totalLines   = profiles.reduce((s, p) => s + (p.totalLines || 0), 0);
      const commentLines = profiles.reduce((s, p) => s + (p.commentLines || 0), 0);
      const ratio = totalLines > 0 ? commentLines / totalLines : 0;
      if (ratio > 0.15)      score = 90;
      else if (ratio > 0.10) score = 80;
      else if (ratio > 0.05) score = 70;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }
}
