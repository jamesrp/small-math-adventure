// Exact shots in a lettered room, for the Aims group of Mirror Couriers.
//
// A room is a convex quadrilateral with lettered walls: a square (10 by 10),
// a wide rectangle (20 by 10) or a 60° rhombus (side 15). Rectangles use
// ordinary (x, y) coordinates. The rhombus uses oblique coordinates (s, t),
// the point s·(1, 0) + t·(1/2, √3/2), in which it is the square [0, 15]²:
// straight lines stay straight and crossings keep their order under that
// change of axes, and the mirror in each wall becomes a map with whole-number
// coefficients. So every point the app uses has whole-number coordinates,
// every crossing is a fraction, and a corner hit is decided exactly; √3 only
// appears when the board is drawn.
//
// A shot runs straight from a start inside the room to an end anywhere in
// the plane, through mirror copies of the room. Folding it: find the wall it
// leaves the room by, mirror the start and the end in that wall, and go on
// from the crossing. The walls crossed spell the shot's word. A crossing at a
// corner stops the shot: it is not allowed.

const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const safe = n => { if (!Number.isSafeInteger(n)) throw new RangeError('Shot coordinates are too large.'); return n; };

// Affine maps (x, y) → (a x + b y + e, c x + d y + f), as [a, b, c, d, e, f].
export const ID = [1, 0, 0, 1, 0, 0];
export const apply = (m, [x, y]) => [m[0] * x + m[1] * y + m[4], m[2] * x + m[3] * y + m[5]];
export const compose = (m, n) => [ // m after n
  m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3],
  m[0] * n[4] + m[1] * n[5] + m[4], m[2] * n[4] + m[3] * n[5] + m[5]
];

// Walls in order round the room: A bottom, D right, C top, B left (as on
// the worksheet). Each wall has its two corners and the mirror in it.
const rect = (W, H) => ({
  corners: [[0, 0], [W, 0], [W, H], [0, H]],
  walls: [
    {letter: 'A', from: 0, to: 1, mirror: [1, 0, 0, -1, 0, 0]},
    {letter: 'D', from: 1, to: 2, mirror: [-1, 0, 0, 1, 2 * W, 0]},
    {letter: 'C', from: 2, to: 3, mirror: [1, 0, 0, -1, 0, 2 * H]},
    {letter: 'B', from: 3, to: 0, mirror: [-1, 0, 0, 1, 0, 0]}
  ]
});
const S = 15;
export const ROOMS = {
  square: {...rect(10, 10), kind: 'rect', W: 10, H: 10},
  wide: {...rect(20, 10), kind: 'rect', W: 20, H: 10},
  rhombus: {
    kind: 'rhombus', side: S,
    corners: [[0, 0], [S, 0], [S, S], [0, S]],
    walls: [
      {letter: 'A', from: 0, to: 1, mirror: [1, 1, 0, -1, 0, 0]},
      {letter: 'D', from: 1, to: 2, mirror: [-1, 0, 1, 1, 2 * S, -S]},
      {letter: 'C', from: 2, to: 3, mirror: [1, 1, 0, -1, -S, 2 * S]},
      {letter: 'B', from: 3, to: 0, mirror: [-1, 0, 1, 1, 0, 0]}
    ]
  }
};
export const wallOf = (room, letter) => ROOMS[room].walls.find(w => w.letter === letter);
export const wallEnds = (room, wall) => [ROOMS[room].corners[wall.from], ROOMS[room].corners[wall.to]];

// Aim points: the centres of the small cells the room is cut into, five
// each way (rectangles), or the centres of the 50 small triangles (rhombus).
// Mirrors carry aim points to aim points, and none lies on a wall line.
export function isAim(room, [x, y]) {
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return false;
  const m = (n, k) => ((n % k) + k) % k;
  if (room === 'square') return m(x, 2) === 1 && m(y, 2) === 1;
  if (room === 'wide') return m(x, 4) === 2 && m(y, 2) === 1;
  if (room === 'rhombus') return m(x, 3) === m(y, 3) && m(x, 3) !== 0;
  return false;
}
// Strictly inside the room itself (the start of a shot).
export function inRoom(room, [x, y]) {
  const r = ROOMS[room], [W, H] = r.kind === 'rect' ? [r.W, r.H] : [r.side, r.side];
  return x > 0 && y > 0 && x < W && y < H;
}
// The aim points inside the room, bottom row first.
export function roomAims(room) {
  const out = [], r = ROOMS[room], [W, H] = r.kind === 'rect' ? [r.W, r.H] : [r.side, r.side];
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) if (isAim(room, [x, y])) out.push([x, y]);
  return out;
}

// Fractions are [numerator, denominator] with a positive denominator.
const less = (a, b) => a[0] * b[1] < b[0] * a[1];
const equal = (a, b) => a[0] * b[1] === b[0] * a[1];

// Fold the shot from start to end. Returns {word, crossings, corner, copies,
// legs, inside}: crossings[k] = {at: [num, den], wall} is how far along the
// shot (0 at the start, 1 at the end) it crosses its k-th wall; copies[k] is
// the map from the room to the copy the shot is in after k crossings, and
// legs[k] the start and end mirrored into the room by the walls crossed so
// far, so the folded shot runs along legs[k] between crossings k - 1 and k.
// corner, when the shot hits one, is {at} and the shot stops there; inside
// says the end is strictly inside its copy. Every step is whole numbers.
export function fold(room, start, end, limit = 40) {
  const r = ROOMS[room];
  let s = start, e = end, after = [0, 1], from = -1, map = ID;
  const word = [], crossings = [], copies = [ID], legs = [[start, end]];
  const done = (corner, inside) => ({word: word.join(''), crossings, corner, copies, legs, inside});
  for (let k = 0; k < limit; k++) {
    let best = null;
    const d = sub(e, s);
    r.walls.forEach((wall, i) => {
      if (i === from) return;
      const a = r.corners[wall.from], f = sub(r.corners[wall.to], a), w = sub(a, s);
      let den = safe(cross(d, f)), num = safe(cross(w, f)), along = safe(cross(w, d));
      if (den === 0) return;
      if (den < 0) { den = -den; num = -num; along = -along; }
      const at = [num, den];
      if (!less(after, at) || along < 0 || along > den) return;
      if (!best || less(at, best.at)) best = {at, wall: i, along, den};
    });
    if (!best || less([1, 1], best.at)) return done(null, true);
    if (equal(best.at, [1, 1])) return done(null, false);
    if (best.along === 0 || best.along === best.den) return done({at: best.at}, false);
    const wall = r.walls[best.wall];
    word.push(wall.letter);
    crossings.push({at: best.at, wall: best.wall});
    s = apply(wall.mirror, s); e = apply(wall.mirror, e);
    map = compose(map, wall.mirror);
    copies.push(map);
    legs.push([s, e]);
    from = best.wall; after = best.at;
  }
  throw new RangeError('The shot crosses too many walls.');
}

// A point a fraction of the way along a shot, as decimals for drawing.
export const along = (start, end, [n, d]) => [start[0] + (end[0] - start[0]) * n / d, start[1] + (end[1] - start[1]) * n / d];

// Words that some rectangle can make: wall letters of each direction take
// turns (A with C, B with D), and the order of across (B, D) and up-down
// (A, C) crossings is balanced: any two stretches of the word of the same
// length hold numbers of up-down crossings that differ by at most one.
// Balanced orders are exactly the orders a straight line crosses two sets of
// evenly spaced lines in; the validator checks this by linear programming.
export function rectangleWord(word) {
  const ud = [...word].map(c => 'AC'.includes(c));
  if (![...word].every(c => 'ABCD'.includes(c))) return false;
  for (const family of ['AC', 'BD']) {
    const letters = [...word].filter(c => family.includes(c));
    if (letters.some((c, i) => i && c === letters[i - 1])) return false;
  }
  for (let n = 1; n <= ud.length; n++) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i + n <= ud.length; i++) {
      const c = ud.slice(i, i + n).filter(Boolean).length;
      lo = Math.min(lo, c); hi = Math.max(hi, c);
    }
    if (hi - lo > 1) return false;
  }
  return true;
}
