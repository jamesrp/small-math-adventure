// Running totals: the tray machine and its weights, differences going back,
// the starts an every puzzle allows, the Can't reasons, the moves and their
// refusals, the taps a board offers with and without a picked turn, hints,
// Undo and its locks, saves, the playground and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {columns, finalOf, weights, orders, reach, extremes, inputsFor, startsFor, handOf, certificate, reasonText} from '../dist/families/totals/totals.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/totals/totals.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const put = (slot, card) => ({type: 'put', slot, card});
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const board = html => html.match(/<div class="tt-board[\s\S]*$/)[0];
const attrsOf = (html, re) => { const m = board(html).match(re); assert.ok(m, `found ${re}`); return m[0]; };
const moveIn = tag => JSON.parse(tag.match(/data-move="([^"]*)"/)[1].replace(/&quot;/g, '"'));

test('the machine: columns, weights and the worksheet’s numbers', () => {
  assert.deepEqual(columns([1, 1], [2]), [[1, 3], [1, 4]], 'the worksheet’s worked turn: input 2 from (1, 1)');
  assert.deepEqual(columns([3, 3, 3], [1]), [[3, 4], [3, 7], [3, 10]], 'Problem 18’s worked turn');
  assert.deepEqual(columns([0, 0], [2, null, 1]), [[0, 2, null, null], [0, 2, null, null]], 'totals stop at an empty turn');
  assert.deepEqual(columns([null], [1, 2]), [[null, null, null]], 'an unknown start leaves every total blank');
  assert.equal(finalOf([0, 0], [2, 2, 1, 0, 0]), 21);
  assert.equal(finalOf([0, 0], [0, 0, 1, 2, 2]), 9);
  assert.equal(finalOf([0, 0, 0], [1, 1, 1, 1, 1, 1]), 56);
  assert.equal(finalOf([0, 0], [2, null]), null);
  assert.deepEqual(weights(5, 1), [1, 1, 1, 1, 1]);
  assert.deepEqual(weights(5, 2), [5, 4, 3, 2, 1]);
  assert.deepEqual(weights(5, 3), [15, 10, 6, 3, 1]);
  assert.equal(orders([2, 2, 1, 0, 0]).length, 30);
  assert.equal(orders([0, 1, 2, 3, 4]).length, 120);
  const q = {start: [0, 0], cards: [4, 1, 0, 0, 0]};
  assert.deepEqual(extremes(q), {most: 24, least: 6});
  assert.ok(!reach(q).has(15) && !reach(q).has(10) && !reach(q).has(20));
  assert.deepEqual(reach(q).get(14), [[0, 0, 4, 1, 0]]);
});

test('going back: differences and starts', () => {
  assert.deepEqual(inputsFor([2], [5, 5, 9, 12]), [3, 0, 4, 3]);
  assert.deepEqual(inputsFor([0, 0], [2, 5, 8, 14]), [2, 1, 0, 3]);
  assert.deepEqual(inputsFor([0, 0, 0], [1, 4, 10, 20]), [1, 1, 1, 1], 'corner piles from all ones');
  assert.deepEqual(inputsFor([6], [4, 7, 7, 12]), [-2, 3, 0, 5], 'a start too big needs a card below 0');
  assert.deepEqual(startsFor({goal: [4, 7, 7, 12], startCap: 8}), [0, 1, 2, 3, 4]);
  assert.deepEqual(startsFor({goal: [4, 7, 7, 12], startCap: 8, supply: [0, 1, 2, 3]}), [], 'without a 5 no start works');
  assert.deepEqual(handOf({cards: [2, 2, 1, 0, 0]}, [2, null, 0, null, null]), [2, 1, 0]);
  assert.equal(handOf({cards: [2, 1]}, [2, 2]), null);
});

test('Can’t reasons', () => {
  const q = {mode: 'make', start: [0, 0], cards: [2, 2, 1, 0, 0], target: 22, cant: true};
  assert.equal(certificate(q, [2, 2, 1, 0, 0]), 'most');
  assert.equal(certificate(q, [2, 1, 2, 0, 0]), null, 'not biggest first');
  assert.equal(certificate(q, [2, 2, 1, 0, null]), null, 'not full');
  assert.equal(certificate({...q, target: 8}, [0, 0, 1, 2, 2]), 'least');
  assert.equal(certificate({...q, target: 8}, [2, 2, 1, 0, 0]), null, 'the most is no reason for a target below the least');
  assert.equal(certificate({...q, target: 21}, [2, 2, 1, 0, 0]), null, 'the lane makes the target');
  assert.equal(certificate({...q, target: 15}, [2, 2, 1, 0, 0]), null, 'a target inside the range');
  const one = {mode: 'make', start: [3], cards: [0, 1, 2, 3, 4], target: 12, cant: true};
  assert.equal(certificate(one, [4, 3, 2, 1, 0]), 'same');
  assert.equal(certificate(one, [0, 1, 2, 3, 4]), 'same');
  assert.equal(reasonText(q), 'Biggest first makes the most, 21. 22 is more.');
  assert.equal(reasonText({...q, start: [0, 0, 0], target: 13}), 'Smallest first makes the least, 14. 13 is less.');
  assert.equal(reasonText(one), 'Every order makes 13, so 12 can’t be made.');
});

test('make: cards, the hand, a solve and nothing after it', () => {
  const p = byId('totals-03');
  let a = play(p, freshAttempt(p), put(0, 1), put(1, 2));
  assert.ok(!isSolved(p, a.board), '1, 2 makes 4');
  assert.match(view(p, a), /tt-cell last bad/, 'a missed total is marked');
  assert.equal(move(p, a, put(0, 2)), null, 'turn 1 is full');
  a = play(p, a, {type: 'swap', a: 0, b: 1});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /tt-cell last good/);
  assert.equal(move(p, a, {type: 'take', slot: 0}), null, 'nothing after a solve');
  assert.doesNotMatch(board(view(p, a)), /data-action="expansion-move"/, 'a solved board offers no moves');
});

test('taps: a card goes to the first empty turn; a picked turn takes a card, trades or gives its card back', () => {
  const p = byId('totals-06'), mech = mechanicFor(p);
  mech.reset(p);
  let a = freshAttempt(p);
  // With nothing picked, a card goes to the first empty turn.
  assert.deepEqual(moveIn(attrsOf(view(p, a), /<button[^>]*data-tt-card="1"[^>]*>/)), put(0, 1));
  a = play(p, a, put(0, 1), put(1, 2));
  // Pick turn 4 (empty): a card goes there.
  mech.ui(p, {sel: 3});
  assert.deepEqual(moveIn(attrsOf(view(p, a), /<button[^>]*data-tt-card="0"[^>]*>/)), put(3, 0));
  // Pick turn 1 (holding 1): a card changes it, another turn trades with it, and turn 1 again takes it back.
  mech.ui(p, {sel: 0});
  let html = view(p, a);
  assert.deepEqual(moveIn(attrsOf(html, /<button[^>]*data-tt-card="2"[^>]*>/)), {type: 'change', slot: 0, card: 2});
  assert.deepEqual(moveIn(attrsOf(html, /<button[^>]*data-tt-slot="1"[^>]*>/)), {type: 'swap', a: 0, b: 1});
  assert.deepEqual(moveIn(attrsOf(html, /<button[^>]*data-tt-slot="0"[^>]*>/)), {type: 'take', slot: 0});
  assert.match(attrsOf(html, /<button[^>]*data-tt-slot="0"[^>]*>/), /aria-pressed="true"/);
  // A move clears the pick.
  a = play(p, a, {type: 'change', slot: 0, card: 2});
  assert.deepEqual(a.board.lane, [2, 2, null, null, null]);
  assert.match(attrsOf(view(p, a), /<button[^>]*data-tt-slot="2"[^>]*>/), /data-ui="\{&quot;sel&quot;:2\}"/);
  // Two turns with the same card do not trade: the second tap picks it instead.
  mech.ui(p, {sel: 0});
  assert.match(attrsOf(view(p, a), /<button[^>]*data-tt-slot="1"[^>]*>/), /data-ui="\{&quot;sel&quot;:1\}"/);
  mech.reset(p);
});

test('a move pops the cells it changed, tray by tray', () => {
  const p = byId('totals-10'), mech = mechanicFor(p);
  let a = play(p, freshAttempt(p), put(0, 2));
  const html = board(view(p, a));
  assert.match(html, /tt-slot filled pop" style="--d:0"/);
  assert.match(html, /tt-cell pop" style="--d:1"[^>]*>2</);
  assert.match(html, /tt-cell pop" style="--d:2"[^>]*>2</);
  assert.match(html, /tt-cell last pop" style="--d:3"[^>]*>2</);
  mech.ui(p, {sel: 1});
  assert.doesNotMatch(board(view(p, a)), / pop"/, 'a tap that only picks clears the pop');
  mech.reset(p);
});

test('Can’t: refused, locked until the lane changes, kept by Undo; then accepted', () => {
  const p = byId('totals-07');
  let a = play(p, freshAttempt(p), put(0, 2), put(1, 1), put(2, 2), put(3, 0), put(4, 0));
  assert.match(view(p, a), /tt-cant"[^>]*>Can’t/);
  a = play(p, a, {type: 'cant'});
  assert.equal(a.board.refused, true);
  assert.match(view(p, a), /tt-note bad">That doesn’t rule it out\./);
  assert.equal(move(p, a, {type: 'cant'}), null);
  const draw = att => view(p, att), back = undoPress(p, a, draw, draw(a));
  assert.deepEqual(back.board.lane, [2, 1, 2, 0, null], 'one press goes past the refusal to the last card');
  assert.equal(nextHint(p, a).text, 'Swap turns 2 and 3.');
  a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.refused, false);
  assert.equal(nextHint(p, a).text, 'Biggest first makes the most, 21. 22 is more.');
  assert.deepEqual(nextHint(p, a).action, {type: 'cant'});
  a = play(p, a, {type: 'cant'});
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /Biggest first makes the most: 21\./);
});

test('hints: the first empty turn, a change, a swap, a start and That’s all', () => {
  const p = byId('totals-05');
  let a = freshAttempt(p);
  assert.deepEqual(nextHint(p, a), {type: 'move', action: put(0, 0), text: 'Play 0 next.'});
  a = play(p, a, put(1, 3));
  assert.equal(nextHint(p, a).text, 'Play 0 next.');
  a = play(p, a, put(0, 0));
  assert.equal(nextHint(p, a).text, 'Change turn 2 to 1.');
  const m = byId('totals-01');
  let b = play(m, freshAttempt(m), put(2, 4));
  assert.equal(nextHint(m, b).text, 'Play 3 next.');
  const e = byId('totals-08');
  let c = freshAttempt(e);
  assert.deepEqual(nextHint(e, c), {type: 'move', action: {type: 'start', value: 0}, text: 'Start at 0.'});
  c = play(e, c, {type: 'start', value: 3});
  assert.equal(nextHint(e, c).text, 'Play 1 next.');
  for (const s of [0, 1, 2, 3, 4]) { c = play(e, c, {type: 'start', value: s}); for (const [slot, card] of [[0, 4 - s], [1, 3], [2, 0], [3, 5]]) if (c.board.lane[slot] !== card) c = play(e, c, c.board.lane[slot] === null ? put(slot, card) : {type: 'change', slot, card}); }
  assert.deepEqual(c.board.found, [0, 1, 2, 3, 4]);
  assert.deepEqual(nextHint(e, c), {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'});
  // Hints are outlined on the board from level 2.
  const shown = view(e, {...c, hintLevel: 2});
  assert.match(shown, /tt-all hinted/);
  const s = byId('totals-11');
  let d = play(s, freshAttempt(s), put(0, 2));
  assert.equal(nextHint(s, d).text, 'Change turn 1 to 0.');
});

test('every: starts, finds, a wrong That’s all and Undo', () => {
  const p = byId('totals-08');
  let a = freshAttempt(p);
  assert.match(view(p, a), /tt-start unknown" aria-hidden="true">\?</);
  assert.match(view(p, a), /Find every start that makes these totals\./);
  a = play(p, a, {type: 'start', value: 1}, put(0, 3), put(1, 3), put(2, 0), put(3, 5));
  assert.deepEqual(a.board.found, [1]);
  assert.match(view(p, a), /tt-chip on found/);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.told, 'more');
  assert.match(view(p, a), /There is another\./);
  assert.match(view(p, a), /tt-all[^>]*disabled/);
  const draw = att => view(p, att), back = undoPress(p, a, draw, draw(a));
  assert.deepEqual(back.board.found, [1]); assert.equal(back.board.told, 'more');
  assert.deepEqual(back.board.lane, [3, 3, 0, null], 'the press takes back a card');
  a = play(p, a, {type: 'start', value: 0}, {type: 'change', slot: 0, card: 4});
  assert.deepEqual(a.board.found, [0, 1]); assert.equal(a.board.told, null);
});

test('saves are checked', () => {
  const p = byId('totals-06'), f = freshAttempt(p).board;
  assert.ok(validBoard(p, f));
  assert.ok(!validBoard(p, {...f, lane: [2, 2, 2, null, null]}));
  assert.ok(!validBoard(p, {...f, claim: 'most'}));
  assert.ok(!validBoard(p, null));
  assert.ok(!validBoard(p, {lane: f.lane}));
  const e = byId('totals-08'), ef = freshAttempt(e).board;
  assert.ok(!validBoard(e, {...ef, found: [7]}));
  assert.ok(!validBoard(e, {...ef, done: true}));
});

test('the playground: trays, totals and no goal', () => {
  const g = byId('totals-playground'), mech = mechanicFor(g);
  assert.equal(mech.noHint(g), true);
  let a = play(g, freshAttempt(g), {type: 'trays', n: 3});
  for (let s = 0; s < 6; s++) a = play(g, a, put(s, 1));
  const html = board(view(g, a));
  assert.match(html, />56<\/span>/);
  assert.doesNotMatch(html, /tt-goal/, 'no goals in the playground');
  assert.match(html, /tt-trayn on/);
  assert.ok(!isSolved(g, a.board));
  a = play(g, a, {type: 'change', slot: 0, card: 0});
  assert.match(board(view(g, a)), />35<\/span>/, 'a 0 first: tray 3 reads 35 after six turns');
});

test('every puzzle renders with a status line and a goal row', () => {
  for (const p of pack.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="totals"/);
    assert.match(html, /role="status"/);
    if (p.parameters.mode !== 'playground') assert.match(html, /tt-lab-goal/);
  }
});
