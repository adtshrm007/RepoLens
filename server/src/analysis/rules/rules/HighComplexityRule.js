/**
 * HighComplexityRule
 *
 * Triggers when a function's cyclomatic complexity exceeds 10.
 * Severity is scoped to COMPLEXITY category — NOT "CRITICAL" like security.
 *
 * Thresholds (based on McCabe's original recommendations):
 *   10–14   MODERATE   — noticeable, warrants attention
 *   15–19   HIGH       — hard to test, refactoring advised
 *   20+     VERY_HIGH  — serious structural problem, must be fixed
 *
 * NOTE: These are code-quality labels, not security severity levels.
 * The UI should render them with different badge colors than SECURITY findings.
 */
export class HighComplexityRule {
  get id() { return 'HIGH_CYCLOMATIC_COMPLEXITY'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const cc = fn.cyclomaticComplexity;
        if (cc < 10) continue;

        const severity = cc >= 20 ? 'VERY_HIGH' : cc >= 15 ? 'HIGH' : 'MODERATE';

        // Build decision-point breakdown if available
        const decisionPoints = fn.decisionPoints ?? [];
        const dpLines = decisionPoints
          .slice(0, 10) // cap to avoid huge strings
          .map(dp => `  - ${dp.type} at line ${dp.line}`)
          .join('\n');

        const explanation =
          `Function '${fn.name}' has a cyclomatic complexity of ${cc} ` +
          `(threshold: 10, ${cc - 10} over limit).\n` +
          `This means it has ${cc} independent execution paths, making it ` +
          `${cc >= 20 ? 'extremely' : cc >= 15 ? 'very' : ''} difficult to test, maintain, and reason about.\n` +
          (dpLines ? `\nDecision points:\n${dpLines}` : '');

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
          message:     `'${fn.name}' has cyclomatic complexity of ${cc} (threshold: 10)`,
          explanation,
          evidence:    dpLines || null,
          metrics: {
            cyclomaticComplexity: cc,
            cognitiveComplexity:  fn.cognitiveComplexity,
            threshold: 10,
            decisionPoints,
          },
          recommendation: `Break '${fn.name}' into smaller, single-purpose functions. ` +
            `Target ≤ 10 per function. Each logical branch (if/switch/try) is a candidate for extraction.`,
        });
      }
    }

    return findings;
  }
}
