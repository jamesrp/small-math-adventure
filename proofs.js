import { esc, actionButton } from './expansion-controls.js';

// Proof puzzles. A solve may be a witness (a covering, a walk, a win) or a
// refutation the app checks (a painting or a star set). One-try rounds test
// whether a child can apply an idea to fresh instances. Design notes, sources
// and the reasoning behind each check: docs/proofs/README.md.

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => typeof value === 'number' && Number.isSafeInteger(value);
const index = value => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value) ? Number(value) : value;
const clone = value => JSON.parse(JSON.stringify(value));
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Transient choices that are not moves: the selected tool, a half-placed
// domino, a pebble lifted before Take. They live for the session only.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) uiState.set(p.id, { tool: 'star', sel: null, pick: null });
  return uiState.get(p.id);
}
const resetUI = p => { uiState.delete(p.id); };
// Evidence puzzles (one-check rounds, duels) never hint at an answer: Hint shows
// the authored nudges, level by level. Their solve() steps, which do give
// answers, are for scripts/validate-proofs.mjs and the tests only.
const note = () => ({ type: 'note' });
const moveButton = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} expansion-action" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="move-${esc(JSON.stringify(action))}" ${extra}>${label}</button>`;
// The main action of a round keeps focus across renders (Check, then New round).
const primaryButton = (label, action, extra = '') => `<button type="button" class="primary expansion-action" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="proof-primary" ${extra}>${label}</button>`;
const uiButton = (label, payload, pressed, extra = '') => `<button type="button" class="secondary proof-tool" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="ui-${esc(JSON.stringify(payload))}" aria-pressed="${pressed}" ${extra}>${label}</button>`;
const card = (title, lines) => `<section class="proof-card${lines.every(line => line.state === true) ? ' done' : ''}" aria-label="${esc(title)}"><h2 class="proof-title">${esc(title)}</h2>${lines.map(line => `<p class="proof-check ${line.state === true ? 'ok' : line.state === false ? 'no' : ''}"><span class="proof-mark" aria-hidden="true"></span><span>${esc(line.text)}</span>${line.count ? `<span class="proof-count">${esc(line.count)}</span>` : ''}<span class="sr-only">${line.state === true ? 'done' : line.state === false ? 'not yet: fix this' : 'not yet'}</span></p>`).join('')}</section>`;
const pips = (n, on, label) => `<span class="proof-pips" role="img" aria-label="${esc(label)}">${Array.from({ length: n }, (_, i) => `<span class="${i < on ? 'on' : ''}"></span>`).join('')}</span>`;
const swatch = color => `<span class="proof-swatch c${color}" aria-hidden="true"></span>`;
const colorName = color => color === 1 ? 'gold' : 'green';

/* ------------------------------------------------------------------ *
 * Grids and matchings. Cells are row-major indices; colors alternate.
 * ------------------------------------------------------------------ */
const gridParity = (cols, cell) => (Math.floor(cell / cols) + cell % cols) % 2;
function gridNeighbors(cols, rows, region, cell) {
  const r = Math.floor(cell / cols), c = cell % cols, out = [];
  if (r > 0) out.push(cell - cols);
  if (r < rows - 1) out.push(cell + cols);
  if (c > 0) out.push(cell - 1);
  if (c < cols - 1) out.push(cell + 1);
  return out.filter(other => region.has(other));
}
// Maximum matching from the cells of one color (augmenting paths).
function matchFrom(cols, rows, region, side) {
  const owner = new Map();
  const augment = (u, seen) => {
    for (const v of gridNeighbors(cols, rows, region, u)) {
      if (seen.has(v)) continue;
      seen.add(v);
      if (!owner.has(v) || augment(owner.get(v), seen)) { owner.set(v, u); return true; }
    }
    return false;
  };
  for (const u of [...region].sort((a, b) => a - b)) if (gridParity(cols, u) === side) augment(u, new Set());
  return owner;
}
function tilingOf(cols, rows, region) {
  if (region.size % 2) return null;
  const owner = matchFrom(cols, rows, region, 0);
  return owner.size * 2 === region.size ? [...owner].map(([v, u]) => [Math.min(u, v), Math.max(u, v)]).sort((a, b) => a[0] - b[0]) : null;
}
// Smallest alternating-path Hall violator: a set of cells, none adjacent, with
// fewer neighbors than members. Exists for every uncoverable grid region.
function hallSet(cols, rows, region) {
  let best = null;
  for (const side of [0, 1]) {
    const owner = matchFrom(cols, rows, region, side), matched = new Set(owner.values());
    for (const u of [...region].sort((a, b) => a - b)) {
      if (gridParity(cols, u) !== side || matched.has(u)) continue;
      const S = new Set([u]), T = new Set(), queue = [u];
      while (queue.length) {
        const x = queue.shift();
        for (const y of gridNeighbors(cols, rows, region, x)) {
          if (T.has(y)) continue;
          T.add(y);
          const next = owner.get(y);
          if (next !== undefined && !S.has(next)) { S.add(next); queue.push(next); }
        }
      }
      if (!best || S.size < best.stars.length) best = { stars: [...S].sort((a, b) => a - b), partners: [...T].sort((a, b) => a - b) };
    }
  }
  return best;
}
const regionOf = p => new Set(p.parameters.cells);

/* ------------------------------------------------------------------ *
 * Garden proofs: cover the garden, or refute it with stars or paint.
 * ------------------------------------------------------------------ */
function partnersOf(p, stars) {
  const { cols, rows } = p.parameters, region = regionOf(p), set = new Set(stars), out = new Set();
  for (const s of set) for (const n of gridNeighbors(cols, rows, region, s)) if (!set.has(n)) out.add(n);
  return out;
}
export function starStatus(p, stars) {
  const { cols, rows } = p.parameters, region = regionOf(p), set = new Set(stars);
  const touching = stars.some(s => gridNeighbors(cols, rows, region, s).some(n => set.has(n)));
  const partners = partnersOf(p, stars).size;
  return { count: stars.length, partners, touching, proved: stars.length > 0 && !touching && partners < stars.length };
}
export function paintStatus(p, paint) {
  const { cols, rows } = p.parameters, region = regionOf(p);
  let gold = 0, green = 0, blank = 0, clash = false;
  for (const cell of region) {
    const color = paint[cell];
    if (color === 1) gold++; else if (color === 2) green++; else blank++;
    if (color && gridNeighbors(cols, rows, region, cell).some(n => paint[n] === color)) clash = true;
  }
  return { gold, green, blank, clash, proved: blank === 0 && !clash && gold !== green };
}
function gardenValid(p, board) {
  const { cols, rows } = p.parameters, region = regionOf(p), n = cols * rows;
  if (!object(board) || !['cover', 'prove'].includes(board.mode) || !Array.isArray(board.doms) || !Array.isArray(board.paint) || board.paint.length !== n || !Array.isArray(board.stars)) return false;
  // A road garden tried before the chalk is earned has no proof mode.
  if (p.parameters.proveLocked && board.mode === 'prove') return false;
  const used = new Set();
  for (const pair of board.doms) {
    if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(cell => integer(cell) && region.has(cell) && !used.has(cell))) return false;
    if (!gridNeighbors(cols, rows, region, pair[0]).includes(pair[1])) return false;
    pair.forEach(cell => used.add(cell));
  }
  if (!board.paint.every((color, cell) => [0, 1, 2].includes(color) && (region.has(cell) || color === 0))) return false;
  return new Set(board.stars).size === board.stars.length && board.stars.every(cell => integer(cell) && region.has(cell));
}
function gardenSolved(p, board) {
  if (!gardenValid(p, board)) return false;
  if (p.parameters.coverable) return board.doms.length * 2 === p.parameters.cells.length;
  return starStatus(p, board.stars).proved || paintStatus(p, board.paint).proved;
}
function cellList(p, cells) {
  const region = regionOf(p);
  const list = Array.isArray(cells) ? cells.map(index) : [];
  return list.length && list.length <= region.size && list.every(cell => integer(cell) && region.has(cell)) ? [...new Set(list)] : null;
}
function gardenMove(p, board, action) {
  if (!gardenValid(p, board) || !object(action) || gardenSolved(p, board)) return null;
  const next = clone(board), region = regionOf(p), { cols, rows } = p.parameters;
  const covered = new Set(next.doms.flat());
  switch (action.type) {
    case 'mode':
      if (!['cover', 'prove'].includes(action.mode) || (action.mode === 'prove' && p.parameters.proveLocked)) return null;
      next.mode = action.mode; return next;
    case 'place': {
      const cells = cellList(p, action.cells);
      if (board.mode !== 'cover' || !cells || cells.length !== 2 || cells.some(cell => covered.has(cell)) || !gridNeighbors(cols, rows, region, cells[0]).includes(cells[1])) return null;
      next.doms.push(cells); return next;
    }
    case 'lift': {
      const cell = index(action.cell);
      if (board.mode !== 'cover' || !covered.has(cell)) return null;
      next.doms = next.doms.filter(pair => !pair.includes(cell)); return next;
    }
    case 'clear':
      if (board.mode !== 'cover') return null;
      next.doms = []; return next;
    case 'paint': {
      const cells = cellList(p, action.cells), color = index(action.color);
      if (board.mode !== 'prove' || !cells || ![0, 1, 2].includes(color)) return null;
      cells.forEach(cell => { next.paint[cell] = color; }); return next;
    }
    case 'star': {
      const cells = cellList(p, action.cells);
      if (board.mode !== 'prove' || !cells || typeof action.on !== 'boolean') return null;
      const stars = new Set(next.stars);
      cells.forEach(cell => action.on ? stars.add(cell) : stars.delete(cell));
      next.stars = [...stars].sort((a, b) => a - b); return next;
    }
    case 'erase': {
      const cells = cellList(p, action.cells);
      if (board.mode !== 'prove' || !cells) return null;
      cells.forEach(cell => { next.paint[cell] = 0; });
      next.stars = next.stars.filter(cell => !cells.includes(cell)); return next;
    }
    case 'checker': {
      const cell = index(action.cell);
      if (board.mode !== 'prove' || !region.has(cell)) return null;
      for (const other of region) next.paint[other] = gridParity(cols, other) === gridParity(cols, cell) ? 1 : 2;
      return next;
    }
    case 'fill': {
      const color = index(action.color);
      if (board.mode !== 'prove' || ![1, 2].includes(color)) return null;
      for (const cell of region) if (!next.paint[cell]) next.paint[cell] = color;
      return next;
    }
    case 'wipe':
      if (board.mode !== 'prove') return null;
      next.paint = next.paint.map(() => 0); next.stars = []; return next;
    default: return null;
  }
}
const place = (p, cell) => `row ${Math.floor(cell / p.parameters.cols) + 1}, column ${cell % p.parameters.cols + 1}`;
function gardenHint(p, board) {
  if (!gardenValid(p, board)) return { type: 'deadend', text: 'Restart this garden.' };
  if (gardenSolved(p, board)) return { type: 'done' };
  const { cols, rows, cells, coverable } = p.parameters, region = regionOf(p);
  if (coverable) {
    if (board.mode !== 'cover') return { type: 'move', action: { type: 'mode', mode: 'cover' }, text: 'Try covering this garden with dominoes.' };
    const covered = new Set(board.doms.flat()), free = new Set(cells.filter(cell => !covered.has(cell)));
    const rest = tilingOf(cols, rows, free);
    if (rest?.length) return { type: 'move', action: { type: 'place', cells: rest[0] }, pair: rest[0], text: `One domino can cover ${place(p, rest[0][0])} and ${place(p, rest[0][1])}.` };
    // The current dominoes block a covering: lift the newest one that does.
    for (const pair of [...board.doms].reverse()) {
      const without = new Set([...free, ...pair]);
      if (tilingOf(cols, rows, without)) return { type: 'move', action: { type: 'lift', cell: pair[0] }, pair, text: `Lift the domino at ${place(p, pair[0])}; the other squares cannot all be covered around it.` };
    }
    return { type: 'move', action: { type: 'clear' }, text: 'Lift every domino and start again.' };
  }
  if (p.parameters.proveLocked) return { type: 'equipment', text: p.equipmentHint || 'This garden needs a proof tool you have not found yet.' };
  if (board.mode !== 'prove') return { type: 'move', action: { type: 'mode', mode: 'prove' }, text: 'Look for squares that cannot all find a partner. Then switch to Prove it can’t.' };
  const refutation = p.parameters.refutation;
  if (refutation.kind === 'stars') {
    const target = new Set(refutation.stars);
    const extra = board.stars.find(cell => !target.has(cell));
    if (extra !== undefined) return { type: 'move', action: { type: 'star', cells: [extra], on: false }, pair: [extra], text: `Remove the star at ${place(p, extra)}.` };
    const missing = refutation.stars.find(cell => !board.stars.includes(cell));
    return { type: 'move', action: { type: 'star', cells: [missing], on: true }, pair: [missing], text: `Star ${place(p, missing)}. Which squares could be its partner?` };
  }
  // Paint along the child's own convention when there is one.
  const first = cells.find(cell => board.paint[cell]);
  const goldParity = first === undefined ? 0 : (gridParity(cols, first) + (board.paint[first] === 1 ? 0 : 1)) % 2;
  const want = cell => gridParity(cols, cell) === goldParity ? 1 : 2;
  const wrong = cells.find(cell => board.paint[cell] !== want(cell));
  return { type: 'move', action: { type: 'paint', cells: [wrong], color: want(wrong) }, pair: [wrong], text: `Paint ${place(p, wrong)} ${colorName(want(wrong))}. Touching squares get different colors.` };
}
function gardenRender(p, attempt, ctx = {}) {
  const board = attempt.board, { cols, rows } = p.parameters, region = regionOf(p), state = ui(p), solved = gardenSolved(p, board);
  const prove = board.mode === 'prove', covered = new Map();
  board.doms.forEach((pair, i) => pair.forEach(cell => covered.set(cell, i)));
  const stars = new Set(board.stars), partners = prove ? partnersOf(p, board.stars) : new Set();
  const checkerReady = Boolean(p.parameters.checkerAfter && ctx.profile?.attempts?.[p.parameters.checkerAfter]?.completed);
  if (state.tool === 'checker' && !checkerReady) state.tool = 'star';
  const hinted = new Set(ctx.highlighted || []);
  const pos = cell => `grid-row:${Math.floor(cell / cols) + 1};grid-column:${cell % cols + 1}`;
  const cellsHTML = Array.from({ length: cols * rows }, (_, cell) => {
    if (!region.has(cell)) return `<span class="pg-hole" style="${pos(cell)}" data-cell="${cell}" aria-hidden="true"></span>`;
    const color = prove ? board.paint[cell] : 0, star = prove && stars.has(cell), isCovered = !prove && covered.has(cell);
    const classes = ['pg-cell', color ? `c${color}` : '', star ? 'starred' : '', partners.has(cell) && !star ? 'partner' : '', isCovered ? 'covered' : '', !prove && state.sel === cell ? 'selected' : '', hinted.has(cell) ? 'hinted' : ''].filter(Boolean).join(' ');
    const label = `Row ${Math.floor(cell / cols) + 1}, column ${cell % cols + 1}${isCovered ? ', covered; tap to lift' : ''}${color ? `, ${colorName(color)}` : ''}${star ? ', starred' : ''}${partners.has(cell) && !star ? ', partner square' : ''}`;
    return `<button type="button" class="${classes}" style="${pos(cell)}" data-cell="${cell}" data-focus="pg-cell-${cell}" aria-label="${esc(label)}" ${solved ? 'disabled' : ''}><span aria-hidden="true">${star ? '★' : color === 1 ? '●' : color === 2 ? '◆' : ''}</span></button>`;
  }).join('');
  const dominoes = prove ? '' : board.doms.map((pair, i) => {
    const first = Math.min(...pair), horizontal = Math.floor(pair[0] / cols) === Math.floor(pair[1] / cols);
    return `<span class="pg-domino tile-color-${i % 6}" style="grid-row:${Math.floor(first / cols) + 1} / span ${horizontal ? 1 : 2};grid-column:${first % cols + 1} / span ${horizontal ? 2 : 1}" aria-hidden="true"></span>`;
  }).join('');
  const locked = Boolean(p.parameters.proveLocked);
  const modeButton = (mode, icon, label) => mode === 'prove' && locked
    ? `<button type="button" class="proof-locked" disabled aria-label="Prove it can’t: needs chalk"><span aria-hidden="true">🔒</span> ${label}</button>`
    : actionButton(`<span aria-hidden="true">${icon}</span> ${label}`, { type: 'mode', mode }, `aria-pressed="${board.mode === mode}" ${solved ? 'disabled' : ''}`);
  const tools = [
    ['star', '<span class="proof-tool-icon" aria-hidden="true">★</span> Star', 'Star'],
    [1, `${swatch(1)} Paint`, 'Paint gold'],
    [2, `${swatch(2)} Paint`, 'Paint green'],
    ...(checkerReady ? [['checker', '<span class="proof-checker-icon" aria-hidden="true"></span> Checker', 'Checker']] : []),
    ['erase', '<span class="proof-tool-icon" aria-hidden="true">⌫</span> Erase', 'Erase']
  ];
  const st = starStatus(p, board.stars), pt = paintStatus(p, board.paint), anyPaint = pt.gold + pt.green > 0;
  const proofCards = card('Star proof', [
    { text: 'Stars don’t touch', state: st.count ? !st.touching : null },
    { text: 'More stars than partners', count: `★ ${st.count} · ◌ ${st.partners}`, state: st.count ? st.count > st.partners : null }
  ]) + card('Paint proof', [
    { text: 'Every square painted', count: anyPaint && pt.blank ? `${pt.blank} blank` : '', state: anyPaint && !pt.blank ? true : null },
    { text: 'Touching squares differ', state: pt.clash ? false : anyPaint && !pt.blank ? true : null },
    { text: 'Different counts', count: `● ${pt.gold} · ◆ ${pt.green}`, state: anyPaint && !pt.blank ? pt.gold !== pt.green : null }
  ]);
  return `<div class="proof-puzzle proof-garden" data-mechanic-wire="proofgarden">
    <div class="proof-modes" role="group" aria-label="Mode">${modeButton('cover', '▰', 'Cover')}${modeButton('prove', '✎', 'Prove it can’t')}</div>
    <div class="pg-board${prove ? ' proving' : ''}" style="--cols:${cols};--rows:${rows}" role="group" aria-label="Garden with ${region.size} squares">${cellsHTML}${dominoes}</div>
    ${solved ? '' : prove ? `<div class="proof-toolbox" role="group" aria-label="Proof tools">${tools.map(([tool, label, name]) => uiButton(label, { tool }, state.tool === tool, `aria-label="${name}"`)).join('')}</div>
      <div class="proof-actions">${state.tool === 1 || state.tool === 2 ? actionButton(`Fill blanks ${swatch(state.tool)}`, { type: 'fill', color: state.tool }, `aria-label="Fill blanks ${colorName(state.tool)}" ${pt.blank ? '' : 'disabled'}`) : ''}${actionButton('Clear all', { type: 'wipe' }, anyPaint || st.count ? '' : 'disabled')}</div>`
      : `<div class="proof-actions">${board.doms.length ? '' : '<span class="proof-hintline">Drag across two squares.</span>'}${actionButton('Clear', { type: 'clear' }, board.doms.length ? '' : 'disabled')}</div>`}
    ${prove ? `<div class="proof-cards">${proofCards}</div>` : ''}
  </div>`;
}
// Pointer gestures follow the Tile Garden board: main.js passes in the rules
// of tile-controls.js as api.tile (importing them here would make a module
// cycle through engine.js). Only the central 60% of a square joins a stroke,
// and a cover drag places a domino only when it ends on its second square.
// Positions between pointer events are sampled, so a quick stroke still
// paints every square it crosses.
const tileGardens = new WeakMap();
function tileGarden(p) {
  if (!tileGardens.has(p)) tileGardens.set(p, { cols: p.parameters.cols, rows: p.parameters.rows, cells: p.parameters.cells, tileShape: 'domino' });
  return tileGardens.get(p);
}
// A click echo is the click some touch browsers send, with detail 0, after a
// pointerup that has already been handled. Keyboard clicks are never echoes.
let lastPointerTap = null;
function gardenWire(root, p, api) {
  const boardEl = root.querySelector('.pg-board');
  if (!boardEl || root.querySelector('.pg-cell:disabled')) return;
  const state = ui(p), region = regionOf(p), tp = tileGarden(p);
  const { extendTileStroke, startTileStroke, tapTileSelection, tileReleaseAction, tileStrokeTarget } = api.tile;
  let gesture = null;
  const cellNode = cell => boardEl.querySelector(`.pg-cell[data-cell="${cell}"]`);
  const board = () => api.attempt().board;
  const tap = cell => {
    const b = board();
    if (b.mode === 'cover') {
      if (b.doms.some(pair => pair.includes(cell))) { state.sel = null; api.apply({ type: 'lift', cell }); return; }
      const next = tapTileSelection(tp, b.doms, state.sel === null ? [] : [state.sel], cell);
      if (next.status === 'complete') { state.sel = null; api.apply({ type: 'place', cells: next.cells }); return; }
      api.ui({ sel: next.cells.length ? next.cells[0] : null });
      return;
    }
    api.apply(strokeAction([cell], firstValue(cell)));
  };
  const firstValue = cell => {
    const b = board();
    if (state.tool === 'star') return !b.stars.includes(cell);
    if (state.tool === 'erase' || state.tool === 'checker') return 0;
    return b.paint[cell] === state.tool ? 0 : state.tool;
  };
  const strokeAction = (cells, value) => {
    if (state.tool === 'star') return { type: 'star', cells, on: value };
    if (state.tool === 'erase') return { type: 'erase', cells };
    if (state.tool === 'checker') return { type: 'checker', cell: cells[0] };
    return { type: 'paint', cells, color: value };
  };
  const preview = (cells, value) => {
    for (const cell of cells) {
      const node = cellNode(cell); if (!node) continue;
      node.classList.remove('c1', 'c2', 'starred');
      if (state.tool === 'star') { if (value) node.classList.add('starred'); }
      else if (state.tool !== 'erase' && value) node.classList.add(`c${value}`);
      node.firstElementChild.textContent = state.tool === 'star' ? (value ? '★' : '') : value === 1 ? '●' : value === 2 ? '◆' : '';
    }
  };
  const showCover = () => boardEl.querySelectorAll('.pg-cell').forEach(node => {
    const on = gesture?.kind === 'cover' && gesture.multi && gesture.stroke.cells.includes(Number(node.dataset.cell));
    node.classList.toggle('preview', Boolean(on && gesture.stroke.status !== 'blocked'));
    node.classList.toggle('invalid', Boolean(on && gesture.stroke.status === 'blocked'));
  });
  const targetAt = (x, y) => tileStrokeTarget(gesture.boardRect, gesture.rects, x, y);
  // Every target along the segment from the last pointer position, in order.
  const along = (x, y) => {
    const [x0, y0] = gesture.last, steps = Math.max(1, Math.ceil(Math.hypot(x - x0, y - y0) / 8)), hits = [];
    for (let i = 1; i <= steps; i++) hits.push(targetAt(x0 + (x - x0) * i / steps, y0 + (y - y0) * i / steps));
    gesture.last = [x, y];
    return hits;
  };
  boardEl.addEventListener('pointerdown', e => {
    if (gesture || !e.isPrimary || e.button !== 0) return;
    const node = e.target.closest('.pg-cell');
    if (!node || !boardEl.contains(node)) return;
    e.preventDefault();
    boardEl.setPointerCapture(e.pointerId);
    const cell = Number(node.dataset.cell), b = board();
    const rects = [...boardEl.querySelectorAll('.pg-cell,.pg-hole')].map(n => ({ cell: Number(n.dataset.cell), rect: n.getBoundingClientRect() }));
    const base = { id: e.pointerId, start: cell, boardRect: boardEl.getBoundingClientRect(), rects, startRect: node.getBoundingClientRect(), last: [e.clientX, e.clientY] };
    if (b.mode === 'cover') {
      gesture = b.doms.some(pair => pair.includes(cell)) ? { ...base, kind: 'tap' } : { ...base, kind: 'cover', stroke: startTileStroke(tp, b.doms, cell), multi: false, departed: false };
      return;
    }
    if (state.tool === 'checker') { gesture = { ...base, kind: 'tap' }; return; }
    gesture = { ...base, kind: 'stroke', value: firstValue(cell), cells: [cell] };
    preview([cell], gesture.value);
  });
  boardEl.addEventListener('pointermove', e => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const hits = along(e.clientX, e.clientY);
    if (gesture.kind === 'cover') {
      const before = gesture.stroke;
      for (const hit of hits) {
        if (hit === -1) gesture.departed = true;
        gesture.stroke = extendTileStroke(tp, board().doms, gesture.stroke, hit);
      }
      if (gesture.stroke !== before) { if (gesture.stroke.cells.length > 1) gesture.multi = true; showCover(); }
      return;
    }
    if (gesture.kind === 'stroke') for (const hit of hits) if (region.has(hit) && !gesture.cells.includes(hit)) { gesture.cells.push(hit); preview([hit], gesture.value); }
  });
  const finish = (e, cancel) => {
    if (!gesture || gesture.id !== e.pointerId) return;
    const g = gesture; gesture = null;
    if (boardEl.hasPointerCapture(e.pointerId)) boardEl.releasePointerCapture(e.pointerId);
    if (cancel) { api.ui({}); return; }
    const r = g.startRect, insideStart = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    lastPointerTap = { id: p.id, cell: g.start, time: Date.now() };
    if (g.kind === 'tap') {
      if (!insideStart) { api.ui({}); return; }
      if (board().mode === 'cover') tap(g.start); else api.apply({ type: 'checker', cell: g.start });
      return;
    }
    if (g.kind === 'cover') {
      const hit = tileStrokeTarget(g.boardRect, g.rects, e.clientX, e.clientY);
      const action = tileReleaseAction(g.stroke, g.multi, g.departed, hit, insideStart);
      if (action?.type === 'place') { state.sel = null; api.apply(action); }
      else if (action?.type === 'tap') tap(action.cell);
      else api.ui({});
      return;
    }
    api.apply(strokeAction(g.cells, g.value));
  };
  boardEl.addEventListener('pointerup', e => finish(e, false));
  boardEl.addEventListener('pointercancel', e => finish(e, true));
  boardEl.addEventListener('lostpointercapture', e => finish(e, true));
  // Keyboard activation reaches the cell as a click with no pointer details.
  boardEl.addEventListener('click', e => {
    const node = e.target.closest('.pg-cell');
    if (!node || e.detail !== 0) return;
    const cell = Number(node.dataset.cell);
    if (lastPointerTap && lastPointerTap.id === p.id && lastPointerTap.cell === cell && Date.now() - lastPointerTap.time < 600) return;
    tap(cell);
  });
}
const garden = {
  fresh: p => ({ mode: 'cover', doms: [], paint: Array(p.parameters.cols * p.parameters.rows).fill(0), stars: [] }),
  valid: gardenValid,
  solved: gardenSolved,
  move: gardenMove,
  hint: gardenHint,
  render: gardenRender,
  wire: gardenWire,
  reset: resetUI,
  ui(p, payload) {
    const state = ui(p);
    if (object(payload) && ['star', 1, 2, 'checker', 'erase'].includes(payload.tool)) state.tool = payload.tool;
    if (object(payload) && (payload.sel === null || integer(payload.sel))) state.sel = payload.sel;
  },
  help: () => '<div class="proof-help"><p>Dashed rings mark partners: the squares next to a star. Fill blanks paints every empty square in the chosen color.</p></div>',
  demo: 'Drag across two squares to place a domino. If the garden cannot be covered, switch to Prove it can’t and build a star proof or a paint proof.',
  // Authoring helpers used by scripts/build-proofs.mjs and the validators.
  cover: (cols, rows, region) => tilingOf(cols, rows, region),
  stars: (cols, rows, region) => hallSet(cols, rows, region)?.stars ?? null
};

/* ------------------------------------------------------------------ *
 * Flip map: the six tilings of the 2–2–1 hexagon (Week 1, cards A–F).
 * ------------------------------------------------------------------ */
const FLIP = {
  ideals: [[], [[0, 0]], [[0, 0], [1, 0]], [[0, 0], [0, 1]], [[0, 0], [0, 1], [1, 0]], [[0, 0], [0, 1], [1, 0], [1, 1]]],
  labels: ['A', 'B', 'C', 'D', 'E', 'F'],
  edges: [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]],
  wide: { box: '0 0 640 330', pos: [[62, 165], [188, 165], [320, 72], [320, 258], [452, 165], [578, 165]] },
  tall: { box: '0 0 320 690', pos: [[160, 66], [160, 204], [78, 345], [242, 345], [160, 486], [160, 624]] }
};
const flipAdjacent = (a, b) => FLIP.edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
const cubes = card => FLIP.ideals[card].length;
const DIST = (() => {
  const d = FLIP.labels.map(() => FLIP.labels.map(() => Infinity));
  for (let s = 0; s < 6; s++) {
    d[s][s] = 0; const queue = [s];
    while (queue.length) { const x = queue.shift(); for (let y = 0; y < 6; y++) if (flipAdjacent(x, y) && d[s][y] === Infinity) { d[s][y] = d[s][x] + 1; queue.push(y); } }
  }
  return d;
})();
export const tripPossible = (s, e, k) => k >= DIST[s][e] && (k - DIST[s][e]) % 2 === 0;
function tripWitness(s, e, k) {
  const path = [s];
  let cur = s;
  while (cur !== e) { cur = [0, 1, 2, 3, 4, 5].find(y => flipAdjacent(cur, y) && DIST[y][e] === DIST[cur][e] - 1); path.push(cur); }
  const back = path.length > 1 ? path.at(-2) : [0, 1, 2, 3, 4, 5].find(y => flipAdjacent(e, y));
  while (path.length - 1 < k) path.push(back, e);
  return path;
}
function paintMapStatus(paint) {
  const painted = paint.every(color => color > 0);
  const clash = FLIP.edges.some(([a, b]) => paint[a] && paint[a] === paint[b]);
  return { painted, clash, proper: painted && !clash };
}
function mapRulesOut(q, paint) {
  if (!paintMapStatus(paint).proper) return false;
  const same = paint[q.s] === paint[q.e];
  return same ? q.k % 2 === 1 : q.k % 2 === 0;
}
// The card pictures: cube stacks in a 2×2×1 box, rotated as on the worksheet.
function isoPoint(x, y, z, s) { const c = Math.cos(Math.PI / 6); return [-(((x + y) / 2 - z) * s), (x - y) * c * s]; }
function stackSVG(ideal, cx, cy, s) {
  const ox = cx + .5 * s, oy = cy, has = (i, j) => ideal.some(([a, b]) => a === i && b === j);
  const face = (pts, cls) => `<polygon class="flip-face ${cls}" points="${pts.map(([x, y, z]) => { const [px, py] = isoPoint(x, y, z, s); return `${(px + ox).toFixed(1)},${(py + oy).toFixed(1)}`; }).join(' ')}"/>`;
  let out = '';
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (!has(i, j)) out += face([[i, j, 0], [i + 1, j, 0], [i + 1, j + 1, 0], [i, j + 1, 0]], 'top');
  for (let j = 0; j < 2; j++) out += face([[0, j, 0], [0, j + 1, 0], [0, j + 1, 1], [0, j, 1]], 'right');
  for (let i = 0; i < 2; i++) out += face([[i, 0, 0], [i + 1, 0, 0], [i + 1, 0, 1], [i, 0, 1]], 'left');
  for (const [i, j] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    if (!has(i, j)) continue;
    out += face([[i, j, 1], [i + 1, j, 1], [i + 1, j + 1, 1], [i, j + 1, 1]], 'top');
    out += face([[i, j + 1, 0], [i + 1, j + 1, 0], [i + 1, j + 1, 1], [i, j + 1, 1]], 'left');
    out += face([[i + 1, j, 0], [i + 1, j + 1, 0], [i + 1, j + 1, 1], [i + 1, j, 1]], 'right');
  }
  return out;
}
// The walking map stands upright on phones. Turning the phone re-renders it.
const narrowQuery = typeof matchMedia === 'function' ? matchMedia('(max-width: 560px)') : null;
const narrowScreen = () => Boolean(narrowQuery?.matches);
let mapRerender = null;
narrowQuery?.addEventListener?.('change', () => mapRerender?.());
function mapSVG(options) {
  const { paint = [0, 0, 0, 0, 0, 0], here = null, goal = null, interactive = false, painting = false, hinted = [], disabled = false } = options;
  // The interactive map stands upright on phones; reference maps stay compact.
  const layout = interactive && narrowScreen() ? FLIP.tall : FLIP.wide;
  const edges = FLIP.edges.map(([a, b]) => {
    const [x1, y1] = layout.pos[a], [x2, y2] = layout.pos[b];
    const cls = painting && paint[a] && paint[b] ? (paint[a] !== paint[b] ? ' ok' : ' bad') : '';
    return `<line class="flip-edge${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  }).join('');
  const cards = FLIP.labels.map((label, i) => {
    const [x, y] = layout.pos[i], color = paint[i];
    const name = `Card ${label}, ${plural(cubes(i), 'cube', 'cubes')}${color ? `, ${colorName(color)}` : ''}${here === i ? ', you are here' : ''}${goal === i ? ', goal' : ''}`;
    const attrs = interactive ? `tabindex="${disabled ? -1 : 0}" role="button" data-card="${i}" data-focus="flip-card-${i}" aria-label="${esc(name)}"${disabled ? ' aria-disabled="true"' : ''}` : `role="img" aria-label="${esc(name)}"`;
    return `<g class="flip-card${color ? ` c${color}` : ''}${here === i ? ' here' : ''}${hinted.includes(i) ? ' hinted' : ''}" ${attrs}><rect x="${x - 54}" y="${y - 62}" width="108" height="124" rx="14" class="flip-card-bg"/>${stackSVG(FLIP.ideals[i], x + 4, y + 4, 25)}<text x="${x - 44}" y="${y - 38}" class="flip-label">${label}</text>${goal === i ? `<text x="${x + 28}" y="${y - 38}" class="flip-label">⚑</text>` : ''}${color === 1 ? `<circle class="flip-glyph" cx="${x + 40}" cy="${y + 48}" r="5"/>` : color === 2 ? `<polygon class="flip-glyph" points="${x + 40},${y + 41.5} ${x + 46.5},${y + 48} ${x + 40},${y + 54.5} ${x + 33.5},${y + 48}"/>` : ''}</g>`;
  }).join('');
  return `<svg class="flip-map" viewBox="${layout.box}" ${interactive ? 'role="group"' : 'role="img"'} aria-label="Map of six tilings; lines join tilings one flip apart">${edges}${cards}</svg>`;
}
function dotStrip(paint, q) {
  let color = paint[q.s], out = '';
  for (let t = 0; t <= q.k; t++) { out += `<span class="flip-dot c${color}${t === q.k ? ' end' : ''}"></span>${t < q.k ? '<span aria-hidden="true">›</span>' : ''}`; color = color === 1 ? 2 : 1; }
  return `<div class="flip-strip" role="img" aria-label="Each flip changes the color, so after ${q.k} flips you are on ${colorName(paint[q.s] === 1 ? (q.k % 2 ? 2 : 1) : (q.k % 2 ? 1 : 2))}, but card ${FLIP.labels[q.e]} is ${colorName(paint[q.e])}.">${out}<span aria-hidden="true">≠</span><span class="flip-dot c${paint[q.e]}"></span></div>`;
}
function routeValid(q, board) {
  return object(board) && ['walk', 'prove'].includes(board.mode) && Array.isArray(board.trail) && board.trail.length >= 1 && board.trail.length <= 41 && board.trail[0] === q.s &&
    board.trail.every((card, i) => integer(card) && card >= 0 && card < 6 && (i === 0 || flipAdjacent(board.trail[i - 1], card))) &&
    Array.isArray(board.paint) && board.paint.length === 6 && board.paint.every(color => [0, 1, 2].includes(color));
}
function tripCardValid(c) { return object(c) && [c.s, c.e, c.k].every(integer) && c.s >= 0 && c.s < 6 && c.e >= 0 && c.e < 6 && c.k >= 1 && c.k <= 9; }
function flipValid(p, board) {
  const q = p.parameters;
  if (q.task === 'route') return routeValid(q, board);
  const rounds = object(board) && typeof board.checked === 'boolean' && integer(board.clean) && board.clean >= 0 && board.clean <= q.rounds && (board.clean < q.rounds || board.checked);
  if (q.task === 'numbers') return rounds && [board.s, board.e].every(card => integer(card) && card >= 0 && card < 6) && Array.isArray(board.chosen) && new Set(board.chosen).size === board.chosen.length && board.chosen.every(n => integer(n) && n >= 1 && n <= q.max);
  if (q.task === 'trips') return rounds && Array.isArray(board.cards) && board.cards.length === 6 && board.cards.every(tripCardValid) && new Set(board.cards.map(c => `${c.s}-${c.e}-${c.k}`)).size === 6 &&
    Array.isArray(board.answers) && board.answers.length === 6 && board.answers.every(a => a === null || typeof a === 'boolean') && (!board.checked || board.answers.every(a => a !== null));
  return false;
}
// Numbers: the first question is the worksheet’s, A back to A. Every later
// question is a different trip, so a revealed answer never repeats.
const numbersRight = (q, board) => Array.from({ length: q.max }, (_, i) => i + 1).every(n => board.chosen.includes(n) === tripPossible(board.s, board.e, n));
function nextQuestion(board, random) {
  const pairs = [];
  for (let s = 0; s < 6; s++) for (let e = 0; e < 6; e++) if (s !== board.s || e !== board.e) pairs.push([s, e]);
  const [s, e] = pairs[Math.min(pairs.length - 1, Math.floor(random() * pairs.length))];
  return { s, e, chosen: [], checked: false, clean: board.clean };
}
const tripsRight = board => board.cards.every((c, i) => board.answers[i] === tripPossible(c.s, c.e, c.k));
function flipSolved(p, board) {
  if (!flipValid(p, board)) return false;
  const q = p.parameters;
  if (q.task === 'route') return tripPossible(q.s, q.e, q.k) ? board.trail.at(-1) === q.e && board.trail.length - 1 === q.k : mapRulesOut(q, board.paint);
  return board.clean >= q.rounds;
}
function dealTrips(random) {
  // Six cards: at least one ruled out by the colors, one too short, one possible.
  const all = [];
  for (let s = 0; s < 6; s++) for (let e = 0; e < 6; e++) for (let k = 1; k <= 7; k++) if (!(s === 0 && e === 0)) all.push({ s, e, k });
  const kind = c => tripPossible(c.s, c.e, c.k) ? 'ok' : (c.k - DIST[c.s][c.e]) % 2 ? 'parity' : 'short';
  const pickFrom = list => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  const want = ['parity', 'short', 'ok', ...[0, 1, 2].map(() => pickFrom(['parity', 'ok', 'ok', 'short']))];
  const cards = [];
  for (const w of want) {
    const options = all.filter(c => kind(c) === w && !cards.some(d => d.s === c.s && d.e === c.e && d.k === c.k));
    cards.push(pickFrom(options));
  }
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  return cards.map(({ s, e, k }) => ({ s, e, k }));
}
function flipMove(p, board, action, random = Math.random) {
  if (!flipValid(p, board) || !object(action) || flipSolved(p, board)) return null;
  const q = p.parameters, next = clone(board);
  if (q.task === 'route') {
    if (action.type === 'mode' && ['walk', 'prove'].includes(action.mode)) { next.mode = action.mode; return next; }
    if (action.type === 'flip') {
      const to = index(action.to);
      if (board.mode !== 'walk' || !integer(to) || !flipAdjacent(board.trail.at(-1), to) || board.trail.length > 40) return null;
      next.trail.push(to); return next;
    }
    if (action.type === 'walk-reset') { next.trail = [q.s]; return next; }
    if (action.type === 'paint') {
      const cardIndex = index(action.card), color = index(action.color);
      if (board.mode !== 'prove' || !integer(cardIndex) || cardIndex < 0 || cardIndex > 5 || ![0, 1, 2].includes(color)) return null;
      next.paint[cardIndex] = color; return next;
    }
    return null;
  }
  if (q.task === 'numbers') {
    const n = index(action.n);
    if (action.type === 'toggle' && !board.checked && integer(n) && n >= 1 && n <= q.max) { next.chosen = board.chosen.includes(n) ? board.chosen.filter(x => x !== n) : [...board.chosen, n].sort((a, b) => a - b); return next; }
    if (action.type === 'check' && !board.checked && board.chosen.length) { next.checked = true; next.clean = numbersRight(q, board) ? board.clean + 1 : 0; return next; }
    if (action.type === 'next' && board.checked) return nextQuestion(board, random);
    return null;
  }
  const i = index(action.i);
  if (action.type === 'answer' && !board.checked && integer(i) && i >= 0 && i < 6 && typeof action.value === 'boolean') { next.answers[i] = action.value; return next; }
  if (action.type === 'check' && !board.checked && board.answers.every(a => a !== null)) { next.checked = true; next.clean = tripsRight(board) ? board.clean + 1 : 0; return next; }
  if (action.type === 'deal' && board.checked) return { cards: dealTrips(random), answers: Array(6).fill(null), checked: false, clean: board.clean };
  return null;
}
function flipHint(p, board) {
  if (!flipValid(p, board)) return { type: 'deadend', text: 'Restart this map.' };
  if (flipSolved(p, board)) return { type: 'done' };
  const q = p.parameters;
  if (q.task === 'route') {
    if (tripPossible(q.s, q.e, q.k)) {
      if (board.mode !== 'walk') return { type: 'move', action: { type: 'mode', mode: 'walk' }, text: 'Try walking it.' };
      const cur = board.trail.at(-1), left = q.k - (board.trail.length - 1);
      if (left < DIST[cur][q.e] || (left - DIST[cur][q.e]) % 2) return { type: 'move', action: { type: 'walk-reset' }, text: `From here the flips that are left cannot end on ${FLIP.labels[q.e]}. Start again from ${FLIP.labels[q.s]}.` };
      const to = tripWitness(cur, q.e, left)[1];
      return { type: 'move', action: { type: 'flip', to }, pair: [to], text: `Flip to card ${FLIP.labels[to]}.` };
    }
    if (board.mode !== 'prove') return { type: 'move', action: { type: 'mode', mode: 'prove' }, text: 'Every walk with this many flips misses. Try Prove it can’t: paint the cards.' };
    const first = board.paint.findIndex(color => color);
    const goldParity = first < 0 ? 0 : (cubes(first) + (board.paint[first] === 1 ? 0 : 1)) % 2;
    const want = card => cubes(card) % 2 === goldParity ? 1 : 2;
    const card = [0, 1, 2, 3, 4, 5].find(c => board.paint[c] !== want(c));
    return { type: 'move', action: { type: 'paint', card, color: want(card) }, pair: [card], text: `Paint card ${FLIP.labels[card]} ${colorName(want(card))}. Every line should join two colors.` };
  }
  if (q.task === 'numbers') return board.checked ? { type: 'move', action: { type: 'next' }, text: 'Try a new question.' } : note();
  return board.checked ? { type: 'move', action: { type: 'deal' }, text: 'Deal new cards.' } : note();
}
// Answer-giving steps for the one-check tasks; never shown to a child.
function flipSolve(p, board) {
  const q = p.parameters;
  if (q.task === 'route' || flipSolved(p, board)) return flipHint(p, board).action;
  if (q.task === 'numbers') {
    if (board.checked) return { type: 'next' };
    const wrong = Array.from({ length: q.max }, (_, i) => i + 1).find(n => board.chosen.includes(n) !== tripPossible(board.s, board.e, n));
    return wrong === undefined ? { type: 'check' } : { type: 'toggle', n: wrong };
  }
  if (board.checked) return { type: 'deal' };
  const i = board.cards.findIndex((c, at) => board.answers[at] !== tripPossible(c.s, c.e, c.k));
  return i < 0 ? { type: 'check' } : { type: 'answer', i, value: tripPossible(board.cards[i].s, board.cards[i].e, board.cards[i].k) };
}
function flipRender(p, attempt, ctx = {}) {
  const board = attempt.board, q = p.parameters, solved = flipSolved(p, board), state = ui(p);
  if (q.task === 'route') {
    const prove = board.mode === 'prove', status = paintMapStatus(board.paint), cur = board.trail.at(-1), flips = board.trail.length - 1;
    if (![1, 2, 0].includes(state.tool)) state.tool = 1;
    const modeButton = (mode, icon, label) => actionButton(`<span aria-hidden="true">${icon}</span> ${label}`, { type: 'mode', mode }, `aria-pressed="${board.mode === mode}" ${solved ? 'disabled' : ''}`);
    const proved = solved && !tripPossible(q.s, q.e, q.k);
    return `<div class="proof-puzzle proof-flip" data-mechanic-wire="flipmap">
      ${solved ? '' : `<div class="proof-modes" role="group" aria-label="Mode">${modeButton('walk', '⇢', 'Walk')}${modeButton('prove', '✎', 'Prove it can’t')}</div>`}
      ${mapSVG({ paint: prove || proved ? board.paint : [0, 0, 0, 0, 0, 0], here: prove ? null : cur, goal: prove ? null : q.e, interactive: true, painting: prove, hinted: ctx.highlighted || [], disabled: solved })}
      ${proved ? dotStrip(board.paint, q) : prove ? `<div class="proof-toolbox" role="group" aria-label="Paint">${[[1, `${swatch(1)} Paint`, 'Paint gold'], [2, `${swatch(2)} Paint`, 'Paint green'], [0, '<span class="proof-tool-icon" aria-hidden="true">⌫</span> Erase', 'Erase']].map(([tool, label, name]) => uiButton(label, { tool }, state.tool === tool, `aria-label="${name}"`)).join('')}</div>
        <div class="proof-cards">${card('Paint proof', [{ text: 'Every card painted', state: status.painted ? true : null }, { text: 'Every line joins two colors', state: status.clash ? false : status.painted ? true : null }])}</div>
        ${status.proper && !solved ? '<p class="proof-note" role="status">This painting doesn’t rule it out.</p>' : ''}`
      : `<div class="proof-walkbar"><span class="proof-counter">Flips <strong class="${flips > q.k ? 'over' : ''}">${flips}</strong> · <span class="proof-trail">${board.trail.map(c => FLIP.labels[c]).join(' → ')}</span></span>${solved ? '' : actionButton('Start again', { type: 'walk-reset' }, flips ? '' : 'disabled')}</div>`}
    </div>`;
  }
  if (q.task === 'numbers') {
    const { s, e } = board, right = n => tripPossible(s, e, n), d = DIST[s][e], reveal = board.checked, missed = reveal && !numbersRight(q, board);
    // After a check the map is painted and every possible number is marked.
    const paint = reveal ? FLIP.labels.map((_, c) => cubes(c) % 2 === cubes(s) % 2 ? 1 : 2) : [0, 0, 0, 0, 0, 0];
    const trip = `${FLIP.labels[s]} → ${FLIP.labels[e]}`;
    return `<div class="proof-puzzle proof-flip">
      <div class="proof-roundbar">${pips(q.rounds, board.clean, `${board.clean} of ${q.rounds} right in a row`)}</div>
      <p class="proof-question" aria-label="From ${FLIP.labels[s]} to ${FLIP.labels[e]}">${trip}</p>
      ${mapSVG({ paint, here: s, goal: e, painting: reveal })}
      <div class="proof-numbers" role="group" aria-label="Numbers of flips">${Array.from({ length: q.max }, (_, i) => i + 1).map(n => moveButton(String(n), { type: 'toggle', n }, `secondary${reveal ? (right(n) ? ' answer' : '') + (board.chosen.includes(n) !== right(n) ? ' miss' : '') : ''}`, `aria-pressed="${board.chosen.includes(n)}" aria-label="${n}${reveal ? (right(n) ? ', can be done' : ', cannot be done') : ''}" ${reveal ? 'disabled' : ''}`)).join('')}</div>
      <div class="proof-actions">${reveal ? (solved ? '' : `<p class="proof-note" role="status">${missed ? `${trip}: ${d ? `at least ${plural(d, 'flip', 'flips')}, ` : ''}${d % 2 ? 'odd' : 'even'} numbers only.` : 'Right.'}</p>${primaryButton(missed ? 'New question' : 'Next question', { type: 'next' })}`) : primaryButton('Check', { type: 'check' }, board.chosen.length ? '' : 'disabled')}</div>
    </div>`;
  }
  const wrong = board.checked ? board.cards.filter((c, i) => board.answers[i] !== tripPossible(c.s, c.e, c.k)).length : 0;
  return `<div class="proof-puzzle proof-flip">
    <div class="proof-roundbar">${pips(q.rounds, board.clean, `${board.clean} of ${q.rounds} clean rounds in a row`)}</div>
    ${mapSVG({})}
    <div class="proof-sort-grid">${board.cards.map((c, i) => {
      const ok = tripPossible(c.s, c.e, c.k), result = board.checked ? (board.answers[i] === ok ? ' right' : ' wrong') : '';
      const reason = !board.checked ? '' : ok ? tripWitness(c.s, c.e, c.k).map(x => FLIP.labels[x]).join('') : (c.k - DIST[c.s][c.e]) % 2 ? `${swatch(cubes(c.s) % 2 ? 2 : 1)} ·${c.k}· ${swatch(cubes(c.e) % 2 ? 2 : 1)}` : `needs ${DIST[c.s][c.e]}`;
      return `<div class="proof-sort-card${result}"><p class="proof-trip" aria-label="From ${FLIP.labels[c.s]} to ${FLIP.labels[c.e]} in exactly ${plural(c.k, 'flip', 'flips')}">${FLIP.labels[c.s]} → ${FLIP.labels[c.e]} · ${c.k}</p><p class="proof-reason">${reason}</p><div class="proof-yesno">${[[true, '✓', 'Can be done'], [false, '✗', 'Cannot be done']].map(([value, mark, name]) => actionButton(mark, { type: 'answer', i, value }, `aria-pressed="${board.answers[i] === value}" aria-label="${name}: card ${i + 1}" ${board.checked ? 'disabled' : ''}`)).join('')}</div></div>`;
    }).join('')}</div>
    <div class="proof-actions">${board.checked ? (solved ? '' : `<p class="proof-note" role="status">${wrong ? (wrong === 1 ? 'One is wrong.' : `${wrong} are wrong.`) : 'All six right.'}</p>${primaryButton(wrong ? 'New cards' : 'Next cards', { type: 'deal' })}`) : primaryButton('Check', { type: 'check' }, board.answers.every(a => a !== null) ? '' : 'disabled')}</div>
  </div>`;
}
function flipWire(root, p, api) {
  const q = p.parameters;
  if (q.task !== 'route') return;
  const state = ui(p);
  mapRerender = () => { if (root.isConnected) api.ui({}); else mapRerender = null; };
  const act = node => {
    if (!node || node.getAttribute('aria-disabled') === 'true') return;
    const cardIndex = Number(node.dataset.card), board = api.attempt().board;
    if (board.mode === 'walk') api.apply({ type: 'flip', to: cardIndex });
    else api.apply({ type: 'paint', card: cardIndex, color: state.tool === 0 || board.paint[cardIndex] === state.tool ? 0 : state.tool });
  };
  root.querySelectorAll('.flip-card[data-card]').forEach(node => {
    node.addEventListener('click', () => act(node));
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(node); } });
  });
}
const flipmap = {
  fresh(p, random = Math.random) {
    const q = p.parameters;
    if (q.task === 'route') return { mode: 'walk', trail: [q.s], paint: [0, 0, 0, 0, 0, 0] };
    if (q.task === 'numbers') return { s: q.s, e: q.s, chosen: [], checked: false, clean: 0 };
    return { cards: dealTrips(random), answers: Array(6).fill(null), checked: false, clean: 0 };
  },
  valid: flipValid,
  solved: flipSolved,
  move: flipMove,
  hint: flipHint,
  solve: flipSolve,
  render: flipRender,
  wire: flipWire,
  reset: resetUI,
  noUndo: p => p.parameters.task !== 'route',
  ui(p, payload) { if (object(payload) && [0, 1, 2].includes(payload.tool)) ui(p).tool = payload.tool; },
  demo: 'Tap a joined card to flip. If the trip cannot be done, paint the cards so every line joins two colors.'
};

/* ------------------------------------------------------------------ *
 * Sorting rounds: which 6×6 gardens with a few squares missing can be
 * covered? One check per round; a level needs two clean rounds in a row.
 * ------------------------------------------------------------------ */
const SN = 6;
const sortRegion = holes => { const set = new Set(Array.from({ length: SN * SN }, (_, i) => i)); holes.forEach(h => set.delete(h)); return set; };
const sameColorPair = holes => gridParity(SN, holes[0]) === gridParity(SN, holes[1]);
export function classifyBoard(holes) {
  const region = sortRegion(holes), tiling = tilingOf(SN, SN, region);
  if (tiling) return { ok: true, why: 'tile', tiling };
  if (region.size % 2) return { ok: false, why: 'odd', size: region.size };
  let gold = 0; for (const cell of region) if (gridParity(SN, cell) === 0) gold++;
  if (gold * 2 !== region.size) return { ok: false, why: 'color', gold, green: region.size - gold };
  const hall = hallSet(SN, SN, region);
  return { ok: false, why: 'hall', stars: hall.stars, partners: hall.partners };
}
const stranded = holes => { const region = sortRegion(holes); return [...region].some(cell => !gridNeighbors(SN, SN, region, cell).length); };
// Scan k-subsets of the board from a random starting point, so a degenerate
// random source still finds a board instead of looping.
function findBoard(k, accept, random) {
  const cells = Array.from({ length: SN * SN }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  const idx = Array.from({ length: k }, (_, i) => i);
  for (;;) {
    const holes = idx.map(i => cells[i]).sort((a, b) => a - b);
    if (accept(holes)) return holes;
    let i = k - 1;
    while (i >= 0 && idx[i] === cells.length - k + i) i--;
    if (i < 0) throw new Error('No board fits this round.');
    idx[i]++; for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}
const corners = [0, SN - 1, SN * (SN - 1), SN * SN - 1];
export function makeSortRound(level, random) {
  // Answers are coin flips; the first ✗ (or ✓) slots carry the boards each level
  // needs to refute a named wrong rule. See docs/proofs/README.md.
  let labels;
  const minNo = level === 3 ? 2 : 1;
  for (let tries = 0; ; tries++) {
    labels = Array.from({ length: 6 }, () => random() < .5);
    if (labels.some(x => x) && labels.filter(x => !x).length >= minNo) break;
    if (tries > 20) { labels = [true, false, true, false, level === 3 ? false : true, false]; break; }
  }
  const out = [];
  if (level === 1) {
    let needSame = true;
    for (const ok of labels) {
      if (ok) out.push(findBoard(2, h => !sameColorPair(h), random));
      else { const same = needSame || random() < .5; needSame = false; out.push(same ? findBoard(2, sameColorPair, random) : findBoard(random() < .5 ? 1 : 3, () => true, random)); }
    }
  } else if (level === 2) {
    // Neighboring corners (✓) in every round; opposite corners (✗) in about
    // half, so neither “missing corners ⇒ ✗” nor “two corners ⇒ ✓” holds.
    let needCorner = true, oppositeCorner = random() < .5;
    for (const ok of labels) {
      if (ok && needCorner) {
        needCorner = false;
        const pairs = [[0, 1], [0, 2], [1, 3], [2, 3]].map(([a, b]) => [corners[a], corners[b]].sort((x, y) => x - y));
        out.push(pairs[Math.min(3, Math.floor(random() * 4))]);
      } else if (!ok && oppositeCorner) {
        oppositeCorner = false;
        out.push(random() < .5 ? [corners[0], corners[3]] : [corners[1], corners[2]]);
      } else out.push(findBoard(2, h => ok ? !sameColorPair(h) : sameColorPair(h), random));
    }
  } else {
    const need = ['hall', 'color'];
    for (const ok of labels) {
      if (ok) out.push(findBoard(4, h => classifyBoard(h).ok, random));
      else {
        const want = need.length ? need.shift() : random() < .5 ? 'hall' : 'color';
        out.push(findBoard(4, h => { const c = classifyBoard(h); return want === 'hall' ? c.why === 'hall' : c.why === 'color' && !stranded(h); }, random));
      }
    }
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
function sortValid(p, board) {
  const level = p.parameters.level;
  const sizeOK = n => level === 1 ? n >= 1 && n <= 3 : level === 2 ? n === 2 : n === 4;
  return object(board) && Array.isArray(board.boards) && board.boards.length === 6 &&
    board.boards.every(h => Array.isArray(h) && sizeOK(h.length) && new Set(h).size === h.length && h.every(c => integer(c) && c >= 0 && c < SN * SN)) &&
    Array.isArray(board.answers) && board.answers.length === 6 && board.answers.every(a => a === null || typeof a === 'boolean') &&
    typeof board.checked === 'boolean' && (!board.checked || board.answers.every(a => a !== null)) &&
    integer(board.clean) && board.clean >= 0 && board.clean <= p.parameters.rounds && (board.clean < p.parameters.rounds || board.checked);
}
const sortRight = board => board.boards.every((h, i) => board.answers[i] === classifyBoard(h).ok);
function miniBoard(holes, reveal) {
  const cs = 20, pad = 4, c = reveal ? classifyBoard(holes) : null, region = sortRegion(holes);
  let out = `<svg class="proof-mini" viewBox="0 0 ${SN * cs + 2 * pad} ${SN * cs + 2 * pad}" role="img" aria-label="Garden with ${plural(holes.length, 'missing square', 'missing squares')}${c ? (c.ok ? ', can be covered' : ', cannot be covered') : ''}">`;
  for (let cell = 0; cell < SN * SN; cell++) {
    const x = pad + cell % SN * cs, y = pad + Math.floor(cell / SN) * cs;
    if (!region.has(cell)) { out += `<rect class="proof-mini-hole" x="${x + 3}" y="${y + 3}" width="${cs - 6}" height="${cs - 6}" rx="4"/><line class="proof-mini-hatch" x1="${x + 6}" y1="${y + cs - 6}" x2="${x + cs - 6}" y2="${y + 6}"/>`; continue; }
    const tint = c?.why === 'color' ? ` c${gridParity(SN, cell) ? 2 : 1}` : '';
    out += `<rect class="proof-mini-cell${tint}" x="${x + .5}" y="${y + .5}" width="${cs - 1}" height="${cs - 1}" rx="3"/>`;
  }
  if (c?.why === 'tile') for (const [a, b] of c.tiling) {
    const r1 = Math.floor(a / SN), c1 = a % SN, r2 = Math.floor(b / SN), c2 = b % SN;
    out += `<rect class="proof-mini-domino" x="${pad + Math.min(c1, c2) * cs + 2.5}" y="${pad + Math.min(r1, r2) * cs + 2.5}" width="${(c1 !== c2 ? 2 : 1) * cs - 5}" height="${(r1 !== r2 ? 2 : 1) * cs - 5}" rx="5"/>`;
  }
  if (c?.why === 'hall') {
    for (const t of c.partners) out += `<circle class="proof-mini-partner" cx="${pad + t % SN * cs + cs / 2}" cy="${pad + Math.floor(t / SN) * cs + cs / 2}" r="7"/>`;
    for (const s of c.stars) out += `<text class="proof-mini-star" x="${pad + s % SN * cs + cs / 2}" y="${pad + Math.floor(s / SN) * cs + cs / 2 + 5}">★</text>`;
  }
  return out + '</svg>';
}
function caption(holes) {
  const c = classifyBoard(holes);
  if (c.why === 'odd') return `${c.size} squares`;
  if (c.why === 'color') return `${swatch(1)} ${c.gold} · ${swatch(2)} ${c.green}`;
  if (c.why === 'hall') return `★ ${c.stars.length} · ◌ ${c.partners.length}`;
  return '';
}
const sortSolved = (p, board) => sortValid(p, board) && board.clean >= p.parameters.rounds;
const sortgarden = {
  fresh: (p, random = Math.random) => ({ boards: makeSortRound(p.parameters.level, random), answers: Array(6).fill(null), checked: false, clean: 0 }),
  valid: sortValid,
  solved: sortSolved,
  move(p, board, action, random = Math.random) {
    if (!sortValid(p, board) || !object(action) || board.clean >= p.parameters.rounds) return null;
    const next = clone(board), i = index(action.i);
    if (action.type === 'answer' && !board.checked && integer(i) && i >= 0 && i < 6 && typeof action.value === 'boolean') { next.answers[i] = action.value; return next; }
    if (action.type === 'check' && !board.checked && board.answers.every(a => a !== null)) { next.checked = true; next.clean = sortRight(board) ? board.clean + 1 : 0; return next; }
    if (action.type === 'next' && board.checked) return { boards: makeSortRound(p.parameters.level, random), answers: Array(6).fill(null), checked: false, clean: board.clean };
    return null;
  },
  hint(p, board) {
    if (!sortValid(p, board)) return { type: 'deadend', text: 'Restart these rounds.' };
    if (sortSolved(p, board)) return { type: 'done' };
    return board.checked ? { type: 'move', action: { type: 'next' }, text: 'Deal a new round.' } : note();
  },
  solve(p, board) {
    if (board.checked) return { type: 'next' };
    const i = board.boards.findIndex((h, at) => board.answers[at] !== classifyBoard(h).ok);
    return i < 0 ? { type: 'check' } : { type: 'answer', i, value: classifyBoard(board.boards[i]).ok };
  },
  render(p, attempt) {
    const board = attempt.board, solved = sortSolved(p, board), rounds = p.parameters.rounds;
    const wrong = board.checked ? board.boards.filter((h, i) => board.answers[i] !== classifyBoard(h).ok).length : 0;
    return `<div class="proof-puzzle proof-sort">
      <div class="proof-roundbar">${pips(rounds, board.clean, `${board.clean} of ${rounds} clean rounds in a row`)}</div>
      <div class="proof-sort-grid">${board.boards.map((holes, i) => {
        const ok = classifyBoard(holes).ok, result = board.checked ? (board.answers[i] === ok ? ' right' : ' wrong') : '';
        return `<div class="proof-sort-card${result}">${miniBoard(holes, board.checked)}<p class="proof-reason">${board.checked ? caption(holes) : ''}</p><div class="proof-yesno">${[[true, '✓', 'Can be covered'], [false, '✗', 'Cannot be covered']].map(([value, mark, name]) => actionButton(mark, { type: 'answer', i, value }, `aria-pressed="${board.answers[i] === value}" aria-label="${name}: garden ${i + 1}" ${board.checked ? 'disabled' : ''}`)).join('')}</div></div>`;
      }).join('')}</div>
      <div class="proof-actions">${board.checked ? (solved ? '' : `<p class="proof-note" role="status">${wrong ? (wrong === 1 ? 'One is wrong.' : `${wrong} are wrong.`) : 'All six right.'}</p>${primaryButton(wrong ? 'New round' : 'Next round', { type: 'next' })}`) : primaryButton('Check', { type: 'check' }, board.answers.every(a => a !== null) ? '' : 'disabled')}</div>
    </div>`;
  },
  noUndo: () => true,
  reset: resetUI,
  demo: 'Mark each garden ✓ or ✗, then check once.'
};

/* ------------------------------------------------------------------ *
 * Duel: choose who starts, then win against perfect play. Three wins in
 * a row from new starts completes the puzzle.
 * ------------------------------------------------------------------ */
const nimSum = piles => piles.reduce((a, b) => a ^ b, 0);
const legal = piles => piles.flatMap((size, i) => Array.from({ length: size }, (_, k) => ({ pile: i + 1, remove: size - k })));
const after = (piles, m) => piles.map((size, i) => i === m.pile - 1 ? size - m.remove : size);
function opponentMove(piles, random) {
  const moves = legal(piles), winning = moves.filter(m => nimSum(after(piles, m)) === 0);
  const pickFrom = list => list[Math.min(list.length - 1, Math.floor(random() * list.length))];
  if (winning.length) return pickFrom(winning);
  // Losing: leave the fewest winning replies, then the most pebbles.
  let best = [], score = Infinity;
  for (const m of moves) {
    const rest = after(piles, m), s = legal(rest).filter(r => nimSum(after(rest, r)) === 0).length * 100 - rest.reduce((a, b) => a + b, 0);
    if (s < score) { score = s; best = [m]; } else if (s === score) best.push(m);
  }
  return pickFrom(best);
}
export function duelStart(q, random) {
  const all = [];
  const build = (prefix) => { if (prefix.length === q.piles) { all.push(prefix); return; } for (let n = 1; n <= q.max; n++) build([...prefix, n]); };
  build([]);
  const losing = random() < .5, pool = all.filter(p => (nimSum(p) === 0) === losing);
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
const duelOver = board => !board.piles.some(Boolean);
const duelWinner = board => duelOver(board) ? board.turns.at(-1)?.player : null;
function duelValid(p, board) {
  const q = p.parameters;
  if (!object(board) || !Array.isArray(board.start) || board.start.length !== q.piles || !board.start.every(n => integer(n) && n >= 1 && n <= q.max)) return false;
  if (![null, 'you', 'opponent'].includes(board.first) || !Array.isArray(board.turns) || !integer(board.streak) || board.streak < 0 || board.streak > q.streak || typeof board.fresh !== 'boolean') return false;
  if (board.first === null && board.turns.length) return false;
  let piles = [...board.start];
  for (const [i, t] of board.turns.entries()) {
    const expected = (i % 2 === 0) === (board.first === 'you') ? 'you' : 'opponent';
    if (!object(t) || t.player !== expected || !integer(t.pile) || t.pile < 1 || t.pile > q.piles || !integer(t.remove) || t.remove < 1 || t.remove > piles[t.pile - 1]) return false;
    piles = after(piles, t);
  }
  if (!Array.isArray(board.piles) || board.piles.length !== q.piles || !board.piles.every((n, i) => n === piles[i])) return false;
  // Saves land on the player's turn, at the start, or after the game.
  const toMove = board.turns.length % 2 === 0 ? board.first : (board.first === 'you' ? 'opponent' : 'you');
  return board.first === null || duelOver(board) || toMove === 'you';
}
function playOpponent(board, random) {
  if (duelOver(board)) return;
  const m = opponentMove(board.piles, random);
  board.turns.push({ player: 'opponent', ...m });
  board.piles = after(board.piles, m);
}
function settle(p, board) {
  if (!duelOver(board)) return;
  board.streak = duelWinner(board) === 'you' ? Math.min(p.parameters.streak, board.streak + (board.fresh ? 1 : 0)) : 0;
}
function duelMove(p, board, action, random = Math.random) {
  if (!duelValid(p, board) || !object(action) || board.streak >= p.parameters.streak) return null;
  const next = clone(board);
  if (action.type === 'choose') {
    if (board.first !== null || !['you', 'opponent'].includes(action.first)) return null;
    next.first = action.first;
    if (next.first === 'opponent') { playOpponent(next, random); settle(p, next); }
    return next;
  }
  if (action.type === 'take') {
    const m = { pile: index(action.pile), remove: index(action.remove) };
    if (board.first === null || duelOver(board) || !integer(m.pile) || m.pile < 1 || m.pile > board.piles.length || !integer(m.remove) || m.remove < 1 || m.remove > board.piles[m.pile - 1]) return null;
    next.turns.push({ player: 'you', ...m });
    next.piles = after(next.piles, m);
    playOpponent(next, random);
    settle(p, next);
    return next;
  }
  if ((action.type === 'new' || action.type === 'again') && duelOver(board) && board.first !== null) {
    if (action.type === 'again' && duelWinner(board) !== 'opponent') return null;
    const start = action.type === 'new' ? duelStart(p.parameters, random) : [...board.start];
    return { start, piles: [...start], first: null, turns: [], streak: board.streak, fresh: action.type === 'new' };
  }
  return null;
}
function duelHint(p, board) {
  if (!duelValid(p, board)) return { type: 'deadend', text: 'Restart the duel.' };
  if (board.streak >= p.parameters.streak) return { type: 'done' };
  if (board.first !== null && duelOver(board)) return { type: 'move', action: { type: 'new' }, text: 'Try a new start.' };
  return note();
}
function duelSolve(p, board) {
  if (board.first === null) {
    const losing = nimSum(board.piles) === 0;
    return { type: 'move', action: { type: 'choose', first: losing ? 'opponent' : 'you' }, text: losing ? 'Whoever moves first from these piles can be beaten. Let me start.' : 'From these piles the first player can always win. Go first.' };
  }
  if (duelOver(board)) return { type: 'move', action: { type: 'new' }, text: 'Try a new start.' };
  const sum = nimSum(board.piles);
  for (let i = 0; i < board.piles.length; i++) {
    const target = board.piles[i] ^ sum;
    if (sum && target < board.piles[i]) return { type: 'move', action: { type: 'take', pile: i + 1, remove: board.piles[i] - target }, text: `Take ${board.piles[i] - target} from pile ${i + 1}, leaving ${after(board.piles, { pile: i + 1, remove: board.piles[i] - target }).join(', ')}.` };
  }
  const i = board.piles.findIndex(Boolean);
  return { type: 'move', action: { type: 'take', pile: i + 1, remove: 1 }, text: `No winning move is left from here. Take 1 from pile ${i + 1} and watch for a mistake.` };
}
const duelSolveAction = (p, board) => duelSolve(p, board).action;
function duelRender(p, attempt) {
  const board = attempt.board, q = p.parameters, state = ui(p), over = duelOver(board), winner = duelWinner(board), solved = board.streak >= q.streak;
  const yourTurn = board.first !== null && !over;
  if (!yourTurn || !state.pick || state.pick.pile > board.piles.length || state.pick.from >= board.piles[state.pick.pile - 1]) state.pick = null;
  const last = board.turns.at(-1)?.player === 'opponent' ? board.turns.at(-1) : null;
  const ghost = last ? { pile: last.pile, count: last.remove } : null;
  const names = q.piles === 2 ? ['left', 'right'] : q.piles === 3 ? ['left', 'middle', 'right'] : Array.from({ length: q.piles }, (_, i) => `number ${i + 1}`);
  const status = board.first === null ? '' : over ? (winner === 'you' ? (solved || board.fresh ? 'You took the last pebble.' : 'You took the last pebble. Wins count from a new start.') : 'I took the last pebble.') :
    `${last ? `I took ${last.remove} from the ${names[last.pile - 1]} pile. ` : ''}Your turn`;
  const piles = board.piles.map((size, i) => {
    const shown = size + (ghost && ghost.pile === i + 1 ? ghost.count : 0);
    const pebbles = Array.from({ length: shown }, (_, k) => {
      if (k >= size) return '<span class="duel-pebble gone" aria-hidden="true"></span>';
      const take = size - k, lifted = state.pick && state.pick.pile === i + 1 && k >= state.pick.from;
      return `<button type="button" class="duel-pebble${lifted ? ' lift' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({ pick: { pile: i + 1, from: k } }))}" data-focus="duel-${i}-${k}" aria-label="Lift ${plural(take, 'pebble', 'pebbles')} from the ${names[i]} pile" aria-pressed="${Boolean(lifted)}" ${yourTurn ? '' : 'disabled'}></button>`;
    }).join('');
    return `<div class="duel-bowl" role="group" aria-label="${names[i]} pile, ${plural(size, 'pebble', 'pebbles')}"><div class="duel-pile">${pebbles}</div><span class="duel-base" aria-hidden="true"></span></div>`;
  }).join('');
  const takeCount = state.pick ? board.piles[state.pick.pile - 1] - state.pick.from : 0;
  return `<div class="proof-puzzle proof-duel">
    <div class="proof-roundbar">${pips(q.streak, board.streak, `${board.streak} of ${q.streak} wins in a row`)}</div>
    <p class="duel-status" role="status" tabindex="-1" data-focus="duel-status">${esc(status)}</p>
    <div class="duel-piles">${piles}</div>
    <div class="proof-actions">${board.first === null ? `${primaryButton('Me first', { type: 'choose', first: 'you' })}${actionButton('You first', { type: 'choose', first: 'opponent' })}` :
      over ? (solved ? '' : `${winner === 'opponent' ? actionButton('Same start again', { type: 'again' }) : ''}${primaryButton('New start', { type: 'new' })}`) :
      state.pick ? `${moveButton(`Take ${takeCount}`, { type: 'take', pile: state.pick.pile, remove: takeCount }, 'primary')}${uiButton('Cancel', { pick: null }, false)}` : ''}</div>
  </div>`;
}
const duel = {
  fresh: (p, random = Math.random) => { const start = duelStart(p.parameters, random); return { start, piles: [...start], first: null, turns: [], streak: 0, fresh: true }; },
  valid: duelValid,
  solved: (p, board) => duelValid(p, board) && board.streak >= p.parameters.streak,
  move: duelMove,
  hint: duelHint,
  solve: duelSolveAction,
  render: duelRender,
  noUndo: () => true,
  reset: resetUI,
  ui(p, payload) {
    const state = ui(p);
    if (object(payload) && payload.pick === null) state.pick = null;
    else if (object(payload) && object(payload.pick) && integer(payload.pick.pile) && integer(payload.pick.from)) {
      const same = state.pick && state.pick.pile === payload.pick.pile && state.pick.from === payload.pick.from;
      state.pick = same ? null : { pile: payload.pick.pile, from: payload.pick.from };
    }
  },
  demo: 'Choose who starts. Tap a pebble to lift it and those above it, then Take.'
};

export const proofMechanics = { proofgarden: garden, flipmap, sortgarden, duel };
