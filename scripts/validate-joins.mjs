// Checks the Joining strips pack (dist/families/joins/joins.json) by methods
// unlike the mechanic's: collections are generated smallest strip first and
// counted by generating functions; strips are kept as counts by length and
// connected collections found by a breadth-first search over those counts
// (never through the all-odd form); fewest moves and "needs both kinds" come
// from that search; partners come from binary digits; Flip is a transposed
// grid of squares. Then witnesses as moves, hint chains from fresh, after a
// wasted move, after a wrong That's all, a wrong Can't and wandering,
// illegal moves, forged saves, Undo keeping claims, and the playground.
// Run: node scripts/validate-joins.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// --- An independent model -----------------------------------------------------
const oddOf = list => list.flatMap(x => { let k = 1; while (x % 2 === 0) { x /= 2; k *= 2; } return Array(k).fill(x); }).sort((x, y) => y - x);
const canon = list => [...list].sort((x, y) => y - x).join(',');
// Collections of n, built smallest strip first.
function upward(n, least = 1) {
  if (n === 0) return [[]];
  const out = [];
  for (let s = least; s <= n; s++) for (const rest of upward(n - s, s)) out.push([s, ...rest]);
  return out;
}
// Coefficients of a product of power series, up to x^n.
function series(n, factor) {
  let c = Array.from({length: n + 1}, (_, i) => (i === 0 ? 1 : 0));
  for (let k = 1; k <= n; k++) { const f = factor(k, n); if (!f) continue; const next = Array(n + 1).fill(0); for (let i = 0; i <= n; i++) if (c[i]) for (const [e, m] of f) if (i + e <= n) next[i + e] += c[i] * m; c = next; }
  return c;
}
const pCount = n => series(n, (k, N) => Array.from({length: Math.floor(N / k) + 1}, (_, j) => [j * k, 1]))[n];
const qCount = n => series(n, k => [[0, 1], [k, 1]])[n];
const oddCount = n => series(n, (k, N) => k % 2 ? Array.from({length: Math.floor(N / k) + 1}, (_, j) => [j * k, 1]) : null)[n];
const atMost = (n, k) => upward(n).filter(c => c.length <= k).length;
// Counts by length; a move joins two of a length or halves an even one.
const counts = list => list.reduce((m, x) => ({...m, [x]: (m[x] || 0) + 1}), {});
const listOf = m => Object.entries(m).flatMap(([s, c]) => Array(c).fill(Number(s)));
function steps(list, kinds = ['join', 'halve']) {
  const m = counts(list), out = [];
  for (const [s0, c] of Object.entries(m)) {
    const s = Number(s0);
    if (kinds.includes('join') && c >= 2) out.push({kind: 'join', next: listOf({...m, [s]: c - 2, [2 * s]: (m[2 * s] || 0) + 1}).filter(Boolean)});
    if (kinds.includes('halve') && s % 2 === 0) out.push({kind: 'halve', next: listOf({...m, [s]: c - 1, [s / 2]: (m[s / 2] || 0) + 2})});
  }
  return out.map(o => ({kind: o.kind, next: o.next.filter(x => x > 0)}));
}
function search(start, kinds) {
  const d = new Map([[canon(start), 0]]), queue = [start];
  for (let i = 0; i < queue.length; i++) for (const {next} of steps(queue[i], kinds)) if (!d.has(canon(next))) { d.set(canon(next), d.get(canon(queue[i])) + 1); queue.push(next); }
  return d;
}
// Partner by binary digits: u appearing m times becomes u·2^j for each 1-digit of m.
function partner(odd) {
  const m = counts(odd), out = [];
  for (const [u, c] of Object.entries(m)) for (let j = 0; (c >> j) > 0; j++) if ((c >> j) & 1) out.push(Number(u) * 2 ** j);
  return canon(out);
}
// Flip: a grid of squares read by columns.
function flip(list) {
  const width = Math.max(...list), grid = list.map(x => Array.from({length: width}, (_, k) => k < x));
  return Array.from({length: width}, (_, k) => grid.filter(row => row[k]).length);
}
const kindOk = (q, c) => q.kind === 'odd' ? c.every(x => x % 2) : q.kind === 'distinct' ? new Set(c).size === c.length : q.kind === 'parts' ? c.length <= q.k : true;

// The table in docs/joins/README.md.
const TABLE = {
  'joins-01': {mode: 'reach', start: '2,2,2,1,1', goal: '8', fewest: 4, kinds: 'join'},
  'joins-02': {mode: 'catalog', kind: 'all', total: 5, count: 7},
  'joins-03': {mode: 'catalog', kind: 'odd', total: 7, count: 5},
  'joins-04': {mode: 'catalog', kind: 'distinct', total: 7, count: 5},
  'joins-05': {mode: 'match', total: 8, count: 6},
  'joins-06': {mode: 'reach', start: '4,3,3', goal: '6,1,1,1,1', fewest: 4, kinds: 'both'},
  'joins-07': {mode: 'reach', start: '10,2', goal: '6,6', fewest: null},
  'joins-08': {mode: 'catalog', kind: 'parts', k: 3, total: 8, count: 10},
  'joins-09': {mode: 'catalog', kind: 'all', total: 8, count: 22},
  'joins-10': {mode: 'catalog', kind: 'distinct', total: 11, count: 12},
  'joins-11': {mode: 'reach', start: '8,1,1,1,1,1,1', goal: '2,2,2,2,2,2,2', fewest: 6, kinds: 'both'},
  'joins-12': {mode: 'reach', start: '6,2,2', goal: '4,3,2,1', fewest: null}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let n = 0;
  for (; !isSolved(p, a.board) && n < 400; n++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 3, `${p.id} ${label}: a hint in words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return n;
}
// Undo as the app does it: the previous board, through the mechanic's carry.
const undo = (p, a) => ({...a, board: mechanicFor(p).carry(p, a.board, a.history.at(-1).board), history: a.history.slice(0, -1)});
// A small seeded random walk of legal moves, for wandering.
function wander(p, a, n, seed) {
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < n; i++) {
    const b = a.board, list = b.bench;
    if (!list) break;
    const sizes = [...new Set(list)], tries = [];
    for (const x of sizes) { if (list.filter(y => y === x).length > 1) tries.push({type: 'join', sizes: [x, x]}); if (x % 2 === 0) tries.push({type: 'cut', size: x, at: x / 2}); if (p.parameters.mode === 'catalog' && x > 2) tries.push({type: 'cut', size: x, at: x - 1}); }
    if (!tries.length) break;
    const next = move(p, a, tries[Math.floor(rnd() * tries.length)]);
    if (next && !isSolved(p, next.board)) a = next;
  }
  return a;
}

export async function validateJoins() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/joins/joins.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-54')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-54.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'joins');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems, by the model: Euler's odd = distinct, Flip's swap, and
  // connection by joins and halvings exactly when partners agree.
  for (let n = 1; n <= 16; n++) {
    const list = upward(n);
    assert.equal(list.length, pCount(n), `p(${n}) by generation and by series`);
    const odd = list.filter(c => c.every(x => x % 2)), distinct = list.filter(c => new Set(c).size === c.length);
    assert.equal(odd.length, oddCount(n)); assert.equal(distinct.length, qCount(n)); assert.equal(odd.length, distinct.length, `Euler at ${n}`);
    assert.deepEqual(odd.map(partner).sort(), distinct.map(canon).sort(), `joining pairs odd with distinct at ${n}`);
    for (let k = 1; k <= n; k++) assert.deepEqual(list.filter(c => c.length <= k).map(c => canon(flip(c))).sort(), list.filter(c => Math.max(...c) <= k).map(canon).sort(), `Flip swaps at most ${k} strips and strips at most ${k}, total ${n}`);
    if (n <= 12) {
      const seen = new Set();
      for (const c of list) {
        if (seen.has(canon(c))) continue;
        const comp = [...search(c).keys()];
        comp.forEach(k => seen.add(k));
        const members = comp.map(k => k.split(',').map(Number));
        assert.equal(members.filter(m => m.every(x => x % 2)).length, 1, `one all-odd collection in each class, total ${n}`);
        assert.equal(members.filter(m => new Set(m).size === m.length).length, 1, `one all-different collection in each class, total ${n}`);
      }
    }
  }

  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'joins');
    assert.ok(p.id.startsWith('joins-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(!/press can.t/i.test(p.hints[0]), `${p.id}: the first hint never says Can't`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    if (q.mode === 'catalog') hintSteps += checkCatalog(p, fresh, row);
    else if (q.mode === 'reach') hintSteps += checkReach(p, fresh, row);
    else hintSteps += checkMatch(p, fresh, row);
    // No visible count: no objective names the number of answers.
    assert.ok(!/\b\d+ (collections|ways)\b/.test(p.visibleObjective + p.objective), `${p.id}: no count in the goal`);
  }
  return {joinsPuzzles: puzzles.length, hintSteps};
}

function checkCatalog(p, fresh, row) {
  const q = p.parameters;
  assert.equal(q.kind, row.kind); assert.equal(q.total, row.total); assert.equal(q.span, q.total);
  assert.deepEqual(q.start, [q.total], `${p.id}: starts from one strip`);
  const answers = upward(q.total).filter(c => kindOk(q, c)).map(canon);
  assert.equal(answers.length, row.count, `${p.id}: catalog size`);
  const expected = row.kind === 'all' ? pCount(q.total) : row.kind === 'odd' ? oddCount(q.total) : row.kind === 'distinct' ? qCount(q.total) : atMost(q.total, q.k);
  assert.equal(expected, row.count, `${p.id}: the count by series`);
  assert.deepEqual(p.solution.answers.map(canon).sort(), [...answers].sort(), `${p.id}: the pack's answers`);
  assert.equal(Boolean(q.flip), row.kind === 'parts', `${p.id}: Flip only in the at-most-k catalog`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  // Witness: each answer made from one strip by cuts, kept, then That's all.
  let a = fresh;
  for (const c of answers) {
    a = {...a, board: {...a.board, bench: [q.total]}};
    const parts = c.split(',').map(Number);
    let left = q.total;
    for (const s of parts.slice(0, -1)) { a = play(p, a, {type: 'cut', size: left, at: Math.max(s, left - s)}); left -= s; }
    assert.equal(canon(a.board.bench), c, `${p.id}: ${c} made by cuts`);
    a = play(p, a, {type: 'keep'});
    if (canon(a.board.bench) === c && a.board.shelf.length === 1) {
      refuse(p, a, {type: 'keep'}, 'keeping the same collection twice');
      const early = play(p, a, {type: 'all'});
      assert.equal(early.board.more, true, `${p.id}: there is another`);
      refuse(p, early, {type: 'all'}, 'That’s all twice without a new collection');
      steps += hintsSolve(p, early, 'after a wrong That’s all');
      // Undo keeps the shelf and the refusal.
      const top = early.board.bench[0];
      const back = undo(p, play(p, early, top > 1 ? {type: 'cut', size: top, at: top - 1} : {type: 'join', sizes: [1, 1]}));
      assert.equal(back.board.more, true, `${p.id}: Undo keeps the wrong That’s all`);
      assert.equal(back.board.shelf.length, 1, `${p.id}: Undo keeps the shelf`);
    }
  }
  for (let u = a; u.history.length; u = undo(p, u)) assert.notEqual(JSON.stringify(undo(p, u).board), JSON.stringify(u.board), `${p.id}: every Undo changes the board`);
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: every answer kept, then That’s all`);
  // A refused keep points: a non-fitting collection is not kept.
  const misfit = upward(q.total).find(c => !kindOk(q, c));
  if (misfit) {
    const b = {...fresh.board, bench: [...misfit].sort((x, y) => y - x)};
    assert.ok(validBoard(p, b));
    refuse(p, {...fresh, board: b}, {type: 'keep'}, 'a collection that does not fit');
    assert.equal(validBoard(p, {...fresh.board, shelf: [b.bench]}), false, `${p.id}: rejects a shelf holding a misfit`);
  }
  steps += hintsSolve(p, wander(p, fresh, 12, 7), 'after wandering');
  for (const [action, why] of [[null, 'nothing'], [{type: 'join', sizes: [q.total, 1]}, 'joining strips that are not there'], [{type: 'cut', size: q.total, at: 0}, 'a cut at the end'], [{type: 'cut', size: q.total, at: q.total}, 'a cut past the end'], [{type: 'cut', size: q.total + 1, at: 1}, 'cutting a strip that is not there'], [{type: 'all'}, 'That’s all with nothing kept'], [{type: 'cant'}, 'Can’t'], [{type: 'load', card: 0}, 'taking a card'], [{type: 'add'}, 'adding a strip'], [{type: 'cut', size: q.total, at: 1, side: 'goal'}, 'a goal move'], [{type: 'fly'}, 'an unknown move'], ...(q.flip ? [] : [[{type: 'flip'}, 'Flip outside the at-most-k catalog']])]) refuse(p, fresh, action, why);
  const B = fresh.board;
  for (const [board, why] of [[{...B, bench: [q.total - 1]}, 'a bench of the wrong total'], [{...B, bench: [1, q.total - 1]}, 'a bench not longest first'], [{...B, bench: [q.total, 0]}, 'a strip of length 0'], [{...B, shelf: [[q.total], [q.total]]}, 'a collection kept twice'], [{...B, done: true}, 'done with nothing kept'], [{...B, more: true}, '“there is another” with nothing kept'], [{...B, extra: 1}, 'an unknown field'], [{...B, shelf: answers.map(c => c.split(',').map(Number)), more: true}, '“there is another” when none is']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkReach(p, fresh, row) {
  const q = p.parameters;
  assert.equal(q.start.join(), row.start); assert.equal(q.goal.join(), row.goal);
  const d = search(q.start), can = d.has(canon(q.goal));
  assert.equal(can, row.fewest !== null, `${p.id}: reachable or not, by search`);
  // The longest strip that can appear: on the bench, and in the goal when only halved.
  assert.equal(q.span, Math.max(...[...d.keys()].map(k => Number(k.split(',')[0])), can ? 0 : q.goal[0]), `${p.id}: span`);
  let steps = 0;
  if (can) {
    assert.equal(d.get(canon(q.goal)), row.fewest, `${p.id}: fewest moves`);
    assert.equal(p.solution.fewest, row.fewest);
    const joins = search(q.start, ['join']).has(canon(q.goal)), halves = search(q.start, ['halve']).has(canon(q.goal));
    assert.equal(row.kinds === 'both', !joins && !halves, `${p.id}: ${row.kinds === 'both' ? 'needs both kinds of move' : 'one kind is enough'}`);
    let a = fresh;
    for (const m of p.solution.moves) a = play(p, a, m);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    assert.equal(p.solution.moves.length, row.fewest);
    // A wrong Can't: the child halves both rows, they match, and it is
    // refused only then. The refusal survives Undo until the bench moves.
    let wrong = play(p, play(p, fresh, p.solution.moves[0]), {type: 'cant'});
    assert.equal(wrong.board.claim, 'halving', `${p.id}: Can’t is not judged at the press`);
    assert.ok(!/press can/i.test(nextHint(p, play(p, fresh, p.solution.moves[0])).text), `${p.id}: no "Press Can’t" in a hint`);
    const before = wrong;
    wrong = halveAll(p, wrong);
    assert.equal(wrong.board.claim, 'refused', `${p.id}: matching halves refuse the claim`);
    assert.equal(canon(wrong.board.goal), canon(wrong.board.bench), `${p.id}: the goal stays halved, matching the bench`);
    assert.ok(wrong.board.bench.every(x => x % 2), `${p.id}: the bench stays halved`);
    refuse(p, wrong, {type: 'cant'}, 'Can’t again on the same board');
    const back = undo(p, wrong);
    assert.equal(back.board.claim, 'refused', `${p.id}: Undo keeps the refusal`);
    assert.notEqual(canon(back.board.goal) + '|' + canon(back.board.bench), canon(wrong.board.goal) + '|' + canon(wrong.board.bench), `${p.id}: Undo after a refusal changes what is drawn`);
    assert.ok(validBoard(p, back.board), `${p.id}: the undone board is valid`);
    refuse(p, back, {type: 'cant'}, 'Can’t again after Undo');
    const pair = wrong.board.bench.find((x, k, r) => r[k + 1] === x);
    const moved = play(p, wrong, {type: 'join', sizes: [pair, pair]});
    assert.equal(moved.board.claim, null, `${p.id}: a new move clears the refusal`);
    assert.deepEqual(moved.board.goal, q.goal, `${p.id}: and brings the goal back whole`);
    steps += hintsSolve(p, before, 'inside a wrong Can’t');
    steps += hintsSolve(p, wrong, 'after a wrong Can’t');
    steps += hintsSolve(p, back, 'after a wrong Can’t and Undo');
  } else {
    assert.ok(row.fewest === null);
    // The certificate: both sides halved all the way differ.
    const halved = list => canon([...search(list, ['halve']).keys()].map(k => k.split(',').map(Number)).find(c => c.every(x => x % 2)));
    assert.notEqual(halved(q.start), halved(q.goal), `${p.id}: the all-odd forms differ`);
    assert.equal(canon(p.solution.start), halved(q.start)); assert.equal(canon(p.solution.goal), halved(q.goal));
    refuse(p, fresh, {type: 'cant'}, 'Can’t before any move');
    const first = nextHint(p, fresh);
    assert.notEqual(first.action.type, 'cant', `${p.id}: the hints try a move before Can’t`);
    let a = play(p, fresh, first.action);
    a = play(p, a, {type: 'cant'});
    assert.equal(a.board.claim, 'halving', `${p.id}: Can’t starts the halving`);
    assert.ok(!isSolved(p, a.board), `${p.id}: not solved until both rows are halved`);
    const pair = a.board.bench.find((x, k, r) => r[k + 1] === x);
    if (pair) refuse(p, a, {type: 'join', sizes: [pair, pair]}, 'a join after Can’t');
    refuse(p, play(p, fresh, first.action), {type: 'cut', size: q.goal.find(x => x % 2 === 0), at: q.goal.find(x => x % 2 === 0) / 2, side: 'goal'}, 'halving the goal before Can’t');
    // Undo inside the halving takes back halvings; nothing has been judged.
    const g = q.goal.find(x => x % 2 === 0);
    const halfGoal = play(p, a, {type: 'cut', size: g, at: g / 2, side: 'goal'});
    const back = undo(p, halfGoal);
    assert.equal(back.board.claim, 'halving');
    assert.ok(validBoard(p, back.board), `${p.id}: the undone board is valid`);
    let walk = fresh, last = nextHint(p, walk);
    while (last.action.type !== 'cant') { walk = play(p, walk, last.action); last = nextHint(p, walk); }
    assert.ok(walk.board.bench.every(x => x % 2), `${p.id}: the hints halve the bench before Can’t`);
    assert.ok(!/press can/i.test(last.text), `${p.id}: the hint gives the reason, not "Press Can’t"`);
    steps += hintsSolve(p, a, 'after Can’t');
    steps += hintsSolve(p, back, 'after Can’t and Undo');
    // The child's own certificate: every even strip halved on both rows.
    const c = halveAll(p, a);
    assert.ok(isSolved(p, c.board), `${p.id}: different halves solve it`);
    assert.equal(canon(c.board.bench), halved(q.start)); assert.equal(canon(c.board.goal), halved(q.goal));
  }
  steps += hintsSolve(p, fresh, 'from fresh');
  // A wasted move first: any legal move away from the shortest route.
  for (const m of [...new Set(q.start)].flatMap(x => [...(q.start.filter(y => y === x).length > 1 ? [{type: 'join', sizes: [x, x]}] : []), ...(x % 2 === 0 ? [{type: 'cut', size: x, at: x / 2}] : [])])) {
    const b = play(p, fresh, m);
    if (!isSolved(p, b.board)) steps += hintsSolve(p, b, `after ${JSON.stringify(m)}`);
  }
  steps += hintsSolve(p, wander(p, fresh, 10, 11), 'after wandering');
  const unequal = [...new Set(q.start)];
  if (unequal.length > 1) refuse(p, fresh, {type: 'join', sizes: [unequal[0], unequal[1]]}, 'joining unequal strips');
  const odd = q.start.find(x => x % 2 === 1 && x > 1);
  if (odd) refuse(p, fresh, {type: 'cut', size: odd, at: (odd - 1) / 2}, 'cutting an odd strip');
  const even = q.start.find(x => x % 2 === 0 && x > 2);
  if (even) refuse(p, fresh, {type: 'cut', size: even, at: 1}, 'a cut off the middle');
  for (const [action, why] of [[{type: 'keep'}, 'Keep'], [{type: 'all'}, 'That’s all'], [{type: 'flip'}, 'Flip'], [{type: 'load', card: 0}, 'taking a card'], [{type: 'join', sizes: [99, 99]}, 'joining strips that are not there'], [{type: 'join', sizes: [1]}, 'a join of one strip'], [{type: 'cut', size: 2, at: 1, side: 'moon'}, 'an unknown row']]) refuse(p, fresh, action, why);
  const B = fresh.board, other = upward(sum(q.start)).find(c => !search(q.start).has(canon(c)));
  for (const [board, why] of [[{...B, bench: [...q.start].reverse()}, 'a bench not longest first'], [{...B, tried: true, bench: other.sort((x, y) => y - x)}, 'a bench no moves reach'], [{...B, bench: q.goal}, 'a moved bench with no try'], [{...B, claim: 'wrong'}, 'a claim before any try'], [{...B, tried: true, claim: 'refused', ...(can ? {goal: [...other].sort((x, y) => y - x)} : {})}, can ? 'a refusal with a changed goal' : 'a refusal of a true Can’t'], ...(can ? [[{...B, tried: true, claim: 'halving', bench: oddOf(q.start), goal: oddOf(q.goal)}, 'a claim left unjudged with both rows matching']] : []), [{...B, tried: true, goal: [...q.start]}, 'a changed goal'], [{...B, claim: 'maybe', tried: true}, 'an unknown claim'], [{...B, extra: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}
const sum = list => list.reduce((s, x) => s + x, 0);
// After Can't: halve every even strip on the bench, then in the goal.
function halveAll(p, a) {
  while (a.board.claim === 'halving' && !isSolved(p, a.board)) {
    const e = a.board.bench.find(x => x % 2 === 0), f = a.board.goal.find(x => x % 2 === 0);
    a = e ? play(p, a, {type: 'cut', size: e, at: e / 2}) : play(p, a, {type: 'cut', size: f, at: f / 2, side: 'goal'});
  }
  return a;
}

function checkMatch(p, fresh, row) {
  const q = p.parameters;
  const odd = upward(row.total).filter(c => c.every(x => x % 2)).map(canon);
  assert.deepEqual(q.cards.map(canon).sort(), [...odd].sort(), `${p.id}: every odd collection is a card`);
  assert.equal(q.cards.length, row.count);
  assert.deepEqual(p.solution.pairs.map(([o, d]) => [canon(o), canon(d)]), q.cards.map(c => [canon(c), partner(c)]), `${p.id}: partners by binary digits`);
  assert.equal(q.span, Math.max(...q.cards.map(c => Math.max(...[...search(c).keys()].map(k => Number(k.split(',')[0]))))), `${p.id}: span`);
  // Witness: load each card and join equal strips, smallest first.
  let a = fresh;
  for (let i = 0; i < q.cards.length; i++) {
    a = play(p, a, {type: 'load', card: i});
    while (a.board.card === i) { const b = a.board.bench, s = b.slice().reverse().find((x, k, r) => r[k + 1] === x); a = play(p, a, {type: 'join', sizes: [s, s]}); }
    assert.ok(a.board.paired.includes(i), `${p.id}: card ${i} pairs`);
  }
  assert.ok(isSolved(p, a.board), `${p.id}: every card paired`);
  for (let u = {...a, history: a.history.slice(0, -1)}; u.history.length; u = undo(p, u)) assert.notEqual(JSON.stringify(undo(p, u).board), JSON.stringify(u.board), `${p.id}: every Undo changes the board`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  // A card taken, a halving back and forth, then hints; and Undo after a pair.
  const multi = q.cards.findIndex(c => new Set(c).size < c.length);
  let b = play(p, fresh, {type: 'load', card: multi});
  refuse(p, b, {type: 'load', card: multi}, 'taking the same card again');
  const s = b.board.bench.find((x, k, r) => r[k + 1] === x);
  b = play(p, b, {type: 'join', sizes: [s, s]});
  if (b.board.card !== null) b = play(p, b, {type: 'cut', size: 2 * s, at: s});
  steps += hintsSolve(p, b, 'after a join taken back');
  const lone = q.cards.findIndex(c => new Set(c).size === c.length);
  const paired = play(p, fresh, {type: 'load', card: lone});
  assert.deepEqual(paired.board.paired, [lone], `${p.id}: an all-different odd card pairs at once`);
  refuse(p, paired, {type: 'load', card: lone}, 'taking a paired card');
  for (const [action, why] of [[{type: 'join', sizes: [1, 1]}, 'a join with nothing taken'], [{type: 'load', card: -1}, 'an unknown card'], [{type: 'load', card: q.cards.length}, 'an unknown card'], [{type: 'keep'}, 'Keep'], [{type: 'cant'}, 'Can’t']]) refuse(p, fresh, action, why);
  const B = fresh.board;
  for (const [board, why] of [[{...B, card: 0}, 'a card with no bench'], [{...B, bench: [8]}, 'a bench with no card'], [{bench: [8], card: q.cards.findIndex(c => canon(c) === '3,3,1,1'), paired: []}, 'a bench in another class'], [{...B, paired: [0, 0]}, 'a card paired twice'], [{...B, paired: [99]}, 'an unknown card paired'], [{bench: [...q.cards[multi]].reverse(), card: multi, paired: []}, 'a bench not longest first'], [{...B, extra: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  let a = play(p, fresh, {type: 'join', sizes: [3, 3]});
  a = play(p, a, {type: 'join', sizes: [1, 1]});
  a = play(p, a, {type: 'join', sizes: [1, 1]});
  a = play(p, a, {type: 'join', sizes: [2, 2]});
  assert.equal(canon(a.board.bench), '6,4', `${p.id}: joins end at 6, 4`);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  refuse(p, a, {type: 'join', sizes: [6, 4]}, 'an unequal join');
  refuse(p, a, {type: 'remove'}, 'taking away a 1 when there is none');
  let b = fresh;
  while (sum(b.board.bench) < q.max) b = play(p, b, {type: 'add'});
  refuse(p, b, {type: 'add'}, 'a total past the most');
  b = play(p, b, {type: 'remove'});
  assert.equal(sum(b.board.bench), q.max - 1);
  for (const [board, why] of [[{bench: [17]}, 'a total past the most'], [{bench: [1, 3]}, 'a bench not longest first'], [{bench: []}, 'an empty bench'], [{bench: [3], extra: 1}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateJoins;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateJoins(), null, 2));
