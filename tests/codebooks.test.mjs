// Signal Lanterns codebooks (dist/families/codebooks/codebooks.js): the
// changer's trick, which keys exist, designing and checking keys, claims,
// the fewest lanterns, playing the changer, partner rounds, saves and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {fooling, possible, producers, partnersOf} from '../dist/families/codebooks/codebooks.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/codebooks/codebooks.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const run = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const light = (picture, lanterns) => lanterns.map(lantern => ({type: 'lantern', picture, lantern}));

test('the changer meets in the middle of two close rows', () => {
  assert.deepEqual(fooling(['00', '11'], 1), {a: 0, b: 1, row: '10', fromA: [0], fromB: [1]});
  assert.equal(fooling(['000', '111'], 1), null);
  assert.equal(fooling(['0000', '1111'], 2).row, '1100');
  assert.equal(fooling(['00000', '11111'], 2), null);
  assert.deepEqual(producers(['000', '111'], '010', 1), [0]);
  assert.deepEqual(producers(['0000', '0011'], '0001', 1), [0, 1]);
});

test('which keys exist: the packing bound and its limit', () => {
  assert.equal(possible(2, 2, 3), false);
  assert.equal(possible(3, 2, 3), true);
  assert.equal(possible(4, 4, 3), false, '4 × 5 > 16');
  assert.equal(possible(4, 3, 3), false, '3 × 5 ≤ 16, yet no key');
  assert.equal(possible(5, 4, 3), true);
  assert.equal(possible(6, 8, 3), true);
  assert.equal(possible(4, 2, 5), false);
  assert.equal(possible(5, 2, 5), true);
});

test('designing a key: Check shows the trick, a working key solves', () => {
  const p = byId('codebooks-01');
  let a = run(p, freshAttempt(p), [...light(1, [0, 1]), {type: 'check'}]);
  assert.ok(!isSolved(p, a.board));
  const html = mechanicFor(p).render(p, a);
  assert.match(html, /class="cb-trick"/);
  assert.match(html, /turn over lantern 1/);
  assert.match(html, /Every row the receiver might see/);
  assert.equal([...html.matchAll(/class="cb-cell clash"/g)].length, 2, '100 and 110 come from both pictures');
  assert.equal(move(p, a, {type: 'check'}), null, 'no second check of the same key');
  a = run(p, a, [...light(1, [2]), {type: 'check'}]);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /The changer cannot fool this key/);
});

test('deciding: a true claim solves, a false one is refused, and claims need a check first', () => {
  const no = byId('codebooks-10');
  assert.equal(move(no, freshAttempt(no), {type: 'claim'}), null);
  const tried = run(no, freshAttempt(no), [{type: 'check'}]);
  assert.ok(isSolved(no, move(no, tried, {type: 'claim'}).board));
  const yes = byId('codebooks-08');
  const refused = run(yes, freshAttempt(yes), [{type: 'check'}, {type: 'claim'}]);
  assert.equal(refused.board.wrong, 5);
  assert.match(mechanicFor(yes).render(yes, refused), /cannot break every key with 5 lanterns/);
  assert.equal(move(yes, refused, {type: 'claim'}), null, 'the same claim again');
  const key = [[], [0, 1, 2], [2, 3, 4], [0, 1, 3, 4]].flatMap((ls, k) => light(k, ls));
  assert.ok(isSolved(yes, run(yes, freshAttempt(yes), [...key, {type: 'check'}]).board));
  assert.equal(nextHint(yes, freshAttempt(yes)).type, 'note', 'hints do not reveal the answer');
});

test('fewest lanterns: a working key at three and a claim at two', () => {
  const p = byId('codebooks-03');
  let a = run(p, freshAttempt(p), [{type: 'length', length: 4}, ...light(1, [0, 1, 2, 3]), {type: 'check'}]);
  assert.ok(!isSolved(p, a.board), 'four lanterns work but are not the fewest');
  a = run(p, a, [{type: 'length', length: 3}, ...light(1, [0, 1, 2]), {type: 'check'}]);
  assert.ok(!isSolved(p, a.board), 'still needs the claim below');
  a = run(p, a, [{type: 'length', length: 2}]);
  assert.equal(move(p, a, {type: 'claim'}), null, 'check a two-lantern key first');
  a = run(p, a, [{type: 'check'}, {type: 'claim'}]);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.found[3], ['000', '111']);
  const back = run(p, freshAttempt(p), [{type: 'length', length: 3}, ...light(1, [0, 1, 2]), {type: 'check'}, {type: 'length', length: 1}, {type: 'length', length: 3}]);
  assert.deepEqual(back.board.rows, ['000', '111'], 'a working key comes back with its length');
  assert.deepEqual(undo(run(p, freshAttempt(p), light(0, [0]))).board, freshAttempt(p).board);
});

test('two lit in every row: other rows fail the check', () => {
  const p = byId('codebooks-05');
  const a = run(p, freshAttempt(p), [...light(0, [0]), ...light(1, [1, 2, 3]), {type: 'check'}]);
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Each row needs exactly 2 lit lanterns/);
  assert.ok(isSolved(p, run(p, freshAttempt(p), [...light(0, [0, 1]), ...light(1, [2, 3]), {type: 'check'}]).board));
});

test('playing the changer: a row from two pictures wins, a safe key is claimed', () => {
  const p = byId('codebooks-02');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'cant'}), null, 'send something first');
  a = run(p, a, [{type: 'send'}]);
  assert.ok(!a.board.won, '0000 can only come from the square');
  assert.match(mechanicFor(p).render(p, a), /The receiver says .*square, and is sure/);
  assert.equal(move(p, a, {type: 'send'}), null, 'change the row before sending again');
  a = run(p, a, [{type: 'lantern', lantern: 1}, {type: 'lantern', lantern: 2}, {type: 'send'}]);
  assert.ok(a.board.won, '0110 can come from the triangle or from the square');
  assert.match(mechanicFor(p).render(p, a), /Fooled!/);
  a = run(p, a, [{type: 'next'}, {type: 'send'}]);
  assert.match(mechanicFor(p).render(p, a), /The receiver says/);
  a = run(p, a, [{type: 'cant'}]);
  assert.ok(a.board.won && a.board.cant === 'yes');
  a = run(p, a, [{type: 'next'}, {type: 'send'}, {type: 'cant'}]);
  assert.equal(a.board.cant, 'no', 'this key can be fooled');
  assert.ok(!a.board.won);
});

test('partners: collect every row, check once', () => {
  const p = byId('codebooks-06');
  assert.deepEqual(partnersOf('0100', 1), ['0011', '1001', '1010', '1011', '1111']);
  let a = freshAttempt(p);
  for (const row of partnersOf('0100', 1)) {
    a = run(p, a, [...row].flatMap((c, i) => c !== a.board.row[i] ? [{type: 'lantern', lantern: i}] : []));
    a = move(p, a, {type: 'add'});
  }
  assert.ok(isSolved(p, move(p, a, {type: 'check'}).board));
  const less = run(p, a, [{type: 'remove', row: '1111'}, {type: 'check'}]);
  assert.ok(!isSolved(p, less.board));
  assert.match(mechanicFor(p).render(p, less), /Missing:/);
  assert.deepEqual(run(p, less, [{type: 'next'}]).board, {round: 1, row: '0000', list: [], checked: false});
});

test('saves: forged keys, claims and wins are rejected', () => {
  const p = byId('codebooks-09');
  const a = run(p, freshAttempt(p), [{type: 'check'}]);
  assert.ok(validBoard(p, a.board));
  assert.equal(validBoard(p, {...a.board, found: {4: ['0000', '0111', '1011', '1100']}}), false, 'not a working key');
  assert.ok(validBoard(p, {...a.board, claims: [4]}), 'a true claim after a check');
  assert.equal(validBoard(p, {...a.board, claims: [4], tried: []}), false, 'a claim needs a check');
  const c = byId('codebooks-02');
  assert.equal(validBoard(c, {round: 0, row: '0000', sent: true, tried: true, cant: null, won: true}), false, '0000 does not fool the first key');
  assert.equal(validBoard(c, {round: 1, row: '0000', sent: false, tried: true, cant: 'yes', won: true}), true);
  assert.equal(validBoard(c, {round: 0, row: '0000', sent: false, tried: true, cant: 'yes', won: true}), false, 'the first key can be fooled');
});

test('the puzzles appear as a Codebooks group in Signal Lanterns', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const code = html.slice(html.indexOf('data-view-key="family-code"'));
  const family = code.slice(0, code.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Codebooks</h2>'));
  assert.match(family, /aria-label="Signal Lanterns, Codebooks, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="codebooks-/g)].length, 12);
});
