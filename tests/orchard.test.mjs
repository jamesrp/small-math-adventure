// Mirror Couriers hidden orchard (dist/families/orchard/orchard.js): the
// points on a beam's line, where beams stop, cutting and planting within a
// budget, moving the courier, claims, hints, saves, rendering and the satchel
// group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {between, sight, plan} from '../dist/families/orchard/orchard.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/orchard/orchard.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const taps = (p, a, pts) => pts.reduce((x, at) => x && move(p, x, {type: 'tap', at}), a);

test('the points strictly between two points on a line, nearest first', () => {
  const q = {size: 6};
  assert.deepEqual(between(q, [0, 0], [4, 2]), [[2, 1]]);
  assert.deepEqual(between(q, [0, 0], [6, 3]), [[2, 1], [4, 2]]);
  assert.deepEqual(between(q, [0, 0], [5, 3]), []);
  assert.deepEqual(between(q, [0, 0], [0, 4]), [[0, 1], [0, 2], [0, 3]]);
  assert.deepEqual(between(q, [5, 5], [1, 1]), [[4, 4], [3, 3], [2, 2]], 'from any spot, in any direction');
  assert.deepEqual(between(q, [3, 1], [1, 5]), [[2, 3]]);
});

test('a beam stops at the first tree or lantern on its line', () => {
  const q = byId('orchard-02').parameters;
  const [corner, side] = sight(q, {cut: []});
  assert.deepEqual(corner.stop, [1, 1]);
  assert.equal(corner.lit, false);
  assert.equal(side.lit, true, '4 and 3 share no factor');
  assert.deepEqual(sight(q, {cut: [[1, 1]]})[0].stop, [2, 2], 'after a cut the beam goes on to the next tree');
  const lanterns = byId('orchard-04').parameters;
  assert.deepEqual(sight(lanterns, {trees: []}).map(s => s.lit), [true, false, false], 'a lantern blocks the lanterns behind it');
  assert.deepEqual(sight(lanterns, {trees: []})[2].stop, [2, 2]);
});

test('cutting: tap a tree to cut it and again to put it back, within the budget', () => {
  const p = byId('orchard-02');
  let a = freshAttempt(p);
  a = taps(p, a, [[1, 1], [2, 2]]);
  assert.deepEqual(a.board.cut, [[1, 1], [2, 2]]);
  assert.ok(!isSolved(p, a.board));
  assert.deepEqual(taps(p, a, [[1, 1]]).board.cut, [[2, 2]], 'tap a cut tree to put it back');
  const wasted = taps(p, a, [[0, 1]]);
  assert.equal(move(p, wasted, {type: 'tap', at: [3, 3]}), null, 'no fourth cut');
  assert.equal(move(p, a, {type: 'tap', at: [4, 4]}), null, 'lanterns are not cut');
  assert.equal(move(p, a, {type: 'tap', at: [0, 0]}), null, 'nor the courier');
  a = taps(p, a, [[3, 3]]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'tap', at: [3, 3]}), null, 'nothing after a solve');
  assert.deepEqual(undo(taps(p, freshAttempt(p), [[1, 1]])).board, freshAttempt(p).board);
});

test('a goal of some lanterns: the cheapest four need three cuts', () => {
  const p = byId('orchard-09');
  assert.deepEqual(plan(p.parameters).cut, [[1, 3], [3, 1], [3, 2]]);
  assert.ok(isSolved(p, taps(p, freshAttempt(p), [[3, 2], [1, 3], [3, 1]]).board));
  assert.ok(!isSolved(p, taps(p, freshAttempt(p), [[2, 1], [4, 2], [3, 2]]).board), 'lighting (6, 3) uses two cuts for one lantern');
});

test('planting: a tree hides a lantern only exactly on its line', () => {
  const p = byId('orchard-03');
  for (const near of [[1, 1], [2, 3], [1, 3], [0, 2]]) assert.ok(!isSolved(p, taps(p, freshAttempt(p), [near]).board), `a tree at ${near} is beside the line`);
  assert.ok(isSolved(p, taps(p, freshAttempt(p), [[1, 2]]).board));
  assert.equal(move(p, freshAttempt(p), {type: 'tap', at: [2, 4]}), null, 'no planting on a lantern');
  const one = byId('orchard-04');
  assert.ok(isSolved(one, taps(one, freshAttempt(one), [[1, 1]]).board), 'one tree hides the whole line');
  const used = taps(one, freshAttempt(one), [[0, 1]]);
  assert.equal(move(one, used, {type: 'tap', at: [1, 1]}), null, 'no second tree');
  assert.deepEqual(taps(one, used, [[0, 1]]).board.trees, [], 'tap a tree to take it away');
});

test('standing: the courier moves to a tree, and visibility goes by the steps to each lantern', () => {
  const p = byId('orchard-08');
  let a = freshAttempt(p);
  assert.deepEqual(sight(p.parameters, a.board).map(s => s.lit), [false, false]);
  a = taps(p, a, [[2, 0]]);
  assert.deepEqual(a.board.at, [2, 0]);
  assert.deepEqual(sight(p.parameters, a.board).map(s => s.lit), [false, true], 'from (2, 0): (2, 4) shares 2, (4, 3) does not');
  assert.equal(move(p, a, {type: 'tap', at: [2, 0]}), null, 'already there');
  assert.equal(move(p, a, {type: 'tap', at: [4, 4]}), null, 'not on a lantern');
  assert.ok(move(p, a, {type: 'tap', at: [0, 0]}), 'the corner is a tree once the courier leaves');
  assert.ok(isSolved(p, taps(p, a, [[3, 1]]).board));
});

test('claims: after a move, checked; a wrong claim is refused until the next move', () => {
  const yes = byId('orchard-06'), no = byId('orchard-07');
  assert.equal(move(no, freshAttempt(no), {type: 'claim'}), null, 'a move first');
  const right = move(no, taps(no, freshAttempt(no), [[3, 2]]), {type: 'claim'});
  assert.ok(isSolved(no, right.board));
  assert.match(mechanicFor(no).render(no, right), /Right: some lantern has no point on its line/);
  const wrong = move(yes, taps(yes, freshAttempt(yes), [[3, 2]]), {type: 'claim'});
  assert.ok(!isSolved(yes, wrong.board));
  assert.equal(wrong.board.wrong, true);
  assert.match(mechanicFor(yes).render(yes, wrong), /Every lantern can be hidden/);
  assert.equal(move(yes, wrong, {type: 'claim'}), null);
  assert.equal(taps(yes, wrong, [[2, 1]]).board.wrong, false);
  assert.ok(isSolved(yes, taps(yes, wrong, [[2, 1], [2, 3]]).board));
  const four = byId('orchard-12');
  assert.ok(isSolved(four, move(four, taps(four, freshAttempt(four), [[5, 5]]), {type: 'claim'}).board), 'four even–odd patterns: no spot');
  const three = byId('orchard-11');
  assert.equal(move(three, taps(three, freshAttempt(three), [[5, 5]]), {type: 'claim'}).board.wrong, true);
  assert.ok(isSolved(three, taps(three, freshAttempt(three), [[2, 1]]).board));
});

test('hints name the next tap; decide puzzles show the authored hints', () => {
  const p = byId('orchard-01'), h = nextHint(p, freshAttempt(p));
  assert.equal(h.type, 'move');
  assert.deepEqual(h.action, {type: 'tap', at: [2, 1]});
  const wasted = taps(p, freshAttempt(p), [[0, 1]]);
  assert.deepEqual(nextHint(p, wasted).action, {type: 'tap', at: [0, 1]}, 'put back a useless cut first');
  const plant = byId('orchard-04');
  assert.deepEqual(nextHint(plant, taps(plant, freshAttempt(plant), [[3, 2]])).action, {type: 'tap', at: [3, 2]}, 'take away a tree that hides nothing');
  for (const id of ['orchard-06', 'orchard-07', 'orchard-11', 'orchard-12']) assert.equal(nextHint(byId(id), freshAttempt(byId(id))).type, 'note');
  const stand = byId('orchard-10');
  assert.ok(isSolved(stand, move(stand, freshAttempt(stand), nextHint(stand, freshAttempt(stand)).action).board));
});

test('saves: only sorted, in-budget lists of the right points, and honest claims', () => {
  const p = byId('orchard-05'), fresh = freshAttempt(p).board;
  assert.ok(validBoard(p, {cut: [[0, 1], [2, 2]]}));
  for (const forged of [{cut: [[2, 2], [0, 1]]}, {cut: [[0, 1], [0, 1]]}, {cut: [[0, 3]]}, {cut: [[0, 0]]}, {cut: [[9, 9]]}, {...fresh, extra: true}, {trees: []}, {at: [1, 1]}]) assert.equal(validBoard(p, forged), false, JSON.stringify(forged));
  const no = byId('orchard-07');
  assert.ok(validBoard(no, {trees: [[3, 2]], moved: true, claimed: true, wrong: false}));
  assert.equal(validBoard(no, {trees: [], moved: false, claimed: true, wrong: false}), false, 'a claim needs a move');
  assert.equal(validBoard(no, {trees: [], moved: true, claimed: false, wrong: true}), false, 'no refusal when the claim is true');
  const yes = byId('orchard-06');
  assert.equal(validBoard(yes, {trees: [], moved: true, claimed: true, wrong: false}), false, 'no claim when it is false');
});

test('rendering: points, beams, beads and the claim button', () => {
  const p = byId('orchard-02'), html = mechanicFor(p).render(p, freshAttempt(p));
  assert.equal((html.match(/class="orchard-pt /g) || []).length, 25);
  assert.equal((html.match(/orchard-pt lantern/g) || []).length, 2);
  assert.match(html, /orchard-pt courier/);
  assert.equal((html.match(/class="orchard-beam[ "]/g) || []).length, 2);
  assert.equal((html.match(/class="orchard-thread"/g) || []).length, 1, 'a dashed thread runs on to the hidden lantern');
  assert.equal((html.match(/<i class="left">/g) || []).length, 3);
  assert.match(html, /aria-label="Tree, tap to cut, 1 across, 1 up"/);
  const hinted = mechanicFor(p).render(p, {...freshAttempt(p), hintLevel: 2});
  assert.match(hinted, /orchard-pt tree hinted/);
  const claim = byId('orchard-11'), fresh = mechanicFor(claim).render(claim, freshAttempt(claim));
  assert.match(fresh, /orchard-claim"[^>]*disabled>No spot sees them all/);
  assert.match(mechanicFor(claim).render(claim, taps(claim, freshAttempt(claim), [[5, 5]])), /orchard-claim"[^>]*>No spot sees them all/);
  assert.doesNotMatch(mechanicFor(claim).render(claim, freshAttempt(claim)), /orchard-budget/, 'no beads when standing');
});

test('the puzzles join Mirror Couriers as its Sight lines group', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-billiard"'));
  const block = family.slice(0, family.indexOf('</details>'));
  assert.ok(block.indexOf('<h2>Hard</h2>') < block.indexOf('<h2>Sight lines</h2>'));
  assert.equal((block.match(/data-id="orchard-/g) || []).length, 12);
  assert.match(block, /aria-label="Mirror Couriers, Sight lines, puzzle 1"/);
});
