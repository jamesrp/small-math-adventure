// Checks the Gap rings pack (dist/families/diffs/diffs.json): content fields
// and sources; every answer recomputed by methods unlike the mechanic's (which
// tries every ring under the cap): rings before a target from sign choices
// (each arrow climbs or falls, the climbs balance the falls) shifted under the
// cap, impossibility from the equal-split test, longest runs from a forward
// simulator over every ring, and the three-tower loop by iteration; the two
// Can't certificates checked sound against every target and every set of
// marks; witnesses played as moves; hint chains from fresh, after wrong
// towers, after a wrong Can't, after a wrong That's all and after dead-end
// rings; illegal moves; forged saves; Undo keeping what was learned; hint
// speed. Run: node scripts/validate-diffs.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {predecessors, deepest, certificate} from '../dist/families/diffs/diffs.js';
import {loadPack} from './packs.mjs';

// A separate simulator.
const step = r => r.map((v, i) => Math.abs(v - r[(i + 1) % r.length]));
const key = r => r.join(',');
function* ringsUpTo(n, cap) { const r = Array(n).fill(0); for (;;) { yield [...r]; let i = n - 1; while (i >= 0 && r[i] === cap) r[i--] = 0; if (i < 0) return; r[i]++; } }
function runLength(r) { const seen = new Set(); let k = 0; while (r.some(v => v)) { if (seen.has(key(r))) return Infinity; seen.add(key(r)); r = step(r); k++; } return k; }
// Rings before t: choose a direction for each arrow; the signed gaps must
// total 0; then shift the ring to every height that fits under the cap.
function bySigns(t, cap) {
  const out = new Set(), n = t.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const e = t.map((v, i) => (mask >> i) & 1 ? v : -v);
    if (e.reduce((s, v) => s + v, 0) !== 0) continue;
    const ring = [0];
    for (let i = 0; i < n - 1; i++) ring.push(ring[i] + e[i]);
    const lo = Math.min(...ring), span = Math.max(...ring) - lo;
    for (let shift = 0; shift + span <= cap; shift++) { const r = ring.map(v => v - lo + shift); if (r.some(v => v)) out.add(key(r)); }
  }
  return [...out].sort();
}
// Whether the numbers split into two groups with equal totals.
const splits = t => { for (let mask = 0; mask < 1 << t.length; mask++) if (t.reduce((s, v, i) => s + ((mask >> i) & 1 ? v : -v), 0) === 0) return true; return false; };

// The table in docs/diffs/README.md.
const TABLE = {
  'diffs-01': {mode: 'make', target: '1,1,1,1', cap: 2, answers: 8},
  'diffs-02': {mode: 'make', target: '2,0,2,0', cap: 2, answers: 2},
  'diffs-03': {mode: 'grow', cap: 2, moves: 2},
  'diffs-04': {mode: 'make', target: '0,2,0,0', cap: 2, answers: 0, reason: 'zeros'},
  'diffs-05': {mode: 'make', target: '3,2,2,1', cap: 4, answers: 2},
  'diffs-06': {mode: 'make', target: '0,1,1,1', cap: 3, answers: 0, reason: 'odd'},
  'diffs-07': {mode: 'every', target: '0,1,0,1', cap: 2, answers: 4},
  'diffs-08': {mode: 'grow', cap: 2, moves: 4},
  'diffs-09': {mode: 'grow', cap: 1, loop: '1,0,1'},
  'diffs-10': {mode: 'every', target: '1,2,1,2', cap: 3, answers: 4},
  'diffs-11': {mode: 'grow', cap: 3, moves: 6},
  'diffs-12': {mode: 'grow', cap: 4, moves: 7}
};
const LONGEST = {1: 4, 2: 4, 3: 6, 4: 7, 5: 7};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
let slowest = 0;
function timedHint(p, a) { const t = performance.now(); const h = nextHint(p, a); slowest = Math.max(slowest, performance.now() - t); return h; }
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 300; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 4, `${p.id} ${label}: hint text`);
    assert.ok(!/press can’t/i.test(h.text), `${p.id} ${label}: a hint gives the reason, not Press Can’t (level 2 marks the button)`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Build a ring tower by tower on the board's draft (or old ring).
const build = (p, a, ring) => ring.reduce((b, h, i) => { const now = (b.board.draft || b.board.old)[i]; return now === h ? b : play(p, b, {type: 'set', station: i, h}); }, a);

export async function validateDiffs() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/diffs/diffs.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-49')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-49.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'diffs');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems. Rings before every target with heights 0..4, by signs and
  // by the mechanic; the gaps of every ring have an even total; three zero
  // gaps never come from a ring; a target with no equal split has none.
  let targets = 0;
  for (const t of ringsUpTo(4, 4)) {
    const mine = bySigns(t, 4), theirs = predecessors(t, 4).map(key).sort();
    assert.deepEqual(theirs, mine, `rings before ${key(t)}`);
    if (!splits(t)) assert.equal(bySigns(t, 12).length, 0, `${key(t)}: no equal split, no ring`);
    if (t.reduce((s, v) => s + v, 0) % 2) assert.equal(mine.length, 0, `${key(t)}: odd total`);
    if (t.filter(v => v === 0).length === 3) assert.equal(bySigns(t, 12).length, 0, `${key(t)}: three zero gaps`);
    // The certificates are sound: no set of marks is accepted for a target some ring makes.
    for (let mask = 1; mask < 16; mask++) {
      const marks = [0, 1, 2, 3].filter(i => (mask >> i) & 1);
      if (certificate(t, marks)) assert.equal(bySigns(t, 12).length, 0, `${key(t)}: a certificate only when no ring makes it`);
    }
    targets++;
  }
  for (const r of ringsUpTo(4, 6)) assert.equal(step(r).reduce((s, v) => s + v, 0) % 2, 0, 'every ring of gaps has an even total');
  // Longest runs under each cap, by running every ring forward; and the
  // mechanic's longest run back from each ring agrees with the forward runs.
  for (const cap of [1, 2, 3, 4, 5]) {
    const lengths = new Map(), best = new Map();
    for (const r of ringsUpTo(4, cap)) lengths.set(key(r), runLength(r));
    assert.equal(Math.max(...lengths.values()), LONGEST[cap], `towers up to ${cap}: the longest run`);
    assert.equal(deepest([0, 0, 0, 0], cap), LONGEST[cap], `towers up to ${cap}: the mechanic agrees`);
    if (cap > 4) continue;
    for (let r of ringsUpTo(4, cap)) { const total = lengths.get(key(r)); for (let k = 0; k <= total; k++, r = step(r)) best.set(key(r), Math.max(best.get(key(r)) ?? 0, k)); }
    for (const r of ringsUpTo(4, cap)) if (r.some(v => v)) assert.equal(deepest(r, cap), best.get(key(r)) ?? 0, `towers up to ${cap}: longest run back from ${key(r)}`);
  }
  // Three towers: only flat rings reach zero; (1, 0, 1) goes round in three moves.
  for (const r of ringsUpTo(3, 4)) assert.equal(runLength(r) !== Infinity, r[0] === r[1] && r[1] === r[2], `three towers ${key(r)}`);
  assert.deepEqual([1, 2, 3].map(k => key(Array.from({length: k}).reduce(step, [1, 0, 1]))), ['1,1,0', '0,1,1', '1,0,1']);

  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'diffs');
    assert.ok(p.id.startsWith('diffs-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    assert.ok(!/press can’t/i.test(p.hints[0]), `${p.id}: the first hint never says Press Can’t`);
    assert.ok(!/run\b/i.test(JSON.stringify(p.parameters)), `${p.id}: no Run button`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    assert.equal(timedHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.notEqual(nextHint(p, fresh).action.type, 'cant', `${p.id}: the first hint is not Can’t`);
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.equal(q.cap, row.cap, `${p.id}: cap`);
    if (row.mode === 'make') hintSteps += checkMake(p, fresh, row);
    else if (row.mode === 'every') hintSteps += checkEvery(p, fresh, row);
    else hintSteps += checkGrow(p, fresh, row);
    // Forged saves common to all.
    for (const [board, why] of [[null, 'nothing'], [{}, 'an empty save'], [{...fresh.board, extra: 1}, 'an extra field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  }
  assert.ok(slowest < 400, `hints are quick (slowest ${slowest.toFixed(0)} ms)`);
  return {puzzles: pack.puzzles.length, targets, hintSteps, slowestHintMs: Math.round(slowest)};
}

function checkMake(p, fresh, row) {
  const q = p.parameters, answers = bySigns(q.target, q.cap);
  assert.equal(key(q.target), row.target, `${p.id}: target`);
  assert.equal(answers.length, row.answers, `${p.id}: rings before it, by signs`);
  assert.equal(q.cant, true, `${p.id}: every make puzzle offers Can’t`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  const wrong = q.target.map(() => 0).map((_, i) => i === 0 ? q.cap : 0);
  const tried = build(p, fresh, wrong);
  refuse(p, fresh, {type: 'cant', marks: [0]}, 'Can’t before a ring is built');
  refuse(p, tried, {type: 'cant', marks: []}, 'Can’t with no marks');
  refuse(p, tried, {type: 'cant', marks: [2, 1]}, 'marks out of order');
  refuse(p, tried, {type: 'cant', marks: [4]}, 'a mark off the ring');
  refuse(p, tried, {type: 'set', station: 0, h: q.cap + 1}, 'a tower over the cap');
  refuse(p, tried, {type: 'set', station: 4, h: 1}, 'a fifth tower');
  refuse(p, tried, {type: 'set', station: 0, h: q.cap}, 'a tower already that high');
  refuse(p, tried, {type: 'all'}, 'That’s all');
  refuse(p, tried, {type: 'lift'}, 'taking back a ring');
  steps += hintsSolve(p, tried, 'after a wrong ring');
  // A wrong claim: refused, kept through Undo, and Can't waits for a change.
  const badMarks = row.reason === 'odd' ? [3] : row.reason === 'zeros' ? [0, 1, 2, 3] : [0];
  // Page order proves nothing: the first three towers are never a certificate here.
  if (row.reason) assert.notDeepEqual(solutionMarks(q), [0, 1, 2], `${p.id}: the certificate is not the first three towers`);
  const refused = play(p, tried, {type: 'cant', marks: badMarks});
  assert.deepEqual(refused.board.refused, badMarks, `${p.id}: a wrong Can’t is refused`);
  assert.ok(!isSolved(p, refused.board));
  refuse(p, refused, {type: 'cant', marks: row.reason ? solutionMarks(q) : [1]}, 'Can’t again before a change');
  const undone = mechanicFor(p).carry(p, refused.board, undo(refused).board);
  assert.deepEqual(undone.refused, badMarks, `${p.id}: Undo keeps the refusal`);
  steps += hintsSolve(p, refused, 'after a wrong Can’t');
  if (row.reason) {
    const right = play(p, tried, {type: 'cant', marks: solutionMarks(q)});
    assert.ok(isSolved(p, right.board), `${p.id}: Can’t with the ${row.reason} certificate solves`);
    assert.ok(validBoard(p, {old: wrong, claim: solutionMarks(q), refused: null}));
    assert.equal(validBoard(p, {old: [null, 0, 0, 0], claim: solutionMarks(q), refused: null}), false, `${p.id}: rejects a claim with no ring built`);
  } else {
    const witness = answers[0].split(',').map(Number);
    assert.ok(isSolved(p, build(p, fresh, witness).board), `${p.id}: the witness solves`);
    assert.equal(validBoard(p, {old: wrong, claim: [0], refused: null}), false, `${p.id}: rejects a claim kept on a ring that has one`);
  }
  for (const [board, why] of [[{old: [0, 0, 0], claim: null, refused: null}, 'three towers'], [{old: [0, 0, 0, q.cap + 1], claim: null, refused: null}, 'a tower over the cap'], [{old: [0, 0, 0, 0.5], claim: null, refused: null}, 'half a block'], [{old: wrong, claim: null, refused: row.reason ? solutionMarks(q) : 'x'}, row.reason ? 'a refusal of a right claim' : 'a malformed refusal'], [{old: wrong, claim: [0], refused: [0]}, 'a claim both kept and refused']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}
const solutionMarks = q => { const odd = q.target.map((v, i) => v % 2 ? i : -1).filter(i => i >= 0); return odd.length % 2 ? odd : q.target.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0); };

function checkEvery(p, fresh, row) {
  const q = p.parameters, answers = bySigns(q.target, q.cap);
  assert.equal(key(q.target), row.target, `${p.id}: target`);
  assert.equal(answers.length, row.answers, `${p.id}: rings before it, by signs`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  const told = play(p, fresh, {type: 'all'});
  assert.equal(told.board.told, 'more', `${p.id}: There is another`);
  refuse(p, told, {type: 'all'}, 'That’s all twice without a new ring');
  steps += hintsSolve(p, told, 'after a wrong That’s all');
  let a = fresh;
  for (const r of answers) a = build(p, a, r.split(',').map(Number));
  assert.deepEqual(a.board.found, answers, `${p.id}: every ring is kept`);
  assert.ok(!isSolved(p, a.board), `${p.id}: not solved until That’s all`);
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: That’s all with every ring`);
  // Undo keeps the rings found.
  const one = build(p, fresh, answers[0].split(',').map(Number)), back = undo(one);
  assert.deepEqual(mechanicFor(p).carry(p, one.board, back.board).found, [answers[0]], `${p.id}: Undo keeps a ring found`);
  refuse(p, fresh, {type: 'cant', marks: [0]}, 'Can’t');
  for (const [board, why] of [[{...fresh.board, found: ['9,9,9,9']}, 'a ring found that does not work'], [{...fresh.board, found: [answers[1], answers[0]]}, 'rings out of order'], [{...fresh.board, done: true}, 'done with rings missing'], [{...a.board, told: 'more'}, '“there is another” with every ring found'], [{...fresh.board, old: answers[0].split(',').map(Number)}, 'a ring that works but is not kept'], [{...fresh.board, told: 'less'}, 'an unknown answer']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkGrow(p, fresh, row) {
  const q = p.parameters;
  let steps = hintsSolve(p, fresh, 'from fresh');
  if (row.loop) {
    assert.deepEqual(q.start.map(key), [row.loop], `${p.id}: the start`);
    assert.equal(q.stations, 3);
    refuse(p, fresh, {type: 'lift'}, 'taking back the start');
    // A dead end: a ring before the start with nothing before it.
    const dead = predecessors(q.start[0], q.cap).find(r => !bySigns(r, q.cap).length);
    assert.ok(dead, `${p.id}: a dead end to take back`);
    const stuck = build(p, fresh, dead);
    assert.equal(stuck.board.run.length, 2, `${p.id}: the dead end joins the run`);
    assert.equal(nextHint(p, stuck).action.type, 'lift', `${p.id}: the hint takes a dead end back`);
    steps += hintsSolve(p, stuck, 'after a dead end');
    // The loop, played: rings before the start until one comes again.
    let a = fresh;
    for (const r of [[0, 1, 1], [1, 1, 0], [1, 0, 1]]) a = build(p, a, r);
    assert.ok(isSolved(p, a.board), `${p.id}: the loop solves`);
    for (let k = 1; k <= 6; k++) { const r = Array.from({length: k}).reduce(step, a.board.run[0]); assert.ok(r.some(v => v), 'the loop never reaches zero'); }
    assert.equal(validBoard(p, {run: [[1, 0, 1], [1, 0, 1]], draft: [null, null, null]}), false, `${p.id}: rejects a ring that does not make the next`);
    return steps;
  }
  assert.equal(q.goal.moves, row.moves, `${p.id}: goal`);
  assert.ok(row.moves <= LONGEST[q.cap], `${p.id}: the goal can be reached`);
  refuse(p, fresh, {type: 'lift'}, 'taking back from an empty row');
  refuse(p, fresh, {type: 'cant', marks: [0]}, 'Can’t');
  // A dead end: a ring before the first whose run back is too short.
  const flat = [1, 1, 1, 1];
  let a = build(p, fresh, flat);
  assert.equal(a.board.run.length, 1, `${p.id}: a flat ring joins the run`);
  steps += hintsSolve(p, a, 'after a flat ring of 1s');
  const dead = predecessors(flat, q.cap).find(r => deepest(r, q.cap) < row.moves - 2);
  if (dead) {
    a = build(p, a, dead);
    assert.equal(nextHint(p, a).action.type, 'lift', `${p.id}: the hint takes a dead end back`);
    steps += hintsSolve(p, a, 'after a dead end');
  }
  // A witness run, built back from zero.
  let w = fresh;
  for (const r of p.solution.run.slice().reverse()) w = build(p, w, r.split(',').map(Number));
  assert.ok(isSolved(p, w.board), `${p.id}: the witness run solves`);
  assert.equal(runLength(p.solution.run[0].split(',').map(Number)), row.moves, `${p.id}: the witness takes ${row.moves} moves`);
  refuse(p, fresh, {type: 'set', station: 0, h: q.cap + 1}, 'a tower over the cap');
  const zeroDraft = build(p, fresh, [0, 0, 0, 0]);
  assert.equal(zeroDraft.board.run.length, 0, `${p.id}: all zeros is no move`);
  for (const [board, why] of [[{run: [[1, 1, 1, 2]], draft: [null, null, null, null]}, 'a first ring that does not make zero'], [{run: [[0, 1, 0, 1], [2, 2, 2, 2]], draft: [null, null, null, null]}, 'a ring that does not make the next'], [{run: [[q.cap + 1, q.cap + 1, q.cap + 1, q.cap + 1]], draft: [null, null, null, null]}, 'a ring over the cap'], [{run: [[0, 0, 0, 0]], draft: [null, null, null, null]}, 'all zeros in the run'], [{run: Array(row.moves + 1).fill([1, 1, 1, 1]), draft: [null, null, null, null]}, 'a run past the goal'], [{run: [], draft: [0, 0, 0]}, 'a short draft']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPlayground(p, fresh) {
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  let a = build(p, fresh, [2, 2, 2, 2]);
  for (const r of [[0, 2, 0, 2], [0, 0, 2, 2], [1, 1, 1, 3], [0, 1, 2, 3], [1, 1, 2, 4], [0, 1, 2, 4]]) a = build(p, a, r);
  assert.equal(a.board.run.length, 7, `${p.id}: a run of seven`);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  const lifted = play(p, a, {type: 'lift'});
  assert.deepEqual(lifted.board.draft, [0, 1, 2, 4], `${p.id}: the newest ring comes back to change`);
  refuse(p, fresh, {type: 'set', station: 0, h: 6}, 'a tower over 5');
  assert.equal(validBoard(p, {run: [[6, 6, 6, 6]], draft: [null, null, null, null]}), false, `${p.id}: rejects a tower over 5`);
}
export default validateDiffs;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateDiffs(), null, 2));
