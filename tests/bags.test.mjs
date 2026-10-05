import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {pairs, classOf, tally, isFair, fewestSkips, mostShapes, RULES} from '../dist/families/bags/bags.js';
import {counterIds, sayCounter, counterHTML} from '../dist/cases.js';
import {validateBags} from '../scripts/validate-bags.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const bags = await read('../dist/families/bags/bags.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const draw = id => ({type: 'draw', id}), keep = {type: 'keep'}, claim = {type: 'claim'}, again = {type: 'again'};
const set = (cls, shape) => ({type: 'set', cls, shape});
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: answers match a separate enumeration, hints solve, illegal moves fail', async () => {
  const report = await validateBags();
  assert.equal(report.bagsPuzzles, 8);
  assert.deepEqual(report.answers, {'bags-01': 9, 'bags-02': 6, 'bags-03': 2, 'bags-04': 8, 'bags-05': 6, 'bags-06': 2, 'bags-07': 2, 'bags-08': 2});
  assert.ok(report.theorems.beatsVonNeumann.includes('2R1B') && report.theorems.beatsVonNeumann.includes('4R2B'));
});

test('counters: numbered by colour, spoken by name, buttons or pictures', () => {
  assert.deepEqual(counterIds('RRBRB'), ['R1', 'R2', 'B1', 'R3', 'B2']);
  assert.equal(sayCounter('B2'), 'blue 2');
  assert.match(counterHTML('R1', {button: true, at: 0}), /^<button type="button" class="case-counter cR" data-counter="R1" data-at="0" data-focus="counter-0" aria-label="red 1">1<\/button>$/);
  assert.match(counterHTML('B1', {button: true, still: true}), /disabled/);
  assert.match(counterHTML('B1'), /^<i class="case-counter cB" role="img" aria-label="blue 1">1<\/i>$/);
  assert.match(counterHTML('B2', {button: true, at: 3, number: 4, name: 'fourth counter, blue'}), /aria-label="fourth counter, blue">4<\/button>$/, 'a counter numbered by place');
});

test('marked pairs are equally likely; colour pairs come r², rb, br and b² ways', () => {
  assert.deepEqual(pairs('RRB'), ['R1R1', 'R1R2', 'R1B1', 'R2R1', 'R2R2', 'R2B1', 'B1R1', 'B1R2', 'B1B1']);
  assert.equal(pairs('RRRB', 'RRRB', true).length, 12, 'without putting back, no counter twice');
  assert.equal(classOf('B1R2'), 'BR');
  assert.deepEqual(tally(pairs('RRRB'), 'SCCX'), {S: 9, C: 6, X: 1});
  assert.ok(isFair(tally(pairs('RRRB'), 'XSCX')));
  assert.ok(!isFair(tally(pairs('RRRR'), 'XSCX')), 'one colour: nothing ever comes');
  assert.ok(!isFair(tally(pairs('RRRB', 'RBBB'), 'XSCX')), 'two bags break the tie');
  assert.equal(fewestSkips(pairs('RRB')), 1);
  assert.equal(fewestSkips(pairs('RRRB')), 10);
  assert.equal(mostShapes(4, 'XSCX'), 8);
  assert.equal(RULES.length, 81);
});

test('every pair: draw twice, Keep files the pair under its first counter, That’s all early says there’s another', () => {
  const p = byId('bags-01');
  let a = play(p, freshAttempt(p), [draw('R2'), draw('R2')]);
  assert.equal(move(p, a, draw('B1')), null, 'two draws');
  a = play(p, a, [keep]);
  assert.deepEqual(a.board, {draw: [], kept: ['R2R2'], claimed: false, missed: false}, 'Keep empties the draw');
  a = play(p, a, [draw('R2'), draw('R2')]);
  assert.equal(move(p, a, keep), null, 'kept once');
  assert.match(view(p, a), /class="case-kept current" data-key="R2R2" aria-label="red 2, then red 2, on the board"/);
  a = play(p, a, [again, claim]);
  assert.equal(a.board.missed, true);
  assert.match(view(p, a), /There’s another\./);
  assert.ok(!undo(a).board.missed, 'Undo takes it back');
  assert.equal(move(p, a, {type: 'load', key: 'R2R2'}), null, 'kept pairs are pictures, not buttons');
  const done = solve(p), html = view(p, done);
  assert.equal(done.board.kept.length, 9);
  assert.equal((html.match(/class="case-bin"/g) || []).length, 3, 'a column per first counter');
  assert.equal((html.match(/class="case-kept/g) || []).length, 9);
  assert.match(html, /aria-label="red 1, then blue 1"/);
});

test('a rule moves whole colour pairs; one that works solves at once', () => {
  const p = byId('bags-03');
  let a = freshAttempt(p);
  assert.equal(a.board.rule, 'SSCC', 'it starts from “the first counter’s colour decides”');
  assert.match(view(p, a), /12 squares, 4 circles, 0 skips\./);
  a = play(p, a, [set('RB', 'C')]);
  assert.ok(!isSolved(p, a.board), '9 squares, 7 circles');
  const html = view(p, a);
  assert.equal((html.match(/case-kept/g) || []).length, 16, 'every pair is in a pile');
  assert.match(html, /<div class="bag-rule-row" role="group" aria-label="red, then red">/);
  assert.match(html, /aria-pressed="true" aria-label="square"/);
  assert.match(html, /9 squares, 7 circles, 0 skips\./);
  assert.equal(move(p, a, set('RR', 'S')), null, 'already a square');
  assert.equal(move(p, a, claim), null, 'no Done in a fair-rule puzzle');
  a = play(p, a, [set('RR', 'X'), set('BR', 'S'), set('BB', 'X')]);
  assert.ok(isSolved(p, a.board), 'blue-red against red-blue');
  assert.equal(move(p, a, set('RR', 'S')), null, 'no moves after a solve');
  assert.match(view(p, a), /class="bag-choice on" aria-pressed="true" aria-label="skip"[^>]*disabled/);
  assert.equal(freshAttempt(byId('bags-02')).board.rule, 'XXXX');
});

test('fewest skips: von Neumann’s rule is fair, but Done says you can skip fewer', () => {
  const p = byId('bags-06');
  let a = play(p, freshAttempt(p), [set('RR', 'X'), set('BB', 'X'), claim]);
  assert.equal(a.board.missed, true);
  assert.match(view(p, a), /You can skip fewer\./);
  assert.equal(move(p, a, claim), null);
  a = play(p, a, [set('RR', 'S'), set('RB', 'C')]);
  assert.equal(a.board.missed, false);
  assert.ok(!isSolved(p, a.board), 'a fair rule waits for Done');
  a = play(p, a, [claim]);
  assert.ok(isSolved(p, a.board));
  assert.equal(a.board.rule, 'SCCX');
});

test('busiest bag: flip counters; Done on a quieter bag says the skip pile can be smaller', () => {
  const p = byId('bags-04');
  let a = play(p, freshAttempt(p), [claim]);
  assert.match(view(p, a), /The skip pile can be smaller\./);
  a = play(p, a, [{type: 'flip', at: 0}]);
  assert.equal(a.board.colours, 'BRRB');
  const html = view(p, a);
  assert.match(html, /aria-label="first counter, blue">1<\/button>/, 'counters numbered and named by place');
  assert.match(html, /data-key="B1B2" aria-label="blue 1, then blue 4"><span class="case-mini bag-pair"><i class="case-counter cB">1<\/i><i class="case-counter cB">4<\/i>/, 'pairs too');
  assert.match(html, /4 squares, 4 circles, 8 skips\./);
  a = play(p, a, [claim]);
  assert.ok(isSolved(p, a.board));
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Make the first counter blue.');
});

test('two bags and no putting back draw from the right counters', () => {
  const two = byId('bags-07'), html = view(two, freshAttempt(two));
  assert.match(html, /aria-label="1st bag"/); assert.match(html, /aria-label="2nd bag"/);
  assert.match(two.rules[1], /from the 1st bag and the second from the 2nd/);
  assert.equal(freshAttempt(two).board.rule, 'SSCC');
  assert.equal((html.match(/case-kept/g) || []).length, 16);
  const out = byId('bags-05');
  assert.equal((view(out, freshAttempt(out)).match(/case-kept/g) || []).length, 12);
  assert.match(out.rules[1], /The first stays out/);
  assert.ok(isSolved(out, play(out, freshAttempt(out), [set('RR', 'S'), set('RB', 'C'), set('BR', 'C')]).board), 'blue-blue never happens, so its skip skips nothing');
});

test('every puzzle renders its bag, rule and piles with no count of the answers', () => {
  for (const p of bags.puzzles) {
    const html = view(p, freshAttempt(p)), q = p.parameters;
    assert.match(html, /class="case-bag"/, `${p.id}: a bag`);
    assert.doesNotMatch(html, /\d+ of \d+/, `${p.id}: no count of the answers`);
    if (p.band !== 'playground') assert.ok(html.includes(p.objective), `${p.id}: objective shown`);
    if (q.mode === 'pairs') {
      assert.equal((html.match(/<button type="button" class="case-counter/g) || []).length, 3);
      assert.match(html, /data-bag-move="[^"]*keep[^"]*"[^>]*disabled/, `${p.id}: nothing to keep yet`);
      continue;
    }
    assert.equal((html.match(/class="bag-choice/g) || []).length, 12, `${p.id}: three choices for each colour pair`);
    if (q.mode === 'busiest') assert.match(html, /class="bag-choice on"[^>]*disabled/, 'the rule is set');
  }
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Fair bags/);
});

test('the playground: flip, add and take away counters, any rule, random pairs; never solved', () => {
  const pg = byId('bags-playground');
  let a = freshAttempt(pg);
  assert.deepEqual(a.board, {colours: 'RRRB', rule: 'XSCX', draws: []});
  a = move(pg, a, {type: 'random', n: 10}, () => 0.5);
  assert.equal(a.board.draws.length, 10);
  a = play(pg, a, [set('RR', 'S')]);
  assert.equal(a.board.draws.length, 10, 'a new rule re-sorts the pairs');
  a = play(pg, a, [{type: 'add'}]);
  assert.deepEqual(a.board, {colours: 'RRRBB', rule: 'SSCX', draws: []});
  a = play(pg, a, [{type: 'flip', at: 0}, {type: 'remove'}]);
  assert.equal(a.board.colours, 'BRRB');
  assert.equal((view(pg, a).match(/class="case-bin"/g) || []).length, 3, 'square, circle and skip piles');
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('bags-01'), a = solve(p);
  const half = play(byId('bags-06'), freshAttempt(byId('bags-06')), [set('RR', 'X'), set('BB', 'X'), claim]);
  const busy = play(byId('bags-04'), freshAttempt(byId('bags-04')), [{type: 'flip', at: 1}]);
  const pg = byId('bags-playground'), toy = play(pg, freshAttempt(pg), [{type: 'add'}, set('BB', 'C')]);
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile({[p.id]: a, 'bags-06': half, 'bags-04': busy, [pg.id]: toy})]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of [[p.id, a], ['bags-06', half], ['bags-04', busy], [pg.id, toy]]) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a pair missing');
  const unfair = {...store, profiles: [profile({'bags-06': {...half, board: {rule: 'XSCX', claimed: true, missed: false}}})]};
  assert.throws(() => validateStore(unfair, puzzles), 'claimed with a rule that skips too many');
});

test('the satchel lists Fair bags with its playground and eight puzzles', () => {
  const html = libraryView(profile({'bags-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-bags"/);
  assert.match(html, /data-id="bags-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 8; n++) assert.ok(html.includes(`data-id="bags-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Fair bags, Easy, puzzle 2, completed/);
});
