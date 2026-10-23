import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from '../scripts/packs.mjs';
import {libraryView} from '../dist/caravan-ui.js';
import calibrateModule, {machinesOf, requestsOf, requestLengths, needed, answer, play, winningRequest, buildAnswers, everyAnswers, repairAnswers, stretchExtremes, fmt, fmtHtml} from '../dist/families/calibrate/calibrate.js';

const pack = JSON.parse(await readFile(new URL('../dist/families/calibrate/calibrate.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const go = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${JSON.stringify(action)} from ${JSON.stringify(x.board)}`); return next; }, a);
const view = (p, a) => mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
const back = (p, a) => undoPress(p, a, x => view(p, x));
const send = (...strips) => [...strips.map(strip => ({type: 'strip', strip})), {type: 'send'}];

test('machines, requests and the lengths a kit can make', () => {
  const q6 = byId('calibrate-06').parameters, q8 = byId('calibrate-08').parameters;
  assert.equal(machinesOf(q6).length, 21);
  assert.equal(requestsOf(q6).length, 4, 'one strip at a time');
  assert.equal(requestsOf(q8).length, 10, 'one or two strips');
  assert.deepEqual(requestLengths(q8), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('the fewest requests that always work', () => {
  const q6 = byId('calibrate-06').parameters, q8 = byId('calibrate-08').parameters;
  assert.equal(needed(q6, machinesOf(q6), 1), Infinity, 'no single strip separates 21 machines');
  assert.equal(needed(q6, machinesOf(q6), 2), 2);
  assert.equal(needed(q8, machinesOf(q8), 1), 1);
  assert.deepEqual(winningRequest(q8, machinesOf(q8), 1), ['B', 'C'], 'the shortest join that works: 7');
});

test('the slippery machine answers to keep the most doubt', () => {
  const q6 = byId('calibrate-06').parameters;
  const [r, kept] = answer(q6, machinesOf(q6), 2, 1);
  assert.equal(r, 8); assert.deepEqual(kept, [[1, 6], [2, 4], [3, 2]], 'one of the reports that keeps three machines');
  assert.deepEqual(play(q6, [['A'], ['A']]).alive.length, 3, 'the same strip again tells nothing new');
  assert.deepEqual(play(q6, [['A'], ['B']]).alive, [[1, 6]]);
  const q1 = byId('calibrate-01').parameters;
  assert.ok(new Set(['A', 'B', 'C', 'D'].map(s => play(q1, [[s]]).alive[0][1])).size > 1, 'the extra is not always the same');
  const q8 = byId('calibrate-08').parameters;
  assert.ok(play(q8, [['D']]).alive.length >= 2, 'one strip 6 long leaves two machines');
  assert.equal(play(q8, [['B', 'C']]).alive.length, 1);
});

test('a request round: send, set the dials, name; a lost round shows two machines and has no Undo', () => {
  const p = byId('calibrate-06');
  let a = go(p, freshAttempt(p), [...send('A'), ...send('B')]);
  assert.equal(a.history.length, 0, 'no Undo in a request round');
  assert.deepEqual(a.board.dials, {c: null, e: null}, 'the dials start unset');
  assert.doesNotMatch(view(p, a), /class="cb-tick"/);
  assert.equal(move(p, a, {type: 'name'}), null, 'no naming with unset dials');
  const miss = go(p, a, [{type: 'dial', which: 'c', value: 3}, {type: 'dial', which: 'e', value: 5}]);
  assert.equal(move(p, miss, {type: 'name'}), null, 'no naming dials that miss a report');
  assert.match(view(p, miss), /disabled>That’s the machine</);
  a = go(p, a, [{type: 'dial', which: 'c', value: 1}, {type: 'dial', which: 'e', value: 6}]);
  assert.equal((view(p, a).match(/class="cb-tick"/g) || []).length, 2, 'the dials are compared with every report');
  a = go(p, a, [{type: 'name'}]);
  assert.ok(isSolved(p, a.board));
  let lost = go(p, freshAttempt(p), [...send('A'), ...send('A')]);
  assert.equal(lost.board.named, null, 'the round is over by itself');
  assert.match(view(p, lost), /These both fit every report:/);
  assert.equal((view(p, lost).match(/<figcaption class="cb-item">/g) || []).length, 2, 'two machines, each drawn');
  assert.equal((view(p, lost).match(/class="cb-tick"/g) || []).length, 4, 'each on both report rows, every row ticked');
  assert.equal(move(p, lost, {type: 'name'}), null);
  assert.deepEqual(go(p, lost, [{type: 'again'}]).board, freshAttempt(p).board);
  assert.equal(move(p, go(p, freshAttempt(p), [{type: 'dial', which: 'c', value: 2}, {type: 'dial', which: 'e', value: 3}]), {type: 'name'}), null, 'no naming before a request');
  const [c, e] = play(p.parameters, [['A']]).alive[0];
  lost = go(p, freshAttempt(p), [...send('A'), {type: 'dial', which: 'c', value: c}, {type: 'dial', which: 'e', value: e}, {type: 'name'}]);
  assert.equal(lost.board.named, 'lost', 'a machine that fits, named while another fits too');
  assert.equal(undo(lost), lost);
});

test('a tray for one strip swaps it; a tray for two refuses a third', () => {
  const p1 = byId('calibrate-01'), p8 = byId('calibrate-08');
  assert.deepEqual(go(p1, freshAttempt(p1), [{type: 'strip', strip: 'A'}, {type: 'strip', strip: 'C'}]).board.tray, ['C']);
  const two = go(p8, freshAttempt(p8), [{type: 'strip', strip: 'A'}, {type: 'strip', strip: 'B'}]);
  assert.equal(move(p8, two, {type: 'strip', strip: 'C'}), null);
  assert.deepEqual(go(p8, two, [{type: 'strip', strip: 'A'}]).board.tray, ['B'], 'a second tap takes a strip out');
});

test('pairs of hidden lengths go on the shelf as they fit; That’s all is judged and kept through Undo', () => {
  const p = byId('calibrate-03');
  assert.equal(buildAnswers(p.parameters).length, 6);
  let a = go(p, freshAttempt(p), [{type: 'set', which: 'e', value: 1}, {type: 'set', which: 'P', value: 6}, {type: 'set', which: 'Q', value: 9}]);
  assert.deepEqual(a.board.found, ['6,9,1']);
  a = go(p, a, [{type: 'all'}]);
  assert.equal(a.board.told, 'more'); assert.match(view(p, a), /There is another\./);
  assert.equal(move(p, a, {type: 'all'}), null);
  a = go(p, a, [{type: 'set', which: 'e', value: 2}]);
  assert.equal(back(p, a).board.told, 'more', 'Undo keeps the refusal');
  a = go(p, a, [{type: 'set', which: 'P', value: 5}, {type: 'set', which: 'Q', value: 8}]);
  assert.equal(a.board.told, null); assert.equal(a.board.found.length, 2);
  assert.equal(back(p, a).board.found.length, 2, 'Undo keeps a find');
});

test('a known strip fixes the extra and then every length', () => {
  const p = byId('calibrate-04');
  assert.deepEqual(buildAnswers(p.parameters), [{P: 5, Q: 8, e: 4}]);
  const a = go(p, freshAttempt(p), [{type: 'set', which: 'e', value: 4}, {type: 'set', which: 'P', value: 5}, {type: 'set', which: 'Q', value: 8}]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, freshAttempt(p), {type: 'set', which: 'K', value: 5}), null, 'the known strip stays');
});

test('machines that fit a report, repairs and stretches', () => {
  assert.deepEqual(everyAnswers(byId('calibrate-07').parameters), [[1, 4], [2, 2], [3, 0]]);
  assert.deepEqual(repairAnswers(byId('calibrate-05').parameters), [[2, 9]]);
  assert.deepEqual(repairAnswers(byId('calibrate-09').parameters), [[0, 6], [1, 11.5], [2, 15]]);
  assert.deepEqual(stretchExtremes(byId('calibrate-10').parameters), {lo: 1, hi: 3});
  const e = stretchExtremes(byId('calibrate-11').parameters);
  assert.deepEqual([fmt(e.lo), fmt(e.hi)], ['1¾', '2¼']);
  assert.equal(fmt(33 / 16), '2 1/16');
  assert.equal(fmtHtml(33 / 16), '2<span class="cb-frac"><sup>1</sup>⁄<sub>16</sub></span>', 'a readout draws sixteenths small, like ¼');
  assert.equal(fmtHtml(9 / 4), '2¼');
  assert.equal(fmtHtml(3 / 8), '<span class="cb-frac"><sup>3</sup>⁄<sub>8</sub></span>');
  const p = byId('calibrate-09'), a = go(p, freshAttempt(p), [{type: 'pick', row: 2}, {type: 'step', by: -1}, {type: 'step', by: -1}]);
  assert.deepEqual(a.board.found, ['2:15']);
  assert.match(view(p, a), /class="cb-line"/, 'the line shows when the three points fit');
});

test('stretch pins are judged together, and a wrong pair stays refused through Undo', () => {
  const p = byId('calibrate-10');
  const steps = (ref, by, n) => [...Array(n)].map(() => ({type: 'step', ref, by}));
  let a = go(p, freshAttempt(p), [{type: 'pin'}, ...steps(0, -1, 2), ...steps(1, 1, 2), {type: 'pin'}]);
  assert.equal(a.board.told, 'shallower'); assert.deepEqual(a.board.pins, []);
  assert.match(view(p, a), /A line can be shallower\./);
  assert.equal(mechanicFor(p).carry(p, a.board, undo(a).board).told, 'shallower', 'Undo keeps the refusal while the line stays');
  assert.notDeepEqual(back(p, a).board.t, a.board.t, 'an Undo press takes back the last line move');
  a = go(p, a, [{type: 'pin'}, ...steps(0, 1, 4), ...steps(1, -1, 4), {type: 'pin'}]);
  assert.ok(isSolved(p, a.board));
});

test('hints solve every puzzle and never say press', () => {
  for (const p of pack.puzzles) {
    let a = freshAttempt(p), k = 0;
    while (!isSolved(p, a.board)) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      assert.ok(!/Press/.test(h.text));
      a = go(p, a, [h.action]);
      assert.ok(++k < 100);
    }
  }
});

test('forged saves are refused', () => {
  const p6 = byId('calibrate-06'), b = freshAttempt(p6).board;
  assert.equal(validBoard(p6, {...b, requests: [['A'], ['B']], named: 'won'}), false, 'a win with the dials on another machine');
  assert.equal(validBoard(p6, {...b, requests: [['A'], ['B']], dials: {c: 1, e: 6}, named: 'won'}), true);
  assert.equal(validBoard(p6, {...b, named: 'lost'}), false, 'named with unset dials');
  assert.equal(validBoard(p6, {...b, requests: [['A'], ['B'], ['C']]}), false);
  const p3 = byId('calibrate-03'), c = freshAttempt(p3).board;
  assert.equal(validBoard(p3, {...c, found: ['6,9,2']}), false, 'a pair that does not fit');
});

test('a group in Ruler strips, below Fold and stretch', async () => {
  assert.equal(calibrateModule.family, undefined, 'no family of its own');
  for (const p of pack.puzzles) { assert.equal(p.libraryFamily, 'ranges'); assert.equal(p.group, 'Hidden machines'); assert.equal(p.familyTitle, 'Ruler strips'); }
  const merged = await loadPack();
  const html = libraryView({nickname: 'T', attempts: {}}, merged.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-ranges"')), ruler = family.slice(0, family.indexOf('</details>'));
  assert.ok(ruler.indexOf('<h2>Fold and stretch</h2>') < ruler.indexOf('<h2>Hidden machines</h2>'));
  assert.match(ruler, /aria-label="Ruler strips, Hidden machines, puzzle 1"/);
});
