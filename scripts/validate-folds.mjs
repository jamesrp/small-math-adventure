// Checks the Mirror Couriers shortest routes pack
// (dist/families/folds/folds.json): content fields and sources; every
// answer recomputed by brute force over the grid with its own exact length
// comparison (decimal bounds and prime factors here; the module folds the
// finish and uses binary bounds) and the equal-angle law in place of the
// fold; every start, every place for the moving letter, both orders of the
// walls over every pair of contacts, and every corner sequence round the
// block with its own crossing test; that hints alone solve from a fresh
// board, from random boards, after a refusal and after a lost try; claims
// only after an attempt and on a folded board; refusals and lost tries kept
// through Undo; how often random taps pass each claim; illegal moves and
// forged saves; and the CPU time of hints.
// Run: node scripts/validate-folds.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {sliceOf} from '../dist/families/folds/folds.js';

const range = (a, b) => Array.from({length: Math.max(0, b - a + 1)}, (_, i) => a + i);
const sq = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
const same = (p, q) => p[0] === q[0] && p[1] === q[1];
const json = x => JSON.stringify(x);

// --- Exact lengths, independently -------------------------------------------
// √n = k√s with s squarefree, by trial division over primes.
const primes = range(2, 400).filter(n => range(2, Math.floor(Math.sqrt(n))).every(d => n % d));
function squarefree(n) {
  let k = 1, s = 1, m = n;
  for (const p of primes) {
    let e = 0;
    while (m % p === 0) { m /= p; e++; }
    k *= p ** Math.floor(e / 2); if (e % 2) s *= p;
  }
  assert.equal(m, 1, `${n} has a prime factor over 400`);
  return [k, s];
}
function bigSqrt(n) { // floor of √n for a BigInt
  if (n < 2n) return n;
  let x = n, y = (x + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}
// The sign of Σ√pos − Σ√neg (whole numbers under the roots): exactly zero
// when every squarefree part cancels, otherwise found from decimal bounds.
export function sumSign(pos, neg) {
  const terms = new Map();
  for (const [list, sign] of [[pos, 1n], [neg, -1n]]) for (const n of list) {
    if (n === 0) continue;
    const [k, s] = squarefree(n);
    terms.set(s, (terms.get(s) ?? 0n) + sign * BigInt(k));
  }
  const live = [...terms].filter(([, c]) => c !== 0n);
  if (!live.length) return 0;
  for (let digits = 20n; digits < 2000n; digits *= 2n) {
    const scale = 10n ** (2n * digits);
    let lo = 0n, hi = 0n;
    for (const [s, c] of live) {
      const r = bigSqrt(BigInt(s) * scale);
      if (c > 0n) { lo += c * r; hi += c * (r + 1n); } else { lo += c * (r + 1n); hi += c * r; }
    }
    if (lo > 0n) return 1;
    if (hi < 0n) return -1;
  }
  throw new Error('no sign');
}
// The sign of p/√A + q/√B (the slope of a route's length along the line).
function slopeSign(p, A, q, B) {
  if (Math.sign(p) === Math.sign(q) || q === 0) return Math.sign(p);
  if (p === 0) return Math.sign(q);
  const d = p * p * B - q * q * A;
  return p > 0 ? Math.sign(d) : -Math.sign(d);
}

// --- Routes touching a line, by brute force ----------------------------------
const lineAt = (line, k) => line.dir === 'h' ? [k, line.at] : [line.at, k];
const along = (line, pt) => line.dir === 'h' ? pt[0] : pt[1];
const height = (line, pt) => Math.abs(line.dir === 'h' ? pt[1] - line.at : pt[0] - line.at);
const allowed = line => (line.windows ?? [[line.from, line.to]]).flatMap(([a, b]) => range(a, b));
const lengthAt = (line, S, F, k) => [sq(S, lineAt(line, k)), sq(lineAt(line, k), F)];
// The grid contacts of least length (all of them, to see ties).
function gridBest(line, S, F) {
  let best = [];
  for (const k of allowed(line)) {
    const c = best.length ? sumSign(lengthAt(line, S, F, k), lengthAt(line, S, F, best[0])) : -1;
    if (c < 0) best = [k]; else if (c === 0) best.push(k);
  }
  return best;
}
// Equal angles at the contact k: the along-steps in and out are in the
// ratio of the heights. Then k is the least over the whole line.
const equalAngles = (line, S, F, k) => (k - along(line, S)) * height(line, F) === (along(line, F) - k) * height(line, S);
// The least over every real contact the line allows: k from gridBest is it
// when its angles are equal, or, on a window end, when the length rises
// into the window (the length is convex along the line).
function trueBest(line, S, F) {
  const grid = gridBest(line, S, F);
  if (grid.length !== 1) return null;
  const k = grid[0];
  if (equalAngles(line, S, F, k)) return k;
  if (!line.windows) return null;
  const [A, B] = lengthAt(line, S, F, k), slope = slopeSign(k - along(line, S), A, k - along(line, F), B);
  const window = line.windows.find(([a, b]) => a <= k && k <= b);
  if (k === window[0] && k < window[1] && slope > 0) return k;
  if (k === window[1] && k > window[0] && slope < 0) return k;
  return null;
}
const bestLength = (line, S, F) => { const k = trueBest(line, S, F); return k === null ? null : lengthAt(line, S, F, k); };

// --- Two walls --------------------------------------------------------------
function wallsBrute(q) {
  const A = q.dots.A, B = q.dots.B, ks = range(q.walls.from, q.walls.to);
  let best = [];
  for (const first of ['lower', 'upper']) {
    const second = first === 'lower' ? 'upper' : 'lower';
    for (const k1 of ks) for (const k2 of ks) {
      const M1 = [k1, q.walls[first]], M2 = [k2, q.walls[second]], len = [sq(A, M1), sq(M1, M2), sq(M2, B)];
      const c = best.length ? sumSign(len, best[0].len) : -1;
      if (c < 0) best = [{first, k1, k2, len}]; else if (c === 0) best.push({first, k1, k2, len});
    }
  }
  return best;
}
// Reflect over the horizontal line y = c.
const flipY = (c, [x, y]) => [x, 2 * c - y];

// --- The block ---------------------------------------------------------------
// Does P–Q pass through the open rectangle? Cut the segment where it meets
// the rectangle's four lines and test the middle of each piece.
function throughBlock([x0, y0, x1, y1], P, Q) {
  const cuts = [[0, 1], [1, 1]], dx = Q[0] - P[0], dy = Q[1] - P[1];
  for (const [c, d, p] of [[x0, dx, P[0]], [x1, dx, P[0]], [y0, dy, P[1]], [y1, dy, P[1]]]) if (d !== 0) {
    const t = d > 0 ? [c - p, d] : [p - c, -d];
    if (t[0] > 0 && t[0] < t[1]) cuts.push(t);
  }
  cuts.sort((a, b) => a[0] * b[1] - b[0] * a[1]);
  for (let i = 1; i < cuts.length; i++) {
    const [a, b] = cuts[i - 1], [c, d] = cuts[i], num = a * d + c * b, den = 2 * b * d; // the middle parameter
    const x = P[0] * den + dx * num, y = P[1] * den + dy * num;
    if (x > x0 * den && x < x1 * den && y > y0 * den && y < y1 * den) return true;
  }
  return false;
}
function blockBrute(q) {
  const [x0, y0, x1, y1] = q.rect, corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const sequences = [];
  const grow = seq => { if (seq.length) sequences.push(seq); if (seq.length < 4) for (let i = 0; i < 4; i++) if (!seq.includes(i)) grow([...seq, i]); };
  grow([]);
  const legal = sequences.filter(seq => {
    const pts = [q.dots.A, ...seq.map(i => corners[i]), q.dots.B];
    return pts.slice(1).every((pt, i) => !throughBlock(q.rect, pts[i], pt));
  });
  const len = seq => { const pts = [q.dots.A, ...seq.map(i => corners[i]), q.dots.B]; return pts.slice(1).map((pt, i) => sq(pts[i], pt)); };
  let best = [];
  for (const seq of legal) { const c = best.length ? sumSign(len(seq), len(best[0])) : -1; if (c < 0) best = [seq]; else if (c === 0) best.push(seq); }
  return {legal, best, direct: !throughBlock(q.rect, q.dots.A, q.dots.B)};
}

// --- Play helpers -------------------------------------------------------------
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }
const pick = (random, list) => list[Math.floor(random() * list.length)];
// One Undo step as the app takes it: the engine steps back, then the module carries.
const back = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
// The moves a child can tap on this board, other than Fold and claims.
function taps(p, b) {
  const q = p.parameters, out = [];
  if (q.mode === 'route') {
    for (let i = 0; i < q.routes.length; i++) for (const at of allowed(q.line)) out.push({type: 'touch', route: i, at});
    if (q.move) for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) out.push({type: 'move', at: [x, y]});
  } else if (q.mode === 'every') {
    for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) out.push({type: 'start', at: [x, y]});
  } else if (q.mode === 'walls') {
    for (const wall of ['lower', 'upper']) for (const at of range(q.walls.from, q.walls.to)) out.push({type: 'touch', wall, at});
  } else if (q.mode === 'block') {
    for (let i = 0; i < 4; i++) out.push({type: 'corner', i});
    out.push({type: 'keep'});
    for (let i = 0; i < b.shelf.length; i++) out.push({type: 'drop', i});
  }
  return out.filter(action => mechanicFor(p).move(p, b, action));
}
// Two walls: with a complete route on the board, take the first touch away
// and touch it again, twice, so both orders have been folded and the
// touches are back as they were.
function bothOrders(p, a) {
  if (p.parameters.mode !== 'walls' || a.board.touches.length !== 2 || !a.board.folded) return a;
  for (let i = 0; i < 2; i++) { const [t] = a.board.touches, tap = {type: 'touch', wall: t.wall, at: t.at}; a = move(p, move(p, a, tap), tap); }
  return a;
}
const claimActions = p => p.parameters.mode === 'route' && p.parameters.claim === 'less' ? [{type: 'claim', route: 0}, {type: 'claim', route: 1}] : [{type: 'claim'}];
function hintLoop(p, start, label) {
  let a = start, steps = 0;
  for (; steps < 40 && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move (${json(a.board)})`);
    assert.ok(h.text, `${label}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move is legal (${json(h.action)})`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints solve`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
}
// Visible words in a render: no lengths, and nothing folded before Fold.
const visible = html => html.replace(/<p class="sr-only"[^>]*>.*?<\/p>/g, '').replace(/<[^>]*>/g, ' ');

export default async function validateFolds() {
  const folds = JSON.parse(await readFile(new URL('../dist/families/folds/folds.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const sourceIds = new Set(pack.sources.map(s => s.id));
  const puzzles = folds.puzzles.filter(p => p.band === 'all'), play = folds.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.equal(puzzles.filter(p => p.difficulty_level === level).length, 4, `four ${level} puzzles`);
  assert.ok(play && play.number === 0 && play.parameters.mode === 'playground' && play.difficulty_level === 'playground');
  for (const s of folds.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  for (const p of folds.puzzles) {
    assert.equal(p.mechanic, 'folds'); assert.equal(p.libraryFamily, 'billiard'); assert.equal(p.group, p.band === 'all' ? 'Shortest routes' : undefined); assert.equal(p.familyTitle, 'Mirror Couriers');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field], `${p.id}: ${field}`);
    assert.match(p.controls, /^(A route|C is B flipped)/, `${p.id}: How to play opens with the mathematics`);
    assert.equal(p.hints.length, 3, `${p.id}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => sourceIds.has(id)), `${p.id}: sources`);
    assert.match(p.provenance, /Week 21/, `${p.id}: provenance names the worksheet`);
    assert.ok(p.hints[0] && !/Press (Shortest|Shorter|That’s all|Less rope|Same rope|Same place)/.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
  }
  // The finish a claim names, the existence of a tie and the answers stay out
  // of titles, objectives and How to play.
  for (const p of puzzles) for (const words of [p.title, p.visibleObjective, p.controls]) assert.doesNotMatch(words, /\b(tie|two ways|both shortest|lower first|upper first)\b/i, `${p.id}: no answer in the copy`);

  const random = seeded(21);
  const report = {puzzles: folds.puzzles.length, gridContacts: 0, starts: 0, places: 0, wallPairs: 0, cornerSequences: 0, hintMoves: 0, randomHintStarts: 0, claims: 0, randomPass: {}};
  let worstHint = 0;
  for (const p of folds.puzzles) {
    const q = p.parameters, M = mechanicFor(p), label = p.id, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: valid start`);
    const html = M.render(p, {...fresh, hintLevel: 0});
    assert.doesNotMatch(html, /′|fd-letter image/, `${label}: nothing is folded before Fold`);
    assert.doesNotMatch(visible(html), /√|\d\.\d|\blength\b/i, `${label}: no length on the board`);
    if (q.mode === 'playground') {
      // The playground: C is B's mirror image, so both routes tie at every contact.
      for (const k of allowed(q.line)) { const C = [q.dots.B[0], -q.dots.B[1]]; assert.equal(sumSign(lengthAt(q.line, q.dots.A, q.dots.B, k), lengthAt(q.line, q.dots.A, C, k)), 0); }
      let a = fresh;
      for (const action of [{type: 'touch', at: 7}, {type: 'fold'}, {type: 'move', dot: 'A', at: [5, 4]}, {type: 'move', dot: 'B', at: [10, 1]}]) { a = move(p, a, action); assert.ok(a, `${label}: ${json(action)}`); assert.ok(!isSolved(p, a.board)); }
      for (const action of [{type: 'touch', at: 12}, {type: 'move', dot: 'A', at: [3, 0]}, {type: 'move', dot: 'A', at: [10, 1]}, {type: 'claim'}, {type: 'move', dot: 'C', at: [1, 1]}]) assert.equal(move(p, a, action), null, `${label}: rejects ${json(action)}`);
      for (const forged of [{...a.board, done: true}, {...a.board, at: 12}, {...a.board, dots: {A: [1, 0], B: [2, 2]}}, {...a.board, dots: {A: [2, 2], B: [2, 2]}}]) assert.equal(validBoard(p, forged), false, `${label}: rejects ${json(forged)}`);
      continue;
    }

    // The answer, by brute force.
    const sol = p.solution;
    if (q.mode === 'route' && !q.move) {
      const contacts = q.routes.map(([s, f]) => { report.gridContacts += allowed(q.line).length; return trueBest(q.line, q.dots[s], q.dots[f]); });
      assert.deepEqual(contacts, sol.contacts, `${label}: best contacts`);
      assert.ok(contacts.every(k => k !== null), `${label}: every best contact is a grid point`);
      if (q.line.windows) {
        const [s, f] = q.routes[0], free = {dir: q.line.dir, at: q.line.at, from: Math.min(...allowed(q.line)), to: Math.max(...allowed(q.line))};
        const k = gridBest(free, q.dots[s], q.dots[f])[0];
        assert.ok(!allowed(q.line).includes(k) || !equalAngles(free, q.dots[s], q.dots[f], k), `${label}: the unrestricted best is not allowed`);
      }
      if (q.claim === 'shorter') {
        const [s, f] = q.routes[0], beat = allowed(q.line).filter(k => q.guesses.every(g => sumSign(lengthAt(q.line, q.dots[s], q.dots[f], k), lengthAt(q.line, q.dots[s], q.dots[f], g)) < 0));
        assert.deepEqual(beat, [4, 5, 6], `${label}: the contacts that beat both dashed routes`);
        // Clear margins: every other contact is at least a twentieth longer
        // or shorter than the shorter dashed route.
        const L = k => lengthAt(q.line, q.dots[s], q.dots[f], k).reduce((t, n) => t + Math.sqrt(n), 0), bar = Math.min(...q.guesses.map(L));
        for (const k of allowed(q.line)) if (!q.guesses.includes(k)) assert.ok(Math.abs(L(k) / bar - 1) >= .05, `${label}: contact ${k} is clearly shorter or longer than the dashed routes`);
      }
      if (q.claim === 'less') {
        const [L0, L1] = q.routes.map(([s, f]) => bestLength(q.line, q.dots[s], q.dots[f])), c = sumSign(L0, L1);
        assert.notEqual(c, 0, `${label}: the ropes differ`);
        assert.equal(sol.choose, c < 0 ? 0 : 1, `${label}: the finish that needs less rope`);
        assert.ok(sq(q.dots.A, q.dots[q.routes[sol.choose][1]]) > sq(q.dots.A, q.dots[q.routes[1 - sol.choose][1]]), `${label}: the nearer finish needs more rope`);
      }
    }
    if (q.mode === 'route' && q.move) {
      const found = [];
      for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
        const at = [x, y];
        if (y <= 0 || Object.entries(q.dots).some(([l, d]) => l !== q.move && same(d, at))) continue;
        report.places++;
        const dots = {...q.dots, [q.move]: at}, routes = q.routes.map(([s, f]) => [dots[s], dots[f]]);
        const best = routes.map(([S, F]) => trueBest(q.line, S, F));
        const works = q.claim === 'tie'
          ? sq(routes[0][0], [routes[0][1][0], -routes[0][1][1]]) === sq(routes[1][0], [routes[1][1][0], -routes[1][1][1]])
          : best.every(k => k !== null) && best[0] === best[1];
        if (q.claim === 'tie' && works) assert.equal(sumSign(bestLength(q.line, ...routes[0]), bestLength(q.line, ...routes[1])), 0, `${label}: equal ropes at ${at}`);
        if (works) { assert.ok(best.every(k => k !== null), `${label}: a place that works has grid contacts (${at})`); found.push({at, contacts: best}); }
      }
      assert.deepEqual(found, sol.places, `${label}: every place for ${q.move}`);
      assert.ok(!found.some(s => same(s.at, q.dots[q.move])), `${label}: unsolved at the start`);
    }
    if (q.mode === 'every') {
      const B = q.dots[q.finish], P = lineAt(q.line, q.p), starts = [];
      for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
        const S = [x, y];
        if (y <= 0 || same(S, B)) continue;
        report.starts++;
        const best = gridBest(q.line, S, B);
        if (equalAngles(q.line, S, B, q.p)) { assert.deepEqual(best, [q.p], `${label}: ${S} touches P`); starts.push(S); }
      }
      assert.deepEqual(starts, sol.starts, `${label}: every start`);
      assert.ok(starts.length >= 2, `${label}: more than one start`);
      // They lie on one ray from P, away from B′.
      for (const S of starts) assert.equal((S[0] - P[0]) * (P[1] + B[1]) - (S[1] - P[1]) * (P[0] - B[0]), 0);
      // Claims audit: every start that misses, kept with every right one, is
      // refused with the same words and no ring, so That's all can't be used
      // to find the wrong start (it once ringed it).
      const shown = new Set();
      for (let x = q.place[0]; x <= q.place[2]; x++) for (let y = q.place[1]; y <= q.place[3]; y++) {
        const S = [x, y];
        if (y <= 0 || same(S, B) || starts.some(T => same(T, S))) continue;
        let a = fresh;
        for (const T of [...starts, S]) a = move(p, a, {type: 'start', at: T}) || a;
        if (a.board.starts.length !== starts.length + 1) continue;
        const refused = move(p, move(p, a, {type: 'fold'}), {type: 'claim'}), html = M.render(p, {...refused, hintLevel: 0});
        assert.doesNotMatch(html, /fd-mark/, `${label}: the start at ${S} is not ringed`);
        shown.add(visible(html).replace(/\s+/g, ' '));
      }
      assert.equal(shown.size, 1, `${label}: one refusal for every start that misses`);
      assert.match([...shown][0], /A start misses P\./);
    }
    if (q.mode === 'walls') {
      const best = wallsBrute(q);
      report.wallPairs += 2 * (q.walls.to - q.walls.from + 1) ** 2;
      assert.equal(best.length, 1, `${label}: one shortest route`);
      const [w] = best;
      assert.equal(w.first, sol.first); assert.deepEqual([w.k1, w.k2], sol.touches);
      const second = w.first === 'lower' ? 'upper' : 'lower';
      const image = flipY(q.walls[w.first], flipY(q.walls[second], q.dots.B)), other = flipY(q.walls[second], flipY(q.walls[w.first], q.dots.B));
      assert.equal(sumSign(w.len, [sq(q.dots.A, image)]), 0, `${label}: the route is as long as the line to the double image`);
      assert.ok(sq(q.dots.A, other) > sq(q.dots.A, image), `${label}: the other order's best is longer`);
      assert.equal(w.first === 'lower', q.dots.B[1] > q.dots.A[1], `${label}: lower first exactly when B is higher than A`);
    }
    if (q.mode === 'block') {
      const {legal, best, direct} = blockBrute(q);
      report.cornerSequences += legal.length;
      assert.equal(direct, false, `${label}: the straight line goes through the block`);
      assert.deepEqual(best.map(json).sort(), sol.routes.map(json).sort(), `${label}: every shortest route`);
      // A fold over the line through A and B maps the block to itself exactly when there is a tie.
      const symmetric = q.rect[1] + q.rect[3] === 2 * q.axis;
      assert.equal(symmetric, best.length === 2, `${label}: a tie exactly on the symmetric board`);
      assert.equal(q.dots.A[1], q.axis); assert.equal(q.dots.B[1], q.axis);
    }

    // Hints alone solve: from a fresh board, from random boards (including
    // refused claims and lost tries), and after Undo.
    report.hintMoves += hintLoop(p, fresh, `${label} fresh`);
    for (let trial = 0; trial < 30; trial++) {
      let a = fresh;
      const n = 1 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) {
        const options = [...taps(p, a.board), {type: 'fold'}, ...claimActions(p)].filter(action => M.move(p, a.board, action));
        if (!options.length) break;
        const next = move(p, a, pick(random, options));
        if (next && !isSolved(p, next.board)) a = next;
      }
      if (random() < .3) a = back(p, a);
      const t0 = process.cpuUsage();
      nextHint(p, a);
      const t = process.cpuUsage(t0); worstHint = Math.max(worstHint, (t.user + t.system) / 1000);
      report.hintMoves += hintLoop(p, a, `${label} random ${trial}`);
      report.randomHintStarts++;
    }

    // Claims: never on a fresh board, never before Fold, never twice on a
    // refused board; Undo keeps the refusal and clears only its note.
    for (const action of claimActions(p)) {
      assert.equal(move(p, fresh, action), null, `${label}: no claim on a fresh board`);
      assert.equal(move(p, move(p, fresh, {type: 'fold'}), action), null, `${label}: no claim on a folded fresh board`);
    }
    // Random attempts: up to four taps, Fold (and with two walls both
    // orders), then each claim. Every kind of board but the block has a
    // refusable claim; the block's That's all is a final choice.
    const wrong = (() => {
      for (let trial = 0; trial < 400; trial++) {
        let a = fresh;
        for (let i = 0; i < 4; i++) { const options = taps(p, a.board); if (!options.length) break; a = move(p, a, pick(random, options)) || a; }
        a = bothOrders(p, move(p, a, {type: 'fold'}) || a);
        if (!a.board.folded) continue;
        for (const action of claimActions(p)) {
          const before = M.move(p, a.board, action);
          if (before && before.refused.length > a.board.refused.length) return {a, action};
          if (before && q.mode === 'block' && !before.done) assert.equal(before.lost, true, `${label}: a wrong That’s all ends the try`);
        }
      }
      return null;
    })();
    if (q.mode === 'block') assert.equal(wrong, null, `${label}: no refusal that is not final`);
    else assert.ok(wrong, `${label}: a refusable claim`);
    if (wrong) {
      const {a, action} = wrong, refused = move(p, a, action);
      report.claims++;
      assert.equal(refused.board.told, true);
      assert.equal(move(p, refused, action), null, `${label}: no second claim on a refused board`);
      for (const other of claimActions(p)) assert.equal(move(p, refused, other), null, `${label}: every claim stays off on a refused board`);
      const undone = back(p, refused);
      assert.deepEqual(undone.board.refused, refused.board.refused, `${label}: Undo keeps the refusal`);
      assert.equal(undone.board.told, false, `${label}: Undo clears the note`);
      assert.notEqual(json(undone.board), json(refused.board), `${label}: Undo changes the board`);
      assert.equal(move(p, undone, action), null, `${label}: the claim stays off after Undo`);
      assert.ok(validBoard(p, undone.board));
      const text = visible(M.render(p, {...refused, hintLevel: 0}));
      assert.doesNotMatch(text, /\d/, `${label}: a refusal prints no numbers`);
      report.hintMoves += hintLoop(p, refused, `${label} after a refusal`);
      assert.ok(validBoard(p, refused.board), `${label}: a refused claim saves`);
    }
    // A wrong final choice ends the try, through Undo too: the finish in
    // puzzle 4, the stretch in the windows, the order of the walls and the
    // shelf round the block.
    const lostTry = (() => {
      let a = fresh;
      const tap = action => { a = move(p, a, action); assert.ok(a, `${label}: ${json(action)}`); };
      if (q.mode === 'walls') {
        // Both orders folded, the worse order last.
        const second = sol.first === 'lower' ? 'upper' : 'lower';
        for (const action of [{type: 'touch', wall: second, at: 5}, {type: 'touch', wall: sol.first, at: 6}, {type: 'fold'}]) tap(action);
        assert.equal(move(p, a, {type: 'claim'}), null, `${label}: no claim before both orders are folded`);
        for (const action of [{type: 'touch', wall: second, at: 5}, {type: 'touch', wall: second, at: 5}]) tap(action);
        assert.deepEqual([...a.board.seen].sort(), ['lower', 'upper'], `${label}: both orders folded`);
        for (const action of [{type: 'touch', wall: sol.first, at: 6}, {type: 'touch', wall: sol.first, at: 6}]) tap(action);
        tap({type: 'claim'});
        return a;
      }
      if (q.mode === 'route' && q.claim === 'less') {
        for (const [i, k] of sol.contacts.entries()) tap({type: 'touch', route: i, at: k});
        tap({type: 'fold'}); tap({type: 'claim', route: 1 - sol.choose});
        assert.equal(a.board.pick, 1 - sol.choose); assert.equal(a.board.done, false);
        return a;
      }
      if (q.mode === 'route' && q.line.windows) {
        // Every allowed contact: the best is right, the other stretch's best
        // end is final, and the rest are refused.
        const [S, F] = q.routes[0].map(l => q.dots[l]), ends = q.line.windows.map(([lo, hi]) => trueBest({dir: q.line.dir, at: q.line.at, windows: [[lo, hi]]}, S, F));
        for (const k of allowed(q.line)) {
          const b = M.move(p, M.move(p, M.move(p, fresh.board, {type: 'touch', route: 0, at: k}), {type: 'fold'}), {type: 'claim'});
          if (k === sol.contacts[0]) assert.equal(b.done, true, `${label}: ${k} is shortest`);
          else if (ends.includes(k)) assert.equal(b.lost, true, `${label}: ${k}, the other stretch’s best, ends the try`);
          else assert.ok(!b.lost && b.refused.length === 1, `${label}: ${k} is refused`);
        }
        tap({type: 'touch', route: 0, at: ends.find(k => k !== sol.contacts[0])}); tap({type: 'fold'}); tap({type: 'claim'});
        return a;
      }
      if (q.mode === 'block') {
        // Keep the best route round the other side, or only one of a tie.
        const {best, legal} = blockBrute(q), over = best.length === 1 ? legal.filter(path => path.every(i => (i < 2) !== (best[0][0] < 2))).sort((x, y) => x.length - y.length)[0] : best[0];
        for (const i of over) tap({type: 'corner', i});
        tap({type: 'keep'}); tap({type: 'fold'}); tap({type: 'claim'});
        return a;
      }
      return null;
    })();
    if (lostTry) {
      const a = lostTry;
      report.claims++;
      assert.equal(a.board.lost, true, `${label}: the wrong choice ends the try`);
      assert.ok(validBoard(p, a.board), `${label}: a lost try saves`);
      assert.equal(M.noUndo(p), false);
      const text = visible(M.render(p, {...a, hintLevel: 0}));
      assert.equal(M.noUndo(p), true, `${label}: Undo is off in a lost try`);
      assert.match(text, /Again/, `${label}: a lost try offers Again`);
      assert.doesNotMatch(text, /\d/, `${label}: a lost try prints no numbers`);
      assert.deepEqual(back(p, a).board, a.board, `${label}: Undo can't leave a lost try`);
      for (const action of [...taps(p, fresh.board).slice(0, 3), {type: 'fold'}, ...claimActions(p)]) assert.equal(move(p, a, action), null, `${label}: a lost try takes only Again`);
      report.hintMoves += hintLoop(p, a, `${label} after a lost try`);
      M.render(p, {...fresh, hintLevel: 0});
      assert.equal(M.noUndo(p), false);
    } else assert.ok(!(q.mode === 'walls' || q.mode === 'block' || q.claim === 'less' || q.line?.windows), `${label}: a final choice is tested`);

    // How often random taps pass the claim: up to six taps, Fold, one claim.
    let pass = 0;
    const runs = 1500;
    for (let run = 0; run < runs; run++) {
      let b = fresh.board;
      const n = 1 + Math.floor(random() * 6);
      for (let i = 0; i < n; i++) { const options = taps(p, b); if (!options.length) break; b = M.move(p, b, pick(random, options)) || b; }
      if (!b.folded) b = M.move(p, b, {type: 'fold'});
      if (q.mode === 'walls') b = bothOrders(p, {...fresh, board: b}).board;
      const action = pick(random, claimActions(p)), next = M.move(p, b, action);
      if (next && M.solved(p, next)) pass++;
    }
    report.randomPass[label] = +(pass / runs).toFixed(3);
    assert.ok(pass / runs < (q.claim === 'shorter' ? .4 : .15), `${label}: random taps rarely pass (${pass}/${runs})`);

    // Illegal moves and forged saves.
    const b = fresh.board;
    const illegal = [null, 'fold', {type: 'shrug'}, {type: 'again'}, {type: 'fold', extra: 1}];
    if (q.mode === 'route') {
      illegal.push({type: 'touch', route: 0, at: -1}, {type: 'touch', route: 0, at: 99}, {type: 'touch', route: 0, at: 1.5}, {type: 'touch', route: 5, at: allowed(q.line)[0]}, {type: 'touch', at: allowed(q.line)[0]});
      if (q.line.windows) illegal.push({type: 'touch', route: 0, at: 6});
      if (q.move) illegal.push({type: 'move', at: q.dots.A}, {type: 'move', at: [1, 0]}, {type: 'move', at: [1, -2]}, {type: 'move', at: [q.place[2] + 1, 1]}, {type: 'move', at: q.dots[q.move]});
      else illegal.push({type: 'move', at: [1, 1]});
      if (q.claim === 'less') illegal.push({type: 'claim'}, {type: 'claim', route: 2});
    }
    if (q.mode === 'every') illegal.push({type: 'start', at: q.dots[q.finish]}, {type: 'start', at: [3, 0]}, {type: 'start', at: [3, -1]}, {type: 'start', at: [q.place[2] + 1, 1]}, {type: 'start', at: [1.5, 1]});
    if (q.mode === 'walls') illegal.push({type: 'touch', wall: 'middle', at: 3}, {type: 'touch', wall: 'lower', at: q.walls.to + 1}, {type: 'touch', wall: 'lower', at: -1}, {type: 'touch', wall: 'lower'});
    if (q.mode === 'block') {
      // A first corner the rope can't reach without crossing, and keeping a route through the block.
      const blocked = range(0, 3).filter(i => !M.move(p, b, {type: 'corner', i}));
      assert.ok(blocked.length === 0 || blocked.every(i => i >= 0), `${label}: corners`);
      illegal.push({type: 'corner', i: 4}, {type: 'keep'}, {type: 'drop', i: 0});
      const one = M.move(p, b, {type: 'corner', i: 0});
      assert.equal(M.move(p, one, {type: 'keep'}), null, `${label}: no keeping a route through the block`);
      assert.equal(M.move(p, one, {type: 'corner', i: 2}), null, `${label}: no corner across the block`);
    }
    for (const action of illegal) assert.equal(M.move(p, b, action), null, `${label}: rejects ${json(action)}`);
    // Every legal tap is undone by Undo, visibly.
    for (const action of taps(p, b).slice(0, 8)) { const a = move(p, fresh, action); assert.notEqual(json(back(p, a).board), json(a.board)); }

    const solvedBoard = (() => { let a = fresh; for (let i = 0; i < 40 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action); return a.board; })();
    assert.ok(validBoard(p, solvedBoard));
    const forgeries = [null, {}, {...b, extra: 1}, {...b, done: true}, {...b, folded: true, done: true}, {...b, told: true}, {...b, told: 'yes'}, {...b, refused: 'x'},
      {...solvedBoard, folded: false}];
    if (q.mode === 'route') {
      const contacts = b.contacts.map(() => allowed(q.line)[0]);
      forgeries.push({...b, contacts: [...b.contacts, null]}, {...b, contacts: b.contacts.map(() => 99)}, {...b, contacts, folded: true, done: true}, {...b, pick: 0}, {...solvedBoard, pick: q.claim === 'less' ? 1 - solvedBoard.pick : 0});
      forgeries.push({...b, contacts, folded: true, refused: [{state: q.move ? {contacts, at: b.at} : {contacts}, why: 'beaten', mark: 7}]});
      if (q.move) forgeries.push({...b, at: q.dots.A}, {...b, at: [0, 0]});
      if (q.claim !== 'less') forgeries.push({...solvedBoard, pick: 0});
      if (q.claim === 'less') forgeries.push({...solvedBoard, pick: null}, {...solvedBoard, done: false, pick: sol.choose}, {...solvedBoard, done: false, lost: true}, {...b, lost: true, pick: 0});
      forgeries.push({...b, lost: true}, {...b, lost: 'no'}, {...solvedBoard, lost: true}, {...solvedBoard, done: false, lost: true});
    }
    if (q.mode === 'every') forgeries.push({...b, starts: [[1, 1], [1, 1]]}, {...b, starts: [[2, 2], [1, 1]]}, {...b, starts: [q.dots[q.finish]]}, {...solvedBoard, starts: solvedBoard.starts.slice(1)},
      {...b, starts: [[1, 1]], folded: true, refused: [{state: {starts: [[1, 1]]}, why: 'more'}]});
    if (q.mode === 'walls') forgeries.push({...b, seen: ['lower', 'lower']}, {...b, seen: ['middle']}, {...b, seen: 'lower'}, {...solvedBoard, seen: [sol.first]}, {...solvedBoard, done: false, lost: true},
      {...b, touches: [{wall: 'lower', at: 1}, {wall: 'lower', at: 2}]}, {...b, lost: true}, {...solvedBoard, lost: true}, {...solvedBoard, touches: solvedBoard.touches.map(t => ({...t, at: t.at + 1}))},
      {...b, touches: [{wall: sol.first === 'lower' ? 'upper' : 'lower', at: 4}, {wall: sol.first, at: 4}], folded: true, refused: [{state: {touches: [{wall: sol.first === 'lower' ? 'upper' : 'lower', at: 4}, {wall: sol.first, at: 4}]}, why: 'shorter'}]});
    if (q.mode === 'block') forgeries.push({...b, lost: true}, {...solvedBoard, lost: true}, {...solvedBoard, done: false, lost: true}, {...b, path: [0, 2]}, {...b, path: [0, 0]}, {...b, shelf: [[0]]}, {...b, shelf: [[0, 1], [0, 1]]}, {...solvedBoard, shelf: solvedBoard.shelf.slice(1)},
      {...b, shelf: [[0, 1, 2]], folded: true, refused: [{state: {shelf: [[0, 1, 2]]}, why: 'more'}]});
    // A refusal recorded for a board whose claim is right.
    forgeries.push({...solvedBoard, done: false, refused: [{state: sliceOf(q, solvedBoard), why: 'more'}]});
    for (const forged of forgeries) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${json(forged)}`);
  }
  assert.ok(worstHint < 50, `hints take ${worstHint.toFixed(1)} ms of CPU`);
  report.worstHintMs = +worstHint.toFixed(2);
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateFolds(), null, 2));
