// Meeting roads: distances and meeting dots, walking and stepping back,
// meetings that work and ones that are too long, finding every meeting dot,
// closing a road, the playground, taps, arrow keys, hints, Undo, saves and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {meetingMechanics, meetingDots, distances, failing, shortestRoute, dotAction, arrowAction, stepWords, closures, connected, isWalk} from '../dist/families/meeting/meeting.js';
import {loadPack} from '../scripts/packs.mjs';

const meeting = JSON.parse(await readFile(new URL('../dist/families/meeting/meeting.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => meeting.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const walk = (x, dots) => dots.split(' ').map(to => ({type: 'step', walker: x, to}));
// The chosen walker is view state; each view starts from a fresh one, as opening a puzzle does.
const view = (p, a, keep = false) => { if (!keep) meetingMechanics.meeting.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };

test('meeting dots: grids, the tree, the cube, two crossroads, a triangle, a ring', () => {
  const answers = id => meetingDots(byId(id).parameters, byId(id).parameters.homes);
  assert.deepEqual(answers('meeting-02'), ['11'], 'middle column, middle row');
  assert.deepEqual(answers('meeting-05'), ['43'], 'on the edge');
  assert.deepEqual(answers('meeting-03'), ['v'], 'the tripod’s centre');
  assert.deepEqual(answers('meeting-04'), ['b'], 'a home');
  assert.deepEqual(answers('meeting-06'), ['100']);
  assert.deepEqual(answers('meeting-07'), ['001'], 'the majority, not next to 111');
  assert.deepEqual(answers('meeting-09'), ['x', 'y']);
  assert.deepEqual(answers('meeting-10'), []);
  assert.deepEqual(answers('meeting-11'), []);
  const q = byId('meeting-12').parameters;
  assert.deepEqual(meetingDots(q, q.homes), ['01']);
  assert.deepEqual(meetingDots(q, q.homes, [q.roads.findIndex(r => r.join() === '01,11')]), [], 'closing one road leaves none');
  assert.equal(distances(q)['00']['22'], 4);
  assert.deepEqual(shortestRoute(q, '00', '22'), ['00', '10', '20', '21', '22']);
});

test('walking: steps along roads, a tap on the dot just left steps back, no walk turns straight back', () => {
  const p = byId('meeting-02'), q = p.parameters;
  let a = play(p, freshAttempt(p), ...walk('A', '10 20'));
  assert.deepEqual(a.board.walks.A, ['00', '10', '20']);
  assert.equal(move(p, a, {type: 'step', walker: 'A', to: '10'}), null, 'straight back is a step back, not a step');
  a = play(p, a, {type: 'back', walker: 'A', to: '10'});
  assert.deepEqual(a.board.walks.A, ['00', '10']);
  assert.equal(move(p, a, {type: 'step', walker: 'A', to: '30'}), null, 'no road from 10 to 30');
  assert.equal(move(p, a, {type: 'step', walker: 'B', to: '30'}), null, 'B is not next to 30');
  assert.deepEqual(dotAction(q, a.board, 'A', 'walk', '00'), {move: {type: 'back', walker: 'A', to: '00'}});
  assert.deepEqual(dotAction(q, a.board, 'A', 'walk', '11'), {move: {type: 'step', walker: 'A', to: '11'}});
  assert.deepEqual(dotAction(q, a.board, 'A', 'walk', '41'), {choose: 'B'}, 'a tap on another walker chooses it');
  assert.equal(dotAction(q, a.board, 'A', 'walk', '10'), null, 'a press on the chosen walker’s own dot keeps it');
  assert.equal(dotAction(q, a.board, 'A', 'walk', '33'), null);
  assert.ok(isWalk(q, '00', ['00', '10', '11', '01', '00']), 'a walk may go round a square');
  assert.equal(isWalk(q, '00', ['00', '10', '00']), false);
});

test('a meeting that works solves a one-answer puzzle; one that is too long names a pair', () => {
  const p = byId('meeting-02'), q = p.parameters;
  let wrong = play(p, freshAttempt(p), ...walk('A', '10 20 21 22'), ...walk('B', '31 32 22'), ...walk('C', '13 23 22'));
  assert.equal(isSolved(p, wrong.board), false, 'the walkers stay at a dot that does not work');
  assert.deepEqual(failing(q, q.homes, wrong.board.walks), ['A', 'B'], 'A and B: the dot is off every shortest route');
  assert.match(view(p, wrong), /Too long for A and B\./);
  assert.match(view(p, wrong), /mt-proof/);
  // A meeting dot reached by a walk that wanders is too long too.
  const long = play(p, freshAttempt(p), ...walk('A', '01 02 12 11'), ...walk('B', '31 21 11'), ...walk('C', '13 12 11'));
  assert.equal(isSolved(p, long.board), false);
  assert.deepEqual(failing(q, q.homes, long.board.walks), ['A', 'B'], 'the dot works, but A’s walk is not shortest');
  const a = play(p, freshAttempt(p), ...walk('A', '10 11'), ...walk('B', '31 21 11'), ...walk('C', '13 12 11'));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'back', walker: 'C', to: '12'}), null, 'nothing after a solve');
  const home = byId('meeting-04');
  assert.ok(isSolved(home, play(home, freshAttempt(home), ...walk('A', 'b'), ...walk('C', 'b')).board), 'B stays at home');
});

test('find every: a meeting dot found sends the walkers home; found already; there is another; That’s all; Undo keeps the row', () => {
  const p = byId('meeting-09');
  let a = play(p, freshAttempt(p), ...walk('A', 'x'), ...walk('B', 'x'), ...walk('C', 'x'));
  assert.deepEqual(a.board.found, ['x']);
  assert.deepEqual(a.board.walks, {A: ['a'], B: ['b'], C: ['c']});
  const again = play(p, a, ...walk('A', 'x'), ...walk('B', 'x'), ...walk('C', 'x'));
  assert.deepEqual(again.board.told, {kind: 'again', dot: 'x'});
  a = play(p, a, {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'more'});
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a new dot');
  a = play(p, a, ...walk('A', 'y'));
  assert.deepEqual(a.board.told, {kind: 'more'}, 'a step keeps the answer');
  a = play(p, a, ...walk('B', 'y'), ...walk('C', 'y'));
  assert.deepEqual(a.board.found, ['x', 'y']);
  assert.equal(a.board.told, null);
  const kept = meetingMechanics.meeting.carry(p, a.board, undo(a).board);
  assert.deepEqual(kept.found, ['x', 'y'], 'Undo keeps what was found');
  assert.ok(validBoard(p, kept));
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  const none = byId('meeting-10');
  assert.ok(isSolved(none, play(none, freshAttempt(none), {type: 'all'}).board), 'with no meeting dot, That’s all is right at once');
  const tri = play(none, freshAttempt(none), ...walk('A', 'b'), ...walk('C', 'b'));
  assert.deepEqual(failing(none.parameters, none.parameters.homes, tri.board.walks), ['A', 'C'], 'B is off the road from A to C');
});

test('close: a bar, the budget, no cutting the map, No dot works and its answer', () => {
  const p = byId('meeting-12'), q = p.parameters, road = (u, v) => q.roads.findIndex(r => r.join() === `${u},${v}`);
  assert.deepEqual(closures(q), [[road('01', '11')]]);
  let a = play(p, freshAttempt(p), {type: 'claim'});
  assert.equal(a.board.refused, true);
  assert.match(view(p, a), /This dot still works\./);
  assert.equal(move(p, a, {type: 'claim'}), null, 'the same claim waits for a change');
  a = play(p, a, {type: 'close', road: road('00', '10')});
  assert.equal(a.board.refused, false);
  assert.equal(move(p, a, {type: 'close', road: road('01', '11')}), null, 'one road only');
  a = play(p, a, {type: 'claim'});
  assert.equal(a.board.refused, true, 'C still meets them at the dot between A and B');
  a = play(p, a, {type: 'open', road: road('00', '10')}, {type: 'close', road: road('01', '11')}, {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  const wide = {...p, parameters: {...q, budget: 2}};
  const cut = play(wide, freshAttempt(wide), {type: 'close', road: road('00', '10')});
  assert.equal(move(wide, cut, {type: 'close', road: road('00', '01')}), null, 'closing both roads of a corner cuts it off');
  assert.equal(connected(q, [road('00', '10'), road('00', '01')]), false);
});

test('hints: the next step toward the meeting dot, the furthest walker first, a step back after a wasted step', () => {
  const p = byId('meeting-02');
  assert.equal(nextHint(p, freshAttempt(p)).action.walker, 'B', 'B and C are 4 steps away; B comes first');
  const wasted = play(p, freshAttempt(p), ...walk('A', '01 02'));
  assert.deepEqual(nextHint(p, wasted).action, {type: 'back', walker: 'A', to: '01'});
  assert.equal(nextHint(p, wasted).text, 'Take A back one step.');
  const cube = byId('meeting-06');
  assert.equal(nextHint(cube, freshAttempt(cube)).text, 'Move A to 100.');
  assert.equal(stepWords(p.parameters, '00', '10'), 'one step right');
  assert.equal(stepWords(p.parameters, '00', '01'), 'one step up');
  const close = byId('meeting-12');
  assert.equal(nextHint(close, freshAttempt(close)).text, 'Close the road from C going left.');
  for (const q of meeting.puzzles.filter(x => x.band !== 'playground')) {
    let a = freshAttempt(q), n = 0;
    while (!isSolved(q, a.board) && n++ < 80) { const h = nextHint(q, a); assert.equal(h.type, 'move', `${q.id}: ${h.text}`); a = play(q, a, h.action); }
    assert.ok(isSolved(q, a.board), `${q.id}: hints alone solve it`);
  }
});

test('arrow keys move the chosen walker along the road that points that way', () => {
  const p = byId('meeting-02'), q = p.parameters, b = freshAttempt(p).board;
  assert.deepEqual(arrowAction(q, b, 'A', 'ArrowRight'), {type: 'step', walker: 'A', to: '10'});
  assert.deepEqual(arrowAction(q, b, 'A', 'ArrowUp'), {type: 'step', walker: 'A', to: '01'});
  assert.equal(arrowAction(q, b, 'A', 'ArrowLeft'), null, 'no road that way');
  const moved = play(p, freshAttempt(p), ...walk('A', '10')).board;
  assert.deepEqual(arrowAction(q, moved, 'A', 'ArrowLeft'), {type: 'back', walker: 'A', to: '00'}, 'back the way it came');
  const t = byId('meeting-03');
  assert.deepEqual(arrowAction(t.parameters, freshAttempt(t).board, 'B', 'ArrowLeft'), {type: 'step', walker: 'B', to: 'w'}, 'a diagonal road counts');
});

test('the playground: maps, homes moved, meetings kept, never solved', () => {
  const p = meeting.puzzles.find(x => x.band === 'playground');
  let a = play(p, freshAttempt(p), {type: 'map', map: 'tree'});
  a = play(p, a, ...walk('A', 'u v'), ...walk('B', 'w v'), ...walk('C', 't v'));
  assert.deepEqual(a.board.found, ['v']);
  a = play(p, a, {type: 'home', walker: 'C', to: 'q'});
  assert.deepEqual(a.board.homes, {A: 'a', B: 'b', C: 'q'});
  assert.deepEqual(a.board.found, []);
  assert.deepEqual(meetingDots({...p.parameters.maps.tree}, a.board.homes), ['u']);
  assert.equal(move(p, a, {type: 'home', walker: 'A', to: 'b'}), null, 'homes stay apart');
  assert.deepEqual(dotAction(p.parameters.maps.tree, a.board, 'A', 'homes', 'b'), {choose: 'B'});
  assert.deepEqual(dotAction(p.parameters.maps.tree, a.board, 'A', 'homes', 's'), {move: {type: 'home', walker: 'A', to: 's'}});
  assert.equal(nextHint(p, a).type, 'done');
  assert.equal(isSolved(p, a.board), false);
  const back = meetingMechanics.meeting.carry(p, a.board, undo(a).board);
  assert.deepEqual(back.found, ['v'], 'Undo of a home move brings back what was found with those homes');
});

test('forged saves are rejected', () => {
  const p = byId('meeting-08'), fresh = freshAttempt(p).board;
  assert.equal(validBoard(p, {...fresh, found: ['22']}), false, 'not a meeting dot');
  assert.equal(validBoard(p, {...fresh, found: ['33', '33']}), false, 'found twice');
  assert.equal(validBoard(p, {...fresh, walks: {...fresh.walks, A: ['04', '99']}}), false, 'off the map');
  assert.equal(validBoard(p, {...fresh, done: true}), false, 'That’s all too soon');
  assert.equal(validBoard(p, {...fresh, found: ['33'], told: {kind: 'more'}}), false);
  assert.ok(validBoard(p, {...fresh, found: ['33'], told: {kind: 'again', dot: '33'}}));
  const c = byId('meeting-12');
  assert.equal(validBoard(c, {closed: [], claimed: true, refused: false}), false, 'a claim while a dot works');
  assert.equal(validBoard(c, {closed: [5, 2], claimed: false, refused: false}), false, 'past the budget');
});

test('every puzzle renders its map, homes and walkers; objectives stay off the board unless needed', () => {
  for (const p of meeting.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, /mt-puzzle/, p.id);
    assert.match(html, /gb-board/, p.id);
    assert.match(html, /home hA/, p.id);
    const mode = p.parameters.mode;
    assert.equal(p.visibleObjective, {meet: '', every: 'Find every meeting dot.', close: 'Close one road so no dot works.', playground: ''}[mode], p.id);
    if (mode !== 'close') assert.match(html, /aria-label="(Walker|Home) A"/, `${p.id}: walker chips`);
  }
  const p = byId('meeting-01'), html = view(p, freshAttempt(p));
  assert.match(html, /data-gb-node="10"/, 'A’s neighbours can be tapped');
  assert.match(html, /mt-token tA chosen/);
  assert.doesNotMatch(html, /data-gb-node="22"/, 'a dot with nothing to do is not a control');
  const e = byId('meeting-09'), shared = view(e, play(e, freshAttempt(e), ...walk('A', 'x'), ...walk('B', 'x')));
  assert.equal((shared.match(/class="mt-trail/g) || []).length, 2, 'two trails');
});
