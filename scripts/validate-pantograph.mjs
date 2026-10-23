// Checks the Drawing machines pack (dist/families/pantograph/pantograph.json)
// by methods separate from the mechanic's:
//   - the machine itself: for every pin and knob dot on the sheet, the pencil
//     found by solving the four-bar frame (circle intersections, in floating
//     point) is on the line from the pin through the knob, twice as far, and
//     with the tips swapped half as far; two machines chained slide a shape by
//     half the gap between their pins;
//   - a model of the record written here from scratch, in exact fractions,
//     whose drawings are compared as merged intervals on each line (not as
//     unit steps, as the mechanic does);
//   - every claim by exhaustive search over the lattice: each dot's one knob
//     dot, each outline's knob dots, the box's knob region, the one pin, the
//     one picture place, the one second pin and every working pair of pins
//     (and why the others with the right gap fail), and the numbers in the
//     grown-ups' notes;
//   - witnesses and hint chains played through the move rules, from fresh and
//     after random play; That's all and its refusal through Undo; every Undo
//     changing the board; illegal moves and forged saves.
// Run: node scripts/validate-pantograph.mjs
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {barOf, frameOf} from '../dist/families/pantograph/pantograph.js';
import {loadPack} from './packs.mjs';

// --- Exact fractions ---------------------------------------------------------
// A number is [n, d] with d > 0 in lowest terms; a point is [x, y] of numbers.
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const fr = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return [n / g, d / g]; };
const fadd = (a, b) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const fsub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const fmul = (a, k) => fr(a[0] * k[0], a[1] * k[1]);
const feq = (a, b) => a[0] === b[0] && a[1] === b[1];
const flt = (a, b) => a[0] * b[1] < b[0] * a[1];
const fle = (a, b) => !flt(b, a);
const F = n => fr(n);
const pt = ([x, y]) => [F(x), F(y)];
const padd = (a, b) => [fadd(a[0], b[0]), fadd(a[1], b[1])];
const psub = (a, b) => [fsub(a[0], b[0]), fsub(a[1], b[1])];
const pscale = (a, k) => [fmul(a[0], k), fmul(a[1], k)];
const peq = (a, b) => feq(a[0], b[0]) && feq(a[1], b[1]);
const pkey = p => p.map(v => v.join('/')).join(',');
const TWO = F(2), HALF = fr(1, 2);

// The model: a machine maps its driving tip t to its pencil.
const pencil = (kind, o, t) => padd(o, pscale(psub(t, o), kind === 'double' ? TWO : HALF));
const tipsOf = (kinds, pins, t) => kinds.reduce((tips, kind, i) => [...tips, pencil(kind, pins[i], tips[i])], [t]);
const onSheet = (q, p) => fle(F(0), p[0]) && fle(F(0), p[1]) && fle(p[0], F(q.paper[0])) && fle(p[1], F(q.paper[1]));
// A pose: every tip on the sheet, and no machine's driving tip on its pin.
function pose(q, kinds, pins, t) {
  const tips = tipsOf(kinds, pins, t);
  if (!tips.every(p => onSheet(q, p))) return null;
  if (kinds.some((_, i) => peq(tips[i], pins[i]))) return null;
  return tips;
}
const dots = q => { const out = []; for (let y = 0; y <= q.paper[1]; y++) for (let x = 0; x <= q.paper[0]; x++) out.push([x, y]); return out; };

// Drawings as merged intervals: each segment lies on a line; a line is keyed by
// its primitive direction and offset; along it the segment is an interval of
// the parameter. Two drawings agree when every line carries the same union.
function lineOf(a, b) {
  const d = psub(b, a);
  // Direction as integers: clear denominators, divide by the gcd, fix the sign.
  const L = d[0][1] * d[1][1] / gcd(d[0][1], d[1][1]);
  let dx = d[0][0] * (L / d[0][1]), dy = d[1][0] * (L / d[1][1]);
  const g = gcd(dx, dy); dx /= g; dy /= g;
  if (dx < 0 || (dx === 0 && dy < 0)) { dx = -dx; dy = -dy; }
  // Offset: the cross product of the direction with a point (constant on the line).
  const off = fsub(fmul(a[0], F(dy)), fmul(a[1], F(dx)));
  const along = p => fadd(fmul(p[0], F(dx)), fmul(p[1], F(dy)));
  return {key: `${dx},${dy}|${off.join('/')}`, s: along(a), e: along(b)};
}
function drawing(segments) {
  const lines = new Map();
  for (const [a, b] of segments) {
    if (peq(a, b)) continue;
    const l = lineOf(a, b), lo = flt(l.s, l.e) ? l.s : l.e, hi = flt(l.s, l.e) ? l.e : l.s;
    if (!lines.has(l.key)) lines.set(l.key, []);
    lines.get(l.key).push([lo, hi]);
  }
  const out = [];
  for (const [k, list] of lines) {
    list.sort((u, v) => flt(u[0], v[0]) ? -1 : flt(v[0], u[0]) ? 1 : 0);
    const merged = [];
    for (const [lo, hi] of list) {
      const last = merged.at(-1);
      if (last && fle(lo, last[1])) { if (flt(last[1], hi)) last[1] = hi; } else merged.push([lo, hi]);
    }
    out.push(`${k}:${merged.map(([lo, hi]) => `${lo.join('/')}~${hi.join('/')}`).join(';')}`);
  }
  return out.sort().join('\n');
}
const outline = poly => poly.map((p, i) => [p, poly[(i + 1) % poly.length]]);

// Replay a record in the model: the sheets of drawing, the knob's visits and
// the last pencil's touches.
function model(q, b) {
  const play = q.mode === 'playground';
  let kinds = play ? [b.kind] : [...q.machines], pins = (play ? b.pins : q.pins).map(pt), t = pt(play ? b.tracer : q.tracer), at = [0, 0];
  let tips = pose(q, kinds, pins, t);
  if (!tips) return null;
  const sheet = () => ({knob: [], pens: kinds.map(() => []), at: [...at]});
  const sheets = [sheet()], visits = [t], stops = [tips.at(-1)];
  for (const m of b.log) {
    if ((m.type === 'draw' || m.type === 'hop')) {
      const nt = pt(m.to), next = pose(q, kinds, pins, nt);
      if (!Number.isInteger(m.to[0]) || !Number.isInteger(m.to[1]) || !next || peq(nt, t)) return null;
      if (m.type === 'draw') { sheets.at(-1).knob.push([t, nt]); next.forEach((p, i) => { if (i) sheets.at(-1).pens[i - 1].push([tips[i], p]); }); visits.push(...between(t, nt)); }
      visits.push(nt); stops.push(next.at(-1));
      t = nt; tips = next;
    } else if (m.type === 'pin') {
      if (!q.movable?.pins?.[m.k]) return null;
      const np = pins.map((p, i) => i === m.k ? pt(m.to) : p), next = pose(q, kinds, np, t);
      if (!next || peq(np[m.k], pins[m.k])) return null;
      pins = np; tips = next; sheets.push(sheet());
    } else if (m.type === 'stencil') {
      if (!q.movable?.stencil || (m.to[0] === at[0] && m.to[1] === at[1]) || !q.stencil.every(([x, y]) => onSheet(q, pt([x + m.to[0], y + m.to[1]])))) return null;
      at = [...m.to]; sheets.push(sheet());
    } else if (m.type === 'tips') {
      if (!play) return null;
      const nk = kinds.map(k => k === 'double' ? 'half' : 'double'), next = pose(q, nk, pins, t);
      if (!next) return null;
      kinds = nk; tips = next; sheets.push(sheet());
    } else return null;
  }
  return {kinds, pins, t, tips, at, sheets, visits, stops};
}
// Lattice points strictly between two lattice points.
function between(a, b) {
  const [x0, y0] = a.map(v => v[0] / v[1]), [x1, y1] = b.map(v => v[0] / v[1]), g = gcd(x1 - x0, y1 - y0), out = [];
  for (let k = 1; k < g; k++) out.push(pt([x0 + (x1 - x0) * k / g, y0 + (y1 - y0) * k / g]));
  return out;
}
const onSeg = (p, a, b) => { const d = psub(b, a), e = psub(p, a), cross = fsub(fmul(d[0], e[1]), fmul(d[1], e[0])); return feq(cross, F(0)) && fle(minF(a[0], b[0]), p[0]) && fle(p[0], maxF(a[0], b[0])) && fle(minF(a[1], b[1]), p[1]) && fle(p[1], maxF(a[1], b[1])); };
const minF = (a, b) => flt(a, b) ? a : b, maxF = (a, b) => flt(a, b) ? b : a;
// What the model calls solved.
function modelSolved(q, b) {
  const s = model(q, b);
  if (!s) return false;
  if (q.mode === 'dots') return q.dots.every(d => touchedBy(s, pt(d)));
  if (q.mode === 'region') return b.claimed === true;
  const sh = s.sheets.at(-1), copy = ['anchor', 'shift', 'chain'].includes(q.mode);
  if (drawing(sh.pens.at(-1)) !== drawing(outline(q.target.map(pt)))) return false;
  return !copy || drawing(sh.knob) === drawing(outline(q.stencil.map(([x, y]) => pt([x + sh.at[0], y + sh.at[1]]))));
}
const touchedBy = (s, d) => s.stops.some(p => peq(p, d)) || s.sheets.some(sh => sh.pens.at(-1).some(([a, b]) => onSeg(d, a, b)));
// The knob dots that keep the pencil in the box.
const inBox = (q, p) => { const [[x0, y0], [x1, y1]] = q.box; return fle(F(x0), p[0]) && fle(p[0], F(x1)) && fle(F(y0), p[1]) && fle(p[1], F(y1)); };
const boxDots = q => dots(q).filter(t => { const tips = pose(q, q.machines, q.pins.map(pt), pt(t)); return tips && inBox(q, tips.at(-1)); }).map(String);
// Configurations that copy the green shape onto the outline, every corner open.
function copies(q, kinds, pins, at) {
  const shape = q.stencil.map(([x, y]) => pt([x + at[0], y + at[1]])), copy = [];
  for (const c of shape) { const tips = pose(q, kinds, pins, c); if (!tips) return false; copy.push(tips.at(-1)); }
  return drawing(outline(copy)) === drawing(outline(q.target.map(pt)));
}

// --- The frame: the machine's rule from its bars -----------------------------
// Solve the rhombus for a pin o and T corner c with half-bars a: X on both
// circles of radius a, Q = 2X − o, Y = X + (c − o), and the far tip is the
// point of the long bar QY beyond Y, as far again.
function linkage(o, c, a, side) {
  const d = [c[0] - o[0], c[1] - o[1]], L = Math.hypot(...d), m = [(o[0] + c[0]) / 2, (o[1] + c[1]) / 2], h = Math.sqrt(a * a - L * L / 4), n = [-d[1] / L, d[0] / L];
  const X = [m[0] + side * h * n[0], m[1] + side * h * n[1]], Qp = [2 * X[0] - o[0], 2 * X[1] - o[1]], Y = [X[0] + d[0], X[1] + d[1]];
  return {X, Q: Qp, Y, far: [2 * Y[0] - Qp[0], 2 * Y[1] - Qp[1]]};
}
const near = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]) < 1e-9;

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
let ctx = null;
const draw = p => att => playView(p, att, ctx);
function hintsSolve(p, a, label) {
  for (let steps = 0; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { assert.ok(h.quiet, `${p.id} ${label}: dead ends are told only behind Hint`); a = undoToSolvable(p, a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  assert.ok(modelSolved(p.parameters, a.board), `${p.id} ${label}: the model agrees`);
  return a;
}
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function randomAction(p, rand) {
  const q = p.parameters, r = rand(), dot = () => [Math.floor(rand() * (q.paper[0] + 1)), Math.floor(rand() * (q.paper[1] + 1))];
  if (q.movable?.pins && r < .15) { const ks = q.movable.pins.map((m, k) => m ? k : -1).filter(k => k >= 0); return {type: 'pin', k: ks[Math.floor(rand() * ks.length)], to: dot()}; }
  if (q.movable?.stencil && r < .15) return {type: 'stencil', to: [Math.floor(rand() * 7) - 3, Math.floor(rand() * 7) - 3]};
  if (q.mode === 'region' && r < .05) return {type: 'all'};
  return {type: rand() < .5 ? 'draw' : 'hop', to: dot()};
}

export default async function validatePantograph() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/pantograph/pantograph.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'pantograph');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 15, '8 to 15 puzzles');
  for (const p of pack.puzzles) {
    assert.match(p.id, /^pantograph-/);
    assert.equal(p.mechanic, 'pantograph');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length >= 3, `${p.id}: rules and hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent.${field}`);
    assert.ok(p.parent.sourceIds.every(id => ids.has(id)), `${p.id}: sources exist`);
    assert.ok(validBoard(p, freshAttempt(p).board), `${p.id}: starts valid`);
    assert.ok(p.visibleObjective === '' || p.visibleObjective.split(/[.?]\s/).length === 1, `${p.id}: at most one short sentence on the board`);
  }
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const byTitle = t => puzzles.find(p => p.title === t);

  // --- The machine's rule from its bars, for every pin and knob dot ----------
  const paper = puzzles[0].parameters.paper, sheet = {paper}, a = barOf(sheet);
  let poses = 0;
  for (const o of dots(sheet)) for (const t of dots(sheet)) {
    if (o[0] === t[0] && o[1] === t[1]) continue;
    // Swapped tips: the far tip is held, and the T corner is the pencil, halfway.
    const f = linkage(o, [(o[0] + t[0]) / 2, (o[1] + t[1]) / 2], a, 1).far;
    assert.ok(near(f, t), 'with the tips swapped the pencil is halfway between the pin and the knob');
    // Every ×2 pose with the pencil on the sheet is open: the bars reach.
    const P = [2 * t[0] - o[0], 2 * t[1] - o[1]];
    if (P[0] < 0 || P[1] < 0 || P[0] > paper[0] || P[1] > paper[1]) continue;
    assert.ok(Math.hypot(t[0] - o[0], t[1] - o[1]) < 2 * a, 'the frame reaches every pose on the sheet');
    for (const side of [1, -1]) {
      const L = linkage(o, t, a, side);
      // Bars: OX = XT = TY = a, OQ = QP = 2a with X and Y their midpoints.
      for (const [u, v, len] of [[o, L.X, a], [L.X, t, a], [t, L.Y, a], [o, L.Q, 2 * a], [L.Q, L.far, 2 * a]]) assert.ok(Math.abs(Math.hypot(u[0] - v[0], u[1] - v[1]) - len) < 1e-9, 'bar lengths');
      assert.ok(near(L.far, [2 * t[0] - o[0], 2 * t[1] - o[1]]), `pin ${o}, knob ${t}: the pencil is at 2T − O`);
      poses++;
    }
    // The app's drawn frame is one of these two poses.
    const drawn = frameOf(sheet, o, t);
    assert.ok([1, -1].some(side => near(linkage(o, t, a, side).X, drawn.X)), 'the drawn frame is a pose of the bars');
  }
  // Two machines: ×2 then ×½ is a slide by half the gap, for every pin pair and knob.
  let slides = 0;
  for (const o1 of dots(sheet)) for (const o2 of dots(sheet)) for (const t of [[0, 0], [3, 5], [10, 8], [7, 2]]) {
    const end = tipsOf(['double', 'half'], [pt(o1), pt(o2)], pt(t)).at(-1);
    assert.ok(peq(end, padd(pt(t), pscale(psub(pt(o2), pt(o1)), HALF))), 'the copy of a copy is a slide');
    slides++;
  }

  // --- Each puzzle's claim, by search over the lattice ------------------------
  for (const p of puzzles) {
    const q = p.parameters, kinds = q.machines, pins = q.pins.map(pt);
    assert.ok(pose(q, kinds, pins, pt(q.tracer)), `${p.id}: the start is a pose`);
    if (q.mode === 'dots') {
      for (const d of q.dots) {
        const knobs = dots(q).filter(t => { const tips = pose(q, kinds, pins, pt(t)); return tips && peq(tips.at(-1), pt(d)); });
        assert.equal(knobs.length, 1, `${p.id}: one knob dot reaches ${d}`);
      }
      assert.equal(p.visibleObjective, '');
    }
    if (q.mode === 'trace') {
      const corners = q.target.map(c => dots(q).find(t => { const tips = pose(q, kinds, pins, pt(t)); return tips && peq(tips.at(-1), pt(c)); }));
      assert.ok(corners.every(Boolean), `${p.id}: every corner has a knob dot`);
      const onOutline = dots(q).filter(t => { const tips = pose(q, kinds, pins, pt(t)); return tips && outline(q.target.map(pt)).some(([u, v]) => onSeg(tips.at(-1), u, v)); }).map(String).sort();
      const onKnob = dots(q).filter(t => outline(corners.map(pt)).some(([u, v]) => onSeg(pt(t), u, v))).map(String).sort();
      assert.deepEqual(onOutline, onKnob, `${p.id}: the knob dots that put the pencil on the outline are the knob outline’s`);
      // The knob outline is the half-size (or double-size) copy towards the pin.
      const k = kinds[0] === 'double' ? HALF : TWO;
      corners.forEach((c, i) => assert.ok(peq(pt(c), padd(pins[0], pscale(psub(pt(q.target[i]), pins[0]), k))), `${p.id}: corner ${i}`));
      assert.equal(p.visibleObjective, '');
    }
    if (q.mode === 'region') {
      const inside = boxDots(q), O = q.pins[0], [[x0, y0], [x1, y1]] = q.box;
      const half = dots(q).filter(([x, y]) => 2 * x >= x0 + O[0] && 2 * x <= x1 + O[0] && 2 * y >= y0 + O[1] && 2 * y <= y1 + O[1]).map(String);
      assert.deepEqual(inside.sort(), half.sort(), `${p.id}: the knob region is the half-size box towards the pin`);
      assert.equal(inside.length, q.inside);
      // Every other knob dot on the sheet puts the pencil outside the box.
      for (const t of dots(q)) if (!inside.includes(String(t))) { const tips = pose(q, kinds, pins, pt(t)); assert.ok(!tips || !inBox(q, tips.at(-1))); }
    }
    if (['anchor', 'shift', 'chain'].includes(q.mode)) {
      const found = [];
      const pinChoices = q.pins.map((pin, k) => q.movable.pins?.[k] ? dots(q) : [pin]);
      const ats = q.movable.stencil ? dots({paper: [12, 12]}).map(([x, y]) => [x - 6, y - 6]).filter(([dx, dy]) => q.stencil.every(([x, y]) => onSheet(q, pt([x + dx, y + dy])))) : [[0, 0]];
      const walk = (k, chosen) => { if (k === pinChoices.length) { for (const at of ats) if (copies(q, kinds, chosen.map(pt), at)) found.push({pins: chosen, at}); return; } for (const c of pinChoices[k]) walk(k + 1, [...chosen, c]); };
      walk(0, []);
      if (q.mode === 'anchor') {
        assert.equal(found.length, 1, `${p.id}: one pin`);
        assert.deepEqual(found[0].pins[0], q.solution);
        // From the formula: O = 2T − P (×2) or O = 2P − T (×½), with any corner.
        q.stencil.forEach((c, i) => { const T = pt(c), P = pt(q.target[i]); assert.ok(peq(pt(q.solution), kinds[0] === 'double' ? psub(pscale(T, TWO), P) : psub(pscale(P, TWO), T))); });
      }
      if (q.mode === 'shift') {
        assert.equal(found.length, 1, `${p.id}: one place for the green shape`);
        assert.deepEqual(found[0].at, q.solution);
        const d = [q.pins[0][0] - q.ghostPin[0], q.pins[0][1] - q.ghostPin[1]];
        assert.deepEqual(q.solution, [d[0] / 2, d[1] / 2], `${p.id}: half the pin’s move, the same way`);
        // The old pin made the outline; in place the new pin's copy is moved by −d.
        assert.ok(copies({...q, target: q.stencil.map(c => [2 * c[0] - q.ghostPin[0], 2 * c[1] - q.ghostPin[1]])}, kinds, [pt(q.ghostPin)], [0, 0]));
        assert.ok(copies({...q, target: q.target.map(([x, y]) => [x - d[0], y - d[1]])}, kinds, pins, [0, 0]), `${p.id}: in place the copy moves by −d`);
      }
      if (q.mode === 'chain') {
        assert.ok(found.every(s => s.pins[1][0] - s.pins[0][0] === 2 * q.slide[0] && s.pins[1][1] - s.pins[0][1] === 2 * q.slide[1]), `${p.id}: every answer has the gap twice the slide`);
        if (q.movable.pins[0]) {
          assert.equal(found.length, q.count, `${p.id}: ${q.count} pairs of pins`);
          // The other pairs with the right gap: 20 put the middle pencil off the
          // sheet at a corner, and the one left folds a machine shut at a corner.
          const gap = dots(q).map(o1 => [o1, [o1[0] + 2 * q.slide[0], o1[1] + 2 * q.slide[1]]]).filter(([, o2]) => onSheet(q, pt(o2)));
          const failing = gap.filter(([o1, o2]) => !found.some(s => String(s.pins) === String([o1, o2])));
          const offSheet = failing.filter(([o1, o2]) => q.stencil.some(c => !tipsOf(kinds, [pt(o1), pt(o2)], pt(c)).every(x => onSheet(q, x))));
          const shut = failing.filter(f => !offSheet.includes(f));
          assert.ok(shut.every(([o1, o2]) => q.stencil.some(c => { const tips = tipsOf(kinds, [pt(o1), pt(o2)], pt(c)); return tips.every(x => onSheet(q, x)) && (peq(tips[0], pt(o1)) || peq(tips[1], pt(o2))); })), `${p.id}: the rest fold shut at a corner, on the sheet`);
          assert.ok(offSheet.every(([o1, o2]) => q.stencil.some(c => !onSheet(q, tipsOf(kinds, [pt(o1), pt(o2)], pt(c))[1]))), `${p.id}: off the sheet means the middle pencil`);
          assert.deepEqual([failing.length, offSheet.length, shut.length], [21, 20, 1], `${p.id}: 21 pairs with the gap fail, 20 off the sheet and 1 shut`);
          assert.deepEqual(shut[0], [[2, 5], [8, 7]]);
        } else {
          assert.equal(found.length, 1, `${p.id}: one second pin`);
          assert.deepEqual(found[0].pins, q.solution);
        }
      }
      assert.ok(!copies(q, kinds, pins, [0, 0]), `${p.id}: the start is not an answer`);
      assert.ok(p.visibleObjective.length > 0 && p.visibleObjective.length < 50, `${p.id}: one short sentence`);
    }
  }
  // The numbers in the grown-ups' notes.
  {
    const q = byTitle('Dot to dot').parameters;
    assert.ok(!dots(q).some(t => { const tips = pose(q, q.machines, q.pins.map(pt), pt(t)); return tips && peq(tips.at(-1), pt([5, 5])); }), 'the pencil cannot stop on (5, 5)');
    assert.ok(dots(q).every(t => { const tips = pose(q, q.machines, q.pins.map(pt), pt(t)); return !tips || tips.at(-1).every(v => v[1] === 1 && v[0] % 2 === 0); }), 'with the pin at the corner it stops only on even dots');
    const sq = byTitle('Big square').parameters, side = ([[x0], [x1]]) => Math.abs(x1 - x0);
    assert.equal(side(sq.target) ** 2, 36); assert.equal((side(sq.target) / 2) ** 2, 9);
    const sb = byTitle('Small box').parameters;
    assert.ok(peq(pencil('half', pt([3, 1]), pt([1, 3])), pt([2, 2])) && peq(pencil('half', pt([3, 1]), pt([7, 7])), pt([5, 4])), 'with the pin at (3, 1) the knob box runs from (1, 3) to (7, 7)');
    assert.ok(sb.target.length === 4);
    const rb = byTitle('Keep it in the box').parameters, moved = {...rb, box: rb.box.map(([x, y]) => [x, y + 2])};
    assert.deepEqual(boxDots(moved).sort(), boxDots(rb).map(k => { const [x, y] = k.split(',').map(Number); return String([x, y + 1]); }).sort(), 'the box two up moves the region one up');
    const an = byTitle('Place the pin').parameters, shiftCopy = (q, pin) => q.stencil.map(c => tipsOf(q.machines, [pt(pin)], pt(c)).at(-1));
    assert.ok(shiftCopy(an, [an.solution[0] + 1, an.solution[1]]).every((c, i) => peq(c, pt([an.target[i][0] - 1, an.target[i][1]]))), 'a pin one right moves the copy one left');
    const hf = byTitle('Pin for a half copy').parameters;
    assert.ok(shiftCopy(hf, [hf.solution[0] - 2, hf.solution[1]]).every((c, i) => peq(c, pt([hf.target[i][0] - 1, hf.target[i][1]]))), 'a pin two left moves the half copy one left');
    const ch = byTitle('Two machines').parameters;
    assert.ok(ch.stencil.every(c => peq(tipsOf(ch.machines, [pt(ch.pins[0]), pt(ch.pins[0])], pt(c)).at(-1), pt(c))), 'equal pins: the copy is the shape');
    const sh = byTitle('Move the picture').parameters;
    assert.ok(copies({...sh, target: sh.target.map(([x, y]) => [x - 2, y])}, sh.machines, sh.pins.map(pt), [sh.solution[0] - 1, sh.solution[1]]), 'an outline 2 left asks the picture 1 further left');
    const bp = byTitle('Both pins').parameters, top = bp.stencil.reduce((a, c) => c[1] > a[1] ? c : a);
    assert.ok(!copies(bp, bp.machines, [pt([2, 0]), pt([8, 2])], [0, 0]), 'the pins (2, 0) and (8, 2) do not work');
    assert.ok(!fle(tipsOf(bp.machines, [pt([2, 0]), pt([8, 2])], pt(top))[1][1], F(bp.paper[1])), 'their middle pencil is off the top at the top corner');
  }

  // --- Witnesses, hints and play ---------------------------------------------
  let randomRuns = 0;
  for (const p of puzzles) {
    const q = p.parameters;
    let w = freshAttempt(p);
    for (const action of q.witness) w = play(p, w, action);
    assert.ok(isSolved(p, w.board), `${p.id}: the witness solves it`);
    assert.ok(modelSolved(q, w.board), `${p.id}: the model agrees the witness solves it`);
    refuse(p, w, {type: 'hop', to: q.tracer}, 'nothing moves after a solve');
    hintsSolve(p, freshAttempt(p), 'from fresh');
    for (let u = w, k = 0; u.history.length && k < 60; k++) { const shown = draw(p)(u), back = undoPress(p, u, draw(p), shown); assert.notEqual(draw(p)(back), shown, `${p.id}: Undo changes the board`); u = back; }
    for (let seed = 1; seed <= 25; seed++) {
      const rand = rng(seed * 7919 + p.number);
      let b = freshAttempt(p);
      for (let k = 0; k < 16 && !isSolved(p, b.board); k++) {
        const action = randomAction(p, rand), next = move(p, b, action), m = model(q, {...b.board, log: [...b.board.log, action]});
        if (action.type !== 'all') assert.equal(next !== null, m !== null && !isSolved(p, b.board), `${p.id}: the model and the mechanic agree on ${JSON.stringify(action)}`);
        if (next) b = next;
      }
      assert.ok(validBoard(p, b.board), `${p.id}: random play stays valid`);
      assert.equal(isSolved(p, b.board), modelSolved(q, b.board), `${p.id}: solved agrees after random play`);
      if (!isSolved(p, b.board)) hintsSolve(p, b, `after random play ${seed}`);
      randomRuns++;
    }
  }

  // --- Rules: illegal moves -----------------------------------------------------
  {
    const p = byTitle('Dot to dot'), a = freshAttempt(p);
    refuse(p, a, {type: 'hop', to: [0, 0]}, 'the knob can’t go onto the pin');
    refuse(p, a, {type: 'draw', to: [6, 1]}, 'the pencil would leave the sheet');
    refuse(p, a, {type: 'hop', to: [1, 1]}, 'the knob is already there');
    refuse(p, a, {type: 'hop', to: [1.5, 1]}, 'only dots');
    refuse(p, a, {type: 'hop', to: [11, 1]}, 'off the sheet');
    refuse(p, a, {type: 'pin', k: 0, to: [1, 0]}, 'this pin is fixed');
    refuse(p, a, {type: 'stencil', to: [1, 0]}, 'no green shape here');
    refuse(p, a, {type: 'tips'}, 'no swapping in a puzzle');
    refuse(p, a, {type: 'all'}, 'no That’s all here');
    refuse(p, a, {type: 'draw', to: [2, 2], extra: 1}, 'no extra fields');
    let b = a;
    for (let k = 0; k < 160; k++) b = play(p, b, {type: 'hop', to: k % 2 ? [1, 1] : [2, 1]});
    refuse(p, b, {type: 'hop', to: [2, 2]}, 'the record has a cap');
    assert.equal(nextHint(p, b).type, 'deadend', 'a full record asks for Undo');
  }
  {
    // A stray line: red, and the quiet hint asks for Undo.
    const p = byTitle('Big square');
    let a = play(p, freshAttempt(p), {type: 'draw', to: [2, 2]});
    assert.ok(!isSolved(p, a.board));
    assert.match(draw(p)(a), /pg-ink off/);
    assert.deepEqual(nextHint(p, a), {type: 'deadend', quiet: true, text: 'The pencil drew off the outline. Undo.'});
    // The outline drawn in pieces, in any order, solves it; a side drawn twice is fine.
    a = freshAttempt(p);
    for (const to of [[2, 1], [4, 1], [2, 1], [4, 1], [4, 4]]) a = play(p, a, {type: 'draw', to});
    a = play(p, a, {type: 'hop', to: [1, 1]});
    a = play(p, a, {type: 'draw', to: [1, 4]});
    assert.ok(!isSolved(p, a.board), 'one side is missing');
    a = play(p, a, {type: 'draw', to: [4, 4]});
    assert.ok(isSolved(p, a.board), 'pieces, repeats and any order');
  }
  {
    // That's all: off until a leaf dot is found (crosses alone do not open it),
    // refused early, and the refusal holds through Undo while the dots found are the same.
    const p = byTitle('Keep it in the box');
    refuse(p, freshAttempt(p), {type: 'all'}, 'That’s all is off before any leaf dot');
    assert.match(draw(p)(freshAttempt(p)), /pg-all"[^>]*disabled/, 'the button is off on a fresh board');
    const crosses = play(p, freshAttempt(p), {type: 'hop', to: [2, 0]});
    const crossHTML = draw(p)(crosses);
    assert.ok(!boxDots(p.parameters).includes('2,0') && !boxDots(p.parameters).includes('1,2') && !/pg-mark in/.test(crossHTML) && (crossHTML.match(/pg-mark out/g) || []).length === 2, 'two crosses, no leaf dot');
    refuse(p, crosses, {type: 'all'}, 'crosses alone leave That’s all off');
    let a = play(p, freshAttempt(p), {type: 'hop', to: [2, 1]});
    a = play(p, a, {type: 'all'});
    assert.ok(Array.isArray(a.board.shut) && !a.board.claimed);
    assert.match(draw(p)(a), /There are more\./);
    refuse(p, a, {type: 'all'}, 'That’s all stays off');
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.match(draw(p)(back), /There are more\./, 'Undo keeps the refusal');
    assert.equal(back.board.log.length, 0, 'one Undo after a kept claim also takes back the move before it');
    refuse(p, back, {type: 'all'}, 'still refused after Undo');
    let b = play(p, back, {type: 'hop', to: [3, 2]});
    assert.doesNotMatch(draw(p)(b), /There are more\./, 'a new dot opens That’s all again');
    for (const m of p.parameters.witness.slice(0, -1)) { const next = move(p, b, m); if (next) b = next; }
    b = play(p, b, {type: 'all'});
    assert.ok(isSolved(p, b.board));
  }
  {
    // Copy puzzles: a pin move starts a fresh sheet; the old one fades.
    const p = byTitle('Place the pin'), q = p.parameters;
    let a = play(p, freshAttempt(p), {type: 'draw', to: [4, 3]});
    a = play(p, a, {type: 'pin', k: 0, to: q.solution});
    assert.match(draw(p)(a), /pg-sheet faded/);
    refuse(p, a, {type: 'pin', k: 0, to: [4, 3]}, 'a pin can’t go under the knob');
    // Tracing a different shape whose copy lands on the outline is not the task.
    const s = byTitle('Move the picture');
    let c = freshAttempt(s);
    refuse(s, c, {type: 'pin', k: 0, to: [1, 1]}, 'the pin is fixed in Move the picture');
    refuse(s, c, {type: 'stencil', to: [9, 0]}, 'the green shape stays on the sheet');
    for (const m of [{type: 'hop', to: [4, 2]}, {type: 'draw', to: [6, 2]}, {type: 'draw', to: [4, 5]}, {type: 'draw', to: [4, 2]}]) c = play(s, c, m);
    assert.ok(!isSolved(s, c.board), 'the knob must trace the green shape where it is');
    assert.match(draw(s)(c), /pg-track off/);
  }
  // --- Forged saves -------------------------------------------------------------
  {
    const p = byTitle('Dot to dot');
    assert.ok(!validBoard(p, {log: [{type: 'hop', to: [0, 0]}]}), 'onto the pin');
    assert.ok(!validBoard(p, {log: 'x'}), 'a log that is not a list');
    assert.ok(!validBoard(p, {log: [], extra: 1}), 'extra fields');
    assert.ok(!validBoard(p, {log: Array(161).fill({type: 'hop', to: [2, 1]})}), 'past the cap');
    const r = byTitle('Keep it in the box'), rf = freshAttempt(r).board;
    assert.ok(!validBoard(r, {...rf, claimed: true}), 'a claim before every dot is found');
    assert.ok(!validBoard(r, {...rf, shut: boxDots(r.parameters)}), 'a refusal that found every dot');
    assert.ok(!validBoard(r, {...rf, shut: ['99,1']}), 'a refusal off the sheet');
    assert.ok(!validBoard(r, {...rf, shut: ['1,2']}), 'a refusal before any leaf dot');
    assert.ok(validBoard(r, {...rf, shut: ['1,2', '2,1']}), 'a real refusal, kept through Undo');
    const g = playground, gf = freshAttempt(g).board;
    assert.ok(!validBoard(g, {...gf, kind: 'triple'}), 'no such machine');
    assert.ok(!validBoard(g, {...gf, pins: [[2, 2], [3, 3]]}), 'one pin in the playground');
    assert.ok(!validBoard(g, {...gf, tracer: gf.pins[0]}), 'the knob on the pin');
  }
  // --- Playground -----------------------------------------------------------------
  {
    const g = playground;
    assert.equal(mechanicFor(g).noHint(g), true, 'the playground has no Hint');
    let a = freshAttempt(g);
    a = play(g, a, {type: 'draw', to: [5, 3]});
    a = play(g, a, {type: 'tips'});
    assert.deepEqual(model(g.parameters, a.board).kinds, ['half']);
    a = play(g, a, {type: 'pin', k: 0, to: [6, 6]});
    a = play(g, a, {type: 'clear'});
    assert.deepEqual(a.board, {kind: 'half', pins: [[6, 6]], tracer: [5, 3], log: []}, 'Clear keeps the machine where it is');
    refuse(g, a, {type: 'clear'}, 'nothing to clear');
    let b = a;
    for (let k = 0; k < 170; k++) b = play(g, b, {type: 'draw', to: k % 2 ? [5, 3] : [6, 3]});
    assert.ok(b.board.log.length < 160, 'a full playground starts a new drawing');
    assert.ok(!isSolved(g, b.board), 'the playground is never solved');
  }
  return {puzzles: pack.puzzles.length, framePoses: poses, slidesChecked: slides, randomRuns};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(await validatePantograph());
