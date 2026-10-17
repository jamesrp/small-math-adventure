// Three-arm lines (worksheet Week 78, tropical lines). A line is a junction
// with three arms, east, north and south-west, running on for ever: the tie
// set of min(x − a, y − b, 0). The child moves junctions on a grid and
// presses a button to have the placement judged; nothing lights up while a
// junction moves. Four kinds of puzzle:
//
// - meet: A's line is fixed. Put B so the two lines share exactly a marked
//   point, or exactly a marked ray (Week 78 Problem 1, revised October 15).
// - through: put one junction so its line passes every circle (Problem 4).
//   With three circles it may be impossible; Can't then asks for two circles
//   whose fans of allowed junctions meet only at the child's own junction,
//   while the line from there misses the third circle.
// - every: two aligned circles. Mark every junction whose line passes both
//   (a ray running past the board), then That's all judges the marks as a
//   whole (Problem 5).
// - playground: two lines, both movable, with what they share drawn live.
//
// Points are stored in half-steps, so the arithmetic is exact (lines.js).
import {esc} from '../../expansion-controls.js';
import * as L from './lines.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isBool = v => typeof v === 'boolean';
export const MODES = ['meet', 'through', 'every', 'playground'];
export const MAX_MARKS = 24;

const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) { if (memo.size > 4000) memo.clear(); memo.set(key, make()); } return memo.get(key); };

// --- The window and its lattice --------------------------------------------
// q.win = [x0, y0, x1, y1] in half-steps; q.step is 2 (whole steps) or 1
// (half-steps, on Hard).
export const inWin = (q, p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && p[0] >= q.win[0] && p[0] <= q.win[2] && p[1] >= q.win[1] && p[1] <= q.win[3] && (p[0] - q.win[0]) % q.step === 0 && (p[1] - q.win[1]) % q.step === 0;
export const latticeOf = q => remember(`l|${q.win}|${q.step}`, () => {
  const out = [];
  for (let v = q.win[3]; v >= q.win[1]; v -= q.step) for (let u = q.win[0]; u <= q.win[2]; u += q.step) out.push([u, v]);
  return out;
});
const has = (list, p) => list.some(x => L.same(x, p));
const d2 = (p, r) => (p[0] - r[0]) ** 2 + (p[1] - r[1]) ** 2;
const nearest = (list, p) => list.reduce((top, x) => (!top || d2(x, p) < d2(top, p) ? x : top), null);

// --- Meet -------------------------------------------------------------------
// q.A is the fixed junction; q.goal is {kind: 'point', at} or {kind: 'ray',
// from, dir}. B solves when the lines share exactly that.
export function goalMet(q, B) {
  const m = L.meet(q.A, B), g = q.goal;
  if (g.kind === 'point') return m.kind === 'point' && L.same(m.at, g.at);
  return m.kind === 'ray' && m.dir === g.dir && L.same(m.from, g.from);
}
export const meetAnswers = q => remember(`m|${JSON.stringify([q.A, q.goal, q.win, q.step])}`, () => latticeOf(q).filter(B => goalMet(q, B)));

// --- Through ------------------------------------------------------------------
// The junction that passes every circle (a point), or null when none does.
export const throughAnswer = q => remember(`t|${JSON.stringify(q.targets)}`, () => L.junctionsFor(q.targets));
// A Can't claim taps two circles; the junction is the child's own. 'ok' when
// it proves no line passes every circle: both picked circles are on the line
// from J, no other junction passes both, and some circle is off that line.
export function judgeClaim(q, picks, J) {
  const missed = picks.find(i => !L.onLine(q.targets[i], J));
  if (missed !== undefined) return {why: 'misses', target: missed};
  if (L.fanMeet(q.targets[picks[0]], q.targets[picks[1]]).kind !== 'point') return {why: 'more'};
  return L.passesAll(J, q.targets) ? {why: 'way'} : {why: 'ok'};
}
// Every certificate: [pair, junction].
export const certificatesOf = q => remember(`c|${JSON.stringify(q.targets)}`, () => {
  const out = [], n = q.targets.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const m = L.fanMeet(q.targets[i], q.targets[j]);
    if (m.kind === 'point' && !L.passesAll(m.at, q.targets)) out.push({picks: [i, j], at: m.at});
  }
  return out;
});
const validPicks = (q, picks) => Array.isArray(picks) && picks.length === 2 && picks.every(Number.isInteger) && picks[0] >= 0 && picks[0] < picks[1] && picks[1] < q.targets.length;

// --- Every --------------------------------------------------------------------
// A mark is {from} (a point), {from, to} (the stretch between two lattice
// points along one of eight directions) or {from, dir} (a ray running on past
// the board).
export const answerRay = q => remember(`r|${JSON.stringify(q.targets)}`, () => L.junctionsFor(q.targets));
export function dirBetween(a, b) {
  const u = b[0] - a[0], v = b[1] - a[1];
  if ((!u && !v) || (u && v && Math.abs(u) !== Math.abs(v))) return null;
  return Object.keys(L.DIRS).find(k => L.DIRS[k][0] === Math.sign(u) && L.DIRS[k][1] === Math.sign(v));
}
export const markKey = m => (m.dir ? `r${m.from}${m.dir}` : m.to ? `s${m.from}>${m.to}` : `p${m.from}`);
export const sameMarks = (s, t) => s.length === t.length && s.every((m, i) => markKey(m) === markKey(t[i]));
export function covers(m, p) {
  if (m.dir) return L.onRay(p, m.from, m.dir);
  if (m.to) { const d = dirBetween(m.from, m.to), t = L.along(p, m.from, d); return t !== null && t <= L.along(m.to, m.from, d); }
  return L.same(m.from, p);
}
function validMark(q, m) {
  if (!object(m) || !inWin(q, m.from)) return false;
  const keys = Object.keys(m).sort().join();
  if (keys === 'from') return true;
  if (keys === 'from,to') return inWin(q, m.to) && dirBetween(m.from, m.to) !== null;
  return keys === 'dir,from' && L.isDir(m.dir);
}
const makeMark = m => (m.dir ? {from: [...m.from], dir: m.dir} : m.to ? {from: [...m.from], to: [...m.to]} : {from: [...m.from]});
// The points of a mark at the puzzle's step, in order (a ray up to n steps).
function markPoints(q, m, n = 40) {
  if (!m.dir && !m.to) return [m.from];
  const d = m.dir || dirBetween(m.from, m.to), [dx, dy] = L.DIRS[d], end = m.to ? L.along(m.to, m.from, d) : n * q.step, out = [];
  for (let t = 0; t <= end; t += q.step) out.push([m.from[0] + t * dx, m.from[1] + t * dy]);
  return out;
}
// Is the whole mark inside the answer ray R?
function inside(R, m) {
  if (m.dir) return m.dir === R.dir && L.onRay(m.from, R.from, R.dir);
  return L.onRay(m.from, R.from, R.dir) && (!m.to || L.onRay(m.to, R.from, R.dir));
}
// Do the marks (all inside R) cover all of it? Each mark is an interval of
// R's parameter; closed intervals cover [0, ∞) without a gap.
function coverage(R, marks) {
  const spans = marks.map(m => {
    const t = L.along(m.from, R.from, R.dir);
    if (m.dir) return [t, Infinity];
    const s = m.to ? L.along(m.to, R.from, R.dir) : t;
    return [Math.min(t, s), Math.max(t, s)];
  }).sort((x, y) => x[0] - y[0]);
  let reach = 0;
  if (!spans.length || spans[0][0] > 0) return false;
  for (const [a, b] of spans) { if (a > reach) return false; reach = Math.max(reach, b); }
  return reach === Infinity;
}
// That's all: null when the marks are exactly the junctions that work; else
// the first mark holding a junction that doesn't ({kind: 'off'}, with that
// junction, preferring one on the board, and a circle its line misses), or
// {kind: 'more'}.
export function judgeMarks(q, marks) {
  return remember(`j|${JSON.stringify([q.targets, q.win, q.step, marks.map(markKey)])}`, () => {
    const R = answerRay(q);
    for (let i = 0; i < marks.length; i++) {
      if (inside(R, marks[i])) continue;
      const bad = markPoints(q, marks[i]).filter(p => !L.onRay(p, R.from, R.dir));
      const at = bad.find(p => p[0] >= q.win[0] && p[0] <= q.win[2] && p[1] >= q.win[1] && p[1] <= q.win[3]) || bad[0];
      return {kind: 'off', mark: i, at, miss: q.targets.findIndex(T => !L.onLine(T, at))};
    }
    return coverage(R, marks) ? null : {kind: 'more'};
  });
}

// --- Boards ---------------------------------------------------------------------
// meet:       {at, refused, said, done}
// through:    {at, tried, checked, claimed, said, cert, done}
// every:      {at, marks, lock, said, done}
// playground: {a, b}
// `said` is what the board shows about the last claim (Undo takes it back);
// `refused`, `checked`, `claimed` and `lock` are the refusals themselves,
// which Undo keeps (carry) until the junction moves or the marks change.
const KEYS = {meet: 'at,done,refused,said', through: 'at,cert,checked,claimed,done,said,tried', every: 'at,done,lock,marks,said', playground: 'a,b'};
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {a: [...q.start[0]], b: [...q.start[1]]};
  if (q.mode === 'meet') return {at: [...q.start], refused: false, said: false, done: false};
  if (q.mode === 'through') return {at: [...q.start], tried: false, checked: false, claimed: false, said: null, cert: null, done: false};
  return {at: [...q.start], marks: [], lock: null, said: false, done: false};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || Object.keys(b).sort().join() !== KEYS[q.mode]) return false;
  if (q.mode === 'playground') return inWin(q, b.a) && inWin(q, b.b);
  if (!inWin(q, b.at) || !isBool(b.done)) return false;
  if (q.mode === 'meet') {
    if (!isBool(b.refused) || !isBool(b.said)) return false;
    const right = goalMet(q, b.at);
    if (b.refused && right) return false;
    if (b.said && !b.refused) return false;
    return !b.done || (right && !b.said);
  }
  if (q.mode === 'through') {
    if (![b.tried, b.checked, b.claimed].every(isBool)) return false;
    if (!b.tried && !L.same(b.at, q.start)) return false;
    const right = L.passesAll(b.at, q.targets);
    if (b.checked && right) return false;
    if (b.claimed && (!q.cant || !b.tried)) return false;
    if (b.said !== null) {
      if (b.done) return false;
      if (b.said === 'check') { if (!b.checked) return false; }
      else if (!(b.claimed && validPicks(q, b.said) && judgeClaim(q, b.said, b.at).why !== 'ok')) return false;
    }
    if (b.cert !== null) {
      if (!q.cant || !b.done || !b.tried || b.claimed || !validPicks(q, b.cert) || judgeClaim(q, b.cert, b.at).why !== 'ok') return false;
      return true;
    }
    return !b.done || right;
  }
  // every
  if (!Array.isArray(b.marks) || b.marks.length > MAX_MARKS || !b.marks.every(m => validMark(q, m)) || !isBool(b.said)) return false;
  if (new Set(b.marks.map(markKey)).size !== b.marks.length) return false;
  if (b.lock !== null && !(Array.isArray(b.lock) && b.lock.length && b.lock.length <= MAX_MARKS && b.lock.every(m => validMark(q, m)) && judgeMarks(q, b.lock) !== null)) return false;
  if (b.said && !(b.lock && sameMarks(b.lock, b.marks))) return false;
  return !b.done || (b.marks.length > 0 && !b.said && judgeMarks(q, b.marks) === null);
}
function solved(p, b) {
  return p.parameters.mode !== 'playground' && valid(p, b) && b.done;
}

// What the buttons may do now.
export const canCheck = (q, b) => !b.done && !(q.mode === 'meet' ? b.refused : b.checked);
export const canClaim = (q, b) => q.mode === 'through' && q.cant && !b.done && b.tried && !b.claimed;
export const coveredAt = b => b.marks.some(m => covers(m, b.at));
export const canAll = b => !b.done && b.marks.length > 0 && !(b.lock && sameMarks(b.lock, b.marks));

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'playground') {
    if (action.type !== 'put' || !['a', 'b'].includes(action.which) || !inWin(q, action.at) || L.same(action.at, b[action.which])) return null;
    return {...b, [action.which]: [...action.at]};
  }
  if (action.type === 'put') {
    if (!inWin(q, action.at) || L.same(action.at, b.at)) return null;
    if (q.mode === 'meet') return {at: [...action.at], refused: false, said: false, done: false};
    if (q.mode === 'through') return {at: [...action.at], tried: true, checked: false, claimed: false, said: null, cert: null, done: false};
    return {...b, at: [...action.at]};
  }
  if (q.mode === 'meet') {
    if (action.type !== 'check' || !canCheck(q, b)) return null;
    return goalMet(q, b.at) ? {...b, done: true} : {...b, refused: true, said: true};
  }
  if (q.mode === 'through') {
    if (action.type === 'check') {
      if (!canCheck(q, b)) return null;
      return L.passesAll(b.at, q.targets) ? {...b, said: null, done: true} : {...b, checked: true, said: 'check'};
    }
    if (action.type === 'cant') {
      if (!canClaim(q, b) || !Array.isArray(action.picks)) return null;
      const picks = [...action.picks].sort((x, y) => x - y);
      if (!validPicks(q, picks)) return null;
      return judgeClaim(q, picks, b.at).why === 'ok' ? {...b, said: null, cert: picks, done: true} : {...b, claimed: true, said: picks};
    }
    return null;
  }
  // every
  if (action.type === 'keep') {
    if (coveredAt(b) || b.marks.length >= MAX_MARKS) return null;
    return {...b, marks: [...b.marks, {from: [...b.at]}], said: false};
  }
  if (action.type === 'drop') {
    if (!coveredAt(b)) return null;
    return {...b, marks: b.marks.filter(m => !covers(m, b.at)), said: false};
  }
  if (action.type === 'mark') {
    const m = makeMark(action);
    if (!validMark(q, m) || b.marks.length >= MAX_MARKS || b.marks.some(x => markKey(x) === markKey(m))) return null;
    return {...b, marks: [...b.marks, m], said: false};
  }
  if (action.type === 'all') {
    if (!canAll(b)) return null;
    return judgeMarks(q, b.marks) === null ? {...b, said: false, done: true} : {...b, lock: b.marks.map(makeMark), said: true};
  }
  return null;
}

// --- Words ------------------------------------------------------------------------
const half = h => { const whole = Math.trunc(h / 2), part = h % 2 ? '½' : ''; return h < 0 ? `−${Math.abs(whole) || ''}${part}` : `${whole || (part ? '' : 0)}${part}`; };
export const placeWords = z => `${half(z[0])} across, ${half(z[1])} up`;
const DIR_WORDS = {E: 'right', W: 'left', N: 'up', S: 'down', NE: 'up and to the right', SW: 'down and to the left', NW: 'up and to the left', SE: 'down and to the right'};
const list = items => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
// Where junction J sits from a point T on its line: T on its east arm puts J
// left of T, on its north arm below T, on its south-west arm up and right.
export function relWords(T, J, name) {
  if (L.same(T, J)) return `on ${name}`;
  const arm = L.armsThrough(T, J)[0];
  return arm === 'E' ? `left of ${name}` : arm === 'N' ? `below ${name}` : `up and to the right of ${name}`;
}
const nameOf = (q, i) => q.names[i];
const meetWords = (q, m) => {
  if (m.kind === 'line') return 'They share everything.';
  if (q.goal.kind === 'point') return m.kind === 'point' ? 'They meet somewhere else.' : 'They share a whole stretch.';
  return m.kind === 'point' ? 'They share only one point.' : 'They share a different stretch.';
};
const CLAIM_WORDS = {misses: (q, w) => `The line misses ${nameOf(q, w.target)}.`, more: (q, w, picks) => `Other junctions pass ${nameOf(q, picks[0])} and ${nameOf(q, picks[1])} too.`, way: () => 'There is a way.'};

// --- Hints --------------------------------------------------------------------------
// Each names one move; the second level marks it on the board, the third
// plays it. Before any move the card shows the puzzle's first authored hint.
const RAY_IDEA = {
  N: 'Two junctions in one column share the up arm of the higher one.',
  E: 'Two junctions in one row share the right arm of the right-hand one.',
  SW: 'Two junctions on one rising diagonal share the slanting arm of the lower one.'
};
function meetHint(q, b) {
  if (goalMet(q, b.at)) return {action: {type: 'check'}, text: 'Press Check.'};
  // A point: which arm of B reaches the ring (B below it, left of it, or up
  // and to the right of it). A stretch: the idea, with the place on the ring.
  const B = nearest(meetAnswers(q), b.at);
  const text = q.goal.kind === 'ray' ? RAY_IDEA[q.goal.dir] : `Put B ${relWords(q.goal.at, B, 'the ring')}.`;
  return {action: {type: 'put', at: B}, text};
}
// Two circles on different arms of X, to describe where X is.
function twoFor(q, X) {
  const arms = q.targets.map(T => (L.same(T, X) ? 'J' : L.armsThrough(T, X)[0]));
  for (let i = 0; i < arms.length; i++) for (let j = i + 1; j < arms.length; j++) if (arms[i] && arms[j] && arms[i] !== arms[j]) return [i, j];
  return [0, 1];
}
const putText = (q, X, pair) => `Put the junction ${relWords(q.targets[pair[0]], X, nameOf(q, pair[0]))} and ${relWords(q.targets[pair[1]], X, nameOf(q, pair[1]))}.`;
function throughHint(q, b) {
  const X = throughAnswer(q);
  if (X) {
    if (L.passesAll(b.at, q.targets)) return {action: {type: 'check'}, text: 'Press Check.'};
    return {action: {type: 'put', at: X.at}, text: putText(q, X.at, twoFor(q, X.at))};
  }
  // No line passes every circle: try the one junction two circles allow,
  // then give the reason with Can't.
  const certs = certificatesOf(q), here = certs.find(c => L.same(c.at, b.at));
  if (here && b.tried) {
    if (b.claimed) {
      const away = latticeOf(q).find(z => d2(z, b.at) === q.step * q.step);
      return {action: {type: 'put', at: away}, text: 'Move the junction off this point, then back.'};
    }
    const [i, j] = here.picks, others = q.targets.map((_, k) => k).filter(k => k !== i && k !== j && !L.onLine(q.targets[k], b.at));
    return {action: {type: 'cant', picks: here.picks}, text: `Only this junction’s line passes ${nameOf(q, i)} and ${nameOf(q, j)}, and it misses ${list(others.map(k => nameOf(q, k)))}. Press Can’t, then tap ${nameOf(q, i)} and ${nameOf(q, j)}.`};
  }
  const c = here || certs.reduce((top, x) => (!top || d2(x.at, b.at) < d2(top.at, b.at) ? x : top), null);
  if (L.same(c.at, b.at)) return {action: {type: 'put', at: latticeOf(q).find(z => d2(z, b.at) === q.step * q.step)}, text: 'Move the junction to try it.'};
  return {action: {type: 'put', at: c.at}, text: putText(q, c.at, c.picks)};
}
function everyHint(q, b) {
  const R = answerRay(q), bad = b.marks.findIndex(m => !inside(R, m));
  if (bad >= 0) {
    if (covers(b.marks[bad], b.at)) return {action: {type: 'drop'}, text: 'A junction on this mark misses a circle. Press Drop.'};
    return {action: {type: 'put', at: b.marks[bad].from}, text: 'One mark holds a junction whose line misses a circle. Move the junction onto it.'};
  }
  const start = q.targets.findIndex(T => L.same(T, R.from)), name = start >= 0 ? nameOf(q, start) : 'the first junction that works';
  if (!coverage(R, b.marks)) {
    if (!L.same(b.at, R.from)) return {action: {type: 'put', at: R.from}, text: `Put the junction on ${name}.`};
    return {action: {type: 'mark', from: R.from, dir: R.dir}, text: `Every junction further ${DIR_WORDS[R.dir]} works too, between dots and past the edge. Slide from ${name} ${DIR_WORDS[R.dir]}, off the board.`};
  }
  return {action: {type: 'all'}, text: 'Press That’s all.'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return remember(`h|${p.id}|${JSON.stringify(b)}`, () => {
    const h = q.mode === 'meet' ? meetHint(q, b) : q.mode === 'through' ? throughHint(q, b) : everyHint(q, b);
    return {type: 'move', action: h.action, text: h.text};
  });
}

// --- View state ---------------------------------------------------------------------
// Can't and its picks, the playground's chosen junction and a stroke being
// drawn are view state, outside the save.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {claiming: false, picks: [], chosen: 'b'}); return uiState.get(p.id); }

// --- Drawing ------------------------------------------------------------------------
// The board is in half-steps scaled by 5 (a grid square is 10 units), with y
// turned up: the point [u, v] is drawn at (5u, −5v). Arms run past the frame
// to an arrowhead in the margin.
const SCALE = 5, OVER = 1.1, MARGIN = 1.6;
const f = n => Number(n.toFixed(2));
const X = u => f(u * SCALE), Y = v => f(-v * SCALE);
// Where the ray from s in direction d leaves the frame grown by `over`.
function exitOf(q, s, d, over = OVER) {
  const [dx, dy] = L.DIRS[d], ts = [];
  if (dx) ts.push(((dx > 0 ? q.win[2] + over : q.win[0] - over) - s[0]) / dx);
  if (dy) ts.push(((dy > 0 ? q.win[3] + over : q.win[1] - over) - s[1]) / dy);
  const t = Math.max(0, Math.min(...ts));
  return [s[0] + t * dx, s[1] + t * dy];
}
// A ray drawn to the margin with an arrowhead; `cls` colours it.
function raySvg(q, s, d, cls) {
  const end = exitOf(q, s, d), [dx, dy] = L.DIRS[d], n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
  const head = 3.6, wide = 2.1, ex = X(end[0]), ey = Y(end[1]), bx = ex - ux * head, by = ey + uy * head;
  const line = Math.hypot(end[0] - s[0], end[1] - s[1]) * SCALE > head ? `<line class="tr-ray ${cls}" x1="${X(s[0])}" y1="${Y(s[1])}" x2="${f(bx + ux * 0.6)}" y2="${f(by - uy * 0.6)}"/>` : '';
  return `${line}<path class="tr-head ${cls}" d="M${f(ex)} ${f(ey)}L${f(bx - uy * wide)} ${f(by - ux * wide)}L${f(bx + uy * wide)} ${f(by + ux * wide)}Z"/>`;
}
const segSvg = (a, b, cls) => `<line class="${cls}" x1="${X(a[0])}" y1="${Y(a[1])}" x2="${X(b[0])}" y2="${Y(b[1])}"/>`;
const dot = (z, r, cls) => `<circle class="${cls}" cx="${X(z[0])}" cy="${Y(z[1])}" r="${r}"/>`;
// A whole line: three arms and the junction.
export const lineSvg = (q, J, cls) => `<g class="tr-line ${cls}">${L.ARMS.map(d => raySvg(q, J, d, cls)).join('')}${dot(J, 2.6, `tr-junction ${cls}`)}</g>`;
// A target's fan of allowed junctions.
const fanSvg = (q, T, cls) => `<g class="tr-fan ${cls}">${L.FAN.map(d => raySvg(q, T, d, cls)).join('')}</g>`;
// A name sits up and to the left of its point: no line through a point runs
// that way (arms run along rows, columns and rising diagonals), and no goal
// is there.
const LABEL = [-1.1, 0.95];
const label = (z, text, cls = '') => `<text class="tr-name ${cls}" x="${f(X(z[0]) + LABEL[0] * SCALE)}" y="${f(Y(z[1]) - LABEL[1] * SCALE + 2.15)}">${esc(text)}</text>`;
function paper(q) {
  const [x0, y0, x1, y1] = q.win, lines = [];
  for (let u = x0; u <= x1; u++) if (u % 2 === 0 || q.step === 1) lines.push(`<line class="tr-grid${u % 2 ? ' half' : ''}" x1="${X(u)}" y1="${Y(y0)}" x2="${X(u)}" y2="${Y(y1)}"/>`);
  for (let v = y0; v <= y1; v++) if (v % 2 === 0 || q.step === 1) lines.push(`<line class="tr-grid${v % 2 ? ' half' : ''}" x1="${X(x0)}" y1="${Y(v)}" x2="${X(x1)}" y2="${Y(v)}"/>`);
  return `<rect class="tr-paper" x="${X(x0)}" y="${Y(y1)}" width="${X(x1 - x0)}" height="${X(y1 - y0)}"/>${lines.join('')}<rect class="tr-frame" x="${X(x0)}" y="${Y(y1)}" width="${X(x1 - x0)}" height="${X(y1 - y0)}"/>`;
}
const viewBox = (q, margin = MARGIN) => `${X(q.win[0] - margin)} ${Y(q.win[3] + margin)} ${X(q.win[2] - q.win[0] + 2 * margin)} ${X(q.win[3] - q.win[1] + 2 * margin)}`;
// What two lines share, drawn in `cls`.
function sharedSvg(q, m, A, cls) {
  if (m.kind === 'point') return dot(m.at, 4.6, `tr-ring ${cls}`);
  if (m.kind === 'ray') return `<g class="tr-shared ${cls}">${raySvg(q, m.from, m.dir, `tr-thick ${cls}`)}</g>`;
  return `<g class="tr-shared ${cls}">${L.ARMS.map(d => raySvg(q, A, d, `tr-thick ${cls}`)).join('')}</g>`;
}
function marksSvg(q, marks, cls = '') {
  return marks.map(m => m.dir ? raySvg(q, m.from, m.dir, `tr-mark ${cls}`) : m.to ? segSvg(m.from, m.to, `tr-mark ${cls}`) : dot(m.from, 4.4, `tr-mark-dot ${cls}`)).join('');
}
const targetSvg = (q, i, cls = '') => `<g class="tr-target ${cls}" data-target="${i}">${dot(q.targets[i], 2.9, 'tr-circle')}${label(q.targets[i], q.names[i])}</g>`;
const ringAt = (z, cls) => dot(z, 4.4, `tr-ring ${cls}`);

function boardSvg(q, inner, opt) {
  return `<svg class="tr-board" viewBox="${viewBox(q)}" data-tr-board tabindex="0" role="group" aria-label="${esc(opt.label)}" data-focus="tr-board">${paper(q)}${inner}<g class="tr-preview"></g></svg>`;
}

// What the screen reader hears.
const targetWords = q => q.targets.map((T, i) => `${q.names[i]} at ${placeWords(T)}`).join('; ');
const status = text => `<p class="sr-only" role="status">${esc(text)}</p>`;
const told = text => (text ? `<p class="tr-told">${esc(text)}</p>` : '');
const moveButton = (label, action, enabled, hinted) => `<button type="button" class="secondary tr-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="tr-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const bar = buttons => `<div class="tr-bar">${buttons.join('')}</div>`;
const hintRing = act => (act?.type === 'put' ? ringAt(act.at, 'tr-hint') : act?.type === 'mark' ? `${ringAt(act.from, 'tr-hint')}${raySvg(act.q, act.from, act.dir, 'tr-hint-ray')}` : '');

function renderMeet(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const act = a.hintLevel >= 2 && !done ? hint(p, b).action : null, m = L.meet(q.A, b.at);
  const goal = q.goal.kind === 'point' ? ringAt(q.goal.at, 'tr-goal') : `<g class="tr-goal-ray">${raySvg(q, q.goal.from, q.goal.dir, 'tr-goal')}${dot(q.goal.from, 2.4, 'tr-goal-start')}</g>`;
  const result = done ? sharedSvg(q, m, q.A, 'good') : b.said ? sharedSvg(q, m, q.A, 'bad') : '';
  const inner = `${goal}${lineSvg(q, q.A, 'tr-a')}<g class="tr-mover">${lineSvg(q, b.at, 'tr-b')}</g>${result}${label(q.A, 'A', 'tr-a')}${label(b.at, 'B', 'tr-b tr-b-name')}${hintRing(act && {...act, q})}`;
  const svg = boardSvg(q, inner, {label: 'Two lines, A and B'});
  const word = b.said ? meetWords(q, m) : '';
  const say = `A at ${placeWords(q.A)}. B at ${placeWords(b.at)}. ${q.goal.kind === 'point' ? `The ring is at ${placeWords(q.goal.at)}.` : `The dashed stretch starts at ${placeWords(q.goal.from)} and runs ${DIR_WORDS[q.goal.dir]}.`}${word ? ` ${word}` : ''}${act?.type === 'put' ? ` Hint: B to ${placeWords(act.at)}.` : ''}`;
  const buttons = done ? '' : bar([moveButton('Check', {type: 'check'}, canCheck(q, b), act?.type === 'check')]);
  return `<div class="tr-puzzle mode-meet${done ? ' solved' : ''}" data-mechanic-wire="tropical">${svg}${told(word)}${buttons}${status(say)}</div>`;
}

function renderThrough(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  const act = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const claiming = !done && state.claiming && canClaim(q, b);
  const refused = Array.isArray(b.said) ? b.said : null, why = refused ? judgeClaim(q, refused, b.at) : null;
  let extra = '';
  if (b.cert) {
    // The argument: the two picked circles' fans meet only at the junction,
    // and the line from there misses the other circles.
    const others = q.targets.map((_, k) => k).filter(k => !b.cert.includes(k));
    extra = `${others.map(k => fanSvg(q, q.targets[k], 'tr-fan-off')).join('')}${b.cert.map(k => fanSvg(q, q.targets[k], 'tr-fan-on')).join('')}${ringAt(b.at, 'good')}${others.filter(k => !L.onLine(q.targets[k], b.at)).map(k => ringAt(q.targets[k], 'bad')).join('')}`;
  } else if (done) extra = q.targets.map(T => ringAt(T, 'good')).join('');
  else if (b.said === 'check') extra = q.targets.filter(T => !L.onLine(T, b.at)).map(T => ringAt(T, 'bad')).join('');
  else if (refused) extra = refused.map(k => ringAt(q.targets[k], 'bad')).join('');
  const picks = claiming ? q.targets.map((T, i) => `<g class="tr-pick${state.picks.includes(i) ? ' picked' : ''}" role="button" tabindex="0" data-pick="${i}" data-focus="tr-pick-${i}" aria-label="${esc(q.names[i])}${state.picks.includes(i) ? ', chosen' : ''}">${dot(T, 5.2, 'tr-pick-ring')}</g>`).join('') : '';
  const hinted = act?.type === 'cant' ? act.picks.map(k => ringAt(q.targets[k], 'tr-hint')).join('') : hintRing(act && {...act, q});
  const inner = `${extra}<g class="tr-mover">${lineSvg(q, b.at, `tr-j${done ? ' good' : ''}`)}</g>${q.targets.map((_, i) => targetSvg(q, i)).join('')}${hinted}${picks}`;
  const svg = boardSvg(q, inner, {label: 'Circles and a line'});
  const missed = q.targets.map((T, i) => (L.onLine(T, b.at) ? null : q.names[i])).filter(Boolean);
  const word = b.said === 'check' ? `The line misses ${list(missed)}.` : refused ? CLAIM_WORDS[why.why](q, why, refused) : claiming ? 'Tap two circles.' : '';
  let buttons = '';
  if (!done) {
    const cant = q.cant ? `<button type="button" class="secondary tr-button tr-cant${act?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="tr-cant" aria-pressed="${claiming}" ${canClaim(q, b) ? '' : 'disabled'}>Can’t</button>` : '';
    buttons = bar([moveButton('Check', {type: 'check'}, canCheck(q, b) && !claiming, act?.type === 'check'), cant]);
  }
  const say = `Junction at ${placeWords(b.at)}. Circles: ${targetWords(q)}.${word ? ` ${word}` : ''}${act?.type === 'put' ? ` Hint: the junction to ${placeWords(act.at)}.` : ''}`;
  return `<div class="tr-puzzle mode-through${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="tropical">${svg}${told(word)}${buttons}${status(say)}</div>`;
}

function renderEvery(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const act = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const verdict = b.said ? judgeMarks(q, b.marks) : null;
  let extra = '';
  if (verdict?.kind === 'off') extra = `${marksSvg(q, [b.marks[verdict.mark]], 'bad')}${lineSvg(q, verdict.at, 'tr-off')}${ringAt(q.targets[verdict.miss], 'bad')}`;
  const inner = `${marksSvg(q, b.marks, done ? 'good' : '')}${extra}<g class="tr-mover">${lineSvg(q, b.at, 'tr-j')}</g>${q.targets.map((_, i) => targetSvg(q, i)).join('')}${hintRing(act && {...act, q})}`;
  const svg = boardSvg(q, inner, {label: 'Circles, a line and your marks'});
  const word = verdict ? (verdict.kind === 'off' ? 'This one doesn’t work.' : 'There are more.') : '';
  const on = coveredAt(b);
  const buttons = done ? '' : bar([
    moveButton('Keep', {type: 'keep'}, !on && b.marks.length < MAX_MARKS, act?.type === 'keep'),
    moveButton('Drop', {type: 'drop'}, on, act?.type === 'drop'),
    moveButton('That’s all', {type: 'all'}, canAll(b), act?.type === 'all')
  ]);
  const markWords = m => (m.dir ? `from ${placeWords(m.from)} on ${DIR_WORDS[m.dir]} past the edge` : m.to ? `from ${placeWords(m.from)} to ${placeWords(m.to)}` : placeWords(m.from));
  const say = `Junction at ${placeWords(b.at)}. Circles: ${targetWords(q)}. ${b.marks.length ? `Marks: ${b.marks.map(markWords).join('; ')}.` : 'No marks.'}${word ? ` ${word}` : ''}${act?.type === 'put' ? ` Hint: the junction to ${placeWords(act.at)}.` : act?.type === 'mark' ? ` Hint: mark from ${placeWords(act.from)} on ${DIR_WORDS[act.dir]}.` : ''}`;
  return `<div class="tr-puzzle mode-every${done ? ' solved' : ''}" data-mechanic-wire="tropical">${svg}${told(word)}${buttons}${status(say)}</div>`;
}

function renderPlayground(p, a) {
  const q = p.parameters, b = a.board, state = ui(p), m = L.meet(b.a, b.b);
  const inner = `<g class="tr-shared-live">${sharedSvg(q, m, b.a, 'good')}</g><g class="tr-mover-a">${lineSvg(q, b.a, `tr-a${state.chosen === 'a' ? ' chosen' : ''}`)}</g><g class="tr-mover-b">${lineSvg(q, b.b, `tr-b${state.chosen === 'b' ? ' chosen' : ''}`)}</g>${label(b.a, 'A', 'tr-a tr-a-name')}${label(b.b, 'B', 'tr-b tr-b-name')}`;
  const svg = boardSvg(q, inner, {label: 'Two lines, A and B'});
  const shared = m.kind === 'point' ? `They share one point, ${placeWords(m.at)}.` : m.kind === 'ray' ? `They share the stretch from ${placeWords(m.from)} on ${DIR_WORDS[m.dir]}.` : 'They share everything.';
  return `<div class="tr-puzzle mode-playground" data-mechanic-wire="tropical">${svg}${status(`A at ${placeWords(b.a)}, B at ${placeWords(b.b)}. ${shared} ${state.chosen.toUpperCase()} is chosen.`)}</div>`;
}
function render(p, a) {
  const mode = p.parameters.mode;
  if (mode === 'meet') return renderMeet(p, a);
  if (mode === 'through') return renderThrough(p, a);
  if (mode === 'every') return renderEvery(p, a);
  return renderPlayground(p, a);
}

// How to play: two small pictures, from the worksheet's page 1. A line with
// a point on it and a point off it, and two lines sharing one point.
function help(p) {
  const small = {win: [0, 0, 10, 10], step: 2};
  const one = `<svg class="tr-board tr-picture" viewBox="${viewBox(small, 1.4)}" role="img" aria-label="A line with its junction at 2 across, 2 up. P, at 4 across, 2 up, is on its right arm. Q, at 4 across, 4 up, is not on the line.">${paper(small)}${lineSvg(small, [4, 4], 'tr-j')}${dot([8, 4], 2.9, 'tr-circle tr-on')}${label([8, 4], 'P')}${dot([8, 8], 2.9, 'tr-circle tr-off')}${label([8, 8], 'Q')}</svg>`;
  const wide = {win: [0, 0, 16, 14], step: 2};
  const two = `<svg class="tr-board tr-picture" viewBox="${viewBox(wide, 1.4)}" role="img" aria-label="Line A with its junction at 1 across, 4 up and line B with its junction at 4 across, 2 up. They share only the point 4 across, 4 up.">${paper(wide)}${lineSvg(wide, [2, 8], 'tr-a')}${lineSvg(wide, [8, 4], 'tr-b')}${ringAt([8, 8], 'good')}${label([2, 8], 'A', 'tr-a')}${label([8, 4], 'B', 'tr-b')}</svg>`;
  const pictures = p.parameters.mode === 'meet' || p.parameters.mode === 'playground' ? [[one, 'P is on the line; Q is not.'], [two, 'These two lines share one point.']] : [[one, 'P is on the line; Q is not.']];
  return `<div class="tr-help" data-mechanic-wire="tropical">${pictures.map(([svg, caption]) => `<figure>${svg}<figcaption>${caption}</figcaption></figure>`).join('')}</div>`;
}

// --- Taps, drags, strokes and keys ------------------------------------------------
// A tap where grid lines cross moves the junction there. Dragging moves it
// with the finger (on a touch screen it rides above the finger), and the
// release is one move. In every puzzles a slide instead marks the stretch
// from where it starts, and a slide off the board marks a ray. After Can't,
// a tap on a circle picks it, and a tap elsewhere moves the junction.
let gesture = null, listening = false;
const boardAt = (svg, x, y) => {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const r = pt.matrixTransform(m.inverse());
  return [r.x / SCALE, -r.y / SCALE];
};
const clampTo = (q, z) => [Math.max(q.win[0], Math.min(q.win[2], z[0])), Math.max(q.win[1], Math.min(q.win[3], z[1]))];
export const snap = (q, z) => clampTo(q, z.map((c, k) => q.win[k] + Math.round((c - q.win[k]) / q.step) * q.step));
// A tap on a circle's letter goes to the circle.
const LABEL_HIT = [LABEL[0], LABEL[1], 0.6, 0.6];
function labelTarget(q, z) {
  if (!q.targets) return -1;
  return q.targets.findIndex(T => Math.abs(z[0] - T[0] - LABEL_HIT[0]) <= LABEL_HIT[2] && Math.abs(z[1] - T[1] - LABEL_HIT[1]) <= LABEL_HIT[3]);
}
// The stroke from s to the pointer at z: the nearest of eight directions, a
// whole number of steps along it, and a ray once the pointer is past the
// frame.
export function strokeOf(q, s, z) {
  const v = [z[0] - s[0], z[1] - s[1]];
  if (Math.hypot(...v) < 0.6) return null;
  const angle = Math.atan2(v[1], v[0]), k = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
  const d = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][k], [dx, dy] = L.DIRS[d];
  const out = z[0] < q.win[0] - 0.6 || z[0] > q.win[2] + 0.6 || z[1] < q.win[1] - 0.6 || z[1] > q.win[3] + 0.6;
  if (out) return {from: s, dir: d};
  let n = Math.round((dx && dy ? (v[0] * dx + v[1] * dy) / 2 : v[0] * dx + v[1] * dy) / q.step);
  while (n > 0 && !inWin(q, [s[0] + n * q.step * dx, s[1] + n * q.step * dy])) n--;
  return n > 0 ? {from: s, to: [s[0] + n * q.step * dx, s[1] + n * q.step * dy]} : null;
}
const LIFT = 2.4;
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 10) g.moved = true;
  if (!g.moved || g.kind === 'tap') return;
  const z = boardAt(g.svg, e.clientX, e.clientY - g.lift);
  if (!z) return;
  const q = g.q;
  if (g.kind === 'stroke') {
    g.stroke = strokeOf(q, g.start, z);
    const layer = g.svg.querySelector('.tr-preview');
    if (layer) layer.innerHTML = g.stroke ? (g.stroke.dir ? raySvg(q, g.stroke.from, g.stroke.dir, 'tr-mark tr-drawing') : segSvg(g.stroke.from, g.stroke.to, 'tr-mark tr-drawing')) : dot(g.start, 4.4, 'tr-mark-dot tr-drawing');
    return;
  }
  const at = snap(q, z);
  if (g.at && L.same(at, g.at)) return;
  g.at = at;
  const layer = g.svg.querySelector(g.layer);
  if (layer) layer.innerHTML = lineSvg(q, at, g.cls);
  if (g.which) {
    const b = g.api.attempt().board, other = g.which === 'a' ? b.b : b.a;
    g.svg.querySelector('.tr-shared-live').innerHTML = sharedSvg(q, L.meet(g.which === 'a' ? at : other, g.which === 'a' ? other : at), g.which === 'a' ? at : other, 'good');
    g.svg.querySelectorAll(`.tr-${g.which}-name`).forEach(t => t.remove());
  } else g.svg.querySelectorAll('.tr-b-name').forEach(t => t.remove());
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  if (e.type !== 'pointerup') { g.api.ui({}); return; }
  if (g.kind === 'stroke' && g.moved) {
    if (g.stroke) g.api.apply({type: 'mark', ...g.stroke}); else g.api.ui({});
    return;
  }
  if (g.moved) {
    const b = g.api.attempt().board, from = g.which ? b[g.which] : b.at;
    if (g.at && !L.same(g.at, from)) g.api.apply(g.which ? {type: 'put', which: g.which, at: g.at} : {type: 'put', at: g.at}); else g.api.ui({});
    return;
  }
  g.tap();
}
function wire(root, p, given) {
  const svg = root.querySelector('[data-tr-board]'), q = p.parameters;
  if (!svg) return;
  // Moving the junction ends a Can't half-way through its taps.
  const api = {...given, apply: action => { if (action.type === 'put') Object.assign(ui(p), {claiming: false, picks: []}); given.apply(action); }};
  // On a phone the board reaches the panel's edges (CSS reads --tr-bleed).
  const panel = svg.closest('.board-panel');
  if (panel) root.style.setProperty('--tr-bleed', `${parseFloat(getComputedStyle(panel).paddingLeft) || 0}px`);
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  const now = () => api.attempt().board;
  const pick = i => {
    const state = ui(p), others = state.picks.filter(k => k !== i);
    if (state.picks.includes(i)) { api.ui({picks: others}); return; }
    if (others.length === 1) { api.apply({type: 'cant', picks: [others[0], i]}); return; }
    api.ui({picks: [i]});
  };
  // What a tap at the board point z does.
  const tapAt = z => {
    const b = now();
    if (q.mode !== 'playground' && solved(p, b)) return;
    const state = ui(p), labelled = labelTarget(q, z), at = labelled >= 0 ? q.targets[labelled] : snap(q, z);
    if (q.mode === 'playground') {
      const hit = ['a', 'b'].find(w => d2(b[w], z) <= 1.2);
      if (hit) { api.ui({chosen: hit}); return; }
      if (!L.same(at, b[state.chosen])) api.apply({type: 'put', which: state.chosen, at});
      return;
    }
    // After Can't, a tap on a circle (its ring or its letter) picks it.
    if (q.mode === 'through' && state.claiming && canClaim(q, b)) {
      const near = q.targets.map((T, i) => [i, d2(T, z)]).filter(([, d]) => d <= 1.25).sort((x, y) => x[1] - y[1])[0];
      const i = labelled >= 0 ? labelled : near ? near[0] : -1;
      if (i >= 0) { pick(i); return; }
    }
    if (!L.same(at, b.at)) api.apply({type: 'put', at}); else if (state.claiming) api.ui({claiming: false});
  };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const b = now();
    if (q.mode !== 'playground' && solved(p, b)) return;
    const z = boardAt(svg, e.clientX, e.clientY);
    if (!z) return;
    const scale = svg.getScreenCTM?.()?.a || 4, lift = e.pointerType === 'touch' ? LIFT * SCALE * scale : 0;
    const base = {pointer: e.pointerId, svg, api, q, x: e.clientX, y: e.clientY, moved: false, tap: () => tapAt(z)};
    // A slide from a circle's letter starts at the circle.
    if (q.mode === 'every') { const k = labelTarget(q, z); gesture = {...base, kind: 'stroke', start: k >= 0 ? q.targets[k] : snap(q, z), lift: 0, stroke: null}; e.preventDefault(); return; }
    if (q.mode === 'playground') {
      const which = ['a', 'b'].find(w => d2(b[w], z) <= 1.2) || ui(p).chosen;
      gesture = {...base, kind: 'drag', which, layer: `.tr-mover-${which}`, cls: `tr-${which} chosen`, lift, at: null};
      e.preventDefault();
      return;
    }
    if (q.mode === 'through' && ui(p).claiming) { gesture = {...base, kind: 'tap'}; return; }
    gesture = {...base, kind: 'drag', which: null, layer: '.tr-mover', cls: q.mode === 'meet' ? 'tr-b' : 'tr-j', lift, at: null};
    e.preventDefault();
  });
  svg.addEventListener('keydown', e => {
    const pickEl = e.target.closest?.('.tr-pick');
    if (pickEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(Number(pickEl.dataset.pick)); return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const b = now();
    if (q.mode !== 'playground' && solved(p, b)) return;
    const arrow = {ArrowRight: 'E', ArrowLeft: 'W', ArrowUp: 'N', ArrowDown: 'S'}[e.key];
    const diagonal = {Home: 'NW', PageUp: 'NE', End: 'SW', PageDown: 'SE'}[e.key];
    if (q.mode === 'every' && e.shiftKey && (arrow || diagonal)) { e.preventDefault(); api.apply({type: 'mark', from: b.at, dir: arrow || diagonal}); return; }
    if (q.mode === 'playground' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); api.ui({chosen: ui(p).chosen === 'a' ? 'b' : 'a'}); return; }
    if (!arrow) return;
    e.preventDefault();
    const [dx, dy] = L.DIRS[arrow], from = q.mode === 'playground' ? b[ui(p).chosen] : b.at, to = [from[0] + dx * q.step, from[1] + dy * q.step];
    if (!inWin(q, to)) return;
    api.apply(q.mode === 'playground' ? {type: 'put', which: ui(p).chosen, at: to} : {type: 'put', at: to});
  });
}

export const tropicalMechanics = {
  tropical: {
    fresh, valid, solved, move, hint, render, wire, help,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, picks: []});
      if (Array.isArray(payload.picks) && payload.picks.length <= 1 && payload.picks.every(Number.isInteger)) state.picks = [...payload.picks];
      if (['a', 'b'].includes(payload.chosen)) state.chosen = payload.chosen;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo takes back moves and what the board said, never a refusal: a
    // refused Check or Can't stays while the junction is where it was, and a
    // refused That's all while the marks are the same.
    carry(p, from, to) {
      const q = p.parameters;
      Object.assign(ui(p), {claiming: false, picks: []});
      if (!object(from) || !object(to) || q.mode === 'playground') return to;
      if (q.mode === 'every') return from.lock && Array.isArray(to.marks) && sameMarks(from.lock, to.marks) ? {...to, lock: from.lock.map(makeMark)} : to;
      if (!Array.isArray(from.at) || !Array.isArray(to.at) || !L.same(from.at, to.at)) return to;
      if (q.mode === 'meet') return from.refused ? {...to, refused: true} : to;
      return {...to, checked: to.checked || from.checked, claimed: to.claimed || from.claimed, tried: to.tried || from.claimed};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'tropical',
  family: {id: 'tropical', symbol: '∟'},
  mechanics: tropicalMechanics,
  pack: new URL('./tropical.json', import.meta.url).href,
  css: new URL('./tropical.css', import.meta.url).href,
  focus: '.tr-board,.tr-button:not([disabled])'
};
