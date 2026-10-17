// Snug spinners: exact numbers in Q(√r), which points may centre which gap,
// the solve test, the width as a shape turns, moves and Undo, placing a
// missing corner, hints (in CPU time, never naming the answer), saves,
// rendering of the build and spin views, and the playground.
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
const puzzles = width.puzzles.filter(p => p.band !== 'playground');
const spotOf = p => p.solution.corner ?? null;

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
  // Every puzzle (with the missing corner in its place): only the corner
  // across and the gap's own dots.
  for (const p of puzzles) {
    const e = exactOf(p, spotOf(p)), n = e.n;
    e.gaps.forEach((g, i) => {
      const own = Object.keys(p.parameters.pins || {}).filter(id => id.slice(1) === `${g.a}${g.b}`);
      assert.deepEqual([...g.joins].sort(), [e.order[(i + (n + 1) / 2) % n], ...own].sort(), `${p.id} gap ${g.a}${g.b}`);
    });
  }
  // Before the corner is placed, the gaps beside it are not there and nothing centres the gap across.
  const h = byId('width-07'), e0 = exactOf(h), X = h.parameters.open;
  e0.gaps.forEach(g => { if (g.a === X || g.b === X) assert.deepEqual([g.live, g.joins], [false, []]); });
  assert.deepEqual(e0.gaps[h.solution.arcs.indexOf(X)].joins, [], 'no corner centres the gap across from the missing corner');
});

test('the solve: every arc on a corner with one radius; the width is constant exactly then', () => {
  for (const p of puzzles) {
    const answer = p.solution.arcs, spot = spotOf(p), {turn} = layoutOf(p);
    assert.ok(snug(p, answer, spot), `${p.id}: the witness`);
    const shape = shapeOf(p, answer, spot), w = widthAt(shape, 0);
    for (let k = 0; k < 90; k++) assert.ok(Math.abs(widthAt(shape, k * Math.PI / 90) - w) < 1e-9, `${p.id}: constant width`);
    assert.ok(verdictOf(p, answer, spot).ok);
    // Swap in each other centre the gap allows: the width changes.
    exactOf(p, spot).gaps.forEach((g, i) => g.joins.filter(c => c !== answer[i]).forEach(c => {
      const arcs = answer.map((x, j) => j === i ? c : x), v = verdictOf(p, arcs, spot);
      assert.ok(!snug(p, arcs, spot) && !v.ok, `${p.id}: ${c} on gap ${i} is not a solve`);
      assert.ok(v.worst > 0.02 && v.at > 0 && v.at < Math.PI, `${p.id}: the spin stops where the gap has changed`);
      assert.ok(Math.abs(widthAt(shapeOf(p, arcs, spot), turn + v.at) - v.w0 - Math.sign(widthAt(shapeOf(p, arcs, spot), turn + v.at) - v.w0) * v.worst) < 1e-12);
    }));
    assert.equal(snug(p, answer.map((c, i) => i ? c : null), spot), false, `${p.id}: an empty gap is not a solve`);
    if (spot) for (const other of Object.keys(p.parameters.spots)) if (other !== spot) assert.equal(snug(p, answer, other), false, `${p.id}: the witness arcs on ${other}`);
  }
});

test('half circles on the triangle: 3 along a side, 2 + √3/2 across it, and no corner touches a rail', () => {
  const p = byId('width-01'), arcs = ['mAB', 'mBC', 'mCA'], shape = shapeOf(p, arcs);
  let lo = Infinity, hi = -Infinity;
  for (let k = 0; k < 3600; k++) {
    const t = k * Math.PI / 3600, ux = Math.sin(t), uy = Math.cos(t), w = widthAt(shape, t);
    lo = Math.min(lo, w); hi = Math.max(hi, w);
    // Each rail rests on a half circle: strictly beyond every corner.
    for (const [x, y] of [[ux, uy], [-ux, -uy]]) assert.ok(support(shape, x, y).h > Math.max(...shape.corners.map(c => c[0] * x + c[1] * y)) + 0.1, 'no corner touches a rail');
  }
  assert.ok(Math.abs(lo - (2 + Math.sqrt(3) / 2)) < 1e-6, `least width ${lo}`);
  assert.ok(Math.abs(hi - 3) < 1e-6, `greatest width ${hi}`);
  assert.ok(Math.abs(widthAt(shape, 0) - (2 + Math.sqrt(3) / 2)) < 1e-12 && Math.abs(widthAt(shape, Math.PI / 2) - 3) < 1e-12, 'across a side, and along it');
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

test('placing the missing corner: moves, Undo, illegal moves and saves', () => {
  const p = byId('width-07'), q = p.parameters, X = q.open, right = p.solution.corner, answer = p.solution.arcs;
  const wrong = Object.keys(q.spots).find(s => s !== right), gx = q.order.indexOf(X), gPrev = (gx + 4) % 5, gAcross = answer.indexOf(X);
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {corner: null, arcs: q.start});
  assert.equal(q.start.filter(Boolean).length, 2, 'two arcs are drawn at the start');
  assert.equal(move(p, a, arc(gAcross, X)), null, 'nothing is centred on a corner that is not there');
  assert.equal(move(p, a, arc(gx, answer[gx])), null, 'no arc ends at a corner that is not there');
  a = play(p, a, {type: 'corner', at: wrong});
  assert.equal(a.board.corner, wrong);
  // On a wrong spot some arc beside it, or across from it, cannot be drawn.
  const misses = [gPrev, gx, gAcross].filter(i => !joinable(p, i, answer[i], wrong));
  assert.ok(misses.length >= 1);
  const ok = [gPrev, gx, gAcross].find(i => joinable(p, i, answer[i], wrong));
  if (ok != null) a = play(p, a, arc(ok, answer[ok]));
  // Moving the corner takes its arcs with it; Undo brings them back.
  const moved = play(p, a, {type: 'corner', at: right});
  assert.deepEqual(moved.board, {corner: right, arcs: q.start});
  assert.deepEqual(undo(moved).board, a.board, 'Undo puts the corner and its arcs back');
  let b = moved;
  for (const i of [gPrev, gx, gAcross]) b = play(p, b, arc(i, answer[i]));
  assert.equal(isSolved(p, b.board), true);
  for (const [action, why] of [[{type: 'corner', at: 'Z'}, 'no such spot'], [{type: 'corner', at: right}, 'the same spot'], [{type: 'corner', at: q.order[0]}, 'a corner for a spot'], [arc(gAcross, wrong), 'a spot as a centre']]) assert.equal(move(p, moved, action), null, why);
  for (const board of [{corner: right, arcs: answer, done: true}, {arcs: answer}, {corner: wrong, arcs: answer}, {corner: null, arcs: answer}, {corner: 'Z', arcs: q.start}, {corner: right, arcs: answer.slice(1)}]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  assert.equal(validBoard(p, {corner: right, arcs: answer}), true);
  // A puzzle with every corner has no corner to place.
  assert.equal(move(byId('width-01'), freshAttempt(byId('width-01')), {type: 'corner', at: 's1'}), null);
});

test('hints: a nudge first, then questions; the board marks the answer; quickly (CPU time)', () => {
  for (const p of puzzles) {
    let a = freshAttempt(p), steps = 0;
    a = {...a, hintLevel: 1};
    assert.match(view(p, a), new RegExp(p.hints[0].replace(/[?’.()]/g, '.')), `${p.id}: the authored first hint on a fresh board`);
    for (; !isSolved(p, a.board) && steps < 10; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint`);
      assert.equal(h.type, 'move');
      // The text asks; it never names the centre or the spot.
      assert.match(h.text, /\?$/);
      if (h.action.type === 'arc') assert.doesNotMatch(h.text, new RegExp(`\\b${h.action.at}\\b`), `${p.id}: “${h.text}”`);
      else assert.ok(!h.text.includes(p.parameters.names[h.action.at]) && !h.text.includes(h.action.at));
      // After a move the card shows the question, and the board rings the answer from the second level.
      const card = view(p, {...a, moves: 1, hintLevel: 1});
      assert.ok(card.includes(h.text.replace(/’/g, '’')) || card.includes(h.text), `${p.id}: the card shows the question`);
      const marked = view(p, {...a, moves: 1, hintLevel: 2});
      assert.match(marked, h.action.type === 'arc' ? new RegExp(`wd-corner[^"]*hinted[^>]*data-pt="${h.action.at}"|wd-hint-ring`) : new RegExp(`wd-spot hinted[^>]*data-pt="${h.action.at}"`), `${p.id}: the board marks the answer at level 2`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
    assert.equal(nextHint(p, a).type, 'done');
  }
  // A wrong arc is put right before an empty gap is filled.
  const p = byId('width-04'), a = play(p, freshAttempt(p), arc(2, 'mCD'));
  assert.deepEqual(nextHint(p, a).action, arc(2, 'A'));
  assert.equal(nextHint(p, a).text, 'The arc from C to D is centred on a dot. Which corner could the compass reach both C and D from?');
  assert.equal(nextHint(byId('width-01'), freshAttempt(byId('width-01'))).text, 'Which corner could the compass reach both A and B from?');
  // A missing corner: a nudge that names no other corner and no distance; the
  // board rings the spot from the second level.
  const h = byId('width-07'), X = h.parameters.open, right = h.solution.corner, wrong = Object.keys(h.parameters.spots).find(t => t !== right);
  assert.equal(nextHint(h, freshAttempt(h)).text, `Which spot lets corner ${X}’s arcs have the same radius as the two already drawn?`);
  const placed = play(h, freshAttempt(h), {type: 'corner', at: wrong});
  assert.equal(nextHint(h, placed).text, `Can corner ${X}’s arcs have the same radius as the two already drawn, from here?`);
  assert.deepEqual(nextHint(h, placed).action, {type: 'corner', at: right});
});

test('rendering: the build view, a miss, the spin, hints; quick taps', () => {
  const p = byId('width-04');
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
  const q = byId('width-05'), qa = play(q, freshAttempt(q), arc(0, `m${q.parameters.order[0]}${q.parameters.order[1]}`));
  let t = process.cpuUsage();
  view(q, {...qa, hintLevel: 2}); nextHint(q, qa);
  let u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 < 100, 'a quick render');
  // A missing corner: spots, a dotted line where it goes, then a corner on a spot.
  const h = byId('width-09'), spots = Object.keys(h.parameters.spots);
  M.reset(h);
  let ha = freshAttempt(h);
  html = view(h, ha);
  assert.equal((html.match(/class="wd-pt wd-spot/g) || []).length, spots.length, 'every spot');
  assert.equal((html.match(/class="wd-pt wd-corner/g) || []).length, 4, 'four corners');
  assert.match(html, /class="wd-open"/);
  assert.equal((html.match(/class="wd-hit wd-gap"/g) || []).length, 3, 'only the gaps between the corners there');
  assert.doesNotMatch(html, /aria-pressed="true"/, 'no gap is chosen before the corner is placed');
  assert.match(html, /role="status">Corner [A-E] is not on a spot yet\.</);
  ha = play(h, ha, {type: 'corner', at: spots[0]});
  assert.match(view(h, ha), /aria-pressed="true"/, 'a gap is chosen once the corner is placed');
  t = process.cpuUsage();
  html = view(h, {...ha, hintLevel: 2});
  u = process.cpuUsage(t);
  assert.ok((u.user + u.system) / 1000 < 100, 'a quick render with spots');
  assert.equal((html.match(/class="wd-pt wd-spot/g) || []).length, spots.length - 1, 'the spot under the corner is not drawn');
  assert.equal((html.match(/class="wd-pt wd-corner/g) || []).length, 5);
  assert.doesNotMatch(html, /class="wd-open"/);
  assert.match(html, new RegExp(`data-pt="${h.parameters.open}"[^>]*aria-label="Corner ${h.parameters.open}, on spot 1"`));
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
  assert.deepEqual(widthModule.family, {id: 'width', symbol: '⌓'});
  const others = FAMILIES.filter(m => m.family && m.id !== 'width').map(m => m.family.symbol);
  assert.ok(!others.includes('⌓'), 'no other family uses ⌓');
});
