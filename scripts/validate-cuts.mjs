// Checks the Polygon cuts pack (dist/families/cuts/cuts.json) by methods
// separate from the mechanic's own: each polygon is rebuilt from
// coordinates, and lines cross when their segments meet at a point inside
// both (orientation tests, not the order of corners); the ways are every
// set of n − 3 lines that pairwise don't cross, found by a sweep of
// subsets, and each is checked to be full (no line can be added) and to
// have triangles whose areas add up to the polygon's; two ways are a flip
// apart when they share all but one line. Distances, odd returns and rings
// through every way come from searches on that map. The fan rule is
// checked for every way of every polygon from 4 to 8 corners. The answers
// are played as moves, hint chains must solve every puzzle from fresh and
// from trap boards, and illegal moves and forged saves are rejected.
// Run: node scripts/validate-cuts.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoToSolvable} from '../dist/engine.js';
import {loadPack} from './packs.mjs';

/* ---------------- An independent model of each polygon ---------------- */
const NAMES = 'ABCDEFGH';
const models = new Map();
function model(n) {
  if (models.has(n)) return models.get(n);
  const pts = [...Array(n).keys()].map(k => [Math.cos(Math.PI / 2 - 2 * Math.PI * k / n), Math.sin(Math.PI / 2 - 2 * Math.PI * k / n)]);
  // A line joins two corners that are not neighbours; listed in the order the
  // pack's keys use (AC, AD, …, BD, …), which is a format, not mathematics.
  const lines = [];
  for (let a = 0; a < n; a++) for (let b = a + 2; b < n; b++) if ((b - a) % n !== n - 1) lines.push([a, b]);
  const orient = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const meet = (i, j) => {
    const [a, b] = lines[i], [c, d] = lines[j];
    if (new Set([a, b, c, d]).size < 4) return false;
    const [A, B, C, D] = [a, b, c, d].map(k => pts[k]);
    return orient(A, B, C) * orient(A, B, D) < 0 && orient(C, D, A) * orient(C, D, B) < 0;
  };
  const cross = lines.map((_, i) => lines.map((_, j) => meet(i, j)));
  // Every set of n − 3 lines that pairwise don't cross, by a sweep of subsets.
  const ways = [];
  const pick = (from, chosen) => {
    if (chosen.length === n - 3) { ways.push([...chosen]); return; }
    for (let i = from; i < lines.length; i++) if (chosen.every(j => !cross[i][j])) { chosen.push(i); pick(i + 1, chosen); chosen.pop(); }
  };
  pick(0, []);
  const keyOf = set => set.map(i => NAMES[lines[i][0]] + NAMES[lines[i][1]]).join(' ');
  const keys = ways.map(keyOf), index = new Map(keys.map((k, i) => [k, i]));
  // Flips: two ways that share all but one line.
  const nbrs = ways.map(w => ways.map((v, j) => v.filter(i => w.includes(i)).length === n - 4 ? j : -1).filter(j => j >= 0));
  const m = {n, pts, lines, cross, ways, keys, index, nbrs, keyOf};
  models.set(n, m);
  return m;
}
const area = pts => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
// The triangles of a way: three corners whose sides are all sides or lines of the way.
function trianglesOf(m, way) {
  const joined = (a, b) => Math.abs(a - b) === 1 || Math.abs(a - b) === m.n - 1 || way.some(i => m.lines[i][0] === Math.min(a, b) && m.lines[i][1] === Math.max(a, b));
  const out = [];
  for (let a = 0; a < m.n; a++) for (let b = a + 1; b < m.n; b++) for (let c = b + 1; c < m.n; c++) {
    if (!joined(a, b) || !joined(b, c) || !joined(a, c)) continue;
    // No line or corner inside it.
    const t = [a, b, c].map(k => m.pts[k]);
    if (way.some(i => !m.lines[i].every(k => [a, b, c].includes(k)) && [0.25, 0.5, 0.75].some(s => inside(t, mix(m, i, s))))) continue;
    out.push([a, b, c]);
  }
  return out;
}
const mix = (m, i, s) => { const [p, q] = m.lines[i].map(k => m.pts[k]); return [p[0] + s * (q[0] - p[0]), p[1] + s * (q[1] - p[1])]; };
function inside(t, p) {
  const o = (u, v) => Math.sign((v[0] - u[0]) * (p[1] - u[1]) - (v[1] - u[1]) * (p[0] - u[0]));
  const s = [o(t[0], t[1]), o(t[1], t[2]), o(t[2], t[0])];
  return s.every(x => x > 0) || s.every(x => x < 0);
}
function bfs(m, from) {
  const dist = new Array(m.ways.length).fill(-1), queue = [from];
  dist[from] = 0;
  for (let i = 0; i < queue.length; i++) for (const j of m.nbrs[queue[i]]) if (dist[j] < 0) { dist[j] = dist[queue[i]] + 1; queue.push(j); }
  return dist;
}
// Shortest closed walk of odd length from `from`, by layers of (way, parity).
function oddReturn(m, from) {
  let layer = new Set([from]), seen = new Set([`${from}:0`]);
  for (let step = 1; step < 4 * m.ways.length; step++) {
    const next = new Set();
    for (const w of layer) for (const j of m.nbrs[w]) { const id = `${j}:${step % 2}`; if (!seen.has(id)) { seen.add(id); next.add(j); } }
    if (step % 2 === 1 && next.has(from)) return step;
    layer = next;
  }
  return Infinity;
}
// Directed rings through every way from `from`, with a bitmask search.
function rings(m, from) {
  const all = (1 << m.ways.length) - 1;
  let count = 0;
  const go = (at, mask) => {
    if (mask === all) { if (m.nbrs[at].includes(from)) count++; return; }
    for (const j of m.nbrs[at]) if (!(mask & (1 << j))) go(j, mask | (1 << j));
  };
  go(from, 1 << from);
  return count;
}
const fanKey = (m, v) => m.keyOf(m.lines.map((l, i) => l.includes(v) ? i : -1).filter(i => i >= 0));
const lineAt = (m, v) => way => way.filter(i => m.lines[i].includes(v)).length;

/* ---------------- Playing ---------------- */
const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
function hintsSolve(p, a, label, limit = 400) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < limit; steps++) {
    const hint = nextHint(p, a);
    assert.equal(hint.type, 'move', `${p.id} ${label}: ${hint.text}`);
    a = play(p, a, hint.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return steps;
}
const lineIndex = (m, name) => m.lines.findIndex(([a, b]) => NAMES[a] + NAMES[b] === name);
const flipBy = (m, from, to) => from.split(' ').find(x => !to.split(' ').includes(x));
// Draws a way line by line, tapping its corners.
function drawWay(p, m, a, key) {
  for (const name of key.split(' ')) {
    const i = lineIndex(m, name);
    if (a.board.diags.includes(i)) continue;
    a = play(p, a, {type: 'draw', a: m.lines[i][0], b: m.lines[i][1]});
  }
  return a;
}
const clearTo = (p, a) => (a.board.diags.length > (p.parameters.kept ? p.parameters.kept.split(' ').length : 0) ? play(p, a, {type: 'clear'}) : a);

const CLAIMS = {
  'cuts-01': {ways: 2, text: /two diagonals, AD or CE/},
  'cuts-02': {ways: 5, text: /five fans are all different/},
  'cuts-03': {ways: 5, rings: 2, oddHome: 5, text: /after five flips, an odd number/},
  'cuts-04': {ways: 4, text: /2 × 2 = 4/},
  'cuts-05': {fewest: 3, missing: 3, route: ['BF', 'BE', 'BD'], text: /BF → AE, BE → AD, BD → AC/},
  'cuts-06': {oddHome: 5, text: /comes home in five flips/},
  'cuts-07': {fewest: 4, missing: 3, route: ['CE', 'CF', 'BF', 'DF'], firstFlips: ['AC', 'BE', 'DF'], strict: 8, text: /Of the 182 ordered pairs of hexagon ways, 8 are like this/},
  'cuts-08': {ways: 14, text: /five ways\), C .* \(two\), D .* \(two\), and E .* \(five\): 14/},
  'cuts-09': {fewest: 3, missing: 3, fan: 0, route: ['DH', 'DG', 'DF'], text: /DH → AG, DG → AF and DF → AE/},
  'cuts-10': {fewest: 5, missing: 5, throughFan: 7, route: ['AC', 'DF', 'DG', 'DH', 'AD'], text: /3 \+ 4 = 7/},
  'cuts-11': {ways: 14, rings: 12, stuck: true, text: /there are 12 such rings/}
};

export async function validateCuts() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/cuts/cuts.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'cuts');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), [ground] = pack.puzzles.filter(p => p.band === 'playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12);
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), level);
  assert.deepEqual(Object.keys(CLAIMS).sort(), puzzles.map(p => p.id).sort(), 'a claim for every puzzle');

  // The polygons themselves: Catalan counts, full ways, n − 2 triangles that
  // fill the polygon, n − 3 flips each, a connected map, and the fan rule.
  const catalan = {4: 2, 5: 5, 6: 14, 7: 42, 8: 132};
  let waysChecked = 0;
  for (let n = 4; n <= 8; n++) {
    const m = model(n), whole = area(m.pts);
    assert.equal(m.ways.length, catalan[n], `${n} corners: ${m.ways.length} ways`);
    for (const w of m.ways) {
      assert.ok(m.lines.every((_, i) => w.includes(i) || w.some(j => m.cross[i][j])), `${n} corners: ${m.keyOf(w)} is full`);
      const tris = trianglesOf(m, w);
      assert.equal(tris.length, n - 2, `${n} corners: ${m.keyOf(w)} has n − 2 triangles`);
      assert.ok(Math.abs(tris.reduce((s, t) => s + area(t.map(k => m.pts[k])), 0) - whole) < 1e-9, `${n} corners: ${m.keyOf(w)} triangles fill the polygon`);
    }
    m.nbrs.forEach((list, i) => assert.equal(list.length, n - 3, `${n} corners: ${m.keys[i]} has n − 3 flips`));
    for (let v = 0; v < n; v++) {
      const dist = bfs(m, m.index.get(fanKey(m, v)));
      m.ways.forEach((w, i) => assert.equal(dist[i], n - 3 - lineAt(m, v)(w), `${n} corners: fan rule at ${NAMES[v]} from ${m.keys[i]}`));
    }
    waysChecked += m.ways.length;
  }
  // The hexagon: missing lines count exactly, except for 8 ordered pairs, each one short.
  const hex = model(6), short = [];
  hex.ways.forEach((w, i) => { const dist = bfs(hex, i); hex.ways.forEach((v, j) => { const missing = v.filter(x => !w.includes(x)).length; assert.ok(dist[j] >= missing && dist[j] <= missing + 1); if (dist[j] > missing) short.push([i, j]); }); });

  let steps = 0;
  for (const p of puzzles) {
    const q = p.parameters, claim = CLAIMS[p.id], m = model(q.n);
    assert.equal(p.mechanic, 'cuts', `${p.id}: mechanic`);
    assert.ok(p.hints.length >= 2 && p.idea && p.parent?.explanation, `${p.id}: hints, idea and notes`);
    assert.match(`${p.parent.explanation} ${p.parent.notice} ${p.parent.extension}`, claim.text, `${p.id}: the notes state the checked fact`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid and unsolved`);
    for (const bad of [null, 'flip', {type: 'fly'}, {type: 'draw', a: 0, b: q.n}, {type: 'draw', a: 0, b: 1}, {type: 'draw', a: 0, b: q.n - 1}, {type: 'flip', d: -1}, {type: 'flip', d: 1.5}, {type: 'erase', d: m.lines.length}]) assert.equal(move(p, fresh, bad), null, `${p.id}: rejects ${JSON.stringify(bad)}`);

    if (q.mode === 'every') {
      const kept = q.kept ? q.kept.split(' ') : [], want = m.keys.filter(k => kept.every(x => k.split(' ').includes(x)));
      assert.equal(want.length, claim.ways, `${p.id}: ways`);
      assert.deepEqual(fresh.board.diags, kept.map(x => lineIndex(m, x)), `${p.id}: starts with the kept line`);
      for (const x of kept) assert.equal(move(p, fresh, {type: 'erase', d: lineIndex(m, x)}), null, `${p.id}: the kept line stays`);
      // A line crossing a drawn one is refused.
      const first = drawWay(p, m, fresh, want[0]), crossing = m.lines.findIndex((_, i) => first.board.diags.some(j => m.cross[i][j]));
      assert.equal(move(p, first, {type: 'draw', a: m.lines[crossing][0], b: m.lines[crossing][1]}), null, `${p.id}: no crossing lines`);
      assert.equal(move(p, first, {type: 'flip', d: first.board.diags[0]}), null, `${p.id}: no flips here`);
      const early = play(p, fresh, {type: 'claim'});
      assert.ok(early.board.missed && !isSolved(p, early.board), `${p.id}: That's all too soon is refused`);
      assert.equal(move(p, early, {type: 'claim'}), null, `${p.id}: no second That's all until something changes`);
      let a = fresh;
      for (const key of want) { a = drawWay(p, m, clearTo(p, a), key); assert.ok(a.board.found.includes(key), `${p.id}: ${key} joins the row`); }
      assert.equal(a.board.found.length, want.length, `${p.id}: every way collected`);
      const done = play(p, a, {type: 'claim'});
      assert.ok(isSolved(p, done.board), `${p.id}: That's all with every way solves it`);
      steps += hintsSolve(p, fresh, 'from fresh') + hintsSolve(p, early, 'after That’s all too soon');
      // Trap: a half-drawn board that matches nothing found so far.
      const half = drawWay(p, m, fresh, m.keys.find(k => !kept.length || k.includes(kept[0])).split(' ').filter(x => !kept.includes(x))[0]);
      steps += hintsSolve(p, half, 'from a half-drawn board');
      assert.equal(validBoard(p, {...fresh.board, found: [m.keys.find(k => !want.includes(k)) || 'AB']}), false, `${p.id}: a forged way`);
      assert.equal(validBoard(p, {...fresh.board, found: [want[0], want[0]]}), false, `${p.id}: a way twice`);
      assert.equal(validBoard(p, {...fresh.board, claimed: true}), false, `${p.id}: claimed with ways missing`);
      assert.equal(validBoard(p, {...a.board, found: a.board.found.filter(k => k !== m.keyOf(a.board.diags))}), false, `${p.id}: the way on the board not collected`);
      assert.equal(validBoard(p, {...fresh.board, diags: [0, 0]}), false, `${p.id}: a line twice`);
      const pair = m.lines.flatMap((_, i) => m.lines.map((_, j) => [i, j])).find(([i, j]) => i < j && m.cross[i][j]);
      assert.equal(validBoard(p, {...fresh.board, diags: pair}), false, `${p.id}: crossing lines`);
      if (kept.length) assert.equal(validBoard(p, {...fresh.board, diags: []}), false, `${p.id}: the kept line erased`);
    } else {
      const start = m.index.get(q.start);
      assert.ok(start !== undefined, `${p.id}: the start is a way`);
      assert.deepEqual(fresh.board.path, [q.start]);
      assert.equal(move(p, fresh, {type: 'draw', a: 0, b: 2}), null, `${p.id}: no drawing here`);
      assert.equal(move(p, fresh, {type: 'erase', d: lineIndex(m, q.start.split(' ')[0])}), null, `${p.id}: no erasing here`);
      const absent = m.lines.findIndex((_, i) => !m.ways[start].includes(i));
      assert.equal(move(p, fresh, {type: 'flip', d: absent}), null, `${p.id}: only drawn lines flip`);
      // Each flip of the start gives one of its map neighbours.
      const after = m.ways[start].map(i => play(p, fresh, {type: 'flip', d: i}).board.path[1]).sort();
      assert.deepEqual(after, m.nbrs[start].map(j => m.keys[j]).sort(), `${p.id}: flips are the map's neighbours`);
      assert.equal(validBoard(p, {path: [q.start, m.keys.find((k, j) => j !== start && !m.nbrs[start].includes(j))]}), false, `${p.id}: a jump that is not a flip`);
      assert.equal(validBoard(p, {path: [m.keys[m.nbrs[start][0]]]}), false, `${p.id}: a different start`);
      assert.equal(validBoard(p, {path: [q.start, 'AC BD']}), false, `${p.id}: a way that isn't one`);
      const flipName = (a, name) => play(p, a, {type: 'flip', d: lineIndex(m, name)});

      if (q.mode === 'reach') {
        const target = m.index.get(q.target), dist = bfs(m, target);
        assert.equal(dist[start], claim.fewest, `${p.id}: fewest flips`);
        assert.equal(q.budget, claim.fewest, `${p.id}: the budget is the fewest`);
        assert.equal(m.ways[target].filter(i => !m.ways[start].includes(i)).length, claim.missing, `${p.id}: missing lines`);
        if (claim.fan !== undefined) assert.equal(q.target, fanKey(m, claim.fan), `${p.id}: the card is a fan`);
        if (claim.throughFan) { const viaA = bfs(m, m.index.get(fanKey(m, 0))); assert.equal(viaA[start] + viaA[target], claim.throughFan, `${p.id}: through the fan at A`); }
        if (claim.strict) {
          assert.equal(short.length, claim.strict, `${p.id}: hexagon pairs where the count falls short`);
          assert.ok(short.some(([i, j]) => i === start && j === target), `${p.id}: this pair is one of them`);
          const firsts = m.ways[start].map(i => play(p, fresh, {type: 'flip', d: i}).board.path[1]).map(k => k.split(' ').find(x => !q.start.split(' ').includes(x))).sort();
          assert.deepEqual(firsts, claim.firstFlips, `${p.id}: what the first flips draw`);
          assert.ok(firsts.every(x => !q.target.split(' ').includes(x)), `${p.id}: no first flip draws a card line`);
        }
        let a = fresh;
        for (const name of claim.route) a = flipName(a, name);
        assert.ok(isSolved(p, a.board), `${p.id}: the notes' route solves it`);
        steps += hintsSolve(p, fresh, 'from fresh');
        // Trap: a flip that moves away, then the hint says undo, and undoing rescues it.
        const away = m.ways[start].map(i => play(p, fresh, {type: 'flip', d: i})).find(x => dist[m.index.get(x.board.path[1])] > dist[start]);
        if (away) {
          assert.equal(nextHint(p, away).type, 'deadend', `${p.id}: a wasted flip is a dead end`);
          steps += hintsSolve(p, undoToSolvable(p, away), 'after undoing a wasted flip');
        }
        let out = fresh;
        while (out.board.path.length - 1 < q.budget) out = play(p, out, {type: 'flip', d: m.ways[m.index.get(out.board.path.at(-1))].find(i => { const next = move(p, out, {type: 'flip', d: i}); return next && !isSolved(p, next.board); })});
        assert.ok(!isSolved(p, out.board), `${p.id}: the flips can run out`);
        assert.equal(m.ways[m.index.get(out.board.path.at(-1))].map(i => move(p, out, {type: 'flip', d: i})).filter(Boolean).length, 0, `${p.id}: no flip past the budget`);
      }
      if (q.mode === 'home') {
        assert.equal(oddReturn(m, start), claim.oddHome, `${p.id}: shortest odd way home`);
        steps += hintsSolve(p, fresh, 'from fresh');
        // Out and back is even, so not solved; hints still find an odd way.
        const back = flipName(flipName(fresh, q.start.split(' ')[0]), flipBy(m, play(p, fresh, {type: 'flip', d: lineIndex(m, q.start.split(' ')[0])}).board.path[1], q.start));
        assert.equal(back.board.path.at(-1), q.start);
        assert.ok(!isSolved(p, back.board), `${p.id}: two flips home is not odd`);
        steps += hintsSolve(p, back, 'after going out and back');
      }
      if (q.mode === 'tour') {
        assert.equal(m.ways.length, claim.ways);
        assert.equal(rings(m, start), claim.rings, `${p.id}: rings through every way`);
        steps += hintsSolve(p, fresh, 'from fresh');
        // A way twice is refused.
        const one = play(p, fresh, {type: 'flip', d: m.ways[start][0]});
        const drawnLine = one.board.path[1].split(' ').find(x => !q.start.split(' ').includes(x));
        assert.equal(move(p, one, {type: 'flip', d: lineIndex(m, drawnLine)}), null, `${p.id}: no going back`);
        assert.equal(validBoard(p, {path: [q.start, one.board.path[1], q.start]}), false, `${p.id}: home before every way`);
        // Trap: a greedy route that gets stuck is a dead end, and Undo rescues it.
        let stuck = fresh, next;
        while ((next = m.ways[m.index.get(stuck.board.path.at(-1))].map(i => move(p, stuck, {type: 'flip', d: i})).find(Boolean)) && !isSolved(p, next.board)) stuck = next;
        assert.equal(!next, Boolean(claim.stuck), `${p.id}: the first-flip route gets stuck`);
        if (!next) {
          assert.equal(nextHint(p, stuck).type, 'deadend', `${p.id}: a stuck route is a dead end`);
          steps += hintsSolve(p, undoToSolvable(p, stuck), 'after a stuck route');
        }
      }
    }
  }

  // The playground: every size, draw, flip and erase.
  const fresh = freshAttempt(ground);
  assert.ok(validBoard(ground, fresh.board) && !isSolved(ground, fresh.board));
  assert.equal(nextHint(ground, fresh).type, 'done', 'the playground gives no hints');
  for (let n = 4; n <= 8; n++) {
    const m = model(n);
    let a = n === fresh.board.n ? fresh : play(ground, fresh, {type: 'size', n});
    assert.equal(a.board.n, n);
    for (const [i, name] of m.keys.at(-1).split(' ').entries()) { const l = m.lines[lineIndex(m, name)]; a = play(ground, a, {type: 'draw', a: l[0], b: l[1]}); assert.equal(a.board.diags.length, i + 1); }
    const flipped = play(ground, a, {type: 'flip', d: a.board.diags[0]});
    assert.ok(m.nbrs[m.index.get(m.keys.at(-1))].includes(m.index.get(m.keyOf(flipped.board.diags))), `playground ${n}: a flip lands on a neighbour`);
    const erased = play(ground, a, {type: 'erase', d: a.board.diags[0]});
    assert.equal(erased.board.diags.length, n - 4);
    assert.equal(play(ground, a, {type: 'clear'}).board.diags.length, 0);
  }
  assert.equal(move(ground, fresh, {type: 'size', n: 9}), null, 'no nine corners');
  assert.equal(move(ground, fresh, {type: 'size', n: fresh.board.n}), null, 'a fresh shape stays');
  assert.equal(validBoard(ground, {n: 9, diags: []}), false, 'a forged shape');
  assert.equal(validBoard(ground, {n: 4, diags: [0, 1]}), false, 'crossing lines in the square');
  return {cutsPuzzles: puzzles.length, waysChecked, hexagonPairsOneShort: short.length, sources: pack.sources.length, hintSteps: steps};
}
export default validateCuts;

if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateCuts(), null, 2));
