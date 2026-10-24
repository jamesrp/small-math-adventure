// Drawing machines (worksheet Week 85). A pantograph is pinned to the paper at
// O; the child drags its knob T from dot to dot and the pencil P draws, always
// at P = O + 2(T − O). The machine geometry, the record and its replay are in
// machine.js; this file holds the puzzles' rules, hints, drawing and gestures.
//
// Puzzles:
//   dots      make the pencil touch every ringed dot;
//   trace     make the pencil draw the pale outline, and nothing else;
//   region    find every dot for the knob that keeps the pencil in the box,
//             then claim That's all;
//   anchor    move the pin, then trace the green shape so the copy lands on
//             the outline;
//   shift     the pin has moved: move the green shape so its copy lands where
//             the old pin's copy was;
//   chain     a ×2 machine drives a ×½ machine; move the pins so the copy of
//             the green shape lands on the outline.
// The playground has one machine, a pin to move and a ×2/×½ switch.
import {esc} from '../../expansion-controls.js';
import {Q, KINDS, MAX_LOG, isPoint, same, quarter, key, add, sameSet, stepSet, stepsOf, outlineSteps, onPaper, latticeOnPaper, legalPose, onSegment, stencilAt, stencilFits, replay, step, touched, knobVisits, copyOf, knobFor, cornerOf, tipsOf} from './machine.js';

export * from './machine.js';
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
export const MODES = ['dots', 'trace', 'region', 'anchor', 'shift', 'chain', 'playground'];
const COPY_MODES = ['anchor', 'shift', 'chain'];
const exactKeys = (o, keys) => Object.keys(o).length === keys.length && keys.every(k => Object.hasOwn(o, k));
const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

// --- What a puzzle asks ------------------------------------------------------
// Lattice points of the paper.
const latticeCache = new WeakMap();
export function lattice(q) {
  if (!latticeCache.has(q)) {
    const out = [];
    for (let y = 0; y <= q.paper[1]; y++) for (let x = 0; x <= q.paper[0]; x++) out.push([x, y]);
    latticeCache.set(q, out);
  }
  return latticeCache.get(q);
}
// Region: is the pencil inside the box (edges count) for knob t?
export function inBox(q, kinds, pins, t) {
  const tips = legalPose(q, kinds, pins, quarter(t));
  if (!tips) return false;
  const [[x0, y0], [x1, y1]] = q.box, p = tips.at(-1);
  return p[0] >= Q * x0 && p[0] <= Q * x1 && p[1] >= Q * y0 && p[1] <= Q * y1;
}
const insideCache = new WeakMap();
// Every knob dot that keeps the pencil in the box.
export function insideDots(q) {
  if (!insideCache.has(q)) {
    const kinds = q.machines, pins = q.pins.map(quarter);
    insideCache.set(q, lattice(q).filter(t => inBox(q, kinds, pins, t)).map(key));
  }
  return insideCache.get(q);
}
// The pale outline as steps, in quarter units.
const targetCache = new WeakMap();
export const targetSteps = q => { if (!targetCache.has(q)) targetCache.set(q, outlineSteps(q.target)); return targetCache.get(q); };
// Does a configuration (machines, pins, picture offset) copy the green shape
// onto the outline, with the machine open and on the paper at every corner?
// (Between corners the tips move in straight lines, so they stay on the paper.)
export function workable(q, kinds, pins, at) {
  const shape = stencilAt(q, at);
  if (!shape.every(p => latticeOnPaper(q, p))) return false;
  const copy = copyOf(q, kinds, pins, shape);
  if (!copy) return false;
  return sameSet(stepSet(copy.map((p, i) => [p, copy[(i + 1) % copy.length]])), targetSteps(q));
}
// Every configuration that solves a copy puzzle, found by trying every pin and
// picture place the puzzle lets move (on lattice points of the paper).
const solutionCache = new WeakMap();
export function solutions(q) {
  if (solutionCache.has(q)) return solutionCache.get(q);
  const movable = q.movable || {}, pinChoices = q.pins.map((p, k) => movable.pins?.[k] ? lattice(q) : [p]);
  const atChoices = movable.stencil ? offsets(q) : [[0, 0]];
  const out = [];
  const walk = (k, chosen) => {
    if (k === pinChoices.length) {
      for (const at of atChoices) if (workable(q, q.machines, chosen.map(quarter), at)) out.push({pins: chosen.map(p => [...p]), at: [...at]});
      return;
    }
    for (const p of pinChoices[k]) walk(k + 1, [...chosen, p]);
  };
  walk(0, []);
  solutionCache.set(q, out);
  return out;
}
// Every offset that keeps the green shape on the paper.
export function offsets(q) {
  const xs = q.stencil.map(p => p[0]), ys = q.stencil.map(p => p[1]), out = [];
  for (let dy = -Math.min(...ys); dy <= q.paper[1] - Math.max(...ys); dy++) for (let dx = -Math.min(...xs); dx <= q.paper[0] - Math.max(...xs); dx++) out.push([dx, dy]);
  return out;
}

// --- Boards ------------------------------------------------------------------
// A puzzle's board is {log}; a region puzzle's is {log, shut, claimed}, where
// shut is the knob dots found when That's all was last refused; the
// playground's is {kind, pins, tracer, log}.
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {kind: q.machines[0], pins: q.pins.map(pt => [...pt]), tracer: [...q.tracer], log: []};
  if (q.mode === 'region') return {log: [], shut: null, claimed: false};
  return {log: []};
}
const stateCache = new WeakMap();
export function stateOf(p, b) {
  if (!object(b)) return null;
  if (!stateCache.has(b)) stateCache.set(b, replay(p.parameters, b));
  return stateCache.get(b);
}
export const found = (p, b) => knobVisits(stateOf(p, b));
export const complete = (p, b) => { const seen = found(p, b); return insideDots(p.parameters).every(k => seen.has(k)); };
// A refused That's all holds while the dots found are among those it judged.
export const refused = (p, b) => Array.isArray(b.shut) && [...found(p, b)].every(k => b.shut.includes(k));
const keyPoint = k => typeof k === 'string' && /^\d+,\d+$/.test(k) ? k.split(',').map(Number) : null;
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    if (!exactKeys(b, ['kind', 'pins', 'tracer', 'log']) || !KINDS.includes(b.kind) || !Array.isArray(b.pins) || b.pins.length !== 1 || !latticeOnPaper(q, b.pins[0]) || !latticeOnPaper(q, b.tracer)) return false;
    return stateOf(p, b) !== null;
  }
  if (q.mode === 'region') {
    if (!exactKeys(b, ['log', 'shut', 'claimed']) || typeof b.claimed !== 'boolean') return false;
    if (b.shut !== null && (!Array.isArray(b.shut) || b.shut.length > lattice(q).length || new Set(b.shut).size !== b.shut.length || !b.shut.every(k => { const pt = keyPoint(k); return pt && latticeOnPaper(q, pt); }))) return false;
    if (stateOf(p, b) === null) return false;
    // A refusal must have been right and possible: some box dot was missing
    // from it, and at least one was found (That's all is off before then).
    if (b.shut && (insideDots(q).every(k => b.shut.includes(k)) || !insideDots(q).some(k => b.shut.includes(k)))) return false;
    if (b.claimed && (!complete(p, b) || refused(p, b))) return false;
    return true;
  }
  return exactKeys(b, ['log']) && stateOf(p, b) !== null;
}
// What the current sheet drew, as steps: the knob's and the last pencil's.
const drawnPen = st => stepSet(st.sheet.pens.at(-1));
const drawnKnob = st => stepSet(st.sheet.tr);
const subset = (a, b) => [...a].every(x => b.has(x));
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  const st = stateOf(p, b);
  if (q.mode === 'dots') { const seen = touched(st); return q.dots.every(d => seen.has(key(d))); }
  if (q.mode === 'region') return b.claimed;
  if (!sameSet(drawnPen(st), targetSteps(q))) return false;
  return q.mode === 'trace' || sameSet(drawnKnob(st), outlineSteps(q.stencil, st.at));
}
// Normalised actions: only the fields a move needs.
function clean(action) {
  if (!object(action)) return null;
  if ((action.type === 'draw' || action.type === 'hop' || action.type === 'stencil') && isPoint(action.to) && exactKeys(action, ['type', 'to'])) return {type: action.type, to: [...action.to]};
  if (action.type === 'pin' && int(action.k) && isPoint(action.to) && exactKeys(action, ['type', 'k', 'to'])) return {type: 'pin', k: action.k, to: [...action.to]};
  if ((action.type === 'tips' || action.type === 'clear' || action.type === 'all') && exactKeys(action, ['type'])) return {type: action.type};
  return null;
}
// That's all opens once a leaf dot is on the board: with none found it can never be right.
const anyLeaf = (p, b) => { const inside = insideDots(p.parameters); return [...found(p, b)].some(k => inside.includes(k)); };
export const canClaim = (p, b) => p.parameters.mode === 'region' && !b.claimed && !refused(p, b) && anyLeaf(p, b);
function move(p, b, raw) {
  const q = p.parameters, action = clean(raw);
  if (!action || !valid(p, b) || solved(p, b)) return null;
  const st = stateOf(p, b);
  if (q.mode === 'region' && action.type === 'all') {
    if (!canClaim(p, b)) return null;
    return complete(p, b) ? {...b, claimed: true} : {...b, shut: [...found(p, b)].sort()};
  }
  if (q.mode === 'playground' && action.type === 'clear') {
    if (!b.log.length) return null;
    return {kind: st.kinds[0], pins: [st.pins[0].map(v => v / Q)], tracer: st.t.map(v => v / Q), log: []};
  }
  if (!step(q, st, action)) return null;
  if (b.log.length >= MAX_LOG) {
    // The playground starts a new drawing from where the machine is; a puzzle
    // record stops at its cap.
    if (q.mode !== 'playground') return null;
    return {kind: st.kinds[0], pins: [st.pins[0].map(v => v / Q)], tracer: st.t.map(v => v / Q), log: [action]};
  }
  return {...b, log: [...b.log, action]};
}

// --- Hints -------------------------------------------------------------------
const lat = p => [p[0] / Q, p[1] / Q];
const near = (list, from) => [...list].sort((a, b) => dist2(a, from) - dist2(b, from))[0];
const hop = (to, text) => ({type: 'move', action: {type: 'hop', to}, text, at: to});
const draw = (to, text) => ({type: 'move', action: {type: 'draw', to}, text, at: to});
const half = kinds => kinds.length === 1 && kinds[0] === 'half';
// The knob's outline for a trace: the green shape, or what the knob must go
// round for the pencil to draw the pale outline.
function knobOutline(q, st) {
  if (COPY_MODES.includes(q.mode)) return stencilAt(q, st.at);
  return q.target.map(c => knobFor(st.kinds, st.pins, quarter(c)));
}
// The next step round an outline: finish a side the knob is on, or lift it to
// the nearest corner of a side not drawn yet.
function traceStep(q, st, words) {
  const K = knobOutline(q, st), drawn = drawnPen(st), t = lat(st.t);
  const sides = K.map((a, i) => [a, K[(i + 1) % K.length]]);
  const image = ([a, b]) => stepsOf(tipsOf(st.kinds, st.pins, quarter(a)).at(-1), tipsOf(st.kinds, st.pins, quarter(b)).at(-1));
  const open = sides.filter(s => !subset(image(s), drawn));
  for (const [a, b] of open) {
    if (same(a, t)) return draw(b, words.draw);
    if (same(b, t)) return draw(a, words.draw);
  }
  for (const [a, b] of open) if (onSegment(t, a, b)) return draw(b, words.draw);
  return hop(near(open.flatMap(s => s), t), words.hop);
}
const WORDS = {
  double: {dot: 'Put the knob halfway between the pin and a dot.', hop: 'Put the knob halfway between the pin and a corner.', draw: 'Drag the knob to the next corner’s halfway dot.'},
  half: {dot: 'Put the knob twice as far from the pin as a dot.', hop: 'Put the knob twice as far from the pin as a corner.', draw: 'Drag the knob to the next corner’s far dot.'},
  copy: {hop: 'Put the knob on a corner of the green shape.', draw: 'Drag the knob along the green shape.'}
};
const offOutline = {type: 'deadend', quiet: true, text: 'The pencil drew off the outline. Undo.'};
const offShape = {type: 'deadend', quiet: true, text: 'The knob went off the green shape. Undo.'};
const tooLong = {type: 'deadend', quiet: true, text: 'That’s a lot of lines. Undo or Restart.'};
// For a copy puzzle: the change to make next on the way to a solution (a pin
// or the picture), or a lift of the knob to where that change is allowed.
function setUp(q, st) {
  const cur = {pins: st.pins.map(lat), at: st.at};
  const match = s => s.pins.filter((pin, k) => same(pin, cur.pins[k])).length + (same(s.at, cur.at) ? 1 : 0);
  const far = s => s.pins.reduce((d, pin, k) => d + dist2(pin, cur.pins[k]), 0) + dist2(s.at, cur.at);
  const ranked = solutions(q).map((s, i) => ({s, i})).sort((a, b) => match(b.s) - match(a.s) || far(a.s) - far(b.s) || a.i - b.i).map(x => x.s);
  const legalAt = (pins, at, t) => legalPose(q, st.kinds, pins.map(quarter), quarter(t)) !== null;
  for (const s of ranked) {
    const changes = [];
    s.pins.forEach((pin, k) => { if (!same(pin, cur.pins[k])) changes.push({action: {type: 'pin', k, to: pin}, pins: cur.pins.map((x, j) => j === k ? pin : x), at: cur.at}); });
    if (!same(s.at, cur.at)) changes.push({action: {type: 'stencil', to: s.at}, pins: cur.pins, at: s.at});
    const t = lat(st.t);
    for (const c of changes) if (legalAt(c.pins, c.at, t)) return hintFor(q, c.action);
    // Lift the knob first, to a corner of the green shape if that will do.
    const spots = [...stencilAt(q, s.at), ...lattice(q)];
    for (const c of changes) for (const spot of spots) if (!same(spot, t) && legalAt(cur.pins, cur.at, spot) && legalAt(c.pins, c.at, spot)) return hop(spot, 'Lift the knob out of the way first.');
  }
  return null;
}
function hintFor(q, action) {
  if (action.type === 'stencil') return {type: 'move', action, text: 'Move the green shape half as far as the copy has to move, the same way.', ghost: action.to};
  const words = q.mode === 'chain'
    ? (action.k === 0 ? 'Move the first pin.' : 'The copy slides half as far as the second pin is from the first.')
    : half(q.machines) ? 'Each outline corner must be halfway between the pin and its green corner.' : 'Each green corner must be halfway between the pin and its outline corner.';
  return {type: 'move', action, text: words, at: action.to};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return {type: 'note'};
  if (solved(p, b)) return {type: 'done'};
  if (b.log.length >= MAX_LOG - 30) return tooLong;
  const st = stateOf(p, b), t = lat(st.t), kind = half(st.kinds) ? 'half' : 'double';
  if (q.mode === 'dots') {
    const seen = touched(st), left = q.dots.filter(d => !seen.has(key(d)));
    const pen = lat(st.tips.at(-1)), d = near(left, pen);
    return hop(knobFor(st.kinds, st.pins, quarter(d)), WORDS[kind].dot);
  }
  if (q.mode === 'region') {
    const seen = found(p, b), left = insideDots(q).filter(k => !seen.has(k)).map(keyPoint);
    if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Every dot is found. Press That’s all.', button: true};
    return hop(near(left, t), 'Find a dot where the pencil lands in the box.');
  }
  if (q.mode === 'trace') {
    if (!subset(drawnPen(st), targetSteps(q))) return offOutline;
    return traceStep(q, st, WORDS[kind]);
  }
  // Copy puzzles: set the machine up, then trace the green shape.
  if (!workable(q, st.kinds, st.pins, st.at)) return setUp(q, st) || {type: 'deadend', quiet: true, text: 'Restart.'};
  if (!subset(drawnKnob(st), outlineSteps(q.stencil, st.at))) return offShape;
  if (!subset(drawnPen(st), targetSteps(q))) return offOutline;
  return traceStep(q, st, WORDS.copy);
}

// --- Drawing -----------------------------------------------------------------
export const U = 10, MARGIN = 0.75;
const f = n => Number(n.toFixed(2));
// Screen position of a point in quarter units, and of a lattice point.
const sx = (q, p) => f(p[0] / Q * U), sy = (q, p) => f((q.paper[1] - p[1] / Q) * U);
const xy = (q, p) => `${sx(q, p)},${sy(q, p)}`;
const at4 = p => quarter(p);
// The frame of one machine in lattice units: pin o, T corner c, far tip; the
// rhombus X, Q, Y, c has sides a, the long bars 2a. The elbow goes the side
// that keeps Q nearer the paper and, for a second machine, away from the
// first machine's joints.
export const barOf = q => Math.hypot(q.paper[0], q.paper[1]) / 4 + 0.25;
export function frameOf(q, o, c, avoid = []) {
  const a = barOf(q), d = [c[0] - o[0], c[1] - o[1]], L = Math.hypot(d[0], d[1]);
  if (!L) return null;
  const m = [o[0] + d[0] / 2, o[1] + d[1] / 2], h = Math.sqrt(Math.max(a * a - L * L / 4, 0)), n = [-d[1] / L, d[0] / L];
  const off = p => Math.hypot(Math.max(0, -p[0], p[0] - q.paper[0]), Math.max(0, -p[1], p[1] - q.paper[1]));
  const crowd = fr => avoid.reduce((s, p) => s + 1 / (0.5 + Math.hypot(fr.Q[0] - p[0], fr.Q[1] - p[1]) + Math.hypot(fr.X[0] - p[0], fr.X[1] - p[1])), 0);
  const poses = [1, -1].map(s => { const X = [m[0] + s * h * n[0], m[1] + s * h * n[1]]; return {X, Q: [2 * X[0] - o[0], 2 * X[1] - o[1]], Y: [X[0] + d[0], X[1] + d[1]], F: [o[0] + 2 * d[0], o[1] + 2 * d[1]]}; });
  const score = fr => off(fr.Q) + 6 * crowd(fr);
  poses.sort((u, v) => score(u) - score(v) || v.Q[1] - u.Q[1]);
  return poses[0];
}
const L4 = p => [p[0] * Q, p[1] * Q];
function frameArt(q, kinds, pins, tips) {
  let art = '';
  const joints = [];
  kinds.forEach((kind, i) => {
    const o = lat(pins[i]), c = lat(cornerOf(kinds, tips, i)), fr = frameOf(q, o, c, joints);
    if (!fr) return;
    joints.push(fr.X, fr.Q, fr.Y);
    const line = (a, b, k) => `<line class="pg-rod ${k}" x1="${sx(q, L4(a))}" y1="${sy(q, L4(a))}" x2="${sx(q, L4(b))}" y2="${sy(q, L4(b))}"/>`;
    art += `<g class="pg-frame m${i}" aria-hidden="true">${line(o, fr.Q, 'long')}${line(fr.Q, fr.F, 'long')}${line(fr.X, c, 'short')}${line(c, fr.Y, 'short')}${[fr.X, fr.Q, fr.Y].map(v => `<circle class="pg-pivot" cx="${sx(q, L4(v))}" cy="${sy(q, L4(v))}" r="1.4"/>`).join('')}</g>`;
  });
  return art;
}
// The tips over the frame: the middle tip of a chain, the pencil, the knob.
function tipsArt(q, kinds, tips, opts = {}) {
  let art = '';
  for (let i = 1; i < tips.length - 1; i++) art += `<circle class="pg-mid" cx="${sx(q, tips[i])}" cy="${sy(q, tips[i])}" r="2.2" aria-hidden="true"/>`;
  const pen = tips.at(-1);
  art += `<g class="pg-pencil" aria-hidden="true"><circle class="pg-pencil-ring" cx="${sx(q, pen)}" cy="${sy(q, pen)}" r="3.3"/><circle class="pg-lead" cx="${sx(q, pen)}" cy="${sy(q, pen)}" r="1.7"/></g>`;
  const t = tips[0], label = opts.label ? ` role="button" tabindex="0" data-focus="pg-knob" aria-label="${esc(opts.label)}"` : '';
  art += `<g class="pg-knob" data-pg="knob"${label}><circle class="pg-hit" cx="${sx(q, t)}" cy="${sy(q, t)}" r="${REACH * U}"/><circle class="pg-knob-disc" cx="${sx(q, t)}" cy="${sy(q, t)}" r="4.4"/><circle class="pg-knob-hub" cx="${sx(q, t)}" cy="${sy(q, t)}" r="1.4"/></g>`;
  return art;
}
// A pin: a pine head with a pale point, or with its number when there are two.
const pinArt = (q, pin, k, opts = {}) => {
  const label = opts.label ? ` role="button" tabindex="0" data-focus="pg-pin-${k}" aria-label="${esc(opts.label)}"` : ' aria-hidden="true"';
  const mid = opts.mark ? `<text class="pg-pin-mark" x="${sx(q, pin)}" y="${f(sy(q, pin) + 1.8)}">${opts.mark}</text>` : `<circle class="pg-pin-point" cx="${sx(q, pin)}" cy="${sy(q, pin)}" r="1.1"/>`;
  return `<g class="pg-pin m${k}${opts.movable ? ' movable' : ''}" data-pg="pin-${k}"${label}>${opts.movable ? `<circle class="pg-hit" cx="${sx(q, pin)}" cy="${sy(q, pin)}" r="${REACH * U}"/>` : ''}<circle class="pg-pin-head" cx="${sx(q, pin)}" cy="${sy(q, pin)}" r="${opts.mark ? 3.7 : 3.4}"/>${mid}</g>`;
};
const poly = (q, pts) => pts.map(p => xy(q, at4(p))).join(' ');
const segs = (q, list, cls) => list.map(([a, b]) => `<line class="${cls}" x1="${sx(q, a)}" y1="${sy(q, a)}" x2="${sx(q, b)}" y2="${sy(q, b)}"/>`).join('');
// Lines of a sheet, each marked on or off the outline it should follow.
const marked = (q, list, steps, cls) => list.map(([a, b]) => `<line class="${cls}${steps ? (subset(stepsOf(a, b), steps) ? ' on' : ' off') : ''}" x1="${sx(q, a)}" y1="${sy(q, a)}" x2="${sx(q, b)}" y2="${sy(q, b)}"/>`).join('');
function sheetArt(q, sh, faded) {
  const copy = COPY_MODES.includes(q.mode) && !faded, trace = (q.mode === 'trace' || COPY_MODES.includes(q.mode)) && !faded;
  let art = marked(q, sh.tr, copy ? outlineSteps(q.stencil, sh.at) : null, 'pg-track');
  sh.pens.slice(0, -1).forEach(list => { art += segs(q, list, 'pg-midline'); });
  art += marked(q, sh.pens.at(-1), trace ? targetSteps(q) : null, 'pg-ink');
  return `<g class="pg-sheet${faded ? ' faded' : ''}" aria-hidden="true">${art}</g>`;
}
const pointWords = p => `${f(p[0] / Q)}, ${f(p[1] / Q)}`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const KIND_LABEL = {double: '×2', half: '×½'};
const moveButton = (label, action, cls, enabled, extra = '') => `<button type="button" class="secondary pg-button ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="pg-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;

export function boardArt(p, b, opts = {}) {
  const q = p.parameters, st = stateOf(p, b), [W, H] = q.paper, done = opts.done, play = q.mode === 'playground';
  const hinted = opts.hinted || null, view = [-MARGIN * U, -MARGIN * U, (W + 2 * MARGIN) * U, (H + 2 * MARGIN) * U].map(f).join(' ');
  let under = '', over = '';
  // Paper and dots.
  under += `<rect class="pg-paper" x="0" y="0" width="${W * U}" height="${H * U}" rx="2"/>`;
  under += `<g class="pg-dots" aria-hidden="true">${lattice(q).map(pt => `<circle cx="${pt[0] * U}" cy="${(H - pt[1]) * U}" r="0.9"/>`).join('')}</g>`;
  // What the puzzle asks for.
  if (q.mode === 'region') {
    const [[x0, y0], [x1, y1]] = q.box, seen = found(p, b);
    under += `<rect class="pg-box" x="${x0 * U}" y="${(H - y1) * U}" width="${(x1 - x0) * U}" height="${(y1 - y0) * U}"/>`;
    const inside = new Set(insideDots(q));
    under += `<g class="pg-marks" aria-hidden="true">${[...seen].map(k => { const [x, y] = keyPoint(k); return inside.has(k) ? `<circle class="pg-mark in" cx="${x * U}" cy="${(H - y) * U}" r="2.3"/>` : `<path class="pg-mark out" d="M${x * U - 1.8} ${(H - y) * U - 1.8}l3.6 3.6m0 -3.6l-3.6 3.6"/>`; }).join('')}</g>`;
  }
  if (q.target) under += `<polygon class="pg-target" points="${poly(q, q.target)}"/>`;
  if (q.stencil && !play) {
    const movable = q.movable?.stencil && !done;
    // A movable shape takes a press up to half a step outside its edge
    // (grip), shown by a clear band round it, so a thin triangle is still a
    // 40 px target on a phone.
    const pts = poly(q, stencilAt(q, st.at));
    under += movable
      ? `<g class="pg-stencil-grip movable" data-pg="stencil" role="button" tabindex="0" data-focus="pg-stencil" aria-label="Green shape. Drag it, or use the arrow keys."><polygon class="pg-stencil-reach" points="${pts}"/><polygon class="pg-stencil movable" points="${pts}"/></g>`
      : `<polygon class="pg-stencil" data-pg="stencil" points="${pts}" aria-hidden="true"/>`;
  }
  if (hinted?.ghost) under += `<polygon class="pg-ghost" points="${poly(q, stencilAt(q, hinted.ghost))}" aria-hidden="true"/>`;
  // Earlier sheets, faded (the last one with lines; every one in the playground).
  const earlier = st.sheets.slice(0, -1).filter(sh => sh.tr.length);
  for (const sh of play ? earlier : earlier.slice(-1)) under += sheetArt(q, sh, true);
  under += sheetArt(q, st.sheet, false);
  if (q.mode === 'dots') {
    const seen = touched(st);
    under += `<g class="pg-targets" aria-hidden="true">${q.dots.map(d => `<circle class="pg-target-dot${seen.has(key(d)) ? ' hit' : ''}" cx="${d[0] * U}" cy="${(H - d[1]) * U}" r="2.8"/>`).join('')}</g>`;
  }
  // The machine: frames, pins, tips.
  const live = !done;
  over += `<g class="pg-machine">${frameArt(q, st.kinds, st.pins, st.tips)}`;
  st.pins.forEach((pin, k) => {
    const movable = Boolean(q.movable?.pins?.[k]) && live;
    over += pinArt(q, pin, k, {movable, mark: st.pins.length > 1 ? String(k + 1) : '', label: movable ? `${st.pins.length > 1 ? `Pin ${k + 1}` : 'Pin'} at ${pointWords(pin)}. Drag it, or use the arrow keys.` : ''});
  });
  over += tipsArt(q, st.kinds, st.tips, {label: live ? `Knob at ${pointWords(st.t)}. Drag it to draw. Arrow keys draw one step; with Shift the knob moves without drawing.` : ''});
  over += '</g>';
  if (hinted?.at) over += `<circle class="pg-hint" cx="${hinted.at[0] * U}" cy="${(H - hinted.at[1]) * U}" r="5.4" aria-hidden="true"/>`;
  return `<svg class="pg-board${done ? ' done' : ''}" viewBox="${view}" data-w="${W}" data-h="${H}" aria-label="Paper with a drawing machine">${under}${over}<g class="pg-live" aria-hidden="true"></g></svg>`;
}

function render(p, a) {
  const q = p.parameters, b = a.board, st = stateOf(p, b), done = solved(p, b), play = q.mode === 'playground';
  const hinted = !play && a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const shown = hinted?.type === 'move' ? hinted : null;
  const board = boardArt(p, b, {done, hinted: shown});
  let bar = '';
  if (q.mode === 'region' && !done) bar = moveButton('That’s all', {type: 'all'}, `pg-all${shown?.button ? ' hinted' : ''}`, canClaim(p, b));
  if (play) {
    const kinds = KINDS.map(k => `<button type="button" class="secondary pg-kind" data-action="expansion-move" data-move='${JSON.stringify({type: 'tips'})}' data-focus="pg-kind-${k}" aria-pressed="${st.kinds[0] === k}" ${st.kinds[0] === k ? 'disabled' : ''}>${KIND_LABEL[k]}</button>`).join('');
    bar = `<div class="pg-kinds" role="group" aria-label="Machine">${kinds}</div>${moveButton('Clear', {type: 'clear'}, 'pg-clear', b.log.length > 0)}`;
  }
  const told = q.mode === 'region' && !done && refused(p, b) ? 'There are more.' : '';
  const status = statusOf(p, b, st, done);
  return `<div class="pg-puzzle pg-mode-${q.mode}${done ? ' solved' : ''}" data-mechanic-wire="pantograph">${bar ? `<div class="pg-bar">${bar}</div>` : ''}${board}${told ? `<p class="pg-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function statusOf(p, b, st, done) {
  const q = p.parameters, pen = `Knob at ${pointWords(st.t)}, pencil at ${pointWords(st.tips.at(-1))}.`;
  if (q.mode === 'dots') { const seen = touched(st); return `${pen} ${q.dots.filter(d => seen.has(key(d))).length} of ${plural(q.dots.length, 'dot')} reached.`; }
  if (q.mode === 'region') return `${pen} ${plural([...found(p, b)].filter(k => insideDots(q).includes(k)).length, 'knob dot')} found with the pencil in the box.${done ? ' That’s all.' : ''}`;
  if (q.mode === 'playground') return `${pen} The machine is ${KIND_LABEL[st.kinds[0]]}.`;
  const lines = st.sheet.pens.at(-1).length;
  return `${pen} ${plural(lines, 'pencil line')} on this sheet.${done ? ' The copy is on the outline.' : ''}`;
}

// --- Gestures ----------------------------------------------------------------
// Drag the knob: one straight line, drawn when it is let go on a dot. Tap a
// dot: the knob is lifted there. Drag a pin or the green shape to move it.
// A dragged knob, pin or shape follows the finger's motion, and on a touch
// screen rides LIFT pixels above the finger so the finger doesn't hide it.
// Arrow keys on the knob draw a step (Shift lifts it); on a pin or the shape
// they move it a step.
export const LIFT = 34;
// A press inside the movable shape, or within GRIP steps of its edge, takes it.
export const GRIP = 0.5;
// A drag takes the knob or a movable pin from up to REACH steps away (the
// nearest of them, drawn as its clear hit circle); a tap still goes to the
// nearest dot.
export const REACH = 0.85;
export function nearestHandle(handles, pos) {
  let best = null;
  for (const [what, [x, y]] of handles) { const d = Math.hypot(pos[0] - x, pos[1] - y); if (d <= REACH && (!best || d < best.d)) best = {what, d}; }
  return best?.what ?? null;
}
export function nearShape(poly, pos, reach) {
  if (inside(poly, pos)) return true;
  const [x, y] = pos;
  return poly.some(([ax, ay], i) => {
    const [bx, by] = poly[(i + 1) % poly.length], vx = bx - ax, vy = by - ay, len = vx * vx + vy * vy;
    const t = len ? Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len)) : 0;
    return Math.hypot(x - ax - t * vx, y - ay - t * vy) <= reach;
  });
}
// Is point p inside the polygon (lattice units)?
function inside(poly, [x, y]) {
  let odd = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) odd = !odd;
  }
  return odd;
}
const STEPS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1]};
function wire(root, p, api) {
  const q = p.parameters, svg = root.querySelector('.pg-board');
  if (!svg) return;
  const board = () => api.attempt().board;
  const tryApply = action => { const b = board(); if (move(p, b, action)) api.apply(action); };
  const toBoard = e => { const m = svg.getScreenCTM?.(); if (!m) return null; const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const r = pt.matrixTransform(m.inverse()); return [r.x / U, q.paper[1] - r.y / U]; };
  const snap = pos => [Math.min(q.paper[0], Math.max(0, Math.round(pos[0]))), Math.min(q.paper[1], Math.max(0, Math.round(pos[1])))];
  const liveLayer = svg.querySelector('.pg-live');
  const clear = () => { liveLayer.replaceChildren(); svg.classList.remove('dragging', 'drag-knob', 'drag-pin-0', 'drag-pin-1', 'drag-stencil'); };
  let drag = null;
  // What a press takes hold of, by where it is rather than by its target (a
  // touch screen may hand a tap near the knob to the knob): the knob or a
  // movable pin when its dot is the nearest, else the movable green shape when
  // the press is inside it, else the paper.
  const grip = (st, pos) => {
    const handle = nearestHandle([['knob', lat(st.t)], ...st.pins.flatMap((pin, k) => q.movable?.pins?.[k] ? [[`pin-${k}`, lat(pin)]] : [])], pos);
    if (handle) return handle;
    if (q.movable?.stencil && nearShape(stencilAt(q, st.at), pos, GRIP)) return 'stencil';
    return 'paper';
  };
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary || solved(p, board())) return;
    const pos = toBoard(e);
    if (!pos) return;
    const st = stateOf(p, board());
    drag = {what: grip(st, pos)};
    // Where the handle was when pressed, in lattice units.
    const handle = drag.what === 'knob' ? lat(st.t) : drag.what.startsWith('pin') ? lat(st.pins[Number(drag.what.slice(4))]) : st.at;
    Object.assign(drag, {pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false, action: null, handle, start: pos, lift: e.pointerType === 'touch' ? LIFT : 0});
    if (drag.what !== 'paper') { svg.setPointerCapture?.(e.pointerId); e.preventDefault(); }
  });
  svg.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.pointer || drag.what === 'paper') return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
    drag.moved = true;
    const raised = toBoard({clientX: e.clientX, clientY: e.clientY - drag.lift});
    if (!raised) return;
    // The handle moves as the pointer has moved since the press.
    const pos = [drag.handle[0] + raised[0] - drag.start[0], drag.handle[1] + raised[1] - drag.start[1]];
    const b = board(), st = stateOf(p, b);
    let action, art = '';
    if (drag.what === 'knob') {
      const to = snap(pos);
      if (same(quarter(to), st.t)) { clear(); drag.action = null; return; }
      action = {type: 'draw', to};
      const next = step(q, st, action);
      if (next) art = `<line class="pg-track preview" x1="${sx(q, st.t)}" y1="${sy(q, st.t)}" x2="${sx(q, next.t)}" y2="${sy(q, next.t)}"/>${next.tips.slice(1).map((tip, i) => `<line class="${i === next.tips.length - 2 ? 'pg-ink' : 'pg-midline'} preview" x1="${sx(q, st.tips[i + 1])}" y1="${sy(q, st.tips[i + 1])}" x2="${sx(q, tip)}" y2="${sy(q, tip)}"/>`).join('')}${frameArt(q, st.kinds, st.pins, next.tips)}${st.pins.map((pin, k) => pinArt(q, pin, k)).join('')}${tipsArt(q, st.kinds, next.tips)}`;
      else art = `${frameArt(q, st.kinds, st.pins, st.tips)}${st.pins.map((pin, k) => pinArt(q, pin, k)).join('')}${tipsArt(q, st.kinds, st.tips)}<circle class="pg-refuse" cx="${to[0] * U}" cy="${(q.paper[1] - to[1]) * U}" r="4.4"/>`;
      drag.action = next ? action : null;
    } else if (drag.what.startsWith('pin')) {
      const k = Number(drag.what.slice(4)), to = snap(pos);
      if (same(quarter(to), st.pins[k])) { clear(); drag.action = null; return; }
      action = {type: 'pin', k, to};
      const next = step(q, st, action);
      const pins = next ? next.pins : st.pins, tips = next ? next.tips : st.tips;
      art = `${frameArt(q, st.kinds, pins, tips)}${pins.map((pin, j) => pinArt(q, pin, j, {mark: pins.length > 1 ? String(j + 1) : ''})).join('')}${tipsArt(q, st.kinds, tips)}${next ? '' : `<circle class="pg-refuse" cx="${to[0] * U}" cy="${(q.paper[1] - to[1]) * U}" r="3.4"/>`}`;
      drag.action = next ? action : null;
    } else if (drag.what === 'stencil') {
      const to = [Math.round(pos[0]), Math.round(pos[1])];
      if (same(to, st.at)) { clear(); drag.action = null; return; }
      action = {type: 'stencil', to};
      const ok = stencilFits(q, to) && !same(to, st.at);
      art = `<polygon class="pg-stencil preview${stencilFits(q, to) ? '' : ' refused'}" points="${poly(q, stencilAt(q, to))}"/>`;
      drag.action = ok ? action : null;
    }
    svg.classList.add('dragging', `drag-${drag.what}`);
    liveLayer.innerHTML = art;
  });
  const end = e => {
    if (!drag || e.pointerId !== drag.pointer) return;
    const d = drag;
    drag = null;
    clear();
    if (e.type !== 'pointerup') return;
    if (d.moved && d.what !== 'paper') { if (d.action) tryApply(d.action); return; }
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) >= 12) return;
    // A tap: lift the knob to the nearest dot (a tap on the knob's own dot does nothing).
    const pos = toBoard(e);
    if (!pos) return;
    const to = [Math.round(pos[0]), Math.round(pos[1])];
    if (d.what === 'knob' && same(to, d.handle)) return;
    if (Math.hypot(pos[0] - to[0], pos[1] - to[1]) > .6 || !latticeOnPaper(q, to)) return;
    tryApply({type: 'hop', to});
  };
  svg.addEventListener('pointerup', end);
  svg.addEventListener('pointercancel', end);
  svg.addEventListener('keydown', e => {
    const dir = STEPS[e.key], what = e.target.closest?.('[data-pg]')?.dataset.pg;
    if (!dir || !what || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const st = stateOf(p, board());
    if (what === 'knob') { const t = lat(st.t); tryApply({type: e.shiftKey ? 'hop' : 'draw', to: [t[0] + dir[0], t[1] + dir[1]]}); }
    else if (what.startsWith('pin')) { const k = Number(what.slice(4)), pin = lat(st.pins[k]); tryApply({type: 'pin', k, to: [pin[0] + dir[0], pin[1] + dir[1]]}); }
    else if (what === 'stencil') tryApply({type: 'stencil', to: [st.at[0] + dir[0], st.at[1] + dir[1]]});
  });
}

export const pantographMechanics = {
  pantograph: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo takes back lines and moves, never a refused That's all: it holds
    // while the knob dots found are among those it judged.
    carry(p, from, to) {
      if (p.parameters.mode !== 'region' || !object(from) || !object(to) || !Array.isArray(from.shut) || JSON.stringify(from.shut) === JSON.stringify(to.shut)) return to;
      const next = {...to, shut: from.shut};
      return valid(p, next) && refused(p, next) ? next : to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'pantograph',
  family: {id: 'pantograph', symbol: '⟋'},
  mechanics: pantographMechanics,
  pack: new URL('./pantograph.json', import.meta.url).href,
  css: new URL('./pantograph.css', import.meta.url).href,
  focus: '.pg-board [role="button"],.pg-button:not([disabled])'
};
