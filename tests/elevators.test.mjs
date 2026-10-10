// Doubling elevators (dist/families/elevators/elevators.js): steps that double
// on each level, the ground and the top level, the window, shortest trips and
// their count, budgets, the flag and the farthest puzzles, the board (step
// lengths, rings, trail, car), the move buttons and their names, hints, saves,
// the playground and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {go, replay, fewest, nextMove, shortestTrip, moveWords, stepAt, PLAYGROUND} from '../dist/families/elevators/elevators.js';
import {countTrips, noLeft, farthestIn, bound, OPEN} from '../scripts/build-elevators.mjs';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/elevators/elevators.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, word) => [...word].reduce((x, dir) => x && move(p, x, {type: 'move', dir}), a);
const html = (p, a) => mechanicFor(p).render(p, a);
const count = (s, re) => (s.match(re) || []).length;

test('a step on level h is 2^h; up and down keep the coordinate; the window and the ground hold', () => {
  const q = {levels: 4, xmin: -4, xmax: 20};
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(stepAt), [1, 2, 4, 8, 16, 32]);
  assert.deepEqual(go(q, [1, 0], 'U'), [1, 1]);
  assert.deepEqual(go(q, [1, 1], 'R'), [3, 1], 'from 1 on level 1, a step right goes to 3 (Week 74 rehearsal)');
  assert.deepEqual(go(q, [1, 2], 'R'), [5, 2]);
  assert.deepEqual(go(q, [3, 1], 'D'), [3, 0]);
  assert.equal(go(q, [0, 0], 'D'), null, 'not below the ground');
  assert.equal(go(q, [0, 3], 'U'), null, 'not above the top level');
  assert.equal(go(q, [0, 3], 'L'), null, 'not off the left of the window');
  assert.equal(go(q, [16, 3], 'R'), null, 'not off the right');
  assert.deepEqual(replay(q, 'URD').at(-1), [2, 0]);
  assert.equal(replay(q, 'D'), null);
  assert.equal(moveWords('R', 3), 'Right 8');
  assert.equal(moveWords('L', 0, true), 'Step left 1.');
  assert.equal(moveWords('U', 2, true), 'Go up.');
});

test('the fewest moves: 16 in 8, two ways; 23 in 10 by going past; no-left trips need more', () => {
  assert.equal(fewest(OPEN, [0, 0], 16), 8);
  assert.equal(countTrips(OPEN, 16), 2);
  assert.equal(fewest(OPEN, [0, 0], 23), 10);
  assert.equal(noLeft(OPEN, 23), 11);
  assert.equal(noLeft(OPEN, 63), 15);
  assert.equal(shortestTrip(OPEN, 23), 'UUURRRDDDL', 'hints climb first');
  assert.equal(nextMove(OPEN, [24, 0], 23), 'L');
  assert.deepEqual([4, 5, 6, 7, 8, 9, 10, 11].map(bound), [4, 6, 8, 12, 16, 24, 32, 48]);
  assert.equal(farthestIn(OPEN, 9), 24);
  assert.equal(farthestIn(OPEN, 11), 48);
});

test('a flag puzzle: the slots fill, the flag and the step lengths show, and the flag on the ground solves', () => {
  const p = byId('elevators-05');
  assert.equal(p.visibleObjective, '');
  let a = freshAttempt(p);
  const start = html(p, a);
  assert.equal(count(start, /class="elv-slot"/g), 8, 'one outline per move');
  assert.match(start, /class="elv-flag"/);
  assert.deepEqual([...start.matchAll(/<span style="top:\d+px">(\d+)<\/span>/g)].map(m => Number(m[1])), [1, 2, 4, 8, 16], 'a step length beside each level');
  assert.equal(count(start, /class="elv-dest/g), 3, 'up, left and right are one move away; down is not');
  assert.match(start, /aria-label="Right 1"/);
  assert.match(start, /aria-label="Down" disabled/);
  a = play(p, a, 'UUU');
  assert.match(html(p, a), /aria-label="Right 8"/, 'the button names the step at this level');
  a = play(p, a, 'R');
  assert.equal(count(html(p, a), /class="elv-played"/g), 4);
  assert.equal(count(html(p, a), /preserveAspectRatio="none"/g), 1, 'a step is drawn as an arc');
  assert.equal(count(html(p, a), /<line class="elv-trail/g), 3, 'each ride is a riser');
  a = play(p, a, 'RDDD');
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, a), /elv-field solved/);
  assert.doesNotMatch(html(p, a), /class="elv-dest/, 'no rings after a solve');
  assert.equal(move(p, a, {type: 'move', dir: 'U'}), null);
  assert.ok(isSolved(p, play(p, freshAttempt(p), 'UURRRRDD').board), 'the other eight-move trip');
});

test('a wasted move is a dead end, and the budget refuses one move more', () => {
  const p = byId('elevators-02');
  let a = play(p, freshAttempt(p), 'R');
  assert.deepEqual(nextHint(p, a), {type: 'deadend', text: 'Too few moves are left. Undo.'});
  a = play(p, a, 'RRRR');
  assert.equal(a.board.word.length, 5);
  assert.ok(!isSolved(p, a.board));
  for (const dir of 'UDLR') assert.equal(move(p, a, {type: 'move', dir}), null, `no ${dir} past the budget`);
  assert.match(html(p, a), /aria-label="Up" disabled/);
  assert.ok(isSolved(p, play(p, freshAttempt(p), 'URRRD').board));
});

test('a farthest puzzle has no flag, one line of goal, and only the farthest place solves', () => {
  const p = byId('elevators-08'), q = p.parameters;
  assert.equal(p.visibleObjective, 'Go as far right as you can.');
  assert.equal(q.target, 24); assert.equal(q.budget, 9); assert.equal(q.farthest, true);
  assert.doesNotMatch(html(p, freshAttempt(p)), /elv-flag/);
  const short = play(p, freshAttempt(p), 'UURRRRRDD');
  assert.deepEqual(replay(q, short.board.word).at(-1), [20, 0]);
  assert.ok(!isSolved(p, short.board), 'ending on the ground at 20 is not the farthest');
  assert.deepEqual(nextHint(p, short), {type: 'deadend', text: 'Some trip goes farther. Undo.'});
  assert.ok(isSolved(p, play(p, freshAttempt(p), 'UUURRRDDD').board));
  const far = byId('elevators-10');
  assert.equal(far.parameters.target, 48);
  assert.ok(isSolved(far, play(far, freshAttempt(far), 'UUUURRRDDDD').board));
});

test('hints name the next move in words, mark it, and finish every puzzle from any state that can still finish', () => {
  for (const p of pack.puzzles.filter(q => q.band !== 'playground')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 20 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      assert.match(h.text, /^(Go (up|down)|Step (left|right) (1|2|4|8|16|32))\.$/);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints finish`);
    assert.equal(a.board.word.length, p.parameters.budget);
  }
  const p = byId('elevators-09');
  const a = play(p, freshAttempt(p), 'UUURRRDDD');
  assert.deepEqual(nextHint(p, a).action, {type: 'move', dir: 'L'});
  assert.equal(nextHint(p, a).text, 'Step left 1.');
  const shown = html(p, {...a, hintLevel: 2});
  assert.match(shown, /elv-dest hinted" data-dir="L"/, 'the ring is marked');
  assert.match(shown, /elv-move to-L hinted/, 'and the button');
  assert.doesNotMatch(html(p, {...a, hintLevel: 1}), /hinted/, 'the first level only nudges');
  // Searches start from where the car is: from the other side, the step back comes first.
  const left = play(p, freshAttempt(p), 'L');
  assert.equal(nextHint(p, left).text, 'Go up.');
  assert.ok(isSolved(p, play(p, left, 'UUURRRDDD').board));
});

test('saves: only words in U, D, L and R that stay on the board, within the budget, and stop at a solve', () => {
  const p = byId('elevators-01');
  assert.ok(validBoard(p, {word: 'RR'}));
  for (const forged of [{word: 'RRRR'}, {word: 'D'}, {word: 'UU'}, {word: 'LLLLL'}, {word: 'rr'}, {word: 'R R'}, {word: 5}, {word: 'R', extra: 1}, {}, null, 'RRR']) {
    assert.equal(validBoard(p, forged), false, JSON.stringify(forged));
  }
  // With room to spare, a save that passes the flag and comes back is refused.
  const loose = {...p, parameters: {...p.parameters, budget: 5}};
  assert.ok(validBoard(loose, {word: 'RRLRR'}));
  assert.equal(validBoard(loose, {word: 'RRRLR'}), false, 'nothing after reaching the flag');
});

test('the playground: a wide board, any move, Clear, no hint and no end', () => {
  const p = byId('elevators-playground');
  assert.deepEqual(p.parameters, {mode: 'playground', ...PLAYGROUND});
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {word: ''});
  assert.equal(mechanicFor(p).noHint(p), true);
  assert.equal(nextHint(p, a).type, 'note');
  assert.equal(move(p, a, {type: 'clear'}), null);
  a = play(p, a, 'UUUUURRDDDDD');
  assert.deepEqual(replay(PLAYGROUND, a.board.word).at(-1), [64, 0]);
  assert.ok(!isSolved(p, a.board));
  assert.doesNotMatch(html(p, a), /elv-flag|elv-slot"/);
  assert.equal(count(html(p, a), /class="elv-played"/g), 12, 'the moves so far');
  assert.match(html(p, a), /data-move="\{&quot;type&quot;:&quot;clear&quot;\}"/);
  assert.equal(move(p, a, {type: 'clear'}).board.word, '');
  assert.equal(undo(move(p, a, {type: 'clear'})).board.word, a.board.word, 'Undo brings the trip back');
  assert.equal(validBoard(p, {word: 'UR'.repeat(101)}), false, 'at most 200 moves');
});

test('the satchel shows Doubling elevators with its playground and twelve puzzles', async () => {
  const merged = await loadPack();
  const page = libraryView({attempts: {}}, merged.puzzles);
  const at = page.slice(page.indexOf('data-view-key="family-elevators"'));
  const section = at.slice(0, at.indexOf('</details>'));
  assert.match(section, /data-id="elevators-playground"/);
  for (let i = 1; i <= 12; i++) assert.match(section, new RegExp(`data-id="elevators-${String(i).padStart(2, '0')}"`));
});
