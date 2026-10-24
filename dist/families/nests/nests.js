// Nesting cards (worksheet Week 19, no card inside another). Each card carries
// some of a few pictures (circle, triangle, square, star and, in the
// five-picture deck, a diamond), each always in its own place. A card fits
// inside another when all its pictures are on the other: the cards are the
// subsets of a small set, ordered by inclusion, and a collection with no card
// inside another is an antichain.
//
// A row in which each card fits inside the next is a chain, and a collection
// takes at most one card from it. So rows holding every card bound every
// collection by their number, and a collection with one card in each row
// proves both are best (the easy half of Dilworth's theorem; on a full deck
// the best is a middle layer, Sperner's theorem). When some cards are kept in
// the collection, a row whose cards all nest with a kept card gives nothing.
//
// The app enforces the rule: a tap on a card that nests with a chosen card
// does not choose it; the card is marked and linked to the chosen cards it
// nests with. Puzzles: choose a number of cards; keep a start and add as many
// as fit, showing that every other card nests with a chosen one; choose the
// most and drag every card into rows with one chosen card in each; find every
// collection of one size, then That's all.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const LETTERS = 'ABCDE';
export const PICTURES = ['circle', 'triangle', 'square', 'star', 'diamond'];
export const MODES = ['reach', 'extend', 'best', 'every', 'playground'];
const ROWS_MODES = ['best', 'playground'];
export const maskOf = s => [...s].reduce((m, c) => m | (1 << LETTERS.indexOf(c)), 0);
export const lettersOf = m => [...LETTERS].filter((_, k) => m & (1 << k)).join('');
export const sizeOf = m => { let n = 0; for (; m; m &= m - 1) n++; return n; };
export const inside = (a, b) => (a & ~b) === 0;
// Two different cards nest when one fits inside the other.
export const nests = (a, b) => a !== b && (inside(a, b) || inside(b, a));
const sorted = list => [...list].sort((x, y) => x - y);
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

// Words for a card: "the empty card", "the circle card", "the circle and
// square card", "the circle, triangle and square card".
export function cardWords(m) {
  const names = PICTURES.filter((_, k) => m & (1 << k));
  if (!names.length) return 'the empty card';
  const list = names.length < 3 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  return `the ${list} card`;
}

// --- Decks --------------------------------------------------------------------
// A deck is {cards: ['AC', '', …], cols, target?, start?: ['A', …], pictures?}:
// the cards as letters ('' is the empty card) in the scrambled order they are
// laid out, the tray's columns, a size to reach or find, the cards kept chosen,
// and how many picture places each card shows (by default, as many as used).
const infos = new WeakMap();
export function deckInfo(deck) {
  if (infos.has(deck)) return infos.get(deck);
  const masks = deck.cards.map(maskOf), k = masks.length;
  const n = Number.isInteger(deck.pictures) ? deck.pictures : Math.max(1, masks.reduce((a, m) => a | m, 0).toString(2).length);
  const start = sorted((deck.start || []).map(s => deck.cards.indexOf(s)));
  const comp = masks.map(a => masks.map(b => nests(a, b)));
  // A card that nests with a kept card can never join this collection.
  const blocked = masks.map((_, i) => !start.includes(i) && start.some(s => comp[i][s]));
  const info = {deck, masks, k, n, start, comp, blocked, cols: deck.cols || 4, target: Number.isInteger(deck.target) ? deck.target : null, slots: n + 1};
  infos.set(deck, info);
  return info;
}
const deckValid = deck => object(deck) && Array.isArray(deck.cards) && deck.cards.every(s => typeof s === 'string' && /^[A-E]*$/.test(s)) && new Set(deck.cards.map(maskOf)).size === deck.cards.length;
export const isAntichain = (info, set) => set.every((i, t) => set.every((j, u) => u <= t || !info.comp[i][j]));

// Every collection that keeps the start, as sorted lists of card numbers, by
// a search that adds each free card or leaves it out. A deck has at most 32
// cards (five pictures), so the cards a choice rules out fit in one 32-bit mask.
export function antichainsOf(info) {
  if (info.all) return info.all;
  const out = [], pick = [...info.start];
  const free = [...Array(info.k).keys()].filter(i => !info.start.includes(i) && !info.blocked[i]);
  const ruled = info.comp.map(row => row.reduce((m, c, j) => (c ? m | (1 << j) : m), 0));
  (function go(t, banned) {
    if (t === free.length) { out.push(sorted(pick)); return; }
    const i = free[t];
    go(t + 1, banned);
    if (!(banned & (1 << i))) { pick.push(i); go(t + 1, banned | ruled[i]); pick.pop(); }
  })(0, info.start.reduce((m, j) => m | ruled[j], 0));
  info.all = out;
  return out;
}
export const bestOf = info => (info.best ??= Math.max(...antichainsOf(info).map(s => s.length)));
export const largest = info => (info.largestSets ??= antichainsOf(info).filter(s => s.length === bestOf(info)));
export const ofSize = (info, t) => { info.sized ||= new Map(); if (!info.sized.has(t)) info.sized.set(t, antichainsOf(info).filter(s => s.length === t)); return info.sized.get(t); };
// The set among `sets` that shares the most cards with `chosen`.
const overlap = (set, chosen) => set.filter(i => chosen.includes(i)).length;
const closest = (sets, chosen) => sets.reduce((best, s) => (overlap(s, chosen) > overlap(best, chosen) ? s : best), sets[0]);

// --- Rows ---------------------------------------------------------------------
// A row is a list of card numbers kept smallest first; it nests when each card
// fits inside the next. A row whose cards all nest with a kept card can give a
// collection with that card nothing.
const rowOrder = (info, row) => [...row].sort((a, b) => sizeOf(info.masks[a]) - sizeOf(info.masks[b]) || a - b);
const strictly = (a, b) => a !== b && inside(a, b);
export const isChain = (info, row) => row.every((c, t) => t === 0 || strictly(info.masks[row[t - 1]], info.masks[c]));
export function rowStates(info, chosen, rows) {
  return rows.map(row => {
    const chain = isChain(info, row), picked = row.filter(c => chosen.includes(c)).length;
    const blocked = picked === 0 && info.start.length > 0 && row.every(c => info.blocked[c]);
    return {chain, picked, blocked, ok: chain && (picked === 1 || blocked)};
  });
}
// Every card in a row, every row nested, and each row holding exactly one
// chosen card or only cards that nest with a kept card.
export const certified = (info, chosen, rows) => rows.flat().length === info.k && rowStates(info, chosen, rows).every(r => r.ok);
function place(info, rows, i, r) {
  const from = rows.findIndex(row => row.includes(i));
  if (!Number.isInteger(r) || r < 0 || r > rows.length || from === r) return null;
  if (r === rows.length && from >= 0 && rows[from].length === 1) return null;
  const next = [];
  rows.forEach((row, t) => { let nr = row.filter(c => c !== i); if (t === r) nr = rowOrder(info, [...nr, i]); if (nr.length) next.push(nr); });
  if (r === rows.length) next.push([i]);
  return next;
}
function unplace(rows, i) {
  if (!rows.some(row => row.includes(i))) return null;
  return rows.map(row => row.filter(c => c !== i)).filter(row => row.length);
}

// --- Boards -------------------------------------------------------------------
// Each deck's state is {chosen, out}: the chosen cards (the kept ones among
// them) and the cards tried and refused, each of which nests with a chosen
// card. reach: {decks}; extend: {decks, stuck}; best: {decks, rows}; every:
// {decks, found, told, done}; playground: {pick, decks, rows}. `stuck` lists
// the decks told "Another way fits more cards." (kept, through Undo too, until
// that deck's chosen cards change), `found` the collections found, `told` the
// answer to That's all ({kind: 'more'}) or a collection found again
// ({kind: 'again', at}).
const isPlay = p => p.parameters.mode === 'playground';
const decksOf = (p, b) => (isPlay(p) ? [p.parameters.choices[b.pick]] : p.parameters.decks);
export const infoOf = (p, b, d = 0) => deckInfo(decksOf(p, b)[d]);
const freshDeck = info => ({chosen: [...info.start], out: []});
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {pick: q.first ?? 0, decks: [freshDeck(deckInfo(q.choices[q.first ?? 0]))], rows: []};
  const decks = q.decks.map(d => freshDeck(deckInfo(d)));
  if (q.mode === 'best') return {decks, rows: []};
  if (q.mode === 'every') return {decks, found: [], told: null, done: false};
  if (q.mode === 'extend') return {decks, stuck: []};
  return {decks};
}
const indexList = (list, k) => Array.isArray(list) && list.every((i, t) => Number.isInteger(i) && i >= 0 && i < k && (t === 0 || i > list[t - 1]));
function validDeck(info, s) {
  if (!object(s) || Object.keys(s).sort().join() !== 'chosen,out' || !indexList(s.chosen, info.k) || !indexList(s.out, info.k)) return false;
  if (!info.start.every(i => s.chosen.includes(i)) || !isAntichain(info, s.chosen)) return false;
  return s.out.every(i => !s.chosen.includes(i) && s.chosen.some(j => info.comp[i][j]));
}
function validRows(info, rows) {
  if (!Array.isArray(rows) || !rows.every(row => Array.isArray(row) && row.length && row.every(i => Number.isInteger(i) && i >= 0 && i < info.k))) return false;
  const all = rows.flat();
  return new Set(all).size === all.length && rows.every(row => JSON.stringify(row) === JSON.stringify(rowOrder(info, row)));
}
function validFound(info, b) {
  const t = info.target, answers = ofSize(info, t);
  if (!Array.isArray(b.found) || typeof b.done !== 'boolean') return false;
  const keys = b.found.map(s => JSON.stringify(s));
  if (new Set(keys).size !== keys.length || !b.found.every(s => indexList(s, info.k) && answers.some(a => JSON.stringify(a) === JSON.stringify(s)))) return false;
  // A collection of the size is kept the moment it is made, so none rests chosen.
  if (b.decks[0].chosen.length >= t) return false;
  const told = b.told;
  if (told !== null) {
    if (!object(told)) return false;
    if (told.kind === 'more') { if (Object.keys(told).length !== 1 || b.found.length >= answers.length || b.done) return false; }
    else if (told.kind === 'again') { if (Object.keys(told).sort().join() !== 'at,kind' || !Number.isInteger(told.at) || told.at < 0 || told.at >= b.found.length || b.decks[0].chosen.length) return false; }
    else return false;
  }
  return !b.done || (b.found.length === answers.length && told === null);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const keys = Object.keys(b).sort().join();
  if (q.mode === 'playground') {
    if (keys !== 'decks,pick,rows' || !Number.isInteger(b.pick) || b.pick < 0 || b.pick >= q.choices.length) return false;
  } else if (keys !== {reach: 'decks', extend: 'decks,stuck', best: 'decks,rows', every: 'decks,done,found,told'}[q.mode]) return false;
  const decks = decksOf(p, b);
  if (!Array.isArray(b.decks) || b.decks.length !== decks.length || !decks.every(deckValid)) return false;
  if (!b.decks.every((s, d) => validDeck(deckInfo(decks[d]), s))) return false;
  if (ROWS_MODES.includes(q.mode)) return validRows(deckInfo(decks[0]), b.rows);
  // A deck told "Another way fits more cards." holds a full collection that is not largest.
  if (q.mode === 'extend') return indexList(b.stuck, decks.length) && b.stuck.every(d => { const info = deckInfo(decks[d]), s = b.decks[d]; return full(info, s.chosen) && s.chosen.length < bestOf(info); });
  if (q.mode === 'every') return validFound(deckInfo(decks[0]), b);
  return true;
}
// A deck in an extend puzzle is done when every other card has been shown to
// nest with a chosen card and no collection keeping the start is bigger.
const tried = (info, s) => s.chosen.length + s.out.length === info.k;
// No card can join: every other card nests with a chosen one.
const full = (info, chosen) => info.masks.every((_, i) => chosen.includes(i) || chosen.some(j => info.comp[i][j]));
export const deckDone = (info, s) => tried(info, s) && s.chosen.length === bestOf(info);
export const stuck = (info, s) => tried(info, s) && s.chosen.length < bestOf(info);
const deckReached = (info, s) => s.chosen.length === info.target;
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'every') return b.done;
  if (q.mode === 'best') return certified(infoOf(p, b), b.decks[0].chosen, b.rows);
  return b.decks.every((s, d) => (q.mode === 'reach' ? deckReached : deckDone)(infoOf(p, b, d), s));
}

// --- Moves --------------------------------------------------------------------
// {type: 'tap', deck, card}  choose a card, put a chosen one back, or try one
//                            that nests with a chosen card (it is marked)
// {type: 'place', card, row} put a card in a row (rows.length: a new row)
// {type: 'unplace', card}    take a card out of its row
// {type: 'all'}              That's all, in a find-every puzzle
// {type: 'deck', pick}       the playground's deck
function settle(info, chosen, out) { return {chosen: sorted(chosen), out: sorted(out.filter(i => !chosen.includes(i) && chosen.some(j => info.comp[i][j])))}; }
export function tap(info, s, i) {
  if (!Number.isInteger(i) || i < 0 || i >= info.k) return null;
  if (info.start.includes(i) || s.out.includes(i)) return s;
  if (s.chosen.includes(i)) return settle(info, s.chosen.filter(j => j !== i), s.out);
  if (s.chosen.some(j => info.comp[i][j])) return {chosen: s.chosen, out: sorted([...s.out, i])};
  return {chosen: sorted([...s.chosen, i]), out: s.out};
}
// The chosen cards a card nests with.
export const blockers = (info, s, i) => s.chosen.filter(j => info.comp[i][j]);
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const v = ui(p);
  if (action.type === 'tap') {
    const d = action.deck ?? 0;
    if (!Number.isInteger(d) || d < 0 || d >= b.decks.length) return null;
    const info = infoOf(p, b, d), s = b.decks[d], next = tap(info, s, action.card);
    if (!next) return null;
    v.show = next.out.includes(action.card) ? [d, action.card] : null;
    const decks = b.decks.map((x, t) => (t === d ? next : x));
    if (q.mode === 'extend') {
      // The answer to a full deck stays until its chosen cards change.
      const same = JSON.stringify(next.chosen) === JSON.stringify(s.chosen);
      const kept = b.stuck.filter(x => x !== d || same);
      return {...b, decks, stuck: stuck(info, next) && !kept.includes(d) ? sorted([...kept, d]) : kept};
    }
    if (q.mode !== 'every') return {...b, decks};
    if (next.chosen.length < info.target) return {...b, decks, told: b.told?.kind === 'more' ? b.told : null};
    // A collection of the size is kept at once, and the cards go back.
    const at = b.found.findIndex(f => JSON.stringify(f) === JSON.stringify(next.chosen)), empty = [freshDeck(info)];
    v.show = null;
    return at >= 0 ? {...b, decks: empty, told: {kind: 'again', at}} : {...b, decks: empty, found: [...b.found, next.chosen], told: null};
  }
  if (action.type === 'place' || action.type === 'unplace') {
    if (!ROWS_MODES.includes(q.mode)) return null;
    const info = infoOf(p, b), i = action.card;
    if (!Number.isInteger(i) || i < 0 || i >= info.k) return null;
    const rows = action.type === 'place' ? place(info, b.rows, i, action.row) : unplace(b.rows, i);
    if (!rows) return null;
    v.show = null;
    return {...b, rows};
  }
  if (action.type === 'all' && q.mode === 'every' && b.told?.kind !== 'more') {
    v.show = null;
    return b.found.length === ofSize(infoOf(p, b), infoOf(p, b).target).length ? {...b, told: null, done: true} : {...b, told: {kind: 'more'}};
  }
  if (action.type === 'deck' && q.mode === 'playground') {
    const k = action.pick;
    if (!Number.isInteger(k) || k < 0 || k >= q.choices.length || k === b.pick) return null;
    v.show = null;
    return {pick: k, decks: [freshDeck(deckInfo(q.choices[k]))], rows: []};
  }
  return null;
}

// --- Hints --------------------------------------------------------------------
// Hints aim at a collection that shares the most with the chosen cards: put
// back a chosen card that is not in it, then choose one that is. In extend
// puzzles they then try each card left; in best puzzles they then build rows.
const deckWords = (p, d) => (p.parameters.decks.length > 1 ? `In the ${ORDINAL[d]} deck, ` : '');
const cap = s => s[0].toUpperCase() + s.slice(1);
function collectionHint(p, d, info, s, sets) {
  const T = closest(sets, s.chosen), say = deckWords(p, d);
  const extra = s.chosen.find(i => !T.includes(i));
  if (extra !== undefined) return {type: 'move', action: {type: 'tap', deck: d, card: extra}, text: cap(`${say}put back ${cardWords(info.masks[extra])}.`), card: [d, extra]};
  const need = T.find(i => !s.chosen.includes(i));
  if (need !== undefined) return {type: 'move', action: {type: 'tap', deck: d, card: need}, text: cap(`${say}choose ${cardWords(info.masks[need])}.`), card: [d, need]};
  return null;
}

// Rows: the hint keeps the child's rows where it can. The cards free of every
// kept card need the fewest rows, found as a largest matching of "this card
// fits inside that one" (each card then has at most one next card); weights
// keep cards in the rows they share and keep different rows apart. Kept cards
// and the cards that nest with them go in rows with no free card.
const BIG = 10000;
function assign(w) {
  // Hungarian method: a largest-weight assignment of rows to columns.
  const n = w.length, top = Math.max(0, ...w.flat()), INF = Infinity;
  const cost = w.map(r => r.map(x => top - x));
  const u = Array(n + 1).fill(0), v = Array(n + 1).fill(0), p = Array(n + 1).fill(0), way = Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = Array(n + 1).fill(INF), used = Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) { if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta; }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const out = Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j]) out[p[j] - 1] = j - 1;
  return out;
}
// The paths of a fewest-row cover of the free cards, each smallest first.
export function coverPaths(info, free, rows) {
  const rowOf = new Map();
  rows.forEach((row, r) => row.forEach(c => rowOf.set(c, r)));
  const isFree = new Set(free), next = new Map(), prev = new Map();
  for (const row of rows) { const fs = row.filter(c => isFree.has(c)); fs.forEach((c, t) => { if (t + 1 < fs.length) { next.set(c, fs[t + 1]); prev.set(fs[t + 1], c); } }); }
  const M = info.masks;
  const weight = (x, y) => {
    if (!strictly(M[x], M[y])) return 0;
    const rx = rowOf.get(x), ry = rowOf.get(y);
    if (rx !== undefined && ry !== undefined) return BIG + (rx !== ry ? -100 : next.get(x) === y ? 10 : 0);
    if (rx !== undefined) { const z = next.get(x); return BIG + (z === undefined || strictly(M[y], M[z]) ? 5 : 0); }
    if (ry !== undefined) { const z = prev.get(y); return BIG + (z === undefined || strictly(M[z], M[x]) ? 5 : 0); }
    return BIG;
  };
  const w = free.map(x => free.map(y => weight(x, y)));
  const match = assign(w), succ = new Map(), hasPrev = new Set();
  match.forEach((j, i) => { if (j >= 0 && w[i][j] > 0) { succ.set(free[i], free[j]); hasPrev.add(free[j]); } });
  const paths = [];
  for (const c of free) if (!hasPrev.has(c)) { const path = [c]; while (succ.has(path.at(-1))) path.push(succ.get(path.at(-1))); paths.push(path); }
  return paths;
}
function rowsHintNear(info, s, rows) {
  const M = info.masks, {comp} = info, words = i => cardWords(M[i]);
  const out = (i, why) => ({type: 'move', action: {type: 'unplace', card: i}, text: cap(`take ${words(i)} out of its row.`), card: [0, i], why});
  const put = (i, r) => ({type: 'move', action: {type: 'place', card: i, row: r}, text: r < rows.length ? cap(`put ${words(i)} in the row with ${words(rows[r][0])}.`) : cap(`put ${words(i)} in a new row.`), card: [0, i], row: r});
  // A row that breaks: take out the card that nests with the fewest others in it.
  for (const row of rows) if (!isChain(info, row)) {
    let worst = row[0], most = -1;
    for (const c of row) { const bad = row.filter(x => x !== c && !comp[c][x]).length; if (bad >= most) { most = bad; worst = c; } }
    return out(worst, 'break');
  }
  const free = [...Array(info.k).keys()].filter(i => !info.start.includes(i) && !info.blocked[i]), isFree = new Set(free);
  const rowOf = new Map();
  rows.forEach((row, r) => row.forEach(c => rowOf.set(c, r)));
  const paths = coverPaths(info, free, rows), pathOf = new Map();
  paths.forEach((path, t) => path.forEach(c => pathOf.set(c, t)));
  // A row whose free cards belong to different rows of the cover.
  for (const row of rows) {
    const fs = row.filter(c => isFree.has(c)), groups = new Map();
    for (const c of fs) { const t = pathOf.get(c); if (!groups.has(t)) groups.set(t, []); groups.get(t).push(c); }
    if (groups.size > 1) { const small = [...groups.values()].reduce((a, g) => (g.length <= a.length ? g : a)); return out(small.at(-1), 'split'); }
  }
  // Two rows holding cards of one row of the cover.
  for (const path of paths) {
    const used = [...new Set(path.filter(c => rowOf.has(c)).map(c => rowOf.get(c)))];
    if (used.length > 1) {
      const count = r => rows[r].filter(c => isFree.has(c)).length;
      const r = used.reduce((a, x) => (count(x) <= count(a) ? x : a));
      return out(rows[r].filter(c => isFree.has(c)).at(-1), 'join');
    }
  }
  for (const path of paths) {
    const placed = path.find(c => rowOf.has(c)), r = placed === undefined ? -1 : rowOf.get(placed);
    for (const c of path) if (!rowOf.has(c)) {
      if (r < 0) return put(c, rows.length);
      const clash = rows[r].find(x => !comp[c][x]);
      return clash !== undefined ? out(clash, 'clash') : put(c, r);
    }
  }
  // Kept cards, then the cards that nest with them, in rows with no free card.
  for (const c of [...info.start, ...[...Array(info.k).keys()].filter(i => info.blocked[i])]) if (!rowOf.has(c)) {
    const r = rows.findIndex(row => !row.some(x => isFree.has(x)) && row.every(x => comp[c][x]));
    return put(c, r >= 0 ? r : rows.length);
  }
  return null;
}
// The sure hint: a fewest-row cover fixed by the deck alone. Each of its
// moves takes out a card that is in the wrong place for that cover or puts one
// in the right place, so a run of these hints always reaches a solve.
function rowsHintSure(info, s, rows) {
  const M = info.masks, {comp} = info, words = i => cardWords(M[i]);
  const out = i => ({type: 'move', action: {type: 'unplace', card: i}, text: cap(`take ${words(i)} out of its row.`), card: [0, i]});
  const put = (i, r) => ({type: 'move', action: {type: 'place', card: i, row: r}, text: r < rows.length ? cap(`put ${words(i)} in the row with ${words(rows[r][0])}.`) : cap(`put ${words(i)} in a new row.`), card: [0, i], row: r});
  const isFree = i => !info.start.includes(i) && !info.blocked[i];
  const free = [...Array(info.k).keys()].filter(isFree);
  const paths = (info.sure ??= coverPaths(info, free, [])), pathOf = new Map();
  paths.forEach((path, t) => path.forEach(c => pathOf.set(c, t)));
  const rowOf = new Map();
  rows.forEach((row, r) => row.forEach(c => rowOf.set(c, r)));
  const misses = (row, c) => row.filter(x => x !== c && !comp[c][x]).length;
  const most = list => list.reduce((a, c) => (c.n > a.n ? c : a)).c;
  // A row that breaks: a kept or faded-for-the-pin card that misses another, else the free card that misses most.
  for (const row of rows) if (!isChain(info, row)) {
    const fixed = row.filter(c => !isFree(c) && misses(row, c));
    return out(most((fixed.length ? fixed : row).map(c => ({c, n: misses(row, c)}))));
  }
  // A kept card in a row with a free card.
  for (const row of rows) if (row.some(isFree)) { const k = row.find(c => info.start.includes(c)); if (k !== undefined) return out(k); }
  // A row holding two rows of the cover, or one row of the cover held in two rows.
  for (const row of rows) {
    const fs = row.filter(isFree), first = pathOf.get(fs[0]), other = fs.find(c => pathOf.get(c) !== first);
    if (other !== undefined) return out(other);
  }
  for (const path of paths) {
    const used = [...new Set(path.filter(c => rowOf.has(c)).map(c => rowOf.get(c)))];
    if (used.length > 1) return out(path.find(c => rowOf.get(c) === used[1]));
  }
  for (const path of paths) {
    const placed = path.find(c => rowOf.has(c)), r = placed === undefined ? -1 : rowOf.get(placed);
    for (const c of path) if (!rowOf.has(c)) {
      if (r < 0) return put(c, rows.length);
      const clash = rows[r].find(x => !comp[c][x]);
      return clash !== undefined ? out(clash) : put(c, r);
    }
  }
  for (const c of [...info.start, ...[...Array(info.k).keys()].filter(i => info.blocked[i])]) if (!rowOf.has(c)) {
    const r = rows.findIndex(row => !row.some(isFree) && row.every(x => comp[c][x]));
    return put(c, r >= 0 ? r : rows.length);
  }
  return null;
}
const rowMove = (info, rows, action) => (action.type === 'place' ? place(info, rows, action.card, action.row) : unplace(rows, action.card));
// The hint that keeps the child's rows, while following it reaches a solve;
// otherwise the sure hint. Either way a run of hints ends in a solve.
function rowsHint(info, s, rows) {
  const memo = (info.near ||= new Map()), near = r => {
    const key = `${s.chosen.join()}|${JSON.stringify(r)}`;
    if (!memo.has(key)) { if (memo.size > 6000) memo.clear(); memo.set(key, rowsHintNear(info, s, r)); }
    return memo.get(key);
  };
  const seen = new Set();
  for (let r = rows; r; ) {
    if (certified(info, s.chosen, r)) return near(rows);
    const key = JSON.stringify(r);
    if (seen.has(key)) break;
    seen.add(key);
    const h = near(r);
    r = h && rowMove(info, r, h.action);
  }
  return rowsHintSure(info, s, rows);
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  let h = null;
  if (q.mode === 'every') {
    const info = infoOf(p, b), s = b.decks[0], have = new Set(b.found.map(f => JSON.stringify(f)));
    const left = ofSize(info, info.target).filter(a => !have.has(JSON.stringify(a)));
    // The claim's hint gives the reason; the second level marks That's all.
    h = left.length ? collectionHint(p, 0, info, s, left) : {type: 'move', action: {type: 'all'}, text: `Every collection of ${NUMBER[info.target] ?? info.target} here has cards of only one size, and you have found ${b.found.length === 1 ? 'it' : b.found.length === 2 ? 'both' : 'each one'}.`};
  } else {
    for (let d = 0; d < b.decks.length && !h; d++) {
      const info = infoOf(p, b, d), s = b.decks[d];
      if (q.mode === 'reach') { if (!deckReached(info, s)) h = collectionHint(p, d, info, s, ofSize(info, info.target)); continue; }
      if (q.mode === 'extend' && deckDone(info, s)) continue;
      h = collectionHint(p, d, info, s, largest(info));
      if (!h && q.mode === 'extend') {
        const left = [...Array(info.k).keys()].find(i => !s.chosen.includes(i) && !s.out.includes(i));
        h = {type: 'move', action: {type: 'tap', deck: d, card: left}, text: cap(`${deckWords(p, d)}try ${cardWords(info.masks[left])}.`), card: [d, left]};
      }
      if (!h && q.mode === 'best') h = rowsHint(info, s, b.rows);
    }
  }
  h ||= {type: 'done'};
  if (hintMemo.size > 4000) hintMemo.clear();
  hintMemo.set(key, h);
  return h;
}

// --- View state ---------------------------------------------------------------
// The card whose links are shown (the last one tried, or one tapped again) is
// view state, outside the save.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {show: null}); return uiState.get(p.id); }

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const SPOTS = {4: [[11, 11], [29, 11], [11, 29], [29, 29]], 5: [[10, 10], [30, 10], [10, 30], [30, 30], [20, 20]]};
function shape(k, x, y, s) {
  const pts = list => list.map(([a, b]) => `${f(x + a * s)},${f(y + b * s)}`).join(' ');
  if (k === 0) return `<circle class="ns-s0" cx="${x}" cy="${y}" r="${f(6.3 * s)}"/>`;
  if (k === 1) return `<polygon class="ns-s1" points="${pts([[0, -6.9], [6.9, 5.3], [-6.9, 5.3]])}"/>`;
  if (k === 2) return `<rect class="ns-s2" x="${f(x - 5.7 * s)}" y="${f(y - 5.7 * s)}" width="${f(11.4 * s)}" height="${f(11.4 * s)}" rx="${f(0.8 * s)}"/>`;
  if (k === 3) return `<polygon class="ns-s3" points="${pts(Array.from({length: 10}, (_, t) => { const r = t % 2 ? 3.1 : 7.4, a = -Math.PI / 2 + (t * Math.PI) / 5; return [r * Math.cos(a), r * Math.sin(a) + 0.6]; }))}"/>`;
  return `<polygon class="ns-s4" points="${pts([[0, -6.6], [5.2, 0], [0, 6.6], [-5.2, 0]])}"/>`;
}
// A card's face: its pictures in their places and a faint spot where each
// missing picture would be.
export function face(info, m) {
  const spots = info.n === 5 ? SPOTS[5] : SPOTS[4], s = info.n === 5 ? 0.84 : 1;
  let out = '';
  for (let k = 0; k < info.n; k++) { const [x, y] = spots[k]; out += m & (1 << k) ? shape(k, x, y, s) : `<circle class="ns-spot" cx="${x}" cy="${y}" r="1.3"/>`; }
  return `<svg class="ns-face" viewBox="0 0 40 40" aria-hidden="true" focusable="false">${out}</svg>`;
}
const moveData = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const button = (label, action, cls, enabled, hinted, focus, extra = '') => `<button type="button" class="secondary ns-button ${cls}${hinted ? ' hinted' : ''}" ${moveData(action)} data-focus="${focus}" ${extra} ${enabled ? '' : 'disabled'}>${label}</button>`;

function cardHTML(p, info, s, d, i, opts) {
  const m = info.masks[i], kept = info.start.includes(i), chosen = s.chosen.includes(i), out = s.out.includes(i);
  const shown = opts.show && opts.show[0] === d && opts.show[1] === i, blocker = opts.blockers?.has(i);
  const cls = ['ns-card', chosen ? 'chosen' : '', kept ? 'kept' : '', out ? 'out' : '', shown ? 'shown' : '', blocker ? 'blocker' : '', opts.hint === i ? 'hinted' : '', opts.drag ? 'drag' : ''].filter(Boolean).join(' ');
  const state = kept ? ', kept' : chosen ? ', chosen' : out ? `, nests with ${blockers(info, s, i).map(j => cardWords(info.masks[j]).replace(/^the /, '')).join(' and ')}` : '';
  const where = opts.row !== undefined ? `, row ${opts.row + 1}` : '';
  // A bar in the gap before a card in a row that does not hold the card before it.
  const bar = opts.broken ? '<i class="ns-break" aria-hidden="true"></i>' : '';
  return `<button type="button" class="${cls}" data-deck="${d}" data-card="${i}" data-focus="ns-card-${d}-${i}" aria-pressed="${chosen}" aria-label="${esc(cap(cardWords(m).replace(/^the /, '')) + state + where)}">${face(info, m)}${bar}</button>`;
}
function pips(info, s) {
  const t = info.target, n = Math.min(s.chosen.length, t);
  return `<div class="ns-pips" role="img" aria-label="${n} of ${t} chosen">${Array.from({length: t}, (_, k) => `<i class="${k < n ? 'on' : ''}"></i>`).join('')}</div>`;
}
const ROW_WORD = {one: 'one chosen card', none: 'no chosen card', many: 'more than one chosen card', blocked: 'every card nests with a kept card'};
function rowsHTML(p, info, s, rows, h, done, opts) {
  const states = rowStates(info, s.chosen, rows), hintRow = h?.row;
  const items = rows.map((row, r) => {
    const st = states[r], mark = st.blocked ? 'blocked' : st.picked === 0 ? 'none' : st.picked === 1 ? 'one' : 'many';
    const cards = row.map((c, t) => cardHTML(p, info, s, 0, c, {...opts, row: r, broken: t > 0 && !strictly(info.masks[row[t - 1]], info.masks[c])})).join('');
    const label = `Row ${r + 1}, ${ROW_WORD[mark]}${st.chain ? '' : ', two cards here do not nest'}`;
    return `<div class="ns-row ${mark}${st.chain ? '' : ' broken'}${hintRow === r ? ' hinted' : ''}" data-row="${r}" role="group" aria-label="${esc(label)}"><span class="ns-mark" aria-hidden="true"></span><div class="ns-line">${cards}</div></div>`;
  }).join('');
  const fresh = done ? '' : `<div class="ns-row new${hintRow === rows.length ? ' hinted' : ''}" data-row="${rows.length}" role="group" aria-label="New row"><span class="ns-mark" aria-hidden="true"></span><div class="ns-line"></div></div>`;
  return `<div class="ns-rows" role="group" aria-label="Rows">${items}${fresh}</div>`;
}
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), play = q.mode === 'playground', rowsMode = ROWS_MODES.includes(q.mode);
  const h = a.hintLevel >= 2 && !done && !play ? hint(p, b) : null, act = h?.action;
  const show = ui(p).show, links = [], cardOpts = [];
  const decks = b.decks.map((s, d) => {
    const info = infoOf(p, b, d), live = show && show[0] === d && s.out.includes(show[1]) ? show[1] : null;
    if (live !== null) for (const j of blockers(info, s, live)) links.push([d, live, j, 'try']);
    // A finished extend deck shows every refused card's link: the whole argument.
    const finished = q.mode === 'extend' && deckDone(info, s);
    if (finished) for (const i of s.out) if (i !== live) for (const j of blockers(info, s, i).slice(0, 1)) links.push([d, i, j, 'proof']);
    const placed = rowsMode ? new Set(b.rows.flat()) : new Set();
    const opts = {show: live !== null ? show : null, blockers: live !== null ? new Set(blockers(info, s, live)) : null, hint: h?.card?.[0] === d ? h.card[1] : null, drag: rowsMode && !done};
    cardOpts.push(opts);
    const cards = [...Array(info.k).keys()].filter(i => !placed.has(i)).map(i => cardHTML(p, info, s, d, i, opts)).join('');
    const top = info.target !== null ? pips(info, s) : '';
    const told = q.mode === 'extend' && b.stuck.includes(d) ? '<p class="ns-told">Another way fits more cards.</p>' : '';
    const ok = (q.mode === 'reach' && deckReached(info, s)) || finished;
    const tray = `<div class="ns-tray${rowsMode ? ' drop' : ''}" data-tray="${d}" role="group" aria-label="${rowsMode ? 'Cards not in a row' : 'Cards'}" style="--ns-cols:${info.cols}">${cards}</div>`;
    return `<section class="ns-deck${ok ? ' done' : ''}${b.decks.length > 1 ? ' framed' : ''}" data-deck="${d}" aria-label="${b.decks.length > 1 ? `${cap(ORDINAL[d])} deck` : 'Deck'}">${top}${tray}${told}</section>`;
  }).join('');
  const info0 = infoOf(p, b);
  let extra = '', note = '';
  if (rowsMode) extra = rowsHTML(p, info0, b.decks[0], b.rows, h, done, cardOpts[0]);
  if (q.mode === 'every') {
    const found = b.found.map((set, t) => `<div class="ns-found-set${b.told?.kind === 'again' && b.told.at === t ? ' again' : ''}" role="img" aria-label="${esc(set.map(i => cardWords(info0.masks[i]).replace(/^the /, '')).join(', '))}">${set.map(i => `<span class="ns-mini">${face(info0, info0.masks[i])}</span>`).join('')}</div>`).join('');
    extra = `${found ? `<div class="ns-found" role="group" aria-label="Collections found">${found}</div>` : ''}${done ? '' : `<div class="ns-bar">${button('That’s all', {type: 'all'}, 'ns-all', b.told?.kind !== 'more', act?.type === 'all', 'ns-all')}</div>`}`;
    note = b.told?.kind === 'more' ? 'There is another.' : b.told?.kind === 'again' ? 'Found already.' : '';
  }
  let chooser = '';
  if (play) chooser = `<div class="ns-picks" role="group" aria-label="Deck">${q.choices.map((c, k) => { const ci = deckInfo(c), full = ci.masks.reduce((x, m) => x | m, 0); return `<button type="button" class="secondary ns-pick" ${moveData({type: 'deck', pick: k})} data-focus="ns-pick-${k}" aria-pressed="${b.pick === k}" aria-label="${ci.k} cards">${face(ci, full)}</button>`; }).join('')}</div>`;
  const status = statusText(p, b, done, note);
  const slots = rowsMode ? info0.slots : 0;
  const style = `--ns-cols:${Math.max(...b.decks.map((_, d) => infoOf(p, b, d).cols))};--ns-slots:${slots || Math.max(...b.decks.map((_, d) => infoOf(p, b, d).cols))};--ns-rowpad:${slots ? 36 : 0}px`;
  return `<div class="ns-puzzle ${q.mode}${done ? ' solved' : ''}${b.decks.length > 1 ? ' multi' : ''}" data-mechanic-wire="nests" data-links="${esc(JSON.stringify(links))}" style="${style}">${chooser}<div class="ns-decks">${decks}</div>${extra}${note ? `<p class="ns-told">${note}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function statusText(p, b, done, note) {
  const q = p.parameters, words = (info, list) => list.map(i => cardWords(info.masks[i]).replace(/^the /, '')).join(', ') || 'none';
  const parts = b.decks.map((s, d) => {
    const info = infoOf(p, b, d), say = b.decks.length > 1 ? `${cap(ORDINAL[d])} deck: ` : '';
    const extra = q.mode === 'extend' && b.stuck.includes(d) ? ' Another way fits more cards.' : q.mode === 'extend' && deckDone(info, s) ? ' Done.' : '';
    return `${say}chosen ${words(info, s.chosen)}.${extra}`;
  });
  if (ROWS_MODES.includes(q.mode)) {
    const info = infoOf(p, b), states = rowStates(info, b.decks[0].chosen, b.rows);
    parts.push(`${b.rows.length} ${b.rows.length === 1 ? 'row' : 'rows'}${b.rows.length ? `: ${b.rows.map((row, r) => `${words(info, row)}${states[r].chain ? '' : ' (does not nest)'}`).join('; ')}` : ''}. ${info.k - b.rows.flat().length} cards not in a row.`);
  }
  if (q.mode === 'every') parts.push(`${b.found.length ? `Found: ${b.found.map(set => words(infoOf(p, b), set)).join('; ')}.` : ''}`);
  const show = ui(p).show;
  if (show && b.decks[show[0]]?.out.includes(show[1])) { const info = infoOf(p, b, show[0]), s = b.decks[show[0]]; parts.push(`${cap(cardWords(info.masks[show[1]]))} nests with ${words(info, blockers(info, s, show[1]))}.`); }
  if (note) parts.push(note);
  if (done) parts.push('Solved.');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// --- Taps, drags and keys -----------------------------------------------------
// A tap on a card chooses it (or tries it, or puts it back). In rows puzzles a
// card is dragged into a row, onto the dashed row to start a new one, or back
// to the cards; with the keyboard a number key puts the focused card in that
// row and 0 takes it out.
const SVGNS = 'http://www.w3.org/2000/svg';
let observer = null;
function drawLinks(root) {
  root.querySelector(':scope > .ns-links')?.remove();
  let links = [];
  try { links = JSON.parse(root.dataset.links || '[]'); } catch { links = []; }
  if (!links.length) return;
  const box = root.getBoundingClientRect(), svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('class', 'ns-links');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', f(box.width)); svg.setAttribute('height', f(box.height));
  for (const [d, i, j, kind] of links) {
    const a = root.querySelector(`.ns-card[data-deck="${d}"][data-card="${i}"]`)?.getBoundingClientRect(), c = root.querySelector(`.ns-card[data-deck="${d}"][data-card="${j}"]`)?.getBoundingClientRect();
    if (!a || !c) continue;
    const p1 = [a.left + a.width / 2 - box.left, a.top + a.height / 2 - box.top], p2 = [c.left + c.width / 2 - box.left, c.top + c.height / 2 - box.top];
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1], edge = (w, hh) => Math.min(Math.abs(dx) > 0 ? w / 2 / Math.abs(dx) : Infinity, Math.abs(dy) > 0 ? hh / 2 / Math.abs(dy) : Infinity);
    const t1 = edge(a.width, a.height), t2 = edge(c.width, c.height);
    if (t1 + t2 >= 1) continue;
    for (const cls of ['ns-link-halo', `ns-link ${kind}`]) {
      const line = document.createElementNS(SVGNS, 'line');
      line.setAttribute('class', cls);
      line.setAttribute('x1', f(p1[0] + dx * t1)); line.setAttribute('y1', f(p1[1] + dy * t1));
      line.setAttribute('x2', f(p2[0] - dx * t2)); line.setAttribute('y2', f(p2[1] - dy * t2));
      svg.appendChild(line);
    }
  }
  root.appendChild(svg);
}
// One drag at a time, followed on the document so a finger can leave the card.
let drag = null, listening = false, dragged = false;
function dropTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  return el?.closest?.('[data-mechanic-wire="nests"] .ns-row, [data-mechanic-wire="nests"] .ns-tray.drop') || null;
}
function dragMove(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
  if (!drag.moved) {
    drag.moved = true;
    const r = drag.card.getBoundingClientRect();
    drag.ghost = drag.card.cloneNode(true);
    drag.ghost.classList.add('ns-ghost');
    drag.ghost.removeAttribute('data-focus');
    drag.ghost.querySelector('.ns-break')?.remove();
    Object.assign(drag.ghost.style, {width: `${r.width}px`, height: `${r.height}px`});
    drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
    document.body.appendChild(drag.ghost);
    drag.card.classList.add('lifted');
    drag.root.classList.add('dragging');
  }
  drag.ghost.style.transform = `translate(${f(e.clientX - drag.dx)}px, ${f(e.clientY - drag.dy)}px)`;
  const over = dropTarget(e.clientX, e.clientY);
  if (over !== drag.over) { drag.over?.classList.remove('drop-over'); over?.classList.add('drop-over'); drag.over = over; }
  // Near the top or bottom of the window, the page scrolls with the card.
  if (e.clientY < 48) window.scrollBy(0, -12); else if (e.clientY > window.innerHeight - 48) window.scrollBy(0, 12);
  e.preventDefault();
}
function dragEnd(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.ghost?.remove(); d.card.classList.remove('lifted'); d.root.classList.remove('dragging'); d.over?.classList.remove('drop-over');
  if (!d.moved) return;
  // The click that follows a drag belongs to the drag, not to a tap.
  dragged = true;
  setTimeout(() => { dragged = false; }, 0);
  const target = e.type === 'pointerup' ? dropTarget(e.clientX, e.clientY) : null;
  if (!target) return;
  const i = Number(d.card.dataset.card), inRow = d.card.closest('.ns-row');
  if (target.classList.contains('ns-tray')) { if (inRow) d.api.apply({type: 'unplace', card: i}); return; }
  const r = Number(target.dataset.row);
  if (inRow && Number(inRow.dataset.row) === r) return;
  d.api.apply({type: 'place', card: i, row: r});
}
function wire(root, p, api) {
  drawLinks(root);
  observer?.disconnect();
  if (typeof ResizeObserver === 'function') { observer = new ResizeObserver(() => { if (root.isConnected) drawLinks(root); }); observer.observe(root); }
  root.addEventListener('click', e => {
    if (dragged) return;
    const card = e.target.closest?.('.ns-card');
    if (!card || card.classList.contains('ns-ghost')) return;
    api.apply({type: 'tap', deck: Number(card.dataset.deck), card: Number(card.dataset.card)});
  });
  if (!ROWS_MODES.includes(p.parameters.mode)) return;
  root.addEventListener('keydown', e => {
    const card = e.target.closest?.('.ns-card');
    if (!card || e.altKey || e.ctrlKey || e.metaKey) return;
    const n = /^[0-9]$/.test(e.key) ? Number(e.key) : ['Delete', 'Backspace'].includes(e.key) ? 0 : null;
    if (n === null) return;
    e.preventDefault();
    const i = Number(card.dataset.card), rows = api.attempt().board.rows;
    if (n === 0) { if (rows.some(row => row.includes(i))) api.apply({type: 'unplace', card: i}); return; }
    api.apply({type: 'place', card: i, row: Math.min(n - 1, rows.length)});
  });
  if (!listening) { document.addEventListener('pointermove', dragMove, {passive: false}); document.addEventListener('pointerup', dragEnd); document.addEventListener('pointercancel', dragEnd); listening = true; }
  root.addEventListener('pointerdown', e => {
    const card = e.target.closest?.('.ns-card.drag');
    if (!card || e.button > 0) return;
    drag = {card, root, api, pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, ghost: null, over: null};
  });
}

function carry(p, from, to) {
  const mode = p.parameters.mode;
  if (!object(from) || !object(to)) return to;
  // Undo keeps "Another way fits more cards." while that deck's chosen cards stay the same.
  if (mode === 'extend' && Array.isArray(from.stuck) && Array.isArray(to.stuck)) {
    const same = d => JSON.stringify(from.decks?.[d]?.chosen) === JSON.stringify(to.decks?.[d]?.chosen);
    return {...to, stuck: sorted([...new Set([...to.stuck, ...from.stuck.filter(same)])])};
  }
  if (mode !== 'every' || !Array.isArray(from.found)) return to;
  // Undo keeps the collections found and an answer to That's all.
  return {...to, found: from.found.map(s => [...s]), told: from.told?.kind === 'more' ? {kind: 'more'} : null, done: false};
}
export const nestMechanics = {
  nests: {
    fresh, valid, solved, move, hint, render, wire, carry,
    ui(p, payload) { if (object(payload) && 'show' in payload) ui(p).show = Array.isArray(payload.show) ? payload.show : null; },
    reset: p => { uiState.delete(p.id); },
    noHint: p => isPlay(p)
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'nests',
  family: {id: 'nests', symbol: '▣', area: 'patterns'},
  mechanics: nestMechanics,
  pack: new URL('./nests.json', import.meta.url).href,
  css: new URL('./nests.css', import.meta.url).href,
  focus: '.ns-card,.ns-button:not([disabled]),.ns-pick'
};
