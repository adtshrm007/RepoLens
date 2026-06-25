export class ClassificationService {
  constructor() {
    this.ignorePatterns = [
      'node_modules', 'dist', 'build', '.next', 'coverage', 'vendor',
      'public/assets', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      '.git', '.DS_Store'
    ];
  }

  isIgnored(filePath) {
    if (!filePath) return true;
    for (const pattern of this.ignorePatterns) {
      if (filePath.includes(pattern)) {
        return true;
      }
    }
    // Ignore non-source files
    if (filePath.endsWith('.min.js') || filePath.endsWith('.map') || filePath.endsWith('.svg') || filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.json') || filePath.endsWith('.md')) {
      return true;
    }
    return false;
  }

  classify(filePath, fileName) {
    const lowerName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    // 1. Context Providers
    if (lowerName.includes('context') || lowerPath.includes('/context/')) {
      return 'Context Provider';
    }

    // 2. Services
    if (lowerName.includes('service') || lowerPath.includes('/services/')) {
      return 'Service';
    }

    // 3. Controllers
    if (lowerName.includes('controller') || lowerPath.includes('/controllers/')) {
      return 'Controller';
    }

    // 4. Routes
    if (lowerName.includes('route') || lowerPath.includes('/routes/')) {
      return 'Route';
    }

    // 5. Middleware
    if (lowerName.includes('middleware') || lowerPath.includes('/middlewares/')) {
      return 'Middleware';
    }

    // 6. Hooks
    if (lowerName.startsWith('use') || lowerPath.includes('/hooks/')) {
      return 'Hook';
    }

    // 7. Database/Schema
    if (lowerName.includes('model') || lowerName.includes('schema') || lowerPath.includes('/models/')) {
      return 'Database Model';
    }

    // 8. Configuration
    if (lowerName.includes('config') || lowerPath.includes('/config/')) {
      return 'Configuration';
    }

    // 9. Utilities
    if (lowerName.includes('util') || lowerName.includes('helper') || lowerPath.includes('/utils/')) {
      return 'Utility';
    }

    // 10. Tests
    if (lowerName.includes('.test.') || lowerName.includes('.spec.') || lowerPath.includes('/__tests__/')) {
      return 'Test';
    }

    // 11. Components (heuristics: PascalCase files, or in /components/)
    if (lowerPath.includes('/components/') || /^[A-Z]/.test(fileName)) {
      return 'Component';
    }

    return 'Generic Module';
  }

  scoreImportance(classification, fileName) {
    const lowerName = fileName.toLowerCase();
    
    // Core App files
    if (['app.tsx', 'app.jsx', 'app.js', 'app.ts', 'index.tsx', 'index.jsx', 'index.js', 'index.ts', 'server.ts', 'server.js', 'main.ts', 'main.js'].includes(lowerName)) {
      return 100;
    }

    switch (classification) {
      case 'Context Provider':
        return 95;
      case 'Controller':
        return 90;
      case 'Service':
        return 90;
      case 'Route':
        return 85;
      case 'Middleware':
        return 80;
      case 'Database Model':
        return 80;
      case 'Hook':
        return 70;
      case 'Component':
        return 65;
      case 'Configuration':
        return 60;
      case 'Utility':
        return 50;
      case 'Test':
        return 30;
      default:
        return 40;
    }
  }

  processTree(files) {
    const validFiles = files.filter(f => f.type === 'file' && !this.isIgnored(f.path));
    
    return validFiles.map(file => {
      const type = this.classify(file.path, file.name);
      const importanceScore = this.scoreImportance(type, file.name);
      return {
        ...file,
        classification: type,
        importanceScore
      };
    });
  }
}
