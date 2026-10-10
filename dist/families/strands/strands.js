// Strands (worksheet Week 75, twists on a cylinder). A strip whose left and
// right edges are glued is a cylinder; its top and bottom edges are rims. A
// strand runs upward from A on the bottom rim to B on the top rim, drawn as a
// bead on each lattice row with straight pieces between, so it never crosses
// itself. Its lift in the unrolled view starts at the A of the first copy and
// ends at the B of copy w: w is its winding, the signed number of times it
// goes round. Sliding a strand with its ends fixed never changes w.
//
// Two strands with windings a and b share both ends. Away from the ends they
// must cross at least max(|a − b| − 1, 0) times, and straight strands do no
// worse: in the unrolled view the second strand starts on one side of every
// copy of the first that lies between its two ends, and ends on the other.
// Every solve is something to do with the strands: drag beads until the
// crossings are fewest, press Done, and tap each copy of the red strand that
// blue must cross (the certificate); or move the ends of three strands, which
// pull tight, until each pair crosses as often as its number. The gap between
// the outer two ends is the sum of the two inner gaps, so three pairs that
// each cross once is impossible: press Can't and tap the strand whose end is
// in the middle (the certificate).
import {esc} from '../../expansion-controls.js';
import {surfaceOf, roomBoard, planeBoard, shoot, roomXY, wirePortal} from '../../portal-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
const mod = (x, m) => ((x % m) + m) % m;
const fdiv = (a, b) => Math.floor(a / b);
const cdiv = (a, b) => -Math.floor(-a / b);
const f = x => Number(x.toFixed(3));
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
export const MODES = ['untangle', 'design', 'playground'];
export const COLOURS = ['red', 'blue', 'green'];
const NAMES = ['Red', 'Blue', 'Green'];
export const PAIRS = [[0, 1], [1, 2], [0, 2]];
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh'];
const word = n => WORDS[n] ?? String(n);
const times = n => n === 1 ? 'once' : `${word(n)} times`;

// --- The cylinder -----------------------------------------------------------------
// q.room is a portal-board spec glued left to right only (roomFromRows with
// wrapY: false, on 'crosses'), q.a the column of A and B, q.copies the copies
// [k0, k1] the unrolled view shows. A strand's beads stay inside them.
const cyls = new Map();
export function cylOf(q) {
  const key = JSON.stringify([q.room, q.a, q.copies]);
  let C = cyls.get(key);
  if (!C) {
    const S = surfaceOf(q.room), n = S.n, N = (S.box[2] - S.box[0]) * n, M = (S.box[3] - S.box[1]) * n;
    const [k0, k1] = q.copies;
    C = {S, n, N, M, a: q.a, k0, k1, lo: k0 * N, hi: (k1 + 1) * N - 1};
    cyls.set(key, C);
  }
  return C;
}
// A route: a strand's lifted column on every row, from A (row 0) to B in copy w (row M).
export const routeOf = (C, beads, w) => [C.a, ...beads, C.a + w * C.N];
export const fewest = (a, b) => Math.max(Math.abs(a - b) - 1, 0);
// Whole turns (multiples of N) strictly between two gaps.
export const levelsBetween = (u, v, N) => Math.max(0, cdiv(Math.max(u, v), N) - 1 - fdiv(Math.min(u, v), N));
// Two strands meet where their lifted columns differ by a whole turn. On the
// rows they never do (beads never share a spot), so every meeting is a
// crossing between two rows, and the ends A and B are not counted.
export function crossCount(C, xs, ys) {
  let c = 0;
  for (let j = 0; j < C.M; j++) c += levelsBetween(ys[j] - xs[j], ys[j + 1] - xs[j + 1], C.N);
  return c;
}
// Each crossing: its band j, the copy k of the first strand that the second
// meets there in the unrolled view, its height t and the first strand's column x.
export function crossings(C, xs, ys) {
  const out = [];
  for (let j = 0; j < C.M; j++) {
    const d0 = ys[j] - xs[j], d1 = ys[j + 1] - xs[j + 1];
    if (d0 === d1) continue;
    for (let k = fdiv(Math.min(d0, d1), C.N) + 1; k * C.N < Math.max(d0, d1); k++) {
      const s = (k * C.N - d0) / (d1 - d0);
      out.push({j, k, t: j + s, x: xs[j] + (xs[j + 1] - xs[j]) * s});
    }
  }
  return out;
}
// No two strands on one spot of the cylinder on any row between the rims.
export function apart(C, routes) {
  for (let j = 1; j < C.M; j++) for (let i = 0; i < routes.length; i++) for (let k = i + 1; k < routes.length; k++) if (mod(routes[k][j] - routes[i][j], C.N) === 0) return false;
  return true;
}
const beadsOk = (C, beads) => Array.isArray(beads) && beads.length === C.M - 1 && beads.every(x => int(x) && x >= C.lo && x <= C.hi);
// The copies of red that blue must cross: those strictly between blue's ends.
export function barriers(wr, wb) {
  const d = wb - wr, out = [];
  for (let k = Math.min(0, d) + 1; k < Math.max(0, d); k++) out.push(k);
  return out;
}

// --- Strands pulled tight ---------------------------------------------------------
// Strands with given windings, each crossing every other the fewest times, with
// no three meeting at a point: a search over rows, each bead within a column
// of its straight line, the steeper strands moving off it first. Cached by
// windings.
const layouts = new Map();
export function layout(C, ws) {
  const key = `${C.N},${C.M},${C.a},${C.lo},${C.hi}|${ws.join()}`;
  if (layouts.has(key)) return layouts.get(key);
  const n = ws.length, base = (i, j) => C.a + ws[i] * C.N * j / C.M;
  const layers = [[ws.map(() => C.a)]];
  for (let j = 1; j < C.M; j++) {
    const options = ws.map((_, i) => { const b = base(i, j), out = []; for (let x = Math.floor(b) - 1; x <= Math.ceil(b) + 1; x++) if (x >= C.lo && x <= C.hi) out.push(x); return out; });
    const states = [];
    const grow = (i, cur) => {
      if (i === n) { if (cur.every((x, a) => cur.every((y, b) => a === b || mod(y - x, C.N) !== 0))) states.push(cur); return; }
      for (const x of options[i]) grow(i + 1, [...cur, x]);
    };
    grow(0, []);
    layers.push(states);
  }
  layers.push([ws.map(w => C.a + w * C.N)]);
  const cost = (P, R, j) => {
    const pts = [];
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const d0 = P[b] - P[a], d1 = R[b] - R[a];
      if (d0 === d1) continue;
      for (let k = fdiv(Math.min(d0, d1), C.N) + 1; k * C.N < Math.max(d0, d1); k++) { const s = (k * C.N - d0) / (d1 - d0); pts.push([s, mod(P[a] + (R[a] - P[a]) * s, C.N)]); }
    }
    let triple = 0;
    for (let u = 0; u < pts.length; u++) for (let v = u + 1; v < pts.length; v++) if (Math.abs(pts[u][0] - pts[v][0]) < 1e-9 && Math.abs(pts[u][1] - pts[v][1]) < 1e-9) triple++;
    // Steeper strands give way, so a strand that winds little stays straight.
    let dev = 0;
    R.forEach((x, i) => { dev += Math.abs(x - base(i, j + 1)) * 6 / (1 + Math.abs(ws[i])); });
    return pts.length * 10000 + triple * 100 + dev;
  };
  let best = [{c: 0, prev: -1}];
  const trail = [best];
  for (let L = 1; L < layers.length; L++) {
    best = layers[L].map(R => {
      let pick = null;
      best.forEach((v, pi) => { const c = v.c + cost(layers[L - 1][pi], R, L - 1); if (!pick || c < pick.c) pick = {c, prev: pi}; });
      return pick;
    });
    trail.push(best);
  }
  const rows = [];
  for (let L = layers.length - 1, k = 0; L >= 0; L--) { rows.unshift(layers[L][k]); k = trail[L][k].prev; }
  const routes = ws.map((_, i) => rows.map(r => r[i]));
  layouts.set(key, routes);
  return routes;
}
// A whole-cylinder twist moves every row sideways by its share of k turns, so
// every winding grows by k and no gap between two strands on a row changes.
export const twistShift = (C, k, j) => Math.sign(k * j) * Math.floor(Math.abs(k * C.N * j / C.M) + .5);

// --- Boards --------------------------------------------------------------------
// untangle: {s: [red beads, blue beads], told: null | 'fewer' | 'miss', claim: null | [copies tapped], done}
// design: {w: [three windings], tried, told: null | 'way' | 'miss', claim, mid: null | strand}
// playground: {s: [beads, beads], w: [windings]}
const modeOf = p => p.parameters.mode;
export const routesOf = (p, b) => {
  const q = p.parameters, C = cylOf(q);
  if (q.mode === 'design') return layout(C, b.w);
  return b.s.map((beads, i) => routeOf(C, beads, q.mode === 'untangle' ? q.w[i] : b.w[i]));
};
const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Untangle.
export const untangleCount = (p, b) => { const C = cylOf(p.parameters), [r, u] = routesOf(p, b); return crossCount(C, r, u); };
export const untangleFewest = q => fewest(q.w[0], q.w[1]);
function validUntangle(p, b) {
  const q = p.parameters, C = cylOf(q);
  if (!keysAre(b, ['s', 'told', 'claim', 'done']) || !Array.isArray(b.s) || b.s.length !== 2 || !b.s.every(s => beadsOk(C, s))) return false;
  if (!apart(C, routesOf(p, b)) || typeof b.done !== 'boolean') return false;
  const count = untangleCount(p, b), least = untangleFewest(q), walls = barriers(...q.w);
  const claimOk = c => Array.isArray(c) && c.every(int) && c.every((k, i) => walls.includes(k) && (i === 0 || c[i - 1] < k));
  if (b.done) return count === least && b.told === null && (least === 0 ? sameList(b.claim, []) : sameList(b.claim, walls));
  if (b.told === 'fewer') return count > least && b.claim === null;
  if (b.told === 'miss') return count === least && least > 0 && b.claim === null;
  if (b.told !== null) return false;
  if (b.claim === null) return true;
  return count === least && least > 0 && claimOk(b.claim) && b.claim.length < walls.length;
}
function moveUntangle(p, b, action) {
  const q = p.parameters, C = cylOf(q);
  if (action.type === 'bead') {
    const {strand: i, row: j, x} = action;
    if (b.claim !== null || ![0, 1].includes(i) || !int(j) || j < 1 || j >= C.M || !int(x) || x < C.lo || x > C.hi || b.s[i][j - 1] === x) return null;
    const s = b.s.map((beads, k) => k === i ? beads.map((v, r) => r === j - 1 ? x : v) : [...beads]);
    const next = {s, told: null, claim: null, done: false};
    return apart(C, routesOf(p, next)) ? next : null;
  }
  if (action.type === 'done') {
    if (b.claim !== null || b.told === 'fewer') return null;
    const count = untangleCount(p, b), least = untangleFewest(q);
    if (count > least) return {...b, told: 'fewer'};
    return least === 0 ? {...b, told: null, claim: [], done: true} : {...b, told: null, claim: []};
  }
  if (action.type === 'pick') {
    if (b.claim === null || !int(action.k) || b.claim.includes(action.k) || Math.abs(action.k) > 24) return null;
    const walls = barriers(...q.w);
    if (!walls.includes(action.k)) return {...b, claim: null, told: 'miss'};
    const claim = [...b.claim, action.k].sort((x, y) => x - y);
    return {...b, claim, done: claim.length === walls.length};
  }
  return null;
}

// Design: three strands pulled tight; the solve is each pair's fewest crossings on its number.
export const pairCounts = ws => PAIRS.map(([i, k]) => fewest(ws[i], ws[k]));
export const met = (q, ws) => sameList(pairCounts(ws), q.targets);
const windingsOf = q => { const out = []; for (let w = q.copies[0]; w <= q.copies[1]; w++) out.push(w); return out; };
const triples = q => { const W = windingsOf(q), out = []; for (const a of W) for (const b of W) for (const c of W) out.push([a, b, c]); return out; };
const possibleMemo = new Map();
export function designPossible(q) {
  const key = JSON.stringify([q.copies, q.targets]);
  if (!possibleMemo.has(key)) possibleMemo.set(key, triples(q).some(ws => met(q, ws)));
  return possibleMemo.get(key);
}
// A strand whose end lies between the other two (or level with one of them).
export const isMiddle = (ws, i) => { const o = ws.filter((_, k) => k !== i); return Math.min(...o) <= ws[i] && ws[i] <= Math.max(...o); };
function validDesign(p, b) {
  const q = p.parameters;
  if (!keysAre(b, ['w', 'tried', 'told', 'claim', 'mid']) || !Array.isArray(b.w) || b.w.length !== 3 || !b.w.every(w => int(w) && w >= q.copies[0] && w <= q.copies[1])) return false;
  if (typeof b.tried !== 'boolean' || typeof b.claim !== 'boolean' || ![null, 'way', 'miss'].includes(b.told) || !(b.mid === null || [0, 1, 2].includes(b.mid))) return false;
  if (!b.tried && (!sameList(b.w, q.start) || b.told !== null || b.claim || b.mid !== null)) return false;
  const can = designPossible(q);
  if (met(q, b.w)) return b.told === null && !b.claim && b.mid === null;
  if (b.mid !== null) return !can && b.tried && !b.claim && b.told === null && isMiddle(b.w, b.mid);
  if (b.claim) return !can && b.tried && b.told === null;
  if (b.told === 'way') return can;
  if (b.told === 'miss') return !can;
  return true;
}
function moveDesign(p, b, action) {
  const q = p.parameters;
  if (action.type === 'end') {
    const {strand: i, w} = action;
    if (b.claim || ![0, 1, 2].includes(i) || !int(w) || w < q.copies[0] || w > q.copies[1] || b.w[i] === w) return null;
    return {w: b.w.map((v, k) => k === i ? w : v), tried: true, told: null, claim: false, mid: null};
  }
  if (action.type === 'cant') {
    if (!b.tried || b.claim || b.told === 'way') return null;
    return designPossible(q) ? {...b, told: 'way'} : {...b, told: null, claim: true};
  }
  if (action.type === 'pick') {
    if (!b.claim || ![0, 1, 2].includes(action.strand)) return null;
    return isMiddle(b.w, action.strand) ? {...b, claim: false, mid: action.strand} : {...b, claim: false, told: 'miss'};
  }
  return null;
}

// Playground: two strands with beads; ends move and the cylinder twists.
function validPlay(p, b) {
  const q = p.parameters, C = cylOf(q);
  if (!keysAre(b, ['s', 'w']) || !Array.isArray(b.s) || !Array.isArray(b.w) || b.s.length !== 2 || b.w.length !== 2) return false;
  if (!b.w.every(w => int(w) && w >= C.k0 && w <= C.k1) || !b.s.every(s => beadsOk(C, s))) return false;
  return apart(C, routesOf(p, b));
}
// Moving one end re-lays that strand: its beads shift by a twist of that strand alone,
// nudged off any spot the other strand holds.
function relay(C, b, i, w) {
  const dw = w - b.w[i], other = routeOf(C, b.s[1 - i], b.w[1 - i]);
  const beads = b.s[i].map((x, r) => {
    const want = Math.min(C.hi, Math.max(C.lo, x + twistShift(C, dw, r + 1)));
    for (const dx of [0, 1, -1, 2, -2]) { const y = want + dx; if (y >= C.lo && y <= C.hi && mod(y - other[r + 1], C.N) !== 0) return y; }
    return null;
  });
  if (beads.includes(null)) return null;
  const s = b.s.map((v, k) => k === i ? beads : [...v]), ws = b.w.map((v, k) => k === i ? w : v);
  return {s, w: ws};
}
function movePlay(p, b, action) {
  const q = p.parameters, C = cylOf(q);
  if (action.type === 'bead') {
    const {strand: i, row: j, x} = action;
    if (![0, 1].includes(i) || !int(j) || j < 1 || j >= C.M || !int(x) || x < C.lo || x > C.hi || b.s[i][j - 1] === x) return null;
    const next = {s: b.s.map((beads, k) => k === i ? beads.map((v, r) => r === j - 1 ? x : v) : [...beads]), w: [...b.w]};
    return apart(C, routesOf(p, next)) ? next : null;
  }
  if (action.type === 'end') {
    const {strand: i, w} = action;
    if (![0, 1].includes(i) || !int(w) || w < C.k0 || w > C.k1 || b.w[i] === w) return null;
    const next = relay(C, b, i, w);
    return next && validPlay(p, next) ? next : null;
  }
  if (action.type === 'twist') {
    if (![1, -1].includes(action.k)) return null;
    const next = {s: b.s.map(beads => beads.map((x, r) => x + twistShift(C, action.k, r + 1))), w: b.w.map(w => w + action.k)};
    return validPlay(p, next) ? next : null;
  }
  return null;
}

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'untangle') return {s: q.start.map(s => [...s]), told: null, claim: null, done: false};
  if (q.mode === 'design') return {w: [...q.start], tried: false, told: null, claim: false, mid: null};
  return {s: q.start.s.map(s => [...s]), w: [...q.start.w]};
}
function valid(p, b) {
  const m = modeOf(p);
  if (m === 'untangle') return validUntangle(p, b);
  if (m === 'design') return validDesign(p, b);
  if (m === 'playground') return validPlay(p, b);
  return false;
}
function solved(p, b) {
  const m = modeOf(p);
  if (m === 'playground' || !valid(p, b)) return false;
  if (m === 'untangle') return b.done;
  return met(p.parameters, b.w) || b.mid !== null;
}
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const m = modeOf(p);
  const next = m === 'untangle' ? moveUntangle(p, b, action) : m === 'design' ? moveDesign(p, b, action) : movePlay(p, b, action);
  return next && valid(p, next) ? next : null;
}
// Undo takes back moves, not a refusal: undoing to the same strands keeps it,
// and keeps that the child has tried an end.
function carry(p, from, to) {
  if (!object(from) || !object(to)) return to;
  const m = modeOf(p);
  if (m === 'untangle' && from.told && sameList(from.s, to.s)) return {...to, told: from.told, claim: null};
  if (m === 'design') {
    const tried = from.tried || to.tried;
    if (from.told && sameList(from.w, to.w)) return {...to, tried, told: from.told, claim: false};
    return {...to, tried};
  }
  return to;
}

// --- Hints -----------------------------------------------------------------------
const hints = new Map();
const remember = (key, make) => { if (!hints.has(key)) { if (hints.size > 400) hints.clear(); hints.set(key, make()); } return hints.get(key); };
// Untangle: the gaps blue − red on the rows with the fewest crossings that
// change the fewest rows (a row costs one move if one bead can reach it, two
// if both must move), found by a search over rows. Each hint makes one of the
// changes, the one that leaves the fewest crossings now; the plan then needs
// one move fewer, so hints alone always finish.
function untanglePlan(p, b) {
  const q = p.parameters, C = cylOf(q), [xr, xb] = routesOf(p, b), last = xb[C.M] - xr[C.M], span = C.hi - C.lo;
  const cur = j => xb[j] - xr[j];
  const price = (j, D) => D === cur(j) ? 0 : (xr[j] + D >= C.lo && xr[j] + D <= C.hi) || (xb[j] - D >= C.lo && xb[j] - D <= C.hi) ? 1 : 2;
  const values = [];
  for (let D = -span; D <= span; D++) if (mod(D, C.N) !== 0) values.push(D);
  let layer = new Map([[0, {c: 0, prev: null}]]);
  const trail = [layer];
  for (let j = 1; j <= C.M; j++) {
    const next = new Map(), here = j === C.M ? [last] : values;
    for (const D of here) {
      let pick = null;
      for (const [P, v] of layer) {
        const c = v.c + levelsBetween(P, D, C.N) * 100000 + (j < C.M ? price(j, D) * 100 + Math.abs(D - cur(j)) : 0);
        if (!pick || c < pick.c) pick = {c, prev: P};
      }
      next.set(D, pick);
    }
    layer = next; trail.push(layer);
  }
  const plan = [last];
  for (let j = C.M; j > 1; j--) plan.unshift(trail[j].get(plan[0]).prev);
  return [0, ...plan];
}
const ordinalBead = (strand, j) => `the ${ORDINALS[j]} ${COLOURS[strand]} bead from the bottom`;
const beadText = (strand, j, from, to) => `Drag ${ordinalBead(strand, j)} ${word(Math.abs(to - from))} ${Math.abs(to - from) === 1 ? 'place' : 'places'} ${to > from ? 'right' : 'left'}.`;
function untangleHint(p, b) {
  const q = p.parameters, C = cylOf(q), [xr, xb] = routesOf(p, b), least = untangleFewest(q), count = untangleCount(p, b);
  if (b.claim !== null) {
    const k = barriers(...q.w).find(c => !b.claim.includes(c));
    return {type: 'move', action: {type: 'pick', k}, text: `Tap the red copy that starts ${word(Math.abs(k))} ${Math.abs(k) === 1 ? 'copy' : 'copies'} ${k > 0 ? 'right' : 'left'} of A: blue starts on one side of it and ends on the other.`};
  }
  if (count === least && b.told !== 'fewer') return {type: 'move', action: {type: 'done'}, text: least ? 'Every crossing left is with a copy of red that blue has to cross. Press Done.' : 'No crossings are left. Press Done.'};
  const plan = untanglePlan(p, b), options = [];
  for (let j = 1; j < C.M; j++) {
    const D = plan[j];
    if (D === xb[j] - xr[j]) continue;
    let action;
    if (xr[j] + D >= C.lo && xr[j] + D <= C.hi) action = {type: 'bead', strand: 1, row: j, x: xr[j] + D};
    else if (xb[j] - D >= C.lo && xb[j] - D <= C.hi) action = {type: 'bead', strand: 0, row: j, x: xb[j] - D};
    else {
      // Both beads must move: first red, to a spot from which blue can reach the gap.
      const spots = [];
      for (let x = C.lo; x <= C.hi; x++) if (x + D >= C.lo && x + D <= C.hi && mod(xb[j] - x, C.N) !== 0) spots.push(x);
      spots.sort((u, v) => Math.abs(u - xr[j]) - Math.abs(v - xr[j]));
      action = {type: 'bead', strand: 0, row: j, x: spots[0]};
    }
    const after = moveUntangle(p, b, action);
    if (after) options.push({action, left: untangleCount(p, after), j});
  }
  if (!options.length) return {type: 'deadend', text: 'Undo.'};
  options.sort((u, v) => u.left - v.left || u.j - v.j);
  const {action} = options[0], from = b.s[action.strand][action.row - 1];
  return {type: 'move', action, text: beadText(action.strand, action.row, from, action.x)};
}
// Design: the nearest windings that meet the targets (fewest ends to move,
// then the shortest distance), or, when none can, the nearest that meet two
// of the three; then Can't with the reason, and the middle strand.
function nearest(q, ws, good) {
  let best = null;
  for (const t of triples(q)) {
    if (!good(t)) continue;
    const moves = t.filter((w, i) => w !== ws[i]).length, dist = t.reduce((s, w, i) => s + Math.abs(w - ws[i]), 0);
    if (!best || moves < best.moves || (moves === best.moves && dist < best.dist)) best = {t, moves, dist};
  }
  return best?.t || null;
}
const twoMet = (q, ws) => pairCounts(ws).filter((c, i) => c === q.targets[i]).length >= 2;
function endHint(ws, target) {
  const i = target.findIndex((w, k) => w !== ws[k]), n = target[i] - ws[i];
  return {type: 'move', action: {type: 'end', strand: i, w: target[i]}, text: `Move the ${COLOURS[i]} end ${word(Math.abs(n))} ${Math.abs(n) === 1 ? 'copy' : 'copies'} ${n > 0 ? 'right' : 'left'}.`};
}
function designHint(p, b) {
  const q = p.parameters;
  if (designPossible(q)) return endHint(b.w, nearest(q, b.w, t => met(q, t)));
  if (b.claim) {
    // The strand strictly between the others if there is one, else one level with an outer end.
    const i = [0, 1, 2].find(k => isMiddle(b.w, k) && b.w.filter(w => w === b.w[k]).length === 1) ?? [0, 1, 2].find(k => isMiddle(b.w, k));
    const level = [0, 1, 2].find(k => k !== i && b.w[k] === b.w[i]);
    return {type: 'move', action: {type: 'pick', strand: i}, text: `Tap ${COLOURS[i]}: its end is between the other two${level === undefined ? '' : `, level with ${COLOURS[level]}’s`}.`};
  }
  // An attempt first: two pairs on their numbers, with the three ends apart
  // if that can be, so that one end is plainly in the middle.
  const apartEnds = t => new Set(t).size === 3, fits = t => twoMet(q, t) && (b.tried || !sameList(t, b.w));
  const ready = twoMet(q, b.w) && (apartEnds(b.w) || !triples(q).some(t => twoMet(q, t) && apartEnds(t)));
  if (!b.tried || !ready) return endHint(b.w, nearest(q, b.w, t => fits(t) && apartEnds(t)) || nearest(q, b.w, fits));
  // The reason, then Can't: two pairs on their numbers fix two gaps between
  // ends, and the third gap is their sum or difference.
  const miss = PAIRS.findIndex((_, i) => pairCounts(b.w)[i] !== q.targets[i]), good = PAIRS.filter((_, i) => i !== miss);
  const gap = ([i, k]) => Math.abs(b.w[i] - b.w[k]), [g1, g2] = good.map(gap), far = g1 + g2, near = Math.abs(g1 - g2);
  const pair = ([i, k]) => `${COLOURS[i]} and ${COLOURS[k]}`, cap = t => t[0].toUpperCase() + t.slice(1);
  const ends = g => g === 0 ? 'level' : `${word(g)} ${g === 1 ? 'copy' : 'copies'} apart`;
  const cross = n => n === 0 ? 'not at all' : times(n);
  const first = g1 === g2 ? `${cap(pair(good[0]))} ends are ${ends(g1)}, and so are ${pair(good[1])}.` : `${cap(pair(good[0]))} ends are ${ends(g1)}, and ${pair(good[1])} ends are ${ends(g2)}.`;
  const text = `${first} So ${pair(PAIRS[miss])} ends are ${ends(far)} or ${ends(near)}: they cross ${cross(fewest(far, 0))} or ${cross(fewest(near, 0))}, never ${times(q.targets[miss])}. Press Can’t.`;
  return {type: 'move', action: {type: 'cant'}, text};
}
function hint(p, b) {
  const m = modeOf(p);
  if (m === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return remember(`${p.id}|${JSON.stringify(b)}`, () => m === 'untangle' ? untangleHint(p, b) : designHint(p, b));
}


// --- Drawing ---------------------------------------------------------------------
// Rows count up from the bottom rim. A lattice point is named in the room by
// its square and place in it ("s,i,j"), in the unrolled view by its lifted
// column and row ("u,v"), as on the portal board.
function roomKey(C, x, j) {
  const c = mod(x, C.N), col = Math.floor(c / C.n), row = Math.min(Math.floor(j / C.n), C.S.box[3] - 1);
  const s = C.S.ids.find(id => C.S.at[id][0] === col && C.S.at[id][1] === row);
  return `${s},${c - col * C.n},${j - row * C.n}`;
}
function roomPlace(C, key) {
  const [s, i, j] = String(key).split(','), at = C.S.at[s];
  return at ? {col: at[0] * C.n + Number(i), row: at[1] * C.n + Number(j)} : null;
}
const roomAt = (C, x, t) => [mod(x, C.N), -t];
// Every place a column shows in the room: a bead on the seam shows on both edges.
const roomSpotsOf = (C, x, t) => mod(x, C.N) === 0 ? [[0, -t], [C.N, -t]] : [roomAt(C, x, t)];
// A strand in the room, piece by piece, broken where it goes through the seam.
function roomStrand(C, xs, cls) {
  let out = '';
  for (let j = 0; j < C.M; j++) {
    const row = Math.min(Math.floor(j / C.n), C.S.box[3] - 1), c = mod(xs[j], C.N), col = Math.floor(c / C.n);
    const s = C.S.ids.find(id => C.S.at[id][0] === col && C.S.at[id][1] === row);
    if (xs[j + 1] === xs[j]) { const [x1, y1] = roomXY(C.S, s, c - col * C.n, j - row * C.n); out += `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x1)}" y2="${f(y1 - 1)}"/>`; continue; }
    const shot = shoot(C.S, {s, x: [c - col * C.n, 1], y: [j - row * C.n, 1]}, [xs[j + 1] - xs[j], 1], {length: 1});
    for (const pc of shot.pieces) {
      const [x1, y1] = roomXY(C.S, pc.s, ...pc.a), [x2, y2] = roomXY(C.S, pc.s, ...pc.b);
      out += `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
    }
  }
  return out;
}
const liftStrand = (xs, cls, dx = 0) => `<polyline class="${cls}" points="${xs.map((x, j) => `${f(x + dx)},${f(-j)}`).join(' ')}"/>`;
const ring = ([x, y], cls = '') => `<circle class="st-cross ${cls}" cx="${f(x)}" cy="${f(y)}" r=".2"/>`;
const rimMark = ([x, y], cls = '') => `<circle class="st-rim ${cls}" cx="${f(x)}" cy="${f(y)}" r=".13"/>`;
const letter = ([x, y], text, cls = '') => `<text class="st-letter ${cls}" x="${f(x)}" y="${f(y)}">${text}</text>`;
const button = (label, action, opts = {}) => `<button type="button" class="secondary st-button${opts.hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="st-${action.type}"${opts.disabled ? ' disabled' : ''}>${label}</button>`;
const copyName = k => k === 0 ? 'Red strand' : `Red copy ${word(Math.abs(k))} to the ${k > 0 ? 'right' : 'left'}`;

// A bead: a disc with a hit area. In the room its first spot is a focusable
// control; the spot across the seam and the unrolled view's beads are for
// the pointer. It carries the lattice point it sits on, so a finger slide on
// the portal board starts from it.
function bead(view, key, [x, y], strand, row, opts) {
  const ctl = opts.control ? ` role="button" tabindex="0" aria-label="${esc(`${NAMES[strand]} bead ${row}`)}" data-focus="st-bead-${strand}-${row}"` : ' aria-hidden="true"';
  return `<g class="st-bead ${COLOURS[strand]}${opts.act ? ' act' : ''}${opts.hinted ? ' hinted' : ''}" data-pb-point="${esc(key)}" data-pb-view="${view}" data-st-bead="${strand},${row}"${ctl}><circle class="st-bead-hit" cx="${f(x)}" cy="${f(y)}" r=".44"/><circle class="st-bead-dot" cx="${f(x)}" cy="${f(y)}" r=".22"/></g>`;
}

function roomView(p, C, routes, cross, opts) {
  let under = '', over = '', top = '';
  routes.forEach((xs, i) => { over += roomStrand(C, xs, `st-strand ${COLOURS[i]}`); });
  const A = roomSpotsOf(C, C.a, 0), B = roomSpotsOf(C, C.a, C.M);
  over += A.map(xy => rimMark(xy)).join('') + B.map(xy => rimMark(xy)).join('') + letter([A[0][0], .62], 'A') + letter([B[0][0], -C.M - .3], 'B');
  if (opts.beads) routes.forEach((xs, i) => {
    for (let j = 1; j < C.M; j++) roomSpotsOf(C, xs[j], j).forEach((xy, k) => { top += bead('room', roomKey(C, xs[j], j), xy, i, j, {act: opts.act, control: opts.act && k === 0, hinted: opts.hinted?.strand === i && opts.hinted.row === j}); });
  });
  for (const c of cross) for (const xy of roomSpotsOf(C, c.x, c.t)) top += ring(xy);
  if (opts.target) for (const xy of roomSpotsOf(C, opts.target.x, opts.target.row)) under += `<circle class="st-target" cx="${f(xy[0])}" cy="${f(xy[1])}" r=".32"/>`;
  return roomBoard(C.S, {cls: 'st-room', label: 'Cylinder', slide: Boolean(opts.act), pad: .75, under, over, top});
}
// The unrolled view, cropped to its copies: drawings past its edges are clipped.
function liftView(p, C, opts) {
  const id = `st-clip-${p.id}`, x0 = C.k0 * C.N, x1 = (C.k1 + 1) * C.N;
  const clip = `<clipPath id="${esc(id)}"><rect x="${x0}" y="${f(-C.M - .2)}" width="${x1 - x0}" height="${f(C.M + .4)}"/></clipPath>`;
  return planeBoard(C.S, {
    cls: `st-lift ${opts.cls || ''}`, label: 'Unrolled view', key: `strands-${p.id}`, slide: Boolean(opts.slide), pad: opts.pad ?? .7,
    window: [C.k0, 0, C.k1, C.S.box[3] - 1],
    square: (s, X, Y, copy) => copy[0] === 0 ? 'first' : '',
    under: `${clip}<g clip-path="url(#${esc(id)})">${opts.under || ''}</g>${rims(C)}`, over: opts.over, top: `${opts.clipTop ? `<g clip-path="url(#${esc(id)})">${opts.clipTop}</g>` : ''}${opts.top || ''}`
  });
}
// The copies of a strand that show in the unrolled view.
function copiesOf(C, xs) {
  const lo = Math.min(...xs), hi = Math.max(...xs), x0 = C.k0 * C.N, x1 = (C.k1 + 1) * C.N, out = [];
  for (let k = Math.floor((x0 - hi) / C.N); k <= Math.ceil((x1 - lo) / C.N); k++) if (hi + k * C.N > x0 && lo + k * C.N < x1) out.push(k);
  return out;
}
// The copies' A and B on the rims of the unrolled view.
function rims(C) {
  let out = '';
  for (let k = C.k0; k <= C.k1; k++) {
    const x = C.a + k * C.N;
    out += rimMark([x, 0], k ? 'faint' : '') + rimMark([x, -C.M], 'faint');
  }
  return out + letter([C.a, .62], 'A');
}

function render(p, a) {
  const m = modeOf(p), b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done && m !== 'playground' ? hint(p, b) : null;
  if (m === 'untangle') return renderUntangle(p, b, done, shown?.action);
  if (m === 'design') return renderDesign(p, b, done, shown?.action);
  return renderPlay(p, b);
}
function frame(done, bar, lift, room, told, status) {
  return `<div class="st-puzzle${done ? ' solved' : ''}" data-mechanic-wire="strands">${bar}<div class="st-stage"><div class="st-view st-lift-view">${lift}</div><div class="st-view st-room-view">${room}</div></div>${told ? `<p class="st-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const crossingWords = n => `${n} ${n === 1 ? 'crossing' : 'crossings'}`;

function renderUntangle(p, b, done, act) {
  const q = p.parameters, C = cylOf(q), [xr, xb] = routesOf(p, b), cross = crossings(C, xr, xb);
  const claiming = b.claim !== null && !done, moving = !done && !claiming, walls = barriers(...q.w);
  const hintBead = act?.type === 'bead' ? act : null, target = hintBead ? {x: hintBead.x, row: hintBead.row} : null;
  const room = roomView(p, C, [xr, xb], cross, {beads: true, act: moving, hinted: hintBead, target});
  // The unrolled view: every copy of red, blue from the first A, and where blue crosses the copies.
  let under = '', over = '', hits = '', top = '';
  const shown = copiesOf(C, xr);
  for (const k of shown) if (k !== 0) under += liftStrand(xr, `st-strand red copy${(done || claiming) && b.claim.includes(k) ? ' wall' : ''}`, k * C.N);
  over += liftStrand(xr, `st-strand red${(done || claiming) && b.claim.includes(0) ? ' wall' : ''}`) + liftStrand(xb, 'st-strand blue');
  if (done && walls.length) over += `<circle class="st-end-ring" cx="${f(C.a)}" cy="0" r=".42"/><circle class="st-end-ring" cx="${f(xb[C.M])}" cy="${f(-C.M)}" r=".42"/>`;
  if (claiming) for (const k of shown) {
    const picked = b.claim.includes(k);
    hits += `<g class="st-copy-hit${picked ? ' picked' : ''}${act?.type === 'pick' && act.k === k ? ' hinted' : ''}" role="button" tabindex="0" data-st-copy="${k}" data-focus="st-copy-${k}" aria-label="${esc(copyName(k) + (picked ? ', tapped' : ''))}"${picked ? ' aria-pressed="true"' : ''}>${liftStrand(xr, 'st-copy-line', k * C.N)}</g>`;
  }
  if (moving) [xr, xb].forEach((r, i) => { for (let j = 1; j < C.M; j++) top += bead('plane', `${r[j]},${j}`, [r[j], -j], i, j, {act: true, hinted: hintBead?.strand === i && hintBead.row === j}); });
  if (target) top = `<circle class="st-target" cx="${f(target.x)}" cy="${f(-target.row)}" r=".32"/>` + top;
  for (const c of cross) top += ring([c.x + c.k * C.N, -c.t]);
  const lift = liftView(p, C, {cls: claiming ? 'claiming' : '', slide: moving, under, over, clipTop: hits, top});
  const bar = moving ? `<div class="st-bar">${button('Done', {type: 'done'}, {disabled: b.told === 'fewer', hinted: act?.type === 'done'})}</div>` : '';
  const told = claiming ? 'Tap each red copy that blue must cross.' : b.told === 'fewer' ? 'There is a way with fewer.' : b.told === 'miss' ? 'Blue needn’t cross that one.' : '';
  const status = `${crossingWords(cross.length)}. Red ends at the B ${copyWords(q.w[0])}, blue at the B ${copyWords(q.w[1])}.${told ? ` ${told}` : ''}`;
  return frame(done, bar, lift, room, told, status);
}
const copyWords = k => k === 0 ? 'above A' : `${word(Math.abs(k))} ${Math.abs(k) === 1 ? 'copy' : 'copies'} to the ${k > 0 ? 'right' : 'left'}`;

// Ends: a disc above each strand's B in the unrolled view, side by side where
// ends share a B. The discs are for the pointer (tap one, then a B; or drag
// it along the top rim); the buttons in the bar are the same ends for keys.
export function handleAt(C, ws, i) {
  const same = ws.map((v, k) => v === ws[i] ? k : -1).filter(k => k >= 0), rank = same.indexOf(i);
  return [C.a + ws[i] * C.N + (rank - (same.length - 1) / 2) * .9, -C.M - 1.1];
}
function endMarks(C, ws, opts) {
  let out = '';
  ws.forEach((w, i) => {
    const [x, y] = handleAt(C, ws, i), bx = C.a + w * C.N;
    out += `<line class="st-stem ${COLOURS[i]}" x1="${f(bx)}" y1="${f(-C.M)}" x2="${f(x)}" y2="${f(y + .3)}"/>`;
    out += `<g class="st-end ${COLOURS[i]}${opts.sel === i ? ' chosen' : ''}${opts.hinted === i ? ' hinted' : ''}"><circle class="st-end-dot" cx="${f(x)}" cy="${f(y)}" r=".3"/></g>`;
  });
  if (opts.sel !== null && opts.sel !== undefined) for (let k = C.k0; k <= C.k1; k++) out += `<circle class="st-b-target" cx="${f(C.a + k * C.N)}" cy="${f(-C.M)}" r=".3"/>`;
  if (opts.hintedB !== null && opts.hintedB !== undefined) out += `<circle class="st-target" cx="${f(C.a + opts.hintedB * C.N)}" cy="${f(-C.M)}" r=".42"/>`;
  return out;
}
// The strip above the top rim where the end discs are tapped and dragged.
const band = (C, depth) => `<rect class="st-band" data-st-band="1" x="${C.k0 * C.N}" y="${f(-C.M - 2)}" width="${(C.k1 - C.k0 + 1) * C.N}" height="${f(2 + depth)}" aria-hidden="true"/>`;
function endButtons(ws, opts) {
  const buttons = ws.map((_, i) => {
    const look = `st-end-button ${COLOURS[i]}${opts.hinted === i ? ' hinted' : ''}`;
    if (opts.pick) return `<button type="button" class="${look}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'pick', strand: i}))}" data-focus="st-end-${i}" aria-label="${NAMES[i]} strand"><span class="st-disc"></span></button>`;
    const on = opts.sel === i;
    return `<button type="button" class="${look}${on ? ' chosen' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({sel: on ? null : i}))}" data-st-end="${i}" data-focus="st-end-${i}" aria-pressed="${on}" aria-label="${NAMES[i]} end"><span class="st-disc"></span></button>`;
  }).join('');
  return `<div class="st-ends" role="group" aria-label="${opts.pick ? 'Strands' : 'Ends'}">${buttons}</div>`;
}
const uiState = new Map();
const uiOf = p => { if (!uiState.has(p.id)) uiState.set(p.id, {sel: null}); return uiState.get(p.id); };

function pairChip(q, ws, i) {
  const [x, y] = PAIRS[i], t = q.targets[i], ok = pairCounts(ws)[i] === t;
  return `<span class="st-pair${ok ? ' met' : ''}" role="img" aria-label="${esc(`${NAMES[x]} and ${COLOURS[y]} cross ${t === 0 ? 'not at all' : times(t)}${ok ? ': yes' : ''}`)}"><svg viewBox="0 0 24 24" aria-hidden="true"><line class="st-chip ${COLOURS[x]}" x1="4" y1="21" x2="20" y2="3"/><line class="st-chip ${COLOURS[y]}" x1="4" y1="3" x2="20" y2="21"/></svg><b>${t}</b></span>`;
}
function renderDesign(p, b, done, act) {
  const q = p.parameters, C = cylOf(q), routes = layout(C, b.w), claiming = b.claim && !done, sel = claiming || done ? null : uiOf(p).sel;
  let cross = [];
  PAIRS.forEach(([i, k]) => { cross = cross.concat(crossings(C, routes[i], routes[k])); });
  const room = roomView(p, C, routes, cross, {});
  const hinted = act?.type === 'end' || act?.type === 'pick' ? act.strand : null;
  let over = '';
  // The unrolled view shows where the ends are; the crossings are rung in the room.
  routes.forEach((xs, i) => { over += liftStrand(xs, `st-strand ${COLOURS[i]}`); });
  let marks = '';
  if (b.mid !== null) {
    // After a right Can't: the two inner gaps between ends, and the outer gap they add up to.
    const ends = b.w.map(w => C.a + w * C.N), o = [0, 1, 2].filter(i => i !== b.mid).map(i => ends[i]), lo = Math.min(...o), hi = Math.max(...o), m = ends[b.mid];
    const arc = (x1, x2, h, cls) => x1 === x2 ? '' : `<path class="st-gap ${cls}" d="M${f(x1)},${f(-C.M - .15)} C${f(x1)},${f(-C.M - h)} ${f(x2)},${f(-C.M - h)} ${f(x2)},${f(-C.M - .15)}"/>`;
    marks = arc(lo, m, .9, 'inner') + arc(m, hi, .9, 'inner') + arc(lo, hi, 1.7, 'outer');
    b.w.forEach((w, i) => { marks += `<circle class="st-end-dot ${COLOURS[i]}${i === b.mid ? ' middle' : ''}" cx="${f(ends[i] + (i - 1) * .25)}" cy="${f(-C.M)}" r=".22"/>`; });
  } else marks = endMarks(C, b.w, {sel, hinted, hintedB: act?.type === 'end' ? act.w : null});
  const lift = liftView(p, C, {cls: 'design', pad: 1.6, over: over + marks, top: done ? '' : band(C, 1.2)});
  let bar = `<div class="st-top"><div class="st-pairs">${PAIRS.map((_, i) => pairChip(q, b.w, i)).join('')}</div></div>`;
  if (!done) bar += `<div class="st-bar">${endButtons(b.w, {pick: claiming, sel, hinted})}${claiming ? '' : button('Can’t', {type: 'cant'}, {disabled: !b.tried || b.told === 'way', hinted: act?.type === 'cant'})}</div>`;
  const told = claiming ? 'Tap the strand whose end is in the middle.' : b.told === 'way' ? 'There is a way.' : b.told === 'miss' ? 'Its end isn’t between the other two.' : '';
  const counts = pairCounts(b.w);
  const status = `Red ends at the B ${copyWords(b.w[0])}, blue ${copyWords(b.w[1])}, green ${copyWords(b.w[2])}. ${PAIRS.map(([i, k], n) => `${cap1(COLOURS[i])} and ${COLOURS[k]} cross ${counts[n] === 0 ? 'not at all' : times(counts[n])}`).join('; ')}.${told ? ` ${told}` : ''}`;
  return frame(done, bar, lift, room, told, status);
}
const cap1 = t => t[0].toUpperCase() + t.slice(1);

function renderPlay(p, b) {
  const q = p.parameters, C = cylOf(q), routes = routesOf(p, b), cross = crossings(C, routes[0], routes[1]), sel = uiOf(p).sel;
  const room = roomView(p, C, routes, cross, {beads: true, act: true});
  let under = '', over = '', top = '';
  for (const k of copiesOf(C, routes[0])) if (k !== 0) under += liftStrand(routes[0], 'st-strand red copy', k * C.N);
  over += liftStrand(routes[0], 'st-strand red') + liftStrand(routes[1], 'st-strand blue');
  over += endMarks(C, b.w, {sel: sel !== null && sel < 2 ? sel : null});
  routes.forEach((r, i) => { for (let j = 1; j < C.M; j++) top += bead('plane', `${r[j]},${j}`, [r[j], -j], i, j, {act: true}); });
  for (const c of cross) top += ring([c.x + c.k * C.N, -c.t]);
  const lift = liftView(p, C, {cls: 'design play', slide: true, pad: 1.6, under, over, top: band(C, .4) + top});
  const twist = k => `<button type="button" class="secondary st-button st-twist" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'twist', k}))}" data-focus="st-twist-${k}" aria-label="${k > 0 ? 'Twist right' : 'Twist left'}">${k > 0 ? '↻' : '↺'}</button>`;
  const bar = `<div class="st-bar">${endButtons(b.w, {sel: sel !== null && sel < 2 ? sel : null})}${twist(-1)}${twist(1)}</div>`;
  const status = `${crossingWords(cross.length)}. Red ends at the B ${copyWords(b.w[0])}, blue at the B ${copyWords(b.w[1])}.`;
  return frame(false, bar, lift, room, '', status);
}

// --- Taps, slides and keys ---------------------------------------------------------
// Beads are dragged on the portal board's slides, in either view: each point
// the finger enters moves the bead to that column (in the room, the short way
// round in the direction the finger went), and a bead keeps its row. The
// pointer's own targets here, the copies of red and the strip of end discs,
// go to the nearest copy or disc, not the topmost. One set of document
// listeners serves every board, as on the portal board.
let current = null, gesture = null, held = null, lastTap = -Infinity, listening = false;
const svgPoint = (svg, e) => { const ctm = svg?.getScreenCTM?.(); return ctm ? new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse()) : null; };
// Distance from a point to a polyline of the unrolled view.
function toLine(pt, xs, dx) {
  let best = Infinity;
  for (let j = 0; j + 1 < xs.length; j++) {
    const ax = xs[j] + dx, ay = -j, bx = xs[j + 1] + dx, by = -j - 1, vx = bx - ax, vy = by - ay;
    const t = Math.max(0, Math.min(1, ((pt.x - ax) * vx + (pt.y - ay) * vy) / (vx * vx + vy * vy)));
    best = Math.min(best, Math.hypot(pt.x - ax - t * vx, pt.y - ay - t * vy));
  }
  return best;
}
// The nearest red copy to a point in claim mode, within reach.
function nearestCopy(p, b, pt) {
  const C = cylOf(p.parameters), [xr] = routesOf(p, b);
  let best = null;
  for (const k of copiesOf(C, xr)) { const d = toLine(pt, xr, k * C.N); if (d < 1.1 && (!best || d < best.d)) best = {k, d}; }
  return best?.k ?? null;
}
function nearestEnd(p, b, pt, reach) {
  const C = cylOf(p.parameters);
  let best = null;
  b.w.forEach((_, i) => { const [x, y] = handleAt(C, b.w, i), d = Math.hypot(pt.x - x, pt.y - y); if (d < reach && (!best || d < best.d)) best = {i, d}; });
  return best?.i ?? null;
}
const nearestB = (C, pt) => Math.max(C.k0, Math.min(C.k1, Math.round((pt.x - C.a) / C.N)));

function wire(root, p, api) {
  current = {root, p, api};
  const board = () => api.attempt().board;
  const live = () => !solved(p, board());
  // The bead a slide holds: the one pressed, followed while the board redraws.
  const enter = (view, from, to) => {
    if (!live() || !held || held.pid !== p.id || held.view !== view) return null;
    const {strand, row} = held, C = cylOf(p.parameters), x0 = routesOf(p, board())[strand][row];
    let x;
    if (view === 'plane') x = Number(String(to).split(',')[0]);
    else {
      const a = roomPlace(C, from), b2 = roomPlace(C, to);
      if (!a || !b2) return null;
      const half = Math.floor(C.N / 2), step = mod(b2.col - a.col + half, C.N) - half;
      if (step === 0) return null;
      x = x0 + (step > 0 ? mod(b2.col - x0, C.N) : -mod(x0 - b2.col, C.N));
    }
    if (!int(x) || x === x0) return null;
    const action = {type: 'bead', strand, row, x};
    return move(p, board(), action) ? action : null;
  };
  // Arrow keys: a focused bead moves a column, past a spot the other strand
  // holds; a focused end button moves its end a copy.
  const dir = name => {
    const el = document.activeElement?.closest?.('[data-st-bead],[data-st-end]');
    if (!el || !root.contains(el) || !live() || !['L', 'R'].includes(name)) return null;
    const d = name === 'R' ? 1 : -1, b = board();
    if (el.dataset.stEnd !== undefined) {
      const i = Number(el.dataset.stEnd), action = {type: 'end', strand: i, w: b.w[i] + d};
      return move(p, b, action) ? action : null;
    }
    const [strand, row] = el.dataset.stBead.split(',').map(Number), x0 = routesOf(p, b)[strand][row];
    for (let k = 1; k <= 3; k++) { const action = {type: 'bead', strand, row, x: x0 + d * k}; if (move(p, b, action)) return action; }
    return null;
  };
  wirePortal(root, {point: () => null, enter, dir, settle: () => { held = null; }}, api.apply);
  root.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const beadEl = e.target.closest?.('[data-st-bead]');
    held = beadEl && root.contains(beadEl) ? {pid: p.id, view: beadEl.dataset.pbView, strand: Number(beadEl.dataset.stBead.split(',')[0]), row: Number(beadEl.dataset.stBead.split(',')[1])} : null;
    gesture = null;
    const svg = e.target.closest?.('svg.st-lift'), b = board(), m = modeOf(p);
    if (!svg || !live()) return;
    const pt = svgPoint(svg, e);
    if (!pt) return;
    if (m === 'untangle' && b.claim !== null) gesture = {kind: 'copy', pid: p.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, pt};
    else if (m !== 'untangle' && e.target.closest('[data-st-band]')) gesture = {kind: 'end', pid: p.id, pointer: e.pointerId, x: e.clientX, y: e.clientY, pt, end: m === 'design' && b.claim ? null : nearestEnd(p, b, pt, 1.2), moved: false};
  });
  root.addEventListener('click', e => {
    const el = e.target.closest?.('[data-st-copy]');
    if (!el || !root.contains(el) || performance.now() - lastTap < 700 || !live()) return;
    api.apply({type: 'pick', k: Number(el.dataset.stCopy)});
  });
  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const copy = e.target.closest?.('[data-st-copy]');
    if (copy && ['Enter', ' '].includes(e.key)) { e.preventDefault(); if (live()) api.apply({type: 'pick', k: Number(copy.dataset.stCopy)}); return; }
    // Up and down move between a strand's beads in the room.
    const beadEl = e.target.closest?.('[data-st-bead][role="button"]');
    if (beadEl && ['ArrowUp', 'ArrowDown'].includes(e.key)) {
      const [strand, row] = beadEl.dataset.stBead.split(',').map(Number);
      const next = root.querySelector(`[data-focus="st-bead-${strand}-${row + (e.key === 'ArrowUp' ? 1 : -1)}"]`);
      if (next) { e.preventDefault(); next.focus(); }
    }
  });
  if (!listening) {
    document.addEventListener('pointermove', gestureMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, gestureEnd);
    listening = true;
  }
}
// An end disc dragged along the top rim: its end follows to the nearest B.
function gestureMove(e) {
  const g = gesture;
  if (!g || g.kind !== 'end' || g.end === null || e.pointerId !== g.pointer || !current || current.p.id !== g.pid) return;
  if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) < 8) return;
  g.moved = true;
  const {root, p, api} = current, b = api.attempt().board, pt = svgPoint(root.querySelector('svg.st-lift'), e);
  if (!pt || solved(p, b)) return;
  const action = {type: 'end', strand: g.end, w: nearestB(cylOf(p.parameters), pt)};
  if (b.w[g.end] !== action.w && move(p, b, action)) { uiOf(p).sel = null; api.apply(action); }
}
function gestureEnd(e) {
  held = null;
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  if (e.type !== 'pointerup' || !current || current.p.id !== g.pid) return;
  if (g.moved) { lastTap = performance.now(); return; }
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) >= 12) return;
  lastTap = performance.now();
  const {p, api} = current, b = api.attempt().board;
  if (solved(p, b)) return;
  if (g.kind === 'copy') { const k = nearestCopy(p, b, g.pt); if (k !== null) api.apply({type: 'pick', k}); return; }
  // A tap on the strip: in a claim, the nearest disc is the pick; otherwise
  // a tap chooses the nearest disc, a tap on a disc chooses it instead (or
  // lets it go), and with a disc chosen a tap off the discs moves its end to
  // the nearest B.
  if (modeOf(p) === 'design' && b.claim) { const i = nearestEnd(p, b, g.pt, 1.2); if (i !== null) api.apply({type: 'pick', strand: i}); return; }
  const state = uiOf(p), i = nearestEnd(p, b, g.pt, .5);
  if (state.sel === null || state.sel >= b.w.length) { if (g.end !== null) api.ui({sel: g.end}); return; }
  if (i !== null) { api.ui({sel: i === state.sel ? null : i}); return; }
  const action = {type: 'end', strand: state.sel, w: nearestB(cylOf(p.parameters), g.pt)};
  if (b.w[state.sel] !== action.w && move(p, b, action)) { state.sel = null; api.apply(action); }
}

export const strandMechanics = {
  strands: {
    fresh, valid, solved, move, hint, render, wire, carry,
    ui(p, payload) { if (object(payload) && (payload.sel === null || [0, 1, 2].includes(payload.sel))) uiOf(p).sel = payload.sel; },
    reset(p) { uiState.delete(p.id); },
    // The playground has no goal and no Hint.
    noHint: p => modeOf(p) === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'strands',
  family: {id: 'strands', symbol: '≀'},
  mechanics: strandMechanics,
  pack: new URL('./strands.json', import.meta.url).href,
  css: new URL('./strands.css', import.meta.url).href,
  focus: '.st-copy-hit[role="button"],.st-end-button,.st-bead[role="button"]'
};
