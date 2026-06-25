import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';

// Babel traverse might be exported as default or named depending on version/environment.
const traverse = _traverse.default || _traverse;

export class StaticAnalysisService {
  constructor() {
    this.metrics = {
      totalLines: 0,
      fileCount: 0,
      functionCount: 0,
      largestFunction: 0,
      maxNestingDepth: 0,
      componentCount: 0,
      hookUsageCount: 0,
      dependencyCount: 0,
      largeFilesCount: 0,
      largeFunctionsCount: 0,
      deadCodeIndicators: 0,
      duplicateImports: 0
    };
    this.functionLengths = [];
    this.importsSet = new Set();
  }

  analyzeFiles(files) {
    this.metrics.fileCount = files.length;

    files.forEach(file => {
      this.analyzeFile(file.path, file.content);
    });

    if (this.functionLengths.length > 0) {
      const sum = this.functionLengths.reduce((a, b) => a + b, 0);
      this.metrics.avgFunctionLength = sum / this.functionLengths.length;
    } else {
      this.metrics.avgFunctionLength = 0;
    }

    return this.metrics;
  }

  analyzeFile(filePath, content) {
    if (!content) return;

    const lines = content.split('\n');
    const lineCount = lines.length;
    this.metrics.totalLines += lineCount;

    if (lineCount > 300) {
      this.metrics.largeFilesCount++;
    }

    // Only parse JS/TS/JSX/TSX files
    if (!/\.(js|jsx|ts|tsx)$/.test(filePath)) {
      return;
    }

    try {
      const ast = babelParser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        errorRecovery: true
      });

      let fileImports = new Set();

      traverse(ast, {
        ImportDeclaration: (path) => {
          this.metrics.dependencyCount++;
          const importSource = path.node.source.value;
          
          if (fileImports.has(importSource)) {
            this.metrics.duplicateImports++;
          }
          fileImports.add(importSource);
          this.importsSet.add(importSource);
        },
        Function: (path) => {
          this.metrics.functionCount++;
          const start = path.node.loc?.start?.line || 0;
          const end = path.node.loc?.end?.line || 0;
          const length = end - start + 1;

          if (length > 0) {
            this.functionLengths.push(length);
            if (length > this.metrics.largestFunction) {
              this.metrics.largestFunction = length;
            }
            if (length > 50) {
              this.metrics.largeFunctionsCount++;
            }
          }

          // Check for empty functions (potential dead code)
          if (path.node.body && path.node.body.type === 'BlockStatement') {
            if (path.node.body.body.length === 0) {
              this.metrics.deadCodeIndicators++;
            }
          }

          // Check if it's a React component (heuristic: returns JSX and starts with capital letter)
          let isComponent = false;
          let hasJSX = false;
          path.traverse({
            JSXElement() { hasJSX = true; },
            JSXFragment() { hasJSX = true; }
          });

          const funcName = path.node.id?.name || (path.parent.type === 'VariableDeclarator' ? path.parent.id.name : null);
          if (hasJSX && funcName && /^[A-Z]/.test(funcName)) {
            this.metrics.componentCount++;
            isComponent = true;
          }
        },
        CallExpression: (path) => {
          const calleeName = path.node.callee.name;
          if (calleeName && calleeName.startsWith('use')) {
            this.metrics.hookUsageCount++;
          }
        },
        // Depth calculation
        BlockStatement: (path) => {
          let depth = 0;
          let current = path;
          while (current.parentPath) {
            if (['BlockStatement', 'IfStatement', 'ForStatement', 'WhileStatement', 'SwitchStatement'].includes(current.node.type)) {
              depth++;
            }
            current = current.parentPath;
          }
          if (depth > this.metrics.maxNestingDepth) {
            this.metrics.maxNestingDepth = depth;
          }
        }
      });
    } catch (e) {
      console.warn(`Failed to parse AST for ${filePath}:`, e.message);
    }
  }
}
