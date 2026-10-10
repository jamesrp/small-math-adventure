// Checks the Meeting roads pack (dist/families/meeting/meeting.json): content
// fields and sources; every answer set recomputed by methods unlike the
// mechanic's breadth-first search (the coordinate median on grids, the
// intersection of the three paths on the tree, the majority label on the
// cube, and Floyd–Warshall distances with the pair test everywhere); every
// triple of homes on the full 5 × 5 grid, the tree, the cube and the ring of
// eight; every single closure in the close puzzle; witnesses played as moves;
// hint chains from fresh, after a wasted step, after a wrong That's all and
// after a wrong closure; illegal moves; forged saves; the playground.
// Run: node scripts/validate-meeting.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {meetingDots} from '../dist/families/meeting/meeting.js';
import {loadPack} from './packs.mjs';

const W = ['A', 'B', 'C'], PAIRS = [['A', 'B'], ['A', 'C'], ['B', 'C']];
// Distances by Floyd–Warshall over the roads left open.
function floyd(q, closed = []) {
  const ids = Object.keys(q.nodes), INF = 1e9, d = Object.fromEntries(ids.map(u => [u, Object.fromEntries(ids.map(v => [v, u === v ? 0 : INF]))]));
  q.roads.forEach(([u, v], i) => { if (!closed.includes(i)) { d[u][v] = 1; d[v][u] = 1; } });
  for (const k of ids) for (const i of ids) for (const j of ids) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  return d;
}
const pairTest = (q, homes, closed = []) => { const d = floyd(q, closed); return Object.keys(q.nodes).filter(m => PAIRS.every(([x, y]) => d[homes[x]][m] + d[m][homes[y]] === d[homes[x]][homes[y]])); };
const middle = (...v) => [...v].sort((a, b) => a - b)[1];
// Grids: the middle column with the middle row (ids are "xy").
const coordinateMedian = homes => { const c = W.map(x => [...homes[x]].map(Number)); return `${middle(...c.map(p => p[0]))}${middle(...c.map(p => p[1]))}`; };
// Trees: the one dot on all three paths, each path found by depth-first search.
function treeCentre(q, homes) {
  const path = (from, to) => {
    const seen = new Set([from]);
    const go = at => { if (at === to) return [at]; for (const [u, v] of q.roads) for (const [a, b] of [[u, v], [v, u]]) if (a === at && !seen.has(b)) { seen.add(b); const rest = go(b); if (rest) return [at, ...rest]; } return null; };
    return go(from);
  };
  const [ab, ac, bc] = PAIRS.map(([x, y]) => new Set(path(homes[x], homes[y])));
  return [...ab].filter(m => ac.has(m) && bc.has(m));
}
// Cube: the majority digit in each place.
const majority = homes => [0, 1, 2].map(i => W.filter(x => homes[x][i] === '1').length >= 2 ? '1' : '0').join('');
function triples(ids) { const out = []; for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) out.push({A: ids[i], B: ids[j], C: ids[k]}); return out; }
const roadIndex = (q, u, v) => q.roads.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u));

// The table in docs/meeting/README.md: answers and pair distances (AB, AC, BC).
const TABLE = {
  'meeting-01': {mode: 'meet', kind: 'grid', answers: ['10'], pairs: [2, 3, 3]},
  'meeting-02': {mode: 'meet', kind: 'grid', answers: ['11'], pairs: [5, 5, 6]},
  'meeting-03': {mode: 'meet', kind: 'tree', answers: ['v'], pairs: [4, 4, 4]},
  'meeting-04': {mode: 'meet', kind: 'square', answers: ['b'], pairs: [1, 2, 1]},
  'meeting-05': {mode: 'meet', kind: 'grid', answers: ['43'], pairs: [7, 5, 4]},
  'meeting-06': {mode: 'meet', kind: 'cube', answers: ['100'], pairs: [2, 2, 2]},
  'meeting-07': {mode: 'meet', kind: 'cube', answers: ['001'], pairs: [1, 3, 2]},
  'meeting-08': {mode: 'every', kind: 'grid', answers: ['33'], pairs: [7, 5, 4]},
  'meeting-09': {mode: 'every', kind: 'crossroads', answers: ['x', 'y'], pairs: [2, 2, 2]},
  'meeting-10': {mode: 'every', kind: 'triangle', answers: [], pairs: [1, 1, 1]},
  'meeting-11': {mode: 'every', kind: 'ring', answers: [], pairs: [2, 3, 3]},
  'meeting-12': {mode: 'close', kind: 'grid', answers: ['01'], pairs: [2, 2, 2], close: ['01', '11']}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Walk one walker along a list of dots.
const walkTo = (p, a, x, dots) => dots.reduce((b, to) => play(p, b, {type: 'step', walker: x, to}), a);
// A first step that leaves every shortest walk to every answer still to find.
function wastedStep(q, a, aims) {
  const d = floyd(q);
  for (const x of W) {
    const home = q.homes[x];
    for (const [u, v] of q.roads) for (const [s, t] of [[u, v], [v, u]]) if (s === home && aims.every(m => d[t][m] !== d[home][m] - 1)) return {x, to: t};
  }
  return null;
}

export async function validateMeeting() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/meeting/meeting.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-67')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-67.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'meeting');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // The theorems over every triple of distinct homes.
  const grid5 = puzzles.find(p => p.id === 'meeting-02').parameters, tree = puzzles.find(p => p.id === 'meeting-03').parameters;
  const cube = puzzles.find(p => p.id === 'meeting-06').parameters, ring = puzzles.find(p => p.id === 'meeting-11').parameters;
  let triplesChecked = 0;
  for (const homes of triples(Object.keys(grid5.nodes))) {
    const m = pairTest(grid5, homes);
    assert.deepEqual(m, [coordinateMedian(homes)], `grid ${JSON.stringify(homes)}: one meeting dot, the coordinate median`);
    assert.deepEqual(meetingDots(grid5, homes), m, 'the mechanic agrees');
    triplesChecked++;
  }
  assert.equal(triplesChecked, 2300, 'all 2,300 grid triples');
  for (const homes of triples(Object.keys(tree.nodes))) { const m = treeCentre(tree, homes); assert.equal(m.length, 1); assert.deepEqual(pairTest(tree, homes), m, 'tree: the centre of the tripod'); assert.deepEqual(meetingDots(tree, homes), m); triplesChecked++; }
  for (const homes of triples(Object.keys(cube.nodes))) { assert.deepEqual(pairTest(cube, homes), [majority(homes)], 'cube: the majority label'); assert.deepEqual(meetingDots(cube, homes), [majority(homes)]); triplesChecked++; }
  const ringNone = triples(Object.keys(ring.nodes)).filter(homes => { const m = pairTest(ring, homes); assert.deepEqual(meetingDots(ring, homes), m); assert.ok(m.length <= 1); triplesChecked++; return !m.length; });
  assert.equal(ringNone.length, 8, 'the ring of eight: 8 of its 56 triples have no meeting dot');

  let hintSteps = 0;
  for (const p of pack.puzzles) {
    assert.equal(p.mechanic, 'meeting');
    assert.ok(p.id.startsWith('meeting-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    assert.ok(!/total travel/i.test(JSON.stringify(p.parameters)), `${p.id}: nothing scores total travel`);
    const q = p.parameters, fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, q.mode === 'playground' ? 'done' : 'move', `${p.id}: a first hint`);
    if (q.mode === 'playground') { hintSteps += checkPlayground(p, fresh); continue; }

    const row = TABLE[p.id], d = floyd(q);
    assert.equal(q.mode, row.mode, `${p.id}: kind`);
    assert.deepEqual(PAIRS.map(([x, y]) => d[q.homes[x]][q.homes[y]]), row.pairs, `${p.id}: pair distances`);
    const answers = pairTest(q, q.homes);
    assert.deepEqual(answers, row.answers, `${p.id}: meeting dots by the pair test`);
    if (row.kind === 'grid') assert.deepEqual(answers, [coordinateMedian(q.homes)], `${p.id}: the coordinate median`);
    if (row.kind === 'tree') assert.deepEqual(answers, treeCentre(q, q.homes), `${p.id}: the tripod's centre`);
    if (row.kind === 'cube') assert.deepEqual(answers, [majority(q.homes)], `${p.id}: the majority label`);
    if (row.kind === 'cube') assert.ok(q.roads.every(([u, v]) => [...u].filter((c, i) => c !== v[i]).length === 1) && q.roads.length === 12, `${p.id}: every cube road changes one digit`);
    const keys = q.roads.map(r => [...r].sort().join());
    assert.equal(new Set(keys).size, keys.length, `${p.id}: no doubled road`);
    assert.equal(new Set(Object.values(q.homes)).size, 3, `${p.id}: three different homes`);

    if (q.mode === 'close') { hintSteps += checkClose(p, fresh, row); continue; }

    // Witnesses: one shortest walk from each home to each answer, played as moves.
    const walksTo = m => Object.fromEntries(W.map(x => { const r = [q.homes[x]]; while (r.at(-1) !== m) r.push(Object.keys(q.nodes).find(v => roadIndex(q, r.at(-1), v) >= 0 && d[v][m] === d[r.at(-1)][m] - 1)); return [x, r]; }));
    let a = fresh;
    for (const [k, m] of answers.entries()) {
      const w = walksTo(m);
      for (const x of W) a = walkTo(p, a, x, w[x].slice(1));
      if (q.mode === 'meet') { assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`); break; }
      assert.deepEqual(a.board.found, answers.slice(0, k + 1), `${p.id}: a meeting dot joins the found row`);
      assert.ok(W.every(x => a.board.walks[x].length === 1), `${p.id}: the walkers go home`);
      if (k === 0) {
        const again = W.reduce((b, x) => walkTo(p, b, x, w[x].slice(1)), a);
        assert.deepEqual(again.board.told, {kind: 'again', dot: m}, `${p.id}: found already`);
        assert.deepEqual(again.board.found, a.board.found);
      }
    }
    if (q.mode === 'every') {
      a = play(p, a, {type: 'all'});
      assert.ok(isSolved(p, a.board), `${p.id}: That’s all after every meeting dot`);
      if (answers.length) {
        const early = play(p, fresh, {type: 'all'});
        assert.deepEqual(early.board.told, {kind: 'more'}, `${p.id}: there is another`);
        refuse(p, early, {type: 'all'}, 'That’s all again before a new dot');
        hintSteps += hintsSolve(p, early, 'after a wrong That’s all');
      }
    }
    // A meeting at a dot that is not a meeting dot (or by a long walk) keeps
    // the walkers there and names a pair; the hints still finish.
    const wrong = Object.keys(q.nodes).find(m => !answers.includes(m));
    if (wrong) {
      const w = walksTo(wrong);
      let b = fresh;
      for (const x of W) b = walkTo(p, b, x, w[x].slice(1));
      assert.ok(!isSolved(p, b.board) && W.every(x => b.board.walks[x].at(-1) === wrong), `${p.id}: a wrong dot keeps the walkers`);
      assert.ok(PAIRS.some(([x, y]) => d[q.homes[x]][wrong] + d[wrong][q.homes[y]] > d[q.homes[x]][q.homes[y]]), `${p.id}: some pair fails at the wrong dot`);
      hintSteps += hintsSolve(p, b, 'from a wrong meeting');
    }
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    const aims = answers.length ? answers : Object.keys(q.nodes);
    const waste = wastedStep(q, fresh, aims);
    if (waste && answers.length) {
      const b = play(p, fresh, {type: 'step', walker: waste.x, to: waste.to});
      const h = nextHint(p, b);
      assert.deepEqual(h.action, {type: 'back', walker: waste.x, to: q.homes[waste.x]}, `${p.id}: after a wasted step the hint takes it back`);
      hintSteps += hintsSolve(p, b, 'after a wasted step');
    }
    // Wander: each walker three steps along its first roads, then hints.
    let messy = fresh;
    for (const x of W) for (let k = 0; k < 3; k++) {
      const w = messy.board.walks[x], next = q.roads.flatMap(([u, v]) => u === w.at(-1) ? [v] : v === w.at(-1) ? [u] : []).find(v => v !== w.at(-2));
      const moved = next && move(p, messy, {type: 'step', walker: x, to: next});
      if (moved && !isSolved(p, moved.board)) messy = moved;
    }
    hintSteps += hintsSolve(p, messy, 'after wandering');
    checkWalkRefusals(p, fresh, answers, d);
  }
  return {meetingPuzzles: puzzles.length, homeTriplesChecked: triplesChecked, hintSteps};
}

function checkWalkRefusals(p, fresh, answers, d) {
  const q = p.parameters, ids = Object.keys(q.nodes), A = q.homes.A;
  const far = ids.find(v => v !== A && roadIndex(q, A, v) < 0), near = ids.find(v => roadIndex(q, A, v) >= 0);
  for (const [action, why] of [[null, 'nothing'], ['step', 'a string'], [{type: 'step'}, 'no walker'], [{type: 'step', walker: 'D', to: near}, 'an unknown walker'], [{type: 'step', walker: 'A', to: 'zz'}, 'an unknown dot'], [{type: 'step', walker: 'A', to: far}, 'a step along no road'], [{type: 'step', walker: 'A', to: A}, 'staying put'], [{type: 'back', walker: 'A', to: near}, 'a step back from home'], [{type: 'close', road: 0}, 'closing a road'], [{type: 'map', map: 'grid'}, 'a map change'], [{type: 'home', walker: 'A', to: far}, 'moving a home'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (q.mode === 'meet') refuse(p, fresh, {type: 'all'}, 'That’s all in a one-answer puzzle');
  const b = play(p, fresh, {type: 'step', walker: 'A', to: near});
  refuse(p, b, {type: 'step', walker: 'A', to: A}, 'a step straight back given as a step');
  refuse(p, b, {type: 'back', walker: 'A', to: near}, 'a step back to the wrong dot');
  assert.deepEqual(play(p, b, {type: 'back', walker: 'A', to: A}).board.walks.A, [A], `${p.id}: back takes the step back`);
  if (q.mode === 'meet') {
    const m = answers[0], walks = Object.fromEntries(W.map(x => { const r = [q.homes[x]]; while (r.at(-1) !== m) r.push(ids.find(v => roadIndex(q, r.at(-1), v) >= 0 && d[v][m] === d[r.at(-1)][m] - 1)); return [x, r]; }));
    const done = W.reduce((a, x) => walkTo(p, a, x, walks[x].slice(1)), fresh);
    assert.ok(isSolved(p, done.board));
    const x = W.find(w => walks[w].length > 1) || 'A';
    refuse(p, done, {type: 'back', walker: x, to: walks[x].at(-2) || q.homes[x]}, 'a move after a solve');
  }
  // Forged saves.
  const B = fresh.board, home = Object.fromEntries(W.map(x => [x, [q.homes[x]]]));
  const forged = [
    [{...B, walks: {...home, A: ['zz']}}, 'a walker off the map'],
    [{...B, walks: {...home, A: [near]}}, 'a walk that does not start at home'],
    [{...B, walks: {...home, A: [A, far]}}, 'a step along no road'],
    [{...B, walks: {...home, A: [A, near, A]}}, 'a walk that turns straight back'],
    [{...B, walks: {...home, D: [A]}}, 'a fourth walker'],
    [{...B, walks: {A: home.A, B: home.B}}, 'a missing walker'],
    [{...B, extra: 1}, 'an unknown field']
  ];
  // A walk of 17 steps that never turns straight back, where the map has a loop.
  const long = [A];
  while (long.length < 18) { const next = ids.find(v => roadIndex(q, long.at(-1), v) >= 0 && v !== long.at(-2)); if (!next) break; long.push(next); }
  if (long.length === 18) forged.push([{...B, walks: {...home, A: long}}, 'a walk past 16 steps']);
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  if (q.mode === 'every') {
    const notOne = ids.find(v => !answers.includes(v));
    for (const [board, why] of [[{...B, found: [notOne]}, 'a found dot that is not a meeting dot'], ...(answers.length ? [[{...B, found: [answers[0], answers[0]]}, 'a dot found twice'], [{...B, done: true}, 'That’s all before every dot'], [{...B, found: [...answers], told: {kind: 'more'}}, '“there is another” when none is'], [{...B, found: [answers[0]], told: {kind: 'again', dot: answers[0]}, walks: {...home, A: [A, near]}}, '“found already” with a walker away']] : []), [{...B, told: {kind: 'again', dot: notOne}}, '“found already” for a dot not found'], [{...B, done: 'yes'}, 'a done flag that is not true or false']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    // The walkers never rest on a meeting dot: it is kept the moment they meet.
    if (answers.length) {
      const m = answers[0], walks = Object.fromEntries(W.map(x => { const r = [q.homes[x]]; while (r.at(-1) !== m) r.push(ids.find(v => roadIndex(q, r.at(-1), v) >= 0 && d[v][m] === d[r.at(-1)][m] - 1)); return [x, r]; }));
      assert.equal(validBoard(p, {...B, walks}), false, `${p.id}: rejects walkers resting on a meeting dot`);
    }
  }
}

function checkClose(p, fresh, row) {
  const q = p.parameters, target = roadIndex(q, ...row.close);
  let steps = 0;
  // Every single closure: only the one in the table leaves no meeting dot.
  for (let i = 0; i < q.roads.length; i++) {
    const left = pairTest(q, q.homes, [i]);
    assert.equal(left.length === 0, i === target, `${p.id}: closing road ${q.roads[i].join('–')} ${i === target ? 'leaves none' : 'leaves a meeting dot'}`);
    let a = play(p, fresh, {type: 'close', road: i});
    a = play(p, a, {type: 'claim'});
    if (i === target) { assert.ok(isSolved(p, a.board), `${p.id}: the claim is accepted`); continue; }
    assert.equal(a.board.refused, true, `${p.id}: a wrong claim is refused`);
    refuse(p, a, {type: 'claim'}, 'the same claim twice');
    refuse(p, a, {type: 'close', road: target}, 'a closure past the budget');
    steps += hintsSolve(p, a, `after closing road ${i}`);
  }
  const before = play(p, fresh, {type: 'claim'});
  assert.equal(before.board.refused, true, `${p.id}: with every road open a dot works`);
  steps += hintsSolve(p, fresh, 'from fresh');
  for (const [action, why] of [[{type: 'close', road: -1}, 'an unknown road'], [{type: 'close', road: q.roads.length}, 'an unknown road'], [{type: 'close', road: '0'}, 'a road named by a string'], [{type: 'open', road: 0}, 'opening an open road'], [{type: 'step', walker: 'A', to: q.roads[0][1]}, 'walking'], [{type: 'all'}, 'That’s all']]) refuse(p, fresh, action, why);
  // A road whose closure would cut the map in two is refused (with room in
  // the budget to try: the corner dot keeps one road).
  const wide = {...p, parameters: {...q, budget: 2}}, corner = Object.keys(q.nodes).find(v => q.roads.filter(r => r.includes(v)).length === 2);
  const [r1, r2] = q.roads.map((r, i) => r.includes(corner) ? i : -1).filter(i => i >= 0);
  const once = play(wide, freshAttempt(wide), {type: 'close', road: r1});
  refuse(wide, once, {type: 'close', road: r2}, 'cutting off a corner');
  assert.equal(validBoard(wide, {closed: [r1, r2], claimed: false, refused: false}), false, `${p.id}: rejects a save with the map cut in two`);
  for (const [board, why] of [[{closed: [target], claimed: false, refused: true}, 'a refusal when no dot works'], [{closed: [], claimed: true, refused: false}, 'a claim while a dot works'], [{closed: [0, 1], claimed: false, refused: false}, 'closures past the budget'], [{closed: [3, 3], claimed: false, refused: false}, 'a road closed twice'], [{closed: [target], claimed: true, refused: true}, 'a claim both kept and refused'], [{closed: [], claimed: false}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return steps;
}

function checkPlayground(p, fresh) {
  const q = p.parameters;
  assert.equal(mechanicFor(p).noHint(p), true, `${p.id}: no Hint`);
  for (const [name, m] of Object.entries(q.maps)) {
    let a = name === fresh.board.map ? fresh : play(p, fresh, {type: 'map', map: name});
    assert.deepEqual(a.board.homes, m.homes, `${p.id}: ${name} starts with its homes`);
    const [M] = pairTest(m, m.homes), d = floyd(m);
    for (const x of W) { const r = [m.homes[x]]; while (r.at(-1) !== M) r.push(Object.keys(m.nodes).find(v => roadIndex(m, r.at(-1), v) >= 0 && d[v][M] === d[r.at(-1)][M] - 1)); a = walkTo(p, a, x, r.slice(1)); }
    assert.deepEqual(a.board.found, [M], `${p.id}: ${name} keeps the meeting dot`);
    assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
    const free = Object.keys(m.nodes).find(v => !Object.values(m.homes).includes(v));
    const moved = play(p, a, {type: 'home', walker: 'A', to: free});
    assert.equal(moved.board.homes.A, free, `${p.id}: ${name} moves a home`);
    assert.deepEqual(moved.board.found, [], `${p.id}: moving a home clears what was found`);
    refuse(p, a, {type: 'home', walker: 'A', to: m.homes.B}, 'a home onto another home');
    refuse(p, a, {type: 'home', walker: 'A', to: 'zz'}, 'a home off the map');
    refuse(p, a, {type: 'all'}, 'That’s all in the playground');
  }
  refuse(p, fresh, {type: 'map', map: 'moon'}, 'an unknown map');
  refuse(p, fresh, {type: 'map', map: fresh.board.map}, 'the same map');
  for (const [board, why] of [[{...fresh.board, map: 'moon'}, 'an unknown map'], [{...fresh.board, homes: {A: '00', B: '00', C: '44'}, walks: {A: ['00'], B: ['00'], C: ['44']}}, 'two homes on one dot'], [{...fresh.board, found: ['44']}, 'a found dot that is not a meeting dot'], [{...fresh.board, told: {kind: 'more'}}, '“there is another” in the playground']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  return 0;
}
export default validateMeeting;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateMeeting(), null, 2));
