// Meeting roads (worksheet Week 67, meeting on shortest roads). Three homes A,
// B and C sit on dots of a road map, and every road is one step. A dot M is a
// meeting dot when each pair of homes has a shortest route through it:
// d(X, M) + d(M, Y) = d(X, Y) for the pairs AB, AC and BC. M may be a home.
//
// The app plays it with three walkers, one from each home. When all three
// stand on one dot, any two walks joined there make a route between their
// homes, and the dot works when all three joined routes are shortest. That is
// exactly the worksheet's test: three shortest walks to a meeting dot pass
// every pair, and if the walks of X and Y together are as short as d(X, Y),
// each walk is shortest and the dot lies on a shortest X–Y route.
//
// On a full grid there is exactly one meeting dot (the middle x with the
// middle y); on a tree exactly one (the centre of the three paths); on the
// cube of three-digit labels exactly one (the majority digit in each place).
// Other maps can have none (a triangle, a ring) or several (two crossroads),
// and closing one road can leave none. These are medians in median graphs.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, graphMini, wireGraph, edgeGeometry, pathThrough, NODE_R} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const WALKERS = ['A', 'B', 'C'];
export const PAIRS = [['A', 'B'], ['A', 'C'], ['B', 'C']];
export const MAX_WALK = 16;
export const MODES = ['meet', 'every', 'close', 'playground'];

// --- Maps and distances -------------------------------------------------------
// A map is {nodes: {id: [x%, y%]}, roads: [[u, v], …], aspect, labels?, names?}.
// `labels` are drawn inside the dots (the cube's digits); `names` are spoken.
export const mapOf = q => graphOf({nodes: q.nodes, edges: q.roads, aspect: q.aspect, scale: q.scale});
export const roadOf = (q, u, v) => q.roads.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));
export const idsOf = q => Object.keys(q.nodes);
const isId = (q, id) => typeof id === 'string' && Object.hasOwn(q.nodes, id);
// Neighbours along roads that are not closed.
export function neighbours(q, id, closed = []) {
  const out = [];
  q.roads.forEach(([a, b], i) => { if (closed.includes(i)) return; if (a === id) out.push(b); else if (b === id) out.push(a); });
  return out;
}
// Fewest steps from `from` to every dot, by breadth-first search.
const tables = new Map();
export function distances(q, closed = []) {
  const key = JSON.stringify([q.roads, [...closed].sort((x, y) => x - y)]);
  if (tables.has(key)) return tables.get(key);
  const table = {};
  for (const from of idsOf(q)) {
    const d = {[from]: 0}, queue = [from];
    for (let k = 0; k < queue.length; k++) for (const v of neighbours(q, queue[k], closed)) if (!Object.hasOwn(d, v)) { d[v] = d[queue[k]] + 1; queue.push(v); }
    table[from] = d;
  }
  tables.set(key, table);
  return table;
}
export const connected = (q, closed = []) => { const d = distances(q, closed)[idsOf(q)[0]]; return idsOf(q).every(id => Object.hasOwn(d, id)); };
// Does M lie on a shortest route between x and y?
export const between = (D, x, m, y) => D[x][m] + D[m][y] === D[x][y];
// Every meeting dot of the homes, in the map's dot order.
export function meetingDots(q, homes, closed = []) {
  const D = distances(q, closed);
  return idsOf(q).filter(m => PAIRS.every(([x, y]) => between(D, homes[x], m, homes[y])));
}
// One shortest route between two dots (the first found, in road order).
export function shortestRoute(q, from, to, closed = []) {
  const D = distances(q, closed), route = [from];
  while (route.at(-1) !== to) route.push(neighbours(q, route.at(-1), closed).find(v => D[v][to] === D[route.at(-1)][to] - 1));
  return route;
}

// --- Walks --------------------------------------------------------------------
// A walk is the list of dots a walker visits from its home. A step straight
// back along the road just taken is never part of a shortest walk, so it takes
// the last step back instead: walks never turn straight back.
export const stepsOf = walk => walk.length - 1;
export function isWalk(q, home, walk) {
  if (!Array.isArray(walk) || !walk.length || walk[0] !== home || stepsOf(walk) > MAX_WALK || !walk.every(id => isId(q, id))) return false;
  return walk.every((id, k) => k === 0 || (roadOf(q, walk[k - 1], id) >= 0 && (k < 2 || walk[k - 2] !== id)));
}
export const endsOf = walks => WALKERS.map(x => walks[x].at(-1));
// The dot where all three walkers stand, or null.
export const together = walks => { const [a, b, c] = endsOf(walks); return a === b && b === c ? a : null; };
// The pairs whose joined walks are longer than a shortest route between their homes.
export const tooLong = (q, homes, walks) => { const D = distances(q); return PAIRS.filter(([x, y]) => stepsOf(walks[x]) + stepsOf(walks[y]) !== D[homes[x]][homes[y]]); };
// All three on one dot, and every joined route shortest.
export const meets = (q, homes, walks) => together(walks) !== null && tooLong(q, homes, walks).length === 0;
// The pair to show when the walkers meet and a joined route is too long: one
// whose dot lies on no shortest route first, then one whose walks wander.
export function failing(q, homes, walks) {
  const m = together(walks), bad = m === null ? [] : tooLong(q, homes, walks), D = distances(q);
  return bad.find(([x, y]) => !between(D, homes[x], m, homes[y])) || bad[0] || null;
}
const homeWalks = homes => Object.fromEntries(WALKERS.map(x => [x, [homes[x]]]));
const validWalks = (q, homes, walks) => object(walks) && Object.keys(walks).sort().join() === 'A,B,C' && WALKERS.every(x => isWalk(q, homes[x], walks[x]));
const atHome = walks => WALKERS.every(x => walks[x].length === 1);

// --- Boards -------------------------------------------------------------------
// meet: {walks}                       every: {walks, found, told, done}
// close: {closed, claimed, refused}   playground: {map, homes, walks, found, told}
// `found` lists the meeting dots found, in order. `told` answers That's all
// ({kind: 'more'}, kept until a new dot is found) or a meeting at a dot found
// already ({kind: 'again', dot}, with the walkers sent home).
export const playMap = (q, b) => ({...q.maps[b.map], mode: 'playground', homes: b.homes});
const mapFor = (p, b) => p.parameters.mode === 'playground' ? playMap(p.parameters, b) : p.parameters;
const finding = q => q.mode === 'every' || q.mode === 'playground';

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') {
    const map = Object.keys(q.maps)[0], homes = {...q.maps[map].homes};
    return {map, homes, walks: homeWalks(homes), found: [], told: null};
  }
  if (q.mode === 'close') return {closed: [], claimed: false, refused: false};
  if (q.mode === 'every') return {walks: homeWalks(q.homes), found: [], told: null, done: false};
  return {walks: homeWalks(q.homes)};
}
const validHomes = (q, homes) => object(homes) && Object.keys(homes).sort().join() === 'A,B,C' && WALKERS.every(x => isId(q, homes[x])) && new Set(Object.values(homes)).size === 3;
function validFinding(q, b, answers) {
  if (!Array.isArray(b.found) || !b.found.every(id => answers.includes(id)) || new Set(b.found).size !== b.found.length) return false;
  // A meeting is kept the moment it happens, so the walkers never rest on one.
  if (meets(q, q.homes, b.walks)) return false;
  const t = b.told;
  if (t === null) return true;
  if (!object(t)) return false;
  if (t.kind === 'more') return q.mode === 'every' && Object.keys(t).length === 1 && b.found.length < answers.length && !b.done;
  if (t.kind === 'again') return Object.keys(t).sort().join() === 'dot,kind' && b.found.includes(t.dot) && atHome(b.walks);
  return false;
}
function validClose(q, b) {
  if (!object(b) || Object.keys(b).sort().join() !== 'claimed,closed,refused' || typeof b.claimed !== 'boolean' || typeof b.refused !== 'boolean') return false;
  if (!Array.isArray(b.closed) || b.closed.length > q.budget || !b.closed.every((i, k) => Number.isInteger(i) && i >= 0 && i < q.roads.length && (k === 0 || i > b.closed[k - 1]))) return false;
  if (!connected(q, b.closed) || (b.claimed && b.refused)) return false;
  const left = meetingDots(q, q.homes, b.closed).length;
  return (!b.claimed || left === 0) && (!b.refused || left > 0);
}
function valid(p, b) {
  const q0 = p.parameters;
  if (!object(b)) return false;
  if (q0.mode === 'close') return validClose(q0, b);
  if (q0.mode === 'playground') {
    if (Object.keys(b).sort().join() !== 'found,homes,map,told,walks' || typeof b.map !== 'string' || !Object.hasOwn(q0.maps, b.map)) return false;
    const q = playMap(q0, b);
    return validHomes(q, b.homes) && validWalks(q, b.homes, b.walks) && validFinding(q, b, meetingDots(q, b.homes));
  }
  if (!validWalks(q0, q0.homes, b.walks)) return false;
  if (q0.mode === 'meet') return Object.keys(b).join() === 'walks';
  if (Object.keys(b).sort().join() !== 'done,found,told,walks' || typeof b.done !== 'boolean') return false;
  const answers = meetingDots(q0, q0.homes);
  return validFinding(q0, b, answers) && (!b.done || (b.found.length === answers.length && b.told === null));
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'close') return b.claimed;
  if (q.mode === 'every') return b.done;
  return meets(q, q.homes, b.walks);
}

// A step for one walker: forward along a road, or straight back, which takes
// its last step back. A meeting that works is kept at once in the find-every
// puzzles and the playground, and the walkers go home.
function walk(q, b, action) {
  const x = action.walker;
  if (!WALKERS.includes(x) || !isId(q, action.to)) return null;
  const w = b.walks[x], end = w.at(-1);
  let next;
  if (action.type === 'back') {
    if (w.length < 2 || action.to !== w.at(-2)) return null;
    next = w.slice(0, -1);
  } else {
    if (roadOf(q, end, action.to) < 0 || action.to === w.at(-2) || stepsOf(w) >= MAX_WALK) return null;
    next = [...w, action.to];
  }
  const walks = {...b.walks, [x]: next};
  const told = b.told?.kind === 'more' ? b.told : null;
  if (!finding(q) || !meets(q, q.homes, walks)) return finding(q) ? {...b, walks, told} : {...b, walks};
  const m = together(walks), home = homeWalks(q.homes);
  return b.found.includes(m) ? {...b, walks: home, told: {kind: 'again', dot: m}} : {...b, walks: home, found: [...b.found, m], told: null};
}
function move(p, b, action) {
  const q0 = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  const q = mapFor(p, b);
  let next = null;
  if (q0.mode === 'close') {
    const i = action.road, ok = Number.isInteger(i) && i >= 0 && i < q.roads.length;
    if (action.type === 'close' && ok && !b.closed.includes(i) && b.closed.length < q.budget) {
      const closed = [...b.closed, i].sort((x, y) => x - y);
      next = connected(q, closed) ? {closed, claimed: false, refused: false} : null;
    } else if (action.type === 'open' && ok && b.closed.includes(i)) next = {closed: b.closed.filter(j => j !== i), claimed: false, refused: false};
    // An answer to these closures waits for a change.
    else if (action.type === 'claim' && !b.refused) next = meetingDots(q, q.homes, b.closed).length ? {...b, refused: true} : {...b, claimed: true};
  } else if (action.type === 'step' || action.type === 'back') next = walk(q, b, action);
  else if (action.type === 'all' && q0.mode === 'every' && b.told?.kind !== 'more') {
    next = b.found.length === meetingDots(q, q.homes).length ? {...b, told: null, done: true} : {...b, told: {kind: 'more'}};
  } else if (q0.mode === 'playground' && action.type === 'map') {
    if (typeof action.map === 'string' && Object.hasOwn(q0.maps, action.map) && action.map !== b.map) {
      const homes = {...q0.maps[action.map].homes};
      next = {map: action.map, homes, walks: homeWalks(homes), found: [], told: null};
    }
  } else if (q0.mode === 'playground' && action.type === 'home') {
    const x = action.walker;
    if (WALKERS.includes(x) && isId(q, action.to) && !Object.values(b.homes).includes(action.to)) {
      const homes = {...b.homes, [x]: action.to};
      next = {...b, homes, walks: homeWalks(homes), found: [], told: null};
    }
  }
  if (next && WALKERS.includes(action.walker)) ui(p).walker = action.walker;
  return next;
}

// --- Hints --------------------------------------------------------------------
// How far a walk is from being on its way to m: the steps to take back until
// what is left is a shortest walk that can go on to m by a shortest route.
function wasted(D, home, w, m) {
  let keep = 1;
  while (keep < w.length && D[home][w[keep]] === keep && between(D, home, w[keep], m)) keep++;
  return w.length - keep;
}
// The meeting dot to aim for: the one needing the fewest steps from here,
// counting steps taken back.
function target(q, b, aims) {
  const D = distances(q);
  let best = null;
  for (const m of aims) {
    const back = WALKERS.map(x => wasted(D, q.homes[x], b.walks[x], m));
    const cost = WALKERS.reduce((s, x, k) => s + back[k] + D[q.homes[x]][m] - (stepsOf(b.walks[x]) - back[k]), 0);
    if (!best || cost < best.cost) best = {m, back, cost};
  }
  return best;
}
// Words for a step: a direction on the drawn map, or the label of the dot.
const DIRECTIONS = ['right', 'down and right', 'down', 'down and left', 'left', 'up and left', 'up', 'up and right'];
export function stepWords(q, from, to) {
  if (q.labels?.[to]) return `to ${q.labels[to]}`;
  const g = mapOf(q), [x1, y1] = g.pos[from], [x2, y2] = g.pos[to];
  const turn = Math.round(Math.atan2(y2 - y1, x2 - x1) / (Math.PI / 4));
  return `one step ${DIRECTIONS[(turn + 8) % 8]}`;
}
const nameOf = (q, id) => q.names?.[id] || q.labels?.[id] || id;
function walkHint(p, b) {
  const q = mapFor(p, b), D = distances(q), answers = meetingDots(q, q.homes);
  const aims = q.mode === 'every' ? answers.filter(m => !b.found.includes(m)) : answers;
  if (!aims.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  const {m, back} = target(q, b, aims);
  const k = back.findIndex(n => n > 0);
  if (k >= 0) {
    const x = WALKERS[k], w = b.walks[x];
    return {type: 'move', action: {type: 'back', walker: x, to: w.at(-2)}, text: `Take ${x} back one step.`};
  }
  // The walker furthest from the meeting dot goes first. Steps that would
  // bring all three together somewhere else come last.
  const order = WALKERS.filter(x => b.walks[x].at(-1) !== m).sort((x, y) => D[b.walks[y].at(-1)][m] - D[b.walks[x].at(-1)][m]);
  const options = order.flatMap(x => neighbours(q, b.walks[x].at(-1)).filter(v => D[v][m] === D[b.walks[x].at(-1)][m] - 1).map(to => ({x, to})));
  const clash = ({x, to}) => { const walks = {...b.walks, [x]: [...b.walks[x], to]}; const t = together(walks); return t !== null && t !== m; };
  const choice = options.find(o => !clash(o)) || options[0];
  if (!choice) return {type: 'done'};
  const {x, to} = choice;
  return {type: 'move', action: {type: 'step', walker: x, to}, text: `Move ${x} ${stepWords(q, b.walks[x].at(-1), to)}.`};
}
// Close: the closures that leave no meeting dot, within the budget, keeping
// the map in one piece. The hint keeps as many of the child's as it can.
const closeCache = new Map();
export function closures(q) {
  const key = JSON.stringify([q.roads, q.homes, q.budget]);
  if (closeCache.has(key)) return closeCache.get(key);
  const out = [];
  (function choose(from, set) {
    if (set.length && connected(q, set) && !meetingDots(q, q.homes, set).length) out.push([...set]);
    if (set.length === q.budget) return;
    for (let i = from; i < q.roads.length; i++) if (connected(q, [...set, i])) choose(i + 1, [...set, i]);
  })(0, []);
  closeCache.set(key, out);
  return out;
}
function roadWords(q, i) {
  const [u, v] = q.roads[i], x = WALKERS.find(h => q.homes[h] === u || q.homes[h] === v);
  if (!x) return 'the marked road';
  const from = q.homes[x], to = u === from ? v : u;
  return `the road from ${x} going ${stepWords({...q, labels: {}}, from, to).replace('one step ', '')}`;
}
function closeHint(p, b) {
  const q = p.parameters, sets = closures(q), have = new Set(b.closed);
  const best = sets.reduce((top, s) => s.filter(i => have.has(i)).length - s.length > top.filter(i => have.has(i)).length - top.length ? s : top, sets[0]);
  const extra = b.closed.find(i => !best.includes(i));
  if (extra !== undefined) return {type: 'move', action: {type: 'open', road: extra}, text: `Open ${roadWords(q, extra)} again.`, road: extra};
  const missing = best.find(i => !have.has(i));
  if (missing !== undefined) return {type: 'move', action: {type: 'close', road: missing}, text: `Close ${roadWords(q, missing)}.`, road: missing};
  return {type: 'move', action: {type: 'claim'}, text: 'Press No dot works.'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  return q.mode === 'close' ? closeHint(p, b) : walkHint(p, b);
}

// --- Choosing and tapping -----------------------------------------------------
// The chosen walker and the playground's tool are view state, outside the save.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {walker: 'A', tool: 'walk'}); return uiState.get(p.id); }
const walkingNow = (p, b) => p.parameters.mode !== 'close' && !solved(p, b) && (p.parameters.mode !== 'playground' || ui(p).tool === 'walk');
// What a tap on a dot does: a step for the chosen walker (back, when it is the
// dot just left), else choosing the walker standing there or living there.
// In the playground's Homes tool, a tap on a home chooses it and a tap on any
// other dot moves the chosen home there.
export function dotAction(q, b, chosen, tool, id) {
  const homeOf = WALKERS.find(x => q.homes[x] === id);
  if (tool === 'homes') return homeOf ? (homeOf === chosen ? null : {choose: homeOf}) : {move: {type: 'home', walker: chosen, to: id}};
  const w = b.walks[chosen], end = w.at(-1);
  if (id === w.at(-2)) return {move: {type: 'back', walker: chosen, to: id}};
  if (roadOf(q, end, id) >= 0 && stepsOf(w) < MAX_WALK) return {move: {type: 'step', walker: chosen, to: id}};
  // A press on the chosen walker's own dot keeps it chosen, so a slide can start there.
  if (id === end) return null;
  const here = WALKERS.find(x => x !== chosen && b.walks[x].at(-1) === id) || (homeOf !== chosen ? homeOf : undefined);
  return here ? {choose: here} : null;
}
function roadAction(q, b, chosen, i) {
  const [u, v] = q.roads[i], end = b.walks[chosen].at(-1);
  if (end !== u && end !== v) return null;
  return dotAction(q, b, chosen, 'walk', end === u ? v : u);
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
const listWords = items => items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
// Where a walker stands on its dot: in the middle when alone, side by side
// when two share the dot, in a little triangle when all three meet. On a map
// with labels in its dots (the cube), walkers stand on the rim instead.
const SPOTS = {1: [[0, 0]], 2: [[-0.62, 0], [0.62, 0]], 3: [[-0.62, -0.4], [0.62, -0.4], [0, 0.66]]};
const RIM = {A: [-0.74, -0.74], B: [0.74, -0.74], C: [0, 1.04]};
function trails(g, q, walks) {
  const users = q.roads.map(() => []);
  for (const x of WALKERS) {
    const w = walks[x];
    for (let k = 1; k < w.length; k++) { const i = roadOf(q, w[k - 1], w[k]); if (!users[i].includes(x)) users[i].push(x); }
  }
  // Roads shared by two or three walkers carry their trails side by side.
  return g.edges.map(e => {
    const list = WALKERS.filter(x => users[e.i].includes(x)), {n} = edgeGeometry(g, e), [x1, y1] = g.pos[e.u], [x2, y2] = g.pos[e.v];
    return list.map((x, k) => {
      const s = (k - (list.length - 1) / 2) * 1.9 * g.k;
      return `<line class="mt-trail t${x}" x1="${f(x1 + n[0] * s)}" y1="${f(y1 + n[1] * s)}" x2="${f(x2 + n[0] * s)}" y2="${f(y2 + n[1] * s)}"/>`;
    }).join('');
  }).join('');
}
function tokens(g, q, walks, chosen, hintedWalker) {
  const r = NODE_R * g.k;
  return WALKERS.map(x => {
    const at = walks[x].at(-1), here = WALKERS.filter(w => walks[w].at(-1) === at), [cx, cy] = g.pos[at];
    const [dx, dy] = q.labels ? RIM[x] : SPOTS[here.length][here.indexOf(x)], size = q.labels ? 0.62 : here.length === 1 ? 0.86 : 0.7;
    const cls = `mt-token t${x}${x === chosen ? ' chosen' : ''}${x === hintedWalker ? ' hinted' : ''}`;
    return `<g class="${cls}" transform="translate(${f(cx + dx * r)},${f(cy + dy * r)}) scale(${f(size * g.k)})"><circle r="${NODE_R}"/><text y="${f(NODE_R * .38)}">${x}</text></g>`;
  }).join('');
}
const withTop = (svg, layer) => svg.replace(/<\/svg>$/, `<g class="mt-top" aria-hidden="true">${layer}</g></svg>`);

function walkerChips(chosen, hintedWalker, label) {
  return `<div class="mt-walkers" role="group" aria-label="${label}">${WALKERS.map(x => `<button type="button" class="mt-walker t${x}${x === hintedWalker && x !== chosen ? ' hinted' : ''}" data-action="mechanic-ui" data-ui='${JSON.stringify({walker: x})}' data-focus="mt-walker-${x}" aria-pressed="${x === chosen}" aria-label="${label === 'Homes' ? 'Home' : 'Walker'} ${x}">${x}</button>`).join('')}</div>`;
}
const moveButton = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary mt-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="mt-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
function where(q, b) {
  const parts = WALKERS.map(x => { const w = b.walks[x]; return `${x} ${w.length === 1 ? 'at home' : `at ${nameOf(q, w.at(-1))}, ${stepsOf(w)} ${stepsOf(w) === 1 ? 'step' : 'steps'}`}`; });
  return `${parts.join('; ')}.`;
}

function renderWalk(p, a) {
  const q0 = p.parameters, b = a.board, q = mapFor(p, b), g = mapOf(q), done = solved(p, b);
  const state = ui(p), tool = q0.mode === 'playground' ? state.tool : 'walk', chosen = state.walker;
  const walking = !done && tool === 'walk', moving = !done && tool === 'homes';
  const hinted = a.hintLevel >= 2 && !done && q0.mode !== 'playground' ? hint(p, b) : null, act = hinted?.action;
  const hintWalker = act && (act.type === 'step' || act.type === 'back') ? act.walker : null;
  const m = together(b.walks), pair = failing(q, q.homes, b.walks);
  const homeOf = id => WALKERS.find(x => q.homes[x] === id);
  const node = id => {
    const x = homeOf(id), here = WALKERS.filter(w => b.walks[w].at(-1) === id);
    const action = walking || moving ? dotAction(q, b, chosen, tool, id) : null;
    const go = action?.move && walking;
    const cls = [x ? `home h${x}` : '', b.found?.includes(id) ? 'found' : '', b.told?.kind === 'again' && b.told.dot === id ? 'again' : '', done && id === m ? 'found' : '', go && action.move.type === 'step' ? 'can-go' : '', act?.to === id && hintWalker ? 'hinted' : '', moving && !x ? 'can-go' : ''].join(' ');
    const doing = !action ? '' : action.choose ? `. Choose ${tool === 'homes' ? 'home' : 'walker'} ${action.choose}` : action.move.type === 'back' ? `. Take ${chosen} back here` : action.move.type === 'home' ? `. Move home ${chosen} here` : `. Move ${chosen} here`;
    const label = `${nameOf(q, id)}${x ? `, home of ${x}` : ''}${here.length ? `, ${listWords(here)} ${here.length === 1 ? 'is' : 'are'} here` : ''}${b.found?.includes(id) || (done && id === m) ? ', a meeting dot' : ''}${doing}`;
    // The chosen walker's own dot is a control too, so a slide can start on it.
    const own = walking && b.walks[chosen].at(-1) === id;
    return {cls, text: x && !q.labels?.[id] ? x : esc(q.labels?.[id] || ''), act: Boolean(action) || own, label: `${label}${own ? `. ${chosen} is chosen` : ''}`};
  };
  const edge = i => {
    const action = walking ? roadAction(q, b, chosen, i) : null, [u, v] = q.roads[i];
    const mark = hintWalker && (roadOf(q, b.walks[hintWalker].at(-1), act.to) === i);
    return {cls: mark ? 'hinted' : '', act: Boolean(action?.move), label: `Road from ${nameOf(q, u)} to ${nameOf(q, v)}${action?.move ? `. ${action.move.type === 'back' ? 'Take' : 'Move'} ${chosen} ${action.move.type === 'back' ? 'back to' : 'to'} ${nameOf(q, action.move.to)}` : ''}`};
  };
  const proof = pair ? pathThrough(g, shortestRoute(q, q.homes[pair[0]], q.homes[pair[1]]), 'mt-proof-glow') + pathThrough(g, shortestRoute(q, q.homes[pair[0]], q.homes[pair[1]]), 'mt-proof') : '';
  const size = q.small ? ' small' : '';
  const board = withTop(graphBoard(g, {cls: `mt-map${size}${q.labels ? ' labelled' : ''}`, label: 'Map of roads', slide: walking, node, edge, over: trails(g, q, b.walks) + proof}), tokens(g, q, b.walks, walking ? chosen : null, hintWalker));
  let top = '';
  if (q0.mode === 'playground') {
    const maps = `<div class="mt-maps" role="group" aria-label="Map">${Object.keys(q0.maps).map(id => `<button type="button" class="secondary mt-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'map', map: id}))}" data-focus="mt-map-${id}" aria-pressed="${b.map === id}" aria-label="${esc(q0.maps[id].name)}">${graphMini(mapOf(q0.maps[id]), {label: q0.maps[id].name})}</button>`).join('')}</div>`;
    const homes = `<button type="button" class="secondary mt-button mt-tool" data-action="mechanic-ui" data-ui='${JSON.stringify({tool: tool === 'homes' ? 'walk' : 'homes'})}' data-focus="mt-tool" aria-pressed="${tool === 'homes'}">Homes</button>`;
    top = `${maps}<div class="mt-bar">${walkerChips(chosen, null, tool === 'homes' ? 'Homes' : 'Walkers')}${homes}</div>`;
  } else if (!done) {
    const all = q0.mode === 'every' ? moveButton('That’s all', {type: 'all'}, 'mt-all', b.told?.kind !== 'more', act?.type === 'all') : '';
    top = `<div class="mt-bar">${walkerChips(chosen, hintWalker, 'Walkers')}${all}</div>`;
  }
  const told = pair ? `Too long for ${pair[0]} and ${pair[1]}.` : b.told?.kind === 'more' ? 'There is another.' : b.told?.kind === 'again' ? 'Found already.' : '';
  const note = told ? `<p class="mt-told">${esc(told)}</p>` : '';
  const found = b.found?.length ? ` Meeting ${b.found.length === 1 ? 'dot' : 'dots'} found: ${listWords(b.found.map(id => nameOf(q, id)))}.` : '';
  const status = `${done ? `A, B and C meet at ${nameOf(q, m)}.` : where(q, b)}${found}${told ? ` ${told}` : ''}${!done && walking ? ` ${chosen} is chosen.` : ''}`;
  return `<div class="mt-puzzle${done ? ' solved' : ''}" data-mechanic-wire="meeting">${top}${board}${note}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function renderClose(p, a) {
  const q = p.parameters, b = a.board, g = mapOf(q), done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done ? hint(p, b) : null;
  const shown = b.refused ? meetingDots(q, q.homes, b.closed)[0] : null;
  const walks = shown ? Object.fromEntries(WALKERS.map(x => [x, shortestRoute(q, q.homes[x], shown, b.closed)])) : null;
  const homeOf = id => WALKERS.find(x => q.homes[x] === id);
  const full = b.closed.length >= q.budget;
  const board = graphBoard(g, {
    cls: `mt-map mt-close${q.small ? ' small' : ''}`, label: 'Map of roads',
    node: id => { const x = homeOf(id); return {cls: [x ? `home h${x}` : '', id === shown ? 'found' : ''].join(' '), text: x || '', label: `${nameOf(q, id)}${x ? `, home of ${x}` : ''}${id === shown ? ', still a meeting dot' : ''}`}; },
    edge: i => {
      // Every road stays a control, so a closure past the budget or one that
      // would cut the map in two is refused with a message, not ignored.
      const shut = b.closed.includes(i), can = shut || (!full && connected(q, [...b.closed, i])), [u, v] = q.roads[i];
      return {cls: [shut ? 'shut' : '', hinted?.road === i ? 'hinted' : ''].join(' '), bar: shut, act: !done, label: `Road from ${nameOf(q, u)} to ${nameOf(q, v)}${shut ? ', closed' : ''}${done ? '' : can ? (shut ? '. Open it' : '. Close it') : full ? '' : '. Closing it would cut the map'}`};
    },
    over: walks ? trails(g, q, walks) : ''
  });
  const top = done ? '' : `<div class="mt-bar"><span class="mt-slots" role="img" aria-label="${b.closed.length} of ${q.budget} ${q.budget === 1 ? 'road' : 'roads'} closed">${Array.from({length: q.budget}, (_, k) => `<i class="${k < b.closed.length ? 'on' : ''}"></i>`).join('')}</span>${moveButton('No dot works', {type: 'claim'}, 'mt-claim', !b.refused, hinted?.action?.type === 'claim')}</div>`;
  const told = b.refused ? 'This dot still works.' : '';
  const status = `${b.closed.length} of ${q.budget} closed.${told ? ` ${told} ${nameOf(q, shown)}.` : ''}${done ? ' No dot works.' : ''}`;
  return `<div class="mt-puzzle${done ? ' solved' : ''}" data-mechanic-wire="meeting">${top}${walks ? withTop(board, tokens(g, q, walks, null, null)) : board}${told ? `<p class="mt-told">${told}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const render = (p, a) => p.parameters.mode === 'close' ? renderClose(p, a) : renderWalk(p, a);

// Arrow keys move the chosen walker along the road that points most nearly
// that way.
const ARROWS = {ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
export function arrowAction(q, b, chosen, key) {
  const dir = ARROWS[key];
  if (!dir) return null;
  const g = mapOf(q), end = b.walks[chosen].at(-1), [x1, y1] = g.pos[end];
  let best = null, score = 0.65;
  for (const v of neighbours(q, end)) {
    const [x2, y2] = g.pos[v], len = Math.hypot(x2 - x1, y2 - y1), s = ((x2 - x1) * dir[0] + (y2 - y1) * dir[1]) / len;
    if (s > score) { best = v; score = s; }
  }
  return best ? dotAction(q, b, chosen, 'walk', best)?.move || null : null;
}
function wire(root, p, api) {
  const now = () => { const b = api.attempt().board; return {b, q: mapFor(p, b)}; };
  if (p.parameters.mode === 'close') {
    wireGraph(root, {edge: i => { const {b} = now(); return {type: b.closed.includes(i) ? 'open' : 'close', road: i}; }}, api.apply);
    return;
  }
  const run = action => { if (!action) return null; if (action.choose) { api.ui({walker: action.choose}); return null; } return action.move; };
  wireGraph(root, {
    stroke: true,
    node: id => { const {b, q} = now(); return walkingNow(p, b) || ui(p).tool === 'homes' ? run(dotAction(q, b, ui(p).walker, ui(p).tool, id)) : null; },
    edge: i => { const {b, q} = now(); return walkingNow(p, b) ? run(roadAction(q, b, ui(p).walker, i)) : null; }
  }, api.apply);
  root.addEventListener('keydown', e => {
    if (!ARROWS[e.key] || e.altKey || e.ctrlKey || e.metaKey) return;
    const {b, q} = now();
    const action = walkingNow(p, b) ? arrowAction(q, b, ui(p).walker, e.key) : null;
    if (!action) return;
    e.preventDefault();
    api.apply(action);
  });
}

export const meetingMechanics = {
  meeting: {
    fresh, valid, solved, move, hint, render, wire,
    ui(p, payload) {
      if (!object(payload)) return;
      if (WALKERS.includes(payload.walker)) ui(p).walker = payload.walker;
      if (['walk', 'homes'].includes(payload.tool)) ui(p).tool = payload.tool;
    },
    reset: p => { uiState.delete(p.id); },
    // Undo keeps the meeting dots already found.
    carry(p, from, to) {
      if (!finding(p.parameters) || !object(from) || !object(to) || !Array.isArray(from.found)) return to;
      if (p.parameters.mode === 'playground' && (from.map !== to.map || JSON.stringify(from.homes) !== JSON.stringify(to.homes))) return to;
      return {...to, found: [...from.found], told: null, ...(p.parameters.mode === 'every' ? {done: false} : {})};
    },
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'meeting',
  family: {id: 'meeting', symbol: '⋏'},
  mechanics: meetingMechanics,
  pack: new URL('./meeting.json', import.meta.url).href,
  css: new URL('./meeting.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.mt-walker,.mt-button:not([disabled])'
};
