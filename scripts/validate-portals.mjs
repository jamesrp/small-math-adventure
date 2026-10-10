// Checks the Portal rooms pack (dist/families/portals/portals.json): content
// fields and sources; every room rebuilt from its rows and checked against the
// pack; every answer recomputed by methods unlike the mechanic's (a pawn
// simulated with coordinates taken modulo the room's width and height, all
// 4^k trips enumerated, lifts compared with summed displacements, the trade
// decided by the translation test 2v ≡ 0, the trip moves decided by the
// displacement, and fewest slides by the area between trips and by matching
// step positions); witnesses played as moves; hint chains from fresh, after a
// wrong move, after a wrong Can't or That's all, and after a dead end with the
// app's own undo; illegal moves; forged saves; the playground.
// Run: node scripts/validate-portals.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {surfaceFor, tripLift, copyIndex, tradePossible, shrinkPossible, editReach} from '../dist/families/portals/portals.js';
import {loadPack} from './packs.mjs';

// --- An independent pawn ------------------------------------------------------
// A room from its rows of letters (top row first) and which ways it wraps.
function sim(rows, wrapX, wrapY) {
  const H = rows.length, W = rows[0].length, pos = {};
  rows.forEach((row, k) => [...row].forEach((id, c) => { pos[id] = [c, H - 1 - k]; }));
  const name = ([c, r]) => rows[H - 1 - r][c];
  const D = {R: [1, 0], L: [-1, 0], U: [0, 1], D: [0, -1]};
  // One step in room coordinates, or null at a wall.
  const go = ([c, r], d) => {
    let [x, y] = [c + D[d][0], r + D[d][1]];
    if (x < 0 || x >= W) { if (!wrapX) return null; x = (x + W) % W; }
    if (y < 0 || y >= H) { if (!wrapY) return null; y = (y + H) % H; }
    return [x, y];
  };
  // A whole trip: the end square, or null; and the plane displacement.
  const run = (from, word) => { let p = pos[from]; for (const d of word) { p = go(p, d); if (!p) return null; } return name(p); };
  const disp = word => [...word].reduce(([x, y], d) => [x + D[d][0], y + D[d][1]], [0, 0]);
  // The spec the pack should carry, built from coordinates.
  const spec = () => {
    const right = {}, up = {};
    for (const [id, p] of Object.entries(pos)) { const r = go(p, 'R'), u = go(p, 'U'); right[id] = r ? name(r) : null; up[id] = u ? name(u) : null; }
    return {squares: pos, right, up};
  };
  return {W, H, pos, name, go, run, disp, spec, wrapX, wrapY};
}
const words = k => k === 0 ? [''] : words(k - 1).flatMap(w => [...'RULD'].map(c => w + c));
const ROOMS = {
  torus3: sim(['ABC', 'DHE', 'FGI'], true, true),
  plain3: sim(['ABC', 'DHE', 'FGI'], false, false),
  tube3: sim(['ABC', 'DHE', 'FGI'], true, false),
  torus4: sim(['ABCD', 'EFGH', 'IJKL', 'MNOP'], true, true)
};
const roomOf = q => Object.values(ROOMS).find(r => JSON.stringify(r.spec()) === JSON.stringify({squares: q.room.squares, right: q.room.right, up: q.room.up}));

// Fewest slides between two trips of the same steps up to order, R/L against
// U/D only (no cancels): each sideways step must pass each up or down step
// that is on its other side, which is the sum of the gaps between matching
// sideways steps.
function slidesBetween(a, b) {
  const side = w => [...w].map((c, k) => 'RL'.includes(c) ? k : -1).filter(k => k >= 0);
  const [pa, pb] = [side(a), side(b)];
  assert.equal(pa.length, pb.length);
  assert.deepEqual(pa.map(k => a[k]), pb.map(k => b[k]), 'the sideways steps keep their order');
  return pa.reduce((s, k, i) => s + Math.abs(k - pb[i]), 0);
}
// Signed area under a trip's path: a slide changes it by one, an erasure by none.
const area = w => { let y = 0, s = 0; for (const c of w) { if (c === 'R') s += y; if (c === 'L') s -= y; if (c === 'U') y++; if (c === 'D') y--; } return s; };

// The table in docs/portals/README.md.
const TABLE = {
  'portals-01': {mode: 'walk', room: 'torus3', shortest: 6, witness: 'RRRUUU'},
  'portals-02': {mode: 'every', room: 'torus3', answers: 'ABCDHEFGI'},
  'portals-03': {mode: 'walk', room: 'torus3', steps: 3, homeTrips: 4, witness: 'RRR', wrong: 'RU'},
  'portals-04': {mode: 'trade', room: 'torus3', possible: false},
  'portals-05': {mode: 'walk', room: 'torus3', shortest: 12, witness: 'RRRUUULLLDDD'},
  'portals-06': {mode: 'walk', room: 'torus3', steps: 5, homeTrips: 100, witness: 'RRRRL', wrong: 'RURU'},
  'portals-07': {mode: 'every', room: 'plain3', answers: 'AHCFI'},
  'portals-08': {mode: 'shrink', room: 'torus3', possible: true, slides: 9, erasures: 6},
  'portals-09': {mode: 'trade', room: 'torus4', possible: true, shortest: 4, witness: 'RRDD'},
  'portals-10': {mode: 'shrink', room: 'torus3', possible: true, slides: 9},
  'portals-11': {mode: 'shrink', room: 'torus3', possible: false, endCopy: [0, 1]},
  'portals-12': {mode: 'walk', room: 'torus4', steps: 5, homeTrips: 0}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const steps = (p, a, word) => [...word].reduce((b, d) => play(p, b, {type: 'step', dir: d}), a);
// Follow the hints to a solve, taking the app's Undo rescue at a dead end.
function hintsSolve(p, a, label) {
  let n = 0;
  for (; !isSolved(p, a.board) && n < 300; n++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { const back = undoToSolvable(p, a); assert.notEqual(back, a, `${p.id} ${label}: Undo leaves the dead end`); a = back; continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(h.text && h.text.length < 220, `${p.id} ${label}: a short hint`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return n;
}

export async function validatePortals() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/portals/portals.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-41')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-41.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'portals');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems behind the puzzles, over every square and short trip.
  const T3 = ROOMS.torus3, T4 = ROOMS.torus4, P3 = ROOMS.plain3;
  let tripsChecked = 0;
  for (const k of [0, 1, 2, 3, 4, 5]) for (const w of words(k)) {
    for (const [r, s] of [[T3, 'H'], [T4, 'F'], [P3, 'H']]) {
      const end = r.run(s, w);
      if (r === T3 || r === T4) {
        const [dx, dy] = r.disp(w), [c, rr] = r.pos[s];
        // A trip comes home on a torus exactly when both parts of its displacement are whole rooms.
        assert.equal(end === s, dx % r.W === 0 && dy % r.H === 0);
        // The mechanic's lift ends where the summed steps say, in that copy.
        const q = {room: r.spec()}, S = surfaceFor(q), L = tripLift(S, s, w);
        assert.equal(L.end.s, end);
        assert.deepEqual(copyIndex(S, L.end), [Math.floor((c + dx) / r.W), Math.floor((rr + dy) / r.H)]);
      }
      tripsChecked++;
    }
  }
  // On the four-wide torus no odd trip comes home; on the three-wide one every square is two steps from H.
  for (const k of [1, 3, 5]) assert.equal(words(k).filter(w => T4.run('F', w) === 'F').length, 0, `no ${k}-step trip home on the 4 × 4 torus`);
  assert.equal(new Set(words(2).map(w => T3.run('H', w))).size, 9, 'every square in two steps');
  // The trade test, for every pair of squares on both tori.
  for (const r of [T3, T4]) for (const a of Object.keys(r.pos)) for (const b of Object.keys(r.pos)) {
    if (a === b) continue;
    const [dx, dy] = [r.pos[b][0] - r.pos[a][0], r.pos[b][1] - r.pos[a][1]];
    const test = (2 * dx) % r.W === 0 && (2 * dy) % r.H === 0;
    assert.equal(tradePossible({mode: 'trade', room: r.spec(), pawns: [a, b]}), test, `trade ${a}, ${b} on ${r.W} × ${r.H}`);
  }

  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'portals');
    assert.ok(p.id.startsWith('portals-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok((p.visibleObjective.match(/[.?!]/g) || []).length <= 1, `${p.id}: at most one sentence on the board`);
    assert.ok(!/where does|what copy|which copy/i.test(p.visibleObjective + p.objective), `${p.id}: no prediction quiz`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { checkPlayground(p, fresh); continue; }

    const row = TABLE[p.id], r = roomOf(q);
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.equal(r, ROOMS[row.room], `${p.id}: the room is the ${row.room} built from its rows`);
    if (q.mode === 'walk' && q.steps) hintSteps += checkExact(p, fresh, row, r);
    else if (q.mode === 'walk') hintSteps += checkStars(p, fresh, row, r);
    else if (q.mode === 'every') hintSteps += checkEvery(p, fresh, row, r);
    else if (q.mode === 'trade') hintSteps += checkTrade(p, fresh, row, r);
    else hintSteps += checkShrink(p, fresh, row, r);
    checkForgeries(p, fresh, r);
  }
  return {portalPuzzles: puzzles.length, tripsChecked, hintSteps};
}

// Exactly k steps home: the count by enumeration, the witness, a dead end,
// and Can't.
function checkExact(p, fresh, row, r) {
  const q = p.parameters, home = words(q.steps).filter(w => r.run(q.home, w) === q.home);
  assert.equal(q.steps, row.steps);
  assert.equal(home.length, row.homeTrips, `${p.id}: ${row.homeTrips} trips home`);
  if (p.solution.homeTrips !== undefined) assert.equal(p.solution.homeTrips, home.length);
  // A trip home with an odd number of steps has a displacement of whole rooms that is not zero.
  for (const w of home) { const [dx, dy] = r.disp(w); assert.ok(dx || dy || q.steps % 2 === 0); }
  let n = hintsSolve(p, fresh, 'from fresh');
  if (!home.length) {
    assert.equal(p.solution.cant, true);
    assert.ok(r.W % 2 === 0 && r.H % 2 === 0 && q.steps % 2 === 1, `${p.id}: the checkerboard certificate`);
    const claimed = play(p, fresh, {type: 'cant'});
    assert.ok(isSolved(p, claimed.board), `${p.id}: Can’t is right`);
    let b = steps(p, fresh, 'RRUD');
    n += hintsSolve(p, b, 'after a few steps');
    b = steps(p, fresh, 'RRUDL');
    assert.ok(!isSolved(p, b.board), `${p.id}: five steps that miss F`);
    refuse(p, b, {type: 'step', dir: 'R'}, 'a step past the beads');
    n += hintsSolve(p, b, 'with every bead used');
    return n;
  }
  const done = steps(p, fresh, row.witness);
  assert.ok(isSolved(p, done.board), `${p.id}: the witness solves`);
  for (const w of home.slice(0, 40)) assert.ok(isSolved(p, steps(p, fresh, w).board), `${p.id}: ${w} solves`);
  const wrongCant = play(p, fresh, {type: 'cant'});
  assert.equal(wrongCant.board.told, 'way', `${p.id}: there is a way`);
  assert.ok(!isSolved(p, wrongCant.board));
  refuse(p, wrongCant, {type: 'cant'}, 'Can’t twice');
  n += hintsSolve(p, wrongCant, 'after a wrong Can’t');
  // A start that can't finish: the hint says so, and Undo goes back.
  const stuck = steps(p, fresh, row.wrong);
  assert.equal(nextHint(p, stuck).type, 'deadend', `${p.id}: ${row.wrong} can’t finish`);
  n += hintsSolve(p, stuck, 'after a dead end');
  // A full trip that misses H stays unsolved and can't take another step.
  const miss = words(q.steps).find(w => r.run(q.home, w) && r.run(q.home, w) !== q.home);
  const full = steps(p, fresh, miss);
  assert.ok(!isSolved(p, full.board));
  refuse(p, full, {type: 'step', dir: 'R'}, 'a step past the beads');
  return n;
}

// Stars in named copies: the shortest trip by a search over plane
// coordinates, the witness, and wrong turns.
function checkStars(p, fresh, row, r) {
  const q = p.parameters, [c0, r0] = r.pos[q.home];
  const stars = q.stars.map(st => [r.pos[st.s][0] + st.copy[0] * r.W, r.pos[st.s][1] + st.copy[1] * r.H]);
  // Breadth-first search over (x, y, stars seen) in the plane.
  const full = (1 << stars.length) - 1, start = [c0, r0, 0], seen = new Set([start.join()]), queue = [[...start, 0]];
  let shortest = null;
  for (let k = 0; k < queue.length && shortest === null; k++) {
    const [x, y, m, d] = queue[k];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const [nx, ny] = [x + dx, y + dy], i = stars.findIndex(s => s[0] === nx && s[1] === ny), nm = i >= 0 ? m | (1 << i) : m;
      if (nm === full && (!q.back || (nx === c0 && ny === r0))) { shortest = d + 1; break; }
      const key = [nx, ny, nm].join();
      if (Math.abs(nx - c0) > 12 || Math.abs(ny - r0) > 12 || seen.has(key)) continue;
      seen.add(key); queue.push([nx, ny, nm, d + 1]);
    }
  }
  assert.equal(shortest, row.shortest, `${p.id}: the shortest trip`);
  assert.equal(row.witness.length, shortest);
  const done = steps(p, fresh, row.witness);
  assert.ok(isSolved(p, done.board), `${p.id}: the witness solves`);
  // Any order of the witness's steps that stays a shortest trip also solves.
  if (!q.back) assert.ok(isSolved(p, steps(p, fresh, 'URURUR').board), `${p.id}: another order solves`);
  else {
    assert.ok(isSolved(p, steps(p, fresh, 'RRRLLLUUUDDD').board), `${p.id}: back through the first copy solves`);
    // On H in the room but in another copy is not home.
    const away = steps(p, fresh, 'RRRUUU');
    assert.ok(!isSolved(p, away.board), `${p.id}: H in another copy is not home`);
    assert.ok(!isSolved(p, steps(p, fresh, 'RRRLLL').board), `${p.id}: one star is not enough`);
  }
  refuse(p, fresh, {type: 'cant'}, 'Can’t on a walk to stars');
  refuse(p, fresh, {type: 'all'}, 'That’s all on a walk');
  let n = hintsSolve(p, fresh, 'from fresh');
  n += hintsSolve(p, steps(p, fresh, 'LLD'), 'after a wrong way');
  // A trip that wanders to the step limit is a dead end.
  let long = fresh;
  for (let k = 0; k < 30; k++) long = play(p, long, {type: 'step', dir: k % 2 ? 'L' : 'D'});
  refuse(p, long, {type: 'step', dir: 'L'}, 'a trip past the step limit');
  assert.equal(nextHint(p, long).type, 'deadend', `${p.id}: a trip too long to finish`);
  n += hintsSolve(p, long, 'after a long wander');
  return n;
}

// Every square exactly k steps away: the set by enumeration; rings, repeats
// and That's all.
function checkEvery(p, fresh, row, r) {
  const q = p.parameters, ends = new Map();
  for (const w of words(q.steps)) { const e = r.run(q.home, w); if (e && !ends.has(e)) ends.set(e, w); }
  assert.deepEqual([...ends.keys()].sort(), [...row.answers].sort(), `${p.id}: the squares ${q.steps} steps away`);
  assert.deepEqual([...p.solution.answers].sort(), [...ends.keys()].sort());
  let a = fresh;
  for (const [s, w] of ends) {
    a = steps(p, a, w);
    assert.ok(a.board.found.includes(s) && a.board.trip === '', `${p.id}: ${w} rings ${s}`);
  }
  const again = steps(p, a, ends.get(row.answers[0]));
  assert.deepEqual(again.board.told, {kind: 'again', s: row.answers[0]}, `${p.id}: found already`);
  assert.ok(isSolved(p, play(p, a, {type: 'all'}).board), `${p.id}: That’s all after every square`);
  const early = play(p, steps(p, fresh, ends.get(row.answers[1])), {type: 'all'});
  assert.deepEqual(early.board.told, {kind: 'more'}, `${p.id}: there is another`);
  refuse(p, early, {type: 'all'}, 'That’s all again before a new square');
  // A repeat keeps That's all off; only a new square turns it back on.
  const repeat = steps(p, early, ends.get(row.answers[1]));
  assert.deepEqual(repeat.board.told, {kind: 'again', s: row.answers[1], more: true}, `${p.id}: found already, and still another`);
  refuse(p, repeat, {type: 'all'}, 'That’s all after a repeat, before a new square');
  const w0 = ends.get(row.answers[0]);
  assert.deepEqual(play(p, repeat, {type: 'step', dir: w0[0]}).board.told, {kind: 'more'}, `${p.id}: still another, mid-trip`);
  const next = steps(p, repeat, w0);
  assert.equal(next.board.told, null, `${p.id}: a new square`);
  assert.ok(move(p, next, {type: 'all'}), `${p.id}: That’s all again after a new square`);
  refuse(p, fresh, {type: 'cant'}, 'Can’t when That’s all is the claim');
  if (r === ROOMS.plain3) { const b = steps(p, fresh, 'R'); refuse(p, b, {type: 'step', dir: 'R'}, 'a step through a wall'); }
  let n = hintsSolve(p, fresh, 'from fresh');
  n += hintsSolve(p, early, 'after a wrong That’s all');
  n += hintsSolve(p, again, 'after a repeat');
  n += hintsSolve(p, repeat, 'after a repeat with a square still unringed');
  n += hintsSolve(p, steps(p, fresh, 'R'), 'after one step');
  return n;
}

// Two pawns, the same steps: the translation test and the shortest trade.
function checkTrade(p, fresh, row, r) {
  const q = p.parameters, [a0, b0] = q.pawns;
  const [dx, dy] = [r.pos[b0][0] - r.pos[a0][0], r.pos[b0][1] - r.pos[a0][1]];
  const test = (2 * dx) % r.W === 0 && (2 * dy) % r.H === 0;
  assert.equal(test, row.possible, `${p.id}: 2v ≡ 0 decides the trade`);
  let n = hintsSolve(p, fresh, 'from fresh');
  if (!row.possible) {
    assert.equal(p.solution.cant, true);
    // After any trip, the blue pawn is the same translation from the yellow one.
    for (const w of words(4)) { const ea = r.run(a0, w), eb = r.run(b0, w); assert.ok(!(ea === b0 && eb === a0)); assert.equal(((r.pos[eb][0] - r.pos[ea][0] - dx) % r.W + r.W) % r.W, 0); }
    assert.ok(isSolved(p, play(p, fresh, {type: 'cant'}).board), `${p.id}: Can’t is right`);
    n += hintsSolve(p, steps(p, fresh, 'UUL'), 'after a few steps');
    return n;
  }
  // The shortest trade moves both pawns by the shortest v with v ≡ the gap and 2v ≡ 0.
  const fold = (d, m) => Math.min(((d % m) + m) % m, m - ((d % m) + m) % m);
  assert.equal(fold(dx, r.W) + fold(dy, r.H), row.shortest, `${p.id}: the shortest trade`);
  assert.equal(row.witness.length, row.shortest);
  assert.ok(isSolved(p, steps(p, fresh, row.witness).board), `${p.id}: the witness solves`);
  assert.ok(isSolved(p, steps(p, fresh, 'LLUU').board), `${p.id}: the other way round solves too`);
  const wrong = play(p, fresh, {type: 'cant'});
  assert.equal(wrong.board.told, 'way', `${p.id}: there is a way`);
  n += hintsSolve(p, wrong, 'after a wrong Can’t');
  n += hintsSolve(p, steps(p, fresh, 'RUR'), 'after a wrong turn');
  return n;
}

// Erasing and sliding: whether the target is reachable, the fewest slides,
// any route solving, and the finishing copy.
function checkShrink(p, fresh, row, r) {
  const q = p.parameters, [dx, dy] = r.disp(q.trip), [tx, ty] = r.disp(q.target);
  // Moves only shorten or reorder; a trip can reach a target exactly when they have the same displacement.
  assert.equal(dx === tx && dy === ty, row.possible, `${p.id}: the displacements decide`);
  assert.equal(shrinkPossible(q), row.possible, `${p.id}: the mechanic agrees`);
  let n = hintsSolve(p, fresh, 'from fresh');
  if (!row.possible) {
    assert.deepEqual([dx / r.W, dy / r.H], row.endCopy, `${p.id}: the finishing copy`);
    assert.deepEqual(p.solution.endCopy, row.endCopy);
    // Every trip the moves reach ends in that copy.
    const S = surfaceFor(q);
    for (const w of editReach(q.trip).keys()) assert.deepEqual(copyIndex(S, tripLift(S, q.home, w).end), row.endCopy);
    assert.ok(isSolved(p, play(p, fresh, {type: 'cant'}).board), `${p.id}: Can’t is right`);
    return n;
  }
  const slides = q.target === '' ? Math.abs(area(q.trip)) : slidesBetween(q.trip, q.target);
  assert.equal(slides, row.slides, `${p.id}: the fewest slides`);
  assert.equal(Math.abs(area(q.trip) - area(q.target)), slides, `${p.id}: the area between the trips`);
  assert.equal(editReach(q.trip).get(q.target), slides, `${p.id}: the mechanic’s search agrees`);
  if (row.erasures !== undefined) assert.equal((q.trip.length - q.target.length) / 2, row.erasures);
  assert.equal(p.solution.slides ?? slides, slides);
  const wrong = play(p, fresh, {type: 'cant'});
  assert.equal(wrong.board.told, 'way');
  n += hintsSolve(p, wrong, 'after a wrong Can’t');
  if (q.target) {
    // The nine-slide sequence of the worksheet guide: a fewest route.
    assert.equal(q.trip, 'RRRUUU');
    const guide = ['RRRUUU', 'RRURUU', 'RURRUU', 'URRRUU', 'URRURU', 'URURRU', 'UURRRU', 'UURRUR', 'UURURR', 'UUURRR'];
    const route = a0 => {
      let a = a0;
      for (let k = 1; k < guide.length; k++) {
        const at = [...guide[k]].findIndex((c, i) => c !== guide[k - 1][i]) + 1;
        a = play(p, a, {type: 'slide', at});
        assert.equal(a.board.trip, guide[k]);
      }
      return a;
    };
    assert.ok(isSolved(p, route(fresh).board), `${p.id}: the guide’s nine slides solve`);
    // Any route solves: two slides that go nowhere, then the nine.
    const back = play(p, play(p, fresh, {type: 'slide', at: 3}), {type: 'slide', at: 3});
    assert.equal(back.board.trip, 'RRRUUU');
    assert.equal(nextHint(p, back).type, 'move', `${p.id}: no dead end after wasted slides`);
    assert.ok(isSolved(p, route(back).board), `${p.id}: eleven slides solve too`);
    n += hintsSolve(p, back, 'after slides that went nowhere');
    // Hints from every trip the moves reach.
    for (const w of editReach(q.trip).keys()) assert.equal(nextHint(p, {...fresh, board: {...fresh.board, trip: w}}).type, w === q.target ? 'done' : 'move', `${p.id}: a hint from ${w}`);
  } else {
    // Sliding the first corner the other way round, then hints.
    const b = play(p, fresh, {type: 'slide', at: 3});
    n += hintsSolve(p, b, 'after a slide');
  }
  refuse(p, fresh, {type: 'slide', at: 1}, 'a slide where two steps go the same way');
  refuse(p, fresh, {type: 'cancel', at: 3}, 'erasing steps that do not go back');
  refuse(p, fresh, {type: 'step', dir: 'R'}, 'a step on a trip to change');
  return n;
}

// Saves that the app must refuse.
function checkForgeries(p, fresh, r) {
  const q = p.parameters, b = fresh.board, bad = [];
  bad.push([{...b, extra: 1}, 'an extra field']);
  bad.push([{...b, trip: 'RXU'}, 'a letter that is not a step']);
  if (q.mode === 'shrink') {
    bad.push([{...b, trip: q.trip + 'R'}, 'a trip the moves never reach']);
    bad.push([{...b, trip: 'LLL'}, 'a trip with a different end']);
    bad.push([{...b, slides: 0}, 'a slide count, which the board doesn’t keep']);
  } else if (q.mode === 'every') {
    bad.push([{...b, found: ['Z']}, 'a ring on no square']);
    const two = q.steps === 2 && r === ROOMS.plain3 ? 'B' : null;
    if (two) bad.push([{...b, found: [two]}, 'a ring on a square two steps can’t reach']);
    bad.push([{...b, found: ['H', 'H']}, 'a square ringed twice']);
    bad.push([{...b, done: true}, 'That’s all with squares unringed']);
    bad.push([{...b, trip: 'RR'}, 'a trip as long as the count left open']);
    bad.push([{...b, told: {kind: 'again', s: 'H'}}, 'a repeat of a square never ringed']);
    const [s0] = p.solution.answers;
    bad.push([{...b, found: [s0], told: {kind: 'again', s: s0, more: false}}, 'a repeat with more: false']);
    bad.push([{...b, found: [...p.solution.answers], told: {kind: 'again', s: s0, more: true}}, 'another left with every square ringed']);
  } else {
    bad.push([{...b, trip: 'R'.repeat(31)}, 'a trip longer than the limit']);
    const cant = q.mode === 'trade' || q.steps;
    if (!cant) bad.push([{...b, claimed: true}, 'Can’t on a walk to stars']);
    else if (q.mode === 'trade' ? tradePossible(q) : words(q.steps).some(w => r.run(q.home, w) === q.home)) bad.push([{...b, claimed: true}, 'a Can’t that is wrong, kept as solved']);
    else bad.push([{...b, told: 'way'}, '“there is a way” where there is none']);
    if (q.mode === 'walk' && q.stars && !q.back) bad.push([{...b, trip: 'RRRUUUR'}, 'a trip that goes on after the star']);
    if (q.mode === 'walk' && q.steps) bad.push([{...b, trip: 'R'.repeat(q.steps + 1)}, 'more steps than the beads']);
    if (r === ROOMS.plain3) bad.push([{...b, trip: 'RR'}, 'a trip through a wall']);
  }
  for (const [board, why] of bad) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  for (const [name, spec] of Object.entries(q.rooms)) {
    const r = roomOf(spec);
    assert.ok(r, `${p.id}: ${name} is one of the rooms built from rows`);
    let a = name === fresh.board.room ? fresh : play(p, fresh, {type: 'room', room: name});
    assert.equal(a.board.trip, '');
    // Walk every way twice from home; refused exactly where the pawn would meet a wall.
    for (const w of ['RR', 'UU', 'LL', 'DD', 'RURURU']) {
      let b = a, ok = true;
      for (const d of w) {
        const there = r.run(spec.home, b.board.trip + d), next = move(p, b, {type: 'step', dir: d});
        assert.equal(Boolean(next), Boolean(there), `${p.id}: ${name} ${b.board.trip + d}`);
        if (!next) { ok = false; break; }
        b = next;
      }
      assert.ok(!isSolved(p, b.board), `${p.id}: never solved`);
      if (ok) assert.equal(r.run(spec.home, b.board.trip), tripLift(surfaceFor(spec), spec.home, b.board.trip).end.s);
    }
    refuse(p, a, {type: 'cant'}, 'Can’t in the playground');
  }
  refuse(p, fresh, {type: 'room', room: 'moon'}, 'an unknown room');
  refuse(p, fresh, {type: 'room', room: fresh.board.room}, 'the same room');
  for (const [board, why] of [[{...fresh.board, room: 'moon'}, 'an unknown room'], [{...fresh.board, trip: 'Q'}, 'a step that is not one'], [{...fresh.board, told: 'way'}, 'a told in the playground'], [{room: 'plain3', trip: 'RR'}, 'a trip through a wall']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validatePortals;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validatePortals(), null, 2));
