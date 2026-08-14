import { SecurityRule } from './SecurityRule.js';

/**
 * DangerousHtmlRule — JS-XSS-001
 *
 * Detects React's dangerouslySetInnerHTML prop.
 *
 * ── Severity rationale ──────────────────────────────────────────────────────
 * The severity depends on whether the HTML content is static or dynamic:
 *
 *   HIGH:   `__html: someVariable` or `__html: fn()` — dynamic content.
 *           The value may contain attacker-controlled HTML, enabling XSS.
 *
 *   MEDIUM: `__html: "literal string"` — static content.
 *           Cannot execute attacker content, but still bypasses React's
 *           sanitization and may introduce DOM manipulation issues.
 *           Also flags usage for manual review.
 *
 * ── False-positive avoidance ────────────────────────────────────────────────
 * Every use of dangerouslySetInnerHTML is flagged, but severity is informed
 * by whether the value is provably static or dynamic.
 */
export class DangerousHtmlRule extends SecurityRule {
  constructor() {
    super(
      'JS-XSS-001',
      'HIGH',   // default; overridden per-finding
      'dangerouslySetInnerHTML bypasses React\'s XSS protections.',
      79        // CWE-79: Cross-site Scripting (XSS)
    );
  }

  getRecommendation() {
    return (
      'Sanitize all HTML with DOMPurify before passing to dangerouslySetInnerHTML: ' +
      '__html: DOMPurify.sanitize(userContent). ' +
      'If the content is static and controlled by you, consider converting it to ' +
      'React elements instead of raw HTML to eliminate the risk entirely.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const walk = (node) => {
      if (node.type === 'jsx_attribute') {
        const nameNode = node.children?.[0];
        if (
          nameNode?.type === 'property_identifier' &&
          nameNode.text === 'dangerouslySetInnerHTML'
        ) {
          const isDynamic = this._valueIsDynamic(node);

          findings.push(this.createFinding(
            filePath, node, lines,
            isDynamic
              ? 'dangerouslySetInnerHTML receives dynamic content. If this value includes user-supplied data, XSS is possible.'
              : 'dangerouslySetInnerHTML used with static content. While not directly exploitable, this bypasses React\'s sanitization layer.',
            {
              severity:   isDynamic ? 'HIGH' : 'MEDIUM',
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

  // ── Private ─────────────────────────────────────────────────────────────────

  /**
   * Determine if the JSX attribute's value is dynamic (expression/variable)
   * vs. static (object with literal string __html).
   * Returns true if dynamic (higher risk).
   */
  _valueIsDynamic(attrNode) {
    // dangerouslySetInnerHTML={{ __html: value }}
    // The attribute value is a jsx_expression containing an object_expression
    const expr = attrNode.children?.find(c => c.type === 'jsx_expression');
    if (!expr) return true; // unknown, assume dynamic (safer)

    const objExpr = expr.namedChildren?.find(c => c.type === 'object');
    if (!objExpr) return true;

    // Find the __html pair
    for (const pair of objExpr.namedChildren ?? []) {
      if (pair.type !== 'pair') continue;
      const key = pair.children?.[0];
      const val = pair.children?.[2];
      if (key?.text === '__html') {
        // Static if value is a string literal
        return val?.type !== 'string';
      }
    }

    return true; // default to dynamic
  }
}
