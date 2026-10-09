// Checks the Week 1 encore groups of Rhombus gardens
// (dist/families/blocks/blocks.json) by methods separate from the
// mechanics' own: each board's triangles from a point-in-polygon test;
// piece places by turning the pieces' triangle centres; who wins the duel by
// a plain win-or-lose search with no shared code; the half turn and its
// centre from the board's own centre of mass; fewest blocks by a memoised
// search over covered triangles (and, on the hexagon of side 3, by the
// hexagon-count argument with every seven-hexagon packing); trapezoid
// fillings by counting covers; kinds by up and down triangles; re-cuts by
// finding hexagons as six triangles round one point. Then the puzzles are
// played: hint chains from fresh and from traps, the app's replies against
// random play, Can't, That's all, re-cuts, illegal moves and forged saves.
// Run: node scripts/validate-blocks.mjs
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {gridOf} from '../dist/tri-grid.js';
import {loadPack} from './packs.mjs';

/* ---------------- An independent triangle grid ---------------- */
const H = Math.sqrt(3) / 2;
const plane = ([u, v]) => [u + v / 2, H * v];
const cornersOf = ([u, v, s]) => s ? [[u + 1, v], [u + 1, v + 1], [u, v + 1]] : [[u, v], [u + 1, v], [u, v + 1]];
const centreOf = c => { const pts = cornersOf(c).map(plane); return [0, 1].map(k => pts.reduce((n, p) => n + p[k], 0) / 3); };
const key = c => c.join(',');
const at = ([x, y]) => `${Math.round(x * 600)},${Math.round(y * 600)}`;
function inside(poly, [x, y]) {
  let odd = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < xj + (y - yj) * (xi - xj) / (yi - yj)) odd = !odd;
  }
  return odd;
}
// The board as the mechanic numbers it, after checking its triangles.
const models = new Map();
function model(spec) {
  const id = JSON.stringify(spec);
  if (models.has(id)) return models.get(id);
  const poly = spec.outline.map(plane), us = spec.outline.map(p => p[0]), vs = spec.outline.map(p => p[1]), mine = [];
  for (let u = Math.min(...us) - Math.max(...vs) - 1; u <= Math.max(...us) - Math.min(...vs) + 1; u++)
    for (let v = Math.min(...vs) - 1; v <= Math.max(...vs) + 1; v++)
      for (const s of [0, 1]) if (inside(poly, centreOf([u, v, s]))) mine.push([u, v, s]);
  const cells = gridOf(spec).cells;
  assert.deepEqual(new Set(cells.map(key)), new Set(mine.map(key)), `the board's triangles: ${id.slice(0, 60)}`);
  const centres = cells.map(centreOf), where = new Map(centres.map((c, i) => [at(c), i]));
  const m = {cells, n: cells.length, up: cells.map(c => !c[2]), centres, where};
  models.set(id, m);
  return m;
}
// Pieces as triangle centres round the origin; every turn of a piece is
// moved so that each of its triangles lands on each board triangle.
const SHAPE = {
  triangle: [[0, 0, 0]],
  rhombus: [[0, 0, 0], [0, 0, 1]],
  trapezoid: [[0, 0, 0], [0, 0, 1], [1, 0, 0]],
  hexagon: [[0, 0, 0], [-1, 0, 1], [-1, 0, 0], [-1, -1, 1], [0, -1, 0], [0, -1, 1]]
};
function places(m, shape) {
  const base = SHAPE[shape].map(centreOf), out = new Map();
  for (let t = 0; t < 6; t++) {
    const a = t * Math.PI / 3, turned = base.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]);
    for (const [cx, cy] of m.centres) {
      const [dx, dy] = [cx - turned[0][0], cy - turned[0][1]];
      const idx = turned.map(([x, y]) => m.where.get(at([x + dx, y + dy])));
      if (idx.every(i => i !== undefined)) { const s = idx.sort((p, q) => p - q); out.set(s.join('.'), s); }
    }
  }
  return [...out.values()];
}
const mask = cells => cells.reduce((b, c) => b | (1n << BigInt(c)), 0n);

/* ---------------- The duel ---------------- */
function duelFacts(m) {
  const spots = places(m, 'rhombus'), masks = spots.map(mask), memo = new Map();
  const win = taken => {
    if (memo.has(taken)) return memo.get(taken);
    const r = masks.some(x => !(taken & x) && !win(taken | x));
    memo.set(taken, r);
    return r;
  };
  const winning = spots.filter((_, i) => !win(masks[i]));
  // The half turn about the centre of mass, and where that centre lies.
  const c = [0, 1].map(k => m.centres.reduce((n, p) => n + p[k], 0) / m.n);
  const turn = m.centres.map(([x, y]) => m.where.get(at([2 * c[0] - x, 2 * c[1] - y])));
  const symmetric = turn.every(i => i !== undefined);
  const lattice = ([x, y]) => { const v = y / H, u = x - v / 2; return Math.abs(u - Math.round(u)) < 1e-6 && Math.abs(v - Math.round(v)) < 1e-6; };
  const centre = !symmetric ? null : lattice(c) ? 'point' : lattice([2 * c[0], 2 * c[1]]) ? 'edge' : 'cell';
  return {spots, win, masks, winner: win(0n) ? 'first' : 'second', winning, turn: symmetric ? turn : null, centre};
}

/* ---------------- Fewest blocks ---------------- */
const BLOCKS = ['triangle', 'rhombus', 'trapezoid', 'hexagon'];
function fewestFacts(m) {
  const all = BLOCKS.flatMap(s => places(m, s)), full = (1n << BigInt(m.n)) - 1n;
  const starts = m.cells.map(() => []);
  for (const p of all) starts[p[0]].push(mask(p));
  // fewest(taken) over fillings of the rest, branching on the first empty triangle.
  const memo = new Map();
  const fewest = taken => {
    if (taken === full) return 0;
    if (memo.has(taken)) return memo.get(taken);
    let i = 0;
    while (taken & (1n << BigInt(i))) i++;
    let best = Infinity;
    for (const x of starts[i]) if (!(taken & x)) best = Math.min(best, 1 + fewest(taken | x));
    memo.set(taken, best);
    return best;
  };
  const count = (taken, left) => {
    if (taken === full) return left === 0 ? 1 : 0;
    if (left <= 0) return 0;
    let i = 0, n = 0;
    while (taken & (1n << BigInt(i))) i++;
    for (const x of starts[i]) if (!(taken & x) && 1 + fewest(taken | x) <= left) n += count(taken | x, left - 1);
    return n;
  };
  return {fewest, count, hexes: places(m, 'hexagon')};
}
// Every packing of hexagons that cannot take one more, by size.
function hexPackings(hexes) {
  const out = [];
  (function rec(i, chosen, taken) {
    let more = false;
    for (let j = 0; j < hexes.length; j++) if (!hexes[j].some(c => taken.has(c))) { more = true; if (j >= i) { hexes[j].forEach(c => taken.add(c)); chosen.push(hexes[j]); rec(j + 1, chosen, taken); chosen.pop(); hexes[j].forEach(c => taken.delete(c)); } }
    if (!more) out.push([...chosen]);
  })(0, [], new Set());
  return out;
}

/* ---------------- Red trapezoids ---------------- */
function redFacts(m) {
  const reds = places(m, 'trapezoid'), full = (1n << BigInt(m.n)) - 1n, starts = m.cells.map(() => []);
  for (const p of reds) starts[p[0]].push(p);
  const list = [];
  (function rec(taken, chosen) {
    if (taken === full) { list.push(chosen.map(p => [...p])); return; }
    let i = 0;
    while (taken & (1n << BigInt(i))) i++;
    for (const p of starts[i]) { const x = mask(p); if (!(taken & x)) { chosen.push(p); rec(taken | x, chosen); chosen.pop(); } }
  })(0n, []);
  const down = p => p.filter(c => !m.up[c]).length === 2;
  const kinds = t => [t.filter(p => !down(p)).length, t.filter(down).length];
  const ups = m.up.filter(Boolean).length;
  return {list, kinds, ups, downs: m.n - ups};
}
const tkey = t => t.map(p => p.join('.')).sort().join(' ');
// Two trapezoids make a hexagon when their six triangles all sit at the same
// distance from one point; its other cuts are the other ways to cover it.
function recuts(m, t) {
  const out = [], reds = places(m, 'trapezoid');
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) {
    const six = [...t[i], ...t[j]], c = [0, 1].map(k => six.reduce((n, x) => n + m.centres[x][k], 0) / 6);
    if (!six.every(x => Math.abs(Math.hypot(m.centres[x][0] - c[0], m.centres[x][1] - c[1]) - 1 / Math.sqrt(3)) < 1e-6)) continue;
    const set = new Set(six), inner = reds.filter(p => p.every(x => set.has(x)));
    for (const a of inner) for (const b of inner) if (a[0] < b[0] && !a.some(x => b.includes(x)) && tkey([a, b]) !== tkey([t[i], t[j]])) out.push([...t.filter((_, k) => k !== i && k !== j), a, b]);
  }
  return out;
}

/* ---------------- Playing the puzzles ---------------- */
let seed = 11;
const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
const play = (p, a, action) => { const next = move(p, a, action, random); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function byHints(p, a, limit = 400) {
  let steps = 0;
  while (!isSolved(p, a.board)) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${p.id}: hint ${hint.text}`);
    a = play(p, a, hint.action);
    assert.ok(++steps < limit, `${p.id}: hints finish`);
  }
  return steps;
}
const withBoard = (p, board) => ({...freshAttempt(p), board});

export async function validateBlocks() {
  const pack = await loadPack(), puzzles = pack.puzzles.filter(p => ['blueduel', 'blockfill', 'redfill'].includes(p.mechanic));
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(puzzles.length, 26);
  let hintSteps = 0, randomGames = 0, positions = 0;
  for (const p of puzzles) {
    assert.equal(p.libraryFamily, 'rhombus'); assert.equal(p.familyTitle, 'Rhombus gardens'); assert.equal(p.band, 'all');
    assert.equal(p.hints.length, 3); assert.ok(p.parent.sourceIds.every(id => ids.has(id)), `${p.id}: sources`);
    const a = freshAttempt(p, random);
    assert.ok(validBoard(p, a.board) && !isSolved(p, a.board), `${p.id}: starts valid and unsolved`);
    hintSteps += byHints(p, a);
  }
  const group = mech => puzzles.filter(p => p.mechanic === mech);
  assert.deepEqual(['blueduel', 'blockfill', 'redfill'].map(mech => group(mech).map(p => p.number)), [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7, 8]]);

  /* The duel: who wins, how many first rhombi win, the centre, the notes. */
  const DUEL = {
    1: ['second', 'point', 6, 0], 2: ['first', 'edge', 5, 1], 3: ['second', 'point', 8, 0], 4: ['first', 'edge', 11, 1], 5: ['first', 'edge', 13, 1], 6: ['second', 'point', 18, 0],
    7: ['second', 'point', 30, 0], 8: ['first', 'edge', 21, 7], 9: ['second', null, 18, 0], 10: ['first', 'edge', 27, 1], 11: ['first', 'edge', 23, 5]
  };
  for (const p of group('blueduel')) {
    const m = model(p.parameters.board), f = duelFacts(m), [winner, centre, firsts, wins] = DUEL[p.number];
    assert.deepEqual([f.winner, f.centre, f.spots.length, f.winning.length], [winner, centre, firsts, wins], `${p.id}: the duel`);
    positions += f.masks.length;
    const copy = s => s.map(c => f.turn[c]).sort((x, y) => x - y).join('.');
    if (centre === 'point') assert.ok(f.spots.every(s => !s.some(c => s.includes(f.turn[c]))), `${p.id}: no rhombus meets its copy`);
    if (centre === 'edge') assert.equal(f.spots.filter(s => copy(s) === s.join('.')).length, 1, `${p.id}: one rhombus is its own copy`);
    if (centre === 'edge') assert.ok(f.winning.some(s => copy(s) === s.join('.')), `${p.id}: the middle rhombus wins`);
    if (winner === 'first') assert.match(p.parent.explanation, /first/); else assert.match(p.parent.explanation, /second/);
    // The app wins every game from the losing side against random play, and
    // copies whenever the child leaves it a copying win.
    const losing = winner === 'first' ? 'app' : 'you';
    for (let game = 0; game < 25; game++) {
      let a = play(p, freshAttempt(p), {type: 'choose', first: losing});
      while (!isSolved(p, a.board)) {
        const open = f.spots.filter(s => !s.some(c => a.board.pieces.flat().includes(c)));
        if (!open.length) break;
        const pick = open[Math.floor(random() * open.length)];
        a = play(p, a, {type: 'place', cells: pick});
        const last = a.board.pieces.at(-1);
        if (centre === 'point' && losing === 'you' && a.board.pieces.length % 2 === 0) assert.equal(last.join('.'), copy(pick), `${p.id}: the app copies`);
      }
      assert.ok(!isSolved(p, a.board), `${p.id}: the losing side cannot win against the app`);
      randomGames++;
      // After the app wins, Play again starts over.
      assert.deepEqual(play(p, a, {type: 'again'}).board, {first: null, pieces: []});
    }
    // Forged saves.
    const g = gridOf(p.parameters.board), first = f.spots[0];
    assert.equal(validBoard(p, {first: null, pieces: [first]}), false, `${p.id}: pieces before a choice`);
    assert.equal(validBoard(p, {first: 'you', pieces: [first]}), false, `${p.id}: a save at the app's turn`);
    assert.equal(validBoard(p, {first: 'you', pieces: [[0, 1, 2]]}), false, `${p.id}: not a rhombus`);
    if (wins === 0) {
      // The child went first; the app answered with a losing rhombus although copying won.
      const child = f.spots[0], bad = f.spots.find(s => !s.some(c => child.includes(c)) && f.win(mask(child) | mask(s)));
      if (bad) assert.equal(validBoard(p, {first: 'you', pieces: [child, bad]}), false, `${p.id}: the app never passes up a win`);
    }
    assert.equal(move(p, freshAttempt(p), {type: 'place', cells: first}), null, `${p.id}: no rhombus before choosing`);
    assert.equal(move(p, freshAttempt(p), {type: 'choose', first: 'both'}), null);
    assert.ok(g.cells.length <= 30);
  }

  /* Fewest blocks: the fewest, how many fillings reach it, and the traps. */
  const FEWEST = {1: [3, 2], 2: [6, 65], 3: [5, 1], 4: [5, 3], 5: [6, 2], 6: [9, 2], 7: [12, 2]};
  const TRAP = {1: [4], 2: [7], 3: [5, 6, 6], 4: [5, 5, 5], 5: [6, 6], 6: [10]};
  for (const p of group('blockfill')) {
    const m = model(p.parameters.board), f = fewestFacts(m), [best, ways] = FEWEST[p.number];
    assert.equal(p.parameters.budget, best);
    const packings = hexPackings(f.hexes), most = Math.max(...packings.map(x => x.length));
    if (m.n <= 36) {
      assert.equal(f.fewest(0n), best, `${p.id}: fewest`);
      assert.equal(f.count(0n, best), ways, `${p.id}: fewest fillings`);
      // With the most hexagons in, the best that follows (per packing).
      const afterMost = packings.filter(x => x.length === most).map(pk => f.fewest(mask(pk.flat())) + most).sort((x, y) => x - y);
      assert.deepEqual(afterMost, TRAP[p.number], `${p.id}: the most hexagons`);
    } else {
      // The hexagon of side 3: h hexagons leave 54 − 6h triangles for blocks of
      // at most three, so h ≤ 6 needs at least 18 − h ≥ 12; every packing of
      // seven needs more than 12; and a filling with 12 exists.
      assert.equal(most, 7);
      const seven = packings.filter(x => x.length === 7);
      assert.equal(seven.length, 2);
      for (const pk of seven) assert.ok(f.fewest(mask(pk.flat())) + 7 > 12, `${p.id}: seven hexagons give more than 12`);
      assert.deepEqual(seven.map(pk => f.fewest(mask(pk.flat())) + 7).sort((x, y) => x - y), [13, 19]);
      for (let h = 0; h <= 6; h++) assert.ok(h + Math.ceil((54 - 6 * h) / 3) >= 12);
      const filling = nextHint(p, freshAttempt(p));
      assert.equal(filling.type, 'move');
      assert.equal(byHints(p, freshAttempt(p)), 12, `${p.id}: hints fill it with twelve`);
    }
    if (p.number === 1 || p.number === 2) assert.equal(f.fewest(mask(f.hexes[0])) + 1, best + 1, `${p.id}: the hexagon costs one`);
    // Over budget is not a solve; a filling that keeps the trap is lifted by hints.
    const g = gridOf(p.parameters.board), triangles = g.cells.map((_, i) => [i]);
    const greens = withBoard(p, {pieces: triangles});
    assert.ok(validBoard(p, greens.board) && !isSolved(p, greens.board), `${p.id}: all triangles is over budget`);
    hintSteps += byHints(p, greens, 200);
    hintSteps += byHints(p, withBoard(p, {pieces: packings.find(x => x.length === most)}), 200);
    assert.equal(move(p, freshAttempt(p), {type: 'place', cells: [0, 1, 2, 3]}), null, `${p.id}: no four-triangle block`);
    assert.equal(validBoard(p, {pieces: [[0], [0]]}), false, `${p.id}: overlapping blocks`);
  }

  /* Red trapezoids: fillings, kinds by counting, Can't, every way, re-cuts. */
  const RED = {1: [3, [2, 2]], 2: [5, [4, 1]], 3: [0, null], 4: [2, [3, 0]], 5: [9, [4, 4]], 6: [9, [4, 4]], 7: [220, [9, 3]], 8: [220, [9, 3]]};
  let recutsChecked = 0;
  for (const p of group('redfill')) {
    const q = p.parameters, m = model(q.board), f = redFacts(m), [count, kinds] = RED[p.number];
    assert.equal(f.list.length, count, `${p.id}: fillings`);
    for (const t of f.list) assert.deepEqual(f.kinds(t), kinds, `${p.id}: every filling has the same kinds`);
    if (kinds) assert.deepEqual([kinds[0] - kinds[1], kinds[0] + kinds[1]], [f.ups - f.downs, m.n / 3], `${p.id}: the count argument`);
    else assert.notEqual(m.n % 3, 0, `${p.id}: the triangle count rules trapezoids out`);
    const possible = count > 0 && (q.mode !== 'kind' || kinds[1] === q.down);
    if (q.mode === 'fill' || q.mode === 'kind') {
      const fresh = freshAttempt(p), claimed = move(p, fresh, {type: 'cant'});
      assert.equal(isSolved(p, claimed.board), !possible, `${p.id}: Can't`);
      if (possible) { assert.equal(claimed.board.refused, true); assert.equal(move(p, claimed, {type: 'cant'}), null, `${p.id}: Can't waits for a change`); }
      assert.equal(validBoard(p, {pieces: [], cant: possible, refused: !possible}), false, `${p.id}: a forged Can't or refusal`);
    }
    if (q.mode === 'every') {
      let a = freshAttempt(p);
      for (const piece of f.list[0]) a = play(p, a, {type: 'place', cells: piece});
      a = play(p, a, {type: 'claim'});
      assert.equal(a.board.missed, true, `${p.id}: That's all too soon`);
      const undone = {...a, board: mechanicCarry(p, a.board, {...a.board, pieces: a.board.pieces.slice(0, -1), found: []})};
      assert.deepEqual(undone.board.found, a.board.found, `${p.id}: Undo keeps the fillings found`);
      assert.equal(validBoard(p, {pieces: [], found: [tkey(f.list[0]), tkey(f.list[0])], claimed: false, missed: false}), false);
    }
    if (q.mode === 'home') {
      // Breadth-first over fillings with the parity of the moves: the
      // shortest odd way back is three, and re-cuts never change the ring.
      const start = q.start, seen = new Map([[`${tkey(start)}|0`, 0]]), queue = [[start, 0]];
      for (let i = 0; i < queue.length; i++) {
        const [t, par] = queue[i];
        for (const next of recuts(m, t)) { const k = `${tkey(next)}|${par ^ 1}`; if (!seen.has(k)) { seen.set(k, seen.get(`${tkey(t)}|${par}`) + 1); queue.push([next, par ^ 1]); } recutsChecked++; }
      }
      assert.equal(seen.get(`${tkey(start)}|1`), 3, `${p.id}: odd way home`);
      assert.equal(new Set([...seen.keys()].map(k => k.split('|')[0])).size, 3, `${p.id}: re-cuts reach the three middles of one ring`);
      // The middle pair is the one that every re-cut replaces; the rest is the ring.
      const ring = start.filter(piece => recuts(m, start).every(t => t.some(x => x.join() === piece.join()))), pairs = [];
      for (let i = 0; i < ring.length; i++) for (let j = i + 1; j < ring.length; j++) pairs.push([ring[i], ring[j]]);
      for (const [x, y] of pairs) assert.equal(move(p, freshAttempt(p), {type: 'recut', a: x.join('.'), b: y.join('.')}), null, `${p.id}: ring trapezoids do not re-cut`);
      let a = freshAttempt(p);
      const middle = start.filter(piece => !ring.includes(piece)).map(x => x.join('.'));
      assert.equal(middle.length, 2);
      for (let k = 0; k < 2; k++) {
        const two = a.board.pieces.filter(piece => !ring.some(r => r.join() === piece.join())).map(x => x.join('.'));
        a = play(p, a, {type: 'recut', a: two[0], b: two[1]});
      }
      assert.ok(!isSolved(p, a.board), `${p.id}: two moves are not home`);
      const two = a.board.pieces.filter(piece => !ring.some(r => r.join() === piece.join())).map(x => x.join('.'));
      a = play(p, a, {type: 'recut', a: two[0], b: two[1]});
      assert.ok(isSolved(p, a.board), `${p.id}: three re-cuts come home`);
      assert.equal(validBoard(p, {pieces: start, path: [tkey(start), tkey(start)]}), false, `${p.id}: a step that is not a re-cut`);
    }
  }
  return {blockPuzzles: puzzles.length, duelBoards: group('blueduel').length, randomGames, duelFirstRhombi: positions, recutsChecked, sources: pack.sources.filter(s => s.id.startsWith('blocks-')).length, hintSteps};
}
// Undo's carry hook, as the engine applies it.
const mechanicCarry = (p, from, to) => mechanicFor(p).carry(p, from, to);
export default validateBlocks;

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateBlocks(), null, 2));
