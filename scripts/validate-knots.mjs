// Checks the Knot colours pack (dist/families/knots/knots.json) by methods
// unlike the builder's and the mechanic's:
// - every picture's crossing code is rebuilt from the drawn arcs alone (which
//   arc end continues into which arc start across a gap, which arc covers the
//   gap, the crossing's sign from the two directions) and must equal the
//   stored code and the stored crossings and end dots; no two arcs may touch;
// - each knot's Jones polynomial, from that code by the Kauffman bracket,
//   must be the table's (a flipped crossing changes it), the table itself is
//   checked against KnotInfo's PD codes, and the tangles' codes against a
//   table written out by hand;
// - every colouring is found by brute force with Fox's rule written as
//   2 × top ≡ in + out (mod 3), and compared with the mechanic's answers and
//   claims; every certificate is replayed one forced arc at a time;
// - the claims are the child's certificates: on every partial colouring of
//   every claim puzzle, the mechanic accepts One colour only or Can't exactly
//   when an independent check finds a forced chain to a clash, and that never
//   happens when the claim is false;
// - the before and after pictures agree at their ends for every choice of
//   inputs; witnesses are played as moves; hint chains solve from fresh,
//   after every single wrong colour, after random wrong starts, after a wrong
//   claim and after a wrong That's all; illegal moves and forged saves are
//   refused; the playground's knots are checked the same way.
// Run: node scripts/validate-knots.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {completions, certificate} from '../dist/families/knots/knots.js';

const addTerm = (p, e, c) => { p.set(e, (p.get(e) || 0) + c); if (!p.get(e)) p.delete(e); };
const times = (p, q) => { const r = new Map(); for (const [a, x] of p) for (const [b, y] of q) addTerm(r, a + b, x * y); return r; };
// PD code (KnotInfo convention: X[i, j, k, l] counterclockwise from the
// incoming under edge i) from a signed Gauss code of one closed strand.
export function pdOfCode(code) {
  assert.equal(code.strands.length, 1, 'one closed strand');
  const s = code.strands[0], L = s.visits.length, edge = k => ((k % L) + L) % L + 1, at = {};
  s.visits.forEach((v, k) => { at[Math.abs(v)] ||= {}; at[Math.abs(v)][v > 0 ? 'o' : 'u'] = k; });
  return Object.keys(at).map(Number).sort((a, b) => a - b).map(c => {
    const {o, u} = at[c], ui = edge(u - 1), uo = edge(u), oi = edge(o - 1), oo = edge(o);
    return code.signs[c - 1] > 0 ? [ui, oo, uo, oi] : [ui, oi, uo, oo];
  });
}
// The Kauffman bracket by its state sum (A-smoothing joins i–j and k–l), then
// V(t) = (−A³)^(−w) ⟨D⟩ at A = t^(−1/4). The writhe counts X[i,j,k,l] as
// positive when the over strand runs from l to j.
export function jonesOfPD(pd) {
  const n = pd.length, m = Math.max(...pd.flat()), total = new Map();
  for (let s = 0; s < 1 << n; s++) {
    const parent = new Map(), find = e => { while (parent.get(e) !== e) e = parent.get(e); return e; };
    for (const x of pd) for (const e of x) parent.set(e, e);
    let a = 0;
    pd.forEach(([i, j, k, l], c) => {
      const A = ((s >> c) & 1) === 0;
      if (A) a++;
      for (const [u, v] of A ? [[i, j], [k, l]] : [[i, l], [j, k]]) parent.set(find(u), find(v));
    });
    let term = new Map([[2 * a - n, 1]]);
    const loops = new Set([...parent.keys()].map(find)).size;
    for (let k = 1; k < loops; k++) term = times(term, new Map([[2, -1], [-2, -1]]));
    for (const [e, c] of term) addTerm(total, e, c);
  }
  const w = pd.reduce((sum, [, j, , l]) => sum + (j === l % m + 1 ? 1 : -1), 0);
  const v = times(new Map([[-3 * w, w % 2 ? -1 : 1]]), total), out = new Map();
  for (const [e, c] of v) out.set(-e / 4, c);
  return out;
}
export const jonesOfCode = code => jonesOfPD(pdOfCode(code));
const asList = p => [...p].sort((a, b) => a[0] - b[0]);
// Equal, or equal after t → 1/t (the mirror image).
export function samePolynomial(p, q) {
  const mirror = new Map([...q].map(([e, c]) => [-e, c]));
  return [q, mirror].some(r => JSON.stringify(asList(p)) === JSON.stringify(asList(r)));
}
const poly = terms => new Map(Object.entries(terms).map(([e, c]) => [Number(e), c]));
// Jones polynomials from KnotInfo (exponent: coefficient), for one chirality.
const T31 = poly({1: 1, 3: 1, 4: -1});
export const JONES = {
  plain: poly({0: 1}),
  trefoil: T31,
  figure8: poly({'-2': 1, '-1': -1, 0: 1, 1: -1, 2: 1}),
  cinquefoil: poly({'-7': -1, '-6': 1, '-5': -1, '-4': 1, '-2': 1}),
  '5_2': poly({'-6': -1, '-5': 1, '-4': -1, '-3': 2, '-2': -1, '-1': 1}),
  '6_1': poly({'-4': 1, '-3': -1, '-2': 1, '-1': -2, 0: 2, 1: -1, 2: 1}),
  granny: times(T31, T31)
};
// KnotInfo's PD codes, to check the computation above on codes from elsewhere.
export const KNOTINFO_PD = {
  trefoil: [[1, 5, 2, 4], [3, 1, 4, 6], [5, 3, 6, 2]],
  figure8: [[4, 2, 5, 1], [8, 6, 1, 5], [6, 3, 7, 4], [2, 7, 3, 8]],
  cinquefoil: [[2, 8, 3, 7], [4, 10, 5, 9], [6, 2, 7, 1], [8, 4, 9, 3], [10, 6, 1, 5]],
  '5_2': [[1, 5, 2, 4], [3, 9, 4, 8], [5, 1, 6, 10], [7, 3, 8, 2], [9, 7, 10, 6]],
  '6_1': [[1, 7, 2, 6], [3, 10, 4, 11], [5, 3, 6, 2], [7, 1, 8, 12], [9, 4, 10, 5], [11, 9, 12, 8]]
};

// --- Geometry: the code from the drawn arcs -------------------------------------
const sub = (p, q) => [p[0] - q[0], p[1] - q[1]], cross2 = (u, v) => u[0] * v[1] - u[1] * v[0], dot = (u, v) => u[0] * v[0] + u[1] * v[1];
const unit = v => { const L = Math.hypot(...v); return [v[0] / L, v[1] / L]; };
const near = (p, q, tol) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol;
// Where segments ab and cd meet, endpoints included: [s along ab, t along cd].
function meet(a, b, c, d) {
  const r = sub(b, a), s = sub(d, c), den = cross2(r, s);
  if (Math.abs(den) < 1e-12) return null;
  const q = sub(c, a), t = cross2(q, s) / den, u = cross2(q, r) / den;
  return t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 ? [t, u] : null;
}
// Every place a segment ab meets a polyline: [{at: index + fraction, p, dir}].
function hits(a, b, line) {
  const out = [];
  for (let i = 0; i + 1 < line.length; i++) {
    const m = meet(a, b, line[i], line[i + 1]);
    if (m) out.push({along: i + m[1], s: m[0], p: [a[0] + m[0] * (b[0] - a[0]), a[1] + m[0] * (b[1] - a[1])], dir: sub(line[i + 1], line[i])});
  }
  return out;
}
const closedArc = d => d.length > 2 && near(d[0], d.at(-1), 1e-9);
// Rebuild one picture's code from its arcs (in board order) alone.
export function codeFromArcs(arcs, label) {
  const n = arcs.length, ids = arcs.map(a => a.index);
  // No arc touches another, and no arc crosses itself.
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    const A = arcs[i].d, B = arcs[j].d;
    for (let s = 0; s + 1 < A.length; s++) for (let t = i === j ? s + 2 : 0; t + 1 < B.length; t++) {
      if (i === j && closedArc(A) && s === 0 && t === A.length - 2) continue;
      assert.equal(meet(A[s], A[s + 1], B[t], B[t + 1]), null, `${label}: arcs ${ids[i]} and ${ids[j]} do not touch`);
    }
  }
  // Pair each arc end with the arc start it continues into across a gap: the
  // chord points along both ends' directions and passes over exactly one arc.
  const gaps = [], usedStart = new Set();
  arcs.forEach((a, i) => {
    if (closedArc(a.d)) return;
    const end = a.d.at(-1), tEnd = unit(sub(end, a.d.at(-2)));
    const found = arcs.map((b, j) => {
      if (closedArc(b.d)) return null;
      const start = b.d[0], chord = sub(start, end), L = Math.hypot(...chord);
      if (L < 1 || L > 16) return null;
      const g = unit(chord), tStart = unit(sub(b.d[1], start));
      if (dot(g, tEnd) < 0.9 || dot(g, tStart) < 0.9) return null;
      const over = arcs.flatMap((c, k) => hits(end, start, c.d).filter(h => h.s > 1e-6 && h.s < 1 - 1e-6).map(h => ({...h, k})));
      return over.length === 1 ? {from: i, to: j, over: over[0], dir: g} : null;
    }).filter(Boolean);
    assert.ok(found.length <= 1, `${label}: arc ${ids[i]} continues in one way only`);
    if (!found.length) return;
    assert.ok(!usedStart.has(found[0].to), `${label}: one arc end reaches arc ${ids[found[0].to]}`);
    usedStart.add(found[0].to);
    gaps.push(found[0]);
  });
  // Gap chords do not cross each other.
  for (const g of gaps) for (const h of gaps) if (g !== h) assert.equal(meet(arcs[g.from].d.at(-1), arcs[g.to].d[0], arcs[h.from].d.at(-1), arcs[h.to].d[0]), null, `${label}: gaps stay apart`);
  const next = new Map(gaps.map(g => [g.from, g])), prev = new Map(gaps.map(g => [g.to, g]));
  // Strands: open ones from an arc with no gap before it, closed ones round.
  const strands = [], seen = new Set();
  const walk = (i, closed) => { const out = []; let k = i; do { out.push(k); seen.add(k); k = next.get(k)?.to; } while (k !== undefined && k !== i); return {arcs: out, closed}; };
  for (let i = 0; i < n; i++) if (!seen.has(i) && (closedArc(arcs[i].d) || !prev.has(i))) strands.push(walk(i, closedArc(arcs[i].d)));
  for (let i = 0; i < n; i++) if (!seen.has(i)) strands.push(walk(i, true));
  strands.sort((a, b) => Math.min(...a.arcs) - Math.min(...b.arcs));
  // A strand's arcs are numbered in order along it, from its first arc.
  for (const s of strands) {
    const first = Math.min(...s.arcs), at = s.arcs.indexOf(first), order = [...s.arcs.slice(at), ...s.arcs.slice(0, at)];
    assert.deepEqual(order, order.map((_, k) => first + k), `${label}: arcs are numbered along their strand`);
    s.arcs = order;
  }
  // Visits along each strand: the gaps an arc passes over, in order along it,
  // then the gap at its end.
  const id = new Map(), visits = [];
  const idOf = g => { if (!id.has(g)) id.set(g, id.size + 1); return id.get(g); };
  const code = {strands: [], signs: []};
  for (const s of strands) {
    const v = [];
    for (const i of s.arcs) {
      gaps.filter(g => g.over.k === i).sort((a, b) => a.over.along - b.over.along).forEach(g => v.push(idOf(g)));
      if (next.has(i)) v.push(-idOf(next.get(i)));
    }
    code.strands.push({closed: s.closed, visits: v});
  }
  const byId = [...id.entries()].sort((a, b) => a[1] - b[1]).map(([g]) => g);
  code.signs = byId.map(g => -Math.sign(cross2(g.over.dir, g.dir)));
  const ends = strands.filter(s => !s.closed).flatMap(s => [{at: arcs[s.arcs[0]].d[0], arc: ids[s.arcs[0]]}, {at: arcs[s.arcs.at(-1)].d.at(-1), arc: ids[s.arcs.at(-1)]}]);
  const crossings = byId.map(g => ({at: g.over.p, over: ids[g.over.k], under: [ids[g.from], ids[g.to]]}));
  return {code, crossings, ends};
}
// Check a board (a puzzle's or a playground knot's) against its drawing.
function checkDrawing(q, label, {dots = true} = {}) {
  assert.ok(Array.isArray(q.pictures) && q.pictures.length >= 1, `${label}: pictures`);
  q.pictures.forEach((pic, k) => {
    const arcs = q.arcs.map((a, index) => ({...a, index})).filter(a => (a.pic ?? 0) === k), tag = `${label} picture ${k + 1}`;
    assert.deepEqual(pic.arcs || [0, q.arcs.length], [arcs[0].index, arcs.at(-1).index + 1], `${tag}: arc range`);
    const built = codeFromArcs(arcs, tag);
    assert.deepEqual(built.code, pic.code, `${tag}: the stored code is the drawing’s`);
    const mine = q.crossings.filter(x => (x.pic ?? 0) === k);
    assert.equal(mine.length, built.crossings.length, `${tag}: one stored crossing per drawn crossing`);
    for (const x of built.crossings) {
      const stored = mine.filter(y => near(y.at, x.at, 0.5));
      assert.equal(stored.length, 1, `${tag}: a stored crossing at (${x.at.map(v => v.toFixed(1))})`);
      assert.deepEqual([stored[0].over, ...stored[0].under], [x.over, ...x.under], `${tag}: crossing at (${x.at.map(v => v.toFixed(1))}) has the drawn arcs`);
    }
    const ends = q.ends.filter(e => (e.pic ?? 0) === k);
    if (!dots) return assert.equal(ends.length, 0, `${tag}: no end dots`);
    assert.equal(ends.length, built.ends.length, `${tag}: one dot per strand end`);
    built.ends.forEach((e, i) => { assert.ok(near(ends[i].at, e.at, 0.02), `${tag}: dot ${i + 1} sits at its strand’s end`); assert.equal(ends[i].arc, e.arc, `${tag}: dot ${i + 1} belongs to its arc`); });
  });
}

// --- Colourings by brute force ------------------------------------------------------
const m3 = n => ((n % 3) + 3) % 3;
const foxOk = (q, c) => q.crossings.every(x => m3(2 * c[x.over] - c[x.under[0]] - c[x.under[1]]) === 0)
  && q.ends.every(e => (e.colour === undefined || c[e.arc] === e.colour) && (e.match === undefined || c[e.arc] === c[q.ends[e.match].arc]));
export function bruteColourings(q, start = q.locked || q.arcs.map(() => null)) {
  const free = start.map((c, i) => c === null ? i : -1).filter(i => i >= 0), out = [];
  for (let k = 0; k < 3 ** free.length; k++) {
    const c = [...start];
    free.forEach((a, j) => { c[a] = Math.floor(k / 3 ** j) % 3; });
    if (foxOk(q, c)) out.push(c);
  }
  return out.map(c => c.join('')).sort();
}
// Replay a certificate: from the start, each coloured arc must be forced by a
// crossing with its two other arcs coloured (or by a dot), and some crossing
// or dot must then fail.
function replay(q, start, shown, label) {
  const c = [...start], want = shown.map(v => v ?? null);
  for (let changed = true; changed;) {
    changed = false;
    for (const x of q.crossings) {
      const slots = [x.over, ...x.under], open = [...new Set(slots.filter(a => c[a] === null))];
      if (open.length !== 1) continue;
      const a = open[0];
      for (const v of [0, 1, 2]) { const t = [...c]; t[a] = v; if (m3(2 * t[x.over] - t[x.under[0]] - t[x.under[1]]) === 0 && want[a] === v) { c[a] = v; changed = true; } }
    }
    for (const e of q.ends) {
      if (e.colour !== undefined && c[e.arc] === null && want[e.arc] === e.colour) { c[e.arc] = e.colour; changed = true; }
      if (e.match !== undefined) { const b = q.ends[e.match].arc; if (c[e.arc] === null && c[b] !== null && want[e.arc] === c[b]) { c[e.arc] = c[b]; changed = true; } }
    }
  }
  assert.deepEqual(c, want, `${label}: every colour shown is forced`);
  const fails = q.crossings.some(x => [x.over, ...x.under].every(a => c[a] !== null) && m3(2 * c[x.over] - c[x.under[0]] - c[x.under[1]]) !== 0)
    || q.ends.some(e => c[e.arc] !== null && ((e.colour !== undefined && c[e.arc] !== e.colour) || (e.match !== undefined && c[q.ends[e.match].arc] !== null && c[q.ends[e.match].arc] !== c[e.arc])));
  assert.ok(fails, `${label}: the forced colours clash`);
}

// Whether a board is a certificate for the puzzle's claim, checked without the
// mechanic. One colour only: some crossing is coloured all different and every
// coloured arc follows from it, one at a time, each forced by a crossing whose
// other two arcs already follow (2 × top ≡ in + out), and some crossing clashes.
// Can't: every coloured arc follows from the dots (and given arcs) the same way,
// and a crossing or a dot clashes.
export function certifies(q, c) {
  const arcsAt = x => [x.over, ...x.under];
  const bad = x => arcsAt(x).every(a => c[a] !== null) && m3(2 * c[x.over] - c[x.under[0]] - c[x.under[1]]) !== 0;
  const dotBad = e => c[e.arc] !== null && ((e.colour !== undefined && c[e.arc] !== e.colour) || (e.match !== undefined && c[q.ends[e.match].arc] !== null && c[q.ends[e.match].arc] !== c[e.arc]));
  const clash = q.crossings.some(bad) || q.ends.some(dotBad);
  if (!clash) return false;
  // The value an arc must take at a crossing, from the other two.
  const forcedAt = (x, a) => a === x.over ? m3(2 * (c[x.under[0]] + c[x.under[1]])) : m3(2 * c[x.over] - c[a === x.under[0] ? x.under[1] : x.under[0]]);
  const follows = start => {
    const got = new Set(start);
    for (let grew = true; grew;) {
      grew = false;
      c.forEach((v, a) => {
        if (v === null || got.has(a)) return;
        const byCrossing = q.crossings.some(x => arcsAt(x).filter(b => b === a).length === 1 && arcsAt(x).every(b => b === a || got.has(b)) && forcedAt(x, a) === v);
        const byDot = q.ends.some(e => e.arc === a && ((e.colour !== undefined && e.colour === v) || (e.match !== undefined && got.has(q.ends[e.match].arc) && c[q.ends[e.match].arc] === v)));
        if (byCrossing || byDot) { got.add(a); grew = true; }
      });
    }
    return c.every((v, a) => v === null || got.has(a));
  };
  if (q.claim === 'cant') return follows((q.locked || []).map((v, i) => v !== null ? i : -1).filter(i => i >= 0));
  return q.crossings.some(x => arcsAt(x).every(a => c[a] !== null) && new Set(arcsAt(x).map(a => c[a])).size === 3 && follows(arcsAt(x)));
}
// Every partial colouring of a claim puzzle: the mechanic accepts the claim
// exactly when it is a certificate, a certificate exists only for a true
// claim, and (for One colour only) one exists from every crossing.
function checkClaims(p, t) {
  const q = p.parameters, n = q.arcs.length, seeds = new Set();
  let boards = 0, accepted = 0;
  for (let k = 0; k < 4 ** n; k++) {
    const colours = Array.from({length: n}, (_, i) => { const v = Math.floor(k / 4 ** i) % 4; return v === 3 ? null : v; });
    const a = {...freshAttempt(p), board: {colours, claim: null}};
    if (isSolved(p, a.board)) continue;
    boards++;
    const next = move(p, a, {type: 'claim'}), cert = certifies(q, colours);
    assert.ok(next, `${p.id}: a claim can be pressed on ${colours.join(',')}`);
    assert.equal(next.board.claim === 'kept', cert, `${p.id}: the claim is ${cert ? 'accepted' : 'refused'} on ${colours.map(v => v ?? '-').join('')}`);
    if (cert) {
      assert.ok(t.claimTrue, `${p.id}: a certificate only when the claim is true`);
      accepted++;
      q.crossings.forEach((x, i) => { if (new Set([x.over, ...x.under].map(v => colours[v])).size === 3 && !colours.some(v => v === null)) seeds.add(i); });
    }
    // A refusal names only what is missing: the same three words whether the claim is true or not.
    if (!cert) assert.ok(['No crossing is all different.', 'Ringed arcs aren’t forced.', 'No clash yet.'].some(w => mechanicFor(p).render(p, {...next, hintLevel: 0}).includes(w)), `${p.id}: a refusal says what is missing`);
  }
  if (t.claimTrue && t.claim === 'one') assert.equal(seeds.size, q.crossings.length, `${p.id}: a full certificate from every crossing`);
  return {boards, accepted};
}

// --- The tables ------------------------------------------------------------------
// The tangles' codes, written out by hand: a horizontal strand under an upright
// one; the bend over the strand twice (signs opposite) and off it; the slide.
const one = (closed, visits) => ({closed, visits});
const TANGLES = {
  crossing: {strands: [one(false, [-1]), one(false, [1])], signs: [1]},
  bend: {strands: [one(false, [-1, -2]), one(false, [1, 2])], signs: [1, -1]},
  bendOff: {strands: [one(false, []), one(false, [])], signs: []},
  slideBefore: {strands: [one(false, [1, 2]), one(false, [-1, -3]), one(false, [-2, 3])], signs: [-1, -1, 1]},
  slideAfter: {strands: [one(false, [1, 2]), one(false, [-3, -2]), one(false, [3, -1])], signs: [-1, -1, 1]}
};
// Each puzzle: its pictures (a knot from the Jones table or a tangle code),
// mode and claim, the number of colourings and of those with two or more
// colours, and whether the claim is true. The README's table says the same.
const K = (knot, crossings) => ({knot, crossings});
const TABLE = {
  'knots-01': {pictures: Array(9).fill({tangle: 'crossing'}), mode: 'complete', colourings: 1, dots: false, locked: true},
  'knots-02': {pictures: [K('trefoil', 3)], mode: 'more', claim: 'one', colourings: 9, nonConstant: 6, claimTrue: false},
  'knots-03': {pictures: [{tangle: 'bend'}], mode: 'complete', claim: 'cant', colourings: 1, claimTrue: false},
  'knots-04': {pictures: [{tangle: 'bend'}], mode: 'complete', claim: 'cant', colourings: 0, claimTrue: true},
  'knots-05': {pictures: [K('trefoil', 3)], mode: 'every', colourings: 9},
  'knots-06': {pictures: [K('figure8', 4)], mode: 'more', claim: 'one', colourings: 3, nonConstant: 0, claimTrue: true},
  'knots-07': {pictures: [{tangle: 'bend'}, {tangle: 'bendOff'}], mode: 'every', colourings: 9, pair: 'bend'},
  'knots-08': {pictures: [K('granny', 6)], mode: 'more', claim: 'one', colourings: 27, nonConstant: 24, claimTrue: false},
  'knots-09': {pictures: [K('cinquefoil', 5)], mode: 'more', claim: 'one', colourings: 3, nonConstant: 0, claimTrue: true},
  'knots-10': {pictures: [K('6_1', 6)], mode: 'more', claim: 'one', colourings: 9, nonConstant: 6, claimTrue: false},
  'knots-11': {pictures: [K('5_2', 5)], mode: 'more', claim: 'one', colourings: 3, nonConstant: 0, claimTrue: true},
  'knots-12': {pictures: [{tangle: 'slideBefore'}, {tangle: 'slideAfter'}], mode: 'complete', colourings: 1, pair: 'slide'}
};
const PLAYGROUND = {'Plain loop': K('plain', 0), Trefoil: K('trefoil', 3), 'Figure-eight knot': K('figure8', 4), Cinquefoil: K('cinquefoil', 5), 'Three-twist knot': K('5_2', 5), 'Stevedore knot': K('6_1', 6), 'Granny knot': K('granny', 6)};
const COUNT = {plain: 3, trefoil: 9, figure8: 3, cinquefoil: 3, '5_2': 3, '6_1': 9, granny: 27};
function checkKind(q, expected, label) {
  expected.forEach((e, k) => {
    const code = q.pictures[k].code;
    if (e.tangle) return assert.deepEqual(code, TANGLES[e.tangle], `${label}: picture ${k + 1} is the ${e.tangle} tangle`);
    assert.equal(code.signs.length, e.crossings, `${label}: ${e.knot} drawn with ${e.crossings} crossings`);
    assert.ok(samePolynomial(jonesOfCode(code), JONES[e.knot]), `${label}: the drawing is the ${e.knot} (Jones polynomial)`);
    for (const other of Object.keys(JONES)) if (other !== e.knot) assert.ok(!samePolynomial(jonesOfCode(code), JONES[other]), `${label}: the drawing is not the ${other}`);
  });
}

// --- Play ---------------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// Follow hints until solved; returns the number of steps.
function hintChain(p, a, why) {
  for (let step = 0; step < 80; step++) {
    if (isSolved(p, a.board)) return step;
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint ${why} (step ${step + 1})`);
    assert.ok(typeof h.text === 'string' && h.text.trim(), `${p.id}: the hint has words ${why}`);
    if (h.action.type === 'paint') assert.ok(h.text.includes(p.parameters.arcs[h.action.arc].name), `${p.id}: the hint names its arc ${why}`);
    if (h.action.type === 'claim') assert.ok(certifies(p.parameters, a.board.colours), `${p.id}: the hint presses the claim only on a certificate ${why}`);
    a = play(p, a, h.action);
    if (h.action.type === 'claim') assert.ok(isSolved(p, a.board), `${p.id}: the hinted claim is accepted ${why}`);
  }
  assert.fail(`${p.id}: hints solve ${why}`);
}
let seed = 40;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
// Paint each arc as the tap cycle would reach it: red, blue, yellow, red, …
function paintTo(p, a, colours) {
  colours.forEach((c, i) => { while (a.board.colours[i] !== c) a = play(p, a, {type: 'paint', arc: i, colour: a.board.colours[i] === null ? 0 : (a.board.colours[i] + 1) % 3}); });
  return a;
}

// --- The checks ---------------------------------------------------------------------
async function validateKnots() {
  const json = JSON.parse(await readFile(new URL('../dist/families/knots/knots.json', import.meta.url), 'utf8'));
  const sourceIds = new Set(json.sources.map(x => x.id));
  assert.equal(json.families.length, 1);
  assert.equal(json.families[0].id, 'knots');
  for (const id of json.families[0].sourceIds) assert.ok(sourceIds.has(id), `family source ${id}`);
  // The Jones table against KnotInfo's own PD codes.
  for (const [k, pd] of Object.entries(KNOTINFO_PD)) assert.ok(samePolynomial(jonesOfPD(pd), JONES[k]), `KnotInfo’s ${k} PD code gives the table’s Jones polynomial`);
  const [playground, ...puzzles] = json.puzzles;
  assert.equal(playground.id, 'knots-playground');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'the puzzles, in order');
  const levels = puzzles.map(p => p.difficulty_level);
  assert.deepEqual([...new Set(levels)], ['easy', 'medium', 'hard'], 'easy, then medium, then hard');
  const summary = {puzzles: puzzles.length, checks: {}};
  for (const p of json.puzzles) {
    for (const f of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(String(p[f] || '').trim(), `${p.id}: ${f}`);
    assert.equal(p.mechanic, 'knots');
    assert.equal(p.sourceDocument, 'docs/knots/README.md');
    assert.ok(Array.isArray(p.rules) && p.rules.length >= 2, `${p.id}: rules`);
    assert.equal(p.hints.length, 3, `${p.id}: three hints`);
    for (const f of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(String(p.parent[f] || '').trim(), `${p.id}: parent.${f}`);
    for (const id of p.parent.sourceIds) assert.ok(sourceIds.has(id), `${p.id}: source ${id}`);
    // No count predictions and no visible counters: the board copy asks for
    // colourings, never for a number of them.
    for (const text of [p.objective, p.visibleObjective, ...p.hints.slice(0, 1)]) assert.doesNotMatch(String(text), /how many|\bcount|\d+ (of|colourings)/i, `${p.id}: no count is asked for`);
    assert.ok(String(p.visibleObjective).split(/[.!?](\s|$)/).filter(x => x && x.trim()).length <= 1, `${p.id}: at most one visible sentence`);
  }

  for (const p of puzzles) {
    const q = p.parameters, t = TABLE[p.id], label = p.id;
    assert.equal(q.mode, t.mode, `${label}: mode`);
    assert.equal(q.claim, t.claim, `${label}: claim`);
    assert.equal(q.pictures.length, t.pictures.length, `${label}: pictures`);
    checkDrawing(q, label, {dots: t.dots !== false});
    checkKind(q, t.pictures, label);
    if (t.locked) {
      // Nine crossings: the left and upright arcs are given, every pair once.
      const pairs = q.crossings.map(x => `${q.locked[x.under[0]]}${q.locked[x.over]}`);
      assert.deepEqual([...pairs].sort(), ['00', '01', '02', '10', '11', '12', '20', '21', '22'], `${label}: each pair of given colours once`);
      for (const x of q.crossings) assert.equal(q.locked[x.under[1]], null, `${label}: the right arcs are free`);
    } else assert.equal(q.locked, undefined, `${label}: nothing given`);
    // Colourings by brute force, against the mechanic.
    const all = bruteColourings(q), many = all.filter(k => new Set(k).size > 1);
    assert.equal(all.length, t.colourings, `${label}: colourings`);
    assert.deepEqual(completions(q).map(c => c.join('')), all, `${label}: the mechanic finds the same colourings`);
    if ('nonConstant' in t) assert.equal(many.length, t.nonConstant, `${label}: colourings with two or more colours`);
    if (t.claim === 'one') assert.equal(t.claimTrue, many.length === 0, `${label}: One colour only is ${t.claimTrue}`);
    if (t.claim === 'cant') assert.equal(t.claimTrue, all.length === 0, `${label}: Can’t is ${t.claimTrue}`);
    // Certificates, replayed: from every crossing coloured all different, and
    // from the dots. Every renaming of the colours at the seed crossing clashes too.
    if (t.claimTrue && t.claim === 'one') q.crossings.forEach((x, i) => {
      const start = q.arcs.map(() => null);
      [start[x.over], start[x.under[0]], start[x.under[1]]] = [0, 1, 2];
      replay(q, start, certificate(q, i).colours, `${label} from crossing ${i + 1}`);
      for (const perm of ['012', '021', '102', '120', '201', '210']) {
        const s0 = q.arcs.map(() => null);
        [s0[x.over], s0[x.under[0]], s0[x.under[1]]] = [...perm].map(Number);
        assert.equal(bruteColourings(q, s0).length, 0, `${label}: no colouring has crossing ${i + 1} as ${perm}`);
      }
    });
    if (t.claimTrue && t.claim === 'cant') replay(q, q.arcs.map(() => null), certificate(q).colours, `${label} from the dots`);
    const claims = t.claim ? checkClaims(p, t) : null;
    // Before and after: for every choice of the inputs, each picture has one
    // colouring, and the two agree at every end.
    if (t.pair) checkPair(q, t.pair, label);
    summary.checks[p.id] = {colourings: all.length, ...(t.claim ? {claim: t.claim, claimTrue: !!t.claimTrue, boardsTried: claims.boards, certificates: claims.accepted} : {}), ...playChecks(p, all, t)};
  }

  // The playground.
  const pq = playground.parameters;
  assert.equal(pq.mode, 'playground');
  assert.deepEqual(pq.knots.map(k => k.name), Object.keys(PLAYGROUND), 'the playground’s knots');
  pq.knots.forEach(k => {
    const e = PLAYGROUND[k.name], label = `playground ${k.name}`;
    checkDrawing(k, label, {dots: false});
    checkKind(k, [e], label);
    assert.equal(bruteColourings(k).length, COUNT[e.knot], `${label}: colourings`);
  });
  checkPlayground(playground);
  summary.playground = pq.knots.length;
  return summary;
}

// The bend and the slide: every choice of inputs gives one colouring of each
// picture, with the same colours at the outputs.
function checkPair(q, kind, label) {
  const ends = q.ends.filter(e => e.pic === 0), arcsOf = k => q.arcs.map((a, i) => (a.pic === k ? i : -1)).filter(i => i >= 0);
  // Inputs in end order: the bend's L and P; the slide's curved strand and the two top ends.
  const inputs = kind === 'bend' ? [0, 2] : [0, 2, 4];
  const local = (k, i) => q.ends.filter(e => e.pic === k)[i];
  let choices = 0;
  for (let n = 0; n < 3 ** inputs.length; n++) {
    const pick = inputs.map((_, j) => Math.floor(n / 3 ** j) % 3);
    const outs = [0, 1].map(k => {
      const sub = {crossings: q.crossings.filter(x => x.pic === k), ends: []};
      const start = q.arcs.map(() => null);
      inputs.forEach((i, j) => { start[local(k, i).arc] = pick[j]; });
      const free = arcsOf(1 - k);
      free.forEach(i => { start[i] = 0; });
      const found = bruteColourings({...sub, arcs: q.arcs}, start);
      assert.equal(found.length, 1, `${label}: inputs ${pick.join('')} colour picture ${k + 1} one way`);
      const c = [...found[0]].map(Number);
      return ends.map((_, i) => c[local(k, i).arc]);
    });
    assert.deepEqual(outs[0], outs[1], `${label}: inputs ${pick.join('')} give the same colours at every end`);
    choices++;
  }
  return choices;
}

function playChecks(p, all, t) {
  const q = p.parameters, fresh = freshAttempt(p), m = mechanicFor(p);
  assert.ok(validBoard(p, fresh.board), `${p.id}: fresh board is valid`);
  assert.ok(!isSolved(p, fresh.board), `${p.id}: not solved at the start`);
  assert.equal(m.noHint(p), false, `${p.id}: has hints`);
  // The witness, played.
  let a = fresh;
  if (p.solution.claim) {
    // The chain, painted in the order it is forced, then the claim.
    for (const i of p.solution.order) a = paintTo(p, a, q.arcs.map((_, k) => k === i ? p.solution.colouring[k] : a.board.colours[k]));
    assert.ok(certifies(q, a.board.colours), `${p.id}: the witness chain is a certificate`);
    a = play(p, a, {type: 'claim'});
  }
  else if (p.solution.colourings) { for (const c of p.solution.colourings) a = paintTo(p, a, c); a = play(p, a, {type: 'all'}); }
  else a = paintTo(p, a, p.solution.colouring);
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
  if (p.solution.colourings) assert.deepEqual(p.solution.colourings.map(c => c.join('')), all, `${p.id}: the witness lists every colouring`);
  if (p.solution.colouring && !p.solution.claim) assert.ok(all.includes(p.solution.colouring.join('')), `${p.id}: the witness is a colouring`);
  refuse(p, a, {type: 'paint', arc: q.arcs.findIndex((_, i) => (q.locked || [])[i] == null), colour: 0}, 'a move after solving');
  // Hint chains: from fresh, after each single wrong colour, from random
  // starts, after a wrong claim and after a wrong That's all.
  let chains = 0, longest = hintChain(p, fresh, 'from fresh');
  chains++;
  const target = p.solution.claim ? null : p.solution.colouring || (all[0] && [...all[0]].map(Number));
  q.arcs.forEach((_, i) => {
    if (q.locked?.[i] != null) return;
    for (const c of [0, 1, 2]) {
      if (target && target[i] === c && !p.solution.claim) continue;
      const b = play(p, fresh, {type: 'paint', arc: i, colour: c});
      longest = Math.max(longest, hintChain(p, b, `after painting arc ${i + 1} ${c}`));
      chains++;
    }
  });
  for (let r = 0; r < 12; r++) {
    let b = fresh;
    q.arcs.forEach((_, i) => { if (q.locked?.[i] == null && random() < 0.6) { const c = Math.floor(random() * 3); if (b.board.colours[i] !== c) b = play(p, b, {type: 'paint', arc: i, colour: c}); } });
    if (isSolved(p, b.board)) continue;
    longest = Math.max(longest, hintChain(p, b, `from a random start ${r + 1}`));
    chains++;
  }
  if (q.claim) {
    const b = play(p, fresh, {type: 'claim'});
    assert.equal(b.board.claim, 'refused', `${p.id}: a claim on a blank board is refused, true or not`);
    assert.ok(!isSolved(p, b.board), `${p.id}: a refused claim does not solve`);
    refuse(p, b, {type: 'claim'}, 'a second claim');
    hintChain(p, b, 'after a refused claim');
    chains++;
    // A colour change clears the refusal.
    const i = q.arcs.findIndex((_, k) => q.locked?.[k] == null);
    assert.equal(play(p, b, {type: 'paint', arc: i, colour: 1}).board.claim, null, `${p.id}: a colour change clears the refusal`);
  }
  if (q.mode === 'every') {
    let b = play(p, fresh, {type: 'all'});
    assert.deepEqual(b.board.told, {kind: 'more'}, `${p.id}: That’s all too early says there is another`);
    refuse(p, b, {type: 'all'}, 'That’s all again before a new colouring');
    hintChain(p, b, 'after a wrong That’s all');
    chains++;
    // A colouring made twice is found already; the shelf keeps it once.
    b = paintTo(p, fresh, [...all[0]].map(Number));
    assert.deepEqual(b.board.found, [all[0]], `${p.id}: a colouring is kept when made`);
    const other = [...all[1]].map(Number);
    b = paintTo(p, b, other);
    b = paintTo(p, b, [...all[0]].map(Number));
    assert.deepEqual(b.board.told, {kind: 'again', key: all[0]}, `${p.id}: a colouring made again is found already`);
    assert.equal(b.board.found.length, 2, `${p.id}: the shelf keeps each colouring once`);
    // Undo keeps the shelf.
    const back = undo(b), carried = {...back, board: mechanicFor(p).carry(p, b.board, back.board)};
    assert.ok(validBoard(p, carried.board), `${p.id}: undo keeps a valid board`);
    assert.deepEqual(carried.board.found, b.board.found, `${p.id}: undo keeps the colourings found`);
  }
  illegal(p, fresh, t);
  forged(p, fresh, all, t);
  return {chains, longest};
}

function illegal(p, fresh, t) {
  const q = p.parameters, free = q.arcs.findIndex((_, i) => q.locked?.[i] == null);
  refuse(p, fresh, {type: 'paint', arc: q.arcs.length, colour: 0}, 'an arc off the board');
  refuse(p, fresh, {type: 'paint', arc: -1, colour: 0}, 'a negative arc');
  refuse(p, fresh, {type: 'paint', arc: free, colour: 3}, 'a fourth colour');
  refuse(p, fresh, {type: 'paint', arc: free, colour: '0'}, 'a colour as text');
  refuse(p, fresh, {type: 'paint', arc: String(free), colour: 0}, 'an arc as text');
  refuse(p, fresh, {type: 'paint', arc: 0.5, colour: 0}, 'a fractional arc');
  const painted = play(p, fresh, {type: 'paint', arc: free, colour: 0});
  refuse(p, painted, {type: 'paint', arc: free, colour: 0}, 'the colour an arc already has');
  if (q.locked) q.locked.forEach((c, i) => { if (c !== null) for (const v of [0, 1, 2]) refuse(p, fresh, {type: 'paint', arc: i, colour: v}, `a given arc ${i + 1}`); });
  if (!q.claim) refuse(p, fresh, {type: 'claim'}, 'a claim with no button');
  if (q.mode !== 'every') refuse(p, fresh, {type: 'all'}, 'That’s all outside Find every');
  refuse(p, fresh, {type: 'knot', knot: 1}, 'a knot change outside the playground');
  refuse(p, painted, {type: 'clear'}, 'Clear outside the playground');
  for (const action of [null, {}, {type: 'flip', crossing: 0}, {type: 'paint'}, 'paint']) refuse(p, fresh, action, `the action ${JSON.stringify(action)}`);
}

function forged(p, fresh, all, t) {
  const q = p.parameters, b = fresh.board, free = q.arcs.findIndex((_, i) => q.locked?.[i] == null);
  const bad = (board, why) => { assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`); assert.equal(isSolved(p, board), false, `${p.id}: a forged save (${why}) is not solved`); };
  bad({...b, colours: b.colours.slice(1)}, 'too few arcs');
  bad({...b, colours: [...b.colours, 0]}, 'too many arcs');
  bad({...b, colours: b.colours.map((c, i) => i === free ? 3 : c)}, 'a fourth colour');
  bad({...b, colours: b.colours.map((c, i) => i === free ? '1' : c)}, 'a colour as text');
  bad({...b, extra: 1}, 'an extra field');
  bad(null, 'no board');
  if (q.locked) { const i = q.locked.findIndex(c => c !== null); bad({...b, colours: b.colours.map((c, k) => k === i ? (c + 1) % 3 : c)}, 'a given arc changed'); }
  if (q.claim) {
    bad({...b, claim: 'kept'}, 'a claim kept on a blank board');
    if (t.claimTrue) bad({colours: [...p.solution.colouring], claim: 'refused'}, 'a certificate marked refused');
    else bad({...b, colours: [...all[0]].map(Number).map((v, i) => i === free ? v : null), claim: 'kept'}, 'a false claim kept');
    bad({...b, claim: 'yes'}, 'an unknown claim');
    const {claim, ...rest} = b;
    bad(rest, 'a missing claim');
  }
  if (q.mode === 'every') {
    bad({...b, done: true}, 'That’s all with colourings missing');
    bad({...b, found: ['000', '000']}, 'a colouring found twice');
    bad({...b, found: ['012', '210'].filter(k => !all.includes(k)).concat(['001'])}, 'a found colouring that does not work');
    bad({...b, colours: [...all[0]].map(Number)}, 'a colouring on the board that is not on the shelf');
    bad({...b, told: {kind: 'more'}, found: [...all]}, '“there is another” when none is left');
    bad({...b, told: {kind: 'again', key: all[0]}}, '“found already” for a colouring not found');
    bad({...b, done: true, found: [...all], told: {kind: 'more'}}, 'done with a message left');
  }
}

function checkPlayground(p) {
  const q = p.parameters, fresh = freshAttempt(p), m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  assert.ok(validBoard(p, fresh.board), `${p.id}: fresh board is valid`);
  let a = fresh;
  q.knots.forEach((k, i) => {
    if (i !== a.board.knot) a = play(p, a, {type: 'knot', knot: i});
    assert.deepEqual(a.board.colours, k.arcs.map(() => null), `${p.id}: ${k.name} starts blank`);
    const best = bruteColourings(k).find(c => new Set(c).size > 1) || bruteColourings(k)[0];
    a = paintTo(p, a, [...best].map(Number));
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    const cleared = play(p, a, {type: 'clear'});
    assert.ok(cleared.board.colours.every(c => c === null), `${p.id}: Clear takes every colour off`);
    refuse(p, cleared, {type: 'clear'}, 'Clear on a blank knot');
  });
  refuse(p, a, {type: 'knot', knot: q.knots.length}, 'a knot off the list');
  refuse(p, a, {type: 'knot', knot: a.board.knot}, 'the same knot');
  refuse(p, a, {type: 'claim'}, 'a claim in the playground');
  refuse(p, a, {type: 'all'}, 'That’s all in the playground');
  for (const [board, why] of [[{...fresh.board, knot: 99}, 'an unknown knot'], [{...fresh.board, colours: [0, 0]}, 'colours for another knot'], [{...fresh.board, found: []}, 'an extra field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateKnots;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateKnots(), null, 2));
