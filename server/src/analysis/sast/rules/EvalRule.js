import { SecurityRule } from './SecurityRule.js';

/**
 * EvalRule — JS-EVAL-001
 *
 * Detects dynamic code execution via eval() and new Function().
 *
 * ── Severity rationale ──────────────────────────────────────────────────────
 * CRITICAL: eval(variable) or eval(templateLiteral) — arbitrary code execution
 *           if the variable originates from untrusted input.
 * HIGH:     eval("literalString") — still bad practice (disables optimizations,
 *           prevents minification) but cannot execute arbitrary user input.
 * CRITICAL: new Function(variable) — same as eval(variable)
 * HIGH:     new Function("literal") — same as eval("literal")
 *
 * ── False-positive avoidance ────────────────────────────────────────────────
 * Argument type is inspected before assigning severity.
 * A static string literal cannot execute attacker-controlled code.
 */
export class EvalRule extends SecurityRule {
  constructor() {
    super(
      'JS-EVAL-001',
      'CRITICAL',   // default; overridden per-finding below
      'Dynamic code execution detected.',
      94            // CWE-94: Code Injection
    );
  }

  getRecommendation() {
    return (
      'Avoid eval() and new Function(). If parsing JSON, use JSON.parse(). ' +
      'If evaluating user-provided expressions, use a sandboxed interpreter ' +
      '(e.g., vm2, isolated-vm) rather than direct code execution.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const walk = (node) => {
      // 1. eval(...)
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'identifier' && callee.text === 'eval') {
          const arg = node.children?.find(c => c.type === 'arguments')?.namedChildren?.[0];
          const isLiteral = arg?.type === 'string';

          findings.push(this.createFinding(
            filePath, node, lines,
            isLiteral
              ? 'eval() called with a string literal. Remove eval() — use direct code instead.'
              : 'eval() called with a dynamic expression. This enables arbitrary code execution if the argument is attacker-controlled.',
            {
              severity:   isLiteral ? 'HIGH' : 'CRITICAL',
              confidence: isLiteral ? 'HIGH' : 'HIGH',
            }
          ));
        }
      }

      // 2. new Function(...)
      if (node.type === 'new_expression') {
        // tree-sitter: 'new' keyword is child[0], class is child[1]
        const callee = node.children?.[1];
        if (callee?.type === 'identifier' && callee.text === 'Function') {
          const arg = node.children?.find(c => c.type === 'arguments')?.namedChildren?.[0];
          const isLiteral = arg?.type === 'string';

          findings.push(this.createFinding(
            filePath, node, lines,
            isLiteral
              ? 'new Function() called with a string literal. Equivalent to eval() — remove it.'
              : 'new Function() called with a dynamic expression. This is equivalent to eval() and enables code injection.',
            {
              severity:   isLiteral ? 'HIGH' : 'CRITICAL',
              confidence: 'HIGH',
            }
          ));
        }
      }

      for (const child of node.namedChildren ?? []) {
        walk(child);
      }
    };

    walk(rootNode);
    return findings;
  }
}
