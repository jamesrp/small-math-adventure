// Paint rows (worksheet Week 46 and its bonus). Rows of two-sided tiles,
// yellow or blue, and cards that act on every row at once. A paint card shows
// a tile yellow or blue whatever it showed before; a turn card turns a tile
// over; a copy card gives one tile's colour to another, in each row separately;
// the shift card moves every tile one place left, the first to the end. A
// card is a string: one character per tile ('.' leaves it, 'Y' or 'B' paints
// it, 'F' turns it), 'C12' for a copy from tile 1 to tile 2, or '<' for the
// shift.
//
// Painting forgets: after a tile is painted, every row shows the same colour
// there, and no later card can make rows differ at that tile again. So two
// rows need exactly one paint card for each tile where they differ (their
// Hamming distance), and a story makes every start finish alike exactly when
// it paints every tile; u unpainted tiles leave 2^u different finishes. A turn
// card is a bijection on rows: it keeps every difference, so turns alone never
// make two different rows match. With turns mixed in, a painted tile finishes
// as its last paint, turned over once for each later turn. Copies never change
// an all-yellow or all-blue row, so copies alone never join those two; the
// shift is a bijection too, so joining every start with "paint tile 1" and the
// shift takes 2n − 1 cards, S(TS)^(n−1).
import {esc, actionButton} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const COLOUR = {Y: 'yellow', B: 'blue'};
export const other = c => c === 'Y' ? 'B' : 'Y';
export const BUDGET_CAP = 40;

// One card on one row.
export function apply(card, row) {
  if (card === '<') return row.slice(1) + row[0];
  if (card[0] === 'C') { const from = Number(card[1]) - 1, to = Number(card[2]) - 1; return row.slice(0, to) + row[from] + row.slice(to + 1); }
  let out = '';
  for (let i = 0; i < row.length; i++) out += card[i] === '.' ? row[i] : card[i] === 'F' ? other(row[i]) : card[i];
  return out;
}
export const cardFits = (n, card) => typeof card === 'string' && (card === '<' || (/^C\d\d$/.test(card) && card[1] !== card[2] && [card[1], card[2]].every(d => d >= 1 && d <= n)) || (new RegExp(`^[.YBF]{${n}}$`).test(card) && /[YBF]/.test(card)));
// Every row of n tiles, yellow-first order: YYY, YYB, YBY, ….
export const allRows = n => Array.from({length: 2 ** n}, (_, k) => Array.from({length: n}, (_, i) => (k >> (n - 1 - i)) & 1 ? 'B' : 'Y').join(''));
export const startsOf = q => q.rows === 'all' ? allRows(q.slots) : q.rows;
export const rowsAfter = (q, cards, starts = startsOf(q)) => starts.map(r => cards.reduce((row, card) => apply(card, row), r));
export const storyCards = (q, story) => story.map(k => q.hand[k]);
export const distinct = rows => [...new Set(rows)];
export const goalMet = (q, rows) => rows.every(r => r === rows[0]) && (!q.target || rows[0] === q.target);
const rowsOk = (n, rows) => Array.isArray(rows) && rows.length >= 1 && rows.every(r => typeof r === 'string' && new RegExp(`^[YB]{${n}}$`).test(r));

// Whether two rows can ever be made alike: a search over pairs of rows, since
// one card moves both. "Can't" names two rows on the table; the claim stands
// when they came from two starts that no run of cards can join.
const joins = new Map();
export function canJoin(q, a, b) {
  const key = JSON.stringify([q.hand, [a, b].sort()]);
  if (joins.has(key)) return joins.get(key);
  const seen = new Set([[a, b].sort().join()]), queue = [[a, b]];
  let found = false;
  while (queue.length && !found) {
    const [x, y] = queue.shift();
    if (x === y) { found = true; break; }
    for (const card of q.hand) {
      const pair = [apply(card, x), apply(card, y)].sort(), id = pair.join();
      if (!seen.has(id)) { seen.add(id); queue.push(pair); }
    }
  }
  joins.set(key, found);
  return found;
}
// The first pair of starts that can never be joined, if any, in sorted order.
export function apart(q) {
  const starts = startsOf(q);
  for (let i = 0; i < starts.length; i++) for (let j = i + 1; j < starts.length; j++) if (!canJoin(q, starts[i], starts[j])) return [starts[i], starts[j]].sort();
  return null;
}
// Starts that now sit on the stack showing row r.
const startsOn = (q, cards, r) => startsOf(q).filter(s => cards.reduce((row, c) => apply(c, row), s) === r);
function claimFor(q, cards, rows) {
  const [a, b] = rows.map(r => startsOn(q, cards, r));
  for (const x of a) for (const y of b) if (!canJoin(q, x, y)) return [x, y].sort();
  return null;
}

// The fewest cards from these rows to the goal, by breadth-first search over
// the set of different rows (every row moves the same way, so the set is all
// that matters). Returns the cards to play, or null when the limit is too
// small.
const searches = new Map();
export function shortest(q, rows, limit = BUDGET_CAP) {
  const key = JSON.stringify([q.hand, q.target || null, distinct(rows).sort(), limit]);
  if (searches.has(key)) return searches.get(key);
  const start = distinct(rows).sort(), id = r => r.join(), back = new Map([[id(start), null]]);
  let frontier = [start], found = goalMet(q, start) ? start : null;
  for (let depth = 0; !found && depth < limit && frontier.length; depth++) {
    const next = [];
    for (const set of frontier) {
      for (let k = 0; k < q.hand.length && !found; k++) {
        const moved = distinct(set.map(r => apply(q.hand[k], r))).sort();
        if (back.has(id(moved))) continue;
        back.set(id(moved), [id(set), k]);
        if (goalMet(q, moved)) found = moved; else next.push(moved);
      }
      if (found) break;
    }
    frontier = next;
  }
  let path = null;
  if (found) {
    path = [];
    for (let at = id(found); back.get(at); at = back.get(at)[0]) path.unshift(back.get(at)[1]);
  }
  searches.set(key, path);
  return path;
}
export const budgetOf = q => q.budget ?? BUDGET_CAP;

// The puzzle's save: the story of cards played (indices into the hand), and a
// "Can't" claim, kept when right and shown once when refused.
const startPair = (q, pair) => Array.isArray(pair) && pair.length === 2 && pair[0] < pair[1] && pair.every(r => startsOf(q).includes(r));
function validPuzzle(p, b) {
  const q = p.parameters;
  if (!object(b) || Object.keys(b).sort().join() !== 'claimed,refused,story') return false;
  if (!Array.isArray(b.story) || b.story.length > budgetOf(q) || !b.story.every(k => Number.isInteger(k) && k >= 0 && k < q.hand.length)) return false;
  if (b.claimed !== null && !(q.cant && startPair(q, b.claimed) && !canJoin(q, ...b.claimed))) return false;
  if (b.refused !== null && !(q.cant && startPair(q, b.refused) && canJoin(q, ...b.refused))) return false;
  return b.claimed === null || b.refused === null;
}
const solvedPuzzle = (p, b) => validPuzzle(p, b) && (b.claimed !== null || goalMet(p.parameters, rowsAfter(p.parameters, storyCards(p.parameters, b.story))));
function movePuzzle(p, b, action) {
  const q = p.parameters;
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  if (action.type === 'play') {
    if (!Number.isInteger(action.card) || action.card < 0 || action.card >= q.hand.length || b.story.length >= budgetOf(q)) return null;
    return {story: [...b.story, action.card], claimed: null, refused: null};
  }
  if (action.type === 'cant') {
    const cards = storyCards(q, b.story), rows = distinct(rowsAfter(q, cards));
    if (!q.cant || !Array.isArray(action.rows) || action.rows.length !== 2 || action.rows[0] === action.rows[1] || !action.rows.every(r => rows.includes(r))) return null;
    const pair = claimFor(q, cards, action.rows);
    return pair ? {...b, claimed: pair, refused: null} : {...b, claimed: null, refused: [startsOn(q, cards, action.rows[0])[0], startsOn(q, cards, action.rows[1])[0]].sort()};
  }
  return null;
}

// Words for a card, used by hints and screen readers: "tile 2 blue",
// "turn tile 3", "tiles 1 and 2 yellow".
const list = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
export function cardWords(card) {
  if (card === '<') return 'shift every tile one place left';
  if (card[0] === 'C') return `copy tile ${card[1]} to tile ${card[2]}`;
  const parts = [];
  for (const c of ['Y', 'B', 'F']) {
    const tiles = [...card].map((x, i) => x === c ? i + 1 : null).filter(Boolean);
    if (!tiles.length) continue;
    const name = `${tiles.length > 1 ? 'tiles' : 'tile'} ${list(tiles.map(String))}`;
    parts.push(c === 'F' ? `turn ${name}` : `${name} ${COLOUR[c]}`);
  }
  return list(parts);
}
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

// Hints: the first card of a shortest finish within the cards left; Can't and
// two rows that never join once the search shows no finish at all; Undo when
// the budget is spent.
function plan(p, b) {
  const q = p.parameters, rows = rowsAfter(q, storyCards(q, b.story)), left = budgetOf(q) - b.story.length;
  const path = shortest(q, rows, left);
  if (path && path.length) return {type: 'move', action: {type: 'play', card: path[0]}, text: `${capital(cardWords(q.hand[path[0]]))}.`};
  const pair = q.cant ? apart(q) : null;
  if (pair) {
    const cards = storyCards(q, b.story), now = pair.map(s => cards.reduce((row, c) => apply(c, row), s));
    return {type: 'move', action: {type: 'cant', rows: now}, text: 'Two of these rows can never become one. Press Can’t and tap them both.'};
  }
  return {type: 'deadend', text: b.story.length ? 'Too few cards are left. Undo.' : 'Restart.'};
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  return plan(p, b);
}

// The playground: two random rows or every start, two to four tiles, every
// single-tile card, and Draw, which plays a random paint card as the
// worksheet's cup of six cards does.
const PLAY_SIZES = [2, 3, 4];
export const singleCards = n => Array.from({length: n}, (_, i) => ['Y', 'B', 'F'].map(c => Array.from({length: n}, (_, j) => j === i ? c : '.').join(''))).flat();
const randomRow = (n, random) => Array.from({length: n}, () => random() < 0.5 ? 'Y' : 'B').join('');
const freshPlay = () => ({slots: 3, rows: ['YBY', 'BYB'], story: []});
function validPlay(b) {
  if (!object(b) || Object.keys(b).sort().join() !== 'rows,slots,story' || !PLAY_SIZES.includes(b.slots)) return false;
  if (b.rows !== 'all' && !(rowsOk(b.slots, b.rows) && b.rows.length === 2)) return false;
  const cards = singleCards(b.slots);
  return Array.isArray(b.story) && b.story.length <= 200 && b.story.every(c => cards.includes(c));
}
function movePlay(b, action, random = Math.random) {
  if (!validPlay(b) || !object(action)) return null;
  const n = b.slots;
  if (action.type === 'play') return singleCards(n).includes(action.card) && b.story.length < 200 ? {...b, story: [...b.story, action.card]} : null;
  if (action.type === 'draw') {
    if (b.story.length >= 200) return null;
    const paints = singleCards(n).filter(c => !c.includes('F'));
    return {...b, story: [...b.story, paints[Math.min(paints.length - 1, Math.floor(random() * paints.length))]]};
  }
  if (action.type === 'clear') return b.story.length ? {...b, story: []} : null;
  if (action.type === 'size') return PLAY_SIZES.includes(action.slots) && action.slots !== n ? {slots: action.slots, rows: b.rows === 'all' ? 'all' : [randomRow(action.slots, random), randomRow(action.slots, random)], story: []} : null;
  if (action.type === 'rows') {
    if (action.rows === 'all') return b.rows === 'all' ? null : {...b, rows: 'all', story: []};
    if (action.rows === 'two') {
      let rows = [randomRow(n, random), randomRow(n, random)];
      if (rows[0] === rows[1]) rows = [rows[0], rows[0].replace(/./, c => other(c))];
      return {...b, rows, story: []};
    }
  }
  return null;
}

// Drawing. A tile is a rounded square, yellow or blue. A card is a small row
// of cells: painted where it paints, half-and-half with a turn arrow where it
// turns, dotted where it leaves the tile alone; a copy card draws an arrow
// from one cell to another, and the shift card an arrow under the row from its
// first cell round to its last.
const tile = (c, changed) => `<span class="paint-tile ${c === 'Y' ? 'y' : 'b'}${changed ? ' changed' : ''}" aria-hidden="true"></span>`;
const rowWords = row => [...row].map(c => COLOUR[c]).join(', ');
function rowHtml(row, before, cls = '', label = '') {
  return `<div class="paint-row${cls}" role="img" aria-label="${esc(label || rowWords(row))}">${[...row].map((c, i) => tile(c, before && before[i] !== c)).join('')}</div>`;
}
const TURN = '<svg viewBox="0 0 20 20"><path d="M5 9a5 5 0 0 1 9-3M15 11a5 5 0 0 1-9 3"/><path d="M14 2v4h-4M6 18v-4h4"/></svg>';
export function cardHtml(card, n = card.length) {
  if (card === '<' || card[0] === 'C') {
    const w = n * 22, x = i => 11 + 22 * i, cells = Array.from({length: n}, (_, i) => `<rect class="paint-face-cell" x="${x(i) - 8}" y="14" width="16" height="16" rx="3"/>`).join('');
    let art;
    if (card === '<') art = `${Array.from({length: n}, (_, i) => `<path class="paint-face-arrow" d="M${x(i) + 3} 22h-6m2.5-3-2.5 3 2.5 3"/>`).join('')}<path class="paint-face-arrow" d="M${x(0)} 31q${(x(n - 1) - x(0)) / 2} 9 ${x(n - 1) - x(0)} 0"/><path class="paint-face-arrow" d="M${x(n - 1) - 4} 30l4 1 1-4"/>`;
    else {
      const a = x(Number(card[1]) - 1), b = x(Number(card[2]) - 1), dir = b > a ? 1 : -1;
      art = `<circle class="paint-face-dot" cx="${a}" cy="22" r="3.5"/><path class="paint-face-arrow" d="M${a} 12Q${(a + b) / 2} ${Math.max(-2, 8 - Math.abs(b - a) / 3)} ${b} 12"/><path class="paint-face-arrow" d="M${b - 4 * dir} 8l${4 * dir} 4 ${-1 * dir} -5"/><rect class="paint-face-target" x="${b - 8}" y="14" width="16" height="16" rx="3"/>`;
    }
    return `<svg class="paint-face" viewBox="0 0 ${w} 40" width="${w}" height="40" aria-hidden="true">${cells}${art}</svg>`;
  }
  return `<span class="paint-card-cells" aria-hidden="true">${[...card].map(c => `<i class="paint-cell ${c === 'Y' ? 'y' : c === 'B' ? 'b' : c === 'F' ? 'f' : 'e'}">${c === 'F' ? TURN : ''}</i>`).join('')}</span>`;
}
const hinted = (shown, action) => shown && JSON.stringify(shown) === JSON.stringify(action) ? ' hinted' : '';
function cardButton(card, n, action, disabled, shown) {
  return actionButton(cardHtml(card, n), action, `aria-label="${esc(capital(cardWords(card)))}" ${disabled ? 'disabled' : ''}`).replace('class="secondary expansion-action"', `class="secondary expansion-action paint-card${hinted(shown, action)}"`);
}
// Every start, drawn as stacks: rows that have come to match sit on one stack
// with its count, in the place of the first start that reached it. While a
// Can't claim is being made, each stack is a button: the first tap picks it,
// a tap on another makes the claim.
function crowdHtml(rows, before, merged, claim) {
  const groups = [];
  rows.forEach((r, i) => { const g = groups.find(x => x.row === r); if (g) g.count++; else groups.push({row: r, count: 1, first: i}); });
  const big = rows[0].length >= 4 ? ' many' : '';
  return `<div class="paint-crowd${big}">${groups.map(g => {
    const label = `${g.count} ${g.count === 1 ? 'row' : 'rows'}: ${rowWords(g.row)}`, cls = `paint-stack${g.count > 1 ? ' stacked' : ''}${merged.has(g.row) ? ' merged' : ''}${claim.apart.includes(g.row) ? ' apart' : ''}`;
    const inner = `${rowHtml(g.row, before ? before[g.first] : null, '', label)}${g.count > 1 ? `<b class="paint-count" aria-hidden="true">×${g.count}</b>` : ''}`;
    if (!claim.picking) return `<div class="${cls}">${inner}</div>`;
    const picked = claim.picks.includes(g.row), mark = claim.shown?.includes(g.row) ? ' hinted' : '';
    if (claim.picks.length === 1 && !picked) return actionButton(inner, {type: 'cant', rows: [claim.picks[0], g.row]}, `aria-label="${esc(label)}"`).replace('class="secondary expansion-action"', `class="${cls} paint-pickable${mark}"`);
    return `<button type="button" class="${cls} paint-pickable${picked ? ' picked' : ''}${mark}" data-action="mechanic-ui" data-ui='${esc(JSON.stringify({pick: g.row}))}' aria-pressed="${picked}" aria-label="${esc(label)}">${inner}</button>`;
  }).join('')}</div>`;
}
function rowsHtml(q, rows, before, solved, claim = {picking: false, picks: [], apart: []}) {
  const all = q.rows === 'all';
  // A stack that gathered rows from two or more stacks on the last card.
  const merged = new Set(all && before ? distinct(rows).filter(r => new Set(rows.map((x, i) => x === r ? before[i] : null).filter(Boolean)).size > 1) : []);
  const body = all ? crowdHtml(rows, before, merged, claim) : `<div class="paint-pair">${rows.map((r, i) => rowHtml(r, before ? before[i] : null, ' big')).join('')}</div>`;
  const goal = q.target ? `<figure class="paint-goal"><div class="paint-row" role="img" aria-label="${esc(`Goal: ${rowWords(q.target)}`)}">${[...q.target].map(c => tile(c, false)).join('')}</div></figure>` : '';
  const apart = claim.apart.length ? `<p class="sr-only">${esc(`${capital(rowWords(claim.apart[0]))} and ${rowWords(claim.apart[1])} can never become one.`)}</p>` : '';
  return `<div class="paint-table${solved ? ' solved' : ''}${all ? ' all' : ' two'}${claim.picking ? ' picking' : ''}">${goal}<div class="paint-rows">${body}${apart}</div></div>`;
}
function storyHtml(q, cards, budget) {
  if (!cards.length && budget === null) return '';
  const empty = budget === null ? 0 : budget - cards.length;
  return `<ol class="paint-story" aria-label="Cards played">${cards.map(c => `<li class="paint-played"><span class="sr-only">${esc(capital(cardWords(c)))}</span>${cardHtml(c, q.slots)}</li>`).join('')}${Array.from({length: empty}, () => '<li class="paint-slot" aria-hidden="true"></li>').join('')}</ol>${budget === null ? '' : `<p class="sr-only">${budget - cards.length} of ${budget} cards left.</p>`}`;
}

const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, picks: []}); return uiState.get(p.id); };

function renderPuzzle(p, attempt) {
  const q = p.parameters, b = attempt.board, solved = solvedPuzzle(p, b), cards = storyCards(q, b.story);
  const rows = rowsAfter(q, cards), before = cards.length ? rowsAfter(q, cards.slice(0, -1)) : null;
  const shown = attempt.hintLevel >= 2 && !solved ? plan(p, b).action : null, full = b.story.length >= budgetOf(q);
  const state = ui(p), picking = q.cant && !solved && (state.claiming || shown?.type === 'cant');
  const now = r => cards.reduce((row, c) => apply(c, row), r);
  const claim = {picking, picks: picking ? state.picks.filter(r => rows.includes(r)) : [], shown: shown?.type === 'cant' ? shown.rows : null, apart: b.claimed ? b.claimed.map(now) : []};
  const hand = `<div class="paint-hand" role="group" aria-label="Cards">${q.hand.map((c, k) => cardButton(c, q.slots, {type: 'play', card: k}, solved || full || picking, shown)).join('')}</div>`;
  const cant = q.cant && !solved ? `<button type="button" class="secondary paint-cant${shown?.type === 'cant' && !picking ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !picking})}' aria-pressed="${picking}">Can’t</button>` : '';
  const note = b.refused ? '<p class="paint-note" role="status">Those two can still become one.</p>' : `<p class="sr-only" role="status">${esc(q.rows === 'all' ? `${distinct(rows).length} different ${distinct(rows).length === 1 ? 'row' : 'rows'}.` : rows.map(rowWords).join('. '))}</p>`;
  return `<div class="paint-board mode-${q.rows === 'all' ? 'all' : 'two'}">${rowsHtml(q, rows, before, solved, claim)}${storyHtml(q, cards, q.budget ?? null)}${hand}${cant ? `<div class="paint-tools">${cant}</div>` : ''}${note}</div>`;
}
function renderPlay(p, attempt) {
  const b = attempt.board, n = b.slots, q = {slots: n, rows: b.rows};
  const rows = rowsAfter(q, b.story), before = b.story.length ? rowsAfter(q, b.story.slice(0, -1)) : null;
  const choose = (label, action, on) => actionButton(label, action, `aria-pressed="${on}"`).replace('class="secondary expansion-action"', 'class="secondary expansion-action paint-choice"');
  const sizes = `<div class="paint-options" role="group" aria-label="Tiles">${PLAY_SIZES.map(k => choose(String(k), {type: 'size', slots: k}, k === n)).join('')}</div>`;
  const views = `<div class="paint-options" role="group" aria-label="Rows">${choose('Two rows', {type: 'rows', rows: 'two'}, b.rows !== 'all')}${choose('Every start', {type: 'rows', rows: 'all'}, b.rows === 'all')}</div>`;
  const hand = `<div class="paint-hand" role="group" aria-label="Cards">${singleCards(n).map(c => cardButton(c, n, {type: 'play', card: c}, b.story.length >= 200, null)).join('')}</div>`;
  const tools = `<div class="paint-tools">${actionButton('Draw', {type: 'draw'}, b.story.length >= 200 ? 'disabled' : '').replace('class="secondary expansion-action"', 'class="primary expansion-action paint-draw"')}${actionButton('Clear', {type: 'clear'}, b.story.length ? '' : 'disabled')}</div>`;
  const story = b.story.length ? `<ol class="paint-story" aria-label="Cards played">${b.story.slice(-24).map(c => `<li class="paint-played"><span class="sr-only">${esc(capital(cardWords(c)))}</span>${cardHtml(c)}</li>`).join('')}</ol>` : '';
  const status = `<p class="sr-only" role="status">${esc(b.rows === 'all' ? `${distinct(rows).length} different rows.` : rows.map(rowWords).join('. '))}</p>`;
  return `<div class="paint-board paint-play mode-${b.rows === 'all' ? 'all' : 'two'}"><div class="paint-settings">${sizes}${views}</div>${rowsHtml(q, rows, before, false)}${story}${hand}${tools}${status}</div>`;
}

const playground = p => p.parameters.mode === 'playground';
export const paintMechanics = {
  paint: {
    fresh: p => playground(p) ? freshPlay() : {story: [], claimed: null, refused: null},
    valid: (p, b) => playground(p) ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => playground(p) ? false : solvedPuzzle(p, b),
    move: (p, b, action, random) => {
      const next = playground(p) ? movePlay(b, action, random) : movePuzzle(p, b, action);
      if (next) Object.assign(ui(p), {claiming: false, picks: []});
      return next;
    },
    hint: (p, b) => playground(p) ? {type: 'note'} : hintPuzzle(p, b),
    render: (p, a) => playground(p) ? renderPlay(p, a) : renderPuzzle(p, a),
    // Can't: the first stack tapped is kept here; a tap on a second makes the claim.
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: []});
      if (typeof payload.pick === 'string') state.picks = state.picks.includes(payload.pick) ? [] : [payload.pick];
    },
    reset: p => { uiState.delete(p.id); },
    noHint: playground
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'paint',
  family: {id: 'paint', symbol: '≡'},
  mechanics: paintMechanics,
  pack: new URL('./paint.json', import.meta.url).href,
  css: new URL('./paint.css', import.meta.url).href,
  focus: '.paint-card:not(:disabled),.paint-pickable,.paint-choice'
};
