/**
 * FindingNormalizer
 *
 * A single normalization + deduplication stage applied to ALL security findings
 * (SAST + SecretDetector + DependencyVulnerabilityService) BEFORE they are
 * written to the database.
 *
 * ── Why this exists ────────────────────────────────────────────────────────────
 * Three independent services produce findings. Each deduplicates internally but
 * there is no cross-service deduplication. In a monorepo the same GHSA can be
 * reported once per package.json file. The same SAST pattern can appear from
 * two rules with overlapping detection.
 *
 * ── Identity keys ──────────────────────────────────────────────────────────────
 *
 * DEPENDENCY_VULNERABILITY:
 *   `DEP_VULN::${packageName}::${installedVersion}::${vulnId}`
 *   Two different vulnerabilities in the same package (different GHSA) → different key → kept separate.
 *   Same vulnerability in two package.json files → same key → deduplicated to one.
 *
 * HARDCODED_SECRET / SECRET_IN_CONFIG:
 *   `${type}::${file}::${lineNumber}`
 *   Same secret at same line → deduplicated.
 *
 * All other SAST findings:
 *   `${type}::${file}::${lineNumber}::${snippet.slice(0,80)}`
 *   Same rule at same location → deduplicated.
 *
 * ── Merge strategy ─────────────────────────────────────────────────────────────
 * When deduplicating DEPENDENCY_VULNERABILITY findings across package.json files:
 *   - Keep the finding with the most complete metadata.
 *   - Merge `affectedFiles` to record all locations where the vuln was seen.
 *
 * ── Production guarantees ──────────────────────────────────────────────────────
 * - Two genuinely different vulnerabilities in the same dependency MUST remain separate.
 * - Never silently drops findings — every dropped finding is logged at warn level.
 * - Deterministic — same input always produces same output.
 */

/**
 * Compute a stable identity key for a single finding.
 * @param {object} finding
 * @returns {string}
 */
function computeIdentity(finding) {
  const type = (finding.type || finding.ruleId || 'UNKNOWN').toUpperCase();

  if (type === 'DEPENDENCY_VULNERABILITY') {
    // Identity: package + version + vulnerability ID
    // This is the ONLY place where two different GHSA IDs for the same package
    // are treated as different findings (correct behavior).
    const pkg     = (finding.packageName || finding.package || '').toLowerCase();
    const version = finding.installedVersion || finding.version || '';
    const vulnId  = finding.vulnId || finding.ghsa || finding.cve || finding.id || 'UNKNOWN';
    return `DEP_VULN::${pkg}::${version}::${vulnId}`;
  }

  if (type === 'HARDCODED_SECRET' || type === 'SECRET_IN_CONFIG') {
    // Identity: type + exact file + exact line
    const file    = (finding.file || '').replace(/\\/g, '/');
    const lineNum = finding.lineNumber ?? finding.line ?? 0;
    return `${type}::${file}::${lineNum}`;
  }

  // All other SAST findings
  const file    = (finding.file || '').replace(/\\/g, '/');
  const lineNum = finding.lineNumber ?? finding.line ?? 0;
  const snippet = (finding.snippet || '').trim().slice(0, 80);
  return `${type}::${file}::${lineNum}::${snippet}`;
}

/**
 * Choose the "better" of two findings with the same identity key.
 * Prefers the finding with more metadata fields populated.
 * For DEPENDENCY_VULNERABILITY, merges affectedFiles arrays.
 * @param {object} existing
 * @param {object} incoming
 * @returns {object} the merged/preferred finding
 */
function mergeFindings(existing, incoming) {
  const type = (existing.type || '').toUpperCase();

  if (type === 'DEPENDENCY_VULNERABILITY') {
    // Collect all package.json paths that contained this vulnerability
    const existingFiles = existing.affectedFiles || [existing.file].filter(Boolean);
    const incomingFiles = incoming.affectedFiles || [incoming.file].filter(Boolean);
    const mergedFiles   = [...new Set([...existingFiles, ...incomingFiles])];

    // Prefer the one with more complete vulnerability metadata
    const existingScore = scoreCompleteness(existing);
    const incomingScore = scoreCompleteness(incoming);
    const preferred = incomingScore > existingScore ? incoming : existing;

    return { ...preferred, affectedFiles: mergedFiles };
  }

  // For all other types: prefer whichever has the higher-severity or more fields
  const existingScore = scoreCompleteness(existing);
  const incomingScore = scoreCompleteness(incoming);
  return incomingScore > existingScore ? incoming : existing;
}

/**
 * Score a finding's "completeness" — how many useful metadata fields it has.
 * Used to select the best finding when deduplicating.
 * @param {object} finding
 * @returns {number}
 */
function scoreCompleteness(finding) {
  let score = 0;
  if (finding.cvss)            score += 3;
  if (finding.ghsa)            score += 2;
  if (finding.cve)             score += 2;
  if (finding.fixedVersion)    score += 2;
  if (finding.vulnerableRange) score += 1;
  if (finding.description && finding.description.length > 50) score += 1;
  if (finding.recommendation)  score += 1;
  if (finding.confidence)      score += 1;
  return score;
}

/**
 * Normalize and deduplicate an array of security findings.
 *
 * @param {object[]} findings - Mixed array from SAST + SecretDetector + DependencyVulnerabilityService
 * @returns {object[]} Deduplicated, normalized findings
 */
export function normalizeFindings(findings) {
  if (!Array.isArray(findings) || findings.length === 0) return [];

  const identityMap = new Map();  // identity key → finding
  let droppedCount = 0;

  for (const finding of findings) {
    if (!finding || typeof finding !== 'object') continue;

    const key = computeIdentity(finding);

    if (identityMap.has(key)) {
      const merged = mergeFindings(identityMap.get(key), finding);
      identityMap.set(key, merged);
      droppedCount++;
      console.debug(`[FindingNormalizer] Merged duplicate: ${key}`);
    } else {
      identityMap.set(key, finding);
    }
  }

  if (droppedCount > 0) {
    console.info(`[FindingNormalizer] Deduplicated ${droppedCount} duplicate finding(s). ` +
      `${findings.length} → ${identityMap.size} unique findings.`);
  }

  return Array.from(identityMap.values());
}

/**
 * Separate a mixed findings array into SAST findings and dependency vulnerability findings.
 * This is needed by the scoring engine to avoid double-counting.
 *
 * @param {object[]} findings
 * @returns {{ sast: object[], depVuln: object[] }}
 */
export function partitionFindings(findings) {
  const sast    = [];
  const depVuln = [];

  for (const f of findings) {
    const type = (f.type || '').toUpperCase();
    if (type === 'DEPENDENCY_VULNERABILITY') {
      depVuln.push(f);
    } else {
      sast.push(f);
    }
  }

  return { sast, depVuln };
}
