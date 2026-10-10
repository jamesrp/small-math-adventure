// Sharing circles: the averaging check, exact solves and fractions, every way
// of a find-every puzzle, cards, one change at a time, That's all and its
// refusal through Undo, tie boards with Can't after an attempt and the chase
// the child taps, hints, taps and keys, the playground, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {averagesMechanics, works, allWork, solve, waysOf, fillingOf, tieCan, groupOf, chaseNext, chaseStep, chasePath, clashOf, tapAction, keyAction, valuesOf, playBoard} from '../dist/families/averages/averages.js';
import {loadPack} from '../scripts/packs.mjs';

const averages = JSON.parse(await readFile(new URL('../dist/families/averages/averages.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = averagesMechanics.averages;
const byId = id => averages.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next && next !== b, `${JSON.stringify(action)} is legal`); return next; }, a);
const set = (id, value) => ({type: 'set', id, value});
const undoCarry = (p, a) => { const back = undo(a); return {...back, board: mech.carry(p, a.board, back.board)}; };
// The chosen place is view state; each view starts fresh unless asked to keep it.
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };

test('a circle works when it is the average of every place joined to it', () => {
  const q = byId('averages-01').parameters;
  assert.equal(works(q, {c: 2, t: 0, l: 3, r: 3}, 'c'), true);
  assert.equal(works(q, {c: 2, t: 1, l: 3, r: 3}, 'c'), false);
  assert.equal(works(q, {c: 2, t: null, l: 3, r: 3}, 'c'), false, 'an empty place has no number');
  const tie = byId('averages-11').parameters;
  assert.equal(allWork(tie, {...tie.given, u: 3, v: 6, w: 7}), false);
  assert.equal(allWork(tie, {...tie.given, u: 3, v: 6, w: 7, z: 8}), true, 'the real filling, with the right circle at 8');
});

test('the circles solve exactly, fractions and all', () => {
  const q = byId('averages-07').parameters;
  assert.deepEqual(solve(q, {A: 0, B: 4}), {p: [4, 3], q: [8, 3]}, 'a right square of 4 gives thirds');
  assert.deepEqual(solve(q, {A: 0, B: 6}), {p: [2, 1], q: [4, 1]});
  const tree = byId('averages-10').parameters;
  assert.deepEqual(solve(tree, {R: 0, T: 8, S: 6}), {u: [4, 1], v: [6, 1]});
  assert.deepEqual(solve(tree, {R: 0, T: 8, S: 2}), {u: [12, 5], v: [26, 5]}, 'fifths off the path');
});

test('every way, the filling and the chase match the table', () => {
  assert.equal(waysOf(byId('averages-01').parameters).length, 10);
  assert.equal(waysOf(byId('averages-02').parameters).length, 8);
  assert.ok(waysOf(byId('averages-02').parameters).every(w => w[1] !== 0 && w[1] !== 4), 'the circle never holds the end cards');
  assert.deepEqual(waysOf(byId('averages-03').parameters), [[1, 11], [5, 7]]);
  assert.deepEqual(waysOf(byId('averages-07').parameters).map(w => w[0]), [0, 3, 6, 9]);
  assert.deepEqual(waysOf(byId('averages-09').parameters), [[0, 4, 12], [6, 7, 9]], 'the near square moves the circle twice as far');
  assert.deepEqual(waysOf(byId('averages-10').parameters).map(w => w[0]), [1, 6, 11]);
  const four = byId('averages-04').parameters, five = byId('averages-05').parameters;
  assert.deepEqual(chasePath(five, ['b', 'a', 'z']), ['b', 'a', 'z'], 'puzzle 5’s tie runs through the left circle to the 0');
  assert.equal(tieCan(four), true);
  assert.equal(fillingOf(four).a, 4);
  assert.equal(tieCan(five), false);
  assert.equal(fillingOf(five), null);
  const ladder = byId('averages-11').parameters, {group, touching} = groupOf(ladder, 'z');
  assert.deepEqual([...group].sort(), ['u', 'v', 'w', 'z']);
  assert.deepEqual([...touching].sort(), ['E', 'S', 'Z']);
  assert.equal(chaseStep(ladder, ['z']), 'v', 'the fewest taps to a smaller square go through the middle circle');
  assert.deepEqual(chasePath(ladder, ['z', 'w', 'v', 'S']), ['z', 'v', 'S'], 'the path drawn is the shortest through the chase');
  const rooms = byId('averages-12').parameters;
  assert.equal(tieCan(rooms), true, 'the 8 squares wall the right circles off from the 2');
  assert.deepEqual([...groupOf(rooms, 'd').group].sort(), ['c', 'd']);
});

test('find every: a way is kept the moment it is made, and again shows Found already', () => {
  const p = byId('averages-01');
  let a = play(p, freshAttempt(p), set('t', 2), set('l', 2), set('r', 2));
  assert.deepEqual(a.board.found, [[2, 2, 2]]);
  assert.equal(move(p, a, set('r', 2)), a, 'the same number again changes nothing');
  a = play(p, a, set('l', 1), set('r', 3));
  assert.deepEqual(a.board.found, [[2, 2, 2], [2, 1, 3]]);
  a = play(p, a, set('l', 2), set('r', 2));
  assert.equal(a.board.again, 0, 'found already');
  assert.equal(a.board.found.length, 2);
  assert.match(view(p, a), /<p class="av-told">Found already\.<\/p>/);
  assert.match(view(p, a), /<li class="again">/);
});

test('That’s all: refused while a way is missing, held through Undo, lifted by a new way', () => {
  const p = byId('averages-03');
  let a = play(p, freshAttempt(p), set('l', 5));
  assert.deepEqual(a.board.found, [[5, 7]]);
  a = play(p, a, {type: 'all'});
  assert.equal(a.board.more, true);
  assert.equal(isSolved(p, a.board), false);
  assert.equal(move(p, a, {type: 'all'}), null, 'not again before a new way');
  const html = view(p, a);
  assert.match(html, /There is another\./);
  assert.match(html, /class="av-button av-all"[^>]*disabled/, 'That’s all waits for a new way');
  const back = undoCarry(p, a);
  assert.equal(back.board.more, true, 'Undo keeps the refusal');
  assert.deepEqual(back.board.found, [[5, 7]], 'and the ways found');
  assert.equal(move(p, back, {type: 'all'}), null);
  a = play(p, back, set('r', 11));
  assert.equal(a.board.values.l, 1, 'changing the other square puts the first back');
  assert.deepEqual(a.board.found, [[5, 7], [1, 11]]);
  assert.equal(a.board.more, false);
  a = play(p, a, {type: 'all'});
  assert.equal(isSolved(p, a.board), true);
});

test('cards: a number on one place only; a change puzzle changes one square', () => {
  const p = byId('averages-02');
  let a = play(p, freshAttempt(p), set('l', 1), set('c', 1));
  assert.deepEqual(a.board.values, {l: null, c: 1, r: null}, 'the card moves');
  assert.match(view(p, a), /class="av-key av-card used"[^>]*aria-label="1, on the circle"/);
  a = play(p, a, set('l', 0), set('r', 2));
  assert.deepEqual(a.board.found, [[0, 1, 2]]);
  const nine = byId('averages-09');
  let b = play(nine, freshAttempt(nine), set('B', 12));
  assert.deepEqual(b.board.values, {A: 0, p: null, B: 12});
  b = play(nine, b, set('A', 6));
  assert.equal(b.board.values.B, 9, 'one square changes at a time');
  assert.equal(validBoard(nine, {...b.board, values: {A: 6, p: null, B: 12}}), false, 'a save with two squares changed');
});

test('tie: Can’t only after an attempt in the given circle’s group; the child taps the chase', () => {
  const p = byId('averages-08'), q = p.parameters;
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant'}), null, 'nothing tried yet');
  assert.match(view(p, fresh), /class="av-button av-cant"[^>]*disabled/);
  assert.deepEqual(nextHint(p, fresh).action, set('b', 12), 'the hints start with an attempt next to the given circle');
  assert.ok(!/press can.t/i.test(p.hints[0]));
  let a = play(p, fresh, set('a', 12));
  const why = nextHint(p, a);
  assert.equal(why.text, 'Every place joined to a 12 circle must be 12 too, and the 0 square can’t be.', 'the reason, leaving the button to level 2');
  assert.equal(why.action.type, 'cant');
  a = play(p, a, {type: 'cant'});
  assert.deepEqual(a.board.chase, ['c']);
  assert.equal(isSolved(p, a.board), false, 'a bare Can’t is not a solve');
  assert.equal(move(p, a, set('b', 4)), null, 'no numbers during a chase');
  const html = view(p, a);
  assert.ok(!/can-go|Tap to chase/.test(html), 'nothing marks the next place to tap');
  assert.match(html, /aria-label="0 square, 0"/);
  assert.match(html, /aria-label="Middle circle, empty"/, 'every place not in the chase reads the same');
  assert.deepEqual(tapAction(p, a.board, 'z'), {move: {type: 'chase', id: 'z'}}, 'any place is a tap');
  assert.equal(tapAction(p, a.board, 'c'), null, 'except one already in the chase');
  a = play(p, a, {type: 'chase', id: 'b'}, {type: 'chase', id: 't'});
  assert.equal(clashOf(q, a.board.chase), null, 'the 12 square agrees');
  assert.equal(isSolved(p, a.board), false);
  const back = undoCarry(p, a);
  assert.deepEqual(back.board.chase, ['c', 'b'], 'Undo takes back a tap');
  a = play(p, a, {type: 'chase', id: 'a'}, {type: 'chase', id: 'z'});
  assert.equal(isSolved(p, a.board), true);
  const done = view(p, a);
  assert.match(done, /av-path/, 'the argument is drawn');
  assert.match(done, /class="gb-node av-sq locked clash"/);
  assert.match(done, /Can’t: bottom circle, middle circle, left circle and 0 square; 0 square is not 12\./);
});

test('tie: a tap away from the chase ends it; a chase that runs out is kept through Undo', () => {
  const eight = byId('averages-08');
  let off = play(eight, freshAttempt(eight), set('b', 3), {type: 'cant'}, {type: 'chase', id: 'z'});
  assert.equal(off.board.chase, null);
  assert.equal(off.board.told, 'apart');
  assert.match(view(eight, off), /<p class="av-told">Not joined to the chase\.<\/p>/);
  assert.deepEqual(play(eight, off, {type: 'cant'}).board.chase, ['c'], 'Can’t again starts a new chase');
  assert.equal(move(eight, play(eight, freshAttempt(eight), set('a', 3)), {type: 'cant'}) !== null, true, 'the left circle is in the group');
  const p = byId('averages-12'), q = p.parameters;
  assert.equal(move(p, play(p, freshAttempt(p), set('a', 3)), {type: 'cant'}), null, 'a number away from the given circle’s group is no attempt');
  let a = play(p, freshAttempt(p), set('c', 3), {type: 'cant'}, {type: 'chase', id: 'c'}, {type: 'chase', id: 'B'});
  assert.deepEqual(a.board.chase, ['d', 'c', 'B']);
  a = play(p, a, {type: 'chase', id: 'T'});
  assert.deepEqual(a.board, {values: {a: null, b: null, c: 3}, chase: null, told: 'out'}, 'the chase runs out and ends');
  assert.equal(isSolved(p, a.board), false);
  assert.match(view(p, a), /<p class="av-told">Every square it reaches is 8\.<\/p>/);
  assert.match(view(p, a), /class="av-button av-cant"[^>]*disabled/);
  assert.equal(move(p, a, {type: 'cant'}), null, 'Can’t stays off');
  let back = a;
  for (let k = 0; k < 6; k++) back = undoCarry(p, back);
  assert.deepEqual(back.board, {values: {a: null, b: null, c: null}, chase: null, told: 'out'}, 'Undo keeps it');
  assert.equal(validBoard(p, back.board), true);
  assert.equal(nextHint(p, a).action.type, 'set');
  a = play(p, a, set('c', 8));
  assert.equal(a.board.told, null, 'a new number lifts it');
  a = play(p, a, set('a', 5), set('b', 5));
  assert.equal(isSolved(p, a.board), true);
  assert.match(view(p, a), /class="gb-node av-ci free own lit"/);
  assert.equal(validBoard(byId('averages-05'), {values: {a: 1, c: null}, chase: null, told: 'out'}), false, 'no chase runs out where a smaller square is reached');
});

test('hints alone solve every puzzle, from fresh and after a wrong number', () => {
  for (const p of averages.puzzles.filter(x => x.band !== 'playground')) {
    for (const start of [freshAttempt(p), play(p, freshAttempt(p), set(p.parameters.free[0], p.parameters.range[1]))]) {
      let a = start, n = 0;
      while (!isSolved(p, a.board) && n++ < 80) { const h = nextHint(p, a); assert.equal(h.type, 'move', p.id); a = play(p, a, h.action); }
      assert.ok(isSolved(p, a.board), `${p.id}: hints solve`);
    }
  }
});

test('taps choose a place; digits and arrows set it', () => {
  const p = byId('averages-06');
  const a = freshAttempt(p);
  mech.reset(p);
  assert.deepEqual(tapAction(p, a.board, 'q'), {choose: 'q'});
  assert.equal(tapAction(p, a.board, 'p'), null, 'a given circle is not a control');
  mech.ui(p, {chosen: 'q'});
  assert.deepEqual(keyAction(p, a.board, '4'), set('q', 4));
  assert.deepEqual(keyAction(p, a.board, 'ArrowUp'), set('q', 0), 'up from empty starts at the bottom');
  assert.deepEqual(keyAction(p, a.board, 'ArrowDown'), set('q', 6));
  assert.equal(keyAction(p, a.board, '9'), null, 'past the range');
  const b = play(p, a, set('q', 6));
  assert.equal(keyAction(p, b.board, 'ArrowUp'), null);
  assert.deepEqual(keyAction(p, b.board, 'ArrowLeft'), set('q', 5));
  const html = view(p, b, true);
  assert.match(html, /data-gb-node="q"[^>]*/);
  assert.match(html, /class="gb-node av-ci free own chosen"/, 'the chosen place');
  assert.match(html, /class="av-ring"/, 'gets a ring');
  assert.match(html, /aria-pressed="true" aria-label="6">6</);
  mech.reset(p);
});

test('rendering: the board carries the task, with no count of ways and no names', () => {
  for (const p of averages.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="averages"/, p.id);
    assert.ok(!html.includes(p.title), `${p.id}: no puzzle title on the board`);
    assert.ok(!/\d+ (of|out of) \d+|ways? found|\d+ left/i.test(html.replace(/aria-label="[^"]*"/g, '')), `${p.id}: no visible found-count`);
    if (p.parameters.mode !== 'playground') assert.match(html, /role="status"/);
  }
  const p = byId('averages-01');
  const html = view(p, freshAttempt(p));
  assert.match(html, /class="gb-node av-ci locked"[^>]*role="img" aria-label="Circle, 2"/);
  assert.match(html, /data-focus="av-all"/);
  assert.equal((html.match(/class="av-key"/g) || []).length, 4, 'keys 0 to 3');
});

test('saves: forged boards are refused', () => {
  const p = byId('averages-01'), B = freshAttempt(p).board;
  assert.equal(validBoard(p, {...B, found: [[1, 1, 1]]}), false, 'a way that does not work');
  assert.equal(validBoard(p, {...B, done: true}), false, 'That’s all before every way');
  assert.equal(validBoard(p, {...B, values: {t: 2, l: 2, r: 2}}), false, 'a way on the board not kept');
  assert.equal(validBoard(p, {...B, values: {t: 4, l: null, r: null}}), false, 'past the range');
  assert.equal(validBoard(p, {...B, values: {t: 1, l: null, r: null, c: 2}}), false, 'a number on a given place');
  const t = byId('averages-05');
  const tb = freshAttempt(t).board, tried = {a: 1, c: null};
  assert.equal(validBoard(t, {...tb, chase: ['b']}), false, 'a chase with no attempt');
  assert.equal(validBoard(t, {values: {a: null, c: 1}, chase: ['b'], told: null}), false, 'an attempt away from the group');
  assert.equal(validBoard(t, {values: tried, chase: ['b', 'a', 'z', 'e'], told: null}), false, 'a chase past its smaller square');
  assert.equal(validBoard(t, {values: tried, chase: ['b', 'z'], told: null}), false, 'a chase that jumps');
  assert.equal(validBoard(t, {values: tried, chase: ['b', 'a', 'z'], told: null}), true);
  assert.equal(isSolved(t, {values: tried, chase: ['b', 'a', 'z'], told: null}), true);
});

test('the playground: four boards, every place free, never solved, no hints', () => {
  const p = byId('averages-playground'), q = p.parameters;
  let a = freshAttempt(p);
  assert.equal(a.board.board, 'path');
  assert.deepEqual(a.board.values, {A: 0, p: null, q: null, r: null, B: 12});
  assert.equal(mech.noHint(p), true);
  a = play(p, a, set('p', 3), set('q', 6), set('r', 9));
  assert.ok(allWork(playBoard(q, a.board), valuesOf(playBoard(q, a.board), a.board.values)));
  assert.equal(isSolved(p, a.board), false);
  assert.equal((view(p, a).match(/ lit"/g) || []).length, 3, 'all three circles light');
  a = play(p, a, set('A', 3));
  assert.equal((view(p, a).match(/ lit"/g) || []).length, 2, 'a square can change here');
  a = play(p, a, {type: 'board', board: 'triangle'});
  assert.deepEqual(a.board.values, {t: null, l: null, r: null});
  a = play(p, a, set('t', 4), set('l', 4), set('r', 4));
  assert.ok(allWork(playBoard(q, a.board), a.board.values), 'no squares: all the same works');
  assert.equal(move(p, a, {type: 'board', board: 'moon'}), null);
  assert.match(view(p, a), /class="av-pick" [^>]*aria-pressed="true" aria-label="Triangle"/);
});

test('carry keeps found ways and a refusal through Undo; reset clears the view', () => {
  const p = byId('averages-06');
  let a = play(p, freshAttempt(p), set('A', 0), set('q', 4), set('B', 6));
  assert.deepEqual(a.board.found, [[0, 4, 6]]);
  const back = undoCarry(p, a);
  assert.deepEqual(back.board.found, [[0, 4, 6]], 'Undo keeps the way');
  assert.equal(back.board.values.B, null);
  assert.equal(validBoard(p, back.board), true);
  mech.ui(p, {chosen: 'B'});
  mech.reset(p);
  assert.match(view(p, a, true), /class="gb-node av-sq free own chosen"[^>]*data-node="A"/, 'the first free place is chosen again');
});
