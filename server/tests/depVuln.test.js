import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFindings } from '../src/analysis/FindingNormalizer.js';

test('FindingNormalizer - Dependency Vulnerability Deduplication', async (t) => {
  
  await t.test('same vuln in two package.json files deduplicates to ONE finding', () => {
    const findings = [
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-xxx',
        file: 'frontend/package.json',
        cvss: 7.5,
      },
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-xxx',
        file: 'backend/package.json',
        cvss: 7.5,
      }
    ];

    const normalized = normalizeFindings(findings);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].affectedFiles.length, 2);
    assert.ok(normalized[0].affectedFiles.includes('frontend/package.json'));
    assert.ok(normalized[0].affectedFiles.includes('backend/package.json'));
  });

  await t.test('different vulns in same package produce TWO findings', () => {
    const findings = [
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-111',
        file: 'package.json',
      },
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-222',
        file: 'package.json',
      }
    ];

    const normalized = normalizeFindings(findings);
    assert.equal(normalized.length, 2);
  });
  
  await t.test('prefers finding with more metadata', () => {
    const findings = [
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-xxx',
        file: 'backend/package.json',
        cvss: 7.5,
        cve: 'CVE-2023-1234'
      },
      {
        type: 'DEPENDENCY_VULNERABILITY',
        packageName: 'axios',
        installedVersion: '1.1.0',
        vulnId: 'GHSA-xxx',
        file: 'frontend/package.json',
        cvss: 7.5,
      }
    ];

    const normalized = normalizeFindings(findings);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].cve, 'CVE-2023-1234');
  });
});
