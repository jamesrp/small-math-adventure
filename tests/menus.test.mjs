// Pebble Duel menus (dist/families/menus/menus.js): losing piles for each
// menu, the perfect opponent, normal and misère play, a player with no move,
// choose-who-starts rounds and their streak, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {moverWins, opponentMove, drawStart} from '../dist/families/menus/menus.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/menus/menus.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const losing = (q, n) => Array.from({length: n + 1}, (_, k) => k).filter(k => !moverWins(q, [k]));
const fixed = value => () => value;

test('the losing piles for each menu', () => {
  assert.deepEqual(losing({menu: [1, 2]}, 12), [0, 3, 6, 9, 12]);
  assert.deepEqual(losing({menu: [1, 2, 3]}, 12), [0, 4, 8, 12]);
  assert.deepEqual(losing({menu: [1, 3, 4]}, 23), [0, 2, 7, 9, 14, 16, 21, 23]);
  assert.deepEqual(losing({menu: [2, 3]}, 11), [0, 1, 5, 6, 10, 11]);
  assert.deepEqual(losing({menu: [1, 2], misere: true}, 10), [1, 4, 7, 10]);
  assert.equal(moverWins({menu: [1, 2]}, [2, 5]), false, 'remainders 2 and 2 balance');
  assert.equal(moverWins({menu: [1, 3, 4]}, [4, 6]), false, 'Grundy values 2 and 2 balance');
});

test('a game: the child takes, the opponent replies at once, and Undo takes back both', () => {
  const p = byId('menus-01');
  const a = freshAttempt(p);
  assert.deepEqual(a.board, {start: [7], piles: [7], first: 'you', turns: [], streak: 0, fresh: true});
  const b = move(p, a, {type: 'take', pile: 1, take: 1}, fixed(0));
  assert.equal(b.board.turns.length, 2);
  assert.equal(b.board.turns[1].player, 'opponent');
  assert.equal(b.board.piles[0] % 3 !== 0, true, 'the opponent leaves a non-multiple of 3');
  assert.deepEqual(undo(b).board, a.board);
  assert.equal(move(p, a, {type: 'take', pile: 1, take: 3}), null, '3 is not on the menu');
});

test('hints win a game from the start, and a wrong first take is punished', () => {
  const p = byId('menus-05');
  let a = freshAttempt(p);
  assert.deepEqual(nextHint(p, a).action, {type: 'take', pile: 1, take: 3});
  const greedy = move(p, a, {type: 'take', pile: 1, take: 4}, fixed(0));
  assert.match(nextHint(p, greedy).text, /careful opponent can always win/);
  for (let i = 0; i < 20 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action, fixed(.5));
  assert.ok(isSolved(p, a.board));
});

test('the opponent never misses a winning take', () => {
  const q = {menu: [1, 3, 4]};
  for (let n = 1; n <= 30; n++) if (moverWins(q, [n])) {
    const m = opponentMove(q, [n], fixed(.99));
    assert.equal(moverWins(q, [n - m.take]), false, `from ${n}`);
  }
});

test('with 2 or 3, a single pebble leaves the player stuck', () => {
  const p = byId('menus-06');
  let a = move(p, freshAttempt(p), {type: 'take', pile: 1, take: 3}, fixed(0));
  while (!isSolved(p, a.board)) a = move(p, a, nextHint(p, a).action, fixed(0));
  assert.ok(a.board.piles[0] <= 1, 'the game ends with 0 or 1 pebble left');
  assert.equal(a.board.turns.at(-1).player, 'you', 'the child made the last move');
});

test('misère: whoever takes the last pebble loses', () => {
  const p = byId('menus-08');
  let a = freshAttempt(p);
  while (!isSolved(p, a.board)) a = move(p, a, nextHint(p, a).action, fixed(0));
  assert.equal(a.board.piles[0], 0);
  assert.equal(a.board.turns.at(-1).player, 'opponent', 'the opponent took the last pebble');
  assert.match(mechanicFor(p).render(p, freshAttempt(p)), /menu-puzzle misere/);
});

test('a round: choose who starts, count wins from new starts only, no Undo', () => {
  const p = byId('menus-03');
  assert.ok(mechanicFor(p).noUndo(p));
  const start = drawStart(p.parameters, fixed(0)); // the first losing start
  assert.equal(moverWins(p.parameters, start), false);
  let a = {...freshAttempt(p), board: {start, piles: [...start], first: null, turns: [], streak: 0, fresh: true}};
  assert.ok(validBoard(p, a.board));
  assert.equal(nextHint(p, a).type, 'note', 'no hint names who starts');
  assert.match(mechanicFor(p).render(p, a), /Me first[\s\S]*You first/);
  a = move(p, a, {type: 'choose', first: 'opponent'}, fixed(0));
  assert.equal(a.board.turns[0].player, 'opponent');
  while (a.board.piles[0]) a = move(p, a, {type: 'take', pile: 1, take: 3 - a.board.turns.at(-1).take}, fixed(0));
  assert.equal(a.board.streak, 1);
  assert.equal(move(p, a, {type: 'again'}), null, 'Same start again only after a loss');
  a = move(p, a, {type: 'new'}, fixed(.9));
  assert.equal(a.board.fresh, true);
  assert.equal(a.board.streak, 1);
  assert.ok(validBoard(p, a.board));
  assert.equal(restart(p, a, fixed(0)).board.streak, 0);
});

test('a loss resets the streak, and a practice game does not count', () => {
  const p = byId('menus-03');
  const start = [6];
  let a = {...freshAttempt(p), board: {start, piles: [6], first: null, turns: [], streak: 2, fresh: true}};
  a = move(p, a, {type: 'choose', first: 'you'}, fixed(0));
  while (a.board.piles[0]) a = move(p, a, {type: 'take', pile: 1, take: 1}, fixed(0));
  assert.equal(a.board.streak, 0, 'the opponent won from 6');
  a = move(p, a, {type: 'again'}, fixed(0));
  assert.equal(a.board.fresh, false);
  a = move(p, a, {type: 'choose', first: 'opponent'}, fixed(0));
  while (a.board.piles[0]) a = move(p, a, {type: 'take', pile: 1, take: 3 - a.board.turns.at(-1).take}, fixed(0));
  assert.equal(a.board.streak, 0, 'a win from the same start is practice');
  assert.match(mechanicFor(p).render(p, a), /Wins count from a new start/);
});

test('saves are replayed: forged piles, turns and starts are rejected', () => {
  const p = byId('menus-10');
  const a = move(p, freshAttempt(p), {type: 'take', pile: 2, take: 2}, fixed(0));
  assert.ok(validBoard(p, a.board));
  assert.equal(validBoard(p, {...a.board, piles: [2, 5]}), false);
  assert.equal(validBoard(p, {...a.board, start: [3, 7]}), false);
  assert.equal(validBoard(p, {...a.board, turns: a.board.turns.slice(0, 1)}), false, 'saves land on the child’s turn');
  const r = byId('menus-09');
  assert.equal(validBoard(r, {start: [50], piles: [50], first: null, turns: [], streak: 0, fresh: true}), false, 'starts stay in range');
});

test('the board shows the menu as take buttons, disabled when the pile is too small', () => {
  const p = byId('menus-06');
  const a = {...freshAttempt(p), board: {start: [9], piles: [9], first: 'you', turns: [], streak: 0, fresh: true}};
  const html = mechanicFor(p).render(p, a);
  assert.equal([...html.matchAll(/class="secondary expansion-action menu-take"/g)].length, 2);
  assert.match(html, /aria-label="Take 2"/);
  assert.match(html, /aria-label="9 pebbles"/);
  const two = byId('menus-12');
  assert.match(mechanicFor(two).render(two, freshAttempt(two)), /aria-label="Take 4 from pile 2"/);
});

test('the puzzles appear as a Menus group in Pebble Duel', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  const family = nim.slice(0, nim.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Menus</h2>'));
  assert.match(family, /aria-label="Pebble Duel, Menus, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="menus-/g)].length, 12);
});
