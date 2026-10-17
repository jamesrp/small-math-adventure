// Pebble Duel's Star race and Every start (dist/families/rookrace/rookrace.js):
// second-player squares and starts, the perfect opponent, choosing who starts
// and the streak with its replayed record of wins, practice games, lost starts
// and their rings, marking and keeping starts, That's all and its lock, the
// play-out of a wrong That's all and the clearing after it, practice games from
// a tapped square or the start being built, hints, saves,
// rendering, the satchel groups, Duel 1's place in the Next flow and CPU time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {rookraceMechanics as M, secondSquares, secondStarts, keyOf, squareWins, pilesWin, opponentSquare, raceSolve, everyHint, judge, cellOf, drawSquare, oneMove} from '../dist/families/rookrace/rookrace.js';
import {seeded} from '../scripts/validate-rookrace.mjs';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/rookrace/rookrace.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => json.puzzles.find(p => p.id === id) || pack.puzzles.find(p => p.id === id);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const at = (p, start, extra = {}) => ({...M.rookrace.fresh(p, seeded(1)), start, at: [...start], ...extra});
const go = (p, b, action, seed = 1) => { const next = M[p.mechanic].move(p, b, action, seeded(seed)); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; };
const cpuMs = f => { const t = process.cpuUsage(); f(); const u = process.cpuUsage(t); return (u.user + u.system) / 1000; };

test('second-player squares: the diagonal, Wythoff’s pairs, and three-pile starts by Bouton', () => {
  assert.deepEqual(secondSquares({size: 5}).map(s => s.join()), ['1,1', '2,2', '3,3', '4,4']);
  assert.deepEqual(secondSquares({size: 11, queen: true}).map(s => s.join()).sort(), ['1,2', '10,6', '2,1', '3,5', '4,7', '5,3', '6,10', '7,4']);
  assert.deepEqual(secondStarts({max: 3}).map(keyOf), ['1,2,3']);
  assert.deepEqual(secondStarts({max: 6}).map(keyOf), ['1,2,3', '1,4,5', '2,4,6', '3,5,6']);
  assert.equal(secondStarts({max: 7}).length, 7);
  for (const s of secondStarts({max: 7})) assert.equal(s[0] ^ s[1] ^ s[2], 0);
  assert.equal(pilesWin([2, 2, 1]), true);
  assert.equal(squareWins({size: 8}, [3, 3]), false);
  assert.equal(squareWins({size: 8, queen: true}, [3, 3]), true, 'the queen slides from the diagonal to the star');
});

test('the opponent takes a winning move whenever there is one', () => {
  for (const q of [{size: 8}, {size: 8, queen: true}]) for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) {
    if ((x || y) && squareWins(q, [x, y])) assert.equal(squareWins(q, opponentSquare(q, [x, y], () => .5)), false);
  }
});

test('a race: choose who starts, tap a reachable square, and I reply at once; taps elsewhere are refused', () => {
  const p = byId('rookrace-03');
  let b = at(p, [5, 2]);
  assert.equal(M.rookrace.move(p, b, {type: 'move', to: [4, 2]}), null, 'choose first');
  b = go(p, b, {type: 'choose', first: 'you'});
  assert.equal(M.rookrace.move(p, b, {type: 'choose', first: 'opponent'}), null, 'the choice is final');
  for (const to of [[4, 1], [6, 2], [5, 3], [5, 2], [3, 3], [8, 2]]) assert.equal(M.rookrace.move(p, b, {type: 'move', to}), null, `${to} is not a rook move`);
  b = go(p, b, {type: 'move', to: [2, 2]});
  assert.equal(b.turns.length, 2, 'the reply comes at once');
  assert.equal(b.turns[1].player, 'opponent');
  assert.match(view(p, {...freshAttempt(p), board: b}), /I moved \d+ (left|down)\. Your turn/);
  const html = M.rookrace.render(p, {board: b, hintLevel: 0});
  const targets = [...html.matchAll(/class="rr-cell[^"]*target[^"]*" data-x="(\d+)" data-y="(\d+)"/g)].map(m => `${m[1]},${m[2]}`);
  const [x, y] = b.at;
  assert.deepEqual(targets.sort(), [...Array.from({length: x}, (_, i) => `${i},${y}`), ...Array.from({length: y}, (_, j) => `${x},${j}`)].sort(), 'exactly the rook moves are buttons');
  // The queen also slides diagonally down and to the left.
  const queen = byId('rookrace-05');
  const qb = go(queen, at(queen, [5, 4]), {type: 'choose', first: 'you'});
  assert.ok(M.rookrace.move(queen, qb, {type: 'move', to: [2, 1]}), 'a diagonal slide');
  assert.equal(M.rookrace.move(queen, qb, {type: 'move', to: [4, 5]}), null, 'never up');
  assert.match(M.rookrace.render(queen, {board: qb, hintLevel: 0}), /aria-label="The token slides left, down, or diagonally down and to the left"/);
});

test('a wrong choice of who starts loses against perfect play, and empties the streak', () => {
  const p = byId('rookrace-03');
  for (const [start, first] of [[[4, 4], 'you'], [[5, 2], 'opponent']]) {
    let b = at(p, start, {streak: 0});
    b = go(p, b, {type: 'choose', first});
    for (let i = 0; i < 20 && !(b.at[0] === 0 && b.at[1] === 0); i++) b = go(p, b, {type: 'move', to: raceSolve(p, b).to}, i);
    assert.equal(b.turns.at(-1).player, 'opponent', `${start} with ${first} first is lost`);
    assert.equal(b.streak, 0);
  }
});

test('the streak: wins count only from new starts, a loss empties it, and the record replays every win', () => {
  const p = byId('rookrace-01'), r = seeded(4);
  let b = M.rookrace.fresh(p, r), wins = 0;
  while (!M.rookrace.solved(p, b)) {
    b = M.rookrace.move(p, b, raceSolve(p, b), r);
    if (b.first !== null && b.at[0] === 0 && b.at[1] === 0) { wins++; assert.equal(b.streak, wins); assert.equal(b.won.length, wins); }
  }
  assert.equal(b.streak, 3);
  assert.ok(validBoard(p, JSON.parse(JSON.stringify(b))), 'the finished save is valid');
  assert.equal(M.rookrace.move(p, b, {type: 'new'}), null, 'nothing after the solve');
  // Lose, then practise the same start: the win does not count.
  let c = go(p, at(p, [2, 2]), {type: 'choose', first: 'you'});
  c = go(p, c, {type: 'move', to: [0, 2]});
  assert.equal(c.turns.at(-1).player, 'opponent');
  assert.deepEqual(c.lost, [[2, 2]], 'a start lost after going first is remembered');
  c = go(p, c, {type: 'again'});
  assert.deepEqual(c.start, [2, 2]); assert.equal(c.fresh, false);
  c = go(p, c, {type: 'choose', first: 'opponent'});
  for (let i = 0; i < 10 && !(c.at[0] === 0 && c.at[1] === 0); i++) c = go(p, c, raceSolve(p, c), i);
  assert.equal(c.turns.at(-1).player, 'you');
  assert.equal(c.streak, 0, 'a practice win does not count');
  assert.match(M.rookrace.render(p, {board: c, hintLevel: 0}), /Wins count from a new start/);
  assert.equal(M.rookrace.move(p, c, {type: 'again'}), null, 'Same start again follows a loss only');
  const n = go(p, c, {type: 'new'});
  assert.notDeepEqual(n.start, [2, 2], 'a new start is new');
  assert.equal(n.fresh, true);
});

test('race hints are the authored nudges; the second rings the starts lost after going first', () => {
  const p = byId('rookrace-03');
  let b = go(p, at(p, [3, 3]), {type: 'choose', first: 'you'});
  b = go(p, b, {type: 'move', to: [0, 3]});
  const lost = {...freshAttempt(p), board: b, hintLevel: 1, moves: 2};
  assert.equal(nextHint(p, lost).type, 'note', 'after a loss the first nudge (Same start again) shows, not Try a new start');
  assert.match(view(p, lost), new RegExp(p.hints[0].replace(/[?.]/g, '.')));
  b = go(p, b, {type: 'new'});
  const a = {...freshAttempt(p), board: b, hintLevel: 2, moves: 4};
  assert.equal(nextHint(p, a).type, 'note');
  assert.match(view(p, a), new RegExp(p.hints[1].replace(/[?.]/g, '.')));
  assert.match(M.rookrace.render(p, a), /class="rr-cell lost (odd|even)" data-x="3" data-y="3"/);
  assert.doesNotMatch(M.rookrace.render(p, {...a, hintLevel: 1}), /rr-cell lost/);
  for (const h of p.hints) assert.doesNotMatch(h, /\bdiagonal\b|equal|copy/i, 'no hint names the rule');
});

test('every start on a board: marks, Play from a tapped square, That’s all; a wrong one is played out at once and clears the marks', () => {
  const p = byId('everystart-01'), q = p.parameters;
  let a = freshAttempt(p);
  assert.match(view(p, a), /That’s all<\/button>/);
  assert.match(M.everystart.render(p, a), /data-focus="es-all" disabled/, 'nothing marked, nothing to judge');
  assert.equal(move(p, a, {type: 'all'}), null);
  for (const s of [[1, 1], [2, 2], [3, 1]]) a = move(p, a, {type: 'mark', cell: cellOf(q, s)});
  a = move(p, a, {type: 'mark', cell: cellOf(q, [2, 2])});
  assert.deepEqual(a.board.marked, [cellOf(q, [1, 1]), cellOf(q, [3, 1])], 'a second tap clears');
  // Practice: Play, tap the square to start from (and change it), then choose who starts.
  let t = move(p, a, {type: 'try'});
  assert.equal(t.board.play.start, null);
  let html = M.everystart.render(p, t);
  assert.match(html, /Tap a square to start from\./);
  assert.equal([...html.matchAll(/<button type="button" class="rr-cell/g)].length, q.size ** 2 - 1, 'every square but the star is a start to tap');
  assert.equal(move(p, t, {type: 'choose', first: 'you'}), null, 'a start comes first');
  assert.equal(move(p, t, {type: 'start', cell: 0}), null, 'not the star');
  t = move(p, t, {type: 'start', cell: cellOf(q, [4, 2])});
  t = move(p, t, {type: 'start', cell: cellOf(q, [2, 2])});
  assert.equal(t.board.play.start, cellOf(q, [2, 2]), 'the start can change before the choice');
  t = move(p, t, {type: 'choose', first: 'opponent'}, seeded(2));
  assert.equal(t.board.play.turns[0].player, 'opponent');
  assert.equal(move(p, t, {type: 'start', cell: cellOf(q, [4, 2])}), null, 'not after the choice');
  assert.match(M.everystart.render(p, t), /I moved \d+ (left|down)\. Your turn/);
  t = move(p, t, {type: 'back'});
  assert.deepEqual(t.board.marked, a.board.marked, 'practice leaves the marks');
  // With a square missing, That's all says only "There is another.", even with a wrong mark.
  const partial = move(p, a, {type: 'all'});
  assert.deepEqual(partial.board.refused, {more: true});
  assert.equal(partial.board.play, null);
  // With every answer marked and a wrong one too: I go first from the wrong
  // start at once and win; then the marks are cleared.
  let full = a;
  for (let k = 2; k < q.size; k++) full = move(p, full, {type: 'mark', cell: cellOf(q, [k, k])});
  let w = move(p, full, {type: 'all'}, seeded(2));
  assert.deepEqual(w.board.refused, {wrong: cellOf(q, [3, 1])});
  assert.equal(w.board.play.kind, 'out');
  assert.equal(w.board.play.turns[0].player, 'opponent', 'the app goes first');
  html = M.everystart.render(p, w);
  assert.match(html, /Whoever starts from the ringed square can win\. I go first\./);
  assert.match(html, /rr-cell[^"]*flag[^"]*" data-x="3" data-y="1"/);
  assert.doesNotMatch(html, /data-focus="es-back"|Play it/, 'no way out of the play-out but to play it');
  assert.equal(move(p, w, {type: 'back'}), null);
  assert.deepEqual(w.board.marked, full.board.marked, 'the marks stay while the game is on');
  for (let i = 0; i < 20 && w.board.marked.length; i++) w = move(p, w, everyHint(p, w.board).action, seeded(i));
  assert.deepEqual(w.board.marked, [], 'when I win, the marks are cleared');
  assert.equal(w.board.play.turns.at(-1).player, 'opponent');
  assert.match(M.everystart.render(p, w), /reached the star\. The marks are cleared\./);
  w = move(p, w, {type: 'back'});
  assert.deepEqual(w.board, M.everystart.fresh(p), 'back to an empty board');
  // A wrong mark one move from the star: the play-out ends at once.
  const near = move(p, move(p, full, {type: 'mark', cell: cellOf(q, [3, 1])}), {type: 'mark', cell: cellOf(q, [0, 3])});
  assert.deepEqual(judge(q, near.board.marked), {wrong: cellOf(q, [0, 3])});
  const ended = move(p, near, {type: 'all'}, seeded(1));
  assert.deepEqual(ended.board.marked, []);
  assert.equal(ended.board.play.turns.length, 1);
  // A missing start: "There is another.", until the marks change.
  a = move(p, a, {type: 'mark', cell: cellOf(q, [3, 1])});
  a = move(p, a, {type: 'all'});
  assert.deepEqual(a.board.refused, {more: true});
  assert.equal(a.board.play, null);
  assert.equal(move(p, a, {type: 'all'}), null, 'That’s all waits for a change');
  assert.match(M.everystart.render(p, a), /There is another\./);
  assert.doesNotMatch(M.everystart.render(p, a), /\b[1-9] (more|left|to go)\b/, 'no count');
  for (let k = 2; k < q.size; k++) a = move(p, a, {type: 'mark', cell: cellOf(q, [k, k])});
  a = move(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board) && a.board.done);
});

test('every start with piles: set, Keep, a second Keep says so, take off, practise, a wrong That’s all clears the shelf, and That’s all', () => {
  const p = byId('everystart-03');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {build: [1, 1, 1], shelf: [], told: null, refused: null, play: null, done: false});
  a = move(p, a, {type: 'set', pile: 0, n: 3}); a = move(p, a, {type: 'set', pile: 1, n: 2});
  a = move(p, a, {type: 'set', pile: 2, n: 1});
  a = move(p, a, {type: 'keep'});
  assert.deepEqual(a.board.shelf, ['1,2,3'], 'the order of the piles does not matter');
  a = move(p, a, {type: 'keep'});
  assert.equal(a.board.told, 'again');
  const shown = M.everystart.render(p, a);
  assert.match(shown, /Already on the shelf\./);
  assert.ok(shown.indexOf('es-note') < shown.indexOf('es-shelf'), 'the line sits above the shelf, by the buttons');
  a = move(p, a, {type: 'set', pile: 0, n: 2}); a = move(p, a, {type: 'set', pile: 1, n: 2});
  a = move(p, a, {type: 'keep'});
  // Practice from the start being built: choose who starts, and I play perfectly.
  let t = move(p, a, {type: 'try'});
  assert.deepEqual(t.board.play.start, [2, 2, 1]);
  t = move(p, t, {type: 'choose', first: 'you'});
  t = move(p, t, {type: 'take', pile: 3, take: 1}, seeded(3));
  assert.match(M.everystart.render(p, t), /I took \d from the (left|middle|right) pile\. Your turn/);
  assert.equal(move(p, t, {type: 'take', pile: 1, take: 9}), null);
  t = move(p, t, {type: 'back'});
  assert.deepEqual(t.board.shelf, a.board.shelf);
  // With starts missing, That's all says only "There is another.".
  assert.deepEqual(move(p, a, {type: 'all'}).board.refused, {more: true});
  // With every answer kept and 1, 2 and 2 too: I go first from it and win; then the shelf is cleared.
  let full = a;
  for (const start of ['1,4,5', '2,4,6', '3,5,6']) {
    start.split(',').forEach((n, i) => { full = move(p, full, {type: 'set', pile: i, n: Number(n)}); });
    full = move(p, full, {type: 'keep'});
  }
  let w = move(p, full, {type: 'all'}, seeded(3));
  assert.deepEqual(w.board.refused, {wrong: '1,2,2'});
  assert.deepEqual(w.board.play.start, [1, 2, 2]);
  assert.match(M.everystart.render(p, w), /Whoever starts from 1, 2 and 2 can win\. I go first\./);
  for (let i = 0; i < 20 && w.board.shelf.length; i++) w = move(p, w, everyHint(p, w.board).action, seeded(i));
  assert.deepEqual(w.board.shelf, []);
  assert.match(M.everystart.render(p, w), /I took the last pebble\. The shelf is cleared\./);
  w = move(p, w, {type: 'back'});
  assert.deepEqual(w.board, {build: [3, 5, 6], shelf: [], told: null, refused: null, play: null, done: false}, 'the start being built stays');
  a = move(p, a, {type: 'drop', key: '1,2,2'});
  for (const start of ['1,4,5', '2,4,6', '3,5,6']) {
    start.split(',').forEach((n, i) => { a = move(p, a, {type: 'set', pile: i, n: Number(n)}); });
    a = move(p, a, {type: 'keep'});
  }
  a = move(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
});

test('hints alone finish every Every start puzzle, quickly, and name a wrong start first', () => {
  for (const p of json.puzzles.filter(p => p.mechanic === 'everystart')) {
    let a = freshAttempt(p);
    assert.equal(nextHint(p, a).type, 'move');
    let worst = 0;
    for (let i = 0; i < 300 && !isSolved(p, a.board); i++) {
      let hint; worst = Math.max(worst, cpuMs(() => { hint = nextHint(p, a); }));
      a = move(p, a, hint.action);
      assert.ok(a, `${p.id}: hint is legal`);
    }
    assert.ok(isSolved(p, a.board), p.id);
    assert.ok(worst < 50, `${p.id}: hints take ${worst} ms CPU`);
  }
  const p = byId('everystart-04'), q = p.parameters;
  const a = move(p, freshAttempt(p), {type: 'mark', cell: cellOf(q, [1, 1])});
  assert.deepEqual(everyHint(p, a.board).action, {type: 'mark', cell: cellOf(q, [1, 1])});
  assert.deepEqual(judge(q, [cellOf(q, [1, 1])]), {more: true}, 'a missing start is said first');
  assert.equal(judge(q, [...p.solution.cells, cellOf(q, [1, 1])]).wrong, cellOf(q, [1, 1]));
});

test('saves: a fresh race and a finished shelf are valid; forged ones are not', () => {
  const race = byId('rookrace-02');
  assert.ok(validBoard(race, JSON.parse(JSON.stringify(freshAttempt(race).board))));
  assert.equal(validBoard(race, {...freshAttempt(race).board, streak: 3}), false);
  const every = byId('everystart-02');
  assert.ok(validBoard(every, {build: [1, 1, 1], shelf: ['1,2,3'], told: null, refused: null, play: null, done: true}));
  assert.equal(validBoard(every, {build: [1, 1, 1], shelf: ['1,1,1'], told: null, refused: null, play: null, done: true}), false);
  assert.equal(validBoard(every, {build: [1, 1, 1], shelf: [], told: null, refused: null, play: null, done: true}), false);
  // A play-out keeps the shelf it judged until it ends, and only then clears it.
  const out = (shelf, turns) => ({build: [1, 1, 1], shelf, told: null, refused: {wrong: '1,1,2'}, play: {kind: 'out', start: [1, 1, 2], first: 'opponent', turns}, done: false});
  assert.ok(validBoard(every, out(['1,1,2', '1,2,3'], [{player: 'opponent', pile: 3, take: 2}])), 'I took 2: your turn');
  assert.equal(validBoard(every, out(['1,1,2'], [{player: 'opponent', pile: 3, take: 2}])), false, 'a wrong start is named only when nothing is missing');
  assert.ok(validBoard(every, out([], [{player: 'opponent', pile: 3, take: 2}, {player: 'you', pile: 1, take: 1}, {player: 'opponent', pile: 2, take: 1}])), 'over and cleared');
  assert.equal(validBoard(every, out(['1,1,2', '1,2,3'], [{player: 'opponent', pile: 3, take: 2}, {player: 'you', pile: 1, take: 1}, {player: 'opponent', pile: 2, take: 1}])), false, 'over but not cleared');
  assert.equal(validBoard(every, out([], [{player: 'opponent', pile: 3, take: 2}])), false, 'cleared before the end');
  assert.equal(validBoard(every, out(['1,1,2', '1,2,3'], [{player: 'opponent', pile: 3, take: 1}])), false, 'I never miss a win');
  assert.equal(validBoard(every, {...out(['1,2,3'], []), refused: {wrong: '1,2,3'}, play: {kind: 'out', start: [1, 2, 3], first: 'opponent', turns: []}}), false, 'only a first-player start is played out');
  const board = byId('everystart-01');
  assert.equal(validBoard(board, {marked: [7], refused: null, play: {kind: 'try', start: null, first: 'you', turns: []}, done: false}), false, 'a start before the choice');
  assert.ok(validBoard(board, {marked: [7], refused: {more: true}, play: {kind: 'try', start: null, first: null, turns: []}, done: false}));
  // Restart deals a fresh board; there is no Undo.
  assert.equal(M.rookrace.noUndo(race), true);
  assert.equal(M.everystart.noUndo(every), true);
  const done = {...freshAttempt(every), board: {build: [1, 1, 1], shelf: ['1,2,3'], told: null, refused: null, play: null, done: true}};
  assert.deepEqual(restart(every, done).board, freshAttempt(every).board);
});

test('small boards draw no one-move starts, half the starts are second-player ones, and Me first and You first look alike', () => {
  for (const id of ['rookrace-01', 'rookrace-02', 'rookrace-03']) {
    const q = byId(id).parameters, r = seeded(9);
    let losing = 0, near = 0;
    for (let i = 0; i < 2000; i++) { const s = drawSquare(q, r); if (!squareWins(q, s)) losing++; if (oneMove(q, s)) near++; }
    assert.ok(Math.abs(losing / 2000 - .5) < .05, `${id}: about half second-player starts`);
    if (q.size <= 5) assert.equal(near, 0, `${id}: no start one move from the star`);
    else assert.ok(near > 0, `${id}: one-move starts stay on bigger boards`);
  }
  const p = byId('rookrace-01'), html = M.rookrace.render(p, {board: M.rookrace.fresh(p, seeded(1)), hintLevel: 0});
  const looks = [...html.matchAll(/<button type="button" class="([^"]*)"[^>]*data-focus="rr-choose-(?:you|opponent)"/g)].map(m => m[1]);
  assert.equal(looks.length, 2);
  assert.equal(looks[0], looks[1], 'neither choice looks like the default');
  for (const q of json.puzzles) assert.equal(q.proof, true, `${q.id}: How to play leaves out the grown-ups’ notes, which hold the answer`);
});

test('rendering: compact boards, the move key, labels for every square, and no count anywhere', () => {
  for (const p of json.puzzles) {
    const a = freshAttempt(p, seeded(5)), html = view(p, a);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    assert.doesNotMatch(html, new RegExp(p.title), `${p.id}: no title on the play screen`);
    if (p.parameters.kind !== 'piles') {
      assert.match(html, /class="rr-key"/);
      const cells = [...M[p.mechanic].render(p, a).matchAll(/class="rr-cell/g)].length;
      assert.equal(cells, p.parameters.size ** 2);
    } else assert.equal([...html.matchAll(/class="es-slot[ "]/g)].length, 3 * p.parameters.max);
    assert.doesNotMatch(M[p.mechanic].render(p, a), /\bof (4|5|7|8|6)\b(?! wins)/, `${p.id}: no answer count`);
  }
});

test('the puzzles sit in Pebble Duel as the Star race and Every start groups, below its levels', () => {
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, pack.puzzles);
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  const family = nim.slice(0, nim.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Star race</h2>'));
  assert.ok(family.indexOf('<h2>Hard</h2>') < family.indexOf('<h2>Every start</h2>'));
  assert.match(family, /aria-label="Pebble Duel, Star race, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="rookrace-/g)].length, 5);
  assert.equal([...family.matchAll(/data-id="everystart-/g)].length, 6);
  for (const p of json.puzzles) assert.equal(mechanicFor(p), M[p.mechanic]);
});

test('Duel 1 sits early in Pebble Duel’s Next flow: puzzle 2, then Duel 1, then puzzle 3', () => {
  const solvedView = id => {
    const p = byId(id);
    let a = freshAttempt(p, seeded(6));
    for (let i = 0; i < 400 && !isSolved(p, a.board); i++) {
      const action = p.mechanic === 'duel' ? mechanicFor(p).solve(p, a.board) : nextHint(p, a).action;
      a = move(p, a, action, seeded(i));
    }
    assert.ok(isSolved(p, a.board), id);
    return view(p, {...a, completed: true});
  };
  assert.match(solvedView('nim-02'), /data-action="open-puzzle"[^>]*data-id="proof-duel-01"/);
  assert.match(solvedView('proof-duel-01'), /data-action="open-puzzle"[^>]*data-id="nim-03"/);
  assert.match(solvedView('nim-03'), /data-action="open-puzzle"[^>]*data-id="nim-04"/, 'the rest of the flow is unchanged');
});
