// Checks the Shrink strips pack (dist/families/shrink/shrink.json) against the
// Thue–Morse word itself, by methods unlike the mechanic's: the word's first
// 16384 tiles from the binary-digit rule (tile n is A when n has an even
// number of ones), checked complete for short pieces against the word's
// known factor counts; a piece is real when it occurs there, and a way of
// placing seams fits when it occurs at a place of that parity. Every answer
// (the ways, the fixes, the stuck runs) is recomputed from occurrences; the
// mechanic's own test of real and stuck rows is compared with occurrences for
// every word of up to 14 tiles; the child's trees are judged by a separate
// shrinker; certificates are built for every stuck run within the tree's
// limits; Keep waits until the child's rows take a way or a flip to one tile;
// witnesses and hint chains are played from fresh and after wrong moves,
// wrong claims and Undo; illegal moves and forged saves are refused; random
// play is counted to show that a certificate can fail, and past puzzle 2 some
// run of the full budget fits, so the choice of tiles matters; and hints are
// timed in CPU time. Run: node scripts/validate-shrink.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import {real, fits, stuck, validTree, LIMIT, MODES} from '../dist/families/shrink/shrink.js';

// The table in docs/shrink/README.md. seams: [piece, way] pairs, way 0 pairs
// the first two tiles and 1 leaves the first tile alone; repair: tiles (from
// 0) whose flip fixes the piece; impostor: the leftmost shortest stuck run,
// its length and the number of stuck runs of at most k tiles.
const TABLE = {
  'shrink-01': {level: 'easy', mode: 'seams', ways: [[0, 0], [0, 1], [1, 0], [2, 1]]},
  'shrink-02': {level: 'easy', mode: 'impostor', run: [0, 4], shortest: 5, dead: 15},
  'shrink-03': {level: 'easy', mode: 'repair', fixes: [4]},
  'shrink-04': {level: 'medium', mode: 'seams', ways: [[0, 0], [1, 0], [1, 1], [2, 0]]},
  'shrink-05': {level: 'medium', mode: 'impostor', run: [4, 11], shortest: 8, dead: 6},
  'shrink-06': {level: 'medium', mode: 'repair', fixes: [1, 4, 5]},
  'shrink-07': {level: 'medium', mode: 'impostor', run: [8, 12], shortest: 5, dead: 3},
  'shrink-08': {level: 'hard', mode: 'impostor', run: [2, 9], shortest: 8, dead: 6},
  'shrink-09': {level: 'hard', mode: 'repair', fixes: [0, 7]},
  'shrink-10': {level: 'hard', mode: 'impostor', run: [3, 16], shortest: 14, dead: 6}
};

// --- The Thue–Morse word ---------------------------------------------------------
const ones = n => { let c = 0; for (; n; n &= n - 1) c++; return c; };
const TM = Array.from({length: 1 << 14}, (_, n) => ones(n) % 2 ? 'B' : 'A').join('');
const places = new Map();
function occurrences(w) {
  if (!places.has(w)) { const out = []; for (let i = TM.indexOf(w); i >= 0; i = TM.indexOf(w, i + 1)) out.push(i); places.set(w, out); }
  return places.get(w);
}
const isFactor = w => occurrences(w).length > 0;
const parities = w => [0, 1].filter(s => occurrences(w).some(i => i % 2 === s));
// The factor counts of the Thue–Morse word (Brlek; de Luca and Varricchio):
// p(1) = 2, p(2) = 4, and for n = 2^r + q + 1 ≥ 3 with 0 ≤ q < 2^r, p(n) is
// 6·2^(r−1) + 4q when q ≤ 2^(r−1), and 8·2^(r−1) + 2q otherwise.
function complexity(n) {
  if (n <= 2) return 2 * n;
  let r = 0;
  while (2 ** (r + 1) + 1 <= n) r++;
  const q = n - 2 ** r - 1, h = 2 ** (r - 1);
  return q <= h ? 6 * h + 4 * q : 8 * h + 2 * q;
}
const words = n => n === 0 ? [''] : words(n - 1).flatMap(w => [w + 'A', w + 'B']);
const flip = (w, i) => w.slice(0, i) + (w[i] === 'A' ? 'B' : 'A') + w.slice(i + 1);

// --- A separate shrinker: pad with ghosts, cut into pairs ----------------------------
const otherOf = c => c === 'A' ? 'B' : 'A';
function pairsOf(w, s) {
  let padded = s === 1 ? otherOf(w[0]) + w : w;
  if (padded.length % 2) padded += otherOf(padded.at(-1));
  return padded.match(/../g);
}
const markedOf = (w, s) => pairsOf(w, s).some(p => p[0] === p[1]);
const parentOf = (w, s) => pairsOf(w, s).map(p => p[0]).join('');
// A tree certifies a row stuck when each way is tried and marked, or shrunk
// to a row the tree certifies.
function certifies(node, w) {
  if (!node) return false;
  return [0, 1].every(s => (node.t[s] && markedOf(w, s)) || (node.k[s] !== null && !markedOf(w, s) && certifies(node.k[s], parentOf(w, s))));
}
// The smallest certificate of a non-factor, with its node count and depth.
function certificate(w) {
  if (w.length <= 2) return null;
  const k = [0, 1].map(s => markedOf(w, s) ? null : certificate(parentOf(w, s)));
  if ([0, 1].some(s => !markedOf(w, s) && !k[s])) return null;
  return {s: 1, t: [true, true], k};
}
const size = n => n ? 1 + size(n.k[0]) + size(n.k[1]) : 0;
const depth = n => n ? 1 + Math.max(depth(n.k[0]), depth(n.k[1])) : 0;
// The two-tile rule, written again here: two different tiles only pair.
const allowedWay = (w, s) => w.length >= 2 && (w.length > 2 || s === 0 || w[0] === w[1]);
// The deepest legal tree: every way allowed tried, and every unmarked one
// shrunk, down to rows of one tile. If the rule let rows go round, this would
// never end.
function fullTree(w) {
  const t = [0, 1].map(s => allowedWay(w, s));
  return {s: t[1] ? 1 : t[0] ? 0 : null, t, k: [0, 1].map(s => t[s] && !markedOf(w, s) ? fullTree(parentOf(w, s)) : null)};
}
const forks = n => n ? (n.k[0] && n.k[1] ? 1 : 0) + forks(n.k[0]) + forks(n.k[1]) : 0;
// The moves that build a tree from a fresh row: for each way, a seam tap,
// then Shrink and the moves below.
function treeMoves(node, path = '', extra = {}) {
  const out = [];
  for (const s of [0, 1]) {
    if (!node.t[s]) continue;
    out.push({type: 'seam', at: path, s, ...extra});
    if (node.k[s]) out.push({type: 'shrink', at: path, s, ...extra}, ...treeMoves(node.k[s], path + s, extra));
  }
  return out;
}

// The moves that take a real row down to one tile, starting with way s on
// the row at path: a seam tap and Shrink at each row, on a way that fits.
function downMoves(w, s, path = '', extra = {}) {
  const out = [];
  for (;;) {
    out.push({type: 'seam', at: path, s, ...extra}, {type: 'shrink', at: path, s, ...extra});
    w = parentOf(w, s); path += s;
    if (w.length === 1) return out;
    s = w.length === 2 ? (w[0] === w[1] ? 1 : 0) : [0, 1].find(t => !markedOf(w, t) && isFactor(parentOf(w, t)));
  }
}
const fitWayOf = w => [0, 1].find(t => !markedOf(w, t) && isFactor(parentOf(w, t)));
// The moves, after the seams of way s, that show that way stuck: nothing if
// it marks a pair, else Shrink and the shrunk row's smallest certificate.
const stuckMoves = (w, s, extra = {}) => markedOf(w, s) ? [] : [{type: 'shrink', at: '', s, ...extra}, ...treeMoves(certificate(parentOf(w, s)), String(s), extra)];

// --- Play ---------------------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const carried = (p, a) => { const to = undo(a); return {...to, board: mechanicFor(p).carry(p, a.board, to.board)}; };
let slowest = 0;
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 90; steps++) {
    const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t), ms = (u.user + u.system) / 1000;
    slowest = Math.max(slowest, ms);
    assert.ok(ms < 100, `${p.id} ${label}: a quick hint (CPU time)`);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: hint words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// A seeded random number generator, so the counts repeat.
function rng(seed) { return () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }; }

function checkWords() {
  // The prefix holds every short factor: its counts match the formula.
  for (let n = 1; n <= 24; n++) {
    const seen = new Set();
    for (let i = 0; i + n <= TM.length; i++) seen.add(TM.slice(i, i + n));
    assert.equal(seen.size, complexity(n), `factors of length ${n}`);
  }
  // Real rows are the factors, fits are the parities of occurrence, the full
  // legal tree certifies exactly the non-factors (by the separate shrinker and
  // by the mechanic), and every full tree and certificate is legal and within
  // the limits, for every word of up to 16 tiles (the longest impostor run
  // allowed is 15).
  let checked = 0, biggest = 0, deepest = 0;
  const full = {rows: 0, levels: 0, forks: 0};
  for (let n = 1; n <= 16; n++) for (const w of words(n)) {
    assert.equal(real(w), isFactor(w), `${w}: real exactly when a factor`);
    if (n <= 12) for (const s of [0, 1]) assert.equal(fits(w, s), parities(w).includes(s), `${w}: way ${s} fits exactly when it occurs at that parity`);
    const f = fullTree(w);
    assert.equal(certifies(f, w), !isFactor(w), `${w}: the full tree certifies exactly a non-factor`);
    assert.equal(stuck(f, w), !isFactor(w), `${w}: the mechanic agrees on the full tree`);
    assert.ok(validTree(f, w), `${w}: the full tree is legal and within the limits`);
    full.rows = Math.max(full.rows, size(f)); full.levels = Math.max(full.levels, depth(f)); full.forks = Math.max(full.forks, forks(f));
    if (!isFactor(w)) {
      const c = certificate(w);
      assert.ok(c && validTree(c, w) && stuck(c, w), `${w}: a certificate the mechanic accepts`);
      biggest = Math.max(biggest, size(c)); deepest = Math.max(deepest, depth(c));
    }
    checked++;
  }
  // The two-tile rule: AB and BA only pair; a tree can't hold the other way.
  for (const w of ['AB', 'BA']) {
    assert.equal(validTree({s: 1, t: [false, true], k: [null, null]}, w), false, `${w}: leaving the first tile alone is not a way`);
    assert.equal(validTree({s: 0, t: [true, false], k: [{s: null, t: [false, false], k: [null, null]}, null]}, w), true, `${w}: pairing is`);
  }
  assert.equal(validTree({s: 1, t: [true, true], k: [null, {s: 0, t: [true, false], k: [{s: null, t: [false, false], k: [null, null]}, null]}]}, 'AA'), true, 'AA leaves the first tile alone, to BA, to B');
  // From four tiles on a factor fits one way only (recognizability).
  for (let n = 4; n <= 12; n++) for (const w of words(n)) if (isFactor(w)) assert.equal(parities(w).length, 1, `${w}: one way`);
  assert.deepEqual(words(3).filter(w => parities(w).length === 2), ['ABA', 'BAB'], 'ABA and BAB fit both ways');
  assert.ok(biggest <= LIMIT.nodes && deepest <= LIMIT.depth, 'every certificate of up to 16 tiles fits the limits');
  assert.ok(full.forks <= 1, 'a legal tree forks at most once, so it has at most two columns');
  return {checked, biggestCertificate: {rows: biggest, levels: deepest}, biggestLegalTree: full};
}

function checkSeams(p, row) {
  const q = p.parameters, fresh = freshAttempt(p);
  const ways = q.pieces.flatMap((w, i) => parities(w).map(s => [i, s]));
  assert.deepEqual(ways, row.ways, `${p.id}: the ways, from occurrences`);
  assert.deepEqual(p.solution.ways, row.ways, `${p.id}: the stored ways`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  refuse(p, fresh, {type: 'all'}, 'That’s all on an empty shelf');
  // Witness: take each way to one tile and keep it, then That's all.
  let a = fresh;
  for (const [i, s] of row.ways) {
    a = play(p, a, {type: 'seam', piece: i, at: '', s});
    refuse(p, a, {type: 'keep', piece: i}, 'Keep before the rows reach one tile');
    for (const m of downMoves(q.pieces[i], s, '', {piece: i}).slice(1)) a = play(p, a, m);
    a = play(p, a, {type: 'keep', piece: i});
    assert.equal(a.board.told, null, `${p.id}: Keep says nothing`);
  }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
  // A way that gets stuck is never kept, even once the tree shows it stuck.
  const wrong = [0, 1, 2].flatMap(i => [0, 1].map(s => [i, s])).find(x => !row.ways.some(y => y.join() === x.join()));
  let b = play(p, fresh, {type: 'seam', piece: wrong[0], at: '', s: wrong[1]});
  refuse(p, b, {type: 'keep', piece: wrong[0]}, 'a way that gets stuck');
  for (const m of stuckMoves(q.pieces[wrong[0]], wrong[1], {piece: wrong[0]})) b = play(p, b, m);
  refuse(p, b, {type: 'keep', piece: wrong[0]}, 'a way the tree shows stuck');
  // Too few: "There is another." once, standing through Undo (its note goes)
  // until the shelf changes.
  const [i0, s0] = row.ways[0];
  let c = fresh;
  for (const m of downMoves(q.pieces[i0], s0, '', {piece: i0})) c = play(p, c, m);
  c = play(p, play(p, c, {type: 'keep', piece: i0}), {type: 'all'});
  assert.equal(c.board.told, 'more', `${p.id}: there is another`);
  refuse(p, c, {type: 'all'}, 'That’s all twice on one shelf');
  const back = carried(p, c);
  assert.ok(back.board.refused && back.board.told === null, `${p.id}: Undo keeps the refusal and drops its note`);
  refuse(p, back, {type: 'all'}, 'That’s all after Undo on the same shelf');
  steps += hintsSolve(p, c, 'after too few');
  steps += hintsSolve(p, back, 'after Undo');
  // A save from before Keep waited for one tile may hold a way that gets
  // stuck: That's all says so, and the hints take it back.
  const old = {...fresh, board: {...fresh.board, shelf: [wrong]}};
  assert.ok(validBoard(p, old.board), `${p.id}: an old shelf with a stuck way loads`);
  const told = play(p, old, {type: 'all'});
  assert.equal(told.board.told, 'stuck', `${p.id}: a kept way that gets stuck`);
  steps += hintsSolve(p, told, 'after an old shelf with a stuck way');
  // Moves on the trees: a Shrink needs seams and no mark; a way is shrunk once.
  const [i, s] = row.ways[0];
  refuse(p, fresh, {type: 'shrink', piece: i, at: '', s}, 'Shrink before seams');
  refuse(p, fresh, {type: 'keep', piece: i}, 'Keep before seams');
  const placed = play(p, fresh, {type: 'seam', piece: i, at: '', s});
  refuse(p, placed, {type: 'seam', piece: i, at: '', s}, 'the same seams again');
  const shrunk = play(p, placed, {type: 'shrink', piece: i, at: '', s});
  refuse(p, shrunk, {type: 'shrink', piece: i, at: '', s}, 'a second Shrink of one way');
  refuse(p, fresh, {type: 'seam', piece: 9, at: '', s: 0}, 'a piece that isn’t there');
  refuse(p, fresh, {type: 'seam', piece: 0, at: '0', s: 0}, 'a row not yet shrunk');
  refuse(p, fresh, {type: 'seam', piece: 0, at: '', s: 2}, 'a third way');
  refuse(p, fresh, {type: 'drop', piece: 0, s: 0}, 'taking back a way not kept');
  const marked = q.pieces.flatMap((w, j) => [0, 1].filter(t => markedOf(w, t)).map(t => [j, t]))[0];
  if (marked) refuse(p, play(p, fresh, {type: 'seam', piece: marked[0], at: '', s: marked[1]}), {type: 'shrink', piece: marked[0], at: '', s: marked[1]}, 'Shrink on a marked way');
  refuse(p, a, {type: 'drop', piece: row.ways[0][0], s: row.ways[0][1]}, 'moves after the solve');
  // Forged saves.
  const sorted = list => [...list].sort((x, y) => JSON.stringify(x) < JSON.stringify(y) ? -1 : 1);
  for (const [board, why] of [
    [{...fresh.board, done: true}, 'a forged done'],
    [{...fresh.board, shelf: sorted([wrong, ...row.ways]), done: true}, 'done with a wrong way kept'],
    [{...fresh.board, shelf: row.ways.slice(1), done: true}, 'done with a way missing'],
    [{...fresh.board, told: 'more'}, 'a note without a refusal'],
    [{...fresh.board, told: 'stuck', refused: true}, '“gets stuck” on an empty shelf'],
    [{...fresh.board, refused: true}, 'a refusal of an empty shelf'],
    [{...a.board, refused: true, done: false}, 'a refusal of the whole answer'],
    [{...fresh.board, shelf: [[0, 0], [0, 0]]}, 'a way kept twice'],
    [{...fresh.board, shelf: [[0, 1], [0, 0]]}, 'an unsorted shelf'],
    [{...fresh.board, shelf: [[7, 0]]}, 'a way of a piece that isn’t there'],
    [{...fresh.board, trees: fresh.board.trees.slice(1)}, 'a missing tree'],
    [{...fresh.board, trees: fresh.board.trees.map((t, j) => j ? t : {s: 0, t: [false, false], k: [null, null]})}, 'seams on a way never tried'],
    [{...fresh.board, extra: 1}, 'an unknown field']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // A right shelf marked done is a finish whatever the trees show (a save's
  // trees are not checked against its shelf); it is what That's all makes.
  assert.ok(validBoard(p, {...fresh.board, shelf: row.ways, done: true}), `${p.id}: a right shelf is a finish`);
  // A row shrunk on a marked way is forged.
  if (marked) {
    const t = {s: marked[1], t: [marked[1] === 0, marked[1] === 1], k: [0, 1].map(x => x === marked[1] ? {s: null, t: [false, false], k: [null, null]} : null)};
    assert.equal(validBoard(p, {...fresh.board, trees: fresh.board.trees.map((x, j) => j === marked[0] ? t : x)}), false, `${p.id}: rejects a row shrunk on a marked way`);
  }
  return steps;
}

function checkRepair(p, row) {
  const q = p.parameters, fresh = freshAttempt(p);
  assert.ok(!isFactor(q.piece), `${p.id}: the piece is in no grown row`);
  const fixes = [...q.piece].map((_, i) => i).filter(i => isFactor(flip(q.piece, i)));
  assert.deepEqual(fixes, row.fixes, `${p.id}: the fixes, from occurrences`);
  assert.deepEqual(p.solution.fixes, row.fixes, `${p.id}: the stored fixes`);
  let steps = hintsSolve(p, fresh, 'from fresh');
  refuse(p, fresh, {type: 'all'}, 'That’s all on an empty shelf');
  // Each fix shrinks to one tile on the board, one way at a time, within the
  // limits; Keep waits for the last shrink. The witness keeps each, then
  // That's all.
  const keptFix = (a, i) => {
    let b = play(p, a, {type: 'flip', i});
    const moves = downMoves(flip(q.piece, i), fitWayOf(flip(q.piece, i)));
    assert.ok(moves.length / 2 <= LIMIT.depth, `${p.id}: flip ${i} shrinks within the limit`);
    for (const m of moves) { refuse(p, b, {type: 'keep'}, `Keep before flip ${i} reaches one tile`); b = play(p, b, m); }
    return play(p, b, {type: 'keep'});
  };
  let a = fresh;
  for (const i of row.fixes) a = keptFix(a, i);
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: the witness solves`);
  // A flip that still gets stuck is never kept, even once the tree shows it.
  const wrong = [...q.piece].map((_, i) => i).find(i => !row.fixes.includes(i));
  let b = play(p, fresh, {type: 'flip', i: wrong});
  const cert = certificate(flip(q.piece, wrong));
  for (const m of treeMoves(cert)) { refuse(p, b, {type: 'keep'}, 'a flip that gets stuck'); b = play(p, b, m); }
  assert.ok(stuck(b.board.tree, flip(q.piece, wrong)), `${p.id}: the tree shows the flip stuck`);
  refuse(p, b, {type: 'keep'}, 'a flip the tree shows stuck');
  steps += hintsSolve(p, b, 'after a wrong flip shown stuck');
  // One fix kept: That's all solves, or says there is another, standing
  // through Undo (its note goes).
  const c = play(p, keptFix(fresh, row.fixes[0]), {type: 'all'});
  assert.equal(c.board.told, row.fixes.length > 1 ? 'more' : null, `${p.id}: one fix kept`);
  if (row.fixes.length === 1) assert.ok(isSolved(p, c.board));
  else {
    refuse(p, c, {type: 'all'}, 'That’s all twice');
    const back = carried(p, c);
    assert.ok(back.board.refused && !back.board.told, `${p.id}: Undo keeps the refusal`);
    steps += hintsSolve(p, c, 'after one fix');
    steps += hintsSolve(p, back, 'after Undo');
  }
  // A save from before Keep waited for one tile may hold a flip that gets
  // stuck: That's all says so, and the hints take it back.
  const old = {...fresh, board: {...fresh.board, shelf: [wrong]}};
  assert.ok(validBoard(p, old.board), `${p.id}: an old shelf with a stuck flip loads`);
  const told = play(p, old, {type: 'all'});
  assert.equal(told.board.told, 'stuck', `${p.id}: a kept flip that still gets stuck`);
  refuse(p, told, {type: 'all'}, 'That’s all twice');
  const back = carried(p, told);
  assert.ok(back.board.refused && !back.board.told, `${p.id}: Undo keeps that refusal too`);
  steps += hintsSolve(p, told, 'after an old shelf with a stuck flip');
  steps += hintsSolve(p, back, 'after Undo of it');
  // A flip moves: flipping another tile puts the first back.
  const f = play(p, play(p, fresh, {type: 'flip', i: 0}), {type: 'flip', i: 1});
  assert.equal(f.board.flip, 1, `${p.id}: one flip at a time`);
  assert.equal(play(p, f, {type: 'flip', i: 1}).board.flip, null, `${p.id}: a second tap flips back`);
  refuse(p, fresh, {type: 'keep'}, 'Keep with no flip');
  refuse(p, fresh, {type: 'flip', i: q.piece.length}, 'a tile off the piece');
  refuse(p, fresh, {type: 'flip', i: 0.5}, 'half a tile');
  refuse(p, fresh, {type: 'drop', i: 0}, 'taking back a flip not kept');
  refuse(p, keptFix(fresh, row.fixes[0]), {type: 'keep'}, 'keeping a flip twice');
  for (const [board, why] of [
    [{...fresh.board, done: true}, 'a forged done'],
    [{...fresh.board, shelf: [wrong, ...row.fixes].sort((x, y) => JSON.stringify(x) < JSON.stringify(y) ? -1 : 1), done: true}, 'done with a wrong flip'],
    [{...fresh.board, flip: q.piece.length}, 'a flip off the piece'],
    [{...fresh.board, flip: 0, tree: {s: 0, t: [true, false], k: [{s: null, t: [false, false], k: [null, null]}, null]}}, 'a tree for another piece (or a marked way shrunk)'],
    [{...fresh.board, told: 'more', refused: true, shelf: [wrong]}, 'a note that doesn’t match the shelf'],
    [{...fresh.board, tree: null}, 'no tree'],
    [{...fresh.board, refused: true}, 'a refusal of an empty shelf'],
    [{...fresh.board, shelf: [1, 0]}, 'an unsorted shelf']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkImpostor(p, row, random) {
  const q = p.parameters, fresh = freshAttempt(p), n = q.strip.length;
  // The stuck runs, from occurrences.
  const runs = [];
  for (let len = 2; len <= q.k; len++) for (let a = 0; a + len <= n; a++) if (!isFactor(q.strip.slice(a, a + len))) runs.push([a, a + len - 1]);
  assert.equal(runs.length, row.dead, `${p.id}: stuck runs of at most ${q.k} tiles`);
  assert.deepEqual(runs[0], row.run, `${p.id}: the leftmost shortest stuck run`);
  assert.equal(row.run[1] - row.run[0] + 1, row.shortest, `${p.id}: its length`);
  assert.ok(q.k > row.shortest, `${p.id}: the budget is more than the shortest`);
  assert.deepEqual(p.solution.run, row.run, `${p.id}: the stored run`);
  // An endless strip shows every run of at most k tiles of the endless strip.
  if (q.endless) {
    const period = [1, 2, 3, 4, 5, 6, 7, 8].find(d => [...q.strip].every((c, i) => i < d || c === q.strip[i - d]));
    const endless = q.strip.repeat(4), seen = new Set(), shown = new Set();
    for (let len = 1; len <= q.k; len++) for (let a = 0; a < period; a++) seen.add(endless.slice(a, a + len));
    for (let len = 1; len <= q.k; len++) for (let a = 0; a + len <= n; a++) shown.add(q.strip.slice(a, a + len));
    assert.ok([...seen].every(w => shown.has(w)), `${p.id}: the strip shows every run`);
  }
  let steps = hintsSolve(p, fresh, 'from fresh');
  // Every stuck run can be certified within the limits, by the moves of its
  // smallest certificate; no real run can.
  for (const [a, z] of runs) {
    const w = q.strip.slice(a, z + 1), c = certificate(w);
    assert.ok(c && size(c) <= LIMIT.nodes && depth(c) <= LIMIT.depth, `${p.id}: a certificate for ${w}`);
    let b = play(p, fresh, {type: 'select', a, b: z});
    for (const m of treeMoves(c)) if (!isSolved(p, b.board)) b = play(p, b, m);
    assert.ok(isSolved(p, b.board), `${p.id}: ${w} certified by its moves`);
    assert.ok(certifies(b.board.tree, w), `${p.id}: the separate shrinker agrees`);
  }
  // A real run: every move of its deepest legal tree is accepted, Shrink
  // ends at rows of one tile, and the run never sticks.
  const realRun = [0, 1];
  let b = play(p, fresh, {type: 'select', a: realRun[0], b: realRun[1]});
  for (const m of treeMoves(fullTree(q.strip.slice(0, 2)))) b = play(p, b, m);
  assert.ok(!isSolved(p, b.board), `${p.id}: two tiles are never stuck`);
  refuse(p, b, {type: 'seam', at: '0', s: 0}, 'seams on a row of one tile');
  steps += hintsSolve(p, b, 'after choosing real tiles');
  for (let len = q.k; len >= 2; len--) for (let a = 0; a + len <= n; a++) {
    const w = q.strip.slice(a, a + len);
    if (!isFactor(w)) continue;
    b = play(p, fresh, {type: 'select', a, b: a + len - 1});
    for (const m of treeMoves(fullTree(w))) b = play(p, b, m);
    assert.ok(!isSolved(p, b.board), `${p.id}: ${w} never sticks`);
  }
  // The two-tile rule on the board: AB and BA only pair.
  const ab = (() => { for (let a = 0; a + 1 < n; a++) if (q.strip[a] !== q.strip[a + 1]) return a; })();
  b = play(p, fresh, {type: 'select', a: ab, b: ab + 1});
  refuse(p, b, {type: 'seam', at: '', s: 1}, 'leaving the first of two different tiles alone');
  steps += hintsSolve(p, play(p, play(p, b, {type: 'seam', at: '', s: 0}), {type: 'shrink', at: '', s: 0}), 'after shrinking two tiles to one');
  // Half a certificate, then hints; and a stuck run left half done.
  const [a0, z0] = row.run;
  let h = play(p, fresh, {type: 'select', a: a0, b: z0});
  h = play(p, h, {type: 'seam', at: '', s: 0});
  steps += hintsSolve(p, h, 'after one seam on the stuck run');
  // Illegal moves.
  refuse(p, fresh, {type: 'select', a: 0, b: q.k}, 'more than k tiles');
  refuse(p, fresh, {type: 'select', a: 3, b: 3}, 'one tile');
  refuse(p, fresh, {type: 'select', a: -1, b: 2}, 'a tile off the strip');
  refuse(p, fresh, {type: 'select', a: n - 2, b: n}, 'a tile past the end');
  refuse(p, fresh, {type: 'seam', at: '', s: 0}, 'seams with no tiles chosen');
  const chosen = play(p, fresh, {type: 'select', a: a0, b: z0});
  refuse(p, chosen, {type: 'select', a: a0, b: z0}, 'the same tiles again');
  refuse(p, chosen, {type: 'shrink', at: '', s: 0}, 'Shrink before seams');
  refuse(p, chosen, {type: 'seam', at: '1', s: 0}, 'a row not yet shrunk');
  refuse(p, chosen, {type: 'seam', at: 'x', s: 0}, 'a bad path');
  refuse(p, chosen, {type: 'keep'}, 'Keep (no shelf here)');
  refuse(p, chosen, {type: 'all'}, 'That’s all (no shelf here)');
  const reselect = play(p, play(p, chosen, {type: 'seam', at: '', s: 1}), {type: 'select', a: 0, b: 1});
  assert.equal(reselect.board.tree.s, null, `${p.id}: choosing again starts a new row`);
  // Forged saves.
  const solvedBoard = (() => { let x = play(p, fresh, {type: 'select', a: a0, b: z0}); for (const m of treeMoves(certificate(q.strip.slice(a0, z0 + 1)))) if (!isSolved(p, x.board)) x = play(p, x, m); return x.board; })();
  refuse(p, {...fresh, board: solvedBoard}, {type: 'select', a: 0, b: 1}, 'moves after the solve');
  const leafNode = {s: null, t: [false, false], k: [null, null]};
  for (const [board, why] of [
    [{sel: null, tree: leafNode}, 'a tree with no tiles chosen'],
    [{sel: [0, q.k], tree: leafNode}, 'too many tiles'],
    [{sel: [2, 2], tree: leafNode}, 'one tile'],
    [{sel: [3, 1], tree: leafNode}, 'a backwards choice'],
    [{sel: [a0, z0], tree: {s: 1, t: [true, true], k: [null, null]}, done: true}, 'a forged done field'],
    [{sel: [a0, z0], tree: {s: 0, t: [false, false], k: [null, null]}}, 'seams on a way never tried'],
    [{sel: [a0, z0], tree: {s: null, t: [false, false], k: [leafNode, null]}}, 'a row shrunk on a way never tried'],
    [{sel: [a0, z0], tree: {s: null, t: [true, true], k: [{s: null, t: [true, true], k: [null, null], x: 1}, null]}}, 'an unknown field in a row'],
    [{sel: [a0, z0], tree: chainOf(LIMIT.depth + 2)}, 'a tree deeper than the limit']
  ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // A forged stuck tree on a real run: marks can't be claimed where there are none.
  const longReal = (() => { for (let len = q.k; len >= 2; len--) for (let a = 0; a + len <= n; a++) if (isFactor(q.strip.slice(a, a + len))) return [a, a + len - 1]; })();
  const realW = q.strip.slice(longReal[0], longReal[1] + 1);
  assert.ok(!stuck({s: 1, t: [true, true], k: [null, null]}, realW), `${p.id}: trying both ways of a real run without shrinking proves nothing`);
  // Random play: how often do random choices and taps solve? A choice of tiles
  // is the real decision; the share that solves is about the share of stuck runs.
  let solves = 0;
  const trials = 400;
  for (let t = 0; t < trials; t++) {
    let x = fresh;
    for (let m = 0; m < 40 && !isSolved(p, x.board); m++) {
      const options = legalMoves(p, x.board);
      if (!options.length) break;
      const pick = options[Math.floor(random() * options.length)], next = move(p, x, pick);
      assert.ok(next, `${p.id}: random play's move ${JSON.stringify(pick)} is legal`);
      x = next;
    }
    if (isSolved(p, x.board)) solves++;
  }
  const total = (() => { let c = 0; for (let len = 2; len <= q.k; len++) c += Math.max(0, n - len + 1); return c; })();
  // Two plainer strategies: choose k tiles anywhere (the share of k-tile runs
  // that are stuck), and slide k tiles along from the left (the try that
  // first sticks).
  const full = Array.from({length: n - q.k + 1}, (_, a) => q.strip.slice(a, a + q.k));
  const fullBudget = full.filter(w => !isFactor(w)).length / full.length;
  const slide = full.findIndex(w => !isFactor(w)) + 1;
  return {steps, randomShare: solves / trials, stuckShare: runs.length / total, fullBudget, slide};
}
// A chain of rows each shrunk on its first way, deeper than allowed.
function chainOf(d) { let node = {s: null, t: [false, false], k: [null, null]}; for (let i = 0; i < d; i++) node = {s: 0, t: [true, false], k: [node, null]}; return node; }
// The impostor's legal moves (selections reselect only now and then).
function legalMoves(p, b) {
  const q = p.parameters, out = [];
  if (b.sel === null) {
    for (let len = 2; len <= q.k; len++) for (let a = 0; a + len <= q.strip.length; a++) out.push({type: 'select', a, b: a + len - 1});
    return out;
  }
  const visit = (node, w, path) => {
    if (!node || w.length < 2) return;
    for (const s of [0, 1]) {
      if (node.s !== s) { if (allowedWay(w, s)) out.push({type: 'seam', at: path, s}); }
      else if (!node.k[s] && !markedOf(w, s)) out.push({type: 'shrink', at: path, s});
      if (node.k[s]) visit(node.k[s], parentOf(w, s), path + s);
    }
  };
  visit(b.tree, q.strip.slice(b.sel[0], b.sel[1] + 1), '');
  return out;
}

// A hint never judges the child's own tiles, flip or seams before the
// child's tree has settled them: the first hint after a choice, a flip or
// seams is a step of the child's own shrinking, with the same words whether
// it fits or not.
function checkHintsWait(p) {
  const q = p.parameters, fresh = freshAttempt(p);
  if (q.mode === 'impostor') {
    const texts = new Set();
    for (let len = 2; len <= q.k; len++) for (let a = 0; a + len <= q.strip.length; a++) {
      const h = nextHint(p, play(p, fresh, {type: 'select', a, b: a + len - 1}));
      assert.ok(h.action.type === 'seam' && h.action.at === '', `${p.id}: after choosing tiles ${a + 1}–${a + len}, the hint is a seam on them`);
      texts.add(h.text.replace(/\d+/g, '#'));
    }
    assert.equal(texts.size, 1, `${p.id}: the same words for a stuck run and a real one`);
  }
  if (q.mode === 'repair') {
    for (let i = 0; i < q.piece.length; i++) {
      const h = nextHint(p, play(p, fresh, {type: 'flip', i}));
      assert.ok(h.action.type === 'seam' && h.text === 'Place seams on the piece and shrink.', `${p.id}: after flipping tile ${i + 1}, the hint shrinks the piece`);
    }
  }
  if (q.mode === 'seams') {
    for (let i = 0; i < q.pieces.length; i++) for (const s of [0, 1]) {
      const a = play(p, fresh, {type: 'seam', piece: i, at: '', s}), first = nextHint(p, a);
      assert.notEqual(first.action.type, 'keep', `${p.id}: no Keep before the way is shrunk`);
      // Unless the seams mark a pair (shown at once), the hint shrinks them.
      if (!markedOf(q.pieces[i], s)) assert.ok(first.action.type === 'shrink' && first.action.piece === i && first.action.at === '' && first.action.s === s, `${p.id}: seams placed on piece ${i + 1} are shrunk first`);
      // Nor can the child keep it before the rows reach one tile.
      refuse(p, a, {type: 'keep', piece: i}, `Keep of seams on piece ${i + 1} before they are shrunk`);
    }
  }
}

function checkPlayground(p) {
  const fresh = freshAttempt(p);
  assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid, never solved`);
  let a = fresh;
  for (let r = 1; r < p.parameters.rows; r++) a = play(p, a, {type: 'grow'});
  refuse(p, a, {type: 'grow'}, 'a row past the last');
  a = play(p, a, {type: 'start'});
  assert.equal(a.board.start, 'B');
  assert.ok(!isSolved(p, a.board));
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no hints in the playground`);
  for (const [board, why] of [[{start: 'C', rows: 1}, 'a third letter'], [{start: 'A', rows: 0}, 'no rows'], [{start: 'A', rows: p.parameters.rows + 1}, 'too many rows'], [{start: 'A', rows: 1, done: true}, 'a forged done']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export async function validateShrink() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/shrink/shrink.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-76')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-76.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'shrink');
  const words = checkWords();
  const [playground, ...puzzles] = pack.puzzles;
  assert.equal(playground.id, 'shrink-playground');
  for (const mode of MODES) assert.ok(pack.puzzles.some(p => p.parameters.mode === mode), `a ${mode} puzzle`);
  checkPlayground(playground);
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  let hintSteps = 0;
  const shares = {};
  const random = rng(76);
  for (const p of pack.puzzles) {
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.match(p.provenance, /Week 76|new/i, `${p.id}: provenance names its source`);
    assert.match(p.controls, /^A row grows by turning every A into AB/, `${p.id}: How to play opens with the mathematics`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(p.visibleObjective.length < 150 && !/\n/.test(p.visibleObjective), `${p.id}: one short objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/can.t|press/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    assert.ok(!/\b(both|ends?|only|none|stuck|ABABA|fix(es)?)\b/i.test(p.title), `${p.id}: the title does not give the answer away`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
  }
  for (const p of puzzles) {
    const row = TABLE[p.id], q = p.parameters;
    assert.equal(p.mechanic, 'shrink');
    assert.equal(p.band, 'all');
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    const first = nextHint(p, fresh);
    assert.equal(first.type, 'move', `${p.id}: a first hint`);
    assert.ok(first.action.type !== 'all', `${p.id}: the first hint is never That’s all`);
    for (const forged of [null, [], 'x', {}]) assert.equal(validBoard(p, forged), false, `${p.id}: rejects ${JSON.stringify(forged)}`);
    refuse(p, fresh, {type: 'fly'}, 'an unknown move');
    refuse(p, fresh, null, 'no move');
    refuse(p, fresh, {type: 'grow'}, 'a playground move');
    // The stored witness solves.
    let w = fresh;
    for (const m of p.solution.moves) w = play(p, w, m);
    assert.ok(isSolved(p, w.board), `${p.id}: the stored witness solves`);
    checkHintsWait(p);
    if (q.mode === 'seams') {
      hintSteps += checkSeams(p, row);
      shares[p.id] = 'Keep only once the rows reach one tile';
    } else if (q.mode === 'repair') {
      hintSteps += checkRepair(p, row);
      shares[p.id] = 'Keep only once the rows reach one tile';
    } else {
      const r = checkImpostor(p, row, random);
      hintSteps += r.steps;
      // One choice of tiles per try: random play can do no better than the
      // share of stuck runs, up to sampling noise (400 tries).
      assert.ok(r.randomShare <= r.stuckShare + 0.08 && r.randomShare < 0.4, `${p.id}: random play solves no more often than a random run is stuck (${r.randomShare})`);
      // Past puzzle 2 (every run of 6 tiles of AB repeated is stuck), the
      // choice of tiles matters: some runs of the full budget fit.
      if (p.id !== 'shrink-02') assert.ok(r.fullBudget < 1, `${p.id}: some run of ${q.k} tiles fits (${r.fullBudget})`);
      shares[p.id] = `random play ${(r.randomShare * 100).toFixed(1)}% (stuck runs ${(r.stuckShare * 100).toFixed(1)}% of choices); ${q.k} tiles anywhere ${(r.fullBudget * 100).toFixed(0)}%; ${q.k} tiles slid from the left stick on try ${r.slide}`;
    }
  }
  return {puzzles: puzzles.length, playground: 1, words, hintSteps, slowestHintMs: Number(slowest.toFixed(2)), randomSolveShares: shares};
}
export default validateShrink;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateShrink(), null, 2));
