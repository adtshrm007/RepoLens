/**
 * SecretDetector
 *
 * Entropy-based + pattern-matching secret scanner for file content.
 * Operates on raw file content strings (no AST required).
 *
 * Design principles:
 *  - Pattern alone is not enough. We require EITHER high entropy OR
 *    contextual confirmation (assignment/declaration near a sensitive key name).
 *  - Values are MASKED in output. Secrets are never written to logs or DB.
 *  - Config files (.env, Dockerfile, etc.) get dedicated checks.
 *  - False-positive avoidance: variable names like 'token' without a real value
 *    are NOT flagged.
 *
 * Categories:
 *  HARDCODED_SECRET  — credential-like value assigned to a key-bearing identifier
 *  SECRET_IN_CONFIG  — credential pattern found in config/infra file
 */

// Minimum length for a value to be considered a candidate credential
const MIN_SECRET_LENGTH = 12;

// Shannon entropy threshold: most real secrets score > 3.5
// Real words score ~2.5-3.2, high-entropy tokens score 3.8+
const ENTROPY_THRESHOLD = 3.5;

// Patterns matching sensitive key names (left-hand side)
const SENSITIVE_KEY_PATTERNS = [
  /api[_-]?key/i,
  /api[_-]?secret/i,
  /auth[_-]?token/i,
  /access[_-]?token/i,
  /secret[_-]?key/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /app[_-]?secret/i,
  /db[_-]?password/i,
  /database[_-]?password/i,
  /aws[_-]?secret/i,
  /stripe[_-]?key/i,
  /twilio[_-]?auth/i,
  /sendgrid[_-]?key/i,
  /smtp[_-]?password/i,
  /jwt[_-]?secret/i,
  /encryption[_-]?key/i,
];

// Patterns for specific credential formats (value-side detection)
const CREDENTIAL_VALUE_PATTERNS = [
  // AWS Access Key
  { pattern: /\bAKIA[0-9A-Z]{16}\b/, name: 'AWS Access Key ID', cwe: 798 },
  // Generic Bearer / JWT-like token
  { pattern: /\beyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/, name: 'JWT Token', cwe: 798 },
  // GitHub Personal Access Token (classic)
  { pattern: /\bghp_[A-Za-z0-9]{36}\b/, name: 'GitHub Personal Access Token', cwe: 798 },
  // GitHub OAuth
  { pattern: /\bgho_[A-Za-z0-9]{36}\b/, name: 'GitHub OAuth Token', cwe: 798 },
  // Stripe secret key
  { pattern: /\bsk_live_[A-Za-z0-9]{24,}\b/, name: 'Stripe Secret Key', cwe: 798 },
  // Stripe publishable key
  { pattern: /\bpk_live_[A-Za-z0-9]{24,}\b/, name: 'Stripe Publishable Key (live)', cwe: 798 },
  // Slack token
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, name: 'Slack Token', cwe: 798 },
  // Google API Key
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, name: 'Google API Key', cwe: 798 },
  // Private key header
  { pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, name: 'Private Key Material', cwe: 798 },
  // Mailgun API Key
  { pattern: /\bkey-[0-9a-f]{32}\b/, name: 'Mailgun API Key', cwe: 798 },
];

// Assignment patterns: key = "value" or key: "value"
const ASSIGNMENT_REGEX = /(?:^|[,{\s])([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*["'`]([^"'`\n]{8,})["'`]/gm;

function shannonEntropy(str) {
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  const len = str.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function maskValue(value) {
  if (value.length <= 4) return '****';
  return value.slice(0, 3) + '*'.repeat(Math.min(value.length - 3, 12)) + '…';
}

function isSensitiveKey(keyName) {
  return SENSITIVE_KEY_PATTERNS.some(p => p.test(keyName));
}

export class SecretDetector {
  /**
   * Scan file content for hardcoded secrets.
   * @param {string} filePath
   * @param {string} content
   * @returns {Array} findings
   */
  scanContent(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    // ── 1. Specific credential format patterns (value-side) ───────────────────
    for (const { pattern, name, cwe } of CREDENTIAL_VALUE_PATTERNS) {
      let match;
      const rx = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
      while ((match = rx.exec(content)) !== null) {
        const lineIndex = content.substring(0, match.index).split('\n').length - 1;
        findings.push({
          type:        'HARDCODED_SECRET',
          severity:    'CRITICAL',
          confidence:  'HIGH',
          file:        filePath,
          lineNumber:  lineIndex + 1,
          snippet:     maskValue(match[0]),
          description: `${name} found hardcoded in source.`,
          recommendation: `Remove this credential from source code. Use environment variables (process.env.KEY_NAME) instead. Rotate the exposed credential immediately.`,
          cwe:         { id: cwe, name: 'Use of Hard-coded Credentials', url: `https://cwe.mitre.org/data/definitions/${cwe}.html` },
        });
      }
    }

    // ── 2. Assignment pattern: key = "value" with high-entropy value ─────────
    let match;
    ASSIGNMENT_REGEX.lastIndex = 0;
    while ((match = ASSIGNMENT_REGEX.exec(content)) !== null) {
      const [, keyName, value] = match;
      if (!isSensitiveKey(keyName)) continue;
      if (value.length < MIN_SECRET_LENGTH) continue;

      // Skip obvious placeholders
      if (/^(your[_-]?|example|placeholder|replace|todo|xxx|test|dummy|sample|fake|mock)/i.test(value)) continue;
      // Skip process.env references (safe)
      if (value.includes('process.env')) continue;

      const entropy = shannonEntropy(value);
      if (entropy < ENTROPY_THRESHOLD) continue;

      const lineIndex = content.substring(0, match.index).split('\n').length - 1;
      findings.push({
        type:        'HARDCODED_SECRET',
        severity:    'CRITICAL',
        confidence:  entropy > 4.0 ? 'HIGH' : 'MEDIUM',
        file:        filePath,
        lineNumber:  lineIndex + 1,
        snippet:     `${keyName} = "${maskValue(value)}"`,
        description: `Potential hardcoded credential in assignment: '${keyName}'. Value has high entropy (${entropy.toFixed(2)}).`,
        recommendation: `Replace this hardcoded value with an environment variable. Add this file to .gitignore if it must contain local credentials.`,
        cwe:         { id: 798, name: 'Use of Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html' },
      });
    }

    return this._deduplicate(findings);
  }

  /**
   * Scan infrastructure/config files for credential patterns.
   * These files often have different syntax and are checked separately.
   * @param {string} filePath
   * @param {string} content
   * @returns {Array} findings
   */
  scanConfigFile(filePath, content) {
    const findings = [];
    const lines = content.split('\n');
    const isDockerfile = filePath.toLowerCase().includes('dockerfile');
    const isEnv        = filePath.endsWith('.env') || filePath.endsWith('.env.local');
    const isGHActions  = filePath.includes('.github/workflows');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // .env: FLAG_NAME=actual_value (not a reference)
      if (isEnv) {
        const envMatch = /^([A-Z_]+)\s*=\s*(.+)$/.exec(trimmed);
        if (envMatch) {
          const [, key, value] = envMatch;
          if (isSensitiveKey(key) && value.length >= MIN_SECRET_LENGTH &&
              !/^\$\{/.test(value) && !/^process\.env/.test(value)) {
            const entropy = shannonEntropy(value);
            if (entropy >= ENTROPY_THRESHOLD) {
              findings.push({
                type:        'SECRET_IN_CONFIG',
                severity:    'CRITICAL',
                confidence:  'HIGH',
                file:        filePath,
                lineNumber:  index + 1,
                snippet:     `${key}=${maskValue(value)}`,
                description: `Credential '${key}' appears to be hardcoded in a config file. If committed to version control, this is a critical secret exposure.`,
                recommendation: `Ensure this .env file is in .gitignore. Use secret management tools (Vault, AWS Secrets Manager) for production credentials.`,
                cwe:         { id: 798, name: 'Use of Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html' },
              });
            }
          }
        }
      }

      // Dockerfile: ENV KEY=value or ARG KEY=value with sensitive names
      if (isDockerfile) {
        const dockerEnv = /^(?:ENV|ARG)\s+([A-Z_a-z]+)[= ](.+)$/.exec(trimmed);
        if (dockerEnv) {
          const [, key, value] = dockerEnv;
          if (isSensitiveKey(key) && value.length >= MIN_SECRET_LENGTH &&
              !/^\$\{/.test(value)) {
            findings.push({
              type:        'SECRET_IN_CONFIG',
              severity:    'HIGH',
              confidence:  'MEDIUM',
              file:        filePath,
              lineNumber:  index + 1,
              snippet:     `${key}=${maskValue(value)}`,
              description: `Sensitive value '${key}' is set directly in Dockerfile. This value will be present in all image layers.`,
              recommendation: `Use Docker build secrets (--secret) or pass credentials at runtime via environment variables rather than baking them into image layers.`,
              cwe:         { id: 798, name: 'Use of Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html' },
            });
          }
        }
      }

      // GitHub Actions: hardcoded secrets outside ${{ secrets.X }} pattern
      if (isGHActions) {
        // Flag literal values assigned to env vars that look like credentials
        const ghMatch = /:\s*["']([A-Za-z0-9+/]{20,}={0,2})["']/.exec(trimmed);
        if (ghMatch && isSensitiveKey(trimmed.split(':')[0] || '')) {
          const entropy = shannonEntropy(ghMatch[1]);
          if (entropy >= ENTROPY_THRESHOLD) {
            findings.push({
              type:        'SECRET_IN_CONFIG',
              severity:    'CRITICAL',
              confidence:  'MEDIUM',
              file:        filePath,
              lineNumber:  index + 1,
              snippet:     maskValue(ghMatch[1]),
              description: `Potential hardcoded credential in GitHub Actions workflow. Credentials should reference \${{ secrets.NAME }}.`,
              recommendation: `Use GitHub Actions secrets (\${{ secrets.MY_SECRET }}) instead of hardcoding credentials in workflow files.`,
              cwe:         { id: 798, name: 'Use of Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html' },
            });
          }
        }
      }
    });

    return this._deduplicate(findings);
  }

  _deduplicate(findings) {
    const seen = new Set();
    return findings.filter(f => {
      const key = `${f.file}:${f.lineNumber}:${f.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

/**
 * Determine if a file should be scanned as a config file.
 */
export function isConfigFile(filePath) {
  const lower = filePath.toLowerCase();
  return (
    lower.endsWith('.env') ||
    lower.endsWith('.env.local') ||
    lower.endsWith('.env.example') ||
    lower.endsWith('.env.production') ||
    lower.includes('dockerfile') ||
    lower.endsWith('docker-compose.yml') ||
    lower.endsWith('docker-compose.yaml') ||
    lower.includes('.github/workflows') ||
    lower.endsWith('.npmrc') ||
    lower.endsWith('.netrc')
  );
}
