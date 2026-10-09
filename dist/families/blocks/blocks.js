// The Week 1 encore (pattern blocks II) as three groups in Rhombus gardens,
// on boards cut from the shared triangle grid:
//   Rhombus duel (`blueduel`): the child and the app take turns laying a
//   rhombus, and a player with no room loses. The child first chooses who
//   starts; the app plays every board exactly, so a win means the child's
//   moves always left it lost. On a board that looks the same after a half
//   turn, copying wins.
//   Fewest blocks (`blockfill`): fill a board with triangles, rhombi,
//   trapezoids and hexagons using no more than so many pieces, on boards
//   where fitting the most hexagons first does not give the fewest.
//   Red trapezoids (`redfill`): fill boards with trapezoids or say it can't
//   be done, list every filling, count the two kinds (fixed on each board),
//   and come back to a filling in an odd number of re-cuts.
// The maths is in blockmath.js; see docs/blocks/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, placements, triBoard, wireTri, insetPoints, corners, SHAPES} from '../../tri-grid.js';
import {covers, piecesOf} from '../rhombus/lozenge.js';
import {BLOCKS, shapeOf, covered, sortPiece, pieceKey, tilingKey, openSpots, winningSpots, toMoveWins, halfTurn, turnedPiece, fillWithin, pointsDown, kindsOf, recut, hexagonPairs} from './blockmath.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const PATH_LIMIT = 99;
const NAME = {triangle: 'triangle', rhombus: 'rhombus', trapezoid: 'trapezoid', hexagon: 'hexagon'};
const NAMES = {triangle: 'triangles', rhombus: 'rhombi', trapezoid: 'trapezoids', hexagon: 'hexagons'};
const TITLE = {triangle: 'Triangle', rhombus: 'Rhombus', trapezoid: 'Trapezoid', hexagon: 'Hexagon'};

export const gridFor = p => gridOf(p.parameters.board);
const full = (g, pieces) => covered(pieces).size === g.cells.length;
const fitKeys = new WeakMap();
const fitsOf = (g, shape) => {
  if (!fitKeys.has(g)) fitKeys.set(g, new Map());
  const m = fitKeys.get(g);
  if (!m.has(shape)) m.set(shape, new Set(placements(g, shape).map(pieceKey)));
  return m.get(shape);
};
// Pieces are placements of the allowed shapes that never overlap.
function validPieces(g, shapes, pieces) {
  if (!Array.isArray(pieces) || pieces.length > g.cells.length) return false;
  const seen = new Set();
  for (const piece of pieces) {
    if (!Array.isArray(piece) || !piece.every(integer)) return false;
    const shape = shapeOf(piece);
    if (!shapes.includes(shape) || !fitsOf(g, shape).has(pieceKey(piece)) || piece.join() !== sortPiece(piece).join()) return false;
    for (const c of piece) { if (seen.has(c)) return false; seen.add(c); }
  }
  return true;
}
// Triangles picked so far fit a free placement of the shape ('extendable'),
// are one ('complete'), or fit none ('blocked').
export function classify(g, shape, pieces, cells) {
  if (!cells.length || new Set(cells).size !== cells.length) return 'blocked';
  const taken = covered(pieces);
  if (cells.some(c => !integer(c) || c < 0 || c >= g.cells.length || taken.has(c))) return 'blocked';
  const free = placements(g, shape).filter(piece => piece.every(c => !taken.has(c)));
  if (free.some(piece => piece.length === cells.length && pieceKey(piece) === pieceKey(cells))) return 'complete';
  return free.some(piece => cells.every(c => piece.includes(c))) ? 'extendable' : 'blocked';
}
const freeHexagonAt = (g, pieces, k) => {
  const ring = g.around[k], taken = covered(pieces);
  return ring.length === 6 && ring.every(c => !taken.has(c)) ? sortPiece(ring) : null;
};

/* ------------------------------------------------------------------ *
 * Names, pictures and buttons
 * ------------------------------------------------------------------ */
const names = new WeakMap();
function cellName(g, i) {
  if (!names.has(g)) {
    const top = j => Math.round(Math.min(...corners(g.cells[j]).map(c => g.draw(c)[1])) * 2);
    const ys = [...new Set(g.cells.map((_, j) => top(j)))].sort((a, b) => a - b), row = j => ys.indexOf(top(j));
    const seen = new Map();
    names.set(g, g.cells.map((_, j) => { const r = row(j), k = (seen.get(r) || 0) + 1; seen.set(r, k); return `Row ${r + 1}, triangle ${k}, pointing ${g.up[j] ? 'up' : 'down'}`; }));
  }
  return names.get(g)[i];
}
const pieceName = (g, piece, extra = '') => `${TITLE[shapeOf(piece)]}${extra} on ${piece.map(c => cellName(g, c).toLowerCase()).join(', ')}`;
const DOWN_CELLS = [[0, 0, 1], [1, 0, 0], [1, 0, 1]];
const iconGrid = cells => gridOf({cells});
const icon = (cells, cls, label) => { const g = iconGrid(cells); return triBoard(g, {cls: `bk-icon ${cls}`, label, picture: true, pieces: [{cells: g.cells.map((_, i) => i), cls: `bk-piece ${cls}`}]}); };
const shapeIcon = shape => icon(SHAPES[shape], `bk-${shape}`, TITLE[shape]);
const kindIcon = down => icon(down ? DOWN_CELLS : SHAPES.trapezoid, `bk-trapezoid${down ? ' down' : ''}`, down ? 'Two down' : 'Two up');
const moveButton = (label, action, cls = '', extra = '') => `<button type="button" class="secondary bk-action ${cls}" data-bk-move="${esc(JSON.stringify(action))}" data-focus="bk-${action.type}${action.first ? `-${action.first}` : ''}" ${extra}>${label}</button>`;
// A small picture of a filling (the shelf of fillings found).
const mini = (g, pieces, label) => triBoard(g, {cls: 'bk-mini', label, picture: true, pieces: pieces.map(piece => ({cells: piece, cls: pieceClass(g, piece)}))});
const pieceClass = (g, piece) => `bk-piece bk-${shapeOf(piece)}${piece.length === 3 && pointsDown(g, piece) ? ' down' : ''}`;

// View-only state: the chosen block, triangles picked so far, a chosen trapezoid.
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {tool: null, pick: [], sel: null}); return uiState.get(p.id); };
// Pieces new since the last drawing fade in; the first drawing shows all at once.
function newPieces(p, pieces) {
  const state = ui(p), keys = pieces.map(pieceKey), before = state.drawn;
  state.drawn = new Set(keys);
  return new Set(before ? keys.filter(k => !before.has(k)) : []);
}

// The board with pieces to lay: taps pick triangles (the ones that can join
// them glow), a hexagon can also go down by tapping its middle point.
function layBoard(p, g, pieces, opts) {
  const {shape, live, pick = [], hint, fresh = new Set(), looks = () => ({}), label = 'Board'} = opts;
  const taken = covered(pieces), place = live && shape;
  const free = place ? placements(g, shape).filter(piece => piece.every(c => !taken.has(c))) : [];
  const partners = new Set(pick.length ? free.filter(piece => pick.every(c => piece.includes(c))).flat().filter(c => !pick.includes(c)) : []);
  const hintCells = new Set(hint?.type === 'place' ? hint.cells : []);
  const hintPiece = hint?.type === 'lift' ? pieces.find(piece => piece.includes(hint.cell)) : null;
  const cell = i => ({
    act: place && !taken.has(i),
    cls: [pick.includes(i) ? 'picked' : '', partners.has(i) ? 'partner' : '', hintCells.has(i) ? 'hinted' : ''].join(' '),
    label: `${cellName(g, i)}${pick.includes(i) ? ', picked' : ''}`
  });
  const drawn = pieces.map(piece => {
    const extra = looks(piece);
    return {cells: piece, key: pieceKey(piece), act: extra.act ?? (live && opts.lift), label: extra.label || `${pieceName(g, piece)}. Lift it`,
      cls: `${pieceClass(g, piece)} ${extra.cls || ''} ${hintPiece === piece ? 'hinted' : ''} ${fresh.has(pieceKey(piece)) ? 'fresh' : ''}`};
  });
  const point = k => place && shape === 'hexagon' && freeHexagonAt(g, pieces, k) ? {act: true, cls: `bk-spot${hint?.type === 'place' && hint.cells.length === 6 && pieceKey(hint.cells) === pieceKey(g.around[k]) ? ' hinted' : ''}`, label: 'Put a hexagon round this point'} : null;
  const under = pick.map(i => `<polygon class="bk-pick" points="${insetPoints(g, i, .78)}"/>`).join('');
  return triBoard(g, {cls: `bk-board${opts.solved ? ' solved' : ''}`, label, cell, pieces: drawn, point, under, stroke: Boolean(place)});
}

/* ------------------------------------------------------------------ *
 * Rhombus duel
 * ------------------------------------------------------------------ */
const PLAYERS = ['you', 'app'];
const moverOf = b => (b.pieces.length % 2 === 0) === (b.first === 'you') ? 'you' : 'app';
const duelOver = (g, b) => b.first !== null && !openSpots(g, b.pieces).length;
// The player who laid the last rhombus wins: the other has no room.
const duelWinner = (g, b) => duelOver(g, b) && b.pieces.length ? (moverOf(b) === 'you' ? 'app' : 'you') : null;
function duelValid(p, b) {
  const g = gridFor(p);
  if (!object(b) || !(b.first === null || PLAYERS.includes(b.first)) || !validPieces(g, ['rhombus'], b.pieces)) return false;
  if (b.first === null) return b.pieces.length === 0;
  // Saves always land at the child's turn or at the end, and the app never
  // passed up a win: wherever it could win, its rhombus left the child lost.
  if (!duelOver(g, b) && moverOf(b) !== 'you') return false;
  for (let i = 0; i < b.pieces.length; i++) {
    const before = b.pieces.slice(0, i), mover = (i % 2 === 0) === (b.first === 'you') ? 'you' : 'app';
    if (!openSpots(g, before).some(s => pieceKey(s) === pieceKey(b.pieces[i]))) return false;
    if (mover === 'app' && toMoveWins(g, before) && toMoveWins(g, b.pieces.slice(0, i + 1))) return false;
  }
  return true;
}
// The app's rhombus: a winning one when it has one (the turn of the child's
// last rhombus if that wins, so copying shows), else any.
function appSpot(g, pieces, random) {
  const wins = winningSpots(g, pieces), last = pieces.at(-1), copy = last && turnedPiece(g, last);
  if (copy && wins.some(s => pieceKey(s) === pieceKey(copy))) return copy;
  const from = wins.length ? wins : openSpots(g, pieces);
  return from[Math.min(from.length - 1, Math.floor(random() * from.length))];
}
const withApp = (g, b, random) => duelOver(g, b) ? b : {...b, pieces: [...b.pieces, appSpot(g, b.pieces, random)]};
function duelMove(p, b, action, random = Math.random) {
  if (!duelValid(p, b) || duelSolved(p, b) || !object(action)) return null;
  const g = gridFor(p);
  if (action.type === 'choose') {
    if (b.first !== null || !PLAYERS.includes(action.first)) return null;
    const next = {first: action.first, pieces: []};
    return action.first === 'app' ? withApp(g, next, random) : next;
  }
  if (action.type === 'place') {
    if (b.first === null || duelOver(g, b) || !Array.isArray(action.cells) || classify(g, 'rhombus', b.pieces, action.cells) !== 'complete') return null;
    return withApp(g, {...b, pieces: [...b.pieces, sortPiece(action.cells)]}, random);
  }
  if (action.type === 'again') return duelWinner(g, b) === 'app' ? {first: null, pieces: []} : null;
  return null;
}
const duelSolved = (p, b) => duelValid(p, b) && duelWinner(gridFor(p), b) === 'you';
function duelHint(p, b) {
  if (!duelValid(p, b)) return {type: 'deadend', text: 'Restart this duel.'};
  if (duelSolved(p, b)) return {type: 'done'};
  const g = gridFor(p);
  if (b.first === null) {
    const first = toMoveWins(g, []);
    return {type: 'move', action: {type: 'choose', first: first ? 'you' : 'app'}, text: first ? 'Go first.' : 'Let me go first.'};
  }
  if (duelOver(g, b)) return {type: 'move', action: {type: 'again'}, text: 'Play again.'};
  const wins = winningSpots(g, b.pieces), last = b.pieces.at(-1), copy = last && turnedPiece(g, last);
  // On a board with an edge in the middle, the first rhombus covers that edge.
  const own = halfTurn(g) && wins.find(s => pieceKey(turnedPiece(g, s)) === pieceKey(s));
  const spot = (copy && wins.find(s => pieceKey(s) === pieceKey(copy))) || (!b.pieces.length && own) || wins[0];
  if (spot) return {type: 'move', action: {type: 'place', cells: spot}, text: 'Lay a rhombus on the glowing triangles.'};
  return {type: 'move', action: {type: 'place', cells: openSpots(g, b.pieces)[0]}, text: 'No rhombus wins from here. Undo and try another, or play this one out.'};
}
function duelRender(p, a) {
  const b = a.board, g = gridFor(p), solved = duelSolved(p, b), over = duelOver(g, b), winner = duelWinner(g, b);
  const hint = a.hintLevel >= 2 && !solved ? duelHint(p, b) : null, h = hint?.action;
  const yourTurn = b.first !== null && !over, state = ui(p), pick = yourTurn ? state.pick.filter(c => !covered(b.pieces).has(c)) : [];
  const mine = i => (i % 2 === 0) === (b.first === 'you');
  const lastApp = b.pieces.length && !mine(b.pieces.length - 1) ? b.pieces.length - 1 : -1;
  const looks = piece => { const i = b.pieces.indexOf(piece); return {act: false, cls: `${mine(i) ? 'you' : 'app'}${i === lastApp ? ' last' : ''}`, label: `${pieceName(g, piece)}, ${mine(i) ? 'yours' : 'mine'}`}; };
  const body = layBoard(p, g, b.pieces, {shape: yourTurn ? 'rhombus' : null, live: yourTurn, pick, hint: h, looks, fresh: newPieces(p, b.pieces), solved, label: 'Board'});
  const status = b.first === null ? 'Who goes first?' : winner === 'you' ? 'No room for my rhombus. You win!' : winner === 'app' ? 'No room for your rhombus. I win.' : lastApp >= 0 ? 'I laid the light rhombus. Your turn.' : 'Your turn.';
  const choose = b.first === null ? `<div class="bk-actions">${moveButton('Me first', {type: 'choose', first: 'you'}, `primary${h?.type === 'choose' && h.first === 'you' ? ' hinted' : ''}`)}${moveButton('You first', {type: 'choose', first: 'app'}, h?.type === 'choose' && h.first === 'app' ? 'hinted' : '')}</div>` : '';
  const again = winner === 'app' ? `<div class="bk-actions">${moveButton('Play again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '')}</div>` : '';
  return `<div class="bk-puzzle mode-duel${solved ? ' solved' : ''}" data-mechanic-wire="blocks"><p class="bk-status" role="status">${esc(status)}</p>${choose}<div class="bk-stage">${body}</div>${again}</div>`;
}

/* ------------------------------------------------------------------ *
 * Fewest blocks
 * ------------------------------------------------------------------ */
const shapesOf = p => p.parameters.shapes || BLOCKS;
const blockValid = (p, b) => object(b) && validPieces(gridFor(p), shapesOf(p), b.pieces);
const blockSolved = (p, b) => blockValid(p, b) && full(gridFor(p), b.pieces) && b.pieces.length <= p.parameters.budget;
function placePiece(g, shapes, pieces, cells) {
  if (!Array.isArray(cells) || !cells.every(integer)) return null;
  const shape = shapeOf(cells);
  return shape && shapes.includes(shape) && classify(g, shape, pieces, cells) === 'complete' ? [...pieces, sortPiece(cells)] : null;
}
function liftPiece(pieces, cell) {
  if (!integer(cell)) return null;
  const k = pieces.findIndex(piece => piece.includes(cell));
  return k < 0 ? null : pieces.filter((_, i) => i !== k);
}
function blockMove(p, b, action) {
  if (!blockValid(p, b) || blockSolved(p, b) || !object(action)) return null;
  const g = gridFor(p);
  if (action.type === 'place') { const pieces = placePiece(g, shapesOf(p), b.pieces, action.cells); return pieces && {pieces}; }
  if (action.type === 'lift') { const pieces = liftPiece(b.pieces, action.cell); return pieces && {pieces}; }
  if (action.type === 'clear') return b.pieces.length ? {pieces: []} : null;
  return null;
}
const placeHint = piece => ({type: 'move', action: {type: 'place', cells: piece}, tool: shapeOf(piece), text: `Put a ${NAME[shapeOf(piece)]} on the glowing triangles.`});
const liftHint = piece => ({type: 'move', action: {type: 'lift', cell: piece[0]}, text: 'Lift the glowing piece.'});
// The next piece of a fewest filling that keeps the child's pieces; when
// none does, lift the latest piece that a fewest filling can do without.
function blockHint(p, b) {
  if (!blockValid(p, b)) return {type: 'deadend', text: 'Restart this puzzle.'};
  if (blockSolved(p, b)) return {type: 'done'};
  const g = gridFor(p), budget = p.parameters.budget, shapes = shapesOf(p);
  const whole = fillWithin(g, b.pieces, budget, shapes);
  if (whole) {
    const have = new Set(b.pieces.map(pieceKey)), next = whole.filter(piece => !have.has(pieceKey(piece))).sort((x, y) => y.length - x.length)[0];
    return placeHint(next);
  }
  for (let k = b.pieces.length - 1; k >= 0; k--) if (fillWithin(g, b.pieces.filter((_, i) => i !== k), budget, shapes)) return liftHint(b.pieces[k]);
  return liftHint(b.pieces.at(-1));
}
const toolOf = (p, state) => shapesOf(p).includes(state.tool) ? state.tool : shapesOf(p)[0];
function blockRender(p, a) {
  const q = p.parameters, b = a.board, g = gridFor(p), solved = blockSolved(p, b), state = ui(p), tool = toolOf(p, state);
  const hint = a.hintLevel >= 2 && !solved ? blockHint(p, b) : null;
  const pick = solved ? [] : state.pick.filter(c => !covered(b.pieces).has(c));
  const count = shape => b.pieces.filter(piece => shapeOf(piece) === shape).length;
  const tools = `<div class="bk-tools" role="group" aria-label="Block">${shapesOf(p).map(s => `<button type="button" class="secondary bk-tool${hint?.tool === s && tool !== s ? ' hinted' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({tool: s}))}" data-focus="bk-tool-${s}" aria-pressed="${tool === s}" aria-label="${TITLE[s]}: ${count(s)}">${shapeIcon(s)}<b aria-hidden="true">${count(s)}</b></button>`).join('')}</div>`;
  const over = b.pieces.length > q.budget;
  const counter = `<p class="bk-counter" aria-label="Blocks: ${b.pieces.length} of ${q.budget}">Blocks <strong class="${over ? 'over' : ''}">${b.pieces.length}</strong> / ${q.budget}</p>`;
  const body = layBoard(p, g, b.pieces, {shape: solved ? null : tool, live: !solved, lift: true, pick, hint: hint?.action, fresh: newPieces(p, b.pieces), solved});
  const actions = solved ? '' : `<div class="bk-actions">${moveButton('Clear', {type: 'clear'}, '', b.pieces.length ? '' : 'disabled')}</div>`;
  const gaps = g.cells.length - covered(b.pieces).size;
  return `<div class="bk-puzzle mode-fewest${solved ? ' solved' : ''}" data-mechanic-wire="blocks">${tools}${counter}<div class="bk-stage">${body}</div>${actions}<p class="sr-only" role="status">${esc(`${plural(b.pieces.length, 'block', 'blocks')} of ${q.budget}, ${plural(gaps, 'empty triangle', 'empty triangles')}.`)}</p></div>`;
}

/* ------------------------------------------------------------------ *
 * Red trapezoids
 * ------------------------------------------------------------------ */
const RED = ['trapezoid'];
const redFillings = new WeakMap();
export function redsOf(g) {
  if (!redFillings.has(g)) redFillings.set(g, covers(g, 'trapezoid').map(tilingKey));
  return redFillings.get(g);
}
// Whether the task can be done: a filling exists (with this many pointing
// down, where a number is asked for; every filling of a board has the same).
export function redPossible(p) {
  const q = p.parameters, g = gridFor(p), one = covers(g, 'trapezoid', 1)[0];
  if (!one) return false;
  return q.mode === 'kind' ? kindsOf(g, one).down === q.down : true;
}
const flag = v => typeof v === 'boolean';
function redValid(p, b) {
  const q = p.parameters, g = gridFor(p);
  if (!object(b) || !validPieces(g, RED, b.pieces)) return false;
  if (q.mode === 'home') {
    const start = tilingKey(q.start);
    if (!Array.isArray(b.path) || !b.path.length || b.path.length > PATH_LIMIT + 1 || b.path[0] !== start || b.path.at(-1) !== tilingKey(b.pieces)) return false;
    // Each step is one re-cut of two trapezoids that make a hexagon.
    for (let i = 1; i < b.path.length; i++) {
      const from = piecesOf(b.path[i - 1]);
      if (!hexagonPairs(g, from).some(([x, y]) => tilingKey(recut(g, from, x, y)) === b.path[i])) return false;
    }
    return true;
  }
  if (q.mode === 'every') {
    const all = redsOf(g);
    if (!Array.isArray(b.found) || !flag(b.claimed) || !flag(b.missed) || new Set(b.found).size !== b.found.length || !b.found.every(k => all.includes(k))) return false;
    if (full(g, b.pieces) && !b.found.includes(tilingKey(b.pieces))) return false;
    const done = b.found.length === all.length;
    return !(b.claimed && !done) && !(b.missed && done) && !(b.claimed && b.missed);
  }
  if (!flag(b.cant) || !flag(b.refused)) return false;
  const possible = redPossible(p);
  return !(b.cant && possible) && !(b.refused && !possible) && !(b.cant && b.refused);
}
function redSolved(p, b) {
  if (!redValid(p, b)) return false;
  const q = p.parameters, g = gridFor(p);
  if (q.mode === 'home') return b.path.length > 1 && (b.path.length - 1) % 2 === 1 && b.path.at(-1) === b.path[0];
  if (q.mode === 'every') return b.claimed;
  if (b.cant) return true;
  return full(g, b.pieces) && (q.mode !== 'kind' || kindsOf(g, b.pieces).down === q.down);
}
// After a change of pieces: a full board joins the list; notes clear.
function withReds(p, b, pieces) {
  const q = p.parameters, g = gridFor(p);
  if (q.mode === 'every') {
    const next = {...b, pieces, missed: false}, key = tilingKey(pieces);
    if (full(g, pieces) && !next.found.includes(key)) next.found = [...next.found, key];
    return next;
  }
  return {...b, pieces, refused: false};
}
function redMove(p, b, action) {
  if (!redValid(p, b) || redSolved(p, b) || !object(action)) return null;
  const q = p.parameters, g = gridFor(p);
  if (q.mode === 'home') {
    if (action.type === 'recut') {
      if (b.path.length > PATH_LIMIT || typeof action.a !== 'string' || typeof action.b !== 'string') return null;
      const pieces = recut(g, b.pieces, action.a, action.b);
      return pieces && {pieces, path: [...b.path, tilingKey(pieces)]};
    }
    if (action.type === 'again') return b.path.length > 1 ? {pieces: q.start.map(sortPiece), path: [tilingKey(q.start)]} : null;
    return null;
  }
  switch (action.type) {
    case 'place': { const pieces = placePiece(g, RED, b.pieces, action.cells); return pieces && withReds(p, b, pieces); }
    case 'lift': { const pieces = liftPiece(b.pieces, action.cell); return pieces && withReds(p, b, pieces); }
    case 'clear': return b.pieces.length ? withReds(p, b, []) : null;
    case 'claim': {
      if (q.mode !== 'every' || b.missed) return null;
      return b.found.length === redsOf(g).length ? {...b, claimed: true} : {...b, missed: true};
    }
    case 'cant': {
      if (q.mode === 'every' || b.refused) return null;
      return redPossible(p) ? {...b, refused: true} : {...b, cant: true};
    }
  }
  return null;
}
// Toward a filling: lift a piece not in it, else place its next piece.
function toward(pieces, target) {
  const keys = new Set(target.map(pieceKey)), stray = [...pieces].reverse().find(piece => !keys.has(pieceKey(piece)));
  if (stray) return liftHint(stray);
  const have = new Set(pieces.map(pieceKey)), next = target.find(piece => !have.has(pieceKey(piece)));
  return next ? placeHint(next) : null;
}
const overlap = (pieces, target) => { const keys = new Set(target.map(pieceKey)); return pieces.filter(piece => keys.has(pieceKey(piece))).length; };
const nearest = (pieces, targets) => [...targets].sort((x, y) => overlap(pieces, y) - overlap(pieces, x))[0];
function redHint(p, b) {
  if (!redValid(p, b)) return {type: 'deadend', text: 'Restart this puzzle.'};
  if (redSolved(p, b)) return {type: 'done'};
  const q = p.parameters, g = gridFor(p);
  if (q.mode === 'home') {
    // Back to the start along the fewest re-cuts with an odd count.
    const route = homeRoute(g, b.pieces, b.path.length - 1, tilingKey(q.start));
    if (!route) return {type: 'move', action: {type: 'again'}, text: 'Start again.'};
    return {type: 'move', action: {type: 'recut', a: route[0], b: route[1]}, text: 'Re-cut the two glowing trapezoids.'};
  }
  if (q.mode !== 'every' && !redPossible(p)) return {type: 'move', action: {type: 'cant'}, text: q.mode === 'kind' ? `Count the triangles pointing up and pointing down. Can ${q.down} trapezoids point down?` : 'Count the triangles. Can trapezoids of three cover them all?'};
  if (q.mode === 'every') {
    const all = redsOf(g), left = all.filter(k => !b.found.includes(k));
    if (!left.length) return {type: 'move', action: {type: 'claim'}, text: 'You have found them all.'};
    if (full(g, b.pieces)) return {type: 'move', action: {type: 'clear'}, text: 'Clear the board and build another.'};
    const targets = left.map(piecesOf), fits = targets.filter(t => overlap(b.pieces, t) === b.pieces.length);
    return toward(b.pieces, fits.length ? fits[0] : nearest(b.pieces, targets));
  }
  const go = covers(g, 'trapezoid', 1, b.pieces)[0];
  return toward(b.pieces, go || nearest(b.pieces, covers(g, 'trapezoid', 2000)));
}
// The re-cuts from this filling back to `home`, as [key, key] for the next
// one, making the whole count odd; null when there is no such route.
function homeRoute(g, pieces, used, home) {
  // Search fillings paired with the parity of the steps taken so far.
  const want = (used + 1) % 2, first = `${tilingKey(pieces)}|0`;
  const seen = new Map([[first, null]]), queue = [[pieces, 0]];
  for (let i = 0; i < queue.length && seen.size < 5000; i++) {
    const [now, parity] = queue[i], at = `${tilingKey(now)}|${parity}`;
    if (i > 0 && tilingKey(now) === home && parity === want) {
      let step = seen.get(at);
      while (step.from !== first) step = seen.get(step.from);
      return step.pair;
    }
    for (const pair of hexagonPairs(g, now)) {
      const next = recut(g, now, ...pair), k = `${tilingKey(next)}|${parity ^ 1}`;
      if (!seen.has(k)) { seen.set(k, {from: at, pair}); queue.push([next, parity ^ 1]); }
    }
  }
  return null;
}
function redRender(p, a) {
  const q = p.parameters, b = a.board, g = gridFor(p), solved = redSolved(p, b), state = ui(p);
  const hint = a.hintLevel >= 2 && !solved ? redHint(p, b) : null, h = hint?.action;
  const kinds = kindsOf(g, b.pieces), home = q.mode === 'home';
  const tally = `<p class="bk-tally" aria-label="Two up: ${kinds.up}. Two down: ${kinds.down}."><span>${kindIcon(false)}<b>${kinds.up}</b></span><span>${kindIcon(true)}<b>${kinds.down}</b></span></p>`;
  let body, top = '', bottom = '';
  if (home) {
    const keys = new Set(b.pieces.map(pieceKey)), sel = keys.has(state.sel) ? state.sel : null, glow = h?.type === 'recut' ? [h.a, h.b] : [];
    const looks = piece => { const k = pieceKey(piece); return {act: !solved, cls: `${k === sel ? 'chosen' : ''} ${glow.includes(k) ? 'hinted' : ''}`, label: `${pieceName(g, piece, pointsDown(g, piece) ? ', two down' : ', two up')}${k === sel ? ', chosen' : ''}`}; };
    body = layBoard(p, g, b.pieces, {shape: null, live: !solved, looks, fresh: newPieces(p, b.pieces), solved});
    const moves = b.path.length - 1, there = b.path.at(-1) === b.path[0];
    top = `<div class="bk-goalbar"><figure class="bk-goal" aria-label="Start">${mini(g, piecesOf(b.path[0]), 'The start')}<figcaption aria-hidden="true">⚑</figcaption></figure><p class="bk-counter" aria-label="Moves: ${moves}${there && moves ? ', back at the start' : ''}">Moves <strong>${moves}</strong></p></div>`;
    bottom = `${state.note ? `<p class="bk-note" role="status">${esc(state.note)}</p>` : ''}${solved ? '' : `<div class="bk-actions">${moveButton('Start again', {type: 'again'}, h?.type === 'again' ? 'hinted' : '', moves ? '' : 'disabled')}</div>`}`;
  } else {
    const pick = solved ? [] : state.pick.filter(c => !covered(b.pieces).has(c));
    body = layBoard(p, g, b.pieces, {shape: solved ? null : 'trapezoid', live: !solved, lift: true, pick, hint: h, fresh: newPieces(p, b.pieces), solved});
    if (q.mode === 'every') {
      const here = full(g, b.pieces) ? b.found.indexOf(tilingKey(b.pieces)) : -1;
      const shelf = b.found.length ? `<ol class="bk-shelf" aria-label="Fillings found: ${b.found.length}">${b.found.map((k, i) => `<li class="${i === here ? 'here' : ''}">${mini(g, piecesOf(k), `Filling ${i + 1}${i === here ? ', on the board' : ''}`)}</li>`).join('')}</ol>` : '';
      bottom = `${solved ? '' : `<div class="bk-actions">${moveButton('Clear', {type: 'clear'}, h?.type === 'clear' ? 'hinted' : '', b.pieces.length ? '' : 'disabled')}${moveButton('That’s all', {type: 'claim'}, h?.type === 'claim' ? 'hinted' : '', b.missed ? 'disabled' : '')}</div>`}${b.missed ? '<p class="bk-note" role="status">There’s another.</p>' : ''}${shelf}`;
    } else {
      bottom = `${solved ? '' : `<div class="bk-actions">${moveButton('Clear', {type: 'clear'}, '', b.pieces.length ? '' : 'disabled')}${moveButton('Can’t', {type: 'cant'}, h?.type === 'cant' ? 'hinted' : '', b.refused ? 'disabled' : '')}</div>`}${b.refused ? '<p class="bk-note" role="status">It can be done.</p>' : ''}`;
    }
  }
  const status = home ? `${plural(b.path.length - 1, 'move', 'moves')}.` : q.mode === 'every' ? `${plural(b.found.length, 'filling', 'fillings')} found.` : `${plural(g.cells.length - covered(b.pieces).size, 'empty triangle', 'empty triangles')}.`;
  return `<div class="bk-puzzle mode-${q.mode}${solved ? ' solved' : ''}" data-mechanic-wire="blocks">${top}${tally}<div class="bk-stage">${body}</div>${bottom}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

/* ------------------------------------------------------------------ *
 * Wiring: taps and strokes lay pieces; buttons make moves.
 * ------------------------------------------------------------------ */
function wire(root, p, api) {
  const state = ui(p), g = gridFor(p), mech = p.mechanic, q = p.parameters;
  const pieces = () => api.attempt().board.pieces;
  const shape = () => mech === 'blueduel' ? 'rhombus' : mech === 'redfill' ? 'trapezoid' : toolOf(p, state);
  const allowed = mech === 'blockfill' ? shapesOf(p) : [shape()];
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-bk-move]');
    if (!control || !root.contains(control) || control.disabled) return;
    try { state.pick = []; state.sel = null; state.note = ''; api.apply(JSON.parse(control.dataset.bkMove)); } catch { /* malformed control data is ignored */ }
  });
  const place = cells => { state.pick = []; return {type: 'place', cells: sortPiece(cells)}; };
  // A stroke lays the piece its triangles make: the chosen block, or another allowed block of that size.
  const strokeShape = cells => [shape(), ...allowed].find(s => classify(g, s, pieces(), cells) === 'complete');
  wireTri(root, g, {
    cell: i => {
      // Taps build a piece one triangle at a time; a triangle that cannot
      // join the piece so far starts a new one.
      const cells = state.pick.includes(i) ? state.pick.filter(c => c !== i) : [...state.pick, i];
      const status = classify(g, shape(), pieces(), cells);
      if (status === 'complete') return place(cells);
      const next = status === 'extendable' || !cells.length ? cells : classify(g, shape(), pieces(), [i]) === 'blocked' ? [] : [i];
      api.ui({pick: next});
      return null;
    },
    piece: key => {
      state.pick = [];
      const piece = pieces().find(x => pieceKey(x) === key);
      if (!piece) return null;
      if (q.mode !== 'home') return {type: 'lift', cell: piece[0]};
      // Re-cuts: choose one trapezoid, then another that makes a hexagon with it.
      if (!state.sel || state.sel === key || !pieces().some(x => pieceKey(x) === state.sel)) { api.ui({sel: state.sel === key ? null : key, note: ''}); return null; }
      const action = {type: 'recut', a: state.sel, b: key};
      if (!recut(g, pieces(), state.sel, key)) { api.ui({sel: key, note: 'Those two don’t make a hexagon.'}); return null; }
      state.sel = null; state.note = '';
      return action;
    },
    point: k => { const hex = freeHexagonAt(g, pieces(), k); return hex ? place(hex) : null; },
    preview: cells => allowed.some(s => classify(g, s, pieces(), cells) !== 'blocked') ? 'ok' : 'blocked',
    stroke: cells => { const s = strokeShape(cells); if (!s) return null; if (s !== shape() && mech === 'blockfill') state.tool = s; return place(cells); }
  }, api.apply);
}

const common = {
  wire,
  ui(p, payload) {
    if (!object(payload)) return;
    const state = ui(p);
    if (BLOCKS.includes(payload.tool)) { state.tool = payload.tool; state.pick = []; }
    if (Array.isArray(payload.pick) && payload.pick.every(integer)) state.pick = payload.pick;
    if (payload.sel === null || typeof payload.sel === 'string') state.sel = payload.sel;
    if (typeof payload.note === 'string') state.note = payload.note;
  },
  reset: p => { uiState.delete(p.id); }
};
export const blockMechanics = {
  blueduel: {
    ...common,
    fresh: () => ({first: null, pieces: []}),
    valid: duelValid, solved: duelSolved, move: duelMove, hint: duelHint, render: duelRender,
    demo: 'Choose who goes first. Then take turns laying a rhombus on two empty triangles. If there is no room for your rhombus on your turn, you lose.'
  },
  blockfill: {
    ...common,
    fresh: () => ({pieces: []}),
    valid: blockValid, solved: blockSolved, move: blockMove, hint: blockHint, render: blockRender,
    demo: 'Choose a block, then drag across its triangles or tap them one at a time. A hexagon can also go down by tapping the dot in its middle. Tap a block to lift it.'
  },
  redfill: {
    ...common,
    fresh: p => p.parameters.mode === 'home' ? {pieces: p.parameters.start.map(sortPiece), path: [tilingKey(p.parameters.start)]}
      : p.parameters.mode === 'every' ? {pieces: [], found: [], claimed: false, missed: false} : {pieces: [], cant: false, refused: false},
    valid: redValid, solved: redSolved, move: redMove, hint: redHint, render: redRender,
    // Undo takes back a move but keeps the fillings already found.
    carry: (p, from, to) => p.parameters.mode !== 'every' || !object(to) ? to : {...to, found: [...to.found, ...from.found.filter(k => !to.found.includes(k))], missed: false},
    demo: 'Drag across three triangles to lay a trapezoid, or tap them one at a time. Tap a trapezoid to lift it.'
  }
};

// The family seam entry (dist/families.js). The puzzles join Rhombus gardens
// as its Rhombus duel, Fewest blocks and Red trapezoids groups, so the
// module adds no satchel family.
export default {
  id: 'blocks',
  mechanics: blockMechanics,
  pack: new URL('./blocks.json', import.meta.url).href,
  css: new URL('./blocks.css', import.meta.url).href,
  focus: '.tg-hit,.tg-point[role=button],.bk-tool,.bk-action:not([disabled])'
};
