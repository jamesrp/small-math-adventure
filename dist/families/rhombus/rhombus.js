// Rhombus gardens (worksheet Week 1, the tiling lab). Boards are cut from the
// triangle grid; a blue rhombus covers an up triangle and the down triangle
// beside it. Four kinds of puzzle: fill a board (with rhombi, or with purple
// chevrons); fit the most rhombi and prove it with as many dots, so that no
// rhombus fits without covering a dot (König's theorem, the same count as
// Routes and roadblocks); find every way to fill a hexagon; and turn one
// tiling into another in the fewest flips, where a flip turns the three
// rhombi round a grid point and adds or takes away one cube. The maths is in
// lozenge.js, the grid in ../../tri-grid.js; see docs/rhombus/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, placements, triBoard, wireTri, insetPoints, piecePoints, corners} from '../../tri-grid.js';
import {sortPiece, pieceKey, tilingKey, piecesOf, maxPacking, minCover, openSpot, covers, flipAt, flipPoints, flipRoute, flipDistances, cornerTiling} from './lozenge.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const FLIP_LIMIT = 99;
export const PLAY_SIZES = [2, 3, 4];

// A hexagon with sides a, b, c, a, b, c along the grid, from [0, 0].
export function hexagon(a, b, c) {
  const out = [[0, 0]];
  let p = [0, 0];
  for (const [du, dv, n] of [[1, 0, a], [0, 1, b], [-1, 1, c], [-1, 0, a], [0, -1, b]]) { p = [p[0] + du * n, p[1] + dv * n]; out.push(p); }
  return out;
}
const playSpec = size => ({outline: hexagon(size, size, size), turn: true});
const specOf = (p, b) => p.parameters.mode === 'playground' ? playSpec(b.size) : p.parameters.board;
export const gridFor = (p, b) => gridOf(specOf(p, b));
const shapeOf = p => p.parameters.piece || 'rhombus';
const flipsOn = p => Boolean(p.parameters.flips) || p.parameters.mode === 'flip' || p.parameters.mode === 'playground';
const fitsOf = (g, shape) => new Set(placements(g, shape).map(pieceKey));
const covered = b => new Set(b.pieces.flat());
const full = (g, b) => covered(b).size === g.cells.length;

// Which face of a cube a rhombus draws: its down triangle sits beside,
// behind or below its up triangle.
export function faceOf(g, [a, b]) {
  const [up, down] = g.up[a] ? [g.cells[a], g.cells[b]] : [g.cells[b], g.cells[a]];
  if (down[0] === up[0] && down[1] === up[1]) return 0;
  return down[0] === up[0] - 1 ? 1 : 2;
}

// Selections: cells picked so far fit a free placement ('extendable'), are
// one ('complete'), or fit none ('blocked').
export function classify(g, shape, b, cells) {
  if (!cells.length || new Set(cells).size !== cells.length) return 'blocked';
  const taken = covered(b);
  if (cells.some(c => !integer(c) || c < 0 || c >= g.cells.length || taken.has(c))) return 'blocked';
  const free = placements(g, shape).filter(piece => piece.every(c => !taken.has(c)));
  if (free.some(piece => piece.length === cells.length && pieceKey(piece) === pieceKey(cells))) return 'complete';
  return free.some(piece => cells.every(c => piece.includes(c))) ? 'extendable' : 'blocked';
}

/* ------------------------------------------------------------------ *
 * Boards and moves
 * ------------------------------------------------------------------ */
function freshPuzzle(p) {
  const q = p.parameters, g = gridFor(p), start = (q.start || []).map(sortPiece);
  const found = q.mode === 'every' && start.length && start.flat().length === g.cells.length ? [tilingKey(start)] : [];
  return {pieces: start, dots: [], found, claimed: false, missed: false, flips: 0};
}
const room = size => cornerTiling(gridOf(playSpec(size)), size, size, size);
const freshPlay = (size = 3) => ({size, pieces: room(size)});

function validPieces(g, shape, pieces) {
  if (!Array.isArray(pieces) || pieces.length > g.cells.length) return false;
  const fit = fitsOf(g, shape), seen = new Set();
  for (const piece of pieces) {
    if (!Array.isArray(piece) || !piece.every(integer) || !fit.has(pieceKey(piece))) return false;
    for (const c of piece) { if (seen.has(c)) return false; seen.add(c); }
  }
  return true;
}
const validTiling = (g, key) => typeof key === 'string' && /^[0-9. ]+$/.test(key) && (() => { const t = piecesOf(key); return validPieces(g, 'rhombus', t) && t.flat().length === g.cells.length && tilingKey(t) === key; })();
const everyTiling = new Map();
export function tilingsOf(g) {
  const k = g.cells.length + ':' + g.pairs.join(';');
  if (!everyTiling.has(k)) everyTiling.set(k, covers(g).map(tilingKey));
  return everyTiling.get(k);
}

function validPuzzle(p, b) {
  const q = p.parameters, g = gridFor(p);
  if (!object(b) || !validPieces(g, shapeOf(p), b.pieces)) return false;
  if (!Array.isArray(b.dots) || !Array.isArray(b.found) || !['claimed', 'missed'].every(k => typeof b[k] === 'boolean') || !integer(b.flips)) return false;
  if (q.mode !== 'pack' && b.dots.length) return false;
  if (new Set(b.dots).size !== b.dots.length || !b.dots.every(c => integer(c) && c >= 0 && c < g.cells.length)) return false;
  if (q.mode === 'flip') {
    // Every board in a flip puzzle is a tiling reached from the start in
    // exactly this many flips: at least the fewest, and an even number more
    // (each flip adds or takes away one cube).
    if (!full(g, b) || b.flips < 0 || b.flips > FLIP_LIMIT) return false;
    const fewest = flipDistances(g, q.start).get(tilingKey(b.pieces));
    if (fewest === undefined || b.flips < fewest || (b.flips - fewest) % 2) return false;
  } else if (b.flips) return false;
  if (q.mode !== 'every') return !b.found.length && !b.claimed && !b.missed;
  if (b.found.length > tilingsOf(g).length || new Set(b.found).size !== b.found.length || !b.found.every(k => validTiling(g, k))) return false;
  if (full(g, b) && !b.found.includes(tilingKey(b.pieces))) return false;
  const all = b.found.length === tilingsOf(g).length;
  if ((b.claimed && !all) || (b.missed && all) || (b.claimed && b.missed)) return false;
  return true;
}
function solvedPuzzle(p, b) {
  if (!validPuzzle(p, b)) return false;
  const q = p.parameters, g = gridFor(p);
  if (q.mode === 'fill') return full(g, b);
  if (q.mode === 'pack') return full(g, b) || (b.pieces.length === b.dots.length && !openSpot(g, b.dots));
  if (q.mode === 'every') return b.claimed;
  return tilingKey(b.pieces) === tilingKey(q.goal) && b.flips <= q.budget;
}

// The board after a change of pieces. A filled board joins the found list.
function withPieces(p, b, pieces) {
  const next = {...b, pieces, missed: false};
  if (p.parameters.mode === 'every' && pieces.flat().length === gridFor(p).cells.length) {
    const key = tilingKey(pieces);
    if (!next.found.includes(key)) next.found = [...next.found, key];
  }
  return next;
}
function placeMove(g, shape, b, cells) {
  if (!Array.isArray(cells) || classify(g, shape, b, cells) !== 'complete') return null;
  return [...b.pieces, sortPiece(cells)];
}
function liftMove(b, cell) {
  if (!integer(cell)) return null;
  const k = b.pieces.findIndex(piece => piece.includes(cell));
  return k < 0 ? null : b.pieces.filter((_, i) => i !== k);
}
function movePuzzle(p, b, action) {
  if (!validPuzzle(p, b) || solvedPuzzle(p, b) || !object(action)) return null;
  const q = p.parameters, g = gridFor(p);
  switch (action.type) {
    case 'place': {
      if (q.mode === 'flip') return null;
      const pieces = placeMove(g, shapeOf(p), b, action.cells);
      return pieces && withPieces(p, b, pieces);
    }
    case 'lift': {
      if (q.mode === 'flip') return null;
      const pieces = liftMove(b, action.cell);
      return pieces && withPieces(p, b, pieces);
    }
    case 'clear': return q.mode === 'every' && b.pieces.length ? withPieces(p, b, []) : null;
    case 'dot': {
      if (q.mode !== 'pack' || !integer(action.cell) || action.cell < 0 || action.cell >= g.cells.length) return null;
      const dots = b.dots.includes(action.cell) ? b.dots.filter(c => c !== action.cell) : [...b.dots, action.cell];
      return {...b, dots};
    }
    case 'flip': {
      if (!flipsOn(p) || !integer(action.at)) return null;
      const pieces = flipAt(g, b.pieces, action.at);
      if (!pieces) return null;
      if (q.mode === 'flip') return b.flips >= FLIP_LIMIT ? null : {...b, pieces, flips: b.flips + 1};
      return withPieces(p, b, pieces);
    }
    case 'again': return q.mode === 'flip' && b.flips ? {...b, pieces: q.start.map(sortPiece), flips: 0} : null;
    case 'claim': {
      if (q.mode !== 'every' || b.missed) return null;
      return b.found.length === tilingsOf(g).length ? {...b, claimed: true} : {...b, missed: true};
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Hints: they keep as much of the child's work as an answer allows.
 * ------------------------------------------------------------------ */
const overlap = (pieces, target) => { const keys = new Set(target.map(pieceKey)); return pieces.filter(piece => keys.has(pieceKey(piece))).length; };
const placeHint = piece => ({type: 'move', action: {type: 'place', cells: piece}, text: 'Put a piece on the glowing triangles.'});
const liftHint = piece => ({type: 'move', action: {type: 'lift', cell: piece[0]}, text: 'Lift the glowing piece.'});
// Toward the nearest target (a list of pieces): lift a piece that is not in
// it, else place the next missing piece.
function toward(b, target) {
  const keys = new Set(target.map(pieceKey)), stray = [...b.pieces].reverse().find(piece => !keys.has(pieceKey(piece)));
  if (stray) return liftHint(stray);
  const have = new Set(b.pieces.map(pieceKey)), next = target.find(piece => !have.has(pieceKey(piece)));
  return next ? placeHint(next) : null;
}
const nearest = (b, targets) => [...targets].sort((x, y) => overlap(b.pieces, y) - overlap(b.pieces, x))[0];
function fillHint(p, b) {
  const g = gridFor(p), shape = shapeOf(p), go = covers(g, shape, 1, b.pieces)[0];
  return toward(b, go || nearest(b, covers(g, shape, 5000)));
}
// The most rhombi, keeping the child's own where a most packing allows.
function bestPacking(g, b) {
  const best = maxPacking(g).length, extend = pieces => { const more = maxPacking(g, new Set(pieces.flat())); return more.length + pieces.length === best ? [...pieces, ...more] : null; };
  const whole = extend(b.pieces);
  if (whole) return whole;
  for (let k = b.pieces.length - 1; k >= 0; k--) { const kept = extend(b.pieces.filter((_, i) => i !== k)); if (kept) return kept; }
  return maxPacking(g);
}
// Fewest dots, keeping the child's own where a fewest set allows: dots S
// extend to a fewest cover exactly when |S| plus a fewest cover of the spots
// S misses is the fewest.
function bestDots(g, dots) {
  const best = maxPacking(g).length, rest = s => minCover(g, new Set(s));
  if (dots.length + rest(dots).length === best) return {extra: null, add: rest(dots)[0]};
  const extra = [...dots].reverse().find(d => { const s = dots.filter(x => x !== d); return s.length + rest(s).length === best; });
  return {extra: extra ?? dots.at(-1), add: null};
}
function packHint(p, b) {
  const g = gridFor(p), best = maxPacking(g).length;
  if (b.pieces.length < best || (best * 2 === g.cells.length)) return {...toward(b, bestPacking(g, b)), tool: 'piece'};
  const {extra, add} = bestDots(g, b.dots);
  if (extra !== null && extra !== undefined) return {type: 'move', action: {type: 'dot', cell: extra}, tool: 'dot', text: 'Take the dot off the glowing triangle.'};
  return {type: 'move', action: {type: 'dot', cell: add}, tool: 'dot', text: 'Put a dot on the glowing triangle.'};
}
function everyHint(p, b) {
  const g = gridFor(p), all = tilingsOf(g), left = all.filter(k => !b.found.includes(k));
  if (!left.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
  if (flipsOn(p) && full(g, b)) {
    // Walk the flip map to the nearest tiling not yet found.
    let best = null;
    for (const k of left) { const route = flipRoute(g, b.pieces, piecesOf(k)); if (route && (!best || route.length < best.length)) best = route; }
    if (best?.length) return {type: 'move', action: {type: 'flip', at: best[0]}, text: 'Flip at the glowing point.'};
  }
  if (full(g, b)) return {type: 'move', action: {type: 'clear'}, text: 'Clear the board and build another.'};
  const targets = left.map(piecesOf), fits = targets.filter(t => overlap(b.pieces, t) === b.pieces.length);
  return toward(b, fits.length ? fits[0] : nearest(b, targets));
}
function flipHint(p, b) {
  const q = p.parameters, g = gridFor(p), route = flipRoute(g, b.pieces, q.goal);
  if (b.flips + route.length > q.budget) return {type: 'move', action: {type: 'again'}, text: `That is too many flips to reach ⚑ in ${q.budget}. Start again.`};
  return {type: 'move', action: {type: 'flip', at: route[0]}, text: 'Flip at the glowing point.'};
}
function hintPuzzle(p, b) {
  if (!validPuzzle(p, b)) return {type: 'deadend', text: 'Restart this puzzle.'};
  if (solvedPuzzle(p, b)) return {type: 'done'};
  const mode = p.parameters.mode;
  return mode === 'fill' ? fillHint(p, b) : mode === 'pack' ? packHint(p, b) : mode === 'every' ? everyHint(p, b) : flipHint(p, b);
}

/* ------------------------------------------------------------------ *
 * The playground: hexagons of side 2, 3 or 4, starting as an empty room.
 * ------------------------------------------------------------------ */
function validPlay(b) {
  return object(b) && PLAY_SIZES.includes(b.size) && validPieces(gridOf(playSpec(b.size)), 'rhombus', b.pieces);
}
function movePlay(b, action) {
  if (!validPlay(b) || !object(action)) return null;
  const g = gridOf(playSpec(b.size));
  // A size starts as an empty room; pressing the current size empties it again.
  if (action.type === 'size') return PLAY_SIZES.includes(action.size) && (action.size !== b.size || tilingKey(b.pieces) !== tilingKey(room(b.size))) ? freshPlay(action.size) : null;
  if (action.type === 'place') { const pieces = placeMove(g, 'rhombus', b, action.cells); return pieces && {...b, pieces}; }
  if (action.type === 'lift') { const pieces = liftMove(b, action.cell); return pieces && {...b, pieces}; }
  if (action.type === 'flip') { const pieces = integer(action.at) && flipAt(g, b.pieces, action.at); return pieces ? {...b, pieces} : null; }
  return null;
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
// View-only state: the tool (pack puzzles) and the triangles picked so far.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {tool: 'piece', pick: []}); return uiState.get(p.id); };
// Pieces new since the last drawing of this puzzle fade in; the first drawing shows all at once.
function newPieces(p, pieces) {
  const state = ui(p), keys = pieces.map(pieceKey), before = state.drawn;
  state.drawn = new Set(keys);
  return new Set(before ? keys.filter(k => !before.has(k)) : []);
}

// Accessible names: row from the top, place in the row, and which way it points.
const names = new WeakMap();
function cellName(g, i) {
  if (!names.has(g)) {
    const top = j => Math.round(Math.min(...corners(g.cells[j]).map(c => g.draw(c)[1])) * 2);
    const ys = [...new Set(g.cells.map((_, j) => top(j)))].sort((a, b) => a - b), row = j => ys.indexOf(top(j));
    const seen = new Map();
    names.set(g, g.cells.map((_, j) => { const r = row(j), k = (seen.get(r) || 0) + 1; seen.set(r, k); return `Row ${r + 1}, triangle ${k}, pointing ${g.turn ? (g.up[j] ? 'right' : 'left') : (g.up[j] ? 'up' : 'down')}`; }));
  }
  return names.get(g)[i];
}
const pieceName = (g, shape, piece) => `${shape === 'chevron' ? 'Chevron' : 'Rhombus'} on ${piece.map(c => cellName(g, c).toLowerCase()).join(' and ')}`;
const pieceLooks = (g, shape, pieces, extra = () => ({})) => pieces.map(piece => ({cells: piece, key: pieceKey(piece), cls: `${shape === 'chevron' ? 'rh-chevron' : `rh-face f${faceOf(g, piece)}`} ${extra(piece).cls || ''}`, act: extra(piece).act, label: extra(piece).label}));

// A small picture of a tiling (the goal card, the shelf of found tilings).
export const mini = (g, pieces, cls = '', label = 'Tiling') => triBoard(g, {cls: `rh-mini ${cls}`, label, picture: true, pieces: pieceLooks(g, 'rhombus', pieces)});
const pieceIcon = shape => {
  const g = gridOf({cells: shape === 'chevron' ? [[0, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 1, 1]] : [[0, 0, 0], [0, 0, 1]]});
  return triBoard(g, {cls: 'rh-icon', label: shape === 'chevron' ? 'Chevron' : 'Rhombus', picture: true, pieces: pieceLooks(g, shape, [g.cells.map((_, i) => i)])});
};
const dotIcon = '<svg class="rh-tool-icon" viewBox="0 0 22 22" aria-hidden="true"><polygon points="2,19 20,19 11,3.5" class="rh-icon-tri"/><circle cx="11" cy="13.5" r="3.3" class="rh-icon-dot"/></svg>';
const rhombusIcon = '<svg class="rh-tool-icon" viewBox="0 0 22 22" aria-hidden="true"><polygon points="1.5,17 11.5,17 20.5,5 10.5,5" class="rh-icon-rhombus"/></svg>';

function boardFor(p, a, g, opts) {
  const b = a.board, shape = opts.shape, pick = opts.pick || [], hint = opts.hint?.action, live = !opts.solved;
  const tool = opts.tool || 'piece', taken = covered(b), dots = new Set(b.dots || []);
  const free = live && tool === 'piece' && opts.place ? placements(g, shape).filter(piece => piece.every(c => !taken.has(c))) : [];
  const partners = new Set(pick.length ? free.filter(piece => pick.every(c => piece.includes(c))).flat().filter(c => !pick.includes(c)) : []);
  const hintCells = new Set(hint?.type === 'place' ? hint.cells : hint?.type === 'dot' ? [hint.cell] : []);
  const hintPiece = hint?.type === 'lift' ? b.pieces.find(piece => piece.includes(hint.cell)) : null;
  const cell = i => {
    const act = live && ((tool === 'dot') || (opts.place && tool === 'piece' && !taken.has(i)));
    const cls = [pick.includes(i) ? 'picked' : '', partners.has(i) ? 'partner' : '', hintCells.has(i) ? 'hinted' : ''].join(' ');
    const label = `${cellName(g, i)}${dots.has(i) ? ', dot' : ''}${pick.includes(i) ? ', picked' : ''}${tool === 'dot' ? (dots.has(i) ? '. Take the dot off' : '. Put a dot here') : ''}`;
    return {act, cls, label, dot: dots.has(i) ? (hint?.type === 'dot' && hint.cell === i ? 'hinted' : true) : false};
  };
  const pieces = pieceLooks(g, shape, b.pieces, piece => ({
    act: live && tool === 'piece' && opts.place,
    cls: `${hintPiece === piece ? 'hinted' : ''} ${opts.fresh?.has(pieceKey(piece)) ? 'fresh' : ''}`,
    label: `${pieceName(g, shape, piece)}. Lift it`
  }));
  // Where a flip can happen; in flip puzzles these are the only controls.
  const flipAts = live && opts.flips ? new Set(flipPoints(g, b.pieces)) : new Set();
  const point = k => flipAts.has(k) ? {act: true, cls: `rh-flip${hint?.type === 'flip' && hint.at === k ? ' hinted' : ''}`, label: 'Flip the three rhombi round this point'} : null;
  // A rhombus that would cover no dot, while dots are being placed.
  const open = live && tool === 'dot' && dots.size ? openSpot(g, b.dots) : null;
  const over = open ? piecePoints(g, open).map(points => `<polygon class="rh-open" points="${points}"/>`).join('') : '';
  const under = pick.map(i => `<polygon class="rh-pick" points="${insetPoints(g, i, .78)}"/>`).join('');
  return triBoard(g, {cls: `rh-board tool-${tool}${opts.solved ? ' solved' : ''}`, label: opts.label || 'Board', cell, pieces, point, over, under, stroke: live && tool === 'piece' && opts.place});
}

const toolButton = (id, icon, label, count, pressed, hinted) => `<button type="button" class="secondary rh-tool${hinted ? ' hinted' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({tool: id}))}" data-focus="rh-tool-${id}" aria-pressed="${pressed}" aria-label="${label}: ${count}">${icon}<span aria-hidden="true">${label}</span><b aria-hidden="true">${count}</b></button>`;
const moveButton = (label, action, cls = '', extra = '') => `<button type="button" class="secondary rh-action ${cls}" data-rh-move="${esc(JSON.stringify(action))}" data-focus="rh-${action.type}" ${extra}>${label}</button>`;

function renderPuzzle(p, a) {
  const q = p.parameters, b = a.board, g = gridFor(p), shape = shapeOf(p), solved = solvedPuzzle(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPuzzle(p, b) : null, h = hint?.action?.type;
  const state = ui(p), tool = q.mode === 'pack' ? state.tool : 'piece', place = q.mode !== 'flip';
  const pick = solved || tool !== 'piece' ? [] : state.pick.filter(c => !covered(b).has(c));
  const body = boardFor(p, a, g, {shape, pick, hint, solved, tool, place, flips: flipsOn(p), fresh: newPieces(p, b.pieces), label: q.mode === 'flip' ? 'Your tiling' : 'Board'});
  let top = '', bottom = '';
  if (q.mode === 'pack') {
    top = `<div class="rh-tools" role="group" aria-label="Tool">${toolButton('piece', rhombusIcon, 'Rhombi', b.pieces.length, tool === 'piece', hint?.tool === 'piece' && tool !== 'piece')}${toolButton('dot', dotIcon, 'Dots', b.dots.length, tool === 'dot', hint?.tool === 'dot' && tool !== 'dot')}</div>`;
  } else if (q.mode === 'fill' && !b.pieces.length) {
    top = `<p class="rh-prompt">${pieceIcon(shape)}<span>Drag across ${shape === 'chevron' ? 4 : 2} triangles</span></p>`;
  } else if (q.mode === 'flip') {
    const over = b.flips > q.budget;
    top = `<div class="rh-goalbar"><figure class="rh-goal" aria-label="Goal">${mini(g, q.goal, 'goal', 'Goal tiling')}<figcaption aria-hidden="true">⚑</figcaption></figure><p class="rh-counter" aria-label="Flips: ${b.flips} of ${q.budget}">Flips <strong class="${over ? 'over' : ''}">${b.flips}</strong> / ${q.budget}</p></div>`;
    bottom = solved ? '' : `<div class="rh-actions">${moveButton('Start again', {type: 'again'}, h === 'again' ? 'hinted' : '', b.flips ? '' : 'disabled')}</div>`;
  } else if (q.mode === 'every') {
    const here = full(g, b) ? b.found.indexOf(tilingKey(b.pieces)) : -1;
    const shelf = b.found.length ? `<ol class="rh-shelf" aria-label="Tilings found: ${b.found.length}">${b.found.map((k, i) => `<li class="${i === here ? 'here' : ''}">${mini(g, piecesOf(k), '', `Tiling ${i + 1}${i === here ? ', on the board' : ''}`)}</li>`).join('')}</ol>` : '';
    const actions = solved ? '' : `<div class="rh-actions">${moveButton('Clear', {type: 'clear'}, h === 'clear' ? 'hinted' : '', b.pieces.length ? '' : 'disabled')}${moveButton('That’s all', {type: 'claim'}, h === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '')}</div>`;
    bottom = `${actions}${b.missed ? '<p class="rh-note" role="status">There’s another.</p>' : ''}${shelf}`;
  }
  const gaps = g.cells.length - covered(b).size;
  const status = q.mode === 'pack' ? `${plural(b.pieces.length, 'rhombus', 'rhombi')}, ${plural(b.dots.length, 'dot', 'dots')}, ${plural(gaps, 'empty triangle', 'empty triangles')}.`
    : q.mode === 'flip' ? `${plural(b.flips, 'flip', 'flips')} of ${q.budget}${tilingKey(b.pieces) === tilingKey(q.goal) ? ', matches the goal' : ''}.`
    : q.mode === 'every' ? `${plural(b.found.length, 'tiling', 'tilings')} found.` : `${plural(gaps, 'empty triangle', 'empty triangles')}.`;
  return `<div class="rh-puzzle mode-${q.mode}${solved ? ' solved' : ''}" data-mechanic-wire="rhombus">${top}<div class="rh-stage">${body}</div>${bottom}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const sizeIcon = n => { const g = gridOf(playSpec(n)); return triBoard(g, {cls: 'rh-size-icon', label: `Hexagon of side ${n}`, picture: true}); };
function renderPlay(p, a) {
  const b = a.board, g = gridOf(playSpec(b.size)), state = ui(p), pick = state.pick.filter(c => !covered(b).has(c));
  const sizes = `<div class="rh-tools" role="group" aria-label="Board">${PLAY_SIZES.map(n => `<button type="button" class="secondary rh-tool rh-size" data-rh-move="${esc(JSON.stringify({type: 'size', size: n}))}" data-focus="rh-size-${n}" aria-pressed="${b.size === n}" aria-label="Hexagon of side ${n}">${sizeIcon(n)}</button>`).join('')}</div>`;
  const body = boardFor(p, a, g, {shape: 'rhombus', pick, tool: 'piece', place: true, flips: true, fresh: newPieces(p, b.pieces), label: 'Hexagon'});
  return `<div class="rh-puzzle mode-playground" data-mechanic-wire="rhombus">${sizes}<div class="rh-stage">${body}</div><p class="sr-only" role="status">${esc(`${plural(b.pieces.length, 'rhombus', 'rhombi')}.`)}</p></div>`;
}

function wire(root, p, api) {
  const play = p.parameters.mode === 'playground', state = ui(p);
  const b = () => api.attempt().board, g = () => gridFor(p, b()), shape = shapeOf(p);
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-rh-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    try { state.pick = []; api.apply(JSON.parse(control.dataset.rhMove)); } catch { /* malformed control data is ignored */ }
  });
  const place = cells => { state.pick = []; return {type: 'place', cells: sortPiece(cells)}; };
  wireTri(root, g(), {
    cell: i => {
      if (!play && p.parameters.mode === 'pack' && state.tool === 'dot') return {type: 'dot', cell: i};
      // Taps build a piece one triangle at a time; a triangle that cannot
      // join the piece so far starts a new one.
      const cells = state.pick.includes(i) ? state.pick.filter(c => c !== i) : [...state.pick, i];
      const status = classify(g(), shape, b(), cells);
      if (status === 'complete') return place(cells);
      const next = status === 'extendable' || !cells.length ? cells : classify(g(), shape, b(), [i]) === 'blocked' ? [] : [i];
      api.ui({pick: next});
      return null;
    },
    piece: key => { state.pick = []; const piece = b().pieces.find(x => pieceKey(x) === key); return piece ? {type: 'lift', cell: piece[0]} : null; },
    point: k => ({type: 'flip', at: k}),
    preview: cells => classify(g(), shape, b(), cells) === 'blocked' ? 'blocked' : 'ok',
    stroke: cells => classify(g(), shape, b(), cells) === 'complete' ? place(cells) : null
  }, api.apply);
}

export const rhombusMechanics = {
  rhombus: {
    fresh: p => p.parameters.mode === 'playground' ? freshPlay() : freshPuzzle(p),
    valid: (p, b) => p.parameters.mode === 'playground' ? validPlay(b) : validPuzzle(p, b),
    solved: (p, b) => p.parameters.mode === 'playground' ? false : solvedPuzzle(p, b),
    move: (p, b, action) => p.parameters.mode === 'playground' ? movePlay(b, action) : movePuzzle(p, b, action),
    hint: (p, b) => p.parameters.mode === 'playground' ? {type: 'done'} : hintPuzzle(p, b),
    render: (p, a) => p.parameters.mode === 'playground' ? renderPlay(p, a) : renderPuzzle(p, a),
    wire,
    ui(p, payload) {
      if (!object(payload)) return;
      if (['piece', 'dot'].includes(payload.tool)) { ui(p).tool = payload.tool; ui(p).pick = []; }
      if (Array.isArray(payload.pick) && payload.pick.every(integer)) ui(p).pick = payload.pick;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back a move but keeps the tilings already found.
    carry: (p, from, to) => p.parameters.mode !== 'every' || !object(to) ? to : {...to, found: [...to.found, ...from.found.filter(k => !to.found.includes(k))], missed: false},
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'rhombus',
  family: {id: 'rhombus', symbol: '◊'},
  mechanics: rhombusMechanics,
  pack: new URL('./rhombus.json', import.meta.url).href,
  css: new URL('./rhombus.css', import.meta.url).href,
  focus: '.tg-hit,.tg-point[role=button],.rh-tool,.rh-action:not([disabled])'
};
