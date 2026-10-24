// Tower cities (worksheet Week 5), a group in Symbol Orchard. A row of towers
// 1..n tall is a permutation, and the towers seen from an end (each taller
// than every tower in front of it) are its records. The tallest is seen from
// both ends. With it in place j (counted from 1), the towers seen from the
// left stand in places 1..j and those seen from the right in places j..n, so
// L ≤ j and R ≤ n + 1 − j; and 1 is seen from an end exactly when the tallest
// stands there. A number k from one end therefore allows the tallest only at
// that end when k = 1, and at a distance of at least k − 1 from it otherwise;
// a card (L, R) has a row exactly when some place is allowed from both ends.
//
// A city is a Latin square of tower heights, and its edge numbers count the
// towers seen along each row and column. A set of edge numbers can fit one
// city, several or none. "No city" is certified here by a line whose tallest
// tower has no place: in every square of the line, some edge number forbids
// the tallest by the rule above. Making a puzzle asks for a few numbers that
// fit only one city (2 always suffice for 3-by-3, 3 for some 4-by-4 cities,
// by computer); twin cities share all sixteen numbers.
//
// The Orchard's board is reused: the same grid squares and keypad, with the
// edge numbers around it, and typing a height works as in the Orchard.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isInteger;
const range = n => Array.from({length: n}, (_, i) => i);
export const SIDES = ['top', 'right', 'bottom', 'left'];
export const MODES = ['row', 'city', 'every', 'design', 'twins'];

// --- Rows -----------------------------------------------------------------------
// The number of towers seen looking along a line from its first entry.
export function seen(line) {
  let best = 0, count = 0;
  for (const h of line) if (h > best) { best = h; count++; }
  return count;
}
export const ends = row => [seen(row), seen([...row].reverse())];
const perms = new Map();
export function permutations(n) {
  if (perms.has(n)) return perms.get(n);
  const out = [];
  (function go(prefix, rest) {
    if (!rest.length) { out.push(prefix); return; }
    rest.forEach((v, i) => go([...prefix, v], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  })([], range(n).map(i => i + 1));
  perms.set(n, out);
  return out;
}
const rowMemo = new Map();
export function rowsFor(n, L, R) {
  const key = `${n}:${L}:${R}`;
  if (!rowMemo.has(key)) rowMemo.set(key, permutations(n).filter(r => { const [a, b] = ends(r); return a === L && b === R; }));
  return rowMemo.get(key);
}
// May the tallest stand d places from an end that sees k towers?
export const allowedAt = (n, k, d) => int(k) && k >= 1 && k <= n && (k === 1 ? d === 0 : d >= k - 1);
// The places (from 0) where the tallest may stand for a card.
export const tallestPlaces = (n, L, R) => range(n).filter(j => allowedAt(n, L, j) && allowedAt(n, R, n - 1 - j));
const isRow = (n, row) => Array.isArray(row) && row.length === n && row.every(v => int(v) && v >= 1 && v <= n) && new Set(row).size === n;

// --- Cities ---------------------------------------------------------------------
// Edge places are numbered clockwise: top (columns left to right), right
// (rows top to bottom), bottom (columns), left (rows), n of each.
export const slotOf = (n, side, i) => SIDES.indexOf(side) * n + i;
export const sideOf = (n, s) => SIDES[Math.floor(s / n)];
export const opposite = (n, s) => (s + 2 * n) % (4 * n);
// The squares of a line in order from the edge place s.
const lineMemo = new Map();
export function lineOf(n, s) {
  const key = n * 1000 + s;
  if (!lineMemo.has(key)) {
    const side = Math.floor(s / n), i = s % n;
    lineMemo.set(key, range(n).map(d => side === 0 ? d * n + i : side === 1 ? i * n + n - 1 - d : side === 2 ? (n - 1 - d) * n + i : i * n + d));
  }
  return lineMemo.get(key);
}
export function viewsOf(n, cells) {
  const out = [];
  for (let s = 0; s < 4 * n; s++) {
    let best = 0, count = 0;
    for (const k of lineOf(n, s)) if (cells[k] > best) { best = cells[k]; count++; }
    out.push(count);
  }
  return out;
}
export const clueArray = (n, clues) => SIDES.flatMap(side => Array.isArray(clues?.[side]) && clues[side].length === n ? clues[side] : Array(n).fill(0));
// Every Latin square of order n, rows top to bottom, by backtracking.
const squares = new Map();
export function cities(n) {
  if (squares.has(n)) return squares.get(n);
  const out = [], g = Array(n * n).fill(0);
  (function go(k) {
    if (k === n * n) { out.push([...g]); return; }
    const r = Math.floor(k / n), c = k % n;
    for (let v = 1; v <= n; v++) {
      let ok = true;
      for (let j = 0; j < c && ok; j++) if (g[r * n + j] === v) ok = false;
      for (let i = 0; i < r && ok; i++) if (g[i * n + c] === v) ok = false;
      if (ok) { g[k] = v; go(k + 1); }
    }
    g[k] = 0;
  })(0);
  squares.set(n, out);
  return out;
}
const viewMemo = new Map();
export const cityViews = n => { if (!viewMemo.has(n)) viewMemo.set(n, cities(n).map(c => viewsOf(n, c))); return viewMemo.get(n); };
export const fitsClues = (clues, views) => clues.every((k, s) => !k || views[s] === k);
// Indices of the cities that fit an array of edge numbers (0 for none).
const fitMemo = new Map();
export function fitting(n, clues) {
  const key = `${n}:${clues.join(',')}`;
  if (!fitMemo.has(key)) {
    const v = cityViews(n), out = [];
    for (let i = 0; i < v.length; i++) if (fitsClues(clues, v[i])) out.push(i);
    fitMemo.set(key, out);
  }
  return fitMemo.get(key);
}
export const cityKey = cells => cells.join('');
export const fromKey = key => [...key].map(Number);
// Squares holding a height that repeats in their row or column.
export function repeats(n, cells) {
  const out = new Set();
  for (let a = 0; a < cells.length; a++) {
    if (!cells[a]) continue;
    for (let b = a + 1; b < cells.length; b++) if (cells[a] === cells[b] && (Math.floor(a / n) === Math.floor(b / n) || a % n === b % n)) { out.add(a); out.add(b); }
  }
  return out;
}
export const isCity = (n, cells) => Array.isArray(cells) && cells.length === n * n && cells.every(v => int(v) && v >= 1 && v <= n) && repeats(n, cells).size === 0;
// The edge places through a square, each with the square's distance from it.
const through = (n, k) => { const r = Math.floor(k / n), c = k % n; return [[slotOf(n, 'top', c), r], [slotOf(n, 'bottom', c), n - 1 - r], [slotOf(n, 'left', r), c], [slotOf(n, 'right', r), n - 1 - c]]; };
// The edge numbers that forbid the tallest tower in square k.
export const forbidding = (n, clues, k) => through(n, k).filter(([s, d]) => clues[s] && !allowedAt(n, clues[s], d)).map(([s]) => s);
// A line whose tallest tower has no place: the certificate for "no city".
export const noPlace = (n, clues, s) => int(s) && s >= 0 && s < 4 * n && lineOf(n, s).every(k => forbidding(n, clues, k).length > 0);
// One edge place for each line that is a certificate, top and left first.
export function certificates(n, clues) {
  const out = [];
  for (let i = 0; i < n; i++) for (const s of [slotOf(n, 'left', i), slotOf(n, 'top', i)]) if (noPlace(n, clues, s)) out.push(s);
  return out;
}
export function slotWords(n, s) {
  const i = s % n + 1;
  return {top: `above column ${i}`, bottom: `below column ${i}`, left: `left of row ${i}`, right: `right of row ${i}`}[sideOf(n, s)];
}
const lineWords = (n, s) => ['top', 'bottom'].includes(sideOf(n, s)) ? `column ${s % n + 1}` : `row ${s % n + 1}`;
const cellWords = (n, k) => `row ${Math.floor(k / n) + 1}, column ${k % n + 1}`;
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
const either = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} or ${list.at(-1)}` : String(list[0] ?? 'nowhere');
// Where each end number lets the tallest stand (places from 1, left to right).
export const placesFor = (n, k, from) => range(n).filter(j => allowedAt(n, k, from === 'left' ? j : n - 1 - j)).map(j => j + 1);
const rowReason = (n, L, R) => `Seeing ${L} from the left puts the ${n} at place ${either(placesFor(n, L, 'left'))}. Seeing ${R} from the right puts it at place ${either(placesFor(n, R, 'right'))}.`;
// Why a line's tallest has no place: each square is barred by an edge number.
function cityReason(n, clues, s) {
  const why = lineOf(n, s).map(k => through(n, k).find(([t, d]) => clues[t] && !allowedAt(n, clues[t], d)));
  const [t0, d0] = why[0], side = sideOf(n, t0), k0 = clues[t0], prep = {top: 'above', bottom: 'below', left: 'left of', right: 'right of'}[side];
  if (why.every(([t, d]) => d === 0 && sideOf(n, t) === side && clues[t] === k0) && k0 > 1) return `Wherever the ${n} of ${lineWords(n, s)} stands, the ${k0} ${prep} it would see only that ${n}.`;
  return `The ${n} of ${lineWords(n, s)} has no place: an edge number rules out each square.`;
}

// --- Puzzles --------------------------------------------------------------------
// row:    {order, card: [L, R], start}       board {row, said, refused, tried}
// city:   {order, clues}                     board {cells, line, missed, refused, tried}
// `tried` turns on with the first swap or height: No row and No city wait
// for an attempt, so the reason is drawn round the child's own board.
// every:  {order, clues}                     board {cells, found, told, all, extra}
// design: {order, city, budget}              board {shown}
// twins:  {order, city}                      board {cells}
const qOf = p => p.parameters;
const clueMemo = new Map();
export function cluesOf(p) {
  const q = qOf(p), key = `${p.id}:${q.mode}`;
  if (!clueMemo.has(key)) clueMemo.set(key, q.mode === 'twins' || q.mode === 'design' ? viewsOf(q.order, q.city) : clueArray(q.order, q.clues));
  return clueMemo.get(key);
}
export const answersOf = p => fitting(qOf(p).order, cluesOf(p));
// The edge numbers of a design board: the city's own numbers at the places shown.
export const shownClues = (p, shown) => { const v = cluesOf(p); return v.map((k, s) => shown.includes(s) ? k : 0); };
export const withExtra = (p, extra) => cluesOf(p).map((k, s) => extra && s === extra[0] ? extra[1] : k);
const cellsOk = (n, cells) => Array.isArray(cells) && cells.length === n * n && cells.every(v => int(v) && v >= 0 && v <= n);
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === keys;
const isSlot = (n, s) => int(s) && s >= 0 && s < 4 * n;

function fresh(p) {
  const q = qOf(p), n = q.order, blank = Array(n * n).fill(0);
  if (q.mode === 'row') return {row: [...q.start], said: null, refused: false, tried: false};
  if (q.mode === 'city') return {cells: blank, line: null, missed: null, refused: false, tried: false};
  if (q.mode === 'every') return {cells: blank, found: [], told: null, all: false, extra: null};
  if (q.mode === 'design') return {shown: []};
  return {cells: [...q.city]};
}
function valid(p, b) {
  const q = qOf(p), n = q.order;
  if (q.mode === 'row') {
    if (!keysAre(b, 'refused,row,said,tried') || !isRow(n, b.row) || typeof b.refused !== 'boolean' || typeof b.tried !== 'boolean') return false;
    const possible = rowsFor(n, ...q.card).length > 0;
    if ((b.said !== null || b.refused) && !b.tried) return false;
    return (b.said === null || (b.said === 'no' && !possible)) && (!b.refused || possible);
  }
  if (q.mode === 'city') {
    if (!keysAre(b, 'cells,line,missed,refused,tried') || !cellsOk(n, b.cells) || typeof b.refused !== 'boolean' || typeof b.tried !== 'boolean') return false;
    const possible = answersOf(p).length > 0, clues = cluesOf(p);
    if ((b.refused || b.line !== null || b.missed !== null) && !b.tried) return false;
    if (b.refused && !possible) return false;
    if (b.line !== null && (possible || !noPlace(n, clues, b.line))) return false;
    if (b.missed !== null && (possible || !isSlot(n, b.missed) || noPlace(n, clues, b.missed) || b.line !== null)) return false;
    return true;
  }
  if (q.mode === 'every') {
    if (!keysAre(b, 'all,cells,extra,found,told') || !cellsOk(n, b.cells) || typeof b.all !== 'boolean' || !Array.isArray(b.found)) return false;
    const answers = answersOf(p).map(i => cityKey(cities(n)[i]));
    if (!b.found.every(k => answers.includes(k)) || new Set(b.found).size !== b.found.length) return false;
    // A city that fits is kept the moment it is built.
    if (!b.all && isCity(n, b.cells) && answers.includes(cityKey(b.cells)) && !b.found.includes(cityKey(b.cells))) return false;
    if (b.told !== null && !(b.told === 'more' && !b.all && b.found.length < answers.length)) return false;
    if (b.all && b.found.length !== answers.length) return false;
    if (b.extra === null) return true;
    const [s, v] = Array.isArray(b.extra) && b.extra.length === 2 ? b.extra : [];
    return b.all && isSlot(n, s) && !cluesOf(p)[s] && int(v) && v >= 1 && v <= n;
  }
  if (q.mode === 'design') {
    return keysAre(b, 'shown') && Array.isArray(b.shown) && b.shown.length <= q.budget && b.shown.every((s, k) => isSlot(n, s) && (k === 0 || b.shown[k - 1] < s));
  }
  return keysAre(b, 'cells') && cellsOk(n, b.cells);
}
function solved(p, b) {
  const q = qOf(p), n = q.order;
  if (!valid(p, b)) return false;
  if (q.mode === 'row') return b.said === 'no' || (ends(b.row)[0] === q.card[0] && ends(b.row)[1] === q.card[1]);
  if (q.mode === 'city') return b.line !== null || (isCity(n, b.cells) && fitsClues(cluesOf(p), viewsOf(n, b.cells)));
  if (q.mode === 'every') return b.all && b.extra !== null && fitting(n, withExtra(p, b.extra)).length === 1;
  if (q.mode === 'design') return fitting(n, shownClues(p, b.shown)).length === 1;
  return isCity(n, b.cells) && cityKey(b.cells) !== cityKey(q.city) && viewsOf(n, b.cells).join() === cluesOf(p).join();
}
function setCell(n, b, action) {
  const k = action.cell, v = action.value;
  if (!int(k) || k < 0 || k >= n * n || !int(v) || v < 0 || v > n || b.cells[k] === v) return null;
  return b.cells.map((x, i) => i === k ? v : x);
}
function move(p, b, action) {
  const q = qOf(p), n = q.order;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'row') {
    if (action.type === 'swap') {
      const {a, b: c} = action;
      if (!int(a) || !int(c) || a < 0 || c < 0 || a >= n || c >= n || a === c) return null;
      const row = [...b.row];
      [row[a], row[c]] = [row[c], row[a]];
      next = {...b, row, tried: true};
    } else if (action.type === 'none' && !b.refused && b.tried) {
      next = rowsFor(n, ...q.card).length ? {...b, refused: true} : {...b, said: 'no'};
    }
  } else if (q.mode === 'city') {
    if (action.type === 'set') { const cells = setCell(n, b, action); next = cells && {...b, cells, missed: null, tried: true}; }
    else if (action.type === 'none' && !b.refused && b.tried && isSlot(n, action.slot)) {
      // A city that fits refuses the claim for good; otherwise the line tapped
      // must have no place for its tallest tower.
      if (answersOf(p).length) next = {...b, refused: true, missed: null};
      else if (noPlace(n, cluesOf(p), action.slot)) next = {...b, line: action.slot, missed: null};
      else if (b.missed !== action.slot) next = {...b, missed: action.slot};
    }
  } else if (q.mode === 'every') {
    if (action.type === 'set' && !b.all) {
      const cells = setCell(n, b, action);
      if (cells) {
        const key = cityKey(cells), keep = isCity(n, cells) && fitsClues(cluesOf(p), viewsOf(n, cells)) && !b.found.includes(key);
        next = keep ? {...b, cells, found: [...b.found, key], told: null} : {...b, cells};
      }
    } else if (action.type === 'all' && !b.all && b.told === null) {
      next = b.found.length === answersOf(p).length ? {...b, all: true} : {...b, told: 'more'};
    } else if (action.type === 'extra' && b.all && isSlot(n, action.slot) && !cluesOf(p)[action.slot] && int(action.value) && action.value >= 0 && action.value <= n) {
      const extra = action.value ? [action.slot, action.value] : null;
      if (JSON.stringify(extra) !== JSON.stringify(b.extra) && (extra || b.extra?.[0] === action.slot)) next = {...b, extra};
    }
  } else if (q.mode === 'design') {
    const s = action.slot;
    if (action.type === 'toggle' && isSlot(n, s)) {
      if (b.shown.includes(s)) next = {shown: b.shown.filter(x => x !== s)};
      else if (b.shown.length < q.budget) next = {shown: [...b.shown, s].sort((x, y) => x - y)};
    }
  } else if (action.type === 'set') {
    const cells = setCell(n, b, action);
    next = cells && {cells};
  }
  if (next) { const st = ui(p); st.lift = null; st.pick = false; if (action.type === 'extra') st.edge = action.slot; }
  return next;
}

// --- Hints ----------------------------------------------------------------------
// Line by line: each line keeps the orders of 1..n that fit its two edge
// numbers and the heights still possible in its squares, until nothing
// changes. A square left with one height is forced.
// `when` gives the sweep in which each square was first left with one height.
export function candidates(n, clues, cells) {
  const cand = cells.map(v => v ? [v] : range(n).map(i => i + 1)), when = cells.map(v => v ? 0 : Infinity);
  let changed = true, sweep = 0;
  while (changed) {
    changed = false;
    sweep++;
    for (let i = 0; i < n; i++) for (const s of [slotOf(n, 'left', i), slotOf(n, 'top', i)]) {
      const line = lineOf(n, s), a = clues[s], z = clues[opposite(n, s)];
      const ok = permutations(n).filter(r => (!a || seen(r) === a) && (!z || seen([...r].reverse()) === z) && r.every((v, d) => cand[line[d]].includes(v)));
      line.forEach((k, d) => {
        const keep = cand[k].filter(v => ok.some(r => r[d] === v));
        if (keep.length !== cand[k].length) { cand[k] = keep; changed = true; if (keep.length === 1 && when[k] === Infinity) when[k] = sweep; }
      });
    }
  }
  return Object.assign(cand, {when});
}
const differ = (a, b) => a.reduce((t, v, i) => t + (v !== b[i] ? 1 : 0), 0);
// The next square to change on the way to the city `goal`: a wrong height
// first (one that repeats before others), then the most forced empty square.
function cellHint(n, clues, cells, goal) {
  const wrong = cells.map((v, k) => v && v !== goal[k] ? k : -1).filter(k => k >= 0);
  if (wrong.length) {
    const rep = repeats(n, cells), k = wrong.find(i => rep.has(i)) ?? wrong[0];
    return {type: 'move', action: {type: 'set', cell: k, value: goal[k]}, text: `Make ${cellWords(n, k)} a ${goal[k]}.`};
  }
  const cand = candidates(n, clues, cells), empty = cells.map((v, k) => v ? -1 : k).filter(k => k >= 0);
  const rank = i => cand[i].length === 1 && cand[i][0] === goal[i] ? cand.when[i] : 1000 + cand[i].length;
  const k = empty.reduce((best, i) => rank(i) < rank(best) ? i : best, empty[0]);
  return {type: 'move', action: {type: 'set', cell: k, value: goal[k]}, text: cand[k].length === 1 && cand[k][0] === goal[k] ? `Put ${goal[k]} in ${cellWords(n, k)}. Only ${goal[k]} fits there.` : `Try ${goal[k]} in ${cellWords(n, k)}.`};
}
const nearest = (cells, goals) => goals.reduce((best, g) => differ(cells, g) < differ(cells, best) ? g : best, goals[0]);
// The edge places and numbers that leave one of the cities found.
const singleMemo = new Map();
export function singlingOut(p) {
  if (singleMemo.has(p.id)) return singleMemo.get(p.id);
  const n = qOf(p).order, clues = cluesOf(p), out = [];
  for (let s = 0; s < 4 * n; s++) if (!clues[s]) for (let v = 1; v <= n; v++) if (fitting(n, withExtra(p, [s, v])).length === 1) out.push([s, v]);
  singleMemo.set(p.id, out);
  return out;
}
// Every set of at most `budget` edge places whose numbers fit only the city.
const designMemo = new Map();
export function designSets(p) {
  if (designMemo.has(p.id)) return designMemo.get(p.id);
  const q = qOf(p), n = q.order, out = [], mine = cluesOf(p), me = cityKey(q.city);
  // For each other city, the edge places where it shows the same number: a set
  // of places fits only this city when no other city agrees on all of them.
  const agree = cities(n).flatMap((c, i) => cityKey(c) === me ? [] : [cityViews(n)[i].reduce((m, v, s) => v === mine[s] ? m | (1 << s) : m, 0)]);
  (function go(from, set, mask) {
    if (set.length && !agree.some(m => (m & mask) === mask)) { out.push([...set]); return; }
    if (set.length === q.budget) return;
    for (let s = from; s < 4 * n; s++) go(s + 1, [...set, s], mask | (1 << s));
  })(0, [], 0);
  designMemo.set(p.id, out);
  return out;
}
// Another city that fits the numbers shown: the one nearest the city.
export function secondCity(p, shown) {
  const q = qOf(p), n = q.order, others = fitting(n, shownClues(p, shown)).map(i => cities(n)[i]).filter(c => cityKey(c) !== cityKey(q.city));
  return others.length ? nearest(q.city, others) : null;
}
function plan(p, b) {
  const q = qOf(p), n = q.order, clues = cluesOf(p);
  if (q.mode === 'row') {
    const rows = rowsFor(n, ...q.card), [L, R] = q.card;
    if (!rows.length) {
      // First an attempt: a swap toward a row whose left end sees its number
      // (or, when the left already does, the right). Then the reason, then No row.
      if (!b.tried) {
        const side = ends(b.row)[0] === L ? 1 : 0, aims = permutations(n).filter(r => ends(r)[side] === (side ? R : L) && r.join() !== b.row.join());
        const goal = nearest(b.row, aims), i = b.row.findIndex((v, k) => v !== goal[k]), j = b.row.indexOf(goal[i]);
        return {type: 'move', action: {type: 'swap', a: Math.min(i, j), b: Math.max(i, j)}, text: `Try a row: swap the ${b.row[i]} and the ${b.row[j]}.`};
      }
      return {type: 'move', action: {type: 'none'}, text: `${rowReason(n, L, R)} Press No row.`};
    }
    const goal = nearest(b.row, rows), i = b.row.findIndex((v, k) => v !== goal[k]), j = b.row.indexOf(goal[i]);
    return {type: 'move', action: {type: 'swap', a: Math.min(i, j), b: Math.max(i, j)}, text: `Swap the ${b.row[i]} and the ${b.row[j]}.`};
  }
  if (q.mode === 'city') {
    const answers = answersOf(p);
    if (!answers.length) {
      // First an attempt: the tallest tower in the line that has no place for it.
      const s = certificates(n, clues)[0], k = lineOf(n, s)[0];
      if (!b.tried) return {type: 'move', action: {type: 'set', cell: k, value: n}, text: `Try a ${n} in ${cellWords(n, k)}.`};
      return {type: 'move', action: {type: 'none', slot: s}, text: `${cityReason(n, clues, s)} Press No city, then tap ${slotWords(n, s)}.`};
    }
    return cellHint(n, clues, b.cells, nearest(b.cells, answers.map(i => cities(n)[i])));
  }
  if (q.mode === 'every') {
    if (b.all) {
      const options = singlingOut(p), keep = options.find(([s]) => s === b.extra?.[0]) || options[0];
      return {type: 'move', action: {type: 'extra', slot: keep[0], value: keep[1]}, text: `Write ${keep[1]} ${slotWords(n, keep[0])}.`};
    }
    const left = answersOf(p).map(i => cities(n)[i]).filter(c => !b.found.includes(cityKey(c)));
    if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
    return cellHint(n, clues, b.cells, nearest(b.cells, left));
  }
  if (q.mode === 'design') {
    const sets = designSets(p), have = set => set.filter(s => b.shown.includes(s)).length;
    const best = sets.reduce((top, set) => have(set) - set.length > have(top) - top.length ? set : top, sets[0]);
    const extra = b.shown.find(s => !best.includes(s));
    if (extra !== undefined) return {type: 'move', action: {type: 'toggle', slot: extra}, text: `Hide the number ${slotWords(n, extra)}.`};
    const s = best.find(x => !b.shown.includes(x));
    return {type: 'move', action: {type: 'toggle', slot: s}, text: `Show the number ${slotWords(n, s)}.`};
  }
  const twins = fitting(n, clues).map(i => cities(n)[i]).filter(c => cityKey(c) !== cityKey(q.city));
  return cellHint(n, clues, b.cells, nearest(b.cells, twins));
}
const hintMemo = new Map();
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  const key = `${p.id}:${JSON.stringify(b)}`;
  if (!hintMemo.has(key)) { if (hintMemo.size > 4000) hintMemo.clear(); hintMemo.set(key, plan(p, b)); }
  return hintMemo.get(key);
}

// --- View state -----------------------------------------------------------------
// sel: the square chosen for the keypad; edge: the edge place chosen for the
// added number; look: the edge place (or 'left'/'right' of a row) being looked
// from; pick: choosing the line for No city; view: the found city shown after
// That's all; lift: the tower chosen for a swap.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) uiState.set(p.id, {sel: null, edge: null, look: null, pick: false, view: null, lift: null});
  return uiState.get(p.id);
}

// --- Drawing --------------------------------------------------------------------
const json = value => esc(JSON.stringify(value));
const moveAttrs = (action, focus) => `data-action="expansion-move" data-move="${json(action)}" data-focus="${focus}"`;
const uiAttrs = (payload, focus) => `data-action="mechanic-ui" data-ui="${json(payload)}" data-focus="${focus}"`;
const same = (x, y) => x && y && JSON.stringify(x) === JSON.stringify(y);
const EYE = '<svg class="tw-eye" viewBox="0 0 24 16" aria-hidden="true"><path d="M1 8C5 2 19 2 23 8C19 14 5 14 1 8Z"/><circle cx="12" cy="8" r="3.4"/></svg>';
const blocks = h => range(h).map(() => '<i></i>').join('');
// Which squares of a line are seen from its first entry.
const seenMask = heights => { let best = 0; return heights.map(h => { const s = h > best; if (s) best = h; return s; }); };

function renderRow(p, a) {
  const q = qOf(p), n = q.order, [L, R] = q.card, b = a.board, done = solved(p, b), st = ui(p);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const look = done && b.said === 'no' ? null : st.look === 'left' || st.look === 'right' ? st.look : null;
  const mask = look === 'left' ? seenMask(b.row) : look === 'right' ? seenMask([...b.row].reverse()).reverse() : null;
  const end = (side, k) => `<button type="button" class="tw-end${look === side ? ' looking' : ''}" ${uiAttrs({look: look === side ? null : side}, `tw-end-${side}`)} aria-pressed="${look === side}" aria-label="${side === 'left' ? 'Left' : 'Right'} end: ${k}. Look from here">${look === side ? EYE : ''}<b>${k}</b></button>`;
  const tower = (h, i) => {
    const lifted = st.lift === i, hinted = shown?.type === 'swap' && (shown.a === i || shown.b === i);
    const cls = `tw-tower${lifted ? ' lifted' : ''}${mask ? (mask[i] ? ' seen' : ' hidden') : ''}${hinted ? ' hinted' : ''}${b.said === 'no' && h === n ? ' tallest' : ''}`;
    const label = `Tower of ${h}, place ${i + 1}${mask ? (mask[i] ? ', seen' : ', hidden') : ''}`;
    const inner = `<span class="tw-stack">${blocks(h)}</span><span class="tw-num">${h}</span>`;
    if (done) return `<div class="${cls}" role="img" aria-label="${esc(label)}">${inner}</div>`;
    if (st.lift === null || lifted) return `<button type="button" class="${cls}" ${uiAttrs({lift: lifted ? null : i}, `tw-tower-${i}`)} data-place="${i}" aria-pressed="${lifted}" aria-label="${esc(label)}${lifted ? '. Chosen' : '. Choose to swap'}">${inner}</button>`;
    return `<button type="button" class="${cls}" ${moveAttrs({type: 'swap', a: Math.min(st.lift, i), b: Math.max(st.lift, i)}, `tw-tower-${i}`)} data-place="${i}" aria-label="${esc(label)}. Swap with the ${b.row[st.lift]}">${inner}</button>`;
  };
  // After a right No row, under the child's own row: where each end's number
  // lets the tallest stand, and a cross where the child's tallest is barred.
  let proof = '';
  const top = b.row.indexOf(n);
  if (b.said === 'no') {
    const ghost = '<span class="tw-ghost" aria-hidden="true"><i></i></span>', cross = '<span class="tw-miss" aria-hidden="true">✕</span>';
    const lane = (k, from) => range(n).map(j => `<span class="tw-lane-slot">${allowedAt(n, k, from === 'left' ? j : n - 1 - j) ? ghost : j === top ? cross : ''}</span>`).join('');
    proof = `<span class="tw-lane-end left">${L}</span>${lane(L, 'left')}<span></span><span></span>${lane(R, 'right')}<span class="tw-lane-end right">${R}</span>`;
  }
  const status = done && b.said === 'no' ? `No row. Your ${n} is at place ${top + 1}. ${rowReason(n, L, R)}` : `Row ${b.row.join(', ')}.${mask ? ` From the ${look}, ${mask.filter(Boolean).length} seen.` : ''}`;
  const tools = done ? '' : `<div class="tw-tools"><button type="button" class="secondary tw-no${shown?.type === 'none' ? ' hinted' : ''}" ${moveAttrs({type: 'none'}, 'tw-no')} ${b.refused || !b.tried ? 'disabled' : ''}>No row</button></div>`;
  const note = b.refused && !done ? '<p class="tw-note">A row fits.</p>' : '';
  return `<div class="tw-board tw-rowboard${done ? ' solved' : ''}" data-mechanic-wire="towers" style="--n:${n}"><div class="tw-rowgrid">${end('left', L)}${b.row.map(tower).join('')}${end('right', R)}${proof ? `<div class="tw-proof" aria-hidden="true">${proof}</div>` : ''}</div>${tools}${note}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// A city grid with its edge places: cell(k) and slot(s) give the HTML.
function gridHtml(n, cell, slot, cls = '', label = 'City') {
  const corner = '<span class="tw-corner" aria-hidden="true"></span>', parts = [corner];
  for (let c = 0; c < n; c++) parts.push(slot(slotOf(n, 'top', c)));
  parts.push(corner);
  for (let r = 0; r < n; r++) {
    parts.push(slot(slotOf(n, 'left', r)));
    for (let c = 0; c < n; c++) parts.push(cell(r * n + c));
    parts.push(slot(slotOf(n, 'right', r)));
  }
  parts.push(corner);
  for (let c = 0; c < n; c++) parts.push(slot(slotOf(n, 'bottom', c)));
  parts.push(corner);
  return `<div class="tw-city tw-n${n} ${cls}" role="group" aria-label="${esc(label)}" style="--n:${n}">${parts.join('')}</div>`;
}
const fill = (v, n) => v ? `<i class="tw-fill" style="--f:${(v / n).toFixed(3)}"></i><span class="tw-h">${v}</span>` : '';
// A small city, numbers only, with optional edge numbers and marked squares.
function miniHtml(n, cells, {clues = null, mark = new Set(), label = 'City'} = {}) {
  return gridHtml(n, k => `<span class="tw-mc${mark.has(k) ? ' marked' : ''}">${cells[k] || ''}</span>`, s => `<span class="tw-ms">${clues?.[s] || ''}</span>`, 'tw-mini', label);
}
// The side view along a full line, from its edge place. The strip runs in the
// grid's reading order (a row left to right, a column top to bottom), with the
// eye at the end being looked from.
function sideView(n, cells, s) {
  const hs = lineOf(n, s).map(k => cells[k]), mask = seenMask(hs), fromEnd = ['right', 'bottom'].includes(sideOf(n, s));
  const towers = hs.map((h, d) => `<span class="tw-tower small ${mask[d] ? 'seen' : 'hidden'}"><span class="tw-stack">${blocks(h)}</span></span>`);
  const strip = fromEnd ? `${towers.reverse().join('')}${EYE}` : `${EYE}${towers.join('')}`;
  return `<div class="tw-side${fromEnd ? ' from-end' : ''}" role="img" aria-label="${esc(`Looking ${slotWords(n, s)}: ${hs.join(', ')}; ${mask.filter(Boolean).length} seen`)}">${strip}</div>`;
}
const full = (n, cells, s) => lineOf(n, s).every(k => cells[k]);
// Edge numbers that a finished city does not show.
const mismatched = (n, clues, cells) => isCity(n, cells) ? new Set(viewsOf(n, cells).map((v, s) => clues[s] && clues[s] !== v ? s : -1).filter(s => s >= 0)) : new Set();
function keypad(n, target, current, shown, disabled) {
  if (!target) return '';
  const key = v => {
    const action = target.slot !== undefined ? {type: 'extra', slot: target.slot, value: v} : {type: 'set', cell: target.cell, value: v};
    const label = v ? String(v) : 'Clear';
    return `<button type="button" class="secondary expansion-action${same(shown, action) ? ' hinted' : ''}" ${moveAttrs(action, `tw-key-${v}`)} aria-label="${v ? `Mark ${v}` : 'Clear'}" ${disabled || current === v ? 'disabled' : ''}>${label}</button>`;
  };
  return `<div class="latin-keypad tw-keypad" role="group" aria-label="${esc(target.slot !== undefined ? `Number ${slotWords(n, target.slot)}` : `Height for ${cellWords(n, target.cell)}`)}">${[...range(n).map(i => key(i + 1)), key(0)].join('')}</div>`;
}

function renderCity(p, a) {
  const q = qOf(p), n = q.order, b = a.board, done = solved(p, b), st = ui(p), clues = cluesOf(p);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const phase2 = q.mode === 'every' && b.all;
  const found = q.mode === 'every' ? b.found : [];
  const view = phase2 ? Math.min(int(st.view) ? st.view : found.length - 1, found.length - 1) : null;
  const cells = phase2 ? fromKey(found[view]) : b.cells;
  const editable = !done && !phase2;
  const picking = q.mode === 'city' && !done && (st.pick || shown?.type === 'none');
  const firstEmpty = cells.findIndex(v => !v);
  const sel = editable ? (int(st.sel) && st.sel < n * n ? st.sel : firstEmpty >= 0 ? firstEmpty : 0) : null;
  const edge = phase2 && !done && int(st.edge) && !clues[st.edge] ? st.edge : null;
  const shownClues = phase2 && b.extra ? withExtra(p, b.extra) : clues;
  const looked = int(st.look) && full(n, cells, st.look) && !picking ? st.look : null;
  const look = edge !== null ? edge : looked;
  const lookMask = look !== null ? seenMask(lineOf(n, look).map(k => cells[k])) : null;
  const lookLine = look !== null ? lineOf(n, look) : [];
  const rep = repeats(n, cells), off = done ? new Set() : mismatched(n, shownClues, cells);
  // No city, after the claim: the line's squares and the numbers that rule them out.
  const ruled = b.line !== null && b.line !== undefined ? new Set(lineOf(n, b.line)) : new Set();
  const ruling = new Set([...ruled].flatMap(k => forbidding(n, clues, k)));
  const could = b.missed !== null && b.missed !== undefined ? lineOf(n, b.missed).find(k => !forbidding(n, clues, k).length) : null;
  const hintCell = shown?.type === 'set' ? shown.cell : null, hintSlot = shown?.type === 'none' || shown?.type === 'extra' ? shown.slot : null;
  const cell = k => {
    const v = cells[k], d = lookLine.indexOf(k);
    const cls = `tw-cell${v ? '' : ' empty'}${rep.has(k) ? ' latin-conflict' : ''}${d >= 0 ? (lookMask[d] ? ' seen' : ' hidden') : ''}${ruled.has(k) ? ' ruled' : ''}${k === could ? ' could' : ''}${k === hintCell ? ' hinted' : ''}`;
    const label = `${capital(cellWords(n, k))}: ${v || 'empty'}${rep.has(k) ? '; repeated height' : ''}${ruled.has(k) ? '; the tallest can’t stand here' : ''}${k === could ? '; no edge number rules out the tallest here' : ''}`;
    if (!editable) return `<div class="latin-cell ${cls} tw-static" role="img" aria-label="${esc(label)}">${fill(v, n)}</div>`;
    return `<button type="button" class="latin-cell ${cls}" ${uiAttrs({sel: k}, `tw-cell-${k}`)} data-cell="${k}" aria-pressed="${k === sel}" aria-label="${esc(label)}">${fill(v, n)}</button>`;
  };
  const slot = s => {
    const k = shownClues[s], isExtra = phase2 && b.extra?.[0] === s;
    const cls = `tw-slot${k ? ' clue' : ''}${isExtra ? ' extra' : ''}${look === s ? ' looking' : ''}${off.has(s) ? ' off' : ''}${ruling.has(s) ? ' ruling' : ''}${s === hintSlot ? ' hinted' : ''}`;
    const words = slotWords(n, s);
    if (picking) return `<button type="button" class="${cls} pickable" ${moveAttrs({type: 'none', slot: s}, `tw-slot-${s}`)} aria-label="${esc(`${capital(lineWords(n, s))}: its tallest tower has no place`)}">${k || ''}</button>`;
    if (phase2 && !done && !clues[s]) return `<button type="button" class="${cls} open" ${uiAttrs({edge: s}, `tw-slot-${s}`)} aria-pressed="${edge === s}" aria-label="${esc(`${capital(words)}: ${k || 'empty'}. Choose`)}">${k || ''}</button>`;
    if (k && full(n, cells, s)) return `<button type="button" class="${cls}" ${uiAttrs({look: look === s ? null : s}, `tw-slot-${s}`)} aria-pressed="${look === s}" aria-label="${esc(`${capital(words)}: ${k}${off.has(s) ? ', not what this city shows' : ''}. Look along ${lineWords(n, s)}`)}">${k}</button>`;
    return `<span class="${cls}"${k ? ` role="img" aria-label="${esc(`${capital(words)}: ${k}`)}"` : ' aria-hidden="true"'}>${k || ''}</span>`;
  };
  const grid = gridHtml(n, cell, slot, `${done ? 'solved' : ''}${picking ? ' picking' : ''}`);
  const side = look !== null ? sideView(n, cells, look) : '';
  const pad = editable ? keypad(n, {cell: sel}, cells[sel], shown, false) : edge !== null ? keypad(n, {slot: edge}, b.extra?.[0] === edge ? b.extra[1] : 0, shown, false) : '';
  let tools = '', note = '', extra = '';
  if (q.mode === 'city' && !done) {
    tools = `<button type="button" class="secondary tw-no${shown?.type === 'none' && !picking ? ' hinted' : ''}" ${uiAttrs({pick: !picking}, 'tw-no')} data-toggle="tw-no" aria-pressed="${picking}" ${b.refused || !b.tried ? 'disabled' : ''}>No city</button>`;
    note = b.refused ? 'A city fits.' : could !== null ? 'No edge number rules this square out.' : '';
  }
  if (q.mode === 'every') {
    if (!b.all) tools = `<button type="button" class="secondary tw-all${shown?.type === 'all' ? ' hinted' : ''}" ${moveAttrs({type: 'all'}, 'tw-all')} ${b.told ? 'disabled' : ''}>That’s all</button>`;
    note = b.told === 'more' ? 'There is another.' : '';
    const fitsNow = phase2 && b.extra ? new Set(fitting(n, withExtra(p, b.extra)).map(i => cityKey(cities(n)[i]))) : null;
    extra = found.length ? `<ol class="tw-found" aria-label="Cities found">${found.map((key, i) => {
      const dim = fitsNow && !fitsNow.has(key), mini = miniHtml(n, fromKey(key), {label: `City ${i + 1}: ${key.match(new RegExp(`.{${n}}`, 'g')).join(' ')}${fitsNow ? (dim ? ', does not fit' : ', fits') : ''}`});
      return `<li class="${dim ? 'dim' : ''}">${phase2 && !done ? `<button type="button" class="tw-pick-city" ${uiAttrs({view: i}, `tw-view-${i}`)} aria-pressed="${i === view}">${mini}</button>` : mini}</li>`;
    }).join('')}</ol>` : '';
  }
  if (q.mode === 'twins') extra = `<div class="tw-ref">${miniHtml(n, q.city, {label: 'The first city'})}</div>`;
  const status = done ? (b.line !== null && b.line !== undefined ? `No city: the tallest tower of ${lineWords(n, b.line)} has no place.` : 'Solved.') : `${cells.map((v, k) => v || '·').join('')}.${rep.size ? ' A height repeats.' : ''}${off.size ? ' An edge number does not fit.' : ''}${note ? ` ${note}` : ''}`;
  return `<div class="tw-board tw-mode-${q.mode}${editable ? ' latin-puzzle' : ''}${done ? ' solved' : ''}" data-mechanic-wire="towers"><div class="tw-main">${grid}${extra && q.mode === 'twins' ? extra : ''}</div>${side}${pad}${tools ? `<div class="tw-tools">${tools}</div>` : ''}${note ? `<p class="tw-note">${esc(note)}</p>` : ''}${q.mode === 'every' ? extra : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function renderDesign(p, a) {
  const q = qOf(p), n = q.order, b = a.board, done = solved(p, b), views = cluesOf(p);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const full = b.shown.length >= q.budget, second = done ? null : secondCity(p, b.shown);
  const cell = k => `<div class="latin-cell tw-cell tw-static" role="img" aria-label="${esc(`${capital(cellWords(n, k))}: ${q.city[k]}`)}">${fill(q.city[k], n)}</div>`;
  const slot = s => {
    const on = b.shown.includes(s), cls = `tw-slot toggle${on ? ' clue' : ''}${shown?.slot === s ? ' hinted' : ''}`;
    if (done) return `<span class="${cls}"${on ? ` role="img" aria-label="${esc(`${capital(slotWords(n, s))}: ${views[s]}`)}"` : ' aria-hidden="true"'}>${on ? views[s] : ''}</span>`;
    return `<button type="button" class="${cls}" ${moveAttrs({type: 'toggle', slot: s}, `tw-slot-${s}`)} aria-pressed="${on}" aria-label="${esc(`${capital(slotWords(n, s))}${on ? `: ${views[s]}. Hide it` : '. Show its number'}`)}" ${!on && full ? 'disabled' : ''}>${on ? views[s] : ''}</button>`;
  };
  const left = q.budget - b.shown.length;
  const beads = `<ol class="tw-beads" aria-label="${left} ${left === 1 ? 'number' : 'numbers'} left">${range(q.budget).map(k => `<li class="${k < b.shown.length ? 'used' : ''}"></li>`).join('')}</ol>`;
  const diff = second ? new Set(range(n * n).filter(k => second[k] !== q.city[k])) : new Set();
  const other = second ? `<figure class="tw-second">${miniHtml(n, second, {clues: shownClues(p, b.shown), mark: diff, label: `Another city that fits: ${second.join('')}`})}<figcaption>Also fits</figcaption></figure>` : '';
  const status = done ? 'Only this city fits.' : second ? `Another city fits too. It differs in ${diff.size} squares.` : '';
  return `<div class="tw-board tw-mode-design${done ? ' solved' : ''}" data-mechanic-wire="towers"><div class="tw-main">${gridHtml(n, cell, slot, done ? 'solved' : '')}${other}</div>${done ? '' : beads}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const render = (p, a) => qOf(p).mode === 'row' ? renderRow(p, a) : qOf(p).mode === 'design' ? renderDesign(p, a) : renderCity(p, a);

// Dragging one tower onto another swaps them; a digit key writes the added
// number after That's all (squares take digits through the Orchard's keys).
function wire(root, p, api) {
  const board = root.classList.contains('tw-board') ? root : root.querySelector('.tw-board');
  if (!board) return;
  if (qOf(p).mode === 'row') {
    let from = null;
    board.addEventListener('pointerdown', e => { const t = e.target.closest('.tw-tower[data-place]'); from = t ? Number(t.dataset.place) : null; });
    board.addEventListener('pointercancel', () => { from = null; });
    board.addEventListener('pointerup', e => {
      const start = from;
      from = null;
      if (start === null) return;
      const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.tw-tower[data-place]'), to = t ? Number(t.dataset.place) : null;
      if (to === null || to === start || solved(p, api.attempt().board)) return;
      e.preventDefault();
      api.apply({type: 'swap', a: Math.min(start, to), b: Math.max(start, to)});
    });
    return;
  }
  board.addEventListener('keydown', e => {
    const b = api.attempt().board, st = ui(p);
    if (qOf(p).mode !== 'every' || !b.all || solved(p, b) || !int(st.edge) || e.ctrlKey || e.metaKey || e.altKey) return;
    const v = ['Backspace', 'Delete', '0'].includes(e.key) ? 0 : /^[1-9]$/.test(e.key) ? Number(e.key) : null;
    if (v === null || v > qOf(p).order) return;
    e.preventDefault();
    api.apply({type: 'extra', slot: st.edge, value: v});
  });
}

export const towerMechanics = {
  towers: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const st = ui(p), n = qOf(p).order;
      if ('sel' in payload && int(payload.sel) && payload.sel >= 0 && payload.sel < n * n) Object.assign(st, {sel: payload.sel, pick: false});
      if ('edge' in payload && isSlot(n, payload.edge)) st.edge = payload.edge;
      if ('look' in payload && (payload.look === null || isSlot(n, payload.look) || payload.look === 'left' || payload.look === 'right')) st.look = payload.look;
      if ('pick' in payload && typeof payload.pick === 'boolean') st.pick = payload.pick;
      if ('view' in payload && int(payload.view) && payload.view >= 0) st.view = payload.view;
      if ('lift' in payload && (payload.lift === null || (int(payload.lift) && payload.lift >= 0 && payload.lift < n))) st.lift = payload.lift;
    },
    reset: p => { uiState.delete(p.id); },
    // A refused claim stays refused, cities found stay found, and “There is
    // another” stays until a new city is found, across Undo.
    carry(p, from, to) {
      const mode = qOf(p).mode;
      if (!object(from) || !object(to)) return to;
      if (mode === 'row' || mode === 'city') { const refused = Boolean(from.refused || to.refused); return {...to, refused, tried: Boolean(to.tried || refused)}; }
      if (mode === 'every' && Array.isArray(from.found) && Array.isArray(to.found)) return {...to, found: [...from.found, ...to.found.filter(k => !from.found.includes(k))], all: Boolean(from.all || to.all), told: from.all || to.all ? null : from.told};
      return to;
    }
  }
};

// The family seam entry (dist/families.js): a group in Symbol Orchard.
export default {
  id: 'towers',
  mechanics: towerMechanics,
  pack: new URL('./towers.json', import.meta.url).href,
  css: new URL('./towers.css', import.meta.url).href,
  focus: '.tw-board .latin-cell[aria-pressed="true"],button.tw-tower,button.tw-slot.open,button.tw-slot.toggle:not(:disabled),button.tw-slot'
};
