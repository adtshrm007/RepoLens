import { SecurityRule } from './SecurityRule.js';

export class UnsafeDynamicImportRule extends SecurityRule {
  constructor() {
    super(
      'UNSAFE_DYNAMIC_IMPORT',
      'HIGH',
      'Dynamic import with non-literal argument can lead to path traversal or RCE.',
      434 // Unrestricted Upload of File with Dangerous Type / similar to code inclusion
    );
  }

  getRecommendation() {
    return 'Ensure that dynamic imports are restricted to a known set of literal strings, or sanitize the input to prevent arbitrary module loading.';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'import') {
          const args = node.children.find(c => c.type === 'arguments');
          if (args && args.namedChildren?.length > 0) {
            const firstArg = args.namedChildren[0];
            if (firstArg.type !== 'string') {
              findings.push(this.createFinding(filePath, node, lines));
            }
          }
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
