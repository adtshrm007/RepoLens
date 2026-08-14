import test from 'node:test';
import assert from 'node:assert/strict';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { EvalRule } from '../src/analysis/sast/rules/EvalRule.js';
import { CommandInjectionRule } from '../src/analysis/sast/rules/CommandInjectionRule.js';
import { WeakCryptoRule } from '../src/analysis/sast/rules/WeakCryptoRule.js';
import { PathTraversalRule } from '../src/analysis/sast/rules/PathTraversalRule.js';
import { InsecureRandomRule } from '../src/analysis/sast/rules/InsecureRandomRule.js';
import { SqlInjectionRule } from '../src/analysis/sast/rules/SqlInjectionRule.js';
import { DangerousHtmlRule } from '../src/analysis/sast/rules/DangerousHtmlRule.js';

const parser = new Parser();
parser.setLanguage(JavaScript);

function scan(rule, code, filePath = 'test.js') {
  const tree = parser.parse(code);
  const lines = code.split('\n');
  return rule.evaluate(tree.rootNode, code, filePath, lines);
}

test('EvalRule', async (t) => {
  const rule = new EvalRule();

  await t.test('flags eval(variable) as CRITICAL', () => {
    const findings = scan(rule, 'function a(x) { eval(x); }');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
  });

  await t.test('flags eval("literal") as HIGH', () => {
    const findings = scan(rule, 'function a() { eval("console.log(1)"); }');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'HIGH');
  });
});

test('CommandInjectionRule', async (t) => {
  const rule = new CommandInjectionRule();

  await t.test('flags exec(req.body.cmd) as CRITICAL HIGH-confidence', () => {
    const findings = scan(rule, 'function a(req) { exec(`${req.body.cmd}`); }');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
    assert.equal(findings[0].confidence, 'HIGH');
  });

  await t.test('does not flag exec("ls") literal', () => {
    const findings = scan(rule, 'function a() { exec("ls -la"); }');
    assert.equal(findings.length, 0);
  });
});

test('WeakCryptoRule', async (t) => {
  const rule = new WeakCryptoRule();

  await t.test('flags md5', () => {
    const findings = scan(rule, 'crypto.createHash("md5")');
    assert.equal(findings.length, 1);
  });

  await t.test('does not flag sha256', () => {
    const findings = scan(rule, 'crypto.createHash("sha256")');
    assert.equal(findings.length, 0);
  });
});

test('PathTraversalRule', async (t) => {
  const rule = new PathTraversalRule();

  await t.test('flags fs.readFile(req.query.path)', () => {
    const findings = scan(rule, 'function a(req) { fs.readFile(req.query.path); }');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'HIGH');
  });

  await t.test('does not flag fs.readFile("config.json")', () => {
    const findings = scan(rule, 'function a() { fs.readFile("config.json"); }');
    assert.equal(findings.length, 0);
  });
});

test('InsecureRandomRule', async (t) => {
  const rule = new InsecureRandomRule();

  await t.test('flags const token = Math.random()', () => {
    const findings = scan(rule, 'const token = Math.random();');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MEDIUM');
  });

  await t.test('does not flag const progress = Math.random()', () => {
    const findings = scan(rule, 'const progress = Math.random();');
    assert.equal(findings.length, 0);
  });
});

test('SqlInjectionRule', async (t) => {
  const rule = new SqlInjectionRule();

  await t.test('flags template literal in raw query with req.* data', () => {
    const findings = scan(rule, 'function a(req) { db.query(`SELECT * FROM users WHERE id = ${req.params.id}`); }');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'CRITICAL');
  });

  await t.test('does not flag parameterized query', () => {
    const findings = scan(rule, 'function a(req) { db.query("SELECT * FROM users WHERE id = ?", [req.params.id]); }');
    assert.equal(findings.length, 0);
  });
});

test('DangerousHtmlRule', async (t) => {
  const rule = new DangerousHtmlRule();

  await t.test('flags dynamic __html as HIGH', () => {
    const findings = scan(rule, '<div dangerouslySetInnerHTML={{ __html: userContent }} />');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'HIGH');
  });

  await t.test('flags static __html as MEDIUM', () => {
    const findings = scan(rule, '<div dangerouslySetInnerHTML={{ __html: "<b>Bold</b>" }} />');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'MEDIUM');
  });
});
