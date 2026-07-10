export class ScoringEngineService {
  constructor(metrics, securityFindings) {
    this.metrics = metrics || {};
    this.securityFindings = securityFindings || [];
  }

  calculateScores() {
    const maintainability = this.calculateMaintainability();
    const security = this.calculateSecurity();
    const architecture = this.calculateArchitecture();
    const documentation = this.calculateDocumentation();

    // Overall is a weighted average
    const overall = Math.round((maintainability * 0.35) + (security * 0.35) + (architecture * 0.20) + (documentation * 0.10));

    return {
      maintainability,
      security,
      architecture,
      documentation,
      overall
    };
  }

  calculateMaintainability() {
    let score = 100;

    const {
      fileCount = 1,
      functionCount = 1,
      largeFilesCount = 0,
      largeFunctionsCount = 0,
      deadCodeIndicators = 0,
      duplicateImports = 0,
      maxNestingDepth = 0,
      avgFunctionLength = 0
    } = this.metrics;

    const safeFileCount = Math.max(1, fileCount);
    const safeFunctionCount = Math.max(1, functionCount);

    // Deduct based on percentages rather than absolute counts
    // e.g., if 20% of files are large, deduct 0.2 * 50 = 10 points
    score -= (largeFilesCount / safeFileCount) * 50;
    score -= (largeFunctionsCount / safeFunctionCount) * 50;

    // Cap absolute deductions for dead code and duplicate imports
    score -= Math.min(15, deadCodeIndicators * 2);
    score -= Math.min(10, duplicateImports * 0.5);

    if (maxNestingDepth > 4) {
      score -= Math.min(15, (maxNestingDepth - 4) * 3);
    }

    if (avgFunctionLength > 50) {
      score -= 15;
    } else if (avgFunctionLength > 30) {
      score -= 5;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  calculateSecurity() {
    let score = 100;

    for (const finding of this.securityFindings) {
      switch (finding.severity.toUpperCase()) {
        case 'CRITICAL':
          score -= 20;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 5;
          break;
        case 'LOW':
          score -= 2;
          break;
        default:
          score -= 1;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  calculateArchitecture() {
    let score = 100;
    // Basic heuristics based on metrics. 
    // In a real scenario, this would evaluate circular dependencies and modularity.
    const { dependencyCount = 0, fileCount = 1 } = this.metrics;
    
    // If a project has massive amounts of dependencies per file, it might be monolithic
    const depsPerFile = dependencyCount / Math.max(1, fileCount);
    if (depsPerFile > 10) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  calculateDocumentation() {
    // Deterministic doc score can be based on JSDoc presence (which we'd need to extract)
    // For now, return a baseline heuristic based on file size vs comments (if we parse comments).
    // Let's assume a baseline of 70 for V1.5, to be improved later.
    return 70;
  }
}
