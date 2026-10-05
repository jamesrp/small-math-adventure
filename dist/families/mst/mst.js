// Cheapest networks (worksheet Week 53). Places are joined by links, each with
// a price. Buying links until every place is reached builds a network; the
// cheapest networks are the minimum spanning trees. With positive prices a
// cheapest network has no loop; a link that is the strictly cheapest way
// across some split of the places is in every cheapest network, and a link
// that is strictly the dearest on some loop is in none; a network with no loop
// is cheapest exactly when no single swap (buy one link, return one on the
// loop it makes) lowers the price.
import {esc} from '../../expansion-controls.js';
import {graphOf, graphBoard, graphMini, wireGraph} from '../../graph-board.js';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const sum = list => list.reduce((a, b) => a + b, 0);
const sorted = list => [...list].sort((a, b) => a - b);
const same = (a, b) => a.length === b.length && sorted(a).every((x, i) => x === sorted(b)[i]);
export const MODES = ['cheapest', 'every', 'swap', 'forced', 'excluded', 'design'];
export const DESIGN_PRICES = [1, 2, 3, 4];

// --- The map ----------------------------------------------------------------
export const mapOf = q => graphOf({nodes: q.nodes, edges: q.links.map(([u, v]) => [u, v]), aspect: q.aspect, scale: q.scale});
export const pricesOf = (q, b) => q.mode === 'design' ? b.prices : q.links.map(l => l[2]);
export const costOf = (prices, set) => sum(set.map(i => prices[i]));

// Which group of connected places each place is in, using only `set`.
export function groupsOf(q, set) {
  const ids = Object.keys(q.nodes), parent = Object.fromEntries(ids.map(id => [id, id]));
  const find = id => parent[id] === id ? id : (parent[id] = find(parent[id]));
  for (const i of set) { const [u, v] = q.links[i]; parent[find(u)] = find(v); }
  const roots = [...new Set(ids.map(find))];
  return {of: Object.fromEntries(ids.map(id => [id, roots.indexOf(find(id))])), count: roots.length};
}
export const connected = (q, set) => groupsOf(q, set).count === 1;
export const isTree = (q, set) => set.length === Object.keys(q.nodes).length - 1 && connected(q, set);
// The links of `set` that lie on a loop: their ends stay joined without them.
export function loopLinks(q, set) {
  return set.filter(i => { const g = groupsOf(q, set.filter(j => j !== i)), [u, v] = q.links[i]; return g.of[u] === g.of[v]; });
}
// The links on the path from u to v inside a network with no loop, or null.
export function pathIn(q, set, u, v) {
  const from = {[u]: null}, queue = [u];
  for (let k = 0; k < queue.length; k++) {
    const at = queue[k];
    if (at === v) { const path = []; let x = v; while (from[x] !== null) { path.push(from[x].link); x = from[x].node; } return path; }
    for (const i of set) {
      const [a, b] = q.links[i], next = a === at ? b : b === at ? a : null;
      if (next !== null && !Object.hasOwn(from, next)) { from[next] = {node: at, link: i}; queue.push(next); }
    }
  }
  return null;
}

// --- Cheapest networks -------------------------------------------------------
// Every network that reaches every place with no loop, as sorted link lists.
const treeCache = new Map();
export function allTrees(q) {
  const cacheKey = JSON.stringify([Object.keys(q.nodes), q.links.map(([u, v]) => [u, v])]);
  if (treeCache.has(cacheKey)) return treeCache.get(cacheKey);
  const n = Object.keys(q.nodes).length, out = [];
  (function grow(from, chosen) {
    if (chosen.length === n - 1) { out.push([...chosen]); return; }
    if (q.links.length - from < n - 1 - chosen.length) return;
    for (let i = from; i < q.links.length; i++) {
      const g = groupsOf(q, chosen), [u, v] = q.links[i];
      if (g.of[u] !== g.of[v]) grow(i + 1, [...chosen, i]);
    }
  })(0, []);
  treeCache.set(cacheKey, out);
  return out;
}
export function cheapestCost(q, prices) {
  return Math.min(...allTrees(q).map(t => costOf(prices, t)));
}
export function optima(q, prices) {
  const best = cheapestCost(q, prices);
  return allTrees(q).filter(t => costOf(prices, t) === best);
}
export const isCheapest = (q, prices, set) => isTree(q, set) && costOf(prices, set) === cheapestCost(q, prices);
// A single swap that lowers the price of a network with no loop: buy `add`,
// return `drop` from the loop it makes. The biggest saving, or null.
export function improvingSwap(q, prices, tree) {
  let best = null;
  q.links.forEach(([u, v], add) => {
    if (tree.includes(add)) return;
    for (const drop of pathIn(q, tree, u, v) || []) {
      const saving = prices[drop] - prices[add];
      if (saving > 0 && (!best || saving > best.saving)) best = {add, drop, saving};
    }
  });
  return best && {add: best.add, drop: best.drop};
}
// Why a connected network is not cheapest: a loop link to return, or a swap.
export function counterexample(q, prices, set) {
  const loop = loopLinks(q, set);
  if (loop.length) return {drop: loop.reduce((top, i) => prices[i] > prices[top] ? i : top, loop[0])};
  return improvingSwap(q, prices, set);
}

// --- Certificates ------------------------------------------------------------
// A split of the places: the links with exactly one end on `side`.
export const crossing = (q, side) => q.links.map((l, i) => i).filter(i => side.includes(q.links[i][0]) !== side.includes(q.links[i][1]));
export function forcedBy(q, side) {
  const across = crossing(q, side), t = q.target, prices = pricesOf(q);
  return across.includes(t) && across.every(i => i === t || prices[i] > prices[t]);
}
// Every split that proves the target is in every cheapest network, as the side
// without the first place.
export function forcingSplits(q) {
  const ids = Object.keys(q.nodes), rest = ids.slice(1), out = [];
  for (let mask = 1; mask < 1 << rest.length; mask++) {
    const side = rest.filter((_, k) => mask >> k & 1);
    if (forcedBy(q, side)) out.push(side);
  }
  return out;
}
// A loop that proves the target is in no cheapest network: the picked links
// form one loop through the target, and the target is strictly the dearest.
export function isLoop(q, set) {
  if (set.length < 3) return false;
  const degree = {};
  for (const i of set) for (const id of q.links[i].slice(0, 2)) degree[id] = (degree[id] || 0) + 1;
  if (!Object.values(degree).every(d => d === 2)) return false;
  const g = groupsOf(q, set);
  return new Set(Object.keys(degree).map(id => g.of[id])).size === 1;
}
export function excludedBy(q, set) {
  const prices = pricesOf(q), t = q.target;
  return set.includes(t) && isLoop(q, set) && set.every(i => i === t || prices[i] < prices[t]);
}
export function excludingLoops(q) {
  const prices = pricesOf(q), t = q.target, [u, v] = q.links[t], out = [];
  (function walk(at, seen, links) {
    if (at === v) { out.push(sorted([...links, t])); return; }
    q.links.forEach(([a, b], i) => {
      if (i === t || prices[i] >= prices[t]) return;
      const next = a === at ? b : b === at ? a : null;
      if (next !== null && !seen.includes(next)) walk(next, [...seen, next], [...links, i]);
    });
  })(u, [u], []);
  return out;
}

// --- Boards ------------------------------------------------------------------
// cheapest: {bought, claimed, told}      every: {bought, found, told, done}
// swap: {bought, claimed, told}          forced: {side}
// excluded: {bought}                      design: {prices, checked, told}
// `told` is the answer to a wrong claim: a loop link to return, a cheaper
// swap, "there is another", "found already", or the list of cheapest networks.
const ids = q => Object.keys(q.nodes);
const linkSet = (q, list) => Array.isArray(list) && list.every(i => Number.isInteger(i) && i >= 0 && i < q.links.length) && new Set(list).size === list.length;
export const swapsUsed = (q, bought) => bought.filter(i => !q.start.includes(i)).length;
// The designs that meet the target, for checks and hints.
const designCache = new Map();
export function designs(q) {
  const cacheKey = JSON.stringify([q.links.map(([u, v]) => [u, v]), q.want]);
  if (designCache.has(cacheKey)) return designCache.get(cacheKey);
  const out = [];
  (function set(prices) {
    if (prices.length === q.links.length) { if (optima(q, prices).length === q.want) out.push(prices); return; }
    for (const p of DESIGN_PRICES) set([...prices, p]);
  })([]);
  designCache.set(cacheKey, out);
  return out;
}
function toldFor(q, b, kind) {
  const prices = pricesOf(q, b);
  if (kind === 'claim') { const c = counterexample(q, prices, b.bought); return c && (c.add === undefined ? {kind: 'loop', drop: c.drop} : {kind: 'swap', add: c.add, drop: c.drop}); }
  if (kind === 'again') return {kind: 'again', index: b.found.findIndex(t => same(t, b.bought))};
  return {kind};
}
function fresh(p) {
  const q = p.parameters;
  if (q.mode === 'every') return {bought: [], found: [], told: null, done: false};
  if (q.mode === 'swap') return {bought: sorted(q.start), claimed: false, told: null};
  if (q.mode === 'forced') return {side: []};
  if (q.mode === 'excluded') return {bought: []};
  if (q.mode === 'design') return {prices: q.links.map(l => l[2]), checked: false, told: null};
  return {bought: [], claimed: false, told: null};
}
function valid(p, b) {
  const q = p.parameters;
  if (!object(b)) return false;
  if (q.mode === 'forced') return Array.isArray(b.side) && b.side.every(id => Object.hasOwn(q.nodes, id)) && new Set(b.side).size === b.side.length;
  if (q.mode === 'design') {
    if (!Array.isArray(b.prices) || b.prices.length !== q.links.length || !b.prices.every(x => DESIGN_PRICES.includes(x)) || typeof b.checked !== 'boolean') return false;
    const count = optima(q, b.prices).length;
    if (b.checked && count !== q.want) return false;
    return b.told === null || (!b.checked && count !== q.want && object(b.told) && b.told.kind === 'list');
  }
  if (!linkSet(q, b.bought)) return false;
  if (q.mode === 'excluded') return true;
  const prices = pricesOf(q, b);
  if (q.mode === 'swap' && swapsUsed(q, b.bought) > q.budget) return false;
  if (q.mode === 'every') {
    if (!Array.isArray(b.found) || typeof b.done !== 'boolean') return false;
    const keys = b.found.map(t => linkSet(q, t) && isCheapest(q, prices, t) ? sorted(t).join() : null);
    if (keys.includes(null) || new Set(keys).size !== keys.length) return false;
    if (b.done && b.found.length !== q.answers) return false;
    if (b.told === null) return true;
    if (!object(b.told) || b.done) return false;
    if (b.told.kind === 'more') return b.found.length < q.answers;
    if (b.told.kind === 'again') return Number.isInteger(b.told.index) && isCheapest(q, prices, b.bought) && Boolean(b.found[b.told.index]) && same(b.found[b.told.index], b.bought);
    return connected(q, b.bought) && !isCheapest(q, prices, b.bought) && JSON.stringify(b.told) === JSON.stringify(toldFor(q, b, 'claim'));
  }
  if (typeof b.claimed !== 'boolean') return false;
  if (b.claimed && (!isCheapest(q, prices, b.bought) || b.told !== null)) return false;
  return b.told === null || (connected(q, b.bought) && !isCheapest(q, prices, b.bought) && JSON.stringify(b.told) === JSON.stringify(toldFor(q, b, 'claim')));
}
function solved(p, b) {
  const q = p.parameters;
  if (!valid(p, b)) return false;
  if (q.mode === 'forced') return forcedBy(q, b.side);
  if (q.mode === 'excluded') return excludedBy(q, b.bought);
  if (q.mode === 'design') return b.checked;
  if (q.mode === 'every') return b.done;
  return b.claimed;
}
function move(p, b, action) {
  const q = p.parameters;
  if (!valid(p, b) || solved(p, b) || !object(action)) return null;
  if (q.mode === 'forced') {
    if (action.type !== 'place' || !Object.hasOwn(q.nodes, action.node)) return null;
    return {side: b.side.includes(action.node) ? b.side.filter(id => id !== action.node) : [...b.side, action.node]};
  }
  if (q.mode === 'design') {
    if (action.type === 'price') {
      const i = action.link;
      if (!Number.isInteger(i) || i < 0 || i >= q.links.length) return null;
      const prices = b.prices.map((x, j) => j === i ? DESIGN_PRICES[(DESIGN_PRICES.indexOf(x) + 1) % DESIGN_PRICES.length] : x);
      return {prices, checked: false, told: null};
    }
    if (action.type === 'check') {
      if (b.told) return null;
      return optima(q, b.prices).length === q.want ? {...b, checked: true} : {...b, told: {kind: 'list'}};
    }
    return null;
  }
  if (action.type === 'link') {
    const i = action.link;
    if (!Number.isInteger(i) || i < 0 || i >= q.links.length) return null;
    const has = b.bought.includes(i), bought = has ? b.bought.filter(j => j !== i) : sorted([...b.bought, i]);
    if (q.mode === 'swap' && swapsUsed(q, bought) > q.budget) return null;
    return q.mode === 'excluded' ? {bought} : {...b, bought, told: null};
  }
  if (q.mode === 'excluded') return null;
  const prices = pricesOf(q, b);
  if (action.type === 'claim') {
    // An answer to this same network waits for a change; "there is another" does not.
    if (!connected(q, b.bought) || (b.told && b.told.kind !== 'more')) return null;
    if (!isCheapest(q, prices, b.bought)) return {...b, told: toldFor(q, b, 'claim')};
    if (q.mode !== 'every') return {...b, claimed: true};
    if (b.found.some(t => same(t, b.bought))) return {...b, told: toldFor(q, b, 'again')};
    return {...b, found: [...b.found, sorted(b.bought)], told: null};
  }
  if (action.type === 'all' && q.mode === 'every') {
    if (!b.found.length || b.told?.kind === 'more') return null;
    return b.found.length === q.answers ? {...b, done: true, told: null} : {...b, told: {kind: 'more'}};
  }
  return null;
}

// --- Hints -------------------------------------------------------------------
// Hints move toward the answer nearest the child's own work.
// Swap order: return a loop link the target lacks, else buy a target link.
// Once every target link is bought, any other link is on a loop.
const toward = (q, b, target, done) => {
  const loops = loopLinks(q, b.bought);
  const drop = b.bought.find(i => !target.includes(i) && loops.includes(i));
  if (drop !== undefined) return {type: 'move', action: {type: 'link', link: drop}, text: 'This link is on a loop. Return it.', link: drop};
  const add = target.find(i => !b.bought.includes(i));
  if (add !== undefined) return {type: 'move', action: {type: 'link', link: add}, text: 'Buy this link.', link: add};
  return done;
};
const nearest = (list, score) => list.reduce((top, x) => score(x) > score(top) ? x : top, list[0]);
function hint(p, b) {
  const q = p.parameters;
  if (solved(p, b)) return {type: 'done'};
  if (q.mode === 'forced') {
    const flip = side => ids(q).filter(id => b.side.includes(id) !== side.includes(id));
    const options = forcingSplits(q).flatMap(side => [side, ids(q).filter(id => !side.includes(id))]).map(flip);
    const node = nearest(options, f => -f.length)[0];
    return {type: 'move', action: {type: 'place', node}, text: b.side.includes(node) ? 'Take this place off your side.' : 'Put this place on your side.', node};
  }
  if (q.mode === 'design') {
    const taps = target => sum(target.map((x, i) => (DESIGN_PRICES.indexOf(x) - DESIGN_PRICES.indexOf(b.prices[i]) + DESIGN_PRICES.length) % DESIGN_PRICES.length));
    const target = nearest(designs(q), t => -taps(t));
    const i = target.findIndex((x, j) => x !== b.prices[j]);
    if (i < 0) return {type: 'move', action: {type: 'check'}, text: 'Press Check.'};
    return {type: 'move', action: {type: 'price', link: i}, text: 'Change this price.', link: i};
  }
  if (q.mode === 'excluded') {
    const loop = nearest(excludingLoops(q), l => -(l.filter(i => !b.bought.includes(i)).length + b.bought.filter(i => !l.includes(i)).length));
    const drop = b.bought.find(i => !loop.includes(i));
    if (drop !== undefined) return {type: 'move', action: {type: 'link', link: drop}, text: 'Take this link out of the loop.', link: drop};
    const add = loop.find(i => !b.bought.includes(i));
    return {type: 'move', action: {type: 'link', link: add}, text: 'Add this link to the loop.', link: add};
  }
  const prices = pricesOf(q, b), claim = {type: 'move', action: {type: 'claim'}, text: 'Press Cheapest.'};
  if (q.mode === 'every') {
    const left = optima(q, prices).filter(t => !b.found.some(f => same(f, t)));
    if (!left.length) return {type: 'move', action: {type: 'all'}, text: 'Press That’s all.'};
    const target = nearest(left, t => t.filter(i => b.bought.includes(i)).length - b.bought.filter(i => !t.includes(i)).length);
    return toward(q, b, target, claim);
  }
  let targets = optima(q, prices);
  if (q.mode === 'swap') {
    targets = targets.filter(t => swapsUsed(q, t) <= q.budget);
    // Give back a new link that is not in the target first, so a swap is never wasted.
    const target = nearest(targets, t => t.filter(i => b.bought.includes(i)).length);
    const refund = b.bought.find(i => !target.includes(i) && !q.start.includes(i));
    if (refund !== undefined) return {type: 'move', action: {type: 'link', link: refund}, text: 'Return this link.', link: refund};
    return toward(q, b, target, claim);
  }
  return toward(q, b, nearest(targets, t => t.filter(i => b.bought.includes(i)).length - b.bought.filter(i => !t.includes(i)).length), claim);
}

// --- Drawing -----------------------------------------------------------------
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const coin = '<svg class="mst-coin" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.2"/><circle cx="10" cy="10" r="4.4"/></svg>';
const swapIcon = used => `<svg class="mst-swap${used ? ' used' : ''}" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 7.5h12l-3.4-3.4M16.5 12.5h-12l3.4 3.4"/></svg>`;
const moveButton = (label, action, cls, enabled, extra = '') => `<button type="button" class="secondary mst-button ${cls}" data-action="expansion-move" data-move="${esc(JSON.stringify(action))}" data-focus="mst-${action.type}" ${enabled ? '' : 'disabled'} ${extra}>${label}</button>`;
const describe = (q, set) => set.length ? set.map(i => `${q.links[i][0]}${q.links[i][1]}`).join(', ') : 'no links';
const mini = (q, g, set, cls = '') => graphMini(g, {edge: i => set.includes(i) ? 'on' : '', label: `Network ${describe(q, set)}`, cls});

// Places light up as they are joined: a tint per group, and sun when every
// place is reached.
function placeLook(q, bought) {
  const groups = groupsOf(q, bought), size = {};
  for (const id of ids(q)) size[groups.of[id]] = (size[groups.of[id]] || 0) + 1;
  const tints = [...new Set(ids(q).map(id => groups.of[id]).filter(k => size[k] > 1))];
  return id => groups.count === 1 ? 'lit' : size[groups.of[id]] > 1 ? `g${tints.indexOf(groups.of[id]) % 4}` : '';
}
function renderNetwork(p, a, hinted) {
  const q = p.parameters, b = a.board, g = mapOf(q), done = solved(p, b), prices = pricesOf(q, b);
  const loops = loopLinks(q, b.bought), told = b.told || {}, look = placeLook(q, b.bought), all = connected(q, b.bought);
  const pick = q.mode === 'excluded';
  const board = graphBoard(g, {
    cls: `mst-map mode-${q.mode}${all ? ' all-reached' : ''}`,
    label: 'Map of places and links with prices',
    node: id => ({cls: pick ? '' : look(id), label: `Place ${id}`}),
    edge: i => {
      const has = b.bought.includes(i), [u, v] = q.links[i];
      const act = !done && (has || q.mode !== 'swap' || swapsUsed(q, [...b.bought, i]) <= q.budget);
      const strokes = [has ? 'buy' : '', has && loops.includes(i) ? 'loop' : '', told.add === i ? 'told-add' : '', told.drop === i ? 'told-drop' : ''].filter(Boolean);
      const cls = [has ? 'bought' : '', i === q.target ? 'target' : '', hinted?.link === i ? 'hinted' : '', told.drop === i ? 'told-drop' : '', q.mode === 'swap' && q.start.includes(i) ? 'start' : ''].join(' ');
      const verb = pick ? (has ? 'Take it out of the loop' : 'Add it to the loop') : has ? 'Return it' : 'Buy it';
      return {cls, act, tag: prices[i], strokes, label: `Link ${u} to ${v}, price ${prices[i]}${has ? (pick ? ', in the loop' : ', bought') : ''}${!pick && has && loops.includes(i) ? ', on a loop' : ''}${i === q.target ? ', the marked link' : ''}${told.add === i ? ', buy this one to pay less' : ''}${told.drop === i ? ', return this one to pay less' : ''}. ${verb}`};
    }
  });
  if (pick) return `<div class="mst-puzzle" data-mechanic-wire="mst">${board}<p class="sr-only" role="status">${esc(`${plural(b.bought.length, 'link')} picked.${done ? ' The marked link costs the most on this loop.' : ''}`)}</p></div>`;
  const cost = costOf(prices, b.bought);
  const left = q.mode === 'swap' ? q.budget - swapsUsed(q, b.bought) : 0;
  const swaps = q.mode === 'swap' ? `<span class="mst-swaps" role="img" aria-label="${plural(left, 'new link')} left">${Array.from({length: q.budget}, (_, k) => swapIcon(k >= left)).join('')}</span>` : '';
  const buttons = done ? '' : moveButton('Cheapest', {type: 'claim'}, `mst-claim${hinted?.action?.type === 'claim' ? ' hinted' : ''}`, all && (!b.told || told.kind === 'more')) + (q.mode === 'every' ? moveButton('That’s all', {type: 'all'}, `mst-all${hinted?.action?.type === 'all' ? ' hinted' : ''}`, b.found.length > 0 && told.kind !== 'more') : '');
  const bar = `<div class="mst-bar"><span class="mst-pile" role="img" aria-label="Paid ${cost}">${coin}<b>${cost}</b></span>${swaps}<span class="mst-buttons">${buttons}</span></div>`;
  const words = {swap: 'Not the cheapest: this swap costs less.', loop: 'Not the cheapest: this link is on a loop.', more: 'There is another cheapest network.', again: 'Found already.'};
  const note = told.kind ? `<p class="mst-told">${words[told.kind]}</p>` : '';
  const found = q.mode === 'every' && b.found.length ? `<ul class="mst-found" aria-label="Cheapest networks found">${b.found.map((t, k) => `<li class="${told.kind === 'again' && told.index === k ? 'again' : ''}${k === b.found.length - 1 && !told.kind ? ' fresh' : ''}">${mini(q, g, t)}</li>`).join('')}</ul>` : '';
  const status = `Paid ${cost}. ${all ? 'Every place is reached.' : 'Not every place is reached yet.'}${loops.length ? ' There is a loop.' : ''}${q.mode === 'swap' ? ` ${plural(left, 'new link')} left.` : ''}${told.kind ? ` ${words[told.kind]}` : ''}`;
  return `<div class="mst-puzzle" data-mechanic-wire="mst">${bar}${board}${note}${found}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderForced(p, a, hinted) {
  const q = p.parameters, b = a.board, g = mapOf(q), done = solved(p, b), prices = pricesOf(q), across = new Set(crossing(q, b.side));
  const board = graphBoard(g, {
    cls: 'mst-map mode-forced', label: 'Map of places and links with prices',
    node: id => ({cls: [b.side.includes(id) ? 'side' : '', hinted?.node === id ? 'hinted' : ''].join(' '), act: !done, label: `Place ${id}${b.side.includes(id) ? ', on your side' : ''}. ${b.side.includes(id) ? 'Take it off' : 'Put it on your side'}`}),
    edge: i => {
      const [u, v] = q.links[i];
      return {cls: [across.has(i) ? 'across' : b.side.length ? 'calm' : '', i === q.target ? 'target' : ''].join(' '), tag: prices[i], label: `Link ${u} to ${v}, price ${prices[i]}${across.has(i) ? ', crosses' : ''}${i === q.target ? ', the marked link' : ''}`};
    }
  });
  const status = b.side.length ? `${plural(across.size, 'link')} cross: ${describe(q, [...across])}.` : 'No places on your side yet.';
  return `<div class="mst-puzzle" data-mechanic-wire="mst">${board}<p class="sr-only" role="status">${esc(status)}</p></div>`;
}
function renderDesign(p, a, hinted) {
  const q = p.parameters, b = a.board, g = mapOf(q), done = solved(p, b);
  const board = graphBoard(g, {
    cls: 'mst-map mode-design', label: 'Map of places and links with prices',
    node: id => ({label: `Place ${id}`}),
    edge: i => {
      const [u, v] = q.links[i];
      return {cls: [hinted?.link === i ? 'hinted' : ''].join(' '), act: !done, tag: b.prices[i], label: `Link ${u} to ${v}, price ${b.prices[i]}. Change the price`};
    }
  });
  const list = b.told ? optima(q, b.prices) : [];
  const told = b.told ? `<p class="mst-told">${plural(list.length, 'cheapest network')}:</p><ul class="mst-found mst-list" aria-label="Cheapest networks with these prices">${list.map(t => `<li>${mini(q, g, t)}</li>`).join('')}</ul>` : '';
  const bar = done ? '' : `<div class="mst-bar"><span class="mst-buttons">${moveButton('Check', {type: 'check'}, `mst-check${hinted?.action?.type === 'check' ? ' hinted' : ''}`, !b.told)}</span></div>`;
  return `<div class="mst-puzzle" data-mechanic-wire="mst">${bar}${board}${told}<p class="sr-only" role="status">${esc(b.told ? `${plural(list.length, 'cheapest network')} with these prices.` : `Prices ${b.prices.join(', ')}.`)}</p></div>`;
}
function render(p, a) {
  const q = p.parameters, hinted = a.hintLevel >= 2 && !solved(p, a.board) ? hint(p, a.board) : null;
  if (q.mode === 'forced') return renderForced(p, a, hinted);
  if (q.mode === 'design') return renderDesign(p, a, hinted);
  return renderNetwork(p, a, hinted);
}
function wire(root, p, api) {
  const q = p.parameters;
  wireGraph(root, {
    node: id => q.mode === 'forced' ? {type: 'place', node: id} : null,
    edge: i => q.mode === 'forced' ? null : q.mode === 'design' ? {type: 'price', link: i} : {type: 'link', link: i}
  }, api.apply);
}

export const mstMechanics = {
  mst: {
    fresh, valid, solved, move, hint, render, wire,
    // Undo keeps the cheapest networks already found.
    carry: (p, from, to) => p.parameters.mode === 'every' && object(to) && object(from) ? {...to, found: [...from.found], told: null} : to
  }
};

// The family seam entry (dist/families.js).
export default {
  id: 'mst',
  family: {id: 'mst', symbol: '⋔'},
  mechanics: mstMechanics,
  pack: new URL('./mst.json', import.meta.url).href,
  css: new URL('./mst.css', import.meta.url).href,
  focus: '.gb-node[role=button],.gb-hit,.mst-button:not([disabled])'
};
