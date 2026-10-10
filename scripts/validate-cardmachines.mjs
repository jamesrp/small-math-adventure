// Checks the Card machines pack (dist/families/cardmachines/cardmachines.json)
// by methods unlike the mechanic's. The mechanic works with step functions,
// Moore refinement and searches over pairs of states; this file uses only
// each rule written as a test on a whole row (it ends with B, it has R R in
// it, its reds counted, …), a separate simulator, and every row in order.
//
// - Fewest circles: every machine with fewer circles (all 5,898 with up to 3)
//   is wrong on some row, found by trying rows in order; every machine with
//   the budget is tried, and the right ones are exactly (k − 1)! (circle 1
//   kept, the others renamed), the solution among them. Rows up to 15 cards
//   settle this: two machines with at most 4 circles each that disagree do so
//   on a row shorter than 16, the number of pairs of circles.
// - Each prove witness refutes every machine with one circle fewer through
//   the pigeonhole argument the child makes: two rows share a circle, and
//   that pair's ending gives the machine one answer and the rule two.
// - Test shows the first wrong row in order (shortest first, R before B), on
//   every machine with 2 or 3 circles and a sample with 4, and is ready only
//   for a machine that gets every row already shown right. Undo and Restart
//   keep the shown rows and the count of presses.
// - Split answers: the shortest splitting ending in that order, or Can't with
//   no ending up to 12 cards and the same leftover (reds minus blues after
//   threes, or how much of R B the row ends with). A Can't names the circle
//   where both rows stop, on the drawn machine or on every right machine the
//   child can build; every other circle is refused.
// - Witnesses played as moves; hints alone solve from fresh, after a wrong
//   arrow, a wrong mark, a wrong Test, a wrong Can't, wrong rows and random
//   moves with Undo; illegal moves and forged saves rejected; the playground.
// Run: node scripts/validate-cardmachines.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {machineSays} from '../dist/families/cardmachines/cardmachines.js';
import {loadPack} from './packs.mjs';

// --- The rules as tests on a whole row ---------------------------------------
const count = (row, c) => [...row].filter(x => x === c).length;
const RULE = {
  last: r => row => row.endsWith(r.card),
  seen: r => row => row.includes(r.word),
  ends: r => row => row.endsWith(r.word),
  mod: r => row => count(row, 'R') % r.m === 0,
  diff: r => row => (count(row, 'R') - count(row, 'B')) % r.m === 0,
  even2: () => row => count(row, 'R') % 2 === 0 && count(row, 'B') % 2 === 0,
  equal: () => row => count(row, 'R') === count(row, 'B')
};
const ruleOf = q => RULE[q.rule.kind](q.rule);
// What a split puzzle's rows keep through any shared ending: reds minus blues
// after threes, or the longest start of the word that the row ends with.
const LEFT = {
  diff: r => row => (((count(row, 'R') - count(row, 'B')) % r.m) + r.m) % r.m,
  ends: r => row => { let n = r.word.length; while (n > 0 && !row.endsWith(r.word.slice(0, n))) n--; return n; }
};

// Every row up to n cards, shortest first and R before B.
const ROWS = [''];
for (let k = 0; ROWS.length < 2 ** 16 - 1; k++) ROWS.push(ROWS[k] + 'R', ROWS[k] + 'B');
const rowsUpTo = n => ROWS.slice(0, 2 ** (n + 1) - 1);
const R15 = rowsUpTo(15), R12 = rowsUpTo(12);

// A separate simulator: the marker's circle after a row, and the answer.
const endOf = (m, row) => { let s = 0; for (const c of row) s = m.arrows[s][c === 'R' ? 0 : 1]; return s; };
const says = (m, row) => m.marks[endOf(m, row)];
const firstWrong = (m, rule, rows = R15) => rows.find(row => says(m, row) !== rule(row));

// Every complete machine with k circles.
function* machines(k) {
  const arrowCount = k ** (2 * k);
  for (let a = 0; a < arrowCount; a++) {
    const arrows = [];
    for (let s = 0, x = a; s < k; s++) { arrows.push([x % k, Math.floor(x / k) % k]); x = Math.floor(x / k ** 2); }
    for (let bits = 0; bits < 2 ** k; bits++) yield {arrows, marks: Array.from({length: k}, (_, s) => Boolean(bits >> s & 1))};
  }
}
const factorial = n => (n <= 1 ? 1 : n * factorial(n - 1));
function seeded(seed) {
  let t = seed >>> 0;
  return () => { t = (t + 0x6d2b79f5) >>> 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function randomMachine(k, random) {
  const pick = () => Math.floor(random() * k);
  return {arrows: Array.from({length: k}, () => [pick(), pick()]), marks: Array.from({length: k}, () => random() < 0.5)};
}

// The table in docs/cardmachines/README.md.
const TABLE = {
  'cardmachines-01': {level: 'easy', mode: 'build', fewest: 2},
  'cardmachines-02': {level: 'easy', mode: 'build', fewest: 2},
  'cardmachines-03': {level: 'easy', mode: 'build', fewest: 2},
  'cardmachines-04': {level: 'easy', mode: 'split', fewest: 3, answers: ['', 'R', 'cant', 'cant'], claims: [null, null, 2, 0]},
  'cardmachines-05': {level: 'medium', mode: 'build', fewest: 3},
  'cardmachines-06': {level: 'medium', mode: 'split', fewest: 3, answers: ['B', 'cant', 'B', 'cant']},
  'cardmachines-07': {level: 'medium', mode: 'fewest', fewest: 3},
  'cardmachines-08': {level: 'hard', mode: 'fewest', fewest: 4},
  'cardmachines-09': {level: 'hard', mode: 'fewest', fewest: 3},
  'cardmachines-10': {level: 'hard', mode: 'fewest', fewest: 4},
  'cardmachines-11': {level: 'hard', mode: 'fewest', fewest: Infinity}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const rejects = (p, board, why) => assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
const keep = (p, a, action) => move(p, a, action) || a;
// Undo the way the app does: the previous board, with what carry keeps.
function undoLikeApp(p, a) {
  const next = undo(a);
  if (next === a) return a;
  const carry = mechanicFor(p).carry;
  const board = carry ? carry(p, a.board, next.board) : next.board;
  assert.ok(validBoard(p, board), `${p.id}: Undo leaves a valid board`);
  return {...next, board};
}
// Restart the way the app does: a fresh attempt, with what carryOnRestart keeps.
function restartLikeApp(p, a) {
  const next = restart(p, a), carry = mechanicFor(p).carryOnRestart;
  const board = carry ? carry(p, a.board, next.board) : next.board;
  assert.ok(validBoard(p, board), `${p.id}: Restart leaves a valid board`);
  return {...next, board};
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 300; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 3, `${p.id} ${label}: hint text`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Put a machine on a fresh board by moves: arrows circle by circle, then marks.
function buildBy(p, a, m) {
  for (let s = 0; s < m.arrows.length; s++) for (const [c, card] of ['R', 'B'].entries()) a = keep(p, a, {type: 'arrow', from: s, card, to: m.arrows[s][c]});
  for (let s = 0; s < m.marks.length; s++) if (a.board.marks[s] !== m.marks[s]) a = play(p, a, {type: 'mark', circle: s});
  return a;
}
const typeInto = (p, a, target, index, cards) => [...cards].reduce((b, card) => play(p, b, {type: 'key', target, index, card}), a);
const pairList = n => { const out = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]); return out; };

export async function validateCardmachines() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/cardmachines/cardmachines.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-17')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-17.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'cardmachines');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.equal(new Set(puzzles.map(p => JSON.stringify(p.parameters))).size, puzzles.length, 'distinct starting data');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  const stats = {machinesRefuted: 0, rightMachinesFound: 0, certificateRefutations: 0, testsCompared: 0, testsWaiting: 0, claimsChecked: 0, hintSteps: 0};
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'cardmachine');
    assert.equal(p.libraryFamily, 'cardmachines', `${p.id}: in the Card machines family`);
    assert.ok(p.id.startsWith('cardmachines-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(!/\.\s+\S/.test(p.visibleObjective), `${p.id}: the visible objective is at most one sentence`);
    // A puzzle that builds its machine and then does more draws its own line,
    // one at a time: the rule, then the next task.
    const twoStage = ['split', 'fewest'].includes(p.parameters.mode) && p.parameters.circles > 0;
    assert.equal(Array.isArray(p.boardLines), twoStage, `${p.id}: board lines exactly for a machine built first`);
    if (twoStage) {
      assert.equal(p.visibleObjective, '', `${p.id}: no second objective line beside the board's`);
      assert.equal(p.boardLines.length, 2);
      for (const line of p.boardLines) assert.ok(typeof line === 'string' && line.length > 10 && line.length < 150 && !/\.\s+\S/.test(line), `${p.id}: each board line is one sentence`);
    }
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const row = TABLE[p.id], rule = ruleOf(q);
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    // Fewer circles than the budget (or the drawn machine): every machine is
    // wrong somewhere.
    const built = q.mode === 'build' || q.circles > 0;
    const budget = built ? q.circles : q.mode === 'split' ? q.machine.marks.length : q.rows;
    assert.equal(budget, Number.isFinite(row.fewest) ? row.fewest : 4, `${p.id}: the budget`);
    for (let k = 1; k < budget; k++) for (const m of machines(k)) { assert.ok(firstWrong(m, rule) !== undefined, `${p.id}: a ${k}-circle machine is wrong somewhere`); stats.machinesRefuted++; }
    let right = [];
    if (built) {
      // Every machine with the budget: exactly (k − 1)! are right, the solution one of them.
      for (const m of machines(budget)) if (firstWrong(m, rule) === undefined) right.push(m);
      assert.equal(right.length, factorial(budget - 1), `${p.id}: the right ${budget}-circle machines are the renamings`);
      assert.ok(right.some(m => JSON.stringify(m) === JSON.stringify(p.solution.machine)), `${p.id}: the solution machine is right`);
      assert.equal(p.solution.fewest, budget);
      stats.rightMachinesFound += right.length;
      checkTest(p, fresh, rule, budget, stats);
      stats.hintSteps += checkMachine(p, fresh, rule);
    }
    if (q.mode === 'split') stats.hintSteps += checkSplit(p, fresh, row, rule, right, stats);
    else if (q.mode === 'fewest') checkCertificate(p, rule, stats);
    if (q.mode !== 'split') stats.hintSteps += checkPlay(p, fresh, rule);
  }
  // The rule with no machine at all: rows with 0, 1, …, 9 reds split two at a
  // time (i < j: add i blues), so no number of circles up to 9 is enough.
  const equal = RULE.equal();
  for (let i = 0; i < 10; i++) for (let j = i + 1; j < 10; j++) assert.notEqual(equal('R'.repeat(i) + 'B'.repeat(i)), equal('R'.repeat(j) + 'B'.repeat(i)), 'as many reds as blues: i blues split i and j reds');
  return {cardmachinesPuzzles: puzzles.length, ...stats};
}

// Test shows the first wrong row in order, on every machine with 2 or 3
// circles and 3,000 random ones with 4; a right machine adds no row.
function checkTest(p, fresh, rule, k, stats) {
  const shown = R15.find(r => rule(r));
  const list = k <= 3 ? machines(k) : (function* () { const random = seeded(17 + k); for (let n = 0; n < 3000; n++) yield randomMachine(k, random); })();
  for (const m of list) {
    const a = {...fresh, board: {...fresh.board, arrows: m.arrows, marks: m.marks}};
    assert.ok(validBoard(p, a.board));
    const b = play(p, a, {type: 'test'}), wrong = firstWrong(m, rule);
    assert.deepEqual(b.board.tests, wrong === undefined ? [] : [wrong], `${p.id}: Test shows the first wrong row of ${JSON.stringify(m)}`);
    assert.equal(b.board.presses, 1);
    assert.equal(b.board.checked, true);
    stats.testsCompared++;
    // With a row already shown, Test waits until the machine gets it right.
    const c = {...a, board: {...a.board, tests: [shown], presses: 1}};
    assert.equal(move(p, c, {type: 'test'}) !== null, says(m, shown) === rule(shown), `${p.id}: Test of ${JSON.stringify(m)} waits for ${shown || 'no cards'}`);
    stats.testsWaiting++;
  }
}

// The child's certificate refutes every machine with one circle fewer: two of
// the rows end on one circle, and their pair's ending gives the machine one
// answer for both while the rule gives two.
function checkCertificate(p, rule, stats) {
  const q = p.parameters, {rows, ends} = p.solution, pairs = pairList(q.rows);
  assert.equal(rows.length, q.rows);
  pairs.forEach(([i, j], n) => assert.notEqual(rule(rows[i] + ends[n]), rule(rows[j] + ends[n]), `${p.id}: rows ${i + 1} and ${j + 1} split`));
  for (const m of machines(q.rows - 1)) {
    const at = rows.map(r => endOf(m, r));
    const n = pairs.findIndex(([i, j]) => at[i] === at[j]);
    assert.ok(n >= 0, 'pigeonhole');
    const [i, j] = pairs[n], e = ends[n];
    assert.equal(says(m, rows[i] + e), says(m, rows[j] + e), 'one circle, one answer');
    assert.ok(says(m, rows[i] + e) !== rule(rows[i] + e) || says(m, rows[j] + e) !== rule(rows[j] + e), `${p.id}: the certificate refutes the machine`);
    stats.certificateRefutations++;
  }
}

// Split: answers, the circles a Can't names, witnesses on every machine the
// pairs can be read on, refusals and forgeries. `right` lists every right
// machine with the budget when the child builds the machine first.
function checkSplit(p, fresh, row, rule, right, stats) {
  const q = p.parameters, left = LEFT[q.rule.kind](q.rule);
  assert.equal(q.pairs.length, row.answers.length);
  // The answers: the first splitting ending in order, or none up to 12 cards.
  const answers = q.pairs.map(([x, y]) => { const e = R12.find(end => rule(x + end) !== rule(y + end)); return e === undefined ? 'cant' : e; });
  assert.deepEqual(answers, row.answers, `${p.id}: answers`);
  assert.deepEqual(p.solution.answers, row.answers, `${p.id}: the pack's answers`);
  // Can't exactly when the rows keep the same leftover.
  q.pairs.forEach(([x, y], i) => assert.equal(answers[i] === 'cant', left(x) === left(y), `${p.id}: Can't exactly when the leftovers agree`));
  assert.equal(new Set(q.pairs.map(([x, y]) => [x, y].sort().join())).size, q.pairs.length, `${p.id}: distinct pairs`);
  assert.ok(answers.includes('cant') && answers.some(e => e !== 'cant'), `${p.id}: some pairs split and some can't`);
  // The machines the pairs can be read on: the drawn one, or each right one.
  const boards = q.machine ? [q.machine] : right;
  if (q.machine) assert.equal(firstWrong(q.machine, rule), undefined, `${p.id}: the drawn machine follows the rule`);
  assert.ok(boards.length >= 1);
  // On each, both rows of a Can't pair stop together after every ending up
  // to 6 cards, and the rows of every other pair stop apart.
  for (const m of boards) q.pairs.forEach(([x, y], i) => {
    if (answers[i] !== 'cant') { assert.notEqual(endOf(m, x), endOf(m, y), `${p.id}: split rows stop apart`); return; }
    for (const e of rowsUpTo(6)) assert.equal(endOf(m, x + e), endOf(m, y + e), `${p.id}: pair ${i + 1} stays together after ${e}`);
    stats.claimsChecked++;
  });
  const own = q.machine || p.solution.machine;
  assert.deepEqual(p.solution.claims, q.pairs.map(([x], i) => (answers[i] === 'cant' ? endOf(own, x) : null)), `${p.id}: the pack's Can't circles`);
  if (row.claims) assert.deepEqual(p.solution.claims, row.claims, `${p.id}: the table's Can't circles`);
  // Reach the pairs: at once, or by building a machine and passing Test.
  const ready = m => (q.machine ? fresh : play(p, buildBy(p, fresh, m), {type: 'test'}));
  if (!q.machine) {
    // Before the machine passes, the pairs wait.
    for (const [action, why] of [[{type: 'key', target: 'end', index: 0, card: 'R'}, 'an ending before the machine passes'], [{type: 'cant', pair: answers.indexOf('cant'), circle: 0}, 'a Can’t before the machine passes']]) refuse(p, fresh, action, why);
    assert.equal(nextHint(p, fresh).action.type === 'cant', false, `${p.id}: the first hints build the machine`);
  }
  let steps = 0;
  // The witness, played on every machine: each pair's ending or Can't with
  // the circle where both rows stop on that machine.
  for (const m of boards) {
    let a = ready(m);
    assert.ok(!isSolved(p, a.board), `${p.id}: the pairs are still to do`);
    if (!q.machine) {
      refuse(p, a, {type: 'arrow', from: 0, card: 'R', to: 0}, 'an arrow once the machine has passed');
      refuse(p, a, {type: 'mark', circle: 0}, 'a mark once the machine has passed');
      refuse(p, a, {type: 'test'}, 'Test once the machine has passed');
    }
    answers.forEach((e, i) => { a = e === 'cant' ? play(p, a, {type: 'cant', pair: i, circle: endOf(m, q.pairs[i][0])}) : typeInto(p, a, 'end', i, e); });
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves on ${JSON.stringify(m)}`);
    refuse(p, a, {type: 'key', target: 'end', index: 0, card: 'R'}, 'a move after a solve');
  }
  steps += hintsSolve(p, fresh, 'from fresh');
  const m = boards[0], start = ready(m), k = m.marks.length;
  const sep = answers.findIndex(e => e !== 'cant' && e !== ''), cant = answers.indexOf('cant'), [cx, cy] = q.pairs[cant];
  // Can't on a pair some ending splits is refused on every circle.
  for (let c = 0; c < k; c++) {
    const b = play(p, start, {type: 'cant', pair: sep, circle: c});
    assert.equal(b.board.refused[sep], true, `${p.id}: a Can’t on rows that split is refused`);
    assert.equal(b.board.cant[sep], false);
  }
  // Can't on a pair that can't be split, naming a circle where the rows don't stop.
  const at = endOf(m, cx);
  for (let c = 0; c < k; c++) {
    if (c === at) continue;
    const b = play(p, start, {type: 'cant', pair: cant, circle: c});
    assert.equal(b.board.refused[cant], true, `${p.id}: a Can’t naming circle ${c + 1} is refused`);
    assert.equal(b.board.cant[cant], false);
    assert.equal(move(p, b, {type: 'cant', pair: cant, circle: c}), b, `${p.id}: the same wrong Can’t again changes nothing`);
    steps += hintsSolve(p, b, `after a Can’t naming circle ${c + 1}`);
    const fixed = play(p, b, {type: 'cant', pair: cant, circle: at});
    assert.equal(fixed.board.cant[cant], true, `${p.id}: then the right circle is accepted`);
    assert.equal(fixed.board.refused[cant], false);
  }
  let b = play(p, start, {type: 'cant', pair: sep, circle: 0});
  steps += hintsSolve(p, b, 'after a wrong Can’t');
  const c = play(p, b, {type: 'key', target: 'end', index: sep, card: 'B'});
  assert.equal(c.board.refused[sep], false, `${p.id}: a new ending clears the refusal`);
  const splitting = typeInto(p, start, 'end', sep, answers[sep]);
  for (let n = 0; n < k; n++) refuse(p, splitting, {type: 'cant', pair: sep, circle: n}, 'Can’t on a pair its ending already splits');
  // A right Can't with an ending typed names where both rows stop after it, and keeps the ending.
  b = typeInto(p, start, 'end', cant, 'RB');
  assert.equal(endOf(m, cx + 'RB'), endOf(m, cy + 'RB'));
  if (endOf(m, cx + 'RB') !== at) assert.equal(play(p, b, {type: 'cant', pair: cant, circle: at}).board.refused[cant], true, `${p.id}: Can’t names the circle after the ending`);
  b = play(p, b, {type: 'cant', pair: cant, circle: endOf(m, cx + 'RB')});
  assert.equal(b.board.cant[cant], true);
  assert.equal(b.board.ends[cant], 'RB', `${p.id}: a right Can’t keeps the ending`);
  refuse(p, b, {type: 'key', target: 'end', index: cant, card: 'R'}, 'an ending after Can’t');
  refuse(p, b, {type: 'cant', pair: cant, circle: endOf(m, cx + 'RB')}, 'Can’t twice');
  steps += hintsSolve(p, b, 'after a right Can’t with an ending typed');
  // Long wrong endings, then hints.
  b = start;
  for (let i = 0; i < q.pairs.length; i++) b = [...'BBRBRB'].reduce((x, card) => keep(p, x, {type: 'key', target: 'end', index: i, card}), b);
  if (!isSolved(p, b.board)) steps += hintsSolve(p, b, 'after long endings');
  // Illegal moves.
  for (const [action, why] of [[null, 'nothing'], [{type: 'cant'}, 'Can’t for no pair'], [{type: 'cant', pair: cant}, 'Can’t naming no circle'], [{type: 'cant', pair: cant, circle: k}, 'Can’t naming a circle not there'], [{type: 'cant', pair: cant, circle: String(at)}, 'a circle named by a string'], [{type: 'cant', pair: q.pairs.length, circle: 0}, 'an unknown pair'], [{type: 'key', target: 'end', index: 0, card: 'G'}, 'a green card'], [{type: 'key', target: 'end', index: 0, card: 'back'}, 'taking back from an empty ending'], [{type: 'key', target: 'row', index: 0, card: 'R'}, 'a row'], [{type: 'arrow', from: 0, card: 'R', to: 1}, 'an arrow on the machine'], [{type: 'mark', circle: 0}, 'a mark'], [{type: 'test'}, 'Test'], [{type: 'circles', n: 2}, 'circles'], [{type: 'fly'}, 'an unknown move']]) refuse(p, start, action, why);
  const full = typeInto(p, start, 'end', cant, 'RRRRRR');
  refuse(p, full, {type: 'key', target: 'end', index: cant, card: 'R'}, 'an ending past 6 cards');
  // Forged saves.
  const B = start.board, n = q.pairs.length, set = (list, i, v) => list.map((x, j) => (j === i ? v : x));
  for (const [board, why] of [
    [{...B, cant: set(B.cant, sep, true)}, 'Can’t on rows that split'],
    [{...B, refused: set(B.refused, sep, true), ends: set(B.ends, sep, answers[sep] || 'R')}, 'a refusal with a splitting ending'],
    [{...B, cant: set(B.cant, cant, true), refused: set(B.refused, cant, true)}, 'a pair both Can’t and refused'],
    [{...B, ends: set(B.ends, 0, 'RRRRRRR')}, 'an ending of 7 cards'],
    [{...B, ends: set(B.ends, 0, 'RG')}, 'a green card'],
    [{...B, ends: B.ends.slice(0, n - 1)}, 'a missing ending'],
    [{...B, cant: B.cant.map(() => 'yes')}, 'a Can’t that is not true or false'],
    [{...B, extra: 1}, 'an unknown field'],
    [{ends: B.ends, cant: B.cant}, 'a missing field'],
    ...(q.machine ? [] : [
      [{...fresh.board, ends: set(fresh.board.ends, sep, 'B')}, 'an ending before the machine passes'],
      [{...fresh.board, cant: set(fresh.board.cant, cant, true)}, 'a Can’t before the machine passes'],
      [{...fresh.board, refused: set(fresh.board.refused, sep, true)}, 'a refusal before the machine passes'],
      [{...B, checked: false, ends: set(B.ends, sep, 'B')}, 'an ending beside a machine that has not passed Test']
    ])
  ]) rejects(p, board, why);
  // Kept as valid: a refused claim on rows that can't be split, and a Can't with its ending.
  assert.ok(validBoard(p, {...B, refused: set(B.refused, cant, true)}), `${p.id}: a refused circle on rows that can’t be split`);
  assert.ok(validBoard(p, {...B, cant: set(B.cant, cant, true), ends: set(B.ends, cant, 'R')}), `${p.id}: a Can’t keeps its ending`);
  return steps;
}

// The machine built first: hints after wrong arrows, marks and Tests; Test
// waits for a machine that gets every shown row right; Undo and Restart keep
// the shown rows; illegal machine moves; forgeries; random moves with Undo.
function checkMachine(p, fresh, rule) {
  const q = p.parameters, m = p.solution.machine, k = m.marks.length;
  let steps = 0, a = fresh;
  refuse(p, a, {type: 'test'}, 'Test before every arrow is placed');
  a = buildBy(p, a, m);
  assert.ok(!isSolved(p, a.board), `${p.id}: a right machine waits for Test`);
  a = play(p, a, {type: 'test'});
  assert.deepEqual(a.board.tests, [], `${p.id}: Test of a right machine shows no row`);
  refuse(p, a, {type: 'test'}, 'Test twice');
  assert.equal(isSolved(p, a.board), q.mode === 'build', `${p.id}: a passed machine solves a build puzzle only`);
  // A wrong first arrow and a wrong mark.
  const wrongTo = (m.arrows[0][0] + 1) % k;
  let b = play(p, fresh, {type: 'arrow', from: 0, card: 'R', to: wrongTo});
  steps += hintsSolve(p, b, 'after a wrong arrow');
  b = buildBy(p, fresh, m);
  b = play(p, b, {type: 'mark', circle: 0});
  steps += hintsSolve(p, b, 'after a wrong mark');
  // A wrong Test: every arrow looping and every circle ×. It shows the first
  // row the rule gives ✓, and stays on the board through later changes.
  const loops = {arrows: m.arrows.map((_, s) => [s, s]), marks: m.marks.map(() => false)};
  b = buildBy(p, fresh, loops);
  b = play(p, b, {type: 'test'});
  const shown = R15.find(r => rule(r));
  assert.deepEqual(b.board.tests, [shown], `${p.id}: Test shows the first row the rule gives ✓`);
  refuse(p, b, {type: 'test'}, 'Test twice on one machine');
  // Wiggling: a change and its reverse leave the same wrong machine, and Test waits.
  const other = k - 1, wiggled = play(p, play(p, b, {type: 'mark', circle: other}), {type: 'mark', circle: other});
  assert.equal(wiggled.board.checked, false);
  refuse(p, wiggled, {type: 'test'}, 'Test of a machine that still gets a shown row wrong');
  const c = play(p, b, {type: 'mark', circle: 0});
  assert.equal(c.board.checked, false, `${p.id}: a change waits for a new Test`);
  assert.deepEqual(c.board.tests, b.board.tests, `${p.id}: the rows Test showed stay`);
  // Circle 1 now says ✓ and every arrow loops, so the machine says ✓ on the
  // shown row as the rule does, and Test is ready again.
  assert.ok(move(p, c, {type: 'test'}), `${p.id}: Test is ready once the shown row is right`);
  const back = undoLikeApp(p, c);
  assert.deepEqual(back.board.tests, b.board.tests);
  const before = undoLikeApp(p, b);
  assert.deepEqual(before.board.tests, [shown], `${p.id}: Undo of a Test keeps its row`);
  assert.equal(before.board.presses, 1, `${p.id}: Undo keeps the count of presses`);
  assert.equal(before.board.checked, false);
  refuse(p, before, {type: 'test'}, 'Test of the same wrong machine after Undo');
  steps += hintsSolve(p, before, 'after a wrong Test and Undo');
  // Restart keeps the shown rows and the presses; the arrows start again.
  const again = restartLikeApp(p, b);
  assert.deepEqual(again.board.tests, [shown], `${p.id}: Restart keeps the rows Test showed`);
  assert.equal(again.board.presses, 1, `${p.id}: Restart keeps the count of presses`);
  assert.deepEqual(again.board.arrows, fresh.board.arrows, `${p.id}: Restart clears the arrows`);
  refuse(p, buildBy(p, again, loops), {type: 'test'}, 'Test of the same wrong machine after Restart');
  const passedAgain = play(p, buildBy(p, again, m), {type: 'test'});
  assert.equal(passedAgain.board.presses, 2);
  steps += hintsSolve(p, again, 'after Restart');
  // Illegal machine moves.
  for (const [action, why] of [[{type: 'arrow', from: 0, card: 'R', to: k}, 'an arrow to no circle'], [{type: 'arrow', from: k, card: 'R', to: 0}, 'an arrow from no circle'], [{type: 'arrow', from: 0, card: 'G', to: 0}, 'a green arrow'], [{type: 'arrow', from: '0', card: 'R', to: 0}, 'a circle named by a string'], [{type: 'mark', circle: -1}, 'a mark on no circle'], [{type: 'circles', n: k + 1}, 'a new circle'], [{type: 'mix'}, 'Mix'], [{type: 'cant', pair: 0, circle: 0}, 'Can’t'], [{type: 'key', target: 'row', index: 0, card: 'R'}, 'a row before the machine passes'], [{type: 'key', target: 'end', index: 0, card: 'R'}, 'an ending before the machine passes'], [{type: 'key', target: 'bench', card: 'R'}, 'the playground row'], [null, 'nothing'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  // Forged saves.
  const B = fresh.board, done = buildBy(p, fresh, m).board, wrong = buildBy(p, fresh, loops).board;
  for (const [board, why] of [
    [{...done, checked: true}, 'a passed Test with no press'],
    [{...wrong, checked: true, presses: 1}, 'a Test of a wrong machine that showed nothing'],
    [{...wrong, checked: true, presses: 1, tests: ['RRRRRBBB']}, 'a Test that showed a row other than the first wrong one'],
    [{...B, checked: true, presses: 1}, 'a Test of a machine with arrows not placed'],
    [{...B, tests: ['R', 'R'], presses: 2}, 'a row shown twice'],
    [{...B, tests: ['R', 'B'], presses: 1}, 'more rows than presses'],
    [{...B, tests: ['RG']}, 'a green card in a Test row'],
    [{...B, tests: ['R'.repeat(25)], presses: 1}, 'a Test row of 25 cards'],
    [{...B, presses: -1}, 'a negative count'],
    [{...B, arrows: B.arrows.map((x, s) => (s ? x : [k, null]))}, 'an arrow to no circle'],
    [{...B, arrows: B.arrows.slice(1), marks: B.marks.slice(1)}, 'a circle missing'],
    [{...B, marks: B.marks.map(() => 'yes')}, 'a mark that is not ✓ or ×'],
    [{...B, extra: 1}, 'an unknown field'],
    ...(q.mode === 'fewest' ? [[{...B, rows: B.rows.map((r, i) => (i ? r : 'R'))}, 'a row before the machine passes']] : [])
  ]) rejects(p, board, why);
  // Random machine moves with Undo, then hints.
  const random = seeded(7 + p.number);
  for (let trial = 0; trial < 8; trial++) {
    let d = fresh;
    for (let n = 0; n < 30; n++) {
      const r = random();
      if (r < 0.12) { d = undoLikeApp(p, d); continue; }
      const action = r < 0.7 ? {type: 'arrow', from: Math.floor(random() * k), card: random() < 0.5 ? 'R' : 'B', to: Math.floor(random() * k)} : r < 0.85 ? {type: 'mark', circle: Math.floor(random() * k)} : {type: 'test'};
      const next = move(p, d, action);
      if (next && !isSolved(p, next.board) && !(q.mode !== 'build' && next.board.checked && firstWrong(next.board, rule) === undefined)) d = next;
    }
    steps += hintsSolve(p, d, `after random moves ${trial + 1}`);
  }
  return steps;
}

// Build and prove: witnesses, hints from several starts, Undo, refusals, forgeries.
function checkPlay(p, fresh, rule) {
  const q = p.parameters, machine = q.mode === 'build' || q.circles > 0;
  let steps = 0;
  let a = fresh;
  if (machine) a = play(p, buildBy(p, a, p.solution.machine), {type: 'test'});
  if (q.mode === 'build') assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  else {
    assert.ok(!isSolved(p, a.board));
    if (machine) {
      refuse(p, a, {type: 'arrow', from: 0, card: 'R', to: 0}, 'an arrow once the machine has passed');
      refuse(p, a, {type: 'mark', circle: 0}, 'a mark once the machine has passed');
      refuse(p, a, {type: 'test'}, 'Test once the machine has passed');
    }
    p.solution.rows.forEach((r, i) => { a = typeInto(p, a, 'row', i, r); });
    pairList(q.rows).forEach((_, n) => { a = typeInto(p, a, 'end', n, p.solution.ends[n]); });
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  }
  refuse(p, a, {type: 'key', target: 'row', index: 0, card: 'R'}, 'a move after a solve');
  steps += hintsSolve(p, fresh, 'from fresh');

  if (q.mode === 'fewest') {
    let b = machine ? play(p, buildBy(p, fresh, p.solution.machine), {type: 'test'}) : fresh;
    const start = b;
    // Every row the same as row 1, then hints; then rows and endings typed at random.
    for (let i = 1; i < q.rows; i++) b = typeInto(p, b, 'row', i, 'BB');
    steps += hintsSolve(p, b, 'after rows that share a circle');
    const random = seeded(99 + p.number);
    for (let trial = 0; trial < 6; trial++) {
      let c = start;
      for (let n = 0; n < 24; n++) {
        const r = random(), list = r < 0.5 ? 'row' : 'end', size = list === 'row' ? q.rows : pairList(q.rows).length;
        const action = random() < 0.15 ? 'undo' : {type: 'key', target: list, index: Math.floor(random() * size), card: ['R', 'B', 'back'][Math.floor(random() * 3)]};
        if (action === 'undo') { if (c.history.length > (start.history.length)) c = undoLikeApp(p, c); continue; }
        const next = move(p, c, action);
        if (next && !isSolved(p, next.board)) c = next;
      }
      steps += hintsSolve(p, c, `after random rows ${trial + 1}`);
    }
    for (const [action, why] of [[{type: 'key', target: 'row', index: q.rows, card: 'R'}, 'a row past the last'], [{type: 'key', target: 'end', index: pairList(q.rows).length, card: 'R'}, 'an ending past the last'], [{type: 'key', target: 'row', index: 0, card: 'back'}, 'taking back from an empty row'], [{type: 'key', target: 'pair', index: 0, card: 'R'}, 'an unknown target'], [{type: 'cant', pair: 0, circle: 0}, 'Can’t']]) refuse(p, start, action, why);
    const full = typeInto(p, start, 'row', 0, 'RRRRRR');
    refuse(p, full, {type: 'key', target: 'row', index: 0, card: 'B'}, 'a row past 6 cards');
    rejects(p, {...start.board, rows: start.board.rows.map((r, i) => (i ? r : 'RRRRRRR'))}, 'a row of 7 cards');
    rejects(p, {...start.board, ends: start.board.ends.slice(1)}, 'a missing ending');
    rejects(p, {...start.board, rows: [...start.board.rows, '']}, 'an extra row');
  }
  return steps;
}

function checkPlayground(p, fresh) {
  const q = p.parameters, hooks = mechanicFor(p);
  assert.equal(hooks.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(fresh.board.marks.length, q.machine.marks.length);
  let a = fresh;
  for (const n of [3, 4, 5]) { a = play(p, a, {type: 'circles', n}); assert.equal(a.board.marks.length, n); assert.ok(a.board.arrows.every(x => x.every(t => Number.isInteger(t) && t < n)), `${p.id}: ${n} circles, every arrow placed`); }
  refuse(p, a, {type: 'circles', n: 6}, 'a sixth circle');
  for (const n of [4, 2, 1]) { a = play(p, a, {type: 'circles', n}); assert.ok(a.board.arrows.every(x => x.every(t => t < n)), `${p.id}: arrows into a removed circle come back`); }
  refuse(p, a, {type: 'circles', n: 0}, 'no circles');
  a = play(p, a, {type: 'circles', n: 4});
  const random = seeded(5);
  for (let n = 0; n < 50; n++) {
    const b = move(p, a, {type: 'mix'}, random);
    if (b) { assert.ok(validBoard(p, b.board)); a = b; }
  }
  for (const card of 'RBRRBBRBRBRB') a = play(p, a, {type: 'key', target: 'bench', card});
  refuse(p, a, {type: 'key', target: 'bench', card: 'R'}, 'a row past 12 cards');
  // The mechanic's own simulator agrees with this one.
  for (let n = 0; n < 400; n++) { const m = randomMachine(1 + (n % 5), random), r = R12[Math.floor(random() * R12.length)]; assert.equal(machineSays(m, r), says(m, r), 'the two simulators agree'); }
  a = play(p, a, {type: 'key', target: 'bench', card: 'back'});
  a = play(p, a, {type: 'key', target: 'bench', card: 'clear'});
  assert.equal(a.board.row, '');
  refuse(p, a, {type: 'key', target: 'bench', card: 'clear'}, 'clearing an empty row');
  a = play(p, a, {type: 'arrow', from: 0, card: 'R', to: 3});
  a = play(p, a, {type: 'mark', circle: 3});
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  assert.equal(nextHint(p, a).type, 'done');
  for (const [action, why] of [[{type: 'test'}, 'Test'], [{type: 'cant', pair: 0}, 'Can’t'], [{type: 'key', target: 'row', index: 0, card: 'R'}, 'a puzzle row'], [{type: 'arrow', from: 0, card: 'R', to: 4}, 'an arrow to no circle']]) refuse(p, a, action, why);
  const B = fresh.board;
  for (const [board, why] of [[{...B, arrows: [[0, null], [1, 1]]}, 'an arrow not placed'], [{arrows: Array(6).fill([0, 0]), marks: Array(6).fill(false), row: ''}, 'six circles'], [{...B, row: 'R'.repeat(13)}, 'a row of 13 cards'], [{...B, checked: false}, 'a Test field'], [{arrows: [], marks: [], row: ''}, 'no circles']]) rejects(p, board, why);
}

export default validateCardmachines;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCardmachines(), null, 2));
