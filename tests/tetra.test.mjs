// Mirror twins: turns and rotations, no reflection, matching and the two
// classes, turning to match, Can't with its traced arrows (form refusals,
// wrong claims locked through Undo and Restart, the refusal shown while
// locked), one change, set-ups with Start again, no dead ends and a first hint
// that doesn't sort them, every pair with the new pair marked, sorting with a
// That's all that judges nothing, its proof and the pairs it remembers as
// shown apart, the playground, hints that don't tell the kind, saves,
// rendering, styles and timing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {FAMILIES} from '../dist/families.js';
import tetraModule, {tetraMechanics, TURN, ROTATIONS, isRotation, turned, labelsOf, rotated, canMatch, tapsTo, judge, clockwise, classesOf, traceTap, describe, proofPairs, cardLabels, stacksOf, LETTERS} from '../dist/families/tetra/tetra.js';
import {loadPack} from '../scripts/packs.mjs';

const tetra = JSON.parse(await readFile(new URL('../dist/families/tetra/tetra.json', import.meta.url), 'utf8'));
const css = await readFile(new URL('../dist/families/tetra/tetra.css', import.meta.url), 'utf8');
const pack = await loadPack();
const m = tetraMechanics.tetra;
const byId = n => tetra.puzzles.find(p => p.id === (typeof n === 'number' ? `tetra-${String(n).padStart(2, '0')}` : n));
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const taps = (...at) => at.map(k => ({type: 'turn', at: k}));
const W = s => [...s];
// Undo as the app does it: one step, then carry.
const undoCarry = (p, a) => { const next = undo(a); return {...next, board: m.carry(p, a.board, next.board)}; };
const restartCarry = (p, a) => { const next = restart(p, a); return {...next, board: m.carryOnRestart(p, a.board, next.board)}; };
const noCant = (p, a) => [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]].every(x => [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]].every(y => move(p, a, {type: 'cant', left: x, right: y}) === null));
const board = (p, a) => { m.reset(p); return m.render(p, {...a, hintLevel: 0}); };
const view = (p, a) => { m.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };

test('a tap turns a third of the way round a corner: that corner stays, three taps come back, twelve poses, never a reflection', () => {
  for (const k of [0, 1, 2, 3]) {
    assert.equal(TURN[k][k], k, 'the tapped corner stays');
    let at = [0, 1, 2, 3];
    for (let n = 0; n < 3; n++) at = turned(at, k);
    assert.deepEqual(at, [0, 1, 2, 3], 'three taps come back');
  }
  assert.equal(ROTATIONS.length, 12);
  const odd = g => { let n = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (g[i] > g[j]) n++; return n % 2; };
  assert.ok(ROTATIONS.every(g => !odd(g)), 'only even permutations');
  assert.equal(isRotation([0, 1, 3, 2]), false, 'a swap of two corners is a reflection');
  assert.deepEqual(TURN[0], [0, 2, 3, 1], 'a tap on the middle moves top to right, right to left, left to top');
  assert.ok(clockwise(1, 2) && clockwise(2, 3) && clockwise(3, 1) && !clockwise(2, 1));
  assert.deepEqual(rotated(W('ADBC'), TURN[0]), W('ACDB'));
  assert.deepEqual(labelsOf(W('ABCD'), [1, 0, 2, 3]), W('BACD'));
});

test('matching: the twins never match, two equal letters always do, and four different letters make two classes of twelve', () => {
  assert.equal(canMatch(W('ADCB'), W('ADBC')), false, 'the twins');
  assert.equal(canMatch(W('ACCB'), W('ACBC')), true, 'two Cs');
  assert.equal(canMatch(W('ACBA'), W('ACAB')), true, 'two As');
  const all = [];
  (function go(rest, w) { if (!rest.length) all.push(w); rest.forEach((x, i) => go([...rest.slice(0, i), ...rest.slice(i + 1)], [...w, x])); })(LETTERS, []);
  assert.deepEqual(classesOf(all).map(c => c.length), [12, 12]);
  const aabc = [...new Set(all.map(w => w.map(x => x === 'D' ? 'A' : x).join('')))].map(W);
  assert.equal(aabc.length, 12);
  assert.deepEqual(classesOf(aabc).map(c => c.length), [12], 'every A, A, B, C model matches every other');
  assert.deepEqual(tapsTo(W('ADCB'), W('BACD')), [0, 1]);
  assert.equal(tapsTo(W('ADCB'), W('ADBC')), null);
});

test('turning to match: a tap at a time, solved on the match; nothing turns once solved', () => {
  const p = byId(1);
  let a = freshAttempt(p);
  assert.ok(!isSolved(p, a.board));
  a = play(p, a, ...taps(1));
  assert.ok(!isSolved(p, a.board));
  a = undo(a);
  a = play(p, a, ...taps(0));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'turn', at: 0}), null);
  assert.equal(move(p, freshAttempt(p), {type: 'cant', left: [1, 2], right: [1, 2]}), null, 'no Can’t on the first puzzle');
  assert.equal(move(p, freshAttempt(p), {type: 'turn', at: 4}), null);
  assert.equal(move(p, freshAttempt(p), {type: 'merge', drop: 'D', keep: 'C'}), null, 'no change of letters');
});

test('Can’t: only after a turn; the same middle letter and the same two letters, judged when the last tap is in', () => {
  const p = byId(3);
  const fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', left: [1, 2], right: [1, 2]}), null, 'not before a turn');
  // Other model ADCB; yours BDCA: B in the middle.
  const off = play(p, fresh, ...taps(1));
  assert.notEqual(labelsOf(off.board.letters, off.board.at)[0], 'A');
  const middle = play(p, off, {type: 'cant', left: [1, 2], right: [1, 2]});
  assert.equal(middle.board.told, 'middle');
  assert.equal(middle.board.claim, null);
  assert.match(board(p, middle), /Not the same letter in the middle\./);
  const a = play(p, fresh, ...taps(2));
  const R = labelsOf(a.board.letters, a.board.at);
  assert.deepEqual(R, W('ABCD'), 'A in the middle after one tap on the right corner');
  const letters = play(p, a, {type: 'cant', left: [1, 2], right: [1, 3]});
  assert.equal(letters.board.told, 'letters', 'D then C on the other, B then D on yours');
  assert.match(board(p, letters), /Follow the same letters on both\./);
  // B (left, 3) then C (right, 2) on the other; B (top, 1) then C (right, 2) on yours.
  const ok = play(p, a, {type: 'cant', left: [3, 2], right: [1, 2]});
  assert.ok(isSolved(p, ok.board));
  assert.deepEqual(judge(W('ADCB'), R, [3, 2], [1, 2]), {ok: true});
  assert.match(board(p, ok), /tt-arrow ok/);
  assert.equal((board(p, ok).match(/tt-arrow ok/g) || []).length, 2, 'both arrows drawn');
});

test('a wrong Can’t: one short refusal, and Can’t stays off on those letters through turns, Undo and Restart', () => {
  const p = byId(2);
  // Other ADCB; yours BACD. A tap on the left corner brings A to the middle without a match.
  const a = play(p, freshAttempt(p), ...taps(3));
  const R = labelsOf(a.board.letters, a.board.at);
  assert.equal(R[0], 'A');
  assert.equal(isSolved(p, a.board), false);
  const t = [1, 2], u = [R.indexOf('D'), R.indexOf('C')];
  const c = play(p, a, {type: 'cant', left: t, right: u});
  assert.equal(c.board.claim.ok, false);
  assert.equal(c.board.claim.kind, 'round');
  assert.match(board(p, c), /Same way round\./);
  assert.match(board(p, c), /tt-arrow off/);
  assert.match(board(p, c), /class="secondary tt-button tt-cant"[^>]*disabled/);
  const back = undoCarry(p, c);
  assert.equal(back.board.claim, null, 'Undo takes the claim’s arrows away');
  assert.deepEqual(back.board.wrong, c.board.wrong, 'and keeps the lock');
  assert.equal(back.board.told, null);
  assert.notEqual(board(p, back), board(p, c), 'Undo changes the screen');
  assert.doesNotMatch(board(p, back), /tt-arrow off/);
  assert.match(board(p, back), /class="secondary tt-button tt-cant"[^>]*disabled/, 'Can’t still off');
  assert.match(board(p, back), /<p class="tt-told">Same way round\.<\/p>/, 'with the refusal it earned');
  assert.match(board(p, restartCarry(p, c)), /<p class="tt-told">Same way round\.<\/p>/, 'after Restart too');
  const before = undoCarry(p, back);
  assert.ok(noCant(p, play(p, before, ...taps(3))), 'no second claim, back to the start');
  assert.ok(noCant(p, play(p, restartCarry(p, c), ...taps(3))), 'nor after Restart');
  assert.ok(noCant(p, play(p, c, ...taps(0))), 'nor after a turn');
  assert.equal(play(p, c, ...taps(0)).board.claim, null, 'a turn takes the arrows away');
  // The pair still matches by turning.
  const won = play(p, before, ...taps(...tapsTo(W('ADCB'), labelsOf(before.board.letters, before.board.at))));
  assert.ok(isSolved(p, won.board));
  // Two As: arrows opposite, still a match.
  const q = byId(5);
  const b = play(q, freshAttempt(q), ...taps(0));
  const S = labelsOf(b.board.letters, b.board.at);
  const trace = [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]].flatMap(x => [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]].map(y => [x, y])).find(([x, y]) => judge(q.parameters.left, S, x, y).kind === 'way');
  const way = play(q, b, {type: 'cant', left: trace[0], right: trace[1]});
  assert.equal(way.board.claim.kind, 'way');
  assert.match(board(q, way), /There is a way\./);
});

test('tracing: a tap starts an arrow, a second draws it, a tap on the start takes it back', () => {
  let t = {left: [], right: []};
  t = traceTap(t, 'left', 1);
  assert.deepEqual(t.left, [1]);
  assert.deepEqual(traceTap(t, 'left', 1).left, [], 'the start again takes it back');
  t = traceTap(t, 'left', 2);
  assert.deepEqual(t.left, [1, 2]);
  assert.deepEqual(traceTap(t, 'left', 3).left, [3], 'a drawn arrow starts again');
  const p = byId(3), a = play(p, freshAttempt(p), ...taps(2));
  m.reset(p);
  m.ui(p, {tracing: true});
  const html = m.render(p, {...a, hintLevel: 0});
  assert.equal((html.match(/data-tt-trace="left"/g) || []).length, 3, 'the other model’s outer corners can be traced');
  assert.equal((html.match(/data-tt-trace="right"/g) || []).length, 3);
  assert.doesNotMatch(html, /data-tt-trace="[a-z]+" data-at="0"/, 'not the middle');
  assert.doesNotMatch(html, /hinted/, 'no tap is marked');
  m.reset(p);
});

test('one change: any two letters made the same let the twins match; one change only', () => {
  const p = byId(6);
  for (const drop of LETTERS) for (const keep of LETTERS) if (drop !== keep) {
    const a = play(p, freshAttempt(p), {type: 'merge', drop, keep});
    assert.equal(move(p, a, {type: 'merge', drop: keep, keep: drop}), null, 'one change');
    const L = a.board.left, R = labelsOf(a.board.letters, a.board.at);
    assert.ok(canMatch(L, R), `${drop} to ${keep}`);
    assert.ok(isSolved(p, play(p, a, ...taps(...tapsTo(L, R))).board));
  }
  assert.equal(move(p, freshAttempt(p), {type: 'merge', drop: 'A', keep: 'A'}), null);
});

test('set-ups: an A changed on each, or four letters on blank corners, before any turn', () => {
  const p = byId(7), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'turn', at: 0}), null, 'no turn before the changes');
  assert.equal(move(p, fresh, {type: 'place', side: 'left', at: 1}), null, 'only an A changes');
  let a = play(p, fresh, {type: 'place', side: 'left', at: 0}, {type: 'place', side: 'right', at: 2});
  assert.deepEqual(a.board.left, W('DCBA'));
  a = play(p, a, ...taps(1));
  assert.ok(isSolved(p, a.board), 'the As that meet, then one tap');
  // Both middle As make twins. No dead end: the hints make an attempt (the
  // same first tap as a change that matches), bring the same letter back to
  // both middles, then give the reason and Start again.
  const wrong = play(p, fresh, {type: 'place', side: 'left', at: 0}, {type: 'place', side: 'right', at: 0});
  const matching = play(p, fresh, {type: 'place', side: 'left', at: 0}, {type: 'place', side: 'right', at: 2});
  assert.equal(nextHint(p, wrong).type, 'move');
  assert.deepEqual(nextHint(p, wrong).action, {type: 'turn', at: 1});
  assert.equal(nextHint(p, wrong).text, nextHint(p, matching).text, 'the first hint doesn’t sort the changes');
  assert.match(view(p, wrong), /<div class="feedback " role="status" aria-live="polite"><\/div>/, 'nothing said unasked');
  assert.doesNotMatch(view(p, wrong), /tt-told/);
  let shown = wrong;
  for (let n = 0; n < 4 && nextHint(p, shown).action.type === 'turn'; n++) shown = play(p, shown, nextHint(p, shown).action);
  assert.equal(labelsOf(shown.board.letters, shown.board.at)[0], 'D', 'the same letter in both middles');
  assert.deepEqual(nextHint(p, shown).action, {type: 'again'});
  assert.equal(nextHint(p, shown).text, 'With D in the middle of both, A, B and C go round opposite ways, and a turn never changes that. So these two can’t match. Press Start again.');
  const again = play(p, shown, {type: 'again'});
  assert.deepEqual([again.board.left, again.board.letters, again.board.placed], [p.parameters.left, p.parameters.right, {left: 0, right: 0}], 'Start again');
  assert.equal(move(p, again, {type: 'again'}), null, 'nothing to start again');
  assert.match(board(p, wrong), /tt-again"[^>]*data-move/, 'a Start again button');
  const b = byId(9), start = freshAttempt(b);
  let c = play(b, start, ...[0, 1, 2, 3].map(at => ({type: 'place', side: 'right', at})));
  assert.deepEqual(labelsOf(c.board.letters, c.board.at), W('ABCD'));
  assert.ok(!canMatch(b.parameters.left, W('ABCD')));
  assert.ok(!isSolved(b, c.board), 'placing alone is no solve');
  c = play(b, c, ...taps(0));
  const R = labelsOf(c.board.letters, c.board.at);
  c = play(b, c, {type: 'cant', left: [1, 2], right: [R.indexOf('D'), R.indexOf('C')]});
  assert.ok(isSolved(b, c.board));
  // A copy of the other model: the hints turn it to a visible match, then
  // Start again. A wrong claim on it locks those letters, however they come back.
  const copy = play(b, start, ...[0, 3, 2, 1].map(at => ({type: 'place', side: 'right', at})));
  assert.deepEqual(labelsOf(copy.board.letters, copy.board.at), b.parameters.left);
  assert.deepEqual(nextHint(b, copy).action, {type: 'again'});
  assert.equal(nextHint(b, copy).text, 'These two match. Press Start again.');
  const turnedCopy = play(b, copy, ...taps(0));
  const S = labelsOf(turnedCopy.board.letters, turnedCopy.board.at);
  const locked = play(b, turnedCopy, {type: 'cant', left: [1, 2], right: [S.indexOf('D'), S.indexOf('C')]});
  assert.equal(locked.board.told, 'round');
  let back = locked;
  for (let n = 0; n < 3; n++) back = undoCarry(b, back);
  assert.deepEqual(back.board.placed, {left: 0, right: 3}, 'the D taken off');
  assert.ok(noCant(b, play(b, back, {type: 'place', side: 'right', at: 1}, ...taps(0))), 'and put back: still locked');
  const fromAgain = play(b, locked, {type: 'again'}, ...[0, 3, 2, 1].map(at => ({type: 'place', side: 'right', at})), ...taps(0));
  assert.ok(noCant(b, fromAgain), 'after Start again');
  assert.ok(noCant(b, play(b, restartCarry(b, locked), ...[0, 3, 2, 1].map(at => ({type: 'place', side: 'right', at})), ...taps(0))), 'after Restart');
  const other = play(b, restartCarry(b, locked), ...[0, 1, 3, 2].map(at => ({type: 'place', side: 'right', at})), ...taps(0));
  assert.ok(!noCant(b, other), 'other letters are free');
});

test('every pair: a pair goes on the shelf when the models match and both start again; found already; there is another; Undo keeps the shelf', () => {
  const p = byId(8), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'all'}), null, 'nothing found yet');
  let a = play(p, fresh, {type: 'merge', drop: 'C', keep: 'B'});
  assert.deepEqual(a.board.found, ['BC'], 'B and C are in each other’s places');
  assert.deepEqual(a.board.left, W('ADCB'));
  assert.match(board(p, a), /class="tt-found new"/, 'the pair just found is marked');
  const unmade = undoCarry(p, a);
  assert.deepEqual(unmade.board.found, ['BC'], 'Undo keeps it on the shelf');
  assert.notEqual(board(p, unmade), board(p, a), 'and changes the screen');
  assert.doesNotMatch(board(p, unmade), /tt-found new/);
  const again = play(p, a, {type: 'merge', drop: 'B', keep: 'C'});
  assert.deepEqual(again.board.told, {kind: 'again', pair: 'BC'});
  assert.match(board(p, again), /Found already\./);
  const told = play(p, a, {type: 'all'});
  assert.equal(told.board.told, 'more');
  assert.match(board(p, told), /There is another\./);
  assert.equal(move(p, told, {type: 'all'}), null, 'That’s all stays off');
  const back = undoCarry(p, told);
  assert.equal(back.board.refused, 1);
  assert.notEqual(board(p, back), board(p, told));
  assert.equal(move(p, back, {type: 'all'}), null, 'still off after Undo');
  const b = play(p, back, {type: 'merge', drop: 'D', keep: 'C'}, ...taps(0));
  assert.deepEqual(b.board.found, ['BC', 'CD']);
  const kept = undoCarry(p, b);
  assert.deepEqual(kept.board.found, ['BC', 'CD'], 'Undo keeps the pairs');
  assert.ok(move(p, b, {type: 'all'}), 'That’s all on again once the shelf grows');
  const html = board(p, b);
  assert.doesNotMatch(html, /\b\d+ (of|\/) \d+\b|[0-6] found/, 'no count of pairs');
});

test('sorting: models that look alike stack; That’s all judges nothing and asks for Can’t on stacks with the same letters, with no count shown', () => {
  const p = byId(11), q = p.parameters, fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'all'}), null, 'not before a turn');
  assert.deepEqual(classesOf(q.cards), [[0, 2, 4], [1, 3, 5]]);
  let a = fresh;
  for (const n of [3, 5]) a = play(p, a, ...tapsTo(q.cards[1], q.cards[n]).map(at => ({type: 'turn', card: n, at})));
  // A wrong sort: That's all says nothing about it and shows the pairs.
  const shown = play(p, a, {type: 'all'});
  assert.equal(shown.board.told, null);
  assert.deepEqual(proofPairs(q, shown.board), [[0, 1], [0, 2], [0, 4], [1, 2], [1, 4], [2, 4]], 'every two stacks with the same letters');
  assert.doesNotMatch(board(p, shown), /Some can still match|can’t match\./, 'no verdict, no conclusion stated');
  // The first pair are twins: shown apart, on to the next, which can match.
  const L = cardLabels(q, shown.board, 0), turnTo = (b, m) => { for (const k of [0, 1, 2, 3]) { const next = play(p, b, ...taps(k)); if (labelsOf(cardLabels(q, next.board, m), next.board.proof.at)[0] === L[0]) return next; } };
  let t = turnTo(shown, 1), R = labelsOf(cardLabels(q, t.board, 1), t.board.proof.at);
  const next = play(p, t, {type: 'cant', left: [1, 2], right: [R.indexOf(L[1]), R.indexOf(L[2])]});
  assert.equal(next.board.proof.n, 1);
  assert.equal(next.board.told, 'next');
  assert.match(board(p, next), /<p class="tt-told">Right: those two can’t match\. Now these two\.<\/p>/, 'a right Can’t before the last pair says so');
  assert.equal(next.board.apart.length, 1);
  assert.match(next.board.apart[0], /^0·1\|[0-3]{4}\|12\|[1-3]{2}$/, 'remembered with its Can’t');
  assert.equal(play(p, next, ...taps(0)).board.told, null, 'a turn takes the message away');
  assert.ok(canMatch(cardLabels(q, next.board, 0), cardLabels(q, next.board, 2)));
  t = turnTo(next, 2); R = labelsOf(cardLabels(q, t.board, 2), t.board.proof.at);
  const refused = play(p, t, {type: 'cant', left: [1, 2], right: [R.indexOf(L[1]), R.indexOf(L[2])]});
  assert.equal(refused.board.told, 'round', 'refused for a reason');
  assert.deepEqual(refused.board.wrong, ['0·2|round'], 'those two locked');
  assert.match(board(p, refused), /<p class="tt-told">Same way round\.<\/p>/);
  assert.equal((board(p, refused).match(/tt-arrow off/g) || []).length, 2, 'round the child’s own arrows');
  assert.ok(noCant(p, refused) && noCant(p, play(p, refused, ...taps(0))), 'no second claim on them');
  assert.match(board(p, play(p, refused, ...taps(0))), /Same way round\./, 'the refusal stays while locked');
  // A small model goes back to sorting.
  assert.match(board(p, refused), /class="tt-stack[^"]*"[^>]*data-action="expansion-move"[^>]*&quot;back&quot;/);
  const sorting = play(p, refused, {type: 'back', card: 2});
  assert.equal(sorting.board.proof, null);
  assert.doesNotMatch(board(p, sorting), /tt-told/);
  // That's all again skips the pair shown apart, straight to the locked pair.
  const skipped = play(p, sorting, {type: 'all'});
  assert.equal(skipped.board.proof.n, 1, 'the twins are not asked for again');
  assert.match(board(p, skipped), /Same way round\./);
  // A turn that changes neither stack keeps it; one that changes a stack forgets it.
  const look = (b, n) => cardLabels(q, b, n).join('');
  const k = [0, 1, 2, 3].find(at => { const b = play(p, sorting, {type: 'turn', card: 4, at}).board; return ![0, 1].some(n => look(b, 4) === look(b, n)); });
  assert.deepEqual(play(p, sorting, {type: 'turn', card: 4, at: k}).board.apart, sorting.board.apart, 'another stack turned: still shown apart');
  assert.deepEqual(play(p, sorting, {type: 'turn', card: 5, at: 0}).board.apart, [], 'a model of its stack turned: forgotten');
  a = play(p, sorting, ...[2, 4].flatMap(n => tapsTo(q.cards[0], q.cards[n]).map(at => ({type: 'turn', card: n, at}))));
  assert.deepEqual(a.board.apart, [], 'a stack that changed forgets the pairs it heads');
  const html = board(p, a);
  assert.equal((html.match(/class="tt-stack/g) || []).length, 2, 'two stacks');
  assert.doesNotMatch(html.replace(/<p class="sr-only"[^]*?<\/p>/g, ''), /\b(two|2) (stacks|groups|classes)\b/i, 'no count of classes on the board');
  // A right sort: one model from each of the two stacks, for Can't.
  a = play(p, a, {type: 'all'});
  assert.ok(!isSolved(p, a.board), 'not solved yet');
  assert.deepEqual(proofPairs(q, a.board), [[0, 1]]);
  assert.equal((board(p, a).match(/class="tt-model /g) || []).length, 2, 'a pair of models');
  assert.equal(move(p, a, {type: 'turn', card: 0, at: 0}), null, 'the stacks stay as they are');
  assert.ok(noCant(p, a), 'Can’t after a turn');
  t = turnTo(a, 1); R = labelsOf(cardLabels(q, t.board, 1), t.board.proof.at);
  assert.equal(R[0], L[0], 'the same letter in both middles');
  assert.equal(play(p, t, {type: 'cant', left: [1, 2], right: [R.indexOf(L[2]), R.indexOf(L[1])]}).board.told, 'letters');
  a = play(p, t, {type: 'cant', left: [1, 2], right: [R.indexOf(L[1]), R.indexOf(L[2])]});
  assert.ok(isSolved(p, a.board));
  assert.equal((board(p, a).match(/tt-arrow ok/g) || []).length, 2, 'both arrows drawn');
  const e = byId(12);
  assert.deepEqual(classesOf(e.parameters.cards), [[0, 3, 5], [1, 4, 7], [2, 6]], 'the A, A, B, C models make one stack');
  assert.deepEqual(e.solution.twins, [[1, 2]], 'only the two stacks of four different letters need a certificate');
  assert.equal(p.visibleObjective, 'Turn models so the ones that match stack together, then try Can’t on each pair shown.', 'one objective line names both steps');
});

test('the playground: turn either model, change letters, never solved, no Hint', () => {
  const p = byId('tetra-playground');
  let a = play(p, freshAttempt(p), {type: 'turn', side: 'left', at: 1}, {type: 'letter', side: 'right', at: 0});
  assert.equal(labelsOf(a.board.right.letters, a.board.right.at)[0], 'B');
  assert.ok(!isSolved(p, a.board));
  assert.equal(m.noHint(p), true);
  assert.equal(nextHint(p, a).type, 'done');
  m.reset(p);
  m.ui(p, {tool: 'letters'});
  assert.match(m.render(p, {...a, hintLevel: 0}), /Change the letter/);
  m.reset(p);
});

test('hints: never Can’t or That’s all first, the reason before Can’t, and they solve every puzzle quickly in CPU time', () => {
  for (const p of tetra.puzzles.filter(p => p.parameters.mode !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    const first = nextHint(p, a);
    assert.ok(!['cant', 'all'].includes(first.action.type), `${p.id}: never a claim first`);
    assert.doesNotMatch(p.hints[0], /Press/, `${p.id}: the authored first hint`);
    for (; !isSolved(p, a.board) && steps < 40; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time, so a loaded machine doesn't fail it)`);
      if (h.action.type === 'cant') assert.match(h.text, /^With [A-D] in the middle of both/, `${p.id}: the reason first`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
  assert.equal(nextHint(byId(6), freshAttempt(byId(6))).text, 'Change D to C.');
  const p = byId(3), turnedAway = play(p, freshAttempt(p), ...taps(0));
  assert.equal(nextHint(p, turnedAway).action.type, 'turn', 'first bring the same letter to the middle');
});

test('hints don’t tell twins from a pair that can match: the same letter into the middle, then the middle until the tops agree', () => {
  const p = byId(9), start = freshAttempt(p), put = order => play(p, start, ...order.map(at => ({type: 'place', side: 'right', at})));
  const R = a => labelsOf(a.board.letters, a.board.at), L = p.parameters.left;
  // A at the top of both, B in the middle: one can match, one is a twin.
  const can = put([1, 0, 2, 3]), twins = put([1, 0, 3, 2]);
  assert.deepEqual([R(can), R(twins)].map(x => x.join('')), ['BACD', 'BADC']);
  assert.ok(canMatch(L, R(can)) && !canMatch(L, R(twins)));
  assert.deepEqual(nextHint(p, can), nextHint(p, twins), 'the same first hint');
  assert.equal(nextHint(p, can).text, 'Tap the left corner.', 'which brings A into the middle');
  // A in the middle of both, the tops different: the middle, for both.
  const can2 = put([0, 2, 1, 3]), twins2 = put([0, 3, 1, 2]);
  assert.ok(canMatch(L, R(can2)) && !canMatch(L, R(twins2)) && R(can2)[1] !== L[1] && R(twins2)[1] !== L[1]);
  for (const a of [can2, twins2]) assert.equal(nextHint(p, play(p, a, ...taps(0), ...taps(0), ...taps(0))).text, 'Tap the middle.');
  // In a sort's proof too: every pair hinted alike until the picture shows the kind.
  const s = byId(11), sq = s.parameters, shown = play(s, play(s, freshAttempt(s), {type: 'turn', card: 0, at: 0}, {type: 'turn', card: 0, at: 0}, {type: 'turn', card: 0, at: 0}), {type: 'all'});
  let a = shown;
  for (let n = 0; n < 8 && !canMatch(...proofPairs(sq, a.board)[a.board.proof.n].map(k => cardLabels(sq, a.board, k))); n++) {
    const [x, y] = proofPairs(sq, a.board)[a.board.proof.n], Lx = cardLabels(sq, a.board, x), Ry = labelsOf(cardLabels(sq, a.board, y), a.board.proof.at), h = nextHint(s, a);
    if (Lx[0] !== Ry[0]) assert.equal(labelsOf(cardLabels(sq, a.board, y), turned(a.board.proof.at, h.action.at))[0], Lx[0], 'the twins: the same letter into the middle');
    while (nextHint(s, a).action.type === 'turn') a = play(s, a, nextHint(s, a).action);
    a = play(s, a, nextHint(s, a).action);
  }
  const [x, y] = proofPairs(sq, a.board)[a.board.proof.n], Lx = cardLabels(sq, a.board, x), Ry = labelsOf(cardLabels(sq, a.board, y), a.board.proof.at), h = nextHint(s, a);
  if (Lx[0] !== Ry[0]) assert.equal(labelsOf(cardLabels(sq, a.board, y), turned(a.board.proof.at, h.action.at))[0], Lx[0], 'a pair that can match: the same');
  else assert.equal(h.text, 'Tap the middle.');
});

test('forged saves are rejected', () => {
  const p = byId(3), B = freshAttempt(p).board;
  for (const [b, why] of [
    [{...B, at: [0, 1, 3, 2], tried: true}, 'a reflected pose'],
    [{...B, at: [0, 2, 3, 1]}, 'a turn not marked'],
    [{...B, tried: true, claim: {ok: true, at: [0, 1, 2, 3], left: [1, 2], right: [1, 2]}}, 'a claim with different middles'],
    [{...B, told: 'round'}, 'a refusal with no claim'],
    [{...B, letters: W('BDCD')}, 'changed letters'],
    [{...B, merged: ['D', 'C']}, 'a change on a puzzle without one'],
    [{...B, wrong: ['A·D·C·B|A·D·B·C|round']}, 'a lock on twins'],
    [{...B, wrong: ['A·D·C·B|A·D·B·C']}, 'a lock without its refusal'],
    [{...B, tried: true, at: [0, 2, 3, 1], told: 'letters'}, 'a stale message: the middles differ']
  ]) assert.equal(validBoard(p, b), false, why);
  const two = byId(2), T = freshAttempt(two).board;
  assert.equal(validBoard(two, {...T, tried: true, at: [1, 2, 0, 3], told: 'middle'}), false, 'a stale message: A in the middle of both');
  assert.equal(validBoard(two, {...T, tried: true, at: [1, 2, 0, 3], told: 'letters'}), true, 'a fitting one');
  assert.equal(validBoard(two, {...restartCarry(two, play(two, freshAttempt(two), ...taps(3), {type: 'cant', left: [1, 2], right: [1, 2]})).board}), true, 'a lock carried by Restart');
  const s = byId(11), S = freshAttempt(s).board;
  assert.equal(validBoard(s, {...S, done: true}), false, 'a forged done');
  assert.equal(validBoard(s, {...S, tried: true, refused: null}), false, 'a field a sort no longer has');
  assert.equal(validBoard(s, {...S, wrong: ['0·1|round']}), false, 'a lock on twins');
  assert.equal(validBoard(s, {...S, wrong: ['2·0|round']}), false, 'a lock out of order');
  assert.equal(validBoard(s, {...S, wrong: ['0·2|way']}), false, 'a refusal four different letters can’t earn');
  assert.equal(validBoard(s, {...S, wrong: ['0·2|round']}), true, 'a lock carried by Restart');
  const e = byId(8), E = freshAttempt(e).board;
  assert.equal(validBoard(e, {...E, done: true}), false);
  assert.equal(validBoard(e, {...E, found: ['AB', 'AC', 'AD', 'BC', 'BD', 'CD'], refused: 6}), false, 'a refusal of a full shelf');
  assert.equal(validBoard(e, {...E, tried: true, found: ['BC', 'CD'], told: {kind: 'new', pair: 'BC'}}), false, 'a new pair that is not the last');
  assert.equal(validBoard(s, {...S, tried: true, proof: {n: 0, at: [0, 1, 2, 3], tried: false, claim: null}}), true, 'That’s all on any sort shows the pairs');
  assert.equal(validBoard(s, {...S, proof: {n: 0, at: [0, 1, 2, 3], tried: false, claim: null}}), false, 'a proof before a turn');
  assert.equal(validBoard(s, {...S, tried: true, proof: {n: 2, at: [0, 1, 2, 3], tried: false, claim: null}}), false, 'a proof past a pair that can match');
  // Pairs shown apart carry the right Can't on them.
  const sq = s.parameters, at01 = ROTATIONS.find(g => labelsOf(sq.cards[1], g)[0] === sq.cards[0][0]), R01 = labelsOf(sq.cards[1], at01), L0 = sq.cards[0];
  const cert = `0·1|${at01.join('')}|12|${R01.indexOf(L0[1])}${R01.indexOf(L0[2])}`;
  assert.equal(validBoard(s, {...S, tried: true, apart: [cert]}), true, 'twins shown apart');
  assert.equal(validBoard(s, {...S, tried: true, apart: [cert], proof: {n: 1, at: [0, 1, 2, 3], tried: false, claim: null}, told: 'next'}), true, 'and the next pair');
  assert.equal(validBoard(s, {...S, tried: true, apart: [cert], proof: {n: 0, at: [0, 1, 2, 3], tried: false, claim: null}}), false, 'a proof of a pair shown apart');
  assert.equal(validBoard(s, {...S, apart: [cert]}), false, 'shown apart before a turn');
  assert.equal(validBoard(s, {...S, tried: true, apart: ['0·1|0123|12|12']}), false, 'shown apart with no right Can’t');
  assert.equal(validBoard(s, {...S, tried: true, apart: ['0·2|0123|12|12']}), false, 'a pair that can match, shown apart');
});

test('rendering: two models with letter discs, your corners are buttons, objectives only where the board can’t say it', () => {
  for (const p of tetra.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="tetra"/, p.id);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    const mode = p.parameters.mode;
    if (mode !== 'sort') assert.equal((html.match(/class="tt-model /g) || []).length, 2, `${p.id}: two models`);
    if (mode === 'sort') assert.equal((html.match(/class="tt-stack/g) || []).length, p.parameters.cards.length, `${p.id}: a small model each`);
    assert.doesNotMatch(html, new RegExp(p.title), `${p.id}: no puzzle name on the board`);
  }
  for (const n of [1, 2, 3, 4, 5]) assert.equal(byId(n).visibleObjective, '', 'turning puzzles show no objective');
  const p = byId(1), html = board(p, freshAttempt(p));
  assert.equal((html.match(/<button class="tt-corner/g) || []).length, 4, 'your four corners');
  assert.match(html, /aria-label="The other model: A in the middle; D top, C right, B left"/);
  assert.equal(describe(W('ACBD')), 'A in the middle; C top, B right, D left');
  assert.doesNotMatch(html, /Can’t/, 'no Can’t on the first puzzle');
  assert.match(board(byId(2), freshAttempt(byId(2))), /tt-cant"[^>]*disabled/, 'Can’t starts off');
});

test('the module: registered last, a unique symbol, scoped styles, focus only on enabled buttons', () => {
  assert.equal(FAMILIES.at(-1), tetraModule);
  assert.equal(tetraModule.family.symbol, '⧖');
  assert.equal(FAMILIES.filter(f => f.family?.symbol === '⧖').length, 1);
  assert.equal(FAMILIES.filter(f => ['◬', '◭'].includes(f.family?.symbol)).length, 1, 'not a triangle like Rainbow triangles’ ◭');
  const rules = css.replace(/\/\*[^]*?\*\//g, '').replace(/@keyframes[^{]+\{[^{}]*\{[^}]*\}\s*\}/g, '').replace(/@media[^{]+\{/g, '').split('}').map(r => r.trim()).filter(r => r.includes('{'));
  // Split a selector list at its own commas, not those inside :is().
  const list = s => { const out = ['']; let depth = 0; for (const ch of s) { depth += ch === '(' ? 1 : ch === ')' ? -1 : 0; if (ch === ',' && !depth) out.push(''); else out[out.length - 1] += ch; } return out; };
  assert.ok(rules.length > 40);
  for (const rule of rules) for (const sel of list(rule.split('{')[0])) assert.match(sel.trim(), /^\[data-mechanic-wire="tetra"\]/, `scoped: ${sel.trim()}`);
  assert.match(css, /@keyframes tetra-/, 'its own animation name');
  for (const sel of tetraModule.focus.split(',')) assert.match(sel, /^button\.[a-z-]+:not\(\[disabled\]\)$/, sel);
});
