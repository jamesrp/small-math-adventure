// Stretch bands (worksheet Week 22, meeting regions). Labelled dots A, B, C
// and D sit on the points of a square lattice. A split puts them in two
// groups; a group's band is the convex hull of its dots: a dot, a segment, or
// a filled shape. A split meets when the two bands share a point.
//
// Radon's theorem in the plane: four dots always have a split that meets, and
// three dots that are not on one line have none, so four is sharp. In general
// position exactly one split of four meets (crossing diagonals, or a dot
// inside the triangle of the other three); a dot on the line through two
// others gives two; four dots on a line give four; two labels on one point
// give at least four. With A, B and C fixed and not on a line, a placed D
// makes 1, 2 or 4 splits meet: 4 only on top of one of them.
//
// Every coordinate is a whole number, so collinearity and contact are exact:
// the tests below use only integer cross products. Positions are [x, y] with
// y counted up from the bottom, as on the worksheet; the drawing turns them
// over onto the shared square grid.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, wireSquare, UNIT} from '../../sq-grid.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const LETTERS = ['A', 'B', 'C', 'D'];
export const MODES = ['every', 'place', 'locus', 'pair', 'playground'];
export const COLOURS = ['yellow', 'blue'];

// --- Geometry ------------------------------------------------------------------
export const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
export const same = (p, q) => p[0] === q[0] && p[1] === q[1];
const pointKey = p => `${p[0]},${p[1]}`;
// The band of a group: its distinct extreme points, one (a dot), two (a
// segment) or three or more anticlockwise (a filled shape).
export function hullOf(points) {
  const pts = [...new Map(points.map(p => [pointKey(p), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length <= 2) return pts;
  const lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && orient(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && orient(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  const h = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  return h.length >= 3 ? h : [pts[0], pts.at(-1)];
}
const between = (v, a, b) => Math.min(a, b) <= v && v <= Math.max(a, b);
export const onSegment = (p, a, b) => orient(a, b, p) === 0 && between(p[0], a[0], b[0]) && between(p[1], a[1], b[1]);
// A point in a band, edge included.
export function inHull(p, h) {
  if (h.length === 1) return same(p, h[0]);
  if (h.length === 2) return onSegment(p, h[0], h[1]);
  return h.every((u, i) => orient(u, h[(i + 1) % h.length], p) >= 0);
}
const sign = n => n > 0 ? 1 : n < 0 ? -1 : 0;
// Two closed segments share a point.
export function segmentsMeet(a, b, c, d) {
  const d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
  if (sign(d1) * sign(d2) < 0 && sign(d3) * sign(d4) < 0) return true;
  return (d1 === 0 && onSegment(a, c, d)) || (d2 === 0 && onSegment(b, c, d)) || (d3 === 0 && onSegment(c, a, b)) || (d4 === 0 && onSegment(d, a, b));
}
const edges = h => h.length < 2 ? [] : h.length === 2 ? [[h[0], h[1]]] : h.map((u, i) => [u, h[(i + 1) % h.length]]);
export function hullsMeet(h, k) {
  if (h.length > k.length) [h, k] = [k, h];
  if (h.length === 1) return inHull(h[0], k);
  if (h.some(p => inHull(p, k)) || k.some(p => inHull(p, h))) return true;
  return edges(h).some(([a, b]) => edges(k).some(([c, d]) => segmentsMeet(a, b, c, d)));
}
// What two meeting bands share, for drawing: {point} or {segment} (numbers,
// possibly fractions where two segments cross).
export function sharedPart(h, k) {
  if (h.length > k.length) [h, k] = [k, h];
  if (h.length === 1) return {point: h[0]};
  if (h.length === 2) {
    const [a, b] = h, d = [b[0] - a[0], b[1] - a[1]];
    if (k.length === 2 && orient(a, b, k[0]) !== 0 || k.length === 2 && orient(a, b, k[1]) !== 0) {
      const [c, e] = k, s = orient(c, e, a), t = s / (s - orient(c, e, b));
      return {point: [a[0] + t * d[0], a[1] + t * d[1]]};
    }
    // Clip a + t·d (0 ≤ t ≤ 1) to the other band.
    let lo = 0, hi = 1;
    if (k.length === 2) {
      const axis = d[0] !== 0 ? 0 : 1, ts = k.map(p => (p[axis] - a[axis]) / d[axis]);
      lo = Math.max(0, Math.min(...ts)); hi = Math.min(1, Math.max(...ts));
    } else {
      for (const [u, v] of edges(k)) {
        const fa = orient(u, v, a), fb = orient(u, v, b), slope = fb - fa;
        if (slope > 0) lo = Math.max(lo, -fa / slope); else if (slope < 0) hi = Math.min(hi, -fa / slope);
      }
    }
    const p = [a[0] + lo * d[0], a[1] + lo * d[1]], q = [a[0] + hi * d[0], a[1] + hi * d[1]];
    return hi - lo < 1e-9 ? {point: p} : {segment: [p, q]};
  }
  const inside = h.find(p => inHull(p, k)) || k.find(p => inHull(p, h));
  return {point: inside || h[0]};
}

// --- Splits --------------------------------------------------------------------
// A split is named by the group holding the first letter, then the other:
// "AB|CD", "ACD|B". Splits are listed with the first group's size, then
// alphabetically: A|BCD, AB|CD, AC|BD, AD|BC, ABC|D, ABD|C, ACD|B.
const splitCache = new Map();
export function splitList(letters) {
  const id = letters.join('');
  if (splitCache.has(id)) return splitCache.get(id);
  const [first, ...rest] = letters, out = [];
  for (let mask = 0; mask < (1 << rest.length) - 1; mask++) out.push([[first, ...rest.filter((_, i) => mask >> i & 1)], rest.filter((_, i) => !(mask >> i & 1))]);
  out.sort((x, y) => x[0].length - y[0].length || x[0].join('').localeCompare(y[0].join('')));
  const keys = out.map(([g, h]) => `${g.join('')}|${h.join('')}`);
  splitCache.set(id, keys);
  return keys;
}
export const groupsOf = key => key.split('|').map(s => [...s]);
// The split a colouring makes (bits[i] is 0 for yellow, 1 for blue), or null
// while one colour has every dot.
export function splitOfColours(letters, bits) {
  const g = letters.filter((_, i) => bits[i] === bits[0]), h = letters.filter((_, i) => bits[i] !== bits[0]);
  return h.length ? `${g.join('')}|${h.join('')}` : null;
}
// The colouring of a split nearest to `bits` (fewest dots to switch).
export function coloursOf(letters, key, bits = letters.map(() => 0)) {
  const [g] = groupsOf(key), one = letters.map(l => g.includes(l) ? 0 : 1), other = one.map(v => 1 - v);
  const off = c => c.filter((v, i) => v !== bits[i]).length;
  return off(other) < off(one) ? other : one;
}
// Does a split meet? A lone dot meets when it is in the other band, two
// pairs when their segments meet, and anything else by the general test.
const groupCache = new Map();
const groupsFor = key => { if (!groupCache.has(key)) groupCache.set(key, groupsOf(key)); return groupCache.get(key); };
export function meetsAt(pos, key) {
  const [g, h] = groupsFor(key);
  if (g.length === 1) return inHull(pos[g[0]], hullOf(h.map(l => pos[l])));
  if (h.length === 1) return inHull(pos[h[0]], hullOf(g.map(l => pos[l])));
  if (g.length === 2 && h.length === 2) return segmentsMeet(pos[g[0]], pos[g[1]], pos[h[0]], pos[h[1]]);
  return hullsMeet(hullOf(g.map(l => pos[l])), hullOf(h.map(l => pos[l])));
}
// Every split of the labels in `pos` whose bands meet, in list order.
const meetCache = new Map();
export function meetingSplits(pos) {
  const letters = Object.keys(pos).sort(), id = letters.map(l => `${l}${pos[l][0]},${pos[l][1]}`).join(';');
  if (meetCache.has(id)) return meetCache.get(id);
  const out = splitList(letters).filter(key => meetsAt(pos, key));
  if (meetCache.size > 50000) meetCache.clear();
  meetCache.set(id, out);
  return out;
}
const splitWords = key => { const [g, h] = groupsOf(key); return `${g.join('')} and ${h.join('')}`; };

// --- Boards and answers ----------------------------------------------------------
const isPoint = (q, p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[0] >= 0 && p[0] <= q.cols && p[1] >= 0 && p[1] <= q.rows;
const isBit = v => v === 0 || v === 1;
const lettersOf = q => q.mode === 'locus' ? ['A', 'B', 'C'] : q.mode === 'every' ? Object.keys(q.labels).sort() : LETTERS;
export const pointsOf = q => { const out = []; for (let y = q.rows; y >= 0; y--) for (let x = 0; x <= q.cols; x++) out.push([x, y]); return out; };
const occupied = (pos, p, except) => Object.entries(pos).some(([l, at]) => l !== except && same(at, p));
const withD = (q, p) => ({...q.labels, D: p});
const withC = (q, p) => ({...q.labels, C: p});
// Every puzzle's answers: the meeting splits (every), the points for D whose
// meeting splits are exactly the goal (place), the free points for C where
// some split meets (locus).
const answerCache = new Map();
export function answersOf(q) {
  const id = JSON.stringify(q);
  if (answerCache.has(id)) return answerCache.get(id);
  let out = [];
  if (q.mode === 'every') out = meetingSplits(q.labels);
  if (q.mode === 'place') out = pointsOf(q).filter(p => { const m = meetingSplits(withD(q, p)); return m.length === q.goal.length && m.every(k => q.goal.includes(k)); });
  if (q.mode === 'locus') out = pointsOf(q).filter(p => !occupied(q.labels, p) && meetingSplits(withC(q, p)).length > 0);
  answerCache.set(id, out);
  return out;
}
const hasPoint = (list, p) => list.some(x => same(x, p));
// Where C sits on the line through A and B: before A (t < 0), between, past B.
const along = (q, p) => { const [A, B] = [q.labels.A, q.labels.B], d = [B[0] - A[0], B[1] - A[1]], axis = d[0] !== 0 ? 0 : 1; return (p[axis] - A[axis]) / d[axis]; };
// The splits two boards share.
export const commonSplits = boards => { const [s, t] = boards.map(meetingSplits); return s.filter(k => t.includes(k)); };

// --- Fresh, valid, solved ---------------------------------------------------------
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'every') return {groups: lettersOf(q).map(() => 0), shelf: [], told: null, refused: null, done: false};
  if (q.mode === 'place') return {at: [...q.start], refused: false, done: false};
  if (q.mode === 'locus') return {found: [], missed: [], at: null, more: false, done: false};
  if (q.mode === 'pair') return {boards: q.boards.map(b => Object.fromEntries(LETTERS.map(l => [l, [...b[l]]]))), refused: false, done: false};
  return {at: Object.fromEntries(LETTERS.map(l => [l, [...q.labels[l]]])), groups: [...q.groups]};
}
const keysAre = (b, list) => object(b) && Object.keys(b).sort().join() === [...list].sort().join();
const isBool = v => typeof v === 'boolean';
// Four labels on four different points of the board.
const validSpread = (q, pos) => keysAre(pos, LETTERS) && LETTERS.every(l => isPoint(q, pos[l])) && new Set(LETTERS.map(l => pointKey(pos[l]))).size === 4;
// Find every: the shelf holds splits the child has claimed, unjudged until
// That's all. A refusal records the first shelved split that misses, or that
// one is missing (the board shows only "Not yet."); it stays until the shelf
// changes.
const judge = (q, shelf) => { const answers = answersOf(q), miss = shelf.find(k => !answers.includes(k)); return miss ? {kind: 'apart', key: miss} : shelf.length < answers.length ? {kind: 'more'} : null; };
function validEvery(q, b) {
  const letters = lettersOf(q), splits = splitList(letters);
  if (!keysAre(b, ['groups', 'shelf', 'told', 'refused', 'done']) || !isBool(b.done)) return false;
  if (!Array.isArray(b.groups) || b.groups.length !== letters.length || !b.groups.every(isBit)) return false;
  if (!Array.isArray(b.shelf) || !b.shelf.every(k => splits.includes(k)) || new Set(b.shelf).size !== b.shelf.length) return false;
  const now = splitOfColours(letters, b.groups);
  if (b.told !== null && !(b.told === 'again' && now !== null && b.shelf.includes(now))) return false;
  if (b.refused !== null) {
    const verdict = b.shelf.length ? judge(q, b.shelf) : null;
    if (!verdict || JSON.stringify(b.refused) !== JSON.stringify(verdict) || b.done) return false;
  }
  return !b.done || (b.shelf.length > 0 && judge(q, b.shelf) === null);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'every') return validEvery(q, b);
  if (q.mode === 'place') {
    if (!keysAre(b, ['at', 'refused', 'done']) || !isBool(b.refused) || !isBool(b.done) || !isPoint(q, b.at)) return false;
    const right = hasPoint(answersOf(q), b.at);
    return !(b.refused && (right || b.done)) && (!b.done || right);
  }
  if (q.mode === 'locus') {
    if (!keysAre(b, ['found', 'missed', 'at', 'more', 'done']) || !isBool(b.more) || !isBool(b.done)) return false;
    const answers = answersOf(q), list = [...(Array.isArray(b.found) ? b.found : [null]), ...(Array.isArray(b.missed) ? b.missed : [null])];
    if (!list.every(x => isPoint(q, x) && !occupied(q.labels, x)) || new Set(list.map(pointKey)).size !== list.length) return false;
    if (!b.found.every(x => hasPoint(answers, x)) || b.missed.some(x => hasPoint(answers, x))) return false;
    if (b.at !== null && !hasPoint(list, b.at)) return false;
    if (b.more && (b.done || b.found.length === answers.length || !b.found.length)) return false;
    return !b.done || b.found.length === answers.length;
  }
  if (q.mode === 'pair') {
    if (!keysAre(b, ['boards', 'refused', 'done']) || !isBool(b.refused) || !isBool(b.done) || !Array.isArray(b.boards) || b.boards.length !== 2 || !b.boards.every(pos => validSpread(q, pos))) return false;
    const right = commonSplits(b.boards).length === 0;
    return !(b.refused && (right || b.done)) && (!b.done || right);
  }
  return keysAre(b, ['at', 'groups']) && validSpread(q, b.at) && Array.isArray(b.groups) && b.groups.length === 4 && b.groups.every(isBit);
}
function solved(p, b) {
  const q = p.parameters;
  return q.mode !== 'playground' && valid(p, b) && b.done;
}

// --- Moves ---------------------------------------------------------------------
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const letters = lettersOf(q);
  if (q.mode === 'every') {
    if (action.type === 'tap') {
      const i = letters.indexOf(action.label);
      if (i < 0) return null;
      return {...b, groups: b.groups.map((v, j) => j === i ? 1 - v : v), told: null};
    }
    // Meet puts the split on the shelf, unjudged.
    if (action.type === 'meet') {
      const now = splitOfColours(letters, b.groups);
      if (now === null || b.told !== null) return null;
      if (b.shelf.includes(now)) return {...b, told: 'again'};
      return {...b, shelf: [...b.shelf, now], told: null, refused: null};
    }
    if (action.type === 'drop') return b.shelf.includes(action.key) ? {...b, shelf: b.shelf.filter(k => k !== action.key), told: null, refused: null} : null;
    // That's all judges the whole shelf; after a refusal it waits for a change.
    if (action.type === 'all' && b.shelf.length && !b.refused) { const verdict = judge(q, b.shelf); return verdict ? {...b, refused: verdict, told: null} : {...b, done: true, told: null}; }
    return null;
  }
  if (q.mode === 'place') {
    if (action.type === 'put') return isPoint(q, action.at) && !same(action.at, b.at) ? {at: [...action.at], refused: false, done: false} : null;
    if (action.type === 'check' && !b.refused) return hasPoint(answersOf(q), b.at) ? {...b, done: true} : {...b, refused: true};
    return null;
  }
  if (q.mode === 'locus') {
    if (action.type === 'put') {
      const at = action.at;
      if (!isPoint(q, at) || occupied(q.labels, at) || (b.at && same(at, b.at))) return null;
      const known = hasPoint(b.found, at) || hasPoint(b.missed, at);
      if (known) return {...b, at: [...at]};
      return hasPoint(answersOf(q), at) ? {...b, found: [...b.found, [...at]], at: [...at], more: false} : {...b, missed: [...b.missed, [...at]], at: [...at]};
    }
    if (action.type === 'all' && b.found.length && !b.more) return b.found.length === answersOf(q).length ? {...b, done: true} : {...b, more: true};
    return null;
  }
  if (q.mode === 'pair') {
    if (action.type === 'put') {
      const k = action.board, pos = b.boards[k];
      if (![0, 1].includes(k) || !LETTERS.includes(action.label) || !isPoint(q, action.at) || occupied(pos, action.at)) return null;
      return {boards: b.boards.map((x, j) => j === k ? {...x, [action.label]: [...action.at]} : x), refused: false, done: false};
    }
    if (action.type === 'check' && !b.refused) return commonSplits(b.boards).length ? {...b, refused: true} : {...b, done: true};
    return null;
  }
  // The playground: switch a colour, or move a dot to a free point.
  if (action.type === 'tap') {
    const i = LETTERS.indexOf(action.label);
    return i < 0 ? null : {...b, groups: b.groups.map((v, j) => j === i ? 1 - v : v)};
  }
  if (action.type === 'put') {
    if (!LETTERS.includes(action.label) || !isPoint(q, action.at) || occupied(b.at, action.at)) return null;
    return {...b, at: {...b.at, [action.label]: [...action.at]}};
  }
  return null;
}

// --- Hints ---------------------------------------------------------------------
const nearest = (list, p) => [...list].sort((u, v) => ((u[0] - p[0]) ** 2 + (u[1] - p[1]) ** 2) - ((v[0] - p[0]) ** 2 + (v[1] - p[1]) ** 2))[0];
function everyHint(q, b) {
  const letters = lettersOf(q), answers = answersOf(q), now = splitOfColours(letters, b.groups);
  const wrong = b.shelf.find(k => !answers.includes(k));
  if (wrong) return {type: 'move', action: {type: 'drop', key: wrong}, text: `Take ${splitWords(wrong)} off the shelf.`, key: wrong};
  const aims = answers.filter(k => !b.shelf.includes(k));
  if (!aims.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  if (aims.includes(now)) return {type: 'move', action: {type: 'meet'}, text: 'Press Meet.'};
  const off = key => coloursOf(letters, key, b.groups).filter((v, i) => v !== b.groups[i]).length;
  const aim = [...aims].sort((x, y) => off(x) - off(y))[0], want = coloursOf(letters, aim, b.groups);
  const i = want.findIndex((v, j) => v !== b.groups[j]), label = letters[i];
  return {type: 'move', action: {type: 'tap', label}, text: `Make ${label} ${COLOURS[want[i]]}.`, label};
}
function placeHint(q, b) {
  const answers = answersOf(q);
  if (hasPoint(answers, b.at)) return {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
  const at = nearest(answers, b.at);
  return {type: 'move', action: {type: 'put', at}, text: q.where, at};
}
function locusHint(q, b) {
  const left = answersOf(q).filter(x => !hasPoint(b.found, x));
  if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  // Between A and B first, then past B, then past A.
  const rank = x => { const t = along(q, x); return t > 0 && t < 1 ? t : t > 1 ? 1 + t : 100 - t; };
  const at = [...left].sort((u, v) => rank(u) - rank(v))[0], t = along(q, at);
  const where = t > 0 && t < 1 ? 'between A and B' : t > 1 ? 'past B' : 'past A';
  return {type: 'move', action: {type: 'put', at}, text: `Put C on the line through A and B, ${where}.`, at};
}
// Pair: change one board until no split meets on both. Look for one move on
// the second board, then the first, then two moves on either; prefer moves
// that leave one split meeting, then short moves.
const BOARD_WORDS = ['first', 'second'];
const pairCache = new Map();
function pairMoves(q, boards, k) {
  const out = [];
  for (const label of LETTERS) for (const at of pointsOf(q)) if (!occupied(boards[k], at)) out.push({type: 'put', board: k, label, at});
  return out;
}
const apply = (boards, m) => boards.map((x, j) => j === m.board ? {...x, [m.label]: m.at} : x);
const stepLength = (boards, m) => { const from = boards[m.board][m.label]; return (from[0] - m.at[0]) ** 2 + (from[1] - m.at[1]) ** 2; };
export function pairPlan(q, boards) {
  const id = JSON.stringify(boards);
  if (pairCache.has(id)) return pairCache.get(id);
  let plan = null;
  if (!commonSplits(boards).length) plan = [];
  for (const k of [1, 0]) {
    if (plan) break;
    const ones = pairMoves(q, boards, k).filter(m => !commonSplits(apply(boards, m)).length);
    if (ones.length) {
      const score = m => (meetingSplits(apply(boards, m)[k]).length === 1 ? 0 : 1e6) + stepLength(boards, m);
      plan = [[...ones].sort((x, y) => score(x) - score(y))[0]];
    }
  }
  for (const k of [1, 0]) {
    if (plan) break;
    const firsts = pairMoves(q, boards, k).sort((x, y) => stepLength(boards, x) - stepLength(boards, y));
    for (const first of firsts) {
      const next = apply(boards, first), second = pairMoves(q, next, k).find(m => !commonSplits(apply(next, m)).length);
      if (second) { plan = [first, second]; break; }
    }
  }
  if (pairCache.size > 2000) pairCache.clear();
  pairCache.set(id, plan);
  return plan;
}
function pairHint(q, b) {
  const plan = pairPlan(q, b.boards);
  if (!plan) return {type: 'note'};
  if (!plan.length) return {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
  const m = plan[0], after = apply(b.boards, m), splits = meetingSplits(after[m.board]);
  let text = `Move ${m.label} on the ${BOARD_WORDS[m.board]} board.`;
  if (plan.length === 1 && splits.length === 1) {
    const [g, h] = groupsOf(splits[0]), lone = g.length === 1 ? g : h.length === 1 ? h : null;
    if (lone) text = `Move ${m.label} on the ${BOARD_WORDS[m.board]} board so ${lone[0]} is inside the triangle of the others.`;
    else text = `Move ${m.label} on the ${BOARD_WORDS[m.board]} board so ${g.join('')} crosses ${h.join('')}.`;
  }
  return {type: 'move', action: m, text, label: m.label, board: m.board, at: m.at};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  if (q.mode === 'every') return everyHint(q, b);
  if (q.mode === 'place') return placeHint(q, b);
  if (q.mode === 'locus') return locusHint(q, b);
  return pairHint(q, b);
}

// --- View state ------------------------------------------------------------------
// The chosen dot on each board (pair, playground) and the playground's tool.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {chosen: ['D', 'D'], tool: 'colour'}); return uiState.get(p.id); }

// --- Drawing ---------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
const placeWords = p => `${p[0]} across, ${p[1]} up`;
const gridFor = q => gridOf({cols: q.cols, rows: q.rows});
const drawAt = (q, p) => [p[0] * UNIT, (q.rows - p[1]) * UNIT];
const DISC = 3.2;
// Where each label's disc sits: on its point, or side by side when several
// share a point.
const SPREAD = {1: [[0, 0]], 2: [[-2.75, 0], [2.75, 0]], 3: [[-2.6, 1.5], [2.6, 1.5], [0, -2.6]], 4: [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]};
const RADIUS = {1: DISC, 2: 2.55, 3: 2.3, 4: 2.2};
// Tap circles: a little past the disc, but never past halfway to a disc that
// shares the point, so a tap goes to the nearest letter. A disc alone on its
// point reaches halfway to the nearest other disc, up to 0.6 of a square, so
// it is a 40 px target on a phone wherever there is room (soloHit).
const HIT = {1: DISC + .9, 2: 2.75, 3: 2.42, 4: 2.5};
const SOLO_MAX = 6;
export function soloHit(pos, l) {
  const [x, y] = pos[l];
  let d = Infinity;
  for (const m of Object.keys(pos)) { const [u, v] = pos[m]; if (u !== x || v !== y) d = Math.min(d, Math.hypot(u - x, v - y) * UNIT); }
  return Math.max(HIT[1], Math.min(SOLO_MAX, d / 2));
}
// A lattice point that takes taps reaches halfway to its neighbours.
const REACH = UNIT / 2;
// Small pictures draw each dot small, close to its exact point, so a band
// that passes near a dot without touching it shows a gap.
const MINI_DOT = 1.3;
function discSpots(pos) {
  const byPoint = new Map();
  for (const l of Object.keys(pos).sort()) { const k = pointKey(pos[l]); byPoint.set(k, [...(byPoint.get(k) || []), l]); }
  const out = {};
  for (const list of byPoint.values()) list.forEach((l, i) => { out[l] = {offset: SPREAD[list.length][i], r: RADIUS[list.length], count: list.length}; });
  return out;
}
// A band: a filled shape, a thick segment or a ring round a dot.
function bandSvg(q, h, c, shift = [0, 0], ring = null) {
  const pts = h.map(p => drawAt(q, p)).map(([x, y]) => [x + shift[0], y + shift[1]]);
  if (pts.length === 1) return ring ? `<circle class="sb-band sb-ring sb-c${c}" cx="${f(ring.x)}" cy="${f(ring.y)}" r="${f(ring.r)}"/>` : '';
  if (pts.length === 2) return `<line class="sb-band sb-rod sb-c${c}" x1="${f(pts[0][0])}" y1="${f(pts[0][1])}" x2="${f(pts[1][0])}" y2="${f(pts[1][1])}"/>`;
  return `<polygon class="sb-band sb-shape sb-c${c}" points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`;
}
// Both bands of a split (`groups` = [yellow, blue]) and, when they meet, the
// shared part: a pine ring round a shared point, or a pine line along a
// shared segment. Two bands on one line are drawn a little apart, one above
// the other, so both stay visible.
// A ring round the discs of `group` at the point `p`: round one disc where
// letters share the point, or round them all.
function ringAt(q, pos, group, p, small) {
  const here = Object.keys(pos).filter(l => same(pos[l], p)), spread = discSpots(pos), [x, y] = drawAt(q, p);
  const size = l => (small ? MINI_DOT : spread[l].r) + .9;
  if (here.length === 1) return {x, y, r: small ? size(here[0]) : 4.1};
  if (here.every(l => group.includes(l))) return {x, y, r: Math.max(...here.map(l => Math.hypot(...spread[l].offset) + size(l)))};
  const mine = here.filter(l => group.includes(l)), cx = mine.reduce((t, l) => t + spread[l].offset[0], 0) / mine.length, cy = mine.reduce((t, l) => t + spread[l].offset[1], 0) / mine.length;
  return {x: x + cx, y: y + cy, r: Math.max(...mine.map(l => Math.hypot(spread[l].offset[0] - cx, spread[l].offset[1] - cy) + size(l)))};
}
function splitSvg(q, pos, groups, small = false) {
  const hulls = groups.map(g => hullOf(g.map(l => pos[l])));
  const order = [0, 1].sort((i, j) => hulls[j].length - hulls[i].length);
  const onOneLine = hulls.every(h => h.length === 2) && hulls[1].every(p => orient(hulls[0][0], hulls[0][1], p) === 0);
  let shift = [[0, 0], [0, 0]];
  if (onOneLine) {
    const [[x1, y1], [x2, y2]] = hulls[0].map(p => drawAt(q, p)), len = Math.hypot(x2 - x1, y2 - y1), n = [-(y2 - y1) / len * 1.5, (x2 - x1) / len * 1.5];
    shift = [n, [-n[0], -n[1]]];
  }
  // In a small picture a lone dot's band is the coloured dot itself.
  const bands = order.map(i => bandSvg(q, hulls[i], i, shift[i], hulls[i].length === 1 && !small ? ringAt(q, pos, groups[i], hulls[i][0], small) : null)).join('');
  if (!hullsMeet(...hulls)) return {bands, mark: ''};
  const part = sharedPart(...hulls);
  if (part.segment) {
    const [[x1, y1], [x2, y2]] = part.segment.map(p => drawAt(q, p));
    return {bands: `${bands}<line class="sb-shared" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`, mark: ''};
  }
  const [x, y] = drawAt(q, part.point), here = Object.keys(pos).filter(l => same(pos[l], part.point));
  const r = here.length ? ringAt(q, pos, here, part.point, small).r + .6 : 2.4;
  return {bands, mark: `<circle class="sb-meet" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>${here.length ? '' : `<circle class="sb-meet-dot" cx="${f(x)}" cy="${f(y)}" r=".75"/>`}`};
}
const pips = q => pointsOf(q).map(p => { const [x, y] = drawAt(q, p); return `<circle class="sb-pip" cx="${f(x)}" cy="${f(y)}" r=".62"/>`; }).join('');
// The discs, coloured 0 (yellow), 1 (blue) or n (no colour). look(l) gives
// {cls, act, label, focus, piece} for each label.
function discs(q, pos, look, colours, small = false) {
  const spots = discSpots(pos);
  return Object.keys(pos).sort().map(l => {
    const {offset, r} = spots[l], [x, y] = drawAt(q, pos[l]), it = look(l) || {};
    // Small pictures show the dots in their colours, without letters.
    if (small) return `<circle class="sb-dot sb-c${colours[l]}" cx="${f(x + offset[0])}" cy="${f(y + offset[1])}" r="${MINI_DOT}"/>`;
    const control = it.act ? ` role="button" tabindex="0" aria-label="${esc(it.label)}" data-sg-piece="${esc(it.piece)}" data-focus="${esc(it.focus)}"` : '';
    return `<g class="sb-disc sb-c${colours[l]}${it.cls ? ` ${it.cls}` : ''}" transform="translate(${f(x + offset[0])},${f(y + offset[1])})"${control}>${it.act ? `<circle class="sb-hit" r="${f(spots[l].count === 1 ? soloHit(pos, l) : HIT[spots[l].count])}"/>` : ''}<circle class="sb-face" r="${r}"/><text class="sb-letter" y="${f(r * .36)}" style="font-size:${f(r * 1.3)}px">${l}</text></g>`;
  }).join('');
}
// Tap targets on lattice points. spot(p) gives {cls, label} or null.
const indexOf = (q, p) => p[0] * (q.rows + 1) + p[1];
const pointOfIndex = (q, k) => [Math.floor(k / (q.rows + 1)), k % (q.rows + 1)];
function spots(q, spot, k = 0) {
  return pointsOf(q).map(p => {
    const it = spot(p);
    if (!it) return '';
    const [x, y] = drawAt(q, p), index = indexOf(q, p), cls = it.cls || '';
    const mark = cls.includes('found') ? '<circle class="sb-found" r="3.5"/>' : cls.includes('missed') ? '<path class="sb-missed" d="M-1.5 -1.5L1.5 1.5M-1.5 1.5L1.5 -1.5"/>' : '';
    return `<g class="sb-spot${cls ? ` ${cls}` : ''}" transform="translate(${f(x)},${f(y)})" role="button" tabindex="0" aria-label="${esc(it.label)}" data-sg-point="${index}" data-focus="sb-spot-${k}-${index}"><circle class="sb-reach" r="${REACH}"/>${mark}</g>`;
  }).join('');
}
// A ring on a point that is not a control (a place found, once finished).
const ring = (q, p, cls) => { const [x, y] = drawAt(q, p); return `<circle class="${cls}" cx="${f(x)}" cy="${f(y)}" r="3.5"/>`; };
// One board: the dots, and the bands of `split` when given. Without
// `colours`, a split's dots take its colours (the first letter's group
// yellow) and dots with no split shown have no colour.
const neutral = pos => Object.fromEntries(Object.keys(pos).map(l => [l, 'n']));
const coloursFor = (key, pos, bits = null) => { const letters = Object.keys(pos).sort(), c = coloursOf(letters, key, bits || letters.map(() => 0)); return Object.fromEntries(letters.map((l, i) => [l, c[i]])); };
const orderedGroups = (key, colours) => { const [g, h] = groupsOf(key); return colours[g[0]] === 1 ? [h, g] : [g, h]; };
function drawBoard(q, pos, opts = {}) {
  const {split = null, look = () => null, spot = null, k = 0, label = 'Dots', picture = false, cls = '', extra = ''} = opts;
  const colours = opts.colours || (split ? coloursFor(split, pos) : neutral(pos));
  const drawn = split ? splitSvg(q, pos, orderedGroups(split, colours), picture) : {bands: "", mark: ""};
  return squareBoard(gridFor(q), {
    cls: `sb-board ${cls}`, label, picture, pad: picture ? .35 : .45,
    under: `${pips(q)}${drawn.bands}`,
    over: `${extra}${discs(q, pos, look, colours, picture)}${drawn.mark}${spot ? spots(q, spot, k) : ''}`
  });
}
// A small picture of one split, for a shelf or a certificate: the lattice
// round the dots, one step past them each way, so the picture is as large as
// it can be. `big` pictures (a split shown apart) are drawn wider, with
// thinner bands, so the narrowest gap is still plain
// (scripts/validate-radon.mjs measures it).
export function cropOf(pos) {
  const xs = Object.values(pos).map(p => p[0]), ys = Object.values(pos).map(p => p[1]), x0 = Math.min(...xs) - 1, y0 = Math.min(...ys) - 1;
  return {x0, y0, cols: Math.max(...xs) - x0 + 1, rows: Math.max(...ys) - y0 + 1};
}
function mini(q, pos, key, meets, big = false) {
  const {x0, y0, cols, rows} = cropOf(pos), moved = Object.fromEntries(Object.entries(pos).map(([l, p]) => [l, [p[0] - x0, p[1] - y0]]));
  return `<div class="sb-mini${big ? ' sb-big' : ''}" role="listitem">${drawBoard({cols, rows}, moved, {split: key, picture: true, cls: 'sb-mini-board', label: `${splitWords(key)}${meets ? ' meet' : ' do not meet'}`})}</div>`;
}
const shelf = (items, label) => items.length ? `<div class="sb-shelf" role="list" aria-label="${label}">${items.join('')}</div>` : '';
// A split as two coloured groups of letters.
const chip = (key, cls = '') => { const [g, h] = groupsOf(key); return `<span class="sb-chip${cls}" role="img" aria-label="${splitWords(key)}"><b class="sb-c0">${g.join('')}</b><b class="sb-c1">${h.join('')}</b></span>`; };
const moveButton = (label, action, enabled, hinted) => `<button type="button" class="secondary sb-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="sb-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const told = text => text ? `<p class="sb-told">${esc(text)}</p>` : '';
const colourWords = (letters, bits) => [0, 1].map(c => { const ls = letters.filter((_, i) => bits[i] === c); return ls.length ? `${COLOURS[c][0].toUpperCase()}${COLOURS[c].slice(1)}: ${listWords(ls)}.` : ''; }).filter(Boolean).join(' ');

function renderEvery(p, a) {
  const q = p.parameters, b = a.board, letters = lettersOf(q), done = solved(p, b);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const colours = Object.fromEntries(letters.map((l, i) => [l, b.groups[i]])), now = splitOfColours(letters, b.groups);
  // The board shows colours only: no band is drawn until That's all is judged.
  const look = l => ({act: !done, piece: l, focus: `sb-disc-${l}`, cls: act?.type === 'tap' && act.label === l ? 'hinted' : '', label: `${l}, ${COLOURS[colours[l]]}`});
  const main = drawBoard(q, q.labels, {colours, look});
  const bar = done ? '' : `<div class="sb-bar">${moveButton('Meet', {type: 'meet'}, now !== null && b.told === null, act?.type === 'meet')}${moveButton('That’s all', {type: 'all'}, b.shelf.length > 0 && !b.refused, act?.type === 'all')}</div>`;
  // A refused That's all says only "Not yet.", whether a shelved split misses
  // or one is missing, and rings nothing: told apart, a shelf of one split
  // would judge that split (Square leftovers' find rule). The save keeps which.
  const word = b.told === 'again' ? 'Already on the shelf.' : b.refused ? 'Not yet.' : '';
  // The shelf: unjudged splits, each a button that takes it off; once solved,
  // each split drawn with its bands.
  const item = key => `<button type="button" class="sb-chip sb-take${act?.type === 'drop' && act.key === key ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'drop', key}))}" data-focus="sb-drop-${key.replace('|', '-')}" aria-label="${splitWords(key)}. Take it off the shelf"><b class="sb-c0">${groupsOf(key)[0].join('')}</b><b class="sb-c1">${groupsOf(key)[1].join('')}</b></button>`;
  const list = done ? shelf(b.shelf.map(k => mini(q, q.labels, k, true)), 'Splits that meet') : b.shelf.length ? `<div class="sb-goal sb-shelved" role="group" aria-label="Shelf">${b.shelf.map(item).join('')}</div>` : '';
  const say = `${colourWords(letters, b.groups)}${b.shelf.length ? ` Shelf: ${b.shelf.map(splitWords).join('; ')}.` : ' The shelf is empty.'}${word ? ` ${word}` : ''}${done ? ' That’s all.' : ''}`;
  return `<div class="sb-puzzle${done ? ' solved' : ''}" data-mechanic-wire="radon"><div class="sb-stage">${main}</div>${told(word)}${bar}${list}${status(say)}</div>`;
}

function renderPlace(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const pos = withD(q, b.at), meeting = meetingSplits(pos);
  // After a refused Check: a goal split that misses, else a split that meets
  // but is not in the goal.
  const missing = q.goal.find(k => !meeting.includes(k)), extra = meeting.find(k => !q.goal.includes(k));
  const shown = b.refused ? (missing || extra) : done && q.goal.length === 1 ? q.goal[0] : null;
  const look = l => ({cls: l === 'D' ? 'moving' : ''});
  const here = pt => Object.keys(pos).filter(l => same(pos[l], pt));
  const spot = done ? null : pt => ({cls: act?.type === 'put' && same(act.at, pt) ? 'hinted' : '', label: `${placeWords(pt)}${here(pt).map(l => `, ${l} is here`).join('')}${same(pt, b.at) ? '' : '. Move D here'}`});
  const main = drawBoard(q, pos, {split: shown, look, spot});
  const goal = `<div class="sb-goal" role="group" aria-label="Goal">${q.goal.map(k => chip(k, b.refused && k === missing ? ' ringed' : '')).join('')}</div>`;
  const bar = done ? '' : `<div class="sb-bar">${moveButton('Check', {type: 'check'}, !b.refused, act?.type === 'check')}</div>`;
  const word = !b.refused ? '' : missing ? 'This one doesn’t meet.' : 'This one meets too.';
  const after = done && q.goal.length > 1 ? shelf(q.goal.map(k => mini(q, pos, k, true)), 'Splits that meet') : '';
  const say = `D at ${placeWords(b.at)}.${word ? ` ${word} ${splitWords(shown)}.` : ''}${done ? ` Only ${q.goal.map(splitWords).join('; ')} meet.` : ''}`;
  return `<div class="sb-puzzle${done ? ' solved' : ''}" data-mechanic-wire="radon">${goal}<div class="sb-stage">${main}</div>${told(word)}${bar}${after}${status(say)}</div>`;
}

function renderLocus(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const pos = b.at ? withC(q, b.at) : {...q.labels};
  const works = b.at && hasPoint(b.found, b.at), fails = b.at && hasPoint(b.missed, b.at);
  const look = l => ({cls: l === 'C' ? 'moving' : ''});
  const spot = done ? null : pt => {
    if (occupied(q.labels, pt)) return null;
    // C's own place shows C rather than a cross.
    const cls = [hasPoint(b.found, pt) ? 'found' : '', hasPoint(b.missed, pt) && !(b.at && same(pt, b.at)) ? 'missed' : '', act?.type === 'put' && same(act.at, pt) ? 'hinted' : ''].filter(Boolean).join(' ');
    return {cls, label: `${placeWords(pt)}${hasPoint(b.found, pt) ? ', a split meets' : hasPoint(b.missed, pt) ? ', no split meets' : ''}${b.at && same(pt, b.at) ? ', C is here' : '. Put C here'}`};
  };
  const marks = done ? b.found.map(x => ring(q, x, 'sb-found-ring')).join('') : '';
  const split = works ? meetingSplits(pos)[0] : null;
  const main = drawBoard(q, pos, {split, look, spot, extra: marks});
  const bar = done ? '' : `<div class="sb-bar">${moveButton('That’s all', {type: 'all'}, b.found.length > 0 && !b.more, act?.type === 'all')}</div>`;
  const word = b.more ? 'There is another.' : fails ? 'No split meets.' : '';
  // A place that fails shows its three splits apart.
  const proof = fails && !done ? shelf(splitList(['A', 'B', 'C']).map(k => mini(q, pos, k, false, true)), 'Every split') : '';
  const say = `${b.at ? `C at ${placeWords(b.at)}.` : ''}${works ? ` ${splitWords(split)} meet.` : ''}${word ? ` ${word}` : ''} Places found: ${b.found.length ? b.found.map(placeWords).join('; ') : 'none'}.${done ? ' That’s all.' : ''}`;
  return `<div class="sb-puzzle${done ? ' solved' : ''}" data-mechanic-wire="radon"><div class="sb-stage">${main}</div>${told(word)}${proof}${bar}${status(say)}</div>`;
}

function renderPair(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  const h = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = h?.action;
  const common = b.refused ? commonSplits(b.boards)[0] : null;
  const one = k => {
    const pos = b.boards[k], chosen = state.chosen[k], name = BOARD_WORDS[k], hinted = act?.type === 'put' && act.board === k;
    const look = l => ({act: !done, piece: `${k}:${l}`, focus: `sb-disc-${k}-${l}`, cls: [!done && l === chosen ? 'chosen' : '', hinted && act.label === l ? 'hinted' : ''].filter(Boolean).join(' '), label: `${name} board, ${l}${l === chosen ? ', chosen' : '. Choose it'}`});
    const spot = done ? null : pt => occupied(pos, pt) ? null : {cls: hinted && same(act.at, pt) ? 'hinted' : '', label: `${name} board, ${placeWords(pt)}. Move ${chosen} here`};
    const svg = drawBoard(q, pos, {split: common, look, spot, k, label: `${name[0].toUpperCase()}${name.slice(1)} board`});
    const list = done ? shelf(meetingSplits(pos).map(key => mini(q, pos, key, true)), `Splits that meet on the ${name} board`) : '';
    return `<div class="sb-half" data-sb-board="${k}">${svg}${list}</div>`;
  };
  const bar = done ? '' : `<div class="sb-bar">${moveButton('Check', {type: 'check'}, !b.refused, act?.type === 'check')}</div>`;
  const word = common ? 'This split meets on both.' : '';
  const say = `${b.boards.map((pos, k) => `${BOARD_WORDS[k]} board: ${LETTERS.map(l => `${l} at ${placeWords(pos[l])}`).join(', ')}.`).join(' ')}${word ? ` ${word} ${splitWords(common)}.` : ''}${done ? '' : ` Chosen: ${state.chosen.join(' and ')}.`}`;
  return `<div class="sb-puzzle sb-pairs${done ? ' solved' : ''}" data-mechanic-wire="radon"><div class="sb-two">${one(0)}${one(1)}</div>${told(word)}${bar}${status(say)}</div>`;
}

function renderPlayground(p, a) {
  const q = p.parameters, b = a.board, state = ui(p), moving = state.tool === 'move', chosen = state.chosen[0];
  const colours = Object.fromEntries(LETTERS.map((l, i) => [l, b.groups[i]])), now = splitOfColours(LETTERS, b.groups);
  const look = l => ({act: true, piece: `0:${l}`, focus: `sb-disc-0-${l}`, cls: moving && l === chosen ? 'chosen' : '', label: moving ? `${l}${l === chosen ? ', chosen' : '. Choose it'}` : `${l}, ${COLOURS[colours[l]]}`});
  const spot = moving ? pt => occupied(b.at, pt) ? null : {label: `${placeWords(pt)}. Move ${chosen} here`} : null;
  const main = drawBoard(q, b.at, {split: now, colours, look, spot});
  const tool = `<div class="sb-bar"><button type="button" class="secondary sb-button sb-tool" data-action="mechanic-ui" data-ui='${JSON.stringify({tool: moving ? 'colour' : 'move'})}' data-focus="sb-tool" aria-pressed="${moving}">Move</button></div>`;
  const say = `${colourWords(LETTERS, b.groups)} ${now && meetingSplits(b.at).includes(now) ? 'They meet.' : now ? 'They don’t meet.' : ''}${moving ? ` ${chosen} is chosen.` : ''}`;
  return `<div class="sb-puzzle sb-play" data-mechanic-wire="radon">${tool}<div class="sb-stage">${main}</div>${status(say)}</div>`;
}
function render(p, a) {
  const mode = p.parameters.mode;
  if (mode === 'every') return renderEvery(p, a);
  if (mode === 'place') return renderPlace(p, a);
  if (mode === 'locus') return renderLocus(p, a);
  if (mode === 'pair') return renderPair(p, a);
  return renderPlayground(p, a);
}

// How to play: the three kinds of band, as on the worksheet's key.
function help() {
  const q = {cols: 2, rows: 2};
  const pic = (pos, label) => {
    const h = hullOf(Object.values(pos)), colours = Object.fromEntries(Object.keys(pos).map(l => [l, 0]));
    return `<figure>${squareBoard(gridFor(q), {cls: 'sb-board sb-mini-board', label, picture: true, pad: .35, under: `${pips(q)}${bandSvg(q, h, 0, [0, 0], h.length === 1 ? ringAt(q, pos, Object.keys(pos), h[0], false) : null)}`, over: discs(q, pos, () => null, colours)})}</figure>`;
  };
  return `<div class="sb-help">${pic({A: [1, 1]}, 'One dot: its band is the dot')}${pic({A: [0, 0], B: [2, 1]}, 'Two dots: a segment')}${pic({A: [0, 0], B: [2, 0], C: [1, 2]}, 'Three dots: a filled triangle')}</div>`;
}

// --- Taps and keys ---------------------------------------------------------------
const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]};
// The point one step from `from`, skipping nothing: null off the board.
export function arrowPoint(q, from, key) {
  const d = ARROWS[key];
  if (!d) return null;
  const to = [from[0] + d[0], from[1] + d[1]];
  return isPoint(q, to) ? to : null;
}
function wire(root, p, api) {
  const q = p.parameters, now = () => api.attempt().board;
  // On a phone the boards reach the panel's edges (CSS reads --sb-bleed).
  const panel = root.closest('.board-panel'), puzzle = root.querySelector('.sb-puzzle') || root.closest('.sb-puzzle');
  if (panel && puzzle) puzzle.style.setProperty('--sb-bleed', `${parseFloat(getComputedStyle(panel).paddingLeft) || 0}px`);
  const keys = (el, action) => el.addEventListener('keydown', e => {
    if (!ARROWS[e.key] || e.altKey || e.ctrlKey || e.metaKey) return;
    const m = action(e.key);
    if (!m) return;
    e.preventDefault();
    api.apply(m);
  });
  if (q.mode === 'every') { wireSquare(root, gridFor(q), {piece: l => ({type: 'tap', label: l})}, api.apply); return; }
  if (q.mode === 'place') {
    wireSquare(root, gridFor(q), {point: k => ({type: 'put', at: pointOfIndex(q, k)})}, api.apply);
    keys(root, key => { const b = now(), to = arrowPoint(q, b.at, key); return to && !solved(p, b) ? {type: 'put', at: to} : null; });
    return;
  }
  if (q.mode === 'locus') { wireSquare(root, gridFor(q), {point: k => ({type: 'put', at: pointOfIndex(q, k)})}, api.apply); return; }
  if (q.mode === 'pair') {
    for (const half of root.querySelectorAll('[data-sb-board]')) {
      const k = Number(half.dataset.sbBoard);
      wireSquare(half, gridFor(q), {
        piece: id => { api.ui({board: k, chosen: id.split(':')[1]}); return null; },
        point: index => ({type: 'put', board: k, label: ui(p).chosen[k], at: pointOfIndex(q, index)})
      }, api.apply);
      keys(half, key => { const b = now(), l = ui(p).chosen[k], to = arrowPoint(q, b.boards[k][l], key); return to && !solved(p, b) && !occupied(b.boards[k], to) ? {type: 'put', board: k, label: l, at: to} : null; });
    }
    return;
  }
  wireSquare(root, gridFor(q), {
    piece: id => { const l = id.split(':')[1]; if (ui(p).tool === 'move') { api.ui({board: 0, chosen: l}); return null; } return {type: 'tap', label: l}; },
    point: index => ui(p).tool === 'move' ? {type: 'put', label: ui(p).chosen[0], at: pointOfIndex(q, index)} : null
  }, api.apply);
  keys(root, key => { const b = now(), l = ui(p).chosen[0], to = ui(p).tool === 'move' && arrowPoint(q, b.at[l], key); return to && !occupied(b.at, to) ? {type: 'put', label: l, at: to} : null; });
}

export const radonMechanics = {
  radon: {
    fresh, valid, solved, move, hint, render, wire, help,
    ui(p, payload) {
      if (!object(payload)) return;
      if ([0, 1].includes(payload.board) && LETTERS.includes(payload.chosen)) ui(p).chosen[payload.board] = payload.chosen;
      if (['colour', 'move'].includes(payload.tool)) ui(p).tool = payload.tool;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back colours, moves and shelving, never an answer: a refused
    // That's all or Check stays while the shelf or board is the same, and
    // places C has been tried stay tried.
    carry(p, from, to) {
      const mode = p.parameters.mode;
      if (!object(from) || !object(to)) return to;
      // A refused That's all stays while the shelf is the same.
      if (mode === 'every') return from.refused && JSON.stringify(from.shelf) === JSON.stringify(to.shelf) ? {...to, refused: from.refused, told: null, done: false} : {...to, told: null, done: false};
      // Places only ever join the record, so C's earlier place is in it.
      if (mode === 'locus') return {...to, found: from.found.map(x => [...x]), missed: from.missed.map(x => [...x]), more: from.more, done: false};
      if (mode === 'place' && from.refused && Array.isArray(from.at) && Array.isArray(to.at) && same(from.at, to.at)) return {...to, refused: true};
      if (mode === 'pair' && from.refused && JSON.stringify(from.boards) === JSON.stringify(to.boards)) return {...to, refused: true};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'radon',
  family: {id: 'radon', symbol: '⋈', area: 'geometry'},
  mechanics: radonMechanics,
  pack: new URL('./radon.json', import.meta.url).href,
  css: new URL('./radon.css', import.meta.url).href,
  focus: '.sb-disc[role=button],.sb-spot[role=button],.sb-button:not([disabled])'
};
