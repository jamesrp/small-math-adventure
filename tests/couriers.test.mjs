// Mirror Couriers (base mechanic `billiard`), reworked for Week 9: geometry,
// every puzzle, the Can't certificates and their refusals, Undo, hints,
// drawing, saves from revision 1, the road's picks and tap speed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  billiard, launchOutcome, firstCrossing, aimAt, aimOutcome, unfoldLine, foldPoint, foldMap, simulateBilliard, cornerMap,
  reachable, judgeLine, judgeHalf, lineOf, roomsFor, everyAnswer, judgeShelf, legacyBilliardBoard, launchesHold, foldCorner, HOME
} from '../dist/couriers.js';
import { motionMechanics } from '../dist/motion.js';
import { freshAttempt, move, undo, isSolved, nextHint } from '../dist/engine.js';
import { emptyStore, validateStore, parseBackup } from '../dist/storage.js';
import { freshJourney, STOPS, rivalScore, starsFor, scoreOf, withCampaignPuzzles } from '../dist/road.js';
import { visiblePuzzleObjective, puzzleObjective } from '../dist/puzzle-copy.js';
import { playInstructions } from '../dist/expansion.js';

const { puzzles: pack } = JSON.parse(readFileSync(new URL('../dist/puzzles.json', import.meta.url), 'utf8'));
const puzzles = pack.filter(p => p.mechanic === 'billiard');
const byId = id => puzzles.find(p => p.id === id);
const play = (p, board, actions) => actions.reduce((b, a) => { const next = billiard.move(p, b, a); assert.ok(next, `${p.id}: ${JSON.stringify(a)}`); return next; }, board);
const fresh = p => billiard.fresh(p);

// An independent walker on a scaled lattice (one tick per unit step).
function walk(width, height, rise = 1, run = 1) {
  const s = rise * run, w = width * s, h = height * s;
  let x = 0, y = 0, dx = run, dy = rise, bounces = 0;
  for (;;) {
    x += dx; y += dy;
    const side = x === 0 || x === w, end = y === 0 || y === h;
    if (side && end) return { corner: `${y === h ? 'top' : 'bottom'}-${x === w ? 'right' : 'left'}`, bounces };
    if (side) { dx = -dx; bounces++; }
    if (end) { dy = -dy; bounces++; }
  }
}

test('the unfolding rule agrees with a step-by-step walk, and the ball never comes home', () => {
  for (let w = 1; w <= 14; w++) for (let h = 1; h <= 14; h++) for (let rise = 1; rise <= 3; rise++) for (let run = 1; run <= 3; run++) {
    const rule = launchOutcome(w, h, rise, run), stepped = walk(w, h, rise, run);
    assert.equal(rule.corner, stepped.corner, `${w}×${h} ${rise}/${run}`);
    assert.equal(rule.bounces, stepped.bounces);
    assert.notEqual(rule.corner, HOME);
    // Parity: a top-right stop is even, top-left and bottom-right are odd.
    assert.equal(rule.bounces % 2 === 0, rule.corner === 'top-right');
    const sim = simulateBilliard(w, h, rise, run);
    assert.equal(sim.path.length, sim.bounces + 2);
    assert.equal(sim.corner, rule.corner);
  }
  // One bounce exactly when one side is twice the other.
  for (let w = 1; w <= 12; w++) for (let h = 1; h <= 12; h++) assert.equal(launchOutcome(w, h).bounces === 1, w === 2 * h || h === 2 * w);
});

test('unfoldLine walks a staircase of rooms, folds into the bouncing path and ends at the first crossing', () => {
  for (const [w, h, rise, run] of [[2, 3, 1, 1], [4, 3, 1, 1], [6, 10, 1, 1], [4, 3, 2, 1], [3, 2, 10, 3], [5, 5, 1, 1]]) {
    const line = unfoldLine(w, h, rise, run), [a, b] = firstCrossing(w, h, rise, run);
    assert.deepEqual([line.across, line.up], [a, b]);
    assert.equal(line.points.length, a + b, 'start, one point per copy wall crossed, and the stop');
    assert.equal(line.rooms.length, a + b - 1);
    for (let k = 1; k < line.rooms.length; k++) {
      const [x0, y0] = line.rooms[k - 1], [x1, y1] = line.rooms[k];
      assert.equal(Math.abs(x1 - x0) + Math.abs(y1 - y0), 1, 'neighbouring rooms share a wall');
    }
    assert.deepEqual(line.rooms.at(-1), [a - 1, b - 1]);
    assert.deepEqual(line.points.map(pt => foldPoint(w, h, pt)), simulateBilliard(w, h, rise, run).path);
    // Each staircase room maps onto the room by a reflection that sends its corners to room corners.
    for (const [i, j] of line.rooms) {
      const f = foldMap(w, h, i, j), X = x => f.sx * x + f.tx, Y = y => f.sy * y + f.ty;
      assert.deepEqual([X(i * w), X((i + 1) * w)].sort((m, n) => m - n), [0, w]);
      assert.deepEqual([Y(j * h), Y((j + 1) * h)].sort((m, n) => m - n), [0, h]);
    }
    // Aiming at the first crossing is the original direction.
    const aim = aimAt(w, h, a, b), g = (m, n) => (n ? g(n, m % n) : m), k = g(rise, run);
    assert.deepEqual(aim, { rise: rise / k, run: run / k });
  }
  // Aiming at a corner that is not first on its line stops earlier.
  assert.deepEqual(aimOutcome(4, 3, 5, 5), { corner: 'top-right', bounces: 0, across: 1, up: 1 });
  assert.throws(() => unfoldLine(0, 1));
});

test('the corner map marks every copy corner by where it folds and how many bounces it takes', () => {
  const map = cornerMap(6, 6);
  assert.equal(map.length, 36);
  for (const c of map) {
    const [i, j] = c.at;
    assert.equal(c.corner, foldCorner(i, j));
    assert.equal(c.bounces, i + j - 2);
    if (c.corner === 'top-right') assert.equal(c.bounces % 2, 0);
    if (c.corner === HOME) assert.ok(i % 2 === 0 && j % 2 === 0);
  }
  assert.equal(reachable({ corner: 'top-right', bounces: 3 }), false);
  assert.equal(reachable({ corner: 'bottom-right', bounces: 8 }), false);
  assert.equal(reachable({ corner: HOME }), false);
  assert.equal(reachable({ corner: 'top-left', bounces: 13 }), true);
  assert.equal(reachable({ corner: 'top-right', bounces: 8 }), true);
});

test('the puzzle set: levels, one impossible target per level, distinct data, kept ids', () => {
  assert.equal(puzzles.length, 18);
  assert.deepEqual(puzzles.map(p => p.id), Array.from({ length: 18 }, (_, i) => `billiard-${String(i + 1).padStart(2, '0')}`));
  assert.deepEqual(puzzles.map(p => p.number), Array.from({ length: 18 }, (_, i) => i + 1));
  for (const p of puzzles) assert.equal(p.revision, p.number <= 12 ? 2 : 1, p.id);
  const impossible = puzzles.filter(p => p.parameters.mode === 'shape' && !reachable(p.parameters.target));
  assert.deepEqual(impossible.map(p => [p.difficulty_level, p.id]), [['easy', 'billiard-16'], ['medium', 'billiard-17'], ['hard', 'billiard-18']]);
  for (const p of puzzles) {
    assert.ok(p.provenance && p.source_refs.length, `${p.id}: provenance`);
    assert.ok(!/predict/i.test(p.parameters.mode), 'no prediction screens');
    // Old answers still answer the reworked puzzle of the same id.
  }
  const answers = id => byId(id).solution.answers;
  assert.ok(answers('billiard-01').includes('2×4') && answers('billiard-02').includes('2×3') && answers('billiard-03').includes('6×10'));
  assert.ok(answers('billiard-04').includes('2×6') && answers('billiard-07').includes('4×3') && answers('billiard-08').includes('4×6') && answers('billiard-10').includes('4×8'));
  for (const [id, aim] of [['billiard-05', '3,2'], ['billiard-05', '1,4'], ['billiard-06', '1,5'], ['billiard-09', '3,5'], ['billiard-09', '5,3'], ['billiard-11', '3,7'], ['billiard-11', '7,3'], ['billiard-12', '5,6']]) assert.ok(answers(id).includes(aim), `${id} ${aim}`);
});

for (const p of puzzles) test(`${p.id}: witness, hints from fresh and after a wrong move, accepted answers`, () => {
  const q = p.parameters;
  assert.equal(billiard.valid(p, fresh(p)), true);
  assert.equal(billiard.solved(p, fresh(p)), false);
  const solved = play(p, fresh(p), p.solution.moves);
  assert.equal(billiard.solved(p, solved), true);
  assert.equal(billiard.valid(p, JSON.parse(JSON.stringify(solved))), true);
  assert.deepEqual(billiard.hint(p, solved), { type: 'done' });
  // Every listed answer is accepted on its own.
  for (const answer of p.solution.answers) {
    const [a, b] = answer.split(/[×,]/).map(Number);
    if (q.mode === 'shape') assert.equal(billiard.move(p, fresh(p), { type: 'launch', room: [a, b] }).done, true, answer);
    if (q.mode === 'aim') assert.equal(billiard.move(p, fresh(p), { type: 'launch', aim: [a, b] }).done, true, answer);
    if (q.mode === 'cross') assert.equal(billiard.move(p, fresh(p), { type: 'tap', at: [a, b] }).done, true, answer);
  }
  // The engine's hint loop solves the puzzle, from fresh and after a wrong first move.
  for (const start of [freshAttempt(p), (() => {
    const wrong = q.mode === 'aim' ? { type: 'launch', aim: [1, 1] } : q.mode === 'cross' ? { type: 'tap', at: [1, 0] } : { type: 'launch', room: q.mode === 'every' ? [1, 1] : q.start };
    return move(p, freshAttempt(p), wrong);
  })()]) {
    let a = start;
    for (let i = 0; i < 40 && !isSolved(p, a.board); i++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 50, `${p.id}: a quick hint (CPU time)`);
      assert.equal(h.type, 'move', h.text);
      a = move(p, a, h.action);
      assert.ok(a);
    }
    assert.ok(isSolved(p, a.board));
  }
  // The authored first hint names no answer.
  for (const answer of p.solution.answers) assert.ok(!p.hints[0].includes(answer.replace('×', ' by ')) && !p.hints[0].includes(answer), `${p.id}: first hint`);
  assert.doesNotMatch(p.hints[0], /Can.t/, `${p.id}: the first hint never says Can't`);
  // Nor the deciding condition: parity, doubling or a room's proportions.
  assert.doesNotMatch(p.hints[0], /\b(odd|even|twice|double|half|wider|taller|thin|three times)\b/i, `${p.id}: the first hint is a nudge toward an attempt`);
});

test('Can’t comes after a launch, and its claim on the corner map is judged when the last tap is in', () => {
  const p = byId('billiard-17'), q = p.parameters;
  assert.equal(billiard.move(p, fresh(p), { type: 'cant' }), null, 'no Can’t on a fresh board');
  let b = play(p, fresh(p), [{ type: 'launch', room: [2, 3] }, { type: 'cant' }]);
  assert.deepEqual(b.cert, []);
  // Can't opens the map and closes it again in the same place, so it carries
  // data-toggle: a quick double tap doesn't close the map it just opened.
  for (const board of [play(p, fresh(p), [{ type: 'launch', room: [2, 3] }]), b]) assert.match(billiard.render(p, { board }), /<button[^>]*data-toggle="cr-cant"[^>]*>Can’t<\/button>/);
  // Taps toggle without a verdict; nothing is tinted or judged until That's all.
  b = play(p, b, [{ type: 'tap', at: [1, 4] }, { type: 'tap', at: [2, 3] }]);
  assert.equal(b.told, null);
  assert.doesNotMatch(billiard.render(p, { board: b, hintLevel: 0 }), /hinted|cr-bounces/);
  // Any wrong set gets one refusal that clears the taps and rings nothing: a
  // corner off the line and a missing corner are refused alike, so tapping
  // one corner and pressing That's all is not a yes/no oracle.
  const refusal = 'Those aren’t exactly the corners where it stops after 3 bounces.';
  let c = play(p, b, [{ type: 'tap', at: [1, 1] }, { type: 'done' }]);
  assert.deepEqual(c.cert, []);
  assert.deepEqual(c.told, { code: 'wrong', sel: [[1, 4], [2, 3], [1, 1]] });
  assert.ok(billiard.render(p, { board: c }).includes(refusal));
  assert.doesNotMatch(billiard.render(p, { board: c }), /refused/);
  c = play(p, b, [{ type: 'done' }]);
  assert.deepEqual(c.told, { code: 'wrong', sel: [[1, 4], [2, 3]] });
  assert.ok(billiard.render(p, { board: c }).includes(refusal));
  for (const at of [[1, 4], [1, 1], [5, 5]]) {
    const one = play(p, fresh(p), [{ type: 'launch', room: [2, 3] }, { type: 'cant' }, { type: 'tap', at }, { type: 'done' }]);
    assert.deepEqual(one.told, { code: 'wrong', sel: [at] }, `one corner ${at}`);
  }
  // Undo brings the taps back with the refusal, and That's all stays off until they change.
  const restored = billiard.carry(p, c, b);
  assert.deepEqual(restored.told, c.told);
  assert.equal(billiard.move(p, restored, { type: 'done' }), null);
  assert.ok(billiard.render(p, { board: restored }).includes(refusal));
  assert.match(billiard.render(p, { board: restored }), /data-move="[^"]*done[^"]*"[^>]*disabled/);
  // The full line: accepted, then the argument is drawn with every bounce count.
  const done = play(p, b, [{ type: 'tap', at: [3, 2] }, { type: 'tap', at: [4, 1] }, { type: 'done' }]);
  assert.equal(billiard.solved(p, done), true);
  const html = billiard.render(p, { board: done });
  assert.match(html, /class="cr-proof"/);
  assert.equal((html.match(/class="cr-bounces/g) || []).length, q.map[0] * q.map[1]);
  assert.equal(judgeLine(q, lineOf(q).map(c => c.at)).code, 'accept');
});

test('a claim on a possible board is refused with "There is a way.", kept through Undo, and focus moves to the board', () => {
  const p = byId('billiard-04');
  const b = play(p, fresh(p), [{ type: 'launch', room: [1, 1] }, { type: 'cant' }, { type: 'tap', at: [1, 3] }, { type: 'tap', at: [3, 1] }]);
  const way = billiard.move(p, b, { type: 'done' });
  assert.equal(way.way, true);
  assert.equal(way.cert, null, 'the map closes; Undo reopens it');
  assert.match(billiard.render(p, { board: way }), /There is a way\./);
  assert.match(billiard.render(p, { board: way }), /data-move="[^"]*cant[^"]*"[^>]*disabled/);
  // Undo reopens the map with the taps, keeping the lock: taps and That's all
  // are off, and Can't only closes the map.
  const back = billiard.carry(p, way, b);
  assert.equal(back.way, true);
  assert.deepEqual(back.cert, [[1, 3], [3, 1]], 'Undo visibly changes the board');
  assert.equal(billiard.move(p, back, { type: 'tap', at: [2, 2] }), null);
  assert.equal(billiard.move(p, back, { type: 'done' }), null);
  const closed = billiard.move(p, back, { type: 'cant' });
  assert.equal(closed.cert, null);
  assert.equal(billiard.move(p, closed, { type: 'cant' }), null, 'the lock stays');
  assert.match(billiard.render(p, { board: back }), /aria-disabled="true"/);
  assert.match(billiard.render(p, { board: back }), /There is a way\./);
  // A new launch is a new board.
  assert.equal(billiard.move(p, way, { type: 'launch', room: [2, 1] }).way, false);
  // Half claims too.
  const h = byId('billiard-02');
  const half = play(h, fresh(h), [{ type: 'launch', room: [1, 1] }, { type: 'cant' }, { type: 'tap', at: [1, 2] }]);
  assert.equal(billiard.move(h, half, { type: 'tap', at: [1, 1] }).told.code, 'path');
  assert.equal(judgeHalf(h.parameters, [[1, 2], [1, 1]]).code, 'path');
});

test('send it home: a copy of the start and a corner on the way there, with the halfway argument drawn', () => {
  const p = byId('billiard-16'), q = p.parameters;
  let b = play(p, fresh(p), [{ type: 'launch', room: [3, 2] }, { type: 'cant' }]);
  const wrongGoal = billiard.move(p, play(p, b, [{ type: 'tap', at: [1, 1] }]), { type: 'tap', at: [2, 2] });
  assert.equal(wrongGoal.told.code, 'goal');
  assert.match(billiard.render(p, { board: wrongGoal }), /That corner folds to the top right\./);
  const offWay = billiard.move(p, play(p, b, [{ type: 'tap', at: [4, 2] }]), { type: 'tap', at: [1, 1] });
  assert.equal(offWay.told.code, 'path');
  // Re-tapping the first corner lets it go.
  assert.deepEqual(play(p, b, [{ type: 'tap', at: [4, 2] }, { type: 'tap', at: [4, 2] }]).cert, []);
  const done = play(p, b, [{ type: 'tap', at: [4, 2] }, { type: 'tap', at: [2, 1] }]);
  assert.equal(billiard.solved(p, done), true);
  const html = billiard.render(p, { board: done });
  assert.equal((html.match(/class="cr-half"/g) || []).length, cornerMap(...q.map).filter(c => c.corner === HOME).length);
  // Any crossing before the copy works, not only halfway.
  assert.equal(billiard.solved(p, play(p, b, [{ type: 'tap', at: [6, 6] }, { type: 'tap', at: [2, 2] }])), true);
});

test('find every: Keep without a verdict, That’s all judges the shelf, refusals stay through Undo, no counter', () => {
  const p = byId('billiard-15'), q = p.parameters, answers = everyAnswer(q);
  assert.equal(answers.length, 6);
  let b = play(p, fresh(p), [{ type: 'launch', room: [2, 1] }, { type: 'keep', room: [2, 1] }, { type: 'keep', room: [4, 2] }]);
  assert.equal(b.told, null);
  const html = billiard.render(p, { board: b });
  assert.doesNotMatch(html, /\b\d+ (of|\/) \d+\b|\bfound\b/i, 'no found-count');
  const told = billiard.move(p, b, { type: 'done' });
  assert.deepEqual(told.told, { code: 'another' });
  assert.equal(billiard.move(p, told, { type: 'done' }), null, 'That’s all stays off until the shelf changes');
  const back = billiard.carry(p, told, b);
  assert.deepEqual(back.refused, told.refused);
  assert.equal(billiard.move(p, back, { type: 'done' }), null);
  const off = billiard.move(p, play(p, b, [{ type: 'keep', room: [1, 1] }]), { type: 'done' });
  assert.deepEqual(off.told, { code: 'off', at: [1, 1] });
  // The refusal names the kind of fault, not the room: nothing on the shelf is
  // ringed, so That's all can't be used to empty a shelf of every room.
  const offHtml = billiard.render(p, { board: off });
  assert.match(offHtml, /A kept room doesn’t bounce once\./);
  assert.doesNotMatch(offHtml, /refused/, 'no pin is ringed');
  assert.equal(billiard.move(p, off, { type: 'done' }), null, 'the refused shelf stays refused until it changes');
  assert.match(offHtml, /<button[^>]*&quot;done&quot;[^>]*disabled>That’s all<\/button>/, 'That’s all is off on the refused shelf');
  // The pins are drawn over the corner handle: keeping the current room, and
  // its Undo, visibly change the board, not only the Keep button.
  const launched = play(p, fresh(p), [{ type: 'launch', room: [2, 1] }]);
  const plain = html => html.replace(/aria-pressed="(true|false)"/g, '');
  const unkept = billiard.render(p, { board: launched }), kept = billiard.render(p, { board: billiard.move(p, launched, { type: 'keep', room: [2, 1] }) });
  assert.notEqual(plain(kept), plain(unkept));
  assert.ok(kept.indexOf('class="cr-pins"') > kept.indexOf('class="cr-handle"'), 'pins on top of the handle');
  const all = play(p, fresh(p), [...answers.map(room => ({ type: 'keep', room })), { type: 'done' }]);
  assert.equal(billiard.solved(p, all), true);
  assert.match(billiard.render(p, { board: all }), /class="cr-twice"/);
  assert.equal(judgeShelf(q, answers).code, 'accept');
});

test('the path draws on Launch, never while the room changes; drags and aims are not moves', () => {
  const p = byId('billiard-04');
  billiard.reset(p);
  let b = fresh(p);
  assert.doesNotMatch(billiard.render(p, { board: b }), /cr-path/);
  b = billiard.move(p, b, { type: 'launch', room: [1, 1] });
  assert.match(billiard.render(p, { board: b }), /cr-path/);
  billiard.ui(p, { room: [3, 1] });
  const changed = billiard.render(p, { board: b });
  assert.doesNotMatch(changed, /cr-path/, 'a changed room hides the old path');
  assert.match(changed, /data-move="\{&quot;type&quot;:&quot;launch&quot;,&quot;room&quot;:\[3,1\]\}"/);
  billiard.reset(p);
  // Aim: tapping a crossing only chooses; Launch is the move.
  const a = byId('billiard-05');
  billiard.reset(a);
  billiard.render(a, { board: fresh(a) });
  billiard.ui(a, { aim: [3, 2] });
  const aimed = billiard.render(a, { board: fresh(a) });
  assert.doesNotMatch(aimed, /cr-folded/);
  assert.match(aimed, /&quot;aim&quot;:\[3,2\]/);
  const launched = billiard.move(a, fresh(a), { type: 'launch', aim: [3, 2] });
  const shown = billiard.render(a, { board: launched });
  assert.match(shown, /class="cr-tile"/);
  assert.match(shown, /class="cr-folded"/);
  billiard.reset(a);
});

test('cross: the line meets two crossings; a tap past the first is final, a tap off the line can be retried', () => {
  const p = byId('billiard-13');
  assert.match(billiard.render(p, { board: billiard.move(p, fresh(p), { type: 'tap', at: [1, 0] }) }), /The line doesn’t go there\./);
  // 2 by 3 rooms on a 6 by 4 sheet: the diagonal passes the crossings 3 across,
  // 2 up and 6 across, 4 up; the ball stops at the first.
  assert.deepEqual(p.parameters.sheet, [6, 4]);
  assert.equal(billiard.move(p, fresh(p), { type: 'tap', at: [3, 2] }).done, true);
  const later = billiard.move(p, fresh(p), { type: 'tap', at: [6, 4] });
  assert.equal(later.done, false);
  const over = billiard.render(p, { board: later, hintLevel: 0 });
  assert.match(over, /It stops before that\./);
  // A final choice: the other crossing is no longer open, Again starts over,
  // focus goes to Again, and the line is drawn to where the ball really stops.
  assert.equal(billiard.move(p, later, { type: 'tap', at: [3, 2] }), null);
  assert.match(over, /data-move="\{&quot;type&quot;:&quot;again&quot;\}"[^>]*data-focus="cr-again"|data-focus="cr-again"[^>]*data-move/);
  assert.match(over, /class="cr-unfold"/);
  assert.match(over, /class="cr-folded"/);
  assert.match(over, /data-at="3,2"[^>]*aria-disabled="true"/);
  assert.deepEqual(billiard.hint(p, later).action, { type: 'again' });
  assert.deepEqual(billiard.move(p, later, { type: 'again' }), fresh(p));
  assert.equal(billiard.move(p, fresh(p), { type: 'again' }), null, 'Again only after a final pick');
  // Off the line: retried freely, no Again.
  const offLine = billiard.move(p, fresh(p), { type: 'tap', at: [1, 0] });
  assert.doesNotMatch(billiard.render(p, { board: offLine }), /cr-again/);
  assert.equal(billiard.move(p, offLine, { type: 'tap', at: [3, 2] }).done, true);
  assert.equal(billiard.noUndo(p), true, 'no Undo past a final pick');
  assert.equal(billiard.noUndo(byId('billiard-04')), false);
  const tall = byId('billiard-14');
  assert.deepEqual(tall.parameters.sheet, [6, 8]);
  assert.equal(billiard.move(tall, fresh(tall), { type: 'tap', at: [3, 4] }).done, true);
  assert.equal(billiard.move(tall, fresh(tall), { type: 'tap', at: [6, 8] }).done, false);
  assert.equal(billiard.move(tall, fresh(tall), { type: 'tap', at: [1, 1] }).done, false);
  // Both crossings are drawn as tappable points on the sheet.
  for (const [q, at] of [[p, ['3,2', '6,4']], [tall, ['3,4', '6,8']]]) {
    const html = billiard.render(q, { board: fresh(q), hintLevel: 0 });
    for (const c of at) assert.match(html, new RegExp(`class="cr-crossing[^"]*" data-at="${c}"`));
  }
});

test('copy: How to play opens with the mathematics; the visible objective adds only what the board lacks', () => {
  for (const p of puzzles) {
    const how = playInstructions(p);
    assert.match(how, /^The ball rolls straight from the bottom-left corner/);
    assert.ok(how.length < 400, `${p.id}: short (${how.length})`);
    const goal = visiblePuzzleObjective(p);
    assert.ok(goal.split('. ').length === 1 && goal.length < 70, `${p.id}: one short line`);
    assert.doesNotMatch(goal, /\b(top|bottom|left|right)\b/, `${p.id}: the ring shows the corner`);
    assert.match(puzzleObjective(p), /\.$/);
    for (const answer of p.solution.answers) assert.ok(!p.title.includes(answer) && !goal.includes(answer));
    assert.doesNotMatch(p.title, /impossible|can.t|no way|several|two ways|answers|correct/i, `${p.id}: the title gives nothing away`);
  }
});

test('saves: revision 1 boards migrate to a fresh reworked puzzle, keeping what was earned; forgeries are refused', () => {
  const store = () => ({ ...emptyStore(), activeProfileId: 'one', profiles: [{ id: 'one', name: 'Explorer', avatar: 0, band: '23', sound: false, journey: freshJourney(), attempts: {} }] });
  const legacy = {
    'billiard-01': { prediction: { corner: 'top-left', bounces: 1 } }, 'billiard-02': { prediction: null }, 'billiard-04': { prediction: { width: 2 } },
    'billiard-05': { prediction: { rise: 2, run: 3 } }, 'billiard-11': { prediction: { rise: 1, run: 12 } }
  };
  const s = store();
  for (const [id, board] of Object.entries(legacy)) s.profiles[0].attempts[id] = { revision: 1, board, history: [{ board: { prediction: null }, moves: 0 }], moves: 1, hintLevel: 2, helpUsed: true, completed: id !== 'billiard-02', lastPlayed: 1 };
  const current = byId('billiard-15');
  s.profiles[0].attempts[current.id] = move(current, freshAttempt(current), { type: 'keep', room: [2, 1] });
  const migrated = parseBackup(JSON.stringify(s), pack);
  for (const id of Object.keys(legacy)) {
    const a = migrated.profiles[0].attempts[id], p = byId(id);
    assert.equal(a.revision, 2);
    assert.deepEqual(a.board, billiard.fresh(p));
    assert.deepEqual(a.history, []);
    assert.equal(a.moves, 0);
    assert.equal(a.completed, id !== 'billiard-02');
    assert.equal(a.helpUsed, true);
    assert.equal(a.hintLevel, 0, 'the old hint level would show the new answer at once');
  }
  assert.deepEqual(migrated.profiles[0].attempts[current.id].board.kept, [[2, 1]]);
  assert.deepEqual(validateStore(migrated, pack), migrated, 'a migrated store is a current store');
  for (const corrupt of [
    a => { a.board = { prediction: { corner: 'middle', bounces: 1 } }; }, a => { a.board = { prediction: { width: 0 } }; }, a => { a.revision = 3; },
    a => { a.board = { room: [2, 4], cert: null, told: null, way: false, done: true }; a.revision = 1; },
    a => { a.history = [{ board: { prediction: 'x' }, moves: 0 }]; }
  ]) {
    const bad = store();
    bad.profiles[0].attempts['billiard-01'] = { revision: 1, board: { prediction: null }, history: [], moves: 0, hintLevel: 0, helpUsed: false, completed: false, lastPlayed: 1 };
    corrupt(bad.profiles[0].attempts['billiard-01']);
    assert.throws(() => parseBackup(JSON.stringify(bad), pack));
  }
  // A forged done, or a forged launch count, on a current board is refused.
  for (const board of [{ room: null, cert: null, told: null, way: false, done: true, launches: 1 }, { room: [1, 1], cert: null, told: null, way: false, done: true, launches: 1 }, { room: [2, 4], cert: null, told: null, way: false, done: true, launches: 0 }, { room: [2, 4], cert: null, told: null, way: false, done: true }]) {
    const bad = store();
    bad.profiles[0].attempts['billiard-01'] = { revision: 2, board, history: [], moves: 1, hintLevel: 0, helpUsed: false, completed: true, lastPlayed: 1 };
    assert.throws(() => parseBackup(JSON.stringify(bad), pack));
  }
  assert.equal(legacyBilliardBoard({ prediction: null, extra: 1 }), false);
  // A launch tally that falls along the Undo history is refused; one that only
  // grows (Undo keeps the higher tally on the board) loads.
  const p4 = byId('billiard-01');
  let a4 = freshAttempt(p4);
  for (const room of [[1, 1], [2, 2], [3, 3]]) a4 = move(p4, a4, { type: 'launch', room });
  const back4 = undo(a4), undone4 = { ...back4, board: billiard.carry(p4, a4.board, back4.board) };
  assert.equal(launchesHold(undone4), true);
  for (const [label, attempt] of [['undone', undone4], ['played', a4]]) {
    const ok = store();
    ok.profiles[0].attempts[p4.id] = attempt;
    assert.doesNotThrow(() => parseBackup(JSON.stringify(ok), pack), label);
  }
  for (const forge of [a => { a.board.launches = 1; }, a => { a.history[1].board.launches = 9; }, a => { a.history[0].board.launches = 2; a.history[1].board.launches = 1; }]) {
    const bad = store(), forged = structuredClone(a4);
    forge(forged);
    bad.profiles[0].attempts[p4.id] = forged;
    assert.throws(() => parseBackup(JSON.stringify(bad), pack), /Undo history/);
  }
});

test('the road’s Mirror room keeps its picks and counts launches; dragging is free', () => {
  const e = STOPS.flatMap(s => s.encounters).find(e => e.id === 'lighthouse-mirrors');
  assert.deepEqual(e.selection, { k1: 'billiard-02', '23': 'billiard-04', '45': 'billiard-05' });
  const copies = withCampaignPuzzles(pack).filter(p => p.campaignVersion === 4 && p.campaignEncounter === 'lighthouse-mirrors');
  assert.equal(copies.length, 3);
  for (const p of copies) {
    assert.equal(p.revision, 2);
    assert.equal(rivalScore(e, p), 1);
    const q = p.parameters, answer = p.solution.answers[0].split(/[×,]/).map(Number);
    let a = freshAttempt(p);
    if (q.mode === 'shape') billiard.ui(p, { room: [2, 2] });
    a = move(p, a, q.mode === 'aim' ? { type: 'launch', aim: answer } : { type: 'launch', room: answer });
    assert.ok(isSolved(p, a.board));
    assert.equal(scoreOf(p, a), 1, 'one launch');
    assert.equal(starsFor(e, p, a), 3);
    const miss = q.mode === 'aim' ? { type: 'launch', aim: [1, 1] } : { type: 'launch', room: [1, 1] }, hit = q.mode === 'aim' ? { type: 'launch', aim: answer } : { type: 'launch', room: answer };
    const twice = move(p, move(p, freshAttempt(p), miss), hit);
    assert.equal(scoreOf(p, twice), 2);
    // Launch, read where it stopped, Undo, launch again: still two launches.
    const tried = move(p, freshAttempt(p), miss), back = undo(tried);
    const undone = { ...back, board: billiard.carry(p, tried.board, back.board) };
    assert.equal(undone.moves, 0);
    assert.equal(scoreOf(p, undone), 1, 'Undo does not take back a launch');
    const again = move(p, undone, hit);
    assert.ok(isSolved(p, again.board));
    assert.equal(scoreOf(p, again), 2);
    assert.equal(starsFor(e, p, again), 2, 'one launch more than Plume');
    // Opening the corner map and tapping are not launches.
    if (q.mode === 'shape') {
      let looked = move(p, freshAttempt(p), miss);
      for (const action of [{ type: 'cant' }, { type: 'tap', at: [1, 1] }, { type: 'tap', at: [1, 1] }, { type: 'cant' }]) looked = move(p, looked, action);
      assert.equal(scoreOf(p, move(p, looked, hit)), 2);
    }
    billiard.reset(p);
  }
  // Only billiard reads a tally; another mechanic still counts its moves.
  const swap = pack.find(p => p.mechanic === 'swap');
  const swapped = move(swap, freshAttempt(swap), swap.solution[0]);
  assert.equal(scoreOf(swap, swapped), swapped.moves);
  assert.equal(motionMechanics.billiard, billiard);
});

test('moves, hints and drawing stay fast on the busiest boards (CPU time)', () => {
  for (const id of ['billiard-18', 'billiard-07', 'billiard-11', 'billiard-15', 'billiard-16']) {
    const p = byId(id);
    let b = fresh(p);
    for (const action of p.solution.moves) {
      const t = process.cpuUsage();
      const h = billiard.hint(p, b), next = billiard.move(p, b, action);
      billiard.render(p, { board: next, hintLevel: 2 });
      const u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 60, `${id}: ${JSON.stringify(action)} takes under 60 ms of CPU`);
      assert.ok(h);
      b = next;
    }
  }
});

test('undo through the engine carries refusals; a refused claim is not lost', () => {
  const p = byId('billiard-18');
  let a = freshAttempt(p);
  for (const action of [{ type: 'launch', room: [1, 1] }, { type: 'cant' }, { type: 'tap', at: [1, 9] }, { type: 'done' }]) a = move(p, a, action);
  assert.equal(a.board.told.code, 'wrong');
  const back = undo(a), carried = { ...back, board: billiard.carry(p, a.board, back.board) };
  assert.deepEqual(carried.board.cert, [[1, 9]]);
  assert.equal(carried.board.told.code, 'wrong');
  assert.equal(move(p, carried, { type: 'done' }), null);
  assert.ok(move(p, carried, { type: 'tap', at: [3, 7] }));
  assert.ok(roomsFor(p.parameters).length === 0);
});

import { crossingHit } from '../dist/couriers.js';
test('crossing tap circles stop short of halfway to the next crossing, from 8 to 26 units', () => {
  for (const gap of [10, 16.8, 20, 40, 54.6, 80, 200]) {
    const r = crossingHit(gap);
    assert.ok(r >= 8 && r <= 26, `gap ${gap}`);
    if (gap >= 16.8) assert.ok(2 * r < gap, `gap ${gap}: circles apart`);
  }
});
