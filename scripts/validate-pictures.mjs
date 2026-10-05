// Checks the Hidden pictures pack (dist/families/pictures/pictures.json):
// content fields and sources; every answer set, budget and count against an
// independent brute force on bitmasks; the theorems the notes rely on (no
// switch exactly when the picture is alone in its counts, the two-row and
// one-per-line distance rules, the four-squares-per-switch bound); hint chains
// to a solve from fresh and scrambled boards; illegal moves; Undo keeping
// found pictures; forged saves; and the playground.
// Run: node scripts/validate-pictures.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {answers, cellsOf, countPictures, PLAY_SIZES} from '../dist/families/pictures/pictures.js';
import {loadPack} from './packs.mjs';

// An independent model: a picture is an array of row bitmasks.
const popcount = n => { let k = 0; for (; n; n &= n - 1) k++; return k; };
const parse = key => key.split('/').map(row => [...row].reduce((m, ch, c) => ch === '1' ? m | (1 << c) : m, 0));
const unparse = (masks, cols) => masks.map(m => Array.from({length: cols}, (_, c) => (m >> c) & 1).join('')).join('/');
const colCounts = (masks, cols) => Array.from({length: cols}, (_, c) => masks.filter(m => (m >> c) & 1).length);
const rowsWith = (cols, k) => Array.from({length: 1 << cols}, (_, m) => m).filter(m => popcount(m) === k);
// Every picture with these counts: every choice of row patterns, filtered by columns.
function brute(rowCounts, cols) {
  let partial = [[]];
  for (const k of rowCounts) partial = partial.flatMap(rows => rowsWith(cols.length, k).map(m => [...rows, m]));
  return partial.filter(rows => colCounts(rows, cols.length).every((n, c) => n === cols[c])).map(rows => unparse(rows, cols.length));
}
// Switches read as 2 × 2 corners: rows r < s and columns c ≠ d with r holding
// c but not d, and s holding d but not c.
function neighbors(masks, cols) {
  const out = [];
  for (let r = 0; r < masks.length; r++) for (let s = r + 1; s < masks.length; s++) {
    const onlyR = masks[r] & ~masks[s], onlyS = masks[s] & ~masks[r];
    for (let c = 0; c < cols; c++) if ((onlyR >> c) & 1) for (let d = 0; d < cols; d++) if ((onlyS >> d) & 1) {
      const next = [...masks]; next[r] = masks[r] ^ (1 << c) ^ (1 << d); next[s] = masks[s] ^ (1 << c) ^ (1 << d);
      out.push(next);
    }
  }
  return out;
}
function bfs(fromKey, cols) {
  const dist = new Map([[fromKey, 0]]), queue = [fromKey];
  for (let i = 0; i < queue.length; i++) for (const next of neighbors(parse(queue[i]), cols)) {
    const key = unparse(next, cols);
    if (!dist.has(key)) { dist.set(key, dist.get(queue[i]) + 1); queue.push(key); }
  }
  return dist;
}
const diff = (a, b) => [...a].filter((ch, i) => ch !== '/' && ch !== b[i]).length;
// Rows that nest under inclusion, the textbook test for a picture with no switch.
const nested = masks => masks.every(a => masks.every(b => (a & b) === a || (a & b) === b));
const margins = (key, cols) => { const masks = parse(key); return {rows: masks.map(popcount), cols: colCounts(masks, cols)}; };
function permutationCycles(fromKey, toKey) {
  const from = parse(fromKey).map(m => Math.log2(m)), to = parse(toKey).map(m => Math.log2(m));
  const where = from.map(c => to.findIndex(d => d === c)), seen = new Set();
  let cycles = 0;
  for (let i = 0; i < where.length; i++) { if (seen.has(i)) continue; cycles++; for (let j = i; !seen.has(j); j = where[j]) seen.add(j); }
  return cycles;
}

export async function validatePictures() {
  const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
  const pack = await read('../dist/families/pictures/pictures.json'), {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  const family = pack.families[0];
  assert.equal(family.id, 'pictures'); assert.ok(family.title && family.mathematics && family.rules.length);
  const core = pack.puzzles.filter(p => p.band === 'all'), playgrounds = pack.puzzles.filter(p => p.band === 'playground');
  assert.equal(playgrounds.length, 1); assert.equal(core.length + 1, pack.puzzles.length);
  assert.ok(core.length >= 8 && core.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(core.map(p => p.number), core.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(core.some(p => p.difficulty_level === level), level);
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'pictures'); assert.ok(isExpansion(p)); assert.equal(p.revision, 1); assert.match(p.id, /^pictures-/);
    for (const key of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id} ${key}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3); p.hints.forEach(h => assert.ok(h.trim()));
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id} parent.${key}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }

  let hintSteps = 0, theoremChecks = 0;
  for (const p of core) {
    const q = p.parameters, [R, C] = q.size;
    // The answer set, by brute force.
    let want;
    if (q.mode === 'match' || q.mode === 'every') want = brute(q.rowCounts, q.colCounts);
    else if (q.mode === 'twin') { const m = margins(q.picture, C); want = brute(m.rows, m.cols).filter(k => k !== q.picture); }
    else if (q.mode === 'reach') want = [q.goal];
    else {
      want = [];
      for (let mask = 0; mask < 1 << (R * C); mask++) {
        if (popcount(mask) !== q.counters) continue;
        const rows = Array.from({length: R}, (_, r) => (mask >> (r * C)) & ((1 << C) - 1)), key = unparse(rows, C), m = margins(key, C);
        // Alone in its counts, by brute force; and the nesting rule agrees.
        const alone = brute(m.rows, m.cols).length === 1;
        assert.equal(alone, nested(rows), `${p.id}: ${key} is alone exactly when its rows nest`);
        assert.equal(alone, neighbors(rows, C).length === 0, `${p.id}: ${key} is alone exactly when it has no switch`);
        theoremChecks++;
        if (alone) want.push(key);
      }
    }
    assert.deepEqual([...answers(p)].sort(), [...want].sort(), `${p.id}: answer set`);
    assert.ok(want.length, `${p.id}: has an answer`);
    if (q.mode === 'every') assert.equal(q.answers, want.length, `${p.id}: asks for every picture`);
    if (q.mode === 'match' || q.mode === 'every') {
      // Any two pictures with the same counts are joined by switches.
      const reached = bfs(want[0], C);
      assert.ok(want.every(k => reached.has(k)) && reached.size === want.length, `${p.id}: switches join exactly the pictures with these counts`);
      theoremChecks++;
    }
    if (q.mode === 'reach') {
      assert.deepEqual(margins(q.start, C), margins(q.goal, C), `${p.id}: start and goal share counts`);
      const fewest = bfs(q.start, C).get(q.goal);
      assert.equal(q.budget, fewest, `${p.id}: the budget is the fewest switches`);
      assert.ok(fewest >= diff(q.start, q.goal) / 4, `${p.id}: a switch changes four squares`);
      assert.equal(p.objective, `Fill the rings in ${fewest} switches.`, `${p.id}: objective states the budget`);
      if (R === 2) assert.equal(fewest, [...Array(C).keys()].filter(c => q.start[c] !== q.goal[c]).length / 2, `${p.id}: two rows, half the differing columns`);
      if (margins(q.start, C).rows.every(n => n === 1) && margins(q.start, C).cols.every(n => n === 1)) assert.equal(fewest, R - permutationCycles(q.start, q.goal), `${p.id}: one per line, n minus cycles`);
      theoremChecks++;
    }
    if (p.id === 'pictures-06' || p.id === 'pictures-09') assert.equal(want.length, 1, `${p.id}: one picture`);

    // Hints alone reach a solve, and every hint is a legal move.
    const solveFrom = (start, label) => {
      let a = start;
      for (let i = 0; !isSolved(p, a.board) && i < 200; i++) {
        const hint = nextHint(p, a);
        assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
        const next = move(p, a, hint.action);
        assert.ok(next && next !== a, `${p.id} ${label}: hint ${JSON.stringify(hint.action)} is legal`);
        a = next; hintSteps++;
      }
      assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
      return a;
    };
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: valid unsolved start`);
    const done = solveFrom(fresh, 'fresh');
    if (q.mode === 'every') assert.equal(done.board.found.length, want.length);
    // From scrambled boards too: a few random toggles, or one switch that
    // still leaves a shortest route.
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const switchMove = (fromKey, toMasks) => {
      const from = cellsOf(fromKey), to = cellsOf(unparse(toMasks, C));
      const gone = from.map((v, i) => v && !to[i] ? i : -1).filter(i => i >= 0);
      return {type: 'switch', a: gone[0], b: gone[1]};
    };
    const toGoal = q.mode === 'reach' ? bfs(q.goal, C) : null;
    for (let trial = 0; trial < 5; trial++) {
      let a = freshAttempt(p);
      if (q.mode === 'reach') {
        const good = neighbors(parse(q.start), C).filter(next => toGoal.get(unparse(next, C)) === q.budget - 1);
        a = move(p, a, switchMove(q.start, good[trial % good.length]));
        assert.ok(a, `${p.id}: a good first switch is legal`);
      } else {
        for (let k = 0; k < 4; k++) {
          const next = move(p, a, {type: 'toggle', cell: Math.floor(random() * R * C)});
          if (next && !isSolved(p, next.board)) a = next;
        }
      }
      if (!isSolved(p, a.board)) solveFrom(a, `scrambled ${trial}`);
    }
    for (const bad of [{type: 'toggle', cell: -1}, {type: 'toggle', cell: R * C}, {type: 'toggle', cell: 1.5}, {type: 'switch', a: 0, b: 0}, {type: 'done'}, {type: 'size', size: 4}, null, 'A']) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    const anyCell = {type: 'toggle', cell: 0};
    assert.equal(move(p, done, anyCell), null, `${p.id}: no moves after a solve`);
    if (q.mode === 'reach') {
      assert.equal(move(p, fresh, anyCell), null, `${p.id}: only switches`);
      // A wasted first switch leaves a dead end that says so.
      const waste = neighbors(parse(q.start), C).find(next => toGoal.get(unparse(next, C)) > q.budget - 1);
      if (waste) {
        const wasted = move(p, fresh, switchMove(q.start, waste));
        assert.ok(wasted, `${p.id}: a wasted switch is still legal`);
        assert.equal(nextHint(p, wasted).type, 'deadend', `${p.id}: a wasted switch is a dead end`);
        theoremChecks++;
      }
      // Saves are replayed: over budget, or with a switch that is not one, they are rejected.
      assert.equal(validBoard(p, {path: Array(q.budget + 1).fill(done.board.path[0])}), false, `${p.id}: a save over budget is rejected`);
      assert.equal(validBoard(p, {path: [[0, 0]]}), false, `${p.id}: a save with a non-switch is rejected`);
      assert.equal(validBoard(p, {path: done.board.path}), true, `${p.id}: a real route is accepted`);
    } else {
      assert.equal(validBoard(p, {...fresh.board, cells: [...fresh.board.cells, 0]}), false, `${p.id}: wrong size rejected`);
      assert.equal(validBoard(p, {...fresh.board, cells: fresh.board.cells.map(() => 2)}), false, `${p.id}: not a picture`);
    }
    if (q.mode === 'lonely') {
      const crowded = Array(R * C).fill(1);
      assert.equal(validBoard(p, {cells: crowded}), false, `${p.id}: too many counters rejected`);
      let a = fresh;
      for (let i = 0; i < q.counters; i++) a = move(p, a, {type: 'toggle', cell: i});
      if (!isSolved(p, a.board)) assert.equal(move(p, a, {type: 'toggle', cell: q.counters}), null, `${p.id}: no counter beyond ${q.counters}`);
    }
    if (q.mode === 'every') {
      const m = mechanicFor(p);
      assert.equal(validBoard(p, {...fresh.board, found: ['forged']}), false, `${p.id}: forged picture rejected`);
      assert.equal(validBoard(p, {...fresh.board, found: [want[0], want[0]]}), false, `${p.id}: duplicate rejected`);
      assert.equal(validBoard(p, {...fresh.board, found: [want[0]], claimed: want.length > 1}), want.length === 1, `${p.id}: an early claim cannot be saved as solved`);
      // An early claim is answered and changes nothing else.
      let a = fresh;
      while (!a.board.found.length) a = move(p, a, nextHint(p, a).action);
      const claim = move(p, a, {type: 'done'});
      if (want.length > 1) { assert.ok(claim.board.early && !isSolved(p, claim.board), `${p.id}: “There is another”`); assert.deepEqual(claim.board.found, a.board.found); }
      else assert.ok(isSolved(p, claim.board), `${p.id}: one picture, then That’s all`);
      // Undo after a discovery keeps it.
      const back = undo(a), kept = {...back, board: m.carry(p, a.board, back.board)};
      assert.equal(kept.board.found.length, 1, `${p.id}: Undo keeps a found picture`);
      assert.ok(validBoard(p, kept.board), `${p.id}: board after Undo is valid`);
    }
  }

  // The playground: counts of pictures against brute force, switches keep the
  // count, sizes change, and nothing is ever solved.
  const [pg] = playgrounds;
  let a = freshAttempt(pg);
  assert.ok(validBoard(pg, a.board) && !isSolved(pg, a.board));
  for (const [rows, cols] of [[[2, 2, 2, 2], [2, 2, 2, 2]], [[1, 1, 1, 1], [1, 1, 1, 1]], [[2, 1, 1, 0], [1, 1, 1, 1]], [[3, 1, 2], [2, 3, 1]], [[2, 2, 1, 3, 0], [1, 2, 3, 0, 2]]]) assert.equal(countPictures(rows, cols), brute(rows, cols).length, `count for ${rows} / ${cols}`);
  assert.equal(countPictures([3, 3, 3, 3, 3, 3], [3, 3, 3, 3, 3, 3]), 297200, 'the 6 × 6 count the notes quote');
  for (const size of PLAY_SIZES) {
    a = move(pg, a, {type: 'size', size}) || a;
    assert.equal(a.board.size, size);
    for (let i = 0; i < size * size; i += 2) a = move(pg, a, {type: 'toggle', cell: i});
    const masks = parse(Array.from({length: size}, (_, r) => a.board.cells.slice(r * size, (r + 1) * size).join('')).join('/'));
    const swaps = neighbors(masks, size);
    if (swaps.length) {
      const before = margins(unparse(masks, size), size), next = unparse(swaps[0], size), cells = cellsOf(next);
      const gone = a.board.cells.map((v, i) => v && !cells[i] ? i : -1).filter(i => i >= 0);
      const b = move(pg, a, {type: 'switch', a: gone[0], b: gone[1]});
      assert.ok(b, `playground ${size}: switch`);
      assert.deepEqual(margins(unparse(parse(Array.from({length: size}, (_, r) => b.board.cells.slice(r * size, (r + 1) * size).join('')).join('/')), size), size), before, `playground ${size}: a switch keeps the counts`);
    }
    assert.equal(move(pg, a, {type: 'toggle', cell: size * size}), null);
    assert.equal(move(pg, a, {type: 'switch', a: 0, b: 0}), null);
  }
  assert.equal(move(pg, a, {type: 'size', size: 7}), null);
  assert.equal(validBoard(pg, {size: 4, cells: Array(9).fill(0)}), false);
  return {picturePuzzles: core.length, playground: 1, sources: pack.sources.length, hintSteps, theoremChecks};
}
export default validatePictures;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validatePictures(), null, 2));
