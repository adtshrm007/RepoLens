import { SecurityRule } from './SecurityRule.js';

export class InsecureStorageRule extends SecurityRule {
  constructor() {
    super(
      'LOCALSTORAGE_TOKEN',
      'MEDIUM',
      'Auth tokens should preferably be stored in HttpOnly cookies, not localStorage.',
      312 // CWE-312: Cleartext Storage of Sensitive Information
    );
  }

  getRecommendation() {
    return 'Store authentication tokens in HttpOnly, secure cookies to prevent access via Cross-Site Scripting (XSS).';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'member_expression') {
          const obj = callee.children[0]?.text;
          const prop = callee.children[2]?.text;
          if (obj === 'localStorage' && prop === 'getItem') {
            const args = node.children.find(c => c.type === 'arguments');
            if (args && args.namedChildren?.length > 0) {
              const firstArg = args.namedChildren[0];
              if (firstArg.type === 'string') {
                const argText = firstArg.text.replace(/['"]/g, '');
                if (['token', 'auth_token', 'access_token'].includes(argText)) {
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
