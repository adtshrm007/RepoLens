import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityScoringEngine } from '../src/services/securityScoring.service.js';

test('SecurityScoringEngine: perfect score when no findings', () => {
  const engine = new SecurityScoringEngine([], []);
  const result = engine.calculate();
  
  assert.equal(result.score, 100);
  assert.equal(result.grade, 'A');
  assert.equal(result.deductions.length, 0);
});

test('SecurityScoringEngine: deducts for SAST findings with caps', () => {
  // 3 CRITICAL SAST findings (15 points each = 45 points)
  // Cap for SAST CRITICAL is 30.
  const sastFindings = [
    { type: 'EVAL_USAGE', severity: 'CRITICAL', confidence: 'HIGH' },
    { type: 'EVAL_USAGE', severity: 'CRITICAL', confidence: 'HIGH' },
    { type: 'COMMAND_INJECTION', severity: 'CRITICAL', confidence: 'HIGH' },
  ];
  
  const engine = new SecurityScoringEngine(sastFindings, []);
  const result = engine.calculate();
  
  assert.equal(result.score, 70); // 100 - 30 (cap)
  
  const criticalDeduction = result.deductions.find(d => d.category === 'SAST' && d.severity === 'CRITICAL');
  assert.equal(criticalDeduction.rawPoints, 45);
  assert.equal(criticalDeduction.applied, 30);
  assert.equal(criticalDeduction.capped, true);
});

test('SecurityScoringEngine: deducts for exposed secrets', () => {
  const secretFindings = [
    { type: 'HARDCODED_SECRET', severity: 'CRITICAL', confidence: 'HIGH' },
  ];
  
  const engine = new SecurityScoringEngine(secretFindings, []);
  const result = engine.calculate();
  
  assert.equal(result.score, 90); // 100 - 10
  
  const deduction = result.deductions.find(d => d.category === 'SECRETS');
  assert.equal(deduction.rawPoints, 10);
  assert.equal(deduction.applied, 10);
});

test('SecurityScoringEngine: deducts for dependency vulnerabilities', () => {
  const depFindings = [
    { type: 'DEPENDENCY_VULNERABILITY', severity: 'HIGH' },
  ];
  
  const engine = new SecurityScoringEngine([], depFindings);
  const result = engine.calculate();
  
  assert.equal(result.score, 88); // 100 - 12 (HIGH dep deduction)
});

test('SecurityScoringEngine: calculates correct grade', () => {
  const engine = new SecurityScoringEngine([], []);
  assert.equal(engine._grade(95), 'A');
  assert.equal(engine._grade(80), 'B');
  assert.equal(engine._grade(65), 'C');
  assert.equal(engine._grade(50), 'D');
  assert.equal(engine._grade(20), 'F');
});
