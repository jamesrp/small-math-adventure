// The shared graph board (dist/graph-board.js): geometry, drawing and the
// controls it marks for wireGraph. The families that use it test their rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {graphOf, graphBoard, graphMini, edgeGeometry, pathThrough, validGraphSpec, NODE_R} from '../dist/graph-board.js';

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

test('a small picture of the map marks the links asked for and is never a control', () => {
  const g = graphOf(spec), html = graphMini(g, {label: 'Network AB', edge: i => i === 0 ? 'on' : ''});
  assert.match(html, /^<svg class="gb-mini/);
  assert.match(html, /role="img" aria-label="Network AB"/);
  assert.equal((html.match(/class="gb-mini-line on"/g) || []).length, 1);
  assert.equal((html.match(/<circle/g) || []).length, 3);
  assert.doesNotMatch(html, /role="button"|tabindex/);
});

test('a bend draws two bridges between one pair as curves to either side', () => {
  const two = {aspect: 2, nodes: {A: [10, 50], B: [90, 50]}, edges: [['A', 'B', null, 12], ['A', 'B', null, -12], ['B', 'A', null, 12]]};
  assert.equal(validGraphSpec(two), true);
  assert.equal(validGraphSpec({...two, edges: [['A', 'B', null, 'x']]}), false, 'a bend is a number');
  const g = graphOf(two), [up, down, back] = g.edges.map(e => edgeGeometry(g, e));
  assert.equal(g.edges[0].bend, 12);
  assert.ok(up.m[1] > 30 && up.m[1] < 33 && down.m[1] > 17 && down.m[1] < 20, 'the midpoints sit about half the bend to either side (+ is along the normal, here down)');
  assert.ok(Math.abs(up.m[1] - 25 - (25 - down.m[1])) < 1e-9, 'symmetric');
  assert.deepEqual(back.m.map(n => +n.toFixed(6)), down.m.map(n => +n.toFixed(6)), 'a bend follows the edge’s own direction');
  for (const {a} of [up, down]) assert.ok(Math.abs(Math.hypot(a[0] - 10, a[1] - 25) - (NODE_R + 1)) < 1e-9, 'ends stop short of the node, toward the curve');
  const html = graphBoard(g, {edge: i => ({act: i === 0, strokes: ['on']})});
  assert.equal((html.match(/<path class="gb-line" d="M[\d.,]+ Q[\d.,]+ [\d.,]+" fill="none"\/>/g) || []).length, 3, 'curves');
  assert.match(html, /<path class="gb-stroke on" d="M/);
  assert.match(html, /<path class="gb-hit" d="M[^"]+" fill="none" role="button"[^>]*data-gb-edge="0"/);
  assert.match(graphMini(g), /<path class="gb-mini-line/);
  // Straight edges draw as before.
  assert.doesNotMatch(graphBoard(graphOf(spec)), /<path/);
  const directed = graphBoard(graphOf({...two, directed: true}));
  assert.equal((directed.match(/gb-head/g) || []).length, 3, 'arrowheads on curves');
});
