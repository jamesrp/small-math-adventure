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
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

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
  assert.deepEqual(a.board.told, {kind: 'spare', cell: 1}, 'a spare brace added since the last Fewest is marked, not 11, which was there before');
  a = play(p, a, ...brace(p, '11'), {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'brace', cell: 0}), null, 'nothing moves after a solve');
});

test('fewest: brace every cell, take out the marked brace, repeat no longer works (claims audit)', () => {
  for (const id of ['braces-04', 'braces-08', 'braces-10']) {
    const p = byId(id), q = p.parameters;
    const cells = [...Array(q.rows * q.cols).keys()].filter(k => !(q.windows || []).includes(k));
    let a = freshAttempt(p);
    for (const k of cells) a = move(p, a, {type: 'brace', cell: k}) || a;
    a = play(p, a, {type: 'claim'});
    assert.equal(a.board.told.kind, 'spare');
    assert.ok(Number.isInteger(a.board.told.cell), `${id}: the first press may mark a brace the child added`);
    assert.match(view(p, a), /It holds, but this brace can go\./);
    a = play(p, a, {type: 'brace', cell: a.board.told.cell}, {type: 'claim'});
    assert.deepEqual(a.board.told, {kind: 'spare'}, `${id}: after a take-out nothing was added, so nothing is marked`);
    const html = view(p, a);
    assert.match(html, /It holds, but a brace can go\./);
    assert.doesNotMatch(html, /class="bf-(cell|brace)[^"]*\btold\b/, `${id}: no brace drawn as told`);
    assert.equal(move(p, a, {type: 'claim'}), null, `${id}: Fewest waits for a change`);
    // Taking out a brace that isn't spare and putting it back marks nothing.
    const firm = a.board.braces.find(k => !spare(q, a.board.braces).includes(k));
    if (firm !== undefined) assert.deepEqual(play(p, a, {type: 'brace', cell: firm}, {type: 'brace', cell: firm}, {type: 'claim'}).board.told, {kind: 'spare'});
  }
  // Starting full (puzzle 5), the first press marks nothing: no brace was added.
  const full = byId('braces-05');
  assert.deepEqual(play(full, freshAttempt(full), {type: 'claim'}).board.told, {kind: 'spare'});
});

test('saves from before the spare-brace rule still load', () => {
  const p = byId('braces-02');
  assert.ok(validBoard(p, {braces: [0, 1, 2, 3], told: {kind: 'spare', cell: 0}, claimed: false}), 'an old answer that marked the first spare brace');
  assert.ok(validBoard(p, {braces: [0, 1, 2, 3], told: {kind: 'spare', cell: 3}, claimed: false}), 'any spare brace');
  assert.ok(validBoard(p, {braces: [0, 1, 2, 3], told: {kind: 'spare'}, claimed: false}));
  assert.equal(validBoard(p, {braces: [0, 1, 2, 3], told: {kind: 'spare'}, claimed: false, last: [0, 1, 2]}), false, 'an answer stands only on the frame it judged');
  const old = play(p, {...freshAttempt(p), board: {braces: [0, 1, 2], told: null, claimed: false}}, {type: 'brace', cell: 3}, {type: 'claim'});
  assert.deepEqual(old.board.told, {kind: 'spare', cell: 0}, 'an old board without `last` counts every brace since the start as added');
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
  assert.equal(validBoard(p, {...fresh, braces: [0, 1, 2, 3, 4], told: {kind: 'spare', cell: 2, extra: 1}}), false, 'an answer with a stray field');
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

test('the row-column graph is drawn twice, tall beside the frame and wide under it, and the stylesheet shows one by screen width', async () => {
  const p = byId('braces-10'), html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
  const tall = (html.match(/class="bf-side bf-tall"/g) || []).length, wide = (html.match(/class="bf-side bf-wide"/g) || []).length;
  assert.ok(tall > 0 && tall === wide);
  const css = await readFile(new URL('../dist/families/braces/braces.css', import.meta.url), 'utf8');
  assert.match(css, /\.bf-side\.bf-wide\{display:none\}/);
  assert.match(css, /@media \(max-width:560px\)\{\s*\.bf-side\.bf-tall\{display:none\}/);
});
