// Glued squares (worksheet Week 64, straight paths on strange surfaces). A
// few unit squares whose right sides are glued to left sides and tops to
// bottoms, by sliding (never turning), make a surface. A straight trip in a
// whole-number direction (p right, q up) keeps its heading through every
// glued side. After one block (p squares right and q up) it is at the same
// spot of some square: the block moves the trip from square to square by a
// permutation of the squares, the right and up gluings composed in the order
// the block crosses sides. So a trip that misses the corners comes home after
// at most n blocks on n squares (Problem 9), and a whole orbit of starting
// squares shares one return time (Problems 7 and 8).
//
// The child acts on the gluing, never predicts: glue sides so that a trip
// comes home after exactly k blocks (the app draws every trip in the room and
// unrolled as one straight line), or claim Can't and point at every dot when
// k is more than the number of squares; and group the corners of a fixed
// surface by following edge matches, ending in a checked That's all, after
// which the app lays each point's corners round it to show its turns. A
// playground draws straight trips from any start in eight directions.
import {esc} from '../../expansion-controls.js';
import {Q, surfaceOf, shoot, cornerClasses, roomBoard, planeBoard, roomXY, planeXY, wirePortal} from '../../portal-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const f = x => Number((typeof x === 'number' ? x : Q.num(x)).toFixed(3));
export const MODES = ['glue', 'corners', 'playground'];
const KINDS = ['right', 'up'];
const BACK = {right: 'left', up: 'down', left: 'right', down: 'up'};
const SIDE_WORDS = {right: 'right side', left: 'left side', up: 'top', down: 'bottom'};
const CORNERS = ['00', '10', '11', '01'];
const CORNER_WORDS = {'00': 'lower-left corner', '10': 'lower-right corner', '11': 'upper-right corner', '01': 'upper-left corner'};
export const GROUP_COLOURS = ['sun', 'sky', 'rose', 'leaf', 'lilac', 'sand', 'teal', 'peach'];
const ids = q => Object.keys(q.squares);
const possessive = s => `${s}’s`;

// --- Surfaces -------------------------------------------------------------------
// Glue puzzles keep the gluing in the board; corner puzzles and the
// playground's surfaces are fixed in the parameters. Marks stay with the
// side they belong to while the child glues (stableMarks).
export const gluedSurface = (q, b) => surfaceOf({squares: q.squares, right: b.right, up: b.up, stableMarks: true});
export const fixedSurface = (q, n = 1) => surfaceOf({squares: q.squares, right: q.right, up: q.up, ...(n > 1 ? {n} : {})});

// --- Straight trips ---------------------------------------------------------------
// A trip from {s, x, y} (rational lattice coordinates inside square s) in the
// whole-number direction dir, one block at a time: a block is n direction
// vectors (n lattice steps to a side), so each block ends at the same spot of
// some square. It stops when it is home (back on its own spot in its own
// square), at a side glued to nothing ('wall') or at a corner ('corner').
// Returns {pieces, blocks: [{s, X, Y}], stop, home, crossings}: home is the
// number of blocks when it came home, else null; crossings are the gluings
// it went through, in order, as {kind, from, to} (kind 'right' or 'up').
const tripMemo = new Map();
export function tripOf(S, from, dir) {
  const key = `${JSON.stringify(S.spec)}|${from.s}|${from.x}|${from.y}|${dir}`;
  if (tripMemo.has(key)) return tripMemo.get(key);
  const pieces = [], blocks = [];
  let here = {s: from.s, x: Q(from.x), y: Q(from.y), X: S.at[from.s][0], Y: S.at[from.s][1]}, stop = 'limit';
  for (let k = 0; k <= S.ids.length; k++) {
    const shot = shoot(S, here, dir, {length: S.n, corners: 'stop'});
    pieces.push(...shot.pieces);
    if (shot.stop !== 'length') { stop = shot.stop; break; }
    blocks.push({s: shot.end.s, X: shot.end.X, Y: shot.end.Y});
    here = shot.end;
    if (shot.end.s === from.s) { stop = 'home'; break; }
  }
  const crossings = [];
  for (let k = 1; k < pieces.length; k++) {
    const [a, b] = [pieces[k - 1], pieces[k]], dX = b.X - a.X, dY = b.Y - a.Y;
    if (dX) crossings.push(dX > 0 ? {kind: 'right', from: a.s, to: b.s} : {kind: 'right', from: b.s, to: a.s});
    if (dY) crossings.push(dY > 0 ? {kind: 'up', from: a.s, to: b.s} : {kind: 'up', from: b.s, to: a.s});
  }
  const out = {pieces, blocks, stop, home: stop === 'home' ? blocks.length : null, crossings};
  if (tripMemo.size > 4000) tripMemo.clear();
  tripMemo.set(key, out);
  return out;
}
// The dot of a glue puzzle: the same spot in every square.
export const dotOf = (q, s) => ({s, x: Q(q.spot[0]), y: Q(q.spot[1])});
export const goalTrips = (q, b) => { const S = gluedSurface(q, b); return q.trips.map(g => tripOf(S, dotOf(q, g.from), g.dir)); };
const goalsMet = (q, b) => goalTrips(q, b).every((t, k) => t.home === q.trips[k].blocks);

// --- Glue: gluings, solutions and the bound -------------------------------------------
// A gluing is {right, up}: each square's right side glued to the left side of
// one square (or null), each top to one bottom; no side is glued twice. Only
// the kinds in q.sides may change; the others stay as q.start has them.
function permutations(list) {
  if (list.length <= 1) return [list];
  return list.flatMap((x, i) => permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(rest => [x, ...rest]));
}
const solutionMemo = new Map();
// The sides one block crosses, in order ('right' or 'up'): the same from the
// dot of every square, so it is read off one trip on the surface where every
// square is glued to itself.
function blockWord(q, dir) {
  const list = ids(q), self = Object.fromEntries(list.map(s => [s, s]));
  return tripOf(surfaceOf({squares: q.squares, right: self, up: self}), dotOf(q, list[0]), dir).crossings.map(c => c.kind);
}
// A goal trip on a gluing, one block at a time through the block's word:
// {home, crossings}, as tripOf finds them (the tests check they agree). A
// side glued to nothing ends it.
function wordTrip(word, b, from, n) {
  const crossings = [];
  let s = from;
  for (let k = 1; k <= n; k++) {
    for (const kind of word) {
      if (b[kind][s] === null) return {home: null, crossings};
      crossings.push({kind, from: s, to: b[kind][s]}); s = b[kind][s];
    }
    if (s === from) return {home: k, crossings};
  }
  return {home: null, crossings};
}
// Every full gluing of the changeable kinds whose goal trips pass `test`,
// with their needs: the gluings the trips go through, in order.
function fullGluings(q, test) {
  const list = ids(q), options = KINDS.map(kind => q.sides.includes(kind) ? permutations(list).map(p => Object.fromEntries(list.map((s, i) => [s, p[i]]))) : [q.start[kind]]);
  const words = q.trips.map(g => blockWord(q, g.dir)), out = [];
  for (const right of options[0]) for (const up of options[1]) {
    const b = {right, up}, trips = q.trips.map((g, k) => wordTrip(words[k], b, g.from, list.length));
    if (!test(trips)) continue;
    const needs = [];
    for (const t of trips) for (const c of t.crossings) if (!needs.some(n => n.kind === c.kind && n.from === c.from)) needs.push(c);
    out.push({right, up, needs});
  }
  // Hints head for a gluing with the fewest sides glued to their own square.
  const own = t => t.needs.filter(n => n.from === n.to).length;
  return out.sort((a, b) => own(a) - own(b));
}
export const fullGluingsOf = (q, test) => fullGluings(q, test);
export function solutionsOf(q) {
  const key = JSON.stringify(q);
  if (!solutionMemo.has(key)) solutionMemo.set(key, fullGluings(q, trips => trips.every((t, k) => t.home === q.trips[k].blocks)));
  return solutionMemo.get(key);
}
export const gluePossible = q => solutionsOf(q).length > 0;
// The longest trips: the first trip home after one block per square. A can't
// puzzle's hints build one of these before the claim.
const longMemo = new Map();
export function longestOf(q) {
  const key = JSON.stringify(q);
  if (!longMemo.has(key)) longMemo.set(key, fullGluings(q, trips => trips[0].home === ids(q).length));
  return longMemo.get(key);
}
const glueKey = (q, b) => ids(q).map(s => `${b.right[s] ?? '-'}${b.up[s] ?? '-'}`).join('');
const attempted = (q, b) => glueKey(q, b) !== glueKey(q, q.start);
function validGlue(q, map, kind) {
  const list = ids(q);
  if (!object(map) || Object.keys(map).sort().join() !== [...list].sort().join()) return false;
  const vals = Object.values(map);
  if (!vals.every(v => v === null || list.includes(v))) return false;
  const used = vals.filter(v => v !== null);
  if (new Set(used).size !== used.length) return false;
  return q.sides.includes(kind) || list.every(s => map[s] === q.start[kind][s]);
}
// Glue the side of `from` (its right side or top) to the side of `to`
// across from it: whatever either side was glued to comes free.
function glueSides(b, kind, from, to) {
  const map = Object.fromEntries(Object.entries(b[kind]).map(([s, t]) => [s, t === to ? null : t]));
  map[from] = to;
  return {...b, [kind]: map};
}

// --- Corners --------------------------------------------------------------------
// A corner is "s:cxcy" (cx, cy 0 for left or bottom, 1 for right or top). Two
// corners meet across one glued side: a right corner of s and the matching
// left corner of the square glued to its right, a top corner and the
// matching bottom corner of the square above.
export const cornerKey = (s, c) => `${s}:${c}`;
const parseCorner = k => { const [s, c] = String(k).split(':'); return {s, c}; };
export const allCorners = S => S.ids.flatMap(s => CORNERS.map(c => cornerKey(s, c)));
export function cornerMatches(S, k) {
  const {s, c} = parseCorner(k), cx = +c[0], cy = +c[1];
  const h = (cx ? S.right : S.left)[s], v = (cy ? S.up : S.down)[s];
  return [h ? cornerKey(h, `${1 - cx}${cy}`) : null, v ? cornerKey(v, `${cx}${1 - cy}`) : null].filter(Boolean);
}
const isMatch = (S, a, b) => cornerMatches(S, a).includes(b);
// Going counterclockwise round a point: past a lower-left corner's left side
// into the lower-right corner of the square to its left, and so on. Each
// step is one edge match; a point's corners form one such cycle.
const NEXT = {'00': ['left', '10'], '10': ['down', '11'], '11': ['right', '01'], '01': ['up', '00']};
export function cornerCycles(S) {
  return cornerClasses(S).map(cl => {
    const first = cornerKey(cl.corners[0].s, cl.corners[0].c.join('')), out = [first];
    for (let k = first; out.length <= cl.corners.length;) {
      const {s, c} = parseCorner(k), [side, c2] = NEXT[c];
      k = cornerKey(S.glue[side][s], c2);
      if (k === first) break;
      out.push(k);
    }
    return out;
  });
}
// The child's groups, from the links in order. A group of two or more gets a
// colour when it forms; a merged group keeps the older colour.
export function groupsOf(S, links) {
  const parent = new Map(allCorners(S).map(k => [k, k])), colour = new Map();
  const find = k => { while (parent.get(k) !== k) k = parent.get(k); return k; };
  for (const [a, b] of links) {
    const [ra, rb] = [find(a), find(b)];
    if (ra === rb) continue;
    const [ca, cb] = [colour.get(ra), colour.get(rb)];
    let keep = ra, drop = rb, c = ca;
    if (ca === undefined && cb === undefined) { const used = new Set(colour.values()); c = GROUP_COLOURS.findIndex((_, i) => !used.has(i)); }
    else if (ca === undefined || (cb !== undefined && cb < ca)) { keep = rb; drop = ra; c = cb; }
    parent.set(drop, keep); colour.delete(drop); colour.delete(keep); colour.set(keep, c);
  }
  const root = new Map(allCorners(S).map(k => [k, find(k)]));
  return {root, colourOf: k => colour.get(root.get(k)), count: new Set(root.values()).size};
}
export const complete = (S, links) => groupsOf(S, links).count === cornerClasses(S).length;
function linksOk(S, links) {
  if (!Array.isArray(links) || links.length > 4 * S.ids.length) return false;
  const all = new Set(allCorners(S));
  for (let k = 0; k < links.length; k++) {
    const l = links[k];
    if (!Array.isArray(l) || l.length !== 2 || !l.every(c => all.has(c)) || !isMatch(S, l[0], l[1])) return false;
    const g = groupsOf(S, links.slice(0, k));
    if (g.root.get(l[0]) === g.root.get(l[1])) return false;
  }
  return true;
}

// --- Boards ---------------------------------------------------------------------
// glue:       {right, up, told, claimed}  told 'taps' after Can't without the
//             trip's landings in order, 'way' after them on a puzzle that can be done
// corners:    {links, told, done}         told 'more' after a wrong That's all
// playground: {surface, start, dir}
const keysAre = (b, keys) => object(b) && Object.keys(b).sort().join() === [...keys].sort().join();
const playSurface = (q, b) => q.surfaces[b.surface];
export const playS = (q, b) => fixedSurface(playSurface(q, b), q.n);
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'glue') return {right: {...q.start.right}, up: {...q.start.up}, told: null, claimed: false};
  if (q.mode === 'corners') return {links: [], told: null, done: false};
  return {surface: Object.keys(q.surfaces)[0], start: {...q.start}, dir: 0};
}
function valid(p, b) {
  const q = p.parameters;
  if (q.mode === 'glue') {
    if (!keysAre(b, ['right', 'up', 'told', 'claimed']) || !validGlue(q, b.right, 'right') || !validGlue(q, b.up, 'up')) return false;
    if (typeof b.claimed !== 'boolean' || ![null, 'taps', 'way'].includes(b.told) || (b.claimed && b.told !== null)) return false;
    if (b.claimed) return !gluePossible(q) && attempted(q, b) && fullTrip(q, b);
    return b.told !== 'way' || gluePossible(q);
  }
  if (q.mode === 'corners') {
    if (!keysAre(b, ['links', 'told', 'done']) || typeof b.done !== 'boolean' || (b.told !== null && b.told !== 'more')) return false;
    const S = fixedSurface(q);
    if (!linksOk(S, b.links)) return false;
    if (b.done) return b.told === null && complete(S, b.links);
    return b.told !== 'more' || !complete(S, b.links);
  }
  if (!keysAre(b, ['surface', 'start', 'dir']) || typeof b.surface !== 'string' || !Object.hasOwn(q.surfaces, b.surface)) return false;
  if (!Number.isInteger(b.dir) || b.dir < 0 || b.dir >= q.dirs.length) return false;
  if (b.start === null) return true;
  const st = b.start;
  return keysAre(st, ['s', 'i', 'j']) && Object.hasOwn(playSurface(q, b).squares, st.s) && [st.i, st.j].every(v => Number.isInteger(v) && v >= 0 && v < q.n);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'corners') return b.done;
  return b.claimed || goalsMet(q, b);
}
// Can't is open once the child has glued something, and not again after
// "There is a way." until a gluing changes.
const cantOpen = (q, b) => attempted(q, b) && b.told !== 'way';
// The certificate behind Can't is the child's own trip: the first goal trip
// lands on every dot and comes home after one block per square, and the dots
// are tapped in the order it lands on them. Anything less gets the same
// refusal on every puzzle; only a whole certificate is checked against the
// puzzle, so a refusal never tells which puzzles can be done.
const landings = t => t.blocks.map(x => x.s);
const fullTrip = (q, b) => goalTrips(q, b)[0].home === ids(q).length;
const certified = (q, b, dots) => fullTrip(q, b) && landings(goalTrips(q, b)[0]).join() === dots.join();

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'glue') {
    if (action.type === 'glue') {
      const {side, from, to} = action, list = ids(q);
      if (!KINDS.includes(side) || !q.sides.includes(side) || !list.includes(from) || !list.includes(to) || b[side][from] === to) return null;
      return {...glueSides(b, side, from, to), told: null};
    }
    if (action.type === 'cant') {
      const list = ids(q), dots = action.dots;
      if (!cantOpen(q, b) || !Array.isArray(dots) || dots.length !== list.length || !dots.every(s => list.includes(s)) || new Set(dots).size !== dots.length) return null;
      if (!certified(q, b, dots)) return {...b, told: 'taps'};
      return gluePossible(q) ? {...b, told: 'way'} : {...b, told: null, claimed: true};
    }
    return null;
  }
  if (q.mode === 'corners') {
    const S = fixedSurface(q);
    if (action.type === 'link') {
      const {a, b: c} = action, all = new Set(allCorners(S));
      if (!all.has(a) || !all.has(c) || !isMatch(S, a, c)) return null;
      const g = groupsOf(S, b.links);
      if (g.root.get(a) === g.root.get(c)) return null;
      return {...b, links: [...b.links, [a, c]], told: null};
    }
    if (action.type === 'all') {
      if (b.told === 'more') return null;
      return complete(S, b.links) ? {...b, done: true} : {...b, told: 'more'};
    }
    return null;
  }
  // playground
  if (action.type === 'surface') return typeof action.id === 'string' && Object.hasOwn(q.surfaces, action.id) && action.id !== b.surface ? {surface: action.id, start: {...q.start}, dir: b.dir} : null;
  if (action.type === 'dir') return Number.isInteger(action.k) && action.k >= 0 && action.k < q.dirs.length && action.k !== b.dir ? {...b, dir: action.k} : null;
  if (action.type === 'start') {
    const next = {...b, start: {s: action.s, i: action.i, j: action.j}};
    return valid(p, next) && JSON.stringify(next.start) !== JSON.stringify(b.start) ? next : null;
  }
  return null;
}

// --- Hints ------------------------------------------------------------------------
const glueWords = ({kind, from, to}) => from === to
  ? `Glue ${possessive(from)} ${SIDE_WORDS[kind]} to its own ${SIDE_WORDS[BACK[kind]]}.`
  : `Glue ${possessive(from)} ${SIDE_WORDS[kind]} to ${possessive(to)} ${SIDE_WORDS[BACK[kind]]}.`;
// The first gluing a nearest target still needs, in the order its trips go.
function towards(targets, b) {
  let best = null;
  for (const t of targets) {
    const diff = t.needs.filter(n => b[n.kind][n.from] !== n.to);
    if (!best || diff.length < best.length) best = diff;
  }
  return best?.[0] || null;
}
const hintMemo = new Map();
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const key = `${p.id}|${JSON.stringify(b)}`;
  if (hintMemo.has(key)) return hintMemo.get(key);
  const out = q.mode === 'glue' ? glueHint(q, b) : cornerHint(q, b);
  if (hintMemo.size > 2000) hintMemo.clear();
  hintMemo.set(key, out);
  return out;
}
function glueHint(q, b) {
  const sols = solutionsOf(q);
  if (sols.length) {
    const need = towards(sols, b);
    return {type: 'move', action: {type: 'glue', side: need.kind, from: need.from, to: need.to}, text: glueWords(need)};
  }
  // No gluing works: build the longest trip first, then claim with the reason.
  const n = ids(q).length;
  const t = goalTrips(q, b)[0];
  if (t.home === n && cantOpen(q, b)) return {type: 'move', action: {type: 'cant', dots: landings(t)}, text: `The trip has landed on every dot, and it can’t land on a dot twice before it gets home. Press Can’t and tap the dots in the order it lands: ${landings(t).join(', ')}.`};
  const need = towards(longestOf(q), b);
  return {type: 'move', action: {type: 'glue', side: need.kind, from: need.from, to: need.to}, text: glueWords(need)};
}
const cornerWords = k => { const {s, c} = parseCorner(k); return `${possessive(s)} ${CORNER_WORDS[c]}`; };
function cornerHint(q, b) {
  const S = fixedSurface(q), g = groupsOf(S, b.links);
  for (const cycle of cornerCycles(S)) for (let i = 0; i < cycle.length; i++) {
    const a = cycle[i], c = cycle[(i + 1) % cycle.length];
    if (g.root.get(a) !== g.root.get(c)) return {type: 'move', action: {type: 'link', a, b: c}, text: `Join ${cornerWords(a)} to ${cornerWords(c)}.`};
  }
  return {type: 'move', action: {type: 'all'}, text: 'Every corner meets only corners in its own group. Press That’s all.'};
}

// --- View state -------------------------------------------------------------------
// The chosen side or corner, and the dots tapped after Can't. Kept outside the
// save; cleared by Restart.
const views = new Map();
const view = p => { if (!views.has(p.id)) views.set(p.id, {side: null, corner: null, claiming: false, picked: []}); return views.get(p.id); };
function setView(p, payload) {
  if (!object(payload)) return;
  const v = view(p);
  if ('side' in payload) v.side = payload.side;
  if ('corner' in payload) v.corner = payload.corner;
  if ('claiming' in payload) { v.claiming = Boolean(payload.claiming); v.picked = []; v.side = null; }
  if ('picked' in payload && Array.isArray(payload.picked)) v.picked = payload.picked;
}

// --- Drawing helpers --------------------------------------------------------------
const pathOf = pts => `M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L')}Z`;
const button = (label, action, enabled, hinted, extra = '') => `<button type="button" class="secondary gl-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="gl-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
// A direction arrow from (0, 0) to (p, q) over the (p + 1) × (q + 1) dots it
// spans, so its squares right and up can be counted, centred in a box of the
// given size.
function arrowIcon([p, q], size = 22, cls = 'gl-arrow-icon') {
  const m = Math.max(p, q, 1), cell = (size - 6) / m, ox = (size - p * cell) / 2, oy = (size + q * cell) / 2, at = (i, j) => [ox + i * cell, oy - j * cell];
  let dots = '';
  if (m > 1) for (let i = 0; i <= p; i++) for (let j = 0; j <= q; j++) { const [x, y] = at(i, j); dots += `<circle cx="${f(x)}" cy="${f(y)}" r="1.1"/>`; }
  const [x1, y1] = at(0, 0), [x2, y2] = at(p, q), len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, h = Math.min(6, size * .28), [nx, ny] = [-uy, ux];
  const head = `${f(x2)},${f(y2)} ${f(x2 - ux * h + nx * h * .55)},${f(y2 - uy * h + ny * h * .55)} ${f(x2 - ux * h - nx * h * .55)},${f(y2 - uy * h - ny * h * .55)}`;
  return `<svg class="${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${dots}<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2 - ux * h * .8)}" y2="${f(y2 - uy * h * .8)}"/><polygon points="${head}"/></svg>`;
}
export const dirWords = ([p, q]) => q === 0 ? 'right' : p === 0 ? 'up' : `${p} right, ${q} up`;
// Where to put a square's letter: the corner spot furthest from every line
// of trips in these directions through this spot.
function letterSpot(dirs, spot) {
  const [x0, y0] = spot.map(Q.num);
  const away = ([x, y]) => Math.min(...dirs.map(([p, q]) => { const v = q * (x - x0) - p * (y - y0); return Math.abs(v - Math.round(v)) / Math.hypot(p, q); }));
  return [[.2, .8], [.8, .8], [.2, .2], [.8, .2]].reduce((best, c) => away(c) > away(best) + 1e-9 ? c : best);
}
// A small arrowhead just ahead of a point, pointing along dir (drawing
// coordinates, y down), clear of the ring round the point.
function arrowHead([x, y], [p, q], size, cls, gap = 0) {
  const len = Math.hypot(p, q), ux = p / len, uy = -q / len, nx = -uy, ny = ux;
  const back = [x + ux * gap, y + uy * gap], tip = [back[0] + ux * size, back[1] + uy * size];
  return `<polygon class="${cls}" points="${f(tip[0])},${f(tip[1])} ${f(back[0] + nx * size * .5)},${f(back[1] + ny * size * .5)} ${f(back[0] - nx * size * .5)},${f(back[1] - ny * size * .5)}"/>`;
}
// A trip's pieces in the room (each in its own square) or in the plane.
const roomPieces = (S, pieces, cls) => pieces.map(pc => { const [a, b] = [roomXY(S, pc.s, ...pc.a), roomXY(S, pc.s, ...pc.b)]; return `<line class="${cls}" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`; }).join('');
const planeLine = (S, pieces, cls) => {
  if (!pieces.length) return '';
  const pts = [planeXY(S, pieces[0].X, pieces[0].Y, ...pieces[0].a), ...pieces.map(pc => planeXY(S, pc.X, pc.Y, ...pc.b))];
  return `<polyline class="${cls}" points="${pts.map(p => p.map(f).join(',')).join(' ')}"/>`;
};
// Where a trip stopped short: a bar across a side glued to nothing, a cross at a corner.
function stopMark(xy, stop, size) {
  const [x, y] = xy;
  if (stop === 'corner') return `<path class="gl-stop" d="M${f(x - size)},${f(y - size)}L${f(x + size)},${f(y + size)}M${f(x - size)},${f(y + size)}L${f(x + size)},${f(y - size)}"/>`;
  if (stop === 'wall') return `<circle class="gl-stop" cx="${f(x)}" cy="${f(y)}" r="${f(size * .8)}"/>`;
  return '';
}

// The unrolled strip of one trip: only the squares it crosses (spread off),
// with the trip as one straight line, a dot at each block's end, the start
// ringed with its arrow and home ringed again.
function strip(S, p, k, from, dir, t, opts = {}) {
  const anchors = t.pieces.length ? t.pieces.map(pc => ({s: pc.s, X: pc.X, Y: pc.Y})) : [{s: from.s, X: S.at[from.s][0], Y: S.at[from.s][1]}];
  const n = S.n, start = planeXY(S, S.at[from.s][0], S.at[from.s][1], from.x, from.y);
  const ends = t.blocks.map(bl => planeXY(S, bl.X, bl.Y, from.x, from.y));
  let over = planeLine(S, t.pieces, `gl-trail t${k}`);
  over += ends.map((xy, i) => `<circle class="gl-block${t.home === i + 1 ? ' home' : ''}" cx="${f(xy[0])}" cy="${f(xy[1])}" r="${f(.09 * n)}"/>`).join('');
  over += `<circle class="gl-start t${k}" cx="${f(start[0])}" cy="${f(start[1])}" r="${f(.09 * n)}"/>` + arrowHead(start, dir, .13 * n, `gl-tip t${k}`, .11 * n);
  if (t.home) over += `<circle class="gl-home t${k}" cx="${f(ends.at(-1)[0])}" cy="${f(ends.at(-1)[1])}" r="${f(.17 * n)}"/>`;
  else if (t.pieces.length) { const last = t.pieces.at(-1); over += stopMark(planeXY(S, last.X, last.Y, ...last.b), t.stop, .1 * n); }
  const show = anchors.map(a => [a.X * n, a.Y * n]), at = opts.letterAt || [.2, .8];
  const Xs = anchors.map(a => a.X), Ys = anchors.map(a => a.Y), pad = .12 * n;
  // Sized by its squares: --w squares across (pads included), each at most --sq wide.
  const wide = Math.max(...Xs) - Math.min(...Xs) + 1 + 2 * pad / n;
  return `<div class="gl-strip-view" style="--w:${f(wide)}">${planeBoard(S, {cls: 'gl-strip', label: opts.label || 'Unrolled trip', key: `glued-${p.id}-${k}`, anchors, spread: false, show, min: 1, max: 40, margin: 0, pad: .12 * n, labelAt: [at[0] * n - .5, at[1] * n - .5], point: pt => (n === 1 || (pt.i === 0 && pt.j === 0)) ? {text: pt.s, textCls: `faint gl-letter${n > 1 ? ' big' : ''}`} : {}, over})}</div>`;
}

// --- Glue: rendering ----------------------------------------------------------------
const sideKey = (s, side) => `${s}:${side}`;
const kindOf = side => side === 'right' || side === 'left' ? 'right' : 'up';
// The gluing a pair of chosen sides makes, or null.
function pairAction(a, b) {
  if (!a || !b || kindOf(a.side) !== kindOf(b.side) || a.side === b.side) return null;
  const [first, second] = a.side === 'right' || a.side === 'up' ? [a, b] : [b, a];
  return {type: 'glue', side: kindOf(a.side), from: first.s, to: second.s};
}
// The four sides of square s as triangles from its centre, in drawing coordinates.
const SIDE_TRI = {right: [[1, 0], [1, 1]], left: [[0, 1], [0, 0]], up: [[1, 1], [0, 1]], down: [[0, 0], [1, 0]]};
const sideTri = (S, s, side) => [roomXY(S, s, Q(1, 2), Q(1, 2)), ...SIDE_TRI[side].map(([x, y]) => roomXY(S, s, x, y))];
function partnerWords(b, s, side) {
  const kind = kindOf(side);
  const other = side === kind ? b[kind][s] : Object.keys(b[kind]).find(t => b[kind][t] === s);
  return other ? (other === s ? `glued to its own ${SIDE_WORDS[BACK[side]]}` : `glued to ${possessive(other)} ${SIDE_WORDS[BACK[side]]}`) : 'glued to nothing';
}

function renderGlue(p, a) {
  const q = p.parameters, b = a.board, S = gluedSurface(q, b), done = solved(p, b), v = view(p), list = ids(q);
  // A new gluing (a move, Undo, an applied hint) closes the dots and drops a chosen side.
  const now = JSON.stringify(b);
  if (v.board !== now) { if (v.board !== undefined) { v.claiming = false; v.picked = []; v.side = null; } v.board = now; }
  if (v.claiming && (done || !cantOpen(q, b))) { v.claiming = false; v.picked = []; }
  const shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const claiming = v.claiming && !done && cantOpen(q, b);
  const trips = goalTrips(q, b);
  const chosen = !claiming && v.side && q.sides.includes(kindOf(v.side.side)) ? v.side : null;
  // The room: big pale letters, the trips, a dot in every square, the starts.
  let under = '', over = '', top = '';
  const [lx, ly] = letterSpot(q.trips.map(g => g.dir), q.spot);
  for (const s of list) { const [x, y] = roomXY(S, s, lx, ly); under += `<text class="gl-room-letter" x="${f(x)}" y="${f(y + .17)}">${s}</text>`; }
  trips.forEach((t, k) => { over += roomPieces(S, t.pieces, `gl-trail t${k}`); });
  for (const s of list) {
    const [x, y] = roomXY(S, s, Q(q.spot[0]), Q(q.spot[1]));
    over += `<circle class="gl-dot" cx="${f(x)}" cy="${f(y)}" r=".055"/>`;
  }
  q.trips.forEach((g, k) => {
    const xy = roomXY(S, g.from, Q(q.spot[0]), Q(q.spot[1]));
    over += `<circle class="gl-start t${k}" cx="${f(xy[0])}" cy="${f(xy[1])}" r=".08"/>` + arrowHead(xy, g.dir, .12, `gl-tip t${k}`, .1);
  });
  // Sides: the chosen one, the ones it can be glued to, the hinted pair.
  const hintSides = shown?.type === 'glue' ? [sideKey(shown.from, shown.side), sideKey(shown.to, BACK[shown.side])] : [];
  for (const s of list) for (const side of ['right', 'left', 'up', 'down']) {
    if (!q.sides.includes(kindOf(side))) continue;
    const k = sideKey(s, side), tri = sideTri(S, s, side);
    const isChosen = chosen && chosen.s === s && chosen.side === side, could = chosen && !isChosen && kindOf(chosen.side) === kindOf(side) && chosen.side !== side;
    const cls = ['gl-side', isChosen ? 'chosen' : '', could ? 'could' : '', hintSides.includes(k) ? 'hinted' : ''].filter(Boolean).join(' ');
    if (cls !== 'gl-side') over += `<path class="${cls}" d="${pathOf(tri)}"/>`;
    if (isChosen || hintSides.includes(k)) { const [, p1, p2] = tri; over += `<line class="gl-side-line${isChosen ? ' chosen' : ' hinted'}" x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}"/>`; }
    if (!done && !claiming) top += `<g class="pb-point act gl-side-hit" data-pb-point="side,${s},${side}" data-pb-view="room" role="button" tabindex="0" aria-pressed="${Boolean(isChosen)}" aria-label="${esc(`${s}, ${SIDE_WORDS[side]}, ${partnerWords(b, s, side)}`)}" data-focus="gl-side-${s}-${side}"><path class="pb-hit" d="${pathOf(tri)}"/></g>`;
  }
  // Can't: every dot is a control; the ones tapped are ringed, and a hint
  // rings the next dot the trip lands on.
  const next = shown?.type === 'cant' && v.picked.every((s, i) => shown.dots[i] === s) ? shown.dots[v.picked.length] : null;
  if (claiming || (done && b.claimed)) for (const s of list) {
    const [x, y] = roomXY(S, s, Q(q.spot[0]), Q(q.spot[1])), picked = done || v.picked.includes(s);
    over += `<circle class="gl-ring${picked ? ' picked' : ''}${claiming && s === next ? ' hinted' : ''}" cx="${f(x)}" cy="${f(y)}" r=".2"/>`;
    if (claiming) top += `<g class="pb-point act gl-dot-hit" data-pb-point="dot,${s}" data-pb-view="room" role="button" tabindex="0" aria-pressed="${picked}" aria-label="${esc(`Dot in ${s}`)}" data-focus="gl-dot-${s}"><circle class="pb-hit" cx="${f(x)}" cy="${f(y)}" r=".3"/></g>`;
  }
  const room = roomBoard(S, {cls: 'gl-room', label: 'Squares', pad: .42, point: () => ({}), under, over, top});
  // Each trip: its start and arrow, beads for the blocks, and the unrolled strip.
  const cards = q.trips.map((g, k) => {
    // The first trip's beads take the letters of the dots tapped after Can't,
    // and after a right Can't the letters of the dots the trip landed on.
    const t = trips[k], letters = k ? null : done && b.claimed ? landings(t) : claiming ? v.picked : null;
    const beads = beadRow(g, t, letters, done && b.claimed);
    const label = `Trip from ${g.from}, ${dirWords(g.dir)}: ${t.home ? `home after ${t.home} ${t.home === 1 ? 'block' : 'blocks'}` : t.stop === 'wall' ? `stops at a side glued to nothing after ${t.blocks.length} ${t.blocks.length === 1 ? 'block' : 'blocks'}` : t.stop === 'corner' ? 'stops at a corner' : 'not home'}. Goal: home after exactly ${g.blocks}.`;
    return `<div class="gl-trip"><div class="gl-head"><span class="gl-from t${k}">${g.from}</span>${arrowIcon(g.dir, 22)}${beads}</div>${strip(S, p, k, dotOf(q, g.from), g.dir, t, {label, letterAt: letterSpot([g.dir], q.spot)})}<p class="sr-only">${esc(label)}</p></div>`;
  }).join('');
  const open = cantOpen(q, b), hintCant = shown?.type === 'cant' && !claiming;
  const bar = done ? '' : `<div class="gl-bar"><button type="button" class="secondary gl-button gl-cant${hintCant ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="gl-cant" aria-pressed="${claiming}" ${open ? '' : 'disabled'}>Can’t</button></div>`;
  const told = b.told === 'way' ? 'There is a way.' : b.told === 'taps' ? 'The taps must follow the trip to every dot and home.' : '';
  const status = `${trips.map((t, k) => `${q.trips[k].from}: ${t.home ? `home after ${t.home}` : 'not home'}`).join('. ')}.${told ? ` ${told}` : ''}`;
  return `<div class="gl-puzzle mode-glue${done ? ' solved' : ''}${claiming ? ' claiming' : ''}" data-mechanic-wire="glued">${bar}<div class="gl-stage${q.trips.length > 1 ? ' two' : ''}"><div class="gl-room-view">${room}</div><div class="gl-trips">${cards}</div></div>${told ? `<p class="gl-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// Beads: one per block of the goal, filled as the trip's blocks pass, the
// last ringed when the trip is home on it; extra blocks are rose. While the
// dots are tapped after Can't, the beads take their letters in the order
// tapped. After a right Can't they show the trip's landings, home last, and
// the beads left over have no dot.
function beadRow(g, t, letters, certificate) {
  const beads = [];
  if (letters) {
    const total = Math.max(g.blocks, letters.length);
    for (let i = 0; i < total; i++) beads.push(i < letters.length
      ? `<i class="on lettered${certificate && i === letters.length - 1 ? ' home' : ''}${i >= g.blocks ? ' extra' : ''}">${letters[i]}</i>`
      : `<i${certificate ? ' class="none"' : ''}></i>`);
  } else {
    const done = t.blocks.length, total = Math.max(g.blocks, done);
    for (let i = 0; i < total; i++) beads.push(`<i class="${[i < done ? 'on' : '', t.home === i + 1 ? 'home' : '', i >= g.blocks ? 'extra' : ''].filter(Boolean).join(' ')}"></i>`);
  }
  return `<span class="gl-beads" aria-hidden="true">${beads.join('')}</span>`;
}

// --- Corners: rendering -------------------------------------------------------------
const WEDGE = .3, HIT = .46;
// A corner's quarter disc and its hit square, in drawing coordinates.
function wedge(S, k, r) {
  const {s, c} = parseCorner(k), cx = +c[0], cy = +c[1], dx = cx ? -1 : 1, dy = cy ? -1 : 1, pts = [roomXY(S, s, cx, cy)];
  for (let i = 0; i <= 6; i++) { const t = i / 6 * Math.PI / 2; pts.push(roomXY(S, s, cx + dx * r * Math.cos(t), cy + dy * r * Math.sin(t))); }
  return pts;
}
const hitSquare = (S, k) => { const {s, c} = parseCorner(k), cx = +c[0], cy = +c[1], dx = cx ? -HIT : HIT, dy = cy ? -HIT : HIT; return [[cx, cy], [cx + dx, cy], [cx + dx, cy + dy], [cx, cy + dy]].map(([x, y]) => roomXY(S, s, x, y)); };
function renderCorners(p, a) {
  const q = p.parameters, b = a.board, S = fixedSurface(q), done = solved(p, b), v = view(p);
  const g = groupsOf(S, b.links), shown = a.hintLevel >= 2 && !done ? hint(p, b).action : null;
  const marked = shown?.type === 'link' ? [shown.a, shown.b] : [];
  const chosen = !done && allCorners(S).includes(v.corner) ? v.corner : null;
  let over = '', top = '';
  for (const k of allCorners(S)) {
    const colour = g.colourOf(k), cls = ['gl-wedge', colour !== undefined ? `g${colour}` : '', k === chosen ? 'chosen' : '', marked.includes(k) ? 'hinted' : ''].filter(Boolean).join(' ');
    over += `<path class="${cls}" d="${pathOf(wedge(S, k, WEDGE))}"/>`;
    if (!done) {
      const {s, c} = parseCorner(k);
      const label = `${s}, ${CORNER_WORDS[c]}${colour !== undefined ? `, ${GROUP_COLOURS[colour]} group` : ''}${k === chosen ? ', chosen' : ''}`;
      top += `<g class="pb-point act gl-corner-hit" data-pb-point="corner,${k}" data-pb-view="room" role="button" tabindex="0" aria-pressed="${k === chosen}" aria-label="${esc(label)}" data-focus="gl-corner-${k.replace(':', '-')}"><path class="pb-hit" d="${pathOf(hitSquare(S, k))}"/></g>`;
    }
  }
  const room = roomBoard(S, {cls: 'gl-room gl-corners', label: 'Squares', pad: .3, markSize: .09, point: pt => ({text: pt.s, textCls: 'gl-centre'}), over, top});
  const bar = done ? '' : `<div class="gl-bar">${button('That’s all', {type: 'all'}, b.told !== 'more', shown?.type === 'all')}</div>`;
  const told = b.told === 'more' ? 'Some corners still meet.' : '';
  const roses = done ? `<div class="gl-roses">${cornerCycles(S).map(cycle => rosette(cycle, g.colourOf(cycle[0]))).join('')}</div>` : '';
  const status = done ? `${cornerCycles(S).length === 1 ? 'Every corner is one point.' : `The corners make ${cornerCycles(S).length} points.`}` : `${told}`;
  const [c0, r0, c1, r1] = S.box, aspect = (c1 - c0 + .84) / (r1 - r0 + .84);
  return `<div class="gl-puzzle mode-corners${done ? ' solved' : ''}" data-mechanic-wire="glued">${bar}<div class="gl-corner-stage"><div class="gl-corners-view" style="--a:${f(aspect)}">${room}</div>${roses}</div>${told ? `<p class="gl-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
// A point's corners laid round it in edge-matching order, a quarter turn
// each, one ring per full turn: four corners make one ring (a flat point),
// twelve make three rings (three full turns).
function rosette(cycle, colour) {
  const rings = Math.ceil(cycle.length / 4), r0 = .22, w = .5, R = r0 + rings * w + .05;
  let out = '';
  cycle.forEach((k, i) => {
    const ring = Math.floor(i / 4), a0 = (i % 4) * Math.PI / 2, a1 = a0 + Math.PI / 2, ri = r0 + ring * w + .03, ro = ri + w - .06;
    const pt = (r, t) => `${f(r * Math.cos(t))},${f(-r * Math.sin(t))}`;
    out += `<path class="gl-rose-wedge${colour !== undefined ? ` g${colour}` : ''}" d="M${pt(ri, a0)}L${pt(ro, a0)}A${f(ro)},${f(ro)} 0 0 0 ${pt(ro, a1)}L${pt(ri, a1)}A${f(ri)},${f(ri)} 0 0 1 ${pt(ri, a0)}Z"/>`;
    const {s} = parseCorner(k), m = (a0 + a1) / 2, rm = (ri + ro) / 2;
    out += `<text class="gl-rose-letter" x="${f(rm * Math.cos(m))}" y="${f(-rm * Math.sin(m) + .1)}">${s}</text>`;
  });
  out += `<circle class="gl-rose-point" cx="0" cy="0" r=".07"/>`;
  const label = `Corners round one point, in order: ${cycle.map(k => { const {s, c} = parseCorner(k); return `${s} ${CORNER_WORDS[c].replace(' corner', '')}`; }).join(', ')}`;
  return `<svg class="gl-rose" style="--r:${60 + 45 * rings}px" viewBox="${f(-R)} ${f(-R)} ${f(2 * R)} ${f(2 * R)}" role="img" aria-label="${esc(label)}">${out}</svg>`;
}

// --- Playground: rendering ------------------------------------------------------------
export const playStart = (q, b) => b.start ? {s: b.start.s, x: Q(2 * b.start.i + 1, 2), y: Q(2 * b.start.j + 1, 2)} : null;
function renderPlay(p, a) {
  const q = p.parameters, b = a.board, S = playS(q, b), dir = q.dirs[b.dir], from = playStart(q, b);
  const t = from ? tripOf(S, from, dir) : null;
  let over = '';
  if (t) {
    over += roomPieces(S, t.pieces, 'gl-trail t0');
    for (const s of S.ids) { const [x, y] = roomXY(S, s, from.x, from.y); over += `<circle class="gl-dot" cx="${f(x)}" cy="${f(y)}" r=".22"/>`; }
    const xy = roomXY(S, from.s, from.x, from.y);
    over += `<circle class="gl-start t0" cx="${f(xy[0])}" cy="${f(xy[1])}" r=".32"/>` + arrowHead(xy, dir, .45, 'gl-tip t0', .38);
  }
  const room = roomBoard(S, {cls: 'gl-room gl-play-room', label: playSurface(q, b).name, pad: .5 * S.n / 2, over, point: pt => ({act: true, label: `${pt.s}, small square ${pt.i + 1} across, ${pt.j + 1} up. Start here`, cls: b.start && pt.s === b.start.s && pt.i === b.start.i && pt.j === b.start.j ? 'chosen' : ''})});
  const surfaces = `<div class="gl-picks" role="group" aria-label="Surface">${Object.entries(q.surfaces).map(([id, sf]) => `<button type="button" class="secondary gl-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'surface', id}))}" data-focus="gl-surface-${id}" aria-pressed="${b.surface === id}" aria-label="${esc(sf.name)}">${roomBoard(fixedSurface(sf), {cls: 'gl-mini', picture: true, label: sf.name, pad: .3})}</button>`).join('')}</div>`;
  const dirs = `<div class="gl-dirs" role="group" aria-label="Direction">${q.dirs.map((d, k) => `<button type="button" class="secondary gl-dir" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'dir', k}))}" data-focus="gl-dir-${k}" aria-pressed="${b.dir === k}" aria-label="${esc(dirWords(d))}">${arrowIcon(d, 30)}</button>`).join('')}</div>`;
  const stripHtml = t ? strip(S, p, 0, from, dir, t, {label: 'Unrolled trip', letterAt: [.12, .88]}) : '';
  const status = t ? (t.home ? `Home after ${t.home} ${t.home === 1 ? 'block' : 'blocks'}.` : t.stop === 'corner' ? 'The trip reaches a corner.' : 'The trip stops.') : '';
  return `<div class="gl-puzzle mode-play" data-mechanic-wire="glued"><div class="gl-play-bar">${surfaces}${dirs}</div><div class="gl-stage play"><div class="gl-room-view">${room}</div><div class="gl-trips">${stripHtml}</div></div><p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function render(p, a) {
  const mode = p.parameters.mode;
  return mode === 'glue' ? renderGlue(p, a) : mode === 'corners' ? renderCorners(p, a) : renderPlay(p, a);
}

// --- Taps and keys ----------------------------------------------------------------
function wire(root, p, api) {
  const q = p.parameters;
  wirePortal(root, {
    point: (where, at) => {
      const b = api.attempt().board;
      if (solved(p, b)) return null;
      const [kind, ...rest] = at.split(','), v = view(p);
      if (q.mode === 'playground') {
        if (kind === 'side' || kind === 'dot' || kind === 'corner') return null;
        const [s, i, j] = at.split(',');
        return {type: 'start', s, i: Number(i), j: Number(j)};
      }
      if (q.mode === 'glue' && kind === 'side' && !v.claiming) {
        const [s, side] = rest, here = {s, side}, chosen = v.side;
        if (chosen && chosen.s === s && chosen.side === side) { api.ui({side: null}); return null; }
        const action = pairAction(chosen, here);
        if (action && b[action.side][action.from] !== action.to) { v.side = null; return action; }
        api.ui({side: here});
        return null;
      }
      if (q.mode === 'glue' && kind === 'dot' && v.claiming) {
        // Tapping a ringed dot takes it back, with the dots tapped after it.
        const [s] = rest, at = v.picked.indexOf(s), picked = at >= 0 ? v.picked.slice(0, at) : [...v.picked, s];
        if (picked.length === ids(q).length) { v.claiming = false; v.picked = []; return {type: 'cant', dots: picked}; }
        api.ui({picked});
        return null;
      }
      if (q.mode === 'corners' && kind === 'corner') {
        const k = rest.join(','), chosen = v.corner;
        if (chosen === k) { api.ui({corner: null}); return null; }
        const S = fixedSurface(q), g = groupsOf(S, b.links);
        if (chosen && isMatch(S, chosen, k) && g.root.get(chosen) !== g.root.get(k)) { v.corner = k; return {type: 'link', a: chosen, b: k}; }
        api.ui({corner: k});
        return null;
      }
      return null;
    }
  }, api.apply);
}

// Can't is a view switch (mechanic-ui): it opens the dots, and the claim is
// the move made when the last dot is tapped, with the dots in the order tapped.
export const gluedMechanics = {
  glued: {
    fresh, valid, solved, move, hint, render, wire,
    ui: setView,
    reset: p => { views.delete(p.id); },
    // Undo takes back gluings and joins, never a refused claim: a wrong Can't
    // or That's all stays refused until something new is glued or joined.
    carry(p, from, to) {
      const q = p.parameters;
      if (!object(from) || !object(to)) return to;
      if (q.mode === 'glue' && from.told === 'way' && !to.claimed) return {...to, told: 'way'};
      if (q.mode === 'corners' && from.told === 'more' && !to.done) return {...to, told: 'more'};
      return to;
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'glued',
  family: {id: 'glued', symbol: '⊞'},
  mechanics: gluedMechanics,
  pack: new URL('./glued.json', import.meta.url).href,
  css: new URL('./glued.css', import.meta.url).href,
  focus: '.gl-side-hit,.gl-corner-hit,.gl-dot-hit,.gl-dir'
};
