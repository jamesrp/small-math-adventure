// Road detours (worksheet Week 39). A trip is a list of steps along the roads
// of a fixed map. Two steps cancel when they go along one road and straight
// back; cancelling removes both and keeps the rest in order, so the start and
// the end never change. However the cancelling is done, a trip always ends at
// the same shortest form (its reduced path). On a map with no loop every trip
// between two places shortens to the one direct route, so every trip home
// vanishes; on a ring a trip shortens to some number of whole turns; on two
// rings order matters, and a trip that goes round each ring once each way can
// keep every step (the commutator).
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, graphMini, wireGraph} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
export const MODES = ['shorten', 'make', 'every', 'playground'];
export const MAX_STEPS = 16;

// --- Maps and trips ----------------------------------------------------------
// A trip is the list of dots it visits, starting at its start; a map has no two
// roads between the same dots, so consecutive dots name each step.
export const mapOf = q => graphOf({nodes: q.nodes, edges: q.roads, aspect: q.aspect, scale: q.scale});
export const roadOf = (q, u, v) => q.roads.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));
export const neighbours = (q, id) => q.roads.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : []);
export const isTrip = (q, trip) => Array.isArray(trip) && trip.length >= 1 && trip.every(id => typeof id === 'string' && Object.hasOwn(q.nodes, id)) && trip.every((id, k) => k === 0 || roadOf(q, trip[k - 1], id) >= 0);
export const stepsOf = trip => trip.length - 1;
// Turning points: dots where the trip goes straight back along the same road.
// Cancelling at k removes the steps into and out of trip[k].
export const turns = trip => trip.flatMap((id, k) => k > 0 && k < trip.length - 1 && trip[k - 1] === trip[k + 1] ? [k] : []);
export const cancelAt = (trip, k) => [...trip.slice(0, k), ...trip.slice(k + 1 + 1)];
export const isReduced = trip => turns(trip).length === 0;
// The shortest form, by repeatedly cancelling the first turning point.
export function shorten(trip) {
  let t = [...trip];
  for (let k = turns(t)[0]; k !== undefined; k = turns(t)[0]) t = cancelAt(t, k);
  return t;
}
// How many times each road is used each way: [u→v, v→u] per road.
export function usage(q, trip) {
  const out = q.roads.map(() => [0, 0]);
  for (let k = 1; k < trip.length; k++) { const i = roadOf(q, trip[k - 1], trip[k]); out[i][q.roads[i][0] === trip[k - 1] ? 0 : 1]++; }
  return out;
}

// --- What a puzzle asks ------------------------------------------------------
// The trip a child makes (make and every) must start at q.start, end at
// q.finish, take q.min to q.max steps, and, when asked, use every road
// (everyRoad), use some roads exactly once each way (eachWay: their indices),
// or use a road from each group (groups, such as both rings). Then it is
// shortened, and the result must be: nothing ('empty'), no change ('kept'),
// or a given route.
export const maxOf = q => q.mode === 'playground' ? MAX_STEPS : q.max;
const eachWayOf = q => q.eachWay || [];
export function needs(q, trip) {
  const use = usage(q, trip), out = [];
  if (trip.at(-1) !== q.finish) out.push('finish');
  if (stepsOf(trip) < q.min || stepsOf(trip) > maxOf(q)) out.push('steps');
  if (q.everyRoad && use.some(([a, b]) => a + b === 0)) out.push('everyRoad');
  if (eachWayOf(q).some(i => use[i][0] !== 1 || use[i][1] !== 1)) out.push('eachWay');
  if (q.groups && q.groups.some(group => group.every(i => use[i][0] + use[i][1] === 0))) out.push('groups');
  return out;
}
export const fits = (q, trip) => needs(q, trip).length === 0;
export const resultOk = (q, input, result) => q.result === 'empty' ? result.length === 1 : q.result === 'kept' ? same(input, result) : Array.isArray(q.result) ? same(q.result, result) : true;
// Could this step be taken now? A road that is to be used once each way is
// never taken the same way twice.
export function canStep(q, trip, to) {
  const at = trip.at(-1), i = roadOf(q, at, to);
  if (i < 0 || stepsOf(trip) >= maxOf(q)) return false;
  if (!eachWayOf(q).includes(i)) return true;
  for (let k = 1; k < trip.length; k++) if (trip[k - 1] === at && trip[k] === to) return false;
  return true;
}

// Every trip that fits, and what they shorten to (small maps only).
const tripCache = new Map();
export function allTrips(q) {
  const key = JSON.stringify([q.roads, q.start, q.finish, q.min, q.max, q.everyRoad, q.eachWay, q.groups]);
  if (tripCache.has(key)) return tripCache.get(key);
  const out = [], dist = distances(q, q.finish);
  (function walk(trip) {
    if (fits(q, trip)) out.push([...trip]);
    for (const to of neighbours(q, trip.at(-1))) if (canStep(q, trip, to) && stepsOf(trip) + 1 + dist[to] <= maxOf(q)) walk([...trip, to]);
  })([q.start]);
  tripCache.set(key, out);
  return out;
}
const resultCache = new Map();
export function results(q) {
  const key = JSON.stringify([q.roads, q.start, q.finish, q.min, q.max, q.everyRoad, q.eachWay, q.groups]);
  if (resultCache.has(key)) return resultCache.get(key);
  const seen = new Map();
  for (const t of allTrips(q)) { const r = shorten(t); seen.set(r.join(), r); }
  const out = [...seen.values()].sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()));
  resultCache.set(key, out);
  return out;
}
// Fewest steps from every dot to `to`.
function distances(q, to) {
  const dist = {[to]: 0}, queue = [to];
  for (let k = 0; k < queue.length; k++) for (const v of neighbours(q, queue[k])) if (!Object.hasOwn(dist, v)) { dist[v] = dist[queue[k]] + 1; queue.push(v); }
  return dist;
}
// A trip that begins with `prefix`, fits, and whose result passes `want`, or
// null. Kept-result puzzles never turn straight back, which prunes the search.
export function complete(q, prefix, want) {
  const dist = distances(q, q.finish);
  return (function walk(trip) {
    if (fits(q, trip) && want(trip, shorten(trip))) return trip;
    for (const to of neighbours(q, trip.at(-1))) {
      if (!canStep(q, trip, to) || stepsOf(trip) + 1 + dist[to] > maxOf(q)) continue;
      if (q.result === 'kept' && trip.length > 1 && trip.at(-2) === to) continue;
      const found = walk([...trip, to]);
      if (found) return found;
    }
    return null;
  })([...prefix]);
}
// Can `trip` be reached from `input` by cancelling? Exactly when each step of
// `trip` can be matched, in order, to a step of `input` going the same way
// between the same dots, with every stretch of `input` between matched steps
// (and before the first and after the last) shortening to nothing: a
// cancelled pair never straddles a kept step.
export function reachable(input, trip) {
  if (input[0] !== trip[0]) return false;
  const n = input.length - 1, m = trip.length - 1, memo = new Map();
  const vanishes = (a, b) => shorten(input.slice(a, b + 1)).length === 1;
  // Trip steps 1..j are matched and step j is input step i (input[i] reached).
  const go = (j, i) => {
    if (j === m) return vanishes(i, n);
    const key = `${j},${i}`;
    if (!memo.has(key)) {
      let ok = false;
      for (let k = i + 1; k <= n && !ok; k++) ok = input[k - 1] === trip[j] && input[k] === trip[j + 1] && vanishes(i, k - 1) && go(j + 1, k);
      memo.set(key, ok);
    }
    return memo.get(key);
  };
  return go(0, 0);
}

// --- Boards ------------------------------------------------------------------
// shorten: {trip}                      make: {trip, input, told}
// every: {trip, input, found, told, done}   playground: {map, trip}
// `input` is the trip as it was when Shorten was pressed (null while
// walking). `told` answers the last button press: a need the trip doesn't
// meet, a turning point in a trip that was to lose no steps, a result that
// misses, "found already" or "there is another".
export const playMap = (q, b) => ({...q.maps[b.map], mode: 'playground', start: q.maps[b.map].start});
const mapFor = (p, b) => p.parameters.mode === 'playground' ? playMap(p.parameters, b) : p.parameters;
const walking = (q, b) => q.mode === 'playground' || ((q.mode === 'make' || q.mode === 'every') && b.input === null && !b.done);
const cancelling = (q, b) => q.mode === 'playground' || q.mode === 'shorten' || ((q.mode === 'make' || q.mode === 'every') && b.input !== null && !b.done);
const finished = (q, b) => (q.mode === 'make' || q.mode === 'every') && b.input !== null && isReduced(b.trip);

function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'playground') return {map: Object.keys(q.maps)[0], trip: [q.maps[Object.keys(q.maps)[0]].start]};
  if (q.mode === 'shorten') return {trip: [...q.trip]};
  if (q.mode === 'every') return {trip: [q.start], input: null, found: [], told: null, done: false};
  return {trip: [q.start], input: null, told: null};
}
const eachWayOk = (q, trip) => { const use = usage(q, trip); return eachWayOf(q).every(i => use[i][0] <= 1 && use[i][1] <= 1); };
function validTold(q, b) {
  const t = b.told;
  if (t === null) return true;
  if (!object(t)) return false;
  if (t.kind === 'more') return q.mode === 'every' && b.found.length < q.answers;
  if (b.input === null) {
    if (t.kind === 'need') return needs(q, b.trip)[0] === t.what && stepsOf(b.trip) > 0;
    if (t.kind === 'pair') return q.result === 'kept' && fits(q, b.trip) && turns(b.trip)[0] === t.at;
    return false;
  }
  if (!isReduced(b.trip)) return false;
  if (t.kind === 'miss') return q.mode === 'make' && !resultOk(q, b.input, b.trip);
  if (t.kind === 'again') return q.mode === 'every' && Number.isInteger(t.index) && Boolean(b.found[t.index]) && same(b.found[t.index], b.trip);
  return false;
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'playground') {
    if (typeof b.map !== 'string' || !Object.hasOwn(q.maps, b.map)) return false;
    const m = playMap(q, b);
    return isTrip(m, b.trip) && b.trip[0] === m.start && stepsOf(b.trip) <= MAX_STEPS;
  }
  if (!isTrip(q, b.trip) || b.trip[0] !== q.start) return false;
  if (q.mode === 'shorten') return reachable(q.trip, b.trip);
  if (b.input === null) {
    if (stepsOf(b.trip) > maxOf(q) || !eachWayOk(q, b.trip)) return false;
  } else if (!isTrip(q, b.input) || b.input[0] !== q.start || !fits(q, b.input) || !reachable(b.input, b.trip)) return false;
  if (q.mode === 'every') {
    if (!Array.isArray(b.found) || typeof b.done !== 'boolean') return false;
    const all = results(q).map(r => r.join('|')), keys = b.found.map(r => Array.isArray(r) && isTrip(q, r) ? r.join('|') : null);
    if (keys.some(k => k === null || !all.includes(k)) || new Set(keys).size !== keys.length) return false;
    if (b.done && (b.found.length !== q.answers || b.told !== null)) return false;
  }
  return validTold(q, b);
}
function solved(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground' || !valid(p, b)) return false;
  if (q.mode === 'shorten') return isReduced(b.trip);
  if (q.mode === 'every') return b.done;
  return b.input !== null && isReduced(b.trip) && resultOk(q, b.input, b.trip);
}
// A shortening that has just finished: keep the result, or say why not.
function settle(q, b) {
  if (!isReduced(b.trip)) return b;
  if (q.mode === 'make') return {...b, told: resultOk(q, b.input, b.trip) ? null : {kind: 'miss'}};
  const index = b.found.findIndex(r => same(r, b.trip));
  return index >= 0 ? {...b, told: {kind: 'again', index}} : {...b, found: [...b.found, [...b.trip]], told: null};
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'playground') {
    if (action.type === 'map') return Object.hasOwn(q.maps, action.map) && action.map !== b.map ? {map: action.map, trip: [q.maps[action.map].start]} : null;
    const m = playMap(q, b);
    if (action.type === 'step') return canStep(m, b.trip, action.to) ? {...b, trip: [...b.trip, action.to]} : null;
    if (action.type === 'cancel') return turns(b.trip).includes(action.at) ? {...b, trip: cancelAt(b.trip, action.at)} : null;
    return null;
  }
  if (action.type === 'cancel') {
    if (!cancelling(q, b) || !turns(b.trip).includes(action.at)) return null;
    const next = {...b, trip: cancelAt(b.trip, action.at)};
    return q.mode === 'shorten' ? next : settle(q, next);
  }
  if (q.mode === 'shorten') return null;
  if (action.type === 'step') return walking(q, b) && canStep(q, b.trip, action.to) ? {...b, trip: [...b.trip, action.to], told: b.told?.kind === 'more' ? b.told : null} : null;
  if (action.type === 'shorten') {
    // An answer to this same trip waits for a change.
    if (!walking(q, b) || stepsOf(b.trip) === 0 || (b.told && b.told.kind !== 'more')) return null;
    const what = needs(q, b.trip)[0];
    if (what) return {...b, told: {kind: 'need', what}};
    if (q.result === 'kept' && !isReduced(b.trip)) return {...b, told: {kind: 'pair', at: turns(b.trip)[0]}};
    return settle(q, {...b, input: [...b.trip], told: null});
  }
  if (action.type === 'new') return finished(q, b) ? {...b, trip: [q.start], input: null, told: null} : null;
  if (action.type === 'all' && q.mode === 'every') {
    if (!b.found.length || b.told?.kind === 'more') return null;
    return b.found.length === q.answers ? {...b, told: null, done: true} : {...b, told: {kind: 'more'}};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
// Hints continue the child's own trip whenever it can still work.
function hint(p, b) {
  const q = p.parameters;
  if (q.mode === 'playground') return {type: 'done'};
  if (solved(p, b)) return {type: 'done'};
  const cancel = () => { const at = turns(b.trip)[0]; return {type: 'move', action: {type: 'cancel', at}, text: `The steps into and out of ${b.trip[at]} cancel.`, at}; };
  if (q.mode === 'shorten') return cancel();
  const left = q.mode === 'every' ? results(q).filter(r => !b.found.some(f => same(f, r))) : null;
  if (left && !left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
  if (finished(q, b)) return {type: 'move', action: {type: 'new'}, text: q.mode === 'every' ? 'Make another trip.' : 'Start a new trip.'};
  if (b.input !== null) return cancel();
  const want = left ? (t, r) => left.some(x => same(x, r)) : (t, r) => resultOk(q, t, r);
  const target = complete(q, b.trip, want);
  if (!target) return {type: 'deadend', text: 'This trip can’t work. Undo some steps.'};
  if (target.length === b.trip.length) return {type: 'move', action: {type: 'shorten'}, text: 'Press Shorten.'};
  const to = target[b.trip.length];
  return {type: 'move', action: {type: 'step', to}, text: `Step to ${to}.`, to};
}

// --- Drawing -----------------------------------------------------------------
const moveButton = (label, action, cls, enabled, hinted) => `<button type="button" class="secondary dt-button ${cls}${hinted ? ' hinted' : ''}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="dt-${action.type}" ${enabled ? '' : 'disabled'}>${label}</button>`;
const words = (q, t) => ({
  need: {finish: `End at ${q.finish}.`, steps: q.min === maxOf(q) ? `Take ${q.min} steps.` : `Take ${q.min} to ${maxOf(q)} steps.`, everyRoad: 'Use every road.', eachWay: eachWayOf(q).length === q.roads.length ? 'Use every road once each way.' : `Go round ${q.eachWayName} once each way.`, groups: `Use ${q.groupsName || 'every part of the map'}.`}[t.what],
  pair: 'These two steps cancel.',
  miss: q.result === 'empty' ? 'Some steps are left.' : 'It shortens to a different route.',
  again: 'Found already.',
  more: 'There is another.'
})[t.kind];
const tripWords = trip => trip.length === 1 ? `stay at ${trip[0]}` : trip.join(' to ');
// The trip as a row of dots and arrows; a turning point is a button when the
// trip is being shortened.
function strip(trip, opts = {}) {
  const items = trip.map((id, k) => {
    const inside = k > 0 && k < trip.length - 1, cls = [opts.hinted === k ? 'hinted' : '', opts.told === k ? 'told' : ''].join(' ');
    const stop = opts.cancel && inside
      ? `<button type="button" class="dt-stop ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'cancel', at: k}))}" data-focus="dt-stop-${k}" aria-label="${esc(`Step ${k} reaches ${id}. Cancel the steps into and out of it`)}">${esc(id)}</button>`
      : `<span class="dt-stop fixed ${cls}">${esc(id)}</span>`;
    return k ? `<span class="dt-step"><span class="dt-arrow" aria-hidden="true">→</span>${stop}</span>` : stop;
  }).join('');
  return `<div class="dt-strip${opts.cls ? ` ${opts.cls}` : ''}" role="group" aria-label="${esc(opts.label || `Trip: ${tripWords(trip)}`)}">${items}</div>`;
}
function mapBoard(q, b, hinted, walk) {
  const g = mapOf(q), use = usage(q, b.trip), at = b.trip.at(-1);
  return graphBoard(g, {
    cls: 'dt-map', label: 'Map of roads', slide: walk,
    node: id => {
      const go = walk && canStep(q, b.trip, id);
      const cls = [id === at ? 'pawn' : '', id === q.start ? 'start' : '', q.finish && id === q.finish ? 'finish' : '', hinted?.to === id ? 'hinted' : '', go ? 'can-go' : ''].join(' ');
      return {cls, act: go, label: `${id}${id === at ? ', the pawn is here' : ''}${go ? '. Step here' : ''}`};
    },
    edge: i => {
      const [u, v] = q.roads[i], times = use[i][0] + use[i][1], go = walk && ((u === at && canStep(q, b.trip, v)) || (v === at && canStep(q, b.trip, u)));
      return {cls: [times ? 'used' : '', hinted?.to !== undefined && roadOf(q, at, hinted.to) === i ? 'hinted' : ''].join(' '), act: go, strokes: times ? [use[i][0] && use[i][1] ? 'both' : 'one'] : [], label: `Road ${u} to ${v}${times ? `, used ${plural(times, 'time')}` : ''}${go ? `. Step to ${u === at ? v : u}` : ''}`};
    }
  });
}
function render(p, a) {
  const q0 = p.parameters, b = a.board, q = mapFor(p, b), done = solved(p, b);
  const hinted = a.hintLevel >= 2 && !done && q0.mode !== 'playground' ? hint(p, b) : null;
  const walk = !done && walking(q, b), cancel = !done && cancelling(q, b) && !finished(q, b);
  const told = b.told ? words(q, b.told) : '';
  const hintType = hinted?.type === 'move' ? hinted.action.type : null;
  let top = '';
  if (q0.mode === 'playground') {
    top = `<div class="dt-maps" role="group" aria-label="Map">${Object.keys(q0.maps).map(id => `<button type="button" class="secondary dt-pick" data-action="expansion-move" data-move="${esc(JSON.stringify({type: 'map', map: id}))}" data-focus="dt-map-${id}" aria-pressed="${b.map === id}" aria-label="${esc(q0.maps[id].name)}">${graphMini(mapOf(q0.maps[id]), {label: q0.maps[id].name})}</button>`).join('')}</div>`;
  } else if (q.mode !== 'shorten' && !done) {
    const max = maxOf(q), steps = stepsOf(b.trip);
    const pips = walk ? `<span class="dt-pips" role="img" aria-label="${steps} of ${max} steps">${Array.from({length: max}, (_, k) => `<i class="${k < steps ? 'on' : ''}${k < q.min ? '' : ' extra'}"></i>`).join('')}</span>` : '';
    const buttons = (walk ? moveButton('Shorten', {type: 'shorten'}, 'dt-shorten', steps > 0 && (!b.told || b.told.kind === 'more'), hintType === 'shorten') : '')
      + (finished(q, b) ? moveButton('New trip', {type: 'new'}, 'dt-new', true, hintType === 'new') : '')
      + (q.mode === 'every' ? moveButton('That’s all', {type: 'all'}, 'dt-all', b.found.length > 0 && b.told?.kind !== 'more', hintType === 'all') : '');
    top = `<div class="dt-bar">${pips}<span class="dt-buttons">${buttons}</span></div>`;
  }
  const row = strip(b.trip, {cancel, hinted: hintType === 'cancel' ? hinted.at : null, told: b.told?.kind === 'pair' ? b.told.at : null, cls: walk ? 'walking' : ''});
  const note = told ? `<p class="dt-told">${esc(told)}</p>` : '';
  const found = q.mode === 'every' && b.found.length ? `<ul class="dt-found" aria-label="Routes found">${b.found.map((r, k) => `<li class="${b.told?.kind === 'again' && b.told.index === k ? 'again' : ''}${k === b.found.length - 1 && !b.told && finished(q, b) ? ' fresh' : ''}">${strip(r, {label: tripWords(r), cls: 'mini'})}</li>`).join('')}</ul>` : '';
  const status = `Trip: ${tripWords(b.trip)}, ${plural(stepsOf(b.trip), 'step')}.${told ? ` ${told}` : ''}`;
  return `<div class="dt-puzzle${done ? ' solved' : ''}" data-mechanic-wire="detours">${top}${mapBoard(q, b, hinted, walk)}${row}${note}${found}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function wire(root, p, api) {
  const now = () => { const b = api.attempt().board; return {b, q: mapFor(p, b)}; };
  wireGraph(root, {
    stroke: true,
    node: id => { const {b, q} = now(); return walking(q, b) && canStep(q, b.trip, id) ? {type: 'step', to: id} : null; },
    edge: i => {
      const {b, q} = now(), [u, v] = q.roads[i], at = b.trip.at(-1), to = u === at ? v : v === at ? u : null;
      return to && walking(q, b) && canStep(q, b.trip, to) ? {type: 'step', to} : null;
    }
  }, api.apply);
}

export const detoursMechanics = {
  detours: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo keeps the routes already found.
    carry: (p, from, to) => p.parameters.mode === 'every' && object(to) && object(from) && Array.isArray(from.found) ? {...to, found: from.found.map(r => [...r]), told: null, done: false} : to,
    noHint: p => p.parameters.mode === 'playground'
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'detours',
  family: {id: 'detours', symbol: '⥂'},
  mechanics: detoursMechanics,
  pack: new URL('./detours.json', import.meta.url).href,
  css: new URL('./detours.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.dt-stop:is(button),.dt-button:not([disabled])'
};
