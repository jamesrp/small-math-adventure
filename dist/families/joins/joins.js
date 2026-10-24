// Joining strips (worksheet Week 54, partitions and rebuilding). A collection
// is a partition: strips of whole-unit lengths whose units add to a total,
// with no order. Two moves keep the total: join two equal strips into one of
// double length, or halve an even strip into two equal halves. Each odd size u
// keeps its own family u, 2u, 4u, …, so halving everything gives one all-odd
// collection that no join or halving changes. Two collections are connected
// by joins and halvings exactly when they halve to the same all-odd
// collection, and joining equal pairs until no two strips match turns each
// all-odd collection into the one collection of its class whose sizes all
// differ (Euler's odd = distinct). A free bench, which cuts a strip anywhere
// and joins any two, serves the catalogs; Flip exchanges rows and columns,
// which swaps "at most k strips" with "no strip longer than k".
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['catalog', 'reach', 'match', 'playground'];
export const KINDS = ['all', 'odd', 'distinct', 'parts'];

// --- Collections ---------------------------------------------------------------
// A collection is an array of positive whole numbers, longest first.
export const sortDown = list => [...list].sort((x, y) => y - x);
export const keyOf = list => sortDown(list).join(',');
export const sum = list => list.reduce((s, x) => s + x, 0);
export const isCollection = list => Array.isArray(list) && list.length > 0 && list.every((x, i) => Number.isInteger(x) && x > 0 && (i === 0 || list[i - 1] >= x));
export const allOdd = list => list.every(x => x % 2 === 1);
export const allDifferent = list => new Set(list).size === list.length;
export const same = (a, b) => keyOf(a) === keyOf(b);
// Halve every even strip until none is left.
export function oddForm(list) {
  const out = [];
  for (let x of list) { let copies = 1; while (x % 2 === 0) { x /= 2; copies *= 2; } for (let k = 0; k < copies; k++) out.push(x); }
  return sortDown(out);
}
// Join equal strips until no two match. The order of joins does not matter.
export function joinAll(list) {
  let a = sortDown(list);
  for (;;) {
    const s = a.find((x, i) => a[i + 1] === x);
    if (s === undefined) return a;
    a = joinOf(a, s, s);
  }
}
// Every collection of n, in order: longest first strip, then the rest.
const catalogs = new Map();
export function collections(n, max = n) {
  const k = `${n},${max}`;
  if (catalogs.has(k)) return catalogs.get(k);
  const out = n === 0 ? [[]] : [];
  for (let first = Math.min(n, max); first >= 1 && n > 0; first--) for (const rest of collections(n - first, first)) out.push([first, ...rest]);
  catalogs.set(k, out);
  return out;
}
// Rows become columns: the k-th strip of the flip counts the strips longer than k.
export const conjugate = list => Array.from({length: list[0] || 0}, (_, k) => list.filter(x => x > k).length);
export const fits = (q, list) => q.kind === 'odd' ? allOdd(list) : q.kind === 'distinct' ? allDifferent(list) : q.kind === 'parts' ? list.length <= q.k : true;
export const answersOf = q => collections(q.total).filter(list => fits(q, list));

// --- Moves on a collection -------------------------------------------------------
function without(list, sizes) {
  const out = [...list];
  for (const s of sizes) { const i = out.indexOf(s); if (i < 0) return null; out.splice(i, 1); }
  return out;
}
export function joinOf(list, x, y) { const rest = without(list, [x, y]); return rest && sortDown([...rest, x + y]); }
export function cutOf(list, size, at) { if (!Number.isInteger(at) || at < 1 || at >= size) return null; const rest = without(list, [size]); return rest && sortDown([...rest, at, size - at]); }
// Join two equal strips or halve an even one.
export function halfMoves(list) {
  const sizes = [...new Set(list)].sort((x, y) => x - y), out = [];
  for (const s of sizes) if (list.indexOf(s) !== list.lastIndexOf(s)) out.push({type: 'join', sizes: [s, s]});
  for (const s of [...sizes].reverse()) if (s % 2 === 0) out.push({type: 'cut', size: s, at: s / 2});
  return out;
}
// Cut a strip anywhere or join any two; Flip where the puzzle has it.
export function freeMoves(list, flip = false) {
  const sizes = [...new Set(list)], out = [];
  for (const s of sizes) for (let at = Math.ceil(s / 2); at < s; at++) out.push({type: 'cut', size: s, at});
  for (let i = 0; i < sizes.length; i++) for (let k = i; k < sizes.length; k++) {
    const [x, y] = [sizes[i], sizes[k]];
    if (x !== y || list.indexOf(x) !== list.lastIndexOf(x)) out.push({type: 'join', sizes: [x, y]});
  }
  if (flip) out.push({type: 'flip'});
  return out;
}
export function applyTo(list, action, free = false) {
  if (!object(action)) return null;
  if (action.type === 'join') {
    const s = action.sizes;
    if (!Array.isArray(s) || s.length !== 2 || !s.every(x => Number.isInteger(x) && x > 0) || (!free && s[0] !== s[1])) return null;
    return joinOf(list, s[0], s[1]);
  }
  if (action.type === 'cut') {
    if (!Number.isInteger(action.size) || (!free && action.at * 2 !== action.size)) return null;
    return cutOf(list, action.size, action.at);
  }
  return null;
}
// Fewest joins and halvings from every collection connected to `goal`.
const fromGoal = new Map();
export function distancesTo(goal) {
  const k = keyOf(goal);
  if (fromGoal.has(k)) return fromGoal.get(k);
  const d = new Map([[k, 0]]), queue = [sortDown(goal)];
  for (let i = 0; i < queue.length; i++) for (const m of halfMoves(queue[i])) {
    const next = applyTo(queue[i], m), nk = keyOf(next);
    if (!d.has(nk)) { d.set(nk, d.get(keyOf(queue[i])) + 1); queue.push(next); }
  }
  fromGoal.set(k, d);
  return d;
}
export const reachable = (from, to) => sum(from) === sum(to) && keyOf(oddForm(from)) === keyOf(oddForm(to));
export const longestIn = start => Math.max(...[...distancesTo(start).keys()].map(k => Number(k.split(',')[0])));

// --- Boards -------------------------------------------------------------------
// catalog:    {bench, shelf, more, done}   free bench; `more` answers a wrong That's all
// reach:      {bench, goal, tried, claim}  claim null; 'halving' after Can't, judged
//             when both rows are all odd; 'refused' when they matched, kept
//             through Undo until the bench moves again
// match:      {bench, card, paired}        bench null until a card is taken
// playground: {bench}
const free = q => q.mode === 'catalog';
const keys = b => Object.keys(b).sort().join();

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'catalog') return {bench: [...q.start], shelf: [], more: false, done: false};
  if (q.mode === 'reach') return {bench: [...q.start], goal: [...q.goal], tried: false, claim: null};
  if (q.mode === 'match') return {bench: null, card: null, paired: []};
  return {bench: [...q.start]};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'catalog') {
    if (keys(b) !== 'bench,done,more,shelf' || !isCollection(b.bench) || sum(b.bench) !== q.total || typeof b.more !== 'boolean' || typeof b.done !== 'boolean') return false;
    if (!Array.isArray(b.shelf) || !b.shelf.every(c => isCollection(c) && sum(c) === q.total && fits(q, c)) || new Set(b.shelf.map(keyOf)).size !== b.shelf.length) return false;
    const complete = b.shelf.length === answersOf(q).length;
    return (!b.more || (!complete && b.shelf.length > 0)) && (!b.done || (complete && !b.more));
  }
  if (q.mode === 'reach') {
    if (keys(b) !== 'bench,claim,goal,tried' || !isCollection(b.bench) || !isCollection(b.goal) || typeof b.tried !== 'boolean' || ![null, 'halving', 'refused'].includes(b.claim)) return false;
    if (!reachable(q.start, b.bench) || (!b.tried && !same(b.bench, q.start)) || (b.claim && !b.tried)) return false;
    const can = reachable(q.start, q.goal);
    if (b.claim === 'refused') return can && reachable(q.goal, b.goal);
    // A claim is judged the moment both rows are all odd, so a matching pair never rests here.
    if (b.claim === 'halving') return reachable(q.goal, b.goal) && !(allOdd(b.bench) && allOdd(b.goal) && can);
    return same(b.goal, q.goal);
  }
  if (q.mode === 'match') {
    if (keys(b) !== 'bench,card,paired' || !Array.isArray(b.paired) || new Set(b.paired).size !== b.paired.length || !b.paired.every(i => Number.isInteger(i) && i >= 0 && i < q.cards.length)) return false;
    if (b.card === null) return b.bench === null;
    return Number.isInteger(b.card) && b.card >= 0 && b.card < q.cards.length && !b.paired.includes(b.card) && isCollection(b.bench) && reachable(q.cards[b.card], b.bench) && !landed(q, b.bench);
  }
  return keys(b) === 'bench' && isCollection(b.bench) && sum(b.bench) <= q.max;
}
// In matching, a collection lands on its partner once it has the other kind.
const landed = (q, list) => q.to === 'odd' ? allOdd(list) : allDifferent(list);
// A Can't is judged once both rows are all odd: different collections solve
// it; the same one is refused. The goal stays halved, so Undo can join it
// back step by step, until the next move on the bench brings it back whole.
function judge(q, b) {
  if (!allOdd(b.bench) || !allOdd(b.goal) || !same(b.bench, b.goal)) return b;
  return {...b, claim: 'refused'};
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'catalog') return b.done;
  if (q.mode === 'match') return b.paired.length === q.cards.length;
  if (b.claim === 'halving') return allOdd(b.bench) && allOdd(b.goal);
  return same(b.bench, q.goal);
}

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const state = ui(p);
  state.chosen = null; state.told = null;
  const t = action.type;
  if (t === 'join' || t === 'cut') {
    if (q.mode === 'match' && b.card === null) return null;
    if (action.side === 'goal') {
      if (q.mode !== 'reach' || b.claim !== 'halving' || t !== 'cut' || Object.keys(action).length !== 4) return null;
      const goal = applyTo(b.goal, action);
      return goal && judge(q, {...b, goal});
    }
    if (Object.hasOwn(action, 'side') && action.side !== 'bench') return null;
    if (q.mode === 'reach' && b.claim === 'halving' && t === 'join') return null;
    const bench = applyTo(b.bench, action, free(q));
    if (!bench) return null;
    if (q.mode === 'playground' && bench[0] > q.span) return null;
    if (q.mode === 'reach') return b.claim === 'halving' ? judge(q, {...b, bench}) : {...b, bench, goal: [...q.goal], tried: true, claim: null};
    if (q.mode === 'match' && landed(q, bench)) return {bench: null, card: null, paired: [...b.paired, b.card]};
    return {...b, bench};
  }
  if (q.mode === 'catalog') {
    if (t === 'flip' && q.flip) return {...b, bench: conjugate(b.bench)};
    if (t === 'keep' && fits(q, b.bench) && !b.shelf.some(c => same(c, b.bench))) return {...b, shelf: [...b.shelf, [...b.bench]], more: false};
    if (t === 'all' && b.shelf.length && !b.more) return b.shelf.length === answersOf(q).length ? {...b, done: true} : {...b, more: true};
    return null;
  }
  if (q.mode === 'reach') {
    // Can't is accepted only after a move. It starts the certificate: the
    // child halves both rows, and the claim is judged when both are all odd.
    if (t === 'cant' && b.tried && b.claim === null) return judge(q, {...b, claim: 'halving'});
    return null;
  }
  if (q.mode === 'match') {
    const i = action.card;
    if (t !== 'load' || !Number.isInteger(i) || i < 0 || i >= q.cards.length || b.paired.includes(i) || i === b.card) return null;
    const bench = [...q.cards[i]];
    return landed(q, bench) ? {bench: null, card: null, paired: [...b.paired, i]} : {bench, card: i, paired: b.paired};
  }
  if (t === 'add' && sum(b.bench) < q.max) return {bench: sortDown([...b.bench, 1])};
  if (t === 'remove' && b.bench.includes(1) && b.bench.length > 1) return {bench: without(b.bench, [1])};
  return null;
}

// --- Hints --------------------------------------------------------------------
const article = (list, s) => list.filter(x => x === s).length > 1 ? 'a' : 'the';
function moveWords(list, m, where = '') {
  if (m.type === 'cut') return m.at * 2 === m.size ? `Halve ${article(list, m.size)} ${m.size}${where === 'goal' ? ' in the goal' : ''}.` : `Cut ${article(list, m.size)} ${m.size} into ${m.at} and ${m.size - m.at}.`;
  if (m.type === 'flip') return 'Press Flip.';
  const [x, y] = m.sizes;
  return x === y ? `Join two ${x}s.` : `Join the ${Math.max(x, y)} and the ${Math.min(x, y)}.`;
}
const freeWords = (list, m) => m.type === 'cut' ? `Cut ${article(list, m.size)} ${m.size} into ${m.at} and ${m.size - m.at}.` : moveWords(list, m);
// The first move of a shortest route from `list` towards `goal` by joins and halvings.
function towards(list, goal) {
  const d = distancesTo(goal), here = d.get(keyOf(list));
  return halfMoves(list).find(m => d.get(keyOf(applyTo(list, m))) === here - 1) || null;
}
// Catalogs: the nearest collection still to keep, by free moves.
const freeSearch = new Map();
function freeRoutes(q, list) {
  const k = `${q.total}|${q.flip ? 1 : 0}|${keyOf(list)}`;
  if (freeSearch.has(k)) return freeSearch.get(k);
  const first = new Map([[keyOf(list), null]]), queue = [list];
  for (let i = 0; i < queue.length; i++) for (const m of freeMoves(queue[i], q.flip)) {
    const next = m.type === 'flip' ? conjugate(queue[i]) : applyTo(queue[i], m, true), nk = keyOf(next);
    if (!first.has(nk)) { first.set(nk, i === 0 ? m : first.get(keyOf(queue[i]))); queue.push(next); }
  }
  freeSearch.set(k, first);
  return first;
}
function catalogHint(q, b) {
  const kept = new Set(b.shelf.map(keyOf)), missing = answersOf(q).filter(c => !kept.has(keyOf(c)));
  if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every one is kept.'};
  if (fits(q, b.bench) && !kept.has(keyOf(b.bench))) return {type: 'move', action: {type: 'keep'}, text: 'Press Keep.'};
  const first = freeRoutes(q, b.bench), order = [...first.keys()];
  const aim = missing.reduce((best, c) => order.indexOf(keyOf(c)) < order.indexOf(keyOf(best)) ? c : best);
  const m = first.get(keyOf(aim));
  return {type: 'move', action: m, text: freeWords(b.bench, m)};
}
const listWords = list => list.join(', ');
function reachHint(q, b) {
  if (b.claim === 'halving') {
    const big = b.bench.find(x => x % 2 === 0);
    if (big) return {type: 'move', action: {type: 'cut', size: big, at: big / 2}, text: moveWords(b.bench, {type: 'cut', size: big, at: big / 2})};
    const g = b.goal.find(x => x % 2 === 0);
    return {type: 'move', action: {type: 'cut', size: g, at: g / 2, side: 'goal'}, text: moveWords(b.goal, {type: 'cut', size: g, at: g / 2}, 'goal')};
  }
  if (reachable(q.start, q.goal)) {
    const m = towards(b.bench, q.goal);
    return {type: 'move', action: m, text: moveWords(b.bench, m)};
  }
  // No route: halve the strips first, so the reason can be seen, then Can't.
  const big = b.bench.find(x => x % 2 === 0);
  if (big) return {type: 'move', action: {type: 'cut', size: big, at: big / 2}, text: moveWords(b.bench, {type: 'cut', size: big, at: big / 2})};
  if (!b.tried) { const m = halfMoves(b.bench)[0]; return {type: 'move', action: m, text: moveWords(b.bench, m)}; }
  return {type: 'move', action: {type: 'cant'}, text: `Halved all the way, the goal is ${listWords(oddForm(q.goal))}.`};
}
function matchHint(q, b) {
  if (b.card === null) {
    const i = q.cards.findIndex((_, k) => !b.paired.includes(k));
    return {type: 'move', action: {type: 'load', card: i}, text: `Tap ${listWords(q.cards[i])}.`};
  }
  const m = towards(b.bench, (q.to === 'odd' ? oddForm : joinAll)(q.cards[b.card]));
  return {type: 'move', action: m, text: moveWords(b.bench, m)};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return q.mode === 'catalog' ? catalogHint(q, b) : q.mode === 'reach' ? reachHint(q, b) : matchHint(q, b);
}

// --- Choosing (view state, outside the save) ------------------------------------
// The chosen strip, and a refusal that points at strips or a kept collection.
// Both belong to the board they were made on and vanish when it changes.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {chosen: null, told: null}); return uiState.get(p.id); }
const current = (state, field, b) => state[field] && state[field].at === JSON.stringify(b) ? state[field] : null;
// What a tap on strip i of a row does.
export function tapStrip(q, b, chosen, side, i) {
  const list = side === 'goal' ? b.goal : b.bench, size = list[i];
  const halving = !free(q);
  if (!chosen || chosen.side !== side || chosen.i >= list.length) return {ui: {choose: {side, i}}};
  if (chosen.i === i) {
    if (halving && size % 2 === 0) return {move: {type: 'cut', size, at: size / 2, ...(side === 'goal' ? {side} : {})}};
    return halving ? {ui: {told: {kind: 'halve', side, strips: [i]}}} : {ui: {choose: null}};
  }
  if (side === 'goal' || (q.mode === 'reach' && b.claim === 'halving')) return {ui: {choose: {side, i}}};
  const other = list[chosen.i];
  if (halving && other !== size) return {ui: {told: {kind: 'unequal', side, strips: [chosen.i, i]}}};
  if (q.mode === 'playground' && other + size > q.span) return {ui: {choose: {side, i}}};
  return {move: {type: 'join', sizes: [other, size]}};
}
// What Keep does: keep the collection, or point at why it can't be kept.
export function keepCheck(q, b) {
  const again = b.shelf.findIndex(c => same(c, b.bench));
  if (again >= 0) return {told: {kind: 'again', index: again}};
  if (fits(q, b.bench)) return {move: {type: 'keep'}};
  const marks = q.kind === 'odd' ? b.bench.map((x, i) => x % 2 === 0 ? i : -1) : q.kind === 'distinct' ? b.bench.map((x, i) => b.bench.indexOf(x) !== b.bench.lastIndexOf(x) ? i : -1) : b.bench.map((_, i) => i >= q.k ? i : -1);
  return {told: {kind: q.kind, side: 'bench', strips: marks.filter(i => i >= 0)}};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(3));
const TOLD = {unequal: 'Only equal strips join.', halve: 'Only even strips halve.', again: 'Kept already.', odd: 'Only odd strips.', distinct: 'Two strips match.', parts: 'Too many strips.'};
// Every view-only payload carries the board it was drawn for (set by render).
let drawnFor = '';
const uiAttr = payload => `data-ui='${esc(JSON.stringify({...payload, at: drawnFor}))}'`;
const button = (label, payload, cls, {move, enabled = true, hinted = false, focus, aria} = {}) =>
  `<button type="button" class="secondary jn-button ${cls}${hinted ? ' hinted' : ''}" data-action="${move ? 'expansion-move' : 'mechanic-ui'}" ${move ? `data-move="${esc(JSON.stringify(payload))}"` : uiAttr(payload)} data-focus="${focus || cls}"${aria ? ` aria-label="${esc(aria)}"` : ''}${enabled ? '' : ' disabled'}>${label}</button>`;
const tapAttrs = act => act.move ? `data-action="expansion-move" data-move="${esc(JSON.stringify(act.move))}"` : `data-action="mechanic-ui" ${uiAttr(act.ui)}`;
// A small picture of a collection: rows of unit squares, longest first.
export function thumb(list, span, label = listWords(list)) {
  const u = 6, w = span * u, h = list.length * u;
  const rows = list.map((x, r) => `<rect x="0.5" y="${r * u + 0.5}" width="${x * u - 1}" height="${u - 1}"/>${Array.from({length: x - 1}, (_, k) => `<line x1="${(k + 1) * u}" y1="${r * u + 0.5}" x2="${(k + 1) * u}" y2="${r * u + u - 0.5}"/>`).join('')}`).join('');
  return `<svg class="jn-thumb-svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">${rows}</svg>`;
}
// One row of strips: a button per strip, sized to the puzzle's longest strip.
function strips(p, b, side, opts) {
  const q = p.parameters, list = side === 'goal' ? b.goal : b.bench, {chosen, live, marks = [], hinted = [], off = []} = opts;
  return list.map((size, i) => {
    const isChosen = chosen && chosen.side === side && chosen.i === i;
    const act = live ? tapStrip(q, b, chosen, side, i) : null;
    const width = f(100 * size / q.span);
    const cls = ['jn-strip', side === 'goal' ? 'goal' : '', isChosen ? 'chosen' : '', marks.includes(i) ? 'marked' : '', hinted.includes(i) ? 'hinted' : '', off.includes(i) ? 'off' : ''].join(' ').replace(/\s+/g, ' ').trim();
    const mid = isChosen && !free(q) && size % 2 === 0 ? '<span class="jn-mid" aria-hidden="true"></span>' : '';
    const doing = act?.move ? (act.move.type === 'cut' ? '. Halve it' : `. Join it to the ${list[chosen.i]}`) : '';
    const label = `${size}${isChosen ? ', chosen' : ''}${doing}`;
    const cuts = isChosen && live && free(q) ? Array.from({length: size - 1}, (_, k) => {
      const at = k + 1, m = {type: 'cut', size, at: Math.max(at, size - at)};
      return `<button type="button" class="jn-cut" style="left:${f(100 * (at - 0.5) / q.span)}%;width:${f(100 / q.span)}%" ${tapAttrs({move: m})} data-focus="jn-${side}-${i}" aria-label="Cut into ${at} and ${size - at}"></button>`;
    }).join('') : '';
    const tag = live ? 'button' : 'div';
    const attrs = live ? `type="button" ${tapAttrs(act)} data-focus="jn-${side}-${i}" aria-label="${esc(label)}"${isChosen ? ' aria-pressed="true"' : ''}` : `role="img" aria-label="${size}"`;
    return `<div class="jn-row"><${tag} class="${cls}" style="width:${width}%;--l:${size}" ${attrs}>${mid}</${tag}>${cuts}</div>`;
  }).join('');
}
// The strips a hint names, by index in the row.
function hintedStrips(list, action) {
  if (!action) return [];
  if (action.type === 'cut') return [list.indexOf(action.size)];
  if (action.type === 'join') { const [x, y] = action.sizes, i = list.indexOf(x), k = x === y ? list.indexOf(y, i + 1) : list.indexOf(y); return [i, k]; }
  return [];
}
// After a right Can't: the strips with no partner in the other row.
function unmatched(a, b) {
  const left = [...b];
  return a.map((x, i) => { const k = left.indexOf(x); if (k >= 0) { left.splice(k, 1); return -1; } return i; }).filter(i => i >= 0);
}

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  drawnFor = JSON.stringify(b);
  const chosen = done ? null : current(state, 'chosen', b), told = done ? null : current(state, 'told', b);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const marks = side => told && told.side === side && told.strips ? told.strips : [];
  const hintOn = side => act && (act.side || 'bench') === side ? hintedStrips(side === 'goal' ? b.goal : b.bench, act) : [];
  const live = !done;
  let top = '', rows = '', bar = '', below = '', note = told ? TOLD[told.kind] : '', status = '';
  const bench = (opts = {}) => `<div class="jn-bench" role="group" aria-label="Strips">${strips(p, b, 'bench', {chosen, live, marks: marks('bench'), hinted: hintOn('bench'), ...opts})}</div>`;
  if (q.mode === 'catalog') {
    const keep = done ? null : keepCheck(q, b);
    rows = bench();
    if (!done) bar = `${keep.move ? button('Keep', keep.move, 'jn-keep', {move: true, hinted: act?.type === 'keep'}) : button('Keep', {told: keep.told}, 'jn-keep')}${q.flip ? button('Flip', {type: 'flip'}, 'jn-flip', {move: true, hinted: act?.type === 'flip', aria: 'Flip rows and columns'}) : ''}${button('That’s all', {type: 'all'}, 'jn-all', {move: true, enabled: b.shelf.length > 0 && !b.more, hinted: act?.type === 'all'})}`;
    const again = told?.kind === 'again' ? told.index : -1;
    below = b.shelf.length ? `<div class="jn-shelf" role="list" aria-label="Kept">${b.shelf.map((c, i) => `<span class="jn-thumb${i === again ? ' again' : ''}" role="listitem">${thumb(c, q.total)}</span>`).join('')}</div>` : '';
    if (!note && b.more) note = 'There is another.';
    status = `Strips ${listWords(b.bench)}.${b.shelf.length ? ` Kept: ${b.shelf.map(listWords).join('; ')}.` : ''}`;
  } else if (q.mode === 'reach') {
    const phase = b.claim === 'halving';
    const off = done && phase ? {bench: unmatched(b.bench, b.goal), goal: unmatched(b.goal, b.bench)} : {bench: [], goal: []};
    top = `<div class="jn-goal${phase ? ' open' : ''}" style="--n:${b.goal.length}" role="group" aria-label="Goal"><span class="jn-tag" aria-hidden="true">Goal</span>${strips(p, b, 'goal', {chosen, live: live && phase, marks: marks('goal'), hinted: hintOn('goal'), off: off.goal})}</div>`;
    rows = bench({off: off.bench});
    if (!done && !phase) bar = button('Can’t', {type: 'cant'}, 'jn-cant', {move: true, enabled: b.tried && b.claim === null, hinted: act?.type === 'cant'});
    if (!note) note = done && phase ? 'The odd strips differ.' : phase ? 'Halve every even strip in both rows.' : b.claim === 'refused' ? 'There is a way.' : '';
    status = `Strips ${listWords(b.bench)}. Goal ${listWords(b.goal)}.`;
  } else if (q.mode === 'match') {
    top = `<div class="jn-cards" role="group" aria-label="Collections">${q.cards.map((c, i) => {
      const paired = b.paired.includes(i), partner = paired ? (q.to === 'odd' ? oddForm(c) : joinAll(c)) : null;
      const pic = thumb(c, q.span, listWords(c));
      if (paired) return `<span class="jn-card paired" role="img" aria-label="${esc(`${listWords(c)} pairs with ${listWords(partner)}`)}">${pic}<span class="jn-arrow" aria-hidden="true">→</span>${thumb(partner, q.span, listWords(partner))}</span>`;
      const hinted = act?.type === 'load' && act.card === i;
      // The card on the bench stays a button that does nothing, so focus stays on it.
      const action = b.card === i ? `data-action="mechanic-ui" ${uiAttr({})}` : `data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'load', card: i}))}"`;
      return `<button type="button" class="jn-card${b.card === i ? ' loaded' : ''}${hinted ? ' hinted' : ''}" ${action} data-focus="jn-card-${i}" aria-pressed="${b.card === i}" aria-label="${esc(listWords(c))}">${pic}</button>`;
    }).join('')}</div>`;
    rows = b.bench ? bench() : '';
    status = `${b.bench ? `Strips ${listWords(b.bench)}.` : ''} ${b.paired.length ? `Paired: ${b.paired.map(i => listWords(q.cards[i])).join('; ')}.` : ''}`.trim();
  } else {
    rows = bench();
    bar = `${button('+', {type: 'add'}, 'jn-add', {move: true, enabled: sum(b.bench) < q.max, aria: 'Add a 1'})}${button('−', {type: 'remove'}, 'jn-remove', {move: true, enabled: b.bench.includes(1) && b.bench.length > 1, aria: 'Take away a 1'})}`;
    status = `Strips ${listWords(b.bench)}.`;
  }
  const chosenWords = chosen ? ` ${(chosen.side === 'goal' ? b.goal : b.bench)?.[chosen.i]} chosen.` : '';
  return `<div class="jn-puzzle${done ? ' solved' : ''} jn-${q.mode}" data-mechanic-wire="joins" style="--span:${q.span}">${top}${rows}${bar ? `<div class="jn-bar">${bar}</div>` : ''}${note ? `<p class="jn-told">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(`${status}${chosenWords}${note ? ` ${note}` : ''}`)}</p></div>`;
}

export const joinsMechanics = {
  joins: {
    fresh, valid, solved, move, hint, render,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p), b = payload.at;
      state.told = null;
      if (Object.hasOwn(payload, 'choose')) state.chosen = payload.choose && Number.isInteger(payload.choose.i) && ['bench', 'goal'].includes(payload.choose.side) ? {...payload.choose, at: b} : null;
      if (object(payload.told) && TOLD[payload.told.kind]) { state.told = {...payload.told, at: b}; if (payload.told.kind !== 'unequal') state.chosen = null; }
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves, keeps and pairs, never a verdict: "There is
    // another." stays while anything is kept, and "There is a way." stays
    // (with the goal row as it was at that step) until the bench moves.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'catalog' && from.more && Array.isArray(to.shelf) && to.shelf.length) return {...to, more: true, done: false};
      if (q.mode === 'reach' && from.claim === 'refused') return {...to, claim: 'refused', tried: true};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'joins',
  family: {id: 'joins', symbol: '▤', area: 'numbers'},
  mechanics: joinsMechanics,
  pack: new URL('./joins.json', import.meta.url).href,
  css: new URL('./joins.css', import.meta.url).href,
  focus: 'button.jn-strip:not([disabled]),button.jn-card:not([disabled]),.jn-keep'
};
