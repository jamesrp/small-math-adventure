// Joining strips: collections and their all-odd forms, joins and halvings,
// the free bench and Flip, catalogs and That's all, matching, reach or
// refute with the child's certificate, taps and refusals that point, hints,
// Undo keeping claims, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {joinsMechanics, oddForm, joinAll, collections, conjugate, reachable, distancesTo, answersOf, tapStrip, keepCheck, halfMoves, freeMoves, applyTo, thumb} from '../dist/families/joins/joins.js';
import {loadPack} from '../scripts/packs.mjs';

const joins = JSON.parse(await readFile(new URL('../dist/families/joins/joins.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = joinsMechanics.joins;
const byId = id => joins.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undo = (p, a) => ({...a, board: mech.carry(p, a.board, a.history.at(-1).board), history: a.history.slice(0, -1)});
const join = s => ({type: 'join', sizes: [s, s]}), halve = s => ({type: 'cut', size: s, at: s / 2});

test('collections, all-odd forms, joining all and Flip', () => {
  assert.equal(collections(5).length, 7);
  assert.equal(collections(8).length, 22);
  assert.deepEqual(oddForm([12, 6, 3]), [3, 3, 3, 3, 3, 3, 3]);
  assert.deepEqual(joinAll([1, 1, 1, 1, 1, 1, 1, 1, 1]), [8, 1]);
  assert.deepEqual(joinAll([5, 5, 3, 3, 3, 1, 1]), [10, 6, 3, 2]);
  assert.deepEqual(joinAll([3, 3, 3, 3, 1, 1, 1, 1, 1, 1]), [12, 4, 2], 'Week 54 Problem 6');
  assert.deepEqual(conjugate([5, 3, 3, 1]), [4, 3, 3, 1, 1]);
  assert.deepEqual(conjugate([3, 3, 2]), [3, 3, 2]);
  assert.equal(answersOf({kind: 'parts', k: 3, total: 8}).length, 10);
  for (let n = 1; n <= 12; n++) assert.equal(answersOf({kind: 'odd', total: n}).length, answersOf({kind: 'distinct', total: n}).length, `odd = distinct at ${n}`);
  assert.ok(reachable([8, 1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2, 2]));
  assert.ok(!reachable([10, 2], [6, 6]));
  assert.equal(distancesTo([2, 2, 2, 2, 2, 2, 2]).get('8,1,1,1,1,1,1'), 6);
  assert.deepEqual(halfMoves([4, 3, 3]), [join(3), halve(4)]);
  assert.ok(freeMoves([5], false).some(m => m.type === 'cut' && m.at === 3));
  assert.deepEqual(applyTo([5], {type: 'cut', size: 5, at: 3}, true), [3, 2]);
  assert.equal(applyTo([5], {type: 'cut', size: 5, at: 3}), null, 'only halving off the free bench');
  assert.equal(applyTo([3, 2], {type: 'join', sizes: [3, 2]}), null, 'only equal joins off the free bench');
  assert.match(thumb([3, 1], 4), /aria-label="3, 1"/);
});

test('reach: joins and halvings, the goal reached, unequal joins refused', () => {
  const p = byId('joins-06');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'join', sizes: [4, 3]}), null);
  assert.equal(move(p, a, {type: 'cut', size: 3, at: 1}), null);
  a = play(p, a, join(3), halve(4), halve(2), halve(2));
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.bench, [6, 1, 1, 1, 1]);
});

test('taps: choose, halve by tapping again, join an equal strip, point at an unequal one', () => {
  const p = byId('joins-06'), q = p.parameters, b = freshAttempt(p).board;
  assert.deepEqual(tapStrip(q, b, null, 'bench', 0), {ui: {choose: {side: 'bench', i: 0}}});
  assert.deepEqual(tapStrip(q, b, {side: 'bench', i: 0}, 'bench', 0), {move: halve(4)});
  assert.deepEqual(tapStrip(q, b, {side: 'bench', i: 1}, 'bench', 1), {ui: {told: {kind: 'halve', side: 'bench', strips: [1]}}}, 'an odd strip is refused, not ignored');
  assert.deepEqual(tapStrip(q, b, {side: 'bench', i: 1}, 'bench', 2), {move: join(3)});
  assert.deepEqual(tapStrip(q, b, {side: 'bench', i: 0}, 'bench', 1), {ui: {told: {kind: 'unequal', side: 'bench', strips: [0, 1]}}});
  // The goal is not a control until a right Can't.
  const html = view(p, freshAttempt(p));
  assert.equal((html.match(/class="jn-strip goal/g) || []).length, 5);
  assert.ok(!/<button[^>]*class="jn-strip goal/.test(html));
  assert.match(html, /data-focus="jn-bench-0"/);
});

test('the free bench: cut lines on the chosen strip, joins of any two', () => {
  const p = byId('joins-02'), q = p.parameters;
  let a = play(p, freshAttempt(p), {type: 'cut', size: 5, at: 3});
  assert.deepEqual(tapStrip(q, a.board, {side: 'bench', i: 0}, 'bench', 1), {move: {type: 'join', sizes: [3, 2]}});
  mech.reset(p);
  mech.ui(p, {choose: {side: 'bench', i: 0}, at: JSON.stringify(a.board)});
  const html = view(p, a, true);
  assert.equal((html.match(/class="jn-cut"/g) || []).length, 2, 'a 3 has two cut lines');
  assert.match(html, /aria-label="Cut into 1 and 2"/);
  // A choice made on another board is gone.
  const next = play(p, a, {type: 'join', sizes: [3, 2]});
  assert.ok(!view(p, next, true).includes('class="jn-cut"'));
});

test('catalogs: Keep, refusals that point, That’s all and its lock through Undo', () => {
  const p = byId('joins-03'), q = p.parameters;
  let a = freshAttempt(p);
  a = play(p, a, {type: 'keep'});
  assert.deepEqual(keepCheck(q, a.board), {told: {kind: 'again', index: 0}}, 'a duplicate points to its copy');
  a = play(p, a, {type: 'cut', size: 7, at: 4});
  assert.deepEqual(keepCheck(q, a.board), {told: {kind: 'odd', side: 'bench', strips: [0]}}, 'the 4 is marked');
  assert.equal(move(p, a, {type: 'keep'}), null);
  mech.reset(p);
  mech.ui(p, {told: keepCheck(q, a.board).told, at: JSON.stringify(a.board)});
  const html = view(p, a, true);
  assert.match(html, /Only odd strips\./);
  assert.match(html, /jn-strip marked/);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true);
  assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null);
  const back = undo(p, play(p, a, {type: 'join', sizes: [4, 3]}));
  assert.equal(back.board.more, true, 'Undo does not escape the claim');
  assert.equal(back.board.shelf.length, 1);
  assert.ok(!/\b\d+ (of|left|found)\b/.test(view(p, a)), 'no visible count');
  // Undo after Keep takes the keep back; the refusal stays while anything is kept.
  const kept = play(p, back, {type: 'join', sizes: [4, 3]}, {type: 'cut', size: 7, at: 5}, {type: 'cut', size: 2, at: 1}, {type: 'keep'});
  assert.equal(kept.board.more, false, 'a new keep clears “There is another.”');
  assert.equal(undo(p, kept).board.shelf.length, kept.board.shelf.length - 1, 'Undo takes the keep back');
  // Duplicates on the shelf get the ochre ring.
  const b = play(p, freshAttempt(p), {type: 'keep'});
  mech.ui(p, {told: {kind: 'again', index: 0}, at: JSON.stringify(b.board)});
  assert.match(view(p, b, true), /jn-thumb again/);
});

test('Flip only in the at-most-three catalog', () => {
  const p = byId('joins-08');
  let a = play(p, freshAttempt(p), {type: 'flip'});
  assert.deepEqual(a.board.bench, [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(keepCheck(p.parameters, a.board).told.strips, [3, 4, 5, 6, 7]);
  assert.match(view(p, a), /aria-label="Flip rows and columns"/);
  assert.equal(move(byId('joins-09'), freshAttempt(byId('joins-09')), {type: 'flip'}), null);
});

test('reach or refute: Can’t after a try, the child halves both rows, judged at the last halving', () => {
  const p = byId('joins-07');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'Can’t needs a try first');
  assert.match(view(p, a), /data-focus="jn-cant" disabled/);
  assert.notEqual(nextHint(p, a).action.type, 'cant');
  a = play(p, a, halve(10), {type: 'cant'});
  assert.equal(a.board.claim, 'halving');
  assert.match(view(p, a), /Halve every even strip in both rows\./);
  assert.equal(move(p, a, join(5)), null, 'no joins after Can’t');
  assert.equal(nextHint(p, a).text, 'Halve the 2.');
  a = play(p, a, halve(2), {type: 'cut', size: 6, at: 3, side: 'goal'});
  assert.ok(!isSolved(p, a.board));
  const back = undo(p, undo(p, a));
  assert.equal(back.board.claim, 'halving', 'Undo takes back halvings; nothing is judged yet');
  assert.ok(!view(p, a).includes('jn-strip hinted') && !/class="jn-strip[^"]*(can-go|next)/.test(view(p, a)), 'no legal next tap is marked');
  a = play(p, a, {type: 'cut', size: 6, at: 3, side: 'goal'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.match(html, /The odd strips differ\./);
  assert.equal((html.match(/jn-strip[^"]* off/g) || []).length, 8, 'every strip unmatched: 5, 5, 1, 1 against four 3s');
});

test('a wrong Can’t is refused once both rows match, and stays refused until the bench moves', () => {
  const p = byId('joins-06');
  let a = play(p, freshAttempt(p), halve(4), {type: 'cant'});
  assert.equal(a.board.claim, 'halving');
  a = play(p, a, halve(2), halve(2));
  assert.equal(a.board.claim, 'halving', 'not judged before the goal is halved');
  a = play(p, a, {type: 'cut', size: 6, at: 3, side: 'goal'});
  assert.equal(a.board.claim, 'refused');
  assert.deepEqual(a.board.goal, [3, 3, 1, 1, 1, 1], 'the goal stays halved until the bench moves');
  assert.match(view(p, a), /There is a way\./);
  assert.equal(move(p, a, {type: 'cant'}), null);
  const back = undo(p, a);
  assert.equal(back.board.claim, 'refused');
  assert.deepEqual(back.board.goal, [6, 1, 1, 1, 1], 'Undo joins the goal back, a visible step');
  assert.ok(validBoard(p, back.board));
  assert.equal(move(p, back, {type: 'cant'}), null);
  const on = play(p, a, join(3));
  assert.equal(on.board.claim, null, 'a new move clears it');
  assert.ok(isSolved(p, on.board), 'and here reaches the goal');
});

test('hints: the authored nudge first, Can’t only after the reason, never first', () => {
  for (const id of ['joins-07', 'joins-12']) {
    const p = byId(id);
    let a = freshAttempt(p), n = 0;
    const texts = [];
    while (!isSolved(p, a.board) && n++ < 40) { const h = nextHint(p, a); texts.push(h.text); a = move(p, a, h.action); }
    assert.ok(isSolved(p, a.board));
    const k = texts.findIndex(t => /^Halved all the way/.test(t)) + 1;
    assert.ok(k > 1, `${id}: Can’t comes after moves`);
    assert.match(texts[k - 1], /^Halved all the way, the goal is/);
    assert.ok(!texts.some(t => /Press Can’t/.test(t)), 'never “Press Can’t”');
  }
  const p = byId('joins-09'), a = freshAttempt(p);
  nextHint(p, a);
  for (const at of [7, 6, 5, 4]) { const b = play(p, a, {type: 'cut', size: 8, at}), t0 = performance.now(); nextHint(p, b); assert.ok(performance.now() - t0 < 100, 'a hint takes well under 100 ms'); }
});

test('matching: take a card, join until all differ, it pairs; Undo takes the pair back', () => {
  const p = byId('joins-05'), q = p.parameters, i = q.cards.findIndex(c => c.join() === '3,3,1,1');
  let a = play(p, freshAttempt(p), {type: 'load', card: i}, join(3));
  assert.deepEqual(a.board.bench, [6, 1, 1]);
  a = play(p, a, join(1));
  assert.deepEqual(a.board.paired, [i]);
  assert.equal(a.board.card, null);
  assert.match(view(p, a), /3, 3, 1, 1 pairs with 6, 2/);
  const back = undo(p, a);
  assert.deepEqual(back.board, {bench: [6, 1, 1], card: i, paired: []});
  assert.ok(validBoard(p, back.board));
});

test('the playground: + and −, joins and halvings, no goal', () => {
  const p = byId('joins-playground');
  let a = play(p, freshAttempt(p), {type: 'add'}, {type: 'remove'}, join(3), halve(6));
  assert.deepEqual(a.board.bench, [3, 3, 1, 1, 1, 1]);
  assert.ok(!isSolved(p, a.board));
  assert.equal(nextHint(p, a).type, 'done');
  assert.ok(mech.noHint(p));
});

test('the focus fallback finds only strip buttons, never the goal picture', async () => {
  const entry = (await import('../dist/families/joins/joins.js')).default;
  assert.match(entry.focus, /^button\.jn-strip/);
  const p = byId('joins-01'), html = view(p, freshAttempt(p));
  assert.ok(html.indexOf('<div class="jn-strip goal') < html.indexOf('<button class="jn-strip'), 'the goal picture comes first in the page');
});

test('saves are checked', () => {
  const p = byId('joins-12'), b = freshAttempt(p).board;
  assert.ok(validBoard(p, b));
  for (const bad of [{...b, bench: [5, 5]}, {...b, bench: [2, 2, 6]}, {...b, claim: 'halving'}, {...b, tried: true, claim: 'refused'}, {...b, goal: [4, 3, 3]}, {...b, tried: 1}]) assert.equal(validBoard(p, bad), false, JSON.stringify(bad));
  const c = byId('joins-04'), cb = freshAttempt(c).board;
  for (const bad of [{...cb, shelf: [[4, 3], [4, 3]]}, {...cb, shelf: [[3, 3, 1]]}, {...cb, done: true}, {...cb, bench: [6]}]) assert.equal(validBoard(c, bad), false, JSON.stringify(bad));
});

test('every puzzle renders with its board and no count', () => {
  for (const p of joins.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="joins"/);
    assert.ok(!/\bfound\b|\bremaining\b/i.test(html.replace(/<[^>]+>/g, ' ')), `${p.id}: no counters`);
  }
});
