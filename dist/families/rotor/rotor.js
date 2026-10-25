// Flip switches (worksheet Week 91, rotor-router machines). Counters drop in at
// the top of a complete binary tree of switches, one at a time. Each switch
// points down one of its two roads; a counter follows it and the switch then
// flips to the other road. The exits at the bottom are lettered from the left.
// A switch takes turns, so at every switch consecutive visits leave on
// opposite sides. On a complete tree of depth d this makes every block of 2^d
// counters reach each exit once, and a full order is possible exactly when it
// alternates at every switch: the first counter through each switch shows its
// starting side, so each of the 2^(2^d − 1) starts makes its own order.
//
// Puzzles:
//   make   set every switch, then Send counters to make a named order (some
//          letters may be left open); or press Can't and tap a switch and two
//          letters that would leave it the same way on consecutive visits;
//   every  find every order that fits a pattern (Keep each one), judged as a
//          whole by That's all.
// The playground has the one-, four- and eight-exit trees and no target.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, wireGraph, NODE_R} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['make', 'every', 'playground'];
export const DEPTHS = [1, 2, 3];
export const SIDES = ['L', 'R'];
export const switchCount = d => 2 ** d - 1;
export const exitCount = d => 2 ** d;
export const letterOf = k => String.fromCharCode(65 + k);
export const leafOf = letter => letter.charCodeAt(0) - 65;
export const switchId = i => `s${i}`;
export const switchIndex = id => /^s\d+$/.test(id) ? Number(id.slice(1)) : -1;
// The playground keeps at most two blocks, and at least 8 counters.
export const playCap = d => Math.max(8, 2 * exitCount(d));
const flip = side => side === 'L' ? 'R' : 'L';

// --- The machine ---------------------------------------------------------------
// Switches are numbered in level order (0 is the top switch; the switches
// below switch i are 2i + 1 on the left and 2i + 2 on the right), as the
// worksheet guide lists cards. A start gives each switch 'L' or 'R'.
// run() sends `count` counters and returns where each one landed (exit
// numbers), the switches afterwards, and each counter's trip (the switches it
// passed, then its exit).
export function run(d, start, count) {
  const n = switchCount(d), now = [...start], arrivals = [], trips = [];
  for (let c = 0; c < count; c++) {
    let at = 0;
    const trip = [];
    while (at < n) {
      trip.push(at);
      const side = now[at];
      now[at] = flip(side);
      at = 2 * at + (side === 'L' ? 1 : 2);
    }
    arrivals.push(at - n);
    trips.push(trip);
  }
  return {arrivals, now, trips};
}
export const lettersOf = (d, start, count) => run(d, start, count).arrivals.map(letterOf);
// Every start, in the guide's card order (the top switch first, L before R).
const startCache = new Map();
export function allStarts(d) {
  if (startCache.has(d)) return startCache.get(d);
  const n = switchCount(d), out = [];
  for (let k = 0; k < 2 ** n; k++) out.push(Array.from({length: n}, (_, i) => (k >> (n - 1 - i)) & 1 ? 'R' : 'L'));
  startCache.set(d, out);
  return out;
}
// A target is a list of letters, with null for a slot left open.
export const fits = (target, letters) => letters.every((x, i) => target[i] === null || target[i] === x);
const fitCache = new Map();
export function startsFitting(d, target) {
  const key = `${d}:${JSON.stringify(target)}`;
  if (fitCache.has(key)) return fitCache.get(key);
  const out = allStarts(d).filter(s => fits(target, lettersOf(d, s, target.length)));
  fitCache.set(key, out);
  return out;
}
export const possible = (d, target) => startsFitting(d, target).length > 0;
// The orders a pattern allows, in start order.
export const ordersFitting = (d, target) => startsFitting(d, target).map(s => lettersOf(d, s, target.length).join(''));

// --- Can't certificates ----------------------------------------------------------
// The exits below switch i, and the side of i that exit k lies on (null when k
// is not below i).
export function sideAt(d, i, k) {
  let at = switchCount(d) + k;
  while (at > 0) {
    const up = Math.floor((at - 1) / 2);
    if (up === i) return at === 2 * i + 1 ? 'L' : 'R';
    at = up;
  }
  return null;
}
export const exitsBelow = (d, i) => Array.from({length: exitCount(d)}, (_, k) => k).filter(k => sideAt(d, i, k) !== null);
// A claim that the target is impossible: switch i and the target's slots a
// and b. It holds when both letters pass switch i on the same side and every
// slot between them is a letter that doesn't pass it, so the two would be
// consecutive visits that leave the same way. Otherwise it names what fails:
// 'open' (a chosen slot is open), 'off' (a letter never passes the switch),
// 'apart' (they leave on different sides) or 'between' (a counter between
// them passes the switch, or an open slot's counter might). A claim can hold
// only when no start makes the target, so on a target some start can make
// every claim gets one of these, and Can't gives nothing away.
export function certify(d, target, i, a, b) {
  const [x, y] = a < b ? [a, b] : [b, a];
  const lx = target[x], ly = target[y];
  if (lx === null || ly === null) return 'open';
  const sx = sideAt(d, i, leafOf(lx)), sy = sideAt(d, i, leafOf(ly));
  if (sx === null || sy === null) return 'off';
  if (sx !== sy) return 'apart';
  for (let k = x + 1; k < y; k++) if (target[k] === null || sideAt(d, i, leafOf(target[k])) !== null) return 'between';
  return 'ok';
}
export const VERDICTS = ['open', 'off', 'apart', 'between'];
// Every valid claim, earliest proof first (by its later slot, then by switch).
export function certificates(d, target) {
  const out = [];
  for (let i = 0; i < switchCount(d); i++) for (let a = 0; a < target.length; a++) for (let b = a + 1; b < target.length; b++) if (certify(d, target, i, a, b) === 'ok') out.push({node: switchId(i), at: [a, b]});
  return out.sort((u, v) => u.at[1] - v.at[1] || switchIndex(u.node) - switchIndex(v.node) || u.at[0] - v.at[0]);
}

// --- Names ---------------------------------------------------------------------------
const listWords = list => list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
export const switchName = (d, i) => d === 1 ? 'the switch' : i === 0 ? 'the top switch' : `the switch above ${listWords(exitsBelow(d, i).map(letterOf))}`;
const sideWord = side => side === 'L' ? 'left' : 'right';
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// --- Boards -----------------------------------------------------------------------------
// make:       {start, sent, told, claim}
// every:      {start, sent, kept, told, done}
// playground: {depth, start, sent}
// `start` holds each switch's first side (null until set); switches can be set
// only before the first counter. In make, `told` is the line a refused Can't
// leaves (its verdict: 'open', 'off', 'apart' or 'between', the same kind of
// answer whether or not some start can make the order; the next move takes it
// away), and `claim` is the accepted claim. In every, `kept` is the shelf of orders and `told` 'more'
// is a refused That's all, kept while the shelf is the same.
const depthOf = (p, b) => p.parameters.mode === 'playground' ? b.depth : p.parameters.depth;
const lengthOf = (p, b) => p.parameters.mode === 'playground' ? playCap(b.depth) : p.parameters.target.length;
const isStart = (d, start) => Array.isArray(start) && start.length === switchCount(d) && start.every(s => s === null || SIDES.includes(s));
const allSet = start => start.every(s => s !== null);
export function stateOf(p, b) {
  const d = depthOf(p, b), ran = allSet(b.start) ? run(d, b.start, b.sent) : {arrivals: [], now: [...b.start], trips: []};
  return {d, letters: ran.arrivals.map(letterOf), now: ran.now, last: ran.trips.at(-1) ? [...ran.trips.at(-1), switchCount(d) + ran.arrivals.at(-1)] : null, length: lengthOf(p, b)};
}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {depth: 1, start: [null], sent: 0};
  const start = Array(switchCount(q.depth)).fill(null);
  if (q.mode === 'every') return {start, sent: 0, kept: [], told: null, done: false};
  return {start, sent: 0, told: null, claim: null};
}
// Whether some claim on this target gets this verdict (a saved line must be one
// the app could have given).
const someClaim = (q, verdict) => {
  for (let i = 0; i < switchCount(q.depth); i++) for (let a = 0; a < q.target.length; a++) for (let b = a + 1; b < q.target.length; b++) if (certify(q.depth, q.target, i, a, b) === verdict) return true;
  return false;
};
const isOrder = (q, word) => typeof word === 'string' && word.length === q.target.length && ordersFitting(q.depth, q.target).includes(word);
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    if (!DEPTHS.includes(b.depth) || !isStart(b.depth, b.start)) return false;
    return Number.isInteger(b.sent) && b.sent >= 0 && b.sent <= playCap(b.depth) && (b.sent === 0 || allSet(b.start));
  }
  if (!isStart(q.depth, b.start) || !Number.isInteger(b.sent) || b.sent < 0 || b.sent > q.target.length || (b.sent > 0 && !allSet(b.start))) return false;
  if (q.mode === 'every') {
    if (!Array.isArray(b.kept) || !b.kept.every(w => isOrder(q, w)) || new Set(b.kept).size !== b.kept.length) return false;
    if (typeof b.done !== 'boolean' || (b.told !== null && b.told !== 'more')) return false;
    const all = ordersFitting(q.depth, q.target).length;
    if (b.done) return b.told === null && b.kept.length === all;
    return b.told !== 'more' || (b.kept.length > 0 && b.kept.length < all);
  }
  if (b.told !== null && (!VERDICTS.includes(b.told) || b.sent === 0 || b.claim !== null || !someClaim(q, b.told))) return false;
  if (b.claim === null) return true;
  if (!object(b.claim) || b.sent === 0) return false;
  const {node, at} = b.claim, i = switchIndex(node);
  return i >= 0 && i < switchCount(q.depth) && Array.isArray(at) && at.length === 2 && at.every(k => Number.isInteger(k) && k >= 0 && k < q.target.length) && at[0] < at[1] && certify(q.depth, q.target, i, at[0], at[1]) === 'ok';
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'every') return b.done;
  if (b.claim) return true;
  const st = stateOf(p, b);
  return b.sent === q.target.length && fits(q.target, st.letters);
}
export const cantOpen = (p, b) => p.parameters.mode === 'make' && b.sent > 0 && !b.claim;
const settable = (p, b) => b.sent === 0 && !solved(p, b);
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const d = depthOf(p, b), n = switchCount(d);
  const keep = q.mode === 'make' ? {told: null} : q.mode === 'every' ? {told: b.told} : {};
  if (action.type === 'flip' || action.type === 'set') {
    const i = switchIndex(action.node);
    if (!settable(p, b) || i < 0 || i >= n) return null;
    const side = action.type === 'flip' ? (b.start[i] === 'L' ? 'R' : 'L') : action.side;
    if (!SIDES.includes(side) || b.start[i] === side) return null;
    const start = [...b.start];
    start[i] = side;
    return {...b, ...keep, start};
  }
  if (action.type === 'send') {
    if (!allSet(b.start) || b.sent >= lengthOf(p, b)) return null;
    return {...b, ...keep, sent: b.sent + 1};
  }
  if (q.mode === 'make' && action.type === 'cant') {
    const i = switchIndex(action.node), at = action.at;
    if (!cantOpen(p, b) || i < 0 || i >= n || !Array.isArray(at) || at.length !== 2 || !at.every(k => Number.isInteger(k) && k >= 0 && k < q.target.length) || at[0] === at[1]) return null;
    const pair = [Math.min(...at), Math.max(...at)], verdict = certify(d, q.target, i, pair[0], pair[1]);
    return verdict === 'ok' ? {...b, told: null, claim: {node: switchId(i), at: pair}} : {...b, told: verdict};
  }
  if (q.mode === 'every') {
    if (action.type === 'keep') {
      const word = stateOf(p, b).letters.join('');
      if (b.sent !== q.target.length || !isOrder(q, word) || b.kept.includes(word)) return null;
      return {...b, sent: 0, kept: [...b.kept, word], told: null};
    }
    if (action.type === 'all') {
      if (!b.kept.length || b.told === 'more') return null;
      return b.kept.length === ordersFitting(d, q.target).length ? {...b, done: true, told: null} : {...b, told: 'more'};
    }
    return null;
  }
  if (q.mode === 'playground') {
    if (action.type === 'tree') {
      if (!DEPTHS.includes(action.depth) || action.depth === b.depth) return null;
      return {depth: action.depth, start: Array(switchCount(action.depth)).fill(null), sent: 0};
    }
    if (action.type === 'clear') return b.sent > 0 ? {...b, sent: 0} : null;
  }
  return null;
}

// --- Hints ------------------------------------------------------------------------------------
// Toward a start: the first switch (in level order) that differs, else Send.
// Among several starts that would do, aim for the one with the fewest changes.
const changes = (from, to) => to.reduce((n, s, i) => n + (from[i] !== s), 0);
const nearest = (from, starts) => starts.reduce((best, s) => changes(from, s) < changes(from, best) ? s : best, starts[0]);
function toward(d, b, goal) {
  const i = goal.findIndex((s, k) => b.start[k] !== s);
  if (i < 0) return {type: 'move', action: {type: 'send'}, text: 'Send a counter.'};
  return {type: 'move', action: {type: 'set', node: switchId(i), side: goal[i]}, text: `Point ${switchName(d, i)} to the ${sideWord(goal[i])}.`, nodes: [switchId(i)]};
}
// The start that matches a target for longest before it goes wrong.
function longestTry(d, target) {
  let best = null, reach = -1;
  for (const s of allStarts(d)) {
    const letters = lettersOf(d, s, target.length);
    let k = 0;
    while (k < target.length && (target[k] === null || target[k] === letters[k])) k++;
    if (k > reach) { reach = k; best = s; }
  }
  return best;
}
const undoHint = text => ({type: 'deadend', quiet: true, text});
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'note'};
  if (solved(p, b)) return {type: 'done'};
  const d = q.depth, st = stateOf(p, b), letters = st.letters;
  if (q.mode === 'make') {
    if (possible(d, q.target)) {
      if (b.sent === 0) return toward(d, b, nearest(b.start, startsFitting(d, q.target)));
      return fits(q.target, lettersOf(d, b.start, q.target.length)) ? toward(d, b, b.start) : undoHint('This start makes a different order. Undo.');
    }
    // No start can: try one first, then claim with the reason.
    if (b.sent === 0) return toward(d, b, b.start.every(s => s !== null) ? b.start : longestTry(d, q.target));
    const c = certificates(d, q.target)[0], i = switchIndex(c.node), [x, y] = c.at.map(k => q.target[k]);
    return {type: 'move', action: {type: 'cant', node: c.node, at: c.at}, text: `${x} and ${y} would both go ${sideWord(sideAt(d, i, leafOf(x)))} at ${switchName(d, i)}, one after the other, and a switch takes turns. Press Can’t, then tap that switch, ${x} and ${y}.`, nodes: [c.node], at: c.at};
  }
  // Every: keep each missing order, then That's all.
  const all = ordersFitting(d, q.target);
  if (b.kept.length === all.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  if (b.sent === 0) {
    const missing = startsFitting(d, q.target).filter(s => !b.kept.includes(lettersOf(d, s, q.target.length).join('')));
    return toward(d, b, nearest(b.start, missing));
  }
  const word = lettersOf(d, b.start, q.target.length).join('');
  if (!all.includes(word)) return undoHint('This start makes an order that doesn’t fit. Undo.');
  if (b.kept.includes(word)) return undoHint('This order is kept already. Undo.');
  return b.sent === q.target.length ? {type: 'move', action: {type: 'keep'}, text: 'Press Keep.'} : toward(d, b, b.start);
}

// --- Drawing ----------------------------------------------------------------------------------
// Each depth has one tree drawing: the top switch under the entry, levels
// below it, and the exits along the bottom with room for their counters.
const LAYOUT = {
  1: {xs: [28, 72], gap: 22, scale: 1, slots: 4},
  2: {xs: [14, 38, 62, 86], gap: 18, scale: 1, slots: 2},
  3: {xs: [7, 19.29, 31.57, 43.86, 56.14, 68.43, 80.71, 93], gap: 14, scale: .8, slots: 2}
};
const ENTRY = 8, DROP = 13;
const geometry = new Map();
export function treeOf(d) {
  if (geometry.has(d)) return geometry.get(d);
  const L = LAYOUT[d], n = switchCount(d), k = L.scale, pos = {};
  const xOf = i => {
    // A switch sits over the middle of the exits below it.
    const below = exitsBelow(d, i);
    return (L.xs[below[0]] + L.xs[below.at(-1)]) / 2;
  };
  const levelOf = i => Math.floor(Math.log2(i + 1));
  for (let i = 0; i < n; i++) pos[switchId(i)] = [xOf(i), ENTRY + DROP + levelOf(i) * L.gap];
  const leafY = ENTRY + DROP + d * L.gap;
  L.xs.forEach((x, k2) => { pos[letterOf(k2)] = [x, leafY]; });
  const bottom = leafY + (NODE_R + 3.4 + (L.slots - 1) * 5.6 + 2.6) * k + 3;
  const height = bottom, aspect = 100 / height;
  const nodes = Object.fromEntries(Object.entries(pos).map(([id, [x, y]]) => [id, [x, y / height * 100]]));
  const edges = [];
  for (let i = 0; i < n; i++) for (const c of [2 * i + 1, 2 * i + 2]) edges.push([switchId(i), c < n ? switchId(c) : letterOf(c - n)]);
  const g = graphOf({nodes, edges, aspect, scale: k});
  const tree = {g, d, n, k, slots: L.slots, entry: [50, ENTRY]};
  geometry.set(d, tree);
  return tree;
}
// The road from switch i to its side.
const roadOf = (i, side) => 2 * i + (side === 'L' ? 0 : 1);
const childOf = (d, i, side) => { const c = 2 * i + (side === 'L' ? 1 : 2), n = switchCount(d); return c < n ? switchId(c) : letterOf(c - n); };
const f = n => Number(n.toFixed(2));
const pt = ([x, y]) => `${f(x)},${f(y)}`;
// A switch's card: a disc with an arrow toward the road it points down.
function card(tree, id, side) {
  const [x, y] = tree.g.pos[id], k = tree.k, s = side === 'L' ? -1 : 1;
  const tail = [x - s * 2 * k, y - 2 * k], tip = [x + s * 2.5 * k, y + 2.5 * k];
  const dir = [s / Math.SQRT2, 1 / Math.SQRT2], nrm = [-dir[1], dir[0]], h = 1.9 * k;
  const head = [tip, [tip[0] - dir[0] * h + nrm[0] * h * .7, tip[1] - dir[1] * h + nrm[1] * h * .7], [tip[0] - dir[0] * h - nrm[0] * h * .7, tip[1] - dir[1] * h - nrm[1] * h * .7]];
  return `<g class="ro-card" aria-hidden="true"><circle class="ro-card-face" cx="${f(x)}" cy="${f(y)}" r="${f(NODE_R * k)}"/>${side ? `<line class="ro-arrow" x1="${f(tail[0])}" y1="${f(tail[1])}" x2="${f(tip[0] - dir[0] * h * .6)}" y2="${f(tip[1] - dir[1] * h * .6)}"/><polygon class="ro-arrow-head" points="${head.map(pt).join(' ')}"/>` : ''}</g>`;
}
// Counters at an exit, stacked below it.
function stack(tree, id, count) {
  const [x, y] = tree.g.pos[id], k = tree.k, room = tree.slots, gap = count > room ? 5.6 * (room - 1) / (count - 1) : 5.6;
  let out = '';
  for (let c = 0; c < count; c++) out += `<circle class="ro-counter" cx="${f(x)}" cy="${f(y + (NODE_R + 3.4 + c * gap) * k)}" r="${f(2.6 * k)}"/>`;
  return out;
}
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, node: null, at: [], moves: null}); return uiState.get(p.id); };
// The claim being tapped belongs to the board it began on: any move or Undo
// ends it.
const claimOf = (p, a) => { const v = ui(p); return v.claiming && v.moves === a.moves && cantOpen(p, a.board) && !solved(p, a.board) ? v : null; };
const moveButton = (label, action, cls, enabled, extra = '') => `<button type="button" class="secondary ro-button ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="ro-${action.type}${action.depth ? `-${action.depth}` : ''}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
function treeIcon(d) {
  const t = treeOf(d), g = t.g;
  const lines = g.edges.map(e => `<line x1="${f(g.pos[e.u][0])}" y1="${f(g.pos[e.u][1])}" x2="${f(g.pos[e.v][0])}" y2="${f(g.pos[e.v][1])}"/>`).join('');
  return `<svg class="ro-tree-icon" viewBox="-4 ${f(t.entry[1] + 6)} 108 ${f(g.pos[letterOf(0)][1] - t.entry[1])}" aria-hidden="true"><g class="ro-icon-roads">${lines}</g>${g.ids.map(id => `<circle cx="${f(g.pos[id][0])}" cy="${f(g.pos[id][1])}" r="${f(NODE_R * t.k)}"/>`).join('')}</svg>`;
}
const TOLD = {
  open: 'That slot could be any exit.',
  off: 'Both counters must pass that switch.',
  apart: 'Those two go different ways there.',
  between: 'Another counter passes that switch between them.',
  more: 'There is another.'
};

function render(p, a) {
  const q = p.parameters, b = a.board, st = stateOf(p, b), d = st.d, tree = treeOf(d), g = tree.g, n = tree.n, done = solved(p, b);
  const play = q.mode === 'playground', target = play ? null : q.target;
  const shown = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null, shownAction = shown?.type === 'move' ? shown.action : null;
  const claim = done ? null : claimOf(p, a), claiming = claim !== null;
  const canSet = settable(p, b) && !claiming;
  const final = b.claim || null, finalSwitch = final ? switchIndex(final.node) : -1;
  const counts = Array(exitCount(d)).fill(0);
  st.letters.forEach(x => { counts[leafOf(x)]++; });
  const lastTrip = new Set(st.last ? st.last.slice(0, -1) : []);
  const hintNodes = shown?.nodes || [];
  const board = graphBoard(g, {
    cls: `ro-map ro-depth-${d}${done ? ' done' : ''}${claiming ? ' claiming' : ''}`,
    label: 'Tree of switches',
    node: id => {
      const i = switchIndex(id);
      if (i < 0) {
        const c = counts[leafOf(id)];
        return {text: id, cls: 'exit', label: `Exit ${id}: ${plural(c, 'counter')}`};
      }
      const side = st.now[i], picked = claiming && claim.node === id;
      const cls = ['sw', side ? side.toLowerCase() : 'unset', picked ? 'chosen' : '', i === finalSwitch ? 'claimed' : '', hintNodes.includes(id) ? 'hinted' : ''].filter(Boolean).join(' ');
      const act = canSet || claiming;
      const verb = claiming ? (picked ? 'Let go' : 'Choose this switch') : canSet ? (side ? 'Flip it' : 'Set it') : '';
      return {text: '', cls, act, label: `${switchName(d, i).replace(/^the /, '').replace(/^./, c => c.toUpperCase())}: ${side ? `points ${sideWord(side)}` : 'not set'}${picked ? ', chosen' : ''}${act && verb ? `. ${verb}` : ''}`};
    },
    edge: e => {
      const i = Math.floor(e / 2), side = e % 2 ? 'R' : 'L', next = st.now[i] === side;
      const onClaim = final && i === finalSwitch && sideAt(d, i, leafOf(target[final.at[0]])) === side;
      const hinted = shownAction?.type === 'set' && switchIndex(shownAction.node) === i && shownAction.side === side;
      return {cls: [next ? 'next' : '', onClaim ? 'claimed' : '', hinted ? 'hinted' : ''].filter(Boolean).join(' '), strokes: [next ? 'ro-next' : '', onClaim ? 'ro-claim' : ''].filter(Boolean), act: canSet, label: `Road from ${switchName(d, i)} to the ${sideWord(side)}${next ? ', the next road' : ''}${canSet && !next ? `. Point ${switchName(d, i)} this way` : ''}`};
    },
    under: (st.last ? `<polyline class="ro-trail" points="${[tree.entry, ...st.last.map(k => g.pos[k < n ? switchId(k) : letterOf(k - n)])].map(pt).join(' ')}"/>` : '') + `<line class="ro-entry" x1="50" y1="${f(tree.entry[1])}" x2="50" y2="${f(g.pos.s0[1] - NODE_R * tree.k - 1)}"/>`,
    over: Array.from({length: n}, (_, i) => card(tree, switchId(i), st.now[i])).join('') + Array.from({length: exitCount(d)}, (_, k) => stack(tree, letterOf(k), counts[k])).join('') + (b.sent < st.length && !done ? `<circle class="ro-counter ro-waiting" cx="50" cy="${f(tree.entry[1])}" r="${f(2.6 * tree.k * 1.15)}"/>` : '')
  });
  // The rows: the order to make (slots left open are blank) and the arrivals.
  const slot = k => {
    const want = target ? target[k] : null, got = st.letters[k] ?? null, wrong = got !== null && want !== null && got !== want;
    return {want, got, wrong};
  };
  const length = st.length;
  const pickedAt = claiming ? claim.at : [], finalAt = final ? final.at : [], hintAt = shown?.at || [];
  const columns = ` style="--n:${Math.min(length, 8)}"`;
  const targetRow = target ? `<div class="ro-row ro-target"${columns} role="group" aria-label="Order to make">${target.map((x, k) => {
    const cls = `ro-slot want${x === null ? ' open' : ''}${pickedAt.includes(k) ? ' chosen' : ''}${finalAt.includes(k) ? ' claimed' : ''}${hintAt.includes(k) && claiming ? ' hinted' : ''}`;
    const label = `Slot ${k + 1}: ${x === null ? 'any exit' : x}`;
    return claiming ? `<button type="button" class="${cls}" data-rr-at="${k}" data-focus="ro-at-${k}" aria-pressed="${pickedAt.includes(k)}" aria-label="${esc(label)}">${x ?? ''}</button>` : `<span class="${cls}" role="img" aria-label="${esc(label)}">${x ?? ''}</span>`;
  }).join('')}</div>` : '';
  const arrivals = `<div class="ro-row ro-arrivals${play ? ' play' : ''}"${columns} role="img" aria-label="${esc(st.letters.length ? `Landed: ${st.letters.join(', ')}` : 'No counters have landed')}">${Array.from({length}, (_, k) => { const s = slot(k); return `<span class="ro-slot got${s.got ? ' full' : ''}${s.wrong ? ' wrong' : ''}">${s.got ?? ''}</span>`; }).join('')}</div>`;
  // The bar: counters still to send, Send, and the claims.
  const left = st.length - b.sent;
  const tray = !done ? `<span class="ro-tray" role="img" aria-label="${plural(left, 'counter')} to send">${Array.from({length: left}, () => '<i class="ro-tray-dot"></i>').join('')}</span>` : '';
  const send = !done ? moveButton('Send', {type: 'send'}, `ro-send${shownAction?.type === 'send' ? ' hinted' : ''}`, allSet(b.start) && b.sent < st.length && !claiming) : '';
  let claims = '';
  if (q.mode === 'make' && !done) claims = `<button type="button" class="secondary ro-button ro-cant${shownAction?.type === 'cant' && !claiming ? ' hinted' : ''}" data-rr-cant data-focus="ro-cant" data-toggle="ro-cant" aria-pressed="${claiming}" ${cantOpen(p, b) ? '' : 'disabled'}>Can’t</button>`;
  if (q.mode === 'every' && !done) {
    const word = st.letters.join(''), keepOk = b.sent === q.target.length && isOrder(q, word) && !b.kept.includes(word);
    claims = moveButton('Keep', {type: 'keep'}, `ro-keep${shownAction?.type === 'keep' ? ' hinted' : ''}`, keepOk) + moveButton('That’s all', {type: 'all'}, `ro-all${shownAction?.type === 'all' ? ' hinted' : ''}`, b.kept.length > 0 && b.told !== 'more');
  }
  // The chosen tree's button does nothing when tapped again.
  const trees = play ? `<div class="ro-trees" role="group" aria-label="Trees">${DEPTHS.map(k => `<button type="button" class="secondary ro-tree-button"${b.depth === k ? '' : ` data-action="expansion-move" data-move='${JSON.stringify({type: 'tree', depth: k})}'`} data-focus="ro-tree-${k}" aria-pressed="${b.depth === k}" aria-label="${exitCount(k)} exits">${treeIcon(k)}</button>`).join('')}</div>` : '';
  const clear = play ? moveButton('Clear', {type: 'clear'}, 'ro-clear', b.sent > 0) : '';
  const bar = `<div class="ro-bar">${tray}${send}${claims}${clear}</div>`;
  const shelf = q.mode === 'every' && b.kept.length ? `<div class="ro-shelf" role="list" aria-label="Kept orders">${b.kept.map(w => `<span class="ro-kept" role="listitem" aria-label="${esc(w.split('').join(', '))}">${w.split('').map(x => `<i>${x}</i>`).join('')}</span>`).join('')}</div>` : '';
  const told = b.told && !done ? TOLD[b.told] : '';
  const status = `${allSet(b.start) ? `Switches: ${st.now.map((s, i) => `${switchName(d, i)} ${sideWord(s)}`).join(', ')}.` : `${plural(b.start.filter(s => s === null).length, 'switch', 'switches')} not set.`} ${st.letters.length ? `Landed: ${st.letters.join(', ')}.` : ''}${claiming ? ' Tap a switch and two letters.' : ''}${told ? ` ${told}` : ''}`;
  return `<div class="ro-puzzle${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="rotor">${trees}${bar}${board}<div class="ro-rows">${targetRow}${arrivals}</div>${shelf}${told ? `<p class="ro-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Taps --------------------------------------------------------------------------------------
// Before the first counter, a tap on a switch flips it (an unset switch points
// left first) and a tap on a road points its switch down that road; a tap on
// the road a switch already points down does nothing. After
// Can't, taps choose a switch and two slots of the order; the third choice
// makes the claim.
function wire(root, p, api) {
  const pickNode = id => {
    const a = api.attempt(), v = claimOf(p, a);
    if (!v) return null;
    const node = v.node === id ? null : id;
    if (node !== null && v.at.length === 2) return {type: 'cant', node, at: [...v.at]};
    api.ui({node, moves: a.moves});
    return null;
  };
  const pickAt = k => {
    const a = api.attempt(), v = claimOf(p, a);
    if (!v) return;
    const at = v.at.includes(k) ? v.at.filter(x => x !== k) : [...v.at, k].slice(-2);
    if (v.node !== null && at.length === 2) { api.apply({type: 'cant', node: v.node, at}); return; }
    api.ui({at, moves: a.moves});
  };
  // Can't is a data-toggle slot: the app's double-tap guard drops the click
  // right after it when it is Can't again or lands where Can't was.
  root.querySelectorAll('[data-rr-at]').forEach(el => el.addEventListener('click', e => { if (!api.repeatToggle?.(el, e)) pickAt(Number(el.dataset.rrAt)); }));
  // Can't opens (or closes) the claim on the board as it is now.
  root.querySelector('[data-rr-cant]')?.addEventListener('click', e => { if (api.repeatToggle?.(e.currentTarget, e)) return; const a = api.attempt(); api.ui({claiming: !claimOf(p, a), moves: a.moves}); });
  wireGraph(root, {
    node: id => {
      const a = api.attempt();
      if (claimOf(p, a)) return pickNode(id);
      return switchIndex(id) >= 0 ? {type: 'flip', node: id} : null;
    },
    edge: e => {
      const i = Math.floor(e / 2), side = e % 2 ? 'R' : 'L';
      return api.attempt()?.board.start?.[i] === side ? null : {type: 'set', node: switchId(i), side};
    }
  }, api.apply);
}

export const rotorMechanics = {
  rotor: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload) || !Number.isInteger(payload.moves)) return;
      const v = ui(p);
      if (typeof payload.claiming === 'boolean') { Object.assign(v, {claiming: payload.claiming, node: null, at: [], moves: payload.moves}); return; }
      if (!v.claiming || v.moves !== payload.moves) return;
      if (payload.node === null || typeof payload.node === 'string') v.node = payload.node;
      if (Array.isArray(payload.at) && payload.at.length <= 2 && payload.at.every(Number.isInteger)) v.at = [...payload.at];
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps a refused That's all while the shelf is the same.
    carry(p, from, to) {
      if (!object(from) || !object(to)) return to;
      const q = p.parameters;
      if (q.mode === 'every' && from.told === 'more' && !to.done && Array.isArray(from.kept) && Array.isArray(to.kept) && from.kept.length === to.kept.length && from.kept.every((w, i) => w === to.kept[i])) return {...to, told: 'more'};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'rotor',
  family: {id: 'rotor', symbol: '⋎', area: 'numbers', region: 'networks'},
  mechanics: rotorMechanics,
  pack: new URL('./rotor.json', import.meta.url).href,
  css: new URL('./rotor.css', import.meta.url).href,
  focus: '.gb-node[role=button],.ro-slot[data-rr-at],.ro-button:not([disabled])'
};
