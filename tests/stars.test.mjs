// Clockwork Gates stars (dist/families/stars/stars.js): pieces of a hop,
// drawing by taps, starting again, choosing the hop by the first line, rings,
// matching a picture, one-check rounds, hints, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {pieces, replay} from '../dist/families/stars/stars.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/stars/stars.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const taps = (p, a, dots) => dots.reduce((x, dot) => x && move(p, x, {type: 'tap', dot}), a);

test('hop k on n dots splits into gcd(n, k) pieces of equal size', () => {
  assert.deepEqual(pieces(5, 2), [[0, 2, 4, 1, 3]]);
  assert.deepEqual(pieces(6, 2), [[0, 2, 4], [1, 3, 5]]);
  assert.deepEqual(pieces(8, 4).map(x => x.length), [2, 2, 2, 2]);
  assert.equal(pieces(12, 9).length, 3);
  assert.equal(pieces(13, 5).length, 1);
});

test('drawing a fixed hop: tap where the hop lands, and start again at a dot with no line', () => {
  const p = byId('stars-02');
  let a = taps(p, freshAttempt(p), [0, 2, 4]);
  assert.equal(move(p, a, {type: 'tap', dot: 1}), null, 'the hop from 4 lands on 0');
  a = move(p, a, {type: 'tap', dot: 0});
  assert.equal(replay(p.parameters, a.board).pen, null, 'the line came back, so the pen lifts');
  assert.equal(move(p, a, {type: 'tap', dot: 2}), null, 'a new start needs a dot with no line');
  assert.ok(!isSolved(p, a.board));
  a = taps(p, a, [3, 5, 1, 3]);
  assert.ok(isSolved(p, a.board));
  assert.equal(replay(p.parameters, a.board).starts.length, 2);
  assert.equal(move(p, a, {type: 'tap', dot: 0}), null, 'nothing after a solve');
});

test('the first line sets the hop, and Again clears it', () => {
  const p = byId('stars-03');
  let a = taps(p, freshAttempt(p), [0, 3]);
  assert.equal(replay(p.parameters, a.board).hop, 3);
  a = taps(p, a, [6, 1, 4, 7, 2, 5, 0]);
  assert.ok(replay(p.parameters, a.board).complete);
  assert.ok(!isSolved(p, a.board), 'hop 3 on 8 dots is one piece, not two');
  assert.equal(nextHint(p, a).action.type, 'again');
  assert.match(nextHint(p, a).text, /Hop 3 on 8 dots makes 1 piece/);
  a = move(p, a, {type: 'again'});
  assert.deepEqual(a.board.taps, []);
  a = taps(p, a, [0, 6, 4, 2, 0, 1, 7, 5, 3, 1]);
  assert.ok(isSolved(p, a.board), 'hop 6 makes two squares, drawn backward');
  assert.equal(move(p, freshAttempt(p), {type: 'again'}), null);
  const one = taps(p, freshAttempt(p), [0]);
  assert.equal(move(p, one, {type: 'tap', dot: 0}), null, 'no hop of 0');
  assert.deepEqual(undo(one).board, freshAttempt(p).board);
});

test('rings: choosing a ring clears the drawing, and only the right rings solve', () => {
  const p = byId('stars-06');
  assert.equal(move(p, freshAttempt(p), {type: 'tap', dot: 0}), null, 'choose a ring first');
  let a = move(p, freshAttempt(p), {type: 'ring', ring: 12});
  a = taps(p, a, [0, 6, 0]);
  assert.equal(nextHint(p, a).action.type, 'ring', 'hop 6 on 12 makes 6 pieces');
  a = move(p, a, {type: 'ring', ring: 9});
  assert.deepEqual(a.board, {ring: 9, taps: []});
  a = taps(p, a, [0, 6, 3, 0, 1, 7, 4, 1, 2, 8, 5, 2]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, freshAttempt(p), {type: 'ring', ring: 17}), null, 'only offered rings');
});

test('match: the same picture drawn forward or backward', () => {
  const p = byId('stars-07');
  let a = move(p, freshAttempt(p), {type: 'ring', ring: 8});
  a = taps(p, a, [0, 5, 2, 7, 4, 1, 6, 3, 0]);
  assert.ok(isSolved(p, a.board), 'hop 5 draws the same star as hop 3');
  let b = move(p, freshAttempt(p), {type: 'ring', ring: 8});
  b = taps(p, b, [0, 1, 2, 3, 4, 5, 6, 7, 0]);
  assert.ok(!isSolved(p, b.board), 'the octagon is not the star');
  const html = mechanicFor(p).render(p, freshAttempt(p));
  assert.match(html, /class="star-goal"/);
  assert.match(html, /aria-label="Ring of 12 dots"/);
});

test('hints alone finish every drawing puzzle that is not a claim', () => {
  for (const p of pack.puzzles.filter(p => p.parameters.mode !== 'every' && !p.parameters.decide)) {
    let a = freshAttempt(p);
    for (let i = 0; i < 100 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('claims: "no hop makes 3" is refused on 12 dots and accepted on 16, after one finished drawing', () => {
  const yes = byId('stars-04'), no = byId('stars-05');
  assert.equal(nextHint(no, freshAttempt(no)).type, 'note');
  assert.equal(move(no, freshAttempt(no), {type: 'claim'}), null, 'draw one first');
  // Hop 4 on 16 dots: four squares.
  let a = taps(no, freshAttempt(no), [0, 4, 8, 12, 0, 1, 5, 9, 13, 1, 2, 6, 10, 14, 2, 3, 7, 11, 15, 3]);
  assert.equal(a.board.tried, 1);
  assert.ok(!isSolved(no, a.board));
  a = move(no, a, {type: 'claim'});
  assert.ok(isSolved(no, a.board));
  assert.match(mechanicFor(no).render(no, a), /Right: no hop makes 3 pieces on 16 dots/);
  // Hop 6 on 12 dots makes 6 pieces; then the claim is refused, and hop 3 still solves.
  let b = taps(yes, freshAttempt(yes), [0, 6, 0, 1, 7, 1, 2, 8, 2, 3, 9, 3, 4, 10, 4, 5, 11, 5]);
  b = move(yes, b, {type: 'claim'});
  assert.equal(b.board.wrong, true);
  assert.match(mechanicFor(yes).render(yes, b), /Some hop does make 3 pieces/);
  b = taps(yes, move(yes, b, {type: 'again'}), [0, 3, 6, 9, 0, 1, 4, 7, 10, 1, 2, 5, 8, 11, 2]);
  assert.ok(isSolved(yes, b.board));
  assert.equal(validBoard(yes, {taps: [], tried: 1, claimed: true, wrong: false}), false, 'a false claim cannot be saved');
});

test('one-check rounds: mark, Check once, then Next after a miss', () => {
  const p = byId('stars-11');
  assert.ok(mechanicFor(p).noUndo(p));
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).type, 'note');
  for (const value of [1, 7, 11, 13, 17, 19, 23]) a = move(p, a, {type: 'mark', value});
  a = move(p, a, {type: 'check'});
  assert.ok(!isSolved(p, a.board), '29 is missing');
  const html = mechanicFor(p).render(p, a);
  assert.match(html, /aria-label="Hop 29, one piece"/);
  assert.match(html, /class="secondary star-mark answer miss expansion-action"/);
  a = move(p, a, {type: 'next'});
  assert.deepEqual(a.board, {round: 1, marked: [], checked: false});
  for (const value of [1, 5, 7, 11, 13, 17, 19, 23]) a = move(p, a, {type: 'mark', value});
  assert.ok(isSolved(p, move(p, a, {type: 'check'}).board), 'every hop that shares no factor with 24');
  const r = byId('stars-12');
  let b = freshAttempt(r);
  for (const value of [5, 7, 11, 13, 17, 19]) b = move(r, b, {type: 'mark', value});
  assert.ok(isSolved(r, move(r, b, {type: 'check'}).board), 'the primes from 4 to 20');
});

test('saves are replayed: forged taps and rings are rejected', () => {
  const p = byId('stars-01');
  assert.ok(validBoard(p, {taps: [0, 2, 4]}));
  assert.equal(validBoard(p, {taps: [0, 3]}), false, 'hop 2 only');
  assert.equal(validBoard(p, {taps: [0, 2], ring: 5}), false, 'no ring here');
  const m = byId('stars-09');
  assert.ok(validBoard(m, {ring: 10, taps: [0, 4]}));
  assert.equal(validBoard(m, {ring: null, taps: [0]}), false, 'no tap without a ring');
  assert.equal(validBoard(m, {ring: 4, taps: []}), false, 'only offered rings');
  assert.equal(validBoard(byId('stars-12'), {round: 0, marked: [4], checked: false}), true);
  assert.equal(validBoard(byId('stars-12'), {round: 0, marked: [3], checked: false}), false, 'outside the range');
});

test('the ring shows the pen, lined dots and the pieces so far', () => {
  const p = byId('stars-04');
  const a = taps(p, freshAttempt(p), [0, 3, 6, 9, 0, 1]);
  const html = mechanicFor(p).render(p, a);
  assert.equal([...html.matchAll(/class="star-dot/g)].length, 12);
  assert.match(html, /class="star-dot pen"[^>]*data-star-move="\{&quot;type&quot;:&quot;tap&quot;,&quot;dot&quot;:1\}"/);
  assert.equal([...html.matchAll(/class="star-line c0"/g)].length, 4);
  assert.match(html, /aria-label="2 pieces of 3"/);
  assert.match(html, /Hop 3/);
});

test('the puzzles appear as a Stars group in Clockwork Gates', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const clock = html.slice(html.indexOf('data-view-key="family-clock"'));
  const family = clock.slice(0, clock.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Stars</h2>'));
  assert.match(family, /aria-label="Clockwork Gates, Stars, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="stars-/g)].length, 12);
});
