// Portal shields (worksheet Week 70, four shields in a portal room). The room
// is one square whose right edge is glued to its left edge and top to bottom
// by translation: a flat torus. S sits at the corner (all four corners are one
// point) and T at the centre. A shot goes straight from S, through the edges,
// and stops at the first T it reaches. A shield sits on one lattice cross,
// never on S or T, and stops a shot only if the shot passes exactly through
// that cross. The child taps shields onto crosses; the app plays the partner
// and fires a shot that still gets through, drawn in the room and in the
// unrolled view, until none is left.
//
// The room is 8 lattice steps wide, twice the worksheet's 4, so S = (0, 0),
// T = (4, 4) and T's copies are (4 + 8m, 4 + 8n). A shot along a primitive
// direction [a, b] meets the lattice only at its multiples k[a, b]; it reaches
// T exactly when a and b are both odd, first at k = 4, and passes the three
// crosses k = 1, 2, 3 before. The halfway cross 2[a, b] is always one of
// (2, 2), (2, 6), (6, 2), (6, 6), so those four shields stop every shot. The
// four corner shots [±1, ±1] cross only at S and T, so each needs its own
// shield and three are never enough. Without T (shots back to S, first at
// k = 8) the halfway cross 4[a, b] is (4, 0), (0, 4) or (4, 4), and the shots
// along the bottom edge, the left edge and the diagonal cross only at S. With
// T at (4, 0) the halfway crosses are (2, 0), (6, 0), (2, 4) and (6, 4).
//
// A "fewest" claim is checked twice: the shields must stop every shot, and the
// child taps as many shots as there are shields, no two crossing except at S
// and T, so no shield could stop two of them (Lelièvre, Monteil and Weiss,
// "Everything is illuminated", Lemma 12; see docs/shields/README.md).
import {esc} from '../../expansion-controls.js';
import {surfaceOf, shoot, roomBoard, planeBoard, roomXY, roomSpots, wirePortal} from '../../portal-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = Number.isSafeInteger;
export const N = 8;
const md = x => ((x % N) + N) % N;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
export const ROOM = {squares: {o: [0, 0]}, right: {o: 'o'}, up: {o: 'o'}, n: N, lattice: 'crosses'};
let room0 = null;
export const surface = () => room0 ||= surfaceOf(ROOM);
export const crossKey = ([i, j]) => `${i},${j}`;
const keyCross = k => k.split(',').map(Number);
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
// How far from S a tapped copy may be.
export const SHOT_LIMIT = 64;
export const MAX_AIMS = 8;

// --- Shots ----------------------------------------------------------------------
// A shot is a primitive direction [a, b] from S. In a room with target T (or
// none: the shot comes back to S) its fate is the crosses it passes and where
// it first stops: {end: 'T' | 'S', t, crosses}. It depends only on [a, b]
// modulo 8.
const fates = new Map();
export function fate(T, [a, b]) {
  const key = `${T ? crossKey(T) : '-'}|${md(a)},${md(b)}`;
  if (fates.has(key)) return fates.get(key);
  const crosses = [];
  let out = null;
  for (let k = 1; k <= N && !out; k++) {
    const p = [md(k * a), md(k * b)];
    if (T && same(p, T)) out = {end: 'T', t: k, crosses};
    else if (!p[0] && !p[1]) out = {end: 'S', t: k, crosses};
    else crosses.push(crossKey(p));
  }
  fates.set(key, out);
  return out;
}
export const primitive = d => Array.isArray(d) && d.length === 2 && d.every(integer) && Boolean(d[0] || d[1]) && gcd(d[0], d[1]) === 1;
// A shot of this room: it reaches T (or, with no T, comes back to S).
export const isShot = (q, d) => primitive(d) && fate(q.T, d).end === (q.T ? 'T' : 'S');
export const lengthOf = (q, d) => fate(q.T, d).t;
export const endOf = (q, d) => { const t = lengthOf(q, d); return [t * d[0], t * d[1]]; };
// A copy of T (or of S) tapped in the unrolled view, as a plane point [u, v]
// with S at the origin, names the shot aimed at it.
export function isTarget(q, [u, v]) {
  if (!integer(u) || !integer(v) || (!u && !v) || Math.abs(u) > SHOT_LIMIT || Math.abs(v) > SHOT_LIMIT) return false;
  const goal = q.T || [0, 0];
  return md(u) === goal[0] && md(v) === goal[1];
}
export function shotAt(q, at) {
  if (!Array.isArray(at) || at.length !== 2 || !isTarget(q, at)) return null;
  const g = gcd(at[0], at[1]), d = [at[0] / g, at[1] / g];
  return isShot(q, d) ? d : null;
}
// Directions by length, then by angle from the right going round.
const turn = ([a, b]) => { const t = Math.atan2(b, a); return t < 0 ? t + 2 * Math.PI : t; };
const byLength = (p, r) => (p[0] ** 2 + p[1] ** 2) - (r[0] ** 2 + r[1] ** 2) || turn(p) - turn(r);
// Every shot of a room, one per class modulo 8 (the classes decide which
// crosses a shot passes): the shortest direction of each.
const classMemo = new Map();
export function shotClasses(q) {
  const key = q.T ? crossKey(q.T) : '-';
  if (classMemo.has(key)) return classMemo.get(key);
  const dirs = [];
  for (let a = -12; a <= 12; a++) for (let b = -12; b <= 12; b++) if (primitive([a, b])) dirs.push([a, b]);
  dirs.sort(byLength);
  const seen = new Set(), out = [];
  for (const d of dirs) {
    const c = `${md(d[0])},${md(d[1])}`;
    if (seen.has(c) || !isShot(q, d)) continue;
    seen.add(c); out.push(d);
  }
  classMemo.set(key, out);
  return out;
}
// The shots a puzzle is about: its drawn shots, or every shot.
export const shotsOf = q => q.shots || shotClasses(q);
// Where a shot stops among the shields: the index of the first shield it
// meets in its crosses, or -1 when it gets through.
export const stopAt = (q, d, set) => fate(q.T, d).crosses.findIndex(c => set.has(c));
export const shieldSet = shields => new Set(shields.map(crossKey));
export const escaping = (q, shields) => { const set = shieldSet(shields); return shotsOf(q).filter(d => stopAt(q, d, set) < 0); };

// Fewest shields: the smallest sets of crosses that stop every shot, found by
// trying every set of 1, 2, … crosses that lie on some shot.
const fewestMemo = new Map();
const crossOrder = (x, y) => { const [a, b] = [keyCross(x), keyCross(y)]; return a[0] - b[0] || a[1] - b[1]; };
export function fewestSets(q) {
  const key = JSON.stringify([q.T, q.shots || null]);
  if (fewestMemo.has(key)) return fewestMemo.get(key);
  const sets = shotsOf(q).map(d => fate(q.T, d).crosses);
  const cands = [...new Set(sets.flat())].sort(crossOrder);
  let out = null;
  for (let k = 1; k <= 6 && !out; k++) {
    const found = [], pick = [];
    const rec = start => {
      if (pick.length === k) { if (sets.every(s => s.some(c => pick.includes(c)))) found.push(pick.map(keyCross)); return; }
      for (let i = start; i <= cands.length - (k - pick.length); i++) { pick.push(cands[i]); rec(i + 1); pick.pop(); }
    };
    rec(0);
    if (found.length) out = {k, sets: found};
  }
  fewestMemo.set(key, out);
  return out;
}
export const fewestOf = q => fewestSets(q).k;

// Do two shots cross, other than at S and T? Exactly: t[a, b] − s[c, d] is a
// whole number of rooms for some t, s strictly inside both shots.
export function crossings(q, d1, d2) {
  const [L1, L2] = [lengthOf(q, d1), lengthOf(q, d2)], [a, b] = d1, [c, d] = d2;
  const D = b * c - a * d, out = [];
  if (D === 0) {
    // The same shot overlaps itself; opposite shots overlap where t + s is a
    // whole room (8), which needs L1 + L2 > 8. Either way, one point of the
    // overlap is reported.
    if (same(d1, d2)) return [{t: Math.min(L1, L2) / 2, s: Math.min(L1, L2) / 2}];
    if (L1 + L2 <= N) return [];
    const t = (Math.max(0, N - L2) + Math.min(L1, N)) / 2;
    return [{t, s: N - t}];
  }
  const M = Math.floor((L1 * Math.abs(a) + L2 * Math.abs(c)) / N) + 1, K = Math.floor((L1 * Math.abs(b) + L2 * Math.abs(d)) / N) + 1;
  const sg = Math.sign(D), A = Math.abs(D);
  for (let m = -M; m <= M; m++) for (let n = -K; n <= K; n++) {
    const tn = sg * N * (c * n - d * m), sn = sg * N * (a * n - b * m);
    if (tn > 0 && tn < L1 * A && sn > 0 && sn < L2 * A) out.push({t: tn / A, s: sn / A});
  }
  return out;
}
const meetMemo = new Map();
export function meet(q, d1, d2) {
  const key = `${q.T ? crossKey(q.T) : '-'}|${d1}|${d2}`;
  if (!meetMemo.has(key)) meetMemo.set(key, crossings(q, d1, d2).length > 0);
  return meetMemo.get(key);
}

// --- Puzzles ----------------------------------------------------------------------
// parameters: {mode: 'fewest' | 'budget', room, T: [i, j] | null, shots?:
// [[a, b], …], budget?, certificate}. Fewest: stop every shot (the drawn
// ones, or all) with as few shields as can be, then press Fewest and tap as
// many shots as shields, no two crossing. Budget: stop every shot with at most
// `budget` shields, or press Can't and tap budget + 1 shots, no two crossing.
// Playground: {mode: 'playground', room, rooms: {id: {name, T}}}.
//
// The save: {shields, claim, picks, note, fewer, way}. `shields` are crosses
// [i, j] in order. `claim` is null, 'fewest' or 'cant'; `picks` the shots
// tapped since (directions). `note` is null, 'fewer' (Fewest refused: fewer
// shields can do it), 'way' (Can't refused) or {cross: [d1, d2]} (a tapped
// shot d2 crosses the picked d1, so it was not taken). `fewer` is the fewest
// shields Fewest was refused at, and `way` that Can't was refused: Undo keeps
// both, so a claim can't be taken back and asked again.
// Playground save: {room, shields, aims}.
export const playQ = (q, b) => ({...q.rooms[b.room], room: q.room, mode: 'playground'});
const isCross = (q, c) => Array.isArray(c) && c.length === 2 && c.every(x => integer(x) && x >= 0 && x < N) && !(c[0] === 0 && c[1] === 0) && !(q.T && same(c, q.T));
const sortedCrosses = (q, list) => Array.isArray(list) && list.every(c => isCross(q, c)) && list.every((c, k) => k === 0 || crossOrder(crossKey(list[k - 1]), crossKey(c)) < 0);
export const possible = q => q.mode !== 'budget' || fewestOf(q) <= q.budget;
export const needOf = (q, b) => b.claim === 'fewest' ? b.shields.length : q.budget + 1;
export const pickable = (q, d) => primitive(d) && (q.shots ? q.shots.some(s => same(s, d)) : isShot(q, d) && endOf(q, d).every(x => Math.abs(x) <= SHOT_LIMIT));
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
const BOARD = ['shields', 'claim', 'picks', 'note', 'fewer', 'way'];

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {room: Object.keys(q.rooms)[0], shields: [], aims: []};
  return {shields: [], claim: null, picks: [], note: null, fewer: null, way: false};
}
function validPlay(q, b) {
  if (!keysAre(b, ['room', 'shields', 'aims']) || typeof b.room !== 'string' || !Object.hasOwn(q.rooms, b.room)) return false;
  const r = playQ(q, b);
  if (!sortedCrosses(r, b.shields) || !Array.isArray(b.aims) || b.aims.length > MAX_AIMS) return false;
  return b.aims.every((at, k) => shotAt(r, at) && b.aims.findIndex(x => same(x, at)) === k);
}
function valid(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') return validPlay(q, b);
  if (!keysAre(b, BOARD) || !sortedCrosses(q, b.shields)) return false;
  if (q.mode === 'budget' && b.shields.length > q.budget) return false;
  const min = fewestOf(q), blocked = !escaping(q, b.shields).length;
  // The locks a refusal leaves.
  if (b.fewer !== null && !(q.mode === 'fewest' && integer(b.fewer) && b.fewer > min && b.fewer <= N * N)) return false;
  if (typeof b.way !== 'boolean' || (b.way && !(q.mode === 'budget' && possible(q)))) return false;
  // A claim and the shots tapped since.
  if (![null, 'fewest', 'cant'].includes(b.claim) || !Array.isArray(b.picks)) return false;
  if (b.claim === null && b.picks.length) return false;
  if (b.claim === 'fewest' && !(q.mode === 'fewest' && blocked && b.shields.length === min && (b.fewer === null || b.shields.length < b.fewer))) return false;
  if (b.claim === 'cant' && !(q.mode === 'budget' && !possible(q) && b.shields.length >= 1)) return false;
  if (b.claim) {
    if (b.picks.length > needOf(q, b) || !b.picks.every(d => pickable(q, d))) return false;
    for (let x = 0; x < b.picks.length; x++) for (let y = x + 1; y < b.picks.length; y++) if (same(b.picks[x], b.picks[y]) || meet(q, b.picks[x], b.picks[y])) return false;
  }
  // The note says what the last claim or tap was told.
  const n = b.note;
  if (n === null) return true;
  if (n === 'fewer') return q.mode === 'fewest' && b.claim === null && blocked && b.fewer !== null && b.fewer <= b.shields.length;
  if (n === 'way') return q.mode === 'budget' && b.claim === null && b.way;
  if (!keysAre(n, ['cross']) || !Array.isArray(n.cross) || n.cross.length !== 2 || !b.claim) return false;
  const [d1, d2] = n.cross;
  return pickable(q, d1) && pickable(q, d2) && b.picks.some(d => same(d, d1)) && !b.picks.some(d => same(d, d2)) && meet(q, d1, d2);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (b.claim) return b.picks.length === needOf(q, b);
  return q.mode === 'budget' && !escaping(q, b.shields).length;
}

function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q0.mode === 'playground') return movePlay(q0, b, action);
  const q = q0;
  if (action.type === 'shield') {
    // Crosses rest while a claim is open.
    if (b.claim || !isCross(q, action.at)) return null;
    const key = crossKey(action.at), has = b.shields.some(c => crossKey(c) === key);
    if (!has && q.mode === 'budget' && b.shields.length >= q.budget) return null;
    const shields = has ? b.shields.filter(c => crossKey(c) !== key) : [...b.shields, [...action.at]].sort((x, y) => crossOrder(crossKey(x), crossKey(y)));
    return {...b, shields, note: null};
  }
  if (action.type === 'fewest' && q.mode === 'fewest') {
    if (b.claim === 'fewest') return {...b, claim: null, picks: [], note: null};
    if (b.claim || !b.shields.length || escaping(q, b.shields).length || (b.fewer !== null && b.shields.length >= b.fewer)) return null;
    return b.shields.length > fewestOf(q) ? {...b, note: 'fewer', fewer: b.shields.length} : {...b, claim: 'fewest', picks: [], note: null};
  }
  if (action.type === 'cant' && q.mode === 'budget') {
    if (b.claim === 'cant') return {...b, claim: null, picks: [], note: null};
    // Can't comes after an attempt: at least one shield on the board.
    if (b.claim || b.way || !b.shields.length) return null;
    return possible(q) ? {...b, note: 'way', way: true} : {...b, claim: 'cant', picks: [], note: null};
  }
  if (action.type === 'pick') {
    // The copy tapped must be where its shot stops: the first T (or S) on its line.
    const d = b.claim ? shotAt(q, action.at) : null;
    if (!d || !pickable(q, d) || !same(endOf(q, d), action.at)) return null;
    if (b.picks.some(x => same(x, d))) return {...b, picks: b.picks.filter(x => !same(x, d)), note: null};
    const clash = b.picks.find(x => meet(q, x, d));
    if (clash) return {...b, note: {cross: [clash, d]}};
    return {...b, picks: [...b.picks, d], note: null};
  }
  return null;
}
function movePlay(q, b, action) {
  const r = playQ(q, b);
  if (action.type === 'room') return typeof action.room === 'string' && Object.hasOwn(q.rooms, action.room) && action.room !== b.room ? {room: action.room, shields: [], aims: []} : null;
  if (action.type === 'shield') {
    if (!isCross(r, action.at)) return null;
    const key = crossKey(action.at), has = b.shields.some(c => crossKey(c) === key);
    return {...b, shields: has ? b.shields.filter(c => crossKey(c) !== key) : [...b.shields, [...action.at]].sort((x, y) => crossOrder(crossKey(x), crossKey(y)))};
  }
  if (action.type === 'aim') {
    if (!shotAt(r, action.at)) return null;
    if (b.aims.some(x => same(x, action.at))) return {...b, aims: b.aims.filter(x => !same(x, action.at))};
    return {...b, aims: [...b.aims, [...action.at]].slice(-MAX_AIMS)};
  }
  return null;
}
// Undo takes back shields and taps, never a refusal.
function carry(p, from, to) {
  if (p.parameters.mode === 'playground' || !object(to) || !object(from)) return to;
  const kept = {...to, fewer: from.fewer, way: from.way};
  return valid(p, kept) ? kept : to;
}

// --- Words ------------------------------------------------------------------------
const crossWords = ([i, j]) => `${i} across, ${j} up`;
const part = (k, a, b) => k ? `${Math.abs(k)} ${k > 0 ? a : b}` : '';
const copyWords = (X, Y) => !X && !Y ? 'the shaded copy' : `the copy ${[part(X, 'right', 'left'), part(Y, 'up', 'down')].filter(Boolean).join(', ')}`;
const CORNER = {'1,0': 'bottom right', '0,1': 'top left', '1,1': 'top right'};
// A copy of T (or S) in the unrolled view, in words. S is the shaded copy's
// bottom left corner.
export function targetWords(q, [u, v]) {
  if (!q.T) {
    const X = u / N, Y = v / N, near = CORNER[`${X},${Y}`];
    return near ? `the S at the ${near} corner of the shaded copy` : `the S at the bottom left corner of ${copyWords(X, Y)}`;
  }
  const X = (u - q.T[0]) / N, Y = (v - q.T[1]) / N;
  return q.T[1] === 0 ? `the T on the bottom edge of ${copyWords(X, Y)}` : `T in ${copyWords(X, Y)}`;
}

// --- Hints --------------------------------------------------------------------------
// Shields: take off one that the nearest fewest set doesn't use, else put one
// on that it does. Claims: the next shot of a set that crosses only at S and T
// and keeps every shot tapped so far, or drop the last one tapped.
const nearest = (sets, shields) => {
  const have = shieldSet(shields);
  return sets.reduce((best, s) => s.filter(c => have.has(crossKey(c))).length > best.filter(c => have.has(crossKey(c))).length ? s : best);
};
const pick = (q, d, text) => ({type: 'move', action: {type: 'pick', at: endOf(q, d)}, text});
// The shots a hint may name in a claim: the drawn ones, or the shots to the
// copies the unrolled view shows while a claim is open (its first window),
// the certificate first.
const poolMemo = new Map();
export function hintPool(q) {
  if (q.shots) return q.shots;
  const key = JSON.stringify([q.T, q.certificate]);
  if (poolMemo.has(key)) return poolMemo.get(key);
  const out = [...(q.certificate || [])];
  for (const d of allNear(q)) if (!out.some(x => same(x, d))) out.push(d);
  poolMemo.set(key, out);
  return out;
}
const allNear = q => {
  const out = [];
  for (const at of targetsIn(q, BASE)) { const d = shotAt(q, at); if (d && same(endOf(q, d), at) && !out.some(x => same(x, d))) out.push(d); }
  return out;
};
export function extendPicks(q, picks, need) {
  const pool = hintPool(q).filter(d => !picks.some(x => same(x, d)) && !picks.some(x => meet(q, x, d)));
  const chosen = [];
  const rec = start => {
    if (picks.length + chosen.length === need) return true;
    for (let i = start; i < pool.length; i++) {
      if (chosen.some(x => meet(q, x, pool[i]))) continue;
      chosen.push(pool[i]);
      if (rec(i + 1)) return true;
      chosen.pop();
    }
    return false;
  };
  return rec(0) ? chosen : null;
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (b.claim) {
    const more = extendPicks(q, b.picks, needOf(q, b));
    if (more) return pick(q, more[0], `Tap ${targetWords(q, endOf(q, more[0]))}.`);
    const drop = b.picks.at(-1);
    return pick(q, drop, `Tap ${targetWords(q, endOf(q, drop))} again to drop that shot.`);
  }
  const shieldMove = (c, on) => ({type: 'move', action: {type: 'shield', at: c}, text: on ? `Put a shield at ${crossWords(c)}.` : `Take off the shield at ${crossWords(c)}.`});
  if (q.mode === 'budget' && !possible(q)) {
    // Try first; then the reason and Can't.
    if (!b.shields.length) return shieldMove(fewestSets(q).sets[0][0], true);
    return {type: 'move', action: {type: 'cant'}, text: `${q.reason} Press Can’t.`};
  }
  const goal = nearest(fewestSets(q).sets, b.shields), keep = new Set(goal.map(crossKey));
  const extra = b.shields.find(c => !keep.has(crossKey(c)));
  if (extra) return shieldMove(extra, false);
  const have = shieldSet(b.shields), missing = goal.find(c => !have.has(crossKey(c)));
  if (missing) return shieldMove(missing, true);
  return {type: 'move', action: {type: 'fewest'}, text: 'Press Fewest.'};
}

// --- Drawing ------------------------------------------------------------------------
const f = x => Number(x.toFixed(3));
// The unrolled view's window, in copies [X0, Y0, X1, Y1]: S in the middle of
// four by four copies, grown to hold every point given, kept square.
const BASE = [-2, -2, 1, 1];
export function windowFor(points) {
  let [X0, Y0, X1, Y1] = BASE;
  for (const [u, v] of points) {
    X0 = Math.min(X0, Math.floor((u - 1) / N)); X1 = Math.max(X1, Math.floor((u + 1) / N));
    Y0 = Math.min(Y0, Math.floor((v - 1) / N)); Y1 = Math.max(Y1, Math.floor((v + 1) / N));
  }
  while (X1 - X0 < Y1 - Y0) { if ((X1 - X0) % 2) X0--; else X1++; }
  while (Y1 - Y0 < X1 - X0) { if ((Y1 - Y0) % 2) Y0--; else Y1++; }
  return [X0, Y0, X1, Y1];
}
// The copies of T (or of S) inside a window, at least one step from its edge.
export function targetsIn(q, [X0, Y0, X1, Y1]) {
  const goal = q.T || [0, 0], out = [];
  for (let X = X0 - 1; X <= X1 + 1; X++) for (let Y = Y0 - 1; Y <= Y1 + 1; Y++) {
    const u = X * N + goal[0], v = Y * N + goal[1];
    if (u > X0 * N && u < (X1 + 1) * N && v > Y0 * N && v < (Y1 + 1) * N && (u || v)) out.push([u, v]);
  }
  return out;
}
// One shot from S for `length` steps of its direction: in the room broken at
// the edges (with a dot where it leaves and comes back in), in the plane one
// line.
function roomShot(S, d, length, cls) {
  const {pieces} = shoot(S, {s: 'o', i: 0, j: 0}, d, {length});
  let lines = '', dots = '';
  pieces.forEach((pc, k) => {
    const [x1, y1] = roomXY(S, 'o', ...pc.a), [x2, y2] = roomXY(S, 'o', ...pc.b);
    lines += `<line class="sh-shot ${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
    if (k > 0) dots += `<circle class="sh-portal ${cls}" cx="${f(x1)}" cy="${f(y1)}" r=".09"/>`;
    if (k < pieces.length - 1) dots += `<circle class="sh-portal ${cls}" cx="${f(x2)}" cy="${f(y2)}" r=".09"/>`;
  });
  return lines + dots;
}
const planeShot = (d, length, cls) => `<line class="sh-shot ${cls}" x1="0" y1="0" x2="${f(d[0] * length)}" y2="${f(-d[1] * length)}"/>`;
const cross = ([x, y], size, cls = '') => `<path class="sh-shield ${cls}" d="M${f(x - size)},${f(y - size)}L${f(x + size)},${f(y + size)}M${f(x - size)},${f(y + size)}L${f(x + size)},${f(y - size)}"/>`;
const PICK = ['k0', 'k1', 'k2', 'k3', 'k4'];

function render(p, a) {
  const q0 = p.parameters, b = a.board, play = q0.mode === 'playground', q = play ? playQ(q0, b) : q0, S = surface();
  const done = !play && solved(p, b), live = !done;
  const shown = !play && live && a.hintLevel >= 2 ? hint(p, b) : null, act = shown?.type === 'move' ? shown.action : null;
  const set = shieldSet(b.shields), claim = play ? null : b.claim;
  const full = !play && q.mode === 'budget' && b.shields.length >= q.budget;
  // The shots to draw, each {d, length, cls}.
  const shots = [];
  let escapes = [];
  if (play) {
    for (const at of b.aims) { const d = shotAt(q, at), k = stopAt(q, d, set); shots.push({d, length: k < 0 ? lengthOf(q, d) : k + 1, cls: k < 0 ? 'escape' : 'stopped'}); }
  } else if (claim || done) {
    if (q.shots) for (const d of q.shots) shots.push({d, length: lengthOf(q, d), cls: 'faint'});
    b.picks.forEach((d, k) => shots.push({d, length: lengthOf(q, d), cls: `picked ${PICK[k]}`}));
    if (b.note?.cross) shots.push({d: b.note.cross[1], length: lengthOf(q, b.note.cross[1]), cls: 'refused'});
  } else {
    escapes = escaping(q, b.shields);
    if (q.shots) for (const d of q.shots) {
      const k = stopAt(q, d, set);
      shots.push({d, length: lengthOf(q, d), cls: 'faint'});
      shots.push({d, length: k < 0 ? lengthOf(q, d) : k + 1, cls: k < 0 ? 'escape' : 'stopped'});
    } else if (escapes.length) shots.push({d: escapes[0], length: lengthOf(q, escapes[0]), cls: 'escape'});
  }
  // Each shield of a solve, ringed in the colour of the tapped shot it stops.
  const ringOf = c => { if (!b.picks?.length || !claim) return ''; const k = b.picks.findIndex(d => fate(q.T, d).crosses.includes(crossKey(c))); return k >= 0 ? PICK[k] : ''; };
  const crossings2 = b.note?.cross ? crossings(q, ...b.note.cross) : [];

  // The room.
  const goalSpots = q.T ? roomSpots(S, {s: 'o', i: q.T[0], j: q.T[1]}) : [];
  // Every cross of the room as a small dot, so the places a shield can go show.
  let under = '', over = '';
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) under += `<circle class="sh-dot" cx="${i}" cy="${-j}" r=".07"/>`;
  for (const s of shots) over += roomShot(S, s.d, s.length, s.cls);
  for (const c of b.shields) for (const xy of roomSpots(S, {s: 'o', i: c[0], j: c[1]})) over += cross(xy, .26, ringOf(c)) + (done && ringOf(c) ? `<circle class="sh-ring ${ringOf(c)}" cx="${f(xy[0])}" cy="${f(xy[1])}" r=".42"/>` : '');
  for (const {t} of crossings2) { const [x, y] = [md(t * b.note.cross[0][0]), md(t * b.note.cross[0][1])]; over += `<circle class="sh-clash" cx="${f(x)}" cy="${f(-y)}" r=".38"/>`; }
  for (const [x, y] of [[0, 0], [N, 0], [0, -N], [N, -N]]) over += `<circle class="sh-s" cx="${x}" cy="${y}" r=".16"/>`;
  for (const [x, y] of goalSpots) over += `<circle class="sh-t" cx="${f(x)}" cy="${f(y)}" r=".22"/>`;
  let labels = '';
  for (const [x, y, dx, dy] of [[0, 0, -.42, .5], [N, 0, .42, .5], [0, -N, -.42, -.22], [N, -N, .42, -.22]]) labels += `<text class="sh-label" x="${f(x + dx)}" y="${f(y + dy)}">S</text>`;
  for (const [x, y] of goalSpots) labels += `<text class="sh-label" x="${f(x + .52)}" y="${f(y - .3)}">T</text>`;
  const hintAt = act?.type === 'shield' ? crossKey(act.at) : null;
  const roomLook = pt => {
    const c = [pt.i, pt.j], k = crossKey(c);
    if ((!pt.i && !pt.j) || (q.T && same(c, q.T))) return {cls: 'fixed'};
    const has = set.has(k), can = live && !claim && (has || !full);
    // Neighbouring tap discs touch but never overlap.
    return {act: can, r: .5, label: `${crossWords(c)}${has ? ', shield' : ''}`, cls: [has ? 'shield' : '', hintAt === k ? 'hinted' : ''].filter(Boolean).join(' ')};
  };
  const room = roomBoard(S, {cls: 'sh-room', label: 'Portal room', pad: .75, point: roomLook, under, over: over + labels});

  // The unrolled view.
  const ends = shots.map(s => [s.d[0] * s.length, s.d[1] * s.length]);
  const window = windowFor(play ? [...ends, ...b.aims] : ends);
  const [X0, Y0, X1, Y1] = window, goal = q.T || [0, 0];
  const pickables = new Set(), picked = new Map();
  // In a claim the copies to tap are where shots stop: the drawn shots' ends,
  // or every copy in view that is the first T (or S) on its line from S.
  if (!play && claim && live) for (const at of (q.shots ? q.shots.map(d => endOf(q, d)) : targetsIn(q, window).filter(at => { const d = shotAt(q, at); return d && same(endOf(q, d), at); }))) pickables.add(`${at[0]},${at[1]}`);
  if (!play && claim) b.picks.forEach((d, k) => picked.set(crossKey(endOf(q, d)), PICK[k]));
  const aimable = play ? new Set(targetsIn(q, window).map(crossKey)) : null;
  const hintPick = act?.type === 'pick' ? crossKey(act.at) : null;
  const planeLook = pt => {
    const k = `${pt.u},${pt.v}`, isGoal = md(pt.u) === goal[0] && md(pt.v) === goal[1] && (pt.u || pt.v);
    if (!isGoal) return {};
    const tap = play ? aimable.has(k) : pickables.has(k);
    const aimed = play && b.aims.some(x => crossKey(x) === k);
    const [X, Y] = [Math.floor((pt.u - goal[0]) / N), Math.floor((pt.v - goal[1]) / N)];
    const words = targetWords(q, [pt.u, pt.v]);
    return tap ? {act: true, r: 2.3, label: `${words.charAt(0).toUpperCase()}${words.slice(1)}${picked.has(k) || aimed ? ', chosen' : ''}`, cls: ['pick', picked.get(k) || '', aimed ? 'aimed' : '', hintPick === k ? 'hinted' : ''].filter(Boolean).join(' ')} : {cls: X === 0 && Y === 0 ? 'first' : ''};
  };
  let pUnder = '', pOver = '';
  for (let X = X0; X <= X1 + 1; X++) for (let Y = Y0; Y <= Y1 + 1; Y++) {
    const [x, y] = [X * N, -Y * N];
    pOver += `<circle class="sh-s${!X && !Y ? ' home' : ''}" cx="${x}" cy="${y}" r="${!X && !Y ? .55 : .32}"/>`;
    if (q.T) { const [u, v] = [X * N + q.T[0], Y * N + q.T[1]]; if (u <= (X1 + 1) * N && v <= (Y1 + 1) * N) pOver += `<circle class="sh-t" cx="${u}" cy="${-v}" r=".55"/>`; }
    // A shield is on its cross in every copy; the copies other than the room itself are lighter.
    for (const c of b.shields) { const [u, v] = [X * N + c[0], Y * N + c[1]]; if (u <= (X1 + 1) * N && v <= (Y1 + 1) * N) pUnder += cross([u, -v], .5, [ringOf(c), u >= 0 && u <= N && v >= 0 && v <= N ? '' : 'copy'].filter(Boolean).join(' ')); }
  }
  for (const s of shots) pOver += planeShot(s.d, s.length, s.cls);
  for (const {t, s: s2} of crossings2) {
    const [d1, d2] = b.note.cross;
    pOver += `<circle class="sh-clash" cx="${f(t * d1[0])}" cy="${f(-t * d1[1])}" r=".9"/><circle class="sh-clash" cx="${f(s2 * d2[0])}" cy="${f(-s2 * d2[1])}" r=".9"/>`;
  }
  pOver += `<text class="sh-label plane" x="-1.3" y="1.9">S</text>`;
  const plane = planeBoard(S, {cls: 'sh-plane', label: 'Unrolled view', key: `shields-${p.id}`, window, point: planeLook, square: (s, X, Y, copy) => copy[0] === 0 && copy[1] === 0 ? 'first' : '', under: pUnder, over: pOver, pad: .6});

  // Controls and words.
  let bar = '';
  if (play) {
    bar = `<div class="sh-rooms" role="group" aria-label="Room">${Object.entries(q0.rooms).map(([id, r]) => `<button type="button" class="secondary sh-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'room', room: id}))}" data-focus="sh-room-${id}" aria-pressed="${b.room === id}" aria-label="${esc(r.name)}">${miniRoom(r)}</button>`).join('')}</div>`;
  } else if (live) {
    const kind = q.mode === 'fewest' ? 'fewest' : 'cant', on = claim === kind;
    const enabled = on || (q.mode === 'fewest' ? b.shields.length > 0 && !escapes.length && (b.fewer === null || b.shields.length < b.fewer) : b.shields.length > 0 && !b.way);
    bar = `<div class="sh-bar"><button type="button" class="secondary sh-button${act?.type === kind ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: kind}))}" data-focus="sh-${kind}${on ? '-on' : ''}" aria-pressed="${on}" ${enabled ? '' : 'disabled'}>${kind === 'fewest' ? 'Fewest' : 'Can’t'}</button></div>`;
  }
  const need = claim ? needOf(q, b) : 0;
  const prompt = claim && live ? `Tap ${need} shots that cross only at ${q.T ? 'S and T' : 'S'}.` : '';
  const told = b.note === 'fewer' ? 'Fewer can do it.' : b.note === 'way' ? 'There is a way.' : b.note?.cross ? 'Those two cross.' : '';
  const status = play
    ? `${b.shields.length} ${b.shields.length === 1 ? 'shield' : 'shields'}. ${shots.map(s => s.cls === 'escape' ? 'A shot reaches its target.' : 'A shot stops at a shield.').join(' ')}`
    : `${b.shields.length} ${b.shields.length === 1 ? 'shield' : 'shields'}${b.shields.length ? `: ${b.shields.map(crossWords).join('; ')}` : ''}. ${claim ? `${b.picks.length} of ${need} shots tapped.` : escapes.length ? `The shot to ${targetWords(q, endOf(q, escapes[0]))} gets through.` : 'No shot gets through.'}${told ? ` ${told}` : ''}`;
  const stage = `<div class="sh-stage"><div class="sh-view sh-room-view">${room}</div><div class="sh-view sh-plane-view">${plane}</div></div>`;
  return `<div class="sh-puzzle${done ? ' solved' : ''}${claim ? ' claiming' : ''}" data-mechanic-wire="shields">${bar}${prompt ? `<p class="sh-prompt">${esc(prompt)}</p>` : ''}${stage}${told ? `<p class="sh-told">${esc(told)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A small picture of a room for the playground's buttons: S at the corners, T.
function miniRoom(r) {
  const t = r.T ? `<circle class="sh-t" cx="${r.T[0]}" cy="${-r.T[1]}" r=".7"/>${r.T[1] === 0 ? `<circle class="sh-t" cx="${r.T[0]}" cy="${-N}" r=".7"/>` : ''}` : '';
  return `<svg class="sh-mini" viewBox="-1 -9 10 10" role="img" aria-label="${esc(r.name)}"><rect class="sh-mini-room" x="0" y="-8" width="8" height="8"/>${[[0, 0], [8, 0], [0, -8], [8, -8]].map(([x, y]) => `<circle class="sh-s" cx="${x}" cy="${y}" r=".6"/>`).join('')}${t}</svg>`;
}

function wire(root, p, api) {
  const play = p.parameters.mode === 'playground';
  wirePortal(root, {
    point: (view, at) => {
      if (!play && solved(p, api.attempt().board)) return null;
      const [x, y, z] = at.split(',');
      if (view === 'room') return {type: 'shield', at: [Number(y), Number(z)]};
      return {type: play ? 'aim' : 'pick', at: [Number(x), Number(y)]};
    }
  }, api.apply);
}

export const shieldMechanics = {
  shields: {
    fresh, valid, solved, move, hint, render, wire, carry,
    ui() {},
    // The playground has no goal and no Hint.
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'shields',
  family: {id: 'shields', symbol: '⊠'},
  mechanics: shieldMechanics,
  pack: new URL('./shields.json', import.meta.url).href,
  css: new URL('./shields.css', import.meta.url).href,
  focus: '.sh-room .pb-point.act,.sh-plane .pb-point.act'
};
