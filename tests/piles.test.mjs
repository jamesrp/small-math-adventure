// Moving piles: least work on the worksheet's pairs, the move rules and the
// record, budgets and red dots, designing a start, the cards and Best with its
// refusals and locks, the ring, the playground, hints, Undo, saves, the
// picked pile and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {leastWork, pilesFrom, replay, traffic, planSteps, designStarts, farthest, roadOf} from '../dist/families/piles/piles.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/piles/piles.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = id => pack.puzzles.find(p => p.id === id);
const P = (m, list) => pilesFrom(m, [...list]);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const go = (from, to) => ({type: 'move', from, to});
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const line = byId('piles-02').parameters.map, ring = byId('piles-11').parameters.map, star = byId('piles-04').parameters.map;

test('least work on the worksheet’s pairs', () => {
  assert.equal(leastWork(line, P(line, '00'), P(line, '24')), 6);
  assert.equal(leastWork(line, P(line, '03'), P(line, '12')), 2);
  assert.equal(leastWork(line, P(line, '0005'), P(line, '1234')), 7);
  assert.equal(leastWork(line, P(line, '1144'), P(line, '0225')), 5);
  assert.equal(leastWork(line, P(line, '2222'), P(line, '0134')), 6);
  assert.equal(leastWork(line, P(line, '0055'), P(line, '2233')), 8);
  assert.equal(leastWork(line, P(line, '03'), P(line, '25')), 4);
  assert.equal(leastWork(star, P(star, 'AAC'), P(star, 'OBB')), 5);
  assert.equal(leastWork(star, P(star, 'AAB'), P(star, 'ACC')), 4);
  assert.equal(leastWork(star, P(star, 'AAAB'), P(star, 'AOCC')), 5);
  assert.equal(leastWork(ring, P(ring, '0000'), P(ring, '1245')), 6);
  assert.equal(leastWork(line, P(line, '0000'), P(line, '1245')), 12);
  assert.equal(leastWork(line, P(line, '1'), P(line, '01')), null, 'unequal totals have no least work');
});

test('the record: legal steps, piles and road traffic', () => {
  assert.deepEqual(replay(line, P(line, '03'), [['0', '1'], ['3', '2']]), P(line, '12'));
  assert.equal(replay(line, P(line, '03'), [['1', '2']]), null, 'no counter on 1');
  assert.equal(replay(line, P(line, '03'), [['0', '2']]), null, 'no road from 0 to 2');
  assert.equal(replay(ring, P(ring, '0'), [['0', '5']]).join(), P(ring, '5').join(), 'the ring joins 5 and 0');
  const t = traffic(line, [['0', '1'], ['1', '2'], ['2', '1']]);
  assert.deepEqual(t[roadOf(line, '0', '1')], {n: 1, net: 1});
  assert.deepEqual(t[roadOf(line, '1', '2')], {n: 2, net: 0});
  assert.deepEqual(planSteps(line, P(line, '03'), P(line, '25')).sort(), [['0', '1'], ['3', '4']], 'nearest-first’s 3 → 2 is not a best first step');
});

test('a move puzzle: budget, red dots and the solve', () => {
  const p = byId('piles-01');
  let a = play(p, freshAttempt(p), go('0', '1'));
  assert.equal(move(p, a, go('0', '1')), null, 'bin 0 is empty now');
  assert.equal(move(p, a, go('3', '1')), null, 'one road at a time');
  const crossed = play(p, a, go('1', '2'), go('3', '2'), go('2', '1'));
  assert.ok(!isSolved(p, crossed.board), 'four moves are over the budget');
  assert.match(view(p, crossed), /pl-pip over/);
  assert.match(view(p, crossed), /<p class="pl-told">Fewer moves would do\.<\/p>/, 'rings filled over the budget say so unasked');
  assert.doesNotMatch(view(p, play(p, a, go('1', '2'))), /pl-told/, 'no line while rings are still empty');
  assert.deepEqual(nextHint(p, play(p, a, go('1', '2'))), {type: 'deadend', quiet: true, text: 'There aren’t enough moves left. Undo.'});
  a = play(p, a, go('3', '2'));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, go('1', '0')), null, 'nothing moves after a solve');
  const html = view(p, a);
  assert.equal((html.match(/class="pl-flow"/g) || []).length, 2, 'each road crossed shows its count');
});

test('designing a start: placing, exactly k, and fewer would do', () => {
  const p = byId('piles-06'), q = p.parameters;
  assert.equal(designStarts(q.map, q.target, 4, 7).length, 19);
  assert.equal(designStarts(q.map, q.target, 4, 4).length, 16);
  let a = freshAttempt(p);
  assert.match(view(p, a), /pl-tray-dot/);
  assert.equal(move(p, a, go('0', '1')), null);
  a = play(p, a, ...[...'0003'].map(node => ({type: 'place', node})));
  assert.equal(move(p, a, {type: 'place', node: '1'}), null);
  assert.doesNotMatch(view(p, a), /pl-tray-dot/, 'the tray is empty');
  a = play(p, a, go('3', '2'), go('0', '1'), go('1', '2'), go('0', '1'), go('1', '2'), go('0', '1'), go('1', '2'));
  assert.ok(isSolved(p, a.board));
  // 0113 needs 5: an out-and-back makes 7 but is not a solve.
  let b = play(p, freshAttempt(p), ...[...'0113'].map(node => ({type: 'place', node})));
  b = play(p, b, go('3', '4'), go('4', '3'), go('3', '2'), go('1', '2'), go('1', '2'), go('0', '1'), go('1', '2'));
  assert.ok(!isSolved(p, b.board));
  assert.match(view(p, b), /Fewer moves would do\./);
  // The star's longest trips: only A3.
  const s = byId('piles-08');
  assert.deepEqual(designStarts(s.parameters.map, s.parameters.target, 3, 6), [P(s.parameters.map, 'AAA')]);
});

test('hints place the counters, then move them', () => {
  const p = byId('piles-09');
  let a = freshAttempt(p);
  const first = nextHint(p, a);
  assert.equal(first.action.type, 'place');
  a = play(p, a, ...[...'1111'].map(node => ({type: 'place', node})));
  assert.equal(nextHint(p, a).type, 'deadend', '1111 needs 10, not 5');
  assert.ok(nextHint(p, a).quiet, 'told only behind Hint');
});

test('cards: pairs, Best, the two refusals and their locks through Undo', () => {
  const p = byId('piles-10'), q = p.parameters, draw = att => view(p, att);
  assert.deepEqual(farthest(q.map, q.cards), {best: 8, pairs: [[0, 7]]});
  let a = play(p, freshAttempt(p), {type: 'card', card: 2});
  assert.deepEqual(play(p, a, {type: 'card', card: 2}).board.pair, [], 'the same card lets go');
  a = play(p, a, {type: 'card', card: 6});
  assert.equal(move(p, a, {type: 'best'}), null, 'Best waits for the rings to fill');
  // 0224 → 1223: 0 → 1 and 4 → 3.
  a = play(p, a, go('0', '1'), go('4', '3'), {type: 'best'});
  assert.equal(a.board.told, 'farther');
  assert.match(draw(a), /Another pair takes more moves\./);
  assert.equal(move(p, a, {type: 'best'}), null);
  const back = undoPress(p, a, draw, draw(a));
  assert.equal(back.board.told, null, 'Undo takes the line away');
  assert.equal(move(p, back, {type: 'best'}), null, 'and keeps Best off');
  assert.match(draw(back), /pl-best[^>]*disabled/);
  // A new pair, then back to the old one: still refused.
  let b = play(p, back, {type: 'card', card: 0}, {type: 'card', card: 7});
  b = play(p, b, go('0', '1'), go('1', '0'), go('0', '1'), go('1', '2'), go('0', '1'), go('1', '2'), go('4', '3'), go('3', '2'), go('4', '3'), go('3', '2'), {type: 'best'});
  assert.equal(b.board.told, 'less', 'a wasteful plan on the farthest pair');
  assert.match(draw(b), /Fewer moves would do\./);
  const again = play(p, b, {type: 'card', card: 2}, {type: 'card', card: 6}, go('0', '1'), go('4', '3'));
  assert.equal(move(p, again, {type: 'best'}), null, 'a refused pair stays refused');
  // Undo onto the board the claim made shows its line again.
  let u = play(p, b, go('2', '1'));
  assert.equal(u.board.told, null);
  u = undoPress(p, u, draw, draw(u));
  assert.equal(u.board.told, 'less');
  // The right claim.
  let r = play(p, freshAttempt(p), {type: 'card', card: 0}, {type: 'card', card: 7});
  r = play(p, r, go('0', '1'), go('1', '2'), go('0', '1'), go('1', '2'), go('4', '3'), go('3', '2'), go('4', '3'), go('3', '2'), {type: 'best'});
  assert.ok(isSolved(p, r.board));
  assert.equal(r.board.shut.length, 0);
});

test('the ring: both ways round', () => {
  const p = byId('piles-12');
  const a = play(p, freshAttempt(p), go('0', '5'), go('2', '3'), go('1', '0'), go('0', '5'), go('5', '4'));
  assert.ok(isSolved(p, a.board), '0 → 5, 2 → 3 and 1 → 4 the long way: 5');
  const b = play(p, freshAttempt(p), go('0', '1'), go('1', '2'), go('2', '3'));
  assert.equal(nextHint(p, b).type, 'deadend', 'sliding the pile round costs too much');
});

test('the playground: tools, maps, the move count and caps', () => {
  const p = byId('piles-playground'), m = mechanicFor(p);
  assert.equal(m.noHint(p), true);
  let a = play(p, freshAttempt(p), {type: 'add', node: '0'}, {type: 'ring', node: '2'}, go('0', '1'), go('1', '2'));
  assert.equal(a.board.work, 2);
  assert.ok(!isSolved(p, a.board));
  a = play(p, a, {type: 'map', map: 'star'});
  assert.deepEqual(a.board.counters, [0, 0, 0, 0]);
  assert.equal(move(p, a, {type: 'map', map: 'star'}), null, 'already on the star');
  m.ui(p, {tool: 'ring'});
  assert.match(view(p, a), /aria-pressed="true" aria-label="Rings"/);
  m.reset(p);
});

test('the picked pile is view state, let go by any move or Undo', () => {
  const p = byId('piles-02'), m = mechanicFor(p);
  let a = freshAttempt(p);
  m.ui(p, {pick: '0', at: a.moves});
  let html = view(p, a);
  assert.match(html, /gb-node picked/);
  assert.match(html, /gb-node can-go/);
  a = play(p, a, go('0', '1'));
  assert.doesNotMatch(view(p, a), /gb-node picked/, 'a move lets go');
  m.ui(p, {pick: '1', at: a.moves});
  const back = undoPress(p, a, att => view(p, att), view(p, a));
  assert.doesNotMatch(view(p, back), /gb-node picked/, 'Undo lets go');
  m.ui(p, {pick: 'x'});
  m.reset(p);
});

test('saves: forged records are rejected', () => {
  const p = byId('piles-03');
  assert.ok(validBoard(p, {log: [['0', '1']]}));
  assert.ok(!validBoard(p, {log: [['1', '2']]}));
  assert.ok(!validBoard(p, {log: [['0', '1', '2']]}));
  assert.ok(!validBoard(p, null));
  const c = byId('piles-10');
  assert.ok(!validBoard(c, {pair: [0, 7], log: [], told: null, shut: [], claimed: true}));
  assert.ok(!validBoard(c, {pair: [0], log: [['0', '1']], told: null, shut: [], claimed: false}), 'no moves before the pair');
  assert.ok(!validBoard(c, {pair: [], log: [], told: null, shut: ['not json'], claimed: false}));
});

test('every puzzle renders with its board and the hints solve it', () => {
  for (const p of pack.puzzles) {
    let a = freshAttempt(p);
    const html = view(p, a);
    assert.match(html, /data-mechanic-wire="piles"/, p.id);
    assert.match(html, /gb-board/, p.id);
    if (p.band === 'playground') continue;
    for (let k = 0; k < 60 && !isSolved(p, a.board); k++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve it`);
    assert.equal(p.familyTitle, 'Moving piles');
  }
});

test('hints answer quickly', () => {
  for (const p of pack.puzzles.filter(p => p.band !== 'playground')) {
    const t0 = performance.now();
    for (let k = 0; k < 20; k++) nextHint(p, freshAttempt(p));
    assert.ok((performance.now() - t0) / 20 < 100, `${p.id}: a hint in under 100 ms`);
  }
});
