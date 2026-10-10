// Portal rooms (worksheet Week 41, torus portals and lifts). A room of small
// squares whose right edge is glued to its left edge and top to bottom, by
// translation, is a torus: a pawn that steps off one side comes back on the
// other, in the same row or column. Beside the room, the unrolled view lays
// copies of the room out in the plane, so the same trip goes straight on into
// the next copy. A trip that ends back on H in the room ends at H in some copy
// (m, n) of the plane.
//
// Every solve is something to do with the pawn: reach every square in exactly
// two steps (all nine in the portal room, five in a room without portals);
// come back to H in exactly k steps (an odd k needs a lap round the room, and
// on a room four squares wide and tall no odd trip comes home at all, because
// a checkerboard colouring survives the portals); collect stars in named
// copies and come back to H in the first copy; trade two pawns that take the
// same steps (never on a room three wide, because their gap in the unrolled
// view never changes; possible on a room four wide when they are half a room
// apart); and change a trip by erasing a step and its way back or sliding a
// corner across a square, which never moves the copy where the trip ends.
// Two trips from H back to H change into each other exactly when they end in
// the same copy: the loops of the torus are classified by Z × Z.
import {esc} from '../../expansion-controls.js';
import {surfaceOf, lift, step, place, planeKey, copyOf, stepsOf, wordOf, DIRS, DIR_NAMES, roomBoard, planeBoard, planeTrail, roomTrail, roomSpots, planeSpot, tripLayer, tripMove, tripApply, tripMoves, arrowPad, wirePortal} from '../../portal-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MAX_TRIP = 30, PLAY_TRIP = 60;
export const MODES = ['walk', 'every', 'trade', 'shrink', 'playground'];
const LETTERS = ['R', 'U', 'L', 'D'];
const ARROWS = {R: '→', U: '↑', L: '←', D: '↓'};
const isWord = (w, cap) => typeof w === 'string' && w.length <= cap && /^[RULD]*$/.test(w);
const keyOf = ([u, v]) => `${u},${v}`;

// --- Rooms ----------------------------------------------------------------------
// A room is a surface spec for the shared portal board (dist/portal-board.js):
// one small square per board square, so a step is a move to the square glued
// on that side. `letters` names the squares.
// A room from its rows of letters, top row first: each letter is one small
// square; `wrapX` glues the right edge to the left and `wrapY` the top to the
// bottom, both by translation (false leaves a wall).
export function roomFromRows(rows, {wrapX = true, wrapY = true} = {}) {
  const H = rows.length, W = rows[0].length, squares = {}, right = {}, up = {};
  rows.forEach((row, k) => [...row].forEach((id, c) => { squares[id] = [c, H - 1 - k]; }));
  const name = (c, r) => rows[H - 1 - r][c];
  for (const [id, [c, r]] of Object.entries(squares)) {
    right[id] = c + 1 < W ? name(c + 1, r) : wrapX ? name(0, r) : null;
    up[id] = r + 1 < H ? name(c, r + 1) : wrapY ? name(c, 0) : null;
  }
  return {squares, right, up};
}
export const surfaceFor = q => surfaceOf(q.room);
export const sizeOf = S => [S.box[2] - S.box[0], S.box[3] - S.box[1]];
// The copy a placed point is in, counted in whole rooms: [m, n].
export const copyIndex = (S, pt) => { const [cx, cy] = copyOf(S, pt.s, pt.X, pt.Y), [w, h] = sizeOf(S); return [cx / w, cy / h]; };
export const at = (S, s, copy = [0, 0]) => { const [w, h] = sizeOf(S); return place(S, {s, i: 0, j: 0}, [copy[0] * w, copy[1] * h]); };
export const keyAt = (S, s, copy) => planeKey(S, at(S, s, copy));
// The lift of a trip from a square in copy [0, 0].
export const tripLift = (S, from, trip) => lift(S, {s: from, i: 0, j: 0}, stepsOf(trip));
export const legal = (S, from, trip) => tripLift(S, from, trip).blocked === -1;
const sameCopy = (a, b) => a[0] === b[0] && a[1] === b[1];
export function copyWords([m, n]) {
  if (!m && !n) return 'first copy';
  const part = (k, a, b) => k ? `${Math.abs(k)} ${k > 0 ? a : b}` : '';
  return `copy ${[part(m, 'right', 'left'), part(n, 'up', 'down')].filter(Boolean).join(', ')}`;
}
const letterOf = (q, s) => q.letters?.[s] || s;

// --- Walk: stars to collect, coming back, or exactly k steps home ---------------
// parameters: {mode: 'walk', room, letters, home, stars?: [{s, copy}], back?,
// steps?}. With `steps` the goal is to be on `home` (any copy) after exactly
// that many steps; otherwise to stand on every star (a square in a named
// copy) and, with `back`, then to stand on `home` in the first copy.
const starKeys = (S, q) => (q.stars || []).map(st => keyOf(keyAt(S, st.s, st.copy)));
function collected(S, q, trip) {
  const seen = new Set(tripLift(S, q.home, trip).points.map(p => keyOf(planeKey(S, p))));
  return starKeys(S, q).map(k => seen.has(k));
}
function walkGoal(S, q, trip) {
  const L = tripLift(S, q.home, trip);
  if (q.steps) return trip.length === q.steps && L.end.s === q.home;
  if (!collected(S, q, trip).every(Boolean)) return false;
  return !q.back || (L.end.s === q.home && sameCopy(L.endCopy, [0, 0]));
}
// Can `cell` reach home in exactly r more steps? (The room's own steps.)
const reachMemo = new Map();
export function canReach(S, cell, target, r) {
  const key = `${JSON.stringify(S.spec)}|${cell}|${target}|${r}`;
  if (reachMemo.has(key)) return reachMemo.get(key);
  let out = r === 0 ? cell === target : false;
  if (r > 0) for (const d of LETTERS) { const next = step(S, {s: cell, i: 0, j: 0}, DIRS[d]); if (next && canReach(S, next.s, target, r - 1)) { out = true; break; } }
  reachMemo.set(key, out);
  return out;
}
export const exactPossible = q => canReach(surfaceFor(q), q.home, q.home, q.steps);

// --- Every: the squares exactly k steps away ------------------------------------
// parameters: {mode: 'every', room, letters, home, steps}. Each trip of k
// steps rings the square it ends on, and the pawn goes home.
export function reachIn(S, from, k) {
  let layer = new Set([from]);
  for (let r = 0; r < k; r++) {
    const next = new Set();
    for (const s of layer) for (const d of LETTERS) { const t = step(S, {s, i: 0, j: 0}, DIRS[d]); if (t) next.add(t.s); }
    layer = next;
  }
  return S.ids.filter(s => layer.has(s));
}

// --- Trade: two pawns, the same steps -------------------------------------------
// parameters: {mode: 'trade', room, letters, pawns: [p, q]}. Both pawns take
// every step; the goal is the first on q and the second on p. On a torus the
// second pawn is always the same translation away from the first.
export function tradeEnds(S, q, trip) {
  const a = tripLift(S, q.pawns[0], trip), b = tripLift(S, q.pawns[1], trip);
  return {a, b, blocked: a.blocked !== -1 || b.blocked !== -1};
}
const traded = (S, q, trip) => { const {a, b, blocked} = tradeEnds(S, q, trip); return !blocked && a.end.s === q.pawns[1] && b.end.s === q.pawns[0]; };
// Breadth-first search over the pair of squares the pawns stand on.
const tradeMemo = new Map();
export function tradeRoute(S, from, target) {
  const key = `${JSON.stringify(S.spec)}|${from}|${target}`;
  if (tradeMemo.has(key)) return tradeMemo.get(key);
  const goal = `${target[0]},${target[1]}`, back = new Map([[`${from[0]},${from[1]}`, null]]), queue = [from];
  let found = from.join() === goal ? '' : null;
  for (let k = 0; k < queue.length && found === null; k++) {
    const [x, y] = queue[k];
    for (const d of LETTERS) {
      const nx = step(S, {s: x, i: 0, j: 0}, DIRS[d]), ny = step(S, {s: y, i: 0, j: 0}, DIRS[d]);
      if (!nx || !ny) continue;
      const key2 = `${nx.s},${ny.s}`;
      if (back.has(key2)) continue;
      back.set(key2, [`${x},${y}`, d]); queue.push([nx.s, ny.s]);
      if (key2 === goal) { let w = '', at2 = key2; while (back.get(at2)) { w = back.get(at2)[1] + w; at2 = back.get(at2)[0]; } found = w; break; }
    }
  }
  tradeMemo.set(key, found);
  return found;
}
export const tradePossible = q => tradeRoute(surfaceFor(q), q.pawns, [q.pawns[1], q.pawns[0]]) !== null;

// --- Shrink: erase a step and its way back, or slide a corner -------------------
// parameters: {mode: 'shrink', room, letters, home, trip, target, budget?}.
// The trip starts as `trip` and must become `target` ('' is staying at H).
// With `budget`, at most that many slides (the fewest possible).
export function editWord(word, k) {
  const next = tripApply(stepsOf(word), k);
  return next ? wordOf(next) : null;
}
export const editKind = (word, k) => tripMove(stepsOf(word), k);
// Every word the moves can reach from `start`, with the fewest slides to it
// (cancels are free): a breadth-first search, slides costing one.
const reachCache = new Map();
export function editReach(start) {
  if (reachCache.has(start)) return reachCache.get(start);
  const dist = new Map([[start, 0]]), deque = [start];
  while (deque.length) {
    const w = deque.shift(), d = dist.get(w);
    for (const {at: k, kind} of tripMoves(stepsOf(w))) {
      const next = editWord(w, k), nd = d + (kind === 'slide' ? 1 : 0);
      if (dist.has(next) && dist.get(next) <= nd) continue;
      dist.set(next, nd);
      if (kind === 'slide') deque.push(next); else deque.unshift(next);
    }
  }
  reachCache.set(start, dist);
  return dist;
}
export const shrinkPossible = q => editReach(q.trip).has(q.target) && editReach(q.trip).get(q.target) <= (q.budget ?? Infinity);
// Signed area under a word's path, for the parity of slides: a slide moves the
// path across one square, so the area changes by one.
const areaOf = word => { let x = 0, y = 0, a = 0; for (const c of word) { const [dx, dy] = DIRS[c]; a += dx * y; x += dx; y += dy; } return a; };

// --- Boards ---------------------------------------------------------------------
// walk: {trip, told, claimed}            every: {trip, found, told, done}
// trade: {trip, told, claimed}           shrink: {trip, told, claimed[, slides]}
// playground: {room, trip}
// `told` is 'way' after Can't when there is a way (kept until a change), or
// for every: {kind: 'more'} after That's all with a square still unringed,
// {kind: 'again', s} after a trip to a square already ringed.
export const playRoom = (q, b) => q.rooms[b.room];
const qFor = (p, b) => p.parameters.mode === 'playground' ? {...playRoom(p.parameters, b), mode: 'playground'} : p.parameters;
const hasCant = q => (q.mode === 'walk' && Boolean(q.steps)) || q.mode === 'trade' || q.mode === 'shrink';
function possible(q) {
  if (q.mode === 'walk') return q.steps ? exactPossible(q) : true;
  if (q.mode === 'trade') return tradePossible(q);
  if (q.mode === 'shrink') return shrinkPossible(q);
  return true;
}
const capOf = q => q.mode === 'playground' ? PLAY_TRIP : q.mode === 'walk' && q.steps ? q.steps : q.mode === 'every' ? q.steps - 1 : MAX_TRIP;

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {room: Object.keys(q.rooms)[0], trip: ''};
  if (q.mode === 'every') return {trip: '', found: [], told: null, done: false};
  if (q.mode === 'shrink') return {trip: q.trip, told: null, claimed: false, ...(q.budget ? {slides: 0} : {})};
  return {trip: '', told: null, claimed: false};
}
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
function goalNow(S, q, b) {
  if (q.mode === 'walk') return walkGoal(S, q, b.trip);
  if (q.mode === 'trade') return traded(S, q, b.trip);
  if (q.mode === 'shrink') return b.trip === q.target;
  return false;
}
function valid(p, b) {
  const q0 = p.parameters;
  if (q0.mode === 'playground') return keysAre(b, ['room', 'trip']) && typeof b.room === 'string' && Object.hasOwn(q0.rooms, b.room) && isWord(b.trip, PLAY_TRIP) && legal(surfaceFor(qFor(p, b)), playRoom(q0, b).home, b.trip);
  const q = q0, S = surfaceFor(q);
  if (q.mode === 'every') {
    if (!keysAre(b, ['trip', 'found', 'told', 'done']) || !isWord(b.trip, q.steps - 1) || !legal(S, q.home, b.trip) || typeof b.done !== 'boolean') return false;
    const answers = reachIn(S, q.home, q.steps);
    if (!Array.isArray(b.found) || !b.found.every(s => answers.includes(s)) || new Set(b.found).size !== b.found.length) return false;
    const t = b.told;
    if (b.done) return t === null && b.found.length === answers.length && b.trip === '';
    if (t === null) return true;
    if (!object(t)) return false;
    if (t.kind === 'more') return keysAre(t, ['kind']) && b.found.length < answers.length;
    if (t.kind === 'again') return keysAre(t, ['kind', 's']) && b.found.includes(t.s) && b.trip === '';
    return false;
  }
  const keys = ['trip', 'told', 'claimed', ...(q.mode === 'shrink' && q.budget ? ['slides'] : [])];
  if (!keysAre(b, keys) || typeof b.claimed !== 'boolean' || (b.told !== null && b.told !== 'way')) return false;
  if (b.claimed && b.told !== null) return false;
  if (!hasCant(q) && (b.claimed || b.told !== null)) return false;
  if ((b.claimed && possible(q)) || (b.told === 'way' && !possible(q))) return false;
  if (q.mode === 'shrink') {
    const dist = editReach(q.trip);
    if (typeof b.trip !== 'string' || !dist.has(b.trip)) return false;
    if (q.budget) {
      const d = dist.get(b.trip);
      if (!Number.isInteger(b.slides) || b.slides < d || b.slides > q.budget || (b.slides - (areaOf(b.trip) - areaOf(q.trip))) % 2 !== 0) return false;
    }
    return true;
  }
  if (!isWord(b.trip, capOf(q))) return false;
  if (q.mode === 'trade' ? tradeEnds(S, q, b.trip).blocked : !legal(S, q.home, b.trip)) return false;
  // A goal is kept the moment it is reached, so no earlier part of the trip reached it.
  for (let k = 0; k < b.trip.length; k++) if (goalNow(S, q, {trip: b.trip.slice(0, k)})) return false;
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'every') return b.done;
  return b.claimed || goalNow(surfaceFor(q), q, b);
}

function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = qFor(p, b), S = surfaceFor(q);
  if (q0.mode === 'playground') {
    if (action.type === 'room') return typeof action.room === 'string' && Object.hasOwn(q0.rooms, action.room) && action.room !== b.room ? {room: action.room, trip: ''} : null;
    if (action.type !== 'step' || !LETTERS.includes(action.dir) || b.trip.length >= PLAY_TRIP) return null;
    const trip = b.trip + action.dir;
    return legal(S, q.home, trip) ? {...b, trip} : null;
  }
  if (action.type === 'cant') {
    if (!hasCant(q) || b.told === 'way') return null;
    return possible(q) ? {...b, told: 'way'} : {...b, told: null, claimed: true};
  }
  if (q.mode === 'every') {
    if (action.type === 'all') {
      if (b.told?.kind === 'more') return null;
      return b.found.length === reachIn(S, q.home, q.steps).length ? {...b, trip: '', told: null, done: true} : {...b, told: {kind: 'more'}};
    }
    if (action.type !== 'step' || !LETTERS.includes(action.dir)) return null;
    const trip = b.trip + action.dir;
    if (!legal(S, q.home, trip)) return null;
    const told = b.told?.kind === 'more' ? b.told : null;
    if (trip.length < q.steps) return {...b, trip, told};
    const end = tripLift(S, q.home, trip).end.s;
    return b.found.includes(end) ? {...b, trip: '', told: {kind: 'again', s: end}} : {...b, trip: '', found: [...b.found, end], told: null};
  }
  if (q.mode === 'shrink') {
    if (!['slide', 'cancel'].includes(action.type) || editKind(b.trip, action.at) !== action.type) return null;
    if (action.type === 'slide' && q.budget && b.slides >= q.budget) return null;
    return {...b, trip: editWord(b.trip, action.at), told: null, ...(q.budget ? {slides: b.slides + (action.type === 'slide' ? 1 : 0)} : {})};
  }
  // walk and trade
  if (action.type !== 'step' || !LETTERS.includes(action.dir) || b.trip.length >= capOf(q)) return null;
  const trip = b.trip + action.dir;
  if (q.mode === 'trade' ? tradeEnds(S, q, trip).blocked : !legal(S, q.home, trip)) return null;
  return {...b, trip, told: null};
}

// --- Hints ----------------------------------------------------------------------
const say = d => `Step ${DIR_NAMES[d]}.`;
// A breadth-first search in the plane for the stars: state = where the pawn
// is and which stars it has, inside a box round everything that matters.
function walkRoute(S, q, trip) {
  const L = tripLift(S, q.home, trip), keys = starKeys(S, q), home = keyOf(keyAt(S, q.home, [0, 0]));
  let mask = 0;
  collected(S, q, trip).forEach((got, k) => { if (got) mask |= 1 << k; });
  const full = (1 << keys.length) - 1, startKey = keyOf(planeKey(S, L.end));
  const pts = [startKey, home, ...keys].map(k => k.split(',').map(Number));
  const [u0, u1, v0, v1] = [Math.min(...pts.map(p => p[0])) - 4, Math.max(...pts.map(p => p[0])) + 4, Math.min(...pts.map(p => p[1])) - 4, Math.max(...pts.map(p => p[1])) + 4];
  const done = (k, m) => m === full && (!q.back || k === home);
  if (done(startKey, mask)) return '';
  const first = `${startKey}|${mask}`, back = new Map([[first, null]]), queue = [[L.end, mask]];
  for (let n = 0; n < queue.length; n++) {
    const [pt, m] = queue[n], here = `${keyOf(planeKey(S, pt))}|${m}`;
    for (const d of LETTERS) {
      const next = step(S, pt, DIRS[d]);
      if (!next) continue;
      const [u, v] = planeKey(S, next);
      if (u < u0 || u > u1 || v < v0 || v > v1) continue;
      const k = keyOf([u, v]), i = keys.indexOf(k), m2 = i >= 0 ? m | (1 << i) : m, key = `${k}|${m2}`;
      if (back.has(key)) continue;
      back.set(key, [here, d]); queue.push([next, m2]);
      if (done(k, m2)) { let w = '', a = key; while (back.get(a)) { w = back.get(a)[1] + w; a = back.get(a)[0]; } return w; }
    }
  }
  return null;
}
// Exactly k steps home: keep going the way the trip is going when that can
// still finish, otherwise the first way that can.
function exactStep(S, q, trip) {
  const here = tripLift(S, q.home, trip).end.s, r = q.steps - trip.length;
  const order = trip ? [trip.at(-1), ...LETTERS.filter(d => d !== trip.at(-1))] : LETTERS;
  return order.find(d => { const t = step(S, {s: here, i: 0, j: 0}, DIRS[d]); return t && canReach(S, t.s, q.home, r - 1); }) || null;
}
function everyStep(S, q, b) {
  const answers = reachIn(S, q.home, q.steps), left = answers.filter(s => !b.found.includes(s));
  if (!left.length) return null;
  const here = tripLift(S, q.home, b.trip).end.s, r = q.steps - b.trip.length;
  const order = b.trip ? [b.trip.at(-1), ...LETTERS.filter(d => d !== b.trip.at(-1))] : LETTERS;
  for (const target of left) {
    const d = order.find(d2 => { const t = step(S, {s: here, i: 0, j: 0}, DIRS[d2]); return t && canReach(S, t.s, target, r - 1); });
    if (d) return {d, target};
  }
  // No square left to ring from here: finish this trip anywhere and start again.
  const d = order.find(d2 => step(S, {s: here, i: 0, j: 0}, DIRS[d2]));
  return d ? {d, target: null} : null;
}
// Shrinking: erase a there-and-back pair if there is one; otherwise slide a
// corner where an up or down step comes before a sideways one, which sorts
// the sideways steps first so that their pairs meet.
function shrinkStep(word) {
  const moves = tripMoves(stepsOf(word));
  const cancel = moves.find(m => m.kind === 'cancel');
  if (cancel) return cancel;
  return moves.find(m => m.kind === 'slide' && 'UD'.includes(word[m.at - 1]) && 'RL'.includes(word[m.at])) || null;
}
// Turning one trip into another within a slide budget: a breadth-first search.
function turnStep(q, b) {
  const target = q.target, left = q.budget ? q.budget - b.slides : Infinity;
  const seen = new Map([[b.trip, null]]), queue = [[b.trip, 0]];
  for (let n = 0; n < queue.length; n++) {
    const [w, used] = queue[n];
    if (w === target) { let a = w, first = null; while (seen.get(a)) { first = seen.get(a)[1]; a = seen.get(a)[0]; } return first; }
    for (const m of tripMoves(stepsOf(w))) {
      const next = editWord(w, m.at), cost = used + (m.kind === 'slide' ? 1 : 0);
      if (cost > left || seen.has(next)) continue;
      seen.set(next, [w, m]); queue.push([next, cost]);
    }
  }
  return null;
}
const pairWords = (word, k) => `${ARROWS[word[k - 1]]}${ARROWS[word[k]]}`;
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const S = surfaceFor(q), cant = {type: 'move', action: {type: 'cant'}, text: 'Press Can’t.'};
  if (q.mode === 'walk') {
    if (q.steps) {
      if (!exactPossible(q)) return {...cant, text: checkerboard(S) && q.steps % 2 ? `Every step changes the checkerboard colour, even through a portal, so after ${q.steps} steps the pawn is never on ${letterOf(q, q.home)}’s colour. Press Can’t.` : 'Press Can’t.'};
      const d = exactStep(S, q, b.trip);
      return d ? {type: 'move', action: {type: 'step', dir: d}, text: say(d)} : {type: 'deadend', text: 'That trip can’t finish on H. Undo.'};
    }
    const route = walkRoute(S, q, b.trip);
    if (route === null || b.trip.length + route.length > MAX_TRIP) return {type: 'deadend', text: 'Too many steps. Undo.'};
    return {type: 'move', action: {type: 'step', dir: route[0]}, text: say(route[0])};
  }
  if (q.mode === 'every') {
    const next = everyStep(S, q, b);
    if (!next) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
    return {type: 'move', action: {type: 'step', dir: next.d}, text: next.target ? `${say(next.d)}` : `${say(next.d)} Then start again.`};
  }
  if (q.mode === 'trade') {
    if (tradePossible(q)) {
      const {a, b: b2} = tradeEnds(S, q, b.trip), route = tradeRoute(S, [a.end.s, b2.end.s], [q.pawns[1], q.pawns[0]]);
      if (route === null || b.trip.length + route.length > MAX_TRIP) return {type: 'deadend', text: 'Too many steps. Undo.'};
      return {type: 'move', action: {type: 'step', dir: route[0]}, text: say(route[0])};
    }
    // Walk the yellow pawn onto the blue pawn's start, where the gap shows.
    const route = tradeRouteTo(S, tradeEnds(S, q, b.trip).a.end.s, q.pawns[1]);
    if (route && b.trip.length + route.length <= MAX_TRIP) return {type: 'move', action: {type: 'step', dir: route[0]}, text: `${say(route[0])} Watch the gap between the pawns in the unrolled view.`};
    return {...cant, text: `The yellow pawn is on ${letterOf(q, q.pawns[1])}, but the blue pawn is not on ${letterOf(q, q.pawns[0])}. The gap between them never changes. Press Can’t.`};
  }
  // shrink
  if (q.target === '' && !shrinkPossible(q)) {
    const m = shrinkStep(b.trip);
    if (!m) return {...cant, text: `The trip ends on ${letterOf(q, q.home)}, ${copyWords(copyIndex(S, tripLift(S, q.home, b.trip).end))}, and no move changes that. Press Can’t.`};
    return {type: 'move', action: {type: m.kind, at: m.at}, text: m.kind === 'cancel' ? `Erase a there-and-back pair: ${pairWords(b.trip, m.at)}.` : `Slide a ${pairWords(b.trip, m.at)} corner.`};
  }
  if (!shrinkPossible(q)) return {...cant, text: 'The two trips end in different copies. Press Can’t.'};
  const m = q.target === '' ? shrinkStep(b.trip) : turnStep(q, b);
  if (!m) return {type: 'deadend', text: q.budget ? 'Too many slides now. Undo.' : 'Undo.'};
  return {type: 'move', action: {type: m.kind, at: m.at}, text: m.kind === 'cancel' ? `Erase a there-and-back pair: ${pairWords(b.trip, m.at)}.` : `Slide a ${pairWords(b.trip, m.at)} corner.`};
}
// The steps that take one square to another in the room (breadth-first).
function tradeRouteTo(S, from, to) {
  if (from === to) return '';
  const back = new Map([[from, null]]), queue = [from];
  for (let n = 0; n < queue.length; n++) for (const d of LETTERS) {
    const t = step(S, {s: queue[n], i: 0, j: 0}, DIRS[d]);
    if (!t || back.has(t.s)) continue;
    back.set(t.s, [queue[n], d]); queue.push(t.s);
    if (t.s === to) { let w = '', a = to; while (back.get(a)) { w = back.get(a)[1] + w; a = back.get(a)[0]; } return w; }
  }
  return null;
}

// --- Drawing --------------------------------------------------------------------
const f = x => Number(x.toFixed(3));
const ring = ([x, y], cls, r = .4) => `<circle class="pt-ring ${cls}" cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
const pawn = ([x, y], cls) => `<g class="pt-pawn ${cls}"><circle cx="${f(x)}" cy="${f(y)}" r=".27"/></g>`;
function star([x, y], cls) {
  const pts = Array.from({length: 10}, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .15 : .36; return `${f(x + r * Math.cos(a))},${f(y - r * Math.sin(a))}`; });
  return `<polygon class="pt-star ${cls}" points="${pts.join(' ')}"/>`;
}
const beads = (n, filled, label) => `<span class="pt-beads" role="img" aria-label="${esc(label)}">${Array.from({length: n}, (_, k) => `<i class="${k < filled ? 'on' : ''}"></i>`).join('')}</span>`;
const button = (label, action, enabled, hinted, cls = '') => `<button type="button" class="secondary pt-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="pt-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;

// What a tap on a point of either view does: a step to a neighbouring square
// of the pawn (or of either pawn in a trade).
function stepFor(S, from, view, at2) {
  for (const d of LETTERS) {
    const t = step(S, from, DIRS[d]);
    if (!t) continue;
    if (view === 'room' ? `${t.s},0,0` === at2 : keyOf(planeKey(S, t)) === at2) return d;
  }
  return null;
}

function render(p, a) {
  const q0 = p.parameters, b = a.board, q = qFor(p, b), S = surfaceFor(q), done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done && q0.mode !== 'playground' ? hint(p, b) : null, act = hinted?.action;
  return q.mode === 'shrink' ? renderShrink(p, a, q, S, done, act) : renderWalk(p, a, q0, q, S, done, act);
}

function renderWalk(p, a, q0, q, S, done, act) {
  const b = a.board, trade = q.mode === 'trade', home = trade ? q.pawns[0] : q.home;
  const trips = trade ? [tripLift(S, q.pawns[0], b.trip), tripLift(S, q.pawns[1], b.trip)] : [tripLift(S, q.home, b.trip)];
  // An every-square trip is rung and sent home on its last step, so it is never full.
  const L = trips[0], moving = !done, full = q.mode !== 'every' && b.trip.length >= capOf(q);
  const hintDir = act?.type === 'step' ? act.dir : null;
  const can = d => moving && !full && (trade ? trips.every(t => step(S, t.end, DIRS[d])) : Boolean(step(S, L.end, DIRS[d])));
  const target = hintDir ? step(S, L.end, DIRS[hintDir]) : null;
  const parity = done && b.claimed && checkerboard(S);
  // The step a tap on a square takes: toward it from the first pawn it is next to (as wire's pointMove).
  const dirTo = match => { if (!moving) return null; for (const t of trips) { const d = LETTERS.find(d2 => can(d2) && match(step(S, t.end, DIRS[d2]))); if (d) return d; } return null; };
  const found = new Set(b.found || []);
  // The room.
  const roomLook = pt => {
    const here = trips.map((t, k) => t.end.s === pt.s ? k : -1).filter(k => k >= 0);
    const d = dirTo(nx => nx?.s === pt.s);
    const label = `${letterOf(q, pt.s)}${pt.s === home && !trade ? ', home' : ''}${here.length ? `, ${trade ? here.map(k => ['yellow', 'blue'][k]).join(' and ') + ' pawn' : 'pawn'} here` : ''}${found.has(pt.s) ? ', ringed' : ''}${d ? `. Step ${DIR_NAMES[d]}` : ''}`;
    return {text: letterOf(q, pt.s), act: Boolean(d), label, cls: [found.has(pt.s) ? 'found' : '', target?.s === pt.s ? 'hinted' : '', parity ? (squareParity(S, pt) ? 'dark' : 'light') : ''].filter(Boolean).join(' ')};
  };
  let roomUnder = '', roomOver = '';
  if (trade) q.pawns.forEach((s, k) => { roomUnder += ring(roomSpots(S, {s, i: 0, j: 0})[0], `start p${k}`); });
  else roomUnder += ring(roomSpots(S, {s: q.home, i: 0, j: 0})[0], 'start');
  for (const s of found) roomUnder += `<circle class="pt-found" cx="${f(roomSpots(S, {s, i: 0, j: 0})[0][0])}" cy="${f(roomSpots(S, {s, i: 0, j: 0})[0][1])}" r=".36"/>`;
  trips.forEach((t, k) => { roomOver += roomTrail(S, {s: trade ? q.pawns[k] : q.home, i: 0, j: 0}, stepsOf(b.trip.slice(0, t.points.length - 1)), `pb-trail${trade ? ` p${k}` : ''}`); });
  trips.forEach((t, k) => { roomOver += pawn(roomSpots(S, t.end)[0], trade ? `p${k}` : 'solo'); });
  const room = roomBoard(S, {cls: 'pt-room', label: 'Portal room', slide: moving, point: roomLook, under: roomUnder, over: roomOver});
  // The unrolled view: hidden for a room with no portals, where it would be the same picture.
  const portals = S.edges.some(e => e.kind === 'seam');
  let plane = '';
  if (portals) {
    const keys = trips.map(t => planeKey(S, t.end)), stars = (q.stars || []).map(st => keyAt(S, st.s, st.copy)), got = q.stars ? collected(S, q, b.trip) : [];
    const starts = trade ? q.pawns.map(s => keyAt(S, s, [0, 0])) : [keyAt(S, q.home, [0, 0])];
    const show = [...starts, ...stars, ...trips.flatMap(t => t.points.map(pt => planeKey(S, pt)))];
    const planeLook = pt => {
      const k = keyOf([pt.u, pt.v]), d = dirTo(nx => nx && keyOf(planeKey(S, nx)) === k);
      const here = keys.map((kk, n) => keyOf(kk) === k ? n : -1).filter(n => n >= 0);
      const label = `${letterOf(q, pt.s)}, ${copyWords(copyIndex(S, pt))}${here.length ? `, ${trade ? here.map(n => ['yellow', 'blue'][n]).join(' and ') + ' pawn' : 'pawn'} here` : ''}${stars.some(s => keyOf(s) === k) ? ', star' : ''}${d ? `. Step ${DIR_NAMES[d]}` : ''}`;
      return {text: letterOf(q, pt.s), act: Boolean(d), label, textCls: 'faint', cls: [target && keyOf(planeKey(S, target)) === k ? 'hinted' : '', parity ? (squareParity(S, pt) ? 'dark' : 'light') : ''].filter(Boolean).join(' ')};
    };
    let under = '', over = '';
    starts.forEach((s, n) => { under += ring(planeSpot(S, at(S, trade ? q.pawns[n] : q.home)), `start${trade ? ` p${n}` : ''}`); });
    stars.forEach((s, n) => { over += star(planeSpot(S, at(S, q.stars[n].s, q.stars[n].copy)), got[n] ? 'got' : ''); });
    trips.forEach((t, k) => { over += planeTrail(S, {s: trade ? q.pawns[k] : q.home, i: 0, j: 0}, stepsOf(b.trip), `pb-trail${trade ? ` p${k}` : ''}`); });
    if (trade) { const [x1, y1] = planeSpot(S, trips[0].end), [x2, y2] = planeSpot(S, trips[1].end); over += `<line class="pt-gap" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }
    trips.forEach((t, k) => { over += pawn(planeSpot(S, t.end), trade ? `p${k}` : 'solo'); });
    const [w, h] = sizeOf(S);
    plane = planeBoard(S, {cls: 'pt-plane', label: 'Unrolled view', key: `portals-${p.id}`, slide: moving, show, focus: keys[0], margin: 1, min: Math.max(w, h) + 4, max: Math.max(w, h) * 3 + 2, anchors: trips[0].points.map(pt => ({s: pt.s, X: pt.X, Y: pt.Y})), point: planeLook, square: (s, X, Y, copy) => copy[0] === 0 && copy[1] === 0 ? 'first' : '', under, over});
  }

  // Controls.
  let bar = '', pad = '';
  const steps = q.mode === 'walk' && q.steps ? q.steps : q.mode === 'every' ? q.steps : 0;
  if (q0.mode === 'playground') {
    bar = `<div class="pt-rooms" role="group" aria-label="Room">${Object.entries(q0.rooms).map(([id, r]) => `<button type="button" class="secondary pt-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'room', room: id}))}" data-focus="pt-room-${id}" aria-pressed="${b.room === id}" aria-label="${esc(r.name)}">${roomBoard(surfaceOf(r.room), {cls: 'pt-mini', picture: true, label: r.name})}</button>`).join('')}</div>`;
  } else if (!done) {
    const parts = [];
    if (steps) parts.push(beads(steps, b.trip.length, `${b.trip.length} of ${steps} steps`));
    if (q.mode === 'every') parts.push(button('That’s all', {type: 'all'}, b.told?.kind !== 'more', act?.type === 'all'));
    if (hasCant(q)) parts.push(button('Can’t', {type: 'cant'}, b.told !== 'way', act?.type === 'cant'));
    bar = parts.length ? `<div class="pt-bar">${parts.join('')}</div>` : '';
  }
  if (moving) pad = arrowPad({cls: 'pt-pad', dir: d => ({act: can(d), hinted: hintDir === d})});
  const stage = `<div class="pt-stage${portals ? '' : ' single'}${moving ? '' : ' still'}"><div class="pt-view pt-room-view">${room}</div>${plane ? `<div class="pt-view pt-plane-view">${plane}</div>` : ''}${pad}</div>`;
  const told = b.told === 'way' ? 'There is a way.' : b.told?.kind === 'more' ? 'There is another.' : b.told?.kind === 'again' ? 'Found already.' : '';
  const where = trips.map((t, k) => `${trade ? `${['Yellow', 'Blue'][k]} pawn` : 'Pawn'} on ${letterOf(q, t.end.s)}, ${copyWords(copyIndex(S, t.end))}`).join('. ');
  const status = `${where}. ${b.trip.length} ${b.trip.length === 1 ? 'step' : 'steps'}.${found.size ? ` Ringed: ${[...found].map(s => letterOf(q, s)).join(', ')}.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="pt-puzzle${done ? ' solved' : ''}" data-mechanic-wire="portals">${bar}${stage}${told ? `<p class="pt-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A checkerboard colouring of the room's squares, and whether every step,
// portals included, changes its colour (true when the room is an even number
// of squares wide and tall).
const squareParity = (S, pt) => (S.at[pt.s][0] + S.at[pt.s][1]) % 2 === 1;
export const checkerboard = S => S.ids.every(s => ['right', 'up'].every(side => { const t = S.glue[side][s]; return !t || squareParity(S, {s}) !== squareParity(S, {s: t}); }));

function renderShrink(p, a, q, S, done, act) {
  const b = a.board, steps = stepsOf(b.trip), L = tripLift(S, q.home, b.trip), moving = !done;
  const hintAt = act && (act.type === 'slide' || act.type === 'cancel') ? act.at : null;
  const room = roomBoard(S, {cls: 'pt-room', label: 'Portal room', point: pt => ({text: letterOf(q, pt.s), label: `${letterOf(q, pt.s)}${pt.s === q.home ? ', home' : ''}`}), under: ring(roomSpots(S, {s: q.home, i: 0, j: 0})[0], 'start'), over: roomTrail(S, {s: q.home, i: 0, j: 0}, steps, 'pb-trail')});
  const startKey = keyAt(S, q.home, [0, 0]), endKey = planeKey(S, L.end);
  const targetLift = q.target ? tripLift(S, q.home, q.target) : null;
  const layer = tripLayer(S, {s: q.home, i: 0, j: 0}, steps, {vertex: (k, kind) => {
    if (!moving || (kind === 'slide' && q.budget && b.slides >= q.budget)) return {act: false};
    return {act: true, cls: k === hintAt ? 'hinted' : '', label: kind === 'slide' ? `Slide the ${pairName(b.trip, k)} corner after step ${k}` : `Erase steps ${k} and ${k + 1}, ${pairName(b.trip, k)}`};
  }});
  const show = [startKey, endKey, ...L.points.map(pt => planeKey(S, pt)), ...(targetLift ? targetLift.points.map(pt => planeKey(S, pt)) : [])];
  let under = ring(planeSpot(S, at(S, q.home)), 'start') + ring(planeSpot(S, L.end), 'end');
  if (targetLift) under += `<polyline class="pt-target" points="${targetLift.points.map(pt => planeSpot(S, pt).map(f).join(',')).join(' ')}"/>`;
  const [w, h] = sizeOf(S);
  const plane = planeBoard(S, {cls: 'pt-plane', label: 'Unrolled view', key: `portals-${p.id}`, show, min: Math.max(w, h) + 4, max: Math.max(w, h) * 3 + 2, point: pt => ({text: letterOf(q, pt.s), textCls: 'faint', label: `${letterOf(q, pt.s)}, ${copyWords(copyIndex(S, pt))}`}), square: (s, X, Y, copy) => copy[0] === 0 && copy[1] === 0 ? 'first' : '', under, over: layer.line, top: moving ? layer.controls : ''});
  const word = `<div class="pt-word" role="img" aria-label="${esc(b.trip ? `Trip: ${[...b.trip].map(c => DIR_NAMES[c]).join(', ')}` : 'No steps left')}">${b.trip ? [...b.trip].map((c, k) => `<span class="${hintAt && (k === hintAt - 1 || k === hintAt) ? 'hinted' : ''}">${ARROWS[c]}</span>`).join('') : '<span class="pt-empty">·</span>'}</div>`;
  const parts = [];
  if (q.budget && moving) parts.push(beads(q.budget, b.slides, `${b.slides} of ${q.budget} slides`));
  if (moving) parts.push(button('Can’t', {type: 'cant'}, b.told !== 'way', act?.type === 'cant'));
  const bar = parts.length ? `<div class="pt-bar">${parts.join('')}</div>` : '';
  const told = b.told === 'way' ? 'There is a way.' : '';
  const status = `Trip ${b.trip ? [...b.trip].map(c => DIR_NAMES[c]).join(', ') : 'empty'}. It ends on ${letterOf(q, L.end.s)}, ${copyWords(copyIndex(S, L.end))}.${q.budget ? ` ${b.slides} of ${q.budget} slides.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="pt-puzzle${done ? ' solved' : ''}" data-mechanic-wire="portals">${bar}<div class="pt-stage shrink"><div class="pt-view pt-room-view">${room}</div><div class="pt-view pt-plane-view">${plane}</div>${word}</div>${told ? `<p class="pt-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const pairName = (word, k) => `${DIR_NAMES[word[k - 1]]} then ${DIR_NAMES[word[k]]}`;

function wire(root, p, api) {
  const now = () => { const b = api.attempt().board; return {b, q: qFor(p, b)}; };
  const live = () => { const {b} = now(); return !solved(p, b); };
  const pointMove = (view, at2, from) => {
    const {b, q} = now();
    if (!live() || q.mode === 'shrink') return null;
    const S = surfaceFor(q), trade = q.mode === 'trade';
    const ends = trade ? [tripLift(S, q.pawns[0], b.trip).end, tripLift(S, q.pawns[1], b.trip).end] : [tripLift(S, q.home, b.trip).end];
    // A slide steps only from where a pawn stands.
    const key = pt => view === 'room' ? `${pt.s},0,0` : keyOf(planeKey(S, pt));
    for (const end of ends) {
      if (from !== undefined && from !== key(end)) continue;
      const d = stepFor(S, end, view, at2);
      if (d) return {type: 'step', dir: d};
    }
    return null;
  };
  wirePortal(root, {
    point: (view, at2) => pointMove(view, at2),
    enter: (view, from, to) => pointMove(view, to, from),
    dir: d => { const {q} = now(); return live() && q.mode !== 'shrink' ? {type: 'step', dir: d} : null; },
    vertex: k => { const {b, q} = now(); if (!live() || q.mode !== 'shrink') return null; const kind = editKind(b.trip, k); return kind ? {type: kind, at: k} : null; },
    settle: () => api.ui({})
  }, api.apply);
}

export const portalMechanics = {
  portals: {
    fresh, valid, solved, move, hint, render, wire,
    ui() {},
    // The playground has no goal and no Hint.
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'portals',
  family: {id: 'portals', symbol: '⧉'},
  mechanics: portalMechanics,
  pack: new URL('./portals.json', import.meta.url).href,
  css: new URL('./portals.css', import.meta.url).href,
  focus: '.pb-arrow:not([disabled]),.pb-vertex[role=button],.pt-button:not([disabled])'
};
