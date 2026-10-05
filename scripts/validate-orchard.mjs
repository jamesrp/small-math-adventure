// Checks the Mirror Couriers hidden orchard pack
// (dist/families/orchard/orchard.json): content fields and sources; every
// puzzle's answer recomputed with gcd (the module tests every grid point for
// lying on the line instead); the module's beams against gcd on random boards;
// every planting of at most the budget, and every spot for the courier; the
// parity and thirds certificates the adult notes cite; that hints alone solve
// from a fresh board and from a wasteful start; claims; illegal taps and
// forged saves.
// Run: node scripts/validate-orchard.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {sight} from '../dist/families/orchard/orchard.js';
import {loadPack} from './packs.mjs';

const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
const range = (a, b) => Array.from({length: Math.max(0, b - a + 1)}, (_, i) => a + i);
const key = ([x, y]) => `${x},${y}`;
const sortPts = pts => [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
const points = size => range(0, size).flatMap(x => range(0, size).map(y => [x, y]));
// The grid points strictly between v and t: v + k(t − v)/d for 0 < k < d, d = gcd.
function gridBetween(v, t) {
  const dx = t[0] - v[0], dy = t[1] - v[1], d = gcd(Math.abs(dx), Math.abs(dy));
  return range(1, d - 1).map(k => [v[0] + k * dx / d, v[1] + k * dy / d]);
}
function combinations(list, k) {
  if (k === 0) return [[]];
  return list.flatMap((x, i) => combinations(list.slice(i + 1), k - 1).map(rest => [x, ...rest]));
}
// What blocks a beam, for each mode, without the module.
function occupied(q, board) {
  const lanterns = new Set(q.lanterns.map(key));
  if (q.mode === 'plant') return new Set([...lanterns, ...board.trees.map(key)]);
  const v = q.mode === 'stand' ? board.at : [0, 0], cut = new Set((board.cut || []).map(key));
  return new Set(points(q.size).map(key).filter(k => k !== key(v) && !cut.has(k)));
}
function litByGcd(q, board) {
  const v = q.mode === 'stand' ? board.at : [0, 0], occ = occupied(q, board);
  return q.lanterns.map(l => gridBetween(v, l).every(pt => !occ.has(key(pt))));
}
const parityClasses = lanterns => new Set(lanterns.map(([x, y]) => `${x % 2}${y % 2}`)).size;
function spotsByGcd(size, lanterns) {
  const taken = new Set(lanterns.map(key));
  return points(size).filter(v => !taken.has(key(v)) && lanterns.every(l => gcd(Math.abs(l[0] - v[0]), Math.abs(l[1] - v[1])) === 1));
}
// A small seeded generator, so a failure repeats.
function seeded(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32; }

const tapAll = (p, a, pts) => pts.reduce((x, at) => x && move(p, x, {type: 'tap', at}), a);
function hintLoop(p, start, label) {
  let a = start, steps = 0;
  for (; steps < 60 && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move (${JSON.stringify(a.board)})`);
    assert.ok(h.text, `${label}: hint text`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints solve`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
}

export default async function validateOrchard() {
  const orchard = JSON.parse(await readFile(new URL('../dist/families/orchard/orchard.json', import.meta.url), 'utf8'));
  const pack = await loadPack();
  const ids = new Set(pack.sources.map(s => s.id));
  assert.equal(orchard.puzzles.length, 12);
  assert.deepEqual(orchard.puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(orchard.puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of orchard.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const random = seeded(31);
  let beams = 0, plantings = 0, spots = 0, hintMoves = 0, claims = 0;

  for (const p of orchard.puzzles) {
    const q = p.parameters, label = p.id, decide = q.decide === true, fresh = freshAttempt(p);
    assert.equal(p.id, `orchard-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'orchard'); assert.equal(p.libraryFamily, 'billiard'); assert.equal(p.group, 'Sight lines'); assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Mirror Couriers');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(q.lanterns.every(l => !(l[0] === 0 && l[1] === 0)), `${label}: no lantern on the courier`);
    assert.equal(new Set(q.lanterns.map(key)).size, q.lanterns.length, `${label}: lanterns are distinct`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);

    // The module's beams agree with gcd on random boards.
    const free = points(q.size).filter(pt => key(pt) !== '0,0' && !q.lanterns.some(l => key(l) === key(pt)));
    for (let trial = 0; trial < 60; trial++) {
      let board;
      if (q.mode === 'stand') board = {...fresh.board, at: [...free, [0, 0]][Math.floor(random() * (free.length + 1))]};
      else {
        const pick = sortPts(free.filter(() => random() < 0.15)).slice(0, q.budget);
        board = q.mode === 'chop' ? {...fresh.board, cut: sortPts(pick)} : {...fresh.board, trees: sortPts(pick)};
      }
      assert.ok(validBoard(p, board), `${label}: random board is valid`);
      assert.deepEqual(sight(q, board).map(s => s.lit), litByGcd(q, board), `${label}: beams agree with gcd on ${JSON.stringify(board)}`);
      beams++;
    }

    if (q.mode === 'chop') {
      // Lanterns behind another lantern can never be lit; the others cost gcd − 1 cuts.
      const goal = q.light ?? q.lanterns.length;
      const cost = q.lanterns.map(l => gridBetween([0, 0], l).some(pt => q.lanterns.some(m => key(m) === key(pt))) ? Infinity : gcd(l[0], l[1]) - 1);
      const sets = combinations(range(0, q.lanterns.length - 1), goal).map(set => ({set, total: set.reduce((s, i) => s + cost[i], 0)}));
      const best = Math.min(...sets.map(s => s.total)), cheapest = sets.filter(s => s.total === best);
      assert.equal(q.budget, best, `${label}: the budget is the fewest cuts`);
      assert.equal(cheapest.length, 1, `${label}: one cheapest choice of lanterns`);
      assert.deepEqual(p.solution.lanterns, cheapest[0].set, `${label}: the lanterns to light`);
      const cut = sortPts(cheapest[0].set.flatMap(i => gridBetween([0, 0], q.lanterns[i])));
      assert.deepEqual(p.solution.cut, cut, `${label}: the trees to cut`);
      assert.equal(p.solution.possible, true);
      // The answer solves, in any order, and one cut fewer does not.
      const done = tapAll(p, fresh, [...cut].reverse());
      assert.ok(done && isSolved(p, done.board), `${label}: the answer solves`);
      for (let i = 0; i < cut.length; i++) assert.ok(!isSolved(p, tapAll(p, fresh, cut.filter((_, j) => j !== i)).board), `${label}: every listed cut is needed`);
      // Hints from fresh, and after wasting the whole budget on useless cuts.
      hintMoves += hintLoop(p, fresh, `${label} fresh`);
      const useless = free.filter(pt => !cut.some(c => key(c) === key(pt))).slice(0, q.budget);
      const wasted = tapAll(p, fresh, useless);
      assert.ok(wasted && !isSolved(p, wasted.board));
      assert.equal(move(p, wasted, {type: 'tap', at: cut[0]}), null, `${label}: no cut beyond the budget`);
      hintMoves += hintLoop(p, wasted, `${label} wasted`);
      // Putting a tree back is a move; cutting a lantern or the courier is not.
      assert.deepEqual(move(p, move(p, fresh, {type: 'tap', at: useless[0]}), {type: 'tap', at: useless[0]}).board, fresh.board, `${label}: tap again to put back`);
      assert.equal(move(p, done, {type: 'tap', at: cut[0]}), null, `${label}: nothing after a solve`);
    }

    if (q.mode === 'plant') {
      // Group lanterns by their first point (the line from the courier); each
      // line's nearest lantern needs a tree strictly in front of it.
      const lines = new Map();
      for (const l of q.lanterns) {
        const d = gcd(l[0], l[1]), first = key([l[0] / d, l[1] / d]);
        if (!lines.has(first) || gcd(...lines.get(first)) > d) lines.set(first, l);
      }
      const nearest = [...lines.values()], possible = nearest.every(l => gcd(l[0], l[1]) > 1);
      assert.equal(p.solution.possible, possible, `${label}: possible exactly when every nearest lantern shares a factor`);
      assert.equal(q.budget, lines.size, `${label}: the budget is one tree per line`);
      if (possible) assert.deepEqual(p.solution.trees, sortPts([...lines.keys()].map(k => k.split(',').map(Number))), `${label}: a tree at each line's first point`);
      else assert.equal(p.solution.trees, null);
      // Every planting of at most the budget: it hides everything exactly when
      // each nearest lantern has a planted tree on its segment.
      let hiding = 0;
      for (let k = 0; k <= q.budget; k++) for (const set of combinations(free, k)) {
        const trees = new Set(set.map(key));
        const hides = nearest.every(l => gridBetween([0, 0], l).some(pt => trees.has(key(pt))));
        if (hides) hiding++;
        if (hides || random() < 0.02) {
          const a = tapAll(p, fresh, set);
          assert.ok(a, `${label}: planting ${JSON.stringify(set)} is legal`);
          assert.equal(isSolved(p, a.board) && !(decide && a.board.claimed), hides, `${label}: planting ${JSON.stringify(set)} solves exactly when it hides every lantern`);
        }
        plantings++;
      }
      assert.equal(hiding > 0, possible, `${label}: some planting works exactly when possible`);
      if (!decide) {
        hintMoves += hintLoop(p, fresh, `${label} fresh`);
        const useless = free.filter(pt => !nearest.some(l => gridBetween([0, 0], l).some(b => key(b) === key(pt)))).slice(0, q.budget);
        const wasted = tapAll(p, fresh, useless);
        assert.equal(move(p, wasted, {type: 'tap', at: free.find(pt => !useless.some(u => key(u) === key(pt)))}), null, `${label}: no tree beyond the budget`);
        hintMoves += hintLoop(p, wasted, `${label} wasted`);
      }
    }

    if (q.mode === 'stand') {
      const good = spotsByGcd(q.size, q.lanterns);
      assert.deepEqual(sortPts(p.solution.spots), sortPts(good), `${label}: the spots that see every lantern`);
      assert.equal(p.solution.possible, good.length > 0);
      for (const v of free) {
        const a = move(p, fresh, {type: 'tap', at: v});
        assert.ok(a, `${label}: the courier can stand at ${key(v)}`);
        assert.equal(isSolved(p, a.board), good.some(g => key(g) === key(v)), `${label}: standing at ${key(v)} solves exactly when it sees every lantern`);
        spots++;
      }
      if (q.lanterns.length === 4) assert.equal(good.length === 0, parityClasses(q.lanterns) === 4, `${label}: no spot exactly when the lanterns use all four even–odd patterns`);
      if (!decide) {
        hintMoves += hintLoop(p, fresh, `${label} fresh`);
        const bad = free.find(v => !good.some(g => key(g) === key(v)) && key(v) !== '0,0');
        hintMoves += hintLoop(p, move(p, fresh, {type: 'tap', at: bad}), `${label} from a bad spot`);
      }
      assert.equal(move(p, fresh, {type: 'tap', at: [0, 0]}), null, `${label}: the courier is already there`);
    }

    // Claims: only in decide puzzles, after a move, checked against the answer.
    const unsolving = pt => { const a = move(p, fresh, {type: 'tap', at: pt}); return a && !isSolved(p, a.board); };
    const first = free.find(unsolving);
    const moved = move(p, fresh, {type: 'tap', at: first});
    assert.ok(moved, `${label}: a first move`);
    if (decide) {
      assert.equal(nextHint(p, fresh).type, 'note', `${label}: decide hints are the authored ones`);
      assert.equal(move(p, fresh, {type: 'claim'}), null, `${label}: a claim needs a move first`);
      const claimed = move(p, moved, {type: 'claim'});
      assert.equal(isSolved(p, claimed.board), !p.solution.possible, `${label}: the claim is right exactly when impossible`);
      if (p.solution.possible) {
        assert.equal(claimed.board.wrong, true);
        assert.match(mechanicFor(p).render(p, claimed), /Keep looking/);
        assert.equal(move(p, claimed, {type: 'claim'}), null, `${label}: one refusal at a time`);
        const again = move(p, claimed, {type: 'tap', at: q.mode === 'stand' ? free.find(pt => key(pt) !== key(first) && unsolving(pt)) : first});
        assert.equal(again.board.wrong, false, `${label}: a move clears the refusal`);
      } else {
        assert.match(mechanicFor(p).render(p, claimed), /Right:/);
        assert.equal(move(p, claimed, {type: 'tap', at: first}), null, `${label}: nothing after a solve`);
      }
      claims++;
    } else assert.equal(move(p, moved, {type: 'claim'}), null, `${label}: no claims`);

    // Illegal taps and forged saves.
    for (const at of [q.lanterns[0], [-1, 0], [q.size + 1, 0], [1.5, 1], ['1', 1], [1], null]) assert.equal(move(p, fresh, {type: 'tap', at}), null, `${label}: rejects a tap at ${JSON.stringify(at)}`);
    if (q.mode !== 'stand') assert.equal(move(p, fresh, {type: 'tap', at: [0, 0]}), null, `${label}: rejects the courier's point`);
    for (const action of [{type: 'shrug'}, {type: 'again'}, null, 'tap']) assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
    assert.deepEqual(undo(moved).board, fresh.board, `${label}: Undo takes back a move`);
    const forgeries = [{}, null, {...fresh.board, extra: 1}];
    if (q.mode === 'stand') forgeries.push({...fresh.board, at: q.lanterns[0]}, {...fresh.board, at: [q.size + 1, 0]}, {...fresh.board, at: [0]}, {...fresh.board, cut: []});
    else {
      const list = q.mode === 'chop' ? 'cut' : 'trees', two = free.slice(0, 2);
      forgeries.push({...fresh.board, [list]: [two[1], two[0]]}, {...fresh.board, [list]: [two[0], two[0]]}, {...fresh.board, [list]: [q.lanterns[0]]}, {...fresh.board, [list]: [[0, 0]]}, {...fresh.board, [list]: free.slice(0, q.budget + 1)}, {...fresh.board, [list]: 'x'}, {...fresh.board, at: [0, 0]});
    }
    if (decide) forgeries.push({...fresh.board, claimed: true}, {...fresh.board, moved: true, claimed: true, wrong: true}, {...fresh.board, moved: true, [p.solution.possible ? 'claimed' : 'wrong']: true}, {...fresh.board, moved: 'yes'});
    else forgeries.push({...fresh.board, moved: true, claimed: false, wrong: false});
    for (const forged of forgeries) assert.equal(validBoard(p, forged), false, `${label}: rejects a forged save ${JSON.stringify(forged)}`);
    if (decide) assert.equal(validBoard(p, {...fresh.board, moved: true, [p.solution.possible ? 'wrong' : 'claimed']: true}), true, `${label}: a checked claim or refusal saves`);
  }

  // The adult notes' wider claims, on a 7 × 7 field: four lanterns in the
  // middle 5 × 5 leave no spot exactly when they use all four even–odd
  // patterns, and nine lanterns at 0, 2, 4 both ways leave no spot (thirds).
  const middle = range(1, 5).flatMap(x => range(1, 5).map(y => [x, y]));
  let sets = 0;
  for (const set of combinations(middle, 4)) { assert.equal(spotsByGcd(6, set).length === 0, parityClasses(set) === 4, `four lanterns ${JSON.stringify(set)}`); sets++; }
  const nine = [0, 2, 4].flatMap(x => [0, 2, 4].map(y => [x, y]));
  assert.equal(parityClasses(nine), 1);
  assert.equal(spotsByGcd(6, nine).length, 0, 'nine lanterns at 0, 2, 4: no spot sees them all');
  return {puzzles: orchard.puzzles.length, beams, plantings, spots, hintMoves, claims, fourLanternSets: sets};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateOrchard(), null, 2));
