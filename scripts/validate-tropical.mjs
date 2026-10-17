// Checks the Three-arm lines pack (dist/families/tropical/tropical.json) by
// methods unlike the mechanic's. The mechanic (lines.js) works with arms and
// rays: it reads off where two lines cross from where their junctions sit,
// and finds the junctions for a set of circles by intersecting rays. Here a
// point is on a line exactly when the least of x − a, y − b and 0 occurs at
// least twice (the definition on the worksheet's page 1), tested at every
// quarter-step of a box reaching 12 squares past the board, and every answer
// is read off those point sets: what two lines share (one point, a ray to the
// edge of the box, or more), every place for B, every junction that passes
// the circles, every pair of circles that allows one junction whose line
// misses the third, and whether a shelf of marks is exactly the junctions
// that work. Then it plays the puzzles: hints alone from fresh, after a wrong
// move and a refused Check, after random play, after a refused Can't and a
// refused That's all; refusals kept across Undo, with the board still
// changing; Can't refused before an attempt; how often random taps finish a
// certificate; illegal moves; forged saves; and the playground. Hint time is
// measured in CPU time. Run: node scripts/validate-tropical.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';
import * as L from '../dist/families/tropical/lines.js';
import {judgeMarks} from '../dist/families/tropical/tropical.js';

// The table in docs/tropical/README.md, in grid squares.
const TABLE = {
  'tropical-01': {level: 'easy', mode: 'meet', places: [[6, 0], [6, 1], [6, 2], [6, 3], [7, 5], [8, 6]]},
  'tropical-02': {level: 'easy', mode: 'meet', places: [[0, 4], [1, 4], [2, 4], [3, 4]]},
  'tropical-03': {level: 'easy', mode: 'through', junction: [2, 2]},
  'tropical-04': {level: 'easy', mode: 'through', junction: [5, 5]},
  'tropical-05': {level: 'medium', mode: 'meet', places: [[5, 5], [6, 6], [7, 7], [8, 8]]},
  'tropical-06': {level: 'medium', mode: 'meet', places: [[0, 3], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]},
  'tropical-07': {level: 'medium', mode: 'every', ray: {from: [2, 4], dir: [-1, 0]}},
  'tropical-08': {level: 'medium', mode: 'every', ray: {from: [3, 2], dir: [0, -1]}},
  'tropical-09': {level: 'hard', mode: 'every', ray: {from: [5, 5], dir: [1, 1]}},
  'tropical-10': {level: 'hard', mode: 'meet', places: [[0.5, 0], [0, 0.5]]},
  'tropical-11': {level: 'hard', mode: 'through', junction: [5, 5]},
  'tropical-12': {level: 'hard', mode: 'through', cant: [{circles: ['P', 'Q'], junction: [5, 5]}, {circles: ['Q', 'R'], junction: [6, 5]}]}
};

// --- Points in quarter-steps -------------------------------------------------
// Squares to quarter-steps (×4) and half-steps to quarter-steps (×2).
const Q4 = ([x, y]) => [4 * x, 4 * y];
const Q2 = ([u, v]) => [2 * u, 2 * v];
const key = p => `${p[0]},${p[1]}`;
const sameSet = (a, b) => a.size === b.size && [...a].every(k => b.has(k));
// The worksheet's definition: the least of x − a, y − b and 0 is reached at
// least twice.
function tie(p, J) {
  const vals = [p[0] - J[0], p[1] - J[1], 0], m = Math.min(...vals);
  return vals.filter(v => v === m).length >= 2;
}
// A box of quarter-step points reaching PAD quarter-steps past the board.
const PAD = 48;
function boxOf(win) {
  const [x0, y0, x1, y1] = win.map(c => 2 * c), pts = [];
  for (let x = x0 - PAD; x <= x1 + PAD; x++) for (let y = y0 - PAD; y <= y1 + PAD; y++) pts.push([x, y]);
  return {pts, lo: [x0 - PAD, y0 - PAD], hi: [x1 + PAD, y1 + PAD]};
}
const inBox = (box, p) => p[0] >= box.lo[0] && p[0] <= box.hi[0] && p[1] >= box.lo[1] && p[1] <= box.hi[1];
// The quarter-step points of the ray from s along d inside the box.
function rayPoints(box, s, d) {
  const out = new Set();
  for (let p = [...s]; inBox(box, p); p = [p[0] + d[0], p[1] + d[1]]) out.add(key(p));
  return out;
}
// What two lines share, read off the point sets: {kind: 'point', at},
// {kind: 'ray', from, dir} (a ray running to the edge of the box), or
// {kind: 'other', size}.
const DIRS8 = [[1, 0], [0, 1], [-1, -1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1]];
function shared(box, A, B) {
  const S = new Set(box.pts.filter(p => tie(p, A) && tie(p, B)).map(key));
  return classify(box, S);
}
function classify(box, S) {
  if (S.size === 1) return {kind: 'point', at: [...S][0].split(',').map(Number)};
  for (const k of S) {
    const s = k.split(',').map(Number);
    for (const d of DIRS8) if (!S.has(key([s[0] - d[0], s[1] - d[1]])) && sameSet(S, rayPoints(box, s, d))) return {kind: 'ray', from: s, dir: d};
  }
  return {kind: 'other', size: S.size};
}
// The lattice of places on a board, in quarter-steps.
function lattice(q) {
  const out = [];
  for (let u = q.win[0]; u <= q.win[2]; u += q.step) for (let v = q.win[1]; v <= q.win[3]; v += q.step) out.push(Q2([u, v]));
  return out;
}
const sortPts = list => list.map(key).sort();

// --- Checking lines.js itself, on every pair of nearby junctions -------------
function checkGeometry(counts) {
  const box = boxOf([-4, -4, 4, 4]), js = [];
  for (let u = -3; u <= 3; u++) for (let v = -3; v <= 3; v++) js.push([u, v]);
  for (const A of js) for (const B of js) {
    if (L.same(A, B)) continue;
    const want = shared(box, Q2(A), Q2(B)), got = L.meet(A, B);
    counts.linePairs++;
    if (got.kind === 'point') assert.deepEqual(want, {kind: 'point', at: Q2(got.at)}, `meet ${A} ${B}`);
    else assert.deepEqual(want, {kind: 'ray', from: Q2(got.from), dir: L.DIRS[got.dir]}, `meet ${A} ${B}`);
    // Every point is on a line exactly as the mechanic's arms say.
    const p = B;
    assert.equal(L.onLine(p, A), tie(Q2(p), Q2(A)), `onLine ${p} ${A}`);
  }
  // Junctions for one, two and three points, against the tie test.
  const rand = random(78);
  for (let n = 0; n < 400; n++) {
    const k = 2 + (n % 2), T = [];
    while (T.length < k) { const t = [Math.floor(rand() * 9) - 4, Math.floor(rand() * 9) - 4]; if (!T.some(x => L.same(x, t))) T.push(t); }
    const S = new Set(box.pts.filter(J => T.every(t => tie(Q2(t), J))).map(key)), got = L.junctionsFor(T);
    counts.targetSets++;
    if (got === null) assert.equal(S.size, 0, `junctionsFor ${JSON.stringify(T)}: none`);
    else if (got.kind === 'point') assert.deepEqual(classify(box, S), {kind: 'point', at: Q2(got.at)}, `junctionsFor ${JSON.stringify(T)}`);
    else assert.deepEqual(classify(box, S), {kind: 'ray', from: Q2(got.from), dir: L.DIRS[got.dir]}, `junctionsFor ${JSON.stringify(T)}`);
  }
}

// --- Play ---------------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
// One Undo step as the app takes it: the previous board, with what the mechanic keeps.
function undoOnce(p, a) {
  const next = undo(a);
  return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)};
}
const view = (p, a) => mechanicFor(p).render(p, a);
let slowestCpu = 0;
function timedHint(p, a) {
  const t = process.cpuUsage(), h = nextHint(p, a), dt = process.cpuUsage(t);
  slowestCpu = Math.max(slowestCpu, (dt.user + dt.system) / 1000);
  return h;
}
const PLACE = /\(\s*-?\d|\d+ across|\d+ up/;
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 30; steps++) {
    const h = timedHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move`);
    assert.ok(typeof h.text === 'string' && h.text.length > 8, `${p.id} ${label}: hint words`);
    assert.ok(!PLACE.test(h.text), `${p.id} ${label}: "${h.text}" names no coordinates`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints alone solve`);
  return steps;
}
// How many Checks a child sweeping the board would make before the first
// answer: in page order (top row first, left to right), bottom row first,
// nearest the drawn goal first (ties in page order), and the mean over random
// orders, (n + 1)/(k + 1) for k answers among n places. The start is not a place.
function sweeps(q, places, right, goal) {
  const start = Q2(q.start), list = places.filter(z => !L.same(z, start)), isRight = z => right.some(B => L.same(B, z));
  const first = order => order.findIndex(isRight) + 1;
  const page = [...list].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const bottom = [...list].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const near = page.map((z, i) => [z, (z[0] - goal[0]) ** 2 + (z[1] - goal[1]) ** 2, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
  return {places: list.length, answers: right.length, pageOrder: first(page), bottomUp: first(bottom), nearestGoal: first(near), randomMean: Number(((list.length + 1) / (right.length + 1)).toFixed(1))};
}
function random(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 2 ** 32; }; }

export async function validateTropical() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/tropical/tropical.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-78')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-78.md')), 'the review card');
  const counts = {sweeps: {}, linePairs: 0, targetSets: 0, placesChecked: 0, junctionsChecked: 0, shelvesJudged: 0, hintSteps: 0, randomStates: 0};
  checkGeometry(counts);

  const puzzles = pack.puzzles.filter(p => p.mechanic === 'tropical' && p.difficulty_level !== 'playground');
  assert.equal(puzzles.length, 12, 'twelve puzzles');
  assert.deepEqual(puzzles.map(p => p.difficulty_level), ['easy', 'easy', 'easy', 'easy', 'medium', 'medium', 'medium', 'medium', 'hard', 'hard', 'hard', 'hard']);
  assert.deepEqual(Object.keys(TABLE), puzzles.map(p => p.id), 'the table names every puzzle');
  const taps = {};
  for (const p of puzzles) {
    const q = p.parameters, row = TABLE[p.id], box = boxOf(q.win);
    assert.equal(p.difficulty_level, row.level, `${p.id}: level`);
    assert.equal(q.mode, row.mode, `${p.id}: mode`);
    for (const k of ['objective', 'visibleObjective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[k] === 'string' && p[k].length > 10, `${p.id}: ${k}`);
    assert.ok(p.hints.length >= 3 && p.parent?.explanation, `${p.id}: hints and notes`);
    assert.match(p.provenance, /Week 78|New/, `${p.id}: provenance names the worksheet`);
    assert.match(p.controls, /^A line is three arms from one junction/, `${p.id}: How to play opens with the mathematics`);
    // Titles, objectives and first hints never say whether it can be done.
    for (const text of [p.title, p.visibleObjective, p.hints[0]]) assert.ok(!/can.?t|impossible|no line|cannot/i.test(text), `${p.id}: "${text}" gives nothing away`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: a fresh board is valid and unsolved`);
    const places = lattice(q);

    if (q.mode === 'meet') {
      const A = Q2(q.A), goal = q.goal.kind === 'point' ? {kind: 'point', at: Q2(q.goal.at)} : {kind: 'ray', from: Q2(q.goal.from), dir: L.DIRS[q.goal.dir]};
      const right = places.filter(B => { counts.placesChecked++; return JSON.stringify(shared(box, A, B)) === JSON.stringify(goal); });
      assert.deepEqual(sortPts(right), sortPts(row.places.map(Q4)), `${p.id}: the places for B`);
      assert.deepEqual(sortPts(p.solution.places.map(Q4)), sortPts(right), `${p.id}: the pack's places`);
      // Each one, and nothing else, solves with Check.
      for (const B of places) {
        const at = B.map(c => c / 2);
        if (L.same(at, q.start)) continue;
        const after = play(p, play(p, fresh, {type: 'put', at}), {type: 'check'});
        assert.equal(isSolved(p, after.board), right.some(x => L.same(x, B)), `${p.id}: Check with B at ${at}`);
      }
      // The start is not an answer, and no answer is drawn on the board.
      assert.ok(!right.some(B => L.same(B, Q2(q.start))), `${p.id}: B starts off the answers`);
      const drawn = q.goal.kind === 'point' ? q.goal.at : q.goal.from;
      assert.ok(!right.some(B => L.same(B, Q2(drawn))) && !right.some(B => L.same(B, A)), `${p.id}: no answer is a drawn point`);
      counts.sweeps[p.id] = sweeps(q, places, right, Q2(drawn));
      assert.ok(counts.sweeps[p.id].nearestGoal >= 2, `${p.id}: the place nearest the goal is not an answer`);
    }

    if (q.mode === 'through') {
      const T = q.targets.map(Q2);
      // Every junction in the box, quarter-steps included.
      const S = box.pts.filter(J => { counts.junctionsChecked++; return T.every(t => tie(t, J)); });
      if (row.junction) {
        assert.deepEqual(sortPts(S), [key(Q4(row.junction))], `${p.id}: exactly one junction`);
        assert.deepEqual(p.solution.junction, row.junction);
      } else {
        assert.equal(S.length, 0, `${p.id}: no junction passes every circle`);
        // Certificates: two circles allowing exactly one junction, whose line misses a third.
        const certs = [];
        for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
          const two = box.pts.filter(J => tie(T[i], J) && tie(T[j], J));
          if (two.length === 1) certs.push({circles: [q.names[i], q.names[j]], junction: two[0].map(c => c / 4)});
        }
        assert.deepEqual(certs, row.cant, `${p.id}: the certificates`);
        assert.deepEqual(p.solution, {cant: true, certificates: row.cant});
        // The other pair allows a whole ray, and certifies nothing.
      }
      // Check solves exactly at the answer.
      for (const J of places) {
        const at = J.map(c => c / 2);
        if (L.same(at, q.start)) continue;
        const after = play(p, play(p, fresh, {type: 'put', at}), {type: 'check'});
        assert.equal(isSolved(p, after.board), T.every(t => tie(t, J)), `${p.id}: Check at ${at}`);
      }
      if (q.cant) taps[p.id] = tapShare(p, fresh, places, row);
      else refuse(p, play(p, fresh, {type: 'put', at: places.find(J => !L.same(J.map(c => c / 2), q.start)).map(c => c / 2)}), {type: 'cant', picks: [0, 1]}, 'Can’t where there is no Can’t');
    }

    if (q.mode === 'every') {
      const T = q.targets.map(Q2), R = {from: Q4(row.ray.from), dir: row.ray.dir};
      const S = new Set(box.pts.filter(J => T.every(t => tie(t, J))).map(key));
      assert.ok(sameSet(S, rayPoints(box, R.from, R.dir)), `${p.id}: the junctions are the ray`);
      assert.deepEqual(p.solution.ray, {from: row.ray.from, dir: Object.keys(L.DIRS).find(k => L.DIRS[k].join() === row.ray.dir.join())});
      counts.shelvesJudged += checkShelves(p, fresh, box, S);
    }

    counts.hintSteps += checkPlay(p, fresh, places, row, counts);
    checkForged(p, fresh, row);
  }
  const ground = pack.puzzles.find(p => p.difficulty_level === 'playground');
  checkPlayground(ground);
  // Taps should answer well under 100 ms; these hints take a few ms of CPU.
  assert.ok(slowestCpu < 100, `every hint under 100 ms of CPU (slowest ${slowestCpu.toFixed(1)} ms)`);
  return {tropicalPuzzles: puzzles.length, ...counts, certificateTaps: taps, slowestHintCpuMs: Number(slowestCpu.toFixed(1))};
}

// How often random play finishes a Can't: every place for the junction and
// every pair of circles, and the pairs at a junction where a certificate is.
function tapShare(p, fresh, places, row) {
  const q = p.parameters, pairs = [[0, 1], [0, 2], [1, 2]];
  let tries = 0, wins = 0, atCert = 0, atCertWins = 0;
  for (const J of places) {
    const at = J.map(c => c / 2);
    const tried = L.same(at, q.start) ? play(p, play(p, fresh, {type: 'put', at: [q.start[0] + q.step, q.start[1]]}), {type: 'put', at}) : play(p, fresh, {type: 'put', at});
    const cert = (row.cant || []).some(c => L.same(Q4(c.junction), J));
    for (const picks of pairs) {
      const after = move(p, tried, {type: 'cant', picks});
      assert.ok(after, `${p.id}: Can’t is judged after an attempt`);
      tries++; if (cert) atCert++;
      if (isSolved(p, after.board)) {
        wins++; if (cert) atCertWins++;
        assert.ok(cert, `${p.id}: Can’t solves only at a certificate`);
        assert.deepEqual(after.board.at, tried.board.at, `${p.id}: the certificate is drawn round the child’s own junction`);
      }
    }
  }
  if (!row.cant) assert.equal(wins, 0, `${p.id}: Can’t never solves when a line exists`);
  else assert.equal(wins, row.cant.length, `${p.id}: one pair at each certificate`);
  return {tries, wins, share: Number((wins / tries).toFixed(4)), atCertificate: `${atCertWins} of ${atCert}`};
}

// That's all, against the point sets: random shelves of marks from points,
// stretches and rays on and off the answer.
function checkShelves(p, fresh, box, S) {
  const q = p.parameters, rand = random(p.number * 104729);
  const places = lattice(q).map(z => z.map(c => c / 2)), names = Object.keys(L.DIRS);
  const onRay = places.filter(z => S.has(key(Q2(z))));
  const pickFrom = list => list[Math.floor(rand() * list.length)];
  // The quarter-step points a mark covers inside the box.
  const covered = m => {
    const s = Q2(m.from);
    if (m.dir) return rayPoints(box, s, L.DIRS[m.dir]);
    if (!m.to) return new Set([key(s)]);
    const t = Q2(m.to), n = Math.max(Math.abs(t[0] - s[0]), Math.abs(t[1] - s[1])), d = [(t[0] - s[0]) / n, (t[1] - s[1]) / n], out = new Set();
    for (let k = 0; k <= n; k++) out.add(key([s[0] + k * d[0], s[1] + k * d[1]]));
    return out;
  };
  const randomMark = () => {
    const from = rand() < 0.6 ? pickFrom(onRay) : pickFrom(places), r = rand();
    if (r < 0.3) return {from};
    const dir = rand() < 0.5 ? p.solution.ray.dir : pickFrom(names);
    if (r < 0.65) return {from, dir};
    const n = 1 + Math.floor(rand() * 4), to = [from[0] + n * q.step * L.DIRS[dir][0], from[1] + n * q.step * L.DIRS[dir][1]];
    return to[0] >= q.win[0] && to[0] <= q.win[2] && to[1] >= q.win[1] && to[1] <= q.win[3] ? {from, to} : {from, dir};
  };
  let n = 0, right = 0;
  const shelves = [];
  for (let k = 0; k < 600; k++) shelves.push(Array.from({length: 1 + Math.floor(rand() * 3)}, randomMark));
  // Shelves that are right in different ways, and near misses.
  const ray = p.solution.ray, start = ray.from.map(c => 2 * c), dir = ray.dir, [dx, dy] = L.DIRS[dir];
  const ahead = n2 => [start[0] + n2 * q.step * dx, start[1] + n2 * q.step * dy];
  const inWin = z => z[0] >= q.win[0] && z[0] <= q.win[2] && z[1] >= q.win[1] && z[1] <= q.win[3];
  shelves.push([{from: start, dir}]);
  shelves.push([{from: start}, {from: ahead(1), dir}]);
  if (inWin(ahead(2))) shelves.push([{from: start, to: ahead(2)}, {from: ahead(2), dir}], [{from: start, to: ahead(1)}, {from: ahead(2), dir}]);
  shelves.push([{from: ahead(1), dir}], [{from: start}], [{from: start, dir}, {from: start}]);
  const back = [start[0] - q.step * dx, start[1] - q.step * dy];
  if (inWin(back)) shelves.push([{from: back, dir}], [{from: back}, {from: start, dir}]);
  for (const marks of shelves) {
    const unique = [];
    for (const m of marks) if (!unique.some(x => JSON.stringify(x) === JSON.stringify(m))) unique.push(m);
    const union = new Set();
    for (const m of unique) for (const k2 of covered(m)) union.add(k2);
    const want = sameSet(union, S);
    let a = fresh;
    for (const m of unique) a = play(p, a, {type: 'mark', ...m});
    const after = play(p, a, {type: 'all'});
    n++;
    assert.equal(isSolved(p, after.board), want, `${p.id}: That’s all with ${JSON.stringify(unique)}`);
    if (want) { right++; continue; }
    // A refusal is kept until the marks change, also across Undo.
    assert.equal(after.board.said, true);
    refuse(p, after, {type: 'all'}, 'That’s all twice');
    const back2 = undoOnce(p, after);
    assert.ok(back2.board.lock && !back2.board.said, `${p.id}: Undo keeps the refusal and takes back the words`);
    assert.notEqual(view(p, back2), view(p, after), `${p.id}: Undo changes the board`);
    refuse(p, back2, {type: 'all'}, 'That’s all again after Undo');
    // The mark it names really holds a junction that misses a circle.
    const verdict = judgeMarks(q, after.board.marks);
    if (verdict?.kind === 'off') {
      const z = verdict.at;
      assert.ok(!S.has(key(Q2(z))) && covered(after.board.marks[verdict.mark]).has(key(Q2(z))), `${p.id}: the junction shown is on the mark and does not work`);
      assert.ok(!tie(Q2(q.targets[verdict.miss]), Q2(z)), `${p.id}: the ringed circle is off that line`);
    } else assert.ok(![...union].some(k2 => !S.has(k2)), `${p.id}: “there are more” only when every mark is right`);
  }
  assert.ok(right >= 4, `${p.id}: the right shelves are judged right`);
  return n;
}
function checkPlay(p, fresh, places, row, counts) {
  const q = p.parameters;
  let steps = 0;
  const first = timedHint(p, fresh);
  assert.equal(first.type, 'move', `${p.id}: a first hint`);
  assert.notEqual(first.action.type, 'cant', `${p.id}: Can’t is never the first hint`);
  steps += hintsSolve(p, fresh, 'from fresh');

  // A wrong move, checked, then hints.
  const at = places.map(z => z.map(c => c / 2)).find(z => !L.same(z, q.start) && !(q.mode === 'meet' ? row.places.some(x => L.same(Q4(x), Q2(z))) : q.targets.every(t => tie(Q2(t), Q2(z)))));
  let a = play(p, fresh, {type: 'put', at});
  if (q.mode !== 'every') {
    a = play(p, a, {type: 'check'});
    assert.ok(!isSolved(p, a.board), `${p.id}: a wrong place checked is not a solve`);
    refuse(p, a, {type: 'check'}, 'Check twice in one place');
    // Undo keeps the refusal and takes back what the board said.
    const back = undoOnce(p, a);
    assert.notEqual(view(p, back), view(p, a), `${p.id}: Undo changes the board`);
    refuse(p, back, {type: 'check'}, 'Check again after Undo');
    assert.ok(validBoard(p, back.board), `${p.id}: the board after Undo is valid`);
    // Moving away and back allows a new Check.
    const off = places.map(z => z.map(c => c / 2)).find(z => !L.same(z, at));
    assert.ok(move(p, play(p, play(p, a, {type: 'put', at: off}), {type: 'put', at}), {type: 'check'}), `${p.id}: a moved junction can be checked again`);
  } else {
    a = play(p, a, {type: 'keep'});
    a = play(p, a, {type: 'all'});
    assert.ok(!isSolved(p, a.board));
  }
  steps += hintsSolve(p, a, 'after a wrong move');

  // Random play.
  const rand = random(p.number * 7919), spots = places.map(z => z.map(c => c / 2)), names = Object.keys(L.DIRS);
  for (let trial = 0; trial < 14; trial++) {
    let b = fresh;
    for (let k = 0, n = 1 + Math.floor(rand() * 8); k < n; k++) {
      const z = spots[Math.floor(rand() * spots.length)], r = rand();
      const action = r < 0.45 ? {type: 'put', at: z}
        : q.mode === 'every' ? (r < 0.6 ? {type: 'keep'} : r < 0.7 ? {type: 'drop'} : r < 0.85 ? {type: 'mark', from: z, dir: names[Math.floor(rand() * 8)]} : {type: 'all'})
          : r < 0.75 ? {type: 'check'} : {type: 'cant', picks: [Math.floor(rand() * 2), 2]};
      const next = move(p, b, action);
      if (next && !isSolved(p, next.board)) b = next;
      if (next) assert.ok(validBoard(p, next.board), `${p.id}: a legal move leaves a valid board`);
      if (rand() < 0.15) { const u = undoOnce(p, b); assert.ok(validBoard(p, u.board), `${p.id}: Undo leaves a valid board`); b = u; }
    }
    counts.randomStates++;
    steps += hintsSolve(p, b, `after random play ${trial}`);
  }

  if (q.mode === 'through' && q.cant) {
    refuse(p, fresh, {type: 'cant', picks: [0, 1]}, 'Can’t on a fresh board');
    for (const picks of [[0, 0], [0, 3], [-1, 1], ['0', 1], [0], 'PQ', [0, 1, 2]]) refuse(p, play(p, fresh, {type: 'put', at: spots.find(z => !L.same(z, q.start))}), {type: 'cant', picks}, `Can’t with ${JSON.stringify(picks)}`);
    if (row.cant) {
      // The hint chain makes an attempt at a certificate's junction, then
      // gives the reason with Can't.
      let b = fresh;
      const kinds = [];
      while (!isSolved(p, b.board)) { const h = nextHint(p, b); kinds.push(h.action.type); if (h.action.type === 'cant') assert.match(h.text, /misses/, `${p.id}: the reason comes with Can’t`); b = play(p, b, h.action); }
      assert.deepEqual(kinds, ['put', 'cant'], `${p.id}: an attempt, then Can’t`);
      // A wrong pair at the right junction: refused, kept across Undo and a
      // refused claim's words taken back; hints recover.
      const cert = row.cant[0], J = cert.junction.map(c => 2 * c);
      const atJ = play(p, fresh, {type: 'put', at: J});
      const wrongPair = [[0, 1], [0, 2], [1, 2]].find(pk => pk.map(k => q.names[k]).join() !== cert.circles.join() && !row.cant.some(c => c.circles.join() === pk.map(k => q.names[k]).join() && L.same(c.junction.map(x => 2 * x), J)));
      const claim = play(p, atJ, {type: 'cant', picks: wrongPair});
      assert.ok(!isSolved(p, claim.board), `${p.id}: a wrong pair is refused`);
      assert.deepEqual(claim.board.claimed, [wrongPair], `${p.id}: the pair is refused at this place`);
      // The same pair again changes nothing, here or after Undo: it stays refused.
      assert.equal(JSON.stringify(move(p, claim, {type: 'cant', picks: [...wrongPair].reverse()}).board), JSON.stringify(claim.board), `${p.id}: the same pair again changes nothing`);
      const back = undoOnce(p, claim);
      assert.deepEqual(back.board.claimed, [wrongPair], `${p.id}: Undo keeps the refused pair`);
      assert.equal(back.board.said, null, `${p.id}: and takes back its words`);
      assert.notEqual(view(p, back), view(p, claim), `${p.id}: Undo changes the board`);
      const backAgain = play(p, back, {type: 'cant', picks: wrongPair});
      assert.ok(!isSolved(p, backAgain.board) && backAgain.board.claimed.length === 1, `${p.id}: the refused pair after Undo only shows its words again`);
      // The hint goes straight to the right pair: no stepping off and back.
      assert.deepEqual(nextHint(p, claim).action, {type: 'cant', picks: cert.circles.map(nm => q.names.indexOf(nm))}, `${p.id}: the hint after a refused pair`);
      steps += hintsSolve(p, claim, 'after a refused Can’t');
      const right = cert.circles.map(nm => q.names.indexOf(nm));
      assert.ok(isSolved(p, play(p, claim, {type: 'cant', picks: right}).board), `${p.id}: another pair at the same place is a new claim`);
      // Every pair refused at one place: all three stay refused across Undo.
      const off = spots.find(z => !L.same(z, q.start) && !row.cant.some(c => L.same(c.junction.map(x => 2 * x), z)));
      let all3 = play(p, fresh, {type: 'put', at: off});
      for (const pk of [[0, 1], [0, 2], [1, 2]]) all3 = play(p, all3, {type: 'cant', picks: pk});
      assert.deepEqual(undoOnce(p, undoOnce(p, all3)).board.claimed, [[0, 1], [0, 2], [1, 2]], `${p.id}: refused pairs kept across Undo`);
    } else {
      // Possible: every claim is refused, and the hint never says Can't.
      let b = fresh;
      while (!isSolved(p, b.board)) { const h = nextHint(p, b); assert.notEqual(h.action.type, 'cant'); b = play(p, b, h.action); }
    }
  }
  return steps;
}

function checkForged(p, fresh, row) {
  const q = p.parameters, base = fresh.board, other = [q.start[0] === q.win[0] ? q.start[0] + q.step : q.start[0] - q.step, q.start[1]];
  const forged = [
    [{...base, at: [q.win[2] + q.step, 0]}, 'a junction past the board'],
    [{...base, at: [0.5, 0]}, 'a junction off the numbers'],
    [{...base, at: ['0', 0]}, 'a junction named by strings'],
    [{...base, at: [0, 0, 0]}, 'three numbers'],
    [{...base, extra: 1}, 'an unknown field'],
    [{...base, done: 'yes'}, 'a done that is not true or false'],
    [{...base, done: true}, 'a forged done at the start'],
    [{at: base.at}, 'missing fields'],
    [[], 'a list'],
    [null, 'nothing']
  ];
  if (q.step === 2) forged.push([{...base, at: [1, 0]}, 'a junction between grid dots']);
  if (q.mode === 'meet') {
    const right = row.places[0].map(c => 2 * c);
    assert.ok(validBoard(p, {...base, at: right, done: true}), `${p.id}: a solved save is valid`);
    forged.push([{...base, at: right, refused: true}, 'a refusal of a right place'], [{...base, said: true}, 'words without a refusal'], [{...base, at: right, done: true, said: true}, 'a solve with refusal words'], [{...base, at: other, done: true}, 'a forged done in a wrong place']);
  }
  if (q.mode === 'through') {
    const tried = {...base, at: other, tried: true};
    assert.ok(validBoard(p, tried), `${p.id}: an attempt is a valid save`);
    forged.push([{...base, at: other}, 'a move that is not an attempt'], [{...tried, said: 'check'}, 'Check words without a refusal'], [{...tried, done: true}, 'a forged done in a wrong place'], [{...tried, said: [0, 1]}, 'claim words without a claim']);
    if (row.junction) {
      const J = row.junction.map(c => 2 * c);
      assert.ok(validBoard(p, {...tried, at: J, done: true}), `${p.id}: a solved save is valid`);
      forged.push([{...tried, at: J, checked: true}, 'a refused Check of the answer'], [{...tried, at: J, cert: [0, 1], done: true}, 'a certificate where a line exists']);
    }
    if (q.cant) {
      forged.push([{...base, claimed: [[0, 1]]}, 'a claim with no attempt'], [{...tried, cert: [0, 1], done: true}, 'a certificate in the wrong place'], [{...tried, cert: [0, 3], done: true}, 'a certificate with a missing circle'], [{...tried, claimed: true}, 'refused pairs that are not a list'], [{...tried, claimed: [[1, 2], [0, 1]]}, 'refused pairs out of order'], [{...tried, claimed: [[0, 1], [0, 1]]}, 'a pair refused twice'], [{...tried, claimed: [[1, 0]]}, 'a pair turned round'], [{...tried, claimed: [[0, 1]], said: [0, 2]}, 'words for a pair not refused']);
      assert.ok(validBoard(p, {...tried, claimed: [[0, 1]], said: [0, 1]}), `${p.id}: a refused pair with its words is a valid save`);
      if (row.cant) {
        const c = row.cant[0], J = c.junction.map(x => 2 * x), picks = c.circles.map(nm => q.names.indexOf(nm));
        assert.ok(validBoard(p, {...tried, at: J, cert: picks, done: true}), `${p.id}: a certificate save is valid`);
        forged.push([{...tried, at: J, cert: picks}, 'a certificate without done'], [{...tried, at: J, cert: picks, done: true, claimed: [picks]}, 'the certificate among the refused pairs'], [{...base, at: J, cert: picks, done: true}, 'a certificate with no attempt'], [{...tried, at: J, cert: [...picks].reverse(), done: true}, 'a certificate turned round'], [{...tried, at: J, claimed: [picks], said: picks}, 'a refusal of the certificate']);
      }
    } else forged.push([{...base, at: other, tried: true, claimed: [[0, 1]]}, 'a claim where there is no Can’t']);
  }
  if (q.mode === 'every') {
    const ray = {from: p.solution.ray.from.map(c => 2 * c), dir: p.solution.ray.dir};
    assert.ok(validBoard(p, {...base, marks: [ray], done: true}), `${p.id}: a solved save is valid`);
    forged.push(
      [{...base, done: true}, 'That’s all done with no marks'],
      [{...base, marks: [{from: base.at}], done: true}, 'a forged done with a wrong shelf'],
      [{...base, marks: [ray], lock: [ray]}, 'a refusal of the right shelf'],
      [{...base, marks: [ray, ray]}, 'a doubled mark'],
      [{...base, marks: [{from: ray.from, dir: 'UP'}]}, 'a mark in no direction'],
      [{...base, marks: [{from: ray.from, to: [ray.from[0] + 1, ray.from[1] + 2 * q.step]}]}, 'a stretch off the eight directions'],
      [{...base, marks: [{from: ray.from, to: ray.from}]}, 'a stretch of no length'],
      [{...base, marks: [{from: ray.from, dir: ray.dir, to: ray.from}]}, 'a mark with too many fields'],
      [{...base, marks: Array.from({length: 25}, (_, k) => ({from: [q.win[0] + (k % 9) * q.step, q.win[1] + Math.floor(k / 9) * q.step]}))}, 'too many marks'],
      [{...base, said: true}, 'refusal words without a refusal'],
      [{...base, marks: [{from: base.at}], lock: [{from: base.at}], said: true, done: true}, 'a refusal and a solve']
    );
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // Nothing after a solve.
  let done = fresh;
  for (let k = 0; !isSolved(p, done.board) && k < 20; k++) done = play(p, done, nextHint(p, done).action);
  refuse(p, done, {type: 'put', at: other}, 'a move after a solve');
  for (const [action, why] of [[null, 'nothing'], ['put', 'a string'], [{type: 'fly'}, 'an unknown move'], [{type: 'put'}, 'no place'], [{type: 'put', at: base.at}, 'a move that stays put'], [{type: 'put', at: [q.win[2] + q.step, 0]}, 'a move past the board'], [{type: 'put', at: [q.win[0] - q.step, 0]}, 'a move past the left edge']]) refuse(p, fresh, action, why);
  if (q.step === 2) refuse(p, fresh, {type: 'put', at: [1, 0]}, 'a move between grid dots');
  if (q.mode === 'every') {
    refuse(p, fresh, {type: 'drop'}, 'Drop with nothing there');
    refuse(p, fresh, {type: 'all'}, 'That’s all with no marks');
    refuse(p, fresh, {type: 'check'}, 'Check in a find-every puzzle');
    const kept = play(p, fresh, {type: 'keep'});
    refuse(p, kept, {type: 'keep'}, 'Keep twice in one place');
    refuse(p, kept, {type: 'mark', from: base.at}, 'the same mark twice');
    refuse(p, fresh, {type: 'mark', from: base.at, dir: 'UP'}, 'a mark in no direction');
    refuse(p, fresh, {type: 'mark', from: [q.win[2] + q.step, 0], dir: 'E'}, 'a mark from past the board');
    let many = fresh;
    for (let k = 0; many.board.marks.length < 24; k++) { const next = move(p, many, {type: 'mark', from: [q.win[0] + (k % 9) * q.step, q.win[1] + Math.floor(k / 9) * q.step]}); if (next) many = next; }
    refuse(p, many, {type: 'mark', from: [q.win[2], q.win[3]], dir: 'E'}, 'a twenty-fifth mark');
  } else {
    for (const t of ['keep', 'drop', 'all']) refuse(p, play(p, fresh, {type: 'put', at: other}), {type: t}, `${t} outside the find-every puzzles`);
  }
  if (q.mode === 'meet') refuse(p, play(p, fresh, {type: 'put', at: other}), {type: 'cant', picks: [0, 1]}, 'Can’t in a meet puzzle');
}

function checkPlayground(p) {
  const q = p.parameters, M = mechanicFor(p), fresh = freshAttempt(p);
  assert.equal(M.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  let a = play(p, fresh, {type: 'put', which: 'b', at: [q.start[0][0], q.start[1][1]]});
  a = play(p, a, {type: 'put', which: 'a', at: [0, 0]});
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  for (const [action, why] of [[{type: 'check'}, 'Check'], [{type: 'put', which: 'c', at: [0, 0]}, 'a third line'], [{type: 'put', which: 'a', at: [0, 0]}, 'a move that stays put'], [{type: 'put', which: 'b', at: [1, 0]}, 'a move between grid dots'], [{type: 'put', which: 'b', at: [18, 0]}, 'a move past the board']]) refuse(p, a, action, why);
  for (const [board, why] of [[{a: [0, 0]}, 'one line'], [{a: [0, 0], b: [0, 0], done: true}, 'a done'], [{a: [0, 0], b: [18, 0]}, 'a line past the board']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  // The playground's starting lines share one point (the worksheet's example: (4, 4)).
  const box = boxOf(q.win);
  assert.deepEqual(shared(box, Q2(q.start[0]), Q2(q.start[1])), {kind: 'point', at: Q4([4, 4])}, `${p.id}: A and B share only (4, 4)`);
}

export default validateTropical;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateTropical(), null, 2));
