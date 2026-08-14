import { SecurityRule } from './SecurityRule.js';

/**
 * SqlInjectionRule — JS-SQLI-001
 *
 * Detects SQL injection patterns in Node.js ORMs and raw query APIs.
 *
 * ── Detection strategy ──────────────────────────────────────────────────────
 * SQL injection via template literals is the most common Node.js pattern:
 *
 *   db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)
 *
 * This rule detects:
 *   1. .query() / .raw() / .execute() / .$queryRaw() called with a
 *      template literal containing HTTP request data.
 *   2. Taint-tracked variables assigned from req.* passed to query methods.
 *
 * ── What is NOT flagged ─────────────────────────────────────────────────────
 *   db.query("SELECT * FROM users WHERE id = ?", [req.params.id])
 *     — parameterized query, safe
 *   prisma.user.findMany({ where: { id: req.params.id } })
 *     — ORM with structured query, safe
 *   db.query("SELECT 1")
 *     — literal string, safe
 *
 * ── Confidence ──────────────────────────────────────────────────────────────
 * HIGH:   Template literal with `${req.*}` directly in argument.
 * MEDIUM: Variable that may carry request data passed to query method.
 */

const SQL_QUERY_METHODS = new Set([
  'query', 'raw', 'execute', '$queryRaw', '$executeRaw', 'all', 'run',
]);

const REQUEST_SOURCES = [
  'req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies',
  'request.body', 'request.query', 'request.params',
];

export class SqlInjectionRule extends SecurityRule {
  constructor() {
    super(
      'JS-SQLI-001',
      'CRITICAL',
      'SQL query constructed with dynamic input — SQL injection possible.',
      89    // CWE-89: SQL Injection
    );
  }

  getRecommendation() {
    return (
      'Use parameterized queries or prepared statements instead of string concatenation. ' +
      'For raw SQL: db.query("SELECT * FROM users WHERE id = ?", [userId]). ' +
      'For ORMs like Prisma: use the structured query API (findMany, findUnique) which ' +
      'automatically parameterizes values. Never interpolate user data into SQL strings.'
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

      // Skip nested function scopes
      if (node !== fnNode &&
          ['function_declaration', 'arrow_function', 'function_expression', 'method_definition'].includes(node.type)) {
        return;
      }

      // Track variable taint
      if (node.type === 'variable_declarator') {
        const idNode  = node.children?.find(c => c.type === 'identifier');
        const initNode = node.children?.find(c => c.type !== 'identifier' && c.text !== '=');
        if (idNode && initNode && this._isTainted(initNode, taintedVars)) {
          taintedVars.add(idNode.text);
        }
      }

      // Detect sql-query call with tainted argument
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        const method = this._extractMethodName(callee);

        if (method && SQL_QUERY_METHODS.has(method)) {
          const args     = node.children?.find(c => c.type === 'arguments');
          const firstArg = args?.namedChildren?.[0];

          if (!firstArg) {
            for (const child of node.namedChildren ?? []) walkScope(child);
            return;
          }

          // Static string literal — parameterized query, safe
          if (firstArg.type === 'string') {
            for (const child of node.namedChildren ?? []) walkScope(child);
            return;
          }

          if (this._isTainted(firstArg, taintedVars)) {
            const isTemplate = firstArg.type === 'template_string';
            findings.push(this.createFinding(
              filePath, node, lines,
              `${method}() receives a ${isTemplate ? 'template literal' : 'dynamic expression'} ` +
              `containing HTTP request data. SQL injection is possible.`,
              {
                severity:   'CRITICAL',
                confidence: isTemplate ? 'HIGH' : 'MEDIUM',
              }
            ));
          }
        }
      }

      for (const child of node.namedChildren ?? []) walkScope(child);
    };

    walkScope(fnNode);
  }

  _extractMethodName(callee) {
    if (!callee) return null;
    if (callee.type === 'identifier') return callee.text;
    if (callee.type === 'member_expression') {
      const children = callee.children ?? [];
      return children[children.length - 1]?.text || null;
    }
    return null;
  }

  _isTainted(node, taintedVars) {
    if (!node) return false;
    const text = node.text || '';

    if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;

    if (node.type === 'template_string') {
      return REQUEST_SOURCES.some(src => text.includes(src));
    }

    if (node.type === 'identifier' && taintedVars.has(text)) return true;

    if (node.type === 'member_expression') {
      const obj = node.children?.[0]?.text;
      if (obj && taintedVars.has(obj)) return true;
      if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;
    }

    // Binary concatenation: "SELECT " + userInput
    if (node.type === 'binary_expression') {
      return (node.namedChildren ?? []).some(c => this._isTainted(c, taintedVars));
    }

    return false;
  }
}
