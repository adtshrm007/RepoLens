import { SecurityRule } from './SecurityRule.js';

/**
 * InsecureRandomRule — JS-RAND-001
 *
 * Detects Math.random() used in security-sensitive contexts.
 *
 * ── Why Math.random() is insecure for security use ──────────────────────────
 * Math.random() is a pseudorandom number generator (PRNG) seeded from a
 * deterministic source. It is NOT cryptographically secure:
 *   - Its output can be predicted if the seed is known.
 *   - V8's implementation has been shown to be predictable in practice.
 *
 * ── Detection strategy ──────────────────────────────────────────────────────
 * Math.random() in general code is fine (animations, shuffle, sampling).
 * We flag ONLY when the result is assigned to a variable whose name suggests
 * security-sensitive usage:
 *
 *   const token    = Math.random()  → MEDIUM (token is a security concept)
 *   const password = Math.random()  → MEDIUM
 *   const salt     = Math.random()  → MEDIUM
 *   const nonce    = Math.random()  → MEDIUM
 *   const sessionId = Math.random() → MEDIUM
 *
 *   const progress = Math.random()  → NOT flagged (not a security context)
 *   const x        = Math.random()  → NOT flagged
 *
 * ── Confidence ──────────────────────────────────────────────────────────────
 * MEDIUM: Variable name matching is a heuristic, not proof of security use.
 *         The analyst should confirm whether the value is used in a security context.
 */

// Variable name patterns that suggest security-sensitive use
const SECURITY_NAME_PATTERN = /\b(token|password|passwd|secret|apikey|api_key|authkey|auth_key|salt|nonce|session|csrf|sessionid|session_id|otp|pin|hmac|iv|key|rand_key|randkey)\b/i;

export class InsecureRandomRule extends SecurityRule {
  constructor() {
    super(
      'JS-RAND-001',
      'MEDIUM',
      'Math.random() used in a security-sensitive context. Use crypto.randomBytes() instead.',
      338   // CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator (PRNG)
    );
  }

  getRecommendation() {
    return (
      'Replace Math.random() with the Node.js built-in cryptographic PRNG: ' +
      '`const token = crypto.randomBytes(32).toString("hex")` for tokens/keys, or ' +
      '`crypto.randomInt(min, max)` for secure integer generation. ' +
      'These functions use OS-level entropy sources that cannot be predicted by attackers.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const walk = (node) => {
      // Pattern: const <sensitiveVar> = ... Math.random() ...
      //          let <sensitiveVar> = ... Math.random() ...
      if (node.type === 'variable_declarator') {
        const idNode   = node.children?.find(c => c.type === 'identifier');
        const initNode = node.children?.find(c => c.type !== 'identifier' && c.text !== '=');

        if (idNode && initNode && SECURITY_NAME_PATTERN.test(idNode.text)) {
          if (this._containsMathRandom(initNode)) {
            findings.push(this.createFinding(
              filePath, initNode, lines,
              `Math.random() assigned to '${idNode.text}'. ` +
              `Math.random() is a non-cryptographic PRNG and must not be used for security tokens, salts, or session IDs.`,
              { severity: 'MEDIUM', confidence: 'MEDIUM' }
            ));
          }
        }
      }

      // Pattern: assignment_expression  <sensitiveVar> = Math.random()
      if (node.type === 'assignment_expression') {
        const lhs = node.children?.[0];
        const rhs = node.children?.[2];

        const varName = lhs?.type === 'identifier' ? lhs.text
          : lhs?.type === 'member_expression' ? lhs.children?.[lhs.children.length - 1]?.text || ''
          : '';

        if (varName && SECURITY_NAME_PATTERN.test(varName) && this._containsMathRandom(rhs)) {
          findings.push(this.createFinding(
            filePath, node, lines,
            `Math.random() assigned to '${varName}'. ` +
            `Math.random() is not cryptographically secure and must not be used for security-sensitive values.`,
            { severity: 'MEDIUM', confidence: 'MEDIUM' }
          ));
        }
      }

      for (const child of node.namedChildren ?? []) walk(child);
    };

    walk(rootNode);
    return findings;
  }

  /**
   * Returns true if the given node contains a Math.random() call.
   */
  _containsMathRandom(node) {
    if (!node) return false;

    if (
      node.type === 'call_expression' &&
      node.children?.[0]?.type === 'member_expression'
    ) {
      const memberExpr = node.children[0];
      const obj        = memberExpr.children?.[0]?.text;
      const method     = memberExpr.children?.[memberExpr.children.length - 1]?.text;
      if (obj === 'Math' && method === 'random') return true;
    }

    return (node.namedChildren ?? []).some(c => this._containsMathRandom(c));
  }
}
