// Checks the Neighbor Lanterns first-fit pack (dist/families/firstfit/firstfit.json):
// content fields and sources; for First fit, the most colours any order uses
// by trying every order (the module searches with memory instead), each stored
// order, and claims; for Why not fewer, the fewest colours by trying every
// colouring and each stored proof; that hints alone finish every target puzzle
// and every Why not fewer puzzle, from a fresh board and from a bad start;
// illegal moves and forged saves.
// Run: node scripts/validate-firstfit.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const adjacency = q => {
  const near = q.vertices.map(() => new Set());
  for (const [u, v] of q.edges) { const a = q.vertices.indexOf(u), b = q.vertices.indexOf(v); assert.ok(a >= 0 && b >= 0 && a !== b); near[a].add(b); near[b].add(a); }
  return near;
};
// Every order, colouring incrementally: how many orders end with each count.
function everyOrder(q) {
  const near = adjacency(q), n = q.vertices.length, colors = Array(n).fill(0), counts = {};
  const go = (placed, top) => {
    if (placed === n) { counts[top] = (counts[top] || 0) + 1; return; }
    for (let v = 0; v < n; v++) {
      if (colors[v]) continue;
      let c = 1;
      while ([...near[v]].some(w => colors[w] === c)) c++;
      colors[v] = c; go(placed + 1, Math.max(top, c)); colors[v] = 0;
    }
  };
  go(0, 0);
  return counts;
}
const fitColors = (q, names) => { const near = adjacency(q), colors = q.vertices.map(() => 0); for (const name of names) { const v = q.vertices.indexOf(name); let c = 1; while ([...near[v]].some(w => colors[w] === c)) c++; colors[v] = c; } return colors; };
// The fewest colours, by trying every colouring with k colours.
function chromatic(q) {
  const near = adjacency(q), n = q.vertices.length;
  for (let k = 1; k <= n; k++) {
    for (let code = 0; code < k ** n; code++) {
      const colors = Array.from({length: n}, (_, i) => Math.floor(code / k ** i) % k);
      if (colors.every((c, v) => [...near[v]].every(w => colors[w] !== c))) return k;
    }
  }
  return n;
}
function proofShows(q, names) {
  const near = adjacency(q), proof = names.map(v => q.vertices.indexOf(v));
  if (proof.every((a, i) => proof.every((b, j) => i === j || near[a].has(b)))) return proof.length;
  if (proof.length % 2 && proof.length >= 3 && proof.every((a, i) => near[a].has(proof[(i + 1) % proof.length]))) return 3;
  return 0;
}
const run = (p, a, actions) => actions.reduce((x, action) => { const y = move(p, x, action); assert.ok(y, `${p.id}: ${JSON.stringify(action)} is legal`); return y; }, a);
// Colour lantern v with colors[v], choosing palette colours as needed.
const paint = (p, a, colors) => colors.reduce((x, c, vertex) => {
  if (x.board.selected !== c) x = run(p, x, [{type: 'palette', color: c}]);
  return x.board.colors[vertex] === c ? x : run(p, x, [{type: 'tap', vertex}]);
}, a);
function finish(p, a, limit = 200) {
  for (let i = 0; i < limit && !isSolved(p, a.board); i++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: hints keep naming a move`);
    assert.ok(h.text, `${p.id}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${p.id}: the hinted move is legal`);
  }
  return a;
}

export default async function validateFirstfit() {
  const book = JSON.parse(await readFile(new URL('../dist/families/firstfit/firstfit.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  for (const s of book.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const groups = {firstfit: book.puzzles.filter(p => p.mechanic === 'firstfit'), fewest: book.puzzles.filter(p => p.mechanic === 'fewest')};
  assert.equal(groups.firstfit.length + groups.fewest.length, book.puzzles.length);
  const orderCounts = {};
  let hintMoves = 0;
  for (const [mechanic, list] of Object.entries(groups)) {
    assert.deepEqual(list.map(p => p.number), list.map((_, i) => i + 1), `${mechanic}: numbered from 1`);
    for (const level of ['easy', 'medium', 'hard']) assert.ok(list.some(p => p.difficulty_level === level), `${mechanic}: a ${level} puzzle`);
  }
  for (const p of book.puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `${p.mechanic}-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.libraryFamily, 'color'); assert.equal(p.familyTitle, 'Neighbor Lanterns'); assert.equal(p.band, 'all');
    assert.equal(p.group, p.mechanic === 'firstfit' ? 'First fit' : 'Why not fewer');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    // The Neighbor Lanterns graph format, with every lantern placed apart.
    assert.ok(q.edges.every(e => e.length === 3 && e[2] === 1), `${label}: edges as [u, v, 1]`);
    const xy = q.vertices.map(v => q.positions[v]);
    assert.ok(xy.every(pt => Array.isArray(pt) && pt.every(c => c >= 0 && c <= 100)), `${label}: positions in percent`);
    for (let i = 0; i < xy.length; i++) for (let j = i + 1; j < xy.length; j++) assert.ok(Math.hypot(xy[i][0] - xy[j][0], (xy[i][1] - xy[j][1]) / 1.25) >= 14, `${label}: ${q.vertices[i]} and ${q.vertices[j]} are apart`);
    const fewest = chromatic(q);
    assert.equal(p.solution.fewest, fewest, `${label}: the fewest colours`);
    const fresh = freshAttempt(p);

    if (p.mechanic === 'firstfit') {
      const counts = everyOrder(q), most = Math.max(...Object.keys(counts).map(Number));
      orderCounts[label] = counts;
      assert.equal(p.solution.most, most, `${label}: the most colours any order uses`);
      assert.equal(p.solution.reachable, Boolean(counts[q.target]), `${label}: whether the target is reachable`);
      assert.ok(q.target > fewest, `${label}: the target wastes colours (a fewest target would repeat plain colouring)`);
      const maxLinks = Math.max(...adjacency(q).map(s => s.size));
      assert.ok(most <= maxLinks + 1, `${label}: at most one more than the most links`);
      if (p.solution.reachable) {
        assert.equal(Math.max(...fitColors(q, p.solution.order)), q.target, `${label}: the stored order`);
        const a = run(p, fresh, p.solution.order.map(v => ({type: 'tap', vertex: q.vertices.indexOf(v)})));
        assert.ok(isSolved(p, a.board), `${label}: the stored order solves`);
      }
      // A finished order that misses the target does not solve; Again clears it.
      const missName = Object.keys(counts).map(Number).find(k => k !== q.target);
      const plain = run(p, fresh, q.vertices.map((_, v) => ({type: 'tap', vertex: v})));
      if (Math.max(...fitColors(q, q.vertices)) !== q.target) {
        assert.ok(!isSolved(p, plain.board), `${label}: a missed target does not solve`);
        assert.deepEqual(run(p, plain, [{type: 'again'}]).board.order, []);
      }
      assert.ok(missName !== undefined || q.goal === 'decide');
      if (q.goal === 'target') {
        for (const start of [fresh, plain]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish`); }
        assert.equal(move(p, plain, {type: 'claim'}), null, `${label}: target puzzles take no claim`);
      } else {
        assert.equal(nextHint(p, fresh).type, 'note', `${label}: hints never say whether an order exists`);
        assert.equal(move(p, fresh, {type: 'claim'}), null, `${label}: no claim before a finished order`);
        const claim = move(p, plain, {type: 'claim'});
        if (p.solution.reachable) { assert.equal(claim.board.wrong, true, `${label}: a false claim is refused`); assert.ok(!isSolved(p, claim.board)); }
        else assert.ok(isSolved(p, claim.board), `${label}: a true claim solves`);
      }
      const one = run(p, fresh, [{type: 'tap', vertex: 0}]);
      for (const action of [{type: 'tap', vertex: 0}, {type: 'tap', vertex: q.vertices.length}, {type: 'tap', vertex: -1}, {type: 'palette', color: 1}, {type: 'prove'}, null]) assert.equal(move(p, one, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      for (const forged of [{...one.board, order: [0, 0]}, {...one.board, order: [99]}, {...one.board, claimed: true}, {...one.board, tried: -1}, {...one.board, wrong: 'no'}, {...plain.board, tried: 0}]) {
        assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
      }
      continue;
    }

    assert.equal(proofShows(q, p.solution.proof), fewest, `${label}: the stored proof shows the fewest`);
    assert.ok(q.palette > fewest, `${label}: the palette offers more colours than needed`);
    // Hints alone finish from a fresh board and from a wasteful colouring.
    const wasteful = paint(p, fresh, q.vertices.map((_, v) => (v % q.palette) + 1));
    for (const start of [fresh, wasteful]) { const done = finish(p, start); hintMoves += done.moves - start.moves; assert.ok(isSolved(p, done.board), `${label}: hints finish`); }
    // A proof that shows less than the colours used does not solve.
    const solvedBoard = finish(p, fresh);
    const colors = solvedBoard.board.colors;
    const linkedPair = q.edges[0].slice(0, 2).map(v => q.vertices.indexOf(v));
    let a = {...fresh, board: {colors, selected: 1, proving: false, proof: [], checked: false}};
    assert.ok(validBoard(p, a.board));
    a = run(p, a, [{type: 'prove'}, ...linkedPair.map(vertex => ({type: 'tap', vertex})), {type: 'check'}]);
    assert.equal(isSolved(p, a.board), fewest === 2, `${label}: a single link proves only 2`);
    const unlinked = (() => { const near = adjacency(q); for (let i = 0; i < q.vertices.length; i++) for (let j = i + 1; j < q.vertices.length; j++) if (!near[i].has(j)) return [i, j]; return null; })();
    if (unlinked) {
      const bad = run(p, {...fresh, board: {colors, selected: 1, proving: false, proof: [], checked: false}}, [{type: 'prove'}, ...unlinked.map(vertex => ({type: 'tap', vertex})), {type: 'check'}]);
      assert.ok(!isSolved(p, bad.board), `${label}: two unlinked lanterns prove nothing`);
    }
    assert.equal(move(p, fresh, {type: 'prove'}), null, `${label}: no proof before a full colouring`);
    for (const action of [{type: 'palette', color: q.palette + 1}, {type: 'tap', vertex: 99}, {type: 'check'}, {type: 'recolour'}, {type: 'again'}, null]) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    for (const forged of [{...fresh.board, colors: [1]}, {...fresh.board, colors: fresh.board.colors.map(() => 9)}, {...fresh.board, proving: true}, {...fresh.board, checked: true}, {...fresh.board, proof: [0, 0]}, {...fresh.board, selected: 7}]) {
      assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
    }
  }
  const share = id => `${orderCounts[id][book.puzzles.find(p => p.id === id).parameters.target] || 0} of ${Object.values(orderCounts[id]).reduce((x, y) => x + y, 0)}`;
  return {puzzles: book.puzzles.length, firstfit: groups.firstfit.length, fewest: groups.fewest.length, hintMoves, ordersReachingTarget: Object.fromEntries(groups.firstfit.map(p => [p.id, share(p.id)]))};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateFirstfit(), null, 2));
