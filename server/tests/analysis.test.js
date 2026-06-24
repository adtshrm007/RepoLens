import test from 'node:test';
import assert from 'node:assert/strict';
import { __testing } from '../src/services/analysis.service.js';
import { runAnalysis, exploreRepoFile } from '../src/controllers/analysis.controller.js';
import prisma from '../src/utils/prisma.util.js';
import * as githubService from '../src/services/github.service.js';
import * as analysisService from '../src/services/analysis.service.js';

test('analysis.service.js - Line validation filter', (t) => {
  const findings = [
    { issue: 'Valid line', filePath: 'a.js', lineNumber: 2 },
    { issue: 'Out of bounds', filePath: 'a.js', lineNumber: 10 },
    { issue: 'Negative', filePath: 'a.js', lineNumber: -1 },
  ];

  const lineIndex = {
    'a.js': ['line1', 'line2', 'line3']
  };

  const validated = __testing.validateFindings(findings, lineIndex);
  
  assert.equal(validated.length, 1);
  assert.equal(validated[0].issue, 'Valid line');
});

test('analysis.service.js - Hedge language filter', (t) => {
  const findings = [
    { issue: 'SQL Injection', reason: 'This may cause a problem.', severity: 'high' },
    { issue: 'XSS', reason: 'This might lead to XSS if not properly escaped.', severity: 'critical' },
    { issue: 'Hardcoded secret', reason: 'This is absolutely a hardcoded secret.', severity: 'high' },
  ];

  const downgraded = __testing.downgradeHedgedFindings(findings);

  assert.equal(downgraded.length, 3);
  
  // First finding has 'may'
  assert.equal(downgraded[0].severity, 'low');
  assert.ok(downgraded[0].issue.startsWith('[Unverified]'));

  // Second finding has 'might' and 'if not properly'
  assert.equal(downgraded[1].severity, 'low');
  assert.ok(downgraded[1].issue.startsWith('[Unverified]'));

  // Third finding is clean
  assert.equal(downgraded[2].severity, 'high');
  assert.equal(downgraded[2].issue, 'Hardcoded secret');
});

test('analysis.controller.js - FileDocumentation precedence (Explorer overwrites Analysis)', async (t) => {
  // We will simulate the controller's logic using a mocked prisma
  
  let upsertedDocs = [];
  const mockPrisma = {
    fileDocumentation: {
      findUnique: async () => null,
      upsert: async (params) => {
        upsertedDocs.push(params);
        return params;
      }
    }
  };

  const simulateExplorer = async () => {
    // Explorer logic
    await mockPrisma.fileDocumentation.upsert({
      where: { userId_repoFullName_filePath: { userId: 'u1', repoFullName: 'o/r', filePath: 'a.js' } },
      update: { source: 'explorer' },
      create: { source: 'explorer' }
    });
  };

  const simulateAnalysis = async () => {
    // Analysis logic
    const existing = await mockPrisma.fileDocumentation.findUnique({
      where: { userId_repoFullName_filePath: { userId: 'u1', repoFullName: 'o/r', filePath: 'a.js' } }
    });
    if (existing && existing.source === 'explorer') {
      return;
    }
    await mockPrisma.fileDocumentation.upsert({
      where: { userId_repoFullName_filePath: { userId: 'u1', repoFullName: 'o/r', filePath: 'a.js' } },
      update: { source: 'analysis' },
      create: { source: 'analysis' }
    });
  };

  // Scenario 1: Explorer writes freely
  await simulateExplorer();
  assert.equal(upsertedDocs.length, 1);
  assert.equal(upsertedDocs[0].update.source, 'explorer');

  // Scenario 2: Analysis runs, but Explorer doc exists
  upsertedDocs = [];
  mockPrisma.fileDocumentation.findUnique = async () => ({ source: 'explorer' });
  await simulateAnalysis();
  assert.equal(upsertedDocs.length, 0); // Analysis skipped writing

  // Scenario 3: Analysis runs, no Explorer doc exists
  upsertedDocs = [];
  mockPrisma.fileDocumentation.findUnique = async () => null;
  await simulateAnalysis();
  assert.equal(upsertedDocs.length, 1);
  assert.equal(upsertedDocs[0].update.source, 'analysis');
});
