import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {mechanicFor} from '../dist/expansion.js';
import {runOf, BOARDS, PLAYGROUND_BOARDS, stillRun} from '../dist/families/chips/chips.js';
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
  assert.equal(report.stillPuzzles, 2);
});

test('two orders from A 2, B 2 finish the same way and solve the first puzzle', () => {
  const p = byId('chips-01');
  let a = play(p, freshAttempt(p), [fire('A'), fire('B')]);
  assert.deepEqual(a.board.found, ['AB']);
  assert.deepEqual(runOf(p, a.board).piles, [1, 1]);
  assert.equal(runOf(p, a.board).sink, 2);
  assert.equal(move(p, a, fire('A')), null, 'nothing can fire at the finish');
  a = play(p, a, [{type: 'again'}, fire('B'), fire('A')]);
  assert.equal(isSolved(p, a.board), false, 'all answers need an explicit completeness claim');
  a = play(p, a, [{type: 'all'}]);
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
test('the satchel lists Chip firing with its playground, twelve puzzles and the Still boards group', () => {
  const html = libraryView(profile({'chips-03': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-chips"/);
  assert.match(html, /data-id="chips-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="chips-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Chip firing, Easy, puzzle 3, completed/);
  const family = html.slice(html.indexOf('data-view-key="family-chips"')), chips = family.slice(0, family.indexOf('</details>'));
  assert.ok(chips.indexOf('<h2>Hard</h2>') < chips.indexOf('<h2>Still boards</h2>'), 'the group follows Hard');
  assert.match(chips, /aria-label="Chip firing, Still boards, puzzle 1"/);
  assert.match(chips, /aria-label="Chip firing, Still boards, puzzle 2"/);
});

test('every puzzle renders its board, goal and controls', () => {
  for (const p of chips.puzzles) {
    const a = freshAttempt(p), html = playView(p, a, {pack, selected: null, message: ''});
    assert.match(html, /class="chip-(board|grid)/, p.id);
    if (p.band !== 'playground') {
      assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
      assert.doesNotMatch(html, /chip-slot empty|Found \d+ of/, `${p.id}: no answer count revealed`);
      if (['orders', 'finishes', 'starts'].includes(p.parameters.mode)) assert.match(html, /That’s all/);
    }
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Chip firing/);
});


test('completeness claims reject a partial collection without revealing its size, and old completed saves remain readable', () => {
  const p = byId('chips-01');
  let a = play(p, freshAttempt(p), [fire('A'), fire('B'), {type: 'all'}]);
  assert.equal(a.board.claim, 'more');
  assert.equal(isSolved(p, a.board), false);
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.match(html, /There is another\./);
  assert.doesNotMatch(html, /Found 1 of 2|chip-slot empty|remain/);
  assert.match(html, /data-focus="chip-all" disabled>That’s all/, 'That’s all is off after a refusal');
  assert.equal(move(p, a, {type: 'all'}), null, 'and pressing it again does nothing');
  a = play(p, a, [{type: 'again'}]);
  assert.equal(a.board.claim, 'more', 'New run keeps the refusal');
  assert.equal(move(p, a, {type: 'all'}), null);
  a = play(p, a, [fire('B'), fire('A')]);
  assert.equal(a.board.claim, 'open', 'a new order on the shelf opens That’s all again');
  const legacy = {...a.board}; delete legacy.claim;
  assert.equal(mechanicFor(p).valid(p, legacy), true);
  assert.equal(isSolved(p, legacy), true, 'the prior completed format keeps its solve');
  assert.equal(mechanicFor(p).valid(p, {...freshAttempt(p).board, claim: 'all'}), false, 'forged complete claim rejected');
  a = play(p, a, [{type: 'all'}]);
  assert.equal(isSolved(p, a.board), true);
});

test('Undo into legacy history keeps an unclaimed collection unclaimed and saveable', () => {
  const p = byId('chips-01'), m = mechanicFor(p);
  const legacy = freshAttempt(p); delete legacy.board.claim;
  let a = play(p, legacy, [fire('A'), fire('B'), {type: 'again'}, fire('B'), fire('A')]);
  assert.equal(a.completed, false);
  while (a.history.length) {
    const back = undo(a);
    a = {...back, board: m.carry(p, a.board, back.board)};
    assert.equal(a.board.claim, 'open');
    assert.equal(isSolved(p, a.board), false);
    const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a})]};
    assert.doesNotThrow(() => validateStore(store, puzzles));
  }
  assert.deepEqual(a.board.found, ['AB', 'BA']);
  assert.ok(isSolved(p, play(p, a, [{type: 'all'}]).board));
});

test('That’s all is off with an empty shelf, and Undo never takes back a refusal', () => {
  const p = byId('chips-03'), m = mechanicFor(p);
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'all'}), null);
  assert.match(playView(p, a, {pack, selected: null, message: ''}), /data-focus="chip-all" disabled>That’s all/);
  a = play(p, a, [fire('A'), fire('B'), fire('A'), fire('B'), {type: 'all'}]);
  assert.equal(a.board.claim, 'more');
  const takeBack = x => { const y = undo(x); return {...y, board: m.carry(p, x.board, y.board)}; };
  for (let k = 0; k < 3; k++) { a = takeBack(a); assert.equal(a.board.claim, 'more', `Undo ${k + 1} keeps the refusal`); }
  assert.deepEqual(a.board.found, ['ABAB']);
  assert.equal(a.board.word, 'AB');
});

// The Still boards group: capacity and the add-one cycle.
const still = id => byId(id), add2 = node => ({type: 'add', node}), drop = {type: 'drop'};
const takeBackStill = (p, x) => { const y = undo(x); return {...y, board: mechanicFor(p).carry(p, x.board, y.board)}; };

test('capacity: chips go on until a circle glows, and Most is judged by the total', () => {
  const p = still('chips-s01');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {steps: '', claim: null});
  assert.equal(move(p, a, {type: 'most'}), null, 'Most needs chips on the board');
  a = play(p, a, [add2('A'), add2('A'), add2('A')]);
  assert.deepEqual(stillRun(p, a.board.steps).ready, [0], 'A glows at its third chip: it has three lines');
  assert.equal(move(p, a, {type: 'most'}), null, 'no claim while a circle glows');
  assert.equal(move(p, a, add2('A')), null, 'a glowing circle fires rather than takes a chip');
  a = play(p, a, [fire('A')]);
  assert.deepEqual(stillRun(p, a.board.steps).piles, [0, 1, 1]);
  assert.equal(stillRun(p, a.board.steps).sink, 1);
  a = play(p, a, [{type: 'most'}]);
  assert.equal(a.board.claim, 'more');
  assert.match(playView(p, a, {pack, selected: null, message: ''}), /More chips fit\./);
  assert.equal(move(p, a, {type: 'most'}), null, 'Most stays off until the board changes');
  assert.equal(takeBackStill(p, a).board.claim, 'more', 'Undo keeps the refusal');
  a = play(p, a, [add2('A'), add2('A'), add2('C')]);
  assert.equal(a.board.claim, null);
  assert.deepEqual(stillRun(p, a.board.steps).piles, [2, 1, 2]);
  a = play(p, a, [{type: 'most'}]);
  assert.ok(isSolved(p, a.board));
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.equal((html.match(/class="chip-end"/g) || []).length, 5, 'each chip waits at one line end');
  assert.equal((html.match(/class="chip-end bare"/g) || []).length, 3, 'and one line end at each circle has none');
  assert.match(html, /Every circle has one line with no chip\./);
});

test('the cycle: a still start, chips added at A, and a start that comes back is shelved', () => {
  const p = still('chips-s02');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {steps: '', found: [], claim: 'open', taps: []});
  a = play(p, a, [add2('B'), drop]);
  assert.equal(move(p, a, add2('B')), null, 'placing ends with the first chip at A');
  a = play(p, a, [drop]);
  assert.deepEqual(stillRun(p, a.board.steps).ready, [0]);
  assert.equal(move(p, a, drop), null, 'no chip at A while A glows');
  a = play(p, a, [fire('A'), fire('B'), drop, fire('A')]);
  const run = stillRun(p, a.board.steps);
  assert.deepEqual(run.record, [[0, 1], [1, 1], [1, 0], [0, 1]]);
  assert.ok(run.ended && run.returned);
  assert.deepEqual(a.board.found, ['0,1']);
  assert.equal(move(p, a, drop), null, 'the run ends at the repeat');
  // From no chips the row repeats A 1 B 0, not the start.
  a = play(p, a, [{type: 'again'}, drop, drop, fire('A'), drop, drop, fire('A'), fire('B')]);
  const empty = stillRun(p, a.board.steps);
  assert.deepEqual(empty.record, [[0, 0], [1, 0], [0, 1], [1, 1], [1, 0]]);
  assert.ok(empty.ended && !empty.returned);
  assert.deepEqual(a.board.found, ['0,1'], 'a start that never comes back is not shelved');
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.doesNotMatch(html, /\b[0-9] of [0-9]\b|chip-slot empty/, 'no count of answers');
  assert.match(html, /data-chip-pick="1" data-focus="chip-all" aria-pressed="false" >That’s all/);
});

test('the cycle: That’s all is judged with two boards that go to the same board', () => {
  const p = still('chips-s02'), m = mechanicFor(p);
  const run = (a, actions) => play(p, a, actions);
  // Shelve A 1 B 0 and A 0 B 1, then run from no chips.
  let a = run(freshAttempt(p), [add2('A'), drop, fire('A'), drop, drop, fire('A'), fire('B'), {type: 'again'}, add2('B'), drop, drop, fire('A'), fire('B'), drop, fire('A'), {type: 'again'}]);
  assert.deepEqual(a.board.found, ['1,0', '0,1']);
  a = run(a, [drop, drop, fire('A'), drop, drop, fire('A'), fire('B')]);
  assert.equal(move(p, a, {type: 'claim', taps: [0, 0]}), null);
  const wrong = run(a, [{type: 'claim', taps: [0, 1]}]);
  assert.equal(wrong.board.claim, 'apart');
  assert.match(playView(p, wrong, {pack, selected: null, message: ''}), /Those two don’t go to the same board\./);
  assert.equal(move(p, wrong, {type: 'claim', taps: [0, 3]}), null, 'no second pair on the same row');
  assert.equal(takeBackStill(p, wrong).board.claim, 'apart', 'Undo keeps the refused pair');
  const short = run(a, [{type: 'claim', taps: [3, 0]}]);
  assert.equal(short.board.claim, 'more', 'the right pair, but A 1 B 1 is not on the shelf');
  assert.match(playView(p, short, {pack, selected: null, message: ''}), /There is another\./);
  assert.equal(run(short, [{type: 'again'}]).board.claim, 'more', 'New run keeps There is another');
  // Shelve A 1 B 1 and claim again from a new row.
  let b = run(short, [{type: 'again'}, add2('A'), add2('B'), drop, fire('A'), fire('B'), drop, fire('A'), drop]);
  assert.deepEqual(b.board.found, ['1,0', '0,1', '1,1']);
  assert.equal(b.board.claim, 'open');
  b = run(b, [{type: 'again'}, drop, drop, fire('A'), drop, drop, fire('A'), fire('B'), {type: 'claim', taps: [0, 3]}]);
  assert.ok(isSolved(p, b.board));
  const html = playView(p, b, {pack, selected: null, message: ''});
  assert.equal((html.match(/chip-rec[^"]* merge/g) || []).length, 2, 'the two boards');
  assert.equal((html.match(/chip-rec[^"]* meet/g) || []).length, 2, 'and A 1 B 0 after each of them');
  assert.equal(m.carry(p, b.board, freshAttempt(p).board).claim, 'all');
});

test('the cycle: a finished row is not tappable until That’s all opens it', () => {
  const p = still('chips-s02'), m = mechanicFor(p);
  const a = play(p, freshAttempt(p), [add2('A'), drop, fire('A'), drop, drop, fire('A'), fire('B')]);
  m.reset(p);
  const html = playView(p, a, {pack, selected: null, message: ''});
  assert.doesNotMatch(html, /data-chip-tap/);
  assert.match(html, /<p class="chip-ask">Find every start that comes back/, 'the objective sits on the board');
  assert.doesNotMatch(html, /class="puzzle-goal"/, 'and only there');
  assert.doesNotMatch(html, /chip-drop/, 'no chip at A after the run has ended');
});

test('still-board hints are memoised enough to answer in a few milliseconds', () => {
  for (const id of ['chips-s01', 'chips-s02']) {
    const p = still(id);
    let a = freshAttempt(p), n = 0;
    const t = process.cpuUsage();
    for (; !isSolved(p, a.board) && n < 200; n++) a = move(p, a, nextHint(p, a).action);
    const used = process.cpuUsage(t), ms = (used.user + used.system) / 1000;
    assert.ok(isSolved(p, a.board));
    assert.ok(ms / n < 10, `${id}: ${ms.toFixed(1)} ms for ${n} hints`);
  }
});
