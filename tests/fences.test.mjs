// Garden fences: planting, lifting and carrying tiles, the fence count, legal
// gardens (one piece, ponds inside, every row and column reached), each kind
// of claim and its answer, a limit on moves, the found lists and Undo, hints,
// saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {gardenOf, movedOf} from '../dist/families/fences/fences.js';
import {loadPack} from '../scripts/packs.mjs';

const fences = JSON.parse(await readFile(new URL('../dist/families/fences/fences.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => fences.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const sq = (p, list) => list.map(([x, y]) => y * p.parameters.cols + x);
const plant = (p, list, a = freshAttempt(p)) => play(p, a, {type: 'plant', cells: sq(p, list)});

test('the fence is 4n − 2s and every legal garden’s fence is even', () => {
  const p = byId('fences-04');
  const row = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]);
  assert.equal(gardenOf(p, row.board).fence, 12);
  const pent = plant(p, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]);
  assert.equal(gardenOf(p, pent.board).fence, 10);
  assert.deepEqual(pent.board.found, [10], 'the garden on the plot is lit');
  const apart = plant(p, [[0, 0], [2, 0], [4, 0], [0, 2], [2, 2]]);
  assert.equal(gardenOf(p, apart.board).pieces, 5);
  assert.deepEqual(apart.board.found, [], 'a garden in pieces lights nothing');
  const corner = plant(p, [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
  assert.equal(gardenOf(p, corner.board).pieces, 5, 'corners don’t join');
});

test('planting is limited to the tray, and carrying moves one tile to an empty square', () => {
  const p = byId('fences-02');
  const four = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0]]);
  assert.equal(move(p, four, {type: 'plant', cells: sq(p, [[0, 1], [1, 1]])}), null, 'only one tile is left');
  const five = play(p, four, {type: 'plant', cells: sq(p, [[0, 1]])});
  assert.equal(move(p, five, {type: 'plant', cells: sq(p, [[1, 1]])}), null, 'the tray is empty');
  const carried = play(p, five, {type: 'carry', from: sq(p, [[3, 0]])[0], to: sq(p, [[1, 1]])[0]});
  assert.ok(isSolved(p, carried.board), 'a 2-by-2 square and one more: fence 10');
  assert.equal(move(p, five, {type: 'carry', from: sq(p, [[3, 0]])[0], to: sq(p, [[0, 1]])[0]}), null, 'not onto a tile');
  const lifted = play(p, five, {type: 'lift', cell: sq(p, [[3, 0]])[0]});
  assert.equal(lifted.board.tiles.length, 4);
});

test('Shortest, reaching every row and column: a block is refused, a told claim waits for a change, no gaps solves', () => {
  const p = byId('fences-05');
  const block = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]]);
  assert.equal(gardenOf(p, block.board).fence, 14);
  assert.equal(move(p, block, {type: 'claim'}), null, 'a 3-by-4 block misses a row and a column');
  assert.match(playView(p, block, {pack, selected: null, message: ''}), /Reach every row and every column/);
  // Rows of 5, 3, 2 and 2, with a gap in the second row and the second column.
  const gappy = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [2, 1], [3, 1], [0, 2], [1, 2], [0, 3], [1, 3]]);
  assert.equal(gardenOf(p, gappy.board).fence, 22);
  const told = play(p, gappy, {type: 'claim'});
  assert.equal(told.board.told, 'shorter');
  assert.equal(move(p, told, {type: 'claim'}), null);
  const runs = play(p, told, {type: 'carry', from: sq(p, [[3, 1]])[0], to: sq(p, [[1, 1]])[0]});
  assert.equal(runs.board.told, null, 'a change clears the answer');
  assert.equal(gardenOf(p, runs.board).fence, 18, 'every row and column one run');
  assert.ok(isSolved(p, play(p, runs, {type: 'claim'}).board));
  assert.equal(move(p, plant(p, [[0, 0], [2, 0]]), {type: 'claim'}), null, 'every tile first');
});

test('Two moves: the start is planted, two tiles may move, a tile carried home gives its move back', () => {
  const p = byId('fences-10'), fresh = freshAttempt(p);
  assert.equal(fresh.board.tiles.length, 12);
  assert.equal(gardenOf(p, fresh.board).fence, 20);
  assert.equal(movedOf(p, fresh.board), 0);
  const [a, b, c] = sq(p, [[0, 1], [1, 1], [3, 2]]), [gap1, gap2, far] = sq(p, [[2, 2], [2, 3], [4, 0]]);
  // The best single move fills a gap from the right: 16, and then stuck.
  const greedy = play(p, fresh, {type: 'carry', from: c, to: gap2});
  assert.equal(gardenOf(p, greedy.board).fence, 16);
  assert.equal(play(p, greedy, {type: 'claim'}).board.told, 'shorter');
  // The top two tiles into the gaps: a 3-by-4 block, fence 14.
  const one = play(p, fresh, {type: 'carry', from: a, to: gap2});
  assert.equal(gardenOf(p, one.board).fence, 18);
  const two = play(p, one, {type: 'carry', from: b, to: gap1});
  assert.equal(movedOf(p, two.board), 2);
  assert.equal(move(p, two, {type: 'carry', from: c, to: far}), null, 'a third tile can’t move');
  assert.equal(move(p, two, {type: 'lift', cell: c}), null);
  assert.ok(move(p, two, {type: 'carry', from: gap1, to: far}), 'a moved tile can move again');
  const back = play(p, two, {type: 'carry', from: gap1, to: b});
  assert.equal(movedOf(p, back.board), 1, 'carried home, its move comes back');
  assert.ok(isSolved(p, play(p, two, {type: 'claim'}).board));
  const html = playView(p, one, {pack, selected: null, message: ''});
  assert.equal((html.match(/<i class="on">/g) || []).length, 1, 'one move left');
  assert.equal((html.match(/sg-cell home/g) || []).length, 1, 'the square a tile left');
  assert.doesNotMatch(html, /class="gf-tray/, 'no tray while every tile is planted');
  assert.match(playView(p, play(p, one, {type: 'lift', cell: b}), {pack, selected: null, message: ''}), /class="gf-tray/);
  assert.equal(validBoard(p, {tiles: [...fresh.board.tiles.slice(3), ...sq(p, [[4, 0], [4, 1], [4, 2]])].sort((x, y) => x - y), told: null, claimed: false}), false, 'three tiles moved');
});

test('Longest round the pond: the pond must be shut in, and a corner seals it', () => {
  const p = byId('fences-08');
  const ring = [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [3, 3]];
  const full = plant(p, ring);
  assert.equal(gardenOf(p, full.board).fence, 16);
  assert.equal(play(p, full, {type: 'claim'}).board.told, 'longer');
  const open = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1]]);
  assert.equal(gardenOf(p, open.board).open, 1);
  assert.equal(move(p, open, {type: 'claim'}), null, 'an open pond can’t be claimed');
  assert.match(playView(p, open, {pack, selected: null, message: ''}), /Close the fence round the pond/);
  const sealed = plant(p, [[1, 1], [2, 1], [3, 1], [1, 2], [3, 2], [1, 3], [2, 3], [2, 4]]);
  const gd = gardenOf(p, sealed.board);
  assert.ok(gd.legal && gd.open === 0);
  assert.equal(gd.fence, 18);
  assert.ok(isSolved(p, play(p, sealed, {type: 'claim'}).board));
  assert.equal(move(p, freshAttempt(p), {type: 'plant', cells: sq(p, [[2, 2]])}), null, 'no tile on the pond');
});

test('Most: the fence may be shorter than the budget, and a garden over it can’t be claimed', () => {
  const p = byId('fences-06');
  const block = (w, h) => Array.from({length: w * h}, (_, i) => [i % w, Math.floor(i / w)]);
  const nine = plant(p, block(3, 3));
  assert.equal(play(p, nine, {type: 'claim'}).board.told, 'more');
  const row = plant(p, block(6, 1));
  assert.equal(gardenOf(p, row.board).fence, 14);
  const over = play(p, row, {type: 'plant', cells: sq(p, [[0, 1]])});
  assert.equal(gardenOf(p, over.board).fence, 16);
  assert.equal(move(p, over, {type: 'claim'}), null, 'over the budget');
  assert.match(playView(p, over, {pack, selected: null, message: ''}), /gf-fence over/);
  assert.ok(isSolved(p, play(p, plant(p, block(4, 3)), {type: 'claim'}).board));
});

test('every garden: each joins the row once, turned copies don’t, That’s all checks, Undo keeps the row', () => {
  const p = byId('fences-01');
  let a = plant(p, [[0, 0], [1, 0], [2, 0], [3, 0]]);
  assert.equal(a.board.found.length, 1);
  a = play(p, a, {type: 'clear'}, {type: 'plant', cells: sq(p, [[0, 0], [0, 1], [0, 2], [0, 3]])});
  assert.equal(a.board.found.length, 1, 'a straight row turned is the same garden');
  a = play(p, a, {type: 'clear'}, {type: 'plant', cells: sq(p, [[0, 0], [1, 0], [0, 1], [1, 1]])});
  assert.equal(a.board.found.length, 2);
  const short = play(p, a, {type: 'claim'});
  assert.equal(short.board.told, 'another');
  const back = undo(a), kept = mechanicFor(p).carry(p, a.board, back.board);
  assert.equal(kept.found.length, 2, 'Undo keeps the row');
  assert.ok(validBoard(p, kept));
  for (const g of [[[0, 0], [0, 1], [0, 2], [1, 2]], [[0, 0], [1, 0], [2, 0], [1, 1]], [[1, 0], [2, 0], [0, 1], [1, 1]]]) a = play(p, a, {type: 'clear'}, {type: 'plant', cells: sq(p, g)});
  assert.equal(a.board.found.length, 5);
  assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board));
  // With a fence given, other gardens don't join.
  const q = byId('fences-07'), straight = plant(q, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1]]);
  assert.deepEqual(straight.board.found, []);
});

test('Which fences: lengths light up and That’s all wants them all', () => {
  const p = byId('fences-04');
  const ten = plant(p, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]]);
  assert.equal(play(p, ten, {type: 'claim'}).board.told, 'another');
  const both = play(p, ten, {type: 'clear'}, {type: 'plant', cells: sq(p, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]])});
  assert.deepEqual([...both.board.found].sort((x, y) => x - y), [10, 12]);
  assert.ok(isSolved(p, play(p, both, {type: 'claim'}).board));
  assert.match(playView(p, both, {pack, selected: null, message: ''}), /class="found here"/);
});

test('hints alone solve every puzzle from fresh', () => {
  for (const p of fences.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 200 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('forged saves are rejected', () => {
  const p = byId('fences-05'), fresh = freshAttempt(p).board;
  for (const bad of [null, {tiles: [1, 0], told: null, claimed: false}, {tiles: [0, 0], told: null, claimed: false}, {tiles: [0], told: 'longer', claimed: false}, {tiles: [0], told: null, claimed: true}, {tiles: Array.from({length: 13}, (_, i) => i), told: null, claimed: false}, {...fresh, extra: 1, tiles: [99]}]) assert.equal(validBoard(p, bad), false, JSON.stringify(bad));
  const e = byId('fences-01');
  assert.equal(validBoard(e, {tiles: [0, 1, 2, 3], found: [], told: null, claimed: false}), false, 'a garden on the plot is in the row');
  assert.equal(validBoard(e, {tiles: [], found: ['0,0 1,0'], told: null, claimed: false}), false);
  const t = byId('fences-02');
  assert.equal(validBoard(t, {tiles: [], found: []}), false);
  const pl = byId('fences-playground');
  assert.equal(validBoard(pl, {size: 5, tiles: []}), false);
  assert.equal(validBoard(pl, {size: 4, tiles: [16]}), false);
});

test('rendering: the tray, the fence, and only the controls each puzzle needs', () => {
  for (const p of fences.puzzles) {
    const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
    assert.match(html, /data-sg-board/, p.id);
    assert.match(html, /gf-fence/, p.id);
    const q = p.parameters, claim = {fewest: 'Shortest', longest: 'Longest', most: 'Most', every: 'That’s all', fences: 'That’s all'}[q.mode];
    if (claim) assert.match(html, new RegExp(`>${claim}</button>`), p.id); else assert.doesNotMatch(html, /gf-claim/, p.id);
    assert.equal(/>Clear</.test(html), ['every', 'fences', 'playground'].includes(q.mode), `${p.id}: Clear`);
    assert.equal(/gf-chips/.test(html), q.mode === 'fences', `${p.id}: chips`);
    assert.equal(/class="gf-tray/.test(html), Boolean(q.tiles) && !q.moves, `${p.id}: tray`);
    assert.equal(/gf-moves/.test(html), Boolean(q.moves), `${p.id}: moves`);
    if (q.ponds) assert.match(html, /sg-cell pond/);
  }
  const p = byId('fences-02'), a = plant(p, [[0, 0], [2, 0], [0, 2], [2, 2], [3, 3]]);
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.match(html, /Join the tiles side to side/);
  assert.equal((html.match(/sg-edge fence/g) || []).length, 20, 'five separate tiles, four fence sides each');
});
