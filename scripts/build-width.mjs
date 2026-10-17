// Authoring list for Snug spinners (worksheet Week 59). Builds every puzzle's
// corners, dots and spots exactly in Q(√r), checks that the corners make a
// convex polygon whose star diagonals are all equal (so the arcs centred on
// the corners across make a Reuleaux polygon), finds which points may centre
// which gap with the mechanic's exact test, measures how far the width moves
// for every other full shape a child can make and how far every missed
// compass misses, checks that in the hard puzzles exactly one spot can take
// the missing corner, that every other spot leaves a compass that misses and
// is on the circles its recipe says, and that the spots keep clear of the
// lines a tap must reach, and writes dist/families/width/width.json.
// Run: node scripts/build-width.mjs (add --report to print the measurements).
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {field, frac} from '../dist/families/width/surd.js';
import {exactOf, layoutOf, verdictOf, snug, joinable, arcOf} from '../dist/families/width/width.js';

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
  // Unit steps from the triples 3-4-5, 5-12-13, 8-15-17, 11-60-61, 28-45-53
  // and 48-55-73.
  lopsided: reuleaux5([T(-4, 5), T(3, 5)], [T(8, 17), T(-15, 17)]),
  long: reuleaux5([T(-3, 5), T(4, 5)], [T(0, 1), T(-1, 1)]),
  pairs: reuleaux5([T(-55, 73), T(48, 73)], [T(0, 1), T(-1, 1)]),
  house: reuleaux5([T(-45, 53), T(28, 53)], [T(11, 61), T(-60, 61)]),
  tilted: reuleaux5([T(-12, 13), T(5, 13)], [T(8, 17), T(-15, 17)])
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
// Place puzzles: four corners of an irregular Reuleaux pentagon, the fifth
// (the corner o places round the shape) missing, and spots where it might go.
// The corner belongs where it is the width from the two corners whose arcs
// reach it, P(o+2) and P(o+3): where the circles of that radius round them
// cross. The other spots are exact too, each from a recipe:
// - {on: 'first' | 'second', turn: 's/h'}: the corner turned round P(o+2)
//   ("first") or P(o+3) ("second") by the rotation whose sine is s/h (its
//   cosine from the Pythagorean triple), away from the arc the corner ends, so
//   on that circle only, beyond the corner and never on the answer's arcs;
// - {bisector: t}: on the perpendicular bisector of P(o+2)P(o+3), t of the
//   way from its middle to the corner (t < 1 nearer than the width, t > 1
//   further);
// - {off: [a, b]}: the corner moved by a·(corner − P(o+2)) + b·(corner −
//   P(o+3)), with a ≠ b, which (checked below) is on neither circle.
function place(base, letters, o, recipes, turn) {
  const F = field(base.field.r), names0 = Object.keys(base.corners), order = [...letters], n = order.length;
  const at = Object.fromEntries(order.map((id, i) => [id, base.corners[names0[i]].map(v => F.parse(v))]));
  const k = j => order[(o + j + n) % n], S = at[k(0)], centre = {first: at[k(2)], second: at[k(3)]};
  // Corners go counterclockwise, and each arc runs counterclockwise round its
  // centre, so "beyond the corner" is counterclockwise round P(o+2) and
  // clockwise round P(o+3).
  const rotate = (C, V, turn, sign) => {
    const [y, h] = turn.split('/').map(BigInt), x = isqrt(h * h - y * y);
    assert.equal(x * x + y * y, h * h, `${turn} is the sine of a rational rotation`);
    const c = F.of(`${x}/${h}`), s = F.of(`${sign < 0 ? '-' : ''}${y}/${h}`), dx = F.sub(V[0], C[0]), dy = F.sub(V[1], C[1]);
    return [F.add(C[0], F.sub(F.mul(c, dx), F.mul(s, dy))), F.add(C[1], F.add(F.mul(s, dx), F.mul(c, dy)))];
  };
  const half = F.of('1/2'), A = centre.first, B = centre.second, M = [0, 1].map(j => F.mul(half, F.add(A[j], B[j])));
  const raw = [{kind: 'the corner', pt: S}];
  for (const r of recipes) {
    if (r.on) raw.push({kind: `${r.on} circle`, pt: rotate(centre[r.on], S, r.turn, r.on === 'first' ? 1 : -1)});
    else if (r.bisector) { const t = F.of(r.bisector); raw.push({kind: 'bisector', pt: [0, 1].map(j => F.add(M[j], F.mul(t, F.sub(S[j], M[j]))))}); }
    else {
      const [a, b] = r.off.map(v => F.of(v));
      assert.notEqual(r.off[0], r.off[1], 'an off spot is not on the bisector');
      raw.push({kind: 'off', pt: [0, 1].map(j => F.add(S[j], F.add(F.mul(a, F.sub(S[j], A[j])), F.mul(b, F.sub(S[j], B[j])))))});
    }
  }
  // Spots are numbered left to right as drawn.
  const th = turn * Math.PI / 180, bx = pt => Math.cos(th) * F.float(pt[0]) - Math.sin(th) * F.float(pt[1]);
  raw.sort((u, v) => bx(u.pt) - bx(v.pt));
  const ids = raw.map((_, i) => `s${i + 1}`), fixed = order.filter(id => id !== k(0));
  return {
    params: {
      field: base.field, corners: Object.fromEntries(fixed.map(id => [id, at[id].map(v => F.str(v))])), order, open: k(0),
      spots: Object.fromEntries(raw.map((r, i) => [ids[i], r.pt.map(v => F.str(v))])),
      names: Object.fromEntries([...fixed.map(id => [id, `Corner ${id}`]), ...ids.map((id, i) => [id, `Spot ${i + 1}`])])
    },
    kinds: Object.fromEntries(raw.map((r, i) => [ids[i], r.kind])),
    right: ids[raw.findIndex(r => r.kind === 'the corner')]
  };
}
// The letters round a place puzzle: the missing corner X, its neighbours, and
// the two corners whose arcs reach it.
function roles(letters, o) { const n = letters.length, k = j => letters[(o + j + n) % n]; return {X: k(0), prev: k(-1), next: k(1), c1: k(2), c2: k(3)}; }

// ---------------------------------------------------------------------------
// Copy.

const WIDTH = 'A shape’s width is the gap between two parallel rails that both touch it. It spins snug when the gap stays the same all the way round.';
const CONTROLS = `${WIDTH} Tap a gap between two corners, then a corner or dot to centre its arc there: the arc must reach both corners. When every gap has an arc, the shape spins between the rails. Tap an arc to change it; Spin plays the turn again. Undo takes back the last arc.`;
const CONTROLS_PLACE = `${WIDTH} Tap a spot to put the missing corner there; tap another spot to move it. Tap a gap between two corners, then a corner to centre its arc there: the arc must reach both corners. When every gap has an arc, the shape spins between the rails. Tap an arc to change it; Spin plays the turn again. Undo takes back the last step.`;
const RULES = [
  'Each gap between neighbouring corners gets one arc, drawn round a centre like a compass. The centre must be the same distance from both corners, or the arc misses.',
  'When every gap has an arc, the shape turns between two rails: the bottom rail stays, and the top rail rests on the shape.',
  'If the top rail never moves, the shape spins snug. If it moves, the shape stops at a turn where the gap has changed.'
];
const PLACE_RULE = 'One corner is missing. It goes on one of the spots; moving it to another spot takes away the arcs that touch it.';
const OBJECTIVE = {
  build: 'Centre an arc across every gap so that the shape spins snug between two rails: the gap between the rails never changes as it turns.',
  repair: 'Change the arcs so that the shape spins snug between two rails: the gap between the rails never changes as it turns.',
  place: X => `Put corner ${X} on one of the spots and centre an arc across every gap so that the shape spins snug between two rails: the gap between the rails never changes as it turns.`
};
const VISIBLE = {build: 'Make a shape that spins snug between two rails.', repair: 'Fix the shape so it spins snug between two rails.', place: X => `Put corner ${X} on a spot, then make the shape spin snug.`};
const PREREQ = {
  triangle: 'None beyond seeing which corner is far from a gap. Tapping and watching; a grown-up can read How to play.',
  pentagon: 'Compare distances by eye, or with a compass in mind. No reading or arithmetic.',
  irregular: 'Use what worked for the triangle and the regular pentagon on corners that are not evenly spaced.',
  place: 'Has made snug pentagons: every arc centred on the corner across from its gap, with one radius. Compares distances by eye; a compass that misses draws a circle that can be used to check which spots lie on it.'
};
const sources = ['width-week59', 'width-card59', 'width-reuleaux'];

// Each puzzle: corners, dots offered, the start (repair), and the copy.
// The answer is computed: every arc centred on the corner across its gap.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three corners', shape: 'triangle', dots: mids(3), mode: 'build', prereq: 'triangle', turn: 0,
    idea: 'An arc centred on the corner across its gap keeps the same reach in every direction: the curved triangle spins snug.',
    hints: ['When the top rail touches an arc, what is touching the bottom rail?', 'Try putting the compass point on the corner across from the gap.'],
    parent: {notice: 'Whether your child tries the dots in the middle first. Half circles bulge too far: the width changes as the shape turns.', prompt: 'When the shape turns, which point of it touches the bottom rail while the top rail touches an arc?', explanation: 'Centre each arc on the corner across from its gap. Each arc then has radius equal to the side, 2 units here. Whenever one rail touches an arc, the other touches that arc’s centre corner, and the gap between the rails is the radius. Every direction is like this, so the width never changes: this is the Reuleaux triangle. With half circles on the sides instead (centred on the dots in the middle), the shape is 3 units wide along a side but only 2 + √3/2, about 2.87, across it, and no corner ever touches a rail.', extension: 'Is the curved triangle’s width the same as its corners’ distance apart? (Yes: the radius is the side.)', connection: 'The Reuleaux triangle: the worksheet’s Problems 3 and 4.'},
    provenance: 'Week 59 Problem 3 (Grades 3–5): “Each short arc joins two corners and has the third corner as its center”, with the spin test of Problems 1–2 (Grades 2–5). The dots halfway along the sides are the guide’s “center on a side midpoint”, a different construction (adult guide p. 6).'},
  {number: 2, level: 'easy', title: 'Rounded triangle', shape: 'triangle', dots: [[0, '1/2'], [1, '1/2']], start: [0, 1], mode: 'repair', prereq: 'triangle', turn: 0,
    idea: 'Rounded is not enough: each arc must be drawn from the corner across, with the shape’s width as its radius.',
    hints: ['Watch where the top rail moves. Which arc is touching it then?', 'An arc centred on a dot inside bulges more than one centred on a corner.'],
    parent: {notice: 'Whether your child can tell from the shape which arcs are wrong, and changes one at a time to watch the spin.', prompt: 'The rounded arcs look smooth. Why is the shape wider one way than another?', explanation: 'Two arcs are centred on dots inside the triangle, so their radius is shorter than the side and they bulge more. A rail resting on such an arc is one radius from its centre, a dot inside, and the other rail is on the far side of that dot by an amount that changes as the shape turns. Centring every arc on the corner across from it gives every arc the radius of the side, and then the gap is that radius in every direction.', extension: 'On the curved triangle, which is wider: corner to the arc opposite, or arc to arc? (Neither. Every direction gives the radius.)', connection: 'The worksheet guide’s rounded triangles, whose arcs are not centred on the corners, beside the exact curved triangle of Problem 3.'},
    provenance: 'Week 59 Problem 3 (Grades 3–5) and the adult guide’s optional return (p. 6): “let children diagnose such a deliberately altered scrap outline by finding a changing-width witness.”'},
  {number: 3, level: 'easy', title: 'Wobbly pentagon', shape: 'pentagon', dots: [[1, '1/4'], [3, '1/4']], start: [1, 3], mode: 'repair', prereq: 'pentagon', turn: 0,
    idea: 'One look at where the rail moves narrows down which arcs are wrong.',
    hints: ['When the rail has moved, look at which arc touches it.', 'Arcs centred on dots inside bulge more than the others.'],
    parent: {notice: 'Whether your child uses the spin and the shape to find the wrong arcs, or changes arcs at random, and whether the three good arcs show them where the other two should be centred.', prompt: 'Which arcs bulge more than the rest?', explanation: 'Two arcs are centred on dots inside, so their radius is shorter than the diagonal. Centred on the corner across from their gaps, they match the other three, and every arc has the radius of a diagonal: a Reuleaux pentagon.', extension: 'Fix one of the two arcs and spin. Is the shape snug yet? (No: the rail still moves at some turn.)', connection: 'In a shape of constant width, each arc faces the corner at its centre across the shape, one radius away.'},
    provenance: 'New, after the Week 59 guide’s optional return for Problem 3 (p. 6, diagnosing an altered outline): a regular Reuleaux pentagon with two arcs of the wrong radius.'},
  {number: 4, level: 'medium', title: 'Five corners', shape: 'pentagon', dots: mids(5), mode: 'build', prereq: 'pentagon', turn: 0,
    idea: 'The triangle’s idea works with five corners: each arc is centred on the corner across from its gap.',
    hints: ['Which corner is the same distance from both corners of a gap?', 'For each gap, try the corner furthest away from it.'],
    parent: {notice: 'Whether your child carries the rule from the triangle and the wobbly pentagon over, and how they pick the “corner across” when there are five.', prompt: 'For the gap from A to B, which corner is as far from A as from B?', explanation: 'In a regular pentagon, the corner across from a side is the same distance, a diagonal, from both its ends. Centring every arc there gives five arcs of radius one diagonal. When the top rail touches an arc, the bottom rail touches the corner across, and the gap is the diagonal in every direction: a Reuleaux pentagon. Half circles on the sides bulge out and the width changes.', extension: 'Why not a square with four arcs? (On a square, each corner across from a side is nearer one end of it than the other, so no arc centred there joins the two ends.)', connection: 'Reuleaux polygons exist for every odd number of corners; the British 20p and 50p coins are Reuleaux heptagons.'},
    provenance: 'New: the card’s App fit asks for a regular pentagon after the equilateral triangle of Week 59 Problem 3.'},
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
  // Hard: put the missing corner on a spot, then build. The two arcs that
  // neither end at the missing corner nor are centred on it are drawn.
  {number: 7, letters: 'CAEBD', open: 4, level: 'hard', title: 'Missing corner', shape: 'pairs', mode: 'place', turn: 0,
    spots: [{on: 'first', turn: '9/41'}, {on: 'second', turn: '39/89'}, {off: ['-3/40', '-1/5']}, {off: ['-1/20', '-2/5']}, {off: ['9/40', '-1/5']}],
    idea: 'A snug shape’s missing corner cannot go just anywhere that looks right: it must be the width from the two corners whose arcs reach it, where two compass circles cross.'},
  {number: 8, letters: 'CEADB', open: 4, level: 'hard', title: 'Where does B go?', shape: 'house', mode: 'place', turn: 0,
    spots: [{on: 'first', turn: '51/149'}, {on: 'second', turn: '52/173'}, {bisector: '7/10'}, {bisector: '6/5'}, {off: ['7/40', '7/20']}],
    idea: 'Each corner of a Reuleaux pentagon is fixed by two others: it is the width from both.'},
  {number: 9, letters: 'CEBAD', open: 1, level: 'hard', title: 'Last corner', shape: 'tilted', mode: 'place', turn: 0,
    spots: [{on: 'first', turn: '9/41'}, {on: 'second', turn: '8/17'}, {bisector: '7/10'}, {off: ['-1/10', '-7/20']}, {off: ['1/5', '-1/5']}],
    idea: 'With four corners of a snug pentagon in place, there is exactly one place for the fifth.'}
];
// The other spots of a place puzzle, in words.
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five'];
function others(item, c1, c2) {
  const count = kind => item.spots.filter(kind).length, be = k => `${WORDS[k]} ${k === 1 ? 'is' : 'are'}`;
  const parts = [
    [count(r => r.on === 'first'), k => `${be(k)} on the circle round ${c1} only`],
    [count(r => r.on === 'second'), k => `${be(k)} on the circle round ${c2} only`],
    [count(r => r.bisector), k => `${be(k)} as far from ${c1} as from ${c2} but not the width from them`],
    [count(r => r.off), k => `${be(k)} on neither circle`]
  ].filter(([k]) => k).map(([k, say]) => say(k));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
}
// The copy for a place puzzle, from its letters.
function placeCopy(item) {
  const {X, prev, next, c1, c2} = roles(item.letters, item.open);
  return {
    hints: [`The two arcs already drawn have the radius every arc needs. Where could corner ${X} go so that its arcs have that radius too?`],
    parent: {
      notice: 'Whether your child tries the spots one by one, or uses the circle a missed compass draws to see which spots it passes through.',
      prompt: `Which spots are as far from ${c1} as ${prev} is? Which are as far from ${c2} as ${next} is?`,
      explanation: `The arc from ${prev} to ${X} is centred on ${c1}, the arc from ${X} to ${next} on ${c2}, and the arc from ${c1} to ${c2} on ${X}. For all of them to have the common radius (the width, the radius of the two arcs already drawn), ${X} must be exactly the width from ${c1} and from ${c2}: on the circle round ${c1} through ${prev} and on the circle round ${c2} through ${next}. Two circles cross in at most two points, and only one of them is on this side of ${c1}${c2}, so exactly one spot works. Of the other spots, ${others(item, c1, c2)}: each leaves an arc whose compass misses, so no full shape can be made on them.`,
      extension: `If ${prev} were the missing corner instead, which two corners would fix where it goes? (${next} and ${c1}: it is the width from both.)`,
      connection: 'Building a Reuleaux pentagon corner by corner: each new corner is where two circles of the common radius cross, the same equal steps as walking a five-pointed star.'
    },
    provenance: 'New, after Week 59 Problem 3 (each arc drawn with a compass from the corner across) and the card’s App fit (irregular Reuleaux pentagons): here the compass finds a corner instead of an arc.'
  };
}

// ---------------------------------------------------------------------------
// Build and check.

const pad = k => `width-${String(k).padStart(2, '0')}`;
const pxApart = (L, ids, xy) => { let apart = Infinity, close = ''; ids.forEach((u, i) => ids.slice(i + 1).forEach(v => { const d = Math.hypot(xy[u][0] - xy[v][0], xy[u][1] - xy[v][1]) * L.s; if (d < apart) { apart = d; close = `${u}–${v}`; } })); return {apart, close}; };
// Every full shape the child can make on this board (one spot, or none):
// the least drift of the ones that are not snug, and the snug ones.
function fullShapes(p, spot) {
  const e = exactOf(p, spot), L = layoutOf(p), n = e.n, out = {combos: 0, least: Infinity, worstOf: '', snug: []};
  const walk = (i, arcs) => {
    if (i === n) { out.combos++; if (snug(p, arcs, spot)) out.snug.push(arcs.join('')); else { const px = verdictOf(p, arcs, spot).worst * L.s; if (px < out.least) { out.least = px; out.worstOf = arcs.join(''); } } return; }
    for (const c of e.gaps[i].joins) walk(i + 1, [...arcs, c]);
  };
  walk(0, []);
  return out;
}
// A compass on any other point misses the far corner visibly.
function leastMiss(p, spot) {
  const e = exactOf(p, spot), L = layoutOf(p), xy = L.pos(e.spot);
  let miss = Infinity, missOf = '';
  e.gaps.forEach((gap, i) => { if (gap.live) e.points.forEach(c => {
    if (c === gap.a || c === gap.b || gap.joins.includes(c)) return;
    const [A, B, C] = [gap.a, gap.b, c].map(id => xy[id]), px = Math.abs(Math.hypot(C[0] - A[0], C[1] - A[1]) - Math.hypot(C[0] - B[0], C[1] - B[1])) * L.s;
    if (px < miss) { miss = px; missOf = `${gap.a}${gap.b}@${c}`; }
  }); });
  return {miss, missOf};
}
// How near the spots come to a line the child can tap, in board pixels, with
// the corner off the board and on each spot in turn: the dashed line of every
// empty gap, the arcs drawn at the start, and every arc that can be drawn.
// `must` covers the lines a tap must reach past the spots (every dashed line,
// the arcs drawn at the start, and the answer's arcs); `wrongArcs` is
// reported only, since a spot on one of the circles lies on the arc a wrong
// spot on the same circle allows, by construction.
const ROOM_PX = 14;
const segPx = (P, A, B) => { const dx = B[0] - A[0], dy = B[1] - A[1], t = Math.max(0, Math.min(1, ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(P[0] - A[0] - t * dx, P[1] - A[1] - t * dy); };
const arcPx = (P, c, A, B) => { const arc = arcOf(c, A, B); let d = Infinity; for (let j = 0; j <= 360; j++) { const t = arc.a0 + arc.span * j / 360; d = Math.min(d, Math.hypot(P[0] - c[0] - arc.rho * Math.cos(t), P[1] - c[1] - arc.rho * Math.sin(t))); } return d; };
function clearance(p, right) {
  const q = p.parameters, L = layoutOf(p), spots = Object.keys(q.spots), must = {d: Infinity, of: ''}, wrongArcs = {d: Infinity, of: ''};
  for (const st of [null, ...spots]) {
    const e = exactOf(p, st), xy = L.pos(e.spot);
    e.gaps.forEach((gap, i) => {
      if (!gap.live) return;
      const A = xy[gap.a], B = xy[gap.b], lines = q.start[i] != null ? [[q.start[i], true]] : [[null, true], ...gap.joins.map(c => [c, st === right])];
      for (const t of spots) if (t !== st) for (const [c, need] of lines) {
        const d = (c == null ? segPx(xy[t], A, B) : arcPx(xy[t], xy[c], A, B)) * L.s, into = need ? must : wrongArcs;
        if (d < into.d) { into.d = d; into.of = `${t} from ${c == null ? 'the dashed line' : `the arc on ${c}`} ${gap.a}${gap.b}, corner on ${st ?? 'no spot'}`; }
      }
    });
  }
  return {must, wrongArcs};
}
function checkCorners(item, e, F) {
  const n = e.n, o = e.order;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (j !== i && j !== (i + 1) % n) assert.equal(e.g.turn(o[i], o[(i + 1) % n], o[j]), 1, `${item.title}: convex, counterclockwise`);
  const d0 = e.g.d2(o[0], o[across(n, 0)]);
  for (let i = 0; i < n; i++) for (const k of [(n - 1) / 2, (n + 1) / 2]) assert.ok(F.eq(e.g.d2(o[i], o[(i + k) % n]), d0), `${item.title}: equal star diagonals`);
  return d0;
}

const out = [];
for (const item of PUZZLES) {
  if (item.mode === 'place') { out.push(buildPlace(item)); continue; }
  const base = SHAPES[item.shape], params = withDots(base, item.dots, item.letters), n = params.order.length;
  // Corners make a convex polygon, counterclockwise, with equal star diagonals.
  const F = field(base.field.r);
  const probe = {id: `probe-${item.number}`, revision: 1, parameters: {...params, mode: 'build', turn: item.turn}};
  const e = exactOf(probe);
  const d0 = checkCorners(item, e, F);
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
  const p = {...probe, id: pad(item.number), parameters: {...params, mode: item.mode, turn: item.turn, ...(start ? {start} : {})}};
  assert.ok(snug(p, answer), `${item.title}: the answer is snug`);
  // Every other full shape the child can make: the width moves visibly.
  const L = layoutOf(p), full = fullShapes(p, null), {miss, missOf} = leastMiss(p, null);
  assert.deepEqual(full.snug, [answer.join('')], `${item.title}: exactly one snug full shape`);
  const {apart, close} = pxApart(L, e.points, L.xy);
  assert.ok(apart >= 30, `${item.title}: points at least 30 px apart (${apart.toFixed(1)}, ${close})`);
  const w = Math.sqrt(F.float(d0)) * L.s;
  if (REPORT) console.log(`${p.id} ${item.title}: width ${w.toFixed(0)} px, ${full.combos} full shapes, least wobble ${full.least.toFixed(1)} px (${full.worstOf}), least miss ${miss.toFixed(1)} px (${missOf}), closest points ${apart.toFixed(1)} px (${close})${start ? `, start wobble ${(verdictOf(p, start).worst * L.s).toFixed(1)} px` : ''}`);
  assert.ok(full.least >= 8, `${item.title}: every other full shape wobbles at least 8 px (${full.least.toFixed(1)}, ${full.worstOf})`);
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

function buildPlace(item) {
  const base = SHAPES[item.shape], F = field(base.field.r), {params, kinds, right} = place(base, item.letters, item.open, item.spots, item.turn);
  const n = params.order.length, {X} = roles(item.letters, item.open);
  const p = {id: pad(item.number), revision: 1, parameters: {...params, mode: 'place', turn: item.turn}};
  // With the corner on its spot: convex, equal star diagonals, and each gap
  // may be centred on its corner across only.
  const e = exactOf(p, right), d0 = checkCorners(item, e, F);
  const answer = params.order.map((_, i) => params.order[across(n, i)]);
  e.gaps.forEach((gap, i) => assert.deepEqual(gap.joins, [answer[i]], `${item.title}: gap ${gap.a}${gap.b} joins only ${answer[i]}`));
  // Drawn at the start: the arcs that neither end at the missing corner nor are centred on it.
  p.parameters.start = e.gaps.map((gap, i) => gap.a === X || gap.b === X || answer[i] === X ? null : answer[i]);
  assert.equal(p.parameters.start.filter(Boolean).length, 2, `${item.title}: two arcs drawn at the start`);
  assert.ok(p.parameters.start.every((c, i) => c === null || joinable(p, i, c, null)), `${item.title}: the start is legal before the corner is placed`);
  assert.ok(snug(p, answer, right), `${item.title}: the answer is snug`);
  const L = layoutOf(p), report = [];
  let least = Infinity, leastOf = '';
  for (const spot of Object.keys(params.spots)) {
    const es = exactOf(p, spot), full = fullShapes(p, spot), {miss, missOf} = leastMiss(p, spot);
    // Every spot keeps the five corners convex, so every outline is a fair shape.
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (j !== i && j !== (i + 1) % n) assert.equal(es.g.turn(es.order[i], es.order[(i + 1) % n], es.order[j]), 1, `${item.title}: convex with ${X} on ${spot}`);
    assert.ok(miss >= 6, `${item.title}: on ${spot}, every miss is at least 6 px (${miss.toFixed(1)}, ${missOf})`);
    if (miss < least) { least = miss; leastOf = `${spot} ${missOf}`; }
    // Which of the corner's three arcs miss with their corner across.
    const fails = es.gaps.map((gap, i) => ({gap, i})).filter(({gap, i}) => (gap.a === X || gap.b === X || answer[i] === X) && !gap.joins.includes(answer[i]));
    // Each spot is what its recipe says: which of the three arcs miss.
    const gx = params.order.indexOf(X), gPrev = (gx + n - 1) % n, gAcross = answer.indexOf(X);
    const expect = {'the corner': [], 'first circle': [gx, gAcross], 'second circle': [gPrev, gAcross], bisector: [gPrev, gx], off: [gPrev, gx, gAcross]}[kinds[spot]];
    assert.deepEqual(fails.map(({i}) => i).sort(), [...expect].sort(), `${item.title}: ${spot} is on ${kinds[spot]}`);
    if (spot === right) { assert.deepEqual(full.snug, [answer.join('')]); assert.equal(full.combos, 1); }
    else {
      assert.deepEqual(full.snug, [], `${item.title}: nothing on ${spot} is snug`);
      assert.ok(fails.length >= 1, `${item.title}: on ${spot}, some arc misses`);
      assert.ok(full.combos === 0 || full.least >= 8, `${item.title}: any full shape on ${spot} wobbles visibly`);
    }
    report.push(`${spot} (${kinds[spot]}): ${spot === right ? 'snug' : `${fails.map(({gap, i}) => `${gap.a}${gap.b} on ${answer[i]}`).join(', ')} miss${fails.length === 1 ? 'es' : ''}, ${full.combos} full shapes`}, least miss ${miss.toFixed(1)} px`);
  }
  const ids = [...params.order.filter(id => id !== X), ...Object.keys(params.spots)], {apart, close} = pxApart(L, ids, L.xy);
  assert.ok(apart >= 30, `${item.title}: corners and spots at least 30 px apart (${apart.toFixed(1)}, ${close})`);
  // Taps on a line reach it past the spots.
  const room = clearance(p, right);
  assert.ok(room.must.d >= ROOM_PX, `${item.title}: every spot at least ${ROOM_PX} px from every dashed line, starting arc and answer arc (${room.must.d.toFixed(1)}, ${room.must.of})`);
  if (REPORT) console.log(`${p.id} ${item.title}: width ${(Math.sqrt(F.float(d0)) * L.s).toFixed(0)} px, ${X} on ${right}, closest points ${apart.toFixed(1)} px (${close}), least miss ${least.toFixed(1)} px (${leastOf}), spots off lines ${room.must.d.toFixed(1)} px (${room.must.of}), off arcs a wrong spot allows ${room.wrongArcs.d.toFixed(1)} px (${room.wrongArcs.of})\n  ${report.join('\n  ')}`);
  const copy = placeCopy(item);
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Snug spinners', mechanic: 'width', band: 'all', revision: 1, sourceDocument: 'docs/width/README.md',
    parameters: p.parameters,
    objective: OBJECTIVE.place(X), visibleObjective: VISIBLE.place(X), instruction: OBJECTIVE.place(X),
    controls: CONTROLS_PLACE, rules: [PLACE_RULE, ...RULES], idea: item.idea, prerequisites: PREREQ.place, hints: copy.hints,
    parent: {...copy.parent, sourceIds: sources},
    solution: {corner: right, arcs: answer},
    provenance: copy.provenance
  };
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
    mathematics: 'The width of a shape in a direction is the gap between two parallel lines that touch it on either side. A shape has constant width when that gap is the same in every direction, so it turns between two fixed rails touching both. A circle does; so does a Reuleaux polygon: take an odd polygon whose star diagonals (each corner to the two corners across from it) all have length w, and join each pair of neighbouring corners by an arc of radius w centred on the corner across. When a rail touches an arc, the parallel rail through that arc’s centre touches the corner there, and every direction is of this kind, so the width is w every way. The puzzles give the corners of an equilateral triangle, a regular pentagon and irregular pentagons with equal star diagonals, exactly; the child chooses each arc’s centre, which must be the same distance from both ends of its gap. Among the centres offered, the shape spins snug exactly when every arc is centred on a corner with one common radius: the Reuleaux polygon. Half circles on the sides and arcs centred on dots inside give shapes whose width changes, and the spin stops where it has changed most. In the hard puzzles one corner is missing and the child first puts it on one of several spots: it belongs where it is the width from the two corners across from it, where two circles of that radius cross, and on every other spot some arc’s compass misses.',
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
