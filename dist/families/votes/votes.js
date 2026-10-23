// Voting and agendas (worksheet Week 87). Each voter ranks the letters on a
// card; in a pair vote each voter picks whichever of the two letters is higher
// on their card, and more votes wins (every puzzle has an odd number of
// voters, so there are no ties). A knockout runs a first pair, then the winner
// meets each waiting letter in turn.
//
// A letter can win some knockout exactly when it lies in the top cycle, the
// smallest group of letters that beats every letter outside it. A group that
// leaves the target out is the certificate for Can't: once one of its letters
// plays, every later winner is one of them. On a line, where voters pick the
// nearer spot, the middle favourite beats every other spot.
//
// Four modes:
//   agenda      tap letters into a knockout so the ringed letter wins, or
//               Can't with a group that beats everything outside it;
//   cards       write the blank cards so a letter always wins, or the waiting
//               letter always wins; Can't with most cards that put one letter
//               above the goal letter;
//   line        move the fewest favourites so a spot wins (Vote judges), or
//               add a voter; Can't with most voters on one side of the spot;
//   playground  write three or five cards and run knockouts on them.
import {esc} from '../../expansion-controls.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keysAre = (o, keys) => object(o) && Object.keys(o).sort().join() === [...keys].sort().join();
const int = v => Number.isInteger(v);
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const memo = (cache, key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
export const MODES = ['agenda', 'cards', 'line', 'playground'];
export const TICKS = 10, MAX_SHUT = 64;

// --- Cards and pair votes ------------------------------------------------------
// A card is a string of letters, favourite first.
export const prefers = (card, x, y) => card.indexOf(x) < card.indexOf(y);
export const votesFor = (cards, x, y) => cards.filter(c => prefers(c, x, y)).length;
export const beats = (cards, x, y) => votesFor(cards, x, y) * 2 > cards.length;
// The rounds of a knockout in this order: the survivor meets the next letter.
export function knockout(cards, order) {
  const rounds = [];
  let w = order[0] ?? null;
  for (const x of order.slice(1)) {
    const va = votesFor(cards, w, x), vb = votesFor(cards, x, w), win = va > vb ? w : x;
    rounds.push({a: w, b: x, va, vb, win});
    w = win;
  }
  return {rounds, winner: order.length ? w : null};
}
const permCache = new Map();
export const perms = s => memo(permCache, s, () => s.length <= 1 ? [s] : [...s].flatMap((c, i) => perms(s.slice(0, i) + s.slice(i + 1)).map(r => c + r)));
// Every full order that starts with the letters already played.
export const completions = (letters, prefix) => perms([...letters].filter(x => !prefix.includes(x)).join('')).map(r => prefix + r);
const winCache = new Map();
export const winsFrom = (cards, letters, prefix, target) => memo(winCache, `${cards}|${letters}|${prefix}|${target}`, () => completions(letters, prefix).filter(o => knockout(cards, o).winner === target));
export const outside = (letters, group) => [...letters].filter(x => !group.includes(x));
// The first letter outside the group that beats a letter in it, as 'xy' (x
// beats y), or null when the group beats everything outside it.
export function breaks(cards, letters, group) {
  for (const y of group) for (const x of outside(letters, group)) if (!beats(cards, y, x)) return x + y;
  return null;
}
export const dominant = (cards, letters, group) => group.length > 0 && group.length < letters.length && breaks(cards, letters, group) === null;
// Groups are written in the letters' order.
export const groupOf = (letters, chosen) => [...letters].filter(x => chosen.includes(x)).join('');
const isGroup = (letters, g) => typeof g === 'string' && g.length > 0 && g === groupOf(letters, [...g]) && new Set(g).size === g.length;
const topCache = new Map();
// The smallest group that beats every letter outside it (the top cycle).
export function topCycle(cards, letters) {
  return memo(topCache, `${cards}|${letters}`, () => {
    let best = letters;
    for (let m = 1; m < (1 << letters.length) - 1; m++) {
      const g = [...letters].filter((_, i) => m >> i & 1).join('');
      if (g.length < best.length && dominant(cards, letters, g)) best = g;
    }
    return best;
  });
}
// Why a group does not prove that the target can't win: 'target' when it
// holds the target, 'xy' when x outside beats y inside, or null when it does.
export const groupRefusal = (q, g) => g.includes(q.target) ? 'target' : breaks(q.cards, q.letters, g);

// --- Blank cards -------------------------------------------------------------
// q.cards lists every card in display order; '' is a blank card the child
// writes, top (favourite) first. b.fill holds the blank cards' letters.
export const blanksOf = q => q.cards.flatMap((c, i) => c === '' ? [i] : []);
export const cardsNow = (q, fill) => { const blanks = blanksOf(q); return q.cards.map((c, i) => c === '' ? fill[blanks.indexOf(i)] : c); };
const fullCards = (letters, cards) => cards.every(c => c.length === letters.length);
// Every agenda once: a first pair (in letter order) and the letters after it.
const agendaCache = new Map();
export const agendas = letters => memo(agendaCache, letters, () => perms(letters).filter(o => letters.indexOf(o[0]) < letters.indexOf(o[1])));
// The first agenda the cards fail, or null when they meet the goal: 'always'
// (goal.letter wins every agenda) or 'waiting' (with three letters, the
// letter that waits wins).
export function failing(letters, cards, goal) {
  for (const o of agendas(letters)) {
    const w = knockout(cards, o).winner;
    if (goal.kind === 'always' ? w !== goal.letter : w !== o[2]) return {order: o, winner: w};
  }
  return null;
}
// Why some cards do not prove that goal.letter can't always win: 'blank'
// when one is blank, 'few' when they are not most of the cards, 'none' when no
// letter is above the goal letter on all of them; null when they do.
export function cardsRefusal(q, chosen) {
  if (chosen.some(i => q.cards[i] === '')) return 'blank';
  if (chosen.length * 2 <= q.cards.length) return 'few';
  return overLetter(q, chosen) ? null : 'none';
}
export const overLetter = (q, chosen) => [...q.letters].find(y => y !== q.goal.letter && chosen.every(i => prefers(q.cards[i], y, q.goal.letter))) ?? null;
const isIndexList = (list, n) => Array.isArray(list) && list.length > 0 && list.every((i, k) => int(i) && i >= 0 && i < n && (k === 0 || list[k - 1] < i));
const writable = (letters, s) => typeof s === 'string' && s.length <= letters.length && [...s].every(x => letters.includes(x)) && new Set(s).size === s.length;
// Every way to finish the blank cards from what is written that meets the goal.
export function finishes(q, fill) {
  const blanks = blanksOf(q), out = [], ps = perms(q.letters);
  (function grow(k, done) {
    if (k === blanks.length) { const cards = cardsNow(q, done); if (!failing(q.letters, cards, q.goal)) out.push(done); return; }
    for (const c of ps) if (c.startsWith(fill[k])) grow(k + 1, [...done, c]);
  })(0, []);
  return out;
}

// --- The line -----------------------------------------------------------------
// Favourites are whole spots 0 to TICKS. A voter picks the nearer of two spots;
// equal distances are no vote. A spot wins when it beats every other spot.
export function pairOnLine(at, x, y) {
  let a = 0, b = 0;
  for (const v of at) { const dx = Math.abs(v - x), dy = Math.abs(v - y); if (dx < dy) a++; else if (dy < dx) b++; }
  return [a, b];
}
export function lineWinner(at) {
  for (let x = 0; x <= TICKS; x++) {
    let ok = true;
    for (let y = 0; y <= TICKS && ok; y++) if (y !== x) { const [a, b] = pairOnLine(at, x, y); ok = a > b; }
    if (ok) return x;
  }
  return null;
}
export const movedOf = (q, at) => q.start.filter((x, i) => at[i] !== x).length;
const placedAll = at => at.every(x => x !== null);
// Why some voters do not prove that the goal can't win once a voter is added:
// 'few' when they are not most of all the voters, 'side' when they are not all
// on one side of the goal; null when they prove it.
export function votersRefusal(q, chosen) {
  if (chosen.length * 2 <= q.start.length + 1) return 'few';
  const left = chosen.every(i => q.start[i] < q.goal), right = chosen.every(i => q.start[i] > q.goal);
  return left || right ? null : 'side';
}
// Line ends a fifth voter can give the goal: the spots x with that winner.
export const addSpots = q => Array.from({length: TICKS + 1}, (_, x) => x).filter(x => lineWinner([...q.start, x]) === q.goal);
// The fewest favourites to move so that the goal wins: every way to move at
// most k voters, smallest k first. Returns {least, ends} where ends lists
// every winning arrangement with that many moved.
const lineCache = new Map();
export function fewest(q) {
  return memo(lineCache, JSON.stringify([q.start, q.goal]), () => {
    const n = q.start.length;
    for (let k = 0; k <= n; k++) {
      const ends = [];
      (function grow(i, left, at) {
        if (i === n) { if (left === 0 && lineWinner(at) === q.goal) ends.push(at); return; }
        grow(i + 1, left, [...at, q.start[i]]);
        if (left > 0) for (let x = 0; x <= TICKS; x++) if (x !== q.start[i]) grow(i + 1, left - 1, [...at, x]);
      })(0, k, []);
      if (ends.length) return {least: k, ends};
    }
    return {least: null, ends: []};
  });
}

// --- Boards ---------------------------------------------------------------------
// agenda:     {order, told, shut, claim}
// cards:      {fill, told, shut, claim, done}
// line:       {at, told, shut, claim, done}
// playground: {size, fill, order}
// order: the letters played into the knockout, in order. shut: the refused
// Can't certificates (groups, card lists or voter lists), kept through Undo.
// told: the line a refusal leaves: {group, why} (agenda), {kind: 'fail'}
// after a refused Vote on the cards, {kind: 'cards', cards, why},
// {kind: 'vote', winner} or {kind: 'more'} after a refused Vote on the line,
// {kind: 'voters', voters, why}. claim: an accepted Can't certificate.
const isPlay = p => p.parameters.mode === 'playground';
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'agenda') return {order: '', told: null, shut: [], claim: null};
  if (q.mode === 'cards') return {fill: blanksOf(q).map(() => ''), told: null, shut: [], claim: null, done: false};
  if (q.mode === 'line') return {at: q.add ? [...q.start, null] : [...q.start], told: null, shut: [], claim: null, done: false};
  return {size: q.sizes[0], fill: Array(q.sizes[0]).fill(''), order: ''};
}
const keyList = list => list.join(',');
const validOrder = (letters, order) => typeof order === 'string' && order.length <= letters.length && [...order].every(x => letters.includes(x)) && new Set(order).size === order.length;
function validShut(list, ok) {
  if (!Array.isArray(list) || list.length > MAX_SHUT) return false;
  const keys = list.map(x => typeof x === 'string' ? x : Array.isArray(x) ? keyList(x) : null);
  return keys.every(k => k !== null) && new Set(keys).size === keys.length && list.every(ok);
}
const shutHas = (list, item) => list.some(x => (typeof x === 'string' ? x : keyList(x)) === (typeof item === 'string' ? item : keyList(item)));
function valid(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') {
    if (!keysAre(b, ['fill', 'order', 'size']) || !q.sizes.includes(b.size) || !Array.isArray(b.fill) || b.fill.length !== b.size || !b.fill.every(s => writable(q.letters, s))) return false;
    return validOrder(q.letters, b.order) && (b.order === '' || fullCards(q.letters, b.fill));
  }
  if (q.mode === 'agenda') {
    if (!keysAre(b, ['claim', 'order', 'shut', 'told']) || !validOrder(q.letters, b.order)) return false;
    if (!validShut(b.shut, g => isGroup(q.letters, g) && groupRefusal(q, g) !== null)) return false;
    if (b.told !== null && !(keysAre(b.told, ['group', 'why']) && isGroup(q.letters, b.told.group) && shutHas(b.shut, b.told.group) && groupRefusal(q, b.told.group) === b.told.why)) return false;
    if (b.claim !== null && !(isGroup(q.letters, b.claim) && groupRefusal(q, b.claim) === null && b.told === null)) return false;
    return true;
  }
  if (q.mode === 'cards') {
    const blanks = blanksOf(q);
    if (!keysAre(b, ['claim', 'done', 'fill', 'shut', 'told']) || typeof b.done !== 'boolean' || !Array.isArray(b.fill) || b.fill.length !== blanks.length || !b.fill.every(s => writable(q.letters, s))) return false;
    const cards = cardsNow(q, b.fill), full = fullCards(q.letters, cards);
    const okList = list => isIndexList(list, q.cards.length) && cardsRefusal(q, list) !== null;
    if (!validShut(b.shut, list => q.cant && okList(list))) return false;
    const t = b.told;
    if (t !== null) {
      if (keysAre(t, ['kind']) && t.kind === 'fail') { if (!full || !failing(q.letters, cards, q.goal)) return false; }
      else if (keysAre(t, ['cards', 'kind', 'why']) && t.kind === 'cards') { if (!q.cant || !okList(t.cards) || !shutHas(b.shut, t.cards) || cardsRefusal(q, t.cards) !== t.why) return false; }
      else return false;
    }
    if (b.claim !== null && !(q.cant && isIndexList(b.claim, q.cards.length) && cardsRefusal(q, b.claim) === null && t === null && !b.done)) return false;
    if (b.done && !(full && !failing(q.letters, cards, q.goal) && t === null)) return false;
    return true;
  }
  // The line.
  const n = q.start.length;
  if (!keysAre(b, ['at', 'claim', 'done', 'shut', 'told']) || typeof b.done !== 'boolean' || !Array.isArray(b.at) || b.at.length !== n + (q.add ? 1 : 0)) return false;
  if (!b.at.every((x, i) => (x === null && q.add && i === n) || (int(x) && x >= 0 && x <= TICKS))) return false;
  if (q.add && !q.start.every((x, i) => b.at[i] === x)) return false;
  const okList = list => isIndexList(list, n) && votersRefusal(q, list) !== null;
  if (!validShut(b.shut, list => Boolean(q.add) && okList(list))) return false;
  const placed = placedAll(b.at), w = placed ? lineWinner(b.at) : null, within = q.add || movedOf(q, b.at) <= q.budget;
  const t = b.told;
  if (t !== null) {
    if (keysAre(t, ['kind', 'winner']) && t.kind === 'vote') { if (!placed || t.winner !== w || w === q.goal) return false; }
    else if (keysAre(t, ['kind']) && t.kind === 'more') { if (q.add || !placed || w !== q.goal || within) return false; }
    else if (keysAre(t, ['kind', 'voters', 'why']) && t.kind === 'voters') { if (!q.add || !okList(t.voters) || !shutHas(b.shut, t.voters) || votersRefusal(q, t.voters) !== t.why) return false; }
    else return false;
  }
  if (b.claim !== null && !(q.add && isIndexList(b.claim, n) && votersRefusal(q, b.claim) === null && t === null && !b.done)) return false;
  if (b.done && !(placed && w === q.goal && within && t === null)) return false;
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'agenda') return b.claim !== null || (b.order.length === q.letters.length && knockout(q.cards, b.order).winner === q.target);
  return b.done || b.claim !== null;
}
// Moves that write on a card: a letter goes in the next space down; tapping a
// written letter takes it off and the letters below move up.
function writeMove(q, fill, action, k) {
  if (!keysAre(action, ['card', 'letter', 'type']) || typeof action.letter !== 'string' || !q.letters.includes(action.letter) || action.letter.length !== 1) return null;
  const s = fill[k];
  if (action.type === 'write') return s.includes(action.letter) || s.length >= q.letters.length ? null : fill.map((x, j) => j === k ? x + action.letter : x);
  if (action.type === 'erase') return s.includes(action.letter) ? fill.map((x, j) => j === k ? x.replace(action.letter, '') : x) : null;
  return null;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'playground') {
    if (action.type === 'size') return keysAre(action, ['size', 'type']) && q.sizes.includes(action.size) && action.size !== b.size ? {size: action.size, fill: Array(action.size).fill(''), order: ''} : null;
    if (action.type === 'write' || action.type === 'erase') {
      if (!int(action.card) || action.card < 0 || action.card >= b.size) return null;
      const fill = writeMove(q, b.fill, action, action.card);
      return fill ? {...b, fill, order: ''} : null;
    }
    if (action.type === 'play') return keysAre(action, ['letter', 'type']) && fullCards(q.letters, b.fill) && q.letters.includes(action.letter) && action.letter.length === 1 && !b.order.includes(action.letter) ? {...b, order: b.order + action.letter} : null;
    if (action.type === 'again') return keysAre(action, ['type']) && b.order ? {...b, order: ''} : null;
    return null;
  }
  if (q.mode === 'agenda') {
    if (action.type === 'play') {
      if (!keysAre(action, ['letter', 'type']) || typeof action.letter !== 'string' || action.letter.length !== 1 || !q.letters.includes(action.letter) || b.order.includes(action.letter)) return null;
      return {...b, order: b.order + action.letter, told: null};
    }
    if (action.type === 'cant') {
      if (!keysAre(action, ['group', 'type']) || !isGroup(q.letters, action.group) || shutHas(b.shut, action.group)) return null;
      const why = groupRefusal(q, action.group);
      return why === null ? {...b, claim: action.group, told: null} : {...b, told: {group: action.group, why}, shut: [...b.shut, action.group]};
    }
    return null;
  }
  if (q.mode === 'cards') {
    const blanks = blanksOf(q);
    if (action.type === 'write' || action.type === 'erase') {
      const k = blanks.indexOf(action.card);
      if (!int(action.card) || k < 0) return null;
      const fill = writeMove(q, b.fill, action, k);
      return fill ? {...b, fill, told: null} : null;
    }
    if (action.type === 'vote') {
      const cards = cardsNow(q, b.fill);
      if (!keysAre(action, ['type']) || !fullCards(q.letters, cards) || b.told?.kind === 'fail') return null;
      return failing(q.letters, cards, q.goal) ? {...b, told: {kind: 'fail'}} : {...b, told: null, done: true};
    }
    if (action.type === 'cant') {
      if (!q.cant || !keysAre(action, ['cards', 'type']) || !isIndexList(action.cards, q.cards.length) || shutHas(b.shut, action.cards)) return null;
      const why = cardsRefusal(q, action.cards);
      return why === null ? {...b, claim: [...action.cards], told: null} : {...b, told: {kind: 'cards', cards: [...action.cards], why}, shut: [...b.shut, [...action.cards]]};
    }
    return null;
  }
  // The line.
  const n = q.start.length;
  if (action.type === 'put') {
    if (!keysAre(action, ['to', 'type', 'voter']) || !int(action.voter) || !int(action.to) || action.to < 0 || action.to > TICKS) return null;
    if (q.add ? action.voter !== n : action.voter < 0 || action.voter >= n) return null;
    if (b.at[action.voter] === action.to) return null;
    return {...b, at: b.at.map((x, i) => i === action.voter ? action.to : x), told: null};
  }
  if (action.type === 'vote') {
    if (!keysAre(action, ['type']) || !placedAll(b.at) || b.told) return null;
    const w = lineWinner(b.at);
    if (w !== q.goal) return {...b, told: {kind: 'vote', winner: w}};
    if (!q.add && movedOf(q, b.at) > q.budget) return {...b, told: {kind: 'more'}};
    return {...b, done: true};
  }
  if (action.type === 'cant') {
    if (!q.add || !keysAre(action, ['type', 'voters']) || !isIndexList(action.voters, n) || shutHas(b.shut, action.voters)) return null;
    const why = votersRefusal(q, action.voters);
    return why === null ? {...b, claim: [...action.voters], told: null} : {...b, told: {kind: 'voters', voters: [...action.voters], why}, shut: [...b.shut, [...action.voters]]};
  }
  return null;
}

// --- Hints --------------------------------------------------------------------
const voterName = i => `V${i + 1}`;
const POS = ['at the top of', 'second on', 'third on', 'fourth on', 'fifth on'];
const spotWord = (k, len) => k === 0 ? 'at the top of' : k === len - 1 ? 'at the bottom of' : len === 3 ? 'in the middle of' : POS[k];
function agendaHint(q, b) {
  const top = topCycle(q.cards, q.letters);
  if (!top.includes(q.target)) {
    const out = outside(q.letters, top), groupText = listWords([...top]);
    const text = top.length === 1
      ? `${top} beats ${listWords(out)}, so once ${top} plays it keeps winning. Press Can’t and ring ${top}.`
      : `${groupText} each beat ${listWords(out)}, so once one of them plays, the winner is always one of them. Press Can’t and ring ${groupText}.`;
    return {type: 'move', action: {type: 'cant', group: top}, text};
  }
  const wins = winsFrom(q.cards, q.letters, b.order, q.target);
  if (!wins.length) return {type: 'deadend', quiet: true, text: b.order.length === q.letters.length ? `${knockout(q.cards, b.order).winner} wins. Undo.` : `${q.target} can’t win from here. Undo.`};
  const next = wins[0][b.order.length];
  const text = b.order.length === 0 ? `Start with ${next}.` : b.order.length === 1 ? `Put ${next} against ${b.order}.` : `Bring in ${next} next.`;
  return {type: 'move', action: {type: 'play', letter: next}, text};
}
function cardsHint(q, b) {
  if (q.cant && !finishes(q, blanksOf(q).map(() => '')).length) {
    // The cards fixed already decide a pair against the goal letter.
    for (let m = 1; m < 1 << q.cards.length; m++) {
      const chosen = q.cards.map((_, i) => i).filter(i => m >> i & 1);
      if (cardsRefusal(q, chosen) !== null) continue;
      const y = overLetter(q, chosen), names = listWords(chosen.map(voterName));
      return {type: 'move', action: {type: 'cant', cards: chosen}, text: `${y} is above ${q.goal.letter} on ${names}, so ${y} beats ${q.goal.letter} whatever the blank card says. Press Can’t and tap ${names}.`};
    }
  }
  const ends = finishes(q, b.fill);
  if (!ends.length) return {type: 'deadend', quiet: true, text: 'These cards can’t be finished to work. Undo.'};
  const blanks = blanksOf(q), k = b.fill.findIndex((s, j) => s !== ends[0][j]);
  if (k < 0) return {type: 'move', action: {type: 'vote'}, text: 'Press Vote.'};
  const s = b.fill[k], letter = ends[0][k][s.length];
  return {type: 'move', action: {type: 'write', card: blanks[k], letter}, text: `Write ${letter} ${spotWord(s.length, q.letters.length)} ${voterName(blanks[k])}.`};
}
function lineHint(q, b) {
  const n = q.start.length;
  if (q.add) {
    const spots = addSpots(q);
    if (!spots.length) {
      const left = q.start.map((x, i) => i).filter(i => q.start[i] < q.goal), right = q.start.map((x, i) => i).filter(i => q.start[i] > q.goal);
      const side = left.length * 2 > n + 1 ? left : right, names = listWords(side.map(voterName)), near = side === left ? q.goal - 1 : q.goal + 1;
      return {type: 'move', action: {type: 'cant', voters: side}, text: `${names} are all ${side === left ? 'left' : 'right'} of ${q.goal}, so they all pick ${near} over ${q.goal}, wherever ${voterName(n)} goes. Press Can’t and tap them.`};
    }
    const now = b.at[n];
    if (spots.includes(now)) return {type: 'move', action: {type: 'vote'}, text: 'Press Vote.'};
    return {type: 'move', action: {type: 'put', voter: n, to: spots[0]}, text: `${now === null ? 'Put' : 'Move'} ${voterName(n)} on ${spots[0]}.`};
  }
  // The winning arrangement within the moves that is fewest puts away.
  const {ends} = fewest(q), all = budgetEnds(q);
  const cost = at => at.filter((x, i) => b.at[i] !== x).length;
  let best = null;
  for (const at of all.length ? all : ends) if (best === null || cost(at) < cost(best)) best = at;
  if (cost(best) === 0) return {type: 'move', action: {type: 'vote'}, text: 'Press Vote.'};
  const i = best.findIndex((x, j) => b.at[j] !== x);
  return {type: 'move', action: {type: 'put', voter: i, to: best[i]}, text: best[i] === q.start[i] ? `Move ${voterName(i)} back to ${best[i]}.` : `Move ${voterName(i)} to ${best[i]}.`};
}
// Every winning arrangement that moves no more voters than the budget.
const budgetCache = new Map();
function budgetEnds(q) {
  return memo(budgetCache, JSON.stringify([q.start, q.goal, q.budget]), () => {
    const n = q.start.length, out = [];
    (function grow(i, left, at) {
      if (i === n) { if (lineWinner(at) === q.goal) out.push(at); return; }
      grow(i + 1, left, [...at, q.start[i]]);
      if (left > 0) for (let x = 0; x <= TICKS; x++) if (x !== q.start[i]) grow(i + 1, left - 1, [...at, x]);
    })(0, q.budget, []);
    return out;
  });
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'note'};
  if (solved(p, b)) return {type: 'done'};
  if (q.mode === 'agenda') return agendaHint(q, b);
  if (q.mode === 'cards') return cardsHint(q, b);
  return lineHint(q, b);
}

// --- Drawing -----------------------------------------------------------------
// View state: claiming (Can't is pressed), chosen (letters, cards or voters
// tapped for it), pick (the voter lifted on the line, for the board it was
// lifted on), active (the blank card the letters write on).
const uiState = new Map();
const ui = p => memo(uiState, p.id, () => ({claiming: false, chosen: [], pick: null, at: null, active: null, refused: null}));
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${esc(focus)}"`;
const uiAttrs = (payload, focus) => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="${esc(focus)}"`;
const claimButton = (label, action, enabled, hinted, cls) => `<button type="button" class="vt-button ${cls}${hinted ? ' hinted' : ''}" ${moveAttrs(action, cls)} ${enabled ? '' : 'disabled'}>${label}</button>`;
const toggleButton = (label, payload, on, hinted, cls, enabled = true) => `<button type="button" class="vt-button ${cls}${hinted ? ' hinted' : ''}" ${uiAttrs(payload, cls)} aria-pressed="${on}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const note = (text, cls = '') => text ? `<p class="vt-told${cls}">${esc(text)}</p>` : '';
const tok = (x, cls = '') => `<b class="vt-tok${cls}">${esc(x)}</b>`;
const CROWN = '<svg class="vt-crown" viewBox="0 0 24 16" aria-hidden="true"><path d="M2 14 L4 4 L9 9 L12 2 L15 9 L20 4 L22 14 Z"/></svg>';
const dots = n => `<i class="vt-votes" aria-hidden="true">${'<i></i>'.repeat(n)}</i>`;
// A refused claim clears the taps that made it, once, when it first shows.
function settle(state, b) {
  const t = b.told, key = t && (t.group !== undefined || t.kind === 'cards' || t.kind === 'voters') ? JSON.stringify(t) : null;
  if (key && key !== state.refused) Object.assign(state, {claiming: false, chosen: []});
  state.refused = key;
}

// A card: its voter, then its letters top to bottom. `pair` marks the two
// letters of the last vote: the one this voter picks, and the other.
function cardHtml(card, i, opts = {}) {
  const len = opts.len ?? card.length, pair = opts.pair || null;
  const pick = pair ? (prefers(card, pair[0], pair[1]) ? pair[0] : pair[1]) : null;
  const cells = Array.from({length: len}, (_, k) => {
    const x = card[k];
    if (x === undefined) {
      const next = opts.write && k === card.length;
      return next ? `<button type="button" class="vt-l slot next${opts.active ? ' on' : ''}" ${uiAttrs({active: i}, `vt-slot-${i}`)} aria-label="${esc(`${voterName(i)}: write here`)}"></button>` : '<span class="vt-l slot"></span>';
    }
    const look = `vt-l${pair ? (x === pick ? ' pick' : pair.includes(x) ? ' skip' : ' fade') : ''}${opts.ring?.includes(x) ? ' ring' : ''}${opts.hintErase === x ? ' hinted' : ''}`;
    if (opts.write) return `<button type="button" class="${look} written" ${moveAttrs({type: 'erase', card: i, letter: x}, `vt-erase-${i}-${x}`)} aria-label="${esc(`${voterName(i)}: take off ${x}`)}">${esc(x)}</button>`;
    return `<span class="${look}">${esc(x)}</span>`;
  }).join('');
  const label = `${voterName(i)}${opts.blank ? ', blank card' : ''}: ${card.length ? [...card].join(', ') : 'nothing written'}${pair ? `. Picks ${pick} over ${pick === pair[0] ? pair[1] : pair[0]}` : ''}`;
  const cls = `vt-card${opts.blank ? ' blank' : ''}${opts.active ? ' active' : ''}${opts.chosen ? ' chosen' : ''}${opts.hinted ? ' hinted' : ''}${opts.ringed ? ' ringed' : ''}`;
  const inner = `<span class="vt-who">${voterName(i)}</span><span class="vt-ls">${cells}</span>`;
  if (opts.choose) return `<button type="button" class="${cls}" ${uiAttrs({choose: i}, `vt-card-${i}`)} aria-pressed="${Boolean(opts.chosen)}" aria-label="${esc(label)}">${inner}</button>`;
  return `<div class="${cls}" role="group" aria-label="${esc(label)}">${inner}</div>`;
}
// The knockout: each vote as a row, the survivor's side in pine, and the
// final slot with its crown (the goal letter faint until the knockout ends).
function matHtml(cards, letters, order, goal, closed = false) {
  const {rounds, winner} = knockout(cards, order), rows = [];
  const side = (x, v, cls) => `<span class="vt-side${cls}">${tok(x)}${dots(v)}<small>${v}</small></span>`;
  for (const r of rounds) rows.push(`<li class="vt-round">${side(r.a, r.va, r.win === r.a ? ' win' : ' lose')}<span class="vt-vs">vs</span>${side(r.b, r.vb, r.win === r.b ? ' win' : ' lose')}</li>`);
  if (order.length < letters.length && !closed) rows.push(`<li class="vt-round open"><span class="vt-side">${order.length ? tok(order.length === 1 ? order : winner) : '<b class="vt-tok empty"></b>'}</span><span class="vt-vs">vs</span><span class="vt-side"><b class="vt-tok empty"></b></span></li>`);
  const over = order.length === letters.length;
  const final = `<div class="vt-final${over ? (goal && winner !== goal ? ' miss' : ' won') : ''}">${CROWN}${over ? tok(winner, ' big') : goal ? tok(goal, ' big ghost') : '<b class="vt-tok big empty"></b>'}</div>`;
  const words = rounds.map(r => `${r.a} against ${r.b}: ${r.win} wins ${Math.max(r.va, r.vb)} to ${Math.min(r.va, r.vb)}`).join('. ');
  return {html: `<div class="vt-ko"><ol class="vt-rounds">${rows.join('')}</ol>${final}</div>`, words, winner: over ? winner : null};
}
function lettersRow(letters, opts) {
  return `<div class="vt-letters" role="group" aria-label="Letters">${[...letters].map(x => {
    const hinted = opts.hinted === x || opts.ring?.includes(x) ? ' hinted' : '';
    if (opts.choose) return `<button type="button" class="vt-letter${opts.chosen.includes(x) ? ' chosen' : ''}${hinted}" ${uiAttrs({choose: x}, `vt-letter-${x}`)} aria-pressed="${opts.chosen.includes(x)}" aria-label="${esc(x)}">${esc(x)}</button>`;
    const used = opts.used?.includes(x);
    return `<button type="button" class="vt-letter${used ? ' used' : ''}${hinted}" ${moveAttrs(opts.action(x), `vt-letter-${x}`)} ${opts.enabled(x) ? '' : 'disabled'} aria-label="${esc(opts.say(x))}">${esc(x)}</button>`;
  }).join('')}</div>`;
}
// After an accepted group: each of its letters beats each letter outside it.
function pairsHtml(cards, letters, group) {
  const items = [];
  for (const s of group) for (const t of outside(letters, group)) items.push(`<li>${tok(s, ' small')}<span>beats</span>${tok(t, ' small')}<small>${votesFor(cards, s, t)} to ${votesFor(cards, t, s)}</small></li>`);
  return `<ul class="vt-pairs" aria-label="Pair votes">${items.join('')}</ul>`;
}

function renderAgenda(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  settle(state, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const claiming = !done && state.claiming, chosen = claiming ? state.chosen : [];
  const mat = matHtml(q.cards, q.letters, b.order, q.target, b.claim !== null);
  const last = knockout(q.cards, b.order).rounds.at(-1), ring = b.claim ? [...b.claim] : [];
  const cards = `<div class="vt-cards">${q.cards.map((c, i) => cardHtml(c, i, {pair: last && !b.claim ? [last.a, last.b] : null, ring})).join('')}</div>`;
  const letters = done ? '' : lettersRow(q.letters, {
    choose: claiming, chosen, used: b.order, hinted: act?.type === 'play' ? act.letter : null, ring: act?.type === 'cant' && claiming ? [...act.group] : null,
    action: x => ({type: 'play', letter: x}), enabled: x => !b.order.includes(x), say: x => b.order.includes(x) ? `${x}, played` : b.order.length ? `Bring in ${x}` : `Start with ${x}`
  });
  let bar = '';
  if (!done) {
    const group = groupOf(q.letters, chosen);
    const cant = toggleButton('Can’t', {claiming: !claiming}, claiming, act?.type === 'cant' && !claiming, 'vt-cant');
    const check = claiming ? claimButton('Check', {type: 'cant', group: group || q.letters}, group.length > 0 && !shutHas(b.shut, group), act?.type === 'cant' && claiming, 'vt-check') : '';
    bar = `<div class="vt-bar">${cant}${check}</div>`;
  }
  const t = b.told;
  const told = t ? (t.why === 'target' ? `Leave ${q.target} out.` : `${t.why[0]} beats ${t.why[1]}.`) : mat.winner && mat.winner !== q.target ? `${mat.winner} wins.` : '';
  const cert = b.claim ? pairsHtml(q.cards, q.letters, b.claim) : '';
  const words = `${b.order ? `Played ${[...b.order].join(', ')}. ${mat.words}.` : 'No letters played.'}${mat.winner ? ` ${mat.winner} wins.` : ''}${told && !mat.winner ? ` ${told}` : ''}${claiming ? ` Ringed: ${chosen.length ? listWords(groupOf(q.letters, chosen).split('')) : 'none'}.` : ''}`;
  return `<div class="vt-puzzle mode-agenda${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="votes">${cards}${mat.html}${letters}${bar}${note(told)}${cert}${status(words)}</div>`;
}

// The knockouts of every agenda, after the cards pass a Vote.
function agendaTable(letters, cards) {
  return `<ul class="vt-table" aria-label="Every knockout">${agendas(letters).map(o => {
    const w = knockout(cards, o).winner;
    return `<li><span class="vt-first">${tok(o[0], ' small')}${tok(o[1], ' small')}</span><span>then</span>${tok(o[2], ' small')}<span class="vt-arrow" aria-hidden="true">→</span>${CROWN}${tok(w, ' small win')}</li>`;
  }).join('')}</ul>`;
}
function activeCard(q, b, state, blanks) {
  const open = blanks.filter((i, k) => b.fill[k].length < q.letters.length);
  return open.includes(state.active) ? state.active : open[0] ?? null;
}
function renderCards(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  settle(state, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const claiming = !done && state.claiming && q.cant, chosen = claiming ? state.chosen : [];
  const blanks = blanksOf(q), cards = cardsNow(q, b.fill), full = fullCards(q.letters, cards);
  const active = done || claiming ? null : activeCard(q, b, state, blanks);
  const ringCards = b.claim || (act?.type === 'cant' && claiming ? act.cards : []);
  const over = b.claim ? [overLetter(q, b.claim), q.goal.letter] : null;
  const cardRow = `<div class="vt-cards">${q.cards.map((c, i) => {
    const blank = c === '', hinted = (act?.type === 'write' && act.card === i) || (act?.type === 'cant' && claiming && act.cards.includes(i));
    return cardHtml(cards[i], i, {len: q.letters.length, blank, write: blank && !done && !claiming, active: i === active, choose: claiming, chosen: chosen.includes(i), hinted, ringed: b.claim?.includes(i), ring: b.claim?.includes(i) ? over : null});
  }).join('')}</div>`;
  const written = active === null ? '' : b.fill[blanks.indexOf(active)];
  const letters = done || claiming ? '' : lettersRow(q.letters, {
    used: written, hinted: act?.type === 'write' ? act.letter : null,
    action: x => ({type: 'write', card: active ?? blanks[0], letter: x}), enabled: x => active !== null && !written.includes(x), say: x => active === null ? x : `Write ${x} on ${voterName(active)}`
  });
  let bar = '';
  if (!done) {
    const parts = [];
    if (!claiming) parts.push(claimButton('Vote', {type: 'vote'}, full && b.told?.kind !== 'fail', act?.type === 'vote', 'vt-vote'));
    if (q.cant) {
      parts.push(toggleButton('Can’t', {claiming: !claiming}, claiming, act?.type === 'cant' && !claiming, 'vt-cant'));
      if (claiming) parts.push(claimButton('Check', {type: 'cant', cards: chosen.length ? [...chosen].sort((x, y) => x - y) : [0]}, chosen.length > 0 && !shutHas(b.shut, [...chosen].sort((x, y) => x - y)), act?.type === 'cant' && claiming, 'vt-check'));
    }
    bar = `<div class="vt-bar">${parts.join('')}</div>`;
  }
  const t = b.told, fail = t?.kind === 'fail' ? failing(q.letters, cards, q.goal) : null;
  const told = fail ? `${fail.winner} wins when ${fail.order[2]} waits.` : t?.kind === 'cards' ? {blank: 'A blank card can go either way.', few: 'That isn’t most of the cards.', none: `No letter is above ${q.goal.letter} on all of them.`}[t.why] : '';
  const table = b.done ? agendaTable(q.letters, cards) : b.claim ? `<p class="vt-why">${esc(`${over[0]} beats ${q.goal.letter} on most cards.`)}</p>` : '';
  const words = `${cards.map((c, i) => `${voterName(i)}: ${c ? [...c].join(', ') : 'blank'}`).join('. ')}.${told ? ` ${told}` : ''}${active !== null ? ` Writing on ${voterName(active)}.` : ''}`;
  return `<div class="vt-puzzle mode-cards${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="votes">${cardRow}${letters}${bar}${note(told)}${table}${status(words)}</div>`;
}

const pickOf = (p, a) => { const s = ui(p); return s.at === a.moves && s.pick !== null ? s.pick : null; };
function renderLine(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p), n = q.start.length;
  settle(state, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.action;
  const claiming = !done && state.claiming && q.add, chosen = claiming ? state.chosen : [];
  const newcomer = q.add ? n : null, waiting = q.add && b.at[n] === null;
  // Before the new voter is down, a tick puts it there.
  const pick = done || claiming ? null : waiting ? n : pickOf(p, a);
  const t = b.told, wonAt = t?.kind === 'vote' ? t.winner : null;
  const ringed = b.claim || [];
  const voter = i => {
    const x = b.at[i], moved = !q.add && x !== q.start[i], extra = i === newcomer;
    const hinted = (act?.type === 'put' && act.voter === i && pick !== i) || (act?.type === 'cant' && claiming && act.voters.includes(i));
    const cls = `vt-voter${moved ? ' moved' : ''}${extra ? ' extra' : ''}${pick === i ? ' picked' : ''}${chosen.includes(i) || ringed.includes(i) ? ' chosen' : ''}${hinted ? ' hinted' : ''}`;
    const label = `${voterName(i)}${x === null ? ', not on the line' : ` at ${x}`}${moved ? `, moved from ${q.start[i]}` : ''}`;
    if (claiming) return i === newcomer ? `<span class="${cls}" role="img" aria-label="${esc(label)}">${voterName(i)}</span>` : `<button type="button" class="${cls}" ${uiAttrs({choose: i}, `vt-voter-${i}`)} aria-pressed="${chosen.includes(i)}" aria-label="${esc(label)}">${voterName(i)}</button>`;
    if (done || (q.add && i !== newcomer)) return `<span class="${cls}" role="img" aria-label="${esc(label)}">${voterName(i)}</span>`;
    return `<button type="button" class="${cls}" data-vt-voter="${i}" ${uiAttrs({pick: pick === i ? null : i, at: a.moves}, `vt-voter-${i}`)} aria-pressed="${pick === i}" aria-label="${esc(`${label}. ${pick === i ? 'Let go' : 'Pick up'}`)}">${voterName(i)}</button>`;
  };
  const cols = Array.from({length: TICKS + 1}, (_, x) => {
    const here = b.at.map((v, i) => v === x ? i : -1).filter(i => i >= 0);
    const ghosts = q.add ? [] : q.start.map((s, i) => s === x && b.at[i] !== x ? i : -1).filter(i => i >= 0);
    const stack = [...ghosts.map(i => `<span class="vt-voter ghost" aria-hidden="true">${voterName(i)}</span>`), ...here.map(voter)].join('');
    const goal = x === q.goal, hintedTick = act?.type === 'put' && act.to === x && pick === act.voter;
    const can = pick !== null && b.at[pick] !== x;
    const cls = `vt-tick${goal ? ' goal' : ''}${wonAt === x ? ' won' : ''}${done && goal ? ' crowned' : ''}${hintedTick ? ' hinted' : ''}`;
    const label = `${x}${goal ? ', the spot to win' : ''}${here.length ? `, ${listWords(here.map(voterName))}` : ''}`;
    const tick = can ? `<button type="button" class="${cls}" data-vt-tick="${x}" ${moveAttrs({type: 'put', voter: pick, to: x}, `vt-tick-${x}`)} aria-label="${esc(`Put ${voterName(pick)} on ${label}`)}">${goal ? CROWN : ''}<span>${x}</span></button>` : `<span class="${cls}" data-vt-tick="${x}" aria-label="${esc(label)}" role="img">${goal ? CROWN : ''}<span>${x}</span></span>`;
    return `<div class="vt-col"><div class="vt-stack">${stack}</div>${tick}</div>`;
  }).join('');
  const tray = waiting ? `<div class="vt-tray">${voter(n)}</div>` : '';
  const used = q.add ? 0 : movedOf(q, b.at);
  const pips = q.add ? '' : `<span class="vt-pips" role="img" aria-label="${used} of ${q.budget} ${q.budget === 1 ? 'voter' : 'voters'} moved">${Array.from({length: Math.max(used, q.budget)}, (_, k) => `<i class="${k < used ? (k >= q.budget ? 'over' : 'used') : ''}"></i>`).join('')}</span>`;
  let bar = '';
  if (!done) {
    const parts = [pips];
    if (!claiming) parts.push(claimButton('Vote', {type: 'vote'}, placedAll(b.at) && !t, act?.type === 'vote', 'vt-vote'));
    if (q.add) {
      parts.push(toggleButton('Can’t', {claiming: !claiming}, claiming, act?.type === 'cant' && !claiming, 'vt-cant'));
      if (claiming) { const list = [...chosen].sort((x, y) => x - y); parts.push(claimButton('Check', {type: 'cant', voters: list.length ? list : [0]}, list.length > 0 && !shutHas(b.shut, list), act?.type === 'cant' && claiming, 'vt-check')); }
    }
    bar = `<div class="vt-bar">${parts.join('')}</div>`;
  } else if (!q.add) bar = `<div class="vt-bar">${pips}</div>`;
  const told = t?.kind === 'vote' ? (t.winner === null ? 'No spot wins.' : `${t.winner} wins.`) : t?.kind === 'more' ? 'Fewer moves would do.' : t?.kind === 'voters' ? (t.why === 'few' ? 'That isn’t most of the voters.' : `They aren’t all on one side of ${q.goal}.`) : '';
  const why = b.claim ? (() => { const left = q.start[b.claim[0]] < q.goal; return `${listWords(b.claim.map(voterName))} all pick ${left ? q.goal - 1 : q.goal + 1} over ${q.goal}.`; })() : '';
  const words = `${b.at.map((x, i) => `${voterName(i)} ${x === null ? 'not placed' : `at ${x}`}`).join(', ')}.${q.add ? '' : ` ${used} moved.`}${pick !== null && !waiting ? ` ${voterName(pick)} is picked.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="vt-puzzle mode-line${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="votes">${tray}<div class="vt-line" role="group" aria-label="Number line">${cols}</div>${bar}${note(told)}${why ? `<p class="vt-why">${esc(why)}</p>` : ''}${status(words)}</div>`;
}

function renderPlay(p, a) {
  const q = p.parameters, b = a.board, state = ui(p), cards = b.fill, full = fullCards(q.letters, cards);
  const all = cards.map((_, i) => i);
  const active = full ? null : (() => { const open = all.filter(i => cards[i].length < q.letters.length); return open.includes(state.active) ? state.active : open[0]; })();
  const last = knockout(cards, b.order).rounds.at(-1);
  const sizes = `<div class="vt-sizes" role="group" aria-label="Voters">${q.sizes.map(n => `<button type="button" class="vt-button vt-size" ${moveAttrs({type: 'size', size: n}, `vt-size-${n}`)} aria-pressed="${b.size === n}">${n} voters</button>`).join('')}</div>`;
  const cardRow = `<div class="vt-cards">${cards.map((c, i) => cardHtml(c, i, {len: q.letters.length, blank: true, write: true, active: i === active, pair: last && full ? [last.a, last.b] : null})).join('')}</div>`;
  const written = active === null ? '' : cards[active];
  const letters = lettersRow(q.letters, full
    ? {used: b.order, action: x => ({type: 'play', letter: x}), enabled: x => !b.order.includes(x), say: x => b.order.includes(x) ? `${x}, played` : b.order.length ? `Bring in ${x}` : `Start with ${x}`}
    : {used: written, action: x => ({type: 'write', card: active, letter: x}), enabled: x => !written.includes(x), say: x => `Write ${x} on ${voterName(active)}`});
  const mat = full ? matHtml(cards, q.letters, b.order, null) : null;
  const again = full ? `<div class="vt-bar">${claimButton('Again', {type: 'again'}, b.order.length > 0, false, 'vt-again')}</div>` : '';
  const words = `${cards.map((c, i) => `${voterName(i)}: ${c ? [...c].join(', ') : 'blank'}`).join('. ')}.${mat ? ` ${mat.words}.${mat.winner ? ` ${mat.winner} wins.` : ''}` : ''}`;
  return `<div class="vt-puzzle mode-playground" data-mechanic-wire="votes">${sizes}${cardRow}${mat ? mat.html : ''}${letters}${again}${status(words)}</div>`;
}
function render(p, a) {
  const mode = p.parameters.mode;
  return mode === 'agenda' ? renderAgenda(p, a) : mode === 'cards' ? renderCards(p, a) : mode === 'line' ? renderLine(p, a) : renderPlay(p, a);
}

// --- Gestures on the line ----------------------------------------------------
// A voter can be dragged to a tick; arrow keys move a picked voter one spot.
function wire(root, p, api) {
  if (p.parameters.mode !== 'line') return;
  const board = root.matches('.vt-puzzle') ? root : root.querySelector('.vt-puzzle');
  if (!board || board.classList.contains('claiming') || board.classList.contains('solved')) return;
  let drag = null, dragged = false;
  root.addEventListener('click', e => { if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; } }, true);
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('button[data-vt-voter]');
    if (!el || e.button > 0) return;
    drag = {el, id: e.pointerId, x: e.clientX, y: e.clientY, voter: Number(el.dataset.vtVoter), moved: false};
  });
  const tickAt = e => { const z = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-vt-tick]'); return z && board.contains(z) ? Number(z.dataset.vtTick) : null; };
  board.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) { drag.moved = true; drag.el.classList.add('dragging'); }
    drag.el.style.transform = `translate(${dx}px,${dy}px)`;
    board.querySelectorAll('.vt-tick.over').forEach(z => z.classList.remove('over'));
    const x = tickAt(e);
    if (x !== null) board.querySelector(`[data-vt-tick="${x}"]`)?.classList.add('over');
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.moved) return;
    const x = e.type === 'pointerup' ? tickAt(e) : null;
    d.el.classList.remove('dragging');
    d.el.style.transform = '';
    dragged = true;
    setTimeout(() => { dragged = false; if (x !== null && api.attempt().board.at[d.voter] !== x) api.apply({type: 'put', voter: d.voter, to: x}); }, 0);
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', end);
  board.addEventListener('keydown', e => {
    const el = e.target.closest?.('button[data-vt-voter]');
    if (!el || !['ArrowLeft', 'ArrowRight'].includes(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;
    const i = Number(el.dataset.vtVoter), x = api.attempt().board.at[i], to = x + (e.key === 'ArrowLeft' ? -1 : 1);
    if (x === null || to < 0 || to > TICKS) return;
    e.preventDefault();
    api.apply({type: 'put', voter: i, to});
  });
}

function uiHook(p, payload) {
  if (!object(payload)) return;
  const s = ui(p);
  if (typeof payload.claiming === 'boolean') Object.assign(s, {claiming: payload.claiming, chosen: [], pick: null});
  if (typeof payload.choose === 'string' || int(payload.choose)) s.chosen = s.chosen.includes(payload.choose) ? s.chosen.filter(x => x !== payload.choose) : [...s.chosen, payload.choose];
  if (Object.hasOwn(payload, 'pick') && (payload.pick === null || int(payload.pick)) && int(payload.at)) Object.assign(s, {pick: payload.pick, at: payload.at});
  if (int(payload.active)) s.active = payload.active;
}

export const voteMechanics = {
  votes: {
    fresh, valid, solved, move, hint, render, wire,
    ui: uiHook,
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves, not claims: every refused certificate stays
    // refused, and its line stays while the letters, cards or voters it was
    // refused on are where they were.
    carry(p, from, to) {
      const q = p.parameters;
      if (q.mode === 'playground' || !object(from) || !object(to) || !Array.isArray(from.shut) || !Array.isArray(to.shut)) return to;
      const shut = [...to.shut, ...from.shut.filter(x => !shutHas(to.shut, x))];
      const t = from.told, refusal = t && (t.group !== undefined || t.kind === 'cards' || t.kind === 'voters');
      const same = q.mode === 'agenda' ? from.order === to.order : q.mode === 'cards' ? JSON.stringify(from.fill) === JSON.stringify(to.fill) : JSON.stringify(from.at) === JSON.stringify(to.at);
      return refusal && !to.told && to.claim === null && same ? {...to, shut, told: t} : {...to, shut};
    },
    noHint: p => isPlay(p)
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'votes',
  family: {id: 'votes', symbol: '≻'},
  mechanics: voteMechanics,
  pack: new URL('./votes.json', import.meta.url).href,
  css: new URL('./votes.css', import.meta.url).href,
  focus: '.vt-letter:not([disabled]),.vt-card[data-action],.vt-voter[data-action],.vt-tick[data-action],.vt-l.next,.vt-button:not([disabled])'
};
