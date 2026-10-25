// Nearest dots (worksheet Week 15, nearest-site regions). Every place belongs
// to the dot nearest to it, and to all of them when they tie; a dot's region
// is the closed set of its places. Two dots split the plane along their
// perpendicular bisector, so a region is an intersection of half-planes:
// convex, containing its dot, possibly unbounded. The child puts new dots on
// the half-unit lattice inside the frame to make a target region, to make
// one region touch some and miss another, to make a place that four dots
// share, to take a place from a region while keeping others, and to close a
// region inside the frame with the fewest dots. Regions stay hidden until
// Check, so a dot can't be wiggled until an edge lines up. Every edge, tie
// and test is exact (plane.js).
//
// The two theorems behind the puzzles: (1) to give a dot a convex region,
// reflect the dot across each side and put a new dot at each image (the
// side is then their bisector); (2) a region has no dents, so it holds the
// whole segment between any two of its places. A place R on a segment
// between A and places A must keep can never be taken (the child taps that
// segment after Can't, once a checked try is on the board); a place outside
// the shape they span can, by A's mirror image across a line between them,
// when that lands on the grid in the frame. A closed region needs at least
// three sides, and two that are parallel need two more, so A alone needs
// three new dots and a dot between two others needs two (checked by search
// on the lattice).
import {esc} from '../../expansion-controls.js';
import * as G from './plane.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const MODES = ['make', 'part', 'touch', 'four', 'take', 'fit', 'playground'];
export const PLAY_MAX = 10;
const LETTERS = 'ABCDEFGHIJKL';
const COLORS = ['sun', 'sky', 'rose', 'leaf', 'lilac', 'sand'];

// --- Puzzles --------------------------------------------------------------
// Parameters: {mode, frame, view, sites, names, focus, budget, from?} and
//   make:  target, a list of half-planes {a, b, c} (a·u + b·v ≤ c);
//   part:  apart, two site indices whose regions must stop touching;
//   touch: dot (the new dot's letter), touch and avoid (site indices);
//   four:  dot;
//   take:  keep [{name, at}], take {name, at};
//   fit:   fewest (the fewest new dots, found by search), witnesses.
// `from` names the site hints measure from, and `aim` the spot a first-dot
// hint heads for when several work.
// Points are in half-steps (plane.js). The playground has {mode, frame,
// view, start} and every dot is movable.
export const allSites = (q, dots) => [...q.sites, ...dots];
export const sortDots = dots => [...dots].sort((p, r) => p[0] - r[0] || p[1] - r[1]);
const has = (list, z) => list.some(d => G.samePoint(d, z));
const without = (list, z) => list.filter(d => !G.samePoint(d, z));
export const budgetOf = q => (q.mode === 'playground' ? PLAY_MAX : q.budget);
export const own = q => [{name: q.names[q.focus], at: q.sites[q.focus]}, ...(q.keep || [])];
export const newIndex = q => q.sites.length;

const memo = new Map();
const remember = (key, make) => { if (!memo.has(key)) { if (memo.size > 3000) memo.clear(); memo.set(key, make()); } return memo.get(key); };
export const targetOf = q => remember(`t|${JSON.stringify([q.target, q.sites[q.focus]])}`, () => G.shapeOf(q.target, q.sites[q.focus]));

// Does this set of new dots meet the puzzle's goal? (Check shows the answer.)
export function goal(q, dots) {
  const s = allSites(q, dots), n = newIndex(q);
  switch (q.mode) {
    case 'make': return G.sameRegion(G.cellOf(s, q.focus), targetOf(q));
    case 'part': return !G.touches(s, q.apart[0], q.apart[1]);
    case 'touch': return dots.length === 1 && q.touch.every(i => G.touches(s, n, i)) && q.avoid.every(i => !G.touches(s, n, i));
    case 'four': return dots.length === 1 && G.fourWayAt(s, n);
    case 'take': return q.keep.every(k => G.owns(s, q.focus, k.at)) && !G.owns(s, q.focus, q.take.at);
    case 'fit': return G.fits(G.cellOf(s, q.focus), q.frame);
    default: return false;
  }
}
// Can't comes after an attempt: dots on the board and a Check showing them.
export const tried = b => b.checked && b.dots.length > 0;
// The pair of places a Can't claim taps: R on the segment between them.
export const certifies = (q, [i, j]) => G.onSegment(own(q)[i].at, own(q)[j].at, q.take.at);
export const certificates = q => { const o = own(q), out = []; for (let i = 0; i < o.length; i++) for (let j = i + 1; j < o.length; j++) if (certifies(q, [i, j])) out.push([i, j]); return out; };
// The reflection of s across the line a·u + b·v = c, when it is a lattice point.
export function reflect(s, h) {
  const n = h.a * h.a + h.b * h.b, t = h.c - h.a * s[0] - h.b * s[1];
  const u = s[0] + (2 * t * h.a) / n, v = s[1] + (2 * t * h.b) / n;
  return Number.isInteger(u) && Number.isInteger(v) ? [u, v] : null;
}
// Make: the dots the inverse construction needs (A reflected across each side
// that no fixed site makes already).
export const makeAnswer = q => q.target.map(h => reflect(q.sites[q.focus], h)).filter(z => z && !has(q.sites, z));
// Part, touch, four and take: every single new dot that works.
export const singleAnswers = q => remember(`s|${JSON.stringify(q)}`, () => G.framePoints(q.frame).filter(z => !has(q.sites, z) && goal(q, [z])));

// --- Boards ---------------------------------------------------------------
// make, part, touch, four: {dots, checked}
// take:              {dots, checked, claimed, refused}  (claimed, refused: a pair of own() indices or null)
// fit:               {dots, checked, done, fewer}       (fewer: the smallest count a Fewest claim was refused at)
// playground:        {dots}                              (every dot, in the order put down)
const KEYS = {make: 'checked,dots', part: 'checked,dots', touch: 'checked,dots', four: 'checked,dots', take: 'checked,claimed,dots,refused', fit: 'checked,done,dots,fewer', playground: 'dots'};
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {dots: q.start.map(z => [...z])};
  if (q.mode === 'take') return {dots: [], checked: false, claimed: null, refused: null};
  if (q.mode === 'fit') return {dots: [], checked: false, done: false, fewer: null};
  return {dots: [], checked: false};
}
const validPair = (q, pair) => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isInteger) && pair[0] >= 0 && pair[0] < pair[1] && pair[1] < own(q).length;
function validDots(q, dots) {
  if (!Array.isArray(dots) || dots.length > budgetOf(q) || !dots.every(z => G.inFrame(z, q.frame))) return false;
  if (new Set(dots.map(G.keyOf)).size !== dots.length) return false;
  if (q.mode === 'playground') return true;
  return !dots.some(z => has(q.sites, z)) && dots.every((z, k) => k === 0 || dots[k - 1][0] < z[0] || (dots[k - 1][0] === z[0] && dots[k - 1][1] < z[1]));
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || Object.keys(b).sort().join() !== KEYS[q.mode] || !validDots(q, b.dots)) return false;
  if (q.mode === 'playground') return true;
  if (typeof b.checked !== 'boolean') return false;
  if (q.mode === 'take') {
    if ((b.claimed !== null || b.refused !== null) && !tried(b)) return false;
    if (b.claimed !== null && !(validPair(q, b.claimed) && certifies(q, b.claimed))) return false;
    if (b.refused !== null && !(validPair(q, b.refused) && !certifies(q, b.refused))) return false;
    return b.claimed === null || b.refused === null;
  }
  if (q.mode === 'fit') {
    if (typeof b.done !== 'boolean') return false;
    if (b.fewer !== null && !(Number.isInteger(b.fewer) && b.fewer > q.fewest && b.fewer <= q.budget)) return false;
    return !b.done || (b.checked && b.dots.length === q.fewest && goal(q, b.dots));
  }
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'fit') return b.done;
  if (q.mode === 'take' && b.claimed) return true;
  return b.checked && goal(q, b.dots);
}

// A free lattice point in the frame: no fixed site and no dot on it.
export const placeable = (q, b, z) => G.inFrame(z, q.frame) && !has(q.mode === 'playground' ? [] : q.sites, z) && !has(b.dots, z);
const changed = (q, b, dots) => q.mode === 'playground' ? {dots} : {...b, dots: sortDots(dots), checked: false, ...(q.mode === 'take' ? {refused: null} : {})};
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (action.type === 'place' && G.isPoint(action.at) && placeable(q, b, action.at) && b.dots.length < budgetOf(q)) next = changed(q, b, [...b.dots, [...action.at]]);
  else if (action.type === 'move' && G.isPoint(action.from) && G.isPoint(action.to) && has(b.dots, action.from) && placeable(q, b, action.to)) next = changed(q, b, b.dots.map(d => (G.samePoint(d, action.from) ? [...action.to] : d)));
  else if (action.type === 'remove' && G.isPoint(action.at) && has(b.dots, action.at)) next = changed(q, b, without(b.dots, action.at));
  else if (action.type === 'check' && q.mode !== 'playground' && !b.checked) next = {...b, checked: true, ...(q.mode === 'take' ? {refused: null} : {})};
  else if (action.type === 'cant' && q.mode === 'take' && tried(b) && Array.isArray(action.pair)) {
    const pair = [...action.pair].sort((x, y) => x - y);
    // A refusal stands until something changes; the same claim waits.
    if (validPair(q, pair) && !(b.refused && b.refused.join() === pair.join())) next = certifies(q, pair) ? {...b, claimed: pair, refused: null} : {...b, refused: pair};
  } else if (action.type === 'fewest' && q.mode === 'fit' && b.checked && goal(q, b.dots) && !(b.fewer !== null && b.dots.length >= b.fewer)) {
    next = b.dots.length === q.fewest ? {...b, done: true} : {...b, fewer: b.dots.length};
  }
  if (next) Object.assign(ui(p), {held: null, claiming: false, pick: null});
  return next;
}

// --- Words ------------------------------------------------------------------
// Half-steps as words: 1 → "half a square", 4 → "2 squares", 5 → "2½ squares".
export function amount(n) {
  if (n === 1) return 'half a square';
  const whole = Math.floor(n / 2), part = n % 2 ? '½' : '';
  return `${whole}${part} ${whole === 1 && !part ? 'square' : 'squares'}`;
}
// The named places of a puzzle: its fixed sites and marked places.
const named = q => [...q.sites.map((at, i) => ({name: q.names[i], at})), ...(q.keep || []), ...(q.take ? [q.take] : [])];
// Where a lattice point is, from the puzzle's chosen site (`from`) or else
// the nearest named place (one in the same row or column first when two are
// as near).
export function where(q, z) {
  const list = q.from !== undefined ? [named(q)[q.from]] : named(q), best = list.reduce((top, n) => {
    const d = G.d2(n.at, z), straight = n.at[0] === z[0] || n.at[1] === z[1];
    return !top || d < top.d || (d === top.d && straight && !top.straight) ? {n, d, straight} : top;
  }, null).n;
  const du = z[0] - best.at[0], dv = z[1] - best.at[1];
  if (!du && !dv) return `on ${best.name}`;
  if (!dv) return `${amount(Math.abs(du))} ${du > 0 ? 'right' : 'left'} of ${best.name}`;
  if (!du) return `${amount(Math.abs(dv))} ${dv > 0 ? 'above' : 'below'} ${best.name}`;
  return `${amount(Math.abs(du))} ${du > 0 ? 'right' : 'left'} and ${amount(Math.abs(dv))} ${dv > 0 ? 'up' : 'down'} from ${best.name}`;
}
const dotWord = (q, b) => (q.dot ? q.dot : b.dots.length > 1 ? 'a dot' : 'the dot');

// --- Hints ------------------------------------------------------------------
// A hint names one action toward a set of dots that works. Its words are the
// idea behind the board as it stands: the puzzle's idea, or why a dot has to
// go, or the reason for Can't. The spot itself is not in the words: the ring
// at the second level shows it, Apply hint at the third plays it, and the
// screen-reader status reads it with the ring.
// Steps toward a set of dots W: move a stray dot to a missing spot (the
// nearest pair), take a stray dot away, put a missing dot down.
function toward(q, b, W) {
  const extra = b.dots.filter(d => !has(W, d)), missing = W.filter(z => !has(b.dots, z));
  if (extra.length && missing.length) {
    let best = null;
    for (const e of extra) for (const m of missing) if (!best || G.d2(e, m) < best.d) best = {e, m, d: G.d2(e, m)};
    return {action: {type: 'move', from: best.e, to: best.m}};
  }
  if (extra.length) return {action: {type: 'remove', at: extra[0]}};
  if (missing.length) return {action: {type: 'place', at: missing[0]}};
  return null;
}
const checkStep = {action: {type: 'check'}, why: 'Press Check.'};
const nearestTo = (list, z) => list.reduce((top, w) => (!top || G.d2(w, z) < G.d2(top, z) ? w : top), null);

function makeHint(q, b) { return goal(q, b.dots) ? checkStep : toward(q, b, makeAnswer(q)) || checkStep; }
// Part, touch and four: the working spot nearest the dot, or nearest the aim
// (or the middle of the frame) for a first dot.
function singleHint(q, b) {
  if (b.dots.length === 1 && goal(q, b.dots)) return checkStep;
  const answers = singleAnswers(q);
  return toward(q, b, [nearestTo(answers, b.dots[0] || q.aim || [0, 0])]) || checkStep;
}
// When the place can't be taken, the hints first try a dot on it and Check
// it, then give the reason with Can't.
function takeHint(q, b) {
  const cert = certificates(q)[0], A = q.names[q.focus], T = q.take.name;
  if (cert) {
    if (!b.dots.length) return {action: {type: 'place', at: q.take.at}, why: `Try to take ${T} from ${A} with a dot, and press Check.`};
    if (!b.checked) return checkStep;
    const [i, j] = cert.map(k => own(q)[k].name);
    return {action: {type: 'cant', pair: cert}, why: `${T} is on the straight line from ${i} to ${j}, and ${A}’s region never has a dent. Press Can’t.`};
  }
  if (goal(q, b.dots)) return checkStep;
  const answers = singleAnswers(q);
  // A dot that takes the place stays; a dot that takes a kept place goes.
  const taker = b.dots.find(d => has(answers, d));
  if (taker) {
    const thief = b.dots.find(d => q.keep.some(k => G.d2(d, k.at) < G.d2(q.sites[q.focus], k.at)));
    if (thief) {
      const lost = q.keep.find(k => G.d2(thief, k.at) < G.d2(q.sites[q.focus], k.at)).name;
      return {action: {type: 'remove', at: thief}, why: `A dot nearer to ${lost} than ${A} is takes ${lost} from ${A}.`};
    }
    return toward(q, b, [taker]) || checkStep;
  }
  const aim = b.dots.length ? answers.reduce((top, w) => { const d = Math.min(...b.dots.map(x => G.d2(x, w))); return !top || d < top.d ? {w, d} : top; }, null).w : nearestTo(answers, q.aim || q.take.at);
  return toward(q, b, [aim]) || checkStep;
}
// Fit: aim at the fewest-dot set that keeps the most of the child's dots.
function choose(list, k) {
  const out = [];
  (function go(from, set) { if (set.length === k) { out.push(set); return; } for (let i = from; i < list.length; i++) go(i + 1, [...set, list[i]]); })(0, []);
  return out;
}
const fitsWith = (q, dots) => G.fits(G.cellOf(allSites(q, dots), q.focus), q.frame);
export function fitAim(q, b) {
  return remember(`f|${JSON.stringify([q, b.dots])}`, () => {
    const k = q.fewest, dots = b.dots;
    for (const set of choose(dots, k)) if (fitsWith(q, set)) return set;
    // Otherwise the set needing the fewest changes (a move counts once): an
    // authored one first, else k − 1 of the child's dots and one spot, found
    // with one clip per spot, nearest the dot that would move there.
    const cost = W => Math.max(dots.filter(d => !has(W, d)).length, W.filter(z => !has(dots, z)).length);
    let best = null;
    const consider = (W, rank) => { const c = cost(W); if (!best || c < best.c || (c === best.c && rank < best.rank)) best = {W, c, rank}; };
    q.witnesses.forEach((W, i) => consider(W, i / 1000));
    if (dots.length >= k - 1) for (const set of choose(dots, k - 1)) {
      const cell = G.cellOf(allSites(q, set), q.focus), rest = dots.filter(d => !has(set, d));
      for (const z of G.framePoints(q.frame)) {
        if (has(q.sites, z) || has(set, z) || !G.clipFits(cell, G.bisector(q.sites[q.focus], z), q.frame)) continue;
        consider([...set, z], 1 + (rest.length ? Math.min(...rest.map(x => G.d2(x, z))) : G.d2(z, q.sites[q.focus])));
      }
    }
    return best.W;
  });
}
function fitHint(q, b) {
  const n = b.dots.length;
  if (goal(q, b.dots)) {
    if (n === q.fewest) return b.checked ? {action: {type: 'fewest'}, why: 'Press Fewest.'} : checkStep;
    // A dot whose removal keeps the fit goes first.
    const spare = b.dots.find(d => fitsWith(q, without(b.dots, d)));
    if (spare) return {action: {type: 'remove', at: spare}, why: `${q.names[q.focus]}’s region still fits in the frame with one dot fewer.`};
  }
  return toward(q, b, fitAim(q, b)) || checkStep;
}
// The spot a hint's action names, in words (read with the ring).
export function spotWords(q, b, action) {
  switch (action.type) {
    case 'place': return `Put ${q.dot || 'a dot'} ${where(q, action.at)}.`;
    case 'move': return `Move ${dotWord(q, b)} to the spot ${where(q, action.to)}.`;
    case 'remove': return `Take away the dot ${where(q, action.at)}.`;
    case 'cant': { const [i, j] = action.pair.map(k => own(q)[k].name); return `Press Can’t and tap ${i} and ${j}.`; }
    case 'fewest': return 'Press Fewest.';
    default: return 'Press Check.';
  }
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return remember(`h|${p.id}|${JSON.stringify(b)}`, () => {
    let h;
    switch (q.mode) {
      case 'make': h = makeHint(q, b); break;
      case 'part': case 'touch': case 'four': h = singleHint(q, b); break;
      case 'take': h = takeHint(q, b); break;
      default: h = fitHint(q, b);
    }
    return {type: 'move', action: h.action, text: h.why || p.idea, spot: spotWords(q, b, h.action)};
  });
}

// --- View state -------------------------------------------------------------
// The keyboard cursor, a dot picked up from the keyboard, Can't and its first
// pick are view state, outside the save.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {cursor: [0, 0], held: null, keys: false, claiming: false, pick: null}); return uiState.get(p.id); }

// --- Drawing ------------------------------------------------------------------
// The board is drawn in half-steps with y up turned to SVG's y down: the
// lattice point [u, v] is drawn at (u, −v), and the view runs ±q.view.
const f = n => Number(n.toFixed(3));
const P = ([X, Y, D]) => `${f(X / D)},${f(-Y / D)}`;
const at = z => `${z[0]},${-z[1]}`;
export const colorOf = (q, i) => (q.mode === 'playground' ? COLORS[i % COLORS.length] : i < q.sites.length ? COLORS[i % 4] : q.dot ? 'leaf' : 'plain');
export const nameOf = (q, i) => (q.mode === 'playground' ? LETTERS[i] : i < q.sites.length ? q.names[i] : q.dot || '');
const poly = cell => cell.verts.map(P).join(' ');
// The non-box edges of a region, as segments.
const sides = cell => cell.edges.flatMap((e, k) => (e.owner === 'box' ? [] : [{owner: e.owner, a: cell.verts[k], b: cell.verts[(k + 1) % cell.verts.length]}]));
const seg = (s, cls) => `<line class="${cls}" x1="${f(s.a[0] / s.a[2])}" y1="${f(-s.a[1] / s.a[2])}" x2="${f(s.b[0] / s.b[2])}" y2="${f(-s.b[1] / s.b[2])}"/>`;
// A whole line a·u + b·v = c across the view.
function lineAcross(h, V, cls) {
  const pts = [];
  for (const t of [-V, V]) {
    if (h.b) { const v = (h.c - h.a * t) / h.b; if (Math.abs(v) <= V + 1e-9) pts.push([t, v]); }
    if (h.a) { const u = (h.c - h.b * t) / h.a; if (Math.abs(u) <= V + 1e-9) pts.push([u, t]); }
  }
  if (pts.length < 2) return '';
  const [p0, p1] = [pts[0], pts.find(z => Math.hypot(z[0] - pts[0][0], z[1] - pts[0][1]) > 1e-6) || pts[1]];
  return `<line class="${cls}" x1="${f(p0[0])}" y1="${f(-p0[1])}" x2="${f(p1[0])}" y2="${f(-p1[1])}"/>`;
}
// Every region, its edges and its ties, cut to the view.
export function cellsLayer(q, sites, emphasis = {}) {
  const V = q.view;
  let fills = '', lines = '';
  const drawn = new Set();
  sites.forEach((s, i) => {
    const cell = G.cellOf(sites, i, V);
    fills += `<polygon class="st-fill c-${colorOf(q, i)}" points="${poly(cell)}"/>`;
    for (const side of sides(cell)) {
      const key = [side.a.join(), side.b.join()].sort().join('|');
      if (drawn.has(key)) continue;
      drawn.add(key);
      const bad = emphasis.bad?.some(([x, y]) => (x === i && y === side.owner) || (y === i && x === side.owner));
      lines += seg(side, `st-edge${bad ? ' bad' : ''}`);
    }
  });
  const outline = emphasis.focus !== undefined ? sides(G.cellOf(sites, emphasis.focus, V)).map(s => seg(s, `st-outline ${emphasis.good ? 'good' : 'off'}`)).join('') : '';
  const corners = G.ties(sites, V).map(t => {
    const bad = emphasis.bad?.some(([x, y]) => t.sites.includes(x) && t.sites.includes(y));
    return `<circle class="st-tie${t.sites.length >= 4 ? ' four' : ''}${bad ? ' bad' : ''}" cx="${f(t.at[0] / t.at[2])}" cy="${f(-t.at[1] / t.at[2])}" r="${t.sites.length >= 4 ? 0.42 : 0.26}"/>`;
  }).join('');
  return `${fills}${lines}${outline}${corners}`;
}
function grid(q) {
  const F = q.frame, V = q.view, out = [];
  for (let k = -F; k <= F; k++) {
    const cls = k % 2 ? 'st-grid half' : 'st-grid';
    out.push(`<line class="${cls}" x1="${k}" y1="${-F}" x2="${k}" y2="${F}"/><line class="${cls}" x1="${-F}" y1="${k}" x2="${F}" y2="${k}"/>`);
  }
  const margin = `<path class="st-margin" fill-rule="evenodd" d="M${-V} ${-V}H${V}V${V}H${-V}Z M${-F} ${-F}H${F}V${F}H${-F}Z"/>`;
  return `${margin}${out.join('')}`;
}
// A letter sits inside the little square up and right of its point, clear of
// the crossings round it; a tap on it goes to its point (labelAt).
const label = (z, text, cls = '') => `<text class="st-name ${cls}" x="${f(z[0] + 0.62)}" y="${f(-z[1] - 0.36)}">${esc(text)}</text>`;
const LABEL_BOX = [0.3, 0.92, 0.26, 0.92];
function labelAt(q, b, [u, v]) {
  const named = q.mode === 'playground' ? b.dots : [...q.sites, ...(q.dot ? b.dots : []), ...(q.keep || []).map(k => k.at), ...(q.take ? [q.take.at] : [])];
  return named.find(z => u >= z[0] + LABEL_BOX[0] && u <= z[0] + LABEL_BOX[1] && v >= z[1] + LABEL_BOX[2] && v <= z[1] + LABEL_BOX[3]) || null;
}
const cross = (z, cls) => `<path class="st-cross ${cls}" d="M${z[0] - 0.4} ${-z[1]}h0.8M${z[0]} ${-z[1] - 0.4}v0.8"/>`;
function sitesLayer(q, b, opt) {
  const fixed = q.mode === 'playground' ? [] : q.sites.map((s, i) => `<g class="st-site c-${colorOf(q, i)}" data-site="${i}"><circle cx="${s[0]}" cy="${-s[1]}" r="0.46"/>${label(s, q.names[i])}</g>`);
  const dots = b.dots.map((d, k) => {
    const i = q.mode === 'playground' ? k : q.sites.length + k, held = opt.held && G.samePoint(opt.held, d);
    const name = nameOf(q, i), cls = q.mode === 'playground' ? `st-site c-${colorOf(q, i)}` : 'st-dot';
    return `<g class="${cls}${held ? ' held' : ''}" data-dot="${G.keyOf(d)}" transform="translate(${at(d)})"><circle class="st-grab" r="${GRAB}"/><circle r="${q.mode === 'playground' ? 0.46 : 0.38}"/>${name ? label([0, 0], name) : ''}</g>`;
  });
  return `${fixed.join('')}${dots.join('')}`;
}
function marksLayer(q, b, opt) {
  if (q.mode !== 'take') return '';
  const s = allSites(q, b.dots), shown = opt.cells;
  const one = (m, keep) => {
    const mine = G.owns(s, q.focus, m.at), right = keep ? mine : !mine;
    const ring = shown ? `<circle class="st-ring ${right ? 'good' : 'bad'}" cx="${m.at[0]}" cy="${-m.at[1]}" r="0.6"/>` : '';
    return `<g class="st-mark${keep ? ' keep' : ' take'}">${ring}${cross(m.at, '')}${label(m.at, m.name, 'mark')}</g>`;
  };
  return [...q.keep.map(m => one(m, true)), one(q.take, false)].join('');
}

function boardSvg(q, b, opt) {
  const V = q.view, sites = q.mode === 'playground' ? b.dots : allSites(q, b.dots);
  const target = q.mode === 'make' ? (() => { const t = G.shapeOf(q.target, q.sites[q.focus], V); return `<polygon class="st-target" points="${poly(t)}"/>${sides(t).map(x => seg(x, 'st-target-edge')).join('')}`; })() : '';
  let cells = '';
  if (opt.cells && sites.length) cells = cellsLayer(q, sites, opt.emphasis || {});
  let extra = '';
  if (opt.argument) {
    const cell = G.cellOf(sites, q.focus);
    extra += sides(cell).map(x => lineAcross(G.bisector(q.sites[q.focus], sites[x.owner]), V, 'st-arg-line')).join('');
    extra += sides(cell).map(x => { const k = sites[x.owner], a = q.sites[q.focus]; return `<line class="st-arg-join" x1="${a[0]}" y1="${-a[1]}" x2="${k[0]}" y2="${-k[1]}"/>`; }).join('');
  }
  if (opt.segment) {
    const [i, j] = opt.segment.pair.map(k => own(q)[k].at);
    extra += `<line class="st-cert ${opt.segment.good ? 'good' : 'bad'}" x1="${i[0]}" y1="${-i[1]}" x2="${j[0]}" y2="${-j[1]}"/>`;
    if (opt.segment.good) extra += `<circle class="st-ring good" cx="${q.take.at[0]}" cy="${-q.take.at[1]}" r="0.6"/>`;
  }
  const hintMarks = (opt.hintAt || []).map(z => `<circle class="st-hint" cx="${z[0]}" cy="${-z[1]}" r="0.78"/>`).join('');
  const cursor = opt.cursor ? `<circle class="st-cursor" cx="${opt.cursor[0]}" cy="${-opt.cursor[1]}" r="0.66"/>` : '';
  const picks = opt.picks || '';
  const frame = `<rect class="st-frame" x="${-q.frame}" y="${-q.frame}" width="${2 * q.frame}" height="${2 * q.frame}"/>`;
  return `<svg class="st-board${opt.cells ? ' shown' : ''}" viewBox="${-V} ${-V} ${2 * V} ${2 * V}" data-st-board tabindex="0" role="group" aria-label="${esc(opt.label)}" data-focus="st-board"><g class="st-paper">${grid(q)}</g>${target}<g class="st-cells">${cells}</g>${frame}${extra}${marksLayer(q, b, opt)}<g class="st-sites">${sitesLayer(q, b, opt)}</g>${hintMarks}${cursor}${picks}<circle class="st-hover" r="0.5" cx="0" cy="0" visibility="hidden"/></svg>`;
}

// What the screen reader hears about a board.
function describe(q, b, shown) {
  const list = [];
  if (q.mode === 'playground') list.push(b.dots.length ? `${b.dots.length} ${b.dots.length === 1 ? 'dot' : 'dots'}: ${b.dots.map((d, k) => `${LETTERS[k]} at ${(d[0] / 2)} across, ${(d[1] / 2)} up`).join('; ')}.` : 'No dots.');
  else list.push(b.dots.length ? `${b.dots.length === 1 ? 'Dot' : 'Dots'} ${b.dots.map(d => where(q, d)).join('; ')}.` : 'No new dots.');
  if (!shown) return list.join(' ');
  const s = q.mode === 'playground' ? b.dots : allSites(q, b.dots), name = i => nameOf(q, i) || 'a new dot';
  if (q.mode === 'part') list.push(`${q.apart.map(name).join('’s and ')}’s regions ${G.touches(s, q.apart[0], q.apart[1]) ? 'touch' : 'don’t touch'}.`);
  if (q.mode === 'touch' && b.dots.length) list.push(`${q.dot}’s region touches ${q.sites.map((_, i) => i).filter(i => G.touches(s, newIndex(q), i)).map(name).join(', ') || 'no other region'}.`);
  if (q.mode === 'make' || q.mode === 'fit') {
    const cell = G.cellOf(s, q.focus);
    list.push(`${name(q.focus)}’s region ${G.bounded(cell) ? (G.fits(cell, q.frame) ? 'fits in the frame' : 'is closed but goes past the frame') : 'goes on past the frame'}${q.mode === 'make' ? (goal(q, b.dots) ? ' and is exactly the shaded part' : ' and is not the shaded part') : ''}.`);
  }
  if (q.mode === 'take') list.push(`${[...q.keep, q.take].map(m => `${m.name} ${G.owns(s, q.focus, m.at) ? 'is' : 'is not'} ${q.names[q.focus]}’s`).join(', ')}.`);
  const four = G.ties(s).filter(t => t.sites.length >= 4);
  if (four.length) list.push(`${four.length === 1 ? 'One place belongs' : 'Places belong'} to ${four[0].sites.map(name).join(', ')}.`);
  return list.join(' ');
}

const moveButton = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary st-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="st-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
function slots(q, b) {
  const n = budgetOf(q), used = b.dots.length;
  return `<span class="st-slots" role="img" aria-label="${n - used} of ${n} new ${n === 1 ? 'dot' : 'dots'} left">${Array.from({length: n}, (_, k) => `<i class="${k < used ? 'used' : ''}">${q.dot && n === 1 ? esc(q.dot) : ''}</i>`).join('')}</span>`;
}

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), state = ui(p);
  if (q.mode === 'playground') {
    const svg = boardSvg(q, b, {cells: true, label: 'Map of dots and their regions', cursor: state.keys ? state.cursor : null, held: state.held});
    return `<div class="st-puzzle playground" data-mechanic-wire="sites">${svg}<p class="sr-only" role="status">${esc(`${describe(q, b, true)}${cursorWords(q, b, state)}`)}</p></div>`;
  }
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b) : null, act = hinted?.action;
  const hintAt = act?.type === 'place' ? [act.at] : act?.type === 'move' ? [act.from, act.to] : act?.type === 'remove' ? [act.at] : act?.type === 'cant' ? act.pair.map(k => own(q)[k].at) : [];
  const shown = b.checked || done;
  const s = allSites(q, b.dots), n = newIndex(q);
  const emphasis = {};
  if (q.mode === 'make' || q.mode === 'fit') Object.assign(emphasis, {focus: q.focus, good: goal(q, b.dots)});
  if (q.mode === 'touch' && b.dots.length) Object.assign(emphasis, {focus: n, good: goal(q, b.dots), bad: q.avoid.filter(i => G.touches(s, n, i)).map(i => [n, i])});
  if (q.mode === 'part' && G.touches(s, ...q.apart)) emphasis.bad = [q.apart];
  const claiming = q.mode === 'take' && !done && tried(b) && state.claiming;
  const picks = claiming ? own(q).map((o, i) => {
    const picked = state.pick === i, action = state.pick !== null && !picked ? {type: 'cant', pair: [state.pick, i]} : null;
    const attr = action ? `data-action="expansion-move" data-move="${esc(JSON.stringify(action))}"` : `data-action="mechanic-ui" data-ui='${JSON.stringify({pick: picked ? null : i})}'`;
    return `<g class="st-pick${picked ? ' picked' : ''}" role="button" tabindex="0" ${attr} data-focus="st-pick-${i}" aria-label="${esc(o.name)}${picked ? ', chosen' : ''}"><circle class="st-pick-ring" cx="${o.at[0]}" cy="${-o.at[1]}" r="0.95"/></g>`;
  }).join('') : '';
  const segment = q.mode === 'take' && b.claimed ? {pair: b.claimed, good: true} : q.mode === 'take' && b.refused ? {pair: b.refused, good: false} : null;
  const svg = boardSvg(q, b, {cells: shown, emphasis, label: 'Map of dots', hintAt, cursor: state.keys && !done && !claiming ? state.cursor : null, held: state.held, picks, segment, argument: q.mode === 'fit' && b.done});
  let bar = '';
  if (!done) {
    const check = moveButton('Check', {type: 'check'}, 'st-check', !b.checked, act?.type === 'check');
    const cant = q.mode === 'take' ? `<button type="button" class="secondary st-button st-cant${act?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="st-cant" data-toggle="st-cant" aria-pressed="${claiming}" ${tried(b) ? '' : 'disabled'}>Can’t</button>` : '';
    const fewest = q.mode === 'fit' ? moveButton('Fewest', {type: 'fewest'}, 'st-fewest', b.checked && goal(q, b.dots) && !(b.fewer !== null && b.dots.length >= b.fewer), act?.type === 'fewest') : '';
    bar = `<div class="st-bar">${slots(q, b)}${check}${cant}${fewest}</div>`;
  }
  const told = q.mode === 'take' && b.refused ? `Misses ${q.take.name}.` : q.mode === 'fit' && b.fewer !== null && b.checked && b.fewer === b.dots.length ? 'Fewer dots can.' : '';
  const note = told ? `<p class="st-told">${esc(told)}</p>` : '';
  const status = `${describe(q, b, shown)}${told ? ` ${told}` : ''}${claiming ? ` Tap two places.` : ''}${hinted?.spot ? ` Hint: ${hinted.spot}` : ''}${cursorWords(q, b, state)}`;
  return `<div class="st-puzzle mode-${q.mode}${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="sites">${svg}${note}${bar}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function cursorWords(q, b, state) {
  if (!state.keys) return '';
  const z = state.cursor, dot = has(b.dots, z), site = q.mode !== 'playground' && q.sites.findIndex(s => G.samePoint(s, z));
  const what = dot ? 'a dot' : site >= 0 && site !== false ? q.names[site] : 'empty';
  return ` Cursor ${q.mode === 'playground' ? `${z[0] / 2} across, ${z[1] / 2} up` : where(q, z)}: ${what}.${state.held ? ' Holding a dot.' : ''}`;
}

// --- Taps, drags and keys -----------------------------------------------------
// A tap on a free point puts a dot there; a tap on a dot takes it away; a dot
// dragged to a free point moves there on release (one move, one Undo). Taps
// are read from the pointer itself. The keyboard moves a cursor; Enter or
// Space puts, picks up or drops a dot and Delete takes one away.
// On a touch screen a dragged dot rides two half-squares above the finger,
// with a cross through it at its crossing, so the finger never hides where
// it will land.
let gesture = null, listening = false;
const exactAt = (svg, x, y) => {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = x; pt.y = y;
  const r = pt.matrixTransform(m.inverse());
  return [r.x, -r.y];
};
const pointAt = (svg, x, y) => { const r = exactAt(svg, x, y); return r && [Math.round(r[0]), Math.round(r[1])]; };
const LIFT = 2;
// A drag can start within GRAB of a dot (in half-steps: a 40 px target on a
// phone, where a point is about 27 px from the next). A tap still goes to the
// nearest point, so a tap beside a dot puts a new dot there and never takes
// the old one away.
const GRAB = 0.8;
export function grabbed(dots, [u, v]) {
  let best = null;
  for (const d of dots) { const dist = Math.hypot(d[0] - u, d[1] - v); if (dist <= GRAB && (!best || dist < best.dist)) best = {d, dist}; }
  return best?.d ?? null;
}
const clamp = (z, F) => [Math.max(-F, Math.min(F, z[0])), Math.max(-F, Math.min(F, z[1]))];
function onMove(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > 12 && !g.moved) {
    g.moved = true;
    if (g.dot && g.el) { g.el.classList.add('dragged'); g.el.insertAdjacentHTML('beforeend', '<path class="st-aim" d="M-1 0H1M0 -1V1"/>'); }
  }
  if (!g.dot || !g.moved) return;
  const raw = pointAt(g.svg, e.clientX, e.clientY - g.lift);
  if (!raw) return;
  const z = clamp(raw, g.q.frame), b = g.api.attempt().board;
  if (G.samePoint(z, g.at) || !(G.samePoint(z, g.dot) || placeable(g.q, b, z))) return;
  g.at = z;
  g.el?.setAttribute('transform', `translate(${at(z)})`);
  if (g.q.mode === 'playground') {
    const dots = b.dots.map(d => (G.samePoint(d, g.dot) ? z : d));
    const layer = g.svg.querySelector('.st-cells');
    if (layer) layer.innerHTML = cellsLayer(g.q, dots);
  }
}
function onEnd(e) {
  const g = gesture;
  if (!g || e.pointerId !== g.pointer) return;
  gesture = null;
  g.root.classList.remove('dragging');
  if (e.type !== 'pointerup') { g.api.ui({}); return; }
  if (g.dot && !G.samePoint(g.at, g.dot)) { g.api.apply({type: 'move', from: g.dot, to: g.at}); return; }
  if (g.moved) { if (g.dot) g.api.ui({}); return; }
  if (g.tapDot) { g.api.apply({type: 'remove', at: g.tapDot}); return; }
  const b = g.api.attempt().board;
  if (!placeable(g.q, b, g.start)) return;
  if (b.dots.length >= budgetOf(g.q)) { const box = g.root.querySelector('.st-slots'); box?.classList.remove('full'); void box?.getBoundingClientRect(); box?.classList.add('full'); return; }
  g.api.apply({type: 'place', at: g.start});
}
function wire(root, p, api) {
  const svg = root.querySelector('[data-st-board]'), q = p.parameters;
  if (!svg) return;
  // On a phone the board reaches the panel's edges (CSS reads --st-bleed)
  // and its margin past the frame shrinks to a quarter square.
  const panel = svg.closest('.board-panel'), puzzle = svg.closest('.st-puzzle');
  if (panel && puzzle) puzzle.style.setProperty('--st-bleed', `${parseFloat(getComputedStyle(panel).paddingLeft) || 0}px`);
  if (window.matchMedia?.('(max-width: 560px)').matches) { const V = q.view - 0.5; svg.setAttribute('viewBox', `${-V} ${-V} ${2 * V} ${2 * V}`); }
  if (!listening) {
    document.addEventListener('pointermove', onMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, onEnd);
    listening = true;
  }
  const busy = () => { const b = api.attempt().board; return solved(p, b) || (q.mode === 'take' && ui(p).claiming && tried(b)); };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || busy()) return;
    const exact = exactAt(svg, e.clientX, e.clientY);
    if (!exact) return;
    const b = api.attempt().board, label = labelAt(q, b, exact), raw = label || exact.map(Math.round);
    const tapDot = has(b.dots, raw) ? raw : null, dot = tapDot || (label ? null : grabbed(b.dots, exact));
    if (!G.inFrame(raw, q.frame) && !dot) return;
    const scale = svg.getScreenCTM?.()?.a || 20;
    ui(p).keys = false;
    gesture = {pointer: e.pointerId, svg, root, api, q, x: e.clientX, y: e.clientY, start: raw, at: dot || raw, dot, tapDot, moved: false, lift: e.pointerType === 'touch' ? LIFT * scale : 0, el: dot ? svg.querySelector(`[data-dot="${G.keyOf(dot)}"]`) : null};
    if (dot) { root.classList.add('dragging'); e.preventDefault(); }
  });
  // A mouse shows where a dot would go.
  const hover = svg.querySelector('.st-hover');
  svg.addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || gesture || busy()) { hover?.setAttribute('visibility', 'hidden'); return; }
    const exact = exactAt(svg, e.clientX, e.clientY), b = api.attempt().board, z = exact && (labelAt(q, b, exact) || exact.map(Math.round));
    if (z && G.inFrame(z, q.frame) && (has(b.dots, z) || placeable(q, b, z))) { hover.setAttribute('cx', z[0]); hover.setAttribute('cy', -z[1]); hover.setAttribute('visibility', 'visible'); } else hover?.setAttribute('visibility', 'hidden');
  });
  svg.addEventListener('pointerleave', () => hover?.setAttribute('visibility', 'hidden'));
  svg.addEventListener('keydown', e => {
    // The places to tap after Can't take Enter and Space too.
    const pick = e.target.closest?.('.st-pick');
    if (pick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick.dispatchEvent(new MouseEvent('click', {bubbles: true})); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || busy()) return;
    const state = ui(p), b = api.attempt().board, step = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]}[e.key];
    if (step) { e.preventDefault(); api.ui({keys: true, cursor: clamp([state.cursor[0] + step[0], state.cursor[1] + step[1]], q.frame)}); return; }
    const z = state.cursor;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!state.keys) { api.ui({keys: true}); return; }
      if (state.held) { if (G.samePoint(state.held, z)) api.ui({held: null}); else if (placeable(q, b, z)) api.apply({type: 'move', from: state.held, to: z}); return; }
      if (has(b.dots, z)) { api.ui({held: z}); return; }
      if (placeable(q, b, z) && b.dots.length < budgetOf(q)) api.apply({type: 'place', at: z});
      return;
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && has(b.dots, z)) { e.preventDefault(); api.apply({type: 'remove', at: z}); return; }
    if (e.key === 'Escape' && state.held) { e.preventDefault(); api.ui({held: null}); }
  });
}

export const sitesMechanics = {
  sites: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      const state = ui(p);
      if (typeof payload.claiming === 'boolean') Object.assign(state, {claiming: payload.claiming, pick: null});
      if ('pick' in payload && (payload.pick === null || (Number.isInteger(payload.pick) && payload.pick >= 0 && payload.pick < own(p.parameters).length))) state.pick = payload.pick;
      if (G.isPoint(payload.cursor) && G.inFrame(payload.cursor, p.parameters.frame)) state.cursor = payload.cursor;
      if ('held' in payload) state.held = G.isPoint(payload.held) ? payload.held : null;
      if (typeof payload.keys === 'boolean') state.keys = payload.keys;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps a refused Fewest: a claim can't be taken back to ask again.
    carry(p, from, to) {
      if (p.parameters.mode !== 'fit' || !object(from) || !object(to) || from.fewer === null) return to;
      return {...to, fewer: to.fewer === null ? from.fewer : Math.min(to.fewer, from.fewer)};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'sites',
  family: {id: 'sites', symbol: '⬡', area: 'geometry', region: 'shape'},
  mechanics: sitesMechanics,
  pack: new URL('./sites.json', import.meta.url).href,
  css: new URL('./sites.css', import.meta.url).href,
  focus: '.st-board,.st-check:not([disabled]),.st-pick'
};
