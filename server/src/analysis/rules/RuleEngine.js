/**
 * RuleEngine
 *
 * Iterates registered rules over a CSTRepoProfile + DependencyGraph result,
 * collecting standardized Finding objects.
 *
 * Each rule must implement:
 *   - get id(): string
 *   - evaluate(repoProfile, graphResult): Finding[]
 *
 * Finding shape:
 * {
 *   ruleId:         string
 *   severity:       'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 *   category:       'COMPLEXITY' | 'DEPENDENCY' | 'MAINTAINABILITY' | 'ARCHITECTURE'
 *   file:           string
 *   line:           number
 *   symbol:         string | null   — function/class name
 *   message:        string          — short, human-readable
 *   explanation:    string          — why this is a problem
 *   metrics:        object | null   — the raw numbers that triggered the rule
 *   recommendation: string
 * }
 */

import { HighComplexityRule }       from './rules/HighComplexityRule.js';
import { DeepNestingRule }          from './rules/DeepNestingRule.js';
import { LongFunctionRule }         from './rules/LongFunctionRule.js';
import { CircularDependencyRule }   from './rules/CircularDependencyRule.js';
import { HighFanOutRule }           from './rules/HighFanOutRule.js';

export class RuleEngine {
  constructor() {
    this._rules = [
      new HighComplexityRule(),
      new DeepNestingRule(),
      new LongFunctionRule(),
      new CircularDependencyRule(),
      new HighFanOutRule(),
    ];
  }

  /**
   * Register a custom rule (for extensibility).
   * @param {object} rule - implements { id, evaluate(repoProfile, graphResult) }
   */
  registerRule(rule) {
    this._rules.push(rule);
    return this;
  }

  /**
   * Run all rules and return the combined findings.
   * Rule failures are isolated — one broken rule does not stop others.
   *
   * @param {CSTRepoProfile} repoProfile
   * @param {DependencyGraph | null} graphResult
   * @returns {Finding[]}
   */
  run(repoProfile, graphResult = null) {
    const findings = [];

    for (const rule of this._rules) {
      try {
        const ruleFindings = rule.evaluate(repoProfile, graphResult);
        if (Array.isArray(ruleFindings)) {
          findings.push(...ruleFindings);
        }
      } catch (err) {
        console.warn(`[RuleEngine] Rule '${rule.id}' failed: ${err.message}`);
      }
    }

    // Sort: CRITICAL → HIGH → MEDIUM → LOW
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    findings.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    return findings;
  }
}
