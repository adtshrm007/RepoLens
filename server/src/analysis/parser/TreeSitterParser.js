import Parser from 'tree-sitter';
import { ParserRegistry } from './ParserRegistry.js';

/** Files larger than this are skipped — protects against minified/generated files. */
const MAX_FILE_SIZE_BYTES = 200 * 1024; // 200 KB

/**
 * Canonical parsing layer.
 *
 * Accepts { path, content, extension? } and returns a ParseResult.
 * NEVER throws — any failure is captured in the result object.
 *
 * ParseResult shape:
 * {
 *   filePath:        string
 *   language:        string | null        — 'javascript' | 'jsx' | 'typescript' | 'tsx' | null
 *   supported:       boolean              — false if extension is unknown
 *   success:         boolean              — false if parse threw or file too large
 *   hasErrors:       boolean              — true if CST contains ERROR nodes
 *   errorCount:      number
 *   rootNode:        tree-sitter Node | null
 *   parseDurationMs: number
 *   fileSize:        number
 *   skippedReason:   string | null        — 'FILE_TOO_LARGE' | 'UNSUPPORTED' | 'PARSE_ERROR'
 * }
 */
export class TreeSitterParser {
  /**
   * Parse one source file.
   * @param {{ path: string, content: string, extension?: string }} file
   * @returns {ParseResult}
   */
  parse({ path, content, extension }) {
    const ext = extension || path.split('.').pop() || '';
    const fileSize = content?.length ?? 0;
    const langConfig = ParserRegistry.getLanguageConfig(ext);

    // ── Unsupported language ───────────────────────────────────────
    if (!langConfig) {
      return this._result({
        filePath: path,
        language: null,
        supported: false,
        success: false,
        fileSize,
        skippedReason: 'UNSUPPORTED',
      });
    }

    // ── File too large ─────────────────────────────────────────────
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      console.warn(`[TreeSitterParser] Skipping ${path} — file too large (${Math.round(fileSize / 1024)}KB)`);
      return this._result({
        filePath: path,
        language: langConfig.name,
        supported: true,
        success: false,
        fileSize,
        skippedReason: 'FILE_TOO_LARGE',
      });
    }

    // ── Parse ──────────────────────────────────────────────────────
    const start = Date.now();
    try {
      const parser = new Parser();
      parser.setLanguage(langConfig.getLanguage());
      const tree = parser.parse(content ?? '');
      const parseDurationMs = Date.now() - start;

      const errorCount = this._countErrors(tree.rootNode);

      return this._result({
        filePath: path,
        language: langConfig.name,
        supported: true,
        success: true,
        hasErrors: errorCount > 0,
        errorCount,
        rootNode: tree.rootNode,
        parseDurationMs,
        fileSize,
        skippedReason: null,
      });
    } catch (err) {
      console.warn(`[TreeSitterParser] Parse failed for ${path}: ${err.message}`);
      return this._result({
        filePath: path,
        language: langConfig.name,
        supported: true,
        success: false,
        fileSize,
        skippedReason: 'PARSE_ERROR',
        error: err.message,
        parseDurationMs: Date.now() - start,
      });
    }
  }

  // ── Private helpers ──────────────────────────────────────────────

  /**
   * Recursively count ERROR-type nodes in the CST.
   * tree-sitter inserts these for syntax it cannot recover.
   */
  _countErrors(node) {
    if (!node) return 0;
    let count = node.type === 'ERROR' ? 1 : 0;
    for (const child of node.children ?? []) {
      count += this._countErrors(child);
    }
    return count;
  }

  /** Fills in defaults for optional fields. */
  _result({
    filePath,
    language,
    supported,
    success,
    hasErrors = false,
    errorCount = 0,
    rootNode = null,
    parseDurationMs = 0,
    fileSize = 0,
    skippedReason = null,
    error = null,
  }) {
    return {
      filePath,
      language,
      supported,
      success,
      hasErrors,
      errorCount,
      rootNode,
      parseDurationMs,
      fileSize,
      skippedReason,
      error,
    };
  }
}
