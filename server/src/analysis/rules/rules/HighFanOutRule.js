/**
 * HighFanOutRule
 *
 * Triggers when a file imports from too many internal modules.
 * Category: ARCHITECTURE
 *
 * Thresholds (internal module imports):
 *   10–14  LOW     — elevated, worth investigating
 *   15–19  MEDIUM  — potential god-module, split recommended
 *   20+    HIGH    — clear god-module, must be split
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

      const severity = fanOut >= 20 ? 'HIGH' : fanOut >= 15 ? 'MEDIUM' : 'LOW';

      findings.push({
        ruleId:      this.id,
        severity,
        category:    'ARCHITECTURE',
        confidence:  'HIGH',
        file:        node.path,
        startLine:   1,
        endLine:     1,
        line:        1,
        symbol:      null,
        message:     `'${node.label}' imports from ${fanOut} internal modules (high fan-out)`,
        explanation: `'${node.label}' has ${fanOut} outgoing dependencies to other internal modules ` +
          `(fan-in: ${node.fanIn ?? 0}). This is a warning sign of a "god module" that knows about too much of the codebase. ` +
          `Changes in any of those ${fanOut} modules may require changes here.`,
        evidence:    `Fan-out: ${fanOut} internal module imports (fan-in: ${node.fanIn ?? 0})`,
        metrics:     { fanOut, fanIn: node.fanIn ?? 0, threshold: 10 },
        recommendation: `Split '${node.label}' into focused sub-modules. ` +
          `Consider using dependency injection or a facade pattern to reduce direct coupling to ${fanOut} services.`,
      });
    }

    return findings;
  }
}
