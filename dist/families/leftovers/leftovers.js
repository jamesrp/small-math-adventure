// Square leftovers (worksheet Week 97, Square remainders). A card n stands for
// a square of n rows of n counters. Taking away whole bundles of m counters
// until fewer than m are left leaves n² mod m. The leftover depends only on n
// mod m (cut m-wide strips off the square), and n and m − n always leave the
// same; for an odd prime p these are the only coincidences, because p divides
// (x − y)(x + y) only when it divides a factor, so the nonzero leftovers come
// in pairs and (p + 1)/2 leftovers occur, 0 included. Composite sizes break
// the pairing: with 8, sides 1, 3, 5 and 7 all leave 1; with 9, sides 0, 3
// and 6 all leave 0; with 15, sides 1, 4, 11 and 14 all leave 1.
//
// Puzzles:
//   sort   put every card in the bin for its leftover, then That's all; the
//          bins that stay empty are leftovers no square can leave;
//   find   one bin: put in every card that leaves its number, then That's all;
//   tell   choose bundle sizes (one or two, from 2 to 12) so that no two of
//          the cards 0 to `top` leave the same leftovers, within a number of
//          tries; a failed Try shows two cards that still match, and Can't
//          claims that no choice works.
// The child finds a leftover by bundling: drag across counters (or tap them)
// to choose them and press Bundle, or press Bundle with nothing chosen to take
// the next whole bundle. A choice that is not whole bundles is let go with
// "Bundles of m.", and a card placed while another bundle fits stays put with
// "Another bundle fits.". The app never says a leftover before the child's own
// bundles show it, and the sorting is judged only by That's all. The
// playground is one square with any side and bundle size.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = value => Number.isInteger(value);
export const MODES = ['sort', 'find', 'tell', 'playground'];
export const MAX_SIDE = 15, MAX_LOCKS = 64;
export const leftover = (n, m) => n * n % m;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const andList = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

// --- Squares and bundles -----------------------------------------------------
// A square's counters are numbered in reading order, 0 to n² − 1. A bundle
// record is [side, cells]: a whole number of bundles taken at once (cells in
// the order chosen). The counters left loose are the rest.
export const gridFor = n => gridOf({cols: n, rows: n});
export const takenOf = (bundles, side) => new Set(bundles.filter(([s]) => s === side).flatMap(([, cells]) => cells));
export const looseOf = (bundles, side) => side * side - takenOf(bundles, side).size;
// Whether the square has fewer than one bundle left (side 0 always has).
export const finished = (bundles, side, m) => looseOf(bundles, side) < m;
export const started = (bundles, side) => bundles.some(([s]) => s === side);
// The next whole bundle in reading order, from the loose counters.
export function nextBundle(bundles, side, m) {
  const taken = takenOf(bundles, side), out = [];
  for (let i = 0; i < side * side && out.length < m; i++) if (!taken.has(i)) out.push(i);
  return out.length === m ? out : null;
}
// A legal bundle: a whole number of bundles of loose counters of that square.
export function bundleOk(bundles, side, m, cells) {
  if (!Array.isArray(cells) || !cells.length || cells.length % m || !cells.every(i => int(i) && i >= 0 && i < side * side)) return false;
  if (new Set(cells).size !== cells.length) return false;
  const taken = takenOf(bundles, side);
  return cells.every(i => !taken.has(i));
}
// The bundles drawn as loops: each record split into bundles of m in the
// order the counters were chosen (reading order within a rectangle).
export const loopsOf = (bundles, side, m) => bundles.filter(([s]) => s === side).flatMap(([, cells]) => Array.from({length: cells.length / m}, (_, k) => cells.slice(k * m, (k + 1) * m)));

// --- Telling cards apart -----------------------------------------------------
// Two cards x < y still match under the chosen sizes when every size leaves
// them the same. The pair shown is the one with the smallest y, then x.
export const signature = (n, sizes) => sizes.map(m => leftover(n, m));
const sameSig = (x, y, sizes) => sizes.every(m => leftover(x, m) === leftover(y, m));
export function matchOf(top, sizes) {
  for (let y = 1; y <= top; y++) for (let x = 0; x < y; x++) if (sameSig(x, y, sizes)) return [x, y];
  return null;
}
export const tells = (top, sizes) => matchOf(top, sizes) === null;
const combos = (list, k) => k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map(rest => [x, ...rest]));
const tellCache = new Map();
// Every choice of k sizes that tells the cards 0 to top apart.
export function workingChoices(q) {
  const key = `${q.top}:${q.k}:${q.sizes}`;
  if (!tellCache.has(key)) tellCache.set(key, combos(q.sizes, q.k).filter(c => tells(q.top, c)));
  return tellCache.get(key);
}
export const possible = q => workingChoices(q).length > 0;

// --- Puzzles -----------------------------------------------------------------
// sort/find: {mode, size, sides, bins} (find has one bin); answers follow.
export const binOf = (q, side) => leftover(side, q.size);
export const answerOf = q => q.mode === 'find' ? q.sides.filter(n => binOf(q, n) === q.bins[0]) : null;
export const whereKey = where => JSON.stringify(where);
// Is this arrangement the answer? In a sort every card is in its own bin; in
// a find the bin holds exactly the cards that leave its number.
export function correct(q, where) {
  if (q.mode === 'sort') return q.sides.every((n, i) => where[i] === binOf(q, n));
  return q.sides.every((n, i) => (where[i] !== null) === (binOf(q, n) === q.bins[0]));
}
// What a That's all on this arrangement says: 'wrong' (a card is in the wrong
// bin), 'more' (a find with every card in it right but one missing), or
// null (it is the answer).
export function verdict(q, where) {
  if (correct(q, where)) return null;
  if (q.mode === 'sort') return 'wrong';
  return q.sides.some((n, i) => where[i] !== null && binOf(q, n) !== q.bins[0]) ? 'wrong' : 'more';
}
const claimable = (q, where) => q.mode === 'sort' ? where.every(w => w !== null) : where.some(w => w !== null);
const validWhere = (q, where) => Array.isArray(where) && where.length === q.sides.length && where.every(w => w === null || q.bins.includes(w));
function refusable(q, key) {
  let where;
  try { where = JSON.parse(key); } catch { return false; }
  return validWhere(q, where) && claimable(q, where) && verdict(q, where) !== null;
}
// A find's refusal is the same whether a card doesn't belong or one is
// missing, so That's all on one card at a time can't judge cards one by one.
const TOLD = {wrong: q => q.mode === 'sort' ? 'A card is in the wrong bin.' : 'Not yet.', more: () => 'Not yet.'};

// --- Boards ------------------------------------------------------------------
// sort, find:  {bundles, where, shut, claimed}
// tell:        {chosen, tries, cant, past?}  cant: null, 'refused' or 'right';
//               past: failed tries from rounds before Again (kept, faded)
// playground:  {side, size, bundles}
// `where` lists each card's bin (null in the row), in the order of q.sides.
// `shut` lists the arrangements a That's all refused; they stay refused
// through Undo. `tries` lists every choice tried, in order.
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {side: q.start?.side ?? 3, size: q.start?.size ?? 4, bundles: []};
  if (q.mode === 'tell') return {chosen: [], tries: [], cant: null};
  return {bundles: [], where: q.sides.map(() => null), shut: [], claimed: false};
}
const validBundles = (bundles, sides, m) => {
  if (!Array.isArray(bundles) || bundles.length > 400) return false;
  const seen = [];
  for (const rec of bundles) {
    if (!Array.isArray(rec) || rec.length !== 2 || !sides.includes(rec[0]) || !bundleOk(seen, rec[0], m, rec[1])) return false;
    seen.push(rec);
  }
  return true;
};
const validChoice = (q, c) => Array.isArray(c) && c.length <= q.k && c.every(m => q.sizes.includes(m)) && new Set(c).size === c.length && c.every((m, i) => i === 0 || m > c[i - 1]);
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    return int(b.side) && b.side >= 0 && b.side <= q.maxSide && q.sizes.includes(b.size) && validBundles(b.bundles, [b.side], b.size) && Object.keys(b).length === 3;
  }
  if (q.mode === 'tell') {
    if (!validChoice(q, b.chosen) || !Array.isArray(b.tries) || b.tries.length > q.budget || ![null, 'refused', 'right'].includes(b.cant) || Object.keys(b).length !== (Object.hasOwn(b, 'past') ? 4 : 3)) return false;
    // Earlier rounds' tries: full choices that failed, each once.
    if (Object.hasOwn(b, 'past')) {
      const past = b.past;
      if (!Array.isArray(past) || past.length > MAX_LOCKS || !past.every(c => validChoice(q, c) && c.length === q.k && !tells(q.top, c)) || new Set(past.map(c => c.join())).size !== past.length) return false;
    }
    const keys = b.tries.map(c => c.join());
    if (!b.tries.every(c => validChoice(q, c) && c.length === q.k) || new Set(keys).size !== keys.length) return false;
    // Nothing is tried after a choice that works, and Can't is right only when
    // no choice works (and refused only when one does).
    if (b.tries.slice(0, -1).some(c => tells(q.top, c))) return false;
    if (b.cant === 'right' && (possible(q) || !b.tries.length || b.tries.some(c => tells(q.top, c)))) return false;
    if (b.cant === 'refused' && !possible(q)) return false;
    return true;
  }
  if (!validBundles(b.bundles, q.sides, q.size) || !validWhere(q, b.where) || typeof b.claimed !== 'boolean' || Object.keys(b).length !== 4) return false;
  if (!Array.isArray(b.shut) || b.shut.length > MAX_LOCKS || new Set(b.shut).size !== b.shut.length || !b.shut.every(k => typeof k === 'string' && refusable(q, k))) return false;
  if (b.claimed && !correct(q, b.where)) return false;
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'tell') return b.cant === 'right' || (b.tries.length > 0 && tells(q.top, b.tries.at(-1)));
  return b.claimed;
}
export const canClaim = (p, b) => !b.claimed && claimable(p.parameters, b.where) && !b.shut.includes(whereKey(b.where));
// tell: Try needs a full choice not tried before, and a try left.
const tried = (b, c) => b.tries.some(t => t.join() === c.join());
export const canTry = (p, b) => { const q = p.parameters; return !solved(p, b) && b.chosen.length === q.k && !tried(b, b.chosen) && b.tries.length < q.budget; };
export const canCant = (p, b) => !solved(p, b) && b.tries.length > 0 && b.cant === null;
export const outOfTries = (p, b) => !solved(p, b) && b.tries.length >= p.parameters.budget;

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'playground') {
    if (action.type === 'bundle') return bundleOk(b.bundles, b.side, b.size, action.cells) && action.side === b.side ? {...b, bundles: [...b.bundles, [b.side, [...action.cells]]]} : null;
    if (action.type === 'side' && int(action.side) && action.side >= 0 && action.side <= q.maxSide && action.side !== b.side) return {...b, side: action.side, bundles: []};
    if (action.type === 'size' && q.sizes.includes(action.size) && action.size !== b.size) return {...b, size: action.size, bundles: []};
    if (action.type === 'clear' && b.bundles.length) return {...b, bundles: []};
    return null;
  }
  if (q.mode === 'tell') {
    if (action.type === 'size') {
      if (!q.sizes.includes(action.size) || outOfTries(p, b)) return null;
      const has = b.chosen.includes(action.size);
      // With one size to choose, another size replaces it; with two, a third waits.
      if (!has && b.chosen.length >= q.k && q.k > 1) return null;
      const chosen = has ? b.chosen.filter(m => m !== action.size) : q.k === 1 ? [action.size] : [...b.chosen, action.size].sort((x, y) => x - y);
      return {...b, chosen};
    }
    if (action.type === 'try') return canTry(p, b) ? {...b, tries: [...b.tries, [...b.chosen]]} : null;
    if (action.type === 'cant') return canCant(p, b) ? {...b, cant: possible(q) ? 'refused' : 'right'} : null;
    if (action.type === 'again') return outOfTries(p, b) ? {chosen: [], tries: [], cant: b.cant, past: [...(b.past || []), ...b.tries.filter(c => !(b.past || []).some(t => t.join() === c.join()))]} : null;
    return null;
  }
  if (action.type === 'bundle') {
    if (!q.sides.includes(action.side) || !bundleOk(b.bundles, action.side, q.size, action.cells)) return null;
    return {...b, bundles: [...b.bundles, [action.side, [...action.cells]]]};
  }
  if (action.type === 'place') {
    const i = q.sides.indexOf(action.side);
    if (i < 0 || !(action.bin === null || q.bins.includes(action.bin)) || b.where[i] === action.bin) return null;
    // A square with bundles taken is placed only once fewer than one bundle is left.
    if (action.bin !== null && started(b.bundles, action.side) && !finished(b.bundles, action.side, q.size)) return null;
    const where = [...b.where];
    where[i] = action.bin;
    return {...b, where};
  }
  if (action.type === 'claim') {
    if (!canClaim(p, b)) return null;
    return verdict(q, b.where) === null ? {...b, claimed: true} : {...b, shut: [...b.shut, whereKey(b.where)]};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
// sort, find: the card in hand is the one last bundled while it is in the
// row, else the first card in the row. Hints first take a card out of a bin
// it doesn't belong in, then bundle the next card that still has to go into
// a bin until fewer than one bundle is left, then put it in its bin, then
// That's all.
export function inHand(q, b) {
  const last = b.bundles.at(-1)?.[0];
  if (last !== undefined && b.where[q.sides.indexOf(last)] === null) return last;
  const i = b.where.findIndex(w => w === null);
  return i < 0 ? null : q.sides[i];
}
const belongsIn = (q, n) => q.mode === 'sort' ? binOf(q, n) : binOf(q, n) === q.bins[0] ? q.bins[0] : null;
function sortHint(p, b) {
  const q = p.parameters;
  const wrong = q.sides.find((n, i) => b.where[i] !== null && b.where[i] !== belongsIn(q, n));
  const bundleHint = (n, text) => ({type: 'move', action: {type: 'bundle', side: n, cells: nextBundle(b.bundles, n, q.size)}, text: n === shownCard(p, b) ? 'Press Bundle.' : text, card: n, bundle: true});
  if (wrong !== undefined) {
    const to = belongsIn(q, wrong);
    // A card with bundles started moves to a bin only once fewer than one bundle is left.
    if (to !== null && started(b.bundles, wrong) && !finished(b.bundles, wrong, q.size)) return bundleHint(wrong, `Tap card ${wrong}, then press Bundle.`);
    return {type: 'move', action: {type: 'place', side: wrong, bin: to}, text: to === null ? `Card ${wrong} doesn’t belong in this bin. Take it out.` : `Card ${wrong} leaves ${to}. Move it to bin ${to}.`, card: wrong, bin: to};
  }
  const need = n => b.where[q.sides.indexOf(n)] === null && belongsIn(q, n) !== null;
  const hand = inHand(q, b), target = hand !== null && need(hand) ? hand : q.sides.find(need);
  if (target === undefined) return {type: 'move', action: {type: 'claim'}, text: 'Press That’s all.', claim: true};
  if (!finished(b.bundles, target, q.size)) return bundleHint(target, `Tap card ${target}, then press Bundle.`);
  const bin = belongsIn(q, target);
  return {type: 'move', action: {type: 'place', side: target, bin}, text: `Put card ${target} in bin ${bin}.`, card: target, bin};
}
// tell: aim for the working choice nearest the child's, or give the reason
// there is none (and let level 2 outline Can't), never "Press Can't". The
// reason for one size: the sizes with two cards that add up to them, and a
// matching pair for each other size.
export function cantReason(q) {
  if (q.k !== 1) return 'No choice tells every card apart.';
  // Two different cards up to top add up to m exactly when m < 2 × top.
  const adds = q.sizes.filter(m => m < 2 * q.top);
  const rest = q.sizes.filter(m => !adds.includes(m)).map(m => { const [x, y] = matchOf(q.top, [m]); return `${m} makes ${x} and ${y} match`; });
  return `Two cards that add up to the size always match, so ${adds.length === q.sizes.length ? 'every size has a match' : `sizes ${adds[0]} to ${adds.at(-1)} have a match${rest.length ? `, and ${andList(rest)}` : ''}`}.`;
}
function tellHint(p, b) {
  const q = p.parameters;
  if (outOfTries(p, b)) return {type: 'move', action: {type: 'again'}, text: 'Press Again.', again: true};
  if (!possible(q)) {
    if (!b.tries.length) {
      const goal = [...q.sizes].slice(-q.k);
      const change = b.chosen.find(m => !goal.includes(m)) ?? goal.find(m => !b.chosen.includes(m));
      if (b.chosen.length === q.k && b.chosen.join() === goal.join()) return {type: 'move', action: {type: 'try'}, text: 'Press Try.', tryIt: true};
      if (q.k === 1) return {type: 'move', action: {type: 'size', size: goal[0]}, text: `Choose ${goal[0]}.`, size: goal[0]};
      if (change !== undefined && b.chosen.length >= q.k && b.chosen.includes(change)) return {type: 'move', action: {type: 'size', size: change}, text: `Take away ${change}.`, size: change};
      return {type: 'move', action: {type: 'size', size: change}, text: `Choose ${change}.`, size: change};
    }
    return {type: 'move', action: {type: 'cant'}, text: cantReason(q), cant: true};
  }
  const ways = workingChoices(q).filter(c => !tried(b, c));
  const near = ways.map(c => ({c, d: c.filter(m => !b.chosen.includes(m)).length})).sort((x, y) => x.d - y.d)[0].c;
  if (b.chosen.join() === near.join()) return {type: 'move', action: {type: 'try'}, text: 'Press Try.', tryIt: true};
  if (q.k === 1) return {type: 'move', action: {type: 'size', size: near[0]}, text: `Choose ${near[0]}.`, size: near[0]};
  const off = b.chosen.find(m => !near.includes(m));
  if (off !== undefined && b.chosen.length >= q.k) return {type: 'move', action: {type: 'size', size: off}, text: `Take away ${off}.`, size: off};
  const on = near.find(m => !b.chosen.includes(m));
  return {type: 'move', action: {type: 'size', size: on}, text: `Choose ${on}.`, size: on};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'note'};
  if (solved(p, b)) return {type: 'done'};
  return q.mode === 'tell' ? tellHint(p, b) : sortHint(p, b);
}

// --- View state --------------------------------------------------------------
// The card shown in the work area, the counters chosen in it, a short line
// for a refused Bundle or placement, and the picked card for two-tap
// placing. Any move clears it: the card in hand then follows the board.
const view = new Map();
const ui = p => { if (!view.has(p.id)) view.set(p.id, {show: null, chosen: [], told: null}); return view.get(p.id); };
const calm = p => Object.assign(ui(p), {show: null, chosen: [], told: null});
// The card in the work area: one the child tapped, else the card in hand.
export function shownCard(p, b) {
  const q = p.parameters, s = ui(p);
  if (q.mode === 'playground') return b.side;
  if (q.mode === 'tell') return null;
  if (s.show !== null && q.sides.includes(s.show)) return s.show;
  return inHand(q, b);
}
const VIEW_TOLD = {size: () => 'Not whole bundles.', more: () => 'Another bundle fits.'};

// --- Drawing -----------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${esc(focus)}"`;
const uiAttrs = (payload, focus) => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="${esc(focus)}"`;
// One square of counters: loose counters in sun, chosen ones in pine, and each
// bundle drawn as a loop round its counters. When fewer than one bundle is
// left the loose counters get an ochre ring.
function squareHtml(n, m, bundles, o = {}) {
  if (n === 0) return `<div class="lo-empty" role="img" aria-label="No counters"><span></span></div>`;
  const g = gridFor(n), taken = takenOf(bundles, n), chosen = new Set(o.chosen || []), done = finished(bundles, n, m);
  const loops = loopsOf(bundles, n, m);
  const pieces = loops.map((cells, k) => ({cells, cls: `lo-loop lo-loop-${k % 3}`}));
  const counters = g.cells.map((_, i) => {
    const [cx, cy] = g.centre[i], cls = taken.has(i) ? 'lo-counter taken' : chosen.has(i) ? 'lo-counter chosen' : done ? 'lo-counter left' : 'lo-counter';
    return `<circle class="${cls}" cx="${f(cx)}" cy="${f(cy)}" r="3.3"/>`;
  }).join('');
  const live = Boolean(o.live);
  return squareBoard(g, {
    cls: `lo-square${done ? ' done' : ''}`, label: o.label || `Square of ${n} by ${n}`, stroke: live, pad: .12,
    cell: i => ({cls: 'lo-cell', act: live && !taken.has(i), label: `Counter ${i + 1}${chosen.has(i) ? ', chosen' : ''}`}),
    pieces, over: `<g class="lo-counters" aria-hidden="true">${counters}</g>`
  });
}
function cardHtml(n, o = {}) {
  const cls = ['lo-card', o.shown ? 'shown' : '', o.hinted ? 'hinted' : '', o.pair ? 'pair' : '', o.cls || ''].filter(Boolean).join(' ');
  const inner = `<span class="lo-card-n">${n}</span>${o.under || ''}`;
  if (!o.act) return `<span class="${cls}" ${o.label ? `role="img" aria-label="${esc(o.label)}"` : 'aria-hidden="true"'}>${inner}</span>`;
  return `<button type="button" class="${cls}" ${uiAttrs({card: n}, `lo-card-${n}`)} data-lo-card="${n}" aria-pressed="${Boolean(o.shown)}" aria-label="${esc(o.label || `Card ${n}`)}">${inner}</button>`;
}
function renderSort(p, a) {
  const q = p.parameters, b = a.board, done = b.claimed, s = ui(p), m = q.size;
  const shown = done ? null : shownCard(p, b), hinted = !done && a.hintLevel >= 2 ? hint(p, b) : null;
  const told = b.shut.includes(whereKey(b.where)) ? TOLD[verdict(q, b.where)](q) : '';
  const card = (n, i) => cardHtml(n, {act: !done, shown: n === shown, hinted: hinted?.card === n && (hinted.bin !== undefined || hinted.card !== shown), label: `Card ${n}${b.where[i] !== null ? `, in bin ${b.where[i]}` : ''}${n === shown ? ', in hand' : ''}`});
  const row = q.sides.map((n, i) => b.where[i] === null ? card(n, i) : '').join('');
  // The row ends with an empty place: tapping it takes the card in hand out of its bin.
  const back = !done && shown !== null && b.where[q.sides.indexOf(shown)] !== null;
  const hand = done && !row ? '' : `<div class="lo-row" data-lo-drop="row" role="group" aria-label="Cards">${row}${done ? '' : `<button type="button" class="lo-row-drop${hinted?.bin === null ? ' hinted' : ''}" data-lo-bin="row" data-focus="lo-row-drop" ${back ? '' : 'disabled'} aria-label="${esc(back ? `Take card ${shown} out of its bin` : 'Back to the row')}"></button>`}</div>`;
  const bins = q.bins.map(r => {
    const inside = q.sides.map((n, i) => b.where[i] === r ? card(n, i) : '').join('');
    const can = !done && shown !== null && b.where[q.sides.indexOf(shown)] !== r;
    const empty = done && !inside && q.mode === 'sort';
    return `<div class="lo-bin${empty ? ' never' : ''}${hinted?.bin === r ? ' hinted' : ''}" data-lo-drop="${r}"><button type="button" class="lo-bin-drop" data-lo-bin="${r}" data-focus="lo-bin-${r}" ${can ? '' : 'disabled'} aria-label="${esc(`Leftover ${r}${shown !== null && can ? `: put card ${shown} here` : ''}`)}"><span class="lo-bin-n">${r}</span></button><div class="lo-bin-cards">${inside}</div></div>`;
  }).join('');
  // The work area: the card in hand, its square and Bundle.
  let work = '';
  if (shown !== null && !done) {
    const chosen = s.show === shown || s.show === null ? s.chosen : [];
    const canBundle = chosen.length > 0 || !finished(b.bundles, shown, m);
    const line = s.told ? VIEW_TOLD[s.told](m) : '';
    work = `<div class="lo-work"><div class="lo-bar">${cardHtml(shown, {label: `Card ${shown}`})}<span class="lo-size">Bundles of ${m}</span><button type="button" class="secondary lo-button lo-bundle${(hinted?.bundle && hinted.card === shown) || s.told === 'size' ? ' hinted' : ''}" data-lo-bundle="${shown}" data-focus="lo-bundle" ${canBundle ? '' : 'disabled'}>Bundle</button></div>${squareHtml(shown, m, b.bundles, {live: true, chosen, label: `Card ${shown}: ${shown} by ${shown} counters`})}${line ? `<p class="lo-told" role="status">${line}</p>` : ''}</div>`;
  }
  const claim = done ? '' : `<button type="button" class="secondary lo-button lo-claim${hinted?.claim ? ' hinted' : ''}" ${moveAttrs({type: 'claim'}, 'lo-claim')} ${canClaim(p, b) ? '' : 'disabled'}>That’s all</button>`;
  const status = `${done ? 'Solved.' : shown !== null ? `Card ${shown} in hand: ${plural(looseOf(b.bundles, shown), 'counter')} not in a bundle.` : ''} ${q.bins.map(r => `Bin ${r}: ${andList(q.sides.filter((n, i) => b.where[i] === r).map(String)) || 'empty'}.`).join(' ')}${told ? ` ${told}` : ''}`;
  return `<div class="lo-puzzle lo-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="leftovers">${work}${hand}<div class="lo-bins${q.bins.length === 1 ? ' one' : ''}" role="group" aria-label="Leftover bins"><span class="lo-bins-label" aria-hidden="true">Left over</span>${bins}</div><div class="lo-actions">${claim}</div>${told ? `<p class="lo-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function pipsHtml(used, limit) {
  const dots = Array.from({length: limit}, (_, k) => `<i class="lo-pip${k < used ? ' used' : ''}"></i>`).join('');
  return `<span class="lo-pips" role="img" aria-label="${used} of ${plural(limit, 'try', 'tries')} used">${dots}</span>`;
}
function renderTell(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), hinted = !done && a.hintLevel >= 2 ? hint(p, b) : null;
  const last = b.tries.at(-1), won = done && b.cant !== 'right' ? last : null, match = last && !won ? matchOf(q.top, last) : null;
  // Under each card, its leftover for each size: every card after a win, the
  // two that match after a failed Try, none otherwise.
  const shows = n => won ? true : match ? match.includes(n) : false;
  const sizes = won || last || [];
  const under = n => shows(n) ? `<span class="lo-sig">${signature(n, sizes).map(r => `<i>${r}</i>`).join('')}</span>` : '';
  const cards = Array.from({length: q.top + 1}, (_, n) => cardHtml(n, {pair: Boolean(match?.includes(n)), under: under(n), label: `Card ${n}${shows(n) ? `: leaves ${andList(signature(n, sizes).map(String))}` : ''}`})).join('');
  // A key in front of the cards: the size each line of leftovers is for.
  const sizeLabel = sizes.length && (won || match) ? `<span class="lo-card lo-key" aria-hidden="true"><span class="lo-card-n">&nbsp;</span><span class="lo-sig">${sizes.map(m => `<i>${m}</i>`).join('')}</span></span>` : '';
  const sizeButtons = q.sizes.map(m => `<button type="button" class="lo-size-button${b.chosen.includes(m) ? ' on' : ''}${hinted?.size === m ? ' hinted' : ''}" ${moveAttrs({type: 'size', size: m}, `lo-size-${m}`)} aria-pressed="${b.chosen.includes(m)}" ${done || outOfTries(p, b) || (!b.chosen.includes(m) && b.chosen.length >= q.k && q.k > 1) ? 'disabled' : ''} aria-label="Bundles of ${m}">${m}</button>`).join('');
  // Each try: its sizes, then the two cards that still match and what they leave, or a tick.
  const record = (c, tag = 'li') => { const mt = matchOf(q.top, c), said = mt ? `Bundles of ${andList(c.map(String))}: cards ${mt[0]} and ${mt[1]} both leave ${andList(signature(mt[0], c).map(String))}.` : `Bundles of ${andList(c.map(String))}: all different.`; return `<${tag} aria-label="${esc(said)}"><span class="lo-try-sizes" aria-hidden="true">${c.map(m => `<i>${m}</i>`).join('')}</span>${mt ? `<span class="lo-mini" aria-hidden="true">${mt[0]}</span><span class="lo-mini" aria-hidden="true">${mt[1]}</span><span class="lo-to" aria-hidden="true">→ ${signature(mt[0], c).join(' · ')}</span>` : '<span class="ok" aria-hidden="true">✓</span>'}</${tag}>`; };
  // Earlier rounds' records stay, faded, before this round's.
  const past = (b.past || []).filter(c => !tried(b, c));
  const triesList = b.tries.length || past.length ? `<ol class="lo-tries" aria-label="Tries">${past.map(c => record(c).replace('<li ', '<li class="past" ')).join('')}${b.tries.map(c => record(c)).join('')}</ol>` : '';
  const btn = (label, action, cls, ok) => `<button type="button" class="secondary lo-button ${cls}" ${moveAttrs(action, `lo-${action.type}`)} ${ok ? '' : 'disabled'}>${label}</button>`;
  const actions = done ? '' : `<div class="lo-actions">${pipsHtml(b.tries.length, q.budget)}${outOfTries(p, b) ? btn('Again', {type: 'again'}, `lo-again${hinted?.again ? ' hinted' : ''}`, true) : btn('Try', {type: 'try'}, `lo-try${hinted?.tryIt ? ' hinted' : ''}`, canTry(p, b))}${btn('Can’t', {type: 'cant'}, `lo-cant${hinted?.cant ? ' hinted' : ''}`, canCant(p, b))}</div>`;
  const told = b.cant === 'refused' && !done ? 'There is a way.' : '';
  // After a right Can't: every size with two cards it leaves the same.
  const catalog = b.cant === 'right' ? `<ul class="lo-catalog" aria-label="Every size has a match">${q.sizes.map(m => record([m])).join('')}</ul>` : '';
  const status = `${done ? 'Solved.' : ''} Chosen: ${andList(b.chosen.map(String)) || 'none'}. ${b.tries.length} of ${plural(q.budget, 'try', 'tries')} used.${match ? ` Cards ${match[0]} and ${match[1]} leave the same.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="lo-puzzle lo-tell${done ? ' solved' : ''}" data-mechanic-wire="leftovers"><div class="lo-row lo-tell-cards" role="group" aria-label="Cards">${sizeLabel}${cards}</div><div class="lo-sizes" role="group" aria-label="Bundle sizes">${sizeButtons}</div>${actions}${triesList}${catalog}${told ? `<p class="lo-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderPlayground(p, a) {
  const q = p.parameters, b = a.board, s = ui(p), n = b.side, m = b.size;
  const step = (label, action, ok, focus) => `<button type="button" class="secondary lo-step" ${moveAttrs(action, focus)} ${ok ? '' : 'disabled'} aria-label="${esc(label)}">${label.startsWith('More') ? '+' : '−'}</button>`;
  const i = q.sizes.indexOf(m);
  const controls = `<div class="lo-steppers"><span class="lo-stepper" role="group" aria-label="Side">${step('Fewer rows', {type: 'side', side: n - 1}, n > 0, 'lo-side-down')}${cardHtml(n, {label: `Card ${n}`})}${step('More rows', {type: 'side', side: n + 1}, n < q.maxSide, 'lo-side-up')}</span><span class="lo-stepper" role="group" aria-label="Bundle size"><span class="lo-size">Bundles of</span>${step('Smaller bundles', {type: 'size', size: q.sizes[i - 1]}, i > 0, 'lo-size-down')}<b>${m}</b>${step('More in a bundle', {type: 'size', size: q.sizes[i + 1]}, i < q.sizes.length - 1, 'lo-size-up')}</span></div>`;
  const canBundle = s.chosen.length > 0 || !finished(b.bundles, n, m);
  const line = s.told ? VIEW_TOLD[s.told](m) : '';
  const bar = `<div class="lo-bar"><button type="button" class="secondary lo-button lo-bundle${s.told === 'size' ? ' hinted' : ''}" data-lo-bundle="${n}" data-focus="lo-bundle" ${canBundle ? '' : 'disabled'}>Bundle</button><button type="button" class="secondary lo-button lo-clear" ${moveAttrs({type: 'clear'}, 'lo-clear')} ${b.bundles.length ? '' : 'disabled'}>Clear</button></div>`;
  return `<div class="lo-puzzle lo-playground" data-mechanic-wire="leftovers">${controls}<div class="lo-work">${bar}${squareHtml(n, m, b.bundles, {live: true, chosen: s.chosen, label: `${n} by ${n} counters`})}${line ? `<p class="lo-told" role="status">${line}</p>` : ''}</div><p class="sr-only" role="status">${esc(`${n} by ${n}, bundles of ${m}: ${plural(looseOf(b.bundles, n), 'counter')} not in a bundle.`)}</p></div>`;
}
const render = (p, a) => p.parameters.mode === 'tell' ? renderTell(p, a) : p.parameters.mode === 'playground' ? renderPlayground(p, a) : renderSort(p, a);

// --- Taps, drags and keys ----------------------------------------------------
// In the work area a slide across counters chooses the rectangle between the
// first and the last, and a tap chooses or unchooses one counter. Bundle
// takes the chosen counters when they make whole bundles, or with nothing
// chosen the next whole bundle. A card is placed by tapping it and then a bin
// (or the row), or by dragging it onto a bin.
const rect = (g, from, to) => {
  const [x1, y1] = g.cells[from], [x2, y2] = g.cells[to], out = [];
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) out.push(g.at(x, y));
  return out;
};
// A slide chooses the rectangle between its first and last counters when
// that is whole bundles (a strip, as in Problem 5), and otherwise the counters
// it passed over, so a lasso of m counters is a bundle even when no rectangle
// in the square is (bundles of 5 on a 4 by 4 square).
export function slid(g, free, cells, m) {
  const box = free(rect(g, cells[0], cells.at(-1)));
  return box.length && box.length % m === 0 ? box : free([...new Set(cells)]);
}
let drag = null, listening = false;
function wire(root, p, api) {
  const q = p.parameters;
  const now = () => { const a = api.attempt(); return {a, b: a.board}; };
  const sizeOf = b => q.mode === 'playground' ? b.size : q.size;
  // The square.
  const {b} = now(), n = shownCard(p, b);
  if (n !== null && n > 0 && !solved(p, b)) {
    const g = gridFor(n), work = root.querySelector('.lo-work');
    const free = cells => { const taken = takenOf(now().b.bundles, n); return cells.filter(i => !taken.has(i)); };
    if (work) wireSquare(work, g, {
      cell: i => { const s = ui(p), chosen = s.chosen.includes(i) ? s.chosen.filter(k => k !== i) : [...s.chosen, i]; api.ui({show: n, chosen, told: null}); return null; },
      stroke: cells => { api.ui({show: n, chosen: slid(g, free, cells, sizeOf(now().b)), told: null}); return null; },
      preview: cells => ({show: slid(g, free, cells, sizeOf(now().b))})
    }, api.apply);
  }
  root.querySelectorAll('[data-lo-bundle]').forEach(button => button.addEventListener('click', () => {
    const {b} = now(), side = Number(button.dataset.loBundle), m = sizeOf(b), s = ui(p);
    if (s.chosen.length) {
      const cells = [...s.chosen].sort((x, y) => x - y);
      // Not whole bundles: the board says so, lets go of the choice and
      // outlines Bundle, which with nothing chosen takes the next bundle.
      if (cells.length % m) { api.ui({show: q.mode === 'playground' ? null : side, chosen: [], told: 'size'}); return; }
      api.apply({type: 'bundle', side, cells});
      return;
    }
    const cells = nextBundle(q.mode === 'playground' ? b.bundles : b.bundles, side, m);
    if (cells) api.apply({type: 'bundle', side, cells});
  }));
  if (q.mode !== 'sort' && q.mode !== 'find') return;
  // Placing the card in hand: a placement that would stop bundling early is
  // answered with a line instead.
  const place = (side, bin) => {
    const {b} = now();
    if (bin !== null && started(b.bundles, side) && !finished(b.bundles, side, q.size)) { api.ui({show: side, chosen: [], told: 'more'}); return; }
    api.apply({type: 'place', side, bin});
  };
  root.querySelectorAll('[data-lo-bin]').forEach(button => button.addEventListener('click', () => {
    const {b} = now(), side = shownCard(p, b), bin = button.dataset.loBin === 'row' ? null : Number(button.dataset.loBin);
    if (side !== null) place(side, bin);
  }));
  // Dragging a card onto a bin or back to the row.
  root.querySelectorAll('[data-lo-card]').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    drag = {pointer: e.pointerId, side: Number(el.dataset.loCard), x: e.clientX, y: e.clientY, el, ghost: null, place};
  }));
  if (!listening) {
    document.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.pointer) return;
      if (!drag.ghost && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10) return;
      if (!drag.ghost) { drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('lo-ghost'); drag.ghost.removeAttribute('data-lo-card'); document.body.append(drag.ghost); }
      drag.ghost.style.left = `${e.clientX}px`; drag.ghost.style.top = `${e.clientY}px`;
      // The bin under the finger lights up.
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lo-bin');
      document.querySelectorAll('.lo-bin.drop-over').forEach(el => { if (el !== over) el.classList.remove('drop-over'); });
      over?.classList.add('drop-over');
    });
    const end = e => {
      if (!drag || e.pointerId !== drag.pointer) return;
      const d = drag;
      drag = null;
      if (!d.ghost) return;
      d.ghost.remove();
      document.querySelectorAll('.lo-bin.drop-over').forEach(el => el.classList.remove('drop-over'));
      if (e.type !== 'pointerup') return;
      // A click after a drag lands on the card and the bin's shared parent,
      // which has no action, so it needs no guard.
      const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-lo-drop]');
      if (target) d.place(d.side, target.dataset.loDrop === 'row' ? null : Number(target.dataset.loDrop));
    };
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    listening = true;
  }
}

export const leftoverMechanics = {
  leftovers: {
    fresh, valid, solved, hint, render, wire,
    move(p, b, action) { const next = move(p, b, action); if (next) calm(p); return next; },
    // Tapping a card shows its square; counters chosen belong to that card.
    ui(p, payload) {
      if (!object(payload)) return;
      const s = ui(p);
      if (int(payload.card)) {
        if (s.show !== payload.card) Object.assign(s, {show: payload.card, chosen: [], told: null});
        return;
      }
      if (payload.show === null || int(payload.show)) s.show = payload.show;
      if (Array.isArray(payload.chosen) && payload.chosen.every(int)) s.chosen = [...new Set(payload.chosen)];
      if (payload.told === null || Object.hasOwn(VIEW_TOLD, payload.told)) s.told = payload.told;
    },
    reset: p => { view.delete(p.id); },
    // Undo takes back bundles, placements and sizes, never what a claim
    // learned: refused arrangements stay refused, failed tries stay tried and
    // a refused Can't stays refused.
    carry(p, from, to) {
      const q = p.parameters;
      calm(p);
      if (!object(from) || !object(to)) return to;
      if ((q.mode === 'sort' || q.mode === 'find') && Array.isArray(from.shut) && Array.isArray(to.shut)) return {...to, shut: [...to.shut, ...from.shut.filter(k => !to.shut.includes(k))]};
      // A winning Try or a right Can't is a move like any other and is taken back.
      if (q.mode === 'tell' && Array.isArray(from.tries) && Array.isArray(to.tries)) {
        // Undo of Again brings that round's tries back, with the rounds before it.
        const fromLonger = from.tries.length >= to.tries.length;
        const tries = (fromLonger ? from.tries : to.tries).filter(c => Array.isArray(c) && !tells(q.top, c));
        const fromPast = Array.isArray(from.past) ? from.past : [], toPast = Array.isArray(to.past) ? to.past : [];
        const past = fromLonger && fromPast.length >= toPast.length ? fromPast : toPast;
        const {past: _, ...rest} = to;
        return {...rest, tries, cant: from.cant === 'refused' ? 'refused' : to.cant, ...(past.length || Object.hasOwn(to, 'past') ? {past} : {})};
      }
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'leftovers',
  family: {id: 'leftovers', symbol: '⊟'},
  mechanics: leftoverMechanics,
  pack: new URL('./leftovers.json', import.meta.url).href,
  css: new URL('./leftovers.css', import.meta.url).href,
  focus: '.lo-card[data-lo-card],.lo-bin-drop:not([disabled]),.lo-button:not([disabled]),.lo-size-button:not([disabled])'
};
