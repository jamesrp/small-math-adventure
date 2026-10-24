// Mirror Couriers shortest routes (dist/families/folds/folds.js): exact
// length comparison, folds and best contacts, windows, two walls, the block,
// moves and claims on each kind of board, refusals through Undo, final
// choices (the finish, the stretch, the order of the walls, the shelf),
// hints, saves, rendering, the playground and the satchel group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {compareLengths, bestContact, foldContact, straight, everyAnswer, wallsBest, wallsWinner, blockRoutes, crossesBlock} from '../dist/families/folds/folds.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/folds/folds.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, actions) => actions.reduce((x, action) => x && move(p, x, action), a);
const back = (p, a) => { const next = undo(a); return {...next, board: mechanicFor(p).carry(p, a.board, next.board)}; };
const render = (p, a, hintLevel = 0) => mechanicFor(p).render(p, {...a, hintLevel});
const text = html => html.replace(/<p class="sr-only"[^>]*>.*?<\/p>/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

test('lengths are compared exactly as sums of square roots', () => {
  assert.equal(compareLengths([8], [2, 2]), 0, '√8 = 2√2');
  assert.equal(compareLengths([2, 18, 2], [50]), 0, '√2 + √18 + √2 = √50');
  assert.equal(compareLengths([20, 53], [80, 5]), 1, '√20 + √53 > √80 + √5');
  assert.equal(compareLengths([5, 16, 5], [8, 16, 8]), -1);
  assert.equal(compareLengths([10001], [10000]), 1);
  assert.equal(compareLengths([1e6 + 1, 1e6 - 1], [4e6]), -1, 'a difference near 10^-9');
});

test('the fold: the best contact is where S–F′ crosses, and only its fold is straight', () => {
  const line = {dir: 'h', at: 0, from: 0, to: 11};
  assert.deepEqual(foldContact(line, [1, 4], [10, 2]), [7, 1]);
  assert.deepEqual(bestContact(line, [1, 4], [10, 2]), [7, 1]);
  assert.deepEqual(bestContact(line, [5, 1], [0, 2]), [10, 3], 'a best contact off the grid');
  for (let k = 0; k <= 11; k++) assert.equal(straight(line, [1, 4], [10, 2], k), k === 7);
  const wall = {dir: 'v', at: 0, from: 0, to: 10};
  assert.deepEqual(bestContact(wall, [1, 1], [3, 9]), [3, 1]);
  const windows = {dir: 'h', at: 0, windows: [[0, 3], [9, 12]]};
  assert.deepEqual(bestContact(windows, [1, 4], [10, 2]), [9, 1], 'the nearer window end wins');
  assert.deepEqual(bestContact({dir: 'h', at: 0, windows: [[0, 5], [9, 12]]}, [1, 4], [10, 2]), [5, 1], 'a longer left window wins');
});

test('the starts whose shortest route touches P lie on a ray from P away from B′', () => {
  assert.deepEqual(everyAnswer(byId('folds-05').parameters), [[0, 3], [2, 2], [4, 1]]);
  assert.deepEqual(everyAnswer(byId('folds-09').parameters), [[6, 2], [9, 4]]);
});

test('two walls unfold twice, and the order changes the double image', () => {
  const q = byId('folds-10').parameters;
  assert.deepEqual(wallsBest(q, 'lower'), {first: 'lower', rope: 125, image: [11, -4], at: [[3, 1], [9, 1]]});
  assert.equal(wallsBest(q, 'upper').rope, 149);
  assert.equal(wallsWinner(q), 'lower');
});

test('round the block: a taut route bends at corners, and a symmetric block ties', () => {
  assert.deepEqual(blockRoutes(byId('folds-11').parameters).shortest, [[0, 1]]);
  assert.deepEqual(blockRoutes(byId('folds-12').parameters).shortest.map(r => r.join()).sort(), ['0,1', '3,2']);
  const rect = [2, 2, 6, 5];
  assert.equal(crossesBlock(rect, [0, 3], [8, 3]), true);
  assert.equal(crossesBlock(rect, [2, 2], [6, 2]), false, 'along an edge');
  assert.equal(crossesBlock(rect, [2, 2], [6, 5]), true, 'a diagonal');
  assert.equal(crossesBlock(rect, [0, 0], [2, 2]), false, 'to a corner');
  assert.equal(crossesBlock(rect, [0, 4], [4, 6]), false, 'touching a corner only');
});

test('a route: touch, fold, then claim; a refusal stays through Undo', () => {
  const p = byId('folds-02');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'claim'}), null, 'no claim on a fresh board');
  a = play(p, a, [{type: 'touch', route: 0, at: 5}]);
  assert.equal(move(p, a, {type: 'claim'}), null, 'no claim before Fold');
  assert.doesNotMatch(render(p, a), /Shortest/, 'the claim appears only after Fold');
  a = play(p, a, [{type: 'fold'}]);
  assert.match(render(p, a), /B′/, 'the fold shows B′');
  const refused = move(p, a, {type: 'claim'});
  assert.equal(refused.board.done, false);
  assert.equal(refused.board.told, true);
  assert.match(text(render(p, refused)), /There is a shorter one\./);
  assert.equal(move(p, refused, {type: 'claim'}), null, 'no second claim on the same board');
  const undone = back(p, refused);
  assert.equal(undone.board.refused.length, 1, 'Undo keeps the refusal');
  assert.equal(undone.board.told, false, 'and clears its note');
  assert.equal(move(p, undone, {type: 'claim'}), null);
  const again = play(p, undone, [{type: 'touch', route: 0, at: 6}, {type: 'touch', route: 0, at: 5}]);
  assert.equal(move(p, again, {type: 'claim'}), null, 'the same board stays refused');
  const right = play(p, again, [{type: 'touch', route: 0, at: 7}, {type: 'claim'}]);
  assert.ok(isSolved(p, right.board));
  assert.ok(validBoard(p, right.board));
});

test('beat both: shorter than both dashed routes is enough', () => {
  const p = byId('folds-01');
  const a = play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 4}, {type: 'fold'}, {type: 'claim'}]);
  assert.ok(isSolved(p, a.board));
  assert.ok(isSolved(p, play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 6}, {type: 'fold'}, {type: 'claim'}]).board));
  const b = play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 8}, {type: 'fold'}, {type: 'claim'}]);
  assert.equal(b.board.done, false);
  assert.match(text(render(p, b)), /Not shorter than this one\./);
  assert.match(render(p, b), /fd-guess marked/);
  const tie = play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 7}, {type: 'fold'}, {type: 'claim'}]);
  assert.equal(tie.board.done, false, 'as long as a dashed route is not shorter');
});

test('less rope: a wrong final choice ends the try, and Undo cannot leave it', () => {
  const p = byId('folds-04'), M = mechanicFor(p);
  const made = play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 4}, {type: 'fold'}]);
  // The choice is its own button for each finish, apart from the route
  // chosen for touching (route A to C is the one being edited here).
  const html = render(p, made);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;claim&quot;,&quot;route&quot;:0\}"[^>]*>Less rope: B</);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;claim&quot;,&quot;route&quot;:1\}"[^>]*>Less rope: C</);
  assert.equal(move(p, made, {type: 'claim'}), null, 'a claim names its finish');
  const lost = move(p, made, {type: 'claim', route: 1});
  assert.equal(lost.board.pick, 1);
  assert.match(text(render(p, lost)), /The rope to B is shorter\./);
  assert.equal(M.noUndo(p), true, 'Undo is off');
  assert.deepEqual(back(p, lost).board, lost.board);
  assert.equal(move(p, lost, {type: 'touch', route: 0, at: 6}), null);
  const again = move(p, lost, {type: 'again'});
  assert.deepEqual(again.board, freshAttempt(p).board);
  render(p, again);
  assert.equal(M.noUndo(p), false);
  assert.ok(isSolved(p, move(p, made, {type: 'claim', route: 0}).board));
  // A route that bends is refused, not final.
  const bent = play(p, freshAttempt(p), [{type: 'touch', route: 0, at: 6}, {type: 'touch', route: 1, at: 4}, {type: 'fold'}, {type: 'claim', route: 0}]);
  assert.equal(bent.board.pick, null);
  assert.equal(bent.board.refused.length, 1);
  assert.equal(move(p, bent, {type: 'claim', route: 1}), null, 'both choices stay off on a refused board');
});

test('windows: the other stretch’s best end is a final choice; the rest are refused', () => {
  const p = byId('folds-08'), M = mechanicFor(p);
  const at = k => play(p, freshAttempt(p), [{type: 'touch', route: 0, at: k}, {type: 'fold'}, {type: 'claim'}]);
  const lost = at(3);
  assert.equal(lost.board.lost, true);
  assert.match(text(render(p, lost)), /The other stretch has a shorter route\./);
  assert.match(text(render(p, lost)), /Again/);
  assert.equal(M.noUndo(p), true);
  assert.deepEqual(back(p, lost).board, lost.board);
  for (const k of [0, 2, 10, 12]) {
    const refused = at(k);
    assert.equal(refused.board.lost, false, `${k} is refused, not final`);
    assert.match(text(render(p, refused)), /There is a shorter one\./);
  }
  assert.ok(isSolved(p, at(9).board));
});

test('same rope and same place: move the letter, then make both shortest routes', () => {
  const tie = byId('folds-06');
  const a = play(tie, freshAttempt(tie), [{type: 'move', at: [6, 4]}, {type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 4}, {type: 'fold'}, {type: 'claim'}]);
  assert.ok(isSolved(tie, a.board));
  const other = play(tie, freshAttempt(tie), [{type: 'move', at: [0, 4]}, {type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 2}, {type: 'fold'}, {type: 'claim'}]);
  assert.ok(isSolved(tie, other.board), 'every place that works is accepted');
  const unequal = play(tie, freshAttempt(tie), [{type: 'move', at: [9, 4]}, {type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 5}, {type: 'fold'}, {type: 'claim'}]);
  assert.match(text(render(tie, unequal)), /Not the same rope\./);
  // Both routes must be shortest before the ropes are compared, so a
  // refusal never says whether C is in the right place.
  for (const at of [[5, 4], [6, 4]]) {
    const bent = play(tie, freshAttempt(tie), [{type: 'move', at}, {type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 2}, {type: 'fold'}, {type: 'claim'}]);
    assert.match(text(render(tie, bent)), /There is a shorter one\./, `C at ${at}`);
  }
  assert.equal(move(tie, freshAttempt(tie), {type: 'move', at: [3, 2]}), null, 'not onto A');
  const share = byId('folds-07');
  for (const at of [[8, 1], [11, 4]]) assert.ok(isSolved(share, play(share, freshAttempt(share), [{type: 'move', at}, {type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 7}, {type: 'fold'}, {type: 'claim'}]).board));
  const apart = play(share, freshAttempt(share), [{type: 'touch', route: 0, at: 7}, {type: 'touch', route: 1, at: 3}, {type: 'fold'}, {type: 'claim'}]);
  assert.match(text(render(share, apart)), /They touch at different places\./);
});

test('every start: That’s all judges the whole set once', () => {
  const p = byId('folds-05');
  let a = play(p, freshAttempt(p), [{type: 'start', at: [4, 1]}, {type: 'start', at: [2, 2]}, {type: 'fold'}]);
  const more = move(p, a, {type: 'claim'});
  assert.match(text(render(p, more)), /There is another\./);
  assert.doesNotMatch(text(render(p, more)), /\d/, 'no count');
  const wrong = play(p, a, [{type: 'start', at: [0, 3]}, {type: 'start', at: [5, 1]}, {type: 'claim'}]);
  assert.match(text(render(p, wrong)), /A start misses P\./);
  // Claims audit: the start that misses is not ringed, so starting every
  // point and taking away the ringed start no longer solves.
  assert.doesNotMatch(render(p, wrong), /fd-mark/);
  assert.equal(text(render(p, wrong)), text(render(p, play(p, a, [{type: 'start', at: [0, 3]}, {type: 'start', at: [7, 3]}, {type: 'claim'}]))), 'any wrong start gets the same board text');
  a = play(p, a, [{type: 'start', at: [0, 3]}, {type: 'claim'}]);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, freshAttempt(p), {type: 'start', at: [10, 2]}), null, 'not on B');
  assert.equal(move(p, freshAttempt(p), {type: 'start', at: [3, -1]}), null, 'not across the river');
});

test('two walls: Shortest after both orders are folded; the order is a final choice', () => {
  const p = byId('folds-10'), M = mechanicFor(p);
  // Taking the first touch away and touching it again swaps the order.
  const swap = (a, wall, at) => play(p, a, [{type: 'touch', wall, at}, {type: 'touch', wall, at}]);
  let a = play(p, freshAttempt(p), [{type: 'touch', wall: 'upper', at: 4}, {type: 'touch', wall: 'lower', at: 8}, {type: 'fold'}]);
  assert.deepEqual(a.board.seen, ['upper']);
  assert.equal(move(p, a, {type: 'claim'}), null, 'Shortest is off until both orders are folded');
  assert.match(text(render(p, a)), /Fold a route in the other order too\./);
  a = swap(a, 'upper', 4);
  assert.deepEqual(a.board.seen, ['upper', 'lower']);
  assert.deepEqual(back(p, a).board.seen, ['upper', 'lower'], 'Undo keeps the orders folded');
  assert.doesNotMatch(text(render(p, a)), /other order/);
  const wrongOrder = move(p, swap(a, 'lower', 8), {type: 'claim'});
  assert.equal(wrongOrder.board.lost, true);
  assert.match(text(render(p, wrongOrder)), /The other order is shorter\./);
  assert.equal(M.noUndo(p), true);
  assert.deepEqual(move(p, wrongOrder, {type: 'again'}).board.seen, [], 'Again starts a new try');
  render(p, freshAttempt(p));
  let bent = play(p, freshAttempt(p), [{type: 'touch', wall: 'lower', at: 3}, {type: 'touch', wall: 'upper', at: 8}, {type: 'fold'}]);
  bent = move(p, swap(swap(bent, 'lower', 3), 'upper', 8), {type: 'claim'});
  assert.equal(bent.board.lost, false);
  assert.match(text(render(p, bent)), /There is a shorter one\./);
  const moved = play(p, bent, [{type: 'touch', wall: 'upper', at: 9}, {type: 'claim'}]);
  assert.ok(isSolved(p, moved.board), 'a second touch on the same wall moves it');
  const removed = play(p, freshAttempt(p), [{type: 'touch', wall: 'lower', at: 3}, {type: 'touch', wall: 'lower', at: 3}]);
  assert.deepEqual(removed.board.touches, [], 'tapping the same point takes the touch away');
});

test('round the block: keep, drop, and That’s all is a final choice', () => {
  const p = byId('folds-12'), M = mechanicFor(p);
  let a = play(p, freshAttempt(p), [{type: 'corner', i: 0}, {type: 'corner', i: 1}, {type: 'keep'}, {type: 'fold'}]);
  assert.equal(move(p, a, {type: 'keep'}), null, 'no keeping the same route twice');
  const more = move(p, a, {type: 'claim'});
  assert.equal(more.board.lost, true, 'a missing route ends the try');
  const html = render(p, more);
  assert.match(text(html), /There is another\./);
  assert.match(text(html), /Again/);
  assert.doesNotMatch(html, /fd-mark|marked|data-move="\{&quot;type&quot;:&quot;drop/, 'no verdict per kept route, and the shelf is still');
  assert.equal(M.noUndo(p), true);
  assert.equal(move(p, more, {type: 'drop', i: 0}), null);
  a = play(p, a, [{type: 'corner', i: 1}, {type: 'corner', i: 0}, {type: 'corner', i: 3}, {type: 'corner', i: 2}, {type: 'keep'}, {type: 'claim'}]);
  assert.ok(isSolved(p, a.board));
  const long = play(p, freshAttempt(p), [{type: 'corner', i: 0}, {type: 'corner', i: 1}, {type: 'corner', i: 2}, {type: 'keep'}, {type: 'fold'}, {type: 'claim'}]);
  assert.equal(long.board.lost, true);
  assert.match(text(render(p, long)), /A kept route isn’t shortest\./);
  const dropped = play(p, freshAttempt(p), [{type: 'corner', i: 0}, {type: 'corner', i: 1}, {type: 'keep'}, {type: 'drop', i: 0}]);
  assert.deepEqual(dropped.board.shelf, []);
  render(p, freshAttempt(p));
});

test('hints solve every puzzle from a fresh board, quickly, and never start with a claim', () => {
  for (const p of pack.puzzles.filter(p => p.band === 'all')) {
    let a = freshAttempt(p), steps = 0;
    for (; !isSolved(p, a.board) && steps < 40; steps++) {
      const t = process.cpuUsage(), h = nextHint(p, a), u = process.cpuUsage(t);
      assert.ok((u.user + u.system) / 1000 < 100, `${p.id}: a quick hint (CPU time)`);
      if (steps === 0) assert.notEqual(h.action.type, 'claim', `${p.id}: the first hinted move is not a claim`);
      a = move(p, a, h.action);
      assert.ok(a, `${p.id}: legal hint`);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: solved by hints`);
  }
});

test('saves: forged boards are refused', () => {
  const p = byId('folds-02'), fresh = freshAttempt(p).board;
  for (const forged of [{...fresh, done: true}, {...fresh, contacts: [7], done: true}, {...fresh, told: true}, {...fresh, contacts: [99]}, {...fresh, pick: 0}, {...fresh, lost: true}, {...fresh, contacts: [7], folded: true, lost: true}, {...fresh, extra: 1}])
    assert.equal(validBoard(p, forged), false, JSON.stringify(forged));
  assert.equal(validBoard(p, {...fresh, contacts: [7], folded: true, done: true}), true);
  const w = byId('folds-10');
  assert.equal(validBoard(w, {...freshAttempt(w).board, lost: true}), false, 'a lost try needs a final claim');
  const right = {...freshAttempt(w).board, touches: [{wall: 'lower', at: 3}, {wall: 'upper', at: 9}], folded: true, done: true};
  assert.equal(validBoard(w, {...right, seen: ['lower', 'upper']}), true);
  assert.equal(validBoard(w, {...right, seen: ['lower']}), false, 'a claim needs both orders folded');
  const less = byId('folds-04'), made = {...freshAttempt(less).board, contacts: [7, 4], folded: true};
  assert.equal(validBoard(less, {...made, done: true, pick: 0}), true);
  assert.equal(validBoard(less, {...made, lost: true, pick: 0}), false, 'a right choice is not lost');
  assert.equal(validBoard(less, {...made, lost: true, pick: 1}), true);
});

test('the board: no fold, no length, until asked', () => {
  for (const p of pack.puzzles) {
    const html = render(p, freshAttempt(p));
    assert.match(html, /data-mechanic-wire="folds"/);
    assert.doesNotMatch(html, /′/, `${p.id}: no image before Fold`);
    assert.doesNotMatch(text(html), /√|\d/, `${p.id}: no numbers on the board`);
  }
});

test('the playground: C is B’s mirror image, and both routes move together', () => {
  const p = byId('folds-playground'), M = mechanicFor(p);
  assert.equal(M.noHint(p), true);
  let a = freshAttempt(p);
  assert.match(render(p, a), />C</);
  a = play(p, a, [{type: 'touch', at: 7}, {type: 'move', dot: 'B', at: [10, 1]}, {type: 'fold'}]);
  assert.equal(a.board.at, 7);
  assert.deepEqual(a.board.dots.B, [10, 1]);
  assert.equal(move(p, a, {type: 'move', dot: 'A', at: [10, 1]}), null, 'not onto B');
  assert.equal(move(p, a, {type: 'move', dot: 'A', at: [4, -1]}), null, 'not across the river');
  assert.ok(!isSolved(p, a.board));
});

test('the group sits in Mirror Couriers below its levels, with the playground button', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-billiard"'));
  const block = family.slice(0, family.indexOf('</details>'));
  assert.ok(block.indexOf('<h2>Hard</h2>') < block.indexOf('<h2>Shortest routes</h2>'));
  assert.equal((block.match(/data-id="folds-\d\d"/g) || []).length, 12);
  assert.match(block, /data-id="folds-playground"/);
  assert.match(block, /aria-label="Mirror Couriers, Shortest routes, puzzle 1"/);
});
