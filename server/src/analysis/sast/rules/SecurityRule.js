/**
 * SecurityRule (Base Class for SAST Rules)
 * 
 * Enforces a standard structure for static analysis security checks.
 */
export class SecurityRule {
  /**
   * @param {string} id - Unique identifier (e.g., 'EVAL_USAGE')
   * @param {string} severity - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
   * @param {string} description - Human-readable description
   * @param {number|null} cwe - Optional CWE ID
   */
  constructor(id, severity, description, cwe = null) {
    this.id = id;
    this.severity = severity;
    this.description = description;
    this.cwe = cwe;
  }

  /**
   * Create a structured finding.
   * @param {string} filePath 
   * @param {object} node - tree-sitter node
   * @param {string[]} lines - source file lines
   * @param {string} customDescription - optional override
   * @returns {object} finding
   */
  createFinding(filePath, node, lines, customDescription = null) {
    const lineNum = node ? node.startPosition.row + 1 : 1;
    const snippet = node ? lines[lineNum - 1] || '' : '';
    
    const finding = {
      type: this.id,
      severity: this.severity,
      file: filePath,
      lineNumber: lineNum,
      snippet: snippet.trim().substring(0, 500),
      description: customDescription || this.description,
      recommendation: this.getRecommendation()
    };

    if (this.cwe) {
      finding.cwe = {
        id: this.cwe,
        name: this.id.replace(/_/g, ' '),
        url: `https://cwe.mitre.org/data/definitions/${this.cwe}.html`
      };
    }

    return finding;
  }

  /**
   * To be overridden by subclasses.
   * @returns {string} Default recommendation.
   */
  getRecommendation() {
    return 'Review and secure this code segment.';
  }

  /**
   * Main evaluation logic. To be implemented by subclasses.
   * @param {object} rootNode 
   * @param {string} content 
   * @param {string} filePath 
   * @param {string[]} lines 
   * @returns {object[]} array of findings
   */
  evaluate(rootNode, content, filePath, lines) {
    return [];
  }
}
