// Mirror Couriers (mechanic `billiard`), reworked for Week 9 of the Bellingham
// math circle (bouncing paths): shape the room by dragging its corner, aim in
// the sheet of unfolded rooms by tapping a crossing, find every one-bounce
// room, and claim Can't with the corner map as the certificate. The spec is
// docs/couriers/README.md. dist/motion.js re-exports everything here, so the
// base mechanic keeps its place in motionMechanics.
//
// The geometry is pure and exported for the family's groups (Week 71's free
// aims start from aimAt, firstCrossing and unfoldLine): a ball leaves the
// bottom-left corner of a w × h room going `run` right for every `rise` up.
// Unfolded, its path is a straight line through mirror copies of the room; it
// stops at the first copy corner the line reaches, `across` rooms right and
// `up` rooms up. That corner folds onto the right wall when `across` is odd and
// onto the top when `up` is odd, and the ball has bounced once for every copy
// wall crossed on the way: across + up − 2 times.
import { esc } from './expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value);
const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const range = (min, max) => Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
const pair = value => Array.isArray(value) && value.length === 2 && value.every(integer);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const keyOf = point => `${point[0]},${point[1]}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const CORNERS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
export const HOME = 'bottom-left';
export const cornerName = corner => corner.replace('-', ' ');

/* ------------------------------------------------------------------ *
 * Geometry: exact, integer or fraction strings only.
 * ------------------------------------------------------------------ */

// The room corner that copy corner (across, up) folds onto.
export const foldCorner = (across, up) => `${up % 2 ? 'top' : 'bottom'}-${across % 2 ? 'right' : 'left'}`;
// The wall bounces of a ball that stops at copy corner (across, up): one for
// every copy wall crossed before it.
export const bouncesAt = (across, up) => across + up - 2;

// The first copy corner on the line from the start, in rooms across and up.
export function firstCrossing(width, height, rise = 1, run = 1) {
  const across = run * height, up = rise * width, g = gcd(across, up);
  return [across / g, up / g];
}
// Where and after how many bounces a launch stops.
export function launchOutcome(width, height, rise = 1, run = 1) {
  const [across, up] = firstCrossing(width, height, rise, run);
  return { corner: foldCorner(across, up), bounces: bouncesAt(across, up), across, up };
}
// The direction that aims at copy corner (across, up), in lowest terms.
export function aimAt(width, height, across, up) {
  const rise = up * height, run = across * width, g = gcd(rise, run);
  return { rise: rise / g, run: run / g };
}
// Aiming at copy corner (across, up): the ball stops at the first copy corner
// on that line, which is the aimed one only when across and up share no factor.
export function aimOutcome(width, height, across, up) {
  const { rise, run } = aimAt(width, height, across, up);
  return launchOutcome(width, height, rise, run);
}

const fraction = (numerator, denominator = 1) => {
  const g = gcd(Math.abs(numerator), denominator);
  return denominator / g === 1 ? String(numerator / g) : `${numerator / g}/${denominator / g}`;
};
export const fractionValue = value => { const [n, d = 1] = String(value).split('/').map(Number); return n / d; };
const foldFraction = (numerator, denominator, size) => {
  const remainder = numerator % (2 * size * denominator);
  return fraction(remainder <= size * denominator ? remainder : 2 * size * denominator - remainder, denominator);
};

// The unfolded line: the copy walls it crosses in order, as points on the
// sheet (fraction strings), and the rooms of the staircase it passes through.
// rooms[k] holds segment k, from points[k] to points[k + 1].
export function unfoldLine(width, height, rise = 1, run = 1) {
  if (![width, height, rise, run].every(value => integer(value) && value > 0 && value <= 1000)) throw new RangeError('Positive integer room and direction components are required.');
  const [across, up] = firstCrossing(width, height, rise, run);
  const points = [['0', '0']], rooms = [[0, 0]];
  let a = 1, b = 1;
  while (a < across || b < up) {
    // The line reaches x = a·width at time a·width/run and y = b·height at b·height/rise.
    if (a < across && (b >= up || a * width * rise < b * height * run)) {
      points.push([String(a * width), fraction(rise * a * width, run)]);
      rooms.push([a, rooms.at(-1)[1]]); a++;
    } else {
      points.push([fraction(run * b * height, rise), String(b * height)]);
      rooms.push([rooms.at(-1)[0], b]); b++;
    }
  }
  points.push([String(across * width), String(up * height)]);
  return { across, up, points, rooms };
}

// A point of the sheet folded into the room.
export const foldPoint = (width, height, [x, y]) => {
  const fold = (value, size) => { const [n, d = 1] = String(value).split('/').map(Number); return foldFraction(n, d, size); };
  return [fold(x, width), fold(y, height)];
};

// The bouncing path in the room, the launch corner and the stopping corner
// included, by folding the unfolded line.
export function simulateBilliard(width, height, rise = 1, run = 1) {
  const line = unfoldLine(width, height, rise, run);
  return { corner: foldCorner(line.across, line.up), bounces: bouncesAt(line.across, line.up), path: line.points.map(point => foldPoint(width, height, point)), roomsX: line.across, roomsY: line.up };
}

// How sheet room (a, b) maps onto the room: x ↦ sx·x + tx, y ↦ sy·y + ty.
export const foldMap = (width, height, a, b) => ({ sx: a % 2 ? -1 : 1, tx: a % 2 ? (a + 1) * width : -a * width, sy: b % 2 ? -1 : 1, ty: b % 2 ? (b + 1) * height : -b * height });

// The copy corners of a map `cols` rooms across and `rows` up, with where each
// folds and how many bounces a ball stopping there has made.
export function cornerMap(cols, rows) {
  return range(1, rows).flatMap(up => range(1, cols).map(across => ({ at: [across, up], corner: foldCorner(across, up), bounces: bouncesAt(across, up), first: gcd(across, up) === 1 })));
}

// Every room up to cols × rows where a launch meets the target.
export function roomsFor(q, target = q.target) {
  return range(1, q.rows).flatMap(h => range(1, q.cols).map(w => [w, h])).filter(([w, h]) => meets(launchOutcome(w, h, q.rise ?? 1, q.run ?? 1), target));
}
export const meets = (outcome, target) => outcome.corner === target.corner && (target.bounces === undefined || outcome.bounces === target.bounces);

// A target the ball can reach at all: some copy corner of its kind, first on
// its line, with the right number of bounces.
export function reachable(target) {
  if (target.corner === HOME) return false;
  if (target.bounces === undefined) return true;
  const sum = target.bounces + 2;
  return range(1, sum - 1).some(across => gcd(across, sum - across) === 1 && foldCorner(across, sum - across) === target.corner);
}

/* ------------------------------------------------------------------ *
 * Certificates for Can't.
 * ------------------------------------------------------------------ */

// With a bounce count n: every copy corner where a ball stops after n bounces
// is n + 2 rooms away (across + up), and none of them folds onto the target.
// The child taps those corners; corners on the line that are not first on
// their own line (the ball stops earlier) may be tapped or left out.
export const lineOf = (q, n = q.target.bounces) => cornerMap(...q.map).filter(c => c.bounces === n);
export function judgeLine(q, taps) {
  const n = q.target.bounces, off = taps.find(([i, j]) => bouncesAt(i, j) !== n);
  if (off) return { code: 'off', at: off };
  if (lineOf(q).some(c => c.first && !taps.some(t => same(t, c.at)))) return { code: 'another' };
  return { code: reachable(q.target) ? 'way' : 'accept' };
}
// Without a bounce count (only the start corner is impossible): a copy corner
// of the target's kind, then a crossing on the straight way to it, where the
// ball would stop first. Every start corner is an even number of rooms across
// and up, so halfway there is always such a crossing.
export const onTheWay = ([i, j], [x, y]) => x > 0 && y > 0 && x < i && x * j === y * i;
export function judgeHalf(q, [first, second]) {
  if (foldCorner(...first) !== q.target.corner) return { code: 'goal' };
  if (!onTheWay(first, second)) return { code: 'path' };
  return { code: reachable(q.target) ? 'way' : 'accept' };
}

/* ------------------------------------------------------------------ *
 * Saves.
 *   shape: {room, cert, told, way, done}   aim: {aim, done}
 *   cross: {tap, done}                     every: {room, kept, told, refused, done}
 * room is the last launched room [w, h]; cert the corners tapped after Can't;
 * told the refusal of the latest claim; way the lock after "There is a way."
 * ------------------------------------------------------------------ */
const KEYS = { shape: ['room', 'cert', 'told', 'way', 'done'], aim: ['aim', 'done'], cross: ['tap', 'done'], every: ['room', 'kept', 'told', 'refused', 'done'] };
const halfMode = q => q.target.bounces === undefined;
const inGrid = (q, r) => pair(r) && r[0] >= 1 && r[1] >= 1 && r[0] <= q.cols && r[1] <= q.rows;
const inMap = (q, c) => pair(c) && c[0] >= 1 && c[1] >= 1 && c[0] <= q.map[0] && c[1] <= q.map[1];
const inSheet = (q, c) => pair(c) && c[0] >= 1 && c[1] >= 1 && c[0] <= q.sheet[0] && c[1] <= q.sheet[1];
// Cross mode: every crossing of two copy walls on the sheet except the start.
const inCrossing = (q, c) => pair(c) && c[0] >= 0 && c[1] >= 0 && c[0] <= q.sheet[0] && c[1] <= q.sheet[1] && (c[0] > 0 || c[1] > 0);
const distinct = list => new Set(list.map(keyOf)).size === list.length;
const shelfKey = kept => kept.map(keyOf).sort().join(' ');
const roomOutcome = (q, [w, h]) => launchOutcome(w, h, q.rise ?? 1, q.run ?? 1);
export const crossAnswer = q => firstCrossing(q.width, q.height);
export const aimMeets = (q, aim) => meets(aimOutcome(q.width, q.height, ...aim), q.target);

export function judgeShelf(q, kept) {
  const off = kept.find(([w, h]) => roomOutcome(q, [w, h]).bounces !== q.bounces);
  if (off) return { code: 'off', at: off };
  return everyAnswer(q).every(r => kept.some(k => same(k, r))) ? { code: 'accept' } : { code: 'another' };
}
export const everyAnswer = q => range(1, q.rows).flatMap(h => range(1, q.cols).map(w => [w, h])).filter(r => roomOutcome(q, r).bounces === q.bounces);

function validTold(q, b) {
  const t = b.told;
  if (t === null) return true;
  if (!object(t)) return false;
  if (halfMode(q)) {
    if (!same(Object.keys(t).sort(), ['code', 'pair']) || !['goal', 'path'].includes(t.code) || !Array.isArray(t.pair) || t.pair.length !== 2 || !t.pair.every(c => inMap(q, c)) || same(t.pair[0], t.pair[1])) return false;
    return same(b.cert, []) && judgeHalf(q, t.pair).code === t.code;
  }
  if (!['off', 'another'].includes(t.code) || !Array.isArray(t.sel) || !t.sel.length || !t.sel.every(c => inMap(q, c)) || !distinct(t.sel)) return false;
  if (!same(Object.keys(t).sort(), t.code === 'off' ? ['at', 'code', 'sel'] : ['code', 'sel'])) return false;
  const verdict = judgeLine(q, t.sel);
  if (verdict.code !== t.code || (t.code === 'off' && !same(verdict.at, t.at))) return false;
  // A refusal clears the taps; Undo can bring the same taps back with it.
  return same(b.cert, []) || same(b.cert, t.sel);
}

function validShape(q, b) {
  if (b.room !== null && !inGrid(q, b.room)) return false;
  if (typeof b.way !== 'boolean' || typeof b.done !== 'boolean') return false;
  if (b.cert !== null && (!Array.isArray(b.cert) || b.cert.length > q.map[0] * q.map[1] || !b.cert.every(c => inMap(q, c)) || !distinct(b.cert))) return false;
  // Can't comes after a launch.
  if ((b.cert !== null || b.way || b.told !== null) && b.room === null) return false;
  if (b.told !== null && b.cert === null) return false;
  if (!validTold(q, b)) return false;
  if (b.way && (!reachable(q.target) || b.done || b.told !== null)) return false;
  const hit = b.room !== null && meets(roomOutcome(q, b.room), q.target);
  if (halfMode(q) && b.cert !== null && b.cert.length > (b.done ? 2 : 1)) return false;
  if (!b.done) return !(hit && b.cert === null);
  if (hit && b.cert === null) return b.told === null && !b.way;
  if (reachable(q.target) || b.cert === null || b.told !== null) return false;
  return halfMode(q) ? b.cert.length === 2 && judgeHalf(q, b.cert).code === 'accept' : judgeLine(q, b.cert).code === 'accept';
}

function validEvery(q, b) {
  if (b.room !== null && !inGrid(q, b.room)) return false;
  if (typeof b.done !== 'boolean' || !Array.isArray(b.kept) || !b.kept.every(r => inGrid(q, r)) || !distinct(b.kept)) return false;
  if (!Array.isArray(b.refused) || b.refused.length > 400 || !b.refused.every(k => typeof k === 'string') || new Set(b.refused).size !== b.refused.length) return false;
  // Every refused shelf really was a wrong claim.
  for (const key of b.refused) {
    const kept = key ? key.split(' ').map(s => s.split(',').map(Number)) : [];
    if (!kept.length || !kept.every(r => inGrid(q, r)) || shelfKey(kept) !== key || judgeShelf(q, kept).code === 'accept') return false;
  }
  const verdict = judgeShelf(q, b.kept);
  if (b.told !== null) {
    if (!object(b.told) || b.done || !b.refused.includes(shelfKey(b.kept)) || b.told.code !== verdict.code) return false;
    if (!same(Object.keys(b.told).sort(), verdict.code === 'off' ? ['at', 'code'] : ['code']) || (verdict.code === 'off' && !same(b.told.at, verdict.at))) return false;
  }
  return !b.done || (verdict.code === 'accept' && b.told === null);
}

export function validCourier(p, b) {
  const q = p.parameters;
  if (!object(b) || !KEYS[q.mode] || !same(Object.keys(b).sort(), [...KEYS[q.mode]].sort())) return false;
  if (q.mode === 'shape') return validShape(q, b);
  if (q.mode === 'every') return validEvery(q, b);
  if (typeof b.done !== 'boolean') return false;
  if (q.mode === 'aim') return (b.aim === null ? !b.done : inSheet(q, b.aim) && b.done === aimMeets(q, b.aim));
  return b.tap === null ? !b.done : inCrossing(q, b.tap) && b.done === same(b.tap, crossAnswer(q));
}

// A revision-1 save (the predict-and-launch menus): `{prediction}`, read only
// so that old saves load; storage.js then starts the reworked puzzle afresh.
export function legacyBilliardBoard(board) {
  if (!object(board) || !same(Object.keys(board), ['prediction'])) return false;
  const choice = board.prediction;
  if (choice === null) return true;
  if (!object(choice)) return false;
  const keys = Object.keys(choice).sort().join();
  if (keys === 'bounces,corner') return CORNERS.includes(choice.corner) && integer(choice.bounces) && choice.bounces >= 0 && choice.bounces <= 10000;
  if (keys === 'width') return integer(choice.width) && choice.width >= 1 && choice.width <= 1000;
  if (keys === 'rise,run') return integer(choice.rise) && integer(choice.run) && choice.rise >= 1 && choice.run >= 1 && choice.rise <= 1000 && choice.run <= 1000;
  return false;
}

/* ------------------------------------------------------------------ *
 * Moves.
 * ------------------------------------------------------------------ */
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'shape') return { room: null, cert: null, told: null, way: false, done: false };
  if (q.mode === 'every') return { room: null, kept: [], told: null, refused: [], done: false };
  if (q.mode === 'aim') return { aim: null, done: false };
  return { tap: null, done: false };
}

function moveShape(q, b, action) {
  if (action.type === 'launch') {
    if (!inGrid(q, action.room)) return null;
    return { room: [...action.room], cert: null, told: null, way: false, done: meets(roomOutcome(q, action.room), q.target) };
  }
  if (action.type === 'cant') {
    // After "There is a way." the map can still be closed, not reopened.
    if (b.room === null || (b.way && b.cert === null)) return null;
    return { ...b, cert: b.cert === null ? [] : null, told: null };
  }
  if (action.type === 'tap') {
    if (b.cert === null || b.way || !inMap(q, action.at)) return null;
    const at = [...action.at];
    if (halfMode(q)) {
      if (!b.cert.length) return { ...b, cert: [at], told: null };
      if (same(b.cert[0], at)) return { ...b, cert: [], told: null };
      const claim = [b.cert[0], at], verdict = judgeHalf(q, claim);
      if (verdict.code === 'accept') return { ...b, cert: claim, told: null, done: true };
      if (verdict.code === 'way') return { ...b, cert: null, told: null, way: true };
      return { ...b, cert: [], told: { code: verdict.code, pair: claim } };
    }
    const has = b.cert.some(c => same(c, at));
    return { ...b, cert: has ? b.cert.filter(c => !same(c, at)) : [...b.cert, at], told: null };
  }
  if (action.type === 'done') {
    if (halfMode(q) || b.cert === null || !b.cert.length || b.way || (b.told && same(b.told.sel, b.cert))) return null;
    const verdict = judgeLine(q, b.cert);
    if (verdict.code === 'accept') return { ...b, told: null, done: true };
    if (verdict.code === 'way') return { ...b, cert: null, told: null, way: true };
    // The refusal clears the taps; Undo brings them back with it.
    return { ...b, cert: [], told: verdict.code === 'off' ? { code: 'off', at: verdict.at, sel: b.cert } : { code: 'another', sel: b.cert } };
  }
  return null;
}

function moveEvery(q, b, action) {
  if (action.type === 'launch') return inGrid(q, action.room) ? { ...b, room: [...action.room] } : null;
  if (action.type === 'keep') {
    if (!inGrid(q, action.room)) return null;
    const has = b.kept.some(r => same(r, action.room));
    return { ...b, kept: has ? b.kept.filter(r => !same(r, action.room)) : [...b.kept, [...action.room]], told: null };
  }
  if (action.type === 'done') {
    if (!b.kept.length || b.refused.includes(shelfKey(b.kept))) return null;
    const verdict = judgeShelf(q, b.kept);
    if (verdict.code === 'accept') return { ...b, told: null, done: true };
    return { ...b, refused: [...b.refused, shelfKey(b.kept)], told: verdict.code === 'off' ? { code: 'off', at: verdict.at } : { code: 'another' } };
  }
  return null;
}

function move(p, b, action) {
  const q = p.parameters;
  if (!validCourier(p, b) || !object(action) || b.done) return null;
  if (q.mode === 'shape') return moveShape(q, b, action);
  if (q.mode === 'every') return moveEvery(q, b, action);
  if (q.mode === 'aim') return action.type === 'launch' && inSheet(q, action.aim) ? { aim: [...action.aim], done: aimMeets(q, action.aim) } : null;
  return action.type === 'tap' && inCrossing(q, action.at) ? { tap: [...action.at], done: same(action.at, crossAnswer(q)) } : null;
}

// Undo keeps a lock or a refusal: "There is a way." while the launched room is
// the same, a refused claim while the same corners (or shelf) come back.
function carry(p, from, to) {
  const q = p.parameters;
  if (!object(from) || !object(to) || to.done) return to;
  if (q.mode === 'every') return Array.isArray(from.refused) && Array.isArray(to.refused) ? { ...to, refused: [...new Set([...to.refused, ...from.refused])] } : to;
  if (q.mode !== 'shape') return to;
  if (from.way && same(from.room, to.room)) return { ...to, way: true, told: null };
  if (from.told?.sel && Array.isArray(to.cert) && same(to.cert, from.told.sel)) return { ...to, told: from.told };
  return to;
}

/* ------------------------------------------------------------------ *
 * Hints: one move each, from any board.
 * ------------------------------------------------------------------ */
const roomWords = ([w, h]) => `${w} wide and ${h} high`;
const cornerWords = ([i, j]) => `${plural(i, 'room')} across and ${j} up`;
const witnessRoom = q => roomsFor(q)[0];
// The aim a hint offers: the first answer in reading order.
export const aimAnswers = q => range(1, q.sheet[1]).flatMap(up => range(1, q.sheet[0]).map(across => [across, up])).filter(c => gcd(...c) === 1 && aimMeets(q, c));

function reason(q) {
  const t = q.target;
  if (halfMode(q)) return 'Every copy of the start corner is an even number of rooms across and an even number up. Halfway there is another crossing, and the ball stops at that one first.';
  // Crossing the room between the sides `across` times and between top and bottom `up`
  // times, the ball bounces at the end of every crossing but the last.
  const ways = { 'top-right': ['an odd', 'an odd', 'an even'], 'top-left': ['an even', 'an odd', 'an odd'], 'bottom-right': ['an odd', 'an even', 'an odd'] }[t.corner];
  return `To stop at the ${cornerName(t.corner)}, the ball crosses the room ${ways[0]} number of times between the sides and ${ways[1]} number of times between the top and the bottom. Each crossing but the last ends in a bounce, so it bounces ${ways[2]} number of times, and ${t.bounces} is ${t.bounces % 2 ? 'odd' : 'even'}.`;
}

function hintShape(q, b) {
  if (reachable(q.target)) {
    const room = witnessRoom(q);
    return { type: 'move', action: { type: 'launch', room }, text: `Make the room ${roomWords(room)}, then Launch.` };
  }
  if (b.room === null) return { type: 'move', action: { type: 'launch', room: [...q.start] }, text: `Make the room ${roomWords(q.start)} and Launch. Where does it stop, after how many bounces?` };
  if (b.cert === null) return { type: 'move', action: { type: 'cant' }, text: `${reason(q)} Press Can’t.` };
  if (halfMode(q)) {
    const first = b.cert[0];
    if (first && foldCorner(...first) !== HOME) return { type: 'move', action: { type: 'tap', at: first }, text: `Tap the corner ${cornerWords(first)} again to let it go.` };
    if (!first) return { type: 'move', action: { type: 'tap', at: [2, 2] }, text: `Tap the start corner ${cornerWords([2, 2])}.` };
    const half = first.map(v => v / 2);
    return { type: 'move', action: { type: 'tap', at: half }, text: `Tap the crossing halfway to it, ${cornerWords(half)}.` };
  }
  const verdict = judgeLine(q, b.cert);
  if (verdict.code === 'off') return { type: 'move', action: { type: 'tap', at: verdict.at }, text: `Tap the corner ${cornerWords(verdict.at)} to let it go: a ball stopping there bounced ${plural(bouncesAt(...verdict.at), 'time')}.` };
  const missing = lineOf(q).find(c => c.first && !b.cert.some(t => same(t, c.at)));
  if (missing) return { type: 'move', action: { type: 'tap', at: missing.at }, text: `Tap the corner ${cornerWords(missing.at)}: a ball stopping there bounced ${plural(q.target.bounces, 'time')}.` };
  return { type: 'move', action: { type: 'done' }, text: 'Press That’s all.' };
}

function hintEvery(q, b) {
  const answers = everyAnswer(q), wrong = b.kept.find(r => !answers.some(a => same(a, r)));
  if (wrong) return { type: 'move', action: { type: 'keep', room: wrong }, text: `Take the ${wrong[0]} × ${wrong[1]} room off: the ball bounces ${plural(roomOutcome(q, wrong).bounces, 'time')} there.` };
  const missing = answers.find(a => !b.kept.some(r => same(r, a)));
  if (missing) return { type: 'move', action: { type: 'keep', room: missing }, text: `Keep the room ${roomWords(missing)}.` };
  return { type: 'move', action: { type: 'done' }, text: 'Press That’s all.' };
}

function hint(p, b) {
  const q = p.parameters;
  if (!validCourier(p, b)) return { type: 'deadend', text: 'Start again to restore the mirror room.' };
  if (b.done) return { type: 'done' };
  if (q.mode === 'shape') return hintShape(q, b);
  if (q.mode === 'every') return hintEvery(q, b);
  if (q.mode === 'aim') {
    const aim = aimAnswers(q)[0];
    return { type: 'move', action: { type: 'launch', aim }, text: `Aim at the crossing ${cornerWords(aim)}, then Launch.` };
  }
  const at = crossAnswer(q);
  return { type: 'move', action: { type: 'tap', at }, text: `The line first meets a crossing ${cornerWords(at)}. Tap it.` };
}

/* ------------------------------------------------------------------ *
 * View-only state: the room being shaped, the chosen aim, the map cursor.
 * It follows the save whenever the save changes (a launch, Undo, Restart).
 * ------------------------------------------------------------------ */
const views = new Map();
function view(p, b) {
  const q = p.parameters, saved = q.mode === 'aim' ? b?.aim ?? null : b?.room ?? null, key = JSON.stringify(saved);
  let v = views.get(p.id);
  if (!v || v.seen !== key) {
    const room = q.mode === 'shape' || q.mode === 'every' ? (saved ? [...saved] : [...q.start]) : null;
    v = { seen: key, room, aim: q.mode === 'aim' ? saved : null, cursor: v?.cursor ?? null };
    views.set(p.id, v);
  }
  return v;
}
function ui(p, payload) {
  if (!object(payload)) return;
  const q = p.parameters, v = views.get(p.id);
  if (!v) return;
  if ((q.mode === 'shape' || q.mode === 'every') && inGrid(q, payload.room)) v.room = [...payload.room];
  if (q.mode === 'aim' && inSheet(q, payload.aim)) v.aim = [...payload.aim];
  if (pair(payload.cursor)) v.cursor = [...payload.cursor];
}
const reset = p => { views.delete(p.id); };

/* ------------------------------------------------------------------ *
 * Drawing.
 * ------------------------------------------------------------------ */
const U = 40, PAD = 22;
const num = value => Math.round(value * 100) / 100;
const CORNER_KIND = { 'top-left': 'tl', 'top-right': 'tr', 'bottom-left': 'home', 'bottom-right': 'br' };
// A copy corner's mark: its room corner's colour and shape (circle, square,
// triangle, diamond), so the map reads without colour too.
function cornerMark(corner, x, y, size, extra = '') {
  const kind = CORNER_KIND[corner], s = size;
  const shape = kind === 'home' ? `<circle cx="${num(x)}" cy="${num(y)}" r="${num(s)}"/>`
    : kind === 'tr' ? `<rect x="${num(x - s)}" y="${num(y - s)}" width="${num(2 * s)}" height="${num(2 * s)}"/>`
      : kind === 'tl' ? `<path d="M${num(x)} ${num(y - s * 1.2)}L${num(x + s * 1.15)} ${num(y + s * .85)}H${num(x - s * 1.15)}Z"/>`
        : `<path d="M${num(x)} ${num(y - s * 1.3)}L${num(x + s * 1.3)} ${num(y)}L${num(x)} ${num(y + s * 1.3)}L${num(x - s * 1.3)} ${num(y)}Z"/>`;
  return `<g class="cr-mark k-${kind}"${extra}>${shape}</g>`;
}
const legendCorner = corner => ({ 'top-left': 'top left', 'top-right': 'top right', 'bottom-left': 'start', 'bottom-right': 'bottom right' }[corner]);

// The room board: a grid of squares, the room from the start to its corner,
// the target ring, the launched path and (find every) the shelf as pins.
function roomBoard(p, b, v, attempt) {
  const q = p.parameters, [w, h] = v.room, W = q.cols, H = q.rows;
  const X = x => x * U, Y = y => (H - y) * U;
  const grid = [...range(0, W).map(x => `<line x1="${X(x)}" y1="${Y(0)}" x2="${X(x)}" y2="${Y(H)}"/>`), ...range(0, H).map(y => `<line x1="${X(0)}" y1="${Y(y)}" x2="${X(W)}" y2="${Y(y)}"/>`)].join('');
  const showPath = b.room !== null && same(b.room, v.room);
  const run = q.run ?? 1, rise = q.rise ?? 1;
  let path = '', stop = '';
  if (showPath) {
    const result = simulateBilliard(w, h, rise, run), pts = result.path.map(([x, y]) => `${num(X(fractionValue(x)))},${num(Y(fractionValue(y)))}`);
    path = `<g class="cr-flight" data-keep="cr-flight-${p.id}-${w}x${h}"><polyline class="cr-path" pathLength="1" points="${pts.join(' ')}"/>${pts.slice(1, -1).map(pt => { const [x, y] = pt.split(','); return `<circle class="cr-bounce" cx="${x}" cy="${y}" r="5"/>`; }).join('')}</g>`;
    const [sx, sy] = { 'top-left': [0, h], 'top-right': [w, h], 'bottom-right': [w, 0], 'bottom-left': [0, 0] }[result.corner];
    stop = cornerMark(result.corner, X(sx), Y(sy), 8, ' data-room="stop"');
  }
  const target = q.mode === 'shape' ? q.target.corner : null;
  const [tx, ty] = target ? { 'top-left': [0, h], 'top-right': [w, h], 'bottom-right': [w, 0], 'bottom-left': [0, 0] }[target] : [0, 0];
  const ring = target ? `<circle class="cr-target k-${CORNER_KIND[target]}" data-room="target" cx="${X(tx)}" cy="${Y(ty)}" r="17"/>` : '';
  const norm = Math.hypot(run, rise), arrowLen = 30;
  const arrow = `<g class="cr-arrow"><line x1="${X(0)}" y1="${Y(0)}" x2="${num(X(0) + arrowLen * run / norm)}" y2="${num(Y(0) - arrowLen * rise / norm)}"/><path d="M${num(X(0) + (arrowLen + 9) * run / norm)} ${num(Y(0) - (arrowLen + 9) * rise / norm)}L${num(X(0) + arrowLen * run / norm - 6 * rise / norm)} ${num(Y(0) - arrowLen * rise / norm - 6 * run / norm)}L${num(X(0) + arrowLen * run / norm + 6 * rise / norm)} ${num(Y(0) - arrowLen * rise / norm + 6 * run / norm)}Z"/></g>`;
  const pins = q.mode === 'every' ? b.kept.map(r => `<rect class="cr-pin${b.told?.code === 'off' && same(b.told.at, r) ? ' refused' : ''}" x="${X(r[0]) - 7}" y="${Y(r[1]) - 7}" width="14" height="14" rx="3"/>`).join('') : '';
  // One bounce: one side twice the other, the two lines through the shelf.
  const proof = q.mode === 'every' && b.done && q.bounces === 1 ? `<g class="cr-twice"><line x1="${X(0)}" y1="${Y(0)}" x2="${X(Math.min(W, H / 2))}" y2="${Y(Math.min(H, 2 * W))}"/><line x1="${X(0)}" y1="${Y(0)}" x2="${X(Math.min(W, 2 * H))}" y2="${Y(Math.min(H, W / 2))}"/></g>` : '';
  const hinted = attempt.hintLevel >= 2 && !b.done ? hint(p, b) : null;
  const mark = hinted?.type === 'move' && hinted.action.room ? `<circle class="cr-hinted" cx="${X(hinted.action.room[0])}" cy="${Y(hinted.action.room[1])}" r="22"/>` : '';
  const label = `Room ${w} wide and ${h} high.${target ? ` Goal: the ${legendCorner(target)} corner.` : ''}`;
  return `<svg class="cr-room-board" data-cr-room viewBox="${-PAD} ${-PAD} ${W * U + 2 * PAD} ${H * U + 2 * PAD}" role="group" aria-label="${esc(label)}">
<g class="cr-grid">${grid}</g>${proof}
<rect class="cr-room" data-room="rect" x="0" y="${Y(h)}" width="${X(w)}" height="${h * U}"/>
${pins}${path}${ring}${stop}${arrow}<circle class="cr-start" cx="0" cy="${Y(0)}" r="7"/>${mark}
<g class="cr-handle" data-room="handle" transform="translate(${X(w)} ${Y(h)})" role="slider" tabindex="0" data-focus="cr-corner" aria-label="Room corner" aria-valuetext="${w} wide, ${h} high" aria-valuenow="${w}" aria-valuemin="1" aria-valuemax="${W}"><circle r="15"/><path d="M-6 0h12M0 -6v12"/></g>
</svg>`;
}

const mapCursor = (q, v, taps) => (v.cursor && inMap(q, v.cursor) ? v.cursor : taps.at(-1) || [1, 1]);
// The corner map after Can't: one square per room, every copy corner marked
// by the room corner it folds onto.
function mapBoard(p, b, v, attempt) {
  const q = p.parameters, [I, J] = q.map, V = Math.min(36, Math.floor(330 / Math.max(I, J))), M = 22;
  const X = i => i * V, Y = j => (J - j) * V;
  const lines = [...range(0, I).map(i => `<line x1="${X(i)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(J)}"/>`), ...range(0, J).map(j => `<line x1="${X(0)}" y1="${Y(j)}" x2="${X(I)}" y2="${Y(j)}"/>`)].join('');
  const taps = b.cert || [], done = b.done, told = b.told;
  const mine = b.room ? firstCrossing(b.room[0], b.room[1], q.rise ?? 1, q.run ?? 1) : null;
  const hinted = attempt.hintLevel >= 2 && !done ? hint(p, b) : null;
  const cursor = mapCursor(q, v, taps);
  const ringed = told?.code === 'off' ? told.at : told?.pair ? told.pair[1] : null;
  const marks = cornerMap(I, J).map(c => {
    const [i, j] = c.at, x = X(i), y = Y(j), chosen = taps.some(t => same(t, c.at)), here = same(cursor, c.at);
    const cls = `cr-dot${chosen ? ' chosen' : ''}${ringed && same(ringed, c.at) ? ' refused' : ''}${hinted?.action?.at && same(hinted.action.at, c.at) ? ' hinted' : ''}`;
    const text = done && !halfMode(q) ? `<text class="cr-bounces${c.bounces === q.target.bounces ? ' on' : ''}" x="${x + 9}" y="${y - 7}">${c.bounces}</text>` : '';
    return `<g class="${cls}" data-at="${i},${j}" data-cx="${x}" data-cy="${y}" role="button" tabindex="${here ? 0 : -1}" data-focus="cr-at-${i}-${j}"${b.way ? ' aria-disabled="true"' : ''} aria-pressed="${chosen}" aria-label="${i} across, ${j} up, folds to the ${legendCorner(c.corner)}">${chosen ? `<circle class="cr-chosen" cx="${x}" cy="${y}" r="13"/>` : ''}${cornerMark(c.corner, x, y, 6)}${text}</g>`;
  }).join('');
  // After a right claim the whole argument: the claimed line as a band, and
  // (start corner) a ring halfway to every copy of the start, drawn on top.
  let proof = '', halves = '';
  if (done && halfMode(q)) {
    const [[i, j]] = b.cert;
    proof = `<line class="cr-proof" x1="${X(0)}" y1="${Y(0)}" x2="${X(i)}" y2="${Y(j)}"/>`;
    halves = `<g class="cr-halves">${cornerMap(I, J).filter(c => c.corner === HOME).map(c => `<line x1="${X(0)}" y1="${Y(0)}" x2="${X(c.at[0])}" y2="${Y(c.at[1])}"/><circle class="cr-half" cx="${X(c.at[0] / 2)}" cy="${Y(c.at[1] / 2)}" r="11"/>`).join('')}</g>`;
  } else if (done) {
    const line = lineOf(q);
    proof = `<line class="cr-proof" x1="${X(line[0].at[0])}" y1="${Y(line[0].at[1])}" x2="${X(line.at(-1).at[0])}" y2="${Y(line.at(-1).at[1])}"/>`;
  }
  const own = mine && mine[0] <= I && mine[1] <= J ? `<rect class="cr-mine" x="${X(mine[0]) - 15}" y="${Y(mine[1]) - 15}" width="30" height="30" rx="6"/>` : '';
  // The room itself, its corners marked as the copies are: start (hollow
  // circle), top left and bottom right; its top right is the dot at (1, 1).
  const room = `<rect class="cr-map-room" x="${X(0)}" y="${Y(1)}" width="${V}" height="${V}"/>${cornerMark('top-left', X(0), Y(1), 6)}${cornerMark('bottom-right', X(1), Y(0), 6)}${cornerMark(HOME, X(0), Y(0), 7)}`;
  return `<svg class="cr-map" data-cr-map data-reach="${V * .75}" viewBox="${-M} ${-M} ${I * V + 2 * M} ${J * V + 2 * M}" role="group" aria-label="Copies of the room, ${I} across and ${J} up">
<g class="cr-map-lines">${lines}</g>${room}${proof}${own}<circle class="cr-start" cx="0" cy="${Y(0)}" r="3.5"/>${marks}${halves}</svg>`;
}

// The sheet of copies (aim and cross) with the room above it. After a launch
// the line runs to its first crossing and the rooms it passed fold into the
// room, where the bouncing path stays.
function sheetLayout(q) {
  const [I, J] = q.sheet, SW = I * q.width, SH = J * q.height;
  const s = Math.min(340 / SW, 300 / SH), r = Math.min(150 / q.width, 104 / q.height);
  const top = q.height * r + 30, sheetX = (360 - SW * s) / 2;
  return { I, J, SW, SH, s, r, roomX: (360 - q.width * r) / 2, roomY: q.height * r + 8, sheetX, sheetY: top + SH * s, height: top + SH * s + 14 };
}
function sheetBoard(p, b, v, attempt) {
  const q = p.parameters, L = sheetLayout(q), { s, r } = L;
  const SX = x => num(L.sheetX + x * s), SY = y => num(L.sheetY - y * s), RX = x => num(L.roomX + x * r), RY = y => num(L.roomY - y * r);
  const fine = s >= 9 ? [...range(1, L.SW - 1).map(x => `<line x1="${SX(x)}" y1="${SY(0)}" x2="${SX(x)}" y2="${SY(L.SH)}"/>`), ...range(1, L.SH - 1).map(y => `<line x1="${SX(0)}" y1="${SY(y)}" x2="${SX(L.SW)}" y2="${SY(y)}"/>`)].join('') : '';
  const walls = [...range(0, L.I).map(i => `<line x1="${SX(i * q.width)}" y1="${SY(0)}" x2="${SX(i * q.width)}" y2="${SY(L.SH)}"/>`), ...range(0, L.J).map(j => `<line x1="${SX(0)}" y1="${SY(j * q.height)}" x2="${SX(L.SW)}" y2="${SY(j * q.height)}"/>`)].join('');
  const roomFine = r >= 9 ? [...range(1, q.width - 1).map(x => `<line x1="${RX(x)}" y1="${RY(0)}" x2="${RX(x)}" y2="${RY(q.height)}"/>`), ...range(1, q.height - 1).map(y => `<line x1="${RX(0)}" y1="${RY(y)}" x2="${RX(q.width)}" y2="${RY(y)}"/>`)].join('') : '';
  const cross = q.mode === 'cross';
  // What was launched: the aim, or (cross) the line's first crossing once found.
  const shot = cross ? (b.done ? crossAnswer(q) : null) : b.aim && same(b.aim, v.aim) ? b.aim : null;
  let flight = '', folded = '', outcome = null;
  if (shot) {
    const { rise, run } = aimAt(q.width, q.height, ...shot), line = unfoldLine(q.width, q.height, rise, run);
    outcome = launchOutcome(q.width, q.height, rise, run);
    const pts = line.points.map(([x, y]) => [fractionValue(x), fractionValue(y)]);
    const tiles = line.rooms.map(([a, c], k) => {
      const f = foldMap(q.width, q.height, a, c), kx = r * f.sx / s, ky = r * f.sy / s;
      const ex = num(L.roomX - kx * L.sheetX + r * f.tx), ey = num(L.roomY - ky * L.sheetY - r * f.ty);
      const [x1, y1] = pts[k], [x2, y2] = pts[k + 1];
      return `<g class="cr-tile" style="--kx:${num(kx)};--ky:${num(ky)};--ex:${ex}px;--ey:${ey}px;--k:${k}"><rect x="${SX(a * q.width)}" y="${SY((c + 1) * q.height)}" width="${num(q.width * s)}" height="${num(q.height * s)}"/><line x1="${SX(x1)}" y1="${SY(y1)}" x2="${SX(x2)}" y2="${SY(y2)}"/></g>`;
    }).join('');
    const end = pts.at(-1);
    // Aimed past an earlier crossing: the rest of the aimed line, faint.
    const rest = gcd(...shot) > 1 ? `<line class="cr-aim-rest" x1="${SX(end[0])}" y1="${SY(end[1])}" x2="${SX(shot[0] * q.width)}" y2="${SY(shot[1] * q.height)}"/>` : '';
    flight = `<g class="cr-unfold" data-keep="cr-unfold-${p.id}-${shot.join('-')}">${rest}<g class="cr-stair">${line.rooms.map(([a, c]) => `<rect x="${SX(a * q.width)}" y="${SY((c + 1) * q.height)}" width="${num(q.width * s)}" height="${num(q.height * s)}"/>`).join('')}</g><line class="cr-line" pathLength="1" x1="${SX(0)}" y1="${SY(0)}" x2="${SX(end[0])}" y2="${SY(end[1])}"/>${cornerMark(outcome.corner, SX(end[0]), SY(end[1]), 7)}<g class="cr-tiles" aria-hidden="true">${tiles}</g></g>`;
    const path = simulateBilliard(q.width, q.height, rise, run).path.map(([x, y]) => `${RX(fractionValue(x))},${RY(fractionValue(y))}`);
    folded = `<g class="cr-folded" style="--n:${line.rooms.length}" data-keep="cr-folded-${p.id}-${shot.join('-')}"><polyline class="cr-path" points="${path.join(' ')}"/>${path.slice(1, -1).map(pt => { const [x, y] = pt.split(','); return `<circle class="cr-bounce" cx="${x}" cy="${y}" r="3.5"/>`; }).join('')}</g>`;
  }
  const target = cross ? null : q.target.corner;
  const roomCorners = { 'top-left': [0, q.height], 'top-right': [q.width, q.height], 'bottom-right': [q.width, 0], 'bottom-left': [0, 0] };
  const ring = target ? `<circle class="cr-target k-${CORNER_KIND[target]}" cx="${RX(roomCorners[target][0])}" cy="${RY(roomCorners[target][1])}" r="11"/>` : '';
  const stopMark = outcome ? cornerMark(outcome.corner, RX(roomCorners[outcome.corner][0]), RY(roomCorners[outcome.corner][1]), 6) : '';
  const diagonal = cross ? (() => { const end = Math.min(L.SW, L.SH); return `<line class="cr-diagonal" x1="${SX(0)}" y1="${SY(0)}" x2="${SX(end)}" y2="${SY(end)}"/>`; })() : '';
  const hinted = attempt.hintLevel >= 2 && !b.done ? hint(p, b) : null, hintAt = hinted?.action?.aim || hinted?.action?.at;
  const chosen = cross ? b.tap : v.aim;
  const cursor = v.cursor && (cross ? inCrossing(q, v.cursor) : inSheet(q, v.cursor)) ? v.cursor : chosen || [1, 1];
  const points = range(cross ? 0 : 1, L.J).flatMap(j => range(cross ? 0 : 1, L.I).map(i => [i, j])).filter(c => c[0] || c[1]).map(c => {
    const [i, j] = c, x = SX(i * q.width), y = SY(j * q.height), on = chosen && same(chosen, c);
    const refused = cross && b.tap && !b.done && same(b.tap, c);
    return `<g class="cr-crossing${on ? ' chosen' : ''}${refused ? ' refused' : ''}${hintAt && same(hintAt, c) ? ' hinted' : ''}" data-at="${i},${j}" data-cx="${x}" data-cy="${y}" role="button" tabindex="${same(cursor, c) ? 0 : -1}" data-focus="cr-at-${i}-${j}" aria-pressed="${Boolean(on)}" aria-label="Crossing ${i} across, ${j} up"><circle class="cr-hit" cx="${x}" cy="${y}" r="${num(Math.max(8, Math.min(16, s * Math.min(q.width, q.height) / 2.2)))}"/><circle class="cr-pt" cx="${x}" cy="${y}" r="3.5"/></g>`;
  }).join('');
  const aimArrow = !cross && v.aim ? (() => { const { rise, run } = aimAt(q.width, q.height, ...v.aim), n = Math.hypot(run, rise), len = 26; return `<g class="cr-arrow"><line x1="${SX(0)}" y1="${SY(0)}" x2="${num(SX(0) + len * run / n)}" y2="${num(SY(0) - len * rise / n)}"/><circle cx="${num(SX(0) + len * run / n)}" cy="${num(SY(0) - len * rise / n)}" r="3.5"/></g>`; })() : '';
  const label = cross ? `Copies of a ${q.width} by ${q.height} room, ${L.I} across and ${L.J} up, with the ball's straight line drawn.` : `Room ${q.width} wide and ${q.height} high; goal: the ${legendCorner(target)} corner. Below, copies of the room, ${L.I} across and ${L.J} up.`;
  return `<svg class="cr-sheet-board" data-cr-sheet data-reach="${num(Math.max(14, .75 * s * Math.min(q.width, q.height)))}" viewBox="-6 -6 372 ${num(L.height + 12)}" role="group" aria-label="${esc(label)}">
<g class="cr-room-panel"><rect class="cr-room-paper" x="${RX(0)}" y="${RY(q.height)}" width="${num(q.width * r)}" height="${num(q.height * r)}"/><g class="cr-grid">${roomFine}</g><rect class="cr-room" x="${RX(0)}" y="${RY(q.height)}" width="${num(q.width * r)}" height="${num(q.height * r)}"/>${folded}${ring}${stopMark}<circle class="cr-start" cx="${RX(0)}" cy="${RY(0)}" r="5"/></g>
<g class="cr-sheet"><g class="cr-grid">${fine}</g><g class="cr-walls">${walls}</g>${diagonal}${flight}${aimArrow}<circle class="cr-start" cx="${SX(0)}" cy="${SY(0)}" r="6"/>${points}</g>
</svg>`;
}

const button = (label, action, cls = 'secondary', extra = '') => `<button type="button" class="${cls} expansion-action cr-button" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" ${extra}>${label}</button>`;

function told(q, b) {
  if (q.mode === 'shape') {
    if (b.way) return 'There is a way.';
    const t = b.told;
    if (!t) return '';
    if (t.code === 'off') return `This one isn’t ${plural(q.target.bounces, 'bounce')}.`;
    if (t.code === 'another') return 'There is another.';
    if (t.code === 'goal') return `That corner folds to the ${legendCorner(foldCorner(...t.pair[0]))}.`;
    return 'That isn’t on the way there.';
  }
  if (q.mode === 'every') return b.told ? (b.told.code === 'off' ? `This one doesn’t bounce ${q.bounces === 1 ? 'once' : `${q.bounces} times`}.` : 'There is another.') : '';
  if (q.mode === 'cross' && b.tap && !b.done) {
    const [i, j] = b.tap;
    return i * q.width !== j * q.height ? 'The line doesn’t go there.' : 'It stops before that.';
  }
  return '';
}

function render(p, attempt) {
  const q = p.parameters, b = attempt.board;
  if (!validCourier(p, b)) return '<div class="motion-board"><p>Start again to restore the mirror room.</p></div>';
  const v = view(p, b), note = told(q, b);
  let board = '', controls = '', result = '';
  if (q.mode === 'shape' || q.mode === 'every') {
    const mapOpen = q.mode === 'shape' && b.cert !== null;
    board = mapOpen ? mapBoard(p, b, v, attempt) : roomBoard(p, b, v, attempt);
    if (b.room && same(b.room, v.room) && !mapOpen) {
      const out = roomOutcome(q, b.room);
      result = `${cornerName(out.corner).replace(/^./, c => c.toUpperCase())} after ${plural(out.bounces, 'bounce')}.`;
    }
    const launch = button('Launch', { type: 'launch', room: v.room }, 'primary', `data-focus="cr-launch"${b.done ? ' disabled' : ''}`);
    if (q.mode === 'shape') {
      const cantOn = b.room !== null && !b.done && (!b.way || mapOpen);
      const thatsAll = mapOpen && !halfMode(q) ? button('That’s all', { type: 'done' }, 'secondary', `data-focus="cr-at-${mapCursor(q, v, b.cert).join('-')}"${b.cert.length && !(b.told && same(b.told.sel, b.cert)) && !b.done && !b.way ? '' : ' disabled'}`) : '';
      controls = `${mapOpen ? '' : launch}${button('Can’t', { type: 'cant' }, 'secondary', `aria-pressed="${mapOpen}" data-focus="${mapOpen ? 'cr-corner' : `cr-at-${mapCursor(q, v, []).join('-')}`}"${cantOn ? '' : ' disabled'}`)}${thatsAll}`;
    } else {
      const kept = b.kept.some(r => same(r, v.room)), allowed = b.kept.length && !b.refused.includes(shelfKey(b.kept)) && !b.done;
      controls = `${launch}${button('Keep', { type: 'keep', room: v.room }, 'secondary', `aria-pressed="${kept}" data-focus="cr-keep"${b.done ? ' disabled' : ''}`)}${button('That’s all', { type: 'done' }, 'secondary', `data-focus="cr-corner"${allowed ? '' : ' disabled'}`)}`;
    }
  } else {
    board = sheetBoard(p, b, v, attempt);
    if (q.mode === 'aim') {
      if (b.aim && same(b.aim, v.aim)) { const out = aimOutcome(q.width, q.height, ...b.aim); result = `${cornerName(out.corner).replace(/^./, c => c.toUpperCase())} after ${plural(out.bounces, 'bounce')}.`; }
      controls = button('Launch', { type: 'launch', aim: v.aim }, 'primary', `data-focus="cr-launch"${v.aim && !b.done ? '' : ' disabled'}`);
    }
  }
  const status = note || result;
  return `<div class="motion-board cr-board mode-${q.mode}" data-mechanic-wire="billiard">${board}<p class="cr-status${note ? ' cr-told' : ''}" role="status">${esc(status)}</p>${controls ? `<div class="cr-controls">${controls}</div>` : ''}</div>`;
}

/* ------------------------------------------------------------------ *
 * Gestures: drag or tap the room's corner; tap copy corners and crossings.
 * ------------------------------------------------------------------ */
function svgPoint(svg, x, y) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = new DOMPoint(x, y).matrixTransform(m.inverse());
  return [pt.x, pt.y];
}
// Taps go to the nearest target within reach, so a dense map or sheet still
// takes a finger and a tap between two dots goes to the closer one.
export function nearest(svg, x, y, selector) {
  const at = svgPoint(svg, x, y);
  if (!at) return null;
  let best = null, dist = Number(svg.dataset.reach) || Infinity;
  for (const node of svg.querySelectorAll(selector)) {
    const d = Math.hypot(Number(node.dataset.cx) - at[0], Number(node.dataset.cy) - at[1]);
    if (d < dist) { dist = d; best = node; }
  }
  return best;
}

// A claim on a possible board ("There is a way.") closes the corner map, so
// focus moves on to the room's corner instead of a dot that has gone.
const closesMap = (p, b, action) => p.parameters.mode === 'shape' && b.cert !== null && move(p, b, action)?.cert === null;

function wire(root, p, api) {
  const q = p.parameters;
  root.addEventListener('click', e => {
    const button = e.target.closest?.('button[data-move]');
    if (!button || button.disabled) return;
    let action = null;
    try { action = JSON.parse(button.dataset.move); } catch { return; }
    if (closesMap(p, api.attempt().board, action)) button.dataset.focus = 'cr-corner';
  }, true);
  const roomSvg = root.querySelector('[data-cr-room]');
  if (roomSvg) wireRoom(roomSvg, p, api);
  const map = root.querySelector('[data-cr-map]');
  if (map) wireDots(map, p, api, '.cr-dot', at => ({ type: 'tap', at }));
  const sheet = root.querySelector('[data-cr-sheet]');
  if (sheet) wireDots(sheet, p, api, '.cr-crossing', at => (q.mode === 'cross' ? { type: 'tap', at } : null));
}

function wireRoom(svg, p, api) {
  const q = p.parameters, W = q.cols, H = q.rows;
  const snap = (x, y) => { const at = svgPoint(svg, x, y); return at && [Math.max(1, Math.min(W, Math.round(at[0] / U))), Math.max(1, Math.min(H, Math.round(H - at[1] / U)))]; };
  const busy = () => api.attempt().board.done;
  // While dragging, the room follows the finger and the old path hides; the
  // path is drawn only by Launch.
  const show = ([w, h]) => {
    const rect = svg.querySelector('[data-room="rect"]'), handle = svg.querySelector('[data-room="handle"]');
    rect?.setAttribute('y', (H - h) * U); rect?.setAttribute('width', w * U); rect?.setAttribute('height', h * U);
    handle?.setAttribute('transform', `translate(${w * U} ${(H - h) * U})`);
    svg.querySelectorAll('.cr-flight,[data-room="stop"]').forEach(n => n.setAttribute('visibility', 'hidden'));
    const target = svg.querySelector('[data-room="target"]');
    if (target && q.target) { const [tx, ty] = { 'top-left': [0, h], 'top-right': [w, h], 'bottom-right': [w, 0], 'bottom-left': [0, 0] }[q.target.corner]; target.setAttribute('cx', tx * U); target.setAttribute('cy', (H - ty) * U); }
  };
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || busy()) return;
    const at = snap(e.clientX, e.clientY);
    if (!at) return;
    drag = { id: e.pointerId, at };
    svg.setPointerCapture?.(e.pointerId);
    show(at);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const at = snap(e.clientX, e.clientY);
    if (at && !same(at, drag.at)) { drag.at = at; show(at); }
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const at = drag.at;
    drag = null;
    if (e.type === 'pointercancel') { api.ui({}); return; }
    api.ui({ room: at });
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', e => {
    if (!e.target.closest?.('[data-room="handle"]') || busy() || e.altKey || e.ctrlKey || e.metaKey) return;
    const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const v = views.get(p.id), [w, h] = v?.room || q.start;
    api.ui({ room: [Math.max(1, Math.min(W, w + step[0])), Math.max(1, Math.min(H, h + step[1]))] });
  });
}

function wireDots(svg, p, api, selector, tapAction) {
  const q = p.parameters;
  const atOf = node => node?.dataset.at?.split(',').map(Number);
  const act = node => {
    const at = atOf(node);
    if (!at || api.attempt().board.done || node.getAttribute('aria-disabled') === 'true') return;
    const action = tapAction(at);
    if (!action) { api.ui({ aim: at, cursor: at }); return; }
    if (closesMap(p, api.attempt().board, action)) node.dataset.focus = 'cr-corner';
    else { const v = views.get(p.id); if (v) v.cursor = at; }
    api.apply(action);
  };
  let press = null;
  svg.addEventListener('pointerdown', e => { if (e.button > 0 || !e.isPrimary) return; press = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  svg.addEventListener('pointerup', e => {
    if (!press || e.pointerId !== press.id) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > 24;
    press = null;
    if (moved) return;
    const node = nearest(svg, e.clientX, e.clientY, selector);
    if (node) { e.preventDefault(); act(node); }
  });
  // Keyboard: one dot takes Tab; arrow keys move between dots, Enter or Space taps.
  svg.addEventListener('keydown', e => {
    const node = e.target.closest?.(selector);
    if (!node || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(node); return; }
    const step = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!step) return;
    e.preventDefault();
    const [i, j] = atOf(node), next = svg.querySelector(`${selector}[data-at="${i + step[0]},${j + step[1]}"]`);
    if (!next) return;
    node.setAttribute('tabindex', '-1'); next.setAttribute('tabindex', '0'); next.focus();
    const v = views.get(p.id);
    if (v) v.cursor = atOf(next);
    if (q.mode === 'aim') api.ui({ aim: atOf(next), cursor: atOf(next) });
  });
}

function help() { return ''; }

export const billiard = { fresh, valid: validCourier, solved: (p, b) => validCourier(p, b) && b.done === true, move, hint, render, wire, ui, reset, carry, help };
export const courierParts = { fresh, move, hint, judgeShelf, roomOutcome, view };
