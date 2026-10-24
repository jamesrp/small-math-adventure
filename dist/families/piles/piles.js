// Moving piles (worksheet Week 99). Counters sit in piles on the places of a
// small map (bins on a line, a star of roads, a ring), and a fixed target
// marks places with open rings. A move carries one counter along one road and
// costs 1. The least work from a start to the target is the earth mover's
// distance between the two piles: on a line, each gap must be crossed by the
// counters to its left that are over or under the target, and matching the
// counters to the rings in order meets every gap's count at once; on a tree
// the same is true road by road; on a ring a constant flow round the ring can
// be added, and the best one is a median.
//
// Puzzles:
//   move    fill the rings within the least work, shown as move dots;
//   design  place the counters so the least work to the rings is exactly k;
//   cards   pick two of the eight four-counter cards with position total 8 on
//           bins 0–4, move one to the other, and claim with Best that no two
//           cards are farther apart (only 0044 and 2222, 8 moves).
// The playground has counters, rings and moves on a line, a star and a ring.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, wireGraph, edgeGeometry, NODE_R} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sum = list => list.reduce((a, b) => a + b, 0);
export const MODES = ['move', 'design', 'cards', 'playground'];
export const MAX_LOG = 40;
export const PLAY_PILE = 6, PLAY_TOTAL = 12, MAX_LOCKS = 64;

// --- Maps --------------------------------------------------------------------
// A map is {nodes: {id: [x%, y%]}, roads: [[u, v], …], aspect, out: {id: deg},
// word}. Piles are arrays of counts in node order. `out` is the direction a
// pile stacks from its place (90 is up, the default); `word` names a place in
// speech ("bin 3"), or is empty for lettered places.
const shapes = new Map();
export function shapeOf(m) {
  const key = JSON.stringify([m.nodes, m.roads]);
  if (shapes.has(key)) return shapes.get(key);
  const ids = Object.keys(m.nodes), index = Object.fromEntries(ids.map((id, i) => [id, i]));
  const nb = ids.map(() => []), road = new Map();
  m.roads.forEach(([u, v], i) => { nb[index[u]].push(index[v]); nb[index[v]].push(index[u]); road.set(`${index[u]}|${index[v]}`, i); road.set(`${index[v]}|${index[u]}`, i); });
  const dist = ids.map((_, s) => {
    const d = ids.map(() => Infinity), queue = [s];
    d[s] = 0;
    for (let k = 0; k < queue.length; k++) for (const w of nb[queue[k]]) if (d[w] === Infinity) { d[w] = d[queue[k]] + 1; queue.push(w); }
    return d;
  });
  const shape = {key, ids, index, nb, road, dist};
  shapes.set(key, shape);
  return shape;
}
export const graphFor = m => graphOf({nodes: m.nodes, edges: m.roads, aspect: m.aspect});
export const validMap = m => object(m) && object(m.nodes) && Object.keys(m.nodes).length >= 2 && Array.isArray(m.roads) && m.roads.every(r => Array.isArray(r) && r.length === 2 && Object.hasOwn(m.nodes, r[0]) && Object.hasOwn(m.nodes, r[1]) && r[0] !== r[1]);
export const roadOf = (m, u, v) => { const s = shapeOf(m); return s.road.get(`${s.index[u]}|${s.index[v]}`) ?? -1; };
export const joined = (m, u, v) => roadOf(m, u, v) >= 0;
export const nameOf = (m, id) => m.word ? `${m.word} ${id}` : id;
export const pilesFrom = (m, list) => { const s = shapeOf(m), out = s.ids.map(() => 0); for (const id of list) out[s.index[id]]++; return out; };
export const samePiles = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
const isPiles = (m, piles, cap = Infinity) => Array.isArray(piles) && piles.length === shapeOf(m).ids.length && piles.every(n => Number.isInteger(n) && n >= 0 && n <= cap);
const expand = piles => piles.flatMap((n, i) => Array.from({length: n}, () => i));

// --- Least work --------------------------------------------------------------
// The fewest moves from piles a to piles b (equal totals): the cheapest way to
// send each counter to its own ring, by road distance, found by a search over
// sets of rings already filled (at most 2^n states for n counters).
const works = new Map();
export function leastWork(m, a, b) {
  if (sum(a) !== sum(b)) return null;
  const s = shapeOf(m), key = `${s.key}:${a}:${b}`;
  if (works.has(key)) return works.get(key);
  const xs = expand(a), ys = expand(b), n = xs.length, full = (1 << n) - 1;
  const best = new Array(1 << n).fill(Infinity);
  best[0] = 0;
  for (let mask = 0; mask < full; mask++) {
    if (best[mask] === Infinity) continue;
    let k = 0;
    for (let t = mask; t; t &= t - 1) k++;
    for (let j = 0; j < n; j++) if (!(mask >> j & 1)) best[mask | 1 << j] = Math.min(best[mask | 1 << j], best[mask] + s.dist[xs[k]][ys[j]]);
  }
  works.set(key, best[full]);
  return best[full];
}
// A record of moves played from a start: the piles it leaves, or null if any
// step leaves an empty place or follows no road.
export function replay(m, start, log) {
  if (!Array.isArray(log)) return null;
  const s = shapeOf(m), piles = [...start];
  for (const step of log) {
    if (!Array.isArray(step) || step.length !== 2 || !step.every(id => typeof id === 'string' && Object.hasOwn(s.index, id))) return null;
    const [u, v] = step.map(id => s.index[id]);
    if (!s.road.has(`${u}|${v}`) || piles[u] <= 0) return null;
    piles[u]--; piles[v]++;
  }
  return piles;
}
// How many times counters crossed each road, and the net count from its
// first end to its second.
export function traffic(m, log) {
  const out = m.roads.map(() => ({n: 0, net: 0}));
  for (const [u, v] of log) { const i = roadOf(m, u, v); out[i].n++; out[i].net += m.roads[i][0] === u ? 1 : -1; }
  return out;
}
// Every move that brings the least work down by one: the first step of some
// best plan. `prefer` (a place) puts moves from it first, so a hint carries
// the same counter on.
export function planSteps(m, now, target, prefer = null) {
  const s = shapeOf(m), w = leastWork(m, now, target), out = [];
  if (!w) return out;
  s.ids.forEach((id, u) => {
    if (!now[u]) return;
    for (const v of s.nb[u]) {
      const next = [...now]; next[u]--; next[v]++;
      if (leastWork(m, next, target) === w - 1) out.push([id, s.ids[v]]);
    }
  });
  return prefer === null ? out : [...out.filter(([u]) => u === prefer), ...out.filter(([u]) => u !== prefer)];
}
// Every start with `count` counters, in a fixed order.
const startCache = new Map();
export function allStarts(m, count) {
  const s = shapeOf(m), key = `${s.key}:${count}`;
  if (startCache.has(key)) return startCache.get(key);
  const out = [];
  (function grow(i, left, piles) {
    if (i === s.ids.length - 1) { out.push([...piles, left]); return; }
    for (let n = left; n >= 0; n--) grow(i + 1, left - n, [...piles, n]);
  })(0, count, []);
  startCache.set(key, out);
  return out;
}
// The starts whose least work to the target is exactly `exact`.
export const designStarts = (m, target, count, exact) => allStarts(m, count).filter(a => leastWork(m, a, target) === exact);
const covers = (big, small) => big.every((x, i) => x >= small[i]);
// The least work between every two cards, and the most.
export const cardWork = (m, cards, i, j) => leastWork(m, cards[i], cards[j]);
export function farthest(m, cards) {
  let best = 0, pairs = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    const w = cardWork(m, cards, i, j);
    if (w > best) { best = w; pairs = []; }
    if (w === best) pairs.push([i, j]);
  }
  return {best, pairs};
}

// --- Boards ------------------------------------------------------------------
// move:       {log}
// design:     {placed, log}           placed: the places tapped, in order
// cards:      {pair, log, told, shut, claimed}
// playground: {map, counters, rings, work}
// A log step is [from, to] by place id. In cards, `told` is the line a refused
// Best leaves on the board it made ('less' or 'farther'), and `shut` lists the
// refused claims (a pair, or a pair with its moves), which stay refused
// through Undo and new pairs until Restart.
const mapIn = (p, b) => p.parameters.mode === 'playground' ? p.parameters.maps[b?.map] : p.parameters.map;
export const claimKey = (kind, pair, log) => JSON.stringify(kind === 'farther' ? [kind, pair] : [kind, pair, log]);
// What the board shows: the start, the piles now, the rings, the work, and
// the phase ('place' and 'pick' come before 'move').
export function stateOf(p, b) {
  const q = p.parameters, m = mapIn(p, b);
  if (q.mode === 'playground') return {m, start: b.counters, now: b.counters, target: b.rings, work: b.work, phase: 'move'};
  if (q.mode === 'design') {
    const start = pilesFrom(m, b.placed);
    return {m, start, now: replay(m, start, b.log), target: q.target, work: b.log.length, phase: b.placed.length < q.count ? 'place' : 'move'};
  }
  if (q.mode === 'cards') {
    const zero = shapeOf(m).ids.map(() => 0), start = b.pair.length ? q.cards[b.pair[0]] : zero;
    return {m, start, now: replay(m, start, b.log), target: b.pair.length === 2 ? q.cards[b.pair[1]] : null, work: b.log.length, phase: b.pair.length < 2 ? 'pick' : 'move'};
  }
  return {m, start: q.start, now: replay(m, q.start, b.log), target: q.target, work: b.log.length, phase: 'move'};
}
const goal = q => q.mode === 'design' ? q.exact : q.mode === 'cards' ? q.best : q.budget;
export const matched = st => st.phase === 'move' && st.target !== null && samePiles(st.now, st.target);
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') { const map = Object.keys(q.maps)[0], n = shapeOf(q.maps[map]).ids.length; return {map, counters: Array(n).fill(0), rings: Array(n).fill(0), work: 0}; }
  if (q.mode === 'design') return {placed: [], log: []};
  if (q.mode === 'cards') return {pair: [], log: [], told: null, shut: [], claimed: false};
  return {log: []};
}
// A refused claim, as `shut` stores it: still refusable when checked again.
function refusable(q, key) {
  let k;
  try { k = JSON.parse(key); } catch { return false; }
  if (!Array.isArray(k) || !Array.isArray(k[1]) || k[1].length !== 2 || !k[1].every(i => Number.isInteger(i) && i >= 0 && i < q.cards.length) || k[1][0] === k[1][1]) return false;
  const [kind, [s, t]] = k, w = cardWork(q.map, q.cards, s, t);
  if (kind === 'farther') return k.length === 2 && w < q.best;
  if (kind !== 'less' || k.length !== 3 || !Array.isArray(k[2]) || k[2].length > MAX_LOG) return false;
  const now = replay(q.map, q.cards[s], k[2]);
  return now !== null && samePiles(now, q.cards[t]) && k[2].length > w;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    const m = q.maps[b.map];
    return Object.hasOwn(q.maps, b.map) && isPiles(m, b.counters, PLAY_PILE) && isPiles(m, b.rings, PLAY_PILE) && sum(b.counters) <= PLAY_TOTAL && sum(b.rings) <= PLAY_TOTAL && Number.isInteger(b.work) && b.work >= 0 && b.work <= 9999;
  }
  if (!Array.isArray(b.log) || b.log.length > MAX_LOG) return false;
  if (q.mode === 'design') {
    if (!Array.isArray(b.placed) || b.placed.length > q.count || !b.placed.every(id => typeof id === 'string' && Object.hasOwn(q.map.nodes, id))) return false;
    if (b.placed.length < q.count && b.log.length) return false;
  }
  if (q.mode === 'cards') {
    if (!Array.isArray(b.pair) || b.pair.length > 2 || !b.pair.every(i => Number.isInteger(i) && i >= 0 && i < q.cards.length) || new Set(b.pair).size !== b.pair.length) return false;
    if (b.pair.length < 2 && b.log.length) return false;
    if (typeof b.claimed !== 'boolean' || ![null, 'less', 'farther'].includes(b.told)) return false;
    if (!Array.isArray(b.shut) || b.shut.length > MAX_LOCKS || new Set(b.shut).size !== b.shut.length || !b.shut.every(k => typeof k === 'string' && refusable(q, k))) return false;
  }
  const st = stateOf(p, b);
  if (st.now === null) return false;
  if (q.mode !== 'cards') return true;
  const w = b.pair.length === 2 ? cardWork(q.map, q.cards, b.pair[0], b.pair[1]) : null;
  if (b.claimed) return matched(st) && b.told === null && st.work === w && w === q.best;
  if (b.told === 'less') return matched(st) && st.work > w && b.shut.includes(claimKey('less', b.pair, b.log));
  if (b.told === 'farther') return matched(st) && st.work === w && w < q.best && b.shut.includes(claimKey('farther', b.pair));
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'cards') return b.claimed;
  const st = stateOf(p, b);
  if (!matched(st)) return false;
  if (q.mode === 'design') return st.work === q.exact && leastWork(st.m, st.start, q.target) === q.exact;
  return st.work <= q.budget;
}
// Best is off while the pair, or the pair with these moves, was refused.
const bestLocked = (b) => b.shut.includes(claimKey('farther', b.pair)) || b.shut.includes(claimKey('less', b.pair, b.log));
export const canBest = (p, b) => p.parameters.mode === 'cards' && !b.claimed && matched(stateOf(p, b)) && !bestLocked(b);
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const st = stateOf(p, b), m = st.m, ids = shapeOf(m).ids;
  if (action.type === 'move') {
    if (st.phase !== 'move' || !ids.includes(action.from) || !ids.includes(action.to) || !joined(m, action.from, action.to)) return null;
    if (st.now[shapeOf(m).index[action.from]] <= 0) return null;
    if (q.mode === 'playground') {
      const counters = [...b.counters], s = shapeOf(m);
      if (counters[s.index[action.to]] >= PLAY_PILE) return null;
      counters[s.index[action.from]]--; counters[s.index[action.to]]++;
      return {...b, counters, work: b.work + 1};
    }
    if (b.log.length >= MAX_LOG) return null;
    const log = [...b.log, [action.from, action.to]];
    return q.mode === 'cards' ? {...b, log, told: null} : {...b, log};
  }
  if (action.type === 'place' && q.mode === 'design') {
    if (st.phase !== 'place' || !ids.includes(action.node)) return null;
    return {placed: [...b.placed, action.node], log: []};
  }
  if (q.mode === 'cards') {
    if (action.type === 'card') {
      const k = action.card;
      if (!Number.isInteger(k) || k < 0 || k >= q.cards.length) return null;
      const pair = b.pair.length === 0 ? [k] : b.pair.length === 1 ? (b.pair[0] === k ? [] : [b.pair[0], k]) : [k];
      return {...b, pair, log: [], told: null};
    }
    if (action.type === 'best') {
      if (!canBest(p, b)) return null;
      const w = cardWork(m, q.cards, b.pair[0], b.pair[1]);
      if (st.work > w) return {...b, told: 'less', shut: [...b.shut, claimKey('less', b.pair, b.log)]};
      if (w < q.best) return {...b, told: 'farther', shut: [...b.shut, claimKey('farther', b.pair)]};
      return {...b, claimed: true, told: null};
    }
    return null;
  }
  if (q.mode === 'playground') {
    const s = shapeOf(m);
    if (action.type === 'map') {
      if (!Object.hasOwn(q.maps, action.map) || action.map === b.map) return null;
      const n = shapeOf(q.maps[action.map]).ids.length;
      return {map: action.map, counters: Array(n).fill(0), rings: Array(n).fill(0), work: 0};
    }
    if (action.type === 'add' || action.type === 'ring') {
      const field = action.type === 'add' ? 'counters' : 'rings';
      if (!ids.includes(action.node)) return null;
      const piles = [...b[field]], i = s.index[action.node];
      if (piles[i] >= PLAY_PILE || sum(piles) >= PLAY_TOTAL) return null;
      piles[i]++;
      return {...b, [field]: piles, work: 0};
    }
    if (action.type === 'clear') {
      if (!sum(b.counters) && !sum(b.rings) && !b.work) return null;
      return {...b, counters: b.counters.map(() => 0), rings: b.rings.map(() => 0), work: 0};
    }
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
const plan = (st, last) => planSteps(st.m, st.now, st.target, last ? last[1] : null)[0];
const stepHint = (st, step) => ({type: 'move', action: {type: 'move', from: step[0], to: step[1]}, text: `Move a counter from ${nameOf(st.m, step[0])} to ${nameOf(st.m, step[1])}.`, nodes: step});
const tooFar = {type: 'deadend', quiet: true, text: 'There aren’t enough moves left. Undo.'};
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'note'};
  if (solved(p, b)) return {type: 'done'};
  const st = stateOf(p, b), last = b.log.at(-1);
  if (q.mode === 'move') return st.work + leastWork(st.m, st.now, q.target) > q.budget ? tooFar : stepHint(st, plan(st, last));
  if (q.mode === 'design') {
    if (st.phase === 'place') {
      const placed = pilesFrom(st.m, b.placed), done = designStarts(st.m, q.target, q.count, q.exact).find(a => covers(a, placed));
      if (!done) return {type: 'deadend', quiet: true, text: 'No start with these counters needs exactly that many moves. Undo.'};
      const node = shapeOf(st.m).ids[done.findIndex((n, i) => n > placed[i])];
      return {type: 'move', action: {type: 'place', node}, text: `Put a counter on ${nameOf(st.m, node)}.`, nodes: [node]};
    }
    if (leastWork(st.m, st.start, q.target) !== q.exact) return {type: 'deadend', quiet: true, text: 'This start doesn’t need exactly that many moves. Undo.'};
    return st.work + leastWork(st.m, st.now, q.target) > q.exact ? tooFar : stepHint(st, plan(st, last));
  }
  // Cards: aim for the first farthest pair, keeping the child's first card if
  // it belongs to one.
  const {pairs} = farthest(q.map, q.cards), far = pair => pairs.some(([i, j]) => (pair[0] === i && pair[1] === j) || (pair[0] === j && pair[1] === i));
  const card = k => ({type: 'move', action: {type: 'card', card: k}, text: b.pair.length === 1 && b.pair[0] === k ? 'Tap your card again to let it go.' : `Tap the card with ${pileWords(q.map, q.cards[k])}.`, card: k});
  if (b.pair.length === 2 && !far(b.pair)) return card(pairs[0][0]);
  if (b.pair.length === 0) return card(pairs[0][0]);
  if (b.pair.length === 1) {
    const partner = pairs.flatMap(([i, j]) => i === b.pair[0] ? [j] : j === b.pair[0] ? [i] : [])[0];
    return card(partner ?? b.pair[0]);
  }
  if (matched(st) && st.work === q.best) return {type: 'move', action: {type: 'best'}, text: 'Press Best.'};
  return st.work + leastWork(st.m, st.now, st.target) > q.best ? tooFar : stepHint(st, plan(st, last));
}

// --- Drawing -----------------------------------------------------------------
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, at: null, tool: 'add'}); return uiState.get(p.id); };
// The picked pile belongs to the board it was picked on: any move or Undo
// lets go of it.
const pickOf = (p, a, st) => { const s = ui(p); return s.at === a.moves && s.pick !== null && st.phase === 'move' && st.now[shapeOf(st.m).index[s.pick]] > 0 ? s.pick : null; };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const f = n => Number(n.toFixed(2));
// `hit` is the width of the clear band over a pile, in board units: about 46
// pixels on a 375-pixel phone, and narrower than the closest two places on
// any map (16.8 units on the six-bin line), so neighbouring piles never meet.
export const STACK = {space: 5.9, first: NODE_R + 3.6, counter: 2.6, ring: 3.15, hit: 15};
const {space: SPACE, first: FIRST, counter: COUNTER, ring: RING} = STACK;
const dirOf = (m, id) => { const deg = m.out?.[id] ?? 90, r = deg * Math.PI / 180; return [Math.cos(r), -Math.sin(r)]; };
// One place's pile and rings, stacked away from its dot, with a wide clear
// band (STACK.hit) so a tap anywhere along the stack is a tap on the place. A map has
// room for `slots` counters a place (4 unless it says); taller piles squeeze.
function column(g, m, id, counters, rings, opts = {}) {
  const room = m.slots || 4, [x, y] = g.pos[id], [dx, dy] = dirOf(m, id), n = Math.max(counters, rings, room), gap = n > room ? SPACE * Math.max(room - 1, 1) / (n - 1) : SPACE;
  const at = (k, lift = 0) => [x + dx * (FIRST + k * gap + lift), y + dy * (FIRST + k * gap + lift)];
  let art = '';
  for (let k = 0; k < rings; k++) { const [cx, cy] = at(k); art += `<circle class="pl-ring${k < counters ? ' full' : ''}" cx="${f(cx)}" cy="${f(cy)}" r="${RING}"/>`; }
  for (let k = 0; k < counters; k++) { const [cx, cy] = at(k, opts.picked && k === counters - 1 ? 1.8 : 0); art += `<circle class="pl-counter${k >= rings ? ' extra' : ''}" cx="${f(cx)}" cy="${f(cy)}" r="${COUNTER}"/>`; }
  // The band runs from inside the dot's reach to just past the top slot (at
  // least three slots, so a short two-slot line still gives a tall band),
  // and stops inside the board.
  const edge = Math.min(dx > 0 ? (101.7 - x) / dx : dx < 0 ? (x + 1.7) / -dx : Infinity, dy > 0 ? (g.height + 1.7 - y) / dy : dy < 0 ? (y + 1.7) / -dy : Infinity);
  const end = Math.min(FIRST + (Math.max(room, 3) - 0.6) * SPACE, edge), start = FIRST - 0.6 * SPACE;
  const [ax, ay] = [x + dx * start, y + dy * start], [bx, by] = [x + dx * end, y + dy * end];
  const hit = opts.act ? `<line class="pl-hit" x1="${f(ax)}" y1="${f(ay)}" x2="${f(bx)}" y2="${f(by)}" stroke-width="${STACK.hit}"/>` : '';
  return `<g class="pl-col${opts.picked ? ' picked' : ''}"${opts.act ? ` data-gb-node="${esc(id)}"` : ''} aria-hidden="true">${hit}${art}</g>`;
}
// After a solve, what a road carried: its count in a small card beside the
// road (on the side toward the middle of the map, or above it), and an
// arrowhead on the road for the way the counters went.
function flowMark(g, i, fl) {
  const e = g.edges[i], {m, d, n} = edgeGeometry(g, e), ids = g.ids;
  const c = [sum(ids.map(id => g.pos[id][0])) / ids.length, sum(ids.map(id => g.pos[id][1])) / ids.length];
  const toward = (c[0] - m[0]) * n[0] + (c[1] - m[1]) * n[1];
  const side = Math.abs(toward) > 1 ? Math.sign(toward) : n[1] < 0 ? 1 : n[1] > 0 ? -1 : n[0] > 0 ? 1 : -1;
  const at = [m[0] + n[0] * side * 7, m[1] + n[1] * side * 7], t = [d[0] * Math.sign(fl.net), d[1] * Math.sign(fl.net)];
  const head = fl.net ? [[m[0] + t[0] * 1.6, m[1] + t[1] * 1.6], [m[0] - t[0] * 1.2 + n[0] * 1.9, m[1] - t[1] * 1.2 + n[1] * 1.9], [m[0] - t[0] * 1.2 - n[0] * 1.9, m[1] - t[1] * 1.2 - n[1] * 1.9]] : null;
  return `<g class="pl-flow" aria-hidden="true">${head ? `<polygon points="${head.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>` : ''}<g transform="translate(${f(at[0])},${f(at[1])})"><rect x="-3.6" y="-3.1" width="7.2" height="6.2" rx="2.4"/><text y="1.65">${fl.n}</text></g></g>`;
}
function pips(used, limit) {
  const n = limit === null ? used : Math.max(used, limit);
  if (!n) return '';
  const dots = Array.from({length: n}, (_, k) => `<i class="pl-pip${k < used ? (limit !== null && k >= limit ? ' over' : ' used') : ''}"></i>`).join('');
  return `<span class="pl-pips" role="img" aria-label="${limit === null ? plural(used, 'move') : `${used} of ${plural(limit, 'move')}`}">${dots}</span>`;
}
const moveButton = (label, action, cls, enabled, extra = '') => `<button type="button" class="secondary pl-button ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="pl-${action.type}${action.map ? `-${action.map}` : ''}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
// A card: bins 0 to 4 with their counters, as a picture inside a button.
function cardArt(piles) {
  const w = 60, h = 30, step = w / piles.length;
  let art = '';
  piles.forEach((n, i) => {
    const x = step * (i + .5);
    art += `<line class="pl-card-bin" x1="${f(x - step * .36)}" y1="27.5" x2="${f(x + step * .36)}" y2="27.5"/>`;
    for (let k = 0; k < n; k++) art += `<circle class="pl-card-dot" cx="${f(x)}" cy="${f(23.2 - k * 5.9)}" r="2.6"/>`;
  });
  return `<svg class="pl-card-art" viewBox="0 0 ${w} ${h}" aria-hidden="true">${art}</svg>`;
}
const pileWords = (m, piles) => shapeOf(m).ids.flatMap((id, i) => piles[i] ? [`${piles[i]} on ${id}`] : []).join(', ') || 'none';
const TOOLS = {add: 'Counters', ring: 'Rings', move: 'Move'};
const toolIcon = tool => `<svg class="pl-tool-icon" viewBox="0 0 24 24" aria-hidden="true">${tool === 'add' ? '<circle class="pl-counter" cx="12" cy="12" r="6.5"/>' : tool === 'ring' ? '<circle class="pl-ring" cx="12" cy="12" r="7"/>' : '<path class="pl-tool-arrow" d="M4 12h14m-4.5-4.5L18 12l-4.5 4.5"/>'}</svg>`;
function mapIcon(m) {
  const g = graphFor(m), lines = m.roads.map(([u, v]) => `<line x1="${f(g.pos[u][0])}" y1="${f(g.pos[u][1])}" x2="${f(g.pos[v][0])}" y2="${f(g.pos[v][1])}"/>`).join('');
  return `<svg class="pl-map-icon" viewBox="-8 -8 116 ${f(g.height + 16)}" aria-hidden="true"><g class="pl-map-roads">${lines}</g>${Object.keys(m.nodes).map(id => `<circle cx="${f(g.pos[id][0])}" cy="${f(g.pos[id][1])}" r="7"/>`).join('')}</svg>`;
}

function render(p, a) {
  const q = p.parameters, b = a.board, st = stateOf(p, b), m = st.m, g = graphFor(m), s = shapeOf(m), done = solved(p, b);
  const play = q.mode === 'playground', tool = play ? ui(p).tool : null;
  const hinted = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null, hintNodes = hinted?.type === 'move' ? hinted.nodes || [] : [];
  const pick = done || (play && tool !== 'move') ? null : pickOf(p, a, st);
  const hintRoad = hintNodes.length === 2 ? roadOf(m, hintNodes[0], hintNodes[1]) : -1;
  const placing = st.phase === 'place', picking = st.phase === 'pick';
  const rings = st.target || s.ids.map(() => 0), now = st.now;
  const flows = done ? traffic(m, b.log) : null;
  // Every place is a control while play goes on, so a slide can enter an
  // empty place.
  const tapOk = () => !done && !picking;
  const board = graphBoard(g, {
    cls: `pl-map pl-mode-${q.mode} pl-shape-${m.shape || 'line'}${done ? ' done' : ''}${pick !== null ? ' picking' : ''}`,
    label: play ? 'Map' : 'Map of piles and rings',
    slide: !done && !picking && !placing && (!play || tool === 'move'),
    node: id => {
      const i = s.index[id], act = tapOk(id), go = pick !== null && joined(m, pick, id);
      const cls = [id === pick ? 'picked' : '', go ? 'can-go' : '', hintNodes.includes(id) ? 'hinted' : '', now[i] === rings[i] && rings[i] ? 'full' : ''].filter(Boolean).join(' ');
      const what = `${plural(now[i], 'counter')}${st.target ? `, ${plural(rings[i], 'ring')}` : ''}`;
      const verb = placing ? 'Put a counter here' : play && tool === 'add' ? 'Add a counter' : play && tool === 'ring' ? 'Add a ring' : id === pick ? 'Let go' : go ? 'Move a counter here' : now[i] ? 'Pick up a counter' : '';
      return {cls, act, label: `${m.word ? `Bin ${id}` : id}: ${what}${id === pick ? ', picked' : ''}${act && verb ? `. ${verb}` : ''}`};
    },
    edge: i => {
      const fl = flows?.[i];
      return {cls: [i === hintRoad ? 'hinted' : '', fl?.n ? 'used' : ''].filter(Boolean).join(' '), label: `Road ${m.roads[i][0]} to ${m.roads[i][1]}${fl?.n ? `, crossed ${plural(fl.n, 'time')}` : ''}`};
    },
    over: s.ids.map(id => column(g, m, id, now[s.index[id]], rings[s.index[id]], {picked: id === pick, act: tapOk(id)})).join('') + (flows ? flows.map((fl, i) => fl.n ? flowMark(g, i, fl) : '').join('') : '')
  });
  // The bar: counters still to place, move dots, and the buttons.
  const tray = placing ? `<span class="pl-tray" role="img" aria-label="${plural(q.count - b.placed.length, 'counter')} to place">${Array.from({length: q.count - b.placed.length}, () => '<i class="pl-tray-dot"></i>').join('')}</span>` : '';
  const dots = picking ? '' : pips(st.work, play || q.mode === 'cards' ? null : goal(q));
  const best = q.mode === 'cards' && !done ? moveButton('Best', {type: 'best'}, `pl-best${hinted?.action?.type === 'best' ? ' hinted' : ''}`, canBest(p, b)) : '';
  const tools = play ? `<div class="pl-tools" role="group" aria-label="Tool">${Object.keys(TOOLS).map(t => `<button type="button" class="secondary pl-tool" data-action="mechanic-ui" data-ui='${JSON.stringify({tool: t})}' data-focus="pl-tool-${t}" aria-pressed="${tool === t}" aria-label="${TOOLS[t]}" title="${TOOLS[t]}">${toolIcon(t)}</button>`).join('')}</div>` : '';
  const clear = play ? moveButton('Clear', {type: 'clear'}, 'pl-clear', sum(b.counters) > 0 || sum(b.rings) > 0 || b.work > 0) : '';
  const bar = `<div class="pl-bar">${tools}${tray}${dots}${best}${clear}</div>`;
  const maps = play ? `<div class="pl-maps" role="group" aria-label="Maps">${Object.entries(q.maps).map(([key, mm]) => `<button type="button" class="secondary pl-map-button" data-action="expansion-move" data-move='${JSON.stringify({type: 'map', map: key})}' data-focus="pl-map-${key}" aria-pressed="${b.map === key}" aria-label="${esc(mm.title)}">${mapIcon(mm)}</button>`).join('')}</div>` : '';
  const cards = q.mode === 'cards' ? `<div class="pl-cards" role="group" aria-label="Cards">${q.cards.map((c, k) => {
    const role = b.pair[0] === k ? ' start' : b.pair[1] === k ? ' target' : '', hint = hinted?.card === k ? ' hinted' : '';
    return `<button type="button" class="pl-card${role}${hint}" data-action="expansion-move" data-move='${JSON.stringify({type: 'card', card: k})}' data-focus="pl-card-${k}" ${done ? 'disabled' : ''} aria-pressed="${Boolean(role)}" aria-label="Card ${pileWords(m, c)}${role === ' start' ? ', the counters' : role === ' target' ? ', the rings' : ''}">${cardArt(c)}</button>`;
  }).join('')}</div>` : '';
  // A line only for a refused claim, for rings filled with more moves than
  // the dots (the budget is the least work, so a move puzzle can say fewer
  // would do; a design's start may need more, so it says only too many), or
  // for a design whose moves fit but whose start needs fewer.
  const filled = !done && (q.mode === 'move' || q.mode === 'design') && matched(st);
  const fewer = filled && (q.mode === 'design' ? st.work === q.exact : st.work > q.budget);
  const tooMany = filled && q.mode === 'design' && st.work > q.exact;
  const told = b.told === 'less' || fewer ? 'Fewer moves would do.' : tooMany ? 'Too many moves.' : b.told === 'farther' ? 'Another pair takes more moves.' : '';
  const status = `${picking ? (b.pair.length ? 'Pick the card for the rings.' : 'Pick a card for the counters.') : `Counters: ${pileWords(m, now)}.${st.target ? ` Rings: ${pileWords(m, rings)}.` : ''}`} ${plural(st.work, 'move')}.${pick !== null ? ` ${pick} is picked.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="pl-puzzle${done ? ' solved' : ''}" data-mechanic-wire="piles">${maps}${cards}${bar}${board}${told ? `<p class="pl-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// --- Taps and slides ---------------------------------------------------------
// A tap picks up a pile, and a tap on a place joined to it moves one counter
// there (two taps a move). A press on a pile that slides on carries a counter
// from place to place, one move for each road crossed.
let drag = null, listening = false;
const release = () => { drag = null; };
function wire(root, p, api) {
  const q = p.parameters, now = () => { const a = api.attempt(); return {a, st: stateOf(p, a.board)}; };
  const tap = id => {
    const {a, st} = now(), b = a.board, s = shapeOf(st.m), tool = ui(p).tool;
    if (solved(p, b) || st.phase === 'pick') return null;
    if (st.phase === 'place') return {type: 'place', node: id};
    if (q.mode === 'playground' && tool !== 'move') return {type: tool, node: id};
    const pick = pickOf(p, a, st);
    if (pick !== null && pick !== id && joined(st.m, pick, id)) return {type: 'move', from: pick, to: id};
    api.ui({pick: pick === id || !st.now[s.index[id]] ? null : id, at: a.moves});
    return null;
  };
  const board = root.querySelector('[data-gb-board]');
  board?.addEventListener('pointerdown', e => {
    const id = e.target.closest('[data-gb-node]')?.dataset.gbNode, {st} = now();
    if (id === undefined || e.button > 0) return;
    const live = st.phase === 'move' && (q.mode !== 'playground' || ui(p).tool === 'move') && st.now[shapeOf(st.m).index[id]] > 0;
    drag = {pointer: e.pointerId, hand: live ? id : null, moved: false};
  });
  if (!listening) { document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release); listening = true; }
  wireGraph(root, {
    stroke: true,
    node: id => {
      if (!drag) return tap(id);
      // In a slide, each place entered next to the hand takes the counter on.
      const {a, st} = now();
      if (drag.hand === null || id === drag.hand || solved(p, a.board) || !joined(st.m, drag.hand, id) || st.now[shapeOf(st.m).index[drag.hand]] <= 0) return null;
      const action = {type: 'move', from: drag.hand, to: id};
      drag.hand = id;
      return action;
    }
  }, api.apply);
}

export const pilesMechanics = {
  piles: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      if (Object.hasOwn(TOOLS, payload.tool)) { Object.assign(ui(p), {tool: payload.tool, pick: null}); return; }
      if ((payload.pick === null || typeof payload.pick === 'string') && Number.isInteger(payload.at)) Object.assign(ui(p), {pick: payload.pick, at: payload.at});
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps every refused Best refused.
    carry: (p, from, to) => p.parameters.mode === 'cards' && object(from) && object(to) && Array.isArray(from.shut) && Array.isArray(to.shut) ? {...to, shut: [...to.shut, ...from.shut.filter(k => !to.shut.includes(k))]} : to,
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'piles',
  family: {id: 'piles', symbol: '⁖'},
  mechanics: pilesMechanics,
  pack: new URL('./piles.json', import.meta.url).href,
  css: new URL('./piles.css', import.meta.url).href,
  focus: '.gb-node[role=button],.pl-card:not([disabled]),.pl-button:not([disabled])'
};
