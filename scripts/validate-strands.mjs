// Checks the Strands pack (dist/families/strands/strands.json) by methods
// unlike the mechanic's. The cylinder is rebuilt from the room spec's
// coordinates; crossings are counted as sign changes of blue against every
// translate of red, band by band, in integer arithmetic (the mechanic counts
// whole turns between gaps); every fewest is the exact minimum over every
// pair of bead positions the puzzle allows, found by a search over rows of
// (red, blue) columns, and matches max(|a − b| − 1, 0) and a winding sweep;
// the copies blue must cross are found by sides at the ends; design targets
// are decided over all ends from gaps on a line, and three tight strands are
// checked crossing by crossing with no three meeting. Hint chains are run
// from fresh, after a wrong move, after a wrong Done, pick or Can't, with
// Undo, and from random tangles; hint words are read back against their
// moves; illegal moves and forged saves are refused; the playground's twists
// keep every crossing. Run: node scripts/validate-strands.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {layout, cylOf} from '../dist/families/strands/strands.js';
import {loadPack} from './packs.mjs';

// --- An independent cylinder ---------------------------------------------------
// From the room spec: one column of squares glued to itself left to right,
// glued upward between rows, walls at the top and bottom.
function cylinder(q) {
  const ids = Object.keys(q.room.squares), xs = new Set(ids.map(id => q.room.squares[id][0])), ys = ids.map(id => q.room.squares[id][1]);
  assert.equal(xs.size, 1, 'one column of squares');
  for (const id of ids) {
    assert.equal(q.room.right[id], id, `${id} is glued to itself left to right`);
    const above = ids.find(o => q.room.squares[o][1] === q.room.squares[id][1] + 1);
    assert.equal(q.room.up[id] ?? null, above ?? null, `${id}: glued up to the square above, a wall at the top`);
  }
  assert.equal(q.room.lattice, 'crosses');
  const N = q.room.n, M = (Math.max(...ys) - Math.min(...ys) + 1) * q.room.n;
  return {N, M, a: q.a, lo: q.copies[0] * N, hi: (q.copies[1] + 1) * N - 1};
}
const lifted = (K, beads, w) => [K.a, ...beads, K.a + w * K.N];
// Interior crossings of blue with every translate of red: in each band the
// two straight pieces cross a translate when blue − red − kN changes sign
// strictly. A zero only happens at A and B, which are not crossings.
function crossingsOf(K, r, b) {
  let n = 0;
  for (let j = 0; j < K.M; j++) {
    const lo = Math.min(b[j] - r[j], b[j + 1] - r[j + 1]), hi = Math.max(b[j] - r[j], b[j + 1] - r[j + 1]);
    for (let k = Math.floor(lo / K.N) - 1; k <= Math.ceil(hi / K.N) + 1; k++) {
      const s0 = Math.sign(b[j] - r[j] - k * K.N), s1 = Math.sign(b[j + 1] - r[j + 1] - k * K.N);
      if (s0 * s1 < 0) n++;
    }
  }
  return n;
}
// Lattice rows strictly between the rims: never two beads on one spot of the cylinder.
const apartOk = (K, routes) => { for (let j = 1; j < K.M; j++) for (let i = 0; i < routes.length; i++) for (let k = i + 1; k < routes.length; k++) if (((routes[k][j] - routes[i][j]) % K.N + K.N) % K.N === 0) return false; return true; };
// The exact fewest over every placement of both strands' beads in the view:
// a search over rows of (red column, blue column).
function fewestBySearch(K, wr, wb) {
  const cols = [];
  for (let x = K.lo; x <= K.hi; x++) cols.push(x);
  let layer = new Map([[`${K.a},${K.a}`, 0]]);
  for (let j = 1; j <= K.M; j++) {
    const next = new Map(), here = j === K.M ? [[K.a + wr * K.N, K.a + wb * K.N]] : cols.flatMap(x => cols.filter(y => ((y - x) % K.N + K.N) % K.N !== 0).map(y => [x, y]));
    for (const [x, y] of here) {
      let best = Infinity;
      for (const [key, c] of layer) {
        const [px, py] = key.split(',').map(Number), u = py - px, v = y - x;
        let band = 0;
        for (let k = Math.floor(Math.min(u, v) / K.N); k <= Math.ceil(Math.max(u, v) / K.N); k++) if (Math.sign(u - k * K.N) * Math.sign(v - k * K.N) < 0) band++;
        if (c + band < best) best = c + band;
      }
      next.set(`${x},${y}`, best);
    }
    layer = next;
  }
  return [...layer.values()][0];
}
// The same over gaps alone (blue − red on each row), for a wider sweep.
function fewestByGaps(N, M, d) {
  const G = [];
  for (let g = -6 * N; g <= 6 * N; g++) if (g % N !== 0) G.push(g);
  const band = (u, v) => { let n = 0; for (let k = -8; k <= 8; k++) if (Math.sign(u - k * N) * Math.sign(v - k * N) < 0) n++; return n; };
  let layer = new Map([[0, 0]]);
  for (let j = 1; j <= M; j++) {
    const next = new Map();
    for (const g of j === M ? [d * N] : G) next.set(g, Math.min(...[...layer].map(([h, c]) => c + band(h, g))));
    layer = next;
  }
  return [...layer.values()][0];
}
// The copies of red that blue must cross: blue starts on one side of the
// copy and finishes on the other.
const forcedCopies = (wr, wb) => { const out = []; for (let k = -12; k <= 12; k++) { const start = Math.sign(0 - k), end = Math.sign(wb - (wr + k)); if (start * end < 0) out.push(k); } return out; };
// Three ends on a line: a target t needs ends t + 1 apart (0 or 1 for t = 0).
const gapOk = (t, g) => t === 0 ? g <= 1 : g === t + 1;
const designOk = (targets, w) => [[0, 1], [1, 2], [0, 2]].every(([i, k], n) => gapOk(targets[n], Math.abs(w[i] - w[k])));

// --- Reading hints back ----------------------------------------------------------
const WORD = {one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12};
const NUM = new Proxy(WORD, {get: (t, k) => t[k] ?? (/^\d+$/.test(k) ? Number(k) : undefined)});
const ORD = {first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7};
const COL = {red: 0, blue: 1, green: 2};
function readHint(text) {
  let m = text.match(/^Drag the (\w+) (red|blue) bead from the bottom (\w+) places? (left|right)\.$/);
  if (m) return {kind: 'bead', strand: COL[m[2]], row: ORD[m[1]], by: NUM[m[3]] * (m[4] === 'right' ? 1 : -1)};
  m = text.match(/^Move the (red|blue|green) end (\w+) cop(?:y|ies) (left|right)\.$/);
  if (m) return {kind: 'end', strand: COL[m[1]], by: NUM[m[2]] * (m[3] === 'right' ? 1 : -1)};
  m = text.match(/^Tap the red copy that starts (\w+) cop(?:y|ies) (left|right) of A: blue starts on one side of it and ends on the other\.$/);
  if (m) return {kind: 'copy', k: NUM[m[1]] * (m[2] === 'right' ? 1 : -1)};
  m = text.match(/^Tap (red|blue|green): its end is between the other two(?:, level with (red|blue|green)’s)?\.$/);
  if (m) return {kind: 'strand', strand: COL[m[1]]};
  if (/^(No crossings are left|Every crossing left is with a copy of red that blue has to cross)\. Press Done\.$/.test(text)) return {kind: 'done'};
  if (/\. Press Can’t\.$/.test(text) && text.length > 40) return {kind: 'cant'};
  return null;
}
function hintMatches(p, board, h) {
  const r = readHint(h.text);
  assert.ok(r, `${p.id}: a hint I can read: ${h.text}`);
  const a = h.action;
  if (r.kind === 'bead') { assert.equal(a.type, 'bead'); assert.equal(a.strand, r.strand); assert.equal(a.row, r.row); assert.equal(a.x - board.s[a.strand][a.row - 1], r.by, `${p.id}: ${h.text}`); }
  else if (r.kind === 'end') { assert.equal(a.type, 'end'); assert.equal(a.strand, r.strand); assert.equal(a.w - board.w[a.strand], r.by, `${p.id}: ${h.text}`); }
  else if (r.kind === 'copy') assert.deepEqual(a, {type: 'pick', k: r.k});
  else if (r.kind === 'strand') assert.deepEqual(a, {type: 'pick', strand: r.strand});
  else assert.equal(a.type, r.kind === 'done' ? 'done' : 'cant');
}

// --- Playing --------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// The app's Undo: back one board, carrying a refusal the mechanic keeps.
const undoKeep = (p, a) => { const back = undo(a); const carry = mechanicFor(p).carry; return carry ? {...back, board: carry(p, a.board, back.board)} : back; };
let slowest = 0;
function hintsSolve(p, a, label) {
  let n = 0;
  for (; !isSolved(p, a.board) && n < 120; n++) {
    const t0 = performance.now(), h = nextHint(p, a);
    slowest = Math.max(slowest, performance.now() - t0);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text && h.text.length < 240, `${p.id} ${label}: a short hint`);
    hintMatches(p, a.board, h);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return {n, a};
}
const randomBead = (p, a, rand) => {
  const K = cylinder(p.parameters);
  for (let tries = 0; tries < 50; tries++) {
    const action = {type: 'bead', strand: Math.floor(rand() * 2), row: 1 + Math.floor(rand() * (K.M - 1)), x: K.lo + Math.floor(rand() * (K.hi - K.lo + 1))};
    const next = move(p, a, action);
    if (next && next !== a) return next;
  }
  return a;
};
const seeded = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const countOf = (p, board) => { const K = cylinder(p.parameters); return crossingsOf(K, lifted(K, board.s[0], p.parameters.w[0]), lifted(K, board.s[1], p.parameters.w[1])); };

export async function validateStrands() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/strands/strands.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('source/week-75')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-75.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'strands');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  const order = ['easy', 'medium', 'hard'];
  puzzles.forEach((p, i) => { if (i) assert.ok(order.indexOf(p.difficulty_level) >= order.indexOf(puzzles[i - 1].difficulty_level), `${p.id}: levels in order`); });
  assert.equal(new Set(puzzles.map(p => JSON.stringify(p.parameters))).size, puzzles.length, 'distinct starts');

  // The theorem over a sweep of windings, by the gap search.
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) assert.equal(fewestByGaps(4, 8, b - a), Math.max(Math.abs(a - b) - 1, 0), `fewest for windings ${a}, ${b}`);
  // Three windings that each cross once: impossible over a wide range.
  for (let a = -12; a <= 12; a++) for (let b = -12; b <= 12; b++) for (let c = -12; c <= 12; c++) assert.ok(!designOk([1, 1, 1], [a, b, c]));

  const counts = {untangle: 0, design: 0, hintSteps: 0, randomStarts: 0, forged: 0, illegal: 0};
  for (const p of puzzles) {
    const q = p.parameters, fresh = freshAttempt(p);
    for (const key of ['title', 'objective', 'idea', 'prerequisites', 'controls', 'provenance']) assert.ok(typeof p[key] === 'string' && p[key].trim(), `${p.id}: ${key}`);
    assert.match(p.provenance, /Week 75|^New/, `${p.id}: provenance names the week or says new`);
    assert.equal(p.hints.length, 3);
    assert.ok(!/Can’t|Done/.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    for (const key of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[key]?.trim(), `${p.id}: parent.${key}`);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid and unsolved`);
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.ok(!/Press (Done|Can’t)/.test(nextHint(p, fresh).text), `${p.id}: the first move hint is an attempt`);
    if (q.mode === 'untangle') { checkUntangle(p, fresh); counts.untangle++; }
    else { checkDesign(p, fresh); counts.design++; }
    counts.hintSteps += hintsSolve(p, fresh, 'from fresh').n;
    // From random tangles and after a run of wrong moves.
    if (q.mode === 'untangle') {
      const rand = seeded(p.number * 7919);
      for (let t = 0; t < 12; t++) {
        let a = fresh;
        for (let s = 0; s < 6; s++) a = randomBead(p, a, rand);
        if (!isSolved(p, a.board)) { hintsSolve(p, a, `from random tangle ${t}`); counts.randomStarts++; }
      }
    }
    checkForged(p, fresh, counts);
  }
  checkPlayground(pack.puzzles.find(p => p.band === 'playground'), counts);
  assert.ok(slowest < 100, `every hint answers in well under 100 ms (slowest ${slowest.toFixed(1)} ms)`);
  return {...counts, slowestHintMs: Number(slowest.toFixed(1))};
}

// Bead moves to given positions: any bead that can go goes; when every
// remaining one is blocked, the bead in its way steps aside first.
function reach(p, a, target) {
  const K = cylinder(p.parameters);
  for (let pass = 0; pass < 40; pass++) {
    const left = [];
    target.forEach((beads, i) => beads.forEach((x, r) => { if (a.board.s[i][r] !== x) left.push([i, r, x]); }));
    if (!left.length) return a;
    let moved = false;
    for (const [i, r, x] of left) { const next = move(p, a, {type: 'bead', strand: i, row: r + 1, x}); if (next) { a = next; moved = true; } }
    if (moved) continue;
    const [i, r] = left[0];
    for (let x = K.lo; x <= K.hi && !moved; x++) { const next = move(p, a, {type: 'bead', strand: 1 - i, row: r + 1, x}); if (next && x !== target[i][r] && ((x - target[i][r]) % K.N + K.N) % K.N !== 0) { a = next; moved = true; } }
    assert.ok(moved, `${p.id}: beads can reach the witness`);
  }
  assert.fail(`${p.id}: beads reach the witness`);
}

function checkUntangle(p, fresh) {
  const q = p.parameters, K = cylinder(q), [wr, wb] = q.w;
  const start = countOf(p, fresh.board), least = fewestBySearch(K, wr, wb);
  assert.equal(start, p.solution.startCrossings, `${p.id}: start crossings`);
  assert.equal(least, p.solution.fewest, `${p.id}: the fewest is the true minimum on the lattice`);
  assert.equal(least, Math.max(Math.abs(wr - wb) - 1, 0), `${p.id}: the formula`);
  assert.ok(start > least, `${p.id}: starts above the fewest`);
  assert.deepEqual(forcedCopies(wr, wb), p.solution.barriers, `${p.id}: the copies blue must cross`);
  assert.equal(forcedCopies(wr, wb).length, least, `${p.id}: one crossing per forced copy`);
  // Every forced copy shows in the unrolled view from end to end.
  for (const k of forcedCopies(wr, wb)) for (const x of [K.a + k * K.N, K.a + (wr + k) * K.N]) assert.ok(x >= q.copies[0] * K.N && x <= (q.copies[1] + 1) * K.N, `${p.id}: copy ${k} in the view`);
  const t = p.title.toLowerCase(), first = p.hints[0].toLowerCase(), words = ['zero', 'one', 'two', 'three', 'four', 'five'];
  if (least > 0) for (const s of [t, first]) assert.ok(!new RegExp(`\\b(${least}|${words[least]}) crossings?\\b`).test(s), `${p.id}: the fewest isn’t named`);
  // The witness: beads that reach the fewest, played as moves.
  const a = reach(p, fresh, p.solution.witness);
  assert.equal(countOf(p, a.board), least, `${p.id}: the witness reaches the fewest`);
  // The static hint's bead move, read back, is legal and takes crossings away.
  const r = readHint(p.hints[2]);
  if (r?.kind === 'bead') { const after = play(p, fresh, {type: 'bead', strand: r.strand, row: r.row, x: fresh.board.s[r.strand][r.row - 1] + r.by}); assert.ok(countOf(p, after.board) < start, `${p.id}: the third hint helps`); }
  // A wrong Done: told, Done is refused until a bead moves, and Undo keeps the refusal.
  const wrong = play(p, fresh, {type: 'done'});
  assert.equal(wrong.board.told, 'fewer');
  assert.ok(!isSolved(p, wrong.board));
  refuse(p, wrong, {type: 'done'}, 'Done again with nothing moved');
  const back = undoKeep(p, wrong);
  assert.equal(back.board.told, 'fewer', `${p.id}: Undo doesn’t escape the refusal`);
  hintsSolve(p, wrong, 'after a wrong Done');
  // At the fewest: Done, a wrong copy, then the hints.
  const tight = a.board;
  let at = play(p, a, {type: 'done'});
  if (least === 0) { assert.ok(isSolved(p, at.board), `${p.id}: Done at no crossings solves`); return; }
  assert.deepEqual(at.board.claim, []);
  assert.ok(!isSolved(p, at.board));
  refuse(p, at, {type: 'bead', strand: 1, row: 1, x: tight.s[1][0] + 1}, 'a bead move during the claim');
  refuse(p, at, {type: 'done'}, 'Done during the claim');
  for (const k of [0, wb - wr]) {
    const miss = play(p, at, {type: 'pick', k});
    assert.equal(miss.board.told, 'miss', `${p.id}: copy ${k} shares an end with blue`);
    assert.equal(miss.board.claim, null);
    assert.equal(undoKeep(p, miss).board.told, 'miss', `${p.id}: Undo keeps the refusal`);
    hintsSolve(p, miss, `after tapping copy ${k}`);
  }
  // The forced copies, in any order, solve; tapping one twice is refused.
  for (const k of [...p.solution.barriers].reverse()) { if (at.board.claim?.length) refuse(p, at, {type: 'pick', k: at.board.claim[0]}, 'the same copy twice'); at = play(p, at, {type: 'pick', k}); }
  assert.ok(isSolved(p, at.board), `${p.id}: the forced copies are the certificate`);
  refuse(p, at, {type: 'bead', strand: 0, row: 1, x: tight.s[0][0] + 1}, 'a move after the solve');
}

function checkDesign(p, fresh) {
  const q = p.parameters, K = cylinder(q), W = [];
  for (let w = q.copies[0]; w <= q.copies[1]; w++) W.push(w);
  const good = W.flatMap(a => W.flatMap(b => W.map(c => [a, b, c]))).filter(w => designOk(q.targets, w));
  assert.equal(good.length > 0, !p.solution.cant, `${p.id}: possible or not`);
  // Every triple of ends: the tight strands cross pairwise as the gaps say, and no three meet.
  const C = cylOf(q);
  for (const a of W) for (const b of W) for (const c of W) {
    const routes = layout(C, [a, b, c]);
    assert.ok(apartOk(K, routes), `${p.id}: tight strands apart at ${a},${b},${c}`);
    [[0, 1], [1, 2], [0, 2]].forEach(([i, k]) => assert.equal(crossingsOf(K, routes[i], routes[k]), Math.max(Math.abs([a, b, c][i] - [a, b, c][k]) - 1, 0), `${p.id}: tight ${a},${b},${c} pair ${i}${k}`));
    const meets = [];
    for (const [i, k] of [[0, 1], [1, 2], [0, 2]]) for (let j = 0; j < K.M; j++) {
      const d0 = routes[k][j] - routes[i][j], d1 = routes[k][j + 1] - routes[i][j + 1];
      for (let m = -10; m <= 10; m++) if (Math.sign(d0 - m * K.N) * Math.sign(d1 - m * K.N) < 0) { const s = (m * K.N - d0) / (d1 - d0); meets.push([j + s, (((routes[i][j] + (routes[i][j + 1] - routes[i][j]) * s) % K.N) + K.N) % K.N]); }
    }
    for (let u = 0; u < meets.length; u++) for (let v = u + 1; v < meets.length; v++) assert.ok(Math.abs(meets[u][0] - meets[v][0]) > 1e-9 || Math.abs(meets[u][1] - meets[v][1]) > 1e-9, `${p.id}: no three strands meet at ${a},${b},${c}`);
  }
  refuse(p, fresh, {type: 'cant'}, 'Can’t before any end has moved');
  refuse(p, fresh, {type: 'pick', strand: 0}, 'a pick before Can’t');
  refuse(p, fresh, {type: 'end', strand: 0, w: q.copies[1] + 1}, 'an end past the view');
  refuse(p, fresh, {type: 'end', strand: 3, w: 0}, 'a fourth strand');
  refuse(p, fresh, {type: 'end', strand: 0, w: fresh.board.w[0]}, 'an end that stays');
  if (!p.solution.cant) {
    assert.ok(good.some(w => JSON.stringify(w) === JSON.stringify(p.solution.windings)), `${p.id}: the witness meets the targets`);
    let a = fresh;
    for (const [i, w] of p.solution.windings.entries()) if (a.board.w[i] !== w) a = play(p, a, {type: 'end', strand: i, w});
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    // A wrong Can't: told, refused again, kept through Undo, and the hints still solve.
    const tried = play(p, fresh, {type: 'end', strand: 0, w: fresh.board.w[0] + 1 <= q.copies[1] ? fresh.board.w[0] + 1 : fresh.board.w[0] - 1});
    const wrong = isSolved(p, tried.board) ? null : play(p, tried, {type: 'cant'});
    if (wrong) {
      assert.equal(wrong.board.told, 'way');
      refuse(p, wrong, {type: 'cant'}, 'Can’t twice');
      assert.equal(undoKeep(p, wrong).board.told, 'way', `${p.id}: Undo keeps the refusal`);
      hintsSolve(p, wrong, 'after a wrong Can’t');
    }
    return;
  }
  // Impossible: Can't after an attempt, then the middle strand.
  const tried = play(p, fresh, {type: 'end', strand: 1, w: 2});
  const claim = play(p, tried, {type: 'cant'});
  assert.equal(claim.board.claim, true);
  refuse(p, claim, {type: 'end', strand: 0, w: 1}, 'an end move during the claim');
  const mid = [0, 1, 2].find(i => { const o = claim.board.w.filter((_, k) => k !== i); return Math.min(...o) <= claim.board.w[i] && claim.board.w[i] <= Math.max(...o); });
  for (const i of [0, 1, 2]) {
    const after = play(p, claim, {type: 'pick', strand: i});
    const o = claim.board.w.filter((_, k) => k !== i), between = Math.min(...o) <= claim.board.w[i] && claim.board.w[i] <= Math.max(...o);
    assert.equal(isSolved(p, after.board), between, `${p.id}: strand ${i} ${between ? 'is' : 'isn’t'} in the middle`);
    if (!between) { assert.equal(after.board.told, 'miss'); assert.equal(undoKeep(p, after).board.told, 'miss', `${p.id}: Undo keeps the refusal`); hintsSolve(p, after, 'after a wrong pick'); }
  }
  assert.ok(mid !== undefined);
  // The middle strand's two gaps add up to the outer gap, which isn't 2 when both are.
  const w = claim.board.w, o = [0, 1, 2].filter(i => i !== mid);
  assert.equal(Math.abs(w[o[0]] - w[mid]) + Math.abs(w[o[1]] - w[mid]), Math.abs(w[o[0]] - w[o[1]]));
}

function checkForged(p, fresh, counts) {
  const q = p.parameters, b = fresh.board;
  const forged = [];
  forged.push([{...b, extra: 1}, 'an extra key'], [null, 'no board'], [[], 'a list']);
  if (q.mode === 'untangle') {
    const K = cylinder(q);
    forged.push(
      [{...b, s: [b.s[0], b.s[1].slice(1)]}, 'a short strand'],
      [{...b, s: [b.s[0], b.s[1].map((x, r) => r === 0 ? b.s[0][0] + K.N : x)]}, 'two beads on one spot'],
      [{...b, s: [b.s[0], b.s[1].map((x, r) => r === 0 ? K.hi + 1 : x)]}, 'a bead past the view'],
      [{...b, s: [b.s[0], b.s[1].map((x, r) => r === 0 ? x + .5 : x)]}, 'a bead between columns'],
      [{...b, done: true, claim: p.solution.barriers}, 'done while tangled'],
      [{...b, claim: []}, 'a claim while tangled'],
      [{...b, told: 'miss'}, 'a miss while tangled'],
      [{...b, told: 'later'}, 'an unknown told'],
      [{...b, done: 'yes'}, 'done not a flag']
    );
    // At the fewest: forged claims.
    const tight = {...b, s: p.solution.witness};
    assert.ok(validBoard(p, tight), `${p.id}: the witness board is valid`);
    forged.push([{...tight, told: 'fewer'}, 'fewer at the fewest']);
    if (p.solution.fewest) forged.push([{...tight, claim: [0]}, 'a claim with a copy that isn’t forced'], [{...tight, done: true, claim: p.solution.barriers.slice(1)}, 'done with a copy missing'], [{...tight, claim: [...p.solution.barriers]}, 'a full claim not marked done']);
    else forged.push([{...tight, claim: [1]}, 'a claim when nothing is forced']);
  } else {
    forged.push(
      [{...b, w: [0, 0]}, 'two ends'],
      [{...b, w: [0, 0, q.copies[1] + 1]}, 'an end past the view'],
      [{...b, tried: false, w: [0, 1, 2]}, 'moved ends not marked tried'],
      [{...b, told: 'way', tried: true}, p.solution.cant ? 'There is a way when there isn’t' : 'a way with a stale told kept'],
      [{...b, mid: 1}, 'a middle without Can’t'],
      [{...b, claim: 'yes'}, 'a claim not a flag']
    );
    if (!p.solution.cant) forged.push([{...b, tried: true, claim: true}, 'Can’t accepted where there is a way']);
    else forged.push([{...b, tried: true, told: 'miss', w: [0, 0, 0]}, 'a stale miss']);
  }
  for (const [board, why] of forged) {
    if (why === 'a way with a stale told kept') continue;
    if (why === 'a stale miss') continue;
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    counts.forged++;
  }
  for (const action of [null, {}, {type: 'fly'}, {type: 'bead', strand: 2, row: 1, x: 0}, {type: 'bead', strand: 0, row: 0, x: 1}, {type: 'bead', strand: 0, row: 99, x: 1}, {type: 'pick', k: 'x'}, {type: 'twist', k: 1}]) { refuse(p, fresh, action, JSON.stringify(action)); counts.illegal++; }
}

function checkPlayground(p, counts) {
  assert.ok(p, 'a playground');
  const q = p.parameters, K = cylinder(q), fresh = freshAttempt(p);
  assert.equal(mechanicFor(p).noHint(p), true, 'the playground has no Hint');
  assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board));
  const count = b => crossingsOf(K, lifted(K, b.s[0], b.w[0]), lifted(K, b.s[1], b.w[1]));
  // A twist keeps every crossing and adds one to both windings; twisting back undoes it.
  let a = fresh;
  for (const k of [1, 1, -1, -1, -1]) {
    const before = count(a.board), next = move(p, a, {type: 'twist', k});
    if (!next) continue;
    assert.equal(count(next.board), before, 'a twist keeps the crossings');
    assert.deepEqual(next.board.w, a.board.w.map(w => w + k), 'a twist adds to both windings');
    a = next;
  }
  // Ends move one at a time and the board stays legal; the fewest follows the difference.
  for (const w of [2, 3, -1, 0]) { const next = move(p, a, {type: 'end', strand: 1, w}); if (next) { assert.ok(validBoard(p, next.board)); a = next; } }
  refuse(p, fresh, {type: 'end', strand: 1, w: q.copies[1] + 1}, 'an end past the view');
  refuse(p, fresh, {type: 'twist', k: 2}, 'a double twist');
  refuse(p, fresh, {type: 'done'}, 'Done in the playground');
  for (const [board, why] of [[{...fresh.board, w: [0, 9]}, 'a winding past the view'], [{...fresh.board, told: 'way'}, 'a told in the playground'], [{s: fresh.board.s, w: fresh.board.w, extra: 1}, 'an extra key']]) { assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`); counts.forged++; }
}

export default validateStrands;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateStrands(), null, 2));
