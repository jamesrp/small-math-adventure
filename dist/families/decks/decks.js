// Three decks (worksheet Week 24). Number cards are dealt into decks. A card
// is drawn from each of two decks, every card as likely as any other, and the
// bigger number wins; a deck beats another when its cards win more than half
// of the pairs. A = (2, 4, 9), B = (1, 6, 8) and C = (3, 5, 7) each win 5 of
// their 9 pairs against the next, so A beats B, B beats C and C beats A,
// though every deck totals 15: "beats" goes round in a circle
// (nontransitive dice). Of the 1,680 ways to deal 1–9 into decks A, B and C,
// 15 make that cycle. Every one of them has a weakest win of exactly 5 of 9;
// a cycle with two big wins (6 of 9 or more) is one deal, turned round, and
// three big wins never happen. Two decks of three never tie (nine pairs can't
// split evenly), and two-card decks from 1–6 never cycle (the deck holding 1
// wins at most half its pairs). The shelf and catalogs come from the shared
// case engine (dist/cases.js). Following the review card, the cards are the
// controls: tap a card and then one in another deck to swap them, so every
// state is a legal deal, and every comparison shows its pairs in a win grid,
// each pair in its winner's colour. Grids show no counts.
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, shelfHTML, binsHTML, catalogHTML} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const byValue = (x, y) => x - y;
const sortN = list => [...list].sort(byValue);
export const NAMES = ['A', 'B', 'C'];
// The pairs, one card from each deck, that x's card wins.
export const wins = (x, y) => x.reduce((n, a) => n + y.filter(b => a > b).length, 0);
export const beats = (x, y) => 2 * wins(x, y) > x.length * y.length;
// A big win: two pairs in three or more (6 of 9).
export const bigWin = (x, y) => 3 * wins(x, y) >= 2 * x.length * y.length;
// The comparisons: A against B, B against C and C against A; with two decks, A against B.
export const ARROWS = [[0, 1], [1, 2], [2, 0]];
export const comparisons = n => n === 2 ? [[0, 1]] : ARROWS;
export const isCycle = d => d.length === 3 && ARROWS.every(([i, j]) => beats(d[i], d[j]));
export const bigWins = d => ARROWS.filter(([i, j]) => bigWin(d[i], d[j])).length;
export const GOALS = {
  beat: d => beats(d[0], d[1]),
  beatBA: d => beats(d[1], d[0]),
  tie: d => wins(d[0], d[1]) === wins(d[1], d[0]),
  cycle: isCycle,
  big2: d => isCycle(d) && bigWins(d) >= 2,
  big3: d => isCycle(d) && bigWins(d) === 3
};

// Deals: every deck sorted, keyed '2-4-9|1-6-8|3-5-7'.
export const dealKey = d => d.map(x => x.join('-')).join('|');
export const parseKey = key => key.split('|').map(s => s.split('-').map(Number));
const pinsOf = q => q.pins || q.decks.map(() => []);
const pinned = (q, v) => pinsOf(q).some(ps => ps.includes(v));
const dealCache = new Map();
// Every way to deal the puzzle's cards into decks of its size, each pinned card in its deck.
export function dealsOf(q) {
  const id = JSON.stringify([q.decks, q.pins]);
  if (dealCache.has(id)) return dealCache.get(id);
  const size = q.decks[0].length, pins = pinsOf(q);
  const choose = (rest, k) => k === 0 ? [[]] : rest.flatMap((v, i) => choose(rest.slice(i + 1), k - 1).map(c => [v, ...c]));
  const fits = (c, i) => pins[i].every(v => c.includes(v)) && pins.every((ps, k) => k === i || !ps.some(v => c.includes(v)));
  const go = (rest, i) => i === q.decks.length ? [[]] : choose(rest, size).filter(c => fits(c, i)).flatMap(c => go(rest.filter(v => !c.includes(v)), i + 1).map(r => [c, ...r]));
  const out = go(sortN(q.decks.flat()), 0);
  dealCache.set(id, out);
  return out;
}
const sameList = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
function validDeal(q, d) {
  const size = q.decks[0].length;
  return Array.isArray(d) && d.length === q.decks.length && d.every(x => Array.isArray(x) && x.length === size && x.every((v, i) => Number.isInteger(v) && (i === 0 || v > x[i - 1])))
    && sameList(sortN(d.flat()), sortN(q.decks.flat())) && pinsOf(q).every((ps, i) => ps.every(v => d[i].includes(v)));
}
const deckOf = (d, v) => d.findIndex(x => x.includes(v));
// Two cards in different decks change places.
export function swapCards(d, a, b) {
  const i = deckOf(d, a), j = deckOf(d, b);
  if (i < 0 || j < 0 || i === j) return null;
  return d.map((x, k) => k === i ? sortN([...x.filter(v => v !== a), b]) : k === j ? sortN([...x.filter(v => v !== b), a]) : x);
}
const targetCache = new Map();
const targets = q => {
  const id = JSON.stringify([q.decks, q.pins, q.goal]);
  if (!targetCache.has(id)) targetCache.set(id, dealsOf(q).filter(GOALS[q.goal]));
  return targetCache.get(id);
};
export const possible = q => targets(q).length > 0;

// The pairs of a comparison, row by row: a card of x against a card of y.
export const cellsOf = (x, y) => x.flatMap((a, r) => y.map((b, c) => ({a, b, k: r * y.length + c})));
const winnerOf = q => beats(q.decks[0], q.decks[1]) ? 0 : 1;
// A menu puzzle's decks with a card in the empty place (null leaves it empty).
export const filled = (q, v) => q.decks.map(x => x.map(c => c === null ? v : c));
const menuTargets = q => q.menu.filter(v => GOALS[q.goal](filled(q, v))).map(String);
// One swap from the starting decks: an A card with a B card, keyed 'a-b'.
const swapKey = (a, b) => `${a}-${b}`;
const swapped = (q, s) => s ? swapCards(q.decks, s[0], s[1]) : q.decks;
export const allSwaps = q => q.decks[0].flatMap(a => q.decks[1].map(b => swapKey(a, b)));
const swapTargets = q => allSwaps(q).filter(k => GOALS[q.goal](swapped(q, k.split('-').map(Number))));
const targetsOf = q => q.mode === 'menu' ? menuTargets(q) : q.mode === 'swaps' ? swapTargets(q) : targets(q).map(dealKey);

// Boards.
//   pairs: {marked, chosen, missed}: mark the winner of each pair of a
//          comparison (the bigger card), then choose the deck that wins more;
//          with q.loop (puzzle 3) also {best, guess}: then say whether any of
//          the loop's decks beats both others (none does), guess being the
//          last deck wrongly named
//   menu:  {value, kept, claimed, missed, wrong}: try each card in the empty
//          place and keep every one that meets q.goal; Keep checks it
//   swaps: {swap, kept, claimed, missed, wrong}: one A card with one B card;
//          keep every swap that meets q.goal; Keep checks it and swaps back
//   deal:  {decks, cant}: swap cards until q.goal holds, or Can't when no
//          deal does
//   deals: {decks, kept, claimed, missed, wrong}: keep every deal that meets q.goal
function freshPuzzle(p) {
  const q = p.parameters, shelf = {kept: [], claimed: false, missed: false, wrong: false};
  if (q.mode === 'pairs') return q.loop ? {marked: [], chosen: null, missed: false, best: false, guess: null} : {marked: [], chosen: null, missed: false};
  if (q.mode === 'menu') return {value: null, ...shelf};
  if (q.mode === 'swaps') return {swap: null, ...shelf};
  if (q.mode === 'deal') return {decks: q.decks.map(x => [...x]), cant: false};
  return {decks: q.decks.map(x => [...x]), ...shelf};
}
const shelfOf = b => ({kept: b.kept, claimed: b.claimed, missed: b.missed});
// Puzzle 3's question comes after the choice; no deck beats both others, so every deck named is wrong.
const validAsk = b => Object.keys(b).length === 5 && typeof b.best === 'boolean' && (b.guess === null || [0, 1, 2].includes(b.guess))
  && !((b.best || b.guess !== null) && b.chosen === null) && !(b.best && b.guess !== null);
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  const size = n => Object.keys(b).length === n;
  if (q.mode === 'pairs') {
    const n = q.decks[0].length * q.decks[1].length;
    return Array.isArray(b.marked) && b.marked.every((k, i) => Number.isInteger(k) && k >= 0 && k < n && (i === 0 || k > b.marked[i - 1]))
      && (b.chosen === null || (b.chosen === winnerOf(q) && b.marked.length === n)) && typeof b.missed === 'boolean'
      && !(b.missed && (b.chosen !== null || b.marked.length < n)) && (q.loop ? validAsk(b) : size(3));
  }
  const shelfOk = validShelf(shelfOf(b), targetsOf(q)) && typeof b.wrong === 'boolean' && size(5);
  if (q.mode === 'menu') return shelfOk && (b.value === null || q.menu.includes(b.value)) && !(b.wrong && (b.value === null || GOALS[q.goal](filled(q, b.value)) || b.claimed));
  if (q.mode === 'swaps') {
    const s = b.swap, ok = s === null || (Array.isArray(s) && s.length === 2 && q.decks[0].includes(s[0]) && q.decks[1].includes(s[1]));
    return shelfOk && ok && !(b.wrong && (s === null || GOALS[q.goal](swapped(q, s)) || b.claimed));
  }
  if (q.mode === 'deal') return validDeal(q, b.decks) && typeof b.cant === 'boolean' && size(2);
  return shelfOk && validDeal(q, b.decks) && !(b.wrong && (GOALS[q.goal](b.decks) || b.claimed));
}
function solvedPuzzle(p, b) {
  const q = p.parameters;
  if (!validPuzzle(p, b)) return false;
  if (q.mode === 'pairs') return b.chosen !== null && (!q.loop || b.best);
  if (q.mode === 'deal') return GOALS[q.goal](b.decks) || (b.cant && !possible(q));
  return b.claimed;
}
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const goal = GOALS[q.goal], counts = key => targetsOf(q).includes(key);
  const claim = () => b.kept.length && !b.missed ? {...b, ...claimCases(targetsOf(q), b.kept), wrong: false} : null;
  // Keep checks the case: one that doesn't meet the goal is refused until something changes.
  const keep = (key, works, after = {}) => {
    if (b.wrong || b.kept.includes(key)) return null;
    return works ? {...b, ...after, kept: keepCase(b.kept, key, counts), missed: false} : {...b, wrong: true};
  };
  const swap = d => pinned(q, action.a) || pinned(q, action.b) ? null : swapCards(d, action.a, action.b);
  if (q.mode === 'pairs') {
    const cells = cellsOf(q.decks[0], q.decks[1]);
    if (action.type === 'mark') {
      // Only the bigger card of a pair is marked: the child finds the winner.
      const c = Number.isInteger(action.cell) ? cells[action.cell] : undefined;
      if (!c || b.marked.includes(c.k) || action.side !== (c.a > c.b ? 0 : 1)) return null;
      return {...b, marked: sortN([...b.marked, c.k])};
    }
    if (action.type === 'choose') {
      if (b.chosen !== null || b.marked.length < cells.length || ![0, 1].includes(action.deck) || (b.missed && action.deck !== winnerOf(q))) return null;
      return action.deck === winnerOf(q) ? {...b, chosen: action.deck, missed: false} : {...b, missed: true};
    }
    // Does any deck beat both others? deck null is No.
    if (action.type === 'best' && q.loop && b.chosen !== null) {
      if (action.deck === null) return {...b, best: true, guess: null};
      return [0, 1, 2].includes(action.deck) && action.deck !== b.guess ? {...b, guess: action.deck} : null;
    }
    return null;
  }
  if (q.mode === 'menu') {
    if (action.type === 'pick') return q.menu.includes(action.value) && action.value !== b.value ? {...b, value: action.value, wrong: false} : null;
    if (action.type === 'keep') return b.value === null ? null : keep(String(b.value), goal(filled(q, b.value)));
    return action.type === 'claim' ? claim() : null;
  }
  if (q.mode === 'swaps') {
    if (action.type === 'swap') {
      if (b.swap) return null;
      const [x, y] = q.decks[1].includes(action.a) ? [action.b, action.a] : [action.a, action.b];
      return q.decks[0].includes(x) && q.decks[1].includes(y) ? {...b, swap: [x, y], wrong: false} : null;
    }
    if (action.type === 'again') return b.swap ? {...b, swap: null, wrong: false} : null;
    // A swap kept goes on the shelf, and the decks go back to how they started.
    if (action.type === 'keep') return b.swap ? keep(swapKey(...b.swap), goal(swapped(q, b.swap)), {swap: null}) : null;
    return action.type === 'claim' ? claim() : null;
  }
  if (q.mode === 'deal') {
    if (action.type === 'swap') { const decks = swap(b.decks); return decks ? {decks, cant: false} : null; }
    // Can't is checked: right when no deal works, otherwise refused until the decks change.
    return action.type === 'cant' && !b.cant ? {...b, cant: true} : null;
  }
  if (action.type === 'swap') { const decks = swap(b.decks); return decks ? {...b, decks, wrong: false} : null; }
  if (action.type === 'keep') return keep(dealKey(b.decks), goal(b.decks));
  return action.type === 'claim' ? claim() : null;
}

// Hints. Pairs: the next pair's winner, then the deck that wins more. Find
// every: the next card, swap or deal not yet kept, Keep, That's all. A deal:
// one swap toward the nearest deal that works (a direct exchange when there
// is one, so each swap puts at least one card in its place), or Can't.
const misplaced = (d, t) => d.reduce((n, x, i) => n + x.filter(v => !t[i].includes(v)).length, 0);
const nearest = (d, pool) => [...pool].sort((x, y) => misplaced(d, x) - misplaced(d, y) || (dealKey(x) < dealKey(y) ? -1 : 1))[0];
export function stepToward(d, t) {
  const home = v => t.findIndex(x => x.includes(v)), at = v => deckOf(d, v);
  const away = sortN(d.flat().filter(v => home(v) !== at(v)));
  for (const a of away) { const b = d[home(a)].find(v => home(v) === at(a)); if (b !== undefined) return [a, b]; }
  return [away[0], d[home(away[0])].find(v => home(v) !== home(away[0]))];
}
const namesOf = q => q.names || NAMES.slice(0, q.decks.length);
const bigger = c => `${Math.max(c.a, c.b)} is bigger than ${Math.min(c.a, c.b)}.`;
function hintPuzzle(p, b) {
  const q = p.parameters;
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const step = (action, text) => ({type: 'move', action, text});
  const swapStep = ([a, c]) => step({type: 'swap', a, b: c}, `Swap ${a} and ${c}.`);
  const missing = q.mode === 'pairs' || q.mode === 'deal' ? [] : missingCases(targetsOf(q), b.kept);
  const all = () => step({type: 'claim'}, 'You have found them all.');
  if (q.mode === 'pairs') {
    const next = cellsOf(q.decks[0], q.decks[1]).find(c => !b.marked.includes(c.k));
    if (next) return step({type: 'mark', cell: next.k, side: next.a > next.b ? 0 : 1}, bigger(next));
    if (b.chosen === null) return step({type: 'choose', deck: winnerOf(q)}, 'Count the pairs in each colour.');
    return step({type: 'best', deck: null}, 'Look at each deck in turn. Which deck beats it?');
  }
  if (q.mode === 'menu') {
    if (!missing.length) return all();
    if (missing.includes(String(b.value))) return step({type: 'keep'}, 'Keep this card.');
    return step({type: 'pick', value: Number(missing[0])}, `Try ${missing[0]}.`);
  }
  if (q.mode === 'swaps') {
    if (!missing.length) return all();
    if (b.swap) return missing.includes(swapKey(...b.swap)) ? step({type: 'keep'}, 'Keep this swap.') : step({type: 'again'}, 'Swap back.');
    return swapStep(missing[0].split('-').map(Number));
  }
  if (q.mode === 'deal') {
    const pool = targets(q);
    return pool.length ? swapStep(stepToward(b.decks, nearest(b.decks, pool))) : step({type: 'cant'}, 'No deal works. Press Can’t.');
  }
  if (!missing.length) return all();
  if (missing.includes(dealKey(b.decks))) return step({type: 'keep'}, 'Keep these decks.');
  return swapStep(stepToward(b.decks, nearest(b.decks, missing.map(parseKey))));
}

// Drawing.
const tag = name => `<span class="deck-tag deck-${name}" aria-hidden="true">${name}</span>`;
const dots = n => n ? `<span class="deck-dots" aria-hidden="true">${'<i></i>'.repeat(n)}</span>` : '';
// A card: a numeral with its dots, in its deck's colour; a button when it can move.
function card(v, name, o = {}) {
  const cls = `deck-card deck-${name}${v === null ? ' blank' : ''}${o.picked ? ' picked' : ''}${o.hinted ? ' hinted' : ''}${o.moved ? ' moved' : ''}${o.waiting ? ' waiting' : ''}${o.trial ? ' trial' : ''}`;
  const face = v === null ? '<b>?</b>' : `<b>${v}</b>${dots(v)}`;
  if (!o.button) return `<span class="${cls}" role="img" aria-label="${esc(o.label || (v === null ? 'an empty place' : String(v)))}">${face}${o.pin ? '<span class="case-pin" aria-hidden="true"></span>' : ''}</span>`;
  return `<button type="button" class="${cls}" data-card="${v}" data-focus="card-${v}" aria-pressed="${!!o.picked}" aria-label="${esc(o.label)}"${o.still ? ' disabled' : ''}>${face}</button>`;
}
// The decks, a row each. `cardOf(v, i, k)` draws the card at place k of deck i.
function decksHTML(q, d, cardOf = (v, i) => card(v, namesOf(q)[i])) {
  const names = namesOf(q);
  return `<div class="deck-decks" role="group" aria-label="The decks">${d.map((x, i) => `<div class="deck-row" role="group" aria-label="${esc(`Deck ${names[i]}`)}">${tag(names[i])}<div class="deck-cards">${x.map((v, k) => cardOf(v, i, k)).join('')}</div></div>`).join('')}</div>`;
}
// One comparison: each pair in its winner's colour, the winning card ringed.
// In a pairs puzzle (o.pairs) a pair not yet marked shows its two cards as
// buttons; the smaller one only says which is bigger. o.lost rings the pairs
// of one card (a certificate). o.quiet leaves out the verdict (find every:
// Keep checks).
function cellHTML(c, X, Y, o) {
  const name = `${X} ${c.a ?? 'empty'} against ${Y} ${c.b ?? 'empty'}`;
  if (c.a === null || c.b === null) return `<span class="deck-cell empty" role="img" aria-label="${esc(name)}"><i class="deck-${X}">${c.a ?? '?'}</i><i class="deck-${Y}">${c.b ?? '?'}</i></span>`;
  const w = c.a > c.b ? 0 : 1, W = w ? Y : X;
  if (o.pairs && !o.marked.includes(c.k)) {
    const act = s => s === w ? `data-deck-move="${esc(JSON.stringify({type: 'mark', cell: c.k, side: s}))}"` : `data-deck-say="${esc(bigger(c))}"`;
    const side = (v, s, N, other) => `<button type="button" class="deck-pair deck-${N}${o.hint?.cell === c.k && o.hint.side === s ? ' hinted' : ''}" ${act(s)} data-focus="pair-${c.k}-${s}" aria-label="${esc(`${N} ${v}, against ${other}`)}"${o.still ? ' disabled' : ''}>${v}</button>`;
    return `<span class="deck-cell open" role="group" aria-label="${esc(name)}">${side(c.a, 0, X, `${Y} ${c.b}`)}${side(c.b, 1, Y, `${X} ${c.a}`)}</span>`;
  }
  const lost = o.lost !== undefined && (c.a === o.lost || c.b === o.lost);
  return `<span class="deck-cell win-${W}${lost ? ' lost' : ''}" role="img" aria-label="${esc(`${name}: ${W} wins`)}"><i class="deck-${X}${w ? '' : ' won'}">${c.a}</i><i class="deck-${Y}${w ? ' won' : ''}">${c.b}</i></span>`;
}
export function verdict(x, y, X, Y) {
  const p = wins(x, y), q = wins(y, x);
  return p > q ? `${tag(X)} beats ${tag(Y)}<span class="sr-only">${X} beats ${Y}</span>` : q > p ? `${tag(Y)} beats ${tag(X)}<span class="sr-only">${Y} beats ${X}</span>` : `${tag(X)} and ${tag(Y)} tie<span class="sr-only">${X} and ${Y} tie</span>`;
}
function gridHTML(x, y, X, Y, o = {}) {
  const complete = !x.includes(null) && !y.includes(null);
  const said = o.pairs || o.quiet ? '' : `<p class="deck-verdict">${complete ? verdict(x, y, X, Y) : ''}</p>`;
  return `<figure class="deck-grid${o.pairs ? ' pairs' : ''}" role="group" aria-label="${X} against ${Y}"><figcaption aria-hidden="true">${tag(X)} against ${tag(Y)}</figcaption><div class="deck-cells" style="--cols:${y.length}">${cellsOf(x, y).map(c => cellHTML(c, X, Y, o)).join('')}</div>${said}</figure>`;
}
const gridsHTML = (q, d, o = {}) => { const names = namesOf(q); return `<div class="deck-grids">${comparisons(d.length).map(([i, j]) => gridHTML(d[i], d[j], names[i], names[j], o)).join('')}</div>`; };
const focusOf = a => `deck-${a.type}${a.deck ?? ''}${a.value ?? ''}${a.match ?? ''}${a.n ?? ''}`;
const button = (label, action, cls = '', extra = '') => `<button type="button" class="secondary case-action ${cls}" data-deck-move="${esc(JSON.stringify(action))}" data-focus="${focusOf(action)}" ${extra}>${label}</button>`;
const note = text => `<p class="case-note" role="status">${text}</p>`;
// A refused Keep names each win that is missing: "C doesn't beat A."
const WANTED = {beat: [[0, 1]], beatBA: [[1, 0]], cycle: ARROWS};
const missingWins = (q, d) => WANTED[q.goal].filter(([i, j]) => !beats(d[i], d[j])).map(([i, j]) => `${namesOf(q)[i]} doesn’t beat ${namesOf(q)[j]}.`);
const sayVerdicts = (q, d) => comparisons(d.length).map(([i, j]) => { const X = namesOf(q)[i], Y = namesOf(q)[j], p = wins(d[i], d[j]), r = wins(d[j], d[i]); return p > r ? `${X} beats ${Y}.` : r > p ? `${Y} beats ${X}.` : `${X} and ${Y} tie.`; }).join(' ');
// Small pictures for shelves and catalogs.
const tile = (v, name) => `<i class="deck-${name}">${v}</i>`;
const dealMini = (key, names = NAMES) => `<span class="deck-mini">${parseKey(key).map((x, i) => `<span class="deck-mini-row">${x.map(v => tile(v, names[i])).join('')}</span>`).join('')}</span>`;
const sayDeal = (key, names = NAMES) => parseKey(key).map((x, i) => `${names[i]} ${x.join(', ')}`).join('; ');
const swapMini = key => { const [a, b] = key.split('-'); return `<span class="deck-mini deck-swap">${tile(a, 'A')}<span aria-hidden="true">⇄</span>${tile(b, 'B')}</span>`; };
const saySwap = key => { const [a, b] = key.split('-'); return `A’s ${a} with B’s ${b}`; };
// The cycle of puzzle 3's decks, shown once it is solved.
const loopHTML = d => `<p class="deck-loop">${ARROWS.map(([i, j]) => `<span>${verdict(d[i], d[j], NAMES[i], NAMES[j])}</span>`).join('')}</p>`;

// Certificates after a find-every or Can't.
const BIG = ['No big win', 'One big win', 'Two big wins', 'Three big wins'];
function certificate(q) {
  const deals = dealsOf(q), low = Math.min(...q.decks.flat()), cap = text => `<p class="deck-why">${text}</p>`;
  if (q.certificate === 'one') return cap(`Card ${low} loses every pair it is in, so its deck never wins more than half of its pairs.`);
  if (q.certificate === 'splits') {
    const score = key => { const [x, y] = parseKey(key), s = [wins(x, y), wins(y, x)].sort(byValue).reverse(); return s.join('-'); };
    const keys = deals.filter(d => d[0].includes(low)).map(dealKey), columns = [...new Set(keys.map(score))].sort();
    return cap(`Every way to split the cards, with ${low} in A. The nine pairs never split evenly.`) + catalogHTML(keys, columns.map(s => ({id: s, label: s.replace('-', ' to ')})), score, {mini: dealMini, say: key => `${sayDeal(key)}: ${score(key).replace('-', ' to ')}`, label: 'Every split', mark: () => ''});
  }
  // Every cycle, by its big wins.
  const keys = deals.filter(isCycle).map(dealKey), big = key => String(bigWins(parseKey(key)));
  const columns = [...new Set(keys.map(big))].sort();
  return cap('Every cycle, by its big wins. None has three.') + catalogHTML(keys, columns.map(n => ({id: n, label: BIG[n]})), big, {mini: dealMini, say: key => `${sayDeal(key)}: ${BIG[big(key)].toLowerCase()}`, label: 'Every cycle', mark: key => GOALS[q.goal](parseKey(key)) ? 'yes' : ''});
}
// Every deal with the pinned cards in place, in columns by A's other cards;
// each shows B's and C's other cards.
function pinnedCatalog(q) {
  const pins = pinsOf(q), free = (x, i) => x.filter(v => !pins[i].includes(v));
  const keys = dealsOf(q).map(dealKey), column = key => free(parseKey(key)[0], 0).join('-');
  const columns = [...new Set(keys.map(column))].sort();
  const mini = key => `<span class="deck-mini">${parseKey(key).slice(1).map((x, i) => `<span class="deck-mini-row">${free(x, i + 1).map(v => tile(v, NAMES[i + 1])).join('')}</span>`).join('')}</span>`;
  return catalogHTML(keys, columns.map(c => ({id: c, label: `${tag('A')}${c.split('-').map(v => tile(v, 'A')).join('')}<span class="sr-only">A ${c.replace('-', ' and ')}</span>`})), column, {mini, say: sayDeal, label: 'Every deal', mark: key => GOALS[q.goal](parseKey(key)) ? 'yes' : 'no'});
}
// Every card of the menu, in columns by the first win it misses.
function menuCatalog(q) {
  const names = namesOf(q), column = key => missingWins(q, filled(q, Number(key)))[0] || 'yes';
  const keys = q.menu.map(String), ids = [...new Set(keys.map(column))].sort((x, y) => (x === 'yes' ? -1 : y === 'yes' ? 1 : 0));
  return catalogHTML(keys, ids.map(id => ({id, label: id === 'yes' ? 'It works' : esc(id.slice(0, -1))})), column, {mini: key => `<span class="deck-mini">${tile(key, names[0])}</span>`, say: key => `${key}: ${column(key) === 'yes' ? 'it works' : column(key).slice(0, -1)}`, label: 'Every card', mark: key => column(key) === 'yes' ? 'yes' : 'no'});
}
function swapCatalog(q) {
  return catalogHTML(allSwaps(q), q.decks[0].map(a => ({id: String(a), label: `${tag('A')}${tile(a, 'A')}<span class="sr-only">A’s ${a}</span>`})), key => key.split('-')[0], {mini: swapMini, say: saySwap, label: 'Every swap', mark: key => swapTargets(q).includes(key) ? 'yes' : 'no'});
}

// View-only state: the card picked first for a swap, or what a tap on the
// smaller card of a pair said, with the move count it belongs to. Any move,
// Undo or applied hint changes the count and clears both.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, say: null, at: null}); return uiState.get(p.id); };
const current = (state, a) => { if (state.at !== a.moves) Object.assign(state, {pick: null, say: null}); return state; };
// The decks as shown, where cards can be swapped.
const shown = (p, b) => p.parameters.mode === 'swaps' ? swapped(p.parameters, b.swap) : b.decks || p.parameters.decks;
const sayDecks = (q, d) => d.map((x, i) => `${namesOf(q)[i]}: ${x.map(v => v ?? 'empty').join(', ')}.`).join(' ');

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, solved = solvedPuzzle(p, b), names = namesOf(q), state = current(ui(p), a);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action;
  const hinted = (type, more = () => true) => h?.type === type && more(h) ? 'hinted' : '';
  const wrap = (...parts) => `<div class="deck-puzzle" data-mechanic-wire="decks">${parts.join('')}</div>`;
  const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
  const claimButton = () => button('That’s all', {type: 'claim'}, hinted('claim'), b.kept.length && !b.missed ? '' : 'disabled');
  const missed = () => b.missed && !solved ? note('There’s another.') : '';
  if (q.mode === 'pairs') {
    const all = b.marked.length === q.decks[0].length * q.decks[1].length, chosen = b.chosen !== null;
    // A deck already refused stays greyed.
    const choose = i => button(`${tag(names[i])} wins more`, {type: 'choose', deck: i}, hinted('choose', x => x.deck === i), `aria-label="${names[i]} wins more pairs"${all && !(b.missed && i !== winnerOf(q)) ? '' : ' disabled'}`);
    const actions = chosen ? '' : `<div class="case-actions">${choose(0)}${choose(1)}</div>`;
    const grid = gridHTML(q.decks[0], q.decks[1], names[0], names[1], {pairs: true, marked: b.marked, hint: h?.type === 'mark' ? h : null, still: chosen});
    const said = chosen ? `<p class="deck-verdict">${verdict(q.decks[0], q.decks[1], names[0], names[1])}</p>` : '';
    // Puzzle 3: with puzzles 1 and 2, does any deck beat both others?
    const answer = (i, label, aria) => button(label, {type: 'best', deck: i}, hinted('best', x => x.deck === i), `aria-label="${aria}"${i !== null && b.guess === i ? ' disabled' : ''}`);
    const beater = i => NAMES[ARROWS.find(([, j]) => j === i)[0]];
    const ask = !q.loop || !chosen ? '' : solved ? `${loopHTML(q.loop)}<p class="deck-why">No deck beats both others: each beats one and loses to one.</p>`
      : `${loopHTML(q.loop)}<p class="deck-ask">Does any deck beat both others?</p><div class="case-actions">${NAMES.map((N, i) => answer(i, tag(N), `${N} does`)).join('')}${answer(null, 'No', 'No deck does')}</div>${b.guess !== null ? note(`${beater(b.guess)} beats ${NAMES[b.guess]}.`) : ''}`;
    return wrap(decksHTML(q, q.decks), grid, actions, b.missed && !chosen ? note('Count again.') : '', state.say && !chosen ? note(esc(state.say)) : '', said, ask);
  }
  // Cards that can be swapped: a tap picks one, a tap on a card in another deck swaps them.
  const movable = v => !solved && !pinned(q, v) && (q.mode !== 'swaps' || !b.swap);
  if (state.pick !== null && !(shown(p, b).some(x => x.includes(state.pick)) && movable(state.pick))) state.pick = null;
  const swapCard = (v, i) => pinned(q, v) ? card(v, names[i], {pin: true, label: `${v} in deck ${names[i]}, stays put`})
    : card(v, names[i], {button: true, picked: state.pick === v, still: !movable(v), hinted: h?.type === 'swap' && (h.a === v || h.b === v), moved: q.mode === 'swaps' && b.swap?.includes(v), waiting: q.mode === 'swaps' && !solved && b.swap && !b.swap.includes(v), label: `${v} in deck ${names[i]}${state.pick === v ? ', picked' : ''}`});
  const picked = state.pick !== null ? ` Picked ${state.pick}.` : '';
  if (q.mode === 'menu') {
    const d = filled(q, b.value), kept = b.value !== null && b.kept.includes(String(b.value));
    // The empty place shows the card being tried, dashed.
    const decks = decksHTML(q, q.decks, (v, i) => v !== null ? card(v, names[i]) : card(b.value, names[i], {trial: true, label: b.value === null ? 'the empty place' : `${b.value}, tried in the empty place`}));
    const menu = `<div class="deck-menu" role="group" aria-label="Cards to try">${q.menu.map(v => `<button type="button" class="deck-card deck-${names[0]} menu${hinted('pick', x => x.value === v) ? ' hinted' : ''}" data-deck-move="${esc(JSON.stringify({type: 'pick', value: v}))}" data-focus="deck-pick${v}" aria-pressed="${b.value === v}" aria-label="Try ${v}"${solved ? ' disabled' : ''}><b>${v}</b>${dots(v)}</button>`).join('')}</div>`;
    const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), b.value === null || b.wrong || kept ? 'disabled' : '')}${claimButton()}</div>`;
    const shelf = solved ? '' : shelfHTML(b.kept, {mini: key => `<span class="deck-mini">${tile(key, names[0])}</span>`, say: key => `${key} in the empty place`, current: kept ? String(b.value) : null, label: 'Cards kept'});
    return wrap(decks, menu, actions, b.wrong ? note(missingWins(q, d).join(' ')) : '', missed(), shelf, gridsHTML(q, d, {quiet: true}), solved ? menuCatalog(q) : '', status(sayDecks(q, d)));
  }
  if (q.mode === 'swaps') {
    const d = swapped(q, b.swap), key = b.swap ? swapKey(...b.swap) : null, kept = key !== null && b.kept.includes(key);
    const actions = solved ? '' : `<div class="case-actions">${button('Swap back', {type: 'again'}, hinted('again'), b.swap ? '' : 'disabled')}${button('Keep', {type: 'keep'}, hinted('keep'), !b.swap || b.wrong || kept ? 'disabled' : '')}${claimButton()}</div>`;
    const shelf = solved ? '' : shelfHTML(b.kept, {mini: swapMini, say: saySwap, current: kept ? key : null, label: 'Swaps kept'});
    return wrap(decksHTML(q, d, swapCard), actions, b.wrong ? note(missingWins(q, d).join(' ')) : '', missed(), shelf, gridsHTML(q, d, {quiet: true}), solved ? swapCatalog(q) : '', status(sayDecks(q, d) + picked));
  }
  const decks = decksHTML(q, b.decks, swapCard);
  if (q.mode === 'deal') {
    const actions = solved ? '' : `<div class="case-actions">${button('Can’t', {type: 'cant'}, hinted('cant'), b.cant ? 'disabled' : '')}</div>`;
    const proof = solved && b.cant;
    const grids = gridsHTML(q, b.decks, {lost: proof && q.certificate === 'one' ? Math.min(...q.decks.flat()) : undefined});
    return wrap(decks, actions, b.cant && !solved ? note('Keep looking.') : '', grids, proof ? certificate(q) : '', status(`${sayDecks(q, b.decks)} ${sayVerdicts(q, b.decks)}${picked}`));
  }
  const key = dealKey(b.decks), kept = b.kept.includes(key);
  const actions = solved ? '' : `<div class="case-actions">${button('Keep', {type: 'keep'}, hinted('keep'), b.wrong || kept ? 'disabled' : '')}${claimButton()}</div>`;
  const shelf = solved ? '' : shelfHTML(b.kept, {mini: dealMini, say: sayDeal, current: kept ? key : null, label: 'Decks kept'});
  return wrap(decks, actions, b.wrong ? note(missingWins(q, b.decks).join(' ')) : '', missed(), shelf, gridsHTML(q, b.decks, {quiet: true}), solved ? pinnedCatalog(q) : '', status(sayDecks(q, b.decks) + picked));
}

// The playground: swap cards freely, choose two decks, and draw rounds: a card
// from each, the bigger wins. The rounds pile up by winner, beside the grid of
// every pair. At most sixty rounds; changing the decks or the match clears them.
export const PLAY_ROUNDS = 60;
function freshPlay(p) { return {decks: p.parameters.decks.map(x => [...x]), match: 0, rounds: []}; }
function validPlay(p, b) {
  if (!object(b) || !validDeal(p.parameters, b.decks) || ![0, 1, 2].includes(b.match) || !Array.isArray(b.rounds) || b.rounds.length > PLAY_ROUNDS || Object.keys(b).length !== 3) return false;
  const [i, j] = ARROWS[b.match];
  return b.rounds.every(r => Array.isArray(r) && r.length === 2 && b.decks[i].includes(r[0]) && b.decks[j].includes(r[1]));
}
function movePlay(p, b, action, random = Math.random) {
  if (!validPlay(p, b) || !object(action)) return null;
  switch (action.type) {
    case 'swap': { const decks = swapCards(b.decks, action.a, action.b); return decks ? {...b, decks, rounds: []} : null; }
    case 'match': return [0, 1, 2].includes(action.match) && action.match !== b.match ? {...b, match: action.match, rounds: []} : null;
    case 'random': {
      if (action.n !== undefined && action.n !== 10) return null;
      const n = action.n === 10 ? 10 : 1, [i, j] = ARROWS[b.match];
      if (b.rounds.length + n > PLAY_ROUNDS) return null;
      const draw = x => x[Math.min(x.length - 1, Math.floor(random() * x.length))];
      return {...b, rounds: [...b.rounds, ...Array.from({length: n}, () => [draw(b.decks[i]), draw(b.decks[j])])]};
    }
    case 'clear': return b.rounds.length ? {...b, rounds: []} : null;
  }
  return null;
}
function renderPlay(p, a) {
  const b = a.board, q = p.parameters, state = current(ui(p), a), [i, j] = ARROWS[b.match], X = NAMES[i], Y = NAMES[j];
  if (state.pick !== null && deckOf(b.decks, state.pick) < 0) state.pick = null;
  const decks = decksHTML(q, b.decks, (v, k) => card(v, NAMES[k], {button: true, picked: state.pick === v, label: `${v} in deck ${NAMES[k]}${state.pick === v ? ', picked' : ''}`}));
  const matches = `<div class="case-tools" role="group" aria-label="Which decks play">${ARROWS.map(([x, y], m) => button(`${tag(NAMES[x])}<span aria-hidden="true">against</span>${tag(NAMES[y])}`, {type: 'match', match: m}, 'case-tool', `aria-pressed="${b.match === m}" aria-label="${NAMES[x]} against ${NAMES[y]}"`)).join('')}</div>`;
  const room = PLAY_ROUNDS - b.rounds.length;
  const actions = `<div class="case-actions">${button('Draw', {type: 'random'}, '', room >= 1 ? '' : 'disabled')}${button('Draw 10', {type: 'random', n: 10}, '', room >= 10 ? '' : 'disabled')}${button('Clear', {type: 'clear'}, '', b.rounds.length ? '' : 'disabled')}</div>`;
  const keys = b.rounds.map(r => r.join('-')), winner = key => { const [x, y] = key.split('-').map(Number); return x > y ? X : Y; };
  const mini = key => { const [x, y] = key.split('-'); return `<span class="deck-mini deck-round">${tile(x, X)}${tile(y, Y)}</span>`; };
  const piles = binsHTML(keys, [X, Y].map(n => ({id: n, label: `${tag(n)} wins<span class="sr-only">${n} wins</span>`})), winner, {mini, say: key => `${X} ${key.split('-')[0]} against ${Y} ${key.split('-')[1]}`, always: true, label: 'Rounds, by the winner'});
  const last = b.rounds.at(-1), n = name => keys.filter(k => winner(k) === name).length;
  const said = `${sayDecks(q, b.decks)} ${X} against ${Y}. ${last ? `${X} ${last[0]}, ${Y} ${last[1]}. ` : ''}${X} has won ${n(X)}, ${Y} ${n(Y)}.`;
  return `<div class="deck-play" data-mechanic-wire="decks">${decks}${matches}${actions}${gridHTML(b.decks[i], b.decks[j], X, Y)}${piles}<p class="sr-only" role="status">${esc(said)}</p></div>`;
}

const isPlay = p => p.parameters.mode === 'playground';
let pending = null;
function wire(root, p, api) {
  const state = ui(p);
  const apply = action => { pending = {id: p.id, moves: api.attempt().moves, action}; state.pick = null; api.apply(action); };
  const at = () => api.attempt().moves;
  root.addEventListener('click', e => {
    const say = e.target.closest('[data-deck-say]');
    if (say && root.contains(say) && !say.disabled) { api.ui({say: say.dataset.deckSay, moves: at()}); return; }
    const control = e.target.closest('[data-deck-move]');
    if (control && root.contains(control)) {
      if (control.disabled || control.getAttribute('aria-pressed') === 'true') return;
      try { apply(JSON.parse(control.dataset.deckMove)); } catch { /* malformed control data is ignored */ }
      return;
    }
    const el = e.target.closest('button[data-card]');
    if (!el || !root.contains(el) || el.disabled) return;
    // Tap a card, then a card in another deck: they swap. Another card in the
    // same deck is picked instead, and the picked card again puts it down.
    const v = Number(el.dataset.card), first = state.pick, d = shown(p, api.attempt().board);
    if (first === null) api.ui({pick: v, moves: at()});
    else if (first === v) api.ui({pick: null, moves: at()});
    else if (deckOf(d, first) === deckOf(d, v)) api.ui({pick: v, moves: at()});
    else apply({type: 'swap', a: first, b: v});
  });
  const last = pending;
  pending = null;
  if (!last || last.id !== p.id || api.attempt().moves !== last.moves + 1) return;
  const b = api.attempt().board;
  // Two cards just swapped settle; a case just kept arrives on the shelf.
  if (last.action.type === 'swap') for (const v of [last.action.a, last.action.b]) root.querySelector(`[data-card="${v}"]`)?.classList.add('arrived');
  if (last.action.type === 'keep' && !b.wrong) root.querySelector(`.case-shelf [data-key="${CSS.escape(b.kept.at(-1))}"]`)?.classList.add('fresh');
}

export const deckMechanics = {
  decks: {
    fresh: p => isPlay(p) ? freshPlay(p) : freshPuzzle(p),
    valid: (p, b) => isPlay(p) ? validPlay(p, b) : validPuzzle(p, b),
    solved: (p, b) => isPlay(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => isPlay(p) ? movePlay(p, b, action, random) : movePuzzle(p, b, action),
    hint: (p, b) => isPlay(p) ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => isPlay(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload) || !Number.isSafeInteger(payload.moves)) return;
      const state = ui(p);
      state.at = payload.moves;
      if (Object.hasOwn(payload, 'pick')) state.pick = Number.isInteger(payload.pick) ? payload.pick : null;
      if (Object.hasOwn(payload, 'say')) state.say = typeof payload.say === 'string' ? payload.say.slice(0, 60) : null;
    },
    reset: p => { uiState.delete(p.id); },
    noHint: isPlay
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'decks',
  family: {id: 'decks', symbol: '♢'},
  mechanics: deckMechanics,
  pack: new URL('./decks.json', import.meta.url).href,
  css: new URL('./decks.css', import.meta.url).href,
  focus: 'button.deck-card:not([disabled]),button.deck-pair:not([disabled]),.case-action:not([disabled])'
};
