/**
 * CircularDependencyRule
 *
 * Triggers for every circular dependency cycle found in the dependency graph.
 * Category: ARCHITECTURE
 *
 * Severity:
 *   2-file cycle  HIGH    — direct mutual coupling, must be resolved
 *   3-file cycle  MEDIUM  — indirect circular loop
 *   4+ file cycle LOW     — longer chains, may be partially intentional
 */
export class CircularDependencyRule {
  get id() { return 'CIRCULAR_DEPENDENCY'; }

  evaluate(repoProfile, graphResult) {
    if (!graphResult?.cycles?.length) return [];

    return graphResult.cycles.map(cycle => {
      const severity = cycle.length <= 2 ? 'HIGH' : cycle.length <= 3 ? 'MEDIUM' : 'LOW';
      const cycleStr = cycle.join(' → ');

      return {
        ruleId:      this.id,
        severity,
        category:    'ARCHITECTURE',
        confidence:  'HIGH',
        file:        cycle[0],
        startLine:   1,
        endLine:     1,
        line:        1,
        symbol:      null,
        message:     `Circular dependency detected: ${cycleStr}`,
        explanation: `A circular dependency exists between ${cycle.length} module(s): ${cycleStr}. ` +
          `This creates tight coupling, prevents independent module loading, and breaks tree-shaking.`,
        evidence:    cycleStr,
        metrics:     { cycleLength: cycle.length, cycle },
        recommendation: `Extract the shared logic between ${cycle[0]} and ${cycle[cycle.length - 2]} ` +
          `into a third module that both can import. Review whether all modules in the cycle truly need each other.`,
      };
    });
  }
}
