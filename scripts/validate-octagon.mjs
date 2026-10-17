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
// - Claims are judged tap first, by the dot (or dots) these models name: a
//   wrong tap reads the same on every floor, with an answer or not; only the
//   right tap says There is a way or shows the certificate; a refusal stands
//   until a different walk is finished, through Undo and Restart.
// - Hints alone solve every puzzle from a fresh start, after a wrong move,
//   after a wrong tap and after a refusal kept through Restart, never as a
//   dead end (whose text the app shows unasked); a random tap
//   rarely makes a certificate; illegal moves and forged saves are refused.
// Run: node scripts/validate-octagon.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {reduce, rulesFor, MOVE, TURNS, FENCE_CAP, PLAY_CAP, EDGE, claimTargets, goalMet, halfwayState, evenDots, dotKey, lefts, rights} from '../dist/families/octagon/octagon.js';
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
// The dot after each move of a walk, from home: matrices or coordinates.
const dotsOfWalk = (O, kind, walk) => {
  if (kind === 'sq') return sqWalk(walk).pts.map(([x, y]) => `${x},${y}`);
  let M = I3;
  const out = [O.dot(M)];
  for (const x of walk) { M = mmul(M, O.moves[x]); out.push(O.dot(M)); }
  return out;
};
// The dot of a word in T, t and H (a dot key the mechanic saves).
const dotOfWord = (O, kind, word) => kind === 'oct' ? O.dot(O.G.word(word)) : (({x, y}) => `${x},${y}`)(sqState(word));
const binomial = (n, k) => { let r = 1; for (let j = 1; j <= k; j++) r = r * (n - k + j) / j; return Math.round(r); };
// The refusal the page shows for an attempt, as text.
function refusalText(p, a) {
  mechanicFor(p).reset(p);
  const html = mechanicFor(p).render(p, a), found = [...html.matchAll(/<p class="oc-told">([^<]*)<\/p>/g)].map(x => x[1]);
  mechanicFor(p).reset(p);
  assert.equal(found.length, 1, `${p.id}: one refusal shown`);
  return found[0];
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
    // Hints: fresh and after a wrong move.
    report.hints += followHints(p, freshAttempt(p), 'fresh');
    const h0 = nextHint(p, freshAttempt(p)), other = TURNS.find(x => x !== h0.action.turn && mechanicFor(p).move(p, freshAttempt(p).board, {type: 'go', floor: h0.floor, turn: x}));
    report.hints += followHints(p, play(p, freshAttempt(p), {type: 'go', floor: h0.floor, turn: other}), 'after a wrong move');
    // Claims on each floor after a finished try that fails, judged tap first:
    // which dot (or dots) is right is computed here from the matrices or the
    // integer walk, not by the mechanic. A wrong tap gets the same refusal on
    // every floor, with an answer or not; the right one shows the certificate,
    // or says there is a way; a refusal stands until a different walk is
    // finished, through Undo-like steps and Restart.
    const tap = q.mode === 'home' ? (q.moves % 2 ? 'dots' : 'dot') : null, wrongText = new Set();
    for (const [i, spec] of q.floors.entries()) {
      const kind = spec.kind, label = `${p.id} ${kind}`, n = q.mode === 'home' ? q.moves : FENCE_CAP;
      const tryWalk = spec.solutions.length ? 'S'.repeat(n) : spec.attempt;
      let a = freshAttempt(p);
      for (const x of tryWalk) a = play(p, a, {type: 'go', floor: i, turn: x});
      const w = a.board.floors[i].walk, seen = dotsOfWalk(O, kind, w), targets = tap ? claimTargets(p, a, i) : [];
      const claimWith = cert => ({type: 'claim', floor: i, ...(tap ? {cert} : {})});
      let right;
      if (tap === 'dot') {
        right = targets.filter(c => dotOfWord(O, kind, c) === seen[n / 2]);
        assert.ok(right.length <= 1, `${label}: one target is the dot after half the moves`);
        right = right[0] ?? dotKey(kind, halfwayState(kind, w));
        assert.equal(dotOfWord(O, kind, right), seen[n / 2]);
        for (const c of targets) assert.equal(mechanicFor(p).move(p, a.board, claimWith(c)).floors[i].told?.say === 'miss', c !== right, `${label}: target ${c} judged as the exact model says`);
        report.randomTaps[label] = `${targets.includes(right) ? 1 : 0} of ${targets.length} targets in the first view${targets.includes(right) ? '' : ' (the dot comes within reach by dragging the floor)'}`;
        assert.ok(1 / targets.length <= 1 / 8, `${label}: a random tap rarely makes the certificate`);
      } else if (tap === 'dots') {
        const want = new Set(seen.filter((d, k) => k % 2 === 0 && k > 0 && d !== seen[0]));
        right = evenDots(kind, w);
        assert.deepEqual(new Set(right.map(c => dotOfWord(O, kind, c))), want, `${label}: the walk’s dots of home’s colour`);
        assert.equal(right.length, want.size);
        const inView = right.filter(c => targets.includes(c)).length, ways = binomial(targets.length, right.length);
        report.randomTaps[label] = `${right.length} dots to tap; ${inView === right.length ? `1 random choice in ${ways}` : `${inView} of them in the first view`}`;
        assert.ok(ways >= 8, `${label}: a random choice of dots rarely makes the certificate`);
      }
      if (tap) {
        const wrong = tap === 'dot' ? targets.find(c => c !== right) : [targets.find(c => !right.includes(c)), ...right.slice(1)];
        const missed = play(p, a, claimWith(wrong));
        assert.deepEqual(missed.board.floors[i].told, {say: 'miss', walk: w}, `${label}: a wrong tap is refused`);
        wrongText.add(refusalText(p, missed));
        refuse(p, missed, claimWith(right), 'the right tap while the refusal stands');
        if (tap === 'dots') {
          for (const odd of [right.slice(1), [...right, targets.find(c => !right.includes(c))]]) if (odd.length) assert.equal(mechanicFor(p).move(p, a.board, claimWith(odd)).floors[i].told?.say, 'miss', `${label}: too few or too many dots are refused`);
        }
        let again = play(p, missed, {type: 'back', floor: i});
        again = play(p, again, {type: 'go', floor: i, turn: w.at(-1)});
        assert.deepEqual(again.board.floors[i].told, {say: 'miss', walk: w}, `${label}: the same walk again keeps the refusal`);
        refuse(p, again, claimWith(right), 'Can’t on the same walk again');
        const changed = play(p, play(p, missed, {type: 'back', floor: i}), {type: 'go', floor: i, turn: TURNS.find(x => x !== w.at(-1))});
        assert.equal(changed.board.floors[i].told, null, `${label}: a different finished walk ends the refusal`);
        const restarted = mechanicFor(p).carryOnRestart(p, missed.board, mechanicFor(p).fresh(p));
        assert.deepEqual(restarted.floors[i], {walk: '', told: {say: 'miss', walk: w}, cert: null}, `${label}: Restart keeps the refusal`);
        assert.ok(validBoard(p, restarted), `${label}: a kept refusal is a valid board`);
        report.hints += followHints(p, missed, 'after a wrong tap');
        report.hints += followHints(p, {...freshAttempt(p), board: restarted}, 'after Restart with a refusal');
      }
      const judged = play(p, a, claimWith(right));
      if (spec.solutions.length) {
        assert.deepEqual(judged.board.floors[i].told, {say: 'way', walk: w}, `${label}: There is a way, after the right tap only`);
        refuse(p, judged, claimWith(right), 'a second claim on the same walk');
        report.hints += followHints(p, judged, 'after There is a way');
      } else {
        assert.deepEqual(judged.board.floors[i].cert, tap === null ? '' : right, `${label}: the right claim shows the certificate`);
        assert.equal(judged.board.floors[i].told, null);
        assert.ok(validBoard(p, judged.board));
      }
    }
    if (tap) assert.equal(wrongText.size, 1, `${p.id}: a wrong tap reads the same on every floor (${[...wrongText].join(' / ')})`);
    // Illegal moves and forged saves.
    const a0 = freshAttempt(p), m = mechanicFor(p);
    refuse(p, a0, {type: 'go', floor: 0, turn: 'U'}, 'a turn round');
    refuse(p, a0, {type: 'go', floor: q.floors.length, turn: 'L'}, 'a floor that is not there');
    refuse(p, a0, {type: 'claim', floor: 0, cert: ''}, 'Can’t before a try');
    refuse(p, a0, {type: 'claim', floor: 0}, 'Can’t before a try');
    refuse(p, a0, {type: 'back', floor: 0}, 'taking back a move that was not made');
    const blank = {walk: '', told: null, cert: null}, floorsWith = (i, f) => ({floors: q.floors.map((_, j) => j === i ? f : blank)});
    for (const [i, spec] of q.floors.entries()) {
      const kind = spec.kind, n = q.mode === 'home' ? q.moves : FENCE_CAP, fail = spec.solutions.length ? 'S'.repeat(n) : spec.attempt;
      const say = tap ? 'miss' : 'way', standing = tap || spec.solutions.length;
      const bad = [
        [{walk: 'LX', told: null, cert: null}, 'a letter that is not a move'],
        [{walk: 'L'.repeat(n + 1), told: null, cert: null}, 'too many moves'],
        [{walk: '', told: null, cert: null, extra: 1}, 'an extra field'],
        [{walk: fail, told: say, cert: null}, 'a refusal not keyed to a walk'],
        [{walk: fail, told: {say: 'maybe', walk: fail}, cert: null}, 'an unknown refusal'],
        [{walk: fail, told: {say, walk: fail, extra: 1}, cert: null}, 'a refusal with an extra field'],
        [{walk: '', told: {say, walk: fail.slice(0, -1)}, cert: null}, 'a refusal about an unfinished walk'],
        [{walk: '', told: null, cert: tap === 'dots' ? [] : tap === 'dot' ? 'H' : ''}, 'a certificate before a try']
      ];
      if (standing) for (const walk of [fail, fail.slice(0, -1), '']) assert.ok(validBoard(p, floorsWith(i, {walk, told: {say, walk: fail}, cert: null})), `${p.id} ${kind}: a standing refusal with the walk ${walk || 'empty'}`);
      if (q.mode === 'home') bad.push([{walk: fail.slice(0, -1) + TURNS.find(x => x !== fail.at(-1)), told: {say, walk: fail}, cert: null}, 'a refusal kept past a different finished walk']);
      if (spec.solutions.length) {
        bad.push([{walk: spec.solutions[0], told: null, cert: tap === 'dots' ? [] : tap === 'dot' ? dotKey(kind, '') : ''}, 'a certificate where there is a way']);
        bad.push([{walk: spec.solutions[0], told: {say: 'way', walk: spec.solutions[0]}, cert: null}, 'a refusal about a walk that reaches the goal']);
        if (!tap) bad.push([{walk: fail, told: {say: 'miss', walk: fail}, cert: null}, '“Not that” where nothing is tapped']);
      } else {
        bad.push([{walk: fail, told: {say: 'way', walk: fail}, cert: null}, '“There is a way” where there is none']);
        const right = tap === 'dot' ? dotKey(kind, halfwayState(kind, fail)) : tap === 'dots' ? evenDots(kind, fail) : '';
        if (tap === 'dot') {
          bad.push([{walk: fail, told: null, cert: dotKey(kind, '')}, 'a forged certificate']);
          const loose = ['T', 'TT', 't'].map(x => reduce(kind, right + x)).find(x => x !== right);
          bad.push([{walk: fail, told: null, cert: loose}, 'a certificate not saved as its dot key']);
        }
        if (tap === 'dots') {
          bad.push([{walk: fail, told: null, cert: right.slice(1)}, 'a certificate missing a dot']);
          bad.push([{walk: fail, told: null, cert: [...right].reverse().concat(right.length > 1 ? [] : [right[0]])}, 'dots out of order or twice']);
        }
        bad.push([{walk: fail.slice(0, -1), told: null, cert: right}, 'a certificate before the try is finished']);
        bad.push([{walk: fail, told: {say: 'miss', walk: fail}, cert: right}, 'a certificate with a refusal']);
        assert.ok(validBoard(p, floorsWith(i, {walk: fail, told: null, cert: right})), `${p.id} ${kind}: the right certificate is a valid board`);
      }
      if (q.mode === 'fence') bad.push([{walk: 'LLLLLLLLL', told: null, cert: null}, 'a fence that uses a dot twice']);
      for (const [f, why] of bad) assert.equal(validBoard(p, floorsWith(i, f)), false, `${p.id} ${kind}: rejects ${why}`);
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
