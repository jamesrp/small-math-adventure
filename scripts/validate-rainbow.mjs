// Checks the Rainbow triangles pack (dist/families/rainbow/rainbow.json) by
// methods separate from the mechanic's own: each board is rebuilt from
// coordinates and checked to be a cutting of the big triangle into
// triangles that meet edge to edge; side rules come from collinearity with
// the corners; counts come from a mixed-radix sweep of every lettering;
// Sperner's lemma and the door count (rainbows + 2 × two-door triangles =
// outside doors + 2 × inside doors) are checked on every lettering of every
// board; walks come from a union-find of the door graph; and the peek
// budgets are tested against a separately written search, peeking row by
// row and random peeking. The answers are played as moves, hint chains must
// solve every puzzle from fresh and from trap boards, and illegal moves and
// forged saves are rejected.
// Run: node scripts/validate-rainbow.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {PLAY_BOARDS, PLAY_ORDER} from '../dist/families/rainbow/rainbow.js';
import {loadPack} from './packs.mjs';

/* ---------------- An independent model of each board ---------------- */
const H = Math.sqrt(3) / 2;
const near = (a, b) => Math.abs(a - b) < 1e-9;
const cross = ([ax, ay], [bx, by], [cx, cy]) => (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
// Points in rows from the bottom, then a middle point for each cut cell;
// triangles as coordinate triples. Cells of the plain board are listed
// strip by strip from the bottom, up then down triangles alternating.
function model(spec) {
  const n = spec.steps, pts = [];
  for (let v = 0; v <= n; v++) for (let u = 0; u + v <= n; u++) pts.push([u + v / 2, v * H]);
  const at = (x, y) => pts.findIndex(([a, b]) => near(a, x) && near(b, y));
  const tris = [];
  for (let v = 0; v < n; v++) {
    for (let k = 0; k < 2 * (n - v) - 1; k++) {
      const u = k >> 1, y0 = v * H, y1 = (v + 1) * H, x0 = u + v / 2;
      tris.push(k % 2 === 0 ? [[x0, y0], [x0 + 1, y0], [x0 + .5, y1]] : [[x0 + 1, y0], [x0 + 1.5, y1], [x0 + .5, y1]]);
    }
  }
  const cells = [];
  tris.forEach((t, i) => {
    const corners = t.map(([x, y]) => at(x, y));
    if (!(spec.centres || []).includes(i)) { cells.push(corners); return; }
    const c = [0, 1].map(d => t.reduce((s, p) => s + p[d], 0) / 3);
    pts.push(c);
    const k = pts.length - 1;
    for (let j = 0; j < 3; j++) cells.push([corners[j], corners[(j + 1) % 3], k]);
  });
  const R = [0, 0], B = [n, 0], Y = [n / 2, n * H];
  const on = (p, a, b) => near(cross(a, b, p), 0);
  const allowed = pts.map((p, k) => {
    if ((spec.free || []).includes(k)) return 'BRY';
    const sides = [[R, B, 'BR'], [R, Y, 'RY'], [B, Y, 'BY']].filter(([a, b]) => on(p, a, b)).map(s => s[2]);
    if (sides.length === 2) return [...sides[0]].filter(c => sides[1].includes(c)).join('');
    return sides[0] || 'BRY';
  });
  return {pts, cells, allowed, n};
}
const edgeKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
// Edge to edge: inside edges border two triangles, outside edges one and lie
// on the big triangle's sides; the areas add up; no triangle is flat.
function checkCutting(b, label) {
  const uses = new Map();
  let area = 0;
  for (const c of b.cells) {
    const a = Math.abs(cross(...c.map(k => b.pts[k]))) / 2;
    assert.ok(a > 1e-9, `${label}: a flat triangle`);
    area += a;
    for (let j = 0; j < 3; j++) { const e = edgeKey(c[j], c[(j + 1) % 3]); uses.set(e, (uses.get(e) || 0) + 1); }
  }
  assert.ok(near(area, b.n * b.n * H / 2), `${label}: the triangles cover the big triangle`);
  for (const [e, u] of uses) {
    const [x, y] = e.split('-').map(Number);
    assert.ok(u === 1 || u === 2, `${label}: an edge used ${u} times`);
    assert.equal(u === 1, sides(b).some(([a, c]) => [x, y].every(k => near(cross(a, c, b.pts[k]), 0))), `${label}: edge ${e} is outside exactly when it lies on a side`);
  }
  return uses;
}
const letters = (b, labels, c) => c.map(k => labels[k]).sort().join('');
const rainbowCount = (b, labels) => b.cells.filter(c => letters(b, labels, c) === 'BRY').length;
const doorEdge = (labels, x, y) => (labels[x] + labels[y]).split('').sort().join('') === 'BR';
// Every lettering by counting in mixed radix.
function* everyLettering(b) {
  const opts = b.allowed.map(s => [...s]), digits = opts.map(() => 0), total = opts.reduce((n, o) => n * o.length, 1);
  for (let t = 0; t < total; t++) {
    yield digits.map((d, k) => opts[k][d]).join('');
    for (let k = 0; k < digits.length; k++) { if (++digits[k] < opts[k].length) break; digits[k] = 0; }
  }
}
// Rainbow counts over every lettering, checking the lemma and the door count
// on each.
function sweep(b, uses, label) {
  const table = new Map(), edges = [...uses];
  for (const labels of everyLettering(b)) {
    const t = rainbowCount(b, labels);
    let two = 0, outside = 0, inside = 0;
    for (const c of b.cells) { const d = [0, 1, 2].filter(j => doorEdge(labels, c[j], c[(j + 1) % 3])).length; assert.ok(d <= 2, `${label}: a triangle with three doors`); if (d === 2) two++; }
    for (const [e, u] of edges) { const [x, y] = e.split('-').map(Number); if (doorEdge(labels, x, y)) { if (u === 1) outside++; else inside++; } }
    assert.equal(t + 2 * two, outside + 2 * inside, `${label}: door count`);
    if (!labelFree(b)) assert.equal(t % 2, 1, `${label}: Sperner's lemma on ${labels}`);
    table.set(t, (table.get(t) || 0) + 1);
  }
  return new Map([...table].sort((x, y) => x[0] - y[0]));
}
// The big triangle's sides, and whether a dot on one may take any letter.
const sides = b => { const R = [0, 0], B = [b.n, 0], Y = [b.n / 2, b.n * H]; return [[R, B], [R, Y], [B, Y]]; };
const labelFree = b => b.allowed.some((s, k) => s.length === 3 && sides(b).some(([a, c]) => near(cross(a, c, b.pts[k]), 0)));
// Walks as components of the door graph: triangles and the outside as nodes.
function components(b, labels) {
  const doors = [], cellsOf = new Map();
  b.cells.forEach((c, i) => { for (let j = 0; j < 3; j++) { const e = edgeKey(c[j], c[(j + 1) % 3]); if (!cellsOf.has(e)) cellsOf.set(e, []); cellsOf.get(e).push(i); } });
  for (const [e, list] of cellsOf) { const [x, y] = e.split('-').map(Number); if (doorEdge(labels, x, y)) doors.push(list); }
  const parent = new Map(), find = x => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  const add = x => { if (!parent.has(x)) parent.set(x, x); };
  const degree = new Map();
  for (const [d, list] of doors.entries()) {
    const [a, z] = list.length === 2 ? list : [list[0], `out${d}`];
    add(a); add(z); parent.set(find(a), find(z));
    for (const x of [a, z]) degree.set(x, (degree.get(x) || 0) + 1);
  }
  const groups = new Map();
  for (const x of parent.keys()) { const r = find(x); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(x); }
  return [...groups.values()].map(nodes => {
    const ends = nodes.filter(x => degree.get(x) === 1).map(x => String(x).startsWith('out') ? 'out' : 'rainbow').sort();
    return {ends, cells: nodes.filter(x => typeof x === 'number').length, doors: nodes.reduce((s, x) => s + degree.get(x), 0) / 2};
  });
}

/* ---------------- An independent search for the peek puzzles ---------------- */
// Halve the bottom between a known R and a known B; through the door found,
// look at each triangle's unseen corner; if the walk leaves through the
// bottom, try the next R–B pair. Returns the number of peeks.
function search(b, labels) {
  const n = b.n, seen = new Set([0, n, (n + 1) * (n + 2) / 2 - 1]);
  let peeks = 0;
  const look = k => { if (!seen.has(k)) { seen.add(k); peeks++; } return labels[k]; };
  const cellsOf = new Map();
  b.cells.forEach((c, i) => { for (let j = 0; j < 3; j++) { const e = edgeKey(c[j], c[(j + 1) % 3]); if (!cellsOf.has(e)) cellsOf.set(e, []); cellsOf.get(e).push(i); } });
  const done = new Set();
  for (let round = 0; round < 10; round++) {
    let lo = -1, hi = -1;
    for (let a = 0; a < n && lo < 0; a++) {
      if (!seen.has(a) || labels[a] !== 'R') continue;
      let z = a + 1;
      while (z <= n && !seen.has(z)) z++;
      if (z <= n && labels[z] === 'B' && !done.has(`${a}:${z}`)) { lo = a; hi = z; }
    }
    if (lo < 0) return Infinity;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (look(mid) === 'R') lo = mid; else hi = mid; }
    done.add(`${lo}:${hi}`);
    let door = edgeKey(lo, hi), cell = cellsOf.get(door)[0];
    for (;;) {
      b.cells[cell].forEach(look);
      if (letters(b, labels, b.cells[cell]) === 'BRY') return peeks;
      const c = b.cells[cell];
      const next = [0, 1, 2].map(j => edgeKey(c[j], c[(j + 1) % 3])).find(e => e !== door && doorEdge(labels, ...e.split('-').map(Number)));
      const other = cellsOf.get(next).find(j => j !== cell);
      door = next;
      if (other === undefined) { const [x, y] = next.split('-').map(Number); done.add(`${Math.min(x, y)}:${Math.max(x, y)}`); break; }
      cell = other;
    }
  }
  return Infinity;
}
function rowByRow(b, labels) {
  const n = b.n, seen = new Set([0, n, (n + 1) * (n + 2) / 2 - 1]), target = b.cells.filter(c => letters(b, labels, c) === 'BRY');
  let peeks = 0;
  for (let k = 0; k < labels.length; k++) {
    if (seen.has(k)) continue;
    seen.add(k); peeks++;
    if (target.some(c => c.every(x => seen.has(x)))) return peeks;
  }
  return peeks;
}
// How often peeking at random dots finds the rainbow within the budget.
function randomSuccess(b, labels, budget, trials = 4000) {
  let seed = 99991, wins = 0;
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  const n = b.n, corners = [0, n, (n + 1) * (n + 2) / 2 - 1], target = b.cells.filter(c => letters(b, labels, c) === 'BRY');
  const hidden = labels.split('').map((_, k) => k).filter(k => !corners.includes(k));
  for (let t = 0; t < trials; t++) {
    const order = [...hidden];
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const seen = new Set([...corners, ...order.slice(0, budget)]);
    if (target.some(c => c.every(x => seen.has(x)))) wins++;
  }
  return wins / trials;
}

/* ---------------- Playing ---------------- */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label, limit = 300) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < limit; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
    a = play(p, a, hint.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
// Tap dots (each tap moves a dot to its next letter) until the board reads `target`.
function tapTo(p, a, b, target) {
  for (let k = 0; k < target.length && !isSolved(p, a.board); k++) {
    let guard = 0;
    while (a.board.labels[k] !== target[k] && !isSolved(p, a.board)) { assert.ok(++guard < 3, `${p.id}: dot ${k} reaches ${target[k]} by taps`); a = play(p, a, {type: 'turn', point: k}); }
  }
  return a;
}
const firstWith = (b, cond) => { for (const l of everyLettering(b)) if (cond(l)) return l; return null; };

// The facts the grown-up notes state, checked here by the methods above.
const CLAIMS = {
  'rainbow-01': {counts: [1], total: 8, text: /eight letterings/},
  'rainbow-02': {counts: [1, 3, 5], text: /1, 3 or 5/},
  'rainbow-03': {doors: 9, walks: [['out', 'out', 3, 4], ['out', 'rainbow', 5, 5]], text: /three doors on the bottom/},
  'rainbow-04': {counts: [1, 3, 5], ways: {5: 12}, total: 192, text: /12 of the 192/},
  'rainbow-05': {counts: [1, 3, 5]},
  'rainbow-06': {counts: [1, 3, 5, 7], ways: {7: 6}, text: /only six letterings reach it/},
  'rainbow-07': {counts: [1, 3, 5, 7, 9], ways: {1: 2920}, total: 13824, text: /2,920/},
  'rainbow-08': {counts: [1, 3, 5, 7, 9], ways: {9: 24}, total: 13824, text: /24 of the 13,824/},
  'rainbow-09': {doors: 14, walks: [['out', 'out', 7, 8], ['out', 'rainbow', 2, 2], ['rainbow', 'rainbow', 5, 4]], text: /three doors on the bottom and three rainbows/},
  'rainbow-10': {bottomDoors: 1},
  'rainbow-11': {bottomDoors: 3, exits: true},
  // Starred dots: one side dot may take any letter.
  'rainbow-s01': {counts: [0, 1, 2], ways: {0: 3}, total: 12, text: /Three of the twelve letterings have no rainbow/},
  'rainbow-s02': {counts: [0, 1, 2], ways: {2: 1}, text: /Only one of the twelve/},
  'rainbow-s03': {counts: [0, 1, 2, 3, 4, 5], ways: {0: 16, 4: 4}, total: 288, text: /16 of the 288 letterings have none and only 4 have four/},
  'rainbow-s04': {counts: [0, 1, 2, 3, 4, 5], ways: {0: 16}, total: 288, leftSide: true, text: /Every lettering with none has R, B, Y up the left side/}
};

export async function validateRainbow() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/rainbow/rainbow.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'rainbow');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), [ground] = pack.puzzles.filter(p => p.band === 'playground');
  const main = puzzles.filter(p => !p.group), group = puzzles.filter(p => p.group);
  for (const list of [main, group]) assert.deepEqual(list.map(p => p.number), list.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(main.length >= 8 && main.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(main.some(p => p.difficulty_level === level), level);
  assert.deepEqual(Object.keys(CLAIMS).sort(), puzzles.map(p => p.id).sort(), 'a claim for every puzzle');
  for (const p of puzzles) {
    assert.equal(p.mechanic, p.group ? 'starred' : 'rainbow', `${p.id}: mechanic`);
    // A group puzzle has exactly one starred dot, on a side; other puzzles have none.
    const b = model(p.parameters.board), starredDots = b.allowed.filter((s, k) => s === 'BRY' && sides(b).some(([x, y]) => near(cross(x, y, b.pts[k]), 0))).length;
    assert.equal(starredDots, p.group ? 1 : 0, `${p.id}: starred dots`);
    if (p.group) assert.ok(labelFree(b) && p.group === 'Starred dots' && p.libraryFamily === 'rainbow' && p.rules.some(r => /starred dot may take any letter/.test(r)), `${p.id}: a group puzzle`);
  }
  let steps = 0, letterings = 0;

  for (const p of puzzles) {
    const q = p.parameters, claim = CLAIMS[p.id], b = model(q.board), uses = checkCutting(b, p.id);
    assert.ok(p.hints.length >= 2 && p.idea && p.parent?.explanation, `${p.id}: hints, idea and notes`);
    if (claim.text) assert.match(`${p.parent.explanation} ${p.parent.notice} ${p.parent.extension}`, claim.text, `${p.id}: the notes state the checked fact`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid and unsolved`);
    for (const bad of [null, 'turn', {type: 'fly'}, {type: 'turn', point: -1}, {type: 'turn', point: b.pts.length}, {type: 'door', door: 1.5}, {type: 'peek', point: 0}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);

    if (['count', 'only', 'counts'].includes(q.mode)) {
      const table = sweep(b, uses, p.id);
      letterings += [...table.values()].reduce((s, x) => s + x, 0);
      assert.deepEqual([...table.keys()], claim.counts, `${p.id}: counts`);
      for (const [k, v] of Object.entries(claim.ways || {})) assert.equal(table.get(Number(k)), v, `${p.id}: ${v} letterings with ${k}`);
      if (claim.total) assert.equal([...table.values()].reduce((s, x) => s + x, 0), claim.total, `${p.id}: total letterings`);
      // Read up the left side from the corner R: points on the side line, by height.
      if (claim.leftSide) {
        const left = b.pts.map((pt, k) => [pt, k]).filter(([pt]) => near(pt[0], pt[1] / (2 * H))).sort((x, y) => x[0][1] - y[0][1]).map(([, k]) => k);
        for (const labels of everyLettering(b)) if (rainbowCount(b, labels) === 0) assert.equal(left.map(k => labels[k]).join(''), 'RBYY', `${p.id}: no rainbow reads R, B, Y up the left`);
      }
      assert.equal(rainbowCount(b, q.start), rainbowCount(b, fresh.board.labels));
      // Corners never change; a side dot never takes the far corner's letter.
      for (let k = 0; k < b.pts.length; k++) {
        let a = fresh;
        const seenLetters = new Set([a.board.labels[k]]);
        for (let t = 0; t < 4; t++) { const next = move(p, a, {type: 'turn', point: k}); if (!next) break; a = next; seenLetters.add(a.board.labels[k]); }
        assert.equal([...seenLetters].sort().join(''), b.allowed[k].length === 1 ? q.start[k] : b.allowed[k], `${p.id}: dot ${k} takes exactly its letters`);
        if (b.allowed[k].length > 1) for (const c of 'RBY') if (!b.allowed[k].includes(c)) assert.equal(move(p, fresh, {type: 'turn', point: k, letter: c}), null, `${p.id}: dot ${k} refuses ${c}`);
      }
      assert.equal(validBoard(p, {...fresh.board, labels: fresh.board.labels.replace(/^R/, 'B')}), false, `${p.id}: a moved corner`);
      assert.equal(validBoard(p, {...fresh.board, labels: fresh.board.labels.slice(1)}), false, `${p.id}: a short board`);
      const side = b.allowed.findIndex(s => s === 'BR');
      if (side >= 0) assert.equal(validBoard(p, {...fresh.board, labels: fresh.board.labels.slice(0, side) + 'Y' + fresh.board.labels.slice(side + 1)}), false, `${p.id}: a Y on the bottom side`);
      assert.equal(move(p, fresh, {type: 'door', door: 0}), null, `${p.id}: no walking`);
      assert.equal(move(p, fresh, {type: 'again'}), null, `${p.id}: no Start again`);
    }

    if (q.mode === 'count') {
      const witness = firstWith(b, l => rainbowCount(b, l) === q.target);
      const a = tapTo(p, fresh, b, witness);
      assert.ok(isSolved(p, a.board), `${p.id}: a lettering with ${q.target} solves it`);
      assert.equal(move(p, a, {type: 'turn', point: b.allowed.findIndex(s => s.length > 1)}), null, `${p.id}: no moves after a solve`);
      steps += hintsSolve(p, fresh, 'from fresh');
      // Trap: the lettering farthest from any answer.
      const far = [...everyLettering(b)].filter(l => rainbowCount(b, l) !== q.target).at(-1);
      steps += hintsSolve(p, tapTo(p, fresh, b, far), 'from far away');
      assert.equal(validBoard(p, {...fresh.board, found: [1]}), false, `${p.id}: found outside a listing puzzle`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: That's all outside a listing puzzle`);
    }
    if (q.mode === 'only') {
      const cells = b.cells.map((_, i) => i);
      let a = fresh;
      for (const i of cells) {
        const target = firstWith(b, l => { const r = b.cells.map((c, j) => letters(b, l, c) === 'BRY' ? j : -1).filter(j => j >= 0); return r.length === 1 && r[0] === i; });
        assert.ok(target, `${p.id}: triangle ${i + 1} can be the only rainbow`);
        if (!isSolved(p, a.board)) a = tapTo(p, a, b, target);
        else break;
        assert.ok(a.board.found.includes(i), `${p.id}: triangle ${i + 1} collected`);
      }
      assert.ok(isSolved(p, a.board), `${p.id}: every triangle collected solves it`);
      steps += hintsSolve(p, fresh, 'from fresh');
      const three = firstWith(b, l => rainbowCount(b, l) === 3);
      if (three) steps += hintsSolve(p, tapTo(p, fresh, b, three), 'from three rainbows');
      assert.equal(validBoard(p, {...fresh.board, found: [...fresh.board.found, fresh.board.found[0]]}), false, `${p.id}: a triangle twice`);
      assert.equal(validBoard(p, {...fresh.board, found: [b.cells.length]}), false, `${p.id}: a triangle off the board`);
      assert.equal(validBoard(p, {...fresh.board, found: []}), false, `${p.id}: the only rainbow on the board not collected`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: That's all outside a listing puzzle`);
      assert.equal(move(p, fresh, {type: 'claim'}), null, `${p.id}: no That's all`);
    }
    if (q.mode === 'counts') {
      const early = play(p, fresh, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: That's all too soon is refused`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: no second That's all until something changes`);
      let a = fresh;
      for (const n of claim.counts) a = tapTo(p, a, b, firstWith(b, l => rainbowCount(b, l) === n));
      assert.deepEqual([...a.board.found].sort((x, y) => x - y), claim.counts, `${p.id}: every count collected`);
      a = play(p, a, {type: 'claim'});
      assert.ok(isSolved(p, a.board), `${p.id}: That's all with every count solves it`);
      steps += hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, early, 'after That’s all too soon');
      for (const n of [0, 1, 2, 3, 4, 5, 6, 7].filter(n => !claim.counts.includes(n))) assert.equal(validBoard(p, {...fresh.board, found: [...fresh.board.found, n]}), false, `${p.id}: a count of ${n} is forged`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: claimed with counts missing`);
      assert.equal(validBoard(p, {...a.board, claimed: false, missed: true}), false, `${p.id}: missed with every count found`);
      assert.equal(validBoard(p, {...fresh.board, found: []}), false, `${p.id}: the count on the board not collected`);
    }

    if (q.mode === 'walk') {
      const parts = components(b, q.start), doorTotal = parts.reduce((s, w) => s + w.doors, 0);
      assert.equal(doorTotal, claim.doors, `${p.id}: doors`);
      const got = parts.map(w => [...w.ends, w.cells, w.doors]).sort().map(String), want = claim.walks.map(w => [...w.slice(0, 2).sort(), w[2], w[3]]).sort().map(String);
      assert.deepEqual(got, want, `${p.id}: walks`);
      assert.ok(parts.every(w => w.ends.length === 2), `${p.id}: no closed loops`);
      // Walk every component by trying doors: outside doors first, then rainbows.
      let a = fresh, guard = 0;
      while (!isSolved(p, a.board) && guard++ < 200) {
        const options = [...Array(200).keys()].map(e => move(p, a, {type: 'door', door: e})).filter(Boolean);
        const starts = b.cells.map((_, i) => move(p, a, {type: 'start', cell: i})).filter(Boolean);
        if (a.board.at >= 0) assert.equal(options.length, 1, `${p.id}: inside a triangle, one door leads on`);
        a = options[0] || starts[0];
        assert.ok(a, `${p.id}: a walk can always go on until every door is walked`);
      }
      assert.ok(isSolved(p, a.board), `${p.id}: every door walked solves it`);
      steps += hintsSolve(p, fresh, 'from fresh');
      const inside = play(p, fresh, nextHint(p, fresh).action);
      assert.ok(inside.board.at >= 0, `${p.id}: the first door leads inside`);
      steps += hintsSolve(p, inside, 'mid-walk');
      const nonRainbow = b.cells.findIndex(c => letters(b, q.start, c) !== 'BRY');
      assert.equal(move(p, fresh, {type: 'start', cell: nonRainbow}), null, `${p.id}: a walk can't start in a triangle that isn't a rainbow`);
      const innerDoor = a.board.walks.flat().find(e => e >= 0 && move(p, fresh, {type: 'door', door: e}) === null);
      assert.ok(innerDoor !== undefined, `${p.id}: some door is inside`);
      assert.equal(move(p, inside, {type: 'start', cell: b.cells.findIndex(c => letters(b, q.start, c) === 'BRY')}), null, `${p.id}: no new walk mid-walk`);
      assert.equal(move(p, fresh, {type: 'turn', point: 1}), null, `${p.id}: letters are fixed`);
      assert.equal(validBoard(p, {walks: [[...inside.board.walks[0]]], at: -1}), false, `${p.id}: a walk stopped mid-way`);
      assert.equal(validBoard(p, {walks: [[innerDoor]], at: -1}), false, `${p.id}: a walk starting at an inside door`);
      assert.equal(validBoard(p, {walks: [...inside.board.walks, ...inside.board.walks], at: inside.board.at}), false, `${p.id}: a door walked twice`);
    }

    if (q.mode === 'peek') {
      assert.equal(q.hidden.length, 3, `${p.id}: three hidden boards`);
      for (const [w, labels] of q.hidden.entries()) {
        assert.ok([...labels].every((c, k) => b.allowed[k].includes(c)), `${p.id}: hidden board ${w} follows the side rules`);
        assert.equal(rainbowCount(b, labels), 1, `${p.id}: hidden board ${w} has one rainbow`);
        const parts = components(b, labels), outside = parts.reduce((s, x) => s + x.ends.filter(e => e === 'out').length, 0);
        assert.equal(outside, claim.bottomDoors, `${p.id}: hidden board ${w} bottom doors`);
        const cost = search(b, labels), rows = rowByRow(b, labels), luck = randomSuccess(b, labels, q.budget);
        assert.ok(cost < q.budget, `${p.id}: hidden board ${w}: the door search takes ${cost}, under the budget ${q.budget}`);
        assert.ok(rows > q.budget, `${p.id}: hidden board ${w}: peeking row by row takes ${rows}, over ${q.budget}`);
        assert.ok(luck < .12, `${p.id}: hidden board ${w}: random peeking wins ${luck}`);
      }
      // Hints solve each hidden board in turn; Start again moves to the next.
      for (let w = 0; w < 3; w++) {
        let a = fresh;
        for (let t = 0; t < w; t++) a = play(p, play(p, a, {type: 'peek', point: q.hidden[0].length - 2}), {type: 'again'});
        assert.equal(a.board.which, w);
        steps += hintsSolve(p, a, `hidden board ${w}`);
      }
      // Out of peeks: row by row until the budget runs out, then Start again.
      let out = fresh;
      for (let k = 0; out.board.seen.length < q.budget; k++) { const next = move(p, out, {type: 'peek', point: k}); if (next) out = next; }
      assert.ok(!isSolved(p, out.board), `${p.id}: row by row runs out`);
      assert.equal(move(p, out, {type: 'peek', point: q.hidden[0].length - 2}), null, `${p.id}: no peek past the budget`);
      assert.equal(nextHint(p, out).action.type, 'again', `${p.id}: out of peeks hints Start again`);
      steps += hintsSolve(p, out, 'after running out');
      assert.equal(move(p, fresh, {type: 'peek', point: 0}), null, `${p.id}: a corner shows already`);
      assert.equal(move(p, fresh, {type: 'again'}), null, `${p.id}: nothing to start again`);
      assert.equal(move(p, fresh, {type: 'turn', point: 1}), null, `${p.id}: no changing letters`);
      assert.equal(validBoard(p, {which: 0, seen: [1, 1]}), false, `${p.id}: a dot peeked twice`);
      assert.equal(validBoard(p, {which: 3, seen: []}), false, `${p.id}: a hidden board that doesn't exist`);
      assert.equal(validBoard(p, {which: 0, seen: [...Array(q.budget + 1).keys()].map(k => k + b.n + 1)}), false, `${p.id}: over the budget`);
      assert.equal(validBoard(p, {which: 0, seen: [...Array(q.budget).keys()].map(k => k + b.n + 1)}), true, `${p.id}: the whole budget`);
    }
  }

  // The playground: each board starts with one rainbow; letters change by taps.
  const fresh = freshAttempt(ground);
  assert.ok(validBoard(ground, fresh.board) && !isSolved(ground, fresh.board));
  for (const key of PLAY_ORDER) {
    const a = key === fresh.board.board ? fresh : play(ground, fresh, {type: 'size', board: key}), b = model(PLAY_BOARDS[key]);
    checkCutting(b, `playground ${key}`);
    assert.equal(rainbowCount(b, a.board.labels), 1, `playground ${key}: one rainbow to start`);
    assert.equal(move(ground, a, {type: 'size', board: key}), null, `playground ${key}: a fresh board stays`);
    const k = b.allowed.findIndex(s => s.length > 1), changed = play(ground, a, {type: 'turn', point: k});
    assert.equal(rainbowCount(b, changed.board.labels) % 2, 1, `playground ${key}: still odd`);
    assert.equal(play(ground, changed, {type: 'size', board: key}).board.labels, a.board.labels, `playground ${key}: pressing it again starts over`);
    if (key !== '5') letterings += [...sweep(b, checkCutting(b, key), `playground ${key}`).values()].reduce((s, x) => s + x, 0);
  }
  assert.equal(move(ground, fresh, {type: 'size', board: '6'}), null, 'no six-row board');
  assert.equal(validBoard(ground, {board: '6', labels: ''}), false, 'a forged board');
  assert.equal(validBoard(ground, {board: '2', labels: fresh.board.labels}), false, 'letters from another board');
  assert.equal(nextHint(ground, fresh).type, 'done', 'the playground gives no hints');
  return {rainbowPuzzles: puzzles.length, letteringsChecked: letterings, sources: pack.sources.length, hintSteps: steps};
}
export default validateRainbow;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateRainbow(), null, 2));
