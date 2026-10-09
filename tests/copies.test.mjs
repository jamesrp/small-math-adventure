import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {bagAfter, bagKey, histories, mixes, redsOf, targetKeys} from '../dist/families/copies/copies.js';
import {counterBagHTML, drawRowHTML} from '../dist/cases.js';
import {validateCopies} from '../scripts/validate-copies.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const copies = await read('../dist/families/copies/copies.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const draw = id => ({type: 'draw', id}), keep = {type: 'keep'}, claim = {type: 'claim'}, again = {type: 'again'};
const draws = (...ids) => ids.map(draw);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: answers match a separate enumeration, hints solve, illegal moves fail', async () => {
  const report = await validateCopies();
  assert.equal(report.copiesPuzzles, 9);
  assert.deepEqual(report.theorems[3].copy, [6, 6, 6, 6]);
  assert.deepEqual(report.theorems[4].return, [1, 4, 6, 4, 1]);
});

test('a draw adds a copy of its colour, numbered next; other rules add nothing or the other colour', () => {
  assert.deepEqual(bagAfter('RB', 'copy', ['R1', 'R2', 'B1']), ['R1', 'B1', 'R2', 'R3', 'B2']);
  assert.deepEqual(bagAfter('RB', 'return', ['R1', 'B1']), ['R1', 'B1']);
  assert.deepEqual(bagAfter('RB', 'other', ['R1']), ['R1', 'B1', 'B2']);
  assert.equal(bagAfter('RB', 'copy', ['R2']), null, 'red 2 is not there yet');
  assert.equal(bagKey('RB', 'copy', ['B1', 'R1', 'B2']), 'RRBBB');
  assert.equal(histories('RB', 'copy', 3).length, 24);
  assert.deepEqual(mixes('RB', 2), ['RR', 'RB', 'BB']);
  assert.deepEqual(mixes('RBY', 2), ['RR', 'RB', 'RY', 'BB', 'BY', 'YY']);
  assert.equal(redsOf(['R1', 'B1', 'R2']), 2);
  assert.deepEqual(targetKeys(byId('copies-02').parameters).sort(), ['RBBBB', 'RRBBB', 'RRRBB', 'RRRRB']);
});

test('counter bags: sorted by colour, focus by id when the bag grows; the draw row has a place per draw', () => {
  const html = counterBagHTML(['R1', 'B1', 'R2'], {button: true, sorted: true, byId: true});
  assert.deepEqual([...html.matchAll(/data-counter="(\w+)"/g)].map(m => m[1]), ['R1', 'R2', 'B1']);
  assert.match(html, /data-focus="counter-R2"/);
  assert.match(drawRowHTML(['R1'], 3), /^<div class="case-draw" role="group" aria-label="Drawn"><i class="case-counter cR">1<\/i>(<span class="case-arrow" aria-hidden="true">→<\/span><i class="case-counter empty" aria-hidden="true"><\/i>){2}<\/div>$/);
});

test('make a bag: three draws, Again to start over', () => {
  const p = byId('copies-01');
  let a = play(p, freshAttempt(p), draws('R1', 'R2', 'B1'));
  assert.ok(!isSolved(p, a.board), 'three red and two blue');
  assert.equal(move(p, a, draw('B1')), null, 'three draws');
  assert.equal(nextHint(p, a).text, 'Start again.');
  a = play(p, a, [again, ...draws('B1', 'R1', 'B2')]);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /The bag: 2 red, 3 blue\./);
  assert.match(view(p, freshAttempt(p)), /class="copy-goal" role="img" aria-label="The bag to make: 2 red, 3 blue"/, 'the goal as discs');
  assert.match(view(byId('copies-03'), freshAttempt(byId('copies-03'))), /aria-label="The bag at the end: 3 red, 3 blue"/);
  assert.doesNotMatch(view(byId('copies-02'), freshAttempt(byId('copies-02'))), /copy-goal/, 'no goal bag when every bag is wanted');
});

test('every bag: Keep files the bag and empties the draws; That’s all early says there’s another', () => {
  const p = byId('copies-02');
  let a = play(p, freshAttempt(p), [...draws('R1', 'R1', 'R1'), keep]);
  assert.deepEqual(a.board, {draws: [], kept: ['RRRRB'], claimed: false, missed: false});
  a = play(p, a, draws('R1', 'R2', 'R3'));
  assert.equal(move(p, a, keep), null, 'the same bag again');
  assert.match(view(p, a), /class="case-kept current"/);
  a = play(p, a, [again, claim]);
  assert.match(view(p, a), /There’s another\./);
  assert.ok(!undo(a).board.missed);
  const html = view(p, solve(p));
  assert.equal((html.match(/class="case-kept/g) || []).length, 4);
  assert.match(html, /aria-label="1 red, 4 blue"/);
});

test('every history: columns by the mix of colours, two each; putting back gives 1, 2, 1', () => {
  const p = byId('copies-04'), html = view(p, solve(p));
  for (const mix of ['RR', 'RB', 'BB']) assert.equal((html.match(new RegExp(`data-bin="${mix}"[^]*?</ol>`))[0].match(/case-kept/g) || []).length, 2, mix);
  assert.match(html, /data-key="R1R2" aria-label="red 1, then red 2"><span class="case-mini copy-history"><i class="case-counter cR">1<\/i><i class="case-counter cR">2<\/i><\/span>/, 'numbered as drawn');
  const back = byId('copies-05'), b = view(back, solve(back));
  assert.equal((b.match(/data-bin="RB"[^]*?<\/ol>/)[0].match(/case-kept/g) || []).length, 2);
  assert.equal((b.match(/data-bin="RR"[^]*?<\/ol>/)[0].match(/case-kept/g) || []).length, 1);
  assert.equal(move(back, play(back, freshAttempt(back), [draw('R1')]), draw('R2')), null, 'no copies when just putting back');
});

test('no reds in three: six all-blue histories on one shelf', () => {
  const p = byId('copies-06'), done = solve(p), html = view(p, done);
  assert.deepEqual([...done.board.kept].sort(), ['B1B1B1', 'B1B1B2', 'B1B1B3', 'B1B2B1', 'B1B2B2', 'B1B2B3']);
  assert.doesNotMatch(html, /case-catalog|data-bin=/, 'no columns and no catalog');
});

test('two reds in three: columns by colour order, and the catalog of 24 after a solve', () => {
  const p = byId('copies-07');
  let a = play(p, freshAttempt(p), draws('R1', 'B1', 'B1'));
  assert.equal(move(p, a, keep), null, 'one red only');
  const done = solve(p), html = view(p, done);
  assert.deepEqual([...html.matchAll(/class="case-bin" data-bin="(\w+)"/g)].map(m => m[1]), ['RRB', 'RBR', 'BRR']);
  assert.equal((html.match(/case-catalog/g) || []).length, 1);
  assert.equal((html.match(/case-kept yes/g) || []).length, 6);
  assert.equal((html.match(/case-kept no/g) || []).length, 18);
  const catalog = html.slice(html.indexOf('case-catalog'));
  assert.deepEqual([...catalog.matchAll(/class="copy-reds">([^<]+)</g)].map(m => m[1]), ['3 red', '2 red', '1 red', 'no red'], 'catalog columns named by their reds, unlike the order bins');
});

test('three colours: yellow counters, six columns of two', () => {
  const p = byId('copies-09'), a = freshAttempt(p);
  assert.match(view(p, a), /data-counter="Y1"[^>]*aria-label="yellow 1"/);
  const done = solve(p);
  assert.equal(done.board.kept.length, 12);
  assert.equal((view(p, done).match(/class="case-bin"/g) || []).length, 6);
});

test('every puzzle renders a bag, a draw row and no count of the answers', () => {
  for (const p of copies.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /class="case-bag copy-bag"/, `${p.id}: a bag`);
    assert.match(html, /class="case-draw"/, `${p.id}: the draws`);
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no count of the answers`);
    if (p.band !== 'playground') {
      // Part way and solved: still no count of the answers.
      let mid = freshAttempt(p);
      for (let i = 0; i < 2 * (p.parameters.draws || 3) + 2 && !isSolved(p, mid.board); i++) mid = move(p, mid, nextHint(p, mid).action);
      for (const [when, a] of [['part way', mid], ['solved', solve(p)]]) assert.doesNotMatch(view(p, a), /\d+ of \d+|\d+ (left|more) to find/, `${p.id} ${when}: no count of the answers`);
    }
    if (p.band !== 'playground') assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    if (p.parameters.mode !== 'make' && p.band !== 'playground') assert.match(html, /data-copy-move="[^"]*keep[^"]*"[^>]*disabled/, `${p.id}: nothing to keep yet`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Copying bags/);
});

test('the playground: runs of four filed by reds, three rules, never solved', () => {
  const pg = byId('copies-playground');
  let a = play(pg, freshAttempt(pg), draws('B1', 'B2', 'B1', 'R1'));
  assert.deepEqual(a.board.runs, [1]);
  a = move(pg, a, {type: 'runs', n: 10}, () => 0);
  assert.deepEqual(a.board.runs, [1, ...Array(10).fill(4)], 'always the first counter: all red');
  const html = view(pg, a);
  assert.equal((html.match(/class="copy-run-column"/g) || []).length, 5);
  assert.equal((html.match(/class="copy-dot"/g) || []).length, 11);
  assert.match(html, /aria-label="4 red drawn: 10 runs"/);
  a = play(pg, a, [{type: 'rule', rule: 'other'}]);
  assert.deepEqual(a.board, {rule: 'other', draws: [], runs: []});
  assert.match(view(pg, a), /aria-pressed="true"[^>]*>Add the other colour/);
  assert.match(view(pg, a), /role="status">Nothing drawn\. 0 runs in the columns\./);
  const run = play(pg, a, draws('R1', 'R1', 'B2', 'R1'));
  assert.deepEqual(run.board.draws, ['R1', 'R1', 'B2', 'R1'], 'the finished run stays in the draw row');
  const bagPart = view(pg, run).split('class="case-draw"')[0].split('copy-bag')[1];
  assert.deepEqual([...bagPart.matchAll(/data-counter="(\w+)"/g)].map(m => m[1]), ['R1', 'B1'], 'after a finished run the bag is back to one of each');
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('copies-04'), a = solve(p);
  const half = play(byId('copies-07'), freshAttempt(byId('copies-07')), [...draws('R1', 'R2', 'B1'), keep, draw('B1')]);
  const make = play(byId('copies-01'), freshAttempt(byId('copies-01')), draws('B1', 'B2'));
  const pg = byId('copies-playground'), toy = move(pg, freshAttempt(pg), {type: 'runs', n: 10}, () => 0.3);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'copies-07': half, 'copies-01': make, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[p.id, a], ['copies-07', half], ['copies-01', make], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a history missing');
  const impossible = {...store, profiles: [profile({'copies-01': {...make, board: {draws: ['B1', 'B3']}}})]};
  assert.throws(() => validateStore(impossible, puzzles), 'blue 3 before it joined');
});

test('the satchel lists Copying bags with its playground and nine puzzles', () => {
  const html = libraryView(profile({'copies-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-copies"/);
  assert.match(html, /data-id="copies-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 9; n++) assert.ok(html.includes(`data-id="copies-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Copying bags, Easy, puzzle 2, completed/);
});
