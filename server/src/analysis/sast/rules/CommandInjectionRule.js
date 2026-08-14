import { SecurityRule } from './SecurityRule.js';

export class CommandInjectionRule extends SecurityRule {
  constructor() {
    super(
      'COMMAND_INJECTION',
      'CRITICAL',
      'Command execution with non-literal argument can lead to command injection.',
      78 // CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')
    );
  }

  getRecommendation() {
    return 'Avoid passing user-controlled data directly to shell commands. If necessary, sanitize input rigorously, or use safer APIs that do not spawn a shell (e.g., child_process.execFile).';
  }

  evaluate(rootNode, content, filePath, lines) {
    const findings = [];
    
    const walk = (node) => {
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        const name = callee?.type === 'identifier' ? callee.text : (callee?.type === 'member_expression' ? callee.children[2]?.text : null);
        
        if (['exec', 'spawn', 'execSync', 'spawnSync'].includes(name)) {
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
