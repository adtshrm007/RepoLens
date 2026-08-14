/**
 * DeepNestingRule
 *
 * Triggers when a function's nesting depth exceeds 4.
 * Severity is scoped to COMPLEXITY category.
 *
 * Thresholds:
 *   5       MODERATE — noticeable, consider guard clauses
 *   6       HIGH     — hard to follow, refactoring recommended
 *   7+      VERY_HIGH — cognitive overload, must be fixed
 */
export class DeepNestingRule {
  get id() { return 'DEEP_NESTING'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const depth = fn.maxNestingDepth;
        if (depth < 5) continue;

        const severity = depth >= 7 ? 'VERY_HIGH' : depth >= 6 ? 'HIGH' : 'MODERATE';

        findings.push({
          ruleId:      this.id,
          severity,
          category:    'COMPLEXITY',
          confidence:  'HIGH',
          file:        profile.filePath,
          startLine:   fn.lineStart,
          endLine:     fn.lineEnd,
          line:        fn.lineStart,
          symbol:      fn.name,
          message:     `'${fn.name}' has nesting depth of ${depth} (threshold: 4)`,
          explanation: `Function '${fn.name}' contains logic nested ${depth} levels deep. ` +
            `Each level of nesting forces the reader to mentally track an additional execution context. ` +
            `At depth ${depth}, this function requires ${depth} nested conditions to be held in working memory simultaneously.`,
          evidence:    `Max nesting depth: ${depth} (found in '${fn.name}', lines ${fn.lineStart}–${fn.lineEnd})`,
          metrics:     { maxNestingDepth: depth, cyclomaticComplexity: fn.cyclomaticComplexity, threshold: 4 },
          recommendation: `Use early returns (guard clauses) at the top of '${fn.name}' ` +
            `to eliminate the deepest nesting levels. Extract nested logic blocks into well-named helper functions. ` +
            `Target: ≤ 3 levels of nesting per function.`,
        });
      }
    }

    return findings;
  }
}
