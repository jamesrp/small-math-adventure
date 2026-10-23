// Checks the Sliding numbers pack (dist/families/taquin/taquin.json) by
// methods unlike the mechanic's: starts are every permutation of 1, …, n that
// grows along rows and columns (not grown number by number); a start's finish
// is the insertion tableau of its reading word (Schensted row insertion,
// rows read left to right from the bottom row up), never a slide; orders of
// the gray squares are permutations of them whose every step removes a
// corner, counted again by the hook length formula. Then every start of every
// board is played to its end through the engine in every order of corners and
// compared with insertion; the answers, counts and uniqueness claims in the
// pack and the grown-up notes; hint chains from fresh, after wrong That's
// alls, after random play and after Undo; illegal moves; forged saves; Undo
// keeping the shelf, the goals met and a refused That's all, with every press
// changing the screen; and the playground.
// Run: node scripts/validate-taquin.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
// Read only to see the finished grid; every answer is recomputed below by insertion.
import {runOf, finishRows} from '../dist/families/taquin/taquin.js';

// --- An independent model ------------------------------------------------------
const cellsOf = (outer, inner) => outer.flatMap((l, r) => Array.from({length: l - (inner[r] || 0)}, (_, k) => [r, (inner[r] || 0) + k]));
function permutations(n) {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap(p => Array.from({length: n}, (_, i) => [...p.slice(0, i), n, ...p.slice(i)]));
}
const key = list => list.join(',');
function starts(outer, inner) {
  const cells = cellsOf(outer, inner), where = new Map(cells.map(([r, c], i) => [`${r},${c}`, i]));
  return permutations(cells.length).filter(f => cells.every(([r, c], i) => {
    const up = where.get(`${r - 1},${c}`), left = where.get(`${r},${c - 1}`);
    return (up === undefined || f[up] < f[i]) && (left === undefined || f[left] < f[i]);
  })).sort((a, b) => key(a) < key(b) ? -1 : 1);
}
function insertion(word) {
  const P = [];
  for (let x of word) {
    for (let r = 0; ; r++) {
      if (!P[r]) { P[r] = [x]; break; }
      const k = P[r].findIndex(y => y > x);
      if (k < 0) { P[r].push(x); break; }
      [P[r][k], x] = [x, P[r][k]];
    }
  }
  return P;
}
function finishByInsertion(outer, inner, f) {
  const cells = cellsOf(outer, inner);
  const word = [];
  for (let r = outer.length - 1; r >= 0; r--) cells.forEach(([y], i) => { if (y === r) word.push(f[i]); });
  return insertion(word);
}
const rowsKey = rows => rows.map(key).join('/');
const shapeKey = rows => key(rows.map(r => r.length));
const shapeOfKey = k => key(k.split('/').map(r => r.split(',').length));
// Orders of opening the gray squares: permutations of the inner cells whose
// every step takes a corner of what is left.
function orders(inner) {
  const cells = cellsOf(inner, []);
  return permutations(cells.length).map(p => p.map(i => i - 1)).filter(order => {
    const rows = [...inner];
    return order.every(i => { const [r, c] = cells[i]; const ok = rows[r] === c + 1 && (rows[r + 1] || 0) <= c; if (ok) rows[r]--; return ok; });
  });
}
function hooks(shape) {
  let n = shape.reduce((t, x) => t + x, 0), f = 1, h = 1;
  for (let k = 2; k <= n; k++) f *= k;
  shape.forEach((l, r) => { for (let c = 0; c < l; c++) h *= (l - c - 1) + shape.filter((m, s) => s > r && m > c).length + 1; });
  return f / h;
}

// --- Play through the engine ---------------------------------------------------
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next && next !== x, `${p.id}: ${JSON.stringify(action)} is legal from ${JSON.stringify(x.board)}`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const takeBack = (p, a) => { const b = undo(a); return b === a ? a : {...b, board: mechanicFor(p).carry(p, a.board, b.board)}; };
function seeded(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; }
// The grid seen independently: placing a start, then slides chosen by a plain
// reading of the rules, with corners opened in a given order.
function grid(outer, inner, f) {
  const G = outer.map((l, r) => Array.from({length: l}, (_, c) => (c < (inner[r] || 0) ? 0 : null)));
  if (f) cellsOf(outer, inner).forEach(([r, c], i) => { G[r][c] = f[i]; });
  return G;
}
const val = (G, r, c) => (G[r] && c < G[r].length ? G[r][c] : undefined);
// The actions that place f and open the corners in `order` (inner-cell indices).
function runActions(outer, inner, f, order, placing = true) {
  const cells = cellsOf(outer, inner), icells = cellsOf(inner, []), G = grid(outer, inner, f), out = [];
  if (placing) for (let k = 1; k <= f.length; k++) out.push({type: 'place', cell: f.indexOf(k)});
  for (const i of order) {
    let [r, c] = icells[i];
    out.push({type: 'open', at: [r, c]});
    for (;;) {
      const R = val(G, r, c + 1), B = val(G, r + 1, c), rn = R > 0 ? R : null, bn = B > 0 ? B : null;
      if (rn === null && bn === null) { G[r][c] = -2; break; }
      const [y, x] = bn === null || (rn !== null && rn < bn) ? [r, c + 1] : [r + 1, c];
      out.push({type: 'slide', at: [y, x]});
      G[r][c] = G[y][x]; G[y][x] = -1; [r, c] = [y, x];
    }
  }
  return out;
}

function hintSolve(p, a, limit = 400) {
  let k = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint names a move from ${JSON.stringify(a.board)}`);
    assert.ok(h.text && !/Can’t|Press That’s all/.test(h.text), `${p.id}: hint text`);
    a = play(p, a, [h.action]);
    assert.ok(++k <= limit, `${p.id}: hints finish within ${limit} moves`);
  }
  return k;
}
// Random legal play: a random control the board offers, as a child might tap.
function wander(p, a, rnd, steps) {
  const m = mechanicFor(p), q = p.parameters;
  for (let s = 0; s < steps && !isSolved(p, a.board); s++) {
    const html = m.render(p, {...a, hintLevel: 0}, {});
    const moves = [...html.matchAll(/data-move="([^"]+)"/g)].map(x => JSON.parse(x[1].replace(/&quot;/g, '"')));
    const live = moves.map(action => [action, move(p, a, action)]).filter(([, b]) => b);
    if (!live.length) break;
    const [, next] = live[Math.floor(rnd() * live.length)];
    a = isSolved(p, next.board) && q.mode !== 'playground' ? a : next;
  }
  return a;
}

export default async function validateTaquin() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/taquin/taquin.json', import.meta.url), 'utf8'));
  const report = {puzzles: 0, startsPlayed: 0, runsPlayed: 0, hintMoves: 0};
  const byId = id => pack.puzzles.find(p => p.id === id);
  for (const p of pack.puzzles) {
    const q = p.parameters, m = mechanicFor(p);
    if (q.mode === 'playground') { checkPlayground(p, report); continue; }
    report.puzzles++;
    const all = starts(q.outer, q.inner), ords = orders(q.inner);
    assert.equal(ords.length, hooks(q.inner), `${p.id}: orders = standard fillings of the gray shape`);
    // Every start, every order, through the engine: one finish, the insertion tableau.
    const finishes = new Map(all.map(f => [key(f), rowsKey(finishByInsertion(q.outer, q.inner, f))]));
    for (const f of q.mode === 'orders' ? [q.start] : all) for (const order of ords) {
      const a = play(p, freshAttempt(p), runActions(q.outer, q.inner, f, order, q.mode !== 'orders'));
      const run = runOf(q, a.board);
      report.runsPlayed++;
      assert.equal(run.phase, 'done', `${p.id}: ${f}, order ${order} ends with no gray`);
      assert.equal(rowsKey(finishRows(run.grid)), finishes.get(key(f)), `${p.id}: ${f}, order ${order} finishes as insertion says`);
    }
    report.startsPlayed += q.mode === 'orders' ? 1 : all.length;
    // Answers.
    if (q.mode === 'design') {
      const hits = all.filter(f => q.targets.some(t => (t.finish ? rowsKey(t.finish) === finishes.get(key(f)) : key(t.outline) === shapeOfKey(finishes.get(key(f))))));
      assert.equal(hits.length, p.solution.starts, `${p.id}: starts that reach a goal`);
      for (const t of q.targets) assert.ok(all.some(f => (t.finish ? rowsKey(t.finish) === finishes.get(key(f)) : key(t.outline) === shapeOfKey(finishes.get(key(f))))), `${p.id}: goal ${JSON.stringify(t)} is reachable`);
    } else {
      let answers;
      if (q.mode === 'fillings') answers = all.map(key);
      if (q.mode === 'starts') answers = all.filter(f => finishes.get(key(f)) === rowsKey(q.target)).map(key);
      if (q.mode === 'outlines') answers = [...new Set(all.map(f => shapeOfKey(finishes.get(key(f)))))];
      if (q.mode === 'orders') answers = ords.map(key);
      assert.deepEqual([...answers].sort(), p.solution.answers.map(key).sort(), `${p.id}: answers`);
      assert.equal(p.solution.count, answers.length, `${p.id}: count`);
    }
    // Copy never gives a count or an answer away.
    for (const text of [p.title, p.objective, p.visibleObjective, p.controls]) assert.ok(!/\d/.test(text), `${p.id}: no number in "${text}"`);
    const count = q.mode === 'design' ? p.solution.starts : p.solution.count, word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][count];
    for (const text of [p.title, p.objective, p.visibleObjective, p.hints[0]]) assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(text), `${p.id}: "${text}" does not give the answer count away`);
    checkShelfAndClaims(p);
    checkIllegal(p);
    checkSaves(p);
    // Hints: from fresh, after wandering, and after Undo.
    report.hintMoves += hintSolve(p, freshAttempt(p));
    for (let seed = 1; seed <= 6; seed++) {
      const rnd = seeded(seed * 97 + p.number);
      let a = wander(p, freshAttempt(p), rnd, 30 + seed * 7);
      report.hintMoves += hintSolve(p, a);
      for (let k = 0; k < 1 + seed % 3 && a.history.length; k++) a = takeBack(p, a);
      assert.ok(validBoard(p, a.board), `${p.id}: an undone board is valid`);
      report.hintMoves += hintSolve(p, a);
    }
    checkUndoPresses(p);
  }
  checkClaims(pack);
  assert.equal(pack.puzzles.filter(p => p.parameters.mode !== 'playground').length, 10);
  return report;
}

// That's all: off with an empty shelf; a refusal that names no count and
// holds it off until the shelf grows; kept by New run and Undo; complete solves.
function checkShelfAndClaims(p) {
  const q = p.parameters;
  if (q.mode === 'design') {
    // A goal met stays met through Undo.
    const f = p.solution.witnesses[0], actions = runActions(q.outer, q.inner, f, orders(q.inner)[0]);
    if (q.targets.length > 1) {
      const a = play(p, freshAttempt(p), actions);
      assert.equal(a.board.reached.length, 1, `${p.id}: one goal met`);
      const back = takeBack(p, a);
      assert.deepEqual(back.board.reached, a.board.reached, `${p.id}: Undo keeps a goal met`);
    } else {
      const a = play(p, freshAttempt(p), actions);
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    }
    return;
  }
  const fresh = freshAttempt(p);
  refuse(p, fresh, {type: 'all'}, 'That’s all with an empty shelf');
  const answers = p.solution.answers;
  const startOf = ans => (q.mode === 'fillings' || q.mode === 'starts') ? ans : q.mode === 'outlines' ? starts(q.outer, q.inner).find(f => shapeKey(finishByInsertion(q.outer, q.inner, f)) === key(ans)) : q.start;
  const orderOf = ans => q.mode === 'orders' ? ans : orders(q.inner)[0];
  let a = play(p, fresh, runActions(q.outer, q.inner, startOf(answers[0]), orderOf(answers[0]), q.mode !== 'orders'));
  assert.equal(a.board.shelf.length, 1, `${p.id}: a finished run joins the shelf`);
  if (answers.length > 1) {
    a = play(p, a, [{type: 'all'}]);
    assert.equal(a.board.more, true, `${p.id}: an incomplete shelf is refused`);
    assert.ok(!isSolved(p, a.board));
    refuse(p, a, {type: 'all'}, 'That’s all twice on one shelf');
    const html = mechanicFor(p).render(p, {...a, hintLevel: 0}, {});
    assert.ok(html.includes('There is another.') && !/There (are|is) \d/.test(html), `${p.id}: the refusal names no count`);
    a = play(p, a, [{type: 'new'}]);
    refuse(p, a, {type: 'all'}, 'That’s all after New run with the same shelf');
    let b = takeBack(p, takeBack(p, a));
    assert.equal(b.board.more, true, `${p.id}: Undo keeps the refusal`);
    assert.equal(b.board.shelf.length, 1, `${p.id}: Undo keeps the shelf`);
    // The rest of the answers, then That's all solves.
    for (const ans of answers.slice(1)) a = play(p, a, [...runActions(q.outer, q.inner, startOf(ans), orderOf(ans), q.mode !== 'orders'), {type: 'new'}]);
    assert.equal(a.board.more, false, `${p.id}: a new item lifts the refusal`);
  }
  a = play(p, a, [{type: 'all'}]);
  assert.ok(isSolved(p, a.board), `${p.id}: That’s all with every answer solves`);
  refuse(p, a, {type: 'new'}, 'a move after the solve');
}

function checkIllegal(p) {
  const q = p.parameters, fresh = freshAttempt(p);
  const f = q.mode === 'orders' ? q.start : starts(q.outer, q.inner)[0];
  const cells = cellsOf(q.outer, q.inner), icells = cellsOf(q.inner, []);
  refuse(p, fresh, {type: 'new'}, 'New run before anything happens');
  refuse(p, fresh, {type: 'shape', index: 1}, 'a board change outside the playground');
  refuse(p, fresh, {type: 'open', at: icells[0]}, 'opening the top-left gray square first');
  refuse(p, fresh, {type: 'nonsense'}, 'an unknown move');
  if (q.mode !== 'orders') {
    refuse(p, fresh, {type: 'open', at: icells.at(-1)}, 'opening before every number is placed');
    const late = cells.findIndex(([r, c]) => cells.some(([y, x]) => (y === r - 1 && x === c) || (y === r && x === c - 1)));
    if (late >= 0) refuse(p, fresh, {type: 'place', cell: late}, 'a number with an empty square above or left of it');
    refuse(p, fresh, {type: 'place', cell: cells.length}, 'a square off the board');
    refuse(p, fresh, {type: 'place', cell: 0, extra: 1}, 'a move with an unknown field');
  }
  // In a slide: the larger number and a number not beside the ring are refused.
  const acts = runActions(q.outer, q.inner, f, orders(q.inner)[0], q.mode !== 'orders');
  const firstOpen = acts.findIndex(x => x.type === 'open');
  const before = play(p, fresh, acts.slice(0, firstOpen));
  refuse(p, before, {type: 'slide', at: cells[0]}, 'a slide with no ring');
  const opened = play(p, before, [acts[firstOpen]]);
  const [r, c] = acts[firstOpen].at, G = grid(q.outer, q.inner, f);
  const near = [[r, c + 1], [r + 1, c]].filter(([y, x]) => val(G, y, x) > 0);
  if (near.length === 2) {
    const larger = near.reduce((u, v) => (G[u[0]][u[1]] > G[v[0]][v[1]] ? u : v));
    refuse(p, opened, {type: 'slide', at: larger}, 'the larger neighbour');
  }
  const far = cells.find(([y, x]) => !near.some(([u, v]) => u === y && v === x));
  if (far) refuse(p, opened, {type: 'slide', at: far}, 'a number not beside the ring');
  refuse(p, opened, {type: 'open', at: icells.at(-1)}, 'opening a second corner mid-slide');
}

function checkSaves(p) {
  const q = p.parameters, fresh = freshAttempt(p).board;
  const forged = [[{...fresh, extra: 1}, 'an unknown field'], [{...fresh, steps: [[0, 0]]}, 'a step that is not a corner'], [{...fresh, steps: 'x'}, 'steps that are not a list']];
  const cells = cellsOf(q.outer, q.inner), late = cells.findIndex(([r, c]) => cells.some(([y, x]) => (y === r - 1 && x === c) || (y === r && x === c - 1)));
  if (q.mode !== 'orders') forged.push([{...fresh, place: [0, 0]}, 'a square placed twice'], [{...fresh, place: [cells.length]}, 'a square off the board']);
  if (q.mode !== 'orders' && late >= 0) forged.push([{...fresh, place: [late]}, 'a 1 placed below or right of an empty square']);
  if (q.mode === 'design') forged.push([{...fresh, reached: [q.targets.length]}, 'an unknown goal'], [{...fresh, reached: [0, 0]}, 'a goal twice']);
  else {
    const answers = p.solution.answers;
    forged.push([{...fresh, shelf: [answers[0], answers[0]]}, 'an item twice'], [{...fresh, done: true}, 'done with an empty shelf'], [{...fresh, more: true}, 'a refusal with an empty shelf'], [{...fresh, shelf: answers, more: true}, 'a refusal of a complete shelf']);
    const all = starts(q.outer, q.inner);
    if (q.mode === 'starts') forged.push([{...fresh, shelf: [all.find(f => rowsKey(finishByInsertion(q.outer, q.inner, f)) !== rowsKey(q.target))]}, 'a start of another finish']);
    if (q.mode === 'fillings') forged.push([{...fresh, shelf: [[...answers[0]].reverse()]}, 'a filling that does not grow']);
    if (q.mode === 'outlines') forged.push([{...fresh, shelf: [Array(cellsOf(q.outer, q.inner).length).fill(1)]}, 'a column that never appears']);
    if (q.mode === 'orders') forged.push([{...fresh, shelf: [[...answers[0]].reverse()]}, 'an order that opens a blocked square']);
    if (answers.length > 1) forged.push([{...fresh, shelf: [answers[0]], done: true}, 'done with a shelf short of answers']);
    assert.ok(validBoard(p, {...fresh, shelf: answers, done: true}), `${p.id}: a complete, claimed shelf is a valid save`);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// Every Undo press changes the screen, after a refusal too.
function checkUndoPresses(p) {
  const q = p.parameters, m = mechanicFor(p), view = a => m.render(p, {...a, hintLevel: 0}, {});
  let a = freshAttempt(p), rnd = seeded(p.number * 31);
  a = wander(p, a, rnd, 40);
  if (q.mode !== 'design' && a.board.shelf.length && !a.board.more && a.board.shelf.length < p.solution.count) a = play(p, a, [{type: 'all'}]);
  let shown = view(a);
  while (a.history.length) { a = undoPress(p, a, view); const now = view(a); assert.notEqual(now, shown, `${p.id}: an Undo press changes the screen`); shown = now; }
}

// Claims in the grown-up notes, checked with insertion only.
function checkClaims(pack) {
  const byStarts = (outer, inner) => {
    const fins = new Map();
    for (const f of starts(outer, inner)) { const k = rowsKey(finishByInsertion(outer, inner, f)); fins.set(k, (fins.get(k) || 0) + 1); }
    const shapes = new Map();
    for (const [k, n] of fins) { const s = shapeKey(k.split('/').map(r => r.split(','))); if (!shapes.has(s)) shapes.set(s, new Set()); shapes.get(s).add(n); }
    // The number of starts of a finish depends only on its shape.
    for (const [s, set] of shapes) assert.equal(set.size, 1, `${outer}/${inner}: every finish of shape ${s} has as many starts`);
    return {fins, shapes: new Map([...shapes].map(([s, set]) => [s, [...set][0]]))};
  };
  const A = byStarts([3, 2], [1]), D = byStarts([3, 2, 1], [2, 1]), B = byStarts([3, 3, 2], [2, 1]);
  const P = byStarts([3, 2, 1], [1]), W = byStarts([4, 2, 1], [2, 1]), BOX = byStarts([3, 3, 3], [2, 1]);
  assert.equal(starts([3, 2], [1]).length, 5);
  assert.deepEqual([...A.fins.values()], [1, 1, 1, 1, 1], 'A: five starts, five different finishes');
  assert.equal(D.shapes.get('2,1'), 2, 'D: a finish of 2, 1 has two starts');
  assert.equal(D.fins.get('1,3/2'), 2);
  assert.ok([...B.fins.values()].every(n => n === 1) && B.fins.size === 16, 'B: sixteen different finishes, one start each');
  assert.deepEqual([...B.shapes.keys()].sort(), ['2,2,1', '3,1,1', '3,2']);
  assert.deepEqual([...P.shapes.keys()].sort(), ['2,2,1', '3,1,1', '3,2'], 'one gray square: the board minus an outer corner');
  assert.equal(W.shapes.get('3,1'), 2, 'W: a finish of 3, 1 has two starts');
  assert.deepEqual([...W.shapes.keys()].sort(), ['2,1,1', '2,2', '3,1', '4'], 'W: four shapes, never a column of four');
  assert.ok(starts([4, 2, 1], [2, 1]).every(f => { const w = [f[3], f[2], f[0], f[1]]; return !w.some((x, i) => w.slice(i + 1).some((y, j) => y < x && w.slice(i + j + 2).some(z => z < y && w.slice(i + j + 3).some(u => u < z)))); }), 'W: no reading word falls four times');
  assert.ok(BOX.shapes.size === 1 && BOX.shapes.get('3,2,1') === 1 && BOX.fins.size === 16, '3 × 3: every start finishes as the staircase, each array once');
  assert.equal(orders([3, 2, 1]).length, 16, 'a staircase of gray squares opens in 16 orders');
  // Puzzle 1: two starts keep two rows of two, exactly those with 1 in the top row and 4 at the bottom right.
  const two = starts([3, 2], [1]).filter(f => shapeKey(finishByInsertion([3, 2], [1], f)) === '2,2');
  assert.deepEqual(two.map(key).sort(), ['1,2,3,4', '1,3,2,4']);
  assert.ok(two.every(f => f[0] === 1 && f[3] === 4) && starts([3, 2], [1]).filter(f => f[0] === 1 && f[3] === 4).length === 2);
  // Puzzle 10: the one start of 1 2 4 over 3 5, with 1 in the bottom row.
  const one = starts([3, 3, 2], [2, 1]).filter(f => rowsKey(finishByInsertion([3, 3, 2], [2, 1], f)) === '1,2,4/3,5');
  assert.deepEqual(one, [[4, 2, 5, 1, 3]]);
  // Puzzle 7: both starts have 2 and 4 in the top row; top-row numbers stay in the top row.
  const seven = starts([4, 2, 1], [2, 1]).filter(f => rowsKey(finishByInsertion([4, 2, 1], [2, 1], f)) === '1,2,4/3');
  assert.deepEqual(seven.map(key).sort(), ['2,4,1,3', '2,4,3,1']);
  for (const f of starts([4, 2, 1], [2, 1])) { const top = finishByInsertion([4, 2, 1], [2, 1], f)[0]; assert.ok(top.includes(f[0]) && top.includes(f[1]), 'top-row numbers stay in the top row'); }
}

function checkPlayground(p) {
  const q = p.parameters, m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'done');
  for (let i = 0; i < q.shapes.length; i++) {
    const s = q.shapes[i];
    if (i !== a.board.shape) a = play(p, a, [{type: 'shape', index: i}]);
    for (const f of starts(s.outer, s.inner).slice(0, 4)) {
      a = play(p, a, runActions(s.outer, s.inner, f, orders(s.inner).at(-1)));
      assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
      a = play(p, a, [{type: 'new'}]);
    }
  }
  refuse(p, a, {type: 'shape', index: a.board.shape}, 'choosing the board already chosen');
  refuse(p, a, {type: 'shape', index: q.shapes.length}, 'an unknown board');
  refuse(p, a, {type: 'all'}, 'That’s all');
  for (const [board, why] of [[{shape: 99, place: [], steps: []}, 'an unknown board'], [{shape: 0, place: [], steps: [], shelf: []}, 'an unknown field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTaquin(), null, 2));
