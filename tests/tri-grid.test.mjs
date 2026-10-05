// The shared triangle grid (dist/tri-grid.js): cells, neighbours, points,
// where pieces fit, outlines, hit-testing and the controls it draws. The
// families that use it test their own rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {gridOf, cellsInside, validGridSpec, placements, outlineOf, triBoard, cellAt, corners, cellOf, turnPoint, mirrorPoint, SHAPES, UNIT} from '../dist/tri-grid.js';

// The hexagon with sides a, b, c, a, b, c, as the rhombus family draws it.
const hexagon = (a, b, c) => { const out = [[0, 0]]; let p = [0, 0]; for (const [du, dv, n] of [[1, 0, a], [0, 1, b], [-1, 1, c], [-1, 0, a], [0, -1, b]]) { p = [p[0] + du * n, p[1] + dv * n]; out.push(p); } return out; };

test('a hexagon with sides a, b, c holds 2(ab + bc + ca) triangles, half of each kind', () => {
  for (const [a, b, c] of [[1, 1, 1], [2, 1, 1], [2, 2, 2], [3, 2, 1]]) {
    const g = gridOf({outline: hexagon(a, b, c)});
    assert.equal(g.cells.length, 2 * (a * b + b * c + c * a), `${a}, ${b}, ${c}`);
    assert.equal(g.up.filter(Boolean).length, g.cells.length / 2);
  }
  assert.equal(cellsInside([[0, 0], [3, 0], [0, 3]]).length, 9, 'a triangle with three edges on a side');
});

test('cells are numbered in reading order, top row first, the same when turned', () => {
  const g = gridOf({outline: hexagon(1, 1, 1)}), t = gridOf({outline: hexagon(1, 1, 1), turn: true});
  assert.deepEqual(g.centre.map(c => c[1]), [...g.centre.map(c => c[1])].sort((a, b) => a - b));
  assert.equal(new Set(t.cells.map(String)).size, 6);
  assert.deepEqual(new Set(t.cells.map(String)), new Set(g.cells.map(String)), 'turning changes the drawing, not the triangles');
  assert.equal(gridOf({outline: hexagon(1, 1, 1)}), g, 'cached by spec');
});

test('neighbours share an edge and always point opposite ways', () => {
  const g = gridOf({outline: hexagon(2, 2, 2)});
  g.nbr.forEach((list, i) => {
    assert.ok(list.length >= 1 && list.length <= 3);
    for (const j of list) {
      assert.notEqual(g.up[i], g.up[j]);
      const shared = corners(g.cells[i]).filter(p => corners(g.cells[j]).some(q => String(p) === String(q)));
      assert.equal(shared.length, 2);
      assert.ok(g.nbr[j].includes(i));
    }
  });
  assert.equal(g.pairs.length, g.nbr.flat().length / 2);
  // Points: every corner once, with the triangles round it; inner points have six.
  assert.equal(g.points.length, 19);
  assert.equal(g.around.filter(list => list.length === 6).length, 7);
});

test('a sixth of a turn and the mirror map cells to cells', () => {
  for (const cell of [[0, 0, 0], [0, 0, 1], [2, -1, 0], [-3, 2, 1]]) {
    let c = cell;
    for (let k = 0; k < 6; k++) c = cellOf(corners(c).map(turnPoint));
    assert.deepEqual(c, cell, 'six turns come back');
    assert.deepEqual(cellOf(corners(cellOf(corners(cell).map(mirrorPoint))).map(mirrorPoint)), cell);
    assert.equal(cellOf(corners(cell).map(turnPoint))[2], 1 - cell[2], 'a sixth of a turn swaps up and down');
  }
});

test('placements find every turn and shift inside the board', () => {
  const small = gridOf({outline: hexagon(1, 1, 1)}), big = gridOf({outline: hexagon(2, 2, 2)});
  assert.equal(placements(small, 'triangle').length, 6);
  assert.equal(placements(small, 'rhombus').length, 6);
  assert.equal(placements(small, 'trapezoid').length, 6);
  assert.equal(placements(small, 'hexagon').length, 1);
  assert.equal(placements(big, 'rhombus').length, big.pairs.length);
  assert.equal(placements(big, 'hexagon').length, 7);
  assert.equal(placements(big, 'chevron').length, 42);
  assert.equal(placements(big, 'chevron', true).length, 42, 'a chevron is its own mirror image');
  for (const piece of placements(big, 'trapezoid')) assert.deepEqual(piece, [...piece].sort((a, b) => a - b));
  assert.equal(placements(big, 'rhombus'), placements(big, 'rhombus'), 'cached');
  assert.throws(() => placements(big, 'kite'));
  assert.equal(Object.keys(SHAPES).length, 5);
});

test('outlines trace a piece or a board and drop straight corners', () => {
  const g = gridOf({outline: hexagon(2, 1, 1)});
  const [loop] = outlineOf(g, g.cells.map((_, i) => i));
  assert.equal(loop.length, 6);
  assert.equal(outlineOf(g, placements(g, 'rhombus')[0])[0].length, 4);
  // A ring of cells round a missing middle has two loops.
  const ring = gridOf({outline: hexagon(2, 2, 2)}), inner = ring.around.findIndex(list => list.length === 6 && list.every(i => ring.nbr[i].length === 3));
  assert.equal(outlineOf(ring, ring.cells.map((_, i) => i).filter(i => !ring.around[inner].includes(i))).length, 2);
});

test('cellAt finds each triangle from its centre, turned or not, and misses corners with a core', () => {
  for (const spec of [{outline: hexagon(2, 2, 2)}, {outline: hexagon(2, 2, 2), turn: true}]) {
    const g = gridOf(spec);
    g.centre.forEach(([x, y], i) => assert.equal(cellAt(g, x, y), i));
    const [px, py] = g.xy[g.around.findIndex(list => list.length === 6)];
    assert.equal(cellAt(g, px + .01, py + .01, .6), null, 'a point on a corner is in no core');
    assert.equal(cellAt(g, 1e3, 1e3), null);
  }
  assert.equal(UNIT, 10);
});

test('triBoard draws every triangle and marks only the controls asked for', () => {
  const g = gridOf({outline: hexagon(1, 1, 1)}), [piece] = placements(g, 'rhombus');
  const html = triBoard(g, {
    label: 'Test board', stroke: true,
    cell: i => ({act: !piece.includes(i), label: `T${i}`, dot: i === 5, cls: i === 4 ? 'picked' : ''}),
    pieces: [{cells: piece, key: piece.join('.'), act: true, label: 'Lift me', cls: 'blue'}],
    point: k => g.around[k].length === 6 ? {act: true, label: 'Middle'} : null
  });
  assert.match(html, /^<svg class="tg-board tg-stroking/);
  assert.match(html, /aria-label="Test board"/);
  assert.equal(html.match(/class="tg-cell /g).length, 6);
  assert.equal(html.match(/data-tg-cell=/g).length, 4);
  assert.equal(html.match(/data-tg-piece=/g).length, 1);
  assert.equal(html.match(/data-tg-point=/g).length, 1);
  assert.equal(html.match(/class="tg-dot/g).length, 1);
  assert.match(html, /tg-cell (up|down) picked/);
  assert.match(html, /aria-label="Lift me"/);
  assert.doesNotMatch(triBoard(g, {}), /role="button"/, 'a plain board has no controls');
  const picture = triBoard(g, {picture: true, label: 'Goal'});
  assert.match(picture, /role="img"/);
  assert.doesNotMatch(picture, /data-tg-board/, 'wireTri never takes a picture for the board');
});

test('grid specs are checked before use', () => {
  assert.equal(validGridSpec({outline: hexagon(1, 1, 1)}), true);
  assert.equal(validGridSpec({cells: [[0, 0, 0], [0, 0, 1]], turn: true}), true);
  assert.equal(validGridSpec({outline: [[0, 0], [1, 0]]}), false);
  assert.equal(validGridSpec({cells: [[0, 0, 2]]}), false);
  assert.equal(validGridSpec({cells: []}), false);
  assert.equal(validGridSpec(null), false);
});
