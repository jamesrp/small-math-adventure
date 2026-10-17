// Checks the Staircases group in Memory robot (dist/families/stairs/stairs.json)
// against a separate simulator that never calls the mechanic's searches.
// Fewest turns: an exhaustive search over sequences of straight pieces,
// deepening one piece at a time (the mechanic runs a dynamic programme over
// corner and heading). Windows: which columns one flat piece can join, read
// off every flat run inside the strip, and every set of columns tried as a
// bitmask (the mechanic compares row spans); the fewest turns must be
// 2k − 2 for the most windows k, and every set claimed once must solve
// exactly when it is a real certificate; any other set is recorded as a
// refusal that takes no second claim on that walk, survives Undo (with its
// line gone) and ends when the walk changes. The share of random column
// sets that pass is counted, and page order and evenly spaced columns are
// reported. Exact
// length: every path of the puzzle's length enumerated step by step,
// counted, checked against length = a + b + 2L and accepted as a solve in
// pairs; the longest paths and the lengths that can't happen. Then hints
// alone (fresh, after a wrong staircase, after a refused claim and Undo past
// it, after the same path twice, after random play), hint time, illegal
// moves and forged saves, including forged solves and forged refusals.
// Run: node scripts/validate-stairs.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {isExpansion, mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

// The simulator: a strip is (a·y − b·x)² ≤ D², and nothing else is shared.
const inside = (q, x, y) => x >= 0 && x <= q.a && y >= 0 && y <= q.b && (q.D === undefined || (q.a * y - q.b * x) ** 2 <= q.D ** 2);
const STEP = {E: [1, 0], N: [0, 1], W: [-1, 0]};
function walkOf(q, word) {
  let x = 0, y = 0, prev = '';
  const pts = [[0, 0]];
  for (const c of word) {
    if (!STEP[c] || (c === 'W' && q.mode !== 'exact') || (c === 'E' && prev === 'W') || (c === 'W' && prev === 'E')) return null;
    x += STEP[c][0]; y += STEP[c][1];
    if (!inside(q, x, y)) return null;
    pts.push([x, y]); prev = c;
  }
  return pts;
}
const ends = (q, word) => { const pts = walkOf(q, word); return Boolean(pts) && pts.at(-1)[0] === q.a && pts.at(-1)[1] === q.b; };
const turns = word => { let n = 0; for (let i = 1; i < word.length; i++) if (word[i] !== word[i - 1]) n++; return n; };
const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

// Staircases of exactly n straight pieces from S to F, right and up
// alternating; returns how many there are (stopping at `cap`).
function staircases(q, n, cap = Infinity) {
  let found = 0;
  const go = (x, y, d, left) => {
    if (found >= cap) return;
    if (!left) { if (x === q.a && y === q.b) found++; return; }
    const [dx, dy] = d === 'E' ? [1, 0] : [0, 1];
    for (let s = 1; inside(q, x + s * dx, y + s * dy); s++) go(x + s * dx, y + s * dy, d === 'E' ? 'N' : 'E', left - 1);
  };
  for (const d of ['E', 'N']) go(0, 0, d, n);
  return found;
}
function fewestTurns(q) {
  for (let n = 1; n <= q.a + q.b; n++) if (staircases(q, n, 1)) return n - 1;
  return Infinity;
}
// join[c] is a bitmask of the columns one flat piece can cross together with c.
function joins(q) {
  const join = Array(q.a).fill(0);
  for (let y = 0; y <= q.b; y++) for (let x1 = 0; x1 <= q.a; x1++) for (let x2 = x1 + 1; x2 <= q.a; x2++) {
    let ok = true;
    for (let x = x1; x <= x2; x++) ok = ok && inside(q, x, y);
    if (!ok) continue;
    for (let c = x1; c < x2; c++) for (let d = x1; d < x2; d++) if (c !== d) join[c] |= 1 << d;
  }
  return join;
}
const bits = m => { let n = 0; while (m) { m &= m - 1; n++; } return n; };
const cols = m => Array.from({length: 31}, (_, c) => c).filter(c => m >> c & 1);
function windowCount(q) {
  const join = joins(q);
  let best = 0, sets = [];
  for (let m = 1; m < 1 << q.a; m++) {
    const k = bits(m);
    if (k < best) continue;
    if (cols(m).some(c => join[c] & m)) continue;
    if (k > best) { best = k; sets = []; }
    sets.push(m);
  }
  return {k: best, sets, join};
}
// A seeded random number generator, so a run can be repeated.
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
// Every path of exactly `len` steps from S that stops on F.
function exactPaths(q, len) {
  const out = [];
  const go = (word, x, y, prev) => {
    const left = len - word.length;
    if (Math.abs(q.a - x) + (q.b - y) > left) return;
    if (!left) { if (x === q.a && y === q.b) out.push(word); return; }
    for (const c of 'ENW') {
      if ((c === 'E' && prev === 'W') || (c === 'W' && prev === 'E')) continue;
      const nx = x + STEP[c][0], ny = y + STEP[c][1];
      if (inside(q, nx, ny)) go(word + c, nx, ny, c);
    }
  };
  go('', 0, 0, '');
  return out;
}
// Every length a path to F can have, up to `cap` steps.
function lengths(q, cap) {
  const seen = new Set();
  const go = (x, y, prev, n) => {
    if (x === q.a && y === q.b) seen.add(n);
    if (n === cap) return;
    for (const c of 'ENW') {
      if ((c === 'E' && prev === 'W') || (c === 'W' && prev === 'E')) continue;
      const nx = x + STEP[c][0], ny = y + STEP[c][1];
      if (inside(q, nx, ny)) go(nx, ny, c, n + 1);
    }
  };
  go(0, 0, '', 0);
  return [...seen].sort((m, n) => m - n);
}

// Moves through the engine, as the app makes them.
const step = (p, a, action) => { const next = move(p, a, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is a legal move`); return next; };
const corner = (q, word) => walkOf(q, word).at(-1);
const play = (p, a, word) => [...word].reduce((x, c) => step(p, x, {type: 'go', to: corner(p.parameters, x.board.walk + c)}), a);
let slowest = 0;
function timedHint(p, a) {
  const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
  slowest = Math.max(slowest, (u.user + u.system) / 1000);
  return h;
}
function hintRun(p, a, label) {
  let steps = 0;
  while (!isSolved(p, a.board)) {
    assert.ok(steps++ < 120, `${label}: hints finish within 120 moves`);
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${label}: a hint names a move`);
    assert.ok(h.text && !/Can’t|Press Can't/.test(h.text), `${label}: hint text`);
    a = step(p, a, h.action);
  }
  return steps;
}

export default async function validateStairs() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/stairs/stairs.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), ids = new Set(merged.sources.map(s => s.id));
  const {puzzles} = pack;
  assert.equal(puzzles.length, 9);
  assert.deepEqual(puzzles.map(p => p.number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const level of ['easy', 'medium', 'hard']) assert.equal(puzzles.filter(p => p.difficulty_level === level).length, 3, `three ${level} puzzles`);
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(new Set(puzzles.map(p => JSON.stringify(p.parameters))).size, puzzles.length, 'distinct puzzles');
  const report = {puzzles: puzzles.length, certificates: [], exact: [], hintSteps: 0, illegalMoves: 0, forgeries: 0};
  for (const p of puzzles) {
    const q = p.parameters, label = p.id;
    assert.equal(p.id, `stairs-${String(p.number).padStart(2, '0')}`);
    assert.equal(p.mechanic, 'stairs'); assert.equal(p.band, 'all');
    assert.equal(p.libraryFamily, 'robot'); assert.equal(p.group, 'Staircases'); assert.equal(p.familyTitle, 'Memory robot');
    for (const field of ['title', 'objective', 'visibleObjective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${label}: ${field}`);
    assert.ok(p.rules.length >= 3 && p.rules.every(r => r.trim()), `${label}: rules`);
    assert.equal(p.hints.length, 3, `${label}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${label}: parent.${field}`);
    assert.ok(p.parent.sourceIds.length && p.parent.sourceIds.every(id => ids.has(id)), `${label}: sources resolve`);
    assert.match(p.provenance, /Week 50|^New/, `${label}: provenance names the worksheet or says new`);
    assert.ok(isExpansion(p));
    // The board is what the child plays on: no puzzle wider than 16 blocks, and the strip leaves no corner within a fifth of a block of its edge.
    assert.ok(q.a <= 16 && q.b <= 12 && q.a > q.b, `${label}: board size`);
    if (q.D !== undefined) {
      const hyp = Math.hypot(q.a, q.b);
      for (let x = 0; x <= q.a; x++) for (let y = 0; y <= q.b; y++) {
        const g = Math.abs(q.a * y - q.b * x);
        assert.ok(g <= q.D || (g - q.D) / hyp >= .19, `${label}: corner ${x},${y} is clearly in or out of the strip`);
      }
    }
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${label}: fresh and unsolved`);
    assert.ok(mechanicFor(p).render(p, fresh).length > 800, `${label}: renders`);

    if (q.mode === 'turns') {
      // Fewest turns by the piece search, and the windows by bitmasks.
      const t = fewestTurns(q), {k, sets, join} = windowCount(q);
      assert.equal(t, p.solution.fewest, `${label}: the fewest turns`);
      assert.equal(t, 2 * k - 2, `${label}: the most windows prove the fewest turns`);
      assert.equal(staircases(q, t), 0, `${label}: no staircase with ${t - 1} turns`);
      assert.ok(staircases(q, t + 1) > 0, `${label}: a staircase with ${t} turns`);
      assert.equal(sets.length, p.solution.windowSets, `${label}: sets of windows`);
      assert.equal(p.solution.flatPieces, k);
      const witness = p.solution.staircase;
      assert.ok(ends(q, witness) && turns(witness) === t, `${label}: the witness staircase`);
      const at = play(p, fresh, witness);
      const claim = (a, windows) => move(p, a, {type: 'fewest', windows});
      // Every set of k columns, claimed once on the witness: the real
      // certificates solve; every other set is recorded as a refusal, after
      // which no second claim is taken on that walk, not even a right one.
      const accepted = new Set(sets);
      let checked = 0;
      for (let m = 0; m < 1 << q.a; m++) if (bits(m) === k) {
        const after = claim(at, cols(m));
        assert.ok(after, `${label}: windows ${cols(m)} are judged`);
        assert.equal(isSolved(p, after.board), accepted.has(m), `${label}: windows ${cols(m)}`);
        if (!accepted.has(m)) {
          assert.deepEqual(after.board, {walk: witness, windows: null, refused: cols(m), told: true}, `${label}: the refusal is recorded`);
          assert.equal(claim(after, cols(sets[0])), null, `${label}: no second claim on the same walk`);
        }
        checked++;
      }
      assert.equal(checked, choose(q.a, k));
      // Random taps rarely pass; page order and even spacing are reported.
      const random = seeded(50 + p.number);
      let passes = 0;
      const tries = 20000;
      for (let i = 0; i < tries; i++) {
        const picked = new Set();
        while (picked.size < k) picked.add(Math.floor(random() * q.a));
        if ([...picked].every(c => !(join[c] & [...picked].reduce((m, d) => m | 1 << d, 0)))) passes++;
      }
      const share = passes / tries;
      assert.ok(share <= .12, `${label}: random columns pass ${share}`);
      const pageOrder = Array.from({length: k}, (_, c) => c), even = Array.from({length: k}, (_, i) => Math.round(i * (q.a - 1) / (k - 1)));
      assert.equal(isSolved(p, claim(at, pageOrder).board), false, `${label}: columns in page order fail`);
      const pieceStarts = []; for (let i = 0, x = 0; i < witness.length; i++) { if (witness[i] === 'E' && witness[i - 1] !== 'E') pieceStarts.push(x); if (witness[i] === 'E') x++; }
      report.certificates.push({id: label, fewest: t, windows: k, sets: sets.length, of: choose(q.a, k), randomShare: Number(share.toFixed(4)), exactShare: `${sets.length}/${choose(q.a, k)}`,
        pageOrder: isSolved(p, claim(at, pageOrder).board), evenlySpaced: `${even.map(c => c + 1).join(',')} ${isSolved(p, claim(at, even).board) ? 'passes' : 'fails'}`,
        firstColumnOfEachFlatPiece: isSolved(p, claim(at, pieceStarts).board)});
      // A staircase with more turns can never be certified.
      let longer = null;
      for (let n = t + 2; n <= t + 4 && !longer; n++) {
        const go = (word, x, y, d, left) => {
          if (longer) return;
          if (!left) { if (x === q.a && y === q.b) longer = word; return; }
          const [dx, dy] = STEP[d];
          for (let s = 1; inside(q, x + s * dx, y + s * dy); s++) go(word + d.repeat(s), x + s * dx, y + s * dy, d === 'E' ? 'N' : 'E', left - 1);
        };
        go('', 0, 0, 'E', n);
      }
      report.certificates.at(-1).moreTurns = Boolean(longer);
      // On a strip as low as puzzle 1 every staircase turns as often as
      // the height allows, so none turns more than the fewest.
      if (longer) {
        const extra = Math.ceil(turns(longer) / 2) + 1, wrong = play(p, fresh, longer);
        assert.ok(extra > k, `${label}: more turns need more windows than exist`);
        for (let m = 0; m < 1 << q.a; m++) if (bits(m) === extra) {
          assert.equal(validBoard(p, {walk: longer, windows: cols(m), refused: null, told: false}), false, `${label}: a longer staircase is never certified`);
          assert.equal(isSolved(p, claim(wrong, cols(m)).board), false);
        }
        for (let m = 0; m < 1 << q.a; m++) if (bits(m) === k) assert.equal(claim(wrong, cols(m)), null, `${label}: k windows are too few for a longer staircase`);
      } else assert.ok(2 * q.b <= t + 1 + (t % 2), `${label}: no staircase turns more, because every up piece takes a block of height`);

      // Undo through a refusal, as the app makes it: the refusal stands, its
      // line goes, and the board changes; the next Undo changes the walk and
      // ends it; back on the same walk, Fewest takes a claim again.
      const m = mechanicFor(p), undoLikeApp = a => { const u = undo(a); return {...u, board: m.carry(p, a.board, u.board)}; };
      const refused = claim(at, pageOrder);
      const back1 = undoLikeApp(refused);
      assert.deepEqual(back1.board, {walk: witness, windows: null, refused: pageOrder, told: false}, `${label}: Undo keeps the refusal`);
      assert.equal(claim(back1, cols(sets[0])), null, `${label}: still no second claim after Undo`);
      const back2 = undoLikeApp(back1);
      assert.notEqual(back2.board.walk, witness);
      assert.equal(back2.board.refused, null, `${label}: a different walk ends the refusal`);
      assert.ok(isSolved(p, claim(play(p, back2, witness.slice(back2.board.walk.length)), cols(sets[0])).board), `${label}: back on the walk, a right claim solves`);

      // Hints alone: fresh; after a staircase that turns too often; after
      // a refused claim (and after Undo past it); after random play.
      report.hintSteps += hintRun(p, fresh, `${label} fresh`);
      if (longer) {
        const wrong = play(p, fresh, longer);
        assert.equal(timedHint(p, wrong).type, 'move');
        assert.equal(timedHint(p, wrong).action.type, 'go', `${label}: a staircase with too many turns is taken back`);
        report.hintSteps += hintRun(p, wrong, `${label} after too many turns`);
      }
      assert.equal(timedHint(p, refused).action.type, 'go', `${label}: after a refused claim the hint changes the walk`);
      assert.doesNotMatch(timedHint(p, refused).text, /Fewest/);
      report.hintSteps += hintRun(p, refused, `${label} after a refused claim`);
      report.hintSteps += hintRun(p, back1, `${label} after Undo past a refused claim`);
      mechanicFor(p).reset(p);
      const random2 = seeded(500 + p.number);
      let r = fresh;
      for (let i = 0; i < 6; i++) {
        const options = ['E', 'N'].filter(c => walkOf(q, r.board.walk + c));
        if (!options.length) break;
        r = play(p, r, options[Math.floor(random2() * options.length)]);
      }
      report.hintSteps += hintRun(p, r, `${label} after random play`);

      // Illegal moves.
      for (const action of [{type: 'go', to: [1, 1]}, {type: 'go', to: [0, 0]}, {type: 'go', to: [q.a + 1, 0]}, {type: 'go', to: [-1, 0]}, {type: 'go', to: [.5, 0]}, {type: 'go', to: '1,0'}, {type: 'go'},
        {type: 'walk', walk: 'W'}, {type: 'walk', walk: 'S'}, {type: 'walk', walk: ''}, {type: 'walk', walk: 'N'.repeat(q.b + 1)}, {type: 'walk', walk: 3},
        {type: 'fewest', windows: cols(sets[0])}, {type: 'fewest', windows: pageOrder}, {type: 'claim'}, null, 'E', ['E']]) {
        assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
        report.illegalMoves++;
      }
      // Off the strip: a corner straight up or right that the strip doesn't hold.
      for (const c of [[0, q.b], [q.a, 0]]) { assert.equal(move(p, fresh, {type: 'go', to: c}), null, `${label}: no run off the strip to ${c}`); report.illegalMoves++; }
      const good = cols(sets[0]);
      for (const windows of [good.slice(1), [...good, q.a - 1].sort((x, y) => x - y), [...good].reverse(), [...good.slice(1), good[1]], good.map(c => c + .5), [q.a, ...good.slice(1)], [-1, ...good.slice(1)], 'all', null]) {
        assert.equal(claim(at, windows), null, `${label}: rejects windows ${windows}`);
        report.illegalMoves++;
      }
      const done = step(p, at, {type: 'fewest', windows: good});
      assert.ok(isSolved(p, done.board));
      assert.equal(move(p, done, {type: 'go', to: [0, 0]}), null, `${label}: nothing after a solve`);
      assert.equal(claim(done, good), null, `${label}: no claim after a solve`);
      report.illegalMoves += 2;

      // Forged saves, including forged solves and forged refusals.
      const B = (walk, windows = null, refused = null, told = false) => ({walk, windows, refused, told});
      const wrongSet = cols(Array.from({length: 1 << q.a}, (_, m) => m).find(m => bits(m) === k && !accepted.has(m)));
      for (const f of [null, 'E', {}, {walk: ''}, {walk: '', windows: null}, {...B(''), done: true}, {...B(witness, good), done: true}, B('X'), B('EW'), B(['E']), B('N'.repeat(q.b)),
        B(witness, []), B(witness, good.slice(1)), B(witness, pageOrder), B(witness.slice(0, -1), good), ...(longer ? [B(longer, good)] : []), B(witness, 'all'), B(witness, [...good].reverse()),
        B(witness, good, good), B(witness, good, null, true), B('', null, null, true), B(witness, null, null, 'no'),
        B(witness, null, good), B(witness, null, good, true), B(witness, null, wrongSet.slice(1), true), B(witness, null, [...wrongSet].reverse(), true), B(witness.slice(0, -1), null, wrongSet, true),
        B(witness, null, 'all', true), B(witness, wrongSet, wrongSet, true), ...(longer ? [B(longer, null, wrongSet, true)] : [])]) {
        assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
        report.forgeries++;
      }
      assert.ok(validBoard(p, B(witness, null, wrongSet, true)) && validBoard(p, B(witness, null, wrongSet, false)), `${label}: a real refusal is a valid save`);
    } else {
      // Exact length: every path of the length, enumerated here.
      const all = exactPaths(q, q.steps), L = (q.steps - q.a - q.b) / 2;
      assert.ok(Number.isInteger(L) && L >= 1, `${label}: the length needs left steps`);
      assert.equal(all.length, p.solution.paths, `${label}: paths of ${q.steps} steps`);
      assert.ok(all.length >= 2, `${label}: two ways exist`);
      for (const w of all) assert.equal([...w].filter(c => c === 'W').length, L, `${label}: ${w} goes left ${L} times`);
      // Length = a + b + 2L for every path, of every length, and only those lengths.
      const cap = Math.min(q.steps + 4, (q.a + 1) * (q.b + 1));
      const lens = lengths(q, cap);
      assert.ok(lens.every(n => (n - q.a - q.b) % 2 === 0 && n >= q.a + q.b), `${label}: every length is a + b + an even number`);
      assert.ok(lens.includes(q.steps));
      const longest = lens.at(-1);
      
      const [k1, k2] = p.solution.walks;
      assert.ok(all.includes(k1) && all.includes(k2) && k1 !== k2, `${label}: the two witnesses`);
      // The app keeps the first and solves on any different second, for many pairs.
      const sample = all.length > 300 ? all.filter((_, i) => i % Math.ceil(all.length / 300) === 0) : all;
      for (const w of sample) {
        assert.ok(validBoard(p, {walk: '', kept: w}), `${label}: ${w} can be kept`);
        assert.equal(validBoard(p, {walk: w, kept: ''}), false, `${label}: a finished path is kept at once`);
        assert.equal(isSolved(p, {walk: w, kept: w}), false, `${label}: the same path twice is not a solve`);
        const other = w === k1 ? k2 : k1;
        assert.ok(isSolved(p, {walk: other, kept: w}), `${label}: ${other} after ${w} solves`);
      }
      // Through the engine: the first path is kept, the same path again isn't a solve, a different one is.
      let a = play(p, fresh, k1);
      assert.deepEqual(a.board, {walk: '', kept: k1}, `${label}: the first path is kept`);
      const same = play(p, a, k1);
      assert.ok(!isSolved(p, same.board), `${label}: the same path again is not a solve`);
      report.hintSteps += hintRun(p, same, `${label} after the same path`);
      const solvedBoard = play(p, a, k2);
      assert.ok(isSolved(p, solvedBoard.board), `${label}: a second path solves`);

      // Hints alone: fresh; after reaching the flag too soon; after random play.
      report.hintSteps += hintRun(p, fresh, `${label} fresh`);
      let early = fresh;
      const staircase = (() => { const out = exactPaths(q, q.a + q.b); assert.ok(out.length, `${label}: a staircase exists`); return out[0]; })();
      early = play(p, fresh, staircase);
      assert.ok(!isSolved(p, early.board) && early.board.walk === staircase, `${label}: the flag before the last box is not a solve`);
      assert.equal(timedHint(p, early).action.type, 'go');
      report.hintSteps += hintRun(p, early, `${label} after reaching the flag early`);
      const random = seeded(900 + p.number);
      let r = fresh;
      for (let i = 0; i < q.steps - 2; i++) {
        const options = [...'ENW'].filter(c => walkOf(q, r.board.walk + c));
        if (!options.length) break;
        r = play(p, r, options[Math.floor(random() * options.length)]);
        if (isSolved(p, r.board)) break;
      }
      report.hintSteps += hintRun(p, r, `${label} after random play`);

      // Illegal moves: diagonal, two directions at once, straight back, down, past the boxes.
      for (const action of [{type: 'go', to: [1, 1]}, {type: 'go', to: [0, 0]}, {type: 'go', to: [-1, 0]}, {type: 'go', to: [0, -1]}, {type: 'walk', walk: 'EW'}, {type: 'walk', walk: 'S'},
        {type: 'walk', walk: 'N'.repeat(q.b + 1)}, {type: 'fewest', windows: [0]}, {type: 'walk', walk: 'EN'.repeat(q.steps)}, {}, null]) {
        assert.equal(move(p, fresh, action), null, `${label}: rejects ${JSON.stringify(action)}`);
        report.illegalMoves++;
      }
      const east = play(p, fresh, 'E');
      assert.equal(move(p, east, {type: 'go', to: [0, 0]}).board.walk, '', `${label}: a tap on the trail takes it back`);
      assert.equal(move(p, east, {type: 'walk', walk: 'EW'}), null, `${label}: no turning straight back`);
      assert.equal(move(p, solvedBoard, {type: 'go', to: [0, 0]}), null, `${label}: nothing after a solve`);
      report.illegalMoves += 2;
      // Forged saves.
      for (const f of [null, {}, {walk: ''}, {walk: '', kept: '', done: true}, {walk: k2, kept: ''}, {walk: '', kept: k1.slice(0, -1)}, {walk: '', kept: k1 + 'W'}, {walk: 'EW', kept: ''},
        {walk: 'X', kept: ''}, {walk: k2 + 'W', kept: k1}, {walk: '', kept: 'N'.repeat(q.b) + 'E'.repeat(q.a)}, {walk: '', kept: ['E']}, {walk: 'S', kept: ''}]) {
        assert.equal(validBoard(p, f), false, `${label}: rejects a forged save ${JSON.stringify(f)}`);
        report.forgeries++;
      }
      report.exact.push({id: label, steps: q.steps, left: L, paths: all.length, longest: longest < cap ? longest : `${cap} or more`});
    }
  }
  // Puzzle 8 can't take 28 steps; puzzle 9's strip allows no path longer than 23.
  const p8 = puzzles[7].parameters, p9 = puzzles[8].parameters;
  assert.deepEqual(lengths(p8, 40), [9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29], 'puzzle 8: every odd length from 9 to 29');
  assert.equal(lengths(p9, 40).at(-1), 23, 'puzzle 9: 23 is the longest in the strip');
  assert.ok(slowest < 60, `the slowest hint took ${slowest} ms`);
  report.slowestHintMs = Number(slowest.toFixed(1));
  return report;
}

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateStairs(), null, 2));
