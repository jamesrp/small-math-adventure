// Checks the Gaps group of Meeting roads (dist/families/gapflood/gapflood.json):
// content fields and sources; every answer recomputed by methods unlike the
// mechanic's (Floyd–Warshall distances; shortest routes as staircases of
// across and up steps on grids and as simple paths of the right length
// elsewhere; gaps by a flood from the other two routes; the homes' covering
// by a flood from the homes); the theorems behind the certificates (every
// triangle of every three homes on the tree is a tripod, no ladder 3, 5 or 7
// squares long has a gap of 2, no ring of 12 more than 3, the corner triangle
// of side n has gap n and nothing more for n = 1 to 7, and every gap 0 means
// every road on two routes); the tree's centre, the one dot a Can't there
// accepts, and the ochre rings only where the biggest gap can be made;
// witnesses played as moves; Can't only on a finished triangle, and refused
// claims kept until what they answered changes, through floods and Undo; hint
// chains from fresh, after a wrong route, a refused Can't or Best, a tap that
// missed the centre, and random play; illegal moves; forged saves.
// Run: node scripts/validate-gapflood.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {bestOf, triangles as mechanicTriangles, coverOf, fatDots, forcedCentre} from '../dist/families/gapflood/gapflood.js';
import {loadPack} from './packs.mjs';

const SIDES = [['AB', 'A', 'B'], ['BC', 'B', 'C'], ['CA', 'C', 'A']];
const ids = q => Object.keys(q.nodes);
// Distances by Floyd–Warshall.
const floydCache = new Map();
function floyd(q) {
  const key = JSON.stringify(q.roads);
  if (floydCache.has(key)) return floydCache.get(key);
  const all = ids(q), INF = 1e9, d = Object.fromEntries(all.map(u => [u, Object.fromEntries(all.map(v => [v, u === v ? 0 : INF]))]));
  for (const [u, v] of q.roads) { d[u][v] = 1; d[v][u] = 1; }
  for (const k of all) for (const i of all) for (const j of all) if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
  floydCache.set(key, d);
  return d;
}
const hasRoad = (q, u, v) => q.roads.some(([a, b]) => (a === u && b === v) || (a === v && b === u));
const xy = id => [Number(id[0]), Number(id[1])];
// Shortest routes. On a full grid, every shortest route is a staircase: the
// across steps and the up steps in some order. Elsewhere, every simple path
// of exactly the right length.
function routesBy(q, from, to) {
  if (q.kind === 'grid' || q.kind === 'ladder') {
    const [x1, y1] = xy(from), [x2, y2] = xy(to), dx = Math.sign(x2 - x1), dy = Math.sign(y2 - y1), nx = Math.abs(x2 - x1), ny = Math.abs(y2 - y1), out = [];
    (function words(w, a, b) {
      if (a === nx && b === ny) { let x = x1, y = y1; out.push([from, ...w.map(c => { if (c === 'x') x += dx; else y += dy; return `${x}${y}`; })]); return; }
      if (a < nx) words([...w, 'x'], a + 1, b);
      if (b < ny) words([...w, 'y'], a, b + 1);
    })([], 0, 0);
    return out;
  }
  const d = floyd(q)[from][to], out = [];
  (function go(path) {
    const at = path.at(-1);
    if (path.length - 1 === d) { if (at === to) out.push(path); return; }
    for (const v of ids(q)) if (!path.includes(v) && hasRoad(q, at, v)) go([...path, v]);
  })([from]);
  return out;
}
// Gaps: for each route, a flood from the dots of the other two, one step at
// a time over every road; a dot on one route has the flood's count there.
const adjCache = new Map();
function adjacency(q) {
  const key = JSON.stringify(q.roads);
  if (!adjCache.has(key)) { const adj = Object.fromEntries(ids(q).map(v => [v, []])); for (const [a, b] of q.roads) { adj[a].push(b); adj[b].push(a); } adjCache.set(key, adj); }
  return adjCache.get(key);
}
function gapsOf(q, routes) {
  const adj = adjacency(q), on = new Map();
  routes.forEach((r, k) => r.forEach(v => { if (!on.has(v)) on.set(v, new Set()); on.get(v).add(k); }));
  const floods = routes.map((_, k) => {
    const seen = new Map(), queue = [];
    routes.forEach((r, j) => { if (j !== k) for (const v of r) if (!seen.has(v)) { seen.set(v, 0); queue.push(v); } });
    for (let i = 0; i < queue.length; i++) for (const t of adj[queue[i]]) if (!seen.has(t)) { seen.set(t, seen.get(queue[i]) + 1); queue.push(t); }
    return seen;
  });
  const gaps = {};
  for (const [u, sides] of on) gaps[u] = sides.size > 1 ? 0 : floods[[...sides][0]].get(u);
  return gaps;
}
const thick = gaps => Math.max(...Object.values(gaps));
function trianglesBy(q, homes) {
  const [AB, BC, CA] = SIDES.map(([, x, y]) => routesBy(q, homes[x], homes[y])), out = [];
  for (const ab of AB) for (const bc of BC) for (const ca of CA) { const routes = [ab, bc, ca], gaps = gapsOf(q, routes); out.push({routes, gaps, gap: thick(gaps)}); }
  return {counts: [AB.length, BC.length, CA.length], all: out};
}
// Every road of the triangle on two routes (or more).
function tripod(routes) {
  const use = new Map();
  routes.forEach((r, k) => { for (let i = 1; i < r.length; i++) { const key = [r[i - 1], r[i]].sort().join('|'); if (!use.has(key)) use.set(key, new Set()); use.get(key).add(k); } });
  return [...use.values()].every(s => s.size >= 2);
}
// Steps from each dot to its nearest home: a flood from the three homes.
function homeFlood(q, homes) {
  const seen = new Map(Object.values(homes).map(h => [h, 0])), queue = [...Object.values(homes)];
  for (let i = 0; i < queue.length; i++) for (const [a, b] of q.roads) for (const [s, t] of [[a, b], [b, a]]) if (s === queue[i] && !seen.has(t)) { seen.set(t, seen.get(s) + 1); queue.push(t); }
  return seen;
}
function allTriples(list) { const out = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) for (let k = j + 1; k < list.length; k++) out.push({A: list[i], B: list[j], C: list[k]}); return out; }
function gridMap(w, h, kind = 'grid') {
  const nodes = {}, roads = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) nodes[`${x}${y}`] = [x, y];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { if (x + 1 < w) roads.push([`${x}${y}`, `${x + 1}${y}`]); if (y + 1 < h) roads.push([`${x}${y}`, `${x}${y + 1}`]); }
  return {nodes, roads, kind};
}

// The table in docs/gapflood/README.md: goal, route counts (AB, BC, CA),
// triangles, the biggest gap, triangles reaching the goal, the farthest dot
// from a home, and where the biggest gap is (Best).
const TABLE = {
  'gapflood-01': {goal: 'reach', k: 1, routes: [1, 1, 6], triangles: 6, best: 2, good: 5, cover: 2},
  'gapflood-02': {goal: 'reach', k: 1, routes: [1, 1, 1], triangles: 1, best: 0, good: 0, cover: 4, cant: 'tree'},
  'gapflood-03': {goal: 'zero', routes: [1, 1, 70], triangles: 70, best: 4, good: 1, cover: 4},
  'gapflood-04': {goal: 'reach', k: 2, routes: [1, 1, 70], triangles: 70, best: 4, good: 53, cover: 4},
  'gapflood-05': {goal: 'reach', k: 2, routes: [8, 1, 4], triangles: 32, best: 1, good: 0, cover: 3, cant: 'ladder'},
  'gapflood-06': {goal: 'best', routes: [2, 1, 1], triangles: 2, best: 3, good: 1, cover: 3, at: ['h9']},
  'gapflood-07': {goal: 'zero', routes: [5, 20, 5], triangles: 500, best: 3, good: 2, cover: 3},
  'gapflood-08': {goal: 'best', routes: [5, 20, 5], triangles: 500, best: 3, good: 34, cover: 3, at: ['33', '44']},
  'gapflood-09': {goal: 'best', routes: [15, 6, 15], triangles: 1350, best: 3, good: 144, cover: 3, at: ['03', '30']},
  'gapflood-10': {goal: 'best', routes: [7, 252, 7], triangles: 12348, best: 5, good: 74, cover: 5, at: ['55', '66']}
};

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 150; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: hints name a move (${h.text})`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${label}: a hint in words`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Draw whole routes, dot by dot.
function drawAll(p, a, routes) {
  SIDES.forEach(([s], k) => { for (const to of routes[k].slice(1)) a = play(p, a, {type: 'draw', side: s, to}); });
  return a;
}
let seed = 1;
const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
function randomPlay(p, a, n) {
  const q = p.parameters, all = ids(q);
  for (let i = 0; i < n; i++) {
    const options = [];
    for (const [s] of SIDES) for (const to of all) for (const type of ['draw', 'cut']) options.push({type, side: s, to});
    for (const at of all) options.push({type: 'flood', at});
    for (const at of all) options.push({type: 'cant', at});
    options.push({type: 'cant'}, {type: 'best'});
    const legal = options.filter(o => { const next = move(p, a, o); return next && !isSolved(p, next.board); });
    if (!legal.length) break;
    a = move(p, a, legal[Math.floor(random() * legal.length)]);
  }
  return a;
}

export async function validateGapflood() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/gapflood/gapflood.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-69')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-69.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'gapflood');
  const puzzles = pack.puzzles;
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);
  assert.ok(all.some(p => p.mechanic === 'meeting' && p.familyTitle === 'Meeting roads'), 'Meeting roads is in the app');

  // The theorems behind the certificates, over every three homes.
  let triplesChecked = 0;
  const tree = puzzles.find(p => p.parameters.kind === 'tree').parameters;
  for (const homes of allTriples(ids(tree))) {
    const {all: tris} = trianglesBy(tree, homes);
    assert.equal(tris.length, 1, 'a tree has one triangle for three homes');
    assert.equal(tris[0].gap, 0, `tree ${JSON.stringify(homes)}: every gap 0`);
    // Problem 1: no road is on exactly one route.
    const use = new Map();
    tris[0].routes.forEach((r, k) => { for (let i = 1; i < r.length; i++) { const key = [r[i - 1], r[i]].sort().join(); use.set(key, (use.get(key) || 0) + 1); } });
    assert.ok([...use.values()].every(n => n === 2), `tree ${JSON.stringify(homes)}: every road used is on exactly two routes`);
    triplesChecked++;
  }
  assert.equal(triplesChecked, 220, 'all 220 choices of homes on the tree');
  for (const n of [3, 5, 7]) {
    const lad = gridMap(n + 1, 2, 'ladder');
    let most = 0;
    for (const homes of allTriples(ids(lad))) { for (const t of trianglesBy(lad, homes).all) most = Math.max(most, t.gap); triplesChecked++; }
    assert.equal(most, 1, `the ladder ${n} squares long: gaps reach 1 and never 2`);
  }
  const ringQ = puzzles.find(p => p.parameters.kind === 'ring').parameters;
  let ringMost = 0;
  for (const homes of allTriples(ids(ringQ))) { for (const t of trianglesBy(ringQ, homes).all) ringMost = Math.max(ringMost, t.gap); triplesChecked++; }
  assert.equal(ringMost, 3, 'no three homes on the ring of 12 give more than 3');
  for (let n = 1; n <= 7; n++) {
    const sq = gridMap(n + 1, n + 1), homes = {A: '00', B: `${n}0`, C: `${n}${n}`}, {all: tris} = trianglesBy(sq, homes);
    const fat = tris.filter(t => t.gap === n), zero = tris.filter(t => t.gap === 0);
    assert.ok(tris.every(t => t.gap <= n), `the ${n} × ${n} corner triangle: no gap passes ${n}`);
    assert.equal(fat.length, 1, `the ${n} × ${n} corner triangle: one triangle reaches ${n}`);
    assert.deepEqual(Object.keys(fat[0].gaps).filter(u => fat[0].gaps[u] === n), [`0${n}`], `the ${n} × ${n} corner triangle: only the corner opposite B`);
    assert.equal(zero.length, 1, `the ${n} × ${n} corner triangle: one way to make every gap 0`);
    assert.ok(zero[0].routes[2].includes(homes.B), 'and it is CA through B');
  }

  let hintSteps = 0;
  for (const p of puzzles) {
    const q = p.parameters, row = TABLE[p.id];
    assert.equal(p.mechanic, 'gapflood');
    assert.ok(p.id.startsWith('gapflood-'));
    assert.equal(p.libraryFamily, 'meeting', `${p.id}: a group in Meeting roads`);
    assert.equal(p.group, 'Gaps');
    assert.equal(p.band, 'all');
    assert.equal(p.familyTitle, 'Meeting roads');
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'title']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(typeof p.visibleObjective === 'string' && p.visibleObjective.length < 40, `${p.id}: one short visible objective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(mechanicFor(p), `${p.id}: mechanic`);
    assert.equal(q.goal, row.goal, `${p.id}: goal`);
    if (row.k) assert.equal(q.k, row.k, `${p.id}: k`);
    assert.equal(new Set(Object.values(q.homes)).size, 3, `${p.id}: three different homes`);
    const keys = q.roads.map(r => [...r].sort().join());
    assert.equal(new Set(keys).size, keys.length, `${p.id}: no doubled road`);
    if (q.kind === 'grid' || q.kind === 'ladder') {
      const [w, h] = [Math.max(...ids(q).map(id => xy(id)[0])) + 1, Math.max(...ids(q).map(id => xy(id)[1])) + 1];
      assert.deepEqual(new Set(keys), new Set(gridMap(w, h).roads.map(r => [...r].sort().join())), `${p.id}: a full grid`);
      if (q.kind === 'ladder') { assert.equal(h, 2); assert.ok(ids(q).every(id => q.columns[id] === xy(id)[0]), `${p.id}: columns`); }
    }

    // Answers by the independent search.
    const {counts, all: tris} = trianglesBy(q, q.homes);
    assert.deepEqual(counts, row.routes, `${p.id}: shortest routes`);
    assert.equal(tris.length, row.triangles, `${p.id}: triangles`);
    const best = Math.max(...tris.map(t => t.gap));
    assert.equal(best, row.best, `${p.id}: the biggest gap`);
    const need = q.goal === 'zero' ? null : q.goal === 'best' ? best : q.k, good = tris.filter(t => need === null ? t.gap === 0 : t.gap >= need);
    assert.equal(good.length, row.good, `${p.id}: triangles that reach the goal`);
    if (row.at) assert.deepEqual([...new Set(good.flatMap(t => Object.keys(t.gaps).filter(u => t.gaps[u] === best)))].sort(), row.at, `${p.id}: where the biggest gap is`);
    const cover = Math.max(...homeFlood(q, q.homes).values());
    assert.equal(cover, row.cover, `${p.id}: the farthest dot from a home`);
    for (const t of tris) assert.equal(t.gap === 0, tripod(t.routes), `${p.id}: every gap 0 exactly when every road is on two routes`);
    // The mechanic agrees.
    assert.equal(bestOf(q), best, `${p.id}: the mechanic's biggest gap`);
    assert.equal(mechanicTriangles(q).length, tris.length, `${p.id}: the mechanic's triangles`);
    assert.equal(coverOf(q), cover, `${p.id}: the mechanic's covering`);
    // Certificates.
    if (q.goal === 'best') {
      assert.equal(cover, best, `${p.id}: every dot within ${best} steps of a home proves Best`);
      assert.deepEqual([...fatDots(q)].sort(), row.at, `${p.id}: the ochre rings go only where the biggest gap can be made`);
    }
    // On the tree, the dot on all three routes: the tripod's centre the child taps.
    const centre = row.cant === 'tree' ? ids(q).filter(u => tris[0].routes.every(r => r.includes(u))) : null;
    if (centre) { assert.equal(centre.length, 1, `${p.id}: one centre`); assert.equal(forcedCentre(q), centre[0], `${p.id}: the mechanic's centre`); assert.equal(p.solution.at, centre[0], `${p.id}: the witness taps it`); }
    const cant = centre ? {type: 'cant', at: centre[0]} : {type: 'cant'};
    if (row.cant === 'tree') { assert.equal(q.roads.length, ids(q).length - 1); assert.equal(best, 0); }
    if (row.cant === 'ladder') {
      const cols = Object.values(q.homes).map(id => xy(id)[0]), span = ([x, y]) => [Math.min(xy(q.homes[x])[0], xy(q.homes[y])[0]), Math.max(xy(q.homes[x])[0], xy(q.homes[y])[0])];
      for (let x = Math.min(...cols); x <= Math.max(...cols); x++) assert.ok(SIDES.filter(([, a, b]) => { const [lo, hi] = span([a, b]); return lo <= x && x <= hi; }).length >= 2, `${p.id}: two routes cross column ${x}`);
      assert.ok(q.k >= 2 && best <= 1);
    }
    assert.equal(Boolean(row.cant), q.goal === 'reach' && q.k > best, `${p.id}: Can’t is the answer exactly when no triangle reaches k`);

    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    assert.equal(nextHint(p, fresh).type, 'move', `${p.id}: a first hint`);

    // The witness, played as moves.
    const sol = p.solution;
    if (sol.claim === 'cant') {
      // Can't waits for the child's triangle: refused on a fresh board and
      // with one step still to draw.
      refuse(p, fresh, cant, 'Can’t before the triangle is drawn');
      const drawn = drawAll(p, fresh, tris[0].routes), last = SIDES.at(-1)[0];
      refuse(p, play(p, drawn, {type: 'cut', side: last, to: drawn.board.routes[last].at(-2)}), cant, 'Can’t with a route unfinished');
      assert.ok(!isSolved(p, drawn.board), `${p.id}: drawing alone does not solve`);
      for (const u of Object.keys(tris[0].gaps)) { const f = move(p, drawn, {type: 'flood', at: u}); if (f) assert.ok(!isSolved(p, f.board), `${p.id}: no flood reaches ${q.k}`); }
      assert.ok(isSolved(p, play(p, drawn, cant).board), `${p.id}: Can’t after drawing`);
      if (centre) {
        refuse(p, drawn, {type: 'cant'}, 'Can’t on a tree without the tap on the centre');
        for (const u of ids(q).filter(v => v !== centre[0])) {
          const missed = play(p, drawn, {type: 'cant', at: u});
          assert.equal(missed.board.told, 'miss', `${p.id}: a tap on ${u} is not the centre`);
          assert.ok(!isSolved(p, missed.board));
          refuse(p, missed, cant, `a second tap after missing at ${u}, on the same triangle`);
          const flooded = play(p, missed, {type: 'flood', at: u === tris[0].routes[0][0] ? tris[0].routes[1][0] : tris[0].routes[0][0]});
          refuse(p, flooded, cant, 'a second tap after a flood, on the same triangle');
          const undone = undoPress(p, flooded, x => JSON.stringify(x.board));
          assert.equal(undone.board.told, 'miss', `${p.id}: Undo of a flood keeps the missed tap`);
          refuse(p, undone, cant, 'a second tap after Undo, before a route changes');
        }
        hintSteps += hintsSolve(p, play(p, drawn, {type: 'cant', at: ids(q).find(v => v !== centre[0])}), 'after a tap that missed the centre');
      }
    } else {
      let a = drawAll(p, fresh, SIDES.map(([s]) => sol.routes[s]));
      if (q.goal === 'zero') assert.ok(isSolved(p, a.board), `${p.id}: every gap 0 solves`);
      else {
        a = play(p, a, {type: 'flood', at: sol.flood});
        if (q.goal === 'best') { assert.ok(!isSolved(p, a.board), `${p.id}: a flood alone is not Best`); a = play(p, a, {type: 'best'}); }
        assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      }
      assert.equal(move(p, a, {type: 'cut', side: 'AB', to: q.homes.A}), null, `${p.id}: nothing after a solve`);
    }

    // Hints alone: from fresh, after a wrong triangle, after a refused claim,
    // and after random play.
    hintSteps += hintsSolve(p, fresh, 'from fresh');
    const wrong = tris.find(t => need === null ? t.gap > 0 : t.gap < need);
    if (wrong) {
      let a = drawAll(p, fresh, wrong.routes);
      assert.ok(!isSolved(p, a.board), `${p.id}: a wrong triangle does not solve`);
      const u = Object.keys(wrong.gaps).find(v => wrong.gaps[v] === wrong.gap);
      if (q.goal !== 'zero') a = play(p, a, {type: 'flood', at: u});
      if (q.goal !== 'zero') assert.ok(!isSolved(p, a.board), `${p.id}: a flood short of the goal does not solve`);
      if (q.goal === 'best') {
        a = play(p, a, {type: 'best'});
        assert.equal(a.board.told, 'bigger', `${p.id}: a Best that can be beaten`);
        refuse(p, a, {type: 'best'}, 'Best twice on one flood');
        const back = undoPress(p, a, x => JSON.stringify(x.board));
        assert.ok(back.board.flood !== a.board.flood && back.board.told === null, `${p.id}: Undo goes back past a refused Best to before its flood`);
        hintSteps += hintsSolve(p, a, 'after a refused Best');
      } else hintSteps += hintsSolve(p, a, 'after a wrong triangle');
    }
    if (q.goal === 'reach' && !row.cant) {
      refuse(p, fresh, {type: 'cant'}, 'Can’t before the triangle is drawn');
      const a = play(p, drawAll(p, fresh, tris[0].routes), {type: 'cant'});
      assert.equal(a.board.told, 'can', `${p.id}: Can’t is refused`);
      assert.ok(!isSolved(p, a.board));
      refuse(p, a, {type: 'cant'}, 'Can’t twice without a change');
      assert.equal(mechanicFor(p).carry(p, a.board, undo(a).board).told, 'can', `${p.id}: Undo keeps “it can be done” while the routes are the same`);
      const back = undoPress(p, a, x => JSON.stringify(x.board));
      assert.ok(JSON.stringify(back.board.routes) !== JSON.stringify(a.board.routes) && back.board.told === null, `${p.id}: so one Undo goes back past it to the last step`);
      const withFlood = play(p, play(p, drawAll(p, fresh, tris[0].routes), {type: 'flood', at: Object.keys(tris[0].gaps).find(u => tris[0].gaps[u] < q.k)}), {type: 'cant'});
      const kept = undoPress(p, withFlood, x => JSON.stringify(x.board));
      assert.ok(kept.board.flood === null && kept.board.told === 'can', `${p.id}: or to the flood before it, keeping the answer`);
      refuse(p, kept, {type: 'cant'}, 'Can’t after Undo before a route changes');
      hintSteps += hintsSolve(p, a, 'after a refused Can’t');
    }
    for (let k = 0; k < 4; k++) hintSteps += hintsSolve(p, randomPlay(p, fresh, 6 + 5 * k), `after random play ${k}`);

    checkRefusals(p, fresh, tris, best);
  }
  return {gapPuzzles: puzzles.length, homeTriplesChecked: triplesChecked, hintSteps};
}

function checkRefusals(p, fresh, tris, best) {
  const q = p.parameters, all = ids(q), D = floyd(q), A = q.homes.A, B = q.homes.B;
  const far = all.find(v => v !== A && !hasRoad(q, A, v));
  // A step along a road that leads away from B, if there is one.
  const away = all.find(v => hasRoad(q, A, v) && D[v][B] > D[A][B]);
  for (const [action, why] of [[null, 'nothing'], ['draw', 'a string'], [{type: 'draw'}, 'no side'], [{type: 'draw', side: 'AC', to: all[0]}, 'an unknown side'], [{type: 'draw', side: 'AB', to: 'zz'}, 'an unknown dot'], [{type: 'draw', side: 'AB', to: far}, 'a step along no road'], [{type: 'draw', side: 'AB', to: A}, 'staying put'], [{type: 'cut', side: 'AB', to: A}, 'taking back an empty route'], [{type: 'flood', at: A}, 'a flood before the triangle is drawn'], [{type: 'fly'}, 'an unknown move']]) refuse(p, fresh, action, why);
  if (away) refuse(p, fresh, {type: 'draw', side: 'AB', to: away}, 'a step that makes the route longer than shortest');
  if (q.goal !== 'reach') refuse(p, fresh, {type: 'cant'}, 'Can’t where there is nothing to claim');
  if (q.kind !== 'tree') refuse(p, fresh, {type: 'cant', at: A}, 'a tap with Can’t off a tree');
  if (q.kind !== 'tree' && q.goal === 'reach') refuse(p, drawAll(p, fresh, tris[0].routes), {type: 'cant', at: A}, 'a tap with Can’t off a tree, on a drawn triangle');
  if (q.goal !== 'best') refuse(p, fresh, {type: 'best'}, 'Best outside a Best puzzle');
  else refuse(p, fresh, {type: 'best'}, 'Best before a flood');
  // On a drawn triangle: a flood off the routes, and the same flood twice.
  const t = tris[0], drawn = drawAll(p, fresh, t.routes), off = all.find(v => !(v in t.gaps));
  if (off) refuse(p, drawn, {type: 'flood', at: off}, 'a flood off the routes');
  const u = Object.keys(t.gaps)[0], once = move(p, drawn, {type: 'flood', at: u});
  if (once && !isSolved(p, once.board)) refuse(p, once, {type: 'flood', at: u}, 'the same flood twice');
  refuse(p, drawn, {type: 'draw', side: 'AB', to: t.routes[0].at(-2) ?? A}, 'a step past the end of a finished route');
  // Forged saves.
  const b = fresh.board, home = b.routes;
  const forged = [
    [{...b, routes: {...home, AB: ['zz']}}, 'a route off the map'],
    [{...b, routes: {...home, AB: [B]}}, 'a route that does not start at its home'],
    [{...b, routes: {...home, AB: [A, far]}}, 'a step along no road'],
    [{...b, routes: {AB: home.AB, BC: home.BC}}, 'a missing route'],
    [{...b, routes: {...home, AC: [A]}}, 'an unknown route'],
    [{...b, flood: A}, 'a flood on an unfinished triangle'],
    [{...b, told: 'maybe'}, 'an unknown answer'],
    [{...b, done: 'yes'}, 'a done flag that is not true or false'],
    [{...b, extra: 1}, 'an unknown field'],
    [{...drawn.board, flood: off ?? 'zz'}, 'a flood off the routes']
  ];
  if (away) forged.push([{...b, routes: {...home, AB: [A, away]}}, 'a route longer than shortest']);
  if (q.goal !== 'reach' || q.k <= best) forged.push([{...b, done: true}, 'a Can’t that is not right']);
  if (q.goal === 'reach' && q.k > best) forged.push([{...b, told: 'can'}, '“it can be done” when it can’t']);
  if (q.kind !== 'tree') forged.push([{...b, told: 'miss'}, 'a missed centre off the tree']);
  else forged.push([{...b, told: 'miss', done: true}, 'a missed centre that was solved']);
  if (q.goal === 'best') {
    const short = tris.find(x => x.gap < best);
    if (short) {
      const v = Object.keys(short.gaps).find(w => short.gaps[w] < best), routes = Object.fromEntries(SIDES.map(([s], k) => [s, short.routes[k]]));
      forged.push([{routes, flood: v, told: null, done: true}, 'a Best that can be beaten, kept']);
    }
    forged.push([{...b, told: 'bigger'}, '“bigger” with no flood']);
  }
  for (const [board, why] of forged) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}
export default validateGapflood;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateGapflood(), null, 2));
