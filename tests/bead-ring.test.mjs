// The shared bead ring (dist/bead-ring.js): turns, flips, rings up to
// symmetry, the copy and the drawing. The families that use it test their rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  turn, flip, motions, apply, hiddenMotions, matchingFlips, lopsided, period, necklace, bracelet, ringKey, motionBetween,
  clashes, windows, allWords, ringClasses, HOME, copyTarget, copyAtHome, copyMotion, copyWord, turnCopy, flipCopy,
  ringBoard, miniRing, beadStrip, point, complete, validWord, tally, coloursUsed
} from '../dist/bead-ring.js';

test('a turn moves each bead k places clockwise; a flip k sends bead i to k − i', () => {
  assert.equal(turn('ABCD', 1), 'DABC');
  assert.equal(turn('ABCD', -1), 'BCDA');
  assert.equal(turn('ABCD', 4), 'ABCD');
  assert.equal(flip('ABCD', 0), 'ADCB', 'the mirror line through bead 0');
  assert.equal(flip('ABCD', 1), 'BADC', 'the mirror line between beads 0 and 1');
  assert.equal(motions(5).length, 9, 'four turns and five flips');
  assert.ok(motions(6).every(m => apply(apply('AABABB', m), m.kind === 'flip' ? m : {kind: 'turn', k: -m.k}) === 'AABABB'), 'every motion can be undone');
});

test('period, hidden motions and lopsided rings', () => {
  assert.equal(period('ABAB'), 2);
  assert.equal(period('AAAA'), 1);
  assert.equal(period('AABAAB'), 3);
  assert.equal(period('AAABB'), 5);
  assert.deepEqual(hiddenMotions('ABAB').map(m => `${m.kind}${m.k}`), ['turn2', 'flip0', 'flip2'], 'mirror lines through beads, not between them');
  assert.equal(matchingFlips('ABABAB'), 3);
  assert.equal(matchingFlips('AABAAB'), 2);
  assert.equal(lopsided('AABABB'), true);
  assert.equal(lopsided('AABB'), false);
  assert.equal(lopsided('ABCC'), true);
  assert.equal(lopsided('AAB.BB'), false, 'an unfinished ring is not lopsided');
});

test('rings up to turns, and up to turns and flips', () => {
  assert.equal(necklace('BAA'), 'AAB');
  assert.equal(necklace('ACB'), 'ACB');
  assert.notEqual(necklace('ABC'), necklace('ACB'), 'mirror images differ when the ring stays face up');
  assert.equal(bracelet('ACB'), 'ABC');
  assert.equal(ringKey('AABBAB', true), ringKey('AABABB', true));
  assert.deepEqual(motionBetween('AAB', 'ABA'), {kind: 'turn', k: 2});
  assert.equal(motionBetween('ABC', 'ACB'), null);
  assert.deepEqual(motionBetween('ABC', 'ACB', true), {kind: 'flip', k: 0});
  assert.equal(ringClasses(5, 2).length, 8);
  assert.equal(ringClasses(3, 3).length, 11);
  assert.equal(ringClasses(6, 2, lopsided, true).length, 1);
  assert.equal(allWords(3, 2).length, 8);
});

test('neighbours, windows and counts', () => {
  assert.deepEqual(clashes('AABAA'), [0, 3, 4], 'the closing pair counts');
  assert.deepEqual(clashes('A.A.'), []);
  assert.deepEqual(windows('AABB', 2), ['AA', 'AB', 'BB', 'BA']);
  assert.deepEqual(tally('ABBC.'), {A: 1, B: 2, C: 1});
  assert.equal(coloursUsed('AB.B'), 2);
  assert.equal(complete('AB.'), false);
  assert.equal(validWord('AB.', 3, 2), true);
  assert.equal(validWord('ABC', 3, 2), false);
});

test('the copy: turning, flipping and what it shows', () => {
  const n = 4;
  assert.ok(copyAtHome(n, HOME));
  const once = turnCopy(HOME);
  assert.equal(copyTarget(n, once, 0), 1);
  assert.deepEqual(copyMotion(n, once), {kind: 'turn', k: 1});
  assert.equal(copyWord('ABCD', once), turn('ABCD', 1));
  const flipped = flipCopy(HOME);
  assert.deepEqual(copyMotion(n, flipped), {kind: 'flip', k: 0});
  assert.equal(copyWord('ABCD', flipped), flip('ABCD', 0));
  // After a flip, a clockwise turn of the copy is a flip with another mirror line.
  const both = turnCopy(flipped);
  assert.deepEqual(copyMotion(n, both), {kind: 'flip', k: 1});
  assert.equal(copyWord('ABCD', both), flip('ABCD', 1));
  assert.ok(copyAtHome(n, turnCopy(HOME, 4)), 'four turns of four beads is home');
  assert.ok(copyAtHome(n, flipCopy(flipped)), 'two flips is home');
  // Every position of the copy is one of the 2n motions.
  const seen = new Set();
  let pos = HOME;
  for (let f = 0; f < 2; f++) { for (let t = 0; t < n; t++) { seen.add(JSON.stringify(copyMotion(n, pos))); pos = turnCopy(pos); } pos = flipCopy(pos); }
  assert.equal(seen.size, 2 * n);
});

test('drawing: beads at equal angles, controls, the copy and its matches', () => {
  const [x0, y0] = point(4, 0), [x1, y1] = point(4, 1);
  assert.ok(Math.abs(x0 - 50) < 1e-9 && y0 < 50, 'bead 0 at the top');
  assert.ok(x1 > 50 && Math.abs(y1 - 50) < 1e-9, 'bead 1 to the right: clockwise');
  const html = ringBoard('AB.B', {bead: i => i === 2 ? {move: {type: 'paint', bead: i}} : {}, copy: turnCopy(HOME, 2)});
  assert.equal((html.match(/<button/g) || []).length, 1, 'only beads with a move are buttons');
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;paint&quot;,&quot;bead&quot;:2\}"/);
  assert.match(html, /class="br-copy"/);
  assert.match(html, /br-bead br-c-B match/, 'the copy of B lands on B two places on');
  assert.doesNotMatch(html, /br-all/);
  assert.match(ringBoard('ABAB', {copy: turnCopy(HOME, 2)}), /br-ring br-all/, 'a full match marks the ring');
  assert.match(ringBoard('ABAB', {copy: HOME}), /br-copy home/, 'a copy at home is hidden');
  assert.doesNotMatch(ringBoard('ABAB'), /br-copy/);
  assert.match(miniRing('AAB'), /role="img" aria-label="green, green, gold"/);
  assert.equal((beadStrip('ABA').match(/<i /g) || []).length, 3);
});
