// Checks the Octagon streets pack (dist/families/octagon/octagon.json) by
// methods unlike the mechanic's rewriting system:
// - Octagons: the rotation group as exact 3 × 3 matrices over Z[√2] (Vinberg's
//   form of the reflection group of the triangle with angles π/2, π/4, π/8),
//   with dots, roads and rooms named by the vectors their stabilisers fix.
//   Every walk of each home goal's length is checked, by meeting in the
//   middle, as are the counts the notes quote at 10, 12, 16, 18 and 20;
//   every walk of the can't fence goal up to FENCE_CAP moves is searched
//   with no theorem; the fences of the other goals are found by
//   listing every block of rooms that Gauss–Bonnet allows and walking round
//   it, and every fence found is checked against 4 + 4n.
// - Squares: whole-number coordinates; every walk searched, and the flowers
//   tested by a ray crossing the fence.
// - The rewriting rules hold in the matrices, and the mechanic's normal forms
//   name the same elements as the matrices for every word of up to 8 letters.
// - Hints alone solve every puzzle from a fresh start, after a wrong move,
//   after a refused claim and after a wrong certificate tap, never as a
//   dead end (whose text the app shows unasked); a random tap
//   rarely makes a certificate; illegal moves and forged saves are refused.
// Run: node scripts/validate-octagon.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {reduce, rulesFor, MOVE, TURNS, FENCE_CAP, PLAY_CAP, EDGE, claimTargets, goalMet, halfwayState, lefts, rights} from '../dist/families/octagon/octagon.js';
import {loadPack} from './packs.mjs';

// --- Z[√2] and matrices ------------------------------------------------------
const Z = (a, b = 0) => [BigInt(a), BigInt(b)];
const zadd = (x, y) => [x[0] + y[0], x[1] + y[1]];
const zmul = (x, y) => [x[0] * y[0] + 2n * x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
const zf = x => Number(x[0]) + Number(x[1]) * Math.SQRT2;
const mmul = (A, B) => {
  const C = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    let s = Z(0);
    for (let k = 0; k < 3; k++) s = zadd(s, zmul(A[3 * i + k], B[3 * k + j]));
    C.push(s);
  }
  return C;
};
const mvec = (A, v) => [0, 1, 2].map(i => zadd(zadd(zmul(A[3 * i], v[0]), zmul(A[3 * i + 1], v[1])), zmul(A[3 * i + 2], v[2])));
const key = xs => xs.map(x => `${x[0]},${x[1]}`).join(';');
const I3 = [Z(1), Z(0), Z(0), Z(0), Z(1), Z(0), Z(0), Z(0), Z(1)];
const ID = key(I3);
// Cartan entries a_ij (a_ii = 2): m12 = 4, m13 = p, m23 = 2. Reflections act on
// column vectors in root coordinates: r_i changes coordinate i to
// x_i − Σ_j a_ij x_j. T = r1 r2 turns on a dot, H = r2 r3 swaps a road's ends.
function group(p) {
  const a = [[Z(2), Z(-1), Z(-1)], [Z(-2), Z(2), Z(0)], [p === 8 ? Z(-2, -1) : Z(-2), Z(0), Z(2)]];
  const r = [0, 1, 2].map(i => { const M = []; for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) M.push(zadd(Z(k === j ? 1 : 0), k === i ? [-a[i][j][0], -a[i][j][1]] : Z(0))); return M; });
  const T = mmul(r[0], r[1]), H = mmul(r[1], r[2]), t = mmul(T, mmul(T, T));
  const gen = {T, t, H};
  const word = w => [...w].reduce((M, c) => mmul(M, gen[c]), I3);
  // The invariant form (D A with D = diag(4 + 2√2, 2 + √2, 2) for p = 8).
  const d = p === 8 ? [Z(4, 2), Z(2, 1), Z(2)] : [Z(4), Z(2), Z(2)];
  const B = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) B.push(zmul(d[i], a[i][j]));
  // Fixed vectors: a dot (r1, r2), a room (r1, r3) and a road (r2, r3).
  const v = [Z(1), Z(1), Z(1)];
  const c = p === 8 ? [Z(2), Z(2, -1), Z(2, 1)] : [Z(1), Z(0), Z(2)];
  const m = p === 8 ? [Z(2), Z(2), Z(2, 1)] : [Z(1), Z(1), Z(2)];
  return {a, r, T, t, H, gen, word, B, v, c, m};
}
const bform = (G, x, y) => { let s = Z(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s = zadd(s, zmul(x[i], zmul(G.B[3 * i + j], y[j]))); return s; };
const transpose = A => [0, 3, 6, 1, 4, 7, 2, 5, 8].map(k => A[k]);

// --- Octagons: exact walks -----------------------------------------------------
function octModel() {
  const G = group(8), moves = Object.fromEntries(TURNS.map(x => [x, G.word(MOVE[x])]));
  const inv = Object.fromEntries(TURNS.map(x => [x, G.word([...MOVE[x]].reverse().map(c => c === 'T' ? 't' : c === 't' ? 'T' : c).join(''))]));
  const turnOf = {L: G.T, S: I3, R: G.t};
  const vv = zf(bform(G, G.v, G.v));
  const coshRoad = zf(bform(G, G.v, mvec(G.H, G.v))) / vv, road = Math.acosh(coshRoad);
  const dot = M => key(mvec(M, G.v)), room = M => key(mvec(M, G.c)), wall = M => key(mvec(M, G.m));
  const far = M => Math.acosh(Math.max(1, zf(bform(G, G.v, mvec(M, G.v))) / vv)) / road;
  return {G, moves, inv, turnOf, dot, room, wall, far, coshRoad};
}
// Every word of length n over the moves whose product is the identity, found
// by meeting in the middle: all 3^⌈n/2⌉ first halves against all second halves.
function homeWordsOct(O, n) {
  const k1 = Math.ceil(n / 2), k2 = n - k1, first = new Map();
  const words = k => { let ws = ['']; for (let i = 0; i < k; i++) ws = ws.flatMap(w => TURNS.map(x => w + x)); return ws; };
  for (const w of words(k1)) { const K = key([...w].reduce((M, x) => mmul(M, O.moves[x]), I3)); if (!first.has(K)) first.set(K, []); first.get(K).push(w); }
  const out = [];
  for (const w of words(k2)) {
    const back = key([...w].reverse().reduce((M, x) => mmul(M, O.inv[x]), I3));
    for (const u of first.get(back) || []) out.push(u + w);
  }
  return {walks: out, checked: 3 ** n};
}
// The rooms on each side of a closed walk, by flooding from the flowers across
// walls the walk does not use: a flower is inside when its flood stays small.
function insideOct(O, walk, flowers) {
  let M = I3;
  const walls = new Set(), states = [I3];
  for (const x of walk) { const road = mmul(M, O.turnOf[x]); walls.add(O.wall(road)); M = mmul(road, mmul(O.G.H, mmul(O.G.T, O.G.T))); states.push(M); }
  const flood = start => {
    const seen = new Map([[O.room(start), start]]), queue = [start];
    for (let i = 0; i < queue.length; i++) {
      if (seen.size > 200) return null;
      let e = queue[i];
      for (let j = 0; j < 8; j++) {
        if (!walls.has(O.wall(e))) { const across = mmul(e, O.G.H); const k = O.room(across); if (!seen.has(k)) { seen.set(k, across); queue.push(across); } }
        e = mmul(e, mmul(O.G.H, O.G.t));
      }
    }
    return seen;
  };
  const fills = flowers.map(w => flood(O.G.word(w)));
  return {inside: fills.every(Boolean), rooms: fills[0] ? fills[0].size : null};
}
// Every fence of up to `cap` moves, searched walk by walk with no theorem: the
// search drops a walk only when its dot is farther from home (in road lengths)
// than the moves left.
function fenceSearchOct(O, q, cap) {
  const home = O.dot(I3), out = [], walk = [], used = new Set([home]), memo = new Map();
  let nodes = 0;
  const step = (M, K, x) => {
    const mk = `${K}|${x}`;
    if (!memo.has(mk)) { const N = mmul(M, O.moves[x]); memo.set(mk, {N, K: key(N), dot: O.dot(N), far: O.far(N)}); }
    return memo.get(mk);
  };
  const dfs = (M, K, L, R) => {
    nodes++;
    for (const x of TURNS) {
      if (x === 'L' && Number.isInteger(q.maxLeft) && L >= q.maxLeft) continue;
      if (x === 'R' && Number.isInteger(q.maxRight) && R >= q.maxRight) continue;
      const s = step(M, K, x);
      walk.push(x);
      const left = cap - walk.length;
      if (s.dot === home) { if (s.K === ID && insideOct(O, walk.join(''), q.flowers).inside) out.push(walk.join('')); }
      else if (!used.has(s.dot) && left > 0 && s.far <= left + 1e-9) { used.add(s.dot); dfs(s.N, s.K, L + (x === 'L'), R + (x === 'R')); used.delete(s.dot); }
      walk.pop();
    }
  };
  dfs(I3, ID, 0, 0);
  return {walks: out, nodes};
}
// Every fence round a block of at most nMax rooms holding the flowers: list
// the connected blocks, keep those whose outline is one simple loop through
// home, and walk the loop from home both ways, keeping the walk that ends
// facing the way it started.
function blockFencesOct(O, q, nMax) {
  const rooms = new Map(), roomId = new Map();
  const idOf = M => { const k = O.room(M); if (!roomId.has(k)) { roomId.set(k, rooms.size); rooms.set(rooms.size, {M, k, next: null}); } return roomId.get(k); };
  // A room's eight corners (states going round it), walls and neighbours.
  const info = id => {
    const r = rooms.get(id);
    if (!r.next) {
      r.corners = []; r.walls = []; r.ends = []; r.next = [];
      let e = r.M;
      for (let j = 0; j < 8; j++) {
        r.corners.push(e); r.walls.push(O.wall(e)); r.ends.push([O.dot(e), O.dot(mmul(e, O.G.H))]);
        r.next.push(idOf(mmul(e, O.G.H)));
        e = mmul(e, mmul(O.G.H, O.G.t));
      }
    }
    return r;
  };
  const flowers = q.flowers.map(w => idOf(O.G.word(w)));
  let level = new Map([[String(flowers[0]), [flowers[0]]]]);
  const blocks = [];
  for (let n = 1; n <= nMax; n++) {
    for (const set of level.values()) if (flowers.every(f => set.includes(f))) blocks.push(set);
    if (n === nMax) break;
    const next = new Map();
    for (const set of level.values()) for (const id of set) for (const nb of info(id).next) {
      if (set.includes(nb)) continue;
      const s = [...set, nb].sort((x, y) => x - y), k = s.join(',');
      if (!next.has(k)) next.set(k, s);
    }
    level = next;
  }
  const home = O.dot(I3), out = new Set();
  for (const set of blocks) {
    const count = new Map(), wallEnds = new Map();
    for (const id of set) { const r = info(id); r.walls.forEach((w, j) => { count.set(w, (count.get(w) || 0) + 1); wallEnds.set(w, r.ends[j]); }); }
    const outline = [...count].filter(([, c]) => c === 1).map(([w]) => w);
    if (outline.length > FENCE_CAP) continue;
    const at = new Map();
    for (const w of outline) for (const d of wallEnds.get(w)) { if (!at.has(d)) at.set(d, []); at.get(d).push(w); }
    if (![...at.values()].every(ws => ws.length === 2) || !at.has(home)) continue;
    // One loop: follow it from home and see every outline wall.
    for (const firstWall of at.get(home)) {
      let M = I3, d = home, w = firstWall, walk = '', ok = true;
      for (let k = 0; k < outline.length; k++) {
        const [e1, e2] = wallEnds.get(w), to = e1 === d ? e2 : e1;
        const x = TURNS.find(y => O.wall(mmul(M, O.turnOf[y])) === w && O.dot(mmul(M, O.moves[y])) === to);
        if (!x) { ok = false; break; }
        M = mmul(M, O.moves[x]); walk += x; d = to;
        w = at.get(d).find(y => y !== w);
      }
      if (!ok || d !== home || key(M) !== ID || walk.length !== outline.length) continue;
      if (Number.isInteger(q.maxLeft) && lefts(walk) > q.maxLeft) continue;
      if (Number.isInteger(q.maxRight) && rights(walk) > q.maxRight) continue;
      assert.equal(lefts(walk) - rights(walk), 4 + 4 * set.length, `Gauss–Bonnet round ${set.length} rooms: ${walk}`);
      out.add(walk);
    }
  }
  return {walks: [...out], blocks: blocks.length};
}

// --- Squares: whole-number coordinates ---------------------------------------
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const TURN_SQ = {L: 1, S: 0, R: 3};
function sqState(word) {
  let x = 0, y = 0, d = 0;
  for (const c of word) {
    if (c === 'T') d = (d + 1) % 4; else if (c === 't') d = (d + 3) % 4;
    else { x += DIRS[d][0]; y += DIRS[d][1]; d = (d + 2) % 4; }
  }
  return {x, y, d};
}
// The front-left square of a state, named by its centre.
const sqRoom = ({x, y, d}) => [x + (DIRS[d][0] + DIRS[(d + 1) % 4][0]) / 2, y + (DIRS[d][1] + DIRS[(d + 1) % 4][1]) / 2];
function sqWalk(walk) {
  let x = 0, y = 0, d = 0;
  const pts = [[0, 0]];
  for (const m of walk) { d = (d + TURN_SQ[m]) % 4; x += DIRS[d][0]; y += DIRS[d][1]; pts.push([x, y]); }
  return {pts, end: {x, y, d}};
}
// A point is inside a closed polygon when a ray to the right crosses it an
// odd number of times.
function crossings([px, py], pts) {
  let n = 0;
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k - 1], [x2, y2] = pts[k];
    if (x1 === x2 && x1 > px && Math.min(y1, y2) < py && py < Math.max(y1, y2)) n++;
  }
  return n % 2 === 1;
}
function homeWordsSq(n) {
  let ws = [''];
  for (let i = 0; i < n; i++) ws = ws.flatMap(w => TURNS.map(x => w + x));
  return {walks: ws.filter(w => { const e = sqWalk(w).end; return e.x === 0 && e.y === 0 && e.d === 0; }), checked: ws.length};
}
function fenceSearchSq(q) {
  const flowers = q.flowers.map(w => sqRoom(sqState(w))), out = [], walk = [], used = new Set(['0,0']);
  const dfs = (x, y, d, L, R) => {
    for (const m of TURNS) {
      if (m === 'L' && Number.isInteger(q.maxLeft) && L >= q.maxLeft) continue;
      if (m === 'R' && Number.isInteger(q.maxRight) && R >= q.maxRight) continue;
      const e = (d + TURN_SQ[m]) % 4, nx = x + DIRS[e][0], ny = y + DIRS[e][1];
      walk.push(m);
      const left = FENCE_CAP - walk.length;
      if (nx === 0 && ny === 0) {
        if (e === 0) { const w = walk.join(''), {pts} = sqWalk(w); if (flowers.every(f => crossings(f, pts))) out.push(w); }
      } else if (!used.has(`${nx},${ny}`) && Math.abs(nx) + Math.abs(ny) <= left) { used.add(`${nx},${ny}`); dfs(nx, ny, e, L + (m === 'L'), R + (m === 'R')); used.delete(`${nx},${ny}`); }
      walk.pop();
    }
  };
  dfs(0, 0, 0, 0, 0);
  return {walks: out};
}

// --- Play helpers --------------------------------------------------------------
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is allowed`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function followHints(p, a, label, limit = 400) {
  let steps = 0;
  while (!isSolved(p, a.board)) {
    assert.ok(steps++ < limit, `${p.id} ${label}: hints finish`);
    const h = nextHint(p, a);
    // No dead ends: the app would show their text unasked.
    assert.equal(h.type, 'move', `${p.id} ${label}: a hint to follow, never a dead end`);
    assert.ok(typeof h.text === 'string' && h.text.length > 0, `${p.id} ${label}: hint text`);
    a = play(p, a, h.action);
  }
  return steps;
}
const sameSet = (a, b, label) => assert.deepEqual([...a].sort(), [...b].sort(), label);

export async function validateOctagon() {
  const started = performance.now();
  const pack = JSON.parse(await readFile(new URL('../dist/families/octagon/octagon.json', import.meta.url), 'utf8'));
  const {puzzles: all, families} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.ok(families.some(f => f.id === 'octagon'));
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-65')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-65.md')), 'the review card');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  for (const p of pack.puzzles) {
    for (const f of ['id', 'title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance', 'sourceDocument']) assert.ok(typeof p[f] === 'string' && p[f].length, `${p.id}: ${f}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const f of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[f], `${p.id}: parent ${f}`);
    assert.ok(/^A move turns at a dot/.test(p.controls), `${p.id}: How to play opens with what a move is`);
    assert.ok(!/Can’t/.test(p.hints[0]), `${p.id}: the first hint is not about Can’t`);
  }

  // The rewriting system against the matrices.
  const groups = {oct: group(8), sq: group(4)};
  for (const [kind, G] of Object.entries(groups)) {
    for (const R of G.r) assert.equal(key(mmul(transpose(R), mmul(G.B, R))), key(G.B), `${kind}: the form is invariant`);
    for (const rel of ['TTTT', 'HH', 'TH'.repeat(kind === 'oct' ? 8 : 4), 'Tt']) assert.equal(key(G.word(rel)), ID, `${kind}: ${rel} = 1`);
    for (const [l, r] of rulesFor(kind === 'oct' ? 8 : 4)) assert.equal(key(G.word(l)), key(G.word(r)), `${kind}: rule ${l} → ${r} holds`);
    // Every word of up to 8 letters: the normal form names the same element,
    // and one element has one normal form.
    const byElement = new Map();
    let ws = [''], wordsChecked = 0;
    for (let n = 0; n <= 8; n++) {
      for (const w of ws) {
        const nf = reduce(kind, w), K = key(G.word(w));
        assert.equal(key(G.word(nf)), K, `${kind}: ${w} and its normal form ${nf}`);
        if (byElement.has(K)) assert.equal(byElement.get(K), nf, `${kind}: one normal form for ${w}`); else byElement.set(K, nf);
        wordsChecked++;
      }
      ws = ws.flatMap(w => ['T', 't', 'H'].map(c => w + c));
    }
    assert.equal(wordsChecked, (3 ** 9 - 1) / 2);
  }

  const O = octModel();
  // The drawing's road length agrees with the exact model's.
  assert.ok(Math.abs(O.coshRoad - Math.cosh(EDGE)) < 1e-9, 'the drawn road length is the true one');
  const report = {puzzles: puzzles.length, home: {}, fences: {}, hints: 0, randomTaps: {}};
  // The counts of walks home that the grown-up notes quote (Puzzles 4, 7 and
  // 10): none at 10 or 12, then 50, 144 and 620 at 16, 18 and 20.
  const quoted = {10: 0, 12: 0, 16: 50, 18: 144, 20: 620};
  for (const [n, count] of Object.entries(quoted)) assert.equal(homeWordsOct(O, Number(n)).walks.length, count, `walks home of ${n} moves on octagons`);
  report.home.quoted = Object.entries(quoted).map(([n, c]) => `${n}: ${c}`).join(', ');
  for (const p of puzzles) {
    const q = p.parameters;
    for (const [i, spec] of q.floors.entries()) {
      const label = `${p.id} ${spec.kind}`;
      let found;
      if (q.mode === 'home') {
        found = spec.kind === 'oct' ? homeWordsOct(O, q.moves) : homeWordsSq(q.moves);
        report.home[label] = `${found.walks.length} of ${found.checked}`;
      } else if (spec.kind === 'sq') {
        found = fenceSearchSq(q);
        report.fences[label] = `${found.walks.length} (every walk)`;
      } else if (!spec.solutions.length) {
        found = fenceSearchOct(O, q, FENCE_CAP);
        report.fences[label] = `0 (every walk of up to ${FENCE_CAP} moves: ${found.nodes} searched)`;
      } else {
        // Every fence ends on the road into home, heading the way the robot
        // started: the road walked by the state 'TTH' (at the dot behind
        // home, facing it), whose room on its left is the room of 'T'. That
        // room is a flower, so every fence goes round anticlockwise (fenced
        // rooms on its left); round n rooms left − right = 4 + 4n, and a
        // fence keeping to the budget goes round at most nMax rooms.
        assert.equal(O.room(O.G.word('TTH')), O.room(O.G.word('T')), `${label}: the room left of the road into home`);
        assert.ok(q.flowers.some(w => O.room(O.G.word(w)) === O.room(O.G.word('T'))), `${label}: the room left of the road into home is a flower`);
        const nMax = Math.floor(((Number.isInteger(q.maxLeft) ? q.maxLeft : FENCE_CAP) - 4) / 4);
        found = blockFencesOct(O, q, nMax);
        report.fences[label] = `${found.walks.length} (${found.blocks} blocks of up to ${nMax} rooms)`;
        for (const w of found.walks) assert.ok(insideOct(O, w, q.flowers).inside, `${label}: ${w} has the flowers inside`);
      }
      sameSet(found.walks, spec.solutions, `${label}: every walk that works, and no other`);
      assert.equal(p.solution.floors[i].count, spec.solutions.length, `${label}: solution count`);
      if (q.mode === 'fence' && Number.isInteger(q.maxLeft) && spec.solutions.length) assert.ok(q.maxLeft > Math.min(...spec.solutions.map(lefts)), `${label}: the budget is not the fewest`);
      // Witnesses play through the interface's moves.
      for (const w of spec.solutions.slice(0, 3)) {
        let a = freshAttempt(p);
        for (const x of w) a = play(p, a, {type: 'go', floor: i, turn: x});
        assert.ok(goalMet(spec.kind, q, a.board.floors[i].walk), `${label}: ${w} reaches the goal when played`);
        if (q.floors.length === 1) assert.ok(isSolved(p, a.board), `${label}: ${w} solves`);
        refuse(p, a, {type: 'go', floor: i, turn: 'S'}, 'a move on a finished floor');
      }
    }
    // Hints: fresh, after a wrong move, after a refused claim, after a wrong tap.
    report.hints += followHints(p, freshAttempt(p), 'fresh');
    const h0 = nextHint(p, freshAttempt(p)), other = TURNS.find(x => x !== h0.action.turn && mechanicFor(p).move(p, freshAttempt(p).board, {type: 'go', floor: h0.floor, turn: x}));
    report.hints += followHints(p, play(p, freshAttempt(p), {type: 'go', floor: h0.floor, turn: other}), 'after a wrong move');
    for (const [i, spec] of q.floors.entries()) {
      // Finish a try that fails, then claim.
      let a = freshAttempt(p);
      const kind = spec.kind, tap = q.mode === 'fence' ? 'road' : q.moves % 2 ? null : 'dot';
      const tryWalk = spec.solutions.length ? null : spec.attempt;
      if (tryWalk === null) {
        // A floor with an answer: a finished try that fails, then Can't.
        const n = q.mode === 'home' ? q.moves : FENCE_CAP;
        const fail = ['S'.repeat(n), 'L' + 'S'.repeat(n - 1)].find(w => !spec.solutions.includes(w));
        for (const x of fail) a = play(p, a, {type: 'go', floor: i, turn: x});
        const claim = {type: 'claim', floor: i, ...(tap ? {cert: ''} : {})};
        a = play(p, a, claim);
        assert.equal(a.board.floors[i].told, 'way', `${p.id} ${kind}: There is a way.`);
        refuse(p, a, claim, 'a second claim before the walk changes');
        report.hints += followHints(p, a, 'after a refused claim');
      } else {
        for (const x of tryWalk) a = play(p, a, {type: 'go', floor: i, turn: x});
        const targets = tap ? claimTargets(p, a, i) : [''];
        const right = targets.filter(c => mechanicFor(p).move(p, a.board, {type: 'claim', floor: i, ...(tap ? {cert: c} : {})})?.floors[i].cert !== null);
        report.randomTaps[`${p.id} ${kind}`] = !tap ? 'nothing to tap; the colouring is drawn' : `${right.length} of ${targets.length} targets in the first view${right.length ? '' : ' (the dot is reached by dragging the floor)'}`;
        if (tap) assert.ok(right.length <= 1 && right.length / targets.length <= 1 / 8, `${p.id} ${kind}: a random tap rarely makes the certificate`);
        if (tap) {
          const rightCert = right[0] ?? (tap === 'dot' ? halfwayState(kind, a.board.floors[i].walk) : reduce(kind, q.wall));
          assert.notEqual(mechanicFor(p).move(p, a.board, {type: 'claim', floor: i, cert: rightCert}).floors[i].cert, null, `${p.id} ${kind}: the right tap is accepted`);
          const wrong = targets.find(c => !right.includes(c));
          a = play(p, a, {type: 'claim', floor: i, cert: wrong});
          assert.equal(a.board.floors[i].told, 'miss', `${p.id} ${kind}: a wrong tap is refused`);
          refuse(p, a, {type: 'claim', floor: i, cert: rightCert}, 'the right tap before the walk changes');
          report.hints += followHints(p, a, 'after a wrong tap');
        }
      }
    }
    // Illegal moves and forged saves.
    const a0 = freshAttempt(p), m = mechanicFor(p);
    refuse(p, a0, {type: 'go', floor: 0, turn: 'U'}, 'a turn round');
    refuse(p, a0, {type: 'go', floor: q.floors.length, turn: 'L'}, 'a floor that is not there');
    refuse(p, a0, {type: 'claim', floor: 0, cert: ''}, 'Can’t before a try');
    refuse(p, a0, {type: 'claim', floor: 0}, 'Can’t before a try');
    refuse(p, a0, {type: 'back', floor: 0}, 'taking back a move that was not made');
    const blank = {walk: '', told: null, cert: null}, floorsWith = (i, f) => ({floors: q.floors.map((_, j) => j === i ? f : blank)});
    for (const [i, spec] of q.floors.entries()) {
      const bad = [
        [{walk: 'LX', told: null, cert: null}, 'a letter that is not a move'],
        [{walk: 'L'.repeat(q.mode === 'home' ? q.moves + 1 : FENCE_CAP + 1), told: null, cert: null}, 'too many moves'],
        [{walk: '', told: 'miss', cert: null, extra: 1}, 'an extra field'],
        [{walk: '', told: 'maybe', cert: null}, 'an unknown refusal'],
        [{walk: '', told: null, cert: ''}, 'a certificate before a try']
      ];
      if (spec.solutions.length) {
        bad.push([{walk: spec.solutions[0].slice(0, -1), told: 'miss', cert: null}, 'a wrong tap on a floor with an answer']);
        bad.push([{walk: spec.solutions[0], told: null, cert: ''}, 'a certificate where there is a way']);
        bad.push([{walk: spec.solutions[0], told: 'way', cert: null}, 'a refusal on a solved floor']);
      } else {
        const w = spec.attempt, tap = q.mode === 'fence' ? 'road' : q.moves % 2 ? null : 'dot';
        bad.push([{walk: w, told: 'way', cert: null}, '“There is a way” where there is none']);
        if (tap) bad.push([{walk: w, told: null, cert: tap === 'dot' ? w.length > 2 ? reduce(spec.kind, '') : 'H' : 'H'}, 'a forged certificate']);
        bad.push([{walk: w.slice(0, -1), told: null, cert: tap ? reduce(spec.kind, q.wall || '') : ''}, 'a certificate before the try is finished']);
      }
      if (q.mode === 'fence') bad.push([{walk: 'LLLLLLLLL', told: null, cert: null}, 'a fence that uses a dot twice']);
      for (const [f, why] of bad) assert.equal(validBoard(p, floorsWith(i, f)), false, `${p.id} ${spec.kind}: rejects ${why}`);
    }
    assert.equal(validBoard(p, {floors: q.floors.map(() => blank), done: true}), false, `${p.id}: rejects a forged done`);
    assert.equal(validBoard(p, {floors: q.floors.slice(1).map(() => blank)}), false, `${p.id}: rejects a missing floor`);
    assert.equal(m.noHint(p), false);
  }

  // The playground.
  const pg = pack.puzzles.find(p => p.band === 'playground');
  assert.equal(mechanicFor(pg).noHint(pg), true, 'playground: no Hint');
  let a = freshAttempt(pg);
  for (const x of 'LLLLLLLL') a = play(pg, a, {type: 'go', floor: 1, turn: x});
  for (const x of 'LLLL') a = play(pg, a, {type: 'go', floor: 0, turn: x});
  assert.deepEqual(a.board.walks, ['LLLL', 'LLLLLLLL']);
  assert.equal(isSolved(pg, a.board), false, 'playground: never solved');
  a = play(pg, a, {type: 'clear', floor: 0});
  assert.deepEqual(a.board.walks, ['', 'LLLLLLLL']);
  refuse(pg, a, {type: 'clear', floor: 0}, 'clearing an empty floor');
  refuse(pg, a, {type: 'claim', floor: 1}, 'Can’t in the playground');
  assert.equal(validBoard(pg, {walks: ['L'.repeat(PLAY_CAP + 1), '']}), false, 'playground: rejects a walk past the cap');
  report.ms = Math.round(performance.now() - started);
  return report;
}
export default validateOctagon;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateOctagon(), null, 2));
