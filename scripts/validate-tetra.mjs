// Checks the Mirror twins pack (dist/families/tetra/tetra.json): content
// fields and sources; the solid rebuilt from four corners of a cube, its four
// turns recomputed by Rodrigues' formula, and the group they make (twelve
// matrices of determinant +1, exactly the even permutations of the corners,
// never a reflection); matching recomputed by parity for all 65,536 pairs of
// labellings, with the classes of every multiset of letters; the view-from-A
// certificate checked against every pair of twins and every trace, and the
// share of random traces it accepts (on the pairs, and on a sort's proof
// after right and wrong sorts: That's all judges nothing, so a wrong sort
// fails on a pair that can match); every puzzle's answers by those methods;
// witnesses played as moves; every reachable board of the pair puzzles,
// set-ups included, with a hint that is a legal move and never a dead end (so
// nothing is said unasked) and that follows one ladder for both kinds, as at
// every pose of every pair a sort's proof shows (so no hint tells twins from
// a pair that can match before the picture does); pairs shown apart in a
// sort, remembered, skipped by That's all again and forgotten exactly when
// their stacks change; hint chains from fresh, after random play, after
// form refusals, wrong claims, a wrong That's all, every set-up and a sort's
// proof; Undo with the mechanic's carry (refusals and locks stay, with the
// lock's refusal on screen, the screen always changes, after every pair
// shelved too); locks kept through Undo, Start again and Restart; illegal
// moves; forged saves; the playground; hint CPU time.
// Run: node scripts/validate-tetra.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {TURN, SPOT, SOLID, ROTATIONS, LETTERS, canMatch, clockwise, judge, labelsOf, classesOf, proofPairs, cardLabels, setupDone} from '../dist/families/tetra/tetra.js';
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
const TOLD = {round: 'Same way round.', way: 'There is a way.', next: 'Right: those two can’t match. Now these two.'};
const cantOff = html => /class="secondary tt-button tt-cant"[^>]*disabled/.test(html);
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const playAll = (p, a, actions) => actions.reduce((b, x) => play(p, b, x), a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// No claim at all is taken on a locked board.
const noCant = (p, a, why) => { for (const left of TRACES) for (const right of TRACES) refuse(p, a, {type: 'cant', left, right}, why); };
const view = (p, a) => { const m = mechanicFor(p); m.reset?.(p); return m.render(p, {...a, hintLevel: 0}); };
// Restart as the app does it: a fresh attempt, then the mechanic's carry.
function restartCarry(p, a) {
  const m = mechanicFor(p), next = freshAttempt(p);
  return m.carryOnRestart ? {...next, board: m.carryOnRestart(p, a.board, next.board)} : next;
}
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
let hintCpu = 0, hintCalls = 0;
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
    assert.notEqual(h.type, 'deadend', `${p.id} ${label}: never a dead end (${h.text})`);
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
  if (q.mode === 'sort') {
    q.cards.forEach((_, n) => [0, 1, 2, 3].forEach(at => out.push({type: 'turn', card: n, at})));
    out.push({type: 'all'});
    // The proof's own turns and claims, and going back to sorting.
    for (const at of [0, 1, 2, 3]) out.push({type: 'turn', at});
    q.cards.forEach((_, card) => out.push({type: 'back', card}));
    for (const left of TRACES) for (const right of TRACES) out.push({type: 'cant', left, right});
    return out;
  }
  for (const at of [0, 1, 2, 3]) out.push({type: 'turn', at});
  for (const drop of LETTERS) for (const keep of LETTERS) if (drop !== keep) out.push({type: 'merge', drop, keep});
  if (q.mode === 'merges') { out.push({type: 'all'}); return out; }
  for (const side of ['left', 'right']) for (const at of [0, 1, 2, 3]) out.push({type: 'place', side, at});
  for (const left of TRACES) for (const right of TRACES) out.push({type: 'cant', left, right});
  out.push({type: 'again'});
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
// --- Hints that don't tell the kind --------------------------------------------
// What a pair of twins and a pair that can match share, and so all a hint may
// follow until the board itself shows the kind: whether the middles agree,
// and where the first model's middle letter sits on the second. The hint must
// be the turn that brings that letter into the middle, then the middle until
// the top letters agree (on a fresh set-up whose middles agree, one tap for
// the whole puzzle). Once middle and top agree the picture shows the kind
// (the same, or two letters swapped), and the hints may part. A pair with a
// repeated letter always matches, so it has no twin to be told from.
const turnV = (R, k) => { const g = permOf(TURNS[k]), next = []; R.forEach((x, i) => { next[g[i]] = x; }); return next; };
const blindTally = () => ({twins: 0, can: 0, shown: 0, setup: new Set(), middle: {twins: 0, can: 0}});
function blindHint(p, tally, L, R, h, freshSetup) {
  if (new Set(L).size < 4) return;
  if (L[0] === R[0] && L[1] === R[1]) { tally.shown++; return; }
  const kind = matchV(L, R) ? 'can' : 'twins';
  tally[kind]++;
  assert.equal(h.type, 'move', `${p.id}: a hint`);
  if (L[0] !== R[0] && h.text === 'Tap the middle.') tally.middle[kind]++;
  if (L[0] !== R[0]) {
    const k = [1, 2, 3].filter(c => turnV(R, c)[0] === L[0]);
    assert.equal(k.length, 1, `${p.id}: one tap brings ${L[0]} into the middle`);
    assert.deepEqual([h.action.type, h.action.at, h.action.card], ['turn', k[0], undefined], `${p.id}: with ${L.join('')} and ${R.join('')} (${kind}), the hint brings ${L[0]} into the middle (${h.text})`);
  } else if (freshSetup) {
    assert.equal(h.action.type, 'turn', `${p.id}: a fresh set-up gets a tap`);
    tally.setup.add(h.text);
  } else assert.deepEqual([h.action.type, h.action.at], ['turn', 0], `${p.id}: with ${L.join('')} and ${R.join('')} (${kind}), the middle until the tops agree (${h.text})`);
}
const blindWords = t => {
  assert.ok(t.setup.size <= 1, `one tap for every fresh set-up whose middles agree (${[...t.setup].join(' / ')})`);
  return `${t.twins} twin and ${t.can} matchable states hinted by one rule (${t.shown} showing the kind); “Tap the middle.” while the middles differ: ${t.middle.twins} twin, ${t.middle.can} matchable${t.setup.size ? `; fresh set-ups: “${[...t.setup][0]}”` : ''}`;
};
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
  const accept = {}, reachable = {}, blind = {};
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
    else hintSteps += checkSort(p, fresh, row, accept);
    if (q.mode === 'pair') reachable[p.id] = checkReachable(p, fresh, blind);
    if (q.mode === 'sort') blind[`${p.id} sort pairs`] = checkSortBlind(p, fresh);
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    // Random play, then hints, Undo on the way.
    const rand = seeded(p.number * 7919);
    for (let run = 0; run < 25; run++) {
      let a = randomPlay(p, fresh, rand, 1 + Math.floor(rand() * 10));
      if (a.history.length) { const back = undoCarry(p, a); if (run % 3 === 0) a = back; }
      hintSteps += hintsSolve(p, a, `after random play ${run}`);
    }
    checkForged(p, fresh);
  }
  return {tetraPuzzles: puzzles.length, labellingPairs: pairs, certificateTraces: certified, repeatedLetterWayRefusals: wayRefusals, randomTraceAcceptance: accept, reachableBoards: reachable, firstHintBlind: blind, hintSteps, hintCalls, slowestHintMs: hintCpu};
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
  // A wrong claim: refused once, and Can't stays off on these letters through
  // turns, Undo and Restart.
  const wrongs = TRACES.flatMap(x => TRACES.map(y => [x, y])).filter(([x, y]) => { const r = judge(L, Rn, x, y); return r.kind; });
  assert.ok(wrongs.length > 0, `${p.id}: a claim that can fail`);
  for (const [x, y] of wrongs) {
    const c = play(p, a, {type: 'cant', left: x, right: y});
    assert.ok(!isSolved(p, c.board), `${p.id}: a wrong claim does not solve`);
    assert.equal(c.board.claim.ok, false);
    assert.equal(c.board.told, c.board.claim.kind, `${p.id}: one short refusal`);
    assert.equal(c.board.wrong.length, 1, `${p.id}: the letters are locked`);
    noCant(p, c, 'Can’t again on the same letters');
    const back = undoCarry(p, c);
    assert.equal(back.board.told, null, `${p.id}: Undo takes the message away`);
    assert.deepEqual(back.board.wrong, c.board.wrong, `${p.id}: Undo keeps the lock`);
    noCant(p, back, 'Can’t after Undo');
    assert.ok(cantOff(view(p, back)) && view(p, back).includes(`<p class="tt-told">${TOLD[c.board.claim.kind]}</p>`), `${p.id}: a greyed Can’t shows the lock’s refusal`);
    const turned = play(p, back, {type: 'turn', at: 0});
    assert.equal(turned.board.claim, null, `${p.id}: a turn takes the refused arrows away`);
    noCant(p, turned, 'Can’t after a turn');
    noCant(p, play(p, undoCarry(p, undoCarry(p, turned)), {type: 'turn', at: 1}), 'Can’t after Undo past the turn');
    noCant(p, play(p, restartCarry(p, c), {type: 'turn', at: 2}), 'Can’t after Restart');
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
    // Exactly the turned copies with two letters swapped.
    const swapped = new Set();
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const w = [...q.left]; [w[i], w[j]] = [w[j], w[i]]; for (const g of EVEN) { const x = []; w.forEach((c, k) => { x[g[k]] = c; }); swapped.add(x.join('')); } }
    assert.deepEqual([...swapped].sort(), apart.map(f => f.a.board.letters.join('')).sort(), `${p.id}: the turned copies with a swap`);
  } else {
    const key = f => f.made.join(), match = finishes.filter(f => !apart.includes(f));
    assert.equal(finishes.length, 4, `${p.id}: four ways to change one A on each`);
    assert.ok(matchV(q.left, q.right), `${p.id}: the pair matches before the change`);
    if (row.goal === 'match') assert.deepEqual(match.map(key), row.match, `${p.id}: changes that match`);
    else assert.deepEqual(apart.map(key), row.apart, `${p.id}: changes that can’t`);
  }
  // The first hint after a set-up doesn't sort it: twins whose middles
  // agree get a first hint that a set-up that can match gets too (in the
  // changes, the same one after every change).
  const ends = finishes.map(f => ({f, L: f.a.board.left, R: labelsOf(f.a.board.letters, f.a.board.at), text: hintAt(p, f.a).text}));
  const canFirst = ends.filter(e => matchV(e.L, e.R) && e.L.join() !== e.R.join()), alike = canFirst.filter(e => e.L[0] === e.R[0]);
  for (const e of ends) if (!matchV(e.L, e.R) && e.L[0] === e.R[0]) assert.ok((alike.length ? alike : canFirst).some(c => c.text === e.text), `${p.id}: twins ${e.f.made.join()} get a first hint a match gets too (${e.text})`);
  if (row.kind === 'change') assert.equal(new Set(ends.map(e => e.text)).size, 1, `${p.id}: the same first hint after every change`);
  for (const f of finishes) {
    const L = f.a.board.left, R = labelsOf(f.a.board.letters, f.a.board.at), can = matchV(L, R);
    assert.equal(bag(L), bag(R), `${p.id}: both end with the same letters`);
    if (q.goal === 'match' && can) { const b = playAll(p, f.a, fewest(L, R).map(at => ({type: 'turn', at}))); assert.ok(isSolved(p, b.board), `${p.id}: a change that matches, then turns`); continue; }
    if (q.goal === 'apart' && !can) {
      // A twin is certified after a turn.
      const a = reach(p, f.a, X => X[0] === L[0]), Rn = labelsOf(a.board.letters, a.board.at);
      const b = play(p, a, {type: 'cant', left: [1, 2], right: [Rn.indexOf(L[1]), Rn.indexOf(L[2])]});
      assert.ok(isSolved(p, b.board), `${p.id}: the twin ${f.made.join()} certified`);
      assert.ok(!isSolved(p, playAll(p, f.a, [{type: 'turn', at: 0}, {type: 'turn', at: 0}, {type: 'turn', at: 0}]).board), `${p.id}: a set-up alone is no solve`);
      continue;
    }
    // A set-up that misses the goal is no dead end: the hints show it on the
    // models (turned to match, or the same letter brought to both middles),
    // then start again.
    let a = f.a, h = hintAt(p, a);
    for (let n = 0; h.action.type === 'turn' && n < 4; n++) { a = play(p, a, h.action); h = hintAt(p, a); }
    assert.equal(h.action.type, 'again', `${p.id}: ${f.made.join()} shown, then Start again`);
    const La = a.board.left, Ra = labelsOf(a.board.letters, a.board.at);
    if (q.goal === 'apart') assert.ok(La.every((x, i) => x === Ra[i]), `${p.id}: the models visibly match first`);
    else { assert.ok(a.board.tried && La[0] === Ra[0], `${p.id}: the same letter in both middles first`); assert.match(h.text, /^With [A-D] in the middle of both, .* opposite ways/, `${p.id}: the reason`); }
    const again = play(p, a, h.action);
    assert.deepEqual([again.board.left, again.board.letters, again.board.placed, again.board.at], [q.left, q.right, {left: 0, right: 0}, [0, 1, 2, 3]], `${p.id}: Start again takes the letters back`);
    undoCarry(p, again);
    steps += hintsSolve(p, f.a, `after the set-up ${f.made.join()}`);
    if (q.goal === 'apart') steps += checkLock(p, f);
  }
  if (q.cant) traceShare(p, apart[0].a, accept);
  // No turn, claim or Start again before the set-up has begun.
  refuse(p, fresh, {type: 'turn', at: 0}, 'a turn during the set-up');
  refuse(p, fresh, {type: 'again'}, 'Start again with nothing put on');
  for (const t of TRACES) refuse(p, fresh, {type: 'cant', left: t, right: t}, 'Can’t during the set-up');
  const s = sides[0], wrongAt = [0, 1, 2, 3].find(at => (s === 'left' ? q.left : q.right)[at] !== q.place[s].on);
  if (wrongAt !== undefined) refuse(p, fresh, {type: 'place', side: s, at: wrongAt}, 'a letter on a corner that is not to change');
  const once = play(p, fresh, {type: 'place', side: s, at: (s === 'left' ? q.left : q.right).indexOf(q.place[s].on)});
  refuse(p, once, {type: 'place', side: s, at: (s === 'left' ? q.left : q.right).indexOf(q.place[s].on)}, 'the same corner twice');
  undoCarry(p, once);
  const restarted = play(p, once, {type: 'again'});
  assert.deepEqual(restarted.board.placed, {left: 0, right: 0}, `${p.id}: Start again mid-set-up`);
  assert.ok(isSolved(p, playAll(p, restarted, hintChain(p, restarted)).board), `${p.id}: Start again mid-set-up, then hints`);
  return steps;
}
// The hints' moves from an attempt to a solve.
function hintChain(p, a) {
  const out = [];
  for (let n = 0; !isSolved(p, a.board) && n < 60; n++) { const h = hintAt(p, a); out.push(h.action); a = play(p, a, h.action); }
  return out;
}
// A wrong claim on a set-up that can match locks those letters: through Undo
// of a letter and putting it back, Start again and the same letters again,
// and Restart.
function checkLock(p, f) {
  const L = f.a.board.left, a = reach(p, f.a, X => X[0] === L[0]), Rn = labelsOf(a.board.letters, a.board.at);
  const trace = TRACES.flatMap(x => TRACES.map(y => [x, y])).find(([x, y]) => judge(L, Rn, x, y).kind);
  const c = play(p, a, {type: 'cant', left: trace[0], right: trace[1]});
  assert.ok(c.board.claim && !c.board.claim.ok, `${p.id}: a wrong claim on ${f.made.join()}`);
  // Undo back to before the last letter, then put it back.
  let b = c;
  while (b.board.placed.left + b.board.placed.right === f.made.length) b = undoCarry(p, b);
  noCant(p, play(p, finishFrom(p, b, f.a.board), {type: 'turn', at: 0}), 'Can’t on letters taken off and put back');
  noCant(p, play(p, finishFrom(p, play(p, c, {type: 'again'}), f.a.board), {type: 'turn', at: 0}), 'Can’t after Start again and the same letters');
  noCant(p, play(p, finishFrom(p, restartCarry(p, c), f.a.board), {type: 'turn', at: 0}), 'Can’t after Restart and the same letters');
  return 0;
}
// Put letters on until the set-up is the given board's.
function finishFrom(p, a, goal) {
  const q = p.parameters;
  for (let n = 0; n < 8 && !setupDone(q, a.board); n++) {
    const side = ['left', 'right'].find(s => q.place[s] && a.board.placed[s] < q.place[s].letters.length);
    const now = side === 'left' ? a.board.left : a.board.letters, want = side === 'left' ? goal.left : goal.letters, next = q.place[side].letters[a.board.placed[side]];
    const sticker = [0, 1, 2, 3].find(k => now[k] === q.place[side].on && want[k] === next);
    a = play(p, a, {type: 'place', side, at: side === 'left' ? sticker : a.board.at.indexOf(sticker)});
  }
  assert.deepEqual([a.board.left, a.board.letters], [goal.left, goal.letters], `${p.id}: the same letters again`);
  return a;
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
    // The pair just shelved is marked; Undo keeps it on the shelf, takes the
    // mark away and so changes the screen, whichever pair it is (B and C
    // match with no turn at all).
    assert.deepEqual(a.board.told, {kind: 'new', pair}, `${p.id}: ${pair} marked as just found`);
    const kept = undoCarry(p, a);
    assert.deepEqual(kept.board.found, a.board.found, `${p.id}: Undo keeps the pairs found`);
    assert.notDeepEqual(kept.board.told, a.board.told, `${p.id}: Undo takes the mark away`);
    // The same pair the other way round is found already, and Undo shows it.
    const L2 = q.left.map(x => x === keep ? drop : x), R2 = q.right.map(x => x === keep ? drop : x);
    const again = playAll(p, a, [{type: 'merge', drop: keep, keep: drop}, ...fewest(L2, R2).map(at => ({type: 'turn', at}))]);
    assert.deepEqual(again.board.told, {kind: 'again', pair}, `${p.id}: ${pair} found already`);
    assert.deepEqual(again.board.found, a.board.found);
    undoCarry(p, again);
    if (pair === 'AB') {
      // That's all now is refused, once, kept through Undo.
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.told, 'more', `${p.id}: there is another`);
      assert.ok(!isSolved(p, early.board));
      refuse(p, early, {type: 'all'}, 'That’s all again before a new pair');
      const back = undoCarry(p, early);
      assert.equal(back.board.refused, early.board.found.length, `${p.id}: Undo keeps the refusal`);
      refuse(p, back, {type: 'all'}, 'That’s all after Undo, on the same shelf');
      steps += hintsSolve(p, early, 'after a wrong That’s all');
    }
  }
  assert.deepEqual(taps, row.taps, `${p.id}: fewest taps after each change`);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every pair`);
  return steps;
}
// Sort models into stacks that match.
function checkSort(p, fresh, row, accept) {
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
  steps += checkProof(p, a, classes, accept);
  steps += checkWrongSorts(p, fresh, classes, accept);
  assert.ok(classes.every(g => g.every(n => bag(q.cards[n]) === bag(q.cards[g[0]]))), `${p.id}: a stack keeps its letters`);
  refuse(p, fresh, {type: 'turn', card: q.cards.length, at: 0}, 'an unknown card');
  refuse(p, ready, {type: 'turn', card: 0, at: 4}, 'an unknown corner');
  return steps;
}
// After That's all on a right sort: a model from each of two stacks with the
// same letters, shown apart with Can't. Stacks with different letters need none.
function checkProof(p, a, classes, accept) {
  const q = p.parameters;
  let steps = 0;
  assert.ok(!isSolved(p, a.board), `${p.id}: That’s all asks for the certificate`);
  assert.ok(a.board.proof && a.board.told === null, `${p.id}: the proof starts`);
  const pairs = proofPairs(q, a.board), classOf = n => classes.findIndex(g => g.includes(n));
  assert.deepEqual(pairs.map(([n, m]) => [classOf(n), classOf(m)]), p.solution.twins, `${p.id}: the stacks to show apart`);
  const want = classes.flatMap((g, i) => classes.slice(i + 1).flatMap((h, j) => bag(q.cards[g[0]]) === bag(q.cards[h[0]]) ? [[i, i + 1 + j]] : []));
  assert.deepEqual(pairs.map(([n, m]) => [classOf(n), classOf(m)]), want, `${p.id}: exactly the stacks with the same letters`);
  for (const [n, m] of pairs) assert.ok(new Set(q.cards[n]).size === 4 && !matchV(q.cards[n], q.cards[m]), `${p.id}: twins with four different letters`);
  const html = view(p, a);
  assert.doesNotMatch(html, /tt-ask|can’t match\./, `${p.id}: no line states the conclusion`);
  assert.doesNotMatch(html, /class="tt-stack[^"]*"[^>]*disabled/, `${p.id}: the small models stay live`);
  const back = undoCarry(p, a);
  assert.equal(back.board.proof, null, `${p.id}: Undo goes back to sorting`);
  refuse(p, a, {type: 'all'}, 'That’s all during the proof');
  refuse(p, a, {type: 'turn', card: 0, at: 0}, 'a card turned during the proof');
  refuse(p, a, {type: 'back'}, 'back to sorting with no model');
  refuse(p, a, {type: 'back', card: q.cards.length}, 'back to sorting with an unknown model');
  refuse(p, back, {type: 'back', card: 0}, 'back to sorting while sorting');
  // A small model goes back to sorting, stacks as they were; That's all again.
  const sorting = play(p, a, {type: 'back', card: pairs[0][1]});
  assert.deepEqual([sorting.board.proof, sorting.board.cards], [null, a.board.cards], `${p.id}: back to sorting`);
  assert.deepEqual(play(p, sorting, {type: 'all'}).board.proof, a.board.proof, `${p.id}: That’s all again`);
  noCant(p, a, 'Can’t before a turn');
  const share = proofCounts(p, a);
  assert.equal(share.wrong, 0, `${p.id}: no claim refused as wrong on twins`);
  accept[`${p.id} right sort`] = `${share.ok}/${share.total} accepted (${(100 * share.ok / share.total).toFixed(1)}%), ${share.form} refused for their form`;
  assert.ok(share.ok > 0 && share.ok / share.total < 0.05, `${p.id}: random traces rarely complete the proof`);
  const [n, m] = pairs[0], L = cardLabels(q, a.board, n), Rof = b => labelsOf(cardLabels(q, b.board, m), b.board.proof.at);
  // Form refusals, kept off the record.
  const off = reachProof(p, a, X => X[0] !== L[0]);
  const middle = play(p, off, {type: 'cant', left: [1, 2], right: [1, 2]});
  assert.equal(middle.board.told, 'middle', `${p.id}: not the same letter in the middle`);
  undoCarry(p, middle);
  steps += hintsSolve(p, middle, 'after a form refusal in the proof');
  const on = reachProof(p, a, X => X[0] === L[0]), R = Rof(on), u = [R.indexOf(L[1]), R.indexOf(L[2])];
  const wrongU = TRACES.find(w => !(R[w[0]] === L[1] && R[w[1]] === L[2]));
  const letters = play(p, on, {type: 'cant', left: [1, 2], right: wrongU});
  assert.equal(letters.board.told, 'letters', `${p.id}: follow the same letters`);
  // The certificate solves.
  const ok = play(p, on, {type: 'cant', left: [1, 2], right: u});
  assert.ok(isSolved(p, ok.board), `${p.id}: the certificate solves the sort`);
  assert.equal((view(p, ok).match(/tt-arrow ok/g) || []).length, 2, `${p.id}: both arrows drawn`);
  steps += hintsSolve(p, a, 'from the proof');
  steps += hintsSolve(p, sorting, 'back to sorting from the proof');
  return steps;
}
// Wrong sorts: the board before any stacking, and every sort one model short
// of right. That's all judges none of them: the pairs come up as on a right
// sort, the twins among them are shown apart, and the first pair that can
// match refuses every claim of the right form, for a reason.
function checkWrongSorts(p, fresh, classes, accept) {
  const q = p.parameters;
  let steps = 0, ok = 0, wrong = 0, form = 0, total = 0;
  const kinds = new Set(), turnsTo = (g, n) => fewest(q.cards[g[0]], q.cards[n]).map(at => ({type: 'turn', card: n, at}));
  const sorts = [playAll(p, fresh, [0, 0, 0].map(at => ({type: 'turn', card: 0, at})))];
  for (const g of classes) for (const out of g.slice(1)) {
    const s = playAll(p, fresh, classes.flatMap(h => h.slice(1).filter(n => n !== out).flatMap(n => turnsTo(h, n))));
    sorts.push(s.board.tried ? s : playAll(p, s, [0, 0, 0].map(at => ({type: 'turn', card: 0, at}))));
  }
  for (const s of sorts) {
    let a = play(p, s, {type: 'all'});
    assert.ok(a.board.proof && !isSolved(p, a.board) && a.board.told === null, `${p.id}: That’s all on a wrong sort says nothing, and shows the pairs`);
    for (let k = 0; ; k++) {
      const [n, m] = proofPairs(q, a.board)[a.board.proof.n];
      if (matchV(cardLabels(q, a.board, n), cardLabels(q, a.board, m))) break;
      a = certify(p, a);
      assert.ok(!isSolved(p, a.board) && k < 20, `${p.id}: twins shown apart never solve a wrong sort`);
    }
    const c = proofCounts(p, a);
    ok += c.ok; wrong += c.wrong; form += c.form; total += c.total;
    c.kinds.forEach(k => kinds.add(k));
    steps += hintsSolve(p, a, 'from a pair that can match');
  }
  steps += checkProofLock(p, sorts.at(-1));
  if (q.cards.some(c => new Set(c).size === 3)) {
    // Two stacks of A, A, B, C models can also earn "There is a way.".
    assert.ok(kinds.has('way'), `${p.id}: a repeated letter can fool the arrows in a sort`);
    const twoAs = classes.find(g => new Set(q.cards[g[0]]).size === 3);
    steps += checkProofLock(p, playAll(p, fresh, classes.filter(g => g !== twoAs).flatMap(g => g.slice(1).flatMap(n => turnsTo(g, n)))), 'way');
  }
  assert.equal(ok, 0, `${p.id}: no claim accepted on a pair that can match`);
  accept[`${p.id} wrong sorts`] = `${ok}/${total} accepted on the first pair that can match, ${wrong} refused as wrong (${[...kinds].sort().join(', ')}), ${form} refused for their form, over ${sorts.length} wrong sorts`;
  return steps;
}
// Turn the proof's second model to the first one's middle letter and show the
// pair apart: remembered, on to the next pair, saying so; Undo forgets it.
const lockedNow = (q, b) => b.wrong.some(k => k.startsWith(`${proofPairs(q, b)[b.proof.n].join('·')}|`));
function certify(p, a) {
  const q = p.parameters, [n, m] = proofPairs(q, a.board)[a.board.proof.n], L = cardLabels(q, a.board, n);
  const on = reachProof(p, a, X => X[0] === L[0]), R = labelsOf(cardLabels(q, on.board, m), on.board.proof.at);
  const next = play(p, on, {type: 'cant', left: [1, 2], right: [R.indexOf(L[1]), R.indexOf(L[2])]});
  if (next.board.done) return next;
  assert.ok(next.board.proof.n > a.board.proof.n && next.board.apart.includes(`${n}·${m}|${on.board.proof.at.join('')}|12|${R.indexOf(L[1])}${R.indexOf(L[2])}`), `${p.id}: twins shown apart and remembered, on to the next pair`);
  const locked = lockedNow(q, next.board);
  assert.equal(next.board.told, locked ? null : 'next', `${p.id}: a right Can’t before the last pair says so`);
  if (!locked) assert.ok(view(p, next).includes(`<p class="tt-told">${TOLD.next}</p>`), `${p.id}: “${TOLD.next}”`);
  const back = undoCarry(p, next);
  assert.ok(back.board.apart.length === a.board.apart.length && back.board.proof.n === a.board.proof.n, `${p.id}: Undo of a right Can’t forgets it`);
  return next;
}
// Every pair a sort's proof shows, after the right sort, every sort one model
// short and random ones: at every pose of its second model, the hint doesn't
// tell twins from a pair that can match. Twins are shown apart to reach the
// pairs after them.
function checkSortBlind(p, fresh) {
  const q = p.parameters, tally = blindTally(), rand = seeded(p.number * 104729), classes = classesOf(q.cards);
  const turnsTo = (g, n) => fewest(q.cards[g[0]], q.cards[n]).map(at => ({type: 'turn', card: n, at}));
  const sorts = [playAll(p, fresh, classes.flatMap(g => g.slice(1).flatMap(n => turnsTo(g, n))))];
  for (const g of classes) for (const out of g.slice(1)) sorts.push(playAll(p, fresh, classes.flatMap(h => h.slice(1).filter(n => n !== out).flatMap(n => turnsTo(h, n)))));
  // Random sorts: some classes stacked, then a few models turned at random.
  for (let r = 0; r < 160; r++) {
    let a = playAll(p, fresh, classes.filter(() => rand() < 0.5).flatMap(g => g.slice(1).flatMap(n => turnsTo(g, n))));
    for (let k = Math.floor(rand() * 7); k > 0 || !a.board.tried; k--) a = play(p, a, {type: 'turn', card: Math.floor(rand() * q.cards.length), at: Math.floor(rand() * 4)});
    sorts.push(a);
  }
  let pairs = 0;
  for (const s of sorts) {
    let a = s.board.tried ? play(p, s, {type: 'all'}) : null;
    for (let k = 0; a && a.board.proof && !a.board.done && k < 30; k++) {
      const [n, m] = proofPairs(q, a.board)[a.board.proof.n], L = cardLabels(q, a.board, n);
      const seen = new Map([[`${a.board.proof.at.join()}|${a.board.proof.tried}`, a]]), queue = [a];
      for (let i = 0; i < queue.length; i++) for (const at of [0, 1, 2, 3]) {
        const b = move(p, queue[i], {type: 'turn', at}), id = b && `${b.board.proof.at.join()}|${b.board.proof.tried}`;
        if (b && !seen.has(id)) { seen.set(id, b); queue.push(b); }
      }
      assert.equal(seen.size, 13, `${p.id}: every pose of the pair, and the pair as it comes up`);
      for (const b of seen.values()) blindHint(p, tally, L, labelsOf(cardLabels(q, b.board, m), b.board.proof.at), hintAt(p, b), false);
      pairs++;
      if (matchV(L, cardLabels(q, a.board, m))) break;
      a = certify(p, a);
    }
  }
  return `${pairs} pairs over ${sorts.length} sorts: ${blindWords(tally)}`;
}
// From a wrong sort: That's all, the twins shown apart, then a wrong claim on
// the first pair that can match. The refusal shows round the child's arrows,
// those two lock, and the lock holds (with its refusal) through Undo, turns,
// going back to sorting, That's all again and Restart.
function checkProofLock(p, sorted, want) {
  const q = p.parameters;
  let a = play(p, sorted, {type: 'all'}), steps = 0;
  for (let k = 0; k < 20; k++) { const [n, m] = proofPairs(q, a.board)[a.board.proof.n]; if (matchV(cardLabels(q, a.board, n), cardLabels(q, a.board, m))) break; a = certify(p, a); }
  const [n, m] = proofPairs(q, a.board)[a.board.proof.n], L = cardLabels(q, a.board, n), at = a.board.proof.n;
  const traceFor = X => TRACES.flatMap(x => TRACES.map(y => [x, y])).find(([x, y]) => judge(L, X, x, y).kind === (want || 'round'));
  const on = reachProof(p, a, X => Boolean(traceFor(X))), trace = traceFor(labelsOf(cardLabels(q, on.board, m), on.board.proof.at));
  const c = play(p, on, {type: 'cant', left: trace[0], right: trace[1]}), kind = c.board.told;
  assert.ok(TOLD[kind] && c.board.proof.claim.kind === kind && !isSolved(p, c.board), `${p.id}: refused for a reason (${kind})`);
  const shown = view(p, c);
  assert.equal((shown.match(/tt-arrow off/g) || []).length, 2, `${p.id}: the refusal round the child’s own arrows`);
  assert.ok(shown.includes(`<p class="tt-told">${TOLD[kind]}</p>`) && cantOff(shown), `${p.id}: its message, and Can’t off`);
  assert.deepEqual(c.board.wrong, [`${n}·${m}|${kind}`], `${p.id}: those two locked`);
  noCant(p, c, 'Can’t again on those two');
  const back = undoCarry(p, c);
  assert.ok(back.board.proof.claim === null && back.board.wrong.length === 1, `${p.id}: Undo keeps the lock`);
  assert.ok(view(p, back).includes(`<p class="tt-told">${TOLD[kind]}</p>`) && cantOff(view(p, back)), `${p.id}: and its refusal shows`);
  noCant(p, back, 'Can’t after Undo');
  const turned = play(p, c, {type: 'turn', at: 0});
  assert.ok(turned.board.proof.claim === null && view(p, turned).includes(TOLD[kind]), `${p.id}: a turn takes the arrows, not the refusal`);
  noCant(p, turned, 'Can’t after a turn');
  // Back to sorting; That's all again on the same stacks skips the pairs
  // shown apart and finds the pair still locked.
  const sorting = play(p, c, {type: 'back', card: m});
  assert.ok(sorting.board.proof === null && !view(p, sorting).includes(TOLD[kind]), `${p.id}: back to sorting, with no message`);
  assert.deepEqual(sorting.board.apart, c.board.apart, `${p.id}: going back keeps the pairs shown apart`);
  let again = play(p, sorting, {type: 'all'});
  assert.equal(again.board.proof.n, at, `${p.id}: That’s all again skips the pairs shown apart`);
  // A turn that changes a stack (its models or their look) forgets the pairs
  // it heads; any other turn keeps them.
  const stackOf = b => { const groups = new Map(); q.cards.forEach((_, k) => { const id = cardLabels(q, b, k).join(''); groups.set(id, [...(groups.get(id) || []), k]); }); return k => [...groups].map(([id, g]) => `${g.join()}|${id}`).find(x => x.split('|')[0].split(',').includes(String(k))); };
  let drops = 0, keeps = 0;
  for (let k = 0; k < q.cards.length; k++) for (const corner of [0, 1, 2, 3]) {
    const t = play(p, sorting, {type: 'turn', card: k, at: corner}), was = stackOf(sorting.board), now = stackOf(t.board);
    const want = sorting.board.apart.filter(e => e.slice(0, e.indexOf('|')).split('·').every(x => was(Number(x)) === now(Number(x))));
    assert.deepEqual(t.board.apart, want, `${p.id}: a turn of model ${k + 1} forgets exactly the pairs whose stacks it changes`);
    assert.ok(validBoard(p, t.board), `${p.id}: a valid board after the turn`);
    drops += sorting.board.apart.length - want.length; keeps += want.length;
  }
  if (sorting.board.apart.length) assert.ok(drops > 0 && keeps > 0, `${p.id}: some turns forget a pair shown apart, others keep it`);
  again = play(p, again, {type: 'turn', at: 0});
  noCant(p, again, 'Can’t on the same two after That’s all again');
  assert.ok(view(p, again).includes(TOLD[kind]), `${p.id}: with its refusal`);
  const restarted = restartCarry(p, c);
  assert.deepEqual(restarted.board.wrong, c.board.wrong, `${p.id}: Restart keeps the lock`);
  assert.deepEqual(restarted.board.apart, [], `${p.id}: Restart forgets the pairs shown apart`);
  assert.ok(validBoard(p, restarted.board), `${p.id}: a valid board after Restart`);
  for (const [b, label] of [[c, 'after a wrong claim in a sort'], [back, 'after Undo of it'], [sorting, 'back to sorting after it'], [again, 'at the locked pair again'], [restarted, 'after Restart with a lock']]) steps += hintsSolve(p, b, label);
  return steps;
}
// The nearest proof pose (at least one tap away) whose second model's letters satisfy `want`.
function reachProof(p, start, want) {
  const q = p.parameters, [, m] = proofPairs(q, start.board)[start.board.proof.n], seen = new Set(), queue = [start];
  for (let n = 0; n < queue.length; n++) for (const at of [0, 1, 2, 3]) {
    const b = move(p, queue[n], {type: 'turn', at});
    if (!b || seen.has(b.board.proof.at.join())) continue;
    if (want(labelsOf(cardLabels(q, b.board, m), b.board.proof.at))) return b;
    seen.add(b.board.proof.at.join()); queue.push(b);
  }
  assert.fail(`${p.id}: no proof pose found`);
}
// Every claim on the pair shown, over every pose of its second model and all
// 36 traces: how many a child tapping at random would have accepted, refused
// as wrong (a pair that can match) or refused for their form.
function proofCounts(p, start) {
  const q = p.parameters, seen = new Map(), queue = [start];
  for (let n = 0; n < queue.length; n++) for (const at of [0, 1, 2, 3]) {
    const b = move(p, queue[n], {type: 'turn', at});
    if (!b || seen.has(b.board.proof.at.join())) continue;
    seen.set(b.board.proof.at.join(), b); queue.push(b);
  }
  assert.equal(seen.size, 12, `${p.id}: the proof's model turns to every pose`);
  let ok = 0, wrong = 0, form = 0;
  const kinds = new Set();
  for (const a of seen.values()) for (const x of TRACES) for (const y of TRACES) {
    const b = move(p, a, {type: 'cant', left: x, right: y});
    assert.ok(b, `${p.id}: a proof claim is judged`);
    const [n, m] = proofPairs(q, a.board)[a.board.proof.n], can = matchV(cardLabels(q, a.board, n), labelsOf(cardLabels(q, a.board, m), a.board.proof.at));
    if (b.board.done || b.board.proof.n > a.board.proof.n) { ok++; assert.ok(!can, `${p.id}: only a true claim`); }
    else if (b.board.proof.claim) { wrong++; kinds.add(b.board.proof.claim.kind); assert.ok(can && b.board.told === b.board.proof.claim.kind, `${p.id}: refused as wrong only on a pair that can match`); }
    else { form++; assert.ok(['middle', 'letters'].includes(b.board.told), `${p.id}: every other claim refused for its form`); }
  }
  return {ok, wrong, form, total: ok + wrong + form, kinds};
}
// Every board a pair puzzle can reach by moves, Undo and Restart (the locks
// set aside: hints never use them, and a locked board never gets a Can't
// hint, since only boards that can match are locked). On each unsolved one the
// hint is a legal move and never a dead end, so no message comes unasked, and
// the hints from it reach a solve.
function checkReachable(p, fresh, blind) {
  const m = mechanicFor(p), q = p.parameters, strip = b => JSON.stringify({...b, wrong: []}), tally = blindTally();
  const seen = new Map([[strip(fresh.board), fresh.board]]), queue = [fresh.board];
  for (let n = 0; n < queue.length; n++) {
    const b = queue[n];
    if (m.solved(p, b)) continue;
    for (const action of candidates(p, b)) {
      const next = m.move(p, b, action);
      if (!next) continue;
      assert.ok(m.valid(p, next), `${p.id}: every move gives a valid board`);
      const k = strip(next);
      if (!seen.has(k)) { seen.set(k, next); queue.push(next); }
    }
  }
  let mid = 0, after = 0, unsolved = 0;
  const memo = new Map();
  const solves = b => {
    const k = strip(b);
    if (memo.has(k)) return memo.get(k);
    memo.set(k, false);
    let ok = m.solved(p, b);
    if (!ok) {
      const h = m.hint(p, b);
      assert.equal(h.type, 'move', `${p.id}: a hint on every reachable board, never a dead end (${h.text})`);
      const next = m.move(p, b, h.action);
      assert.ok(next, `${p.id}: the hint is a legal move (${JSON.stringify(h.action)})`);
      ok = solves(next);
    }
    memo.set(k, ok);
    return ok;
  };
  for (const b of seen.values()) {
    if (m.solved(p, b)) continue;
    unsolved++;
    if (!setupDone(q, b)) mid++; else if (q.place) after++;
    assert.ok(solves(b), `${p.id}: hints solve from ${JSON.stringify(b)}`);
    // The hint doesn't tell twins from a pair that can match.
    if (setupDone(q, b) && !(q.merge && !b.merged)) blindHint(p, tally, b.left, labelsOf(b.letters, b.at), m.hint(p, b), Boolean(q.place) && !b.tried);
  }
  if (tally.twins || tally.can) blind[p.id] = blindWords(tally);
  return `${seen.size} boards, ${unsolved} unsolved${q.place ? ` (${mid} mid-set-up, ${after} after a set-up)` : ''}`;
}
function checkForged(p, fresh) {
  const q = p.parameters, B = fresh.board, reflect = [0, 1, 3, 2];
  const forged = [[{...B, extra: 1}, 'an unknown field'], [null, 'nothing']];
  if (q.mode === 'sort') {
    const U = {...B, tried: true}, start = {n: 0, at: [0, 1, 2, 3], tried: false, claim: null};
    assert.ok(validBoard(p, U), `${p.id}: a touched, unsorted board is valid`);
    forged.push([{...B, cards: B.cards.map((c, n) => n ? c : reflect), tried: true}, 'a reflected model']);
    forged.push([{...B, done: true}, 'a done sort never touched']);
    forged.push([{...U, done: true}, 'a done sort that is not sorted']);
    forged.push([{...U, refused: null}, 'a field a sort no longer has']);
    forged.push([{...U, told: 'round'}, 'a refusal while sorting']);
    forged.push([{...U, told: 'more'}, 'the old refusal of That’s all']);
    forged.push([{...B, cards: B.cards.slice(1)}, 'a missing card']);
    forged.push([{...B, proof: start}, 'a proof before a turn']);
    // Locks: two models that can match, in order, once each, with a refusal they can earn.
    const cls = classesOf(q.cards), mate = [cls[0][0], cls[0][1]];
    const twin = cls.flatMap((g, i) => cls.slice(i + 1).filter(h => bag(q.cards[g[0]]) === bag(q.cards[h[0]])).map(h => [g[0], h[0]].sort((x, y) => x - y)))[0];
    const apart = cls.flatMap((g, i) => cls.slice(i + 1).filter(h => bag(q.cards[g[0]]) !== bag(q.cards[h[0]])).map(h => [g[0], h[0]].sort((x, y) => x - y)))[0];
    const lock = (x, y, kind) => `${x}·${y}|${kind}`;
    assert.ok(validBoard(p, {...B, wrong: [lock(...mate, 'round')]}), `${p.id}: a lock kept by Restart is valid`);
    forged.push([{...B, wrong: [lock(...twin, 'round')]}, 'a lock on twins']);
    if (apart) forged.push([{...B, wrong: [lock(...apart, 'round')]}, 'a lock on two with different letters']);
    forged.push([{...B, wrong: [lock(mate[1], mate[0], 'round')]}, 'a lock out of order']);
    if (new Set(q.cards[mate[0]]).size === 4) forged.push([{...B, wrong: [lock(...mate, 'way')]}, 'a refusal four different letters can’t earn']);
    forged.push([{...B, wrong: [lock(...mate, 'round'), lock(...mate, 'way')]}, 'a lock twice']);
    forged.push([{...B, wrong: [lock(0, q.cards.length, 'round')]}, 'a lock on a model that is not there']);
    forged.push([{...B, wrong: [lock(...mate, 'letters')]}, 'a lock with a form refusal']);
    forged.push([{...B, wrong: [7]}, 'a lock that is not two models']);
    // On a right sort: the certificate can't be skipped, faked or misplaced.
    const S = playAll(p, fresh, cls.flatMap(g => g.slice(1).flatMap(n => fewest(q.cards[g[0]], q.cards[n]).map(at => ({type: 'turn', card: n, at}))))).board;
    const [n0, m0] = proofPairs(q, S)[0], L0 = cardLabels(q, S, n0);
    const poseWith = same => POSES.map(poseOf).find(at => (labelsOf(cardLabels(q, S, m0), at)[0] === L0[0]) === same);
    forged.push([{...S, done: true}, 'a right sort done without its certificate']);
    forged.push([{...S, proof: {...start, n: 1}}, 'a proof of a pair that is not there']);
    forged.push([{...S, proof: start, told: 'middle'}, 'a proof message before a turn']);
    forged.push([{...S, proof: {...start, tried: true, at: poseWith(true)}, told: 'middle'}, 'a stale “not the same letter in the middle”']);
    forged.push([{...S, proof: {...start, tried: true, at: poseWith(false)}, told: 'letters'}, 'a stale “follow the same letters”']);
    forged.push([{...S, proof: {...start, tried: true, at: poseWith(false), claim: {ok: true, at: poseWith(false), left: [1, 2], right: [1, 2]}}, done: true}, 'a certificate with different middles']);
    forged.push([{...S, proof: start, told: 'more'}, 'an old refusal during the proof']);
    forged.push([{...S, proof: {...start, tried: true, at: poseWith(true)}, told: 'round'}, 'a wrong-claim message with no claim']);
    // On a wrong sort: no proof past a pair that can match, and no solve.
    const pairsU = proofPairs(q, U), can = pairsU.findIndex(([x, y]) => matchV(q.cards[x], q.cards[y]));
    forged.push([{...U, proof: {...start, n: can + 1}}, 'a proof past a pair that can match']);
    const last = pairsU.length - 1, [xl, yl] = pairsU[last], Ll = q.cards[xl];
    const atl = POSES.map(poseOf).find(at => labelsOf(q.cards[yl], at)[0] === Ll[0]), Rl = labelsOf(q.cards[yl], atl);
    forged.push([{...U, done: true, proof: {n: last, at: atl, tried: true, claim: {ok: true, at: atl, left: [1, 2], right: [Rl.indexOf(Ll[1]), Rl.indexOf(Ll[2])]}}}, 'a wrong sort solved by its last pair']);
    // A wrong claim, as a board: everything about it must fit.
    let a = play(p, {...fresh, board: U}, {type: 'all'});
    while (a.board.proof.n < can) a = certify(p, a);
    const [nc, mc] = pairsU[can], Lc = q.cards[nc];
    const on = reachProof(p, a, X => X[0] === Lc[0]), Rc = labelsOf(q.cards[mc], on.board.proof.at);
    const trace = TRACES.flatMap(x => TRACES.map(y => [x, y])).find(([x, y]) => judge(Lc, Rc, x, y).kind);
    const C = play(p, on, {type: 'cant', left: trace[0], right: trace[1]}).board, k = C.proof.claim.kind;
    assert.ok(validBoard(p, C), `${p.id}: a wrong claim in a sort is a valid board`);
    forged.push([{...C, wrong: []}, 'a wrong claim with no lock']);
    forged.push([{...C, told: null}, 'a wrong claim with its message gone']);
    forged.push([{...C, told: 'middle'}, 'a wrong claim with a form message']);
    forged.push([{...C, done: true}, 'a wrong claim that solves']);
    forged.push([{...C, proof: {...C.proof, at: [0, 2, 3, 1].map(i => C.proof.at[i])}}, 'a wrong claim from another pose']);
    forged.push([{...C, told: k === 'round' ? 'way' : 'round', proof: {...C.proof, claim: {...C.proof.claim, kind: k === 'round' ? 'way' : 'round'}}}, 'a refusal of the wrong kind']);
    forged.push([{...C, wrong: [lock(nc, mc, k === 'round' ? 'way' : 'round')]}, 'a lock with another refusal']);
    forged.push([{...C, proof: {...C.proof, claim: null}, told: 'letters'}, 'a form message on a locked pair']);
    // Pairs shown apart: each with a right Can't on two stacks shown now.
    const certOf = (b, [x, y]) => { const L = cardLabels(q, b, x), at = POSES.map(poseOf).find(g => labelsOf(cardLabels(q, b, y), g)[0] === L[0]), R = labelsOf(cardLabels(q, b, y), at); return `${x}·${y}|${at.join('')}|12|${R.indexOf(L[1])}${R.indexOf(L[2])}`; };
    const twinsU = pairsU.filter(([x, y]) => !matchV(q.cards[x], q.cards[y])), tw = twinsU[0], twIdx = pairsU.indexOf(tw), cert = certOf(U, tw);
    const skip = pairsU.findIndex(x => x !== tw);
    assert.ok(validBoard(p, {...U, apart: [cert]}), `${p.id}: a pair shown apart is valid`);
    assert.ok(validBoard(p, {...U, apart: [cert], proof: {...start, n: skip}}), `${p.id}: a proof that skips it is valid`);
    assert.ok(validBoard(p, {...U, apart: [cert], proof: {...start, n: skip}, told: 'next'}), `${p.id}: and says so`);
    forged.push([{...U, apart: [cert], proof: {...start, n: twIdx}}, 'a proof of a pair shown apart']);
    forged.push([{...U, proof: {...start, n: 0}, told: 'next'}, '“Right” with nothing shown apart']);
    forged.push([{...U, apart: [cert], proof: {...start, n: skip, tried: true, at: [0, 2, 3, 1]}, told: 'next'}, 'a stale “Right”']);
    forged.push([{...B, apart: [cert]}, 'a pair shown apart before a turn']);
    forged.push([{...U, apart: [`${tw.join('·')}|0123|12|12`]}, 'a pair shown apart with no right Can’t']);
    forged.push([{...U, apart: [cert.slice(0, -2) + [...cert.slice(-2)].reverse().join('')]}, 'a pair shown apart with letters that don’t follow']);
    forged.push([{...U, apart: [certOf(U, pairsU[can]), `${pairsU[can].join('·')}|0123|12|12`].sort()}, 'a pair that can match, shown apart']);
    forged.push([{...U, apart: [certOf(U, pairsU[can])]}, 'a pair that can match, shown apart with its middles agreeing']);
    forged.push([{...U, apart: [cert, cert.replace('|12|', '|21|')].sort()}, 'a pair shown apart twice']);
    if (twinsU.length > 1) forged.push([{...U, apart: [certOf(U, twinsU[0]), certOf(U, twinsU[1])].sort().reverse()}, 'pairs shown apart out of order']);
    forged.push([{...U, apart: [cert + '|1']}, 'a pair shown apart with more than a Can’t']);
    const under = cls[0][1], other = proofPairs(q, S)[0].find(x => !cls[0].includes(x)), sub = [under, other].sort((x, y) => x - y);
    forged.push([{...S, apart: [certOf(S, sub)]}, 'a pair shown apart that heads no stacks']);
    if (apart) forged.push([{...S, apart: [`${apart.join('·')}|0123|12|12`]}, 'a pair shown apart with different letters']);
    assert.ok(validBoard(p, {...S, apart: [certOf(S, [n0, m0])], done: true}), `${p.id}: every pair shown apart, That’s all is done at once`);
    forged.push([{...S, apart: [certOf(S, [n0, m0])], proof: start}, 'a proof with every pair shown apart']);
  } else if (q.mode === 'merges') {
    forged.push([{...B, at: reflect, tried: true}, 'a reflected model']);
    forged.push([{...B, done: true}, 'a done shelf that is short']);
    forged.push([{...B, found: ['AB', 'AB']}, 'a pair found twice']);
    forged.push([{...B, found: ['AE']}, 'an unknown pair']);
    forged.push([{...B, told: 'more'}, 'a refusal with nothing found']);
    forged.push([{...B, found: ['AB'], refused: 2}, 'a refusal past the shelf']);
    forged.push([{...B, left: [...B.left.slice(0, 3), 'A']}, 'letters that do not follow']);
    forged.push([{...B, merged: ['D', 'C']}, 'a merge with the letters unchanged']);
    forged.push([{...B, tried: true, told: {kind: 'new', pair: 'AB'}}, 'a new pair not on the shelf']);
    forged.push([{...B, tried: true, found: ['AB', 'CD'], told: {kind: 'new', pair: 'AB'}}, 'a new pair that is not the last found']);
    forged.push([{...B, tried: true, found: ['AB'], at: [0, 2, 3, 1], told: {kind: 'new', pair: 'AB'}}, 'a new pair with the model turned']);
    forged.push([{...B, tried: true, found: ['AB', 'CD'], refused: 2, told: {kind: 'new', pair: 'CD'}}, 'a new pair found before the shelf’s refusal']);
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
    // Locks: only on letters that can match, each once, only where Can't is offered.
    const key = b => `${b.left.join('·')}|${b.letters.join('·')}`;
    forged.push([{...B, wrong: ['A·B|C·D']}, 'a lock on letters that never were']);
    forged.push([{...B, wrong: [7]}, 'a lock that is not letters']);
    if (!q.cant) forged.push([{...B, wrong: [key(B)]}, 'a lock where Can’t is not offered']);
    if (q.cant && !q.place && !matchV(q.left, q.right)) forged.push([{...B, wrong: [key(B)]}, 'a lock on twins']);
    if (q.cant && !q.place && matchV(q.left, q.right)) {
      forged.push([{...B, wrong: [key(B), key(B)]}, 'a lock twice']);
      // Messages that don't fit the board.
      const a = reach(p, fresh, X => X[0] === q.left[0]), b = reach(p, fresh, X => X[0] !== q.left[0]);
      forged.push([{...a.board, told: 'middle'}, 'a stale “not the same letter in the middle”']);
      forged.push([{...b.board, told: 'letters'}, 'a stale “follow the same letters”']);
      const Rn = labelsOf(a.board.letters, a.board.at), trace = TRACES.flatMap(x => TRACES.map(y => [x, y])).find(([x, y]) => judge(q.left, Rn, x, y).kind);
      const c = play(p, a, {type: 'cant', left: trace[0], right: trace[1]}).board;
      assert.ok(validBoard(p, c), `${p.id}: a wrong claim is a valid board`);
      forged.push([{...c, wrong: []}, 'a wrong claim with no lock']);
      forged.push([{...c, at: [0, 2, 3, 1].map(k => c.at[k])}, 'a wrong claim from another pose']);
      forged.push([{...c, told: null}, 'a wrong claim with its message gone']);
      forged.push([{...c, told: 'middle'}, 'a wrong claim with a form message']);
    }
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
