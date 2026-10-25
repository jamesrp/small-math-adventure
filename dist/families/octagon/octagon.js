// Octagon streets (worksheet Week 65, hyperbolic octagon streets). A robot
// walks the roads of a floor. On the octagon floor every room is an eight-sided
// block with right-angled corners and four rooms meet at every dot: the {8,4}
// tiling of the hyperbolic plane, drawn in the Poincaré disk and recentred on
// the robot. Beside it is the square floor, the {4,4} tiling, for contrast.
//
// A move turns left, goes straight or turns right at the robot's dot and then
// walks one road to the next dot; the robot never turns round. The robot's
// place and heading is an element of the floor's rotation group
//   G = < T, H | T^4 = H^2 = (TH)^p = 1 >,  p = 8 (octagons) or 4 (squares),
// where T turns the robot a quarter turn left on its dot and H takes it to the
// other end of the road it faces, facing back. The group acts simply and
// transitively on (dot, heading) pairs, so the robot's state is exactly a
// group element. A move is a word: L = T·F, S = F, R = T⁻¹·F with F = H·T².
// The app keeps the walk as its letters and reduces the word to a normal form
// with a finite complete rewriting system (Knuth–Bendix, shortlex), so "home
// facing the same way" is decided by the word reducing to the empty word,
// never by drawn positions. The drawing uses floating-point Möbius maps only
// to show where things are.
//
// Facts the puzzles rest on (validated in scripts/validate-octagon.mjs by
// exact Z[√2] matrices of the triangle group, a different method):
// - On octagons, home facing the same way takes 8 moves at least (round one
//   room); 14 is next (round two rooms); 2, 4, 6, 10 and 12 are impossible,
//   and every odd number is impossible on both floors (every road joins a
//   light dot to a dark one). On squares 4 and 6 work.
// - A fence (a walk home facing the same way that never uses a dot twice)
//   round n rooms has left turns − right turns = 4 + 4n on octagons and 4 on
//   squares (Gauss–Bonnet), so two rooms take 12 left turns at least.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const KINDS = ['oct', 'sq'];
export const SIDES = {oct: 8, sq: 4};
export const TURNS = ['L', 'S', 'R'];
export const MOVE = {L: 'THTT', S: 'HTT', R: 'tHTT'};
export const TURN = {L: 'T', S: '', R: 't'};
export const FENCE_CAP = 30;
export const PLAY_CAP = 60;
export const WORD_CAP = 400;

// --- The rewriting system ---------------------------------------------------
// Knuth–Bendix completion of T^4, H^2, (TH)^p with shortlex order T < t < H
// gives these eight rules for both floors (k = p / 2). tests/octagon.test.mjs
// checks that every critical pair resolves (so with shortlex termination the
// system is confluent) and the validator checks each rule in matrices.
export function rulesFor(p) {
  const k = p / 2;
  return [['HH', ''], ['Tt', ''], ['tT', ''], ['tt', 'TT'], ['TTT', 't'],
    ['HT'.repeat(k), 'tH'.repeat(k)], ['Ht'.repeat(k), 'TH'.repeat(k)], ['Ht'.repeat(k - 1) + 'HTT', 'TH'.repeat(k) + 't']];
}
const RULES = {oct: rulesFor(8), sq: rulesFor(4)};
const caches = {oct: new Map(), sq: new Map()};
// The normal form of a word: letters are pushed onto an irreducible stack, and
// a rule's left side at the top of the stack is replaced by its right side,
// whose letters are pushed in turn.
export function reduce(kind, word) {
  const cache = caches[kind];
  const hit = cache.get(word);
  if (hit !== undefined) return hit;
  const rules = RULES[kind], out = [];
  const push = c => {
    out.push(c);
    for (const [l, r] of rules) {
      const n = l.length, m = out.length;
      if (m < n) continue;
      let ok = true;
      for (let i = 0; i < n; i++) if (out[m - n + i] !== l[i]) { ok = false; break; }
      if (ok) { out.length = m - n; for (const d of r) push(d); return; }
    }
  };
  for (const c of word) push(c);
  const nf = out.join('');
  if (cache.size > 60000) cache.clear();
  cache.set(word, nf);
  return nf;
}
export const inverse = w => [...w].reverse().map(c => c === 'T' ? 't' : c === 't' ? 'T' : c).join('');
const shortlex = (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
const least = list => list.reduce((x, y) => shortlex(x, y) <= 0 ? x : y);
export const isWord = w => typeof w === 'string' && w.length <= WORD_CAP && /^[TtH]*$/.test(w);
export const isWalk = w => typeof w === 'string' && /^[LSR]*$/.test(w);
export const expand = walk => [...walk].map(m => MOVE[m]).join('');
// Keys: two states are at the same dot when they differ by a turn on the dot,
// on the same road when they differ by H, and see the same room on their front
// left when they differ by a power of H·T⁻¹ (one step round that room).
export const stateOf = (kind, walk) => reduce(kind, expand(walk));
export const dotKey = (kind, g) => least(['', 'T', 'TT', 't'].map(x => reduce(kind, g + x)));
export const roadKey = (kind, g) => least([reduce(kind, g), reduce(kind, g + 'H')]);
export function roomKey(kind, g) {
  const out = [];
  let e = reduce(kind, g);
  for (let j = 0; j < SIDES[kind]; j++) { out.push(e); e = reduce(kind, e + 'Ht'); }
  return least(out);
}
// The corners of a room, in order: the states that walk round it.
export function roomEdges(kind, g) {
  const out = [];
  let e = reduce(kind, g);
  for (let j = 0; j < SIDES[kind]; j++) { out.push(e); e = reduce(kind, e + 'Ht'); }
  return out;
}
// A dot's colour: every H changes it and the relations have even H counts.
export const colourOf = g => [...g].filter(c => c === 'H').length % 2;

// --- Walks ------------------------------------------------------------------
// trace: the states after each move (states[0] is home), the road walked by
// each move (the state after turning, before stepping) and each dot's key.
const traces = {oct: new Map(), sq: new Map()};
export function trace(kind, walk) {
  const cache = traces[kind];
  if (cache.has(walk)) return cache.get(walk);
  let t;
  if (!walk.length) t = {states: [''], roads: [], dots: [dotKey(kind, '')]};
  else {
    const prev = trace(kind, walk.slice(0, -1)), m = walk.at(-1), g = prev.states.at(-1);
    const road = reduce(kind, g + TURN[m]), next = reduce(kind, road + 'HTT');
    t = {states: [...prev.states, next], roads: [...prev.roads, road], dots: [...prev.dots, dotKey(kind, next)]};
  }
  if (cache.size > 4000) cache.clear();
  cache.set(walk, t);
  return t;
}
export const atHome = (kind, walk) => trace(kind, walk).states.at(-1) === '';
export const lefts = walk => [...walk].filter(m => m === 'L').length;
export const rights = walk => [...walk].filter(m => m === 'R').length;
// A fence walk never comes back to a dot, except home at its last move.
export function fenceEnded(kind, walk) {
  const {dots} = trace(kind, walk);
  return walk.length > 0 && dots.at(-1) === dots[0];
}
export function fenceLegal(kind, walk) {
  const {dots} = trace(kind, walk);
  for (let k = 1; k < dots.length; k++) {
    if (dots[k] === dots[0]) { if (k !== dots.length - 1) return false; continue; }
    if (dots.indexOf(dots[k]) !== k) return false;
  }
  return true;
}
// The rooms inside a closed fence: flood from the rooms on the walk's left,
// never crossing the fence; if the fill runs past the walk's length the left
// side is the outside, and the inside is on the right.
const insides = {oct: new Map(), sq: new Map()};
export function inside(kind, walk) {
  const cache = insides[kind];
  if (cache.has(walk)) return cache.get(walk);
  const {roads} = trace(kind, walk), fence = new Set(roads.map(r => roadKey(kind, r)));
  // No closed fence of this length holds more rooms: on octagons n ≤ (length − 4) / 4
  // (Gauss–Bonnet), on squares at most (length / 4)².
  const bound = kind === "sq" ? Math.ceil((walk.length / 4) ** 2) + 2 : walk.length + 2;
  const fill = seeds => {
    const seen = new Map(), queue = [];
    for (const s of seeds) { const k = roomKey(kind, s); if (!seen.has(k)) { seen.set(k, s); queue.push(s); } }
    for (let i = 0; i < queue.length; i++) {
      if (seen.size > bound) return null;
      for (const e of roomEdges(kind, queue[i])) {
        if (fence.has(roadKey(kind, e))) continue;
        const across = reduce(kind, e + 'H'), k = roomKey(kind, across);
        if (!seen.has(k)) { seen.set(k, across); queue.push(across); }
      }
    }
    return seen;
  };
  const left = fill(roads);
  const rooms = left || fill(roads.map(r => reduce(kind, r + 'H')));
  const out = {ccw: Boolean(left), rooms: rooms ? [...rooms.keys()] : []};
  cache.set(walk, out);
  return out;
}

// --- Goals -------------------------------------------------------------------
// A floor's goal: home in exactly n moves, or a fence round the flowers with
// at most maxLeft left turns and maxRight right turns (null for no limit).
export const flowerKeys = (kind, q) => (q.flowers || []).map(w => roomKey(kind, reduce(kind, w)));
export function fenceOk(kind, q, walk) {
  if (!walk.length || !atHome(kind, walk) || !fenceLegal(kind, walk)) return false;
  if (q.maxLeft !== null && q.maxLeft !== undefined && lefts(walk) > q.maxLeft) return false;
  if (q.maxRight !== null && q.maxRight !== undefined && rights(walk) > q.maxRight) return false;
  const rooms = new Set(inside(kind, walk).rooms);
  return flowerKeys(kind, q).every(k => rooms.has(k));
}
export const goalMet = (kind, q, walk) => q.mode === 'home' ? walk.length === q.moves && atHome(kind, walk) : q.mode === 'fence' ? fenceOk(kind, q, walk) : false;
// What Can't asks the child to tap: on a home goal of even length, the dot the
// walk reached after half its moves ('dot'); of odd length, every dot of the
// walk other than home that shares home's colour ('dots'). A fence's Can't is
// pressed alone (null): its reason, left − right = 4 + 4n, is about every
// fence at once, so no part of one walk can be pointed at.
export const tapKind = q => q.mode === 'home' ? (q.moves % 2 ? 'dots' : 'dot') : null;
const capOf = q => q.mode === 'home' ? q.moves : q.mode === 'fence' ? FENCE_CAP : PLAY_CAP;
// Whether a move is allowed after this walk on this floor.
export function canGo(kind, q, walk, m) {
  if (!TURNS.includes(m) || walk.length >= capOf(q)) return false;
  if (q.mode !== 'fence') return true;
  if (fenceEnded(kind, walk)) return false;
  if (m === 'L' && q.maxLeft !== null && q.maxLeft !== undefined && lefts(walk) >= q.maxLeft) return false;
  if (m === 'R' && q.maxRight !== null && q.maxRight !== undefined && rights(walk) >= q.maxRight) return false;
  return fenceLegal(kind, walk + m);
}
// A try is finished when the walk can't go on: every home move made, or a
// fence that is closed, stuck, or out of left turns.
export function spent(kind, q, walk) {
  if (q.mode === 'home') return walk.length === q.moves;
  if (fenceEnded(kind, walk)) return true;
  if (q.maxLeft !== null && q.maxLeft !== undefined && lefts(walk) >= q.maxLeft && walk.length) return true;
  return walk.length > 0 && !TURNS.some(m => canGo(kind, q, walk, m));
}
// A try Can't may follow: a finished one, and under a left-turn budget one
// that has used every left turn (the ↰ chips are gone). A fence round one
// flower, or one that is stuck, leaves turns over and says nothing about the
// budget, so it doesn't open Can't; on both floors alike, so this tells
// nothing about which floor has a fence.
const budgeted = q => q.mode === 'fence' && Number.isInteger(q.maxLeft);
export const tried = (kind, q, walk) => budgeted(q) ? walk.length > 0 && lefts(walk) >= q.maxLeft : spent(kind, q, walk);

// --- Drawing geometry (floating point, for the picture only) -----------------
// Octagons: Möbius maps of the unit disk, z → (a z + b) / (b̄ z + ā), stored as
// {a: [re, im], b: [re, im]}. Squares: z → a z + b with |a| = 1, stored the
// same way with a flag. In the robot's own frame it stands at 0 facing +x.
const cmul = (u, v) => [u[0] * v[0] - u[1] * v[1], u[0] * v[1] + u[1] * v[0]];
const cadd = (u, v) => [u[0] + v[0], u[1] + v[1]];
const cbar = u => [u[0], -u[1]];
const cdiv = (u, v) => { const n = v[0] * v[0] + v[1] * v[1]; return [(u[0] * v[0] + u[1] * v[1]) / n, (u[1] * v[0] - u[0] * v[1]) / n]; };
const norm2 = z => z[0] * z[0] + z[1] * z[1];
export const ID = {a: [1, 0], b: [0, 0]};
function compose(kind, M, N) {
  if (kind === 'sq') return {a: cmul(M.a, N.a), b: cadd(cmul(M.a, N.b), M.b)};
  const R = {a: cadd(cmul(M.a, N.a), cmul(M.b, cbar(N.b))), b: cadd(cmul(M.a, N.b), cmul(M.b, cbar(N.a)))};
  const s = Math.sqrt(Math.max(1e-300, norm2(R.a) - norm2(R.b)));
  return {a: [R.a[0] / s, R.a[1] / s], b: [R.b[0] / s, R.b[1] / s]};
}
export function apply(kind, M, z) {
  if (kind === 'sq') return cadd(cmul(M.a, z), M.b);
  return cdiv(cadd(cmul(M.a, z), M.b), cadd(cmul(cbar(M.b), z), cbar(M.a)));
}
const invert = (kind, M) => kind === 'sq' ? {a: cbar(M.a), b: cmul([-1, 0], cmul(cbar(M.a), M.b))} : {a: cbar(M.a), b: [-M.b[0], -M.b[1]]};
const rot = t => ({a: [Math.cos(t / 2), Math.sin(t / 2)], b: [0, 0]});
const rotSq = t => ({a: [Math.cos(t), Math.sin(t)], b: [0, 0]});
// Octagon roads: half a road is the side opposite the angle π/8 in a right
// triangle with angles π/8 (at a room's centre) and π/4 (at a corner), so
// cosh(ℓ/2) = cos(π/8) / sin(π/4) and a neighbour sits at tanh(ℓ/2) ≈ 0.64
// from the middle of the disk. Square roads: 0.36.
export const EDGE = 2 * Math.acosh(Math.cos(Math.PI / 8) / Math.sin(Math.PI / 4));
export const SQ_EDGE = 0.36;
const push = L => ({a: [Math.cosh(L / 2), 0], b: [Math.sinh(L / 2), 0]});
const GEN = {
  oct: {T: rot(Math.PI / 2), t: rot(-Math.PI / 2), H: compose('oct', push(EDGE), rot(Math.PI))},
  sq: {T: rotSq(Math.PI / 2), t: rotSq(-Math.PI / 2), H: {a: [-1, 0], b: [SQ_EDGE, 0]}}
};
const maps = {oct: new Map(), sq: new Map()};
export function mapOf(kind, word) {
  const cache = maps[kind];
  if (cache.has(word)) return cache.get(word);
  const M = word.length ? compose(kind, mapOf(kind, word.slice(0, -1)), GEN[kind][word.at(-1)]) : ID;
  if (cache.size > 20000) cache.clear();
  cache.set(word, M);
  return M;
}
export const pointOf = (kind, word) => apply(kind, mapOf(kind, word), [0, 0]);
// The translation taking 0 to z.
const toward = (kind, z) => {
  if (kind === 'sq') return {a: [1, 0], b: z};
  const s = 1 / Math.sqrt(Math.max(1e-12, 1 - norm2(z)));
  return {a: [s, 0], b: [z[0] * s, z[1] * s]};
};
// After a pan, move the anchor to whichever dot is drawn nearest the middle,
// so the frame never holds a long product.
export function settle(kind, view) {
  let {anchor, frame} = view;
  for (let guard = 0; guard < 64; guard++) {
    const here = norm2(apply(kind, frame, [0, 0]));
    let best = null;
    for (const x of ['H', 'TH', 'TTH', 'tH']) {
      const fr = compose(kind, frame, mapOf(kind, x)), d = norm2(apply(kind, fr, [0, 0]));
      if (d < here - 1e-9 && (!best || d < best.d)) best = {x, fr, d};
    }
    if (!best) break;
    anchor = reduce(kind, anchor + best.x);
    frame = best.fr;
  }
  return {anchor, frame};
}
export function panned(kind, view, z0, z1) {
  const frame = compose(kind, compose(kind, toward(kind, z1), invert(kind, toward(kind, z0))), view.frame);
  return settle(kind, {anchor: view.anchor, frame});
}
// The dots and roads round an anchor, out while they are still visible.
const patches = {};
function patchOf(kind) {
  if (patches[kind]) return patches[kind];
  const verts = [], roads = [], seen = new Map([[dotKey(kind, ''), 0]]), roadSeen = new Set();
  verts.push({word: '', depth: 0});
  const limit = kind === 'oct' ? 4 : 5;
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    for (const x of ['', 'T', 'TT', 't']) {
      const e = reduce(kind, v.word + x), rk = roadKey(kind, e);
      if (roadSeen.has(rk)) continue;
      const w = reduce(kind, e + 'H'), dk = dotKey(kind, w);
      if (!seen.has(dk)) { if (v.depth >= limit) continue; seen.set(dk, verts.length); verts.push({word: w, depth: v.depth + 1}); }
      roadSeen.add(rk);
      roads.push({word: e, a: i, b: seen.get(dk)});
    }
  }
  for (const v of verts) v.z = pointOf(kind, v.word);
  patches[kind] = {verts, roads};
  return patches[kind];
}
export {patchOf, compose, invert, toward, rot, rotSq};

// --- Boards ------------------------------------------------------------------
// A puzzle has one or two floors with the same goal:
//   parameters: {mode: 'home', moves} or {mode: 'fence', flowers, maxLeft,
//   maxRight}, with floors: [{kind, solutions, attempt}]; an empty solutions
//   list means no walk reaches the goal on that floor, and then the
//   solutions list of a fence goal is every fence within FENCE_CAP moves.
// Each floor's board is {walk, told, cert}: the moves; a standing refusal,
// {say, walk}, where say is 'way' (there is a way) or 'miss' (not that dot,
// not those dots) and walk is the finished walk it was about, kept until a
// different walk is finished; and the certificate of a right Can't (the dot
// tapped, as its dot key; the dots tapped, as a sorted list of dot keys; ''
// for a fence), else null. The playground's board is {walks: [..]}, one walk
// for each floor.
const playing = q => q.mode === 'playground';
const possible = spec => spec.solutions.length > 0;
const freshFloor = () => ({walk: '', told: null, cert: null});
function fresh(p) {
  const q = p.parameters;
  if (playing(q)) return {walks: q.floors.map(() => '')};
  return {floors: q.floors.map(freshFloor)};
}
const walkOf = (q, b, i) => playing(q) ? b.walks[i] : b.floors[i].walk;
// A walk made only of allowed moves.
export function legalWalk(kind, q, walk) {
  if (!isWalk(walk) || walk.length > capOf(q)) return false;
  for (let k = 0; k < walk.length; k++) if (!canGo(kind, q, walk.slice(0, k), walk[k])) return false;
  return true;
}
const settled = (kind, q, f) => f.cert !== null || goalMet(kind, q, f.walk);
// The state after half the moves of an even home walk.
export const halfwayState = (kind, walk) => trace(kind, walk).states[walk.length / 2];
// The dots an odd home walk reached after an even number of moves, other than
// home: the ones that share home's colour. Sorted dot keys.
export function evenDots(kind, walk) {
  const {dots} = trace(kind, walk), out = new Set();
  for (let k = 2; k < dots.length; k += 2) if (dots[k] !== dots[0]) out.add(dots[k]);
  return [...out].sort();
}
// A Can't's certificate in the form it is saved in, or undefined if it is
// not one: '' for a fence, a dot key for one dot, sorted dot keys for dots.
function certOf(kind, q, cert) {
  const t = tapKind(q);
  if (t === null) return cert === '' ? '' : undefined;
  if (t === 'dot') return isWord(cert) ? dotKey(kind, reduce(kind, cert)) : undefined;
  if (!Array.isArray(cert) || cert.length > 64 || !cert.every(isWord)) return undefined;
  const keys = cert.map(c => dotKey(kind, reduce(kind, c)));
  return new Set(keys).size === keys.length ? keys.sort() : undefined;
}
// Whether Can't with this certificate is right for this finished walk: the
// dot after half the moves, or exactly the walk's dots of home's colour.
export function claimRight(kind, q, walk, cert) {
  const c = certOf(kind, q, cert), t = tapKind(q);
  if (c === undefined) return false;
  if (t === null) return true;
  if (t === 'dot') return walk.length % 2 === 0 && c === trace(kind, walk).dots[walk.length / 2];
  const want = evenDots(kind, walk);
  return c.length === want.length && c.every((x, j) => x === want[j]);
}
function validTold(kind, q, spec, f) {
  const t = f.told;
  if (t === null) return true;
  if (!object(t) || Object.keys(t).sort().join() !== 'say,walk' || !['way', 'miss'].includes(t.say)) return false;
  if (!legalWalk(kind, q, t.walk) || !spent(kind, q, t.walk) || goalMet(kind, q, t.walk) || f.cert !== null) return false;
  // "There is a way" only where there is one; "Not that …" only where a tap
  // can be wrong. A refusal stands until a different walk is finished.
  if (t.say === 'way' ? !possible(spec) : tapKind(q) === null) return false;
  return !spent(kind, q, f.walk) || f.walk === t.walk;
}
function validFloor(q, spec, f) {
  if (!object(f) || Object.keys(f).sort().join() !== 'cert,told,walk') return false;
  const kind = spec.kind;
  if (!legalWalk(kind, q, f.walk) || !validTold(kind, q, spec, f)) return false;
  if (f.cert === null) return true;
  return !possible(spec) && spent(kind, q, f.walk) && claimRight(kind, q, f.walk, f.cert) && JSON.stringify(certOf(kind, q, f.cert)) === JSON.stringify(f.cert);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (playing(q)) return Object.keys(b).join() === 'walks' && Array.isArray(b.walks) && b.walks.length === q.floors.length && b.walks.every((w, i) => legalWalk(q.floors[i].kind, q, w));
  return Object.keys(b).join() === 'floors' && Array.isArray(b.floors) && b.floors.length === q.floors.length && b.floors.every((f, i) => validFloor(q, q.floors[i], f));
}
function solved(p, b) {
  const q = p.parameters;
  if (playing(q) || !valid(p, b)) return false;
  return b.floors.every((f, i) => settled(q.floors[i].kind, q, f));
}
// Can't opens on a try (see tried) with no refusal standing.
export const canClaim = (kind, q, f) => !settled(kind, q, f) && f.told === null && tried(kind, q, f.walk);
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const i = action.floor;
  if (!Number.isInteger(i) || i < 0 || i >= q.floors.length) return null;
  const kind = q.floors[i].kind;
  let next = null;
  if (playing(q)) {
    const w = b.walks[i];
    if (action.type === 'go' && canGo(kind, q, w, action.turn)) next = {walks: b.walks.map((x, j) => j === i ? w + action.turn : x)};
    else if (action.type === 'clear' && w.length) next = {walks: b.walks.map((x, j) => j === i ? '' : x)};
  } else {
    const f = b.floors[i], spec = q.floors[i];
    if (settled(kind, q, f)) return null;
    let g = null;
    if (action.type === 'go' && canGo(kind, q, f.walk, action.turn)) {
      // A refusal goes when a different walk is finished.
      const walk = f.walk + action.turn;
      g = {walk, told: f.told && spent(kind, q, walk) && walk !== f.told.walk ? null : f.told, cert: null};
    }
    // Back takes back a floor's last move, as Undo does, and keeps a refusal;
    // the hints use it, so they never need the global Undo.
    else if (action.type === 'back' && f.walk.length) g = {walk: f.walk.slice(0, -1), told: f.told, cert: null};
    else if (action.type === 'claim' && canClaim(kind, q, f)) {
      const t = tapKind(q);
      if (Object.keys(action).sort().join() !== (t === null ? 'floor,type' : 'cert,floor,type')) return null;
      const cert = t === null ? '' : certOf(kind, q, action.cert);
      if (cert === undefined) return null;
      // The tap is judged first, on every floor: a wrong one gets the same
      // refusal wherever it is made; a right one shows the certificate or,
      // where the goal can be reached, says so.
      if (!claimRight(kind, q, f.walk, cert)) g = {...f, told: {say: 'miss', walk: f.walk}};
      else if (possible(spec)) g = {...f, told: {say: 'way', walk: f.walk}};
      else g = {...f, cert};
    }
    if (g) next = {floors: b.floors.map((x, j) => j === i ? g : x)};
  }
  if (next) Object.assign(ui(p), {claim: null, marks: [], live: i});
  return next;
}

// --- Hints -------------------------------------------------------------------
const TURN_WORDS = {L: 'Turn left.', S: 'Go straight.', R: 'Turn right.'};
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
const say = n => NUMBER[n] || String(n);
// Why Can't is right, given before Can't is marked: the halfway dot, the
// colours, the corners of two rooms.
export function reason(kind, q) {
  if (q.mode === 'fence') return 'Two rooms have 16 corners. At each end of the wall they share, a fence round both goes straight, so 4 corners are lost: 12 left turns. A fence round more rooms needs 4 more for each room. Press Can’t.';
  if (q.moves % 2) return `Colour the dots light and dark so every road joins a light dot to a dark one. Home is light, and every move changes the colour, so after ${say(q.moves)} moves the robot is on a dark dot. Press Can’t, then tap the light dots on your walk.`;
  const k = q.moves / 2;
  return `After ${say(k)} moves the robot is ${say(k)} roads from home, and on this floor the only ${say(k)}-road way back is the way it came, which starts with a turn round. Press Can’t, then tap the dot after ${say(k)} moves.`;
}
// The next move of a try on a floor with no answer: the authored try where it
// fits, but never a move that can only finish again the walk a standing
// refusal is about (Can't stays shut there), and off that walk first.
function nextTry(kind, q, spec, w, avoid) {
  const forced = x => {
    for (;;) {
      if (x === avoid) return true;
      if (!avoid.startsWith(x) || spent(kind, q, x)) return false;
      const legal = TURNS.filter(m => canGo(kind, q, x, m));
      if (legal.length !== 1 || legal[0] !== avoid[x.length]) return false;
      x += legal[0];
    }
  };
  const order = [...new Set([...(spec.attempt.startsWith(w) && spec.attempt.length > w.length ? [spec.attempt[w.length]] : []), 'L', 'S', 'R'])];
  let moves = order.filter(m => canGo(kind, q, w, m) && !(avoid && forced(w + m)));
  if (avoid && avoid.startsWith(w)) moves = [...moves.filter(m => m !== avoid[w.length]), ...moves.filter(m => m === avoid[w.length])];
  return moves[0];
}
// Under a left-turn budget Can't waits for the left turns to be used up: the
// authored try while the walk is on it, else the first move of a walk that
// turns left whenever that doesn't close it, if that walk uses them up. When
// it doesn't, the hint takes a move back; the walk it would have made from
// there runs through the walk just taken back only if it also fails, so the
// hints never undo and redo the same move.
function spendTry(kind, q, spec, w) {
  if (spec.attempt.startsWith(w) && spec.attempt.length > w.length) return spec.attempt[w.length];
  let x = w, first;
  while (lefts(x) < q.maxLeft) {
    const m = TURNS.find(t => canGo(kind, q, x, t) && !fenceEnded(kind, x + t));
    if (!m) return undefined;
    first ??= m;
    x += m;
  }
  return first;
}
// A wrong walk is never a 'deadend' hint: the app shows a dead end's text
// unasked, and on a floor with an answer that would say which floors have one.
// The hints take moves back instead.
function floorHint(p, b, i) {
  const q = p.parameters, spec = q.floors[i], kind = spec.kind, f = b.floors[i], w = f.walk;
  const go = m => ({type: 'move', action: {type: 'go', floor: i, turn: m}, text: TURN_WORDS[m], floor: i});
  const back = text => ({type: 'move', action: {type: 'back', floor: i}, text, floor: i});
  if (possible(spec)) {
    // The solutions list holds every walk that reaches the goal, so a walk
    // that starts none of them can't be finished.
    const next = spec.solutions.find(s => s.length > w.length && s.startsWith(w));
    if (next) return go(next[w.length]);
    return back(q.mode === 'home' ? 'This walk can’t come home in time. Take back the last move.' : 'This fence can’t work. Take back the last move.');
  }
  if (budgeted(q) && !tried(kind, q, w)) {
    const m = spendTry(kind, q, spec, w);
    return m ? go(m) : back('Take back the last move, then use up the left turns.');
  }
  if (!spent(kind, q, w)) {
    const m = nextTry(kind, q, spec, w, f.told ? f.told.walk : null);
    return m ? go(m) : back('Take back the last move, then finish another try.');
  }
  if (f.told) return back('Take back the last move, then finish another try.');
  const t = tapKind(q), action = {type: 'claim', floor: i};
  if (t === 'dot') action.cert = halfwayState(kind, w);
  if (t === 'dots') action.cert = evenDots(kind, w);
  return {type: 'move', action, text: reason(kind, q), floor: i};
}
function hint(p, b) {
  const q = p.parameters;
  if (playing(q) || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const i = b.floors.findIndex((f, j) => !settled(q.floors[j].kind, q, f));
  return floorHint(p, b, i);
}

// --- View state ----------------------------------------------------------------
// Which floor's Can't is waiting for taps and the dots tapped so far, which
// floor a narrow screen shows, which floor was used last (for focus), each
// floor's view, and the certificate each floor last slid to; none of it saved.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) uiState.set(p.id, {claim: null, marks: [], tab: 0, live: 0, views: {}, drawn: {}});
  return uiState.get(p.id);
}
const sameTold = (a, b) => Boolean(a && b && a.say === b.say && a.walk === b.walk);
// Undo keeps a standing refusal. When the step taken back is the refusal
// itself, the walk's last move goes with it, so the board visibly changes and
// the refusal stays until a different walk is finished.
function carry(p, from, to) {
  Object.assign(ui(p), {claim: null, marks: []});
  const q = p.parameters;
  if (playing(q) || !object(from) || !object(to) || !Array.isArray(from.floors) || !Array.isArray(to.floors)) return to;
  return {floors: to.floors.map((t, i) => {
    const f = from.floors[i], kind = q.floors[i].kind;
    if (!object(f) || !object(t) || !object(f.told) || t.cert !== null || sameTold(t.told, f.told)) return t;
    if (t.walk === f.walk) return f.walk ? {walk: f.walk.slice(0, -1), told: f.told, cert: null} : t;
    if (spent(kind, q, t.walk) && t.walk !== f.told.walk) return t;
    return {...t, told: f.told};
  })};
}
// Restart keeps a standing refusal too, on the fresh floor.
function carryOnRestart(p, from, to) {
  Object.assign(ui(p), {claim: null, marks: []});
  const q = p.parameters;
  if (playing(q) || !object(from) || !object(to) || !Array.isArray(from.floors) || !Array.isArray(to.floors)) return to;
  return {floors: to.floors.map((t, i) => { const f = from.floors[i]; return object(f) && object(f.told) && f.cert === null && object(t) ? {...t, told: f.told} : t; })};
}

// --- Drawing -----------------------------------------------------------------
// Each floor is drawn round an anchor state: view = {anchor, frame, robot},
// where frame maps the anchor's own coordinates to the picture. Everything
// drawn is placed by its word relative to the anchor, so the floating-point
// maps stay short however far the robot walks. After every move the view
// slides (without turning) so the robot is in the middle.
const S = 100, LIM = 40;
const fmt = x => String(Math.round(x * 10) / 10);
const scr = z => [z[0] * S, -z[1] * S];
const ROOM_MID = {oct: Math.tanh(Math.acosh(1 + Math.SQRT2) / 2), sq: SQ_EDGE / Math.SQRT2};
const ROAD_END = {oct: Math.tanh(EDGE / 2), sq: SQ_EDGE};
const shownAt = (kind, z) => Boolean(z) && (kind === 'oct' ? norm2(z) < 0.99 * 0.99 : Math.abs(z[0]) < 1.1 && Math.abs(z[1]) < 1.1);
// After Can't only dots big enough to tap are drawn, and each is a target: on
// octagons those within 0.94 of the middle, where neighbouring dots are still
// about 15 px apart on a 340 px floor. Others come closer with a drag.
export const TARGET_R = 0.94;
const targetable = (kind, z) => Boolean(z) && (kind === 'oct' ? norm2(z) < TARGET_R * TARGET_R : Math.abs(z[0]) < 0.97 && Math.abs(z[1]) < 0.97);
// How far a tap may be from what it chooses: in hyperbolic distance on
// octagons (so the reach shrinks with the drawing towards the rim; a road is
// 1.53 long), in picture units on squares (a road is 0.36 long).
const REACH = {claim: {oct: 0.7, sq: 0.16}, go: {oct: 0.5, sq: 0.22}};
function gap(kind, z, w) {
  const d = Math.hypot(z[0] - w[0], z[1] - w[1]);
  if (kind === 'sq') return d;
  const den = Math.hypot(1 - (z[0] * w[0] + z[1] * w[1]), z[0] * w[1] - z[1] * w[0]);
  return 2 * Math.atanh(Math.min(0.999999, d / Math.max(1e-9, den)));
}
const shrink = (kind, z) => kind === 'oct' ? Math.max(0, 1 - norm2(z)) : 1;
const UP = kind => kind === 'sq' ? rotSq(Math.PI / 2) : rot(Math.PI / 2);
// The view centred on a state, slid from the old view where that is near.
function centred(kind, v, target, robot) {
  if (v) {
    const d = reduce(kind, inverse(v.anchor) + target);
    if (d.length <= LIM) {
      const F = compose(kind, v.frame, mapOf(kind, d)), z = apply(kind, F, [0, 0]);
      if (kind === 'sq' || norm2(z) < 0.9999) return {anchor: target, robot, frame: compose(kind, invert(kind, toward(kind, z)), F)};
    }
  }
  return {anchor: target, robot, frame: UP(kind)};
}
function viewFor(p, i, kind, g) {
  const s = ui(p);
  if (!s.views[i] || s.views[i].robot !== g) s.views[i] = centred(kind, s.views[i], g, g);
  return s.views[i];
}
function viewer(kind, view) {
  const inv = inverse(view.anchor), memo = new Map();
  const rel = w => {
    if (!memo.has(w)) { const d = reduce(kind, inv + w); memo.set(w, d.length <= LIM ? d : null); }
    return memo.get(w);
  };
  const at = (w, local) => {
    const d = rel(w);
    return d === null ? null : apply(kind, compose(kind, view.frame, mapOf(kind, d)), local || [0, 0]);
  };
  return {rel, at};
}
// The direction of home from the middle of the picture, however far away it
// is: the map is built letter by letter and scaled (not normalised), which
// keeps its numbers small and leaves the point it sends 0 to unchanged.
function homeAngle(kind, view) {
  let M = view.frame;
  for (const c of reduce(kind, inverse(view.anchor))) {
    if (kind === 'sq') { M = compose(kind, M, GEN.sq[c]); continue; }
    const N = GEN.oct[c], a = cadd(cmul(M.a, N.a), cmul(M.b, cbar(N.b))), b = cadd(cmul(M.a, N.b), cmul(M.b, cbar(N.a)));
    const s = Math.max(Math.hypot(a[0], a[1]), Math.hypot(b[0], b[1])) || 1;
    M = {a: [a[0] / s, a[1] / s], b: [b[0] / s, b[1] / s]};
  }
  const z = apply(kind, M, [0, 0]);
  return Math.atan2(z[1], z[0]);
}
// The geodesic from a to b (picture coordinates): an arc of the circle through
// them that meets the rim at right angles; a straight line on squares.
function arcTo(kind, a, b) {
  const end = `${fmt(b[0])} ${fmt(b[1])}`;
  if (kind === 'sq') return `L${end}`;
  const x1 = a[0] / S, y1 = a[1] / S, x2 = b[0] / S, y2 = b[1] / S, d = x1 * y2 - y1 * x2;
  if (Math.abs(d) < 1e-5) return `L${end}`;
  const a1 = (x1 * x1 + y1 * y1 + 1) / 2, a2 = (x2 * x2 + y2 * y2 + 1) / 2;
  const cx = (a1 * y2 - a2 * y1) / d, cy = (x1 * a2 - x2 * a1) / d, r = Math.sqrt(Math.max(0, cx * cx + cy * cy - 1));
  if (!Number.isFinite(r) || r > 500) return `L${end}`;
  const cross = (x1 - cx) * (y2 - cy) - (y1 - cy) * (x2 - cx);
  return `A${fmt(r * S)} ${fmt(r * S)} 0 0 ${cross > 0 ? 1 : 0} ${end}`;
}
const moveTo = z => { const a = scr(z); return `M${fmt(a[0])} ${fmt(a[1])}`; };
const seg = (kind, z1, z2) => `${moveTo(z1)}${arcTo(kind, scr(z1), scr(z2))}`;
const loop = (kind, zs) => `${moveTo(zs[0])}${zs.map((z, j) => arcTo(kind, scr(z), scr(zs[(j + 1) % zs.length]))).join('')}Z`;
const dotPath = (z, r) => { const [x, y] = scr(z); return `M${fmt(x - r)} ${fmt(y)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(2 * r)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-2 * r)} 0`; };
const dotSize = (kind, z, base) => kind === 'oct' ? Math.max(1.2, base * shrink(kind, z)) : base * 0.62;
// Points along a road (picture coordinates), for drawing and for taps.
const roadPoints = (kind, V, w) => [0.12, 0.3, 0.5, 0.7, 0.88].map(t => V.at(w, [t * ROAD_END[kind], 0]));
function arrowPath(kind, V, w, size) {
  const z = V.at(w);
  if (!shownAt(kind, z)) return '';
  const k = kind === 'oct' ? shrink(kind, z) : 0.7;
  if (k < 0.03) return '';
  const a = scr(z), b = scr(V.at(w, [kind === 'oct' ? 0.02 : 0.05, 0])), len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len], n = [-u[1], u[0]], s = size * k;
  const P = (f, g) => `${fmt(a[0] + u[0] * s * f + n[0] * s * g)} ${fmt(a[1] + u[1] * s * f + n[1] * s * g)}`;
  return `M${P(1.1, 0)}L${P(-0.65, 0.7)}L${P(-0.3, 0)}L${P(-0.65, -0.7)}Z`;
}
// Home is off the drawing: a sun arrowhead on the edge points out toward it,
// outside every target (from 0.97 of the way out to just past the edge).
function homeMarker(kind, view) {
  const t = homeAngle(kind, view), u = [Math.cos(t), Math.sin(t)];
  if (!Number.isFinite(t)) return '';
  const r = kind === 'oct' ? 1 : 1 / Math.max(Math.abs(u[0]), Math.abs(u[1]));
  const c = scr([u[0] * r, u[1] * r]), d = [u[0], -u[1]], n = [-d[1], d[0]], s = 4.6;
  const P = (f, g) => `${fmt(c[0] + d[0] * s * f + n[0] * s * g)} ${fmt(c[1] + d[1] * s * f + n[1] * s * g)}`;
  return `<path class="oc-homeward" d="M${P(1, 0)}L${P(-0.6, 0.85)}L${P(-0.6, -0.85)}Z"/>`;
}
function flowerAt(kind, V, e) {
  const z = V.at(e, [ROOM_MID[kind] * Math.SQRT1_2, ROOM_MID[kind] * Math.SQRT1_2]);
  if (!shownAt(kind, z)) return '';
  const k = kind === 'oct' ? shrink(kind, z) / (1 - ROOM_MID.oct * ROOM_MID.oct) : 1;
  if (k < 0.06) return '';
  const [x, y] = scr(z);
  const petals = [0, 1, 2, 3, 4].map(j => { const t = j * 2 * Math.PI / 5 - Math.PI / 2; return `<circle cx="${fmt(5.4 * Math.cos(t))}" cy="${fmt(5.4 * Math.sin(t))}" r="3.8"/>`; }).join('');
  return `<g class="oc-flower" transform="translate(${fmt(x)} ${fmt(y)}) scale(${k.toFixed(3)})">${petals}<circle class="oc-flower-mid" r="3"/></g>`;
}
// The walls round the flower rooms: the outline (walls of one flower) and the
// walls two flowers share.
function flowerWalls(kind, q) {
  const count = new Map(), first = new Map();
  for (const e of flowerKeys(kind, q)) for (const c of roomEdges(kind, e)) { const k = roadKey(kind, c); count.set(k, (count.get(k) || 0) + 1); if (!first.has(k)) first.set(k, c); }
  return {outline: [...count].filter(([, n]) => n === 1).map(([k]) => first.get(k)), shared: [...count].filter(([, n]) => n > 1).map(([k]) => first.get(k))};
}
// What a tap can choose on a floor: the three roads ahead of the robot, or,
// while Can't waits for taps, every dot drawn (all but home), listed outward
// from the middle of the picture and clockwise from the top.
function choices(p, a, i, view, claiming) {
  const q = p.parameters, kind = q.floors[i].kind, walk = walkOf(q, a.board, i), V = viewer(kind, view);
  if (claiming) {
    const {verts} = patchOf(kind), home = dotKey(kind, ''), onWalk = new Set(trace(kind, walk).dots), out = [];
    for (const v of verts) {
      const z = apply(kind, view.frame, v.z), cert = dotKey(kind, reduce(kind, view.anchor + v.word));
      if (targetable(kind, z) && cert !== home) out.push({cert, pts: [z], z, walk: onWalk.has(cert)});
    }
    const ring = z => Math.round(norm2(z) * 1000), clock = z => (Math.atan2(z[0], z[1]) + 2 * Math.PI) % (2 * Math.PI);
    return out.sort((x, y) => ring(x.z) - ring(y.z) || clock(x.z) - clock(y.z));
  }
  const f = playing(q) ? null : a.board.floors[i];
  if (f && settled(kind, q, f)) return [];
  const g = trace(kind, walk).states.at(-1);
  return TURNS.filter(m => canGo(kind, q, walk, m)).map(m => ({turn: m, pts: roadPoints(kind, V, reduce(kind, g + TURN[m]))}));
}
const claimingOn = (p, a, i) => {
  const q = p.parameters, f = playing(q) ? null : a.board.floors[i];
  return Boolean(f) && ui(p).claim === i && tapKind(q) !== null && canClaim(q.floors[i].kind, q, f);
};
// The targets after Can't in the view a floor opens with after its last move
// (for the validator's count of how often a random tap is right).
export function claimTargets(p, a, i) {
  const q = p.parameters, kind = q.floors[i].kind, g = trace(kind, walkOf(q, a.board, i)).states.at(-1);
  return choices(p, a, i, centred(kind, null, g, g), true).map(c => c.cert);
}
// The choice drawn nearest a tap, if the tap is within its reach. The reach
// is measured on the floor (shrinking with the drawing toward the rim), but
// the choice is the nearest in the picture, so a tap never takes a dot drawn
// farther from it than another.
function nearest(kind, list, z, reach) {
  let best = null, at = null, bestD = Infinity;
  for (const c of list) for (const pt of c.pts) {
    if (!pt) continue;
    const d = Math.hypot(pt[0] - z[0], pt[1] - z[1]);
    if (d < bestD) { best = c; at = pt; bestD = d; }
  }
  return best && gap(kind, at, z) < reach ? best : null;
}
// What a tap at z (disk coordinates of floor i's picture) chooses now.
export function pickAt(p, a, i, z) {
  const kind = p.parameters.floors[i].kind, v = ui(p).views[i];
  if (!v) return null;
  const claiming = claimingOn(p, a, i);
  return nearest(kind, choices(p, a, i, v, claiming), z, REACH[claiming ? 'claim' : 'go'][kind]);
}
// Where a state's dot is drawn now on floor i (null when it is not placed).
export function drawnAt(p, i, word) {
  const kind = p.parameters.floors[i].kind, v = ui(p).views[i];
  return v ? viewer(kind, v).at(word) : null;
}
// Whether some dot of the walk (other than home) is drawn too near the edge
// to tap, so a drag may be needed: the trail already shows this, so saying it
// names no answer.
export function walkBeyond(p, a, i, view) {
  const q = p.parameters, kind = q.floors[i].kind, V = viewer(kind, view), {dots} = trace(kind, walkOf(q, a.board, i));
  return dots.some((d, k) => k > 0 && d !== dots[0] && !targetable(kind, V.at(d)));
}
const CUE = 'Drag the floor to reach dots near the edge.';
function floorInner(p, a, i, view, o) {
  const q = p.parameters, spec = q.floors[i], kind = spec.kind, walk = walkOf(q, a.board, i);
  const f = playing(q) ? null : a.board.floors[i], V = viewer(kind, view), {verts, roads} = patchOf(kind);
  const P = verts.map(v => apply(kind, view.frame, v.z)), T = trace(kind, walk), out = [];
  out.push(kind === 'oct' ? '<circle class="oc-ground" r="100"/>' : `<clipPath id="oc-clip-${i}"><rect x="-100" y="-100" width="200" height="200" rx="6"/></clipPath><rect class="oc-ground" x="-100" y="-100" width="200" height="200" rx="6"/><g clip-path="url(#oc-clip-${i})">`);
  const room = (e, cls) => {
    const cs = roomEdges(kind, e).map(c => V.at(c));
    return cs.every(Boolean) && cs.some(z => shownAt(kind, z)) ? `<path class="${cls}" d="${loop(kind, cs)}"/>` : '';
  };
  const met = f && goalMet(kind, q, walk);
  if (q.mode === 'fence' && met) out.push(inside(kind, walk).rooms.map(e => room(e, 'oc-inside')).join(''));
  const flowers = flowerKeys(kind, q);
  out.push(flowers.map(e => room(e, 'oc-bloom')).join(''));
  out.push(`<path class="oc-roads" d="${roads.map(r => shownAt(kind, P[r.a]) || shownAt(kind, P[r.b]) ? seg(kind, P[r.a], P[r.b]) : '').join('')}"/>`);
  out.push(flowers.map(e => flowerAt(kind, V, e)).join(''));
  // The certificate of a right Can't, drawn round the child's own walk.
  const cert = f && f.cert !== null ? tapKind(q) : undefined;
  if (cert === 'dots') {
    const base = colourOf(view.anchor);
    const light = [], dark = [];
    verts.forEach((v, j) => { if (shownAt(kind, P[j])) ((base + colourOf(v.word)) % 2 ? dark : light).push(dotPath(P[j], dotSize(kind, P[j], 6))); });
    out.push(`<path class="oc-light" d="${light.join('')}"/><path class="oc-dark" d="${dark.join('')}"/>`);
  } else if (!o.claiming) {
    const dots = verts.map((v, j) => shownAt(kind, P[j]) ? dotPath(P[j], dotSize(kind, P[j], 3.4)) : '').join('');
    out.push(`<path class="oc-dot" d="${dots}"/>`);
  }
  // The trail, and the dots a fence has used.
  const pts = T.states.map(g => V.at(g));
  let trail = '';
  for (let k = 1; k < pts.length; k++) if (pts[k - 1] && pts[k]) trail += seg(kind, pts[k - 1], pts[k]);
  out.push(`<path class="oc-trail${met ? ' oc-met' : ''}" d="${trail}"/>`);
  if (q.mode === 'fence') out.push(`<path class="oc-used" d="${pts.slice(1, -1).map(z => shownAt(kind, z) ? dotPath(z, dotSize(kind, z, 4.4)) : '').join('')}"/>`);
  if (cert === 'dot') {
    const k = walk.length / 2, half = pts.slice(0, k + 1);
    let d = '';
    for (let j = 1; j < half.length; j++) if (half[j - 1] && half[j]) d += seg(kind, half[j - 1], half[j]);
    const hz = pts[k];
    out.push(`<path class="oc-proof" d="${d}"/>`);
    if (shownAt(kind, hz)) out.push(`<path class="oc-ring" d="${dotPath(hz, dotSize(kind, hz, 11))}"/><path class="oc-turn" d="${arrowPath(kind, V, reduce(kind, T.states[k] + 'TT'), 13)}"/>`);
  }
  if (cert === 'dots') out.push(`<path class="oc-ring" d="${f.cert.map(c => V.at(c)).filter(z => shownAt(kind, z)).map(z => dotPath(z, dotSize(kind, z, 10))).join('')}"/>`);
  if (cert === null) {
    // The tightest fence round the flowers, the corners where it must turn,
    // and the shared wall, at whose ends it goes straight.
    const {outline, shared} = flowerWalls(kind, q), ends = new Set(shared.flatMap(w => [dotKey(kind, w), dotKey(kind, reduce(kind, w + 'H'))]));
    let fence = '', corners = '', walls = '';
    for (const c of outline) {
      const z1 = V.at(c), z2 = V.at(c + 'H');
      if (z1 && z2) fence += seg(kind, z1, z2);
      if (z1 && shownAt(kind, z1) && !ends.has(dotKey(kind, c))) corners += dotPath(z1, dotSize(kind, z1, 5));
    }
    for (const w of shared) { const z1 = V.at(w), z2 = V.at(w + 'H'); if (z1 && z2) walls += seg(kind, z1, z2); }
    out.push(`<path class="oc-tight" d="${fence}"/><path class="oc-corner" d="${corners}"/><path class="oc-proof" d="${walls}"/>`);
  }
  // Home: a ring and the way the robot faced at the start, or, when home is
  // off the drawing, an arrowhead at the edge pointing to it.
  const home = V.at('');
  if (shownAt(kind, home)) out.push(`<path class="oc-home" d="${dotPath(home, Math.max(2.6, dotSize(kind, home, 9)))}"/><path class="oc-ghost" d="${arrowPath(kind, V, '', 12)}"/>`);
  // A hint's road or target.
  const hm = o.hint && o.hint.type === 'move' ? o.hint.action : null;
  if (hm && hm.type === 'go') { const z0 = V.at(T.states.at(-1)), z1 = V.at(reduce(kind, T.states.at(-1) + TURN[hm.turn] + 'H')); if (z0 && z1) out.push(`<path class="oc-hinted" d="${seg(kind, z0, z1)}"/>`); }
  if (hm && hm.type === 'claim' && hm.cert !== undefined && o.claiming) {
    const want = Array.isArray(hm.cert) ? hm.cert : [hm.cert];
    out.push(`<path class="oc-hinted" d="${want.map(c => V.at(c)).filter(z => targetable(kind, z)).map(z => dotPath(z, Math.max(5, dotSize(kind, z, 9)))).join('')}"/>`);
  }
  // Can't is waiting for taps: every dot drawn is a target, all alike; dots
  // already tapped toward an answer of several dots are filled.
  if (o.claiming) {
    const marks = new Set(ui(p).marks), many = tapKind(q) === 'dots';
    out.push(choices(p, a, i, view, true).map(c => `<path class="oc-target${marks.has(c.cert) ? ' oc-marked' : ''}" d="${dotPath(c.z, Math.max(2.6, dotSize(kind, c.z, 6)))}" tabindex="0" role="button" aria-label="${c.walk ? 'Dot on the walk' : 'Dot'}"${many ? ` aria-pressed="${marks.has(c.cert)}"` : ''} data-cert="${c.cert}" data-focus="oc-t-${i}-${c.cert}"/>`).join(''));
  }
  out.push(`<path class="oc-robot" d="${arrowPath(kind, V, T.states.at(-1), 13)}"/>`);
  if (kind === 'sq') out.push('</g>');
  if (!shownAt(kind, home)) out.push(homeMarker(kind, view));
  return out.join('');
}

// --- The page ----------------------------------------------------------------
const GLYPH = {L: '↰', S: '↑', R: '↱'};
const LABEL = {L: 'Turn left', S: 'Go straight', R: 'Turn right'};
const NAME = {oct: 'Octagons', sq: 'Squares'};
const turnWords = walk => [...walk].map(m => ({L: 'left', S: 'straight', R: 'right'})[m]).join(', ');
const REFUSAL = {way: 'There is a way.', dot: 'Not that dot.', dots: 'Not those dots.'};
function floorPanel(p, a, i, h, live) {
  const q = p.parameters, spec = q.floors[i], kind = spec.kind, s = ui(p), walk = walkOf(q, a.board, i);
  const f = playing(q) ? null : a.board.floors[i], done = f ? settled(kind, q, f) : false;
  const claiming = claimingOn(p, a, i);
  const T = trace(kind, walk), g = T.states.at(-1), hh = h && h.floor === i ? h : null;
  const hm = hh && hh.type === 'move' ? hh.action : null;
  // A right Can't brings its certificate to the middle once (again after an
  // Undo and a new right Can't): the halfway dot, or the middle of the wall
  // the flowers share.
  const certKey = f && f.cert !== null ? `${walk}|${JSON.stringify(f.cert)}` : null;
  if (certKey === null) s.drawn[i] = null;
  else if (s.drawn[i] !== certKey) {
    s.drawn[i] = certKey;
    const shared = q.mode === 'fence' ? flowerWalls(kind, q).shared[0] : undefined;
    if (tapKind(q) === 'dot') s.views[i] = centred(kind, viewFor(p, i, kind, g), halfwayState(kind, walk), g);
    else if (shared !== undefined) {
      const v = centred(kind, viewFor(p, i, kind, g), shared, g);
      const mid = apply(kind, v.frame, [kind === 'oct' ? Math.tanh(EDGE / 4) : SQ_EDGE / 2, 0]);
      s.views[i] = {...settle(kind, {anchor: v.anchor, frame: compose(kind, invert(kind, toward(kind, mid)), v.frame)}), robot: g};
    }
  }
  // A hint that marks the dots to tap brings the next one within reach when
  // none still to tap is: the dot after half the moves, or the first light
  // dot of the walk (in the walk's order) not yet marked.
  if (claiming && hm && hm.type === 'claim' && hm.cert !== undefined) {
    const v = viewFor(p, i, kind, g), V = viewer(kind, v), marks = new Set(s.marks);
    const todo = tapKind(q) === 'dot' ? [hm.cert] : [...new Set(T.dots.filter((d, k) => k >= 2 && k % 2 === 0 && d !== T.dots[0]))].filter(d => !marks.has(d));
    if (todo.length && !todo.some(c => targetable(kind, V.at(c)))) s.views[i] = centred(kind, v, reduce(kind, todo[0]), g);
  }
  const view = viewFor(p, i, kind, g);
  const label = `${kind === 'oct' ? 'Octagon' : 'Square'} floor${walk.length ? `. Moves: ${turnWords(walk)}` : ''}${atHome(kind, walk) && walk.length ? '. Home, facing the same way' : ''}${claiming ? `. Tap the ${tapKind(q) === 'dot' ? 'dot' : 'dots'}` : ''}`;
  const svg = `<svg class="oc-board ${kind}" viewBox="-104 -104 208 208" tabindex="0" role="group" data-floor="${i}" data-focus="oc-board-${i}" aria-label="${esc(label)}">${floorInner(p, a, i, view, {claiming, hint: hh})}</svg>`;
  let record = '';
  // On an odd goal, while Can't waits for taps, each move box is a button for
  // the dot the walk reached after that move: the same marks as the dots on
  // the floor, without hunting for dots near the rim. A box whose dot is
  // home is off, as home is on the floor.
  if (claiming && tapKind(q) === 'dots') {
    const marks = new Set(s.marks), want = new Set(hm && hm.type === 'claim' && Array.isArray(hm.cert) ? hm.cert : []);
    record = `<div class="oc-record oc-boxes" role="group" aria-label="Moves">${[...walk].map((m, k) => {
      const d = T.dots[k + 1], on = marks.has(d);
      return `<button type="button" class="oc-box${on ? ' oc-marked' : ''}${want.has(d) && !on ? ' hinted' : ''}" data-cert="${d}" data-focus="oc-box-${i}-${k}" aria-label="After move ${k + 1}" aria-pressed="${on}"${d === T.dots[0] ? ' disabled' : ''}>${GLYPH[m]}</button>`;
    }).join('')}</div>`;
  } else if (q.mode === 'home') record = `<div class="oc-record" aria-hidden="true">${Array.from({length: q.moves}, (_, k) => `<i class="${k < walk.length ? 'on' : ''}">${k < walk.length ? GLYPH[walk[k]] : ''}</i>`).join('')}</div>`;
  if (q.mode === 'fence' && Number.isInteger(q.maxLeft)) record = `<div class="oc-budget" role="img" aria-label="Left turns allowed: ${q.maxLeft}. Used: ${lefts(walk)}.">${Array.from({length: q.maxLeft}, (_, k) => `<i class="${k < lefts(walk) ? 'used' : ''}">↰</i>`).join('')}</div>`;
  let controls = '';
  if (!done) {
    const go = TURNS.map(m => `<button type="button" class="secondary oc-go${hm && hm.type === 'go' && hm.turn === m ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'go', floor: i, turn: m}))}" data-focus="oc-go-${i}-${m}" aria-label="${LABEL[m]}" ${canGo(kind, q, walk, m) ? '' : 'disabled'}>${GLYPH[m]}</button>`).join('');
    let extra = '';
    if (playing(q)) extra = `<button type="button" class="secondary oc-clear" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'clear', floor: i}))}" data-focus="oc-board-${i}" ${walk.length ? '' : 'disabled'}>Clear</button>`;
    else {
      const can = canClaim(kind, q, f), marked = hm && hm.type === 'claim' && !claiming;
      extra = tapKind(q) === null
        ? `<button type="button" class="secondary oc-cant${marked ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'claim', floor: i}))}" data-focus="oc-board-${i}" ${can ? '' : 'disabled'}>Can’t</button>`
        : `<button type="button" class="secondary oc-cant${marked ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claim: claiming ? null : i})}' data-focus="oc-board-${i}" aria-pressed="${claiming}" ${can ? '' : 'disabled'}>Can’t</button>`;
    }
    // While the move boxes are buttons, the move buttons (all off: the walk
    // is finished) are left out, so the two rows of arrows aren't confused.
    controls = `<div class="oc-controls">${claiming && tapKind(q) === 'dots' ? '' : go}${extra}</div>`;
  } else if (f) {
    // A narrow panel shows one floor at a time: where the move buttons were,
    // a button goes to a floor still to do. Pressed, not automatic, so the
    // finished walk or a right Can't's drawing stays until the child moves on.
    const j = q.floors.findIndex((x, k) => k !== i && !settled(x.kind, q, a.board.floors[k]));
    if (j >= 0) controls = `<div class="oc-controls oc-next-row"><button type="button" class="primary oc-next" data-action="mechanic-ui" data-ui='${JSON.stringify({tab: j})}' data-focus="oc-board-${j}">${NAME[q.floors[j].kind]} →</button></div>`;
  }
  // A refusal is shown on the walk it is about; saved, it stays through Undo
  // and Restart and shows again when that walk is finished again.
  const told = f && f.told && f.walk === f.told.walk ? REFUSAL[f.told.say === 'way' ? 'way' : tapKind(q)] : '';
  // The move boxes reach every dot of an odd goal, so the drag line is only
  // for the one dot of an even goal.
  const cue = claiming && tapKind(q) === 'dot' ? `<p class="oc-cue"${walkBeyond(p, a, i, view) ? '' : ' hidden'}>${CUE}</p>` : '';
  const cls = ['oc-wrap', kind, i === live ? 'oc-live' : '', i === s.tab ? 'oc-on' : 'oc-off', done ? 'oc-done' : '', claiming ? 'oc-claiming' : ''].filter(Boolean).join(' ');
  return `<div class="${cls}" data-floor="${i}">${svg}${record}${controls}${told ? `<p class="oc-told">${told}</p>` : ''}${cue}</div>`;
}
function render(p, a) {
  const q = p.parameters, b = a.board, s = ui(p), done = solved(p, b), n = q.floors.length;
  if (!(s.tab < n)) s.tab = 0;
  if (!(s.live < n)) s.live = 0;
  const h = !done && !playing(q) && a.hintLevel >= 2 ? hint(p, b) : null;
  // A finished floor's tab is filled pine with a check, so a narrow panel
  // shows which floor is still to do.
  const fin = i => !playing(q) && settled(q.floors[i].kind, q, b.floors[i]);
  const tabs = n > 1 ? `<div class="oc-tabs" role="group" aria-label="Floor">${q.floors.map((f, i) => `<button type="button" class="secondary oc-tab${fin(i) ? ' oc-tab-done' : ''}${h && h.floor === i && s.tab !== i ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({tab: i})}' data-focus="oc-tab-${i}" aria-pressed="${s.tab === i}">${fin(i) ? '<span aria-hidden="true">✓ </span>' : ''}${NAME[f.kind]}${fin(i) ? '<span class="sr-only">, done</span>' : ''}</button>`).join('')}</div>` : '';
  const floors = q.floors.map((_, i) => floorPanel(p, a, i, h, s.live)).join('');
  const status = playing(q) ? '' : q.floors.map((f, i) => {
    const x = b.floors[i];
    return `${NAME[f.kind]}: ${x.cert !== null ? 'can’t, shown' : goalMet(f.kind, q, x.walk) ? 'done' : x.told && x.walk === x.told.walk ? (x.told.say === 'way' ? 'there is a way' : 'not that') : `${x.walk.length} ${x.walk.length === 1 ? 'move' : 'moves'}`}.`;
  }).join(' ');
  return `<div class="oc-puzzle${done ? ' solved' : ''}${n > 1 ? ' two' : ''}" data-mechanic-wire="octagon">${tabs}<div class="oc-floors">${floors}</div><p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Gestures ----------------------------------------------------------------
// A tap chooses the nearest road ahead of the robot (or, after Can't, the
// nearest dot); a drag slides the floor to look round it. Arrow keys move;
// Enter on a target taps it; Escape leaves Can't.
const KEYS = {ArrowLeft: 'L', ArrowUp: 'S', ArrowRight: 'R'};
// A tap on a target: one dot is the whole claim; for several dots each tap
// marks or unmarks one, and the claim is judged when the last is in.
function tapTarget(p, api, i, cert) {
  const q = p.parameters, kind = q.floors[i].kind;
  if (tapKind(q) === 'dot') { api.apply({type: 'claim', floor: i, cert}); return; }
  const s = ui(p), marks = s.marks.includes(cert) ? s.marks.filter(x => x !== cert) : [...s.marks, cert];
  if (marks.length >= evenDots(kind, walkOf(q, api.attempt().board, i)).length) api.apply({type: 'claim', floor: i, cert: marks});
  else api.ui({marks});
}
function wire(root, p, api) {
  const q = p.parameters;
  root.querySelectorAll('.oc-box').forEach(box => box.addEventListener('click', () => {
    const i = Number(box.closest('[data-floor]').dataset.floor);
    if (claimingOn(p, api.attempt(), i)) tapTarget(p, api, i, box.dataset.cert);
  }));
  root.querySelectorAll('svg.oc-board').forEach(svg => {
    const i = Number(svg.dataset.floor), kind = q.floors[i].kind;
    const toDisk = e => { const r = svg.getBoundingClientRect(); return [((e.clientX - r.left) / r.width * 208 - 104) / S, -((e.clientY - r.top) / r.height * 208 - 104) / S]; };
    const clampPan = z => { const m = Math.hypot(z[0], z[1]), lim = kind === 'oct' ? 0.9 : 3; return m > lim ? [z[0] * lim / m, z[1] * lim / m] : z; };
    let start = null, panning = false, last = null, frame = 0;
    const redraw = () => {
      const a = api.attempt(), claiming = claimingOn(p, a, i);
      const h = !playing(q) && a.hintLevel >= 2 && !solved(p, a.board) ? hint(p, a.board) : null;
      svg.innerHTML = floorInner(p, a, i, ui(p).views[i], {claiming, hint: h && h.floor === i ? h : null});
      const cue = svg.parentElement?.querySelector('.oc-cue');
      if (cue && claiming) cue.hidden = !walkBeyond(p, a, i, ui(p).views[i]);
    };
    svg.addEventListener('pointerdown', e => {
      if (e.button) return;
      start = {x: e.clientX, y: e.clientY, z: toDisk(e)};
      panning = false;
      last = start.z;
      try { svg.setPointerCapture(e.pointerId); } catch {}
    });
    svg.addEventListener('pointermove', e => {
      if (!start) return;
      if (!panning && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
      panning = true;
      const v = ui(p).views[i];
      if (!v) return;
      const z = toDisk(e);
      ui(p).views[i] = {...panned(kind, v, clampPan(last), clampPan(z)), robot: v.robot};
      last = z;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; redraw(); });
    });
    svg.addEventListener('pointerup', e => {
      if (!start) return;
      const tap = !panning, z = toDisk(e);
      start = null;
      if (!tap) return;
      const a = api.attempt(), pick = pickAt(p, a, i, z);
      if (!pick) return;
      if (claimingOn(p, a, i)) tapTarget(p, api, i, pick.cert);
      else api.apply({type: 'go', floor: i, turn: pick.turn});
    });
    svg.addEventListener('pointercancel', () => { start = null; });
  });
  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const at = e.target.closest?.('[data-floor]');
    if (!at) return;
    const i = Number(at.dataset.floor);
    if (e.target.classList?.contains('oc-target') && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      tapTarget(p, api, i, e.target.dataset.cert);
      return;
    }
    if (e.key === 'Escape' && ui(p).claim === i) { e.preventDefault(); api.ui({claim: null}); return; }
    const m = KEYS[e.key];
    if (!m || ui(p).claim === i) return;
    const a = api.attempt(), kind = q.floors[i].kind;
    if (!canGo(kind, q, walkOf(q, a.board, i), m) || (!playing(q) && settled(kind, q, a.board.floors[i]))) return;
    e.preventDefault();
    api.apply({type: 'go', floor: i, turn: m});
  });
}

export const octagonMechanics = {
  octagon: {
    fresh, valid, solved, move, hint, render, wire, carry, carryOnRestart,
    ui(p, payload) {
      if (!object(payload)) return;
      const s = ui(p), n = p.parameters.floors.length;
      if (Number.isInteger(payload.tab) && payload.tab >= 0 && payload.tab < n) Object.assign(s, {tab: payload.tab, live: payload.tab});
      if ('claim' in payload) Object.assign(s, {claim: Number.isInteger(payload.claim) && payload.claim >= 0 && payload.claim < n ? payload.claim : null, marks: []});
      if (Array.isArray(payload.marks) && s.claim !== null) s.marks = payload.marks.filter(isWord).slice(0, 64);
      if (s.claim !== null) s.live = s.claim;
    },
    reset: p => { uiState.delete(p.id); },
    noHint: p => playing(p.parameters)
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'octagon',
  family: {id: 'octagon', symbol: '⊚', area: 'surfaces', region: 'shape'},
  mechanics: octagonMechanics,
  pack: new URL('./octagon.json', import.meta.url).href,
  css: new URL('./octagon.css', import.meta.url).href,
  focus: '.oc-wrap.oc-live > svg.oc-board'
};
