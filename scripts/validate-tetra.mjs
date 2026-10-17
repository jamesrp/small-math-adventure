// Checks the Mirror twins pack (dist/families/tetra/tetra.json): content
// fields and sources; the solid rebuilt from four corners of a cube, its four
// turns recomputed by Rodrigues' formula, and the group they make (twelve
// matrices of determinant +1, exactly the even permutations of the corners,
// never a reflection); matching recomputed by parity for all 65,536 pairs of
// labellings, with the classes of every multiset of letters; the view-from-A
// certificate checked against every pair of twins and every trace, and the
// share of random traces it accepts; every puzzle's answers by those methods;
// witnesses played as moves; hint chains from fresh, after random play, after
// form refusals, wrong claims, a wrong That's all and every set-up; Undo with
// the mechanic's carry (refusals stay, the screen changes); illegal moves;
// forged saves; the playground; hint CPU time.
// Run: node scripts/validate-tetra.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {TURN, SPOT, SOLID, ROTATIONS, LETTERS, canMatch, clockwise, judge, labelsOf, classesOf} from '../dist/families/tetra/tetra.js';
import {loadPack} from './packs.mjs';

// --- The solid, independently ------------------------------------------------
const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const sub = (u, v) => u.map((x, i) => x - v[i]);
const scale = (u, s) => u.map(x => x * s);
const unit = u => scale(u, 1 / Math.hypot(...u));
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const near = (u, v, e = 1e-9) => u.every((x, i) => Math.abs(x - v[i]) < e);
// Alternate corners of a cube, turned so that the first faces the eye (+z)
// and the second is straight above it on the screen (+y).
const CUBE = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(unit);
const ez = CUBE[0], ey = unit(sub(CUBE[1], scale(ez, dot(CUBE[1], ez)))), ex = cross(ey, ez);
let CORNERS = CUBE.map(v => [dot(v, ex), dot(v, ey), dot(v, ez)]);
// Positions: the middle, the top, then the right (x > 0) and the left.
const rightOf = [2, 3].find(k => CORNERS[k][0] > 0), leftOf = 5 - rightOf;
CORNERS = [CORNERS[0], CORNERS[1], CORNERS[rightOf], CORNERS[leftOf]];
// Rodrigues: the turn by angle t about the unit axis u.
const rodrigues = (u, t) => [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((_, r) => [0, 1, 2].map(c => (r === c ? Math.cos(t) : 0) + (1 - Math.cos(t)) * u[r] * u[c] + Math.sin(t) * [[0, -u[2], u[1]], [u[2], 0, -u[0]], [-u[1], u[0], 0]][r][c]));
const apply = (M, v) => M.map(row => dot(row, v));
const mul = (A, B) => A.map(row => [0, 1, 2].map(c => row[0] * B[0][c] + row[1] * B[1][c] + row[2] * B[2][c]));
const det = M => dot(M[0], cross(M[1], M[2]));
// Clockwise as seen from outside, looking at the corner: -120° by the right-hand rule.
const TURNS = CORNERS.map(c => rodrigues(c, -2 * Math.PI / 3));
const permOf = M => CORNERS.map(v => CORNERS.findIndex(w => near(apply(M, v), w)));
const parity = g => { let n = 0; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (g[i] > g[j]) n++; return n % 2; };
function permutations(list) { if (list.length < 2) return [list]; return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest])); }
const EVEN = permutations([0, 1, 2, 3]).filter(g => parity(g) === 0);
// Screen points: x right, y down; the outer corners 36 from the middle at (50, 52).
const R0 = Math.hypot(CORNERS[1][0], CORNERS[1][1]);
const screen = v => [50 + v[0] * 36 / R0, 52 - v[1] * 36 / R0];
// An arrow from a through b (the short way round the middle) runs clockwise on
// the screen when the turn from a to b is positive with y pointing down.
const screenClockwise = (a, b) => { const c = screen(CORNERS[0]), u = sub(screen(CORNERS[a]), c), v = sub(screen(CORNERS[b]), c); return u[0] * v[1] - u[1] * v[0] > 0; };

// --- Matching, independently ---------------------------------------------------
// Turning carries the letter at position i to position g[i]; two models match
// when some even permutation g has L[g[i]] = R[i] at every position.
const matchV = (L, R) => EVEN.some(g => [0, 1, 2, 3].every(i => L[g[i]] === R[i]));
const words = (list, n) => n ? list.flatMap(x => words(list, n - 1).map(w => [x, ...w])) : [[]];
const ALL = words(LETTERS, 4);
const bag = w => [...w].sort().join('');

// --- Playing --------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const playAll = (p, a, actions) => actions.reduce((b, x) => play(p, b, x), a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const view = (p, a) => { const m = mechanicFor(p); m.reset?.(p); return m.render(p, {...a, hintLevel: 0}); };
// Undo as the app does it: one step back, then the mechanic's carry. The
// screen must change.
function undoCarry(p, a) {
  const m = mechanicFor(p), before = m.render(p, {...a, hintLevel: 0});
  let next = undo(a);
  if (next !== a && m.carry) next = {...next, board: m.carry(p, a.board, next.board)};
  assert.ok(validBoard(p, next.board), `${p.id}: Undo leaves a valid board`);
  assert.notEqual(m.render(p, {...next, hintLevel: 0}), before, `${p.id}: Undo changes the screen`);
  return next;
}
let hintCpu = 0, hintCalls = 0, rescues = 0;
function hintAt(p, a) {
  const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t), ms = (u.user + u.system) / 1000;
  hintCpu = Math.max(hintCpu, ms); hintCalls++;
  assert.ok(ms < 100, `${p.id}: a quick hint (${ms} ms CPU)`);
  return h;
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 80; steps++) {
    const h = hintAt(p, a);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint with words`);
    if (h.type === 'deadend') { const b = undoToSolvable(p, a); assert.notEqual(b, a, `${p.id} ${label}: the rescue Undo goes back`); a = b; rescues++; continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    if (h.action.type === 'cant') assert.ok(!/^Press/.test(h.text), `${p.id}: the reason before Can’t`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A small seeded generator for random play.
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const pick = (rand, list) => list[Math.floor(rand() * list.length)];
const TRACES = [[1, 2], [1, 3], [2, 1], [2, 3], [3, 1], [3, 2]];
// Every move the mechanic might be offered on a board.
function candidates(p, b) {
  const q = p.parameters, out = [];
  if (q.mode === 'sort') { q.cards.forEach((_, n) => [0, 1, 2, 3].forEach(at => out.push({type: 'turn', card: n, at}))); out.push({type: 'all'}); return out; }
  for (const at of [0, 1, 2, 3]) out.push({type: 'turn', at});
  for (const drop of LETTERS) for (const keep of LETTERS) if (drop !== keep) out.push({type: 'merge', drop, keep});
  if (q.mode === 'merges') { out.push({type: 'all'}); return out; }
  for (const side of ['left', 'right']) for (const at of [0, 1, 2, 3]) out.push({type: 'place', side, at});
  for (const left of TRACES) for (const right of TRACES) out.push({type: 'cant', left, right});
  return out;
}
function randomPlay(p, a, rand, n) {
  for (let k = 0; k < n && !isSolved(p, a.board); k++) {
    const legal = candidates(p, a.board).map(x => [x, move(p, a, x)]).filter(([, b]) => b && !isSolved(p, b.board));
    if (!legal.length) break;
    a = pick(rand, legal)[1];
  }
  return a;
}

// --- The table in docs/tetra/README.md -------------------------------------------
// Models are letters by position: middle, top, right, left.
const TABLE = {
  'tetra-01': {kind: 'turn', can: true, fewest: 1},
  'tetra-02': {kind: 'turn', cant: true, can: true, fewest: 2},
  'tetra-03': {kind: 'turn', cant: true, can: false},
  'tetra-04': {kind: 'turn', cant: true, can: true, fewest: 1},
  'tetra-05': {kind: 'turn', cant: true, can: true, fewest: 1},
  'tetra-06': {kind: 'merge', merges: 12},
  'tetra-07': {kind: 'change', goal: 'match', match: ['0,2', '3,0']},
  'tetra-08': {kind: 'merges', taps: {AB: 1, AC: 2, AD: 3, BC: 0, BD: 2, CD: 1}},
  'tetra-09': {kind: 'blank', apart: 12, of: 24},
  'tetra-10': {kind: 'change', goal: 'apart', apart: ['0,0', '3,2']},
  'tetra-11': {kind: 'sort', stacks: 2},
  'tetra-12': {kind: 'sort', stacks: 3}
};
// Fewest taps from R to L by breadth-first search over the recomputed turns.
function fewest(L, R) {
  const key = w => w.join(''), seen = new Map([[key(R), []]]), queue = [R];
  for (let n = 0; n < queue.length; n++) {
    const w = queue[n];
    if (key(w) === key(L)) return seen.get(key(w));
    TURNS.forEach((M, k) => { const g = permOf(M), next = []; w.forEach((x, i) => { next[g[i]] = x; }); if (!seen.has(key(next))) { seen.set(key(next), [...seen.get(key(w)), k]); queue.push(next); } });
  }
  return null;
}
// Letters by position after the right model has turned to pose `at`.
const poseOf = (taps) => { let at = [0, 1, 2, 3]; for (const k of taps) { const g = permOf(TURNS[k]), next = []; at.forEach((s, i) => { next[g[i]] = s; }); at = next; } return at; };
// The nearest pose (at least one tap away, through no solved board) whose
// letters satisfy `want`, played as turns.
function reach(p, start, want) {
  const seen = new Set(), queue = [start];
  for (let n = 0; n < queue.length; n++) for (const at of [0, 1, 2, 3]) {
    const b = move(p, queue[n], {type: 'turn', at});
    if (!b || isSolved(p, b.board) || seen.has(b.board.at.join())) continue;
    if (want(labelsOf(b.board.letters, b.board.at))) return b;
    seen.add(b.board.at.join()); queue.push(b);
  }
  assert.fail(`${start.puzzleId || ''}: no pose found`);
}
// Every pose, with the fewest taps that reach it (breadth first).
const POSES = (() => { const out = new Map([['0,1,2,3', []]]), queue = [[]]; for (let n = 0; n < queue.length; n++) for (const k of [0, 1, 2, 3]) { const t = [...queue[n], k], key = poseOf(t).join(); if (!out.has(key)) { out.set(key, t); queue.push(t); } } return [...out.values()]; })();

export async function validateTetra() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/tetra/tetra.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-37')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-37.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'tetra');

  // The solid and its turns.
  CORNERS.forEach((v, k) => assert.ok(near(v, SOLID[k], 1e-12), `corner ${k} of the solid`));
  CORNERS.forEach((v, k) => assert.ok(near(screen(v), SPOT[k], 0.01), `corner ${k} drawn where it projects`));
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(Math.abs(Math.hypot(...sub(CORNERS[i], CORNERS[j])) - Math.sqrt(8 / 3)) < 1e-12, 'a regular tetrahedron');
  assert.deepEqual(TURNS.map(permOf), TURN, 'the four turns, by Rodrigues’ formula');
  TURN.forEach((g, k) => { assert.equal(g[k], k, `a tap on ${k} keeps that corner`); assert.equal(parity(g), 0); });
  assert.ok(screenClockwise(1, 2) && screenClockwise(2, 3) && screenClockwise(3, 1), 'top, right, left run clockwise on the screen');
  assert.deepEqual([1, 2, 3].map(a => TURN[0][a]), [2, 3, 1], 'a tap on the middle moves them clockwise');
  for (const a of [1, 2, 3]) for (const b of [1, 2, 3]) if (a !== b) assert.equal(clockwise(a, b), screenClockwise(a, b), 'the arrows’ way round');
  const group = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]];
  for (let n = 0; n < group.length; n++) for (const T of TURNS) { const M = mul(T, group[n]); if (!group.some(G => G.every((row, r) => near(row, M[r])))) group.push(M); }
  assert.equal(group.length, 12, 'twelve rotations');
  assert.ok(group.every(M => Math.abs(det(M) - 1) < 1e-9), 'every one of determinant +1');
  const perms = group.map(permOf).map(g => g.join()).sort();
  assert.deepEqual(perms, EVEN.map(g => g.join()).sort(), 'exactly the even permutations of the corners');
  assert.deepEqual(ROTATIONS.map(g => g.join()).sort(), perms, 'the mechanic’s rotations');
  assert.equal(POSES.length, 12, 'taps reach all twelve poses');
  assert.ok(POSES.every(t => t.length <= 3), 'every pose within three taps');

  // Matching by parity, every pair of labellings.
  let pairs = 0;
  for (const L of ALL) for (const R of ALL) { assert.equal(canMatch(L, R), matchV(L, R), `${L.join('')} ~ ${R.join('')}`); pairs++; }
  const classCount = {};
  for (const w of ALL) { const b = bag(w); classCount[b] ??= []; if (!classCount[b].some(r => matchV(r, w))) classCount[b].push(w); }
  for (const [b, reps] of Object.entries(classCount)) {
    const size = ALL.filter(w => bag(w) === b).length;
    assert.equal(reps.length, new Set(b).size === 4 ? 2 : 1, `${b}: ${new Set(b).size === 4 ? 'two classes' : 'one class'}`);
    if (new Set(b).size === 4) assert.ok(reps.every(r => ALL.filter(w => matchV(r, w)).length === 12) && size === 24, 'two classes of twelve');
  }
  // Every merge of a pair of twins matches.
  const DISTINCT = ALL.filter(w => new Set(w).size === 4);
  for (const L of DISTINCT) for (const R of DISTINCT) if (!matchV(L, R)) for (const d of LETTERS) for (const k of LETTERS) if (d !== k) assert.ok(matchV(L.map(x => x === d ? k : x), R.map(x => x === d ? k : x)), 'any two letters made the same let the twins match');

  // The certificate: with one letter in the middle of both, the arrows along
  // the same two letters run opposite ways exactly when the pair can't match.
  // And the proof in the notes: the turns that keep the middle are three, and
  // keep the way round.
  const keepMiddle = EVEN.filter(g => g[0] === 0);
  assert.equal(keepMiddle.length, 3, 'three turns keep the middle');
  assert.ok(keepMiddle.every(g => [1, 2, 3].every(a => [1, 2, 3].every(b => a === b || screenClockwise(a, b) === screenClockwise(g[a], g[b])))), 'and keep the way round');
  let certified = 0;
  for (const L of DISTINCT) for (const R of DISTINCT) {
    if (L[0] !== R[0]) { assert.deepEqual(judge(L, R, [1, 2], [1, 2]), {told: 'middle'}); continue; }
    for (const t of TRACES) {
      const x = L[t[0]], y = L[t[1]], u = [R.indexOf(x), R.indexOf(y)];
      const opposite = screenClockwise(...t) !== screenClockwise(...u);
      assert.equal(opposite, !matchV(L, R), 'opposite arrows exactly for twins');
      assert.deepEqual(judge(L, R, t, u), opposite ? {ok: true} : {kind: 'round'});
      for (const w of TRACES) if (w.join() !== u.join()) assert.deepEqual(judge(L, R, t, w), {told: 'letters'});
      certified++;
    }
  }
  // With a repeated letter the arrows can run opposite ways and the pair still match.
  const wayRefusals = ALL.filter(w => new Set(w).size === 3).flatMap(L => ALL.filter(R => bag(R) === bag(L) && R[0] === L[0]).flatMap(R => TRACES.flatMap(t => TRACES.filter(u => judge(L, R, t, u).kind === 'way')))).length;
  assert.ok(wayRefusals > 0, 'a repeated letter can fool the arrows, and is refused');

  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');

  let hintSteps = 0;
  const accept = {};
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'tetra');
    assert.ok(p.id.startsWith('tetra-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(p.controls.startsWith('A model is a solid'), `${p.id}: How to play opens with the mathematics`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(!/press can/i.test(p.hints[0]), `${p.id}: the first hint is not Can’t`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const first = hintAt(p, fresh);
    assert.equal(first.type, 'move', `${p.id}: a first hint`);
    assert.notEqual(first.action.type, 'cant', `${p.id}: never Can’t first`);
    assert.notEqual(first.action.type, 'all', `${p.id}: never That’s all first`);
    const row = TABLE[p.id];
    if (row.kind === 'turn') hintSteps += checkTurn(p, fresh, row, accept);
    else if (row.kind === 'merge') hintSteps += checkMerge(p, fresh, row);
    else if (row.kind === 'change' || row.kind === 'blank') hintSteps += checkSetup(p, fresh, row, accept);
    else if (row.kind === 'merges') hintSteps += checkMerges(p, fresh, row);
    else hintSteps += checkSort(p, fresh, row);
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    // Random play, then hints, Undo on the way.
    const rand = seeded(p.number * 7919);
    for (let run = 0; run < 25; run++) {
      let a = randomPlay(p, fresh, rand, 1 + Math.floor(rand() * 10));
      if (a.history.length && run % 3 === 0) a = undoCarry(p, a);
      hintSteps += hintsSolve(p, a, `after random play ${run}`);
    }
    checkForged(p, fresh);
  }
  return {tetraPuzzles: puzzles.length, labellingPairs: pairs, certificateTraces: certified, repeatedLetterWayRefusals: wayRefusals, randomTraceAcceptance: accept, hintSteps, rescues, hintCalls, slowestHintMs: hintCpu};
}

// Turn to match, or show with Can't that no turn can.
function checkTurn(p, fresh, row, accept) {
  const q = p.parameters, L = q.left, R = q.right;
  let steps = 0;
  assert.equal(matchV(L, R), row.can, `${p.id}: can match`);
  assert.equal(bag(L), bag(R), `${p.id}: the same letters`);
  assert.equal(Boolean(q.cant), Boolean(row.cant), `${p.id}: Can’t on offer`);
  if (row.can) {
    const w = fewest(L, R);
    assert.equal(w.length, row.fewest, `${p.id}: fewest taps`);
    const a = playAll(p, fresh, w.map(at => ({type: 'turn', at})));
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    refuse(p, a, {type: 'turn', at: 0}, 'a move after a solve');
  }
  if (!q.cant) { refuse(p, playAll(p, fresh, [{type: 'turn', at: 1}]), {type: 'cant', left: [1, 2], right: [1, 2]}, 'Can’t where none is offered'); return steps; }
  // Can't comes after an attempt.
  for (const t of TRACES) refuse(p, fresh, {type: 'cant', left: t, right: t}, 'Can’t before a turn');
  steps += traceShare(p, fresh, accept);
  // A pose with the other model's middle letter, a turn away from the start,
  // that does not match.
  const a = reach(p, fresh, X => X[0] === L[0]), Rn = labelsOf(R, a.board.at);
  // Form refusals: another middle letter; letters that don't follow.
  const b = reach(p, fresh, X => X[0] !== L[0]);
  const told = play(p, b, {type: 'cant', left: [1, 2], right: [1, 2]});
  assert.equal(told.board.told, 'middle', `${p.id}: not the same letter in the middle`);
  assert.equal(told.board.claim, null, `${p.id}: a form refusal makes no claim`);
  undoCarry(p, told);
  steps += hintsSolve(p, told, 'after “not the same letter in the middle”');
  const t = [1, 2], u = [Rn.indexOf(L[1]), Rn.indexOf(L[2])], wrongU = TRACES.find(w => w.join() !== u.join() && !(Rn[w[0]] === L[1] && Rn[w[1]] === L[2]));
  const lettersTold = play(p, a, {type: 'cant', left: t, right: wrongU});
  assert.equal(lettersTold.board.told, 'letters', `${p.id}: follow the same letters`);
  steps += hintsSolve(p, lettersTold, 'after “follow the same letters”');
  if (!row.can) {
    const ok = play(p, a, {type: 'cant', left: t, right: u});
    assert.ok(isSolved(p, ok.board), `${p.id}: the certificate solves`);
    assert.equal(ok.board.claim.ok, true);
    return steps;
  }
  // A wrong claim: refused, kept through Undo and turns, and Can't stays off.
  const wrongs = TRACES.flatMap(x => TRACES.map(y => [x, y])).filter(([x, y]) => { const r = judge(L, Rn, x, y); return r.kind; });
  assert.ok(wrongs.length > 0, `${p.id}: a claim that can fail`);
  for (const [x, y] of wrongs) {
    const c = play(p, a, {type: 'cant', left: x, right: y});
    assert.ok(!isSolved(p, c.board), `${p.id}: a wrong claim does not solve`);
    assert.equal(c.board.claim.ok, false);
    assert.equal(c.board.told, c.board.claim.kind, `${p.id}: one short refusal`);
    for (const [v, w] of TRACES.map(v => [v, v])) refuse(p, c, {type: 'cant', left: v, right: w}, 'Can’t again on the same letters');
    const back = undoCarry(p, c);
    assert.deepEqual(back.board.claim, c.board.claim, `${p.id}: Undo keeps the refused claim`);
    assert.equal(back.board.told, null, `${p.id}: Undo takes the message away`);
    const turned = play(p, back, {type: 'turn', at: 0});
    assert.deepEqual(turned.board.claim, c.board.claim, `${p.id}: a turn keeps the refused claim`);
    for (const [v, w] of TRACES.flatMap(v => TRACES.map(w => [v, w]))) refuse(p, turned, {type: 'cant', left: v, right: w}, 'Can’t while refused');
    const backTwice = undoCarry(p, undoCarry(p, turned));
    assert.deepEqual(backTwice.board.claim, c.board.claim, `${p.id}: Undo past the turn keeps the claim`);
    steps += hintsSolve(p, c, 'after a wrong claim');
  }
  return steps;
}
// Over every pose (with a turn made) and every pair of traces, how many claims
// the app accepts: the share a child tapping at random would hit.
function traceShare(p, start, accept) {
  let ok = 0, wrong = 0, form = 0;
  const q = p.parameters;
  // Every pose a turn or more away (through no solved board), the start's own included.
  const seen = new Map(), queue = [start];
  for (let n = 0; n < queue.length; n++) for (const at of [0, 1, 2, 3]) {
    const b = move(p, queue[n], {type: 'turn', at});
    if (!b || isSolved(p, b.board) || seen.has(b.board.at.join())) continue;
    seen.set(b.board.at.join(), b); queue.push(b);
  }
  for (const a of seen.values()) {
    const L = a.board.left;
    for (const x of TRACES) for (const y of TRACES) {
      const b = move(p, a, {type: 'cant', left: x, right: y});
      assert.ok(b, `${p.id}: a claim is judged`);
      if (b.board.claim?.ok) { ok++; assert.ok(!matchV(L, labelsOf(b.board.letters, a.board.at)), `${p.id}: only a true claim is accepted`); }
      else if (b.board.claim) wrong++; else form++;
    }
  }
  const total = ok + wrong + form;
  accept[p.id] = `${ok}/${total} accepted (${(100 * ok / total).toFixed(1)}%), ${wrong} refused as wrong, ${form} refused for their form`;
  if (matchV(start.board.left, labelsOf(start.board.letters, start.board.at))) assert.equal(ok, 0, `${p.id}: no claim accepted on a pair that matches`);
  else assert.ok(ok > 0, `${p.id}: the true claim can be made`);
  assert.ok(ok / total < 0.05, `${p.id}: random traces rarely succeed`);
  return 0;
}
// Make two letters the same, then turn.
function checkMerge(p, fresh, row) {
  const q = p.parameters;
  let n = 0, steps = 0;
  assert.equal(matchV(q.left, q.right), false, `${p.id}: no turn matches before the change`);
  for (const drop of LETTERS) for (const keep of LETTERS) if (drop !== keep) {
    const a = play(p, fresh, {type: 'merge', drop, keep}), L = a.board.left, R = labelsOf(a.board.letters, a.board.at);
    assert.ok(matchV(L, R), `${p.id}: ${drop} to ${keep} lets them match`);
    refuse(p, a, {type: 'merge', drop: keep, keep: drop}, 'a second change');
    const w = fewest(L, R);
    const b = playAll(p, a, w.map(at => ({type: 'turn', at})));
    assert.ok(isSolved(p, b.board), `${p.id}: ${drop} to ${keep}, then the turns`);
    n++;
  }
  assert.equal(n, row.merges, `${p.id}: every change works`);
  const turned = play(p, fresh, {type: 'turn', at: 1});
  steps += hintsSolve(p, turned, 'after a turn first');
  refuse(p, fresh, {type: 'merge', drop: 'D', keep: 'D'}, 'a letter into itself');
  refuse(p, fresh, {type: 'merge', drop: 'E', keep: 'A'}, 'an unknown letter');
  return steps;
}
// Set-ups: change an A on each, or put A, B, C, D on blank corners.
function checkSetup(p, fresh, row, accept) {
  const q = p.parameters;
  let steps = 0;
  const sides = ['left', 'right'].filter(s => q.place[s]);
  // Every way to finish, as placements.
  const finishes = [];
  (function go(a, made) {
    const open = sides.find(s => a.board.placed[s] < q.place[s].letters.length);
    if (!open) { finishes.push({a, made}); return; }
    for (let at = 0; at < 4; at++) { const b = move(p, a, {type: 'place', side: open, at}); if (b) go(b, [...made, at]); }
  })(fresh, []);
  const apart = finishes.filter(f => !matchV(f.a.board.left, labelsOf(f.a.board.letters, f.a.board.at)));
  if (row.kind === 'blank') {
    assert.equal(finishes.length, row.of, `${p.id}: every placement`);
    assert.equal(apart.length, row.apart, `${p.id}: placements that can't match`);
  } else {
    const key = f => f.made.join(), match = finishes.filter(f => !apart.includes(f));
    assert.equal(finishes.length, 4, `${p.id}: four ways to change one A on each`);
    assert.ok(matchV(q.left, q.right), `${p.id}: the pair matches before the change`);
    if (row.goal === 'match') assert.deepEqual(match.map(key), row.match, `${p.id}: changes that match`);
    else assert.deepEqual(apart.map(key), row.apart, `${p.id}: changes that can’t`);
  }
  for (const f of finishes) {
    const L = f.a.board.left, R = labelsOf(f.a.board.letters, f.a.board.at), can = matchV(L, R);
    assert.equal(bag(L), bag(R), `${p.id}: both end with the same letters`);
    if (q.goal === 'match') {
      if (can) { const b = playAll(p, f.a, fewest(L, R).map(at => ({type: 'turn', at}))); assert.ok(isSolved(p, b.board), `${p.id}: a change that matches, then turns`); }
      else { assert.equal(hintAt(p, f.a).type, 'deadend', `${p.id}: a wrong change is a dead end`); steps += hintsSolve(p, f.a, `after the change ${f.made.join()}`); }
      continue;
    }
    // Apart: a twin is certified after a turn; a pair that matches never is.
    if (!can) {
      const a = reach(p, f.a, X => X[0] === L[0]), Rn = labelsOf(a.board.letters, a.board.at);
      const b = play(p, a, {type: 'cant', left: [1, 2], right: [Rn.indexOf(L[1]), Rn.indexOf(L[2])]});
      assert.ok(isSolved(p, b.board), `${p.id}: the twin ${f.made.join()} certified`);
      assert.ok(!isSolved(p, playAll(p, f.a, [{type: 'turn', at: 0}, {type: 'turn', at: 0}, {type: 'turn', at: 0}]).board), `${p.id}: a set-up alone is no solve`);
    } else {
      assert.equal(hintAt(p, f.a).type, 'deadend', `${p.id}: a pair that matches is a dead end`);
      steps += hintsSolve(p, f.a, `after the placement ${f.made.join()}`);
    }
  }
  if (q.cant) traceShare(p, apart[0].a, accept);
  // No turn or claim before the set-up is done.
  refuse(p, fresh, {type: 'turn', at: 0}, 'a turn during the set-up');
  for (const t of TRACES) refuse(p, fresh, {type: 'cant', left: t, right: t}, 'Can’t during the set-up');
  const s = sides[0], wrongAt = [0, 1, 2, 3].find(at => (s === 'left' ? q.left : q.right)[at] !== q.place[s].on);
  if (wrongAt !== undefined) refuse(p, fresh, {type: 'place', side: s, at: wrongAt}, 'a letter on a corner that is not to change');
  const once = play(p, fresh, {type: 'place', side: s, at: (s === 'left' ? q.left : q.right).indexOf(q.place[s].on)});
  refuse(p, once, {type: 'place', side: s, at: (s === 'left' ? q.left : q.right).indexOf(q.place[s].on)}, 'the same corner twice');
  undoCarry(p, once);
  return steps;
}
// Every pair of letters that, made the same, lets the twins match.
function checkMerges(p, fresh, row) {
  const q = p.parameters;
  let steps = 0, a = fresh;
  assert.equal(matchV(q.left, q.right), false, `${p.id}: twins`);
  refuse(p, fresh, {type: 'all'}, 'That’s all with nothing found');
  const taps = {};
  for (const pair of ['AB', 'AC', 'AD', 'BC', 'BD', 'CD']) {
    const [keep, drop] = pair, L = q.left.map(x => x === drop ? keep : x), R = q.right.map(x => x === drop ? keep : x);
    assert.ok(matchV(L, R), `${p.id}: ${pair} works`);
    taps[pair] = fewest(L, R).length;
    const before = a.board.found.length;
    a = play(p, a, {type: 'merge', drop, keep});
    for (const at of fewest(L, R)) a = play(p, a, {type: 'turn', at});
    assert.equal(a.board.found.length, before + 1, `${p.id}: ${pair} goes on the shelf`);
    assert.deepEqual([a.board.left, a.board.letters, a.board.merged, a.board.at], [q.left, q.right, null, [0, 1, 2, 3]], `${p.id}: both models start again`);
    if (pair === 'AB') {
      // The same pair the other way round is found already.
      const again = playAll(p, a, [{type: 'merge', drop: keep, keep: drop}, ...fewest(L.map(x => x === keep ? drop : x), R.map(x => x === keep ? drop : x)).map(at => ({type: 'turn', at}))]);
      assert.deepEqual(again.board.told, {kind: 'again', pair: 'AB'}, `${p.id}: found already`);
      assert.deepEqual(again.board.found, a.board.found);
      // That's all now is refused, once, kept through Undo.
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.told, 'more', `${p.id}: there is another`);
      assert.ok(!isSolved(p, early.board));
      refuse(p, early, {type: 'all'}, 'That’s all again before a new pair');
      const back = undoCarry(p, early);
      assert.equal(back.board.refused, early.board.found.length, `${p.id}: Undo keeps the refusal`);
      refuse(p, back, {type: 'all'}, 'That’s all after Undo, on the same shelf');
      steps += hintsSolve(p, early, 'after a wrong That’s all');
      // Undo after a pair is shelved keeps it on the shelf.
      const kept = undoCarry(p, a);
      assert.deepEqual(kept.board.found, a.board.found, `${p.id}: Undo keeps the pairs found`);
    }
  }
  assert.deepEqual(taps, row.taps, `${p.id}: fewest taps after each change`);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every pair`);
  return steps;
}
// Sort models into stacks that match.
function checkSort(p, fresh, row) {
  const q = p.parameters;
  let steps = 0;
  assert.equal(new Set(q.cards.map(c => c.join(''))).size, q.cards.length, `${p.id}: no two cards start alike`);
  const classes = [];
  q.cards.forEach((c, n) => { const k = classes.find(g => matchV(q.cards[g[0]], c)); if (k) k.push(n); else classes.push([n]); });
  assert.equal(classes.length, row.stacks, `${p.id}: classes`);
  assert.deepEqual(classesOf(q.cards), classes, `${p.id}: the mechanic’s classes`);
  refuse(p, fresh, {type: 'all'}, 'That’s all before a turn');
  let a = fresh;
  for (const g of classes) for (const n of g.slice(1)) for (const at of fewest(q.cards[g[0]], q.cards[n])) a = play(p, a, {type: 'turn', card: n, at});
  const ready = a;
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: stacked by class, That’s all`);
  // One stack short of joined: refused, and kept while the stacks are the same.
  const last = classes.find(g => g.length > 1), m = last.at(-1);
  const short = playAll(p, fresh, classes.flatMap(g => g.slice(1).filter(n => n !== m).flatMap(n => fewest(q.cards[g[0]], q.cards[n]).map(at => ({type: 'turn', card: n, at})))));
  const told = play(p, short, {type: 'all'});
  assert.equal(told.board.told, 'more', `${p.id}: some can still match`);
  refuse(p, told, {type: 'all'}, 'That’s all again on the same stacks');
  const back = undoCarry(p, told);
  refuse(p, back, {type: 'all'}, 'That’s all after Undo, on the same stacks');
  // Turning a card round three times brings the same stacks back, still refused.
  const round = playAll(p, back, [0, 0, 0].map(at => ({type: 'turn', card: m, at})));
  refuse(p, round, {type: 'all'}, 'That’s all on the same stacks after turning round');
  steps += hintsSolve(p, told, 'after a wrong That’s all');
  assert.ok(classes.every(g => g.every(n => bag(q.cards[n]) === bag(q.cards[g[0]]))), `${p.id}: a stack keeps its letters`);
  refuse(p, fresh, {type: 'turn', card: q.cards.length, at: 0}, 'an unknown card');
  refuse(p, ready, {type: 'turn', card: 0, at: 4}, 'an unknown corner');
  return steps;
}
function checkForged(p, fresh) {
  const q = p.parameters, B = fresh.board, reflect = [0, 1, 3, 2];
  const forged = [[{...B, extra: 1}, 'an unknown field'], [null, 'nothing']];
  if (q.mode === 'sort') {
    forged.push([{...B, cards: B.cards.map((c, n) => n ? c : reflect), tried: true}, 'a reflected model']);
    forged.push([{...B, done: true}, 'a done sort that is not sorted']);
    forged.push([{...B, tried: true, refused: classesOf(q.cards)}, 'a refusal of the right stacks']);
    forged.push([{...B, tried: true, told: 'more', refused: null}, 'a message with no refusal']);
    forged.push([{...B, cards: B.cards.slice(1)}, 'a missing card']);
  } else if (q.mode === 'merges') {
    forged.push([{...B, at: reflect, tried: true}, 'a reflected model']);
    forged.push([{...B, done: true}, 'a done shelf that is short']);
    forged.push([{...B, found: ['AB', 'AB']}, 'a pair found twice']);
    forged.push([{...B, found: ['AE']}, 'an unknown pair']);
    forged.push([{...B, told: 'more'}, 'a refusal with nothing found']);
    forged.push([{...B, found: ['AB'], refused: 2}, 'a refusal past the shelf']);
    forged.push([{...B, left: [...B.left.slice(0, 3), 'A']}, 'letters that do not follow']);
    forged.push([{...B, merged: ['D', 'C']}, 'a merge with the letters unchanged']);
  } else {
    forged.push([{...B, at: reflect, tried: true}, 'a reflected model']);
    forged.push([{...B, at: [1, 2, 3, 0], tried: true}, 'a pose no turn reaches']);
    forged.push([{...B, at: [0, 2, 3, 1], tried: false}, 'a turn not marked tried']);
    forged.push([{...B, letters: B.letters.map((x, i) => i ? x : x === 'D' ? 'A' : 'D')}, 'letters that do not follow']);
    forged.push([{...B, claim: {ok: true, at: [0, 1, 2, 3], left: [1, 2], right: [1, 2]}, tried: true}, 'a claim the letters do not support']);
    forged.push([{...B, told: 'round'}, 'a refusal message with no claim']);
    forged.push([{...B, merged: ['D', 'C']}, 'a merge that never happened']);
    forged.push([{...B, placed: {left: 1, right: 0}}, 'a letter placed that is not on']);
    if (q.cant && !matchV(q.left, q.right)) forged.push([{...B, claim: {ok: true, at: [0, 1, 2, 3], left: [1, 2], right: [1, 2]}, tried: false}, 'a right claim before a turn']);
    if (q.cant && matchV(q.left, q.right) && q.left[0] === q.right[0]) {
      const L = q.left, R = q.right, u = TRACES.find(w => R[w[0]] === L[1] && R[w[1]] === L[2]);
      forged.push([{...B, tried: true, claim: {ok: true, at: [0, 1, 2, 3], left: [1, 2], right: u}}, 'an accepted claim on a pair that matches']);
      forged.push([{...B, tried: true, claim: {ok: false, kind: judge(L, R, [1, 2], u).kind === 'round' ? 'way' : 'round', at: [0, 1, 2, 3], left: [1, 2], right: u}}, 'a refusal of the wrong kind']);
    }
    if (!q.cant) forged.push([{...B, tried: true, told: 'middle', at: [0, 2, 3, 1]}, 'a claim where none is offered']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
function checkPlayground(p, fresh) {
  const m = mechanicFor(p), q = p.parameters;
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done', `${p.id}: no hint chain`);
  assert.deepEqual([q.left, q.right].map(w => w.join('')), ['ADCB', 'ADBC'], `${p.id}: starts with the twins`);
  assert.equal(matchV(q.left, q.right), false);
  let a = fresh;
  for (const side of ['left', 'right']) for (const at of [0, 1, 2, 3]) a = play(p, a, {type: 'turn', side, at});
  assert.ok(isRotationV(a.board.left.at) && isRotationV(a.board.right.at), `${p.id}: turns stay rotations`);
  const lettered = playAll(p, a, [1, 1, 1, 1].map(() => ({type: 'letter', side: 'left', at: 2})));
  assert.deepEqual(lettered.board.left.letters, a.board.left.letters, `${p.id}: four letter taps come round`);
  const one = play(p, a, {type: 'letter', side: 'right', at: 0});
  assert.notDeepEqual(one.board.right.letters, a.board.right.letters, `${p.id}: a letter tap changes a letter`);
  assert.ok(!isSolved(p, one.board), `${p.id}: never solved`);
  undoCarry(p, one);
  for (const [action, why] of [[{type: 'turn', side: 'middle', at: 0}, 'an unknown side'], [{type: 'turn', side: 'left', at: 4}, 'an unknown corner'], [{type: 'all'}, 'That’s all'], [{type: 'cant', left: [1, 2], right: [1, 2]}, 'Can’t']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{...fresh.board, left: {...fresh.board.left, at: [0, 1, 3, 2]}}, 'a reflected model'], [{...fresh.board, left: {...fresh.board.left, letters: ['A', 'B', 'C', 'E']}}, 'an unknown letter'], [{...fresh.board, middle: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
const isRotationV = g => EVEN.some(e => e.join() === g.join());
export default validateTetra;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTetra(), null, 2));
