// Fair shares (worksheet Week 58, fair division with different values). Each
// person adds up their own values; a share is envy-free when everybody counts
// their own tray worth at least as much as each other tray by their own
// values (a tie is fine). The app never adds anything up while the child
// works and never sets one person's number beside another's.
//
// Five modes on one mechanic:
// - one, every: two people with different tastes share whole cards. Find one
//   envy-free division (Fair checks it), or every one (labelled cards: who
//   gets which card): Keep puts a division on the shelf unjudged, and That's
//   all judges the whole shelf at once; the catalog by A's reds and blues is
//   the certificate.
// - halve: two people with the same taste share equal cards they each count
//   as 1. With an odd number no whole division works; the child shows it by
//   pairing the cards one from each tray (an odd number is left over), then
//   cuts a card in half. With an even number Can't is refused.
// - favourites: n people, n items, one each. With one item each, nobody
//   envies exactly when everyone holds a favourite, so this is a perfect
//   matching; Can't is certified by k people whose favourites are fewer than k
//   items (Hall's theorem).
// - duel: cut and choose on a two-colour strip of squares. The child cuts, the
//   other person takes the piece better for them, and a star marks a cut that
//   was equal by the child's own values, so half was certain whatever they
//   took. Then the other person cuts and the child chooses.
import {esc} from '../../expansion-controls.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keysAre = (o, keys) => object(o) && Object.keys(o).sort().join() === [...keys].sort().join();
const int = v => Number.isInteger(v);
const memo = (cache, key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const MODES = ['one', 'every', 'halve', 'favourites', 'duel'];

// --- Two people sharing cards ---------------------------------------------------
// q.people: [{id, likes: {red, blue}}]; q.goods: [{id, colour}]. Values are kept
// doubled so a half card is a whole number: a whole card is worth 2 × likes.
export function goodsNow(q, cut = null) {
  return q.goods.flatMap(g => g.id === cut ? [{id: `${g.id}a`, colour: g.colour, half: true, of: g.id}, {id: `${g.id}b`, colour: g.colour, half: true, of: g.id}] : [g]);
}
export const worth = (person, good) => person.likes[good.colour] * (good.half ? 1 : 2);
export const trayWorth = (goods, at, judge, owner) => goods.reduce((s, g) => s + (at[g.id] === owner ? worth(judge, g) : 0), 0);
export const complete = (goods, at) => goods.every(g => at[g.id] !== null);
// Everybody who counts another tray worth more than their own, and the first.
export function enviousAll(q, goods, at) {
  return q.people.filter(p => {
    const own = trayWorth(goods, at, p, p.id);
    return q.people.some(o => o.id !== p.id && trayWorth(goods, at, p, o.id) > own);
  }).map(p => p.id);
}
export const envious = (q, goods, at) => enviousAll(q, goods, at)[0] ?? null;
export const keyOf = (goods, at) => goods.map(g => at[g.id] ?? '-').join('');
const atOf = (goods, key) => Object.fromEntries(goods.map((g, i) => [g.id, key[i] === '-' ? null : key[i]]));
// Every complete division with no envy, as keys (owners in card order).
const fairCache = new Map();
export function fairKeys(q, cut = null) {
  return memo(fairCache, JSON.stringify([q.people, q.goods, cut]), () => {
    const goods = goodsNow(q, cut), ids = q.people.map(p => p.id), out = [];
    const total = ids.length ** goods.length;
    for (let m = 0; m < total; m++) {
      let key = '', r = m;
      for (let i = 0; i < goods.length; i++) { key += ids[r % ids.length]; r = Math.floor(r / ids.length); }
      if (envious(q, goods, atOf(goods, key)) === null) out.push(key);
    }
    return out.sort();
  });
}
const personOf = (q, id) => q.people.find(p => p.id === id);
const goodName = g => g.half ? `half of ${g.of}` : g.id;

// --- Boards -------------------------------------------------------------------
// one:   {at, told, done}
// every: {at, shelf, told, done}
// halve: {at, cut, claim, told, done}
// at maps each card now on the board to its owner or null (still on the table).
// shelf (every): the divisions kept, as keys in order, none of them judged.
// told: null; {kind: 'swap', who} after a refused Fair (everybody who would
// swap); {kind: 'unfair'} or {kind: 'more'} after a refused That's all,
// kept until the shelf changes; {kind: 'over', n} after a refused Can't (an
// even number n of cards left over once the cards are paired across).
// claim (halve): {pairs, left} once Can't is shown: the pairs, and the cards
// left over, an odd number of them.
const shareFresh = q => {
  const at = Object.fromEntries(q.goods.map(g => [g.id, null]));
  if (q.mode === 'every') return {at, shelf: [], told: null, done: false};
  if (q.mode === 'halve') return {at, cut: null, claim: null, told: null, done: false};
  return {at, told: null, done: false};
};
// A pairing: disjoint pairs of whole cards, each pair worth the same to every
// person. Returns the cards left unpaired, or null.
export function pairingLeft(q, pairs) {
  if (!Array.isArray(pairs)) return null;
  const ids = q.goods.map(g => g.id), used = new Set();
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(id => ids.includes(id)) || pair[0] === pair[1] || pair.some(id => used.has(id))) return null;
    const [g, h] = pair.map(id => q.goods.find(x => x.id === id));
    if (!q.people.every(p => worth(p, g) === worth(p, h))) return null;
    pair.forEach(id => used.add(id));
  }
  return ids.filter(id => !used.has(id));
}
// The pairing for Can't is shown on the child's own attempt: each pair is one
// card from each tray ("one for U, one for V"), and it goes on until one tray
// has no card left unpaired. Returns the cards left over, or null when a pair
// is not across the trays or another pair could still be made. An odd number
// over proves that no whole division works: with one taste and equal cards, a
// fair share needs as many cards each, and moving a card across changes the
// cards left over by two, so an odd number over never reaches 0.
export function acrossLeft(q, at, pairs) {
  const left = pairingLeft(q, pairs);
  if (!left || !pairs.every(([x, y]) => at[x] !== null && at[y] !== null && at[x] !== at[y])) return null;
  const owners = new Set(left.map(id => at[id]));
  return owners.size <= 1 ? left : null;
}
export const maximalPairs = (q, at) => {
  const [u, v] = q.people.map(p => p.id), us = q.goods.filter(g => at[g.id] === u), vs = q.goods.filter(g => at[g.id] === v);
  return us.slice(0, Math.min(us.length, vs.length)).map((g, k) => [g.id, vs[k].id]);
};
const normPairs = (q, pairs) => {
  const order = id => q.goods.findIndex(g => g.id === id);
  return pairs.map(p => [...p].sort((x, y) => order(x) - order(y))).sort((x, y) => order(x[0]) - order(y[0]));
};
function validShare(q, b) {
  const want = {one: ['at', 'done', 'told'], every: ['at', 'done', 'shelf', 'told'], halve: ['at', 'claim', 'cut', 'done', 'told']}[q.mode];
  if (!keysAre(b, want) || typeof b.done !== 'boolean') return false;
  const cut = q.mode === 'halve' ? b.cut : null;
  if (q.mode === 'halve') {
    if (b.claim !== null) {
      if (!keysAre(b.claim, ['left', 'pairs'])) return false;
      const left = pairingLeft(q, b.claim.pairs);
      if (!left || left.length % 2 === 0 || !same(left, b.claim.left) || !same(normPairs(q, b.claim.pairs), b.claim.pairs)) return false;
    }
    if (cut !== null && (b.claim === null || !q.goods.some(g => g.id === cut))) return false;
  }
  const goods = goodsNow(q, cut), ids = q.people.map(p => p.id);
  if (!keysAre(b.at, goods.map(g => g.id)) || !goods.every(g => b.at[g.id] === null || ids.includes(b.at[g.id]))) return false;
  const full = complete(goods, b.at), key = keyOf(goods, b.at), fair = fairKeys(q, cut);
  const shelfFair = q.mode === 'every' && Array.isArray(b.shelf) && b.shelf.every(k => fair.includes(k));
  if (q.mode === 'every') {
    const whole = k => typeof k === 'string' && k.length === goods.length && [...k].every(c => ids.includes(c));
    if (!Array.isArray(b.shelf) || !b.shelf.every((k, i) => whole(k) && (i === 0 || b.shelf[i - 1] < k))) return false;
  }
  const t = b.told;
  if (t !== null) {
    if (!object(t)) return false;
    if (t.kind === 'swap') { if (!keysAre(t, ['kind', 'who']) || q.mode === 'every' || !full || !t.who.length || !same(enviousAll(q, goods, b.at), t.who)) return false; }
    else if (t.kind === 'unfair') { if (!keysAre(t, ['kind']) || q.mode !== 'every' || shelfFair) return false; }
    else if (t.kind === 'more') { if (!keysAre(t, ['kind']) || q.mode !== 'every' || !shelfFair || b.shelf.length >= fair.length) return false; }
    else if (t.kind === 'over') {
      // A refused Can't: an even number of cards left over after pairing across.
      const [u, v] = q.people.map(p => goods.filter(g => b.at[g.id] === p.id).length);
      if (!keysAre(t, ['kind', 'n']) || q.mode !== 'halve' || b.claim !== null || cut !== null || !full || t.n % 2 !== 0 || t.n !== Math.abs(u - v)) return false;
    }
    else return false;
  }
  if (b.done) {
    if (t !== null) return false;
    if (q.mode === 'every') return same(b.shelf, fair);
    return full && fair.includes(key);
  }
  return true;
}
function shareMove(q, b, action) {
  const cut = q.mode === 'halve' ? b.cut : null, goods = goodsNow(q, cut), full = complete(goods, b.at);
  if (action.type === 'put') {
    if (!keysAre(action, ['good', 'to', 'type']) || !goods.some(g => g.id === action.good)) return null;
    if (action.to !== null && !q.people.some(p => p.id === action.to)) return null;
    if (b.at[action.good] === action.to) return null;
    // A refused That's all stands until the shelf changes, not the cards.
    return {...b, at: {...b.at, [action.good]: action.to}, told: q.mode === 'every' ? b.told : null};
  }
  if (q.mode === 'every') {
    // Keep shelves a division without judging it; That's all judges the
    // whole shelf once, and its refusal stands until the shelf changes.
    if (action.type === 'keep') {
      if (!keysAre(action, ['type']) || !full) return null;
      const key = keyOf(goods, b.at);
      if (b.shelf.includes(key)) return null;
      return {...b, shelf: [...b.shelf, key].sort(), told: null};
    }
    if (action.type === 'drop') {
      if (!keysAre(action, ['key', 'type']) || !b.shelf.includes(action.key)) return null;
      return {...b, shelf: b.shelf.filter(k => k !== action.key), told: null};
    }
    if (action.type === 'all') {
      if (!keysAre(action, ['type']) || b.told) return null;
      const fair = fairKeys(q);
      if (!b.shelf.every(k => fair.includes(k))) return {...b, told: {kind: 'unfair'}};
      if (b.shelf.length < fair.length) return {...b, told: {kind: 'more'}};
      return {...b, done: true};
    }
    return null;
  }
  if (action.type === 'fair') {
    if (!keysAre(action, ['type']) || !full || b.told?.kind === 'swap') return null;
    const who = enviousAll(q, goods, b.at);
    if (who.length) return {...b, told: {kind: 'swap', who}};
    return {...b, told: null, done: true};
  }
  if (q.mode !== 'halve') return null;
  if (action.type === 'cant') {
    // Can't is a claim about the child's own attempt, so it waits for every
    // card to be given out, and it is answered once per arrangement: a
    // refusal stands, through Undo, until a card moves.
    if (!keysAre(action, ['pairs', 'type']) || b.claim || cut !== null || !full || b.told?.kind === 'over') return null;
    const left = acrossLeft(q, b.at, action.pairs);
    if (!left) return null;
    if (left.length % 2 === 0) return {...b, told: {kind: 'over', n: left.length}};
    return {...b, told: null, claim: {left, pairs: normPairs(q, action.pairs)}};
  }
  if (action.type === 'halve') {
    if (!keysAre(action, ['good', 'type']) || !b.claim || cut !== null || !q.goods.some(g => g.id === action.good)) return null;
    const owner = b.at[action.good], at = {};
    for (const g of goodsNow(q, action.good)) at[g.id] = g.half ? owner : b.at[g.id];
    return {...b, cut: action.good, at, told: null};
  }
  return null;
}

// Hints: the envy-free division nearest the board (fewest cards to move),
// one card at a time, then Fair. For halve, an attempt first, then the
// pairing with its reason, then the cut.
const hintCache = new Map();
const nearest = (key, targets) => targets.reduce((best, t) => [...t].filter((c, i) => c !== key[i]).length < [...best].filter((c, i) => c !== key[i]).length ? t : best);
const trayWords = (q, id) => id === null ? 'back on the table' : `in ${id}’s tray`;
function towards(q, goods, b, target) {
  const key = keyOf(goods, b.at), i = [...target].findIndex((c, k) => c !== key[k]);
  if (i < 0) return {type: 'move', action: {type: 'fair'}, text: 'Press Fair.'};
  const g = goods[i];
  return {type: 'move', action: {type: 'put', good: g.id, to: target[i]}, text: `Put ${goodName(g)} ${trayWords(q, target[i])}.`};
}
function shareHint(q, b) {
  return memo(hintCache, JSON.stringify([q.people, q.goods, q.mode, b]), () => {
    const cut = q.mode === 'halve' ? b.cut : null, goods = goodsNow(q, cut), key = keyOf(goods, b.at), full = complete(goods, b.at);
    if (q.mode === 'every') {
      // Take back a kept way that somebody would swap, then keep the
      // nearest way not yet kept, then That's all.
      const fair = fairKeys(q), bad = b.shelf.find(k => !fair.includes(k));
      if (bad) {
        const [A] = q.people, mine = goods.filter((g, i) => bad[i] === A.id).map(g => g.id);
        return {type: 'move', action: {type: 'drop', key: bad}, text: `Take back the way where ${A.id} has ${mine.length ? listWords(mine) : 'nothing'}: ${listWords(enviousAll(q, goods, atOf(goods, bad)))} would swap.`};
      }
      const left = fair.filter(k => !b.shelf.includes(k));
      if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Every way nobody would swap is kept.'};
      if (full && left.includes(key)) return {type: 'move', action: {type: 'keep'}, text: 'Nobody would swap here. Press Keep.'};
      return towards(q, goods, b, nearest(key, left));
    }
    if (q.mode === 'one' || cut !== null || fairKeys(q).length) return towards(q, goods, b, nearest(key, fairKeys(q, cut)));
    if (b.claim) return {type: 'move', action: {type: 'halve', good: b.claim.left[0]}, text: `Cut ${b.claim.left[0]} in half.`};
    if (!full) {
      // An attempt first: give out the cards as evenly as they go.
      const g = goods.find(x => b.at[x.id] === null), count = id => goods.filter(x => b.at[x.id] === id).length;
      const to = q.people.reduce((low, p) => count(p.id) < count(low.id) ? p : low).id;
      return {type: 'move', action: {type: 'put', good: g.id, to}, text: `Put ${g.id} ${trayWords(q, to)}.`};
    }
    const [u, v] = q.people.map(p => p.id), pairs = maximalPairs(q, b.at), n = goods.length - 2 * pairs.length;
    return {type: 'move', action: {type: 'cant', pairs}, text: `${u} and ${v} count every card the same, so nobody would swap only when each has as many cards. Pair the cards one from each tray: ${n === 1 ? 'one is' : `${n} are`} left over.`};
  });
}

// --- Favourites -----------------------------------------------------------------
// q.people: [{id, likes: [itemId]}]; q.items: [{id}] with as many items as people.
// Board: {at: {item: person | null}, tried, group, told}. group is a shown
// Can't: people (two or more) whose favourites are fewer than them. told is
// {kind: 'enough', group, liked} after a group that likes enough items; it
// stands, and Can't stays shut, until a shape moves.
export const SHAPES = ['circle', 'triangle', 'square', 'diamond', 'star'];
const perms = a => a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r]));
const matchCache = new Map();
// Every way to give each person one of their favourites, as item lists in people order.
export function matchings(q) {
  return memo(matchCache, JSON.stringify([q.people, q.items]), () => perms(q.items.map(i => i.id)).filter(m => m.every((it, k) => q.people[k].likes.includes(it))));
}
export const likedBy = (q, group) => [...new Set(group.flatMap(id => personOf(q, id).likes))];
export const shortGroup = (q, group) => likedBy(q, group).length < group.length;
// The smallest group whose favourites are fewer than them (first in order).
export function shortestGroup(q) {
  const ids = q.people.map(p => p.id);
  let best = null;
  for (let m = 1; m < 1 << ids.length; m++) {
    const g = ids.filter((_, i) => m >> i & 1);
    if (shortGroup(q, g) && (!best || g.length < best.length)) best = g;
  }
  return best;
}
const holding = (q, at, id) => q.items.find(i => at[i.id] === id)?.id ?? null;
export const everyoneHappy = (q, at) => q.people.every(p => p.likes.includes(holding(q, at, p.id)));
const groupOk = (q, g) => Array.isArray(g) && g.length >= 2 && g.every(id => q.people.some(p => p.id === id)) && new Set(g).size === g.length && g.every((id, k) => k === 0 || q.people.findIndex(p => p.id === g[k - 1]) < q.people.findIndex(p => p.id === id));
const favFresh = q => ({at: Object.fromEntries(q.items.map(i => [i.id, null])), tried: false, group: null, told: null});
function validFav(q, b) {
  if (!keysAre(b, ['at', 'group', 'told', 'tried']) || typeof b.tried !== 'boolean' || !keysAre(b.at, q.items.map(i => i.id))) return false;
  const owners = Object.values(b.at).filter(v => v !== null);
  if (!owners.every(id => q.people.some(p => p.id === id)) || new Set(owners).size !== owners.length || (owners.length && !b.tried)) return false;
  if (b.group !== null && (!b.tried || !groupOk(q, b.group) || !shortGroup(q, b.group) || b.told !== null)) return false;
  if (b.told !== null) {
    const t = b.told;
    if (!keysAre(t, ['group', 'kind', 'liked']) || t.kind !== 'enough' || !groupOk(q, t.group) || shortGroup(q, t.group) || t.liked !== likedBy(q, t.group).length) return false;
  }
  return true;
}
function favMove(q, b, action) {
  if (action.type === 'give') {
    if (!keysAre(action, ['item', 'to', 'type']) || !Object.hasOwn(b.at, action.item)) return null;
    const to = action.to, from = b.at[action.item];
    if (to !== null && !q.people.some(p => p.id === to)) return null;
    if (from === to) return null;
    const at = {...b.at}, other = to === null ? null : holding(q, b.at, to);
    if (other) at[other] = from;
    at[action.item] = to;
    return {...b, at, tried: true, told: null};
  }
  if (action.type === 'cant') {
    if (!keysAre(action, ['group', 'type']) || !b.tried || b.told || !groupOk(q, action.group)) return null;
    if (shortGroup(q, action.group)) return {...b, group: action.group, told: null};
    return {...b, told: {kind: 'enough', group: action.group, liked: likedBy(q, action.group).length}};
  }
  return null;
}
function favHint(q, b) {
  return memo(hintCache, JSON.stringify([q.people, b]), () => {
    const all = matchings(q);
    if (all.length) {
      const score = m => q.people.filter((p, k) => b.at[m[k]] === p.id).length;
      const target = all.reduce((best, m) => score(m) > score(best) ? m : best);
      const k = q.people.findIndex((p, i) => b.at[target[i]] !== p.id);
      return {type: 'move', action: {type: 'give', item: target[k], to: q.people[k].id}, text: `Give the ${target[k]} to ${q.people[k].id}.`};
    }
    // An attempt first (and a fresh one after a refused group), then the reason.
    const g = shortestGroup(q);
    if (!b.tried || b.told) {
      const p = personOf(q, g[0]), item = p.likes.find(i => b.at[i] !== p.id);
      if (item) return {type: 'move', action: {type: 'give', item, to: p.id}, text: `Give the ${item} to ${p.id}.`};
      return {type: 'move', action: {type: 'give', item: p.likes[0], to: null}, text: `Put the ${p.likes[0]} back.`};
    }
    const liked = likedBy(q, g);
    return {type: 'move', action: {type: 'cant', group: g}, text: `${listWords(g)} only like the ${listWords(liked.map(String))}: ${g.length} people, ${liked.length} shapes.`};
  });
}

// --- Cut and choose -------------------------------------------------------------
// q.strip: 'RRRRRRBBBBBB' (squares, left to right); q.you, q.them: {red, blue}.
// Board: {r1, r2}. r1 = {at, star}: the child's cut after `at` squares, starred
// when the two pieces are worth the same to the child. r2 = {side, star}: the
// piece the child takes after the other person cuts, starred when it is worth
// at least as much to the child as the other piece. The take is final: a
// take without a star can only be followed by Again, which starts the duel
// over, and Undo keeps it.
const colourOf = c => c === 'R' ? 'red' : 'blue';
export const stripWorth = (strip, taste, from, to) => [...strip.slice(from, to)].reduce((s, c) => s + taste[colourOf(c)], 0);
export const equalCuts = (strip, taste) => { const n = strip.length, t = stripWorth(strip, taste, 0, n), out = []; for (let k = 1; k < n; k++) if (2 * stripWorth(strip, taste, 0, k) === t) out.push(k); return out; };
const sides = (q, at, taste) => [stripWorth(q.strip, taste, 0, at), stripWorth(q.strip, taste, at, q.strip.length)];
// The piece the other person takes: the one worth more to them; on a tie, the
// one worth less to the child, and the right one if that ties too.
export function theyTake(q, at) {
  const [l, r] = sides(q, at, q.them), [yl, yr] = sides(q, at, q.you);
  if (l !== r) return l > r ? 'left' : 'right';
  return yl < yr ? 'left' : 'right';
}
export const theirCut = q => equalCuts(q.strip, q.them)[0];
const fairCut = (q, at) => { const [l, r] = sides(q, at, q.you); return l === r; };
const goodPick = (q, side) => { const [l, r] = sides(q, theirCut(q), q.you); return side === 'left' ? l >= r : r >= l; };
const duelFresh = () => ({r1: null, r2: null});
function validDuel(q, b) {
  if (!keysAre(b, ['r1', 'r2'])) return false;
  if (b.r1 !== null && (!keysAre(b.r1, ['at', 'star']) || !int(b.r1.at) || b.r1.at < 1 || b.r1.at >= q.strip.length || b.r1.star !== fairCut(q, b.r1.at))) return false;
  if (b.r2 !== null && (!b.r1?.star || !keysAre(b.r2, ['side', 'star']) || !['left', 'right'].includes(b.r2.side) || b.r2.star !== goodPick(q, b.r2.side))) return false;
  return true;
}
function duelMove(q, b, action) {
  if (action.type === 'cut') {
    if (!keysAre(action, ['at', 'type']) || b.r1?.star || !int(action.at) || action.at < 1 || action.at >= q.strip.length || b.r1?.at === action.at) return null;
    return {r1: {at: action.at, star: fairCut(q, action.at)}, r2: null};
  }
  if (action.type === 'take') {
    if (!keysAre(action, ['side', 'type']) || !b.r1?.star || b.r2 || !['left', 'right'].includes(action.side)) return null;
    return {...b, r2: {side: action.side, star: goodPick(q, action.side)}};
  }
  if (action.type === 'again') {
    if (!keysAre(action, ['type']) || !b.r2 || b.r2.star) return null;
    return duelFresh();
  }
  return null;
}
const squares = k => `${k} ${k === 1 ? 'square' : 'squares'}`;
function duelHint(q, b) {
  if (b.r2 && !b.r2.star) return {type: 'move', action: {type: 'again'}, text: 'The other piece was more for you. Press Again.'};
  if (!b.r1?.star) {
    const at = equalCuts(q.strip, q.you)[0], total = stripWorth(q.strip, q.you, 0, q.strip.length);
    return {type: 'move', action: {type: 'cut', at}, text: `The whole strip is worth ${total} to you, so each piece should be worth ${total / 2}. Cut after ${squares(at)}.`};
  }
  const [l, r] = sides(q, theirCut(q), q.you), side = l >= r ? 'left' : 'right';
  return {type: 'move', action: {type: 'take', side}, text: `The left piece is worth ${l} to you and the right ${r}. Take the ${side} one.`};
}

// --- The mechanic hooks -----------------------------------------------------------
const two = q => ['one', 'every', 'halve'].includes(q.mode);
function fresh(p) {
  const q = p.parameters;
  if (two(q)) return shareFresh(q);
  return q.mode === 'favourites' ? favFresh(q) : duelFresh();
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (two(q)) return validShare(q, b);
  return q.mode === 'favourites' ? validFav(q, b) : validDuel(q, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return false;
  if (two(q)) return b.done;
  if (q.mode === 'favourites') return b.group !== null || everyoneHappy(q, b.at);
  return Boolean(b.r1?.star && b.r2?.star);
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action) || typeof action.type !== 'string') return null;
  const next = two(q) ? shareMove(q, b, action) : q.mode === 'favourites' ? favMove(q, b, action) : duelMove(q, b, action);
  if (next) uiState.delete(p.id);
  return next;
}
function hint(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  if (two(q)) return shareHint(q, b);
  return q.mode === 'favourites' ? favHint(q, b) : duelHint(q, b);
}

// --- View state -----------------------------------------------------------------
// pick: the card or item lifted by a tap; claiming: Can't is pressed;
// chosen: people tapped for Can't; pairs: cards paired for Can't;
// tool: 'cut' while the halving tool is held; knife: where the knife rests.
// It lasts while a puzzle is on screen: drawing another puzzle clears it.
const uiState = new Map();
let onScreen = null;
const ui = p => memo(uiState, p.id, () => ({pick: null, claiming: false, chosen: [], pairs: [], tool: null, knife: null, said: null, refused: null}));

// --- Drawing --------------------------------------------------------------------
const dots = n => `<i class="sh-dots" aria-hidden="true">${'<b></b>'.repeat(n)}</i>`;
const likeChip = (colour, n) => `<span class="sh-like ${colour}" aria-label="${colour} ${n}">${dots(n)}<b class="sh-n">${n}</b></span>`;
const token = (id, cls = '') => `<b class="sh-tok${cls}">${esc(id)}</b>`;
// A taste card: the person and what each colour is worth to them (only the
// colours on the board), or a face-down card.
const taste = (id, likes, colours = ['red', 'blue'], hidden = false) => `<div class="sh-taste${hidden ? ' hidden' : ''}" role="group" aria-label="${esc(id)}: ${hidden ? 'card face down' : colours.map(c => `${c} ${likes[c]}`).join(', ')}">${token(id)}${hidden ? colours.map(() => '<span class="sh-like face-down" aria-hidden="true">?</span>').join('') : colours.map(c => likeChip(c, likes[c])).join('')}</div>`;
const moveAttrs = (action, focus = '') => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"${focus ? ` data-focus="${focus}"` : ''}`;
const uiAttrs = (payload, focus = '') => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}"${focus ? ` data-focus="${focus}"` : ''}`;
// Claim buttons hand focus back to the board after a move: no element keeps
// their focus key, so the app falls back to the family's focus selector.
const claimButton = (label, action, enabled, hinted, cls) => `<button type="button" class="sh-button ${cls}${hinted ? ' hinted' : ''}" ${moveAttrs(action, 'sh-board')} ${enabled ? '' : 'disabled'}>${label}</button>`;
const toggleButton = (label, payload, on, hinted, cls, enabled = true) => `<button type="button" class="sh-button ${cls}${hinted ? ' hinted' : ''}" ${uiAttrs(payload, cls)} aria-pressed="${on}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const note = text => text ? `<p class="sh-told">${esc(text)}</p>` : '';

// A card: red or blue, its label, a half when cut.
function cardHtml(g, look, control) {
  const label = g.half ? `<span class="sh-half">½</span><small>${esc(g.of)}</small>` : esc(g.id);
  const name = `${g.half ? `Half of ${g.of}` : g.id}, ${g.colour}`;
  const cls = `sh-card ${g.colour}${g.half ? ' half' : ''}${look}`;
  if (!control) return `<span class="${cls}" data-sh-good="${esc(g.id)}" role="img" aria-label="${esc(name)}">${label}</span>`;
  return `<button type="button" class="${cls}" ${control.attrs} data-sh-good="${esc(g.id)}" data-focus="sh-good-${esc(g.id)}" aria-label="${esc(`${name}${control.say || ''}`)}"${control.pressed !== undefined ? ` aria-pressed="${control.pressed}"` : ''}>${label}</button>`;
}
// The catalog by A's reds and blues: the certificate after That's all.
function catalog(q) {
  const [A, B] = q.people, reds = q.goods.filter(g => g.colour === 'red').length, blues = q.goods.length - reds;
  const choose = (n, k) => { let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1); return c; };
  const fairAt = (r, u) => {
    const v = (p, rr, bb) => 2 * (p.likes.red * rr + p.likes.blue * bb);
    const aOwn = v(A, r, u), aOther = v(A, reds - r, blues - u), bOwn = v(B, reds - r, blues - u), bOther = v(B, r, u);
    return aOwn >= aOther && bOwn >= bOther;
  };
  const rows = [];
  for (let r = reds; r >= 0; r--) {
    const cells = [];
    for (let u = 0; u <= blues; u++) {
      const ok = fairAt(r, u), n = choose(reds, r) * choose(blues, u);
      const pips = `${'<i class="red"></i>'.repeat(r)}${'<i class="blue"></i>'.repeat(u)}` || '<i class="none"></i>';
      cells.push(`<td class="${ok ? 'fair' : ''}" aria-label="${esc(`${A.id} gets ${r} red and ${u} blue: ${ok ? `fair, ${n} ${n === 1 ? 'way' : 'ways'}` : 'someone would swap'}`)}"><span class="sh-pips">${pips}</span>${ok ? `<b>×${n}</b>` : ''}</td>`);
    }
    rows.push(`<tr>${cells.join('')}</tr>`);
  }
  return `<table class="sh-catalog" aria-label="Every way, by what ${esc(A.id)} gets"><tbody>${rows.join('')}</tbody></table>`;
}
function thumb(q, goods, key, hinted = false) {
  const tray = id => goods.filter((g, i) => key[i] === id).map(g => `<i class="${g.colour}">${esc(g.id.slice(1))}</i>`).join('');
  const words = q.people.map(p => `${p.id}: ${goods.filter((g, i) => key[i] === p.id).map(g => g.id).join(', ') || 'nothing'}`).join('. ');
  return `<li><button type="button" class="sh-kept${hinted ? ' hinted' : ''}" ${moveAttrs({type: 'drop', key}, 'sh-board')} aria-label="${esc(`Take back: ${words}`)}">${q.people.map(p => `<span class="sh-mini">${tray(p.id)}</span>`).join('')}</button></li>`;
}

// A refused claim clears the taps that made it, once, when it first shows.
function settle(state, b) {
  const key = ['over', 'enough'].includes(b.told?.kind) ? JSON.stringify(b.told) : null;
  if (key && key !== state.refused) Object.assign(state, {claiming: false, chosen: [], pairs: [], pick: null, said: null});
  state.refused = key;
}
function renderShare(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  settle(state, b);
  const cut = q.mode === 'halve' ? b.cut : null, goods = goodsNow(q, cut), full = complete(goods, b.at);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const claiming = q.mode === 'halve' && !done && !b.claim && state.claiming;
  const cutting = q.mode === 'halve' && !done && b.claim && cut === null && (state.tool === 'cut' || act?.type === 'halve');
  // A shown Can't keeps its pair marks while the cards stay where they were.
  const standing = Boolean(b.claim) && cut === null && same(acrossLeft(q, b.at, b.claim.pairs), b.claim.left);
  const paired = new Map((claiming ? state.pairs : standing ? b.claim.pairs : []).flatMap((pair, k) => pair.map(id => [id, k + 1])));
  const pick = state.pick;
  const card = g => {
    const hinted = (act?.type === 'put' && act.good === g.id) || (act?.type === 'halve' && act.good === g.id) || (act?.type === 'cant' && act.pairs.flat().includes(g.id)) ? ' hinted' : '';
    const look = `${pick === g.id ? ' picked' : ''}${hinted}${paired.has(g.id) ? ` paired p${paired.get(g.id)}` : ''}${standing && b.claim.left.includes(g.id) ? ' odd' : ''}`;
    if (done) return cardHtml(g, look, null);
    if (claiming) {
      // Every card answers a tap, and nothing marks which taps are right: a
      // pair across the trays is kept, a second card from the same tray is
      // refused (and the taps clear), and a paired card is unpaired. The tap
      // that leaves no pair to make is the claim.
      if (paired.has(g.id)) return cardHtml(g, look, {attrs: uiAttrs({unpair: g.id}, `sh-good-${g.id}`), say: '. Paired'});
      if (pick && pick !== g.id) {
        if (b.at[pick] === b.at[g.id]) return cardHtml(g, look, {attrs: uiAttrs({pair: g.id, wrong: true}, `sh-good-${g.id}`), say: `. Pair with ${pick}`});
        const pairs = [...state.pairs, [pick, g.id]];
        if (acrossLeft(q, b.at, pairs)) return cardHtml(g, look, {attrs: moveAttrs({type: 'cant', pairs}, 'sh-board'), say: `. Pair with ${pick}`});
        return cardHtml(g, look, {attrs: uiAttrs({pair: g.id}, `sh-good-${g.id}`), say: `. Pair with ${pick}`});
      }
      return cardHtml(g, look, {attrs: uiAttrs({pair: g.id}, `sh-good-${g.id}`), say: pick === g.id ? '. Chosen' : '', pressed: pick === g.id});
    }
    if (cutting) return g.half ? cardHtml(g, look, null) : cardHtml(g, `${look} cuttable`, {attrs: moveAttrs({type: 'halve', good: g.id}, `sh-good-${g.id}a`), say: '. Cut it in half'});
    // While a card is lifted, the others rest and the trays take it.
    if (pick && pick !== g.id) return cardHtml(g, look, null);
    return cardHtml(g, look, {attrs: uiAttrs({pick: g.id}, `sh-good-${g.id}`), say: pick === g.id ? '. Lifted' : '', pressed: pick === g.id});
  };
  const zone = (owner, inner, cls, label) => {
    const hinted = act?.type === 'put' && act.to === owner ? ' hinted' : '';
    const drop = !done && pick && !claiming && !cutting && b.at[pick] !== owner;
    const tag = drop ? 'button' : 'div';
    const attrs = drop ? `type="button" ${moveAttrs({type: 'put', good: pick, to: owner}, `sh-good-${pick}`)} aria-label="${esc(`Put ${pick} ${trayWords(q, owner)}`)}"` : `role="group" aria-label="${esc(label)}"`;
    return `<${tag} class="${cls}${drop ? ' drop' : ''}${hinted}" data-sh-zone="${owner ?? ''}" ${attrs}>${inner}</${tag}>`;
  };
  const sidesHtml = q.people.map(person => {
    const mine = goods.filter(g => b.at[g.id] === person.id);
    return `<section class="sh-side">${taste(person.id, person.likes, ['red', 'blue'].filter(c => q.goods.some(g => g.colour === c)))}${zone(person.id, mine.map(card).join('') || '<span class="sh-empty" aria-hidden="true"></span>', 'sh-tray', `${person.id}’s tray`)}</section>`;
  }).join('');
  const table = goods.filter(g => b.at[g.id] === null);
  const tableHtml = done ? '' : zone(null, table.map(card).join(''), `sh-table${table.length ? '' : ' empty'}`, 'Table');
  let bar = '';
  if (!done) {
    const buttons = [];
    if (q.mode === 'every') {
      buttons.push(claimButton('Keep', {type: 'keep'}, full && !b.shelf.includes(keyOf(goods, b.at)), act?.type === 'keep', 'sh-keep'));
      buttons.push(claimButton('That’s all', {type: 'all'}, !b.told, act?.type === 'all', 'sh-all'));
    } else buttons.push(claimButton('Fair', {type: 'fair'}, full && b.told?.kind !== 'swap' && !claiming && !cutting, act?.type === 'fair', 'sh-fair'));
    if (q.mode === 'halve' && !b.claim) {
      // With one tray empty there is no pair to make, so Can't is the claim.
      const open = full && b.told?.kind !== 'over', hinted = act?.type === 'cant' && !claiming;
      buttons.push(full && !maximalPairs(q, b.at).length ? claimButton('Can’t', {type: 'cant', pairs: []}, open, hinted, 'sh-cant') : toggleButton('Can’t', {claiming: !claiming}, claiming, hinted, 'sh-cant', open));
    }
    if (q.mode === 'halve' && b.claim && cut === null) buttons.push(toggleButton('Cut', {tool: cutting ? null : 'cut'}, cutting, act?.type === 'halve' && !cutting, 'sh-cut'));
    bar = `<div class="sh-bar">${buttons.join('')}</div>`;
  }
  const told = b.told?.kind;
  const said = told === 'swap' ? `${listWords(b.told.who)} would swap.`
    : told === 'unfair' ? 'Somebody would swap in one.'
    : told === 'more' ? 'There is another.'
    : told === 'over' ? (b.told.n ? `${b.told.n} left over.` : 'They pair up.')
    : (claiming && state.said) || (standing ? (b.claim.left.length === 1 ? 'One left over.' : `${b.claim.left.length} left over.`) : '');
  // The shelf: each kept way, unjudged; tap one to take it back.
  const found = q.mode === 'every' && b.shelf.length && !done ? `<ol class="sh-found" aria-label="Kept">${b.shelf.map(k => thumb(q, goods, k, act?.type === 'drop' && act.key === k)).join('')}</ol>` : '';
  const cert = q.mode === 'every' && done ? catalog(q) : '';
  const words = `${q.people.map(person => `${person.id} has ${goods.filter(g => b.at[g.id] === person.id).map(goodName).join(', ') || 'nothing'}`).join('. ')}. ${table.length ? `On the table: ${table.map(goodName).join(', ')}.` : ''}${said ? ` ${said}` : ''}${pick ? ` ${pick} is lifted.` : ''}`;
  return `<div class="sh-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="shares"><div class="sh-sides">${sidesHtml}</div>${tableHtml}${bar}${note(said)}${found}${cert}${status(words)}</div>`;
}

// Shapes for the favourites.
const SHAPE_SVG = {
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  triangle: '<polygon points="12,3 21.5,20 2.5,20"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="1.5"/>',
  diamond: '<polygon points="12,2 22,12 12,22 2,12"/>',
  star: '<polygon points="12,2 14.6,8.6 21.5,9.2 16.2,13.8 17.9,20.6 12,16.9 6.1,20.6 7.8,13.8 2.5,9.2 9.4,8.6"/>'
};
const shapeSvg = id => `<svg class="sh-shape s-${id}" viewBox="0 0 24 24" aria-hidden="true">${SHAPE_SVG[id]}</svg>`;
function renderFav(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  settle(state, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const claiming = !done && state.claiming, pick = state.pick;
  // The people being tapped, else the group last checked.
  const shownGroup = claiming && state.chosen.length ? null : b.group || b.told?.group;
  const group = shownGroup || (claiming ? state.chosen : []);
  const ringed = shownGroup ? likedBy(q, shownGroup) : [];
  const item = (id, where) => {
    const hinted = act?.type === 'give' && act.item === id ? ' hinted' : '';
    const look = `sh-item${pick === id ? ' picked' : ''}${hinted}${ringed.includes(id) ? ' ringed' : ''}${done && b.at[id] && personOf(q, b.at[id]).likes.includes(id) && !b.group ? ' happy' : ''}`;
    if (done || claiming || (pick && pick !== id)) return `<span class="${look}" data-sh-good="${id}" role="img" aria-label="${esc(id)}">${shapeSvg(id)}</span>`;
    return `<button type="button" class="${look}" ${uiAttrs({pick: id}, `sh-item-${id}`)} data-sh-good="${id}" aria-pressed="${pick === id}" aria-label="${esc(`${id}${where ? `, ${where}` : ''}`)}">${shapeSvg(id)}</button>`;
  };
  const pile = q.items.filter(i => b.at[i.id] === null).map(i => item(i.id, 'not given'));
  const giving = !done && !claiming && pick;
  // Solved by a group, the pile stays so its ringed shapes show.
  const pileHtml = done && !b.group ? '' : giving && b.at[pick] !== null
    ? `<button type="button" class="sh-pile drop${act?.type === 'give' && act.to === null ? ' hinted' : ''}" data-sh-zone="" ${moveAttrs({type: 'give', item: pick, to: null}, `sh-item-${pick}`)} aria-label="Put the ${esc(pick)} back">${pile.join('')}</button>`
    : `<div class="sh-pile${pile.length ? '' : ' empty'}" data-sh-zone="" role="group" aria-label="Not given">${pile.join('')}</div>`;
  const rows = q.people.map(person => {
    const held = holding(q, b.at, person.id), inGroup = group.includes(person.id);
    const hinted = (act?.type === 'give' && act.to === person.id) || (act?.type === 'cant' && act.group.includes(person.id)) ? ' hinted' : '';
    const favs = `<span class="sh-favs" aria-hidden="true">${person.likes.map(shapeSvg).join('')}</span>`;
    const slot = `<span class="sh-slot${held ? '' : ' empty'}">${held ? item(held, `with ${person.id}`) : ''}</span>`;
    const cls = `sh-person${inGroup ? ' grouped' : ''}${hinted}`;
    const label = `${person.id} likes the ${listWords(person.likes)}${held ? `, holds the ${held}` : ''}`;
    let attrs = `role="group" aria-label="${esc(label)}"`, tag = 'div';
    if (claiming) { tag = 'button'; attrs = `type="button" ${uiAttrs({choose: person.id}, `sh-person-${person.id}`)} aria-pressed="${inGroup}" aria-label="${esc(label)}"`; }
    else if (giving && held !== pick) { tag = 'button'; attrs = `type="button" ${moveAttrs({type: 'give', item: pick, to: person.id}, `sh-item-${pick}`)} aria-label="${esc(`Give the ${pick} to ${person.id}. ${label}`)}"`; }
    return `<li><${tag} class="${cls}${tag === 'button' ? ' drop' : ''}" data-sh-zone="${person.id}" ${attrs}>${token(person.id)}${favs}${slot}</${tag}></li>`;
  }).join('');
  let bar = '';
  if (!done) {
    const cant = toggleButton('Can’t', {claiming: !claiming}, claiming, act?.type === 'cant' && !claiming, 'sh-cant', b.tried && !b.told);
    const check = claiming ? claimButton('Check', {type: 'cant', group: [...state.chosen].sort((x, y) => q.people.findIndex(p => p.id === x) - q.people.findIndex(p => p.id === y))}, state.chosen.length >= 2, act?.type === 'cant' && claiming, 'sh-check') : '';
    bar = `<div class="sh-bar">${cant}${check}</div>`;
  }
  const g = shownGroup;
  const said = g ? `${g.length} people, ${likedBy(q, g).length} ${likedBy(q, g).length === 1 ? 'shape' : 'shapes'}.` : '';
  const words = `${q.people.map(person => `${person.id} ${holding(q, b.at, person.id) ? `holds the ${holding(q, b.at, person.id)}` : 'holds nothing'}`).join('. ')}.${said ? ` ${said}` : ''}`;
  return `<div class="sh-puzzle mode-favourites${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="shares">${pileHtml}<ul class="sh-folk">${rows}</ul>${bar}${note(said)}${status(words)}</div>`;
}

function stripHtml(q, opts) {
  const n = q.strip.length, cells = [...q.strip].map(c => `<span class="sh-cell ${colourOf(c)}"></span>`);
  if (opts.split) {
    const [l, r] = [cells.slice(0, opts.split).join(''), cells.slice(opts.split).join('')];
    const piece = (side, inner, k) => {
      const tag = opts.take ? 'button' : 'div';
      const attrs = opts.take ? `type="button" ${moveAttrs({type: 'take', side}, `sh-take-${side}`)} aria-label="${esc(`Take the ${side} piece`)}"` : `aria-hidden="true"`;
      return `<${tag} class="sh-piece${opts.hinted === side ? ' hinted' : ''}${opts.mine === side ? ' mine' : ''}" style="flex:${k}" ${attrs}>${inner}${opts.them === side ? onPiece() : ''}</${tag}>`;
    };
    return `<div class="sh-pieces" style="--n:${n}">${piece('left', l, opts.split)}${piece('right', r, n - opts.split)}</div>`;
  }
  const gaps = Array.from({length: n - 1}, (_, i) => i + 1).map(k => `<button type="button" class="sh-gap${opts.knife === k ? ' on' : ''}${opts.hinted === k ? ' hinted' : ''}" style="left:${(k / n * 100).toFixed(3)}%" ${uiAttrs({knife: k}, `sh-gap-${k}`)} aria-pressed="${opts.knife === k}" aria-label="Knife after ${squares(k)}"></button>`).join('');
  const knife = opts.knife ? `<i class="sh-knife${opts.cut ? ' cut' : ''}" style="left:${(opts.knife / n * 100).toFixed(3)}%" aria-hidden="true"></i>` : '';
  const took = opts.them ? onPiece(((opts.them === 'left' ? opts.knife : opts.knife + n) / 2 / n * 100).toFixed(3)) : '';
  return `<div class="sh-strip" data-sh-strip="${n}" style="--n:${n}">${cells.join('')}${gaps}${knife}${took}</div>`;
}
// B's token sits on the piece B took. Under the pieces only the child's own
// piece is counted, by the child's values: no number of B's is ever shown,
// and no number stands beside B's token.
const onPiece = (left = null) => `<b class="sh-tok sh-on"${left === null ? '' : ` style="left:${left}%"`} aria-hidden="true">B</b>`;
function underHtml(q, at, mineSide, star, flush = false) {
  const [l, r] = sides(q, at, q.you);
  const n = q.strip.length;
  const cell = (side, v, k) => `<div class="sh-under-piece" style="flex:${k}">${side === mineSide ? `${token('You', ' you')}<b class="sh-worth" aria-label="Worth ${v} to you">${v}</b>${star ? '<span class="sh-star" role="img" aria-label="Half for sure">★</span>' : ''}` : ''}</div>`;
  return `<div class="sh-under${flush ? ' flush' : ''}" style="--n:${n}">${cell('left', l, at)}${cell('right', r, n - at)}</div>`;
}
function renderDuel(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const round1 = !b.r1?.star, knife = round1 && !done ? state.knife : null;
  const tastes = `<div class="sh-tastes">${taste('You', q.you)}${taste('B', q.them, undefined, round1 && !b.r1)}</div>`;
  let body = '', said = '', goal = '';
  if (round1) {
    goal = 'Cut so you get half, whichever piece B takes.';
    // The last cut stays drawn on the strip, with who took which piece and
    // the child's own count of each, until the knife is placed again.
    const showCut = b.r1 && knife === null;
    const them = showCut ? theyTake(q, b.r1.at) : null;
    body = stripHtml(q, {knife: showCut ? b.r1.at : knife, cut: showCut, them, hinted: act?.type === 'cut' ? act.at : null});
    if (showCut) {
      body += underHtml(q, b.r1.at, them === 'left' ? 'right' : 'left', false, true);
      said = 'Not equal for you.';
    }
    body += `<div class="sh-bar">${claimButton('Cut', {type: 'cut', at: knife ?? 0}, knife !== null && knife !== b.r1?.at, act?.type === 'cut' && knife === act.at, 'sh-cutnow')}</div>`;
  } else {
    const them1 = theyTake(q, b.r1.at), mine1 = them1 === 'left' ? 'right' : 'left';
    const first = `<div class="sh-round done">${stripHtml(q, {split: b.r1.at, mine: mine1, them: them1})}${underHtml(q, b.r1.at, mine1, true)}</div>`;
    const cutB = theirCut(q);
    goal = b.r2 ? '' : 'Take a piece.';
    const mine2 = b.r2?.side ?? null, them2 = mine2 && (mine2 === 'left' ? 'right' : 'left');
    const second = `<div class="sh-round">${stripHtml(q, {split: cutB, take: !b.r2, mine: mine2, them: them2, hinted: act?.type === 'take' ? act.side : null})}${b.r2 ? underHtml(q, cutB, mine2, b.r2.star) : ''}</div>`;
    body = first + second;
    // A take is final: a take without a star leaves only Again.
    if (b.r2 && !b.r2.star) {
      said = 'The other piece is more for you.';
      body += `<div class="sh-bar">${claimButton('Again', {type: 'again'}, true, act?.type === 'again', 'sh-again')}</div>`;
    }
  }
  const words = round1 ? (b.r1 && knife === null ? `You cut after ${squares(b.r1.at)}. B takes the ${theyTake(q, b.r1.at)} piece. ${said}` : knife ? `Knife after ${squares(knife)}.` : 'No cut yet.') : `Your cut after ${squares(b.r1.at)} was equal for you. B cuts after ${squares(theirCut(q))}.${b.r2 ? ` You take the ${b.r2.side} piece.` : ''}${said ? ` ${said}` : ''}`;
  return `<div class="sh-puzzle mode-duel${done ? ' solved' : ''}" data-mechanic-wire="shares">${goal ? `<p class="sh-goal">${esc(goal)}</p>` : ''}${tastes}${body}${note(said)}${status(words)}</div>`;
}

function render(p, a) {
  const q = p.parameters;
  if (onScreen !== p.id) { uiState.clear(); onScreen = p.id; }
  if (two(q)) return renderShare(p, a);
  return q.mode === 'favourites' ? renderFav(p, a) : renderDuel(p, a);
}

// --- Gestures ---------------------------------------------------------------------
// Drag a card or item onto a tray, a person or the table. A drag that ends
// where it started is a tap. The duel's knife follows the finger along the
// strip and rests on the nearest join between squares.
// Each gesture commits after the browser's own click for it has gone by, so
// that click is swallowed here rather than landing on a redrawn board.
function wire(root, p, api) {
  const q = p.parameters;
  let drag = null, dragged = false;
  const later = fn => setTimeout(() => { dragged = false; fn(); }, 0);
  if (q.mode === 'duel') {
    const strip = root.querySelector('[data-sh-strip]');
    if (!strip) return;
    const n = Number(strip.dataset.shStrip);
    const at = e => { const r = strip.getBoundingClientRect(); return Math.min(n - 1, Math.max(1, Math.round((e.clientX - r.left) / r.width * n))); };
    const show = k => {
      let knife = strip.querySelector('.sh-knife');
      if (!knife) { knife = document.createElement('i'); knife.className = 'sh-knife'; knife.setAttribute('aria-hidden', 'true'); strip.append(knife); }
      knife.style.left = `${(k / n * 100).toFixed(3)}%`;
    };
    // A pointer click inside the strip is the knife's; Enter on a join
    // (a click with no pointer) goes through to the app as usual.
    root.addEventListener('click', e => { if (e.detail > 0 && strip.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);
    let live = null;
    strip.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      live = {id: e.pointerId, k: at(e)};
      strip.setPointerCapture?.(e.pointerId);
      show(live.k);
    });
    strip.addEventListener('pointermove', e => { if (live && e.pointerId === live.id) { live.k = at(e); show(live.k); } });
    const end = e => {
      if (!live || e.pointerId !== live.id) return;
      const k = e.type === 'pointerup' ? at(e) : live.k;
      live = null;
      later(() => api.ui({knife: k}));
    };
    strip.addEventListener('pointerup', end);
    strip.addEventListener('pointercancel', end);
    return;
  }
  const board = root.matches('.sh-puzzle') ? root : root.querySelector('.sh-puzzle');
  if (!board || board.classList.contains('claiming')) return;
  root.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('button[data-sh-good][data-action="mechanic-ui"]');
    if (!el || e.button > 0) return;
    let payload = {};
    try { payload = JSON.parse(el.dataset.ui || '{}'); } catch { return; }
    if (!payload.pick) return;
    drag = {el, id: e.pointerId, x: e.clientX, y: e.clientY, good: payload.pick, moved: false};
  });
  const zoneAt = e => { const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sh-zone]'); return z && board.contains(z) ? z : null; };
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) { drag.moved = true; drag.el.classList.add('dragging'); }
    drag.el.style.transform = `translate(${dx}px,${dy}px)`;
    board.querySelectorAll('.sh-over').forEach(z => z.classList.remove('sh-over'));
    zoneAt(e)?.classList.add('sh-over');
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    // Find the zone while the lifted card still lets the pointer through.
    const zone = e.type === 'pointerup' ? zoneAt(e) : null;
    d.el.classList.remove('dragging');
    d.el.style.transform = '';
    board.querySelectorAll('.sh-over').forEach(z => z.classList.remove('sh-over'));
    dragged = true;
    later(() => {
      if (!zone) return;
      // A card dropped back where it was is no move.
      const to = zone.dataset.shZone || null;
      if (api.attempt().board.at[d.good] === to) return;
      api.apply(q.mode === 'favourites' ? {type: 'give', item: d.good, to} : {type: 'put', good: d.good, to});
    });
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
  // Arrow keys on a card: left and right trays, down to the table.
  if (two(q)) board.addEventListener('keydown', e => {
    const el = e.target.closest?.('button[data-sh-good][data-action="mechanic-ui"]');
    if (!el || !['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const to = e.key === 'ArrowLeft' ? q.people[0].id : e.key === 'ArrowRight' ? q.people[1].id : null;
    const good = el.dataset.shGood, b = api.attempt().board;
    if (b.at[good] === to) return;
    e.preventDefault();
    api.apply({type: 'put', good, to});
  });
}

function uiHook(p, payload) {
  if (!object(payload)) return;
  const s = ui(p), q = p.parameters;
  if (Object.hasOwn(payload, 'pick')) s.pick = s.pick === payload.pick ? null : payload.pick;
  if (typeof payload.claiming === 'boolean') Object.assign(s, {claiming: payload.claiming, chosen: [], pairs: [], pick: null});
  if (typeof payload.choose === 'string') s.chosen = s.chosen.includes(payload.choose) ? s.chosen.filter(x => x !== payload.choose) : [...s.chosen, payload.choose];
  s.said = null;
  if (typeof payload.pair === 'string') {
    if (payload.wrong === true) Object.assign(s, {pick: null, pairs: [], said: 'One from each tray.'});
    else if (s.pick === payload.pair) s.pick = null;
    else if (s.pick) { s.pairs = [...s.pairs, [s.pick, payload.pair]]; s.pick = null; }
    else s.pick = payload.pair;
  }
  if (typeof payload.unpair === 'string') s.pairs = s.pairs.filter(pair => !pair.includes(payload.unpair));
  if (Object.hasOwn(payload, 'tool')) s.tool = payload.tool === 'cut' ? 'cut' : null;
  if (Object.hasOwn(payload, 'knife') && q.mode === 'duel') s.knife = int(payload.knife) && payload.knife > 0 && payload.knife < q.strip.length ? payload.knife : null;
}

export const shareMechanics = {
  shares: {
    fresh, valid, solved, move, hint, render, wire,
    ui: uiHook,
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves, not claims: a refused That's all stands until
    // the shelf changes, a Can't that has been shown stays shown, a refused
    // Can't or group stands until a card or shape moves, and a take is final.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      // A refused That's all stands until the shelf changes.
      if (q.mode === 'every' && from.told && !to.told && same(from.shelf, to.shelf)) return {...to, told: from.told};
      if (q.mode === 'halve') {
        if (from.claim && !to.claim) return {...to, claim: from.claim, told: to.told?.kind === 'over' ? null : to.told};
        // A refused Can't stands while the cards stay, over a refused Fair's
        // line on the same cards too (that Fair is not a lock).
        if (from.told?.kind === 'over' && !to.claim && same(from.at, to.at)) return {...to, told: from.told};
      }
      // A refused group stands until a shape moves.
      if (q.mode === 'favourites' && from.told && !to.told && !to.group && same(from.at, to.at)) return {...to, told: from.told, tried: true};
      // A take without a star is final.
      if (q.mode === 'duel' && from.r2 && !from.r2.star && !to.r2 && same(from.r1, to.r1)) return {...to, r2: from.r2};
      return to;
    }
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'shares',
  family: {id: 'shares', symbol: '÷'},
  mechanics: shareMechanics,
  pack: new URL('./shares.json', import.meta.url).href,
  css: new URL('./shares.css', import.meta.url).href,
  focus: '.sh-puzzle .sh-card:is(button),.sh-puzzle .sh-item:is(button),.sh-puzzle button.sh-person,.sh-puzzle .sh-gap,.sh-puzzle button.sh-piece,.sh-puzzle .sh-again'
};
