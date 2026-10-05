// Rhombus gardens: placing and lifting rhombi, the two-sided pack solve with
// dots, listing every filling, flips and their budget, the playground,
// hints, saves and rendering. The counts are checked against independent
// methods in scripts/validate-rhombus.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, restart, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {gridOf} from '../dist/tri-grid.js';
import {maxPacking, minCover, openSpot, covers, flipAt, flipPoints, flipRoute, flipDistances, cornerTiling, stackTiling, tilingKey, pieceKey} from '../dist/families/rhombus/lozenge.js';
import {hexagon, classify, faceOf, gridFor} from '../dist/families/rhombus/rhombus.js';
import {validateRhombus} from '../scripts/validate-rhombus.mjs';
import {loadPack} from '../scripts/packs.mjs';

const rhombus = JSON.parse(await readFile(new URL('../dist/families/rhombus/rhombus.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => rhombus.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const place = cells => ({type: 'place', cells});
const long = byId('rhombus-01'), mountain = byId('rhombus-02'), three = byId('rhombus-03'), bowTie = byId('rhombus-06');
const firstFlips = byId('rhombus-08'), pinwheel = byId('rhombus-10'), twenty = byId('rhombus-11'), wall = byId('rhombus-12'), ground = byId('rhombus-playground');

test('the pack validates: counts match independent methods, hints solve, illegal moves fail', async () => {
  const report = await validateRhombus();
  assert.equal(report.rhombusPuzzles, 12);
});

test('most rhombi equal fewest dots, and the dots stop every rhombus', () => {
  for (const p of rhombus.puzzles.filter(q => q.parameters.mode === 'pack')) {
    const g = gridFor(p), best = maxPacking(g);
    for (const side of [0, 1]) {
      const dots = minCover(g, new Set(), side);
      assert.equal(dots.length, best.length, `${p.id} side ${side}`);
      assert.equal(openSpot(g, dots), null);
    }
    assert.ok(best.every(([a, b]) => g.nbr[a].includes(b)));
    assert.equal(new Set(best.flat()).size, best.length * 2);
  }
  const g = gridFor(mountain);
  assert.deepEqual(openSpot(g, []), g.pairs[0]);
});

test('fillings, flips and piles of cubes', () => {
  const g = gridOf({outline: hexagon(2, 2, 2), turn: true}), all = covers(g);
  assert.equal(all.length, 20);
  assert.equal(covers(g, 'rhombus', 3).length, 3, 'a limit stops the search');
  const empty = cornerTiling(g, 2, 2, 2), full = cornerTiling(g, 2, 2, 2, true);
  assert.equal(flipPoints(g, empty).length, 1, 'the empty corner has one place for a cube');
  assert.equal(flipRoute(g, empty, full).length, 8);
  assert.equal(flipDistances(g, empty).size, 20, 'flips reach every filling');
  // A flip undoes itself, and each pile's cubes are its flips from the empty corner.
  for (const t of all) for (const k of flipPoints(g, t)) assert.equal(tilingKey(flipAt(g, flipAt(g, t, k), k)), tilingKey(t));
  assert.equal(flipRoute(g, empty, stackTiling(g, 2, 2, 2, [[2, 1], [1]])).length, 4);
  assert.equal(flipRoute(g, empty, stackTiling(g, 2, 2, 2, [[2, 2], [2, 2]])).length, 8);
  assert.equal(tilingKey(stackTiling(g, 2, 2, 2, [[2, 2], [2, 2]])), tilingKey(full));
  assert.throws(() => stackTiling(g, 2, 2, 2, [[0, 1]]), /No room/, 'a cube cannot float');
  assert.equal(flipAt(g, empty, 0), null, 'no flip on the edge');
  // Shading: each filling of the regular hexagon has the same number of each face (the calisson problem).
  for (const t of all) assert.deepEqual([0, 1, 2].map(f => t.filter(piece => faceOf(g, piece) === f).length), [4, 4, 4]);
});

test('taps build a piece one triangle at a time', () => {
  const g = gridFor(long), fresh = freshAttempt(long), [a, b] = g.pairs[0], far = g.cells.findIndex((_, j) => j !== a && !g.nbr[a].includes(j));
  assert.equal(classify(g, 'rhombus', fresh.board, [a]), 'extendable');
  assert.equal(classify(g, 'rhombus', fresh.board, [a, b]), 'complete');
  assert.equal(classify(g, 'rhombus', fresh.board, [a, far]), 'blocked');
  const one = play(long, fresh, place([a, b]));
  assert.equal(classify(g, 'rhombus', one.board, [a]), 'blocked', 'a covered triangle cannot start a piece');
  assert.equal(move(long, one, place([a, b])), null);
  assert.equal(move(long, fresh, place([a, far])), null);
  const lifted = play(long, one, {type: 'lift', cell: b});
  assert.deepEqual(lifted.board.pieces, []);
  assert.equal(classify(gridFor(pinwheel), 'chevron', freshAttempt(pinwheel).board, [a, b]), 'extendable', 'two triangles can start a chevron');
});

test('the pack solve is two-sided: a full board, or as many dots as rhombi with no rhombus free of dots', () => {
  const p = bowTie, g = gridFor(p), [x, y] = g.cells.map((_, i) => i).filter(i => g.nbr[i].length === 3);
  const pieces = maxPacking(g);
  let a = play(p, freshAttempt(p), ...pieces.map(place));
  assert.equal(isSolved(p, a.board), false, 'the most rhombi alone is not the answer');
  a = play(p, a, {type: 'dot', cell: x});
  assert.equal(isSolved(p, a.board), false);
  const wrong = play(p, a, {type: 'dot', cell: g.cells.findIndex((_, i) => i !== x && i !== y)});
  assert.equal(isSolved(p, wrong.board), false, 'two dots, but a rhombus still covers neither');
  a = play(p, a, {type: 'dot', cell: y});
  assert.equal(isSolved(p, a.board), true);
  // Dots never block rhombi, and rhombi never block dots.
  const dotted = play(p, freshAttempt(p), {type: 'dot', cell: x});
  assert.equal(play(p, dotted, place(g.pairs.find(pair => pair.includes(x)))).board.pieces.length, 1);
  assert.equal(play(p, dotted, {type: 'dot', cell: x}).board.dots.length, 0, 'tapping a dot again takes it off');
  // More dots than rhombi do not count.
  const extra = play(p, freshAttempt(p), place(pieces[0]), {type: 'dot', cell: x}, {type: 'dot', cell: y});
  assert.equal(isSolved(p, extra.board), false);
});

test('pack hints place the most rhombi first, keeping the child’s own, then the dots', () => {
  const p = mountain, g = gridFor(p);
  let a = freshAttempt(p);
  const first = nextHint(p, a);
  assert.equal(first.tool, 'piece');
  assert.equal(first.text, 'Put a piece on the glowing triangles.');
  const mine = g.pairs[g.pairs.length - 1];
  a = play(p, a, place(mine));
  for (let k = 0; k < 2; k++) a = play(p, a, nextHint(p, a).action);
  assert.ok(a.board.pieces.some(piece => pieceKey(piece) === pieceKey(mine)), 'a rhombus that fits a best packing stays');
  const dotHint = nextHint(p, a);
  assert.equal(dotHint.tool, 'dot');
  assert.equal(dotHint.action.type, 'dot');
  const wrongDot = play(p, a, {type: 'dot', cell: g.cells.findIndex((_, i) => g.up[i])});
  assert.equal(nextHint(p, wrongDot).text, 'Take the dot off the glowing triangle.');
});

test('listing: each filling joins the shelf once, That’s all checks the list, Undo keeps what was found', () => {
  const p = three, g = gridFor(p), m = mechanicFor(p), all = covers(g);
  let a = play(p, freshAttempt(p), ...all[0].map(place));
  assert.deepEqual(a.board.found, [tilingKey(all[0])]);
  const early = play(p, a, {type: 'claim'});
  assert.equal(early.board.missed, true);
  assert.equal(isSolved(p, early.board), false);
  assert.match(view(p, early), /There’s another\./);
  assert.equal(move(p, early, {type: 'claim'}), null, 'one note until something changes');
  a = play(p, early, {type: 'clear'});
  assert.equal(a.board.missed, false);
  a = play(p, a, ...all[1].map(place));
  const takeBack = x => { const y = undo(x); return {...y, board: m.carry(p, x.board, y.board)}; };
  const back = takeBack(a);
  assert.equal(back.board.found.length, 2, 'undo keeps the filling found');
  assert.equal(validBoard(p, back.board), true);
  a = play(p, play(p, a, {type: 'clear'}), ...all[2].map(place));
  assert.match(view(p, a), /<ol class="rh-shelf" aria-label="Tilings found: 3">/);
  a = play(p, a, {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(restart(p, a).board.found, []);
});

test('Twenty piles starts at the empty corner and flips find new fillings', () => {
  const p = twenty, fresh = freshAttempt(p), g = gridFor(p);
  assert.equal(fresh.board.found.length, 1);
  const [k] = flipPoints(g, fresh.board.pieces);
  const a = play(p, fresh, {type: 'flip', at: k});
  assert.equal(a.board.found.length, 2);
  assert.equal(a.board.flips, 0, 'flips are not counted when listing');
  assert.equal(nextHint(p, a).action.type, 'flip');
  assert.equal(move(p, freshAttempt(three), {type: 'flip', at: 0}), null, 'no flips in Three ways');
});

test('flip puzzles count flips against the budget, and Start again goes back', () => {
  const p = firstFlips, g = gridFor(p), fresh = freshAttempt(p), route = flipRoute(g, p.parameters.start, p.parameters.goal);
  assert.equal(route.length, p.parameters.budget);
  assert.equal(move(p, fresh, {type: 'again'}), null, 'nothing to undo yet');
  let a = play(p, fresh, {type: 'flip', at: route[0]});
  assert.equal(a.board.flips, 1);
  assert.match(view(p, a), /Flips <strong class="">1<\/strong> \/ 4/);
  // Flipping back and forth wastes two flips: the goal is then out of reach.
  a = play(p, a, {type: 'flip', at: route[0]}, {type: 'flip', at: route[0]});
  assert.equal(nextHint(p, a).action.type, 'again');
  const over = route.slice(1).reduce((x, k) => play(p, x, {type: 'flip', at: k}), a);
  assert.equal(tilingKey(over.board.pieces), tilingKey(p.parameters.goal));
  assert.equal(over.board.flips, 6);
  assert.equal(isSolved(p, over.board), false, 'the goal in too many flips is not solved');
  assert.match(view(p, over), /class="over"/);
  const again = play(p, over, {type: 'again'});
  assert.equal(again.board.flips, 0);
  const done = route.reduce((x, k) => play(p, x, {type: 'flip', at: k}), again);
  assert.ok(isSolved(p, done.board));
  assert.equal(move(p, fresh, place(g.pairs[0])), null, 'no placing in a flip puzzle');
});

test('flip saves must be reachable: the fewest flips, plus an even number more', () => {
  const p = wall, fresh = freshAttempt(p), {goal} = p.parameters;
  assert.equal(validBoard(p, {...fresh.board, pieces: goal, flips: 8}), true);
  assert.equal(validBoard(p, {...fresh.board, pieces: goal, flips: 7}), false);
  assert.equal(validBoard(p, {...fresh.board, pieces: goal, flips: 9}), false);
  assert.equal(validBoard(p, {...fresh.board, pieces: goal, flips: 10}), true);
  assert.equal(isSolved(p, {...fresh.board, pieces: goal, flips: 10}), false);
});

test('the playground: three hexagons, each starting as an empty box', () => {
  const p = ground, fresh = freshAttempt(p);
  assert.equal(fresh.board.size, 3);
  assert.equal(isSolved(p, fresh.board), false);
  assert.equal(nextHint(p, fresh).type, 'done');
  const g = gridFor(p, fresh.board), [k] = flipPoints(g, fresh.board.pieces);
  const one = play(p, fresh, {type: 'flip', at: k});
  assert.equal(move(p, fresh, {type: 'size', size: 3}), null, 'the empty box is already showing');
  assert.equal(tilingKey(play(p, one, {type: 'size', size: 3}).board.pieces), tilingKey(fresh.board.pieces), 'pressing it again empties the box');
  const small = play(p, one, {type: 'size', size: 2});
  assert.equal(small.board.pieces.length, 12);
  const lifted = play(p, small, {type: 'lift', cell: 0});
  assert.equal(lifted.board.pieces.length, 11);
  assert.equal(play(p, lifted, place(small.board.pieces.find(piece => piece.includes(0)))).board.pieces.length, 12);
  assert.equal(move(p, fresh, {type: 'size', size: 6}), null);
  assert.equal(validBoard(p, {size: 3, pieces: [[0, 1], [0, 1]]}), false);
});

test('rendering: each kind of puzzle shows only the controls it needs', () => {
  const html = p => view(p, freshAttempt(p));
  const fill = html(long);
  assert.match(fill, /data-mechanic-wire="rhombus"/);
  assert.match(fill, /Drag across 2 triangles/);
  assert.doesNotMatch(fill, /data-tg-point=/, 'no flips in a fill puzzle');
  assert.match(html(pinwheel), /Drag across 4 triangles/);
  const packed = html(mountain);
  assert.match(packed, /aria-label="Rhombi: 0"/);
  assert.match(packed, /aria-label="Dots: 0"/);
  assert.match(packed, /aria-pressed="true"[^>]*aria-label="Rhombi/);
  mechanicFor(mountain).ui(mountain, {tool: 'dot'});
  const dotting = html(mountain);
  assert.match(dotting, /aria-pressed="true"[^>]*aria-label="Dots/);
  assert.match(dotting, /Put a dot here/);
  mechanicFor(mountain).reset(mountain);
  const flip = html(firstFlips);
  assert.match(flip, /aria-label="Goal"/);
  assert.match(flip, /Flips <strong class="">0<\/strong> \/ 4/);
  assert.equal(flip.match(/data-tg-point=/g).length, 1, 'one place for a cube in the empty corner');
  assert.doesNotMatch(flip, /data-tg-cell=/, 'flip puzzles are played with flips only');
  const list = html(three);
  assert.match(list, /That’s all/);
  assert.doesNotMatch(list, /rh-shelf/, 'no shelf until something is found');
  assert.match(html(ground), /aria-label="Hexagon of side 4"/);
  // A solved board has no controls left on it.
  const g = gridFor(long), solved = play(long, freshAttempt(long), ...covers(g, 'rhombus', 1)[0].map(place));
  assert.doesNotMatch(view(long, solved).match(/<svg class="tg-board[\s\S]*?<\/svg>/)[0], /role="button"/);
});

test('hints in fill puzzles lift a piece that leads nowhere', () => {
  const p = byId('rhombus-04'), g = gridFor(p), dead = g.pairs.find(pair => !covers(g, 'rhombus', 1, [pair]).length);
  const a = play(p, freshAttempt(p), place(dead));
  const hint = nextHint(p, a);
  assert.equal(hint.action.type, 'lift');
  assert.equal(hint.text, 'Lift the glowing piece.');
});
