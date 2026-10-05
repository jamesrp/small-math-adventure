// Spring-water Jugs full jugs (dist/families/tank/tank.js): the levels two
// jugs fill, pouring and taking back, levels lighting on the line, That's all,
// every way to fill a level, the last-gap claims and their refusals, choosing
// jugs, the playground, hints, saves, rendering and the satchel group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {waysFor, fills, lastGap, pickAnswers} from '../dist/families/tank/tank.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/tank/tank.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const run = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const pour = (jug, n = 1) => Array(n).fill({type: 'pour', jug});
const back = jug => ({type: 'back', jug});
const level = target => ({type: 'target', target});
// Empty the tank if needed, set the line at t and pour the first way to fill it.
function fillTo(p, a, jugs, t) {
  if (a.board.counts.some(Boolean)) a = move(p, a, {type: 'empty'});
  if (a.board.target !== t) a = move(p, a, level(t));
  return run(p, a, waysFor(jugs, t)[0].flatMap((n, k) => pour(jugs[k], n)));
}

test('a level fills exactly when it is a sum of whole jugs', () => {
  assert.deepEqual(waysFor([3, 4], 10), [[2, 1]]);
  assert.deepEqual(waysFor([3, 4], 12), [[0, 3], [4, 0]]);
  assert.equal(waysFor([3, 4], 24).length, 3);
  assert.ok(!fills([3, 4], 5) && fills([3, 4], 6));
  assert.equal(lastGap([3, 4]), 5);
  assert.equal(lastGap([4, 5]), 11);
  assert.equal(lastGap([4, 7]), 17);
  assert.equal(lastGap([5, 7]), 23);
  assert.equal(lastGap([4, 6]), null, '4 and 6 only fill even levels');
  for (const [a, b] of [[2, 3], [3, 5], [3, 8], [5, 9]]) assert.equal(lastGap([a, b]), a * b - a - b);
});

test('pouring full jugs fills the tank, and the level lights on the line', () => {
  const p = byId('tank-01');
  let a = run(p, freshAttempt(p), pour(4, 3));
  assert.ok(!isSolved(p, a.board), '12 is over the line');
  assert.match(mechanicFor(p).render(p, a), /Over the line/);
  a = run(p, a, [back(4), ...pour(3)]);
  assert.equal(a.board.found.length, 0, '4 + 4 + 3 = 11 is not 10');
  a = run(p, a, [back(4), ...pour(3)]);
  assert.ok(isSolved(p, a.board), '3 + 3 + 4 = 10');
  assert.deepEqual(a.board.found, [{target: 10, counts: [2, 1]}]);
  assert.equal(move(p, a, back(3)), null, 'nothing after a solve');
  const one = move(p, freshAttempt(p), pour(3)[0]);
  assert.deepEqual(undo(one).board, freshAttempt(p).board);
  assert.equal(move(p, freshAttempt(p), back(3)), null, 'nothing to take back');
});

test('That’s all is refused while a level that can fill is dark', () => {
  const p = byId('tank-02');
  let a = move(p, freshAttempt(p), {type: 'all'});
  assert.equal(a.board.refusal.why, 'more');
  assert.match(mechanicFor(p).render(p, a), /Another level can be filled/);
  a = run(p, a, [level(3), ...pour(3)]);
  assert.equal(a.board.refusal, null, 'the next move clears the refusal');
  for (const t of [4, 6, 7, 8, 9, 10, 11, 12]) a = fillTo(p, a, [3, 4], t);
  assert.deepEqual(a.board.found.map(r => r.target), [3, 4, 6, 7, 8, 9, 10, 11, 12]);
  a = move(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Level 5, cannot be filled/);
});

test('every way: each new way joins the list once', () => {
  const p = byId('tank-03');
  let a = run(p, freshAttempt(p), pour(4, 3));
  assert.equal(a.board.found.length, 1);
  assert.equal(move(p, a, {type: 'all'}).board.refusal.why, 'way', 'one way is not all of them');
  a = run(p, a, [{type: 'empty'}, ...pour(3, 4)]);
  assert.equal(a.board.found.length, 2);
  assert.match(mechanicFor(p).render(p, a), /4 jugs of 3/);
  a = run(p, a, [{type: 'empty'}, ...pour(4, 3)]);
  assert.equal(a.board.found.length, 2, 'a way already listed is not added again');
  assert.ok(isSolved(p, move(p, a, {type: 'all'}).board));
});

test('the last gap is claimed with the run of filled levels after it', () => {
  const p = byId('tank-07');
  let a = run(p, freshAttempt(p), [level(11), {type: 'last'}]);
  assert.equal(a.board.refusal.why, 'show');
  assert.match(mechanicFor(p).render(p, a), /Show that every level after 11 can be filled/);
  const fill = (x, t) => fillTo(p, x, [4, 5], t);
  for (const t of [12, 13, 14]) a = fill(a, t);
  assert.equal(run(p, a, [level(11), {type: 'last'}]).board.refusal.why, 'show', 'three levels in a row are not enough for a 4-jug');
  a = fill(a, 15);
  assert.equal(run(p, a, [level(7), {type: 'last'}]).board.refusal.why, 'later');
  assert.equal(run(p, a, [level(10), {type: 'last'}]).board.refusal.why, 'filled');
  assert.equal(move(p, a, {type: 'never'}).board.refusal.why, 'evidence');
  a = run(p, a, [level(11), {type: 'last'}]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Level 11, cannot be filled/);
});

test('gaps never stop when the jugs share a factor', () => {
  const p = byId('tank-09');
  let a = move(p, freshAttempt(p), {type: 'never'});
  assert.equal(a.board.refusal.why, 'evidence');
  for (const t of [4, 6, 8, 10, 12, 14, 16]) a = fillTo(p, a, [4, 6], t);
  assert.equal(run(p, a, [level(15), {type: 'last'}]).board.refusal.why, 'later', '17 can’t be filled either');
  a = move(p, a, {type: 'never'});
  assert.ok(isSolved(p, a.board));
  const other = byId('tank-08');
  let b = freshAttempt(other);
  for (const t of other.parameters.targets.filter(t => fills([4, 7], t))) b = fillTo(other, b, [4, 7], t);
  assert.equal(move(other, b, {type: 'never'}).board.refusal.why, 'stops');
});

test('choosing jugs: putting one back pours its water out and darkens its levels', () => {
  const p = byId('tank-06');
  assert.deepEqual(pickAnswers(p.parameters), [[2, 3], [2, 5], [3, 4]]);
  assert.equal(move(p, freshAttempt(p), pour(2)[0]), null, 'no jug to pour before choosing');
  let a = run(p, freshAttempt(p), [{type: 'pick', jug: 2}, ...pour(2, 3)]);
  assert.deepEqual(a.board.found, [{target: 6, counts: [3]}], 'one jug can already fill a level');
  a = run(p, a, [{type: 'pick', jug: 4}, {type: 'empty'}, level(10), ...pour(2), ...pour(4, 2)]);
  assert.deepEqual(a.board.found.map(r => r.target), [6, 10]);
  assert.equal(move(p, a, {type: 'pick', jug: 5}), null, 'two jugs at most');
  a = move(p, a, {type: 'pick', jug: 4});
  assert.deepEqual(a.board.pick, [2]);
  assert.deepEqual(a.board.counts, [1], 'the 4s left the tank');
  assert.deepEqual(a.board.found, [{target: 6, counts: [3]}], 'and the level they helped fill went dark');
  a = move(p, a, {type: 'pick', jug: 3});
  assert.deepEqual(a.board.found, [{target: 6, counts: [3, 0]}], 'a new jug keeps the lit levels');
});

test('designing jugs for a last gap', () => {
  const p = byId('tank-11');
  assert.deepEqual(pickAnswers(p.parameters), [[3, 7], [4, 5]]);
  assert.deepEqual(pickAnswers(byId('tank-12').parameters), [[3, 8]], '(a − 1)(b − 1) = 14 leaves only 3 and 8 up to 12');
  assert.equal(move(p, freshAttempt(p), {type: 'last'}), null, 'no claim before two jugs');
  let a = run(p, freshAttempt(p), [{type: 'pick', jug: 2}, {type: 'pick', jug: 9}, {type: 'last'}]);
  assert.equal(a.board.refusal.why, 'filled', '2 + 9 = 11');
  a = run(p, a, [{type: 'pick', jug: 2}, {type: 'pick', jug: 9}, {type: 'pick', jug: 3}, {type: 'pick', jug: 7}]);
  for (const t of [12, 13, 14]) a = fillTo(p, a, [3, 7], t);
  assert.ok(isSolved(p, move(p, a, {type: 'last'}).board));
  assert.match(mechanicFor(p).render(p, freshAttempt(p)), /Last gap is 11/);
});

test('hints name jugs, a level, a pour or a claim, and finish every puzzle', () => {
  const p = byId('tank-01');
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).text, 'Pour one more 3.');
  a = run(p, a, pour(4, 3));
  assert.equal(nextHint(p, a).text, 'Take one 4 back out.');
  assert.match(nextHint(byId('tank-06'), freshAttempt(byId('tank-06'))).text, /Try the 2-jug/);
  const last = byId('tank-09');
  let b = freshAttempt(last);
  for (const t of [4, 6, 8, 10, 12, 14, 16]) b = fillTo(last, b, [4, 6], t);
  assert.deepEqual(nextHint(last, b).action, {type: 'never'});
  assert.match(nextHint(last, b).text, /multiple of 2/);
  const play = byId('tank-playground');
  assert.equal(nextHint(play, freshAttempt(play)).type, 'note');
  for (const q of pack.puzzles.filter(x => x.band !== 'playground')) {
    let c = freshAttempt(q);
    for (let i = 0; i < 300 && !isSolved(q, c.board); i++) c = move(q, c, nextHint(q, c).action);
    assert.ok(isSolved(q, c.board), `${q.id}: hints finish it`);
  }
});

test('saves are checked: records sit on the line, claims hold', () => {
  const p = byId('tank-02'), b = freshAttempt(p).board;
  assert.ok(validBoard(p, {...b, found: [{target: 7, counts: [1, 1]}]}));
  assert.equal(validBoard(p, {...b, found: [{target: 7, counts: [2, 1]}]}), false);
  assert.equal(validBoard(p, {...b, found: [{target: 5, counts: [1, 0.5]}]}), false);
  assert.equal(validBoard(p, {...b, done: {type: 'all'}}), false, 'That’s all saved only when true');
  assert.ok(validBoard(p, {...b, refusal: {claim: {type: 'all'}, why: 'more'}}));
  assert.equal(validBoard(p, {...b, refusal: {claim: {type: 'all'}, why: 'way'}}), false);
  assert.equal(validBoard(p, {...b, counts: [99, 0]}), false, 'the tank has a top');
  const last = byId('tank-07'), l = freshAttempt(last).board;
  assert.equal(validBoard(last, {...l, done: {type: 'last', target: 11}}), false, 'the last gap needs its run');
  assert.equal(validBoard(last, {...l, done: {type: 'never'}}), false);
  const choose = byId('tank-06'), c = freshAttempt(choose).board;
  assert.equal(validBoard(choose, {...c, pick: [2, 3, 4], counts: [0, 0, 0]}), false);
  assert.equal(validBoard(choose, {...c, pick: [3, 2], counts: [0, 0]}), false);
});

test('the playground fills any level and is never solved', () => {
  const p = byId('tank-playground');
  let a = run(p, freshAttempt(p), [level(8), ...pour(3), ...pour(5)]);
  assert.deepEqual(a.board.found, [{target: 8, counts: [1, 1]}]);
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /tank-targets many/);
  for (const type of ['all', 'last', 'never']) assert.equal(move(p, a, {type}), null);
});

test('the satchel shows a Full jugs group and a playground in the Spring-water Jugs', async () => {
  const merged = await loadPack();
  const html = libraryView({attempts: {}}, merged.puzzles);
  const jugs = html.slice(html.indexOf('data-view-key="family-jug"'));
  const section = jugs.slice(0, jugs.indexOf('</details>'));
  assert.match(section, /<h2>Full jugs<\/h2>/);
  assert.match(section, /data-id="tank-playground"/);
  assert.match(section, /data-id="tank-12"/);
  assert.match(section, /data-id="jug-01"/);
});
