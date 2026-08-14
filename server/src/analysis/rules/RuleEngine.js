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
 * Finding shape (unified):
 * {
 *   ruleId:         string
 *   severity:       see SEVERITY_ORDER below — scoped per category
 *   category:       'SECURITY' | 'DEPENDENCY' | 'COMPLEXITY' | 'CODE_QUALITY' | 'ARCHITECTURE'
 *   confidence:     'HIGH' | 'MEDIUM' | 'LOW'
 *   file:           string
 *   startLine:      number
 *   endLine:        number
 *   line:           number   — alias for startLine (DB compat)
 *   symbol:         string | null
 *   message:        string
 *   explanation:    string
 *   evidence:       string | null
 *   metrics:        object | null
 *   recommendation: string
 * }
 *
 * Severity by category:
 *   SECURITY / DEPENDENCY:   CRITICAL | HIGH | MEDIUM | LOW
 *   COMPLEXITY:               VERY_HIGH | HIGH | MODERATE | LOW
 *   CODE_QUALITY:             HIGH | MEDIUM | LOW
 *   ARCHITECTURE:             HIGH | MEDIUM | LOW
 */

import { HighComplexityRule }       from './rules/HighComplexityRule.js';
import { DeepNestingRule }          from './rules/DeepNestingRule.js';
import { LongFunctionRule }         from './rules/LongFunctionRule.js';
import { CircularDependencyRule }   from './rules/CircularDependencyRule.js';
import { HighFanOutRule }           from './rules/HighFanOutRule.js';

// Global severity ordering (highest severity = lowest number)
const SEVERITY_ORDER = {
  CRITICAL:  0,
  VERY_HIGH: 1,
  HIGH:      2,
  MEDIUM:    3,
  MODERATE:  4,
  LOW:       5,
};

// Category ordering for display
const CATEGORY_ORDER = {
  SECURITY:     0,
  DEPENDENCY:   1,
  COMPLEXITY:   2,
  CODE_QUALITY: 3,
  ARCHITECTURE: 4,
};

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
   * Run all rules, deduplicate, and return findings sorted by category then severity.
   *
   * Deduplication key: ruleId + file + startLine + symbol
   * This prevents repeated findings for the same location if the same rule
   * is somehow triggered multiple times (e.g., across nested function traversal).
   *
   * @param {CSTRepoProfile} repoProfile
   * @param {DependencyGraph | null} graphResult
   * @returns {Finding[]}
   */
  run(repoProfile, graphResult = null) {
    const allFindings = [];

    for (const rule of this._rules) {
      try {
        const ruleFindings = rule.evaluate(repoProfile, graphResult);
        if (Array.isArray(ruleFindings)) {
          allFindings.push(...ruleFindings);
        }
      } catch (err) {
        console.warn(`[RuleEngine] Rule '${rule.id}' failed: ${err.message}`);
      }
    }

    // ── Deduplicate by (ruleId, file, startLine, symbol) ─────────────────────
    const seen = new Set();
    const deduplicated = [];
    for (const f of allFindings) {
      const key = `${f.ruleId}::${f.file}::${f.startLine ?? f.line}::${f.symbol ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(f);
      }
    }

    // ── Sort: category first, then severity within category ───────────────────
    deduplicated.sort((a, b) => {
      const catDiff = (CATEGORY_ORDER[a.category] ?? 99) - (CATEGORY_ORDER[b.category] ?? 99);
      if (catDiff !== 0) return catDiff;
      return (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
    });

    return deduplicated;
  }
}
