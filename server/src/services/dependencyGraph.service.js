/**
 * DependencyGraphService — thin adapter (post tree-sitter upgrade)
 *
 * In the new pipeline, dependency graph construction is handled by
 * DependencyAnalyzer (src/analysis/analyzers/DependencyAnalyzer.js),
 * which reads pre-extracted imports from CSTRepoProfile.
 *
 * This class is preserved for backward compatibility with:
 *   - analysis.controller.js (V1.5 endpoints that call buildGraph directly)
 *   - Any code referencing DependencyGraphService
 *
 * In the main ScannerService pipeline, DependencyAnalyzer is called directly.
 * This adapter delegates to DependencyAnalyzer when given a CSTRepoProfile,
 * or returns a minimal graph when given raw files (legacy path).
 *
 * The Babel-based implementation is removed.
 */
import { DependencyAnalyzer } from '../analysis/analyzers/DependencyAnalyzer.js';

export class DependencyGraphService {
  constructor() {
    this._analyzer = new DependencyAnalyzer();
  }

  /**
   * Build a dependency graph.
   *
   * @param {CSTRepoProfile | object[]} input
   *   - If CSTRepoProfile: delegate to DependencyAnalyzer (new path).
   *   - If array (legacy): return empty graph (content no longer re-parsed here).
   * @returns {{ nodes: object[], edges: object[], cycles?: string[][], hotspots?: object[] }}
   */
  buildGraph(input) {
    // New path: CSTRepoProfile
    if (input && typeof input.aggregate === 'function') {
      return this._analyzer.buildGraph(input);
    }

    // Legacy path: raw files array — no longer re-parsed, return empty graph
    // The scanner now calls DependencyAnalyzer directly after CST extraction.
    console.warn('[DependencyGraphService] Called with raw files — returning empty graph. Use DependencyAnalyzer with CSTRepoProfile instead.');
    return { nodes: [], edges: [], cycles: [], hotspots: [], metrics: {} };
  }
}
