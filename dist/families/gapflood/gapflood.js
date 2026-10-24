// Meeting roads: gaps (worksheet Week 69, thin and fat road triangles). Three
// homes A, B and C sit on dots of a road map, every road one step. A road
// triangle is one chosen shortest route for each pair: AB, BC and CA. A dot on
// one route has a gap: the fewest steps from it, along any roads, to one of the
// other two routes. A dot on two routes has gap 0.
//
// The child draws the three routes (the app takes only steps that keep a route
// shortest), then taps a dot to flood its gap: the flood spreads one step at a
// time over every road until it meets another route. Puzzles ask for every gap
// 0, a gap of at least k (or Can't), or the biggest gap the homes allow (Best).
//
// On a tree the routes are forced and form a tripod, so every gap is 0. On a
// ladder every route crosses each column between its homes, two routes cross
// every column and a column is one rung, so no gap passes 1. On the grid the
// corner triangle of side n has gap n, so gaps grow without bound; and since a
// dot's other two routes hold all three homes, no gap passes the farthest any
// dot is from its nearest home. Those are the certificates shown for Can't and
// Best. These are thin triangles (Gromov hyperbolicity) at the scale of dots.
import {esc} from '../../expansion-controls.js';
import {graphBoard, wireGraph, edgeGeometry, NODE_R} from '../../graph-board.js';
import {mapOf, roadOf, idsOf, neighbours, distances as meetingDistances, stepWords as meetingStepWords} from '../meeting/meeting.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const SIDES = ['AB', 'BC', 'CA'];
export const ENDS = {AB: ['A', 'B'], BC: ['B', 'C'], CA: ['C', 'A']};
export const GOALS = ['zero', 'reach', 'best'];
const startOf = (q, s) => q.homes[ENDS[s][0]];
const endOf = (q, s) => q.homes[ENDS[s][1]];
const isId = (q, id) => typeof id === 'string' && Object.hasOwn(q.nodes, id);
// Meeting roads' distance table, remembered for each map's list of roads.
const tables = new WeakMap();
export function distances(q) {
  if (!tables.has(q.roads)) tables.set(q.roads, meetingDistances(q));
  return tables.get(q.roads);
}

// --- Routes and gaps ----------------------------------------------------------
// A route is the list of dots from its first home; every step brings it one
// step nearer its second home, so it is always part of a shortest route.
export function isRoute(q, s, r) {
  if (!Array.isArray(r) || !r.length || r[0] !== startOf(q, s) || !r.every(id => isId(q, id))) return false;
  const D = distances(q), end = endOf(q, s), d = D[r[0]][end];
  return r.every((id, k) => D[id][end] === d - k && (k === 0 || roadOf(q, r[k - 1], id) >= 0));
}
export const done = (q, s, r) => r.at(-1) === endOf(q, s);
export const complete = (q, routes) => SIDES.every(s => done(q, s, routes[s]));
// The dots a step may go to next: along a road, one step nearer the end.
export function nextSteps(q, s, r) {
  if (done(q, s, r)) return [];
  const D = distances(q), end = endOf(q, s), at = r.at(-1);
  return neighbours(q, at).filter(v => D[v][end] === D[at][end] - 1);
}
// The routes each dot lies on.
export function sidesAt(routes) {
  const at = new Map();
  for (const s of SIDES) for (const id of routes[s]) { if (!at.has(id)) at.set(id, []); if (!at.get(id).includes(s)) at.get(id).push(s); }
  return at;
}
// A dot's gap: 0 on two routes, otherwise the fewest steps along any road to
// a dot of another route. null off the routes.
export function gapAt(q, routes, u) {
  const on = sidesAt(routes).get(u);
  if (!on) return null;
  if (on.length > 1) return 0;
  const D = distances(q);
  return Math.min(...SIDES.filter(s => s !== on[0]).flatMap(s => routes[s].map(v => D[u][v])));
}
// The flood from u: every dot nearer than its gap, by steps, and the dots of
// other routes where it arrives.
export function floodOf(q, routes, u) {
  const gap = gapAt(q, routes, u);
  if (gap === null) return null;
  const D = distances(q), on = sidesAt(routes), mine = on.get(u);
  const lit = idsOf(q).filter(v => D[u][v] < gap);
  const arrive = idsOf(q).filter(v => D[u][v] === gap && on.has(v) && (gap === 0 ? v === u : on.get(v).some(s => !mine.includes(s))));
  return {gap, lit, arrive, step: Object.fromEntries(idsOf(q).map(v => [v, D[u][v]]))};
}
// The biggest gap of a triangle, and the dots that have it.
export function thinness(q, routes) {
  let gap = 0, at = [];
  for (const u of idsOf(q)) {
    const g = gapAt(q, routes, u);
    if (g === null) continue;
    if (g > gap) { gap = g; at = [u]; } else if (g === gap) at.push(u);
  }
  return {gap, at};
}
// Every shortest route for a side (in the order of the map's roads).
const routeCache = new Map();
export function allRoutes(q, s) {
  const key = JSON.stringify([q.roads, startOf(q, s), endOf(q, s)]);
  if (routeCache.has(key)) return routeCache.get(key);
  const out = [];
  (function go(r) { if (done(q, s, r)) { out.push(r); return; } for (const v of nextSteps(q, s, r)) go([...r, v]); })([startOf(q, s)]);
  routeCache.set(key, out);
  return out;
}
// Every road triangle of the homes, with its biggest gap. Each route's
// distance from every dot is worked out once, so a dot's gap is the nearer of
// its other two routes' distances (0 when it is on one of them). Dots are
// numbered so the 12,348 triangles of the 6 × 6 puzzle stay quick.
const triangleCache = new Map();
export function triangles(q) {
  const key = JSON.stringify([q.roads, q.homes]);
  if (triangleCache.has(key)) return triangleCache.get(key);
  const D = distances(q), all = idsOf(q), index = new Map(all.map((u, n) => [u, n])), out = [];
  const R = SIDES.map(s => allRoutes(q, s)), I = R.map(list => list.map(r => r.map(u => index.get(u))));
  const N = R.map(list => list.map(r => Int32Array.from(all, u => Math.min(...r.map(v => D[u][v])))));
  const gapOf = (a, b, c) => {
    let gap = 0;
    for (const [route, x, y] of [[I[0][a], N[1][b], N[2][c]], [I[1][b], N[2][c], N[0][a]], [I[2][c], N[0][a], N[1][b]]]) {
      for (const u of route) { const g = x[u] < y[u] ? x[u] : y[u]; if (g > gap) gap = g; }
    }
    return gap;
  };
  for (let a = 0; a < R[0].length; a++) for (let b = 0; b < R[1].length; b++) for (let c = 0; c < R[2].length; c++) {
    out.push({routes: {AB: R[0][a], BC: R[1][b], CA: R[2][c]}, gap: gapOf(a, b, c)});
  }
  triangleCache.set(key, out);
  return out;
}
// The biggest gap any triangle of these homes has.
export const bestOf = q => Math.max(...triangles(q).map(t => t.gap));
// The farthest any dot is from its nearest home. A dot's other two routes hold
// all three homes, so no gap is bigger than this.
export function homeSteps(q) {
  const D = distances(q), H = Object.values(q.homes);
  return Object.fromEntries(idsOf(q).map(v => [v, Math.min(...H.map(h => D[h][v]))]));
}
export const coverOf = q => Math.max(...Object.values(homeSteps(q)));
// A ladder's columns between its homes, each with the routes that must cross
// it: a shortest route crosses every column between its homes and no other.
export function columnSides(q) {
  const col = id => q.columns[id], span = s => [col(startOf(q, s)), col(endOf(q, s))].sort((a, b) => a - b);
  const cols = [...new Set(Object.values(q.columns))].sort((a, b) => a - b);
  return cols.map(x => ({x, sides: SIDES.filter(s => { const [lo, hi] = span(s); return lo <= x && x <= hi; })})).filter(c => c.sides.length);
}
// The dots on all three routes: the centre of a tripod.
export const centreOf = routes => [...sidesAt(routes)].filter(([, on]) => on.length === 3).map(([id]) => id);
// Is every gap 0? (On these maps, exactly when every road is on two routes.)
export const allZero = (q, routes) => complete(q, routes) && thinness(q, routes).gap === 0;
// The certificate for a right Can't or Best, from the map.
export const certOf = q => q.goal === 'best' ? 'rings' : q.kind === 'tree' ? 'tripod' : q.kind === 'ladder' ? 'columns' : 'rings';
// Can the goal be reached? Only "a gap of k" can fail.
export const possible = q => q.goal !== 'reach' || q.k <= bestOf(q);
// On a tree the child backs a Can't by tapping the forced tripod's centre.
export const centreClaim = q => q.goal === 'reach' && q.kind === 'tree';
export const forcedCentre = q => centreOf(Object.fromEntries(SIDES.map(s => [s, allRoutes(q, s)[0]])))[0];
// The dots where some triangle of these homes reaches the biggest gap.
export const fatDots = q => [...new Set(goodTriangles(q).flatMap(t => t.dots))];
// Can't is a claim about the child's own road triangle, so it opens once all
// three routes are drawn (on the tree they are forced, so the tripod is then
// on the board, not hunted for); and a refused Can't ("It can be done." or a
// tap that missed the centre) waits until a route changes, through floods
// and Undo too.
export const claimOpen = (q, b) => q.goal === 'reach' && complete(q, b.routes) && b.told !== 'can' && b.told !== 'miss';

// --- Boards -------------------------------------------------------------------
// {routes: {AB, BC, CA}, flood, told, done}. `flood` is the dot flooded (only
// on a finished triangle); `told` answers a Can't that can be done ('can', kept
// until a route changes), a Best that can be beaten ('bigger', kept until a
// new flood) or a tap on a tree that is not where all three routes meet
// ('miss', kept until a route changes); `done` is a right Can't or Best.
// Saves from before Can't waited for the triangle may hold a Can't answer on
// an unfinished one; they still load.
function fresh(p) {
  const q = p.parameters;
  return {routes: Object.fromEntries(SIDES.map(s => [s, [startOf(q, s)]])), flood: null, told: null, done: false};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b) || Object.keys(b).sort().join() !== 'done,flood,routes,told' || typeof b.done !== 'boolean') return false;
  if (!object(b.routes) || Object.keys(b.routes).sort().join() !== 'AB,BC,CA' || !SIDES.every(s => isRoute(q, s, b.routes[s]))) return false;
  if (b.flood !== null && (!complete(q, b.routes) || !isId(q, b.flood) || gapAt(q, b.routes, b.flood) === null)) return false;
  const gap = b.flood === null ? null : gapAt(q, b.routes, b.flood);
  if (b.told === 'can') { if (q.goal !== 'reach' || !possible(q) || b.done) return false; }
  else if (b.told === 'bigger') { if (q.goal !== 'best' || gap === null || gap >= bestOf(q) || b.done) return false; }
  else if (b.told === 'miss') { if (!centreClaim(q) || possible(q) || b.done) return false; }
  else if (b.told !== null) return false;
  if (b.done) {
    if (q.goal === 'zero' || (q.goal === 'reach' && possible(q))) return false;
    if (q.goal === 'best' && gap !== bestOf(q)) return false;
  }
  return true;
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return false;
  if (q.goal === 'zero') return allZero(q, b.routes);
  if (q.goal === 'reach') return b.done || (b.flood !== null && gapAt(q, b.routes, b.flood) >= q.k);
  return b.done;
}

// --- The chosen route (view state, outside the save) ---------------------------
const uiState = new Map();
// Nothing chosen at first: taps draw the first unfinished route, so a puzzle
// reopened with its triangle finished floods at once. `claiming` is a pressed
// Can't on a tree, waiting for the tap on the centre.
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {pen: null, claiming: false}); return uiState.get(p.id); }
// The route taps draw: the chosen one, or the first unfinished one; none (taps
// flood) once all three are finished and none is chosen.
export function penOf(q, b, pen) {
  if (SIDES.includes(pen)) return pen;
  return SIDES.find(s => !done(q, s, b.routes[s])) || null;
}
const after = (q, routes, s) => { const k = SIDES.indexOf(s); return [1, 2].map(i => SIDES[(k + i) % 3]).find(t => !done(q, t, routes[t])) || null; };

function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const changed = routes => ({routes, flood: null, told: null, done: false});
  let next = null, pen;
  if ((action.type === 'draw' || action.type === 'cut') && SIDES.includes(action.side) && isId(q, action.to)) {
    const s = action.side, r = b.routes[s];
    if (action.type === 'draw' && nextSteps(q, s, r).includes(action.to)) {
      next = changed({...b.routes, [s]: [...r, action.to]});
      pen = done(q, s, next.routes[s]) ? after(q, next.routes, s) : s;
    } else if (action.type === 'cut') {
      const k = r.indexOf(action.to);
      if (k >= 0 && k < r.length - 1) { next = changed({...b.routes, [s]: r.slice(0, k + 1)}); pen = s; }
    }
  } else if (action.type === 'flood' && complete(q, b.routes) && isId(q, action.at) && action.at !== b.flood && gapAt(q, b.routes, action.at) !== null) {
    next = {...b, flood: action.at, told: b.told === 'can' || b.told === 'miss' ? b.told : null};
    pen = null;
  } else if (action.type === 'cant' && claimOpen(q, b) && (centreClaim(q) ? isId(q, action.at) : action.at === undefined)) {
    next = possible(q) ? {...b, told: 'can'} : !centreClaim(q) || action.at === forcedCentre(q) ? {...b, told: null, done: true} : {...b, told: 'miss'};
    // A tap that missed the centre lets go of Can't, which waits for a change.
    ui(p).claiming = false;
  } else if (action.type === 'best' && q.goal === 'best' && b.flood !== null && b.told !== 'bigger') {
    next = gapAt(q, b.routes, b.flood) === bestOf(q) ? {...b, done: true} : {...b, told: 'bigger'};
  }
  if (next && pen !== undefined) ui(p).pen = pen;
  if (next && (action.type === 'draw' || action.type === 'cut')) ui(p).claiming = false;
  return next;
}

// --- Taps and keys ----------------------------------------------------------------
// A tap on a dot: the next step of the chosen route, or taking it back to a
// dot already on it; otherwise, on a finished triangle, a flood.
export function dotAction(q, b, pen, id) {
  const s = penOf(q, b, pen);
  if (s) {
    const r = b.routes[s];
    if (nextSteps(q, s, r).includes(id)) return {type: 'draw', side: s, to: id};
    const k = r.indexOf(id);
    if (k >= 0 && k < r.length - 1) return {type: 'cut', side: s, to: id};
    if (id === r.at(-1)) return null;
  }
  if (complete(q, b.routes) && id !== b.flood && gapAt(q, b.routes, id) !== null) return {type: 'flood', at: id};
  return null;
}
// A tap on a road: a step along it from the chosen route's end, or back
// along its last road.
export function roadAction(q, b, pen, i) {
  const s = penOf(q, b, pen);
  if (!s || !q.roads[i]) return null;
  const [u, v] = q.roads[i], r = b.routes[s], end = r.at(-1);
  if (end !== u && end !== v) return null;
  const other = end === u ? v : u;
  if (nextSteps(q, s, r).includes(other)) return {type: 'draw', side: s, to: other};
  return r.at(-2) === other ? {type: 'cut', side: s, to: other} : null;
}
// Arrow keys: along the road that points most nearly that way.
const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
export function arrowAction(q, b, pen, key) {
  const dir = ARROWS[key], s = penOf(q, b, pen);
  if (!dir || !s) return null;
  const g = mapOf(q), end = b.routes[s].at(-1), [x1, y1] = g.pos[end];
  let best = null, score = 0.65;
  for (const v of neighbours(q, end)) {
    const [x2, y2] = g.pos[v], len = Math.hypot(x2 - x1, y2 - y1), dot = ((x2 - x1) * dir[0] + (y2 - y1) * dir[1]) / len;
    if (dot > score) { best = v; score = dot; }
  }
  if (!best) return null;
  const action = dotAction(q, b, s, best);
  return action && action.type !== 'flood' ? action : null;
}

// --- Hints ----------------------------------------------------------------------
// The triangles that reach the goal, each with the dots to flood.
const goodCache = new Map();
export function goodTriangles(q) {
  const key = JSON.stringify([q.roads, q.homes, q.goal, q.k]);
  if (goodCache.has(key)) return goodCache.get(key);
  const best = bestOf(q);
  const out = triangles(q).flatMap(t => {
    if (q.goal === 'zero') return t.gap === 0 ? [{...t, dots: []}] : [];
    const need = q.goal === 'best' ? best : q.k;
    if (t.gap < need) return [];
    const dots = idsOf(q).filter(u => { const g = gapAt(q, t.routes, u); return g !== null && g >= need; });
    return [{...t, dots}];
  });
  goodCache.set(key, out);
  return out;
}
const sharedStart = (r, t) => { let k = 0; while (k < r.length && k < t.length && r[k] === t[k]) k++; return k; };
// The good triangle (or, where none is, any triangle) that keeps most of the
// child's routes.
function nearest(q, b, list) {
  let top = null;
  for (const t of list) {
    const kept = SIDES.reduce((n, s) => n + sharedStart(b.routes[s], t.routes[s]), 0);
    const cuts = SIDES.filter(s => sharedStart(b.routes[s], t.routes[s]) < b.routes[s].length).length;
    if (!top || kept > top.kept || (kept === top.kept && cuts < top.cuts)) top = {t, kept, cuts};
  }
  return top.t;
}
const nameOf = (q, id) => q.names?.[id] || id;
export function stepWords(q, from, to) {
  return q.kind === 'ring' ? `to ${nameOf(q, to)}` : meetingStepWords(q, from, to);
}
function hint(p, b) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b)) return {type: 'done'};
  // Where Can't is right, first a triangle (Can't waits for one), then the
  // reason with the press. After a refused Can't the triangle must change
  // first: the last route takes a step back, and the next hint draws it again.
  if (!possible(q) && claimOpen(q, b)) {
    if (centreClaim(q)) return {type: 'move', action: {type: 'cant', at: forcedCentre(q)}, text: 'On a tree each pair of homes has only one route, and the three routes share every road. Press Can’t and tap where all three meet.'};
    if (certOf(q) === 'columns') return {type: 'move', action: {type: 'cant'}, text: `Two routes cross every column, and a column is one rung, so no gap can be ${q.k}. Press Can’t.`};
    return {type: 'move', action: {type: 'cant'}, text: 'Press Can’t.'};
  }
  if (!possible(q) && complete(q, b.routes)) {
    const s = SIDES.at(-1), r = b.routes[s];
    return {type: 'move', action: {type: 'cut', side: s, to: r.at(-2)}, text: `Take ${s} back one step.`};
  }
  const t = nearest(q, b, possible(q) ? goodTriangles(q) : triangles(q));
  for (const s of SIDES) {
    const r = b.routes[s], k = sharedStart(r, t.routes[s]);
    if (k < r.length) {
      const to = r[k - 1], back = r.length - k;
      return {type: 'move', action: {type: 'cut', side: s, to}, text: k === 1 ? `Take ${s} back to ${ENDS[s][0]}.` : `Take ${s} back ${back === 1 ? 'one step' : `${back} steps`}.`};
    }
  }
  for (const s of SIDES) {
    const r = b.routes[s], route = t.routes[s];
    if (r.length < route.length) return {type: 'move', action: {type: 'draw', side: s, to: route[r.length]}, text: `Draw ${s} ${stepWords(q, r.at(-1), route[r.length])}.`};
  }
  const dots = t.dots || [];
  if (q.goal === 'best' && dots.includes(b.flood)) return {type: 'move', action: {type: 'best'}, text: 'Press Best.'};
  const at = dots.find(u => u !== b.flood) ?? dots[0];
  if (at === undefined) return {type: 'done'};
  return {type: 'move', action: {type: 'flood', at}, text: `Flood the dot at ${nameOf(q, at)}.`};
}

// --- Drawing ----------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
// Each route along its roads, in its colour; routes sharing a road side by side.
function trails(g, q, routes) {
  const users = q.roads.map(() => []);
  for (const s of SIDES) { const r = routes[s]; for (let k = 1; k < r.length; k++) { const i = roadOf(q, r[k - 1], r[k]); if (!users[i].includes(s)) users[i].push(s); } }
  return g.edges.map(e => {
    const list = SIDES.filter(s => users[e.i].includes(s)), {n} = edgeGeometry(g, e), [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v];
    return list.map((s, k) => {
      const off = (k - (list.length - 1) / 2) * 2.1 * g.k;
      return `<line class="gp-trail t${s}" x1="${f(x1 + n[0] * off)}" y1="${f(y1 + n[1] * off)}" x2="${f(x2 + n[0] * off)}" y2="${f(y2 + n[1] * off)}"/>`;
    }).join('');
  }).join('');
}
// The flood's roads: each from a dot one step nearer the flooded dot.
function floodRoads(g, q, fl, cls) {
  return g.edges.map(e => {
    const a = fl.step[e.u], c = fl.step[e.v], near = Math.min(a, c), far = Math.max(a, c), to = a < c ? e.v : e.u;
    if (far !== near + 1 || near >= fl.gap || (far === fl.gap && !fl.arrive.includes(to))) return '';
    const [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v];
    return `<line class="${cls} d${Math.min(near, 7)}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
  }).join('');
}
function glowRoutes(g, q, routes) {
  const used = new Set();
  for (const s of SIDES) { const r = routes[s]; for (let k = 1; k < r.length; k++) used.add(roadOf(q, r[k - 1], r[k])); }
  return g.edges.filter(e => used.has(e.i)).map(e => { const [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v]; return `<line class="gp-glow" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`; }).join('');
}
// A ladder's columns, each ringed once for every route that must cross it.
function columnRings(g, q) {
  const r0 = (NODE_R + 0.7) * g.k, step = 1.15 * g.k;
  return columnSides(q).map(({x, sides}) => {
    const ids = Object.keys(q.columns).filter(id => q.columns[id] === x), ys = ids.map(id => g.pos[id][1]), cx = g.pos[ids[0]][0];
    return sides.map((s, k) => {
      const r = r0 + k * step, top = Math.min(...ys) - r, h = Math.max(...ys) - Math.min(...ys) + 2 * r;
      return `<rect class="gp-column t${s}" x="${f(cx - r)}" y="${f(top)}" width="${f(2 * r)}" height="${f(h)}" rx="${f(r)}"/>`;
    }).join('');
  }).join('');
}
function routeWords(q, b) {
  return SIDES.map(s => { const r = b.routes[s]; return done(q, s, r) ? `${s} drawn` : r.length === 1 ? `${s} not started` : `${s} at ${nameOf(q, r.at(-1))}, ${r.length - 1} ${r.length === 2 ? 'step' : 'steps'}`; }).join('; ');
}

function render(p, a) {
  const q = p.parameters, b = a.board, g = mapOf(q), solvedNow = solved(p, b);
  const cert = solvedNow ? (q.goal === 'zero' ? 'tripod' : b.done ? certOf(q) : null) : null;
  // A right Can't on a tree shows the one triangle its homes have.
  const routes = cert === 'tripod' && !complete(q, b.routes) ? Object.fromEntries(SIDES.map(s => [s, allRoutes(q, s)[0]])) : b.routes;
  const open = !solvedNow && claimOpen(q, b), claiming = open && centreClaim(q) && ui(p).claiming;
  const pen = solvedNow || claiming ? null : penOf(q, b, ui(p).pen);
  const hinted = a.hintLevel >= 2 && !solvedNow ? hint(p, b) : null, act = hinted?.type === 'move' ? hinted.action : null;
  // Best's certificate replaces the flood: each dot's steps to its nearest home.
  const on = sidesAt(routes), fl = b.flood !== null && cert !== 'rings' ? floodOf(q, routes, b.flood) : null;
  // Ochre rings only where the biggest gap can be made, not on every dot that far from a home.
  const rings = cert === 'rings' ? homeSteps(q) : null, far = rings ? coverOf(q) : null, fat = rings ? fatDots(q) : [];
  const centre = cert === 'tripod' ? centreOf(routes) : [];
  const steps = pen ? nextSteps(q, pen, b.routes[pen]) : [];
  const homeOf = id => ['A', 'B', 'C'].find(x => q.homes[x] === id);
  const node = id => {
    const x = homeOf(id), sides = on.get(id) || [], action = solvedNow ? null : claiming ? {type: 'cant', at: id} : dotAction(q, b, pen, id);
    const own = pen && b.routes[pen].at(-1) === id && !solvedNow;
    const lit = fl && fl.step[id] < fl.gap, step = fl ? Math.min(fl.step[id], 7) : 0;
    const cls = [x ? 'home' : '', own ? `pen t${pen}` : '', steps.includes(id) && !solvedNow ? 'can-go' : '', lit ? `lit d${step}` : '', fl?.arrive.includes(id) && fl.gap > 0 ? 'meet' : '', id === b.flood ? 'source' : '',
      rings ? `lit d${Math.min(rings[id], 7)}` : '', fat.includes(id) ? 'far' : '', centre.includes(id) ? 'centre' : '',
      (act?.type === 'draw' || act?.type === 'cut') && act.to === id ? 'hinted' : '', (act?.type === 'flood' || act?.type === 'cant') && act.at === id ? 'hinted' : ''].filter(Boolean).join(' ');
    const doing = !action ? '' : action.type === 'draw' ? `. Draw ${action.side} here` : action.type === 'cut' ? `. Take ${action.side} back to here` : action.type === 'cant' ? '. All three routes meet here' : '. Flood it';
    const label = `${nameOf(q, id)}${x ? `, home ${x}` : ''}${sides.length ? `, on ${listWords(sides)}` : ''}${fl && id === b.flood ? `, gap ${fl.gap}` : ''}${doing}`;
    const text = x || (rings ? String(rings[id]) : '');
    return {cls, text, act: Boolean(action) || Boolean(own), label: `${label}${own ? `. End of ${pen}` : ''}${rings && !x ? `, ${rings[id]} ${rings[id] === 1 ? 'step' : 'steps'} from a home` : ''}`, badge: fl && id === b.flood ? String(fl.gap) : ''};
  };
  const edge = i => {
    const action = solvedNow || claiming ? null : roadAction(q, b, pen, i), [u, v] = q.roads[i];
    const mark = (act?.type === 'draw' || act?.type === 'cut') && act.side === pen && roadOf(q, b.routes[pen].at(-1), act.to) === i;
    return {cls: mark ? 'hinted' : '', act: Boolean(action), label: `Road from ${nameOf(q, u)} to ${nameOf(q, v)}${action ? `. ${action.type === 'draw' ? 'Draw' : 'Take'} ${action.side} ${action.type === 'draw' ? 'along it' : 'back'}` : ''}`};
  };
  const under = (fl && fl.gap > 0 ? floodRoads(g, q, fl, 'gp-flood') : '') + (cert === 'tripod' ? glowRoutes(g, q, routes) : '') + (cert === 'columns' ? columnRings(g, q) : '');
  const board = graphBoard(g, {cls: `gp-map ${q.kind}${q.small ? ' small' : ''}${claiming ? ' claiming' : ''}`, label: 'Map of roads', slide: Boolean(pen), node, edge, under, over: trails(g, q, routes)});
  const hintSide = (act?.type === 'draw' || act?.type === 'cut') && act.side !== pen ? act.side : null;
  const chips = SIDES.map(s => `<button type="button" class="gp-chip t${s}${s === hintSide ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({pen: s})}' data-focus="gp-chip-${s}" aria-pressed="${s === pen}" aria-label="Route ${s}">${s}</button>`).join('');
  const claim = centreClaim(q) ? `<button type="button" class="secondary gp-button${act?.type === 'cant' && !claiming ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({claiming: !claiming})}' data-focus="gp-cant" aria-pressed="${claiming}"${open ? '' : ' disabled'}>Can’t</button>`
    : q.goal === 'reach' ? button('Can’t', {type: 'cant'}, open, act?.type === 'cant')
    : q.goal === 'best' ? button('Best', {type: 'best'}, b.flood !== null && b.told !== 'bigger', act?.type === 'best') : '';
  const top = solvedNow ? '' : `<div class="gp-bar"><div class="gp-chips" role="group" aria-label="Routes">${chips}</div>${claim}</div>`;
  const told = b.told === 'can' ? 'It can be done.' : b.told === 'bigger' ? 'A bigger gap is possible.'
    : b.told === 'miss' && !solvedNow ? 'The three routes don’t all meet there.' : claiming ? 'Tap where all three routes meet.'
    : cert === 'rings' ? `Every dot is within ${far} ${far === 1 ? 'step' : 'steps'} of A, B or C.` : cert === 'columns' ? 'Two routes cross every column.' : '';
  const gapNow = b.flood !== null ? gapAt(q, routes, b.flood) : null;
  const status = `${routeWords(q, {routes})}.${gapNow !== null ? ` Gap ${gapNow} at ${nameOf(q, b.flood)}.` : ''}${told ? ` ${told}` : ''}${pen ? ` ${pen} is chosen.` : ''}`;
  return `<div class="gp-puzzle${solvedNow ? ' solved' : ''}" data-mechanic-wire="gapflood">${top}${board}${told ? `<p class="gp-told">${esc(told)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const button = (label, action, enabled, hinted) => `<button type="button" class="secondary gp-button${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="gp-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;

// A press that becomes a slide draws; only a tap floods, so a slide that
// finishes the triangle and runs on does not flood every dot it crosses.
let pressing = false, listening = false;
const release = () => { pressing = false; };
function wire(root, p, api) {
  const now = () => { const b = api.attempt().board, q = p.parameters; return {b, q, pen: ui(p).pen, claiming: centreClaim(q) && ui(p).claiming && claimOpen(q, b)}; };
  root.addEventListener('pointerdown', () => { pressing = true; });
  if (!listening) { document.addEventListener('pointerup', release); document.addEventListener('pointercancel', release); listening = true; }
  wireGraph(root, {
    stroke: true,
    node: id => {
      const {b, q, pen, claiming} = now();
      if (solved(p, b)) return null;
      const action = claiming ? {type: 'cant', at: id} : dotAction(q, b, pen, id);
      return action && !(pressing && (action.type === 'flood' || action.type === 'cant')) ? action : null;
    },
    edge: i => { const {b, q, pen, claiming} = now(); return solved(p, b) || claiming ? null : roadAction(q, b, pen, i); }
  }, api.apply);
  root.addEventListener('keydown', e => {
    if (!ARROWS[e.key] || e.altKey || e.ctrlKey || e.metaKey) return;
    const {b, q, pen, claiming} = now();
    const action = solved(p, b) || claiming ? null : arrowAction(q, b, pen, e.key);
    if (!action) return;
    e.preventDefault();
    api.apply(action);
  });
}

export const gapMechanics = {
  gapflood: {
    fresh, valid, solved, move, hint, render, wire,
    // A tap on the chosen route lets go of it, so taps flood again. Can't on
    // a tree is pressed and let go the same way.
    ui(p, payload) {
      if (!object(payload)) return;
      if (typeof payload.claiming === 'boolean' && centreClaim(p.parameters)) { ui(p).claiming = payload.claiming; return; }
      if (!SIDES.includes(payload.pen)) return;
      ui(p).pen = ui(p).pen === payload.pen ? null : payload.pen;
      ui(p).claiming = false;
    },
    // Undo hands the pen back to the route it changed, or, when that route is
    // finished again or a flood or claim was taken back, to the first
    // unfinished route: a step taken back can be taken again with one tap.
    // It keeps a refused claim while what it answered is unchanged: a refused
    // Can't while the routes are the same, a refused Best while the flood is.
    // (A press of Undo then goes back past the claim to the move before it,
    // since the screen would not change.)
    carry(p, from, to) {
      const q = p.parameters, s = SIDES.find(t => from.routes[t].length !== to.routes[t].length);
      ui(p).pen = s && !done(q, s, to.routes[s]) ? s : null;
      ui(p).claiming = false;
      const same = JSON.stringify(from.routes) === JSON.stringify(to.routes);
      const keep = from.told === 'can' || from.told === 'miss' ? same : from.told === 'bigger' && same && from.flood === to.flood;
      return keep && !to.done ? {...to, told: from.told} : to;
    },
    reset: p => { uiState.delete(p.id); }
  }
};

// The family seam entry (dist/families.js): a group in Meeting roads.
export default {
  id: 'gapflood',
  mechanics: gapMechanics,
  pack: new URL('./gapflood.json', import.meta.url).href,
  css: new URL('./gapflood.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.gp-chip,.gp-button:not([disabled])'
};
