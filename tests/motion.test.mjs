import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { motionMechanics, simulateBilliard, firstClockHit } from '../dist/motion.js';
import { clockJumpArc, clockJumpFromPlace, clockPlaceAtPoint, clockStepJump } from '../dist/clock-geometry.js';
import { clockBellDelay, clockTrailStep, createClockTimeline } from '../dist/clock-playback.js';
import { playInstructions } from '../dist/expansion.js';

const catalog = JSON.parse(readFileSync(new URL('../docs/puzzle-expansion/motion.json', import.meta.url)));
const puzzles = catalog.families.flatMap(family => family.instances.map(instance => ({ ...instance, mechanic: family.id })));
const puzzle = id => puzzles.find(p => p.id === id);
const edgeIndex = (p, edge) => p.parameters.edges.findIndex(candidate => candidate.every(vertex => edge.includes(vertex)));
const initial = p => motionMechanics[p.mechanic].fresh(p);
function applyWitness(p) {
  const handler = motionMechanics[p.mechanic], solution = p.solution;
  if (p.mechanic === 'toggle') return solution.presses.reduce((board, edge) => handler.move(p, board, { edge: edgeIndex(p, edge) }), initial(p));
  return handler.move(p, initial(p), solution);
}

for (const p of puzzles) test(`${p.id}: witness works, survives JSON, and hints solve from a fresh board`, () => {
  const handler = motionMechanics[p.mechanic], fresh = initial(p);
  assert.equal(handler.valid(p, fresh), true);
  assert.equal(handler.solved(p, fresh), false);
  const solved = applyWitness(p);
  assert.equal(handler.valid(p, solved), true);
  assert.equal(handler.solved(p, solved), true);
  assert.deepEqual(handler.hint(p, solved), { type: 'done' });
  assert.equal(handler.valid(p, JSON.parse(JSON.stringify(solved))), true);
  let board = fresh;
  for (let steps = 0; !handler.solved(p, board) && steps < 12; steps++) {
    const hint = handler.hint(p, board);
    assert.equal(hint.type, 'move');
    assert.ok(hint.text.length > 10);
    board = handler.move(p, board, hint.action);
    assert.ok(board);
  }
  assert.equal(handler.solved(p, board), true);
  const withoutWitness = { ...p, solution: {} };
  assert.equal(handler.solved(withoutWitness, solved), true, 'completion computes the mathematical rule independently of witnesses');
  assert.doesNotThrow(() => handler.render(p, { board: fresh }));
  assert.doesNotThrow(() => handler.render(p, { board: solved }));
});

test('all motion families reject malformed saves and moves without throwing or mutation', () => {
  const malformed = [null, undefined, false, 1, '', [], {}, { prediction: false }, { prediction: NaN }, { prediction: Infinity }, { prediction: -1 }, { prediction: [] }, { on: [], presses: null }];
  for (const p of puzzles) {
    const handler = motionMechanics[p.mechanic];
    for (const board of malformed) {
      assert.equal(handler.valid(p, board), false, `${p.id}: ${JSON.stringify(board)}`);
      assert.equal(handler.solved(p, board), false);
      assert.equal(handler.move(p, board, {}), null);
    }
    const board = initial(p), snapshot = JSON.stringify(board);
    for (const action of [null, [], {}, true, { edge: -1 }, { edge: 1.3 }, { activations: '1e2' }, { activations: '' }, { activations: false }, { jump: 'NaN' }, { bounces: null }, { rise: 0, run: 0 }]) {
      assert.equal(handler.move(p, board, action), null, p.id);
    }
    const hint = handler.hint(p, board);
    handler.move(p, board, hint.action);
    assert.equal(JSON.stringify(board), snapshot, 'move and hint are pure');
  }
});

test('lantern moves flip only endpoints, cancel in pairs, and accept alternate cycle solutions', () => {
  const p = puzzle('toggle-01'), handler = motionMechanics.toggle;
  let board = handler.move(p, initial(p), { edge: '0' });
  assert.deepEqual(board.on, ['1', '2']);
  board = handler.move(p, board, { edge: 0 });
  assert.deepEqual(board.on, []);
  assert.deepEqual(board.presses, [0, 0]);
  board = [1, 2, 3].reduce((state, edge) => handler.move(p, state, { edge }), initial(p));
  assert.equal(handler.solved(p, board), true, 'the complementary three-edge solution is accepted');
  const opposite = puzzle('toggle-02');
  board = [3, 2].reduce((state, edge) => handler.move(opposite, state, { edge }), initial(opposite));
  assert.equal(handler.solved(opposite, board), true);
  assert.equal(handler.move(p, board, { edge: 999 }), null);
});

test('lantern budgets are derived from replay and cannot be bypassed by importing a target', () => {
  for (const p of puzzles.filter(p => p.mechanic === 'toggle' && p.parameters.press_budget != null)) {
    const handler = motionMechanics.toggle, solved = applyWitness(p);
    assert.equal(handler.move(p, solved, { edge: 0 }), null);
    assert.equal(handler.valid(p, { on: [...p.parameters.target_on], presses: [] }), false);
    assert.equal(handler.valid(p, { ...solved, presses: [...solved.presses, 0, 0] }), false);
    assert.equal(handler.valid(p, { ...solved, on: [...solved.on, solved.on[0]] }), false);
    assert.equal(handler.valid(p, { ...solved, presses: ['0'] }), false);
  }
  const p = puzzle('toggle-06'), handler = motionMechanics.toggle;
  const tempting = handler.move(p, initial(p), { edge: edgeIndex(p, ['B', 'C']) });
  assert.equal(handler.hint(p, tempting).type, 'deadend', 'greedy middle pairing cannot meet the remaining budget');
});

test('lantern hints solve or explain every reachable budgeted state', () => {
  for (const p of puzzles.filter(p => p.mechanic === 'toggle' && p.parameters.press_budget != null)) {
    const handler = motionMechanics.toggle;
    let states = [initial(p)];
    for (let depth = 0; depth <= p.parameters.press_budget; depth++) {
      const nextStates = new Map();
      for (const board of states) {
        const hint = handler.hint(p, board);
        if (hint.type === 'move') {
          let state = board;
          for (let i = 0; i < hint.remaining; i++) state = handler.move(p, state, handler.hint(p, state).action);
          assert.equal(handler.solved(p, state), true, p.id);
        } else if (hint.type === 'done') assert.equal(handler.solved(p, board), true);
        else assert.match(hint.text, /Undo|start again/);
        for (let edge = 0; edge < p.parameters.edges.length; edge++) {
          const next = handler.move(p, board, { edge });
          if (next) nextStates.set(next.on.join(','), next);
        }
      }
      states = [...nextStates.values()];
    }
  }
});

test('clock counts require the first positive simultaneous hit, including proper orbits and wraps', () => {
  const handler = motionMechanics.clock;
  for (const p of puzzles.filter(p => p.mechanic === 'clock' && p.parameters.mode !== 'choose_jump')) {
    const first = firstClockHit(p.parameters);
    assert.equal(first, p.solution.activations);
    for (let count = 1; count <= p.solution.joint_period * 2; count++) {
      const board = handler.move(p, initial(p), { activations: String(count) });
      assert.equal(handler.solved(p, board), count === first);
      if (count !== first) {
        const hint = handler.hint(p, board);
        assert.equal(handler.solved(p, handler.move(p, board, hint.action)), true);
      }
    }
    assert.equal(handler.move(p, initial(p), { activations: 0 }), null);
    assert.equal(handler.valid(p, { prediction: '3' }), false);
  }
  assert.equal(firstClockHit({ clocks: [{ positions: 6, jump: 2, start: 0, target: 1 }] }), null);
  assert.equal(firstClockHit({ clocks: [{ positions: 6, jump: 2, start: 0, target: 0 }] }), 3, 'zero is not the first positive return');
});

test('clock gear mode accepts every valid gear and rejects early returns', () => {
  const p = puzzle('clock-04'), handler = motionMechanics.clock, winners = [];
  for (let jump = 1; jump <= 11; jump++) {
    const board = handler.move(p, initial(p), { jump: String(jump) });
    if (handler.solved(p, board)) winners.push(jump);
  }
  assert.deepEqual(winners, [3, 9]);
  assert.equal(handler.solved(p, { prediction: 6 }), false, '+6 reaches zero at bell four but first returns at bell two');
  assert.equal(handler.move(p, initial(p), { jump: 12 }), null);
});

test('choose-jump ring maps taps and drags to allowed clockwise jumps', () => {
  for (const id of ['clock-04', 'clock-07']) {
    const p = puzzle(id), {positions,start,jump_min,jump_max} = p.parameters;
    const place = id === 'clock-04' ? 9 : 6;
    assert.equal(clockJumpFromPlace(positions,start,place,jump_min,jump_max),place);
    assert.equal(clockJumpFromPlace(positions,start,start,jump_min,jump_max),null);
    const angle=place*2*Math.PI/positions;
    for (const radius of [77,92,110,128]) {
      assert.equal(clockPlaceAtPoint(160+radius*Math.sin(angle),160-radius*Math.cos(angle),positions),place);
    }
    assert.equal(clockPlaceAtPoint(160,160,positions),null);
  }
  assert.equal(clockJumpFromPlace(12,9,2,1,11),5,'nonzero start wraps clockwise');
  assert.equal(clockJumpFromPlace(12,9,8,2,6),null,'out-of-range landing is ignored');
  assert.equal(clockJumpFromPlace(12,9,9,1,11),null,'start is never selectable');
});

test('choose-jump keyboard clamps and draft changes do not commit a prediction', () => {
  assert.equal(clockStepJump(1,'ArrowLeft',1,9),1);
  assert.equal(clockStepJump(9,'ArrowUp',1,9),9);
  assert.equal(clockStepJump(5,'ArrowDown',1,9),4);
  assert.equal(clockStepJump(5,'ArrowRight',1,9),6);
  const p=puzzle('clock-07'),board=initial(p),timeline=createClockTimeline(()=>{});
  timeline.enter('clock-07',p,null);
  timeline.edit('6',false);
  assert.equal(board.prediction,null);
  assert.equal(timeline.presentation.draft,'6');
  const draft=motionMechanics.clock.render(p,{board},{clockPresentation:timeline.presentation});
  assert.match(draft,/role="slider" tabindex="0"/);
  assert.match(draft,/aria-valuetext="Jump 6 clockwise from 0 to 6"/);
  assert.match(draft,/name="jump" value="6"/);
  assert.match(draft,/Jump 6/);
  assert.doesNotMatch(draft,/clock-trail|Fixed jump|<select/);
  const saved=motionMechanics.clock.move(p,board,{jump:6});
  assert.deepEqual(saved,{prediction:6});
  timeline.restore(p,saved.prediction);
  assert.match(motionMechanics.clock.render(p,{board:saved},{clockPresentation:timeline.presentation}),/aria-valuetext="Jump 6 clockwise from 0 to 6"/);
  assert.match(playInstructions(p),/Tap a place or drag the red arrow/);
  assert.doesNotMatch(playInstructions(p),/click/i);
  assert.match(playInstructions(puzzle('clock-08')),/red arrows trace each jump/);
});

test('clock reference arrows span the clockwise jump, including the long arc', () => {
  const wrap = clockJumpArc(12, 9, 5);
  assert.equal(wrap.from, 9);
  assert.equal(wrap.to, 2);
  assert.ok(Math.abs(wrap.span - 5 * Math.PI / 6) < 1e-12);
  assert.match(wrap.path, / A 77 77 0 0 1 /);
  const long = clockJumpArc(12, 1, 8);
  assert.equal(long.to, 9);
  assert.ok(Math.abs(long.span - 4 * Math.PI / 3) < 1e-12);
  assert.match(long.path, / A 77 77 0 1 1 /);
});

test('every fresh clock has one independent reference arrow and no predicted path', () => {
  const handler = motionMechanics.clock;
  for (const p of puzzles.filter(p => p.mechanic === 'clock')) {
    const html = handler.render(p, { board: initial(p) });
    const clocks = p.parameters.mode === 'choose_jump'
      ? [{ positions: p.parameters.positions, start: p.parameters.start, target: p.parameters.start, jump: p.parameters.jump_min }]
      : p.parameters.clocks;
    assert.equal((html.match(/class="clock-jump-arrow"/g) ?? []).length, clocks.length, p.id);
    assert.equal((html.match(/class="clock-jump-head"/g) ?? []).length, clocks.length, p.id);
    assert.equal((html.match(/<svg viewBox="0 0 320 320"/g) ?? []).length, clocks.length, p.id);
    assert.doesNotMatch(html, /class="clock-moving"|clock-trail|clock-landing/, p.id);
    assert.equal((html.match(/class="clock-center"[^>]*>0</g) ?? []).length, clocks.length, p.id);
    for (const clock of clocks) {
      const landing = (clock.start + clock.jump) % clock.positions;
      const arc = clockJumpArc(clock.positions, clock.start, clock.jump);
      assert.ok(html.includes(`<path class="clock-jump-arrow" d="${arc.path}"/>`), p.id);
      assert.ok(html.includes(`<polygon class="clock-jump-head" points="${arc.head}"/>`), p.id);
      assert.ok(html.includes(`Jump ${clock.jump}`), p.id);
      assert.ok(html.includes(`${clock.positions} places, jump ${clock.jump} clockwise from ${clock.start} to ${landing}, star ${clock.target}. Marker starts at ${clock.start}.`), p.id);
    }
  }
  const clock08 = handler.render(puzzle('clock-08'), { board: initial(puzzle('clock-08')) });
  assert.match(clock08, /jump 5 clockwise from 9 to 2/);
  const clock12 = handler.render(puzzle('clock-12'), { board: initial(puzzle('clock-12')) });
  assert.match(clock12, /jump 8 clockwise from 1 to 9/);
});

test('clock presentation context can show a transient count without changing the saved prediction', () => {
  const p = puzzle('clock-08'), board = motionMechanics.clock.move(p, initial(p), { activations: 11 });
  const html = motionMechanics.clock.render(p, { board }, { clockPresentation: { count: 0, animate: false } });
  assert.match(html, /class="clock-center"[^>]*>0</);
  assert.match(html, /Marker starts at 9/);
  assert.doesNotMatch(html, /class="clock-moving"/);
  assert.deepEqual(board, { prediction: 11 });
});

test('clock trails advance by bell, split at geometric lap boundaries, and keep one head per landing', () => {
  const p = puzzle('clock-08'), board = motionMechanics.clock.move(p, initial(p), { activations: 11 });
  const start = motionMechanics.clock.render(p, { board }, { clockPresentation: { count: 0 } });
  assert.doesNotMatch(start, /class="clock-trail"/);
  assert.match(start, /Marker starts at 9/);
  const middle = motionMechanics.clock.render(p, { board }, { clockPresentation: { count: 4 } });
  assert.equal((middle.match(/class="clock-trail"/g) ?? []).length, 4);
  assert.equal((middle.match(/class="clock-trail-head"/g) ?? []).length, 4);
  assert.match(middle, /class="clock-center"[^>]*>4</);
  assert.match(middle, /Marker at 5/);
  assert.doesNotMatch(middle, /Marker at 4/);
  const done = motionMechanics.clock.render(p, { board });
  assert.equal((done.match(/class="clock-trail"/g) ?? []).length, 11);
  assert.match(done, /Marker at 4/);
  const crossing = clockTrailStep(12, 9, 5, 1, 11);
  assert.equal(crossing.from, 9);
  assert.equal(crossing.to, 2);
  assert.match(crossing.path, / L .* A /);
  assert.notEqual(clockTrailStep(12, 9, 5, 1, 11).path, clockTrailStep(12, 9, 5, 6, 11).path);
  const two = puzzle('clock-05'), twoBoard = motionMechanics.clock.move(two, initial(two), { activations: 20 });
  const twoHtml = motionMechanics.clock.render(two, { board: twoBoard }, { clockPresentation: { count: 3 } });
  assert.equal((twoHtml.match(/class="clock-trail"/g) ?? []).length, 6);
  assert.equal((twoHtml.match(/class="clock-center"[^>]*>3</g) ?? []).length, 2);
  const dense = puzzle('clock-12'), denseBoard = motionMechanics.clock.move(dense, initial(dense), { activations: 19 });
  const denseHtml = motionMechanics.clock.render(dense, { board: denseBoard });
  assert.equal((denseHtml.match(/class="clock-trail"/g) ?? []).length, 57);
});

test('one clock timeline restarts, cancels, restores and caps long runs', () => {
  const timers = new Map(), frames = [];
  let serial = 0;
  const timeline = createClockTimeline(() => frames.push(timeline.presentation.count), (fn, ms) => { timers.set(++serial, { fn, ms }); return serial; }, id => timers.delete(id));
  const p = puzzle('clock-08');
  timeline.enter('profile/clock-08', p, null);
  timeline.ring(p, 11);
  assert.deepEqual(frames, [0]);
  assert.equal([...timers.values()][0].ms, 400);
  const tick = () => { const [id, timer] = timers.entries().next().value; timers.delete(id); timer.fn(); };
  tick(); tick();
  assert.deepEqual(frames, [0, 1, 2]);
  timeline.ring(p, 11);
  assert.equal(frames.at(-1), 0, 'identical Ring restarts');
  const stale = [...timers.values()][0].fn;
  timeline.edit('12');
  assert.equal(timeline.presentation.count, 0);
  assert.equal(timers.size, 0);
  stale();
  assert.equal(timeline.presentation.count, 0, 'cancelled callback cannot advance another board');
  timeline.edit('11');
  assert.equal(timeline.presentation.count, 0, 'editing back does not revive the previous trail');
  timeline.restore(p, 11);
  assert.equal(timeline.presentation.count, 11);
  timeline.enter('profile/clock-08', p, 11);
  assert.equal(timeline.presentation.count, 11, 'ordinary render does not restart playback');
  timeline.ring(p, 11, true);
  assert.equal(timeline.presentation.count, 11, 'reduced motion draws the result at once');
  assert.equal(timers.size, 0);
  timeline.leave();
  assert.equal(timeline.key, null);
  assert.equal(timers.size, 0);
  assert.equal(clockBellDelay(30), 10000 / 30);
  timeline.enter('long', p, null);
  timeline.ring(p, 49);
  assert.equal(timeline.presentation.count, 49);
  assert.equal(timers.size, 0);
  const longBoard = motionMechanics.clock.move(p, initial(p), { activations: 49 });
  const html = motionMechanics.clock.render(p, { board: longBoard });
  assert.equal((html.match(/class="clock-trail"/g) ?? []).length, 48);
  assert.match(html, /class="clock-center"[^>]*>49</);
});

test('exact billiard paths match all authored rational witnesses', () => {
  for (const p of puzzles.filter(p => p.mechanic === 'billiard')) {
    const width = p.solution.width ?? p.parameters.width, height = p.parameters.height;
    const rise = p.solution.rise ?? p.parameters.rise, run = p.solution.run ?? p.parameters.run;
    const result = simulateBilliard(width, height, rise, run);
    assert.deepEqual(result.path, p.solution.path, p.id);
    assert.equal(result.corner, p.solution.corner);
    assert.equal(result.bounces, p.solution.bounces);
    assert.equal(result.path.length, result.bounces + 2, 'launch and terminal corner are not wall bounces');
  }
});

// Independent scaled-lattice unit-step reflection checks the unfolded event
// solver. Scaling walls by rise*run makes every wall collision an integer tick.
function stepBilliard(width, height, rise, run) {
  const scale = rise * run, w = width * scale, h = height * scale;
  let x = 0, y = 0, dx = run, dy = rise, bounces = 0;
  for (let tick = 1; tick < 200000; tick++) {
    x += dx; y += dy;
    const vertical = x === 0 || x === w, horizontal = y === 0 || y === h;
    if (vertical && horizontal) return { corner: `${y === h ? 'top' : 'bottom'}-${x === w ? 'right' : 'left'}`, bounces };
    if (vertical) { dx = -dx; bounces++; }
    if (horizontal) { dy = -dy; bounces++; }
  }
  assert.fail('lattice simulation did not reach a corner');
}

test('billiard arithmetic agrees with independent reflection for 576 room/direction combinations', () => {
  for (let width = 1; width <= 6; width++) for (let height = 1; height <= 6; height++) for (let rise = 1; rise <= 4; rise++) for (let run = 1; run <= 4; run++) {
    const exact = simulateBilliard(width, height, rise, run), stepped = stepBilliard(width, height, rise, run);
    assert.equal(exact.corner, stepped.corner);
    assert.equal(exact.bounces, stepped.bounces);
    assert.notEqual(exact.corner, 'bottom-left');
  }
});

test('billiard design validates all alternatives, whole intervals, and physical slope', () => {
  const handler = motionMechanics.billiard;
  for (const p of puzzles.filter(p => p.mechanic === 'billiard' && p.parameters.mode !== 'predict')) {
    const params = p.parameters, winners = [];
    if (params.mode === 'choose_width') {
      for (let width = params.width_min; width <= params.width_max; width++) {
        const board = handler.move(p, initial(p), { width: String(width) });
        assert.ok(board);
        if (handler.solved(p, board)) winners.push(width);
      }
      assert.deepEqual(winners, p.solution.all_valid_widths);
      assert.equal(handler.move(p, initial(p), { width: params.width_max + 1 }), null);
    } else {
      for (let rise = params.component_min; rise <= params.component_max; rise++) for (let run = params.component_min; run <= params.component_max; run++) {
        const board = handler.move(p, initial(p), { rise: String(rise), run: String(run) });
        assert.ok(board);
        if (handler.solved(p, board)) winners.push([rise, run]);
      }
      assert.deepEqual(winners, p.solution.all_valid_directions);
      assert.equal(handler.move(p, initial(p), { rise: params.component_max + 1, run: 1 }), null);
    }
  }
  const p = puzzle('billiard-06');
  assert.equal(handler.solved(p, handler.move(p, initial(p), { rise: 5, run: 1 })), false, 'square-normalized direction is wrong for this rectangle');
});

test('billiard predictions conceal the path until submission and recover after wrong choices', () => {
  const handler = motionMechanics.billiard;
  for (const p of puzzles.filter(p => p.mechanic === 'billiard')) {
    const fresh = initial(p), hidden = handler.render(p, { board: fresh });
    assert.doesNotMatch(hidden, /class="courier-path"|class="unfolded-rooms"/);
    assert.equal(handler.help(p, { board: fresh }), '');
    const wrong = p.parameters.mode === 'predict' ? { corner: 'bottom-left', bounces: 0 } : p.parameters.mode === 'choose_width' ? { width: 1 } : { rise: 1, run: 1 };
    const board = handler.move(p, fresh, wrong);
    assert.equal(handler.solved(p, board), false);
    const shown = handler.render(p, { board });
    assert.match(shown, /class="courier-path"/);
    assert.doesNotMatch(shown, /class="unfolded-rooms"/);
    assert.match(handler.help(p, { board }), /class="unfolded-rooms"/);
    const hint = handler.hint(p, board);
    assert.equal(handler.solved(p, handler.move(p, board, hint.action)), true);
  }
  const p = puzzle('billiard-01');
  assert.equal(handler.move(p, initial(p), { corner: 'top-left', bounces: -1 }), null);
  assert.equal(handler.move(p, initial(p), { corner: '<script>', bounces: 1 }), null);
  assert.equal(handler.move(p, initial(p), { corner: 'top-left', bounces: '1.5' }), null);
});
