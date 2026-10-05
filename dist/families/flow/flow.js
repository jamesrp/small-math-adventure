// Routes and roadblocks (worksheet Week 13). A map of one-way arrows has a
// start and a finish. Routes follow arrows from start to finish without
// revisiting a dot; two routes may share a dot but never an arrow. A roadblock
// closes one arrow. The most routes that fit equals the fewest roadblocks that
// stop every route (unit-capacity max-flow min-cut), so k routes together with
// k roadblocks that stop everything prove both numbers best at once.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, wireGraph, pathThrough} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const MAX_ROUTES = 8;

// The map: arrows are edges u → v.
export const mapOf = q => graphOf({nodes: q.nodes, edges: q.arcs, aspect: q.aspect, scale: q.scale, directed: true});
const arcIndex = (q, u, v) => q.arcs.findIndex(([a, b]) => a === u && b === v);
const routeArcs = (q, route) => route.slice(1).map((v, i) => arcIndex(q, route[i], v));
const complete = (q, route) => route.length > 1 && route.at(-1) === q.finish;

// Every simple start-to-finish route, as node lists with an arc bitmask.
const routeCache = new Map();
export function allRoutes(q) {
  const cacheKey = JSON.stringify([q.arcs, q.start, q.finish]);
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);
  const out = [];
  (function walk(path, mask) {
    const at = path.at(-1);
    if (at === q.finish) { out.push({nodes: [...path], mask}); return; }
    q.arcs.forEach(([u, v], i) => { if (u === at && !path.includes(v)) walk([...path, v], mask | (1 << i)); });
  })([q.start], 0);
  routeCache.set(cacheKey, out);
  return out;
}
// Does an open path lead from start to finish? Returns one (fewest arrows), or null.
export function leak(q, closed) {
  const shut = new Set(closed), from = {[q.start]: null}, queue = [q.start];
  for (let k = 0; k < queue.length; k++) {
    const at = queue[k];
    if (at === q.finish) { const path = [at]; while (from[path[0]] !== null) path.unshift(from[path[0]]); return path; }
    q.arcs.forEach(([u, v], i) => { if (u === at && !shut.has(i) && !Object.hasOwn(from, v)) { from[v] = at; queue.push(v); } });
  }
  return null;
}
// The largest packing that keeps `fixed` routes (arc masks) and, if given, has
// one more route beginning with `prefix`. Returns the added routes, or null
// when no packing of `size` routes exists under those terms.
function packWith(q, fixed, prefix, size) {
  const used = fixed.reduce((m, r) => m | r, 0), need = size - fixed.length;
  if (need < 0) return null;
  const candidates = allRoutes(q).filter(r => !(r.mask & used));
  const starts = r => prefix && prefix.every((v, i) => r.nodes[i] === v);
  const chosen = [];
  return (function pick(from, mask, hasPrefix) {
    if (chosen.length === need) return !prefix || hasPrefix ? [...chosen] : null;
    for (let i = from; i < candidates.length; i++) {
      const r = candidates[i];
      if (r.mask & mask) continue;
      chosen.push(r);
      const found = pick(i + 1, mask | r.mask, hasPrefix || starts(r));
      chosen.pop();
      if (found) return found;
    }
    return null;
  })(0, 0, false);
}
export function bestCount(q) {
  let k = 0;
  while (packWith(q, [], null, k + 1)) k++;
  return k;
}
// Every set of `size` roadblocks that stops every route.
const cutCache = new Map();
export function blockingSets(q, size) {
  const cacheKey = JSON.stringify([q.arcs, q.start, q.finish, size]);
  if (cutCache.has(cacheKey)) return cutCache.get(cacheKey);
  const out = [];
  (function choose(from, set) {
    if (set.length === size) { if (!leak(q, set)) out.push([...set]); return; }
    for (let i = from; i < q.arcs.length; i++) choose(i + 1, [...set, i]);
  })(0, []);
  cutCache.set(cacheKey, out);
  return out;
}

// --- Packing puzzles -------------------------------------------------------
function validPack(p, b) {
  const q = p.parameters;
  if (!object(b) || !Array.isArray(b.routes) || !Array.isArray(b.closed) || b.routes.length > MAX_ROUTES) return false;
  if (!b.closed.every(i => Number.isInteger(i) && i >= 0 && i < q.arcs.length) || new Set(b.closed).size !== b.closed.length) return false;
  const taken = new Set();
  for (const [k, route] of b.routes.entries()) {
    if (!Array.isArray(route) || !route.length || route[0] !== q.start || !route.every(v => Object.hasOwn(q.nodes, v)) || new Set(route).size !== route.length) return false;
    if (!complete(q, route) && k !== b.routes.length - 1) return false;
    for (const i of routeArcs(q, route)) { if (i < 0 || taken.has(i)) return false; taken.add(i); }
  }
  return true;
}
const finished = (q, b) => b.routes.filter(r => complete(q, r));
const partialOf = (q, b) => b.routes.length && !complete(q, b.routes.at(-1)) ? b.routes.at(-1) : null;
const usedArcs = (q, b) => new Set(b.routes.flatMap(r => routeArcs(q, r)));
function solvedPack(p, b) {
  if (!validPack(p, b)) return false;
  const q = p.parameters, k = finished(q, b).length;
  return k > 0 && b.closed.length === k && !leak(q, b.closed);
}
// The arrows a route in progress may take next: unused, leaving its end, to a
// dot it has not visited. With no route in progress, the arrows leaving start.
function nextArcs(q, b) {
  const used = usedArcs(q, b), partial = partialOf(q, b), at = partial ? partial.at(-1) : q.start;
  return q.arcs.map(([u, v], i) => ({u, v, i})).filter(({u, v, i}) => u === at && !used.has(i) && !(partial || [q.start]).includes(v));
}
function movePack(p, b, action) {
  if (!validPack(p, b) || solvedPack(p, b) || !object(action)) return null;
  const q = p.parameters, partial = partialOf(q, b);
  if (action.type === 'step') {
    const node = action.node;
    if (typeof node !== 'string' || !Object.hasOwn(q.nodes, node)) return null;
    if (node === q.start) {
      // Start begins a new route and drops one still on its way.
      if (partial && partial.length === 1) return {...b, routes: b.routes.slice(0, -1)};
      if (finished(q, b).length >= MAX_ROUTES) return null;
      return {...b, routes: [...finished(q, b), [q.start]]};
    }
    const arc = nextArcs(q, b).find(a => a.v === node);
    if (!arc) return null;
    if (!partial && finished(q, b).length >= MAX_ROUTES) return null;
    const routes = partial ? [...b.routes.slice(0, -1), [...partial, node]] : [...b.routes, [q.start, node]];
    return {...b, routes};
  }
  if (action.type === 'erase') {
    const k = action.route;
    if (!Number.isInteger(k) || k < 0 || k >= b.routes.length) return null;
    return {...b, routes: b.routes.filter((_, j) => j !== k)};
  }
  if (action.type === 'close' || action.type === 'open') {
    const i = action.arc, shut = b.closed.includes(i);
    if (!Number.isInteger(i) || i < 0 || i >= q.arcs.length || shut === (action.type === 'close')) return null;
    return {...b, closed: action.type === 'close' ? [...b.closed, i].sort((x, y) => x - y) : b.closed.filter(j => j !== i)};
  }
  return null;
}
// Hints keep as much of the child's work as a best answer allows: first the
// routes, then the roadblocks.
function hintPack(p, b) {
  if (solvedPack(p, b)) return {type: 'done'};
  const q = p.parameters, best = q.best, done = finished(q, b), partial = partialOf(q, b);
  const masks = done.map(r => routeArcs(q, r).reduce((m, i) => m | (1 << i), 0));
  const erase = (k, text) => ({type: 'move', action: {type: 'erase', route: k}, text, route: k});
  if (!packWith(q, masks, null, best)) {
    for (let k = done.length - 1; k >= 0; k--) if (packWith(q, masks.filter((_, j) => j !== k), null, best)) return erase(k, 'This route uses arrows the other routes need. Clear it and try another way.');
    return erase(done.length - 1, 'Clear this route and try another way.');
  }
  if (partial && partial.length > 1) {
    const plan = packWith(q, masks, partial, best);
    if (!plan) return erase(b.routes.length - 1, 'This route can’t be part of the most routes. Clear it.');
    const target = plan.find(r => partial.every((v, i) => r.nodes[i] === v)).nodes;
    const node = target[partial.length];
    return {type: 'move', action: {type: 'step', node}, text: 'Follow this arrow.', arc: arcIndex(q, partial.at(-1), node)};
  }
  if (done.length < best) {
    const node = packWith(q, masks, null, best)[0].nodes[1];
    return {type: 'move', action: {type: 'step', node}, text: 'Start a route along this arrow.', arc: arcIndex(q, q.start, node)};
  }
  const cuts = blockingSets(q, best), have = new Set(b.closed);
  const cut = cuts.reduce((top, c) => c.filter(i => have.has(i)).length > top.filter(i => have.has(i)).length ? c : top, cuts[0]);
  const extra = b.closed.find(i => !cut.includes(i));
  if (extra !== undefined) return {type: 'move', action: {type: 'open', arc: extra}, text: 'Take this roadblock away.', arc: extra};
  const missing = cut.find(i => !have.has(i));
  return {type: 'move', action: {type: 'close', arc: missing}, text: 'Put a roadblock here.', arc: missing};
}

// --- The roadblock game ----------------------------------------------------
// Players take turns closing one arrow. Whoever closes the arrow that stops
// the last route wins. The app plays perfectly.
const gameCache = new Map();
export function winsToMove(q, closed) {
  const key = `${JSON.stringify(q.arcs)}|${[...closed].sort((a, b) => a - b).join(',')}`;
  if (gameCache.has(key)) return gameCache.get(key);
  let win = false;
  for (let i = 0; i < q.arcs.length && !win; i++) if (!closed.includes(i) && (!leak(q, [...closed, i]) || !winsToMove(q, [...closed, i]))) win = true;
  gameCache.set(key, win);
  return win;
}
// A winning closure, or (in a lost position) the first open arrow.
export function goodMove(q, closed) {
  const open = q.arcs.map((_, i) => i).filter(i => !closed.includes(i));
  return open.find(i => !leak(q, [...closed, i]) || !winsToMove(q, [...closed, i])) ?? open[0];
}
const childTurn = b => b.order === 'first' ? b.closed.length % 2 === 0 : b.closed.length % 2 === 1;
const gameOver = (q, b) => b.order !== null && !leak(q, b.closed);
const childWon = (q, b) => gameOver(q, b) && !childTurn(b);
function validGame(p, b) {
  const q = p.parameters;
  if (!object(b) || ![null, 'first', 'second'].includes(b.order) || !Array.isArray(b.closed)) return false;
  if (b.order === null && b.closed.length) return false;
  if (!b.closed.every(i => Number.isInteger(i) && i >= 0 && i < q.arcs.length) || new Set(b.closed).size !== b.closed.length) return false;
  // Only the last closure may stop every route, and the app's closures are its own best moves.
  for (let k = 0; k < b.closed.length; k++) {
    if (k < b.closed.length - 1 && !leak(q, b.closed.slice(0, k + 1))) return false;
    const appMoved = b.order === 'first' ? k % 2 === 1 : k % 2 === 0;
    if (appMoved && b.closed[k] !== goodMove(q, b.closed.slice(0, k))) return false;
  }
  return true;
}
const withReply = (q, closed) => leak(q, closed) ? [...closed, goodMove(q, closed)] : closed;
function moveGame(p, b, action) {
  if (!validGame(p, b) || childWon(p.parameters, b) || !object(action)) return null;
  const q = p.parameters;
  if (action.type === 'order') {
    if (b.order !== null || !['first', 'second'].includes(action.order)) return null;
    return {order: action.order, closed: action.order === 'second' ? [goodMove(q, [])] : []};
  }
  if (action.type === 'again') return b.order !== null ? {order: null, closed: []} : null;
  if (action.type === 'close') {
    const i = action.arc;
    if (b.order === null || gameOver(q, b) || !childTurn(b) || !Number.isInteger(i) || i < 0 || i >= q.arcs.length || b.closed.includes(i)) return null;
    return {...b, closed: withReply(q, [...b.closed, i])};
  }
  return null;
}
function hintGame(p, b) {
  const q = p.parameters;
  if (childWon(q, b)) return {type: 'done'};
  if (b.order === null) {
    const order = winsToMove(q, []) ? 'first' : 'second';
    return {type: 'move', action: {type: 'order', order}, text: order === 'first' ? 'Go first.' : 'Let the other side go first.'};
  }
  if (gameOver(q, b) || !winsToMove(q, b.closed)) return {type: 'move', action: {type: 'again'}, text: 'From here the other side can always win. Press Again.'};
  const arc = goodMove(q, b.closed);
  return {type: 'move', action: {type: 'close', arc}, text: 'Close this arrow.', arc};
}

// --- Drawing ----------------------------------------------------------------
const uiState = new Map();
const ui = p => { if (!uiState.has(p.id)) uiState.set(p.id, {tool: 'route'}); return uiState.get(p.id); };
const ROUTE_COLORS = 4;
const nodeText = (q, id) => id === q.start ? '▶' : id === q.finish ? '⚑' : esc(id);
const nodeName = (q, id) => id === q.start ? 'Start' : id === q.finish ? 'Finish' : `Dot ${id}`;
const barIcon = '<svg class="flow-icon" viewBox="0 0 24 24" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" class="flow-icon-arrow"/><line x1="12" y1="5" x2="12" y2="19" class="flow-icon-bar"/></svg>';
const routeIcon = '<svg class="flow-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17 C8 17 8 7 13 7 S18 12 21 12" class="flow-icon-route"/></svg>';

function renderPack(p, a) {
  const q = p.parameters, b = a.board, g = mapOf(q), tool = ui(p).tool, solved = solvedPack(p, b);
  const hint = a.hintLevel >= 2 && !solved ? hintPack(p, b) : null;
  const owner = new Map();
  b.routes.forEach((r, k) => routeArcs(q, r).forEach(i => owner.set(i, k)));
  const partial = partialOf(q, b), next = new Set(nextArcs(q, b).map(x => x.v)), open = leak(q, b.closed), done = finished(q, b).length;
  const hintRoute = hint?.route !== undefined ? new Set(routeArcs(q, b.routes[hint.route])) : null;
  const board = graphBoard(g, {
    cls: `flow-map tool-${tool}`,
    label: 'Map of one-way arrows',
    slide: tool === 'route' && !solved,
    node: id => {
      const end = partial ? partial.at(-1) === id : false;
      const target = !solved && tool === 'route' && (next.has(id) || id === q.start);
      const cls = [id === q.start ? 'flow-start' : '', id === q.finish ? 'flow-finish' : '', id === q.finish && !open ? 'sealed' : '', end ? 'pen' : '', target && next.has(id) && partial ? 'can-go' : '', hint?.action?.node === id ? 'hinted' : ''].join(' ');
      return {cls, text: nodeText(q, id), act: target, label: `${nodeName(q, id)}${end ? ', the route you are drawing ends here' : ''}${id === q.finish && !open ? ', every route stopped' : ''}${target && id !== q.start ? '. Go here' : id === q.start && target ? '. Start a route' : ''}`};
    },
    edge: i => {
      const [u, v] = q.arcs[i], k = owner.get(i), shut = b.closed.includes(i);
      const extend = !solved && tool === 'route' && k === undefined && nextArcs(q, b).some(x => x.i === i);
      const act = !solved && (tool === 'block' || k !== undefined || extend);
      const cls = [k !== undefined ? `routed r${k % ROUTE_COLORS}` : '', k !== undefined && b.routes[k] === partial ? 'drawing' : '', shut ? 'shut' : '', hint?.arc === i || hintRoute?.has(i) ? 'hinted' : ''].join(' ');
      const label = `Arrow ${nodeName(q, u)} to ${nodeName(q, v)}${k !== undefined ? `, route ${k + 1}` : ''}${shut ? ', roadblock' : ''}. ${tool === 'block' ? (shut ? 'Remove the roadblock' : 'Put a roadblock here') : k !== undefined ? 'Clear this route' : 'Follow this arrow'}`;
      return {cls, act, label, bar: shut, strokes: k !== undefined ? [`r${k % ROUTE_COLORS}`] : []};
    },
    over: tool === 'block' && open && !solved ? pathThrough(g, open, 'flow-leak-glow') + pathThrough(g, open, 'flow-leak') : ''
  });
  // A hint for the other tool also marks that tool's button.
  const hintTool = hint?.type === 'move' ? (['close', 'open'].includes(hint.action.type) ? 'block' : 'route') : null;
  const toolButton = (id, icon, label, count) => `<button type="button" class="secondary flow-tool${hintTool === id && tool !== id ? ' hinted' : ''}" data-action="mechanic-ui" data-ui="${esc(JSON.stringify({tool: id}))}" data-focus="flow-tool-${id}" aria-pressed="${tool === id}" aria-label="${label}: ${count}">${icon}<span aria-hidden="true">${label}</span><b aria-hidden="true">${count}</b></button>`;
  const tools = `<div class="flow-tools" role="group" aria-label="Tool">${toolButton('route', routeIcon, 'Routes', done)}${toolButton('block', barIcon, 'Roadblocks', b.closed.length)}</div>`;
  const status = `${plural(done, 'route')}${partial ? `, one more on its way at ${nodeName(q, partial.at(-1))}` : ''}. ${plural(b.closed.length, 'roadblock')}. ${open ? 'A route can still get through.' : 'Every route is stopped.'}`;
  return `<div class="flow-puzzle${solved ? ' solved' : ''}" data-mechanic-wire="flow">${tools}${board}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderGame(p, a) {
  const q = p.parameters, b = a.board, g = mapOf(q), over = gameOver(q, b), won = childWon(q, b);
  const hint = a.hintLevel >= 2 && !won ? hintGame(p, b) : null;
  const yours = new Set(b.closed.filter((_, k) => b.order === 'first' ? k % 2 === 0 : k % 2 === 1));
  const turn = b.order !== null && !over && childTurn(b);
  const board = graphBoard(g, {
    cls: 'flow-map flow-game', label: 'Map of one-way arrows',
    node: id => ({cls: [id === q.start ? 'flow-start' : '', id === q.finish ? 'flow-finish' : '', id === q.finish && over ? 'sealed' : ''].join(' '), text: nodeText(q, id), label: nodeName(q, id)}),
    edge: i => {
      const [u, v] = q.arcs[i], shut = b.closed.includes(i), act = turn && !shut;
      return {cls: [shut ? `shut ${yours.has(i) ? 'mine' : 'theirs'}` : '', hint?.arc === i ? 'hinted' : '', b.closed.at(-1) === i && over ? 'last' : ''].join(' '), act, bar: shut, label: `Arrow ${nodeName(q, u)} to ${nodeName(q, v)}${shut ? (yours.has(i) ? ', your roadblock' : ', their roadblock') : '. Close it'}`};
    }
  });
  const choose = b.order === null ? `<div class="flow-order" role="group" aria-label="Who goes first">${['first', 'second'].map(order => `<button type="button" class="secondary flow-tool ${hint?.action?.order === order ? 'hinted' : ''}" data-flow-move="${esc(JSON.stringify({type: 'order', order}))}" data-focus="flow-order-${order}">${order === 'first' ? 'I go first' : 'You go first'}</button>`).join('')}</div>` : '';
  // A win shows the completion card; a loss says so and offers another game.
  const result = over && !won ? `<div class="flow-result"><p class="lost">They stopped the last way through.</p><button type="button" class="secondary flow-tool ${hint?.action?.type === 'again' ? 'hinted' : ''}" data-flow-move="${esc(JSON.stringify({type: 'again'}))}" data-focus="flow-again"><span aria-hidden="true">↺</span> Again</button></div>` : '';
  const status = b.order === null ? 'Choose who goes first.' : over ? (won ? 'You win.' : 'They win.') : 'Your turn: close an arrow.';
  return `<div class="flow-puzzle flow-game-wrap" data-mechanic-wire="flow">${choose}${board}${result}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

function wire(root, p, api) {
  const q = p.parameters;
  root.addEventListener('click', e => {
    const control = e.target.closest('[data-flow-move]');
    if (!control || !root.contains(control)) return;
    try { api.apply(JSON.parse(control.dataset.flowMove)); } catch { /* malformed control data is ignored */ }
  });
  if (q.mode === 'game') {
    wireGraph(root, {edge: i => ({type: 'close', arc: i})}, api.apply);
    return;
  }
  const board = () => api.attempt().board;
  wireGraph(root, {
    stroke: true,
    node: id => {
      if (ui(p).tool !== 'route') return null;
      // Start always begins a new route (or, pressed again, sets the empty one aside).
      if (id === q.start) return {type: 'step', node: id};
      return nextArcs(q, board()).some(x => x.v === id) ? {type: 'step', node: id} : null;
    },
    edge: i => {
      const b = board();
      if (ui(p).tool === 'block') return {type: b.closed.includes(i) ? 'open' : 'close', arc: i};
      const k = b.routes.findIndex(r => routeArcs(q, r).includes(i));
      if (k >= 0) return {type: 'erase', route: k};
      const arc = nextArcs(q, b).find(x => x.i === i);
      return arc ? {type: 'step', node: arc.v} : null;
    }
  }, api.apply);
}

const isGame = p => p.parameters.mode === 'game';
export const flowMechanics = {
  flow: {
    fresh: p => isGame(p) ? {order: null, closed: []} : {routes: (p.parameters.routes || []).map(r => [...r]), closed: []},
    valid: (p, b) => isGame(p) ? validGame(p, b) : validPack(p, b),
    solved: (p, b) => isGame(p) ? validGame(p, b) && childWon(p.parameters, b) : solvedPack(p, b),
    move: (p, b, action) => isGame(p) ? moveGame(p, b, action) : movePack(p, b, action),
    hint: (p, b) => isGame(p) ? hintGame(p, b) : hintPack(p, b),
    render: (p, a) => isGame(p) ? renderGame(p, a) : renderPack(p, a),
    wire,
    ui(p, payload) { if (object(payload) && ['route', 'block'].includes(payload.tool)) ui(p).tool = payload.tool; },
    reset: p => { uiState.delete(p.id); }
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'flow',
  family: {id: 'flow', symbol: '⇉'},
  mechanics: flowMechanics,
  pack: new URL('./flow.json', import.meta.url).href,
  css: new URL('./flow.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.flow-tool'
};
