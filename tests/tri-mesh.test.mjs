// The shared board of any triangles (dist/tri-mesh.js): edges, outside
// edges, neighbours, specs that are refused, and the controls it draws. The
// families that use it test their own rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {meshOf, validMeshSpec, meshBoard, edgeOf} from '../dist/tri-mesh.js';

const H = Math.sqrt(3) / 2;
// A triangle cut into three round its middle point.
const fan = {points: [[0, 0], [1, 0], [.5, H], [.5, H / 3]], cells: [[0, 1, 3], [1, 2, 3], [2, 0, 3]]};
// A square cut by one diagonal, with a clockwise triangle to be turned round.
const square = {points: [[0, 0], [1, 0], [1, 1], [0, 1]], cells: [[0, 2, 1], [0, 2, 3]]};

test('edges, outside edges, neighbours and the cells round each point', () => {
  const m = meshOf(fan);
  assert.equal(m.edges.length, 6);
  assert.equal(m.outer.filter(Boolean).length, 3, 'the three sides of the big triangle');
  assert.ok(m.edges.every(([a, b]) => a < b));
  assert.deepEqual(m.nbr.map(list => list.length), [2, 2, 2]);
  assert.deepEqual(m.around[3], [0, 1, 2], 'the middle point touches every cell');
  assert.equal(m.edgeCells[edgeOf(m, 0, 3)].length, 2);
  assert.equal(m.edgeCells[edgeOf(m, 0, 1)].length, 1);
  assert.equal(meshOf(fan), m, 'cached by spec');
});

test('triangles turn counterclockwise, and each edge lies opposite its corner', () => {
  const m = meshOf(square);
  for (const c of m.cells) {
    const [a, b, d] = c.map(k => m.points[k]);
    assert.ok((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1]) > 0);
  }
  m.cells.forEach((c, i) => m.cellEdges[i].forEach((e, t) => assert.ok(!m.edges[e].includes(c[t]), 'edge t misses corner t')));
  assert.equal(m.outer.filter(Boolean).length, 4);
  assert.equal(m.edgeCells[edgeOf(m, 0, 2)].length, 2, 'the diagonal is shared');
});

test('specs that are not boards of triangles are refused', () => {
  assert.ok(validMeshSpec(fan) && validMeshSpec(square));
  assert.equal(validMeshSpec(null), false);
  assert.equal(validMeshSpec({points: fan.points, cells: []}), false, 'no triangles');
  assert.equal(validMeshSpec({points: fan.points, cells: [[0, 1, 1]]}), false, 'a repeated corner');
  assert.equal(validMeshSpec({points: fan.points, cells: [[0, 1, 9]]}), false, 'a missing point');
  assert.equal(validMeshSpec({points: [[0, 0], [1, 0], [2, 0]], cells: [[0, 1, 2]]}), false, 'a flat triangle');
  assert.equal(validMeshSpec({points: [...fan.points, [.5, -H / 3]], cells: [...fan.cells, [0, 1, 4], [0, 1, 4]]}), false, 'an edge with three triangles');
  assert.equal(validMeshSpec({points: [[0, 0], [1, NaN], [0, 1]], cells: [[0, 1, 2]]}), false, 'a point that is not a number');
});

test('the board draws points, edges and cells as controls, and a picture as none', () => {
  const m = meshOf(fan);
  const html = meshBoard(m, {label: 'Fan', point: k => ({act: k === 3, text: 'R', label: `Point ${k}`}), edge: e => (m.outer[e] ? null : {act: true, cls: 'door'}), cell: i => ({act: i === 0, cls: 'lit'})});
  assert.match(html, /role="group" data-tg-board/);
  assert.equal((html.match(/data-tg-point=/g) || []).length, 1);
  assert.equal((html.match(/data-tg-edge=/g) || []).length, 3, 'the three inside edges');
  assert.equal((html.match(/data-tg-cell=/g) || []).length, 1);
  assert.equal((html.match(/class="tg-letter"/g) || []).length, 4);
  assert.match(html, /aria-label="Fan"/);
  const picture = meshBoard(m, {picture: true, point: () => ({act: true})});
  assert.doesNotMatch(picture, /data-tg-board/);
  assert.match(picture, /role="img"/);
  // Dots shrink to fit the shortest edge.
  const big = meshBoard(m, {pip: 1, point: () => ({})}), r = Number(big.match(/class="tg-pip" r="([\d.]+)"/)[1]);
  assert.ok(r <= m.shortest * .3 + .01);
});
