// Squares in Tile gardens: the biggest-square rule, fewest squares and the
// refused Done, 2s and 3s with the line certificate after a try, four equal
// squares, sizing and cutting rectangles, the playground, Undo, hints,
// saves, rendering and the Tile gardens group.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {cutsOf, lastOf, recipeOf, kindsOf, fewestCover, fewestOf, fillCover, certificateOk, certificateFor, pickProblem, maxThrees, packedThrees, rectangleOf, rectKey, squareToward, squaresOk} from '../dist/families/squares/squaremath.js';
import {squareMechanics, gestureSquare, designTargets, designLadder, fourKeys, stuckPicks, fitWords, pickLine} from '../dist/families/squares/squares.js';
import {loadPack} from '../scripts/packs.mjs';

const squares = JSON.parse(await readFile(new URL('../dist/families/squares/squares.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => squares.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const place = (x, y, s) => ({type: 'place', x, y, s});
const mech = squareMechanics.squares;
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const undoCarry = (p, a) => { const next = undo(a); return {...next, board: mech.carry(p, a.board, next.board)}; };

test('the biggest-square rule: cuts, last square, recipe, sizes', () => {
  assert.deepEqual(cutsOf(5, 2), [[0, 0, 2], [2, 0, 2], [4, 0, 1], [4, 1, 1]]);
  assert.deepEqual(cutsOf(2, 5).map(c => c[2]), [2, 2, 1, 1], 'a tall one is cut from the top');
  assert.equal(lastOf(12, 9), 3);
  assert.equal(lastOf(13, 8), 1);
  assert.deepEqual(recipeOf(8, 3), [2, 1, 2]);
  assert.deepEqual(recipeOf(7, 4), [1, 1, 3]);
  assert.equal(kindsOf(13, 8), 5);
  assert.equal(kindsOf(6, 6), 1);
});

test('fewest squares, 2s and 3s, the line certificate', () => {
  assert.equal(fewestOf(6, 5), 5);
  assert.equal(fewestOf(4, 3), 4);
  assert.equal(fewestOf(7, 6), 5);
  assert.equal(fewestCover(6, 5, [[0, 0, 5]], 4), null, 'with the 5 by 5 down, four more can’t finish');
  assert.equal(fewestCover(6, 5, [[0, 0, 3]], 4).length, 4);
  assert.ok(fillCover(6, 5));
  assert.equal(fillCover(5, 5), null);
  assert.equal(fillCover(7, 5), null);
  assert.deepEqual(certificateFor(5, 5), {dir: 'row', at: [0, 3]});
  assert.deepEqual(certificateFor(7, 5), {dir: 'col', at: [0, 3, 6]});
  assert.equal(certificateFor(6, 5), null, 'none where it fills');
  assert.equal(certificateFor(7, 7), null, 'not every can’t has one: 7 by 7 fits four 3s and has three lines');
  assert.ok(certificateOk(5, 5, {dir: 'col', at: [1, 4]}));
  assert.equal(certificateOk(5, 5, {dir: 'row', at: [0, 2]}), false, 'too close');
  assert.equal(certificateOk(5, 5, {dir: 'row', at: [3, 0]}), false, 'in order');
  assert.equal(certificateOk(7, 5, {dir: 'row', at: [0, 3]}), false, 'two lines, two 3s fit');
  assert.equal(maxThrees(7, 5), 2);
  assert.deepEqual(packedThrees(7, 5), [[0, 0, 3], [3, 0, 3]]);
  assert.equal(pickProblem(6, 5, {dir: null, at: []}, 'row', 0), 'even');
  assert.equal(pickProblem(5, 5, {dir: 'row', at: [0]}, 'col', 3), 'cross', 'a row and a column always meet');
  assert.equal(pickProblem(5, 5, {dir: 'row', at: [0]}, 'row', 2), 'cross');
  assert.equal(pickProblem(5, 5, {dir: 'row', at: [0]}, 'row', 3), null);
  assert.equal(stuckPicks(5, 5, {dir: 'row', at: [2]}), true, 'row 3 alone: no other row can join');
  assert.equal(stuckPicks(6, 5, {dir: 'col', at: [0, 3]}), true);
  assert.equal(stuckPicks(6, 5, {dir: 'col', at: [0]}), false);
  assert.equal(fitWords(2), 'Two 3 by 3 squares fit.');
  assert.equal(fitWords(1), 'One 3 by 3 square fits.');
});

test('placing: a slide or two taps from corner to corner, kept on the board', () => {
  const q = byId('squares-04').parameters;
  assert.deepEqual(gestureSquare(q, [0, 0], [2, 1]), [0, 0, 3], 'the far square sets the side');
  assert.deepEqual(gestureSquare(q, [4, 4], [3, 3]), [3, 3, 2], 'up and left');
  assert.deepEqual(gestureSquare(q, [5, 4], [5, 4]), [5, 4, 1], 'one square twice: 1 by 1');
  const fill = byId('squares-05').parameters;
  assert.deepEqual(gestureSquare(fill, [5, 4], [5, 4]), [4, 3, 2], 'the smallest allowed, turned to stay on');
  assert.deepEqual(gestureSquare(fill, [0, 0], [3, 3]), [0, 0, 3], 'the biggest allowed that reaches no further');
  const four = byId('squares-01').parameters;
  assert.deepEqual(gestureSquare(four, [11, 11], [11, 11]), [9, 9, 3], 'four: one tap, kept on the board');
  assert.deepEqual(squareToward(5, 5, [0, 0], [9, 9], null), [0, 0, 10], 'too big is refused by the move, not the gesture');
  assert.ok(squaresOk(6, 5, [[0, 0, 3], [3, 0, 3]]));
  assert.equal(squaresOk(6, 5, [[0, 0, 3], [2, 0, 3]]), false);
});

test('fewest: Done is checked; a refused count stays refused through Undo; no count is shown', () => {
  const p = byId('squares-04'), fresh = freshAttempt(p);
  let a = play(p, fresh, ...cutsOf(6, 5).map(([x, y, s]) => place(x, y, s)));
  assert.match(view(p, a), /data-move="{&quot;type&quot;:&quot;done&quot;}"[^>]*>Done/);
  a = play(p, a, {type: 'done'});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(a.board.fewer, 6);
  assert.match(view(p, a), /Fewer squares fit\./);
  assert.equal(move(p, a, {type: 'done'}), null, 'the same count is answered');
  const back = undoCarry(p, a);
  assert.equal(back.board.fewer, 6, 'Undo keeps the refusal');
  assert.equal(move(p, back, {type: 'done'}), null);
  // Five: two 3s over three 2s.
  const five = play(p, fresh, place(0, 0, 3), place(3, 0, 3), place(0, 3, 2), place(2, 3, 2), place(4, 3, 2), {type: 'done'});
  assert.ok(isSolved(p, five.board));
  const html = view(p, fresh);
  assert.doesNotMatch(html, /budget|at most|fewest is/i, 'no budget');
  assert.doesNotMatch(html.replace(/<svg[\s\S]*<\/svg>/, ''), /\bfive\b|\b5 squares\b/i, 'the fewest count is not printed');
  assert.match(html, /Fill it with as few squares as you can\./);
  assert.match(html, /data-focus="sq-done" disabled/, 'Done waits for a full board');
});

test('fill: Can’t comes after a try, with lines the child picks; refusals in a word', () => {
  const p = byId('squares-07'), fresh = freshAttempt(p);
  assert.equal(move(p, fresh, {type: 'cant', dir: 'row', at: [0, 3]}), null, 'not on a fresh board');
  assert.match(view(p, fresh), /sq-cant[^>]*disabled/, 'Can’t waits for a square');
  const h = nextHint(p, fresh);
  assert.equal(h.action.type, 'place', 'the first hint is a try');
  const tried = play(p, fresh, h.action);
  const reason = nextHint(p, tried);
  assert.equal(reason.action.type, 'cant');
  assert.match(reason.text, /A row of 5 can’t be all 2s, so a 3 by 3 square crosses it\. Rows 1 and 4 need different ones, and only one fits\. Press Can’t and tap both\./);
  assert.doesNotMatch(view(p, tried), /sq-cant[^>]*disabled/);
  // The picker: refusals are words in the view, not moves.
  mech.reset(p);
  mech.ui(p, {claiming: true});
  let html = view(p, tried, true);
  assert.match(html, /data-sq-line="row:0"/);
  assert.match(html, /data-sq-line="col:4"/);
  mech.ui(p, {picks: {dir: 'row', at: [2]}, said: fitWords(1), fits: true});
  html = view(p, tried, true);
  assert.match(html, /One 3 by 3 square fits\./);
  assert.match(html, /sq-ghost/, 'the 3 that fits, dashed');
  const solved = play(p, tried, {type: 'cant', dir: 'row', at: [3, 0]});
  assert.ok(isSolved(p, solved.board));
  assert.deepEqual(solved.board.claim, {dir: 'row', at: [0, 3]}, 'sorted');
  html = view(p, solved);
  assert.match(html, /sq-band/);
  assert.match(html, /sq-ghost/);
  assert.match(html, /Rows 1 and 4 each need their own 3 by 3 square; only one fits\./);
  assert.equal(validBoard(p, {sq: [], claim: {dir: 'row', at: [0, 3]}}), false, 'a forged claim with nothing tried');
  const strip = byId('squares-03');
  const one = play(strip, freshAttempt(strip), place(0, 0, 2), {type: 'cant', dir: 'row', at: [1]});
  assert.match(view(strip, one), /Row 2 needs a 3 by 3 square; none fits\./);
});

test('fill: a filling solves; a square that blocks one is lifted by the hint', () => {
  const p = byId('squares-05'), fresh = freshAttempt(p);
  const stray = play(p, fresh, place(1, 0, 2));
  assert.deepEqual(nextHint(p, stray).action, {type: 'lift', x: 1, y: 0});
  const a = play(p, fresh, ...p.solution.filling.map(([x, y, s]) => place(x, y, s)));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, fresh, place(0, 0, 1)), null, 'only 2s and 3s');
});

test('four: rectangles of all four are kept as they are made; Undo keeps them', () => {
  const p = byId('squares-01'), fresh = freshAttempt(p);
  assert.deepEqual(fourKeys(3), ['12x3', '6x6']);
  let a = play(p, fresh, place(0, 0, 3), place(3, 0, 3), place(6, 0, 3), place(9, 0, 3));
  assert.deepEqual(a.board.found, ['12x3']);
  assert.match(view(p, a), /12 by 3, last square 3/);
  assert.match(view(p, a), /sq-last/, 'the last square ringed');
  const back = undoCarry(p, a);
  assert.deepEqual(back.board.found, ['12x3']);
  a = play(p, back, {type: 'clear'}, place(0, 0, 3), place(3, 0, 3), place(0, 3, 3), place(3, 3, 3));
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(rectangleOf(a.board.sq), [0, 0, 6, 6]);
  assert.equal(rectKey(3, 12), '12x3');
});

test('design: size a rectangle, Cut runs the rule; last 3, a recipe, five sizes', () => {
  const p = byId('squares-06'), fresh = freshAttempt(p);
  assert.match(view(p, fresh), /sq-cutbutton[^>]*disabled/, 'nothing to cut yet');
  let a = play(p, fresh, {type: 'size', w: 9, h: 6});
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, {type: 'cut'});
  assert.deepEqual(a.board.found, [[9, 6]]);
  assert.match(view(p, a), /9 by 6: first square 6, last square 3/);
  a = play(p, a, {type: 'size', w: 12, h: 9}, {type: 'cut'}, {type: 'size', w: 3, h: 3}, {type: 'cut'});
  assert.ok(isSolved(p, a.board));
  const r = byId('squares-09');
  const near = play(r, freshAttempt(r), {type: 'size', w: 7, h: 3}, {type: 'cut'});
  assert.equal(isSolved(r, near.board), false);
  assert.ok(isSolved(r, play(r, near, {type: 'size', w: 3, h: 8}, {type: 'cut'}).board), 'turned is fine');
  assert.match(view(r, freshAttempt(r)), /sq-recipe/);
  const k = byId('squares-12');
  assert.deepEqual(designTargets(k.parameters), [[8, 13], [13, 8]]);
  assert.ok(isSolved(k, play(k, freshAttempt(k), {type: 'size', w: 13, h: 8}, {type: 'cut'}).board));
  // The hint keeps the child's turn of the rectangle, and starts low.
  const tall = play(k, freshAttempt(k), {type: 'size', w: 3, h: 10});
  assert.deepEqual(nextHint(k, tall).action, {type: 'size', w: 2, h: 3});
});

test('the playground cuts one square per press and is never solved', () => {
  const p = byId('squares-play');
  assert.equal(p.band, 'playground');
  assert.equal(mech.noHint(p), true);
  let a = freshAttempt(p);
  a = play(p, a, {type: 'cut'}, {type: 'cut'});
  assert.equal(a.board.n, 2);
  assert.match(view(p, a), /Cuts: 2, 2\./);
  a = play(p, a, {type: 'cut'}, {type: 'cut'});
  assert.equal(move(p, a, {type: 'cut'}), null);
  assert.equal(isSolved(p, a.board), false);
});

test('hints alone solve every puzzle from fresh, and fast', () => {
  for (const p of squares.puzzles.filter(p => p.band !== 'playground')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 60 && !isSolved(p, a.board); i++) {
      const t = performance.now(), h = nextHint(p, a);
      assert.ok(performance.now() - t < 100, `${p.id}: a hint in well under 100 ms`);
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = play(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), p.id);
  }
});

test('the group sits in Tile gardens, after its levels, with its playground', () => {
  for (const p of squares.puzzles) {
    assert.equal(p.libraryFamily, 'tile');
    assert.equal(p.mechanic, 'squares');
  }
  assert.ok(squares.puzzles.filter(p => p.band !== 'playground').every(p => p.group === 'Squares' && p.band === 'all'));
  const profile = {id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}};
  const html = libraryView(profile, pack.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-tile"'));
  const tile = family.slice(0, family.indexOf('</details>'));
  assert.match(tile, /<h2>Squares<\/h2>/);
  assert.ok(tile.indexOf('data-id="squares-01"') < tile.indexOf('data-id="squares-12"'));
  assert.ok(pack.puzzles.some(p => p.mechanic === 'tile' && p.libraryFamily === undefined), 'Tile gardens keeps its own puzzles');
});

test('saves: forged boards are refused', () => {
  const f = byId('squares-04'), d = byId('squares-06'), four = byId('squares-01');
  assert.equal(validBoard(f, {sq: cutsOf(6, 5), done: true, fewer: null}), false);
  assert.equal(validBoard(f, {sq: [], done: false, fewer: 5}), false);
  assert.equal(validBoard(d, {w: 4, h: 4, cut: false, found: [[4, 4]]}), false);
  assert.equal(validBoard(four, {sq: [], found: ['9x4']}), false);
  assert.equal(validBoard(four, {sq: [[0, 0, 3], [3, 0, 3], [6, 0, 3], [9, 0, 3]], found: []}), false);
});

test('design hints climb a ladder and never name the answer after a wrong move', () => {
  assert.deepEqual(designLadder({goal: 'recipe', recipe: [2, 1, 2]}), [[2, 1, 2], [3, 2, 1], [8, 3, 2]]);
  assert.deepEqual(designLadder({goal: 'recipe', recipe: [1, 1, 3]}).at(-1), [7, 4, 1]);
  assert.deepEqual(designLadder({goal: 'kinds', kinds: 5}).map(([L, S]) => `${L}x${S}`), ['3x2', '5x3', '8x5', '13x8']);
  const k = byId('squares-12');
  let a = play(k, freshAttempt(k), {type: 'size', w: 7, h: 3}, {type: 'cut'});
  assert.equal(nextHint(k, a).text, 'Start small: make it 3 by 2.');
  a = play(k, freshAttempt(k), {type: 'size', w: 11, h: 7}, {type: 'cut'});
  assert.equal(nextHint(k, a).text, 'Make it 8 by 5.', 'four sizes: the rung below the answer');
  a = play(k, a, {type: 'size', w: 8, h: 5}, {type: 'cut'});
  assert.equal(nextHint(k, a).text, 'Add an 8 by 8 square along the long side: make it 13 by 8.');
  const r = byId('squares-09');
  a = play(r, freshAttempt(r), {type: 'size', w: 5, h: 2}, {type: 'cut'});
  assert.equal(nextHint(r, a).text, 'Start from the card’s end: make it 2 by 1.');
  a = play(r, a, {type: 'size', w: 3, h: 2}, {type: 'cut'});
  assert.equal(nextHint(r, a).text, 'Add two 3 by 3 squares along the long side: make it 8 by 3.');
});

test('the Can’t picker belongs to its board: Undo to an empty board closes it', () => {
  const p = byId('squares-07'), fresh = freshAttempt(p), tried = play(p, fresh, place(0, 0, 3));
  mech.reset(p);
  view(p, tried, true);
  mech.ui(p, {claiming: true});
  mech.ui(p, {picks: {dir: 'row', at: [0]}, said: null});
  assert.match(view(p, tried, true), /data-sq-line="row:3"/, 'the picker is open');
  const back = undo(tried);
  const html = view(p, back, true);
  assert.doesNotMatch(html, /data-sq-line/, 'Undo to an empty board closes it');
  assert.match(html, /data-sg-cell="0"/, 'the cells take taps again');
  assert.doesNotMatch(view(p, tried, true), /data-sq-line/, 'and it stays closed');
  // Squares off the board: no picker even if the view state says so.
  mech.ui(p, {claiming: true});
  assert.doesNotMatch(view(p, back, true), /data-sq-line/);
});

test('tabs: refusals in a word; the 3s that fit are drawn only where it can’t be filled', () => {
  const fill = byId('squares-05').parameters, five = byId('squares-07').parameters;
  assert.deepEqual(pickLine(fill, {dir: null, at: []}, 'row', 0), {said: '2s can fill that row.', fits: false});
  assert.deepEqual(pickLine(fill, {dir: 'col', at: [0]}, 'col', 3), {picks: {dir: 'col', at: [0, 3]}, said: 'Two 3 by 3 squares fit.', fits: false}, '6 by 5 fills: no dashed 3s');
  assert.deepEqual(pickLine(five, {dir: null, at: []}, 'row', 2), {picks: {dir: 'row', at: [2]}, said: 'One 3 by 3 square fits.', fits: true});
  assert.deepEqual(pickLine(five, {dir: 'row', at: [0]}, 'row', 3), {claim: {dir: 'row', at: [0, 3]}});
  assert.deepEqual(pickLine(five, {dir: 'row', at: [0, 3]}, 'row', 3), {picks: {dir: 'row', at: [0]}, said: null, fits: false}, 'a second tap drops it');
});

test('shelves show only what was kept', () => {
  const p = byId('squares-01'), fresh = freshAttempt(p);
  assert.doesNotMatch(view(p, fresh), /sq-shelf|sq-slot/);
  const strip = play(p, fresh, place(0, 0, 3), place(3, 0, 3), place(6, 0, 3), place(9, 0, 3));
  assert.equal((view(p, strip).match(/class="sq-slot/g) || []).length, 1);
});
