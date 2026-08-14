import { EvalRule } from './rules/EvalRule.js';
import { CommandInjectionRule } from './rules/CommandInjectionRule.js';
import { WeakCryptoRule } from './rules/WeakCryptoRule.js';
import { UnsafeDynamicImportRule } from './rules/UnsafeDynamicImportRule.js';
import { InsecureStorageRule } from './rules/InsecureStorageRule.js';
import { DangerousHtmlRule } from './rules/DangerousHtmlRule.js';
import { DataFlowTaintRule } from './rules/DataFlowTaintRule.js';
import { PathTraversalRule } from './rules/PathTraversalRule.js';
import { SqlInjectionRule } from './rules/SqlInjectionRule.js';
import { PrototypePollutionRule } from './rules/PrototypePollutionRule.js';
import { InsecureRandomRule } from './rules/InsecureRandomRule.js';

export class SASTEngine {
  constructor() {
    this.rules = [
      new EvalRule(),
      new CommandInjectionRule(),
      new WeakCryptoRule(),
      new UnsafeDynamicImportRule(),
      new InsecureStorageRule(),
      new DangerousHtmlRule(),
      new DataFlowTaintRule(),
      new PathTraversalRule(),
      new SqlInjectionRule(),
      new PrototypePollutionRule(),
      new InsecureRandomRule()
    ];
  }

  scan(rootNode, content, filePath) {
    const findings = [];
    const lines = content ? content.split('\n') : [];

    for (const rule of this.rules) {
      try {
        const ruleFindings = rule.evaluate(rootNode, content, filePath, lines);
        if (Array.isArray(ruleFindings)) {
          findings.push(...ruleFindings);
        }
      } catch (err) {
        console.warn(`[SASTEngine] Rule '${rule.id}' failed: ${err.message}`);
      }
    }

    return this._deduplicate(findings);
  }

  _deduplicate(findings) {
    const seen = new Set();
    const deduplicated = [];
    for (const f of findings) {
      const key = `${f.type}::${f.file}::${f.lineNumber}::${f.snippet}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(f);
      }
    }
    return deduplicated;
  }
}
