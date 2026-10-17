// Checks the Corners pack (dist/families/corners/corners.json) by methods of
// its own, not the mechanic's:
// - corner angles from 180(n − 2)/n; every ring as a word over the menu,
//   brute force over every word of three to eight corners, turned and
//   flipped by doubling the word, against the table in docs/corners/README.md
//   and the counts the spec states (11 and 4 with triangles and squares, 25
//   and 4 with pentagons too, no flat ring with a pentagon);
// - every fixed-and-free ring with up to four fixed corners and six places
//   over every menu, filled every possible way, against the rule that the
//   smallest filling decides;
// - the folded corner of every ring that folds: each pair of neighbouring
//   edges at its corner's angle, every face plane with all other edges on one
//   side, and not flat;
// - each opened drawing drawn without crossings, its regions counted by
//   flooding a raster of the board (not by tracing faces), Euler's count
//   dots − lines + regions = pieces on random states, and every erasure: a
//   line on a loop takes one region and keeps the dots joined, any other cuts;
// - witnesses played as moves; hint chains from fresh, after wrong moves and
//   refused claims, and from random states; how often random fillings and
//   random shelves pass a claim; Undo keeping claims and always changing the
//   board; illegal moves; forged saves; the playground.
// Run: node scripts/validate-corners.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {coneOf, foldedFaces, facesOf} from '../dist/families/corners/corners.js';
import {loadPack} from './packs.mjs';

// --- Corners and rings, from first principles ------------------------------------
const SIDES = {T: 3, S: 4, P: 5};
const ANGLE = Object.fromEntries(Object.entries(SIDES).map(([c, n]) => [c, 180 * (n - 2) / n]));
const sum = word => [...word].reduce((s, c) => s + ANGLE[c], 0);
const kind = word => { const t = sum(word); return t < 360 ? 'point' : t === 360 ? 'flat' : 'over'; };
// The least of a word's turnings and flips, read off the doubled word.
function bracelet(word) {
  const n = word.length, rev = [...word].reverse().join('');
  let best = null;
  for (const w of [word + word, rev + rev]) for (let k = 0; k < n; k++) { const s = w.slice(k, k + n); if (best === null || s < best) best = s; }
  return best;
}
function* words(menu, n) {
  if (n === 0) { yield ''; return; }
  for (const w of words(menu, n - 1)) for (const c of menu) yield w + c;
}
// Every ring of three to eight corners from the menu with the given fold.
function ringsOf(menu, goal, count = 0) {
  const out = new Set();
  for (let n = 3; n <= 8; n++) {
    if (count && n !== count) continue;
    for (const w of words(menu, n)) if (kind(w) === goal) out.add(bracelet(w));
  }
  return [...out].sort();
}
// Every filling of the free places, in every order.
function fillingsOf(locked, count, menu) { return [...words(menu, count - locked.length)].map(w => locked.join('') + w); }
const smallestCorner = menu => [...menu].sort((a, b) => ANGLE[a] - ANGLE[b])[0];

// The spec's table.
const TABLE = {
  'corners-ring-01': {rings: ['TTT', 'TTTT', 'TTTTT']},
  'corners-ring-02': {fills: ['T']},
  'corners-ring-03': {rings: ['PPP', 'PPS', 'PSS', 'SSS']},
  'corners-ring-04': {rings: ['SSSS', 'SSTTT', 'STSTT', 'TTTTTT']},
  'corners-ring-05': {fills: ['TT']},
  'corners-ring-06': {fills: [], certificate: 'SSTTT', fold: 'flat'},
  'corners-ring-07': {rings: ['PTTTT', 'STTTT', 'TTTTT']},
  'corners-ring-08': {fills: [], certificate: 'PSSS', fold: 'over'},
  'corners-ring-09': {rings: ['SSS', 'SST', 'SSST', 'SSTT', 'STST', 'STT', 'STTT', 'STTTT', 'TTT', 'TTTT', 'TTTTT']},
  'corners-tree-01': {counts: [4, 6, 3], faces: 4},
  'corners-tree-02': {counts: [8, 12, 5], faces: 6},
  'corners-tree-03': {counts: [6, 12, 7], faces: 8}
};

// --- Opened drawings, by geometry ------------------------------------------------
const posOf = q => { const H = 100 / (q.aspect || 1.4); return Object.fromEntries(Object.entries(q.nodes).map(([id, [x, y]]) => [id, [x, y * H / 100]])); };
const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const segDist = ([x, y], [x1, y1], [x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - x1 - t * dx, y - y1 - t * dy); };
function checkPlane(q, why) {
  const pos = posOf(q);
  q.edges.forEach(([u, v], i) => q.edges.forEach(([a, b], j) => {
    if (j <= i || [u, v].some(x => [a, b].includes(x))) return;
    const P = pos[u], Q = pos[v], R = pos[a], S = pos[b];
    const cross = orient(P, Q, R) * orient(P, Q, S) < 0 && orient(R, S, P) * orient(R, S, Q) < 0;
    assert.ok(!cross, `${why}: lines ${u}${v} and ${a}${b} cross`);
  }));
  for (const [id, p] of Object.entries(pos)) q.edges.forEach(([u, v]) => { if (u !== id && v !== id) assert.ok(segDist(p, pos[u], pos[v]) > 4, `${why}: dot ${id} is clear of line ${u}${v}`); });
  assert.equal(new Set(q.edges.map(([u, v]) => [u, v].sort().join())).size, q.edges.length, `${why}: no line twice`);
}
// Bounded regions: flood the board's raster from its border; every other
// patch of open cells is a region.
const STEP = .4;
function rasterRegions(q, erased) {
  const pos = posOf(q), H = 100 / (q.aspect || 1.4), x0 = -4, y0 = -4, W = Math.ceil((108) / STEP), Ht = Math.ceil((H + 8) / STEP);
  const wall = new Uint8Array(W * Ht);
  q.edges.forEach(([u, v], i) => {
    if (erased.includes(i)) return;
    const [x1, y1] = pos[u], [x2, y2] = pos[v], len = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(len / (STEP / 3));
    for (let k = 0; k <= n; k++) {
      const x = x1 + (x2 - x1) * k / n, y = y1 + (y2 - y1) * k / n, cx = Math.floor((x - x0) / STEP), cy = Math.floor((y - y0) / STEP);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const X = cx + dx, Y = cy + dy; if (X >= 0 && Y >= 0 && X < W && Y < Ht && Math.hypot(x0 + (X + .5) * STEP - x, y0 + (Y + .5) * STEP - y) < STEP * .8) wall[Y * W + X] = 1; }
    }
  });
  const seen = new Uint8Array(W * Ht), sizes = [];
  const flood = start => { let n = 0; const stack = [start]; seen[start] = 1; while (stack.length) { const c = stack.pop(); n++; const X = c % W, Y = (c - X) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = X + dx, ny = Y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= Ht) continue; const d = ny * W + nx; if (!seen[d] && !wall[d]) { seen[d] = 1; stack.push(d); } } } return n; };
  flood(0);
  for (let c = 0; c < W * Ht; c++) if (!seen[c] && !wall[c]) sizes.push(flood(c));
  // Slivers between two lines near a shared dot are not regions.
  return sizes.filter(n => n > 40).length;
}
function piecesBfs(q, erased) {
  const ids = Object.keys(q.nodes), seen = new Set(), adj = Object.fromEntries(ids.map(id => [id, []]));
  q.edges.forEach(([u, v], i) => { if (!erased.includes(i)) { adj[u].push(v); adj[v].push(u); } });
  let pieces = 0;
  for (const id of ids) { if (seen.has(id)) continue; pieces++; const queue = [id]; seen.add(id); while (queue.length) for (const w of adj[queue.shift()]) if (!seen.has(w)) { seen.add(w); queue.push(w); } }
  return pieces;
}
const treeOk = (q, erased) => piecesBfs(q, erased) === 1 && q.edges.length - erased.length === Object.keys(q.nodes).length - 1;

// --- Folded corners ----------------------------------------------------------------
const dot3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross3 = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
function checkCone(word) {
  const ring = [...word], {e} = coneOf(ring), n = ring.length;
  assert.equal(e.length, n);
  let worst = 0;
  for (let i = 0; i < n; i++) {
    const u = e[i], v = e[(i + 1) % n];
    assert.ok(Math.abs(Math.hypot(...u) - 1) < 1e-9, `${word}: unit edges`);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot3(u, v)))) * 180 / Math.PI;
    worst = Math.max(worst, Math.abs(angle - ANGLE[ring[i]]));
    if (kind(word) === 'point') {
      // Every other edge strictly on one side of this face's plane.
      const nrm = cross3(u, v), sides = e.filter((_, j) => j !== i && j !== (i + 1) % n).map(w => dot3(nrm, w));
      assert.ok(sides.every(s => s > 1e-6) || sides.every(s => s < -1e-6), `${word}: face ${i} has the corner on one side`);
    }
  }
  assert.ok(worst < 1e-9, `${word}: face angles (off by ${worst})`);
  if (kind(word) === 'point') assert.ok(Math.abs(dot3(cross3(e[0], e[1]), e[2])) > 1e-6 || n > 3, `${word}: not flat`);
  const faces = foldedFaces(ring);
  assert.deepEqual(faces.map(fc => fc.screen.length), ring.map(c => SIDES[c]), `${word}: each face drawn with its sides`);
  return worst;
}

// --- Play ----------------------------------------------------------------------------
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const undoMove = (p, a) => { const next = undo(a), m = mechanicFor(p); return m.carry ? {...next, board: m.carry(p, a.board, next.board)} : next; };
const build = (p, a, word) => {
  // From any board: take out the free corners, then add the word's corners.
  const L = p.parameters.mode === 'make' ? p.parameters.locked.length : 0;
  let b = a;
  if (b.board.fold === 'point' || b.board.fold === 'flat') b = play(p, b, {type: 'unfold'});
  while (b.board.ring.length > L) b = play(p, b, {type: 'take', index: b.board.ring.length - 1});
  return play(p, b, ...[...word.slice(L)].map(piece => ({type: 'add', piece})));
};
function hintSolve(p, start, why, limit = 200) {
  let a = start, steps = 0, foldTold = false;
  const texts = [];
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${why}: a hint at step ${steps}`);
    assert.ok(typeof h.text === 'string' && h.text.length > 5, `${p.id} ${why}: the hint says something`);
    texts.push(h.text);
    if (h.action.type === 'fold' && /smallest/.test(h.text)) foldTold = true;
    if (h.action.type === 'cant') {
      assert.ok(foldTold || a.board.fold !== null, `${p.id} ${why}: the reason comes before Can't`);
      assert.notEqual(a.board.fold, null, `${p.id} ${why}: Can't after a fold`);
    }
    const next = move(p, a, h.action);
    assert.ok(next, `${p.id} ${why}: hint ${JSON.stringify(h.action)} is legal`);
    a = next;
    assert.ok(++steps <= limit, `${p.id} ${why}: hints finish`);
  }
  return {steps, texts, attempt: a};
}
// A random legal move.
function randomAction(p, a, rand) {
  const q = p.parameters, b = a.board;
  if (p.mechanic === 'corner-trees') return {type: 'line', line: Math.floor(rand() * q.edges.length)};
  const options = [...q.menu.map(piece => ({type: 'add', piece})), {type: 'fold'}, {type: 'unfold'}, {type: 'keep'}, {type: 'all'}, {type: 'cant'}];
  for (let i = 0; i < b.ring.length; i++) options.push({type: 'take', index: i});
  if (b.shelf) for (let i = 0; i < b.shelf.length; i++) options.push({type: 'drop', index: i});
  const legal = options.filter(x => move(p, a, x));
  // Claims are rare taps.
  const pool = legal.filter(x => !['all', 'cant'].includes(x.type) || rand() < .15);
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}
function seeded(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; }
const html = (p, a) => mechanicFor(p).render(p, a, {});

export async function validateCorners() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/corners/corners.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-56')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-56.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'corners');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.deepEqual(puzzles.map(p => p.id), Object.keys(TABLE), 'every puzzle in the table');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  for (const group of ['Rings', 'Trees']) {
    const list = puzzles.filter(p => p.group === group);
    assert.deepEqual(list.map(p => p.number), list.map((_, i) => i + 1), `${group}: numbers run 1..n`);
    assert.equal(new Set(list.map(p => p.mechanic)).size, 1, `${group}: one mechanic`);
    assert.deepEqual([...new Set(list.map(p => p.difficulty_level))], ['easy', 'medium', 'hard'], `${group}: easy, medium and hard in order`);
  }
  assert.ok(puzzles.every(p => p.band === 'all' && p.libraryFamily === 'corners' && ['Rings', 'Trees'].includes(p.group)), 'two flat groups in the family');

  // The theorems, by brute force over words.
  const counts = {};
  for (const menu of [['T'], ['S'], ['P'], ['T', 'S'], ['T', 'P'], ['S', 'P'], ['T', 'S', 'P']]) counts[menu.join('')] = {point: ringsOf(menu, 'point'), flat: ringsOf(menu, 'flat')};
  assert.equal(counts.TS.point.length, 11, 'triangles and squares: 11 rings fold to a point');
  assert.equal(new Set(counts.TS.point.map(w => [...w].sort().join(''))).size, 10, '… from 10 sets of corners');
  assert.deepEqual(counts.TS.flat, ['SSSS', 'SSTTT', 'STSTT', 'TTTTTT'], 'triangles and squares: 4 lie flat');
  assert.equal(counts.TSP.point.length, 25, 'with pentagons: 25 fold to a point');
  assert.equal(counts.TSP.point.length - counts.TS.point.length, 14, 'pentagons add 14');
  assert.deepEqual(counts.TSP.flat, counts.TS.flat, 'no flat ring has a pentagon');
  assert.deepEqual(counts.T.point, ['TTT', 'TTTT', 'TTTTT']);
  // A corner exists only when each angle is less than the others together; every angle here is less than two triangles.
  assert.ok(Object.values(ANGLE).every(x => x < 2 * ANGLE.T), 'every corner is less than any two others');

  // The smallest filling decides, for every fixed start, size and menu.
  let recipes = 0;
  for (const menu of [['T', 'S'], ['T', 'P'], ['S', 'P'], ['T', 'S', 'P'], ['S'], ['P']]) for (let L = 0; L <= 4; L++) for (const locked of words(['T', 'S', 'P'], L)) for (let count = Math.max(3, L + 1); count <= 6; count++) {
    const fills = fillingsOf([...locked], count, menu), any = fills.some(w => kind(w) === 'point');
    const small = locked + smallestCorner(menu).repeat(count - L);
    assert.equal(any, kind(small) === 'point', `${locked} + ${count - L} from ${menu}: the smallest filling decides`);
    recipes++;
  }

  // Every ring that folds, folded.
  let worstAngle = 0;
  for (const w of [...counts.TSP.point, ...counts.TSP.flat]) worstAngle = Math.max(worstAngle, checkCone(w));

  // One hint per puzzle first, so the timings below measure the code.
  for (const p of pack.puzzles) nextHint(p, freshAttempt(p));
  const stats = {recipes, worstAngle, foldedRings: counts.TSP.point.length + counts.TSP.flat.length, claimShares: {}, hintSteps: {}, rasterStates: 0};
  for (const p of pack.puzzles) {
    assert.ok(p.id.startsWith('corners-'));
    for (const field of ['objective', 'controls', 'idea', 'prerequisites', 'provenance', 'familyTitle']) assert.ok(typeof p[field] === 'string' && p[field].length > 5, `${p.id}: ${field}`);
    assert.equal(typeof p.visibleObjective, 'string', `${p.id}: visibleObjective`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && p.hints.length === 3, `${p.id}: rules and three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent ${field}`);
    assert.ok(p.parent.sourceIds.every(id => pack.sources.some(s => s.id === id)), `${p.id}: sources`);
    assert.ok(!/Can’t|That’s all/.test(p.hints[0]), `${p.id}: the first hint makes no claim`);
    assert.ok(!/\d+ (rings|ways)/.test(p.visibleObjective + p.title), `${p.id}: no count in the objective or title`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board), `${p.id}: starts valid`);
    assert.ok(!isSolved(p, fresh.board), `${p.id}: starts unsolved`);
    if (p.band === 'playground') { checkPlayground(p, fresh); continue; }
    if (p.mechanic === 'corners') checkRing(p, fresh, TABLE[p.id], stats);
    else checkTree(p, fresh, TABLE[p.id], stats);
  }
  return stats;
}

// --- Rings ------------------------------------------------------------------------
function checkRing(p, fresh, row, stats) {
  const q = p.parameters, rand = seeded(p.number * 7919);
  if (q.mode === 'every') {
    const answers = ringsOf(q.menu, q.goal, q.count || 0);
    assert.deepEqual(answers, [...row.rings].sort(), `${p.id}: the rings, by brute force`);
    assert.deepEqual([...p.solution.rings].map(bracelet).sort(), answers, `${p.id}: the pack's rings`);
    // The witness: build and keep each ring, in some turning, then That's all.
    let a = fresh;
    for (const w of answers) { a = build(p, a, w.slice(1) + w[0]); a = play(p, a, {type: 'keep'}); }
    a = play(p, a, {type: 'all'});
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
    // A turned or flipped copy is already on the shelf.
    let b = build(p, fresh, answers[0]);
    b = play(p, b, {type: 'keep'});
    b = build(p, b, [...answers[0]].reverse().join(''));
    b = play(p, b, {type: 'keep'});
    assert.equal(b.board.again, 0, `${p.id}: a flipped ring is the same ring`);
    assert.equal(b.board.shelf.length, 1);
    assert.equal(move(p, b, {type: 'keep'}), null, `${p.id}: Keep is off until the ring changes`);
    // That's all: one short refusal, kept through Undo until the shelf changes.
    const short = play(p, build(p, fresh, answers[0]), {type: 'keep'});
    const told = play(p, short, {type: 'all'});
    if (answers.length > 1) {
      assert.deepEqual(told.board.refused, {kind: 'more'}, `${p.id}: There is another`);
      assert.ok(!isSolved(p, told.board));
      assert.equal(move(p, told, {type: 'all'}), null, `${p.id}: That's all is off until the shelf changes`);
      const back = undoMove(p, told);
      assert.deepEqual(back.board.refused, {kind: 'more'}, `${p.id}: Undo keeps the refusal`);
      assert.equal(back.board.shown, false);
      assert.notEqual(html(p, back), html(p, told), `${p.id}: Undo changes the board`);
      assert.equal(move(p, back, {type: 'all'}), null, `${p.id}: still locked after Undo`);
      const changed = play(p, build(p, back, answers[1]), {type: 'keep'});
      assert.equal(changed.board.refused, null, `${p.id}: a new shelf clears the lock`);
      const again = undoMove(p, undoMove(p, told));
      assert.equal(again.board.refused, null, `${p.id}: Undo past the shelf clears it`);
    }
    // A wrong ring on the shelf: "This one …", ringed.
    const wrongGoal = q.goal === 'point' ? 'flat' : 'point';
    const wrong = ringsOf(q.menu, wrongGoal, q.count || 0)[0] || ringsOf(q.menu, 'over', q.count || 0)[0];
    let w = fresh;
    for (const r of answers) w = play(p, build(p, w, r), {type: 'keep'});
    w = play(p, build(p, w, wrong), {type: 'keep'});
    w = play(p, w, {type: 'all'});
    assert.deepEqual(w.board.refused, {kind: 'off', index: answers.length}, `${p.id}: the wrong ring is named`);
    assert.match(html(p, w), /This one (lies flat|overlaps|folds to a point)\./, `${p.id}: one short refusal`);
    assert.ok(!/\d/.test(html(p, w).match(/<p class="cr-told">([^<]*)/)[1]), `${p.id}: the refusal prints no number`);
    stats.hintSteps[p.id] = hintSolve(p, w, 'after a refused That’s all').steps;
    // Random shelves of the right size pass That's all how often?
    // Every ring a child can keep here: three to eight corners (or the count).
    const pool = ['point', 'flat', 'over'].flatMap(goal => ringsOf(q.menu, goal, q.count || 0));
    let passed = 0;
    const tries = 400;
    for (let t = 0; t < tries; t++) {
      const shelf = [...pool];
      for (let i = shelf.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shelf[i], shelf[j]] = [shelf[j], shelf[i]]; }
      shelf.length = answers.length;
      if (shelf.slice().sort().join() === answers.join()) passed++;
    }
    stats.claimShares[p.id] = `${passed}/${tries} random shelves of ${answers.length} from ${pool.length} rings pass`;
    assert.ok(passed / tries < .1, `${p.id}: That's all can fail (${stats.claimShares[p.id]})`);
  } else {
    const fillings = fillingsOf(q.locked, q.count, q.menu), folds = [...new Set(fillings.filter(w => kind(w) === 'point').map(w => [...w.slice(q.locked.length)].sort().join('')))].sort();
    assert.deepEqual(folds, row.fills, `${p.id}: the fillings, by brute force`);
    assert.deepEqual(p.solution.fills, folds, `${p.id}: the pack's fillings`);
    if (folds.length) {
      const a = play(p, build(p, fresh, q.locked.join('') + folds[0]), {type: 'fold'});
      assert.ok(isSolved(p, a.board), `${p.id}: the witness folds`);
      // Can't on a ring that could fold is refused.
      const off = fillings.find(w => kind(w) !== 'point');
      const c = play(p, build(p, fresh, off), {type: 'fold'}, {type: 'cant'});
      assert.ok(!isSolved(p, c.board), `${p.id}: Can't is refused`);
      assert.equal(c.board.refused.kind, 'smaller');
    } else {
      const small = q.locked.join('') + smallestCorner(q.menu).repeat(q.count - q.locked.length);
      assert.equal(small, row.certificate, `${p.id}: the certificate`);
      assert.equal(kind(small), row.fold, `${p.id}: the certificate ${row.fold === 'flat' ? 'lies flat' : 'overlaps'}`);
      assert.deepEqual(p.solution.certificate.join(''), small);
      const unfolded = build(p, fresh, small);
      assert.equal(move(p, unfolded, {type: 'cant'}), null, `${p.id}: Can't needs a fold first`);
      const a = play(p, unfolded, {type: 'fold'}, {type: 'cant'});
      assert.ok(isSolved(p, a.board), `${p.id}: the certificate is accepted`);
      assert.match(html(p, a), /Even the smallest corners/, `${p.id}: the argument is drawn`);
      // Every filling, folded, then Can't: how many pass?
      let passed = 0;
      for (const w of fillings) { const b = play(p, build(p, fresh, w), {type: 'fold'}, {type: 'cant'}); if (isSolved(p, b.board)) passed++; }
      assert.equal(passed, 1, `${p.id}: only the smallest filling proves it`);
      stats.claimShares[p.id] = `${passed}/${fillings.length} fillings pass Can't`;
      // A refusal: kept through Undo, the board still changes, and a new ring clears it.
      const wrong = fillings.find(w => w !== small);
      const told = play(p, build(p, fresh, wrong), {type: 'fold'}, {type: 'cant'});
      assert.equal(told.board.refused.kind, 'smaller');
      assert.match(html(p, told), /This corner could be smaller\./);
      const back = undoMove(p, told);
      assert.deepEqual(back.board.refused, told.board.refused, `${p.id}: Undo keeps Can't's answer`);
      assert.notEqual(html(p, back), html(p, told), `${p.id}: Undo changes the board`);
      assert.equal(move(p, back, {type: 'cant'}), null, `${p.id}: Can't stays off`);
      assert.equal(move(p, play(p, back, {type: 'take', index: q.count - 1}), {type: 'add', piece: q.menu[0]}).board.refused, null, `${p.id}: a changed ring clears it`);
      stats.hintSteps[`${p.id} after a refused Can’t`] = hintSolve(p, told, 'after a refused Can’t').steps;
    }
    // A Can't refusal on a possible puzzle uses the same words.
    for (const [action, why] of [[{type: 'take', index: 0}, 'a fixed corner']]) if (q.locked.length) assert.equal(move(p, fresh, action), null, `${p.id}: no taking ${why}`);
  }
  // Hints from fresh, after wrong moves and from random states.
  stats.hintSteps[p.id + ' fresh'] = hintSolve(p, fresh, 'from fresh').steps;
  for (let t = 0; t < 40; t++) {
    let a = fresh;
    const k = 1 + Math.floor(rand() * 8);
    for (let i = 0; i < k && !isSolved(p, a.board); i++) { const x = randomAction(p, a, rand); if (!x) break; a = move(p, a, x); }
    if (isSolved(p, a.board)) continue;
    hintSolve(p, a, `after ${k} random moves`);
  }
  // Illegal moves.
  const b0 = fresh;
  for (const [action, why] of [[{type: 'add', piece: 'H'}, 'a hexagon'], [{type: 'take', index: 9}, 'a missing corner'], [{type: 'fold'}, 'folding too few'], [{type: 'unfold'}, 'unfolding a flat ring'], [{type: 'drop', index: 0}, 'an empty shelf'], [{type: 'all'}, 'That’s all with nothing kept'], [{type: 'cant'}, 'Can’t on a fresh board'], [{type: 'spin'}, 'an unknown move'], [null, 'no move']]) assert.equal(move(p, b0, action), null, `${p.id}: refuses ${why}`);
  const full = build(p, fresh, q.mode === 'every' ? 'TTTTTTTT'.slice(0, q.count || 8).replace(/T/g, q.menu[0]) : q.locked.join('') + q.menu[0].repeat(q.count - q.locked.length));
  assert.equal(move(p, full, {type: 'add', piece: q.menu[0]}), null, `${p.id}: no corner past the last place`);
  if (q.mode === 'make') assert.equal(move(p, full, {type: 'keep'}), null, `${p.id}: no Keep`);
  if (q.mode === 'every') assert.equal(move(p, full, {type: 'cant'}), null, `${p.id}: no Can't`);
  // Forged saves.
  const forged = q.mode === 'every' ? [
    [{...b0.board, done: true}, 'done with nothing kept'],
    [{...b0.board, shelf: [[...ringsOf(q.menu, q.goal, q.count || 0)[0]]], done: true}, 'done with one ring'],
    [{...b0.board, shelf: [['T', 'T', 'T'], ['T', 'T', 'T']]}, 'a ring kept twice'],
    [{...b0.board, shelf: [['T', 'T']]}, 'a ring of two'],
    [{...b0.board, shown: true}, 'words with no answer'],
    [{...b0.board, refused: {kind: 'more'}}, 'a refusal with nothing kept'],
    [{...b0.board, again: 0}, 'a copy pointer with nothing kept'],
    [{...b0.board, ring: ['H', 'T', 'T']}, 'a hexagon'],
    [{...b0.board, ring: ['T', 'T', 'T'], fold: 'flat'}, 'a fold that doesn’t match'],
    [{...b0.board, ring: ['T', 'T'], fold: 'point'}, 'a fold of two corners'],
    [{...b0.board, extra: 1}, 'an extra field'],
    [{ring: []}, 'missing fields']
  ] : [
    [{...b0.board, claimed: true}, 'a claim on a fresh board'],
    [{...build(p, fresh, q.locked.join('') + q.menu.at(-1).repeat(q.count - q.locked.length)).board, claimed: true, fold: kind(q.locked.join('') + q.menu.at(-1).repeat(q.count - q.locked.length))}, 'a claim on a ring with bigger corners'],
    [{...b0.board, ring: q.locked.length ? q.locked.slice(1) : ['T']}, 'a fixed corner taken out'],
    [{...b0.board, refused: {kind: 'smaller', index: 0}}, 'a refusal on a part ring'],
    [{...b0.board, refused: {kind: 'folds'}}, 'a refusal Can’t never gives'],
    [{...b0.board, shown: true}, 'words with no answer'],
    [{...b0.board, extra: 1}, 'an extra field']
  ];
  if (q.mode === 'make' && !p.solution.fills.length) {
    const small = build(p, fresh, p.solution.certificate.join(''));
    forged.push([{...small.board, claimed: true}, 'a claim with no fold']);
  }
  if (q.mode === 'make' && p.solution.fills.length) {
    const ok = build(p, fresh, q.locked.join('') + p.solution.fills[0]);
    forged.push([{...ok.board, fold: 'flat'}, 'a ring that folds saved as flat']);
  }
  for (const [board, why] of forged) {
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why} is no solve`);
  }
}

// --- Trees ------------------------------------------------------------------------
function checkTree(p, fresh, row, stats) {
  const q = p.parameters, V = Object.keys(q.nodes).length, rand = seeded(p.number * 104729);
  checkPlane(q, p.id);
  const regions0 = rasterRegions(q, []);
  assert.deepEqual([V, q.edges.length, regions0], row.counts, `${p.id}: dots, lines and regions, by raster`);
  assert.equal(regions0 + 1, row.faces, `${p.id}: the regions and the missing face are the solid's faces`);
  assert.equal(V - q.edges.length + row.faces, 2, `${p.id}: V − E + F = 2 on the solid`);
  assert.equal(piecesBfs(q, []), 1, `${p.id}: one piece`);
  // The witness route.
  let a = fresh;
  for (const line of p.solution.route) { a = play(p, a, {type: 'line', line}); }
  assert.ok(isSolved(p, a.board) && treeOk(q, a.board.erased), `${p.id}: the route leaves a tree`);
  // Euler's count and the erasure rule on random states, against the mechanic's regions.
  const states = [[]];
  for (let t = 0; t < 24; t++) { const k = Math.floor(rand() * q.edges.length); states.push([...new Set(Array.from({length: k}, () => Math.floor(rand() * q.edges.length)))].sort((x, y) => x - y)); }
  for (const erased of states) {
    const regions = rasterRegions(q, erased), pieces = piecesBfs(q, erased), lines = q.edges.length - erased.length;
    stats.rasterStates++;
    assert.equal(facesOf(q, erased).closed.length, regions, `${p.id} ${erased}: the mechanic's regions match the raster`);
    assert.equal(V - lines + regions, pieces, `${p.id} ${erased}: dots − lines + regions = pieces`);
    q.edges.forEach((_, i) => {
      if (erased.includes(i)) return;
      const after = [...erased, i].sort((x, y) => x - y), r2 = rasterRegions(q, after), p2 = piecesBfs(q, after);
      stats.rasterStates++;
      if (p2 === pieces) assert.equal(r2, regions - 1, `${p.id} ${erased} − ${i}: a line on a loop takes one region`);
      else assert.ok(p2 === pieces + 1 && r2 === regions, `${p.id} ${erased} − ${i}: any other line cuts`);
      // The board says which: a cut line has the same space on both sides.
      const faces = facesOf(q, erased), same = faces.walkSides[i][0] === faces.walkSides[i][1];
      assert.equal(same, p2 > pieces, `${p.id} ${erased} − ${i}: the mechanic sees the cut`);
    });
  }
  // Hints from fresh, after wrong moves and from random states.
  const fromFresh = hintSolve(p, fresh, 'from fresh');
  assert.equal(fromFresh.steps, row.counts[2], `${p.id}: hints erase one line per region`);
  stats.hintSteps[p.id + ' fresh'] = fromFresh.steps;
  for (const erased of states) {
    const b = {...fresh, board: {erased}};
    assert.ok(validBoard(p, b.board));
    if (!isSolved(p, b.board)) hintSolve(p, b, `from ${erased}`);
  }
  // After a wrong move: a line that cuts dots off.
  const cutter = (() => { for (let k = 1; k <= p.solution.route.length; k++) { const erased = p.solution.route.slice(0, k).sort((x, y) => x - y); const i = q.edges.findIndex((_, j) => !erased.includes(j) && piecesBfs(q, [...erased, j]) > 1); if (i >= 0) return {erased, i}; } return null; })();
  assert.ok(cutter, `${p.id}: some line cuts`);
  const cut = play(p, {...fresh, board: {erased: cutter.erased}}, {type: 'line', line: cutter.i});
  assert.match(html(p, cut), /gb-node cut/, `${p.id}: cut-off dots are marked`);
  const mended = hintSolve(p, cut, 'after a cut');
  assert.equal(nextHint(p, cut).action.line, cutter.i, `${p.id}: the first hint draws the cut line back`);
  assert.ok(mended.steps >= 1);
  // Illegal moves and forged saves.
  for (const [action, why] of [[{type: 'line', line: q.edges.length}, 'a missing line'], [{type: 'line', line: -1}, 'a negative line'], [{type: 'line', line: 1.5}, 'half a line'], [{type: 'dot', id: 'A'}, 'a dot'], [null, 'no move']]) assert.equal(move(p, fresh, action), null, `${p.id}: refuses ${why}`);
  assert.equal(move(p, a, {type: 'line', line: 0}), null, `${p.id}: no move after the solve`);
  for (const [board, why] of [[{erased: [1, 0]}, 'lines out of order'], [{erased: [0, 0]}, 'a line twice'], [{erased: [q.edges.length]}, 'a missing line'], [{erased: [], done: true}, 'a forged done'], [{}, 'no field'], [{erased: 'all'}, 'not a list']]) {
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why} is no solve`);
  }
  // Erasing every line is no tree.
  assert.equal(isSolved(p, {erased: q.edges.map((_, i) => i)}), false, `${p.id}: no lines is no tree`);
}

// --- Playground ------------------------------------------------------------------
function checkPlayground(p, fresh) {
  const m = mechanicFor(p);
  assert.equal(m.noHint(p), true, `${p.id}: no Hint`);
  assert.equal(nextHint(p, fresh).type, 'done');
  let a = play(p, fresh, {type: 'add', piece: 'S'}, {type: 'add', piece: 'S'}, {type: 'add', piece: 'S'}, {type: 'fold'});
  assert.equal(a.board.fold, 'point', `${p.id}: a cube corner folds`);
  assert.ok(!isSolved(p, a.board), `${p.id}: never solved`);
  a = play(p, a, {type: 'unfold'}, {type: 'add', piece: 'S'}, {type: 'fold'});
  assert.equal(a.board.fold, 'flat');
  a = play(p, a, {type: 'add', piece: 'P'}, {type: 'fold'});
  assert.equal(a.board.fold, 'over');
  for (let i = 0; i < 3; i++) a = play(p, a, {type: 'add', piece: 'T'});
  assert.equal(a.board.ring.length, 8);
  assert.equal(move(p, a, {type: 'add', piece: 'T'}), null, `${p.id}: eight corners at most`);
  for (const action of [{type: 'keep'}, {type: 'all'}, {type: 'cant'}]) assert.equal(move(p, a, action), null, `${p.id}: no claims`);
  for (const [board, why] of [[{...fresh.board, shelf: []}, 'a shelf'], [{ring: ['T', 'T', 'T'], fold: 'flat'}, 'a wrong fold'], [{ring: ['H']}, 'a missing field']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
}

export default validateCorners;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCorners(), null, 2));
