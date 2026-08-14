import { TreeSitterParser } from './src/analysis/parser/TreeSitterParser.js';
import { CSTDataExtractor } from './src/analysis/representation/CSTDataExtractor.js';

const parser = new TreeSitterParser();
const extractor = new CSTDataExtractor();

const content = `
function add(a, b) {
  if (a > 0) {
    if (b > 0) {
      return a + b;
    }
  }
  return 0;
}

const multiply = (x, y) => {
  for (let i = 0; i < 10; i++) {
    if (x > y && y > 0) {
      x++;
    }
  }
  return x * y;
};
`;

const parseResult = parser.parse({ path: 'test.js', content, extension: 'js' });
console.log('Parse success:', parseResult.success);
console.log('Parse error:', parseResult.error);

const profile = extractor.extract(
  { path: 'test.js', name: 'test.js', extension: 'js', classification: 'Generic Module', fileId: 'test', content },
  parseResult
);

console.log('cyclomaticComplexity:', profile.cyclomaticComplexity);
console.log('cognitiveComplexity:', profile.cognitiveComplexity);
console.log('duplicateCodeBlocks:', profile.duplicateCodeBlocks);
console.log('contentHash:', profile.contentHash ? profile.contentHash.substring(0, 16) + '...' : null);
console.log('totalFunctions:', profile.totalFunctions);
console.log('maxNestingDepth:', profile.maxNestingDepth);
console.log('functions:', JSON.stringify(profile.functions.map(f => ({
  name: f.name, cyclomatic: f.cyclomaticComplexity, cognitive: f.cognitiveComplexity
})), null, 2));
