// Three-arm lines (tropical lines), in exact whole numbers. Points are stored
// in half-steps: [u, v] means (u/2, v/2) on the worksheet's grid, so every
// junction, target and meeting point used here has whole-number coordinates
// and every test is exact. Nothing here knows about the app.
//
// A line with junction J = (a, b) is the set of points where the least of
// x − a, y − b and 0 occurs at least twice (min-plus convention). The three
// possible ties give its three closed arms from J: east (a + t, b), north
// (a, b + t) and south-west (a − t, b − t), t ≥ 0.
//
// Two lines with different junctions always meet. They share one point,
// unless their junctions share a column (then the north ray from the higher
// junction), a row (the east ray from the right one) or a rising diagonal
// (the south-west ray from the lower one). The junctions whose line passes a
// point T fill T's fan: the rays west, south and north-east from T. Turning
// the plane half a turn about the origin carries fans onto lines, so two
// fans meet in one point or share a ray in the same way: two points lie on
// exactly one line unless they share a row, column or rising diagonal.

export const DIRS = {E: [1, 0], N: [0, 1], SW: [-1, -1], W: [-1, 0], S: [0, -1], NE: [1, 1], NW: [-1, 1], SE: [1, -1]};
export const ARMS = ['E', 'N', 'SW'];
export const FAN = ['W', 'S', 'NE'];
export const OPPOSITE = {E: 'W', W: 'E', N: 'S', S: 'N', SW: 'NE', NE: 'SW', NW: 'SE', SE: 'NW'};
export const isDir = d => Object.hasOwn(DIRS, d);

export const same = (p, q) => p[0] === q[0] && p[1] === q[1];
export const keyOf = p => `${p[0]},${p[1]}`;
const neg = p => [0 - p[0], 0 - p[1]]; // never −0

// The step count t ≥ 0 with p = s + t·d, or null when p is not on that ray.
export function along(p, s, d) {
  const [dx, dy] = DIRS[d], u = p[0] - s[0], v = p[1] - s[1];
  const t = dx ? u * dx : v * dy;
  return t >= 0 && u === t * dx && v === t * dy ? t : null;
}
export const onRay = (p, s, d) => along(p, s, d) !== null;
// The arms of the line with junction J that hold p (all three at J itself).
export const armsThrough = (p, J) => ARMS.filter(d => onRay(p, J, d));
export const onLine = (p, J) => armsThrough(p, J).length > 0;
// The junctions whose line passes T: T's fan.
export const inFan = (J, T) => onLine(T, J);

// What two lines share: {kind: 'line'} for one junction, {kind: 'ray', from,
// dir} when the junctions are aligned, else {kind: 'point', at}.
export function meet(A, B) {
  if (same(A, B)) return {kind: 'line'};
  if (A[0] === B[0]) return {kind: 'ray', from: A[1] > B[1] ? [...A] : [...B], dir: 'N'};
  if (A[1] === B[1]) return {kind: 'ray', from: A[0] > B[0] ? [...A] : [...B], dir: 'E'};
  if (A[0] - A[1] === B[0] - B[1]) return {kind: 'ray', from: A[0] < B[0] ? [...A] : [...B], dir: 'SW'};
  // One junction north-west of the other: the north-west one's east arm
  // meets the other's north arm at the far corner of their rectangle.
  if (A[0] < B[0] && A[1] > B[1]) return {kind: 'point', at: [B[0], A[1]]};
  if (B[0] < A[0] && B[1] > A[1]) return {kind: 'point', at: [A[0], B[1]]};
  // South-west and north-east: the upper junction's south-west arm reaches
  // the bottom side of the rectangle (wide) or its left side (tall).
  const [L, U] = A[0] < B[0] ? [A, B] : [B, A], w = U[0] - L[0], h = U[1] - L[1];
  return {kind: 'point', at: w > h ? [U[0] - h, L[1]] : [L[0], U[1] - w]};
}

// The junctions whose line passes both P and Q: a half-turn of meet().
// {kind: 'fan', at} when P and Q are one point.
export function fanMeet(P, Q) {
  if (same(P, Q)) return {kind: 'fan', at: [...P]};
  const m = meet(neg(P), neg(Q));
  return m.kind === 'point' ? {kind: 'point', at: neg(m.at)} : {kind: 'ray', from: neg(m.from), dir: OPPOSITE[m.dir]};
}

// Two closed rays, both in directions of the six line and fan directions
// (no two of them at right angles across a diagonal, so any crossing is a
// whole number of half-steps). Returns null, {kind: 'point', at},
// {kind: 'ray', from, dir} or {kind: 'segment', from, to}.
export function rayCap(s1, d1, s2, d2) {
  const [a, b] = DIRS[d1], [c, e] = DIRS[d2], cross = a * e - b * c;
  if (cross === 0) {
    // Parallel: on one line only if s2 is on the line through s1.
    const u = s2[0] - s1[0], v = s2[1] - s1[1];
    if (u * b !== v * a) return null;
    if (d1 === d2) return onRay(s2, s1, d1) ? {kind: 'ray', from: [...s2], dir: d1} : {kind: 'ray', from: [...s1], dir: d1};
    // Opposite directions: the stretch between, if they overlap.
    if (!onRay(s2, s1, d1)) return null;
    return same(s1, s2) ? {kind: 'point', at: [...s1]} : {kind: 'segment', from: [...s1], to: [...s2]};
  }
  // s1 + t·(a, b) = s2 + r·(c, e).
  const u = s2[0] - s1[0], v = s2[1] - s1[1], tn = u * e - v * c, rn = u * b - v * a;
  if (tn % cross || rn % cross) return null;
  const t = tn / cross, r = rn / cross;
  return t >= 0 && r >= 0 ? {kind: 'point', at: [s1[0] + t * a, s1[1] + t * b]} : null;
}

// Every junction whose line passes all the targets: null (none), a point, or
// a ray. (Distinct targets only; puzzles never repeat one.)
export function junctionsFor(targets) {
  let set = fanMeet(targets[0], targets[1]);
  for (const T of targets.slice(2)) {
    if (set.kind === 'point') { if (!inFan(set.at, T)) return null; continue; }
    const parts = FAN.map(d => rayCap(set.from, set.dir, T, d)).filter(Boolean);
    const ray = parts.find(x => x.kind === 'ray');
    if (ray) { set = ray; continue; }
    const point = parts.find(x => x.kind === 'point');
    if (!point) return null;
    set = point;
  }
  return set;
}
export const passesAll = (J, targets) => targets.every(T => onLine(T, J));
