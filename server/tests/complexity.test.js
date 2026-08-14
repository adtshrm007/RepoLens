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

test('ComplexityAnalyzer - Cyclomatic Complexity', async (t) => {
  await t.test('simple function is 1', () => {
    const fn = getFirstFunctionNode('function a() { return 1; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 1);
    assert.equal(res.decisionPoints.length, 0);
  });

  await t.test('one if statement is 2', () => {
    const fn = getFirstFunctionNode('function a(x) { if (x) return 1; return 2; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 2);
    assert.equal(res.decisionPoints.length, 1);
    assert.equal(res.decisionPoints[0].type, 'if_statement');
  });

  await t.test('nested ifs is 3', () => {
    const fn = getFirstFunctionNode('function a(x, y) { if (x) { if (y) return 1; } return 2; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 3);
    assert.equal(res.decisionPoints.length, 2);
  });

  await t.test('for loop is 2', () => {
    const fn = getFirstFunctionNode('function a() { for (let i = 0; i < 10; i++) {} }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 2);
    assert.equal(res.decisionPoints[0].type, 'for_statement');
  });

  await t.test('switch with 3 cases + default is 4', () => {
    const fn = getFirstFunctionNode(`
      function a(x) {
        switch (x) {
          case 1: break;
          case 2: break;
          case 3: break;
          default: break;
        }
      }
    `);
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 4); // base 1 + 3 cases
    assert.equal(res.decisionPoints.length, 3);
    assert.ok(res.decisionPoints.every(dp => dp.type === 'switch_case'));
  });

  await t.test('catch is 2', () => {
    const fn = getFirstFunctionNode('function a() { try {} catch (e) {} }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 2);
    assert.equal(res.decisionPoints[0].type, 'catch_clause');
  });

  await t.test('ternary is 2', () => {
    const fn = getFirstFunctionNode('function a(x) { return x ? 1 : 2; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 2);
    assert.equal(res.decisionPoints[0].type, 'ternary_expression');
  });

  await t.test('logical && is 2', () => {
    const fn = getFirstFunctionNode('function a(x, y) { return x && y; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 2);
  });

  await t.test('multiple logical operators && ||', () => {
    const fn = getFirstFunctionNode('function a(x, y, z) { return x && y || z; }');
    const res = analyzer.computeCyclomatic(fn);
    assert.equal(res.complexity, 3); // base 1 + && + ||
    assert.equal(res.decisionPoints.length, 2);
  });
});
