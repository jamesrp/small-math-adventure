// Checks the Doubling elevators pack (dist/families/elevators/elevators.json):
// content fields and sources; every puzzle's fewest moves, number of shortest
// trips and (for the step-back puzzles) fewest moves without a left step,
// against a separate simulator searched by iterative deepening over move words
// with a reach bound, on an open board and inside the puzzle's window; the
// bound itself, by listing every word of up to eleven moves; the farthest
// puzzles' targets; that hints alone finish every puzzle from a fresh board,
// after a wasted move and with the budget spent; illegal moves; forged saves;
// and the playground.
// Run: node scripts/validate-elevators.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
// The simulator: a board is {lo, hi, top}; a place is two numbers.
const OPEN = {lo: -1000, hi: 1000, top: 12};
const boardOf = q => ({lo: q.xmin, hi: q.xmax, top: q.levels - 1});
function step(board, x, h, c) {
  if (c === 'U') return h < board.top ? [x, h + 1] : null;
  if (c === 'D') return h > 0 ? [x, h - 1] : null;
  const nx = x + (c === 'R' ? 1 : -1) * (1 << h);
  return nx >= board.lo && nx <= board.hi ? [nx, h] : null;
}
const end = (board, word) => { let p = [0, 0]; for (const c of word) { p = step(board, ...p, c); if (!p) return null; } return p; };
// From (x, h) with r moves left, the farthest a trip can still go and end on
// the ground: topping out at H ≥ h costs (H − h) + H rides, and every other
// move goes at most 2^H.
function reach(r, h) {
  let best = -1;
  for (let H = h; (H - h) + H <= r; H++) best = Math.max(best, (r - (H - h) - H) * 2 ** H);
  return best;
}
// Every word of exactly n moves from 0 to (t, 0), by depth-first search with
// the reach bound; letters limits the moves (no L for the no-left minima).
function words(board, t, n, letters = 'UDLR') {
  const out = [];
  const dfs = (x, h, r, w) => {
    if (r === 0) { if (x === t && h === 0) out.push(w); return; }
    if (h > r || Math.abs(t - x) > reach(r, h)) return;
    for (const c of letters) { const p = step(board, x, h, c); if (p) dfs(p[0], p[1], r - 1, w + c); }
  };
  dfs(0, 0, n, '');
  return out;
}
// Iterative deepening: the fewest moves, and every shortest word.
function deepen(board, t, letters = 'UDLR', max = 30) {
  for (let n = 0; n <= max; n++) { const found = words(board, t, n, letters); if (found.length) return {n, words: found}; }
  return null;
}
const bound = n => Math.max(...range(0, Math.floor(n / 2)).map(H => (n - 2 * H) * 2 ** H));

// Every word of up to `deepest` moves on an open board (no window, h ≥ 0): the
// farthest ground coordinate a word of exactly each length ends at, and the
// words of each length that end there.
function listAll(deepest) {
  const far = Array(deepest + 1).fill(-Infinity), at = Array.from({length: deepest + 1}, () => []);
  let count = 0;
  const dfs = (x, h, w) => {
    count++;
    if (h === 0) {
      const n = w.length;
      if (x > far[n]) { far[n] = x; at[n] = [w]; } else if (x === far[n]) at[n].push(w);
    }
    if (w.length === deepest) return;
    dfs(x, h + 1, w + 'U');
    if (h > 0) dfs(x, h - 1, w + 'D');
    dfs(x - (1 << h), h, w + 'L');
    dfs(x + (1 << h), h, w + 'R');
  };
  dfs(0, 0, '');
  return {far, at, count};
}

// The bound over every N up to 11: the farthest any trip of at most N moves
// ends is max over H of (N − 2H)·2^H, and no trip ends beyond it.
let listed = null;
function theorems() {
  listed = listAll(11);
  const {far, at, count} = listed;
  for (let n = 0; n <= 11; n++) {
    const within = Math.max(...far.slice(0, n + 1));
    assert.equal(within, bound(n), `the farthest within ${n} moves is ${bound(n)}`);
  }
  assert.deepEqual(range(4, 8).map(bound), [4, 6, 8, 12, 16], 'Week 74 Problem 3');
  assert.ok(bound(7) < 16, 'Week 74 Problem 4: seven moves never reach 16');
  assert.deepEqual(at[9], ['UUURRRDDD'], 'nine moves reach 24 one way');
  assert.deepEqual(at[11], ['UUUURRRDDDD'], 'eleven moves reach 48 one way');
  assert.deepEqual(at[10].sort(), ['UUURRRRDDD', 'UUUURRDDDD'], 'ten moves reach 32 two ways');
  assert.deepEqual(at[8].sort(), ['UURRRRDD', 'UUURRDDD'], 'Week 74 Problem 2: two eight-move trips to 16');
  // Left steps save at 23, 31, 39, 46, 47, 55, 62 and 63, and nowhere else up to 64.
  const saves = range(1, 64).filter(t => deepen(OPEN, t, 'UDR').n > deepen(OPEN, t).n);
  assert.deepEqual(saves, [23, 31, 39, 46, 47, 55, 62, 63], 'where a left step saves a move');
  // The coin count: without left steps, topping out at H, the fewest steps to
  // n are ⌊n / 2^H⌋ plus the ones in n mod 2^H, and the fewest moves are the
  // least of 2H plus that.
  const ones = n => n.toString(2).replace(/0/g, '').length;
  for (let n = 1; n <= 64; n++) assert.equal(deepen(OPEN, n, 'UDR').n, Math.min(...range(0, 7).map(H => 2 * H + Math.floor(n / 2 ** H) + ones(n % 2 ** H))), `no-left fewest for ${n}`);
  return count;
}

const hintRun = (p, a, label, limit = 40) => {
  let steps = 0;
  for (; steps < limit && !isSolved(p, a.board); steps++) {
    const h = nextHint(p, a), place = end(boardOf(p.parameters), a.board.word);
    assert.equal(h.type, 'move', `${label}: hints keep naming a move`);
    const want = {U: 'Go up.', D: 'Go down.', L: `Step left ${2 ** place[1]}.`, R: `Step right ${2 ** place[1]}.`}[h.action.dir];
    assert.equal(h.text, want, `${label}: the hint names the move in words`);
    a = move(p, a, h.action);
    assert.ok(a, `${label}: the hinted move ${h.action.dir} is legal`);
  }
  assert.ok(isSolved(p, a.board), `${label}: hints finish the puzzle`);
  assert.equal(nextHint(p, a).type, 'done');
  return steps;
};
// The shortest word of at most `most` moves to a place where a step `dir`
// leaves the window, by breadth-first search in the simulator.
function edgeWord(board, dir, most) {
  const seen = new Map([['0,0', '']]), queue = [[0, 0]];
  for (let i = 0; i < queue.length; i++) {
    const [x, h] = queue[i], w = seen.get(`${x},${h}`);
    if (!step(board, x, h, dir)) return w;
    if (w.length === most) continue;
    for (const c of 'UDLR') { const n = step(board, x, h, c); if (n && !seen.has(n.join())) { seen.set(n.join(), w + c); queue.push(n); } }
  }
  return null;
}
const play = (p, a, word) => [...word].reduce((x, dir) => x && move(p, x, {type: 'move', dir}), a);

export default async function validateElevators() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/elevators/elevators.json', import.meta.url), 'utf8'));
  const merged = await loadPack();
  const ids = new Set(merged.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.equal(puzzles.length, 12);
  assert.deepEqual(puzzles.map(p => p.number), range(1, 12));
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families[0].id, 'elevators');
  const theoremWords = theorems();
  let hintSteps = 0, refusals = 0, forgeries = 0, trips = 0, edges = 0;
  for (const p of puzzles) {
    const q = p.parameters, label = p.id, board = boardOf(q), t = q.target;
    assert.equal(p.id, `elevators-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'elevator'); assert.equal(p.band, 'all'); assert.equal(p.familyTitle, 'Doubling elevators');
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.ok(isExpansion(p));
    assert.ok(q.levels >= 2 && q.levels <= 6 && q.xmin <= -1 && q.xmax > t, `${label}: a window of at most six levels around 0 and the target`);
    assert.equal(p.visibleObjective, q.farthest ? 'Go as far right as you can.' : '', `${label}: the board shows the goal`);
    assert.ok(p.rules.some(r => /ground/.test(r)) && p.rules.some(r => /doubles/.test(r)), `${label}: the rules say where to end and that steps double`);

    // The fewest moves, open and in the window, and every shortest word.
    const open = deepen(OPEN, t), inside = deepen(board, t);
    assert.equal(q.budget, open.n, `${label}: the budget is the fewest moves on an open board`);
    assert.equal(inside.n, open.n, `${label}: the window keeps the fewest`);
    assert.deepEqual(inside.words.sort(), open.words.sort(), `${label}: the window keeps every shortest trip`);
    assert.equal(p.solution.fewest, open.n);
    assert.equal(p.solution.trips, open.words.length, `${label}: ${open.words.length} shortest trips`);
    assert.ok(open.words.includes(p.solution.word), `${label}: the witness is a shortest trip`);
    trips += open.words.length;
    // The top level is one above the highest any shortest trip climbs, or the sixth line.
    const highest = Math.max(...open.words.map(w => Math.max(...[...w].reduce((hs, c) => [...hs, hs.at(-1) + (c === 'U') - (c === 'D')], [0]))));
    assert.equal(q.levels - 1, Math.min(highest + 1, 5), `${label}: one spare level`);
    if (p.difficulty_level === 'hard' && !q.farthest) {
      const noLeft = deepen(OPEN, t, 'UDR');
      assert.equal(p.solution.noLeft, noLeft.n, `${label}: fewest without a left step`);
      assert.ok(noLeft.n > open.n, `${label}: a left step saves`);
      assert.ok(open.words.every(w => w.includes('L')), `${label}: every shortest trip steps left`);
    }
    if (q.farthest) {
      // The target is the farthest a trip of the budget can end, on an open
      // board and in the window, and only the shortest trips end there.
      assert.equal(t, bound(q.budget), `${label}: the target is max over H of (N − 2H)·2^H`);
      const far = listed.far.slice(0, q.budget + 1);
      assert.equal(Math.max(...far), t, `${label}: no trip of ${q.budget} moves ends beyond ${t}`);
      for (let n = 0; n < q.budget; n++) assert.ok(far[n] < t, `${label}: fewer moves never reach ${t}`);
    }

    // The witness through the engine.
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${label}: fresh board is valid`);
    assert.ok(!isSolved(p, fresh.board), `${label}: not solved at the start`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 500, `${label}: renders`);
    for (const word of open.words) {
      const a = play(p, fresh, word);
      assert.ok(a && isSolved(p, a.board), `${label}: ${word} solves`);
      assert.equal(move(p, a, {type: 'move', dir: 'U'}), null, `${label}: nothing after a solve`);
    }

    // Hints alone, from a fresh board, after a wasted move, and with the budget spent.
    hintSteps += hintRun(p, fresh, label);
    const waste = ['L', 'R', 'U'].find(dir => { const a = play(p, fresh, dir); return a && nextHint(p, a).type === 'deadend'; });
    assert.ok(waste, `${label}: some first move wastes a move`);
    let wasted = play(p, fresh, waste);
    assert.equal(nextHint(p, wasted).type, 'deadend', `${label}: a wasted move is a dead end`);
    assert.match(nextHint(p, wasted).text, /Undo\.$/);
    hintSteps += hintRun(p, undoToSolvable(p, wasted), `${label} after Undo`);
    while (wasted.board.word.length < q.budget) wasted = play(p, wasted, ['U', 'R', 'D', 'L'].find(dir => play(p, wasted, dir)));
    assert.ok(!isSolved(p, wasted.board));
    assert.equal(nextHint(p, wasted).type, 'deadend', `${label}: a spent budget is a dead end`);
    hintSteps += hintRun(p, undoToSolvable(p, wasted), `${label} after Undo from a spent budget`);

    // Illegal moves: down from the ground, up from the top level, off the
    // window, past the budget, and anything that is not a move.
    assert.equal(move(p, fresh, {type: 'move', dir: 'D'}), null, `${label}: no going below the ground`);
    const top = play(p, fresh, 'U'.repeat(q.levels - 1));
    assert.ok(top, `${label}: the top level is reachable`);
    assert.equal(move(p, top, {type: 'move', dir: 'U'}), null, `${label}: no going above the top level`);
    // Off the window: the nearest place within the budget where a step left
    // or right would leave it, found in the simulator, then refused.
    for (const dir of ['L', 'R']) {
      const word = edgeWord(board, dir, q.budget - 1);
      if (word === null) continue;
      const there = play(p, fresh, word);
      assert.ok(there && !isSolved(p, there.board), `${label}: ${word} reaches the ${dir === 'L' ? 'left' : 'right'} edge`);
      assert.equal(move(p, there, {type: 'move', dir}), null, `${label}: no stepping off the window after ${word}`);
      assert.equal(validBoard(p, {word: word + dir}), false, `${label}: a save that steps off the window`);
      edges++;
    }
    let full = fresh;
    for (let i = 0; i < q.budget && !isSolved(p, full.board); i++) full = play(p, full, ['U', 'L', 'D', 'R'].find(dir => play(p, full, dir)));
    if (!isSolved(p, full.board)) assert.equal(['U', 'D', 'L', 'R'].map(dir => move(p, full, {type: 'move', dir})).filter(Boolean).length, 0, `${label}: no move past the budget`);
    for (const action of [{type: 'move', dir: 'X'}, {type: 'move'}, {type: 'clear'}, {type: 'jump', dir: 'U'}, {dir: 'U'}, null, 'U']) {
      assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
      refusals++;
    }

    // Forged saves.
    const forged = [{word: 'D'}, {word: 'UDD'}, {word: 'U'.repeat(q.levels)}, {word: 'X'}, {word: 'u'}, {word: ['U']}, {word: 'U'.repeat(q.budget + 1)}, {word: p.solution.word + 'L'}, {}, {word: '', extra: 1}, {moves: ''}, null, 'U'];
    for (const f of forged) {
      assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
      forgeries++;
    }
  }

  // The playground: moves anywhere in its window, Clear; never solved, no hints.
  assert.ok(playground);
  assert.equal(playground.mechanic, 'elevator'); assert.equal(playground.parameters.mode, 'playground');
  const pq = playground.parameters, pb = boardOf(pq);
  let a = freshAttempt(playground);
  assert.ok(validBoard(playground, a.board));
  assert.equal(mechanicFor(playground).noHint(playground), true);
  assert.equal(nextHint(playground, a).type, 'note');
  a = play(playground, a, 'UUUUURRDDDDD');
  assert.deepEqual(end(pb, a.board.word), [64, 0], 'twelve moves reach 64');
  assert.ok(!isSolved(playground, a.board), 'the playground is never solved');
  assert.equal(move(playground, a, {type: 'move', dir: 'D'}), null, 'no going below the ground');
  assert.equal(move(playground, play(playground, a, 'UUUUU'), {type: 'move', dir: 'U'}), null, 'no going above level 5');
  assert.equal(move(playground, play(playground, a, 'UUUU'), {type: 'move', dir: 'R'}), null, 'no stepping past 72');
  assert.equal(move(playground, a, {type: 'clear'}).board.word, '', 'Clear');
  assert.equal(move(playground, freshAttempt(playground), {type: 'clear'}), null, 'nothing to clear');
  for (const f of [{word: 'D'}, {word: 'UUUUUU'}, {word: 'L'.repeat(9)}, {word: 'UR'.repeat(101)}, {word: 'X'}, {word: '', extra: 1}, {}]) {
    assert.equal(validBoard(playground, f), false, `playground rejects ${JSON.stringify(f).slice(0, 60)}`);
    forgeries++;
  }
  return {puzzles: puzzles.length, shortestTrips: trips, wordsListed: theoremWords, hintSteps, refusals, windowEdges: edges, forgeries};
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateElevators(), null, 2));
