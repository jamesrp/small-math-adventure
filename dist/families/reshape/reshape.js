// Missing square, a group in Tile gardens (worksheet Week 93, squaring a
// rectangle). A paper shape sits above a grid; the child cuts it with
// straight cuts along grid lines (as many as the scissors allow) and drags
// and turns the pieces onto the grid below.
//
// - Square: an a by b rectangle and its average-side square, side
//   (a + b)/2. Fit every piece in the square so that what is left uncovered
//   is one square (it always has side (b − a)/2). Harder puzzles mark where
//   the uncovered square must be; there Can't is certified by squares that
//   each need a piece of their own, more of them than the cuts make pieces.
// - Rebuild: the square with its missing corner. Cut it and make every
//   rectangle you can from all the pieces, then That's all.
// The mathematics is in cutmath.js and docs/reshape/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, cellAt, UNIT} from '../../sq-grid.js';
import {
  cellKey, turnCells, canonTurn, sizeOf, rectOf, rectCells, rectKey, keyRect, startCells,
  splitBy, linesOf, lineSpan, cutReachable, cover, partitions, shareable, apart
} from './cutmath.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
const keysAre = (b, list) => object(b) && Object.keys(b).sort().join() === [...list].sort().join();
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
export const MODES = ['square', 'rebuild'];

/* --------------------------------------------------------------------- *
 * Geometry: the shape at the top, the grid below, one board
 * --------------------------------------------------------------------- */
const geometries = new Map();
export function geometry(q) {
  const key = JSON.stringify([q.home, q.mat, q.hole || null]);
  if (geometries.has(key)) return geometries.get(key);
  const home = startCells(q.home);
  const W = Math.max(q.home.w, q.mat.cols), hx = Math.floor((W - q.home.w) / 2), mx = Math.floor((W - q.mat.cols) / 2), my = q.home.h + 1;
  const g = gridOf({cols: W, rows: my + q.mat.rows, cells: [...home.map(([x, y]) => [hx + x, y]), ...rectCells(mx, my, q.mat.cols, q.mat.rows)]});
  const homeIndex = new Map(home.map((c, i) => [cellKey(c), i]));
  const where = g.cells.map(([x, y]) => y < q.home.h ? {home: homeIndex.get(cellKey([x - hx, y]))} : {mat: [x - mx, y - my]});
  const hole = q.hole ? rectCells(q.hole[0], q.hole[1], q.hole[2], q.hole[2]) : [];
  const holeSet = new Set(hole.map(cellKey));
  const region = rectCells(0, 0, q.mat.cols, q.mat.rows).filter(c => !holeSet.has(cellKey(c)));
  // The start shape and the grid are drawn as two boards, each scaled to
  // fit on its own (gh, gm); `g` numbers the squares of both for taps and
  // slides. A square of gh has the number of its home square.
  const gh = gridOf({cols: q.home.w, rows: q.home.h, cells: home.map(c => [c[0], c[1]])});
  const gm = gridOf({cols: q.mat.cols, rows: q.mat.rows});
  const G = {
    home, W, hx, mx, my, g, gh, gm, where, hole, holeSet, region,
    ofHome: i => g.at(hx + home[i][0], home[i][1]),
    ofMat: ([x, y]) => g.at(mx + x, my + y)
  };
  geometries.set(key, G);
  return G;
}
const shapeOf = (G, piece) => piece.cells.map(i => G.home[i]);
// A placed piece's squares on the grid, in the order of its home squares.
export function footprint(G, piece, at = piece.at) {
  if (!at) return null;
  const [x, y, r] = at;
  return turnCells(shapeOf(G, piece), r).map(([u, v]) => [x + u, y + v]);
}
const inMat = (q, [x, y]) => x >= 0 && y >= 0 && x < q.mat.cols && y < q.mat.rows;
const pieceById = (b, id) => b.pieces.find(piece => piece.cells[0] === id);
// The squares of the grid covered, except by one piece.
function covered(G, b, except = null) {
  const out = new Set();
  for (const piece of b.pieces) if (piece.at && piece.cells[0] !== except) footprint(G, piece).forEach(c => out.add(cellKey(c)));
  return out;
}
// Whether a piece can sit at [x, y, r]: on the grid, off the marked square,
// clear of the other pieces.
function fitsAt(q, G, b, piece, at) {
  const cells = footprint(G, piece, at), taken = covered(G, b, piece.cells[0]);
  return cells.every(c => inMat(q, c) && !G.holeSet.has(cellKey(c)) && !taken.has(cellKey(c)));
}
const allPlaced = b => b.pieces.every(piece => piece.at);
const tried = b => b.pieces.length > 1 || b.pieces.some(piece => piece.at);
const cutsLeft = (q, b) => q.cuts - (b.pieces.length - 1);
// The uncovered squares of the grid.
function uncovered(q, G, b) {
  const taken = covered(G, b);
  return rectCells(0, 0, q.mat.cols, q.mat.rows).filter(c => !taken.has(cellKey(c)));
}
// The rectangle every piece makes on the grid, as "6x2", or null.
function madeRect(G, b) {
  if (!allPlaced(b)) return null;
  const r = rectOf(b.pieces.flatMap(piece => footprint(G, piece)));
  return r ? rectKey(r[2], r[3]) : null;
}

/* --------------------------------------------------------------------- *
 * Boards
 * --------------------------------------------------------------------- */
// square: {pieces, claim}   rebuild: {pieces, found, no, done}
// `pieces` lists each piece as its home squares (indices into the start
// shape, in reading order) and where it sits on the grid, [x, y, r] (the
// turned shape's top-left corner and its quarter turns) or null at home,
// in order of first square. A piece is named by its first square. `claim`
// is the squares tapped for an accepted Can't. `found` lists the
// rectangles made ("6x2"), `no` says That's all was refused while the shelf
// is as it is, `done` that it was accepted.
function fresh(p) {
  const q = p.parameters, pieces = [{cells: startCells(q.home).map((_, i) => i), at: null}];
  return q.mode === 'square' ? {pieces, claim: null} : {pieces, found: [], no: false, done: false};
}
function piecesOk(q, G, pieces) {
  if (!Array.isArray(pieces) || !pieces.length || pieces.length - 1 > q.cuts) return false;
  const seen = new Set();
  for (const piece of pieces) {
    if (!keysAre(piece, ['cells', 'at']) || !Array.isArray(piece.cells) || !piece.cells.length) return false;
    if (!piece.cells.every((i, k) => int(i) && i >= 0 && i < G.home.length && !seen.has(i) && (k === 0 || i > piece.cells[k - 1]))) return false;
    piece.cells.forEach(i => seen.add(i));
  }
  if (seen.size !== G.home.length || !pieces.every((piece, k) => k === 0 || piece.cells[0] > pieces[k - 1].cells[0])) return false;
  if (!cutReachable(G.home, pieces.map(piece => shapeOf(G, piece)))) return false;
  const taken = new Set();
  for (const piece of pieces) {
    if (piece.at === null) continue;
    if (!Array.isArray(piece.at) || piece.at.length !== 3 || !piece.at.every(int)) return false;
    const [, , r] = piece.at;
    if (r < 0 || r > 3 || canonTurn(shapeOf(G, piece), r) !== r) return false;
    for (const c of footprint(G, piece)) {
      const k = cellKey(c);
      if (!inMat(q, c) || G.holeSet.has(k) || taken.has(k)) return false;
      taken.add(k);
    }
  }
  return true;
}
function valid(p, b) {
  const q = p.parameters, G = geometry(q);
  if (!object(b)) return false;
  if (q.mode === 'square') {
    if (!keysAre(b, ['pieces', 'claim']) || !piecesOk(q, G, b.pieces)) return false;
    if (b.claim === null) return true;
    return Boolean(q.cant) && tried(b) && Array.isArray(b.claim) && b.claim.length === q.cuts + 2 && b.claim.every(c => Array.isArray(c) && c.length === 2 && c.every(int)) &&
      same(b.claim, [...b.claim].sort((u, v) => u[1] - v[1] || u[0] - v[0])) && apart(G.region, b.claim);
  }
  if (!keysAre(b, ['pieces', 'found', 'no', 'done']) || !piecesOk(q, G, b.pieces)) return false;
  if (!Array.isArray(b.found) || !b.found.every(k => q.answers.includes(k)) || new Set(b.found).size !== b.found.length) return false;
  if (typeof b.no !== 'boolean' || typeof b.done !== 'boolean' || (b.no && b.done)) return false;
  const all = q.answers.every(k => b.found.includes(k));
  if ((b.no && (all || !b.found.length)) || (b.done && !all)) return false;
  // A rectangle on the grid is kept the moment it is made.
  const made = madeRect(G, b);
  return !made || b.found.includes(made);
}
function solved(p, b) {
  const q = p.parameters, G = geometry(q);
  if (!valid(p, b)) return false;
  if (q.mode === 'rebuild') return b.done;
  if (b.claim) return true;
  if (!allPlaced(b)) return false;
  const left = uncovered(q, G, b), r = rectOf(left);
  if (q.hole) return same(left.map(cellKey).sort(), G.hole.map(cellKey).sort());
  return Boolean(r) && r[2] === r[3];
}

/* --------------------------------------------------------------------- *
 * Moves
 * --------------------------------------------------------------------- */
// put {piece, x, y, r}, home {piece}, cut {piece, dir, k} (a grid line of
// the start shape, across a piece at the top), tape, cant {cells}, all.
const order = pieces => [...pieces].sort((u, v) => u.cells[0] - v.cells[0]);
// Pieces are cut at the top, before they go on the grid.
function cutPiece(q, G, b, action) {
  const piece = pieceById(b, action.piece);
  if (!piece || piece.at || cutsLeft(q, b) < 1 || !['h', 'v'].includes(action.dir) || !int(action.k)) return null;
  const parts = splitBy(shapeOf(G, piece), action.dir, action.k);
  if (!parts) return null;
  const halves = parts.map(list => ({cells: list.map(j => piece.cells[j]), at: null}));
  return {...b, pieces: order([...b.pieces.filter(other => other !== piece), ...halves])};
}
function move(p, b, action) {
  const q = p.parameters, G = geometry(q);
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null, chosen = null;
  if (action.type === 'put') {
    const piece = pieceById(b, action.piece), at = [action.x, action.y, action.r];
    if (piece && at.every(int) && action.r >= 0 && action.r <= 3 && canonTurn(shapeOf(G, piece), action.r) === action.r && !same(piece.at, at) && fitsAt(q, G, b, piece, at)) {
      next = {...b, pieces: b.pieces.map(other => other === piece ? {...piece, at} : other)};
      chosen = piece.cells[0];
      if (q.mode === 'rebuild') {
        const made = madeRect(G, next);
        if (made && !next.found.includes(made)) next = {...next, found: [...next.found, made], no: false};
      }
    }
  } else if (action.type === 'home') {
    const piece = pieceById(b, action.piece);
    if (piece?.at) next = {...b, pieces: b.pieces.map(other => other === piece ? {...piece, at: null} : other)};
  } else if (action.type === 'cut') next = cutPiece(q, G, b, action);
  else if (action.type === 'tape') {
    if (tried(b)) { next = {...b, pieces: fresh(p).pieces}; chosen = 0; }
  } else if (action.type === 'cant' && q.mode === 'square' && q.cant) {
    const cells = Array.isArray(action.cells) ? action.cells.map(c => Array.isArray(c) ? [...c] : c).sort((u, v) => u[1] - v[1] || u[0] - v[0]) : null;
    if (cells && tried(b) && cells.length === q.cuts + 2 && cells.every(c => Array.isArray(c) && c.length === 2 && c.every(int)) && apart(G.region, cells)) next = {...b, claim: cells};
  } else if (action.type === 'all' && q.mode === 'rebuild') {
    if (b.found.length && !b.no) next = q.answers.every(k => b.found.includes(k)) ? {...b, done: true} : {...b, no: true};
  }
  if (next) Object.assign(ui(p), blankView(), {chosen});
  return next;
}

/* --------------------------------------------------------------------- *
 * Where a tap, a turn or a slide puts a piece
 * --------------------------------------------------------------------- */
// A tap on the grid: the chosen piece's top-left corner there, kept on the
// grid; as it is turned now if it fits, else another way round.
export function spotFor(q, G, b, piece, [cx, cy]) {
  const shape = shapeOf(G, piece), now = piece.at ? piece.at[2] : 0;
  const turns = [0, 1, 2, 3].map(k => canonTurn(shape, now + k)).filter((r, i, list) => list.indexOf(r) === i);
  for (const r of turns) {
    const [w, h] = sizeOf(turnCells(shape, r));
    const at = [Math.max(0, Math.min(cx, q.mat.cols - w)), Math.max(0, Math.min(cy, q.mat.rows - h)), r];
    if (fitsAt(q, G, b, piece, at) && !same(at, piece.at)) return at;
  }
  return null;
}
// A quarter turn where it sits: kept at one of its corners and on the grid.
export function turnSpot(q, G, b, piece) {
  if (!piece?.at) return null;
  const shape = shapeOf(G, piece), [x, y, r] = piece.at, next = canonTurn(shape, r + 1);
  if (next === r) return null;
  const [w, h] = sizeOf(turnCells(shape, r)), [w2, h2] = sizeOf(turnCells(shape, next));
  for (const [ax, ay] of [[x, y], [x + w - w2, y], [x, y + h - h2], [x + w - w2, y + h - h2]]) {
    const at = [Math.max(0, Math.min(ax, q.mat.cols - w2)), Math.max(0, Math.min(ay, q.mat.rows - h2)), next];
    if (fitsAt(q, G, b, piece, at)) return at;
  }
  return null;
}
// Turn for a piece at the top: it comes onto the grid turned a quarter, at
// the first place (reading order) where it fits turned.
export function homeTurnSpot(q, G, b, piece) {
  if (!piece || piece.at) return null;
  const shape = shapeOf(G, piece), r = canonTurn(shape, 1);
  if (r === 0) return null;
  const [w, h] = sizeOf(turnCells(shape, r));
  for (let y = 0; y + h <= q.mat.rows; y++) for (let x = 0; x + w <= q.mat.cols; x++) if (fitsAt(q, G, b, piece, [x, y, r])) return [x, y, r];
  return null;
}
// A slide from a square of a piece to a square of the board: the square
// held lands under the finger, the piece turned as it is. When it fits only
// turned another way round, it turns; turning moves the square held within
// the piece, so it goes where it covers the square under the finger, with
// the square held as near it as can be (on it when that fits). Released
// over the start shape, a piece on the grid goes home.
export function slideMove(q, G, b, fromCell, toCell) {
  const piece = pieceAtCell(G, b, fromCell), to = G.where[toCell];
  if (!piece) return null;
  if (to.home !== undefined) return piece.at ? {type: 'home', piece: piece.cells[0]} : null;
  const shape = shapeOf(G, piece), frame = piece.at ? footprint(G, piece) : shape, from = G.where[fromCell];
  const held = piece.at ? piece.cells.findIndex((_, j) => same(frame[j], from.mat)) : piece.cells.indexOf(from.home);
  const r = piece.at ? piece.at[2] : 0;
  const spot = t => { const turned = turnCells(shape, t)[held]; return [to.mat[0] - turned[0], to.mat[1] - turned[1], t]; };
  let at = spot(r);
  if (!fitsAt(q, G, b, piece, at)) {
    let best = null;
    for (const t of [1, 2, 3].map(k => canonTurn(shape, r + k))) {
      if (t === r) continue;
      const turned = turnCells(shape, t), [hx, hy] = turned[held];
      for (const [cx, cy] of turned) {
        const other = [to.mat[0] - cx, to.mat[1] - cy, t], d = (hx - cx) ** 2 + (hy - cy) ** 2;
        if ((!best || d < best.d) && fitsAt(q, G, b, piece, other) && !same(other, piece.at)) best = {at: other, d};
      }
    }
    if (best) at = best.at;
  }
  return {type: 'put', piece: piece.cells[0], x: at[0], y: at[1], r: at[2]};
}
// The piece drawn on a square of the board: a piece at home on its home
// square, a placed piece on the grid.
export function pieceAtCell(G, b, i) {
  const w = G.where[i];
  if (w.home !== undefined) return b.pieces.find(piece => !piece.at && piece.cells.includes(w.home)) || null;
  return b.pieces.find(piece => piece.at && footprint(G, piece).some(c => same(c, w.mat))) || null;
}

/* --------------------------------------------------------------------- *
 * Hints: the next step towards a solve that keeps the child's pieces where
 * they are when it can, memoised per board.
 * --------------------------------------------------------------------- */
export function pieceName(cells) {
  const r = rectOf(cells);
  return r ? `${Math.max(r[2], r[3])} by ${Math.min(r[2], r[3])}` : 'corner piece';
}
const article = (name, names) => names.filter(n => n === name).length > 1 ? `a ${name}` : `the ${name}`;
const piecesNamed = (G, b) => b.pieces.map(piece => pieceName(shapeOf(G, piece)));
// Ways to finish: fill one of `regions` with the home pieces after at most
// the cuts left, keeping the placed pieces. Returns {first, place} for the
// first that works: `first` is the next cut (or null) and `place` the
// pieces' places when no cut is needed.
function finish(q, G, b, regions) {
  const home = b.pieces.filter(piece => !piece.at), shapes = home.map(piece => shapeOf(G, piece));
  if (!home.length) return regions.some(region => region.length === 0) ? {first: null, place: []} : null;
  const ways = partitions(shapes, cutsLeft(q, b));
  for (const region of regions) for (const way of ways) {
    const fit = cover(region, way.pieces);
    if (!fit) continue;
    if (way.first) return {first: {piece: home[way.first.piece], dir: way.first.dir, k: way.first.k}};
    return {first: null, place: home.map((piece, i) => ({piece, at: [fit[i].x, fit[i].y, canonTurn(shapeOf(G, piece), fit[i].r)]}))};
  }
  return null;
}
// The regions a finish may fill around the pieces on the grid.
function regionsFor(q, G, b) {
  const taken = new Set();
  b.pieces.filter(piece => piece.at).forEach(piece => footprint(G, piece).forEach(c => taken.add(cellKey(c))));
  const open = cells => cells.filter(c => !taken.has(cellKey(c)));
  if (q.mode === 'square') {
    if (q.hole) return [open(G.region)];
    const s = q.side, out = [];
    for (let y = 0; y + s <= q.mat.rows; y++) for (let x = 0; x + s <= q.mat.cols; x++) {
      const hole = new Set(rectCells(x, y, s, s).map(cellKey));
      if (![...hole].some(k => taken.has(k))) out.push(open(rectCells(0, 0, q.mat.cols, q.mat.rows).filter(c => !hole.has(cellKey(c)))));
    }
    return out;
  }
  // Rebuild: a rectangle not yet found, anywhere on the grid, holding every
  // piece on it.
  const out = [];
  for (const key of q.answers.filter(k => !b.found.includes(k))) {
    const [L, S] = keyRect(key);
    for (const [w, h] of L === S ? [[L, S]] : [[L, S], [S, L]]) for (let y = 0; y + h <= q.mat.rows; y++) for (let x = 0; x + w <= q.mat.cols; x++) {
      const cells = rectCells(x, y, w, h), inside = new Set(cells.map(cellKey));
      if ([...taken].every(k => inside.has(k))) out.push(open(cells));
    }
  }
  return out;
}
// The box round some squares: [x, y, w, h].
const boxOf = cells => [Math.min(...cells.map(c => c[0])), Math.min(...cells.map(c => c[1])), ...sizeOf(cells)];
// Words for where a piece goes on the grid.
function placeWords(q, G, b, piece, at) {
  const cells = footprint(G, piece, at), [x, y, w, h] = boxOf(cells);
  if (q.mode === 'rebuild') {
    const names = piecesNamed(G, b);
    const near = b.pieces.find(other => other.at && other !== piece && footprint(G, other).some(c => cells.some(d => Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) === 1)));
    return near ? `next to ${article(pieceName(shapeOf(G, near)), names)}` : 'on the grid';
  }
  const C = q.mat.cols, R = q.mat.rows, top = y === 0, bottom = y + h === R, left = x === 0, right = x + w === C;
  if (w === C) return top ? 'across the top' : bottom ? 'across the bottom' : 'across the middle';
  if (h === R) return left ? 'down the left side' : right ? 'down the right side' : 'down the middle';
  if ((top || bottom) && (left || right)) return `in the ${top ? 'top' : 'bottom'} ${left ? 'left' : 'right'} corner`;
  if (top) return 'along the top';
  if (bottom) return 'along the bottom';
  if (left) return 'along the left side';
  if (right) return 'along the right side';
  return `at row ${y + 1}, column ${x + 1}`;
}
const cap = s => s[0].toUpperCase() + s.slice(1);
function putHint(q, G, b, piece, at) {
  const names = piecesNamed(G, b), name = article(pieceName(shapeOf(G, piece)), names), now = piece.at ? piece.at[2] : 0;
  const turn = at[2] !== now, where = placeWords(q, G, b, piece, at);
  return {type: 'move', action: {type: 'put', piece: piece.cells[0], x: at[0], y: at[1], r: at[2]}, text: turn ? `Turn ${name} and put it ${where}.` : `Put ${name} ${where}.`};
}
function cutHint(q, G, b, {piece, dir, k}) {
  const frame = shapeOf(G, piece), [a, c] = splitBy(frame, dir, k);
  const names = piecesNamed(G, b), whole = article(pieceName(shapeOf(G, piece)), names);
  const partA = pieceName(a.map(j => frame[j])), partB = pieceName(c.map(j => frame[j]));
  const parts = partA === partB ? `two ${partA === 'corner piece' ? 'corner' : partA} pieces` : `a ${partA} and a ${partB}`;
  return {type: 'move', action: {type: 'cut', piece: piece.cells[0], dir, k}, text: `Cut ${whole} into ${parts}.`};
}
const homeHint = (G, b, piece) => ({type: 'move', action: {type: 'home', piece: piece.cells[0]}, text: `Take ${article(pieceName(shapeOf(G, piece)), piecesNamed(G, b))} back.`});
const TAPE = {type: 'move', action: {type: 'tape'}, text: 'Tape the pieces back together.'};
function towards(q, G, b) {
  const step = done => done.first ? cutHint(q, G, b, done.first) : done.place.length ? putHint(q, G, b, done.place[0].piece, done.place[0].at) : null;
  const kept = finish(q, G, b, regionsFor(q, G, b));
  if (kept) return step(kept);
  // The cuts made can't work: tape them. Else take a piece back, one whose
  // place stops every finish if there is one, the last on the grid if not.
  const bare = {...b, pieces: b.pieces.map(piece => ({...piece, at: null}))};
  if (!finish(q, G, bare, regionsFor(q, G, bare))) return TAPE;
  const placed = b.pieces.filter(piece => piece.at);
  const lifted = piece => ({...b, pieces: b.pieces.map(other => other === piece ? {...piece, at: null} : other)});
  for (const piece of [...placed].reverse()) if (finish(q, G, lifted(piece), regionsFor(q, G, lifted(piece)))) return homeHint(G, b, piece);
  return homeHint(G, b, placed.at(-1));
}
const hintMemo = new Map();
export const forgetHints = () => hintMemo.clear();
function hint(p, b) {
  const q = p.parameters, G = geometry(q);
  if (!valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}:${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  let h;
  if (q.mode === 'square' && q.apart) {
    // Can't: first a try (the first cut of a way with one more cut), then
    // the reason and the claim.
    if (!tried(b)) {
      const more = finish({...q, cuts: q.cuts + 1}, G, b, regionsFor(q, G, b));
      h = cutHint(q, G, b, more.first);
    } else h = {type: 'move', action: {type: 'cant', cells: q.apart}, text: q.cantText};
  } else if (q.mode === 'rebuild' && q.answers.every(k => b.found.includes(k))) h = {type: 'move', action: {type: 'all'}, text: 'Every rectangle is on the shelf. Press That’s all.'};
  else h = towards(q, G, b) || {type: 'done'};
  if (hintMemo.size > 500) hintMemo.clear();
  hintMemo.set(key, h);
  return h;
}

/* --------------------------------------------------------------------- *
 * View state, outside the save: the chosen piece, the Can't picker, a
 * refusal and a shake. It belongs to one board: when the board changes by
 * anything but a move (Undo, a save restored), it starts again.
 * --------------------------------------------------------------------- */
const uiState = new Map();
const blankView = () => ({chosen: undefined, claiming: false, picks: [], said: null, marked: [], shake: 0, board: null});
function ui(p, b) {
  if (!uiState.has(p.id)) uiState.set(p.id, blankView());
  const state = uiState.get(p.id);
  if (b) {
    const key = JSON.stringify(b);
    if (state.board !== null && state.board !== key) Object.assign(state, blankView());
    state.board = key;
  }
  return state;
}
// The chosen piece: a lone piece at home is chosen until the child chooses.
function chosenOf(p, b) {
  const state = ui(p, b);
  if (state.chosen === undefined) return b.pieces.length === 1 && !b.pieces[0].at ? b.pieces[0] : null;
  return state.chosen === null ? null : pieceById(b, state.chosen) || null;
}
export const ONE_PIECE = 'One piece can cover both.';
// A tap in the Can't picker: drop a square picked; refuse one that can
// share a piece with a square picked; pick it; the claim once enough.
export function pickSquare(q, G, picks, cell) {
  if (picks.some(c => same(c, cell))) return {picks: picks.filter(c => !same(c, cell)), said: null, marked: []};
  if (G.holeSet.has(cellKey(cell)) || !inMat(q, cell)) return null;
  const clash = picks.find(c => shareable(G.region, c, cell));
  if (clash) return {said: ONE_PIECE, marked: [clash, cell]};
  const next = [...picks, cell];
  if (next.length === q.cuts + 2) return {claim: next};
  return {picks: next, said: null, marked: []};
}

/* --------------------------------------------------------------------- *
 * Drawing
 * --------------------------------------------------------------------- */
const f = n => Number(n.toFixed(2));
const U = UNIT;
const COLOURS = 7;
const colourOf = piece => `c${piece.cells[0] % COLOURS}`;
const sideSize = (cols, rows) => Math.max(5.2, .5 * Math.max(cols, rows) + 1);
// Side lengths across the top and down the left of a box in board squares.
const sides = ([x, y, w, h], size, cls = '') => `<text class="rs-side ${cls}" x="${f((x + w / 2) * U)}" y="${f(y * U - size * .5)}" style="font-size:${f(size)}px">${w}</text><text class="rs-side rs-side-left ${cls}" x="${f(x * U - size * .5)}" y="${f((y + h / 2) * U)}" style="font-size:${f(size)}px">${h}</text>`;
// Room round a board for the side numerals at the top and left, and only a
// little at the bottom and right, so the two boards sit close together.
// The frame's width and height are in board units (U to a square).
const frameOf = (g, size, rows) => {
  const [x, y, w, h] = g.box, left = size * (.5 + .62 * String(rows).length) + 2, top = size * 1.25 + 1, edge = 2.5;
  return {x: x - left, y: y - top, W: w + left + edge, H: h + top + edge};
};
const framed = (svg, {x, y, W, H}) => svg.replace(/viewBox="[^"]*"/, `viewBox="${f(x)} ${f(y)} ${f(W)} ${f(H)}"`).replace(/--sg-aspect:[\d.]+/, `--sg-aspect:${f(W / H)}`);
const boxRect = ([x, y, w, h], cls) => `<rect class="${cls}" x="${f(x * U)}" y="${f(y * U)}" width="${f(w * U)}" height="${f(h * U)}"/>`;
const scissors = on => `<svg class="rs-snip${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="18" r="3.4"/><circle cx="17.5" cy="18" r="3.4"/><path d="M8.6 15.4 18.5 2.5M15.4 15.4 5.5 2.5"/></svg>`;
const button = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary rs-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${cls}" ${enabled ? '' : 'disabled'}>${label}</button>`;
// A small picture of a rectangle made, with its sides.
function mini(key, here) {
  const [L, S] = keyRect(key), k = 9, pad = 7;
  return `<li class="rs-slot${here ? ' here' : ''}"><svg class="rs-mini" viewBox="${-pad} ${-pad} ${L * k + pad + 2} ${S * k + pad + 2}" role="img" aria-label="${L} by ${S}"><rect class="rs-mini-rect" x="0" y="0" width="${L * k}" height="${S * k}"/>${Array.from({length: L - 1}, (_, i) => `<path class="rs-mini-grid" d="M${(i + 1) * k} 0V${S * k}"/>`).join('')}${Array.from({length: S - 1}, (_, j) => `<path class="rs-mini-grid" d="M0 ${(j + 1) * k}H${L * k}"/>`).join('')}<text class="rs-mini-side" x="${L * k / 2}" y="-2.2">${L}</text><text class="rs-mini-side rs-mini-left" x="-2.2" y="${S * k / 2}">${S}</text></svg></li>`;
}

function render(p, a) {
  const q = p.parameters, G = geometry(q), b = a.board, done = solved(p, b), state = ui(p, b);
  const claiming = q.mode === 'square' && q.cant && !done && state.claiming && tried(b), live = !done;
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const chosen = live && !claiming ? chosenOf(p, b) : null;
  const left = cutsLeft(q, b);
  // Hint marks: the squares a piece goes to, the piece, the cut line.
  const hintPiece = act && ['put', 'home', 'cut'].includes(act.type) ? act.piece : null;
  const hintCells = new Set();
  if (act?.type === 'put') { const piece = pieceById(b, act.piece); if (piece) footprint(G, piece, [act.x, act.y, act.r]).forEach(c => hintCells.add(G.ofMat(c))); }
  if (act?.type === 'cant' && claiming) act.cells.forEach(c => hintCells.add(G.ofMat(c)));
  const picks = claiming ? state.picks : done && b.claim ? b.claim : [];
  const pickSet = new Set(picks.map(c => G.ofMat(c))), markSet = new Set(claiming ? state.marked.map(c => G.ofMat(c)) : []);
  const homeOwner = new Map();
  b.pieces.forEach(piece => piece.cells.forEach(i => homeOwner.set(i, piece)));
  const names = piecesNamed(G, b);
  const cell = i => {
    const w = G.where[i];
    if (w.home !== undefined) {
      const owner = homeOwner.get(w.home), away = Boolean(owner.at), name = article(pieceName(shapeOf(G, owner)), names);
      return {cls: `rs-home${away ? ' away' : ''}`, act: live && !claiming, label: away ? `Home of ${name}. Bring it back` : `${cap(name)}${chosen === owner ? ', chosen' : ''}`};
    }
    const [x, y] = w.mat, k = cellKey(w.mat), hole = G.holeSet.has(k), owner = pieceAtCell(G, b, i);
    const cls = `rs-mat${hole ? ' mark' : ''}${hintCells.has(i) ? ' hinted' : ''}${pickSet.has(i) ? ' picked' : ''}${markSet.has(i) ? ' clash' : ''}`;
    const label = `Row ${y + 1}, column ${x + 1}${owner ? `, ${article(pieceName(shapeOf(G, owner)), names)}` : ''}${pickSet.has(i) ? ', picked' : ''}`;
    return {cls, act: live && (claiming ? !hole : !hole || Boolean(owner)), label};
  };
  const pieceCls = piece => `rs-piece ${colourOf(piece)}${chosen === piece ? ' chosen' : ''}${chosen === piece && state.shake ? ` shake${state.shake % 2}` : ''}${hintPiece === piece.cells[0] ? ' hinted' : ''}`;
  const matIndex = ([x, y]) => y * q.mat.cols + x;
  // The start shape: pieces at home, the shape's sides, and cut lines.
  const hs = sideSize(q.home.w, q.home.h);
  let homeOver = sides([0, 0, q.home.w, q.home.h], hs);
  const homePieces = b.pieces.filter(piece => !piece.at).map(piece => ({cells: piece.cells, key: String(piece.cells[0]), cls: pieceCls(piece)}));
  // The grid: pieces on it, the marked square, the square's sides.
  const ms = sideSize(q.mat.cols, q.mat.rows);
  let over = '';
  const matPieces = b.pieces.filter(piece => piece.at).map(piece => ({cells: footprint(G, piece).map(matIndex), key: String(piece.cells[0]), cls: pieceCls(piece)}));
  if (q.hole) over += boxRect([q.hole[0], q.hole[1], q.hole[2], q.hole[2]], 'rs-mark-box');
  if (q.mode === 'square') over += sides([0, 0, q.mat.cols, q.mat.rows], ms);
  // A solve: the square left uncovered, ringed, with its side.
  if (q.mode === 'square' && done && !b.claim) {
    const r = rectOf(uncovered(q, G, b));
    over += boxRect(r, 'rs-hole-ring') + `<text class="rs-hole-num" x="${f((r[0] + r[2] / 2) * U)}" y="${f((r[1] + r[3] / 2) * U)}" style="font-size:${f(Math.min(4 + 2.2 * r[2], 16))}px">${r[2]}</text>`;
  }
  // Rebuild: a rectangle made, outlined with its sides.
  const made = q.mode === 'rebuild' ? madeRect(G, b) : null;
  if (made) {
    const r = rectOf(b.pieces.flatMap(piece => footprint(G, piece)));
    over += boxRect(r, 'rs-made') + sides(r, ms, 'rs-made-side');
  }
  // Squares picked for Can't.
  if (picks.length) over += picks.map(c => `<circle class="rs-pick${done ? ' kept' : ''}" cx="${f((c[0] + .5) * U)}" cy="${f((c[1] + .5) * U)}" r="${f(U * .26)}"/>`).join('');
  // Cut lines across the chosen piece at the top (and the hinted one), on
  // top of the squares; a tap near one reaches the square under it.
  const lineHtml = [];
  const addLines = (piece, only = null) => {
    if (piece.at) return;
    const frame = shapeOf(G, piece);
    for (const {dir, k} of linesOf(frame)) {
      if (only && !(only.dir === dir && only.k === k)) continue;
      const [x1, y1, x2, y2] = lineSpan(frame, dir, k), [ia, ib] = splitBy(frame, dir, k);
      const label = `Cut into ${pieceName(ia.map(j => frame[j]))} and ${pieceName(ib.map(j => frame[j]))}`;
      const lit = act?.type === 'cut' && act.piece === piece.cells[0] && act.dir === dir && act.k === k;
      const coords = `x1="${f(x1 * U)}" y1="${f(y1 * U)}" x2="${f(x2 * U)}" y2="${f(y2 * U)}"`;
      lineHtml.push(`<g class="rs-cut${lit ? ' hinted' : ''}" role="button" tabindex="0" aria-label="${esc(label)}" data-rs-cut="${piece.cells[0]}:${dir}:${k}" data-focus="rs-cut-${piece.cells[0]}-${dir}-${k}"><line class="rs-cut-hit" ${coords}/><line class="rs-cut-line" ${coords}/></g>`);
    }
  };
  if (live && !claiming && left > 0) {
    if (chosen) addLines(chosen);
    if (act?.type === 'cut' && act.piece !== chosen?.cells[0]) { const piece = pieceById(b, act.piece); if (piece) addLines(piece, act); }
  }
  if (lineHtml.length) homeOver += `<g class="rs-cuts">${lineHtml.join('')}</g>`;
  const stroke = live && !claiming, mode = `mode-${q.mode}${done ? ' solved' : ''}${claiming ? ' claiming' : ''}`;
  // Each board names its focus targets apart, since both number from 0.
  const own = (svg, tag) => svg.replace(/data-focus="sg-/g, `data-focus="rs-${tag}-`);
  const hf = frameOf(G.gh, hs, q.home.h), mf = frameOf(G.gm, ms, q.mat.rows);
  const homeSvg = own(framed(squareBoard(G.gh, {cls: `rs-board rs-home-board ${mode}`, label: q.mode === 'square' ? `${q.home.w} by ${q.home.h} rectangle` : 'Square with a corner missing', cell: j => cell(G.ofHome(j)), pieces: homePieces, over: homeOver, stroke}), hf), 'home');
  const matSvg = own(framed(squareBoard(G.gm, {cls: `rs-board rs-mat-board ${mode}`, label: q.mode === 'square' ? `${q.mat.cols} by ${q.mat.rows} square` : `Grid ${q.mat.cols} by ${q.mat.rows}`, cell: k => cell(G.ofMat(G.gm.cells[k])), pieces: matPieces, over, stroke}), mf), 'mat');
  // The bar: the scissors (cuts left), then the buttons.
  const snips = `<span class="rs-snips" role="img" aria-label="${left} ${left === 1 ? 'cut' : 'cuts'} left of ${q.cuts}">${Array.from({length: q.cuts}, (_, k) => scissors(k < left)).join('')}</span>`;
  const buttons = [];
  if (live) {
    const spin = chosen ? (chosen.at ? turnSpot(q, G, b, chosen) : homeTurnSpot(q, G, b, chosen)) : null;
    buttons.push(button('Turn', spin ? {type: 'put', piece: chosen.cells[0], x: spin[0], y: spin[1], r: spin[2]} : {type: 'put'}, 'rs-turn', Boolean(spin) && !claiming, false));
    buttons.push(button('Tape', {type: 'tape'}, 'rs-tape', tried(b) && !claiming, act?.type === 'tape'));
    if (q.mode === 'square' && q.cant) buttons.push(`<button type="button" class="secondary rs-button rs-cant${act?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="rs-cant" aria-pressed="${claiming}" ${tried(b) ? '' : 'disabled'}>Can’t</button>`);
    if (q.mode === 'rebuild') buttons.push(button('That’s all', {type: 'all'}, 'rs-all', b.found.length > 0 && !b.no, act?.type === 'all'));
  }
  const bar = `<div class="rs-bar">${snips}${buttons.length ? `<span class="rs-buttons">${buttons.join('')}</span>` : ''}</div>`;
  const note = claiming && state.said ? state.said : q.mode === 'rebuild' && b.no && !done ? 'There is another.' : '';
  const shelf = q.mode === 'rebuild' && b.found.length ? `<ol class="rs-shelf" aria-label="Rectangles made">${b.found.map(k => mini(k, k === made)).join('')}</ol>` : '';
  // What a screen reader hears: the pieces and where they are.
  const where = b.pieces.map(piece => `${pieceName(shapeOf(G, piece))} ${piece.at ? 'on the grid' : 'at home'}`).join(', ');
  const status = `${where}. ${left} ${left === 1 ? 'cut' : 'cuts'} left.${chosen ? ` Chosen: ${pieceName(shapeOf(G, chosen))}.` : ''}${made ? ` A ${keyRect(made).join(' by ')} rectangle.` : ''}${claiming ? ` Picked ${picks.length}.` : ''}${note ? ` ${note}` : ''}`;
  return `<div class="rs-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="reshape">${bar}<div class="rs-stage" style="--rs-hh:${f(hf.H / U)};--rs-hm:${f(mf.H / U)};--rs-mw:${f(mf.W / U)}"><div class="rs-wrap rs-home-wrap" style="--rs-w:${f(hf.W / U)}">${homeSvg}</div><div class="rs-wrap rs-mat-wrap" style="--rs-w:${f(mf.W / U)}">${matSvg}</div></div>${note ? `<p class="rs-note">${esc(note)}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

/* --------------------------------------------------------------------- *
 * Taps, slides and keys
 * --------------------------------------------------------------------- */
// The cut line of a piece at home nearest a point of the start shape's
// board (in its squares), if the point is within `reach` of it.
export function lineNear(G, piece, [u, py], reach = .3) {
  const frame = shapeOf(G, piece);
  let best = null, bestD = reach;
  for (const {dir, k} of linesOf(frame)) {
    const [x1, y1, x2, y2] = lineSpan(frame, dir, k);
    const d = dir === 'h' ? (u >= x1 && u <= x2 ? Math.abs(py - k) : Infinity) : (py >= y1 && py <= y2 ? Math.abs(u - k) : Infinity);
    if (d <= bestD) { best = {dir, k}; bestD = d; }
  }
  return best;
}
// How near a dashed line a tap must fall to cut there, in squares: a third
// of a square, widened to about 12 pixels when squares are small (never so
// far that the middle of a square cuts).
export const reachFor = px => Math.min(.4, Math.max(.3, px > 0 ? 12 / px : .3));
// What a tap on a square of the board does: a move, or a change of view.
// `point` is where the tap fell on the start shape, [x, y] in its squares
// with the size of a square in pixels (null from a key or on the grid): a
// tap near a dashed line of the chosen piece at the top cuts there, and a
// tap elsewhere on it turns it onto the grid, as Turn does.
export function tapSquare(p, b, i, point = null) {
  const q = p.parameters, G = geometry(q), state = ui(p, b), w = G.where[i];
  if (solved(p, b)) return null;
  if (q.mode === 'square' && q.cant && state.claiming && tried(b)) {
    if (!w.mat) return null;
    const out = pickSquare(q, G, state.picks, w.mat);
    if (!out) return null;
    return out.claim ? {move: {type: 'cant', cells: out.claim}} : {ui: out};
  }
  const owner = pieceAtCell(G, b, i), chosen = chosenOf(p, b);
  if (owner) {
    if (owner !== chosen) return {ui: {chosen: owner.cells[0], shake: 0}};
    if (!owner.at) {
      const line = point && cutsLeft(q, b) > 0 ? lineNear(G, owner, point, reachFor(point[2])) : null;
      if (line) return {move: {type: 'cut', piece: owner.cells[0], ...line}};
      const spin = homeTurnSpot(q, G, b, owner);
      return spin ? {move: {type: 'put', piece: owner.cells[0], x: spin[0], y: spin[1], r: spin[2]}} : {ui: {shake: state.shake + 1}};
    }
    const spin = turnSpot(q, G, b, owner);
    return spin ? {move: {type: 'put', piece: owner.cells[0], x: spin[0], y: spin[1], r: spin[2]}} : {ui: {shake: state.shake + 1}};
  }
  if (w.mat) {
    if (!chosen || G.holeSet.has(cellKey(w.mat))) return null;
    const at = spotFor(q, G, b, chosen, w.mat);
    return at ? {move: {type: 'put', piece: chosen.cells[0], x: at[0], y: at[1], r: at[2]}} : {ui: {shake: state.shake + 1}};
  }
  const away = b.pieces.find(piece => piece.cells.includes(w.home));
  return away?.at ? {move: {type: 'home', piece: away.cells[0]}} : null;
}
// A slide across both boards: the square pressed, then the square under the
// finger (through its middle), ending on release. One slide at a time, with
// the listeners on the document added once.
let slide = null, slideListening = false;
function slideCell(s, x, y) {
  for (const svg of s.boards) {
    const box = svg.getBoundingClientRect();
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) continue;
    const m = svg.getScreenCTM?.();
    if (!m) return null;
    const pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    const at = pt.matrixTransform(m.inverse()), home = svg.classList.contains('rs-home-board');
    const k = cellAt(home ? s.G.gh : s.G.gm, at.x, at.y, .6);
    return k === null ? null : home ? s.G.ofHome(k) : s.G.ofMat(s.G.gm.cells[k]);
  }
  return null;
}
function slidePaint(s, show = [], blocked = false) {
  s.root.querySelectorAll('.sg-hit.in-stroke').forEach(el => el.classList.remove('in-stroke', 'blocked'));
  for (const i of show) {
    const w = s.G.where[i], el = w.home !== undefined ? s.root.querySelector(`.rs-home-board [data-sg-cell="${w.home}"]`) : s.root.querySelector(`.rs-mat-board [data-sg-cell="${w.mat[1] * s.G.gm.cols + w.mat[0]}"]`);
    el?.classList.add('in-stroke', ...(blocked ? ['blocked'] : []));
  }
}
function slideMoveEvent(e) {
  const s = slide;
  if (!s || e.pointerId !== s.pointer) return;
  const i = slideCell(s, e.clientX, e.clientY);
  if (i === null || i === s.last) return;
  s.last = i;
  if (i === s.start) { slidePaint(s); return; }
  const out = s.preview(s.start, i);
  slidePaint(s, out.show, out.blocked);
}
function slideEndEvent(e) {
  const s = slide;
  if (!s || e.pointerId !== s.pointer) return;
  slide = null;
  slidePaint(s);
  // A press that hardly moved is a tap (the shared grid reads it).
  if (e.type !== 'pointerup' || s.last === s.start || Math.hypot(e.clientX - s.x, e.clientY - s.y) < 12) return;
  s.release(s.start, s.last);
}
// On a phone, the grid is kept short enough to show whole below the start
// shape without scrolling, however tall the app's header is above it, but
// never with squares under 32px. Measured after each drawing and on resize.
let fitListening = false;
function fitGrid(root) {
  const stage = root.querySelector('.rs-stage'), home = root.querySelector('.rs-home-board');
  if (!stage || !home) return;
  if (!globalThis.matchMedia?.('(max-width: 600px)').matches) { stage.style.removeProperty('--rs-fit'); return; }
  const top = stage.getBoundingClientRect().top + scrollY, rows = Number(stage.style.getPropertyValue('--rs-hm')) || 8;
  const room = innerHeight - top - home.getBoundingClientRect().height - 12;
  stage.style.setProperty('--rs-fit', `${Math.round(Math.max(32 * rows, room))}px`);
}
function wire(root, p, api) {
  const q = p.parameters, G = geometry(q), board = () => api.attempt().board;
  fitGrid(root);
  if (!fitListening) {
    addEventListener('resize', () => document.querySelectorAll('.rs-puzzle').forEach(fitGrid));
    fitListening = true;
  }
  const run = out => { if (!out) return null; if (out.ui) { api.ui(out.ui); return null; } return out.move; };
  const homeSvg = root.querySelector('.rs-home-board'), boards = [...root.querySelectorAll('.rs-board[data-sg-board]')];
  // Where the last press on the start shape fell, in its squares, and how
  // big a square is on screen, so a tap near a dashed line cuts; a key press
  // forgets it.
  let press = null;
  homeSvg?.addEventListener('pointerdown', e => {
    const m = homeSvg.getScreenCTM?.();
    if (!m) { press = null; return; }
    const pt = homeSvg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const at = pt.matrixTransform(m.inverse());
    press = [at.x / UNIT, at.y / UNIT, Math.hypot(m.a, m.b) * UNIT];
  }, true);
  homeSvg?.addEventListener('keydown', () => { press = null; }, true);
  // Taps and keys on each board's squares.
  wireSquare(root.querySelector('.rs-home-wrap'), G.gh, {cell: j => { const point = press; press = null; return run(tapSquare(p, board(), G.ofHome(j), point)); }}, api.apply);
  wireSquare(root.querySelector('.rs-mat-wrap'), G.gm, {cell: k => run(tapSquare(p, board(), G.ofMat(G.gm.cells[k])))}, api.apply);
  // Slides from a piece, across both boards.
  const preview = (from, to) => {
    const b = board(), action = slideMove(q, G, b, from, to);
    if (!action) return {show: [], blocked: true};
    const piece = pieceById(b, action.piece);
    if (action.type === 'home') return {show: piece.cells.map(i => G.ofHome(i))};
    const spot = footprint(G, piece, [action.x, action.y, action.r]);
    return {show: spot.filter(c => inMat(q, c)).map(c => G.ofMat(c)), blocked: !fitsAt(q, G, b, piece, [action.x, action.y, action.r])};
  };
  const release = (from, to) => {
    const b = board(), action = slideMove(q, G, b, from, to);
    if (!action) return;
    const piece = pieceById(b, action.piece);
    if (action.type === 'put' && (!fitsAt(q, G, b, piece, [action.x, action.y, action.r]) || same(piece.at, [action.x, action.y, action.r]))) { api.ui({chosen: piece.cells[0], shake: ui(p, b).shake + 1}); return; }
    api.apply(action);
  };
  if (!slideListening) {
    document.addEventListener('pointermove', slideMoveEvent);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, slideEndEvent);
    slideListening = true;
  }
  for (const svg of boards) svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || !svg.classList.contains('sg-stroking')) return;
    const control = e.target.closest('[data-sg-cell]');
    if (!control) return;
    const k = Number(control.dataset.sgCell), start = svg.classList.contains('rs-home-board') ? G.ofHome(k) : G.ofMat(G.gm.cells[k]);
    if (!pieceAtCell(G, board(), start)) { slide = null; return; }
    slide = {pointer: e.pointerId, x: e.clientX, y: e.clientY, start, last: start, root, boards, G, preview, release};
  });
  // Keys: Enter or Space on a focused cut line cuts there (a finger taps near
  // the line instead, so a drag from anywhere on a piece moves it).
  const cut = el => { const [piece, dir, k] = el.dataset.rsCut.split(':'); api.apply({type: 'cut', piece: Number(piece), dir, k: Number(k)}); };
  root.querySelectorAll('[data-rs-cut]').forEach(el => {
    el.addEventListener('click', e => { if (e.detail === 0) cut(el); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cut(el); } });
  });
  // Arrow keys slide the chosen piece on the grid one square.
  const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1]};
  root.addEventListener('keydown', e => {
    const d = ARROWS[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey || !e.target.closest?.('[data-sg-board]')) return;
    const b = board(), piece = chosenOf(p, b);
    if (!piece?.at) return;
    e.preventDefault();
    const at = [piece.at[0] + d[0], piece.at[1] + d[1], piece.at[2]];
    if (fitsAt(q, G, b, piece, at)) api.apply({type: 'put', piece: piece.cells[0], x: at[0], y: at[1], r: at[2]});
  });
}

export const reshapeMechanics = {
  reshape: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (payload.chosen === null || int(payload.chosen)) state.chosen = payload.chosen;
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: [], said: null, marked: [], shake: 0});
      if (Array.isArray(payload.picks)) state.picks = payload.picks;
      if (payload.said === null || typeof payload.said === 'string') state.said = payload.said;
      if (Array.isArray(payload.marked)) state.marked = payload.marked;
      if (int(payload.shake)) state.shake = payload.shake;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the rectangles found, and a refused That's all while the
    // shelf is the same.
    carry(p, from, to) {
      if (p.parameters.mode !== 'rebuild' || !object(from) || !object(to) || !Array.isArray(from.found) || !Array.isArray(to.found)) return to;
      const found = [...from.found, ...to.found.filter(k => !from.found.includes(k))];
      return {...to, found, no: Boolean(from.no && found.length === from.found.length) || (to.no && found.length === to.found.length)};
    }
  }
};

// The family seam entry (dist/families.js): a group in Tile gardens.
export default {
  id: 'reshape',
  mechanics: reshapeMechanics,
  pack: new URL('./reshape.json', import.meta.url).href,
  css: new URL('./reshape.css', import.meta.url).href,
  focus: '.rs-board .sg-hit,.rs-cut,.rs-tape:not([disabled])'
};
