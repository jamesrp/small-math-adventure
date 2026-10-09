// Gentle hills (dist/families/hills/hills.js): gentle landscapes, clues that
// fit or are too far apart, the lowest and highest landscapes, every
// landscape and That's all, pinning with the fewest towers and the second
// landscape, rings, hints, saves, rendering, the playground and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {distance, conflicts, lowest, highest, completions, needed, fixed, steep, legal} from '../dist/families/hills/hills.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/hills/hills.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const html = (p, a) => mechanicFor(p).render(p, a);
const build = (p, a, heights) => heights.reduce((x, v, i) => x && (x.board.h[i] === v ? x : move(p, x, {type: 'set', site: i, h: v})), a);

test('distance, steep jumps, the envelopes and every landscape', () => {
  const row = {sites: 5, ring: false, top: 3, clues: [[0, 3], [4, 0]]}, ring = {...row, ring: true};
  assert.equal(distance(row, 0, 4), 4);
  assert.equal(distance(ring, 0, 4), 1);
  assert.deepEqual(steep(row, [0, 2, 2, null, 0]), [[0, 1]]);
  assert.deepEqual(lowest(row), [3, 2, 1, 0, 0]);
  assert.deepEqual(highest(row), [3, 3, 2, 1, 0]);
  assert.equal(completions(row).length, 4);
  assert.deepEqual(conflicts(ring), [[0, 4]], 'on a ring the 3 and the 0 are neighbours');
  assert.equal(completions(ring).length, 0);
  assert.ok(legal(row, [3, 2, 2, 1, 0]));
  assert.ok(!legal(row, [3, 1, 1, 1, 0]));
});

test('pinning: the ends and the turning towers, and nothing fewer', () => {
  const q = {sites: 7, ring: false, top: 4, land: [3, 2, 1, 1, 2, 3, 4], clues: []};
  assert.deepEqual(needed(q), [0, 2, 3, 6]);
  assert.ok(fixed(q, [0, 2, 3, 6]));
  assert.ok(!fixed(q, [0, 2, 6]), 'one tower of the flat bottom is not enough');
  const ring = {sites: 6, ring: true, top: 3, land: [0, 1, 2, 3, 2, 1], clues: []};
  assert.deepEqual(needed(ring), [0, 3], 'a ring has no ends');
  assert.ok(fixed(ring, [0, 3]));
});

test('fill: build the forced ramp; a steep jump shows a red bar', () => {
  const p = byId('hills-01');
  let a = build(p, freshAttempt(p), [0, 2]);
  assert.match(html(p, a), /hills-gap steep/);
  assert.ok(!isSolved(p, a.board));
  a = build(p, a, [0, 1, 2, 3, 4]);
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, a), /hills-land solved/);
  assert.equal(move(p, a, {type: 'set', site: 1, h: 0}), null, 'nothing after a solve');
  assert.equal(move(p, freshAttempt(p), {type: 'set', site: 0, h: 1}), null, 'clues stay');
  assert.doesNotMatch(html(p, freshAttempt(p)), /hills-cant/, 'no Can’t on the first puzzle');
});

test('Can’t names two clues: too far apart solves, a pair that fits is refused', () => {
  const p = byId('hills-06');
  let a = move(p, freshAttempt(p), {type: 'cant', pair: [0, 2]});
  assert.ok(a && !isSolved(p, a.board));
  assert.match(html(p, a), /Those two clues fit\./);
  a = move(p, a, {type: 'set', site: 1, h: 2});
  assert.equal(a.board.refused, null, 'a move clears the refusal');
  a = move(p, a, {type: 'cant', pair: [4, 2]});
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.claimed, [2, 4]);
  assert.equal((html(p, a).match(/hills-cell[^"]* apart/g) || []).length, 2, 'both clues are ringed');
  const room = byId('hills-05');
  assert.ok(!isSolved(room, move(room, freshAttempt(room), {type: 'cant', pair: [3, 6]}).board), 'Just enough room: the tight pair still fits');
  assert.ok(isSolved(room, build(room, freshAttempt(room), [2, 1, 0, 0, 1, 2, 3]).board));
});

test('the Can’t picker is view state: tap one clue, then another', () => {
  const p = byId('hills-02'), m = mechanicFor(p);
  m.reset(p);
  assert.doesNotMatch(html(p, freshAttempt(p)), /hills-pickable/);
  m.ui(p, {claiming: true});
  assert.equal((html(p, freshAttempt(p)).match(/hills-pickable/g) || []).length, 2);
  m.ui(p, {pick: 0});
  assert.match(html(p, freshAttempt(p)), /hills-pickable picked/);
  assert.match(html(p, freshAttempt(p)), /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;pair&quot;:\[0,2\]\}"/);
  move(p, freshAttempt(p), {type: 'set', site: 1, h: 1});
  assert.doesNotMatch(html(p, freshAttempt(p)), /hills-pickable/, 'a move closes the picker');
});

test('every landscape: each is recorded once, and That’s all checks', () => {
  const p = byId('hills-03');
  let a = move(p, freshAttempt(p), {type: 'done'});
  assert.match(html(p, a), /There is another landscape\./);
  a = build(p, a, [3, 2, 1, 0, 0]);
  assert.deepEqual(a.board.found, ['3,2,1,0,0']);
  assert.match(html(p, a), /hills-found/);
  a = build(p, a, [3, 2, 1, 1, 0]);
  a = build(p, a, [3, 2, 1, 0, 0]);
  assert.equal(a.board.found.length, 2, 'found again counts once');
  a = build(p, build(p, a, [3, 2, 2, 1, 0]), [3, 3, 2, 1, 0]);
  assert.equal(a.board.found.length, 4);
  assert.doesNotMatch(html(p, a), /\b4 of\b|of 4/, 'no count of how many are left');
  a = move(p, a, {type: 'done'});
  assert.ok(isSolved(p, a.board));
});

test('a ring of three: the last tower is next to the first', () => {
  const p = byId('hills-08');
  assert.equal(p.solution.count, 3);
  assert.match(html(p, freshAttempt(p)), /hills-col[^"]* copy/, 'a copy of the first tower closes the ring');
  const a = build(p, freshAttempt(p), [0, 1, 2, 2, 0]);
  assert.equal(a.board.found.length, 0, 'the jump back from the last tower is checked');
  assert.match(html(p, a), /hills-gap steep/);
  const ring = byId('hills-10');
  assert.ok(isSolved(ring, move(ring, freshAttempt(ring), {type: 'cant', pair: [0, 3]}).board));
});

test('pin: the fewest towers fix the landscape; wrong pins show a second landscape', () => {
  const p = byId('hills-07');
  assert.deepEqual(p.solution.pins, [0, 2, 3, 6]);
  let a = freshAttempt(p);
  assert.match(html(p, a), /hills-cell[^"]* ghost/, 'free towers show the heights they could have');
  for (const s of [0, 2, 4, 6]) a = move(p, a, {type: 'pin', site: s});
  assert.ok(!isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'pin', site: 3}), null, 'no pin past the budget');
  assert.match(html(p, a), /hills-peek-marker/, 'a second landscape that fits the pins');
  assert.equal(nextHint(p, a).text, 'Unpin column 5. The towers beside it fix it.');
  a = move(p, move(p, a, {type: 'pin', site: 4}), {type: 'pin', site: 3});
  assert.ok(isSolved(p, a.board));
  assert.doesNotMatch(html(p, a), /ghost/);
  const ring = byId('hills-11');
  assert.ok(isSolved(ring, move(ring, move(ring, freshAttempt(ring), {type: 'pin', site: 3}), {type: 'pin', site: 0}).board), 'two pins fix the ring');
});

test('hints alone finish every puzzle, in words', () => {
  for (const p of pack.puzzles.filter(q => q.band !== 'playground')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 40 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      assert.match(h.text, /^[A-Z]/, `${p.id}: ${h.text}`);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints finish`);
  }
  const p = byId('hills-04');
  assert.match(html(p, {...freshAttempt(p), hintLevel: 2}), /hills-cell[^"]* top[^"]* hinted/, 'the tower to pin is marked');
});

test('saves: only heights on the board, honest claims and found lists, pins within the budget', () => {
  const fill = byId('hills-02'), every = byId('hills-03'), pin = byId('hills-04');
  assert.ok(validBoard(fill, {h: [0, 1, 3, null, null], claimed: [0, 2], refused: null}));
  assert.equal(validBoard(fill, {h: [0, null, 3, null, null], claimed: null, refused: [0, 2]}), false);
  assert.equal(validBoard(fill, {h: [1, null, 3, null, null], claimed: null, refused: null}), false, 'clues must hold');
  assert.equal(validBoard(fill, {h: [0, 4, 3, null, null], claimed: null, refused: null}), false, 'heights stay on the board');
  assert.ok(validBoard(every, {h: [3, null, null, null, 0], found: ['3,2,1,0,0'], said: null}));
  assert.equal(validBoard(every, {h: [3, null, null, null, 0], found: ['3,2,1,0,1'], said: null}), false);
  assert.equal(validBoard(every, {h: [3, null, null, null, 0], found: ['3,2,1,0,0'], said: 'done'}), false);
  assert.ok(validBoard(pin, {pins: [0, 3]}));
  assert.equal(validBoard(pin, {pins: [0, 1, 2, 3]}), false, 'more pins than the budget');
  assert.equal(validBoard(pin, {pins: [3, 0]}), false);
});

test('the playground: towers, pins and the heights they allow', () => {
  const p = byId('hills-playground');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {sites: 7, ring: false, h: Array(7).fill(null), pins: []});
  assert.equal(nextHint(p, a).type, 'note');
  a = move(p, move(p, a, {type: 'set', site: 0, h: 1}), {type: 'pin', site: 0});
  assert.match(html(p, a), /ghost/);
  assert.match(html(p, a), /aria-label="Unpin column 1"/);
  a = move(p, move(p, a, {type: 'set', site: 2, h: 4}), {type: 'pin', site: 2});
  assert.match(html(p, a), /Two pins are too far apart\./);
  assert.ok(!isSolved(p, a.board));
  a = move(p, a, {type: 'shape', ring: true});
  assert.equal(a.board.ring, true);
  a = move(p, a, {type: 'size', sites: 5});
  assert.deepEqual(a.board.pins, []);
});

test('the satchel shows Gentle hills with its playground and twelve puzzles', async () => {
  const merged = await loadPack();
  const page = libraryView({attempts: {}}, merged.puzzles);
  const at = page.slice(page.indexOf('data-view-key="family-hills"'));
  const section = at.slice(0, at.indexOf('</details>'));
  assert.match(section, /data-id="hills-playground"/);
  for (let i = 1; i <= 12; i++) assert.match(section, new RegExp(`data-id="hills-${String(i).padStart(2, '0')}"`));
});
