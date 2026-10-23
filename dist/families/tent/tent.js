// Fold and stretch (worksheet Week 92, fold-and-stretch predictions), a
// group in Ruler strips. A marker on the track from 0 to 16 moves to twice
// its distance from the nearer end: the tent map T(x) = 2·min(x, 16 − x).
// Mirror starts x and 16 − x land together. A band of starts on one half
// doubles (reversed on the right half); a band across 8 reaches 16 and its
// lower end comes from the end farther from 8, so moving only the ends misses
// the turn, and no band ever lands narrower. [0, 2/2ⁿ] is the widest band
// from 0 that stays in [0, 2] for n moves, and a piece of width 16/2ⁿ fills
// the whole track on move n exactly when it is one of the 2ⁿ halving pieces.
//
// Positions are whole ticks of 1/32 unit, so the track is 0 to 512 ticks and
// every move stays exact. A puzzle's `step` is its grid: 32 (whole units), 16
// (halves) or 1 (thirty-seconds, on a ruler zoomed to 0 to 1).
// See docs/tent/README.md.
import {esc} from '../../expansion-controls.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sameKeys = (a, b) => Object.keys(a).sort().join() === Object.keys(b).sort().join();
export const MODES = ['pairs', 'break', 'width', 'fill', 'pieces', 'widest'];
export const UNIT = 32, TRACK = 16 * UNIT, MIDDLE = TRACK / 2;

// --- The move -------------------------------------------------------------------
export const tent = u => 2 * Math.min(u, TRACK - u);
export const after = (u, n) => { for (let k = 0; k < n; k++) u = tent(u); return u; };
export const pathOf = (u, n) => { const out = [u]; for (let k = 0; k < n; k++) out.push(tent(out[k])); return out; };
// A band's possible places after one move: an interval, reaching 16 when the
// band crosses the middle.
export const imageOf = ([lo, hi]) => lo <= MIDDLE && hi >= MIDDLE ? [Math.min(tent(lo), tent(hi)), TRACK] : [Math.min(tent(lo), tent(hi)), Math.max(tent(lo), tent(hi))];
export const bandsOf = (band, n) => { const out = [band]; for (let k = 0; k < n; k++) out.push(imageOf(out[k])); return out; };
const isFull = ([lo, hi]) => lo === 0 && hi === TRACK;
// The first move on which a band covers the whole track, up to `most` moves.
export function fullOn(band, most) {
  const all = bandsOf(band, most);
  const k = all.findIndex(isFull);
  return k < 0 ? null : k;
}
export const widthOf = ([lo, hi]) => hi - lo;
const onGrid = (q, u) => Number.isInteger(u) && u % q.step === 0;
export const rowsOf = q => q.mode === 'break' || q.mode === 'widest' ? q.moves : q.rows;

// --- Answers --------------------------------------------------------------------
const gridIn = (q, lo, hi) => { const out = []; for (let u = lo; u <= hi; u += q.step) out.push(u); return out; };
export const pairKey = ([x, y]) => `${x},${y}`;
// Every pair of different grid starts that land together after one move.
export function meetingPairs(q) {
  const out = [], all = gridIn(q, 0, TRACK);
  for (const x of all) for (const y of all) if (x < y && tent(x) === tent(y)) out.push([x, y]);
  return out;
}
// The lowest and highest landing of a claim's band on its grid, with every start reaching each.
export function landings(q) {
  const all = gridIn(q, q.band[0], q.band[1]).map(u => [u, after(u, q.moves)]);
  const lo = Math.min(...all.map(([, v]) => v)), hi = Math.max(...all.map(([, v]) => v));
  return {lo, hi, lowStarts: all.filter(([, v]) => v === lo).map(([u]) => u), highStarts: all.filter(([, v]) => v === hi).map(([u]) => u)};
}
const outside = (q, v) => v < q.window[0] || v > q.window[1];
export const breakers = q => gridIn(q, q.band[0], q.band[1]).filter(u => outside(q, after(u, q.moves)));
// A width goal [s, l]: the landing band is l/s times as wide as the start band.
export const meetsRatio = (band, [s, l]) => widthOf(band) > 0 && widthOf(imageOf(band)) * s === widthOf(band) * l;
export function ratioBands(q, goal) {
  const out = [], all = gridIn(q, 0, TRACK);
  for (const lo of all) for (const hi of all) if (lo < hi && meetsRatio([lo, hi], goal)) out.push([lo, hi]);
  return out;
}
export const fillBand = (q, lo) => [lo, lo + q.width];
export const fillStarts = (q, k) => gridIn(q, 0, TRACK - q.width).filter(lo => fullOn(fillBand(q, lo), rowsOf(q)) === k);
// Widest: a start escapes when some position in its first n moves leaves the window.
export const escapes = (q, u) => pathOf(u, q.moves).slice(1).some(v => outside(q, v));
export const widestEnd = q => Math.max(...gridIn(q, q.step, q.zoom).filter(hi => !gridIn(q, 0, hi).some(u => escapes(q, u))));
export function answersOf(q) {
  if (q.mode === 'pairs') return meetingPairs(q).map(pairKey);
  if (q.mode === 'pieces') return fillStarts(q, q.on);
  return null;
}

// --- Boards ---------------------------------------------------------------------
// pairs:  {at: [u, v], found, told, done}      break: {at, tried, cant, pins, told}
// width:  {band: [lo, hi], reached}            fill:  {lo, reached}
// pieces: {lo, found, told, done}              widest: {hi, at, claim, pins, told}
// A meeting pair, a band that fills on the goal move or a goal met is kept as
// soon as it happens, and Undo keeps it. That’s all is judged on the press; a
// wrong one says there is another and stays off until something new is kept.
// Can’t and Widest give no verdict: the pins are judged. A wrong pin is
// refused with `told`, the pins clear, and the refusal stays (through Undo)
// until the marker moves or a new pin goes in.
const TOLD = {pairs: ['more'], pieces: ['more'], break: ['lower', 'higher', 'outside'], widest: ['farther', 'outside', 'wider']};
const pinning = (q, b) => (q.mode === 'break' && b.cant) || (q.mode === 'widest' && b.claim);
const triedBand = (q, b) => b.hi !== q.start;
const middleOf = (q, hi) => Math.floor(hi / 2 / q.step) * q.step;
export function judge(q, b, pins) {
  if (q.mode === 'break') {
    const e = landings(q), v = pins.map(u => after(u, q.moves));
    if (Math.min(...v) > e.lo) return 'lower';
    if (Math.max(...v) < e.hi) return 'higher';
    if (outside(q, e.lo) || outside(q, e.hi)) return 'outside';
    return null;
  }
  const [u] = pins;
  if (u !== b.hi) return 'farther';
  if (escapes(q, b.hi)) return 'outside';
  if (after(b.hi, q.moves) < q.window[1]) return 'wider';
  return null;
}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'pairs') return {at: [...q.start], found: [], told: null, done: false};
  if (q.mode === 'break') return {at: q.start, tried: false, cant: false, pins: [], told: null};
  // A goal the starting band already meets shows as met, so the board's first
  // look explains what the goal pictures mean.
  if (q.mode === 'width') return credit(q, {band: [...q.start], reached: []});
  if (q.mode === 'fill') return credit(q, {lo: q.start, reached: []});
  if (q.mode === 'pieces') return {lo: q.start, found: [], told: null, done: false};
  return {hi: q.start, at: q.start, claim: false, pins: [], told: null};
}
const sortedUnique = (list, key = x => x) => list.every((x, i) => i === 0 || key(list[i - 1]) < key(x));
function validShelf(q, b, answers, key) {
  if (!Array.isArray(b.found) || typeof b.done !== 'boolean' || !(b.told === null || b.told === 'more')) return false;
  const keys = b.found.map(key);
  if (!keys.every(k => answers.includes(k)) || new Set(keys).size !== keys.length) return false;
  if (b.done && keys.length !== answers.length) return false;
  return !(b.told && (b.done || !keys.length || keys.length === answers.length));
}
function validPins(q, b) {
  if (!Array.isArray(b.pins) || b.pins.length > (q.mode === 'break' ? 2 : 1)) return false;
  const inBand = u => onGrid(q, u) && (q.mode === 'break' ? u >= q.band[0] && u <= q.band[1] : u >= 0 && u <= b.hi);
  if (!b.pins.every(inBand)) return false;
  if (b.pins.length && !pinning(q, b)) return false;
  const full = q.mode === 'break' ? 2 : 1;
  if (b.pins.length === full && judge(q, b, b.pins)) return false;
  return b.told === null || (TOLD[q.mode].includes(b.told) && pinning(q, b) && !b.pins.length);
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'pairs') {
    if (!sameKeys(b, {at: 0, found: 0, told: 0, done: 0}) || !Array.isArray(b.at) || b.at.length !== 2 || !b.at.every(u => onGrid(q, u) && u >= 0 && u <= TRACK)) return false;
    if (!b.found.every(f => Array.isArray(f) && f.length === 2 && f.every(Number.isInteger))) return false;
    return validShelf(q, b, answersOf(q), pairKey) && sortedUnique(b.found.map(pairKey), k => k.split(',').map(Number).reduce((t, v) => t * (TRACK + 1) + v, 0));
  }
  if (q.mode === 'pieces') {
    if (!sameKeys(b, {lo: 0, found: 0, told: 0, done: 0}) || !onGrid(q, b.lo) || b.lo < 0 || b.lo + q.width > TRACK) return false;
    return validShelf(q, b, answersOf(q), x => x) && sortedUnique(b.found);
  }
  if (q.mode === 'width') {
    if (!sameKeys(b, {band: 0, reached: 0}) || !Array.isArray(b.band) || b.band.length !== 2 || !b.band.every(u => onGrid(q, u) && u >= 0 && u <= TRACK) || b.band[0] > b.band[1]) return false;
    return Array.isArray(b.reached) && b.reached.every(i => Number.isInteger(i) && i >= 0 && i < q.goals.length) && sortedUnique(b.reached);
  }
  if (q.mode === 'fill') {
    if (!sameKeys(b, {lo: 0, reached: 0}) || !onGrid(q, b.lo) || b.lo < 0 || b.lo + q.width > TRACK) return false;
    return Array.isArray(b.reached) && b.reached.every(k => q.goals.includes(k)) && sortedUnique(b.reached);
  }
  if (q.mode === 'break') {
    if (!sameKeys(b, {at: 0, tried: 0, cant: 0, pins: 0, told: 0}) || typeof b.tried !== 'boolean' || typeof b.cant !== 'boolean') return false;
    if (!onGrid(q, b.at) || b.at < q.band[0] || b.at > q.band[1] || !validPins(q, b)) return false;
    return !b.cant || b.tried;
  }
  if (!sameKeys(b, {hi: 0, at: 0, claim: 0, pins: 0, told: 0}) || typeof b.claim !== 'boolean') return false;
  if (!onGrid(q, b.hi) || b.hi < q.step || b.hi > q.zoom || !onGrid(q, b.at) || b.at < 0 || b.at > b.hi || !validPins(q, b)) return false;
  // Before Widest the marker is the app's: the band's right end, which goes farthest.
  return b.claim ? triedBand(q, b) : b.at === b.hi;
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return false;
  if (q.mode === 'pairs' || q.mode === 'pieces') return b.done;
  if (q.mode === 'width' || q.mode === 'fill') return b.reached.length === q.goals.length;
  if (q.mode === 'break' && outside(q, after(b.at, q.moves))) return true;
  return pinning(q, b) && b.pins.length === (q.mode === 'break' ? 2 : 1);
}
// What a band or pair keeps as soon as it is made.
function credit(q, b) {
  if (q.mode === 'pairs') {
    const [x, y] = [...b.at].sort((s, t) => s - t);
    if (x === y || tent(x) !== tent(y) || b.found.some(f => f[0] === x && f[1] === y)) return b;
    const found = [...b.found, [x, y]].sort((f, g) => f[0] - g[0] || f[1] - g[1]);
    return {...b, found, told: null};
  }
  if (q.mode === 'pieces') {
    if (fullOn(fillBand(q, b.lo), rowsOf(q)) !== q.on || b.found.includes(b.lo)) return b;
    return {...b, found: [...b.found, b.lo].sort((s, t) => s - t), told: null};
  }
  if (q.mode === 'width') {
    const reached = q.goals.map((g, i) => i).filter(i => b.reached.includes(i) || meetsRatio(b.band, q.goals[i]));
    return {...b, reached};
  }
  if (q.mode === 'fill') {
    const k = fullOn(fillBand(q, b.lo), rowsOf(q)), reached = q.goals.filter(g => b.reached.includes(g) || g === k);
    return {...b, reached};
  }
  return b;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const {type} = action;
  if (type === 'set') {
    const v = action.at;
    if (!onGrid(q, v)) return null;
    if (q.mode === 'pairs') {
      const i = action.which;
      if (![0, 1].includes(i) || v < 0 || v > TRACK || b.at[i] === v) return null;
      const at = [...b.at]; at[i] = v;
      return credit(q, {...b, at});
    }
    if (q.mode === 'break') {
      if (v < q.band[0] || v > q.band[1] || v === b.at) return null;
      return {...b, at: v, tried: true, told: null};
    }
    if (q.mode === 'widest') {
      if (!b.claim || v < 0 || v > b.hi || v === b.at) return null;
      return {...b, at: v, told: null};
    }
    return null;
  }
  if (type === 'band') {
    const v = action.at;
    if (!onGrid(q, v)) return null;
    if (q.mode === 'width') {
      if (!['lo', 'hi'].includes(action.end) || v < 0 || v > TRACK) return null;
      const band = action.end === 'lo' ? [v, b.band[1]] : [b.band[0], v];
      if (band[0] > band[1] || band.join() === b.band.join()) return null;
      return credit(q, {...b, band});
    }
    if (q.mode === 'widest') {
      if (action.end !== 'hi' || v < q.step || v > q.zoom || v === b.hi) return null;
      return {hi: v, at: v, claim: false, pins: [], told: null};
    }
    return null;
  }
  if (type === 'slide') {
    const v = action.at;
    if ((q.mode !== 'fill' && q.mode !== 'pieces') || !onGrid(q, v) || v < 0 || v + q.width > TRACK || v === b.lo) return null;
    return credit(q, {...b, lo: v});
  }
  if (type === 'all' && (q.mode === 'pairs' || q.mode === 'pieces')) {
    if (!b.found.length || b.told) return null;
    return b.found.length === answersOf(q).length ? {...b, done: true} : {...b, told: 'more'};
  }
  if (type === 'cant' && q.mode === 'break' && b.tried && !b.cant) return {...b, cant: true, pins: [], told: null};
  // After Widest the marker starts halfway along the band, so the pin is not free.
  if (type === 'widest' && q.mode === 'widest' && !b.claim && triedBand(q, b)) return {...b, claim: true, at: middleOf(q, b.hi), pins: [], told: null};
  if (type === 'pin' && pinning(q, b)) {
    const pins = [...b.pins, b.at], full = q.mode === 'break' ? 2 : 1;
    if (pins.length < full) return {...b, pins, told: null};
    const wrong = judge(q, b, pins);
    return wrong ? {...b, pins: [], told: wrong} : {...b, pins, told: null};
  }
  return null;
}

// --- Words ----------------------------------------------------------------------
// A position in units: 7, 7½, 1/4 or 3/32.
export function fmt(u) {
  const w = Math.floor(u / UNIT), r = u % UNIT;
  if (!r) return String(w);
  let n = r, d = UNIT;
  while (n % 2 === 0) { n /= 2; d /= 2; }
  const part = d === 2 ? '½' : `${n}/${d}`;
  return w ? (d === 2 ? `${w}½` : `${w} ${part}`) : part;
}
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
export const movesWord = n => `${NUMBER_WORDS[n]} ${n === 1 ? 'move' : 'moves'}`;
const COLORS = ['yellow', 'blue'];

// --- Hints ----------------------------------------------------------------------
const nearest = (list, from, dist) => list.reduce((x, y) => dist(y, from) < dist(x, from) ? y : x);
function pinPlan(q, b) {
  if (q.mode === 'widest') {
    if (b.at !== b.hi) return {type: 'move', action: {type: 'set', at: b.hi}, text: 'Put the marker at the band’s right end.'};
    return {type: 'move', action: {type: 'pin'}, text: `This start lands farthest: on ${fmt(q.window[1])} after ${movesWord(q.moves)}.`};
  }
  // The pins are judged together, so a first pin that is in no certificate is
  // never called wrong (a dead end would show at once): the hint goes on to a
  // lowest or highest landing, and the pair is refused when the second goes in.
  const e = landings(q), extremes = [...e.lowStarts, ...e.highStarts];
  const want = !b.pins.length ? extremes : e.lowStarts.includes(b.pins[0]) ? e.highStarts : e.highStarts.includes(b.pins[0]) ? e.lowStarts : extremes;
  const target = nearest(want, b.at, (u, v) => Math.abs(u - v));
  if (target !== b.at) return {type: 'move', action: {type: 'set', at: target}, text: `${b.pins.length && want === extremes ? 'The two pins are checked together. ' : ''}Put the marker at ${fmt(target)}.`};
  return {type: 'move', action: {type: 'pin'}, text: `This start lands ${after(b.at, q.moves) === e.lo ? 'lowest' : 'highest'}.`};
}
function plan(p, b) {
  const q = p.parameters;
  if (q.mode === 'pairs') {
    const have = new Set(b.found.map(pairKey)), missing = meetingPairs(q).filter(f => !have.has(pairKey(f)));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: 'Every pair that lands together is on the shelf.'};
    // The missing pair needing the fewest marker moves, either way round.
    const cost = ([x, y]) => Math.min((b.at[0] !== x) + (b.at[1] !== y), (b.at[0] !== y) + (b.at[1] !== x));
    const [x, y] = missing.reduce((f, g) => cost(g) < cost(f) ? g : f);
    const [s, t] = (b.at[0] !== x) + (b.at[1] !== y) <= (b.at[0] !== y) + (b.at[1] !== x) ? [x, y] : [y, x];
    const i = b.at[0] !== s ? 0 : 1, v = i === 0 ? s : t;
    return {type: 'move', action: {type: 'set', which: i, at: v}, text: `Put the ${COLORS[i]} marker at ${fmt(v)}.`};
  }
  if (q.mode === 'pieces') {
    const missing = fillStarts(q, q.on).filter(lo => !b.found.includes(lo));
    if (!missing.length) return {type: 'move', action: {type: 'all'}, text: `Every band that is first full on move ${q.on} is on the shelf.`};
    const lo = nearest(missing, b.lo, (u, v) => Math.abs(u - v));
    return {type: 'move', action: {type: 'slide', at: lo}, text: `Put the band from ${fmt(lo)} to ${fmt(lo + q.width)}.`};
  }
  if (q.mode === 'fill') {
    const k = q.goals.find(g => !b.reached.includes(g)), lo = nearest(fillStarts(q, k), b.lo, (u, v) => Math.abs(u - v));
    return {type: 'move', action: {type: 'slide', at: lo}, text: `Put the band from ${fmt(lo)} to ${fmt(lo + q.width)}.`};
  }
  if (q.mode === 'width') {
    const i = q.goals.findIndex((g, n) => !b.reached.includes(n));
    const goal = nearest(ratioBands(q, q.goals[i]), b.band, (u, v) => Math.abs(u[0] - v[0]) + Math.abs(u[1] - v[1]));
    // Move the end that keeps the band in one piece first.
    const end = goal[0] !== b.band[0] && goal[0] <= b.band[1] ? 'lo' : 'hi';
    return {type: 'move', action: {type: 'band', end, at: goal[end === 'lo' ? 0 : 1]}, text: `Move the band’s ${end === 'lo' ? 'left' : 'right'} end to ${fmt(goal[end === 'lo' ? 0 : 1])}.`};
  }
  if (q.mode === 'widest') {
    const goal = widestEnd(q);
    if (b.hi !== goal) return {type: 'move', action: {type: 'band', end: 'hi', at: goal}, text: `Move the band’s right end to ${fmt(goal)}.`};
    if (b.claim) return pinPlan(q, b);
    // The reason, never "Press Widest": a second Hint marks the button.
    return {type: 'move', action: {type: 'widest'}, text: `From ${fmt(goal)} the band’s end lands exactly on ${fmt(q.window[1])} after ${movesWord(q.moves)}.`};
  }
  const e = landings(q), out = breakers(q);
  if (out.length) { const u = nearest(out, b.at, (s, t) => Math.abs(s - t)); return {type: 'move', action: {type: 'set', at: u}, text: `Put the marker at ${fmt(u)}.`}; }
  if (b.cant) return pinPlan(q, b);
  // Try the lowest landing first; its reason comes before Can’t.
  const low = nearest(e.lowStarts, b.at, (s, t) => Math.abs(s - t));
  if (!e.lowStarts.includes(b.at) || !b.tried) {
    const target = e.lowStarts.includes(b.at) ? nearest(e.highStarts, b.at, (s, t) => Math.abs(s - t)) : low;
    return {type: 'move', action: {type: 'set', at: target}, text: `Put the marker at ${fmt(target)}.`};
  }
  return {type: 'move', action: {type: 'cant'}, text: `The lowest landing is ${fmt(e.lo)} and the highest is ${fmt(e.hi)}, both inside the window.`};
}
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  return plan(p, b);
}

// --- Drawing --------------------------------------------------------------------
// One track from 0 to 16, U across a unit, row labels at the left. The start
// row on top holds the controls; each row below is one more move. In a widest
// puzzle the start row is the track from 0 to 1 drawn large, joined to its
// place on the track below.
const U = 10, LEFT = 14, RIGHT = 7, START_H = 18, ROW_H = 12, KEPT_H = 8, RULER_H = 15, ZOOM_H = 13, LINK_H = 9;
const W = LEFT + 16 * U + RIGHT;
const X = u => LEFT + u / UNIT * U;
const f = n => Number(n.toFixed(2));
const HANDLE_Y = 4.1 / START_H;
const zoomed = q => q.mode === 'widest';
const SX = (q, u) => zoomed(q) ? LEFT + u / q.zoom * 16 * U : X(u);
function layout(q) {
  let y = 4;
  const start = y; y += START_H;
  const zoom = zoomed(q) ? y : null;
  if (zoomed(q)) y += ZOOM_H + LINK_H;
  y += 5;
  const split = y - 3, rows = [];
  for (let k = 0; k < rowsOf(q); k++) { rows.push(y); y += ROW_H; }
  const kept = q.mode === 'break' || q.mode === 'widest' ? y : null;
  if (kept !== null) y += KEPT_H;
  return {start, zoom, split, rows, kept, ruler: y + 2, height: y + 2 + RULER_H};
}
const knob = (q, target, x, y, cls, label, min, max, now, hinted) => `<g class="tn-knob ${cls}${hinted ? ' hinted' : ''}" data-tn-target='${JSON.stringify({kind: target.kind, ...(target.which !== undefined ? {which: target.which} : {})})}' data-focus="tn-${target.kind}-${target.which ?? target.end ?? 0}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${f(min / UNIT)}" aria-valuemax="${f(max / UNIT)}" aria-valuenow="${f(now / UNIT)}" aria-valuetext="${fmt(now)}" transform="translate(${f(x)},${y})"><circle r="4.4"/></g>`;
const handle = (q, end, x, top, label, min, max, now, hinted) => `<g class="tn-handle${hinted ? ' hinted' : ''}" data-tn-target='${JSON.stringify({kind: 'band', end})}' data-focus="tn-band-${end}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="${f(min / UNIT)}" aria-valuemax="${f(max / UNIT)}" aria-valuenow="${f(now / UNIT)}" aria-valuetext="${fmt(now)}" transform="translate(${f(x)},${top})"><rect x="${end === 'lo' ? -5.2 : 0}" y="0.3" width="5.2" height="7.6" rx="1.8"/><line x1="0" y1="0.3" x2="0" y2="${START_H - 3}"/></g>`;
const bandRect = (x1, x2, y, h, cls) => `<rect class="${cls}" x="${f(x1)}" y="${y}" width="${f(Math.max(x2 - x1, 0.8))}" height="${h}" rx="1.5"/>`;
// The markers a board shows: [start, color class] pairs.
function markersOf(q, b) {
  if (q.mode === 'pairs') return b.at.map((u, i) => [u, i ? 'm-sky' : 'm-sun']);
  if (q.mode === 'break' || q.mode === 'widest') return [[b.at, 'm-ink']];
  return [];
}
// The band a board shows on its start row, or null.
function startBand(q, b) {
  if (q.mode === 'break') return q.band;
  if (q.mode === 'width') return b.band;
  if (q.mode === 'fill' || q.mode === 'pieces') return fillBand(q, b.lo);
  if (q.mode === 'widest') return [0, b.hi];
  return null;
}
// Which controls a board offers on its start row, as targets for a press.
export function targetsOf(q, b) {
  if (q.mode === 'pairs') return b.at.map((u, which) => ({kind: 'set', which, at: u, y: 0.5}));
  if (q.mode === 'break') return [{kind: 'set', at: b.at, y: 0.5}];
  if (q.mode === 'width') return [{kind: 'band', end: 'lo', at: b.band[0], dx: -0.2, y: HANDLE_Y}, {kind: 'band', end: 'hi', at: b.band[1], dx: 0.2, y: HANDLE_Y}];
  if (q.mode === 'fill' || q.mode === 'pieces') return [{kind: 'slide', at: b.lo + q.width / 2, y: 0.5}];
  const out = [{kind: 'band', end: 'hi', at: b.hi, dx: 0.2, y: HANDLE_Y}];
  if (b.claim) out.push({kind: 'set', at: b.at, y: 0.5});
  return out;
}
// The move a target makes when sent to position v (in ticks), held inside what it can reach.
export function actionFor(q, b, t, v) {
  const snap = u => Math.round(u / q.step) * q.step, clamp = (u, lo, hi) => Math.max(lo, Math.min(hi, u));
  if (t.kind === 'set') {
    if (q.mode === 'pairs') return {type: 'set', which: t.which, at: clamp(snap(v), 0, TRACK)};
    if (q.mode === 'break') return {type: 'set', at: clamp(snap(v), q.band[0], q.band[1])};
    return {type: 'set', at: clamp(snap(v), 0, b.hi)};
  }
  if (t.kind === 'slide') return {type: 'slide', at: clamp(snap(v - q.width / 2), 0, TRACK - q.width)};
  if (q.mode === 'widest') return {type: 'band', end: 'hi', at: clamp(snap(v), q.step, q.zoom)};
  return {type: 'band', end: t.end, at: t.end === 'lo' ? clamp(snap(v), 0, b.band[1]) : clamp(snap(v), b.band[0], TRACK)};
}
function drawBoard(p, b, view) {
  const q = p.parameters, L = layout(q), parts = [], n = rowsOf(q), last = L.rows[n - 1], top = L.rows[0], bottom = L.ruler, live = view.live, shown = view.shown;
  const mid = L.start + START_H / 2;
  // Faint unit lines through the result rows, then each row's label.
  // (through the start row too, unless it is drawn large)
  for (let v = 0; v <= 16; v++) parts.push(`<line class="tn-grid" x1="${X(v * UNIT)}" y1="${zoomed(q) ? top - 2 : L.start}" x2="${X(v * UNIT)}" y2="${bottom}"/>`);
  L.rows.forEach((y, k) => parts.push(`<text class="tn-rowlabel" x="${LEFT - 4}" y="${y + ROW_H / 2 + 2}">${k + 1}</text>`));
  // The claim's window: on the last row for a claim about landings, across
  // every row when every position must stay inside.
  if (q.window) {
    const bad = q.mode === 'break' ? outside(q, after(b.at, q.moves)) : escapes(q, b.at);
    const y1 = q.mode === 'break' ? last - 1 : top - 1, y2 = last + ROW_H + 1;
    const x1 = X(q.window[0]), x2 = X(q.window[1]);
    parts.push(`<rect class="tn-window${bad ? ' broken' : ''}" x="${f(x1 - (x1 === x2 ? 0.6 : 0))}" y="${y1}" width="${f(Math.max(x2 - x1, 1.2))}" height="${y2 - y1}"/>`);
  }
  // Bands: the start band on the start row, its possible places on every row.
  const band = startBand(q, b);
  if (band && q.mode !== 'break') {
    bandsOf(band, n).slice(1).forEach((img, k) => {
      const y = L.rows[k] + 2.5, full = isFull(img), first = full && (k === 0 || !isFull(bandsOf(band, k)[k]));
      parts.push(bandRect(X(img[0]), X(img[1]), y, ROW_H - 5, `tn-image${full ? ' full' : ''}${first ? ' first' : ''}`));
    });
  }
  parts.push(`<line class="tn-split" x1="${LEFT - 4}" y1="${L.split}" x2="${W - 3}" y2="${L.split}"/>`);
  if (band) parts.push(bandRect(SX(q, band[0]), SX(q, band[1]), L.start + 3, START_H - 6, q.mode === 'break' ? 'tn-band' : 'tn-set'));
  // Each marker's path: a line from its start through its place after each move.
  for (const [u, cls] of markersOf(q, b)) {
    const pts = pathOf(u, n), xy = [[SX(q, u), mid], ...pts.slice(1).map((v, k) => [X(v), L.rows[k] + ROW_H / 2])];
    if (zoomed(q)) xy.splice(1, 0, [X(u), L.rows[0] - 3]);
    parts.push(`<polyline class="tn-path ${cls}" points="${xy.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')}"/>`);
    pts.slice(1).forEach((v, k) => {
      const bad = q.window && (q.mode === 'widest' || k === n - 1) && outside(q, v);
      parts.push(`<circle class="tn-dot ${cls}${bad ? ' broken' : ''}" cx="${f(X(v))}" cy="${L.rows[k] + ROW_H / 2}" r="2.1"/>`);
    });
  }
  // Two markers that land together are ringed.
  if (q.mode === 'pairs' && b.at[0] !== b.at[1] && tent(b.at[0]) === tent(b.at[1])) parts.push(`<circle class="tn-meet" cx="${f(X(tent(b.at[0])))}" cy="${L.rows[0] + ROW_H / 2}" r="4.2"/>`);
  // The zoomed start row: its own small ruler from 0 to 1, joined to 0 and 1 on the track.
  if (zoomed(q)) {
    const zy = L.zoom + 1;
    parts.push(`<line class="tn-ruler" x1="${SX(q, 0)}" y1="${zy}" x2="${SX(q, q.zoom)}" y2="${zy}"/>`);
    for (let u = 0; u <= q.zoom; u += q.step) {
      const major = u % (q.zoom / 4) === 0;
      parts.push(`<line class="tn-tick${major ? '' : ' minor'}" x1="${f(SX(q, u))}" y1="${zy}" x2="${f(SX(q, u))}" y2="${zy + (major ? 3 : 1.6)}"/>`);
      if (major) parts.push(`<text class="tn-mark" x="${f(SX(q, u))}" y="${zy + 9}">${u === q.zoom / 2 ? '1/2' : fmt(u)}</text>`);
    }
    parts.push(`<path class="tn-link" d="M${SX(q, 0)} ${zy + 10.5}L${X(0)} ${top - 2}M${SX(q, q.zoom)} ${zy + 10.5}L${X(q.zoom)} ${top - 2}"/>`);
  }
  // Pins: a mark on the start row at each pinned start, a pin under the last row at its landing.
  if (L.kept !== null) {
    const y = L.kept + 3, lands = b.pins.map(u => after(u, q.moves));
    if (b.pins.length === 2) parts.push(`<g class="tn-span"><rect x="${X(Math.min(...lands))}" y="${y}" width="${f(Math.max(Math.abs(X(lands[0]) - X(lands[1])), 0.8))}" height="2"/></g>`);
    for (const [k, u] of b.pins.entries()) {
      parts.push(`<line class="tn-pinmark" x1="${f(SX(q, u))}" y1="${L.start + 1}" x2="${f(SX(q, u))}" y2="${L.start + START_H - 1}"/>`);
      parts.push(`<path class="tn-pin" d="M${f(X(lands[k]))} ${y - 2.5}l3.2 6h-6.4z"/>`);
    }
  }
  // The start row's controls, and a hit area over the whole row: a press goes to the nearest control.
  const targets = live ? targetsOf(q, b) : [];
  if (targets.length) parts.push(`<rect class="tn-hit" data-tn-row="start" x="0" y="${L.start}" width="${W}" height="${START_H}"/>`);
  if (shown && ['set', 'band', 'slide'].includes(shown.type)) {
    const at = shown.type === 'slide' ? shown.at + q.width / 2 : shown.at;
    parts.push(`<line class="tn-aim" x1="${f(SX(q, at))}" y1="${L.start + 1}" x2="${f(SX(q, at))}" y2="${L.start + START_H - 1}"/>`);
  }
  const lit = t => shown && shown.type === (t.kind === 'slide' ? 'slide' : t.kind) && (shown.which === undefined || shown.which === t.which) && (shown.end === undefined || shown.end === t.end);
  for (const t of targets) {
    if (t.kind === 'band') {
      const [min, max] = q.mode === 'widest' ? [q.step, q.zoom] : t.end === 'lo' ? [0, b.band[1]] : [b.band[0], TRACK];
      parts.push(handle(q, t.end, SX(q, t.at), L.start, `The band’s ${t.end === 'lo' ? 'left' : 'right'} end`, min, max, t.at, lit(t)));
    } else if (t.kind === 'slide') {
      parts.push(knob(q, t, X(t.at), mid, 'm-band', 'The band', q.width / 2, TRACK - q.width / 2, b.lo, lit(t)));
    } else {
      const [cls, label] = q.mode === 'pairs' ? [t.which ? 'm-sky' : 'm-sun', `The ${COLORS[t.which]} marker`] : ['m-ink', 'The marker'];
      const [min, max] = q.mode === 'pairs' ? [0, TRACK] : q.mode === 'break' ? q.band : [0, b.hi];
      parts.push(knob(q, t, SX(q, t.at), mid, cls, label, min, max, t.at, lit(t)));
    }
  }
  // A marker that is not a control (before Widest, or after a solve) shows as an end mark.
  for (const [u, cls] of markersOf(q, b)) if (!targets.some(t => t.kind === 'set')) parts.push(`<line class="tn-endmark ${cls}" x1="${f(SX(q, u))}" y1="${mid - 5}" x2="${f(SX(q, u))}" y2="${mid + 5}"/>`);
  parts.push(`<line class="tn-ruler" x1="${X(0)}" y1="${bottom}" x2="${X(TRACK)}" y2="${bottom}"/>`);
  for (let v = 0; v <= 16; v++) parts.push(`<line class="tn-tick" x1="${X(v * UNIT)}" y1="${bottom}" x2="${X(v * UNIT)}" y2="${bottom + 3}"/><text class="tn-mark" x="${X(v * UNIT)}" y="${bottom + 10}">${v}</text>`);
  return parts.join('');
}
function goalsView(q, b) {
  if (q.mode === 'width') {
    return `<div class="tn-goals" role="list" aria-label="Goals">${q.goals.map(([s, l], i) => {
      const met = b.reached.includes(i), k = 9;
      return `<div class="tn-goal${met ? ' met' : ''}" role="listitem"><svg viewBox="0 0 ${l * k + 4} 15" width="${(l * k + 4) * 2.4}" height="36" role="img" aria-label="A band that lands ${s === l ? 'just as wide' : `${l} for every ${s} it was wide`}${met ? ', made' : ''}"><rect class="tn-set" x="2" y="1.5" width="${s * k}" height="5" rx="1"/><rect class="tn-image" x="2" y="8.5" width="${l * k}" height="5" rx="1"/></svg>${met ? '<span class="tn-check" aria-hidden="true">✓</span>' : ''}</div>`;
    }).join('')}</div>`;
  }
  if (q.mode === 'fill') {
    return `<div class="tn-goals" role="list" aria-label="Goals">${q.goals.map(k => {
      const met = b.reached.includes(k);
      return `<div class="tn-goal tn-goal-text${met ? ' met' : ''}" role="listitem">First full on move ${k}${met ? '<span class="tn-check" aria-hidden="true"> ✓</span>' : ''}</div>`;
    }).join('')}</div>`;
  }
  return '';
}
function shelfView(q, b, now) {
  if (q.mode === 'pairs') {
    if (!b.found.length) return '';
    return `<ul class="tn-shelf" aria-label="Pairs found">${b.found.map(([x, y]) => `<li class="tn-item${now === pairKey([x, y]) ? ' now' : ''}">${fmt(x)} and ${fmt(y)}</li>`).join('')}</ul>`;
  }
  if (q.mode === 'pieces') {
    if (!b.found.length) return '';
    return `<ul class="tn-shelf" aria-label="Bands found">${b.found.map(lo => `<li class="tn-item tn-piece${now === lo ? ' now' : ''}"><svg viewBox="0 0 66 8" width="132" height="16" role="img" aria-label="${fmt(lo)} to ${fmt(lo + q.width)}"><line class="tn-mini" x1="1" y1="5" x2="65" y2="5"/><rect class="tn-set" x="${f(1 + lo / TRACK * 64)}" y="2" width="${f(q.width / TRACK * 64)}" height="6" rx="0.8"/></svg></li>`).join('')}</ul>`;
  }
  return '';
}
function describe(q, b, done) {
  if (q.mode === 'pairs') return `Markers at ${fmt(b.at[0])} and ${fmt(b.at[1])}, landing at ${fmt(tent(b.at[0]))} and ${fmt(tent(b.at[1]))}. ${b.found.length ? `Pairs found: ${b.found.map(([x, y]) => `${fmt(x)} and ${fmt(y)}`).join('; ')}.` : ''}${done ? ' Every pair is found.' : ''}`.trim();
  const band = startBand(q, b), n = rowsOf(q);
  const bands = band ? bandsOf(band, n).map(([lo, hi], k) => `${k ? `after ${movesWord(k)}` : 'start'} ${fmt(lo)} to ${fmt(hi)}`).join(', ') : '';
  if (q.mode === 'break' || q.mode === 'widest') {
    const pts = pathOf(b.at, n).slice(1).map(fmt).join(', then ');
    const pins = b.pins.length ? ` Pinned: ${b.pins.map(u => `${fmt(u)}, landing at ${fmt(after(u, q.moves))}`).join('; ')}.` : '';
    return `${q.mode === 'widest' ? `Band 0 to ${fmt(b.hi)}. ` : ''}Marker at ${fmt(b.at)}; it lands at ${pts}.${pins}`;
  }
  return `Band: ${bands}.${b.reached?.length ? ` Goals made: ${b.reached.length} of ${q.goals.length}.` : ''}${q.mode === 'pieces' && b.found.length ? ` Bands found: ${b.found.map(lo => `${fmt(lo)} to ${fmt(lo + q.width)}`).join('; ')}.` : ''}`;
}
const moveButton = (label, action, enabled, hinted, home, primary = false) => `<button type="button" class="${primary ? 'primary' : 'secondary'} tn-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="${home}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const TOLD_WORDS = {lower: 'A start lands lower.', higher: 'A start lands higher.', outside: 'A start lands outside.', farther: 'A start lands farther.', wider: 'The band can be wider.', more: 'There is another.'};
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b);
  const shown = a.hintLevel >= 2 && !done ? plan(p, b)?.action : null;
  const L = layout(q), live = !done;
  const svg = `<svg class="tn-board" data-tn-board viewBox="0 0 ${W} ${f(L.height)}" style="--tn-aspect:${f(W / L.height)}" role="group" aria-label="A track from 0 to 16 and where everything is after each move"><g class="tn-live">${drawBoard(p, b, {live, shown})}</g></svg>`;
  const home = svg.match(/data-focus="(tn-[a-z]+-[a-z0-9]+)"/)?.[1] || 'tn-board';
  let bar = '';
  if (!done && (q.mode === 'pairs' || q.mode === 'pieces')) bar = moveButton('That’s all', {type: 'all'}, b.found.length > 0 && !b.told, shown?.type === 'all', home);
  if (q.mode === 'break' && !done && !b.cant) bar = moveButton('Can’t', {type: 'cant'}, b.tried, shown?.type === 'cant', home);
  if (q.mode === 'widest' && !done && !b.claim) bar = moveButton('Widest', {type: 'widest'}, triedBand(q, b), shown?.type === 'widest', home);
  if (!done && pinning(q, b)) bar = moveButton('Pin', {type: 'pin'}, true, shown?.type === 'pin', home);
  let note = '';
  if (done) note = '';
  else if (b.told) note = TOLD_WORDS[b.told];
  else if (q.mode === 'break' && b.cant && !b.pins.length) note = 'Pin the lowest and the highest landing.';
  else if (q.mode === 'widest' && b.claim && !b.pins.length) note = 'Pin the start that lands farthest.';
  // The pair or band just kept is ringed on the shelf.
  const now = q.mode === 'pairs' ? (b.at[0] !== b.at[1] && tent(b.at[0]) === tent(b.at[1]) ? pairKey([...b.at].sort((s, t) => s - t)) : null) : q.mode === 'pieces' && b.found.includes(b.lo) ? b.lo : null;
  return `<div class="tn-puzzle mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="tent">${goalsView(q, b)}${svg}${bar ? `<div class="tn-bar">${bar}</div>` : ''}${note ? `<p class="tn-note">${esc(note)}</p>` : ''}${shelfView(q, b, now)}<p class="sr-only" role="status">${esc(describe(q, b, done))}</p></div>`;
}

// --- Drags, taps and keys -------------------------------------------------------
// A press on the start row goes to the nearest control there; dragging moves
// it and the board follows; letting go makes one move (one Undo). A tap moves
// it to the tapped place. Arrow keys move a focused control one grid step;
// Home and End go to the ends of its reach.
export function targetsNear(q, b, v, y) {
  const d = t => Math.hypot((t.at - v) / UNIT * (zoomed(q) ? 16 * UNIT / q.zoom : 1) + (t.dx || 0), (t.y - y) * START_H / U);
  return targetsOf(q, b).sort((s, t) => d(s) - d(t));
}
let gesture = null, listening = false;
function tickAt(svg, q, x, y) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const r = pt.matrixTransform(m.inverse()), units = (r.x - LEFT) / (16 * U);
  return {v: units * (zoomed(q) ? q.zoom : TRACK), y: r.y};
}
function preview(g, action) {
  const b = g.api.attempt().board, next = move(g.p, b, action) || b;
  const live = g.svg.querySelector('.tn-live');
  if (live) live.innerHTML = drawBoard(g.p, next, {live: true, shown: null});
}
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  const at = tickAt(g.svg, g.p.parameters, e.clientX, e.clientY);
  if (!at) return;
  const action = actionFor(g.p.parameters, g.api.attempt().board, g.target, at.v);
  if (JSON.stringify(action) === JSON.stringify(g.action)) return;
  g.action = action;
  g.moved = true;
  preview(g, action);
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  g.root.classList.remove('dragging');
  const b = g.api.attempt().board;
  // A tap that would move its nearest control nowhere goes to the next one that can move there.
  if (e.type === 'pointerup' && !g.moved && !move(g.p, b, g.action)) {
    const next = g.order.slice(1).map(t => actionFor(g.p.parameters, b, t, g.v)).find(action => move(g.p, b, action));
    if (next) g.action = next;
  }
  if (e.type === 'pointerup' && g.action && move(g.p, b, g.action)) { g.api.apply(g.action); return; }
  if (g.moved) g.api.ui({});
}
function wire(root, p, api) {
  const svg = root.querySelector('[data-tn-board]'), q = p.parameters;
  if (!svg) return;
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    const hit = e.target.closest?.('[data-tn-row], .tn-knob, .tn-handle');
    const b = api.attempt().board;
    if (!hit || solved(p, b)) return;
    const at = tickAt(svg, q, e.clientX, e.clientY);
    if (!at) return;
    const top = layout(q).start, order = targetsNear(q, b, at.v, (at.y - top) / START_H), target = order[0];
    if (!target) return;
    e.preventDefault();
    const action = actionFor(q, b, target, at.v);
    gesture = {pointer: e.pointerId, svg, root, api, p, target, order, action, v: at.v, moved: false};
    root.classList.add('dragging');
    preview(gesture, action);
  });
  svg.addEventListener('keydown', e => {
    const el = e.target.closest?.('[data-tn-target]');
    if (!el || e.altKey || e.ctrlKey || e.metaKey) return;
    const b = api.attempt().board;
    if (solved(p, b)) return;
    const t = targetsOf(q, b).find(x => JSON.stringify({kind: x.kind, ...(x.which !== undefined ? {which: x.which} : {}), ...(x.end ? {end: x.end} : {})}) === JSON.stringify(JSON.parse(el.dataset.tnTarget)));
    if (!t) return;
    const step = {ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1}[e.key];
    const v = step ? t.at + step * q.step : e.key === 'Home' ? -Infinity : e.key === 'End' ? Infinity : null;
    if (v === null) return;
    e.preventDefault();
    const action = actionFor(q, b, t, v);
    if (move(p, b, action)) api.apply(action);
  });
}

export const tentMechanics = {
  tent: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo keeps what was kept: pairs and bands on the shelf with a refused
    // That’s all, goals met, and a refused pin (the pins stay cleared) while
    // the marker and band are where the refusal found them.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      let next = to;
      if (q.mode === 'pairs' || q.mode === 'pieces') next = {...to, found: from.found, told: from.told};
      // Undo after the last goal takes that goal back, so the puzzle is open again.
      else if (q.mode === 'width' || q.mode === 'fill') next = solved(p, from) ? to : {...to, reached: from.reached};
      else if (from.told && from.at === to.at && (q.mode === 'break' || from.hi === to.hi)) next = {...to, pins: [], told: from.told};
      return valid(p, next) ? next : to;
    }
  }
};

// The family seam entry (dist/families.js): a group in Ruler strips.
export default {
  id: 'tent',
  mechanics: tentMechanics,
  pack: new URL('./tent.json', import.meta.url).href,
  css: new URL('./tent.css', import.meta.url).href,
  focus: '.tn-knob,.tn-handle,.tn-button:not([disabled])'
};
