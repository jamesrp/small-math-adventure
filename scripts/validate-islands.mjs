// Checks the Bridge Courier Islands pack (dist/families/islands/islands.json):
// content fields and sources; every answer recomputed by brute force over
// walks, independent of the mechanic's memoised search (where a walk over
// every bridge can start, which one new bridge makes a walk, the fewest new
// bridges for a walk that comes back by trying every set of new bridges, the
// fewest repeats by trying every route up to a length), and cross-checked
// against Euler's parity rule; the stored witnesses; that hints alone finish
// every puzzle from a fresh board and after wrong moves and refused claims;
// that a certificate passes for exactly one set of tapped islands; illegal
// moves and forged saves (including a forged done and a forged answer); and
// the drawing (double bridges apart, every bridge clear of other islands).
// Run: node scripts/validate-islands.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {graphOf, edgeGeometry, NODE_R} from '../dist/graph-board.js';
import {bridgesOf} from '../dist/families/islands/islands.js';
import {loadPack} from './packs.mjs';

// ---------------------------------------------------------------- brute force
// Bridges as plain pairs; every walk tried bridge by bridge, without memory.
const pairsOf = (q, added = []) => [...q.bridges.map(([u, v]) => [u, v]), ...added.map(([u, v]) => [u, v])];
const ids = q => Object.keys(q.nodes);
function walksFrom(pairs, start, home = null) {
  const used = pairs.map(() => false);
  const go = (at, left) => {
    if (!left) return home === null || at === home;
    for (let i = 0; i < pairs.length; i++) {
      if (used[i]) continue;
      const [u, v] = pairs[i];
      if (u !== at && v !== at) continue;
      used[i] = true;
      const ok = go(u === at ? v : u, left - 1);
      used[i] = false;
      if (ok) return true;
    }
    return false;
  };
  return go(start, pairs.length);
}
const startsBrute = (q, pairs) => ids(q).filter(s => walksFrom(pairs, s));
const closedBrute = (q, pairs) => ids(q).some(s => walksFrom(pairs, s, s));
const parity = (q, pairs) => { const d = Object.fromEntries(ids(q).map(id => [id, 0])); for (const [u, v] of pairs) { d[u]++; d[v]++; } return {d, odd: ids(q).filter(id => d[id] % 2)}; };
function connected(q, pairs) {
  const seen = new Set([ids(q)[0]]), stack = [ids(q)[0]];
  while (stack.length) { const x = stack.pop(); for (const [u, v] of pairs) for (const [a, b] of [[u, v], [v, u]]) if (a === x && !seen.has(b)) { seen.add(b); stack.push(b); } }
  return seen.size === ids(q).length;
}
// Every multiset of k new bridges (pairs of different islands).
function* newSets(q, k, from = 0) {
  const all = ids(q).flatMap((u, i) => ids(q).slice(i + 1).map(v => [u, v]));
  if (k === 0) { yield []; return; }
  for (let i = from; i < all.length; i++) for (const rest of newSets(q, k - 1, i)) yield [all[i], ...rest];
}
const fewestNewBrute = q => { for (let k = 0; k <= 4; k++) for (const set of newSets(q, k)) if (closedBrute(q, pairsOf(q, set))) return k; return Infinity; };
// The fewest repeats of a route that crosses every bridge at least once and
// comes back: every route of each length, shortest first.
function fewestRepeatsBrute(q) {
  const pairs = pairsOf(q), E = pairs.length;
  for (let extra = 0; extra <= 6; extra++) {
    const length = E + extra, uses = pairs.map(() => 0);
    const go = (home, at, left) => {
      if (!left) return at === home && uses.every(n => n > 0);
      for (let i = 0; i < E; i++) {
        const [u, v] = pairs[i];
        if (u !== at && v !== at) continue;
        uses[i]++;
        const ok = go(home, u === at ? v : u, left - 1);
        uses[i]--;
        if (ok) return true;
      }
      return false;
    };
    if (ids(q).some(s => go(s, s, length))) return extra;
  }
  return Infinity;
}

// ---------------------------------------------------------------- helpers
const run = (p, a, actions) => actions.reduce((x, action) => { const y = move(p, x, action); assert.ok(y, `${p.id}: ${JSON.stringify(action)} is legal`); return y; }, a);
function finish(p, a, limit = 120) {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: hints keep naming a move (${JSON.stringify(a.board)})`);
    assert.ok(h.text && !/undefined|null|NaN/.test(h.text), `${p.id}: hint text ${h.text}`);
    const next = move(p, a, h.action);
    assert.ok(next && next !== a, `${p.id}: the hinted move ${JSON.stringify(h.action)} is legal and changes the board`);
    a = next;
  }
  assert.ok(isSolved(p, a.board), `${p.id}: hints alone finish`);
  return steps;
}
// Undo as the app does it: back one step, keeping what carry keeps.
const undoCarry = (p, a) => { const back = undo(a), carry = mechanicFor(p).carry; return carry ? {...back, board: carry(p, a.board, back.board)} : back; };
// Every move a child could make on this board.
function legalMoves(p, a) {
  const q = p.parameters, list = [];
  const all = bridgesOf(q, a.board.added);
  for (const id of ids(q)) list.push({type: 'island', island: id}, {type: 'color', island: id});
  for (let i = 0; i < all.length; i++) list.push({type: 'bridge', bridge: i}, {type: 'remove', bridge: i});
  for (const [u, v] of ids(q).flatMap((u, i) => ids(q).slice(i + 1).map(v => [u, v]))) list.push({type: 'add', u, v});
  list.push({type: 'again'}, {type: 'done'});
  for (const claim of ['none', 'fewest']) for (const picks of [[ids(q)[0]], ids(q), ids(q).slice(1)]) list.push({type: 'check', claim, picks});
  return list.map(action => [action, move(p, a, action)]).filter(([, next]) => next && next !== a);
}
// A walk from `start` that crosses the first bridge with a counter until it
// can go no further (every walk ends: there are finitely many counters).
function endWalk(p, a, start) {
  a = run(p, a, [{type: 'island', island: start}]);
  for (;;) {
    const all = bridgesOf(p.parameters, a.board.added), uses = all.map(() => 0);
    let at = a.board.start;
    for (const i of a.board.path) { uses[i]++; at = all[i][0] === at ? all[i][1] : all[i][0]; }
    const next = all.findIndex(([u, v], i) => !uses[i] && (u === at || v === at));
    if (next < 0) return a;
    a = run(p, a, [{type: 'bridge', bridge: next}]);
  }
}
// The shortest walk that can go no further: [start, bridges], by search.
function shortestEnd(q) {
  const pairs = pairsOf(q);
  let best = null;
  const go = (start, at, used, path) => {
    if (best && path.length >= best[1].length) return;
    const open = pairs.map((e, i) => i).filter(i => !used.has(i) && (pairs[i][0] === at || pairs[i][1] === at));
    if (!open.length) { if (path.length) best = [start, [...path]]; return; }
    for (const i of open) go(start, pairs[i][0] === at ? pairs[i][1] : pairs[i][0], new Set([...used, i]), [...path, i]);
  };
  for (const s of ids(q)) go(s, s, new Set(), []);
  return best;
}
// The single-island strategy against Done: color one island, press Done, and
// read the answer ("There is another." means a start), for each island in
// turn, then color the starts. Under the first rules (any first crossing
// counted as a try and recoloring reopened Done) that cost one crossing and
// then three taps per island. Now a refused Done waits for a walk that ends,
// so each probe costs the shortest such walk too. Returns both costs.
function probeStarts(p, starts) {
  const q = p.parameters, [first, path] = shortestEnd(q), walkCost = 2 + path.length;
  let a = freshAttempt(p), moves = 0, found = [];
  const step = actions => { a = run(p, a, actions); moves += actions.length; };
  const recolor = want => step([...a.board.colored.filter(id => !want.includes(id)), ...want.filter(id => !a.board.colored.includes(id))].map(id => ({type: 'color', island: id})));
  for (const id of ids(q)) {
    if (a.board.lock >= a.board.tried) {
      // Locked: recoloring alone, or a walk under way, does not reopen Done.
      recolor([id]);
      assert.equal(move(p, a, {type: 'done'}), null, `${p.id}: Done stays shut until a walk ends`);
      step([...(a.board.start === null ? [] : [{type: 'again'}]), {type: 'island', island: first}, ...path.slice(0, -1).map(i => ({type: 'bridge', bridge: i}))]);
      assert.equal(move(p, a, {type: 'done'}), null, `${p.id}: a walk under way does not reopen Done`);
      step([{type: 'bridge', bridge: path.at(-1)}]);
    }
    recolor([id]);
    const before = a.board.tried;
    step([{type: 'done'}]);
    if (isSolved(p, a.board)) return {islands: ids(q).length, before: 2 + 3 * ids(q).length, after: moves, walkCost};
    assert.equal(a.board.lock, before, `${p.id}: a refused Done locks`);
    if (a.board.told === 'other') found.push(id);
  }
  assert.deepEqual(found, starts, `${p.id}: the probes find the starts`);
  if (a.board.lock >= a.board.tried) step([...(a.board.start === null ? [] : [{type: 'again'}]), {type: 'island', island: first}, ...path.map(i => ({type: 'bridge', bridge: i}))]);
  recolor(starts); step([{type: 'done'}]);
  assert.ok(isSolved(p, a.board));
  const after = moves;
  assert.ok(after >= ids(q).length * (walkCost + 2), `${p.id}: every probe costs a walk that ends`);
  return {islands: ids(q).length, before: 2 + 3 * ids(q).length + starts.length + 1, after, walkCost};
}
const random = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const subsets = list => list.reduce((out, x) => [...out, ...out.map(s => [...s, x])], [[]]).filter(s => s.length);

export default async function validateIslands() {
  const book = JSON.parse(await readFile(new URL('../dist/families/islands/islands.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const sourceIds = new Set(pack.sources.map(s => s.id));
  for (const s of book.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.deepEqual(book.puzzles.map(p => p.number), book.puzzles.map((_, i) => i + 1), 'numbered from 1');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(book.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  const report = {certificates: {}, probes: {}, hintMoves: 0, wanderings: 0};
  for (const p of book.puzzles) {
    const q = p.parameters, label = p.id;
    // Content.
    assert.equal(p.id, `islands-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'islands'); assert.equal(p.libraryFamily, 'route'); assert.equal(p.familyTitle, 'Bridge Courier'); assert.equal(p.group, 'Islands'); assert.equal(p.band, 'all');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.match(p.provenance, /Week 10/, `${label}: names its worksheet source`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    assert.ok(!/Press|Color [A-F]|tap [A-F]/.test(p.hints[0]), `${label}: the first hint names no answer`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => sourceIds.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(/^A walk starts|^A route starts/.test(p.controls), `${label}: How to play opens with the mathematics`);
    assert.ok(!/odd|even|half|dead end/i.test(p.controls + p.objective + p.visibleObjective + p.title + p.hints[0]), `${label}: no theorem in the rules, title or first hint`);

    // The town.
    const pairs = pairsOf(q), {d, odd} = parity(q, pairs);
    assert.ok(connected(q, pairs), `${label}: the town is in one piece`);
    assert.ok(Object.values(q.nodes).every(pt => pt.every(c => c >= 0 && c <= 100)), `${label}: positions in percent`);
    const g = graphOf({nodes: q.nodes, edges: bridgesOf(q).map(([u, v, bend]) => [u, v, null, bend]), aspect: q.aspect});
    for (const e of g.edges) {
      const {a, b, c} = edgeGeometry(g, e);
      for (const id of g.ids) {
        if (id === e.u || id === e.v) continue;
        for (let k = 0; k <= 40; k++) {
          const t = k / 40, s = 1 - t, at = c ? [s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]] : [s * a[0] + t * b[0], s * a[1] + t * b[1]];
          assert.ok(Math.hypot(at[0] - g.pos[id][0], at[1] - g.pos[id][1]) > NODE_R + 2, `${label}: bridge ${e.u}–${e.v} keeps clear of ${id}`);
        }
      }
      for (const f of g.edges) if (f.i > e.i && [f.u, f.v].sort().join() === [e.u, e.v].sort().join()) {
        const sign = f.u === e.u ? 1 : -1;
        assert.ok(Math.abs((e.bend || 0) - sign * (f.bend || 0)) >= 9, `${label}: the bridges ${e.u}–${e.v} are drawn apart`);
      }
    }
    for (const [i, x] of g.ids.entries()) for (const y of g.ids.slice(i + 1)) assert.ok(Math.hypot(g.pos[x][0] - g.pos[y][0], g.pos[x][1] - g.pos[y][1]) > 3 * NODE_R, `${label}: ${x} and ${y} are apart`);

    // Answers, by brute force, and Euler's rule.
    assert.deepEqual(p.solution.odd, odd, `${label}: the odd islands`);
    const fresh = freshAttempt(p);
    const sol = p.solution;
    if (q.mode === 'starts') {
      const starts = startsBrute(q, pairs);
      assert.deepEqual(sol.starts, starts, `${label}: every start`);
      assert.deepEqual(starts, odd.length === 0 ? ids(q) : odd.length === 2 ? odd : [], `${label}: Euler’s rule`);
    }
    if (q.mode === 'add') {
      const working = ids(q).flatMap((u, i) => ids(q).slice(i + 1).map(v => [u, v])).filter(pair => startsBrute(q, pairsOf(q, [pair])).length);
      assert.deepEqual(sol.working, working, `${label}: the new bridges that work`);
      assert.ok(!startsBrute(q, pairs).length, `${label}: no walk before the new bridge`);
      assert.ok(working.length > 0 && working.length < ids(q).length * (ids(q).length - 1) / 2 + 1, `${label}: some new bridge works`);
    }
    if (q.mode === 'fewest') {
      const fewest = fewestNewBrute(q);
      assert.equal(sol.fewest, fewest, `${label}: the fewest new bridges`);
      assert.equal(fewest, odd.length / 2, `${label}: half the odd islands`);
      assert.ok(fewest > 0, `${label}: needs a new bridge`);
    }
    if (q.mode === 'deliver') {
      const fewest = fewestRepeatsBrute(q), ends = ids(q).filter(id => d[id] === 1);
      assert.equal(sol.fewest, fewest, `${label}: the fewest repeats`);
      assert.deepEqual(sol.deadEnds, ends, `${label}: the dead ends`);
      assert.ok(fewest > odd.length / 2, `${label}: repeats run along bridges, so more than half the odd islands`);
      assert.equal(fewest, ends.length, `${label}: one repeat per dead end`);
    }

    // The witness.
    const solved = run(p, fresh, sol.moves);
    assert.ok(isSolved(p, solved.board), `${label}: the witness solves`);

    // Hints alone, from fresh and after wandering (wrong moves and refused claims).
    assert.notEqual(nextHint(p, fresh).type, 'note');
    report.hintMoves += finish(p, fresh);
    const roll = random(p.number * 7919);
    for (let trial = 0; trial < 12; trial++) {
      let a = fresh;
      for (let k = 0, n = 1 + Math.floor(roll() * 9); k < n; k++) {
        const options = legalMoves(p, a).filter(([, next]) => !isSolved(p, next.board));
        if (!options.length) break;
        a = options[Math.floor(roll() * options.length)][1];
        if (roll() < .15 && a.history.length) a = undoCarry(p, a);
      }
      report.wanderings++;
      report.hintMoves += finish(p, a);
    }

    // Claims: a refusal, its lock through Undo, and the certificate.
    const certificate = q.mode === 'deliver' ? sol.deadEnds : odd;
    // A delivery route can always turn back, so it ends only when it is finished.
    const ended = q.mode === 'deliver' ? run(p, fresh, sol.moves.slice(0, -1)) : endWalk(p, fresh, ids(q)[0]);
    assert.ok(ended.board.tried === 1, `${label}: a walk that can go no further counts as tried`);
    if (q.mode === 'deliver') assert.equal(run(p, fresh, sol.moves.slice(0, -2)).board.tried, 0, `${label}: a route under way is not tried yet`);
    if (q.mode === 'starts' && sol.starts.length) {
      // A wrong No walk after a walk is refused and locked until a new walk ends.
      const bare = run(p, ended, ended.board.colored.map(id => ({type: 'color', island: id})));
      const refused = run(p, bare, [{type: 'check', claim: 'none', picks: [ids(q)[0]]}]);
      assert.equal(refused.board.told, 'walk', `${label}: a wrong No walk is refused`);
      assert.equal(move(p, refused, {type: 'check', claim: 'none', picks: [ids(q)[0]]}), null, `${label}: No walk waits for a new walk`);
      const back = undoCarry(p, refused);
      assert.equal(back.board.told, null, `${label}: Undo takes the answer away`);
      assert.equal(move(p, back, {type: 'check', claim: 'none', picks: [ids(q)[0]]}), null, `${label}: Undo keeps the lock`);
      // Done is judged as a whole, for one set only.
      const ok = subsets(ids(q)).filter(set => {
        const next = move(p, run(p, bare, set.map(id => ({type: 'color', island: id}))), {type: 'done'});
        return next && isSolved(p, next.board);
      });
      assert.equal(ok.length, 1, `${label}: Done accepts one set of islands`);
      report.certificates[label] = `Done: 1 of ${subsets(ids(q)).length}`;
      assert.equal(move(p, run(p, fresh, [{type: 'color', island: sol.starts[0]}]), {type: 'done'}), null, `${label}: no Done before a walk`);
      report.probes[label] = probeStarts(p, sol.starts);
    }
    if (q.mode === 'starts' && !sol.starts.length) {
      assert.equal(move(p, fresh, {type: 'check', claim: 'none', picks: certificate}), null, `${label}: no claim on a fresh board`);
      const ok = subsets(ids(q)).filter(set => isSolved(p, move(p, ended, {type: 'check', claim: 'none', picks: set}).board));
      assert.deepEqual(ok.map(s => [...s].sort().join()), [[...certificate].sort().join()], `${label}: only the odd islands certify No walk`);
      const wrongs = subsets(ids(q)).filter(set => !ok.some(o => o.join() === set.join())).map(set => move(p, ended, {type: 'check', claim: 'none', picks: set}).board.told);
      assert.deepEqual([...new Set(wrongs)], ['wrong'], `${label}: one answer for every wrong set`);
      report.certificates[label] = certificate.length === ids(q).length ? `No walk: every island (tapping all passes)` : `No walk: 1 of ${subsets(ids(q)).length}`;
      const wrong = run(p, ended, [{type: 'check', claim: 'none', picks: certificate.slice(1)}]);
      assert.equal(wrong.board.told, 'wrong'); assert.equal(move(p, wrong, {type: 'check', claim: 'none', picks: certificate}), null, `${label}: a refusal locks the claim`);
      const back = undoCarry(p, wrong);
      assert.equal(move(p, back, {type: 'check', claim: 'none', picks: certificate}), null, `${label}: Undo keeps the lock`);
      const partial = run(p, back, [{type: 'again'}, {type: 'island', island: ids(q)[0]}, {type: 'bridge', bridge: bridgesOf(q).findIndex(([u, v]) => u === ids(q)[0] || v === ids(q)[0])}]);
      if (!partial.board.tried || partial.board.tried === back.board.tried) assert.equal(move(p, partial, {type: 'check', claim: 'none', picks: certificate}), null, `${label}: a walk under way doesn't reopen the claim`);
      assert.ok(isSolved(p, run(p, endWalk(p, run(p, back, [{type: 'again'}]), ids(q)[0]), [{type: 'check', claim: 'none', picks: certificate}]).board), `${label}: a new walk that ends opens the claim again`);
    }
    if (q.mode === 'fewest' || q.mode === 'deliver') {
      const ready = run(p, fresh, sol.moves.slice(0, -1));
      const ok = subsets(ids(q)).filter(set => isSolved(p, move(p, ready, {type: 'check', claim: 'fewest', picks: set}).board));
      assert.deepEqual(ok.map(s => [...s].sort().join()), [[...certificate].sort().join()], `${label}: only one set of islands certifies Fewest`);
      const wrongs = subsets(ids(q)).filter(set => !ok.some(o => o.join() === set.join())).map(set => move(p, ready, {type: 'check', claim: 'fewest', picks: set}).board.told);
      assert.deepEqual([...new Set(wrongs)], ['wrong'], `${label}: one answer for every wrong set`);
      report.certificates[label] = certificate.length === ids(q).length ? `Fewest: every island (tapping all passes)` : `Fewest: 1 of ${subsets(ids(q)).length}`;
      assert.equal(move(p, fresh, {type: 'check', claim: 'fewest', picks: certificate}), null, `${label}: no claim before a finished route`);
      const wrong = run(p, ready, [{type: 'check', claim: 'fewest', picks: certificate.slice(1)}]);
      assert.equal(move(p, wrong, {type: 'check', claim: 'fewest', picks: certificate}), null, `${label}: a refusal locks Fewest until another finished route`);
      assert.ok(isSolved(p, run(p, wrong, [{type: 'again'}, ...sol.moves.filter(m => ['island', 'bridge'].includes(m.type)), sol.moves.at(-1)]).board), `${label}: another finished route opens it`);
    }
    if (q.mode === 'fewest') {
      // One bridge too many: a finished walk, but Fewest is refused.
      const extra = [...sol.moves.filter(m => m.type === 'add'), {type: 'add', u: certificate[0], v: certificate[1]}, {type: 'add', u: certificate[0], v: certificate[1]}];
      const more = bridgesOf(q, extra.map(m => [m.u, m.v]));
      const start = ids(q)[0], walk = [];
      // Walk it by brute force.
      const used = more.map(() => false);
      const go = at => { if (used.every(Boolean)) return at === start; for (let i = 0; i < more.length; i++) { if (used[i] || (more[i][0] !== at && more[i][1] !== at)) continue; used[i] = true; walk.push(i); if (go(more[i][0] === at ? more[i][1] : more[i][0])) return true; walk.pop(); used[i] = false; } return false; };
      assert.ok(go(start), `${label}: a walk with two more bridges`);
      const long = run(p, fresh, [...extra, {type: 'island', island: start}, ...walk.map(i => ({type: 'bridge', bridge: i}))]);
      const told = run(p, long, [{type: 'check', claim: 'fewest', picks: certificate}]);
      assert.equal(told.board.told, 'fewer', `${label}: too many new bridges is refused`);
      assert.ok(!isSolved(p, told.board));
    }
    if (q.mode === 'deliver') {
      // A route with an extra repeat is refused.
      const route = sol.moves.filter(m => m.type === 'bridge').map(m => m.bridge), first = route[0];
      const long = run(p, fresh, [sol.moves[0], {type: 'bridge', bridge: first}, {type: 'bridge', bridge: first}, ...route.map(i => ({type: 'bridge', bridge: i}))]);
      assert.equal(run(p, long, [{type: 'check', claim: 'fewest', picks: certificate}]).board.told, 'fewer', `${label}: a route with more repeats is refused`);
    }
    if (q.mode === 'add') {
      // A new bridge that doesn't work leaves no walk; the budget holds.
      const bad = ids(q).flatMap((u, i) => ids(q).slice(i + 1).map(v => [u, v])).find(pair => !sol.working.some(w => w.join() === pair.join()));
      const one = run(p, fresh, [{type: 'add', u: sol.working[0][0], v: sol.working[0][1]}]);
      assert.equal(move(p, one, {type: 'add', u: sol.working[0][0], v: sol.working[0][1]}), null, `${label}: one new bridge only`);
      if (bad) assert.equal(startsBrute(q, pairsOf(q, [bad])).length, 0, `${label}: ${bad.join('–')} doesn't work`);
      assert.equal(move(p, fresh, {type: 'remove', bridge: 0}), null, `${label}: a town bridge stays`);
    }

    // Illegal moves.
    const placed = run(p, fresh, [{type: 'island', island: ids(q)[0]}]);
    const far = bridgesOf(q).findIndex(([u, v]) => u !== ids(q)[0] && v !== ids(q)[0]);
    for (const action of [{type: 'bridge', bridge: far}, {type: 'bridge', bridge: 99}, {type: 'bridge', bridge: -1}, {type: 'island', island: 'Z'}, {type: 'color', island: 'Z'}, {type: 'add', u: 'A', v: 'A'}, {type: 'add', u: 'A', v: 'Z'}, {type: 'check', claim: 'maybe', picks: ['A']}, {type: 'check', claim: 'none', picks: []}, {type: 'check', claim: 'none', picks: ['A', 'A']}, {type: 'fly'}, null]) {
      assert.equal(move(p, placed, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    }
    if (q.mode !== 'starts') assert.equal(move(p, placed, {type: 'color', island: 'A'}), null, `${label}: no coloring`);
    if (!['add', 'fewest'].includes(q.mode)) assert.equal(move(p, placed, {type: 'add', u: 'A', v: 'B'}), null, `${label}: no new bridges`);
    if (q.mode !== 'deliver') {
      const i = bridgesOf(q).findIndex(([u, v]) => u === ids(q)[0] || v === ids(q)[0]), once = run(p, placed, [{type: 'bridge', bridge: i}]);
      assert.equal(move(p, run(p, once, []), {type: 'bridge', bridge: i}), null, `${label}: a bridge without its counter can’t be crossed`);
    }
    assert.equal(move(p, solved, {type: 'again'}), null, `${label}: a solve is final`);

    // Forged saves.
    const b = placed.board, s = solved.board, t = ended.board;
    const forged = [
      {...b, done: {claim: 'starts'}}, {...b, done: {claim: 'none', picks: certificate}}, {...b, done: {claim: 'fewest', picks: certificate}},
      {...t, done: q.mode === 'starts' && sol.starts.length ? {claim: 'starts'} : {claim: q.mode === 'starts' ? 'starts' : 'fewest', picks: q.mode === 'deliver' ? certificate.slice(1) : certificate}},
      {...t, lock: t.tried, told: q.mode === 'starts' ? (sol.starts.length ? 'wrong' : 'walk') : q.mode === 'add' ? 'walk' : 'fewer'}, {...t, lock: t.tried, told: 'notall'}, {...b, told: 'walk'}, {...t, told: 'nonsense'}, {...t, tried: 0},
      {...t, told: q.mode === 'starts' ? 'other' : 'wrong'}, {...s, lock: s.tried}, {...b, extra: true}, {...b, shut: null}, Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'lock')),
      {...b, tried: -1}, {...b, lock: 'x'}, {...b, path: [far]}, {...b, start: 'Z'}, {...b, path: [99], tried: 1},
      {...b, colored: ['Z']}, {...b, colored: ['B', 'A']}, {...b, added: [['A', 'A']]}, {...b, added: Array(9).fill(['A', 'B'])},
      {...s, done: {claim: s.done?.claim || 'starts', picks: ['A']}}, null, [], 'board'
    ];
    if (q.mode !== 'starts') forged.push({...b, colored: ['A']});
    if (q.mode !== 'deliver') forged.push({...b, path: [0, 0]});
    if (q.mode === 'starts') forged.push({...b, added: [['A', 'B']]});
    if (q.mode === 'add') forged.push({...s, done: {claim: 'fewest', picks: certificate}});
    for (const board of forged) assert.equal(validBoard(p, board), false, `${label}: rejects a forged save ${JSON.stringify(board)}`);
    assert.equal(validBoard(p, s), true);
  }
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const report = await validateIslands();
  console.log(`Islands: ${report.hintMoves} hinted moves over ${report.wanderings} wanderings and fresh starts; certificates ${JSON.stringify(report.certificates)}; single-island probing of Done, moves before and after the walk lock ${JSON.stringify(report.probes)}`);
}
