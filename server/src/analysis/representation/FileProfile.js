/**
 * FileProfile — normalized per-file representation produced by CSTDataExtractor.
 *
 * This is the single source of truth for all per-file metrics.
 * Every downstream analyzer reads from this instead of re-parsing source.
 *
 * Use createFileProfile() to get a zero-initialized instance.
 */

/**
 * @returns {FileProfile}
 */
export function createFileProfile() {
  return {
    // ── Identity ────────────────────────────────────────────────────
    filePath: '',
    fileName: '',
    extension: '',
    fileType: 'Generic Module',   // from ClassificationService
    fileId: null,                  // DB id, set after repositoryFile.create
    language: null,                // 'javascript' | 'jsx' | 'typescript' | 'tsx'
    supported: false,              // false = unsupported extension
    parseError: false,             // true = tree-sitter failed or file too large
    skippedReason: null,           // 'UNSUPPORTED' | 'FILE_TOO_LARGE' | 'PARSE_ERROR'
    contentHash: null,             // SHA-256 of raw content (for incremental analysis)

    // ── Line counts ─────────────────────────────────────────────────
    totalLines: 0,
    codeLines: 0,
    commentLines: 0,
    blankLines: 0,

    // ── Functions ───────────────────────────────────────────────────
    totalFunctions: 0,
    avgFunctionLength: 0,          // lines
    maxFunctionLength: 0,          // lines
    largeFunctionsCount: 0,        // functions > 50 lines
    deadCodeCount: 0,              // functions with 0 return statements (non-constructor)
    totalReturnCount: 0,           // sum of return statements across all functions
    functions: [],                 // FunctionProfile[]

    // ── File-level complexity ────────────────────────────────────────
    maxNestingDepth: 0,
    cyclomaticComplexity: 0,       // sum across all functions
    cognitiveComplexity: 0,        // sum across all functions

    // ── React ────────────────────────────────────────────────────────
    componentCount: 0,
    hookUsageCount: 0,
    hooksUsed: [],                 // ['useState', 'useEffect', ...]

    // ── Imports / dependencies ────────────────────────────────────────
    dependencyCount: 0,
    duplicateImports: 0,
    imports: [],                   // ImportRecord[]

    // ── Duplicate code (hash-based) ───────────────────────────────────
    duplicateCodeBlocks: 0,

    // ── Backend signals ───────────────────────────────────────────────
    backend: {
      hasDbCalls: false,
      dbCallCount: 0,
      dbOperations: [],            // ['findMany', 'create', ...]
      dbClients: [],               // ['prisma', 'mongoose', ...]
      hasMiddleware: false,        // fn(req, res, next)
      hasController: false,        // fn(req, res)
      hasFilesystemOps: false,
      filesystemOps: [],           // ['readFile', 'writeFile', ...]
      hasErrorHandling: false,
      asyncFunctionCount: 0,
    },
  };
}

/**
 * FunctionProfile shape (for reference / documentation):
 * {
 *   name:                  string   — 'anonymous' if unnamed
 *   lineStart:             number
 *   lineEnd:               number
 *   length:                number   — lines
 *   isArrow:               boolean
 *   isAsync:               boolean
 *   isGenerator:           boolean
 *   parameterCount:        number
 *   isProps:               boolean  — single obj/destructured param in component context
 *   returnCount:           number
 *   cyclomaticComplexity:  number
 *   cognitiveComplexity:   number
 *   maxNestingDepth:       number
 * }
 *
 * ImportRecord shape:
 * {
 *   source:      string    — './utils', 'react', etc.
 *   isRelative:  boolean
 *   specifiers:  string[]  — named imports
 *   isDefault:   boolean
 *   isNamespace: boolean
 *   line:        number
 *   isCommonJS:  boolean
 * }
 */
