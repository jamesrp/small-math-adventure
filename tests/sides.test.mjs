import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {split, meets, other, ALL_CUPS, cardSplit, cardsMeet} from '../dist/families/sides/sides.js';
import {validateSides} from '../scripts/validate-sides.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const sides = await read('../dist/families/sides/sides.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const draw = ticket => ({type: 'draw', ticket}), toggle = ticket => ({type: 'toggle', ticket});
const keep = {type: 'keep'}, claim = {type: 'claim'}, tryIt = {type: 'try'}, look = {type: 'look'}, cant = {type: 'cant'};
const sort = bin => ({type: 'keep', bin});
const count = (card, by) => ({type: 'count', card, by});
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };
// The board without the cards and the cup, which show only the sides in it.
const rest = html => html.replace(/<div class="side-cards"[^]*?<\/div><\/div><\/div>/, '').replace(/<div class="side-cup"[^]*?<\/span><\/div>/, '');

test('the pack validates: answers match a separate enumeration, hints solve, illegal moves fail', async () => {
  const report = await validateSides();
  assert.equal(report.sidesPuzzles, 10);
  assert.equal(report.ties, 16);
  assert.deepEqual(report.answers, {'sides-01': 3, 'sides-02': 3, 'sides-03': 2, 'sides-04': 16, 'sides-05': 8, 'sides-06': 24, 'sides-07': 16, 'sides-08': 0, 'sides-09': 4, 'sides-10': 4});
});

test('red shows on three sides, two hiding red; cups and whole cards', () => {
  assert.deepEqual(split([1, 2, 3, 4, 5, 6]), {up: [1, 2, 3], R: [1, 2], B: [3]});
  assert.deepEqual(split([1, 2, 3, 4, 5, 6], 'B'), {up: [4, 5, 6], R: [4], B: [5, 6]});
  assert.deepEqual([other(1), other(3), other(6)], [2, 4, 5]);
  assert.ok(meets('tie', [1, 3]) && meets('tie', [2, 3, 6]) && !meets('tie', [1, 2, 3]));
  assert.ok(!meets('tie', [4, 5]), 'red must be able to show');
  assert.ok(meets('blue', [3, 5]) && meets('red', [1, 6]) && !meets('red', [1, 3]));
  assert.equal(ALL_CUPS.filter(c => meets('tie', c)).length, 16);
  assert.deepEqual(cardSplit([1, 1, 1]), {R: 2, B: 1});
  assert.ok(cardsMeet('tie', [1, 2, 0]) && cardsMeet('three', [3, 2, 3]) && !cardsMeet('tie', [0, 0, 1]));
});

test('a draw: the side shows and its other side is covered; the child turns the card over and sorts it', () => {
  const p = byId('sides-01');
  let a = play(p, freshAttempt(p), [draw(3)]);
  let html = view(p, a);
  assert.match(html, /<button type="button" class="side-face fR up"[^>]*aria-pressed="true" aria-label="side 3, red"[^>]*>3<\/button>/);
  assert.match(html, /class="side-face fB under"[^>]*data-side-move="[^"]*look[^"]*"[^>]*aria-label="side 4, underneath, covered: turn the card over">\?<\/button>/, 'the other side is covered');
  assert.match(html, /role="status">Side 3: red shows\. Underneath is covered\./);
  assert.match(html, /aria-label="Keep it: red underneath" disabled/, 'no sorting before the card is turned over');
  a = play(p, a, [look]);
  html = view(p, a);
  assert.match(html, /class="side-face fB looked"[^>]*>4<\/button>/, 'turned over');
  assert.match(html, /Underneath: blue\./);
  assert.doesNotMatch(html, /aria-label="Keep it: (red|blue) underneath" disabled/, 'both piles open: the child chooses');
  assert.equal(move(p, a, sort('R')), null, 'the wrong pile is refused');
  a = play(p, a, [sort('B')]);
  assert.deepEqual(a.board, {shown: null, looked: false, kept: ['3'], claimed: false, missed: false});
  html = view(p, a);
  assert.match(html, /data-bin="B"[^]*?data-key="3"/, 'with blue underneath');
  a = play(p, a, [draw(4), look]);
  assert.equal(move(p, a, sort('R')), null, 'blue shows: not this puzzle');
  a = play(p, a, [draw(3), look]);
  assert.equal(move(p, a, sort('B')), null, 'kept once');
  assert.match(view(p, a), /class="case-kept current" data-key="3"/);
  a = play(p, a, [claim]);
  assert.match(view(p, a), /There’s another\./);
  assert.ok(!undo(a).board.missed);
  assert.equal(nextHint(p, play(p, freshAttempt(p), [draw(1)])).text, 'Tap the ? to turn the card over.');
  assert.equal(nextHint(p, play(p, freshAttempt(p), [draw(1), look])).text, 'Put it with red underneath.');
  const done = view(p, solve(p));
  assert.equal((done.match(/data-bin="R"[^]*?<\/ol>/)[0].match(/case-kept/g) || []).length, 2, 'two red sides hide red');
  assert.equal((done.match(/data-bin="B"[^]*?<\/ol>/)[0].match(/case-kept/g) || []).length, 1, 'one hides blue');
});

test('only 1 and 3: the other sides can’t be drawn, and the two red sides tie', () => {
  const p = byId('sides-03'), html = view(p, freshAttempt(p));
  assert.match(html, /aria-label="side 2, red, not in the cup" disabled/);
  assert.match(html, /class="side-cup" role="img" aria-label="In the cup: sides 1, 3"/, 'the cup shows what can be drawn');
  assert.match(view(p, play(p, freshAttempt(p), [draw(1)])), /data-side-move="[^"]*look[^"]*" data-focus="side-2"[^>]*>\?<\/button>/, 'a covered side can be turned over even when it is not in the cup');
  assert.equal(move(p, freshAttempt(p), draw(2)), null);
  const done = solve(p);
  assert.deepEqual([...done.board.kept].sort(), ['1', '3']);
});

test('a design: sides go in and out of the cup; Try it shows the red sides by the colour underneath', () => {
  const p = byId('sides-04');
  let a = freshAttempt(p);
  assert.match(view(p, a), /aria-pressed="true" aria-label="side 1, red, in the cup"/);
  assert.doesNotMatch(view(p, a), /case-bins/, 'nothing sorted before Try it');
  a = play(p, a, [tryIt]);
  assert.ok(!isSolved(p, a.board));
  assert.match(view(p, a), /Not a tie\./);
  assert.equal(move(p, a, tryIt), null);
  a = play(p, a, [toggle(1)]);
  assert.equal(a.board.tried, false);
  assert.match(view(p, a), /class="side-face fR out"[^>]*aria-pressed="false" aria-label="side 1, red, not in the cup"/);
  assert.doesNotMatch(view(p, a), /Not a tie/, 'a change clears the verdict');
  a = play(p, a, [tryIt]);
  assert.ok(isSolved(p, a.board));
  const blue = byId('sides-05');
  assert.match(view(blue, play(blue, freshAttempt(blue), [tryIt])), /Red can hide red\./);
  const red = byId('sides-06');
  assert.match(view(red, play(red, freshAttempt(red), [tryIt])), /Red can hide blue\./);
  assert.match(view(red, play(red, freshAttempt(red), [toggle(1), toggle(2), toggle(3), tryIt])), /Red can’t show\./);
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Take side 2 out of the cup.');
  assert.match(view(p, a), /aria-label="In the cup: sides 2, 3, 4, 5, 6"/);
});

test('no live tie meter: before Try it or Keep, every cup draws the same apart from its sides', () => {
  for (const id of ['sides-04', 'sides-05', 'sides-06', 'sides-07']) {
    const p = byId(id), base = rest(view(p, freshAttempt(p)));
    for (const cup of ALL_CUPS.filter(c => c.length)) assert.equal(rest(view(p, {...freshAttempt(p), board: {...freshAttempt(p).board, cup}})), base, `${id} ${cup}`);
  }
});

test('every tie: Keep checks the cup and shows a refused cup’s red sides; That’s all; the catalog of 63', () => {
  const p = byId('sides-07');
  let a = play(p, freshAttempt(p), [keep]);
  assert.equal(a.board.wrong, true);
  assert.match(view(p, a), /Not a tie\./);
  assert.match(view(p, a), /aria-label="Red sides in the cup, by the colour underneath"/, 'the refusal shows why');
  assert.match(view(p, a), /data-side-move="[^"]*keep[^"]*"[^>]*disabled/, 'Keep greys until the cup changes');
  a = play(p, a, [toggle(2), keep]);
  assert.deepEqual(a.board.kept, ['13456']);
  assert.match(view(p, a), /aria-label="Cups kept, by their red sides"/);
  assert.equal(move(p, a, keep), null, 'kept once');
  a = play(p, a, [claim, toggle(5)]);
  assert.ok(a.board.missed, 'a new cup is not something new kept');
  assert.match(view(p, a), /data-side-move="[^"]*claim[^"]*"[^>]*disabled/);
  assert.equal(move(p, play(p, freshAttempt(p), [toggle(1), toggle(2), toggle(3), toggle(4), toggle(5)]), toggle(6)), null, 'the cup is never empty');
  const done = solve(p), html = view(p, done);
  assert.equal(done.board.kept.length, 16);
  assert.equal((html.match(/case-catalog/g) || []).length, 1);
  assert.equal((html.match(/case-kept yes/g) || []).length, 16);
  assert.equal((html.match(/case-kept no/g) || []).length, 47);
});

test('whole cards: Can’t is right with one of each at most; copies tie with one red and two mixed', () => {
  const p = byId('sides-08');
  let a = play(p, freshAttempt(p), [tryIt]);
  assert.match(view(p, a), /Not a tie\./);
  assert.match(view(p, a), /aria-label="Red sides: 2 with red underneath, 1 with blue underneath"/);
  assert.equal(move(p, a, count(1, 1)), null, 'one of each card at most');
  a = play(p, a, [cant]);
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /aria-label="Every table of whole cards"/);
  assert.equal((html.match(/class="case-kept /g) || []).length, 7, 'the seven tables');
  assert.doesNotMatch(html, /case-kept yes/, 'none ties');
  const copies = byId('sides-09');
  let c = play(copies, freshAttempt(copies), [cant]);
  assert.ok(!isSolved(copies, c.board));
  assert.match(view(copies, c), /Keep looking\./);
  assert.equal(move(copies, c, cant), null, 'Can’t once until the table changes');
  c = play(copies, c, [count(0, -1), count(1, 1), tryIt]);
  assert.ok(isSolved(copies, c.board));
  assert.deepEqual(c.board.counts, [1, 2, 1]);
  assert.equal(nextHint(byId('sides-10'), freshAttempt(byId('sides-10'))).text, 'Add a red card.');
  assert.ok(isSolved(byId('sides-10'), solve(byId('sides-10')).board));
});

test('every puzzle renders its cards and no count of the answers', () => {
  for (const p of sides.puzzles) {
    const html = view(p, freshAttempt(p)), q = p.parameters;
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no count of the answers`);
    if (p.band !== 'playground') {
      let mid = freshAttempt(p);
      for (let i = 0; i < 4 && !isSolved(p, mid.board); i++) mid = move(p, mid, nextHint(p, mid).action);
      for (const [when, a] of [['part way', mid], ['solved', solve(p)]]) assert.doesNotMatch(view(p, a), /\d+ of \d+|\d+ (left|more) to find/, `${p.id} ${when}: no count of the answers`);
    }
    if (p.band !== 'playground') assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    if (q.mode === 'cards') assert.match(html, /class="side-stacks"/);
    else assert.equal((html.match(/<button type="button" class="side-face/g) || []).length, 6, `${p.id}: six sides`);
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Hidden sides/);
});

test('the playground: sides in and out of the cup, random draws in three piles; never solved', () => {
  const pg = byId('sides-playground');
  let a = freshAttempt(pg);
  a = move(pg, a, {type: 'random', n: 10}, () => 0.4);
  assert.deepEqual(a.board.draws, Array(10).fill(3));
  const html = view(pg, a);
  assert.match(html, /data-bin="RB"[^]*?(case-kept[^]*?){10}<\/ol>/);
  assert.match(html, /role="status">Side 3: red shows\. Red with red underneath 0, red with blue underneath 10, blue 0\./);
  assert.doesNotMatch(html, /class="side-face[^"]* under/, 'nothing is covered: a tap on a side changes the cup');
  assert.match(html, /class="side-face fR up"[^>]*>3</);
  a = play(pg, a, [toggle(3)]);
  assert.deepEqual(a.board, {cup: [1, 2, 4, 5, 6], draws: []});
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('sides-07'), a = solve(p);
  const half = play(byId('sides-01'), freshAttempt(byId('sides-01')), [draw(1), look, sort('R'), draw(2), look]);
  const design = play(byId('sides-04'), freshAttempt(byId('sides-04')), [toggle(5), tryIt]);
  const cards = play(byId('sides-09'), freshAttempt(byId('sides-09')), [count(0, 1), cant]);
  const pg = byId('sides-playground'), toy = move(pg, freshAttempt(pg), {type: 'random', n: 10}, () => 0.7);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'sides-01': half, 'sides-04': design, 'sides-09': cards, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[p.id, a], ['sides-01', half], ['sides-04', design], ['sides-09', cards], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a cup missing');
  const solvedWrong = {...store, profiles: [profile({'sides-04': {...design, board: {cup: [1, 2, 3], tried: true}, completed: true}})]};
  assert.equal(isSolved(byId('sides-04'), solvedWrong.profiles[0].attempts['sides-04'].board), false, 'a tried cup that doesn’t tie is not a solve');
});

test('the satchel lists Hidden sides with its playground and ten puzzles', () => {
  const html = libraryView(profile({'sides-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-sides"/);
  assert.match(html, /data-id="sides-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 10; n++) assert.ok(html.includes(`data-id="sides-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Hidden sides, Easy, puzzle 2, completed/);
});
