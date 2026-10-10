// Memory robot (dist/families/robot/robot.js): the moves and the memory,
// order mattering, loops remembering their signed area wherever they are,
// the shading and its numerals, the board's edge, budgets, every shortest
// walk accepted, hints, saves, rendering, the playground and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {step, trace, stateOf, shading, finish, toGo, startOf, LO, HI} from '../dist/families/robot/robot.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/robot/robot.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const O = {start: [0, 0]};
const memory = walk => stateOf(O, walk)[2];
const total = counts => [...counts.values()].reduce((s, v) => s + v, 0);
// Moves by letter, as taps on the corner next to the robot.
const D = {E: [1, 0], N: [0, 1], W: [-1, 0], S: [0, -1]};
const q = p => p.parameters.mode === 'playground' ? O : p.parameters;
const go = (p, a, word) => [...word].reduce((x, c) => { if (!x) return null; const [px, py] = stateOf(q(p), x.board.walk); return move(p, x, {type: 'go', to: [px + D[c][0], py + D[c][1]]}); }, a);
const html = (p, a) => mechanicFor(p).render(p, a);
const count = (s, pattern) => (s.match(pattern) || []).length;

test('north adds the column, south subtracts it, east and west keep the memory', () => {
  assert.deepEqual(step([2, 1, 5], 'N'), [2, 2, 7]);
  assert.deepEqual(step([-2, 1, 5], 'N'), [-2, 2, 3]);
  assert.deepEqual(step([3, 1, 5], 'S'), [3, 0, 2]);
  assert.deepEqual(step([3, 1, 5], 'E'), [4, 1, 5]);
  assert.equal(memory('EN'), 1);
  assert.equal(memory('NE'), 0, 'the same corner, a different memory');
  assert.deepEqual(['EENN', 'ENEN', 'ENNE', 'NEEN', 'NENE', 'NNEE'].map(memory), [4, 3, 2, 2, 1, 0], 'Week 72 Problem 1');
  assert.equal(memory('EENE'), 2, 'the launch example');
  assert.equal(memory('ENWS'), 1);
  assert.equal(memory('NESW'), -1);
  assert.equal(memory('EWNS'), 0);
  assert.equal(memory('EEEENWNW'), 7, 'Week 72 Problem 4');
  assert.equal(memory('NNNENESS'), -3, 'Week 72 Problem 4');
  assert.equal(trace(O, 'WWW'), null, 'the board ends at −2');
  assert.equal(trace(O, 'NNNNN'), null, 'and at 4');
  assert.equal(trace(O, 'EX'), null);
});

test('the shading adds up to the memory, and a loop keeps only its inside', () => {
  assert.deepEqual([...shading(O, 'EEN')], [['0,0', 1], ['1,0', 1]]);
  assert.deepEqual([...shading(O, 'WN')], [['-1,0', -1]], 'left of the wall a step north shades blue');
  for (const walk of ['EEN', 'WNN', 'ENWSENWS', 'NESWWNNEEE', 'EEENWWWSSE']) assert.equal(total(shading(O, walk)), memory(walk), walk);
  // Far from the wall, the long strips cancel round the loop.
  const far = {start: [3, 0]};
  assert.equal(total(shading(far, 'EN')), 4);
  assert.deepEqual([...shading(far, 'ENWWSE')].sort(), [['2,0', 1], ['3,0', 1]]);
  assert.deepEqual([...shading(O, 'EENNWWSS')].sort(), [['0,0', 1], ['0,1', 1], ['1,0', 1], ['1,1', 1]]);
  assert.deepEqual([...shading(O, 'ENWSENWS')], [['0,0', 2]], 'a loop walked twice counts twice');
  assert.deepEqual([...shading(O, 'ENWSNESW')], [], 'there and back again');
});

test('the budget is the fewest moves, and the hint search finds a shortest finish from anywhere', () => {
  const expected = [2, 4, 4, 4, 8, 8, 10, 6, 12, 6, 6, 5];
  assert.deepEqual(pack.puzzles.filter(p => p.band === 'all').map(p => p.parameters.budget), expected);
  const p10 = byId('robot-10').parameters;
  assert.equal(toGo(p10, startOf(p10)), 6);
  assert.equal(finish(p10), 'EEENWN');
  assert.equal(finish(p10, [3, 1, 3], 2), 'WN');
  assert.equal(finish(p10, [2, 0, 0], 4), 'ENWN', 'out past the flag and back');
  assert.equal(finish(p10, [2, 2, 4], 2), null, 'on the flag with 4, two moves can’t add 1');
});

test('order matters: east then north solves, north then east is a dead end', () => {
  const p = byId('robot-01');
  let a = go(p, freshAttempt(p), 'N');
  assert.equal(nextHint(p, a).type, 'deadend');
  assert.match(nextHint(p, a).text, /Undo/);
  a = go(p, a, 'E');
  assert.ok(a && !isSolved(p, a.board), 'on the flag with memory 0');
  assert.equal(go(p, a, 'E'), null, 'no move past the budget');
  a = go(p, freshAttempt(p), 'EN');
  assert.ok(isSolved(p, a.board));
  assert.equal(go(p, a, 'E'), null, 'nothing after a solve');
});

test('every shortest walk is accepted, not just the witness', () => {
  for (const walk of ['ENWS', 'WSEN', 'NWSE', 'SENW']) assert.ok(isSolved(byId('robot-03'), go(byId('robot-03'), freshAttempt(byId('robot-03')), walk).board), walk);
  for (const walk of ['NESW', 'ESWN', 'WNES', 'SWNE']) assert.ok(isSolved(byId('robot-04'), go(byId('robot-04'), freshAttempt(byId('robot-04')), walk).board), walk);
  const p6 = byId('robot-06');
  for (const walk of ['EEENWWWS', 'EENWNWSS', 'NNNWSSSE']) assert.ok(isSolved(p6, go(p6, freshAttempt(p6), walk).board), `${walk}: a strip or an L`);
  const p10 = byId('robot-10');
  for (const walk of ['EEENWN', 'ESENNN', 'SENENN', 'EENENW']) assert.ok(isSolved(p10, go(p10, freshAttempt(p10), walk).board), walk);
  const p11 = byId('robot-11');
  for (const walk of ['WNNEEE', 'NNNEES']) assert.ok(isSolved(p11, go(p11, freshAttempt(p11), walk).board), walk);
  assert.ok(!isSolved(p11, go(p11, freshAttempt(p11), 'EENNNS').board), 'a different memory');
});

test('the board: walls, shading, numerals, the flag, the robot and its four moves', () => {
  const p = byId('robot-08');
  let a = freshAttempt(p), s = html(p, a);
  assert.match(s, /class="mr-wall"/);
  assert.match(s, /aria-label="Memory 0"/);
  assert.match(s, /aria-label="Goal: memory 2 on the flag"/);
  assert.match(s, /class="mr-flag"/);
  assert.equal(count(s, /class="mr-step/g), 4);
  for (const d of ['east', 'west', 'north', 'south']) assert.match(s, new RegExp(`aria-label="Move ${d}"`));
  assert.equal(count(s, /class="mr-slot"/g), 6);
  assert.match(s, /Memory 0\. At 3 across, 0 up\. 6 moves left\./);
  a = go(p, a, 'E');
  s = html(p, a);
  assert.equal(count(s, /class="mr-step/g), 3, 'no move off the board');
  assert.doesNotMatch(s, /Move east/);
  a = go(p, a, 'N');
  s = html(p, a);
  assert.equal(count(s, /sg-cell mr-pos/g), 4, 'a step north at column 4 shades four squares');
  assert.match(s, /aria-label="Memory 4"/);
  assert.equal(count(s, /class="mr-played"/g), 2);
  a = go(p, a, 'WWSE');
  s = html(p, a);
  assert.ok(isSolved(p, a.board));
  assert.equal(count(s, /sg-cell mr-pos/g), 2, 'the strips cancel outside the loop');
  assert.match(s, /mr-puzzle solved/);
  assert.equal(count(s, /class="mr-step/g), 0, 'no moves after a solve');
  const play = byId('robot-playground');
  s = html(play, go(play, freshAttempt(play), 'NESWNESW'));
  assert.match(s, /<text class="mr-num neg"[^>]*>−2<\/text>/, 'a square counted twice shows its number');
  assert.match(s, /sg-cell mr-neg deep/);
  s = html(play, go(play, freshAttempt(play), 'ENWSENWS'));
  assert.match(s, /<text class="mr-num"[^>]*>2<\/text>/);
  assert.match(s, /<text class="mr-col wall"[^>]*>0<\/text>/);
  assert.match(s, /<text class="mr-col"[^>]*>−2<\/text>/);
});

test('hints name the next move in words and mark its corner; hints alone finish every puzzle', () => {
  for (const p of pack.puzzles.filter(x => x.band === 'all')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 14 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      assert.match(h.text, /^Move (east|west|north|south)\.$/);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints finish`);
    assert.equal(a.board.walk.length, p.parameters.budget);
  }
  const p = byId('robot-10'), a = go(p, freshAttempt(p), 'EEEN');
  assert.equal(nextHint(p, a).text, 'Move west.');
  const shown = html(p, {...a, hintLevel: 2});
  assert.match(shown, /class="mr-step hinted"[^>]*aria-label="Move west"/);
  assert.doesNotMatch(html(p, {...a, hintLevel: 1}), /hinted/);
  // With the budget spent and no solve, Undo; one Undo is not always enough.
  const spent = go(p, freshAttempt(p), 'EENNEW');
  assert.equal(nextHint(p, spent).type, 'deadend');
  assert.equal(nextHint(p, undo(spent)).type, 'deadend');
});

test('saves: only walks on the board within the budget, ending at the first solve', () => {
  const p = byId('robot-03');
  assert.ok(validBoard(p, {walk: ''}));
  assert.ok(validBoard(p, {walk: 'NNSS'}));
  assert.ok(validBoard(p, {walk: 'ENWS'}));
  for (const forged of [{walk: 'ENWSE'}, {walk: 'WWW'}, {walk: 'X'}, {walk: 'en'}, {walk: ['E']}, {walk: '', extra: 1}, {}, null, 'EN']) assert.equal(validBoard(p, forged), false, JSON.stringify(forged));
  // With room to spare, a walk that solves and keeps going is still refused.
  const roomy = {...p, id: 'robot-roomy', parameters: {...p.parameters, budget: 6}};
  assert.ok(validBoard(roomy, {walk: 'EWENWS'}));
  assert.equal(validBoard(roomy, {walk: 'ENWSEW'}), false);
  assert.equal(go(roomy, go(roomy, freshAttempt(roomy), 'ENWS'), 'E'), null);
});

test('the playground: free walking, Clear, no goal and no hints', () => {
  const p = byId('robot-playground');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {walk: ''});
  assert.equal(mechanicFor(p).noHint(p), true);
  assert.equal(nextHint(p, a).type, 'note');
  assert.doesNotMatch(html(p, a), /mr-goal|mr-slot|mr-flag/);
  a = go(p, a, 'EENNWWSS');
  assert.match(html(p, a), /aria-label="Memory 4"/);
  assert.ok(!isSolved(p, a.board));
  assert.equal(go(p, a, 'WWW'), null, 'the board’s edge');
  a = move(p, a, {type: 'clear'});
  assert.deepEqual(a.board, {walk: ''});
  assert.equal(move(p, a, {type: 'clear'}), null);
  assert.match(html(p, a), /mr-clear"[^>]*disabled/);
});

test('How to play shows one worked step: east, east, north leaves 2', () => {
  const p = byId('robot-01'), s = mechanicFor(p).help(p, freshAttempt(p));
  assert.match(s, /role="img"/);
  assert.match(s, /memory 2/);
  assert.equal(count(s, /sg-cell mr-pos/g), 2);
  assert.doesNotMatch(s, /mr-step/);
});

test('the board fits every puzzle: corners from −2 to 4, and the flag and start on it', () => {
  assert.deepEqual([LO, HI], [-2, 4]);
  for (const p of pack.puzzles.filter(x => x.band === 'all')) {
    const {start, flag} = p.parameters;
    for (const c of [start, flag]) assert.ok(c.every(v => v >= LO && v <= HI), p.id);
    assert.equal(trace(p.parameters, p.solution.walk).length, p.parameters.budget + 1);
  }
});

test('the satchel shows Memory robot with its playground and twelve puzzles', async () => {
  const merged = await loadPack();
  const page = libraryView({attempts: {}}, merged.puzzles);
  const at = page.slice(page.indexOf('data-view-key="family-robot"'));
  const section = at.slice(0, at.indexOf('</details>'));
  assert.match(section, /data-id="robot-playground"/);
  for (let i = 1; i <= 12; i++) assert.match(section, new RegExp(`data-id="robot-${String(i).padStart(2, '0')}"`));
});
