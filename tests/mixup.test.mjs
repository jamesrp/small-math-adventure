import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {counts, targetRows, universe} from '../dist/families/mixup/mixup.js';
import {validateMixup} from '../scripts/validate-mixup.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const mixup = await read('../dist/families/mixup/mixup.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const swap = (a, b) => ({type: 'swap', a, b}), keep = {type: 'keep'}, claim = {type: 'claim'};
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: rows match an independent enumeration, hints solve, illegal moves fail', async () => {
  const report = await validateMixup();
  assert.equal(report.mixupPuzzles, 9);
  assert.deepEqual(report.noneAtHome, {1: 0, 2: 1, 3: 2, 4: 9, 5: 44, 6: 265, 7: 1854});
});

test('rules: away, some at home, exactly k at home; pins narrow every row', () => {
  assert.equal(counts({type: 'away', cups: 'ABC'}, 'BCA'), true);
  assert.equal(counts({type: 'away', cups: 'AB'}, 'BAC'), true, 'C may stay home');
  assert.equal(counts({type: 'some-home', cups: 'AB'}, 'ACB'), true);
  assert.equal(counts({type: 'some-home', cups: 'AB'}, 'CAB'), false);
  assert.equal(counts({type: 'home-count', count: 1}, 'ACDB'), true);
  assert.equal(counts({type: 'home-count', count: 1}, 'ABDC'), false);
  const q = byId('mixup-04').parameters;
  assert.equal(universe(q).length, 6);
  assert.ok(universe(q).every(row => row[0] === 'D'));
  assert.deepEqual(targetRows(q), ['DABC', 'DCAB', 'DCBA']);
});

test('no cup at home with three cups: two rows, an early That’s all, then a solve', () => {
  const p = byId('mixup-01');
  let a = freshAttempt(p);
  assert.equal(a.board.row, 'ABC');
  assert.equal(move(p, a, keep), null, 'ABC has every cup at home');
  a = play(p, a, [swap(0, 1), swap(1, 2)]);
  assert.equal(a.board.row, 'BCA');
  a = play(p, a, [keep]);
  assert.deepEqual(a.board.kept, ['BCA']);
  assert.equal(move(p, a, keep), null, 'kept once');
  a = play(p, a, [claim]);
  assert.equal(a.board.missed, true);
  assert.equal(move(p, a, claim), null, 'not twice in a row');
  a = play(p, a, [swap(0, 1), swap(1, 2)]);
  assert.equal(a.board.row, 'CAB');
  a = play(p, a, [keep]);
  assert.equal(a.board.missed, false, 'a new row allows That’s all again');
  a = play(p, a, [claim]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, swap(0, 1)), null, 'no moves after a solve');
});

test('a kept row loads back onto the cups, and Undo takes back a Keep', () => {
  const p = byId('mixup-05');
  let a = play(p, freshAttempt(p), [swap(0, 1), swap(2, 3), keep, swap(1, 2)]);
  assert.equal(a.board.row, 'BDAC');
  a = play(p, a, [{type: 'load', row: 'BADC'}]);
  assert.equal(a.board.row, 'BADC');
  assert.equal(move(p, a, {type: 'load', row: 'BADC'}), null, 'already on the board');
  assert.equal(move(p, a, {type: 'load', row: 'CDAB'}), null, 'only kept rows load');
  const kept = play(p, play(p, a, [swap(0, 2)]), [keep]);
  assert.equal(kept.board.kept.length, 2);
  assert.equal(undo(kept).board.kept.length, 1);
});

test('a pinned cup stays put, and its row is never asked for twice', () => {
  const p = byId('mixup-09'), a = freshAttempt(p);
  assert.equal(a.board.row, 'EBCDA');
  for (let j = 1; j < 5; j++) assert.equal(move(p, a, swap(0, j)), null);
  const b = play(p, a, [swap(1, 4), swap(2, 3)]);
  assert.equal(b.board.row, 'EADCB');
  assert.ok(play(p, b, [keep]).board.kept.includes('EADCB'));
});

test('hints walk to the nearest missing row, keep it, and say That’s all at the end', () => {
  const p = byId('mixup-05');
  let a = freshAttempt(p);
  const first = nextHint(p, a);
  assert.equal(first.type, 'move');
  assert.equal(first.action.type, 'swap');
  a = play(p, a, [swap(0, 1), swap(2, 3)]);
  assert.deepEqual(nextHint(p, a).action, keep);
  assert.equal(nextHint(p, a).text, 'Keep this row.');
  a = play(p, a, [keep]);
  assert.match(nextHint(p, a).text, /^Put [A-D] in home [A-D]\.$/);
  const done = solve(p);
  assert.ok(isSolved(p, done.board));
  assert.equal(done.board.kept.length, 9);
});

test('every puzzle renders its cups and goal; Keep and That’s all start greyed', () => {
  for (const p of mixup.puzzles) {
    const a = freshAttempt(p), html = view(p, a), n = p.parameters.cups || 4;
    assert.equal((html.match(/data-cup="/g) || []).length, n, `${p.id}: a cup per home`);
    if (p.band === 'playground') { assert.equal((html.match(/class="case-bin"/g) || []).length, 5, 'columns for 0 to 4 at home'); continue; }
    assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    assert.match(html, /data-mixup-move="[^"]*keep[^"]*"[^>]*disabled/, `${p.id}: the start is not a row to keep`);
    assert.match(html, /data-mixup-move="[^"]*claim[^"]*"[^>]*disabled/, `${p.id}: nothing kept yet`);
    assert.equal((html.match(/aria-disabled="true"/g) || []).length, (p.parameters.pinned || '').length, `${p.id}: pinned cups`);
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no count of the answers`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Mixed-up cups/);
});

test('the shelf: hoops with the overlap in the middle, columns, a catalog after a solve', () => {
  const p3 = byId('mixup-03'), a3 = solve(p3), html3 = view(p3, a3);
  assert.match(html3, /case-hoop-part both"[^>]*>.*?aria-label="A B C; A, B and C at home"/);
  assert.match(html3, /case-catalog/);
  assert.equal((html3.match(/case-kept yes/g) || []).length, 3);
  assert.equal((html3.match(/case-kept no/g) || []).length, 3);
  const p7 = byId('mixup-07'), html7 = view(p7, play(p7, freshAttempt(p7), [swap(1, 2), swap(2, 3), keep]));
  assert.match(html7, /data-bin="A"><h3 class="case-bin-label">.*?<\/h3><ol class="case-list"><li><button type="button" class="case-kept current fresh|data-bin="A"><h3 class="case-bin-label">.*?<\/h3><ol class="case-list"><li><button type="button" class="case-kept current/);
  assert.doesNotMatch(html7, /case-catalog/, 'no catalog before a solve');
  const p1 = byId('mixup-01'), early = play(p1, freshAttempt(p1), [swap(0, 1), swap(1, 2), keep, claim]);
  assert.match(view(p1, early), /There’s another\./);
});

test('the playground keeps any row in a column for how many cups are home, and is never solved', () => {
  const pg = byId('mixup-playground');
  let a = play(pg, freshAttempt(pg), [keep, swap(0, 1), keep, {type: 'cups', cups: 3}]);
  assert.deepEqual(a.board, {cups: 3, row: 'ABC', kept: []});
  a = play(pg, a, [keep, swap(0, 1), keep, swap(1, 2), keep, {type: 'shuffle'}]);
  assert.equal(a.board.kept.length, 3);
  const html = view(pg, a);
  assert.equal((html.match(/class="case-bin"/g) || []).length, 4);
  assert.match(html, /data-bin="3"><h3 class="case-bin-label">3 home<\/h3><ol class="case-list"><li><button[^>]*data-case="ABC"/);
  assert.ok(!isSolved(pg, a.board));
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('mixup-06'), a = solve(p);
  const half = play(byId('mixup-08'), freshAttempt(byId('mixup-08')), [swap(0, 1), keep]);
  const pg = byId('mixup-playground'), toy = play(pg, freshAttempt(pg), [{type: 'cups', cups: 5}, swap(0, 4), keep]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'mixup-08': half, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  assert.deepEqual(loaded.store.profiles[0].attempts[p.id].board, a.board);
  assert.deepEqual(loaded.store.profiles[0].attempts['mixup-08'].board, half.board);
  assert.deepEqual(loaded.store.profiles[0].attempts[pg.id].board, toy.board);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a row missing');
  const outsider = {...store, profiles: [profile({'mixup-08': {...half, board: {...half.board, kept: ['ABCD']}}})]};
  assert.throws(() => validateStore(outsider, puzzles), 'a kept row that does not count');
});

test('the satchel lists Mixed-up cups with its playground and nine puzzles', () => {
  const html = libraryView(profile({'mixup-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-mixup"/);
  assert.match(html, /data-id="mixup-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 9; n++) assert.ok(html.includes(`data-id="mixup-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Mixed-up cups, Easy, puzzle 2, completed/);
});
