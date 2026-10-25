// Cops and robbers (worksheet Week 86, Pursuit and escape). C and R stand on
// dots of a road map. C chooses a dot, then R; C moves first, and on a turn a
// piece stays or takes one road. C catches R by landing on R's dot. The app
// plays the other side perfectly (game.js), so a catch within the moves shown
// is a real strategy and an escape is certified only when every C move from
// every position the child's replies reach has been answered.
//
// Mechanics: `cops` (catch R within a budget, keep R away forever, catch R or
// press Can't, add roads then catch, and the playground), `copsfold` (fold the
// map dot by dot to one dot, or Can't when no fold is left) and `copstwo` (two
// cops on a ring).
import {esc} from '../../expansion-controls.js';
import {graphOf as boardGraph, graphBoard, graphMini, wireGraph, NODE_R} from '../../graph-board.js';
import * as game from './game.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (o, list) => object(o) && Object.keys(o).sort().join() === [...list].sort().join();
export const MODES = ['catch', 'escape', 'roads', 'playground'];
export const MAX_PLAY = 80;

// --- Maps ---------------------------------------------------------------------
// A map is {nodes: {id: [x%, y%]}, roads: [[u, v], …], aspect}.
export const idsOf = spec => Object.keys(spec.nodes);
export const gameOf = spec => game.graphOf(idsOf(spec), spec.roads);
export const boardOf = spec => boardGraph({nodes: spec.nodes, edges: spec.roads, aspect: spec.aspect, scale: spec.scale});
const isId = (spec, id) => typeof id === 'string' && Object.hasOwn(spec.nodes, id);
const sameRoad = ([a, b], [c, d]) => (a === c && b === d) || (a === d && b === c);
export const hasRoad = (spec, pair) => spec.roads.some(r => sameRoad(r, pair));
// An added road is written with its dots in map order.
export const roadOf = (spec, u, v) => { const ids = idsOf(spec); return ids.indexOf(u) < ids.indexOf(v) ? [u, v] : [v, u]; };
export function mapFor(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') return q.maps[b.map];
  if (q.mode === 'roads') return {...q, roads: [...q.roads, ...b.added]};
  return q;
}
// Every set of up to k new roads, as lists of road pairs.
export function roadSets(q, k) {
  const ids = idsOf(q), pairs = [];
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (!hasRoad(q, [ids[i], ids[j]])) pairs.push([ids[i], ids[j]]);
  const out = [];
  (function choose(from, set) {
    out.push(set);
    if (set.length === k) return;
    for (let i = from; i < pairs.length; i++) choose(i + 1, [...set, pairs[i]]);
  })(0, []);
  return out;
}
// The fewest C moves from C's best start, or INF.
export const bestValue = G => Math.min(...G.ids.map((_, c) => game.oneCop(G).start(c)));
// Road sets after which C catches R within the puzzle's moves.
export const goodSets = q => roadSets(q, q.add).filter(set => bestValue(gameOf({...q, roads: [...q.roads, ...set]})) <= q.budget);

// --- Games --------------------------------------------------------------------
// The child as C: the start, then each C move; R's start and replies follow
// from the perfect robber, so the save is only the child's moves.
export function chase(G, start, moves) {
  if (start === null) return moves.length ? null : {placed: false};
  const s = G.index[start];
  if (s === undefined) return null;
  let c = s, r = game.robberPlace(G, s), caught = false, cFrom = null, rFrom = null;
  for (const id of moves) {
    const m = G.index[id];
    if (caught || m === undefined || !G.adj[c][m]) return null;
    cFrom = c; c = m; rFrom = r;
    if (m === r) caught = true; else r = game.robberReply(G, m, r);
  }
  return {placed: true, c, r, caught, cFrom, rFrom, used: moves.length};
}
// The child as R against every C move (game.explore), with dot ids.
export function escapeState(G, answers) {
  if (!Array.isArray(answers) || !answers.every(id => typeof id === 'string' && Object.hasOwn(G.index, id))) return null;
  const e = game.explore(G, answers.map(id => G.index[id]));
  return e.status === 'bad' || e.answered !== answers.length ? null : e;
}
// The playground with the child as R: the app's C starts and moves as the
// cop of game.copMoves, and the child answers.
export function flee(G, moves) {
  let c = game.copStart(G);
  if (!moves.length) return {status: 'place', c, r: null, cFrom: null};
  let r = G.index[moves[0]], cFrom = null;
  if (r === undefined || r === c) return null;
  for (let k = 1; ; k++) {
    const c2 = game.copMoves(G, c, r)[0];
    cFrom = c; c = c2;
    if (c2 === r) return k === moves.length ? {status: 'caught', c, r, cFrom} : null;
    if (k >= moves.length) return {status: 'reply', c, r, cFrom};
    const r2 = G.index[moves[k]];
    if (r2 === undefined || !G.adj[r][r2] || r2 === c) return null;
    r = r2;
  }
}

// --- Boards -------------------------------------------------------------------
// catch:      {start, moves, cant}     cant: null, or R's answers after Can't
// escape:     {answers}
// roads:      {added, play, start, moves, cant}
// playground: {map, side, moves}       side 'cop' (moves[0] is C's start) or
//                                      'robber' (moves[0] is R's start)
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {map: Object.keys(q.maps)[0], side: 'cop', moves: []};
  if (q.mode === 'escape') return {answers: []};
  if (q.mode === 'roads') return {added: [], play: false, start: null, moves: [], cant: null};
  return {start: q.start ?? null, moves: [], cant: null};
}
const idList = (spec, list) => Array.isArray(list) && list.every(id => isId(spec, id));
function validChase(q, spec, b, budget) {
  if (!(b.start === null || isId(spec, b.start)) || !idList(spec, b.moves)) return false;
  if (q.start !== undefined && b.start !== q.start) return false;
  if (b.moves.length > budget) return false;
  return chase(gameOf(spec), b.start, b.moves) !== null;
}
function validCant(q, spec, b) {
  if (b.cant === null) return true;
  return Boolean(q.cant) && escapeState(gameOf(spec), b.cant) !== null;
}
function validAdded(q, added) {
  if (!Array.isArray(added) || added.length > q.add) return false;
  const ids = idsOf(q);
  const ok = added.every(r => Array.isArray(r) && r.length === 2 && isId(q, r[0]) && isId(q, r[1]) && ids.indexOf(r[0]) < ids.indexOf(r[1]) && !hasRoad(q, r));
  return ok && new Set(added.map(r => r.join())).size === added.length;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'escape') return keys(b, ['answers']) && escapeState(gameOf(q), b.answers) !== null;
  if (q.mode === 'playground') {
    if (!keys(b, ['map', 'side', 'moves']) || typeof b.map !== 'string' || !Object.hasOwn(q.maps, b.map) || !['cop', 'robber'].includes(b.side)) return false;
    const spec = q.maps[b.map];
    if (!idList(spec, b.moves) || b.moves.length > MAX_PLAY) return false;
    return b.side === 'cop' ? chase(gameOf(spec), b.moves[0] ?? null, b.moves.slice(1)) !== null : flee(gameOf(spec), b.moves) !== null;
  }
  if (q.mode === 'roads') {
    if (!keys(b, ['added', 'play', 'start', 'moves', 'cant']) || typeof b.play !== 'boolean' || !validAdded(q, b.added)) return false;
    const spec = mapFor(p, b);
    if (!b.play && (b.start !== null || b.moves.length)) return false;
    if (b.cant !== null && b.added.length !== q.add) return false;
    return validChase(q, spec, b, q.budget) && validCant(q, spec, b);
  }
  return keys(b, ['start', 'moves', 'cant']) && validChase(q, q, b, q.budget) && validCant(q, q, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  const spec = mapFor(p, b), G = gameOf(spec);
  if (q.mode === 'escape') return escapeState(G, b.answers).status === 'done';
  if (b.cant !== null) return escapeState(G, b.cant).status === 'done';
  if (q.mode === 'roads' && !b.play) return false;
  return chase(G, b.start, b.moves).caught === true;
}

// --- What the board shows -----------------------------------------------------
// One description of the current position for drawing, taps and hints:
// where C and R stand and where they came from, the piece waiting to be put
// down, what a tap on each dot does, and the line under the board.
export function sceneOf(p, b) {
  const q = p.parameters, spec = mapFor(p, b), G = gameOf(spec);
  const s = {spec, G, role: 'cop', cop: null, robber: null, copFrom: null, robberFrom: null, tray: null, taps: new Map(), line: '', caught: false, over: false, done: false, pips: null};
  const id = i => G.ids[i];
  if (q.mode === 'roads' && !b.play && b.cant === null) { s.role = 'roads'; return s; }
  const robberSide = q.mode === 'escape' || (q.mode !== 'playground' && b.cant !== null) || (q.mode === 'playground' && b.side === 'robber');
  if (robberSide) {
    s.role = 'robber';
    if (q.mode === 'playground') {
      const f = flee(G, b.moves);
      s.cop = f.c; s.robber = f.r; s.copFrom = f.cFrom;
      if (f.status === 'place') { s.tray = 'R'; G.ids.forEach((x, i) => { if (i !== f.c) s.taps.set(i, {type: 'r', at: x}); }); }
      else if (f.status === 'caught') { s.caught = true; s.line = 'C caught R.'; }
      else if (b.moves.length < MAX_PLAY) for (const r2 of G.nb[f.r]) if (r2 !== f.c) s.taps.set(r2, {type: 'r', at: id(r2)});
      return s;
    }
    const e = escapeState(G, q.mode === 'escape' ? b.answers : b.cant);
    s.explore = e;
    if (e.status === 'place') {
      s.cop = e.c; s.tray = 'R';
      if (e.fresh) s.line = 'C tries another start.';
      G.ids.forEach((x, i) => { if (i !== e.c) s.taps.set(i, {type: 'r', at: x}); });
    } else if (e.status === 'reply') {
      s.cop = e.c; s.robber = e.r; s.copFrom = e.from.c;
      if (e.jump) s.line = 'C tries another move.';
      for (const r2 of G.nb[e.r]) if (r2 !== e.c) s.taps.set(r2, {type: 'r', at: id(r2)});
    } else if (e.status === 'caught') {
      s.cop = e.c; s.robber = e.r; s.copFrom = e.from.c; s.caught = true; s.line = 'C caught R.';
    } else {
      s.cop = e.at.c; s.robber = e.at.r; s.done = true; s.line = 'R gets away forever.';
    }
    return s;
  }
  const start = q.mode === 'playground' ? b.moves[0] ?? null : b.start, moves = q.mode === 'playground' ? b.moves.slice(1) : b.moves;
  const budget = q.mode === 'playground' ? MAX_PLAY : q.budget;
  if (q.mode !== 'playground') s.pips = {used: moves.length, of: budget};
  const c = chase(G, start, moves);
  if (!c.placed) { s.tray = 'C'; G.ids.forEach((x, i) => s.taps.set(i, {type: 'start', at: x})); return s; }
  s.cop = c.c; s.robber = c.caught ? c.rFrom : c.r; s.copFrom = c.cFrom; s.robberFrom = c.caught ? null : c.rFrom;
  if (c.caught) { s.caught = true; s.line = 'C caught R.'; }
  else if (c.used >= budget) { s.over = true; if (q.mode !== 'playground') s.line = 'Out of moves.'; }
  else for (const c2 of G.nb[c.c]) s.taps.set(c2, {type: 'move', to: id(c2)});
  return s;
}

// --- Moves --------------------------------------------------------------------
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  let next = null;
  if (q.mode === 'playground' && action.type === 'map') {
    if (typeof action.map === 'string' && Object.hasOwn(q.maps, action.map) && action.map !== b.map) next = {map: action.map, side: b.side, moves: []};
  } else if (q.mode === 'playground' && action.type === 'side') {
    if (['cop', 'robber'].includes(action.side) && action.side !== b.side) next = {map: b.map, side: action.side, moves: []};
  } else if (q.mode === 'roads' && ['add', 'remove', 'play', 'edit'].includes(action.type)) {
    if (b.cant !== null) return null;
    if (action.type === 'play' && !b.play) next = {...b, play: true};
    else if (action.type === 'edit' && b.play) next = {...b, play: false, start: null, moves: []};
    else if (!b.play && Array.isArray(action.road) && action.road.length === 2 && isId(q, action.road[0]) && isId(q, action.road[1]) && action.road[0] !== action.road[1]) {
      const road = roadOf(q, ...action.road), have = b.added.some(r => sameRoad(r, road));
      if (action.type === 'add' && !have && !hasRoad(q, road) && b.added.length < q.add) next = {...b, added: [...b.added, road]};
      if (action.type === 'remove' && have) next = {...b, added: b.added.filter(r => !sameRoad(r, road))};
    }
  } else if (action.type === 'cant') {
    if (!q.cant || b.cant !== null || (q.mode === 'roads' && b.added.length !== q.add)) return null;
    next = {...b, cant: []};
  } else {
    const s = sceneOf(p, b), tap = [...s.taps.values()].find(t => t.type === action.type && (t.at ?? t.to) === (action.at ?? action.to));
    if (!tap) return null;
    if (q.mode === 'playground') next = {...b, moves: [...b.moves, tap.at ?? tap.to]};
    else if (s.role === 'robber') next = q.mode === 'escape' ? {answers: [...b.answers, tap.at]} : {...b, cant: [...b.cant, tap.at]};
    else if (tap.type === 'start') next = {...b, start: tap.at};
    else next = {...b, moves: [...b.moves, tap.to]};
  }
  return next && valid(p, next) ? next : null;
}

// --- Hints --------------------------------------------------------------------
// Words for a step on the drawn map.
const DIRECTIONS = ['right', 'down and right', 'down', 'down and left', 'left', 'up and left', 'up', 'up and right'];
export function stepWords(spec, from, to) {
  const [x1, y1] = spec.nodes[from], [x2, y2] = spec.nodes[to], h = 100 / (spec.aspect || 1.4);
  const turn = Math.round(Math.atan2((y2 - y1) * h, (x2 - x1) * 100) / (Math.PI / 4));
  return `one step ${DIRECTIONS[(turn + 8) % 8]}`;
}
const moveWords = (piece, spec, from, to, onto) => to === onto ? `Move ${piece} onto R.` : from === to ? `Keep ${piece} where it is.` : `Move ${piece} ${stepWords(spec, from, to)}.`;
const robberWin = G => bestValue(G) === game.INF;
const isGood = (q, added) => goodSets(q).some(set => set.length === added.length && set.every(r => added.some(a => sameRoad(a, r))));
function chaseHint(p, b, s) {
  const q = p.parameters, G = s.G, id = i => G.ids[i];
  // Roads that let R hold out: back to the roads, whose hints add, take away or press Can't.
  if (q.mode === 'roads' && !isGood(q, b.added)) return {type: 'move', action: {type: 'edit'}, text: 'R can hold out against these roads. Press Roads.'};
  if (q.mode === 'catch' && q.cant && robberWin(G) && s.cop !== null) return {type: 'move', action: {type: 'cant'}, text: 'R can always get away on this map. Press Can’t.'};
  if (s.tray === 'C') {
    const best = game.bestStarts(G).sort((x, y) => game.distances(G)[x].reduce((t, d) => t + d, 0) - game.distances(G)[y].reduce((t, d) => t + d, 0))[0];
    return {type: 'move', action: {type: 'start', at: id(best)}, text: 'Start C on the ringed dot.', dot: best};
  }
  if (s.caught) return {type: 'done'};
  if (s.over) return {type: 'deadend', text: 'Undo or restart to try again.'};
  const left = s.pips.of - s.pips.used, {V} = game.oneCop(G);
  if (V[s.cop][s.robber] > left) return {type: 'deadend', quiet: true, text: 'R can now hold out longer than your moves. Undo your last move.'};
  const to = game.copMoves(G, s.cop, s.robber)[0];
  return {type: 'move', action: {type: 'move', to: id(to)}, text: moveWords('C', s.spec, id(s.cop), id(to), id(s.robber)), dot: to};
}
function escapeHint(p, b, s) {
  const q = p.parameters, G = s.G, id = i => G.ids[i];
  if (q.mode === 'playground') return {type: 'done'};
  const cantNow = q.mode !== 'escape';
  if (s.caught) return {type: 'deadend', text: cantNow && !robberWin(G) ? 'C can always catch R here. Restart and catch R.' : 'Undo or restart to try again.'};
  if (s.tray === 'R') {
    const at = game.escapePlaces(G, s.cop)[0];
    if (at === undefined) return {type: 'deadend', quiet: true, text: 'C can always catch R here. Restart and catch R.'};
    return {type: 'move', action: {type: 'r', at: id(at)}, text: 'Put R far from C.', dot: at};
  }
  const to = game.escapeReplies(G, s.cop, s.robber)[0];
  if (to === undefined) return {type: 'deadend', quiet: true, text: cantNow && !robberWin(G) ? 'C can always catch R here. Restart and catch R.' : 'C can now always catch R. Undo your last move.'};
  return {type: 'move', action: {type: 'r', at: id(to)}, text: moveWords('R', s.spec, id(s.robber), id(to), null), dot: to};
}
// Roads: keep as many of the child's roads as a working set allows.
function roadsHint(p, b) {
  const q = p.parameters, sets = goodSets(q);
  if (!sets.length) {
    if (b.added.length < q.add) {
      const road = roadSets(q, 1).find(set => set.length === 1 && !b.added.some(a => sameRoad(a, set[0])))[0];
      return {type: 'move', action: {type: 'add', road}, text: 'Add a road across the ring.', road};
    }
    return {type: 'move', action: {type: 'cant'}, text: 'Whichever road you add, R can still run around four dots. Press Can’t.'};
  }
  const kept = set => set.filter(r => b.added.some(a => sameRoad(a, r))).length;
  const best = sets.reduce((top, set) => kept(set) - set.length > kept(top) - top.length ? set : top, sets[0]);
  const wrong = [...b.added].reverse().find(a => !best.some(r => sameRoad(a, r)));
  if (wrong) return {type: 'move', action: {type: 'remove', road: wrong}, text: wrong === b.added.at(-1) ? 'Take away your newest road.' : 'Take away your first road.', road: wrong};
  const missing = best.find(r => !b.added.some(a => sameRoad(a, r)));
  if (missing) {
    const shares = b.added.some(a => a.includes(missing[0]) || a.includes(missing[1]));
    return {type: 'move', action: {type: 'add', road: missing}, text: b.added.length && shares ? 'Add a road from one end of your road.' : 'Add a road across the ring.', road: missing};
  }
  return {type: 'move', action: {type: 'play'}, text: 'Press Play.'};
}
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b) || solved(p, b)) return {type: 'done'};
  const s = sceneOf(p, b);
  if (s.role === 'roads') return roadsHint(p, b);
  return s.role === 'robber' ? escapeHint(p, b, s) : chaseHint(p, b, s);
}

// --- View state ---------------------------------------------------------------
// The dot picked for a new road, and a refusal of a road past the budget.
// Both belong to the board they were drawn for.
const uiState = new Map();
function ui(p) { if (!uiState.has(p.id)) uiState.set(p.id, {pick: null, full: null}); return uiState.get(p.id); }
const current = (p, b, field) => ui(p)[field] && ui(p)[field].at === JSON.stringify(b) ? ui(p)[field].value : null;
// What a tap on a dot does while roads are being added.
export function roadTap(q, b, pick, id) {
  if (pick === null || pick === id) return {pick: pick === id ? null : id};
  const road = roadOf(q, pick, id);
  if (b.added.some(r => sameRoad(r, road))) return {move: {type: 'remove', road}};
  if (hasRoad(q, road)) return {pick: id};
  if (b.added.length >= q.add) return {full: true};
  return {move: {type: 'add', road}};
}

// --- Drawing ------------------------------------------------------------------
const f = n => Number(n.toFixed(2));
// Tokens: C in sky, R in rose, side by side when they share a dot.
const SPOTS = {1: [[0, 0]], 2: [[-0.7, 0], [0.7, 0]], 3: [[-0.7, -0.45], [0.7, -0.45], [0, 0.72]]};
export function tokens(g, list) {
  const r = NODE_R * g.k;
  return list.map(t => {
    const here = list.filter(o => o.at === t.at && !o.ghost === !t.ghost), [cx, cy] = g.pos[t.at];
    const [dx, dy] = SPOTS[Math.min(here.length, 3)][here.indexOf(t)], size = here.length === 1 ? 1.04 : 0.8;
    const cls = `cp-token ${t.kind}${t.mine ? ' mine' : ''}${t.cls ? ` ${t.cls}` : ''}${t.ghost ? ' ghost' : ''}`;
    return `<g class="cp-glide" data-token="${t.name}"${t.ghost ? '' : ` data-at="${esc(t.at)}"`}><g class="${cls}" transform="translate(${f(cx + dx * r)},${f(cy + dy * r)}) scale(${f(size * g.k)})"><circle r="${NODE_R}"/><text y="${f(NODE_R * (t.name.length > 1 ? .3 : .38))}"${t.name.length > 1 ? ' class="two"' : ''}>${t.name}</text></g></g>`;
  }).join('');
}
// The road a piece just took (dot ids), drawn soft under the tokens.
export function trail(g, from, to, kind) {
  if (from === null || from === undefined || from === to) return '';
  const [x1, y1] = g.pos[from], [x2, y2] = g.pos[to];
  return `<line class="cp-trail ${kind}" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"/>`;
}
export const withTop = (svg, layer) => svg.replace(/<\/svg>$/, `<g class="cp-top" aria-hidden="true">${layer}</g></svg>`);
export const trayToken = (name, kind) => `<span class="cp-tray ${kind}" role="img" aria-label="${name} to place"><svg viewBox="-7 -7 14 14"><circle r="6"/><text y="2.2">${name}</text></svg></span>`;
export const pips = (used, of) => `<span class="cp-pips" role="img" aria-label="${used} of ${of} ${of === 1 ? 'move' : 'moves'} used">${Array.from({length: of}, (_, k) => `<i class="${k < used ? 'on' : ''}"></i>`).join('')}</span>`;
export const button = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary cp-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="cp-${esc(action.type)}${action.map ? `-${esc(action.map)}` : ''}${action.side ? `-${action.side}` : ''}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const tapWords = (t, here) => t.type === 'start' ? 'Put C here' : t.type === 'move' ? (here === 'C' ? 'Keep C here' : here === 'R' ? 'Catch R here' : 'Move C here') : t.type === 'r' ? (here === 'R' ? 'Keep R here' : here === null ? 'Put R here' : 'Move R here') : '';

function render(p, a) {
  const q = p.parameters, b = a.board, done = solved(p, b), s = sceneOf(p, b), spec = s.spec, G = s.G, g = boardOf(spec);
  const h = a.hintLevel >= 2 && !done && q.mode !== 'playground' ? hint(p, b) : null, act = h?.type === 'move' ? h.action : null;
  const roads = s.role === 'roads', pick = roads ? current(p, b, 'pick') : null, full = roads ? current(p, b, 'full') : null;
  const baseRoads = q.mode === 'roads' ? q.roads.length : spec.roads.length;
  const placing = s.tray !== null, cantMode = q.mode !== 'playground' && q.mode !== 'escape' && b.cant !== null;
  const live = !done && !s.caught;
  const node = x => {
    const i = G.index[x], tap = live ? s.taps.get(i) : null, here = s.cop === i ? 'C' : s.robber === i ? 'R' : null;
    const hinted = h?.dot === i || (act?.road && act.road.includes(x));
    if (roads) {
      const r = live ? roadTap(q, b, pick, x) : null;
      const words = !r ? '' : r.move?.type === 'add' ? `. Add a road from ${pick} to here` : r.move?.type === 'remove' ? `. Take away the road from ${pick} to here` : r.pick === null ? '. Let go of it' : r.pick ? '. Choose it' : '';
      return {cls: [pick === x ? 'picked' : '', hinted ? 'hinted' : ''].join(' '), text: '', act: Boolean(r), label: `Dot ${x}${pick === x ? ', chosen' : ''}${words}`};
    }
    const on = [s.cop === i ? 'C' : '', s.robber === i ? 'R' : ''].filter(Boolean);
    return {cls: [tap ? 'can-go' : '', hinted ? 'hinted' : ''].join(' '), text: '', act: Boolean(tap), label: `Dot ${x}${on.length ? `, ${on.join(' and ')} ${on.length > 1 ? 'are' : 'is'} here` : ''}${tap ? `. ${tapWords(tap, here)}` : ''}`};
  };
  const edge = i => {
    const [u, v] = spec.roads[i], added = i >= baseRoads;
    if (roads) return {cls: [added ? 'added' : '', act?.road && sameRoad(act.road, [u, v]) ? 'hinted' : ''].join(' '), act: added && live, label: `Road from ${u} to ${v}${added ? ', new' : ''}${added && live ? '. Take it away' : ''}`};
    const from = s.role === 'robber' ? s.robber : s.cop;
    const end = from === null ? null : G.ids[from] === u ? v : G.ids[from] === v ? u : null, tap = end !== null && live ? s.taps.get(G.index[end]) : null;
    return {cls: added ? 'added' : '', act: Boolean(tap), label: `Road from ${u} to ${v}${tap ? `. ${tapWords(tap, null)} to ${end}` : ''}`};
  };
  const list = [];
  if (s.cop !== null) list.push({name: 'C', kind: 'cC', at: G.ids[s.cop], mine: s.role === 'cop' && live, cls: s.copFrom === s.cop ? 'stayed' : ''});
  if (s.robber !== null) list.push({name: 'R', kind: 'cR', at: G.ids[s.robber], mine: s.role === 'robber' && live, cls: [s.robberFrom === s.robber ? 'stayed' : '', s.caught ? 'caught' : ''].join(' ').trim()});
  const nm = i => i === null || i === undefined ? null : G.ids[i];
  const over = trail(g, nm(s.copFrom), nm(s.cop), 'cC') + trail(g, nm(s.robberFrom), nm(s.robber), 'cR');
  const svg = graphBoard(g, {cls: `cp-map${q.small ? ' small' : ''}`, label: 'Map of roads', node, edge, over});
  const board = withTop(svg, tokens(g, list));
  // The bar above the board: the piece to place, the moves, and the buttons.
  const bar = [];
  if (q.mode === 'playground') {
    bar.push(`<div class="cp-maps" role="group" aria-label="Map">${Object.keys(q.maps).map(m => `<button type="button" class="secondary cp-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'map', map: m}))}" data-focus="cp-map-${m}" aria-pressed="${b.map === m}" aria-label="${esc(q.maps[m].name)}">${graphMini(boardOf(q.maps[m]), {label: q.maps[m].name})}</button>`).join('')}</div>`);
    bar.push(`<div class="cp-bar"><div class="cp-sides" role="group" aria-label="Play as">${['cop', 'robber'].map(side => `<button type="button" class="cp-side ${side === 'cop' ? 'cC' : 'cR'}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'side', side}))}" data-focus="cp-side-${side}" aria-pressed="${b.side === side}" aria-label="Play ${side === 'cop' ? 'C' : 'R'}">${side === 'cop' ? 'C' : 'R'}</button>`).join('')}</div>${placing ? trayToken(s.tray, s.tray === 'C' ? 'cC' : 'cR') : ''}</div>`);
  } else if (!done) {
    const items = [];
    if (placing) items.push(trayToken(s.tray, s.tray === 'C' ? 'cC' : 'cR'));
    if (roads) items.push(pips(b.added.length, q.add).replace('cp-pips', 'cp-pips roads').replace(/move(s)? used/, `new road${q.add === 1 ? '' : 's'}`));
    else if (s.pips && !cantMode) items.push(pips(s.pips.used, s.pips.of));
    if (q.mode === 'roads' && !cantMode) items.push(roads ? button('Play', {type: 'play'}, 'cp-play', true, act?.type === 'play') : button('Roads', {type: 'edit'}, 'cp-edit', true, act?.type === 'edit'));
    if (q.cant && !cantMode) items.push(button('Can’t', {type: 'cant'}, 'cp-cant', q.mode !== 'roads' || b.added.length === q.add, act?.type === 'cant'));
    if (items.length) bar.push(`<div class="cp-bar">${items.join('')}</div>`);
  }
  const line = full ? 'No more new roads.' : s.line;
  const where = s.role === 'roads' ? `${b.added.length} of ${q.add} new ${q.add === 1 ? 'road' : 'roads'}${pick ? `. ${pick} is chosen` : ''}.` : `${s.cop === null ? '' : `C on ${G.ids[s.cop]}`}${s.robber === null ? '' : `, R on ${G.ids[s.robber]}`}${s.copFrom === s.cop && s.copFrom !== null ? '. C stays' : ''}${s.robberFrom === s.robber && s.robberFrom !== null ? '. R stays' : ''}.${s.pips && !cantMode ? ` ${s.pips.used} of ${s.pips.of} moves used.` : ''}`;
  const status = `${where}${line ? ` ${line}` : ''}`;
  return `<div class="cp-puzzle${done ? ' solved' : ''}" data-mechanic-wire="cops">${bar.join('')}${board}${line ? `<p class="cp-told">${esc(line)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}

// Pieces glide along the road they took: C first, then R. A jump (C going
// back to try another move) and a re-render for any other reason stay still.
const lastDrawn = new Map();
export function glide(root, id) {
  const now = [...root.querySelectorAll('.cp-glide[data-at]')].map(el => [el.dataset.token, el.dataset.at]);
  const key = JSON.stringify(now), before = lastDrawn.get(id);
  lastDrawn.set(id, {key, at: Object.fromEntries(now), pos: Object.fromEntries([...root.querySelectorAll('.cp-glide[data-at]')].map(el => [el.dataset.token, el.querySelector('.cp-token').getAttribute('transform')]))});
  if (!before || before.key === key || globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const order = ['C', 'C1', 'C2', 'R'];
  let delay = 0;
  for (const name of order) {
    const el = root.querySelector(`.cp-glide[data-token="${name}"]`), was = before.pos[name], is = el?.querySelector('.cp-token').getAttribute('transform');
    if (!el || !was || was === is || before.at[name] === undefined) continue;
    const parse = t => t.match(/translate\(([-\d.]+),([-\d.]+)\)/).slice(1).map(Number), [x0, y0] = parse(was), [x1, y1] = parse(is);
    el.animate?.([{transform: `translate(${x0 - x1}px,${y0 - y1}px)`}, {transform: `translate(${x0 - x1}px,${y0 - y1}px)`, offset: delay ? 0.5 : 0}, {transform: 'none'}], {duration: delay ? 520 : 260, easing: 'ease-in-out'});
    delay += 260;
  }
}

// A quick double tap would put a piece down (or move it) and then count the
// second tap, on the piece's new dot, as staying: a move spent by accident.
// A tap on the moving piece's own dot just after a move is ignored.
const QUICK = 500, lastMove = new Map();
const quick = id => Date.now() - (lastMove.get(id) || 0) < QUICK;
function wire(root, p, api) {
  const now = () => api.attempt().board;
  const apply = action => { lastMove.set(p.id, Date.now()); api.apply(action); };
  wireGraph(root, {
    node: x => {
      const b = now();
      if (solved(p, b)) return null;
      const s = sceneOf(p, b);
      if (s.role === 'roads') {
        const r = roadTap(p.parameters, b, current(p, b, 'pick'), x);
        if (r.move) return r.move;
        if (r.full) api.ui({full: true, at: JSON.stringify(b)});
        else api.ui({pick: r.pick, at: JSON.stringify(b)});
        return null;
      }
      const own = s.role === 'robber' ? s.robber : s.cop;
      if (own !== null && s.G.index[x] === own && quick(p.id)) return null;
      return s.taps.get(s.G.index[x]) || null;
    },
    edge: i => {
      const b = now();
      if (solved(p, b)) return null;
      const s = sceneOf(p, b), [u, v] = s.spec.roads[i];
      if (s.role === 'roads') return i >= p.parameters.roads.length ? {type: 'remove', road: [u, v]} : null;
      const from = s.role === 'robber' ? s.robber : s.cop;
      if (from === null) return null;
      const end = s.G.ids[from] === u ? v : s.G.ids[from] === v ? u : null;
      return end === null ? null : s.taps.get(s.G.index[end]) || null;
    }
  }, apply);
  glide(root, p.id);
}

export const copsMechanic = {
  fresh, valid, solved, move, hint, render, wire,
  ui(p, payload) {
    if (!object(payload) || typeof payload.at !== 'string') return;
    if (Object.hasOwn(payload, 'pick')) { ui(p).pick = {value: payload.pick, at: payload.at}; ui(p).full = null; }
    if (payload.full) ui(p).full = {value: true, at: payload.at};
  },
  reset: p => { uiState.delete(p.id); lastDrawn.delete(p.id); },
  noHint: p => p.parameters.mode === 'playground',
  // After Can't the child plays R, so the line above the board says so.
  objective: (p, b) => ['catch', 'roads'].includes(p.parameters.mode) && object(b) && Array.isArray(b.cant) ? 'Keep R away from C forever.' : undefined
};

// --- Folds (copsfold) ---------------------------------------------------------
// Tap v, then u: v folds into u when u reaches every dot v reaches, by staying
// or taking one road. v and its roads leave the map. A map folds to one dot
// exactly when one cop catches R from every start, and every order of folds
// ends the same way, so Can't (no fold left, more than one dot) is judged on
// the child's own map. Board: {folds: [[v, u], …], claim: null | 'refused' |
// 'stuck'}; a refusal stands until the next fold.
export function foldState(q, folds) {
  const G = gameOf(q), gone = new Set();
  if (!Array.isArray(folds)) return null;
  for (const pair of folds) {
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const [v, u] = pair.map(id => G.index[id]);
    if (v === undefined || u === undefined || v === u || gone.has(v) || gone.has(u) || game.missed(G, gone, v, u) >= 0) return null;
    gone.add(v);
  }
  return {G, gone, left: G.n - gone.size, open: game.folds(G, gone)};
}
const foldFresh = () => ({folds: [], claim: null});
function foldValid(p, b) {
  if (!keys(b, ['folds', 'claim']) || ![null, 'refused', 'stuck'].includes(b.claim)) return false;
  const st = foldState(p.parameters, b.folds);
  if (!st) return false;
  if (b.claim === 'refused') return st.open.length > 0;
  if (b.claim === 'stuck') return st.open.length === 0 && st.left > 1;
  return true;
}
const foldSolved = (p, b) => foldValid(p, b) && (b.claim === 'stuck' || foldState(p.parameters, b.folds).left === 1);
function foldMove(p, b, action) {
  if (!foldValid(p, b) || foldSolved(p, b) || !object(action)) return null;
  const st = foldState(p.parameters, b.folds);
  if (action.type === 'fold') {
    const next = {folds: [...b.folds, [action.v, action.u]], claim: null};
    return foldValid(p, next) ? next : null;
  }
  if (action.type === 'cant' && b.claim === null) return {...b, claim: st.open.length ? 'refused' : 'stuck'};
  return null;
}
// The fold to suggest: a dot with the fewest roads first, into the
// neighbour with the most.
function bestFold(st) {
  const deg = v => st.G.nb[v].filter(w => !st.gone.has(w)).length;
  return [...st.open].sort((x, y) => deg(x[0]) - deg(y[0]) || deg(y[1]) - deg(x[1]) || x[0] - y[0] || x[1] - y[1])[0];
}
function foldHint(p, b) {
  if (!foldValid(p, b) || foldSolved(p, b)) return {type: 'done'};
  const st = foldState(p.parameters, b.folds), id = i => st.G.ids[i];
  if (!st.open.length) return {type: 'move', action: {type: 'cant'}, text: 'No dot can fold. Press Can’t.'};
  const [v, u] = bestFold(st);
  return {type: 'move', action: {type: 'fold', v: id(v), u: id(u)}, text: `Fold ${id(v)} into ${id(u)}.`, dots: [v, u]};
}
// What a tap on a dot does: choose it, let it go, fold the chosen dot into
// it, or say which dot it misses.
export function foldTap(q, b, pick, x) {
  const st = foldState(q, b.folds), i = st.G.index[x];
  if (st.gone.has(i)) return null;
  if (pick === null || pick === x) return {pick: pick === x ? null : x};
  const v = st.G.index[pick], w = game.missed(st.G, st.gone, v, i);
  return w < 0 ? {move: {type: 'fold', v: pick, u: x}} : {told: {v: pick, u: x, w: st.G.ids[w]}};
}
const foldUi = new Map();
function fui(p) { if (!foldUi.has(p.id)) foldUi.set(p.id, {pick: null, told: null}); return foldUi.get(p.id); }
const fcurrent = (p, b, field) => fui(p)[field] && fui(p)[field].at === JSON.stringify(b) ? fui(p)[field].value : null;
function foldRender(p, a) {
  const q = p.parameters, b = a.board, done = foldSolved(p, b), st = foldState(q, b.folds), g = boardOf(q), G = st.G;
  const h = a.hintLevel >= 2 && !done ? foldHint(p, b) : null;
  const pick = done ? null : fcurrent(p, b, 'pick'), told = done ? null : fcurrent(p, b, 'told');
  const node = x => {
    const i = G.index[x], gone = st.gone.has(i), r = done || gone ? null : foldTap(q, b, pick, x);
    const words = !r ? '' : r.move ? `. Fold ${pick} into ${x}` : r.told ? `. Fold ${pick} into ${x}` : r.pick === null ? '. Let go of it' : '. Choose it';
    const cls = [gone ? 'gone' : '', pick === x ? 'picked' : '', told?.w === x ? 'missed' : '', told?.u === x ? 'tried' : '', h?.dots?.includes(i) ? 'hinted' : ''].join(' ');
    return {cls, text: esc(x), act: Boolean(r), label: `Dot ${x}${gone ? ', folded' : ''}${pick === x ? ', chosen' : ''}${words}`};
  };
  const edge = i => { const [u, v] = q.roads[i], gone = st.gone.has(G.index[u]) || st.gone.has(G.index[v]); return {cls: gone ? 'gone' : '', label: `Road from ${u} to ${v}${gone ? ', folded' : ''}`}; };
  const board = graphBoard(g, {cls: `cp-map cp-folds${q.small ? ' small' : ''}`, label: 'Map of roads', node, edge});
  const cant = done ? '' : `<div class="cp-bar">${button('Can’t', {type: 'cant'}, 'cp-cant', b.claim === null, h?.action?.type === 'cant')}</div>`;
  const line = told ? `${told.u} can’t reach ${told.w}.` : b.claim === 'refused' ? 'There is a fold.' : b.claim === 'stuck' ? 'No dot can fold.' : '';
  const status = `${st.left} ${st.left === 1 ? 'dot' : 'dots'} left${b.folds.length ? `. Folded: ${b.folds.map(([v, u]) => `${v} into ${u}`).join(', ')}` : ''}${pick ? `. ${pick} is chosen` : ''}.${line ? ` ${line}` : ''}`;
  return `<div class="cp-puzzle${done ? ' solved' : ''}" data-mechanic-wire="copsfold">${cant}${board}${line ? `<p class="cp-told">${esc(line)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function foldWire(root, p, api) {
  wireGraph(root, {
    node: x => {
      const b = api.attempt().board;
      if (foldSolved(p, b)) return null;
      const r = foldTap(p.parameters, b, fcurrent(p, b, 'pick'), x);
      if (!r) return null;
      if (r.move) return r.move;
      // A refused fold lets the chosen dot go; the line and rings stay until the next tap.
      api.ui({...(r.told ? {told: r.told, pick: null} : {pick: r.pick}), at: JSON.stringify(b)});
      return null;
    }
  }, api.apply);
}
export const foldMechanic = {
  fresh: foldFresh, valid: (p, b) => object(b) && foldValid(p, b), solved: foldSolved, move: foldMove, hint: foldHint, render: foldRender, wire: foldWire,
  ui(p, payload) {
    if (!object(payload) || typeof payload.at !== 'string') return;
    fui(p).pick = Object.hasOwn(payload, 'pick') ? {value: payload.pick, at: payload.at} : null;
    fui(p).told = payload.told ? {value: payload.told, at: payload.at} : null;
  },
  reset: p => { foldUi.delete(p.id); },
  // Undo takes back folds, not a refused Can't: while the map is the same,
  // "There is a fold." stands.
  carry(p, from, to) {
    if (!object(from) || !object(to) || from.claim !== 'refused' || JSON.stringify(from.folds) !== JSON.stringify(to.folds)) return to;
    return {...to, claim: 'refused'};
  }
};

// --- Two cops (copstwo) -------------------------------------------------------
// Both cops start on q.start. On a cop turn each cop stays or takes one road,
// then R moves. Board: {moves: [[c1, c2], …]}; R's start and replies follow
// from the perfect robber.
export function twoChase(G, start, moves) {
  const s = G.index[start];
  let a = s, c = s, r = game.robberPlace2(G, s, s), caught = false, from = null, rFrom = null;
  for (const pair of moves) {
    if (caught || !Array.isArray(pair) || pair.length !== 2) return null;
    const [a2, c2] = pair.map(id => G.index[id]);
    if (a2 === undefined || c2 === undefined || !G.adj[a][a2] || !G.adj[c][c2]) return null;
    from = [a, c]; a = a2; c = c2; rFrom = r;
    if (a2 === r || c2 === r) caught = true; else r = game.robberReply2(G, a2, c2, r);
  }
  return {a, c, r: caught ? rFrom : r, caught, from, rFrom: caught ? null : rFrom, used: moves.length};
}
const twoFresh = () => ({moves: []});
function twoValid(p, b) {
  const q = p.parameters;
  return keys(b, ['moves']) && Array.isArray(b.moves) && b.moves.length <= q.budget && twoChase(gameOf(q), q.start, b.moves) !== null;
}
const twoSolved = (p, b) => twoValid(p, b) && twoChase(gameOf(p.parameters), p.parameters.start, b.moves).caught;
function twoMove(p, b, action) {
  if (!twoValid(p, b) || twoSolved(p, b) || !object(action) || action.type !== 'go' || b.moves.length >= p.parameters.budget) return null;
  const next = {moves: [...b.moves, [action.c1, action.c2]]};
  if (!twoValid(p, next)) return null;
  tui(p).chosen = 'C1';
  return next;
}
function twoHint(p, b) {
  const q = p.parameters;
  if (!twoValid(p, b) || twoSolved(p, b)) return {type: 'done'};
  const G = gameOf(q), t = twoChase(G, q.start, b.moves), id = i => G.ids[i], left = q.budget - t.used;
  if (left <= 0) return {type: 'deadend', text: 'Undo or restart to try again.'};
  if (game.twoCops(G).V[t.a][t.c][t.r] > left) return {type: 'deadend', quiet: true, text: 'R can now hold out longer than your moves. Undo your last move.'};
  const [a2, c2] = game.copMove2(G, t.a, t.c, t.r);
  const words = (name, from, to) => to === t.r ? `move ${name} onto R` : from === to ? `keep ${name} where it is` : `move ${name} ${stepWords(q, id(from), id(to))}`;
  const text = `${words('C1', t.a, a2)} and ${words('C2', t.c, c2)}.`;
  return {type: 'move', action: {type: 'go', c1: id(a2), c2: id(c2)}, text: text[0].toUpperCase() + text.slice(1), dots: [a2, c2]};
}
// The move being planned: each cop's dot, chosen with C1 or C2 and a tap.
const twoUi = new Map();
function tui(p) { if (!twoUi.has(p.id)) twoUi.set(p.id, {chosen: 'C1', plan: null}); return twoUi.get(p.id); }
const planFor = (p, b) => tui(p).plan && tui(p).plan.at === JSON.stringify(b) ? tui(p).plan.value : {C1: null, C2: null};
// A tap on a dot plans the chosen cop's move there, or the other cop's when
// only it can reach the dot; then the cop without a plan is chosen.
export function twoTap(G, t, chosen, plan, x) {
  const i = G.index[x], at = {C1: t.a, C2: t.c}, other = chosen === 'C1' ? 'C2' : 'C1';
  const who = G.adj[at[chosen]][i] ? chosen : G.adj[at[other]][i] ? other : null;
  if (!who) return null;
  const next = {...plan, [who]: x};
  return {plan: next, chosen: next[other === who ? chosen : other] === null ? (other === who ? chosen : other) : who};
}
function twoRender(p, a) {
  const q = p.parameters, b = a.board, done = twoSolved(p, b), G = gameOf(q), g = boardOf(q), t = twoChase(G, q.start, b.moves), id = i => G.ids[i];
  const live = !done && t.used < q.budget, h = a.hintLevel >= 2 && !done ? twoHint(p, b) : null;
  const chosen = tui(p).chosen, plan = live ? planFor(p, b) : {C1: null, C2: null};
  const node = x => {
    const i = G.index[x], r = live ? twoTap(G, t, chosen, plan, x) : null, on = [t.a === i ? 'C1' : '', t.c === i ? 'C2' : '', t.r === i ? 'R' : ''].filter(Boolean);
    const who = r ? Object.keys(r.plan).find(k => r.plan[k] === x && plan[k] !== x) || chosen : null;
    return {cls: [r ? 'can-go' : '', h?.dots?.includes(i) ? 'hinted' : ''].join(' '), text: '', act: Boolean(r), label: `Dot ${x}${on.length ? `, ${on.join(' and ')} ${on.length > 1 ? 'are' : 'is'} here` : ''}${r ? `. Plan ${who} here` : ''}`};
  };
  const list = [
    {name: 'C1', kind: 'cC', at: id(t.a), mine: live && chosen === 'C1', cls: t.from && t.from[0] === t.a ? 'stayed' : ''},
    {name: 'C2', kind: 'cC', at: id(t.c), mine: live && chosen === 'C2', cls: t.from && t.from[1] === t.c ? 'stayed' : ''},
    {name: 'R', kind: 'cR', at: id(t.r), cls: [t.rFrom === t.r && t.rFrom !== null ? 'stayed' : '', t.caught ? 'caught' : ''].join(' ').trim()}
  ];
  const ghosts = ['C1', 'C2'].filter(k => plan[k] !== null && plan[k] !== id(k === 'C1' ? t.a : t.c)).map(k => ({name: k, kind: 'cC', at: plan[k], ghost: true}));
  const nm = i => i === null || i === undefined ? null : id(i);
  const over = (t.from ? trail(g, nm(t.from[0]), nm(t.a), 'cC') + trail(g, nm(t.from[1]), nm(t.c), 'cC') : '') + trail(g, nm(t.rFrom), nm(t.r), 'cR') + ghosts.map(gh => trail(g, nm(gh.name === 'C1' ? t.a : t.c), gh.at, 'plan')).join('');
  const board = withTop(graphBoard(g, {cls: `cp-map${q.small ? ' small' : ''}`, label: 'Map of roads', node, over}), tokens(g, [...ghosts, ...list]));
  const chips = `<div class="cp-chips" role="group" aria-label="Cops">${['C1', 'C2'].map(k => `<button type="button" class="cp-chip cC" data-action="mechanic-ui" data-ui='${JSON.stringify({chosen: k})}' data-focus="cp-chip-${k}" aria-pressed="${chosen === k}" aria-label="Cop ${k}${plan[k] ? `, planned to ${plan[k]}` : ''}">${k}</button>`).join('')}</div>`;
  const go = {type: 'go', c1: plan.C1 ?? id(t.a), c2: plan.C2 ?? id(t.c)};
  const bar = done ? '' : `<div class="cp-bar">${live ? chips : ''}${pips(t.used, q.budget)}${live ? button('Go', go, 'cp-go', true, h?.type === 'move') : ''}</div>`;
  const line = t.caught ? 'C caught R.' : t.used >= q.budget ? 'Out of moves.' : '';
  const status = `C1 on ${id(t.a)}, C2 on ${id(t.c)}, R on ${id(t.r)}.${plan.C1 || plan.C2 ? ` Planned: ${['C1', 'C2'].filter(k => plan[k]).map(k => `${k} to ${plan[k]}`).join(', ')}.` : ''} ${t.used} of ${q.budget} moves used.${line ? ` ${line}` : ''}`;
  return `<div class="cp-puzzle${done ? ' solved' : ''}" data-mechanic-wire="copstwo">${bar}${board}${line ? `<p class="cp-told">${esc(line)}</p>` : ''}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
const lastPlan = new Map();
function twoWire(root, p, api) {
  wireGraph(root, {
    node: x => {
      const b = api.attempt().board, q = p.parameters;
      if (twoSolved(p, b) || b.moves.length >= q.budget) return null;
      // A quick second tap on the dot just planned would plan the other cop there too.
      const last = lastPlan.get(p.id);
      if (last && last.x === x && Date.now() - last.at < QUICK) return null;
      const G = gameOf(q), r = twoTap(G, twoChase(G, q.start, b.moves), tui(p).chosen, planFor(p, b), x);
      if (r) { lastPlan.set(p.id, {x, at: Date.now()}); api.ui({plan: r.plan, chosen: r.chosen, at: JSON.stringify(b)}); }
      return null;
    }
  }, api.apply);
  glide(root, p.id);
}
export const twoMechanic = {
  fresh: twoFresh, valid: (p, b) => object(b) && twoValid(p, b), solved: twoSolved, move: twoMove, hint: twoHint, render: twoRender, wire: twoWire,
  ui(p, payload) {
    if (!object(payload)) return;
    if (['C1', 'C2'].includes(payload.chosen)) tui(p).chosen = payload.chosen;
    if (object(payload.plan) && typeof payload.at === 'string') tui(p).plan = {value: payload.plan, at: payload.at};
  },
  reset: p => { twoUi.delete(p.id); lastDrawn.delete(p.id); }
};

// The family seam entry (dist/families.js).
export const copsMechanics = {cops: copsMechanic, copsfold: foldMechanic, copstwo: twoMechanic};
export default {
  id: 'cops',
  family: {id: 'cops', symbol: '◐', area: 'games', region: 'networks'},
  mechanics: copsMechanics,
  pack: new URL('./cops.json', import.meta.url).href,
  css: new URL('./cops.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.cp-chip,.cp-side,.cp-button:not([disabled])'
};
