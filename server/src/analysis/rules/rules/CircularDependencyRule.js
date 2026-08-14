/**
 * CircularDependencyRule
 * Triggers for every circular dependency cycle found in the dependency graph.
 *
 * Short cycles (2–3 files) are HIGH.
 * Longer cycles (4+ files) are MEDIUM (harder to detect, may be intentional).
 */
export class CircularDependencyRule {
  get id() { return 'CIRCULAR_DEPENDENCY'; }

  evaluate(repoProfile, graphResult) {
    if (!graphResult?.cycles?.length) return [];

    return graphResult.cycles.map(cycle => {
      const severity = cycle.length <= 3 ? 'HIGH' : 'MEDIUM';
      const cycleStr = cycle.join(' → ');

      return {
        ruleId:     this.id,
        severity,
        category:   'DEPENDENCY',
        file:       cycle[0],
        line:       1,
        symbol:     null,
        message:    `Circular dependency: ${cycleStr}`,
        explanation: `A circular dependency means module A depends on B which depends back on A (possibly through other modules). This creates tight coupling, makes modules impossible to load independently, and causes issues with testing and tree-shaking.`,
        metrics:    { cycleLength: cycle.length, cycle },
        recommendation: 'Extract shared logic into a third module that both can import without creating a cycle. Review whether both modules truly need each other or if their responsibilities overlap.',
      };
    });
  }
}
