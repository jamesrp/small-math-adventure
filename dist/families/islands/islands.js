// Islands (worksheet Week 10, bridges and one-stroke walks), a group inside
// Bridge Courier. Towns are islands joined by bridges, two or three of them
// between one pair where the worksheet has them (Königsberg). A counter sits
// on every bridge and is picked up when the walk crosses it.
//
// Euler's theorem: in a town in one piece, a walk over every bridge exactly
// once exists exactly when zero or two islands have an odd number of
// bridges; with zero it can start anywhere and comes back, with two it runs
// from one of them to the other. So:
// - starts: tap every island a walk can start from (or No walk), judged as a
//   whole; No walk is certified by the child tapping the odd islands.
// - add: add one bridge so that a walk exists, then walk it.
// - fewest: add as few bridges as possible for a walk that comes back; each
//   odd island needs a new bridge end and a bridge has two, so half the odd
//   islands are needed; the child taps them.
// - deliver: a delivery route crosses every bridge at least once and comes
//   back, repeating as few as possible. Repeats run along bridges, so the
//   three-arm star needs 3 (each dead end's bridge twice), not half its four
//   odd islands; the child taps the dead ends.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, wireGraph, edgeGeometry, NODE_R} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
export const MODES = ['starts', 'add', 'fewest', 'deliver'];
export const MAX_NEW = 6;

// ---------------------------------------------------------------- towns
export const islandsOf = q => Object.keys(q.nodes);
const isIsland = (q, id) => typeof id === 'string' && Object.hasOwn(q.nodes, id);
const sortIslands = (q, list) => { const order = islandsOf(q); return [...list].sort((a, b) => order.indexOf(a) - order.indexOf(b)); };
const sameSet = (a, b) => a.length === b.length && a.every(x => b.includes(x));

// The board geometry of a list of bridges [u, v, bend].
const BEND = 12;
const specOf = (q, all) => ({nodes: q.nodes, edges: all.map(([u, v, bend]) => [u, v, null, bend || 0]), aspect: q.aspect, scale: q.scale});
// Does the bridge keep clear of every other island?
function clear(q, all, i) {
  const g = graphOf(specOf(q, all)), e = g.edges[i], {a, b, c} = edgeGeometry(g, e), room = (NODE_R + 2.5) * g.k;
  for (const id of g.ids) {
    if (id === e.u || id === e.v) continue;
    const [x, y] = g.pos[id];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, s = 1 - t;
      const px = c ? s * s * a[0] + 2 * s * t * c[0] + t * t * b[0] : s * a[0] + t * b[0];
      const py = c ? s * s * a[1] + 2 * s * t * c[1] + t * t * b[1] : s * a[1] + t * b[1];
      if (Math.hypot(px - x, py - y) < room) return false;
    }
  }
  return true;
}
// A new bridge bends away from the bridges already on its pair of islands and
// around any island in its way, preferring the smallest bend and, between two
// equal bends, the side away from the middle of the town.
const bendMemo = new Map();
function newBend(q, all, u, v) {
  const key = JSON.stringify([q.nodes, all, u, v]);
  if (bendMemo.has(key)) return bendMemo.get(key);
  const taken = all.filter(([x, y]) => (x === u && y === v) || (x === v && y === u)).map(([x, , bend]) => (x === u ? 1 : -1) * (bend || 0));
  const g = graphOf(specOf(q, all)), mid = g.ids.reduce((m, id) => [m[0] + g.pos[id][0] / g.ids.length, m[1] + g.pos[id][1] / g.ids.length], [0, 0]);
  const [x1, y1] = g.pos[u], [x2, y2] = g.pos[v], len = Math.hypot(x2 - x1, y2 - y1) || 1, n = [-(y2 - y1) / len, (x2 - x1) / len];
  const outward = Math.sign(((x1 + x2) / 2 - mid[0]) * n[0] + ((y1 + y2) / 2 - mid[1]) * n[1]) || 1;
  let best = 0;
  for (const size of [0, 1, 2, 3, 4]) {
    const tries = size ? [outward * size * BEND, -outward * size * BEND] : [0];
    const ok = tries.find(bend => taken.every(t => Math.abs(t - bend) >= BEND * .75) && clear(q, [...all, [u, v, bend]], all.length));
    if (ok !== undefined) { best = ok; break; }
    if (size === 4) best = tries[0];
  }
  bendMemo.set(key, best);
  return best;
}
// Every bridge: the town's, then the new ones, as [u, v, bend].
const allMemo = new Map();
export function bridgesOf(q, added = []) {
  const key = JSON.stringify([q.nodes, q.bridges, added]);
  if (allMemo.has(key)) return allMemo.get(key);
  const all = q.bridges.map(([u, v, bend]) => [u, v, bend || 0]);
  for (const [u, v] of added) all.push([u, v, newBend(q, all, u, v)]);
  allMemo.set(key, all);
  return all;
}
export const degrees = (q, all) => { const d = Object.fromEntries(islandsOf(q).map(id => [id, 0])); for (const [u, v] of all) { d[u]++; d[v]++; } return d; };
export const oddIslands = (q, all = bridgesOf(q)) => { const d = degrees(q, all); return islandsOf(q).filter(id => d[id] % 2); };
export const deadEnds = q => { const d = degrees(q, bridgesOf(q)); return islandsOf(q).filter(id => d[id] === 1); };

// ---------------------------------------------------------------- walks
// A walk is its start and the bridges crossed in order (indices into the
// list of every bridge). `walkOf` replays it, or returns null if it is not a
// walk along bridges.
export function walkOf(all, start, path) {
  const uses = all.map(() => 0);
  let at = start;
  for (const i of path) {
    if (!integer(i) || i < 0 || i >= all.length) return null;
    const [u, v] = all[i];
    if (u !== at && v !== at) return null;
    at = u === at ? v : u;
    uses[i]++;
  }
  return {at, uses, crossed: uses.filter(n => n > 0).length, repeats: path.length - uses.filter(n => n > 0).length};
}
// The rest of a walk that crosses each unused bridge once, from `at` with
// `mask` used, ending anywhere (home null) or at home; null if none. Between
// two unused bridges on the same pair only the first is tried: they are
// interchangeable.
const finishMemo = new Map();
export function finishOnce(all, at, mask, home = null) {
  const full = (1 << all.length) - 1, key = JSON.stringify(all.map(([u, v]) => u + '|' + v)) + `#${home}`;
  if (!finishMemo.has(key)) finishMemo.set(key, new Map());
  const memo = finishMemo.get(key);
  const go = (x, m) => {
    if (m === full) return home === null || x === home ? [] : null;
    const k = `${x}|${m}`;
    if (memo.has(k)) { const hit = memo.get(k); return hit && [...hit]; }
    let found = null;
    const seen = new Set();
    for (let i = 0; i < all.length && !found; i++) {
      if (m & (1 << i)) continue;
      const [u, v] = all[i];
      if (u !== x && v !== x) continue;
      const y = u === x ? v : u;
      if (seen.has(y)) continue;
      seen.add(y);
      const rest = go(y, m | (1 << i));
      if (rest) found = [i, ...rest];
    }
    memo.set(k, found);
    return found && [...found];
  };
  return go(at, mask);
}
// The islands a walk over every bridge once can start from.
export const startsOf = all => [...new Set(all.flat().filter(x => typeof x === 'string'))].filter(s => finishOnce(all, s, 0) !== null);
export function walkStarts(q, all = bridgesOf(q)) { const ok = new Set(startsOf(all)); return islandsOf(q).filter(id => ok.has(id)); }

// Delivery routes: the fewest repeats to finish crossing every bridge from
// `at` with `mask` crossed and come back to home, by Dijkstra over
// (island, bridges crossed), with the bridges to cross.
export function finishDelivery(all, at, mask, home) {
  const full = (1 << all.length) - 1, key = (x, m) => `${x}|${m}`;
  const dist = new Map([[key(at, mask), 0]]), back = new Map(), queue = [[0, at, mask]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, x, m] = queue.shift();
    if (d > dist.get(key(x, m))) continue;
    if (m === full && x === home) {
      const steps = [];
      for (let k = key(x, m); back.has(k); k = back.get(k).from) steps.unshift(back.get(k).bridge);
      return {repeats: d, rest: steps};
    }
    const seen = new Set();
    for (let i = 0; i < all.length; i++) {
      const [u, v] = all[i];
      if (u !== x && v !== x) continue;
      const fresh = !(m & (1 << i)), y = u === x ? v : u;
      if (!fresh && seen.has(y)) continue;
      if (!fresh) seen.add(y);
      const nm = m | (1 << i), nd = d + (fresh ? 0 : 1);
      if (nd < (dist.get(key(y, nm)) ?? Infinity)) { dist.set(key(y, nm), nd); back.set(key(y, nm), {from: key(x, m), bridge: i}); queue.push([nd, y, nm]); }
    }
  }
  return null;
}
const fewestMemo = new Map();
export function fewestRepeats(q) {
  const key = JSON.stringify(q.bridges);
  if (!fewestMemo.has(key)) {
    const all = bridgesOf(q);
    fewestMemo.set(key, Math.min(...islandsOf(q).map(s => finishDelivery(all, s, 0, s)?.repeats ?? Infinity)));
  }
  return fewestMemo.get(key);
}
// The fewest new bridges for a walk that comes back: half the odd islands
// (each needs a new bridge end; a bridge has two; any pairing works).
export const fewestNew = q => oddIslands(q).length / 2;
// The new bridges a puzzle may hold.
const capOf = q => q.mode === 'add' ? q.budget : q.mode === 'fewest' ? MAX_NEW : 0;
const pathCap = (q, all) => q.mode === 'deliver' ? all.length * 3 : all.length;

// ---------------------------------------------------------------- the board
// {added, start, path, tried, colored, told, lock, shut, done}
// - added: new bridges [u, v] (add and fewest); start and path: the walk on
//   the board; tried: walks begun (each first crossing counts one).
// - colored: the islands coloured as starts (starts puzzles).
// - told: the answer to the last claim, until the next move: notall, other
//   (Done); walk, extra, missing (No walk); fewer, extra, missing (Fewest).
// - lock: No walk and Fewest wait for a new walk (tried > lock) after a
//   refusal; shut: Done waits for the coloured islands to change.
// - done: an accepted claim, {claim: 'starts' | 'none' | 'fewest', picks}.
const TOLD = {starts: ['notall', 'other', 'walk', 'extra', 'missing'], add: [], fewest: ['fewer', 'extra', 'missing'], deliver: ['fewer', 'extra', 'missing']};
function fresh() { return {added: [], start: null, path: [], tried: 0, colored: [], told: null, lock: 0, shut: null, done: null}; }
const keyOf = list => list.join(',');
function stateOf(q, b) {
  const all = bridgesOf(q, b.added), walk = b.start === null ? {at: null, uses: all.map(() => 0), crossed: 0, repeats: 0} : walkOf(all, b.start, b.path);
  return {all, walk};
}
// Is the walk on the board finished: every bridge crossed once (or at least
// once in a delivery), and back home where the puzzle asks for it?
function complete(q, all, b, walk) {
  if (!walk || b.start === null || !b.path.length) return false;
  const closed = q.mode === 'fewest' || q.mode === 'deliver';
  if (closed && walk.at !== b.start) return false;
  return q.mode === 'deliver' ? walk.uses.every(n => n >= 1) : walk.uses.every(n => n === 1);
}
// What a claim should be certified by.
const expected = q => q.mode === 'deliver' ? deadEnds(q) : oddIslands(q);
const claimRight = (q, b, all, walk) => q.mode === 'deliver' ? walk.repeats === fewestRepeats(q) : b.added.length === fewestNew(q);

function validBoard(q, b) {
  if (!object(b) || !Array.isArray(b.added) || !Array.isArray(b.path) || !Array.isArray(b.colored)) return false;
  if (b.added.length > capOf(q) || !b.added.every(e => Array.isArray(e) && e.length === 2 && isIsland(q, e[0]) && isIsland(q, e[1]) && e[0] !== e[1])) return false;
  if (!integer(b.tried) || b.tried < 0 || b.tried > 999 || !integer(b.lock) || b.lock < 0 || b.lock > 999) return false;
  if (b.start === null ? b.path.length !== 0 : !isIsland(q, b.start)) return false;
  const {all, walk} = stateOf(q, b);
  if (!walk || b.path.length > pathCap(q, all) || (q.mode !== 'deliver' && walk.uses.some(n => n > 1))) return false;
  if (b.path.length && b.tried < 1) return false;
  if (new Set(b.colored).size !== b.colored.length || !b.colored.every(id => isIsland(q, id)) || keyOf(b.colored) !== keyOf(sortIslands(q, b.colored))) return false;
  if (q.mode !== 'starts' && (b.colored.length || b.shut !== null)) return false;
  if (b.shut !== null && (typeof b.shut !== 'string' || (b.shut !== '' && !b.shut.split(',').every(id => isIsland(q, id))))) return false;
  if (b.told !== null) {
    if (!TOLD[q.mode].includes(b.told) || b.tried < 1 || b.done !== null) return false;
    const starts = walkStarts(q);
    if (b.told === 'notall' && !b.colored.some(id => !starts.includes(id))) return false;
    if (b.told === 'other' && !(b.colored.every(id => starts.includes(id)) && b.colored.length < starts.length)) return false;
    if (b.told === 'walk' && !starts.length) return false;
    if (q.mode === 'starts' && ['extra', 'missing'].includes(b.told) && starts.length) return false;
    if (q.mode !== 'starts' && !complete(q, all, b, walk)) return false;
    if (b.told === 'fewer' && claimRight(q, b, all, walk)) return false;
    if (q.mode !== 'starts' && ['extra', 'missing'].includes(b.told) && !claimRight(q, b, all, walk)) return false;
  }
  if (b.done !== null) {
    if (!object(b.done) || b.tried < 1 || q.mode === 'add') return false;
    const picks = b.done.picks;
    if (b.done.claim === 'starts') return q.mode === 'starts' && picks === undefined && b.colored.length > 0 && sameSet(b.colored, walkStarts(q));
    if (!Array.isArray(picks) || !sameSet(picks, expected(q)) || new Set(picks).size !== picks.length) return false;
    if (b.done.claim === 'none') return q.mode === 'starts' && !walkStarts(q).length && !b.colored.length;
    return b.done.claim === 'fewest' && ['fewest', 'deliver'].includes(q.mode) && complete(q, all, b, walk) && claimRight(q, b, all, walk);
  }
  return true;
}
const valid = (p, b) => MODES.includes(p.parameters.mode) && validBoard(p.parameters, b);
function solved(p, b) {
  if (!valid(p, b)) return false;
  const q = p.parameters;
  if (q.mode === 'add') { const {all, walk} = stateOf(q, b); return b.added.length === q.budget && complete(q, all, b, walk); }
  return b.done !== null;
}

// Moves. A move that is not a claim clears the last answer.
function walkMove(q, b, i) {
  const {all, walk} = stateOf(q, b);
  if (b.start === null || !integer(i) || i < 0 || i >= all.length) return null;
  const [u, v] = all[i];
  if (u !== walk.at && v !== walk.at) return null;
  if (q.mode !== 'deliver' && walk.uses[i]) return null;
  if (b.path.length >= pathCap(q, all)) return null;
  const next = {...b, path: [...b.path, i], tried: b.path.length ? b.tried : b.tried + 1, told: null};
  // A walk that picks up every counter colours its start.
  if (q.mode === 'starts' && next.path.length === all.length && !b.colored.includes(b.start)) next.colored = sortIslands(q, [...b.colored, b.start]);
  return next;
}
// The bridge a tap on a neighbouring island crosses: the first with its
// counter, or in a delivery the first of all.
function bridgeTo(q, b, id) {
  const {all, walk} = stateOf(q, b);
  const joins = all.map((e, i) => i).filter(i => (all[i][0] === walk.at && all[i][1] === id) || (all[i][1] === walk.at && all[i][0] === id));
  return joins.find(i => !walk.uses[i]) ?? (q.mode === 'deliver' ? joins[0] : undefined);
}
function moveBoard(q, b, action) {
  const {all, walk} = stateOf(q, b);
  switch (action.type) {
    case 'island': {
      if (!isIsland(q, action.island)) return null;
      if (b.start === null) return {...b, start: action.island, path: [], told: null};
      const i = bridgeTo(q, b, action.island);
      return i === undefined ? null : walkMove(q, b, i);
    }
    case 'bridge': return walkMove(q, b, action.bridge);
    case 'again': return b.start === null ? null : {...b, start: null, path: [], told: null};
    case 'color': {
      if (q.mode !== 'starts' || !isIsland(q, action.island)) return null;
      const colored = b.colored.includes(action.island) ? b.colored.filter(id => id !== action.island) : sortIslands(q, [...b.colored, action.island]);
      return {...b, colored, told: null};
    }
    case 'add': {
      if (!['add', 'fewest'].includes(q.mode) || !isIsland(q, action.u) || !isIsland(q, action.v) || action.u === action.v || b.added.length >= capOf(q)) return null;
      return {...b, added: [...b.added, [action.u, action.v]], start: null, path: [], told: null};
    }
    case 'remove': {
      const k = integer(action.bridge) ? action.bridge - q.bridges.length : -1;
      if (!['add', 'fewest'].includes(q.mode) || k < 0 || k >= b.added.length) return null;
      return {...b, added: b.added.filter((e, j) => j !== k), start: null, path: [], told: null};
    }
    case 'done': {
      if (q.mode !== 'starts' || !b.colored.length || b.tried < 1 || b.shut === keyOf(b.colored)) return null;
      const starts = walkStarts(q);
      if (sameSet(b.colored, starts)) return {...b, told: null, done: {claim: 'starts'}};
      return {...b, told: b.colored.some(id => !starts.includes(id)) ? 'notall' : 'other', shut: keyOf(b.colored)};
    }
    case 'check': {
      const picks = action.picks;
      if (!Array.isArray(picks) || !picks.length || !picks.every(id => isIsland(q, id)) || new Set(picks).size !== picks.length || b.tried <= b.lock) return null;
      const want = expected(q), sorted = sortIslands(q, picks);
      const verdict = picks.some(id => !want.includes(id)) ? 'extra' : picks.length < want.length ? 'missing' : null;
      if (action.claim === 'none') {
        if (q.mode !== 'starts' || b.colored.length) return null;
        if (walkStarts(q).length) return {...b, told: 'walk', lock: b.tried};
        return verdict ? {...b, told: verdict, lock: b.tried} : {...b, told: null, done: {claim: 'none', picks: sorted}};
      }
      if (action.claim === 'fewest') {
        if (!['fewest', 'deliver'].includes(q.mode) || !complete(q, all, b, walk)) return null;
        if (!claimRight(q, b, all, walk)) return {...b, told: 'fewer', lock: b.tried};
        return verdict ? {...b, told: verdict, lock: b.tried} : {...b, told: null, done: {claim: 'fewest', picks: sorted}};
      }
      return null;
    }
  }
  return null;
}
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const next = moveBoard(p.parameters, b, action);
  return next && valid(p, next) ? next : null;
}
// What a claim can be made on now (for the buttons and the hints).
export function claims(q, b) {
  const {all, walk} = stateOf(q, b);
  return {
    noWalk: q.mode === 'starts' && !b.colored.length && b.tried > b.lock,
    done: q.mode === 'starts' && b.colored.length > 0 && b.tried >= 1 && b.shut !== keyOf(b.colored),
    fewest: ['fewest', 'deliver'].includes(q.mode) && complete(q, all, b, walk) && b.tried > b.lock
  };
}

// ---------------------------------------------------------------- hints
const list = names => names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
// "A has 5 bridges, and B, C and D have 3 each."
function counted(q, ids) {
  const d = degrees(q, bridgesOf(q)), groups = [...new Set(ids.map(id => d[id]))].sort((a, b) => b - a).map(n => ids.filter(id => d[id] === n));
  const parts = groups.map(g => g.length === 1 ? `${g[0]} has ${d[g[0]]} ${d[g[0]] === 1 ? 'bridge' : 'bridges'}` : `${list(g)} have ${d[g[0]]} each`);
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')}, and ${parts.at(-1)}`;
}
const cross = (all, at, i) => { const [u, v] = all[i]; return {type: 'move', action: {type: 'bridge', bridge: i}, text: `Cross to ${u === at ? v : u}.`, bridge: i}; };
const again = text => ({type: 'move', action: {type: 'again'}, text});
const place = id => ({type: 'move', action: {type: 'island', island: id}, text: `Put the token on ${id}.`, island: id});
const maskOf = uses => uses.reduce((m, n, i) => n ? m | (1 << i) : m, 0);
// The next step of a walk over every bridge once from `start` (null: any of
// `starts`), toward a finish ending anywhere or back home.
function walkHint(q, b, all, walk, closed, starts) {
  if (b.start === null) return place(starts[0]);
  const home = closed ? b.start : null, rest = starts.includes(b.start) ? finishOnce(all, walk.at, maskOf(walk.uses), home) : null;
  if (rest && rest.length) return cross(all, walk.at, rest[0]);
  return again(b.path.length ? 'This walk can’t pick up every counter from here. Press Again.' : 'Press Again and start somewhere else.');
}
function claimHint(q, b, claim, text) {
  const picks = expected(q);
  return {type: 'move', action: {type: 'check', claim, picks}, text, picks, claim};
}
// The nearest way to pair the odd islands with new bridges: keep the
// child's new bridges (by index) that join two odd islands not yet paired.
function pairing(q, added) {
  const odd = oddIslands(q), used = new Set(), keep = [];
  added.forEach(([u, v], k) => { if (odd.includes(u) && odd.includes(v) && !used.has(u) && !used.has(v)) { keep.push(k); used.add(u); used.add(v); } });
  const rest = odd.filter(id => !used.has(id)), add = [];
  for (let k = 0; k < rest.length; k += 2) add.push([rest[k], rest[k + 1]]);
  return {keep, add};
}
const hintMemo = new Map();
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (!hintMemo.has(key)) { if (hintMemo.size > 400) hintMemo.clear(); hintMemo.set(key, hintFor(p.parameters, b)); }
  return hintMemo.get(key);
}
function hintFor(q, b) {
  const {all, walk} = stateOf(q, b), can = claims(q, b);
  if (q.mode === 'starts') {
    const starts = walkStarts(q), odd = oddIslands(q);
    const wrong = b.colored.find(id => !starts.includes(id));
    if (wrong) return {type: 'move', action: {type: 'color', island: wrong}, text: `No walk over every bridge can start on ${wrong}. Uncolor it.`, island: wrong};
    if (!starts.length) {
      // Walk until stuck; then the reason, and the claim.
      const next = b.start === null ? -1 : all.findIndex((e, i) => !walk.uses[i] && (e[0] === walk.at || e[1] === walk.at));
      if (next >= 0) return cross(all, walk.at, next);
      if (can.noWalk) return claimHint(q, b, 'none', `Count the bridges: ${counted(q, odd)}. A walk can start or end only on an island with an odd number of bridges, and it has just two ends. Press No walk, tap ${list(odd)} and Check.`);
      return b.start === null ? place(odd[0]) : again('Press Again and try another walk.');
    }
    const missing = starts.filter(id => !b.colored.includes(id));
    if (!missing.length && b.tried >= 1) return {type: 'move', action: {type: 'done'}, text: 'Every island a walk can start from is colored. Press Done.'};
    // Done waits for a walk.
    if (!missing.length) return walkHint(q, b, all, walk, false, starts);
    // A start in hand: the rest follow from the bridges.
    if (b.colored.length && b.start === null) {
      const text = odd.length ? `${list(odd)} have an odd number of bridges, and a walk over every bridge runs from one of them to the other. Color ${missing[0]}.` : `Every island has an even number of bridges, so a walk can start anywhere and come back. Color ${missing[0]}.`;
      return {type: 'move', action: {type: 'color', island: missing[0]}, text, island: missing[0]};
    }
    if (b.start !== null && (b.colored.includes(b.start) || !finishOnce(all, walk.at, maskOf(walk.uses)))) return again(b.colored.includes(b.start) ? 'Press Again and start somewhere else.' : 'This walk can’t pick up every counter from here. Press Again.');
    return walkHint(q, b, all, walk, false, missing);
  }
  if (q.mode === 'add') {
    const works = added => walkStarts(q, bridgesOf(q, added)).length > 0;
    if (b.added.length && !works(b.added)) return {type: 'move', action: {type: 'remove', bridge: q.bridges.length}, text: `With this new bridge there is still no walk. Take it away.`, bridge: q.bridges.length};
    if (!b.added.length) {
      const [u, v] = pairing(q, []).add[0];
      return {type: 'move', action: {type: 'add', u, v}, text: `Add a bridge from ${u} to ${v}.`, pair: [u, v]};
    }
    return walkHint(q, b, all, walk, false, walkStarts(q, all));
  }
  if (q.mode === 'fewest') {
    const {keep, add} = pairing(q, b.added), extra = b.added.findIndex((e, k) => !keep.includes(k));
    if (extra >= 0) { const [u, v] = b.added[extra]; return {type: 'move', action: {type: 'remove', bridge: q.bridges.length + extra}, text: `Take away the new bridge from ${u} to ${v}.`, bridge: q.bridges.length + extra}; }
    if (add.length) { const [u, v] = add[0]; return {type: 'move', action: {type: 'add', u, v}, text: `Add a bridge from ${u} to ${v}.`, pair: [u, v]}; }
    if (can.fewest) return claimHint(q, b, 'fewest', `Count the bridges: ${counted(q, oddIslands(q))}. Each of these islands needs a new bridge, and a new bridge reaches only two islands, so ${fewestNew(q)} is the fewest. Press Fewest, tap ${list(oddIslands(q))} and Check.`);
    if (complete(q, all, b, walk)) return again('Press Again and walk it once more.');
    return walkHint(q, b, all, walk, true, islandsOf(q));
  }
  // A delivery route.
  const best = fewestRepeats(q), ends = deadEnds(q);
  if (can.fewest && walk.repeats === best) return claimHint(q, b, 'fewest', `${list(ends)} are dead ends: the truck must come back over each one’s bridge, so ${best} is the fewest. Press Fewest, tap ${list(ends)} and Check.`);
  if (b.start === null) return place(islandsOf(q).find(s => finishDelivery(all, s, 0, s)?.repeats === best));
  if (complete(q, all, b, walk)) return again(walk.repeats > best ? 'Fewer repeats can work. Press Again.' : 'Press Again and walk it once more.');
  const rest = finishDelivery(all, walk.at, maskOf(walk.uses), b.start);
  if (!rest || walk.repeats + rest.repeats > best) return again('This route needs more repeats than it has to. Press Again.');
  return cross(all, walk.at, rest.rest[0]);
}

// ---------------------------------------------------------------- view state
// The tool (walk, color or bridge), the first island of a new bridge, and a
// claim being certified with the islands tapped for it. None of it is saved.
const views = new Map();
const defaultTool = q => ['add', 'fewest'].includes(q.mode) ? 'bridge' : 'walk';
function view(p, b) {
  if (!views.has(p.id)) views.set(p.id, {tool: defaultTool(p.parameters), first: null, claiming: null, picks: [], key: null, seen: null});
  const v = views.get(p.id);
  // A claim and its taps are about the board they started on.
  const seen = JSON.stringify(b);
  if (v.claiming && v.key !== seen) Object.assign(v, {claiming: null, picks: []});
  if (v.first && (!isIsland(p.parameters, v.first) || v.tool !== 'bridge')) v.first = null;
  v.seen = seen;
  return v;
}

// ---------------------------------------------------------------- render
// Where each bridge's counter sits: its middle, unless another bridge crosses
// there (a new bridge bent around an island can cross one), then the nearest
// point along it that is clear.
const along = ({a, b, c}, t) => { const s = 1 - t; return c ? [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]] : [s * a[0] + t * b[0], s * a[1] + t * b[1]]; };
const spotMemo = new Map();
function counterSpots(g) {
  const key = JSON.stringify([g.pos, g.edges]);
  if (spotMemo.has(key)) return spotMemo.get(key);
  const shapes = g.edges.map(e => edgeGeometry(g, e)), samples = shapes.map(s => Array.from({length: 33}, (_, k) => along(s, k / 32)));
  const spots = shapes.map((shape, i) => {
    let best = null, room = -1;
    for (const t of [.5, .42, .58, .34, .66, .27, .73]) {
      const at = along(shape, t), gap = Math.min(...samples.flatMap((pts, j) => j === i ? [] : pts.map(([x, y]) => Math.hypot(x - at[0], y - at[1]))));
      if (gap >= 5 * g.k) return at;
      if (gap > room) { room = gap; best = at; }
    }
    return best;
  });
  if (spotMemo.size > 200) spotMemo.clear();
  spotMemo.set(key, spots);
  return spots;
}
const TOOLS = {starts: [['walk', 'Walk'], ['color', 'Color']], add: [['walk', 'Walk'], ['bridge', 'Bridge']], fewest: [['walk', 'Walk'], ['bridge', 'Bridge']], deliver: []};
const SAY = {
  notall: 'One of these can’t start a walk.', other: 'There is another.',
  walk: 'There is a walk.', missing: 'There is another.',
  fewer: {fewest: 'Fewer new bridges can work.', deliver: 'Fewer repeats can work.'},
  extra: {starts: 'A walk can pass through one of these.', fewest: 'One of these doesn’t need a new bridge.', deliver: 'One of these isn’t a dead end.'}
};
const PROMPT = {starts: 'Tap every island a walk would have to start or end on.', fewest: 'Tap every island that needs a new bridge.', deliver: 'Tap every dead end.'};
const CAPTION = {none: 'A walk has only two ends.', fewest: 'A new bridge has only two ends.', deliver: 'Each dead end’s bridge is crossed twice.'};
const said = (q, kind) => { const s = SAY[kind]; return typeof s === 'string' ? s : s[q.mode]; };
const button = (label, action, cls, enabled, extra = '') => `<button type="button" class="secondary isl-button ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="isl-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
const uiButton = (label, payload, cls, enabled, extra = '') => `<button type="button" class="secondary isl-button ${cls}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="isl-${cls.split(' ')[0]}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), v = view(p, b);
  const {all, walk} = stateOf(q, b), can = claims(q, b), g = graphOf(specOf(q, all));
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action || {};
  const claiming = !done && v.claiming, picks = claiming ? v.picks : b.done?.picks || [];
  const d = degrees(q, bridgesOf(q)), lit = done && b.done ? (b.done.claim === 'starts' ? oddIslands(q) : b.done.picks) : [];
  const tool = v.tool;
  const reach = id => {
    if (b.start === null) return true;
    return all.some(([u, w], i) => ((u === walk.at && w === id) || (w === walk.at && u === id)) && (q.mode === 'deliver' || !walk.uses[i]));
  };
  const hintedIsland = id => (['island', 'color'].includes(act.type) && act.island === id) || (act.type === 'add' && [act.u, act.v].includes(id)) || (act.type === 'check' && claiming && shown.picks.includes(id));
  const nodeLook = id => {
    const cls = [
      b.colored.includes(id) ? 'colored' : '',
      walk.at === id && b.start !== null ? 'here' : '',
      b.start === id && b.path.length ? 'start' : '',
      picks.includes(id) || v.first === id ? 'picked' : '',
      lit.includes(id) ? 'lit' : '',
      hintedIsland(id) ? 'hinted' : ''
    ].filter(Boolean).join(' ');
    const badge = done ? String(d[id]) : '';
    let control = false, label = `Island ${id}`;
    if (!done) {
      if (claiming) { control = true; label += picks.includes(id) ? ', tapped. Untap it' : '. Tap it'; }
      else if (tool === 'color') { control = true; label += b.colored.includes(id) ? ', colored. Uncolor it' : '. Color it'; }
      else if (tool === 'bridge') { control = true; label += v.first === id ? ', a new bridge starts here. Cancel' : v.first ? `. New bridge from ${v.first} to ${id}` : '. Start a new bridge here'; }
      else if (reach(id) && walk.at !== id) { control = true; label += b.start === null ? '. Put the token here' : '. Cross to it'; }
    }
    if (b.colored.includes(id) && !label.includes('colored')) label += ', colored';
    if (walk.at === id && b.start !== null) label += ', the token is here';
    if (done) label += `, ${d[id]} ${d[id] === 1 ? 'bridge' : 'bridges'}`;
    return {cls, act: control, label, badge, text: esc(id)};
  };
  const edgeLook = i => {
    const [u, w] = all[i], used = walk.uses[i], isNew = i >= q.bridges.length;
    const cls = [used ? 'crossed' : '', isNew ? 'new' : '', (act.type === 'bridge' || act.type === 'remove') && act.bridge === i ? 'hinted' : ''].filter(Boolean).join(' ');
    let control = false, label = `${isNew ? 'New bridge' : 'Bridge'} ${u} to ${w}${used ? (used > 1 ? `, crossed ${used} times` : ', crossed') : ''}`;
    if (!done && !claiming) {
      if (tool === 'bridge' && isNew) { control = true; label += '. Take it away'; }
      else if (tool === 'walk' && b.start !== null && (u === walk.at || w === walk.at) && (q.mode === 'deliver' || !used)) { control = true; label += '. Cross it'; }
    }
    return {cls, act: control, label, strokes: used ? ['walked'] : [], tag: used > 1 ? `×${used}` : null};
  };
  // A counter on every bridge not yet crossed.
  const spots = counterSpots(g);
  const counters = all.map((e, i) => walk.uses[i] ? '' : `<circle class="isl-counter" cx="${spots[i][0].toFixed(2)}" cy="${spots[i][1].toFixed(2)}" r="${(2.2 * g.k).toFixed(2)}"/>`).join('');
  const board = graphBoard(g, {cls: `isl-map mode-${q.mode}${claiming ? ' claiming' : ''}${done ? ' solved' : ''}`, label: 'Map of islands and bridges', node: nodeLook, edge: edgeLook, over: counters});

  const tools = !done && TOOLS[q.mode].length ? `<div class="isl-tools" role="group" aria-label="Tool">${TOOLS[q.mode].map(([id, name]) => uiButton(name, {tool: id}, `tool-${id}${tool !== id && ((id === 'color' && act.type === 'color') || (id === 'bridge' && ['add', 'remove'].includes(act.type)) || (id === 'walk' && ['island', 'bridge'].includes(act.type))) ? ' hinted' : ''}`, !claiming, `aria-pressed="${tool === id}"`)).join('')}</div>` : '';
  const claimName = q.mode === 'starts' ? 'No walk' : 'Fewest', claimKind = q.mode === 'starts' ? 'none' : 'fewest';
  const hintClaim = act.type === 'check';
  const bar = done ? '' : `<div class="isl-bar">${
    claiming ? '' : button('<span aria-hidden="true">↺</span> Again', {type: 'again'}, `again${act.type === 'again' ? ' hinted' : ''}`, b.start !== null)
  }${q.mode === 'add' ? '' : uiButton(claimName, {claim: claiming ? null : claimKind}, `claim${hintClaim && !claiming ? ' hinted' : ''}`, claiming || (q.mode === 'starts' ? can.noWalk : can.fewest), `aria-pressed="${Boolean(claiming)}"`)}${
    claiming ? button('Check', {type: 'check', claim: claimKind, picks: v.picks}, `check${hintClaim ? ' hinted' : ''}`, v.picks.length > 0) : q.mode === 'starts' ? button('Done', {type: 'done'}, `done${act.type === 'done' ? ' hinted' : ''}`, can.done) : ''
  }</div>`;
  let say = '';
  if (claiming) say = PROMPT[q.mode];
  else if (b.told) say = said(q, b.told);
  else if (done && b.done && b.done.claim !== 'starts') say = CAPTION[b.done.claim === 'none' ? 'none' : q.mode === 'deliver' ? 'deliver' : 'fewest'];
  const status = done ? `Solved.${lit.length ? ` Lit: ${list(lit)}.` : ''}` : `${b.start === null ? 'The token is off the map.' : `The token is on ${walk.at}.`} ${walk.crossed} of ${all.length} bridges crossed${q.mode === 'deliver' ? `, ${walk.repeats} ${walk.repeats === 1 ? 'repeat' : 'repeats'}` : ''}.${b.colored.length ? ` Colored: ${list(b.colored)}.` : ''}${b.added.length ? ` ${b.added.length} new ${b.added.length === 1 ? 'bridge' : 'bridges'}.` : ''}`;
  return `<div class="isl-puzzle" data-mechanic-wire="islands">${tools}${board}${bar}<p class="isl-say${b.told && !claiming ? ' told' : ''}" ${say ? '' : 'hidden'}>${esc(say)}</p><p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// ---------------------------------------------------------------- gestures
function wire(root, p, api) {
  const q = p.parameters;
  wireGraph(root, {
    nearest: true,
    node: id => {
      const b = api.attempt().board, v = view(p, b);
      if (solved(p, b)) return null;
      if (v.claiming) { v.picks = v.picks.includes(id) ? v.picks.filter(x => x !== id) : [...v.picks, id]; api.ui({}); return null; }
      if (v.tool === 'color') return {type: 'color', island: id};
      if (v.tool === 'bridge') {
        if (v.first === null || v.first === id) { v.first = v.first === id ? null : id; api.ui({}); return null; }
        const action = {type: 'add', u: v.first, v: id};
        v.first = null;
        // With the one new bridge in place, the next taps walk.
        if (q.mode === 'add' && b.added.length + 1 >= q.budget) v.tool = 'walk';
        return action;
      }
      return {type: 'island', island: id};
    },
    edge: i => {
      const b = api.attempt().board, v = view(p, b);
      if (solved(p, b) || v.claiming) return null;
      return v.tool === 'bridge' ? {type: 'remove', bridge: i} : v.tool === 'walk' ? {type: 'bridge', bridge: i} : null;
    }
  }, action => { if (move(p, api.attempt().board, action)) api.apply(action); });
}
// A claim is about the board it starts on (the one last drawn).
function ui(p, payload) {
  const v = views.get(p.id);
  if (!v || !object(payload)) return;
  if (TOOLS[p.parameters.mode].some(([id]) => id === payload.tool)) Object.assign(v, {tool: payload.tool, first: null});
  if ('claim' in payload) Object.assign(v, {claiming: ['none', 'fewest'].includes(payload.claim) ? payload.claim : null, picks: [], first: null, key: v.seen});
}

// Undo takes back moves, never a claim's lock: No walk and Fewest still wait
// for a new walk, and Done for a change of colors. The answer itself goes, so
// the step Undo takes back is always visible.
function carry(p, from, to) {
  if (!object(from) || !object(to)) return to;
  return {...to, lock: Math.max(to.lock, from.lock), shut: from.shut ?? to.shut, told: null};
}

export const islandMechanics = {
  islands: {
    fresh: () => fresh(), valid, solved, move, hint, render, wire, carry, ui,
    reset: p => { views.delete(p.id); }
  }
};

// The family seam entry (dist/families.js). The puzzles join Bridge Courier
// as its Islands group.
export default {
  id: 'islands',
  mechanics: islandMechanics,
  pack: new URL('./islands.json', import.meta.url).href,
  css: new URL('./islands.css', import.meta.url).href,
  // After a move, focus goes to the map, or to Again when the map has no
  // control left; never to a claim.
  focus: '.isl-map .gb-node[role=button],.isl-map .gb-hit,.isl-puzzle .isl-button.again:not([disabled])'
};
