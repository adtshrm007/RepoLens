import { SecurityRule } from './SecurityRule.js';

export class EvalRule extends SecurityRule {
  constructor() {
    super(
      'EVAL_USAGE',
      'CRITICAL',
      'Usage of eval() or new Function() is highly discouraged due to security risks.',
      94 // CWE-94: Improper Control of Generation of Code ('Code Injection')
    );
  }

  getRecommendation() {
    return 'Avoid using eval() or new Function(). If parsing JSON, use JSON.parse(). If evaluating expressions, use a safer alternative or re-architect the logic to avoid dynamic code execution.';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      // 1. eval()
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'identifier' && callee.text === 'eval') {
          findings.push(this.createFinding(filePath, node, lines));
        }
      }

      // 2. new Function()
      if (node.type === 'new_expression') {
        const callee = node.children?.[1]; // 'new' is child 0, callee is child 1
        if (callee?.type === 'identifier' && callee.text === 'Function') {
          findings.push(this.createFinding(filePath, node, lines, 'Usage of new Function() is akin to eval() and poses security risks.'));
        }
      }

      for (const child of node.namedChildren ?? []) {
        walk(child);
      }
    };

    if (rootNode) walk(rootNode);
    return findings;
  }
}
