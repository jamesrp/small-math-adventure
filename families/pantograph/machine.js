// Drawing machines (worksheet Week 85): the geometry of a pantograph on a
// lattice, with no drawing and no DOM. A machine is pinned at O. Its tracer
// knob T and its pencil P always satisfy P = O + 2(T − O): the machine is the
// dilation by 2 about O. With the tips swapped the knob is the far tip and the
// pencil draws at O + (T − O)/2, the dilation by ½. Two machines can be
// chained: the first machine's pencil drives the second machine's knob, and
// the copy of a copy is the composite map. A ×2 machine followed by a ×½
// machine is a translation by half the gap between their pins.
//
// The knob stays on lattice points, so every pencil position is exact. Points
// are kept in quarter units (Q = 4 per lattice step): a ×½ machine can put a
// pencil on a half point, and a chain of two can halve twice.
export const Q = 4;
export const KINDS = ['double', 'half'];
export const MAX_LOG = 160;

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isSafeInteger;
export const isPoint = p => Array.isArray(p) && p.length === 2 && p.every(int);
export const same = (a, b) => a[0] === b[0] && a[1] === b[1];
export const quarter = ([x, y]) => [Q * x, Q * y];
export const key = ([x, y]) => `${x},${y}`;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

// One machine's pencil for a knob at t (quarter units), pinned at o.
export function outOf(kind, o, t) {
  if (kind === 'double') return [2 * t[0] - o[0], 2 * t[1] - o[1]];
  const s = [t[0] + o[0], t[1] + o[1]];
  if (s[0] % 2 || s[1] % 2) throw new Error('a half point below a quarter unit');
  return [s[0] / 2, s[1] / 2];
}
// Every tip of a chain, knob first: [T, P1, P2, …] in quarter units.
export function tipsOf(kinds, pins, t) {
  const out = [t];
  kinds.forEach((kind, i) => out.push(outOf(kind, pins[i], out[i])));
  return out;
}
// The knob that puts the last pencil on point p (quarter units), or null when
// that knob would be off the lattice.
export function knobFor(kinds, pins, p) {
  let at = p;
  for (let i = kinds.length - 1; i >= 0; i--) {
    const o = pins[i];
    if (kinds[i] === 'double') {
      const s = [at[0] + o[0], at[1] + o[1]];
      if (s[0] % 2 || s[1] % 2) return null;
      at = [s[0] / 2, s[1] / 2];
    } else at = [2 * at[0] - o[0], 2 * at[1] - o[1]];
  }
  return at[0] % Q || at[1] % Q ? null : [at[0] / Q, at[1] / Q];
}
// The T corner of machine i's frame: its knob for ×2, its pencil for ×½ (the
// frame is the same; only which tip is held changes).
export const cornerOf = (kinds, tips, i) => kinds[i] === 'double' ? tips[i] : tips[i + 1];

// --- Steps -------------------------------------------------------------------
// A segment between two quarter points is a run of primitive steps; two
// drawings agree when their sets of steps agree. Collinear pieces share their
// steps, so a side drawn in two parts, or twice, is the same side.
export function stepsOf(a, b, into = new Set()) {
  const dx = b[0] - a[0], dy = b[1] - a[1], g = gcd(dx, dy);
  if (!g) return into;
  const sx = dx / g, sy = dy / g;
  for (let k = 0; k < g; k++) {
    const p = [a[0] + k * sx, a[1] + k * sy], q = [p[0] + sx, p[1] + sy];
    into.add(p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? `${key(p)}|${key(q)}` : `${key(q)}|${key(p)}`);
  }
  return into;
}
export const stepSet = segments => segments.reduce((set, [a, b]) => stepsOf(a, b, set), new Set());
// A closed outline of lattice points, as steps in quarter units.
export const outlineSteps = (poly, shift = [0, 0]) => stepSet(poly.map((p, i) => [quarter(add(p, shift)), quarter(add(poly[(i + 1) % poly.length], shift))]));
export const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
export const add = (p, d) => [p[0] + d[0], p[1] + d[1]];
// Lattice points lying on a segment between quarter points (as lattice points).
export function latticeOn(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], g = gcd(dx, dy), out = [];
  if (!g) return a[0] % Q || a[1] % Q ? out : [[a[0] / Q, a[1] / Q]];
  for (let k = 0; k <= g; k++) {
    const x = a[0] + k * dx / g, y = a[1] + k * dy / g;
    if (x % Q === 0 && y % Q === 0) out.push([x / Q, y / Q]);
  }
  return out;
}

// --- Positions ---------------------------------------------------------------
export const onPaper = (q, [x, y]) => x >= 0 && y >= 0 && x <= Q * q.paper[0] && y <= Q * q.paper[1];
export const latticeOnPaper = (q, p) => isPoint(p) && onPaper(q, quarter(p));
// A pose is legal when every tip is on the paper and no machine is folded shut.
// Machine i folds shut when its T corner sits on its pin, which happens
// exactly when the tip driving it (tips[i]) is on the pin, for ×2 and ×½ alike.
export function legalPose(q, kinds, pins, t) {
  const tips = tipsOf(kinds, pins, t);
  if (!tips.every(p => onPaper(q, p))) return null;
  for (let i = 0; i < kinds.length; i++) if (same(tips[i], pins[i])) return null;
  return tips;
}
// A slide may pass over a pin (the frame flattens for an instant and opens
// again); only a pose at rest has to be open.
// Is point p on the closed segment from a to b (all integers)?
export const onSegment = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) === (b[1] - a[1]) * (p[0] - a[0]) && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);
export const stencilAt = (q, at) => q.stencil.map(p => add(p, at));
export const stencilFits = (q, at) => stencilAt(q, at).every(p => latticeOnPaper(q, p));

// --- Replaying a record ------------------------------------------------------
// A board is {log} for a puzzle, and {kind, pins, tracer, log} in the
// playground. The log holds only the child's moves:
//   {type: 'draw', to}   the knob slides straight to lattice point `to`, every
//                        pencil drawing;
//   {type: 'hop', to}    the knob is lifted and put down at `to`;
//   {type: 'pin', k, to} pin k moves (a fresh sheet);
//   {type: 'stencil', to} the picture moves to offset `to` (a fresh sheet);
//   {type: 'tips'}       the playground's machine swaps its tips (a fresh sheet).
// A sheet holds what was drawn since the last fresh one: the knob's path, each
// pencil's segments and the last pencil's stops.
function sheet(kinds, pins, at, tips) {
  return {kinds: [...kinds], pins: pins.map(p => [...p]), at: [...at], tr: [], pens: kinds.map(() => []), stops: [tips.at(-1)], knobs: [tips[0]]};
}
export function startOf(q, b) {
  const play = q.mode === 'playground';
  return {kinds: play ? [b.kind] : [...q.machines], pins: (play ? b.pins : q.pins).map(quarter), t: quarter(play ? b.tracer : q.tracer)};
}
export function replay(q, b) {
  if (!object(b) || !Array.isArray(b.log) || b.log.length > MAX_LOG) return null;
  let {kinds, pins, t} = startOf(q, b), at = [0, 0];
  let tips = legalPose(q, kinds, pins, t);
  if (!tips) return null;
  const sheets = [sheet(kinds, pins, at, tips)];
  for (const action of b.log) {
    const next = step(q, {kinds, pins, t, at, tips}, action);
    if (!next) return null;
    const cur = sheets.at(-1);
    if (next.fresh) sheets.push(sheet(next.kinds, next.pins, next.at, next.tips));
    else if (action.type === 'draw') {
      cur.tr.push([t, next.t]);
      next.tips.slice(1).forEach((p, i) => cur.pens[i].push([tips[i + 1], p]));
      cur.stops.push(next.tips.at(-1)); cur.knobs.push(next.t);
    } else { cur.stops.push(next.tips.at(-1)); cur.knobs.push(next.t); }
    ({kinds, pins, t, at, tips} = next);
  }
  return {kinds, pins, t, at, tips, sheets, sheet: sheets.at(-1)};
}
// One move from a state, or null when it is illegal.
export function step(q, s, action) {
  if (!object(action)) return null;
  const {kinds, pins, t, at} = s;
  if (action.type === 'draw' || action.type === 'hop') {
    if (!latticeOnPaper(q, action.to) || Object.keys(action).length !== 2) return null;
    const nt = quarter(action.to);
    if (same(nt, t)) return null;
    const tips = legalPose(q, kinds, pins, nt);
    return tips ? {kinds, pins, t: nt, at, tips} : null;
  }
  if (action.type === 'pin') {
    const k = action.k;
    if (!int(k) || k < 0 || k >= kinds.length || !q.movable?.pins?.[k] || !latticeOnPaper(q, action.to) || Object.keys(action).length !== 3) return null;
    const np = pins.map((p, i) => i === k ? quarter(action.to) : p);
    if (same(np[k], pins[k])) return null;
    const tips = legalPose(q, kinds, np, t);
    return tips ? {kinds, pins: np, t, at, tips, fresh: true} : null;
  }
  if (action.type === 'stencil') {
    if (!q.movable?.stencil || !isPoint(action.to) || Object.keys(action).length !== 2 || same(action.to, at) || !stencilFits(q, action.to)) return null;
    return {kinds, pins, t, at: [...action.to], tips: s.tips, fresh: true};
  }
  if (action.type === 'tips') {
    if (q.mode !== 'playground' || Object.keys(action).length !== 1) return null;
    const nk = kinds.map(k => k === 'double' ? 'half' : 'double'), tips = legalPose(q, nk, pins, t);
    return tips ? {kinds: nk, pins, t, at, tips, fresh: true} : null;
  }
  return null;
}

// --- What a sheet shows -------------------------------------------------------
// Lattice points the knob has been on, on any sheet: where it stopped and
// every dot it slid over.
export function knobVisits(state) {
  const out = new Set();
  for (const sh of state.sheets) {
    for (const p of sh.knobs) out.add(key([p[0] / Q, p[1] / Q]));
    for (const [a, b] of sh.tr) for (const p of latticeOn(a, b)) out.add(key(p));
  }
  return out;
}
// Lattice points the last pencil has touched on any sheet: where it stopped,
// and every dot its lines pass over.
export function touched(state) {
  const out = new Set();
  for (const sh of state.sheets) {
    for (const p of sh.stops) if (p[0] % Q === 0 && p[1] % Q === 0) out.add(key([p[0] / Q, p[1] / Q]));
    for (const [a, b] of sh.pens.at(-1)) for (const p of latticeOn(a, b)) out.add(key(p));
  }
  return out;
}
// The copy a configuration makes of a closed outline traced by the knob, in
// quarter units, or null if some corner's pose is illegal.
export function copyOf(q, kinds, pins, poly) {
  const out = [];
  for (const p of poly) {
    const tips = legalPose(q, kinds, pins, quarter(p));
    if (!tips) return null;
    out.push(tips.at(-1));
  }
  return out;
}
