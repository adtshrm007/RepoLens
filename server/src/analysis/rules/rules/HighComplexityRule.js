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
        
        // Compute frequencies of decision points to give tailored recommendations
        const dpFreq = {};
        for (const dp of decisionPoints) {
          dpFreq[dp.type] = (dpFreq[dp.type] || 0) + 1;
        }

        const dpLines = decisionPoints
          .slice(0, 10) // cap to avoid huge strings
          .map(dp => `  - ${dp.type} at line ${dp.line}`)
          .join('\n');

        let cognitiveAmplification = '';
        if (fn.cognitiveComplexity > cc * 1.5) {
          cognitiveAmplification = ` \nNote: The cognitive complexity is very high (${fn.cognitiveComplexity}), indicating that nesting makes these paths much harder to follow than the cyclomatic score suggests.`;
        }

        const explanation =
          `Function '${fn.name}' has a cyclomatic complexity of ${cc} ` +
          `(threshold: 10, ${cc - 10} over limit).\n` +
          `This means it has ${cc} independent execution paths, making it ` +
          `${cc >= 20 ? 'extremely' : cc >= 15 ? 'very' : ''} difficult to test, maintain, and reason about.` +
          cognitiveAmplification +
          (dpLines ? `\n\nDecision points:\n${dpLines}` : '');

        let recommendation = `Break '${fn.name}' into smaller, single-purpose functions. Target ≤ 10 per function.`;
        if (dpFreq['if_statement'] > 5 && fn.maxNestingDepth > 3) {
           recommendation = `The function is dominated by nested if-statements. Use guard clauses (early returns) at the top of '${fn.name}' to flatten the logic, and extract deeply nested blocks into helper functions.`;
        } else if (dpFreq['switch_case'] > 5) {
           recommendation = `The function relies heavily on a switch statement with many cases. Consider extracting this logic into a lookup table, a map of handler functions, or using polymorphism.`;
        } else if ((dpFreq['ternary_expression'] || 0) + (dpFreq['logical_and'] || 0) + (dpFreq['logical_or'] || 0) > 5) {
           recommendation = `The function has high complexity due to inline conditionals (ternaries/logical operators). Extract complex conditional logic into clearly named predicate functions (e.g., \`isValid()\`, \`hasAccess()\`).`;
        } else if (dpFreq['if_statement'] > 5) {
           recommendation = `The function has a long sequence of if-statements. Extract cohesive blocks of logic into their own single-purpose functions.`;
        }

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
          recommendation,
        });
      }
    }

    return findings;
  }
}
