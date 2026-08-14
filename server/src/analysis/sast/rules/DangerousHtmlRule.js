import { SecurityRule } from './SecurityRule.js';

export class DangerousHtmlRule extends SecurityRule {
  constructor() {
    super(
      'DANGEROUSLY_SET_INNER_HTML',
      'HIGH',
      'dangerouslySetInnerHTML can lead to XSS vulnerabilities if data is not properly sanitized.',
      79 // CWE-79: Cross-site Scripting (XSS)
    );
  }

  getRecommendation() {
    return 'Ensure that any data passed to dangerouslySetInnerHTML is rigorously sanitized using a library like DOMPurify.';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (node.type === 'jsx_attribute') {
        const nameNode = node.children?.[0];
        if (nameNode?.type === 'property_identifier' && nameNode.text === 'dangerouslySetInnerHTML') {
          findings.push(this.createFinding(filePath, node, lines));
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
