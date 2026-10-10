// Lamplighter (dist/families/lamplighter/lamplighter.js), the group in Lantern
// Wires: walks and flips on a street, a ring and a grid, the fewest moves
// (flips plus walk), dead ends, taps and their refusals, budgets, any
// shortest word accepted, hints, rendering, saves and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {boardOf, step, letterTo, replay, fewest, fewestFrom, startOf, goalOf, distances, shortestWord} from '../dist/families/lamplighter/lamplighter.js';
import validateLamplighter from '../scripts/validate-lamplighter.mjs';
import {loadPack} from '../scripts/packs.mjs';

const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const P = n => byId(`lamplighter-${String(n).padStart(2, '0')}`);
const html = (p, a) => mechanicFor(p).render(p, a);
const tap = k => ({lantern: k});
// Lanterns on the −4 … 4 street are numbered 0 … 8 in the board.
const at = pos => pos + 4;
const play = (p, a, taps) => taps.reduce((x, t) => { const next = move(p, x, t); assert.ok(next, `${p.id}: ${JSON.stringify(t)}`); return next; }, a);
// Plays a move word by tapping: F taps the lantern underfoot, a walk taps the neighbour.
const word = (p, a, w) => [...w].reduce((x, c) => { const q = p.parameters, g = boardOf(q), s = replay(q, x.board.word); return play(p, x, [tap(c === 'F' ? s.at : g.walk[c](s.at))]); }, a);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }

test('the pack validates: budgets by flips and every order, theorems, hints, refusals and forged saves', async () => {
  const report = await validateLamplighter();
  assert.equal(report.puzzles, 12);
  assert.equal(report.deadEnds, 49);
  assert.ok(report.checked > 300000);
});

test('walks and flips on a street, a ring and a grid', () => {
  const street = boardOf(P(1).parameters), ring = boardOf(P(9).parameters), grid = boardOf(P(12).parameters);
  assert.equal(street.n, 9); assert.equal(ring.n, 8); assert.equal(grid.n, 12);
  assert.deepEqual(step(street, {at: 4, lit: 0}, 'R'), {at: 5, lit: 0});
  assert.deepEqual(step(street, {at: 4, lit: 0}, 'F'), {at: 4, lit: 16});
  assert.deepEqual(step(street, {at: 4, lit: 16}, 'F'), {at: 4, lit: 0}, 'a second flip puts it out');
  assert.equal(step(street, {at: 0, lit: 0}, 'L'), null, 'no walking off the street');
  assert.equal(step(street, {at: 0, lit: 0}, 'U'), null);
  assert.deepEqual(step(ring, {at: 0, lit: 0}, 'L'), {at: 7, lit: 0}, 'the ring goes round');
  assert.equal(step(grid, {at: 4, lit: 0}, 'U').at, 0);
  assert.equal(step(grid, {at: 0, lit: 0}, 'U'), null);
  assert.equal(step(grid, {at: 3, lit: 0}, 'R'), null, 'no walking off the right edge of the grid');
  assert.equal(letterTo(street, 4, 3), 'L'); assert.equal(letterTo(street, 4, 4), 'F'); assert.equal(letterTo(street, 4, 6), null);
  assert.equal(letterTo(street, 0, 8), null, 'the street does not wrap');
  assert.equal(letterTo(ring, 0, 7), 'L'); assert.equal(letterTo(ring, 7, 0), 'R');
  assert.equal(letterTo(grid, 5, 9), 'D'); assert.equal(letterTo(grid, 5, 10), null, 'no diagonal walks');
  assert.equal(replay(P(1).parameters, 'LLLLL'), null);
  assert.equal(replay(P(1).parameters, 'RX'), null);
});

test('the fewest moves is the flips plus the walk, and the end you finish near goes last', () => {
  assert.deepEqual(puzzles.filter(p => p.mechanic === 'lamplighter').map(p => p.parameters.budget), [2, 5, 6, 9, 11, 7, 12, 13, 12, 11, 14, 13]);
  for (const p of puzzles.filter(q => q.mechanic === 'lamplighter')) {
    assert.equal(fewest(p.parameters), p.parameters.budget, p.id);
    const w = shortestWord(p.parameters, startOf(p.parameters));
    assert.equal(w.length, p.parameters.budget);
    assert.deepEqual(replay(p.parameters, w), goalOf(p.parameters));
  }
  // Puzzle 7: the same lanterns, the other end first, is 2 longer.
  const q = P(7).parameters;
  assert.equal(fewestFrom(q, replay(q, 'R')), 11, 'right first stays on a shortest route');
  assert.equal(fewestFrom(q, replay(q, 'L')), 13, 'left first is a wasted move');
  // Puzzles 4 and 5: the same lanterns, ending at home costs 2 more.
  assert.equal(P(5).parameters.budget - P(4).parameters.budget, 2);
});

test('dead ends: from lanterns −1, 0 and 1 lit with the lamplighter home, every move is closer to dark', () => {
  const dark = {...P(6).parameters, goal: {at: 0, lit: []}};
  const table = distances(dark), g = boardOf(dark), s = replay(P(6).parameters, P(6).solution.word);
  assert.equal(table.get(s), 7);
  assert.deepEqual([...g.letters].map(c => table.get(step(g, s, c))), [6, 6, 6]);
  // Puzzle 5's street is a dead end too; puzzle 4's is not.
  const five = replay(P(5).parameters, P(5).solution.word), four = replay(P(4).parameters, P(4).solution.word);
  assert.deepEqual([...g.letters].map(c => table.get(step(g, five, c))), [10, 10, 10]);
  assert.ok([...g.letters].some(c => table.get(step(g, four, c)) === 10));
});

test('a puzzle plays by taps: the lantern underfoot flips, a neighbour is walked to, any other is refused', () => {
  const p = P(2);
  let a = freshAttempt(p);
  assert.equal(move(p, a, tap(at(2))), null, 'two places away');
  assert.equal(move(p, a, tap(at(-4))), null);
  assert.equal(move(p, a, tap(9)), null, 'off the street');
  assert.equal(move(p, a, {lantern: '3'}), null);
  a = play(p, a, [tap(at(-1)), tap(at(-1))]);
  assert.equal(a.board.word, 'LF');
  assert.match(html(p, a), /aria-label="Put out lantern −1"/);
  assert.match(html(p, a), /aria-label="Walk to lantern 0"/);
  assert.match(html(p, a), /aria-label="Lantern 1" aria-disabled="true"/);
  assert.equal((html(p, a).match(/class="ll-slot"/g) || []).length, 3, 'an outline for each move left');
  assert.match(html(p, a), /<span class="sr-only">Walk left<\/span>/);
  assert.match(html(p, a), /<span class="sr-only">Lit lantern −1<\/span>/);
  a = play(p, a, [tap(at(0)), tap(at(1)), tap(at(1))]);
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, a), /ll-board ll-street solved/);
  assert.doesNotMatch(html(p, a), /data-action="expansion-move"/, 'nothing to tap after a solve');
  assert.equal(move(p, a, tap(at(1))), null);
});

test('every shortest word is accepted, not only the witness', () => {
  const p = P(3);
  for (const w of ['FRRFLL', 'RRFLLF']) assert.ok(isSolved(p, word(p, freshAttempt(p), w).board), w);
  const ring = P(10);
  for (const w of ['LLFLLLFLLFL', 'RFRRFRRRFRR']) assert.ok(isSolved(ring, word(ring, freshAttempt(ring), w).board), w);
  const grid = P(11);
  for (const w of ['ULFRRFDDFLLFUR', 'DRFLLFUUFRRFDL', 'LUFRRFDDFLLFRU']) assert.ok(isSolved(grid, word(grid, freshAttempt(grid), w).board), w);
});

test('the budget: a wasted move means Undo, and no move past the last outline', () => {
  const p = P(4);
  let a = word(p, freshAttempt(p), 'R');
  assert.deepEqual(nextHint(p, a), {type: 'deadend', text: 'Too few moves are left. Undo.'});
  a = word(p, a, 'FFFFFFFF');
  assert.equal(a.board.word.length, 9);
  assert.equal(move(p, a, tap(at(1))), null, 'the budget is spent');
  assert.doesNotMatch(html(p, a), /data-action="expansion-move"/);
  assert.equal(nextHint(p, a).type, 'deadend');
  assert.equal(nextHint(p, undo(undo(a))).type, 'deadend');
  assert.equal(nextHint(p, freshAttempt(p)).type, 'move');
});

test('hints name the next move of a shortest finish in words, and mark its lantern', () => {
  const p = P(8);
  const a = freshAttempt(p);
  assert.deepEqual(nextHint(p, a), {type: 'move', action: tap(at(2)), remaining: 13, text: 'Walk right.'});
  const b = word(p, a, 'R');
  assert.equal(nextHint(p, b).text, 'Put out this lantern.');
  assert.equal(nextHint(p, word(p, b, 'F')).text, 'Walk right.');
  assert.equal(nextHint(P(1), word(P(1), freshAttempt(P(1)), 'R')).text, 'Light this lantern.');
  assert.equal(nextHint(P(9), freshAttempt(P(9))).text, 'Walk anticlockwise.');
  assert.equal(nextHint(P(12), freshAttempt(P(12))).text, 'Walk up.');
  assert.doesNotMatch(html(p, a), /ll-halo hint/);
  assert.match(html(p, {...a, hintLevel: 2}), /ll-halo hint/);
  assert.match(html(p, {...a, hintLevel: 2}), /class="ll-lamp hinted"[^>]*aria-label="Walk to lantern 2, lit"/);
  // Hints alone finish every puzzle.
  for (const q of puzzles.filter(x => x.mechanic === 'lamplighter')) {
    let x = freshAttempt(q);
    for (let i = 0; i < 20 && !isSolved(q, x.board); i++) x = move(q, x, nextHint(q, x).action);
    assert.ok(isSolved(q, x.board), q.id);
    assert.equal(x.board.word.length, q.parameters.budget);
  }
});

test('the board: goal card, lamplighter, rings for the lantern underfoot and its neighbours, and words for screen readers', () => {
  const p = P(8), a = freshAttempt(p), out = html(p, a);
  assert.match(out, /<figure class="ll-goal" role="img" aria-label="Goal: lanterns −1, 0 and 3 lit; the lamplighter at −2\.">/);
  assert.match(out, /role="status">Lanterns −3, −1 and 2 lit; the lamplighter at 1\. 13 of 13 moves left\./);
  assert.equal((out.match(/class="ll-halo next"/g) || []).length, 2, 'two lanterns to walk to');
  assert.equal((out.match(/class="ll-halo"/g) || []).length, 1, 'the lantern underfoot');
  assert.equal((out.match(/class="ll-halo ghost"/g) || []).length, 1, 'the goal card’s lamplighter');
  assert.match(out, /class="ll-lamplighter ghost"/);
  assert.match(out, /ll-home/, 'home is marked on the street');
  assert.match(out, /aria-label="Light lantern 1"/, 'lantern 1 is dark at the start');
  const ring = html(P(9), freshAttempt(P(9))), grid = html(P(12), freshAttempt(P(12)));
  assert.match(ring, /aria-label="Ring of 8 lanterns, numbered 0 to 7 clockwise from the top"/);
  assert.match(ring, /aria-label="Walk to lantern 7"/);
  assert.match(grid, /aria-label="Walk to lantern in row 1, column 1"/);
  assert.match(grid, /Goal: lanterns at row 1 column 2, row 1 column 4, row 3 column 2 and row 3 column 4 lit; the lamplighter at row 2 column 4\./);
  assert.match(html(P(1), freshAttempt(P(1))), /Goal: lantern 1 lit; the lamplighter at 1\.[^]*Every lantern dark; the lamplighter at 0\. 2 of 2 moves left\./);
  assert.doesNotMatch(ring + grid, /ll-home/, 'no home mark off the street');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = P(7), q = P(12);
  const half = word(p, freshAttempt(p), 'RRF'), done = word(q, freshAttempt(q), q.solution.word);
  const saved = {[p.id]: half, [q.id]: done};
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile(saved)]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of Object.entries(saved)) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  for (const board of [{word: 'RRFX'}, {word: 'L'.repeat(5)}, {word: 'F'.repeat(13)}, {word: 'RRF', extra: true}, {moves: 'RRF'}]) {
    assert.equal(validBoard(p, board), false, JSON.stringify(board));
    const forged = {...store, profiles: [profile({[p.id]: {...half, board}})]};
    assert.throws(() => validateStore(forged, puzzles), JSON.stringify(board));
  }
  assert.equal(validBoard(q, {word: 'U'.repeat(2)}), false, 'off the top of the grid');
});

test('the satchel lists the Lamplighter group in Lantern Wires', () => {
  const html = libraryView(profile({'lamplighter-03': {completed: true}}), puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-toggle"'));
  const section = family.slice(0, family.indexOf('</details>'));
  assert.match(section, /<h2>Lamplighter<\/h2>/);
  assert.ok(section.indexOf('<h2>Hard</h2>') < section.indexOf('<h2>Lamplighter</h2>'), 'below Lantern Wires’ own levels');
  for (let n = 1; n <= 12; n++) assert.ok(section.includes(`data-id="lamplighter-${String(n).padStart(2, '0')}"`));
  assert.match(section, /Lantern Wires, Lamplighter, puzzle 3, completed/);
});
