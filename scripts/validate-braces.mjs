// Checks the Bracing frames pack (dist/families/braces/braces.json): content
// fields and sources; the mechanic's "holds" against the rank of the actual
// bar-and-pin framework's rigidity matrix (exact arithmetic), over every
// design of the small frames and every design that matters on the large ones;
// the fewest braces against that rank; the number of fewest designs against
// Kirchhoff's matrix-tree theorem; loose designs against a separate search;
// witnesses, wrong claims and their answers; hint chains from fresh and messy
// boards; illegal moves; forged saves. Run: node scripts/validate-braces.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// --- The framework, written separately from the mechanic ---------------------
// Joints at integer points, a bar for each side of each cell and a brace on a
// cell's diagonal. The frame is rigid in the plane exactly when its rigidity
// matrix (a row per bar: p_u − p_v under u's columns, p_v − p_u under v's)
// has rank 2 × joints − 3.
function rank(rows) {
  const m = rows.map(r => r.map(BigInt));
  let r = 0, prev = 1n;
  const cols = m[0]?.length || 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    let p = r;
    while (p < m.length && m[p][c] === 0n) p++;
    if (p === m.length) continue;
    [m[r], m[p]] = [m[p], m[r]];
    for (let i = r + 1; i < m.length; i++) {
      for (let j = c + 1; j < cols; j++) m[i][j] = (m[r][c] * m[i][j] - m[i][c] * m[r][j]) / prev;
      m[i][c] = 0n;
    }
    prev = m[r][c]; r++;
  }
  return r;
}
function rigid(q, braces) {
  const id = (r, c) => r * (q.cols + 1) + c, V = (q.rows + 1) * (q.cols + 1), rows = [];
  const bar = ([r1, c1], [r2, c2]) => {
    const row = Array(2 * V).fill(0), dx = c1 - c2, dy = r1 - r2;
    row[2 * id(r1, c1)] = dx; row[2 * id(r1, c1) + 1] = dy; row[2 * id(r2, c2)] = -dx; row[2 * id(r2, c2) + 1] = -dy;
    rows.push(row);
  };
  for (let r = 0; r <= q.rows; r++) for (let c = 0; c <= q.cols; c++) { if (c < q.cols) bar([r, c], [r, c + 1]); if (r < q.rows) bar([r, c], [r + 1, c]); }
  for (const k of braces) { const r = Math.floor(k / q.cols), c = k % q.cols; bar([r, c], [r + 1, c + 1]); }
  return rank(rows) === 2 * V - 3;
}
// Rows and columns joined by braces, by depth-first search.
function joined(q, braces) {
  const seen = new Set(['r0']), stack = ['r0'];
  while (stack.length) {
    const at = stack.pop();
    for (const k of braces) {
      const r = `r${Math.floor(k / q.cols)}`, c = `c${k % q.cols}`, next = at === r ? c : at === c ? r : null;
      if (next && !seen.has(next)) { seen.add(next); stack.push(next); }
    }
  }
  return seen.size === q.rows + q.cols;
}
// Spanning trees of the row-column graph of the open cells, by the
// matrix-tree theorem: any cofactor of the Laplacian.
function treeCount(q) {
  const n = q.rows + q.cols, L = Array.from({length: n}, () => Array(n).fill(0));
  for (let k = 0; k < q.rows * q.cols; k++) {
    if ((q.windows || []).includes(k)) continue;
    const a = Math.floor(k / q.cols), b = q.rows + k % q.cols;
    L[a][a]++; L[b][b]++; L[a][b]--; L[b][a]--;
  }
  const minor = L.slice(1).map(row => row.slice(1).map(BigInt));
  // Bareiss determinant.
  let sign = 1n, prev = 1n;
  for (let i = 0; i < minor.length; i++) {
    let p = i;
    while (p < minor.length && minor[p][i] === 0n) p++;
    if (p === minor.length) return 0;
    if (p !== i) { [minor[i], minor[p]] = [minor[p], minor[i]]; sign = -sign; }
    for (let r = i + 1; r < minor.length; r++) { for (let c = i + 1; c < minor.length; c++) minor[r][c] = (minor[i][i] * minor[r][c] - minor[r][i] * minor[i][c]) / prev; minor[r][i] = 0n; }
    prev = minor[i][i];
  }
  return Number(sign * prev);
}
const open = q => Array.from({length: q.rows * q.cols}, (_, k) => k).filter(k => !(q.windows || []).includes(k));
const subsets = (list, size, from = 0) => size === 0 ? [[]] : list.slice(from).flatMap((x, i) => subsets(list, size - 1, from + i + 1).map(rest => [x, ...rest]));
const covered = (q, set) => Array.from({length: q.rows}, (_, r) => set.some(k => Math.floor(k / q.cols) === r)).every(Boolean) && Array.from({length: q.cols}, (_, c) => set.some(k => k % q.cols === c)).every(Boolean);

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { assert.ok(a.history.length, `${p.id} ${label}: a dead end can be undone`); a = undo(a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const braceAll = (p, a, set) => set.reduce((b, k) => b.board.braces.includes(k) ? b : play(p, b, {type: 'brace', cell: k}), a);

export async function validateBraces() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/braces/braces.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'braces');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  // The theorem itself, on every design of every frame up to 3 by 3.
  let designsChecked = 0, steps = 0, claims = 0;
  for (const [rows, cols] of [[1, 1], [1, 2], [1, 3], [2, 2], [2, 3], [3, 2], [3, 3]]) {
    const q = {rows, cols};
    for (let size = 0; size <= rows * cols; size++) for (const set of subsets(open(q), size)) {
      assert.equal(rigid(q, set), joined(q, set), `${rows}×${cols} ${set}: rank and links agree`);
      designsChecked++;
    }
  }
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'braces');
    assert.ok(p.id.startsWith('braces-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 10, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    if (q.mode === 'playground') {
      const a = play(p, play(p, fresh, {type: 'brace', cell: 0}), {type: 'brace', cell: 0});
      assert.deepEqual(a.board.braces, []);
      assert.equal(nextHint(p, a).type, 'done');
      continue;
    }
    for (const bad of [null, 'brace', {type: 'brace'}, {type: 'brace', cell: -1}, {type: 'brace', cell: q.rows * q.cols}, {type: 'brace', cell: 1.5}, {type: 'fly'}, ...(q.windows || []).map(cell => ({type: 'brace', cell}))]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    assert.equal(validBoard(p, {...fresh.board, braces: [0, 0]}), false, `${p.id}: a cell braced twice`);
    if (q.windows?.length) assert.equal(validBoard(p, {...fresh.board, braces: [q.windows[0]]}), false, `${p.id}: a braced window`);
    if (q.mode === 'fewest') {
      const need = q.rows + q.cols - 1, cells = open(q);
      // Fewer braces never hold; the fewest designs are counted by Kirchhoff.
      for (const set of subsets(cells, need - 1)) assert.equal(rigid(q, set), false, `${p.id}: ${set} is too few`);
      const trees = subsets(cells, need).filter(set => rigid(q, set));
      designsChecked += subsets(cells, need - 1).length + subsets(cells, need).length;
      assert.equal(trees.length, treeCount(q), `${p.id}: fewest designs by rank and by the matrix-tree theorem`);
      // A witness, a frame that moves, and one with a brace to spare.
      let a = braceAll(p, fresh, trees[0]);
      if (q.start) for (const k of q.start) if (!trees[0].includes(k)) a = play(p, a, {type: 'brace', cell: k});
      a = play(p, a, {type: 'claim'});
      assert.ok(isSolved(p, a.board), `${p.id}: a fewest design solves`);
      const moving = trees[0].slice(1);
      if (!q.start) {
        const b = play(p, braceAll(p, fresh, moving), {type: 'claim'});
        assert.equal(b.board.told.kind, 'moves', `${p.id}: a frame that moves is told so`);
        assert.equal(rigid(q, moving), false);
        assert.equal(move(p, b, {type: 'claim'}), null, `${p.id}: change the frame before claiming again`);
        steps += hintsSolve(p, b, 'after a wrong claim');
        claims++;
      }
      const extra = cells.find(k => !trees[0].includes(k));
      if (extra !== undefined) {
        const c = play(p, braceAll(p, fresh, [...trees[0], extra]), {type: 'claim'});
        assert.equal(c.board.told.kind, 'spare', `${p.id}: a brace to spare is shown`);
        const without = c.board.braces.filter(k => k !== c.board.told.cell);
        assert.ok(rigid(q, without), `${p.id}: the marked brace really can go`);
        steps += hintsSolve(p, c, 'after a spare brace');
        claims++;
      }
      assert.equal(validBoard(p, {...fresh.board, braces: trees[0].slice(1), claimed: true}), false, `${p.id}: a forged claim`);
      assert.equal(validBoard(p, {...fresh.board, braces: trees[0], told: {kind: 'moves'}}), false, `${p.id}: a forged answer`);
    }
    if (q.mode === 'one') {
      assert.equal(rigid(q, q.start), false, `${p.id}: the start moves`);
      const works = open(q).filter(k => !q.start.includes(k) && rigid(q, [...q.start, k]));
      assert.ok(works.length > 0, `${p.id}: some cell works`);
      for (const k of open(q).filter(k => !q.start.includes(k))) {
        const a = play(p, fresh, {type: 'brace', cell: k});
        assert.equal(isSolved(p, a.board), works.includes(k), `${p.id}: cell ${k}`);
        if (!works.includes(k)) assert.equal(move(p, a, {type: 'brace', cell: works[0]}), null, `${p.id}: only one brace may be added`);
      }
      assert.equal(move(p, fresh, {type: 'brace', cell: q.start[0]}), null, `${p.id}: a starting brace stays`);
      assert.equal(validBoard(p, {braces: q.start.slice(1)}), false, `${p.id}: a starting brace removed`);
    }
    if (q.mode === 'loose') {
      // Loose designs by a separate search, each checked against the rank.
      const looseSets = subsets(open(q), q.count).filter(set => covered(q, set) && !joined(q, set));
      designsChecked += looseSets.length;
      for (const set of looseSets) assert.equal(rigid(q, set), false, `${p.id}: ${set} really moves`);
      const a = braceAll(p, fresh, looseSets[0]);
      assert.ok(isSolved(p, a.board), `${p.id}: a loose design solves`);
      // One more brace in a different cell always holds.
      for (const k of open(q).filter(k => !looseSets[0].includes(k))) assert.ok(rigid(q, [...looseSets[0], k]), `${p.id}: one more brace holds`);
      const full = open(q).slice(0, q.count);
      assert.equal(move(p, braceAll(p, fresh, full), {type: 'brace', cell: open(q)[q.count]}), null, `${p.id}: no more than ${q.count} braces`);
      assert.equal(validBoard(p, {braces: open(q).slice(0, q.count + 1)}), false, `${p.id}: too many braces`);
      if (p.id === 'braces-07') assert.equal(looseSets.length, 9);
      if (p.id === 'braces-09') assert.equal(looseSets.length, 16);
    }
    steps += hintsSolve(p, fresh, 'from fresh');
    // A messy start: every open cell braced that the puzzle allows.
    let messy = fresh;
    for (const k of open(q)) { const next = move(p, messy, {type: 'brace', cell: k}); if (next && !isSolved(p, next.board)) messy = next; }
    steps += hintsSolve(p, messy, 'from a messy board');
  }
  return {bracesPuzzles: puzzles.length, designsChecked, wrongClaims: claims, hintSteps: steps};
}
export default validateBraces;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateBraces(), null, 2));
