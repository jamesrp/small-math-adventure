// Checks the Moving piles pack (dist/families/piles/piles.json) by methods
// separate from the mechanic's (which matches counters to rings by a search
// over sets of filled rings):
//   - least work by breadth-first search over whole pile states, one counter
//     along one road per step, written here from scratch;
//   - the line's gap sum, the star's leaf imbalances and the ring's median
//     circulation, compared with that search for every pair of equal-total
//     piles of 1 to 4 counters, and with the mechanic;
//   - every budget, design count and card claim in the pack, the eight cards
//     as the complete set and their prefix-count bound, the ring against the
//     line, and nearest-first failing on Problem 3's pair;
//   - witnesses and hint chains played through the move rules, from fresh
//     and messy boards; refusals, their locks through Undo and every Undo
//     changing the board; illegal moves and forged saves.
// Run: node scripts/validate-piles.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {leastWork} from '../dist/families/piles/piles.js';
import {loadPack} from './packs.mjs';

// --- An independent model ----------------------------------------------------
const idsOf = m => Object.keys(m.nodes);
const neighbours = m => { const ids = idsOf(m); return ids.map(id => m.roads.flatMap(([u, v]) => u === id ? [ids.indexOf(v)] : v === id ? [ids.indexOf(u)] : [])); };
const bfsCache = new Map();
// Fewest one-counter-one-road steps from piles a to every pile state.
function bfsFrom(m, a) {
  const key = JSON.stringify([m.roads, a]);
  if (bfsCache.has(key)) return bfsCache.get(key);
  const nb = neighbours(m), seen = new Map([[a.join(), 0]]), queue = [a];
  for (let k = 0; k < queue.length; k++) {
    const s = queue[k], d = seen.get(s.join());
    s.forEach((n, i) => { if (!n) return; for (const j of nb[i]) { const t = [...s]; t[i]--; t[j]++; if (!seen.has(t.join())) { seen.set(t.join(), d + 1); queue.push(t); } } });
  }
  bfsCache.set(key, seen);
  return seen;
}
const bfs = (m, a, b) => bfsFrom(m, a).get(b.join());
const pilesOf = (m, s) => idsOf(m).map(id => [...s].filter(c => c === id).length);
const allPiles = (n, total) => n === 1 ? [[total]] : Array.from({length: total + 1}, (_, k) => allPiles(n - 1, total - k).map(rest => [k, ...rest])).flat();
const prefix = (a, b) => a.map((_, i) => a.slice(0, i + 1).reduce((s, x, j) => s + x - b[j], 0));
const lineGap = (a, b) => prefix(a, b).slice(0, -1).reduce((s, x) => s + Math.abs(x), 0);
// Ring roads 0–1, …, (n−1)–0: the line's counts with the best constant taken off.
function ringMedian(a, b) {
  const S = prefix(a, b), lo = Math.min(...S), hi = Math.max(...S);
  let best = Infinity;
  for (let c = lo; c <= hi; c++) best = Math.min(best, S.reduce((s, x) => s + Math.abs(x - c), 0));
  return best;
}
// Star A, O, B, C: each leaf's road carries the leaf's imbalance.
const starLeaves = (m, a, b) => idsOf(m).reduce((s, id, i) => id === 'O' ? s : s + Math.abs(a[i] - b[i]), 0);
const kindOf = m => m.shape;
const formula = (m, a, b) => kindOf(m) === 'line' ? lineGap(a, b) : kindOf(m) === 'ring' ? ringMedian(a, b) : starLeaves(m, a, b);
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 400; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { assert.ok(h.quiet, `${p.id} ${label}: dead ends are told only behind Hint`); a = undoToSolvable(p, a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return a;
}
// A random legal action for a puzzle (moves, places, cards, Best).
function randomAction(p, a, rand) {
  const q = p.parameters, m = q.map, ids = idsOf(m), b = a.board;
  const pick = list => list[Math.floor(rand() * list.length)];
  if (q.mode === 'design' && b.placed.length < q.count) return {type: 'place', node: pick(ids)};
  if (q.mode === 'cards' && (b.pair.length < 2 || rand() < .08)) return rand() < .1 ? {type: 'best'} : {type: 'card', card: Math.floor(rand() * q.cards.length)};
  if (q.mode === 'cards' && rand() < .1) return {type: 'best'};
  const [u, v] = pick(m.roads);
  return rand() < .5 ? {type: 'move', from: u, to: v} : {type: 'move', from: v, to: u};
}
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let ctx = null;
const draw = p => att => playView(p, att, ctx);

export default async function validatePiles() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/piles/piles.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'piles');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const p of pack.puzzles) {
    assert.match(p.id, /^piles-/);
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length >= 3, `${p.id}: rules and hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent.${field}`);
    assert.ok(p.parent.sourceIds.every(id => ids.has(id)), `${p.id}: sources exist`);
    assert.ok(validBoard(p, freshAttempt(p).board), `${p.id}: starts valid`);
  }
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // --- The theorems behind the copy, over every small pair ------------------
  const maps = {line: puzzles.find(p => p.parameters.map.shape === 'line' && !p.parameters.map.slots).parameters.map, ring: puzzles.find(p => p.parameters.map.shape === 'ring').parameters.map, star: puzzles.find(p => p.parameters.map.shape === 'star').parameters.map};
  let pairs = 0;
  for (const [name, m] of Object.entries(maps)) for (let n = 1; n <= 4; n++) {
    const states = allPiles(idsOf(m).length, n);
    for (const a of states) for (const b of states) {
      const d = bfs(m, a, b);
      assert.equal(formula(m, a, b), d, `${name} ${a} → ${b}: the formula matches the search`);
      assert.equal(leastWork(m, a, b), d, `${name} ${a} → ${b}: the mechanic matches the search`);
      pairs++;
    }
  }
  // Sorted matching on the line: first counter to first ring.
  const sortedCost = (a, b) => { const xs = a.flatMap((n, i) => Array(n).fill(i)), ys = b.flatMap((n, i) => Array(n).fill(i)); return xs.reduce((s, x, k) => s + Math.abs(x - ys[k]), 0); };
  for (const a of allPiles(6, 4)) for (const b of allPiles(6, 4)) assert.equal(sortedCost(a, b), bfs(maps.line, a, b), `line ${a} → ${b}: sorted matching is least`);

  // --- Each puzzle's claim ----------------------------------------------------
  for (const p of puzzles) {
    const q = p.parameters, m = q.map;
    assert.ok(['move', 'design', 'cards'].includes(q.mode), `${p.id}: mode`);
    if (q.mode === 'move') {
      assert.equal(bfs(m, q.start, q.target), q.budget, `${p.id}: the budget is the least work`);
      assert.ok(q.budget > 0);
      assert.equal(p.visibleObjective, '', `${p.id}: the board shows the goal`);
    }
    if (q.mode === 'design') {
      const starts = allPiles(idsOf(m).length, q.count).filter(a => bfs(m, a, q.target) === q.exact);
      assert.equal(starts.length, q.starts, `${p.id}: ${q.starts} starts need exactly ${q.exact}`);
      assert.ok(!starts.some(a => same(a, q.target)), `${p.id}: the rings are not an answer`);
    }
    if (q.mode === 'cards') {
      // The cards are every four-counter arrangement on bins 0–4 with position total 8.
      const total8 = allPiles(5, 4).filter(a => a.reduce((s, n, i) => s + n * i, 0) === 8).map(a => a.join());
      assert.deepEqual([...q.cards.map(c => c.join())].sort(), total8.sort(), `${p.id}: the eight cards are the complete set`);
      let best = 0, at = [];
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const w = bfs(m, q.cards[i], q.cards[j]); if (w > best) { best = w; at = []; } if (w === best) at.push([i, j]); }
      assert.equal(best, q.best, `${p.id}: the farthest pair needs ${q.best}`);
      assert.deepEqual(at, [[0, 7]], `${p.id}: only 0044 and 2222`);
      assert.deepEqual([q.cards[0], q.cards[7]].map(c => c.join('')), ['20002', '00400']);
      for (const c of q.cards) { const run = c.map((_, i) => c.slice(0, i + 1).reduce((s, x) => s + x, 0)); assert.ok(run[0] <= 2 && run[1] <= 2 && run[2] >= 2 && run[3] >= 2, `${p.id}: prefix counts bound every road by 2`); }
    }
  }
  // Problem 3's pair defeats nearest-first: 6 against 4, with no tie on the way.
  const p3 = puzzles.find(p => p.title === 'Nearest first'), m3 = p3.parameters.map;
  {
    const xs = [0, 3], ys = [2, 5];
    let cost = 0;
    while (xs.length) {
      const options = xs.flatMap((x, i) => ys.map((y, j) => ({i, j, d: Math.abs(x - y)}))).sort((a, b) => a.d - b.d);
      assert.ok(options.length < 2 || options[0].d < options[1].d, 'nearest-first never ties here');
      cost += options[0].d; xs.splice(options[0].i, 1); ys.splice(options[0].j, 1);
    }
    assert.equal(cost, 6); assert.equal(bfs(m3, p3.parameters.start, p3.parameters.target), 4);
  }
  // The ring against the line.
  const r1 = puzzles.find(p => p.title === 'Round the ring').parameters, r2 = puzzles.find(p => p.title === 'Halfway round').parameters;
  assert.equal(bfs(maps.line, r1.start, r1.target), 12, 'on the line 0000 → 1245 needs 12');
  assert.equal(r1.budget, 6);
  assert.equal(bfs(maps.line, r2.start, r2.target), 9, 'on the line 012 → 345 needs 9');
  assert.equal(r2.budget, 5);
  // The star's most for three counters is 6, at the unique start A3.
  const star8 = puzzles.find(p => p.title === 'The longest trips').parameters;
  assert.equal(Math.max(...allPiles(4, 3).flatMap(a => allPiles(4, 3).map(b => bfs(maps.star, a, b)))), 6, 'three counters on the star need at most 6');
  assert.deepEqual(allPiles(4, 3).filter(a => bfs(maps.star, a, star8.target) === 6), [pilesOf(maps.star, 'AAA')], 'only A3 needs 6');

  // --- Witnesses, hints and play ---------------------------------------------
  for (const p of puzzles) {
    const q = p.parameters;
    let a = freshAttempt(p);
    if (q.mode === 'move') for (const [from, to] of q.witness) a = play(p, a, {type: 'move', from, to});
    if (q.mode === 'design') { for (const node of q.witness.placed) a = play(p, a, {type: 'place', node}); for (const [from, to] of q.witness.plan) a = play(p, a, {type: 'move', from, to}); }
    if (q.mode === 'cards') { for (const card of q.witness.pair) a = play(p, a, {type: 'card', card}); for (const [from, to] of q.witness.plan) a = play(p, a, {type: 'move', from, to}); a = play(p, a, {type: 'best'}); }
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
    refuse(p, a, {type: 'move', from: q.map.roads[0][0], to: q.map.roads[0][1]}, 'nothing moves after a solve');
    hintsSolve(p, freshAttempt(p), 'from fresh');
    // Every press of Undo changes the board, all the way back.
    for (let u = a, k = 0; u.history.length && k < 60; k++) { const shown = draw(p)(u), back = undoPress(p, u, draw(p), shown); assert.notEqual(draw(p)(back), shown, `${p.id}: Undo changes the board`); u = back; }
    for (let seed = 1; seed <= 25; seed++) {
      const rand = rng(seed * 7919 + p.number);
      let b = freshAttempt(p);
      for (let k = 0; k < 18 && !isSolved(p, b.board); k++) { const next = move(p, b, randomAction(p, b, rand)); if (next) b = next; }
      assert.ok(validBoard(p, b.board), `${p.id}: random play stays valid`);
      if (!isSolved(p, b.board)) hintsSolve(p, b, `after random play ${seed}`);
    }
  }

  // --- Rules: illegal moves ----------------------------------------------------
  const byTitle = t => puzzles.find(p => p.title === t);
  {
    const p = byTitle('Two counters');
    const a = freshAttempt(p);
    refuse(p, a, {type: 'move', from: '1', to: '2'}, 'no counter to move');
    refuse(p, a, {type: 'move', from: '0', to: '2'}, 'two bins in one move');
    refuse(p, a, {type: 'move', from: '0', to: '9'}, 'no such bin');
    refuse(p, a, {type: 'place', node: '1'}, 'no placing in a move puzzle');
    refuse(p, a, {type: 'best'}, 'no Best in a move puzzle');
    let b = a;
    for (let k = 0; k < 40; k++) b = play(p, b, k % 2 ? {type: 'move', from: '1', to: '0'} : {type: 'move', from: '0', to: '1'});
    refuse(p, b, {type: 'move', from: '0', to: '1'}, 'the record has a cap');
  }
  {
    const p = byTitle('All to the middle'), m = p.parameters.map, moves = (a, list) => list.reduce((b, [from, to]) => play(p, b, {type: 'move', from, to}), a);
    const placed = list => [...list].reduce((b, node) => play(p, b, {type: 'place', node}), freshAttempt(p));
    let a = freshAttempt(p);
    refuse(p, a, {type: 'move', from: '0', to: '1'}, 'no moves before every counter is down');
    a = placed('0005');
    refuse(p, a, {type: 'place', node: '1'}, 'no more counters');
    assert.equal(bfs(m, pilesOf(m, '0005'), p.parameters.target), 9, '0005 needs 9');
    // 0003 needs 7: a solve.
    assert.ok(isSolved(p, moves(placed('0003'), [['3', '2'], ['0', '1'], ['1', '2'], ['0', '1'], ['1', '2'], ['0', '1'], ['1', '2']]).board), '0003 solves it in 7');
    // 0134 needs 6: matched only at 8 moves, with a red dot.
    let x = moves(placed('0134'), [['0', '1'], ['1', '2'], ['1', '2'], ['3', '2'], ['4', '3'], ['3', '2'], ['2', '1'], ['1', '2']]);
    assert.ok(!isSolved(p, x.board), 'eight moves are not a solve');
    assert.match(draw(p)(x), /pl-pip over/, 'extra moves turn red');
    // 0113 needs 5: matched in exactly 7 with an out-and-back is not a solve, and the board says so.
    const c = moves(placed('0113'), [['3', '4'], ['4', '3'], ['3', '2'], ['1', '2'], ['1', '2'], ['0', '1'], ['1', '2']]);
    assert.equal(bfs(m, pilesOf(m, '0113'), p.parameters.target), 5);
    assert.ok(!isSolved(p, c.board), '0113 needs 5, so 7 moves are not a solve');
    assert.match(draw(p)(c), /Fewer moves would do\./, 'the board says fewer would do');
    assert.equal(nextHint(p, c).type, 'deadend');
  }
  {
    const p = byTitle('Exactly five'), m = p.parameters.map, moves = (a, list) => list.reduce((b, [from, to]) => play(p, b, {type: 'move', from, to}), a);
    const placed = list => [...list].reduce((b, node) => play(p, b, {type: 'place', node}), freshAttempt(p));
    // 0345 looks like a trip of 5 but needs 2 (in order, 0 takes ring 2).
    assert.equal(bfs(m, pilesOf(m, '0345'), p.parameters.target), 2);
    const short = moves(placed('0345'), [['0', '1'], ['1', '2']]);
    assert.ok(!isSolved(p, short.board), 'matched in 2 is not exactly 5');
    // 0245 needs 3: matched in 5 with an out-and-back is told.
    const told = moves(placed('0245'), [['5', '4'], ['4', '5'], ['2', '3'], ['0', '1'], ['1', '2']]);
    assert.ok(!isSolved(p, told.board));
    assert.match(draw(p)(told), /Fewer moves would do\./);
    // 0045 needs exactly 5.
    assert.ok(isSolved(p, moves(placed('0045'), [['0', '1'], ['1', '2'], ['0', '1'], ['1', '2'], ['2', '3']]).board), '0045 solves it');
  }
  // --- Cards: Best, its refusals and their locks -------------------------------
  {
    const p = byTitle('Farthest cards'), q = p.parameters;
    let a = freshAttempt(p);
    refuse(p, a, {type: 'best'}, 'no Best before a pair');
    refuse(p, a, {type: 'move', from: '0', to: '1'}, 'no moves before a pair');
    a = play(p, a, {type: 'card', card: 1}); // 0134
    a = play(p, play(p, a, {type: 'card', card: 1}), {type: 'card', card: 1});
    assert.deepEqual(a.board.pair, [1], 'tapping the card again lets it go, and again picks it');
    a = play(p, a, {type: 'card', card: 3}); // → 0233: 4 → 2 needs 1, wait: 0,1,3,4 → 0,2,3,3 needs 2
    refuse(p, a, {type: 'best'}, 'no Best before the rings are filled');
    a = play(p, a, {type: 'move', from: '1', to: '2'});
    a = play(p, a, {type: 'move', from: '4', to: '3'});
    assert.equal(bfs(q.map, q.cards[1], q.cards[3]), 2);
    const before = a;
    a = play(p, a, {type: 'best'});
    assert.equal(a.board.told, 'farther');
    assert.match(draw(p)(a), /Another pair takes more moves\./);
    refuse(p, a, {type: 'best'}, 'the same pair stays refused');
    // Undo takes the line away and keeps Best off; each press changes the board.
    const shown = draw(p)(a), back = undoPress(p, a, draw(p), shown);
    assert.notEqual(draw(p)(back), shown, 'Undo changes the board');
    assert.equal(back.board.told, null); assert.deepEqual(back.board.pair, before.board.pair);
    refuse(p, back, {type: 'best'}, 'Undo keeps the refusal');
    assert.doesNotMatch(draw(p)(back), /Another pair/);
    // A wasteful plan on the farthest pair: told fewer moves would do.
    let w = play(p, play(p, play(p, back, {type: 'card', card: 0}), {type: 'card', card: 0}), {type: 'card', card: 0});
    w = play(p, w, {type: 'card', card: 7});
    for (const [from, to] of [['0', '1'], ['1', '0'], ['0', '1'], ['1', '2'], ['0', '1'], ['1', '2'], ['4', '3'], ['3', '2'], ['4', '3'], ['3', '2']]) w = play(p, w, {type: 'move', from, to});
    w = play(p, w, {type: 'best'});
    assert.equal(w.board.told, 'less');
    assert.match(draw(p)(w), /Fewer moves would do\./);
    refuse(p, w, {type: 'best'}, 'the same plan stays refused');
    assert.equal(w.board.shut.length, 2, 'both refusals are kept');
    // Back to the first pair through Undo: still refused.
    let u = w;
    for (let k = 0; k < 40 && !(same(u.board.pair, [1, 3]) && u.board.log.length === 2); k++) u = undoPress(p, u, draw(p), draw(p)(u));
    assert.equal(u.board.shut.length, 2, 'Undo keeps every refusal');
    refuse(p, u, {type: 'best'}, 'the first pair is still refused after Undo');
    // The right claim: 0044 → 2222 in 8.
    let r = freshAttempt(p);
    r = play(p, play(p, r, {type: 'card', card: 7}), {type: 'card', card: 0}); // 2222 → 0044 also counts
    for (const [from, to] of [['2', '1'], ['1', '0'], ['2', '1'], ['1', '0'], ['2', '3'], ['3', '4'], ['2', '3'], ['3', '4']]) r = play(p, r, {type: 'move', from, to});
    r = play(p, r, {type: 'best'});
    assert.ok(isSolved(p, r.board), 'Best on the farthest pair in 8 solves it, either way round');
    assert.match(draw(p)(r), /pl-flow/, 'the solved board shows what each road carried');
  }
  // --- Forged saves --------------------------------------------------------------
  {
    const p = byTitle('Two counters'), fresh = freshAttempt(p).board;
    assert.ok(!validBoard(p, {...fresh, log: [['1', '2']]}), 'a step from an empty bin');
    assert.ok(!validBoard(p, {...fresh, log: [['0', '2']]}), 'a step across two roads');
    assert.ok(!validBoard(p, {...fresh, log: 'x'}), 'a log that is not a list');
    assert.ok(!validBoard(p, {...fresh, log: Array(41).fill(['0', '1'])}), 'past the cap');
    const d = byTitle('All to the middle');
    assert.ok(!validBoard(d, {placed: ['0', '0'], log: [['0', '1']]}), 'moves while placing');
    assert.ok(!validBoard(d, {placed: ['0', '0', '0', '0', '0'], log: []}), 'too many counters');
    assert.ok(!validBoard(d, {placed: ['9'], log: []}), 'no such bin');
    const c = byTitle('Farthest cards'), cf = freshAttempt(c).board;
    assert.ok(!validBoard(c, {...cf, pair: [1, 1]}), 'one card twice');
    assert.ok(!validBoard(c, {...cf, pair: [0, 7], claimed: true}), 'a claim before the rings are filled');
    assert.ok(!validBoard(c, {...cf, pair: [1, 3], log: [['1', '2'], ['4', '3']], told: 'farther', shut: []}), 'a refusal line without its lock');
    assert.ok(!validBoard(c, {...cf, shut: [JSON.stringify(['farther', [0, 7]])]}), 'a lock on the farthest pair');
    assert.ok(!validBoard(c, {...cf, shut: [JSON.stringify(['less', [1, 3], [['1', '2'], ['4', '3']]])]}), 'a fewer-moves lock on a best plan');
    assert.ok(validBoard(c, {...cf, pair: [1, 3], log: [['1', '2'], ['4', '3']], told: 'farther', shut: [JSON.stringify(['farther', [1, 3]])]}), 'a real refusal');
    const g = playground, gf = freshAttempt(g).board;
    assert.ok(!validBoard(g, {...gf, counters: [7, 0, 0, 0, 0, 0]}), 'over a place’s cap');
    assert.ok(!validBoard(g, {...gf, map: 'moon'}), 'no such map');
    assert.ok(!validBoard(g, {...gf, rings: [1, 2]}), 'piles of the wrong length');
  }
  // --- Playground ------------------------------------------------------------------
  {
    const g = playground;
    assert.equal(mechanicFor(g).noHint(g), true, 'the playground has no Hint');
    let a = freshAttempt(g);
    for (const node of ['0', '0', '3']) a = play(g, a, {type: 'add', node});
    for (const node of ['1', '2', '5']) a = play(g, a, {type: 'ring', node});
    a = play(g, a, {type: 'move', from: '0', to: '1'});
    assert.equal(a.board.work, 1);
    a = play(g, a, {type: 'add', node: '4'});
    assert.equal(a.board.work, 0, 'adding starts the count again');
    a = play(g, a, {type: 'map', map: 'ring'});
    assert.equal(a.board.counters.reduce((s, x) => s + x), 0, 'a new map starts empty');
    a = play(g, a, {type: 'add', node: '0'}); a = play(g, a, {type: 'move', from: '0', to: '5'});
    assert.equal(a.board.work, 1, 'the ring joins 0 and 5');
    a = play(g, a, {type: 'clear'});
    refuse(g, a, {type: 'clear'}, 'nothing to clear');
    for (let k = 0; k < 6; k++) a = play(g, a, {type: 'add', node: '2'});
    refuse(g, a, {type: 'add', node: '2'}, 'a place holds 6');
    assert.ok(!isSolved(g, a.board), 'the playground is never solved');
  }
  return {puzzles: pack.puzzles.length, pairsChecked: pairs};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await validatePiles());
