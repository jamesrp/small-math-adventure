// Checks the Nearest dots pack (dist/families/sites/sites.json) by methods
// unlike the mechanic's. The mechanic (plane.js) finds a region's corners
// among the crossings of every pair of lines; here a region is cut out of a
// huge square one half-plane at a time (Sutherland–Hodgman clipping, BigInt
// points), touching is a one-dimensional linear program along the bisector of
// two dots, a four-way tie is a circumcentre checked against every dot, and a
// place belongs to a region by a point-in-polygon test. With those it
// recomputes every answer: the one set of dots for each target region (every
// placement of up to two dots, and for the triangle the side-by-side argument
// with a scan of the grid), the extra dots that change nothing where a
// puzzle has spare slots, every single dot that parts two regions, touches,
// ties or takes, that no one or two dots take R between P and Q, and the
// fewest dots that close a region (every placement of fewer). It checks the
// claims hints and notes make wherever the child's dots are (A, B and C
// share a place with D in any corner; D's region never touches only one
// other). Then it plays the puzzles: hints alone from fresh, after a wrong
// dot, after random play, after a refused Can't and a refused Fewest, with
// words that give the idea and not the spot, a Fewest refusal kept across
// Undo, Can't refused before an attempt, illegal moves, forged saves and the
// playground. Run: node scripts/validate-sites.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// The table in docs/sites/README.md, in grid squares.
const TABLE = {
  'sites-01': {level: 'easy', mode: 'make', answer: [[0, 0]]},
  'sites-02': {level: 'easy', mode: 'part', count: 7, answers: [[-1.5, 0], [-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0], [1.5, 0]]},
  'sites-03': {level: 'easy', mode: 'make', answer: [[-2, 0], [2, 0]]},
  // Extra dots that change nothing, as the notes say: not left of A or below
  // it, and at least as far from the corner (1, 1) of the shaded part as A is.
  'sites-04': {level: 'easy', mode: 'make', answer: [[0, 2], [2, 0]], harmless: z => z[0] >= 0 && z[1] >= 0 && (z[0] - 2) ** 2 + (z[1] - 2) ** 2 >= 8},
  'sites-05': {level: 'medium', mode: 'make', answer: [[1.5, 1]]},
  'sites-06': {level: 'medium', mode: 'four', count: 1, answers: [[0, -2]]},
  'sites-07': {level: 'medium', mode: 'touch', count: 56, middle: [[0, -2.5], [0, -3]]},
  'sites-08': {level: 'medium', mode: 'take', count: 17},
  'sites-09': {level: 'hard', mode: 'fit', fewest: 3},
  'sites-10': {level: 'hard', mode: 'make', answer: [[-2, 2], [0, -2], [2, 2]]},
  'sites-11': {level: 'hard', mode: 'take', count: 0, cant: ['P', 'Q']},
  'sites-12': {level: 'hard', mode: 'take', count: 2, answers: [[-1, 3], [-1.5, 2.5]]}
};

// --- Exact regions by clipping ------------------------------------------------
// A point is [X, Y, W] (BigInt, W > 0): (X/W, Y/W) in half-steps. A half-plane
// is a·u + b·v ≤ c with BigInt a, b, c.
const BOX = 10n ** 7n;
const B = n => BigInt(n);
const gcdB = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
const norm = ([X, Y, W]) => { if (W < 0n) [X, Y, W] = [-X, -Y, -W]; const g = gcdB(gcdB(X, Y), W) || 1n; return [X / g, Y / g, W / g]; };
const val = (h, [X, Y, W]) => h.a * X + h.b * Y - h.c * W;
const square = [[-BOX, -BOX, 1n], [BOX, -BOX, 1n], [BOX, BOX, 1n], [-BOX, BOX, 1n]];
function clip(poly, h) {
  const out = [];
  for (let k = 0; k < poly.length; k++) {
    const P = poly[k], Q = poly[(k + 1) % poly.length], p = val(h, P), q = val(h, Q);
    if (p <= 0n) out.push(P);
    if ((p < 0n && q > 0n) || (p > 0n && q < 0n)) out.push(norm([q * P[0] - p * Q[0], q * P[1] - p * Q[1], q * P[2] - p * Q[2]]));
  }
  return out;
}
// Places at least as near to s as to k: 2(k − s)·z ≤ |k|² − |s|².
const nearer = (s, k) => ({a: B(2 * (k[0] - s[0])), b: B(2 * (k[1] - s[1])), c: B(k[0] ** 2 + k[1] ** 2 - s[0] ** 2 - s[1] ** 2)});
const det3 = (P, Q, R) => P[0] * (Q[1] * R[2] - Q[2] * R[1]) - P[1] * (Q[0] * R[2] - Q[2] * R[0]) + P[2] * (Q[0] * R[1] - Q[1] * R[0]);
// Drop repeated corners and corners in the middle of a side.
function tidy(poly) {
  let v = poly.map(norm).filter((P, k, all) => all.findIndex(Q => Q.join() === P.join()) === k);
  for (let changed = true; changed && v.length > 2;) {
    changed = false;
    for (let k = 0; k < v.length; k++) if (det3(v[(k + v.length - 1) % v.length], v[k], v[(k + 1) % v.length]) === 0n) { v = v.filter((_, j) => j !== k); changed = true; break; }
  }
  return v;
}
const regionOf = (sites, i) => tidy(sites.reduce((poly, k, j) => (j === i ? poly : clip(poly, nearer(sites[i], k))), square));
const shapeOf = halves => tidy(halves.reduce((poly, h) => clip(poly, {a: B(h.a), b: B(h.b), c: B(h.c)}), square));
const key = poly => poly.map(P => P.join()).sort().join(' ');
const closed = poly => poly.every(([X, Y, W]) => X !== BOX * W && X !== -BOX * W && Y !== BOX * W && Y !== -BOX * W);
const inFrameRegion = (poly, F) => closed(poly) && poly.every(([X, Y, W]) => (X < 0n ? -X : X) <= B(F) * W && (Y < 0n ? -Y : Y) <= B(F) * W);
// A lattice place in a convex region whose corners run anticlockwise.
function holds(poly, z) {
  const [zx, zy] = z.map(B);
  return poly.every((P, k) => {
    const Q = poly[(k + 1) % poly.length];
    return (Q[0] * P[2] - P[0] * Q[2]) * (zy * P[2] - P[1]) - (Q[1] * P[2] - P[1] * Q[2]) * (zx * P[2] - P[0]) >= 0n;
  });
}

// --- Touching, ties and segments ------------------------------------------------
// Do regions i and j share a place? Walk the bisector z = m + λd (m the
// midpoint, d across the segment) and keep λ where no other dot is nearer.
function share(sites, i, j) {
  const s = sites[i], t = sites[j], d = [s[1] - t[1], t[0] - s[0]];
  let lo = null, hi = null; // fractions [n, m], m > 0
  const less = (x, y) => x[0] * y[1] < y[0] * x[1];
  for (const [k, w] of sites.entries()) {
    if (k === i || k === j) continue;
    const e = [w[0] - s[0], w[1] - s[1]], alpha = 2 * (e[0] * d[0] + e[1] * d[1]);
    const beta = w[0] ** 2 + w[1] ** 2 - s[0] ** 2 - s[1] ** 2 - (e[0] * (s[0] + t[0]) + e[1] * (s[1] + t[1]));
    if (alpha === 0) { if (beta < 0) return false; continue; }
    const bound = alpha > 0 ? [beta, alpha] : [-beta, -alpha];
    if (alpha > 0) { if (!hi || less(bound, hi)) hi = bound; } else if (!lo || less(lo, bound)) lo = bound;
  }
  return !lo || !hi || !less(hi, lo);
}
// Is some place shared by four or more dots? Every circumcentre of three.
function fourShare(sites) {
  for (let i = 0; i < sites.length; i++) for (let j = i + 1; j < sites.length; j++) for (let k = j + 1; k < sites.length; k++) {
    const [a, b, c] = [sites[i], sites[j], sites[k]];
    const a1 = 2 * (b[0] - a[0]), b1 = 2 * (b[1] - a[1]), c1 = b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2;
    const a2 = 2 * (c[0] - a[0]), b2 = 2 * (c[1] - a[1]), c2 = c[0] ** 2 + c[1] ** 2 - a[0] ** 2 - a[1] ** 2;
    const D = a1 * b2 - a2 * b1;
    if (!D) continue;
    const X = c1 * b2 - c2 * b1, Y = a1 * c2 - a2 * c1;
    const dist = s => (X - s[0] * D) ** 2 + (Y - s[1] * D) ** 2, r = dist(a);
    if (sites.every(s => dist(s) >= r) && sites.filter(s => dist(s) === r).length >= 4) return true;
  }
  return false;
}
// Is r on the closed segment from p to q? r = p + t(q − p) with 0 ≤ t ≤ 1.
function between(p, q, r) {
  const d = [q[0] - p[0], q[1] - p[1]], e = [r[0] - p[0], r[1] - p[1]];
  const axis = d[0] !== 0 ? 0 : 1;
  if (d[axis] === 0) return e[0] === 0 && e[1] === 0;
  const [n, m] = d[axis] > 0 ? [e[axis], d[axis]] : [-e[axis], -d[axis]];
  return n >= 0 && n <= m && e[0] * m === d[0] * n && e[1] * m === d[1] * n;
}

// --- Placements -------------------------------------------------------------------
const H = ([x, y]) => [2 * x, 2 * y];
const sameSet = (a, b) => JSON.stringify([...a].map(z => z.join()).sort()) === JSON.stringify([...b].map(z => z.join()).sort());
const framePoints = F => { const out = []; for (let u = -F; u <= F; u++) for (let v = -F; v <= F; v++) out.push([u, v]); return out; };
const freePoints = q => framePoints(q.frame).filter(z => !q.sites.some(s => s[0] === z[0] && s[1] === z[1]));
function* placements(free, n, from = 0, set = []) {
  if (set.length === n) { yield set; return; }
  for (let i = from; i < free.length; i++) yield* placements(free, n, i + 1, [...set, free[i]]);
}
// Does a placement meet the puzzle's goal, by this file's methods?
function works(q, dots) {
  const s = [...q.sites, ...dots], n = q.sites.length;
  switch (q.mode) {
    case 'make': return key(regionOf(s, q.focus)) === key(shapeOf(q.target));
    case 'part': return !share(s, ...q.apart);
    case 'touch': return dots.length === 1 && q.touch.every(i => share(s, n, i)) && q.avoid.every(i => !share(s, n, i));
    case 'four': return dots.length === 1 && fourShare(s);
    case 'take': { const cell = regionOf(s, q.focus); return q.keep.every(k => holds(cell, k.at)) && !holds(cell, q.take.at); }
    case 'fit': return inFrameRegion(regionOf(s, q.focus), q.frame);
    default: return false;
  }
}

// --- Play -------------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const SPOT = /\bsquares?\b|\b(right|left) of\b|\b(up|down) from\b|\b(above|below) [A-Z]\b/;
let slowest = 0;
function timedHint(p, a) {
  const t = performance.now(), h = nextHint(p, a), dt = performance.now() - t;
  slowest = Math.max(slowest, dt);
  return h;
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 40; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    // The words give the idea; the spot is for the ring and Apply hint.
    assert.ok(!SPOT.test(h.text), `${p.id} ${label}: "${h.text}" names no spot`);
    assert.ok(typeof h.spot === 'string' && h.spot.length > 5, `${p.id} ${label}: the spot, for the ring`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// The app's Undo: the engine's step back, then the mechanic's carry.
const undoOnce = (p, a) => { const next = undo(a); const carry = mechanicFor(p).carry; return carry && next !== a ? {...next, board: carry(p, a.board, next.board)} : next; };
// A small seeded random source, so a failure can be replayed.
function random(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }

export async function validateSites() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/sites/sites.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-15')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-15.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'sites');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  const levels = ['easy', 'medium', 'hard'].map(l => puzzles.filter(p => p.difficulty_level === l).length);
  assert.ok(Math.max(...levels) - Math.min(...levels) <= 1, `levels balanced (${levels.join('/')})`);

  const counts = {placementsChecked: 0, singleDotsChecked: 0, hintSteps: 0, randomStates: 0};
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'sites');
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }

    const row = TABLE[p.id];
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.ok(/^[^.]+\.$/.test(p.visibleObjective) && p.visibleObjective.length <= 70, `${p.id}: one short objective on the board`);
    assert.ok(q.sites.every(z => Math.abs(z[0]) <= q.frame && Math.abs(z[1]) <= q.frame), `${p.id}: dots in the frame`);
    const free = freePoints(q);

    if (q.mode === 'make') {
      const answer = row.answer.map(H), target = shapeOf(q.target);
      assert.ok(holds(target, q.sites[q.focus]), `${p.id}: A is in the target`);
      assert.ok(works(q, answer), `${p.id}: the answer makes the target`);
      assert.ok(answer.length <= q.budget, `${p.id}: within the budget`);
      assert.deepEqual(p.solution.dots, [...row.answer].sort((x, y) => x[0] - y[0] || x[1] - y[1]), `${p.id}: the pack's answer`);
      // Each side of the target is a side of A's region, so it lies on the
      // line halfway between A and some new dot: the grid point whose
      // bisector with A is that line. Exactly one grid point does it.
      const A = q.sites[q.focus];
      for (const h of q.target) {
        const onSide = target.filter(P => val({a: B(h.a), b: B(h.b), c: B(h.c)}, P) === 0n);
        assert.ok(onSide.length >= 2, `${p.id}: ${JSON.stringify(h)} is a whole side of the target`);
        const makers = free.filter(z => { const n = nearer(A, z), g = gcdB(gcdB(n.a, n.b), n.c), m = gcdB(gcdB(B(h.a), B(h.b)), B(h.c)); return n.a / g === B(h.a) / m && n.b / g === B(h.b) / m && n.c / g === B(h.c) / m; });
        assert.equal(makers.length, 1, `${p.id}: one grid point makes each side`);
        assert.ok(answer.some(z => z.join() === makers[0].join()), `${p.id}: that point is in the answer`);
      }
      assert.equal(q.target.length, answer.length, `${p.id}: one new dot per side, so every placement that works holds the answer`);
      if (q.budget > answer.length) {
        // Spare slots: a set of extra dots changes nothing exactly when each
        // one alone changes nothing (each adds one half-plane), so the
        // placements that work are the answer and any few of these extras.
        assert.ok(row.harmless, `${p.id}: spare slots are described`);
        const extras = free.filter(z => !answer.some(a => a.join() === z.join()) && works(q, [...answer, z]));
        counts.singleDotsChecked += free.length;
        assert.ok(sameSet(extras, free.filter(z => !answer.some(a => a.join() === z.join()) && row.harmless(z))), `${p.id}: the extras that change nothing are the ones the notes describe`);
        for (const set of placements(extras, 2)) { counts.placementsChecked++; assert.ok(works(q, [...answer, ...set]), `${p.id}: two harmless extras together`); }
        const choose = (n, k) => (k === 0 ? 1 : (choose(n, k - 1) * (n - k + 1)) / k);
        counts[`${p.id}Placements`] = Array.from({length: q.budget - answer.length + 1}, (_, k) => choose(extras.length, k)).reduce((x, y) => x + y, 0);
      } else assert.equal(answer.length, q.budget, `${p.id}: no spare slots, so the answer is the only placement`);
      // And by brute force where it is quick: every placement of up to two dots.
      if (q.budget <= 2) {
        const found = [];
        for (let n = 0; n <= q.budget; n++) for (const set of placements(free, n)) { counts.placementsChecked++; if (works(q, set)) found.push(set); }
        assert.equal(found.length, 1, `${p.id}: exactly one placement makes the target`);
        assert.ok(sameSet(found[0], answer), `${p.id}: and it is the answer`);
      }
    } else if (q.mode === 'part' || q.mode === 'touch' || q.mode === 'four' || q.mode === 'take') {
      const answers = free.filter(z => works(q, [z]));
      counts.singleDotsChecked += free.length;
      assert.equal(answers.length, row.count, `${p.id}: how many single dots work`);
      if (row.answers) assert.ok(sameSet(answers, row.answers.map(H)), `${p.id}: the single dots that work`);
      if (row.middle) assert.ok(sameSet(answers.filter(z => z[0] === 0), row.middle.map(H)), `${p.id}: the ones on the middle line`);
      if (q.mode !== 'take' || !row.cant) assert.ok(sameSet(p.solution.answers.map(H), answers), `${p.id}: the pack's answers`);
      if (q.mode === 'part') {
        // One dot parts them exactly when it is strictly between them (no
        // circle through both is then empty), as the notes explain.
        const [a, b] = q.apart.map(i => q.sites[i]);
        assert.ok(share(q.sites, ...q.apart), `${p.id}: they touch to begin with`);
        assert.ok(sameSet(answers, free.filter(z => between(a, b, z))), `${p.id}: the dots that work are the ones between ${q.apart.map(i => q.names[i])}`);
        // The extension: two dots, 1 square above and below the middle.
        const pair = [[0, 2], [0, -2]];
        assert.ok(!works(q, [pair[0]]) && !works(q, [pair[1]]) && works(q, pair), `${p.id}: the extension's two dots part them, and neither does alone`);
        assert.ok(pair.every(z => !between(a, b, z)), `${p.id}: neither extension dot is between them`);
      }
      if (q.mode === 'touch') {
        // The extension: D's region always borders at least two others.
        for (const z of free) { const s = [...q.sites, z]; assert.ok(q.sites.filter((_, i) => share(s, q.sites.length, i)).length >= 2, `${p.id}: D at ${z} touches two or more`); }
      }
      if (q.mode === 'four') {
        // Hint 1, wherever the child has put D: without D, A, B and C share
        // one place, 2 squares from each (hint 2); with D in any corner of
        // the frame they still do, so a Check there shows it.
        const [a, b, c] = q.sites;
        const a1 = 2 * (b[0] - a[0]), b1 = 2 * (b[1] - a[1]), c1 = b[0] ** 2 + b[1] ** 2 - a[0] ** 2 - a[1] ** 2;
        const a2 = 2 * (c[0] - a[0]), b2 = 2 * (c[1] - a[1]), c2 = c[0] ** 2 + c[1] ** 2 - a[0] ** 2 - a[1] ** 2;
        const D = a1 * b2 - a2 * b1, O = [(c1 * b2 - c2 * b1) / D, (a1 * c2 - a2 * c1) / D];
        assert.ok(O.every(Number.isInteger), `${p.id}: the meeting place is on the grid`);
        assert.ok(q.sites.every(s => (s[0] - O[0]) ** 2 + (s[1] - O[1]) ** 2 === 16), `${p.id}: it is 2 squares from A, B and C`);
        assert.ok(q.sites.every((_, i) => holds(regionOf(q.sites, i), O)), `${p.id}: without D, A, B and C share it`);
        assert.match(p.hints[0], /corner/);
        const F = q.frame;
        for (const z of [[F, F], [F, -F], [-F, F], [-F, -F]]) {
          const s = [...q.sites, z];
          assert.ok(q.sites.every((_, i) => holds(regionOf(s, i), O)) && !holds(regionOf(s, 3), O), `${p.id}: with D in the corner ${z}, A, B and C still share it`);
        }
      }
      if (q.mode === 'take') {
        const own = [{name: q.names[q.focus], at: q.sites[q.focus]}, ...q.keep];
        const pairs = [];
        for (let i = 0; i < own.length; i++) for (let j = i + 1; j < own.length; j++) if (between(own[i].at, own[j].at, q.take.at)) pairs.push([own[i].name, own[j].name]);
        assert.deepEqual(pairs, row.cant ? [row.cant] : [], `${p.id}: the segments through ${q.take.name}`);
        if (row.cant) {
          // No placement of up to the budget takes it (as the segment says).
          for (let n = 1; n <= q.budget; n++) for (const set of placements(free, n)) { counts.placementsChecked++; assert.ok(!works(q, set), `${p.id}: ${JSON.stringify(set)} can't take ${q.take.name}`); }
          assert.deepEqual(p.solution.cant, row.cant);
        }
      }
    } else {
      // Fit: no placement of fewer dots closes the region in the frame.
      for (let n = 0; n < row.fewest; n++) for (const set of placements(free, n)) { counts.placementsChecked++; assert.ok(!works(q, set), `${p.id}: ${n} dots can't`); }
      assert.equal(q.fewest, row.fewest, `${p.id}: the fewest`);
      assert.ok(q.budget > q.fewest, `${p.id}: the budget is not the answer`);
      assert.ok(q.witnesses.length && q.witnesses.every(W => W.length === row.fewest && works(q, W)), `${p.id}: every witness fits`);
      assert.equal(p.solution.fewest, row.fewest);
    }

    counts.hintSteps += checkPlay(p, fresh, row, free, counts);
  }
  // Taps should answer well under 100 ms; on a quiet laptop the slowest hint
  // here (the first, cold) takes about 15–40 ms. The bound is loose so a busy
  // test machine doesn't fail it; the report gives the time.
  assert.ok(slowest < 1000, `every hint well under a second (slowest ${slowest.toFixed(1)} ms)`);
  return {sitesPuzzles: puzzles.length, ...counts, slowestHintMs: Number(slowest.toFixed(1))};
}

function checkPlay(p, fresh, row, free, counts) {
  const q = p.parameters;
  let steps = 0;
  const first = timedHint(p, fresh);
  assert.equal(first.type, 'move', `${p.id}: a first hint`);
  assert.notEqual(first.action.type, 'cant', `${p.id}: Can't is never the first hint`);
  steps += hintsSolve(p, fresh, 'from fresh');

  // A wrong dot (one that does not work alone), checked, then hints.
  const wrong = free.find(z => !works(q, [z]) && !(q.mode === 'make' && row.answer.some(a => H(a).join() === z.join())));
  let a = play(p, fresh, {type: 'place', at: wrong});
  a = play(p, a, {type: 'check'});
  assert.ok(!isSolved(p, a.board), `${p.id}: a wrong dot checked is not a solve`);
  assert.equal(a.board.checked, true);
  steps += hintsSolve(p, a, 'after a wrong dot');

  // Random play: dots put down, moved and taken away, checks and claims.
  const rand = random(p.number * 7919);
  for (let trial = 0; trial < 12; trial++) {
    let b = fresh;
    for (let k = 0, n = 1 + Math.floor(rand() * 7); k < n; k++) {
      const dots = b.board.dots, z = free[Math.floor(rand() * free.length)], r = rand();
      const action = r < 0.45 ? {type: 'place', at: z} : r < 0.6 && dots.length ? {type: 'move', from: dots[Math.floor(rand() * dots.length)], to: z} : r < 0.7 && dots.length ? {type: 'remove', at: dots[0]} : r < 0.85 ? {type: 'check'} : q.mode === 'take' ? {type: 'cant', pair: [0, 1]} : {type: 'fewest'};
      const next = move(p, b, action);
      if (next && !isSolved(p, next.board)) b = next;
      if (next) assert.ok(validBoard(p, next.board), `${p.id}: a legal move leaves a valid board`);
    }
    counts.randomStates++;
    steps += hintsSolve(p, b, `after random play ${trial}`);
  }

  // Can't, only in the take puzzles, and only after a checked attempt.
  if (q.mode === 'take') {
    refuse(p, fresh, {type: 'cant', pair: [1, 2]}, 'Can’t on a fresh board');
    const placed = play(p, fresh, {type: 'place', at: wrong});
    refuse(p, placed, {type: 'cant', pair: [0, 1]}, 'Can’t before a Check');
    const checked = play(p, placed, {type: 'check'});
    const pairs = [[0, 1], ...(q.keep.length > 1 ? [[0, 2], [1, 2]] : [])];
    for (const pair of pairs) {
      const claim = play(p, checked, {type: 'cant', pair});
      const names = pair.map(k => (k ? q.keep[k - 1].name : q.names[q.focus]));
      if (row.cant && names.join() === row.cant.join()) {
        assert.ok(isSolved(p, claim.board), `${p.id}: Can’t with ${names} after an attempt solves`);
        assert.deepEqual(claim.board.dots, checked.board.dots, `${p.id}: the certificate is drawn round the child’s own dots`);
        continue;
      }
      assert.deepEqual(claim.board.refused, pair, `${p.id}: Can’t with ${names} is refused`);
      refuse(p, claim, {type: 'cant', pair}, 'the same claim again');
      refuse(p, claim, {type: 'cant', pair: [pair[1], pair[0]]}, 'the same claim turned round');
      steps += hintsSolve(p, claim, `after a refused Can’t (${names})`);
    }
    for (const pair of [[0, 0], [0, 9], [-1, 0], ['0', 1], [0], 'PQ']) refuse(p, checked, {type: 'cant', pair}, `Can’t with ${JSON.stringify(pair)}`);
    if (row.cant) {
      // The hint chain tries a dot, checks it, and only then names the segment.
      let b = fresh;
      const kinds = [];
      while (!isSolved(p, b.board)) { const h = nextHint(p, b); kinds.push(h.action.type); b = play(p, b, h.action); }
      assert.deepEqual(kinds, ['place', 'check', 'cant'], `${p.id}: an attempt, a Check, then Can’t`);
      assert.match(nextHint(p, checked).text, new RegExp(`${q.take.name} is on the straight line`), `${p.id}: the reason comes with Can’t`);
    }
  } else refuse(p, fresh, {type: 'cant', pair: [0, 1]}, 'Can’t outside the take puzzles');

  // Fewest, only in the fit puzzles.
  if (q.mode === 'fit') {
    refuse(p, fresh, {type: 'fewest'}, 'Fewest with nothing checked');
    const W = q.witnesses[0];
    let b = W.reduce((x, z) => play(p, x, {type: 'place', at: z}), fresh);
    refuse(p, b, {type: 'fewest'}, 'Fewest before Check');
    b = play(p, b, {type: 'check'});
    assert.ok(!isSolved(p, b.board), `${p.id}: Check alone does not solve`);
    assert.ok(isSolved(p, play(p, b, {type: 'fewest'}).board), `${p.id}: Fewest with the fewest dots solves`);
    // One more dot, still fitting: Fewest is refused and stays refused.
    const extra = free.find(z => !W.some(w => w.join() === z.join()) && works(q, [...W, z]));
    let c = play(p, b, {type: 'place', at: extra});
    c = play(p, c, {type: 'check'});
    c = play(p, c, {type: 'fewest'});
    assert.equal(c.board.fewer, row.fewest + 1, `${p.id}: Fewest with more dots is refused`);
    assert.ok(!isSolved(p, c.board));
    refuse(p, c, {type: 'fewest'}, 'Fewest twice');
    steps += hintsSolve(p, c, 'after a refused Fewest');
    // Undo takes back the move, not the refusal.
    const back = undoOnce(p, c);
    assert.equal(back.board.fewer, row.fewest + 1, `${p.id}: Undo keeps the refusal`);
    assert.ok(validBoard(p, back.board), `${p.id}: the board after Undo is valid`);
    refuse(p, back, {type: 'fewest'}, 'Fewest again after Undo');
    // A region that does not fit can't claim Fewest.
    const open = play(p, play(p, fresh, {type: 'place', at: W[0]}), {type: 'check'});
    refuse(p, open, {type: 'fewest'}, 'Fewest while the region runs off');
  } else refuse(p, fresh, {type: 'fewest'}, 'Fewest outside the fit puzzles');

  checkRefusals(p, fresh, free, row);
  return steps;
}

function checkRefusals(p, fresh, free, row) {
  const q = p.parameters, site = q.sites[0], z = free[0], F = q.frame;
  for (const [action, why] of [[null, 'nothing'], ['place', 'a string'], [{type: 'fly'}, 'an unknown move'], [{type: 'place'}, 'no place'], [{type: 'place', at: site}, 'a dot on a fixed dot'], [{type: 'place', at: [F + 1, 0]}, 'a dot past the frame'], [{type: 'place', at: [0.5, 0]}, 'a dot off the grid'], [{type: 'place', at: ['0', 0]}, 'a place named by strings'], [{type: 'place', at: [0, 0, 0]}, 'three numbers'], [{type: 'remove', at: z}, 'taking away a dot that is not there'], [{type: 'move', from: z, to: free[1]}, 'moving a dot that is not there']]) refuse(p, fresh, action, why);
  let a = play(p, fresh, {type: 'place', at: z});
  refuse(p, a, {type: 'place', at: z}, 'a dot on a dot');
  refuse(p, a, {type: 'move', from: z, to: site}, 'a move onto a fixed dot');
  refuse(p, a, {type: 'move', from: z, to: z}, 'a move that stays put');
  refuse(p, a, {type: 'move', from: z, to: [0, F + 1]}, 'a move past the frame');
  for (let k = 1; a.board.dots.length < q.budget; k++) a = play(p, a, {type: 'place', at: free[k]});
  refuse(p, a, {type: 'place', at: free.find(x => !a.board.dots.some(d => d.join() === x.join()))}, 'a dot past the budget');
  const checked = play(p, a, {type: 'check'});
  refuse(p, checked, {type: 'check'}, 'Check twice');
  // Nothing after a solve.
  let done = fresh;
  for (let k = 0; !isSolved(p, done.board) && k < 20; k++) done = play(p, done, nextHint(p, done).action);
  refuse(p, done, {type: 'place', at: free.find(x => !done.board.dots.some(d => d.join() === x.join()))}, 'a dot after a solve');

  // Forged saves.
  const base = fresh.board, two = [free[0], free[1]];
  const forged = [
    [{...base, dots: [[0, 0, 0]]}, 'a dot with three numbers'],
    [{...base, dots: [[0.5, 0]]}, 'a dot off the grid'],
    [{...base, dots: [[F + 1, 0]]}, 'a dot past the frame'],
    [{...base, dots: [site]}, 'a dot on a fixed dot'],
    [{...base, dots: [free[0], free[0]]}, 'a doubled dot'],
    [{...base, dots: [...two].reverse()}, 'dots out of order'],
    [{...base, dots: free.slice(0, q.budget + 1)}, 'dots past the budget'],
    [{...base, checked: 'yes'}, 'a Check that is not true or false'],
    [{...base, extra: 1}, 'an unknown field'],
    [{dots: []}, 'a missing field'],
    [[], 'a list'],
    [null, 'nothing']
  ];
  if (q.mode === 'take') {
    const tried = {...base, dots: [free[0]], checked: true};
    const cert = row.cant ? [1, 2] : null;
    forged.push([{...tried, claimed: [0, 1]}, 'a claim that is not a certificate']);
    if (cert) forged.push([{...base, claimed: cert}, 'a claim with no attempt'], [{...base, dots: [free[0]], claimed: cert}, 'a claim before a Check'], [{...tried, refused: cert}, 'a refusal of the certificate'], [{...tried, claimed: cert, refused: [0, 1]}, 'a claim both kept and refused']);
    forged.push([{...base, refused: [0, 1]}, 'a refusal with no attempt'], [{...tried, refused: [1, 0]}, 'a pair turned round'], [{...tried, refused: [0, 5]}, 'a place that is not there']);
    if (cert) assert.ok(validBoard(p, {...tried, claimed: cert}), `${p.id}: a claim after a checked attempt is a valid save`);
  }
  if (q.mode === 'fit') {
    const W = [...q.witnesses[0]].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    forged.push([{...base, done: true}, 'Fewest done with no dots'], [{...base, dots: W, done: true}, 'Fewest done before Check'], [{...base, fewer: q.fewest}, 'a refusal at the fewest'], [{...base, fewer: q.budget + 1}, 'a refusal past the budget'], [{...base, fewer: 2.5}, 'a refusal that is not a count']);
    if (W.length < q.budget) forged.push([{...base, dots: [...W, free.find(x => !W.some(w => w.join() === x.join()))].sort((x, y) => x[0] - y[0] || x[1] - y[1]), checked: true, done: true}, 'Fewest done with more than the fewest']);
    assert.ok(validBoard(p, {...base, dots: W, checked: true, done: true}), `${p.id}: Fewest done with the fewest dots is a valid save`);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh) {
  const q = p.parameters, M = mechanicFor(p);
  assert.equal(M.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  assert.ok(q.start.length >= 2);
  const free = framePoints(q.frame).filter(z => !q.start.some(s => s.join() === z.join()));
  let a = fresh;
  for (let k = 0; a.board.dots.length < 10; k++) a = play(p, a, {type: 'place', at: free[k * 7]});
  refuse(p, a, {type: 'place', at: free[1]}, 'an eleventh dot');
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  a = play(p, a, {type: 'move', from: q.start[0], to: free[1]});
  assert.ok(a.board.dots.some(d => d.join() === free[1].join()), `${p.id}: a starting dot moves`);
  a = play(p, a, {type: 'remove', at: q.start[1]});
  refuse(p, a, {type: 'check'}, 'Check in the playground');
  refuse(p, a, {type: 'fewest'}, 'Fewest in the playground');
  refuse(p, a, {type: 'move', from: free[1], to: free[0]}, 'a move onto a dot');
  for (const [board, why] of [[{dots: [q.start[0], q.start[0]]}, 'a doubled dot'], [{dots: Array.from({length: 11}, (_, k) => [k - 5, 0])}, 'eleven dots'], [{dots: [[q.frame + 1, 0]]}, 'a dot past the frame'], [{dots: [], checked: false}, 'a Check field']]) assert.equal(validBoard(p, {...board}), false, `${p.id}: rejects ${why}`);
  // The mechanic's map agrees with clipping on the starting dots.
  assert.ok(share(q.start, 0, 1), `${p.id}: the two starting regions share their edge`);
}

export default validateSites;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSites(), null, 2));
