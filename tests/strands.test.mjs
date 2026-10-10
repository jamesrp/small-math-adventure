// Strands (Week 75, twists on a cylinder) on the shared portal board: the
// cylinder, crossings between rows, the fewest for two windings, tight
// strands, the twist, untangling with Done and the copies blue must cross,
// three windings for crossing targets with Can't and the middle strand,
// hints, Undo keeping a refusal, forged saves, the playground and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {cylOf, routeOf, fewest, levelsBetween, crossCount, crossings, apart, barriers, layout, twistShift, pairCounts, met, designPossible, isMiddle, handleAt} from '../dist/families/strands/strands.js';
import {loadPack} from '../scripts/packs.mjs';

const strands = JSON.parse(await readFile(new URL('../dist/families/strands/strands.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => strands.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const undoKeep = (p, a) => { const back = undo(a); return {...back, board: mechanicFor(p).carry(p, a.board, back.board)}; };
const solveByHints = (p, a) => { for (let i = 0; i < 80 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action); return a; };

test('the cylinder: four columns round, eight rows up, A and B half way from the seam', () => {
  const q = byId('strands-04').parameters, C = cylOf(q);
  assert.deepEqual([C.N, C.M, C.a], [4, 8, 2]);
  assert.deepEqual([C.lo, C.hi], [q.copies[0] * 4, (q.copies[1] + 1) * 4 - 1]);
  assert.ok(C.S.spec.up.a === null && C.S.spec.up.b === 'a' && C.S.spec.right.a === 'a', 'glued round, walls at the rims');
  assert.deepEqual(routeOf(C, [1, 2, 3, 4, 5, 6, 7], 2), [2, 1, 2, 3, 4, 5, 6, 7, 10]);
});

test('crossings: whole turns strictly between the gaps, never at A or B', () => {
  assert.equal(levelsBetween(0, 1, 4), 0, 'leaving A is not a crossing');
  assert.equal(levelsBetween(3, 4, 4), 0, 'arriving at B is not a crossing');
  assert.equal(levelsBetween(3, 5, 4), 1);
  assert.equal(levelsBetween(-1, 9, 4), 3);
  assert.equal(levelsBetween(9, -1, 4), 3);
  const C = cylOf(byId('strands-07').parameters), red = routeOf(C, [2, 2, 2, 2, 2, 2, 2], 0), blue = routeOf(C, [3, 7, 5, 8, 11, 12, 13], 3);
  assert.equal(crossCount(C, red, blue), 4);
  const list = crossings(C, red, blue);
  assert.deepEqual(list.map(c => c.k), [1, 1, 1, 2], 'three with the next copy of red, one with the copy after');
  for (const c of list) assert.ok(c.t > 0 && c.t < C.M && Number.isInteger(c.j));
  assert.ok(!apart(C, [red, routeOf(C, [6, 7, 5, 8, 11, 12, 13], 3)]), 'a bead on red’s spot one turn round');
});

test('the fewest is max(|a − b| − 1, 0), and the copies blue must cross are those strictly between its ends', () => {
  assert.deepEqual([fewest(0, 0), fewest(0, 1), fewest(0, 2), fewest(0, 3), fewest(-1, 1), fewest(-1, 2), fewest(2, 4), fewest(2, 7), fewest(5, 5)], [0, 0, 1, 2, 1, 2, 1, 4, 0]);
  assert.deepEqual(barriers(0, 3), [1, 2]);
  assert.deepEqual(barriers(-1, 3), [1, 2, 3]);
  assert.deepEqual(barriers(3, 0), [-2, -1]);
  assert.deepEqual(barriers(2, 3), []);
});

test('tight strands meet each pair’s fewest with no three at a point; a twist keeps every gap', () => {
  const C = cylOf(byId('strands-11').parameters);
  for (const ws of [[0, 2, 4], [-1, 4, 1], [0, 0, 0], [3, 3, -1]]) {
    const r = layout(C, ws);
    assert.ok(apart(C, r));
    assert.deepEqual([crossCount(C, r[0], r[1]), crossCount(C, r[1], r[2]), crossCount(C, r[0], r[2])], pairCounts(ws));
  }
  for (let j = 0; j <= C.M; j++) assert.ok(Math.abs(twistShift(C, 1, j) - C.N * j / C.M) <= .5 && twistShift(C, -1, j) === -twistShift(C, 1, j), 'each row turns by its share');
  assert.equal(twistShift(C, 1, C.M), C.N, 'a full turn at the top rim');
  assert.equal(twistShift(C, 1, 0), 0, 'the bottom rim stays');
});

test('untangle: slide beads, a wrong Done is told, Done at the fewest, then tap the forced copies', () => {
  const p = byId('strands-04');
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'move');
  refuse(p, a, {type: 'bead', strand: 1, row: 1, x: 2}, 'a bead on red’s spot');
  refuse(p, a, {type: 'pick', k: 1}, 'a pick before Done');
  const told = play(p, a, {type: 'done'});
  assert.equal(told.board.told, 'fewer');
  assert.match(view(p, told), /There is a way with fewer\./);
  assert.match(view(p, told), /data-move="\{&quot;type&quot;:&quot;done&quot;\}"[^>]*disabled/, 'Done waits for a move');
  assert.equal(undoKeep(p, told).board.told, 'fewer', 'Undo keeps the refusal');
  a = play(p, a, {type: 'bead', strand: 1, row: 4, x: 9});
  assert.equal(a.board.told, null);
  const claim = play(p, a, {type: 'done'});
  assert.deepEqual(claim.board.claim, []);
  assert.match(view(p, claim), /Tap each red copy that blue must cross\./);
  assert.match(view(p, claim), /data-st-copy="1"/);
  refuse(p, claim, {type: 'bead', strand: 1, row: 2, x: 4}, 'a bead during the claim');
  const miss = play(p, claim, {type: 'pick', k: 2});
  assert.equal(miss.board.told, 'miss');
  assert.match(view(p, miss), /Blue needn’t cross that one\./);
  assert.equal(undoKeep(p, miss).board.told, 'miss', 'Undo doesn’t escape a wrong pick');
  const done = play(p, claim, {type: 'pick', k: 1});
  assert.ok(isSolved(p, done.board));
});

test('untangle with nothing forced: Done at no crossings solves at once', () => {
  const p = byId('strands-01');
  const a = play(p, freshAttempt(p), {type: 'bead', strand: 1, row: 3, x: 3}, {type: 'bead', strand: 1, row: 4, x: 3});
  assert.ok(isSolved(p, play(p, a, {type: 'done'}).board));
});

test('design: ends pull tight; Can’t only after a move; the middle strand certifies 1, 1, 1', () => {
  const p = byId('strands-11'), q = p.parameters;
  assert.ok(designPossible(q) && met(q, [0, 2, 4]) && met(q, [-1, 1, 3]));
  let a = freshAttempt(p);
  refuse(p, a, {type: 'cant'}, 'Can’t before a move');
  a = play(p, a, {type: 'end', strand: 1, w: 2});
  const wrong = play(p, a, {type: 'cant'});
  assert.equal(wrong.board.told, 'way');
  refuse(p, wrong, {type: 'cant'}, 'Can’t twice');
  assert.equal(undoKeep(p, wrong).board.told, 'way');
  assert.ok(isSolved(p, play(p, a, {type: 'end', strand: 2, w: 4}).board));

  const r = byId('strands-12');
  assert.ok(!designPossible(r.parameters));
  let b = play(r, freshAttempt(r), {type: 'end', strand: 1, w: 2}, {type: 'end', strand: 2, w: 4});
  assert.equal(nextHint(r, b).action.type, 'cant');
  assert.match(nextHint(r, b).text, /four copies apart or level.*Press Can’t\.$/);
  b = play(r, b, {type: 'cant'});
  refuse(r, b, {type: 'end', strand: 0, w: 1}, 'an end during the claim');
  assert.ok(isMiddle(b.board.w, 1) && !isMiddle(b.board.w, 0));
  const miss = play(r, b, {type: 'pick', strand: 0});
  assert.equal(miss.board.told, 'miss');
  assert.equal(undoKeep(r, miss).board.told, 'miss');
  const done = play(r, b, {type: 'pick', strand: 1});
  assert.ok(isSolved(r, done.board));
  assert.match(view(r, done), /st-gap outer/);
});

test('hints: the first is never a claim, each names its move, and the chain solves every puzzle', () => {
  for (const p of strands.puzzles.filter(p => p.band !== 'playground')) {
    assert.ok(!/Press (Done|Can’t)/.test(nextHint(p, freshAttempt(p)).text), `${p.id}: the first move hint is an attempt`);
    assert.ok(isSolved(p, solveByHints(p, freshAttempt(p)).board), `${p.id}: hints solve`);
  }
  const p = byId('strands-07'), a = freshAttempt(p), t0 = performance.now();
  for (let i = 0; i < 20; i++) nextHint(p, a);
  assert.ok(performance.now() - t0 < 100, 'hints are remembered');
});

test('forged saves are rejected', () => {
  const p = byId('strands-07'), b = freshAttempt(p).board;
  for (const board of [{...b, done: true}, {...b, claim: [1]}, {...b, s: [b.s[0], b.s[1].slice(2)]}, {...b, s: [b.s[0], b.s[1].map((x, r) => r ? x : 6)]}, {...b, told: 'way'}, {...b, extra: 0}]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  const d = byId('strands-06'), c = freshAttempt(d).board;
  for (const board of [{...c, claim: true, tried: true}, {...c, mid: 0}, {...c, w: [0, 1, 9]}, {...c, w: [0, 1, 2]}]) assert.equal(validBoard(d, board), false, JSON.stringify(board));
});

test('the playground: twists keep the crossings, ends re-lay one strand, never solved and no Hint', () => {
  const p = strands.puzzles.find(p => p.band === 'playground'), C = cylOf(p.parameters);
  assert.ok(mechanicFor(p).noHint(p));
  let a = freshAttempt(p);
  const count = b => crossCount(C, routeOf(C, b.s[0], b.w[0]), routeOf(C, b.s[1], b.w[1]));
  a = play(p, a, {type: 'end', strand: 1, w: 3});
  const before = count(a.board);
  assert.equal(before, 2, 'tight strands one turn and three turns cross twice');
  const t = play(p, a, {type: 'twist', k: -1});
  assert.equal(count(t.board), before);
  assert.deepEqual(t.board.w, [-1, 2]);
  refuse(p, a, {type: 'end', strand: 1, w: 9}, 'an end past the view');
  assert.ok(!isSolved(p, t.board));
});

test('every puzzle renders both views with its controls; handles sit apart where ends meet', () => {
  for (const p of strands.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="strands"/, p.id);
    assert.match(html, /pb-room/, p.id);
    assert.match(html, /pb-plane/, p.id);
    if (p.parameters.mode !== 'design') assert.match(html, /data-focus="st-bead-1-1"/, `${p.id}: focusable beads`);
    else assert.match(html, /aria-label="Red end"/, `${p.id}: end buttons`);
    assert.ok(!/fewest|[0-9] crossings?\b/i.test(html.replace(/<p class="sr-only"[^]*?<\/p>/g, '')), `${p.id}: no count or budget on screen`);
  }
  const C = cylOf(byId('strands-06').parameters), ws = [1, 1, 1];
  const xs = [0, 1, 2].map(i => handleAt(C, ws, i)[0]);
  assert.ok(xs[1] - xs[0] > .8 && xs[2] - xs[1] > .8, 'three ends on one B sit side by side');
});

function refuse(p, a, action, why) { assert.equal(move(p, a, action), null, `refuses ${why}`); }
