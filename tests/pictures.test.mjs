import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {puzzleObjective, visiblePuzzleObjective} from '../dist/puzzle-copy.js';
import {mechanicFor} from '../dist/expansion.js';
import {picture, keyOf, counts, switchesOf, applySwitch, countPictures, picturesWith, cellsOf} from '../dist/families/pictures/pictures.js';
import {validatePictures} from '../scripts/validate-pictures.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const pictures = await read('../dist/families/pictures/pictures.json');
// The app merges the packs at load time (dist/main.js).
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const toggle = cell => ({type: 'toggle', cell}), swap = (a, b) => ({type: 'switch', a, b});
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});

test('the pack validates: answers match an independent search, hints solve, illegal moves fail', async () => {
  const report = await validatePictures();
  assert.equal(report.picturePuzzles, 12);
});

test('counts, switches and the number of pictures', () => {
  const cells = cellsOf('110/001');
  assert.deepEqual(counts(2, 3, cells), {rows: [2, 1], cols: [1, 1, 1]});
  assert.deepEqual(switchesOf(2, 3, cells), [[0, 5], [1, 5]]);
  assert.equal(keyOf(3, applySwitch(2, 3, cells, 1, 5)), '101/010', 'A2 and B3 jump to A3 and B2');
  assert.equal(applySwitch(2, 3, cells, 0, 1), null, 'two counters in one row cannot switch');
  assert.deepEqual(picturesWith([2, 1], [1, 1, 1]).sort(), ['011/100', '101/010', '110/001']);
  assert.equal(countPictures([1, 1, 1], [1, 1, 1]), 6);
  assert.equal(countPictures([3, 0], [2, 1, 0]), 0, 'counts with no picture');
});

test('matching the counts solves a match puzzle with any picture that fits', () => {
  const p = byId('pictures-01');
  let a = play(p, freshAttempt(p), [toggle(0), toggle(1)]);
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, [toggle(5)]);
  assert.ok(isSolved(p, a.board));
  const other = play(p, freshAttempt(p), [toggle(1), toggle(2), toggle(3)]);
  assert.ok(isSolved(p, other.board), 'A2 A3 B1 fits too');
  const html = view(p, play(p, freshAttempt(p), [toggle(0), toggle(1), toggle(2)]));
  assert.match(html, /pic-count row over" role="img" aria-label="Row A: 3 of 2"/);
  assert.match(html, /pic-count col exact" role="img" aria-label="Column 1: 1 of 1"/);
});

test('a twin must differ from the starting picture', () => {
  const p = byId('pictures-02');
  let a = freshAttempt(p);
  assert.equal(isSolved(p, a.board), false, 'the starting picture does not count');
  a = play(p, a, [toggle(1), toggle(5)]);
  assert.equal(isSolved(p, a.board), false, 'counts broken');
  a = play(p, a, [toggle(2), toggle(4)]);
  assert.ok(isSolved(p, a.board));
  assert.equal(keyOf(3, a.board.cells), '101/010');
});

test('every picture: kept as found, That’s all only when complete, Undo keeps finds', () => {
  const p = byId('pictures-03'), m = mechanicFor(p);
  let a = play(p, freshAttempt(p), [toggle(0), toggle(3)]);
  assert.deepEqual(a.board.found, ['10/01']);
  a = play(p, a, [{type: 'done'}]);
  assert.equal(a.board.early, true);
  assert.equal(isSolved(p, a.board), false);
  assert.match(view(p, a), /There is another\./);
  assert.doesNotMatch(view(p, a), /aria-label="Found \d+ of/, 'no k-of-n counter');
  const takeBack = x => { const y = undo(x); return {...y, board: m.carry(p, x.board, y.board)}; };
  const back = takeBack(takeBack(a));
  assert.deepEqual(back.board.found, ['10/01'], 'Undo keeps a found picture');
  a = play(p, a, [{type: 'clear'}, toggle(1), toggle(2)]);
  assert.deepEqual(a.board.found, ['10/01', '01/10']);
  assert.equal(a.board.early, false);
  a = play(p, a, [{type: 'done'}]);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(restart(p, a).board.found, []);
});

test('a picture found twice is kept once and shown again', () => {
  const p = byId('pictures-05');
  let a = play(p, freshAttempt(p), [toggle(0), toggle(4), toggle(8)]);
  a = play(p, a, [toggle(8), toggle(8)]);
  assert.deepEqual(a.board.found, ['100/010/001']);
  assert.match(view(p, a), /<li class="fresh">/);
  a = play(p, a, [toggle(4), toggle(5), toggle(8), toggle(7)]);
  assert.deepEqual(a.board.found, ['100/010/001', '100/001/010']);
  a = play(p, a, [toggle(5), toggle(4), toggle(7), toggle(8)]);
  assert.match(view(p, a), /<li class="again">/);
});

test('one picture only: a single find and That’s all', () => {
  const p = byId('pictures-06');
  let a = freshAttempt(p);
  for (const i of cellsOf('010/111/110').flatMap((v, i) => v ? [i] : [])) a = move(p, a, toggle(i));
  assert.equal(a.board.found.length, 1);
  a = play(p, a, [{type: 'done'}]);
  assert.ok(isSolved(p, a.board));
});

test('switch puzzles: only switches, a budget, rings, and the goal', () => {
  const p = byId('pictures-07');
  let a = freshAttempt(p);
  assert.equal(move(p, a, toggle(0)), null, 'no toggles');
  assert.equal(move(p, a, swap(0, 1)), null, 'same row is not a switch');
  const html = view(p, a);
  assert.equal((html.match(/pic-cell[^"]* goal/g) || []).length, 4, 'four rings');
  assert.match(html, /aria-label="2 switches left"/);
  a = play(p, a, [swap(0, 6)]);
  assert.equal(keyOf(4, picture(p, a.board)), '0110/1001');
  a = play(p, a, [swap(1, 7)]);
  assert.ok(isSolved(p, a.board));
  // A wasted switch: the budget runs out and the hint says so.
  let w = play(p, freshAttempt(p), [swap(0, 6), swap(2, 4)]);
  assert.equal(isSolved(p, w.board), false);
  assert.equal(nextHint(p, w).type, 'deadend');
  assert.equal(move(p, w, swap(1, 7)), null, 'no switches left');
});

test('a picked counter shows its partners; picking is view state, not a move', () => {
  const p = byId('pictures-11'), m = mechanicFor(p);
  m.reset(p);
  const a = freshAttempt(p);
  m.ui(p, {pick: 1, key: keyOf(4, picture(p, a.board))});
  const html = view(p, a);
  assert.match(html, /class="pic-cell on r0 picked/);
  assert.ok((html.match(/ partner/g) || []).length >= 1);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;switch&quot;,&quot;a&quot;:1,&quot;b&quot;:6\}"/);
  assert.equal(a.moves, 0);
  m.ui(p, {pick: null});
  assert.doesNotMatch(view(p, a), /picked/);
  m.reset(p);
});

test('lonely pictures: exactly the counter count, no switch, and a shown switch when there is one', () => {
  const p = byId('pictures-08');
  let a = play(p, freshAttempt(p), [toggle(0), toggle(4), toggle(2), toggle(6)]);
  assert.equal(isSolved(p, a.board), false, 'A1 B2 can switch with A2 B1');
  assert.equal((view(p, a).match(/ twin/g) || []).length, 4, 'the four corners of a switch');
  assert.equal(move(p, a, toggle(8)), null, 'no fifth counter');
  a = play(p, a, [toggle(4), toggle(6), toggle(1), toggle(3)]);
  assert.ok(isSolved(p, a.board), 'A1 A2 A3 B1 is alone in its counts');
});

test('saves round-trip through storage, and forged saves are rejected', () => {
  const p = byId('pictures-05');
  let a = freshAttempt(p);
  for (let i = 0; !isSolved(p, a.board) && i < 100; i++) a = move(p, a, nextHint(p, a).action);
  const pg = byId('pictures-playground');
  const drawn = play(pg, freshAttempt(pg), [{type: 'size', size: 5}, toggle(0), toggle(6)]);
  const r = byId('pictures-11'), route = play(r, freshAttempt(r), [swap(1, 6)]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, [pg.id]: drawn, [r.id]: route})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  assert.deepEqual(loaded.store.profiles[0].attempts[p.id].board, a.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[pg.id].board, drawn.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[r.id].board, route.board);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  assert.throws(() => validateStore({...store, profiles: [profile({[p.id]: {...a, board: {...a.board, found: ['111/000/000']}}})]}, puzzles));
  assert.throws(() => validateStore({...store, profiles: [profile({[r.id]: {...route, board: {path: [[0, 1]]}}})]}, puzzles));
});

test('the playground draws, switches, counts its twins, and never counts as solved', () => {
  const pg = byId('pictures-playground'), m = mechanicFor(pg);
  m.reset(pg);
  let a = freshAttempt(pg);
  assert.equal(a.board.size, 4);
  a = play(pg, a, [toggle(0), toggle(5)]);
  let html = view(pg, a);
  assert.match(html, /aria-label="2 pictures have these counts"/);
  assert.doesNotMatch(html, /data-action="hint"/);
  assert.doesNotMatch(html, /class="puzzle-goal"/);
  m.ui(pg, {tool: 'switch'});
  m.ui(pg, {pick: 0, key: keyOf(4, a.board.cells)});
  html = view(pg, a);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;switch&quot;,&quot;a&quot;:0,&quot;b&quot;:5\}"/);
  a = play(pg, a, [swap(0, 5)]);
  assert.equal(keyOf(4, a.board.cells), '0100/1000/0000/0000');
  a = play(pg, a, [{type: 'size', size: 3}]);
  assert.match(view(pg, a), /aria-label="No other picture has these counts"/);
  assert.equal(isSolved(pg, a.board), false);
  assert.equal(visiblePuzzleObjective(pg), '');
  assert.ok(puzzleObjective(pg));
  m.reset(pg);
});

// Where the family sits in the satchel, and whether it starts open, is the
// seam's rule (tests/families.test.mjs).
test('the satchel lists Hidden pictures with its playground and twelve puzzles', () => {
  const html = libraryView(profile({'pictures-03': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-pictures"/);
  assert.match(html, /data-id="pictures-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="pictures-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Hidden pictures, Easy, puzzle 3, completed/);
});

test('every puzzle renders its board and objective, with no count of answers', () => {
  for (const p of pictures.puzzles) {
    const a = freshAttempt(p), html = view(p, a);
    assert.match(html, /class="pic-grid/, p.id);
    if (p.band !== 'playground') {
      assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
      assert.doesNotMatch(html, /Found \d+ of|slot/, `${p.id}: no slot or count per answer`);
    }
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Hidden pictures/);
});
