// Authoring list for Snug spinners (worksheet Week 59). Builds every puzzle's
// corners and dots exactly in Q(√r), checks that the corners make a convex
// polygon whose star diagonals are all equal (so the arcs centred on the
// corners across make a Reuleaux polygon), finds which points may centre which
// gap with the mechanic's exact test, measures how far the width moves for
// every other full shape a child can make, and writes
// dist/families/width/width.json. Run: node scripts/build-width.mjs
// (add --report to print the measurements).
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {field, frac} from '../dist/families/width/surd.js';
import {exactOf, layoutOf, verdictOf, snug, joinable} from '../dist/families/width/width.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const REPORT = process.argv.includes('--report');

// ---------------------------------------------------------------------------
// Exact corners.

// The equilateral triangle with side 2: A on top, in Q(√3).
const triangle = () => ({field: {r: 3, tx: '1', ty: '1'}, corners: {A: ['0', '0|1'], B: ['-1', '0'], C: ['1', '0']}});
// The regular pentagon with A on top, in Q(√5). x carries the factor
// cos 18° (tx = cos² 18° = (5 + √5)/8), so that every coordinate is in Q(√5).
const pentagon = () => ({field: {r: 5, tx: '5/8|1/8', ty: '1'}, corners: {A: ['0', '1'], B: ['-1', '-1/4|1/4'], C: ['1/2|-1/2', '-1/4|-1/4'], D: ['-1/2|1/2', '-1/4|-1/4'], E: ['1', '-1/4|1/4']}});

// An irregular pentagon with every star diagonal of length 1. Walk the star
// P0 → P2 → P4 → P1 → P3 → P0 with unit steps e0 … e4 that sum to zero:
// e0 = 1 and e1, e2 are rational points of the unit circle (from Pythagorean
// triples); then e3 and e4 are the two unit vectors with e3 + e4 = −S, where
// S = e0 + e1 + e2, which lie in Q(√r) for the square-free part r of
// (4 − |S|²)·|S|². The corners in order round the pentagon are the walk's
// points 0, 3, 1, 4, 2.
function squarefree(n) { let out = 1n; for (let p = 2n; p * p <= n; p++) { while (n % (p * p) === 0n) n /= p * p; if (n % p === 0n) { out *= p; n /= p; } } return out * n; }
function isqrt(n) { let x = BigInt(Math.floor(Math.sqrt(Number(n)))); while (x * x > n) x--; while ((x + 1n) * (x + 1n) <= n) x++; return x; }
function reuleaux5(z1, z2) {
  const q = (n, d = 1n) => frac(n, d), add = (a, b) => frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]), mul = (a, b) => frac(a[0] * b[0], a[1] * b[1]), neg = a => [-a[0], a[1]];
  const e1 = z1.map(v => q(...v)), e2 = z2.map(v => q(...v));
  const Sx = add(add(q(1n), e1[0]), e2[0]), Sy = add(e1[1], e2[1]), m = add(mul(Sx, Sx), mul(Sy, Sy));
  // k² = (4 − m) / (4m), written c²·r with r square-free.
  const top = add(q(4n), neg(m)), K = frac(top[0] * m[1], top[1] * 4n * m[0]), N = K[0] * K[1], r = squarefree(N), root = isqrt(N / r);
  assert.equal(root * root * r, N, 'k² is c²·r');
  const c = frac(root, K[1]), F = field(r), half = q(1n, 2n);
  const lift = x => [x, q(0n)];
  // e3 = −S/2 + k·S⊥ with S⊥ = (−Sy, Sx), and e4 = −S − e3.
  const e3 = [[mul(neg(Sx), half), mul(neg(Sy), c)], [mul(neg(Sy), half), mul(Sx, c)]];
  const e4 = [F.sub(F.sub(lift(neg(Sx)), lift(q(0n))), e3[0]), F.sub(lift(neg(Sy)), e3[1])];
  const steps = [[lift(q(1n)), lift(q(0n))], e1.map(lift), e2.map(lift), e3, e4];
  const walk = [[lift(q(0n)), lift(q(0n))]];
  for (const e of steps.slice(0, 4)) walk.push([F.add(walk.at(-1)[0], e[0]), F.add(walk.at(-1)[1], e[1])]);
  const last = steps.reduce((acc, e) => [F.add(acc[0], e[0]), F.add(acc[1], e[1])], [lift(q(0n)), lift(q(0n))]);
  assert.ok(F.eq(last[0], F.of(0)) && F.eq(last[1], F.of(0)), 'the star walk closes');
  const corners = [0, 3, 1, 4, 2].map(k => walk[k]);
  return {field: {r: Number(r), tx: '1', ty: '1'}, corners: Object.fromEntries(corners.map((pt, i) => [LETTERS[i], [F.str(pt[0]), F.str(pt[1])]]))};
}
const T = (n, d) => [BigInt(n), BigInt(d)];
const SHAPES = {
  triangle: triangle(),
  pentagon: pentagon(),
  // Unit steps from the triples 3-4-5, 8-15-17, 20-21-29 and 7-24-25 / 33-56-65.
  lopsided: reuleaux5([T(-4, 5), T(3, 5)], [T(8, 17), T(-15, 17)]),
  long: reuleaux5([T(-3, 5), T(4, 5)], [T(0, 1), T(-1, 1)]),
  slim: reuleaux5([T(-20, 29), T(21, 29)], [T(8, 17), T(-15, 17)]),
  kite: reuleaux5([T(-24, 25), T(7, 25)], [T(56, 65), T(-33, 65)])
};

if (process.argv.includes('--shapes')) { console.log(JSON.stringify(SHAPES)); process.exit(0); }

// ---------------------------------------------------------------------------
// Dots: on the perpendicular bisector of a gap, from its middle (t = 0) toward
// the corner across (t = 1). Each is as far from both ends of its own gap.

const across = (n, i) => (i + (n - 1) / 2 + 1) % n;
// Corners are lettered in turn round the shape from `letters` (the easy
// puzzles go A, B, C, … round; later ones mix the letters, so the answer is
// found by looking, not by a pattern of letters).
function withDots(base, list, letters) {
  const F = field(base.field.r), names0 = Object.keys(base.corners), order = letters ? [...letters] : names0, n = order.length;
  const corners = Object.fromEntries(order.map((id, i) => [id, base.corners[names0[i]]]));
  const at = Object.fromEntries(order.map(id => [id, corners[id].map(v => F.parse(v))]));
  const pins = {}, names = Object.fromEntries(order.map(id => [id, `Corner ${id}`]));
  for (const [gap, t] of list) {
    const a = order[gap], b = order[(gap + 1) % n], x = order[across(n, gap)], T = F.parse(t), half = F.of('1/2');
    const mid = [0, 1].map(k => F.mul(half, F.add(at[a][k], at[b][k])));
    const pt = [0, 1].map(k => F.add(mid[k], F.mul(T, F.sub(at[x][k], mid[k]))));
    const id = `${t === '0' ? 'm' : 'i'}${a}${b}`;
    pins[id] = pt.map(v => F.str(v));
    names[id] = t === '0' ? `Dot halfway from ${a} to ${b}` : `Dot inside, near ${a} and ${b}`;
  }
  return {field: base.field, corners, order, pins, names};
}
const mids = n => Array.from({length: n}, (_, i) => [i, '0']);

// ---------------------------------------------------------------------------
// Copy.

const WIDTH = 'A shape’s width is the gap between two parallel rails that both touch it. It spins snug when the gap stays the same all the way round.';
const CONTROLS = `${WIDTH} Tap a gap between two corners, then a corner or dot to centre its arc there: the arc must reach both corners. When every gap has an arc, the shape spins between the rails. Tap an arc to change it; Spin plays the turn again. Undo takes back the last arc.`;
const RULES = [
  'Each gap between neighbouring corners gets one arc, drawn round a centre like a compass. The centre must be the same distance from both corners, or the arc misses.',
  'When every gap has an arc, the shape turns between two rails: the bottom rail stays, and the top rail rests on the shape.',
  'If the top rail never moves, the shape spins snug. If it moves, the shape stops at a turn where the gap has changed.'
];
const OBJECTIVE = {
  build: 'Centre an arc across every gap so that the shape spins snug between two rails: the gap between the rails never changes as it turns.',
  repair: 'Change the arcs so that the shape spins snug between two rails: the gap between the rails never changes as it turns.'
};
const VISIBLE = {build: 'Make a shape that spins snug between two rails.', repair: 'Fix the shape so it spins snug between two rails.'};
const PREREQ = {
  triangle: 'None beyond seeing which corner is far from a gap. Tapping and watching; a grown-up can read How to play.',
  pentagon: 'Compare distances by eye, or with a compass in mind. No reading or arithmetic.',
  irregular: 'Use what worked for the triangle and the regular pentagon on corners that are not evenly spaced.'
};
const sources = ['width-week59', 'width-card59', 'width-reuleaux'];

// Each puzzle: corners, dots offered, the start (repair), and the copy.
// The answer is computed: every arc centred on the corner across its gap.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three corners', shape: 'triangle', dots: mids(3), mode: 'build', prereq: 'triangle', turn: 0,
    idea: 'An arc centred on the corner across its gap keeps the same reach in every direction: the curved triangle spins snug.',
    hints: ['When the top rail touches an arc, what is touching the bottom rail?', 'Try putting the compass point on the corner across from the gap.'],
    parent: {notice: 'Whether your child tries the dots in the middle first. Half circles bulge too far: the width changes as the shape turns.', prompt: 'When the shape turns, which point of it touches the bottom rail while the top rail touches an arc?', explanation: 'Centre each arc on the corner across from its gap. Each arc then has radius equal to the side, 2 units here. Whenever one rail touches an arc, the other touches that arc’s centre corner, and the gap between the rails is the radius. Every direction is like this, so the width never changes: this is the Reuleaux triangle. Half circles on the sides (the dots in the middle) make a shape that is wider across a bulge than corner to bulge.', extension: 'Is the curved triangle’s width the same as its corners’ distance apart? (Yes: the radius is the side.)', connection: 'The Reuleaux triangle: the worksheet’s Problems 3 and 4.'},
    provenance: 'Week 59 Problem 3 (Grades 3–5): “Each short arc joins two corners and has the third corner as its center”, with the spin test of Problems 1–2 (Grades 2–5). The dots halfway along the sides are the guide’s “center on a side midpoint”, a different construction (adult guide p. 6).'},
  {number: 2, level: 'easy', title: 'Rounded triangle', shape: 'triangle', dots: [[0, '1/2'], [1, '1/2']], start: [0, 1], mode: 'repair', prereq: 'triangle', turn: 0,
    idea: 'Rounded is not enough: each arc must be drawn from the corner across, with the shape’s width as its radius.',
    hints: ['Watch where the top rail moves. Which arc is touching it then?', 'An arc centred on a dot inside bulges more than one centred on a corner.'],
    parent: {notice: 'Whether your child can tell from the shape which arcs are wrong, and changes one at a time to watch the spin.', prompt: 'The rounded arcs look smooth. Why is the shape wider one way than another?', explanation: 'Two arcs are centred on dots inside the triangle, so their radius is shorter than the side and they bulge more. A rail resting on such an arc is one radius from its centre, a dot inside, and the other rail is on the far side of that dot by an amount that changes as the shape turns. Centring every arc on the corner across from it gives every arc the radius of the side, and then the gap is that radius in every direction.', extension: 'On the curved triangle, which is wider: corner to the arc opposite, or arc to arc? (Neither. Every direction gives the radius.)', connection: 'The worksheet guide’s rounded triangles, whose arcs are not centred on the corners, beside the exact curved triangle of Problem 3.'},
    provenance: 'Week 59 Problem 3 (Grades 3–5) and the adult guide’s optional return (p. 6): “let children diagnose such a deliberately altered scrap outline by finding a changing-width witness.”'},
  {number: 3, level: 'easy', title: 'Five corners', shape: 'pentagon', dots: mids(5), mode: 'build', prereq: 'pentagon', turn: 0,
    idea: 'The triangle’s idea works with five corners: each arc is centred on the corner across from its gap.',
    hints: ['Which corner is the same distance from both corners of a gap?', 'For each gap, try the corner furthest away from it.'],
    parent: {notice: 'Whether your child carries the triangle’s rule over, and how they pick the “corner across” when there are five.', prompt: 'For the gap from A to B, which corner is as far from A as from B?', explanation: 'In a regular pentagon, the corner across from a side is the same distance, a diagonal, from both its ends. Centring every arc there gives five arcs of radius one diagonal. When the top rail touches an arc, the bottom rail touches the corner across, and the gap is the diagonal in every direction: a Reuleaux pentagon. Half circles on the sides bulge out and the width changes.', extension: 'Why not a square with four arcs? (On a square, each corner across from a side is nearer one end of it than the other, so no arc centred there joins the two ends.)', connection: 'Reuleaux polygons exist for every odd number of corners; the British 20p and 50p coins are Reuleaux heptagons.'},
    provenance: 'New: the card’s App fit asks for a regular pentagon after the equilateral triangle of Week 59 Problem 3.'},
  {number: 4, level: 'medium', title: 'Wobbly pentagon', shape: 'pentagon', dots: [[1, '1/4'], [3, '1/4']], start: [1, 3], mode: 'repair', prereq: 'pentagon', turn: 0,
    idea: 'One look at where the rail moves narrows down which arcs are wrong.',
    hints: ['When the rail has moved, look at which arc touches it.', 'Arcs centred on dots inside bulge more than the others.'],
    parent: {notice: 'Whether your child uses the spin and the shape to find the wrong arcs, or changes arcs at random.', prompt: 'Which arcs bulge more than the rest?', explanation: 'Two arcs are centred on dots inside, so their radius is shorter than the diagonal. Centred on the corner across from their gaps, they match the other three, and every arc has the radius of a diagonal: a Reuleaux pentagon.', extension: 'Fix one of the two arcs and spin. Is the shape snug yet? (No: the rail still moves at some turn.)', connection: 'In a shape of constant width, each arc faces the corner at its centre across the shape, one radius away.'},
    provenance: 'New, after the Week 59 guide’s optional return for Problem 3 (p. 6, diagnosing an altered outline): a regular Reuleaux pentagon with two arcs of the wrong radius.'},
  {number: 5, letters: 'BEADC', level: 'medium', title: 'Lopsided', shape: 'lopsided', dots: mids(5), mode: 'build', prereq: 'irregular', turn: 12,
    idea: 'Corners need not be evenly spaced: when each corner is the same distance from both corners across from it, the curved shape spins snug.',
    hints: ['Which corner is the same distance from both corners of this gap?', 'The arc for each gap is centred on the corner across from it, as for the regular pentagon.'],
    parent: {notice: 'Whether your child expects the uneven shape to fail, and what they say when it spins snug.', prompt: 'The arcs are different lengths. Why does it still spin snug?', explanation: 'These corners are chosen so that each corner is exactly 1 unit from the two corners across from it: all five star diagonals have length 1. Each arc is centred on the corner across from its gap with radius 1, and at every turn one rail touches an arc while the other touches its centre corner, so the width is 1 every way. The arcs have different lengths because the angles at the corners differ.', extension: 'Find the shortest arc and the corner it is centred on. Which corner has the sharpest point?', connection: 'Irregular Reuleaux polygons: any odd polygon whose star diagonals are all the same length.'},
    provenance: 'New: the card’s App fit asks for irregular Reuleaux pentagons after the regular one.'},
  {number: 6, letters: 'DACEB', level: 'medium', title: 'Long and short', shape: 'long', dots: [[0, '0'], [1, '0'], [2, '0'], [4, '0']], mode: 'build', prereq: 'irregular', turn: 0,
    idea: 'Very different gap lengths still give one width, because every arc has the same radius.',
    hints: ['Look for the corner that is the same distance from both ends of the short gap.', 'Each arc is centred on the corner across from its gap.'],
    parent: {notice: 'Whether the very short gap confuses your child: its arc is short but has the same radius as the others.', prompt: 'The short arc and the long arc: which has the bigger radius?', explanation: 'All five radii are the same: each corner is 1 unit from the two corners across from it. The short gap’s arc is a small piece of a big circle. Centring each arc on the corner across makes a Reuleaux pentagon of width 1.', extension: 'In the playground, compare this shape with the regular curved pentagon. Do they look the same width?', connection: 'Barbier’s theorem: every shape of constant width w has perimeter πw, however lopsided.'},
    provenance: 'New, after Week 59 Problems 3–4 and the card’s App fit.'},
  {number: 7, letters: 'CEBAD', level: 'hard', title: 'Almost a triangle', shape: 'slim', dots: [[0, '0'], [2, '0'], [4, '0'], [0, '1/6'], [4, '1/6']], mode: 'build', prereq: 'irregular', turn: -6,
    idea: 'Even when two corners nearly vanish, the rule is about which corner is the same distance from both ends of each gap.',
    hints: ['Two of the gaps are short. Which corner is equally far from both ends of each?', 'The corner across is two corners on from the gap, going either way round.'],
    parent: {notice: 'Whether your child treats the shape as a triangle and looks for three arcs.', prompt: 'Which corner is across from the short gap at the bottom?', explanation: 'This pentagon is close to a triangle, but it has five corners and five gaps, and each corner is 1 unit from the two corners across from it. Each arc is centred on the corner across from its gap, the third corner after it. The short gaps get short arcs of radius 1.', extension: 'If the two short gaps shrank to nothing, what shape would be left? (A Reuleaux triangle.)', connection: 'Reuleaux triangles are limits of Reuleaux pentagons; among shapes of constant width w, the Reuleaux triangle has the least area (Blaschke–Lebesgue).'},
    provenance: 'New, after the card’s App fit (irregular Reuleaux pentagons).'},
  {number: 8, letters: 'EBDCA', level: 'hard', title: 'Lopsided wobble', shape: 'kite', dots: [[0, '0'], [2, '1/5'], [3, '1/5']], start: [2, 3], mode: 'repair', prereq: 'irregular', turn: 0,
    idea: 'On a lopsided shape, an arc is right only when centred on the corner across, with the common radius; a half circle is another way to be wrong.',
    hints: ['Look at where the rail moves and which arc touches it then.', 'An arc centred on a dot bulges more than one centred on a corner.'],
    parent: {notice: 'Whether your child finds the wrong arcs from the spin or by comparing how curved the arcs look, and whether they try the half circle.', prompt: 'Which arcs are centred on corners now, and which on dots?', explanation: 'Two arcs are centred on dots inside, so their radius is shorter than 1 and they bulge. Centre each on the corner across from its gap and all five have radius 1, the common length of the star diagonals. A half circle, centred on the dot in the middle of a gap, has the wrong radius too.', extension: 'Tap each arc: which corner is it centred on? Is every corner the centre of exactly one arc?', connection: 'In a Reuleaux polygon every corner is the centre of exactly one arc, the one across from it.'},
    provenance: 'New, after the Week 59 guide’s optional return for Problem 3 (p. 6, diagnosing an altered outline), on an irregular Reuleaux pentagon.'},
  {number: 9, letters: 'ADCEB', level: 'hard', title: 'Kite', shape: 'kite', dots: [[0, '0'], [2, '0'], [3, '0'], [2, '1/5'], [3, '1/5']], mode: 'build', prereq: 'irregular', turn: 0,
    idea: 'The same construction works however the corners are spread, as long as the star diagonals are equal.',
    hints: ['For each gap, find the corner that is the same distance from both its ends.', 'The corner across is two corners on from the gap, going either way round.'],
    parent: {notice: 'Whether your child now goes straight to the corner across, or still tries the dots.', prompt: 'How do you find the corner across from a gap without measuring?', explanation: 'Going round the pentagon, the corner across from the gap between corners 1 and 2 is corner 4: two corners on from the gap either way round. Each corner is 1 unit from the two corners across from it, so every arc centred there has radius 1 and the shape has width 1. The dots in the middle of gaps and inside give arcs of other radii.', extension: 'Make your own: five sticks of one length joined end to end into a five-pointed star. Its points are the corners of a pentagon like this one.', connection: 'A Reuleaux polygon comes from an odd polygon whose star diagonals are all equal: walking the star is a closed path of equal steps.'},
    provenance: 'New, after the card’s App fit (irregular Reuleaux pentagons).'}
];

// ---------------------------------------------------------------------------
// Build and check.

const out = [];
for (const item of PUZZLES) {
  const base = SHAPES[item.shape], params = withDots(base, item.dots, item.letters), n = params.order.length;
  // Corners make a convex polygon, counterclockwise, with equal star diagonals.
  const F = field(base.field.r);
  const probe = {id: `probe-${item.number}`, revision: 1, parameters: {...params, mode: 'build', turn: item.turn}};
  const e = exactOf(probe);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (j !== i && j !== (i + 1) % n) assert.equal(e.g.turn(params.order[i], params.order[(i + 1) % n], params.order[j]), 1, `${item.title}: convex, counterclockwise`);
  const d0 = e.g.d2(params.order[0], params.order[across(n, 0) % n]);
  for (let i = 0; i < n; i++) for (const k of [(n - 1) / 2, (n + 1) / 2]) assert.ok(F.eq(e.g.d2(params.order[i], params.order[(i + k) % n]), d0), `${item.title}: equal star diagonals`);
  // Each gap may be centred on its corner across and its own dots, nothing else.
  const answer = params.order.map((_, i) => params.order[across(n, i)]);
  e.gaps.forEach((gap, i) => {
    const own = Object.keys(params.pins).filter(id => id.slice(1) === `${gap.a}${gap.b}`);
    assert.deepEqual([...gap.joins].sort(), [answer[i], ...own].sort(), `${item.title}: gap ${gap.a}${gap.b} joins ${gap.joins}`);
    // Dots lie inside the polygon or on this gap's chord, so arcs bulge outward.
    for (const id of own) for (let j = 0; j < n; j++) assert.ok(e.g.turn(params.order[j], params.order[(j + 1) % n], id) >= 0, `${item.title}: ${id} inside`);
  });
  const start = item.start ? e.gaps.map((gap, i) => item.start.includes(i) ? `i${gap.a}${gap.b}` : answer[i]) : null;
  if (start) assert.ok(start.every((c, i) => joinable(probe, i, c)), `${item.title}: the start is legal`);
  const p = {...probe, id: `width-${String(item.number).padStart(2, '0')}`, parameters: {...params, mode: item.mode, turn: item.turn, ...(start ? {start} : {})}};
  assert.ok(snug(p, answer), `${item.title}: the answer is snug`);
  // Every other full shape the child can make: the width moves visibly.
  const L = layoutOf(p), choices = e.gaps.map(gap => gap.joins);
  let least = Infinity, combos = 0, worstOf = null;
  const walk = (i, arcs) => {
    if (i === n) { combos++; const v = verdictOf(p, arcs); if (!snug(p, arcs)) { const px = v.worst * L.s; if (px < least) { least = px; worstOf = arcs.join(''); } } return; }
    for (const c of choices[i]) walk(i + 1, [...arcs, c]);
  };
  walk(0, []);
  // A compass on any other point misses the far corner visibly.
  let miss = Infinity, missOf = '';
  e.gaps.forEach((gap, i) => e.points.forEach(c => {
    if (c === gap.a || c === gap.b || joinable(p, i, c)) return;
    const [A, B, C] = [gap.a, gap.b, c].map(id => L.xy[id]), px = Math.abs(Math.hypot(C[0] - A[0], C[1] - A[1]) - Math.hypot(C[0] - B[0], C[1] - B[1])) * L.s;
    if (px < miss) { miss = px; missOf = `${gap.a}${gap.b}@${c}`; }
  }));
  // Corners and dots far enough apart to tap one or the other.
  let apart = Infinity, close = '';
  e.points.forEach((u, i) => e.points.slice(i + 1).forEach(v => { const d = Math.hypot(L.xy[u][0] - L.xy[v][0], L.xy[u][1] - L.xy[v][1]) * L.s; if (d < apart) { apart = d; close = `${u}–${v}`; } }));
  assert.ok(apart >= 30, `${item.title}: points at least 30 px apart (${apart.toFixed(1)}, ${close})`);
  const w = Math.sqrt(F.float(d0)) * L.s;
  if (REPORT) console.log(`${p.id} ${item.title}: width ${w.toFixed(0)} px, ${combos} full shapes, least wobble ${least.toFixed(1)} px (${worstOf}), least miss ${miss.toFixed(1)} px (${missOf}), closest points ${apart.toFixed(1)} px (${close})${start ? `, start wobble ${(verdictOf(p, start).worst * L.s).toFixed(1)} px` : ''}`);
  assert.ok(least >= 8, `${item.title}: every other full shape wobbles at least 8 px (${least.toFixed(1)}, ${worstOf})`);
  assert.ok(miss >= 6, `${item.title}: every miss is at least 6 px (${miss.toFixed(1)}, ${missOf})`);
  out.push({
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Snug spinners', mechanic: 'width', band: 'all', revision: 1, sourceDocument: 'docs/width/README.md',
    parameters: p.parameters,
    objective: OBJECTIVE[item.mode], visibleObjective: VISIBLE[item.mode], instruction: OBJECTIVE[item.mode],
    controls: CONTROLS, rules: RULES, idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources},
    solution: {arcs: answer},
    provenance: item.provenance
  });
}

// ---------------------------------------------------------------------------
// The playground: the worksheet's five pieces and two curved pentagons, all
// of width 60 (the worksheet's millimetres; no number is shown).

function floats(base, scale) {
  const F = field(base.field.r), sx = Math.sqrt(F.float(F.parse(base.field.tx))), sy = Math.sqrt(F.float(F.parse(base.field.ty)));
  return Object.values(base.corners).map(([x, y]) => [F.float(F.parse(x)) * sx * scale, F.float(F.parse(y)) * sy * scale]);
}
const centred = pts => { const g = [0, 1].map(k => pts.reduce((s, p) => s + p[k], 0) / pts.length); return pts.map(p => [p[0] - g[0], p[1] - g[1]]); };
const round = pts => pts.map(p => p.map(v => Math.round(v * 1e4) / 1e4));
function curved(pts) { const n = pts.length; return {corners: round(pts), centres: round(pts.map((_, i) => pts[across(n, i)]))}; }
const tri60 = centred(floats(SHAPES.triangle, 30));
const pentDiag = (() => { const p = floats(SHAPES.pentagon, 1); return Math.hypot(p[0][0] - p[2][0], p[0][1] - p[2][1]); })();
const playShapes = [
  {name: 'Disk', ellipse: [30, 30]},
  {name: 'Oval', ellipse: [30, 20]},
  {name: 'Square', corners: round([[-30, -30], [30, -30], [30, 30], [-30, 30]])},
  {name: 'Triangle', corners: round(tri60)},
  {name: 'Curved triangle', ...curved(tri60)},
  {name: 'Curved pentagon', ...curved(centred(floats(SHAPES.pentagon, 60 / pentDiag)))},
  {name: 'Lopsided curved pentagon', ...curved(centred(floats(SHAPES.long, 60)))}
];
const playground = {
  id: 'width-playground', number: 0, title: 'Snug spinners playground', difficulty_level: 'playground', familyTitle: 'Snug spinners', mechanic: 'width', band: 'playground', revision: 1, sourceDocument: 'docs/width/README.md',
  parameters: {mode: 'playground', shapes: playShapes},
  objective: 'Turn shapes between two rails that close on them, and see which keep the rails the same distance apart.', visibleObjective: '',
  instruction: 'Turn shapes between two rails that close on them, and see which keep the rails the same distance apart.',
  controls: `${WIDTH} Choose a shape. Drag round it, or use the turn buttons or arrow keys, to turn it; the rails close on it as it turns. The shaded band shows how far the top rail has moved. O marks a point on the shape.`,
  rules: ['The bottom rail stays; the top rail rests on the shape as it turns.', 'The shaded band spans the highest and lowest places the top rail has been for this shape.'],
  idea: 'Free play with the worksheet’s pieces: which shapes keep the rails still, and does the point O stay still too?',
  prerequisites: 'None. A grown-up can name the shapes.',
  hints: ['Turn each shape all the way round and watch the top rail.', 'Watch O on the curved triangle: does it go up and down while the rails stay still?'],
  parent: {notice: 'Whether your child is surprised that the curved triangle keeps the rails still, and whether they notice O bobbing on it.', prompt: 'Which shapes keep the top rail still? Which point of the curved triangle stays at the same height?', explanation: 'The disk and the curved shapes have the same width every way round: the top rail never moves. The oval, the square and the triangle are wider one way than another. On the curved triangle, the rails stay still but O, the centre of its corners, goes up and down: constant width is not constant distance from a centre. On the disk O stays at one height.', extension: 'Square and disk: which is wider, and in which direction? (The square, corner to corner.)', connection: 'Week 59 Problems 1–2 (the five pieces between rails) and Problem 5 (the point O).', sourceIds: sources},
  provenance: 'Week 59 Problems 1–2 (Grades 2–5: the disk, oval, square, triangle and curved triangle between parallel edges) and Problem 5 (Grades 3–5: the mark O), with two curved pentagons from the puzzles.'
};

const json = {
  title: 'Snug spinners',
  version: 1,
  families: [{
    id: 'width', title: 'Snug spinners',
    mathematics: 'The width of a shape in a direction is the gap between two parallel lines that touch it on either side. A shape has constant width when that gap is the same in every direction, so it turns between two fixed rails touching both. A circle does; so does a Reuleaux polygon: take an odd polygon whose star diagonals (each corner to the two corners across from it) all have length w, and join each pair of neighbouring corners by an arc of radius w centred on the corner across. When a rail touches an arc, the parallel rail through that arc’s centre touches the corner there, and every direction is of this kind, so the width is w every way. The puzzles give the corners of an equilateral triangle, a regular pentagon and irregular pentagons with equal star diagonals, exactly; the child chooses each arc’s centre, which must be the same distance from both ends of its gap. Among the centres offered, the shape spins snug exactly when every arc is centred on a corner with one common radius: the Reuleaux polygon. Half circles on the sides and arcs centred on dots inside give shapes whose width changes, and the spin stops where it has changed most.',
    rules: RULES, sourceIds: sources
  }],
  sources: [
    {id: 'width-week59', title: 'Bellingham Math Circle — Week 59: Constant width (student packet, materials and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-59', kind: 'local curriculum'},
    {id: 'width-card59', title: 'Week 59 review card and math check (spin test, curved triangle construction and proof, the point O, Barbier; App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-59.md', kind: 'local curriculum'},
    {id: 'width-reuleaux', title: 'H. Martini, L. Montejano and D. Oliveros — Bodies of Constant Width: An Introduction to Convex Geometry with Applications, Birkhäuser (2019), Chapter 8 (Reuleaux polygons)', url: 'https://doi.org/10.1007/978-3-030-03868-7', kind: 'reference'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/width/width.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.title}: ${p.parameters.order.map((a, i) => `${a}${p.parameters.order[(i + 1) % p.parameters.order.length]}→${p.solution.arcs[i]}`).join(' ')}`).join('\n'));
