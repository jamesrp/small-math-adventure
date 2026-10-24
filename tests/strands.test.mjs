// Strands (Week 75, twists on a cylinder) on the shared portal board: the
// cylinder, crossings between rows, the fewest for two windings, tight
// strands, the twist, untangling with one claim (Done, the copies blue must
// cross, That's all), three windings for crossing targets with Can't on an
// attempt and the strand strictly in the middle, hints, Undo keeping a
// refusal, forged saves, the playground and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {cylOf, routeOf, fewest, levelsBetween, crossCount, crossings, apart, barriers, layout, twistShift, pairCounts, met, designPossible, isMiddle, ready, handleAt} from '../dist/families/strands/strands.js';
import {loadPack} from '../scripts/packs.mjs';

const strands = JSON.parse(await readFile(new URL('../dist/families/strands/strands.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => strands.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const undoKeep = (p, a) => { const back = undo(a); return {...back, board: mechanicFor(p).carry(p, a.board, back.board)}; };
const solveByHints = (p, a) => { for (let i = 0; i < 80 && !isSolved(p, a.board); i++) a = play(p, a, nextHint(p, a).action); return a; };
// Hints up to the claim: the board at the fewest, before Done.
const toFewest = (p, a) => { while (nextHint(p, a).action.type !== 'done') a = play(p, a, nextHint(p, a).action); return a; };
const ui = (p, payload) => mechanicFor(p).ui(p, payload);

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

test('untangle: one claim, Done with the copies tapped, checked only when it is sent', () => {
  const p = byId('strands-04');
  mechanicFor(p).reset(p);
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'move');
  refuse(p, a, {type: 'bead', strand: 1, row: 2, x: 2}, 'a bead on red’s spot');
  refuse(p, a, {type: 'pick', k: 1}, 'a pick on its own');
  // Done only starts the claim: nothing is checked yet.
  ui(p, {claim: JSON.stringify(a.board)});
  let html = view(p, a);
  assert.match(html, /Tap each red copy that blue must cross, then press That’s all\./);
  assert.match(html, /data-st-copy="1"/);
  assert.ok(!/data-st-bead="1,1"[^>]*role="button"/.test(html), 'beads rest during the claim');
  ui(p, {pick: 1});
  html = view(p, a);
  assert.match(html, /data-st-copy="1"[^>]*aria-pressed="true"/);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;done&quot;,&quot;copies&quot;:\[1\]\}"/, 'That’s all sends the copies tapped');
  // Sent with crossings to spare, even with the right copy: refused, and Done waits for a move.
  const told = play(p, a, {type: 'done', copies: [1]});
  assert.equal(told.board.told, 'fewer');
  assert.ok(!isSolved(p, told.board));
  html = view(p, told);
  assert.match(html, /There is a way with fewer\./);
  assert.match(html, /data-focus="st-claim"[^>]*disabled/, 'Done waits for a move');
  assert.ok(html.indexOf('st-told') < html.indexOf('st-stage'), 'the feedback line sits above the boards');
  refuse(p, told, {type: 'done', copies: [1]}, 'a claim again with nothing moved');
  assert.equal(undoKeep(p, told).board.told, 'fewer', 'Undo keeps the refusal');
  // At the fewest, after several moves: the wrong copies, or none, are refused and kept.
  a = toFewest(p, a);
  assert.ok(a.moves >= 3, 'several moves from the start');
  for (const [copies, why, text] of [[[2], 'copies', /Those aren’t the copies blue must cross\./], [[0, 1], 'copies', /Those aren’t/], [[], 'none', /Blue must cross some copy of red\./]]) {
    const miss = play(p, a, {type: 'done', copies});
    assert.equal(miss.board.told, why);
    assert.match(view(p, miss), text);
    refuse(p, miss, {type: 'done', copies: [1]}, 'a claim again with nothing moved');
    assert.equal(undoKeep(p, miss).board.told, why, 'Undo doesn’t escape a wrong claim');
  }
  const done = play(p, a, {type: 'done', copies: [1]});
  assert.ok(isSolved(p, done.board));
  assert.match(view(p, done), /st-strand red copy wall/);  mechanicFor(p).reset(p);
});

test('untangle with nothing forced: Done with no copies solves', () => {
  const p = byId('strands-01');
  mechanicFor(p).reset(p);
  const a = play(p, freshAttempt(p), {type: 'bead', strand: 1, row: 3, x: 3}, {type: 'bead', strand: 1, row: 4, x: 3});
  assert.match(view(p, a), /data-action="expansion-move" data-move="\{&quot;type&quot;:&quot;done&quot;,&quot;copies&quot;:\[\]\}"[^>]*>Done</, 'Done sends the empty certificate immediately');
  assert.doesNotMatch(view(p, a), /data-focus="st-claim"|>That’s all</);
  assert.equal(nextHint(p, a).text, 'No crossings are left. Press Done.');
  assert.equal(play(p, a, {type: 'done', copies: [0]}).board.told, 'copies');
  assert.ok(isSolved(p, play(p, a, {type: 'done', copies: []}).board));
});

test('design: ends pull tight; Can’t is one claim on an attempt, and only the strand strictly in the middle certifies 1, 1, 1', () => {
  const p = byId('strands-11'), q = p.parameters;
  assert.ok(designPossible(q) && met(q, [0, 2, 4]) && met(q, [-1, 1, 3]));
  let a = freshAttempt(p);
  refuse(p, a, {type: 'cant', strand: 1}, 'Can’t before a move');
  a = play(p, a, {type: 'end', strand: 1, w: 2});
  const two = play(p, a, {type: 'cant', strand: 1});
  assert.equal(two.board.told, 'two', 'Can’t wants two pairs right with the ends apart');
  assert.match(view(p, two), /First get two pairs right, with every end at a different B\./);
  refuse(p, two, {type: 'cant', strand: 0}, 'Can’t twice');
  assert.equal(undoKeep(p, two).board.told, 'two');
  assert.ok(isSolved(p, play(p, a, {type: 'end', strand: 2, w: 4}).board));
  // Where there is a way, Can't on an attempt is told so.
  const s6 = byId('strands-06');
  const way = play(s6, play(s6, freshAttempt(s6), {type: 'end', strand: 0, w: 1}, {type: 'end', strand: 1, w: 2}, {type: 'end', strand: 2, w: -1}), {type: 'cant', strand: 0});
  assert.equal(way.board.told, 'way');

  const r = byId('strands-12'), rq = r.parameters;
  assert.ok(!designPossible(rq));
  mechanicFor(r).reset(r);
  // An end moved and back, or two ends level: no attempt, so no strand certifies.
  const back = play(r, freshAttempt(r), {type: 'end', strand: 0, w: 1}, {type: 'end', strand: 0, w: 0});
  const level = play(r, freshAttempt(r), {type: 'end', strand: 2, w: 2});
  for (const b of [back, level]) for (const i of [0, 1, 2]) {
    const after = play(r, b, {type: 'cant', strand: i});
    assert.equal(after.board.told, 'two');
    assert.ok(!isSolved(r, after.board), `Can’t at ${b.board.w} with strand ${i} doesn’t solve`);
  }
  assert.ok(!isMiddle([0, 0, 2], 1) && !isMiddle([0, 0, 0], 1), 'a strand level with an end isn’t in the middle');
  let b = play(r, freshAttempt(r), {type: 'end', strand: 1, w: 2}, {type: 'end', strand: 2, w: 4});
  assert.ok(ready(rq, b.board.w));
  assert.equal(nextHint(r, b).action.type, 'cant');
  assert.match(nextHint(r, b).text, /^Blue’s end is between the others: two copies from red’s and two copies from green’s\. So red and green ends are four copies apart: they cross three times, never once\. Press Can’t and tap blue\.$/);
  ui(r, {claim: JSON.stringify(b.board)});
  assert.match(view(r, b), /Tap the strand whose end is in the middle\./);
  assert.match(view(r, b), /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;strand&quot;:1\}"/);
  const miss = play(r, b, {type: 'cant', strand: 0});
  assert.equal(miss.board.told, 'miss');
  for (const i of [0, 1, 2]) refuse(r, miss, {type: 'cant', strand: i}, 'Can’t again with nothing moved');
  assert.equal(undoKeep(r, miss).board.told, 'miss', 'Undo keeps a wrong strand refused');
  refuse(r, b, {type: 'pick', strand: 1}, 'a pick on its own');
  const done = play(r, b, {type: 'cant', strand: 1});
  assert.ok(isSolved(r, done.board));
  const html = view(r, done);
  assert.equal((html.match(/st-gap inner/g) || []).length, 2, 'both inner gaps are drawn');
  assert.match(html, /st-gap outer/);
  assert.equal(validBoard(r, {w: [0, 0, 0], tried: true, told: null, mid: 1}), false, 'a forged middle without the attempt');
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
  for (const board of [{...b, done: true}, {...b, claim: [1]}, {...b, told: 'copies'}, {...b, s: [b.s[0], b.s[1].slice(2)]}, {...b, s: [b.s[0], b.s[1].map((x, r) => r ? x : b.s[0][0] + 4)]}, {...b, told: 'way'}, {...b, extra: 0}]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  const d = byId('strands-06'), c = freshAttempt(d).board;
  for (const board of [{...c, claim: true, tried: true}, {...c, mid: 0}, {...c, w: [0, 1, 9]}, {...c, w: [0, 1, 2]}, {...c, tried: true, told: 'miss'}, {...c, tried: true, told: 'way'}]) assert.equal(validBoard(d, board), false, JSON.stringify(board));
  const r = byId('strands-12'), e = freshAttempt(r).board;
  for (const board of [{...e, tried: true, mid: 1}, {...e, tried: true, w: [0, 0, 2], mid: 1}, {...e, tried: true, told: 'miss'}, {...e, tried: true, w: [0, 2, 4], mid: 0}, {...e, tried: true, w: [0, 2, 4], told: 'way'}]) assert.equal(validBoard(r, board), false, JSON.stringify(board));
  assert.equal(validBoard(r, {...e, tried: true, w: [0, 2, 4], mid: 1}), true, 'the middle strand on an attempt');
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
    mechanicFor(p).reset(p);
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

test('How to play says each thing once, and never names the certificate', () => {
  for (const p of strands.puzzles.filter(p => p.parameters.mode !== 'playground')) {
    const sentences = text => text.split(/(?<=\.)\s+/).filter(Boolean);
    const repeated = sentences(p.objective).filter(s => p.controls.includes(s));
    assert.deepEqual(repeated, [], `${p.id}: the objective and the controls share no sentence`);
    assert.doesNotMatch(p.objective + p.controls + p.rules.join(' '), /middle/, `${p.id}: no certificate in How to play`);
  }
  assert.match(byId('strands-11').controls, /press Can’t and tap a strand\./);
  assert.match(byId('strands-07').controls, /tap each copy of red that blue has to cross/);
});

test('Done or Can’t, and Back in its place, carry one data-toggle slot', () => {
  const u = byId('strands-07');
  mechanicFor(u).reset(u);
  const a = freshAttempt(u);
  assert.match(view(u, a), /data-focus="st-claim" data-toggle="st-claim"/, 'Done');
  ui(u, {claim: JSON.stringify(a.board)});
  assert.match(view(u, a), /data-focus="st-back" data-toggle="st-claim"/, 'Back');
  mechanicFor(u).reset(u);
  const d = byId('strands-12');
  mechanicFor(d).reset(d);
  assert.match(view(d, freshAttempt(d)), /data-focus="st-claim" data-toggle="st-claim"/, 'Can’t');
  mechanicFor(d).reset(d);
});
