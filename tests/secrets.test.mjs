// Signal Lanterns slippery secrets (dist/families/secrets/secrets.js): the
// slippery answers, scores, the fewest tests, asking and testing rounds,
// claims, planned questions and tests, saves, rendering and the satchel group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {score, need, words, answer, scoreFor, fitting, planAnswers, testAnswers, workingSets} from '../dist/families/secrets/secrets.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/secrets/secrets.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const run = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const ask = (p, a, pick) => run(p, a, [...pick.map(item => ({type: 'item', item})), {type: 'ask'}]);
const setRow = (p, a, row) => run(p, a, [...row].flatMap((c, i) => c !== a.board.row[i] ? [{type: 'lantern', lantern: i}] : []));
const doTest = (p, a, row) => run(p, setRow(p, a, row), [{type: 'test'}]);

test('a score counts matching places, lit or dark', () => {
  assert.equal(score('0000', '0000'), 4);
  assert.equal(score('0101', '0011'), 2);
  assert.equal(score('111', '000'), 0);
});

test('the fewest tests: n for two to four lanterns, four for five, one more to score n', () => {
  assert.deepEqual([2, 3, 4, 5].map(n => need(n, false, words(n))), [2, 3, 4, 4]);
  assert.deepEqual([2, 3, 4, 5].map(n => need(n, true, words(n))), [3, 4, 5, 5]);
});

test('the slippery answer keeps the harder side', () => {
  const all = [0, 1, 2, 3, 4, 5, 6, 7];
  assert.equal(answer(all, [0]), false, 'one shape asked: no keeps seven');
  assert.equal(answer(all, [0, 1, 2, 3, 4]), true, 'five asked: yes keeps five');
  assert.equal(answer(all, all), true, 'everything asked: only yes fits');
  // After all dark on three lanterns, the secret keeps the three rows with one lit.
  assert.equal(scoreFor(3, false, words(3), '000'), 1, 'two lit or one lit tie; the lower score wins the tie');
  assert.deepEqual(fitting(3, [{row: '000', score: 1}]), ['011', '101', '110']);
  // A test scores n only when it is the one secret left.
  assert.notEqual(scoreFor(3, true, words(3), '101'), 3);
  assert.equal(scoreFor(3, true, ['101'], '101'), 3);
});

test('asking: halving wins, asking one at a time loses, shapes fade', () => {
  const p = byId('secrets-02');
  let a = ask(p, freshAttempt(p), [0, 1, 2, 3]);
  const live = a.board.asked[0].yes ? [0, 1, 2, 3] : [4, 5, 6, 7];
  let html = mechanicFor(p).render(p, a);
  assert.equal([...html.matchAll(/class="sx-item out/g)].length, 4, 'four shapes fade');
  assert.equal(move(p, a, {type: 'item', item: a.board.asked[0].yes ? 4 : 0}), null, 'faded shapes cannot be chosen');
  a = ask(p, a, live.slice(0, 2));
  const two = a.board.asked[1].yes ? live.slice(0, 2) : live.slice(2);
  a = ask(p, a, [two[0]]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /It’s/);

  let b = freshAttempt(p);
  for (const item of [0, 1, 2]) b = ask(p, b, [item]);
  assert.ok(!isSolved(p, b.board));
  html = mechanicFor(p).render(p, b);
  assert.match(html, /all fit every answer/, 'a lost round shows what still fits');
  assert.equal(move(p, b, {type: 'item', item: 3}), null, 'the round is over');
  b = run(p, b, [{type: 'again'}]);
  assert.deepEqual(b.board.asked, []);
  assert.ok(b.board.tried.includes(3));
});

test('claims: only after a round, refused when a way exists', () => {
  const p = byId('secrets-04');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'claim'}), null);
  a = ask(p, a, [0, 1, 2, 3]);
  const half = a.board.asked[0].yes ? [0, 1] : [4, 5];
  a = ask(p, a, half);
  assert.match(mechanicFor(p).render(p, a), /both fit every answer/);
  a = run(p, a, [{type: 'claim'}]);
  assert.ok(isSolved(p, a.board), 'two questions can’t always find one of eight');

  const f = byId('secrets-07');
  let b = run(f, freshAttempt(f), [{type: 'budget', budget: 5}]);
  b = ask(f, b, [0]);
  for (let i = 1; i < 5; i++) b = ask(f, b, [b.board.asked.length + 10]);
  b = run(f, b, [{type: 'claim'}]);
  assert.equal(b.board.wrong, 5, 'five questions can always find one of twenty');
  assert.match(mechanicFor(f).render(f, b), /There is a way that always works with 5 questions/);
});

test('testing: a sure name wins, a guess loses and shows two that fit', () => {
  const p = byId('secrets-05');
  let a = freshAttempt(p);
  for (const t of ['000', '100', '010']) a = doTest(p, a, t);
  const left = fitting(3, a.board.tests);
  assert.equal(left.length, 1);
  a = run(p, setRow(p, a, left[0]), [{type: 'name'}]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /That’s the secret/);

  let b = doTest(p, freshAttempt(p), '000');
  b = run(p, b, [{type: 'name'}]);
  assert.ok(!isSolved(p, b.board));
  const html = mechanicFor(p).render(p, b);
  assert.match(html, /That row doesn’t fit every score/);
  assert.match(html, /These both do/);
  assert.equal(move(p, b, {type: 'test'}), null, 'no tests after naming');
  assert.equal(nextHint(p, b).action.type, 'again');
});

test('scoring 3: the round ends on a 3 or when the tests run out', () => {
  const p = byId('secrets-11');
  let a = run(p, freshAttempt(p), [{type: 'budget', budget: 3}]);
  for (const t of ['000', '100', '010']) a = doTest(p, a, t);
  assert.ok(a.board.tried.includes(3) && !a.board.wins[3], 'three tests never force a 3');
  a = run(p, a, [{type: 'claim'}, {type: 'budget', budget: 4}]);
  for (const t of ['000', '100', '010']) a = doTest(p, a, t);
  a = doTest(p, a, fitting(3, a.board.tests)[0]);
  assert.ok(isSolved(p, a.board));
  assert.equal(mechanicFor(p).render(p, freshAttempt(p)).includes('That’s the secret'), false, 'no naming when the goal is a 3');
});

test('planned questions: each thing gets a row of answers', () => {
  const p = byId('secrets-08');
  let a = freshAttempt(p);
  const plan = [[0, 1, 2, 3], [0, 1, 4, 5], [0, 2, 4, 6]];
  plan.forEach((pick, k) => { a = run(p, a, pick.map(item => ({type: 'item', question: k, item}))); });
  assert.equal(planAnswers(p.parameters, a.board.picks).list.length, 1);
  let html = mechanicFor(p).render(p, a);
  assert.equal([...html.matchAll(/class="sx-mini"/g)].length, 8, 'a lantern row under every shape');
  a = run(p, a, [{type: 'ask'}]);
  assert.ok(isSolved(p, a.board));
  let b = run(p, freshAttempt(p), [{type: 'item', item: 0}, {type: 'ask'}]);
  assert.ok(!isSolved(p, b.board));
  html = mechanicFor(p).render(p, b);
  assert.match(html, /all fit every answer/);
  b = run(p, b, [{type: 'again'}]);
  assert.deepEqual(b.board.picks[0], [0], 'Again keeps the questions');
});

test('planned tests: every secret needs its own scores', () => {
  assert.equal(workingSets(3, 3).length, 32);
  assert.equal(workingSets(4, 3).length, 0, 'three planned tests never do four lanterns');
  assert.deepEqual(testAnswers(5, ['00000', '10000', '01000', '00100']).sort(), ['00001', '00010'], 'all dark and three single lanterns leave lanterns 4 and 5');
  const p = byId('secrets-13');
  const plan = (a, rows) => run(p, a, rows.flatMap((r, j) => [...r].flatMap((c, i) => c !== a.board.rows[j][i] ? [{type: 'lantern', test: j, lantern: i}] : [])));
  let a = run(p, plan(freshAttempt(p), ['00000', '10000', '01000', '00100']), [{type: 'ask'}]);
  assert.ok(!isSolved(p, a.board));
  let html = mechanicFor(p).render(p, a);
  assert.match(html, /These both fit every score/);
  assert.equal([...html.matchAll(/<td class="sx-score">\d<\/td>/g)].length, 4, 'every test shows its score');
  assert.equal(move(p, a, {type: 'lantern', test: 1, lantern: 0}), null, 'no changes after testing');
  a = run(p, a, [{type: 'again'}]);
  assert.deepEqual(a.board.rows, ['00000', '10000', '01000', '00100'], 'Again keeps the tests');
  a = run(p, plan(a, ['10000', '01000', '00100', '00010']), [{type: 'ask'}]);
  assert.ok(isSolved(p, a.board), 'one lantern in each of four tests tells all 32 secrets apart');
  assert.match(mechanicFor(p).render(p, a), /Only this fits every score/);
  assert.equal(nextHint(p, freshAttempt(p)).action.type, 'lantern');
});

test('saves: forged answers, scores, wins and claims are rejected', () => {
  const p = byId('secrets-06');
  let a = doTest(p, freshAttempt(p), '000');
  assert.ok(validBoard(p, a.board));
  assert.equal(validBoard(p, {...a.board, tests: [{row: '000', score: 3}]}), false, 'the secret did not give that score');
  a = run(p, a, [{type: 'name'}]);
  assert.ok(validBoard(p, {...a.board, claims: [2]}), 'a true claim after a round');
  assert.equal(validBoard(p, {...a.board, claims: [2], tried: []}), false, 'a claim needs a round');
  assert.equal(validBoard(p, {...a.board, wins: {2: {tests: [{row: '000', score: 2}], named: '100'}}}), false, 'not a winning round');
  const q = byId('secrets-01');
  const b = freshAttempt(q).board;
  assert.equal(validBoard(q, {...b, asked: [{pick: [0], yes: true}]}), false, 'the secret would have said no');
  assert.ok(validBoard(q, {...b, asked: [{pick: [0], yes: false}]}));
});

test('no Undo while playing for the secret, so answers can’t be taken back', () => {
  for (const id of ['secrets-01', 'secrets-05', 'secrets-11']) assert.ok(mechanicFor(byId(id)).noUndo(byId(id)));
  for (const id of ['secrets-08', 'secrets-09']) assert.equal(mechanicFor(byId(id)).noUndo(byId(id)), false);
});

test('the puzzles appear as a Slippery secrets group in Signal Lanterns', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const code = html.slice(html.indexOf('data-view-key="family-code"'));
  const family = code.slice(0, code.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Codebooks</h2>') < family.indexOf('<h2>Slippery secrets</h2>'));
  assert.match(family, /aria-label="Signal Lanterns, Slippery secrets, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="secrets-/g)].length, 13);
});
