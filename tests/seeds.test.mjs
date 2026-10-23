// Seed plots: planting, growing (two neighbours, never corners), lifting and
// carrying seeds, the fence that never grows, each kind of claim and its
// answer, Undo keeping refusals and finishes, every seed needed, hints, saves
// and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {tapAction, strokeAction, closureOf, gridFor, fenceOf, filledOf, CERTIFICATE, TOLD} from '../dist/families/seeds/seeds.js';
import {loadPack} from '../scripts/packs.mjs';

const seeds = JSON.parse(await readFile(new URL('../dist/families/seeds/seeds.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => seeds.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const at = (p, b, [x, y]) => gridFor(p, b).at(x, y);
const plant = (p, list, a = freshAttempt(p)) => list.reduce((b, c) => play(p, b, {type: 'plant', cell: at(p, b.board, c)}), a);
const grow = (p, a, list) => list.reduce((b, c) => play(p, b, {type: 'grow', cells: [at(p, b.board, c)]}), a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

test('a square grows beside two filled squares, never across a corner, and can’t be planted', () => {
  const p = byId('seeds-01');
  const two = plant(p, [[0, 0], [1, 1]]);
  const g = gridFor(p, two.board);
  assert.deepEqual(tapAction(p, two.board, g.at(1, 0)), {type: 'grow', cells: [g.at(1, 0)]}, 'between two seeds: grow');
  assert.deepEqual(tapAction(p, two.board, g.at(2, 2)), {type: 'plant', cell: g.at(2, 2)}, 'touching one seed at a corner: plant');
  assert.equal(move(p, two, {type: 'plant', cell: g.at(1, 0)}), null, 'a square that can grow is not planted');
  assert.equal(move(p, two, {type: 'grow', cells: [g.at(2, 1)]}), null, 'one neighbour is not enough');
  const grown = grow(p, two, [[1, 0], [0, 1]]);
  assert.equal(filledOf(grown.board).size, 4);
  assert.equal(move(p, grown, {type: 'grow', cells: [g.at(2, 2)]}), null, 'corners don’t count');
  assert.deepEqual(tapAction(p, grown.board, g.at(1, 1)), {type: 'lift', cell: g.at(1, 1)});
  assert.equal(tapAction(p, grown.board, g.at(1, 0)), null, 'a grown square does nothing');
});

test('a drag grows squares in turn, all or nothing; a drag from a seed carries it', () => {
  const p = byId('seeds-04');
  const a = plant(p, [[0, 0], [1, 1]]), g = gridFor(p, a.board);
  assert.deepEqual(strokeAction(p, a.board, [g.at(1, 0), g.at(0, 1)]), {type: 'grow', cells: [g.at(1, 0), g.at(0, 1)]});
  assert.equal(strokeAction(p, a.board, [g.at(1, 0), g.at(2, 0)]), null, 'the second square has one neighbour');
  assert.deepEqual(strokeAction(p, a.board, [g.at(1, 1), g.at(2, 1), g.at(2, 2)]), {type: 'carry', from: g.at(1, 1), to: g.at(2, 2)});
  const carried = play(p, a, strokeAction(p, a.board, [g.at(1, 1), g.at(2, 1), g.at(2, 2)]));
  assert.deepEqual(carried.board.seeds, [g.at(0, 0), g.at(2, 2)]);
});

test('lifting a seed takes back the growth that needed it', () => {
  const p = byId('seeds-01');
  let a = plant(p, [[0, 0], [1, 1], [2, 2]]);
  a = grow(p, a, [[1, 0], [0, 1], [2, 1], [1, 2], [2, 0], [0, 2]]);
  assert.ok(isSolved(p, a.board), 'the diagonal fills 3 by 3');
  const b = plant(p, [[0, 0], [1, 1]]), c = grow(p, b, [[1, 0], [0, 1]]);
  const lifted = play(p, c, {type: 'lift', cell: at(p, c.board, [1, 1])});
  assert.deepEqual(lifted.board.grown, []);
});

test('the same seeds finish the same in any order, and the fence never grows', () => {
  const p = byId('seeds-playground');
  let a = plant(p, [[0, 0], [1, 1], [3, 1]]);
  const g = gridFor(p, a.board), finish = closureOf(g, a.board.seeds);
  let fence = fenceOf(g, filledOf(a.board));
  for (const order of [[[1, 0], [0, 1], [2, 1], [2, 0], [3, 0]], [[2, 1], [0, 1], [1, 0], [2, 0], [3, 0]]]) {
    let b = a.board.grown.length ? play(p, a, {type: 'regrow'}) : a;
    fence = fenceOf(g, filledOf(b.board));
    for (const c of order) {
      b = grow(p, b, [c]);
      const next = fenceOf(g, filledOf(b.board));
      assert.ok(next <= fence, 'the fence never gets longer');
      fence = next;
    }
    assert.deepEqual([...filledOf(b.board)].sort((x, y) => x - y), [...finish].sort((x, y) => x - y));
  }
  assert.equal(mechanicFor(p).noHint(p), true);
});

test('Can’t: seeds touching are asked to spread; a possible plot is answered; a right Can’t shows the fence', () => {
  const p = byId('seeds-05');
  const touching = plant(p, [[0, 0], [1, 0], [3, 3]]);
  const spread = play(p, touching, {type: 'claim'});
  assert.equal(spread.board.told, 'spread');
  assert.match(view(p, spread), new RegExp(TOLD.spread));
  assert.equal(move(p, spread, {type: 'claim'}), null, 'change something before claiming again');
  const apart = play(p, spread, {type: 'carry', from: at(p, spread.board, [1, 0]), to: at(p, spread.board, [2, 0])});
  assert.equal(apart.board.told, null, 'new seeds clear the answer');
  const right = play(p, apart, {type: 'claim'});
  assert.ok(isSolved(p, right.board));
  const html = view(p, right);
  assert.match(html, new RegExp(CERTIFICATE));
  assert.match(html, /aria-label="Fence 12 of 16"/);
  assert.equal(move(p, plant(p, [[0, 0], [2, 0]]), {type: 'claim'}), null, 'every seed first');
  // On a plot that can be filled, Can't is answered and the answer stays through Undo.
  const q = byId('seeds-04');
  let a = plant(q, [[0, 0], [2, 0], [0, 2], [2, 2]]);
  a = grow(q, a, [[1, 0], [0, 1]]);
  const told = play(q, a, {type: 'claim'});
  assert.equal(told.board.told, 'possible');
  assert.equal(undoPress(q, told).board.told, 'possible', 'Undo takes back moves, not answers');
  const moreGrowth = grow(q, told, [[2, 1]]);
  assert.equal(undoPress(q, moreGrowth).board.told, 'possible');
});

test('the rock is fence, not plot', () => {
  const p = byId('seeds-08'), html = view(p, freshAttempt(p));
  assert.match(html, /class="sd-rock"/);
  assert.match(html, /aria-label="Fence 0 of 20"/);
  assert.equal((html.match(/data-sg-cell=/g) || []).length, 15, 'fifteen squares to tap');
});

test('Fewest: one seed too many is told, and the fewest solves', () => {
  const p = byId('seeds-07');
  let a = plant(p, [[0, 0], [1, 1], [3, 0], [5, 1], [6, 0], [4, 1]]);
  assert.equal(move(p, a, {type: 'claim'}), null, 'Fewest waits for a full plot');
  const g = gridFor(p, a.board);
  while (g.cells.some((_, i) => tapAction(p, a.board, i)?.type === 'grow')) a = play(p, a, tapAction(p, a.board, g.cells.findIndex((_, i) => tapAction(p, a.board, i)?.type === 'grow')));
  const told = play(p, a, {type: 'claim'});
  assert.equal(told.board.told, 'fewer');
  assert.equal(undoPress(p, undoPress(p, told)).board.told, 'fewer', 'still these seeds');
  let five = plant(p, [[0, 0], [1, 1], [3, 0], [5, 1], [6, 0]]);
  while (g.cells.some((_, i) => tapAction(p, five.board, i)?.type === 'grow')) five = play(p, five, tapAction(p, five.board, g.cells.findIndex((_, i) => tapAction(p, five.board, i)?.type === 'grow')));
  assert.ok(isSolved(p, play(p, five, {type: 'claim'}).board));
});

test('Every seed needed: the plots without each seed, a spare seed, and a start that needs them all', () => {
  const p = byId('seeds-06');
  const growAll = a => { const g = gridFor(p, a.board); for (;;) { const i = g.cells.findIndex((_, k) => tapAction(p, a.board, k)?.type === 'grow'); if (i < 0) return a; a = play(p, a, {type: 'grow', cells: [i]}); } };
  const spare = growAll(plant(p, [[0, 0], [1, 1], [2, 2], [2, 0]]));
  assert.equal(isSolved(p, spare.board), false, 'the diagonal makes the fourth seed spare');
  const html = view(p, spare);
  assert.equal((html.match(/sg-board\s+sd-mini/g) || []).length, 4, 'one small plot per seed');
  assert.match(html, /A seed isn’t needed\./);
  const sides = growAll(plant(p, [[1, 0], [0, 1], [2, 1], [1, 2]]));
  assert.ok(isSolved(p, sides.board), 'a seed in the middle of each side');
  assert.doesNotMatch(view(p, sides), /<li class="full">/);
  const three = growAll(plant(p, [[0, 0], [1, 1], [2, 2]]));
  assert.equal(isSolved(p, three.board), false);
  assert.match(view(p, three), /Plant every seed\./);
});

test('finishes: each number joins the list once, That’s all checks, Undo keeps the list', () => {
  const p = byId('seeds-03');
  let a = plant(p, [[0, 0], [1, 0], [2, 0]]);
  assert.deepEqual(a.board.found, [3]);
  const short = play(p, a, {type: 'claim'});
  assert.equal(short.board.told, 'another');
  assert.equal(undoPress(p, short).board.told, 'another');
  a = play(p, a, {type: 'clear'});
  a = plant(p, [[0, 0], [2, 0], [1, 1]], a);
  assert.deepEqual(a.board.found, [3], 'not finished until nothing more grows');
  const g = gridFor(p, a.board);
  a = play(p, a, {type: 'grow', cells: [g.at(1, 0), g.at(0, 1), g.at(2, 1)]});
  assert.deepEqual(a.board.found, [3, 6]);
  const kept = mechanicFor(p).carry(p, a.board, undoPress(p, a).board);
  assert.deepEqual(kept.found, [3, 6]);
  assert.match(view(p, a), /<li class="here" aria-label="6 squares, on the plot">6<\/li>/);
  a = play(p, a, {type: 'clear'});
  a = plant(p, [[0, 0], [1, 0], [0, 1]], a);
  a = play(p, a, {type: 'grow', cells: [g.at(1, 1)]});
  a = play(p, a, {type: 'clear'});
  a = plant(p, [[0, 0], [1, 1], [2, 2]], a);
  a = play(p, a, {type: 'grow', cells: [g.at(1, 0), g.at(0, 1), g.at(2, 1), g.at(1, 2), g.at(2, 0), g.at(0, 2)]});
  assert.deepEqual([...a.board.found].sort((x, y) => x - y), [3, 4, 6, 9]);
  assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board));
});

test('hints alone solve every puzzle from fresh', () => {
  for (const p of seeds.puzzles.filter(p => p.band !== 'playground')) {
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
  const p = byId('seeds-04'), fresh = freshAttempt(p).board;
  for (const bad of [null, {...fresh, seeds: [1, 0]}, {...fresh, seeds: [0, 1, 4, 5]}, {...fresh, grown: [1]}, {...fresh, seeds: [0, 5], grown: [1, 4, 2]}, {...fresh, told: 'possible'}, {...fresh, claimed: true}, {...fresh, seeds: [0, 2, 8, 10, 15]}, {...fresh, extra: 1}]) assert.equal(validBoard(p, bad), false, JSON.stringify(bad));
  assert.equal(validBoard(p, {...fresh, seeds: [0, 5], grown: [1, 4]}), true);
  const f = byId('seeds-03');
  assert.equal(validBoard(f, {...freshAttempt(f).board, found: [5]}), false, 'five is no finish here');
  const pl = byId('seeds-playground');
  assert.equal(validBoard(pl, {size: 5, seeds: [], grown: [], last: null}), false);
  assert.equal(validBoard(pl, {size: 4, seeds: [16], grown: [], last: null}), false);
});

test('rendering: the tray, the fence, and only the controls each puzzle needs', () => {
  for (const p of seeds.puzzles) {
    const html = view(p, freshAttempt(p)), q = p.parameters;
    assert.match(html, /data-sg-board/, p.id);
    assert.match(html, /sd-fence/, p.id);
    const claim = {fill: 'Can’t', fewest: 'Fewest', finishes: 'That’s all'}[q.mode];
    if (claim) assert.match(html, new RegExp(`>${claim}</button>`), p.id); else assert.doesNotMatch(html, /sd-claim/, p.id);
    assert.equal(/>Clear</.test(html), ['finishes', 'playground'].includes(q.mode), `${p.id}: Clear`);
    assert.equal(/class="sd-tray/.test(html), q.seeds !== undefined, `${p.id}: tray`);
    assert.equal(/sd-sizes/.test(html), q.mode === 'playground', `${p.id}: sizes`);
    assert.equal(p.visibleObjective, q.mode === 'playground' ? '' : p.objective);
  }
  const p = byId('seeds-01'), a = plant(p, [[0, 0], [2, 0]]);
  const html = view(p, a);
  assert.equal((html.match(/sg-edge fence/g) || []).length, 8, 'two seeds apart: four fence sides each');
  assert.equal((html.match(/<i class="on">/g) || []).length, 1, 'one seed left in the tray');
});
