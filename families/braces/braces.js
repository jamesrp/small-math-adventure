// Bracing frames (worksheet Week 52). A grid of square cells is built from
// bars of fixed length joined by pins that let them turn, so a cell can lean
// into a diamond. A brace across a cell keeps that cell square. Every
// horizontal bar in a column stays parallel to the others in that column, and
// every vertical bar in a row stays parallel in that row, so a frame's shape
// is set by one angle per row and one per column, and a brace in row i,
// column j locks those two angles together. Hence the frame holds its shape
// exactly when the braces link all the rows and columns into one piece: as a
// graph with a dot per row and per column and a link per brace, it is
// connected (Bolker and Crapo, 1979). An m-by-n frame needs at least
// m + n − 1 braces, and the fewest that work form a spanning tree.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MODES = ['fewest', 'one', 'loose', 'playground'];

// --- Frames ------------------------------------------------------------------
// Cell k is row floor(k / cols), column k % cols. Rows are R1…, columns C1….
export const cellsOf = q => q.rows * q.cols;
export const rowOf = (q, k) => Math.floor(k / q.cols);
export const colOf = (q, k) => k % q.cols;
export const cellName = (q, k) => `row ${rowOf(q, k) + 1}, column ${colOf(q, k) + 1}`;
export const allowed = (q, k) => Number.isInteger(k) && k >= 0 && k < cellsOf(q) && !(q.windows || []).includes(k);
const sorted = list => [...list].sort((a, b) => a - b);
// The pieces the braces link rows and columns into: piece of each row and
// column, and how many pieces there are.
export function pieces(q, braces) {
  const parent = Array.from({length: q.rows + q.cols}, (_, i) => i);
  const find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  for (const k of braces) parent[find(rowOf(q, k))] = find(q.rows + colOf(q, k));
  const roots = [...new Set(parent.map((_, i) => find(i)))];
  const of = parent.map((_, i) => roots.indexOf(find(i)));
  return {row: of.slice(0, q.rows), col: of.slice(q.rows), count: roots.length};
}
export const holds = (q, braces) => pieces(q, braces).count === 1;
export const fewest = q => q.rows + q.cols - 1;
// Braces that can go on their own without the frame starting to move: those
// on a loop of the row-column graph.
export const spare = (q, braces) => braces.filter(k => pieces(q, braces.filter(j => j !== k)).count === pieces(q, braces).count);
export const covers = (q, braces) => Array.from({length: q.rows}, (_, r) => braces.some(k => rowOf(q, k) === r)).every(Boolean) && Array.from({length: q.cols}, (_, c) => braces.some(k => colOf(q, k) === c)).every(Boolean);
// A loose design: q.count braces, at least one in every row and column, and
// the frame still moves.
export const loose = (q, braces) => braces.length === q.count && covers(q, braces) && !holds(q, braces);

// Every set of `size` allowed cells, for the small searches below.
function choose(list, size, from = 0, chosen = [], out = []) {
  if (chosen.length === size) { out.push([...chosen]); return out; }
  for (let i = from; i <= list.length - (size - chosen.length); i++) { chosen.push(list[i]); choose(list, size, i + 1, chosen, out); chosen.pop(); }
  return out;
}
const cache = new Map();
const cached = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const openCells = q => Array.from({length: cellsOf(q)}, (_, k) => k).filter(k => allowed(q, k));
// Every fewest design (a spanning tree of the allowed cells).
export const fewestDesigns = q => cached(`f${q.rows}x${q.cols}:${q.windows || ''}`, () => choose(openCells(q), fewest(q)).filter(set => holds(q, set)));
export const looseDesigns = q => cached(`l${q.rows}x${q.cols}:${q.windows || ''}:${q.count}`, () => choose(openCells(q), q.count).filter(set => loose(q, set)));

// --- How a frame moves -------------------------------------------------------
// The frame's joints for given angles: every horizontal bar in column j points
// at angle a.col[j] (radians, 0 is to the right) and every vertical bar in row
// i at π/2 + a.row[i]. Bars are `size` long; joint (r, c) is the sum of the
// bars above and to the left of it.
export function joints(q, a, size = 1) {
  const out = [];
  for (let r = 0; r <= q.rows; r++) for (let c = 0; c <= q.cols; c++) {
    let x = 0, y = 0;
    for (let j = 0; j < c; j++) { x += size * Math.cos(a.col[j]); y += size * Math.sin(a.col[j]); }
    for (let i = 0; i < r; i++) { x += size * Math.cos(Math.PI / 2 + a.row[i]); y += size * Math.sin(Math.PI / 2 + a.row[i]); }
    out.push([x, y]);
  }
  return out;
}
// A push: each piece turns by its own amount, the piece of column 1 stays
// put, so braced cells stay square and the rest lean. `t` runs 0 to 1.
const SWAY = [0, 1, -0.75, 0.55, -0.9, 0.4, -0.6, 0.8, -0.45];
export function pushAngles(q, braces, t, amount = 0.42) {
  const p = pieces(q, braces), base = p.col[0];
  const order = [...new Set([base, ...p.row, ...p.col])];
  const turn = piece => amount * SWAY[order.indexOf(piece) % SWAY.length] * Math.sin(Math.PI * 3 * t) * (1 - t);
  return {row: p.row.map(turn), col: p.col.map(turn)};
}

// --- Boards ------------------------------------------------------------------
// fewest: {braces, told, claimed}   one, loose, playground: {braces}
// `told` answers a wrong Fewest: the frame still moves, or a brace that can go.
const startOf = q => sorted(q.start || []);
const validSet = (q, list) => Array.isArray(list) && list.every(k => allowed(q, k)) && new Set(list).size === list.length && list.every((k, i) => i === 0 || list[i - 1] < k);
const toldFor = (q, braces) => !holds(q, braces) ? {kind: 'moves'} : braces.length > fewest(q) ? {kind: 'spare', cell: spare(q, braces)[0]} : null;
function fresh(p) {
  const q = p.parameters;
  return q.mode === 'fewest' ? {braces: startOf(q), told: null, claimed: false} : {braces: startOf(q)};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || !validSet(q, b.braces)) return false;
  if (q.mode === 'one') { const start = startOf(q); return start.every(k => b.braces.includes(k)) && b.braces.length <= start.length + 1; }
  if (q.mode === 'loose') return b.braces.length <= q.count;
  if (q.mode !== 'fewest') return true;
  if (typeof b.claimed !== 'boolean') return false;
  if (b.claimed) return b.told === null && holds(q, b.braces) && b.braces.length === fewest(q);
  return b.told === null || (b.braces.length > 0 && JSON.stringify(b.told) === JSON.stringify(toldFor(q, b.braces)));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'fewest') return b.claimed;
  if (q.mode === 'one') return holds(q, b.braces);
  return loose(q, b.braces);
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (action.type === 'brace') {
    const k = action.cell;
    if (!allowed(q, k)) return null;
    const has = b.braces.includes(k), braces = has ? b.braces.filter(j => j !== k) : sorted([...b.braces, k]);
    if (q.mode === 'one' && (startOf(q).includes(k) || braces.length > startOf(q).length + 1)) return null;
    if (q.mode === 'loose' && braces.length > q.count) return null;
    return q.mode === 'fewest' ? {braces, told: null, claimed: false} : {braces};
  }
  if (action.type === 'claim' && q.mode === 'fewest') {
    // An answer to this same frame waits for a change.
    if (!b.braces.length || b.told) return null;
    const told = toldFor(q, b.braces);
    return told ? {...b, told} : {...b, claimed: true};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
// Hints work from the child's own braces: a brace that can go comes out first,
// then a brace joins two pieces, then Fewest.
const nearest = (list, score) => list.reduce((top, x) => score(x) > score(top) ? x : top, list[0]);
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || solved(p, b)) return {type: 'done'};
  const toggle = (cell, text) => ({type: 'move', action: {type: 'brace', cell}, text, cell});
  if (q.mode === 'fewest' || q.mode === 'one') {
    const own = q.mode === 'one' ? b.braces.filter(k => !startOf(q).includes(k)) : b.braces;
    const extra = q.mode === 'one' ? own.filter(k => !holds(q, b.braces)) : spare(q, b.braces);
    if (extra.length) return toggle(extra[0], q.mode === 'one' ? 'This brace doesn’t make it hold. Take it out.' : 'This brace can go.');
    const p0 = pieces(q, b.braces);
    if (p0.count > 1) {
      const join = openCells(q).find(k => !b.braces.includes(k) && p0.row[rowOf(q, k)] !== p0.col[colOf(q, k)]);
      if (join === undefined) return {type: 'deadend', text: 'No brace can join these pieces.'};
      return toggle(join, 'Brace this cell.');
    }
    return {type: 'move', action: {type: 'claim'}, text: 'Press Fewest.'};
  }
  const target = nearest(looseDesigns(q), t => -(t.filter(k => !b.braces.includes(k)).length + b.braces.filter(k => !t.includes(k)).length));
  const out = b.braces.find(k => !target.includes(k));
  if (out !== undefined) return toggle(out, 'Take this brace out.');
  return toggle(target.find(k => !b.braces.includes(k)), 'Brace this cell.');
}

// --- Drawing -----------------------------------------------------------------
const BAR = 20, PAD = 9;
const f = n => Number(n.toFixed(2));
const square = q => ({row: Array(q.rows).fill(0), col: Array(q.cols).fill(0)});
const at = (q, pts, r, c) => pts[r * (q.cols + 1) + c];
// The frame at rest, as SVG: cells (controls when they can take a brace),
// bars, braces and pins, each tagged with its joints so a push can move them.
function frameSvg(q, b, opts) {
  const pts = joints(q, square(q), BAR), w = q.cols * BAR, h = q.rows * BAR, p0 = opts.tint ? pieces(q, b.braces) : null;
  const pt = ([x, y]) => `${f(x)},${f(y)}`;
  const cells = [], braceLines = [];
  for (let k = 0; k < cellsOf(q); k++) {
    const r = rowOf(q, k), c = colOf(q, k), corners = [[r, c], [r, c + 1], [r + 1, c + 1], [r + 1, c]];
    const win = (q.windows || []).includes(k), has = b.braces.includes(k), fixed = (q.mode === 'one' && startOf(q).includes(k));
    const act = opts.act && !win && !fixed && (has || opts.canAdd);
    const cls = ['bf-cell', win ? 'window' : '', has ? 'braced' : '', opts.hinted === k ? 'hinted' : '', opts.told === k ? 'told' : ''].join(' ');
    const label = `${cellName(q, k)}${win ? ', a window' : has ? `, braced${fixed ? ', fixed' : ''}` : ''}${act ? (has ? '. Take the brace out' : '. Brace it') : ''}`;
    const control = act ? `role="button" tabindex="0" data-bf-cell="${k}" data-focus="bf-cell-${k}"` : 'role="img"';
    cells.push(`<polygon class="${cls}" data-corners="${corners.map(x => x.join(':')).join(' ')}" points="${corners.map(([rr, cc]) => pt(at(q, pts, rr, cc))).join(' ')}" ${control} aria-label="${esc(label)}"/>`);
    if (has) braceLines.push(`<line class="bf-brace${fixed ? ' fixed' : ''}${p0 && p0.count > 1 ? ` g${p0.row[r] % 4}` : ''}${opts.told === k ? ' told' : ''}" data-a="${r}:${c}" data-b="${r + 1}:${c + 1}" x1="${f(at(q, pts, r, c)[0])}" y1="${f(at(q, pts, r, c)[1])}" x2="${f(at(q, pts, r + 1, c + 1)[0])}" y2="${f(at(q, pts, r + 1, c + 1)[1])}"/>`);
  }
  const bars = [];
  for (let r = 0; r <= q.rows; r++) for (let c = 0; c <= q.cols; c++) {
    if (c < q.cols) bars.push([[r, c], [r, c + 1]]);
    if (r < q.rows) bars.push([[r, c], [r + 1, c]]);
  }
  const barSvg = bars.map(([a, z]) => `<line class="bf-bar" data-a="${a.join(':')}" data-b="${z.join(':')}" x1="${f(at(q, pts, ...a)[0])}" y1="${f(at(q, pts, ...a)[1])}" x2="${f(at(q, pts, ...z)[0])}" y2="${f(at(q, pts, ...z)[1])}"/>`).join('');
  const pins = pts.map(([x, y], i) => `<circle class="bf-pin" data-p="${Math.floor(i / (q.cols + 1))}:${i % (q.cols + 1)}" cx="${f(x)}" cy="${f(y)}" r="1.5"/>`).join('');
  const labels = opts.labels ? Array.from({length: q.rows}, (_, r) => `<text class="bf-name" x="${-PAD + 2.5}" y="${f(r * BAR + BAR / 2 + 1.6)}">R${r + 1}</text>`).join('') + Array.from({length: q.cols}, (_, c) => `<text class="bf-name" x="${f(c * BAR + BAR / 2)}" y="${-PAD + 4.5}">C${c + 1}</text>`).join('') : '';
  return `<svg class="bf-frame" viewBox="${-PAD} ${-PAD} ${w + 2 * PAD} ${h + 2 * PAD}" style="--bf-w:${q.cols}" role="group" aria-label="${esc(`Frame of ${q.rows} by ${q.cols} cells`)}" data-bf-frame data-rows="${q.rows}" data-cols="${q.cols}">${labels}<g class="bf-cells">${cells.join('')}</g><g class="bf-bars">${barSvg}</g><g class="bf-braces">${braceLines.join('')}</g><g class="bf-pins">${pins}</g></svg>`;
}
// The row-column graph: rows down the left, columns down the right, a link
// for each brace, dots tinted by piece and lit when there is one piece. The
// links and tints show only after a push (braces.css), so the graph explains
// what the push did rather than predicting it.
function rowColumnGraph(q, braces) {
  const span = Math.max(q.rows, q.cols), aspect = .85, y = (i, n) => span === 1 ? 50 : 10 + 80 * (i + (span - n) / 2) / (span - 1);
  const nodes = {};
  for (let r = 0; r < q.rows; r++) nodes[`R${r + 1}`] = [16, y(r, q.rows)];
  for (let c = 0; c < q.cols; c++) nodes[`C${c + 1}`] = [84, y(c, q.cols)];
  const g = graphOf({nodes, edges: braces.map(k => [`R${rowOf(q, k) + 1}`, `C${colOf(q, k) + 1}`]), aspect, scale: 1.25});
  const p0 = pieces(q, braces), one = p0.count === 1, size = {};
  for (const x of [...p0.row, ...p0.col]) size[x] = (size[x] || 0) + 1;
  const tint = piece => one ? 'lit' : size[piece] > 1 ? `g${piece % 4}` : '';
  return graphBoard(g, {
    cls: `bf-graph${one ? ' joined' : ''}`, label: 'Rows and columns',
    node: id => ({cls: tint(id[0] === 'R' ? p0.row[+id.slice(1) - 1] : p0.col[+id.slice(1) - 1]), label: id[0] === 'R' ? `Row ${id.slice(1)}` : `Column ${id.slice(1)}`}),
    edge: i => ({cls: one ? 'lit' : `g${p0.row[rowOf(q, braces[i])] % 4}`})
  });
}
const button = (label, attrs, cls, enabled, hinted) => `<button type="button" class="secondary bf-button ${cls}${hinted ? ' hinted' : ''}" ${attrs} ${enabled ? '' : 'disabled'}>${label}</button>`;
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null;
  const canAdd = q.mode === 'one' ? b.braces.length < startOf(q).length + 1 : q.mode === 'loose' ? b.braces.length < q.count : true;
  const frame = frameSvg(q, b, {act: !done, canAdd, hinted: hinted?.cell, told: b.told?.kind === 'spare' ? b.told.cell : null, labels: q.graph, tint: q.graph});
  const beads = q.mode === 'loose' ? `<span class="bf-beads" role="img" aria-label="${b.braces.length} of ${q.count} braces">${Array.from({length: q.count}, (_, k) => `<i class="${k < b.braces.length ? 'on' : ''}"></i>`).join('')}</span>` : '';
  const claim = q.mode === 'fewest' && !done ? button('Fewest', `data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'claim'}))}" data-focus="bf-claim"`, 'bf-claim', b.braces.length > 0 && !b.told, hinted?.action?.type === 'claim') : '';
  const push = button('Push', 'data-bf-push data-focus="bf-push"', 'bf-push', true, false);
  const words = {moves: 'It still moves.', spare: 'It holds, but this brace can go.'};
  const note = b.told ? `<p class="bf-told">${words[b.told.kind]}</p>` : '';
  const graph = q.graph ? `<div class="bf-side" data-bf-after="${esc(`Rows and columns linked by braces: ${plural(pieces(q, b.braces).count, 'piece')}`)}">${rowColumnGraph(q, b.braces)}</div>` : '';
  const status = `${plural(b.braces.length, 'brace')}.${b.told ? ` ${words[b.told.kind]}` : ''}`;
  return `<div class="bf-puzzle${q.graph ? ' with-graph' : ''}${b.told?.kind === 'moves' ? ' push-now' : ''}" data-mechanic-wire="braces"><div class="bf-bar">${beads}<span class="bf-buttons">${push}${claim}</span></div><div class="bf-boards"><div class="bf-main">${frame}</div>${graph}</div>${note}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// A push moves the drawing only; the board does not change.
const quiet = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function animate(root, q, braces) {
  const svg = root.querySelector('[data-bf-frame]');
  if (!svg || svg.dataset.pushing) return;
  svg.dataset.pushing = '1';
  const rest = joints(q, square(q), BAR), mid = rest.reduce(([x, y], [u, v]) => [x + u / rest.length, y + v / rest.length], [0, 0]);
  const draw = t => {
    const pts = joints(q, quiet() ? (t > 0 && t < 1 ? pushAngles(q, braces, 1 / 6) : square(q)) : pushAngles(q, braces, t), BAR);
    const c = pts.reduce(([x, y], [u, v]) => [x + u / pts.length, y + v / pts.length], [0, 0]), dx = mid[0] - c[0], dy = mid[1] - c[1];
    const P = key => { const [r, cc] = key.split(':').map(Number), [x, y] = pts[r * (q.cols + 1) + cc]; return [x + dx, y + dy]; };
    svg.querySelectorAll('line[data-a]').forEach(l => { const [x1, y1] = P(l.dataset.a), [x2, y2] = P(l.dataset.b); l.setAttribute('x1', f(x1)); l.setAttribute('y1', f(y1)); l.setAttribute('x2', f(x2)); l.setAttribute('y2', f(y2)); });
    svg.querySelectorAll('circle[data-p]').forEach(n => { const [x, y] = P(n.dataset.p); n.setAttribute('cx', f(x)); n.setAttribute('cy', f(y)); });
    svg.querySelectorAll('polygon[data-corners]').forEach(g => g.setAttribute('points', g.dataset.corners.split(' ').map(P).map(([x, y]) => `${f(x)},${f(y)}`).join(' ')));
  };
  const firm = holds(q, braces), length = quiet() ? 900 : 1500, start = performance.now();
  if (firm) svg.classList.add('bf-firm');
  // The push reveals the graph's links and the pieces that turned together.
  root.classList.add('pushed');
  const side = root.querySelector('[data-bf-after]'), board = side?.querySelector('.gb-board');
  if (board) board.setAttribute('aria-label', side.dataset.bfAfter);
  const status = root.querySelector('[role=status]');
  if (status) status.textContent = firm ? 'It holds.' : 'It moves.';
  const step = now => {
    if (!svg.isConnected) return;
    const t = Math.min(1, (now - start) / length);
    if (!firm) draw(t);
    if (t < 1) requestAnimationFrame(step); else { draw(1); svg.classList.remove('bf-firm'); delete svg.dataset.pushing; }
  };
  requestAnimationFrame(step);
}
function wire(root, p, api) {
  const q = p.parameters, act = cell => api.apply({type: 'brace', cell});
  const frame = root.querySelector('[data-bf-frame]');
  frame?.addEventListener('click', e => { const cell = e.target.closest('[data-bf-cell]'); if (cell) act(Number(cell.dataset.bfCell)); });
  frame?.addEventListener('keydown', e => {
    if (!['Enter', ' '].includes(e.key)) return;
    const cell = e.target.closest('[data-bf-cell]');
    if (cell) { e.preventDefault(); act(Number(cell.dataset.bfCell)); }
  });
  root.querySelector('[data-bf-push]')?.addEventListener('click', () => animate(root, q, api.attempt().board.braces));
  // A wrong Fewest on a frame that still moves shows the movement at once.
  if (root.classList.contains('push-now')) animate(root, q, api.attempt().board.braces);
}

export const bracesMechanics = {
  braces: {
    fresh, valid, solved, move, hint, render, wire,
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'braces',
  family: {id: 'braces', symbol: '▧'},
  mechanics: bracesMechanics,
  pack: new URL('./braces.json', import.meta.url).href,
  css: new URL('./braces.css', import.meta.url).href,
  focus: '.bf-cell[role=button],.bf-button:not([disabled])'
};
