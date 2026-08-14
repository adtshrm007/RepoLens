import { SecurityRule } from './SecurityRule.js';

/**
 * PathTraversalRule — JS-PATH-001
 *
 * Detects filesystem operations where the file path argument is derived from
 * HTTP request data (req.query, req.params, req.body, etc.).
 *
 * ── Attack scenario ─────────────────────────────────────────────────────────
 * An attacker passes `../../etc/passwd` as a query parameter. The server
 * calls fs.readFile(req.query.file) and returns sensitive system files.
 *
 * ── Detection strategy ──────────────────────────────────────────────────────
 * 1. Function-scoped taint tracking: variables assigned from req.* are tainted.
 * 2. When a fs.* / path.join / path.resolve call receives a tainted argument, flag it.
 * 3. Template literals containing req.* sources are also detected directly.
 *
 * ── Confidence ──────────────────────────────────────────────────────────────
 * HIGH:   Template literal with req.* directly in fs call argument.
 * MEDIUM: Variable that may be tainted (we cannot confirm source without full DFA).
 *
 * ── What is NOT flagged ─────────────────────────────────────────────────────
 * fs.readFile("config.json")   — literal, safe
 * fs.readFile(configPath)      — internal variable not tainted from request
 */

const FS_READ_METHODS  = new Set(['readFile', 'readFileSync', 'createReadStream', 'stat', 'access', 'readdir']);
const FS_WRITE_METHODS = new Set(['writeFile', 'writeFileSync', 'appendFile', 'unlink', 'rmdir', 'rename', 'mkdir', 'mkdirSync', 'createWriteStream']);
const FS_METHODS       = new Set([...FS_READ_METHODS, ...FS_WRITE_METHODS]);
const PATH_METHODS     = new Set(['join', 'resolve', 'normalize']);

const REQUEST_SOURCES = ['req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies', 'request.body', 'request.query'];

export class PathTraversalRule extends SecurityRule {
  constructor() {
    super(
      'JS-PATH-001',
      'HIGH',
      'File path derived from HTTP request data — path traversal attack possible.',
      22    // CWE-22: Improper Limitation of a Pathname to a Restricted Directory
    );
  }

  getRecommendation() {
    return (
      'Never use user-supplied input directly as a file path. ' +
      'Use path.basename() to strip directory components from the input, ' +
      'then join it against a safe base directory using path.join(). ' +
      'After joining, verify the resolved path starts with your allowed base: ' +
      '`if (!resolved.startsWith(SAFE_BASE)) throw new Error(\'Forbidden path\')`.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const walk = (node) => {
      // Analyze each function scope independently for taint tracking
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

      // Skip nested functions (they have their own scope)
      if (node !== fnNode &&
          ['function_declaration', 'arrow_function', 'function_expression', 'method_definition'].includes(node.type)) {
        return;
      }

      // Track taint: const path = req.query.file  or  const path = req.params.id
      if (node.type === 'variable_declarator') {
        const idNode  = node.children?.find(c => c.type === 'identifier');
        const initNode = node.children?.find(c => c.type !== 'identifier' && c.text !== '=');
        if (idNode && initNode && this._isTainted(initNode, taintedVars)) {
          taintedVars.add(idNode.text);
        }
      }

      if (node.type === 'assignment_expression') {
        const lhs = node.children?.[0];
        const rhs = node.children?.[2];
        if (lhs?.type === 'identifier') {
          if (this._isTainted(rhs, taintedVars)) {
            taintedVars.add(lhs.text);
          } else {
            taintedVars.delete(lhs.text);  // overwritten with safe value
          }
        }
      }

      // Detect fs.method(taintedArg) or path.join(taintedArg)
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'member_expression') {
          const obj    = callee.children?.[0]?.text;
          const method = callee.children?.[callee.children.length - 1]?.text;

          const isFsCall   = (obj === 'fs' || obj === 'promises') && FS_METHODS.has(method);
          const isPathCall = obj === 'path' && PATH_METHODS.has(method);

          if (isFsCall || isPathCall) {
            const args = node.children?.find(c => c.type === 'arguments');
            if (args) {
              for (const arg of args.namedChildren ?? []) {
                if (this._isTainted(arg, taintedVars)) {
                  const isWrite = FS_WRITE_METHODS.has(method);
                  findings.push(this.createFinding(
                    filePath, node, lines,
                    `${obj}.${method}() receives a path that may originate from HTTP request data. ` +
                    `${isWrite ? 'Arbitrary write path can lead to file overwrite or directory traversal.' : 'Arbitrary read path can expose sensitive files.'}`,
                    {
                      severity:   isWrite ? 'HIGH' : 'HIGH',
                      confidence: arg.type === 'template_string' ? 'HIGH' : 'MEDIUM',
                    }
                  ));
                  break;  // one finding per call site
                }
              }
            }
          }
        }
      }

      for (const child of node.namedChildren ?? []) walkScope(child);
    };

    walkScope(fnNode);
  }

  /**
   * Returns true if the node text appears to carry tainted data from
   * HTTP request sources or from a previously tainted variable.
   */
  _isTainted(node, taintedVars) {
    if (!node) return false;
    const text = node.text || '';

    // Direct req.* reference
    if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;

    // Template literal containing req.*
    if (node.type === 'template_string') {
      return REQUEST_SOURCES.some(src => text.includes(src));
    }

    // Identifier that was previously assigned from request
    if (node.type === 'identifier' && taintedVars.has(text)) return true;

    // Member expression where the object is tainted
    if (node.type === 'member_expression') {
      const obj = node.children?.[0]?.text;
      if (obj && taintedVars.has(obj)) return true;
      if (REQUEST_SOURCES.some(src => text.startsWith(src))) return true;
    }

    return false;
  }
}
