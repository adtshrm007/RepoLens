/**
 * DeepNestingRule
 * Triggers when a function's nesting depth exceeds 4.
 *
 * Thresholds:
 *   5     MEDIUM
 *   6     HIGH
 *   7+    CRITICAL
 */
export class DeepNestingRule {
  get id() { return 'DEEP_NESTING'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const depth = fn.maxNestingDepth;
        if (depth < 5) continue;

        const severity = depth >= 7 ? 'CRITICAL' : depth >= 6 ? 'HIGH' : 'MEDIUM';

        findings.push({
          ruleId:     this.id,
          severity,
          category:   'MAINTAINABILITY',
          file:       profile.filePath,
          line:       fn.lineStart,
          symbol:     fn.name,
          message:    `'${fn.name}' has nesting depth of ${depth}`,
          explanation: `This function contains logic nested ${depth} levels deep. Deep nesting makes code extremely difficult to read and reason about. Each level of nesting forces the reader to mentally track an additional execution context.`,
          metrics:    { maxNestingDepth: depth, cyclomaticComplexity: fn.cyclomaticComplexity },
          recommendation: 'Use early returns (guard clauses) to reduce nesting. Extract nested logic into separate functions. Prefer flat structures — a function should rarely exceed 3 levels of nesting.',
        });
      }
    }

    return findings;
  }
}
