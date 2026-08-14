/**
 * ComplexityAnalyzer
 *
 * Computes cyclomatic and cognitive complexity from tree-sitter CST nodes.
 * Both metrics are computed per-function and should be called from CSTDataExtractor.
 *
 * ── Cyclomatic Complexity ────────────────────────────────────────────────────
 * Definition: McCabe (1976)
 * Start at 1. Add +1 for each decision point:
 *   if, else-if, for, for-in, for-of, while, do-while,
 *   each switch case (not default), catch, ternary (?:),
 *   logical operators && || ?? in a binary_expression.
 *
 * Risk levels:
 *   1–5   LOW
 *   6–10  MEDIUM
 *   11–15 HIGH
 *   16+   CRITICAL
 *
 * ── Cognitive Complexity ─────────────────────────────────────────────────────
 * Definition: Inspired by SonarSource cognitive complexity.
 * Structural nesting adds more penalty than linear flow:
 *   Each nesting-increment node at depth D adds (D + 1).
 *   else/else-if/catch/finally add flat +1 (no nesting bonus).
 *   Boolean operator sequences add +1 per change.
 *   Nested functions do NOT inherit outer nesting (treated independently).
 */

const FUNCTION_NODE_TYPES = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
]);

const CYCLOMATIC_BRANCH_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'for_of_statement',
  'while_statement',
  'do_statement',
  'switch_case',
  'catch_clause',
  'ternary_expression',
]);

const COGNITIVE_NESTING_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'for_of_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'try_statement',
]);

const LOGICAL_OPERATORS = new Set(['&&', '||', '??']);

export class ComplexityAnalyzer {
  // ── Cyclomatic ─────────────────────────────────────────────────────────────

  /**
   * Compute cyclomatic complexity for a single function node.
   * @param {object} fnNode - tree-sitter node of function type
   * @returns {{ complexity: number, decisionPoints: Array<{type: string, line: number, column: number}> }}
   */
  computeCyclomatic(fnNode) {
    let complexity = 1; // base: one path always exists
    const decisionPoints = [];

    this._walkSkipNestedFns(fnNode, (node) => {
      let isBranch = false;
      if (CYCLOMATIC_BRANCH_TYPES.has(node.type)) {
        isBranch = true;
      } else if (node.type === 'binary_expression') {
        const op = node.children.find(c => LOGICAL_OPERATORS.has(c.type));
        if (op) isBranch = true;
      }

      if (isBranch) {
        complexity++;
        decisionPoints.push({
          type: node.type,
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
        });
      }
    });

    return { complexity, decisionPoints };
  }

  // ── Cognitive ──────────────────────────────────────────────────────────────

  /**
   * Compute cognitive complexity for a single function node.
   * @param {object} fnNode - tree-sitter node of function type
   * @returns {{ score: number, breakdown: Array<{type: string, line: number, column: number, increment: number, nestingBonus: number}> }}
   */
  computeCognitive(fnNode) {
    let score = 0;
    const breakdown = [];

    const walk = (node, depth, isRoot) => {
      // Don't enter nested function bodies — each has its own complexity
      if (!isRoot && FUNCTION_NODE_TYPES.has(node.type)) return;

      if (node.type === 'if_statement') {
        const isElseIf = node.parent && node.parent.type === 'else_clause';
        if (isElseIf) {
          // else if: +1 flat, no nesting penalty
          score += 1;
          breakdown.push({
            type: 'else_if',
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            increment: 1,
            nestingBonus: 0
          });
        } else {
          // normal if: +1 + depth
          const increment = 1 + depth;
          score += increment;
          if (!isRoot) {
            breakdown.push({
              type: 'if_statement',
              line: node.startPosition.row + 1,
              column: node.startPosition.column,
              increment,
              nestingBonus: depth
            });
          }
        }

        // Walk children
        for (const child of node.children ?? []) {
          if (child.type === 'else_clause') {
            walk(child, depth, false); // Pass current depth to else_clause
          } else {
            walk(child, depth + 1, false); // Body of if is +1 depth
          }
        }
        return;
      }

      if (node.type === 'else_clause') {
        const hasIf = node.children.some(c => c.type === 'if_statement');
        if (!hasIf) {
          // pure else: +1 flat
          score += 1;
          breakdown.push({
            type: 'else_clause',
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            increment: 1,
            nestingBonus: 0
          });
        }
        // Body of else: if it's an else-if, the if_statement stays at same depth.
        // Otherwise, the body block is nested at +1 depth.
        for (const child of node.children ?? []) {
          if (child.type === 'if_statement') {
            walk(child, depth, false);
          } else {
            walk(child, depth + 1, false);
          }
        }
        return;
      }

      if (COGNITIVE_NESTING_TYPES.has(node.type) && node.type !== 'if_statement') {
        // Structural element: +1 for presence, +depth for nesting
        const increment = 1 + depth;
        score += increment;
        if (!isRoot) {
          breakdown.push({
            type: node.type,
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            increment,
            nestingBonus: depth
          });
        }

        for (const child of node.children ?? []) {
          walk(child, depth + 1, false);
        }
        return;
      }

      // catch: flat +1
      if (node.type === 'catch_clause') {
        score += 1;
        breakdown.push({
          type: 'catch_clause',
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          increment: 1,
          nestingBonus: 0
        });
        for (const child of node.children ?? []) {
          walk(child, depth + 1, false);
        }
        return;
      }

      // Ternary: +1 + depth
      if (node.type === 'ternary_expression') {
        const increment = 1 + depth;
        score += increment;
        breakdown.push({
          type: 'ternary_expression',
          line: node.startPosition.row + 1,
          column: node.startPosition.column,
          increment,
          nestingBonus: depth
        });
        for (const child of node.children ?? []) {
          walk(child, depth + 1, false);
        }
        return;
      }

      // Logical operators: +1 per sequence (not per individual operator)
      if (node.type === 'binary_expression') {
        const op = node.children.find(c => LOGICAL_OPERATORS.has(c.type));
        if (op) {
          score += 1;
          breakdown.push({
            type: 'logical_operator',
            line: node.startPosition.row + 1,
            column: node.startPosition.column,
            increment: 1,
            nestingBonus: 0
          });
        }
      }

      // Continue walking
      for (const child of node.children ?? []) {
        walk(child, depth, false);
      }
    };

    walk(fnNode, 0, true);
    return { score, breakdown };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Walk a function node's subtree, skipping the bodies of nested functions.
   * @param {object} rootNode
   * @param {function} callback - called with each (non-root) node
   */
  _walkSkipNestedFns(rootNode, callback) {
    const walk = (node, isRoot) => {
      if (!isRoot && FUNCTION_NODE_TYPES.has(node.type)) return; // skip nested fn

      if (!isRoot) callback(node);

      for (const child of node.children ?? []) {
        walk(child, false);
      }
    };
    walk(rootNode, true);
  }
}
