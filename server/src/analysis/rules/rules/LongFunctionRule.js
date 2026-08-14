/**
 * LongFunctionRule
 * Triggers when a function exceeds 80 lines.
 *
 * Thresholds (lines):
 *   80–149   MEDIUM
 *   150–299  HIGH
 *   300+     CRITICAL
 */
export class LongFunctionRule {
  get id() { return 'LONG_FUNCTION'; }

  evaluate(repoProfile) {
    const findings = [];

    for (const profile of repoProfile.fileProfiles) {
      for (const fn of profile.functions ?? []) {
        const len = fn.length;
        if (len < 80) continue;

        const severity = len >= 300 ? 'CRITICAL' : len >= 150 ? 'HIGH' : 'MEDIUM';

        findings.push({
          ruleId:     this.id,
          severity,
          category:   'MAINTAINABILITY',
          file:       profile.filePath,
          line:       fn.lineStart,
          symbol:     fn.name,
          message:    `'${fn.name}' is ${len} lines long`,
          explanation: `Functions over 80 lines typically violate the Single Responsibility Principle. At ${len} lines, this function is likely doing too many things, making it hard to test, debug, and understand.`,
          metrics:    { length: len, cyclomaticComplexity: fn.cyclomaticComplexity },
          recommendation: 'Break this function into smaller, focused helpers. A good rule of thumb: a function should fit on one screen (≤ 40 lines) and be describable in a single sentence.',
        });
      }
    }

    return findings;
  }
}
