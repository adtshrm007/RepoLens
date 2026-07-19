import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

export class SecurityScannerService {
  constructor() {
    this.findings = [];
  }

  scanFiles(files) {
    this.findings = []; // reset on each call — prevents bleed-over if instance is reused
    files.forEach(file => {
      this.scanFile(file.path, file.content);
    });
    return this.findings;
  }

  scanFile(filePath, content) {
    if (!content) return;

    // 1. Regex based checks
    this.checkRegexPatterns(filePath, content);

    // 2. AST based checks (only for JS/TS)
    if (/\.(js|jsx|ts|tsx)$/.test(filePath)) {
      this.checkASTPatterns(filePath, content);
    }
  }

  checkRegexPatterns(filePath, content) {
    const lines = content.split('\n');
    
    // Pattern matches
    const patterns = [
      {
        regex: /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][a-zA-Z0-9\-_]{16,}["']/i,
        type: 'HARDCODED_SECRET',
        severity: 'CRITICAL',
        description: 'Hardcoded secret or API key found.'
      },
      {
        regex: /localStorage\.getItem\(['"](token|auth_token|access_token)['"]\)/i,
        type: 'LOCALSTORAGE_TOKEN',
        severity: 'MEDIUM',
        description: 'Auth tokens should preferably be stored in HttpOnly cookies, not localStorage.'
      }
    ];

    lines.forEach((line, index) => {
      for (const p of patterns) {
        if (p.regex.test(line)) {
          this.findings.push({
            type: p.type,
            severity: p.severity,
            file: filePath,
            lineNumber: index + 1,
            snippet: line.trim(),
            description: p.description
          });
        }
      }
    });
  }

  checkASTPatterns(filePath, content) {
    try {
      const ast = babelParser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        errorRecovery: true
      });

      const addFinding = (type, severity, description, path) => {
        const line = path.node.loc?.start?.line || 0;
        const code = content.split('\n')[line - 1] || '';
        this.findings.push({
          type,
          severity,
          file: filePath,
          lineNumber: line,
          snippet: code.trim(),
          description
        });
      };

      traverse(ast, {
        CallExpression: (path) => {
          if (path.node.callee.name === 'eval') {
            addFinding('EVAL_USAGE', 'CRITICAL', 'Usage of eval() is highly discouraged due to security risks.', path);
          }
          if (path.node.callee.type === 'Import') {
            // Check for unsafe dynamic imports (where arg is not a literal)
            if (path.node.arguments.length > 0 && path.node.arguments[0].type !== 'StringLiteral') {
              addFinding('UNSAFE_DYNAMIC_IMPORT', 'HIGH', 'Dynamic import with non-literal argument can lead to path traversal or RCE.', path);
            }
          }
        },
        NewExpression: (path) => {
          if (path.node.callee.name === 'Function') {
            addFinding('FUNCTION_CONSTRUCTOR', 'CRITICAL', 'Usage of new Function() is akin to eval() and poses security risks.', path);
          }
        },
        JSXAttribute: (path) => {
          if (path.node.name.name === 'dangerouslySetInnerHTML') {
            addFinding('DANGEROUSLY_SET_INNER_HTML', 'HIGH', 'dangerouslySetInnerHTML can lead to XSS vulnerabilities if data is not properly sanitized.', path);
          }
        }
      });
    } catch (e) {
      console.warn(`SecurityScanner failed to parse AST for ${filePath}:`, e.message);
    }
  }
}
