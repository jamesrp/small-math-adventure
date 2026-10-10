// Checks the Area traps pack (dist/families/covers/covers.json): content
// fields and sources; every square's colour recomputed by integrating the
// shape's horizontal slices in exact fractions (the mechanic clips polygons
// instead); every split plan within each budget searched by brute force,
// splitting green and blank squares too, against the plans the pack names;
// the Best argument (at one level the gains add, so the best plan takes the
// largest); every painting count for the paint targets; every grid position
// and the fewest slides for the slide puzzles, with a first step that makes
// things worse; pieces too thin to see; witnesses played as moves; hint
// chains from fresh, after a wasted move and after refused claims; Can't
// tried on every painting that fits, holding only on the closest painting to
// an impossible target and refused alike everywhere else; illegal moves;
// forged saves; the playground.
// Run: node scripts/validate-covers.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

/* Exact fractions, written again here rather than shared with the mechanic. */
const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
class F {
  constructor(n, d = 1n) { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; this.n = n / g; this.d = d / g; }
  static of(x) { let d = 1; while (!Number.isInteger(x * d)) d *= 2; return new F(BigInt(x * d), BigInt(d)); }
  add(o) { return new F(this.n * o.d + o.n * this.d, this.d * o.d); }
  sub(o) { return new F(this.n * o.d - o.n * this.d, this.d * o.d); }
  mul(o) { return new F(this.n * o.n, this.d * o.d); }
  div(o) { return new F(this.n * o.d, this.d * o.n); }
  cmp(o) { const s = this.n * o.d - o.n * this.d; return s > 0n ? 1 : s < 0n ? -1 : 0; }
  num() { return Number(this.n) / Number(this.d); }
}
const ZERO = new F(0n), HALF = new F(1n, 2n);
const fmin = (a, b) => a.cmp(b) <= 0 ? a : b, fmax = (a, b) => a.cmp(b) >= 0 ? a : b;

// The area of the shape inside [x0, x0 + s] × [y0, y0 + s]: between
// neighbouring breakpoints (corner heights, the square's top and bottom, and
// heights where an edge crosses the square's sides) the slice length is
// linear in y, so its value at the middle height times the height is exact.
function areaIn(shape, x0, y0, s) {
  const P = shape.map(([x, y]) => [F.of(x), F.of(y)]), X0 = F.of(x0), Y0 = F.of(y0), S = F.of(s), X1 = X0.add(S), Y1 = Y0.add(S);
  const cuts = [Y0, Y1];
  P.forEach(([, y], i) => {
    cuts.push(y);
    const a = P[i], b = P[(i + 1) % P.length];
    if (a[0].cmp(b[0]) === 0) return;
    for (const X of [X0, X1]) { const t = X.sub(a[0]).div(b[0].sub(a[0])); if (t.cmp(ZERO) > 0 && t.cmp(new F(1n)) < 0) cuts.push(a[1].add(t.mul(b[1].sub(a[1])))); }
  });
  const ys = cuts.filter(y => y.cmp(Y0) >= 0 && y.cmp(Y1) <= 0).sort((a, b) => a.cmp(b)).filter((y, i, l) => i === 0 || y.cmp(l[i - 1]) !== 0);
  let area = ZERO;
  for (let k = 0; k + 1 < ys.length; k++) {
    const y = ys[k].add(ys[k + 1]).mul(HALF), xs = [];
    P.forEach((a, i) => { const b = P[(i + 1) % P.length]; if ((a[1].cmp(y) < 0) !== (b[1].cmp(y) < 0)) xs.push(a[0].add(y.sub(a[1]).div(b[1].sub(a[1])).mul(b[0].sub(a[0])))); });
    xs.sort((a, b) => a.cmp(b));
    let len = ZERO;
    for (let j = 0; j + 1 < xs.length; j += 2) { const l = fmax(xs[j], X0), r = fmin(xs[j + 1], X1); if (r.cmp(l) > 0) len = len.add(r.sub(l)); }
    area = area.add(len.mul(ys[k + 1].sub(ys[k])));
  }
  return area;
}
const colours = new WeakMap();
function colour(shape, x, y, s) {
  if (!colours.has(shape)) colours.set(shape, new Map());
  const seen = colours.get(shape), key = `${x}|${y}|${s}`;
  if (!seen.has(key)) { const a = areaIn(shape, x, y, s); seen.set(key, a.cmp(ZERO) === 0 ? 'out' : a.cmp(F.of(s * s)) === 0 ? 'whole' : 'part'); }
  return seen.get(key);
}
const polygonArea = shape => { let t = 0; shape.forEach(([a, b], i) => { const [c, d] = shape[(i + 1) % shape.length]; t += a * d - b * c; }); return Math.abs(t) / 2; };

/* Split boards: nodes "x,y,d" as in the save format, bounds from the leaves. */
const kids = key => { const [x, y, d] = key.split(',').map(Number); return [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => `${2 * x + a},${2 * y + b},${d + 1}`); };
const nodes = new Map();
const nodeOf = key => { if (!nodes.has(key)) { const [x, y, d] = key.split(',').map(Number); nodes.set(key, {x, y, d, side: 1 / 2 ** d}); } return nodes.get(key); };
const statusOf = (q, key) => { const n = nodeOf(key); return colour(q.shape, n.x * n.side, n.y * n.side, n.side); };
const roots = q => Array.from({length: q.rows * q.cols}, (_, i) => `${i % q.cols},${Math.floor(i / q.cols)},0`);
function bounds(q, splits) {
  const set = new Set(splits);
  let inside = 0, cover = 0;
  const walk = k => { if (set.has(k)) return kids(k).forEach(walk); const st = statusOf(q, k), a = nodeOf(k).side ** 2; if (st === 'whole') inside += a; if (st !== 'out') cover += a; };
  roots(q).forEach(walk);
  return {inside, cover, gap: cover - inside};
}
// Every set of at most `budget` splits closed under parents, of any square.
function allPlans(q, budget) {
  const out = [];
  (function grow(set, frontier) {
    out.push(set);
    if (set.length === budget) return;
    frontier.forEach((k, i) => grow([...set, k], [...frontier.slice(i + 1), ...(nodeOf(k).d + 1 < q.depth ? kids(k) : [])]));
  })([], roots(q));
  return out;
}
const canon = list => [...list].sort().join(' ');

/* Pieces too thin to see: in each partial square, sampled at 40 × 40, every
 * connected patch of shape and of background must reach some point at least
 * MIN_PX from the other kind and from the square's sides, on a board 300 px
 * wide at phone size. The Week 48 trapezoid’s corner pieces (2.8 px) fail. */
const MIN_PX = 3.5, N = 40;
function inside(shape, x, y) { let c = false; shape.forEach(([ax, ay], i) => { const [bx, by] = shape[(i + 1) % shape.length]; if ((ay > y) !== (by > y) && x < ax + (y - ay) / (by - ay) * (bx - ax)) c = !c; }); return c; }
function thinnest(shape, x0, y0, s, pxPerUnit) {
  const g = Array.from({length: N * N}, (_, k) => inside(shape, x0 + ((k % N) + .5) * s / N, y0 + (Math.floor(k / N) + .5) * s / N));
  if (g.every(v => v) || g.every(v => !v)) return 0;
  // Samples on the edge of their kind: the nearest sample of the other kind
  // to any point is always one of these.
  const edges = [[], []];
  g.forEach((v, j) => { const x = j % N, y = Math.floor(j / N); if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => x + dx >= 0 && y + dy >= 0 && x + dx < N && y + dy < N && g[(y + dy) * N + x + dx] !== v)) edges[v ? 1 : 0].push(x, y); });
  // Distance from each sample to the other kind or to the square's sides: a
  // sliver against a side is still a sliver.
  const dist = new Float64Array(N * N);
  for (let k = 0; k < N * N; k++) {
    const x = k % N, y = Math.floor(k / N), list = edges[g[k] ? 0 : 1];
    let best = Math.min(x + .5, y + .5, N - x - .5, N - y - .5) ** 2;
    for (let e = 0; e < list.length; e += 2) { const dx = list[e] - x, dy = list[e + 1] - y, d = dx * dx + dy * dy; if (d < best) best = d; }
    dist[k] = Math.sqrt(best);
  }
  const seen = new Uint8Array(N * N);
  let worst = Infinity;
  for (let k = 0; k < N * N; k++) {
    if (seen[k]) continue;
    let deepest = 0;
    const stack = [k]; seen[k] = 1;
    while (stack.length) {
      const c = stack.pop(), cx = c % N, cy = Math.floor(c / N);
      if (dist[c] > deepest) deepest = dist[c];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, n = ny * N + nx; if (nx >= 0 && ny >= 0 && nx < N && ny < N && !seen[n] && g[n] === g[k]) { seen[n] = 1; stack.push(n); } }
    }
    worst = Math.min(worst, deepest);
  }
  return worst * s / N * pxPerUnit;
}

/* Slides. */
const STEPS = 4, WAYS = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};
const wrap = v => ((v % STEPS) + STEPS) % STEPS;
function slideAt(q, [ox, oy]) {
  let inside = 0, cover = 0;
  for (let j = -1; j <= q.height; j++) for (let i = -1; i <= q.width; i++) { const st = colour(q.shape, i + ox / STEPS, j + oy / STEPS, 1); if (st === 'whole') inside++; if (st !== 'out') cover++; }
  return {inside, cover, gap: cover - inside};
}
const meets = (g, b) => (g.inside === undefined || b.inside >= g.inside) && (g.cover === undefined || b.cover <= g.cover) && (g.gap === undefined || b.gap <= g.gap);

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const t = performance.now(), h = nextHint(p, a);
    assert.ok(performance.now() - t < 400, `${p.id} ${label}: a hint is quick`);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}

// The table in docs/covers/README.md.
const TABLE = {
  'covers-01': {mode: 'split', start: [6, 10], area: 8, answer: 2},
  'covers-02': {mode: 'slide', start: [0, 8], area: 3, at: [[0, 0]], steps: 4},
  'covers-03': {mode: 'paint', bounds: [3, 6], answer: 'possible', counts: [[1, 1, 1]]},
  'covers-04': {mode: 'split', start: [0, 5], area: 2.25, answer: 4, plans: 5},
  'covers-05': {mode: 'slide', start: [6, 12], area: 8.5, at: [[1, 1]], steps: 2},
  'covers-06': {mode: 'split', start: [4, 16], area: 9, answer: 14.5, plans: 6},
  'covers-07': {mode: 'paint', bounds: [3, 6], answer: 'cover'},
  'covers-08': {mode: 'slide', start: [4, 12], area: 8, at: [[1, 1]], steps: 4},
  'covers-09': {mode: 'split', start: [4, 16], area: 9, answer: 9, plans: 4},
  'covers-10': {mode: 'split', start: [1, 5], area: 2.75, answer: 2, plans: 6},
  'covers-11': {mode: 'paint', bounds: [4, 8], answer: 'possible', counts: [[3, 3, 3, 3]]},
  'covers-12': {mode: 'paint', bounds: [4, 8], answer: 'inside'}
};

export async function validateCovers() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/covers/covers.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-48')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-48.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'covers');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const mode of ['split', 'paint', 'slide']) assert.ok(puzzles.some(p => p.parameters.mode === mode), `a ${mode} puzzle`);

  const stats = {plansSearched: 0, squaresChecked: 0, thinnestPx: Infinity, hintSteps: 0, cantTried: 0};
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'covers');
    assert.ok(p.id.startsWith('covers-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle', 'title']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(p.visibleObjective.length <= 45, `${p.id}: one short objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(/Week 48|^New/.test(p.provenance), `${p.id}: provenance names the week or says new`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    assert.ok(!/can’t|can't/i.test(p.hints[0]), `${p.id}: the first hint does not ask for Can’t`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh, stats); continue; }
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.ok(!new RegExp(`\\b${String(row.answer).replace('.', '\\.')}\\b`).test(p.title), `${p.id}: the title does not name the answer`);
    if (q.mode === 'split') stats.hintSteps += checkSplit(p, fresh, row, stats);
    else if (q.mode === 'paint') stats.hintSteps += checkPaint(p, fresh, row, stats);
    else stats.hintSteps += checkSlide(p, fresh, row, stats);
  }
  return {coversPuzzles: puzzles.length, plansSearched: stats.plansSearched, partialSquaresCheckedForSlivers: stats.squaresChecked, thinnestPiecePx: Number(stats.thinnestPx.toFixed(1)), cantTriedOnFittingPaintings: stats.cantTried, hintSteps: stats.hintSteps};
}

function sliversOk(label, q, stats) {
  const px = 300 / Math.max(q.cols, q.rows);
  for (let d = 0; d <= q.depth; d++) {
    const n = 2 ** d;
    for (let y = 0; y < q.rows * n; y++) for (let x = 0; x < q.cols * n; x++) {
      if (colour(q.shape, x / n, y / n, 1 / n) !== 'part') continue;
      const t = thinnest(q.shape, x / n, y / n, 1 / n, px);
      stats.squaresChecked++; stats.thinnestPx = Math.min(stats.thinnestPx, t);
      assert.ok(t >= MIN_PX, `${label}: the partial square ${x},${y} at level ${d} has a piece ${t.toFixed(1)} px thick`);
    }
  }
}

function checkSplit(p, fresh, row, stats) {
  const q = p.parameters, b0 = bounds(q, []);
  assert.deepEqual([b0.inside, b0.cover], row.start, `${p.id}: starting bounds`);
  assert.ok(Math.abs(polygonArea(q.shape) - row.area) < 1e-9, `${p.id}: area`);
  assert.ok(b0.inside < row.area && row.area < b0.cover, `${p.id}: the area is between the bounds`);
  sliversOk(p.id, q, stats);
  const plans = allPlans(q, q.budget);
  stats.plansSearched += plans.length;
  const measure = b => q.goal.kind === 'best' ? b[q.goal.measure] : b.gap;
  const scored = plans.map(s => ({s, v: measure(bounds(q, s))}));
  const best = Math.min(...scored.map(x => x.v));
  // Plans that do the job and split only yellow squares.
  const lean = s => s.every(k => statusOf(q, k) === 'part');
  let steps = 0;
  if (q.goal.kind === 'reach') {
    const good = scored.filter(x => x.v <= q.goal.gap);
    assert.ok(good.length, `${p.id}: the goal can be reached`);
    assert.equal(best, row.answer, `${p.id}: the smallest gap within the budget`);
    assert.ok(good.every(x => x.s.length === q.budget), `${p.id}: the budget is tight`);
    assert.deepEqual(good.filter(x => lean(x.s)).map(x => canon(x.s)).sort(), p.solution.plans.map(canon).sort(), `${p.id}: the plans that work`);
    assert.equal(p.solution.plans.length, row.plans ?? p.solution.plans.length);
    // A first split that gains nothing must exist where the card asks for it.
    if (q.depth > 1) assert.ok(p.solution.plans.every(s => s.some(k => nodeOf(k).d === 0 && kids(k).every(c => statusOf(q, c) === 'part'))), `${p.id}: every plan that works uses a split that gains nothing at first`);
  } else {
    assert.equal(best, row.answer, `${p.id}: the best ${q.goal.measure}`);
    assert.equal(p.solution.best, best);
    assert.deepEqual(scored.filter(x => x.v === best && lean(x.s)).map(x => canon(x.s)).sort(), p.solution.plans.map(canon).sort(), `${p.id}: the best plans`);
    assert.equal(p.solution.plans.length, row.plans);
    // The argument drawn after a right Best: one level deep, each split's
    // saving is its own, so the best plan is the largest savings.
    assert.equal(q.depth, 1);
    const save = roots(q).map(k => { const before = bounds(q, []), after = bounds(q, [k]); return measure(before) - measure(after); }).sort((a, b) => b - a);
    assert.equal(measure(b0) - save.slice(0, q.budget).reduce((s, v) => s + v, 0), best, `${p.id}: the largest savings make the best`);
    assert.ok(!p.title.includes(String(best)) && !p.hints[0].includes(String(best)), `${p.id}: the answer is not printed`);
  }
  // The witness, played as taps.
  let a = fresh;
  for (const k of [...p.solution.splits].sort((x, y) => nodeOf(x).d - nodeOf(y).d)) a = play(p, a, {type: 'split', node: k});
  if (q.goal.kind === 'best') { assert.ok(!isSolved(p, a.board), `${p.id}: Best still to press`); a = play(p, a, {type: 'best'}); }
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  refuse(p, a, {type: 'join', node: p.solution.splits.at(-1)}, 'a move after a solve');
  steps += hintsSolve(p, fresh, 'from fresh');
  // A wasted split on a green or blank square: the hint joins it again.
  const waste = roots(q).find(k => statusOf(q, k) !== 'part');
  if (waste) {
    const b = play(p, fresh, {type: 'split', node: waste});
    assert.deepEqual(bounds(q, b.board.splits), b0, `${p.id}: a split of a ${statusOf(q, waste)} square changes nothing`);
    assert.deepEqual(nextHint(p, b).action, {type: 'join', node: waste}, `${p.id}: after a wasted split the hint joins it`);
    steps += hintsSolve(p, b, 'after a wasted split');
  }
  if (q.goal.kind === 'best') {
    // Best pressed too soon is refused and stays refused through moves that
    // do not beat it; the hints still finish.
    const one = play(p, fresh, {type: 'split', node: roots(q).find(k => statusOf(q, k) === 'part' && !p.solution.plans.some(s => s.includes(k))) || p.solution.splits[0]});
    const early = play(p, one, {type: 'best'});
    assert.equal(isSolved(p, early.board), false, `${p.id}: Best too soon is refused`);
    assert.equal(early.board.refused, measure(bounds(q, one.board.splits)));
    refuse(p, early, {type: 'best'}, 'Best again before beating the refused plan');
    steps += hintsSolve(p, early, 'after a refused Best');
    const at = play(p, fresh, {type: 'best'});
    assert.equal(at.board.refused, measure(b0), `${p.id}: Best on a fresh board is refused`);
  }
  // Illegal moves.
  const deep = `${0},${0},${q.depth}`, child = kids(roots(q)[0])[0];
  for (const [action, why] of [[null, 'nothing'], [{type: 'split'}, 'no square'], [{type: 'split', node: '9,9,0'}, 'a square off the board'], [{type: 'split', node: deep}, 'a square at the deepest level'], [{type: 'split', node: child}, 'a quarter of an unsplit square'], [{type: 'join', node: roots(q)[0]}, 'joining an unsplit square'], [{type: 'split', node: '0,0'}, 'a malformed square'], [{type: 'paint', squares: [0], on: true}, 'painting'], [{type: 'nudge', way: 'left'}, 'sliding'], [{type: 'shape', shape: 'triangle'}, 'a shape change'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (q.goal.kind === 'reach') refuse(p, fresh, {type: 'best'}, 'Best in a reach puzzle');
  // The budget, and joins.
  let full = fresh;
  for (const k of roots(q).slice(0, q.budget)) full = play(p, full, {type: 'split', node: k});
  if (!isSolved(p, full.board)) {
    refuse(p, full, {type: 'split', node: roots(q)[q.budget] || kids(roots(q)[0])[0]}, 'a split past the budget');
    const back = play(p, full, {type: 'join', node: roots(q)[0]});
    assert.equal(back.board.splits.length, q.budget - 1, `${p.id}: a join frees a slot`);
  }
  if (q.depth > 1) {
    const two = play(p, play(p, fresh, {type: 'split', node: roots(q)[0]}), {type: 'split', node: child});
    refuse(p, two, {type: 'join', node: roots(q)[0]}, 'joining a square whose quarter is split');
  }
  // Forged saves.
  const B = fresh.board, r = roots(q);
  const forged = [
    [{...B, splits: [child]}, 'a quarter split without its square'],
    [{...B, splits: [r[1], r[0]]}, 'splits out of order'],
    [{...B, splits: [r[0], r[0]]}, 'a square split twice'],
    [{...B, splits: [deep]}, 'a split at the deepest level'],
    [{...B, splits: ['9,9,0']}, 'a square off the board'],
    [{...B, splits: r.slice(0, q.budget + 1).sort((x, y) => nodeOf(x).y - nodeOf(y).y || nodeOf(x).x - nodeOf(y).x)}, 'splits past the budget'],
    [{...B, splits: 'none'}, 'splits that are not a list'],
    [{...B, extra: 1}, 'an unknown field']
  ];
  if (q.goal.kind === 'best') forged.push([{...B, done: true}, 'Best kept on a plan that is not best'], [{...B, refused: best}, 'a refusal of the best value'], [{...B, refused: 'yes'}, 'a refusal that is not a number'], [{splits: B.splits}, 'a missing field']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPaint(p, fresh, row, stats) {
  const q = p.parameters, K = 2, w = q.cols * K;
  const marks = q.pattern.flatMap(r => [...r]), W = marks.filter(m => m === 'W').length, P = marks.filter(m => m === 'P').length;
  assert.deepEqual([W, W + P], row.bounds, `${p.id}: the marks’ bounds`);
  const meets = v => q.target.op === '<' ? v < q.target.value : q.target.op === '>' ? v > q.target.value : v === q.target.value;
  // Every painting that fits, as the small squares painted in each partial
  // square (1 to 3): the areas it can reach.
  const vectors = [];
  (function grow(c) { if (c.length === P) { vectors.push(c); return; } for (let n = 1; n < K * K; n++) grow([...c, n]); })([]);
  const hits = vectors.filter(c => meets(W + c.reduce((s, n) => s + n, 0) / (K * K)));
  // With squares of any size the area takes every value strictly between W
  // and W + P, so the target is impossible exactly when it misses that range.
  const anyGrid = q.target.op === '<' ? q.target.value > W : q.target.op === '>' ? q.target.value < W + P : q.target.value > W && q.target.value < W + P;
  assert.equal(hits.length > 0, anyGrid, `${p.id}: small squares of a quarter decide it as finer ones would`);
  const bigOf = i => Math.floor(Math.floor(i / w) / K) * q.cols + Math.floor((i % w) / K);
  const smalls = big => { const bx = big % q.cols, by = Math.floor(big / q.cols), out = []; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) out.push((by * K + j) * w + bx * K + i); return out; };
  const fitsAll = painted => marks.every((m, big) => { const n = smalls(big).filter(i => painted.includes(i)).length; return m === 'W' ? n === K * K : m === 'O' ? n === 0 : n > 0 && n < K * K; });
  let steps = 0;
  const fitting = (counts = marks.filter(m => m === 'P').map(() => 1)) => { let k = 0; return marks.flatMap((m, big) => m === 'W' ? smalls(big) : m === 'P' ? smalls(big).slice(0, counts[k++]) : []).sort((x, y) => x - y); };
  const paintAll = (a, list) => list.reduce((b, i) => play(p, b, {type: 'paint', squares: [i], on: true}), a);
  // Can't on every painting that fits, by the small squares painted in each
  // partial square. It holds only on the painting as close to an impossible
  // target as the marks allow (every partial square at 3, or every one at 1);
  // on every other painting, and on every painting of a possible target that
  // does not already solve it, it gets the same pause, so the answer says
  // nothing about whether the target can be met.
  const sum = c => W + c.reduce((t, n) => t + n, 0) / (K * K);
  const closest = row.answer === 'cover' ? vectors.filter(c => c.every(n => n === K * K - 1)) : row.answer === 'inside' ? vectors.filter(c => c.every(n => n === 1)) : [];
  let tried = 0;
  for (const c of vectors) {
    const a = paintAll(fresh, fitting(c));
    if (isSolved(p, a.board)) { assert.ok(meets(sum(c)), `${p.id}: only a painting that meets the target solves by itself`); continue; }
    refuse(p, a, {type: 'cant', bound: 'cover'}, 'Can’t that names a bound (none is asked for)');
    const claimed = play(p, a, {type: 'cant'});
    tried++;
    if (closest.includes(c)) { assert.ok(isSolved(p, claimed.board), `${p.id}: Can’t holds on the closest painting`); continue; }
    assert.deepEqual(claimed.board, {...a.board, paused: true}, `${p.id}: Can’t on ${c} is paused, nothing else`);
    refuse(p, claimed, {type: 'cant'}, 'Can’t again before the painting changes');
    assert.equal(validBoard(p, claimed.board), true);
  }
  stats.cantTried += tried;
  if (row.answer === 'possible') {
    assert.deepEqual(hits, row.counts, `${p.id}: the paintings that meet the target`);
    assert.equal(closest.length, 0);
    assert.ok(fitsAll(p.solution.painted) && meets(p.solution.painted.length / (K * K)), `${p.id}: the witness fits and meets the target`);
    const a = paintAll(fresh, p.solution.painted);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    const miss = vectors.find(c => !meets(sum(c)));
    const near = play(p, paintAll(fresh, fitting(miss)), {type: 'cant'});
    steps += hintsSolve(p, near, 'after a refused Can’t');
  } else {
    assert.equal(hits.length, 0, `${p.id}: no painting meets the target`);
    assert.equal(closest.length, 1, `${p.id}: one closest painting`);
    const bound = row.answer === 'inside' ? W : W + P;
    assert.equal(q.target.value, bound, `${p.id}: the target sits on the ${row.answer}`);
    assert.deepEqual(p.solution, {cant: row.answer, bound, painted: fitting(closest[0]), area: sum(closest[0])}, `${p.id}: the solution is the closest painting`);
    refuse(p, fresh, {type: 'cant'}, 'Can’t before a painting that fits');
    // The hints reach the closest painting before they name Can't.
    let a = fresh, named = 0;
    for (let k = 0; k < 100 && !isSolved(p, a.board); k++) {
      const h = nextHint(p, a);
      if (h.action.type === 'cant') { named++; assert.ok(fitsAll(a.board.painted) && a.board.painted.join() === fitting(closest[0]).join(), `${p.id}: Can’t is named only on the closest painting`); assert.match(h.text, /still (under|over) .* Press Can’t\.$/); }
      else assert.doesNotMatch(h.text, /Can’t/, `${p.id}: a painting hint does not name Can’t`);
      a = play(p, a, h.action);
    }
    assert.equal(named, 1, `${p.id}: Can’t is named once, last`);
    const off = vectors.find(c => !closest.includes(c));
    steps += hintsSolve(p, play(p, paintAll(fresh, fitting(off)), {type: 'cant'}), 'after a refused Can’t');
  }
  steps += hintsSolve(p, fresh, 'from fresh');
  // A wasted stroke across the blank squares: the hints clear it and finish.
  const blank = marks.flatMap((m, big) => m === 'O' ? smalls(big) : []);
  const messy = play(p, fresh, {type: 'paint', squares: blank.slice(0, 3), on: true});
  steps += hintsSolve(p, messy, 'after painting blank squares');
  // Illegal moves.
  const n = q.cols * q.rows * K * K;
  for (const [action, why] of [[null, 'nothing'], [{type: 'paint', squares: [], on: true}, 'an empty stroke'], [{type: 'paint', squares: [n], on: true}, 'a square off the board'], [{type: 'paint', squares: [0, 0], on: true}, 'a square twice'], [{type: 'paint', squares: [0], on: 'yes'}, 'paint that is not on or off'], [{type: 'paint', squares: [0], on: false}, 'clearing a clear square'], [{type: 'split', node: '0,0,0'}, 'a split'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  // Forged saves.
  const B = fresh.board;
  const forged = [[{...B, painted: [n]}, 'a square off the board'], [{...B, painted: [2, 1]}, 'squares out of order'], [{...B, paused: 'no'}, 'a pause that is not true or false'], [{...B, done: true}, 'Can’t kept on a painting that does not fit'], [{...B, paused: true}, 'a pause on a painting that does not fit'], [{...B, extra: 1}, 'an unknown field'], [{painted: []}, 'missing fields'], [{...B, refused: false, wrong: null}, 'the old fields']];
  const other = vectors.find(c => !closest.includes(c) && !meets(sum(c)));
  forged.push([{...B, done: true, painted: fitting(other)}, 'Can’t kept on a painting that is not the closest']);
  if (row.answer === 'possible') forged.push([{...B, paused: true, painted: p.solution.painted}, 'a pause on a painting that meets the target']);
  else forged.push([{...B, paused: true, painted: fitting(closest[0])}, 'a pause on the closest painting'], [{...B, paused: true, done: true, painted: fitting(closest[0])}, 'done and paused']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkSlide(p, fresh, row, stats) {
  const q = p.parameters;
  assert.equal(q.steps, STEPS);
  assert.ok(Math.abs(polygonArea(q.shape) - row.area) < 1e-9, `${p.id}: area`);
  const b0 = slideAt(q, q.start);
  assert.deepEqual([b0.inside, b0.cover], row.start, `${p.id}: starting bounds`);
  const places = [];
  for (let oy = 0; oy < STEPS; oy++) for (let ox = 0; ox < STEPS; ox++) {
    const b = slideAt(q, [ox, oy]);
    assert.ok(b.inside <= row.area && row.area <= b.cover, `${p.id}: the area is between the bounds at ${ox},${oy}`);
    if (meets(q.goal, b)) places.push([ox, oy]);
    // Pieces thin enough to miss, in every square that meets the window.
    for (let j = -1; j <= q.height; j++) for (let i = -1; i <= q.width; i++) {
      const x = i + ox / STEPS, y = j + oy / STEPS;
      if (colour(q.shape, x, y, 1) !== 'part') continue;
      const t = thinnest(q.shape, x, y, 1, 300 / Math.max(q.width, q.height));
      stats.squaresChecked++; stats.thinnestPx = Math.min(stats.thinnestPx, t);
      assert.ok(t >= MIN_PX, `${p.id}: a thin piece at ${ox},${oy}`);
    }
  }
  assert.deepEqual(places, row.at, `${p.id}: the places that meet the goal`);
  // Fewest slides to a place that meets the goal, by breadth-first search
  // outward from those places.
  const dist = new Map(places.map(x => [x.join(), 0])), queue = [...places];
  for (let k = 0; k < queue.length; k++) for (const [dx, dy] of Object.values(WAYS)) { const n = [wrap(queue[k][0] + dx), wrap(queue[k][1] + dy)]; if (!dist.has(n.join())) { dist.set(n.join(), dist.get(queue[k].join()) + 1); queue.push(n); } }
  assert.equal(dist.get(q.start.join()), row.steps, `${p.id}: fewest slides`);
  assert.equal(p.solution.route.length, row.steps);
  // Moving can make it worse: some first step from the start does.
  const worse = Object.values(WAYS).some(([dx, dy]) => { const b = slideAt(q, [wrap(q.start[0] + dx), wrap(q.start[1] + dy)]); return b.gap > b0.gap || b.inside < b0.inside; });
  if (p.id !== 'covers-02') assert.ok(worse, `${p.id}: a first slide makes things worse`);
  let a = fresh;
  for (const way of p.solution.route) a = play(p, a, {type: 'nudge', way});
  assert.ok(isSolved(p, a.board), `${p.id}: the route solves`);
  assert.ok(isSolved(p, play(p, fresh, {type: 'slide', at: row.at[0]}).board), `${p.id}: a drag to the place solves`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  const away = Object.keys(WAYS).find(way => { const [dx, dy] = WAYS[way]; return dist.get([wrap(q.start[0] + dx), wrap(q.start[1] + dy)].join()) > row.steps; });
  if (away) steps += hintsSolve(p, play(p, fresh, {type: 'nudge', way: away}), 'after a slide the wrong way');
  for (const [action, why] of [[null, 'nothing'], [{type: 'nudge', way: 'north'}, 'an unknown way'], [{type: 'slide', at: [STEPS, 0]}, 'a place off the steps'], [{type: 'slide', at: q.start}, 'a slide to where it is'], [{type: 'slide', at: [0.5, 0]}, 'a half step'], [{type: 'split', node: '0,0,0'}, 'a split'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{at: [STEPS, 0]}, 'a place off the steps'], [{at: [-1, 0]}, 'a negative place'], [{at: [1]}, 'one coordinate'], [{at: [0, 0], extra: 1}, 'an unknown field'], [{}, 'no place']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPlayground(p, fresh, stats) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done', `${p.id}: no hint chain`);
  for (const [name, s] of Object.entries(q.shapes)) {
    let a = name === fresh.board.shape ? fresh : play(p, fresh, {type: 'shape', shape: name});
    assert.deepEqual(a.board.splits, [], `${p.id}: ${name} starts unsplit`);
    sliversOk(`${p.id} ${name}`, s, stats);
    // Split every yellow square, then every yellow quarter: the bounds only
    // tighten, the area stays between them, and the board is never solved.
    let last = bounds(s, []);
    const area = polygonArea(s.shape);
    for (let d = 0; d < s.depth; d++) {
      const list = d === 0 ? roots(s) : a.board.splits.filter(k => nodeOf(k).d === d - 1).flatMap(kids);
      for (const k of list.filter(k => statusOf(s, k) === 'part')) {
        a = play(p, a, {type: 'split', node: k});
        const b = bounds(s, a.board.splits);
        assert.ok(b.inside >= last.inside && b.cover <= last.cover && b.inside <= area && area <= b.cover, `${p.id}: ${name} tightens`);
        last = b;
      }
    }
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    const cleared = play(p, a, {type: 'clear'});
    assert.deepEqual(cleared.board.splits, [], `${p.id}: Clear joins every square`);
    refuse(p, cleared, {type: 'clear'}, 'Clear with nothing split');
  }
  refuse(p, fresh, {type: 'shape', shape: 'moon'}, 'an unknown shape');
  refuse(p, fresh, {type: 'shape', shape: fresh.board.shape}, 'the same shape');
  refuse(p, fresh, {type: 'best'}, 'Best in the playground');
  for (const [board, why] of [[{...fresh.board, shape: 'moon'}, 'an unknown shape'], [{...fresh.board, splits: ['0,0,2']}, 'a split at the deepest level'], [{...fresh.board, splits: ['1,1,1']}, 'a quarter without its square'], [{...fresh.board, extra: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateCovers;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCovers(), null, 2));
