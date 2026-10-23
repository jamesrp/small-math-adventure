// Checks the Seed plots pack (dist/families/seeds/seeds.json) with a growth
// simulator written separately from the mechanic: plots as bit masks with
// their own neighbour lists, the finish of every subset of each plot's
// squares, and the fence as 4 × (squares) − 2 × (shared sides) rather than by
// boundary edges. On every puzzle plot and on 4 by 4 it proves the two
// theorems the family rests on, for every set of squares and every legal
// growth: the finish never changes (so every complete run from the same seeds
// stops at the same place) and the fence changes by 4 − 2k ≤ 0. Then, by
// listing every subset: the fewest seeds, every Can't with its fence
// certificate, the starts that need every seed and that none larger exists,
// the numbers of squares a few seeds can finish with, and every fact quoted in
// the notes. Every filling start is played and accepted, wrong claims are
// answered and stay answered through Undo, hint chains solve every puzzle
// from fresh, messy and wrongly claimed boards, and illegal moves and forged
// saves are rejected. Run: node scripts/validate-seeds.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {gridOf} from '../dist/sq-grid.js';
import {loadPack} from './packs.mjs';

/* ---------------- Plots as bit masks, separate from the mechanic ---------------- */
// Squares in reading order (top row first, then left to right).
function plotOf(spec) {
  const list = spec.cells ? spec.cells.map(c => [...c]) : Array.from({length: spec.cols * spec.rows}, (_, i) => [i % spec.cols, Math.floor(i / spec.cols)]);
  list.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const at = new Map(list.map(([x, y], i) => [`${x},${y}`, i]));
  const nbr = list.map(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => at.get(`${x + dx},${y + dy}`)).filter(j => j !== undefined));
  const nmask = nbr.map(js => js.reduce((m, j) => m | (1 << j), 0));
  const n = list.length, all = n === 32 ? -1 : (1 << n) - 1;
  return {list, at, nbr, nmask, n, all, cols: spec.cols, rows: spec.rows};
}
const bits = m => { let c = 0; for (; m; m &= m - 1) c++; return c; };
const two = m => (m & (m - 1)) !== 0;
const growable = (P, m, i) => !(m >> i & 1) && two(m & P.nmask[i]);
function finish(P, m) {
  for (let grew = true; grew;) {
    grew = false;
    for (let i = 0; i < P.n; i++) if (growable(P, m, i)) { m |= 1 << i; grew = true; }
  }
  return m;
}
function fence(P, m) {
  let shared = 0;
  for (let i = 0; i < P.n; i++) if (m >> i & 1) shared += bits(m & P.nmask[i]);
  return 4 * bits(m) - shared; // each shared side counted from both squares
}
const maskOf = (P, coords) => coords.reduce((m, [x, y]) => m | (1 << P.at.get(`${x},${y}`)), 0);
const listOf = m => { const out = []; for (let i = 0; m; i++, m >>>= 1) if (m & 1) out.push(i); return out; };
const fromRows = (P, rows) => rows.split('/').flatMap((r, y) => [...r].flatMap((ch, x) => ch === '#' ? [[x, y]] : []));
function shape(rows) {
  const cells = [];
  rows.split('/').forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); }));
  return plotOf({cols: Math.max(...rows.split('/').map(r => r.length)), rows: rows.split('/').length, cells});
}
// Every subset of a plot (up to 16 squares): its finish, whether it fills,
// and whether every seed is needed.
function census(P) {
  assert.ok(P.n <= 16);
  const fin = new Int32Array(1 << P.n);
  for (let m = 0; m <= P.all; m++) fin[m] = finish(P, m);
  const fills = m => fin[m] === P.all;
  const needed = m => fills(m) && listOf(m).every(i => !fills(m & ~(1 << i)));
  return {fin, fills, needed};
}
function* subsetsOf(n, k, from = 0, m = 0) {
  if (k === 0) { yield m; return; }
  for (let i = from; i <= n - k; i++) yield* subsetsOf(n, k - 1, i + 1, m | (1 << i));
}
const leastOf = P => { for (let k = 1; k <= P.n; k++) for (const m of subsetsOf(P.n, k)) if (finish(P, m) === P.all) return k; return null; };
const countFilling = (P, k) => { let c = 0; for (const m of subsetsOf(P.n, k)) if (finish(P, m) === P.all) c++; return c; };

// The two theorems, for every set of squares of a plot and every legal growth.
function theorems(P, fin) {
  let checked = 0;
  for (let m = 0; m <= P.all; m++) {
    const f = fence(P, m);
    for (let i = 0; i < P.n; i++) {
      if (!growable(P, m, i)) continue;
      const k = bits(m & P.nmask[i]), next = m | (1 << i);
      assert.equal(fin[next], fin[m], 'growing never changes the finish');
      assert.equal(fence(P, next) - f, 4 - 2 * k, 'a growth beside k squares changes the fence by 4 − 2k');
      checked++;
    }
    // A stuck set is its own finish.
    if (fin[m] === m) for (let i = 0; i < P.n; i++) assert.ok(!growable(P, m, i));
  }
  return checked;
}

// No loop of side neighbours among the squares of m: edges = squares − pieces.
function loopless(P, m) {
  const ids = listOf(m), seen = new Set();
  let edges = 0, pieces = 0;
  for (const i of ids) edges += bits(m & P.nmask[i]);
  for (const i of ids) {
    if (seen.has(i)) continue;
    pieces++;
    const stack = [i]; seen.add(i);
    while (stack.length) for (const j of P.nbr[stack.pop()]) if ((m >> j & 1) && !seen.has(j)) { seen.add(j); stack.push(j); }
  }
  return edges / 2 === ids.length - pieces;
}
// A small repeatable random source for the random walks.
const random = seed => () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

/* ---------------- Playing ---------------- */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const plantAll = (p, a, cells) => cells.reduce((b, cell) => play(p, b, {type: 'plant', cell}), a);
function growAll(p, a, P) {
  for (;;) {
    const m = a.board.seeds.concat(a.board.grown).reduce((s, i) => s | (1 << i), 0);
    const i = [...Array(P.n).keys()].find(j => growable(P, m, j));
    if (i === undefined) return a;
    a = play(p, a, {type: 'grow', cells: [i]});
  }
}
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 300; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hint ${h.type} on ${JSON.stringify(a.board)}`);
    assert.ok(h.text, `${p.id}: hint text`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Seeds scattered from the far end, as many as the tray takes, skipping squares that would grow.
function messy(p, a, P, count) {
  const order = [...Array(P.n).keys()].reverse(), tries = [...order.filter((_, j) => j % 2 === 0), ...order.filter((_, j) => j % 2)];
  for (const i of tries) {
    if (a.board.seeds.length >= count) break;
    const next = move(p, a, {type: 'plant', cell: i});
    if (next) a = next;
  }
  return a;
}

// Facts the pack states, each listed independently.
const EXPECT = {
  'seeds-01': {least: 3, starts: 14},
  'seeds-02': {least: 4, starts: 1},
  'seeds-03': {answers: [3, 4, 6, 9]},
  'seeds-04': {least: 4, starts: 130},
  'seeds-05': {least: 4},
  'seeds-06': {needed: 9},
  'seeds-07': {least: 5, starts: 176},
  'seeds-08': {least: 5},
  'seeds-09': {least: 5, starts: 64},
  'seeds-10': {least: 6, starts: 2},
  'seeds-11': {answers: [3, 4, 5, 6, 8, 9]},
  'seeds-12': {needed: 360}
};

export async function validateSeeds() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/seeds/seeds.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'seeds');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 15, '8 to 15 puzzles');
  assert.deepEqual(puzzles.map(p => p.id).sort(), Object.keys(EXPECT).sort());
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);

  const stats = {seedsPuzzles: puzzles.length, growthsChecked: 0, subsetsListed: 0, startsPlayed: 0, wrongClaims: 0, hintSteps: 0};
  // The theorems on 4 by 4 (and below, on every puzzle plot).
  const sq4 = plotOf({cols: 4, rows: 4}), c4 = census(sq4), sq3 = plotOf({cols: 3, rows: 3});
  stats.growthsChecked += theorems(sq4, c4.fin);
  // An n-by-n plot: the diagonal fills, and the fence (4n) needs n seeds.
  for (let n = 2; n <= 8; n++) {
    const P = plotOf({cols: n, rows: n}), diag = Array.from({length: n}, (_, i) => i * n + i).reduce((m, i) => m | (1 << i), 0);
    if (n <= 5) assert.equal(finish(P, diag), P.all, `the diagonal fills ${n} by ${n}`);
    else { const filled = new Set(); for (let i = 0; i < n; i++) filled.add(i * n + i); let grew = true; while (grew) { grew = false; for (let i = 0; i < n * n; i++) if (!filled.has(i) && P.nbr[i].filter(j => filled.has(j)).length >= 2) { filled.add(i); grew = true; } } assert.equal(filled.size, n * n, `the diagonal fills ${n} by ${n}`); }
    // The full plot's fence: 4 sides per square, less 2 per shared side.
    assert.equal(4 * n * n - 2 * P.nbr.flat().length / 2, 4 * n);
    if (n <= 5) assert.equal(fence(P, P.all), 4 * n);
    if (n <= 4) assert.equal(leastOf(P), n, `${n} by ${n} needs ${n}`);
  }

  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'seeds');
    assert.ok(p.id.startsWith('seeds-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 10, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p), mech = mechanicFor(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);

    if (q.mode === 'playground') {
      assert.ok(mech.noHint(p), 'the playground has no hints');
      assert.equal(fresh.board.size, 6);
      let a = plantAll(p, fresh, [0, 7]);
      assert.deepEqual(a.board.seeds, [0, 7]);
      a = play(p, a, {type: 'grow', cells: [1]});
      a = play(p, a, {type: 'grow', cells: [6]});
      a = play(p, a, {type: 'regrow'});
      assert.deepEqual(a.board.grown, [], 'Regrow keeps the seeds and takes back the growth');
      assert.deepEqual(a.board.seeds, [0, 7]);
      a = play(p, a, {type: 'grow', cells: [6, 1]});
      assert.deepEqual(a.board.grown, [1, 6], 'the other order ends the same');
      a = play(p, a, {type: 'lift', cell: 7});
      assert.deepEqual(a.board.grown, [], 'growth that needed a lifted seed goes');
      a = play(p, a, {type: 'clear'});
      for (const size of [4, 8]) { a = play(p, a, {type: 'size', size}); assert.equal(a.board.size, size); }
      assert.equal(move(p, a, {type: 'size', size: 5}), null);
      assert.equal(move(p, a, {type: 'claim'}), null);
      assert.equal(isSolved(p, plantAll(p, a, Array.from({length: 8}, (_, i) => i * 9)).board), false, 'the playground is never solved');
      assert.equal(validBoard(p, {...fresh.board, size: 5}), false);
      // Fourteen starts of four fill 4 by 4 with no seed on either diagonal.
      const onDiag = i => i % 4 === Math.floor(i / 4) || i % 4 + Math.floor(i / 4) === 3;
      let off = 0;
      for (const m of subsetsOf(16, 4)) if (c4.fills(m) && listOf(m).every(i => !onDiag(i))) off++;
      assert.equal(off, 14, 'off-diagonal starts');
      continue;
    }

    const P = plotOf(q), e = EXPECT[p.id];
    assert.deepEqual(gridOf(q.cells ? {cols: q.cols, rows: q.rows, cells: q.cells} : {cols: q.cols, rows: q.rows}).cells, P.list, `${p.id}: the same numbering as the shared grid`);
    for (const [x, y] of q.rocks || []) assert.equal(P.at.get(`${x},${y}`), undefined, `${p.id}: a rock is not a square`);
    const C = census(P);
    stats.subsetsListed += P.all + 1;
    stats.growthsChecked += theorems(P, C.fin);
    const Pf = fence(P, P.all);
    assert.equal(q.fence, Pf, `${p.id}: the plot's fence`);
    // A square with one neighbour on the plot is a seed of every filling start.
    const ends = P.nbr.map((js, i) => js.length < 2 ? i : -1).filter(i => i >= 0);
    for (let m = 0; m <= P.all; m++) if (C.fills(m)) assert.ok(ends.every(i => m >> i & 1), `${p.id}: ends are seeds`);
    const byCount = Array.from({length: P.n + 1}, () => ({fill: [], needed: []}));
    for (let m = 0; m <= P.all; m++) { if (C.fills(m)) byCount[bits(m)].fill.push(m); if (C.needed(m)) byCount[bits(m)].needed.push(m); }
    const least = byCount.findIndex(c => c.fill.length);

    if (q.mode === 'fill' || q.mode === 'fewest') {
      assert.equal(least, e.least, `${p.id}: the fewest seeds`);
      assert.ok(4 * least >= Pf, `${p.id}: the fence bound`);
      if (q.mode === 'fewest') assert.equal(q.best, least);
      else { assert.equal(q.least, least); assert.equal(q.possible, least <= q.seeds); }
    }
    if (q.mode === 'fill' && q.possible) {
      if (e.starts !== undefined) assert.equal(byCount[q.seeds].fill.length, e.starts, `${p.id}: starts of ${q.seeds}`);
      // Every filling start with no more seeds than the tray is accepted.
      const plantable = m => listOf(m).every(i => !growable(P, m & ~(1 << i), i));
      assert.ok(byCount[least].fill.every(plantable));
      for (let k = 1; k <= q.seeds; k++) for (const m of byCount[k].fill.filter(plantable)) {
        const a = growAll(p, plantAll(p, fresh, listOf(m)), P);
        assert.ok(isSolved(p, a.board), `${p.id}: ${listOf(m)} fills`);
        stats.startsPlayed++;
      }
      assert.ok(isSolved(p, growAll(p, plantAll(p, fresh, listOf(maskOf(P, q.witness))), P).board), `${p.id}: the witness`);
      // A start that gets stuck: Can't is refused, the refusal survives Undo
      // while the seeds stay, and the hints still solve.
      const stuckApart = [...subsetsOf(P.n, q.seeds)].find(m => !C.fills(m) && listOf(m).every(i => !(m & P.nmask[i])));
      if (stuckApart !== undefined) {
        let a = growAll(p, plantAll(p, fresh, listOf(stuckApart)), P);
        const before = a;
        a = play(p, a, {type: 'claim'});
        assert.equal(a.board.told, 'possible', `${p.id}: Can't on a possible plot is answered`);
        assert.equal(move(p, a, {type: 'claim'}), null, `${p.id}: change something before claiming again`);
        const back = undoPress(p, a);
        assert.equal(back.board.told, 'possible', `${p.id}: Undo keeps the answer while the seeds stay`);
        assert.deepEqual(back.board.grown, before.board.grown);
        stats.wrongClaims++;
        stats.hintSteps += hintsSolve(p, a, 'after Can’t');
      }
      const touching = [...subsetsOf(P.n, q.seeds)].find(m => !C.fills(m) && listOf(m).some(i => m & P.nmask[i]) && listOf(m).every(i => !growable(P, m & ~(1 << i), i)));
      if (touching !== undefined) {
        const a = play(p, plantAll(p, fresh, listOf(touching)), {type: 'claim'});
        assert.equal(a.board.told, 'spread', `${p.id}: Can't with seeds touching asks for them spread`);
        stats.wrongClaims++;
      }
    }
    if (q.mode === 'fill' && !q.possible) {
      // Can't, with its certificate: every start of this many seeds has a
      // fence of at most 4 per seed, below the plot's, and growth never raises it.
      assert.ok(4 * q.seeds < Pf, `${p.id}: the certificate`);
      for (const m of subsetsOf(P.n, q.seeds)) assert.ok(fence(P, m) <= 4 * q.seeds && fence(P, C.fin[m]) <= fence(P, m) && !C.fills(m));
      const touching = [...subsetsOf(P.n, q.seeds)].find(m => listOf(m).some(i => m & P.nmask[i]) && listOf(m).every(i => !growable(P, m & ~(1 << i), i)));
      let a = play(p, plantAll(p, fresh, listOf(touching)), {type: 'claim'});
      assert.equal(a.board.told, 'spread', `${p.id}: seeds touching are asked to spread`);
      assert.equal(isSolved(p, a.board), false);
      stats.wrongClaims++;
      stats.hintSteps += hintsSolve(p, a, 'after a refused Can’t');
      // Every start of seeds apart is accepted.
      for (const m of subsetsOf(P.n, q.seeds)) {
        if (listOf(m).some(i => m & P.nmask[i])) continue;
        const b = play(p, growAll(p, plantAll(p, fresh, listOf(m)), P), {type: 'claim'});
        assert.ok(isSolved(p, b.board) && b.board.claimed, `${p.id}: Can't on ${listOf(m)}`);
        stats.startsPlayed++;
      }
      assert.equal(move(p, plantAll(p, fresh, listOf(maskOf(P, q.witness)).slice(1)), {type: 'claim'}), null, `${p.id}: Can't waits for every seed`);
    }
    if (q.mode === 'fewest') {
      assert.equal(byCount[least].fill.length, e.starts, `${p.id}: fewest starts`);
      for (const m of byCount[least].fill) {
        const a = play(p, growAll(p, plantAll(p, fresh, listOf(m)), P), {type: 'claim'});
        assert.ok(isSolved(p, a.board), `${p.id}: Fewest on ${listOf(m)}`);
        stats.startsPlayed++;
      }
      assert.equal(move(p, plantAll(p, fresh, listOf(byCount[least].fill[0])), {type: 'claim'}), null, `${p.id}: Fewest waits for a full plot`);
      // A start of one more seed is told fewer can.
      const more = byCount[least + 1].fill.find(m => listOf(m).every(i => !growable(P, m & ~(1 << i), i)));
      let a = play(p, growAll(p, plantAll(p, fresh, listOf(more)), P), {type: 'claim'});
      assert.equal(a.board.told, 'fewer', `${p.id}: one seed too many is told`);
      const back = undoPress(p, a);
      assert.equal(back.board.told, 'fewer', `${p.id}: Undo keeps the answer while the seeds stay`);
      stats.wrongClaims++;
      stats.hintSteps += hintsSolve(p, a, 'after a wrong Fewest');
    }
    if (q.mode === 'needed') {
      assert.equal(byCount[q.seeds].needed.length, e.needed, `${p.id}: starts needing every seed`);
      for (let k = q.seeds + 1; k <= P.n; k++) assert.equal(byCount[k].needed.length, 0, `${p.id}: no start of ${k} needs every seed`);
      assert.ok(C.needed(maskOf(P, q.witness)), `${p.id}: the witness`);
      for (const m of byCount[q.seeds].needed) {
        assert.ok(isSolved(p, growAll(p, plantAll(p, fresh, listOf(m)), P).board), `${p.id}: ${listOf(m)} needs every seed`);
        stats.startsPlayed++;
      }
      // A filling start with a spare seed is not solved.
      const spare = byCount[q.seeds].fill.find(m => !C.needed(m) && listOf(m).every(i => !growable(P, m & ~(1 << i), i)));
      const a = growAll(p, plantAll(p, fresh, listOf(spare)), P);
      assert.equal(isSolved(p, a.board), false, `${p.id}: a spare seed`);
      stats.hintSteps += hintsSolve(p, a, 'from a start with a spare seed');
    }
    if (q.mode === 'finishes') {
      const made = new Set();
      for (const m of subsetsOf(P.n, q.seeds)) made.add(bits(C.fin[m]));
      assert.deepEqual([...made].sort((x, y) => x - y), e.answers, `${p.id}: the finishes`);
      // Seeds closing a loop can't all be planted, so check the starts that can.
      const plantableMade = new Set();
      for (const m of subsetsOf(P.n, q.seeds)) if (loopless(P, m)) plantableMade.add(bits(C.fin[m]));
      assert.deepEqual([...plantableMade].sort((x, y) => x - y), e.answers, `${p.id}: the finishes of starts that can be planted`);
      assert.deepEqual(q.answers, e.answers);
      let a = fresh;
      q.witnesses.forEach((w, j) => {
        if (a.board.seeds.length) a = play(p, a, {type: 'clear'});
        a = growAll(p, plantAll(p, a, listOf(maskOf(P, w))), P);
        assert.ok(a.board.found.includes(q.answers[j]), `${p.id}: witness ${j}`);
      });
      assert.equal(a.board.found.length, q.answers.length, `${p.id}: each finish joins the list`);
      const back = undo(a), kept = mech.carry(p, a.board, back.board);
      assert.equal(kept.found.length, q.answers.length, `${p.id}: Undo keeps the list`);
      assert.ok(validBoard(p, kept), `${p.id}: a board after Undo is valid`);
      assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board), `${p.id}: the full list solves`);
      let short = growAll(p, plantAll(p, fresh, listOf(maskOf(P, q.witnesses[0]))), P);
      short = play(p, short, {type: 'claim'});
      assert.equal(short.board.told, 'another', `${p.id}: a short list is told`);
      assert.equal(move(p, short, {type: 'claim'}), null, `${p.id}: change something before claiming again`);
      assert.equal(undoPress(p, short).board.told, 'another', `${p.id}: Undo keeps the answer`);
      stats.wrongClaims++;
      stats.hintSteps += hintsSolve(p, short, 'after a short list');
      assert.equal(validBoard(p, {...fresh.board, found: [7]}), false, `${p.id}: a forged finish`);
      assert.equal(validBoard(p, {...fresh.board, found: [...q.answers], claimed: true}), true, `${p.id}: a full claimed list is a valid save`);
      assert.equal(validBoard(p, {...fresh.board, found: q.answers.slice(1), claimed: true}), false, `${p.id}: a forged claim`);
      const w0 = listOf(maskOf(P, q.witnesses[0]));
      assert.equal(validBoard(p, {...fresh.board, seeds: w0, found: []}), false, `${p.id}: a finish on the board is always found`);
    }

    // Hints from fresh and from a messy board.
    stats.hintSteps += hintsSolve(p, fresh, 'from fresh');
    const k = q.seeds ?? 6;
    stats.hintSteps += hintsSolve(p, growAll(p, messy(p, fresh, P, k), P), 'from a messy board');
    stats.hintSteps += hintsSolve(p, messy(p, fresh, P, k), 'from scattered seeds');

    // Hints from the ends of random walks of legal taps and drags.
    const rnd = random(p.number * 7919 + 1);
    for (let walk = 0; walk < 40; walk++) {
      let a = fresh;
      for (let step = 0; step < 12 && !isSolved(p, a.board); step++) {
        const i = Math.floor(rnd() * P.n), j = Math.floor(rnd() * P.n), r = rnd();
        const action = r < .6 ? (a.board.seeds.includes(i) ? {type: 'lift', cell: i} : growable(P, a.board.seeds.concat(a.board.grown).reduce((m, x) => m | (1 << x), 0), i) ? {type: 'grow', cells: [i]} : {type: 'plant', cell: i})
          : r < .8 && a.board.seeds.length ? {type: 'carry', from: a.board.seeds[i % a.board.seeds.length], to: j} : r < .95 ? {type: 'claim'} : {type: 'clear'};
        a = move(p, a, action) || a;
        // Undo now and then: whatever it lands on is a valid board.
        if (rnd() < .2) { a = undoPress(p, a); assert.ok(validBoard(p, a.board), `${p.id}: a board after Undo is valid: ${JSON.stringify(a.board)}`); }
      }
      if (!isSolved(p, a.board)) stats.hintSteps += hintsSolve(p, a, `after random walk ${walk}`);
      stats.walks = (stats.walks || 0) + 1;
    }

    // Illegal moves.
    const one = plantAll(p, fresh, [0]);
    const g2 = [...Array(P.n).keys()].find(i => P.nbr[0].includes(i));
    const bad = [null, 'grow', {type: 'plant'}, {type: 'plant', cell: -1}, {type: 'plant', cell: P.n}, {type: 'plant', cell: 1.5}, {type: 'plant', cell: 0, extra: 1},
      {type: 'lift', cell: 0}, {type: 'carry', from: 0, to: 1}, {type: 'grow', cells: []}, {type: 'grow', cells: [0]}, {type: 'regrow'}, {type: 'size', size: 4}, {type: 'claim'}, {type: 'fly'}];
    if (q.mode !== 'finishes') bad.push({type: 'clear'});
    for (const action of bad) assert.equal(move(p, fresh, action), null, `${p.id}: rejects ${JSON.stringify(action)}`);
    assert.equal(move(p, one, {type: 'plant', cell: 0}), null, `${p.id}: no seed on a seed`);
    assert.equal(move(p, one, {type: 'grow', cells: [g2]}), null, `${p.id}: one neighbour can't grow a square`);
    assert.equal(move(p, one, {type: 'carry', from: 0, to: 0}), null, `${p.id}: no carry onto itself`);
    // Two seeds beside one empty square (never beside each other on squares): it grows, and can't be planted.
    const corner = [...Array(P.n).keys()].find(i => P.nbr[i].length >= 2);
    if (corner !== undefined && (q.seeds ?? Infinity) >= 2) {
      const [a1, a2] = P.nbr[corner];
      assert.ok(!P.nbr[a1].includes(a2));
      const two = plantAll(p, fresh, [a1, a2]);
      assert.equal(move(p, two, {type: 'plant', cell: corner}), null, `${p.id}: a square that can grow is not planted`);
      const grown = play(p, two, {type: 'grow', cells: [corner]});
      assert.equal(move(p, grown, {type: 'carry', from: a1, to: a2}), null, `${p.id}: no carry onto a seed`);
      // Carrying a seed onto the square it helped grow: that growth goes first, so the seed lands there.
      assert.deepEqual(play(p, grown, {type: 'carry', from: a1, to: corner}).board, {...grown.board, seeds: [a2, corner].sort((x, y) => x - y), grown: [], last: null});
      const lifted = play(p, grown, {type: 'lift', cell: a1});
      assert.deepEqual(lifted.board.grown, [], `${p.id}: lifting a seed takes back what it grew`);
    }
    if (q.seeds !== undefined) {
      const fullTray = messy(p, fresh, P, q.seeds);
      assert.equal(fullTray.board.seeds.length, q.seeds);
      const free = [...Array(P.n).keys()].find(i => !fullTray.board.seeds.includes(i) && !fullTray.board.grown.includes(i) && !growable(P, fullTray.board.seeds.reduce((m, j) => m | (1 << j), 0), i));
      if (free !== undefined) assert.equal(move(p, fullTray, {type: 'plant', cell: free}), null, `${p.id}: no seed past the tray`);
    }
    // Forged saves.
    const forged = [
      {...fresh.board, seeds: [1, 0]},
      {...fresh.board, seeds: [0, 0]},
      {...fresh.board, grown: [0]},
      {...fresh.board, seeds: [0], grown: [0]},
      {...fresh.board, last: 0},
      {...fresh.board, extra: true},
      {...fresh.board, seeds: Array.from({length: P.n}, (_, i) => i)}
    ];
    // Four seeds round a 2-by-2 block can't all be planted.
    const block = P.list.findIndex(([x, y]) => [[1, 0], [0, 1], [1, 1]].every(([dx, dy]) => P.at.has(`${x + dx},${y + dy}`)));
    if (block >= 0 && (q.seeds ?? 4) >= 4) {
      const [x, y] = P.list[block];
      forged.push({...fresh.board, seeds: [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([u, v]) => P.at.get(`${u},${v}`)).sort((m, n) => m - n)});
    }
    if (Object.hasOwn(fresh.board, 'told')) forged.push({...fresh.board, told: 'fewer-ish'}, {...fresh.board, claimed: true}, {...fresh.board, told: q.mode === 'fill' ? 'possible' : q.mode === 'fewest' ? 'fewer' : 'another'});
    for (const b of forged) assert.equal(validBoard(p, b), false, `${p.id}: forged ${JSON.stringify(b)}`);
    if (q.mode === 'fill' && !q.possible) {
      const w = listOf(maskOf(P, q.witness));
      assert.equal(validBoard(p, {...fresh.board, seeds: w, claimed: true}), true, `${p.id}: a right Can't is a valid save`);
      assert.equal(validBoard(p, {...fresh.board, seeds: w.slice(1), claimed: true}), false, `${p.id}: a forged Can't`);
    }
  }

  // On a rectangular plot every finish is filled rectangles (pieces joined by
  // sides that fill their own bounding boxes), and a filling start needs
  // every seed exactly when no seed is grown by the others.
  for (const P of [sq3, sq4, plotOf({cols: 7, rows: 2})]) {
    const C = P === sq4 ? c4 : census(P);
    for (let m = 0; m <= P.all; m++) {
      if (C.fin[m] === m) {
        const seen = new Set();
        for (const i of listOf(m)) {
          if (seen.has(i)) continue;
          const piece = [i], stack = [i]; seen.add(i);
          while (stack.length) for (const j of P.nbr[stack.pop()]) if ((m >> j & 1) && !seen.has(j)) { seen.add(j); piece.push(j); stack.push(j); }
          const xs = piece.map(k => P.list[k][0]), ys = piece.map(k => P.list[k][1]);
          assert.equal(piece.length, (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1), 'a finish is rectangles');
        }
      }
      if (C.fills(m)) assert.equal(C.needed(m), listOf(m).every(i => !(C.fin[m & ~(1 << i)] >> i & 1)), 'needed means no seed grows from the others');
    }
  }

  // Facts quoted in the notes and extensions, listed separately.
  assert.equal(fence(shape('##'), shape('##').all), 6, 'two seeds side by side');
  const arms = shape('..#../..#../#####/..#../..#..');
  assert.equal(leastOf(arms), 5);
  assert.equal(countFilling(arms, 5), 1, 'long arms: one start');
  assert.equal(finish(arms, maskOf(arms, fromRows(arms, '..#../...../#.#.#/...../..#..'))), arms.all);
  assert.equal(bits(finish(sq3, maskOf(sq3, [[0, 0], [2, 0], [1, 1]]))), 6, 'Puzzle 3 hint');
  assert.equal(bits(finish(sq4, maskOf(sq4, [[0, 0], [3, 0], [1, 1]]))), 8, 'Puzzle 11 hint');
  assert.ok(c4.needed(maskOf(sq4, [[0, 0], [1, 0], [3, 0], [3, 1], [0, 3]])), 'Puzzle 12 witness');
  // Puzzle 12: every filling five with a corner seed beside another seed in two corners needs every seed.
  const cornerPairs = m => [0, 3, 12, 15].filter(c => (m >> c & 1) && (m & sq4.nmask[c])).length;
  let pairs = 0;
  for (const m of subsetsOf(16, 5)) if (c4.fills(m) && cornerPairs(m) >= 2) { assert.ok(c4.needed(m), 'corner pairs need every seed'); pairs++; }
  assert.ok(pairs > 0);
  const c3 = census(sq3);
  // Puzzle 6 hint: a seed in the middle of each side.
  assert.ok(c3.needed(maskOf(sq3, [[1, 0], [0, 1], [2, 1], [1, 2]])));
  assert.equal(leastOf(plotOf({cols: 10, rows: 2})), 6, '2 by 10 needs six');
  assert.equal(leastOf(shape('.###/####/####/####')), 4, 'a rock in a corner');
  assert.equal(leastOf(shape('#.##/####/####/####')), 5, 'a rock on an edge');
  const thin = shape('#..../#..../#..../#..../#####');
  assert.equal(leastOf(thin), 5);
  assert.equal(countFilling(thin, 5), 1, 'the thin L');
  const ring16 = shape('#####/#...#/#...#/#...#/#####');
  assert.equal(ring16.n, 16);
  assert.equal(fence(ring16, ring16.all), 32);
  assert.equal(leastOf(ring16), 8, 'a ring of sixteen');
  // Puzzle 9: no two seeds touch in any filling start of five.
  const L = shape('##.../##.../##.../#####/#####');
  for (const m of subsetsOf(L.n, 5)) if (finish(L, m) === L.all) assert.ok(listOf(m).every(i => !(m & L.nmask[i])), 'L seeds apart');
  // Puzzle 12 extension: some start of seven seeds on 5 by 5 needs every seed.
  const sq5 = plotOf({cols: 5, rows: 5});
  let seven = null;
  for (const m of subsetsOf(25, 7)) {
    if (finish(sq5, m) !== sq5.all) continue;
    if (listOf(m).every(i => finish(sq5, m & ~(1 << i)) !== sq5.all)) { seven = m; break; }
  }
  assert.ok(seven !== null, 'seven needed on 5 by 5');
  return stats;
}
export default validateSeeds;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSeeds(), null, 2));
