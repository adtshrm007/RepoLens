/**
 * SecurityRule (Base Class for SAST Rules)
 *
 * Enforces a standard structure for static analysis security checks.
 *
 * ── Finding shape ────────────────────────────────────────────────────────────
 * Every finding produced by a rule subclass will have:
 * {
 *   type:           string  — rule ID (e.g. 'EVAL_USAGE')
 *   ruleId:         string  — same as type (for compatibility with RuleEngine schema)
 *   category:       'SECURITY'
 *   severity:       'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 *   confidence:     'HIGH' | 'MEDIUM' | 'LOW'
 *   file:           string
 *   lineNumber:     number
 *   snippet:        string  — verbatim code line (trimmed, max 500 chars)
 *   description:    string
 *   explanation:    string  — alias for description (for RuleEngine compatibility)
 *   recommendation: string
 *   cwe:            { id, name, url } | null
 * }
 */
export class SecurityRule {
  /**
   * @param {string} id          - Unique rule identifier (e.g. 'EVAL_USAGE')
   * @param {string} severity    - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
   * @param {string} description - Human-readable description
   * @param {number|null} cwe    - CWE ID (without prefix, e.g. 94 for CWE-94)
   */
  constructor(id, severity, description, cwe = null) {
    this.id          = id;
    this.severity    = severity;
    this.description = description;
    this.cwe         = cwe;
  }

  /**
   * Create a structured, normalized finding.
   *
   * @param {string}      filePath            - Absolute or repo-relative path
   * @param {object}      node                - tree-sitter node (may be null)
   * @param {string[]}    lines               - Source file split by newline
   * @param {string|null} customDescription   - Optional description override
   * @param {object}      [overrides={}]      - Optional field overrides: { severity, confidence }
   * @returns {object} Normalized finding
   */
  createFinding(filePath, node, lines, customDescription = null, overrides = {}) {
    const lineNum = node ? node.startPosition.row + 1 : 1;
    const snippet = node ? (lines[lineNum - 1] || '').trim().substring(0, 500) : '';

    const severity   = overrides.severity   || this.severity;
    const confidence = overrides.confidence || 'HIGH';

    const description = customDescription || this.description;

    const finding = {
      // Core identity fields
      type:        this.id,
      ruleId:      this.id,           // RuleEngine compatibility
      category:    'SECURITY',        // All SAST findings are SECURITY category

      // Severity and confidence
      severity,
      confidence,

      // Location
      file:        filePath,
      lineNumber:  lineNum,

      // Content
      snippet:     snippet,
      description,
      explanation: description,       // RuleEngine compatibility alias

      // Guidance
      recommendation: this.getRecommendation(),
    };

    if (this.cwe) {
      finding.cwe = {
        id:   this.cwe,
        name: this._cweName(this.cwe),
        url:  `https://cwe.mitre.org/data/definitions/${this.cwe}.html`,
      };
    }

    return finding;
  }

  /**
   * Override in subclasses.
   * @returns {string} Remediation guidance specific to this rule.
   */
  getRecommendation() {
    return 'Review and secure this code segment.';
  }

  /**
   * Main evaluation logic. Must be overridden by subclasses.
   * @param {object}   rootNode  - tree-sitter root node
   * @param {string}   content   - Raw file content
   * @param {string}   filePath  - File path
   * @param {string[]} lines     - Content split by newline
   * @returns {object[]} Array of findings (may be empty)
   */
  evaluate(rootNode, content, filePath, lines) {
    return [];
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  _cweName(id) {
    // Common CWE short names for better UI display
    const CWE_NAMES = {
      20:   'Improper Input Validation',
      22:   'Path Traversal',
      78:   'OS Command Injection',
      79:   'Cross-site Scripting (XSS)',
      89:   'SQL Injection',
      94:   'Code Injection',
      312:  'Cleartext Storage of Sensitive Information',
      328:  'Use of Weak Hash',
      338:  'Use of Cryptographically Weak PRNG',
      434:  'Unrestricted File Upload',
      798:  'Use of Hard-coded Credentials',
      1321: 'Prototype Pollution',
    };
    return CWE_NAMES[id] || `CWE-${id}`;
  }
}
