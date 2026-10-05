// The mathematics of Polygon cuts (worksheet Week 14): a convex polygon with
// n labelled corners, A at the top and the rest clockwise, cut into
// triangles by diagonals that do not cross. A filling uses n − 3 diagonals
// and makes n − 2 triangles; there are 2, 5, 14, 42 and 132 fillings for n =
// 4 to 8 (the Catalan numbers). A flip swaps a diagonal for the other
// diagonal of the four-sided piece made by its two triangles, so every
// filling has exactly n − 3 flips, and flips connect all fillings. The
// distance to the fan at a corner v is n − 3 minus the diagonals already at
// v. Diagonals are numbered in the order AC, AD, …, BD, …; a set of them is
// kept sorted, and a filling's key is its names in that order ("AC AD AE").
// Nothing here knows about the app.
export const LETTERS = 'ABCDEFGH';
export const MIN_N = 4, MAX_N = 8;
const integer = value => Number.isSafeInteger(value);

const polygons = new Map();
export function polygonOf(n) {
  if (!integer(n) || n < MIN_N || n > MAX_N) return null;
  if (polygons.has(n)) return polygons.get(n);
  const diagonals = [];
  for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) if (!(a === 0 && b === n - 1)) diagonals.push([a, b]);
  const index = new Map(diagonals.map(([a, b], i) => [`${a},${b}`, i]));
  // Corners on a circle of radius 1, A at the top, clockwise (y down).
  const xy = [...Array(n).keys()].map(k => [Math.sin(2 * Math.PI * k / n), -Math.cos(2 * Math.PI * k / n)]);
  const P = {n, diagonals, index, names: diagonals.map(([a, b]) => LETTERS[a] + LETTERS[b]), xy};
  polygons.set(n, P);
  return P;
}
// The diagonal between two corners, or -1 for a side or the same corner.
export const diagonalOf = (P, a, b) => P.index.get(a < b ? `${a},${b}` : `${b},${a}`) ?? -1;
// Two diagonals cross when their ends alternate round the polygon.
export function crosses(P, d, e) {
  const [a, b] = P.diagonals[d], [c, f] = P.diagonals[e];
  if (a === c || a === f || b === c || b === f) return false;
  return (a < c && c < b) !== (a < f && f < b);
}
export function legalSet(P, ds) {
  if (!P || !Array.isArray(ds) || !ds.every(d => integer(d) && d >= 0 && d < P.diagonals.length)) return false;
  for (let i = 0; i < ds.length; i++) {
    if (i && ds[i] <= ds[i - 1]) return false;
    for (let j = 0; j < i; j++) if (crosses(P, ds[i], ds[j])) return false;
  }
  return true;
}
export const isFull = (P, ds) => ds.length === P.n - 3;
export const add = (ds, d) => [...ds, d].sort((x, y) => x - y);
export const remove = (ds, d) => ds.filter(x => x !== d);

// The pieces a set of diagonals cuts the polygon into, each a list of
// corners in clockwise order.
export function pieces(P, ds) {
  let faces = [[...Array(P.n).keys()]];
  for (const d of ds) {
    const [a, b] = P.diagonals[d], i = faces.findIndex(f => f.includes(a) && f.includes(b)), f = faces[i];
    const [s, t] = [f.indexOf(a), f.indexOf(b)].sort((x, y) => x - y);
    faces = [...faces.slice(0, i), f.slice(s, t + 1), [...f.slice(t), ...f.slice(0, s + 1)], ...faces.slice(i + 1)];
  }
  return faces;
}
// The diagonal a flip of `d` draws instead, or -1 when a piece beside `d`
// is not a triangle.
export function flipOf(P, ds, d) {
  if (!ds.includes(d)) return -1;
  const [a, b] = P.diagonals[d], beside = pieces(P, ds).filter(f => f.includes(a) && f.includes(b));
  if (beside.length !== 2 || beside.some(f => f.length !== 3)) return -1;
  const [c, e] = beside.map(f => f.find(k => k !== a && k !== b));
  return diagonalOf(P, c, e);
}
export const flip = (P, ds, d) => { const e = flipOf(P, ds, d); return e < 0 ? null : add(remove(ds, d), e); };

export const keyOf = (P, ds) => ds.map(d => P.names[d]).join(' ');
export function fromKey(P, key) {
  if (typeof key !== 'string') return null;
  const ds = key === '' ? [] : key.split(' ').map(name => P.names.indexOf(name));
  return ds.some(d => d < 0) || !legalSet(P, ds) ? null : ds;
}
export const fanOf = (P, v) => P.diagonals.map((_, d) => d).filter(d => P.diagonals[d].includes(v));

// Every filling, as sorted diagonal lists, from the triangle on side A–last:
// its third corner k splits the rest into two smaller polygons.
const allCache = new Map();
export function fillings(P) {
  if (allCache.has(P.n)) return allCache.get(P.n);
  const go = (lo, hi) => {
    if (hi - lo < 2) return [[]];
    const out = [];
    for (let k = lo + 1; k < hi; k++) {
      const here = [diagonalOf(P, lo, k), diagonalOf(P, k, hi)].filter(d => d >= 0);
      for (const left of go(lo, k)) for (const right of go(k, hi)) out.push([...here, ...left, ...right].sort((x, y) => x - y));
    }
    return out;
  };
  const list = go(0, P.n - 1);
  allCache.set(P.n, list);
  return list;
}
// Fillings that keep every diagonal of `kept`.
export const completions = (P, kept = []) => fillings(P).filter(ds => kept.every(d => ds.includes(d)));
// The third corner of the triangle on side A–last (the guide's "triangle
// on AF" in the hexagon), used to sort a collection.
export const apexOf = (P, ds) => { const f = pieces(P, ds).find(f => f.includes(0) && f.includes(P.n - 1) && f.length === 3); return f ? f.find(k => k !== 0 && k !== P.n - 1) : -1; };

// The flip map: each filling's key and the keys one flip away.
const mapCache = new Map();
export function flipMap(P) {
  if (mapCache.has(P.n)) return mapCache.get(P.n);
  const map = new Map(fillings(P).map(ds => [keyOf(P, ds), ds.map(d => keyOf(P, flip(P, ds, d)))]));
  mapCache.set(P.n, map);
  return map;
}
// Flips from every filling to `key`, by search on the flip map.
const distCache = new Map();
export function distancesTo(P, key) {
  const id = `${P.n}|${key}`;
  if (distCache.has(id)) return distCache.get(id);
  const map = flipMap(P), dist = new Map([[key, 0]]), queue = [key];
  for (let i = 0; i < queue.length; i++) for (const next of map.get(queue[i])) if (!dist.has(next)) { dist.set(next, dist.get(queue[i]) + 1); queue.push(next); }
  distCache.set(id, dist);
  return dist;
}
