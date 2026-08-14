import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

// Lazy-load grammars so import errors are isolated to this file
let _javascript = null;
let _typescript = null;
let _tsx = null;

function getJavaScript() {
  if (!_javascript) {
    _javascript = _require('tree-sitter-javascript');
  }
  return _javascript;
}

function getTypeScript() {
  if (!_typescript) {
    const pkg = _require('tree-sitter-typescript');
    _typescript = pkg.typescript;
  }
  return _typescript;
}

function getTSX() {
  if (!_tsx) {
    const pkg = _require('tree-sitter-typescript');
    _tsx = pkg.tsx;
  }
  return _tsx;
}

/**
 * Maps file extensions to tree-sitter language configs.
 * Each entry: { getLanguage: fn, name: string }
 *
 * Unsupported extensions return null explicitly.
 * Never pretend to support a language that isn't configured here.
 */
const EXTENSION_MAP = {
  js:  { getLanguage: getJavaScript, name: 'javascript' },
  jsx: { getLanguage: getJavaScript, name: 'jsx' },
  ts:  { getLanguage: getTypeScript, name: 'typescript' },
  tsx: { getLanguage: getTSX,        name: 'tsx' },
};

export class ParserRegistry {
  /**
   * Returns { getLanguage, name } for a supported extension, or null.
   * @param {string} extension - File extension without the dot (e.g. 'js', 'ts')
   * @returns {{ getLanguage: () => object, name: string } | null}
   */
  static getLanguageConfig(extension) {
    return EXTENSION_MAP[extension?.toLowerCase()] || null;
  }

  /**
   * Returns true if the extension is supported.
   * @param {string} extension
   * @returns {boolean}
   */
  static isSupported(extension) {
    return extension?.toLowerCase() in EXTENSION_MAP;
  }

  /**
   * Returns the list of supported extensions.
   * @returns {string[]}
   */
  static getSupportedExtensions() {
    return Object.keys(EXTENSION_MAP);
  }
}
