// Snug spinners: exact numbers in Q(√r), which points may centre which gap,
// the solve test, the width as a shape turns, moves and Undo, hints (in CPU
// time), saves, rendering of the build and spin views, and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {field, geometry} from '../dist/families/width/surd.js';
import widthModule, {widthMechanics, exactOf, joinable, snug, shapeOf, widthAt, verdictOf, layoutOf, spinFrame, support} from '../dist/families/width/width.js';
import {loadPack, FAMILIES} from '../scripts/packs.mjs';

const width = JSON.parse(await readFile(new URL('../dist/families/width/width.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => width.puzzles.find(p => p.id === id);
const M = widthMechanics.width;
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const arc = (gap, at) => ({type: 'arc', gap, at});

test('exact numbers a + b√r', () => {
  const F = field(5), x = F.parse('1/2|-3/4'), y = F.parse('-2|1');
  assert.equal(F.str(F.add(x, y)), '-3/2|1/4');
  assert.equal(F.str(F.mul(x, y)), '-19/4|2', '(1/2 − 3√5/4)(−2 + √5) = −1 − 15/4 + (1/2 + 3/2)√5');
  assert.ok(F.eq(F.mul(x, F.inv(x)), F.of(1)), 'inverse');
  assert.equal(F.sign(F.parse('9/4|-1')), 1, '9/4 > √5');
  assert.equal(F.sign(F.parse('2|-1')), -1, '2 < √5');
  assert.equal(F.sign(F.parse('-3|1')), -1);
  assert.equal(F.sign(F.parse('0|0')), 0);
  assert.throws(() => field(8), /square factor/);
  assert.throws(() => field(1));
  assert.throws(() => F.parse('1.5|0'), /not a fraction/);
  // The regular pentagon's corners in Q(√5): all star diagonals exactly equal.
  const q = byId('width-03').parameters, g = geometry(q.field, q.corners);
  const d = g.d2('A', 'C');
  for (const [u, v] of [['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'E']]) assert.ok(g.F.eq(g.d2(u, v), d), `${u}${v} is a diagonal`);
  assert.ok(!g.F.eq(g.d2('A', 'B'), d), 'a side is shorter');
  assert.equal(g.turn('A', 'B', 'C'), 1, 'counterclockwise');
});

test('which points may centre which gap, exactly', () => {
  const p1 = byId('width-01');
  assert.deepEqual(exactOf(p1).gaps.map(g => [...g.joins].sort()), [['C', 'mAB'], ['A', 'mBC'], ['B', 'mCA']]);
  assert.equal(joinable(p1, 0, 'mBC'), false, 'another side’s midpoint misses');
  assert.equal(joinable(p1, 0, 'A'), false, 'an end is not a centre');
  // Every irregular pentagon: only the corner across and the gap's own dots.
  for (const p of width.puzzles.filter(p => p.band !== 'playground')) {
    const e = exactOf(p), n = e.n;
    e.gaps.forEach((g, i) => {
      const own = Object.keys(p.parameters.pins).filter(id => id.slice(1) === `${g.a}${g.b}`);
      assert.deepEqual([...g.joins].sort(), [e.order[(i + (n + 1) / 2) % n], ...own].sort(), `${p.id} gap ${g.a}${g.b}`);
    });
  }
});

test('the solve: every arc on a corner with one radius; the width is constant exactly then', () => {
  for (const p of width.puzzles.filter(p => p.band !== 'playground')) {
    const answer = p.solution.arcs, {turn} = layoutOf(p);
    assert.ok(snug(p, answer), `${p.id}: the witness`);
    const shape = shapeOf(p, answer), w = widthAt(shape, 0);
    for (let k = 0; k < 90; k++) assert.ok(Math.abs(widthAt(shape, k * Math.PI / 90) - w) < 1e-9, `${p.id}: constant width`);
    assert.ok(verdictOf(p, answer).ok);
    // Swap in each other centre the gap allows: the width changes.
    exactOf(p).gaps.forEach((g, i) => g.joins.filter(c => c !== answer[i]).forEach(c => {
      const arcs = answer.map((x, j) => j === i ? c : x), v = verdictOf(p, arcs);
      assert.ok(!snug(p, arcs) && !v.ok, `${p.id}: ${c} on gap ${i} is not a solve`);
      assert.ok(v.worst > 0.02 && v.at > 0 && v.at < Math.PI, `${p.id}: the spin stops where the gap has changed`);
      assert.ok(Math.abs(widthAt(shapeOf(p, arcs), turn + v.at) - v.w0 - Math.sign(widthAt(shapeOf(p, arcs), turn + v.at) - v.w0) * v.worst) < 1e-12);
    }));
    assert.equal(snug(p, answer.map((c, i) => i ? c : null)), false, `${p.id}: an empty gap is not a solve`);
  }
});

test('support function and spin frames', () => {
  const p = byId('width-01'), shape = shapeOf(p, p.solution.arcs), {G, s, turn} = layoutOf(p);
  // The curved triangle with side 2: up is the corner A, down is the arc BC.
  assert.ok(Math.abs(support(shape, 0, 1).h - Math.sqrt(3)) < 1e-12);
  assert.ok(Math.abs(support(shape, 0, -1).h - (2 - Math.sqrt(3))) < 1e-12);
  for (const th of [0, 0.3, 1, 2.5]) {
    const f = spinFrame(shape, G, s, turn, th);
    assert.ok(Math.abs(f.top - (334 - 2 * s)) < 1e-9, 'the top rail never moves');
    assert.ok(Math.abs(f.touch[1][1] - 334) < 1e-9, 'the shape rests on the floor');
  }
  const e = {ellipse: {c: [0, 0], a: 30, b: 20}};
  assert.ok(Math.abs(widthAt(e, 0) - 40) < 1e-12 && Math.abs(widthAt(e, Math.PI / 2) - 60) < 1e-12, 'an oval is 40 one way and 60 the other');
});

test('moves, Undo, illegal moves and saves', () => {
  const p = byId('width-01');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {arcs: [null, null, null]});
  a = play(p, a, arc(0, 'mAB'), arc(1, 'A'), arc(2, 'B'));
  assert.equal(isSolved(p, a.board), false, 'a full shape that wobbles');
  a = play(p, a, arc(0, 'C'));
  assert.equal(isSolved(p, a.board), true);
  const back = undo(a);
  assert.deepEqual(back.board.arcs, ['mAB', 'A', 'B'], 'Undo takes back one arc');
  for (const [action, why] of [[arc(0, 'mBC'), 'a centre that misses'], [arc(0, 'A'), 'an end'], [arc(0, 'B'), 'the other end'], [arc(3, 'C'), 'no such gap'], [arc(0, 'X'), 'no such point'], [{type: 'arc', gap: 0}, 'no centre'], [{type: 'shape', shape: 1}, 'a playground move']]) assert.equal(move(p, freshAttempt(p), action), null, why);
  assert.equal(move(p, play(p, freshAttempt(p), arc(0, 'C')), arc(0, 'C')), null, 'the same centre again');
  for (const board of [{arcs: ['C', 'A', 'B'], done: true}, {arcs: ['C', 'A']}, {arcs: ['mBC', null, null]}, {arcs: ['A', null, null]}, {done: true}, {arcs: [0, null, null]}]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  assert.equal(validBoard(p, {arcs: ['mAB', null, 'B']}), true);
  // A repair starts full and spins.
  const r = byId('width-02'), ra = freshAttempt(r);
  assert.deepEqual(ra.board.arcs, r.parameters.start);
  assert.equal(isSolved(r, ra.board), false);
});

test('hints: a nudge first, then one arc at a time, quickly (CPU time)', () => {
  for (const p of width.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p), steps = 0;
    a = {...a, hintLevel: 1};
    assert.match(view(p, a), new RegExp(p.hints[0].replace(/[?’.]/g, '.')), `${p.id}: the authored first hint on a fresh board`);
    for (; !isSolved(p, a.board) && steps < 10; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint`);
      assert.equal(h.type, 'move');
      assert.match(h.text, /^Centre the arc from [A-E] to [A-E] on [A-E]\.$/);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
    assert.equal(nextHint(p, a).type, 'done');
  }
  // A wrong arc is put right before an empty gap is filled.
  const p = byId('width-03'), a = play(p, freshAttempt(p), arc(2, 'mCD'));
  assert.deepEqual(nextHint(p, a).action, arc(2, 'A'));
  assert.equal(nextHint(p, a).text, 'Centre the arc from C to D on A.');
});

test('rendering: the build view, a miss, the spin, hints; quick taps', () => {
  const p = byId('width-03');
  M.reset(p);
  let a = freshAttempt(p);
  let html = view(p, a);
  assert.match(html, /data-mechanic-wire="width"/);
  assert.match(html, /data-view="build"/);
  assert.equal((html.match(/class="wd-hit wd-gap"/g) || []).length, 5, 'five gaps');
  assert.equal((html.match(/class="wd-pt wd-corner/g) || []).length, 5, 'five corners');
  assert.equal((html.match(/class="wd-pt wd-pin/g) || []).length, 5, 'five dots');
  assert.match(html, /data-gap="0"[^>]*aria-pressed="true"/, 'the first gap is chosen');
  assert.match(html, /class="secondary wd-spin"[^>]*disabled/, 'Spin waits for a full shape');
  assert.ok(!html.includes(p.title), 'no puzzle title on the board');
  // A full shape that wobbles spins, with the band; the snug one keeps its rail.
  a = play(p, a, ...p.solution.arcs.map((c, i) => arc(i, i === 0 ? 'mAB' : c)));
  html = view(p, a);
  assert.match(html, /data-view="spin"/);
  assert.match(html, /class="wd-band"/);
  assert.doesNotMatch(html, /wd-top snug/);
  a = play(p, a, arc(0, 'D'));
  html = view(p, a);
  assert.match(html, /wd-top snug/);
  assert.equal((html.match(/class="wd-ghost"/g) || []).length, 3);
  // Spin again is view-only.
  const replay = JSON.parse(html.match(/data-ui="([^"]*)"/)[1].replace(/&quot;/g, '"'));
  M.ui(p, replay);
  assert.match(view(p, a), /data-view="spin"/);
  // Hint marks at level 2: the gap and the corner, on the spin too.
  const b = play(p, freshAttempt(p), ...p.solution.arcs.map((c, i) => arc(i, i === 1 ? 'mBC' : c)));
  html = view(p, {...b, hintLevel: 2});
  assert.match(html, /wd-hint-gap/);
  assert.match(html, /wd-hint-ring/);
  // Render and hint for the busiest board in well under 100 ms of CPU.
  const q = byId('width-09'), qa = play(q, freshAttempt(q), arc(0, `m${q.parameters.order[0]}${q.parameters.order[1]}`));
  const t = process.cpuUsage();
  view(q, {...qa, hintLevel: 2}); nextHint(q, qa);
  const u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 < 100, 'a quick render');
});

test('the playground: shapes, turning, the band, no hints', () => {
  const p = byId('width-playground');
  M.reset(p);
  assert.equal(M.noHint(p), true);
  let a = freshAttempt(p);
  assert.equal(isSolved(p, a.board), false);
  let html = view(p, a);
  assert.match(html, /role="slider"[^>]*aria-valuenow="0"/);
  assert.equal((html.match(/class="secondary wd-pick"/g) || []).length, p.parameters.shapes.length);
  const band = h => Number(h.match(/class="wd-band soft"[^>]*height="([^"]*)"/)[1]);
  assert.equal(band(html), 0, 'nothing has moved yet');
  a = play(p, a, {type: 'shape', shape: 2});
  view(p, a);
  M.ui(p, {turn: 15}); M.ui(p, {turn: 15}); M.ui(p, {turn: 15});
  html = view(p, a);
  assert.match(html, /aria-valuenow="45"/);
  assert.ok(band(html) > 50, 'the square lifted the rail');
  assert.equal(move(p, a, {type: 'shape', shape: 2}), null, 'the same shape');
  assert.equal(move(p, a, {type: 'shape', shape: 9}), null, 'no such shape');
  // A new shape starts unturned.
  a = play(p, a, {type: 'shape', shape: 4});
  assert.match(view(p, a), /aria-valuenow="0"/, 'a new shape starts unturned');
  M.ui(p, {turn: 90}); M.ui(p, {turn: 7});
  assert.equal(band(view(p, a)), 0, 'the curved triangle keeps the rail still');
  M.ui(p, {turn: 400});
  assert.match(view(p, a), /aria-valuenow="97"/, 'a turn payload past a quarter turn is ignored');
});

test('the family entry and its symbol', () => {
  assert.equal(widthModule.id, 'width');
  assert.deepEqual(widthModule.family, {id: 'width', symbol: '◬'});
  const others = FAMILIES.filter(m => m.family && m.id !== 'width').map(m => m.family.symbol);
  assert.ok(!others.includes('◬'), 'no other family uses ◬');
});
