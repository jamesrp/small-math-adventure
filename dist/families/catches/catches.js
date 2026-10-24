// Catch and mark (worksheet Week 95, Count the unseen). A bag holds N
// lettered tiles. A first catch of M tiles is marked with a dot and goes
// back; a second catch of n tiles holds some dotted tiles, the overlap R.
// In a bag of N the overlap can be every number from max(0, M + n − N) to
// min(M, n) and nothing else: only N − M tiles are plain, so a catch of n
// holds at least n − (N − M) dots, and swapping one tile changes the overlap
// by at most one. Turned around, a record of catches M and n with overlap R
// shows M + n − R different tiles, so the bag holds at least that many, and
// any bigger bag could give the same record. Counting every second catch by
// its dots gives C(M, R) · C(N − M, n − R) catches with R dots, and the
// average overlap is Mn/N. The child taps tiles into the two catches; the
// puzzles ask for a second catch that matches a goal (or Can't, shown by the
// closest catch), every overlap a bag allows, every bag that fits a record,
// and every second catch, sorted by its dots on the shared case engine
// (dist/cases.js). The playground makes random catches and piles them by
// overlap.
import {esc} from '../../expansion-controls.js';
import {keepCase, claimCases, missingCases, validShelf, binsHTML, catalogHTML, nearestCase} from '../../cases.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = b => Object.keys(b).sort().join();
export const MODES = ['arrange', 'every', 'sizes', 'sort', 'playground'];
const CATALOGS = ['every', 'sizes', 'sort'];
const catalog = q => CATALOGS.includes(q.mode);
export const LETTERS = 'ABCDEFGHIJKLMNOPQRST';
export const MIN_BAG = 3, MAX_BAG = 20, MAX_CATCH = 8, MAX_ROUNDS = 60;
const range = (lo, hi) => Array.from({length: Math.max(0, hi - lo + 1)}, (_, i) => lo + i);
const byNumber = (x, y) => x - y;

// --- The mathematics -----------------------------------------------------------
export const lowest = (N, M, n) => Math.max(0, M + n - N);
export const highest = (M, n) => Math.min(M, n);
export const overlapsOf = (N, M, n) => range(lowest(N, M, n), highest(M, n));
export const fits = (N, M, n, R) => M <= N && n <= N && R >= lowest(N, M, n) && R <= highest(M, n);
export const smallestBag = (M, n, R) => M + n - R;
export const overlapOf = (first, second) => second.filter(t => first.includes(t)).length;
export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= k; i++) c = c * (n - k + i) / i;
  return Math.round(c);
}
// The catches of k tiles from a bag of N, as sorted lists, in dictionary order.
const subsetMemo = new Map();
export function subsets(N, k) {
  const id = `${N},${k}`;
  if (subsetMemo.has(id)) return subsetMemo.get(id);
  const out = [];
  (function grow(start, picked) {
    if (picked.length === k) { out.push(picked); return; }
    for (let i = start; i < N; i++) grow(i + 1, [...picked, i]);
  })(0, []);
  subsetMemo.set(id, out);
  return out;
}
export const keyOf = tiles => [...tiles].sort(byNumber).map(i => LETTERS[i]).join('');
export const tilesOf = key => [...key].map(ch => LETTERS.indexOf(ch));

// --- Puzzles and boards ----------------------------------------------------------
// Parameters:
//   arrange:    {bag, m, n, goal}   a second catch with `goal` dots, or Can't
//   every:      {bag, m, n}         every overlap the bag allows
//   sizes:      {bags, start, m, n, goal}   every bag in `bags` that can match the goal
//   sort:       {bag, marked, n}    every second catch, by its dots; the first catch is given
//   playground: {bag, m, n}         the starting sizes
// Boards hold the tiles of each catch (bag places 0, 1, 2, …, drawn A, B, C, …)
// in the order they went in:
//   arrange:    {first, second, cant, refused}
//   every:      {first, second, kept, claimed, missed}
//   sizes:      {bag, first, second, kept, claimed, missed}
//   sort:       {second, kept, claimed, missed}
//   playground: {bag, m, n, first, second, rounds}   rounds: the overlaps so far
// `refused` answers a wrong Can't and lasts while the catches stay as they
// are; `missed` answers an early That's all and lasts until the shelf grows.
const bagOf = (q, b) => (q.mode === 'sizes' || q.mode === 'playground' ? b.bag : q.bag);
const firstOf = (q, b) => (q.mode === 'sort' ? q.marked : b.first);
const mOf = (q, b) => (q.mode === 'sort' ? q.marked.length : q.mode === 'playground' ? b.m : q.m);
const nOf = (q, b) => (q.mode === 'playground' ? b.n : q.n);
export function stateOf(q, b) {
  const N = bagOf(q, b), M = mOf(q, b), n = nOf(q, b), first = firstOf(q, b), second = b.second;
  const full1 = first.length === M, full2 = second.length === n;
  return {N, M, n, first, second, full1, full2, full: full1 && full2, overlap: overlapOf(first, second), low: lowest(N, M, n), high: highest(M, n)};
}
// What counts on the shelf: overlaps, bags or second catches, as keys.
const targetMemo = new Map();
export function targetOf(q) {
  const id = JSON.stringify(q);
  if (targetMemo.has(id)) return targetMemo.get(id);
  let out = [];
  if (q.mode === 'every') out = overlapsOf(q.bag, q.m, q.n).map(String);
  if (q.mode === 'sizes') out = q.bags.filter(N => fits(N, q.m, q.n, q.goal)).map(String);
  if (q.mode === 'sort') out = subsets(q.bag, q.n).map(keyOf);
  targetMemo.set(id, out);
  return out;
}
// Can't is right when the goal is out of reach and the catches show the
// nearest overlap there is: every plain tile caught (the goal is too few
// dots) or every dot that fits caught (the goal is too many).
export function cantHolds(q, s) {
  if (!s.full) return false;
  if (q.goal < s.low) return s.overlap === s.low;
  if (q.goal > s.high) return s.overlap === s.high;
  return false;
}
const tilesOk = (list, N, max) => Array.isArray(list) && list.length <= max && list.every(t => Number.isInteger(t) && t >= 0 && t < N) && new Set(list).size === list.length;

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'arrange') return {first: [], second: [], cant: false, refused: false};
  if (q.mode === 'every') return {first: [], second: [], kept: [], claimed: false, missed: false};
  if (q.mode === 'sizes') return {bag: q.start, first: [], second: [], kept: [], claimed: false, missed: false};
  if (q.mode === 'sort') return {second: [], kept: [], claimed: false, missed: false};
  return {bag: q.bag, m: q.m, n: q.n, first: [], second: [], rounds: []};
}
const FIELDS = {arrange: 'cant,first,refused,second', every: 'claimed,first,kept,missed,second', sizes: 'bag,claimed,first,kept,missed,second', sort: 'claimed,kept,missed,second', playground: 'bag,first,m,n,rounds,second'};
function validPlayground(b) {
  const {bag: N, m, n} = b;
  if (!Number.isInteger(N) || N < MIN_BAG || N > MAX_BAG) return false;
  if (![m, n].every(k => Number.isInteger(k) && k >= 1 && k <= Math.min(N, MAX_CATCH))) return false;
  if (!Array.isArray(b.rounds) || b.rounds.length > MAX_ROUNDS || !b.rounds.every(r => Number.isInteger(r) && r >= lowest(N, m, n) && r <= highest(m, n))) return false;
  if (!b.rounds.length) return Array.isArray(b.first) && Array.isArray(b.second) && !b.first.length && !b.second.length;
  return tilesOk(b.first, N, m) && b.first.length === m && tilesOk(b.second, N, n) && b.second.length === n && overlapOf(b.first, b.second) === b.rounds.at(-1);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || keys(b) !== FIELDS[q.mode]) return false;
  if (q.mode === 'playground') return validPlayground(b);
  if (q.mode === 'sizes' && !q.bags.includes(b.bag)) return false;
  const N = bagOf(q, b);
  if (q.mode !== 'sort' && !tilesOk(b.first, N, q.m)) return false;
  if (!tilesOk(b.second, N, q.n)) return false;
  if (q.mode === 'arrange') {
    if (typeof b.cant !== 'boolean' || typeof b.refused !== 'boolean' || (b.cant && b.refused)) return false;
    const s = stateOf(q, b);
    if (b.cant && !cantHolds(q, s)) return false;
    return !b.refused || (s.full && s.overlap !== q.goal && !cantHolds(q, s));
  }
  return validShelf(b, targetOf(q));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'arrange') { const s = stateOf(q, b); return b.cant || (s.full && s.overlap === q.goal); }
  return b.claimed;
}
// Full catches count at once: their overlap, their bag (when they match the
// goal) or the second catch itself joins the shelf.
function credit(q, b) {
  if (!catalog(q)) return b;
  const s = stateOf(q, b);
  if (!s.full) return b;
  const key = q.mode === 'every' ? String(s.overlap) : q.mode === 'sizes' ? (s.overlap === q.goal ? String(b.bag) : null) : keyOf(s.second);
  const target = targetOf(q), kept = key === null ? null : keepCase(b.kept, key, k => target.includes(k));
  return kept ? {...b, kept, missed: false} : b;
}
const toggle = (list, t) => (list.includes(t) ? list.filter(x => x !== t) : [...list, t]);
// A random catch of k tiles from a bag of N, as a sorted list.
function sample(N, k, random) {
  const tiles = range(0, N - 1);
  for (let i = 0; i < k; i++) { const j = i + Math.floor(random() * (N - i)); [tiles[i], tiles[j]] = [tiles[j], tiles[i]]; }
  return tiles.slice(0, k).sort(byNumber);
}
function playMove(b, action, random) {
  const t = action.type;
  if (t === 'bag') {
    if (keys(action) !== 'by,type' || (action.by !== 1 && action.by !== -1)) return null;
    const N = b.bag + action.by;
    if (N < MIN_BAG || N > MAX_BAG) return null;
    return {bag: N, m: Math.min(b.m, N), n: Math.min(b.n, N), first: [], second: [], rounds: []};
  }
  if (t === 'catch') {
    if (keys(action) !== 'by,type,which' || (action.by !== 1 && action.by !== -1) || (action.which !== 1 && action.which !== 2)) return null;
    const field = action.which === 1 ? 'm' : 'n', k = b[field] + action.by;
    if (k < 1 || k > Math.min(b.bag, MAX_CATCH)) return null;
    return {...b, [field]: k, first: [], second: [], rounds: []};
  }
  if (t === 'round') {
    if (keys(action) !== 'count,type' || (action.count !== 1 && action.count !== 10) || b.rounds.length >= MAX_ROUNDS) return null;
    let next = b;
    for (let k = 0; k < action.count && next.rounds.length < MAX_ROUNDS; k++) {
      const first = sample(b.bag, b.m, random), second = sample(b.bag, b.n, random);
      next = {...next, first, second, rounds: [...next.rounds, overlapOf(first, second)]};
    }
    return next;
  }
  if (t === 'clear') return keys(action) === 'type' && b.rounds.length ? {...b, first: [], second: [], rounds: []} : null;
  return null;
}
function move(p, b, action, random = Math.random) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'playground') return playMove(b, action, random);
  const s = stateOf(q, b), t = action.type;
  let next;
  if (t === 'tap') {
    const i = action.tile;
    if (keys(action) !== 'tile,type' || !Number.isInteger(i) || i < 0 || i >= s.N) return null;
    // Taps fill the first catch until it is full, then the second.
    if (q.mode !== 'sort' && !s.full1) next = {...b, first: toggle(b.first, i)};
    else if (!b.second.includes(i) && s.full2) return null;
    else next = {...b, second: toggle(b.second, i)};
  } else if (t === 'out') {
    if (keys(action) !== 'tile,type,which') return null;
    const field = action.which === 1 && q.mode !== 'sort' ? 'first' : action.which === 2 ? 'second' : null;
    if (!field || !b[field].includes(action.tile)) return null;
    next = {...b, [field]: b[field].filter(x => x !== action.tile)};
  } else if (t === 'size') {
    if (q.mode !== 'sizes' || keys(action) !== 'size,type' || !q.bags.includes(action.size) || action.size === b.bag) return null;
    const N = action.size;
    // A new bag keeps the first catch's tiles that are in it but starts the
    // second catch afresh, so each bag is tried with catches of its own.
    next = {...b, bag: N, first: b.first.filter(x => x < N), second: []};
  } else if (t === 'cant') {
    if (q.mode !== 'arrange' || keys(action) !== 'type' || !s.full || b.refused) return null;
    return cantHolds(q, s) ? {...b, cant: true} : {...b, refused: true};
  } else if (t === 'all') {
    if (!catalog(q) || keys(action) !== 'type' || !b.kept.length || b.missed) return null;
    return {...b, ...claimCases(targetOf(q), b.kept)};
  } else return null;
  if (q.mode === 'arrange') next = {...next, refused: false};
  return credit(q, next);
}

// --- Hints ---------------------------------------------------------------------
const L = i => LETTERS[i];
const ALL = {every: 'Every number of dots is found.', sizes: 'Every bag is found.', sort: 'Every catch is found.'};
const CANT = {low: 'Every plain tile is in the second catch. Press Can’t.', high: 'Every dotted tile is in the second catch. Press Can’t.'};
const tap = (tile, text) => ({type: 'move', action: {type: 'tap', tile}, text});
// One step toward a second catch with t dots, the first catch full: take out
// what is over, then add what is short. Null when the catch is there.
function stepToward(s, t, word = 'the second catch') {
  const dotted = s.second.filter(x => s.first.includes(x)).sort(byNumber), plain = s.second.filter(x => !s.first.includes(x)).sort(byNumber);
  if (dotted.length > t) return tap(dotted[0], `Take ${L(dotted[0])} out of ${word}.`);
  if (plain.length > s.n - t) return tap(plain[0], `Take ${L(plain[0])} out of ${word}.`);
  if (dotted.length < t) { const x = [...s.first].sort(byNumber).find(i => !s.second.includes(i)); return tap(x, `Put ${L(x)} in ${word}.`); }
  if (plain.length < s.n - t) { const x = range(0, s.N - 1).find(i => !s.first.includes(i) && !s.second.includes(i)); return tap(x, `Put ${L(x)} in ${word}.`); }
  return null;
}
const shared = (a, b) => a.filter(x => b.includes(x)).length;
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const s = stateOf(q, b);
  let aim = null;
  if (catalog(q)) {
    const missing = missingCases(targetOf(q), b.kept);
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: ALL[q.mode]};
    if (q.mode === 'sizes' && !missing.includes(String(b.bag))) { const N = Number(missing.find(k => Number(k) >= b.bag) ?? missing.at(-1)); return {type: 'move', action: {type: 'size', size: N}, text: `Choose the bag of ${N}.`}; }
    if (q.mode === 'sort') {
      // The missing catch nearest the board: change one tile at a time.
      const goal = tilesOf(nearestCase(missing, keyOf(s.second), (key) => q.n - shared(tilesOf(key), s.second)));
      const extra = s.second.filter(i => !goal.includes(i)).sort(byNumber)[0];
      if (extra !== undefined) return tap(extra, `Take ${L(extra)} out of the catch.`);
      const add = goal.find(i => !s.second.includes(i));
      return tap(add, `Put ${L(add)} in the catch.`);
    }
    if (q.mode === 'every') aim = Number(missing[0]);
  }
  if (!s.full1) { const x = range(0, s.N - 1).find(i => !s.first.includes(i)); return tap(x, `Put ${L(x)} in the first catch.`); }
  if (aim === null) aim = Math.min(Math.max(q.goal, s.low), s.high);
  return stepToward(s, aim) || {type: 'move', action: {type: 'cant'}, text: q.goal < s.low ? CANT.low : CANT.high};
}

// --- Drawing ---------------------------------------------------------------------
// A pattern: a second catch drawn as n squares, the first k dotted.
export function patternHTML(n, k, label = `${k} dotted, ${n - k} plain`) {
  return `<span class="ck-pattern" role="img" aria-label="${esc(label)}">${range(1, n).map(i => `<span class="ck-p${i <= k ? ' dot' : ''}"></span>`).join('')}</span>`;
}
const sayDots = k => (k === 1 ? '1 dotted tile' : `${k} dotted tiles`);
// A small catch: its letters, dotted where marked.
const catchMini = (key, marked) => `<span class="ck-mini">${[...key].map(ch => `<span class="ck-m${marked.includes(LETTERS.indexOf(ch)) ? ' dot' : ''}">${ch}</span>`).join('')}</span>`;
const sayCatch = (key, marked) => `${[...key].join(' ')}, ${sayDots([...key].filter(ch => marked.includes(LETTERS.indexOf(ch))).length)}`;
const columnsFor = N => (N <= 6 ? N : Math.ceil(N / Math.ceil(N / 6)));
const moveAttr = action => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"`;
const sameAction = (x, y) => x && y && JSON.stringify(x) === JSON.stringify(y);
const button = (label, action, cls, {enabled = true, hinted = false} = {}) =>
  `<button type="button" class="secondary ck-button ${cls}${hinted ? ' hinted' : ''}" ${moveAttr(action)} data-focus="${cls}"${enabled ? '' : ' disabled'}>${label}</button>`;

function tileHTML(i, s, {live, act, sort, proof}) {
  const marked = s.first.includes(i), caught = s.second.includes(i);
  const cls = ['ck-tile', marked ? 'marked' : '', caught ? 'caught' : '', proof.includes(i) ? 'proof' : '', act && act.type === 'tap' && act.tile === i ? 'hinted' : ''].filter(Boolean).join(' ');
  const face = `<span class="ck-letter">${L(i)}</span>${marked ? '<span class="ck-dot" aria-hidden="true"></span>' : ''}`;
  const name = `${L(i)}${marked ? ', dotted' : ''}${caught ? ', in the second catch' : ''}`;
  if (!live) return `<span class="${cls}" role="img" aria-label="${esc(name)}">${face}</span>`;
  const enabled = (!sort && !s.full1) || caught || !s.full2;
  return `<button type="button" class="${cls}" ${moveAttr({type: 'tap', tile: i})} data-focus="ck-tile-${i}" aria-label="${esc(name)}"${enabled ? '' : ' disabled'}>${face}</button>`;
}
export function bagHTML(s, o) {
  const tiles = range(0, s.N - 1).map(i => tileHTML(i, s, o)).join('');
  return `<div class="ck-bag" style="--cols:${columnsFor(s.N)}" role="group" aria-label="The bag">${tiles}</div>`;
}
function trayHTML(which, s, {live, act, fixed, proof}) {
  const list = which === 1 ? s.first : s.second, size = which === 1 ? s.M : s.n;
  const active = live && !fixed && (which === 1 ? !s.full1 : s.full1);
  const slots = range(0, size - 1).map(k => {
    const t = list[k];
    if (t === undefined) return '<span class="ck-slot empty" aria-hidden="true"></span>';
    const marked = s.first.includes(t), cls = `ck-slot${marked ? ' marked' : ''}${which === 2 && proof.includes(t) ? ' proof' : ''}${sameAction(act, {type: 'out', which, tile: t}) ? ' hinted' : ''}`;
    const face = `<span class="ck-letter">${L(t)}</span>${marked ? '<span class="ck-dot" aria-hidden="true"></span>' : ''}`;
    const name = `${L(t)}${marked ? ', dotted' : ''}`;
    return live && !fixed
      ? `<button type="button" class="${cls}" ${moveAttr({type: 'out', which, tile: t})} data-focus="ck-out-${which}-${t}" aria-label="${esc(`${name}: take out of the ${which === 1 ? 'first' : 'second'} catch`)}">${face}</button>`
      : `<span class="${cls}" role="img" aria-label="${esc(name)}">${face}</span>`;
  }).join('');
  return `<div class="ck-tray${active ? ' active' : ''}" role="group" aria-label="${which === 1 ? 'First' : 'Second'} catch"><span class="ck-tray-tag" aria-hidden="true">${which === 1 ? '1st' : '2nd'} catch</span><span class="ck-slots">${slots}</span></div>`;
}
const words = list => (list.length ? list.map(L).join(', ') : 'empty');

function render(p, a) {
  const q = p.parameters, b = a.board;
  if (q.mode === 'playground') return renderPlayground(b);
  const done = solved(p, b), s = stateOf(q, b);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  // A Can't that stands: the plain tiles (or the dotted ones) all caught.
  const proof = b.cant ? s.second.filter(t => (q.goal < s.low ? !s.first.includes(t) : s.first.includes(t))) : [];
  let top = '', below = '', note = '';
  if (q.mode === 'arrange' || q.mode === 'sizes') {
    const met = s.full && s.overlap === q.goal;
    top = `<div class="ck-goal${met ? ' met' : ''}${b.cant ? ' cant' : ''}"><span class="ck-tag" aria-hidden="true">Goal</span>${patternHTML(q.n, q.goal, `Goal: a second catch with ${sayDots(q.goal)} and ${q.n - q.goal} plain`)}</div>`;
  }
  if (q.mode === 'sizes') {
    const target = targetOf(q);
    top += `<div class="ck-bags" role="group" aria-label="Bags">${q.bags.map(N => {
      const found = b.kept.includes(String(N)), cls = `ck-bag-chip${found ? ' found' : ''}${done && !target.includes(String(N)) ? ' no' : ''}${sameAction(act, {type: 'size', size: N}) ? ' hinted' : ''}`;
      const name = `Bag of ${N}${found ? ', found' : ''}`, tick = found ? '<span class="ck-tick" aria-hidden="true">✓</span>' : '';
      return done ? `<span class="${cls}" role="img" aria-label="${esc(name)}">${N}${tick}</span>` : `<button type="button" class="${cls}" ${moveAttr({type: 'size', size: N})} data-focus="ck-bag-${N}" aria-pressed="${N === b.bag}" aria-label="${esc(name)}">${N}${tick}</button>`;
    }).join('')}</div>`;
  }
  const live = !done, sort = q.mode === 'sort';
  const board = `${bagHTML(s, {live, act, sort, proof})}<div class="ck-trays">${trayHTML(1, s, {live, act, fixed: sort, proof})}${trayHTML(2, s, {live, act, fixed: false, proof})}</div>`;
  let bar = '';
  if (q.mode === 'arrange' && !done) bar = button('Can’t', {type: 'cant'}, 'ck-cant', {enabled: s.full && !b.refused, hinted: act?.type === 'cant'});
  if (catalog(q) && !done) bar = button('That’s all', {type: 'all'}, 'ck-all', {enabled: b.kept.length > 0 && !b.missed, hinted: act?.type === 'all'});
  if (q.mode === 'arrange') {
    if (b.refused) note = s.overlap > q.goal ? 'A plain tile could swap in.' : 'A dotted tile could swap in.';
    if (b.cant) note = q.goal < s.low ? 'Every plain tile is in the second catch.' : 'Every dotted tile is in the second catch.';
  }
  if (catalog(q) && b.missed) note = 'There is another.';
  if (q.mode === 'every') {
    const now = s.full ? String(s.overlap) : null;
    if (done) {
      const target = targetOf(q);
      below = `<section class="case-catalog ck-catalog" aria-label="Every number of dots"><ol class="case-list">${range(0, s.high).map((k, i) => `<li class="case-kept ${target.includes(String(k)) ? 'yes' : 'no'}" style="--i:${i}" aria-label="${esc(`${sayDots(k)}${target.includes(String(k)) ? '' : ': never'}`)}">${patternHTML(q.n, k, sayDots(k))}</li>`).join('')}</ol></section>`;
    } else if (b.kept.length) {
      below = `<section class="case-shelf ck-shelf" aria-label="Found"><ol class="case-list">${b.kept.map(k => `<li class="case-kept${k === now ? ' current' : ''}" aria-label="${esc(sayDots(Number(k)))}">${patternHTML(q.n, Number(k), sayDots(Number(k)))}</li>`).join('')}</ol></section>`;
    }
  }
  if (sort) {
    const bins = range(s.low, s.high).map(k => ({id: String(k), label: patternHTML(q.n, k, sayDots(k))}));
    const bin = key => String(tilesOf(key).filter(t => q.marked.includes(t)).length);
    const o = {mini: key => catchMini(key, q.marked), say: key => sayCatch(key, q.marked)};
    below = done
      ? catalogHTML(targetOf(q), bins, bin, {...o, label: 'Every second catch, by its dots', mark: () => 'yes'})
      : binsHTML(b.kept, bins, bin, {...o, always: true, current: s.full ? keyOf(s.second) : null, label: 'Catches found, by their dots'});
  }
  const status = `${q.mode === 'sizes' ? `Bag of ${b.bag}. ` : ''}First catch: ${words(s.first)}. Second catch: ${words(s.second)}.${s.full ? ` ${sayDots(s.overlap)} in the second catch.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="ck-puzzle ck-${q.mode}${done ? ' solved' : ''}">${top}${board}${bar ? `<div class="ck-bar">${bar}</div>` : ''}${note ? `<p class="ck-told">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// The playground: steppers for the bag and the catches, random catches, and
// a pile for each overlap.
function stepper(label, value, which, down, up) {
  const act = by => (which ? {type: 'catch', which, by} : {type: 'bag', by});
  const id = which ? `ck-catch-${which}` : 'ck-size';
  const step = (by, ok, sign, word) => `<button type="button" class="ck-step" ${moveAttr(act(by))} data-focus="${id}-${by < 0 ? 'down' : 'up'}" aria-label="${esc(`${label}: ${word}`)}"${ok ? '' : ' disabled'}>${sign}</button>`;
  return `<div class="ck-stepper" role="group" aria-label="${esc(label)}"><span class="ck-step-tag">${label}</span>${step(-1, down, '−', 'fewer')}<span class="ck-step-value">${value}</span>${step(1, up, '+', 'more')}</div>`;
}
function renderPlayground(b) {
  const s = {N: b.bag, M: b.m, n: b.n, first: b.first, second: b.second, full1: true, full2: true};
  const counts = range(0, highest(b.m, b.n)).map(k => b.rounds.filter(r => r === k).length);
  const piles = `<div class="ck-piles" role="group" aria-label="Catches by their dots">${counts.map((c, k) => `<div class="ck-pile" role="img" aria-label="${esc(`${sayDots(k)}: ${c}`)}"><span class="ck-pile-count">${c || ''}</span><span class="ck-pebbles">${'<i></i>'.repeat(c)}</span><span class="ck-pile-tag" aria-hidden="true">${k}</span></div>`).join('')}</div>`;
  const full = b.rounds.length >= MAX_ROUNDS;
  const bar = `<div class="ck-bar">${button('Catch', {type: 'round', count: 1}, 'ck-round', {enabled: !full})}${button('Catch 10', {type: 'round', count: 10}, 'ck-ten', {enabled: !full})}${button('Clear', {type: 'clear'}, 'ck-clear', {enabled: b.rounds.length > 0})}</div>`;
  const status = b.rounds.length ? `Last catch: first ${words(b.first)}, second ${words(b.second)}, ${sayDots(b.rounds.at(-1))}. ${b.rounds.length} catches so far.` : 'No catches yet.';
  return `<div class="ck-puzzle ck-playground"><div class="ck-steppers">${stepper('Bag', b.bag, 0, b.bag > MIN_BAG, b.bag < MAX_BAG)}${stepper('1st catch', b.m, 1, b.m > 1, b.m < Math.min(b.bag, MAX_CATCH))}${stepper('2nd catch', b.n, 2, b.n > 1, b.n < Math.min(b.bag, MAX_CATCH))}</div>${bagHTML(s, {live: false, act: null, sort: false, proof: []})}${bar}${piles}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

export const catchMechanics = {
  catches: {
    fresh, valid, solved, move, hint, render,
    // Undo takes back taps, never a discovery: the shelf and a refused
    // That's all stay, and a refused Can't stays while the catches do.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (catalog(q) && Array.isArray(from.kept)) return {...to, kept: [...from.kept], missed: from.missed === true && from.kept.length > 0};
      if (q.mode === 'arrange' && from.refused && String(from.first) === String(to.first) && String(from.second) === String(to.second)) return {...to, refused: true};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'catches',
  family: {id: 'catches', symbol: '⊙'},
  mechanics: catchMechanics,
  pack: new URL('./catches.json', import.meta.url).href,
  css: new URL('./catches.css', import.meta.url).href,
  focus: 'button.ck-tile:not([disabled]),.ck-cant:not([disabled]),.ck-all:not([disabled])'
};
