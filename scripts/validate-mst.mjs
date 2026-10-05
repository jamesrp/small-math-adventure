// Checks the Cheapest networks pack (dist/families/mst/mst.json): content
// fields and sources; every cheapest price against Prim's algorithm; every
// count of cheapest networks against a plain search over all link subsets;
// swap budgets as the fewest swaps; forced links against every split and
// excluded links against every loop; the design target against all 4096
// pricings; witnesses played as moves; the answers to wrong claims; hint chains
// from fresh and messy boards; illegal moves; forged saves.
// Run: node scripts/validate-mst.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// Graph helpers written separately from the mechanic.
const placesOf = q => Object.keys(q.nodes);
function joined(q, set) {
  const ids = placesOf(q), seen = new Set([ids[0]]), stack = [ids[0]];
  while (stack.length) { const at = stack.pop(); for (const i of set) { const [u, v] = q.links[i]; const w = u === at ? v : v === at ? u : null; if (w && !seen.has(w)) { seen.add(w); stack.push(w); } } }
  return seen.size === ids.length;
}
const subsets = (n, size, from = 0) => size === 0 ? [[]] : Array.from({length: Math.max(0, n - from)}, (_, i) => from + i).flatMap(i => subsets(n, size - 1, i + 1).map(rest => [i, ...rest]));
const treesCache = new Map();
function trees(q) {
  const key = JSON.stringify(q.links.map(([u, v]) => u + v));
  if (!treesCache.has(key)) treesCache.set(key, subsets(q.links.length, placesOf(q).length - 1).filter(set => joined(q, set)));
  return treesCache.get(key);
}
const price = (prices, set) => set.reduce((n, i) => n + prices[i], 0);
// Prim's algorithm from the first place.
function prim(q, prices) {
  const ids = placesOf(q), inside = new Set([ids[0]]);
  let total = 0;
  while (inside.size < ids.length) {
    let best = null;
    q.links.forEach(([u, v], i) => { if (inside.has(u) !== inside.has(v) && (best === null || prices[i] < prices[best])) best = i; });
    total += prices[best]; inside.add(q.links[best][0]); inside.add(q.links[best][1]);
  }
  return total;
}
const cheapestOf = (q, prices) => { const best = prim(q, prices); return trees(q).filter(t => price(prices, t) === best); };
const pricesOf = q => q.links.map(l => l[2]);
const same = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).join() === [...b].sort((x, y) => x - y).join();
// The links on the path between two places in a tree.
function path(q, tree, from, to, seen = new Set([from])) {
  if (from === to) return [];
  for (const i of tree) {
    const [u, v] = q.links[i], next = u === from ? v : v === from ? u : null;
    if (next && !seen.has(next)) { seen.add(next); const rest = path(q, tree, next, to, seen); if (rest) return [i, ...rest]; }
  }
  return null;
}
function hasLoop(q, set) { // a set with a loop has more links than places minus groups
  const ids = placesOf(q), parent = Object.fromEntries(ids.map(id => [id, id])), find = x => parent[x] === x ? x : find(parent[x]);
  for (const i of set) { const a = find(q.links[i][0]), b = find(q.links[i][1]); if (a === b) return true; parent[a] = b; }
  return false;
}

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
    a = play(p, a, hint.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const buyAll = (p, a, set) => set.reduce((b, i) => b.board.bought.includes(i) ? b : play(p, b, {type: 'link', link: i}), a);

export async function validateMst() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/mst/mst.json', import.meta.url), 'utf8'));
  const {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'mst');
  const puzzles = pack.puzzles;
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  let steps = 0, wrongClaims = 0;
  for (const p of puzzles) {
    assert.equal(p.mechanic, 'mst'); assert.ok(isExpansion(p)); assert.equal(p.band, 'all'); assert.match(p.id, /^mst-\d\d$/);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3);
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    const q = p.parameters, prices = pricesOf(q), ids = placesOf(q);
    assert.equal(new Set(q.links.map(([u, v]) => [u, v].sort().join())).size, q.links.length, `${p.id}: no repeated link`);
    assert.ok(q.links.every(([u, v, c]) => u !== v && Object.hasOwn(q.nodes, u) && Object.hasOwn(q.nodes, v) && Number.isInteger(c) && c > 0), `${p.id}: links join two places with a positive price`);
    assert.ok(joined(q, q.links.map((_, i) => i)), `${p.id}: the map is connected`);
    // Not drawn to scale: some longer link is cheaper than a shorter one.
    const length = ([u, v]) => Math.hypot(q.nodes[u][0] - q.nodes[v][0], (q.nodes[u][1] - q.nodes[v][1]) / q.aspect);
    if (q.mode !== 'design' && new Set(prices).size > 1) assert.ok(q.links.some(a => q.links.some(b => length(a) > length(b) + 1 && a[2] < b[2])), `${p.id}: length is no guide to price`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: valid unsolved start`);
    const best = cheapestOf(q, prices);
    if (q.mode !== 'design') assert.equal(q.cheapest, prim(q, prices), `${p.id}: cheapest price`);

    if (['cheapest', 'every', 'swap'].includes(q.mode)) {
      // Every cheapest network, built and claimed, is accepted; in every mode all of them together solve it.
      let a = fresh;
      for (const [k, t] of best.entries()) {
        if (q.mode === 'swap') { if (t.filter(i => !q.start.includes(i)).length > q.budget) continue; }
        a = q.mode === 'every' ? a : fresh;
        for (const i of a.board.bought.filter(i => !t.includes(i))) if (!(q.mode === 'swap')) a = play(p, a, {type: 'link', link: i});
        if (q.mode === 'swap') { for (const i of t.filter(i => !a.board.bought.includes(i))) { a = play(p, a, {type: 'link', link: i}); } for (const i of a.board.bought.filter(i => !t.includes(i))) a = play(p, a, {type: 'link', link: i}); }
        else a = buyAll(p, a, t);
        a = play(p, a, {type: 'claim'});
        if (q.mode !== 'every') assert.ok(isSolved(p, a.board), `${p.id}: cheapest network ${k} is accepted`);
        else assert.equal(move(p, a, {type: 'claim'}).board.told.kind, 'again', `${p.id}: claiming it again says it was found`);
      }
      if (q.mode === 'every') {
        assert.equal(q.answers, best.length, `${p.id}: number of cheapest networks`);
        a = play(p, a, {type: 'all'});
        assert.ok(isSolved(p, a.board), `${p.id}: every cheapest network found`);
      }
      // A network that joins every place but is not cheapest: the answer is a real saving.
      const dear = trees(q).filter(t => price(prices, t) > q.cheapest && (q.mode !== 'swap' || t.filter(i => !q.start.includes(i)).length <= q.budget));
      for (const t of dear.slice(0, 6)) {
        let b = q.mode === 'swap' ? fresh : buyAll(p, fresh, t);
        if (q.mode === 'swap') { for (const i of t.filter(i => !b.board.bought.includes(i))) b = play(p, b, {type: 'link', link: i}); for (const i of b.board.bought.filter(i => !t.includes(i))) b = play(p, b, {type: 'link', link: i}); }
        b = play(p, b, {type: 'claim'});
        const told = b.board.told;
        assert.equal(told.kind, 'swap', `${p.id}: a dear network gets a swap`);
        assert.ok(!t.includes(told.add) && t.includes(told.drop), `${p.id}: buy a new link, return an old one`);
        assert.ok(path(q, t, q.links[told.add][0], q.links[told.add][1]).includes(told.drop), `${p.id}: the returned link is on the new link's loop`);
        assert.ok(prices[told.add] < prices[told.drop], `${p.id}: the swap costs less`);
        assert.ok(!isSolved(p, b.board) && validBoard(p, b.board));
        assert.equal(move(p, b, {type: 'claim'}), null, `${p.id}: change something before claiming again`);
        wrongClaims++;
      }
      if (q.mode !== 'swap') {
        // Everything bought: the answer is a loop link.
        const lots = buyAll(p, fresh, q.links.map((_, i) => i));
        const told = play(p, lots, {type: 'claim'}).board.told;
        assert.equal(told.kind, 'loop', `${p.id}: a network with a loop gets a link to return`);
        const rest = q.links.map((_, i) => i).filter(i => i !== told.drop);
        assert.ok(joined(q, rest), `${p.id}: returning it keeps every place joined`);
        wrongClaims++;
        // Not joined: no claim.
        assert.equal(move(p, fresh, {type: 'claim'}), null, `${p.id}: no claim before every place is joined`);
      }
      steps += hintsSolve(p, fresh, 'from fresh');
      // A messy start: everything bought (or, with swaps, every start link returned) first.
      const messy = q.mode === 'swap' ? q.start.reduce((b, i) => play(p, b, {type: 'link', link: i}), fresh) : buyAll(p, fresh, q.links.map((_, i) => i));
      steps += hintsSolve(p, messy, 'from a messy board');
    }
    if (q.mode === 'every') {
      // Undo keeps what was found; That's all too early says there is more.
      let a = play(p, buyAll(p, fresh, best[0]), {type: 'claim'});
      assert.equal(a.board.found.length, 1);
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.told.kind, best.length > 1 ? 'more' : undefined, `${p.id}: That's all too early`);
      const twice = play(p, play(p, play(p, a, {type: 'link', link: best[0][0]}), {type: 'link', link: best[0][0]}), {type: 'claim'});
      assert.equal(twice.board.told.kind, 'again', `${p.id}: a network found already`);
      // That's all pressed on a new cheapest network: Cheapest still keeps it.
      if (best.length > 2) {
        let c = play(p, buyAll(p, a, best[1].filter(i => !a.board.bought.includes(i))), {type: 'link', link: a.board.bought.find(i => !best[1].includes(i))});
        for (const i of c.board.bought.filter(i => !best[1].includes(i))) c = play(p, c, {type: 'link', link: i});
        c = play(p, c, {type: 'all'});
        assert.equal(c.board.told.kind, 'more');
        assert.equal(play(p, c, {type: 'claim'}).board.found.length, 2, `${p.id}: Cheapest after That's all`);
        steps += hintsSolve(p, c, "after That's all on a new network");
      }
      const carried = mechanicFor(p).carry(p, a.board, fresh.board);
      assert.equal(carried.found.length, 1, `${p.id}: Undo keeps the found networks`);
      assert.ok(validBoard(p, carried));
      // Forged saves.
      const dearTree = trees(q).find(t => price(prices, t) > q.cheapest);
      assert.equal(validBoard(p, {...fresh.board, found: [dearTree]}), false, `${p.id}: a dear network can't be found`);
      assert.equal(validBoard(p, {...fresh.board, found: [best[0], best[0]]}), false, `${p.id}: no network twice`);
      assert.equal(validBoard(p, {...fresh.board, found: [best[0]], done: true}), best.length === 1, `${p.id}: done needs every network`);
    }
    if (q.mode === 'swap') {
      // The budget is the fewest new links that reach a cheapest network.
      assert.equal(Math.min(...best.map(t => t.filter(i => !q.start.includes(i)).length)), q.budget, `${p.id}: budget`);
      assert.ok(q.start.length === ids.length - 1 && joined(q, q.start), `${p.id}: the start joins every place with no loop`);
      // A swap that saves money but adds a link no reachable cheapest network has leaves too few swaps.
      const reachable = best.filter(t => t.filter(i => !q.start.includes(i)).length === q.budget);
      const wasteful = q.links.map((_, add) => add).filter(add => !q.start.includes(add) && !reachable.some(t => t.includes(add)));
      assert.ok(wasteful.length > 0, `${p.id}: some new links are wasteful`);
      const fullBoard = q.links.map((_, i) => i).filter(i => !q.start.includes(i)).slice(0, q.budget + 1);
      assert.equal(validBoard(p, {...fresh.board, bought: [...q.start, ...fullBoard].sort((x, y) => x - y)}), false, `${p.id}: more new links than the budget`);
      let over = fresh;
      for (const i of fullBoard.slice(0, q.budget)) over = play(p, over, {type: 'link', link: i});
      assert.equal(move(p, over, {type: 'link', link: fullBoard[q.budget]}), null, `${p.id}: no new link past the budget`);
      assert.ok(move(p, over, {type: 'link', link: fullBoard[0]}), `${p.id}: returning a new link gives the swap back`);
    }
    if (q.mode === 'forced') {
      assert.ok(best.every(t => t.includes(q.target)), `${p.id}: the dark link is in every cheapest network`);
      const crossing = side => q.links.map((_, i) => i).filter(i => side.has(q.links[i][0]) !== side.has(q.links[i][1]));
      const proofs = [];
      for (let mask = 1; mask < 1 << (ids.length - 1); mask++) {
        const side = new Set(ids.slice(1).filter((_, k) => mask >> k & 1)), across = crossing(side);
        const ok = across.includes(q.target) && across.every(i => i === q.target || prices[i] > prices[q.target]);
        if (ok) proofs.push(side);
        assert.equal(isSolved(p, {side: [...side]}), ok, `${p.id}: split ${[...side].join('')}`);
        const other = ids.filter(id => !side.has(id));
        assert.equal(isSolved(p, {side: other}), ok, `${p.id}: either side of a split works`);
      }
      assert.ok(proofs.length > 0, `${p.id}: a split proves it`);
      assert.equal(isSolved(p, {side: ids}), false, `${p.id}: every place on one side is no split`);
      steps += hintsSolve(p, fresh, 'from fresh');
      // A messy side: places added in turn, skipping any that would already solve it.
      const messy = ids.reduce((b, id) => { const next = play(p, b, {type: 'place', node: id}); return isSolved(p, next.board) ? b : next; }, fresh);
      steps += hintsSolve(p, messy, 'from a messy board');
      assert.equal(validBoard(p, {side: ['Z']}), false); assert.equal(validBoard(p, {side: [ids[0], ids[0]]}), false);
      assert.equal(move(p, fresh, {type: 'link', link: 0}), null, `${p.id}: no buying in a split puzzle`);
    }
    if (q.mode === 'excluded') {
      assert.ok(best.every(t => !t.includes(q.target)), `${p.id}: the dark link is in no cheapest network`);
      // Every loop through the dark link: picked exactly, solved only when it is the strict dearest.
      let proofs = 0;
      for (let size = 3; size <= ids.length; size++) for (const set of subsets(q.links.length, size)) {
        if (!set.includes(q.target)) continue;
        const deg = {}; for (const i of set) for (const id of q.links[i].slice(0, 2)) deg[id] = (deg[id] || 0) + 1;
        const loop = Object.values(deg).every(d => d === 2) && hasLoop(q, set) && set.length === Object.keys(deg).length && (() => { const sub = {...q, nodes: Object.fromEntries(Object.keys(deg).map(id => [id, q.nodes[id]]))}; return joined(sub, set); })();
        const ok = loop && set.every(i => i === q.target || prices[i] < prices[q.target]);
        if (ok) proofs++;
        assert.equal(isSolved(p, {bought: set}), ok, `${p.id}: loop ${set.join(',')}`);
      }
      assert.ok(proofs > 0, `${p.id}: a loop proves it`);
      steps += hintsSolve(p, fresh, 'from fresh');
      steps += hintsSolve(p, buyAll(p, fresh, q.links.map((_, i) => i)), 'from a messy board');
    }
    if (q.mode === 'design') {
      let hits = 0;
      const counts = new Set();
      (function each(list) {
        if (list.length === q.links.length) { const n = cheapestOf(q, list).length; counts.add(n); if (n === q.want) hits++; return; }
        for (const c of [1, 2, 3, 4]) each([...list, c]);
      })([]);
      assert.equal(hits, 144, `${p.id}: 144 of 4096 pricings give exactly ${q.want}`);
      assert.ok(counts.has(5) && !counts.has(7), `${p.id}: five is possible and seven is not`);
      // A pricing with a loop of four 1s and two 2s.
      const loop4 = ['BC', 'AC', 'AD', 'BD'].map(n => q.links.findIndex(([u, v]) => u + v === n));
      const target = q.links.map((_, i) => loop4.includes(i) ? 1 : 2);
      let a = fresh;
      for (const [i, c] of target.entries()) while (a.board.prices[i] !== c) a = play(p, a, {type: 'price', link: i});
      a = play(p, a, {type: 'check'});
      assert.ok(isSolved(p, a.board), `${p.id}: a loop of four equal links gives four`);
      const wrong = play(p, fresh, {type: 'check'});
      assert.equal(wrong.board.told.kind, 'list', `${p.id}: a wrong check lists the cheapest networks`);
      assert.equal(move(p, wrong, {type: 'check'}), null, `${p.id}: change a price before checking again`);
      steps += hintsSolve(p, fresh, 'from fresh');
      steps += hintsSolve(p, wrong, 'after a wrong check');
      assert.equal(validBoard(p, {prices: q.links.map(() => 1), checked: true, told: null}), false, `${p.id}: a forged check`);
      assert.equal(validBoard(p, {prices: q.links.map(() => 5), checked: false, told: null}), false, `${p.id}: prices are 1 to 4`);
    }
    // Illegal moves change nothing.
    for (const bad of [null, 'link', {type: 'link'}, {type: 'link', link: -1}, {type: 'link', link: q.links.length}, {type: 'place', node: 'Z'}, {type: 'price', link: 99}, {type: 'fly'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    if (!['forced', 'excluded', 'design'].includes(q.mode)) {
      assert.equal(validBoard(p, {...fresh.board, bought: [0, 0]}), false, `${p.id}: a link bought twice`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), q.mode === 'every' ? true : false, `${p.id}: a forged claim`);
      const dearTree = trees(q).find(t => price(prices, t) > q.cheapest && (q.mode !== 'swap' || t.filter(i => !q.start.includes(i)).length <= q.budget));
      if (dearTree) assert.equal(validBoard(p, {...fresh.board, bought: dearTree, told: {kind: 'swap', add: 0, drop: 0}}), false, `${p.id}: a forged answer`);
    }
  }
  return {mstPuzzles: puzzles.length, sources: pack.sources.length, wrongClaims, hintSteps: steps};
}
export default validateMst;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMst(), null, 2));
