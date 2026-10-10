// The mathematics of Squares in Tile gardens (worksheet Week 32, squares
// inside rectangles, and its bonus "Square recipes encore"). No DOM here: the
// build script, the validator and the mechanic all import it.
//
// A square on a board is [x, y, s]: its top-left square is column x, row y
// (counting from 0, top row first) and its side is s.
//
// - The biggest-square rule. Cut the largest square from one end of a w × h
//   rectangle and repeat on what is left. Cutting (a, b) to (a − b, b) keeps
//   every common divisor and the sides shrink, so the last square has side
//   gcd(w, h): Euclid's algorithm, drawn. Each new size is one division step,
//   so the number of sizes is the length of the continued fraction of w / h;
//   the counts of equal squares are its partial quotients (the "recipe").
// - Fewest squares. The rule is not always fewest: 6 × 5 needs 5 squares,
//   the rule uses 6. `fewestCover` finds a fewest completion by search.
// - Twos and threes. A rectangle (both sides at least 2) fills with 2 × 2 and
//   3 × 3 squares exactly when both sides are even, or both are multiples of
//   3, or one side is a multiple of 6. `fillCover` searches for a filling.
// - Lines that each need their own 3. A row or column of odd length can't be
//   made of 2s, so some 3 × 3 square crosses it. One 3 × 3 square crosses
//   three neighbouring lines, so lines three or more apart need different
//   ones. No more than ⌊w/3⌋ · ⌊h/3⌋ of them fit without overlapping (each
//   holds exactly one square whose column and row are both 2 more than a
//   multiple of 3). More such lines than that is a certificate that the
//   rectangle can't be filled with 2s and 3s.

const int = Number.isSafeInteger;

/* --------------------------------------------------------------------- *
 * The biggest-square rule
 * --------------------------------------------------------------------- */
// The squares the rule cuts from a w × h rectangle whose top-left corner is
// at (x0, y0): from the left while it is at least as wide as tall, from the
// top while it is taller.
export function cutsOf(w, h, x0 = 0, y0 = 0) {
  const out = [];
  let x = x0, y = y0, W = w, H = h;
  while (W > 0 && H > 0) {
    if (W >= H) { out.push([x, y, H]); x += H; W -= H; }
    else { out.push([x, y, W]); y += W; H -= W; }
  }
  return out;
}
export const sizesOf = (w, h) => cutsOf(w, h).map(c => c[2]);
export const lastOf = (w, h) => cutsOf(w, h).at(-1)?.[2] ?? 0;
export const firstOf = (w, h) => Math.min(w, h);
export const kindsOf = (w, h) => new Set(sizesOf(w, h)).size;
// How many equal squares come in a row, largest first: 8 × 3 cuts 3, 3, 2, 1, 1,
// so its recipe is 2, 1, 2.
export function recipeOf(w, h) {
  const out = [];
  sizesOf(w, h).forEach((s, i, all) => { if (i && all[i - 1] === s) out[out.length - 1]++; else out.push(1); });
  return out;
}
export const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/* --------------------------------------------------------------------- *
 * Squares on a board
 * --------------------------------------------------------------------- */
export const isSquare = q => Array.isArray(q) && q.length === 3 && q.every(int) && q[2] >= 1;
export const insideBoard = (cols, rows, [x, y, s]) => x >= 0 && y >= 0 && x + s <= cols && y + s <= rows;
export const coversCell = ([x, y, s], cx, cy) => cx >= x && cx < x + s && cy >= y && cy < y + s;
export const overlap = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[2] && b[1] < a[1] + a[2];
export function cellsOfSquare(cols, [x, y, s]) {
  const out = [];
  for (let j = y; j < y + s; j++) for (let i = x; i < x + s; i++) out.push(j * cols + i);
  return out;
}
// A board's squares are well formed, inside it, of allowed sizes and apart.
export function squaresOk(cols, rows, list, sizes = null) {
  if (!Array.isArray(list)) return false;
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (!isSquare(q) || !insideBoard(cols, rows, q) || (sizes && !sizes.includes(q[2]))) return false;
    for (let j = 0; j < i; j++) if (overlap(q, list[j])) return false;
  }
  return true;
}
export const areaOf = list => list.reduce((sum, q) => sum + q[2] * q[2], 0);
export const fullBoard = (cols, rows, list) => areaOf(list) === cols * rows;
const gridWith = (cols, rows, list) => {
  const grid = new Uint8Array(cols * rows);
  for (const [x, y, s] of list) for (let j = y; j < y + s; j++) grid.fill(1, j * cols + x, j * cols + x + s);
  return grid;
};
// The rectangle the squares make together, as [x, y, w, h], or null.
export function rectangleOf(list) {
  if (!list.length) return null;
  const x0 = Math.min(...list.map(q => q[0])), y0 = Math.min(...list.map(q => q[1]));
  const x1 = Math.max(...list.map(q => q[0] + q[2])), y1 = Math.max(...list.map(q => q[1] + q[2]));
  return areaOf(list) === (x1 - x0) * (y1 - y0) ? [x0, y0, x1 - x0, y1 - y0] : null;
}
// A rectangle up to turning, longer side first.
export const rectKey = (w, h) => `${Math.max(w, h)}x${Math.min(w, h)}`;
export const keyRect = key => key.split('x').map(Number);

/* --------------------------------------------------------------------- *
 * Searches. Each fills the first empty square in reading order: every square
 * before it is covered, so the square that covers it has it as its top-left.
 * --------------------------------------------------------------------- */
function largestAt(grid, cols, rows, x, y, cap = Infinity) {
  let m = 0;
  for (;;) {
    const s = m + 1;
    if (s > cap || x + s > cols || y + s > rows) return m;
    // The new column and the new row of the square one bigger.
    for (let j = y; j < y + s; j++) if (grid[j * cols + x + s - 1]) return m;
    for (let i = x; i < x + s; i++) if (grid[(y + s - 1) * cols + i]) return m;
    m = s;
  }
}
const setSquare = (grid, cols, x, y, s, v) => { for (let j = y; j < y + s; j++) grid.fill(v, j * cols + x, j * cols + x + s); };

// The fewest squares (any sizes) that cover the empty part of a cols × rows
// board beside `placed`, as a list, when that many is at most `limit`; else
// null. Memoised per board and limit (forgotten past a few thousand boards).
const fewestMemo = new Map(), MEMO = 4000;
const remember = (memo, key, value) => { if (memo.size >= MEMO) memo.clear(); memo.set(key, value); return value; };
// Forget every search (the validator times hints cold).
export const forgetSearches = () => { fewestMemo.clear(); fillMemo.clear(); };
export function fewestCover(cols, rows, placed = [], limit = cols * rows) {
  const start = gridWith(cols, rows, placed);
  const key = `${cols}x${rows}:${limit}:${start.join('')}`;
  if (fewestMemo.has(key)) return fewestMemo.get(key);
  const grid = start, n = cols * rows, big = Math.min(cols, rows) ** 2;
  let free = 0;
  for (let i = 0; i < n; i++) if (!grid[i]) free++;
  let best = null, bound = limit + 1;
  const stack = [], failed = new Map();
  (function search(from, left) {
    let f = from;
    while (f < n && grid[f]) f++;
    if (f === n) { best = stack.map(q => [...q]); bound = stack.length; return; }
    const room = bound - 1 - stack.length;
    if (room < 1 || Math.ceil(left / big) > room) return;
    const state = grid.join('');
    if ((failed.get(state) ?? -1) >= room) return;
    const x = f % cols, y = Math.floor(f / cols), m = largestAt(grid, cols, rows, x, y);
    const before = bound;
    for (let s = m; s >= 1; s--) {
      setSquare(grid, cols, x, y, s, 1); stack.push([x, y, s]);
      search(f + s, left - s * s);
      stack.pop(); setSquare(grid, cols, x, y, s, 0);
    }
    if (bound === before) failed.set(state, Math.max(failed.get(state) ?? -1, room));
  })(0, free);
  return remember(fewestMemo, key, best);
}
// The fewest squares that fill an empty cols × rows rectangle.
export const fewestOf = (cols, rows) => fewestCover(cols, rows, [], cols * rows).length;

// A filling of the empty part with squares of the given sizes, or null.
const fillMemo = new Map();
export function fillCover(cols, rows, placed = [], sizes = [2, 3]) {
  const grid = gridWith(cols, rows, placed), key = `${cols}x${rows}:${sizes}:${grid.join('')}`;
  if (fillMemo.has(key)) return fillMemo.get(key);
  const n = cols * rows, order = [...sizes].sort((a, b) => b - a), failed = new Set(), stack = [];
  const found = (function search(from) {
    let f = from;
    while (f < n && grid[f]) f++;
    if (f === n) return true;
    const state = grid.join('');
    if (failed.has(state)) return false;
    const x = f % cols, y = Math.floor(f / cols), m = largestAt(grid, cols, rows, x, y, order[0]);
    for (const s of order) {
      if (s > m) continue;
      setSquare(grid, cols, x, y, s, 1); stack.push([x, y, s]);
      if (search(f + s)) return true;
      stack.pop(); setSquare(grid, cols, x, y, s, 0);
    }
    failed.add(state);
    return false;
  })(0);
  return remember(fillMemo, key, found ? stack.map(q => [...q]) : null);
}

/* --------------------------------------------------------------------- *
 * Lines that each need their own 3 (the certificate for "can't" with 2s and
 * 3s). A line is a row (dir 'row', length cols) or a column ('col', length
 * rows), numbered from 0.
 * --------------------------------------------------------------------- */
export const maxThrees = (cols, rows) => Math.floor(cols / 3) * Math.floor(rows / 3);
export const lineLength = (cols, rows, dir) => dir === 'row' ? cols : rows;
export const lineCount = (cols, rows, dir) => dir === 'row' ? rows : cols;
// Why a line can't join the lines already picked: 'even' when 2s alone can
// make it, 'cross' when one 3 × 3 square could cross it and a picked line
// (a row and a column always meet). Null when it can join.
export function pickProblem(cols, rows, picks, dir, at) {
  if (lineLength(cols, rows, dir) % 2 === 0) return 'even';
  if (picks.at.length && picks.dir !== dir) return 'cross';
  if (picks.at.some(k => Math.abs(k - at) < 3)) return 'cross';
  return null;
}
// A full certificate: odd lines, all rows or all columns, each three or more
// from the next, more of them than the 3 × 3 squares that fit.
export function certificateOk(cols, rows, claim) {
  if (!claim || typeof claim !== 'object' || !['row', 'col'].includes(claim.dir) || !Array.isArray(claim.at)) return false;
  const {dir, at} = claim, count = lineCount(cols, rows, dir);
  if (!at.every(k => int(k) && k >= 0 && k < count) || at.some((k, i) => i && k <= at[i - 1])) return false;
  if (lineLength(cols, rows, dir) % 2 === 0) return false;
  if (at.some((k, i) => i && k - at[i - 1] < 3)) return false;
  return at.length > maxThrees(cols, rows);
}
// A certificate for a rectangle, when one of this kind exists: every third
// line from the first, along the odd side.
export function certificateFor(cols, rows) {
  for (const dir of ['row', 'col']) {
    const at = [];
    for (let k = 0; k < lineCount(cols, rows, dir); k += 3) at.push(k);
    if (certificateOk(cols, rows, {dir, at})) return {dir, at};
  }
  return null;
}
// The 3 × 3 squares packed from the top-left corner: as many as ever fit.
export function packedThrees(cols, rows) {
  const out = [];
  for (let y = 0; y + 3 <= rows; y += 3) for (let x = 0; x + 3 <= cols; x += 3) out.push([x, y, 3]);
  return out;
}

/* --------------------------------------------------------------------- *
 * Placing a square from a corner towards another square of the board.
 * --------------------------------------------------------------------- */
// The side a gesture asks for: as far as the far square reaches, then the
// largest allowed size no bigger (or the smallest allowed one).
export function sideFor(raw, sizes) {
  if (!sizes) return raw;
  const fit = sizes.filter(s => s <= raw);
  return fit.length ? Math.max(...fit) : Math.min(...sizes);
}
// The square with one corner at (ax, ay) that reaches towards (bx, by). When
// the two are the same square it grows right and down, or the first other
// way that stays on the board.
export function squareToward(cols, rows, [ax, ay], [bx, by], sizes) {
  const s = sideFor(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) + 1, sizes);
  const at = (dx, dy) => [dx > 0 ? ax : ax - s + 1, dy > 0 ? ay : ay - s + 1, s];
  if (ax === bx && ay === by) {
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const q = at(dx, dy); if (insideBoard(cols, rows, q)) return q; }
    return at(1, 1);
  }
  return at(bx >= ax ? 1 : -1, by >= ay ? 1 : -1);
}
