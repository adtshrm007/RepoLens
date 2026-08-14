/**
 * LongFunctionRule
 *
 * Triggers when a function exceeds 60 lines.
 * Severity is scoped to CODE_QUALITY category — not mapped to security severity.
 *
 * Thresholds (lines):
 *   60–99    LOW     — longer than ideal; may be acceptable
 *   100–199  MEDIUM  — clearly oversized, refactoring recommended
 *   200+     HIGH    — likely doing too many things, must be split
 */
export class LongFunctionRule {
  get id() { return 'LONG_FUNCTION'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const len = fn.length;
        if (len < 60) continue;

        const severity = len >= 200 ? 'HIGH' : len >= 100 ? 'MEDIUM' : 'LOW';

        const alsoComplex = fn.cyclomaticComplexity >= 10
          ? ` It also has a cyclomatic complexity of ${fn.cyclomaticComplexity}, compounding the risk.`
          : '';

        let recommendation = `Split '${fn.name}' into smaller, focused helpers. A function should ideally fit on one screen (≤ 40 lines) and have a single describable responsibility.`;
        
        if (len >= 200) {
          recommendation = `Function '${fn.name}' is excessively long. Identify logical phases (e.g., input validation, business logic, persistence) and extract them into separate functions or classes.`;
        } else if ((fn.parameterCount || 0) > 4) {
          recommendation = `Function '${fn.name}' is long and takes many parameters. Consider grouping related parameters into a configuration object and extracting parts of the body into helper functions.`;
        } else if (fn.maxNestingDepth >= 4) {
          recommendation = `Function '${fn.name}' is long and deeply nested. Use guard clauses to handle edge cases early, which will flatten the main body and make it easier to extract sections.`;
        } else if (fn.cyclomaticComplexity >= 15) {
          recommendation = `Function '${fn.name}' is long and highly complex. Extract branching logic into named predicate functions and isolate independent workflows.`;
        }

        findings.push({
          ruleId:      this.id,
          severity,
          category:    'CODE_QUALITY',
          confidence:  'HIGH',
          file:        profile.filePath,
          startLine:   fn.lineStart,
          endLine:     fn.lineEnd,
          line:        fn.lineStart,
          symbol:      fn.name,
          message:     `'${fn.name}' is ${len} lines long (threshold: 60)`,
          explanation: `Function '${fn.name}' spans lines ${fn.lineStart}–${fn.lineEnd} (${len} lines). ` +
            `Functions over 60 lines typically violate the Single Responsibility Principle, ` +
            `making them harder to test and understand in isolation.${alsoComplex}`,
          evidence:    `Lines ${fn.lineStart}–${fn.lineEnd} (${len} lines)`,
          metrics:     { length: len, cyclomaticComplexity: fn.cyclomaticComplexity, threshold: 60 },
          recommendation,
        });
      }
    }

    return findings;
  }
}
