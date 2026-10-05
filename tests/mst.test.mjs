// Cheapest networks: buying and returning links, the claim and its answers,
// collecting every cheapest network, swap budgets, splits, loops, price design,
// hints, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {optima, cheapestCost, loopLinks, improvingSwap, forcingSplits, excludingLoops, isLoop, crossing, groupsOf} from '../dist/families/mst/mst.js';
import {loadPack} from '../scripts/packs.mjs';

const mst = JSON.parse(await readFile(new URL('../dist/families/mst/mst.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => mst.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const L = (p, name) => p.parameters.links.findIndex(([u, v]) => u + v === name);
const buy = (p, ...names) => names.map(n => ({type: 'link', link: L(p, n)}));
const prices = p => p.parameters.links.map(l => l[2]);

test('the first map: one cheapest network, a loop link and a cheaper swap', () => {
  const p = byId('mst-01'), q = p.parameters;
  assert.equal(cheapestCost(q, prices(p)), 6);
  assert.deepEqual(optima(q, prices(p)).map(t => t.map(i => q.links[i].slice(0, 2).join(''))), [['BC', 'AD', 'AC']]);
  assert.deepEqual(loopLinks(q, [L(p, 'AB'), L(p, 'BC'), L(p, 'AC')]).length, 3, 'a triangle is all loop');
  const swap = improvingSwap(q, prices(p), [L(p, 'AB'), L(p, 'BC'), L(p, 'CD')]);
  assert.deepEqual(swap, {add: L(p, 'AC'), drop: L(p, 'AB')}, 'the biggest saving');
  assert.equal(groupsOf(q, [L(p, 'AB')]).count, 3);
});

test('buying, returning and the claim', () => {
  const p = byId('mst-01');
  let a = play(p, freshAttempt(p), ...buy(p, 'AB', 'BC'));
  assert.equal(move(p, a, {type: 'claim'}), null, 'no claim until every place is joined');
  a = play(p, a, ...buy(p, 'CD'), {type: 'claim'});
  assert.deepEqual(a.board.told, {kind: 'swap', add: L(p, 'AC'), drop: L(p, 'AB')});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(move(p, a, {type: 'claim'}), null, 'change something first');
  a = play(p, a, ...buy(p, 'AC'));
  assert.equal(a.board.told, null, 'a move clears the answer');
  a = play(p, a, {type: 'claim'});
  assert.equal(a.board.told.kind, 'loop', 'a loop link to return');
  a = play(p, a, ...buy(p, 'AB', 'CD', 'AD'), {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'link', link: 0}), null, 'nothing moves after a solve');
});

test('every cheapest network: keep, found already, there is another, That’s all', () => {
  const p = byId('mst-03');
  assert.equal(p.parameters.answers, 4);
  let a = play(p, freshAttempt(p), ...buy(p, 'AC', 'AB', 'AD'), {type: 'claim'});
  assert.equal(a.board.found.length, 1);
  assert.equal(play(p, a, {type: 'claim'}).board.told.kind, 'again');
  assert.equal(play(p, a, {type: 'all'}).board.told.kind, 'more');
  a = play(p, a, ...buy(p, 'AD', 'CD'), {type: 'claim'}, ...buy(p, 'AB', 'BC'), {type: 'claim'}, ...buy(p, 'CD', 'AD'), {type: 'claim'});
  assert.equal(a.board.found.length, 4);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('Undo keeps the networks already found', () => {
  const p = byId('mst-03');
  const a = play(p, freshAttempt(p), ...buy(p, 'AC', 'AB', 'AD'), {type: 'claim'});
  const back = undo(a), m = mechanicFor(p);
  const kept = m.carry(p, a.board, back.board);
  assert.equal(kept.found.length, 1);
  assert.ok(validBoard(p, kept));
});

test('swaps: new links are limited, returned ones give the swap back', () => {
  const p = byId('mst-05'), q = p.parameters;
  let a = freshAttempt(p);
  assert.equal(a.board.bought.length, 5, 'the start network is bought');
  a = play(p, a, ...buy(p, 'AC', 'AD'));
  assert.equal(move(p, a, ...buy(p, 'AE')), null, 'two new links used');
  a = play(p, a, ...buy(p, 'AC'), ...buy(p, 'AE'));
  assert.ok(a.board.bought.includes(L(p, 'AE')));
  // The plan: buy AE, return AB; buy DE, return BC.
  let b = play(p, freshAttempt(p), ...buy(p, 'AE', 'AB', 'DE', 'BC'), {type: 'claim'});
  assert.ok(isSolved(p, b.board));
  assert.equal(q.budget, 2);
});

test('a split proves a forced link; a loop proves an excluded one', () => {
  const forced = byId('mst-07'), q = forced.parameters;
  assert.equal(forcingSplits(q).length, 4);
  assert.deepEqual(crossing(q, ['E', 'F']).map(i => q.links[i].slice(0, 2).join('')).sort(), ['BE', 'CF', 'DE']);
  let a = play(forced, freshAttempt(forced), {type: 'place', node: 'E'});
  assert.equal(isSolved(forced, a.board), false, 'E alone: EF is cheaper');
  a = play(forced, a, {type: 'place', node: 'F'});
  assert.ok(isSolved(forced, a.board));
  const hard = byId('mst-11');
  assert.deepEqual(forcingSplits(hard.parameters), [['E', 'G']], 'one split only');
  const excluded = byId('mst-08'), e = excluded.parameters;
  assert.equal(excludingLoops(e).length, 1);
  assert.equal(isLoop(e, [L(excluded, 'AC'), L(excluded, 'AD'), L(excluded, 'CD')]), true);
  let b = play(excluded, freshAttempt(excluded), ...buy(excluded, 'AC', 'CD'));
  assert.equal(isSolved(excluded, b.board), false);
  b = play(excluded, b, ...buy(excluded, 'AD'));
  assert.ok(isSolved(excluded, b.board));
  assert.equal(isSolved(excluded, {bought: ['AB', 'AC', 'AD', 'CD'].map(n => L(excluded, n)).sort((x, y) => x - y)}), false, 'one loop and nothing else');
});

test('price design: tap to change, Check lists the cheapest networks', () => {
  const p = byId('mst-12');
  let a = play(p, freshAttempt(p), {type: 'check'});
  assert.equal(a.board.told.kind, 'list');
  assert.equal(optima(p.parameters, a.board.prices).length, 16);
  a = play(p, a, {type: 'price', link: L(p, 'AB')}, {type: 'price', link: L(p, 'CD')});
  assert.deepEqual([a.board.prices[L(p, 'AB')], a.board.prices[L(p, 'CD')]], [2, 2]);
  a = play(p, a, {type: 'check'});
  assert.ok(isSolved(p, a.board), 'a loop of four 1s gives four cheapest networks');
  const four = play(p, freshAttempt(p), ...Array(4).fill({type: 'price', link: 0}));
  assert.equal(four.board.prices[0], 1, 'prices cycle 1, 2, 3, 4, 1');
});

test('hints alone solve every puzzle', () => {
  for (const p of mst.puzzles) {
    let a = freshAttempt(p);
    for (let n = 0; n < 80 && !isSolved(p, a.board); n++) a = play(p, a, nextHint(p, a).action);
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('forged saves are rejected', () => {
  const p = byId('mst-01');
  assert.equal(validBoard(p, {bought: [0, 1, 3], claimed: true, told: null}), false, 'a claim on a dear network');
  assert.equal(validBoard(p, {bought: [0, 1, 3], claimed: false, told: {kind: 'swap', add: 0, drop: 1}}), false, 'an invented answer');
  const e = byId('mst-03');
  assert.equal(validBoard(e, {bought: [], found: [[0, 1, 2]], told: null, done: false}), false, 'a found network that is not cheapest');
  const s = byId('mst-05');
  assert.equal(validBoard(s, {bought: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], claimed: false, told: null}), false, 'past the budget');
  const d = byId('mst-12');
  assert.equal(validBoard(d, {prices: [1, 1, 1, 1, 1, 1], checked: true, told: null}), false, 'a forged check');
  for (const q of mst.puzzles) assert.ok(validBoard(q, freshAttempt(q).board), `${q.id}: fresh board is valid`);
});

test('every puzzle renders its board and controls', () => {
  for (const p of mst.puzzles) {
    const html = playView(p, freshAttempt(p), {pack, selected: null, message: ''});
    assert.match(html, /data-gb-board/, `${p.id}: the map`);
    assert.match(html, /data-mechanic-wire="mst"/, `${p.id}: wired`);
    const mode = p.parameters.mode;
    if (['cheapest', 'every', 'swap'].includes(mode)) assert.match(html, /mst-pile/, `${p.id}: the coin`);
    if (mode === 'every') assert.match(html, /That’s all/);
    if (mode === 'swap') assert.match(html, /mst-swaps/);
    if (mode === 'design') assert.match(html, />Check</);
    if (mode === 'forced') assert.match(html, /data-gb-node=/, `${p.id}: places are controls`);
  }
  const p = byId('mst-01');
  const a = play(p, freshAttempt(p), ...buy(p, 'AB', 'BC', 'CD'), {type: 'claim'});
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.match(html, /told-add/); assert.match(html, /told-drop/); assert.match(html, /this swap costs less/);
});
