// Seed plots (worksheet Week 98, growing from a few seeds). Seeds are planted
// on a plot of squares, and an empty square grows when at least two squares
// sharing its sides are filled; corners don't count and nothing outside the
// plot helps. Every complete run from the same seeds ends in the same set,
// the least set holding the seeds that no square outside it could grow into.
// The fence, every side of a filled square with no filled square beside it,
// never grows: a square that grows beside k filled squares changes it by
// 4 − 2k ≤ 0. So s seeds, with a fence of at most 4s, fill a plot whose own
// fence is P only if 4s ≥ P: an n-by-n plot needs n seeds, and the diagonal
// does it. A square with one neighbour on the plot can never grow, so it must
// be a seed. A start can need every seed without being the fewest (four on
// 3 by 3, where the three-seed diagonal fills). Puzzles ask to fill a plot
// within a seed budget or answer Can't (the fence is the certificate), to
// fill with the fewest seeds, to fill with seeds that are all needed, and to
// find every number of squares a few seeds can finish with. The grid is
// ../../sq-grid.js; see docs/seeds/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, boundaryOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const keysAre = (o, keys) => Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
export const MODES = ['fill', 'fewest', 'needed', 'finishes', 'playground'];
export const PLAY_SIZES = [4, 6, 8];
export const CLAIMS = {fill: 'Can’t', fewest: 'Fewest', finishes: 'That’s all'};
export const TOLD = {spread: 'Spread the seeds out first.', possible: 'It can be done.', fewer: 'Fewer seeds can do it.', another: 'There’s another.'};
const TOLD_FOR = {fill: ['spread', 'possible'], fewest: ['fewer'], finishes: ['another']};
export const CERTIFICATE = 'Growing never makes the fence longer.';

/* ------------------------------------------------------------------ *
 * Plots and growth
 * ------------------------------------------------------------------ */
const play = p => p.parameters.mode === 'playground';
export const gridSpec = q => q.cells ? {cols: q.cols, rows: q.rows, cells: q.cells} : {cols: q.cols, rows: q.rows};
export const gridFor = (p, b) => play(p) ? gridOf({cols: b.size, rows: b.size}) : gridOf(gridSpec(p.parameters));
// How many seeds the tray holds; Fewest and the playground have no limit.
export const budgetOf = p => play(p) || p.parameters.mode === 'fewest' ? null : p.parameters.seeds;
const room = (p, b) => budgetOf(p) === null ? Infinity : budgetOf(p) - b.seeds.length;
const sorted = list => [...list].sort((a, b) => a - b);
const countIn = (g, set, i) => g.nbr[i].reduce((k, j) => k + (set.has(j) ? 1 : 0), 0);
export const canGrow = (g, filled, i) => !filled.has(i) && countIn(g, filled, i) >= 2;
// Everything the seeds grow into, in any order: the finish.
export function closureOf(g, seeds) {
  const filled = new Set(seeds), queue = [...filled].flatMap(i => g.nbr[i]);
  while (queue.length) {
    const i = queue.pop();
    if (canGrow(g, filled, i)) { filled.add(i); queue.push(...g.nbr[i]); }
  }
  return filled;
}
export const fills = (g, seeds) => closureOf(g, seeds).size === g.cells.length;
// The grown squares still standing after the seeds change: those that can
// grow again, in some order, from the seeds and each other.
export function standing(g, seeds, grown) {
  const filled = new Set(seeds), left = new Set(grown.filter(i => !filled.has(i)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const i of left) if (countIn(g, filled, i) >= 2) { filled.add(i); left.delete(i); changed = true; }
  }
  return sorted(grown.filter(i => filled.has(i) && !seeds.includes(i)));
}
export const filledOf = b => new Set([...b.seeds, ...b.grown]);
export const fenceOf = (g, filled) => boundaryOf(g, filled).length;
export const plotFence = g => boundaryOf(g, g.cells.map((_, i) => i)).length;
// No two seeds share a side: the longest fence any start of that many seeds can have.
export const apart = (g, seeds) => { const set = new Set(seeds); return seeds.every(i => countIn(g, set, i) === 0); };
// Seeds that close a loop of side neighbours can't all be planted: the last
// of the loop would land where two filled squares already sit.
export function forest(g, seeds) {
  const parent = new Map(seeds.map(i => [i, i])), find = i => parent.get(i) === i ? i : find(parent.get(i));
  for (const i of seeds) for (const j of g.nbr[i]) {
    if (j < i || !parent.has(j)) continue;
    const a = find(i), b = find(j);
    if (a === b) return false;
    parent.set(a, b);
  }
  return true;
}
export const stuck = (g, filled) => g.cells.every((_, i) => !canGrow(g, filled, i));
const full = (g, b) => b.seeds.length + b.grown.length === g.cells.length;
// The finish of a start whose seeds are all planted and nothing more grows.
export function finishOf(p, b) {
  const g = gridFor(p, b), filled = filledOf(b);
  return b.seeds.length === budgetOf(p) && stuck(g, filled) ? filled.size : null;
}
// For each seed, what the others fill without it.
export const withoutEach = (g, seeds) => seeds.map(s => closureOf(g, seeds.filter(i => i !== s)));
export function allNeeded(p, b) {
  const g = gridFor(p, b);
  return withoutEach(g, b.seeds).every(set => set.size < g.cells.length);
}

/* ------------------------------------------------------------------ *
 * Boards and moves
 * ------------------------------------------------------------------ */
// fill: {seeds, grown, last, told, claimed}; fewest: the same;
// needed: {seeds, grown, last}; finishes: {seeds, grown, last, found, told,
// claimed}; playground: {size, seeds, grown, last}. `last` is the square
// grown most recently, whose supporting squares light up.
function fresh(p) {
  const q = p.parameters, base = {seeds: [], grown: [], last: null};
  if (q.mode === 'playground') return {size: q.size || 6, ...base};
  if (q.mode === 'needed') return base;
  if (q.mode === 'finishes') return {...base, found: [], told: null, claimed: false};
  return {...base, told: null, claimed: false};
}
const FIELDS = {fill: ['seeds', 'grown', 'last', 'told', 'claimed'], fewest: ['seeds', 'grown', 'last', 'told', 'claimed'], needed: ['seeds', 'grown', 'last'], finishes: ['seeds', 'grown', 'last', 'found', 'told', 'claimed'], playground: ['size', 'seeds', 'grown', 'last']};
const squaresOk = (g, list) => Array.isArray(list) && list.every((i, k) => integer(i) && i >= 0 && i < g.cells.length && (k === 0 || list[k - 1] < i));
// What a claim on this board would be told, or null when it is right.
function answerFor(p, b) {
  const q = p.parameters, g = gridFor(p, b);
  if (q.mode === 'fill') return !apart(g, b.seeds) ? 'spread' : q.possible ? 'possible' : null;
  if (q.mode === 'fewest') return b.seeds.length === q.best ? null : 'fewer';
  return q.answers.every(n => b.found.includes(n)) ? null : 'another';
}
function claimable(p, b) {
  const q = p.parameters, g = gridFor(p, b);
  if (!CLAIMS[q.mode] || b.claimed || b.told) return false;
  if (q.mode === 'fill') return b.seeds.length === q.seeds && !full(g, b);
  if (q.mode === 'fewest') return full(g, b);
  return b.found.length > 0;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || !MODES.includes(q.mode) || !keysAre(b, FIELDS[q.mode])) return false;
  if (q.mode === 'playground' && !PLAY_SIZES.includes(b.size)) return false;
  const g = gridFor(p, b);
  if (!squaresOk(g, b.seeds) || !squaresOk(g, b.grown) || b.grown.some(i => b.seeds.includes(i))) return false;
  if (budgetOf(p) !== null && b.seeds.length > budgetOf(p)) return false;
  if (!forest(g, b.seeds)) return false;
  // Every grown square grew from the seeds by the rule.
  if (standing(g, b.seeds, b.grown).length !== b.grown.length) return false;
  if (b.last !== null && !b.grown.includes(b.last)) return false;
  if (q.mode === 'playground' || q.mode === 'needed') return true;
  if (typeof b.claimed !== 'boolean' || !(b.told === null || TOLD_FOR[q.mode].includes(b.told))) return false;
  if (q.mode === 'finishes') {
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(n => q.answers.includes(n))) return false;
    // A finish on the board is always among those found.
    const here = finishOf(p, b);
    if (here !== null && !b.found.includes(here)) return false;
    if (b.claimed) return b.told === null && answerFor(p, b) === null;
    return b.told === null || (b.found.length > 0 && answerFor(p, b) === b.told);
  }
  const ready = q.mode === 'fill' ? b.seeds.length === q.seeds && !full(g, b) : full(g, b);
  if (b.claimed) return b.told === null && ready && answerFor(p, b) === null;
  // A told answer is about the seeds, so it stays while they do, through
  // growth and through Undo of growth.
  return b.told === null || ((q.mode === 'fewest' ? fills(g, b.seeds) : b.seeds.length === q.seeds) && answerFor(p, b) === b.told);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  const g = gridFor(p, b);
  if (q.mode === 'fill') return b.claimed || full(g, b);
  if (q.mode === 'needed') return full(g, b) && b.seeds.length === q.seeds && allNeeded(p, b);
  return b.claimed;
}

// A board after its seeds change: growth that needed a lifted seed goes, and
// a told answer about the old seeds is forgotten.
function reseed(p, b, seeds) {
  const g = gridFor(p, b), next = {...b, seeds: sorted(seeds), grown: standing(g, seeds, b.grown), last: null};
  if (Object.hasOwn(b, 'told') && p.parameters.mode !== 'finishes') next.told = null;
  return record(p, next);
}
// A finish reached with every seed planted joins the found list.
function record(p, b) {
  if (p.parameters.mode !== 'finishes') return b;
  const here = finishOf(p, b);
  return here === null || b.found.includes(here) ? b : {...b, found: [...b.found, here], told: null};
}
// Planting puts a seed on an empty square that could not grow there anyway.
const plantable = (g, filled, i) => integer(i) && i >= 0 && i < g.cells.length && !filled.has(i) && countIn(g, filled, i) < 2;
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = p.parameters, g = gridFor(p, b), filled = filledOf(b);
  switch (action.type) {
    case 'plant': {
      if (!keysAre(action, ['type', 'cell']) || room(p, b) < 1 || !plantable(g, filled, action.cell)) return null;
      return reseed(p, b, [...b.seeds, action.cell]);
    }
    case 'lift': {
      if (!keysAre(action, ['type', 'cell']) || !b.seeds.includes(action.cell)) return null;
      return reseed(p, b, b.seeds.filter(i => i !== action.cell));
    }
    case 'carry': {
      if (!keysAre(action, ['type', 'from', 'to']) || !b.seeds.includes(action.from)) return null;
      const lifted = reseed(p, b, b.seeds.filter(i => i !== action.from));
      if (!plantable(g, filledOf(lifted), action.to) || action.to === action.from) return null;
      return reseed(p, b, [...lifted.seeds, action.to]);
    }
    case 'grow': {
      // One square or a slide of several, each growing in turn.
      if (!keysAre(action, ['type', 'cells']) || !Array.isArray(action.cells) || !action.cells.length) return null;
      const now = new Set(filled);
      for (const i of action.cells) { if (!integer(i) || !g.cells[i] || !canGrow(g, now, i)) return null; now.add(i); }
      return record(p, {...b, grown: sorted([...b.grown, ...action.cells]), last: action.cells.at(-1)});
    }
    case 'clear': {
      if (!keysAre(action, ['type']) || !(q.mode === 'finishes' || play(p)) || !b.seeds.length) return null;
      return reseed(p, b, []);
    }
    case 'regrow': {
      if (!keysAre(action, ['type']) || !play(p) || !b.grown.length) return null;
      return {...b, grown: [], last: null};
    }
    case 'size': {
      if (!keysAre(action, ['type', 'size']) || !play(p) || !PLAY_SIZES.includes(action.size) || (action.size === b.size && !b.seeds.length)) return null;
      return {size: action.size, seeds: [], grown: [], last: null};
    }
    case 'claim': {
      if (!keysAre(action, ['type']) || !claimable(p, b)) return null;
      const told = answerFor(p, b);
      return told ? {...b, told} : {...b, claimed: true};
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Starts the hints aim for, found by listing every start of a size.
 * ------------------------------------------------------------------ */
function* choose(n, k, from = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = from; i <= n - (k - acc.length); i++) yield* choose(n, k, i + 1, [...acc, i]);
}
// Starts of `size` seeds that fill and need every seed.
export function minimalStarts(g, size) {
  const out = [];
  for (const s of choose(g.cells.length, size)) if (fills(g, s) && s.every(x => !fills(g, s.filter(y => y !== x)))) out.push(s);
  return out;
}
const targetCache = new Map();
// The starts a hint can aim for, as sorted square numbers (for finishes,
// paired with the finish each makes).
export function targetsOf(p) {
  if (targetCache.has(p.id)) return targetCache.get(p.id);
  const q = p.parameters, g = gridOf(gridSpec(q)), n = g.cells.length;
  let out;
  if (q.mode === 'fill' && q.possible) out = Array.from({length: q.seeds - q.least + 1}, (_, k) => minimalStarts(g, q.least + k)).flat();
  else if (q.mode === 'fill') out = [...choose(n, q.seeds)].filter(s => apart(g, s));
  else if (q.mode === 'fewest') out = [...choose(n, q.best)].filter(s => fills(g, s));
  else if (q.mode === 'needed') out = minimalStarts(g, q.seeds);
  else out = [...choose(n, q.seeds)].map(s => ({start: s, finish: closureOf(g, s).size}));
  targetCache.set(p.id, out);
  return out;
}

/* ------------------------------------------------------------------ *
 * Hints: they move the child's own seeds towards the nearest start that
 * works, one seed at a time, then grow or claim.
 * ------------------------------------------------------------------ */
// The next move from b towards start T: 'same' when the seeds are T, null
// when no single move gets closer.
function stepToward(p, b, T) {
  const want = new Set(T), have = new Set(b.seeds), filled = filledOf(b);
  const stray = b.seeds.filter(i => !want.has(i)), missing = T.filter(i => !have.has(i) && !filled.has(i));
  const legal = action => move(p, b, action) !== null;
  if (T.some(i => !have.has(i))) {
    if (stray.length) return missing.map(to => ({type: 'carry', from: stray.at(-1), to})).find(legal) || {type: 'lift', cell: stray.at(-1)};
    return missing.map(cell => ({type: 'plant', cell})).find(legal) || null;
  }
  return stray.length ? {type: 'lift', cell: stray.at(-1)} : 'same';
}
const TEXT = {plant: 'Plant a seed on the glowing square.', carry: 'Move the glowing seed to the glowing square.', lift: 'Lift the glowing seed.', grow: 'Grow the glowing square.'};
const said = action => ({type: 'move', action, text: TEXT[action.type]});
function nearest(p, b, starts) {
  const have = new Set(b.seeds);
  let best = null, bestScore = -Infinity;
  for (const T of starts) {
    const score = T.filter(i => have.has(i)).length * 100 - b.seeds.filter(i => !T.includes(i)).length;
    if (score <= bestScore) continue;
    const step = stepToward(p, b, T);
    if (step !== null) { best = {T, step}; bestScore = score; }
  }
  return best;
}
function hint(p, b) {
  const q = p.parameters;
  if (play(p) || solved(p, b)) return {type: 'done'};
  const g = gridFor(p, b), filled = filledOf(b);
  const claim = {type: 'move', action: {type: 'claim'}, text: `Press ${CLAIMS[q.mode]}.`};
  const grow = () => { const i = g.cells.findIndex((_, k) => canGrow(g, filled, k)); return i < 0 ? null : said({type: 'grow', cells: [i]}); };
  if (q.mode === 'finishes') {
    if (answerFor(p, b) === null) return claimable(p, b) ? claim : {type: 'note'};
    const open = targetsOf(p).filter(t => !b.found.includes(t.finish)).map(t => t.start);
    const near = nearest(p, b, open);
    if (!near) return {type: 'note'};
    return near.step === 'same' ? grow() || {type: 'note'} : said(near.step);
  }
  if (q.mode === 'fewest' && full(g, b) && answerFor(p, b) === null && claimable(p, b)) return claim;
  const near = nearest(p, b, targetsOf(p));
  if (!near) return {type: 'note'};
  if (near.step !== 'same') return said(near.step);
  if (q.mode === 'fill' && !q.possible) return claimable(p, b) ? claim : {type: 'note'};
  return grow() || (claimable(p, b) ? claim : {type: 'note'});
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const cellName = (g, i) => `Row ${g.cells[i][1] + 1}, column ${g.cells[i][0] + 1}`;
const seedIcon = '<svg class="sd-icon" viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="11" rx="5" ry="6.5" class="sd-icon-seed"/><path d="M10 5.5c0-2 1.5-3.5 3.5-3.5" class="sd-icon-sprout"/></svg>';
const fenceIcon = '<svg class="sd-icon" viewBox="0 0 24 20" aria-hidden="true"><path class="sd-icon-rail" d="M2 7.5H22M2 13.5H22"/><path class="sd-icon-post" d="M5 3.5V17.5M12 3.5V17.5M19 3.5V17.5"/></svg>';
const f2 = n => Number(n.toFixed(2));
// Rocks are drawn where the puzzle puts them; they are not squares of the plot.
const rocksOf = q => (q.rocks || []).map(([x, y]) => `<g class="sd-rock" aria-hidden="true"><rect x="${x * UNIT}" y="${y * UNIT}" width="${UNIT}" height="${UNIT}"/><path d="M${f2(x * UNIT + 1.6)} ${f2(y * UNIT + 7.6)}L${f2(x * UNIT + 3)} ${f2(y * UNIT + 3.4)}L${f2(x * UNIT + 6.4)} ${f2(y * UNIT + 2.4)}L${f2(x * UNIT + 8.6)} ${f2(y * UNIT + 5)}L${f2(x * UNIT + 8.2)} ${f2(y * UNIT + 8)}Z"/></g>`).join('');

// A small picture of a plot: the finish without one seed (Every seed needed).
function mini(p, b, g, filled, gone, label, cls) {
  const seeds = new Set(b.seeds.filter(i => i !== gone));
  return squareBoard(g, {cls: `sd-mini ${cls}`, label, picture: true, pad: .25, under: rocksOf(p.parameters),
    cell: i => ({cls: i === gone ? 'gone' : filled.has(i) ? 'filled' : '', dot: seeds.has(i) ? 'seed-dot' : i === gone ? 'gone-dot' : false})});
}

function board(p, b, opts) {
  const g = gridFor(p, b), filled = filledOf(b), seeds = new Set(b.seeds), live = !opts.solved;
  const h = opts.hint?.action, hinted = new Set(h?.type === 'plant' || h?.type === 'lift' ? [h.cell] : h?.type === 'carry' ? [h.from, h.to] : h?.type === 'grow' ? h.cells : []);
  const support = new Set(b.last === null ? [] : g.nbr[b.last].filter(j => filled.has(j)));
  // A right Can't shows the start: the seeds and their fence alone.
  const fenced = opts.start ? seeds : filled, fence = new Set(boundaryOf(g, fenced));
  const spare = opts.spare || new Set();
  const cell = i => {
    const seed = seeds.has(i), grown = !seed && filled.has(i);
    const cls = [seed ? 'filled seed' : grown ? `filled grown${opts.start ? ' faded' : ''}` : '', support.has(i) ? 'support' : '', i === b.last ? 'just' : '', hinted.has(i) ? 'hinted' : ''].filter(Boolean).join(' ');
    const what = seed ? ', seed. Lift it' : grown ? ', grown' : canGrow(g, filled, i) ? '. Grow it' : room(p, b) > 0 ? '. Plant a seed' : ', empty';
    return {cls, act: live, label: `${cellName(g, i)}${what}${spare.has(i) ? ', not needed' : ''}`, dot: seed ? `seed-dot${spare.has(i) ? ' spare-dot' : ''}` : false};
  };
  return squareBoard(g, {cls: `sd-board${opts.solved ? ' solved' : ''}`, label: opts.label, cell, stroke: live, under: rocksOf(p.parameters),
    edge: k => fence.has(k) ? {cls: 'fence'} : null});
}
const button = (label, actionJSON, focus, enabled, cls = '', hinted = false) => `<button type="button" class="secondary sd-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(actionJSON))}" data-focus="${focus}" ${enabled ? '' : 'disabled'}>${label}</button>`;
// The seeds still to plant, as a tray; Fewest and the playground count up.
function tray(p, b) {
  const k = budgetOf(p);
  if (k === null) return `<span class="sd-count sd-seeds" role="img" aria-label="${plural(b.seeds.length, 'seed')}">${seedIcon}<b>${b.seeds.length}</b></span>`;
  const left = k - b.seeds.length;
  return `<span class="sd-tray${left ? '' : ' empty'}" role="img" aria-label="${plural(left, 'seed')} left">${Array.from({length: k}, (_, j) => `<i class="${j < left ? 'on' : ''}"></i>`).join('')}</span>`;
}
const fenceCount = (n, of) => `<span class="sd-count sd-fence" role="img" aria-label="Fence ${n} of ${of}">${fenceIcon}<b>${n}</b><small>/ ${of}</small></span>`;
function render(p, a) {
  const q = p.parameters, b = a.board;
  if (q.mode === 'playground') return renderPlay(p, a);
  const g = gridFor(p, b), filled = filledOf(b), done = solved(p, b), h = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const start = done && q.mode === 'fill' && b.claimed, P = plotFence(g), fence = fenceOf(g, start ? new Set(b.seeds) : filled);
  const isFull = full(g, b), checks = q.mode === 'needed' && isFull && b.seeds.length === q.seeds ? withoutEach(g, b.seeds) : null;
  const spare = new Set(checks ? b.seeds.filter((_, k) => checks[k].size === g.cells.length) : []);
  const buttons = [CLAIMS[q.mode] && !done ? button(CLAIMS[q.mode], {type: 'claim'}, 'sd-claim', claimable(p, b), 'sd-claim', h?.action?.type === 'claim') : '', q.mode === 'finishes' && !done ? button('Clear', {type: 'clear'}, 'sd-clear', b.seeds.length > 0) : ''].join('');
  const bar = `<div class="sd-bar">${tray(p, b)}${fenceCount(fence, P)}${buttons ? `<span class="sd-buttons">${buttons}</span>` : ''}</div>`;
  const plot = `<div class="sd-stage" style="--sd-cols:${q.cols}">${board(p, b, {solved: done, hint: h, start, spare, label: `Plot of ${g.cells.length} squares`})}</div>`;
  let below = '';
  if (q.mode === 'finishes' && b.found.length) {
    const here = finishOf(p, b);
    below = `<ol class="sd-chips" aria-label="Finishes found">${sorted(b.found).map(n => `<li class="${n === here ? 'here' : ''}" aria-label="${plural(n, 'square')}${n === here ? ', on the plot' : ''}">${n}</li>`).join('')}</ol>`;
  } else if (checks) {
    below = `<ol class="sd-minis" aria-label="Without each seed">${b.seeds.map((s, k) => { const n = checks[k].size, all = n === g.cells.length; return `<li class="${all ? 'full' : ''}">${mini(p, b, g, checks[k], s, `Without the seed at ${cellName(g, s).toLowerCase()}: ${plural(n, 'square')}${all ? ', every square' : ''}`, all ? 'full' : '')}<span>${n}</span></li>`; }).join('')}</ol>`;
  }
  const note = b.told ? TOLD[b.told] : start ? CERTIFICATE : done ? '' : q.mode === 'needed' && isFull && b.seeds.length < q.seeds ? 'Plant every seed.' : spare.size ? 'A seed isn’t needed.' : '';
  const status = `${plural(b.seeds.length, 'seed')}, ${plural(filled.size, 'square')} filled of ${g.cells.length}, fence ${fence}.${note ? ` ${note}` : ''}`;
  return `<div class="sd-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="seeds">${bar}${plot}${note ? `<p class="sd-note${start ? ' proof' : ''}">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const sizeIcon = n => `<svg class="sd-size-icon" viewBox="0 0 24 24" aria-hidden="true">${Array.from({length: n * n}, (_, i) => `<rect x="${f2(2 + (i % n) * 20 / n)}" y="${f2(2 + Math.floor(i / n) * 20 / n)}" width="${f2(20 / n - 1)}" height="${f2(20 / n - 1)}" rx=".5"/>`).join('')}</svg>`;
function renderPlay(p, a) {
  const b = a.board, g = gridFor(p, b), filled = filledOf(b), fence = fenceOf(g, filled);
  const sizes = `<div class="sd-sizes" role="group" aria-label="Plot">${PLAY_SIZES.map(n => `<button type="button" class="secondary sd-size" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', size: n}))}" data-focus="sd-size-${n}" aria-pressed="${b.size === n}" aria-label="${n} by ${n}">${sizeIcon(n)}</button>`).join('')}</div>`;
  const buttons = `<span class="sd-buttons">${button('Regrow', {type: 'regrow'}, 'sd-regrow', b.grown.length > 0)}${button('Clear', {type: 'clear'}, 'sd-clear', b.seeds.length > 0)}</span>`;
  const bar = `<div class="sd-bar">${tray(p, b)}${fenceCount(fence, plotFence(g))}${buttons}</div>`;
  const plot = `<div class="sd-stage" style="--sd-cols:${b.size}">${board(p, b, {label: `Plot of ${b.size} by ${b.size} squares`})}</div>`;
  const status = `${plural(b.seeds.length, 'seed')}, ${plural(filled.size, 'square')} filled, fence ${fence}.`;
  return `<div class="sd-puzzle mode-playground" data-mechanic-wire="seeds">${sizes}${bar}${plot}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// A tap plants on an empty square, or grows it when two filled squares
// sit beside it; a tap on a seed lifts it. A finger that starts on a seed
// carries it to the square where it lifts off; one that starts anywhere else
// grows every empty square it crosses, each in turn.
export function tapAction(p, b, i) {
  const g = gridFor(p, b), filled = filledOf(b);
  if (b.seeds.includes(i)) return {type: 'lift', cell: i};
  if (filled.has(i)) return null;
  if (canGrow(g, filled, i)) return {type: 'grow', cells: [i]};
  return room(p, b) > 0 ? {type: 'plant', cell: i} : null;
}
export function strokeAction(p, b, cells) {
  const g = gridFor(p, b), filled = filledOf(b);
  if (b.seeds.includes(cells[0])) { const carry = {type: 'carry', from: cells[0], to: cells.at(-1)}; return move(p, b, carry) ? carry : null; }
  const now = new Set(filled), grow = [];
  for (const i of cells) {
    if (now.has(i)) continue;
    if (!canGrow(g, now, i)) return null;
    now.add(i); grow.push(i);
  }
  return grow.length ? {type: 'grow', cells: grow} : null;
}
function wire(root, p, api) {
  const b = () => api.attempt().board, g = gridFor(p, b());
  // A tap that can neither plant nor grow shakes the square, and the tray when it is empty.
  const shake = el => { if (!el) return; el.classList.remove('nudge'); void el.getBoundingClientRect(); el.classList.add('nudge'); };
  wireSquare(root, g, {
    cell: i => {
      const action = tapAction(p, b(), i);
      if (!action && !filledOf(b()).has(i)) { shake(root.querySelector(`[data-sg-cell="${i}"]`)); if (room(p, b()) < 1) shake(root.querySelector('.sd-tray')); }
      return action;
    },
    preview: cells => {
      if (b().seeds.includes(cells[0])) return {show: [cells.at(-1)], blocked: !strokeAction(p, b(), cells)};
      return strokeAction(p, b(), cells) ? 'ok' : 'blocked';
    },
    stroke: cells => strokeAction(p, b(), cells)
  }, api.apply);
}

export const seedMechanics = {
  seeds: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo takes back moves, not claims: a refusal about these seeds stays
    // while they are the same, and finishes found stay found.
    carry(p, from, to) {
      if (!object(from) || !object(to) || !Object.hasOwn(to, 'told')) return to;
      if (p.parameters.mode === 'finishes') {
        const found = [...to.found, ...from.found.filter(n => !to.found.includes(n))];
        return {...to, found, told: from.told === 'another' && found.length === from.found.length ? 'another' : to.told};
      }
      return from.told && from.seeds.join() === to.seeds.join() ? {...to, told: from.told} : to;
    },
    noHint: p => play(p)
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'seeds',
  family: {id: 'seeds', symbol: '✿'},
  mechanics: seedMechanics,
  pack: new URL('./seeds.json', import.meta.url).href,
  css: new URL('./seeds.css', import.meta.url).href,
  focus: '.sg-hit,.sd-button:not([disabled]),.sd-size'
};
