import { SecurityRule } from './SecurityRule.js';

export class WeakCryptoRule extends SecurityRule {
  constructor() {
    super(
      'WEAK_CRYPTO',
      'HIGH',
      'Usage of weak cryptographic algorithms (md5/sha1) is strongly discouraged.',
      328 // CWE-328: Reversible One-Way Hash
    );
  }

  getRecommendation() {
    return 'Use a strong cryptographic algorithm like SHA-256 or SHA-3 instead. For passwords, use bcrypt or Argon2.';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'member_expression') {
          const prop = callee.children[2]?.text;
          if (prop === 'createHash') {
            const args = node.children.find(c => c.type === 'arguments');
            if (args && args.namedChildren?.length > 0) {
              const firstArg = args.namedChildren[0];
              if (firstArg.type === 'string') {
                const alg = firstArg.text.replace(/['"]/g, '').toLowerCase();
                if (['md5', 'sha1'].includes(alg)) {
                  findings.push(this.createFinding(filePath, node, lines));
                }
              }
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
