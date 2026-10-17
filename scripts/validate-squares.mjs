// Checks the Squares pack (dist/families/squares/squares.json), a group in
// Tile gardens: content fields and sources; every answer recomputed by methods
// unlike the mechanic's (Euclid by division with remainder for the rule, its
// last square, recipe and sizes; an iterative-deepening search in column order
// for the fewest squares; a column-order search and the divisibility rule for
// 2s and 3s; a brute-force packing of 3 by 3 squares and a check of every set
// of lines for the certificate); the numbers the grown-up notes name; the
// witnesses played as moves; hint chains from fresh, after wrong moves, after a
// refused Done, after Undo and from random boards; illegal moves; forged
// saves; the playground; and how long a hint takes.
// Run: node scripts/validate-squares.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {cutsOf, recipeOf, lastOf, kindsOf, certificateOk, certificateFor, maxThrees, fillCover, fewestCover} from '../dist/families/squares/squaremath.js';
import {forgetHints, designLadder, pickLine} from '../dist/families/squares/squares.js';
import {loadPack} from './packs.mjs';

/* ----- Euclid by division: the quotients are the counts of equal squares. */
function euclid(w, h) {
  let a = Math.max(w, h), b = Math.min(w, h);
  const quotients = [], sizes = [];
  while (b) { const k = Math.floor(a / b); quotients.push(k); for (let i = 0; i < k; i++) sizes.push(b); [a, b] = [b, a % b]; }
  return {gcd: a, quotients, sizes, count: sizes.length, kinds: quotients.length};
}

/* ----- Fewest squares: iterative deepening, filling the first empty square
   in column order (top to bottom, then left to right), no memo. */
function fewestByColumns(cols, rows) {
  const grid = new Uint8Array(cols * rows), idx = (x, y) => x * rows + y;
  const fits = (x, y, s) => { if (x + s > cols || y + s > rows) return false; for (let i = x; i < x + s; i++) for (let j = y; j < y + s; j++) if (grid[idx(i, j)]) return false; return true; };
  const put = (x, y, s, v) => { for (let i = x; i < x + s; i++) for (let j = y; j < y + s; j++) grid[idx(i, j)] = v; };
  const big = Math.min(cols, rows) ** 2;
  const search = (depth, left, out) => {
    let f = 0;
    while (f < cols * rows && grid[f]) f++;
    if (f === cols * rows) return true;
    if (depth === 0 || left > depth * big) return false;
    const x = Math.floor(f / rows), y = f % rows;
    for (let s = Math.min(cols - x, rows - y); s >= 1; s--) {
      if (!fits(x, y, s)) continue;
      put(x, y, s, 1); out.push([x, y, s]);
      if (search(depth - 1, left - s * s, out)) { put(x, y, s, 0); return true; }
      out.pop(); put(x, y, s, 0);
    }
    return false;
  };
  for (let d = 1; ; d++) { const out = []; if (search(d, cols * rows, out)) return {count: d, tiling: out}; }
}

/* ----- 2s and 3s: a column-order search with a memo of failed states. */
function fillsByColumns(cols, rows) {
  const grid = new Uint8Array(cols * rows), idx = (x, y) => x * rows + y, failed = new Set();
  const fits = (x, y, s) => { if (x + s > cols || y + s > rows) return false; for (let i = x; i < x + s; i++) for (let j = y; j < y + s; j++) if (grid[idx(i, j)]) return false; return true; };
  const put = (x, y, s, v) => { for (let i = x; i < x + s; i++) for (let j = y; j < y + s; j++) grid[idx(i, j)] = v; };
  const go = () => {
    let f = 0;
    while (f < cols * rows && grid[f]) f++;
    if (f === cols * rows) return true;
    const key = grid.join('');
    if (failed.has(key)) return false;
    const x = Math.floor(f / rows), y = f % rows;
    for (const s of [2, 3]) if (fits(x, y, s)) { put(x, y, s, 1); const ok = go(); put(x, y, s, 0); if (ok) return true; }
    failed.add(key);
    return false;
  };
  return go();
}
const twosAndThrees = (w, h) => (w % 2 === 0 && h % 2 === 0) || (w % 3 === 0 && h % 3 === 0) || w % 6 === 0 || h % 6 === 0;

/* ----- The most 3 by 3 squares that fit apart, by trying every placement. */
function packThrees(cols, rows) {
  const spots = [];
  for (let y = 0; y + 3 <= rows; y++) for (let x = 0; x + 3 <= cols; x++) spots.push([x, y]);
  let best = 0;
  const clash = (a, b) => Math.abs(a[0] - b[0]) < 3 && Math.abs(a[1] - b[1]) < 3;
  const go = (from, chosen) => {
    best = Math.max(best, chosen.length);
    if (chosen.length + (spots.length - from) <= best) return;
    for (let i = from; i < spots.length; i++) if (!chosen.some(c => clash(c, spots[i]))) go(i + 1, [...chosen, spots[i]]);
  };
  go(0, []);
  return best;
}
// A set of lines is a certificate when each is odd (2s alone make even
// lengths), no one 3 by 3 square on the board crosses two of them, and there
// are more of them than 3 by 3 squares fit.
function certificateByHand(cols, rows, dir, at, packed) {
  const length = dir === 'row' ? cols : rows;
  if (!at.length || length % 2 === 0) return false;
  for (let y = 0; y + 3 <= rows; y++) for (let x = 0; x + 3 <= cols; x++) {
    const crossed = at.filter(k => dir === 'row' ? k >= y && k < y + 3 : k >= x && k < x + 3);
    if (crossed.length > 1) return false;
  }
  // A line no 3 by 3 square can cross at all still needs one: also a certificate.
  return at.length > packed;
}
const subsets = n => Array.from({length: 2 ** n}, (_, m) => Array.from({length: n}, (_, k) => k).filter(k => m >> k & 1));

// The table in docs/squares/README.md.
const TABLE = {
  'squares-01': {level: 'easy', mode: 'four', answer: ['12x3', '6x6']},
  'squares-02': {level: 'easy', mode: 'fewest', fewest: 4, rule: 4},
  'squares-03': {level: 'easy', mode: 'fill', fills: false, certificates: 2},
  'squares-04': {level: 'medium', mode: 'fewest', fewest: 5, rule: 6},
  'squares-05': {level: 'medium', mode: 'fill', fills: true},
  'squares-06': {level: 'medium', mode: 'design', goal: 'last'},
  'squares-07': {level: 'medium', mode: 'fill', fills: false, certificates: 6},
  'squares-08': {level: 'medium', mode: 'fewest', fewest: 5, rule: 7},
  'squares-09': {level: 'hard', mode: 'design', goal: 'recipe', answer: ['8x3', '3x8']},
  'squares-10': {level: 'hard', mode: 'fill', fills: false, certificates: 1},
  'squares-11': {level: 'hard', mode: 'fewest', fewest: 6, rule: 8},
  'squares-12': {level: 'hard', mode: 'design', goal: 'kinds', answer: ['13x8', '8x13']}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => { const next = move(p, a, action); assert.ok(next === null || next === a, `${p.id}: refuses ${why}`); };
const places = list => list.map(([x, y, s]) => ({type: 'place', x, y, s}));
const playAll = (p, a, actions) => actions.reduce((b, action) => play(p, b, action), a);
// One Undo step as the app takes it, with the mechanic's carry.
const undoCarry = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
let hintSteps = 0, hintRuns = 0, slowest = 0, slowestAt = "";
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const t = performance.now(), h = nextHint(p, a);
    const took = performance.now() - t;
    if (took > slowest) { slowest = took; slowestAt = `${p.id} ${label}: ${JSON.stringify(a.board)}`; }
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text, `${p.id} ${label}: hint has words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  hintSteps += steps; hintRuns++;
  return a;
}
// A small random number generator, so the random boards are the same each run.
let seed = 32;
const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const pick = n => Math.floor(random() * n);

export async function validateSquares() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/squares/squares.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-32')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-32.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');

  /* ----- The theorems, over ranges of rectangles. */
  let rectangles = 0;
  for (let w = 1; w <= 21; w++) for (let h = 1; h <= 21; h++) {
    const e = euclid(w, h), cuts = cutsOf(w, h);
    assert.deepEqual(cuts.map(c => c[2]), e.sizes, `${w} by ${h}: the rule's sizes are Euclid's quotients`);
    assert.equal(lastOf(w, h), e.gcd, `${w} by ${h}: last square is the gcd`);
    assert.deepEqual(recipeOf(w, h), e.quotients, `${w} by ${h}: the recipe is the continued fraction`);
    assert.equal(kindsOf(w, h), e.kinds, `${w} by ${h}: sizes`);
    // The cuts tile the rectangle.
    const cover = new Uint8Array(w * h);
    for (const [x, y, s] of cuts) for (let j = y; j < y + s; j++) for (let i = x; i < x + s; i++) { assert.ok(i < w && j < h && !cover[j * w + i], `${w} by ${h}: cuts apart and inside`); cover[j * w + i] = 1; }
    assert.ok(cover.every(Boolean), `${w} by ${h}: cuts fill it`);
    rectangles++;
  }
  // Fibonacci: five sizes first within 13 by 8, six within 21 by 13.
  const withKinds = (k, n) => { const out = []; for (let w = 1; w <= n; w++) for (let h = 1; h <= n; h++) if (euclid(w, h).kinds >= k) out.push(`${w}x${h}`); return out; };
  assert.deepEqual(withKinds(5, 15), ['8x13', '13x8'], 'five sizes within 15: 13 by 8 only');
  assert.deepEqual(withKinds(6, 20), [], 'six sizes need more than 20');
  assert.ok(withKinds(6, 21).includes('21x13'), 'six sizes: 21 by 13');
  // Four sizes within 15, up to turning: the eight the notes list.
  const four = []; for (let w = 1; w <= 15; w++) for (let h = 1; h < w; h++) if (euclid(w, h).kinds === 4) four.push(`${w}x${h}`);
  assert.deepEqual(four.sort(), ['11x7', '11x8', '12x7', '13x5', '14x11', '14x9', '15x11', '8x5'].sort(), 'four sizes within 15');
  assert.deepEqual(euclid(7, 4).quotients, [1, 1, 3], '7 by 4: card 1, 1, 3');

  // Fewest squares by the column-order search, against the mechanic's.
  const fewestTable = {};
  for (let w = 1; w <= 8; w++) for (let h = 1; h <= w; h++) {
    const by = fewestByColumns(w, h).count;
    assert.equal(fewestCover(w, h, [], w * h).length, by, `${w} by ${h}: fewest squares agree`);
    fewestTable[`${w}x${h}`] = by;
  }
  for (const [w, h, n] of [[13, 11, 6], [14, 13, 7], [13, 8, 6]]) assert.equal(fewestByColumns(w, h).count, n, `${w} by ${h}: fewest ${n}`);
  assert.equal(euclid(14, 13).count, 14, '14 by 13: the rule uses fourteen, twice the fewest');
  // The square-number sums the notes use to explain why fewer can't fit.
  const sums = (total, k, max) => { const out = []; const go = (left, n, top, acc) => { if (!n) { if (!left) out.push(acc.join('+')); return; } for (let s = top; s >= 1; s--) if (s * s <= left) go(left - s * s, n - 1, s, [...acc, s * s]); }; go(total, k, max, []); return out; };
  assert.deepEqual(sums(12, 3, 3), ['4+4+4'], '4 by 3: three squares only as 4 + 4 + 4');
  assert.deepEqual([...sums(12, 1, 3), ...sums(12, 2, 3)], [], '4 by 3: no one or two');
  assert.deepEqual(sums(30, 4, 5), ['16+9+4+1'], '6 by 5: four squares only as 16 + 9 + 4 + 1');
  assert.deepEqual(sums(30, 3, 5), ['25+4+1'], '6 by 5: three only as 25 + 4 + 1');
  assert.deepEqual(sums(30, 2, 5), [], '6 by 5: never two');
  assert.deepEqual(sums(42, 4, 6), ['36+4+1+1', '25+9+4+4', '16+16+9+1'], '7 by 6: the three ways with four');
  assert.deepEqual(sums(42, 3, 6), ['25+16+1'], '7 by 6: one way with three');

  // 2s and 3s: the search agrees with the divisibility rule and the mechanic.
  const certified = [], uncertified = [];
  for (let w = 2; w <= 12; w++) for (let h = 2; h <= 12; h++) {
    const fills = fillsByColumns(w, h);
    assert.equal(fills, twosAndThrees(w, h), `${w} by ${h}: 2s and 3s by the rule`);
    assert.equal(Boolean(fillCover(w, h, [], [2, 3])), fills, `${w} by ${h}: the mechanic agrees`);
    const claim = certificateFor(w, h);
    if (claim) assert.ok(!fills, `${w} by ${h}: a certificate only where it can't be filled`);
    if (!fills && w >= h) (claim ? certified : uncertified).push(`${w}x${h}`);
  }
  // The packing bound, tried every way.
  for (let w = 1; w <= 9; w++) for (let h = 1; h <= 9; h++) assert.equal(packThrees(w, h), maxThrees(w, h), `${w} by ${h}: 3 by 3 squares that fit`);

  // Four 3 by 3 squares: the rectangles of area 36 with sides multiples of 3.
  const fourRects = []; for (let w = 3; w <= 12; w += 3) for (let h = 3; h <= w; h += 3) if (w * h === 36) fourRects.push(`${w}x${h}`);

  /* ----- Each puzzle. */
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'squares');
    assert.equal(p.libraryFamily, 'tile', `${p.id}: in Tile gardens`);
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }
    const row = TABLE[p.id];
    assert.equal(p.group, 'Squares', `${p.id}: in the Squares group`);
    assert.equal(p.band, 'all');
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    // Budgets and goals don't give the answer away.
    const shown = `${p.title} ${p.visibleObjective} ${p.hints[0]}`;
    if (q.mode === 'fewest') {
      assert.ok(!new RegExp(`\\b${row.fewest}\\b|${['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'][row.fewest]}`, 'i').test(`${p.visibleObjective} ${p.hints[0]}`), `${p.id}: no fewest count shown`);
      assert.ok(!Object.hasOwn(q, 'budget'), `${p.id}: no budget`);
    }
    if (q.mode === 'fill' && !row.fills) assert.ok(!/can.t|press/i.test(p.hints[0]), `${p.id}: the first hint is not the claim`);
    assert.ok(!/13 by 8|8 by 3|12 by 3|6 by 6/.test(shown), `${p.id}: no answer in the title, objective or first hint`);
    if (q.mode === 'fewest') checkFewest(p, fresh, row);
    else if (q.mode === 'fill') checkFill(p, fresh, row);
    else if (q.mode === 'four') checkFour(p, fresh, row, fourRects);
    else checkDesign(p, fresh, row);
    checkRandom(p, fresh);
  }
  const cold = timeHints(pack.puzzles.filter(p => p.band !== 'playground'));
  assert.ok(cold.ms < 100, `the slowest cold hint took ${cold.ms.toFixed(1)} ms (${cold.at})`);
  return {puzzles: puzzles.length, rectanglesChecked: rectangles, fewestTable: Object.keys(fewestTable).length, cantWithLines: certified.length, cantWithoutLines: uncertified, hintRuns, hintSteps, slowestHintMs: Number(slowest.toFixed(1)), slowestColdHintMs: Number(cold.ms.toFixed(1)), slowestColdHintAt: cold.at.split(":")[0], coldBoardsTimed: cold.boards};
}

function checkFewest(p, fresh, row) {
  const q = p.parameters, best = fewestByColumns(q.cols, q.rows), e = euclid(q.cols, q.rows);
  assert.equal(best.count, row.fewest, `${p.id}: fewest by the column search`);
  assert.equal(q.fewest, row.fewest, `${p.id}: the pack's fewest`);
  assert.equal(e.count, row.rule, `${p.id}: the rule's count`);
  // The fewest tiling found here, played square by square, then Done.
  let a = playAll(p, fresh, places(best.tiling.map(([x, y, s]) => [x, y, s])));
  assert.ok(!isSolved(p, a.board), `${p.id}: full is not yet Done`);
  a = play(p, a, {type: 'done'});
  assert.ok(isSolved(p, a.board), `${p.id}: Done on a fewest filling solves`);
  // The rule's filling: Done is refused when it is not fewest, and stays refused.
  let r = playAll(p, fresh, places(cutsOf(q.cols, q.rows)));
  refuse(p, fresh, {type: 'done'}, 'Done on an empty board');
  const part = play(p, fresh, places(cutsOf(q.cols, q.rows))[0]);
  refuse(p, part, {type: 'done'}, 'Done before it is full');
  if (row.rule === row.fewest) { assert.ok(isSolved(p, play(p, r, {type: 'done'}).board), `${p.id}: here the rule is fewest`); hintsSolve(p, fresh, 'from fresh'); return; }
  r = play(p, r, {type: 'done'});
  assert.ok(!isSolved(p, r.board), `${p.id}: Done on the rule's ${row.rule} is refused`);
  assert.equal(r.board.fewer, row.rule, `${p.id}: the refused count is kept`);
  refuse(p, r, {type: 'done'}, 'the same count twice');
  // Undo keeps the refusal, so Done-then-Undo can't be asked again.
  const back = undoCarry(p, r);
  assert.equal(back.board.fewer, row.rule, `${p.id}: Undo keeps the refused count`);
  assert.ok(validBoard(p, back.board));
  refuse(p, back, {type: 'done'}, 'Done after Undo at the refused count');
  // Lifting one square and putting it back is the same count: still refused.
  const last = cutsOf(q.cols, q.rows).at(-1);
  const again = play(p, play(p, r, {type: 'lift', x: last[0], y: last[1]}), {type: 'place', x: last[0], y: last[1], s: last[2]});
  refuse(p, again, {type: 'done'}, 'Done again at the refused count');
  hintsSolve(p, fresh, 'from fresh');
  hintsSolve(p, r, 'after a refused Done');
  hintsSolve(p, back, 'after Undo');
  // A wrong first square: the biggest one in the corner, then hints.
  hintsSolve(p, play(p, fresh, places(cutsOf(q.cols, q.rows))[0]), 'after the rule’s first square');
  // Illegal moves.
  for (const [action, why] of [[{type: 'place', x: q.cols - 1, y: 0, s: 2}, 'a square off the board'], [{type: 'place', x: 0, y: 0, s: 0}, 'a square of side 0'], [{type: 'place', x: 0.5, y: 0, s: 1}, 'a square off the grid'], [{type: 'place', x: -1, y: 0, s: 1}, 'a square off the left'], [{type: 'lift', x: 0, y: 0}, 'lifting nothing'], [{type: 'clear'}, 'clearing nothing'], [{type: 'cant', dir: 'row', at: [0]}, 'Can’t'], [{type: 'size', w: 2, h: 2}, 'sizing'], [{type: 'cut'}, 'Cut'], [{type: 'jump'}, 'an unknown move'], [null, 'no move']]) refuse(p, fresh, action, why);
  const one = play(p, fresh, {type: 'place', x: 0, y: 0, s: 1});
  refuse(p, one, {type: 'place', x: 0, y: 0, s: 2}, 'an overlap');
  refuse(p, a, {type: 'clear'}, 'a move after a solve');
  // Forged saves.
  for (const [board, why] of [
    [{sq: [], done: true, fewer: null}, 'Done on an empty board'],
    [{sq: cutsOf(q.cols, q.rows), done: true, fewer: null}, 'Done on the rule’s filling'],
    [{sq: [[0, 0, 1], [0, 0, 1]], done: false, fewer: null}, 'overlapping squares'],
    [{sq: [[q.cols, 0, 1]], done: false, fewer: null}, 'a square off the board'],
    [{sq: [], done: false, fewer: row.fewest}, 'the fewest count refused'],
    [{sq: [], done: false, fewer: 1}, 'a refused count below the fewest'],
    [{sq: [], done: false, fewer: '9'}, 'a refused count as words'],
    [{sq: [], done: 'yes', fewer: null}, 'Done as words'],
    [{sq: [], done: false}, 'a missing field'],
    [{sq: [], done: false, fewer: null, claim: null}, 'an extra field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkFill(p, fresh, row) {
  const q = p.parameters;
  assert.deepEqual(q.sizes, [2, 3], `${p.id}: 2s and 3s`);
  assert.equal(fillsByColumns(q.cols, q.rows), row.fills, `${p.id}: fills by the column search`);
  assert.equal(twosAndThrees(q.cols, q.rows), row.fills, `${p.id}: by the divisibility rule`);
  const packed = packThrees(q.cols, q.rows);
  // Every set of lines: the mechanic accepts exactly the certificates.
  const accepted = [];
  for (const dir of ['row', 'col']) for (const at of subsets(dir === 'row' ? q.rows : q.cols)) {
    // Sound by hand; the rules also ask picked lines to be three apart, which
    // is the same thing whenever a 3 by 3 square fits at all.
    const sound = certificateByHand(q.cols, q.rows, dir, at, packed), apart = at.every(j => at.every(k => j === k || Math.abs(j - k) >= 3));
    if (packed > 0 || (q.cols >= 3 && q.rows >= 3)) assert.equal(sound, sound && apart, `${p.id}: ${dir} ${at}: three apart`);
    const mine = sound && apart;
    assert.equal(certificateOk(q.cols, q.rows, {dir, at}), mine, `${p.id}: ${dir} ${at}: certificate`);
    if (mine) accepted.push({dir, at});
  }
  refuse(p, fresh, {type: 'cant', ...(accepted[0] || {dir: 'row', at: [0]})}, 'Can’t on an empty board');
  // Every tap on a tab from every set of lines that can be picked: a claim
  // only for a certificate, and the 3s that fit drawn only where it can't be
  // filled (where it can, they are half a filling).
  const pickable = [];
  for (const dir of ['row', 'col']) for (const at of subsets(dir === 'row' ? q.rows : q.cols)) {
    const length = dir === 'row' ? q.cols : q.rows;
    if (at.length && length % 2 && at.every(j => at.every(k => j === k || Math.abs(j - k) >= 3)) && !certificateOk(q.cols, q.rows, {dir, at})) pickable.push({dir, at});
  }
  let tapsTried = 0;
  for (const picks of [{dir: null, at: []}, ...pickable]) for (const dir of ['row', 'col']) for (let k = 0; k < (dir === 'row' ? q.rows : q.cols); k++) {
    const out = pickLine(q, picks, dir, k);
    tapsTried++;
    if (out.claim) assert.ok(certificateOk(q.cols, q.rows, out.claim), `${p.id}: a claim only for a certificate`);
    if (out.fits) assert.ok(!row.fills, `${p.id}: the 3s that fit are drawn only where it can't be filled`);
  }
  assert.ok(tapsTried >= q.rows + q.cols, `${p.id}: every tab tried`);
  if (row.fills) assert.ok(pickable.some(pk => pickLine(q, {dir: pk.dir, at: pk.at.slice(0, -1)}, pk.dir, pk.at.at(-1)).said?.endsWith('fit.')), `${p.id}: too few lines still get a word`);
  const first = nextHint(p, fresh);
  assert.equal(first.action.type, 'place', `${p.id}: the first hint is a square, not Can’t`);
  if (row.fills) {
    assert.deepEqual(accepted, [], `${p.id}: no certificate when it fills`);
    const filling = p.solution.filling;
    const a = playAll(p, fresh, places(filling));
    assert.ok(isSolved(p, a.board), `${p.id}: the filling solves`);
    // A 2 in the second column leaves a strip one wide: hints lift it.
    const stray = play(p, fresh, {type: 'place', x: 1, y: 0, s: 2});
    assert.equal(nextHint(p, stray).action.type, 'lift', `${p.id}: hints lift a square that blocks`);
    hintsSolve(p, stray, 'after a blocking square');
    hintsSolve(p, fresh, 'from fresh');
    for (const dir of ['row', 'col']) refuse(p, stray, {type: 'cant', dir, at: [0, 3]}, 'a claim with too few lines');
  } else {
    assert.equal(accepted.length, row.certificates, `${p.id}: the certificates the table names`);
    assert.ok(accepted.some(c => JSON.stringify(c) === JSON.stringify(p.solution.claim)), `${p.id}: the witness is one`);
    const tried = play(p, fresh, first.action);
    // Every certificate solves, after a try.
    for (const c of accepted) {
      const a = play(p, tried, {type: 'cant', ...c});
      assert.ok(isSolved(p, a.board), `${p.id}: ${c.dir} ${c.at} solves`);
      refuse(p, a, {type: 'clear'}, 'a move after the claim');
    }
    const h = nextHint(p, tried);
    assert.equal(h.action.type, 'cant', `${p.id}: after a try, the hint is the claim`);
    assert.match(h.text, /can’t be all 2s/, `${p.id}: with its reason`);
    hintsSolve(p, fresh, 'from fresh');
    hintsSolve(p, tried, 'after a try');
    // Wrong claims: a line too close, an even line, too few.
    const c = p.solution.claim, other = c.dir === 'row' ? 'col' : 'row';
    if (c.at.length > 1) refuse(p, tried, {type: 'cant', dir: c.dir, at: c.at.slice(1)}, 'too few lines');
    refuse(p, tried, {type: 'cant', dir: c.dir, at: [...c.at.slice(0, -1), c.at.at(-1) - 1].filter(k => k >= 0)}, 'lines too close');
    if ((other === 'row' ? q.cols : q.rows) % 2 === 0) refuse(p, tried, {type: 'cant', dir: other, at: [0]}, 'an even line');
    for (const [board, why] of [
      [{sq: [], claim: c}, 'a claim with nothing tried'],
      [{sq: [[0, 0, 2]], claim: {dir: c.dir, at: c.at.slice(1)}}, 'a claim too short'],
      [{sq: [[0, 0, 2]], claim: {dir: c.dir, at: c.at, extra: 1}}, 'a claim with an extra field'],
      [{sq: [[0, 0, 2]], claim: {dir: 'diag', at: c.at}}, 'an unknown direction']
    ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  }
  for (const [action, why] of [[{type: 'place', x: 0, y: 0, s: 1}, 'a 1 by 1'], [{type: 'place', x: 0, y: 0, s: 4}, 'a 4 by 4'], [{type: 'done'}, 'Done'], [{type: 'cant', dir: 'row', at: 'all'}, 'a claim of no lines']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{sq: [[0, 0, 1]], claim: null}, 'a 1 by 1 square'], [{sq: [], claim: null, done: false}, 'an extra field'], [{sq: []}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkFour(p, fresh, row, fourRects) {
  const q = p.parameters;
  assert.deepEqual(fourRects.map(k => k).sort(), [...row.answer].sort(), `${p.id}: the rectangles of four`);
  assert.equal(new Set(row.answer.map(k => euclid(...k.split('x').map(Number)).gcd)).size, 2, `${p.id}: two different last squares`);
  // The strip, then lift it and make the big square.
  const strip = [[0, 0, 3], [3, 0, 3], [6, 0, 3], [9, 0, 3]], big = [[0, 3, 3], [3, 3, 3], [0, 6, 3], [3, 6, 3]];
  let a = playAll(p, fresh, places(strip));
  assert.deepEqual(a.board.found, ['12x3'], `${p.id}: the strip is kept`);
  refuse(p, a, {type: 'place', x: 0, y: 6, s: 3}, 'a fifth square');
  const lifted = play(p, a, {type: 'lift', x: 9, y: 0});
  assert.deepEqual(lifted.board.found, ['12x3'], `${p.id}: lifting keeps what was found`);
  // Undo past the strip keeps it found.
  let b = a; for (let i = 0; i < 4; i++) b = undoCarry(p, b);
  assert.deepEqual(b.board.sq, [], `${p.id}: Undo lifts the squares`);
  assert.deepEqual(b.board.found, ['12x3'], `${p.id}: Undo keeps the strip found`);
  a = playAll(p, play(p, a, {type: 'clear'}), places(big));
  assert.ok(isSolved(p, a.board), `${p.id}: strip and square solve`);
  // The same strip twice is still one; an L of four is no rectangle.
  const turned = playAll(p, fresh, places([[0, 0, 3], [0, 3, 3], [0, 6, 3], [0, 9, 3]]));
  assert.deepEqual(turned.board.found, ['12x3'], `${p.id}: a strip turned round is the same one`);
  const ell = playAll(p, fresh, places([[0, 0, 3], [0, 3, 3], [0, 6, 3], [3, 6, 3]]));
  assert.deepEqual(ell.board.found, [], `${p.id}: an L is no rectangle`);
  hintsSolve(p, fresh, 'from fresh');
  hintsSolve(p, ell, 'after an L');
  hintsSolve(p, turned, 'after a turned strip');
  hintsSolve(p, play(p, fresh, {type: 'place', x: 4, y: 5, s: 3}), 'after a square in the middle');
  for (const [action, why] of [[{type: 'place', x: 0, y: 0, s: 2}, 'a 2 by 2'], [{type: 'place', x: 10, y: 0, s: 3}, 'off the board'], [{type: 'done'}, 'Done'], [{type: 'cant', dir: 'row', at: [0]}, 'Can’t']]) refuse(p, fresh, action, why);
  for (const [board, why] of [
    [{sq: [], found: ['9x4']}, 'a rectangle four 3s can’t make'],
    [{sq: [], found: ['12x3', '12x3']}, 'a rectangle found twice'],
    [{sq: strip, found: []}, 'a strip made but not kept'],
    [{sq: [...strip, [0, 3, 3]], found: ['12x3']}, 'five squares'],
    [{sq: [[0, 0, 2]], found: []}, 'a 2 by 2']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkDesign(p, fresh, row) {
  const q = p.parameters, sizes = [];
  for (let w = 1; w <= q.cols; w++) for (let h = 1; h <= q.rows; h++) sizes.push([w, h]);
  const meets = ([w, h]) => q.goal === 'last' ? euclid(w, h).gcd === q.last : q.goal === 'recipe' ? JSON.stringify(euclid(w, h).quotients) === JSON.stringify(q.recipe) : euclid(w, h).kinds >= q.kinds;
  const answers = sizes.filter(meets);
  if (q.goal === 'last') {
    const firsts = new Set(answers.map(([w, h]) => Math.min(w, h)));
    assert.deepEqual([...firsts].sort((x, y) => x - y), [3, 6, 9], `${p.id}: first squares 3, 6 and 9`);
    assert.equal(firsts.size, q.need, `${p.id}: exactly as many first squares as needed`);
    assert.ok(answers.every(([w, h]) => w % 3 === 0 && h % 3 === 0), `${p.id}: sides are multiples of 3`);
    // Three kept, one at a time; a second with the same first square is not kept.
    let a = play(p, fresh, {type: 'size', w: 6, h: 3});
    a = play(p, a, {type: 'cut'});
    assert.deepEqual(a.board.found, [[6, 3]], `${p.id}: 6 by 3 kept`);
    refuse(p, a, {type: 'cut'}, 'Cut twice');
    a = play(p, play(p, a, {type: 'size', w: 3, h: 9}), {type: 'cut'});
    assert.deepEqual(a.board.found, [[6, 3]], `${p.id}: 3 by 9 starts with 3 too, so it is not kept`);
    a = play(p, play(p, a, {type: 'size', w: 12, h: 6}), {type: 'cut'});
    assert.deepEqual(a.board.found, [[6, 3]], `${p.id}: 12 by 6 ends on 6, not kept`);
    const two = play(p, play(p, a, {type: 'size', w: 9, h: 6}), {type: 'cut'});
    assert.equal(two.board.found.length, 2);
    const back = undoCarry(p, undoCarry(p, two));
    assert.equal(back.board.found.length, 2, `${p.id}: Undo keeps what was kept`);
    const done = play(p, play(p, two, {type: 'size', w: 9, h: 12}), {type: 'cut'});
    assert.ok(isSolved(p, done.board), `${p.id}: three kept solve`);
    hintsSolve(p, a, 'after a wrong rectangle');
    hintsSolve(p, back, 'after Undo');
    for (const [board, why] of [
      [{w: 6, h: 3, cut: false, found: [[6, 4]]}, 'a kept rectangle that ends on 2'],
      [{w: 6, h: 3, cut: false, found: [[6, 3], [3, 3]]}, 'two kept with the same first square'],
      [{w: 6, h: 3, cut: true, found: []}, 'a cut rectangle that should be kept'],
      [{w: 0, h: 0, cut: false, found: [[3, 3], [9, 6], [12, 9], [3, 6]]}, 'more kept than needed'],
      [{w: 13, h: 3, cut: false, found: []}, 'a rectangle off the grid']
    ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  } else {
    assert.deepEqual(answers.map(([w, h]) => `${w}x${h}`).sort(), [...row.answer].sort(), `${p.id}: answers by Euclid`);
    const [w, h] = answers[0];
    // A near miss, cut, then the answer.
    const near = play(p, play(p, fresh, {type: 'size', w: w - 1, h}), {type: 'cut'});
    assert.ok(!isSolved(p, near.board), `${p.id}: ${w - 1} by ${h} does not`);
    const a = play(p, play(p, near, {type: 'size', w, h}), {type: 'cut'});
    assert.ok(isSolved(p, a.board), `${p.id}: ${w} by ${h} solves`);
    const sized = play(p, fresh, {type: 'size', w, h});
    assert.ok(!isSolved(p, sized.board), `${p.id}: sizing alone is not a solve; Cut checks`);
    hintsSolve(p, near, 'after a wrong rectangle');
    // The ladder the hints climb, checked by Euclid: a recipe built backwards
    // from its last squares, or one more size on each rung.
    const rungs = designLadder(q);
    assert.ok(rungs.every(([L, S]) => L <= Math.max(q.cols, q.rows) && S <= Math.min(q.cols, q.rows)), `${p.id}: every rung fits the grid`);
    rungs.forEach(([L, S], i) => {
      if (q.goal === 'recipe') assert.deepEqual(euclid(L, S).quotients, q.recipe.slice(q.recipe.length - 1 - i), `${p.id}: rung ${L} by ${S} follows the end of the card`);
      else assert.equal(euclid(L, S).kinds, i + 2, `${p.id}: rung ${L} by ${S} has ${i + 2} sizes`);
    });
    assert.ok(row.answer.includes(`${rungs.at(-1)[0]}x${rungs.at(-1)[1]}`), `${p.id}: the top rung is the answer`);
    // From fresh the hints visit every rung, each then cut.
    let a2 = fresh;
    const visited = [];
    for (let i = 0; i < 40 && !isSolved(p, a2.board); i++) { const h = nextHint(p, a2); if (h.action.type === 'size') visited.push(`${Math.max(h.action.w, h.action.h)}x${Math.min(h.action.w, h.action.h)}`); a2 = play(p, a2, h.action); }
    assert.deepEqual(visited, rungs.map(([L, S]) => `${L}x${S}`), `${p.id}: hints climb the ladder`);
    // After any other rectangle, cut or not, the first hint does not name the
    // answer unless the child stands on the rung below it; hints still solve.
    const below = rungs.at(-2), names = new RegExp(row.answer.map(k => k.replace('x', ' by ')).join('|'));
    let wrongs = 0;
    for (const [w, h] of sizes) {
      if (row.answer.includes(`${w}x${h}`)) continue;
      for (const cut of [false, true]) {
        let b = play(p, fresh, {type: 'size', w, h});
        if (cut) b = play(p, b, {type: 'cut'});
        const first = nextHint(p, b);
        if (!(cut && Math.max(w, h) === below[0] && Math.min(w, h) === below[1])) assert.doesNotMatch(first.text, names, `${p.id}: after ${w} by ${h}${cut ? ', cut' : ''}, the first hint does not name the answer (${first.text})`);
        if (wrongs++ % 9 === 0) hintsSolve(p, b, `after ${w} by ${h}`);
      }
    }
    for (const [board, why] of [[{w, h, cut: true, found: [[w, h]]}, 'kept rectangles here'], [{w: 0, h: 0, cut: true, found: []}, 'a cut with no rectangle'], [{w: 3, h: 0, cut: false, found: []}, 'a rectangle of no height']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  }
  refuse(p, fresh, {type: 'cut'}, 'Cut with no rectangle');
  hintsSolve(p, fresh, 'from fresh');
  for (const [action, why] of [[{type: 'size', w: 0, h: 3}, 'a width of 0'], [{type: 'size', w: q.cols + 1, h: 3}, 'past the grid'], [{type: 'size', w: 2.5, h: 3}, 'a width off the grid'], [{type: 'place', x: 0, y: 0, s: 1}, 'placing a square'], [{type: 'done'}, 'Done']]) refuse(p, fresh, action, why);
  const sized = play(p, fresh, {type: 'size', w: 4, h: 4});
  refuse(p, sized, {type: 'size', w: 4, h: 4}, 'the same size');
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done', `${p.id}: no hint`);
  assert.deepEqual([fresh.board.w, fresh.board.h], q.start);
  let a = fresh;
  const n = euclid(...q.start).count;
  for (let k = 0; k < n; k++) a = play(p, a, {type: 'cut'});
  assert.equal(a.board.n, n, `${p.id}: one cut per press`);
  refuse(p, a, {type: 'cut'}, 'a cut past the last square');
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  const resized = play(p, a, {type: 'size', w: 13, h: 8});
  assert.equal(resized.board.n, 0, `${p.id}: a new rectangle starts uncut`);
  for (const [action, why] of [[{type: 'size', w: 16, h: 1}, 'past the grid'], [{type: 'place', x: 0, y: 0, s: 1}, 'placing'], [{type: 'done'}, 'Done']]) refuse(p, fresh, action, why);
  for (const [board, why] of [[{w: 5, h: 2, n: 5}, 'more cuts than squares'], [{w: 0, h: 0, n: 0}, 'no rectangle'], [{w: 5, h: 2, n: -1}, 'negative cuts'], [{w: 5, h: 2, n: 0, cut: true}, 'an extra field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

// How long a tap's hint takes with nothing remembered: fresh boards and random
// boards for every puzzle, each timed cold three times, keeping the fastest
// of the three so a pause for garbage collection is not counted.
function timeHints(puzzles) {
  let worst = 0, at = '', boards = 0;
  for (const p of puzzles) {
    const q = p.parameters, list = [freshAttempt(p)];
    for (let t = 0; t < 40; t++) {
      let a = freshAttempt(p);
      for (let i = 0; i < 1 + pick(8); i++) {
        const s = q.mode === 'fill' ? 2 + pick(2) : q.mode === 'four' ? 3 : 1 + pick(Math.min(q.cols, q.rows));
        const action = q.mode === 'design' ? {type: 'size', w: 1 + pick(q.cols), h: 1 + pick(q.rows)} : {type: 'place', x: pick(q.cols), y: pick(q.rows), s};
        const next = move(p, a, action);
        if (next && !isSolved(p, next.board)) a = next;
      }
      list.push(a);
    }
    for (const a of list) {
      let best = Infinity;
      for (let k = 0; k < 3; k++) { forgetHints(); const t = performance.now(); nextHint(p, a); best = Math.min(best, performance.now() - t); }
      if (best > worst) { worst = best; at = `${p.id}: ${JSON.stringify(a.board)}`; }
      boards++;
    }
  }
  return {ms: worst, at, boards};
}

// Random boards: a few random legal moves (and an Undo), then hints alone.
function checkRandom(p, fresh) {
  const q = p.parameters;
  for (let t = 0; t < 12; t++) {
    let a = fresh;
    for (let i = 0; i < 25; i++) {
      let action;
      if (q.mode === 'design') action = pick(4) ? {type: 'size', w: 1 + pick(q.cols), h: 1 + pick(q.rows)} : {type: 'cut'};
      else {
        const s = q.mode === 'fill' ? 2 + pick(2) : q.mode === 'four' ? 3 : 1 + pick(Math.min(q.cols, q.rows));
        action = pick(6) ? {type: 'place', x: pick(q.cols), y: pick(q.rows), s} : a.board.sq.length ? {type: 'lift', x: a.board.sq[0][0], y: a.board.sq[0][1]} : {type: 'clear'};
        if (q.mode === 'fewest' && pick(5) === 0) action = {type: 'done'};
      }
      const next = move(p, a, action);
      if (next && !isSolved(p, next.board)) a = next;
      if (pick(9) === 0) a = undoCarry(p, a);
      assert.ok(validBoard(p, a.board), `${p.id}: random play stays valid`);
    }
    hintsSolve(p, a, `after random play ${t}`);
  }
}

export default validateSquares;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateSquares(), null, 2));
