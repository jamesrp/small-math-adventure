// Three-colour triangles (Sperner's lemma) on any board of triangles: the
// boards, the letters each point may take, rainbow triangles, doors and the
// walks through them. The family module draws and plays; this module only
// computes. See docs/rainbow/README.md.
import {meshOf} from '../../tri-mesh.js';

export const LETTERS = 'RBY';
const H = Math.sqrt(3) / 2;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// A big triangle cut into `steps` rows of little triangles, R at the bottom
// left, B at the bottom right and Y at the top. Points are numbered in rows
// from the bottom, left to right, so a worksheet row code such as
// RBRB/RYB/RB/Y reads straight into a labels string. Cells are numbered left
// to right along each strip, from the bottom strip up, as in the guide.
// `centres` lists cells to cut into three round a new middle point; the new
// points come after the grid points and the three new cells replace the old
// one in place. A side's points may use that side's two corner letters;
// `free` lists points that may use any letter (the boundary exception).
export function validBoardSpec(spec) {
  if (!object(spec) || !Number.isSafeInteger(spec.steps) || spec.steps < 1 || spec.steps > 8) return false;
  const cells = spec.steps * spec.steps, points = (spec.steps + 1) * (spec.steps + 2) / 2;
  if (spec.centres !== undefined && !(Array.isArray(spec.centres) && spec.centres.every(c => Number.isSafeInteger(c) && c >= 0 && c < cells) && new Set(spec.centres).size === spec.centres.length)) return false;
  if (spec.free !== undefined && !(Array.isArray(spec.free) && spec.free.every(k => Number.isSafeInteger(k) && k >= 0 && k < points))) return false;
  return Object.keys(spec).every(k => ['steps', 'centres', 'free'].includes(k));
}

const cache = new Map();
export function boardOf(spec) {
  const key = JSON.stringify(spec);
  if (cache.has(key)) return cache.get(key);
  const n = spec.steps, points = [], at = new Map(), allowed = [];
  for (let v = 0; v <= n; v++) for (let u = 0; u <= n - v; u++) {
    at.set(`${u},${v}`, points.length);
    points.push([u + v / 2, H * v]);
    allowed.push(u === 0 && v === 0 ? 'R' : u === n ? 'B' : v === n ? 'Y' : v === 0 ? 'RB' : u === 0 ? 'RY' : u + v === n ? 'BY' : 'RBY');
  }
  const P = (u, v) => at.get(`${u},${v}`), grid = [];
  for (let v = 0; v < n; v++) for (let u = 0; u < n - v; u++) {
    grid.push([P(u, v), P(u + 1, v), P(u, v + 1)]);
    if (u + v < n - 1) grid.push([P(u + 1, v), P(u + 1, v + 1), P(u, v + 1)]);
  }
  const split = new Set(spec.centres || []), cells = [];
  grid.forEach((c, i) => {
    if (!split.has(i)) { cells.push(c); return; }
    const k = points.length;
    points.push([0, 1].map(d => c.reduce((s, p) => s + points[p][d], 0) / 3));
    allowed.push('RBY');
    cells.push([c[0], c[1], k], [c[1], c[2], k], [c[2], c[0], k]);
  });
  for (const k of spec.free || []) allowed[k] = LETTERS;
  const corners = [P(0, 0), P(n, 0), P(0, n)];
  const board = {spec, m: meshOf({points, cells}), allowed, corners, steps: n};
  cache.set(key, board);
  return board;
}

// Labels are a string with one letter per point.
export const legal = (board, labels) => typeof labels === 'string' && labels.length === board.allowed.length && [...labels].every((c, k) => board.allowed[k].includes(c));
export const isRainbow = (m, labels, i) => new Set(m.cells[i].map(k => labels[k])).size === 3;
export const rainbows = (m, labels) => m.cells.map((_, i) => i).filter(i => isRainbow(m, labels, i));
export const isDoor = (m, labels, e) => { const [a, b] = m.edges[e]; return labels[a] !== labels[b] && labels[a] !== 'Y' && labels[b] !== 'Y'; };
export const doorsOf = (m, labels) => m.edges.map((_, e) => e).filter(e => isDoor(m, labels, e));
export const cellDoors = (m, labels, i) => m.cellEdges[i].filter(e => isDoor(m, labels, e));

// The walks through the doors. Each door joins the two triangles beside it,
// or a triangle and the outside. A triangle has 0, 1 or 2 doors, so the doors
// fall into walks: outside to outside, outside to a rainbow triangle, rainbow
// to rainbow, or a loop. Each walk is {doors, cells, ends}, with `ends` two
// of 'out' and 'rainbow' (or ['loop', 'loop']), walked from an outside door
// first, then from rainbow triangles.
export function walksOf(m, labels) {
  const used = new Set(), walks = [];
  const walk = (cell, door) => {
    const doors = door === null ? [] : [door], cells = [cell];
    if (door !== null) used.add(door);
    for (;;) {
      const next = cellDoors(m, labels, cell).find(e => !used.has(e) && !doors.includes(e));
      if (next === undefined) return {doors, cells, end: 'rainbow'};
      used.add(next); doors.push(next);
      const other = m.edgeCells[next].find(j => j !== cell);
      if (other === undefined) return {doors, cells, end: 'out'};
      if (other === cells[0] && door === null && cellDoors(m, labels, other).length === 2) return {doors, cells, end: 'loop'};
      cell = other; cells.push(cell);
    }
  };
  for (const e of doorsOf(m, labels)) if (m.outer[e] && !used.has(e)) { const w = walk(m.edgeCells[e][0], e); walks.push({...w, ends: ['out', w.end]}); }
  for (const i of rainbows(m, labels)) if (!cellDoors(m, labels, i).some(e => used.has(e))) { const w = walk(i, null); walks.push({...w, ends: ['rainbow', w.end]}); }
  for (const e of doorsOf(m, labels)) if (!used.has(e)) {
    const [i] = m.edgeCells[e], w = walk(i, null);
    walks.push({...w, ends: ['loop', 'loop']});
  }
  return walks;
}

// Every legal labelling, as strings, by trying each point's letters in turn.
export function* fillings(board) {
  const k = board.allowed.length, out = new Array(k);
  function* go(i) {
    if (i === k) { yield out.join(''); return; }
    for (const c of board.allowed[i]) { out[i] = c; yield* go(i + 1); }
  }
  yield* go(0);
}
// How many fillings have each number of rainbow triangles, with `fixed` a
// labels string whose non-dot letters must stay.
export function countTable(board, fixed = null) {
  const table = new Map();
  for (const labels of fillings(board)) {
    if (fixed && [...fixed].some((c, k) => c !== '.' && c !== labels[k])) continue;
    const n = rainbows(board.m, labels).length;
    table.set(n, (table.get(n) || 0) + 1);
  }
  return new Map([...table].sort((a, b) => a[0] - b[0]));
}
// Row codes like RBRB/RYB/RB/Y for a plain board, read bottom row first.
export const fromRows = code => code.replace(/\//g, '');
export function toRows(board, labels) {
  const rows = [];
  let k = 0;
  for (let v = 0; v <= board.steps; v++) { rows.push(labels.slice(k, k + board.steps - v + 1)); k += board.steps - v + 1; }
  return rows.join('/') + (labels.length > k ? `+${labels.slice(k)}` : '');
}
