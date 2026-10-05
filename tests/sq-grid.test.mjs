// The shared square grid (dist/sq-grid.js): squares, neighbours, edges and
// points, boundaries, pieces, holes, outlines, shapes up to turns and flips,
// hit-testing and the controls it draws. The families that use it test their
// own rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gridOf, validGridSpec, boundaryOf, perimeterOf, sharedOf, piecesOf, holesOf, outlineOf, shapeKey, freeKey, symmetries, cellsOfKey, normalize, squareBoard, cellAt, edgeCells, sidesOf, UNIT} from '../dist/sq-grid.js';

const at = (g, x, y) => g.index.get(`${x},${y}`);
const set = (g, list) => list.map(([x, y]) => at(g, x, y));

test('squares are numbered in reading order, with their neighbours, edges and points', () => {
  const g = gridOf({cols: 3, rows: 2});
  assert.deepEqual(g.cells, [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]);
  assert.deepEqual(g.nbr[4], [1, 3, 5]);
  assert.equal(g.pairs.length, 7);
  assert.equal(g.edges.length, 3 * 3 + 4 * 2, 'three rows of three across, two rows of four down');
  assert.equal(g.points.length, 12);
  assert.ok(g.sides.every(list => list.length === 1 || list.length === 2));
  assert.equal(gridOf({cols: 3, rows: 2}), g, 'cached by spec');
  const holey = gridOf({cols: 3, rows: 3, cells: [[0, 0], [2, 2], [1, 1]]});
  assert.deepEqual(holey.cells, [[0, 0], [1, 1], [2, 2]], 'a list of squares, sorted');
  assert.deepEqual(holey.nbr, [[], [], []]);
});

test('an edge lies between the two squares it separates', () => {
  for (const c of [[0, 0], [3, 2]]) sidesOf(c).forEach(e => assert.ok(edgeCells(e).some(d => String(d) === String(c))));
});

test('the boundary is 4n − 2s, holes included, and pieces join only across sides', () => {
  const g = gridOf({cols: 5, rows: 5});
  const ring = set(g, [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]]);
  assert.equal(perimeterOf(g, ring), 16);
  assert.equal(sharedOf(g, ring), 8);
  assert.equal(perimeterOf(g, ring), 4 * 8 - 2 * sharedOf(g, ring));
  assert.deepEqual(holesOf(g, ring), [[[2, 2]]]);
  const diagonal = set(g, [[0, 0], [1, 1]]);
  assert.equal(piecesOf(g, diagonal).length, 2, 'a corner is not a join');
  assert.equal(perimeterOf(g, diagonal), 8);
  assert.deepEqual(boundaryOf(g, []), []);
  assert.deepEqual(holesOf(g, []), []);
  // A hole sealed where two squares touch at a corner: seven squares, a tree.
  const c = set(g, [[2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]]);
  assert.equal(piecesOf(g, c).length, 1);
  assert.equal(sharedOf(g, c), 6);
  assert.deepEqual(holesOf(g, c), [[[2, 2]]]);
  assert.equal(perimeterOf(g, c), 2 * 7 + 2);
  // A hole can be wider than one square, and the plot's rim is not a wall.
  const wide = set(g, [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]]);
  assert.deepEqual(holesOf(g, wide), [[[1, 1], [2, 1]]]);
  assert.deepEqual(holesOf(g, set(g, [[0, 0], [1, 0], [0, 1]])), [], 'a nook at the plot’s corner is open');
});

test('outlines: one loop per empty region, simple through a pinch', () => {
  const g = gridOf({cols: 5, rows: 5});
  const c = set(g, [[2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [1, 3], [1, 2]]);
  const loops = outlineOf(g, c);
  assert.equal(loops.length, 2, 'the outside and the hole');
  assert.deepEqual(loops.find(l => l.length === 4).map(String).sort(), ['2,2', '2,3', '3,2', '3,3']);
  assert.equal(outlineOf(g, set(g, [[0, 0], [1, 1]])).length, 1, 'two squares at a corner share one empty region');
  assert.deepEqual(outlineOf(g, set(g, [[0, 0], [1, 0]])), [[[0, 0], [0, 1], [2, 1], [2, 0]]], 'straight corners dropped');
});

test('shapes compare up to shifts, and up to turns and flips', () => {
  const L = [[0, 0], [0, 1], [0, 2], [1, 2]], J = [[1, 0], [1, 1], [1, 2], [0, 2]];
  assert.notEqual(shapeKey(L), shapeKey(J));
  assert.equal(freeKey(L), freeKey(J));
  assert.equal(shapeKey(L.map(([x, y]) => [x + 3, y + 5])), shapeKey(L));
  assert.equal(new Set(symmetries(L).map(s => JSON.stringify(s))).size, 8);
  assert.equal(new Set(symmetries([[0, 0], [1, 0], [0, 1], [1, 1]]).map(s => JSON.stringify(s))).size, 1);
  assert.deepEqual(cellsOfKey(freeKey(L)), normalize(cellsOfKey(freeKey(L))));
  assert.deepEqual(cellsOfKey(''), []);
});

test('cellAt finds each square from its middle, and misses its corners with a core', () => {
  const g = gridOf({cols: 3, rows: 3});
  g.cells.forEach((_, i) => assert.equal(cellAt(g, ...g.centre[i], .6), i));
  assert.equal(cellAt(g, UNIT * .05, UNIT * .05, .6), null);
  assert.equal(cellAt(g, UNIT * .05, UNIT * .05), 0);
  assert.equal(cellAt(g, -1, 5), null);
});

test('squareBoard draws every square and marks only the controls asked for', () => {
  const g = gridOf({cols: 2, rows: 2});
  const svg = squareBoard(g, {cell: i => ({act: i !== 3, label: `Square ${i}`, cls: i === 0 ? 'tile' : ''}), edge: k => k === 0 ? {cls: 'fence'} : null, point: k => k === 0 ? {cls: 'post'} : null, stroke: true});
  assert.equal(svg.match(/class="sg-cell /g).length, 4);
  assert.equal(svg.match(/data-sg-cell=/g).length, 3);
  assert.equal(svg.match(/class="sg-edge fence"/g).length, 1);
  assert.equal(svg.match(/sg-point post/g).length, 1);
  assert.match(svg, /data-sg-board/);
  assert.match(svg, /sg-stroking/);
  const picture = squareBoard(g, {picture: true, label: 'Shape'});
  assert.doesNotMatch(picture, /data-sg-board|data-sg-cell/);
});

test('grid specs are checked before use', () => {
  assert.ok(validGridSpec({cols: 4, rows: 4}));
  assert.ok(validGridSpec({cols: 3, rows: 3, cells: [[0, 0], [2, 2]]}));
  for (const bad of [null, {}, {cols: 0, rows: 2}, {cols: 2.5, rows: 2}, {cols: 2, rows: 2, cells: [[2, 0]]}, {cols: 2, rows: 2, cells: [[0, 0], [0, 0]]}, {cols: 2, rows: 2, cells: []}, {cols: 31, rows: 2}]) assert.equal(validGridSpec(bad), false, JSON.stringify(bad));
});
