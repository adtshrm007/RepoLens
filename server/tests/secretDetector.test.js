import test from 'node:test';
import assert from 'node:assert/strict';
import { SecretDetector, isConfigFile } from '../src/analysis/sast/SecretDetector.js';

test('isConfigFile correctly identifies config files', () => {
  assert.equal(isConfigFile('.env'), true);
  assert.equal(isConfigFile('.env.local'), true);
  assert.equal(isConfigFile('Dockerfile'), true);
  assert.equal(isConfigFile('.github/workflows/deploy.yml'), true);
  assert.equal(isConfigFile('src/app.js'), false);
});

test('SecretDetector: does not flag normal variable assignments', () => {
  const detector = new SecretDetector();
  const content = `const secretName = "myAppSecret";\nconst timeout = 5000;`;
  const findings = detector.scanContent('app.js', content);
  assert.equal(findings.length, 0, 'Should not flag low entropy values');
});

test('SecretDetector: flags high entropy hardcoded secrets in code', () => {
  const detector = new SecretDetector();
  // "API_KEY" assigned a high-entropy string
  const content = `const API_KEY = "AIzaSyB-XXxxYYyyZZzz1234567890abcdefg";`;
  const findings = detector.scanContent('app.js', content);
  
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'HARDCODED_SECRET');
  assert.equal(findings[0].severity, 'CRITICAL');
  assert.ok(findings[0].snippet.includes('AIz***'), 'Value should be masked');
});

test('SecretDetector: flags specific credential patterns (e.g. AWS Key)', () => {
  const detector = new SecretDetector();
  const content = `const s3 = new AWS.S3({ accessKeyId: "AKIAIOSFODNN7EXAMPLE" });`;
  const findings = detector.scanContent('app.js', content);
  
  assert.equal(findings.length, 1);
  assert.equal(findings[0].type, 'HARDCODED_SECRET');
  assert.ok(findings[0].description.includes('AWS Access Key ID'));
});

test('SecretDetector: flags secrets in .env files', () => {
  const detector = new SecretDetector();
  const content = `PORT=8080\nDB_PASSWORD=SuperSecretPassword123!\nAPI_KEY=AIzaSyB-XXxxYYyyZZzz1234567890abcdefg`;
  const findings = detector.scanConfigFile('.env', content);
  
  assert.equal(findings.length, 2); // DB_PASSWORD and API_KEY
  assert.equal(findings[0].type, 'SECRET_IN_CONFIG');
  assert.equal(findings[0].severity, 'CRITICAL');
  assert.equal(findings[0].lineNumber, 2);
});

test('SecretDetector: ignores references and safe values in config files', () => {
  const detector = new SecretDetector();
  const content = `DB_PASSWORD=\${VAULT_DB_PASSWORD}\nAPI_KEY=process.env.API_KEY`;
  const findings = detector.scanConfigFile('.env', content);
  
  assert.equal(findings.length, 0, 'Should ignore environment variable references');
});
