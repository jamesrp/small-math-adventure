// Sliding numbers (worksheet Week 90, sliding number arrays: jeu de taquin).
// A board is a skew shape: a Young diagram (rows left-justified, never longer
// than the row above) with a smaller one missing from its top-left corner,
// drawn gray. A start fills the white squares with 1, …, n so numbers grow to
// the right and down. A slide opens a gray corner (no gray right of it or
// below it) as a ring; the smaller of the numbers right of the ring and below
// it moves in, and the ring moves to where it was, until nothing is right of
// it or below it, when that square leaves the board. Sliding until no gray is
// left gives a straight array of numbers whose rows and columns still grow,
// and the first fundamental theorem of jeu de taquin says it is the same
// array whichever corner each slide opens. The child fills boards and slides;
// the puzzles ask for a start that finishes in a goal, every start of a
// finish (a Littlewood–Richardson count), every finished shape, every start
// sorted by its finished shape, and every order of opening the gray squares,
// where the one finish is the surprise.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = b => Object.keys(b).sort().join();
export const MODES = ['design', 'fillings', 'starts', 'outlines', 'orders', 'playground'];
const CATALOGS = ['fillings', 'starts', 'outlines', 'orders'];
const catalog = q => CATALOGS.includes(q.mode);

// --- Shapes and fillings -----------------------------------------------------
// A shape is a partition, longest row first. Cells are [row, column] from the
// top left. The white squares of a board, in reading order, are its cells; a
// filling is the list of numbers on them in that order.
export const isPartition = a => Array.isArray(a) && a.every((x, i) => Number.isInteger(x) && x > 0 && (i === 0 || a[i - 1] >= x));
export const contains = (outer, inner) => inner.length <= outer.length && inner.every((m, i) => m <= outer[i]);
export function skewCells(outer, inner) {
  const out = [];
  outer.forEach((l, r) => { for (let c = inner[r] || 0; c < l; c++) out.push([r, c]); });
  return out;
}
export const innerCells = inner => skewCells(inner, []);
const inOuter = (outer, r, c) => r >= 0 && c >= 0 && r < outer.length && c < outer[r];
const inSkew = (s, r, c) => inOuter(s.outer, r, c) && c >= (s.inner[r] || 0);
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const num = v => typeof v === 'number' && v > 0;
const at = (G, r, c) => r >= 0 && r < G.length && c >= 0 && c < G[r].length ? G[r][c] : undefined;

// The grid of a board: 0 gray, null an empty white square, a number, -1 the
// ring, -2 a square that has left the board.
export function blankGrid(s) {
  return s.outer.map((l, r) => Array.from({length: l}, (_, c) => (c < (s.inner[r] || 0) ? 0 : null)));
}
export function filledGrid(s, filling) {
  const G = blankGrid(s);
  skewCells(s.outer, s.inner).forEach(([r, c], i) => { G[r][c] = filling[i]; });
  return G;
}
// A square can take the next number when the squares above it and left of it
// on the board already hold numbers.
export const canPlace = (s, G, r, c) => G[r]?.[c] === null && [[r - 1, c], [r, c - 1]].every(([y, x]) => !inSkew(s, y, x) || num(G[y][x]));
export function isStandard(s, filling) {
  const cells = skewCells(s.outer, s.inner);
  if (!Array.isArray(filling) || filling.length !== cells.length) return false;
  if ([...filling].sort((x, y) => x - y).some((v, i) => v !== i + 1)) return false;
  const G = filledGrid(s, filling);
  return cells.every(([r, c]) => (!inSkew(s, r - 1, c) || G[r - 1][c] < G[r][c]) && (!inSkew(s, r, c - 1) || G[r][c - 1] < G[r][c]));
}
// Every start of a board, found by placing 1, 2, … where they may go.
const fillingMemo = new Map();
export function fillings(s) {
  const k = `${s.outer}|${s.inner}`;
  if (fillingMemo.has(k)) return fillingMemo.get(k);
  const cells = skewCells(s.outer, s.inner), G = blankGrid(s), out = [];
  (function grow(next) {
    if (next > cells.length) { out.push(cells.map(([r, c]) => G[r][c])); return; }
    for (const [r, c] of cells) if (canPlace(s, G, r, c)) { G[r][c] = next; grow(next + 1); G[r][c] = null; }
  })(1);
  fillingMemo.set(k, out);
  return out;
}

// --- Slides ------------------------------------------------------------------
// The gray corners: gray squares with no gray square right of them or below.
export function cornersOf(G) {
  const out = [];
  G.forEach((row, r) => row.forEach((v, c) => { if (v === 0 && at(G, r, c + 1) !== 0 && at(G, r + 1, c) !== 0) out.push([r, c]); }));
  return out;
}
export const besideRing = (G, [r, c]) => [[r, c + 1], [r + 1, c]].filter(([y, x]) => num(at(G, y, x)));
export function smallerOf(G, ring) {
  const near = besideRing(G, ring);
  return near.length ? near.reduce((a, b) => (G[a[0]][a[1]] < G[b[0]][b[1]] ? a : b)) : null;
}
// One whole slide from a gray corner, for computing answers.
export function slideFrom(G0, corner) {
  const G = G0.map(row => [...row]);
  let ring = corner;
  const path = [corner];
  G[ring[0]][ring[1]] = -1;
  for (let s = smallerOf(G, ring); s; s = smallerOf(G, ring)) { G[ring[0]][ring[1]] = G[s[0]][s[1]]; G[s[0]][s[1]] = -1; ring = s; path.push(s); }
  G[ring[0]][ring[1]] = -2;
  return {grid: G, path, exit: ring};
}
// Slide until no gray is left, opening corners as `pick` chooses.
export function rectify(G0, pick = corners => corners[0]) {
  let G = G0, corners;
  const order = [], exits = [];
  while ((corners = cornersOf(G)).length) { const c = pick(corners, G); order.push(c); const s = slideFrom(G, c); G = s.grid; exits.push(s.exit); }
  return {grid: G, order, exits};
}
export const finishRows = G => G.map(row => row.filter(num)).filter(row => row.length);
export const outlineOf = rows => rows.map(row => row.length);
export const finishKey = rows => rows.map(row => row.join(',')).join('/');
export const finishOf = (s, filling) => finishRows(rectify(filledGrid(s, filling)).grid);
// Every order of opening the gray squares of an inner shape, each as a list of
// inner-cell indices: the ways to take a Young diagram apart corner by corner.
const orderMemo = new Map();
export function ordersOf(inner) {
  const k = String(inner);
  if (orderMemo.has(k)) return orderMemo.get(k);
  const cells = innerCells(inner), out = [];
  (function take(rows, done) {
    if (done.length === cells.length) { out.push(done); return; }
    rows.forEach((l, r) => {
      if (!l || (rows[r + 1] || 0) >= l) return;
      const next = [...rows]; next[r]--;
      take(next, [...done, cells.findIndex(([y, x]) => y === r && x === l - 1)]);
    });
  })([...inner], []);
  orderMemo.set(k, out);
  return out;
}

// --- A run, replayed from the save --------------------------------------------
// The save holds the squares where 1, 2, … were placed (`place`, as cell
// indices) and every tap after that (`steps`, as [row, column]): a gray
// corner opened while no ring is out, otherwise the number that slid. The
// grid is always derived, so an illegal save cannot be replayed.
export const shapeOf = (q, b) => (q.mode === 'playground' ? q.shapes[b.shape] : q);
export function runOf(q, b) {
  const s = shapeOf(q, b);
  if (!s) return null;
  const cells = skewCells(s.outer, s.inner), n = cells.length, G = blankGrid(s);
  let filling = null;
  if (q.mode === 'orders') {
    cells.forEach(([r, c], i) => { G[r][c] = q.start[i]; });
    filling = [...q.start];
  } else {
    if (!Array.isArray(b.place) || b.place.length > n) return null;
    for (let k = 0; k < b.place.length; k++) {
      const i = b.place[k];
      if (!Number.isInteger(i) || i < 0 || i >= n) return null;
      const [r, c] = cells[i];
      if (!canPlace(s, G, r, c)) return null;
      G[r][c] = k + 1;
    }
    if (b.place.length === n) filling = cells.map(([r, c]) => G[r][c]);
  }
  if (!Array.isArray(b.steps) || (b.steps.length && !filling)) return null;
  let ring = null;
  const opened = [], exits = [];
  for (const step of b.steps) {
    if (!Array.isArray(step) || step.length !== 2 || !step.every(Number.isInteger)) return null;
    const [r, c] = step;
    if (!ring) {
      if (!cornersOf(G).some(x => same(x, step))) return null;
      G[r][c] = -1; ring = [r, c]; opened.push([r, c]);
    } else {
      const s2 = smallerOf(G, ring);
      if (!s2 || !same(s2, step)) return null;
      G[ring[0]][ring[1]] = G[r][c]; G[r][c] = -1; ring = [r, c];
    }
    if (!besideRing(G, ring).length) { G[ring[0]][ring[1]] = -2; exits.push(ring); ring = null; }
  }
  const phase = !filling ? 'place' : ring ? 'slide' : G.some(row => row.includes(0)) ? 'open' : 'done';
  return {shape: s, cells, grid: G, filling, ring, opened, exits, phase, next: (q.mode === 'orders' ? n : b.place.length) + 1};
}
const begun = (q, b) => b.steps.length > 0 || (q.mode !== 'orders' && b.place.length > 0);
const orderOf = (s, opened) => { const cells = innerCells(s.inner); return opened.map(([r, c]) => cells.findIndex(([y, x]) => y === r && x === c)); };

// --- Answers -----------------------------------------------------------------
export const matches = (target, rows) => (target.finish ? finishKey(target.finish) === finishKey(rows) : String(target.outline) === String(outlineOf(rows)));
// The key of a shelf item, or null if it is not well formed.
export function itemKey(q, item) {
  if (q.mode === 'outlines') return isPartition(item) && item.reduce((t, x) => t + x, 0) === skewCells(q.outer, q.inner).length ? item.join(',') : null;
  if (q.mode === 'orders') return Array.isArray(item) && item.every(Number.isInteger) ? item.join(',') : null;
  return isStandard(q, item) ? item.join(',') : null;
}
// What a finished run puts on the shelf.
const itemOf = (q, run) => (q.mode === 'outlines' ? outlineOf(finishRows(run.grid)) : q.mode === 'orders' ? orderOf(run.shape, run.opened) : run.filling);
const answerMemo = new Map();
export function answersOf(q) {
  const k = JSON.stringify(q);
  if (answerMemo.has(k)) return answerMemo.get(k);
  let out = [];
  if (q.mode === 'orders') out = ordersOf(q.inner);
  else if (q.mode === 'outlines') { const seen = new Map(); for (const f of fillings(q)) { const o = outlineOf(finishOf(q, f)); seen.set(String(o), o); } out = [...seen.values()]; }
  else if (q.mode === 'starts') out = fillings(q).filter(f => finishKey(finishOf(q, f)) === finishKey(q.target));
  else if (q.mode === 'fillings') out = fillings(q);
  answerMemo.set(k, out);
  return out;
}
const answerKeys = q => answersOf(q).map(a => a.join(','));
// The starts a hint aims at: those that would still add to the shelf or reach a goal.
function wanted(q, b) {
  if (q.mode === 'design') return fillings(q).filter(f => q.targets.some((t, i) => !b.reached.includes(i) && matches(t, finishOf(q, f))));
  const kept = new Set(b.shelf.map(x => x.join(',')));
  if (q.mode === 'fillings' || q.mode === 'starts') return answersOf(q).filter(f => !kept.has(f.join(',')));
  if (q.mode === 'outlines') return fillings(q).filter(f => !kept.has(outlineOf(finishOf(q, f)).join(',')));
  return [];
}

// --- Boards --------------------------------------------------------------------
// design:     {place, steps, reached}        reached: goals met, by index
// fillings, starts, outlines: {place, steps, shelf, more, done}
// orders:     {steps, shelf, more, done}     the start is given
// playground: {shape, place, steps}
// `more` answers a wrong That's all and holds it off until the shelf grows.
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'design') return {place: [], steps: [], reached: []};
  if (q.mode === 'orders') return {steps: [], shelf: [], more: false, done: false};
  if (q.mode === 'playground') return {shape: 0, place: [], steps: []};
  return {place: [], steps: [], shelf: [], more: false, done: false};
}
const FIELDS = {design: 'place,reached,steps', orders: 'done,more,shelf,steps', playground: 'place,shape,steps'};
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || keys(b) !== (FIELDS[q.mode] || 'done,more,place,shelf,steps')) return false;
  if (q.mode === 'playground' && !(Number.isInteger(b.shape) && b.shape >= 0 && b.shape < q.shapes.length)) return false;
  if (!runOf(q, b)) return false;
  if (q.mode === 'playground') return true;
  if (q.mode === 'design') return Array.isArray(b.reached) && b.reached.every(i => Number.isInteger(i) && i >= 0 && i < q.targets.length) && new Set(b.reached).size === b.reached.length;
  if (!Array.isArray(b.shelf) || typeof b.more !== 'boolean' || typeof b.done !== 'boolean') return false;
  const answers = new Set(answerKeys(q)), kept = b.shelf.map(item => itemKey(q, item));
  if (kept.some(k => k === null || !answers.has(k)) || new Set(kept).size !== kept.length) return false;
  const complete = kept.length === answers.size;
  return (!b.more || (!complete && kept.length > 0)) && (!b.done || (complete && !b.more));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  return q.mode === 'design' ? b.reached.length === q.targets.length : b.done;
}
// A run that has just finished counts: it reaches goals or joins the shelf.
function credit(q, b, run) {
  const rows = finishRows(run.grid);
  if (q.mode === 'design') {
    const add = q.targets.map((t, i) => i).filter(i => !b.reached.includes(i) && matches(q.targets[i], rows));
    return add.length ? {...b, reached: [...b.reached, ...add]} : b;
  }
  if (!catalog(q) || (q.mode === 'starts' && finishKey(rows) !== finishKey(q.target))) return b;
  const item = itemOf(q, run);
  return b.shelf.some(x => x.join(',') === item.join(',')) ? b : {...b, shelf: [...b.shelf, item], more: false};
}
const isCell = a => Array.isArray(a) && a.length === 2 && a.every(Number.isInteger);
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const run = runOf(q, b), t = action.type;
  let next;
  if (t === 'place') {
    const i = action.cell;
    if (run.phase !== 'place' || keys(action) !== 'cell,type' || !Number.isInteger(i) || i < 0 || i >= run.cells.length) return null;
    const [r, c] = run.cells[i];
    if (!canPlace(run.shape, run.grid, r, c)) return null;
    next = {...b, place: [...b.place, i]};
  } else if (t === 'open' || t === 'slide') {
    if (keys(action) !== 'at,type' || !isCell(action.at) || run.phase !== (t === 'open' ? 'open' : 'slide')) return null;
    next = {...b, steps: [...b.steps, [...action.at]]};
    if (!runOf(q, next)) return null;
  } else if (t === 'new') {
    if (!begun(q, b)) return null;
    next = q.mode === 'orders' ? {...b, steps: []} : {...b, place: [], steps: []};
  } else if (t === 'all') {
    if (!catalog(q) || !b.shelf.length || b.more) return null;
    return b.shelf.length === answersOf(q).length ? {...b, done: true} : {...b, more: true};
  } else if (t === 'shape') {
    const i = action.index;
    if (q.mode !== 'playground' || !Number.isInteger(i) || i < 0 || i >= q.shapes.length || i === b.shape) return null;
    return {shape: i, place: [], steps: []};
  } else return null;
  const after = runOf(q, next);
  return after.phase === 'done' && run.phase !== 'done' ? credit(q, next, after) : next;
}

// --- Hints -------------------------------------------------------------------
const ROWS = ['top', 'second', 'third', 'fourth', 'fifth'];
const inRow = r => `in the ${ROWS[r]} row`;
const ALL = {fillings: 'Every start is found.', starts: 'Every start is found.', outlines: 'Every shape is found.', orders: 'Every order is found.'};
const fresher = {type: 'new'};
function runHint(run) {
  if (run.ring) { const [r, c] = smallerOf(run.grid, run.ring); return {type: 'move', action: {type: 'slide', at: [r, c]}, text: `Slide the ${run.grid[r][c]}.`}; }
  const [r, c] = cornersOf(run.grid)[0];
  return {type: 'move', action: {type: 'open', at: [r, c]}, text: `Open the gray corner ${inRow(r)}.`};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const run = runOf(q, b);
  if (q.mode === 'orders') {
    const kept = new Set(b.shelf.map(x => x.join(','))), aims = ordersOf(q.inner).filter(o => !kept.has(o.join(',')));
    if (!aims.length) return {type: 'move', action: {type: 'all'}, text: ALL.orders};
    const sofar = orderOf(run.shape, run.opened), aim = aims.find(o => sofar.every((x, i) => o[i] === x));
    if (!aim || run.phase === 'done') return {type: 'move', action: fresher, text: run.phase === 'done' ? 'Press New run.' : 'You have this order. Press New run.'};
    if (run.ring) return runHint(run);
    const [r, c] = innerCells(q.inner)[aim[sofar.length]];
    return {type: 'move', action: {type: 'open', at: [r, c]}, text: `Open the gray corner ${inRow(r)}.`};
  }
  const aims = wanted(q, b);
  if (!aims.length) return {type: 'move', action: {type: 'all'}, text: ALL[q.mode]};
  if (run.phase === 'place') {
    const sofar = b.place, aim = aims.find(f => sofar.every((i, k) => f[i] === k + 1));
    if (!aim) return {type: 'move', action: fresher, text: 'No start you need begins like this. Press New run.'};
    const i = aim.indexOf(run.next), [r] = run.cells[i];
    return {type: 'move', action: {type: 'place', cell: i}, text: `Put ${run.next} ${inRow(r)}.`};
  }
  if (run.phase === 'done' || !aims.some(f => f.join(',') === run.filling.join(','))) {
    const why = run.phase === 'done' ? '' : q.mode === 'starts' ? 'This start finishes another way. ' : q.mode === 'fillings' ? 'You have this start. ' : q.mode === 'outlines' ? 'This start finishes in a shape you have. ' : 'This start finishes like one you have. ';
    return {type: 'move', action: fresher, text: `${why}Press New run.`};
  }
  return runHint(run);
}

// --- Taps and refusals (view state, outside the save) ---------------------------
// A refusal marks the squares that explain it and belongs to the board it was
// made on: the next change of board takes it away.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {told: null}); return uiState.get(p.id); }
const TOLD = {grow: 'Numbers grow right and down.', corner: 'Only a gray corner opens.', smaller: 'The smaller number slides.'};
// What a tap on square [r, c] does: a move, a refusal, or nothing (not a control).
export function tapCell(run, r, c) {
  const G = run.grid, v = at(G, r, c);
  if (run.phase === 'place') {
    if (v !== null) return null;
    if (canPlace(run.shape, G, r, c)) return {move: {type: 'place', cell: run.cells.findIndex(x => same(x, [r, c]))}};
    return {ui: {told: {kind: 'grow', cells: [[r - 1, c], [r, c - 1]].filter(([y, x]) => inSkew(run.shape, y, x) && G[y][x] === null)}}};
  }
  if (run.phase === 'open') {
    if (v !== 0) return null;
    if (cornersOf(G).some(x => same(x, [r, c]))) return {move: {type: 'open', at: [r, c]}};
    return {ui: {told: {kind: 'corner', cells: [[r, c + 1], [r + 1, c]].filter(([y, x]) => at(G, y, x) === 0)}}};
  }
  if (run.phase === 'slide') {
    const near = besideRing(G, run.ring);
    if (!near.some(x => same(x, [r, c]))) return null;
    return same(smallerOf(G, run.ring), [r, c]) ? {move: {type: 'slide', at: [r, c]}} : {ui: {told: {kind: 'smaller', cells: near}}};
  }
  return null;
}

// --- Drawing ------------------------------------------------------------------
let drawnFor = '';
const uiAttr = payload => `data-ui='${esc(JSON.stringify({...payload, at: drawnFor}))}'`;
const actAttrs = act => (act.move ? `data-action="expansion-move" data-move="${esc(JSON.stringify(act.move))}"` : `data-action="mechanic-ui" ${uiAttr(act.ui)}`);
const moveButton = (label, action, cls, {enabled = true, hinted = false, primary = false} = {}) =>
  `<button type="button" class="${primary ? 'primary' : 'secondary'} tq-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${cls}"${enabled ? '' : ' disabled'}>${label}</button>`;
// A small picture of squares: {r, c, kind: 'num' | 'gray' | 'blank' | 'step', text}.
// A step's number (the order a gray square opened) sits in a small pine disc,
// so it does not read as a tile number.
export function mini(cells, label, cls = '', px = 22) {
  const u = 12, w = Math.max(...cells.map(x => x.c)) + 1, h = Math.max(...cells.map(x => x.r)) + 1;
  const body = cells.map(({r, c, kind, text}) => {
    const x = c * u + u / 2, y = r * u + u / 2;
    const mark = text === undefined ? '' : kind === 'step' ? `<circle class="tq-m-disc" cx="${x}" cy="${y}" r="4.2"/><text class="tq-m-order" x="${x}" y="${y}">${esc(text)}</text>` : `<text x="${x}" y="${y}">${esc(text)}</text>`;
    return `<rect class="tq-m-${kind}" x="${c * u + 0.6}" y="${r * u + 0.6}" width="${u - 1.2}" height="${u - 1.2}" rx="1.6"/>${mark}`;
  }).join('');
  return `<svg class="tq-mini ${cls}" viewBox="0 0 ${w * u} ${h * u}" width="${w * px}" height="${h * px}" role="img" aria-label="${esc(label)}">${body}</svg>`;
}
const rowsWords = rows => rows.map(row => row.join(' ')).join(', then ');
export const finishPicture = (rows, label = `Rows ${rowsWords(rows)}`, px) => mini(rows.flatMap((row, r) => row.map((v, c) => ({r, c, kind: 'num', text: v}))), label, '', px);
export const outlinePicture = (outline, label = `Rows of ${outline.join(', ')}`, px) => mini(outline.flatMap((l, r) => Array.from({length: l}, (_, c) => ({r, c, kind: 'blank'}))), label, '', px);
export function startPicture(s, filling, label) {
  const cells = skewCells(s.outer, s.inner);
  const words = s.outer.map((_, r) => cells.map((x, i) => [x, i]).filter(([x]) => x[0] === r).map(([, i]) => filling[i]).join(' ')).join(', then ');
  return mini([...innerCells(s.inner).map(([r, c]) => ({r, c, kind: 'gray'})), ...cells.map(([r, c], i) => ({r, c, kind: 'num', text: filling[i]}))], label || `Start: ${words}`);
}
export function orderPicture(inner, order) {
  const cells = innerCells(inner);
  return mini(cells.map(([r, c], i) => ({r, c, kind: 'step', text: order.indexOf(i) + 1})), `Opened ${order.map(i => `row ${cells[i][0] + 1} column ${cells[i][1] + 1}`).join(', then ')}`);
}
function cellWords(v) { return v === 0 ? 'gray' : v === -1 ? 'ring' : v === null ? 'empty' : v === -2 ? null : String(v); }
function statusOf(run) {
  const rows = run.grid.map((row, r) => { const w = row.map(cellWords).filter(Boolean); return w.length ? `${ROWS[r][0].toUpperCase()}${ROWS[r].slice(1)} row: ${w.join(', ')}.` : ''; }).filter(Boolean).join(' ');
  return `${rows}${run.phase === 'place' ? ` Next number ${run.next}.` : run.phase === 'done' ? ' No gray is left.' : ''}`;
}
function boardHTML(run, {live, told, act}) {
  const G = run.grid, marks = told ? told.cells : [];
  const hinted = act && (act.type === 'place' ? run.cells[act.cell] : act.at) || null;
  const corners = run.phase === 'open' ? cornersOf(G) : [];
  const cols = Math.max(...run.shape.outer);
  const out = [];
  G.forEach((row, r) => row.forEach((v, c) => {
    const pos = `grid-row:${r + 1};grid-column:${c + 1}`;
    const tap = live ? tapCell(run, r, c) : null;
    const kind = v === 0 ? 'gray' : v === -1 ? 'ring' : v === -2 ? 'gone' : v === null ? 'empty' : 'tile';
    const cls = ['tq-cell', kind, corners.some(x => same(x, [r, c])) ? 'corner' : '', marks.some(x => same(x, [r, c])) ? 'marked' : '', hinted && same(hinted, [r, c]) ? 'hinted' : ''].filter(Boolean).join(' ');
    const inner = kind === 'tile' ? `<span>${v}</span>` : kind === 'ring' ? '<i class="tq-ring" aria-hidden="true"></i>' : '';
    const where = `row ${r + 1}, column ${c + 1}`;
    if (tap) {
      const label = kind === 'tile' ? `${v}, beside the ring` : kind === 'gray' ? `Gray square, ${where}` : `Empty square, ${where}`;
      out.push(`<button type="button" class="${cls}" style="${pos}" ${actAttrs(tap)} data-focus="tq-${r}-${c}" data-cell="${r}-${c}" aria-label="${esc(label)}">${inner}</button>`);
    } else out.push(`<span class="${cls}" style="${pos}" data-cell="${r}-${c}" aria-hidden="true">${inner}</span>`);
  }));
  return `<div class="tq-board" style="--cols:${cols};--rows:${G.length}" role="group" aria-label="Board">${out.join('')}</div>`;
}

function render(p, a) {
  const q = p.parameters, b = a.board, run = runOf(q, b), done = solved(p, b), state = ui(p);
  drawnFor = JSON.stringify(b);
  const told = !done && state.told && state.told.at === drawnFor ? state.told : null;
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const finished = run.phase === 'done', rows = finished ? finishRows(run.grid) : null;
  let top = '', below = '', note = told ? TOLD[told.kind] : '';
  // Goals: a goal met turns pine; a finished run that meets none marks the goal.
  if (q.mode === 'design' || q.mode === 'starts') {
    const goals = q.mode === 'starts' ? [{finish: q.target}] : q.targets;
    const met = i => q.mode === 'design' && b.reached.includes(i);
    const miss = finished && !goals.some(g => matches(g, rows));
    top = `<div class="tq-goals${miss ? ' miss' : ''}" role="group" aria-label="Goal"><span class="tq-tag" aria-hidden="true">Goal</span>${goals.map((g, i) => {
      const pic = g.finish ? finishPicture(g.finish, `Goal: rows ${rowsWords(g.finish)}`, 28) : outlinePicture(g.outline, `Goal: rows of ${g.outline.join(', ')}`, 28);
      return `<span class="tq-goal${met(i) ? ' met' : ''}${finished && matches(g, rows) ? ' now' : ''}">${pic}${met(i) ? '<span class="tq-tick" aria-label="Made">✓</span>' : ''}</span>`;
    }).join('')}</div>`;
  }
  if (q.mode === 'playground') {
    top = `<div class="tq-shapes" role="group" aria-label="Boards">${q.shapes.map((s, i) => `<button type="button" class="tq-shape" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'shape', index: i}))}" data-focus="tq-shape-${i}" aria-pressed="${i === b.shape}" aria-label="Board ${i + 1}">${mini([...innerCells(s.inner).map(([r, c]) => ({r, c, kind: 'gray'})), ...skewCells(s.outer, s.inner).map(([r, c]) => ({r, c, kind: 'blank'}))], `Board ${i + 1}`, '', 13)}</button>`).join('')}</div>`;
  }
  const tray = run.phase === 'place' && !done ? `<span class="tq-tray" role="img" aria-label="Next number ${run.next}"><span>${run.next}</span></span>` : '';
  const newRun = done ? '' : moveButton('New run', {type: 'new'}, 'tq-new', {enabled: begun(q, b), hinted: act?.type === 'new', primary: finished && begun(q, b)});
  const all = catalog(q) && !done ? moveButton('That’s all', {type: 'all'}, 'tq-all', {enabled: b.shelf.length > 0 && !b.more, hinted: act?.type === 'all'}) : '';
  if (catalog(q)) {
    if (!note && b.more) note = 'There is another.';
    const nowKey = finished ? itemOf(q, run).join(',') : null;
    const ring = item => (nowKey !== null && item.join(',') === nowKey ? ' now' : '');
    if (b.shelf.length && q.mode === 'fillings') {
      const groups = new Map();
      for (const f of b.shelf) { const o = outlineOf(finishOf(q, f)).join(','); if (!groups.has(o)) groups.set(o, []); groups.get(o).push(f); }
      below = `<div class="tq-shelf tq-groups" role="list" aria-label="Found">${[...groups].map(([o, list]) => `<div class="tq-group" role="listitem"><span class="tq-head">${outlinePicture(o.split(',').map(Number), `Finished in rows of ${o.split(',').join(', ')}`)}</span>${list.map(f => `<span class="tq-item${ring(f)}">${startPicture(q, f)}</span>`).join('')}</div>`).join('')}</div>`;
    } else if (b.shelf.length) {
      below = `<div class="tq-shelf" role="list" aria-label="Found">${b.shelf.map(item => `<span class="tq-item${ring(item)}" role="listitem">${q.mode === 'outlines' ? outlinePicture(item) : q.mode === 'orders' ? `${orderPicture(q.inner, item)}<span class="tq-arrow" aria-hidden="true">→</span>${finishPicture(finishOf(q, q.start), `Finished: rows ${rowsWords(finishOf(q, q.start))}`)}` : startPicture(q, item)}</span>`).join('')}</div>`;
    }
  }
  const bar = tray || newRun || all ? `<div class="tq-bar">${tray}${newRun}${all}</div>` : '';
  const status = `${statusOf(run)}${b.shelf?.length ? ` Found ${b.shelf.length}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="tq-puzzle tq-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="taquin">${top}${boardHTML(run, {live: !done, told, act})}${bar}${note ? `<p class="tq-told">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Motion: the tile that slid glides in from where it was. The board is drawn
// in its final state; this only adds motion, after a slide that extends the
// board drawn before it, so Undo never plays a slide.
const seen = new Map();
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function wire(root, p, api) {
  const b = api.attempt().board, before = seen.get(p.id);
  seen.set(p.id, JSON.stringify(b));
  if (!before || reduced() || !Array.isArray(b.steps)) return;
  let prev;
  try { prev = JSON.parse(before); } catch { return; }
  if (!Array.isArray(prev.steps) || b.steps.length !== prev.steps.length + 1 || JSON.stringify(b.steps.slice(0, -1)) !== JSON.stringify(prev.steps) || String(prev.place) !== String(b.place) || prev.shape !== b.shape) return;
  const run = runOf(p.parameters, prev);
  if (!run?.ring) return;
  const [r, c] = b.steps.at(-1), [hr, hc] = run.ring;
  const tile = root.querySelector(`[data-cell="${hr}-${hc}"]`), from = root.querySelector(`[data-cell="${r}-${c}"]`);
  if (!tile || !from || typeof tile.animate !== 'function') return;
  const x = from.getBoundingClientRect(), y = tile.getBoundingClientRect();
  tile.animate([{transform: `translate(${x.left - y.left}px, ${x.top - y.top}px)`}, {transform: 'none'}], {duration: 170, easing: 'ease-out'});
}

export const taquinMechanics = {
  taquin: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      state.told = object(payload.told) && TOLD[payload.told.kind] && Array.isArray(payload.told.cells) ? {...payload.told, at: payload.at} : null;
    },
    reset: p => { uiState.delete(p.id); seen.delete(p.id); },
    // Undo takes back placings, opens and slides, never a discovery: the
    // shelf, the goals met and a refused That's all stay.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'design' && Array.isArray(from.reached)) return {...to, reached: [...from.reached]};
      if (catalog(q) && Array.isArray(from.shelf)) return {...to, shelf: from.shelf.map(x => [...x]), more: from.more && from.shelf.length > 0};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'taquin',
  family: {id: 'taquin', symbol: '◰', area: 'patterns', region: 'counting'},
  mechanics: taquinMechanics,
  pack: new URL('./taquin.json', import.meta.url).href,
  css: new URL('./taquin.css', import.meta.url).href,
  focus: 'button.tq-cell,.tq-new:not([disabled]),.tq-all:not([disabled])'
};
