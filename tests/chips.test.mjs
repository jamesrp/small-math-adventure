import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {mechanicFor} from '../dist/expansion.js';
import {runOf, BOARDS, PLAYGROUND_BOARDS} from '../dist/families/chips/chips.js';
import {validateChips} from '../scripts/validate-chips.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const chips = await read('../dist/families/chips/chips.json');
// The app merges the packs at load time (dist/main.js).
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const fire = node => ({type: 'fire', node}), add = node => ({type: 'add', node});

test('the pack validates: answers match an independent search, hints solve, illegal moves fail', async () => {
  const report = await validateChips();
  assert.equal(report.chipPuzzles, 12);
});

test('two orders from A 2, B 2 finish the same way and solve the first puzzle', () => {
  const p = byId('chips-01');
  let a = play(p, freshAttempt(p), [fire('A'), fire('B')]);
  assert.deepEqual(a.board.found, ['AB']);
  assert.deepEqual(runOf(p, a.board).piles, [1, 1]);
  assert.equal(runOf(p, a.board).sink, 2);
  assert.equal(move(p, a, fire('A')), null, 'nothing can fire at the finish');
  a = play(p, a, [{type: 'again'}, fire('B'), fire('A')]);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(runOf(p, a.board).piles, [1, 1]);
});

test('a repeated order counts once, and Again keeps what was found', () => {
  const p = byId('chips-03');
  let a = play(p, freshAttempt(p), [fire('A'), fire('B'), fire('A'), fire('B')]);
  a = play(p, a, [{type: 'again'}, fire('A'), fire('B'), fire('A'), fire('B')]);
  assert.deepEqual(a.board.found, ['ABAB']);
  a = play(p, a, [{type: 'again'}]);
  assert.equal(a.board.word, '');
  assert.deepEqual(a.board.found, ['ABAB']);
  assert.equal(move(p, play(p, a, [fire('A')]), fire('A')), null, 'A holds one chip after firing once');
});

test('placing chips: firing waits for the tray, and only matching starts count', () => {
  const p = byId('chips-05');
  let a = play(p, freshAttempt(p), [add('A'), add('A'), add('A'), add('A')]);
  assert.equal(move(p, a, fire('A')), null, 'no firing while chips remain');
  a = play(p, a, [add('B'), add('B')]);
  assert.equal(move(p, a, add('A')), null, 'the tray is empty');
  while (runOf(p, a.board).ready.length) a = move(p, a, fire(['A', 'B'][runOf(p, a.board).ready[0]]));
  assert.deepEqual(runOf(p, a.board).piles, [0, 1], 'A 4, B 2 finishes at A 0, B 1');
  assert.deepEqual(a.board.found, [], 'a different finish does not count');
  a = play(p, a, [{type: 'again'}, add('A'), add('A'), add('A'), add('B'), add('B'), add('B')]);
  while (runOf(p, a.board).ready.length) a = move(p, a, fire(['A', 'B'][runOf(p, a.board).ready[0]]));
  assert.deepEqual(a.board.found, ['3,3']);
});

test('the avalanche needs a full board and the extra chip on B', () => {
  const p = byId('chips-07');
  let a = play(p, freshAttempt(p), [add('A'), add('B'), add('C'), add('B')]);
  assert.equal(a.board.drop, 'B');
  assert.equal(move(p, a, add('A')), null, 'no adding after the extra chip');
  a = play(p, a, [fire('B'), fire('A'), fire('C'), fire('B')]);
  assert.ok(isSolved(p, a.board));
  let short = play(p, freshAttempt(p), [add('A'), add('B'), add('C'), add('A'), fire('A'), fire('B'), fire('C')]);
  assert.equal(runOf(p, short.board).finished, true);
  assert.equal(isSolved(p, short.board), false, 'adding at A makes only three firings');
});

test('without a sink, a repeated board solves the loop puzzle', () => {
  const p = byId('chips-12');
  let a = play(p, freshAttempt(p), [add('A'), add('A'), add('B'), fire('A'), fire('B')]);
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, [fire('C')]);
  assert.ok(runOf(p, a.board).looped);
  assert.ok(isSolved(p, a.board));
  let still = play(p, freshAttempt(p), [add('A'), add('A'), add('A'), fire('A')]);
  assert.equal(runOf(p, still.board).finished, true);
  assert.equal(isSolved(p, still.board), false, 'A 3 stops at one chip each');
});

test('Undo takes back a firing but keeps a discovery; Restart clears everything', () => {
  const p = byId('chips-04'), m = mechanicFor(p);
  let a = play(p, freshAttempt(p), [fire('A'), fire('B'), fire('C')]);
  assert.deepEqual(a.board.found, ['ABC']);
  const takeBack = x => { const y = undo(x); return {...y, board: m.carry(p, x.board, y.board)}; };
  let back = takeBack(takeBack(a));
  assert.equal(back.board.word, 'A');
  assert.deepEqual(back.board.found, ['ABC']);
  back = play(p, back, [fire('C'), fire('B')]);
  assert.deepEqual(back.board.found, ['ABC', 'ACB']);
  assert.deepEqual(restart(p, back).board.found, []);
});

test('saves round-trip through storage, and solved puzzles reopen fresh', () => {
  const p = byId('chips-02');
  let a = freshAttempt(p);
  for (let i = 0; !isSolved(p, a.board) && i < 100; i++) a = move(p, a, nextHint(p, a).action);
  const pg = byId('chips-playground');
  const grid = play(pg, freshAttempt(pg), [{type: 'board', board: 'grid'}, {type: 'add', cell: 312, amount: 100}]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, [pg.id]: grid})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  assert.deepEqual(loaded.store.profiles[0].attempts[p.id].board, a.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[pg.id].board, grid.board);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, found: ['9,9']}}})]};
  assert.throws(() => validateStore(forged, puzzles));
});

test('the playground has every board, no Hint button, and never counts as solved', () => {
  const pg = byId('chips-playground');
  let a = freshAttempt(pg);
  for (const board of PLAYGROUND_BOARDS) {
    a = move(pg, a, {type: 'board', board}) || a;
    const html = playView(pg, a, {pack, selected: null, message: ''});
    assert.doesNotMatch(html, /data-action="hint"/);
    assert.doesNotMatch(html, /class="puzzle-goal"/);
    assert.match(html, /data-mechanic-wire="chips"/);
    assert.equal(isSolved(pg, a.board), false);
  }
  assert.equal(visiblePuzzleObjective(pg), '');
  assert.ok(puzzleObjective(pg));
});

// Where the family sits in the satchel, and whether it starts open, is the
// seam's rule (tests/families.test.mjs).
test('the satchel lists Chip firing with its playground and twelve puzzles', () => {
  const html = libraryView(profile({'chips-03': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-chips"/);
  assert.match(html, /data-id="chips-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="chips-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Chip firing, Easy, puzzle 3, completed/);
});

test('every puzzle renders its board, goal and controls', () => {
  for (const p of chips.puzzles) {
    const a = freshAttempt(p), html = playView(p, a, {pack, selected: null, message: ''});
    assert.match(html, /class="chip-(board|grid)/, p.id);
    if (p.band !== 'playground') {
      assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
      if (p.parameters.answers > 1) assert.equal((html.match(/chip-slot empty/g) || []).length, p.parameters.answers, `${p.id}: one slot per answer`);
    }
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Chip firing/);
});
