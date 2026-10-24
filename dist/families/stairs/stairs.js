// Staircases (worksheet Week 50, staircases and lengths): a group on Memory
// robot's board, with the memory hidden. The robot walks the streets of a
// rectangle from S at the bottom left to the flag F at the top right.
//
// Fewest turns ("turns" puzzles). A staircase goes only right and up, and it
// must stay in a gray strip round the diagonal from S to F: the corners
// (x, y) with |a·y − b·x| ≤ D in an a × b rectangle, edge included. A turn is
// a corner where it changes direction. In a strip, a flat piece at height y
// can only cover the corners the strip holds in that row (its span), and a
// staircase crosses every column once, going right. So a set of columns no
// single span holds two of (the "windows") needs one flat piece each, and a
// staircase with h flat pieces has at least 2h − 2 turns. The child draws a
// staircase, presses Fewest and taps windows, as many as a staircase with
// that many turns needs; the claim is right exactly when no row of the strip
// holds two of them, which can only happen when the staircase has the fewest
// turns. Nothing shows which columns work. A wrong set is refused with one
// line that never says whether the staircase itself has the fewest turns;
// the refusal is a move, kept through Undo, and Fewest stays off until the
// walk changes, so sets can't be tried one after another on one staircase.
//
// Exact length ("exact" puzzles). Left steps are allowed too, never back
// along the street just walked, so a path never meets itself. Its length is
// a + b + 2L, where L counts its left steps. The boxes under the board are
// the length; a path that reaches F on the last box is kept, and a second,
// different one solves the puzzle.
//
// Hints search the strip or rectangle exactly (fewest turns by dynamic
// programming over corner and heading, completions by counting) and are
// cached per puzzle. See docs/stairs/README.md.
import {esc} from '../../expansion-controls.js';
import {gridOf, squareBoard, UNIT} from '../../sq-grid.js';
import {ROBOT_ICON, FLAG_ICON} from '../robot/robot.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = Number.isInteger;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const DIRS = {E: [1, 0], N: [0, 1], W: [-1, 0]};
export const NAMES = {E: 'right', N: 'up', W: 'left'};
const KEYS = {ArrowRight: 'E', ArrowUp: 'N', ArrowLeft: 'W'};
// The robot and the flag are Memory robot's own drawings.
const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const ROBOT = inner(ROBOT_ICON), FLAG = inner(FLAG_ICON);

/* ------------------------------------------------------------------ *
 * The corners, walks and turns
 * ------------------------------------------------------------------ */
const exactMode = q => q.mode === 'exact';
export const lettersOf = q => exactMode(q) ? 'ENW' : 'EN';
// A corner the robot may stand on: in the rectangle, and in the strip when
// there is one (its edge included).
export const allowed = (q, x, y) => int(x) && int(y) && x >= 0 && x <= q.a && y >= 0 && y <= q.b && (q.D === undefined || Math.abs(q.a * y - q.b * x) <= q.D);
const reverses = (d, before) => (d === 'E' && before === 'W') || (d === 'W' && before === 'E');
// Every corner of a walk from S, or null when a letter isn't allowed, a
// corner is off the strip or rectangle, or a step turns straight back along
// the street just walked. Without steps down, that last rule is exactly
// what stops a path meeting itself.
export function trace(q, walk) {
  if (typeof walk !== 'string') return null;
  const out = [[0, 0]], letters = lettersOf(q);
  let x = 0, y = 0;
  for (let i = 0; i < walk.length; i++) {
    const d = walk[i];
    if (!letters.includes(d) || reverses(d, walk[i - 1])) return null;
    x += DIRS[d][0]; y += DIRS[d][1];
    if (!allowed(q, x, y)) return null;
    out.push([x, y]);
  }
  return out;
}
export const endOf = (q, walk) => trace(q, walk)?.at(-1) ?? null;
export const atFlag = (q, walk) => { const e = endOf(q, walk); return Boolean(e) && e[0] === q.a && e[1] === q.b; };
export const turnsOf = walk => [...walk].filter((d, i) => i && d !== walk[i - 1]).length;
// The straight pieces of a walk: [letter, from corner, to corner].
export function piecesOf(q, walk) {
  const pts = trace(q, walk), out = [];
  for (let i = 0; i < walk.length; i++) {
    if (i && walk[i] === walk[i - 1]) out.at(-1)[2] = pts[i + 1];
    else out.push([walk[i], pts[i], pts[i + 1]]);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Fewest turns and the windows
 * ------------------------------------------------------------------ */
const cache = new Map();
const memo = (q, kind, make) => {
  const key = `${kind}:${JSON.stringify(q)}`;
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
};
// The span of each row: the first and last corner the strip holds there.
export const spans = q => memo(q, 'spans', () => Array.from({length: q.b + 1}, (_, y) => {
  const xs = Array.from({length: q.a + 1}, (_, x) => x).filter(x => allowed(q, x, y));
  return xs.length ? [xs[0], xs.at(-1)] : null;
}));
// Whether one flat piece in the strip can cross both column c and column d
// (column c runs from c to c + 1 across).
export const joinable = (q, c, d) => spans(q).some(s => s && s[0] <= Math.min(c, d) && s[1] >= Math.max(c, d) + 1);
// Windows: different columns, in order, no two of them on one flat piece.
export const certifies = (q, w) => Array.isArray(w) && w.every((c, i) => int(c) && c >= 0 && c < q.a && (!i || c > w[i - 1])) &&
  w.every((c, i) => w.slice(i + 1).every(d => !joinable(q, c, d)));
// A staircase with h flat pieces has at least 2h − 2 turns, so T turns are
// the fewest once this many windows are shown.
export const need = turns => Math.ceil(turns / 2) + 1;

// The fewest turns from a corner, arriving there heading d, to F: by
// dynamic programming from F back towards S (every step adds 1 to x + y).
const table = q => memo(q, 'turns', () => {
  const to = new Map(), key = (x, y, d) => `${x},${y},${d}`;
  for (let s = q.a + q.b; s >= 0; s--) for (let x = Math.max(0, s - q.b); x <= Math.min(q.a, s); x++) {
    const y = s - x;
    if (!allowed(q, x, y)) continue;
    for (const d of ['E', 'N']) {
      if (x === q.a && y === q.b) { to.set(key(x, y, d), 0); continue; }
      let best = Infinity;
      for (const e of ['E', 'N']) {
        const nx = x + DIRS[e][0], ny = y + DIRS[e][1];
        if (allowed(q, nx, ny)) best = Math.min(best, (e === d ? 0 : 1) + (to.get(key(nx, ny, e)) ?? Infinity));
      }
      to.set(key(x, y, d), best);
    }
  }
  return to;
});
// Turns still needed after a walk: from S, a first step in either direction is free.
export function turnsToGo(q, walk) {
  const e = endOf(q, walk), t = table(q);
  if (!e) return Infinity;
  if (walk) return t.get(`${e[0]},${e[1]},${walk.at(-1)}`) ?? Infinity;
  return Math.min(...['E', 'N'].map(d => allowed(q, DIRS[d][0], DIRS[d][1]) ? t.get(`${DIRS[d][0]},${DIRS[d][1]},${d}`) ?? Infinity : Infinity));
}
export const fewest = q => memo(q, 'fewest', () => turnsToGo(q, ''));
const onTrack = (q, walk) => trace(q, walk) !== null && turnsOf(walk) + turnsToGo(q, walk) === fewest(q);
// Every set of k windows, in order.
export const windowSets = (q, k) => memo(q, `windows${k}`, () => {
  const out = [], pick = (from, set) => {
    if (set.length === k) { out.push(set); return; }
    for (let c = from; c < q.a; c++) if (set.every(d => !joinable(q, c, d))) pick(c + 1, [...set, c]);
  };
  pick(0, []);
  return out;
});

/* ------------------------------------------------------------------ *
 * Exact length
 * ------------------------------------------------------------------ */
// How many ways a walk ending at (x, y), last step `last`, can go on for
// exactly `left` more steps and stop on F.
function finishes(q, x, y, last, left) {
  const t = memo(q, 'finishes', () => new Map()), key = `${x},${y},${last},${left}`;
  if (t.has(key)) return t.get(key);
  let n = 0;
  if (!left) n = x === q.a && y === q.b ? 1 : 0;
  else for (const d of lettersOf(q)) {
    const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
    if (!reverses(d, last) && allowed(q, nx, ny)) n += finishes(q, nx, ny, d, left - 1);
  }
  t.set(key, n);
  return n;
}
export const waysFrom = (q, walk) => { const e = endOf(q, walk); return e && walk.length <= q.steps ? finishes(q, e[0], e[1], walk.at(-1) || '', q.steps - walk.length) : 0; };
export const ways = q => waysFrom(q, '');
// The finishes of a walk other than the one that would copy the kept path.
const freshWays = (q, walk, kept) => waysFrom(q, walk) - (kept && kept.startsWith(walk) ? 1 : 0);
// One finish, taking E, N, W in that order, avoiding the kept path.
function finishOf(q, walk, kept) {
  let w = walk;
  while (w.length < q.steps) {
    const d = [...lettersOf(q)].find(c => trace(q, w + c) && freshWays(q, w + c, kept) > 0);
    if (!d) return null;
    w += d;
  }
  return w.slice(walk.length);
}

/* ------------------------------------------------------------------ *
 * Saves, moves and solves
 * ------------------------------------------------------------------ */
// A set of columns Fewest can judge on this walk: on the flag, as many as
// the staircase needs, different and in order.
const claimable = (q, walk, w) => atFlag(q, walk) && Array.isArray(w) && w.length === need(turnsOf(walk)) &&
  w.every((c, i) => int(c) && c >= 0 && c < q.a && (!i || c > w[i - 1]));
const sameKeys = (b, keys) => object(b) && Object.keys(b).sort().join() === keys;
const complete = (q, walk) => walk.length === q.steps && atFlag(q, walk);
function valid(p, b) {
  const q = p.parameters;
  if (exactMode(q)) {
    if (!sameKeys(b, 'kept,walk') || typeof b.walk !== 'string' || typeof b.kept !== 'string') return false;
    if (!trace(q, b.walk) || b.walk.length > q.steps) return false;
    if (b.kept && !(trace(q, b.kept) && complete(q, b.kept))) return false;
    // The first path to reach the flag on the last box is kept at once.
    return !(complete(q, b.walk) && !b.kept);
  }
  if (!sameKeys(b, 'refused,told,walk,windows') || !trace(q, b.walk) || /[^EN]/.test(b.walk) || typeof b.told !== 'boolean') return false;
  if (b.windows !== null) return b.refused === null && !b.told && claimable(q, b.walk, b.windows) && certifies(q, b.windows);
  // A refused claim: a set of the right size that a flat piece joins, on the flag.
  if (b.refused !== null) return claimable(q, b.walk, b.refused) && !certifies(q, b.refused);
  return !b.told;
}
function solved(p, b) {
  if (!valid(p, b)) return false;
  const q = p.parameters;
  return exactMode(q) ? Boolean(b.kept) && complete(q, b.walk) && b.walk !== b.kept : b.windows !== null;
}
// The walk a tap on corner `to` makes: back to it when it is on the trail,
// or straight on to it when nothing in between is off the strip.
export function walkTo(q, walk, to) {
  if (!Array.isArray(to) || to.length !== 2 || !to.every(int)) return null;
  const pts = trace(q, walk);
  if (!pts) return null;
  const at = pts.findIndex(c => c[0] === to[0] && c[1] === to[1]);
  if (at >= 0) return at < walk.length ? walk.slice(0, at) : null;
  const [x, y] = pts.at(-1), dx = to[0] - x, dy = to[1] - y;
  const d = dy === 0 ? (dx > 0 ? 'E' : dx < 0 ? 'W' : null) : dx === 0 && dy > 0 ? 'N' : null;
  if (!d) return null;
  const next = walk + d.repeat(Math.abs(dx || dy));
  return trace(q, next) && (!exactMode(q) || next.length <= q.steps) ? next : null;
}
// A new walk, with the exact-length keep folded in.
function settle(q, b, walk) {
  if (exactMode(q)) return complete(q, walk) && !b.kept ? {walk: '', kept: walk} : {walk, kept: b.kept};
  return {walk, windows: null, refused: null, told: false};
}
function move(p, b, action) {
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = p.parameters;
  if (action.type === 'go') {
    const walk = walkTo(q, b.walk, action.to);
    return walk === null ? null : settle(q, b, walk);
  }
  if (action.type === 'walk') {
    const walk = action.walk;
    if (typeof walk !== 'string' || walk === b.walk || !trace(q, walk) || (exactMode(q) && walk.length > q.steps)) return null;
    return settle(q, b, walk);
  }
  // One claim per walk: a right set solves; a wrong one is recorded and
  // keeps Fewest off until the walk changes.
  if (action.type === 'fewest' && !exactMode(q)) {
    if (b.refused !== null || !claimable(q, b.walk, action.windows)) return null;
    return certifies(q, action.windows) ? {walk: b.walk, windows: [...action.windows], refused: null, told: false} : {walk: b.walk, windows: null, refused: [...action.windows], told: true};
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Hints
 * ------------------------------------------------------------------ */
const across = ([x, y]) => `${x} across, ${y} up`;
const goText = (d, [x, y]) => `Go ${NAMES[d]} to ${d === 'N' ? `${y} up` : `${x} across`}.`;
const backTo = (q, walk, i) => { const c = trace(q, walk)[i]; return {type: 'move', action: {type: 'go', to: c}, text: `Take the trail back to ${across(c)}.`}; };
const ordinals = list => list.length === 1 ? String(list[0]) : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
// The next straight piece of a finish, as far as it goes.
function nextPiece(q, walk, rest) {
  const d = rest[0];
  let s = 1;
  while (rest[s] === d) s++;
  const to = endOf(q, walk + d.repeat(s));
  return {type: 'move', action: {type: 'go', to}, text: goText(d, to)};
}
const hintCache = new Map();
function hint(p, b) {
  if (!valid(p, b)) return {type: 'deadend', text: 'Restart.'};
  if (solved(p, b)) return {type: 'done'};
  const q = p.parameters, marks = exactMode(q) ? [] : view(p).marks;
  const key = `${p.id}:${JSON.stringify(b)}:${marks.join()}`;
  if (!hintCache.has(key)) hintCache.set(key, exactMode(q) ? exactHint(q, b) : turnsHint(q, b.walk, marks, b.refused !== null));
  return hintCache.get(key);
}
function turnsHint(q, walk, marks, refused) {
  let i = walk.length;
  while (i > 0 && !onTrack(q, walk.slice(0, i))) i--;
  if (i < walk.length) return backTo(q, walk, i);
  // After a refused claim on a staircase with the fewest turns, Fewest
  // comes back once the walk changes: take back its last piece.
  if (refused) {
    let j = walk.length;
    while (j > 0 && walk[j - 1] === walk.at(-1)) j--;
    return backTo(q, walk, j);
  }
  if (atFlag(q, walk)) {
    const sets = windowSets(q, need(fewest(q))), set = sets.find(s => marks.every(c => s.includes(c))) || sets[0];
    return {type: 'move', action: {type: 'fewest', windows: set}, text: `Press Fewest and tap columns ${ordinals(set.map(c => c + 1))}, counting from the left: no flat piece can cross two of them.`};
  }
  // Keep going the same way if that still allows the fewest turns, as far
  // as it does; otherwise turn.
  const ways = (walk ? [walk.at(-1), walk.at(-1) === 'E' ? 'N' : 'E'] : ['E', 'N']).map(d => {
    let best = 0;
    for (let s = 1; trace(q, walk + d.repeat(s)); s++) if (onTrack(q, walk + d.repeat(s))) best = s;
    return [d, best];
  }).filter(([, s]) => s);
  const [d, s] = ways[0];
  return nextPiece(q, walk, d.repeat(s));
}
function exactHint(q, b) {
  let i = b.walk.length;
  while (i > 0 && freshWays(q, b.walk.slice(0, i), b.kept) <= 0) i--;
  if (i < b.walk.length) return backTo(q, b.walk, i);
  return nextPiece(q, b.walk, finishOf(q, b.walk, b.kept));
}

/* ------------------------------------------------------------------ *
 * View state: Fewest pressed, and the windows tapped so far
 * ------------------------------------------------------------------ */
const views = new Map();
const view = p => { if (!views.has(p.id)) views.set(p.id, {claim: false, marks: []}); return views.get(p.id); };
const calm = p => Object.assign(view(p), {claim: false, marks: []});
function ui(p, payload) {
  if (!object(payload) || exactMode(p.parameters)) return;
  const v = view(p);
  if (payload.claim === 'toggle') { Object.assign(v, {claim: !v.claim, marks: []}); return; }
  if (v.claim && int(payload.mark) && payload.mark >= 0 && payload.mark < p.parameters.a)
    v.marks = v.marks.includes(payload.mark) ? v.marks.filter(c => c !== payload.mark) : [...v.marks, payload.mark].sort((x, y) => x - y);
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */
const f = n => Number(n.toFixed(2));
const sx = (q, x) => x * UNIT, sy = (q, y) => (q.b - y) * UNIT;
const pt = (q, [x, y]) => `${f(sx(q, x))},${f(sy(q, y))}`;
// Clip a polygon (world corners) to the half-plane c0 + c1·x + c2·y ≥ 0.
function clip(poly, [c0, c1, c2]) {
  const out = [], val = ([x, y]) => c0 + c1 * x + c2 * y;
  poly.forEach((p, i) => {
    const r = poly[(i + 1) % poly.length], vp = val(p), vr = val(r);
    if (vp >= 0) out.push(p);
    if ((vp >= 0) !== (vr >= 0)) { const t = vp / (vp - vr); out.push([p[0] + t * (r[0] - p[0]), p[1] + t * (r[1] - p[1])]); }
  });
  return out;
}
export const stripPolygon = q => q.D === undefined ? null : clip(clip([[0, 0], [q.a, 0], [q.a, q.b], [0, q.b]], [q.D, q.b, -q.a]), [q.D, -q.b, q.a]);
const columnPolygon = (q, c) => clip(clip(stripPolygon(q), [-c, 1, 0]), [c + 1, -1, 0]);
const poly = (q, list, cls) => `<polygon class="${cls}" points="${list.map(c => pt(q, c)).join(' ')}"/>`;
// Streets the robot may use: both ends in the strip.
function streets(q) {
  let d = '';
  for (let y = 0; y <= q.b; y++) for (let x = 0; x <= q.a; x++) {
    if (!allowed(q, x, y)) continue;
    if (allowed(q, x + 1, y)) d += `M${f(sx(q, x))} ${f(sy(q, y))}H${f(sx(q, x + 1))}`;
    if (allowed(q, x, y + 1)) d += `M${f(sx(q, x))} ${f(sy(q, y))}V${f(sy(q, y + 1))}`;
  }
  return `<path class="st-street" d="${d}"/>`;
}
// The corners one straight piece can reach from the end of the walk.
export function reach(q, walk) {
  const pts = trace(q, walk), out = [];
  if (!pts || (exactMode(q) && walk.length >= q.steps)) return out;
  for (const d of lettersOf(q)) {
    if (reverses(d, walk.at(-1))) continue;
    for (let s = 1; ; s++) {
      const next = walk + d.repeat(s);
      if (!trace(q, next) || (exactMode(q) && next.length > q.steps)) break;
      out.push([d, endOf(q, next)]);
    }
  }
  return out;
}
// Dense boards draw the robot, flag and dots a little larger than a block's share.
const scaleOf = q => Math.min(1.8, Math.max(1, q.a / 9));
// The board. opts: walk, kept (a ghost path), live (reach dots), claim,
// marks, windows (a right claim), hinted ({go, windows}), picture, label.
export function boardSvg(q, opts = {}) {
  const walk = opts.walk || '', pts = trace(q, walk), g = gridOf({cols: q.a, rows: q.b}), s = scaleOf(q);
  const strip = stripPolygon(q);
  const diagonal = strip ? `<path class="st-diagonal" d="M${pt(q, [0, 0])}L${pt(q, [q.a, q.b])}"/>` : '';
  const windows = opts.windows || opts.marks || [], hintedWindows = opts.hinted?.windows || [];
  const shaded = strip ? windows.map(c => poly(q, columnPolygon(q, c), opts.windows ? 'st-window-on proved' : 'st-window-on')).join('') : '';
  const refused = strip && opts.told ? opts.told.map(c => poly(q, columnPolygon(q, c), 'st-window-told')).join('') : '';
  const ringed = strip ? hintedWindows.filter(c => !windows.includes(c)).map(c => poly(q, columnPolygon(q, c), 'st-window-hint')).join('') : '';
  const under = `${strip ? poly(q, strip, 'st-strip') : ''}${shaded}${refused}${ringed}${streets(q)}${diagonal}`;
  const ghost = opts.kept ? `<polyline class="st-ghost" points="${trace(q, opts.kept).map(c => pt(q, c)).join(' ')}"/>` : '';
  const line = pts.map(c => pt(q, c)).join(' ');
  const trail = walk ? `<polyline class="st-trail-case" points="${line}"/><polyline class="st-trail" points="${line}"/>` : '<polyline class="st-trail-case" points=""/><polyline class="st-trail" points=""/>';
  const flats = opts.windows ? piecesOf(q, walk).filter(([d]) => d === 'E').map(([, a, b]) => `<path class="st-flat" d="M${pt(q, a)}L${pt(q, b)}"/>`).join('') : '';
  const end = pts.at(-1);
  const flag = `<g class="st-flag" transform="translate(${pt(q, [q.a, q.b])}) scale(${s})">${FLAG}</g>`;
  const robot = `<g class="st-robot" transform="translate(${pt(q, end)}) scale(${s})">${ROBOT}</g>`;
  const back = opts.hinted?.go && pts.slice(0, -1).some(c => c[0] === opts.hinted.go[0] && c[1] === opts.hinted.go[1])
    ? `<circle class="st-back-hint" cx="${f(sx(q, opts.hinted.go[0]))}" cy="${f(sy(q, opts.hinted.go[1]))}" r="${f(3.6 * s)}"/>` : '';
  const dots = opts.live ? reach(q, walk).map(([d, c]) => {
    const hinted = opts.hinted?.go && opts.hinted.go[0] === c[0] && opts.hinted.go[1] === c[1];
    return `<g class="st-go${hinted ? ' hinted' : ''}" transform="translate(${pt(q, c)})" role="button" tabindex="0" aria-label="${esc(goText(d, c).slice(0, -1))}" data-go="${c.join()}" data-focus="st-go-${c.join('-')}"><rect class="st-cell" x="${-UNIT / 2}" y="${-UNIT / 2}" width="${UNIT}" height="${UNIT}"/><circle class="st-reach" r="${f(Math.min(4.6, 3.4 * s))}"/><circle class="st-pip" r="${f(1.15 * s)}"/></g>`;
  }).join('') : '';
  const columns = opts.claim ? Array.from({length: q.a}, (_, c) => {
    const on = windows.includes(c);
    return `<rect class="st-column${on ? ' on' : ''}" x="${f(sx(q, c))}" y="0" width="${UNIT}" height="${q.b * UNIT}" role="button" tabindex="0" aria-pressed="${on}" aria-label="Column ${c + 1}" data-window="${c}" data-focus="st-window-${c}"/>`;
  }).join('') : '';
  const start = `<circle class="st-start" cx="${f(sx(q, 0))}" cy="${f(sy(q, 0))}" r="${f(1.5 * s)}"/>`;
  return squareBoard(g, {cls: `st-board${opts.picture ? ' st-mini' : ''}${opts.claim ? ' st-claiming' : ''}`, label: opts.label || 'Streets', picture: opts.picture, pad: .45 * s, cell: () => ({}),
    under, over: `${ghost}${trail}${flats}${start}${back}${flag}${robot}${dots}${columns}`})
    .replace('<svg class="sg-board', opts.picture ? '<svg class="sg-board' : '<svg tabindex="-1" data-focus="st-board" class="sg-board');
}

function slotsHtml(q, walk) {
  const played = [...walk].map(d => `<li class="st-played"><span class="st-arrow st-${d}" aria-hidden="true"></span></li>`).join('');
  const empty = Array.from({length: q.steps - walk.length}, () => '<li class="st-slot" aria-hidden="true"></li>').join('');
  // At most nine boxes a row, the rows as even as they can be.
  const row = Math.ceil(q.steps / Math.ceil(q.steps / 9));
  return `<ol class="st-boxes" aria-label="Steps" style="--st-row:${row}">${played}${empty}</ol>`;
}
function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), exact = exactMode(q), v = view(p);
  const claim = !exact && !done && v.claim && atFlag(q, b.walk) && b.refused === null;
  const shown = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const hinted = shown?.type === 'move' ? (shown.action.type === 'go' ? {go: shown.action.to} : {windows: shown.action.windows}) : null;
  const live = !done && !claim && (!exact || b.walk.length < q.steps);
  const board = boardSvg(q, {walk: b.walk, kept: exact ? b.kept : '', live, claim, marks: claim ? v.marks : null, told: !exact && b.told ? b.refused : null, windows: done && !exact ? b.windows : null, hinted, label: exact ? 'Streets' : 'Streets and the gray strip'});
  const end = endOf(q, b.walk);
  let below = '', note = '', status = `At ${across(end)}.`;
  if (exact) {
    below = slotsHtml(q, b.walk);
    if (!done && b.kept && complete(q, b.walk)) note = 'That’s the same path.';
    status += ` ${plural(q.steps - b.walk.length, 'step')} left.${b.kept ? ' One path kept.' : ''}`;
  } else {
    // Fewest waits for the flag, and after a refusal for a change of walk.
    const ready = atFlag(q, b.walk) && !done && b.refused === null;
    const fewestButton = `<button type="button" class="secondary st-fewest${hinted?.windows && !claim ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='{"claim":"toggle"}' data-focus="st-fewest" aria-pressed="${claim}" ${ready ? '' : 'disabled'}>Fewest</button>`;
    const slots = claim ? `<ol class="st-wins" aria-label="Windows">${Array.from({length: need(turnsOf(b.walk))}, (_, i) => `<li class="${i < v.marks.length ? 'on' : ''}" aria-hidden="true"></li>`).join('')}</ol>` : '';
    below = done ? '' : `<div class="st-tools">${fewestButton}${slots}</div>`;
    if (b.told) note = 'A flat piece can cross two of these.';
    status += ` ${plural(turnsOf(b.walk), 'turn')}.${claim ? ` ${v.marks.length} of ${need(turnsOf(b.walk))} windows.` : ''}`;
  }
  return `<div class="st-puzzle${done ? ' solved' : ''}" data-mechanic-wire="stairs"><div class="st-table">${board}</div>${below}${note ? `<p class="st-note" role="status">${esc(note)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// How to play: one small worked picture, not a puzzle of the group.
function help(p) {
  const q = p.parameters;
  if (exactMode(q)) {
    const mini = {mode: 'exact', a: 3, b: 2, steps: 9};
    return `<figure class="st-help" data-mechanic-wire="stairs">${boardSvg(mini, {walk: 'EEENWWNEE', picture: true, label: 'Right 3, up 1, left 2, up 1, right 2: 9 steps'})}</figure>`;
  }
  const mini = {mode: 'turns', a: 4, b: 2, D: 2};
  return `<figure class="st-help" data-mechanic-wire="stairs">${boardSvg(mini, {walk: 'ENEENE', windows: [0, 2, 3], picture: true, label: 'A staircase in a strip with 4 turns, and three columns no flat piece can cross two of'})}</figure>`;
}

/* ------------------------------------------------------------------ *
 * Taps, drags and keys
 * ------------------------------------------------------------------ */
// Board coordinates of a pointer, in blocks with y up.
function worldAt(svg, q, clientX, clientY) {
  const m = svg.getScreenCTM?.();
  if (!m) return null;
  const point = svg.createSVGPoint();
  point.x = clientX; point.y = clientY;
  const r = point.matrixTransform(m.inverse());
  return [r.x / UNIT, q.b - r.y / UNIT];
}
// The corner whose block-wide square holds the point (so a tap anywhere
// goes to its nearest corner, as each dot's square on the board shows).
const nearest = (q, w) => w && Math.max(Math.abs(w[0] - Math.round(w[0])), Math.abs(w[1] - Math.round(w[1]))) <= .5 ? [Math.round(w[0]), Math.round(w[1])] : null;
// A drag follows the finger one block at a time: back along the trail when
// the finger is over it, otherwise a step towards the finger, the longer
// way first.
export function dragTo(q, walk, target) {
  if (!target) return walk;
  const pts = trace(q, walk), at = pts.findIndex(c => c[0] === target[0] && c[1] === target[1]);
  if (at >= 0) return walk.slice(0, at);
  let w = walk;
  for (let k = 0; k < 64; k++) {
    const [x, y] = endOf(q, w), dx = target[0] - x, dy = target[1] - y;
    const options = [dx > 0 ? ['E', dx] : dx < 0 ? ['W', -dx] : null, dy > 0 ? ['N', dy] : null].filter(Boolean).sort((m, n) => n[1] - m[1]);
    const d = options.map(o => o[0]).find(c => trace(q, w + c) && (!exactMode(q) || w.length < q.steps));
    if (!d) break;
    w += d;
  }
  return w;
}
let drag = null, lastTap = -Infinity, listening = false;
function paintDrag() {
  const {svg, q, walk} = drag, line = trace(q, walk).map(c => pt(q, c)).join(' ');
  svg.querySelectorAll('.st-trail,.st-trail-case').forEach(el => el.setAttribute('points', line));
  svg.querySelector('.st-robot')?.setAttribute('transform', `translate(${pt(q, endOf(q, walk))}) scale(${scaleOf(q)})`);
  svg.querySelectorAll('.st-go').forEach(el => el.classList.add('st-hidden'));
}
function pointerMove(e) {
  if (!drag || e.pointerId !== drag.pointer || drag.tap) return;
  if (drag.still || (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 10)) return;
  drag.moved = true;
  const next = dragTo(drag.q, drag.walk, nearest(drag.q, worldAt(drag.svg, drag.q, e.clientX, e.clientY)));
  if (next !== drag.walk) { drag.walk = next; paintDrag(); }
}
function pointerEnd(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  if (d.tap) { lastTap = performance.now(); if (e.type === 'pointerup') d.tap(); return; }
  // A cancelled drag, or one that ends where it began, just redraws the board.
  if (e.type !== 'pointerup') { if (d.moved) d.api.ui({}); return; }
  lastTap = performance.now();
  if (d.moved) { if (d.walk !== d.base) d.api.apply({type: 'walk', walk: d.walk}); else d.api.ui({}); return; }
  const to = nearest(d.q, worldAt(d.svg, d.q, e.clientX, e.clientY));
  if (to && walkTo(d.q, d.base, to) !== null) d.api.apply({type: 'go', to});
}
function wire(root, p, api) {
  const svg = root.querySelector('svg.st-board[data-sg-board]'), q = p.parameters;
  if (!svg) return;
  const board = () => api.attempt().board;
  const tapWindow = c => {
    const v = view(p), marks = v.marks.includes(c) ? v.marks.filter(m => m !== c) : [...v.marks, c].sort((x, y) => x - y);
    // The tap that fills the last slot is the claim, right or wrong.
    if (marks.length === need(turnsOf(board().walk))) { calm(p); api.apply({type: 'fewest', windows: marks}); } else api.ui({mark: c});
  };
  const act = el => {
    if (el.dataset.window !== undefined) tapWindow(Number(el.dataset.window));
    else if (el.dataset.go) api.apply({type: 'go', to: el.dataset.go.split(',').map(Number)});
  };
  svg.addEventListener('click', e => {
    if (performance.now() - lastTap < 700) return;
    const el = e.target.closest('[data-window],[data-go]');
    if (el && svg.contains(el)) act(el);
  });
  svg.addEventListener('keydown', e => {
    const el = e.target.closest('[data-window],[data-go]');
    if (el && ['Enter', ' '].includes(e.key)) { e.preventDefault(); act(el); return; }
    const d = KEYS[e.key];
    if (!d || e.altKey || e.ctrlKey || e.metaKey || svg.classList.contains('st-claiming')) return;
    e.preventDefault();
    const b = board(), next = b.walk + d;
    if (lettersOf(q).includes(d) && trace(q, next) && (!exactMode(q) || next.length <= q.steps)) api.apply({type: 'walk', walk: next});
  });
  if (!listening) {
    document.addEventListener('pointermove', pointerMove);
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, pointerEnd);
    listening = true;
  }
  svg.addEventListener('pointerdown', e => {
    if (e.button > 0 || !e.isPrimary) return;
    // A column counts once, when the press ends, however long it lasts;
    // the click that follows is ignored. Focus goes to the column.
    if (svg.classList.contains('st-claiming')) {
      const el = e.target.closest('[data-window]');
      if (!el) return;
      e.preventDefault();
      el.focus({preventScroll: true});
      const c = Number(el.dataset.window);
      drag = {pointer: e.pointerId, tap: () => tapWindow(c)};
      return;
    }
    const b = board();
    if (solved(p, b)) return;
    // A drag starts on the trail (at its end, or at a corner to go back to);
    // a press anywhere else can only be a tap.
    const from = nearest(q, worldAt(svg, q, e.clientX, e.clientY)), on = from && trace(q, b.walk).some(c => c[0] === from[0] && c[1] === from[1]);
    drag = {pointer: e.pointerId, x: e.clientX, y: e.clientY, svg, q, api, base: b.walk, walk: on ? dragTo(q, b.walk, from) : b.walk, moved: false, still: !on};
  });
}

export const stairMechanics = {
  stairs: {
    fresh: p => exactMode(p.parameters) ? {walk: '', kept: ''} : {walk: '', windows: null, refused: null, told: false},
    valid, solved, hint, render, help, wire, ui,
    // A move to the trail leaves Fewest; so does Undo.
    move(p, b, action) { const next = move(p, b, action); if (next) calm(p); return next; },
    // Undo takes back moves, not a refusal: on the same walk the refusal
    // stands, with its line gone, so the Undo still changes the board.
    carry(p, from, to) {
      calm(p);
      if (exactMode(p.parameters) || !object(from) || !object(to) || !Array.isArray(from.refused) || to.refused !== null || to.walk !== from.walk) return to;
      return {...to, refused: from.refused, told: false};
    },
    reset: p => { calm(p); }
  }
};

// The family seam entry (dist/families.js): a group in Memory robot.
export default {
  id: 'stairs',
  mechanics: stairMechanics,
  pack: new URL('./stairs.json', import.meta.url).href,
  css: new URL('./stairs.css', import.meta.url).href,
  focus: '.st-go,.st-column,svg.st-board[tabindex]'
};
