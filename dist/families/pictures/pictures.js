// Hidden pictures from row and column counts (worksheet Week 25). A picture is
// a grid with at most one counter in each square; its counts are the number of
// counters in each row and in each column. Different pictures can share their
// counts. A switch moves two counters at opposite corners of a rectangle to the
// rectangle's two empty corners, and keeps every count. A picture is the only
// one with its counts exactly when it has no switch, and switches lead from any
// picture to any other with the same counts (Ryser, 1957).
import {esc} from '../../expansion-controls.js';

export const LETTERS = 'ABCDEFGH';
export const PLAY_SIZES = [3, 4, 5, 6];
const MODES = ['match', 'twin', 'every', 'reach', 'lonely'];

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sum = list => list.reduce((a, b) => a + b, 0);
const bit = value => value === 0 || value === 1;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export const cellName = (cols, i) => `${LETTERS[Math.floor(i / cols)]}${i % cols + 1}`;
export function keyOf(cols, cells) {
  const rows = [];
  for (let r = 0; r * cols < cells.length; r++) rows.push(cells.slice(r * cols, (r + 1) * cols).join(''));
  return rows.join('/');
}
export const cellsOf = key => key.split('/').flatMap(row => [...row].map(Number));
export function counts(rows, cols, cells) {
  const across = Array(rows).fill(0), down = Array(cols).fill(0);
  cells.forEach((v, i) => { if (v) { across[Math.floor(i / cols)]++; down[i % cols]++; } });
  return {rows: across, cols: down};
}

// Every picture with these counts, as keys: rows are filled one at a time and
// a row is abandoned as soon as a column could no longer reach its count.
export function picturesWith(rowCounts, colCounts) {
  const R = rowCounts.length, C = colCounts.length, out = [];
  if (sum(rowCounts) !== sum(colCounts)) return out;
  const need = [...colCounts], cells = Array(R * C).fill(0);
  (function row(r) {
    if (need.some(n => n < 0 || n > R - r)) return;
    if (r === R) { out.push(keyOf(C, cells)); return; }
    (function place(c, left) {
      if (!left) { row(r + 1); return; }
      if (C - c < left) return;
      if (need[c] > 0) { need[c]--; cells[r * C + c] = 1; place(c + 1, left - 1); cells[r * C + c] = 0; need[c]++; }
      place(c + 1, left);
    })(0, rowCounts[r]);
  })(0);
  return out;
}

// How many pictures share these counts, without listing them. Columns can be
// reordered without changing the number, so the state is the sorted list of
// what each column still needs.
export function countPictures(rowCounts, colCounts) {
  if (sum(rowCounts) !== sum(colCounts)) return 0;
  const memo = new Map(), R = rowCounts.length;
  const go = (r, need) => {
    if (r === R) return need.every(n => n === 0) ? 1 : 0;
    if (need.some(n => n > R - r)) return 0;
    const key = `${r}|${need.join(',')}`;
    if (memo.has(key)) return memo.get(key);
    let total = 0;
    (function place(c, left, next) {
      if (!left) { total += go(r + 1, [...next].sort((a, b) => b - a)); return; }
      if (need.length - c < left) return;
      if (next[c] > 0) { const taken = [...next]; taken[c]--; place(c + 1, left - 1, taken); }
      place(c + 1, left, next);
    })(0, rowCounts[r], need);
    memo.set(key, total);
    return total;
  };
  return go(0, [...colCounts].sort((a, b) => b - a));
}

// A switch is a pair of counters [i, j] in different rows and columns whose
// other two corners are empty. Each counter slides along its own row.
export function switchesOf(rows, cols, cells) {
  const out = [];
  for (let i = 0; i < cells.length; i++) if (cells[i]) for (let j = i + 1; j < cells.length; j++) if (cells[j]) {
    const r1 = Math.floor(i / cols), c1 = i % cols, r2 = Math.floor(j / cols), c2 = j % cols;
    if (r1 !== r2 && c1 !== c2 && !cells[r1 * cols + c2] && !cells[r2 * cols + c1]) out.push([i, j]);
  }
  return out;
}
export function switchCorners(cols, i, j) {
  const r1 = Math.floor(i / cols), c1 = i % cols, r2 = Math.floor(j / cols), c2 = j % cols;
  return [r1 * cols + c2, r2 * cols + c1];
}
export function applySwitch(rows, cols, cells, i, j) {
  if (!Number.isInteger(i) || !Number.isInteger(j) || i === j || i < 0 || j < 0 || i >= cells.length || j >= cells.length) return null;
  const [a, b] = [Math.min(i, j), Math.max(i, j)];
  if (!switchesOf(rows, cols, cells).some(([x, y]) => x === a && y === b)) return null;
  const next = [...cells], [ta, tb] = switchCorners(cols, a, b);
  next[a] = 0; next[b] = 0; next[ta] = 1; next[tb] = 1;
  return next;
}
export const lonely = (rows, cols, cells) => !switchesOf(rows, cols, cells).length;

// Fewest switches between pictures with the same counts: a search outward from
// the goal, so every picture knows its distance and a next step toward it.
const searches = new Map();
export function towardGoal(rows, cols, goal) {
  const cacheKey = `${rows}x${cols}|${goal}`;
  if (searches.has(cacheKey)) return searches.get(cacheKey);
  const seen = new Map([[goal, 0]]), queue = [goal];
  for (let k = 0; k < queue.length; k++) {
    const key = queue[k], cells = cellsOf(key);
    for (const [i, j] of switchesOf(rows, cols, cells)) {
      const next = keyOf(cols, applySwitch(rows, cols, cells, i, j));
      if (!seen.has(next)) { seen.set(next, seen.get(key) + 1); queue.push(next); }
    }
  }
  searches.set(cacheKey, seen);
  return seen;
}
export function switchRoute(rows, cols, cells, goal) {
  const dist = towardGoal(rows, cols, goal), path = [];
  let current = cells, key = keyOf(cols, cells);
  if (!dist.has(key)) return null;
  while (key !== goal) {
    const step = switchesOf(rows, cols, current).find(([i, j]) => dist.get(keyOf(cols, applySwitch(rows, cols, current, i, j))) === dist.get(key) - 1);
    path.push(step);
    current = applySwitch(rows, cols, current, ...step);
    key = keyOf(cols, current);
  }
  return path;
}

// Lonely pictures: exactly k counters and no switch.
function combinations(n, k, start = 0, acc = [], out = []) {
  if (acc.length === k) { out.push([...acc]); return out; }
  for (let i = start; i <= n - (k - acc.length); i++) { acc.push(i); combinations(n, k, i + 1, acc, out); acc.pop(); }
  return out;
}
const lonelyCache = new Map();
export function lonelyPictures(rows, cols, k) {
  const cacheKey = `${rows}x${cols}|${k}`;
  if (lonelyCache.has(cacheKey)) return lonelyCache.get(cacheKey);
  const out = [];
  for (const chosen of combinations(rows * cols, k)) {
    const cells = Array(rows * cols).fill(0);
    chosen.forEach(i => { cells[i] = 1; });
    if (lonely(rows, cols, cells)) out.push(keyOf(cols, cells));
  }
  lonelyCache.set(cacheKey, out);
  return out;
}

// Every picture a puzzle accepts, as keys. For "every", these are what must be
// found; for the others, the hints aim at the nearest one.
const answerCache = new Map();
export function answers(p) {
  const cacheKey = `${p.id}|${JSON.stringify(p.parameters)}`;
  if (answerCache.has(cacheKey)) return answerCache.get(cacheKey);
  const q = p.parameters, [R, C] = q.size;
  let list = [];
  if (q.mode === 'match' || q.mode === 'every') list = picturesWith(q.rowCounts, q.colCounts);
  else if (q.mode === 'twin') { const {rows, cols} = counts(R, C, cellsOf(q.picture)); list = picturesWith(rows, cols).filter(key => key !== q.picture); }
  else if (q.mode === 'reach') list = [q.goal];
  else if (q.mode === 'lonely') list = lonelyPictures(R, C, q.counters);
  answerCache.set(cacheKey, list);
  return list;
}
export const targetCounts = p => p.parameters.mode === 'twin' ? counts(...p.parameters.size, cellsOf(p.parameters.picture)) : p.parameters.mode === 'reach' ? counts(...p.parameters.size, cellsOf(p.parameters.start)) : {rows: p.parameters.rowCounts, cols: p.parameters.colCounts};
const matches = (p, cells) => { const t = targetCounts(p), c = counts(...p.parameters.size, cells); return same(t.rows, c.rows) && same(t.cols, c.cols); };

// The current picture: stored squares, except in switch puzzles, where it is
// replayed from the start through the switches made, so it is never stored.
export function picture(p, b) {
  const q = p.parameters;
  if (q.mode !== 'reach') return b.cells;
  let cells = cellsOf(q.start);
  for (const [i, j] of b.path) { cells = applySwitch(...q.size, cells, i, j); if (!cells) return null; }
  return cells;
}
function validPuzzleBoard(p, b) {
  const q = p.parameters;
  if (!MODES.includes(q.mode) || !object(b)) return false;
  const [R, C] = q.size;
  if (q.mode === 'reach') return Array.isArray(b.path) && b.path.length <= q.budget && b.path.every(s => Array.isArray(s) && s.length === 2) && Boolean(picture(p, b));
  if (!Array.isArray(b.cells) || b.cells.length !== R * C || !b.cells.every(bit)) return false;
  if (q.mode === 'lonely' && sum(b.cells) > q.counters) return false;
  if (q.mode === 'every') {
    const all = new Set(answers(p));
    if (!Array.isArray(b.found) || new Set(b.found).size !== b.found.length || !b.found.every(key => all.has(key))) return false;
    if (typeof b.early !== 'boolean' || typeof b.claimed !== 'boolean' || (b.claimed && b.found.length !== all.size)) return false;
  }
  return true;
}
function solvedPuzzle(p, b) {
  if (!validPuzzleBoard(p, b)) return false;
  const q = p.parameters, [R, C] = q.size, cells = picture(p, b);
  if (q.mode === 'match') return matches(p, cells);
  if (q.mode === 'twin') return matches(p, cells) && keyOf(C, cells) !== q.picture;
  if (q.mode === 'every') return b.claimed;
  if (q.mode === 'reach') return keyOf(C, cells) === q.goal;
  return sum(cells) === q.counters && lonely(R, C, cells);
}
function freshPuzzle(p) {
  const q = p.parameters, [R, C] = q.size;
  if (q.mode === 'reach') return {path: []};
  if (q.mode === 'twin') return {cells: cellsOf(q.picture)};
  if (q.mode === 'every') return {cells: Array(R * C).fill(0), found: [], early: false, claimed: false};
  return {cells: Array(R * C).fill(0)};
}
// In "every", a picture that matches the counts is kept the moment it appears.
function record(p, b) {
  const key = keyOf(p.parameters.size[1], b.cells);
  return matches(p, b.cells) && !b.found.includes(key) ? {...b, found: [...b.found, key]} : b;
}
function movePuzzle(p, b, action) {
  if (!validPuzzleBoard(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, [R, C] = q.size;
  if (q.mode === 'reach') {
    if (action.type !== 'switch' || b.path.length >= q.budget) return null;
    const cells = picture(p, b), next = applySwitch(R, C, cells, action.a, action.b);
    return next ? {path: [...b.path, [Math.min(action.a, action.b), Math.max(action.a, action.b)]]} : null;
  }
  if (action.type === 'toggle') {
    const i = action.cell;
    if (!Number.isInteger(i) || i < 0 || i >= R * C) return null;
    if (q.mode === 'lonely' && !b.cells[i] && sum(b.cells) >= q.counters) return null;
    const cells = [...b.cells]; cells[i] = 1 - cells[i];
    return q.mode === 'every' ? record(p, {...b, cells, early: false}) : {...b, cells};
  }
  if (q.mode !== 'every') return null;
  if (action.type === 'clear') return sum(b.cells) ? {...b, cells: Array(R * C).fill(0), early: false} : null;
  if (action.type === 'done') {
    if (!b.found.length) return null;
    return b.found.length === answers(p).length ? {...b, claimed: true, early: false} : {...b, early: true};
  }
  return null;
}

// Hints walk toward the nearest accepted picture, one square at a time, taking
// away a stray counter before adding a missing one.
function nearest(cells, keys) {
  let best = null, bestGap = Infinity;
  for (const key of keys) {
    const target = cellsOf(key), gap = target.reduce((n, v, i) => n + (v !== cells[i]), 0);
    if (gap < bestGap) { best = target; bestGap = gap; }
  }
  return best;
}
function toggleHint(p, cells, keys) {
  const C = p.parameters.size[1], target = nearest(cells, keys);
  if (!target) return null;
  const off = cells.findIndex((v, i) => v && !target[i]), on = target.findIndex((v, i) => v && !cells[i]);
  const i = off >= 0 ? off : on;
  if (i < 0) return null;
  return {type: 'move', action: {type: 'toggle', cell: i}, cell: i, text: off >= 0 ? `Take the counter off ${cellName(C, i)}.` : `Put a counter on ${cellName(C, i)}.`};
}
function hintPuzzle(p, b) {
  if (!validPuzzleBoard(p, b)) return {type: 'deadend', text: 'Start again to restore this picture.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const q = p.parameters, [R, C] = q.size, cells = picture(p, b);
  if (q.mode === 'reach') {
    const route = switchRoute(R, C, cells, q.goal), left = q.budget - b.path.length;
    if (!route) return {type: 'deadend', text: 'Start again to restore this picture.'};
    if (route.length > left) return {type: 'deadend', text: `The rings are ${plural(route.length, 'switch', 'switches')} away, but ${left ? `only ${left} ${left === 1 ? 'is' : 'are'}` : 'none are'} left. Undo a switch or start again.`};
    const [i, j] = route[0];
    return {type: 'move', action: {type: 'switch', a: i, b: j}, cells: [i, j], text: `Switch the counters on ${cellName(C, i)} and ${cellName(C, j)}.`};
  }
  if (q.mode === 'every') {
    const open = answers(p).filter(key => !b.found.includes(key));
    if (!open.length) return {type: 'move', action: {type: 'done'}, text: 'Every picture with these counts is here.'};
    return toggleHint(p, cells, open) || {type: 'deadend', text: 'Start again to restore this picture.'};
  }
  if (q.mode === 'lonely') {
    const pair = sum(cells) === q.counters && switchesOf(R, C, cells)[0];
    const step = toggleHint(p, cells, answers(p));
    if (!step) return {type: 'deadend', text: 'Start again to restore this picture.'};
    return pair ? {...step, text: `${cellName(C, pair[0])} and ${cellName(C, pair[1])} can switch, so another picture has these counts. ${step.text}`} : step;
  }
  return toggleHint(p, cells, answers(p)) || {type: 'deadend', text: 'Start again to restore this picture.'};
}

// The playground: draw or switch on any grid from 3 × 3 to 6 × 6.
const freshPlay = (size = 4) => ({size, cells: Array(size * size).fill(0)});
const validPlay = b => object(b) && PLAY_SIZES.includes(b.size) && Array.isArray(b.cells) && b.cells.length === b.size * b.size && b.cells.every(bit);
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  const n = b.size;
  if (action.type === 'size') return PLAY_SIZES.includes(action.size) && action.size !== n ? freshPlay(action.size) : null;
  if (action.type === 'clear') return sum(b.cells) ? freshPlay(n) : null;
  if (action.type === 'toggle') {
    if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= n * n) return null;
    const cells = [...b.cells]; cells[action.cell] = 1 - cells[action.cell];
    return {...b, cells};
  }
  if (action.type === 'switch') { const cells = applySwitch(n, n, b.cells, action.a, action.b); return cells ? {...b, cells} : null; }
  return null;
}

// View-only state: the playground tool and the counter picked for a switch,
// remembered with the picture it was picked on.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {tool: 'draw', pick: null}); return uiState.get(p.id); };
function picked(p, cells, C) {
  const pick = ui(p).pick;
  return pick && pick.key === keyOf(C, cells) && cells[pick.cell] ? pick.cell : null;
}

const disc = '<span class="pic-counter" aria-hidden="true"></span>';
function countBadge(kind, label, value, goal) {
  const state = goal === null ? 'live' : value === goal ? 'exact' : value > goal ? 'over' : 'under';
  const shown = goal === null ? value : goal;
  return `<span class="pic-count ${kind} ${state}" role="img" aria-label="${esc(goal === null ? `${label}: ${plural(value, 'counter')}` : `${label}: ${value} of ${goal}`)}">${shown}</span>`;
}
// The main board: column numbers, row letters, the squares, and the counts.
// goals: the counts to match, or null to show the picture's own counts.
// cell(i) gives a square's control: {move} for a move, {ui} for a pick, or
// nothing for a square that does not respond.
function grid(R, C, cells, {goals = null, fixed = false, cell = () => ({}), marks = () => '', label}) {
  const live = counts(R, C, cells), parts = ['<span class="pic-corner" aria-hidden="true"></span>'];
  for (let c = 0; c < C; c++) parts.push(`<span class="pic-label col" aria-hidden="true">${c + 1}</span>`);
  parts.push('<span class="pic-corner" aria-hidden="true"></span>');
  for (let r = 0; r < R; r++) {
    parts.push(`<span class="pic-label row" aria-hidden="true">${LETTERS[r]}</span>`);
    for (let c = 0; c < C; c++) {
      const i = r * C + c, control = cell(i), name = `${cellName(C, i)}: ${cells[i] ? 'counter' : 'empty'}`;
      const edges = `${r ? '' : ' r0'}${c ? '' : ' c0'}`, cls = `pic-cell${cells[i] ? ' on' : ''}${edges} ${marks(i)}`;
      if (control.move) parts.push(`<button type="button" class="${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(control.move))}" data-focus="pic-cell-${i}" data-cell="${i}" aria-label="${esc(control.label || name)}">${disc}</button>`);
      else if (control.ui) parts.push(`<button type="button" class="${cls}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(control.ui))}" data-focus="pic-cell-${i}" data-cell="${i}" aria-label="${esc(control.label || name)}" ${control.pressed === undefined ? '' : `aria-pressed="${control.pressed}"`}>${disc}</button>`);
      else parts.push(`<button type="button" class="${cls}" data-focus="pic-cell-${i}" data-cell="${i}" aria-label="${esc(name)}" aria-disabled="true">${disc}</button>`);
    }
    parts.push(countBadge('row', `Row ${LETTERS[r]}`, live.rows[r], goals ? goals.rows[r] : null));
  }
  parts.push('<span class="pic-corner" aria-hidden="true"></span>');
  for (let c = 0; c < C; c++) parts.push(countBadge('col', `Column ${c + 1}`, live.cols[c], goals ? goals.cols[c] : null));
  parts.push('<span class="pic-corner" aria-hidden="true"></span>');
  return `<div class="pic-grid${fixed ? ' fixed' : ''}" style="--rows:${R};--cols:${C}" role="group" aria-label="${esc(label)}">${parts.join('')}</div>`;
}
// A small drawing of a picture, for the goal card, the starting picture and
// the pictures found so far.
export function miniPicture(R, C, key, label, cls = '') {
  const cells = cellsOf(key), s = 10, w = C * s, h = R * s;
  const lines = [...Array.from({length: C + 1}, (_, c) => `<line x1="${c * s}" y1="0" x2="${c * s}" y2="${h}"/>`), ...Array.from({length: R + 1}, (_, r) => `<line x1="0" y1="${r * s}" x2="${w}" y2="${r * s}"/>`)].join('');
  const dots = cells.map((v, i) => v ? `<circle cx="${(i % C) * s + s / 2}" cy="${Math.floor(i / C) * s + s / 2}" r="${s * 0.32}"/>` : '').join('');
  return `<svg class="pic-mini ${cls}" viewBox="-1 -1 ${w + 2} ${h + 2}" style="--cols:${C}" role="img" aria-label="${esc(label)}">${lines}${dots}</svg>`;
}
const describe = (R, C, cells) => { const on = cells.map((v, i) => v ? cellName(C, i) : null).filter(Boolean); return on.length ? `Counters on ${on.join(', ')}` : 'No counters'; };
// Switch controls: a counter with a partner can be picked; once one is picked,
// its partners make the switch and the picked one can be put back.
function switchControls(p, R, C, cells, enabled) {
  const options = enabled ? switchesOf(R, C, cells) : [], pick = picked(p, cells, C), key = keyOf(C, cells);
  const partners = new Set(options.filter(s => s.includes(pick)).map(([i, j]) => i === pick ? j : i));
  const movable = new Set(options.flat());
  return {
    pick, partners,
    cell: i => {
      if (!cells[i] || !movable.has(i)) return {};
      if (pick === null) return {ui: {pick: i, key}, pressed: false, label: `${cellName(C, i)}: counter. Pick for a switch`};
      if (i === pick) return {ui: {pick: null}, pressed: true, label: `${cellName(C, i)}: picked. Put back`};
      if (partners.has(i)) { const [a, b] = switchCorners(C, Math.min(pick, i), Math.max(pick, i)); return {move: {type: 'switch', a: pick, b: i}, label: `${cellName(C, i)}: switch with ${cellName(C, pick)}, moving them to ${cellName(C, a)} and ${cellName(C, b)}`}; }
      return {ui: {pick: i, key}, pressed: false, label: `${cellName(C, i)}: counter. Pick for a switch`};
    },
    marks: i => `${i === pick ? 'picked' : ''} ${partners.has(i) ? 'partner' : ''} ${pick !== null && cells[i] && !partners.has(i) && i !== pick ? 'idle' : ''}`
  };
}

function renderPuzzle(p, a) {
  const b = a.board, q = p.parameters, [R, C] = q.size, cells = picture(p, b), solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null;
  const hinted = new Set(hint?.cells || (hint?.cell !== undefined ? [hint.cell] : []));
  const hintMark = i => hinted.has(i) ? ' hinted' : '';
  const status = `${describe(R, C, cells)}.`;
  if (q.mode === 'reach') {
    const left = q.budget - b.path.length, sw = switchControls(p, R, C, cells, !solved && left > 0);
    // The goal is drawn on the board as rings: a counter in a ring is home.
    const goal = cellsOf(q.goal), ring = i => goal[i] ? ` goal${cells[i] ? ' home' : ''}` : '';
    const board = grid(R, C, cells, {goals: null, fixed: true, cell: sw.cell, marks: i => sw.marks(i) + ring(i) + hintMark(i), label: `Your picture. Rings on ${goal.map((v, i) => v ? cellName(C, i) : null).filter(Boolean).join(', ')}`});
    const pips = `<div class="pic-budget" role="img" aria-label="${plural(left, 'switch', 'switches')} left">${Array.from({length: q.budget}, (_, k) => `<i class="${k < left ? 'left' : 'used'}"></i>`).join('')}</div>`;
    const home = cells.filter((v, i) => v && goal[i]).length;
    return `<div class="pictures-puzzle mode-reach" data-mechanic-wire="pictures">${board}${pips}<p class="sr-only" role="status">${esc(`${status} ${home} of ${sum(goal)} in rings. ${plural(left, 'switch', 'switches')} left.`)}</p></div>`;
  }
  const full = q.mode === 'lonely' && sum(cells) >= q.counters;
  const twins = q.mode === 'lonely' && full && !solved ? switchesOf(R, C, cells)[0] : null;
  const corners = twins ? new Set([...twins, ...switchCorners(C, ...twins)]) : new Set();
  const cell = i => solved || (full && !cells[i]) ? {} : {move: {type: 'toggle', cell: i}};
  const goals = q.mode === 'lonely' ? null : targetCounts(p);
  const board = grid(R, C, cells, {goals, cell, marks: i => (corners.has(i) ? 'twin' : '') + hintMark(i), label: 'Your picture'});
  let extra = '';
  if (q.mode === 'twin') extra = `<figure class="pic-card start">${miniPicture(R, C, q.picture, `Starting picture. ${describe(R, C, cellsOf(q.picture))}`)}<span class="pic-not" aria-hidden="true">≠</span></figure>`;
  if (q.mode === 'lonely') {
    const left = q.counters - sum(cells);
    extra = left ? `<div class="pic-tray" role="img" aria-label="${plural(left, 'counter')} to place">${Array.from({length: left}, () => disc).join('')}</div>` : '';
  }
  let shelf = '';
  if (q.mode === 'every') {
    const key = keyOf(C, cells), newest = b.found.at(-1);
    const items = b.found.map(k => `<li class="${k === key ? (k === newest ? 'fresh' : 'again') : ''}">${miniPicture(R, C, k, describe(R, C, cellsOf(k)))}</li>`).join('');
    const done = b.found.length && !solved ? `<button type="button" class="primary pic-done ${hint?.action?.type === 'done' ? 'hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'done'}))}" data-focus="pic-done">That’s all</button>` : '';
    const clear = sum(cells) && !solved ? `<button type="button" class="secondary pic-clear" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'clear'}))}" data-focus="pic-clear">Clear</button>` : '';
    const early = b.early ? '<p class="pic-early" role="status">There is another.</p>' : '';
    shelf = `<div class="pic-tools">${clear}${done}</div>${early}${items ? `<ol class="pic-found" aria-label="Pictures found">${items}</ol>` : ''}`;
  }
  return `<div class="pictures-puzzle mode-${q.mode}" data-mechanic-wire="pictures">${extra && q.mode === 'twin' ? `<div class="pic-compare">${extra}${board}</div>` : `${board}${extra}`}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

const sizeIcon = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${Array.from({length: n * n}, (_, i) => `<rect x="${2 + (i % n) * 20 / n}" y="${2 + Math.floor(i / n) * 20 / n}" width="${20 / n - 1.2}" height="${20 / n - 1.2}" rx=".6"/>`).join('')}</svg>`;
const toolButton = (label, payload, pressed) => `<button type="button" class="secondary pic-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="pic-tool-${payload.tool}" aria-pressed="${pressed}">${label}</button>`;
function renderPlay(p, a) {
  const b = a.board, n = b.size, state = ui(p), live = counts(n, n, b.cells);
  const sizes = `<div class="pic-sizes" role="group" aria-label="Grid size">${PLAY_SIZES.map(s => `<button type="button" class="pic-size" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'size', size: s}))}" data-focus="pic-size-${s}" aria-label="${s} by ${s}" aria-pressed="${s === n}">${sizeIcon(s)}</button>`).join('')}</div>`;
  const clear = `<button type="button" class="secondary pic-tool" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'clear'}))}" data-focus="pic-clear" ${sum(b.cells) ? '' : 'disabled'}>Clear</button>`;
  const tools = `<div class="pic-tools" role="group" aria-label="Tool">${toolButton(`${disc} Draw`, {tool: 'draw'}, state.tool === 'draw')}${toolButton('<span class="pic-switch-icon" aria-hidden="true">▚</span> Switch', {tool: 'switch'}, state.tool === 'switch')}${clear}</div>`;
  const sw = switchControls(p, n, n, b.cells, state.tool === 'switch');
  const cell = state.tool === 'draw' ? i => ({move: {type: 'toggle', cell: i}}) : sw.cell;
  const board = grid(n, n, b.cells, {goals: null, cell, marks: state.tool === 'switch' ? sw.marks : () => '', label: 'Your picture'});
  const many = countPictures(live.rows, live.cols);
  const twins = `<div class="pic-twins" role="img" aria-label="${many === 1 ? 'No other picture has these counts' : `${many} pictures have these counts`}"><span class="pic-stack" aria-hidden="true"><i></i><i></i></span><span>${many}</span></div>`;
  return `<div class="pictures-play" data-mechanic-wire="pictures">${sizes}${tools}${board}${twins}<p class="sr-only" role="status">${esc(`${describe(n, n, b.cells)}. ${many === 1 ? 'No other picture has these counts.' : `${many} pictures have these counts.`}`)}</p></div>`;
}

// Motion after a move: switched counters slide along their rows, and a new
// counter pops in. The board is drawn in its final state; this only adds motion.
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = null;
function wire(root, p, api) {
  const b = api.attempt().board, cells = p.parameters.mode === 'playground' ? b.cells : picture(p, b);
  const before = last?.id === p.id ? last.cells : null;
  last = {id: p.id, cells: cells && [...cells]};
  if (!before || !cells || before.length !== cells.length || reduced()) return;
  const gone = before.map((v, i) => v && !cells[i] ? i : -1).filter(i => i >= 0), came = cells.map((v, i) => v && !before[i] ? i : -1).filter(i => i >= 0);
  const C = p.parameters.mode === 'playground' ? b.size : p.parameters.size[1];
  const at = i => root.querySelector(`.pic-cell[data-cell="${i}"]`);
  if (gone.length === 2 && came.length === 2) {
    for (const from of gone) {
      const to = came.find(i => Math.floor(i / C) === Math.floor(from / C)), target = at(to)?.querySelector('.pic-counter'), source = at(from);
      if (!target || !source) continue;
      const dx = source.getBoundingClientRect().left - at(to).getBoundingClientRect().left;
      target.animate([{transform: `translateX(${dx}px)`}, {transform: 'translateX(0)'}], {duration: 320, easing: 'ease-in-out'});
    }
  } else if (came.length === 1 && !gone.length) at(came[0])?.querySelector('.pic-counter')?.animate([{transform: 'scale(.4)', opacity: .3}, {transform: 'scale(1)', opacity: 1}], {duration: 180, easing: 'ease-out'});
}

export const pictureMechanics = {
  pictures: {
    fresh: p => p.parameters.mode === 'playground' ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : validPuzzleBoard(p, b),
    solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
    move: (p, b, action) => p.parameters.mode === 'playground' ? movePlay(b, action) : movePuzzle(p, b, action),
    hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (['draw', 'switch'].includes(payload.tool)) { state.tool = payload.tool; state.pick = null; }
      if (payload.pick === null) state.pick = null;
      else if (Number.isInteger(payload.pick) && typeof payload.key === 'string') state.pick = {cell: payload.pick, key: payload.key};
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back a move but never a picture already found.
    carry: (p, from, to) => p.parameters.mode === 'every' && object(to) && Array.isArray(from?.found) ? {...to, found: [...from.found]} : to,
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'pictures',
  family: {id: 'pictures', symbol: '▚'},
  mechanics: pictureMechanics,
  pack: new URL('./pictures.json', import.meta.url).href,
  css: new URL('./pictures.css', import.meta.url).href,
  focus: '.pic-cell:not([aria-disabled]),.pic-done,.pic-clear'
};
