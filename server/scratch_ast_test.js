import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';

const parser = new Parser();
parser.setLanguage(JavaScript);

const code = `
function test(x) {
  switch (x) {
    case 1: break;
    default: break;
  }
  if (a) {
  } else if (b) {
  } else {
  }
}
`;

const tree = parser.parse(code);

function walk(node, depth = 0) {
  console.log('  '.repeat(depth) + node.type);
  for (const child of node.children) {
    walk(child, depth + 1);
  }
}

walk(tree.rootNode);
