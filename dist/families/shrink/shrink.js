// Shrink strips (worksheet Week 76, substitution strips). A row grows from A
// by turning every A into AB and every B into BA at once: A, AB, ABBA,
// ABBABAAB, … , the Thue–Morse word. So a grown row splits into true pairs,
// each AB or BA. Shrink undoes one step on a piece cut from a row: seams
// split the piece into pairs (two ways: pair the first two tiles, or leave the
// first tile alone), a tile cut off from its partner at an end gets the
// partner back as a dashed ghost (always the other letter, since true pairs
// are unequal), and each pair becomes its first letter. A pair AA or BB is
// marked: no tile grew into it.
//
// With the ghosts, shrinking is exact. A piece occurs in a grown row exactly
// when some placement is unmarked and its shrunk row occurs (a piece at an
// even place pairs from its first tile, at an odd place leaves it alone, and
// its shrunk row is the run of parents; conversely the growth of a real row
// is real). Shrunk rows are shorter from three tiles on, and every row of one
// or two tiles is real. So a real piece can shrink, one level at a time, to a
// single tile, and a piece that no grown row has gets stuck: every placement
// of its seams, at some level, marks a pair. The child's own tree of seams and
// shrinks is that certificate.
//
// Four modes on one mechanic, each from the card's Decision:
// - seams: several short pieces; keep every seam placement of each from which
//   it can shrink to one tile, then That's all (Week 76 Problem 4; ABA has two,
//   longer pieces one, and ABAB's second way dies one level down).
// - impostor: a strip that claims to be cut from a grown row; choose at most k
//   tiles and shrink them until every way is stuck (Problem 6).
// - repair: a piece with one tile flipped; keep every flip that lets it shrink
//   to one tile, then That's all.
// - playground: grow rows from one tile.
import {esc} from '../../expansion-controls.js';

const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const keysAre = (o, keys) => object(o) && Object.keys(o).sort().join() === [...keys].sort().join();
const int = v => Number.isInteger(v);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const memo = (cache, key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
export const MODES = ['seams', 'impostor', 'repair', 'playground'];
// Bounds on a saved tree. With the two-tile rule (wayAllowed) no legal tree
// comes near them: the largest, for any row of up to 16 tiles, has 10 rows,
// 7 levels and one fork (scripts/validate-shrink.mjs checks it).
export const LIMIT = {depth: 8, nodes: 16};
export const word = s => typeof s === 'string' && /^[AB]+$/.test(s);

// --- Rows, pairs and ghosts ----------------------------------------------------
export const other = c => c === 'A' ? 'B' : 'A';
export const grow = w => [...w].map(c => c === 'A' ? 'AB' : 'BA').join('');
export const flipAt = (w, i) => w.slice(0, i) + other(w[i]) + w.slice(i + 1);
// A placement s: 0 pairs the first two tiles, 1 leaves the first tile alone.
// Pairs start at the places ≡ s (mod 2); seams sit on the joins g ≡ s, where
// join g is before tile g (0 is the left end, n the right end).
export const ghostBefore = (w, s) => s === 1;
export const ghostAfter = (w, s) => (w.length - s) % 2 === 1;
// The first tile of each marked pair (AA or BB) of a placement.
export function marked(w, s) {
  const out = [];
  for (let i = s; i + 1 < w.length; i += 2) if (w[i] === w[i + 1]) out.push(i);
  return out;
}
// The shrunk row, or null when a pair is marked. A ghost before tile 0 is the
// first letter of its pair, so it is the other letter; a tile alone at the end
// is the first letter of its own pair.
export function shrinkWord(w, s) {
  if (marked(w, s).length) return null;
  let out = s === 1 ? other(w[0]) : '';
  for (let i = s; i < w.length; i += 2) out += w[i];
  return out;
}
// Whether a row can shrink, one unmarked placement at a time, to one tile.
// Every row of one or two tiles can (AB → A; AA → BA → B), and from three
// tiles on each shrunk row is shorter, so the search ends.
const realCache = new Map();
export function real(w) {
  if (w.length <= 2) return true;
  return memo(realCache, w, () => [0, 1].some(s => { const p = shrinkWord(w, s); return p !== null && real(p); }));
}
export const fits = (w, s) => { const p = shrinkWord(w, s); return p !== null && real(p); };
// Two different tiles are one pair: they shrink only paired (AB to A, BA to
// B). Leaving the first tile alone would give two tiles again (AB to BB, BB to
// AB, …), so the rows could go round for ever. Two equal tiles have only that
// way (AA to BA to B). So every row of two tiles reaches one tile in at most
// two shrinks, and a tree can't go round.
export const wayAllowed = (w, s) => w.length >= 2 && !(w.length === 2 && s === 1 && w[0] !== w[1]);
// Every placement of each piece from which it can shrink to one tile.
export const fitsOf = pieces => pieces.flatMap((w, i) => [0, 1].filter(s => fits(w, s)).map(s => [i, s]));
// Every tile whose flip makes the piece real.
export const fixesOf = piece => [...piece].map((_, i) => i).filter(i => real(flipAt(piece, i)));

// --- The child's tree of seams and shrinks -------------------------------------
// A node is one row: s is the placement drawn now (null before a tap), t says
// which placements have been tried, and k holds the shrunk row of each
// placement that has been shrunk. A path is a string of placements from the
// top row ('' is the top, '10' its first-tile-alone row's paired row).
export const leaf = () => ({s: null, t: [false, false], k: [null, null]});
export function nodeAt(root, path) {
  let node = root;
  for (const c of path) { if (!node) return null; node = node.k[Number(c)]; }
  return node || null;
}
export function wordAt(w, path) {
  for (const c of path) { if (w === null) return null; w = shrinkWord(w, Number(c)); }
  return w;
}
export const countNodes = node => node ? 1 + countNodes(node.k[0]) + countNodes(node.k[1]) : 0;
// A row is stuck when each placement is tried and marked, or shrinks to a
// stuck row. Rows of one or two tiles never are.
export function stuck(node, w) {
  if (!node || w === null) return false;
  return [0, 1].every(s => (node.t[s] && marked(w, s).length > 0) || Boolean(node.k[s] && stuck(node.k[s], shrinkWord(w, s))));
}
// Whether this placement of the row is settled as stuck.
const deadWay = (node, w, s) => (node.t[s] && marked(w, s).length > 0) || Boolean(node.k[s] && stuck(node.k[s], shrinkWord(w, s)));
// Whether the tree shows the row reaching one tile, and whether it shows
// placement s doing so. A tree can only show this for a real row: each
// shrunk row is unmarked, so it fits.
const shownReal = (node, w) => w.length === 1 || [0, 1].some(s => node.k[s] && shownReal(node.k[s], shrinkWord(w, s)));
const reaches = (node, w, s) => Boolean(node.k[s]) && shownReal(node.k[s], shrinkWord(w, s));
export function validTree(node, w, depth = 0, count = {n: 0}) {
  if (!keysAre(node, ['k', 's', 't']) || ++count.n > LIMIT.nodes || depth > LIMIT.depth) return false;
  const {s, t, k} = node;
  if (!(s === null || s === 0 || s === 1)) return false;
  if (!Array.isArray(t) || t.length !== 2 || !t.every(x => typeof x === 'boolean')) return false;
  if (!Array.isArray(k) || k.length !== 2) return false;
  if ([0, 1].some(p => t[p] && !wayAllowed(w, p))) return false;
  if (s !== null && !t[s]) return false;
  for (const p of [0, 1]) {
    if (k[p] === null) continue;
    if (!t[p]) return false;
    const c = shrinkWord(w, p);
    if (c === null || !validTree(k[p], c, depth + 1, count)) return false;
  }
  return true;
}
function setAt(root, path, node) {
  if (!path.length) return node;
  const i = Number(path[0]);
  return {...root, k: root.k.map((x, j) => j === i ? setAt(x, path.slice(1), node) : x)};
}
const pathOk = path => typeof path === 'string' && /^[01]*$/.test(path) && path.length <= LIMIT.depth;
// A seam tap or a Shrink on the row at `at`; null when it changes nothing.
function treeMove(root, w, action) {
  if (!pathOk(action.at)) return null;
  const node = nodeAt(root, action.at), here = wordAt(w, action.at);
  if (!node || here === null || here.length < 2 || ![0, 1].includes(action.s)) return null;
  if (action.type === 'seam') {
    if (node.s === action.s || !wayAllowed(here, action.s)) return null;
    return setAt(root, action.at, {...node, s: action.s, t: node.t.map((x, i) => x || i === action.s)});
  }
  if (node.s !== action.s || node.k[node.s] || marked(here, node.s).length) return null;
  if (action.at.length >= LIMIT.depth || countNodes(root) >= LIMIT.nodes) return null;
  return setAt(root, action.at, {...node, k: node.k.map((x, i) => i === node.s ? leaf() : x)});
}
const treeAction = (a, extra = []) => (a.type === 'seam' || a.type === 'shrink') && keysAre(a, ['at', 's', 'type', ...extra]);

// --- Boards ----------------------------------------------------------------------
// seams:      {trees, shelf, told, refused, done}; trees[i] is piece i's
//             tree; shelf is the kept [piece, placement] pairs, sorted; told
//             is the note of a refused That's all, null, 'stuck' (a kept one
//             can't shrink to one tile) or 'more'; refused says That's all was
//             refused on this shelf (it stays through Undo, the note does not).
// impostor:   {sel, tree}; sel is null or [first, last] tiles of the strip.
// repair:     {flip, tree, shelf, told, refused, done}; flip is the tile
//             flipped now.
// playground: {start, rows}.
const selWord = (q, sel) => q.strip.slice(sel[0], sel[1] + 1);
const pieceNow = (q, b) => b.flip === null ? q.piece : flipAt(q.piece, b.flip);
const shelfOrder = (x, y) => JSON.stringify(x) < JSON.stringify(y) ? -1 : 1;
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'seams') return {trees: q.pieces.map(leaf), shelf: [], told: null, refused: false, done: false};
  if (q.mode === 'impostor') return {sel: null, tree: null};
  if (q.mode === 'repair') return {flip: null, tree: leaf(), shelf: [], told: null, refused: false, done: false};
  return {start: 'A', rows: 1};
}
const answerCache = new Map();
const answerOf = q => memo(answerCache, JSON.stringify(q), () => q.mode === 'seams' ? fitsOf(q.pieces) : fixesOf(q.piece));
function validShelf(q, b) {
  const answer = answerOf(q), isRight = x => answer.some(y => same(x, y));
  const entry = q.mode === 'seams' ? x => Array.isArray(x) && x.length === 2 && int(x[0]) && x[0] >= 0 && x[0] < q.pieces.length && [0, 1].includes(x[1]) : x => int(x) && x >= 0 && x < q.piece.length;
  if (!Array.isArray(b.shelf) || !b.shelf.every(entry) || !b.shelf.every((x, i) => i === 0 || shelfOrder(b.shelf[i - 1], x) < 0) || new Set(b.shelf.map(x => JSON.stringify(x))).size !== b.shelf.length) return false;
  const allRight = b.shelf.every(isRight);
  if (![null, 'stuck', 'more'].includes(b.told) || typeof b.refused !== 'boolean' || typeof b.done !== 'boolean') return false;
  const complete = allRight && b.shelf.length === answer.length;
  if (b.refused && (complete || !b.shelf.length)) return false;
  if (b.told !== null && b.told !== (allRight ? 'more' : 'stuck')) return false;
  if (b.told !== null && !b.refused) return false;
  if (b.done && (b.refused || !complete)) return false;
  return true;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'seams') return keysAre(b, ['done', 'refused', 'shelf', 'told', 'trees']) && Array.isArray(b.trees) && b.trees.length === q.pieces.length && b.trees.every((t, i) => validTree(t, q.pieces[i])) && validShelf(q, b);
  if (q.mode === 'impostor') {
    if (!keysAre(b, ['sel', 'tree'])) return false;
    if (b.sel === null) return b.tree === null;
    const [a, z] = Array.isArray(b.sel) && b.sel.length === 2 ? b.sel : [];
    if (!int(a) || !int(z) || a < 0 || z <= a || z >= q.strip.length || z - a + 1 > q.k) return false;
    return validTree(b.tree, selWord(q, b.sel));
  }
  if (q.mode === 'repair') {
    if (!keysAre(b, ['done', 'flip', 'refused', 'shelf', 'told', 'tree'])) return false;
    if (b.flip !== null && !(int(b.flip) && b.flip >= 0 && b.flip < q.piece.length)) return false;
    return validTree(b.tree, pieceNow(q, b)) && validShelf(q, b);
  }
  return keysAre(b, ['rows', 'start']) && ['A', 'B'].includes(b.start) && int(b.rows) && b.rows >= 1 && b.rows <= q.rows;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'impostor') return b.sel !== null && stuck(b.tree, selWord(q, b.sel));
  return b.done;
}
// What Keep would shelve: the seams on a piece's top row, or the flip, once
// the child's own rows show them reaching one tile (null before). So nothing
// that gets stuck can be kept, and That's all only ever finds one missing.
function keepEntry(q, b, piece) {
  if (q.mode === 'seams') {
    const node = b.trees[piece], s = node.s;
    return s !== null && reaches(node, q.pieces[piece], s) ? [piece, s] : null;
  }
  return b.flip !== null && shownReal(b.tree, pieceNow(q, b)) ? b.flip : null;
}
// Keep shelves the entry; That's all judges the whole shelf once, and its
// refusal stands until the shelf changes (Keep and taking back lift it). A
// kept one that gets stuck ("stuck") is left only in saves from before Keep
// waited for one tile.
function shelfMove(q, b, action, entry) {
  const answer = answerOf(q);
  if (action.type === 'keep') {
    if (entry === null || b.shelf.some(x => same(x, entry))) return null;
    return {...b, shelf: [...b.shelf, entry].sort(shelfOrder), told: null, refused: false};
  }
  if (action.type === 'drop') {
    const gone = q.mode === 'seams' ? [action.piece, action.s] : action.i;
    if (!b.shelf.some(x => same(x, gone))) return null;
    return {...b, shelf: b.shelf.filter(x => !same(x, gone)), told: null, refused: false};
  }
  if (action.type === 'all') {
    if (b.refused || !b.shelf.length) return null;
    if (!b.shelf.every(x => answer.some(y => same(x, y)))) return {...b, told: 'stuck', refused: true};
    if (b.shelf.length < answer.length) return {...b, told: 'more', refused: true};
    return {...b, done: true};
  }
  return null;
}
function moveBoard(q, b, action) {
  if (q.mode === 'seams') {
    if (treeAction(action, ['piece'])) {
      if (!int(action.piece) || action.piece < 0 || action.piece >= q.pieces.length) return null;
      const tree = treeMove(b.trees[action.piece], q.pieces[action.piece], action);
      return tree && {...b, trees: b.trees.map((t, i) => i === action.piece ? tree : t)};
    }
    if (action.type === 'keep') {
      if (!keysAre(action, ['piece', 'type']) || !int(action.piece) || action.piece < 0 || action.piece >= q.pieces.length) return null;
      return shelfMove(q, b, action, keepEntry(q, b, action.piece));
    }
    if (action.type === 'drop' && !keysAre(action, ['piece', 's', 'type'])) return null;
    if (action.type === 'all' && !keysAre(action, ['type'])) return null;
    return shelfMove(q, b, action);
  }
  if (q.mode === 'impostor') {
    if (action.type === 'select') {
      if (!keysAre(action, ['a', 'b', 'type']) || !int(action.a) || !int(action.b)) return null;
      const sel = [Math.min(action.a, action.b), Math.max(action.a, action.b)];
      if (sel[0] < 0 || sel[1] >= q.strip.length || sel[1] === sel[0] || sel[1] - sel[0] + 1 > q.k || same(sel, b.sel)) return null;
      return {sel, tree: leaf()};
    }
    if (!treeAction(action) || b.sel === null) return null;
    const tree = treeMove(b.tree, selWord(q, b.sel), action);
    return tree && {...b, tree};
  }
  if (q.mode === 'repair') {
    if (action.type === 'flip') {
      if (!keysAre(action, ['i', 'type']) || !int(action.i) || action.i < 0 || action.i >= q.piece.length) return null;
      return {...b, flip: b.flip === action.i ? null : action.i, tree: leaf()};
    }
    if (treeAction(action)) {
      const tree = treeMove(b.tree, pieceNow(q, b), action);
      return tree && {...b, tree};
    }
    if (action.type === 'keep' && !keysAre(action, ['type'])) return null;
    if (action.type === 'drop' && !(keysAre(action, ['i', 'type']) && int(action.i))) return null;
    if (action.type === 'all' && !keysAre(action, ['type'])) return null;
    return shelfMove(q, b, action, keepEntry(q, b));
  }
  if (action.type === 'grow') return keysAre(action, ['type']) && b.rows < q.rows ? {...b, rows: b.rows + 1} : null;
  if (action.type === 'start') return keysAre(action, ['type']) ? {...b, start: other(b.start)} : null;
  return null;
}
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action) || typeof action.type !== 'string') return null;
  const next = moveBoard(p.parameters, b, action);
  if (!next) return null;
  const state = ui(p);
  state.anchor = null; state.note = null;
  return next;
}

// --- Hints ----------------------------------------------------------------------------
// A hint never judges the child's own tiles, flip or kept seams before the
// child's tree has settled them: until then it leads the child's own
// shrinking (one step at a time), and only a run, flip or way the tree has
// shown to reach one tile, or to be stuck, lets the hint name another.
const wayWords = s => s === 1 ? 'leave the first tile alone' : 'pair the first two tiles';
const seamStep = (w, path, s) => ({type: 'seam', at: path, s, text: `On ${w}, ${wayWords(s)}.`});
// The next step that shows way s of a row gets stuck; null once it is shown.
function wayStep(node, w, path, s) {
  if (deadWay(node, w, s)) return null;
  if (marked(w, s).length) return seamStep(w, path, s);
  if (node.k[s]) return stuckStep(node.k[s], shrinkWord(w, s), path + s);
  return node.s !== s ? seamStep(w, path, s) : {type: 'shrink', at: path, s, text: `Shrink ${w}.`};
}
// The next step that makes a row stuck, depth first; null when it is stuck
// (or can't be: a row that is real).
function stuckStep(node, w, path) {
  for (const s of [0, 1]) { const step = wayStep(node, w, path, s); if (step) return step; }
  return null;
}
// The way a real row fits (two tiles: the only way allowed that shortens).
const fitWay = w => w.length === 2 ? (w[0] === w[1] ? 1 : 0) : [0, 1].find(s => fits(w, s));
// The next step that takes a real row down to one tile along way s.
function realStep(node, w, path, s = fitWay(w)) {
  if (w.length < 2) return null;
  if (node.k[s]) return realStep(node.k[s], shrinkWord(w, s), path + s);
  return node.s !== s ? seamStep(w, path, s) : {type: 'shrink', at: path, s, text: `Shrink ${w}.`};
}
// The shortest run of at most k tiles that no grown row has (leftmost first).
const runCache = new Map();
export function stuckRuns(q) {
  return memo(runCache, JSON.stringify([q.strip, q.k]), () => {
    const out = [];
    for (let len = 2; len <= q.k; len++) for (let a = 0; a + len <= q.strip.length; a++) if (!real(q.strip.slice(a, a + len))) out.push([a, a + len - 1]);
    return out;
  });
}
const hintCache = new Map();
const tileList = (a, z) => a === z ? `tile ${a + 1}` : `tiles ${a + 1} to ${z + 1}`;
const untried = node => !node.t[0] && !node.t[1];
const moveHint = (step, text = step.text, extra = {}) => { const {text: _, ...action} = step; return {type: 'move', action: {...action, ...extra}, text}; };
function hintBoard(q, b) {
  return memo(hintCache, JSON.stringify([q, b]), () => {
    if (q.mode === 'impostor') {
      const [A, Z] = stuckRuns(q)[0], choose = text => ({type: 'move', action: {type: 'select', a: A, b: Z}, text});
      if (b.sel === null) return choose('Choose some tiles and shrink them.');
      const w = selWord(q, b.sel), lead = untried(b.tree) ? `Place seams on ${tileList(...b.sel)} and shrink.` : undefined;
      if (!real(w)) return moveHint(stuckStep(b.tree, w, ''), lead);
      if (!shownReal(b.tree, w)) return moveHint(realStep(b.tree, w, ''), lead);
      const mine = tileList(...b.sel);
      return choose(`${mine[0].toUpperCase()}${mine.slice(1)} can shrink to one tile. Choose ${tileList(A, Z)}.`);
    }
    const answer = answerOf(q), isRight = x => answer.some(y => same(x, y));
    const bad = b.shelf.find(x => !isRight(x));
    if (q.mode === 'seams') {
      if (bad) {
        const [i, s] = bad, w = q.pieces[i], node = b.trees[i];
        if (deadWay(node, w, s)) return {type: 'move', action: {type: 'drop', piece: i, s}, text: `Take back the seams on ${w} that ${wayWords(s)}: that way gets stuck.`};
        const step = wayStep(node, w, '', s);
        return moveHint(step, step.type === 'seam' && step.at === '' ? `Shrink ${w} the way you kept it.` : undefined, {piece: i});
      }
      // Seams the child has placed and not kept are shrunk next, until the
      // tree shows where they lead.
      for (const [i, node] of b.trees.entries()) {
        const s = node.s, w = q.pieces[i];
        if (s === null || b.shelf.some(x => same(x, [i, s]))) continue;
        if (!isRight([i, s])) { if (!deadWay(node, w, s)) return moveHint(wayStep(node, w, '', s), undefined, {piece: i}); continue; }
        if (!(node.k[s] && shownReal(node.k[s], shrinkWord(w, s)))) return moveHint(realStep(node, w, '', s), undefined, {piece: i});
        return {type: 'move', action: {type: 'keep', piece: i}, text: `${w} shrinks to one tile this way. Press Keep.`};
      }
      const missing = answer.find(x => !b.shelf.some(y => same(x, y)));
      if (!missing) return {type: 'move', action: {type: 'all'}, text: 'Every way that can shrink to one tile is kept.'};
      const [i, s] = missing, w = q.pieces[i], node = b.trees[i];
      if (!(node.k[s] && shownReal(node.k[s], shrinkWord(w, s)))) {
        const step = realStep(node, w, '', s);
        return moveHint(step, step.type === 'seam' && step.at === '' ? untried(node) ? `Place seams on ${w} and shrink.` : `Try the other way on ${w}.` : undefined, {piece: i});
      }
      if (node.s !== s) return moveHint(seamStep(w, '', s), undefined, {piece: i});
      return {type: 'move', action: {type: 'keep', piece: i}, text: `${w} shrinks to one tile this way. Press Keep.`};
    }
    const w = pieceNow(q, b), lead = untried(b.tree) ? 'Place seams on the piece and shrink.' : undefined;
    if (bad !== undefined) {
      if (b.flip !== bad) return {type: 'move', action: {type: 'flip', i: bad}, text: 'Check the flips you kept: flip one and shrink the piece.'};
      if (stuck(b.tree, w)) return {type: 'move', action: {type: 'drop', i: bad}, text: `Take back the flip of tile ${bad + 1}: it gets stuck.`};
      return moveHint(stuckStep(b.tree, w, ''), lead);
    }
    const missing = answer.find(x => !b.shelf.includes(x));
    if (missing === undefined) return {type: 'move', action: {type: 'all'}, text: 'Every flip that works is kept.'};
    const tryFix = text => ({type: 'move', action: {type: 'flip', i: missing}, text});
    if (b.flip === null || b.shelf.includes(b.flip)) return tryFix(b.shelf.length ? 'Try another flip.' : 'Flip a tile and shrink the piece.');
    if (isRight(b.flip)) {
      if (shownReal(b.tree, w)) return {type: 'move', action: {type: 'keep'}, text: 'It shrinks to one tile. Press Keep.'};
      return moveHint(realStep(b.tree, w, ''), lead);
    }
    if (stuck(b.tree, w)) return tryFix(`Flip tile ${missing + 1}.`);
    return moveHint(stuckStep(b.tree, w, ''), lead);
  });
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') return {type: 'done'};
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return hintBoard(q, b);
}

// --- View state ---------------------------------------------------------------------------
// anchor: the strip tile tapped first; note: a short refusal of a tap;
// active: the piece in the work area (seams), and trees, the pieces' trees
// last drawn, so that a move or an Undo on another piece brings that piece to
// the work area (on a puzzle's first drawing, the piece of the last move). It
// lasts while a puzzle is on screen: drawing another puzzle clears it.
const uiState = new Map();
let onScreen = null;
const ui = p => memo(uiState, p.id, () => ({anchor: null, note: null, active: 0, trees: null}));
function uiHook(p, payload) {
  if (!object(payload)) return;
  const s = ui(p), q = p.parameters;
  s.note = null;
  if (Object.hasOwn(payload, 'anchor')) s.anchor = int(payload.anchor) && payload.anchor >= 0 && payload.anchor < (q.strip?.length ?? 0) && s.anchor !== payload.anchor ? payload.anchor : null;
  if (payload.far === true) { s.anchor = null; s.note = `At most ${q.k} tiles.`; }
  if (int(payload.active) && payload.active >= 0 && payload.active < (q.pieces?.length ?? 0)) s.active = payload.active;
}

// --- Drawing ----------------------------------------------------------------------------------
const moveAttrs = (action, focus = '') => `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"${focus ? ` data-focus="${esc(focus)}"` : ''}`;
const uiAttrs = (payload, focus = '') => `data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}"${focus ? ` data-focus="${esc(focus)}"` : ''}`;
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const note = text => text ? `<p class="sk-told">${esc(text)}</p>` : '';
const letterClass = c => c === 'A' ? 'a' : 'b';
const tileSpan = (c, cls = '') => `<span class="sk-tile ${letterClass(c)}${cls}" aria-hidden="true">${c}</span>`;
const joinName = (g, n) => g === 0 ? 'at the start' : g === n ? 'at the end' : `between tiles ${g} and ${g + 1}`;
// Claim buttons hand focus back to the board after a move: no element keeps
// their focus key, so the app falls back to the family's focus selector.
const barButton = (label, action, enabled, hinted, cls) => `<button type="button" class="sk-button ${cls}${hinted ? ' hinted' : ''}" ${moveAttrs(action, 'sk-board')} ${enabled ? '' : 'disabled'}>${label}</button>`;

// One row of the tree: its tiles in n + 2 slots (a ghost slot at each end),
// the current seams, the marks of every placement tried, and a button over
// each join (a tap goes to the nearest join). Below it, the shrunk rows of
// each placement shrunk, and a Shrink button where the current placement's
// row will go.
function rowHtml(ctx, node, w, path) {
  const n = w.length, {act, done, base} = ctx;
  const isStuck = stuck(node, w);
  const one = n === 1;
  const slots = [];
  const s = node.s;
  const ghostL = s !== null && ghostBefore(w, s) ? other(w[0]) : null, ghostR = s !== null && ghostAfter(w, s) ? other(w[n - 1]) : null;
  slots.push(`<span class="sk-slot">${ghostL ? `<span class="sk-tile ghost ${letterClass(ghostL)}" aria-hidden="true">${ghostL}</span>` : ''}</span>`);
  [...w].forEach((c, i) => slots.push(`<span class="sk-slot">${tileSpan(c, path === '' && ctx.flip === i ? ' flipped' : '')}</span>`));
  slots.push(`<span class="sk-slot">${ghostR ? `<span class="sk-tile ghost ${letterClass(ghostR)}" aria-hidden="true">${ghostR}</span>` : ''}</span>`);
  const pos = x => `${(x / (n + 2) * 100).toFixed(3)}%`;
  let overlay = '';
  if (s !== null) for (let g = s; g <= n; g += 2) overlay += `<i class="sk-seam" style="left:${pos(g + 1)}" aria-hidden="true"></i>`;
  // Marks of the way not drawn now stay, dimmed, so both ways' marks show.
  for (const p of [0, 1]) if (node.t[p]) for (const i of marked(w, p)) overlay += `<i class="sk-mark ${p ? 'over' : 'under'}${s !== null && s !== p ? ' other' : ''}" style="left:${pos(i + 1)};width:${pos(2)}" aria-hidden="true"></i>`;
  let gaps = '';
  if (!one && !done) {
    // The joins of the ways allowed; join g's line is at slot g + 1.
    const joins = [];
    for (let g = 0; g <= n; g++) if (wayAllowed(w, g % 2)) joins.push(g);
    const hintG = act?.type === 'seam' && act.at === path && (act.piece ?? null) === (ctx.piece ?? null) ? joins.find(g => g % 2 === act.s && g > 0 && g < n) ?? joins.find(g => g % 2 === act.s) : null;
    // Where the taps of two neighbouring joins meet: halfway, except beside a
    // seam already placed, which keeps only a quarter slot on each side. So
    // on a row with seams nearly every tap moves them to the other way (the
    // only change a tap can make), a target a slot and a half wide.
    const on = g => s === g % 2;
    const meet = (g, h) => on(g) && !on(h) ? g + 1.25 : on(h) && !on(g) ? h + 0.75 : (g + h) / 2 + 1;
    joins.forEach((g, j) => {
      const p = g % 2, key = `${base}${path}-${g}`;
      const attrs = on(g) ? `aria-pressed="true" ${uiAttrs({}, key)}` : `aria-pressed="false" ${moveAttrs({type: 'seam', at: path, s: p, ...ctx.extra}, key)}`;
      // The joins at the ends reach the edges.
      const from = j === 0 ? 0 : meet(joins[j - 1], g), to = j === joins.length - 1 ? n + 2 : meet(g, joins[j + 1]);
      gaps += `<button type="button" class="sk-gap${on(g) ? ' on' : ''}${g === hintG ? ' hinted' : ''}" style="left:${pos(from)};width:${pos(to - from)};--at:${((g + 1 - from) / (to - from) * 100).toFixed(2)}%" ${attrs} aria-label="${esc(`Seams ${joinName(g, n)}`)}"></button>`;
    });
  }
  const label = `${w}${s === null ? '' : s ? ', first tile alone' : ', paired from the first tile'}${node.t.some((x, p) => x && marked(w, p).length) ? ', a pair marked' : ''}${isStuck ? ', stuck' : ''}${one ? ', one tile' : ''}`;
  // An untouched row shows a faint tick at each join, where seams can go.
  const row = `<div class="sk-row${isStuck ? ' stuck' : ''}${one ? ' one' : ''}${n + 2 > 12 ? ' long' : ''}${s === null && !one && !done ? ' fresh' : ''}" style="--n:${n + 2}" role="group" aria-label="${esc(label)}">${slots.join('')}${overlay}${gaps}${isStuck ? '<b class="sk-x" aria-hidden="true">✕</b>' : ''}</div>`;
  // Shrunk rows, left for pairing the first two tiles and right for leaving
  // the first tile alone, and Shrink where the current placement's row goes.
  const kids = [];
  for (const p of [0, 1]) {
    if (node.k[p]) kids.push(`<div class="sk-kid${s === p ? ' on' : ''}" style="flex-grow:${widthOf(node.k[p], shrinkWord(w, p))}">${rowHtml(ctx, node.k[p], shrinkWord(w, p), path + p)}</div>`);
    else if (!done && s === p && n >= 2 && !marked(w, p).length && ctx.room && path.length < LIMIT.depth) {
      const hinted = act?.type === 'shrink' && act.at === path ? ' hinted' : '';
      // Focus goes to the new row's first inner join, if it has one.
      const next = shrinkWord(w, p), g = next.length < 2 ? null : wayAllowed(next, 1) ? 1 : 0;
      kids.push(`<div class="sk-kid on" style="flex-grow:4"><button type="button" class="sk-shrink${hinted}" ${moveAttrs({type: 'shrink', at: path, s: p, ...ctx.extra}, g === null ? 'sk-board' : `${base}${path}${p}-${g}`)}>Shrink</button></div>`);
    }
  }
  return `<div class="sk-node">${row}${kids.length ? `<div class="sk-kids${kids.length > 1 ? ' fork' : ''}">${kids.join('')}</div>` : ''}</div>`;
}
// A column's width need: its widest row, in slots.
function widthOf(node, w) {
  let best = w.length + 2;
  for (const p of [0, 1]) if (node.k[p]) best = Math.max(best, widthOf(node.k[p], shrinkWord(w, p)));
  return best;
}
// Words for the tree, for screen readers.
function describeTree(node, w) {
  if (!node) return '';
  const parts = [`${w}${node.s === null ? '' : `, ${wayWords(node.s)}`}${stuck(node, w) ? ', stuck' : ''}${w.length === 1 ? ', one tile' : ''}.`];
  for (const p of [0, 1]) if (node.k[p]) parts.push(`${wayWords(p)}: ${describeTree(node.k[p], shrinkWord(w, p))}`);
  return parts.join(' ');
}
function treeHtml(ctx, tree, w) {
  ctx.room = countNodes(tree) < LIMIT.nodes;
  return `<div class="sk-tree" role="group" aria-label="Shrinking">${rowHtml(ctx, tree, w, '')}</div>`;
}
// A small picture of a piece, with seams or a flipped tile, for the shelf and
// the list of pieces.
function mini(w, opts = {}) {
  const n = w.length, s = opts.s ?? null;
  const cells = [];
  if (s !== null && ghostBefore(w, s)) cells.push(`<i class="ghost ${letterClass(other(w[0]))}">${other(w[0])}</i>`);
  [...w].forEach((c, i) => {
    if (s !== null && i > 0 && (i - s) % 2 === 0) cells.push('<b class="sk-cut"></b>');
    cells.push(`<i class="${letterClass(c)}${opts.flip === i ? ' flipped' : ''}">${c}</i>`);
  });
  if (s !== null && ghostAfter(w, s)) cells.push(`<i class="ghost ${letterClass(other(w[n - 1]))}">${other(w[n - 1])}</i>`);
  return `<span class="sk-mini">${cells.join('')}</span>`;
}

function stripHtml(q, b, state, act, done) {
  // At most eight tiles to a line, so a tile is 40 px wide on a 390 px phone;
  // the repeating strips' lines (blocks of 2, 6 and 8) then line up.
  const n = q.strip.length, lines = Math.ceil(n / 8), per = Math.ceil(n / lines);
  const sel = b.sel, anchor = done ? null : state.anchor;
  const hintSel = act?.type === 'select' ? [act.a, act.b] : null;
  const tiles = [...q.strip].map((c, i) => {
    const inSel = sel && i >= sel[0] && i <= sel[1];
    const cls = `sk-tile ${letterClass(c)}${inSel ? ' sel' : ''}${inSel && done ? ' caught' : ''}${anchor === i ? ' anchor' : ''}${hintSel && i >= hintSel[0] && i <= hintSel[1] ? ' hinted' : ''}`;
    const name = `Tile ${i + 1}, ${c}${inSel ? ', chosen' : ''}${anchor === i ? ', first' : ''}`;
    if (done) return `<span class="${cls}" data-sk-i="${i}" role="img" aria-label="${esc(name)}">${c}</span>`;
    let attrs;
    if (anchor === null || anchor === i) attrs = uiAttrs({anchor: i}, `sk-strip-${i}`);
    else if (Math.abs(i - anchor) + 1 > q.k) attrs = uiAttrs({far: true}, `sk-strip-${i}`);
    // The run already chosen: the tap only lets go of the first tile.
    else if (sel && same(sel, [Math.min(anchor, i), Math.max(anchor, i)])) attrs = uiAttrs({anchor}, `sk-strip-${i}`);
    else attrs = moveAttrs({type: 'select', a: Math.min(anchor, i), b: Math.max(anchor, i)}, `sk-strip-${i}`);
    return `<button type="button" class="${cls}" data-sk-i="${i}" ${attrs} aria-pressed="${anchor === i}" aria-label="${esc(name)}">${c}</button>`;
  });
  const rows = [];
  for (let k = 0; k < lines; k++) rows.push(`<div class="sk-line${q.endless ? ' endless' : ''}" style="--c:${per}">${tiles.slice(k * per, (k + 1) * per).join('')}${k === lines - 1 && q.endless ? '<span class="sk-more" aria-hidden="true">…</span>' : ''}</div>`);
  return `<div class="sk-strip${done ? '' : ' live'}" data-sk-strip="${n}" role="group" aria-label="${esc(`Strip ${q.strip}${q.endless ? ', repeating forever' : ''}`)}">${rows.join('')}</div>`;
}

// The piece the last move on a piece changed (its tree, or its kept way;
// That's all changes neither), so that a puzzle opened again, or reloaded,
// shows the piece the child was working on; -1 when no move goes by one.
function lastPiece(p, a) {
  let after = a.board;
  for (let i = (a.history?.length ?? 0) - 1; i >= 0; i--) {
    const before = a.history[i]?.board;
    if (!valid(p, before)) return -1;
    const tree = after.trees.findIndex((t, j) => !same(t, before.trees[j]));
    if (tree >= 0) return tree;
    const moved = [...after.shelf.filter(x => !before.shelf.some(y => same(x, y))), ...before.shelf.filter(x => !after.shelf.some(y => same(x, y)))][0];
    if (moved) return moved[0];
    after = before;
  }
  return -1;
}
function render(p, a) {
  if (onScreen !== p.id) { uiState.clear(); onScreen = p.id; }
  const q = p.parameters, b = a.board, state = ui(p);
  if (q.mode === 'playground') return renderPlayground(p, a);
  if (q.mode === 'seams' && valid(p, b)) {
    const trees = b.trees.map(t => JSON.stringify(t)), changed = state.trees ? trees.findIndex((t, i) => t !== state.trees[i]) : lastPiece(p, a);
    if (changed >= 0) state.active = changed;
    state.trees = trees;
  }
  const done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = shown?.type === 'move' ? shown.action : null;
  let top = '', work = '', bar = '', shelf = '', said = state.note || '', words = '';
  if (q.mode === 'impostor') {
    top = stripHtml(q, b, ui(p), act, done);
    if (b.sel) {
      const w = selWord(q, b.sel);
      work = treeHtml({act, done, base: 'sk-g', extra: {}}, b.tree, w);
      words = `Chosen ${tileList(b.sel[0], b.sel[1])}: ${describeTree(b.tree, w)}`;
    } else words = 'No tiles chosen.';
  } else if (q.mode === 'repair') {
    const w = pieceNow(q, b);
    const tiles = [...w].map((c, i) => {
      const flipped = b.flip === i, hinted = act?.type === 'flip' && act.i === i ? ' hinted' : '';
      const cls = `sk-tile ${letterClass(c)}${flipped ? ' flipped' : ''}${hinted}`;
      const name = `Tile ${i + 1}, ${c}${flipped ? ', flipped' : ''}`;
      if (done) return `<span class="${cls}" role="img" aria-label="${esc(name)}">${c}</span>`;
      return `<button type="button" class="${cls}" ${moveAttrs({type: 'flip', i}, `sk-piece-${i}`)} aria-pressed="${flipped}" aria-label="${esc(name)}">${c}</button>`;
    });
    top = `<div class="sk-strip sk-piece" role="group" aria-label="Piece"><div class="sk-line" style="--c:${w.length}">${tiles.join('')}</div></div>`;
    work = done ? '' : treeHtml({act, done, base: 'sk-g', extra: {}, flip: b.flip}, b.tree, w);
    words = `${b.flip === null ? 'No tile flipped' : `Tile ${b.flip + 1} flipped`}. ${done ? '' : describeTree(b.tree, w)}`;
  } else {
    const active = Math.min(state.active, q.pieces.length - 1);
    const hintPiece = act && Object.hasOwn(act, 'piece') ? act.piece : null;
    top = `<div class="sk-pieces" role="group" aria-label="Pieces">${q.pieces.map((w, i) => {
      const on = active === i && !done, hinted = hintPiece === i && hintPiece !== active && act.type !== 'drop' ? ' hinted' : '';
      if (done) return `<span class="sk-pick" role="img" aria-label="${esc(w)}">${mini(w)}</span>`;
      return `<button type="button" class="sk-pick${on ? ' on' : ''}${hinted}" ${uiAttrs({active: i}, `sk-pick-${i}`)} aria-pressed="${on}" aria-label="${esc(w)}">${mini(w)}</button>`;
    }).join('')}</div>`;
    if (!done) work = treeHtml({act: hintPiece === active ? act : null, done, base: `sk-g${active}-`, piece: active, extra: {piece: active}}, b.trees[active], q.pieces[active]);
    words = done ? '' : `Working on ${q.pieces[active]}: ${describeTree(b.trees[active], q.pieces[active])}`;
  }
  if (q.mode !== 'impostor') {
    const active = q.mode === 'seams' ? Math.min(state.active, q.pieces.length - 1) : null;
    const entry = keepEntry(q, b, active);
    if (!done) {
      const keepAction = q.mode === 'seams' ? {type: 'keep', piece: active} : {type: 'keep'};
      bar = `<div class="sk-bar">${barButton('Keep', keepAction, entry !== null && !b.shelf.some(x => same(x, entry)), act?.type === 'keep' && (act.piece ?? active) === active, 'sk-keep')}${barButton('That’s all', {type: 'all'}, !b.refused && b.shelf.length > 0, act?.type === 'all', 'sk-all')}</div>`;
    }
    if (b.shelf.length) {
      const item = x => {
        const pic = q.mode === 'seams' ? mini(q.pieces[x[0]], {s: x[1]}) : mini(flipAt(q.piece, x), {flip: x});
        const name = q.mode === 'seams' ? `${q.pieces[x[0]]}, ${wayWords(x[1])}` : `Flip tile ${x + 1}`;
        const hinted = act?.type === 'drop' && (q.mode === 'seams' ? act.piece === x[0] && act.s === x[1] : act.i === x) ? ' hinted' : '';
        if (done) return `<li><span class="sk-kept" role="img" aria-label="${esc(name)}">${pic}</span></li>`;
        const dropAction = q.mode === 'seams' ? {type: 'drop', piece: x[0], s: x[1]} : {type: 'drop', i: x};
        return `<li><button type="button" class="sk-kept${hinted}" ${moveAttrs(dropAction, 'sk-board')} aria-label="${esc(`Take back: ${name}`)}">${pic}</button></li>`;
      };
      shelf = `<ol class="sk-shelf${done ? ' done' : ''}" aria-label="Kept">${b.shelf.map(item).join('')}</ol>`;
    }
    if (b.told === 'stuck') said = 'One of these gets stuck.';
    if (b.told === 'more') said = 'There is another.';
  }
  return `<div class="sk-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="shrink">${top}${work}${bar}${note(said)}${shelf}${status(`${words}${said ? ` ${said}` : ''}`)}</div>`;
}

// The playground: rows grown from one tile, each pair under the tile it grew
// from. The top tile flips between A and B.
function renderPlayground(p, a) {
  const q = p.parameters, b = a.board;
  const rows = [b.start];
  while (rows.length < b.rows) rows.push(grow(rows.at(-1)));
  const width = 2 ** (b.rows - 1);
  const html = rows.map((w, d) => {
    const span = width / w.length;
    const tiles = [...w].map((c, i) => {
      const style = `grid-column:${i * span + 1} / span ${span}`;
      if (d === 0) return `<button type="button" class="sk-tile ${letterClass(c)}" style="${style}" ${moveAttrs({type: 'start'}, 'sk-start')} aria-label="${esc(`Start from ${other(c)}`)}">${c}</button>`;
      return `<span class="sk-cell" style="${style}"><span class="sk-tile ${letterClass(c)}${i % 2 ? ' right' : ' left'}" aria-hidden="true">${c}</span></span>`;
    }).join('');
    return `<div class="sk-grown" style="--n:${width}" role="img" aria-label="${esc(w)}">${tiles}</div>`;
  }).join('');
  const bar = `<div class="sk-bar">${`<button type="button" class="sk-button sk-grow" ${moveAttrs({type: 'grow'}, 'sk-grow')} ${b.rows < q.rows ? '' : 'disabled'}>Grow</button>`}</div>`;
  return `<div class="sk-puzzle mode-playground" data-mechanic-wire="shrink"><div class="sk-garden">${html}</div>${bar}${status(rows.join(', then '))}</div>`;
}

// --- Gestures ------------------------------------------------------------------------------------
// A slide along the strip chooses the tiles between where it starts and ends.
// The browser's own click for the slide is swallowed here, so a slide is not
// also a tap.
// On a phone the strip and the rows reach to 2 px from the panel's edges
// (CSS reads --sk-bleed), so their tiles and joins are as wide as the screen
// allows. The panel's padding changes with the window's width, so the bleed is
// measured again whenever the window changes size.
function setBleed(root) {
  const panel = root.closest('.board-panel');
  if (panel) root.style.setProperty('--sk-bleed', `${Math.max(0, (parseFloat(getComputedStyle(panel).paddingLeft) || 0) - 2)}px`);
}
let resizing = false;
function wire(root, p, api) {
  const q = p.parameters;
  setBleed(root);
  if (!resizing) {
    window.addEventListener('resize', () => document.querySelectorAll('[data-mechanic-wire="shrink"]').forEach(setBleed));
    resizing = true;
  }
  if (q.mode !== 'impostor') return;
  const strip = root.querySelector('.sk-strip.live');
  if (!strip) return;
  let drag = null, slid = false;
  const tileAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sk-i]'); return el && strip.contains(el) ? Number(el.dataset.skI) : null; };
  const mark = (a, z) => strip.querySelectorAll('[data-sk-i]').forEach(el => { const i = Number(el.dataset.skI); el.classList.toggle('sliding', a !== null && i >= Math.min(a, z) && i <= Math.max(a, z)); });
  root.addEventListener('click', e => { if (slid) { e.stopPropagation(); e.preventDefault(); } }, true);
  strip.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    const i = tileAt(e);
    if (i === null) return;
    drag = {id: e.pointerId, from: i, to: i};
  });
  // The strip takes the pointer only once it slides to another tile, so a
  // plain tap still clicks the tile under it.
  strip.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const i = tileAt(e);
    if (i === null || i === drag.to) return;
    if (!strip.hasPointerCapture?.(e.pointerId)) strip.setPointerCapture?.(e.pointerId);
    drag.to = i;
    mark(drag.from, drag.to);
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.from === d.to) return;
    slid = true;
    mark(null, null);
    setTimeout(() => {
      slid = false;
      if (e.type !== 'pointerup') return;
      if (Math.abs(d.to - d.from) + 1 > q.k) { api.ui({far: true}); return; }
      const b = api.attempt().board, sel = [Math.min(d.from, d.to), Math.max(d.from, d.to)];
      if (!same(sel, b.sel)) api.apply({type: 'select', a: sel[0], b: sel[1]});
    }, 0);
  };
  strip.addEventListener('pointerup', end);
  strip.addEventListener('pointercancel', end);
}

export const shrinkMechanics = {
  shrink: {
    fresh, valid, solved, move, hint, render, wire,
    ui: uiHook,
    reset: p => { uiState.delete(p.id); },
    noHint: p => p.parameters.mode === 'playground',
    // Undo takes back moves, not claims: a refused That's all stays refused
    // until the shelf changes. Its note goes, so the Undo shows.
    carry(p, from, to) {
      if (!object(from) || !object(to) || !['seams', 'repair'].includes(p.parameters.mode)) return to;
      if (from.refused && !to.refused && same(from.shelf, to.shelf)) return {...to, refused: true};
      return to;
    }
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'shrink',
  family: {id: 'shrink', symbol: '⇊', area: 'patterns', region: 'counting'},
  mechanics: shrinkMechanics,
  pack: new URL('./shrink.json', import.meta.url).href,
  css: new URL('./shrink.css', import.meta.url).href,
  focus: '[data-mechanic-wire="shrink"] button.sk-gap,[data-mechanic-wire="shrink"] button.sk-shrink,[data-mechanic-wire="shrink"] .sk-strip button.sk-tile,[data-mechanic-wire="shrink"] button.sk-pick,[data-mechanic-wire="shrink"] button.sk-grow:not([disabled]),[data-mechanic-wire="shrink"] .sk-grown button.sk-tile'
};
