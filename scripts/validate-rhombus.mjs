// Checks the Rhombus gardens pack (dist/families/rhombus/rhombus.json) by
// methods separate from the mechanic's own: each board's triangles from a
// point-in-polygon test; filling counts from a determinant of the up-down
// adjacency matrix (Kasteleyn), MacMahon's product for hexagons and a
// separate enumeration; most rhombi by exhaustive search and fewest dots by
// trying every smaller set; chevron placements by turning the piece's
// centres; fewest flips from Thurston's height function. The answers are
// played as moves, hint chains must solve every puzzle from fresh and from
// trap boards, and illegal moves and forged saves are rejected.
// Run: node scripts/validate-rhombus.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {isExpansion} from '../dist/expansion.js';
import {gridOf, placements} from '../dist/tri-grid.js';
import {FLIP_LIMIT, PLAY_SIZES} from '../dist/families/rhombus/rhombus.js';
import {loadPack} from './packs.mjs';

/* ---------------- An independent triangle grid ---------------- */
const H = Math.sqrt(3) / 2;
const plane = ([u, v]) => [u + v / 2, H * v];
const cornersOf = ([u, v, s]) => s ? [[u + 1, v], [u + 1, v + 1], [u, v + 1]] : [[u, v], [u + 1, v], [u, v + 1]];
const key = c => c.join(',');
function inside(poly, [x, y]) {
  let odd = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < xj + (y - yj) * (xi - xj) / (yi - yj)) odd = !odd;
  }
  return odd;
}
// The board as the mechanic indexes it, after checking the triangle set.
function model(spec) {
  let mine;
  if (spec.cells) mine = spec.cells.map(c => [...c]);
  else {
    const poly = spec.outline.map(plane), us = spec.outline.map(p => p[0]), vs = spec.outline.map(p => p[1]);
    mine = [];
    for (let u = Math.min(...us) - Math.max(...vs) - 1; u <= Math.max(...us) - Math.min(...vs) + 1; u++)
      for (let v = Math.min(...vs) - 1; v <= Math.max(...vs) + 1; v++)
        for (const s of [0, 1]) {
          const pts = cornersOf([u, v, s]).map(plane), centre = [0, 1].map(k => pts.reduce((n, p) => n + p[k], 0) / 3);
          if (inside(poly, centre)) mine.push([u, v, s]);
        }
  }
  const g = gridOf(spec), cells = g.cells;
  assert.deepEqual(new Set(cells.map(key)), new Set(mine.map(key)), `the board's triangles: ${JSON.stringify(spec).slice(0, 60)}`);
  const n = cells.length, up = cells.map(c => !c[2]);
  const shared = (a, b) => cornersOf(a).filter(p => cornersOf(b).some(q => key(p) === key(q))).length;
  const nbr = cells.map((a, i) => cells.map((b, j) => j).filter(j => j !== i && shared(a, cells[j]) === 2));
  const edges = [];
  nbr.forEach((list, i) => list.forEach(j => { if (i < j) edges.push([i, j]); }));
  return {g, cells, n, up, nbr, edges};
}

/* ---------------- Counting and listing fillings ---------------- */
// |det| of the up-by-down adjacency matrix counts the rhombus fillings of a
// board without holes (Kasteleyn: every hexagon of the dual lattice has six
// sides, so no signs are needed). Fraction-free (Bareiss) in BigInt.
function determinant(rows) {
  const m = rows.map(r => r.map(BigInt)), n = m.length;
  let prev = 1n, sign = 1n;
  for (let k = 0; k < n - 1; k++) {
    if (m[k][k] === 0n) {
      const swap = m.findIndex((r, i) => i > k && r[k] !== 0n);
      if (swap < 0) return 0n;
      [m[k], m[swap]] = [m[swap], m[k]]; sign = -sign;
    }
    for (let i = k + 1; i < n; i++) for (let j = k + 1; j < n; j++) m[i][j] = (m[i][j] * m[k][k] - m[i][k] * m[k][j]) / prev;
    prev = m[k][k];
  }
  const d = sign * m[n - 1][n - 1];
  return d < 0n ? -d : d;
}
function kasteleyn(b) {
  const ups = b.cells.map((_, i) => i).filter(i => b.up[i]), downs = b.cells.map((_, i) => i).filter(i => !b.up[i]);
  if (ups.length !== downs.length) return 0;
  return Number(determinant(ups.map(u => downs.map(d => b.nbr[u].includes(d) ? 1 : 0))));
}
// Piles in an a × b × c box.
function macMahon(a, b, c) {
  let num = 1n, den = 1n;
  for (let i = 1; i <= a; i++) for (let j = 1; j <= b; j++) for (let k = 1; k <= c; k++) { num *= BigInt(i + j + k - 1); den *= BigInt(i + j + k - 2); }
  return Number(num / den);
}
// Every exact cover by a list of pieces (sets of cell indices).
function exactCovers(n, pieces, start = []) {
  const byCell = Array.from({length: n}, () => []);
  pieces.forEach(p => p.forEach(c => byCell[c].push(p)));
  const out = [], used = new Array(n).fill(false), chosen = [];
  start.forEach(p => { chosen.push(p); p.forEach(c => { used[c] = true; }); });
  (function go() {
    const first = used.indexOf(false);
    if (first < 0) { out.push([...chosen]); return; }
    for (const p of byCell[first]) {
      if (p.some(c => used[c])) continue;
      p.forEach(c => { used[c] = true; }); chosen.push(p);
      go();
      chosen.pop(); p.forEach(c => { used[c] = false; });
    }
  })();
  return out;
}
const sorted = p => [...p].sort((a, b) => a - b);
const pkey = p => sorted(p).join('.');
const tkey = t => t.map(pkey).sort().join(' ');

// Chevron places: the piece's triangle centres turned through the twelve
// symmetries of the grid (in grid coordinates), then slid across the board.
function chevronPlaces(b) {
  const base = [[0, 0, 0], [0, 0, 1], [0, 1, 0], [-1, 1, 1]].map(([u, v, s]) => [u + (s ? 2 : 1) / 3, v + (s ? 2 : 1) / 3]);
  const turn = ([a, c]) => [-c, a + c], flip = ([a, c]) => [c, a];
  const toCell = ([a, c]) => { const u = Math.floor(a + 1e-9), v = Math.floor(c + 1e-9), fa = a - u; return [u, v, fa > .5 ? 1 : 0]; };
  const index = new Map(b.cells.map((c, i) => [key(c), i])), seen = new Set(), out = [];
  for (const mirror of [false, true]) {
    let shape = mirror ? base.map(flip) : base;
    for (let r = 0; r < 6; r++, shape = shape.map(turn)) {
      const cells = shape.map(toCell);
      for (const [du, dv] of b.cells.map(([u, v]) => [u - cells[0][0], v - cells[0][1]])) {
        const placed = cells.map(([u, v, s]) => index.get(key([u + du, v + dv, s])));
        if (placed.some(i => i === undefined)) continue;
        const k = pkey(placed);
        if (!seen.has(k)) { seen.add(k); out.push(sorted(placed)); }
      }
    }
  }
  return out;
}

/* ---------------- Packing: most rhombi, fewest dots ---------------- */
function mostRhombi(b) {
  const memo = new Map();
  const best = mask => {
    if (memo.has(mask)) return memo.get(mask);
    let first = -1;
    for (let i = 0; i < b.n; i++) if (!(mask & (1 << i))) { first = i; break; }
    if (first < 0) return {count: 0, pieces: []};
    let top = best(mask | (1 << first));
    for (const j of b.nbr[first]) {
      if (mask & (1 << j)) continue;
      const rest = best(mask | (1 << first) | (1 << j));
      if (rest.count + 1 > top.count) top = {count: rest.count + 1, pieces: [[first, j], ...rest.pieces]};
    }
    memo.set(mask, top);
    return top;
  };
  return best(0);
}
function* subsets(n, size, from = 0) {
  if (size === 0) { yield []; return; }
  for (let i = from; i <= n - size; i++) for (const rest of subsets(n, size - 1, i + 1)) yield [i, ...rest];
}
const stopsAll = (b, dots) => { const set = new Set(dots); return b.edges.every(([x, y]) => set.has(x) || set.has(y)); };
const fewestDots = (b, size) => { for (const s of subsets(b.n, size)) if (stopsAll(b, s)) return s; return null; };
// Sets of rhombi with no room for another, grouped by size.
function stuckSizes(b) {
  const sizes = {};
  (function go(k, used, count) {
    if (k === b.edges.length) {
      if (b.edges.every(([x, y]) => used[x] || used[y])) sizes[count] = (sizes[count] || 0) + 1;
      return;
    }
    const [x, y] = b.edges[k];
    if (!used[x] && !used[y]) { used[x] = used[y] = true; go(k + 1, used, count + 1); used[x] = used[y] = false; }
    go(k + 1, used, count);
  })(0, new Array(b.n).fill(false), 0);
  return sizes;
}

/* ---------------- Heights (Thurston) ---------------- */
// Walking an edge of the grid in its positive direction (+u, -v, or -u+v)
// raises the height by 1 when a rhombus does not cross it and lowers it by 2
// when one does; a flip moves one point by 3, so the fewest flips between two
// fillings is the total height difference over 3.
function heights(b, tiling) {
  const partner = new Map();
  for (const [x, y] of tiling) { partner.set(x, y); partner.set(y, x); }
  const steps = new Map();
  b.cells.forEach((c, i) => {
    const [p, q, r] = cornersOf(c);
    for (const [s, t] of [[p, q], [q, r], [r, p]]) {
      const k = [key(s), key(t)].sort().join('|');
      if (!steps.has(k)) steps.set(k, {s, t, cells: []});
      steps.get(k).cells.push(i);
    }
  });
  const links = new Map();
  for (const {s, t, cells} of steps.values()) {
    const d = [t[0] - s[0], t[1] - s[1]], positive = (d[0] === 1 && d[1] === 0) || (d[0] === 0 && d[1] === -1) || (d[0] === -1 && d[1] === 1);
    const crossed = cells.length === 2 && partner.get(cells[0]) === cells[1];
    const rise = (crossed ? -2 : 1) * (positive ? 1 : -1);
    for (const [from, to, dh] of [[s, t, rise], [t, s, -rise]]) { if (!links.has(key(from))) links.set(key(from), []); links.get(key(from)).push([key(to), dh]); }
  }
  // Start from a point on the edge of the board, whose height no filling changes.
  const h = new Map(), start = key([...steps.values()].find(step => step.cells.length === 1).s);
  h.set(start, 0);
  const queue = [start];
  while (queue.length) {
    const at = queue.shift();
    for (const [to, dh] of links.get(at)) {
      if (!h.has(to)) { h.set(to, h.get(at) + dh); queue.push(to); }
      else assert.equal(h.get(to), h.get(at) + dh, 'heights agree around every triangle');
    }
  }
  return h;
}
const cubesBetween = (b, s, t) => { const hs = heights(b, s), ht = heights(b, t); let total = 0; for (const [k, v] of hs) total += Math.abs(v - ht.get(k)); assert.equal(total % 3, 0); return total / 3; };
const heightSum = (b, t) => [...heights(b, t).values()].reduce((n, v) => n + v, 0);
// The fillings with the lowest and highest heights: the empty box and the full one.
function extremes(b, tilings) {
  const sums = tilings.map(t => heightSum(b, t));
  return [tilings[sums.indexOf(Math.min(...sums))], tilings[sums.indexOf(Math.max(...sums))]];
}
const isExtreme = (b, tilings, t) => extremes(b, tilings).some(e => tkey(e) === tkey(t));

/* ---------------- Playing ---------------- */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label, limit = 400) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < limit; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
    a = play(p, a, hint.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const placeAll = (p, a, pieces) => pieces.reduce((b, piece) => play(p, b, {type: 'place', cells: sorted(piece)}), a);
// Flip by flip toward a goal, each flip chosen by height alone.
function flipToward(p, a, b, goal, limit) {
  let flips = 0;
  for (let left = cubesBetween(b, a.board.pieces, goal); left > 0; left--, flips++) {
    assert.ok(flips < limit, `${p.id}: within ${limit} flips`);
    const next = b.g.points.map((_, k) => move(p, a, {type: 'flip', at: k})).find(n => n && cubesBetween(b, n.board.pieces, goal) === left - 1);
    assert.ok(next, `${p.id}: some flip takes the height one cube closer (Thurston)`);
    a = next;
  }
  return {a, flips};
}

// The counts the grown-up notes state, checked here by the methods above.
const CLAIMS = {
  1: {fillings: 3, ups: 5},
  2: {best: 3, downsProve: true},
  3: {fillings: 3, leftSplit: [1, 2], box: [2, 1, 1]},
  4: {fillings: 1, deadFirst: 6, chevronFillings: 2},
  5: {best: 5, downsProve: true, stuck: {3: 3, 4: 12, 5: 5}},
  6: {best: 2, middleProve: true},
  7: {fillings: 6, box: [1, 2, 2], byCubes: [1, 1, 2, 1, 1]},
  8: {fewest: 4, box: [2, 2, 2], startsEmpty: true, mostFromStart: 8},
  9: {best: 8, stuck: {6: 193, 7: 154, 8: 9}},
  10: {chevronFillings: 2, chevronPlaces: 42, deadFirst: 30, rhombusFillings: 20, pairUp: [2]},
  11: {fillings: 20, box: [2, 2, 2], byCubes: [1, 1, 3, 3, 4, 3, 3, 1, 1]},
  12: {fewest: 8, box: [3, 3, 3], fillings: 980, piles: [6, 6], shared: 2, mostFromEmpty: 27}
};

export async function validateRhombus() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/rhombus/rhombus.json', import.meta.url), 'utf8'));
  const {puzzles: all, sources} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'rhombus');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), [ground] = pack.puzzles.filter(p => p.band === 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  let steps = 0, fillings = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'rhombus'); assert.ok(isExpansion(p));
    for (const k of ['title', 'instruction', 'objective', 'controls', 'idea', 'prerequisites', 'familyTitle', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} ${k}`);
    assert.ok(p.rules.length && p.rules.every(r => r.trim())); assert.equal(p.hints.length, 3);
    for (const k of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[k]?.trim(), `${p.id} parent.${k}`);
    for (const id of p.parent.sourceIds) assert.ok(sources.some(s => s.id === id), `${p.id} ${id}`);
  }

  for (const p of puzzles) {
    const q = p.parameters, claim = CLAIMS[p.number], b = model(q.board), shape = q.piece || 'rhombus';
    assert.equal(p.band, 'all'); assert.match(p.id, /^rhombus-\d\d$/);
    assert.ok(['fill', 'pack', 'every', 'flip'].includes(q.mode), `${p.id} mode`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: valid unsolved start`);
    // Rhombus places are neighbouring pairs; chevron places come from turning.
    assert.deepEqual(new Set(placements(b.g, 'rhombus').map(pkey)), new Set(b.edges.map(pkey)), `${p.id}: rhombus places`);
    const chevrons = chevronPlaces(b);
    assert.deepEqual(new Set(placements(b.g, 'chevron').map(pkey)), new Set(chevrons.map(pkey)), `${p.id}: chevron places`);
    const tilings = exactCovers(b.n, b.edges), count = kasteleyn(b);
    assert.equal(tilings.length, count, `${p.id}: listing and determinant agree`);
    if (claim.fillings !== undefined) assert.equal(count, claim.fillings, `${p.id}: fillings`);
    if (claim.rhombusFillings !== undefined) assert.equal(count, claim.rhombusFillings, `${p.id}: rhombus fillings`);
    if (claim.box) assert.equal(macMahon(...claim.box), count, `${p.id}: MacMahon's product`);
    if (claim.ups !== undefined) assert.equal(b.up.filter(Boolean).length, claim.ups, `${p.id}: up triangles`);
    if (claim.chevronFillings !== undefined) assert.equal(exactCovers(b.n, chevrons).length, claim.chevronFillings, `${p.id}: chevron fillings`);
    if (claim.chevronPlaces !== undefined) assert.equal(chevrons.length, claim.chevronPlaces, `${p.id}: chevron places`);
    if (claim.deadFirst !== undefined) {
      const fits = shape === 'chevron' ? chevrons : b.edges;
      assert.equal(fits.filter(piece => !exactCovers(b.n, fits, [piece]).length).length, claim.deadFirst, `${p.id}: dead first pieces`);
    }
    if (claim.pairUp) {
      // Rhombus fillings whose rhombi pair off into chevrons, and in how many ways.
      const chev = new Set(chevrons.map(pkey)), ways = tilings.map(t => {
        let n = 0;
        (function go(left) { if (!left.length) { n++; return; } const [x, ...rest] = left; rest.forEach((y, i) => { if (chev.has(pkey([...x, ...y]))) go(rest.filter((_, j) => j !== i)); }); })(t);
        return n;
      }).filter(Boolean);
      assert.deepEqual(ways, claim.pairUp, `${p.id}: fillings that pair into chevrons`);
    }
    if (claim.leftSplit) {
      const xs = b.cells.map(c => Math.min(...cornersOf(c).map(pt => plane(pt)[0]))), left = Math.min(...xs), ends = b.cells.map((_, i) => i).filter(i => xs[i] === left), [x, y] = ends;
      assert.equal(ends.length, 2, `${p.id}: two triangles at the left point`);
      const together = tilings.filter(t => t.some(piece => piece.includes(x) && piece.includes(y))).length;
      assert.deepEqual([together, tilings.length - together], claim.leftSplit, `${p.id}: the left point splits the list`);
    }
    if (claim.byCubes) {
      const [low] = extremes(b, tilings), counts = [];
      for (const t of tilings) { const c = cubesBetween(b, low, t); counts[c] = (counts[c] || 0) + 1; }
      assert.deepEqual(counts, claim.byCubes, `${p.id}: piles by size`);
    }

    if (q.mode === 'fill') {
      const fits = shape === 'chevron' ? chevrons : b.edges, answers = exactCovers(b.n, fits);
      assert.ok(answers.length, `${p.id}: can be filled`);
      for (const t of answers) assert.ok(isSolved(p, placeAll(p, fresh, t).board), `${p.id}: every filling solves it`);
      fillings += answers.length;
      steps += hintsSolve(p, fresh, 'from fresh');
      // A first piece in no filling: hints lift it and finish.
      const dead = fits.find(piece => !exactCovers(b.n, fits, [piece]).length);
      if (dead) steps += hintsSolve(p, placeAll(p, fresh, [dead]), 'after a dead first piece');
      if (shape === 'chevron') assert.equal(move(p, fresh, {type: 'place', cells: b.edges[0]}), null, `${p.id}: a rhombus is not a chevron`);
    }

    if (q.mode === 'pack') {
      const most = mostRhombi(b), dots = fewestDots(b, most.count);
      assert.equal(most.count, claim.best, `${p.id}: most rhombi`);
      assert.ok(most.count * 2 < b.n, `${p.id}: cannot be filled`);
      assert.equal(fewestDots(b, most.count - 1), null, `${p.id}: no ${most.count - 1} dots stop every rhombus`);
      assert.ok(dots, `${p.id}: ${most.count} dots stop every rhombus`);
      const downs = b.cells.map((_, i) => i).filter(i => !b.up[i]);
      if (claim.downsProve) assert.ok(downs.length === most.count && stopsAll(b, downs), `${p.id}: the down triangles prove it`);
      if (claim.middleProve) { const middle = b.cells.map((_, i) => i).filter(i => b.nbr[i].length === 3); assert.ok(middle.length === 2 && stopsAll(b, middle), `${p.id}: the two middle triangles prove it`); }
      if (claim.stuck) assert.deepEqual(stuckSizes(b), claim.stuck, `${p.id}: stuck sets by size`);
      // The search's rhombi and dots, played: one dot short is not solved.
      let a = placeAll(p, fresh, most.pieces);
      for (const d of dots.slice(0, -1)) a = play(p, a, {type: 'dot', cell: d});
      assert.ok(!isSolved(p, a.board), `${p.id}: one dot short`);
      a = play(p, a, {type: 'dot', cell: dots.at(-1)});
      assert.ok(isSolved(p, a.board), `${p.id}: most rhombi and fewest dots solve it`);
      assert.equal(move(p, a, {type: 'dot', cell: dots[0]}), null, `${p.id}: no moves after a solve`);
      // Equal counts of rhombi and dots, but a rhombus still fits without a dot.
      const short = placeAll(p, fresh, most.pieces.slice(0, -1)), wrongDots = [...b.cells.keys()].filter(i => b.up[i]).slice(0, most.count - 1);
      const loose = wrongDots.reduce((x, d) => play(p, x, {type: 'dot', cell: d}), short);
      assert.ok(!stopsAll(b, wrongDots) && !isSolved(p, loose.board), `${p.id}: matching counts alone do not solve it`);
      steps += hintsSolve(p, fresh, 'from fresh');
      steps += hintsSolve(p, loose, 'from wrong dots');
      // Stuck below the most: hints lift and finish.
      const stuck = [];
      for (const [x, y] of [...b.edges].reverse()) if (!stuck.flat().includes(x) && !stuck.flat().includes(y)) stuck.push([x, y]);
      if (stuck.length < most.count) steps += hintsSolve(p, placeAll(p, fresh, stuck), 'from a stuck board');
      assert.equal(move(p, fresh, {type: 'flip', at: 0}), null, `${p.id}: no flips`);
      assert.equal(move(p, fresh, {type: 'dot', cell: b.n}), null, `${p.id}: no dot off the board`);
    }

    if (q.mode === 'every') {
      assert.ok(tilings.length >= 2, `${p.id}: more than one filling`);
      // Every filling, built or flipped to, then That's all.
      let a = fresh;
      if (q.flips) assert.ok(isExtreme(b, tilings, q.start), `${p.id}: starts at the empty corner`);
      else assert.equal(fresh.board.pieces.length, 0);
      const early = play(p, a, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: That's all too soon is not solved`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: no second That's all until something changes`);
      for (const t of tilings) {
        if (a.board.found.includes(tkey(t))) continue;
        if (a.board.pieces.length) a = play(p, a, {type: 'clear'});
        a = placeAll(p, a, t);
      }
      assert.equal(a.board.found.length, tilings.length);
      assert.ok(!isSolved(p, a.board), `${p.id}: found them all but not yet claimed`);
      assert.ok(isSolved(p, play(p, a, {type: 'claim'}).board), `${p.id}: every filling and That's all`);
      steps += hintsSolve(p, fresh, 'from fresh');
      steps += hintsSolve(p, early, 'after That’s all too soon');
      // A filling found twice counts once.
      const once = placeAll(p, fresh.board.pieces.length ? play(p, fresh, {type: 'clear'}) : fresh, tilings[0]);
      const twice = placeAll(p, play(p, once, {type: 'clear'}), tilings[0]);
      assert.equal(twice.board.found.length, once.board.found.length, `${p.id}: a filling is found once`);
      if (!q.flips) assert.ok(b.g.points.every((_, k) => move(p, once, {type: 'flip', at: k}) === null), `${p.id}: flips are off`);
      // Forged saves.
      const keys = tilings.map(tkey);
      assert.equal(validBoard(p, {...fresh.board, found: [keys[0], keys[0]]}), false, `${p.id}: a filling twice`);
      assert.equal(validBoard(p, {...fresh.board, found: [keys[0].replace(/^\d+/, '99')]}), false, `${p.id}: a found entry that is not a filling`);
      assert.equal(validBoard(p, {...fresh.board, found: q.flips ? fresh.board.found : [], claimed: true}), false, `${p.id}: claimed with some missing`);
      assert.equal(validBoard(p, {...a.board, missed: true}), false, `${p.id}: missed with all found`);
      assert.equal(validBoard(p, {...a.board, pieces: tilings[0], found: keys.filter(k => k !== tkey(tilings[0]))}), false, `${p.id}: a full board not in the list`);
    }

    if (q.mode === 'flip') {
      const fewest = cubesBetween(b, q.start, q.goal);
      assert.equal(fewest, claim.fewest, `${p.id}: fewest flips by heights`);
      assert.equal(q.budget, fewest, `${p.id}: the budget is the fewest`);
      assert.ok(tilings.some(t => tkey(t) === tkey(q.start)) && tilings.some(t => tkey(t) === tkey(q.goal)), `${p.id}: start and goal are fillings`);
      const [low, high] = extremes(b, tilings);
      if (claim.startsEmpty) assert.ok(isExtreme(b, tilings, q.start), `${p.id}: starts at the empty corner`);
      if (claim.mostFromStart !== undefined) assert.equal(Math.max(...tilings.map(t => cubesBetween(b, q.start, t))), claim.mostFromStart, `${p.id}: farthest from the start`);
      if (claim.mostFromEmpty !== undefined) assert.equal(cubesBetween(b, low, high), claim.mostFromEmpty, `${p.id}: empty box to full`);
      if (claim.piles) {
        // Measured from the empty box (one of the two extremes): both piles
        // have six cubes and share two, so four go and four come.
        const fits = [low, high].filter(e => cubesBetween(b, e, q.start) === claim.piles[0] && cubesBetween(b, e, q.goal) === claim.piles[1]);
        assert.equal(fits.length, 1, `${p.id}: pile sizes`);
        assert.equal((claim.piles[0] + claim.piles[1] - fewest) / 2, claim.shared, `${p.id}: cubes in both piles`);
      }
      const {a, flips} = flipToward(p, fresh, b, q.goal, q.budget + 1);
      assert.ok(flips === fewest && isSolved(p, a.board), `${p.id}: height-guided flips solve it in ${fewest}`);
      assert.equal(move(p, a, {type: 'flip', at: 0}), null, `${p.id}: no moves after a solve`);
      steps += hintsSolve(p, fresh, 'from fresh');
      // Wandering off: once a flip goes away from the goal, the flips left are
      // too few, so hints say Start again and then finish.
      const left = a => a.board.flips + cubesBetween(b, a.board.pieces, q.goal);
      let away = fresh;
      while (left(away) <= q.budget) {
        assert.ok(away.board.flips < 4, `${p.id}: a wrong flip within four`);
        const options = b.g.points.map((_, k) => move(p, away, {type: 'flip', at: k})).filter(Boolean), d = cubesBetween(b, away.board.pieces, q.goal);
        away = options.find(n => cubesBetween(b, n.board.pieces, q.goal) > d) || options[0];
      }
      assert.equal(nextHint(p, away).action.type, 'again', `${p.id}: a wasted flip hints Start again`);
      steps += hintsSolve(p, away, 'after a wasted flip');
      assert.ok(!isSolved(p, flipToward(p, away, b, q.goal, 99).a.board), `${p.id}: reaching ⚑ over budget does not solve it`);
      for (const bad of [{type: 'place', cells: b.edges[0]}, {type: 'lift', cell: 0}, {type: 'dot', cell: 0}, {type: 'claim'}, {type: 'clear'}, {type: 'again'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      // Forged saves: counts that the heights rule out.
      assert.equal(validBoard(p, {...fresh.board, pieces: q.goal, flips: fewest - 1}), false, `${p.id}: fewer flips than the heights allow`);
      assert.equal(validBoard(p, {...fresh.board, pieces: q.goal, flips: fewest + 1}), false, `${p.id}: the wrong parity`);
      assert.equal(validBoard(p, {...fresh.board, pieces: q.goal, flips: fewest + 2}), true, `${p.id}: two extra flips are possible`);
      assert.equal(validBoard(p, {...fresh.board, flips: FLIP_LIMIT + 1}), false, `${p.id}: past the flip limit`);
      assert.equal(validBoard(p, {...fresh.board, pieces: q.start.slice(1)}), false, `${p.id}: a gap`);
    } else {
      assert.equal(validBoard(p, {...fresh.board, flips: 2}), false, `${p.id}: flips outside a flip puzzle`);
    }

    // Moves and saves every mode rejects.
    const [e0] = b.edges, far = b.cells.findIndex((_, j) => j !== e0[0] && !b.nbr[e0[0]].includes(j));
    if (q.mode !== 'flip') {
      const one = play(p, fresh.board.pieces.length ? play(p, fresh, {type: 'clear'}) : fresh, {type: 'place', cells: shape === 'chevron' ? chevrons[0] : e0});
      for (const bad of [null, 'place', {type: 'place'}, {type: 'place', cells: [e0[0]]}, {type: 'place', cells: [e0[0], far]}, {type: 'place', cells: [e0[0], e0[1], far]}, {type: 'place', cells: [-1, 0]}, {type: 'lift', cell: b.n}, {type: 'again'}, {type: 'fly'}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);
      assert.equal(move(p, one, {type: 'place', cells: shape === 'chevron' ? chevrons[0] : e0}), null, `${p.id}: no piece on a piece`);
      assert.equal(play(p, one, {type: 'lift', cell: one.board.pieces[0][0]}).board.pieces.length, one.board.pieces.length - 1, `${p.id}: tapping a piece lifts it`);
      if (q.mode !== 'pack') assert.equal(move(p, fresh, {type: 'dot', cell: 0}), null, `${p.id}: no dots`);
      if (q.mode !== 'every') assert.equal(move(p, one, {type: 'claim'}), null, `${p.id}: no That's all`);
    }
    assert.equal(validBoard(p, {...fresh.board, pieces: [[e0[0], far]]}), false, `${p.id}: a piece that is not a rhombus`);
    assert.equal(validBoard(p, {...fresh.board, pieces: [e0, e0]}), false, `${p.id}: two pieces on one place`);
    if (q.mode !== 'pack') assert.equal(validBoard(p, {...fresh.board, dots: [0]}), false, `${p.id}: dots outside a dot puzzle`);
    else assert.equal(validBoard(p, {...fresh.board, dots: [0, 0]}), false, `${p.id}: a dot twice`);
    if (q.mode !== 'every') assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: That's all outside a listing puzzle`);
  }

  // The playground: each hexagon starts as an empty box, and filling it takes one flip per cube.
  const fresh = freshAttempt(ground);
  assert.ok(validBoard(ground, fresh.board) && !isSolved(ground, fresh.board));
  const piles = {};
  for (const size of PLAY_SIZES) {
    const a = size === fresh.board.size ? fresh : play(ground, fresh, {type: 'size', size}), b = model({outline: hexagonOf(size), turn: true});
    assert.equal(a.board.pieces.flat().length, b.n, `size ${size}: full`);
    // Every flip from the empty box goes the same way (it is an extreme), and
    // climbing one cube at a time reaches the full box in size³ flips.
    const here = heightSum(b, a.board.pieces), ways = new Set(b.g.points.map((_, k) => move(ground, a, {type: 'flip', at: k})).filter(Boolean).map(n => Math.sign(heightSum(b, n.board.pieces) - here)));
    assert.equal(ways.size, 1, `size ${size}: an empty box`);
    const base = heights(b, a.board.pieces), from = t => { const h = heights(b, t); let n = 0; for (const [k, v] of base) n += Math.abs(v - h.get(k)); return n / 3; };
    let at = a, flips = 0;
    for (;;) {
      const up = b.g.points.map((_, k) => move(ground, at, {type: 'flip', at: k})).find(n => n && from(n.board.pieces) === flips + 1);
      if (!up) break;
      at = up; flips++;
    }
    assert.equal(flips, size ** 3, `size ${size}: one flip per cube`);
    piles[size] = macMahon(size, size, size);
    assert.equal(move(ground, a, {type: 'size', size}), null, `size ${size}: an empty box stays empty`);
    assert.equal(tkey(move(ground, at, {type: 'size', size}).board.pieces), tkey(a.board.pieces), `size ${size}: pressing it again empties the box`);
  }
  assert.equal(piles[4], 232848, 'the biggest box has 232,848 piles');
  assert.match(ground.parent.explanation, /232,848/);
  assert.equal(move(ground, fresh, {type: 'size', size: 5}), null, 'no hexagon of side 5');
  assert.equal(validBoard(ground, {size: 5, pieces: []}), false, 'a forged size');
  assert.equal(validBoard(ground, {size: 2, pieces: fresh.board.pieces}), false, 'pieces from another hexagon');
  assert.equal(nextHint(ground, fresh).type, 'done', 'the playground gives no hints');
  return {rhombusPuzzles: puzzles.length, fillingsPlayed: fillings, sources: pack.sources.length, hintSteps: steps};
}

// The hexagon with all sides n, as rhombus.js draws the playground.
function hexagonOf(n) {
  const out = [[0, 0]];
  let p = [0, 0];
  for (const [du, dv] of [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1]]) { p = [p[0] + du * n, p[1] + dv * n]; out.push(p); }
  return out;
}
export default validateRhombus;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRhombus(), null, 2));
