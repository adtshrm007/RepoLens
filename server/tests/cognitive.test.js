import test from 'node:test';
import assert from 'node:assert/strict';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import { ComplexityAnalyzer } from '../src/analysis/analyzers/ComplexityAnalyzer.js';

const parser = new Parser();
parser.setLanguage(JavaScript);
const analyzer = new ComplexityAnalyzer();

function getFirstFunctionNode(code) {
  const tree = parser.parse(code);
  let fnNode = null;
  function walk(node) {
    if (fnNode) return;
    if (['function_declaration', 'arrow_function', 'function_expression', 'method_definition'].includes(node.type)) {
      fnNode = node;
      return;
    }
    for (const child of node.children) walk(child);
  }
  walk(tree.rootNode);
  return fnNode;
}

test('ComplexityAnalyzer - Cognitive Complexity', async (t) => {
  await t.test('flat if is 1', () => {
    const fn = getFirstFunctionNode('function a(x) { if (x) return 1; }');
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 1);
  });

  await t.test('nested if is 3', () => {
    // if: +1
    //   if: +2 (+1 depth)
    const fn = getFirstFunctionNode('function a(x, y) { if (x) { if (y) return 1; } }');
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 3);
  });

  await t.test('if else-if else is 2', () => {
    // if: +1
    // else if: +1 (flat, no nesting penalty)
    // else: +1 (flat, no nesting penalty)
    const fn = getFirstFunctionNode(`
      function a(x, y) {
        if (x) {
        } else if (y) {
        } else {
        }
      }
    `);
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 3);
    
    // Check breakdown
    const types = res.breakdown.map(b => b.type);
    assert.deepEqual(types, ['if_statement', 'else_if', 'else_clause']);
    assert.equal(res.breakdown[0].nestingBonus, 0); // if
    assert.equal(res.breakdown[1].nestingBonus, 0); // else_if
    assert.equal(res.breakdown[2].nestingBonus, 0); // else
  });

  await t.test('nested inside else-if gets depth=1', () => {
    // if: +1
    // else if: +1
    //   if: +2 (+1 depth)
    const fn = getFirstFunctionNode(`
      function a(x, y, z) {
        if (x) {
        } else if (y) {
          if (z) {
          }
        }
      }
    `);
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 4);
    
    const innerIf = res.breakdown.find(b => b.type === 'if_statement' && b.increment === 2);
    assert.ok(innerIf);
    assert.equal(innerIf.nestingBonus, 1);
  });

  await t.test('nested loops get nesting penalty', () => {
    // for: +1
    //   for: +2 (+1 depth)
    //     for: +3 (+2 depth)
    // score = 6
    const fn = getFirstFunctionNode(`
      function a() {
        for(let i=0; i<10; i++) {
          for(let j=0; j<10; j++) {
            for(let k=0; k<10; k++) {
            }
          }
        }
      }
    `);
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 6);
  });

  await t.test('logical operators sequence adds 1', () => {
    // && sequence: +1
    const fn = getFirstFunctionNode('function a(x, y) { if (x && y) return 1; }');
    const res = analyzer.computeCognitive(fn);
    assert.equal(res.score, 2); // 1 for if, 1 for logical operator sequence
  });
});
