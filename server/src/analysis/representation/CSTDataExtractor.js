import crypto from 'crypto';
import { createFileProfile } from './FileProfile.js';
import { ComplexityAnalyzer } from '../analyzers/ComplexityAnalyzer.js';

/**
 * CSTDataExtractor
 *
 * Walks a tree-sitter CST (produced by TreeSitterParser) and populates a FileProfile.
 * This is the ONLY place in the codebase that traverses CST nodes.
 * All downstream analyzers (staticAnalysis, dependencyGraph, ruleEngine) read
 * the resulting FileProfile — they never re-parse source.
 *
 * Usage:
 *   const extractor = new CSTDataExtractor();
 *   const profile = extractor.extract(fileMetadata, parseResult);
 */

const FUNCTION_NODE_TYPES = new Set([
  'function_declaration',
  'function_expression',
  'arrow_function',
  'method_definition',
  'generator_function_declaration',
  'generator_function',
]);

const NESTING_NODE_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'for_of_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'try_statement',
]);

const HOOK_PATTERN = /^use[A-Z]/;

// Known DB clients detected via import source
const DB_CLIENT_KEYWORDS = ['prisma', 'mongoose', 'sequelize', 'knex', 'typeorm', 'pg', 'mysql2', 'mysql', 'redis', 'mongodb'];

// DB method names detected via call expressions
const DB_METHODS = new Set([
  'find', 'findOne', 'findMany', 'findUnique', 'findFirst', 'findById',
  'create', 'createMany', 'createOne',
  'update', 'updateMany', 'updateOne',
  'delete', 'deleteMany', 'deleteOne',
  'upsert', 'aggregate', 'count', 'save',
  'insertOne', 'insertMany',
  'exec', 'query', 'raw',
]);

// Filesystem methods from Node.js 'fs' module
const FS_METHODS = new Set([
  'readFile', 'writeFile', 'mkdir', 'mkdirSync', 'rmdir', 'unlink',
  'readdir', 'stat', 'access', 'appendFile', 'copyFile', 'rename',
  'createReadStream', 'createWriteStream', 'readFileSync', 'writeFileSync',
]);

export class CSTDataExtractor {
  constructor() {
    this.complexityAnalyzer = new ComplexityAnalyzer();
  }

  /**
   * Extract a complete FileProfile from a parse result.
   *
   * @param {object} fileMetadata - { path, name, extension, classification, fileId, content }
   * @param {ParseResult} parseResult - from TreeSitterParser
   * @returns {FileProfile}
   */
  extract(fileMetadata, parseResult) {
    const { path, name, extension, classification, fileId, content } = fileMetadata;

    const profile = createFileProfile();

    // ── Identity ────────────────────────────────────────────────────
    profile.filePath    = path;
    profile.fileName    = name;
    profile.extension   = extension;
    profile.fileType    = classification || 'Generic Module';
    profile.fileId      = fileId || null;
    profile.language    = parseResult.language;
    profile.supported   = parseResult.supported;
    profile.parseError  = !parseResult.success;
    profile.skippedReason = parseResult.skippedReason;

    // Content hash — always computed from raw string (no CST needed)
    if (content) {
      profile.contentHash = crypto.createHash('sha256').update(content).digest('hex');
    }

    // ── Line counts — always computable from raw content ────────────
    if (content) {
      const lineCounts = this._countLines(content);
      profile.totalLines    = lineCounts.totalLines;
      profile.codeLines     = lineCounts.codeLines;
      profile.commentLines  = lineCounts.commentLines;
      profile.blankLines    = lineCounts.blankLines;
    }

    // If parse failed, return a partial profile (line counts only)
    if (!parseResult.success || !parseResult.rootNode) {
      return profile;
    }

    const root = parseResult.rootNode;

    // ── Imports ──────────────────────────────────────────────────────
    profile.imports        = this._extractImports(root);
    profile.dependencyCount = profile.imports.length;
    profile.duplicateImports = this._countDuplicateImports(profile.imports);

    // ── Functions ────────────────────────────────────────────────────
    const functions = this._extractFunctions(root, content);
    profile.functions      = functions;
    profile.totalFunctions = functions.length;

    if (functions.length > 0) {
      const lengths = functions.map(f => f.length);
      profile.avgFunctionLength   = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      profile.maxFunctionLength   = Math.max(...lengths);
      profile.largeFunctionsCount = functions.filter(f => f.length > 50).length;
      profile.deadCodeCount       = functions.reduce((sum, f) => sum + f.unreachableCount, 0);
      profile.totalReturnCount = functions.reduce((sum, f) => sum + f.returnCount, 0);

      // File-level complexity: sum across functions
      profile.cyclomaticComplexity = functions.reduce((sum, f) => sum + f.cyclomaticComplexity, 0);
      profile.cognitiveComplexity  = functions.reduce((sum, f) => sum + f.cognitiveComplexity, 0);
      profile.maxNestingDepth      = Math.max(...functions.map(f => f.maxNestingDepth));
    } else {
      // File has no functions but may have nested blocks at module level
      profile.maxNestingDepth = this._computeMaxNesting(root, 0);
    }

    // ── React-specific ────────────────────────────────────────────────
    const reactData = this._extractReactData(root, functions);
    profile.componentCount = reactData.componentCount;
    profile.hookUsageCount = reactData.hookUsageCount;
    profile.hooksUsed      = reactData.hooksUsed;

    // ── Duplicate code (hash-based structural comparison) ─────────────
    const duplicateData = this._detectDuplicates(root);
    profile.duplicateCodeBlocks = duplicateData.duplicateCount;
    profile.codeBlockHashes = duplicateData.hashes;

    // ── Backend signals ────────────────────────────────────────────────
    profile.backend = this._extractBackendSignals(root, profile.imports);

    return profile;
  }

  // ── Private: line counting ────────────────────────────────────────────────

  _countLines(content) {
    const lines = content.split('\n');
    let codeLines = 0, commentLines = 0, blankLines = 0;
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '') {
        blankLines++;
      } else if (inBlockComment) {
        commentLines++;
        if (trimmed.includes('*/')) inBlockComment = false;
      } else if (trimmed.startsWith('//')) {
        commentLines++;
      } else if (trimmed.startsWith('/*') || trimmed.startsWith('/**')) {
        commentLines++;
        if (!trimmed.includes('*/')) inBlockComment = true;
      } else {
        codeLines++;
      }
    }

    return { totalLines: lines.length, codeLines, commentLines, blankLines };
  }

  // ── Private: imports ──────────────────────────────────────────────────────

  _extractImports(root) {
    const imports = [];
    const seen = new Set();

    this._walk(root, (node) => {
      // ES import statements
      if (node.type === 'import_statement') {
        const sourceNode = node.children.find(c => c.type === 'string');
        if (!sourceNode) return;

        const source = sourceNode.text.replace(/['"]/g, '');
        const specifiers = [];
        let isDefault = false;
        let isNamespace = false;

        const clause = node.children.find(c => c.type === 'import_clause');
        if (clause) {
          for (const child of clause.children ?? []) {
            if (child.type === 'identifier') {
              isDefault = true;
              specifiers.push(child.text);
            } else if (child.type === 'namespace_import') {
              isNamespace = true;
            } else if (child.type === 'named_imports') {
              for (const spec of child.namedChildren ?? []) {
                if (spec.type === 'import_specifier') {
                  const nameNode = spec.namedChildren[0];
                  if (nameNode) specifiers.push(nameNode.text);
                }
              }
            }
          }
        }

        imports.push({
          source,
          isRelative: source.startsWith('.'),
          specifiers,
          isDefault,
          isNamespace,
          line: node.startPosition.row + 1,
          isCommonJS: false,
        });
      }

      // CommonJS require() — detect top-level and destructured
      if (node.type === 'call_expression') {
        const callee = node.children[0];
        if (callee?.text === 'require') {
          const args = node.children.find(c => c.type === 'arguments');
          const strArg = args?.namedChildren?.[0];
          if (strArg?.type === 'string') {
            const source = strArg.text.replace(/['"]/g, '');
            const key = `cjs:${source}`;
            if (!seen.has(key)) {
              seen.add(key);
              imports.push({
                source,
                isRelative: source.startsWith('.'),
                specifiers: [],
                isDefault: true,
                isNamespace: false,
                line: node.startPosition.row + 1,
                isCommonJS: true,
              });
            }
          }
        }
      }
    });

    return imports;
  }

  _countDuplicateImports(imports) {
    const seen = new Set();
    let dupes = 0;
    for (const imp of imports) {
      if (seen.has(imp.source)) dupes++;
      else seen.add(imp.source);
    }
    return dupes;
  }

  // ── Private: functions ────────────────────────────────────────────────────

  _extractFunctions(root, content) {
    const functions = [];

    this._walk(root, (node) => {
      if (!FUNCTION_NODE_TYPES.has(node.type)) return;

      const startLine = node.startPosition.row + 1;
      const endLine   = node.endPosition.row + 1;
      const length    = endLine - startLine + 1;

      const name = this._getFunctionName(node);

      const firstChild = node.children?.[0];
      const isAsync     = firstChild?.text === 'async';
      const isArrow     = node.type === 'arrow_function';
      const isGenerator = node.type.includes('generator');

      const params = node.children?.find(c => c.type === 'formal_parameters');
      const parameterCount = params?.namedChildren?.length ?? 0;
      const isProps = this._detectIsProps(node, name, parameterCount);

      const returnCount    = this._countReturns(node);
      const unreachableCount = this._countUnreachableStatements(node);
      const cyclomatic     = this.complexityAnalyzer.computeCyclomatic(node);
      const cognitive      = this.complexityAnalyzer.computeCognitive(node);
      const maxNestingDepth = this._computeMaxNesting(node, 0);

      functions.push({
        name: name ?? 'anonymous',
        lineStart: startLine,
        lineEnd: endLine,
        length,
        isArrow,
        isAsync,
        isGenerator,
        parameterCount,
        isProps,
        returnCount,
        unreachableCount,
        cyclomaticComplexity: cyclomatic.complexity,
        decisionPoints: cyclomatic.decisionPoints,
        cognitiveComplexity: cognitive.score,
        cognitiveBreakdown: cognitive.breakdown,
        maxNestingDepth,
      });
    });

    return functions;
  }

  _countUnreachableStatements(fnNode) {
    let count = 0;
    this._walkSkipNestedFns(fnNode, (node) => {
      if (node.type === 'statement_block') {
        let afterTerminator = false;
        for (const child of node.namedChildren ?? []) {
          if (afterTerminator) {
            count++;
          }
          if (child.type === 'return_statement' || child.type === 'throw_statement' || child.type === 'break_statement' || child.type === 'continue_statement') {
            afterTerminator = true;
          }
        }
      }
    });
    return count;
  }

  _getFunctionName(node) {
    // function foo() {} or function* foo() {}
    if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
      return node.children?.find(c => c.type === 'identifier')?.text ?? null;
    }

    // class { foo() {} }
    if (node.type === 'method_definition') {
      return node.children?.find(c =>
        c.type === 'property_identifier' || c.type === 'identifier'
      )?.text ?? null;
    }

    // const foo = () => {} or const foo = function() {}
    const parent = node.parent;
    if (parent?.type === 'variable_declarator') {
      return parent.children?.find(c => c.type === 'identifier')?.text ?? null;
    }
    if (parent?.type === 'assignment_expression') {
      return parent.children?.[0]?.text ?? null;
    }
    // { foo: () => {} }
    if (parent?.type === 'pair') {
      return parent.children?.[0]?.text ?? null;
    }

    return null;
  }

  _detectIsProps(node, name, parameterCount) {
    // A function is likely a React component receiving props if:
    // 1. Name is PascalCase
    // 2. Exactly one parameter
    // 3. That parameter is a plain identifier or object destructuring
    if (parameterCount !== 1 || !name || !/^[A-Z]/.test(name)) return false;

    const params = node.children?.find(c => c.type === 'formal_parameters');
    const first  = params?.namedChildren?.[0];
    return first?.type === 'identifier' || first?.type === 'object_pattern';
  }

  _countReturns(fnNode) {
    let count = 0;
    this._walkSkipNestedFns(fnNode, (node) => {
      if (node.type === 'return_statement') count++;
    });
    return count;
  }

  _computeMaxNesting(node, depth) {
    let max = depth;
    for (const child of node.children ?? []) {
      const childDepth = NESTING_NODE_TYPES.has(child.type) ? depth + 1 : depth;
      const childMax   = this._computeMaxNesting(child, childDepth);
      if (childMax > max) max = childMax;
    }
    return max;
  }

  // ── Private: React ────────────────────────────────────────────────────────

  _extractReactData(root, functions) {
    let hookUsageCount = 0;
    const hooksUsed = new Set();

    // Component count: named PascalCase functions
    const componentCount = functions.filter(
      f => f.name && /^[A-Z]/.test(f.name)
    ).length;

    // Hook calls: any call_expression whose callee starts with 'use' + capital
    this._walk(root, (node) => {
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        let hookName = null;

        if (callee?.type === 'identifier') {
          hookName = callee.text;
        } else if (callee?.type === 'member_expression') {
          // e.g. React.useState
          hookName = callee.children?.[callee.children.length - 1]?.text;
        }

        if (hookName && HOOK_PATTERN.test(hookName)) {
          hookUsageCount++;
          hooksUsed.add(hookName);
        }
      }
    });

    return { componentCount, hookUsageCount, hooksUsed: [...hooksUsed] };
  }

  // ── Private: duplicate code ───────────────────────────────────────────────

  _detectDuplicates(root) {
    const blockHashes = new Map();
    const hashes = [];
    let duplicateCount = 0;

    this._walk(root, (node) => {
      // Only compare meaningful statement blocks (≥ 3 statements)
      if (node.type === 'statement_block' && (node.namedChildren?.length ?? 0) >= 3) {
        const canonical = this._canonicalizeNode(node);
        const hash = this._hashString(canonical);
        hashes.push(hash);
        if (blockHashes.has(hash)) {
          duplicateCount++;
        } else {
          blockHashes.set(hash, true);
        }
      }
    });

    return { duplicateCount, hashes };
  }

  /** Structural serialization — ignores identifier names, captures shape. */
  _canonicalizeNode(node) {
    if (!node.children?.length) return node.type;
    return `${node.type}(${node.children.map(c => this._canonicalizeNode(c)).join(',')})`;
  }

  _hashString(str) {
    return crypto.createHash('md5').update(str).digest('hex').slice(0, 12);
  }

  // ── Private: backend signals ──────────────────────────────────────────────

  _extractBackendSignals(root, imports) {
    const dbClients    = new Set();
    const dbOperations = new Set();
    const filesystemOps = new Set();
    let dbCallCount       = 0;
    let hasMiddleware     = false;
    let hasController     = false;
    let hasFilesystemOps  = false;
    let hasErrorHandling  = false;
    let asyncFunctionCount = 0;

    // Detect DB clients from import sources
    for (const imp of imports) {
      const src = imp.source.toLowerCase();
      for (const client of DB_CLIENT_KEYWORDS) {
        if (src === client || src.startsWith(`${client}/`) || src.includes(`/${client}`)) {
          dbClients.add(client);
        }
      }
      if (src === 'fs' || src === 'fs/promises' || src === 'node:fs' || src === 'node:fs/promises') {
        filesystemOps.add('fs');
      }
    }

    this._walk(root, (node) => {
      // DB calls: .findMany(), .create(), etc.
      if (node.type === 'call_expression') {
        const callee = node.children?.[0];
        if (callee?.type === 'member_expression') {
          const method = callee.children?.[callee.children.length - 1]?.text;
          if (method && DB_METHODS.has(method)) {
            dbCallCount++;
            dbOperations.add(method);
          }
          // fs.readFile, fs.writeFile, etc.
          const obj = callee.children?.[0]?.text;
          if ((obj === 'fs' || obj === 'promises') && FS_METHODS.has(method)) {
            filesystemOps.add(method);
            hasFilesystemOps = true;
          }
        }
      }

      // Middleware / Controller detection from function signatures
      if (FUNCTION_NODE_TYPES.has(node.type)) {
        const params = node.children?.find(c => c.type === 'formal_parameters');
        if (params) {
          const paramNames = params.namedChildren?.map(p => p.text) ?? [];
          const hasReq = paramNames.some(p => /^req/i.test(p) || p === 'request');
          const hasRes = paramNames.some(p => /^res/i.test(p) || p === 'response');
          const hasNext = paramNames.some(p => /^next/i.test(p));

          if (hasReq && hasRes && hasNext) hasMiddleware = true;
          else if (hasReq && hasRes)       hasController = true;
        }

        // Async function count
        if (node.children?.[0]?.text === 'async') asyncFunctionCount++;
      }

      // Error handling
      if (node.type === 'try_statement') hasErrorHandling = true;
    });

    return {
      hasDbCalls: dbCallCount > 0,
      dbCallCount,
      dbOperations: [...dbOperations],
      dbClients:    [...dbClients],
      hasMiddleware,
      hasController,
      hasFilesystemOps: hasFilesystemOps || filesystemOps.size > 0,
      filesystemOps: [...filesystemOps],
      hasErrorHandling,
      asyncFunctionCount,
    };
  }

  // ── Tree traversal utilities ──────────────────────────────────────────────

  /** Walk every node in the tree. */
  _walk(node, callback) {
    callback(node);
    for (const child of node.children ?? []) {
      this._walk(child, callback);
    }
  }

  /** Walk but stop descending into nested function bodies. */
  _walkSkipNestedFns(rootNode, callback) {
    const walk = (node, isRoot) => {
      if (!isRoot && FUNCTION_NODE_TYPES.has(node.type)) return;
      if (!isRoot) callback(node);
      for (const child of node.children ?? []) {
        walk(child, false);
      }
    };
    walk(rootNode, true);
  }
}
