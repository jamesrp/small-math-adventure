// Checks the Garden fences pack (dist/families/fences/fences.json) by methods
// separate from the mechanic's own: shapes from Redelmeier's enumeration of
// fixed polyominoes (counts checked against OEIS A001168 and A000105), with
// their own canonical form; fences as 4n − 2 × (shared sides) rather than by
// counting boundary edges; holes by a flood fill of a padded box; the row and
// column bound P ≥ 2(r + c), with equality exactly when every row and column
// is one run, checked on every polyomino up to ten squares and then used for
// the shortest fence and the most tiles; the longest fence on each small plot
// by enumerating every joined set of its squares. The answers are played as
// moves, wrong claims are answered, hint chains solve every puzzle from fresh,
// messy and wrongly claimed boards, and illegal moves and forged saves are
// rejected. Run: node scripts/validate-fences.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

/* ---------------- Squares, written separately from the mechanic ---------------- */
const K = (x, y) => `${x}:${y}`;
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// Shared sides, the fence, joinedness, rows and columns, and holes of a list of [x, y].
function facts(cells) {
  const set = new Set(cells.map(([x, y]) => K(x, y)));
  let shared = 0;
  for (const [x, y] of cells) { if (set.has(K(x + 1, y))) shared++; if (set.has(K(x, y + 1))) shared++; }
  const fence = 4 * cells.length - 2 * shared;
  // Joined: a union-find over shared sides.
  const parent = cells.map((_, i) => i), find = i => parent[i] === i ? i : (parent[i] = find(parent[i]));
  const at = new Map(cells.map(([x, y], i) => [K(x, y), i]));
  cells.forEach(([x, y], i) => { for (const [dx, dy] of N4) { const j = at.get(K(x + dx, y + dy)); if (j !== undefined) parent[find(i)] = find(j); } });
  const joined = cells.length > 0 && cells.every((_, i) => find(i) === find(0));
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const rows = new Set(ys).size, cols = new Set(xs).size;
  const runs = list => { const s = [...new Set(list)].sort((a, b) => a - b); return s.length ? 1 + s.filter((v, i) => i && v !== s[i - 1] + 1).length : 0; };
  const oneRun = [...new Set(ys)].every(y => runs(cells.filter(c => c[1] === y).map(c => c[0])) === 1) && [...new Set(xs)].every(x => runs(cells.filter(c => c[0] === x).map(c => c[1])) === 1);
  // Holes: whatever a flood from outside a padded box can't reach.
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  const outside = new Set([K(x0, y0)]), queue = [[x0, y0]];
  while (queue.length) {
    const [x, y] = queue.shift();
    for (const [dx, dy] of N4) {
      const a = x + dx, b = y + dy;
      if (a < x0 || a > x1 || b < y0 || b > y1 || set.has(K(a, b)) || outside.has(K(a, b))) continue;
      outside.add(K(a, b)); queue.push([a, b]);
    }
  }
  const holes = new Set();
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (!set.has(K(x, y)) && !outside.has(K(x, y))) holes.add(K(x, y));
  return {shared, fence, joined, rows, cols, oneRun, holes};
}
// A shape's canonical form: the least of its eight pictures as rows of 0/1.
function picture(cells) {
  const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1]));
  const w = Math.max(...cells.map(c => c[0])) - mx + 1, h = Math.max(...cells.map(c => c[1])) - my + 1;
  const rows = Array.from({length: h}, () => Array(w).fill('0'));
  for (const [x, y] of cells) rows[y - my][x - mx] = '1';
  return rows.map(r => r.join('')).join('/');
}
function canonical(cells) {
  const out = [];
  for (const swap of [false, true]) for (const sx of [1, -1]) for (const sy of [1, -1]) out.push(picture(cells.map(([x, y]) => swap ? [sx * y, sy * x] : [sx * x, sy * y])));
  return out.sort()[0];
}
// The pack's shape keys are "x,y x,y ..."; read them without the mechanic.
const parseKey = key => key.split(' ').map(s => s.split(',').map(Number));

/* ---------------- Redelmeier's enumeration ---------------- */
// Every fixed polyomino of up to `max` squares, once each: grow from (0, 0)
// using only squares after it (y > 0, or y = 0 and x ≥ 0), keeping a list of
// untried neighbours.
function redelmeier(max, visit) {
  const allowed = ([x, y]) => y > 0 || (y === 0 && x >= 0);
  const cells = [], seen = new Set([K(0, 0)]);
  (function grow(untried) {
    while (untried.length) {
      const c = untried.pop();
      cells.push(c);
      visit(cells);
      if (cells.length < max) {
        const fresh = [];
        for (const [dx, dy] of N4) {
          const d = [c[0] + dx, c[1] + dy];
          if (allowed(d) && !seen.has(K(...d))) { seen.add(K(...d)); fresh.push(d); }
        }
        grow([...untried, ...fresh]);
        for (const d of fresh) seen.delete(K(...d));
      }
      cells.pop();
    }
  })([[0, 0]]);
}
// Every joined set of `size` squares among `squares` (a list of [x, y]):
// the same growth, rooted at each square and using only later squares.
function joinedSets(squares, size, visit) {
  const index = new Map(squares.map(([x, y], i) => [K(x, y), i]));
  const nbr = squares.map(([x, y]) => N4.map(([dx, dy]) => index.get(K(x + dx, y + dy))).filter(j => j !== undefined));
  for (let root = 0; root < squares.length; root++) {
    const chosen = [], seen = new Set([root]);
    (function grow(untried) {
      while (untried.length) {
        const v = untried.pop();
        chosen.push(v);
        if (chosen.length === size) visit(chosen.map(i => squares[i]));
        else {
          const fresh = nbr[v].filter(j => j > root && !seen.has(j));
          fresh.forEach(j => seen.add(j));
          grow([...untried, ...fresh]);
          fresh.forEach(j => seen.delete(j));
        }
        chosen.pop();
      }
    })([root]);
  }
}

/* ---------------- Facts about all shapes up to ten squares ---------------- */
const FIXED = [1, 2, 6, 19, 63, 216, 760, 2725, 9910, 36446], FREE = [1, 1, 2, 5, 12, 35, 108, 369, 1285, 4655];
function census() {
  const fixed = Array(11).fill(0), free = Array.from({length: 11}, () => new Map()), lemma = {checked: 0};
  redelmeier(10, cells => {
    const n = cells.length, f = facts(cells);
    fixed[n]++;
    const key = canonical(cells);
    if (!free[n].has(key)) free[n].set(key, f.fence);
    // The row and column bound, and when it is exact.
    assert.ok(f.joined, 'Redelmeier makes joined shapes');
    assert.ok(f.fence >= 2 * (f.rows + f.cols), 'P ≥ 2(r + c)');
    assert.equal(f.fence === 2 * (f.rows + f.cols), f.oneRun, 'P = 2(r + c) exactly when rows and columns are single runs');
    assert.ok(f.fence <= 2 * n + 2 && f.fence % 2 === 0, 'P is even and at most 2n + 2');
    assert.equal(f.fence === 2 * n + 2, f.shared === n - 1, 'longest exactly for trees');
    lemma.checked++;
  });
  for (let n = 1; n <= 10; n++) {
    assert.equal(fixed[n], FIXED[n - 1], `fixed polyominoes of ${n}`);
    assert.equal(free[n].size, FREE[n - 1], `free polyominoes of ${n}`);
    const fences = [...free[n].values()], least = (() => { let k = 0; while (k * k < 4 * n) k++; return 2 * k; })();
    assert.equal(Math.min(...fences), least, `the least fence of ${n} is 2⌈2√n⌉`);
    assert.equal(Math.max(...fences), 2 * n + 2, `the longest fence of ${n}`);
  }
  return {free, checked: lemma.checked};
}
// From the bound: the shortest fence of n squares, and the most squares a fence holds.
const shortestByBound = n => { let best = Infinity; for (let r = 1; r <= n; r++) for (let c = 1; c <= n; c++) if (r * c >= n) best = Math.min(best, 2 * (r + c)); return best; };
const mostByBound = fence => { let best = 0; for (let r = 1; 2 * r < fence; r++) for (let c = 1; 2 * (r + c) <= fence; c++) best = Math.max(best, r * c); return best; };

/* ---------------- Playing ---------------- */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const indexOf = (q, [x, y]) => y * q.cols + x;
const squaresOf = q => { const out = []; for (let y = 0; y < q.rows; y++) for (let x = 0; x < q.cols; x++) out.push([x, y]); return out; };
const ponds = q => new Set((q.ponds || []).map(([x, y]) => K(x, y)));
// Every way a shape lies on the plot, off the ponds, as [x, y] lists.
function placements(q, cells) {
  const out = [], seen = new Set();
  for (const swap of [false, true]) for (const sx of [1, -1]) for (const sy of [1, -1]) {
    const t = cells.map(([x, y]) => swap ? [sx * y, sy * x] : [sx * x, sy * y]);
    const mx = Math.min(...t.map(c => c[0])), my = Math.min(...t.map(c => c[1]));
    const base = t.map(([x, y]) => [x - mx, y - my]), w = Math.max(...base.map(c => c[0])) + 1, h = Math.max(...base.map(c => c[1])) + 1;
    for (let oy = 0; oy + h <= q.rows; oy++) for (let ox = 0; ox + w <= q.cols; ox++) {
      const placed = base.map(([x, y]) => [x + ox, y + oy]);
      if (placed.some(([x, y]) => ponds(q).has(K(x, y)))) continue;
      const k = placed.map(c => K(...c)).sort().join(' ');
      if (!seen.has(k)) { seen.add(k); out.push(placed); }
    }
  }
  return out;
}
const enclosesPonds = (q, cells) => { const h = facts(cells).holes; return (q.ponds || []).every(([x, y]) => h.has(K(x, y))); };
const reaches = (q, cells) => !q.span || (new Set(cells.map(c => c[0])).size === q.cols && new Set(cells.map(c => c[1])).size === q.rows);
const legal = (q, cells) => facts(cells).joined && enclosesPonds(q, cells) && reaches(q, cells);
// The gardens a puzzle that starts planted reaches in at most k carries, by
// playing every carry (a separate method from the build's choice of squares).
function carried(q, k) {
  const key = cells => cells.map(c => K(...c)).sort().join(' '), seen = new Map([[key(q.start), q.start]]);
  let level = [q.start];
  for (let step = 0; step < k; step++) {
    const next = [];
    for (const cells of level) for (const from of cells) for (const to of squaresOf(q)) {
      if (cells.some(c => c[0] === to[0] && c[1] === to[1])) continue;
      const moved = [...cells.filter(c => c !== from), to], id = key(moved);
      if (!seen.has(id)) { seen.set(id, moved); next.push(moved); }
    }
    level = next;
  }
  return [...seen.values()];
}
const plantAll = (p, a, cells) => cells.reduce((b, c) => play(p, b, {type: 'plant', cells: [indexOf(p.parameters, c)]}), a);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}

export async function validateFences() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/fences/fences.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'fences');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  const {free, checked} = census();
  // The plot enumeration against every subset of a small plot.
  for (const [cols, rows, size] of [[3, 3, 4], [3, 4, 6], [4, 4, 5]]) {
    const sq = squaresOf({cols, rows});
    let fast = 0, slow = 0;
    joinedSets(sq, size, () => fast++);
    for (let mask = 0; mask < 1 << sq.length; mask++) {
      const cells = sq.filter((_, i) => mask >> i & 1);
      if (cells.length === size && facts(cells).joined) slow++;
    }
    assert.equal(fast, slow, `joined sets of ${size} in ${cols} by ${rows}`);
  }
  let steps = 0, claims = 0, setsChecked = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'fences');
    assert.ok(p.id.startsWith('fences-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 10, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    if (q.mode === 'playground') {
      let a = play(p, fresh, {type: 'plant', cells: [0, 1, 2]});
      a = play(p, a, {type: 'lift', cell: 1});
      a = play(p, a, {type: 'carry', from: 2, to: 1});
      assert.deepEqual(a.board.tiles, [0, 1]);
      a = play(p, a, {type: 'size', size: 4});
      assert.deepEqual(a.board, {size: 4, tiles: []});
      assert.equal(move(p, a, {type: 'size', size: 5}), null, 'only the offered sizes');
      assert.equal(move(p, a, {type: 'claim'}), null, 'nothing to claim in the playground');
      assert.equal(nextHint(p, a).type, 'done');
      continue;
    }
    const n = q.tiles, squares = squaresOf(q).filter(([x, y]) => !ponds(q).has(K(x, y)));
    // The answers, recomputed.
    if (q.mode === 'every') {
      const want = [...free[n]].filter(([, fence]) => q.fence === undefined || fence === q.fence).map(([key]) => key).sort();
      assert.deepEqual(q.answers.map(k => canonical(parseKey(k))).sort(), want, `${p.id}: every garden`);
      for (const key of q.answers) assert.ok(placements(q, parseKey(key)).length, `${p.id}: ${key} fits the plot`);
    }
    if (q.mode === 'fences') {
      const made = [...new Set([...free[n]].filter(([key]) => placements(q, key.split('/').flatMap((row, y) => [...row].map((v, x) => v === '1' ? [x, y] : null).filter(Boolean))).length).map(([, fence]) => fence))].sort((a, b) => a - b);
      assert.deepEqual(q.answers, made.filter(f => q.chips.includes(f)), `${p.id}: fence lengths`);
      assert.ok(made.every(f => q.chips.includes(f)), `${p.id}: every length that can be made is offered`);
      assert.ok(q.chips.some(f => !made.includes(f)), `${p.id}: some offered lengths can't be made`);
      q.answers.forEach((f, i) => assert.equal(facts(parseKey(q.witnesses[i])).fence, f, `${p.id}: witness for ${f}`));
    }
    if (q.mode === 'fewest' && q.moves) {
      // Starts planted, with a limit on tiles moved: the best within the limit, the goal played, the trap.
      const fenceOf = list => Math.min(...list.filter(c => legal(q, c)).map(c => facts(c).fence));
      const within = carried(q, q.moves), best = fenceOf(within);
      assert.equal(q.best, best, `${p.id}: the shortest fence within ${q.moves} moves`);
      assert.deepEqual(q.goals.map(c => c.map(x => K(...x)).sort().join(' ')).sort(), within.filter(c => legal(q, c) && facts(c).fence === best).map(c => c.map(x => K(...x)).sort().join(' ')).sort(), `${p.id}: every best garden`);
      const ones = carried(q, 1), oneBest = fenceOf(ones);
      assert.ok(oneBest > best, `${p.id}: one move is not enough`);
      const traps = ones.filter(c => legal(q, c) && facts(c).fence === oneBest);
      assert.ok(traps.every(t => fenceOf(carried({...q, start: t}, 1)) > best), `${p.id}: the best single move can't be finished in one more`);
      assert.ok(p.parent.notice.includes(String(oneBest)) && p.parent.notice.includes(String(best)), `${p.id}: the notice gives ${oneBest} and ${best}`);
      setsChecked += within.length;
      const startIdx = q.start.map(c => indexOf(q, c)), goal = q.goals[0].map(c => indexOf(q, c));
      const gone = startIdx.filter(i => !goal.includes(i)), added = goal.filter(i => !startIdx.includes(i));
      let a = fresh;
      gone.forEach((from, j) => { a = play(p, a, {type: 'carry', from, to: added[j]}); });
      assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board), `${p.id}: the goal solves`);
      const w = play(p, fresh, {type: 'claim'});
      assert.equal(w.board.told, 'shorter', `${p.id}: a claim on the start is told`);
      assert.equal(move(p, w, {type: 'claim'}), null, `${p.id}: change the garden before claiming again`);
      steps += hintsSolve(p, w, 'after a wrong claim');
      // The trap, then hints.
      const trap = traps[0].map(c => indexOf(q, c)), tf = startIdx.find(i => !trap.includes(i)), tt = trap.find(i => !startIdx.includes(i));
      const trapped = play(p, fresh, {type: 'carry', from: tf, to: tt});
      assert.equal(facts(trapped.board.tiles.map(i => [i % q.cols, Math.floor(i / q.cols)])).fence, oneBest);
      steps += hintsSolve(p, trapped, 'after the best single move');
      // The limit: moving more tiles is refused; carrying one home gives its move back.
      const away = squaresOf(q).map(c => indexOf(q, c)).filter(i => !startIdx.includes(i)).reverse();
      let b = fresh;
      for (let j = 0; j < q.moves; j++) b = play(p, b, {type: 'carry', from: startIdx[j], to: away[j]});
      assert.equal(move(p, b, {type: 'carry', from: startIdx[q.moves], to: away[q.moves]}), null, `${p.id}: no more than ${q.moves} tiles move`);
      assert.equal(move(p, b, {type: 'lift', cell: startIdx[q.moves]}), null, `${p.id}: no lifting another tile`);
      assert.ok(move(p, b, {type: 'carry', from: away[0], to: away[q.moves]}), `${p.id}: a moved tile moves again`);
      const home = play(p, b, {type: 'carry', from: away[0], to: startIdx[0]});
      assert.ok(move(p, home, {type: 'carry', from: startIdx[q.moves], to: away[q.moves]}), `${p.id}: a tile carried home gives its move back`);
      const lifted = play(p, home, {type: 'lift', cell: startIdx[q.moves]});
      assert.ok(validBoard(p, lifted.board) && lifted.board.tiles.length === q.tiles - 1, `${p.id}: a lifted tile waits in the tray`);
      steps += hintsSolve(p, lifted, 'from a messy board');
      assert.equal(validBoard(p, {...fresh.board, tiles: [...startIdx.slice(q.moves + 1), ...away.slice(0, q.moves + 1)].sort((x, y) => x - y)}), false, `${p.id}: a save with too many tiles moved`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: a forged claim`);
      for (const bad of [{type: 'plant', cells: [away[0]]}, {type: 'carry', from: startIdx[0], to: startIdx[1]}, {type: 'clear'}, {type: 'lift', cell: away[0]}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      claims++;
      steps += hintsSolve(p, fresh, 'from fresh');
      continue;
    }
    if (q.mode === 'fewest' && q.span) {
      // Every joined set of the plot that reaches every row and column: the fence is
      // at least 2(rows + columns), and exactly that when every row and column is one run.
      let best = Infinity, count = 0;
      const shapes = new Set();
      joinedSets(squares, n, cells => {
        if (!reaches(q, cells)) return;
        count++;
        const f = facts(cells);
        assert.ok(f.fence >= 2 * (q.rows + q.cols) && (f.fence === 2 * (q.rows + q.cols)) === f.oneRun, `${p.id}: the row and column bound`);
        if (f.fence < best) { best = f.fence; shapes.clear(); }
        if (f.fence === best) shapes.add(canonical(cells));
      });
      setsChecked += count;
      assert.equal(q.best, best, `${p.id}: the shortest fence reaching every row and column`);
      assert.deepEqual(q.witnesses.map(k => canonical(parseKey(k))).sort(), [...shapes].sort(), `${p.id}: every shortest garden`);
    } else if (q.mode === 'fewest') {
      assert.equal(q.best, shortestByBound(n), `${p.id}: shortest by the row and column bound`);
      if (n <= 10) assert.equal(q.best, Math.min(...free[n].values()), `${p.id}: shortest by enumeration`);
    }
    if (q.mode === 'most') assert.equal(q.best, mostByBound(q.fence), `${p.id}: most by the row and column bound`);
    if (q.mode === 'longest') {
      // Every joined set of the plot's squares.
      let best = 0, count = 0;
      const shapes = new Map();
      joinedSets(squares, n, cells => {
        count++;
        if (!enclosesPonds(q, cells)) return;
        const f = facts(cells).fence;
        if (f > best) { best = f; shapes.clear(); }
        if (f === best) shapes.set(canonical(cells), cells.map(c => [...c]));
      });
      setsChecked += count;
      assert.equal(q.best, best, `${p.id}: the longest fence on this plot`);
      assert.deepEqual(q.witnesses.map(k => canonical(parseKey(k))).sort(), [...shapes.keys()].sort(), `${p.id}: every longest garden`);
    }
    if (q.mode === 'target') {
      assert.deepEqual(q.witnesses.map(k => canonical(parseKey(k))).sort(), [...free[n]].filter(([, f]) => f === q.fence).map(([k]) => k).sort(), `${p.id}: every garden with that fence`);
    }
    // Each answer, played.
    const goodKeys = q.mode === 'every' ? q.answers : q.witnesses;
    const good = goodKeys.map(k => placements(q, parseKey(k)).find(cells => legal(q, cells) && (q.mode !== 'most' || facts(cells).fence <= q.fence)));
    assert.ok(good.every(Boolean), `${p.id}: every answer has a legal place`);
    if (q.mode === 'target') {
      assert.ok(isSolved(p, plantAll(p, fresh, good[0]).board), `${p.id}: the witness solves`);
    } else if (q.mode === 'every' || q.mode === 'fences') {
      let a = fresh;
      for (const cells of good) { a = q.mode === 'every' && a.board.tiles.length ? play(p, a, {type: 'clear'}) : a.board.tiles.length ? play(p, a, {type: 'clear'}) : a; a = plantAll(p, a, cells); }
      assert.equal(a.board.found.length, q.answers.length, `${p.id}: each answer joins the list`);
      // Undo keeps what was found.
      const back = undo(a), kept = mechanicFor(p).carry(p, a.board, back.board);
      assert.equal(kept.found.length, q.answers.length, `${p.id}: Undo keeps the list`);
      assert.ok(validBoard(p, kept), `${p.id}: a board after Undo is valid`);
      // Claims: one short is told; all of them solves.
      const short = play(p, plantAll(p, fresh, good[0]), {type: 'claim'});
      assert.equal(short.board.told, 'another', `${p.id}: a short list is told`);
      assert.equal(move(p, short, {type: 'claim'}), null, `${p.id}: change something before claiming again`);
      steps += hintsSolve(p, short, 'after a wrong claim');
      assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board), `${p.id}: the full list solves`);
      assert.equal(validBoard(p, {...fresh.board, found: ['0,0 9,9']}), false, `${p.id}: a forged garden`);
      assert.equal(validBoard(p, {...fresh.board, found: [...q.answers], claimed: true, tiles: []}), true, `${p.id}: a full claimed list is a valid save`);
      assert.equal(validBoard(p, {...fresh.board, found: q.answers.slice(1), claimed: true}), false, `${p.id}: a forged claim`);
      claims++;
    } else {
      // A wrong claim, from a legal garden that isn't the best.
      const shapes = [...free[n] || []].map(([key]) => key.split('/').flatMap((row, y) => [...row].map((v, x) => v === '1' ? [x, y] : null).filter(Boolean)));
      let worse = null;
      if (q.mode === 'most') {
        worse = placements(q, [[0, 0]]).find(cells => legal(q, cells));
      } else {
        // Up to ten tiles, every shape; beyond, the plot's rim, then inside it.
        const rim = [...Array.from({length: q.cols}, (_, x) => [x, 0]), ...Array.from({length: q.rows - 1}, (_, y) => [q.cols - 1, y + 1]), ...Array.from({length: q.cols - 1}, (_, x) => [q.cols - 2 - x, q.rows - 1]), ...Array.from({length: q.rows - 2}, (_, y) => [0, q.rows - 2 - y])];
        const inner = squaresOf(q).filter(([x, y]) => !rim.some(c => c[0] === x && c[1] === y));
        const candidates = n <= 10 ? shapes : [[...rim, ...inner].slice(0, n)];
        for (const cells of candidates) {
          const place = placements(q, cells).find(c => legal(q, c) && facts(c).fence !== q.best);
          if (place) { worse = place; break; }
        }
        if (!worse) for (const cells of shapes) { const place = placements(q, cells).find(c => legal(q, c) && facts(c).fence !== q.best); if (place) { worse = place; break; } }
      }
      if (!worse && q.mode === 'longest') {
        joinedSets(squares, n, cells => { if (!worse && enclosesPonds(q, cells) && facts(cells).fence !== q.best) worse = cells.map(c => [...c]); });
      }
      assert.ok(worse, `${p.id}: a garden that isn't the best`);
      const w = play(p, plantAll(p, fresh, worse), {type: 'claim'});
      assert.equal(w.board.told, {fewest: 'shorter', longest: 'longer', most: 'more'}[q.mode], `${p.id}: a wrong claim is told`);
      assert.equal(move(p, w, {type: 'claim'}), null, `${p.id}: change the garden before claiming again`);
      steps += hintsSolve(p, w, 'after a wrong claim');
      const b = plantAll(p, fresh, good[0]);
      assert.ok(isSolved(p, play(p, b, {type: 'claim'}).board), `${p.id}: the best garden solves`);
      assert.equal(validBoard(p, {...b.board, tiles: [...b.board.tiles].sort((x, y) => x - y), claimed: true}), true, `${p.id}: a claimed best garden is a valid save`);
      assert.equal(validBoard(p, {...w.board, told: null, claimed: true}), false, `${p.id}: a forged claim`);
      assert.equal(validBoard(p, {...b.board, told: 'shorter'}), false, `${p.id}: a forged answer`);
      claims++;
    }
    // Rules the moves keep.
    const pondIndex = (q.ponds || []).map(c => indexOf(q, c));
    for (const bad of [null, 'plant', {type: 'plant'}, {type: 'plant', cells: []}, {type: 'plant', cells: [-1]}, {type: 'plant', cells: [q.cols * q.rows]}, {type: 'plant', cells: [0, 0]}, {type: 'plant', cells: [1.5]}, {type: 'lift', cell: 0}, {type: 'carry', from: 0, to: 1}, {type: 'size', size: 4}, {type: 'fly'}, ...pondIndex.map(i => ({type: 'plant', cells: [i]}))]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
    if (n) {
      const free0 = squares.map(c => indexOf(q, c));
      assert.equal(move(p, fresh, {type: 'plant', cells: free0.slice(0, n + 1)}), null, `${p.id}: no more than ${n} tiles`);
      assert.equal(validBoard(p, {...fresh.board, tiles: free0.slice(0, n + 1)}), false, `${p.id}: too many tiles`);
      // Two pieces can't be claimed, and don't count.
      if (n >= 2 && q.mode !== 'target') {
        const apart = [free0[0], free0.at(-1), ...free0.slice(2, n)].slice(0, n);
        const two = play(p, fresh, {type: 'plant', cells: apart});
        if (!facts(apart.map(i => [i % q.cols, Math.floor(i / q.cols)])).joined) {
          assert.equal(move(p, two, {type: 'claim'}), null, `${p.id}: a garden in pieces can't be claimed`);
          if (two.board.found) assert.equal(two.board.found.length, 0, `${p.id}: a garden in pieces isn't found`);
        }
      }
      // A carry moves one tile to an empty square.
      const one = play(p, fresh, {type: 'plant', cells: [free0[0]]});
      assert.deepEqual(play(p, one, {type: 'carry', from: free0[0], to: free0[1]}).board.tiles, [free0[1]]);
      assert.equal(move(p, play(p, one, {type: 'plant', cells: [free0[1]]}), {type: 'carry', from: free0[0], to: free0[1]}), null, `${p.id}: no carrying onto a tile`);
    }
    if (q.mode !== 'every' && q.mode !== 'fences') assert.equal(move(p, plantAll(p, fresh, good[0].slice(0, 1)), {type: 'clear'}), null, `${p.id}: Clear only where gardens are collected`);
    assert.equal(validBoard(p, {...fresh.board, tiles: [3, 1]}), false, `${p.id}: unsorted tiles`);
    if (pondIndex.length) {
      assert.equal(validBoard(p, {...fresh.board, tiles: [pondIndex[0]]}), false, `${p.id}: a tile on the pond`);
      // The pond left open can't be claimed.
      const open = squares.slice(0, n);
      if (facts(open).joined && !enclosesPonds(q, open)) assert.equal(move(p, plantAll(p, fresh, open), {type: 'claim'}), null, `${p.id}: an open pond can't be claimed`);
    }
    // Hints, from fresh and from a messy board (tiles scattered from the far end).
    steps += hintsSolve(p, fresh, 'from fresh');
    const scattered = squares.slice().reverse().filter((_, i) => i % 3 === 0).slice(0, n || 6);
    steps += hintsSolve(p, plantAll(p, fresh, scattered), 'from a messy board');
  }
  return {fencesPuzzles: puzzles.length, shapesChecked: checked, plotSetsChecked: setsChecked, wrongClaims: claims, hintSteps: steps};
}
export default validateFences;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateFences(), null, 2));
