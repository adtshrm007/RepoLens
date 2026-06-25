import * as babelParser from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;

export class DependencyGraphService {
  constructor() {
    this.nodes = new Map(); // id -> { id, label, type, path }
    this.edges = []; // { source, target, type }
    this.edgeIds = new Set(); // Prevent duplicate keys in ReactFlow
  }

  buildGraph(files) {
    // 1. Initialize nodes for all files
    files.forEach(file => {
      // Create a node ID based on filename/path
      const id = this.normalizePath(file.path);
      const label = this.getLabel(file.path);
      
      this.nodes.set(id, {
        id,
        label,
        type: 'file',
        path: file.path
      });
    });

    // 2. Parse and build edges
    files.forEach(file => {
      this.analyzeFileDependencies(file.path, file.content);
    });

    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }

  normalizePath(filePath) {
    // Simplified normalization for the graph
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  getLabel(filePath) {
    const parts = filePath.split(/[\/\\]/);
    return parts[parts.length - 1];
  }

  resolveImportPath(sourcePath, importPath) {
    // Very basic resolution. In a real system, you'd handle node_modules, aliases, etc.
    if (importPath.startsWith('.')) {
      const sourceParts = this.normalizePath(sourcePath).split('/');
      sourceParts.pop(); // remove file name
      
      const importParts = importPath.split('/');
      for (const part of importParts) {
        if (part === '.') continue;
        if (part === '..') {
          sourceParts.pop();
        } else {
          sourceParts.push(part);
        }
      }
      
      let resolved = sourceParts.join('/');
      // Assume .js or .ts if extension is missing (simplified)
      if (!/\.[a-z]+$/.test(resolved)) {
        // We'll just leave it as is, and the frontend can handle dangling edges
      }
      return resolved;
    }
    
    // For third-party or absolute imports
    return importPath;
  }

  analyzeFileDependencies(filePath, content) {
    if (!content || !/\.(js|jsx|ts|tsx)$/.test(filePath)) return;

    try {
      const ast = babelParser.parse(content, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript', 'classProperties', 'decorators-legacy'],
        errorRecovery: true
      });

      const sourceId = this.normalizePath(filePath);

      traverse(ast, {
        ImportDeclaration: (path) => {
          const importSource = path.node.source.value;
          
          let targetId;
          if (importSource.startsWith('.')) {
            targetId = this.resolveImportPath(filePath, importSource);
          } else {
            targetId = importSource;
            // Add third-party module node if not exists
            if (!this.nodes.has(targetId)) {
              this.nodes.set(targetId, {
                id: targetId,
                label: targetId,
                type: 'dependency',
                path: targetId
              });
            }
          }

          const edgeId = `${sourceId}->${targetId}`;
          if (!this.edgeIds.has(edgeId)) {
            this.edgeIds.add(edgeId);
            this.edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              type: 'import'
            });
          }
        }
      });
    } catch (e) {
      console.warn(`DependencyGraphService failed to parse AST for ${filePath}:`, e.message);
    }
  }
}
