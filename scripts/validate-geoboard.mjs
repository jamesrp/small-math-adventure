// Checks the Geoboard pack (dist/families/geoboard/geoboard.json): content
// fields and sources; every answer recomputed with geometry written apart
// from the mechanic's (area by vertical strips instead of the shoelace sum,
// outline dots by side gcds instead of testing every dot, inside dots by an
// upward ray instead of a sideways one, and its own crossing test); every
// triangle and four-sided band on each target board, with Pick's theorem
// checked on each of them; the area-6 records of the find-every puzzle; every
// cut of the cut puzzles; the holes Pick's rule needs; the impossible goals by
// Pick's count; witnesses played as moves; hint chains from fresh, after
// wrong moves, wrong claims and random play; illegal moves; forged saves.
// Run: node scripts/validate-geoboard.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {loadPack} from './packs.mjs';

/* ---------------- Independent lattice geometry ---------------- */
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const orient = (a, b, c) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
const within = (p, a, b) => p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
const onSide = (p, a, b) => orient(a, b, p) === 0 && within(p, a, b);
const eq = (p, q) => p[0] === q[0] && p[1] === q[1];
// How two closed segments meet: null, {point} or {overlap}.
function meeting(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  if (o1 === 0 && o2 === 0 && o3 === 0 && o4 === 0) {
    const shared = [a, b, c, d].filter((p, i) => i < 2 ? onSide(p, c, d) : onSide(p, a, b));
    if (!shared.length) return null;
    const uniq = shared.filter((p, i) => shared.findIndex(q => eq(p, q)) === i);
    return uniq.length > 1 ? {overlap: true} : {point: uniq[0]};
  }
  if (o1 !== o2 && o3 !== o4) {
    if (o1 === 0) return {point: c}; if (o2 === 0) return {point: d}; if (o3 === 0) return {point: a}; if (o4 === 0) return {point: b};
    return {point: null};
  }
  return null;
}
const sidesOf = loop => loop.map((p, i) => [p, loop[(i + 1) % loop.length]]);
// One simple loop: sides meet only where two in a row share their corner.
function simpleLoop(loop) {
  if (loop.length < 3) return false;
  const s = sidesOf(loop), n = s.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const m = meeting(...s[i], ...s[j]);
    if (!m) continue;
    const next = j === i + 1 ? s[i][1] : i === 0 && j === n - 1 ? s[i][0] : null;
    if (!next || m.overlap || !m.point || !eq(m.point, next)) return false;
  }
  return strips([loop]) > 0;
}
// Loops that never meet one another.
const apart = (u, v) => sidesOf(u).every(([a, b]) => sidesOf(v).every(([c, d]) => !meeting(a, b, c, d)));
// Area by vertical strips: inside each strip between whole x the sides are
// straight and do not cross, so the length cut at the strip's middle times 1
// is its area.
function strips(loops) {
  const xs = loops.flat().map(p => p[0]);
  let area = 0;
  for (let x = Math.min(...xs); x < Math.max(...xs); x++) {
    const xm = x + .5, ys = [];
    for (const [a, b] of loops.flatMap(sidesOf)) if ((a[0] < xm) !== (b[0] < xm)) ys.push(a[1] + (xm - a[0]) * (b[1] - a[1]) / (b[0] - a[0]));
    ys.sort((p, q) => p - q);
    for (let i = 0; i + 1 < ys.length; i += 2) area += ys[i + 1] - ys[i];
  }
  const half = Math.round(area * 2) / 2;
  assert.ok(Math.abs(half - area) < 1e-9, 'strip area is a whole number or a half');
  return half;
}
// Strictly inside a loop: count sides crossed by the ray going up.
function above(p, loop) {
  let n = 0;
  for (const [a, b] of sidesOf(loop)) {
    if ((a[0] <= p[0]) === (b[0] <= p[0])) continue;
    const y = a[1] + (p[0] - a[0]) * (b[1] - a[1]) / (b[0] - a[0]);
    if (y > p[1]) n++;
  }
  return n % 2 === 1;
}
// The record of an outline and its holes.
function record(loops) {
  const B = loops.flatMap(sidesOf).reduce((t, [a, b]) => t + gcd(b[0] - a[0], b[1] - a[1]), 0);
  const xs = loops[0].map(p => p[0]), ys = loops[0].map(p => p[1]);
  let I = 0;
  for (let x = Math.min(...xs); x <= Math.max(...xs); x++) for (let y = Math.min(...ys); y <= Math.max(...ys); y++) {
    const p = [x, y];
    if (loops.some(l => sidesOf(l).some(([a, b]) => onSide(p, a, b)))) continue;
    if (above(p, loops[0]) && !loops.slice(1).some(l => above(p, l))) I++;
  }
  return {area: strips(loops), inside: I, outline: B, holes: loops.length - 1};
}
const legalBands = loops => loops.every(simpleLoop) && loops.every((l, i) => loops.every((m, j) => j <= i || apart(l, m))) && loops.slice(1).every(h => above(h[0], loops[0]) && loops.slice(1).every(k => k === h || !above(h[0], k)));
const fits = (goal, r) => Object.entries(goal).every(([k, v]) => r[k] === v);
const turns = loop => loop.filter((p, i) => orient(loop[(i + loop.length - 1) % loop.length], p, loop[(i + 1) % loop.length]) !== 0).length;

// Every triangle and four-sided band (four real corners) on a board.
const bandCache = new Map();
function bandsOn(w, h) {
  const key = `${w}x${h}`;
  if (bandCache.has(key)) return bandCache.get(key);
  const pts = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) pts.push([x, y]);
  const out = [], n = pts.length;
  const take = loop => { if (turns(loop) === loop.length && simpleLoop(loop)) out.push({loop, corners: loop.length, rec: record([loop])}); };
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) for (let c = b + 1; c < n; c++) {
    take([pts[a], pts[b], pts[c]]);
    for (let d = c + 1; d < n; d++) { take([pts[a], pts[b], pts[c], pts[d]]); take([pts[a], pts[c], pts[b], pts[d]]); take([pts[a], pts[b], pts[d], pts[c]]); }
  }
  // Pick's theorem on every one of them.
  for (const {rec} of out) assert.equal(rec.area, rec.inside + rec.outline / 2 - 1, `Pick’s theorem on ${key}`);
  bandCache.set(key, out);
  return out;
}

// Cuts: every segment between two outline dots of a shape that touches the
// outline only at its ends and runs inside it, with its two pieces.
function boundaryDots(shape) {
  const out = [];
  for (const [a, b] of sidesOf(shape)) { const g = gcd(b[0] - a[0], b[1] - a[1]); for (let t = 0; t < g; t++) out.push([a[0] + (b[0] - a[0]) * t / g, a[1] + (b[1] - a[1]) * t / g]); }
  return out;
}
function cutsOf(shape) {
  const ring = boundaryDots(shape), out = [];
  for (let i = 0; i < ring.length; i++) for (let j = i + 1; j < ring.length; j++) {
    const a = ring[i], b = ring[j];
    const clear = sidesOf(shape).every(([c, d]) => { const m = meeting(a, b, c, d); return !m || (!m.overlap && m.point && (eq(m.point, a) || eq(m.point, b))); });
    if (!clear) continue;
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    if (!above(mid, shape)) continue;
    // The pieces: the dots of the outline ring from a to b, and from b to a.
    const piece = (from, to) => { const p = []; for (let k = from; ; k = (k + 1) % ring.length) { p.push(ring[k]); if (k === to) return p; } };
    out.push({a, b, pieces: [piece(i, j), piece(j, i)].map(p => record([p]))});
  }
  return out;
}

/* ---------------- Playing ---------------- */
const dotOf = (q, [x, y]) => y * q.w + x;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)} is legal`); return next; }, a);
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: refuses ${why}`);
const draw = (q, loops) => loops.flatMap(l => [...l.map(pt => ({type: 'dot', at: dotOf(q, pt)})), {type: 'dot', at: dotOf(q, l[0])}]);
function followHints(p, a, limit = 400) {
  let steps = 0;
  while (!isSolved(p, a.board)) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id}: a hint at step ${steps}`);
    assert.ok(h.text && !/undefined|NaN/.test(h.text), `${p.id}: hint text ${h.text}`);
    const next = move(p, a, h.action);
    assert.ok(next, `${p.id}: hint move ${JSON.stringify(h.action)} is legal`);
    a = next;
    assert.ok(++steps <= limit, `${p.id}: hints end within ${limit} steps`);
  }
  return steps;
}
// A small seeded random number generator for random play.
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
function randomPlay(p, a, random, n) {
  const q = p.parameters, size = q.mode === 'playground' ? a.board.size : null, w = size || q.w, h = size || q.h;
  for (let i = 0; i < n && !isSolved(p, a.board); i++) {
    const b = a.board, r = random();
    let action;
    if (q.mode === 'cut') action = {type: 'cut', a: Math.floor(random() * w * h), b: Math.floor(random() * w * h)};
    else if (r < .08) action = {type: 'clear'};
    else if (r < .35 && b.loops.length && !b.open.length) { const k = Math.floor(random() * b.loops.length); action = {type: 'corner', loop: k, index: Math.floor(random() * b.loops[k].length), to: Math.floor(random() * w * h)}; }
    else if (r < .45 && b.open.length >= 3) action = {type: 'dot', at: b.open[0]};
    else action = {type: 'dot', at: Math.floor(random() * w * h)};
    const next = move(p, a, action);
    if (next) a = next;
  }
  return a;
}

export async function validateGeoboard() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/geoboard/geoboard.json', import.meta.url), 'utf8'));
  const {puzzles: all} = await loadPack();
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  assert.ok(pack.sources.some(s => s.url.endsWith('lowell-math-circle-year-2/week-57')), 'the worksheet week');
  assert.ok(pack.sources.some(s => s.url.endsWith('plans/review/week-57.md')), 'the review card');
  assert.equal(pack.families.length, 1);
  assert.equal(pack.families[0].id, 'geoboard');
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 12, '8 to 12 puzzles');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  const counts = {}, kinds = {};
  let hintSteps = 0, bandsChecked = 0, cutsChecked = 0;
  for (const p of puzzles) {
    const q = p.parameters;
    for (const field of ['title', 'objective', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(String(p[field] || '').trim(), `${p.id}: ${field}`);
    assert.equal(p.hints.length, 3, `${p.id}: three hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field]?.trim(), `${p.id}: parent ${field}`);
    assert.ok(p.band === 'all' && p.mechanic === 'geoboard', `${p.id}: grade-free`);
    // No title names a number the child must find or the deciding condition.
    assert.ok(!/hole|can.?t|impossible/i.test(p.title), `${p.id}: the title gives nothing away`);
    const fresh = freshAttempt(p);
    assert.ok(validBoard(p, fresh.board) && !isSolved(p, fresh.board), `${p.id}: starts valid and unsolved`);
    kinds[p.id] = q.mode;

    if (q.mode === 'cut') {
      // Every cut of the shape, by the independent split.
      const cuts = cutsOf(q.shape), hits = cuts.filter(c => c.pieces.every(r => fits(q.piece, r)));
      cutsChecked += cuts.length;
      assert.equal(cuts.length, p.solution.cuts, `${p.id}: the number of cuts`);
      assert.equal(hits.length, 1, `${p.id}: exactly one cut matches`);
      const [want] = hits, given = p.solution.cut;
      assert.ok((eq(want.a, given[0]) && eq(want.b, given[1])) || (eq(want.a, given[1]) && eq(want.b, given[0])), `${p.id}: the matching cut is the solution`);
      assert.deepEqual(record([q.shape]), p.solution.whole, `${p.id}: the whole shape’s record`);
      // The seam lemma on every cut: I + B/2 − 1 adds.
      const whole = record([q.shape]), Q = r => r.inside + r.outline / 2 - 1;
      for (const c of cuts) assert.equal(Q(c.pieces[0]) + Q(c.pieces[1]), Q(whole), `${p.id}: the seam lemma`);
      // Wrong cuts, then the right one, and hints after a wrong cut.
      const [a0, b0] = given.map(pt => dotOf(q, pt));
      const solvedBoard = play(p, fresh, {type: 'cut', a: a0, b: b0});
      assert.ok(isSolved(p, solvedBoard.board), `${p.id}: the solution cut solves`);
      const wrong = cuts.find(c => c !== want);
      const afterWrong = play(p, fresh, {type: 'cut', a: dotOf(q, wrong.a), b: dotOf(q, wrong.b)});
      assert.ok(!isSolved(p, afterWrong.board), `${p.id}: a wrong cut does not solve`);
      hintSteps += followHints(p, fresh) + followHints(p, afterWrong);
      refuse(p, fresh, {type: 'cut', a: a0, b: a0}, 'a cut to the same dot');
      const insideDot = (() => { for (let x = 0; x < q.w; x++) for (let y = 0; y < q.h; y++) if (above([x, y], q.shape) && !sidesOf(q.shape).some(([u, v]) => onSide([x, y], u, v))) return [x, y]; })();
      refuse(p, fresh, {type: 'cut', a: a0, b: dotOf(q, insideDot)}, 'a cut ending at an inside dot');
      const along = sidesOf(q.shape)[0];
      refuse(p, fresh, {type: 'cut', a: dotOf(q, along[0]), b: dotOf(q, along[1])}, 'a cut along a side');
      refuse(p, fresh, {type: 'cut', a: a0, b: 999}, 'a cut off the board');
      refuse(p, solvedBoard, {type: 'cut', a: dotOf(q, wrong.a), b: dotOf(q, wrong.b)}, 'a move after the solve');
      refuse(p, fresh, {type: 'dot', at: 0}, 'a band move in a cut puzzle');
      for (const [board, why] of [[{cut: [b0, a0]}, 'a cut with its ends reversed'], [{cut: [dotOf(q, along[0]), dotOf(q, along[1])].sort((x, y) => x - y)}, 'a cut along a side'], [{cut: null, extra: 1}, 'an extra field'], [{cut: [a0]}, 'a cut with one end']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
      counts[p.id] = {cuts: cuts.length, answer: given};
      continue;
    }

    // Witnesses, by the independent counts.
    const shapes = q.mode === 'pair' ? q.witnesses.flatMap(x => x.shapes) : q.mode === 'every' ? q.witnesses.flatMap(x => x.shapes) : q.witnesses;
    for (const sh of [...shapes, ...(q.attempt?.shapes || [])]) {
      assert.ok(legalBands(sh), `${p.id}: witness ${JSON.stringify(sh)} is a legal band`);
      assert.ok(sh.flat().every(([x, y]) => x >= 0 && y >= 0 && x < q.w && y < q.h), `${p.id}: witness on the board`);
    }

    if (q.mode === 'every') {
      const recs = new Set(bandsOn(q.w, q.h).filter(x => x.rec.area === q.goal.area).map(x => `${x.rec.inside},${x.rec.outline}`));
      bandsChecked += bandsOn(q.w, q.h).length;
      // Pick: with area A, B = 2A + 2 − 2I ≥ 3, so I runs 0 .. A − 1.
      const pick = []; for (let I = 0; 2 * q.goal.area + 2 - 2 * I >= 3; I++) pick.push(`${I},${2 * q.goal.area + 2 - 2 * I}`);
      assert.deepEqual([...recs].sort(), [...pick].sort(), `${p.id}: every record Pick’s rule allows is on the board`);
      assert.deepEqual(q.records.map(r => r.join()).sort(), pick.sort(), `${p.id}: the records`);
      for (const wt of q.witnesses) for (const sh of wt.shapes) { const r = record(sh); assert.deepEqual([r.area, r.inside, r.outline], [q.goal.area, ...wt.record], `${p.id}: witness for ${wt.record}`); }
      // Play every witness, That's all too early, then hints.
      let a = fresh;
      const early = play(p, a, ...draw(q, q.witnesses[0].shapes[0]), {type: 'all'});
      assert.equal(early.board.told, 'more', `${p.id}: That’s all too early is refused`);
      refuse(p, early, {type: 'all'}, 'That’s all again before another record');
      assert.ok(!isSolved(p, early.board));
      for (const wt of q.witnesses) a = play(p, a, ...(a.board.loops.length || a.board.open.length ? [{type: 'clear'}] : []), ...draw(q, wt.shapes[0]));
      assert.equal(a.board.found.length, q.records.length, `${p.id}: the witnesses find every record`);
      a = play(p, a, {type: 'all'});
      assert.ok(isSolved(p, a.board), `${p.id}: That’s all with every record solves`);
      hintSteps += followHints(p, fresh) + followHints(p, early);
      for (const [board, why] of [
        [{...fresh.board, done: true}, 'done with nothing found'],
        [{...fresh.board, found: [q.witnesses[0].shapes[0][0].map(pt => dotOf(q, pt)), q.witnesses[0].shapes[0][0].map(pt => dotOf(q, pt))]}, 'a record found twice'],
        [{...fresh.board, found: [[0, 1, q.w]]}, 'a found shape of the wrong area'],
        [{...fresh.board, loops: [q.witnesses[1].shapes[0][0].map(pt => dotOf(q, pt))]}, 'a closed band of the goal’s area not kept'],
        [{...fresh.board, told: 'yes'}, 'an unknown reply']
      ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
      counts[p.id] = {records: q.records};
      continue;
    }

    if (q.holes) {
      for (const sh of q.witnesses) assert.ok(fits(q.goal, record(sh)), `${p.id}: hole witness matches`);
      const {area: A, inside: I, outline: B} = q.goal, h = A - (I + B / 2 - 1);
      assert.equal(h, p.solution.holes, `${p.id}: Pick’s rule needs ${h} holes`);
      assert.ok(q.witnesses.every(sh => sh.length - 1 === h), `${p.id}: the witnesses have ${h} holes`);
      assert.equal(bandsOn(q.w, q.h).filter(x => fits(q.goal, x.rec)).length, 0, `${p.id}: no triangle or four-sided band without holes`);
      bandsChecked += bandsOn(q.w, q.h).length;
      const a = play(p, fresh, ...draw(q, q.witnesses[0]));
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      // Holes: none outside the outline, on it, inside another hole or before the outline closes.
      const [outer] = q.witnesses[0], ring = play(p, fresh, ...draw(q, [outer]));
      refuse(p, ring, {type: 'dot', at: dotOf(q, outer[0])}, 'a hole started on the outline');
      refuse(p, ring, {type: 'dot', at: dotOf(q, [q.w - 1, q.h - 1])}, 'a hole started outside');
      refuse(p, play(p, fresh, {type: 'dot', at: dotOf(q, outer[0])}), {type: 'corner', loop: 0, index: 0, to: 0}, 'moving a corner with no closed band');
      const touching = play(p, ring, {type: 'dot', at: dotOf(q, [1, 1])});
      refuse(p, touching, {type: 'dot', at: dotOf(q, [0, 1])}, 'a hole side to the outline');
      hintSteps += followHints(p, fresh) + followHints(p, ring) + followHints(p, touching);
      const holeLoops = q.witnesses[0].map(l => l.map(pt => dotOf(q, pt)));
      for (const [board, why] of [
        [{...fresh.board, loops: [holeLoops[1], holeLoops[0]]}, 'the outline inside its hole'],
        [{...fresh.board, loops: [holeLoops[0], holeLoops[1], holeLoops[1]]}, 'a hole twice'],
        [{...fresh.board, loops: [holeLoops[0]], open: [dotOf(q, outer[1])]}, 'a hole started on the outline']
      ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
      counts[p.id] = {holes: h};
      continue;
    }

    // Targets and pairs: every triangle and four-sided band on the board.
    const bands = bandsOn(q.w, q.h), hits = bands.filter(x => fits(q.goal, x.rec));
    bandsChecked += bands.length;
    const census = {triangles: hits.filter(x => x.corners === 3).length, quads: hits.filter(x => x.corners === 4).length, areas: [...new Set(hits.map(x => x.rec.area))]};
    assert.deepEqual(census, p.solution.census, `${p.id}: the triangles and four-sided bands that match`);
    for (const sh of shapes) assert.ok(fits(q.goal, record(sh)), `${p.id}: witness ${JSON.stringify(sh)} matches the goal`);
    const keys = ['area', 'inside', 'outline'], hidden = keys.find(k => q.goal[k] === undefined);
    const {area: A, inside: I, outline: B} = q.goal;
    const forced = hidden === 'area' ? I + B / 2 - 1 : hidden === 'inside' ? A - B / 2 + 1 : 2 * (A - I + 1);
    const possible = hidden === 'area' ? forced > 0 : hidden === 'inside' ? Number.isInteger(forced) && forced >= 0 : forced >= 3;
    assert.equal(possible, hits.length > 0, `${p.id}: Pick’s count and the board agree`);
    if (q.mode === 'pair') {
      assert.ok(census.triangles && census.quads, `${p.id}: a triangle and a four-sided band exist`);
      let a = play(p, fresh, ...draw(q, q.witnesses[0].shapes[0]));
      assert.ok(a.board.found[0] && !a.board.found[1] && !isSolved(p, a.board), `${p.id}: the triangle is kept`);
      const half = a;
      a = play(p, a, {type: 'clear'}, ...draw(q, q.witnesses[1].shapes[0]));
      assert.ok(isSolved(p, a.board), `${p.id}: both shapes solve`);
      hintSteps += followHints(p, fresh) + followHints(p, half);
      const wrongTri = bands.find(x => x.corners === 3 && !fits(q.goal, x.rec)).loop;
      const wrong = play(p, fresh, ...draw(q, [wrongTri]));
      assert.deepEqual(wrong.board.found, [null, null], `${p.id}: a wrong triangle is not kept`);
      hintSteps += followHints(p, wrong);
      const quadDots = q.witnesses[1].shapes[0][0].map(pt => dotOf(q, pt)), triDots = q.witnesses[0].shapes[0][0].map(pt => dotOf(q, pt));
      for (const [board, why] of [[{...fresh.board, found: [quadDots, null]}, 'a four-sided shape in the triangle’s place'], [{...fresh.board, found: [triDots]}, 'one place'], [{...fresh.board, loops: [triDots]}, 'a matching triangle on the board not kept'], [{...fresh.board, found: [wrongTri.map(pt => dotOf(q, pt)), null]}, 'a triangle with other counts']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
      counts[p.id] = census;
      continue;
    }
    if (possible) {
      const a = play(p, fresh, ...draw(q, q.witnesses[0]));
      assert.ok(isSolved(p, a.board), `${p.id}: the witness solves`);
      if (q.cant) {
        // Can't is refused on a possible goal, whatever the number.
        const tried = play(p, fresh, ...draw(q, [bands.find(x => !fits(q.goal, x.rec)).loop]));
        const refusedRight = play(p, tried, {type: 'cant', value: forced});
        assert.equal(refusedRight.board.refused, forced, `${p.id}: Can’t with Pick’s number is refused`);
        assert.ok(!isSolved(p, refusedRight.board));
        refuse(p, refusedRight, {type: 'cant', value: forced}, 'the same refused claim again');
        const refusedOther = play(p, tried, {type: 'cant', value: forced + 1});
        assert.ok(!isSolved(p, refusedOther.board), `${p.id}: another number is refused`);
        hintSteps += followHints(p, refusedRight) + followHints(p, refusedOther);
        refuse(p, tried, {type: 'count'}, 'the Pick’s-count hint move on a possible goal');
        assert.equal(validBoard(p, {...tried.board, claimed: forced}), false, `${p.id}: rejects a claim on a possible goal`);
      }
      counts[p.id] = census;
    } else {
      assert.ok(q.cant, `${p.id}: an impossible goal offers Can’t`);
      // The certificate: Pick's count is no count of dots.
      assert.ok(hidden === 'outline' ? forced < 3 : !Number.isInteger(forced), `${p.id}: ${hidden} would be ${forced}`);
      refuse(p, fresh, {type: 'cant', value: forced}, 'Can’t before any band is tried');
      const open = play(p, fresh, {type: 'dot', at: 0}, {type: 'dot', at: 1});
      refuse(p, open, {type: 'cant', value: forced}, 'Can’t with only an open band');
      const tried = play(p, fresh, ...draw(q, q.attempt.shapes[0]));
      const wrong = play(p, tried, {type: 'cant', value: forced + .5});
      assert.ok(!isSolved(p, wrong.board) && wrong.board.refused === forced + .5, `${p.id}: a wrong number is refused`);
      refuse(p, wrong, {type: 'cant', value: forced + .5}, 'the same wrong number again');
      const right = play(p, wrong, {type: 'cant', value: forced});
      assert.ok(isSolved(p, right.board), `${p.id}: Can’t with Pick’s number solves`);
      for (const value of [-1, 41, .25, '2', null]) refuse(p, tried, {type: 'cant', value}, `Can’t with ${value}`);
      // The hint chain builds the attempt until the band matches the goal in
      // attempt.match, then gives Pick's count alone (its move fills the goal's
      // empty box and leaves the board), and only then the reason with Can't.
      assert.equal(record(q.attempt.shapes[0])[q.attempt.match], q.goal[q.attempt.match], `${p.id}: the attempt matches the goal’s ${q.attempt.match}`);
      const mech = mechanicFor(p);
      mech.reset(p);
      const first = nextHint(p, fresh);
      assert.ok(!['cant', 'count'].includes(first.action.type), `${p.id}: the first hint is an attempt, not Can’t`);
      const other = bands.find(x => x.rec[q.attempt.match] !== q.goal[q.attempt.match]);
      const elsewhere = play(p, fresh, ...draw(q, [other.loop]));
      assert.ok(['dot', 'corner', 'clear'].includes(nextHint(p, elsewhere).action.type), `${p.id}: a band that is not yet relevant gets a band move`);
      refuse(p, elsewhere, {type: 'count'}, 'Pick’s count before the band is relevant');
      for (const band of bands.filter(x => x.rec[q.attempt.match] === q.goal[q.attempt.match]).slice(0, 3).map(x => play(p, fresh, ...draw(q, [x.loop]))).concat([tried])) {
        mech.reset(p);
        const count = nextHint(p, band);
        assert.deepEqual(count.action, {type: 'count'}, `${p.id}: Pick’s count after a relevant band`);
        assert.ok(!/Can’t|at least|whole/.test(count.text) && count.text.includes('Pick’s rule needs'), `${p.id}: the count hint gives the count alone: ${count.text}`);
        assert.equal(move(p, band, count.action), band, `${p.id}: the count move leaves the board`);
        const last = nextHint(p, band);
        assert.deepEqual(last.action, {type: 'cant', value: forced}, `${p.id}: then Can’t`);
        assert.match(last.text, /Press Can’t\.$/, `${p.id}: the last hint names Can’t`);
        assert.ok(isSolved(p, move(p, band, last.action).board), `${p.id}: and solves`);
      }
      mech.reset(p);
      hintSteps += followHints(p, fresh) + followHints(p, wrong) + followHints(p, open) + followHints(p, elsewhere);
      for (const [board, why] of [[{...fresh.board, claimed: forced}, 'a claim with no band tried'], [{...tried.board, claimed: forced + .5}, 'a claim of the wrong number'], [{...tried.board, claimed: forced, refused: forced + .5}, 'a claim and a refusal together'], [{...tried.board, refused: forced}, 'Pick’s number refused']]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
      counts[p.id] = {cant: {[hidden]: forced}};
    }

    // Bands: crossing, touching, early closing, holes where none are allowed.
    const s0 = play(p, fresh, {type: 'dot', at: dotOf(q, [0, 0])}, {type: 'dot', at: dotOf(q, [2, 2])}, {type: 'dot', at: dotOf(q, [2, 0])});
    refuse(p, s0, {type: 'dot', at: dotOf(q, [0, 2])}, 'a side that crosses another');
    refuse(p, s0, {type: 'dot', at: dotOf(q, [1, 1])}, 'a side that ends on another');
    refuse(p, play(p, fresh, {type: 'dot', at: dotOf(q, [0, 0])}, {type: 'dot', at: dotOf(q, [2, 0])}), {type: 'dot', at: dotOf(q, [1, 0])}, 'a side that turns straight back');
    refuse(p, play(p, fresh, {type: 'dot', at: dotOf(q, [0, 0])}, {type: 'dot', at: dotOf(q, [1, 0])}), {type: 'dot', at: dotOf(q, [0, 0])}, 'closing a band of two corners');
    const tri = play(p, s0, {type: 'dot', at: dotOf(q, [0, 0])});
    const big = play(p, fresh, ...draw(q, [[[0, 0], [3, 0], [0, 3]]]));
    refuse(p, big, {type: 'dot', at: dotOf(q, [1, 1])}, 'a hole where none are allowed');
    if (!q.cant) refuse(p, big, {type: 'cant', value: 0}, 'Can’t where it is not offered');
    refuse(p, tri, {type: 'corner', loop: 0, index: 1, to: dotOf(q, [2, 0])}, 'a corner onto another corner');
    refuse(p, tri, {type: 'corner', loop: 0, index: 1, to: 9999}, 'a corner off the board');
    refuse(p, tri, {type: 'corner', loop: 1, index: 0, to: 0}, 'a corner of a band that is not there');
    refuse(p, tri, {type: 'size', size: 5}, 'a board size outside the playground');
    refuse(p, tri, {type: 'all'}, 'That’s all outside a find-every puzzle');
    refuse(p, fresh, {type: 'clear'}, 'clearing an empty board');
    refuse(p, fresh, {type: 'dot', at: -1}, 'a dot off the board');
    hintSteps += followHints(p, s0) + followHints(p, tri);
    for (const [board, why] of [
      [{...fresh.board, loops: [[dotOf(q, [0, 0]), dotOf(q, [2, 2]), dotOf(q, [2, 0]), dotOf(q, [0, 2])]]}, 'a band whose sides cross'],
      [{...fresh.board, loops: [[0, 1]]}, 'a band of two corners'],
      [{...fresh.board, loops: [[0, 1, q.w]], open: [q.w + 1]}, 'a second band where none are allowed'],
      [{...fresh.board, extra: true}, 'an extra field'],
      [{...fresh.board, open: [0, 9999]}, 'a dot off the board']
    ]) assert.equal(validBoard(p, board), false, `${p.id}: rejects ${why}`);
  }

  // Hints alone solve from random play, three seeds a puzzle.
  for (const p of puzzles) for (const seed of [1, 2, 3]) {
    const a = randomPlay(p, freshAttempt(p), rng(seed * 7919 + p.number), 14);
    hintSteps += followHints(p, a);
  }

  // The playground: any size, holes, never solved, no hint.
  const pg = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(pg && mechanicFor(pg).noHint(pg), 'the playground has no Hint');
  let a = freshAttempt(pg);
  assert.equal(a.board.size, 7);
  const q7 = {w: 7, h: 7};
  a = play(pg, a, ...draw(q7, [[[0, 0], [4, 0], [4, 4], [0, 4]], [[1, 1], [3, 1], [3, 3], [1, 3]]]));
  assert.ok(!isSolved(pg, a.board), 'the playground is never solved');
  const sized = play(pg, a, {type: 'size', size: 9});
  assert.deepEqual([sized.board.loops, sized.board.open, sized.board.size], [[], [], 9], 'a new size clears the board');
  refuse(pg, sized, {type: 'size', size: 9}, 'the same size');
  refuse(pg, sized, {type: 'size', size: 6}, 'an unknown size');
  assert.equal(validBoard(pg, {...a.board, size: 6}), false, 'the playground rejects an unknown size');
  assert.equal(validBoard(pg, {...a.board, loops: [[0, 1, 7], [0, 1, 7]]}), false, 'the playground rejects two bands that meet');

  bandsChecked = [...bandCache.values()].reduce((t, list) => t + list.length, 0);
  return {puzzles: puzzles.length, boards: [...bandCache.keys()], bandsChecked, cutsChecked, hintSteps, answers: counts};
}
export default validateGeoboard;
if (process.argv[1] === new URL(import.meta.url).pathname) console.log(JSON.stringify(await validateGeoboard(), null, 2));
