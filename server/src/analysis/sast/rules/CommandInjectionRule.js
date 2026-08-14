import { SecurityRule } from './SecurityRule.js';

/**
 * CommandInjectionRule — JS-CMD-001
 *
 * Detects OS command execution (child_process) where the command argument
 * is not a static string literal, indicating potential injection risk.
 *
 * ── Severity and confidence rationale ──────────────────────────────────────
 * The risk level depends on whether the argument is:
 *
 *   CRITICAL / HIGH:
 *     Template literal containing ${req.*} or ${params} — clear taint from HTTP input.
 *     This is a confirmed injection pathway.
 *
 *   HIGH / MEDIUM:
 *     A plain variable identifier — may or may not be user-controlled.
 *     Flagged but with MEDIUM confidence since we cannot prove the source.
 *
 *   MEDIUM / MEDIUM:
 *     A template literal without obvious request-data references —
 *     dynamic but not provably tainted. Worth a human review.
 *
 * ── What is NOT flagged ────────────────────────────────────────────────────
 *   exec("ls -la")            — literal, safe
 *   execFile("node", [...])   — uses execFile which avoids shell interpretation
 *
 * ── Detected functions ────────────────────────────────────────────────────
 *   exec, execSync            — shell interpretation, highest risk
 *   spawn, spawnSync          — lower risk (no shell by default), but still flagged
 *                               when arg is clearly tainted
 */

// HTTP request source indicators in template literals
const REQUEST_SOURCES = ['req.body', 'req.query', 'req.params', 'req.headers', 'req.cookies', 'request.body', 'request.query'];

export class CommandInjectionRule extends SecurityRule {
  constructor() {
    super(
      'JS-CMD-001',
      'HIGH',    // default; overridden per-finding
      'OS command execution with a non-literal argument may allow command injection.',
      78         // CWE-78: OS Command Injection
    );
  }

  getRecommendation() {
    return (
      'Do not pass user-controlled data to shell commands. ' +
      'Use child_process.execFile() with an arguments array instead of exec() — ' +
      'execFile() does not invoke a shell, preventing injection. ' +
      'If user input must influence the command, validate it against a strict allowlist.'
    );
  }

  evaluate(rootNode, content, filePath, lines) {
    if (!rootNode) return [];
    const findings = [];

    const EXEC_SHELL_FNS    = new Set(['exec', 'execSync']);
    const SPAWN_FNS         = new Set(['spawn', 'spawnSync']);
    const ALL_CMD_FNS       = new Set([...EXEC_SHELL_FNS, ...SPAWN_FNS]);

    const walk = (node) => {
      if (node.type === 'call_expression') {
        const callee   = node.children?.[0];
        const fnName   = this._extractCallee(callee);

        if (fnName && ALL_CMD_FNS.has(fnName)) {
          const args     = node.children.find(c => c.type === 'arguments');
          const firstArg = args?.namedChildren?.[0];

          if (!firstArg) {
            for (const child of node.namedChildren ?? []) walk(child);
            return;
          }

          // Static string literal — safe, do not flag
          if (firstArg.type === 'string') {
            for (const child of node.namedChildren ?? []) walk(child);
            return;
          }

          // Template literal — check for request-data interpolation
          if (firstArg.type === 'template_string') {
            const tmplText  = firstArg.text || '';
            const isTainted = REQUEST_SOURCES.some(src => tmplText.includes(src));
            const isShell   = EXEC_SHELL_FNS.has(fnName);

            findings.push(this.createFinding(
              filePath, node, lines,
              isTainted
                ? `${fnName}() receives a template literal containing HTTP request data — confirmed command injection risk.`
                : `${fnName}() receives a dynamic template literal. Verify no user input reaches this command.`,
              {
                severity:   isTainted && isShell ? 'CRITICAL' : 'HIGH',
                confidence: isTainted ? 'HIGH' : 'MEDIUM',
              }
            ));

          } else {
            // Variable identifier or expression — MEDIUM confidence
            findings.push(this.createFinding(
              filePath, node, lines,
              `${fnName}() receives a dynamic argument. If this value originates from user input, it enables command injection.`,
              {
                severity:   EXEC_SHELL_FNS.has(fnName) ? 'HIGH' : 'MEDIUM',
                confidence: 'MEDIUM',
              }
            ));
          }
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
   * Extract the function name from a callee node.
   * Handles: identifier (exec), member_expression (cp.exec, child_process.exec).
   */
  _extractCallee(callee) {
    if (!callee) return null;
    if (callee.type === 'identifier') return callee.text;
    if (callee.type === 'member_expression') {
      // last child of member_expression is the property name
      const children = callee.children ?? [];
      return children[children.length - 1]?.text || null;
    }
    return null;
  }
}
