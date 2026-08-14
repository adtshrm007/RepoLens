/**
 * HighComplexityRule
 * Triggers when a function's cyclomatic complexity exceeds 10.
 *
 * Thresholds (based on McCabe's original recommendations):
 *   10–14  MEDIUM
 *   15–19  HIGH
 *   20+    CRITICAL
 */
export class HighComplexityRule {
  get id() { return 'HIGH_CYCLOMATIC_COMPLEXITY'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const cc = fn.cyclomaticComplexity;
        if (cc < 10) continue;

        const severity = cc >= 20 ? 'CRITICAL' : cc >= 15 ? 'HIGH' : 'MEDIUM';

        findings.push({
          ruleId:     this.id,
          severity,
          category:   'COMPLEXITY',
          file:       profile.filePath,
          line:       fn.lineStart,
          symbol:     fn.name,
          message:    `'${fn.name}' has cyclomatic complexity of ${cc}`,
          explanation: `Cyclomatic complexity of ${cc} means this function has ${cc} independent execution paths. Functions above 10 are statistically harder to test, maintain, and understand. A score of ${cc >= 20 ? '20+' : cc >= 15 ? '15+' : '10+'} suggests serious structural problems.`,
          metrics:    { cyclomaticComplexity: cc, cognitiveComplexity: fn.cognitiveComplexity },
          recommendation: 'Extract logical branches into smaller, well-named functions. Each function should have a single responsibility with a complexity target of ≤ 5.',
        });
      }
    }

    return findings;
  }
}
