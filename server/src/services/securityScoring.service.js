/**
 * SecurityScoringEngine
 *
 * Computes a standalone 0–100 RepoLens Security Score.
 *
 * IMPORTANT DISTINCTION:
 *   CVSS:                  Individual vulnerability severity (industry standard).
 *   RepoLens Security Score: Aggregate repository-level security posture (our metric).
 *
 * The formula is transparent and configurable via DEDUCTIONS and CAPS constants.
 *
 * Deduction logic:
 *   Every finding deducts points. Caps per category prevent a single
 *   misconfigured file from collapsing the entire score to 0.
 *
 * Confidence weighting:
 *   HIGH confidence findings score at 100% deduction weight.
 *   MEDIUM confidence findings score at 60% deduction weight.
 *   LOW confidence findings score at 30% deduction weight.
 *
 * The score never goes below 0. A score of 0 indicates extreme risk.
 */

// Deduction amounts per severity (security findings)
const SAST_DEDUCTIONS = {
  CRITICAL: 15,  // e.g. eval(), SQL injection, hardcoded secret
  HIGH:     8,   // e.g. XSS, command injection possibility
  MEDIUM:   4,   // e.g. localStorage token storage
  LOW:      1,   // e.g. informational
};

// Deduction amounts per severity (dependency vulnerabilities)
const DEP_DEDUCTIONS = {
  CRITICAL: 20,
  HIGH:     12,
  MEDIUM:   5,
  LOW:      2,
};

// Max deduction per category (prevents single-category collapse)
const CAPS = {
  sastCritical:  30,   // max -30 from CRITICAL SAST findings
  sastHigh:      20,   // max -20 from HIGH SAST findings
  sastMedium:    15,   // max -15 from MEDIUM SAST findings
  sastLow:        5,   // max -5 from LOW SAST findings
  depCritical:   30,   // max -30 from CRITICAL dep vulns
  depHigh:       20,   // max -20 from HIGH dep vulns
  depMedium:     10,   // max -10 from MEDIUM dep vulns
  depLow:         5,   // max -5 from LOW dep vulns
  secrets:       20,   // max -20 from exposed secrets
};

// Confidence multipliers
const CONFIDENCE_WEIGHT = {
  HIGH:   1.0,
  MEDIUM: 0.6,
  LOW:    0.3,
};

export class SecurityScoringEngine {
  /**
   * @param {Array} securityFindings - from SASTEngine + SecretDetector (all types mixed)
   * @param {Array} depVulnFindings  - from DependencyVulnerabilityService
   */
  constructor(securityFindings = [], depVulnFindings = []) {
    this.securityFindings = securityFindings;
    this.depVulnFindings  = depVulnFindings;
  }

  /**
   * Compute the security score with a full breakdown for UI explainability.
   * @returns {{ score: number, breakdown: object, deductions: Array }}
   */
  calculate() {
    let score = 100;
    const deductions = [];

    // ── SAST Findings ─────────────────────────────────────────────────────────
    const secretFindings = this.securityFindings.filter(
      f => f.type === 'HARDCODED_SECRET' || f.type === 'SECRET_IN_CONFIG'
    );
    const sastFindings = this.securityFindings.filter(
      f => f.type !== 'HARDCODED_SECRET' && f.type !== 'SECRET_IN_CONFIG' &&
           f.type !== 'DEPENDENCY_VULNERABILITY'
    );

    // SAST by severity
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const group = sastFindings.filter(f => f.severity?.toUpperCase() === severity);
      if (!group.length) continue;

      const rawDeduction = group.reduce((sum, f) => {
        const weight = CONFIDENCE_WEIGHT[f.confidence?.toUpperCase()] ?? 1.0;
        return sum + (SAST_DEDUCTIONS[severity] ?? 1) * weight;
      }, 0);

      const capKey = `sast${severity.charAt(0) + severity.slice(1).toLowerCase()}`;
      const capped = Math.min(rawDeduction, CAPS[capKey] ?? rawDeduction);

      score -= capped;
      deductions.push({
        category:  'SAST',
        severity,
        count:     group.length,
        rawPoints: rawDeduction,
        applied:   capped,
        capped:    capped < rawDeduction,
        label:     `${group.length} ${severity.toLowerCase()} SAST finding${group.length > 1 ? 's' : ''}`,
      });
    }

    // ── Exposed Secrets ────────────────────────────────────────────────────────
    if (secretFindings.length) {
      const rawDeduction = secretFindings.length * 10;
      const capped = Math.min(rawDeduction, CAPS.secrets);
      score -= capped;
      deductions.push({
        category:  'SECRETS',
        severity:  'CRITICAL',
        count:     secretFindings.length,
        rawPoints: rawDeduction,
        applied:   capped,
        capped:    capped < rawDeduction,
        label:     `${secretFindings.length} exposed secret${secretFindings.length > 1 ? 's' : ''}`,
      });
    }

    // ── Dependency Vulnerabilities ─────────────────────────────────────────────
    for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
      const group = this.depVulnFindings.filter(f => f.severity?.toUpperCase() === severity);
      if (!group.length) continue;

      const rawDeduction = group.length * (DEP_DEDUCTIONS[severity] ?? 2);
      const capKey = `dep${severity.charAt(0) + severity.slice(1).toLowerCase()}`;
      const capped = Math.min(rawDeduction, CAPS[capKey] ?? rawDeduction);

      score -= capped;
      deductions.push({
        category:  'DEPENDENCY',
        severity,
        count:     group.length,
        rawPoints: rawDeduction,
        applied:   capped,
        capped:    capped < rawDeduction,
        label:     `${group.length} ${severity.toLowerCase()} dependency vulnerability${group.length > 1 ? 'ies' : 'y'}`,
      });
    }

    const finalScore = Math.round(Math.max(0, Math.min(100, score)));

    return {
      score: finalScore,
      grade: this._grade(finalScore),
      breakdown: {
        sastFindings:    sastFindings.length,
        secretFindings:  secretFindings.length,
        depVulnFindings: this.depVulnFindings.length,
        totalDeducted:   Math.round(100 - finalScore),
      },
      deductions,
    };
  }

  _grade(score) {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
