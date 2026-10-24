// Trios (worksheet Week 36, Making threes, and its bonus). A card has d
// attributes with three values each: shape and fill for the nine tiles, then
// a count of 1, 2 or 3 shapes (27 cards), then an ink colour (81 cards). A
// trio is three different cards whose values, attribute by attribute, are all
// the same or all different. With the values written 0, 1, 2 that is
// a + b + c ≡ 0 (mod 3) in every coordinate, so the cards are the points of
// the affine space over the integers mod 3 and the trios are its lines.
//
// Any two cards have exactly one third card: keep a shared value, or take the
// missing one. So two trios share at most one card, four trios pass through
// each of the nine tiles, and the twelve trios fall into four families of
// three disjoint trios, the only four ways to split the tiles into trios. At
// most four tiles hold no trio: five tiles have ten pairs, a pair's third tile
// is one of the four others, and each of those completes at most two pairs of
// the five (pairs with the same third tile can't share a tile), so 8 < 10.
// Every three tiles with no trio leave exactly three tiles free, so every
// stuck collection has four tiles. Among the 27 cards the most is nine, but
// adding cards one by one sticks at eight more often than not. The nine
// tiles can't take two colours without a one-colour trio (each colour holds
// at most four, and 4 + 4 < 9); three colours can. In the avoidance game the
// first player wins by answering each tile with the third tile of it and the
// first tile claimed.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = value => Number.isInteger(value);
export const SHAPES = ['circle', 'triangle', 'square'];
export const FILLS = ['open', 'striped', 'solid'];
export const INKS = ['green', 'red', 'blue'];
export const PAINTS = ['yellow', 'blue', 'red'];
export const COUNT_WORDS = ['one', 'two', 'three'];
export const MODES = ['complete', 'through', 'split', 'cap', 'paint', 'game', 'playground'];

// --- Cards and trios ---------------------------------------------------------
// Card i of a deck with d attributes has digit k = ⌊i / 3^k⌋ mod 3: shape,
// fill, count, ink. The nine tiles are cards 0–8 of every deck.
export const deckSize = d => 3 ** d;
export const digits = (d, i) => Array.from({length: d}, (_, k) => Math.floor(i / 3 ** k) % 3);
const fromDigits = ds => ds.reduce((sum, v, k) => sum + v * 3 ** k, 0);
const isCard = (d, i) => int(i) && i >= 0 && i < deckSize(d);
export const third = (d, a, b) => { const x = digits(d, a), y = digits(d, b); return fromDigits(x.map((v, k) => (6 - v - y[k]) % 3)); };
export const isTrio = (d, a, b, c) => a !== b && a !== c && b !== c && third(d, a, b) === c;
const sortIds = list => [...list].sort((x, y) => x - y);
export const trioKey = trio => sortIds(trio).join('.');
const lineCache = new Map();
// Every trio of the deck, each sorted, in order.
export function trios(d) {
  if (!lineCache.has(d)) {
    const out = [];
    for (let a = 0; a < deckSize(d); a++) for (let b = a + 1; b < deckSize(d); b++) { const c = third(d, a, b); if (c > b) out.push([a, b, c]); }
    lineCache.set(d, out);
  }
  return lineCache.get(d);
}
// The trios inside a set of cards.
export function triosIn(d, set) {
  const has = new Set(set), out = [];
  const list = sortIds(set);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const c = third(d, list[i], list[j]); if (c > list[j] && has.has(c)) out.push([list[i], list[j], c]); }
  return out;
}
export const isCap = (d, set) => triosIn(d, set).length === 0;
// The first pair of the chosen cards whose third card is c, or null.
export function blocker(d, chosen, c) {
  for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) if (third(d, chosen[i], chosen[j]) === c) return [chosen[i], chosen[j]];
  return null;
}
export function blockedSet(d, chosen) {
  const out = new Set();
  for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) out.add(third(d, chosen[i], chosen[j]));
  for (const c of chosen) out.delete(c);
  return out;
}
// Every cap of the given size (no trio), as sorted lists, by a search that
// adds cards in increasing order and skips cards a chosen pair already rules out.
// Masks of 27 bits fit a number's 32-bit operations; the 81-card deck is
// never searched.
const capCache = new Map();
const popcount = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
export function capsOfSize(d, size) {
  const key = `${d}:${size}`;
  if (capCache.has(key)) return capCache.get(key);
  const out = [], n = deckSize(d), T = Array.from({length: n * n}, (_, k) => third(d, Math.floor(k / n), k % n));
  const above = Array.from({length: n + 1}, (_, c) => c >= 31 ? 0 : (2 ** 31 - 1) & ~((1 << c) - 1));
  (function grow(chosen, banned, from) {
    if (chosen.length === size) { out.push([...chosen]); return; }
    // Stop when too few cards are left to reach the size.
    if (popcount(above[from] & ~banned & ((2 ** n) - 1)) < size - chosen.length) return;
    for (let c = from; c < n; c++) {
      if (banned >> c & 1) continue;
      let next = banned;
      for (const x of chosen) next |= 1 << T[x * n + c];
      chosen.push(c); grow(chosen, next, c + 1); chosen.pop();
    }
  })([], 0, 0);
  capCache.set(key, out);
  return out;
}
// The four ways to split the nine tiles into three trios, each a list of
// three sorted trios.
let splitCache = null;
export function splits() {
  if (splitCache) return splitCache;
  const L = trios(2), out = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) for (let k = j + 1; k < L.length; k++) {
    if (new Set([...L[i], ...L[j], ...L[k]]).size === 9) out.push([L[i], L[j], L[k]]);
  }
  splitCache = out;
  return out;
}
export const splitKey = groups => groups.map(trioKey).sort().join('|');

// --- Names -------------------------------------------------------------------
const plural = {circle: 'circles', triangle: 'triangles', square: 'squares'};
// "striped triangle", "two striped triangles", "two red striped triangles".
export function cardName(d, i) {
  const [s, f, n, k] = digits(d, i), shape = SHAPES[s];
  if (d < 3) return `${FILLS[f]} ${shape}`;
  const ink = d > 3 ? `${INKS[k]} ` : '';
  return `${COUNT_WORDS[n]} ${ink}${FILLS[f]} ${n ? plural[shape] : shape}`;
}
export const tileName = i => cardName(2, i);
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

// --- Painting the nine tiles -------------------------------------------------
// Paint puzzles give each tile a value: a colour (rule 'mono': no trio all one
// colour) or a count of shapes (rule 'card': no three tiles that make a trio
// as cards, that is all one count or all three counts). A tile with count v is
// card t + 9v of the 27.
export const flaggedLines = (rule, paint) => trios(2).filter(t => {
  const v = t.map(i => paint[i]);
  if (v.some(x => x === null)) return false;
  const kinds = new Set(v).size;
  return kinds === 1 || (rule === 'card' && kinds === 3);
});
const designCache = new Map();
// Every painting of all nine tiles with no flagged trio, as value lists, in
// the order of the number whose base-`values` digit i is tile i's value. A
// search from tile 8 down checks each trio once its smallest tile is set.
export function designs(values, rule) {
  const key = `${values}:${rule}`;
  if (designCache.has(key)) return designCache.get(key);
  const out = [], paint = Array(9).fill(0), closing = Array.from({length: 9}, (_, i) => trios(2).filter(t => t[0] === i));
  const flagged = (x, y, z) => (x === y && y === z) || (rule === 'card' && x !== y && y !== z && x !== z);
  (function go(i) {
    if (i < 0) { out.push([...paint]); return; }
    for (let v = 0; v < values; v++) {
      paint[i] = v;
      if (!closing[i].some(([a, b, c]) => flagged(paint[a], paint[b], paint[c]))) go(i - 1);
    }
  })(8);
  designCache.set(key, out);
  return out;
}

// --- The avoidance game ------------------------------------------------------
// Two players claim unused tiles in turn; whoever first owns a trio among
// their own tiles loses. Positions are bit masks of the tiles each owns.
const lineMasks = trios(2).map(t => t.reduce((m, i) => m | (1 << i), 0));
export const ownsTrio = mask => lineMasks.some(l => (mask & l) === l);
const maskOf = list => list.reduce((m, i) => m | (1 << i), 0);
const freeTiles = (a, b) => Array.from({length: 9}, (_, i) => i).filter(i => !((a | b) >> i & 1));
const winMemo = new Map();
// Does the player about to move (owning `me`) win against best play?
export function moverWins(me, other) {
  const key = me * 512 + other;
  if (winMemo.has(key)) return winMemo.get(key);
  const result = freeTiles(me, other).some(i => !ownsTrio(me | (1 << i)) && !moverWins(other, me | (1 << i)));
  winMemo.set(key, result);
  return result;
}
// The winning claims for the player to move.
export const winningClaims = (me, other) => freeTiles(me, other).filter(i => !ownsTrio(me | (1 << i)) && !moverWins(other, me | (1 << i)));
// The app's claim: a winning claim if it has one; otherwise the safe claim
// that leaves the child the fewest winning answers; a trio only when forced.
export function appClaim(you, app) {
  const free = freeTiles(you, app), safe = free.filter(i => !ownsTrio(app | (1 << i)));
  if (!safe.length) return free[0] ?? null;
  const win = safe.filter(i => !moverWins(you, app | (1 << i)));
  if (win.length) return win[0];
  let best = safe[0], fewest = Infinity;
  for (const i of safe) { const n = winningClaims(you, app | (1 << i)).length; if (n < fewest) { fewest = n; best = i; } }
  return best;
}
// The tile opposite x about c: the third tile of c and x.
export const opposite = (c, x) => third(2, c, x);
// Replay a list of claims (child first): who owns what, and how it ended.
export function replay(turns) {
  let you = 0, app = 0, over = null;
  for (let k = 0; k < turns.length; k++) {
    const t = turns[k];
    if (over || !isCard(2, t) || ((you | app) >> t & 1)) return null;
    if (k % 2 === 0) { you |= 1 << t; if (ownsTrio(you)) over = 'lost'; }
    else { if (t !== appClaim(you, app)) return null; app |= 1 << t; if (ownsTrio(app)) over = 'won'; }
  }
  if (!over && turns.length % 2 === 1) return null;
  return {you, app, over};
}
const ownTrio = mask => lineMasks.map((l, k) => (mask & l) === l ? trios(2)[k] : null).find(Boolean) || null;

// --- Boards ------------------------------------------------------------------
//   complete:   {round, miss}             through: {pick, found, told, done}
//   split:      {trays, found, told, done}
//   cap:        {chosen, claim, told}     paint:   {paint, claim, told}
//   game:       {turns}                   playground: {deck, chosen}
// found holds keys (sorted ids joined by dots, or trio keys joined by bars);
// told answers That's all ('more'), a repeat ('again'), a refused Can't
// ('way', kept for the rest of the attempt) or a wrong certificate ('not',
// or 'out' for a real trio not all in the try).
const isOrder = (d, order) => Array.isArray(order) && order.length === deckSize(d) && new Set(order).size === order.length && order.every(i => isCard(d, i));
export const PLAY_DECKS = [2, 3, 4];

function fresh(p) {
  const q = p.parameters;
  switch (q.mode) {
    case 'complete': return {round: 0, miss: null};
    case 'through': return {pick: [], found: [], told: null, done: false};
    case 'split': return {trays: [[], [], []], found: [], told: null, done: false};
    case 'cap': return {chosen: sortIds(q.start || []), claim: null, told: null};
    case 'paint': return {paint: q.start ? [...q.start] : Array(9).fill(null), claim: null, told: null};
    case 'game': return {turns: []};
    default: return {deck: 2, chosen: []};
  }
}
const keysOk = (b, keys) => object(b) && Object.keys(b).sort().join() === keys;
const sortedIds = (d, list) => Array.isArray(list) && list.every((i, k) => isCard(d, i) && (k === 0 || list[k - 1] < i));
const pairKey = (a, b) => sortIds([a, b]).join('.');
// The found-pair keys allowed in a through puzzle: the other two tiles of each
// trio through the centre.
export const throughPairs = c => trios(2).filter(t => t.includes(c)).map(t => t.filter(i => i !== c).join('.'));
const capPossible = q => q.mode === 'cap' && capsOfSize(q.deck, q.target).length > 0;
const paintPossible = q => designs(q.values, q.rule).length > 0;
const possibleOf = q => q.mode === 'cap' ? capPossible(q) : paintPossible(q);

function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'complete') return keysOk(b, 'miss,round') && int(b.round) && b.round >= 0 && b.round <= q.pairs.length && (b.miss === null || (b.round < q.pairs.length && isCard(q.deck, b.miss) && !q.pairs[b.round].includes(b.miss) && b.miss !== third(q.deck, ...q.pairs[b.round])));
  if (q.mode === 'through') {
    if (!keysOk(b, 'done,found,pick,told') || typeof b.done !== 'boolean' || !Array.isArray(b.pick) || b.pick.length > 2) return false;
    if (!b.pick.every(i => isCard(2, i) && i !== q.centre) || new Set(b.pick).size !== b.pick.length) return false;
    const allowed = throughPairs(q.centre);
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(k => allowed.includes(k))) return false;
    // A pair that makes a trio is kept the moment it is picked.
    if (b.pick.length === 2 && isTrio(2, q.centre, ...b.pick)) return false;
    if (b.told === 'more') return !b.done && b.found.length < allowed.length;
    if (b.told === 'again') return !b.done && b.pick.length === 0 && b.found.length > 0;
    return b.told === null && (!b.done || b.found.length === allowed.length);
  }
  if (q.mode === 'split') {
    if (!keysOk(b, 'done,found,told,trays') || typeof b.done !== 'boolean' || !Array.isArray(b.trays) || b.trays.length !== 3) return false;
    if (!b.trays.every(t => Array.isArray(t) && t.length <= 3 && t.every(i => isCard(2, i)))) return false;
    const placed = b.trays.flat();
    if (new Set(placed).size !== placed.length) return false;
    // A full set of three trios is kept the moment the ninth tile goes in.
    if (placed.length === 9 && b.trays.every(t => isTrio(2, ...t))) return false;
    const all = splits().map(splitKey);
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(k => all.includes(k))) return false;
    if (b.told === 'more') return !b.done && b.found.length < all.length;
    if (b.told === 'again') return !b.done && placed.length === 0 && b.found.length > 0;
    return b.told === null && (!b.done || b.found.length === all.length);
  }
  if (q.mode === 'cap') {
    if (!keysOk(b, 'chosen,claim,told') || !sortedIds(q.deck, b.chosen) || b.chosen.length > q.target) return false;
    if (q.dim && !isCap(q.deck, b.chosen)) return false;
    return claimOk(q, b, b.chosen.length === q.target);
  }
  if (q.mode === 'paint') {
    if (!keysOk(b, 'claim,paint,told') || !Array.isArray(b.paint) || b.paint.length !== 9) return false;
    if (!b.paint.every(v => (v === null && !q.start) || (int(v) && v >= 0 && v < q.values))) return false;
    return claimOk(q, b, b.paint.every(v => v !== null));
  }
  if (q.mode === 'game') return keysOk(b, 'turns') && Array.isArray(b.turns) && replay(b.turns) !== null;
  if (!keysOk(b, 'chosen,deck') || !PLAY_DECKS.includes(b.deck) || !sortedIds(b.deck, b.chosen)) return false;
  return isCap(b.deck, b.chosen);
}
// A Can't claim: accepted only when the goal is impossible and the trio is a
// certificate in the child's own full attempt; 'way' only when the goal is
// possible; 'not' only for an attempt that is full.
function claimOk(q, b, full) {
  if (b.claim !== null) {
    if (!q.can || possibleOf(q) || !full || !Array.isArray(b.claim) || b.claim.length !== 3 || !sortedIds(2, b.claim) || !certificate(q, b, b.claim)) return false;
    return b.told === null;
  }
  if (b.told === 'way') return Boolean(q.can) && possibleOf(q);
  if (b.told === 'not' || (b.told === 'out' && q.mode === 'cap')) return Boolean(q.can) && full;
  return b.told === null;
}
// The certificate for Can't: a trio among the chosen cards, or a trio of
// tiles all painted alike.
function certificate(q, b, trio) {
  if (!Array.isArray(trio) || trio.length !== 3 || !trio.every(i => isCard(q.mode === 'cap' ? q.deck : 2, i))) return false;
  const [x, y, z] = trio;
  if (q.mode === 'cap') return trio.every(i => b.chosen.includes(i)) && isTrio(q.deck, x, y, z);
  return isTrio(2, x, y, z) && b.paint[x] !== null && b.paint[x] === b.paint[y] && b.paint[y] === b.paint[z];
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  switch (q.mode) {
    case 'complete': return b.round === q.pairs.length;
    case 'through': case 'split': return b.done;
    case 'cap': return b.claim !== null || (b.chosen.length === q.target && isCap(q.deck, b.chosen));
    case 'paint': return b.claim !== null || (b.paint.every(v => v !== null) && !flaggedLines(q.rule, b.paint).length);
    case 'game': return replay(b.turns).over === 'won';
    default: return false;
  }
}

// --- Moves -------------------------------------------------------------------
function moveComplete(q, b, action) {
  if (action.type !== 'pick' || !isCard(q.deck, action.card)) return null;
  const [x, y] = q.pairs[b.round];
  if (action.card === x || action.card === y) return null;
  return action.card === third(q.deck, x, y) ? {round: b.round + 1, miss: null} : {round: b.round, miss: action.card};
}
function moveThrough(q, b, action) {
  const c = q.centre, all = throughPairs(c);
  if (action.type === 'all') {
    if (b.told === 'more') return null;
    return b.found.length === all.length ? {...b, pick: [], told: null, done: true} : {...b, told: 'more'};
  }
  if (action.type !== 'pick' || !isCard(2, action.card) || action.card === c) return null;
  const t = action.card, keep = b.told === 'more' ? 'more' : null;
  if (b.pick.length === 2) return {...b, pick: [t], told: keep};
  if (b.pick.includes(t)) return {...b, pick: b.pick.filter(i => i !== t), told: keep};
  const pick = [...b.pick, t];
  if (pick.length < 2 || !isTrio(2, c, ...pick)) return {...b, pick, told: keep};
  const key = pairKey(...pick);
  return b.found.includes(key) ? {...b, pick: [], told: 'again'} : {...b, pick: [], found: [...b.found, key], told: null};
}
function moveSplit(q, b, action) {
  const all = splits().map(splitKey);
  if (action.type === 'all') {
    if (b.told === 'more') return null;
    return b.found.length === all.length ? {...b, told: null, done: true} : {...b, told: 'more'};
  }
  const t = action.card, keep = b.told === 'more' ? 'more' : null;
  if (!isCard(2, t)) return null;
  const at = b.trays.findIndex(tray => tray.includes(t));
  if (action.type === 'lift') return at < 0 ? null : {...b, trays: b.trays.map(tray => tray.filter(i => i !== t)), told: keep};
  if (action.type !== 'place' || at >= 0) return null;
  const into = b.trays.findIndex(tray => tray.length < 3);
  if (into < 0) return null;
  const trays = b.trays.map((tray, k) => k === into ? [...tray, t] : tray);
  if (trays.flat().length < 9 || !trays.every(tray => isTrio(2, ...tray))) return {...b, trays, told: keep};
  const key = splitKey(trays), empty = [[], [], []];
  return b.found.includes(key) ? {...b, trays: empty, told: 'again'} : {...b, trays: empty, found: [...b.found, key], told: null};
}
function moveClaim(q, b, action, full) {
  if (!q.can || b.told === 'way' || !full) return null;
  const trio = Array.isArray(action.trio) ? sortIds(action.trio) : null;
  if (!trio || trio.length !== 3 || new Set(trio).size !== 3) return null;
  // A wrong certificate is judged and refused every time; the move clears the
  // taps. A real trio that is not all in the try is 'out', not 'not'.
  if (!certificate(q, b, trio)) return {...b, told: q.mode === 'cap' && isTrio(q.deck, ...trio) ? 'out' : 'not'};
  return possibleOf(q) ? {...b, told: 'way'} : {...b, claim: trio, told: null};
}
const keepWay = b => b.told === 'way' ? 'way' : null;
function moveCap(q, b, action) {
  if (action.type === 'cant') return moveClaim(q, b, action, b.chosen.length === q.target);
  if (action.type !== 'pick' || !isCard(q.deck, action.card)) return null;
  const t = action.card;
  if (b.chosen.includes(t)) return {...b, chosen: b.chosen.filter(i => i !== t), told: keepWay(b)};
  if (b.chosen.length >= q.target || (q.dim && blocker(q.deck, b.chosen, t))) return null;
  return {...b, chosen: sortIds([...b.chosen, t]), told: keepWay(b)};
}
function movePaint(q, b, action) {
  if (action.type === 'cant') return moveClaim(q, b, action, b.paint.every(v => v !== null));
  const t = action.tile, v = action.value;
  if (action.type !== 'paint' || !isCard(2, t) || !int(v) || v < 0 || v >= q.values || b.paint[t] === v) return null;
  return {...b, paint: b.paint.map((x, i) => i === t ? v : x), told: keepWay(b)};
}
function moveGame(q, b, action) {
  const state = replay(b.turns);
  // Back takes back the child's last tile and the app's answer to it. It has
  // no button (Undo does the same); the hint applies it from a lost game.
  if (action.type === 'back') return b.turns.length ? {turns: b.turns.slice(0, state.over === 'lost' ? -1 : -2)} : null;
  if (action.type !== 'claim' || state.over || !isCard(2, action.tile) || ((state.you | state.app) >> action.tile & 1)) return null;
  const you = state.you | (1 << action.tile);
  if (ownsTrio(you)) return {turns: [...b.turns, action.tile]};
  return {turns: [...b.turns, action.tile, appClaim(you, state.app)]};
}
function movePlay(b, action) {
  if (action.type === 'deck') return PLAY_DECKS.includes(action.deck) && action.deck !== b.deck ? {deck: action.deck, chosen: []} : null;
  if (action.type === 'clear') return b.chosen.length ? {...b, chosen: []} : null;
  if (action.type !== 'pick' || !isCard(b.deck, action.card)) return null;
  const t = action.card;
  if (b.chosen.includes(t)) return {...b, chosen: b.chosen.filter(i => i !== t)};
  return blocker(b.deck, b.chosen, t) ? null : {...b, chosen: sortIds([...b.chosen, t])};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next;
  switch (q.mode) {
    case 'complete': next = moveComplete(q, b, action); break;
    case 'through': next = moveThrough(q, b, action); break;
    case 'split': next = moveSplit(q, b, action); break;
    case 'cap': next = moveCap(q, b, action); break;
    case 'paint': next = movePaint(q, b, action); break;
    case 'game': next = moveGame(q, b, action); break;
    default: next = movePlay(b, action);
  }
  // 'There is a way.' is said only right after the refused claim; the
  // refusal itself stays in the save.
  if (next) Object.assign(ui(p), {claiming: false, picks: [], why: null, way: action.type === 'cant' && next.told === 'way'});
  return next;
}

// --- Hints -------------------------------------------------------------------
// Every hint is one move toward the nearest finish, memoised per board.
const hintMemo = new Map();
const nameIn = q => i => q.mode === 'paint' ? tileName(i) : cardName(q.deck || 2, i);
function attrWords(d, x, y) {
  const a = digits(d, x), b = digits(d, y), z = digits(d, third(d, x, y));
  const say = [k => SHAPES[k], k => FILLS[k], k => `${COUNT_WORDS[k]}`, k => INKS[k]];
  return a.map((v, k) => v === b[k] ? `${say[k](v)} and ${say[k](v)}: ${say[k](z[k])}` : `${say[k](v)} and ${say[k](b[k])}: ${say[k](z[k])}`);
}
function hintComplete(q, b) {
  const [x, y] = q.pairs[b.round], z = third(q.deck, x, y);
  return {type: 'move', action: {type: 'pick', card: z}, text: `${capital(attrWords(q.deck, x, y).join('; '))}. Tap the ${cardName(q.deck, z)}.`};
}
function hintThrough(q, b) {
  const c = q.centre, all = throughPairs(c).filter(k => !b.found.includes(k));
  if (!all.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  if (b.pick.length === 1) {
    const [x] = b.pick, y = third(2, c, x);
    if (!b.found.includes(pairKey(x, y))) return {type: 'move', action: {type: 'pick', card: y}, text: `Tap the ${tileName(y)}. It makes a trio with the ${tileName(x)} and the ${tileName(c)}.`};
    return {type: 'move', action: {type: 'pick', card: x}, text: `That trio is found. Tap the ${tileName(x)} again to put it back.`};
  }
  const [x] = all[0].split('.').map(Number);
  return {type: 'move', action: {type: 'pick', card: x}, text: `Tap the ${tileName(x)}.`};
}
// Splits: aim at a split not yet found, keeping as many placed tiles as can
// stay. A tray is kept when its tiles lie in one trio of the split, each tray
// in a different trio.
function splitPlan(b) {
  const all = splits().filter(s => !b.found.includes(splitKey(s)));
  let best = null;
  for (const s of all) {
    // Try every matching of trays to the split's trios.
    for (const perm of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) {
      const keep = b.trays.reduce((n, tray, k) => n + tray.filter(i => s[perm[k]].includes(i)).length, 0);
      if (!best || keep > best.keep) best = {s, perm, keep};
    }
  }
  return best;
}
function hintSplit(q, b) {
  const plan = splitPlan(b);
  if (!plan) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const {s, perm} = plan;
  for (let k = 0; k < 3; k++) {
    const wrong = b.trays[k].find(i => !s[perm[k]].includes(i));
    if (wrong !== undefined) return {type: 'move', action: {type: 'lift', card: wrong}, text: `Take the ${tileName(wrong)} out of that tray.`};
  }
  const into = b.trays.findIndex(tray => tray.length < 3), placed = new Set(b.trays.flat());
  const t = s[perm[into]].find(i => !placed.has(i));
  return {type: 'move', action: {type: 'place', card: t}, text: `Put the ${tileName(t)} in the next tray.`};
}
// The nearest goal set: the most cards already chosen, then the first in order.
function nearest(goals, have) {
  let best = null, score = -1;
  for (const g of goals) { const s = g.filter(i => have.has(i)).length; if (s > score) { score = s; best = g; } }
  return best;
}
// The reason, in words; the second hint level marks Can't and the three tiles.
const claimText = (q, trio, how) => `The ${listWords(trio.map(nameIn(q)))} ${how}.`;
function hintCap(q, b) {
  const have = new Set(b.chosen), name = nameIn(q);
  if (!capPossible(q)) {
    if (b.chosen.length < q.target) {
      const blocked = blockedSet(q.deck, b.chosen), free = q.order.filter(i => !have.has(i));
      const open = isCap(q.deck, b.chosen) ? free.find(i => !blocked.has(i)) : undefined, t = open ?? free[0];
      return {type: 'move', action: {type: 'pick', card: t}, text: `Choose the ${name(t)}.`};
    }
    const trio = triosIn(q.deck, b.chosen)[0];
    return {type: 'move', action: {type: 'cant', trio}, text: claimText(q, trio, 'make a trio')};
  }
  const goal = nearest(capsOfSize(q.deck, q.target), have);
  const extra = b.chosen.find(i => !goal.includes(i));
  if (extra !== undefined) return {type: 'move', action: {type: 'pick', card: extra}, text: `Take out the ${name(extra)}.`};
  const t = q.order.find(i => goal.includes(i) && !have.has(i));
  return {type: 'move', action: {type: 'pick', card: t}, text: `Choose the ${name(t)}.`};
}
const PAINT_HOW = ['are all yellow', 'are all blue', 'are all red'];
function hintPaint(q, b) {
  const word = v => q.rule === 'card' ? `${COUNT_WORDS[v]} ${v ? 'shapes' : 'shape'}` : PAINTS[v];
  const say = (t, v) => q.rule === 'card' ? `Give the ${tileName(t)} ${word(v)}.` : `Make the ${tileName(t)} ${word(v)}.`;
  if (!paintPossible(q)) {
    const blank = q.order.find(t => b.paint[t] === null);
    if (blank !== undefined) {
      // Toward a colouring with only two one-colour trios: five tiles of the
      // first colour, four of the second.
      const goal = TWO_TRY;
      return {type: 'move', action: {type: 'paint', tile: blank, value: goal[blank]}, text: say(blank, goal[blank])};
    }
    const trio = flaggedLines(q.rule, b.paint)[0];
    return {type: 'move', action: {type: 'cant', trio}, text: claimText(q, trio, PAINT_HOW[b.paint[trio[0]]])};
  }
  let best = null, off = Infinity;
  for (const g of designs(q.values, q.rule)) { const n = g.reduce((s, v, i) => s + (v !== b.paint[i]), 0); if (n < off) { off = n; best = g; } }
  const t = q.order.find(i => best[i] !== b.paint[i]);
  return {type: 'move', action: {type: 'paint', tile: t, value: best[t]}, text: say(t, best[t])};
}
// A two-colouring with five yellow tiles (the open and striped circles and
// triangles and the solid square) and four blue, holding two yellow trios.
const TWO_TRY = [0, 0, 1, 0, 0, 1, 1, 1, 0];
function hintGame(q, b) {
  const s = replay(b.turns);
  // A lost game, or one the app can always win from: take a turn back. This
  // is a move, not a dead end, so it shows only when the child asks.
  if (s.over === 'lost' || (b.turns.length && !moverWins(s.you, s.app))) return {type: 'move', action: {type: 'back'}, text: s.over === 'lost' ? 'Undo your last tile.' : 'From here the app can always win. Undo your last turn.'};
  const wins = winningClaims(s.you, s.app);
  if (!b.turns.length) { const t = q.order.find(i => wins.includes(i)); return {type: 'move', action: {type: 'claim', tile: t}, text: `Claim the ${tileName(t)}.`}; }
  const c = b.turns[0], x = b.turns.at(-1), o = opposite(c, x);
  if (wins.includes(o)) return {type: 'move', action: {type: 'claim', tile: o}, text: `Claim the ${tileName(o)}: it makes a trio with your first tile and their ${tileName(x)}.`};
  const t = q.order.find(i => wins.includes(i));
  return {type: 'move', action: {type: 'claim', tile: t}, text: `Claim the ${tileName(t)}.`};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'done'};
  if (solved(p, b)) return {type: 'done'};
  const key = `${p.id}:${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const h = {complete: hintComplete, through: hintThrough, split: hintSplit, cap: hintCap, paint: hintPaint, game: hintGame}[q.mode](q, b);
  if (hintMemo.size > 4000) hintMemo.clear();
  hintMemo.set(key, h);
  return h;
}

// --- View state --------------------------------------------------------------
// Can't mode and its picks, and the dimmed card whose blocking pair is lit,
// live outside the save.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, picks: [], why: null, way: false}); return uiState.get(p.id); };

// --- Drawing -----------------------------------------------------------------
// A card face: one to three shapes in ink, open, striped or solid. Stripes
// are drawn as lines clipped by hand, so a face needs no ids.
const INK = ['#294439', '#a9503a', '#3b6d96'];
const r2 = n => Number(n.toFixed(2));
function shapeSvg(shape, fill, cx, cy, s, ink) {
  const w = r2(Math.max(1.1, s * 0.075)), body = fill === 2 ? ink : 'none';
  const lines = [], gap = s / 5.2;
  let outline;
  if (shape === 0) {
    const r = s * 0.46;
    outline = `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}"/>`;
    for (let y = -r + gap; y < r - gap * 0.4; y += gap) { const h = Math.sqrt(r * r - y * y); lines.push([cx - h, cy + y, cx + h, cy + y]); }
  } else if (shape === 1) {
    const base = s * 1.02, h = base * 0.866, top = cy - h / 2 - s * 0.04;
    outline = `<path d="M${r2(cx)} ${r2(top)}L${r2(cx + base / 2)} ${r2(top + h)}H${r2(cx - base / 2)}Z"/>`;
    for (let y = top + gap; y < top + h - gap * 0.4; y += gap) { const half = (y - top) / h * base / 2; lines.push([cx - half, y, cx + half, y]); }
  } else {
    const side = s * 0.82, x0 = cx - side / 2, y0 = cy - side / 2;
    outline = `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(side)}" height="${r2(side)}"/>`;
    for (let y = y0 + gap; y < y0 + side - gap * 0.4; y += gap) lines.push([x0, y, x0 + side, y]);
  }
  const stripes = fill === 1 ? `<path d="${lines.map(([a, b, c, d]) => `M${r2(a)} ${r2(b)}H${r2(c)}`).join('')}" stroke="${ink}" stroke-width="${r2(w * 0.8)}"/>` : '';
  return `<g fill="${body}" stroke="${ink}" stroke-width="${w}" stroke-linejoin="round">${outline}${stripes}</g>`;
}
// big: one large shape on a square tile (the nine tiles without counts).
export function faceSvg(d, id, {big = false, square = false} = {}) {
  const [s, f, n = 0, k = 0] = digits(d, id), ink = INK[k];
  if (big) return `<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">${shapeSvg(s, f, 30, 31, 42, ink)}</svg>`;
  const H = square ? 60 : 80, size = square ? 18.5 : 20, step = square ? 20 : 24.5, count = n + 1;
  const shapes = Array.from({length: count}, (_, j) => shapeSvg(s, f, 30, H / 2 + (j - (count - 1) / 2) * step, size, ink)).join('');
  return `<svg viewBox="0 0 60 ${H}" aria-hidden="true" focusable="false">${shapes}</svg>`;
}
// Layouts: the nine tiles on a ring (no rows or columns to read as trios),
// 27 or 81 cards on a grid of 6 or 9 columns, in each puzzle's shuffled order.
const RING = {W: 300, H: 300, w: 62, h: 62};
export function layout(d, order) {
  if (d === 2) return {...RING, pos: order.map((_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / 9; return [150 + 118 * Math.cos(a), 150 + 118 * Math.sin(a)]; })};
  const cols = d === 3 ? 6 : 9, rows = Math.ceil(order.length / cols), cw = 100, ch = 130;
  return {W: cols * cw, H: rows * ch, w: 90, h: 120, pos: order.map((_, k) => {
    const row = Math.floor(k / cols), inRow = row === rows - 1 ? order.length - row * cols : cols, col = k % cols;
    return [(col + 0.5 + (cols - inRow) / 2) * cw, (row + 0.5) * ch];
  })};
}
const pct = (v, total) => `${r2(v / total * 100)}%`;
// One trio of the ring drawn under its tiles: a triangle joining the three,
// or, for trios through one ringed tile, a path from one tile through it to
// the other. The ring's middle is empty, so the joins show between tiles.
function trioPath(L, at, trio, cls, open) {
  const [a, b, c] = trio.map(i => L.pos[at.get(i)]);
  const path = `M${r2(a[0])} ${r2(a[1])}L${r2(b[0])} ${r2(b[1])}L${r2(c[0])} ${r2(c[1])}${open ? '' : 'Z'}`;
  return `<g class="ts-line ${cls}"><path class="halo" d="${path}"/><path d="${path}"/></g>`;
}
// The board: trio lines (on the ring only), then a card button or a
// placeholder per position. look(id) gives {cls, label, move, ui, pressed,
// hidden, face}; lines are [trio, 'bad' | 'good' | 'why', open?]. Cards in a
// bad trio get a brick border; on the grids the rings and the rule strip
// show the three cards instead of a line.
function boardHtml(d, order, look, lines = [], {big = false, square = false} = {}) {
  const L = layout(d, order), at = new Map(order.map((id, k) => [id, k]));
  const inBad = new Set(lines.filter(([, cls]) => cls === 'bad').flatMap(([t]) => t));
  const cards = order.map((id, k) => {
    const [x, y] = L.pos[k], o0 = look(id), o = inBad.has(id) && !o0.hidden ? {...o0, cls: `${o0.cls || ''} in-bad`.trim()} : o0, style = `left:${pct(x - L.w / 2, L.W)};top:${pct(y - L.h / 2, L.H)};width:${pct(L.w, L.W)};height:${pct(L.h, L.H)}`;
    if (o.hidden) return `<span class="ts-spot" style="${style}" aria-hidden="true"></span>`;
    const face = o.face ?? faceSvg(d, id, {big, square});
    const attrs = `class="ts-card${o.cls ? ` ${o.cls}` : ''}" style="${style}" aria-label="${esc(o.label)}" data-focus="ts-card-${id}"`;
    if (o.move) return `<button type="button" ${attrs} data-action="expansion-move" data-move="${esc(JSON.stringify(o.move))}"${o.pressed !== undefined ? ` aria-pressed="${o.pressed}"` : ''}>${face}</button>`;
    if (o.ui) return `<button type="button" ${attrs} data-action="mechanic-ui" data-ui="${esc(JSON.stringify(o.ui))}"${o.pressed !== undefined ? ` aria-pressed="${o.pressed}"` : ''}>${face}</button>`;
    return `<span role="img" ${attrs.replace(/ data-focus="[^"]*"/, '')}>${face}</span>`;
  }).join('');
  const under = lines.length && d === 2 ? `<svg class="ts-lines" viewBox="0 0 ${L.W} ${L.H}" aria-hidden="true" focusable="false">${lines.map(([trio, cls, open]) => trioPath(L, at, trio, cls, open)).join('')}</svg>` : '';
  return `<div class="ts-board ts-deck-${d}${square ? ' counts' : ''}" style="aspect-ratio:${L.W}/${L.H}">${under}${cards}</div>`;
}
// A small card, for trays, shelves, strips and pictures.
function mini(d, id, {cls = '', big = false, square = false, label = true, paint = null} = {}) {
  return `<span class="ts-mini${cls ? ` ${cls}` : ''}${paint !== null ? ` paint-${paint}` : ''}${d > 2 && !square ? ' tall' : ''}" ${label ? `role="img" aria-label="${esc(d === 2 ? tileName(id) : cardName(d, id))}"` : 'aria-hidden="true"'}>${faceSvg(d, id, {big: d === 2 && !square && big !== false, square})}</span>`;
}
const miniTrio = (d, trio, cls = '', opts = {}) => `<span class="ts-trio${cls ? ` ${cls}` : ''}">${trio.map(i => mini(d, i, opts)).join('')}</span>`;
// The rule, checked attribute by attribute for three cards: each row shows
// the three values and a tick or a cross.
function ruleRows(d, trio) {
  const [a, b, c] = trio.map(i => digits(d, i));
  const rows = a.map((_, k) => {
    const vals = [a[k], b[k], c[k]], good = new Set(vals).size !== 2;
    const glyph = v => k === 0 ? `<svg viewBox="0 0 24 24">${shapeSvg(v, 0, 12, 12.5, 15, INK[0])}</svg>` : k === 1 ? `<svg viewBox="0 0 24 24">${shapeSvg(2, v, 12, 12, 17, INK[0])}</svg>` : k === 2 ? `<b>${v + 1}</b>` : `<i class="ink-${v}"></i>`;
    const what = ['shapes', 'fills', 'counts', 'colours'][k];
    return `<span class="ts-row ${good ? 'ok' : 'no'}" role="img" aria-label="${what} ${good ? (vals[0] === vals[1] ? 'all the same' : 'all different') : 'two the same'}">${vals.map(v => `<span class="ts-val">${glyph(v)}</span>`).join('')}<span class="ts-mark">${good ? '✓' : '✗'}</span></span>`;
  }).join('');
  return `<div class="ts-rows">${rows}</div>`;
}
const strip = (d, trio, opts = {}) => `<div class="ts-strip">${miniTrio(d, trio, '', opts)}${ruleRows(d, trio)}</div>`;
const told = text => text ? `<p class="ts-told" role="status">${esc(text)}</p>` : '';
const actionBtn = (label, action, cls, enabled = true, hinted = false) => `<button type="button" class="secondary ts-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="ts-${cls}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const sameAction = (a, b) => Boolean(a && b) && JSON.stringify(a) === JSON.stringify(b);

function renderComplete(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), d = q.deck;
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const pair = done ? q.pairs.at(-1) : q.pairs[b.round], z = third(d, ...pair);
  const lines = done ? [[[...pair, z], 'good']] : b.miss !== null ? [[[...pair, b.miss], 'bad']] : [];
  const board = boardHtml(d, q.order, id => {
    const given = pair.includes(id) || (done && id === z);
    const cls = [given ? 'given' : '', id === b.miss ? 'missed' : '', sameAction(hinted, {type: 'pick', card: id}) ? 'hinted' : ''].join(' ').trim();
    const label = `${capital(cardName(d, id))}${given ? ', ringed' : ''}`;
    return done || given ? {cls, label} : {cls, label, move: {type: 'pick', card: id}};
  }, lines, {big: d === 2});
  const kept = q.pairs.slice(0, b.round).map(([x, y]) => miniTrio(d, [x, y, third(d, x, y)], 'kept', {big: true})).join('');
  const shelf = kept ? `<div class="ts-shelf" aria-label="Trios made">${kept}</div>` : '';
  const check = b.miss !== null && !done ? strip(d, [...pair, b.miss], {big: true}) : '';
  const status = done ? 'Every trio made.' : `Ringed: ${listWords(pair.map(i => cardName(d, i)))}.${b.miss !== null ? ` The ${cardName(d, b.miss)} does not make a trio with them.` : ''}`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}">${board}${check}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderThrough(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), c = q.centre;
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const found = b.found.map(k => k.split('.').map(Number));
  const failed = b.pick.length === 2 ? b.pick : null;
  const lines = [...found.map(([x, y]) => [[x, c, y], 'good', true]), ...(failed ? [[[failed[0], c, failed[1]], 'bad', true]] : [])];
  const board = boardHtml(2, q.order, id => {
    if (id === c) return {cls: 'given', label: `${capital(tileName(id))}, ringed`};
    const picked = b.pick.includes(id), cls = [picked ? (failed ? 'missed' : 'picked') : '', sameAction(hinted, {type: 'pick', card: id}) ? 'hinted' : ''].join(' ').trim();
    const label = `${capital(tileName(id))}${picked ? ', picked' : ''}`;
    return done ? {cls, label} : {cls, label, move: {type: 'pick', card: id}, pressed: picked};
  }, lines, {big: true});
  const bar = done ? '' : `<div class="ts-bar">${actionBtn('That’s all', {type: 'all'}, 'all', b.told !== 'more', sameAction(hinted, {type: 'all'}))}</div>`;
  const check = failed ? strip(2, [failed[0], c, failed[1]], {big: true}) : '';
  const note = told({more: 'There is another.', again: 'Found already.'}[b.told]);
  const status = `${found.length ? `Trios found: ${found.map(([x, y]) => `${tileName(x)} and ${tileName(y)}`).join('; ')}.` : 'No trio found yet.'}${failed ? ' Those two do not make a trio with the ringed tile.' : ''}`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}">${board}${check}${note}${bar}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderSplit(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action : null, placed = new Set(b.trays.flat());
  const board = boardHtml(2, q.order, id => {
    if (placed.has(id)) return {hidden: true};
    const cls = sameAction(hinted, {type: 'place', card: id}) ? 'hinted' : '';
    return done ? {cls, label: capital(tileName(id))} : {cls, label: `${capital(tileName(id))}. Put it in a tray`, move: {type: 'place', card: id}};
  }, [], {big: true});
  const next = b.trays.findIndex(t => t.length < 3);
  const trays = done ? '' : `<div class="ts-trays">${b.trays.map((tray, k) => {
    const full = tray.length === 3, good = full && isTrio(2, ...tray);
    const slots = [0, 1, 2].map(j => {
      const id = tray[j];
      if (id === undefined) return `<span class="ts-slot${k === next && j === tray.length ? ' next' : ''}" aria-hidden="true"></span>`;
      const hintedCls = sameAction(hinted, {type: 'lift', card: id}) ? ' hinted' : '';
      return `<button type="button" class="ts-slot filled${hintedCls}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'lift', card: id}))}" data-focus="ts-tray-${id}" aria-label="${esc(`${capital(tileName(id))} in tray ${k + 1}. Take it out`)}">${faceSvg(2, id, {big: true})}</button>`;
    }).join('');
    const marks = full ? ruleRows(2, tray) : '';
    return `<div class="ts-tray${full ? (good ? ' ok' : ' no') : ''}" role="group" aria-label="Tray ${k + 1}${full ? (good ? ', a trio' : ', not a trio') : ''}"><div class="ts-slots">${slots}</div>${marks}</div>`;
  }).join('')}</div>`;
  const shelf = b.found.length ? `<div class="ts-shelf splits" aria-label="Splits found">${b.found.map(k => `<span class="ts-split">${k.split('|').map(t => miniTrio(2, t.split('.').map(Number), '', {big: true})).join('')}</span>`).join('')}</div>` : '';
  const bar = done ? '' : `<div class="ts-bar">${actionBtn('That’s all', {type: 'all'}, 'all', b.told !== 'more', sameAction(hinted, {type: 'all'}))}</div>`;
  const note = told({more: 'There is another.', again: 'Found already.'}[b.told]);
  const status = `${b.found.length} ${b.found.length === 1 ? 'split' : 'splits'} kept. ${b.trays.map((t, k) => `Tray ${k + 1}: ${t.length ? listWords(t.map(tileName)) : 'empty'}`).join('. ')}.`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}">${board}${trays}${note}${bar}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// After a right Can't with five tiles: the four other tiles are dishes, each
// holding the pairs of the five it completes. No dish holds more than two,
// so at most eight of the ten pairs fit, and the rest lie inside trios.
function dishesHtml(chosen) {
  const others = Array.from({length: 9}, (_, i) => i).filter(i => !chosen.includes(i)), inside = [];
  const dishes = new Map(others.map(o => [o, []]));
  for (let i = 0; i < chosen.length; i++) for (let j = i + 1; j < chosen.length; j++) {
    const t = third(2, chosen[i], chosen[j]);
    (dishes.get(t) || inside).push([chosen[i], chosen[j]]);
  }
  const pairHtml = pr => `<span class="ts-pair">${pr.map(i => mini(2, i, {big: true})).join('')}</span>`;
  const dish = o => `<div class="ts-dish" role="group" aria-label="${esc(`The ${tileName(o)} completes ${dishes.get(o).length} ${dishes.get(o).length === 1 ? 'pair' : 'pairs'}`)}">${mini(2, o, {cls: 'dish-tile', big: true})}${[0, 1].map(k => dishes.get(o)[k] ? pairHtml(dishes.get(o)[k]) : '<span class="ts-pair empty" aria-hidden="true"></span>').join('')}</div>`;
  return `<div class="ts-dishes">${others.map(dish).join('')}<div class="ts-dish inside" role="group" aria-label="${inside.length} pairs complete inside the five">${inside.map(pairHtml).join('')}</div></div>`;
}
// After a right Can't with two colours: each colour's tiles in a row, with
// room for four marked. One colour has five or more.
function classesHtml(paint, trio) {
  return `<div class="ts-classes">${[0, 1].map(v => {
    const tiles = paint.map((x, i) => x === v ? i : -1).filter(i => i >= 0);
    return `<div class="ts-class" role="group" aria-label="${tiles.length} ${PAINTS[v]} tiles"><span class="ts-room">${tiles.slice(0, 4).map(i => mini(2, i, {big: true, paint: v, cls: trio.includes(i) ? 'in-trio' : ''})).join('')}</span>${tiles.slice(4).map(i => mini(2, i, {big: true, paint: v, cls: `over${trio.includes(i) ? ' in-trio' : ''}`})).join('')}</div>`;
  }).join('')}</div>`;
}
function claimBar(p, b, full, done, hinted) {
  const q = p.parameters, state = ui(p);
  if (!q.can || done) return '';
  const on = state.claiming && full;
  const enabled = full && b.told !== 'way';
  return `<div class="ts-bar"><button type="button" class="secondary ts-button ts-cant${hinted?.type === 'cant' && !on ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !on})}' data-focus="ts-cant" data-toggle="ts-cant" aria-pressed="${on}" ${enabled ? '' : 'disabled'}>Can’t</button></div>`;
}
// A card's part in a Can't claim: every card can be tapped and nothing is
// tinted but the child's own picks, so a claim can fail. The first two taps
// are view state; the third sends the claim, judged at once.
function claimLook(p, id, label) {
  const state = ui(p), picked = state.picks.includes(id);
  const act = state.picks.length === 2 && !picked ? {move: {type: 'cant', trio: [...state.picks, id]}} : {ui: {pick: id}};
  return {...act, pressed: picked, label: `${label}. ${picked ? 'Picked for Can’t' : 'Pick for Can’t'}`, claimCls: picked ? 'claim-picked' : ''};
}
function renderCap(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), d = q.deck, state = ui(p);
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action : null, chosen = new Set(b.chosen), full = b.chosen.length === q.target;
  const claiming = state.claiming && full && !done;
  const blocked = q.dim ? blockedSet(d, b.chosen) : new Set();
  const why = q.dim && state.why !== null && blocked.has(state.why) ? state.why : null, whyPair = why !== null ? blocker(d, b.chosen, why) : null;
  // Where Can't is offered, a trio in the try is the child's to find: it is
  // reported when the try is full but not drawn until a claim is right.
  const bad = q.dim ? [] : triosIn(d, b.chosen), hidden = Boolean(q.can) && !b.claim;
  const lines = [...(b.claim ? [[b.claim, 'bad']] : hidden ? [] : bad.map(t => [t, 'bad'])), ...(whyPair ? [[[...whyPair, why], 'why']] : [])];
  const board = boardHtml(d, q.order, id => {
    const on = chosen.has(id), dim = blocked.has(id), name = capital(cardName(d, id));
    const hintCls = sameAction(hinted, {type: 'pick', card: id}) || (hinted?.type === 'cant' && hinted.trio.includes(id)) ? 'hinted' : '';
    const pairCls = whyPair?.includes(id) ? 'pair-lit' : id === why ? 'why' : '';
    const base = [on ? 'chosen' : '', dim ? 'dim' : '', hintCls, pairCls].filter(Boolean);
    const label = `${name}${on ? ', chosen' : ''}${dim ? ', ruled out by two chosen cards' : ''}`;
    if (done) return {cls: [...base, b.claim?.includes(id) ? 'claim-picked' : ''].join(' '), label};
    if (claiming) {
      const c = claimLook(p, id, label);
      return {cls: [...base, c.claimCls].join(' '), label: c.label, move: c.move, ui: c.ui, pressed: c.pressed};
    }
    if (dim) return {cls: base.join(' '), label: `${label}. Show why`, ui: {why: id}};
    if (!on && full) return {cls: [...base, 'full'].join(' '), label};
    return {cls: base.join(' '), label, move: {type: 'pick', card: id}, pressed: on};
  }, lines, {big: d === 2});
  const slots = `<span class="ts-count" role="img" aria-label="${b.chosen.length} of ${q.target} chosen">${Array.from({length: q.target}, (_, k) => `<i class="${k < b.chosen.length ? 'on' : ''}"></i>`).join('')}</span>`;
  const check = whyPair ? strip(d, [...whyPair, why], {big: d === 2}) : '';
  const picture = done && b.claim && d === 2 ? dishesHtml(b.chosen) : '';
  const unfound = hidden && full && bad.length && !done;
  const said = b.told === 'way' ? (state.way ? 'There is a way.' : '') : {not: 'Not a trio.', out: `Not a trio in your ${['four', 'five'][q.target - 4] || 'try'}.`}[b.told];
  const note = told(said || (claiming ? 'Tap the trio.' : unfound ? 'There is a trio.' : ''));
  const status = `${b.chosen.length} chosen${b.chosen.length ? `: ${listWords(b.chosen.map(i => cardName(d, i)))}` : ''}.${bad.length && !q.dim && !hidden ? ` A trio: ${listWords(bad[0].map(i => cardName(d, i)))}.` : ''}${q.dim && b.chosen.length < q.target && blocked.size + b.chosen.length === deckSize(d) ? ' Every other card is ruled out.' : ''}`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}${claiming ? ' claiming' : ''}"><div class="ts-top">${slots}</div>${board}${check}${note}${claimBar(p, b, full, done, hinted)}${picture}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPaint(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action : null, full = b.paint.every(v => v !== null);
  const claiming = state.claiming && full && !done, counts = q.rule === 'card';
  // As with sets: where Can't is offered, one-colour trios are reported, not drawn.
  const flagged = flaggedLines(q.rule, b.paint), hidden = Boolean(q.can) && !b.claim;
  const flags = b.claim ? [b.claim] : hidden ? [] : flagged;
  const board = boardHtml(2, q.order, id => {
    const v = b.paint[id], next = v === null ? 0 : (v + 1) % q.values;
    const hintCls = (hinted?.type === 'paint' && hinted.tile === id) || (hinted?.type === 'cant' && hinted.trio.includes(id)) ? 'hinted' : '';
    const base = [!counts && v !== null ? `paint-${v}` : '', hintCls].filter(Boolean);
    const label = counts ? capital(cardName(3, id + 9 * v)) : `${capital(tileName(id))}${v === null ? '' : `, ${PAINTS[v]}`}`;
    const face = counts ? faceSvg(3, id + 9 * v, {square: true}) : undefined;
    if (done) return {cls: [...base, b.claim?.includes(id) ? 'claim-picked' : ''].join(' '), label, face};
    if (claiming) { const c = claimLook(p, id, label); return {cls: [...base, c.claimCls].join(' '), label: c.label, move: c.move, ui: c.ui, pressed: c.pressed, face}; }
    const say = counts ? `${COUNT_WORDS[next]} ${next ? 'shapes' : 'shape'}` : PAINTS[next];
    return {cls: base.join(' '), label: `${label}. Make it ${say}`, move: {type: 'paint', tile: id, value: next}, face};
  }, flags.map(t => [t, 'bad']), {big: !counts});
  const picture = done && b.claim ? classesHtml(b.paint, b.claim) : '';
  const said = b.told === 'way' ? (state.way ? 'There is a way.' : '') : {not: counts ? 'Not a trio.' : 'Not a trio all one colour.'}[b.told];
  const note = told(said || (claiming ? 'Tap the trio.' : hidden && full && flagged.length && !done ? 'A trio is all one colour.' : ''));
  const say = i => counts ? cardName(3, i + 9 * b.paint[i]) : `${tileName(i)} ${b.paint[i] === null ? 'blank' : PAINTS[b.paint[i]]}`;
  const status = `${q.order.map(say).join(', ')}.${flags.length && !b.claim ? ` ${flags.length} ${flags.length === 1 ? 'trio is' : 'trios are'} marked.` : ''}`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}${claiming ? ' claiming' : ''}">${board}${note}${claimBar(p, b, full, done, hinted)}${picture}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderGame(p, a) {
  const q = p.parameters, b = a.board, s = replay(b.turns), done = s.over === 'won';
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b).action ?? null : null;
  const mine = i => s.you >> i & 1, theirs = i => s.app >> i & 1;
  const lines = s.over === 'lost' ? [[ownTrio(s.you), 'bad']] : s.over === 'won' ? [[ownTrio(s.app), 'bad']] : [];
  const board = boardHtml(2, q.order, id => {
    const cls = [mine(id) ? 'yours' : theirs(id) ? 'theirs' : '', sameAction(hinted, {type: 'claim', tile: id}) ? 'hinted' : '', b.turns.at(-1) === id && theirs(id) ? 'last' : ''].filter(Boolean).join(' ');
    const label = `${capital(tileName(id))}${mine(id) ? ', yours' : theirs(id) ? ', theirs' : ''}`;
    return s.over || mine(id) || theirs(id) ? {cls, label} : {cls, label: `${label}. Claim it`, move: {type: 'claim', tile: id}};
  }, lines, {big: true});
  const note = told(s.over === 'lost' ? 'You own a trio.' : '');
  const status = `${b.turns.length ? `You: ${listWords(b.turns.filter((_, k) => k % 2 === 0).map(tileName))}. Them: ${b.turns.filter((_, k) => k % 2).map(tileName).join(', ') || 'nothing yet'}.` : 'Your turn.'}${s.over === 'won' ? ' They own a trio.' : ''}`;
  return `<div class="ts-puzzle${done ? ' solved' : ''}">${board}${note}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPlay(p, a) {
  const q = p.parameters, b = a.board, d = b.deck, state = ui(p), order = q.orders[d];
  const blocked = blockedSet(d, b.chosen), chosen = new Set(b.chosen);
  const why = state.why !== null && blocked.has(state.why) ? state.why : null, whyPair = why !== null ? blocker(d, b.chosen, why) : null;
  const board = boardHtml(d, order, id => {
    const on = chosen.has(id), dim = blocked.has(id), name = capital(cardName(d, id));
    const cls = [on ? 'chosen' : '', dim ? 'dim' : '', whyPair?.includes(id) ? 'pair-lit' : id === why ? 'why' : ''].filter(Boolean).join(' ');
    if (dim) return {cls, label: `${name}, ruled out by two chosen cards. Show why`, ui: {why: id}};
    return {cls, label: `${name}${on ? ', chosen' : ''}`, move: {type: 'pick', card: id}, pressed: on};
  }, whyPair ? [[[...whyPair, why], 'why']] : [], {big: d === 2});
  const decks = `<div class="ts-decks" role="group" aria-label="Cards">${PLAY_DECKS.map(k => `<button type="button" class="secondary ts-button ts-deck" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'deck', deck: k}))}" data-focus="ts-deck-${k}" aria-pressed="${k === d}">${deckSize(k)}</button>`).join('')}${actionBtn('Clear', {type: 'clear'}, 'clear', b.chosen.length > 0)}</div>`;
  const count = `<p class="ts-tally" aria-label="${b.chosen.length} chosen">${b.chosen.length}</p>`;
  const check = whyPair ? strip(d, [...whyPair, why], {big: d === 2}) : '';
  const stuck = b.chosen.length && blocked.size + b.chosen.length === deckSize(d);
  return `<div class="ts-puzzle ts-play${stuck ? ' stuck' : ''}">${decks}${count}${board}${check}<p class="sr-only" role="status">${esc(`${b.chosen.length} chosen.${stuck ? ' Every other card is ruled out.' : ''}`)}</p></div>`;
}
function render(p, a) {
  return {complete: renderComplete, through: renderThrough, split: renderSplit, cap: renderCap, paint: renderPaint, game: renderGame, playground: renderPlay}[p.parameters.mode](p, a);
}

export const triosMechanics = {
  trios: {
    fresh, valid, solved, move, hint, render,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: [], why: null});
      if (int(payload.pick)) state.picks = state.picks.includes(payload.pick) ? state.picks.filter(i => i !== payload.pick) : [...state.picks, payload.pick].slice(-2);
      if (int(payload.why)) state.why = state.why === payload.why ? null : payload.why;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo clears Can't mode, its picks and any shown pair, and keeps what was
    // found and a refused Can't; Restart keeps the refusal too.
    carry(p, from, to) {
      const q = p.parameters;
      Object.assign(ui(p), {claiming: false, picks: [], why: null, way: false});
      if (!object(from) || !object(to)) return to;
      if ((q.mode === 'through' || q.mode === 'split') && Array.isArray(from.found)) return {...to, found: [...from.found], told: from.told === 'more' ? 'more' : null, done: false};
      if ((q.mode === 'cap' || q.mode === 'paint') && from.told === 'way') return {...to, claim: null, told: 'way'};
      return to;
    },
    carryOnRestart(p, from, to) {
      const q = p.parameters;
      return (q.mode === 'cap' || q.mode === 'paint') && object(from) && object(to) && from.told === 'way' ? {...to, told: 'way'} : to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'trios',
  family: {id: 'trios', symbol: '∴', area: 'patterns'},
  mechanics: triosMechanics,
  pack: new URL('./trios.json', import.meta.url).href,
  css: new URL('./trios.css', import.meta.url).href,
  focus: '.ts-card:is(button),.ts-slot:is(button),.ts-deck'
};
