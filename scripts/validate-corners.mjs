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
//   side, not flat, every face seen from outside and at least a fifth of it
//   showing, and a ring turned round drawn alike;
// - each opened drawing drawn without crossings, its regions counted by
//   flooding a raster of the board (not by tracing faces), Euler's count
//   dots − lines + regions = pieces on random states, and every erasure: a
//   line on a loop takes one region (one tint fewer) and keeps the dots
//   joined, any other cuts; end dots taken off a tree leave a tree;
// - witnesses played as moves; hint chains from fresh, after wrong moves and
//   refused claims, and from random states; how often random fillings and
//   random shelves pass a claim; that Can't's refusal is the same words with
//   nothing marked on every ring of every Make puzzle, so following it solves
//   nothing; that the first shape button in every place solves no Make
//   puzzle; That's all with a ring kept twice; Undo keeping claims and always
//   changing the board; illegal moves; forged saves; the playground.
// Run: node scripts/validate-corners.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {coneOf, foldedFaces, facesOf, tintsOf} from '../dist/families/corners/corners.js';
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
// Every reading of a word: turned and flipped.
const readings = word => { const n = word.length, out = new Set(); for (const w of [word, [...word].reverse().join('')]) for (let k = 0; k < n; k++) out.add(w.slice(k) + w.slice(0, k)); return [...out]; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameRing = (a, b) => a.length === b.length && bracelet(a.join('')) === bracelet(b.join(''));
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
  'corners-ring-05': {fills: ['SST'], goal: 'flat'},
  'corners-ring-06': {fills: [], certificate: 'SSTTT', fold: 'flat'},
  'corners-ring-07': {rings: ['PTTTT', 'STTTT', 'TTTTT']},
  'corners-ring-08': {fills: [], certificate: 'PSSS', fold: 'over'},
  'corners-ring-09': {rings: ['SSS', 'SST', 'SSST', 'SSTT', 'STST', 'STT', 'STTT', 'STTTT', 'TTT', 'TTTT', 'TTTTT']},
  'corners-tree-01': {counts: [4, 6, 3], faces: 4},
  'corners-tree-02': {counts: [9, 13, 5], faces: 6},
  'corners-tree-03': {counts: [6, 12, 7], faces: 8, leaves: true}
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
  assert.deepEqual(faces.map(fc => fc.screen.length).sort(), ring.map(c => SIDES[c]).sort(), `${word}: each face drawn with its sides`);
  // Every face is seen from outside, at least a fifth of it showing (its
  // drawn area against a regular polygon of side 30), and a ring turned
  // round is drawn alike.
  const area = pts => Math.abs(pts.reduce((s, [x1, y1], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x1 * y2 - x2 * y1; }, 0) / 2);
  const full = c => SIDES[c] * 900 / (4 * Math.tan(Math.PI / SIDES[c]));
  let least = Infinity;
  for (const fc of faces) { assert.ok(fc.outside, `${word}: face ${fc.i} seen from outside`); least = Math.min(least, area(fc.screen) / full(fc.c)); }
  assert.ok(least > .2, `${word}: every face shows (${least.toFixed(2)})`);
  for (let k = 1; k < n; k++) assert.deepEqual(foldedFaces([...ring.slice(k), ...ring.slice(0, k)]), faces, `${word}: turned round, drawn alike`);
  return {worst, least};
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
  if (p.mechanic === 'corner-trees') {
    const legal = [...q.edges.map((_, line) => ({type: 'line', line})), ...Object.keys(q.nodes).map(id => ({type: 'dot', id}))].filter(x => move(p, a, x));
    return legal.length ? legal[Math.floor(rand() * legal.length)] : null;
  }
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
  let worstAngle = 0, leastFace = Infinity;
  for (const w of [...counts.TSP.point, ...counts.TSP.flat]) { const {worst, least} = checkCone(w); worstAngle = Math.max(worstAngle, worst); leastFace = Math.min(leastFace, least); }

  // One hint per puzzle first, so the timings below measure the code.
  for (const p of pack.puzzles) nextHint(p, freshAttempt(p));
  const stats = {recipes, worstAngle, leastFaceShown: Number(leastFace.toFixed(3)), foldedRings: counts.TSP.point.length + counts.TSP.flat.length, claimShares: {}, followers: {}, firstButton: {}, hintSteps: {}, rasterStates: 0};
  const cantWords = new Set();
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
    if (p.mechanic === 'corners') checkRing(p, fresh, TABLE[p.id], stats, cantWords);
    else checkTree(p, fresh, TABLE[p.id], stats);
  }
  // Can't's refusal: one sentence on every Make puzzle, possible or not.
  assert.equal(cantWords.size, 1, `Can't refuses in the same words everywhere (${[...cantWords].join(' | ')})`);
  stats.cantRefusal = [...cantWords][0];
  return stats;
}

// --- Rings ------------------------------------------------------------------------
// The words under the board and on the shelf, and which corners and shelf rings are marked.
const boardWords = h => h.match(/<p class="cr-told">([^<]*)<\/p>/)?.[1] ?? null;
const shelfWords = h => h.match(/<p class="cr-shelf-told">([^<]*)<\/p>/)?.[1] ?? null;
const ringedOnShelf = h => (h.match(/cr-shelf-item ringed/g) || []).length;
function checkRing(p, fresh, row, stats, cantWords) {
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
    // The solved shelf is the case check: rows by number of corners, the
    // child's rings in order of total, each row ending with the smallest ring
    // of its size too big for the goal.
    checkCases(p, a, answers);
    // Keep judges nothing: a copy of a kept ring goes on the shelf, and Keep
    // is off only while the ring is, corner for corner, the one just kept.
    const kept = play(p, build(p, fresh, answers[0]), {type: 'keep'});
    assert.equal(move(p, kept, {type: 'keep'}), null, `${p.id}: Keep is off until the ring changes`);
    // A copy: another reading of a kept ring, else the ring itself kept again after another.
    const reading = answers.flatMap(r => readings(r).filter(v => v !== r).map(v => [r, v]))[0];
    const keepCopy = (b, r) => {
      if (reading && r === reading[0]) return play(p, build(p, b, reading[1]), {type: 'keep'});
      const between = answers.find(x => x !== r && !b.board.shelf.some(y => y.join('') === x));
      const c = same(b.board.shelf.at(-1), [...r]) ? play(p, build(p, b, between), {type: 'keep'}) : b;
      return play(p, build(p, c, r), {type: 'keep'});
    };
    const base = reading ? reading[0] : answers[0];
    // "There is another.", then a copy kept: the words go, nothing is marked, and That's all finds the pair.
    const one = play(p, play(p, build(p, fresh, base), {type: 'keep'}), {type: 'all'});
    assert.deepEqual(one.board.refused, {kind: 'more'}, `${p.id}: There is another`);
    assert.equal(shelfWords(html(p, one)), 'There is another.', `${p.id}: the answer sits on the shelf`);
    assert.equal(boardWords(html(p, one)), null, `${p.id}: not under the board`);
    assert.equal(ringedOnShelf(html(p, one)), 0, `${p.id}: nothing marked`);
    const two = keepCopy(one, base);
    assert.equal(shelfWords(html(p, two)), null, `${p.id}: keeping a copy clears the words`);
    assert.equal(ringedOnShelf(html(p, two)), 0, `${p.id}: and marks nothing`);
    const pair = play(p, two, {type: 'all'});
    assert.equal(pair.board.refused.kind, 'same', `${p.id}: That's all finds the ring kept twice`);
    assert.equal(shelfWords(html(p, pair)), 'These two are the same ring.');
    assert.equal(ringedOnShelf(html(p, pair)), 2, `${p.id}: the pair is marked`);
    assert.ok(pair.board.refused.pair.every(i => sameRing(pair.board.shelf[i], [...base])), `${p.id}: the pair is the ring kept twice`);
    stats.hintSteps[`${p.id} after a ring kept twice`] = hintSolve(p, pair, 'after a ring kept twice').steps;
    // That's all: one short refusal, kept through Undo until the shelf changes.
    if (answers.length > 1) {
      const told = one;
      assert.ok(!isSolved(p, told.board));
      assert.equal(move(p, told, {type: 'all'}), null, `${p.id}: That's all is off until the shelf changes`);
      const back = undoMove(p, told);
      assert.deepEqual(back.board.refused, {kind: 'more'}, `${p.id}: Undo keeps the refusal`);
      assert.equal(back.board.shown, false);
      assert.notEqual(html(p, back), html(p, told), `${p.id}: Undo changes the board`);
      assert.equal(move(p, back, {type: 'all'}), null, `${p.id}: still locked after Undo`);
      // A ring changed on the board leaves the shelf's answer where it is.
      const other = build(p, told, answers.find(r => r !== base));
      assert.equal(shelfWords(html(p, other)), 'There is another.', `${p.id}: the shelf's answer stays while the board changes`);
      const changed = play(p, other, {type: 'keep'});
      assert.equal(changed.board.refused, null, `${p.id}: a new shelf clears the lock`);
      const again = undoMove(p, undoMove(p, told));
      assert.equal(again.board.refused, null, `${p.id}: Undo past the shelf clears it`);
    }
    // A wrong ring on the shelf: "This one …", marked alone. A copy kept over
    // that refusal clears it; That's all then names the wrong ring again, and
    // with it gone, the pair.
    const wrongGoal = q.goal === 'point' ? 'flat' : 'point';
    const wrong = ringsOf(q.menu, wrongGoal, q.count || 0)[0] || ringsOf(q.menu, 'over', q.count || 0)[0];
    let w = fresh;
    for (const r of answers) w = play(p, build(p, w, r), {type: 'keep'});
    w = play(p, build(p, w, wrong), {type: 'keep'});
    w = play(p, w, {type: 'all'});
    assert.deepEqual(w.board.refused, {kind: 'off', index: answers.length}, `${p.id}: the wrong ring is named`);
    assert.match(shelfWords(html(p, w)) || '', /^This one (lies flat|overlaps|folds to a point)\.$/, `${p.id}: one short refusal`);
    assert.equal(ringedOnShelf(html(p, w)), 1, `${p.id}: one ring marked`);
    assert.ok(!/\d/.test(shelfWords(html(p, w))), `${p.id}: the refusal prints no number`);
    stats.hintSteps[p.id] = hintSolve(p, w, 'after a refused That’s all').steps;
    const over = keepCopy(w, base);
    assert.equal(shelfWords(html(p, over)), null, `${p.id}: a copy kept over a refusal clears its words`);
    assert.equal(ringedOnShelf(html(p, over)), 0, `${p.id}: and its mark`);
    const first = play(p, over, {type: 'all'});
    assert.deepEqual(first.board.refused, {kind: 'off', index: answers.length}, `${p.id}: the wrong ring first`);
    assert.equal(ringedOnShelf(html(p, first)), 1, `${p.id}: one thing marked at a time`);
    const then = play(p, play(p, first, {type: 'drop', index: answers.length}), {type: 'all'});
    assert.equal(then.board.refused.kind, 'same', `${p.id}: then the ring kept twice`);
    assert.equal(ringedOnShelf(html(p, then)), 2);
    // Random shelves of the right size pass That's all how often?
    // Every ring a child can keep here: three to eight corners (or the count).
    const pool = ['point', 'flat', 'over'].flatMap(goal => ringsOf(q.menu, goal, q.count || 0));
    let passed = 0, passedWith = 0;
    const tries = 400;
    for (let t = 0; t < tries; t++) {
      const shelf = [...pool];
      for (let i = shelf.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [shelf[i], shelf[j]] = [shelf[j], shelf[i]]; }
      shelf.length = answers.length;
      if (shelf.slice().sort().join() === answers.join()) passed++;
      // Copies allowed: draw with replacement.
      const loose = Array.from({length: answers.length}, () => pool[Math.floor(rand() * pool.length)]);
      if (loose.slice().sort().join() === answers.join()) passedWith++;
    }
    stats.claimShares[p.id] = `${passed}/${tries} random shelves of ${answers.length} different rings from ${pool.length} pass; ${passedWith}/${tries} with copies allowed`;
    assert.ok(passed / tries < .1 && passedWith / tries < .1, `${p.id}: That's all can fail (${stats.claimShares[p.id]})`);
  } else {
    const goal = row.goal || 'point';
    const fillings = fillingsOf(q.locked, q.count, q.menu), folds = [...new Set(fillings.filter(w => kind(w) === goal).map(w => [...w.slice(q.locked.length)].sort().join('')))].sort();
    assert.equal(q.goal || 'point', goal, `${p.id}: the goal`);
    assert.deepEqual(folds, row.fills, `${p.id}: the fillings, by brute force`);
    assert.deepEqual(p.solution.fills, folds, `${p.id}: the pack's fillings`);
    const small = q.locked.join('') + smallestCorner(q.menu).repeat(q.count - q.locked.length);
    // Can't, after a fold, on every filling: the proof is accepted, and every
    // other ring gets the same words with nothing marked.
    let passed = 0, refusedCount = 0;
    for (const w of fillings) {
      const folded = play(p, build(p, fresh, w), {type: 'fold'});
      if (isSolved(p, folded.board)) continue;
      const c = play(p, folded, {type: 'cant'});
      if (isSolved(p, c.board)) { passed++; assert.equal(w, small, `${p.id}: only the smallest filling proves it`); continue; }
      refusedCount++;
      assert.deepEqual(c.board.refused, {kind: 'no'}, `${p.id} ${w}: one refusal`);
      const h = html(p, c);
      cantWords.add(boardWords(h));
      assert.ok(!/data-ringed|\bringed\b/.test(h), `${p.id} ${w}: nothing marked`);
      assert.ok(!/\d/.test(boardWords(h)), `${p.id} ${w}: no number`);
    }
    if (folds.length) {
      const a = play(p, build(p, fresh, q.locked.join('') + folds[0]), {type: 'fold'});
      assert.ok(isSolved(p, a.board), `${p.id}: the witness ${goal === 'flat' ? 'lies flat' : 'folds'}`);
      assert.equal(passed, 0, `${p.id}: Can't is never accepted when a ring can be made`);
      if (goal === 'flat') assert.notEqual(kind(small), 'flat', `${p.id}: the smallest filling is not the answer`);
    } else {
      assert.equal(small, row.certificate, `${p.id}: the certificate`);
      assert.equal(kind(small), row.fold, `${p.id}: the certificate ${row.fold === 'flat' ? 'lies flat' : 'overlaps'}`);
      assert.deepEqual(p.solution.certificate.join(''), small);
      const unfolded = build(p, fresh, small);
      assert.equal(move(p, unfolded, {type: 'cant'}), null, `${p.id}: Can't needs a fold first`);
      const a = play(p, unfolded, {type: 'fold'}, {type: 'cant'});
      assert.ok(isSolved(p, a.board), `${p.id}: the certificate is accepted`);
      assert.match(html(p, a), /Even the smallest corners/, `${p.id}: the argument is drawn`);
      assert.equal(passed, 1, `${p.id}: only the smallest filling proves it`);
      // A refusal: kept through Undo, the board still changes, and a new ring clears it.
      const wrong = fillings.find(w => w !== small);
      const told = play(p, build(p, fresh, wrong), {type: 'fold'}, {type: 'cant'});
      const back = undoMove(p, told);
      assert.deepEqual(back.board.refused, told.board.refused, `${p.id}: Undo keeps Can't's answer`);
      assert.notEqual(html(p, back), html(p, told), `${p.id}: Undo changes the board`);
      assert.equal(move(p, back, {type: 'cant'}), null, `${p.id}: Can't stays off`);
      assert.equal(move(p, play(p, back, {type: 'take', index: q.count - 1}), {type: 'add', piece: q.menu[0]}).board.refused, null, `${p.id}: a changed ring clears it`);
      stats.hintSteps[`${p.id} after a refused Can’t`] = hintSolve(p, told, 'after a refused Can’t').steps;
    }
    stats.claimShares[p.id] = `${passed}/${fillings.length} fillings pass Can't; ${refusedCount} refused alike`;
    // The refusal follower: fold a random filling; if it isn't solved, press
    // Can't, and on a refusal change the corner it marks for a smaller one
    // and try again. Nothing is ever marked, so it solves only the fillings
    // that needed no refusal.
    const smaller = c => q.menu.filter(x => ANGLE[x] < ANGLE[c]);
    let followed = 0, alone = 0;
    for (let t = 0; t < 2000; t++) {
      let a = build(p, fresh, q.locked.join('') + Array.from({length: q.count - q.locked.length}, () => q.menu[Math.floor(rand() * q.menu.length)]).join(''));
      for (let presses = 0; presses < 20; presses++) {
        a = play(p, a, {type: 'fold'});
        if (!isSolved(p, a.board)) a = play(p, a, {type: 'cant'});
        if (isSolved(p, a.board)) { followed++; if (!presses) alone++; break; }
        const mark = html(p, a).match(/data-cr-take="(\d+)"[^>]*data-ringed/);
        if (!mark) break;
        const i = Number(mark[1]), pick = smaller(a.board.ring[i]);
        if (!pick.length) break;
        if (a.board.fold !== 'over') a = play(p, a, {type: 'unfold'});
        a = play(p, a, {type: 'take', index: i}, {type: 'add', piece: pick[Math.floor(rand() * pick.length)]});
      }
    }
    assert.equal(followed, alone, `${p.id}: following Can't's refusal solves nothing`);
    stats.followers[p.id] = `${followed}/2000 random fillings solved, none by following a refusal`;
    // Page order: the first shape button in every free place, Fold, Can't.
    const first = q.locked.join('') + q.menu[0].repeat(q.count - q.locked.length);
    let page = play(p, build(p, fresh, first), {type: 'fold'});
    if (!isSolved(p, page.board)) page = play(p, page, {type: 'cant'});
    assert.ok(!isSolved(p, page.board), `${p.id}: the first shape button everywhere doesn't solve`);
    stats.firstButton[p.id] = `${q.menu.join('')}: ${first} ${kind(first)}, not solved; the smallest everywhere ${(folds.length ? kind(small) === goal : true) ? 'solves' : 'doesn’t solve'}`;
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
  const answers = q.mode === 'every' ? ringsOf(q.menu, q.goal, q.count || 0) : [];
  const bigRing = q.mode === 'make' ? q.locked.join('') + [...q.menu].sort((x, y) => ANGLE[y] - ANGLE[x])[0].repeat(q.count - q.locked.length) : '';
  const forged = q.mode === 'every' ? [
    [{...b0.board, done: true}, 'done with nothing kept'],
    [{...b0.board, shelf: [[...answers[0]]], done: true}, 'done with one ring'],
    [{...b0.board, shelf: [...answers.map(r => [...r]), [...answers[0]]], done: true}, 'done with a ring kept twice'],
    [{...b0.board, shelf: [[...answers[0]], [...answers[0]]], refused: {kind: 'more'}, shown: true}, 'a refusal That’s all wouldn’t give'],
    [{...b0.board, shelf: [[...answers[0]], [...answers[0]]], refused: {kind: 'same', pair: [0, 0]}}, 'a pair that isn’t one'],
    [{...b0.board, shelf: [['T', 'T']]}, 'a ring of two'],
    [{...b0.board, shown: true}, 'words with no answer'],
    [{...b0.board, refused: {kind: 'more'}}, 'a refusal with nothing kept'],
    [{...b0.board, again: null}, 'an old field'],
    [{...b0.board, ring: ['H', 'T', 'T']}, 'a hexagon'],
    [{...b0.board, ring: ['T', 'T', 'T'], fold: 'flat'}, 'a fold that doesn’t match'],
    [{...b0.board, ring: ['T', 'T'], fold: 'point'}, 'a fold of two corners'],
    [{...b0.board, extra: 1}, 'an extra field'],
    [{ring: []}, 'missing fields']
  ] : [
    [{...b0.board, claimed: true}, 'a claim on a fresh board'],
    [{...build(p, fresh, bigRing).board, claimed: true, fold: kind(bigRing)}, 'a claim on a ring with bigger corners'],
    [{...b0.board, ring: q.locked.length ? q.locked.slice(1) : ['T']}, 'a fixed corner taken out'],
    [{...b0.board, refused: {kind: 'no'}}, 'a refusal on a part ring'],
    [{...b0.board, refused: {kind: 'smaller', index: 0}}, 'an old refusal'],
    [{...b0.board, refused: {kind: 'folds'}}, 'a refusal Can’t never gives'],
    [{...b0.board, shown: true}, 'words with no answer'],
    [{...b0.board, extra: 1}, 'an extra field']
  ];
  if (q.mode === 'make' && !p.solution.fills.length) {
    const small = build(p, fresh, p.solution.certificate.join(''));
    forged.push([{...small.board, claimed: true}, 'a claim with no fold']);
    forged.push([{...small.board, fold: kind(p.solution.certificate.join('')), refused: {kind: 'no'}}, 'a refusal of the proof']);
  }
  if (q.mode === 'make' && p.solution.fills.length) {
    const ok = build(p, fresh, q.locked.join('') + p.solution.fills[0]);
    forged.push([{...ok.board, fold: (q.goal || 'point') === 'flat' ? 'point' : 'flat'}, 'a ring saved with another fold']);
    forged.push([{...ok.board, fold: q.goal || 'point', refused: {kind: 'no'}}, 'a refusal on a solved ring']);
  }
  for (const [board, why] of forged) {
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why} is no solve`);
  }
}
// The solved shelf, read back from the page.
function checkCases(p, a, answers) {
  const q = p.parameters, h = html(p, a);
  assert.match(h, /cr-cases/, `${p.id}: the solved shelf is drawn as the case check`);
  const rows = [...h.matchAll(/<ul class="cr-row" aria-label="Rings of (\w+) corners">(.*?)<\/ul>/g)];
  const word = ['', '', '', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  const sizes = [...new Set(answers.map(r => r.length))].sort((x, y) => x - y);
  for (const n of sizes) {
    const r = rows.find(([, w]) => w === word[n]);
    assert.ok(r, `${p.id}: a row of ${n}`);
    assert.equal((r[2].match(/cr-shelf-item"/g) || []).length, answers.filter(x => x.length === n).length, `${p.id}: row ${n} holds its rings`);
    // The ring that ends the row: the smallest of its size (by total) too big for the goal.
    const misses = ['point', 'flat', 'over'].flatMap(g => ringsOf(q.menu, g, n)).filter(w => q.goal === 'point' ? kind(w) !== 'point' : kind(w) === 'over').sort((x, y) => sum(x) - sum(y) || (x < y ? -1 : 1));
    assert.equal((r[2].match(/cr-shelf-item misses/g) || []).length, misses.length ? 1 : 0, `${p.id}: row ${n} ends with a ring that misses, if there is one`);
    if (misses.length) assert.ok(r[2].includes(`Ring of ${[...misses[0]].map(c => ({T: 'triangle', S: 'square', P: 'pentagon'})[c]).join(', ')}: it`), `${p.id}: row ${n} ends with ${misses[0]}`);
  }
  // The last row: the first size whose smallest ring is already too big.
  const last = rows.at(-1), n = word.indexOf(last[1]), small = smallestCorner(q.menu).repeat(n);
  if (!q.count) {
    assert.ok(q.goal === 'point' ? kind(small) !== 'point' : kind(small) === 'over', `${p.id}: the last row starts past the goal`);
    assert.equal((last[2].match(/cr-shelf-item"/g) || []).length, 0, `${p.id}: and holds no ring`);
  }
}

// --- Trees ------------------------------------------------------------------------
function checkTree(p, fresh, row, stats) {
  const q = p.parameters, V = Object.keys(q.nodes).length, rand = seeded(p.number * 104729);
  const boardOf = erased => q.leaves ? {erased, gone: []} : {erased};
  assert.equal(Boolean(q.leaves), Boolean(row.leaves), `${p.id}: taken down to one dot or not`);
  checkPlane(q, p.id);
  const regions0 = rasterRegions(q, []);
  assert.deepEqual([V, q.edges.length, regions0], row.counts, `${p.id}: dots, lines and regions, by raster`);
  assert.equal(regions0 + 1, row.faces, `${p.id}: the regions and the missing face are the solid's faces`);
  assert.equal(V - q.edges.length + row.faces, 2, `${p.id}: V − E + F = 2 on the solid`);
  assert.equal(piecesBfs(q, []), 1, `${p.id}: one piece`);
  // The witness route.
  let a = fresh;
  for (const line of p.solution.route) { a = play(p, a, {type: 'line', line}); }
  assert.ok(treeOk(q, a.board.erased), `${p.id}: the route leaves a tree`);
  if (q.leaves) {
    assert.ok(!isSolved(p, a.board), `${p.id}: a tree is not yet one dot`);
    a = takeLeaves(p, a, rand);
  }
  assert.ok(isSolved(p, a.board), `${p.id}: the route ${q.leaves ? 'and the end dots leave one dot' : 'leaves a tree'}`);
  // Euler's count and the erasure rule on random states, against the mechanic's regions.
  const states = [[]];
  for (let t = 0; t < 24; t++) { const k = Math.floor(rand() * q.edges.length); states.push([...new Set(Array.from({length: k}, () => Math.floor(rand() * q.edges.length)))].sort((x, y) => x - y)); }
  for (const erased of states) {
    const regions = rasterRegions(q, erased), pieces = piecesBfs(q, erased), lines = q.edges.length - erased.length;
    stats.rasterStates++;
    const faces = facesOf(q, erased), tints = tintsOf(q, erased), held = faces.closed.map(k => tints[k]);
    assert.equal(faces.closed.length, regions, `${p.id} ${erased}: the mechanic's regions match the raster`);
    assert.equal(V - lines + regions, pieces, `${p.id} ${erased}: dots − lines + regions = pieces`);
    assert.ok(held.every(Number.isInteger) && new Set(held).size === held.length, `${p.id} ${erased}: every region has its own tint`);
    q.edges.forEach((_, i) => {
      if (erased.includes(i)) return;
      const after = [...erased, i].sort((x, y) => x - y), r2 = rasterRegions(q, after), p2 = piecesBfs(q, after);
      stats.rasterStates++;
      const tintsAfter = facesOf(q, after).closed.map(k => tintsOf(q, after)[k]);
      if (p2 === pieces) {
        assert.equal(r2, regions - 1, `${p.id} ${erased} − ${i}: a line on a loop takes one region`);
        // The merge shows: one tint fewer, and no new one.
        assert.ok(tintsAfter.length === held.length - 1 && tintsAfter.every(t => held.includes(t)), `${p.id} ${erased} − ${i}: one tint goes`);
      } else assert.ok(p2 === pieces + 1 && r2 === regions, `${p.id} ${erased} − ${i}: any other line cuts`);
      // The board says which: a cut line has the same space on both sides.
      const same = faces.walkSides[i][0] === faces.walkSides[i][1];
      assert.equal(same, p2 > pieces, `${p.id} ${erased} − ${i}: the mechanic sees the cut`);
    });
  }
  // Hints from fresh, after wrong moves and from random states.
  const fromFresh = hintSolve(p, fresh, 'from fresh');
  assert.equal(fromFresh.steps, row.counts[2] + (q.leaves ? V - 1 : 0), `${p.id}: hints erase one line per region${q.leaves ? ' and take off every dot but one' : ''}`);
  stats.hintSteps[p.id + ' fresh'] = fromFresh.steps;
  for (const erased of states) {
    const b = {...fresh, board: boardOf(erased)};
    assert.ok(validBoard(p, b.board));
    if (!isSolved(p, b.board)) hintSolve(p, b, `from ${erased}`);
  }
  for (let t = 0; t < 30; t++) {
    let b = fresh;
    const k = 1 + Math.floor(rand() * 16);
    for (let i = 0; i < k && !isSolved(p, b.board); i++) { const x = randomAction(p, b, rand); if (!x) break; b = move(p, b, x); }
    if (!isSolved(p, b.board)) hintSolve(p, b, `after ${k} random moves`);
  }
  // After a wrong move: a line that cuts dots off.
  const cutter = (() => { for (let k = 1; k <= p.solution.route.length; k++) { const erased = p.solution.route.slice(0, k).sort((x, y) => x - y); const i = q.edges.findIndex((_, j) => !erased.includes(j) && piecesBfs(q, [...erased, j]) > 1); if (i >= 0) return {erased, i}; } return null; })();
  assert.ok(cutter, `${p.id}: some line cuts`);
  const cut = play(p, {...fresh, board: boardOf(cutter.erased)}, {type: 'line', line: cutter.i});
  assert.match(html(p, cut), /gb-node cut/, `${p.id}: cut-off dots are marked`);
  const mended = hintSolve(p, cut, 'after a cut');
  assert.equal(nextHint(p, cut).action.line, cutter.i, `${p.id}: the first hint draws the cut line back`);
  assert.ok(mended.steps >= 1);
  // The status names the change without a count.
  assert.ok(!/\d/.test(html(p, cut).match(/role="status">([^<]*)/)[1]), `${p.id}: no number in the status`);
  // Illegal moves and forged saves.
  for (const [action, why] of [[{type: 'line', line: q.edges.length}, 'a missing line'], [{type: 'line', line: -1}, 'a negative line'], [{type: 'line', line: 1.5}, 'half a line'], [{type: 'dot', id: Object.keys(q.nodes)[0]}, 'a dot before a tree'], [null, 'no move']]) assert.equal(move(p, fresh, action), null, `${p.id}: refuses ${why}`);
  assert.equal(move(p, a, {type: 'line', line: 0}), null, `${p.id}: no move after the solve`);
  for (const [board, why] of [[boardOf([1, 0]), 'lines out of order'], [boardOf([0, 0]), 'a line twice'], [boardOf([q.edges.length]), 'a missing line'], [{...boardOf([]), done: true}, 'a forged done'], [{}, 'no field'], [{...boardOf([]), erased: 'all'}, 'not a list']]) {
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why} is no solve`);
  }
  if (q.leaves) checkLeaves(p, fresh, rand);
  else assert.equal(validBoard(p, {erased: [], gone: []}), false, `${p.id}: no end dots to take off`);
  // Erasing every line is no tree.
  assert.equal(isSolved(p, boardOf(q.edges.map((_, i) => i))), false, `${p.id}: no lines is no tree`);
}
// End dots off a tree, checked by search over the dots left (not by the mechanic's end-dot rule).
function takeLeaves(p, start, rand) {
  const q = p.parameters, ids = Object.keys(q.nodes);
  let a = start;
  while (!isSolved(p, a.board)) {
    const gone = new Set(a.board.gone.map(([id]) => id)), used = new Set([...a.board.erased, ...a.board.gone.map(([, l]) => l)]);
    const left = ids.filter(id => !gone.has(id)), lines = q.edges.map((e, i) => [e, i]).filter(([, i]) => !used.has(i));
    // What is left is a tree: every dot joined and one line fewer than dots.
    const sub = {nodes: Object.fromEntries(left.map(id => [id, q.nodes[id]])), edges: lines.map(([e]) => e)};
    assert.equal(piecesBfs(sub, []), 1, `${p.id}: the dots left are joined`);
    assert.equal(lines.length, left.length - 1, `${p.id}: one line fewer than dots`);
    const ends = left.filter(id => lines.filter(([e]) => e.includes(id)).length === 1);
    assert.ok(ends.length >= 2, `${p.id}: a tree of two dots or more has two end dots`);
    for (const id of left.filter(id => !ends.includes(id))) assert.equal(move(p, a, {type: 'dot', id}), null, `${p.id}: dot ${id} isn't an end dot`);
    assert.equal(move(p, a, {type: 'line', line: lines[0][1]}), null, `${p.id}: the lines stay once a tree is left`);
    a = play(p, a, {type: 'dot', id: ends[Math.floor(rand() * ends.length)]});
  }
  assert.equal(a.board.gone.length, ids.length - 1, `${p.id}: one dot is left`);
  return a;
}
function checkLeaves(p, fresh, rand) {
  const q = p.parameters, ids = Object.keys(q.nodes), route = [...p.solution.route].sort((x, y) => x - y);
  const tree = play(p, fresh, ...p.solution.route.map(line => ({type: 'line', line})));
  const end = ids.find(id => q.edges.filter((e, i) => !route.includes(i) && e.includes(id)).length === 1);
  const lineAt = id => q.edges.findIndex((e, i) => !route.includes(i) && e.includes(id));
  const inner = ids.find(id => q.edges.filter((e, i) => !route.includes(i) && e.includes(id)).length > 1);
  const one = play(p, tree, {type: 'dot', id: end});
  assert.deepEqual(one.board.gone, [[end, lineAt(end)]], `${p.id}: the end dot comes off with its line`);
  assert.match(html(p, one), /gb-node gone/, `${p.id}: the dot taken off is drawn faint`);
  const back = undoMove(p, one);
  assert.deepEqual(back.board.gone, [], `${p.id}: Undo puts it back`);
  assert.ok(move(p, back, {type: 'dot', id: end}), `${p.id}: and it can come off again`);
  for (const [board, why] of [
    [{erased: [], gone: [[end, lineAt(end)]]}, 'a dot taken off before a tree'],
    [{erased: route, gone: [[inner, lineAt(inner)]]}, 'a dot with two lines taken off'],
    [{erased: route, gone: [[end, (lineAt(end) + 1) % q.edges.length]]}, 'a dot taken off with another line'],
    [{erased: route, gone: [[end, lineAt(end)], [end, lineAt(end)]]}, 'a dot taken off twice'],
    [{erased: route, gone: ids.map(id => [id, 0])}, 'every dot taken off'],
    [{erased: route, gone: [end]}, 'a dot with no line'],
    [{erased: route}, 'no list of dots taken off']
  ]) {
    assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
    assert.equal(isSolved(p, board), false, `${p.id}: ${why} is no solve`);
  }
  // A tree alone is not the end, and the last dot stays.
  assert.equal(isSolved(p, tree.board), false);
  const last = takeLeaves(p, tree, rand);
  assert.equal(move(p, last, {type: 'dot', id: ids.find(id => !last.board.gone.some(([g]) => g === id))}), null, `${p.id}: the last dot stays`);
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
