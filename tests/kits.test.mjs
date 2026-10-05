// Odd-pebble Balance weight kits (dist/families/kits/kits.js): signed sums,
// placing weights on either pan, targets lighting when they balance, That's
// all and its refusals, every way to balance a target, choosing a kit, the
// playground, hints, saves, rendering and the satchel group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {placements, waysFor, reachable, pickAnswers} from '../dist/families/kits/kits.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/kits/kits.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const run = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const place = (weight, pan) => ({type: 'place', weight, pan});

test('a target balances exactly when it is a signed sum of the kit', () => {
  assert.equal(placements([1, 3]).length, 9);
  assert.equal(placements([1, 3, 9, 27]).length, 81);
  assert.deepEqual(waysFor([1, 3], 2), [{left: [1], right: [3]}]);
  assert.equal(waysFor([1, 3, 8], 4).length, 2);
  assert.ok(!reachable([1, 2], 4));
  assert.ok(!reachable([2, 3, 9], 13) && reachable([2, 3, 9], 14));
  // 1, 3, 9, 27 balance every target from 1 to 40 in exactly one way.
  for (let t = 1; t <= 40; t++) assert.equal(waysFor([1, 3, 9, 27], t).length, 1, `target ${t}`);
  assert.ok(!reachable([1, 3, 9, 27], 41));
});

test('a weight beside the target takes away, and the target lights when it balances', () => {
  const p = byId('kits-01');
  let a = move(p, freshAttempt(p), place(3, 'right'));
  assert.ok(!isSolved(p, a.board), '2 against 3 tips right');
  assert.match(mechanicFor(p).render(p, a), /Right side heavier/);
  a = move(p, a, place(1, 'left'));
  assert.ok(isSolved(p, a.board), '2 + 1 = 3');
  assert.deepEqual(a.board.found, [{target: 2, left: [1], right: [3]}]);
  assert.match(mechanicFor(p).render(p, a), /kit-equals/);
  assert.equal(move(p, a, place(1, 'off')), null, 'nothing after a solve');
});

test('several targets: tap a target, and each one stays lit once balanced', () => {
  const p = byId('kits-02');
  let a = run(p, freshAttempt(p), [place(1, 'right')]);
  assert.deepEqual(a.board.found.map(r => r.target), [1]);
  a = run(p, a, [{type: 'target', target: 4}, place(3, 'right')]);
  assert.deepEqual(a.board.found.map(r => r.target), [1, 4]);
  a = run(p, a, [{type: 'target', target: 3}, place(1, 'off')]);
  a = run(p, a, [{type: 'target', target: 2}, place(1, 'left')]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, freshAttempt(p)), /aria-label="Target 3"/);
  assert.equal(move(p, freshAttempt(p), {type: 'target', target: 5}), null, 'only listed targets');
});

test('That’s all is refused while a target that can balance is dark', () => {
  const p = byId('kits-03');
  let a = move(p, freshAttempt(p), {type: 'done'});
  assert.ok(a.board.wrong && !isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Another target balances/);
  a = run(p, a, [place(1, 'right')]);
  assert.equal(a.board.wrong, false, 'the next move clears the refusal');
  a = run(p, a, [{type: 'target', target: 2}, place(1, 'off'), place(2, 'right'), {type: 'target', target: 3}, place(1, 'right')]);
  assert.deepEqual(a.board.found.map(r => r.target), [1, 2, 3]);
  a = move(p, a, {type: 'done'});
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Target 4, cannot balance/);
});

test('every way: each new placement that balances joins the list once', () => {
  const p = byId('kits-06');
  let a = run(p, freshAttempt(p), [place(1, 'right'), place(3, 'right')]);
  assert.equal(a.board.found.length, 1);
  assert.equal(move(p, a, {type: 'done'}).board.wrong, true, 'one way is not all of them');
  a = run(p, a, [place(1, 'left'), place(3, 'left'), place(8, 'right')]);
  assert.equal(a.board.found.length, 2);
  assert.match(mechanicFor(p).render(p, a), /4 \+ 1 \+ 3 = 8/);
  a = run(p, a, [{type: 'clear'}, place(1, 'right'), place(3, 'right')]);
  assert.equal(a.board.found.length, 2, 'a way already listed is not added again');
  assert.ok(isSolved(p, move(p, a, {type: 'done'}).board));
  assert.equal(byId('kits-09').solution.ways.length, 1, '1, 3, 9 make 5 one way');
});

test('choosing a kit: the weight leaves the pans and its records go dark', () => {
  const p = byId('kits-07');
  assert.deepEqual(pickAnswers(p.parameters), [[9]]);
  let a = run(p, freshAttempt(p), [{type: 'pick', weight: 8}, place(8, 'right'), place(3, 'left')]);
  assert.deepEqual(a.board.found.map(r => r.target), [5]);
  a = move(p, a, {type: 'pick', weight: 9});
  assert.deepEqual(a.board.pick, [9], 'one new weight: a second choice replaces the first');
  assert.deepEqual(a.board.right, [], '8 left the pans');
  assert.deepEqual(a.board.found, [], 'and the target it balanced went dark');
  const two = byId('kits-05');
  let b = run(two, freshAttempt(two), [{type: 'pick', weight: 2}, {type: 'pick', weight: 5}]);
  assert.equal(move(two, b, {type: 'pick', weight: 6}), null, 'two weights at most');
  b = run(two, b, [{type: 'pick', weight: 5}, {type: 'pick', weight: 6}]);
  assert.deepEqual(b.board.pick, [2, 6]);
  assert.equal(move(two, freshAttempt(two), place(2, 'right')), null, 'no weight to place before choosing');
});

test('a long range of choices is a stepper', () => {
  const p = byId('kits-12');
  const html = mechanicFor(p).render(p, freshAttempt(p));
  assert.match(html, /kit-stepper/);
  assert.match(html, /No weight chosen/);
  let a = move(p, freshAttempt(p), {type: 'pick', weight: 14});
  assert.deepEqual(a.board.pick, [14]);
  assert.match(mechanicFor(p).render(p, a), /&quot;weight&quot;:15/);
  a = move(p, a, {type: 'pick', weight: 27});
  assert.deepEqual(a.board.pick, [27]);
});

test('hints name a weight, a target or That’s all, and finish every puzzle', () => {
  const p = byId('kits-11');
  let a = freshAttempt(p);
  assert.deepEqual(nextHint(p, a), {type: 'move', action: place(27, 'right'), text: 'Put 27 on the other pan.'});
  a = move(p, a, place(27, 'right'));
  assert.equal(nextHint(p, a).text, 'Put 9 beside the target.');
  const which = byId('kits-03');
  let w = run(which, freshAttempt(which), [place(1, 'right'), {type: 'target', target: 2}, place(1, 'off'), place(2, 'right'), {type: 'target', target: 3}, place(1, 'right')]);
  assert.equal(nextHint(which, w).action.type, 'done');
  const choose = byId('kits-07');
  assert.match(nextHint(choose, freshAttempt(choose)).text, /Try weight 9/);
  assert.deepEqual(pickAnswers(byId('kits-12').parameters), [[25]], 'not the times-three guess, 24');
  const play = byId('kits-playground');
  assert.equal(nextHint(play, freshAttempt(play)).type, 'note');
  for (const q of pack.puzzles.filter(x => x.band !== 'playground')) {
    let b = freshAttempt(q);
    for (let i = 0; i < 200 && !isSolved(q, b.board); i++) b = move(q, b, nextHint(q, b).action);
    assert.ok(isSolved(q, b.board), `${q.id}: hints finish it`);
  }
});

test('saves are checked: records must balance with the kit', () => {
  const p = byId('kits-02'), b = freshAttempt(p).board;
  assert.ok(validBoard(p, {...b, found: [{target: 2, left: [1], right: [3]}]}));
  assert.equal(validBoard(p, {...b, found: [{target: 2, left: [], right: [3]}]}), false);
  assert.equal(validBoard(p, {...b, found: [{target: 2, left: [1], right: [9]}]}), false);
  assert.equal(validBoard(p, {...b, left: [3, 1]}), false);
  assert.equal(validBoard(p, {...b, done: true}), false);
  const which = byId('kits-03'), w = freshAttempt(which).board;
  assert.equal(validBoard(which, {...w, done: true}), false, 'That’s all saved only when true');
  assert.ok(validBoard(which, {...w, wrong: true}));
  const choose = byId('kits-07'), c = freshAttempt(choose).board;
  assert.equal(validBoard(choose, {...c, pick: [8, 9]}), false);
  assert.equal(validBoard(choose, {...c, pick: [3]}), false, 'a fixed weight is not a choice');
  const one = move(p, freshAttempt(p), place(3, 'right'));
  assert.deepEqual(undo(one).board, b);
});

test('the playground lights any target and is never solved', () => {
  const p = byId('kits-playground');
  let a = run(p, freshAttempt(p), [{type: 'pick', weight: 9}, {type: 'target', target: 13}, place(1, 'right'), place(3, 'right'), place(9, 'right')]);
  assert.deepEqual(a.board.found.map(r => r.target), [13]);
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /kit-targets many/);
});

test('the satchel shows a Weight kits group and a playground in the Odd-pebble Balance', async () => {
  const merged = await loadPack();
  const html = libraryView({attempts: {}}, merged.puzzles);
  const balance = html.slice(html.indexOf('data-view-key="family-weigh"'));
  const section = balance.slice(0, balance.indexOf('</details>'));
  assert.match(section, /<h2>Weight kits<\/h2>/);
  assert.match(section, /data-id="kits-playground"/);
  assert.match(section, /data-id="kits-12"/);
});
