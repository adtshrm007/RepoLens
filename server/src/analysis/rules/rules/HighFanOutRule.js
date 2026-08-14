/**
 * HighFanOutRule
 * Triggers when a file imports from more than 10 other internal files.
 * High fan-out indicates a file with too many responsibilities
 * or a "god module" that knows about everything.
 *
 * Thresholds (internal imports):
 *   10–14  MEDIUM
 *   15–19  HIGH
 *   20+    CRITICAL
 */
export class HighFanOutRule {
  get id() { return 'HIGH_FAN_OUT'; }

  evaluate(repoProfile, graphResult) {
    if (!graphResult?.nodes) return [];

    const findings = [];

    for (const node of graphResult.nodes) {
      if (node.type !== 'file') continue;
      const fanOut = node.fanOut ?? 0;
      if (fanOut < 10) continue;

      const severity = fanOut >= 20 ? 'CRITICAL' : fanOut >= 15 ? 'HIGH' : 'MEDIUM';

      findings.push({
        ruleId:     this.id,
        severity,
        category:   'DEPENDENCY',
        file:       node.path,
        line:       1,
        symbol:     null,
        message:    `'${node.label}' imports from ${fanOut} modules (high fan-out)`,
        explanation: `This file has ${fanOut} outgoing dependencies. High fan-out means it is tightly coupled to many parts of the codebase — changes anywhere in those ${fanOut} modules may require changes here. This is a warning sign of a "god module" pattern.`,
        metrics:    { fanOut, fanIn: node.fanIn ?? 0 },
        recommendation: 'Split this module into focused sub-modules. Consider using dependency injection or a facade pattern to reduce direct coupling to many services.',
      });
    }

    return findings;
  }
}
