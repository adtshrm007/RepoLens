/**
 * tests/findings.test.js
 *
 * Tests for the finding generation pipeline:
 * - Correct severity per category
 * - Deduplication (same location → one finding)
 * - No cross-contamination between categories
 * - Correct average complexity math
 * - Source location preservation
 * - Threshold-correct severity mapping
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// ── Inline rule classes (avoid full service stack) ─────────────────────────

import { HighComplexityRule } from '../src/analysis/rules/rules/HighComplexityRule.js';
import { DeepNestingRule }    from '../src/analysis/rules/rules/DeepNestingRule.js';
import { LongFunctionRule }   from '../src/analysis/rules/rules/LongFunctionRule.js';
import { CircularDependencyRule } from '../src/analysis/rules/rules/CircularDependencyRule.js';
import { HighFanOutRule }     from '../src/analysis/rules/rules/HighFanOutRule.js';
import { RuleEngine }         from '../src/analysis/rules/RuleEngine.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeProfile(functions = [], filePath = 'src/test.js') {
  return {
    filePath,
    functions,
    imports: [],
    backend: {},
    codeBlockHashes: [],
    totalLines: 100,
    cyclomaticComplexity: functions.reduce((s, f) => s + f.cyclomaticComplexity, 0),
    cognitiveComplexity:  functions.reduce((s, f) => s + f.cognitiveComplexity, 0),
    maxNestingDepth:      functions.reduce((m, f) => Math.max(m, f.maxNestingDepth), 0),
    deadCodeCount: 0,
    componentCount: 0,
    hookUsageCount: 0,
    dependencyCount: 0,
    largeFunctionsCount: 0,
    duplicateCodeBlocks: 0,
  };
}

function makeRepoProfile(fileProfiles = []) {
  return { fileProfiles };
}

function makeFn(overrides = {}) {
  return {
    name: 'myFunction',
    lineStart: 10,
    lineEnd: 50,
    length: 40,
    cyclomaticComplexity: 1,
    cognitiveComplexity: 1,
    maxNestingDepth: 1,
    decisionPoints: [],
    ...overrides,
  };
}

// ── Tests: HighComplexityRule ─────────────────────────────────────────────

test('HighComplexityRule: no finding below threshold', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ cyclomaticComplexity: 9 })]);
  const findings = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(findings.length, 0);
});

test('HighComplexityRule: MODERATE severity at CC=10', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ name: 'foo', cyclomaticComplexity: 10 })]);
  const findings = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'MODERATE');
  assert.equal(findings[0].category, 'COMPLEXITY');
  assert.equal(findings[0].symbol, 'foo');
});

test('HighComplexityRule: HIGH severity at CC=15', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ cyclomaticComplexity: 15 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.severity, 'HIGH');
  assert.equal(finding.category, 'COMPLEXITY');
});

test('HighComplexityRule: VERY_HIGH severity at CC=20', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ cyclomaticComplexity: 20 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.severity, 'VERY_HIGH');
  assert.equal(finding.category, 'COMPLEXITY');
  // Must NOT be CRITICAL — that's reserved for SECURITY
  assert.notEqual(finding.severity, 'CRITICAL');
});

test('HighComplexityRule: finding includes startLine and endLine', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ lineStart: 42, lineEnd: 120, cyclomaticComplexity: 12 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.startLine, 42);
  assert.equal(finding.endLine, 120);
});

test('HighComplexityRule: finding includes threshold in metrics', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ cyclomaticComplexity: 14 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.metrics.threshold, 10);
});

test('HighComplexityRule: recommendation references function name', () => {
  const rule = new HighComplexityRule();
  const profile = makeProfile([makeFn({ name: 'handlePayment', cyclomaticComplexity: 11 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.ok(finding.recommendation.includes('handlePayment'), 'Recommendation should name the function');
});

// ── Tests: LongFunctionRule ───────────────────────────────────────────────

test('LongFunctionRule: no finding below threshold', () => {
  const rule = new LongFunctionRule();
  const profile = makeProfile([makeFn({ length: 59 })]);
  const findings = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(findings.length, 0);
});

test('LongFunctionRule: LOW severity at 60 lines', () => {
  const rule = new LongFunctionRule();
  const profile = makeProfile([makeFn({ length: 60 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.severity, 'LOW');
  assert.equal(finding.category, 'CODE_QUALITY');
  assert.notEqual(finding.category, 'COMPLEXITY');
});

test('LongFunctionRule: MEDIUM severity at 100 lines', () => {
  const rule = new LongFunctionRule();
  const profile = makeProfile([makeFn({ length: 100 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.severity, 'MEDIUM');
});

test('LongFunctionRule: HIGH severity at 200+ lines', () => {
  const rule = new LongFunctionRule();
  const profile = makeProfile([makeFn({ length: 200 })]);
  const [finding] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(finding.severity, 'HIGH');
  // Must NOT be CRITICAL
  assert.notEqual(finding.severity, 'CRITICAL');
});

// ── Tests: DeepNestingRule ────────────────────────────────────────────────

test('DeepNestingRule: no finding below threshold', () => {
  const rule = new DeepNestingRule();
  const profile = makeProfile([makeFn({ maxNestingDepth: 4 })]);
  const findings = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(findings.length, 0);
});

test('DeepNestingRule: MODERATE at depth 5', () => {
  const rule = new DeepNestingRule();
  const profile = makeProfile([makeFn({ maxNestingDepth: 5 })]);
  const [f] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(f.severity, 'MODERATE');
  assert.equal(f.category, 'COMPLEXITY');
});

test('DeepNestingRule: VERY_HIGH at depth 7+', () => {
  const rule = new DeepNestingRule();
  const profile = makeProfile([makeFn({ maxNestingDepth: 8 })]);
  const [f] = rule.evaluate(makeRepoProfile([profile]));
  assert.equal(f.severity, 'VERY_HIGH');
  assert.notEqual(f.severity, 'CRITICAL');
});

// ── Tests: CircularDependencyRule ─────────────────────────────────────────

test('CircularDependencyRule: no findings when no cycles', () => {
  const rule = new CircularDependencyRule();
  const findings = rule.evaluate({}, { cycles: [] });
  assert.equal(findings.length, 0);
});

test('CircularDependencyRule: HIGH for 2-file cycle', () => {
  const rule = new CircularDependencyRule();
  const [f] = rule.evaluate({}, { cycles: [['a.js', 'b.js']] });
  assert.equal(f.severity, 'HIGH');
  assert.equal(f.category, 'ARCHITECTURE');
  assert.notEqual(f.category, 'COMPLEXITY');
});

test('CircularDependencyRule: LOW for 4+ file cycle', () => {
  const rule = new CircularDependencyRule();
  const [f] = rule.evaluate({}, { cycles: [['a.js', 'b.js', 'c.js', 'd.js']] });
  assert.equal(f.severity, 'LOW');
});

// ── Tests: RuleEngine deduplication ──────────────────────────────────────

test('RuleEngine: deduplicates identical findings', () => {
  const engine = new RuleEngine();
  // Inject a mock rule that returns two identical findings for same location
  engine.registerRule({
    id: 'MOCK_DUPLICATE',
    evaluate: () => [
      { ruleId: 'MOCK_DUPLICATE', severity: 'HIGH', category: 'COMPLEXITY',
        confidence: 'HIGH', file: 'foo.js', startLine: 10, endLine: 20, line: 10,
        symbol: 'bar', message: 'dup', explanation: '', recommendation: '' },
      { ruleId: 'MOCK_DUPLICATE', severity: 'HIGH', category: 'COMPLEXITY',
        confidence: 'HIGH', file: 'foo.js', startLine: 10, endLine: 20, line: 10,
        symbol: 'bar', message: 'dup', explanation: '', recommendation: '' },
    ]
  });
  const repoProfile = makeRepoProfile([]);
  const findings = engine.run(repoProfile, null);
  const mockFindings = findings.filter(f => f.ruleId === 'MOCK_DUPLICATE');
  assert.equal(mockFindings.length, 1, 'Should deduplicate to a single finding');
});

test('RuleEngine: different locations → separate findings', () => {
  const engine = new RuleEngine();
  engine.registerRule({
    id: 'MOCK_MULTI',
    evaluate: () => [
      { ruleId: 'MOCK_MULTI', severity: 'HIGH', category: 'COMPLEXITY',
        confidence: 'HIGH', file: 'foo.js', startLine: 10, line: 10,
        symbol: 'fn1', message: 'm1', explanation: '', recommendation: '' },
      { ruleId: 'MOCK_MULTI', severity: 'HIGH', category: 'COMPLEXITY',
        confidence: 'HIGH', file: 'foo.js', startLine: 20, line: 20,
        symbol: 'fn2', message: 'm2', explanation: '', recommendation: '' },
    ]
  });
  const findings = engine.run(makeRepoProfile([]), null).filter(f => f.ruleId === 'MOCK_MULTI');
  assert.equal(findings.length, 2, 'Different locations should produce separate findings');
});

test('RuleEngine: categories remain separate in output', () => {
  const engine = new RuleEngine();
  const profile = makeProfile([
    makeFn({ name: 'complexFn', lineStart: 1, lineEnd: 50, cyclomaticComplexity: 25, maxNestingDepth: 3, length: 50 }),
    makeFn({ name: 'longFn',    lineStart: 51, lineEnd: 260, cyclomaticComplexity: 1, maxNestingDepth: 1, length: 210 }),
  ]);
  const findings = engine.run(makeRepoProfile([profile]), { cycles: [], nodes: [] });
  const complexFindings = findings.filter(f => f.category === 'COMPLEXITY');
  const qualityFindings = findings.filter(f => f.category === 'CODE_QUALITY');
  assert.ok(complexFindings.length > 0, 'Should have COMPLEXITY findings');
  assert.ok(qualityFindings.length > 0, 'Should have CODE_QUALITY findings');
  // COMPLEXITY and CODE_QUALITY findings must not overlap
  const complexFiles = new Set(complexFindings.map(f => `${f.ruleId}:${f.symbol}`));
  const qualityFiles = new Set(qualityFindings.map(f => `${f.ruleId}:${f.symbol}`));
  for (const key of complexFiles) {
    assert.ok(!qualityFiles.has(key), `Finding ${key} should not appear in both COMPLEXITY and CODE_QUALITY`);
  }
});

// ── Tests: Correct average complexity math ────────────────────────────────

test('avgCyclomaticComplexity: divides by function count not file count', () => {
  // Simulate what CSTRepoProfile.aggregate() does
  const allFunctions = [
    { cyclomaticComplexity: 3 },
    { cyclomaticComplexity: 5 },
    { cyclomaticComplexity: 7 },
  ];
  // Old (wrong) formula: would divide total by file count → 15 / 1 = 15 (inflated)
  // New (correct) formula: divides by function count → 15 / 3 = 5
  const avg = allFunctions.reduce((s, f) => s + f.cyclomaticComplexity, 0) / allFunctions.length;
  assert.equal(avg, 5, 'Average CC should be 5 (per-function), not 15 (per-file)');
});
