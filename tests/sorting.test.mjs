import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {mechanicFor} from '../dist/expansion.js';
import {runMachine, failures, orders, binaries, viewOf} from '../dist/families/sorting/sorting.js';
import {validateSorting} from '../scripts/validate-sorting.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const sorting = await read('../dist/families/sorting/sorting.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const swap = (a, b) => ({type: 'swap', a, b}), run = {type: 'run'}, bar = (slot, lanes) => ({type: 'bar', slot, lanes});
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

test('the pack validates: facts match an independent simulator, hints solve, illegal moves fail', async () => {
  const report = await validateSorting();
  assert.equal(report.sortingPuzzles, 12);
});

test('a bar sends the smaller card up, and a run records which bars swapped', () => {
  const r = runMachine([[0, 1], [1, 2]], [3, 2, 1]);
  assert.deepEqual(r.frames, [[3, 2, 1], [2, 3, 1], [2, 1, 3]]);
  assert.deepEqual(r.lit, [true, true]);
  assert.equal(r.sorted, false);
  assert.deepEqual(runMachine([[0, 1], null, [1, 2], [0, 1]], [3, 2, 1]).finish, [1, 2, 3], 'an empty slot is skipped');
  assert.deepEqual(failures([[0, 1], [1, 2], [0, 1]], 3), []);
  assert.equal(orders(4).length, 24);
  assert.equal(binaries(4).length, 16);
});

test('breaking a machine: a start that comes out in order does not count, a wrong finish does', () => {
  const p = byId('sorting-01');
  let a = play(p, freshAttempt(p), [run]);
  assert.equal(isSolved(p, a.board), false, '3, 1, 2 comes out in order');
  assert.ok(a.board.ran);
  a = play(p, a, [swap(1, 2)]);
  assert.equal(a.board.ran, false, 'a new start hides the old run');
  assert.deepEqual(a.board.start, [3, 2, 1]);
  a = play(p, a, [run]);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(viewOf(p, a.board).run.finish, [2, 1, 3]);
  assert.deepEqual(a.board.tried, ['312', '321']);
});

test('finding every wrong start: That’s all says there is another until all are run', () => {
  const p = byId('sorting-02');
  let a = play(p, freshAttempt(p), [swap(0, 2), run]);
  assert.deepEqual(a.board.start, [3, 1, 2]);
  a = play(p, a, [{type: 'claim'}]);
  assert.ok(a.board.missed && !isSolved(p, a.board));
  assert.match(view(p, a), /There’s another/);
  assert.match(view(p, a), /data-sort-move="[^"]*claim[^"]*"[^>]*disabled/, 'not twice in a row');
  for (const start of [[1, 3, 2], [2, 3, 1], [3, 2, 1]]) {
    while (a.board.start.join('') !== start.join('')) {
      const i = a.board.start.findIndex((v, k) => v !== start[k]), j = a.board.start.indexOf(start[i]);
      a = play(p, a, [swap(i, j)]);
    }
    a = play(p, a, [run]);
  }
  assert.equal(a.board.missed, false, 'a run clears the note');
  a = play(p, a, [{type: 'claim'}]);
  assert.ok(isSolved(p, a.board));
});

test('find-every puzzles show what was tried, never a count or empty slots', () => {
  for (const id of ['sorting-02', 'sorting-11']) {
    const p = byId(id);
    let a = freshAttempt(p);
    a = play(p, a, [run]);
    const html = view(p, a);
    assert.match(html, /class="sort-shelf"/);
    assert.doesNotMatch(html, /\d\s*(of|\/)\s*\d|empty/i, `${id}: no k of n and no empty slots`);
  }
});

test('same lights: two starts that light the same bars solve it, and finish differently', () => {
  const p = byId('sorting-05');
  let a = play(p, freshAttempt(p), [swap(1, 2), run]);
  assert.deepEqual(a.board.start, [1, 3, 2]);
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, [swap(0, 2), run]);
  assert.deepEqual(a.board.start, [2, 3, 1]);
  assert.ok(isSolved(p, a.board));
  const v = viewOf(p, a.board);
  assert.deepEqual(v.pair, ['132', '231']);
  assert.notDeepEqual(v.tried[0].run.finish, v.tried[1].run.finish);
});

test('building: Test shows one wrong start, and every start only for a sorter', () => {
  const p = byId('sorting-04');
  let a = play(p, freshAttempt(p), [bar(0, [0, 1]), bar(1, [1, 2]), {type: 'test'}]);
  assert.equal(isSolved(p, a.board), false);
  assert.ok(a.board.ran, 'the wrong start is shown running');
  assert.equal(runMachine(a.board.bars, a.board.start).sorted, false);
  assert.doesNotMatch(view(p, a), /class="sort-grid/, 'a failed test lists no other starts');
  a = play(p, a, [bar(2, [0, 1])]);
  assert.equal(a.board.tested, false, 'a changed machine needs a new test');
  a = play(p, a, [{type: 'test'}]);
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/<li class="ok"/g) || []).length, 6, 'all six starts, each in order');
  assert.equal(move(p, a, bar(2, null)), null, 'no changes after a solve');
});

test('placing bars: given bars stay, a bar can be taken away, and neighbor-only puzzles refuse long bars', () => {
  const fix = byId('sorting-03');
  let a = freshAttempt(fix);
  assert.equal(move(fix, a, bar(0, null)), null);
  a = play(fix, a, [bar(2, [1, 2]), bar(2, null), bar(2, [0, 1]), {type: 'test'}]);
  assert.ok(isSolved(fix, a.board));
  const near = byId('sorting-07');
  assert.equal(move(near, freshAttempt(near), bar(0, [0, 2])), null);
  assert.ok(move(near, freshAttempt(near), bar(0, [2, 1])), 'either order of the two ends');
  assert.doesNotMatch(view(near, freshAttempt(near)), /aria-disabled="true"[^>]*data-sort-peg/, 'no peg is disabled before one is chosen');
});

test('past fixing: only a finish with two separate pairs out of order counts', () => {
  const p = byId('sorting-08');
  let a = play(p, freshAttempt(p), [swap(1, 3), swap(2, 3), run]);
  assert.deepEqual(a.board.start, [1, 4, 2, 3]);
  assert.deepEqual(viewOf(p, a.board).run.finish, [1, 2, 4, 3]);
  assert.equal(isSolved(p, a.board), false, 'a wrong finish that one bar would fix does not count');
  a = play(p, freshAttempt(p), [swap(0, 1), swap(1, 3), swap(2, 3), run]);
  assert.deepEqual(a.board.start, [2, 4, 1, 3]);
  assert.deepEqual(viewOf(p, a.board).run.finish, [2, 1, 4, 3]);
  assert.ok(isSolved(p, a.board));
});

test('short and tall cards flip; numbers swap', () => {
  const p = byId('sorting-09');
  let a = play(p, freshAttempt(p), [{type: 'flip', lane: 0}, {type: 'flip', lane: 2}, run]);
  assert.deepEqual(a.board.start, [1, 0, 0, 1]);
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, [{type: 'flip', lane: 2}, {type: 'flip', lane: 3}, run]);
  assert.deepEqual(a.board.start, [1, 0, 1, 0]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, freshAttempt(p), swap(0, 1)), null);
  assert.equal(move(byId('sorting-10'), freshAttempt(byId('sorting-10')), {type: 'flip', lane: 0}), null);
});

test('Undo takes back a move but keeps the starts tried; Restart clears them', () => {
  const p = byId('sorting-02'), m = mechanicFor(p);
  let a = play(p, freshAttempt(p), [run, swap(0, 1), run]);
  assert.deepEqual(a.board.tried, ['213', '123']);
  const takeBack = x => { const y = undo(x); return {...y, board: m.carry(p, x.board, y.board)}; };
  const back = takeBack(a);
  assert.equal(back.board.ran, false);
  assert.deepEqual(back.board.tried, ['213', '123']);
  assert.deepEqual(restart(p, back).board.tried, []);
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('sorting-11');
  let a = freshAttempt(p);
  for (let i = 0; !isSolved(p, a.board) && i < 100; i++) a = move(p, a, nextHint(p, a).action);
  const half = play(byId('sorting-12'), freshAttempt(byId('sorting-12')), [bar(0, [0, 1]), bar(1, [2, 3])]);
  const pg = byId('sorting-playground');
  const built = play(pg, freshAttempt(pg), [{type: 'lanes', lanes: 4}, bar(0, [0, 3]), {type: 'cards', cards: 'binary'}, run]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'sorting-12': half, [pg.id]: built})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  assert.deepEqual(loaded.store.profiles[0].attempts[p.id].board, a.board);
  assert.deepEqual(loaded.store.profiles[0].attempts['sorting-12'].board, half.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[pg.id].board, built.board);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, tried: ['0101']}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed without every wrong start');
});

test('the playground builds on two to five lanes, has no Hint, and never counts as solved', () => {
  const pg = byId('sorting-playground');
  let a = freshAttempt(pg);
  for (const lanes of [2, 3, 4, 5]) {
    a = move(pg, a, {type: 'lanes', lanes}) || a;
    const html = view(pg, a);
    assert.doesNotMatch(html, /data-action="hint"/);
    assert.doesNotMatch(html, /class="puzzle-goal"/);
    assert.equal((html.match(/data-sort-card=/g) || []).length, lanes);
    assert.equal(isSolved(pg, a.board), false);
  }
  a = play(pg, a, [{type: 'lanes', lanes: 2}, bar(0, [0, 1]), {type: 'test'}]);
  assert.ok(a.board.tested && !a.board.ran);
  assert.match(view(pg, a), /Sorts every start/);
  assert.equal(visiblePuzzleObjective(pg), '');
  assert.ok(puzzleObjective(pg));
});

test('the satchel lists Sorting machines with its playground and twelve puzzles', () => {
  const html = libraryView(profile({'sorting-03': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-sorting"/);
  assert.match(html, /data-id="sorting-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="sorting-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Sorting machines, Easy, puzzle 3, completed/);
});

test('every puzzle renders its lanes, cards and goal', () => {
  for (const p of sorting.puzzles) {
    const a = freshAttempt(p), html = view(p, a), q = p.parameters;
    assert.match(html, /class="sort-board/, p.id);
    if (p.band === 'playground') continue;
    assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    assert.equal((html.match(/data-sort-card=/g) || []).length, q.lanes, `${p.id}: a card per lane`);
    assert.equal((html.match(/class="sort-bar/g) || []).length, q.machine.length, `${p.id}: the given bars`);
    if (q.mode === 'build') assert.equal((html.match(/data-sort-peg=/g) || []).length, (q.slots - q.machine.length) * q.lanes, `${p.id}: a dot per lane in each open slot`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Sorting machines/);
});
