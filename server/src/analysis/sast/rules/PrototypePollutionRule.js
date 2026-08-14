import { SecurityRule } from './SecurityRule.js';

/**
 * PrototypePollutionRule — JS-PROTO-001
 *
 * Detects patterns where user-supplied objects are merged into application
 * objects in ways that can pollute Object.prototype.
 *
 * ── Attack scenario ─────────────────────────────────────────────────────────
 * An attacker sends:
 *   POST /api { "__proto__": { "admin": true } }
 *
 * A vulnerable merge:
 *   Object.assign(config, req.body)       → pollutes prototype
 *   merge(app, req.body)                  → pollutes prototype via deep merge
 *   lodash.merge(defaults, req.body)      → same risk
 *
 * This causes all subsequently created objects to have `admin: true`.
 *
 * ── Detection strategy ──────────────────────────────────────────────────────
 * Detect:
 *   1. Object.assign(target, reqSource)
 *   2. Object.assign({}, reqSource, ...) — even spread-style
 *   3. Known merge-function calls (merge, deepMerge, extend, _.merge, lodash.merge)
 *      where one argument is a request source.
 *   4. Variable assignments from req.body passed to the above.
 *
 * ── What is NOT flagged ─────────────────────────────────────────────────────
 *   Object.assign({}, config, defaults)     — no user input
 *   Object.assign(target, { key: 'value' }) — literal object, safe
 *
 * ── Confidence ──────────────────────────────────────────────────────────────
 * HIGH:   req.* directly passed to merge function
 * MEDIUM: Variable that was assigned from req.* passed to merge function
 */

const MERGE_FUNCTIONS = new Set([
  'merge', 'deepMerge', 'deepmerge', 'extend', 'mixin', 'defaults', 'assign',
]);

const REQUEST_SOURCES = [
  'req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies',
  'request.body', 'request.query',
];

export class PrototypePollutionRule extends SecurityRule {
  constructor() {
    super(
      'JS-PROTO-001',
      'HIGH',
      'Unsanitized user data merged into an object may pollute Object.prototype.',
      1321  // CWE-1321: Improperly Controlled Modification of Object Prototype Attributes ('Prototype Pollution')
    );
  }

  getRecommendation() {
    return (
      'Never merge user-supplied objects directly. ' +
      'Freeze the target prototype: Object.freeze(Object.prototype). ' +
      'Or use a safe merge that filters __proto__, constructor, and prototype keys. ' +
      'Better: restructure inputs so you only accept the specific fields you need ' +
      'rather than spreading or merging an entire user object.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const walk = (node) => {
      if (['function_declaration', 'arrow_function', 'function_expression', 'method_definition'].includes(node.type)) {
        this._analyzeScope(node, filePath, lines, findings);
      }
      for (const child of node.namedChildren ?? []) walk(child);
    };

    walk(rootNode);
    return findings;
  }

  _analyzeScope(fnNode, filePath, lines, findings) {
    const taintedVars = new Set();

    const walkScope = (node) => {
      if (!node) return;

      if (node !== fnNode &&
          ['function_declaration', 'arrow_function', 'function_expression', 'method_definition'].includes(node.type)) {
        return;
      }

      // Track taint assignments
      if (node.type === 'variable_declarator') {
        const idNode  = node.children?.find(c => c.type === 'identifier');
        const initNode = node.children?.find(c => c.type !== 'identifier' && c.text !== '=');
        if (idNode && initNode && this._isTainted(initNode, taintedVars)) {
          taintedVars.add(idNode.text);
        }
      }

      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        const args   = node.children?.find(c => c.type === 'arguments');
        if (!args) {
          for (const child of node.namedChildren ?? []) walkScope(child);
          return;
        }

        // Object.assign(target, source)
        if (callee?.type === 'member_expression') {
          const obj    = callee.children?.[0]?.text;
          const method = callee.children?.[callee.children.length - 1]?.text;

          if (obj === 'Object' && method === 'assign') {
            // Check if any argument (other than the first target) is tainted
            const mergeArgs = (args.namedChildren ?? []).slice(1);
            if (mergeArgs.some(a => this._isTainted(a, taintedVars))) {
              findings.push(this.createFinding(
                filePath, node, lines,
                'Object.assign() receives user-supplied data as a source object. ' +
                'If the input contains __proto__ or constructor keys, Object.prototype will be polluted.',
                {
                  severity:   'HIGH',
                  confidence: mergeArgs.some(a => REQUEST_SOURCES.some(s => a.text?.startsWith(s))) ? 'HIGH' : 'MEDIUM',
                }
              ));
            }
          }

          // Known merge libraries: _.merge(), lodash.merge(), etc.
          if (MERGE_FUNCTIONS.has(method)) {
            const allArgs = args.namedChildren ?? [];
            if (allArgs.some(a => this._isTainted(a, taintedVars))) {
              findings.push(this.createFinding(
                filePath, node, lines,
                `${method}() receives user-supplied data. Deep merge functions are a common vector for prototype pollution.`,
                { severity: 'HIGH', confidence: 'MEDIUM' }
              ));
            }
          }
        }

        // Standalone merge(target, userInput)
        if (callee?.type === 'identifier' && MERGE_FUNCTIONS.has(callee.text)) {
          const allArgs = args.namedChildren ?? [];
          if (allArgs.some(a => this._isTainted(a, taintedVars))) {
            findings.push(this.createFinding(
              filePath, node, lines,
              `${callee.text}() receives user-supplied data. This may lead to prototype pollution if the function performs deep property assignment.`,
              { severity: 'HIGH', confidence: 'MEDIUM' }
            ));
          }
        }
      }

      for (const child of node.namedChildren ?? []) walkScope(child);
    };

    walkScope(fnNode);
  }

  _isTainted(node, taintedVars) {
    if (!node) return false;
    const text = node.text || '';

    if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;
    if (node.type === 'identifier' && taintedVars.has(text)) return true;
    if (node.type === 'member_expression') {
      const obj = node.children?.[0]?.text;
      if (obj && taintedVars.has(obj)) return true;
      if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;
    }
    return false;
  }
}
