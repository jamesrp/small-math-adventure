// Footprint borders (worksheet Week 35, frieze symmetry). A border is one
// cell of P places in two rows, tiled endlessly along a strip. Each place
// holds nothing or one notched F in one of four forms: as drawn (A), flipped
// across (V), flipped down (H) or half-turned (R). The forms are the Klein
// four-group, and a form composes with a move's turning part by XOR.
//
// A move of the copy keeps the strip on itself: x' = x + u, or x' = u + P − x
// (in place units, the cell starting at 0), and y' = ±y. So it is a slide, the
// flip over the middle line, a glide (flip and slide), a flip across a line
// straight across the strip (a mirror), or a half-turn about a point of the
// middle line. Every line and centre sits on a half place. The copy matches
// when every footprint lands on one of the same form; the F has no symmetry,
// so where one footprint lands decides a move.
//
// Theorems the puzzles are for: a glide done twice is a slide, so when the
// flip alone fails the shortest glide is half the shortest slide; two flips
// across perpendicular lines make the half-turn about their crossing; and a
// move is ruled out by one footprint whose image lands where the border lacks
// it (a gap or another form), or, for every half-turn or every flip across at
// once, by one footprint whose image needs a form its row never has.
//
// A border has Fs in both rows (a rule of the puzzles, stated in How to play):
// then every symmetry keeps the middle line, so the copy's moves are all of
// them. With one row empty a border can have more (a half-turn round a point
// of that row's own line), so no claim is made and nothing is solved then.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const FORMS = [0, 1, 2, 3];
export const FORM_WORDS = ['as-drawn', 'flipped-across', 'flipped-down', 'half-turned'];
export const KINDS = ['slide', 'flip', 'glide', 'mirror', 'turn'];
export const TOOLS = ['flip', 'mirror', 'turn'];
export const PERIODS = [2, 3, 4, 5, 6];
const ROWS = ['top', 'bottom'];
const mod = (n, P) => ((n % P) + P) % P;

// --- Borders ----------------------------------------------------------------
// A cell is [top, bottom], each P places of null or a form 0–3.
export const periodOf = cell => cell[0].length;
export const at = (cell, c, r) => cell[r][mod(c, periodOf(cell))];
export const empty = cell => cell.every(row => row.every(v => v === null));
export const bothRows = cell => cell.every(row => row.some(v => v !== null));
export const footprints = cell => cell.flatMap((row, r) => row.flatMap((F, c) => (F === null ? [] : [{c, r, F}])));
// How many places each side of the cell the board shows: 8 to 10 places in all.
export const marginOf = P => Math.max(2, Math.ceil((8 - P) / 2));
export const windowOf = P => { const a = marginOf(P); return {from: -a, to: P + a}; };

// --- Moves of the copy ------------------------------------------------------
// The copy is {s, f, u}: s = −1 turns it end to end, f = −1 flips it over the
// middle line, and its cell's frame covers places u to u + P. Flip, Mirror
// and Turn act in place (they keep the frame where it is); a slide moves u.
export const HOME = {s: 1, f: 1, u: 0};
export const linearOf = g => (g.s === -1 ? 1 : 0) | (g.f === -1 ? 2 : 0);
export const imageOf = (P, g, c, r) => ({c: g.s === 1 ? c + g.u : g.u + P - 1 - c, r: g.f === 1 ? r : 1 - r});
export function kindOf(g) {
  if (g.s === 1) return g.f === 1 ? (g.u === 0 ? 'home' : 'slide') : g.u === 0 ? 'flip' : 'glide';
  return g.f === 1 ? 'mirror' : 'turn';
}
// The line of a mirror and the centre of a half-turn, in half places.
export const axis2Of = (P, g) => g.u + P;
export const sameCopy = (g, h) => g.s === h.s && g.f === h.f && g.u === h.u;
export const copyStates = P => [1, -1].flatMap(s => [1, -1].flatMap(f => Array.from({length: 2 * P + 1}, (_, k) => ({s, f, u: k - P}))));
const validCopy = (P, g) => object(g) && Object.keys(g).sort().join() === 'f,s,u' && [1, -1].includes(g.s) && [1, -1].includes(g.f) && Number.isInteger(g.u) && Math.abs(g.u) <= P;
// Does the copy match the border? Every footprint lands on one of its form.
export function fits(cell, g) {
  if (empty(cell)) return false;
  const P = periodOf(cell), L = linearOf(g);
  return footprints(cell).every(({c, r, F}) => { const im = imageOf(P, g, c, r); return at(cell, im.c, im.r) === (F ^ L); });
}
// What the attempts a copy state counts as: its kind, a slide's or a glide's
// length, and the flip across the crossing line (mirror:0, the copy's own
// place).
export function keysOf(g) {
  const k = kindOf(g);
  if (k === 'home') return [];
  if (k === 'slide' || k === 'glide') return [k, `${k}:${Math.abs(g.u)}`];
  return k === 'mirror' && g.u === 0 ? ['mirror', 'mirror:0'] : [k];
}
const TRIED = /^(slide|flip|glide|mirror|turn|(slide|glide):[1-9]\d*|mirror:0)$/;

// --- Goals ------------------------------------------------------------------
// {type: 'match', move, line?}: show a move of this kind with the copy (line:
//   the flip across the crossing line, the copy's own place).
// {type: 'cant', move: 'flip' | 'slide' (by) | 'turn' | 'mirror'}: claim no
//   such move matches, and point at one footprint as the reason.
// {type: 'shortest', move: 'slide' | 'glide'}: with the copy matching, claim
//   no shorter one does, and point at a footprint and the nearest one of the
//   form it needs.
// {type: 'centre'}: tap the point the half-turn goes round.
export const matchStates = (P, goal) => copyStates(P).filter(g => kindOf(g) === goal.move && (!goal.line || g.u === 0));
export function cantStates(P, goal) {
  if (goal.move === 'flip') return [{s: 1, f: -1, u: 0}];
  if (goal.move === 'slide') return [{s: 1, f: 1, u: goal.by}, {s: 1, f: 1, u: -goal.by}];
  return copyStates(P).filter(g => kindOf(g) === goal.move);
}
export const tryKey = goal => (goal.move === 'slide' ? `slide:${goal.by}` : goal.move);
// The attempt a match goal needs on record before it counts as shown.
export const showKey = goal => (goal.line ? 'mirror:0' : goal.move);
const showsGoal = (goal, g) => goal.type === 'match' && kindOf(g) === goal.move && (!goal.line || g.u === 0);
export const isFamily = goal => goal.type === 'cant' && (goal.move === 'turn' || goal.move === 'mirror');
export const matchable = (cell, goal) => matchStates(periodOf(cell), goal).some(g => fits(cell, g));
export const claimTrue = (cell, goal) => bothRows(cell) && !cantStates(periodOf(cell), goal).some(g => fits(cell, g));
const shortMoves = {slide: {s: 1, f: 1}, glide: {s: 1, f: -1}};
export function shortestOf(cell, move) {
  const P = periodOf(cell);
  for (let d = 1; d <= P; d++) if ([d, -d].some(u => fits(cell, {...shortMoves[move], u}))) return d;
  return null;
}
export const centreState = (P, m2) => ({s: -1, f: -1, u: m2 - P});

// --- Certificates -----------------------------------------------------------
// Places are absolute: {c, r} with c anywhere in the board's window.
const isPlace = (P, x) => Array.isArray(x) && x.length === 2 && Number.isInteger(x[0]) && (x[1] === 0 || x[1] === 1) && x[0] >= windowOf(P).from && x[0] < windowOf(P).to;
// One move (the flip, or a slide either way): X lands on Y, and Y lacks X's
// image form (a gap or another form).
export function judgeSpecific(cell, goal, X, Y) {
  const P = periodOf(cell), F = at(cell, X[0], X[1]);
  if (F === null) return 'gap';
  const g = cantStates(P, goal).find(h => { const im = imageOf(P, h, X[0], X[1]); return im.c === Y[0] && im.r === Y[1]; });
  if (!g) return 'there';
  return at(cell, Y[0], Y[1]) === (F ^ linearOf(g)) ? 'fits' : 'ok';
}
// Every half-turn, or every flip across: X's image has form Z, in the other
// row (a half-turn) or its own (a flip across), and that row has no Z.
export const neededRow = (goal, r) => (goal.move === 'turn' ? 1 - r : r);
export function judgeFamily(cell, goal, X, Z) {
  const F = at(cell, X[0], X[1]);
  if (F === null) return 'gap';
  if (Z !== (F ^ (goal.move === 'turn' ? 3 : 1))) return 'form';
  return cell[neededRow(goal, X[1])].includes(Z) ? 'present' : 'ok';
}
// Shortest: Y is of the form X needs (its own, in its row, for a slide; the
// flipped-down one in the other row for a glide), no such footprint is
// nearer to X, and Y is as far as the copy went. A gap for Y is the wrong
// kind ('class').
export const neededOf = (move, r, F) => (move === 'slide' ? {r, F} : {r: 1 - r, F: F ^ 2});
export function nearestOf(cell, move, X) {
  const P = periodOf(cell), F = at(cell, X[0], X[1]), need = neededOf(move, X[1], F);
  let best = null;
  for (let c = 0; c < P; c++) if (cell[need.r][c] === need.F) for (let k = -2; k <= 2; k++) { const d = Math.abs(c + k * P - X[0]); if (d > 0 && (best === null || d < best)) best = d; }
  return best;
}
export function judgeShortest(cell, goal, X, Y, dist) {
  const F = at(cell, X[0], X[1]);
  if (F === null) return 'gap';
  const need = neededOf(goal.move, X[1], F), d = Math.abs(Y[0] - X[0]);
  if (Y[1] !== need.r || at(cell, Y[0], Y[1]) !== need.F || d === 0) return 'class';
  if (d > nearestOf(cell, goal.move, X)) return 'nearer';
  return d === dist ? 'ok' : 'short';
}
export const judgeCentre = (cell, m2) => (fits(cell, centreState(periodOf(cell), m2)) ? 'ok' : 'miss');
const pointOk = (P, m2) => Number.isInteger(m2) && m2 >= 2 * windowOf(P).from && m2 <= 2 * windowOf(P).to;
// Every certificate a claim could be judged right with, on this border.
export function certificates(cell, goal, dist) {
  const P = periodOf(cell), {from, to} = windowOf(P), out = [];
  for (let c = from; c < to; c++) for (let r = 0; r < 2; r++) {
    if (at(cell, c, r) === null) continue;
    if (goal.type === 'cant' && isFamily(goal)) { for (const Z of FORMS) if (judgeFamily(cell, goal, [c, r], Z) === 'ok') out.push([[c, r], Z]); continue; }
    for (let c2 = from; c2 < to; c2++) for (let r2 = 0; r2 < 2; r2++) {
      const ok = goal.type === 'cant' ? judgeSpecific(cell, goal, [c, r], [c2, r2]) : judgeShortest(cell, goal, [c, r], [c2, r2], dist);
      if (ok === 'ok') out.push([[c, r], [c2, r2]]);
    }
  }
  return out;
}
export const centres = cell => { const P = periodOf(cell), {from, to} = windowOf(P), out = []; for (let m2 = 2 * from; m2 <= 2 * to; m2++) if (judgeCentre(cell, m2) === 'ok') out.push(m2); return out; };

// Is this border an answer to every edit-free part of the puzzle? Every move
// to show can be shown, every claim is true and can be pointed at, and a
// half-turn centre to tap exists.
export function answers(q, cell) {
  if (empty(cell)) return false;
  return q.goals.every(goal => {
    if (goal.type === 'match') return matchable(cell, goal);
    if (goal.type === 'cant') return claimTrue(cell, goal) && certificates(cell, goal).length > 0;
    if (goal.type === 'centre') return centres(cell).length > 0;
    return true;
  });
}

// --- Boards -----------------------------------------------------------------
// Puzzle: {cell, copy, tried, shown, done, refused, last}.
//   tried: the attempt keys the copy has made on this cell (a Can't needs one,
//     a shown move needs its own, and a Shortest the slide or glide by its
//     length). An edit starts it again from the copy's state as it stands:
//     the matches and misses it shows on the new cell are an attempt too.
//   shown: the match goals the copy has matched on this cell.
//   done: the claims judged right on this cell, [{goal, pick}].
//   refused: the claims judged wrong, in the order made, [{goal, pick, why,
//     cell}] with the copy too for a Shortest. Each is about the board it was
//     made on: while the cell (and, for a Shortest, the copy) is that again,
//     the claim stays off. Edits, copy moves and Undo never clear one;
//     Restart does. At most REFUSALS are kept, the oldest dropped first.
//   last: the claim just judged, {goal, ok}: its argument or refusal shows.
// Playground: {cell, copy}.
const PUZZLE_KEYS = 'cell,copy,done,last,refused,shown,tried';
const REFUSALS = 64;
const blankCell = P => [Array(P).fill(null), Array(P).fill(null)];
const cloneCell = cell => cell.map(row => [...row]);
const sameCell = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const inventory = cell => footprints(cell).map(x => x.F).sort().join();
function validCell(cell, P) {
  return Array.isArray(cell) && cell.length === 2 && cell.every(row => Array.isArray(row) && row.length === P && row.every(v => v === null || FORMS.includes(v)));
}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {cell: blankCell(q.start), copy: {...HOME}};
  return record(q, {cell: cloneCell(q.cell), copy: {...HOME}, tried: [], shown: [], done: [], refused: [], last: null});
}
// After a copy move or an edit (moved) the copy's state is recorded as an
// attempt on the board it now shows; a match it makes now is recorded too.
function record(q, b, moved = false) {
  const now = fits(b.cell, b.copy);
  const tried = moved || now ? [...new Set([...b.tried, ...keysOf(b.copy)])].sort() : b.tried;
  const shown = now ? [...new Set([...b.shown, ...q.goals.flatMap((goal, i) => (showsGoal(goal, b.copy) ? [i] : []))])].sort((x, y) => x - y) : b.shown;
  return {...b, tried, shown};
}
const isDone = (b, i) => b.done.some(d => d.goal === i);
// Is a refusal about this board (its cell, and its copy for a Shortest)?
const refusalOn = (q, r, cell, copy) => sameCell(r.cell, cell) && (q.goals[r.goal].type !== 'shortest' || sameCopy(r.copy, copy));
export const lockedOn = (q, b, i) => b.refused.some(r => r.goal === i && refusalOn(q, r, b.cell, b.copy));
const samePlace = (X, Y) => X[0] === Y[0] && X[1] === Y[1];
// A claim's taps judged: 'ok', a reason it is wrong, or 'bad' for taps that
// aren't a claim at all (off the board, a form that isn't one, the same place
// twice). A first tap on a gap is judged too ('gap').
function judge(q, cell, goal, pick, dist) {
  const P = periodOf(cell);
  if (goal.type === 'centre') return pointOk(P, pick) ? judgeCentre(cell, pick) : 'bad';
  if (!Array.isArray(pick) || pick.length !== 2 || !isPlace(P, pick[0])) return 'bad';
  if (isFamily(goal)) return FORMS.includes(pick[1]) ? judgeFamily(cell, goal, pick[0], pick[1]) : 'bad';
  if (!isPlace(P, pick[1]) || samePlace(pick[0], pick[1])) return 'bad';
  return goal.type === 'cant' ? judgeSpecific(cell, goal, pick[0], pick[1]) : judgeShortest(cell, goal, pick[0], pick[1], dist);
}
// The shortest claim's distance: how far the copy went (it must match now).
const claimDist = (cell, copy, goal) => (kindOf(copy) === goal.move && fits(cell, copy) ? Math.abs(copy.u) : null);
// May this claim be made now? It comes after an attempt, on a border with Fs
// in both rows, and not while a refusal stands on this board.
export function canClaim(q, b, i) {
  const goal = q.goals[i];
  if (!goal || goal.type === 'match' || isDone(b, i) || !bothRows(b.cell) || lockedOn(q, b, i)) return false;
  if (goal.type === 'cant') return b.tried.includes(tryKey(goal));
  if (goal.type === 'shortest') return claimDist(b.cell, b.copy, goal) !== null;
  return q.goals.every((g, k) => g.type !== 'match' || b.shown.includes(k));
}
function validRefusal(q, P, r) {
  const goal = q.goals[r?.goal];
  if (!object(r) || !goal || goal.type === 'match') return false;
  const shortest = goal.type === 'shortest';
  if (Object.keys(r).sort().join() !== (shortest ? 'cell,copy,goal,pick,why' : 'cell,goal,pick,why') || !validCell(r.cell, P) || !bothRows(r.cell)) return false;
  if (q.edit === 'none' && !sameCell(r.cell, q.cell)) return false;
  if (q.edit === 'move' && inventory(r.cell) !== inventory(q.cell)) return false;
  if (shortest && !(validCopy(P, r.copy) && claimDist(r.cell, r.copy, goal) !== null)) return false;
  const why = judge(q, r.cell, goal, r.pick, shortest ? claimDist(r.cell, r.copy, goal) : undefined);
  return why !== 'ok' && why !== 'bad' && why === r.why;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') return Object.keys(b).sort().join() === 'cell,copy' && PERIODS.includes(b.cell?.[0]?.length) && validCell(b.cell, b.cell[0].length) && validCopy(b.cell[0].length, b.copy);
  const P = periodOf(q.cell);
  if (Object.keys(b).sort().join() !== PUZZLE_KEYS || !validCell(b.cell, P) || !validCopy(P, b.copy)) return false;
  if (q.edit === 'none' && !sameCell(b.cell, q.cell)) return false;
  if (q.edit === 'move' && inventory(b.cell) !== inventory(q.cell)) return false;
  if (!Array.isArray(b.tried) || !b.tried.every(k => typeof k === 'string' && TRIED.test(k)) || new Set(b.tried).size !== b.tried.length) return false;
  // The copy's own attempt is on record: every copy move and every edit
  // records the state it leaves the copy in.
  const now = fits(b.cell, b.copy);
  if (!keysOf(b.copy).every(k => b.tried.includes(k))) return false;
  // A move is shown only where it can be, after its own attempt.
  if (!Array.isArray(b.shown) || !b.shown.every((i, k) => Number.isInteger(i) && q.goals[i]?.type === 'match' && matchable(b.cell, q.goals[i]) && b.tried.includes(showKey(q.goals[i])) && (k === 0 || b.shown[k - 1] < i))) return false;
  // A match the copy makes now is recorded.
  if (now && !q.goals.every((goal, i) => b.shown.includes(i) || !showsGoal(goal, b.copy))) return false;
  if (!Array.isArray(b.done) || !b.done.every((d, k) => object(d) && Object.keys(d).sort().join() === 'goal,pick' && Number.isInteger(d.goal) && q.goals[d.goal] && q.goals[d.goal].type !== 'match' && (k === 0 || b.done[k - 1].goal < d.goal))) return false;
  if (b.done.length && !bothRows(b.cell)) return false;
  for (const d of b.done) {
    const goal = q.goals[d.goal];
    if (goal.type === 'cant' && !(b.tried.includes(tryKey(goal)) && claimTrue(b.cell, goal) && judge(q, b.cell, goal, d.pick) === 'ok')) return false;
    if (goal.type === 'shortest') { const dist = shortestOf(b.cell, goal.move); if (!(dist !== null && b.tried.includes(`${goal.move}:${dist}`) && judge(q, b.cell, goal, d.pick, dist) === 'ok')) return false; }
    if (goal.type === 'centre' && !(q.goals.every((g, k) => g.type !== 'match' || b.shown.includes(k)) && judge(q, b.cell, goal, d.pick) === 'ok')) return false;
  }
  if (!Array.isArray(b.refused) || b.refused.length > REFUSALS || !b.refused.every(r => validRefusal(q, P, r))) return false;
  const key = r => JSON.stringify([r.goal, r.cell, r.copy || null]);
  if (new Set(b.refused.map(key)).size !== b.refused.length) return false;
  if (b.last !== null && !(object(b.last) && Object.keys(b.last).sort().join() === 'goal,ok' && (b.last.ok === true ? isDone(b, b.last.goal) : b.last.ok === false && b.refused.at(-1)?.goal === b.last.goal && refusalOn(q, b.refused.at(-1), b.cell, b.copy)))) return false;
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || !bothRows(b.cell)) return false;
  return q.goals.every((goal, i) => (goal.type === 'match' ? b.shown.includes(i) : isDone(b, i)));
}

// --- Moves ------------------------------------------------------------------
// Edits: {type: 'put', c, r, form}, {type: 'clear', c, r} (free), or
// {type: 'shift', from: [c, r], to: [c, r]} (moving footprints only), with c
// a place in the cell. Copy: {type: 'slide', by}, {type: 'flip'},
// {type: 'mirror'}, {type: 'turn'}. Claims: {type: 'cant' | 'shortest' |
// 'centre', goal, pick}. Playground: {type: 'period', P} too.
function copyMove(q, P, g, action) {
  const tools = q.mode === 'playground' ? TOOLS : q.tools;
  if (action.type === 'slide') { const u = g.u + action.by; return Number.isInteger(action.by) && action.by !== 0 && Math.abs(u) <= P ? {...g, u} : null; }
  if (!tools.includes(action.type)) return null;
  if (action.type === 'flip') return {...g, f: -g.f};
  if (action.type === 'mirror') return {...g, s: -g.s};
  if (action.type === 'turn') return {...g, s: -g.s, f: -g.f};
  return null;
}
const inCell = (P, c, r) => Number.isInteger(c) && c >= 0 && c < P && (r === 0 || r === 1);
function editMove(q, cell, action) {
  const P = periodOf(cell), next = cloneCell(cell), mode = q.mode === 'playground' ? 'free' : q.edit;
  if (mode === 'free' && action.type === 'put' && inCell(P, action.c, action.r) && FORMS.includes(action.form) && cell[action.r][action.c] !== action.form) { next[action.r][action.c] = action.form; return next; }
  if (mode === 'free' && action.type === 'clear' && inCell(P, action.c, action.r) && cell[action.r][action.c] !== null) { next[action.r][action.c] = null; return next; }
  if (mode === 'move' && action.type === 'shift' && Array.isArray(action.from) && Array.isArray(action.to) && inCell(P, ...action.from) && inCell(P, ...action.to)) {
    const [c1, r1] = action.from, [c2, r2] = action.to;
    if (cell[r1][c1] === null || cell[r2][c2] !== null) return null;
    next[r2][c2] = cell[r1][c1]; next[r1][c1] = null; return next;
  }
  return null;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'playground') {
    const P = periodOf(b.cell);
    if (action.type === 'period') next = PERIODS.includes(action.P) && action.P !== P ? {cell: blankCell(action.P).map((row, r) => row.map((_, c) => (c < P ? b.cell[r][c] : null))), copy: {...HOME}} : null;
    else if (['slide', ...TOOLS].includes(action.type)) { const copy = copyMove(q, P, b.copy, action); next = copy && {...b, copy}; }
    else { const cell = editMove(q, b.cell, action); next = cell && {...b, cell}; }
  } else if (['put', 'clear', 'shift'].includes(action.type)) {
    const cell = editMove(q, b.cell, action);
    next = cell && record(q, {...b, cell, tried: [], shown: [], done: [], last: null}, true);
  } else if (['slide', ...TOOLS].includes(action.type)) {
    const copy = copyMove(q, periodOf(b.cell), b.copy, action);
    next = copy && record(q, {...b, copy, last: null}, true);
  } else if (['cant', 'shortest', 'centre'].includes(action.type) && Number.isInteger(action.goal) && q.goals[action.goal]?.type === action.type && canClaim(q, b, action.goal)) {
    const goal = q.goals[action.goal], shortest = goal.type === 'shortest', why = judge(q, b.cell, goal, action.pick, shortest ? claimDist(b.cell, b.copy, goal) : undefined);
    if (why === 'ok') next = {...b, done: [...b.done, {goal: action.goal, pick: action.pick}].sort((x, y) => x.goal - y.goal), last: {goal: action.goal, ok: true}};
    else if (why !== 'bad') next = {...b, refused: [...b.refused, {goal: action.goal, pick: action.pick, why, cell: cloneCell(b.cell), ...(shortest ? {copy: {...b.copy}} : {})}].slice(-REFUSALS), last: {goal: action.goal, ok: false}};
  }
  if (next) Object.assign(ui(p), {claim: null, picks: [], held: null});
  return next;
}

// --- Hints ------------------------------------------------------------------
// Edit puzzles aim at the nearest answer border (fewest places changed, or
// fewest footprints moved) on which no claim has been refused; then the copy
// shows each match; then each claim: an attempt with the copy first, then
// the reason and the claim. When every way left is refused (a Shortest
// refused both ways, or every answer border refused), the hint says to
// Restart, which clears refusals.
const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) { if (memo.size > 4000) memo.clear(); memo.set(key, make()); } return memo.get(key); };
// Candidate borders: every cell when there are few; for larger free cells,
// those the puzzle's fixed moves (the flip, the flip across the crossing
// line) map to themselves, one form per orbit; for moving footprints, every
// arrangement of the starting ones.
function allCells(P) {
  const out = [], slots = 2 * P, total = 5 ** slots;
  for (let n = 0; n < total; n++) { const cell = blankCell(P); let k = n; for (let i = 0; i < slots; i++) { const v = k % 5; k = Math.floor(k / 5); cell[i % 2][Math.floor(i / 2)] = v === 4 ? null : v; } out.push(cell); }
  return out;
}
function orbitCells(P, gens) {
  // Inverses too, so each orbit is closed.
  const moves = [...gens, ...gens.filter(g => g.s === 1).map(g => ({...g, u: -g.u}))];
  const key = (c, r) => `${c},${r}`, taken = new Set(), orbits = [];
  for (let c0 = 0; c0 < P; c0++) for (let r0 = 0; r0 < 2; r0++) {
    if (taken.has(key(c0, r0))) continue;
    // Each member, with the turning part that carries the first one to it.
    const turn = new Map([[key(c0, r0), 0]]), list = [[c0, r0]];
    let bad = false;
    for (let k = 0; k < list.length; k++) for (const g of moves) {
      const [c, r] = list[k], im = imageOf(P, g, c, r), t = key(mod(im.c, P), im.r), L = turn.get(key(c, r)) ^ linearOf(g);
      if (!turn.has(t)) { turn.set(t, L); list.push([mod(im.c, P), im.r]); } else if (turn.get(t) !== L) bad = true;
    }
    list.forEach(([c, r]) => taken.add(key(c, r)));
    orbits.push({list: list.map(([c, r]) => ({c, r, L: turn.get(key(c, r))})), bad});
  }
  const out = [];
  (function choose(k, cell) {
    if (k === orbits.length) { out.push(cell); return; }
    choose(k + 1, cell);
    if (orbits[k].bad) return;
    for (const F of FORMS) { const next = cloneCell(cell); for (const o of orbits[k].list) next[o.r][o.c] = F ^ o.L; choose(k + 1, next); }
  })(0, blankCell(P));
  return out;
}
// Every arrangement of the starting footprints over the cell's places.
function arrangements(cell) {
  const P = periodOf(cell), counts = [0, 0, 0, 0], out = [], next = blankCell(P), n = footprints(cell).length;
  for (const {F} of footprints(cell)) counts[F]++;
  (function go(s, left) {
    if (left === 0) { out.push(cloneCell(next)); return; }
    if (2 * P - s < left) return;
    const c = s >> 1, r = s & 1;
    go(s + 1, left);
    for (const F of FORMS) if (counts[F]) { counts[F]--; next[r][c] = F; go(s + 1, left - 1); next[r][c] = null; counts[F]++; }
  })(0, n);
  return out;
}
export function answerCells(p) {
  const q = p.parameters;
  return remember(`answers|${p.id}`, () => {
    const P = periodOf(q.cell);
    let list;
    if (q.edit === 'move') list = arrangements(q.cell);
    else if (5 ** (2 * P) <= 20000) list = allCells(P);
    else list = orbitCells(P, q.goals.flatMap(goal => (goal.type === 'match' && (goal.move === 'flip' || goal.line) ? matchStates(P, goal) : [])));
    const good = list.filter(cell => answers(q, cell));
    const first = (q.witnesses || []).map(w => good.find(c => sameCell(c, w))).filter(Boolean);
    return [...first, ...good.filter(c => !first.includes(c))];
  });
}
const changes = (q, a, b) => {
  if (q.edit !== 'move') return a.reduce((n, row, r) => n + row.filter((v, c) => v !== b[r][c]).length, 0);
  return a.reduce((n, row, r) => n + row.filter((v, c) => v !== null && v !== b[r][c]).length, 0);
};
const placeWords = (c, r) => `place ${c + 1} of the ${ROWS[r]} row`;
const formWords = F => `${FORM_WORDS[F]} F`;
const aForm = F => `${/^[aeiou]/.test(FORM_WORDS[F]) ? 'an' : 'a'} ${formWords(F)}`;
function editHint(q, b, target) {
  const P = periodOf(b.cell), cell = b.cell;
  const slots = [];
  for (let c = 0; c < P; c++) for (let r = 0; r < 2; r++) if (cell[r][c] !== target[r][c]) slots.push([c, r]);
  if (q.edit === 'move') {
    // Move a footprint that is out of place to an empty place its form needs.
    for (const [c, r] of slots) {
      const F = cell[r][c];
      if (F === null) continue;
      const to = slots.find(([c2, r2]) => target[r2][c2] === F && cell[r2][c2] === null);
      if (to) return {action: {type: 'shift', from: [c, r], to}, text: `Move the ${formWords(F)} at ${placeWords(c, r)} to ${placeWords(...to)}.`, slots: [[c, r], to]};
    }
    const [c, r] = slots.find(([c1, r1]) => cell[r1][c1] !== null), to = slots.find(([c2, r2]) => cell[r2][c2] === null && target[r2][c2] === null) || [...Array(2 * P).keys()].map(s => [s >> 1, s & 1]).find(([c2, r2]) => cell[r2][c2] === null);
    return {action: {type: 'shift', from: [c, r], to}, text: `Move the ${formWords(cell[r][c])} at ${placeWords(c, r)} out of the way.`, slots: [[c, r], to]};
  }
  const extra = slots.find(([c, r]) => cell[r][c] !== null && target[r][c] === null);
  if (extra) return {action: {type: 'clear', c: extra[0], r: extra[1]}, text: `Take away the ${formWords(cell[extra[1]][extra[0]])} at ${placeWords(...extra)}.`, slots: [extra]};
  const [c, r] = slots[0];
  return {action: {type: 'put', c, r, form: target[r][c]}, text: `Put ${aForm(target[r][c])} at ${placeWords(c, r)}.`, slots: [[c, r]]};
}
// The copy's next step toward a state: the buttons for its orientation (the
// fewest presses, over the puzzle's buttons), then a slide.
const TOOL_PART = {flip: 2, mirror: 1, turn: 3};
function orientBfs(tools, from, to) {
  const seen = new Map([[from, []]]), queue = [from];
  while (queue.length) {
    const L = queue.shift();
    if (L === to) return seen.get(L);
    for (const t of tools) { const M = L ^ TOOL_PART[t]; if (!seen.has(M)) { seen.set(M, [...seen.get(L), t]); queue.push(M); } }
  }
  return null;
}
// Back to as drawn first, then on to the orientation wanted: a hint never
// asks for Flip across to make the flip, say, though the two agree.
function orientPath(q, from, to) {
  const tools = q.mode === 'playground' ? TOOLS : q.tools;
  if (from === to) return [];
  if (from === 0 || to === 0) return orientBfs(tools, from, to);
  const back = orientBfs(tools, from, 0), on = orientBfs(tools, 0, to);
  return back && on ? [...back, ...on] : null;
}
function routeCost(q, g, h) {
  const path = orientPath(q, linearOf(g), linearOf(h));
  return path === null ? Infinity : path.length + (g.u !== h.u ? 1 : 0);
}
const TOOL_TEXT = {flip: 'Flip the copy over the middle line.', mirror: 'Flip the copy across.', turn: 'Turn the copy halfway round.'};
const BACK_TEXT = {flip: 'Flip the copy back over the middle line.', mirror: 'Flip the copy back across.', turn: 'Turn the copy back.'};
const isBack = (g, t) => (t === 'flip' ? g.f === -1 : t === 'mirror' ? g.s === -1 : g.s === -1 && g.f === -1);
function copyStep(q, g, h) {
  const path = orientPath(q, linearOf(g), linearOf(h));
  if (path?.length) { const t = path[0]; return {action: {type: t}, text: (isBack(g, t) ? BACK_TEXT : TOOL_TEXT)[t], button: t}; }
  const d = h.u - g.u, n = Math.abs(d);
  return {action: {type: 'slide', by: d}, text: `Slide the copy ${n} ${n === 1 ? 'place' : 'places'} ${d > 0 ? 'right' : 'left'}.`, frame: h};
}
function nearestState(q, g, states) {
  return states.reduce((best, h) => {
    if (sameCopy(g, h)) return best;
    const k = [routeCost(q, g, h), Math.abs(h.u - g.u), Math.abs(h.u)];
    return !best || k[0] < best.k[0] || (k[0] === best.k[0] && (k[1] < best.k[1] || (k[1] === best.k[1] && k[2] < best.k[2]))) ? {h, k} : best;
  }, null)?.h;
}
function claimWords(q, cell, goal, cert, dist) {
  const [X] = cert, F = at(cell, ...X), c = mod(X[0], periodOf(cell));
  const here = `the ${formWords(F)} at ${placeWords(c, X[1])}`;
  if (goal.type === 'cant' && isFamily(goal)) {
    const Z = cert[1];
    return `${goal.move === 'turn' ? 'Turned halfway' : 'Flipped across'}, ${here} becomes ${aForm(Z)}, and ${goal.move === 'turn' ? 'the other' : 'its'} row has none. Press Can’t, tap that F, then the ${FORM_WORDS[Z]} button.`;
  }
  if (goal.type === 'cant') {
    const lands = at(cell, ...cert[1]) === null ? 'a gap' : 'a different F';
    return `${goal.move === 'flip' ? 'Flipped over the middle line' : `Slid ${goal.by} places`}, ${here} lands on ${lands}. Press Can’t, then tap that F and where it lands.`;
  }
  const need = neededOf(goal.move, X[1], F), far = `${dist} ${dist === 1 ? 'place' : 'places'}`;
  const which = goal.move === 'slide' ? `The nearest other ${formWords(F)} in its row is ${far} from the one at ${placeWords(c, X[1])}` : `The nearest ${formWords(need.F)} in the ${ROWS[need.r]} row is ${far} from ${here}`;
  return `${which}. Press Shortest, then tap those two Fs.`;
}
// A certificate for the hint: one with its first footprint in the cell, the
// second as near as can be.
function bestCert(cell, goal, dist) {
  const P = periodOf(cell), list = certificates(cell, goal, dist);
  const inside = list.filter(([X]) => X[0] >= 0 && X[0] < P);
  return (inside.length ? inside : list).sort((a, b) => (Array.isArray(a[1]) ? Math.abs(a[1][0] - a[0][0]) : 0) - (Array.isArray(b[1]) ? Math.abs(b[1][0] - b[0][0]) : 0))[0];
}
export const STUCK = 'Every way left to finish has a refused claim. Restart to try again.';
function plan(p, b) {
  const q = p.parameters, cell = b.cell, P = periodOf(cell);
  // A border with a refused Can't or Turn here can't be finished: its claim
  // stays off there, and coming back to it clears what was done.
  const refusedOn = w => b.refused.some(r => q.goals[r.goal].type !== 'shortest' && sameCell(r.cell, w));
  const blocked = q.goals.some((goal, i) => goal.type !== 'shortest' && !isDone(b, i) && lockedOn(q, b, i));
  if (q.edit !== 'none' && (!answers(q, cell) || blocked)) {
    const list = answerCells(p).filter(w => !refusedOn(w) && !sameCell(w, cell));
    if (!list.length) return {stuck: true, text: STUCK};
    const target = list.reduce((best, w) => (!best || changes(q, cell, w) < changes(q, cell, best) ? w : best), null);
    return editHint(q, b, target);
  }
  for (let i = 0; i < q.goals.length; i++) {
    const goal = q.goals[i];
    if (goal.type === 'match') {
      if (b.shown.includes(i)) continue;
      return copyStep(q, b.copy, nearestState(q, b.copy, matchStates(P, goal).filter(g => fits(cell, g))));
    }
    if (isDone(b, i)) continue;
    if (goal.type === 'cant') {
      if (!b.tried.includes(tryKey(goal))) {
        // The attempt: the nearest state of that move (the copy is not in
        // one, or it would be tried); for the flip, the only one, by way of
        // home.
        const to = nearestState(q, b.copy, cantStates(P, goal)) || HOME;
        const step = copyStep(q, b.copy, to), next = copyMove(q, P, b.copy, step.action);
        const lead = {flip: 'Try the flip alone', slide: `Try a slide of ${goal.by} places`, turn: 'Try a half-turn', mirror: 'Try a flip across'}[goal.move];
        return next && keysOf(next).includes(tryKey(goal)) ? {...step, text: `${lead}: ${step.text[0].toLowerCase()}${step.text.slice(1)}`} : step;
      }
      const cert = bestCert(cell, goal);
      return {action: {type: 'cant', goal: i, pick: cert}, text: claimWords(q, cell, goal, cert), slots: [cert[0], ...(Array.isArray(cert[1]) ? [cert[1]] : [])], form: isFamily(goal) ? cert[1] : null, button: `claim-${i}`};
    }
    if (goal.type === 'shortest') {
      const d = shortestOf(cell, goal.move), now = claimDist(cell, b.copy, goal);
      const open = [d, -d].map(u => ({...shortMoves[goal.move], u})).filter(g => !b.refused.some(r => r.goal === i && refusalOn(q, r, cell, g)));
      if (!open.length) return {stuck: true, text: `Shortest ${goal.move} was refused both ways. Restart to try again.`};
      if (now !== d || lockedOn(q, b, i)) return copyStep(q, b.copy, nearestState(q, b.copy, open));
      const cert = bestCert(cell, goal, d);
      return {action: {type: 'shortest', goal: i, pick: cert}, text: claimWords(q, cell, goal, cert, d), slots: cert, button: `claim-${i}`};
    }
    const list = centres(cell), m2 = list.includes(P) ? P : list[0];
    return {action: {type: 'centre', goal: i, pick: m2}, text: 'Two flips that cross make a half-turn round the point where they cross. Press Turn here and tap that point.', point: m2, button: `claim-${i}`};
  }
  return {action: {type: 'slide', by: 1}, text: ''};
}
// A stuck board's hint is a note to Restart, not a move: there is nothing to
// apply, and it isn't a dead end for the shared rescue Undo, which would take
// refusals back.
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return remember(`h|${p.id}|${JSON.stringify(b)}`, () => { const h = plan(p, b); return h.stuck ? {type: 'stuck', text: h.text} : {type: 'move', ...h}; });
}

// --- View state -------------------------------------------------------------
// The chosen form, a footprint picked up to move, and a claim being tapped
// out: {claim: goal index, picks: [...]}.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {form: 0, held: null, claim: null, picks: []}); return uiState.get(p.id); }

// --- Drawing ----------------------------------------------------------------
// Places are 30 units wide; the F (2.6 × 2.2 in the worksheet's units, from
// its launch figure) is drawn 26 × 22, centred 15 above or below the middle
// line. y runs down in the drawing.
export const SW = 30;
const ROW_Y = [-15, 15], HALF = 30;
const F_PATH = 'M-13-11H13V-4H8V-6.5H-5V0H6V4.5H-5V11H-13Z';
const ARROW = 'M-3-9.2H2.6V-10.6L5.6-8.6L2.6-6.6V-8H-3Z';
const f2 = n => Number(n.toFixed(2));
const scaleOf = F => `${F & 1 ? -1 : 1},${F & 2 ? -1 : 1}`;
const foot = (F, x, y, cls, extra = '') => `<g class="${cls}" transform="translate(${f2(x)},${f2(y)}) scale(${scaleOf(F)})"${extra}><path class="fz-body" d="${F_PATH}"/><path class="fz-arrow" d="${ARROW}"/></g>`;
const cx = c => (c + 0.5) * SW;
// A small F in a form, for buttons and goal chips.
export const formIcon = (F, label) => `<svg class="fz-icon" viewBox="-16 -14 32 28" role="img" aria-label="${esc(label)}">${foot(F, 0, 0, 'fz-f')}</svg>`;
const MINI = 0.42;
const mini = (F, x, y) => `<g transform="translate(${x},${y}) scale(${MINI})">${foot(F, 0, 0, 'fz-f')}</g>`;
export function moveIcon(move, crossed = false, by = null) {
  const line = {flip: '<line class="fz-icon-line" x1="2" y1="14" x2="38" y2="14"/>', glide: '<line class="fz-icon-line" x1="2" y1="14" x2="38" y2="14"/>', mirror: '<line class="fz-icon-line" x1="20" y1="2" x2="20" y2="26"/>', turn: '<circle class="fz-icon-dot" cx="20" cy="14" r="1.8"/>', slide: '<path class="fz-icon-arrow" d="M14 22H26M23 19L26 22L23 25"/>'}[move];
  const pics = {slide: mini(0, 9, 11) + mini(0, 31, 11), flip: mini(0, 20, 7) + mini(2, 20, 21), glide: mini(0, 11, 7) + mini(2, 29, 21), mirror: mini(0, 10, 14) + mini(1, 30, 14), turn: mini(0, 11, 7) + mini(3, 29, 21)}[move];
  const num = by ? `<text class="fz-icon-num" x="20" y="15" text-anchor="middle">${by}</text>` : '';
  return `<svg class="fz-move-icon" viewBox="0 0 40 28" aria-hidden="true">${line}${pics}${crossed ? '<path class="fz-icon-cross" d="M4 4L36 24M36 4L4 24"/>' : ''}${num}</svg>`;
}
const MOVE_WORDS = {slide: 'Slide', flip: 'Flip over the middle line', glide: 'Glide', mirror: 'Flip across', turn: 'Half-turn'};

// The copy's footprints over the window: each place's preimage under the
// copy's move tells what lands there.
export function copyLayer(q, cell, g, opt = {}) {
  const P = periodOf(cell), {from, to} = windowOf(P), L = linearOf(g), home = kindOf(g) === 'home';
  let out = `<rect class="fz-copy-frame" x="${g.u * SW}" y="${-HALF}" width="${P * SW}" height="${2 * HALF}"/>`;
  for (let c2 = from; c2 < to; c2++) for (let r2 = 0; r2 < 2; r2++) {
    const c = g.s === 1 ? c2 - g.u : g.u + P - 1 - c2, r = g.f === 1 ? r2 : 1 - r2, F = at(cell, c, r);
    if (F === null) continue;
    const hit = at(cell, c2, r2) === (F ^ L), only = opt.only;
    if (only && !(only[0] === c2 && only[1] === r2)) continue;
    out += foot(F ^ L, cx(c2), ROW_Y[r2], `fz-c ${home ? 'home' : hit ? 'hit' : 'miss'}`);
  }
  return out;
}
const ring = (c, r, cls) => `<rect class="${cls}" x="${c * SW + 1.5}" y="${ROW_Y[r] - 13.5}" width="${SW - 3}" height="27" rx="5"/>`;
function boardSvg(p, b, opt) {
  const q = p.parameters, cell = b.cell, P = periodOf(cell), {from, to} = windowOf(P), W = to - from;
  const x0 = from * SW - 6, w = W * SW + 12;
  let s = `<svg class="fz-board" viewBox="${x0} -36 ${w} 72" data-fz-board tabindex="0" role="group" aria-label="${esc(opt.label)}" data-focus="fz-board">`;
  s += `<defs><linearGradient id="fz-fade-l" x1="0" x2="1"><stop offset="0" stop-color="var(--fz-card)"/><stop offset="1" stop-color="var(--fz-card)" stop-opacity="0"/></linearGradient><linearGradient id="fz-fade-r" x1="1" x2="0"><stop offset="0" stop-color="var(--fz-card)"/><stop offset="1" stop-color="var(--fz-card)" stop-opacity="0"/></linearGradient></defs>`;
  s += `<rect class="fz-strip" x="${from * SW}" y="${-HALF}" width="${W * SW}" height="${2 * HALF}"/>`;
  s += `<rect class="fz-cell" x="0" y="${-HALF}" width="${P * SW}" height="${2 * HALF}"/>`;
  s += `<line class="fz-mid" x1="${from * SW}" y1="0" x2="${to * SW}" y2="0"/>`;
  if (q.crossing) s += `<line class="fz-cross" x1="${P / 2 * SW}" y1="${-HALF - 4}" x2="${P / 2 * SW}" y2="${HALF + 4}"/>`;
  if (opt.edit) for (let c = 0; c < P; c++) for (let r = 0; r < 2; r++) if (cell[r][c] === null) s += `<rect class="fz-empty" x="${c * SW + 4}" y="${ROW_Y[r] - 10}" width="${SW - 8}" height="20" rx="4"/>`;
  for (let c = from; c < to; c++) for (let r = 0; r < 2; r++) { const F = at(cell, c, r); if (F !== null) s += foot(F, cx(c), ROW_Y[r], `fz-f${c < 0 || c >= P ? ' rep' : ''}`); }
  s += opt.marks || '';
  s += `<g class="fz-copy${opt.copyHidden ? ' hidden' : ''}" data-fz-copy>${opt.copyHidden ? '' : copyLayer(q, cell, opt.copy || b.copy, {only: opt.only})}</g>`;
  s += opt.argument || '';
  s += `<rect class="fz-fade" x="${from * SW}" y="${-HALF - 1}" width="${SW * 0.9}" height="${2 * HALF + 2}" fill="url(#fz-fade-l)"/><rect class="fz-fade" x="${to * SW - SW * 0.9}" y="${-HALF - 1}" width="${SW * 0.9}" height="${2 * HALF + 2}" fill="url(#fz-fade-r)"/>`;
  s += opt.hits || '';
  return `${s}</svg>`;
}

function describeCell(cell) {
  const P = periodOf(cell), parts = [];
  for (let r = 0; r < 2; r++) parts.push(`${ROWS[r]} row: ${cell[r].map((F, c) => `place ${c + 1} ${F === null ? 'empty' : FORM_WORDS[F]}`).join(', ')}`);
  return `The border repeats every ${P} places. ${parts.join('; ')}.`;
}
// The copy, said by the buttons the puzzle has: without Turn (puzzle 10), a
// copy flipped both ways is said to be that, not turned, so the status line
// never names the half-turn the child is to find.
function describeCopy(q, cell, g) {
  const k = kindOf(g);
  if (k === 'home') return 'The copy is home.';
  const n = Math.abs(g.u), dir = g.u > 0 ? 'right' : 'left', by = n ? `, then slid ${n} ${n === 1 ? 'place' : 'places'} ${dir}` : '';
  const turned = q.mode === 'playground' || q.tools.includes('turn') ? 'turned halfway' : 'flipped over the middle line and flipped across';
  const what = {slide: `slid ${n} ${n === 1 ? 'place' : 'places'} ${dir}`, flip: 'flipped over the middle line', glide: `flipped over the middle line${by}`, mirror: `flipped across${by}`, turn: `${turned}${by}`}[k];
  const P = periodOf(cell), L = linearOf(g), misses = footprints(cell).filter(({c, r, F}) => { const im = imageOf(P, g, c, r); return at(cell, im.c, im.r) !== (F ^ L); }).length;
  return `The copy is ${what}. ${fits(cell, g) ? 'It matches.' : `${misses} of the ${footprints(cell).length} Fs in each repeat miss.`}`;
}
// One short refusal per wrong claim. A family claim has one text whatever
// was wrong (the F or the form), and it never says the claim is false: some
// true claims have no one-F certificate (see the spec).
const WHY = {
  gap: 'There’s no F there.', there: 'It doesn’t land there.', fits: 'It lands on one like it.',
  class: 'It can’t land there.', nearer: 'There’s a nearer one.', short: 'That one is nearer than the copy went.',
  miss: 'That turn doesn’t match.'
};
const FAMILY_WHY = {turn: 'That doesn’t rule out every half-turn.', mirror: 'That doesn’t rule out every flip across.'};
export const whyText = (goal, why) => (isFamily(goal) ? FAMILY_WHY[goal.move] : WHY[why]);

const button = (label, action, cls, opt = {}) => `<button type="button" class="secondary fz-button ${cls}${opt.hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${opt.focus || `fz-${action.type}`}"${opt.aria ? ` aria-label="${esc(opt.aria)}"` : ''}${opt.enabled === false ? ' disabled' : ''}>${label}</button>`;
const uiButton = (label, payload, cls, opt = {}) => `<button type="button" class="secondary fz-button ${cls}${opt.hinted ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify(payload)}' data-focus="${opt.focus}"${opt.toggle ? ` data-toggle="${opt.toggle}"` : ''}${opt.aria ? ` aria-label="${esc(opt.aria)}"` : ''}${opt.pressed !== undefined ? ` aria-pressed="${opt.pressed}"` : ''}${opt.enabled === false ? ' disabled' : ''}>${label}</button>`;

function render(p, a) {
  const q = p.parameters, b = a.board, cell = b.cell, P = periodOf(cell), state = ui(p), {from, to} = windowOf(P);
  const play = q.mode === 'playground', done = solved(p, b);
  const editMode = play ? 'free' : q.edit;
  const claim = !play && !done && state.claim !== null && canClaim(q, b, state.claim) ? state.claim : null;
  if (state.claim !== null && claim === null) Object.assign(state, {claim: null, picks: []});
  const goal = claim !== null ? q.goals[claim] : null;
  const hinted = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null;
  let marks = '';
  for (const [c, r] of hinted?.slots || []) marks += ring(c, r, 'fz-hint');
  if (hinted?.point !== undefined) marks += `<circle class="fz-hint-point" cx="${hinted.point / 2 * SW}" cy="0" r="6"/>`;
  if (hinted?.frame) marks += `<rect class="fz-hint-frame" x="${hinted.frame.u * SW}" y="${-HALF}" width="${P * SW}" height="${2 * HALF}"/>`;
  if (state.held) marks += ring(state.held[0], state.held[1], 'fz-held');
  for (const pk of state.picks) if (Array.isArray(pk)) marks += ring(pk[0], pk[1], 'fz-pick');
  // The argument of the claim just judged right, or a refused turning point.
  let argument = '', copyOpt = {};
  const last = !play && b.last?.ok ? b.done.find(d => d.goal === b.last.goal) : null;
  if (last && claim === null) {
    const g0 = q.goals[last.goal], pk = last.pick;
    if (g0.type === 'cant' && !isFamily(g0)) {
      const g = cantStates(P, g0).find(h => { const im = imageOf(P, h, pk[0][0], pk[0][1]); return im.c === pk[1][0] && im.r === pk[1][1]; });
      argument = `<g class="fz-arg">${copyLayer(q, cell, g, {only: pk[1]})}${ring(pk[0][0], pk[0][1], 'fz-ring')}${ring(pk[1][0], pk[1][1], 'fz-ring bad')}</g>`;
      copyOpt.copyHidden = true;
    } else if (g0.type === 'cant') {
      argument = `<g class="fz-arg">${ring(pk[0][0], pk[0][1], 'fz-ring')}<rect class="fz-row-none" x="${from * SW}" y="${neededRow(g0, pk[0][1]) === 0 ? -HALF : 0}" width="${(to - from) * SW}" height="${HALF}"/></g>`;
    } else if (g0.type === 'shortest') {
      const [X, Y] = pk, y = (ROW_Y[X[1]] + ROW_Y[Y[1]]) / 2;
      argument = `<g class="fz-arg">${ring(X[0], X[1], 'fz-ring')}${ring(Y[0], Y[1], 'fz-ring')}<line class="fz-span" x1="${cx(X[0])}" y1="${y}" x2="${cx(Y[0])}" y2="${y}"/></g>`;
    } else if (g0.type === 'centre') {
      argument = `<g class="fz-arg">${copyLayer(q, cell, centreState(P, pk))}<circle class="fz-point good" cx="${pk / 2 * SW}" cy="0" r="4.5"/></g>`;
      copyOpt.copyHidden = true;
    }
  }
  const said = !play && b.last?.ok === false ? b.refused.at(-1) : null;
  if (said && claim === null && q.goals[said.goal].type === 'centre') {
    argument = `<g class="fz-arg">${copyLayer(q, cell, centreState(P, said.pick))}<circle class="fz-point bad" cx="${said.pick / 2 * SW}" cy="0" r="4.5"/></g>`;
    copyOpt.copyHidden = true;
  }
  // Tap targets: the cell's places when editing (taps on repeats edit the
  // cell too, by position), every place when pointing at a claim, and points
  // of the middle line for a turning point, each drawn as a dot so the
  // crossing is one choice among many. Places go row by row (the top row,
  // then the bottom), so the tab stop after an F is never where the flip
  // puts it; each place's target runs the full height of its half of the
  // board.
  let hits = '';
  if (goal?.type === 'centre') {
    for (let m2 = 2 * from + 1; m2 < 2 * to; m2++) {
      marks += `<circle class="fz-cand" cx="${m2 / 2 * SW}" cy="0" r="2.6"/>`;
      hits += `<rect class="fz-hit point" x="${m2 / 2 * SW - SW / 4}" y="${-HALF}" width="${SW / 2}" height="${2 * HALF}" data-fz-point="${m2}" data-focus="fz-point-${m2}" role="button" tabindex="0" aria-label="Turn round the point ${m2 % 2 ? `in the middle of place ${mod((m2 - 1) / 2, P) + 1}` : `between places ${mod(m2 / 2 - 1, P) + 1} and ${mod(m2 / 2, P) + 1}`}"/>`;
    }
  } else if (claim !== null || (!done && editMode !== 'none')) {
    const lo = claim !== null ? from : 0, hi = claim !== null ? to : P;
    for (let r = 0; r < 2; r++) for (let c = lo; c < hi; c++) {
      const F = at(cell, c, r), name = `${placeWords(mod(c, P), r)}${c < 0 || c >= P ? `, ${c < 0 ? 'a repeat to the left' : 'a repeat to the right'}` : ''}: ${F === null ? 'empty' : formWords(F)}`;
      hits += `<rect class="fz-hit" x="${c * SW}" y="${r === 0 ? -36 : 0}" width="${SW}" height="36" data-fz-slot="${c},${r}" data-focus="fz-slot-${c}-${r}" role="button" tabindex="0" aria-label="${esc(name)}"/>`;
    }
  }
  const svg = boardSvg(p, b, {label: 'Border and its copy', edit: !done && editMode !== 'none', marks, argument, hits, copyHidden: claim !== null || copyOpt.copyHidden});
  // Goals: a chip for each part, with Can't, Shortest or Turn here on claims.
  let goals = '';
  if (!play && (q.goals.length > 1 || q.goals.some(g => g.type !== 'match'))) {
    goals = `<div class="fz-goals">${q.goals.map((g, i) => {
      const ok = g.type === 'match' ? b.shown.includes(i) : isDone(b, i);
      const icon = moveIcon(g.type === 'centre' ? 'turn' : g.move, g.type === 'cant', g.type === 'cant' && g.move === 'slide' ? g.by : null);
      const name = g.type === 'match' ? (g.line ? 'Flip across the crossing line' : MOVE_WORDS[g.move]) : g.type === 'cant' ? `No ${g.move === 'slide' ? `slide of ${g.by}` : MOVE_WORDS[g.move].toLowerCase()}${isFamily(g) ? ' anywhere' : ''}` : g.type === 'shortest' ? `Shortest ${g.move}` : 'Where the half-turn goes round';
      const label = {cant: 'Can’t', shortest: 'Shortest', centre: 'Turn here'}[g.type];
      const btn = g.type === 'match' || ok || done ? '' : uiButton(label, {claim: claim === i ? null : i}, 'fz-claim', {focus: `fz-claim-${i}`, toggle: `fz-claim-${i}`, pressed: claim === i, enabled: canClaim(q, b, i), hinted: hinted?.button === `claim-${i}` && claim !== i});
      return `<div class="fz-goal${ok ? ' done' : ''}${g.type === 'cant' ? ' no' : ''}" role="group" aria-label="${esc(`${name}${ok ? ', done' : ''}`)}">${icon}${btn}</div>`;
    }).join('')}</div>`;
  }
  // The copy's buttons, and the forms (to place, or to name in a claim).
  let tools = '';
  if (!done) {
    const list = play ? TOOLS : q.tools;
    const copyButtons = list.map(t => button(moveIcon(t), {type: t}, `fz-tool fz-${t}`, {aria: {flip: 'Flip the copy over the middle line', mirror: 'Flip the copy across', turn: 'Turn the copy halfway round'}[t], focus: `fz-${t}`, hinted: hinted?.button === t, enabled: claim === null})).join('');
    let forms = '';
    if (editMode === 'free' || (goal && isFamily(goal))) {
      forms = `<div class="fz-forms" role="group" aria-label="Forms">${FORMS.map(F => {
        if (goal && isFamily(goal)) {
          const first = state.picks[0];
          return first ? button(formIcon(F, ''), {type: 'cant', goal: claim, pick: [first, F]}, 'fz-form', {aria: `${FORM_WORDS[F]} F`, focus: `fz-form-${F}`, hinted: hinted?.form === F}) : `<button type="button" class="secondary fz-button fz-form" disabled aria-label="${FORM_WORDS[F]} F" data-focus="fz-form-${F}">${formIcon(F, '')}</button>`;
        }
        return uiButton(formIcon(F, ''), {form: F}, 'fz-form', {aria: `${FORM_WORDS[F]} F`, focus: `fz-form-${F}`, pressed: state.form === F, enabled: claim === null, hinted: hinted?.action?.type === 'put' && hinted.action.form === F && state.form !== F});
      }).join('')}</div>`;
    }
    const periods = play ? `<div class="fz-periods" role="group" aria-label="Places that repeat">${PERIODS.map(n => { const b = button(String(n), {type: 'period', P: n}, 'fz-period', {aria: `Repeat every ${n} places`, focus: `fz-period-${n}`, enabled: n !== P}); return n === P ? b.replace(' disabled>', ' disabled aria-pressed="true">') : b; }).join('')}</div>` : '';
    tools = `${copyButtons || forms ? `<div class="fz-tools">${copyButtons ? `<div class="fz-copy-tools">${copyButtons}</div>` : ''}${forms}</div>` : ''}${periods}`;
  }
  const told = said && claim === null ? whyText(q.goals[said.goal], said.why) : '';
  const prompt = goal ? (goal.type === 'centre' ? 'Tap the point.' : isFamily(goal) ? 'Tap an F, then what it becomes.' : goal.type === 'cant' ? 'Tap an F, then where it lands.' : 'Tap an F, then the nearest one it can land on.') : '';
  // Why a claim is off when nothing else is said: a row is empty, or a
  // refusal stands on this board (after Undo, or coming back to it). When
  // every way left to finish is refused, the board says to Restart, even
  // beside the refusal just made (only refusals can do that).
  const stuckHint = !play && !done && claim === null && b.refused.length ? hint(p, b) : null;
  const stuck = stuckHint?.type === 'stuck' ? stuckHint.text : '';
  let why = '';
  if (stuck && !told) why = stuck;
  else if (!play && !done && !told && !prompt) {
    const waiting = q.goals.map((g, i) => i).filter(i => q.goals[i].type !== 'match' && !isDone(b, i));
    if (!bothRows(cell) && waiting.some(i => q.goals[i].type === 'cant' && b.tried.includes(tryKey(q.goals[i])))) why = 'A border needs an F in each row.';
    else if (waiting.some(i => lockedOn(q, b, i))) why = waiting.some(i => lockedOn(q, b, i) && q.goals[i].type === 'shortest') ? 'Shortest was refused with the copy here.' : 'A claim was refused on this border.';
  }
  const noteText = told && stuck ? `${told} ${stuck}` : told || prompt || why;
  const note = noteText ? `<p class="fz-told${why && !told && !prompt && !stuck ? ' fz-quiet' : ''}">${esc(noteText)}</p>` : '';
  const status = `${describeCell(cell)} ${claim === null ? describeCopy(q, cell, b.copy) : prompt}${told ? ` ${told}` : ''}${stuck && told ? ` ${stuck}` : ''}${why ? ` ${why}` : ''}${hinted?.text && a.hintLevel >= 2 && !stuck ? ` Hint: ${hinted.text}` : ''}`;
  return `<div class="fz-puzzle${done ? ' solved' : ''}${claim !== null ? ' claiming' : ''}${editMode !== 'none' && !done ? ' editing' : ''}" data-mechanic-wire="friezes">${goals}${svg}${note}${tools}<p class="sr-only" role="status">${esc(status.trim())}</p></div>`;
}

// --- Taps, drags and keys ---------------------------------------------------
// A drag along the board slides the copy, in whole places, its matches and
// misses updating as it goes; the slide is one move on release. A tap edits
// the cell (taps on repeats edit the place they repeat), picks up or puts
// down a footprint to move, or points at a claim. Arrow keys slide the copy.
let gesture = null, listening = false;
const svgPoint = (svg, x, y) => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const r = pt.matrixTransform(m.inverse()); return [r.x, r.y]; };
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  const dx = e.clientX - g.x;
  if (!g.dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(e.clientY - g.y) && g.canDrag) g.dragging = true;
  if (!g.dragging) return;
  const scale = g.svg.getScreenCTM?.()?.a || 1, b = g.api.attempt().board, P = periodOf(b.cell);
  const d = Math.max(-P - b.copy.u, Math.min(P - b.copy.u, Math.round(dx / scale / SW)));
  if (d === g.d) return;
  g.d = d;
  const layer = g.svg.querySelector('[data-fz-copy]');
  if (layer) layer.innerHTML = copyLayer(g.p.parameters, b.cell, {...b.copy, u: b.copy.u + d});
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  g.root.classList.remove('dragging');
  if (e.type !== 'pointerup') { g.api.ui({}); return; }
  if (g.dragging) { if (g.d) g.api.apply({type: 'slide', by: g.d}); else g.api.ui({}); return; }
  const pt = svgPoint(g.svg, e.clientX, e.clientY);
  if (pt) tap(g.p, g.api, pt);
}
// What a tap at board point [x, y] does.
function tap(p, api, [x, y]) {
  const q = p.parameters, b = api.attempt().board, P = periodOf(b.cell), state = ui(p), {from, to} = windowOf(P);
  if (solved(p, b)) return;
  const c = Math.floor(x / SW), r = y < 0 ? 0 : 1;
  if (state.claim !== null) {
    const goal = q.goals[state.claim];
    if (goal.type === 'centre') { const m2 = Math.max(2 * from + 1, Math.min(2 * to - 1, Math.round(x / (SW / 2)))); api.apply({type: 'centre', goal: state.claim, pick: m2}); return; }
    if (c < from || c >= to) return;
    // Any place is a tap, an F or a gap; the claim is judged when the last
    // tap is in. Tapping the first place again takes it back.
    const first = state.picks[0];
    if (!first || isFamily(goal)) {
      api.ui({picks: first && first[0] === c && first[1] === r ? [] : [[c, r]]});
      return;
    }
    if (first[0] === c && first[1] === r) { api.ui({picks: []}); return; }
    api.apply({type: goal.type, goal: state.claim, pick: [first, [c, r]]});
    return;
  }
  const mode = q.mode === 'playground' ? 'free' : q.edit, cc = mod(c, P);
  if (mode === 'free') {
    const F = b.cell[r][cc];
    api.apply(F === state.form ? {type: 'clear', c: cc, r} : {type: 'put', c: cc, r, form: state.form});
  } else if (mode === 'move') {
    const F = b.cell[r][cc], held = state.held;
    if (held && F === null) api.apply({type: 'shift', from: held, to: [cc, r]});
    else if (F !== null) api.ui({held: held && held[0] === cc && held[1] === r ? null : [cc, r]});
  }
}
function wire(root, p, api) {
  const svg = root.querySelector('[data-fz-board]');
  if (!svg) return;
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const b = api.attempt().board;
    if (solved(p, b)) return;
    gesture = {pointer: e.pointerId, svg, root, api, p, x: e.clientX, y: e.clientY, dragging: false, d: 0, canDrag: ui(p).claim === null};
  });
  svg.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const b = api.attempt().board;
    if (solved(p, b)) return;
    const dir = {ArrowRight: 1, ArrowLeft: -1}[e.key];
    if (dir && ui(p).claim === null) {
      e.preventDefault();
      const P = periodOf(b.cell);
      if (Math.abs(b.copy.u + dir) <= P) api.apply({type: 'slide', by: dir});
      return;
    }
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target.closest?.('[data-fz-slot],[data-fz-point]');
    if (!target) return;
    e.preventDefault();
    if (target.dataset.fzPoint !== undefined) { tap(p, api, [Number(target.dataset.fzPoint) / 2 * SW, 0]); return; }
    const [c, r] = target.dataset.fzSlot.split(',').map(Number);
    tap(p, api, [(c + 0.5) * SW, r === 0 ? -HALF / 2 : HALF / 2]);
  });
}

// Undo takes back a move, never a refusal: the board Undo goes back to gets
// every refusal made since (each is about its own board, so they all stay
// true), and the words of a refusal go.
function keepRefusals(p, from, to) {
  const q = p.parameters;
  Object.assign(ui(p), {claim: null, picks: [], held: null});
  if (q.mode === 'playground' || !object(from) || !object(to) || !Array.isArray(from.refused) || !Array.isArray(to.refused)) return to;
  if (JSON.stringify(from.refused) === JSON.stringify(to.refused)) return to;
  return {...to, refused: from.refused.map(r => ({...r})), last: to.last?.ok === true ? to.last : null};
}
// Restart starts the attempt over, refusals and all: the one way to clear a
// refusal, at the price of everything shown and claimed.
function restartClean(p) { Object.assign(ui(p), {claim: null, picks: [], held: null}); }
export const friezeMechanics = {
  friezes: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (FORMS.includes(payload.form)) state.form = payload.form;
      if ('held' in payload) state.held = Array.isArray(payload.held) ? payload.held : null;
      if ('claim' in payload) Object.assign(state, {claim: Number.isInteger(payload.claim) ? payload.claim : null, picks: []});
      if (Array.isArray(payload.picks)) state.picks = payload.picks;
    },
    reset: p => { uiState.delete(p.id); },
    carry: keepRefusals,
    carryOnRestart: (p, from, to) => { restartClean(p); return to; },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'friezes',
  family: {id: 'friezes', symbol: 'Ⅎ', area: 'geometry'},
  mechanics: friezeMechanics,
  pack: new URL('./friezes.json', import.meta.url).href,
  css: new URL('./friezes.css', import.meta.url).href,
  focus: '.fz-board,.fz-tool:not([disabled]),.fz-form:not([disabled])'
};
