// Seams (worksheet Week 38, seams and cuts). A band is a paper strip whose
// ends are joined: M joins them matching, R after a half-turn, so the top edge
// carries on as the bottom edge. A strip joined M is an annulus with two
// closed edges; joined R it is a Möbius band with one. In a circle of several
// strips an edge comes back to itself after one lap exactly when an even
// number of seams are R, so the band has two closed edges when the number of
// R seams is even and one when it is odd; a carried arrow comes back flipped
// exactly when it is odd. Cutting along lines that run the length of the band
// splits it into pieces: the seam carries each lane to a lane (R turns the
// lanes over), and the pieces are the cycles of that map. A middle cut leaves
// A in two annuli but B in one piece with two closed edges; a cut a third of
// the way across B makes a Möbius band beside an annulus. A hole adds a
// closed edge to its piece; a notch in an edge adds none.
//
// The child acts on the band. Dots puzzles: put four dots on the edges so they
// group like a ring picture (dots in one ring on one closed edge, different
// rings on different closed edges); each dot lights its closed edge. When
// the band has fewer closed edges than the picture has rings, the child
// presses Can't after four dots and taps each closed edge once (the circles
// are the certificate), and the app draws them with the extra rings crossed
// out; on a band with one closed edge, where a tap would be no choice, Can't
// alone is the claim once the dots are on two edge lines. Seams puzzles: change seams in a circle of three or four strips so
// fixed dots group like the rings; dots on single edges pin individual seams,
// so the one bit of parity never decides a solve. Pieces puzzles: choose the
// seam, cut lines and punch holes to make pieces with given numbers of closed
// edges. Tapping an edge lights its whole closed edge through the seams. A
// playground has one strip and circles of three and four strips.
//
// The band is drawn on the shared portal board (dist/portal-board.js) with its
// reversing seam; the closed edges and pieces are computed here as cycles of
// the seam maps on edges and lanes.
import {esc} from '../../expansion-controls.js';
import {surfaceOf, roomBoard, roomXY, wirePortal} from '../../portal-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const f = x => Number(Number(x).toFixed(3));
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
const sortedUnique = list => list.every((v, i) => i === 0 || list[i - 1] < v);
const desc = list => [...list].sort((a, b) => b - a);
const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const MODES = ['dots', 'seams', 'pieces', 'playground'];
export const LAMPS = ['rose', 'leaf', 'lilac', 'teal', 'peach', 'sand'];
export const MAX_DOTS = 4, MAX_FLAGS = 6;
const FLIP = {u: 'd', d: 'u'};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];
const cap = s => s[0].toUpperCase() + s.slice(1);

// --- Shapes -------------------------------------------------------------------------
// A shape is K strips of `len` squares, n lattice steps to a square's side,
// strip k's first square drawn at layout[k]. Its `lines` are heights a child
// may cut (single strips only) and its `spots` the places for holes (inside
// the strip) and notches (on an edge): {x, y, name}, x along the strip, y up.
// On a dots puzzle (`dots`) cuts are drawn with a wider gap, so dots on its
// two sides stay apart.
const shapes = new WeakMap();
export function shapeFrom(src) {
  if (shapes.has(src)) return shapes.get(src);
  const K = src.strips, len = src.len, n = src.n;
  const sh = {K, len, n, L: len * n, layout: src.layout || [[0, 0]], lines: src.lines || [], spots: src.spots || [], fixed: src.fixed || Array(K).fill(true), start: src.start || src.seams, dots: src.mode === 'dots'};
  shapes.set(src, sh);
  return sh;
}
export const shapeSource = (q, b) => q.mode === 'playground' ? q.shapes[b.shape] : q;
// The band a board shows: its shape, seams, cut heights and punched spots.
export function bandOf(q, b) {
  const sh = shapeFrom(shapeSource(q, b));
  if (q.mode === 'dots') return {sh, seams: q.seams, cuts: q.cuts || [], holes: []};
  if (q.mode === 'seams') return {sh, seams: b.seams, cuts: [], holes: []};
  return {sh, seams: b.seams, cuts: b.cuts, holes: b.holes};
}
export const letter = (sh, k, j) => String.fromCharCode(65 + k * sh.len + j);
// The portal board's spec: each strip's squares glued in a row, the last
// square of strip k to the first of strip k + 1, turned over at an R seam.
// No square is glued above or below, so the top and bottom sides are walls:
// the band's edges.
export function specOf(sh, seams) {
  const squares = {}, right = {}, flip = {};
  for (let k = 0; k < sh.K; k++) for (let j = 0; j < sh.len; j++) {
    const id = letter(sh, k, j);
    squares[id] = [sh.layout[k][0] + j, sh.layout[k][1]];
    right[id] = j < sh.len - 1 ? letter(sh, k, j + 1) : letter(sh, (k + 1) % sh.K, 0);
  }
  seams.forEach((m, k) => { if (m === 'R') flip[letter(sh, k, sh.len - 1)] = true; });
  return {squares, right, n: sh.n, ...(Object.keys(flip).length ? {flip} : {})};
}
export const surfaceFor = (sh, seams) => surfaceOf(specOf(sh, seams));

// --- Edges and pieces -----------------------------------------------------------------
// An edge line runs the length of strip k at height h with the paper on side
// s: 'u' (above it: the bottom edge, the top of a cut) or 'd' (below it). A
// segment is one lattice step of a line, x from the strip's left end.
const lineKey = (k, h, s) => `${k}:${h}${s}`;
export const segKey = (k, h, s, x) => `${k}:${h}${s}:${x}`;
export function parseSeg(key) {
  const m = /^(\d+):(\d+)([ud]):(\d+)$/.exec(String(key));
  return m ? {k: +m[1], h: +m[2], s: m[3], x: +m[4], line: `${m[1]}:${m[2]}${m[3]}`} : null;
}
export function parseLine(key) {
  const m = /^(\d+):(\d+)([ud])$/.exec(String(key));
  return m ? {k: +m[1], h: +m[2], s: m[3]} : null;
}
// Across seam k a line at height h comes into strip k + 1 at the same height
// (M), or at n - h with the paper on the other side (R: the half-turn).
const across = (sh, seams, k, h, s) => seams[k] === 'R' ? [sh.n - h, FLIP[s]] : [h, s];
// The closed edges are the cycles of that map on the lines; the pieces are
// the cycles of the same map on the lanes between cuts. A punched hole adds
// a closed edge to its piece, a notch none.
const topoMemo = new Map();
export function topology(sh, seams, cuts, holes = []) {
  const key = `${sh.K},${sh.len},${sh.n}|${seams.join('')}|${cuts.join(',')}|${holes.join(',')}|${sh.spots.map(s => `${s.x},${s.y}`).join(';')}`;
  if (topoMemo.has(key)) return topoMemo.get(key);
  const heights = [0, ...[...cuts].sort((a, b) => a - b), sh.n], lines = [], lanes = [];
  for (let k = 0; k < sh.K; k++) heights.forEach((h, i) => {
    if (i > 0) lines.push({k, h, s: 'd', key: lineKey(k, h, 'd')});
    if (i < heights.length - 1) { lines.push({k, h, s: 'u', key: lineKey(k, h, 'u')}); lanes.push({k, a: h, b: heights[i + 1], key: `${k}:${h}-${heights[i + 1]}`}); }
  });
  const byLine = new Map(lines.map(l => [l.key, l]));
  const circleOf = new Map(), circles = [];
  for (const l of lines) {
    if (circleOf.has(l.key)) continue;
    const cycle = [];
    for (let at = l; !circleOf.has(at.key);) {
      circleOf.set(at.key, circles.length); cycle.push(at.key);
      const [h, s] = across(sh, seams, at.k, at.h, at.s);
      at = byLine.get(lineKey((at.k + 1) % sh.K, h, s));
    }
    circles.push(cycle);
  }
  const byLane = new Map(lanes.map(l => [l.key, l]));
  const pieceOf = new Map(), pieces = [];
  for (const l of lanes) {
    if (pieceOf.has(l.key)) continue;
    const cycle = [];
    for (let at = l; !pieceOf.has(at.key);) {
      pieceOf.set(at.key, pieces.length); cycle.push(at.key);
      const k2 = (at.k + 1) % sh.K;
      at = byLane.get(seams[at.k] === 'R' ? `${k2}:${sh.n - at.b}-${sh.n - at.a}` : `${k2}:${at.a}-${at.b}`);
    }
    pieces.push(cycle);
  }
  const laneOfLine = l => lanes.find(x => x.k === l.k && (l.s === 'u' ? x.a === l.h : x.b === l.h));
  const laneAt = (k, y) => lanes.find(x => x.k === k && x.a < y && y < x.b);
  const pieceOfLine = k => pieceOf.get(laneOfLine(byLine.get(k)).key);
  const edges = pieces.map(() => 0);
  for (const c of circles) edges[pieceOfLine(c[0])]++;
  for (const i of holes) { const sp = sh.spots[i]; if (sp.y > 0 && sp.y < sh.n) edges[pieceOf.get(laneAt(sp.k || 0, sp.y).key)]++; }
  const out = {lines, lanes, circles, circleOf, pieces, pieceOf, pieceOfLine, laneAt, edges, sorted: desc(edges)};
  if (topoMemo.size > 3000) topoMemo.clear();
  topoMemo.set(key, out);
  return out;
}
export const topologyOf = (q, b) => { const {sh, seams, cuts, holes} = bandOf(q, b); return topology(sh, seams, cuts, holes); };
const validSeg = (sh, topo, key) => { const s = parseSeg(key); return Boolean(s) && topo.circleOf.has(s.line) && s.x >= 0 && s.x < sh.L; };
// Dots grouped by closed edge: the sizes, largest first.
export const circleOfSeg = (topo, key) => topo.circleOf.get(parseSeg(key).line);
export function groupSizes(topo, dots) {
  const count = new Map();
  for (const d of dots) { const c = circleOfSeg(topo, d); count.set(c, (count.get(c) || 0) + 1); }
  return desc([...count.values()]);
}
export const dotsMatch = (q, topo, dots) => dots.length === MAX_DOTS && same(groupSizes(topo, dots), desc(q.rings));
// A picture can be made exactly when it has no more rings than the band has
// closed edges: each ring goes on its own closed edge.
export const dotsPossible = (q, topo) => q.rings.length <= topo.circles.length;
// Seams goal: dots of one kind share a closed edge, dots of different kinds don't.
export const markSeg = (sh, m) => segKey(m.k, m.top ? sh.n : 0, m.top ? 'd' : 'u', m.x);
export function marksOk(q, sh, topo) {
  const c = q.marks.map(m => circleOfSeg(topo, markSeg(sh, m)));
  for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) if ((q.marks[i].kind === q.marks[j].kind) !== (c[i] === c[j])) return false;
  return true;
}
// The carried arrow: on strip k it points the way it started when an even
// number of the seams before k are R; it comes home flipped when the number
// of R seams is odd.
export const arrowFlips = seams => seams.map((_, k) => seams.slice(0, k).filter(m => m === 'R').length % 2 === 1);
export const comesHomeFlipped = seams => seams.filter(m => m === 'R').length % 2 === 1;

// --- Boards ---------------------------------------------------------------------------
// dots:       {dots, told, flags, claimed}   dots: segments in the order
//             placed (at most four); told 'way' after a whole certificate on
//             a band that can do the picture; flags: that certificate's taps,
//             drawn with "There is a way." (Undo takes them back and keeps
//             the words), otherwise empty; claimed false, or after a right
//             Can't the segments tapped (one on each closed edge; none on a
//             band with one closed edge, where Can't itself is the claim). A
//             certificate that misses a closed edge or taps one twice is not
//             a move: That's all then says "Tap each closed edge once." in
//             the view (never saved) until the board changes or Can't opens.
// seams:      {seams}
// pieces:     {seams, cuts, holes}    cuts: heights cut (a cut on an R band
//             runs on round to n - h); holes: punched spots
// playground: {shape, seams, cuts, holes}
const startOf = (q, b) => q.mode === 'playground' ? q.shapes[b.shape].start : q.start;
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'dots') return {dots: [], told: null, flags: [], claimed: false};
  if (q.mode === 'seams') return {seams: [...q.start]};
  if (q.mode === 'pieces') return {seams: [...q.start], cuts: [], holes: []};
  const shape = Object.keys(q.shapes)[0];
  return {shape, seams: [...q.shapes[shape].start], cuts: [], holes: []};
}
const validSeams = (sh, seams, start) => Array.isArray(seams) && seams.length === sh.K && seams.every((m, k) => (m === 'M' || m === 'R') && (!sh.fixed[k] || m === start[k]));
function validBuild(sh, b, start) {
  if (!validSeams(sh, b.seams, start)) return false;
  if (!Array.isArray(b.cuts) || !b.cuts.every(h => sh.lines.includes(h)) || !sortedUnique(b.cuts)) return false;
  if (sh.K === 1 && b.seams[0] === 'R' && !b.cuts.every(h => b.cuts.includes(sh.n - h))) return false;
  return Array.isArray(b.holes) && b.holes.every(i => Number.isInteger(i) && i >= 0 && i < sh.spots.length) && sortedUnique(b.holes);
}
function valid(p, b) {
  const q = p.parameters;
  if (q.mode === 'dots') {
    if (!keysAre(b, ['dots', 'told', 'flags', 'claimed']) || !Array.isArray(b.flags) || !Array.isArray(b.dots) || b.dots.length > MAX_DOTS || new Set(b.dots).size !== b.dots.length) return false;
    const {sh} = bandOf(q, b), topo = topologyOf(q, b);
    if (!b.dots.every(d => validSeg(sh, topo, d)) || ![null, 'way'].includes(b.told) || (b.claimed !== false && !Array.isArray(b.claimed))) return false;
    const full = b.dots.length === MAX_DOTS, match = dotsMatch(q, topo, b.dots), possible = dotsPossible(q, topo);
    if (b.told !== 'way' && b.flags.length) return false;
    if (b.claimed) return b.told === null && full && !possible && cantReady(q, topo, b.dots) && (oneEdge(topo) ? b.claimed.length === 0 : validFlags(sh, topo, b.claimed) && certified(topo, b.claimed));
    if (b.told === 'way') return !oneEdge(topo) && possible && full && !match && (!b.flags.length || (validFlags(sh, topo, b.flags) && certified(topo, b.flags)));
    return true;
  }
  if (q.mode === 'seams') return keysAre(b, ['seams']) && validSeams(shapeFrom(q), b.seams, q.start);
  if (q.mode === 'pieces') return keysAre(b, ['seams', 'cuts', 'holes']) && validBuild(shapeFrom(q), b, q.start);
  if (!keysAre(b, ['shape', 'seams', 'cuts', 'holes']) || typeof b.shape !== 'string' || !Object.hasOwn(q.shapes, b.shape)) return false;
  return validBuild(shapeFrom(q.shapes[b.shape]), b, q.shapes[b.shape].start);
}
function goalMet(q, b) {
  const topo = topologyOf(q, b);
  if (q.mode === 'dots') return Boolean(b.claimed) || dotsMatch(q, topo, b.dots);
  if (q.mode === 'seams') return marksOk(q, shapeFrom(q), topo);
  if (q.mode === 'pieces') return same(topo.sorted, desc(q.goal));
  return false;
}
function solved(p, b) {
  return p.parameters.mode !== 'playground' && valid(p, b) && goalMet(p.parameters, b);
}
// Can't opens once four dots are down and don't match, and not again after
// "There is a way." until a dot moves. On a band with one closed edge no tap
// could be a real choice, so Can't is the claim itself, and it waits for
// dots on two edge lines (the top and the bottom of B), which the child has
// then seen light as one closed edge.
export const oneEdge = topo => topo.circles.length === 1;
const cantReady = (q, topo, dots) => dots.length === MAX_DOTS && !dotsMatch(q, topo, dots) && (!oneEdge(topo) || new Set(dots.map(d => parseSeg(d).line)).size >= 2);
export const cantOpen = (q, b) => q.mode === 'dots' && !b.claimed && b.told !== 'way' && cantReady(q, topologyOf(q, b), b.dots);
const validFlags = (sh, topo, flags) => Array.isArray(flags) && flags.length > 0 && flags.length <= MAX_FLAGS && new Set(flags).size === flags.length && flags.every(k => validSeg(sh, topo, k));
// A certificate: one tap on each closed edge, none twice.
export function certified(topo, flags) {
  const cs = flags.map(k => circleOfSeg(topo, k));
  return new Set(cs).size === cs.length && cs.length === topo.circles.length;
}
// A seam can change unless it is fixed or the band is cut (a cut runs on
// round the band, so turning a seam over would change it).
const seamFree = (sh, b, k) => !sh.fixed[k] && !(b.cuts?.length);
const cutCurve = (sh, seams, h) => sh.K === 1 && seams[0] === 'R' ? [...new Set([h, sh.n - h])] : [h];

function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  return step(p, b, action);
}
// A move on a valid board that isn't solved yet (searches use it directly).
function step(p, b, action) {
  const q = p.parameters;
  if (q.mode === 'dots') {
    const {sh} = bandOf(q, b), topo = topologyOf(q, b);
    if (action.type === 'dot') {
      if (!validSeg(sh, topo, action.seg)) return null;
      if (b.dots.includes(action.seg)) return {...b, dots: b.dots.filter(d => d !== action.seg), told: null, flags: []};
      return b.dots.length < MAX_DOTS ? {...b, dots: [...b.dots, action.seg], told: null, flags: []} : null;
    }
    if (action.type === 'cant') {
      const flags = action.flags;
      if (!cantOpen(q, b) || !Array.isArray(flags)) return null;
      if (oneEdge(topo)) return flags.length === 0 && !dotsPossible(q, topo) ? {...b, told: null, flags: [], claimed: []} : null;
      if (!validFlags(sh, topo, flags) || !certified(topo, flags)) return null;
      return dotsPossible(q, topo) ? {...b, told: 'way', flags: [...flags]} : {...b, told: null, flags: [], claimed: [...flags]};
    }
    return null;
  }
  if (q.mode === 'playground' && action.type === 'shape') {
    if (typeof action.id !== 'string' || !Object.hasOwn(q.shapes, action.id) || action.id === b.shape) return null;
    return {shape: action.id, seams: [...q.shapes[action.id].start], cuts: [], holes: []};
  }
  const {sh} = bandOf(q, b);
  if (action.type === 'seam') {
    const k = action.k;
    if (!Number.isInteger(k) || k < 0 || k >= sh.K || !seamFree(sh, b, k)) return null;
    return {...b, seams: b.seams.map((m, i) => i === k ? (m === 'M' ? 'R' : 'M') : m)};
  }
  if (q.mode === 'seams') return null;
  if (action.type === 'cut') {
    if (!sh.lines.includes(action.h)) return null;
    const curve = cutCurve(sh, b.seams, action.h), cut = curve.every(h => b.cuts.includes(h));
    const cuts = cut ? b.cuts.filter(h => !curve.includes(h)) : [...new Set([...b.cuts, ...curve])].sort((x, y) => x - y);
    return {...b, cuts};
  }
  if (action.type === 'hole') {
    const i = action.i;
    if (!Number.isInteger(i) || i < 0 || i >= sh.spots.length) return null;
    if (b.holes.includes(i)) return {...b, holes: b.holes.filter(x => x !== i)};
    return {...b, holes: [...b.holes, i].sort((x, y) => x - y)};
  }
  return null;
}

// --- Searches ------------------------------------------------------------------------------
// Every move on a seams, pieces or playground board (one per cut curve), and
// the boards they reach: these spaces are small (at most a few hundred
// boards), so hints search them breadth first.
export function buildMoves(q, b) {
  const {sh} = bandOf(q, b), out = [];
  for (let k = 0; k < sh.K; k++) if (seamFree(sh, b, k)) out.push({type: 'seam', k});
  if (q.mode === 'seams') return out;
  for (const h of sh.lines) if (!(sh.K === 1 && b.seams[0] === 'R' && h > sh.n - h)) out.push({type: 'cut', h});
  sh.spots.forEach((_, i) => out.push({type: 'hole', i}));
  return out;
}
const pathMemo = new Map();
// The first move of a shortest way from b to a solve, or null.
export function pathFrom(p, b) {
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (pathMemo.has(key)) return pathMemo.get(key);
  const q = p.parameters, seen = new Map([[JSON.stringify(b), null]]), queue = [b];
  let found = null;
  for (let i = 0; i < queue.length && !found; i++) {
    const at = queue[i];
    for (const action of buildMoves(q, at)) {
      const next = step(p, at, action);
      if (!next) continue;
      const k = JSON.stringify(next);
      if (seen.has(k)) continue;
      seen.set(k, {from: JSON.stringify(at), action});
      if (goalMet(q, next)) { found = k; break; }
      queue.push(next);
    }
  }
  let out = null;
  if (found) {
    const path = [];
    for (let k = found; seen.get(k); k = seen.get(k).from) path.unshift(seen.get(k).action);
    out = {first: path[0], length: path.length};
  }
  if (pathMemo.size > 4000) pathMemo.clear();
  pathMemo.set(key, out);
  return out;
}
// Every board reachable from the start (the validator counts solves among them).
export function reachable(p) {
  const q = p.parameters, start = fresh(p), seen = new Map([[JSON.stringify(start), start]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const action of buildMoves(q, queue[i])) {
    const next = step(p, queue[i], action);
    if (next && !seen.has(JSON.stringify(next))) { seen.set(JSON.stringify(next), next); queue.push(next); }
  }
  return [...seen.values()];
}

// --- Words -------------------------------------------------------------------------------
const ORDER = {1: ['the'], 2: ['the lower', 'the upper'], 3: ['the lowest', 'the middle', 'the top']};
const stripWords = (sh, k) => sh.K > 1 ? ` of strip ${k + 1}` : '';
export function lineWords(sh, cuts, key) {
  const {k, h, s} = parseLine(key);
  if (h === 0) return `bottom edge${stripWords(sh, k)}`;
  if (h === sh.n) return `top edge${stripWords(sh, k)}`;
  const cs = [...cuts].sort((a, b) => a - b);
  return `edge ${s === 'd' ? 'under' : 'over'} ${ORDER[cs.length][cs.indexOf(h)]} cut`;
}
const cutLineWords = (sh, h) => `${ORDER[sh.lines.length][sh.lines.indexOf(h)]} line`;
const seamWords = (sh, k) => sh.K > 1 ? `the seam after strip ${k + 1}` : 'the seam';

// --- Hints ---------------------------------------------------------------------------------
// Segments of a closed edge, middle first, so hinted dots sit clear of the ends.
function segsOf(sh, topo, c) {
  const xs = Array.from({length: sh.L}, (_, x) => x).sort((a, b) => Math.abs(a - (sh.L - 1) / 2) - Math.abs(b - (sh.L - 1) / 2) || a - b);
  return topo.circles[c].flatMap(line => xs.map(x => `${line}:${x}`));
}
// The first segment of a closed edge, middle first, that sits clear of the
// dots and flags already down (a cut's two sides are drawn close together).
function clearSeg(sh, topo, c, taken, line = null) {
  const all = segsOf(sh, topo, c).filter(k => !taken.includes(k) && (line === null || parseSeg(k).line === line));
  const at = k => { const s = parseSeg(k); return {k: s.k, x: s.x, y: lineY(sh, s)}; };
  const clear = (k, far) => { const a = at(k); return taken.every(t => { const o = at(t); return o.k !== a.k || Math.abs(o.x - a.x) >= far || Math.abs(o.y - a.y) >= 1; }); };
  return all.find(k => clear(k, 2)) || all.find(k => clear(k, 1)) || all[0];
}
function dotsHint(q, b) {
  const {sh, cuts} = bandOf(q, b), topo = topologyOf(q, b), C = topo.circles.length, rings = desc(q.rings);
  const count = topo.circles.map(() => 0);
  for (const d of b.dots) count[circleOfSeg(topo, d)]++;
  const add = (c, line = null) => { const seg = clearSeg(sh, topo, c, b.dots, line); return {type: 'move', action: {type: 'dot', seg}, text: `Put a dot on the ${lineWords(sh, cuts, parseSeg(seg).line)}.`}; };
  const off = seg => ({type: 'move', action: {type: 'dot', seg}, text: `Take the dot off the ${lineWords(sh, cuts, parseSeg(seg).line)}.`});
  if (rings.length > C && C === 1) {
    // One closed edge: dots on both edge lines (each lights the one closed
    // edge), then Can't by itself.
    const perLine = topo.lines.map(l => b.dots.filter(d => parseSeg(d).line === l.key).length);
    if (b.dots.length === MAX_DOTS && perLine.filter(x => x > 0).length < 2) return off(b.dots[b.dots.length - 1]);
    if (b.dots.length < MAX_DOTS) return add(0, topo.lines[perLine.indexOf(Math.min(...perLine))].key);
    return {type: 'move', action: {type: 'cant', flags: []}, text: `One closed edge holds every dot, and the picture has ${WORDS[rings.length]} rings. Press Can’t.`};
  }
  if (rings.length > C) {
    // No way: four dots first, then the claim with its reason.
    if (b.dots.length < MAX_DOTS) return add(count.indexOf(Math.min(...count)));
    const flags = [];
    topo.circles.forEach((_, c) => flags.push(clearSeg(sh, topo, c, [...b.dots, ...flags])));
    return {type: 'move', action: {type: 'cant', flags}, text: `${cap(WORDS[C])} closed ${C === 1 ? 'edge holds' : 'edges hold'} every dot, and the picture has ${WORDS[rings.length]} rings. Press Can’t, tap each closed edge once, then press That’s all.`};
  }
  // The rings on the closed edges that need the fewest changes.
  let best = null;
  const go = (i, used, target) => {
    if (i === rings.length) {
      const cost = count.reduce((m, v, c) => m + Math.abs(v - (target[c] || 0)), 0);
      if (!best || cost < best.cost) best = {cost, target: [...target]};
      return;
    }
    for (let c = 0; c < C; c++) if (!used.has(c)) { used.add(c); target[c] = rings[i]; go(i + 1, used, target); target[c] = 0; used.delete(c); }
  };
  go(0, new Set(), topo.circles.map(() => 0));
  const over = count.findIndex((v, c) => v > best.target[c]);
  if (over >= 0) return off([...b.dots].reverse().find(d => circleOfSeg(topo, d) === over));
  return add(count.findIndex((v, c) => v < best.target[c]));
}
function buildWords(q, b, action) {
  const {sh} = bandOf(q, b);
  if (action.type === 'seam') return `Change ${seamWords(sh, action.k)} to ${b.seams[action.k] === 'M' ? 'R' : 'M'}.`;
  if (action.type === 'cut') return b.cuts.includes(action.h) ? `Tape ${cutLineWords(sh, action.h)} back.` : `Cut ${cutLineWords(sh, action.h)}.`;
  return `${b.holes.includes(action.i) ? 'Fill' : 'Punch'} the ${sh.spots[action.i].name}.`;
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  let out;
  if (q.mode === 'dots') out = dotsHint(q, b);
  else {
    const path = pathFrom(p, b);
    out = path ? {type: 'move', action: path.first, text: buildWords(q, b, path.first)} : {type: 'deadend', text: 'Undo to try another way.'};
  }
  if (hintMemo.size > 3000) hintMemo.clear();
  hintMemo.set(key, out);
  return out;
}

// --- View state ------------------------------------------------------------------------------
// Lit edges (lamps, by line), the Can't taps, a refused certificate's words
// (told) and the carried arrow: kept outside the save and cleared by
// Restart. A new board closes Can't, drops the words and drops lamps on
// lines that are gone.
const views = new Map();
const view = p => { if (!views.has(p.id)) views.set(p.id, {lamps: [], claiming: false, flags: [], told: null, arrow: false, board: undefined}); return views.get(p.id); };
function setView(p, payload) {
  if (!object(payload)) return;
  const v = view(p);
  if (Array.isArray(payload.lamps)) v.lamps = payload.lamps.slice(0, LAMPS.length).map(l => typeof l === 'string' ? l : null);
  if ('claiming' in payload) { v.claiming = Boolean(payload.claiming); v.flags = []; v.told = null; }
  // That's all with taps that are not one on each closed edge: no move.
  if (payload.refuse === true) { v.claiming = false; v.flags = []; v.told = 'flags'; }
  if (typeof payload.flag === 'string') v.flags = v.flags.includes(payload.flag) ? v.flags.filter(k => k !== payload.flag) : v.flags.length < MAX_FLAGS ? [...v.flags, payload.flag] : v.flags;
  if ('arrow' in payload) v.arrow = Boolean(payload.arrow);
}
// The lamps that light, one per closed edge (a second lamp on a lit closed
// edge turns it off): circle -> colour. Each lamp keeps its slot, and its
// colour, while others go out (a slot that went out is null).
function litCircles(topo, lamps) {
  const lit = new Map();
  lamps.forEach((l, i) => { const c = l === null ? undefined : topo.circleOf.get(l); if (c !== undefined && !lit.has(c)) lit.set(c, LAMPS[i]); });
  return lit;
}
// A tap on an edge: off when its closed edge is lit, otherwise lit in the
// first free colour (the first slot again once all six are lit).
function toggleLamp(topo, lamps, line) {
  const c = topo.circleOf.get(line), on = l => l !== null && topo.circleOf.get(l) === c;
  if (lamps.some(on)) return lamps.map(l => on(l) ? null : l);
  const free = lamps.indexOf(null), i = free >= 0 ? free : lamps.length < LAMPS.length ? lamps.length : 0;
  return Object.assign([...lamps], {[i]: line});
}

// --- Drawing ----------------------------------------------------------------------------------
// Strip coordinates: X along strip k from its left end (0 to L), Y up (0 to
// n). The strip's squares are drawn side by side, so a point is placed in the
// square under it.
const at = (S, sh, k, X, Y) => { const j = Math.min(sh.len - 1, Math.max(0, Math.floor(X / sh.n))); return roomXY(S, letter(sh, k, j), X - j * sh.n, Y); };
const scaleOf = sh => Math.max(1, sh.L / 8);
const gapOf = sh => sh.dots ? .3 * scaleOf(sh) : .035 * sh.n;
const lineY = (sh, l) => l.h === 0 || l.h === sh.n ? l.h : l.h + (l.s === 'u' ? gapOf(sh) : -gapOf(sh));
const segXY = (S, sh, key) => { const s = parseSeg(key); return at(S, sh, s.k, s.x + .5, lineY(sh, s)); };
function box(S, sh, k, X0, Y0, X1, Y1) {
  const [a, b] = [at(S, sh, k, X0, Y0), at(S, sh, k, X1, Y1)];
  return {x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1])};
}
const rect = (r, cls, extra = '') => `<rect class="${cls}" x="${f(r.x)}" y="${f(r.y)}" width="${f(r.w)}" height="${f(r.h)}"${extra}/>`;
const seg = ([x1, y1], [x2, y2], cls) => `<line class="${cls}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
const dot = ([x, y], r, cls) => `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
// A control: a transparent shape over what it acts on, a focusable button.
const hit = (point, label, focus, shape, {hinted = false, pressed = null} = {}) => `<g class="pb-point act mb-hit${hinted ? ' hinted' : ''}" data-pb-point="${esc(point)}" data-pb-view="room" role="button" tabindex="0" aria-label="${esc(label)}" data-focus="${esc(focus)}"${pressed === null ? '' : ` aria-pressed="${pressed}"`}>${shape}</g>`;
const hitRect = r => rect(r, 'pb-hit');
const hitDisc = ([x, y], r) => `<circle class="pb-hit" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
// The corner marks of the worksheet's recipes: each strip's left end has • at
// the top and □ at the bottom; its right end has the same at an M seam and
// the two swapped at an R seam. Joining • to • and □ to □ builds the band.
function cornerMark(xy, kind, u) {
  const [x, y] = xy, r = .14 * u;
  return kind === 'dot' ? dot(xy, r, 'mb-corner') : `<rect class="mb-corner square" x="${f(x - r)}" y="${f(y - r)}" width="${f(2 * r)}" height="${f(2 * r)}"/>`;
}
// The fixed dots of a seams puzzle: two stars and two diamonds.
function markShape([x, y], kind, r, cls) {
  if (kind === 'star') {
    const pts = Array.from({length: 10}, (_, i) => { const a = Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r * 1.1; return `${f(x + q * Math.cos(a))},${f(y - q * Math.sin(a))}`; });
    return `<polygon class="${cls} star" points="${pts.join(' ')}"/>`;
  }
  return `<polygon class="${cls} diamond" points="${f(x)},${f(y - r)} ${f(x + r * .8)},${f(y)} ${f(x)},${f(y + r)} ${f(x - r * .8)},${f(y)}"/>`;
}
// A vertical arrow centred at (X, n/2) of strip k, pointing down (U to L, as
// it starts) or up (flipped).
function arrow(S, sh, k, X, up, cls) {
  const half = Math.min(.25 * sh.n, 1.15), u = scaleOf(sh), head = .26 * u;
  const tail = at(S, sh, k, X, sh.n / 2 + (up ? -half : half)), tip = at(S, sh, k, X, sh.n / 2 + (up ? half : -half));
  const dir = up ? 1 : -1, [tx, ty] = tip;
  return `<g class="mb-arrow ${cls}"><line x1="${f(tail[0])}" y1="${f(tail[1])}" x2="${f(tx)}" y2="${f(ty + dir * head * .7)}"/><polygon points="${f(tx)},${f(ty)} ${f(tx - head * .6)},${f(ty + dir * head)} ${f(tx + head * .6)},${f(ty + dir * head)}"/></g>`;
}

// One band: what to draw and which controls to offer, from the mode.
//   lit: circle -> colour; dots/flags/marks to draw; targets: 'dots' (one
//   control per segment), 'flags', 'lamps' (one per line) or none; build:
//   seam, cut and hole controls; shown: the hinted action; arrow: draw it.
function drawBand(p, q, b, o) {
  const {sh, seams, cuts, holes} = bandOf(q, b), topo = topologyOf(q, b), S = surfaceFor(sh, seams), u = scaleOf(sh), g = gapOf(sh);
  const shown = o.shown || null, cutSet = new Set(cuts);
  let under = '', over = '', top = '';
  // Pieces (only where the child cuts): a pale tint each once the band is in
  // two or more. Dots puzzles draw no pieces, so the paper cut keeps its
  // surprise.
  if (o.build && topo.pieces.length > 1) topo.lanes.forEach(l => {
    const a = l.a === 0 ? 0 : l.a + g, c = l.b === sh.n ? sh.n : l.b - g;
    under += rect(box(S, sh, l.k, 0, a, sh.L, c), `mb-tint t${topo.pieceOf.get(l.key) % 4}`);
  });
  for (let k = 0; k < sh.K; k++) {
    // Lines that can be cut, dashed; cuts as a gap with an edge on each side.
    for (const h of sh.lines) if (!cutSet.has(h)) over += seg(at(S, sh, k, 0, h), at(S, sh, k, sh.L, h), 'mb-line');
    for (const h of cuts) {
      over += rect(box(S, sh, k, 0, h - g, sh.L, h + g), 'mb-gap');
      for (const y of [h - g, h + g]) over += seg(at(S, sh, k, 0, y), at(S, sh, k, sh.L, y), 'mb-cut');
    }
  }
  // Lit closed edges.
  for (const [c, colour] of o.lit) for (const key of topo.circles[c]) {
    const l = parseLine(key), y = lineY(sh, l);
    over += seg(at(S, sh, l.k, 0, y), at(S, sh, l.k, sh.L, y), `mb-lit ${colour}`);
  }
  // Holes and notches: a dashed ring where one can be punched, paper taken
  // away where one is. A notch's rim is part of its edge and lights with it.
  sh.spots.forEach((sp, i) => {
    const k = sp.k || 0, xy = at(S, sh, k, sp.x, sp.y), r = .34 * u, punched = holes.includes(i);
    if (sp.y > 0 && sp.y < sh.n) { over += dot(xy, r, punched ? 'mb-hole' : 'mb-spot'); return; }
    const down = sp.y === 0 ? -1 : 1, [x, y] = xy, lineAt = topo.circleOf.get(lineKey(k, sp.y, sp.y === 0 ? 'u' : 'd'));
    const arc = `M${f(x - r)},${f(y)}A${f(r)},${f(r)} 0 0 ${down > 0 ? 0 : 1} ${f(x + r)},${f(y)}`;
    if (punched) over += `<path class="mb-notch-cut" d="${arc}Z"/><path class="mb-notch${o.lit.has(lineAt) ? ` lit ${o.lit.get(lineAt)}` : ''}" d="${arc}"/>`;
    else over += `<path class="mb-spot" d="${arc}"/>`;
  });
  // Fixed dots (seams puzzles), the child's dots, Can't taps.
  for (const m of o.marks || []) over += markShape(segXY(S, sh, markSeg(sh, m)), m.kind, .34 * u, 'mb-mark');
  for (const d of o.dots || []) over += dot(segXY(S, sh, d), .27 * u, `mb-dot ${o.dotColour(d)}`);
  for (const k of o.flags || []) {
    const [x, y] = segXY(S, sh, k), s = .3 * u;
    over += `<g class="mb-flag"><line x1="${f(x)}" y1="${f(y)}" x2="${f(x)}" y2="${f(y - s * 1.6)}"/><polygon points="${f(x)},${f(y - s * 1.6)} ${f(x + s * 1.1)},${f(y - s * 1.3)} ${f(x)},${f(y - s)}"/></g>`;
  }
  // Each strip's ends: corner marks, its number in a circle of strips, the seam's letter.
  for (let k = 0; k < sh.K; k++) {
    const R = seams[k] === 'R', off = .3 * u;
    over += cornerMark(at(S, sh, k, -off, sh.n - .22 * u), 'dot', u) + cornerMark(at(S, sh, k, -off, .22 * u), 'square', u);
    over += cornerMark(at(S, sh, k, sh.L + off, sh.n - .22 * u), R ? 'square' : 'dot', u) + cornerMark(at(S, sh, k, sh.L + off, .22 * u), R ? 'dot' : 'square', u);
    if (sh.K > 1) { const [x, y] = at(S, sh, k, .42 * u, sh.n - .5 * u); over += `<text class="mb-strip-number" x="${f(x)}" y="${f(y + .14 * u)}" font-size="${f(.42 * u)}">${k + 1}</text>`; }
    // The letter sits between the corner marks of the right end.
    const [cx, cy] = at(S, sh, k, sh.L + .42 * u, sh.n / 2), w = .74 * u, h = Math.min(1.05 * u, sh.n - .9 * u);
    const locked = !seamFree(sh, b, k) || o.done || !o.build;
    over += `<g class="mb-seam${R ? ' r' : ''}${locked ? ' locked' : ''}"><rect x="${f(cx - w / 2)}" y="${f(cy - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(.14 * u)}"/><text x="${f(cx)}" y="${f(cy + .17 * u)}" font-size="${f(.5 * u)}">${seams[k]}</text>${o.build && !seamFree(sh, b, k) && !o.done ? lockGlyph(cx, cy + h / 2, u) : ''}</g>`;
  }
  // The carried arrow, U to L at the start; on strip 0 it also shows how it comes home.
  if (o.arrow) {
    const flips = arrowFlips(seams);
    for (let k = 0; k < sh.K; k++) {
      const y = sh.n / 2;
      over += seg(at(S, sh, k, 0, y), at(S, sh, k, sh.L, y), 'mb-carry');
      over += arrow(S, sh, k, k === 0 ? sh.L * .62 : sh.L / 2, flips[k], k === 0 ? 'start' : 'carried');
    }
    over += arrow(S, sh, 0, sh.L * .26, comesHomeFlipped(seams), comesHomeFlipped(seams) ? 'home flipped' : 'home');
  }
  // Controls, lowest first: lines to cut, edges, seams, scissors, spots.
  if (o.build && !o.done) for (const h of sh.lines) {
    if (cutSet.has(h)) continue;
    top += hit(`line:${h}`, `Cut ${cutLineWords(sh, h)}`, `mb-line-${h}`, hitRect(box(S, sh, 0, 0, h - .4, sh.L, h + .4)), {hinted: shown?.type === 'cut' && cutCurve(sh, seams, shown.h).includes(h)});
  }
  if (o.targets === 'dots' || o.targets === 'flags') for (const l of topo.lines) for (let x = 0; x < sh.L; x++) {
    const key = `${l.key}:${x}`, words = lineWords(sh, cuts, l.key), r = edgeZone(sh, l, u, cuts);
    const on = o.targets === 'dots' ? (o.dots || []).includes(key) : (o.flags || []).includes(key);
    const hinted = o.targets === 'dots' ? shown?.type === 'dot' && shown.seg === key : shown?.type === 'cant' && shown.flags.includes(key) && !on;
    top += hit(`seg:${key}`, `${cap(words)}, place ${x + 1}${on ? (o.targets === 'dots' ? ', dot' : ', tapped') : ''}`, `mb-seg-${key}`, hitRect(box(S, sh, l.k, x, r[0], x + 1, r[1])), {hinted, pressed: on});
  }
  if (o.targets === 'lamps') for (const l of topo.lines) {
    const r = edgeZone(sh, l, u, cuts), lit = o.lit.has(topo.circleOf.get(l.key));
    top += hit(`lamp:${l.key}`, `Light the ${lineWords(sh, cuts, l.key)}`, `mb-lamp-${l.key}`, hitRect(box(S, sh, l.k, 0, r[0], sh.L, r[1])), {pressed: lit});
  }
  if (o.build && !o.done) for (let k = 0; k < sh.K; k++) if (seamFree(sh, b, k)) {
    top += hit(`seam:${k}`, `${cap(seamWords(sh, k))}: ${seams[k]}`, `mb-seam-${k}`, hitRect(box(S, sh, k, sh.L + .02, -.1, sh.L + 1.05 * u, sh.n + .1)), {hinted: shown?.type === 'seam' && shown.k === k});
  }
  if (o.build && !o.done) for (const h of sh.lines) {
    const spacing = Math.min(...[0, ...sh.lines, sh.n].filter(y => y !== h).map(y => Math.abs(y - h))), d = Math.min(.55 * u, spacing / 2);
    const [x, y] = at(S, sh, 0, -.48 * u, h), cut = cutSet.has(h);
    over += `<g class="mb-scissors${cut ? ' cut' : ''}"><circle cx="${f(x)}" cy="${f(y)}" r="${f(Math.min(.36 * u, d * .9))}"/><text x="${f(x)}" y="${f(y + .15 * u)}" font-size="${f(.44 * u)}">✂</text></g>`;
    top += hit(`line:${h}`, cut ? `Tape ${cutLineWords(sh, h)} back` : `Cut ${cutLineWords(sh, h)}`, `mb-scissors-${h}`, hitRect(box(S, sh, 0, -1.05 * u, h - d, -.02, h + d)), {hinted: shown?.type === 'cut' && cutCurve(sh, seams, shown.h).includes(h), pressed: cut});
  }
  // A hole or notch takes only the taps nearer its drawn rim than an edge or
  // line: a hole's disc reaches halfway from its rim to the nearest line; a
  // notch takes its half disc from a little way in, so a tap on the edge
  // across or beside it lights the edge.
  if (o.build && !o.done) sh.spots.forEach((sp, i) => {
    const k = sp.k || 0, r = .34 * u;
    let area;
    if (sp.y > 0 && sp.y < sh.n) {
      const ys = [0, sh.n, ...sh.lines.flatMap(h => cutSet.has(h) ? [h - g, h + g] : [h])], d = Math.min(...ys.map(y => Math.abs(y - sp.y)));
      area = hitDisc(at(S, sh, k, sp.x, sp.y), Math.min(.5 * u, Math.max(r + .06 * u, (r + d) / 2)));
    } else {
      const inward = sp.y === 0 ? 1 : -1;
      area = hitRect(box(S, sh, k, sp.x - r - .1 * u, sp.y + inward * .45 * r, sp.x + r + .1 * u, sp.y + inward * (r + .3 * u)));
    }
    top += hit(`spot:${i}`, `${cap(holes.includes(i) ? `fill the ${sp.name}` : `punch the ${sp.name}`)}`, `mb-spot-${i}`, area, {hinted: shown?.type === 'hole' && shown.i === i, pressed: holes.includes(i)});
  });
  // Room for the scissors and seam letters at the ends, less above and below.
  const [c0, r0, c1, r1] = S.box, n = sh.n, px = 1.1 * u, py = .9 * u;
  const vb = [c0 * n - px, -r1 * n - py, (c1 - c0) * n + 2 * px, (r1 - r0) * n + 2 * py].map(f).join(' ');
  return roomBoard(S, {cls: `mb-room${sh.K > 1 ? ' strips' : ''}`, label: o.label || 'Band', pad: px, point: () => false, under, over, top}).replace(/viewBox="[^"]*"/, `viewBox="${vb}"`);
}
// Where a tap reaches an edge line: from outside the strip (walls) or the
// cut's middle (cut sides), a little past the drawn line into the paper,
// never past halfway to the next line.
function edgeZone(sh, l, u, cuts) {
  if (l.h === 0) return [-.8 * u, .4];
  if (l.h === sh.n) return [sh.n - .4, sh.n + .8 * u];
  const ys = [0, sh.n, ...sh.lines, ...cuts];
  if (l.s === 'u') { const next = Math.min(...ys.filter(y => y > l.h)); return [l.h, l.h + Math.min(gapOf(sh) + .35 * u, (next - l.h) / 2)]; }
  const next = Math.max(...ys.filter(y => y < l.h));
  return [l.h - Math.min(gapOf(sh) + .35 * u, (l.h - next) / 2), l.h];
}
function lockGlyph(x, y, u) {
  const w = .17 * u, h = .15 * u;
  return `<g class="mb-lock"><path d="M${f(x - w * .55)},${f(y - h * .5)}v${f(-h * .55)}a${f(w * .55)},${f(w * .55)} 0 0 1 ${f(w * 1.1)},0v${f(h * .55)}"/><rect x="${f(x - w)}" y="${f(y - h * .5)}" width="${f(2 * w)}" height="${f(h * 1.4)}" rx="${f(w * .2)}"/></g>`;
}

// The ring picture: one ring per closed edge it asks for, holding its dots.
// colours: per ring, the colour its dots take; crossed: rings with no closed edge left.
const RING_SPOTS = {1: [[0, 0]], 2: [[-.26, 0], [.26, 0]], 3: [[0, -.26], [-.25, .17], [.25, .17]], 4: [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]]};
function ringPicture(rings, {colours = [], kinds = [], crossed = 0, label}) {
  const R = .62, step = 1.55;
  let out = '';
  rings.forEach((m, i) => {
    const cx = i * step + step / 2, cy = .8, x = rings.length - crossed <= i;
    out += `<circle class="mb-ring${colours[i] ? ` ${colours[i]}` : ''}${x ? ' crossed' : ''}" cx="${f(cx)}" cy="${f(cy)}" r="${R}"/>`;
    RING_SPOTS[m].forEach(([dx, dy], j) => { out += kinds[i] ? markShape([cx + dx, cy + dy], kinds[i][j], .23, 'mb-ring-dot') : `<circle class="mb-ring-dot ${colours[i] || ''}" cx="${f(cx + dx)}" cy="${f(cy + dy)}" r=".15"/>`; });
    if (x) out += `<path class="mb-ring-x" d="M${f(cx - .5)},${f(cy - .5)}L${f(cx + .5)},${f(cy + .5)}M${f(cx - .5)},${f(cy + .5)}L${f(cx + .5)},${f(cy - .5)}"/>`;
  });
  return `<svg class="mb-goal mb-rings" style="--n:${rings.length}" viewBox="0 0 ${f(rings.length * step)} 1.6" role="img" aria-label="${esc(label)}">${out}</svg>`;
}
// The pieces asked for: a card per piece, one ring on it per closed edge.
function piecePicture(goal, {colours = [], label}) {
  let out = '', x = .1;
  for (const [i, e] of goal.entries()) {
    const w = .42 + .38 * e;
    out += `<rect class="mb-card${colours[i] ? ` ${colours[i]}` : ''}" x="${f(x)}" y=".15" width="${f(w)}" height="1.1" rx=".24"/>`;
    for (let j = 0; j < e; j++) out += `<circle class="mb-card-ring" cx="${f(x + .4 + .38 * j)}" cy=".7" r=".14"/>`;
    x += w + .25;
  }
  return `<svg class="mb-goal mb-cards" style="--w:${f(x)}" viewBox="0 0 ${f(x)} 1.4" role="img" aria-label="${esc(label)}">${out}</svg>`;
}
const plural = (n, one, many = `${one}s`) => `${WORDS[n] || n} ${n === 1 ? one : many}`;
const ringsWords = rings => `Rings: ${rings.map(m => plural(m, 'dot')).join('; ')}`;
const piecesWords = goal => `Pieces: ${goal.map(e => `one with ${plural(e, 'closed edge')}`).join('; ')}`;
const moveButton = (label, action, {enabled = true, hinted = false, focus} = {}) => `<button type="button" class="secondary mb-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${focus || `mb-${action.type}`}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const uiButton = (label, payload, {pressed, enabled = true, hinted = false, focus, aria, toggle} = {}) => `<button type="button" class="secondary mb-button${hinted ? ' hinted' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify(payload))}" data-focus="${focus}"${toggle ? ` data-toggle="${toggle}"` : ''}${pressed === undefined ? '' : ` aria-pressed="${pressed}"`}${aria ? ` aria-label="${esc(aria)}"` : ''} ${enabled ? '' : 'disabled'}>${label}</button>`;
const arrowIcon = '<svg class="mb-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" stroke-dasharray="2 2.4"/><path d="M8 5v12M5.2 14l2.8 3.6 2.8-3.6M16 19V7M13.2 10l2.8-3.6 2.8 3.6"/></svg>';
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
// A new board closes Can't and drops lamps on edges that are gone.
function sync(p, q, b) {
  const v = view(p), now = JSON.stringify(b);
  if (v.board !== now) {
    if (v.board !== undefined) { v.claiming = false; v.flags = []; v.told = null; }
    v.board = now;
    const topo = topologyOf(q, b);
    v.lamps = v.lamps.map(l => l !== null && topo.circleOf.has(l) ? l : null);
  }
  return v;
}

function renderDots(p, a) {
  const q = p.parameters, b = a.board, v = sync(p, q, b), done = solved(p, b), topo = topologyOf(q, b), {sh} = bandOf(q, b);
  const open = cantOpen(q, b), claiming = v.claiming && open && !done;
  if (!claiming) { v.claiming = false; v.flags = []; }
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  // Each dot lights its closed edge; dots on one closed edge share a colour.
  // While Can't is open nothing is lit, so the taps can't be read off colours.
  const lit = new Map();
  if (done && b.claimed) topo.circles.forEach((_, c) => lit.set(c, LAMPS[c]));
  else if (!claiming) for (const d of b.dots) { const c = circleOfSeg(topo, d); if (!lit.has(c)) lit.set(c, LAMPS[lit.size]); }
  const dotColour = d => claiming ? 'plain' : lit.get(circleOfSeg(topo, d)) || 'plain';
  const flags = claiming ? v.flags : done && b.claimed ? b.claimed : b.told === 'way' ? b.flags : [];
  const uncut = !(q.cuts || []).length;
  const band = drawBand(p, q, b, {lit, dots: b.dots, dotColour, flags, targets: done ? null : claiming ? 'flags' : 'dots', shown, done, arrow: done && uncut, label: 'Band'});
  const rings = desc(q.rings);
  // Solved: each ring takes its closed edge's colour; after a right Can't the
  // closed edges take the first rings and the rest are crossed out.
  let colours = [];
  if (done && !b.claimed) {
    const sizes = new Map();
    for (const d of b.dots) { const c = circleOfSeg(topo, d); sizes.set(c, (sizes.get(c) || 0) + 1); }
    const order = [...sizes.entries()].sort((x, y) => y[1] - x[1]);
    colours = rings.map((_, i) => lit.get(order[i][0]));
  }
  if (done && b.claimed) colours = rings.map((_, i) => LAMPS[i] && i < topo.circles.length ? LAMPS[i] : '');
  const picture = ringPicture(rings, {colours, crossed: done && b.claimed ? rings.length - topo.circles.length : 0, label: ringsWords(rings)});
  const hintCant = shown?.type === 'cant';
  const allReady = claiming && hintCant && shown.flags.every(k => v.flags.includes(k)) && v.flags.length === shown.flags.length;
  // On a band with one closed edge Can't is the claim; otherwise it opens the
  // taps, and That's all is a move only for one tap on each closed edge.
  const all = certified(topo, v.flags) ? moveButton('That’s all', {type: 'cant', flags: v.flags}, {hinted: allReady, focus: 'mb-all'}) : uiButton('That’s all', {refuse: true}, {enabled: v.flags.length > 0, focus: 'mb-all'});
  const cant = oneEdge(topo) ? moveButton('Can’t', {type: 'cant', flags: []}, {enabled: open, hinted: hintCant, focus: 'mb-cant'}) : uiButton('Can’t', {claiming: !claiming}, {pressed: claiming, enabled: open, hinted: hintCant && !claiming, focus: claiming ? 'mb-cant-close' : 'mb-cant-open', toggle: 'mb-cant'});
  const bar = done ? '' : `<div class="mb-bar">${cant}${claiming ? all : ''}</div>`;
  const told = b.told === 'way' ? 'There is a way.' : v.told === 'flags' && !done ? 'Tap each closed edge once.' : '';
  const groups = groupSizes(topo, b.dots);
  const say = done && b.claimed ? `${cap(plural(topo.circles.length, 'closed edge'))} and ${plural(rings.length, 'ring')}.` : claiming ? `${plural(v.flags.length, 'edge')} tapped.` : b.dots.length ? `Dots by closed edge: ${groups.join(', ')}.` : '';
  return `<div class="mb-puzzle mode-dots${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="mobius"><div class="mb-goal-row">${picture}</div><div class="mb-band">${band}</div>${bar}${told ? `<p class="mb-told">${told}</p>` : ''}${status(`${say}${told ? ` ${told}` : ''}`)}</div>`;
}

function renderSeams(p, a) {
  const q = p.parameters, b = a.board, v = sync(p, q, b), done = solved(p, b), topo = topologyOf(q, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  // Solved: the stars' closed edge lights rose and the diamonds' leaf, like their rings.
  const sh = shapeFrom(q), markCircle = kind => circleOfSeg(topo, markSeg(sh, q.marks.find(m => m.kind === kind)));
  const lit = done ? new Map([[markCircle('star'), 'rose'], [markCircle('diamond'), 'leaf']]) : litCircles(topo, v.lamps);
  const band = drawBand(p, q, b, {lit, marks: q.marks, targets: done ? null : 'lamps', build: true, shown, done, arrow: v.arrow || done, label: 'Circle of strips'});
  const kinds = ['star', 'diamond'].map(kind => q.marks.filter(m => m.kind === kind).map(m => m.kind));
  const picture = ringPicture(kinds.map(k => k.length), {kinds, colours: done ? ['rose', 'leaf'] : [], label: 'Rings: two stars; two diamonds'});
  const bar = `<div class="mb-bar">${uiButton(arrowIcon, {arrow: !v.arrow}, {pressed: v.arrow || done, enabled: !done, focus: 'mb-arrow', aria: 'Carry an arrow round'})}</div>`;
  const say = `Seams: ${b.seams.join(' ')}.${lit.size ? ` ${plural(lit.size, 'closed edge')} lit.` : ''}`;
  return `<div class="mb-puzzle mode-seams${done ? ' solved' : ''}" data-mechanic-wire="mobius"><div class="mb-goal-row">${picture}</div><div class="mb-band strips">${band}</div>${bar}${status(say)}</div>`;
}

function renderPieces(p, a) {
  const q = p.parameters, b = a.board, v = sync(p, q, b), done = solved(p, b), topo = topologyOf(q, b);
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const lit = litCircles(topo, v.lamps);
  const band = drawBand(p, q, b, {lit, targets: 'lamps', build: true, shown, done, label: 'Band'});
  const goal = desc(q.goal);
  // Solved: each card takes the tint of a piece it matches.
  const used = new Set(), colours = done ? goal.map(e => { const i = topo.edges.findIndex((x, j) => x === e && !used.has(j)); used.add(i); return topo.pieces.length > 1 ? `t${i % 4}` : 't0'; }) : [];
  const picture = piecePicture(goal, {colours, label: piecesWords(goal)});
  const say = `Seam ${b.seams[0]}. ${plural(topo.pieces.length, 'piece')}.${lit.size ? ` ${plural(lit.size, 'closed edge')} lit.` : ''}`;
  return `<div class="mb-puzzle mode-pieces${done ? ' solved' : ''}" data-mechanic-wire="mobius"><div class="mb-goal-row">${picture}</div><div class="mb-band">${band}</div>${status(say)}</div>`;
}

function renderPlay(p, a) {
  const q = p.parameters, b = a.board, v = sync(p, q, b), topo = topologyOf(q, b), {sh} = bandOf(q, b);
  const lit = litCircles(topo, v.lamps);
  const band = drawBand(p, q, b, {lit, targets: 'lamps', build: true, arrow: v.arrow && !b.cuts.length, label: q.shapes[b.shape].name});
  const picks = `<div class="mb-picks" role="group" aria-label="Band">${Object.entries(q.shapes).map(([id, s]) => {
    const pic = roomBoard(surfaceFor(shapeFrom(s), s.start), {cls: 'mb-mini', picture: true, label: s.name, pad: .4 * shapeFrom(s).n});
    return `<button type="button" class="secondary mb-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'shape', id}))}" data-focus="mb-shape-${id}" aria-pressed="${b.shape === id}" aria-label="${esc(s.name)}">${pic}</button>`;
  }).join('')}</div>`;
  const bar = `<div class="mb-bar">${picks}${uiButton(arrowIcon, {arrow: !v.arrow}, {pressed: v.arrow && !b.cuts.length, enabled: !b.cuts.length, focus: 'mb-arrow', aria: 'Carry an arrow round'})}</div>`;
  const say = `Seams: ${b.seams.join(' ')}. ${plural(topo.pieces.length, 'piece')}.${lit.size ? ` ${plural(lit.size, 'closed edge')} lit.` : ''}`;
  return `<div class="mb-puzzle mode-play" data-mechanic-wire="mobius">${bar}<div class="mb-band${sh.K > 1 ? ' strips' : ''}">${band}</div>${status(say)}</div>`;
}

function render(p, a) {
  const mode = p.parameters.mode;
  return mode === 'dots' ? renderDots(p, a) : mode === 'seams' ? renderSeams(p, a) : mode === 'pieces' ? renderPieces(p, a) : renderPlay(p, a);
}

// --- Taps and keys ----------------------------------------------------------------------------
function wire(root, p, api) {
  const q = p.parameters;
  wirePortal(root, {
    point: (where, point) => {
      const b = api.attempt().board;
      if (solved(p, b)) return null;
      const [kind, ...rest] = point.split(':'), value = rest.join(':'), v = view(p);
      if (kind === 'seg' && q.mode === 'dots') {
        if (v.claiming && cantOpen(q, b)) { api.ui({flag: value}); return null; }
        return {type: 'dot', seg: value};
      }
      if (kind === 'lamp') {
        // A tap on a lit closed edge turns it off; on any other, lights it.
        const topo = topologyOf(q, b);
        if (topo.circleOf.has(value)) api.ui({lamps: toggleLamp(topo, v.lamps, value)});
        return null;
      }
      if (kind === 'seam') return {type: 'seam', k: Number(value)};
      if (kind === 'line') return {type: 'cut', h: Number(value)};
      if (kind === 'spot') return {type: 'hole', i: Number(value)};
      return null;
    }
  }, api.apply);
}

export const mobiusMechanics = {
  mobius: {
    fresh, valid, solved, move, hint, render, wire,
    ui: setView,
    reset: p => { views.delete(p.id); },
    // Undo takes back dots, never a refused claim: "There is a way." stays
    // while the dots are the same. The Undo straight after it takes back the
    // certificate's flags, so the board still changes.
    carry(p, from, to) {
      if (p.parameters.mode !== 'dots' || !object(from) || !object(to)) return to;
      if (from.told === 'way' && !to.claimed && Array.isArray(to.dots) && same(from.dots, to.dots)) return {...to, told: 'way', flags: []};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'mobius',
  family: {id: 'mobius', symbol: '∾', area: 'surfaces'},
  mechanics: mobiusMechanics,
  pack: new URL('./mobius.json', import.meta.url).href,
  css: new URL('./mobius.css', import.meta.url).href,
  focus: '[data-mechanic-wire="mobius"] .mb-hit[role="button"],[data-mechanic-wire="mobius"] .mb-button:not([disabled])'
};
