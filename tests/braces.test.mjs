// Bracing frames: pieces of the row-column graph, holding, spare braces,
// the fewest claim and its answers, adding one brace, loose designs, windows,
// the push's geometry, hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {pieces, holds, spare, covers, fewestDesigns, joints, pushAngles} from '../dist/families/braces/braces.js';
import {loadPack} from '../scripts/packs.mjs';

const braces = JSON.parse(await readFile(new URL('../dist/families/braces/braces.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => braces.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const cell = (p, rc) => (Number(rc[0]) - 1) * p.parameters.cols + Number(rc[1]) - 1;
const brace = (p, ...rcs) => rcs.map(rc => ({type: 'brace', cell: cell(p, rc)}));

test('pieces, holding and spare braces', () => {
  const q = {rows: 2, cols: 2};
  assert.equal(pieces(q, []).count, 4);
  assert.equal(pieces(q, [0, 3]).count, 2, 'a diagonal pair leaves two pieces');
  assert.ok(holds(q, [0, 1, 2]));
  assert.deepEqual(spare(q, [0, 1, 2, 3]), [0, 1, 2, 3], 'all four are on the loop');
  assert.deepEqual(spare(q, [0, 1, 2]), []);
  assert.ok(covers(q, [0, 3]) && !holds(q, [0, 3]), 'every row and column, still moving');
  assert.equal(fewestDesigns({rows: 2, cols: 3}).length, 12);
});

test('the push keeps braced cells square and every bar its length', () => {
  const q = {rows: 2, cols: 3}, set = [0, 1, 4];
  for (const t of [0.1, 0.3, 0.55]) {
    const pts = joints(q, pushAngles(q, set, t), 1), at = (r, c) => pts[r * 4 + c];
    const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (let r = 0; r <= 2; r++) for (let c = 0; c < 3; c++) assert.ok(Math.abs(len(at(r, c), at(r, c + 1)) - 1) < 1e-9);
    for (let r = 0; r < 2; r++) for (let c = 0; c <= 3; c++) assert.ok(Math.abs(len(at(r, c), at(r + 1, c)) - 1) < 1e-9);
    for (const k of set) { const r = Math.floor(k / 3), c = k % 3; assert.ok(Math.abs(len(at(r, c), at(r + 1, c + 1)) - Math.SQRT2) < 1e-9, `cell ${k} stays square`); }
  }
  const moved = joints(q, pushAngles(q, set, 0.3), 1);
  assert.ok(Math.abs(moved[3][1]) > 0.05, 'the third column turns');
  const firm = joints(q, pushAngles(q, [0, 1, 2, 3], 0.3), 1), rest = joints(q, {row: [0, 0], col: [0, 0, 0]}, 1);
  assert.ok(firm.every(([x, y], i) => Math.abs(x - rest[i][0]) < 1e-9 && Math.abs(y - rest[i][1]) < 1e-9), 'a frame that holds does not move');
});

test('fewest: the claim, a frame that moves, a brace to spare', () => {
  const p = byId('braces-02');
  let a = play(p, freshAttempt(p), ...brace(p, '11', '22'));
  assert.equal(move(p, freshAttempt(p), {type: 'claim'}), null, 'brace something first');
  a = play(p, a, {type: 'claim'});
  assert.deepEqual(a.board.told, {kind: 'moves'});
  assert.equal(move(p, a, {type: 'claim'}), null, 'change the frame first');
  a = play(p, a, ...brace(p, '12', '21'));
  assert.equal(a.board.told, null);
  a = play(p, a, {type: 'claim'});
  assert.deepEqual(a.board.told, {kind: 'spare', cell: 0});
  a = play(p, a, ...brace(p, '11'), {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'brace', cell: 0}), null, 'nothing moves after a solve');
});

test('taking braces out of a full frame', () => {
  const p = byId('braces-05');
  assert.equal(freshAttempt(p).board.braces.length, 9);
  const a = play(p, freshAttempt(p), ...brace(p, '22', '23', '32', '33'), {type: 'claim'});
  assert.ok(isSolved(p, a.board), 'row 1 and column 1');
});

test('one more: only one brace, the starting braces stay', () => {
  const p = byId('braces-06');
  assert.equal(move(p, freshAttempt(p), {type: 'brace', cell: cell(p, '11')}), null, 'a starting brace stays');
  assert.ok(isSolved(p, play(p, freshAttempt(p), ...brace(p, '13')).board), 'joins the two pieces');
  assert.ok(isSolved(p, play(p, freshAttempt(p), ...brace(p, '32')).board));
});

test('loose: at most the count, every row and column, still moving', () => {
  const p = byId('braces-07');
  let a = play(p, freshAttempt(p), ...brace(p, '11', '12', '21', '22'));
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, ...brace(p, '33'));
  assert.ok(isSolved(p, a.board));
  const b = play(p, freshAttempt(p), ...brace(p, '11', '12', '13', '21', '31'));
  assert.equal(isSolved(p, b.board), false, 'a cross of braces holds');
  assert.equal(move(p, b, {type: 'brace', cell: cell(p, '22')}), null, 'five braces at most');
});

test('windows take no brace', () => {
  const p = byId('braces-08');
  assert.equal(move(p, freshAttempt(p), {type: 'brace', cell: cell(p, '12')}), null);
  const a = play(p, freshAttempt(p), ...brace(p, '31', '32', '33', '34', '11', '21'), {type: 'claim'});
  assert.ok(isSolved(p, a.board));
});

test('hints alone solve every puzzle', () => {
  for (const p of braces.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(p), n = 0;
    while (!isSolved(p, a.board) && n++ < 100) {
      const h = nextHint(p, a);
      if (h.type === 'deadend') { a = undo(a); continue; }
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id} solves`);
  }
});

test('forged saves are rejected', () => {
  const p = byId('braces-04'), fresh = freshAttempt(p).board;
  assert.equal(validBoard(p, {...fresh, braces: [1, 0]}), false, 'braces are kept in order');
  assert.equal(validBoard(p, {...fresh, braces: [0, 1, 2], claimed: true}), false, 'three braces can’t hold a 2-by-3 frame');
  assert.equal(validBoard(p, {...fresh, braces: [0, 1, 2, 3], told: {kind: 'spare', cell: 0}}), false, 'a forged answer');
  assert.ok(validBoard(p, {...fresh, braces: [0, 1, 2, 3], claimed: true}));
});

test('every puzzle renders its frame, and the graph where it belongs', () => {
  for (const p of braces.puzzles) {
    const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
    assert.match(html, /bf-frame/, p.id);
    assert.match(html, /data-bf-push/, p.id);
    assert.equal(/bf-graph/.test(html), Boolean(p.parameters.graph), `${p.id}: graph`);
  }
  const p = byId('braces-08'), html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
  assert.doesNotMatch(html, /data-bf-cell="1"/, 'a window is not a control');
  assert.match(html, /data-bf-cell="0"/);
});
