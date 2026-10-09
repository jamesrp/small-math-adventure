// The Week 1 encore groups of Rhombus gardens: the duel (choosing who
// starts, the app's exact replies and copying, saves that pass up a win),
// fewest blocks (any block, the budget, hints that keep the child's blocks
// or lift a trap), and red trapezoids (Can't, every way with Undo, the kind
// count, re-cuts and odd ways home), with the maths underneath and the
// rendering. The counts are checked by separate methods in
// scripts/validate-blocks.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {mechanicFor} from '../dist/expansion.js';
import {gridOf, placements} from '../dist/tri-grid.js';
import {hexagon} from '../dist/families/rhombus/rhombus.js';
import {toMoveWins, winningSpots, openSpots, halfTurn, turnedPiece, pieceKey, tilingKey, fillWithin, fewestOf, kindsOf, cutsAt, recut, hexagonPairs, shapeOf} from '../dist/families/blocks/blockmath.js';
import {validateBlocks} from '../scripts/validate-blocks.mjs';
import {loadPack} from '../scripts/packs.mjs';

const blocks = JSON.parse(await readFile(new URL('../dist/families/blocks/blocks.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => blocks.puzzles.find(p => p.id === id);
const always = value => () => value;
const play = (p, a, ...actions) => actions.reduce((x, action) => { const next = move(p, x, action, always(0)); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
// Undo as the app does it, with the mechanic's carry hook.
const takeBack = (p, a) => { const b = undo(a), carry = mechanicFor(p).carry; return carry ? {...b, board: carry(p, a.board, b.board)} : b; };
const gridFor = p => gridOf(p.parameters.board);
const smallHexagon = byId('blueduel-01'), strip = byId('blueduel-02'), bigHexagon = byId('blueduel-07'), triangleDuel = byId('blueduel-09');
const mountain = byId('blockfill-01'), hexagonOfTwo = byId('blockfill-05'), hexagonOfThree = byId('blockfill-07');
const arrow = byId('redfill-01'), redHexagon = byId('redfill-03'), twoWays = byId('redfill-04'), home = byId('redfill-06'), fourDown = byId('redfill-08');

test('the pack validates: claims match separate methods, hints solve, the app wins from the losing side', async () => {
  const report = await validateBlocks();
  assert.equal(report.blockPuzzles, 26);
  assert.ok(report.randomGames >= 200);
});

test('the three groups join Rhombus gardens below its levels', () => {
  const html = libraryView({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts: {}}, pack.puzzles);
  const family = html.slice(html.indexOf('data-view-key="family-rhombus"'));
  const rhombus = family.slice(0, family.indexOf('</details>'));
  const order = ['<h2>Hard</h2>', '<h2>Rhombus duel</h2>', '<h2>Fewest blocks</h2>', '<h2>Red trapezoids</h2>'].map(h => rhombus.indexOf(h));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), 'groups follow Hard, in order');
  assert.match(rhombus, /aria-label="Rhombus gardens, Rhombus duel, puzzle 1"/);
});

test('duel maths: who wins, the centre of the half turn, and copies', () => {
  const g = gridFor(smallHexagon), s = gridFor(strip), t = gridFor(triangleDuel);
  assert.equal(toMoveWins(g, []), false);
  assert.equal(halfTurn(g).centre, 'point');
  assert.equal(halfTurn(s).centre, 'edge');
  assert.equal(halfTurn(t), null, 'a triangle has no half turn');
  assert.equal(toMoveWins(s, []), true);
  const [middle] = winningSpots(s, []);
  assert.equal(pieceKey(turnedPiece(s, middle)), pieceKey(middle), 'the winning first rhombus is its own copy');
  for (const spot of openSpots(g, [])) assert.ok(!turnedPiece(g, spot).some(c => spot.includes(c)), 'no rhombus meets its copy round a grid point');
});

test('the duel: choosing who starts, the app answers at once and copies on a point-centre board', () => {
  const p = bigHexagon, g = gridFor(p);
  let a = freshAttempt(p);
  assert.match(view(p, a), /Me first/);
  assert.match(view(p, a), /You first/);
  assert.equal(move(p, a, {type: 'place', cells: openSpots(g, [])[0]}), null, 'no rhombus before choosing');
  const hint = nextHint(p, a);
  assert.deepEqual(hint.action, {type: 'choose', first: 'app'}, 'the second player wins here');
  a = play(p, a, {type: 'choose', first: 'you'});
  const mine = openSpots(g, [])[3];
  a = play(p, a, {type: 'place', cells: mine});
  assert.equal(a.board.pieces.length, 2, 'the app answers at once');
  assert.equal(pieceKey(a.board.pieces[1]), pieceKey(turnedPiece(g, mine)), 'the app copies');
  assert.match(view(p, a), /I laid the light rhombus/);
  assert.equal(move(p, a, {type: 'place', cells: mine}), null, 'taken triangles');
  a = takeBack(p, a);
  assert.equal(a.board.pieces.length, 0, 'Undo takes back both rhombi');
});

test('the duel: the app goes first when asked, and a win is a solve', () => {
  const p = strip, g = gridFor(p);
  let a = play(p, freshAttempt(p), {type: 'choose', first: 'app'});
  assert.equal(a.board.pieces.length, 1, 'the app lays the first rhombus');
  assert.equal(pieceKey(a.board.pieces[0]), pieceKey(winningSpots(g, [])[0]), 'and it takes the middle');
  while (!isSolved(p, a.board) && openSpots(g, a.board.pieces).length) a = play(p, a, {type: 'place', cells: openSpots(g, a.board.pieces)[0]});
  assert.ok(!isSolved(p, a.board), 'the app wins from the middle');
  assert.match(view(p, a), /I win/);
  assert.deepEqual(nextHint(p, a).action, {type: 'again'});
  a = play(p, a, {type: 'again'}, {type: 'choose', first: 'you'}, {type: 'place', cells: winningSpots(g, [])[0]});
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, {type: 'again'}), null, 'nothing after a win');
});

test('duel saves: never at the app’s turn, and the app never passes up a win', () => {
  const p = smallHexagon, g = gridFor(p), [one] = openSpots(g, []);
  assert.equal(validBoard(p, {first: 'you', pieces: [one]}), false);
  assert.equal(validBoard(p, {first: null, pieces: [one]}), false);
  const copy = turnedPiece(g, one), other = openSpots(g, [one]).find(s => pieceKey(s) !== pieceKey(copy) && toMoveWins(g, [one, s]));
  assert.ok(validBoard(p, {first: 'you', pieces: [one, copy]}));
  assert.equal(validBoard(p, {first: 'you', pieces: [one, other]}), false, 'a reply that lets the child win is forged');
});

test('fewest blocks: any block by its triangles, the budget, Clear', () => {
  const p = hexagonOfTwo, g = gridFor(p);
  const [hex] = placements(g, 'hexagon').filter(h => h.includes(0) === false && h.includes(g.cells.length - 1) === false).slice(-1);
  let a = play(p, freshAttempt(p), {type: 'place', cells: hex});
  assert.equal(shapeOf(a.board.pieces[0]), 'hexagon');
  assert.equal(move(p, a, {type: 'place', cells: [0, 1, 2, 3]}), null, 'four triangles are no block');
  assert.equal(move(p, a, {type: 'place', cells: hex}), null, 'overlap');
  a = play(p, a, {type: 'clear'});
  assert.equal(a.board.pieces.length, 0);
  // Every triangle as its own block fills the board but is over budget.
  a = {...a, board: {pieces: g.cells.map((_, i) => [i])}};
  assert.ok(validBoard(p, a.board) && !isSolved(p, a.board));
  assert.match(view(p, a), /class="over"/);
});

test('fewest blocks: hints keep the child’s blocks, and lift the hexagon that is in the way', () => {
  const p = mountain, g = gridFor(p), [hex] = placements(g, 'hexagon');
  let a = play(p, freshAttempt(p), {type: 'place', cells: hex});
  assert.equal(nextHint(p, a).action.type, 'lift', 'the mountain’s hexagon forces four');
  const q = hexagonOfTwo, h = gridFor(q);
  const best = fillWithin(h, [], 6);
  let b = play(q, freshAttempt(q), {type: 'place', cells: best.find(x => x.length === 6)});
  const hint = nextHint(q, b);
  assert.equal(hint.action.type, 'place', 'a hexagon of a best filling stays');
  assert.ok(['hexagon', 'rhombus'].includes(hint.tool));
  assert.equal(fewestOf(h), 6);
  assert.equal(fillWithin(gridFor(hexagonOfThree), [], 11), null, 'eleven blocks are too few for the hexagon of side 3');
});

test('red trapezoids: Can’t is refused where a filling exists and solves where none does', () => {
  let a = play(arrow, freshAttempt(arrow), {type: 'cant'});
  assert.equal(a.board.refused, true);
  assert.match(view(arrow, a), /It can be done\./);
  assert.equal(move(arrow, a, {type: 'cant'}), null);
  const g = gridFor(arrow), piece = placements(g, 'trapezoid')[0];
  a = play(arrow, a, {type: 'place', cells: piece});
  assert.equal(a.board.refused, false, 'a change clears the note');
  const b = play(redHexagon, freshAttempt(redHexagon), {type: 'cant'});
  assert.ok(isSolved(redHexagon, b.board), 'sixteen triangles cannot take trapezoids');
  const c = play(fourDown, freshAttempt(fourDown), {type: 'cant'});
  assert.ok(isSolved(fourDown, c.board), 'no filling of the triangle of six has four pointing down');
});

test('red trapezoids: kinds are counted and fixed by ups and downs', () => {
  const g = gridFor(fourDown), filling = fillWithin(g, [], 12, ['trapezoid']);
  assert.deepEqual(kindsOf(g, filling), {up: 9, down: 3});
  const a = {...freshAttempt(fourDown), board: {pieces: filling, cant: false, refused: false}};
  assert.ok(validBoard(fourDown, a.board) && !isSolved(fourDown, a.board), 'three pointing down is not four');
  assert.match(view(fourDown, a), /Two up: 9\. Two down: 3\./);
  const three = byId('redfill-07');
  assert.ok(isSolved(three, {...a.board}), 'any filling has three pointing down');
});

test('red trapezoids: every way, with That’s all and Undo keeping what was found', () => {
  const p = twoWays, g = gridFor(p);
  const [first] = [fillWithin(g, [], 3, ['trapezoid'])];
  let a = freshAttempt(p);
  for (const piece of first) a = play(p, a, {type: 'place', cells: piece});
  assert.equal(a.board.found.length, 1);
  a = play(p, a, {type: 'claim'});
  assert.equal(a.board.missed, true);
  assert.match(view(p, a), /There’s another\./);
  a = takeBack(p, a);
  assert.equal(a.board.found.length, 1, 'Undo keeps the filling found');
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.found.length, 2);
});

test('red trapezoids: a hexagon of two trapezoids re-cuts three ways, so three moves come home', () => {
  const p = home, g = gridFor(p), start = p.parameters.start;
  const [pair] = hexagonPairs(g, start);
  assert.equal(hexagonPairs(g, start).length, 1, 'only the middle re-cuts');
  let pieces = start;
  for (let k = 0; k < 3; k++) pieces = recut(g, pieces, ...hexagonPairs(g, pieces)[0]);
  assert.equal(tilingKey(pieces), tilingKey(start));
  const ring = start.filter(x => !pair.includes(pieceKey(x)));
  assert.equal(move(p, freshAttempt(p), {type: 'recut', a: pieceKey(ring[0]), b: pieceKey(ring[1])}), null, 'ring trapezoids make no hexagon');
  const k = g.points.findIndex((_, j) => g.around[j].length === 6 && pair.every(x => x.split('.').map(Number).every(c => g.around[j].includes(c))));
  assert.equal(cutsAt(g, k).length, 3);
  let a = freshAttempt(p);
  a = play(p, a, nextHint(p, a).action);
  a = play(p, a, nextHint(p, a).action);
  assert.ok(!isSolved(p, a.board), 'two moves are not home');
  assert.match(view(p, a), /Moves <strong>2<\/strong>/);
  a = play(p, a, {type: 'again'});
  assert.equal(a.board.path.length, 1, 'Start again');
  while (!isSolved(p, a.board)) a = play(p, a, nextHint(p, a).action);
  assert.equal(a.board.path.length - 1, 3);
});

test('rendering: tools and counts, the tally, the shelf and the start card', () => {
  const tools = view(hexagonOfTwo, freshAttempt(hexagonOfTwo));
  for (const s of ['triangle', 'rhombus', 'trapezoid', 'hexagon']) assert.match(tools, new RegExp(`data-focus="bk-tool-${s}"`));
  assert.match(tools, /Blocks: 0 of 6/);
  mechanicFor(hexagonOfTwo).ui(hexagonOfTwo, {tool: 'hexagon'});
  assert.match(view(hexagonOfTwo, freshAttempt(hexagonOfTwo)), /Put a hexagon round this point/, 'hexagon spots show while the hexagon is chosen');
  mechanicFor(hexagonOfTwo).reset(hexagonOfTwo);
  assert.match(view(home, freshAttempt(home)), /aria-label="Start"/);
  assert.match(view(arrow, freshAttempt(arrow)), /Two up: 0\. Two down: 0\./);
});
