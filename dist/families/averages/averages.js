// Sharing circles (worksheet Week 20, averaging and the maximum principle).
// Squares keep their numbers; a circle works when its number is the average
// of every place joined to it, and lights then. Every circle must work at once:
// the discrete Dirichlet problem on a small graph.
//
// The solves are inverse or design goals, never a plain fill (with every
// circle lit live, a unique filling is only hill-climbing):
//   every   choose numbers so the circles work, finding every way, then That's all;
//   change  change one square so the circles work, finding every way;
//   tie     a circle is given the biggest square's number: make every circle
//           work, or press Can't and tap out the chase from that circle (every
//           place joined to a circle at the top must equal it) to a square
//           that is smaller, which breaks the chain. Nothing marks which place
//           to tap next: a tap on a place not joined to the chase ends it, and
//           a chase that runs out without a smaller square is a wrong Can't,
//           kept in the save (through Undo) until a number changes.
// Whole numbers only. The playground has every place free.
import {esc} from '../../expansion-controls.js';
import {graphOf, edgeGeometry, wireGraph, NODE_R} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// --- Fractions ----------------------------------------------------------------
// Exact arithmetic for the linear solves: [numerator, denominator], reduced.
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const frac = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return [n / g, d / g]; };
const fsub = ([a, b], [c, d]) => frac(a * d - c * b, b * d);
const fmul = ([a, b], [c, d]) => frac(a * c, b * d);
const fdiv = ([a, b], [c, d]) => frac(a * d, b * c);

// --- Boards -------------------------------------------------------------------
// A board is {places: {id: {at: [x%, y%], shape: 'square'|'circle', name}},
// edges: [[u, v], …], aspect, scale}. Names are spoken and used in hints.
const shapes = new Map();
export function shapeOf(q) {
  const key = JSON.stringify([q.places, q.edges, q.aspect, q.scale]);
  if (shapes.has(key)) return shapes.get(key);
  const ids = Object.keys(q.places), nb = Object.fromEntries(ids.map(id => [id, []]));
  for (const [u, v] of q.edges) { nb[u].push(v); nb[v].push(u); }
  const circles = ids.filter(id => q.places[id].shape === 'circle'), squares = ids.filter(id => q.places[id].shape === 'square');
  const g = graphOf({nodes: Object.fromEntries(ids.map(id => [id, q.places[id].at])), edges: q.edges, aspect: q.aspect, scale: q.scale});
  const shape = {ids, nb, circles, squares, g};
  shapes.set(key, shape);
  return shape;
}
export const isCircle = (q, id) => q.places[id]?.shape === 'circle';
export const isSquare = (q, id) => q.places[id]?.shape === 'square';
const nameOf = (q, id) => q.places[id].name;
const the = (q, id) => `the ${nameOf(q, id)}`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const an = n => /^(8|11|18)/.test(String(n)) ? 'an' : 'a';

// Every place's number: the given ones, then the board's (null when empty).
export const valuesOf = (q, values) => ({...q.given, ...values});
// A circle works when it and every place joined to it have numbers and its
// number times the count of neighbours is their total.
export function works(q, vals, c) {
  const near = shapeOf(q).nb[c];
  if (vals[c] === null || vals[c] === undefined || !near.length) return false;
  let total = 0;
  for (const v of near) { if (vals[v] === null || vals[v] === undefined) return false; total += vals[v]; }
  return vals[c] * near.length === total;
}
export const allWork = (q, vals) => shapeOf(q).circles.every(c => works(q, vals, c));

// The circles not in `known`, solved exactly from their averaging equations
// (Gauss–Jordan over fractions). Every square must be known. Returns
// {id: [n, d]}, or null when the equations do not fix them.
export function solve(q, known) {
  const {nb, circles} = shapeOf(q), unknown = circles.filter(c => known[c] === null || known[c] === undefined);
  const col = Object.fromEntries(unknown.map((c, i) => [c, i])), n = unknown.length;
  const rows = unknown.map(c => {
    const row = Array.from({length: n + 1}, () => frac(0));
    row[col[c]] = frac(nb[c].length);
    for (const v of nb[c]) {
      if (Object.hasOwn(col, v)) row[col[v]] = fsub(row[col[v]], frac(1));
      else row[n] = fsub(row[n], frac(-known[v]));
    }
    return row;
  });
  for (let k = 0; k < n; k++) {
    const pivot = rows.findIndex((r, i) => i >= k && r[k][0] !== 0);
    if (pivot < 0) return null;
    [rows[k], rows[pivot]] = [rows[pivot], rows[k]];
    const p = rows[k][k];
    rows[k] = rows[k].map(x => fdiv(x, p));
    for (let i = 0; i < n; i++) if (i !== k && rows[i][k][0] !== 0) { const f = rows[i][k]; rows[i] = rows[i].map((x, j) => fsub(x, fmul(f, rows[k][j]))); }
  }
  return Object.fromEntries(unknown.map((c, i) => [c, rows[i][n]]));
}
// The circles of a puzzle filled from given numbers and chosen squares: whole
// numbers in the range that make every circle work, or null.
function wholeFill(q, known) {
  const solved = solve(q, known);
  if (!solved) return null;
  const vals = {...known};
  for (const [c, [num, den]] of Object.entries(solved)) {
    if (den !== 1 || num < q.range[0] || num > q.range[1]) return null;
    vals[c] = num;
  }
  return allWork(q, vals) ? vals : null;
}

// --- Puzzles ------------------------------------------------------------------
// A puzzle's parameters add: mode, given {id: n} (locked places), free [ids]
// (the places the child sets, in hint order), range [lo, hi], and by mode:
// cards (every: a number may sit on one place only), start {id: n} (change:
// the squares' numbers before the change), target (tie: the given circle,
// whose number is the biggest square's). A way is the free places' numbers,
// in `free` order.
const wayCache = new Map();
export function waysOf(q) {
  const key = JSON.stringify(q);
  if (wayCache.has(key)) return wayCache.get(key);
  const out = [], squares = q.free.filter(id => isSquare(q, id));
  const keep = known => { const vals = wholeFill(q, known); if (!vals) return; const way = q.free.map(id => vals[id]); if (!q.cards || new Set(way).size === way.length) out.push(way); };
  if (q.mode === 'change') {
    for (const s of squares) for (let v = q.range[0]; v <= q.range[1]; v++) if (v !== q.start[s]) keep({...q.given, ...q.start, [s]: v});
  } else {
    const choose = (k, known) => {
      if (k === squares.length) return keep(known);
      for (let v = q.range[0]; v <= q.range[1]; v++) choose(k + 1, {...known, [squares[k]]: v});
    };
    choose(0, {...q.given});
  }
  out.sort((a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]; return 0; });
  wayCache.set(key, out);
  return out;
}
// Tie: the one filling with the given circle at the top, or null when there is none.
const fillCache = new Map();
export function fillingOf(q) {
  const key = JSON.stringify(q);
  if (!fillCache.has(key)) fillCache.set(key, wholeFill(q, {...q.given}));
  return fillCache.get(key);
}
export const topOf = q => q.given[q.target];

// --- The chase ----------------------------------------------------------------
// After Can't, the given circle is at the top: no place can be bigger than the
// biggest square in a board where every circle works, so every place joined to
// it must equal it. The chase is the list of places tapped, starting at the
// given circle; each later place is joined to a circle already in it. A square
// stops the chase: one with the same number agrees, a smaller one clashes.
export function clashOf(q, chase) {
  const last = chase?.at(-1);
  return last !== undefined && isSquare(q, last) && q.given[last] !== topOf(q) ? last : null;
}
export function chaseNext(q, chase) {
  const {nb} = shapeOf(q), have = new Set(chase), out = [];
  for (const c of chase) if (isCircle(q, c)) for (const v of nb[c]) if (!have.has(v) && !out.includes(v)) out.push(v);
  return out;
}
export function validChase(q, chase) {
  if (!Array.isArray(chase) || chase[0] !== q.target || new Set(chase).size !== chase.length) return false;
  for (let k = 1; k < chase.length; k++) {
    const id = chase[k];
    if (!Object.hasOwn(q.places, id) || !shapeOf(q).nb[id].some(c => isCircle(q, c) && chase.indexOf(c) >= 0 && chase.indexOf(c) < k)) return false;
    if (clashOf(q, chase.slice(0, k + 1)) && k !== chase.length - 1) return false;
  }
  return true;
}
// The fewest more taps from the chase to a clash, through circles only: the
// first place to tap, or null when every square the chase can reach agrees.
const stepCache = new Map();
export function chaseStep(q, chase) {
  const key = JSON.stringify([q, chase]);
  if (stepCache.has(key)) return stepCache.get(key);
  const {nb} = shapeOf(q), have = new Set(chase), from = {}, queue = [];
  for (const c of chase) if (isCircle(q, c)) for (const v of nb[c]) if (!have.has(v) && !Object.hasOwn(from, v)) { from[v] = null; queue.push(v); }
  let found = null;
  for (let k = 0; k < queue.length && !found; k++) {
    const v = queue[k];
    if (isSquare(q, v)) { if (q.given[v] !== topOf(q)) found = v; continue; }
    for (const w of nb[v]) if (!have.has(w) && !Object.hasOwn(from, w)) { from[w] = v; queue.push(w); }
  }
  let step = found;
  while (step !== null && from[step] !== null) step = from[step];
  stepCache.set(key, step);
  return step;
}
// The given circle's group (the circles joined to it through circles) and
// the squares it touches: the whole of what the chase forces.
export function groupOf(q, start) {
  const {nb} = shapeOf(q), group = [start];
  for (let k = 0; k < group.length; k++) for (const v of nb[group[k]]) if (isCircle(q, v) && !group.includes(v)) group.push(v);
  const touching = [...new Set(group.flatMap(c => nb[c].filter(v => isSquare(q, v))))];
  return {group, touching};
}
// A path in the chase from the given circle to its clash.
export function chasePath(q, chase) {
  const clash = clashOf(q, chase);
  if (!clash) return [];
  const {nb} = shapeOf(q), inChase = new Set(chase), prev = {[q.target]: null}, queue = [q.target];
  for (let k = 0; k < queue.length; k++) for (const v of nb[queue[k]]) if (inChase.has(v) && !Object.hasOwn(prev, v) && (isCircle(q, v) || v === clash)) { prev[v] = queue[k]; queue.push(v); }
  const path = [clash];
  while (prev[path[0]] !== null) path.unshift(prev[path[0]]);
  return path;
}
// Is the given circle's top possible at all? Exactly when its group touches
// no smaller square (the equality case of the maximum principle).
export const tieCan = q => groupOf(q, q.target).touching.every(s => q.given[s] === topOf(q));

// --- Boards and saves -----------------------------------------------------------
// every, change: {values, found, more, again, done}. `values` holds the free
// places (null when empty); `found` the ways kept, in order; `more` is set when
// That's all is refused and holds until a new way; `again` is the index of a
// found way the board shows again; `done` is That's all accepted.
// tie: {values, chase, told}. `told` is null, 'apart' (a chase ended by a tap
// on a place not joined to it) or 'out' (a chase that ran out without a
// smaller square: Can't stays off until a number changes).
// playground: {board, values} with every place free.
export const playBoard = (q, b) => ({...q.boards[b.board], mode: 'playground', given: {}, free: Object.keys(q.boards[b.board].places), range: q.range});
const boardQ = (p, b) => p.parameters.mode === 'playground' ? playBoard(p.parameters, b) : p.parameters;
const emptyValues = q => Object.fromEntries(q.free.map(id => [id, q.start?.[id] ?? null]));

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') { const board = Object.keys(q.boards)[0]; return {board, values: {...emptyValues(playBoard(q, {board})), ...q.boards[board].start}}; }
  if (q.mode === 'tie') return {values: emptyValues(q), chase: null, told: null};
  return {values: emptyValues(q), found: [], more: false, again: null, done: false};
}
const wayOf = (q, values) => q.free.map(id => values[id]);
const isWay = (q, values) => { const vals = valuesOf(q, values); return q.free.every(id => vals[id] !== null) && allWork(q, vals) && (q.mode !== 'change' || changed(q, values).length === 1); };
const changed = (q, values) => q.free.filter(id => isSquare(q, id) && values[id] !== q.start[id]);
const foundAt = (b, way) => b.found.findIndex(w => sameList(w, way));
const attempted = (q, values) => q.free.some(id => values[id] !== null);
// A tie attempt counts when a circle in the given circle's group has a number:
// the claim is about that group, and its certificate runs through it.
export const triedTie = (q, values) => groupOf(q, q.target).group.some(c => q.free.includes(c) && values[c] !== null);
const ranOut = (q, chase) => !clashOf(q, chase) && !chaseNext(q, chase).length;
function validValues(q, values) {
  if (!object(values) || Object.keys(values).sort().join() !== [...q.free].sort().join()) return false;
  if (!q.free.every(id => values[id] === null || (Number.isInteger(values[id]) && values[id] >= q.range[0] && values[id] <= q.range[1]))) return false;
  if (q.cards) { const set = q.free.map(id => values[id]).filter(v => v !== null); if (new Set(set).size !== set.length) return false; }
  if (q.mode === 'change') {
    if (!q.free.filter(id => isSquare(q, id)).every(id => values[id] !== null)) return false;
    if (changed(q, values).length > 1) return false;
  }
  return true;
}
function valid(p, b) {
  const q0 = p.parameters;
  if (!object(b)) return false;
  if (q0.mode === 'playground') {
    if (Object.keys(b).sort().join() !== 'board,values' || typeof b.board !== 'string' || !Object.hasOwn(q0.boards, b.board)) return false;
    return validValues(playBoard(q0, b), b.values);
  }
  const q = q0;
  if (q.mode === 'tie') {
    if (Object.keys(b).sort().join() !== 'chase,told,values' || !validValues(q, b.values)) return false;
    if (![null, 'apart', 'out'].includes(b.told)) return false;
    // A chase that ran out is possible only where no smaller square is reached.
    if (b.told === 'out' && !tieCan(q)) return false;
    if (b.chase === null) return true;
    // A chase starts only after an attempt, never on a board already solved,
    // and ends the moment it runs out.
    return b.told === null && triedTie(q, b.values) && !allWork(q, valuesOf(q, b.values)) && validChase(q, b.chase) && !ranOut(q, b.chase);
  }
  if (Object.keys(b).sort().join() !== 'again,done,found,more,values' || !validValues(q, b.values)) return false;
  if (typeof b.more !== 'boolean' || typeof b.done !== 'boolean' || !Array.isArray(b.found)) return false;
  const ways = waysOf(q);
  if (!b.found.every(w => Array.isArray(w) && ways.some(x => sameList(x, w)))) return false;
  if (new Set(b.found.map(w => w.join())).size !== b.found.length) return false;
  // A way is kept the moment the board makes it.
  if (isWay(q, b.values) && foundAt(b, wayOf(q, b.values)) < 0) return false;
  if (b.again !== null && !(Number.isInteger(b.again) && b.again >= 0 && b.again < b.found.length && sameList(b.found[b.again], wayOf(q, b.values)))) return false;
  if (b.more && (b.found.length === ways.length || b.done)) return false;
  return !b.done || (b.found.length === ways.length && !b.more);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'tie') return b.chase ? clashOf(q, b.chase) !== null : allWork(q, valuesOf(q, b.values));
  return b.done;
}

// --- Moves --------------------------------------------------------------------
// set: a number on a free place. With cards, a number already on another place
// moves from there (that place is left empty). In change puzzles a second
// square changed puts the first one back.
function setValue(q, values, id, value) {
  if (!q.free.includes(id) || !Number.isInteger(value) || value < q.range[0] || value > q.range[1]) return null;
  if (values[id] === value) return values;
  const next = {...values, [id]: value};
  if (q.cards) for (const other of q.free) if (other !== id && next[other] === value) next[other] = null;
  if (q.mode === 'change' && isSquare(q, id)) for (const s of changed(q, next)) if (s !== id) next[s] = q.start[s];
  return next;
}
function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = boardQ(p, b);
  if (q0.mode === 'playground') {
    if (action.type === 'set') { const values = setValue(q, b.values, action.id, action.value); return values && {...b, values}; }
    if (action.type === 'board' && typeof action.board === 'string' && Object.hasOwn(q0.boards, action.board) && action.board !== b.board) {
      const next = {board: action.board}, nq = playBoard(q0, next);
      ui(p).chosen = nq.free[0];
      return {...next, values: {...emptyValues(nq), ...q0.boards[action.board].start}};
    }
    return null;
  }
  if (q.mode === 'tie') {
    if (action.type === 'set' && b.chase === null) {
      const values = setValue(q, b.values, action.id, action.value);
      return !values ? null : values === b.values ? b : {...b, values, told: null};
    }
    if (action.type === 'cant' && b.chase === null && b.told !== 'out' && triedTie(q, b.values)) return {...b, chase: [q.target], told: null};
    if (action.type === 'stop' && b.chase !== null) return {...b, chase: null};
    if (action.type === 'chase' && b.chase !== null && Object.hasOwn(q.places, action.id) && !b.chase.includes(action.id)) {
      if (!chaseNext(q, b.chase).includes(action.id)) return {...b, chase: null, told: 'apart'};
      const chase = [...b.chase, action.id];
      return ranOut(q, chase) ? {...b, chase: null, told: 'out'} : {...b, chase};
    }
    return null;
  }
  if (action.type === 'set') {
    const values = setValue(q, b.values, action.id, action.value);
    if (!values || values === b.values) return values && b;
    if (!isWay(q, values)) return {...b, values, again: null};
    const way = wayOf(q, values), at = foundAt(b, way);
    return at >= 0 ? {...b, values, again: at} : {...b, values, found: [...b.found, way], more: false, again: null};
  }
  if (action.type === 'all' && !b.more) return b.found.length === waysOf(q).length ? {...b, done: true, again: null} : {...b, more: true, again: null};
  return null;
}

// --- Hints --------------------------------------------------------------------
const hintCache = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = JSON.stringify([p.id, b]);
  if (!hintCache.has(key)) hintCache.set(key, q.mode === 'tie' ? tieHint(q, b) : everyHint(q, b));
  return hintCache.get(key);
}
const setHint = (q, id, value) => ({type: 'move', action: {type: 'set', id, value}, text: `Make ${the(q, id)} ${value}.`, id});
// Every and change: the way not yet found that needs the fewest changes from
// here; squares first, then circles.
function everyHint(q, b) {
  const left = waysOf(q).filter(w => foundAt(b, w) < 0);
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const now = wayOf(q, b.values), dist = w => w.reduce((n, x, i) => n + (x !== now[i]), 0);
  const aim = left.reduce((best, w) => dist(w) < dist(best) ? w : best, left[0]);
  const order = [...q.free.filter(id => isSquare(q, id)), ...q.free.filter(id => isCircle(q, id))];
  const id = order.find(x => aim[q.free.indexOf(x)] !== b.values[x]);
  return setHint(q, id, aim[q.free.indexOf(id)]);
}
// Tie: fill the one filling where it exists. Where it doesn't, make an
// attempt (a circle on the chase made as big as the given one), give the
// reason, press Can't, then tap the chase toward the nearest smaller square.
function tieHint(q, b) {
  const fill = fillingOf(q), M = topOf(q);
  if (fill) {
    if (b.chase !== null) return {type: 'move', action: {type: 'stop'}, text: 'Press Can’t again.'};
    const id = q.free.find(c => b.values[c] !== fill[c]);
    return setHint(q, id, fill[id]);
  }
  if (b.chase === null) {
    if (!triedTie(q, b.values)) {
      const path = chasePath(q, chaseTo(q));
      const id = path.find(c => q.free.includes(c)) || groupOf(q, q.target).group.find(c => q.free.includes(c));
      return setHint(q, id, M);
    }
    const clash = chasePath(q, chaseTo(q)).at(-1);
    return {type: 'move', action: {type: 'cant'}, text: `Every place joined to ${an(M)} ${M} circle must be ${M} too, and ${the(q, clash)} can’t be.`};
  }
  const id = chaseStep(q, b.chase);
  return {type: 'move', action: {type: 'chase', id}, text: `Tap ${the(q, id)}.`, id};
}
// The chase the hints would tap from the start, to its clash.
function chaseTo(q) {
  let chase = [q.target];
  while (!clashOf(q, chase)) chase = [...chase, chaseStep(q, chase)];
  return chase;
}

// --- Choosing and tapping -----------------------------------------------------
// The chosen place is view state, outside the save.
const uiState = new Map();
function ui(p) {
  if (!uiState.has(p.id)) uiState.set(p.id, {chosen: null});
  return uiState.get(p.id);
}
function chosenOf(p, b) {
  const q = boardQ(p, b), c = ui(p).chosen;
  return q.free.includes(c) ? c : q.free[0];
}
const chasing = (p, b) => p.parameters.mode === 'tie' && b.chase !== null;
// What a tap on a place does: in a chase, extend it; otherwise choose a free place.
export function tapAction(p, b, id) {
  const q = boardQ(p, b);
  if (solved(p, b)) return null;
  if (chasing(p, b)) return Object.hasOwn(q.places, id) && !b.chase.includes(id) ? {move: {type: 'chase', id}} : null;
  return q.free.includes(id) ? {choose: id} : null;
}
// A key on a place edits that place; the number row edits the chosen one.
export function keyAction(p, b, key, focused = null) {
  const q = boardQ(p, b);
  if (solved(p, b) || chasing(p, b)) return null;
  const id = focused === null ? chosenOf(p, b) : focused;
  if (!q.free.includes(id)) return null;
  const now = b.values[id];
  let value = null;
  if (/^[0-9]$/.test(key)) value = Number(key);
  else if (key === 'ArrowUp' || key === 'ArrowRight') value = now === null ? q.range[0] : now + 1;
  else if (key === 'ArrowDown' || key === 'ArrowLeft') value = now === null ? q.range[1] : now - 1;
  if (value === null || value < q.range[0] || value > q.range[1] || value === now) return null;
  return {type: 'set', id, value};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const R = NODE_R;
// One place: a square or a circle, its number, and the rings that show its state.
function placeSVG(q, id, look) {
  const {g} = shapeOf(q), [x, y] = g.pos[id], sq = isSquare(q, id);
  const dot = sq ? `<rect class="gb-dot" x="${-R}" y="${-R}" width="${2 * R}" height="${2 * R}" rx="1.3"/>` : `<circle class="gb-dot" r="${R}"/>`;
  const ring = (cls, d, rx) => sq ? `<rect class="${cls}" x="${f(-R - d)}" y="${f(-R - d)}" width="${f(2 * R + 2 * d)}" height="${f(2 * R + 2 * d)}" rx="${rx}"/>` : `<circle class="${cls}" r="${f(R + d)}"/>`;
  const halo = ring('av-halo', 2, 2.6) + (look.cls?.includes('chosen') ? ring('av-ring', 3.6, 3.4) : '');
  const control = look.act ? `role="button" tabindex="0" aria-label="${esc(look.label)}" data-gb-node="${esc(id)}" data-focus="gb-node-${esc(id)}"` : `role="img" aria-label="${esc(look.label)}"`;
  const text = look.text === null || look.text === undefined ? '' : `<text class="gb-label" y="${f(R * .37)}">${esc(look.text)}</text>`;
  return `<g class="gb-node ${sq ? 'av-sq' : 'av-ci'} ${look.cls || ''}" transform="translate(${f(x)},${f(y)})${g.k === 1 ? '' : ` scale(${g.k})`}" data-node="${esc(id)}" ${control}><circle class="gb-reach" r="${f(R * 1.5)}"/>${halo}${dot}${text}${look.mark || ''}</g>`;
}
function edgesSVG(q, cls = () => '') {
  const {g} = shapeOf(q);
  return g.edges.map(e => { const {a, b} = edgeGeometry(g, e); return `<line class="gb-line ${cls(e)}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`; }).join('');
}
const pathSVG = (q, path, cls) => path.length > 1 ? `<polyline class="${cls}" points="${path.map(id => shapeOf(q).g.pos[id].map(f).join(',')).join(' ')}"/>` : '';
// In a chase the board itself can take focus, so focus after Can't lands on
// no particular place.
const boardSVG = (q, inner, label, cls = '') => `<svg class="gb-board av-board ${cls}" viewBox="-2 -2 104 ${f(shapeOf(q).g.height + 4)}" role="group" aria-label="${esc(label)}" data-gb-board${cls.includes('chasing') ? ' tabindex="-1"' : ''}>${inner}</svg>`;

// A small picture of a way, for the shelf: every place with its number.
function mini(q, vals, cls, label) {
  const {g, ids} = shapeOf(q), r = 10;
  const lines = g.edges.map(e => { const [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v]; return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }).join('');
  const dots = ids.map(id => {
    const [x, y] = g.pos[id], locked = !q.free.includes(id);
    const look = locked ? 'locked' : q.mode === 'change' && isSquare(q, id) && vals[id] !== q.start[id] ? 'changed' : 'own';
    const shape = isSquare(q, id) ? `<rect x="${f(x - r)}" y="${f(y - r)}" width="${2 * r}" height="${2 * r}" rx="1.6"/>` : `<circle cx="${f(x)}" cy="${f(y)}" r="${r}"/>`;
    return `<g class="${look}">${shape}<text x="${f(x)}" y="${f(y + r * .4)}">${vals[id] ?? ''}</text></g>`;
  }).join('');
  return `<li class="${cls}"><svg class="av-mini" viewBox="-10 -10 120 ${f(g.height + 20)}" role="img" aria-label="${esc(label)}"><g class="av-mini-lines">${lines}</g>${dots}</svg></li>`;
}
const wordsOf = (q, vals) => listWords(shapeOf(q).ids.map(id => `${nameOf(q, id)} ${vals[id] ?? 'empty'}`));

function keysHTML(p, q, b, chosen, hinted) {
  const value = b.values[chosen], hintValue = hinted?.action?.type === 'set' ? hinted.action.value : null;
  const keys = [];
  for (let v = q.range[0]; v <= q.range[1]; v++) {
    const elsewhere = q.cards ? q.free.find(id => id !== chosen && b.values[id] === v) : null;
    const cls = `av-key${q.cards ? ' av-card' : ''}${elsewhere ? ' used' : ''}${v === hintValue && hinted.action.id === chosen ? ' hinted' : ''}`;
    const label = `${v}${elsewhere ? `, on ${the(q, elsewhere)}` : ''}`;
    keys.push(`<button type="button" class="${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'set', id: chosen, value: v}))}" data-focus="av-key-${v}" aria-pressed="${value === v}" aria-label="${esc(label)}">${v}</button>`);
  }
  return `<div class="av-keys${q.range[1] - q.range[0] > 6 ? ' many' : ''}" role="group" aria-label="${esc(cap(nameOf(q, chosen)))}">${keys.join('')}</div>`;
}
const button = (label, action, cls, {enabled = true, pressed = null, hinted = false, focus, toggle} = {}) => `<button type="button" class="av-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus}"${toggle ? ` data-toggle="${toggle}"` : ''}${pressed === null ? '' : ` aria-pressed="${pressed}"`} ${enabled ? '' : 'disabled'}>${label}</button>`;

function render(p, a) {
  const q0 = p.parameters, b = a.board, q = boardQ(p, b), done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done && q0.mode !== 'playground' ? hint(p, b) : null;
  const chosen = chosenOf(p, b), chase = chasing(p, b) ? b.chase : null, vals = valuesOf(q, b.values);
  const M = q0.mode === 'tie' ? topOf(q) : null, proof = q0.mode === 'tie' && done && b.chase;
  const whole = proof ? groupOf(q, q.target) : null, path = proof ? chasePath(q, b.chase) : [];
  const node = id => {
    const free = q.free.includes(id), v = vals[id], lit = isCircle(q, id) && works(q, vals, id);
    const own = free && !(q.mode === 'change' && v === q.start[id]), changedHere = q.mode === 'change' && own && isSquare(q, id);
    const forced = (chase && chase.includes(id)) || (whole && (whole.group.includes(id) || whole.touching.includes(id)));
    const ghost = forced && isCircle(q, id);
    const agree = forced && isSquare(q, id) && q.given[id] === M, clash = forced && isSquare(q, id) && q.given[id] !== M;
    const tap = tapAction(p, b, id);
    const cls = [free ? 'free' : 'locked', own ? 'own' : '', changedHere ? 'changed' : '', v === null ? 'empty' : '', lit && !chase && !proof ? 'lit' : '', !chase && !done && free && id === chosen ? 'chosen' : '', ghost ? 'forced' : '', agree ? 'agree' : '', clash ? 'clash' : '', hinted?.id === id ? 'hinted' : ''].filter(Boolean).join(' ');
    const shown = ghost ? M : v;
    const state = ghost ? `, ${M} if the chase is right` : `, ${v === null ? 'empty' : v}${lit ? ', works' : ''}${agree ? `, ${M} too` : ''}${clash ? `, not ${M}` : ''}`;
    // In a chase every place not yet in it reads the same: nothing marks the next tap.
    const doing = !tap || tap.move ? '' : id === chosen ? '. Chosen' : '. Choose it';
    const mark = clash ? `<path class="av-cross" d="M${-R * .55},${-R * .55}L${R * .55},${R * .55}M${R * .55},${-R * .55}L${-R * .55},${R * .55}" transform="translate(${f(R * .95)},${f(-R * .95)}) scale(.5)"/>` : '';
    return placeSVG(q, id, {cls, text: shown, act: Boolean(tap), label: `${cap(nameOf(q, id))}${state}${doing}`, mark});
  };
  const inChase = new Set(chase || (whole ? [...whole.group, ...whole.touching] : []));
  const edgeCls = e => (inChase.has(e.u) && inChase.has(e.v) && (isCircle(q, e.u) || isCircle(q, e.v)) ? 'av-chased' : '');
  const over = proof ? pathSVG(q, path, 'av-path') : '';
  const board = boardSVG(q, `<g class="gb-edges">${edgesSVG(q, edgeCls)}</g>${over}<g class="gb-nodes">${shapeOf(q).ids.map(node).join('')}</g>`, q0.mode === 'playground' ? 'Board' : 'Board of squares and circles', chase ? 'chasing' : '');

  let top = '', bar = '', told = '', shelf = '';
  if (q0.mode === 'playground') {
    top = `<div class="av-boards" role="group" aria-label="Boards">${Object.keys(q0.boards).map(name => { const bq = playBoard(q0, {board: name}); return `<button type="button" class="av-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'board', board: name}))}" data-focus="av-board-${name}" aria-pressed="${b.board === name}" aria-label="${esc(q0.boards[name].title)}"><svg class="av-mini" viewBox="-10 -10 120 ${f(shapeOf(bq).g.height + 20)}" aria-hidden="true"><g class="av-mini-lines">${shapeOf(bq).g.edges.map(e => { const [x1, y1] = shapeOf(bq).g.pos[e.u], [x2, y2] = shapeOf(bq).g.pos[e.v]; return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }).join('')}</g>${shapeOf(bq).ids.map(id => { const [x, y] = shapeOf(bq).g.pos[id]; return isSquare(bq, id) ? `<rect class="locked" x="${f(x - 8)}" y="${f(y - 8)}" width="16" height="16" rx="1.6"/>` : `<circle class="own" cx="${f(x)}" cy="${f(y)}" r="8"/>`; }).join('')}</svg></button>`; }).join('')}</div>`;
  }
  const keys = !done && !chase ? keysHTML(p, q, b, chosen, hinted) : '';
  if (q0.mode === 'every' || q0.mode === 'change') {
    if (!done) bar = `<div class="av-bar">${button('That’s all', {type: 'all'}, 'av-all', {enabled: !b.more, hinted: hinted?.action?.type === 'all', focus: 'av-all'})}</div>`;
    told = b.again !== null ? 'Found already.' : b.more ? 'There is another.' : '';
    if (b.found.length) shelf = `<ul class="av-shelf" aria-label="Ways found">${b.found.map((w, k) => mini(q, valuesOf(q, Object.fromEntries(q.free.map((id, i) => [id, w[i]]))), [k === b.again ? 'again' : '', k === b.found.length - 1 && b.again === null && !b.more && !done ? 'new' : ''].filter(Boolean).join(' '), wordsOf(q, valuesOf(q, Object.fromEntries(q.free.map((id, i) => [id, w[i]])))))).join('')}</ul>`;
  } else if (q0.mode === 'tie' && !done) {
    const act = hinted?.action?.type;
    // The two refusals: a tap away from the chase, and a chase that ran out.
    told = b.told === 'apart' ? 'Not joined to the chase.' : b.told === 'out' ? `Every square it reaches is ${M}.` : '';
    bar = `<div class="av-bar">${chase ? button('Can’t', {type: 'stop'}, 'av-cant', {pressed: true, hinted: act === 'stop', focus: 'av-stop', toggle: 'av-cant'}) : button('Can’t', {type: 'cant'}, 'av-cant', {pressed: false, enabled: triedTie(q, b.values) && b.told !== 'out', hinted: act === 'cant', focus: 'av-cant', toggle: 'av-cant'})}</div>`;
  }
  const working = shapeOf(q).circles.filter(c => works(q, vals, c));
  const status = done && proof ? `Can’t: ${listWords(path.map(id => nameOf(q, id)))}; ${nameOf(q, path.at(-1))} is not ${M}.`
    : chase ? `Chasing from ${nameOf(q, q.target)}: ${listWords(chase.slice(1).map(id => nameOf(q, id))) || 'nothing yet'}.`
    : `${working.length ? `${cap(listWords(working.map(c => nameOf(q, c))))} ${working.length === 1 ? 'works' : 'work'}.` : 'No circle works yet.'}${!done ? ` ${cap(nameOf(q, chosen))} is chosen.` : ''}${told ? ` ${told}` : ''}`;
  return `<div class="av-puzzle${done ? ' solved' : ''}" data-mechanic-wire="averages">${top}${board}${keys}${bar}${told ? `<p class="av-told">${told}</p>` : ''}${shelf}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function wire(root, p, api) {
  const now = () => api.attempt().board;
  wireGraph(root, {
    node: id => {
      const action = tapAction(p, now(), id);
      if (!action) return null;
      if (action.choose) { if (ui(p).chosen !== action.choose || chosenOf(p, now()) !== action.choose) api.ui({chosen: action.choose}); return null; }
      return action.move;
    }
  }, api.apply);
  root.addEventListener('focusin', e => {
    const id = e.target.closest('[data-gb-node]')?.dataset.gbNode;
    if (!id || solved(p, now()) || chasing(p, now()) || !boardQ(p, now()).free.includes(id)) return;
    if (ui(p).chosen !== id) api.ui({chosen: id});
  });
  root.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || !e.target.closest('[data-gb-board],.av-keys')) return;
    const action = keyAction(p, now(), e.key, e.target.closest('[data-gb-node]')?.dataset.gbNode ?? null);
    if (!action) return;
    e.preventDefault();
    api.apply(action);
  });
}

export const averagesMechanics = {
  averages: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) { if (object(payload) && typeof payload.chosen === 'string') ui(p).chosen = payload.chosen; },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the ways found and a refused That's all, and a tie's chase
    // that ran out (Can't stays off until a number changes).
    carry(p, from, to) {
      const q = p.parameters;
      if (q.mode === 'tie') return object(from) && object(to) && from.told === 'out' ? {...to, chase: null, told: 'out'} : to;
      if ((q.mode !== 'every' && q.mode !== 'change') || !object(from) || !object(to) || !Array.isArray(from.found)) return to;
      // Found ways only grow, so the earlier board's list is the start of this one.
      return {...to, found: from.found.map(w => [...w]), more: from.more, done: false};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'averages',
  family: {id: 'averages', symbol: '⊜'},
  mechanics: averagesMechanics,
  pack: new URL('./averages.json', import.meta.url).href,
  css: new URL('./averages.css', import.meta.url).href,
  focus: '.av-board[tabindex],.av-board .gb-node[role=button],.av-key'
};
