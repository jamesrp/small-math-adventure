// The shared graph board (dist/graph-board.js): geometry, drawing and the
// controls it marks for wireGraph. The families that use it test their rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphOf, graphBoard, edgeGeometry, pathThrough, validGraphSpec, NODE_R} from '../dist/graph-board.js';

const spec = {aspect: 2, nodes: {A: [10, 50], B: [90, 50], C: [50, 0]}, edges: [['A', 'B', 3], ['B', 'C']]};

test('graphOf reads positions as percentages of the board box', () => {
  const g = graphOf(spec);
  assert.deepEqual(g.ids, ['A', 'B', 'C']);
  assert.equal(g.height, 50);
  assert.deepEqual(g.pos.A, [10, 25]);
  assert.equal(g.edges[0].w, 3);
  assert.equal(g.edges[1].w, null);
  assert.equal(g.k, 1);
  assert.equal(graphOf(spec), g, 'cached by spec');
  assert.equal(validGraphSpec(spec), true);
  assert.equal(validGraphSpec({nodes: {A: [0, 0]}, edges: [['A', 'A']]}), false, 'no loops');
  assert.equal(validGraphSpec({nodes: {A: [0, 0]}, edges: [['A', 'Z']]}), false, 'edges join known nodes');
});

test('edges stop short of the node circles', () => {
  const g = graphOf(spec), {a, b, m} = edgeGeometry(g, g.edges[0]);
  assert.equal(a[0], 10 + NODE_R + 1);
  assert.equal(b[0], 90 - NODE_R - 1);
  assert.deepEqual(m, [50, 25]);
  const small = graphOf({...spec, scale: .5});
  assert.equal(edgeGeometry(small, small.edges[0]).a[0], 10 + (NODE_R + 1) * .5);
});

test('the board draws every node and edge and marks only the controls asked for', () => {
  const g = graphOf(spec);
  const html = graphBoard(g, {
    label: 'Test map',
    node: id => ({act: id !== 'C', label: `Node ${id}`, cls: id === 'A' ? 'picked' : ''}),
    edge: i => ({act: i === 0, tag: g.edges[i].w, bar: i === 1, strokes: i === 0 ? ['r0'] : []})
  });
  assert.match(html, /^<svg class="gb-board/);
  assert.match(html, /aria-label="Test map"/);
  assert.equal((html.match(/data-gb-node=/g) || []).length, 2, 'two tappable nodes');
  assert.match(html, /role="img" aria-label="Node C"/, 'a node that is not a control is a picture');
  assert.equal((html.match(/data-gb-edge=/g) || []).length, 1, 'one tappable edge');
  assert.match(html, /class="gb-node picked"/);
  assert.match(html, /<g class="gb-tag"[^>]*><rect[^>]*\/><text[^>]*>3<\/text>/, 'the weight tag');
  assert.equal((html.match(/class="gb-bar"/g) || []).length, 1, 'one bar');
  assert.match(html, /class="gb-stroke r0"/);
  assert.doesNotMatch(html, /gb-head/, 'undirected edges have no arrowheads');
  assert.match(html, /data-focus="gb-node-A"/, 'focus survives a re-render');
  assert.doesNotMatch(html, /gb-slide/, 'touch scrolls the page unless the board asks for slides');
  assert.match(graphBoard(g, {slide: true}), /^<svg class="gb-board gb-slide/);
  const arrows = graphBoard(graphOf({...spec, directed: true}));
  assert.equal((arrows.match(/class="gb-head"/g) || []).length, 2, 'directed edges have arrowheads');
});

test('a path is drawn through node centres', () => {
  const g = graphOf(spec);
  assert.equal(pathThrough(g, ['A'], 'x'), '');
  assert.equal(pathThrough(g, ['A', 'B', 'C'], 'leak'), '<polyline class="leak" points="10,25 90,25 50,0"/>');
});
