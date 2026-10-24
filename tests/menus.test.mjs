// Pebble Duel menus (dist/families/menus/menus.js): losing piles for each
// menu, the perfect opponent, normal and misère play, a player with no move,
// choose-who-starts rounds and their streak, every-reply rounds, tracks and
// the design puzzle, Undo, saves and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {moverWins, opponentMove, drawStart, firstDifference, legalMoves, after} from '../dist/families/menus/menus.js';
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

test('hints win a game from the start without naming the take, and a wrong first take is punished', () => {
  const p = byId('menus-06');
  let a = freshAttempt(p);
  assert.deepEqual(nextHint(p, a).action, {type: 'take', pile: 1, take: 3});
  assert.doesNotMatch(nextHint(p, a).text, /[Tt]ake \d/, 'the text names no take');
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
  const p = byId('menus-07');
  let a = move(p, freshAttempt(p), {type: 'take', pile: 1, take: 3}, fixed(0));
  while (!isSolved(p, a.board)) a = move(p, a, nextHint(p, a).action, fixed(0));
  assert.ok(a.board.piles[0] <= 1, 'the game ends with 0 or 1 pebble left');
  assert.equal(a.board.turns.at(-1).player, 'you', 'the child made the last move');
});

test('misère: whoever takes the last pebble loses', () => {
  const p = byId('menus-11');
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
  assert.match(mechanicFor(p).render(p, a), /Go first[\s\S]*Go second/);
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
  const p = byId('menus-15');
  const a = move(p, freshAttempt(p), {type: 'take', pile: 2, take: 2}, fixed(0));
  assert.ok(validBoard(p, a.board));
  assert.equal(validBoard(p, {...a.board, piles: [2, 5]}), false);
  assert.equal(validBoard(p, {...a.board, start: [3, 7]}), false);
  assert.equal(validBoard(p, {...a.board, turns: a.board.turns.slice(0, 1)}), false, 'saves land on the child’s turn');
  const r = byId('menus-12');
  assert.equal(validBoard(r, {start: [50], piles: [50], first: null, turns: [], streak: 0, fresh: true}), false, 'starts stay in range');
});

test('the board shows the menu as take buttons, disabled when the pile is too small', () => {
  const p = byId('menus-07');
  const a = {...freshAttempt(p), board: {start: [9], piles: [9], first: 'you', turns: [], streak: 0, fresh: true}};
  const html = mechanicFor(p).render(p, a);
  assert.equal([...html.matchAll(/class="secondary expansion-action menu-take"/g)].length, 2);
  assert.match(html, /aria-label="Take 2"/);
  assert.match(html, /aria-label="9 pebbles"/);
  const two = byId('menus-18');
  assert.match(mechanicFor(two).render(two, freshAttempt(two)), /aria-label="Take 4 from pile 2"/);
});

test('the puzzles appear as a Menus group in Pebble Duel', async () => {
  const merged = await loadPack();
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, merged.puzzles);
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  const family = nim.slice(0, nim.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Menus</h2>'));
  assert.match(family, /aria-label="Pebble Duel, Menus, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="menus-/g)].length, 18);
});

test('every reply: go second from 14 and beat each first take in turn, with no Undo', () => {
  const p = byId('menus-09');
  assert.ok(mechanicFor(p).noUndo(p));
  let a = freshAttempt(p);
  assert.deepEqual(a.board.turns, [{player: 'opponent', pile: 1, take: 1}]);
  assert.deepEqual(a.board.piles, [13]);
  // A wrong reply loses, and Try again replays the same first take.
  let lost = move(p, a, {type: 'take', pile: 1, take: 1}, fixed(0));
  while (lost.board.piles[0] && lost.board.turns.at(-1).player === 'opponent') lost = move(p, lost, {type: 'take', pile: 1, take: [1, 3, 4].filter(t => t <= lost.board.piles[0]).at(-1)}, fixed(0));
  assert.ok(!isSolved(p, lost.board));
  assert.equal(nextHint(p, lost).action.type, 'again');
  assert.equal(move(p, lost, {type: 'next'}), null, 'Next only after a win');
  assert.deepEqual(move(p, lost, {type: 'again'}).board, a.board);
  // Hints answer every first take; the puzzle is solved after the third win.
  for (let round = 0; round < 3; round++) {
    assert.equal(a.board.round, round);
    while (a.board.piles[0]) a = move(p, a, nextHint(p, a).action, fixed(0));
    if (round < 2) {
      assert.ok(!isSolved(p, a.board));
      assert.match(mechanicFor(p).render(p, a), /Next first take/);
      a = move(p, a, {type: 'next'});
    }
  }
  assert.ok(isSolved(p, a.board));
  assert.equal(validBoard(p, {...a.board, round: 1}), false, 'the first turn must be that round’s take');
});

test('a track: colour, Check, and the lowest wrong square is explained', () => {
  const p = byId('menus-08');
  let a = freshAttempt(p);
  assert.equal(move(p, a, {type: 'check'}), null, 'colour something first');
  for (const square of [0, 2, 4]) a = move(p, a, {type: 'mark', square});
  a = move(p, a, {type: 'check'});
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /Leave 4, and your opponent can take 4 and leave you 0, a square you coloured./);
  assert.equal(move(p, a, {type: 'check'}), null, 'change something before checking again');
  a = move(p, a, {type: 'mark', square: 4});
  assert.equal(a.board.checked, false);
  a = move(p, a, {type: 'check'});
  // Claims audit: 7 is wrong but the child didn't change it since the last
  // Check, so the line gives only the kind of fault: no square, no outline,
  // no play-out (Who knows' rule).
  let html = mechanicFor(p).render(p, a);
  assert.match(html, /A square to leave is not coloured\./);
  assert.doesNotMatch(html, /Leave 7|flag|and play/);
  // A square the child changed since the last Check is named.
  a = move(p, move(p, move(p, a, {type: 'mark', square: 6}), {type: 'mark', square: 9}), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /Leave 6, and your opponent can take \d and leave you \d, a square you coloured\./);
  a = move(p, move(p, a, {type: 'mark', square: 6}), {type: 'check'});
  html = mechanicFor(p).render(p, a);
  assert.match(html, /A square to leave is not coloured\./, '7 is still missing, and still unnamed');
  a = move(p, move(p, a, {type: 'mark', square: 7}), {type: 'mark', square: 7});
  assert.match(mechanicFor(p).render(p, move(p, a, {type: 'check'})), /A square to leave is not coloured\./, 'tapping 7 twice is no change');
  a = move(p, move(p, a, {type: 'mark', square: 7}), {type: 'check'});
  assert.doesNotMatch(mechanicFor(p).render(p, a), /Leave 7/, 'once 7 is coloured, the next wrong square was not changed');
  // Colour everything, then Check, fix, Check: one square is named, then none.
  let all = freshAttempt(p);
  for (let square = 0; square <= 24; square++) all = move(p, all, {type: 'mark', square});
  all = move(p, all, {type: 'check'});
  assert.match(mechanicFor(p).render(p, all), /Leave 1, and your opponent can take 1 and leave you 0/);
  all = move(p, move(p, all, {type: 'mark', square: 1}), {type: 'check'});
  html = mechanicFor(p).render(p, all);
  assert.match(html, /A coloured square is not one to leave\./);
  assert.doesNotMatch(html, /Leave \d|flag|and play/);
  assert.equal(move(p, all, {type: 'play'}), null, 'no play-out from a square that isn’t named');
  assert.equal(move(p, all, {type: 'check'}), null, 'Check waits for a change');
  assert.deepEqual(firstDifference({menu: [2, 5, 6], last: 30}, [0]), {square: 1, at: [1], extra: false, leaves: []});
  // Hints point at the lowest wrong square, then Check.
  a = freshAttempt(p);
  for (let i = 0; i < 40 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  assert.deepEqual(a.board.marked, [0, 2, 7, 9, 14, 16, 21, 23]);
  assert.equal(validBoard(p, {marked: [2, 0], checked: false, play: null}), false, 'marks are kept in order');
  assert.equal(validBoard(p, {marked: [25], checked: false, play: null}), false, 'squares stop at 24');
  assert.equal(validBoard(p, {marked: [], checked: true, play: null}), false);
});

test('playing out a wrong square: the opponent wins from it', () => {
  const p = byId('menus-08');
  // 4 coloured wrongly: the child leaves 4 and the opponent takes it all.
  let a = move(p, [0, 2, 4].reduce((x, square) => move(p, x, {type: 'mark', square}), freshAttempt(p)), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /Leave 4 and play/);
  a = move(p, a, {type: 'play'}, fixed(0));
  assert.deepEqual(a.board.play.turns, [{player: 'opponent', pile: 1, take: 4}]);
  const html = mechanicFor(p).render(p, a);
  assert.match(html, /You leave 4, so your opponent moves first./);
  assert.match(html, /You have no move. So 4 is not a square to leave./);
  assert.equal(move(p, a, {type: 'mark', square: 1}), null, 'the track waits until Back');
  assert.equal(nextHint(p, a).action.type, 'back');
  a = move(p, a, {type: 'back'});
  assert.equal(a.board.play, null);
  assert.equal(a.board.checked, true, 'the explanation stays');
  // 7 left uncoloured, after the child took it off since the last Check:
  // the child starts from 7 and loses whatever they take.
  let b = move(p, [0, 2, 7].reduce((x, square) => move(p, x, {type: 'mark', square}), freshAttempt(p)), {type: 'check'});
  b = move(p, move(p, b, {type: 'mark', square: 7}), {type: 'check'});
  assert.match(mechanicFor(p).render(p, b), /Start from 7 and play/);
  b = move(p, b, {type: 'play'}, fixed(0));
  assert.deepEqual(b.board.play.turns, []);
  for (let i = 0; i < 10 && legalTakes(b.board); i++) b = move(p, b, {type: 'take', pile: 1, take: [1, 3, 4].filter(t => t <= pilesLeft(b.board)).at(-1)}, fixed(0));
  assert.match(mechanicFor(p).render(p, b), /Whoever moves first from 7 loses, so 7 is a square to leave./);
  assert.equal(validBoard(p, {...b.board, play: {turns: [{player: 'opponent', pile: 1, take: 1}]}}), false, 'the child moves first from 7');
  assert.equal(validBoard(p, {marked: [0, 2], checked: false, play: {turns: []}}), false, 'play needs a check');
});

test('track saves from before the naming rule still load and play', () => {
  const p = byId('menus-08');
  assert.ok(validBoard(p, {marked: [0, 2], checked: true, play: null}), 'an old checked track');
  assert.ok(validBoard(p, {marked: [0, 2], checked: true, play: {turns: []}}), 'an old play-out from 7');
  assert.ok(validBoard(p, {marked: [0, 2], checked: false, play: null, before: [0, 2, 4]}));
  assert.equal(validBoard(p, {marked: [0, 2], checked: false, play: null, before: [4, 2]}), false, 'before is kept in order');
  assert.equal(validBoard(p, {marked: [0, 2], checked: false, play: null, before: [0], extra: 1}), false);
});

test('a lost game’s hint offers Undo, not a New start the game lacks', () => {
  for (const id of ['menus-01', 'menus-02', 'menus-05', 'menus-06', 'menus-07', 'menus-11', 'menus-15', 'menus-18']) {
    const p = byId(id), q = p.parameters;
    let a = freshAttempt(p);
    // Take a losing take whenever there is one, so the perfect opponent wins.
    for (let i = 0; i < 200 && a.board.turns.length < 200; i++) {
      const piles = a.board.piles, all = legalMoves(q, piles);
      if (!all.length || isSolved(p, a.board)) break;
      const bad = all.find(m => moverWins(q, after(piles, m))) || all[0];
      const next = move(p, a, {type: 'take', ...bad}, fixed(0));
      if (!next) break;
      a = next;
    }
    assert.ok(!isSolved(p, a.board), `${id}: the game is lost`);
    const h = nextHint(p, a);
    assert.equal(h.type, 'deadend', `${id}: a lost game`);
    assert.equal(h.quiet, true, `${id}: behind Hint only`);
    assert.equal(h.text, 'Undo your last turn.');
    assert.ok(!h.action, `${id}: no action the game would refuse`);
  }
});
const pilesLeft = board => board.play.turns.reduce((n, t) => n - t.take, 7);
const legalTakes = board => pilesLeft(board) > 0;

test('the chart for two piles: equal remainders after taking away 3s', () => {
  const p = byId('menus-17');
  assert.equal(p.solution.toLeave.length, 34);
  assert.ok(p.solution.toLeave.includes('2,5') && !p.solution.toLeave.includes('2,4'));
  let a = move(p, move(p, freshAttempt(p), {type: 'mark', square: 0}), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /A square to leave is not coloured\./, '(1, 1) was never touched, so it isn’t named');
  a = move(p, move(p, move(p, a, {type: 'mark', square: 11}), {type: 'mark', square: 11}), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /A square to leave is not coloured\./);
  a = move(p, move(p, a, {type: 'mark', square: 1}), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /Leave \(0, 1\), and your opponent can take 1 from the second pile and leave you \(0, 0\), a square you coloured./);
  a = freshAttempt(p);
  for (let i = 0; i < 80 && !isSolved(p, a.board); i++) a = move(p, a, nextHint(p, a).action);
  assert.ok(isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /aria-label="Piles of 2 and 5, coloured"/);
});

test('design: choose the takes so that the squares to leave are the multiples of 5', () => {
  const p = byId('menus-14');
  assert.equal(nextHint(p, freshAttempt(p)).type, 'note', 'a reverse goal shows the authored hints only');
  const choose = (a, takes) => takes.reduce((x, take) => move(p, x, {type: 'choose', take}), a);
  let a = move(p, choose(freshAttempt(p), [1, 2, 3, 4, 5]), {type: 'check'});
  assert.ok(!isSolved(p, a.board));
  assert.match(mechanicFor(p).render(p, a), /a player on 5 can take 5 and leave 0, so 5 is not a square to leave/);
  a = move(p, choose(freshAttempt(p), [1, 2, 4]), {type: 'check'});
  assert.match(mechanicFor(p).render(p, a), /a player on 3 can only leave 2 or 1, and none of those is a square to leave. So 3 is one./);
  a = move(p, choose(freshAttempt(p), [1, 2, 3, 4, 7, 9]), {type: 'check'});
  assert.ok(isSolved(p, a.board));
  assert.equal(p.solution.menus.length, 16);
  assert.equal(validBoard(p, {menu: [0], checked: false}), false);
});
