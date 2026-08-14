/**
 * DependencyAnalyzer
 *
 * Builds a directed dependency graph from CSTRepoProfile.
 * Reads pre-extracted imports — does NOT re-parse any source.
 *
 * Replaces the Babel-based DependencyGraphService logic.
 * The DependencyGraphService now calls this class and remains
 * as a thin compatibility adapter.
 *
 * Output:
 * {
 *   nodes:    GraphNode[]
 *   edges:    GraphEdge[]
 *   cycles:   string[][]      — each cycle is an array of node IDs forming the loop
 *   hotspots: HotspotNode[]   — top 5 most imported files
 *   metrics: {
 *     totalNodes, totalEdges, circularCount, maxFanIn, maxFanOut
 *   }
 * }
 *
 * GraphNode: { id, label, type, path, fileType, fanIn, fanOut, metrics? }
 * GraphEdge: { id, source, target, type }
 */
export class DependencyAnalyzer {
  /**
   * @param {CSTRepoProfile} repoProfile
   * @returns {DependencyGraph}
   */
  buildGraph(repoProfile) {
    const nodes = new Map();  // id → GraphNode
    const edges = [];
    const edgeIds = new Set();

    // ── 1. Initialize a node for every analyzed file ────────────────
    for (const profile of repoProfile.fileProfiles) {
      const id = this._normalizePath(profile.filePath);
      nodes.set(id, {
        id,
        label:    profile.fileName,
        type:     'file',
        path:     profile.filePath,
        fileType: profile.fileType,
        metrics: {
          cyclomaticComplexity: profile.cyclomaticComplexity,
          cognitiveComplexity:  profile.cognitiveComplexity,
          totalFunctions:       profile.totalFunctions,
          totalLines:           profile.totalLines,
        },
        fanIn:  0,
        fanOut: 0,
      });
    }

    // ── 2. Build edges from imports ─────────────────────────────────
    for (const profile of repoProfile.fileProfiles) {
      const sourceId = this._normalizePath(profile.filePath);
      const imports  = repoProfile.getImportsFor(profile.filePath);

      for (const imp of imports) {
        let targetId;

        if (imp.isRelative) {
          // Resolve relative path from source file's location
          targetId = this._resolveRelative(profile.filePath, imp.source);
          // Try to find the actual node (handle missing extensions)
          targetId = this._matchNode(targetId, nodes) ?? targetId;
        } else {
          // Third-party or absolute import — create external dependency node
          targetId = imp.source;
          if (!nodes.has(targetId)) {
            nodes.set(targetId, {
              id:      targetId,
              label:   targetId,
              type:    'dependency',   // external package
              path:    targetId,
              fanIn:   0,
              fanOut:  0,
            });
          }
        }

        const edgeId = `${sourceId}->${targetId}`;
        if (!edgeIds.has(edgeId)) {
          edgeIds.add(edgeId);
          edges.push({
            id:     edgeId,
            source: sourceId,
            target: targetId,
            type:   imp.isCommonJS ? 'require' : 'import',
          });
        }
      }
    }

    // ── 3. Compute fan-in / fan-out per node ──────────────────────
    for (const edge of edges) {
      const src = nodes.get(edge.source);
      const tgt = nodes.get(edge.target);
      if (src) src.fanOut++;
      if (tgt) tgt.fanIn++;
    }

    // ── 4. Detect circular dependencies (DFS) ─────────────────────
    const cycles = this._detectCycles(nodes, edges);

    // ── 5. Find hotspot files (highest fan-in among internal files) ─
    const hotspots = Array.from(nodes.values())
      .filter(n => n.type === 'file')
      .sort((a, b) => b.fanIn - a.fanIn)
      .slice(0, 5)
      .map(n => ({
        path:   n.path,
        label:  n.label,
        fanIn:  n.fanIn,
        fanOut: n.fanOut,
      }));

    const nodeArray = Array.from(nodes.values());

    return {
      nodes: nodeArray,
      edges,
      cycles,
      hotspots,
      metrics: {
        totalNodes:     nodeArray.length,
        totalEdges:     edges.length,
        circularCount:  cycles.length,
        maxFanIn:  nodeArray.reduce((m, n) => Math.max(m, n.fanIn), 0),
        maxFanOut: nodeArray.reduce((m, n) => Math.max(m, n.fanOut), 0),
      },
    };
  }

  // ── Private: cycle detection ──────────────────────────────────────────────

  /**
   * DFS-based cycle detection (Tarjan's simple variant).
   * Only considers internal file nodes to avoid noise from external deps.
   * Returns an array of cycles, each cycle is an array of node IDs.
   */
  _detectCycles(nodes, edges) {
    // Build adjacency list (internal files only)
    const adj = new Map();
    for (const [id, node] of nodes) {
      if (node.type === 'file') adj.set(id, []);
    }
    for (const edge of edges) {
      if (adj.has(edge.source) && adj.has(edge.target)) {
        adj.get(edge.source).push(edge.target);
      }
    }

    const cycles = [];
    const visited  = new Set();
    const onStack  = new Set();
    const stackArr = [];

    const dfs = (nodeId) => {
      if (onStack.has(nodeId)) {
        // Back edge found — extract the cycle
        const idx = stackArr.indexOf(nodeId);
        if (idx !== -1) {
          cycles.push([...stackArr.slice(idx), nodeId]);
        }
        return;
      }
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      onStack.add(nodeId);
      stackArr.push(nodeId);

      for (const neighbor of adj.get(nodeId) ?? []) {
        dfs(neighbor);
      }

      onStack.delete(nodeId);
      stackArr.pop();
    };

    for (const id of adj.keys()) {
      if (!visited.has(id)) dfs(id);
    }

    return cycles;
  }

  // ── Private: path utilities ───────────────────────────────────────────────

  _normalizePath(filePath) {
    return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
  }

  _resolveRelative(sourcePath, importPath) {
    const sourceParts = this._normalizePath(sourcePath).split('/');
    sourceParts.pop(); // remove filename, keep directory

    for (const part of importPath.split('/')) {
      if (part === '.')  continue;
      if (part === '..') sourceParts.pop();
      else               sourceParts.push(part);
    }

    return sourceParts.join('/');
  }

  /**
   * Try to find the actual node for an import path that may be missing
   * its file extension (e.g., './utils' → './utils.js').
   */
  _matchNode(resolvedPath, nodes) {
    if (nodes.has(resolvedPath)) return resolvedPath;

    // Try appending common extensions
    for (const ext of ['.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts']) {
      const candidate = resolvedPath + ext;
      if (nodes.has(candidate)) return candidate;
    }
    return null;
  }
}
