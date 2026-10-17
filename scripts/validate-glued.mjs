// Checks the Glued squares pack (dist/families/glued/glued.json): content
// fields and sources; every answer recomputed by methods unlike the
// mechanic's (a trip simulated by its cutting sequence, the times at which
// it crosses vertical and horizontal lines, with exact fractions, instead of
// the board's piece-by-piece shots; every gluing enumerated, partial ones
// included; corner points by a union of matched corners and an Euler
// count); Problem 9's bound over every gluing; witnesses played as moves;
// hint chains from fresh, after a wrong move, after a wrong Can't or That's
// all and after Undo; illegal moves; forged saves; the playground's trips.
// Run: node scripts/validate-glued.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {tripOf, playS, playStart} from '../dist/families/glued/glued.js';
import {loadPack} from './packs.mjs';

// --- Fractions ---------------------------------------------------------------------
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; };
const fr = (n, d = 1) => { const g = gcd(n, d) * Math.sign(d); return [n / g, d / g]; };
const add = (a, b) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const sub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
const div = (a, k) => fr(a[0], a[1] * k);
const cmp = (a, b) => Math.sign(a[0] * b[1] - b[0] * a[1]);

// --- An independent trip ---------------------------------------------------------------
// One block of direction (p, q) from the spot (x, y) of a square (square
// units, 0 < x, y < 1) crosses the vertical lines x + p t = 1, 2, ... and the
// horizontal lines y + q t = 1, 2, ... for 0 < t < 1. Its cutting sequence
// is those crossings in time order: 'r' for a right side, 'u' for a top. Two
// crossings at one time are a corner.
function cutting([x, y], [p, q]) {
  const events = [];
  for (let k = 1; k <= p; k++) events.push({t: div(sub(fr(k), x), p), c: 'r'});
  for (let k = 1; k <= q; k++) events.push({t: div(sub(fr(k), y), q), c: 'u'});
  events.sort((a, b) => cmp(a.t, b.t));
  for (let k = 1; k < events.length; k++) if (cmp(events[k - 1].t, events[k].t) === 0) return {corner: true, word: events.slice(0, k - 1).map(e => e.c)};
  return {corner: false, word: events.map(e => e.c)};
}
// The trip from square s, block by block: {home, stop, squares}. A side
// glued to nothing stops it ('wall'), so does a corner; it is home when a
// block ends in s.
function simTrip(gluing, s, spot, dir, maxBlocks) {
  const {corner, word} = cutting(spot, dir), squares = [];
  let at = s;
  for (let k = 1; k <= maxBlocks; k++) {
    for (const c of word) { at = (c === 'r' ? gluing.right : gluing.up)[at]; if (at === null || at === undefined) return {home: null, stop: 'wall', squares}; }
    if (corner) return {home: null, stop: 'corner', squares};
    squares.push(at);
    if (at === s) return {home: k, stop: 'home', squares};
  }
  return {home: null, stop: 'limit', squares};
}
const spotOf = q => q.spot.map(([n, d]) => fr(n, d));

// Every injective partial map from the squares to the squares (null for a
// side glued to nothing), and the full ones.
function partials(list) {
  const out = [];
  const go = (k, map, used) => {
    if (k === list.length) { out.push({...map}); return; }
    for (const t of [null, ...list]) {
      if (t !== null && used.has(t)) continue;
      map[list[k]] = t; if (t !== null) used.add(t);
      go(k + 1, map, used);
      if (t !== null) used.delete(t);
    }
  };
  go(0, {}, new Set());
  return out;
}
const full = maps => maps.filter(m => Object.values(m).every(v => v !== null));

// --- Independent corners ---------------------------------------------------------------
// Corners "s:cxcy"; a right side joins (s, 1, cy) to (r(s), 0, cy), a top
// joins (s, cx, 1) to (u(s), cx, 0). The points are the unions.
function cornerPoints(q) {
  const list = Object.keys(q.squares), parent = new Map();
  const key = (s, cx, cy) => `${s}:${cx}${cy}`;
  for (const s of list) for (const c of ['00', '01', '10', '11']) parent.set(`${s}:${c}`, `${s}:${c}`);
  const find = k => parent.get(k) === k ? k : find(parent.get(k));
  const join = (a, b) => parent.set(find(a), find(b));
  const pairs = [];
  for (const s of list) for (const c of [0, 1]) {
    if (q.right[s]) { join(key(s, 1, c), key(q.right[s], 0, c)); pairs.push([key(s, 1, c), key(q.right[s], 0, c)]); }
    if (q.up[s]) { join(key(s, c, 1), key(q.up[s], c, 0)); pairs.push([key(s, c, 1), key(q.up[s], c, 0)]); }
  }
  const groups = new Map();
  for (const k of parent.keys()) { const r = find(k); groups.set(r, [...(groups.get(r) || []), k]); }
  return {points: [...groups.values()], pairs};
}

// --- The answers ------------------------------------------------------------------------
// Glue puzzles: how many full gluings work, of how many; Can't puzzles: the
// longest first return. Corner puzzles: the sizes of the points.
const TABLE = {
  'glued-01': {mode: 'glue', works: 2, of: 6},
  'glued-02': {mode: 'glue', works: 1, of: 6, way: true},
  'glued-03': {mode: 'corners', points: [4, 4]},
  'glued-04': {mode: 'glue', works: 12, of: 36},
  'glued-05': {mode: 'glue', works: 6, of: 36, way: true},
  'glued-06': {mode: 'corners', points: [12]},
  'glued-07': {mode: 'glue', works: 0, of: 36, cant: true, longestWays: 12},
  'glued-08': {mode: 'glue', works: 144, of: 576},
  'glued-09': {mode: 'glue', works: 2, of: 36, way: true},
  'glued-10': {mode: 'corners', points: [8, 8]},
  'glued-11': {mode: 'glue', works: 0, of: 576, cant: true, longestWays: 144}
};
// The worksheet's L: right sides A↔B with C to itself, tops A↔C with B to itself.
const L = {right: {A: 'B', B: 'A', C: 'C'}, up: {A: 'C', B: 'B', C: 'A'}};

const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const refused = (p, a, action, label) => assert.equal(move(p, a, action), null, `${p.id}: ${label}`);
// One Undo step as the app takes it: the mechanic's carry keeps a refused claim.
const undoCarry = (p, a) => { const next = undo(a); return next === a ? a : {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
// Follow the hints, applying each, until the puzzle is solved.
function hintsSolve(p, a, label) {
  let steps = 0, sawReason = false;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: a move hint`);
    assert.ok(typeof h.text === 'string' && h.text.length > 8, `${p.id} ${label}: hint words`);
    if (h.action.type === 'cant') {
      assert.ok(/every dot/.test(h.text) && /twice/.test(h.text), `${p.id} ${label}: the reason comes with Can’t`);
      // The claim is hinted only once the longest trip is built, with its
      // landings in order.
      const n = Object.keys(p.parameters.squares).length, t = simTrip(a.board, p.parameters.trips[0].from, spotOf(p.parameters), p.parameters.trips[0].dir, n + 1);
      assert.equal(t.home, n, `${p.id} ${label}: Can’t after the longest trip`);
      assert.deepEqual(h.action.dots, t.squares, `${p.id} ${label}: the dots in the order the trip lands`);
      sawReason = true;
    }
    a = play(p, a, h.action);
    assert.ok(++steps < 60, `${p.id} ${label}: hints finish`);
  }
  if (p.parameters.mode === 'glue' && TABLE[p.id].cant) assert.ok(sawReason, `${p.id} ${label}: the chain ends with the claim`);
  return steps;
}

function checkGlue(p, fresh, row) {
  const q = p.parameters, list = Object.keys(q.squares), n = list.length, spot = spotOf(q);
  // No dot starts a trip into a corner.
  for (const g of q.trips) assert.equal(cutting(spot, g.dir).corner, false, `${p.id}: the trips miss the corners`);
  const all = partials(list), fulls = full(all);
  const options = kind => q.sides.includes(kind) ? all : [q.start[kind]];
  const fullOptions = kind => q.sides.includes(kind) ? fulls : [q.start[kind]];
  const meets = gl => q.trips.every(g => simTrip(gl, g.from, spot, g.dir, n + 1).home === g.blocks);
  // Full gluings that work.
  let works = 0, of = 0, witness = null;
  for (const right of fullOptions('right')) for (const up of fullOptions('up')) {
    of++;
    if (meets({right, up})) { works++; witness ||= {right, up}; }
  }
  assert.equal(of, row.of, `${p.id}: full gluings`);
  assert.equal(works, row.works, `${p.id}: gluings that work`);
  // Every gluing, partial ones too: the bound (Problem 9), and the mechanic
  // agrees with the simulator on whether the goal is met. Four squares give
  // 43,681 gluings; every 13th is checked against the mechanic.
  let checked = 0, anyPartial = false;
  const step = n === 4 ? 13 : 1;
  let k = 0;
  for (const right of options('right')) for (const up of options('up')) {
    const gl = {right, up};
    for (const g of q.trips) {
      const t = simTrip(gl, g.from, spot, g.dir, n + 3);
      assert.ok(t.home === null || t.home <= n, `${p.id}: a first return within ${n} blocks`);
      assert.notEqual(t.stop, 'limit', `${p.id}: every trip ends at home or a wall`);
    }
    if (meets(gl)) anyPartial = true;
    if (k++ % step) continue;
    assert.equal(isSolved(p, {...fresh.board, right, up}), meets(gl), `${p.id}: the mechanic agrees on ${JSON.stringify(gl)}`);
    checked++;
  }
  assert.equal(anyPartial, row.works > 0, `${p.id}: possible exactly when a full gluing works`);
  assert.equal(p.solution.cant === true, Boolean(row.cant), `${p.id}: solution says Can’t`);
  if (row.cant) {
    // The goal is past the bound, and the longest trip reaches it.
    assert.ok(q.trips.length === 1 && q.trips[0].blocks > n, `${p.id}: the goal passes the number of dots`);
    assert.equal(p.solution.dots, n);
    let longest = 0;
    for (const right of fullOptions('right')) for (const up of fullOptions('up')) longest = Math.max(longest, simTrip({right, up}, q.trips[0].from, spot, q.trips[0].dir, n + 1).home || 0);
    assert.equal(longest, n, `${p.id}: the longest first return is ${n}`);
    // The claim needs an attempt, then the first trip on the child's own
    // board landing on every dot and coming home, its dots tapped in the
    // order it lands on them. Anything less gets the refusal every puzzle
    // gives ('taps'), and Can't stays open.
    refused(p, fresh, {type: 'cant', dots: list}, 'Can’t before any gluing');
    const g0 = q.trips[0], tried = play(p, fresh, {type: 'glue', side: 'right', from: list[0], to: list[1]});
    refused(p, tried, {type: 'cant', dots: list.slice(1)}, 'Can’t without every dot');
    refused(p, tried, {type: 'cant', dots: [...list, list[0]]}, 'Can’t with a dot twice');
    refused(p, tried, {type: 'cant', dots: [list[0], ...list.slice(0, -1)]}, 'Can’t with a dot twice and one missing');
    const bare = play(p, tried, {type: 'cant', dots: [...list].reverse()});
    assert.equal(bare.board.told, 'taps', `${p.id}: Can’t without the longest trip is refused`);
    assert.ok(!isSolved(p, bare.board) && !bare.board.claimed);
    // Every longest trip, partial gluings included: its landings in order
    // claim; any other order is refused and leaves Can't open.
    let certificates = 0;
    for (const right of options('right')) for (const up of options('up')) {
      const t = simTrip({right, up}, g0.from, spot, g0.dir, n + 1);
      if (t.home !== n) continue;
      certificates++;
      const a = {...tried, board: {...tried.board, right, up, told: null}};
      const swapped = [t.squares[1], t.squares[0], ...t.squares.slice(2)];
      const wrongOrder = play(p, a, {type: 'cant', dots: swapped});
      assert.equal(wrongOrder.board.told, 'taps', `${p.id}: the landings out of order are refused`);
      const claimed = play(p, wrongOrder, {type: 'cant', dots: t.squares});
      assert.ok(isSolved(p, claimed.board) && claimed.board.claimed, `${p.id}: Can’t with the trip’s landings is right`);
      if (certificates === 1) {
        refused(p, claimed, {type: 'glue', side: 'up', from: list[0], to: list[0]}, 'no move after the claim');
        assert.equal(validBoard(p, {...tried.board, claimed: true}), false, `${p.id}: a claim without the longest trip is forged`);
      }
    }
    assert.ok(certificates >= row.longestWays, `${p.id}: every longest trip certifies`);
  } else {
    // The pack's witness and the found one, played side by side as moves.
    for (const w of [p.solution.gluing, witness]) {
      let a = fresh;
      for (const kind of q.sides) for (const s of list) if (w[kind][s] !== null && a.board[kind][s] !== w[kind][s]) a = play(p, a, {type: 'glue', side: kind, from: s, to: w[kind][s]});
      assert.ok(isSolved(p, a.board), `${p.id}: the gluing ${JSON.stringify(w)} solves`);
    }
    // Can't without the longest trip: the same refusal as on a puzzle that
    // can't be done, and Can't stays open.
    const g0 = q.trips[0], tried = play(p, fresh, {type: 'glue', side: q.sides[0], from: list[0], to: list[0]});
    const bare = play(p, tried, {type: 'cant', dots: list});
    assert.equal(bare.board.told, 'taps', `${p.id}: Can’t without the longest trip is refused as on every puzzle`);
    assert.ok(!isSolved(p, bare.board));
    hintsSolve(p, bare, 'after a bare Can’t');
    // A whole certificate, the first trip's landings in order, on a gluing
    // that doesn't meet the goal: "There is a way.", kept through Undo until
    // a new gluing. A longest trip that meets the goal has already solved it.
    let way = null;
    for (const right of fullOptions('right')) for (const up of fullOptions('up')) {
      const t = simTrip({right, up}, g0.from, spot, g0.dir, n + 1);
      if (t.home !== n) continue;
      if (meets({right, up})) continue;
      way ||= {right, up, dots: t.squares};
    }
    assert.equal(Boolean(way), Boolean(row.way), `${p.id}: a longest trip that misses the goal ${row.way ? 'exists' : 'doesn’t exist'}`);
    if (way) {
      let a = fresh;
      for (const kind of q.sides) for (const s of list) if (a.board[kind][s] !== way[kind][s]) a = play(p, a, {type: 'glue', side: kind, from: s, to: way[kind][s]});
      const wrong = play(p, a, {type: 'cant', dots: way.dots});
      assert.equal(wrong.board.told, 'way', `${p.id}: a whole certificate on a puzzle that can be done`);
      assert.ok(!isSolved(p, wrong.board));
      refused(p, wrong, {type: 'cant', dots: way.dots}, 'no second Can’t while refused');
      const back = undoCarry(p, wrong);
      assert.equal(back.board.told, 'way', `${p.id}: Undo keeps the refusal`);
      refused(p, back, {type: 'cant', dots: way.dots}, 'no Can’t after Undo either');
      let start = back;
      while (start.history.length) start = undoCarry(p, start);
      assert.equal(start.board.told, 'way', `${p.id}: back to the start, still refused`);
      const fresh2 = play(p, start, {type: 'glue', side: q.sides[0], from: list[1], to: list[2]});
      assert.equal(fresh2.board.told, null, `${p.id}: a new gluing lifts it`);
      hintsSolve(p, wrong, 'after a wrong Can’t');
      hintsSolve(p, back, 'after Undo of a wrong Can’t');
    }
  }
  if (p.id === 'glued-09') {
    // The three trips force the L or its mirror.
    const sols = [];
    for (const right of fulls) for (const up of fulls) if (meets({right, up})) sols.push({right, up});
    const mirror = {right: {A: 'C', B: 'B', C: 'A'}, up: {A: 'B', B: 'A', C: 'C'}};
    assert.deepEqual(sols.map(s => JSON.stringify(s)).sort(), [JSON.stringify(L), JSON.stringify(mirror)].sort(), `${p.id}: the L and its mirror`);
  }
  if (p.id === 'glued-04') assert.deepEqual(simTrip(L, 'A', spot, [1, 1], 4).squares, ['B', 'C', 'A'], 'Problem 7 on the L: A→B→C→A');
  if (p.id === 'glued-05') {
    assert.deepEqual(['A', 'B', 'C'].map(s => simTrip(L, s, spot, [2, 1], 4).home), [1, 2, 2], 'Problem 8 on the L: A alone is shortest');
    assert.deepEqual(cutting(spot, [2, 1]).word, ['r', 'u', 'r'], 'Problem 8: right, up, right');
  }
  // Illegal moves.
  if (!q.sides.includes('up')) refused(p, fresh, {type: 'glue', side: 'up', from: 'A', to: 'B'}, 'tops are fixed here');
  refused(p, fresh, {type: 'glue', side: 'left', from: 'A', to: 'B'}, 'a side kind that does not exist');
  refused(p, fresh, {type: 'glue', side: 'right', from: 'A', to: 'Z'}, 'an unknown square');
  const once = play(p, fresh, {type: 'glue', side: 'right', from: 'A', to: 'B'});
  refused(p, once, {type: 'glue', side: 'right', from: 'A', to: 'B'}, 'the same gluing twice');
  // Gluing a side again takes it from its old partner.
  const moved = play(p, once, {type: 'glue', side: 'right', from: 'C', to: 'B'});
  assert.equal(moved.board.right.A, null, `${p.id}: B’s left side comes free from A`);
  assert.equal(moved.board.right.C, 'B');
  refused(p, fresh, {type: 'cant'}, 'Can’t without dots');
  refused(p, fresh, {type: 'link', a: 'A:00', b: 'A:01'}, 'a corner move on a glue puzzle');
  // Forged saves.
  const b = fresh.board;
  const forged = [
    {...b, extra: 1},
    {...b, right: {...b.right, A: 'B', B: 'B'}},
    {...b, right: {...b.right, A: 'Z'}},
    {...b, right: Object.fromEntries(list.slice(1).map(s => [s, null]))},
    {...b, up: {...b.up, A: q.sides.includes('up') ? 'Q' : 'B'}},
    {...b, told: 'yes'},
    {...b, claimed: 'yes'},
    {...b, claimed: true},
    {...b, told: 'taps', claimed: true},
    {...b, ...(row.cant ? {told: 'way'} : {right: {...b.right, A: 'A'}, claimed: true})}
  ];
  forged.forEach((f, i) => assert.equal(validBoard(p, f), false, `${p.id}: forged save ${i} refused`));
  // A wrong move: a gluing that no working full gluing has, when there is one.
  let wrongMove = null;
  for (const kind of q.sides) for (const from of list) for (const to of list) {
    if (wrongMove || row.cant) continue;
    let used = false;
    for (const right of fullOptions('right')) for (const up of fullOptions('up')) if (!used && ({right, up})[kind][from] === to && meets({right, up})) used = true;
    if (!used) wrongMove = {type: 'glue', side: kind, from, to};
  }
  const wrongStart = wrongMove ? play(p, fresh, wrongMove) : once;
  assert.ok(checked > 0);
  return hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, wrongStart, wrongMove ? 'after a wrong move' : 'after a first move');
}

function checkCorners(p, fresh, row) {
  const q = p.parameters, list = Object.keys(q.squares), n = list.length, {points, pairs} = cornerPoints(q);
  assert.deepEqual(points.map(x => x.length).sort((a, b) => a - b), row.points, `${p.id}: the points`);
  // Euler: V − E + F with E = 2n sides (fully glued) and F = n squares.
  const chi = points.length - 2 * n + n;
  assert.equal(Math.abs(chi % 2), 0, `${p.id}: an orientable closed surface`);
  // Every corner of a point with 4k corners turns k times; the corners total 4n.
  assert.equal(points.reduce((m, x) => m + x.length, 0), 4 * n);
  assert.ok(points.every(x => x.length % 4 === 0), `${p.id}: whole turns round every point`);
  // Gauss–Bonnet for cone points: the angle excesses add up to −2π χ.
  assert.equal(points.reduce((m, x) => m + (x.length / 4 - 1), 0), Math.abs(chi) === 0 ? 0 : -chi, `${p.id}: the turns add up`);
  assert.equal(p.solution.points, points.length);
  // That's all too soon is refused, and stays refused through Undo.
  const early = play(p, fresh, {type: 'all'});
  assert.equal(early.board.told, 'more', `${p.id}: That’s all with nothing joined`);
  refused(p, early, {type: 'all'}, 'no second That’s all while refused');
  const [a0, b0] = pairs[0];
  const one = play(p, fresh, {type: 'link', a: a0, b: b0}), wrong = play(p, one, {type: 'all'});
  assert.equal(wrong.board.told, 'more');
  const back = undoCarry(p, wrong);
  assert.equal(back.board.told, 'more', `${p.id}: Undo keeps the refusal`);
  const back2 = undoCarry(p, back);
  assert.equal(back2.board.told, 'more', `${p.id}: back to the start, still refused`);
  refused(p, back2, {type: 'all'}, 'That’s all after Undo');
  // Illegal joins: corners that don't meet, a corner with itself, a join inside a group, unknown corners.
  const meet = new Set(pairs.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`]));
  const corners = list.flatMap(s => ['00', '01', '10', '11'].map(c => `${s}:${c}`));
  let illegal = 0;
  for (const a of corners) for (const b of corners) {
    const ok = move(p, fresh, {type: 'link', a, b});
    assert.equal(Boolean(ok), meet.has(`${a}|${b}`), `${p.id}: ${a} with ${b}`);
    if (!ok) illegal++;
  }
  refused(p, one, {type: 'link', a: b0, b: a0}, 'a join inside a group');
  refused(p, fresh, {type: 'link', a: 'A:22', b: 'A:00'}, 'an unknown corner');
  refused(p, fresh, {type: 'glue', side: 'right', from: 'A', to: 'B'}, 'a glue move on a corner puzzle');
  // Every complete grouping is accepted: join along the union pairs in a shuffled order.
  let a = fresh;
  const order = [...pairs].reverse();
  for (const [x, y] of order) { const next = move(p, a, {type: 'link', a: x, b: y}); if (next) a = next; }
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board), `${p.id}: any complete grouping is a solve`);
  assert.equal(a.board.links.length, 4 * n - points.length, `${p.id}: a spanning forest of joins`);
  // Forged saves.
  const b = fresh.board;
  const forged = [
    {...b, done: true},
    {...b, links: [[a0, a0]]},
    {...b, links: [[a0, b0], [b0, a0]]},
    {...b, links: [['A:00', 'A:11']].filter(() => !meet.has('A:00|A:11'))},
    {...b, told: 'more', done: true},
    {...b, extra: 1},
    {...b, links: 'x'},
    {...a.board, told: 'more'}
  ].filter(f => !(Array.isArray(f.links) && f.links.length === 0 && f.done === false && f.told === null));
  forged.forEach((f, i) => assert.equal(validBoard(p, f), false, `${p.id}: forged save ${i} refused`));
  return hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, early, 'after a wrong That’s all') + hintsSolve(p, back, 'after Undo of a wrong That’s all') + 0 * illegal;
}

function checkPlayground(p, fresh) {
  const q = p.parameters, M = mechanicFor(p);
  assert.equal(M.noHint(p), true, 'the playground has no Hint');
  assert.equal(isSolved(p, fresh.board), false);
  let trips = 0;
  for (const [id, sf] of Object.entries(q.surfaces)) {
    const n = Object.keys(sf.squares).length;
    let a = Object.keys(q.surfaces)[0] === id ? fresh : play(p, fresh, {type: 'surface', id});
    // Every start cell and direction: the mechanic's drawn trip agrees with the simulator.
    for (const s of Object.keys(sf.squares)) for (let i = 0; i < q.n; i++) for (let j = 0; j < q.n; j++) for (let k = 0; k < q.dirs.length; k++) {
      const spot = [fr(2 * i + 1, 2 * q.n), fr(2 * j + 1, 2 * q.n)], mine = simTrip(sf, s, spot, q.dirs[k], n + 1);
      assert.ok(mine.stop === 'home' || mine.stop === 'corner', `${id}: every trip closes or meets a corner`);
      assert.ok(mine.home === null || mine.home <= n, `${id}: within ${n} blocks`);
      const board = {surface: id, start: {s, i, j}, dir: k};
      assert.ok(validBoard(p, board));
      const t = tripOf(playS(q, board), playStart(q, board), q.dirs[k]);
      assert.equal(t.home, mine.home, `${id} ${s} (${i}, ${j}) ${JSON.stringify(q.dirs[k])}: home`);
      assert.equal(t.stop, mine.stop, `${id} ${s} (${i}, ${j}) ${JSON.stringify(q.dirs[k])}: stop`);
      if (mine.home) assert.deepEqual(t.blocks.map(x => x.s), mine.squares, `${id} ${s}: the squares landed in`);
      if (trips % 9 === 0) {
        const said = mine.home ? `Home after ${mine.home} ${mine.home === 1 ? 'block' : 'blocks'}.` : 'The trip reaches a corner.';
        assert.ok(M.render(p, {...fresh, board}).includes(said), `${id} ${s} (${i}, ${j}) ${JSON.stringify(q.dirs[k])}: ${said}`);
      }
      trips++;
    }
    a = play(p, a, {type: 'start', s: Object.keys(sf.squares).at(-1), i: q.n - 1, j: q.n - 1});
    a = play(p, a, {type: 'dir', k: q.dirs.length - 1});
    assert.equal(isSolved(p, a.board), false, 'the playground is never solved');
  }
  // The L's trips right: two blocks from the bottom row, one from the top.
  assert.deepEqual(['A', 'B', 'C'].map(s => simTrip(q.surfaces.L, s, [fr(1, 2), fr(1, 2)], [1, 0], 4).home), [2, 2, 1]);
  refused(p, fresh, {type: 'start', s: 'Z', i: 0, j: 0}, 'a start in no square');
  refused(p, fresh, {type: 'start', s: 'A', i: q.n, j: 0}, 'a start off the square');
  refused(p, fresh, {type: 'dir', k: q.dirs.length}, 'no such arrow');
  refused(p, fresh, {type: 'surface', id: 'nowhere'}, 'no such surface');
  for (const f of [{...fresh.board, surface: 'nowhere'}, {...fresh.board, dir: -1}, {...fresh.board, start: {s: 'A', i: 0}}, {...fresh.board, extra: 1}]) assert.equal(validBoard(p, f), false, 'a forged playground save');
  return trips;
}

export async function validateGlued() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/glued/glued.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-64')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-64.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'glued');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  let hintSteps = 0, playgroundTrips = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'glued');
    assert.ok(p.id.startsWith('glued-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok((p.visibleObjective.match(/[.?!]/g) || []).length <= 1, `${p.id}: at most one sentence on the board`);
    assert.ok(!/where will|where does|which square will|predict/i.test(p.visibleObjective + p.objective), `${p.id}: no prediction quiz`);
    assert.ok(!/can’t|cannot|impossible/i.test(p.title + p.visibleObjective), `${p.id}: the title and goal don’t give a Can’t away`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    assert.ok(!/press can’t|press that’s all/i.test(p.hints[0]), `${p.id}: the first hint is not a claim`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (q.mode === 'playground') { playgroundTrips = checkPlayground(p, fresh); continue; }
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);
    assert.notEqual(nextHint(p, fresh).action.type, 'cant', `${p.id}: never Can’t first`);
    const row = TABLE[p.id];
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    hintSteps += q.mode === 'glue' ? checkGlue(p, fresh, row) : checkCorners(p, fresh, row);
  }
  return {gluedPuzzles: puzzles.length, hintSteps, playgroundTrips};
}

export default validateGlued;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateGlued(), null, 2));
