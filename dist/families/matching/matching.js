// Pairs that stay (worksheet Week 27, stable pairings). Circles A, B, C, …
// and squares W, X, Y, Z each rank every letter on the other side on a strip,
// first choice next to the letter, with no ties. A pairing puts each circle
// with one square. A circle and a square that are not together block it when
// each would rather have the other than its own partner; a pairing with no
// blocking pair can stay (it is stable). A one-sided wish does not block.
//
// Gale and Shapley: with equal sides and complete strict strips, a pairing
// that can stay always exists (deferred acceptance finds one in at most n²
// requests), there may be several, and none need give everyone a first
// choice. Two facts the puzzles lean on: a circle and a square that rank each
// other first are together in every pairing that can stay; and one strip can
// be rewritten to make a drawn pairing stay exactly when all its blocking
// pairs share a letter (then that letter puts its partner first), because two
// blocking pairs with no letter in common can't both be touched by one strip.
// In a three-pair pairing that can stay, at most three letters get their last
// choice: four would include a circle and a square in different pairs, and
// they would block.
//
// The board is the pairing and the strips. Tap a circle and a square to pair
// them (their old partners pair with each other), so every board is a whole
// pairing. Blocking pairs are never shown while the child arranges: a child
// claims Stays, or names a blocking pair by tapping a circle and a square
// when the pairing is fixed or has just been refused, and only then does the
// board answer.
import {esc} from '../../expansion-controls.js';
import {permutations, keepCase, claimCases, validShelf, shelfHTML} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['check', 'every', 'repair', 'last', 'playground'];

// --- Markets ------------------------------------------------------------------
// A market is {circles: 'ABC', squares: 'XYZ'}; strips are {A: 'XYZ', …, X: 'BAC', …},
// each owner's letters first to last. A pairing is a key: the square of each
// circle in order, so 'YZX' is A–Y, B–Z, C–X.
export const isCircle = (q, x) => typeof x === 'string' && x.length === 1 && q.circles.includes(x);
export const isSquare = (q, x) => typeof x === 'string' && x.length === 1 && q.squares.includes(x);
export const ownersOf = q => [...q.circles, ...q.squares];
export const otherSide = (q, x) => isCircle(q, x) ? q.squares : q.circles;
export const partnerOf = (q, k, x) => isCircle(q, x) ? k[q.circles.indexOf(x)] : q.circles[k.indexOf(x)];
export const prefers = (L, o, x, y) => L[o].indexOf(x) < L[o].indexOf(y);
// x would rather have y than its partner.
export const wants = (q, L, k, x, y) => y !== partnerOf(q, k, x) && prefers(L, x, y, partnerOf(q, k, x));
export const blocks = (q, L, k, c, s) => isCircle(q, c) && isSquare(q, s) && wants(q, L, k, c, s) && wants(q, L, k, s, c);
export const blockersOf = (q, L, k) => [...q.circles].flatMap(c => [...q.squares].filter(s => blocks(q, L, k, c, s)).map(s => c + s));
// Of a circle and a square, the ones that would keep their partners.
export const saysNo = (q, L, k, c, s) => [c, s].filter(x => !wants(q, L, k, x, x === c ? s : c));
export const pairingsOf = q => permutations([...q.squares]).map(p => p.join(''));
const stableCache = new Map();
export function stableOf(q, L) {
  const id = JSON.stringify([q.circles, q.squares, ownersOf(q).map(o => L[o])]);
  if (!stableCache.has(id)) {
    if (stableCache.size > 4000) stableCache.clear();
    stableCache.set(id, pairingsOf(q).filter(k => !blockersOf(q, L, k).length));
  }
  return stableCache.get(id);
}
export const canStay = (q, L, k) => !blockersOf(q, L, k).length;
// Tap c and s: they pair up, and their old partners pair with each other.
export function pairUp(q, k, c, s) {
  const i = q.circles.indexOf(c), j = k.indexOf(s), a = [...k];
  [a[i], a[j]] = [a[j], a[i]];
  return a.join('');
}
// Letters whose partner is the last on their strip.
export const lastOnes = (q, L, k) => ownersOf(q).filter(x => L[x].at(-1) === partnerOf(q, k, x));
export const isPairing = (q, k) => typeof k === 'string' && k.length === q.circles.length && [...k].sort().join('') === [...q.squares].sort().join('');
export const isStrip = (q, o, s) => typeof s === 'string' && s.length === otherSide(q, o).length && [...s].sort().join('') === [...otherSide(q, o)].sort().join('');
export const validLists = (q, L) => object(L) && Object.keys(L).sort().join() === ownersOf(q).sort().join() && ownersOf(q).every(o => isStrip(q, o, L[o]));
export const swapIn = (s, i, j) => { const a = [...s]; [a[i], a[j]] = [a[j], a[i]]; return a.join(''); };
const sameLists = (q, L, M) => ownersOf(q).every(o => L[o] === M[o]);

// Repairs: every way to rewrite one strip so that k can stay. They exist
// exactly when every blocking pair shares one letter.
const repairCache = new Map();
export function repairsOf(q, L0, k) {
  const id = JSON.stringify([q.circles, q.squares, L0, k]);
  if (repairCache.has(id)) return repairCache.get(id);
  const out = [];
  for (const o of ownersOf(q)) for (const order of permutations([...L0[o]]).map(p => p.join(''))) if (order !== L0[o] && canStay(q, {...L0, [o]: order}, k)) out.push({owner: o, order});
  repairCache.set(id, out);
  return out;
}
// Two blocking pairs with no letter in common: the certificate that no one strip repairs k.
export function disjointBlockers(q, L, k) {
  const b = blockersOf(q, L, k);
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) if (b[i][0] !== b[j][0] && b[i][1] !== b[j][1]) return [b[i], b[j]];
  return null;
}

// Every complete profile of a small market, for design hints: lists keyed by owner.
const profileCache = new Map();
export function profilesOf(q) {
  const id = q.circles + q.squares;
  if (profileCache.has(id)) return profileCache.get(id);
  const owners = ownersOf(q), orders = owners.map(o => permutations([...otherSide(q, o)]).map(p => p.join('')));
  let out = [{}];
  owners.forEach((o, i) => { out = out.flatMap(L => orders[i].map(s => ({...L, [o]: s}))); });
  profileCache.set(id, out);
  return out;
}
// Swaps that turn one order into another: its length less its cycles.
export function swapsBetween(a, b) {
  const seen = new Set();
  let cycles = 0;
  for (let i = 0; i < a.length; i++) {
    if (seen.has(i)) continue;
    cycles++;
    for (let j = i; !seen.has(j); j = b.indexOf(a[j])) seen.add(j);
  }
  return a.length - cycles;
}
const listDistance = (q, L, M) => ownersOf(q).reduce((n, o) => n + swapsBetween(L[o], M[o]), 0);
// The first swap that brings an order toward a target.
export function swapToward(cur, tgt) {
  const i = [...cur].findIndex((x, k) => x !== tgt[k]);
  return i < 0 ? null : [i, cur.indexOf(tgt[i])];
}

// --- Boards -------------------------------------------------------------------
// check:  {said}                       the pairing is fixed; said is null, 'stays' or a claim 'AY'
// every:  {pairing, kept, claimed, missed, pending, said}, with lists when the strips can change
// repair: {strip, said}                strip is null or {owner, order}, the one strip changed
// last:   {lists, pairing, pending, said}
// playground: {size, lists, pairing, kept, pending, said}
// `pending` means Stays was refused: the pairing is held until a blocking
// pair is tapped. `said` is then the last claim, kept while it is wrong.
const isPlay = p => p.parameters.mode === 'playground';
export const marketOf = (p, b) => isPlay(p) ? p.parameters.markets[b.size] : p.parameters;
export const listsOf = (p, b) => {
  const q = p.parameters;
  if (q.mode === 'repair') return b.strip ? {...q.lists, [b.strip.owner]: b.strip.order} : q.lists;
  return b.lists || q.lists;
};
export const pairingOf = (p, b) => b.pairing || p.parameters.pairing;
const editable = q => q.mode === 'last' || q.mode === 'playground' || q.mode === 'repair' || Boolean(q.edit);
const claimOk = (q, k, said) => typeof said === 'string' && said.length === 2 && isCircle(q, said[0]) && isSquare(q, said[1]) && partnerOf(q, k, said[0]) !== said[1];

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'check') return {said: null};
  if (q.mode === 'repair') return {strip: null, said: null};
  if (q.mode === 'last') return {lists: {...q.lists}, pairing: q.pairing, pending: false, said: null};
  if (q.mode === 'playground') { const size = q.start, m = q.markets[size]; return {size, lists: {...m.lists}, pairing: m.pairing, kept: [], pending: false, said: null}; }
  return {...(q.edit ? {lists: {...q.lists}} : {}), pairing: q.pairing, kept: [], claimed: false, missed: false, pending: false, said: null};
}
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
// A held pairing: pending only when it can't stay; a claim only while held or
// just after the right one released it.
function validHold(q, L, k, b) {
  if (typeof b.pending !== 'boolean') return false;
  if (b.pending && canStay(q, L, k)) return false;
  if (b.said === null) return true;
  return claimOk(q, k, b.said) && b.pending === !blocks(q, L, k, b.said[0], b.said[1]);
}
function valid(p, b) {
  const q0 = p.parameters;
  if (q0.mode === 'check') return keysAre(b, ['said']) && (b.said === null || b.said === 'stays' || claimOk(q0, q0.pairing, b.said));
  if (q0.mode === 'repair') {
    if (!keysAre(b, ['strip', 'said'])) return false;
    if (b.strip !== null && !(keysAre(b.strip, ['owner', 'order']) && ownersOf(q0).includes(b.strip.owner) && isStrip(q0, b.strip.owner, b.strip.order) && b.strip.order !== q0.lists[b.strip.owner])) return false;
    return b.said === null || b.said === 'stays' || b.said === 'cant' || claimOk(q0, q0.pairing, b.said);
  }
  if (q0.mode === 'last') {
    if (!keysAre(b, ['lists', 'pairing', 'pending', 'said']) || !validLists(q0, b.lists) || !isPairing(q0, b.pairing)) return false;
    if (b.said === 'stays') return !b.pending && canStay(q0, b.lists, b.pairing);
    return validHold(q0, b.lists, b.pairing, b);
  }
  if (q0.mode === 'playground') {
    if (!keysAre(b, ['size', 'lists', 'pairing', 'kept', 'pending', 'said']) || !Object.hasOwn(q0.markets, String(b.size))) return false;
    const q = q0.markets[b.size];
    if (!validLists(q, b.lists) || !isPairing(q, b.pairing)) return false;
    const target = stableOf(q, b.lists);
    return validShelf({kept: b.kept, claimed: false, missed: false}, target) && validHold(q, b.lists, b.pairing, b);
  }
  if (!keysAre(b, [...(q0.edit ? ['lists'] : []), 'pairing', 'kept', 'claimed', 'missed', 'pending', 'said'])) return false;
  const L = q0.edit ? b.lists : q0.lists;
  if ((q0.edit && !validLists(q0, L)) || !isPairing(q0, b.pairing)) return false;
  return validShelf(b, stableOf(q0, L)) && validHold(q0, L, b.pairing, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'check') return b.said === 'stays' ? canStay(q, q.lists, q.pairing) : Boolean(b.said) && blocks(q, q.lists, q.pairing, b.said[0], b.said[1]);
  if (q.mode === 'repair') return b.said === 'stays' ? canStay(q, listsOf(p, b), q.pairing) : b.said === 'cant' && !repairsOf(q, q.lists, q.pairing).length;
  if (q.mode === 'last') return b.said === 'stays' && lastOnes(q, b.lists, b.pairing).length >= q.goal;
  return b.claimed && (q.count === undefined || b.kept.length === q.count);
}

// --- Moves --------------------------------------------------------------------
// pair {c, s}: c and s pair up.     block {c, s}: c and s would both rather be together.
// stays: the pairing can stay.      all: That's all.     cant: no one strip can do it.
// swap {owner, i, j}: two places on a strip change.     size {size}: the playground's market.
function holdMove(q, L, k, b, action) {
  if (action.type === 'block') {
    const said = String(action.c) + String(action.s);
    if (!b.pending || !claimOk(q, k, said) || b.said === said) return null;
    return {...b, said, pending: !blocks(q, L, k, action.c, action.s)};
  }
  return undefined;
}
function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = marketOf(p, b), L = listsOf(p, b), k = pairingOf(p, b);
  const claim = isCircle(q, action.c) && isSquare(q, action.s) ? action.c + action.s : null;
  if (q0.mode === 'check') {
    if (action.type === 'stays') return b.said === 'stays' ? null : {said: 'stays'};
    if (action.type === 'block') return claim && claimOk(q, k, claim) && b.said !== claim ? {said: claim} : null;
    return null;
  }
  if (q0.mode === 'repair') {
    if (action.type === 'stays' || action.type === 'cant') return b.said === action.type ? null : {...b, said: action.type};
    if (action.type === 'block') return claim && claimOk(q, k, claim) && b.said !== claim ? {...b, said: claim} : null;
    if (action.type === 'swap') {
      const o = action.owner;
      if (!ownersOf(q).includes(o) || !Number.isInteger(action.i) || !Number.isInteger(action.j) || action.i === action.j || [action.i, action.j].some(i => i < 0 || i >= L[o].length)) return null;
      // A change to another strip puts the first one back: one strip at a time.
      const order = swapIn(b.strip?.owner === o ? b.strip.order : q.lists[o], action.i, action.j);
      return {strip: order === q.lists[o] ? null : {owner: o, order}, said: null};
    }
    return null;
  }
  const held = holdMove(q, L, k, b, action);
  if (held !== undefined) return held;
  if (b.pending) return null;
  const finding = q0.mode === 'every' || q0.mode === 'playground';
  switch (action.type) {
    case 'pair':
      return claim && partnerOf(q, k, action.c) !== action.s ? {...b, pairing: pairUp(q, k, action.c, action.s), said: null} : null;
    case 'swap': {
      if (!editable(q0)) return null;
      const o = action.owner;
      if (!ownersOf(q).includes(o) || !Number.isInteger(action.i) || !Number.isInteger(action.j) || action.i === action.j || [action.i, action.j].some(i => i < 0 || i >= L[o].length)) return null;
      const lists = {...L, [o]: swapIn(L[o], action.i, action.j)};
      // New strips: the pairings kept for the old ones no longer count.
      return finding ? {...b, lists, kept: [], ...(q0.mode === 'every' ? {claimed: false, missed: false} : {}), said: null} : {...b, lists, said: null};
    }
    case 'stays': {
      if (q0.mode === 'last') {
        if (b.said === 'stays') return null;
        return canStay(q, L, k) ? {...b, said: 'stays'} : {...b, pending: true, said: null};
      }
      if (b.kept.includes(k) || b.claimed) return null;
      if (!canStay(q, L, k)) return {...b, pending: true, said: null};
      return {...b, kept: keepCase(b.kept, k, key => stableOf(q, L).includes(key)), said: null, ...(q0.mode === 'every' ? {missed: false} : {})};
    }
    case 'all': {
      if (q0.mode !== 'every' || b.missed || b.claimed || !b.kept.length) return null;
      return {...b, ...claimCases(stableOf(q, L), b.kept), said: null};
    }
    case 'size': {
      if (q0.mode !== 'playground' || !Object.hasOwn(q0.markets, String(action.size)) || Number(action.size) === b.size) return null;
      const m = q0.markets[action.size];
      return {size: Number(action.size), lists: {...m.lists}, pairing: m.pairing, kept: [], pending: false, said: null};
    }
  }
  return null;
}

// --- Hints --------------------------------------------------------------------
const pairWords = c => c.length === 2 ? `${c[0]} and ${c[1]}` : c;
const blockHint = (q, L, k) => {
  const [c, s] = blockersOf(q, L, k)[0];
  return {type: 'move', action: {type: 'block', c, s}, text: `${c} would rather have ${s}, and ${s} would rather have ${c}.`};
};
const swapHint = (o, cur, [i, j]) => ({type: 'move', action: {type: 'swap', owner: o, i, j}, text: `On ${o}’s strip, swap ${cur[i]} and ${cur[j]}.`});
// The pairing to aim for: the nearest of the targets, then the first circle
// whose partner differs.
const pairDistance = (a, b) => swapsBetween(a, b);
const nearest = (list, dist) => list.reduce((best, x) => best === null || dist(x) < dist(best) ? x : best, null);
function pairHint(q, k, target) {
  const c = [...q.circles].find((x, i) => k[i] !== target[i]);
  return {type: 'move', action: {type: 'pair', c, s: target[q.circles.indexOf(c)]}, text: `Pair ${c} with ${target[q.circles.indexOf(c)]}.`};
}
// Lists with exactly `count` pairings that can stay, nearest the child's.
function listTarget(q, L, ok) {
  let best = null, bestD = Infinity;
  for (const M of profilesOf(q)) {
    const d = listDistance(q, L, M);
    if (d < bestD && ok(M)) { best = M; bestD = d; if (d === 0) break; }
  }
  return best;
}
function walkLists(q, L, M) {
  for (const o of ownersOf(q)) { const step = swapToward(L[o], M[o]); if (step) return swapHint(o, L[o], step); }
  return null;
}
function everyHint(p, b) {
  const q = marketOf(p, b), q0 = p.parameters, L = listsOf(p, b), k = b.pairing;
  if (b.pending) return blockHint(q, L, k);
  let lists = L;
  if (q0.count !== undefined && stableOf(q, L).length !== q0.count) {
    lists = listTarget(q, L, M => stableOf(q, M).length === q0.count);
    return walkLists(q, L, lists);
  }
  const left = stableOf(q, lists).filter(key => !b.kept.includes(key));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const target = nearest(left, key => pairDistance(k, key));
  if (target === k) return {type: 'move', action: {type: 'stays'}, text: 'Press Stays.'};
  return pairHint(q, k, target);
}
// Last choices: the nearest lists and pairing that can stay with `goal` last
// choices, searching only lists nearer than the best found so far.
export function lastTarget(q, L, k, goal) {
  let best = null, bestD = Infinity;
  for (const M of profilesOf(q)) {
    const d = listDistance(q, L, M);
    if (d >= bestD) continue;
    for (const key of stableOf(q, M)) {
      const e = d + pairDistance(k, key);
      if (e < bestD && lastOnes(q, M, key).length >= goal) { best = {lists: M, pairing: key}; bestD = e; }
    }
  }
  return best;
}
function lastHint(p, b) {
  const q = p.parameters, L = b.lists, k = b.pairing;
  if (b.pending) return blockHint(q, L, k);
  if (canStay(q, L, k) && lastOnes(q, L, k).length >= q.goal) return {type: 'move', action: {type: 'stays'}, text: 'Press Stays.'};
  const t = lastTarget(q, L, k, q.goal);
  return walkLists(q, L, t.lists) || pairHint(q, k, t.pairing);
}
function repairHint(p, b) {
  const q = p.parameters, k = q.pairing, all = repairsOf(q, q.lists, k);
  if (!all.length) {
    const [x, y] = disjointBlockers(q, q.lists, k);
    return {type: 'move', action: {type: 'cant'}, text: `${pairWords(x)} would both switch, and so would ${pairWords(y)}. No strip has a letter of each. Press Can’t.`};
  }
  const L = listsOf(p, b);
  if (canStay(q, L, k)) return {type: 'move', action: {type: 'stays'}, text: 'Press Stays.'};
  // Keep the strip the child is changing when it can still do it.
  const mine = b.strip ? all.filter(r => r.owner === b.strip.owner) : [];
  const pool = mine.length ? mine : all;
  const t = nearest(pool, r => swapsBetween(L[r.owner], r.order) + (b.strip && b.strip.owner !== r.owner ? 1 : 0));
  return swapHint(t.owner, L[t.owner], swapToward(L[t.owner], t.order));
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.mode === 'check') {
    if (canStay(q, q.lists, q.pairing)) return {type: 'move', action: {type: 'stays'}, text: 'Each wish to switch meets a no. Press Stays.'};
    return blockHint(q, q.lists, q.pairing);
  }
  if (q.mode === 'repair') return repairHint(p, b);
  if (q.mode === 'last') return lastHint(p, b);
  return everyHint(p, b);
}

// --- Choosing -----------------------------------------------------------------
// View state outside the save: the letter or strip place tapped first. Any
// move, Undo or hint changes the move count and clears it.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, at: null}); return uiState.get(p.id); };
const current = (state, a) => { if (state.at !== a.moves) Object.assign(state, {pick: null, at: a.moves}); return state; };
// What a tap on two letters means now: pair them, or claim they block.
export function tokenMode(p, b) {
  const q = p.parameters;
  if (solved(p, b)) return null;
  if (q.mode === 'check' || q.mode === 'repair') return 'block';
  return b.pending ? 'block' : 'pair';
}
export const cellsLive = (p, b) => editable(p.parameters) && !solved(p, b) && !b.pending;
// The move for two taps, or null (a partner tapped as a claim, or the same side).
export function tapAction(p, b, first, second) {
  const q = marketOf(p, b), k = pairingOf(p, b), mode = tokenMode(p, b);
  if (!mode) return null;
  const [c, s] = isCircle(q, first) && isSquare(q, second) ? [first, second] : isSquare(q, first) && isCircle(q, second) ? [second, first] : [null, null];
  if (!c || partnerOf(q, k, c) === s) return null;
  return {type: mode, c, s};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const NUMBER = ['None', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
const sayPairing = (q, k) => [...q.circles].map((c, i) => `${c} with ${k[i]}`).join(', ');
// A small picture of a pairing for the shelf: circles above, squares below.
export function pairingMini(q, k, dash = null) {
  const n = q.circles.length, w = 14 * n + 4, x = i => 9 + 14 * i;
  const lines = [...q.circles].map((c, i) => `<line x1="${x(i)}" y1="10" x2="${x(q.squares.indexOf(k[i]))}" y2="30"/>`).join('');
  const dashed = dash ? `<line class="dash" x1="${x(q.circles.indexOf(dash[0]))}" y1="10" x2="${x(q.squares.indexOf(dash[1]))}" y2="30"/>` : '';
  const letters = [...q.circles].map((c, i) => `<circle cx="${x(i)}" cy="6" r="5.4"/><text x="${x(i)}" y="8.3">${c}</text>`).join('') + [...q.squares].map((s, i) => `<rect x="${x(i) - 5.2}" y="28.8" width="10.4" height="10.4" rx="1.6"/><text x="${x(i)}" y="36.4">${s}</text>`).join('');
  return `<svg class="sm-mini" viewBox="0 0 ${w} 40" width="${w * 1.6}" height="64" aria-hidden="true"><g class="sm-mini-links">${lines}${dashed}</g>${letters}</svg>`;
}
const button = (label, action, enabled, hinted, extra = '') => `<button type="button" class="secondary sm-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="sm-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;

// Marks on strips: a letter wanted (ochre ring), a partner kept by one who
// says no (pine ring). Lines: pairs, a dashed claim, dotted wishes.
function claimMarks(q, L, k, c, s, marks) {
  for (const [x, y] of [[c, s], [s, c]]) {
    marks[x] ||= {};
    if (wants(q, L, k, x, y)) marks[x][y] = 'want';
    else { marks[x][partnerOf(q, k, x)] = 'keep'; marks[x][y] = 'no'; }
  }
}
function board(p, a, o) {
  const q = o.q, L = o.lists, k = o.pairing, n = q.circles.length, state = o.state, pick = state.pick;
  const hinted = o.hinted || {}, marks = o.marks || {}, cells = o.cells, taps = o.taps;
  const token = (x, side) => {
    const partner = partnerOf(q, k, x), picked = pick === x, label = `${side === 'c' ? 'Circle' : 'Square'} ${x}, with ${partner}${picked ? ', chosen' : ''}${o.last?.includes(x) ? ', its last choice' : ''}`;
    const cls = `sm-token sm-${side}${picked ? ' picked' : ''}${hinted.tokens?.includes(x) ? ' hinted' : ''}${o.no?.includes(x) ? ' no' : ''}`;
    return taps
      ? `<button type="button" class="${cls}" data-sm="${x}" data-focus="sm-${x}" aria-label="${esc(label)}" aria-pressed="${picked}">${x}</button>`
      : `<span class="${cls}" role="img" aria-label="${esc(label)}">${x}</span>`;
  };
  const cell = (owner, r) => {
    const y = L[owner][r], id = `${owner}:${r}`, picked = pick === id, partner = partnerOf(q, k, owner) === y, mark = marks[owner]?.[y];
    const shape = isCircle(q, owner) ? 'sq' : 'ci';
    const cls = `sm-cell${partner ? ' partner' : ''}${mark ? ` ${mark}` : ''}${picked ? ' picked' : ''}${hinted.cells?.includes(id) ? ' hinted' : ''}`;
    const label = `${owner}’s choice ${r + 1}: ${y}${partner ? ', its partner' : ''}${picked ? ', chosen' : ''}`;
    const face = `<i class="sm-${shape}">${y}</i>`;
    return cells
      ? `<button type="button" class="${cls}" data-sm="${id}" data-focus="sm-cell-${owner}-${r}" aria-label="${esc(label)}" aria-pressed="${picked}">${face}</button>`
      : `<span class="${cls}" aria-label="${esc(label)}">${face}</span>`;
  };
  const rows = [];
  // Circles' strips above them, first choice nearest; squares' strips below.
  for (let r = n - 1; r >= 0; r--) rows.push(`<span class="sm-rank" aria-hidden="true">${r + 1}</span>${[...q.circles].map(c => cell(c, r)).join('')}`);
  rows.push(`<span class="sm-rank" aria-hidden="true"></span>${[...q.circles].map(c => token(c, 'c')).join('')}`);
  const x = i => f((i + 0.5) * 100 / n);
  const line = (c, s, cls) => `<line class="${cls}" x1="${x(q.circles.indexOf(c))}" y1="0" x2="${x(q.squares.indexOf(s))}" y2="30"/>`;
  const links = [...q.circles].map((c, i) => line(c, k[i], 'pair')).join('') + (o.lines || []).map(([c, s, cls]) => line(c, s, cls)).join('');
  rows.push(`<span class="sm-rank" aria-hidden="true"></span><svg class="sm-links" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">${links}</svg>`);
  rows.push(`<span class="sm-rank" aria-hidden="true"></span>${[...q.squares].map(s => token(s, 's')).join('')}`);
  for (let r = 0; r < n; r++) rows.push(`<span class="sm-rank" aria-hidden="true">${r + 1}</span>${[...q.squares].map(s => cell(s, r)).join('')}`);
  return `<div class="sm-board${o.held ? ' held' : ''}" style="--n:${n}" role="group" aria-label="Strips and pairing">${rows.join('')}</div>`;
}

function render(p, a) {
  const q0 = p.parameters, b = a.board, q = marketOf(p, b), L = listsOf(p, b), k = pairingOf(p, b), done = solved(p, b), state = current(ui(p), a);
  const h = a.hintLevel >= 2 && !done && !isPlay(p) ? hint(p, b) : null, act = h?.action;
  const hinted = {tokens: act && (act.type === 'pair' || act.type === 'block') ? [act.c, act.s] : [], cells: act?.type === 'swap' ? [`${act.owner}:${act.i}`, `${act.owner}:${act.j}`] : []};
  const marks = {}, lines = [];
  let told = '', no = [], shownLists = L, cert = '';
  const said = typeof b.said === 'string' && b.said.length === 2 ? b.said : null;
  const held = b.pending || q0.mode === 'check' || q0.mode === 'repair';
  if (said) {
    const [c, s] = said, ok = blocks(q, L, k, c, s);
    claimMarks(q, L, k, c, s, marks);
    lines.push([c, s, ok ? 'claim yes' : 'claim no']);
    if (!ok) { no = saysNo(q, L, k, c, s); told = `${listWords(no)} ${no.length === 1 ? 'says' : 'say'} no.`; }
  }
  const findIt = 'Can’t stay. Tap a circle and a square that would both rather be together.';
  if (b.pending && !said) told = findIt;
  if (q0.mode === 'check') {
    // The objective already says what to tap.
    if (b.said === 'stays' && !done) told = 'Can’t stay.';
    // The certificate for Stays: every wish to switch, and who says no.
    if (b.said === 'stays' && done) for (const c of q.circles) for (const s of q.squares) if (partnerOf(q, k, c) !== s && (wants(q, L, k, c, s) || wants(q, L, k, s, c))) { claimMarks(q, L, k, c, s, marks); lines.push([c, s, 'wish']); }
  }
  if (q0.mode === 'repair') {
    if (b.said === 'stays' && !done) told = 'Can’t stay.';
    if (b.said === 'cant' && !done) told = 'One strip can do it.';
    if (b.said === 'cant' && done) {
      // The certificate: two blocking pairs on the printed strips with no letter in common.
      shownLists = q.lists;
      for (const [c, s] of disjointBlockers(q, q.lists, k)) { claimMarks(q, q.lists, k, c, s, marks); lines.push([c, s, 'claim yes']); }
      cert = '<p class="sm-why">One strip can change only one of these.</p>';
    }
  }
  if (q0.mode === 'every' && !b.pending) {
    if (b.missed) told = 'There’s another.';
    else if (b.claimed && !done) told = `${b.kept.length === 1 ? 'Only one' : NUMBER[b.kept.length]} can stay.`;
  }
  const last = q0.mode === 'last' ? lastOnes(q, L, k) : null;
  if (q0.mode === 'last' && b.said === 'stays' && !done) told = `${last.length === 1 ? 'One gets its' : `${NUMBER[last.length]} get their`} last choice.`;
  const taps = Boolean(tokenMode(p, b)), cells = cellsLive(p, b) && !(q0.mode === 'repair' && done);
  const grid = board(p, a, {q, lists: shownLists, pairing: k, state, hinted, marks, lines, no, taps, cells, held: held && !done, last: q0.mode === 'last' && (done || b.said === 'stays') ? last : null});

  // Claims.
  const hintOn = type => act?.type === type;
  let bar = '';
  if (!done) {
    const parts = [];
    if (q0.mode === 'check') parts.push(button('Stays', {type: 'stays'}, b.said !== 'stays', hintOn('stays')));
    if (q0.mode === 'repair') parts.push(button('Stays', {type: 'stays'}, b.said !== 'stays', hintOn('stays')), button('Can’t', {type: 'cant'}, b.said !== 'cant', hintOn('cant')));
    if (q0.mode === 'last') parts.push(button('Stays', {type: 'stays'}, !b.pending && b.said !== 'stays', hintOn('stays')));
    if (q0.mode === 'every' || q0.mode === 'playground') {
      parts.push(button('Stays', {type: 'stays'}, !b.pending && !b.kept.includes(k) && !b.claimed, hintOn('stays')));
      if (q0.mode === 'every') parts.push(button('That’s all', {type: 'all'}, !b.pending && !b.missed && !b.claimed && b.kept.length > 0, hintOn('all')));
    }
    bar = `<div class="sm-bar">${parts.join('')}</div>`;
  }
  let top = '';
  if (isPlay(p)) top = `<div class="sm-sizes" role="group" aria-label="Pairs">${Object.keys(q0.markets).map(n => `<button type="button" class="secondary sm-size" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', size: Number(n)}))}" data-focus="sm-size-${n}" aria-pressed="${b.size === Number(n)}" aria-label="${NUMBER[n]} pairs">${pairingMini(q0.markets[n], q0.markets[n].pairing)}</button>`).join('')}</div>`;
  const shelf = b.kept?.length ? shelfHTML(b.kept, {mini: key => pairingMini(q, key), say: key => sayPairing(q, key), current: b.kept.includes(k) ? k : null, label: 'Pairings that can stay'}) : '';
  const note = told ? `<p class="sm-told">${esc(told)}</p>` : '';
  const status = `${sayPairing(q, k)}.${told ? ` ${told}` : ''}${state.pick ? ` ${state.pick.replace(':', ' place ')} chosen.` : ''}`;
  return `<div class="sm-puzzle${done ? ' solved' : ''}" data-mechanic-wire="matching">${top}${grid}${note}${cert}${bar}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Taps and drags: a letter, then a letter on the other side; a strip place,
// then another place on the same strip. A drag from one to the other works too.
let kept = null;
function wire(root, p, api) {
  const state = () => current(ui(p), api.attempt());
  const usable = el => el && root.contains(el) && el.tagName === 'BUTTON' && !el.disabled;
  const run = (first, second) => {
    const b = api.attempt().board;
    if (first.includes(':') || second.includes(':')) {
      const [o1, i] = first.split(':'), [o2, j] = second.split(':');
      if (o1 !== o2 || !first.includes(':') || !second.includes(':')) return false;
      api.apply({type: 'swap', owner: o1, i: Number(i), j: Number(j)});
      return true;
    }
    const action = tapAction(p, b, first, second);
    if (!action) return false;
    api.apply(action);
    return true;
  };
  const tap = id => {
    const s = state(), first = s.pick;
    if (first === null) { api.ui({pick: id, moves: api.attempt().moves}); return; }
    if (first === id) { api.ui({pick: null, moves: api.attempt().moves}); return; }
    if (!run(first, id)) api.ui({pick: id, moves: api.attempt().moves});
  };
  root.addEventListener('click', e => {
    const el = e.target.closest('[data-sm]');
    if (usable(el)) { tap(el.dataset.sm); return; }
    const stays = e.target.closest('[data-focus="sm-stays"]');
    if (stays && root.contains(stays) && !stays.disabled) kept = {id: p.id, moves: api.attempt().moves};
  });
  let from = null;
  root.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-sm]');
    from = usable(el) ? el : null;
    if (from) document.addEventListener('pointerup', () => { from = null; }, {once: true});
  });
  root.addEventListener('pointerup', e => {
    const start = from;
    from = null;
    if (!start) return;
    const to = document.elementFromPoint?.(e.clientX, e.clientY)?.closest?.('[data-sm]');
    if (!usable(to) || to === start) return;
    e.preventDefault();
    run(start.dataset.sm, to.dataset.sm);
  });
  const last = kept;
  kept = null;
  // A pairing just kept arrives on the shelf.
  if (last && last.id === p.id && api.attempt().moves === last.moves + 1) root.querySelector('.case-kept.current')?.classList.add('fresh');
}

export const matchingMechanics = {
  matching: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload) || !Number.isSafeInteger(payload.moves)) return;
      const state = ui(p);
      state.at = payload.moves;
      state.pick = typeof payload.pick === 'string' && /^[A-Z](:\d)?$/.test(payload.pick) ? payload.pick : null;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the pairings already kept, while the strips are the same.
    carry(p, from, to) {
      const q = p.parameters;
      if ((q.mode !== 'every' && q.mode !== 'playground') || !object(from) || !object(to) || !Array.isArray(from.kept)) return to;
      if (q.mode === 'playground' && from.size !== to.size) return to;
      const L1 = listsOf(p, from), L2 = listsOf(p, to);
      if (!sameLists(marketOf(p, to), L1, L2)) return to;
      return {...to, kept: [...from.kept], ...(q.mode === 'every' ? {claimed: false, missed: false} : {})};
    },
    noHint: isPlay
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'matching',
  family: {id: 'matching', symbol: '⊶'},
  mechanics: matchingMechanics,
  pack: new URL('./matching.json', import.meta.url).href,
  css: new URL('./matching.css', import.meta.url).href,
  focus: '.sm-token[data-sm],.sm-cell[data-sm],.sm-button:not([disabled])'
};
