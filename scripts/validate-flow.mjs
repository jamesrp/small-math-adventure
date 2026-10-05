// Checks the Routes and roadblocks pack (dist/families/flow/flow.json): content
// fields and sources; every best count against an independent max flow
// (Edmonds–Karp on the residual graph) and an exhaustive check that one fewer
// roadblock never stops everything; that the flow's own routes and cut, played
// as moves, solve the puzzle; every game's winner against a separate minimax;
// hint chains from fresh and from trap boards; illegal moves; forged saves.
// Run: node scripts/validate-flow.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// Reachability over open arrows, written separately from the mechanic.
function reaches(q, shut) {
  const seen = new Set([q.start]), stack = [q.start];
  while (stack.length) { const at = stack.pop(); for (const [k, [u, v]] of q.arcs.entries()) if (u === at && !shut.has(k) && !seen.has(v)) { seen.add(v); stack.push(v); } }
  return seen.has(q.finish);
}
// Edmonds–Karp with unit capacities: returns the flow value, routes read off
// the flow, and the arrows leaving the residual-reachable side (a minimum cut).
function maxFlow(q) {
  const flow = q.arcs.map(() => 0);
  for (;;) {
    const from = new Map([[q.start, null]]), queue = [q.start];
    while (queue.length && !from.has(q.finish)) {
      const at = queue.shift();
      q.arcs.forEach(([u, v], k) => {
        if (u === at && !flow[k] && !from.has(v)) { from.set(v, {k, dir: 1, prev: u}); queue.push(v); }
        if (v === at && flow[k] && !from.has(u)) { from.set(u, {k, dir: -1, prev: v}); queue.push(u); }
      });
    }
    if (!from.has(q.finish)) {
      const side = new Set(from.keys());
      const cut = q.arcs.map(([u, v], k) => side.has(u) && !side.has(v) ? k : -1).filter(k => k >= 0);
      const value = flow.reduce((n, f, k) => n + (q.arcs[k][0] === q.start ? f : 0) - (q.arcs[k][1] === q.start ? f : 0), 0);
      // Decompose into simple routes, removing any cycles first.
      const left = [...flow], routes = [];
      for (let r = 0; r < value; r++) {
        let path = [q.start];
        while (path.at(-1) !== q.finish) {
          const k = left.findIndex((f, j) => f && q.arcs[j][0] === path.at(-1));
          left[k] = 0;
          const v = q.arcs[k][1], loop = path.indexOf(v);
          path = loop >= 0 ? path.slice(0, loop + 1) : [...path, v];
        }
        routes.push(path);
      }
      return {value, cut, routes};
    }
    for (let at = q.finish; at !== q.start;) { const step = from.get(at); flow[step.k] += step.dir; at = step.prev; }
  }
}
const subsets = (n, size, from = 0) => size === 0 ? [[]] : Array.from({length: Math.max(0, n - from)}, (_, i) => from + i).flatMap(i => subsets(n, size - 1, i + 1).map(rest => [i, ...rest]));
// The roadblock game by plain minimax over sets of closed arrows: does the
// player to move win from this set?
function winsFrom(q, shut, memo = new Map()) {
  const key = [...shut].sort((a, b) => a - b).join(',');
  if (memo.has(key)) return memo.get(key);
  let result = false;
  for (let k = 0; k < q.arcs.length && !result; k++) {
    if (shut.has(k)) continue;
    const next = new Set([...shut, k]);
    if (!reaches(q, next) || !winsFrom(q, next, memo)) result = true;
  }
  memo.set(key, result);
  return result;
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
const drawRoute = (p, a, route) => route.slice(1).reduce((b, v) => play(p, b, {type: 'step', node: v}), a);

export async function validateFlow() {
  const flow = JSON.parse(await readFile(new URL('../dist/families/flow/flow.json', import.meta.url), 'utf8'));
  const {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of flow.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(flow.families.length, 1);
  assert.equal(flow.families[0].id, 'flow');
  const puzzles = flow.puzzles;
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  let steps = 0;
  for (const p of puzzles) {
    assert.equal(p.mechanic, 'flow'); assert.ok(isExpansion(p)); assert.equal(p.band, 'all'); assert.match(p.id, /^flow-\d\d$/);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3);
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
    const q = p.parameters;
    assert.ok(Object.hasOwn(q.nodes, q.start) && Object.hasOwn(q.nodes, q.finish));
    assert.equal(new Set(q.arcs.map(a => a.join())).size, q.arcs.length, `${p.id}: no repeated arrow`);
    assert.ok(q.arcs.every(([u, v]) => u !== v && Object.hasOwn(q.nodes, u) && Object.hasOwn(q.nodes, v) && v !== q.start && u !== q.finish), `${p.id}: arrows join dots, none into start or out of finish`);
    assert.ok(Object.keys(q.nodes).every(id => q.arcs.some(a => a.includes(id))), `${p.id}: every dot has an arrow`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: valid unsolved start`);
    if (q.mode === 'game') {
      assert.equal(q.winner, winsFrom(q, new Set()) ? 'first' : 'second', `${p.id}: winner`);
      steps += hintsSolve(p, fresh, 'from fresh');
      // Choosing the losing side: hints lead through Again to a win.
      const wrong = play(p, fresh, {type: 'order', order: q.winner === 'first' ? 'second' : 'first'});
      steps += hintsSolve(p, wrong, 'after the losing choice');
      assert.equal(move(p, fresh, {type: 'close', arc: 0}), null, `${p.id}: no move before choosing`);
      // Going first on a first-player board, a losing opening leaves only Again.
      if (q.winner === 'first') {
        const k = q.arcs.findIndex((_, j) => reaches(q, new Set([j])) && winsFrom(q, new Set([j])));
        assert.ok(k >= 0, `${p.id}: some opening loses`);
        const lost = play(p, play(p, fresh, {type: 'order', order: 'first'}), {type: 'close', arc: k});
        assert.equal(nextHint(p, lost).action.type, 'again', `${p.id}: a lost game hints Again`);
      }
      // A save whose other-side moves were not its own best moves is forged.
      const opening = play(p, fresh, {type: 'order', order: 'second'}).board.closed[0];
      assert.equal(validBoard(p, {order: 'second', closed: [(opening + 1) % q.arcs.length]}), false, `${p.id}: forged opening rejected`);
      assert.equal(validBoard(p, {order: null, closed: [0]}), false, `${p.id}: closures before choosing rejected`);
      continue;
    }
    // Packing: independent best count, cut, and a matching witness played as moves.
    const {value, cut, routes} = maxFlow(q);
    assert.equal(q.best, value, `${p.id}: best is the max flow`);
    assert.equal(cut.length, value, `${p.id}: the residual cut matches`);
    assert.ok(!reaches(q, new Set(cut)), `${p.id}: the cut stops everything`);
    assert.ok(subsets(q.arcs.length, value - 1).every(set => reaches(q, new Set(set))), `${p.id}: no ${value - 1} roadblocks stop everything`);
    // Puzzles may start with stuck routes drawn; the checks below start empty.
    const empty = {...fresh, board: {routes: [], closed: []}};
    if (q.routes) {
      assert.ok(q.routes.length < value, `${p.id}: the drawn routes are not the most`);
      assert.equal(nextHint(p, fresh).action.type, 'erase', `${p.id}: the drawn routes are stuck, so the first hint clears one`);
    }
    let a = empty;
    for (const route of routes) a = drawRoute(p, a, route);
    for (const k of cut.slice(0, -1)) a = play(p, a, {type: 'close', arc: k});
    assert.ok(!isSolved(p, a.board), `${p.id}: one roadblock short is not solved`);
    a = play(p, a, {type: 'close', arc: cut.at(-1)});
    assert.ok(isSolved(p, a.board), `${p.id}: the flow's routes and cut solve it`);
    assert.equal(move(p, a, {type: 'open', arc: cut[0]}), null, `${p.id}: no moves after a solve`);
    // Too many roadblocks do not count, even when they stop everything.
    const over = {routes: routes.map(r => [...r]), closed: [...cut, q.arcs.findIndex((_, k) => !cut.includes(k))].sort((x, y) => x - y)};
    assert.ok(validBoard(p, over) && !isSolved(p, over), `${p.id}: more roadblocks than routes is not solved`);
    // Hints from fresh, and from the longest single route drawn first (a trap where there is one).
    steps += hintsSolve(p, fresh, 'from fresh');
    const longest = [];
    (function walk(path) { if (path.at(-1) === q.finish) { if (path.length > longest.length) longest.splice(0, longest.length, ...path); return; } for (const [u, v] of q.arcs) if (u === path.at(-1) && !path.includes(v)) walk([...path, v]); })([q.start]);
    const trapped = drawRoute(p, empty, longest);
    steps += hintsSolve(p, trapped, 'after the longest route');
    // A half-drawn route and stray roadblocks: hints clean up and finish.
    let messy = play(p, empty, {type: 'step', node: q.start});
    for (let k = 0; k < Math.min(2, q.arcs.length); k++) messy = play(p, messy, {type: 'close', arc: q.arcs.length - 1 - k});
    steps += hintsSolve(p, messy, 'from a messy board');
    // Illegal moves change nothing.
    const [s0, v0] = q.arcs.find(([u]) => u === q.start), notArc = Object.keys(q.nodes).find(v => v !== q.start && !q.arcs.some(([u, w]) => u === q.start && w === v));
    for (const bad of [null, 'step', {type: 'step'}, {type: 'step', node: 'Z'}, {type: 'erase', route: 0}, {type: 'open', arc: 0}, {type: 'close', arc: -1}, {type: 'close', arc: q.arcs.length}, {type: 'fly'}]) assert.equal(move(p, empty, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    if (notArc) assert.equal(move(p, empty, {type: 'step', node: notArc}), null, `${p.id}: no step without an arrow`);
    const one = play(p, play(p, empty, {type: 'step', node: s0}), {type: 'step', node: v0});
    assert.equal(move(p, one, {type: 'step', node: q.start}).board.routes.length, 1, `${p.id}: Start sets a route in progress aside`);
    assert.equal(move(p, one, {type: 'close', arc: q.arcs.findIndex(([u, v]) => u === s0 && v === v0)}).board.closed.length, 1, `${p.id}: roadblocks may sit on a route`);
    // Forged saves.
    assert.equal(validBoard(p, {routes: [[q.start, v0], [q.start, v0]], closed: []}), false, `${p.id}: two routes on one arrow`);
    assert.equal(validBoard(p, {routes: [[v0]], closed: []}), false, `${p.id}: a route not from start`);
    assert.equal(validBoard(p, {routes: [[q.start, v0], [q.start]], closed: []}), v0 === q.finish, `${p.id}: only the last route may be unfinished`);
    assert.equal(validBoard(p, {routes: [], closed: [0, 0]}), false, `${p.id}: a roadblock twice`);
  }
  return {flowPuzzles: puzzles.length, games: puzzles.filter(p => p.parameters.mode === 'game').length, sources: flow.sources.length, hintSteps: steps};
}
export default validateFlow;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateFlow(), null, 2));
