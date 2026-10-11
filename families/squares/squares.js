// Squares, a group in Tile gardens (worksheet Week 32, squares inside
// rectangles, and its bonus "Square recipes encore"). Square pieces of any
// size tile a rectangle on the shared square grid (dist/sq-grid.js).
//
// - Fewest: fill a rectangle with as few squares as possible and press Done;
//   the app checks the count is the fewest. The biggest-square rule is not
//   always fewest (6 × 5: the rule uses 6, five fit).
// - Fill: only 2 × 2 and 3 × 3 squares. Fill the rectangle, or press Can't
//   and tap rows (or columns) that each need their own 3 × 3 square, more of
//   them than fit: the certificate.
// - Four: arrange four 3 × 3 squares into rectangles; the app runs the
//   biggest-square rule on each one made. Two rectangles, different last
//   squares (12 × 3 ends on 3, 6 × 6 on 6).
// - Design: size a rectangle, then Cut runs the biggest-square rule as the
//   check: last square 3 with three different first squares; a recipe of
//   counts; five different sizes within 15.
// - Playground: size a rectangle and cut its biggest squares one at a time.
// The mathematics is in squaremath.js and docs/squares/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';
import {
  cutsOf, lastOf, firstOf, kindsOf, recipeOf, sameList, squaresOk, fullBoard, rectangleOf, rectKey, keyRect,
  cellsOfSquare, overlap, insideBoard, fewestCover, fillCover, certificateOk, certificateFor, pickProblem,
  maxThrees, packedThrees, squareToward, lineCount, forgetSearches
} from './squaremath.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
const keysAre = (b, list) => object(b) && Object.keys(b).sort().join() === [...list].sort().join();
export const MODES = ['fewest', 'fill', 'four', 'design', 'playground'];
const placing = q => ['fewest', 'fill', 'four'].includes(q.mode);
const sizing = q => q.mode === 'design' || q.mode === 'playground';
// The sizes a placing puzzle allows (null: any).
const sizesFor = q => q.mode === 'fill' ? q.sizes : q.mode === 'four' ? [q.size] : null;

/* --------------------------------------------------------------------- *
 * Boards
 * --------------------------------------------------------------------- */
// fewest: {sq, done, fewer}   fill: {sq, claim}   four: {sq, found}
// design: {w, h, cut, found}  playground: {w, h, n}
// `sq` lists the squares placed, oldest first. `fewer` is the smallest count
// a Done was refused at: fewer squares fit than that, which Undo keeps.
// `claim` is a certificate of lines, kept once right. `found` lists the
// rectangles kept (four: keys such as "12x3"; design: [w, h]). `cut` says
// the rule has run on the rectangle shown; `n` counts the playground's cuts.
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'fewest') return {sq: [], done: false, fewer: null};
  if (q.mode === 'fill') return {sq: [], claim: null};
  if (q.mode === 'four') return {sq: [], found: []};
  if (q.mode === 'design') return {w: 0, h: 0, cut: false, found: []};
  return {w: q.start[0], h: q.start[1], n: 0};
}
// The rectangles four equal squares make, up to turning: 4s × s and 2s × 2s.
export const fourKeys = s => [rectKey(4 * s, s), rectKey(2 * s, 2 * s)];
// What a design puzzle keeps: a rectangle whose last square is the goal's.
const keeps = (q, w, h) => q.goal === 'last' && w > 0 && h > 0 && lastOf(w, h) === q.last;
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (placing(q) && !squaresOk(q.cols, q.rows, b.sq, sizesFor(q))) return false;
  if (q.mode === 'fewest') {
    if (!keysAre(b, ['sq', 'done', 'fewer']) || typeof b.done !== 'boolean') return false;
    if (b.done && !(fullBoard(q.cols, q.rows, b.sq) && b.sq.length === q.fewest)) return false;
    return b.fewer === null || (int(b.fewer) && b.fewer > q.fewest && b.fewer <= q.cols * q.rows);
  }
  // A claim comes after a try: it is drawn round squares on the board.
  if (q.mode === 'fill') return keysAre(b, ['sq', 'claim']) && (b.claim === null || (b.sq.length > 0 && keysAre(b.claim, ['dir', 'at']) && certificateOk(q.cols, q.rows, b.claim)));
  if (q.mode === 'four') {
    if (!keysAre(b, ['sq', 'found']) || b.sq.length > q.count || !Array.isArray(b.found)) return false;
    const allowed = fourKeys(q.size);
    if (!b.found.every(k => allowed.includes(k)) || new Set(b.found).size !== b.found.length) return false;
    // A rectangle of all four is kept the moment it is made.
    const r = b.sq.length === q.count ? rectangleOf(b.sq) : null;
    return !r || b.found.includes(rectKey(r[2], r[3]));
  }
  const inArea = (w, h) => int(w) && int(h) && w >= 0 && h >= 0 && w <= q.cols && h <= q.rows && (w === 0) === (h === 0);
  if (q.mode === 'playground') return keysAre(b, ['w', 'h', 'n']) && inArea(b.w, b.h) && b.w > 0 && int(b.n) && b.n >= 0 && b.n <= cutsOf(b.w, b.h).length;
  if (!keysAre(b, ['w', 'h', 'cut', 'found']) || !inArea(b.w, b.h) || typeof b.cut !== 'boolean' || (b.cut && !b.w) || !Array.isArray(b.found)) return false;
  if (q.goal !== 'last') return b.found.length === 0;
  const firsts = b.found.map(r => Array.isArray(r) && r.length === 2 && inArea(r[0], r[1]) && r[0] > 0 && keeps(q, r[0], r[1]) ? firstOf(r[0], r[1]) : null);
  if (firsts.includes(null) || new Set(firsts).size !== firsts.length || b.found.length > q.need) return false;
  // A rectangle kept is kept when it is cut.
  return !(b.cut && keeps(q, b.w, b.h)) || firsts.includes(firstOf(b.w, b.h));
}
// Which last squares the rectangles found end with.
const lastsOf = keys => new Set(keys.map(k => lastOf(...keyRect(k))));
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'fewest') return b.done;
  if (q.mode === 'fill') return b.claim !== null || fullBoard(q.cols, q.rows, b.sq);
  if (q.mode === 'four') return lastsOf(b.found).size >= q.need;
  if (q.goal === 'last') return b.found.length >= q.need;
  if (!b.cut) return false;
  return q.goal === 'recipe' ? sameList(recipeOf(b.w, b.h), q.recipe) : kindsOf(b.w, b.h) >= q.kinds;
}

/* --------------------------------------------------------------------- *
 * Moves
 * --------------------------------------------------------------------- */
// place {x, y, s}, lift {x, y} (the square with that top-left), clear,
// done, cant {dir, at}, size {w, h}, cut.
function placeSquare(p, b, action) {
  const q = p.parameters, s = action.s, square = [action.x, action.y, s], sizes = sizesFor(q);
  if (![action.x, action.y, s].every(int) || s < 1 || (sizes && !sizes.includes(s)) || !insideBoard(q.cols, q.rows, square)) return null;
  if (b.sq.some(other => overlap(other, square)) || (q.mode === 'four' && b.sq.length >= q.count)) return null;
  const sq = [...b.sq, square];
  if (q.mode === 'four') {
    const r = sq.length === q.count ? rectangleOf(sq) : null, key = r && rectKey(r[2], r[3]);
    return {...b, sq, found: key && !b.found.includes(key) ? [...b.found, key] : b.found};
  }
  return {...b, sq, ...(q.mode === 'fewest' ? {done: false} : {})};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (placing(q) && action.type === 'place') next = placeSquare(p, b, action);
  else if (placing(q) && action.type === 'lift') {
    const i = b.sq.findIndex(s => s[0] === action.x && s[1] === action.y);
    if (i >= 0) next = {...b, sq: b.sq.filter((_, j) => j !== i)};
  } else if (placing(q) && action.type === 'clear') { if (b.sq.length) next = {...b, sq: []}; }
  else if (q.mode === 'fewest' && action.type === 'done') {
    // Done answers once for each count: a refused count stays refused.
    const n = b.sq.length;
    if (fullBoard(q.cols, q.rows, b.sq) && (b.fewer === null || n < b.fewer)) next = n === q.fewest ? {...b, done: true} : {...b, fewer: n};
  } else if (q.mode === 'fill' && action.type === 'cant') {
    const claim = {dir: action.dir, at: Array.isArray(action.at) ? [...action.at].sort((x, y) => x - y) : null};
    if (b.sq.length && certificateOk(q.cols, q.rows, claim)) next = {...b, claim};
  } else if (sizing(q) && action.type === 'size') {
    const {w, h} = action;
    if (int(w) && int(h) && w >= 1 && h >= 1 && w <= q.cols && h <= q.rows) next = w === b.w && h === b.h ? b : q.mode === 'playground' ? {w, h, n: 0} : {...b, w, h, cut: false};
  } else if (q.mode === 'design' && action.type === 'cut') {
    if (b.w && !b.cut) {
      const kept = keeps(q, b.w, b.h) && !b.found.some(r => firstOf(...r) === firstOf(b.w, b.h));
      next = {...b, cut: true, found: kept ? [...b.found, [b.w, b.h]] : b.found};
    }
  } else if (q.mode === 'playground' && action.type === 'cut') { if (b.n < cutsOf(b.w, b.h).length) next = {...b, n: b.n + 1}; }
  if (next) Object.assign(ui(p), blankView());
  return next;
}

/* --------------------------------------------------------------------- *
 * Hints: the next move towards a solve that keeps as much of the child's
 * work as it can, memoised per board.
 * --------------------------------------------------------------------- */
const at = (x, y) => `row ${y + 1}, column ${x + 1}`;
const by = s => `${s} by ${s}`;
const lineWords = (dir, list) => {
  const names = list.map(k => k + 1), word = dir === 'row' ? 'row' : 'column';
  return names.length === 1 ? `${word[0].toUpperCase()}${word.slice(1)} ${names[0]}` : `${word[0].toUpperCase()}${word.slice(1)}s ${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
};
const placeHint = q => ({type: 'move', action: {type: 'place', x: q[0], y: q[1], s: q[2]}, text: `Put a ${by(q[2])} square at ${at(q[0], q[1])}.`});
const liftHint = q => ({type: 'move', action: {type: 'lift', x: q[0], y: q[1]}, text: `Lift the ${by(q[2])} square at ${at(q[0], q[1])}.`});
// Keep the child's squares when a completion fits beside them; else lift the
// newest square that stops one; else clear.
function towards(b, complete) {
  const rest = complete(b.sq);
  if (rest) return rest.length ? placeHint(rest[0]) : null;
  for (let i = b.sq.length - 1; i >= 0; i--) if (complete(b.sq.filter((_, j) => j !== i))) return liftHint(b.sq[i]);
  return {type: 'move', action: {type: 'clear'}, text: 'Clear the squares and start again.'};
}
function fewestHint(p, b) {
  const q = p.parameters, n = b.sq.length;
  if (fullBoard(q.cols, q.rows, b.sq) && n === q.fewest) return {type: 'move', action: {type: 'done'}, text: 'Press Done.'};
  return towards(b, list => q.fewest - list.length < 0 ? null : fewestCover(q.cols, q.rows, list, q.fewest - list.length));
}
function fillHint(p, b) {
  const q = p.parameters, claim = certificateFor(q.cols, q.rows);
  if (!fillCover(q.cols, q.rows, [], q.sizes)) {
    // Can't comes after a try: first a square, then the reason and the claim.
    if (!b.sq.length) { const s = Math.max(...q.sizes.filter(t => t <= Math.min(q.cols, q.rows))); return placeHint([0, 0, s]); }
    const lines = lineWords(claim.dir, claim.at), word = claim.dir === 'row' ? 'row' : 'column', fit = maxThrees(q.cols, q.rows), many = claim.at.length;
    return {type: 'move', action: {type: 'cant', ...claim}, text: `A ${word} of ${claim.dir === 'row' ? q.cols : q.rows} can’t be all 2s, so a ${by(3)} square crosses it. ${lines} ${many === 1 ? 'needs one' : 'need different ones'}, and ${fit === 0 ? 'none fits' : fit === 1 ? 'only one fits' : `only ${String(NUMBER[fit] ?? fit).toLowerCase()} fit`}. Press Can’t and tap ${many === 1 ? 'it' : many === 2 ? 'both' : 'all three'}.`};
  }
  return towards(b, list => fillCover(q.cols, q.rows, list, q.sizes));
}
// Four: the missing rectangle, placed where it keeps the most squares.
function fourHint(p, b) {
  const q = p.parameters, s = q.size, want = fourKeys(s).find(k => !b.found.includes(k));
  if (!want) return null;
  const [long, short] = keyRect(want), shapes = long === short ? [[long, short]] : [[long, short], [short, long]];
  let best = null;
  for (const [w, h] of shapes) for (let y = 0; y + h <= q.rows; y += 1) for (let x = 0; x + w <= q.cols; x += 1) {
    const target = [];
    for (let j = 0; j < h; j += s) for (let i = 0; i < w; i += s) target.push([x + i, y + j, s]);
    const kept = b.sq.filter(t => target.some(u => u[0] === t[0] && u[1] === t[1])).length;
    if (!best || kept > best.kept) best = {target, kept};
  }
  const stray = [...b.sq].reverse().find(t => !best.target.some(u => u[0] === t[0] && u[1] === t[1]));
  if (stray) return liftHint(stray);
  return placeHint(best.target.find(u => !b.sq.some(t => t[0] === u[0] && t[1] === u[1])));
}
// Design: a rectangle that meets the goal, turned the way the child's is.
export function designTargets(q) {
  const out = [];
  for (let w = 1; w <= q.cols; w++) for (let h = 1; h <= q.rows; h++) {
    if (q.goal === 'last' ? keeps(q, w, h) : q.goal === 'recipe' ? sameList(recipeOf(w, h), q.recipe) : kindsOf(w, h) >= q.kinds) out.push([w, h]);
  }
  return out;
}
// The rungs a recipe or a run of sizes is built on, smallest first, each
// [long, short, added]: the next rung adds `added` squares, as big as this
// rung's long side, along that side. A recipe is built backwards from its
// last squares (2, 1, 2: 2 by 1, 3 by 2, 8 by 3); five sizes come from adding
// one square at a time (3 by 2, 5 by 3, 8 by 5, 13 by 8).
export function designLadder(q) {
  if (q.goal === 'recipe') {
    const counts = [...q.recipe].reverse(), out = [[counts[0], 1, counts[0]]];
    for (const c of counts.slice(1)) { const [L, S] = out.at(-1); out.push([c * L + S, L, c]); }
    return out;
  }
  const out = [[3, 2, 1]];
  while (out.length < q.kinds - 1) { const [L, S] = out.at(-1); out.push([L + S, L, 1]); }
  return out;
}
// Recipe and five sizes: climb the ladder from the rung the child is on, or
// from a rung below the last one, so a hint after a wrong move never names
// the answer.
function ladderHint(q, b) {
  const rungs = designLadder(q), tall = b.w > 0 && b.h > b.w;
  const turn = ([L, S]) => tall ? [S, L] : [L, S];
  const on = b.w ? rungs.findIndex(([L, S]) => L === Math.max(b.w, b.h) && S === Math.min(b.w, b.h)) : -1;
  if (on >= 0 && !b.cut) return {type: 'move', action: {type: 'cut'}, text: 'Press Cut.'};
  let next, text;
  if (on >= 0) {
    next = rungs[on + 1];
    const [L] = rungs[on], c = next[2], [w, h] = turn(next);
    text = `Add ${c === 1 ? (/^(8|11|18)$/.test(String(L)) || String(L).startsWith('8') ? 'an' : 'a') : String(NUMBER[c] ?? c).toLowerCase()} ${by(L)} square${c === 1 ? '' : 's'} along the long side: make it ${w} by ${h}.`;
  } else {
    const level = q.goal === 'kinds' && b.w ? Math.min(Math.max(kindsOf(b.w, b.h) - 2, 0), rungs.length - 2) : 0;
    next = rungs[level];
    const [w, h] = turn(next);
    text = level ? `Make it ${w} by ${h}.` : q.goal === 'recipe' ? `Start from the card’s end: make it ${w} by ${h}.` : `Start small: make it ${w} by ${h}.`;
  }
  const [w, h] = turn(next);
  return {type: 'move', action: {type: 'size', w, h}, text};
}
function designHint(p, b) {
  const q = p.parameters, firsts = b.found.map(r => firstOf(...r));
  if (q.goal !== 'last') return ladderHint(q, b);
  const options = designTargets(q).filter(([w, h]) => q.goal !== 'last' || !firsts.includes(firstOf(w, h)));
  const tall = b.h > b.w, score = ([w, h]) => (h > w) === tall ? Math.min(w, h) * 100 + w + h : 10000 + w + h;
  const [w, h] = [...options].sort((x, y) => score(x) - score(y))[0];
  if (b.w === w && b.h === h && !b.cut) return {type: 'move', action: {type: 'cut'}, text: 'Press Cut.'};
  return {type: 'move', action: {type: 'size', w, h}, text: `Make it ${w} by ${h}.`, corner: [w - 1, h - 1]};
}
const hintMemo = new Map();
// Forget every hint and search (the validator times hints cold).
export const forgetHints = () => { hintMemo.clear(); forgetSearches(); };
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}:${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const h = (q.mode === 'fewest' ? fewestHint : q.mode === 'fill' ? fillHint : q.mode === 'four' ? fourHint : designHint)(p, b) || {type: 'done'};
  if (hintMemo.size > 500) hintMemo.clear();
  hintMemo.set(key, h);
  return h;
}

/* --------------------------------------------------------------------- *
 * View state, outside the save: the corner chosen by a first tap, the Can't
 * picker and its refusal.
 * --------------------------------------------------------------------- */
// The view state belongs to one board: when the board changes by anything
// but a move (Undo, a save restored), it starts again, so the Can't picker
// never outlives the squares it was opened on.
const uiState = new Map();
const blankView = () => ({corner: null, claiming: false, picks: {dir: null, at: []}, said: null, fits: false, board: null});
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
const SAID = {
  even: {row: '2s can fill that row.', col: '2s can fill that column.'},
  cross: 'One 3 by 3 square can cross both.'
};
// Said when no line can join the lines picked and they are too few: how many
// 3 by 3 squares fit (drawn dashed).
const NUMBER = ['No', 'One', 'Two', 'Three', 'Four', 'Five'];
export const fitWords = n => `${NUMBER[n] ?? n} 3 by 3 ${n === 1 ? 'square fits' : 'squares fit'}.`;
// The picked lines are too few and no other line can join them.
export const stuckPicks = (cols, rows, picks) => picks.at.length > 0 && !certificateOk(cols, rows, picks) &&
  Array.from({length: lineCount(cols, rows, picks.dir)}, (_, k) => k).every(k => picks.at.includes(k) || pickProblem(cols, rows, picks, picks.dir, k));

// A tap on a line's tab: drop it if picked; else refuse it in a word, or
// pick it, and make the claim once the lines are a certificate. Too few lines
// with none able to join: say how many 3s fit, and draw them only when the
// rectangle can't be filled (where it can, they are half a filling).
export function pickLine(q, picks, dir, at) {
  if (picks.dir === dir && picks.at.includes(at)) return {picks: {dir: picks.at.length > 1 ? dir : null, at: picks.at.filter(j => j !== at)}, said: null, fits: false};
  const problem = pickProblem(q.cols, q.rows, picks, dir, at);
  if (problem) return {said: problem === 'even' ? SAID.even[dir] : SAID.cross, fits: false};
  const next = {dir, at: [...picks.at, at].sort((x, y) => x - y)};
  if (certificateOk(q.cols, q.rows, next)) return {claim: next};
  const stuck = stuckPicks(q.cols, q.rows, next), fills = Boolean(fillCover(q.cols, q.rows, [], q.sizes));
  return {picks: next, said: stuck ? fitWords(maxThrees(q.cols, q.rows)) : null, fits: stuck && !fills};
}

/* --------------------------------------------------------------------- *
 * Drawing
 * --------------------------------------------------------------------- */
const f = n => Number(n.toFixed(2));
const U = UNIT;
const sizeClass = s => `s${Math.min(s, 8)}`;
const cellName = (x, y) => `Row ${y + 1}, column ${x + 1}`;
const numeral = ([x, y, s], cls = '') => `<text class="sq-num ${cls}" x="${f((x + s / 2) * U)}" y="${f((y + s / 2) * U)}" style="font-size:${f(Math.min(4.6 + 1.9 * s, 15))}px">${s}</text>`;
const outline = ([x, y, s], cls) => `<rect class="${cls}" x="${f(x * U)}" y="${f(y * U)}" width="${f(s * U)}" height="${f(s * U)}"/>`;
// Side lengths beside a rectangle [x, y, w, h]: across the top and down the left.
// Their size grows with the board, so they stay legible on a phone.
const sideSize = q => Math.max(5.6, .6 * Math.max(q.cols, q.rows));
const padFor = q => Math.max(1.15, sideSize(q) * 1.6 / U);
const sides = ([x, y, w, h], size) => `<text class="sq-side" x="${f((x + w / 2) * U)}" y="${f(y * U - size * .55)}" style="font-size:${f(size)}px">${w}</text><text class="sq-side sq-side-left" x="${f(x * U - size * .55)}" y="${f((y + h / 2) * U)}" style="font-size:${f(size)}px">${h}</text>`;
// The rule's cuts on a rectangle at (x0, y0): ink squares with their sizes and
// a ring round the last one. `upto` shows only the first cuts (playground).
function cutLayer(x0, y0, w, h, {upto = Infinity, filled = false} = {}) {
  const cuts = cutsOf(w, h, x0, y0).slice(0, upto), last = cuts.length === cutsOf(w, h).length ? cuts.at(-1) : null;
  const fills = filled ? cuts.map(c => outline(c, `sq-cut-fill ${sizeClass(c[2])}`)).join('') : '';
  return `<g class="sq-cuts">${fills}${cuts.map(c => outline(c, 'sq-cut-line')).join('')}${last ? outline(last, 'sq-last') : ''}${cuts.map(c => numeral(c, 'on-cut')).join('')}</g>`;
}
// A small picture of a rectangle and its cuts (the shelf).
export function mini(w, h, label, cls = '') {
  const cuts = cutsOf(w, h), last = cuts.at(-1), k = 10, pad = 1.5;
  return `<svg class="sq-mini ${cls}" viewBox="${-pad} ${-pad} ${w * k + 2 * pad} ${h * k + 2 * pad}" role="img" aria-label="${esc(label)}">${cuts.map(([x, y, s]) => `<rect class="sq-mini-sq ${sizeClass(s)}" x="${x * k}" y="${y * k}" width="${s * k}" height="${s * k}"/>`).join('')}<rect class="sq-mini-last" x="${last[0] * k}" y="${last[1] * k}" width="${last[2] * k}" height="${last[2] * k}"/></svg>`;
}
// The rectangles kept, and nothing before the first.
const shelfHtml = (items, label) => items.length ? `<ol class="sq-shelf" aria-label="${esc(label)}">${items.join('')}</ol>` : '';
const squareIcon = (s, scale = 7) => `<svg class="sq-icon" viewBox="0 0 ${s * scale + 2} ${s * scale + 2}" style="width:${s * scale + 2}px" aria-hidden="true"><rect class="${sizeClass(s)}" x="1" y="1" width="${s * scale}" height="${s * scale}"/>${Array.from({length: s - 1}, (_, k) => `<path class="sq-icon-grid" d="M${1 + (k + 1) * scale} 1V${1 + s * scale}M1 ${1 + (k + 1) * scale}H${1 + s * scale}"/>`).join('')}</svg>`;
const button = (label, action, cls, enabled, hinted, extra = '') => `<button type="button" class="secondary sq-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="sq-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;

function renderPlacing(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p, b), g = gridOf({cols: q.cols, rows: q.rows});
  // Can't comes after a try: no squares, no picker.
  const claiming = q.mode === 'fill' && !done && state.claiming && b.sq.length > 0, live = !done && !claiming;
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const hintCells = new Set(act?.type === 'place' ? cellsOfSquare(q.cols, [act.x, act.y, act.s]) : []);
  const owner = new Map();
  b.sq.forEach((s, i) => cellsOfSquare(q.cols, s).forEach(c => owner.set(c, i)));
  const full = fullBoard(q.cols, q.rows, b.sq), room = q.mode !== 'four' || b.sq.length < q.count;
  const cell = i => {
    if (owner.has(i)) return {cls: 'covered'};
    const [x, y] = g.cells[i], chosen = state.corner === i;
    return {cls: `${chosen ? 'corner' : ''}${hintCells.has(i) ? ' hinted' : ''}`, act: live && room, label: `${cellName(x, y)}${chosen ? ', chosen corner' : ''}`};
  };
  const rect = q.mode === 'four' && b.sq.length === q.count ? rectangleOf(b.sq) : null;
  const pieces = b.sq.map(s => ({
    cells: cellsOfSquare(q.cols, s), key: `${s[0]}-${s[1]}`, act: live,
    cls: `sq-sq ${sizeClass(s[2])}${act?.type === 'lift' && act.x === s[0] && act.y === s[1] ? ' hinted' : ''}`,
    label: `${by(s[2])} square at ${at(s[0], s[1])}${live ? '. Lift it' : ''}`
  }));
  let over = (rect ? '' : b.sq.map(s => numeral(s)).join('')) + sides([0, 0, q.cols, q.rows], sideSize(q));
  if (rect) over += cutLayer(rect[0], rect[1], rect[2], rect[3]);
  // Can't: tabs beside each row (right) and below each column, the lines
  // picked shaded; once right, the lines and the 3s that fit, dashed.
  const picks = done && b.claim ? b.claim : state.picks;
  if (q.mode === 'fill' && (claiming || b.claim)) {
    const hinted = act?.type === 'cant' ? act : null;
    const band = (dir, k) => dir === 'row' ? `<rect class="sq-band" x="0" y="${k * U}" width="${q.cols * U}" height="${U}"/>` : `<rect class="sq-band" x="${k * U}" y="0" width="${U}" height="${q.rows * U}"/>`;
    over += picks.at.map(k => band(picks.dir, k)).join('');
    if (b.claim || (claiming && state.fits)) over += packedThrees(q.cols, q.rows).map(t => outline(t, 'sq-ghost')).join('');
    if (claiming) {
      const tab = (dir, k) => {
        const on = picks.dir === dir && picks.at.includes(k), cx = dir === 'row' ? (q.cols + .62) * U : (k + .5) * U, cy = dir === 'row' ? (k + .5) * U : (q.rows + .62) * U;
        const lit = hinted && hinted.dir === dir && hinted.at.includes(k);
        return `<g class="sq-tab${on ? ' on' : ''}${lit ? ' hinted' : ''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="${dir === 'row' ? 'Row' : 'Column'} ${k + 1}" data-sq-line="${dir}:${k}" data-focus="sq-line-${dir}-${k}" transform="translate(${f(cx)},${f(cy)})"><circle r="${f(U * .36)}"/><text y="${f(U * .14)}">${k + 1}</text></g>`;
      };
      over += Array.from({length: q.rows}, (_, k) => tab('row', k)).join('') + Array.from({length: q.cols}, (_, k) => tab('col', k)).join('');
    }
  }
  const svg = squareBoard(g, {cls: `sq-board${done ? ' solved' : ''}${claiming ? ' claiming' : ''}`, label: `Rectangle ${q.cols} by ${q.rows}`, cell, pieces, over, stroke: live, pad: padFor(q)});
  // The bar: what may be placed, then the buttons.
  let bar = '';
  if (q.mode === 'fill') bar += `<span class="sq-menu" role="img" aria-label="Only 2 by 2 and 3 by 3 squares">${q.sizes.map(s => squareIcon(s)).join('')}</span>`;
  if (q.mode === 'four') bar += `<span class="sq-tray" role="img" aria-label="${q.count - b.sq.length} of ${q.count} squares left">${Array.from({length: q.count}, (_, k) => `<i class="${k < q.count - b.sq.length ? 'on' : ''}">${squareIcon(q.size, 5)}</i>`).join('')}</span>`;
  const buttons = [];
  if (!done) {
    if (q.mode === 'fewest') buttons.push(button('Done', {type: 'done'}, 'sq-done', full && (b.fewer === null || b.sq.length < b.fewer), act?.type === 'done'));
    buttons.push(button('Clear', {type: 'clear'}, 'sq-clear', b.sq.length > 0 && !claiming, act?.type === 'clear'));
    if (q.mode === 'fill') buttons.push(`<button type="button" class="secondary sq-button sq-cant${act?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="sq-cant" aria-pressed="${claiming}" ${b.sq.length ? '' : 'disabled'}>Can’t</button>`);
  }
  if (buttons.length) bar += `<span class="sq-buttons">${buttons.join('')}</span>`;
  const note = q.mode === 'fewest' && !done && b.fewer !== null && full && b.sq.length >= b.fewer ? 'Fewer squares fit.' : claiming && state.said ? state.said : '';
  let below = '';
  if (q.mode === 'four') below = shelfHtml(b.found.map(k => { const [w, h] = keyRect(k); return `<li class="sq-slot${rect && rectKey(rect[2], rect[3]) === k ? ' here' : ''}">${mini(w, h, `${w} by ${h}, last square ${lastOf(w, h)}`)}</li>`; }), 'Rectangles made');
  const count = `${b.sq.length} ${b.sq.length === 1 ? 'square' : 'squares'}`;
  const fit = maxThrees(q.cols, q.rows), fitText = fit === 0 ? 'none fits' : fit === 1 ? 'only one fits' : `only ${String(NUMBER[fit] ?? fit).toLowerCase()} fit`;
  const status = done && b.claim ? `${lineWords(b.claim.dir, b.claim.at)} ${b.claim.at.length === 1 ? 'needs a' : 'each need their own'} 3 by 3 square; ${fitText}.` : `${count}${full ? ', full' : ''}.${rect ? ` A ${rect[2]} by ${rect[3]} rectangle; its last square is ${lastOf(rect[2], rect[3])}.` : ''}${note ? ` ${note}` : ''}${claiming ? ` Picked: ${picks.at.length ? lineWords(picks.dir, picks.at) : 'none'}.` : ''}`;
  return `<div class="sq-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="squares">${bar ? `<div class="sq-bar">${bar}</div>` : ''}<div class="sq-stage" style="--sq-cols:${q.cols}">${svg}</div>${note ? `<p class="sq-note">${esc(note)}</p>` : ''}${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function renderSizing(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), live = !done, g = gridOf({cols: q.cols, rows: q.rows});
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.action;
  const target = act?.type === 'size' ? (act.h - 1) * q.cols + act.w - 1 : null;
  const shown = q.mode === 'playground' ? b.n : b.cut ? Infinity : 0;
  const cut = new Set(cutsOf(b.w, b.h).slice(0, shown === Infinity ? undefined : shown).flatMap(s => cellsOfSquare(q.cols, s)));
  const cell = i => {
    const [x, y] = g.cells[i], inside = x < b.w && y < b.h;
    return {cls: `${inside ? 'inside' : ''}${inside && !cut.has(i) && q.mode === 'playground' ? ' rest' : ''}${i === target ? ' hinted' : ''}`, act: live, label: `${cellName(x, y)}. Make it ${x + 1} by ${y + 1}`};
  };
  let over = '';
  if (b.w) {
    over += `<rect class="sq-rect" x="0" y="0" width="${b.w * U}" height="${b.h * U}"/>`;
    if (shown) over += cutLayer(0, 0, b.w, b.h, {upto: shown, filled: true});
    over += sides([0, 0, b.w, b.h], sideSize(q)) + `<circle class="sq-knob" cx="${b.w * U}" cy="${b.h * U}" r="${f(U * .22)}"/>`;
  } else over += '<circle class="sq-knob" cx="0" cy="0" r="2.2"/>';
  const svg = squareBoard(g, {cls: `sq-board sq-area${done ? ' solved' : ''}`, label: `Grid ${q.cols} by ${q.rows}${b.w ? `, rectangle ${b.w} by ${b.h}` : ''}`, cell, over, stroke: live, pad: padFor(q)});
  let bar = '';
  if (q.goal === 'recipe') bar += `<span class="sq-recipe" role="img" aria-label="${esc(`Recipe ${q.recipe.join(', ')}: ${q.recipe.map((n, k) => `${n} ${k ? 'smaller ' : ''}${n === 1 ? 'square' : 'squares'}`).join(', then ')}`)}">${q.recipe.map((n, k) => `<span class="sq-group">${Array.from({length: n}, () => squareIcon(1, [20, 13, 8, 5][k] || 4)).join('')}</span>`).join('')}</span>`;
  const can = q.mode === 'playground' ? b.n < cutsOf(b.w, b.h).length : b.w > 0 && !b.cut;
  if (!done) bar += `<span class="sq-buttons">${button('Cut', {type: 'cut'}, 'sq-cutbutton', can, act?.type === 'cut')}</span>`;
  let below = '';
  if (q.goal === 'last') {
    const here = b.cut && keeps(q, b.w, b.h) ? firstOf(b.w, b.h) : null;
    below = shelfHtml(b.found.map(([w, hh]) => `<li class="sq-slot${firstOf(w, hh) === here ? ' here' : ''}">${mini(w, hh, `${w} by ${hh}: first square ${firstOf(w, hh)}, last square ${lastOf(w, hh)}`)}</li>`), 'Rectangles kept');
  }
  const sizes = shown ? cutsOf(b.w, b.h).slice(0, shown === Infinity ? undefined : shown).map(s => s[2]) : [];
  const status = b.w ? `${b.w} by ${b.h}.${sizes.length ? ` Cuts: ${sizes.join(', ')}.` : ''}` : 'No rectangle yet.';
  return `<div class="sq-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="squares"><div class="sq-bar">${bar}</div><div class="sq-stage" style="--sq-cols:${q.cols}">${svg}</div>${below}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const render = (p, a) => placing(p.parameters) ? renderPlacing(p, a) : renderSizing(p, a);

/* --------------------------------------------------------------------- *
 * Taps, slides and keys
 * --------------------------------------------------------------------- */
// The square a slide or two taps ask for, from a corner to another square.
export function gestureSquare(q, from, to) {
  if (q.mode === 'four' && from[0] === to[0] && from[1] === to[1]) {
    // One tap puts the square's top-left corner there, kept on the board.
    return [Math.min(from[0], q.cols - q.size), Math.min(from[1], q.rows - q.size), q.size];
  }
  return squareToward(q.cols, q.rows, from, to, sizesFor(q));
}
const freeFor = (b, square, q) => insideBoard(q.cols, q.rows, square) && !b.sq.some(s => overlap(s, square));
function wire(root, p, api) {
  const q = p.parameters, g = gridOf({cols: q.cols, rows: q.rows}), board = () => api.attempt().board;
  const xy = i => g.cells[i];
  if (placing(q)) {
    const placeMove = square => ({type: 'place', x: square[0], y: square[1], s: square[2]});
    wireSquare(root, g, {
      cell: i => {
        const b = board(), state = ui(p, b);
        if (state.claiming && b.sq.length) return null;
        if (q.mode === 'four') { const s = gestureSquare(q, xy(i), xy(i)); return freeFor(b, s, q) ? placeMove(s) : null; }
        if (state.corner === null) { api.ui({corner: i}); return null; }
        const s = gestureSquare(q, xy(state.corner), xy(i));
        if (freeFor(b, s, q)) return placeMove(s);
        api.ui({corner: state.corner === i ? null : i});
        return null;
      },
      piece: key => { const [x, y] = key.split('-').map(Number), b = board(); return ui(p, b).claiming && b.sq.length ? null : {type: 'lift', x, y}; },
      preview: cells => { const b = board(), s = gestureSquare(q, xy(cells[0]), xy(cells.at(-1))); return {show: insideBoard(q.cols, q.rows, s) ? cellsOfSquare(q.cols, s) : cells, blocked: !freeFor(b, s, q)}; },
      stroke: cells => { const b = board(), s = gestureSquare(q, xy(cells[0]), xy(cells.at(-1))); return freeFor(b, s, q) ? placeMove(s) : null; }
    }, api.apply);
    // Can't: a tab picks or drops its line. A line that can't join is refused
    // in a word; enough lines make the claim.
    const pick = el => {
      const [dir, k] = el.dataset.sqLine.split(':'), out = pickLine(q, ui(p, board()).picks, dir, Number(k));
      if (out.claim) api.apply({type: 'cant', ...out.claim});
      else api.ui(out);
    };
    root.querySelectorAll('[data-sq-line]').forEach(el => {
      el.addEventListener('click', () => pick(el));
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(el); } });
    });
    return;
  }
  const sizeTo = i => { const [x, y] = xy(i); return {type: 'size', w: x + 1, h: y + 1}; };
  wireSquare(root, g, {
    cell: sizeTo,
    preview: cells => { const [x, y] = xy(cells.at(-1)), show = []; for (let j = 0; j <= y; j++) for (let i = 0; i <= x; i++) show.push(j * q.cols + i); return {show}; },
    stroke: cells => sizeTo(cells.at(-1))
  }, api.apply);
  // Arrow keys move the rectangle's far corner one square.
  const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1]};
  root.addEventListener('keydown', e => {
    const d = ARROWS[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey || !e.target.closest?.('[data-sg-board]')) return;
    const b = board(), w = Math.min(q.cols, Math.max(1, (b.w || 0) + d[0])), h = Math.min(q.rows, Math.max(1, (b.h || 0) + d[1]));
    e.preventDefault();
    if (w !== b.w || h !== b.h) api.apply({type: 'size', w, h});
  });
}

export const squareMechanics = {
  squares: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (payload.corner === null || int(payload.corner)) state.corner = payload.corner;
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: {dir: null, at: []}, said: null, fits: false, corner: null});
      if (object(payload.picks)) state.picks = payload.picks;
      if (payload.said === null || typeof payload.said === 'string') state.said = payload.said;
      if (typeof payload.fits === 'boolean') state.fits = payload.fits;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps what was kept: rectangles found, and a refused count.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'fewest') { const refused = [from.fewer, to.fewer].filter(int); return {...to, fewer: refused.length ? Math.min(...refused) : null}; }
      if ((q.mode === 'four' || (q.mode === 'design' && q.goal === 'last')) && Array.isArray(from.found)) {
        const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
        return {...to, found: [...from.found, ...to.found.filter(k => !from.found.some(j => same(j, k)))]};
      }
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js): a group in Tile gardens.
export default {
  id: 'squares',
  mechanics: squareMechanics,
  pack: new URL('./squares.json', import.meta.url).href,
  css: new URL('./squares.css', import.meta.url).href,
  focus: '.sq-board .sg-hit,.sq-tab,.sq-cutbutton:not([disabled]),.sq-clear:not([disabled])'
};
