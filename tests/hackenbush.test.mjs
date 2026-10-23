// Pebble Duel's Stalks group (dist/families/hackenbush/hackenbush.js): the
// search against the stalks' numbers, the perfect opponent, a cut by one tap
// and everything above it falling, Undo taking back a cut with my reply, the
// duels that hinge on one cut, every reply, boards with a choice of colour or
// Go second (and the start I may give for each), rounds and their streak,
// building a balance with Check, its play-out and its lock, hints, saves,
// rendering, the satchel group and CPU time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, undoPress, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {hackenbushMechanics as M, wins, winningMoves, outcome, value, stalkValue, opponentMove, moves, after, firstCuts, assignments, bestClaim, boardPool, drawStart, gameSolve, buildHint, balancingBuilds, replay} from '../dist/families/hackenbush/hackenbush.js';
import {seeded} from '../scripts/validate-hackenbush.mjs';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/hackenbush/hackenbush.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => json.puzzles.find(p => p.id === id);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const cpuMs = f => { const t = process.cpuUsage(); f(); const u = process.cpuUsage(t); return (u.user + u.system) / 1000; };
const stalksUpTo = h => { const out = ['']; for (let n = 1; n <= h; n++) for (let c = 0; c < 2 ** n; c++) out.push(Array.from({length: n}, (_, i) => (c >> i) & 1 ? 'R' : 'B').join('')); return out; };
// The segments on the screen: stalk, segment, colour, and whether it is a button.
const segments = html => [...html.matchAll(/<(button|span) (?:type="button" )?class="hb-seg ([BR])([^"]*)" data-s="(\d+)" data-k="(\d+)"/g)].map(m => ({button: m[1] === 'button', colour: m[2], cls: m[3], s: Number(m[4]), k: Number(m[5])}));
const fell = html => [...html.matchAll(/class="hb-seg ([BR]) fell( cut)?"/g)].map(m => m[1] + (m[2] ? '*' : '')).join('');
const actions = html => [...html.matchAll(/<button type="button" class="([^"]*hb-button[^"]*)" data-action="expansion-move" data-move="([^"]*)"[^>]*?( disabled)?>/g)].map(m => ({cls: m[1], action: JSON.parse(unesc(m[2])), disabled: Boolean(m[3])}));
const status = html => unesc(html.match(/<p class="hb-status"[^>]*>(.*?)<\/p>/)[1].replace(/<[^>]+>/g, ''));

test('the search agrees with the stalks’ numbers: Blue wins whoever starts when positive, Red when negative, the second player when zero', () => {
  const stalks = stalksUpTo(3);
  for (const a of stalks) for (const b of stalks) for (const c of stalks) {
    const pos = [a, b, c];
    if (!pos.some(Boolean)) continue;
    const v = value(pos);
    assert.equal(outcome(pos), v > 0 ? 'B' : v < 0 ? 'R' : 'second', `${pos}`);
  }
  assert.deepEqual(['B', 'R', 'BR', 'BRR', 'RB', 'BRB', 'RBB', 'BBR'].map(stalkValue), [1, -1, 1 / 2, 1 / 4, -1 / 2, 3 / 4, -1 / 4, 3 / 2]);
  // The worksheet's balances, and the boards that do not balance.
  assert.equal(outcome(['BR', 'BR', 'R']), 'second');
  assert.equal(outcome(['BR', 'BR', 'BR', 'R']), 'B');
  assert.equal(outcome(['BRR', 'BRR', 'RB']), 'second');
  assert.equal(outcome(['BR', 'BR', 'RB']), 'B');
  assert.equal(outcome(['BRR', 'RB']), 'R');
  // A cut leaves the segments below it; one on the ground takes the stalk.
  assert.deepEqual(after(['BRB', 'R'], {stalk: 0, at: 1}), ['B', 'R']);
  assert.deepEqual(after(['BRB', 'R'], {stalk: 0, at: 0}), ['', 'R']);
  assert.deepEqual(moves(['BRB', 'R'], 'B'), [{stalk: 0, at: 0}, {stalk: 0, at: 2}]);
});

test('the opponent never misses a win and, when losing, leaves the fewest winning replies', () => {
  for (const pos of [['BB', 'R'], ['BR', 'BR', 'R'], ['BRR', 'BRR', 'RB'], ['BRB', 'RR', 'B']]) for (const colour of ['B', 'R']) {
    for (const r of [0, .3, .7, .999]) {
      const m = opponentMove(pos, colour, () => r), to = after(pos, m);
      if (wins(pos, colour)) assert.equal(wins(to, colour === 'B' ? 'R' : 'B'), false, `${pos} ${colour}`);
      else {
        const replies = q => winningMoves(q, colour === 'B' ? 'R' : 'B').length;
        assert.equal(replies(to), Math.min(...moves(pos, colour).map(x => replies(after(pos, x)))), `${pos} ${colour}: fewest winning replies`);
      }
    }
  }
});

test('BB and R: the low cut drops your own segment and loses; Undo takes back the cut and my reply; the top cut wins', () => {
  const p = byId('hackenbush-01');
  let a = freshAttempt(p);
  let html = M.stalks.render(p, a);
  // Only the child's (blue) segments are buttons.
  assert.deepEqual(segments(html).map(s => `${s.colour}${s.button ? '!' : ''}`), ['B!', 'B!', 'R']);
  assert.equal(status(html), 'Your turn');
  assert.match(html, /aria-label="You are Blue\. I am Red\."/);
  a = move(p, a, {type: 'cut', stalk: 0, at: 0}, seeded(1));
  assert.deepEqual(a.board.pos, ['', '']);
  html = M.stalks.render(p, a);
  assert.equal(status(html), 'You have nothing to cut. I win.');
  assert.equal(fell(html), 'R*', 'my cut is drawn as what fell');
  assert.equal(nextHint(p, a).type, 'deadend');
  a = undo(a);
  assert.deepEqual(a.board, freshAttempt(p).board, 'Undo takes back the cut and my reply');
  assert.equal(move(p, a, {type: 'cut', stalk: 1, at: 0}), null, 'Red is not yours to cut');
  a = move(p, a, {type: 'cut', stalk: 0, at: 1}, seeded(1));
  assert.deepEqual(a.board.pos, ['B', ''], 'I had to cut my only segment');
  assert.equal(fell(M.stalks.render(p, a)), 'R*');
  a = move(p, a, {type: 'cut', stalk: 0, at: 0}, seeded(1));
  assert.ok(isSolved(p, a.board));
  assert.equal(status(M.stalks.render(p, a)), 'I have nothing to cut. You win.');
  assert.equal(M.stalks.noUndo(p), false);
});

test('BR and R, and BRR and RB: as Red first, only the cut that leaves a balance wins', () => {
  for (const [id, win] of [['hackenbush-03', '0:1'], ['hackenbush-05', '0:2']]) {
    const p = byId(id), q = p.parameters;
    for (const m of moves(q.start, 'R')) {
      const a = move(p, freshAttempt(p), {type: 'cut', ...m}, seeded(1));
      const good = `${m.stalk}:${m.at}` === win;
      assert.equal(outcome(after(q.start, m)), good ? 'second' : 'B', `${id} ${m.stalk}:${m.at}`);
      if (!good) assert.equal(nextHint(p, a).type, 'deadend', `${id}: after a losing cut`);
    }
  }
});

test('four boards: Blue or Red lets me choose who starts, Go second lets me choose my colour; win on each board', () => {
  const p = byId('hackenbush-02');
  assert.deepEqual(assignments(['B', 'R'], 'B'), [{colour: 'B', first: 'you'}], 'Blue on a balanced board: you start');
  assert.deepEqual(assignments(['B', 'R'], 'second'), [{colour: 'B', first: 'opponent'}, {colour: 'R', first: 'opponent'}]);
  assert.deepEqual(assignments(['BB', 'R'], 'second'), [{colour: 'R', first: 'opponent'}], 'Go second: I take the colour that wins going first');
  assert.deepEqual(assignments(['BB', 'R'], 'B').map(x => x.first).sort(), ['opponent', 'you'], 'Blue wins both ways: either start');
  assert.deepEqual(p.parameters.boards.map(bestClaim), ['B', 'R', 'second', 'B']);
  let a = freshAttempt(p);
  let html = M.stalks.render(p, a);
  assert.deepEqual(actions(html).map(x => x.action.claim), ['B', 'R', 'second']);
  assert.match(html, /aria-label="0 of 4 boards won"/);
  assert.equal(status(html), '');
  assert.equal(move(p, a, {type: 'cut', stalk: 0, at: 0}), null, 'a choice comes first');
  // B: Red loses whatever I do.
  a = move(p, a, {type: 'claim', claim: 'R'}, seeded(1));
  assert.equal(move(p, a, {type: 'claim', claim: 'B'}), null, 'the choice is final');
  for (let i = 0; i < 5 && replay(a.board).winner === null; i++) a = move(p, a, gameSolve(p, a.board), seeded(i));
  assert.equal(replay(a.board).winner, 'opponent');
  html = M.stalks.render(p, a);
  assert.deepEqual(actions(html).map(x => x.action.type), ['again']);
  a = move(p, a, {type: 'again'});
  assert.equal(a.board.claim, null);
  // Then the right choice on each board.
  for (let i = 0; i < 40 && !isSolved(p, a.board); i++) a = move(p, a, gameSolve(p, a.board), seeded(i));
  assert.ok(isSolved(p, a.board));
  assert.equal(a.board.won.length, 3);
  assert.ok(M.stalks.noUndo(p), 'boards hide Undo: a choice is final');
});

test('every reply: go second from BR, BR and R against each of my three first cuts, in my colour', () => {
  const p = byId('hackenbush-04');
  const cuts = firstCuts(p.parameters.start);
  assert.deepEqual(cuts, [{colour: 'B', stalk: 0, at: 0}, {colour: 'R', stalk: 0, at: 1}, {colour: 'R', stalk: 2, at: 0}]);
  let a = freshAttempt(p);
  assert.equal(a.board.colour, 'R', 'Blue cut first, so you are Red');
  assert.equal(fell(M.stalks.render(p, a)), 'B*R', 'the whole BR fell');
  // A losing reply: Try again replays the same first cut.
  a = move(p, a, {type: 'cut', stalk: 2, at: 0}, seeded(1));
  for (let i = 0; i < 6 && replay(a.board).winner === null; i++) a = move(p, a, gameSolve(p, a.board), seeded(i));
  assert.equal(replay(a.board).winner, 'opponent');
  a = move(p, a, {type: 'again'});
  assert.equal(a.board.round, 0);
  for (let round = 0; round < 3; round++) {
    assert.equal(a.board.colour, cuts[round].colour === 'B' ? 'R' : 'B');
    for (let i = 0; i < 8 && replay(a.board).winner === null; i++) a = move(p, a, gameSolve(p, a.board), seeded(i));
    assert.equal(replay(a.board).winner, 'you');
    if (round < 2) { assert.match(M.stalks.render(p, a), new RegExp(`aria-label="${round + 1} of 3 first cuts answered"`)); a = move(p, a, {type: 'next'}); }
  }
  assert.ok(isSolved(p, a.board));
});

test('rounds: choose, win three in a row from new boards; a loss empties the streak, a practice win does not count', () => {
  const p = byId('hackenbush-08'), q = p.parameters, m = M.stalks;
  const pool = boardPool(q);
  assert.equal(pool.length, 490);
  assert.ok(pool.every(s => outcome(s) !== 'first'));
  const balanced = pool.find(s => outcome(s) === 'second');
  let b = {...m.fresh(p, seeded(1)), start: balanced, pos: [...balanced]};
  assert.ok(m.valid(p, b));
  // Blue on a balanced board: you start, and I win.
  b = m.move(p, b, {type: 'claim', claim: 'B'}, seeded(2));
  assert.equal(b.first, 'you');
  for (let i = 0; i < 12 && replay(b).winner === null; i++) b = m.move(p, b, gameSolve(p, b), seeded(i));
  assert.equal(replay(b).winner, 'opponent');
  assert.equal(b.streak, 0);
  const html = m.render(p, {board: b, hintLevel: 0});
  assert.deepEqual(actions(html).map(x => x.action.type), ['again', 'new']);
  // Same board again is practice: winning it does not count.
  b = m.move(p, b, {type: 'again'}, seeded(3));
  assert.equal(b.fresh, false);
  for (let i = 0; i < 12 && replay(b).winner === null; i++) b = m.move(p, b, gameSolve(p, b), seeded(i));
  assert.equal(replay(b).winner, 'you');
  assert.equal(b.streak, 0);
  assert.match(status(m.render(p, {board: b, hintLevel: 0})), /Wins count from a new board\.$/);
  // Three wins from new boards.
  for (let i = 0; i < 80 && !m.solved(p, b); i++) b = m.move(p, b, gameSolve(p, b), seeded(10 + i));
  assert.ok(m.solved(p, b));
  assert.equal(b.won.length, 3);
  const r = seeded(4), kinds = {B: 0, R: 0, second: 0};
  for (let i = 0; i < 300; i++) kinds[outcome(drawStart(q, r))]++;
  assert.ok(kinds.second > 70 && kinds.B > 70 && kinds.R > 70, JSON.stringify(kinds));
});

test('building a balance: add and take off segments, Check; a board that does not balance is played out, and Check waits for a change', () => {
  const p = byId('hackenbush-06'), m = M.stalkbuild;
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {built: ['', ''], play: null, checked: false, done: false});
  let html = m.render(p, a);
  assert.equal([...html.matchAll(/class="hb-add [BR]/g)].length, 4, 'two + buttons a spot');
  const addRow = html.slice(html.indexOf('<div class="hb-addrow"'));
  assert.equal([...addRow.matchAll(/class="hb-add [BR]/g)].length, 4, 'the + buttons are in their own row under the ground, not on the stacks');
  assert.equal([...addRow.matchAll(/class="hb-adds given"/g)].length, 1, 'a blank cell under the given stalk keeps the columns lined up');
  assert.equal(M.stalkbuild.noUndo, undefined, 'builds have Undo');
  assert.deepEqual(segments(html).map(s => `${s.colour}${s.button ? '!' : ''}`), ['B', 'R', 'B'], 'the given stalk is fixed');
  for (const c of 'RBRB') a = move(p, a, {type: 'add', slot: 0, colour: c});
  assert.equal(move(p, a, {type: 'add', slot: 0, colour: 'R'}), null, 'a spot holds four');
  assert.equal([...m.render(p, a).matchAll(/data-focus="hb-add-0-[BR]"[^>]*disabled/g)].length, 2, 'a full spot keeps its + buttons, off');
  assert.equal(a.history.length, 4, 'each add is a step for Undo');
  assert.deepEqual(undo(a).board.built, ['RBR', ''], 'Undo takes back the last add');
  a = move(p, a, {type: 'cut', stalk: 1, at: 3});
  assert.deepEqual(a.board.built, ['RBR', '']);
  a = move(p, a, {type: 'cut', stalk: 1, at: 1});
  assert.deepEqual(a.board.built, ['R', ''], 'taking a segment off takes everything above it');
  assert.equal(move(p, a, {type: 'cut', stalk: 0, at: 0}), null, 'the given stalk stays');
  // BRB and R: Red is ahead, so I play Red and go first.
  a = move(p, a, {type: 'check'}, seeded(1));
  assert.equal(a.board.checked, true);
  assert.equal(a.board.play.colour, 'B');
  html = m.render(p, a);
  assert.match(html, /I can win going first\./);
  assert.match(html, /aria-label="You are Blue\. I am Red\."/);
  for (let i = 0; i < 6 && !/Back/.test(m.render(p, a)); i++) a = move(p, a, buildHint(p, a.board).action, seeded(i));
  assert.match(status(m.render(p, a)), /^You have nothing to cut\. I win\./);
  const over = a;
  a = move(p, a, {type: 'back'});
  assert.deepEqual(a.board, {built: ['R', ''], play: null, checked: true, done: false});
  assert.equal(actions(m.render(p, a)).find(x => x.action.type === 'check').disabled, true, 'Check waits for a change');
  assert.deepEqual(undoPress(p, a, x => view(p, x)).board, over.board, 'Undo takes back Back');
  // Undo through the play-out back to the board as checked keeps Check off.
  let u = over;
  while (u.board.play) u = undoPress(p, u, x => view(p, x));
  assert.deepEqual(u.board, {built: ['R', ''], play: null, checked: true, done: false}, 'Undo past Check keeps Check waiting');
  assert.ok(validBoard(p, u.board));
  u = undoPress(p, u, x => view(p, x));
  assert.deepEqual(u.board, {built: ['RBR', ''], play: null, checked: false, done: false}, 'and the take-off before it is a change');
  assert.equal(move(p, a, {type: 'check'}), null);
  a = move(p, a, {type: 'add', slot: 1, colour: 'B'});
  for (const c of 'RR') a = move(p, a, {type: 'add', slot: 1, colour: c});
  assert.deepEqual(a.board.built, ['R', 'BRR']);
  a = move(p, a, {type: 'check'});
  assert.ok(isSolved(p, a.board), 'R and BRR balance BRB');
  // The pack's balances are every fill the search accepts.
  assert.equal(balancingBuilds(p.parameters).length, p.solution.count);
});

test('hints point to a winning cut or the nearest balance without naming a number; hints alone finish every puzzle', () => {
  for (const p of json.puzzles) {
    assert.doesNotMatch(p.hints[0], /\d\s*\/\s*\d|half|quarter|worth|number|value|zero/i, `${p.id}: the first hint names no number`);
    let a = freshAttempt(p, seeded(3)), worst = 0;
    for (let i = 0; i < 400 && !isSolved(p, a.board); i++) {
      let h; worst = Math.max(worst, cpuMs(() => { h = nextHint(p, a); }));
      if (h.type === 'note') { a = move(p, a, gameSolve(p, a.board), seeded(i)); continue; }
      if (h.type === 'deadend') { a = undo(a); continue; }
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = move(p, a, h.action, seeded(i));
      assert.ok(a, `${p.id}: the hint is legal`);
    }
    assert.ok(isSolved(p, a.board), p.id);
    assert.ok(worst < 50, `${p.id}: hints take ${worst} ms CPU`);
  }
  const p = byId('hackenbush-01');
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Some cut wins from here. What would you like to leave me?');
  // From the second press, the stalk of a winning cut is ringed; never in a round.
  const ringed = level => [...M.stalks.render(p, {...freshAttempt(p), hintLevel: level}).matchAll(/class="hb-stalk hinted" data-stalk="(\d+)"/g)].map(x => Number(x[1]));
  assert.deepEqual(ringed(1), []); assert.deepEqual(ringed(2), [0]);
  const round = byId('hackenbush-08');
  const going = M.stalks.move(round, {...M.stalks.fresh(round, seeded(1)), start: ['B', 'R', 'BR'], pos: ['B', 'R', 'BR']}, {type: 'claim', claim: 'B'}, seeded(1));
  assert.doesNotMatch(M.stalks.render(round, {board: going, hintLevel: 3}), /hinted/);
  // Boards: from the second press the winning choice is ringed.
  const boards = byId('hackenbush-02');
  assert.match(M.stalks.render(boards, {...freshAttempt(boards), hintLevel: 2}), /hb-claim B hb-button hinted/);
  // A build: the nearest balance is the swap in the left spot.
  const build = byId('hackenbush-06');
  assert.deepEqual(nextHint(build, freshAttempt(build)).action, {type: 'add', slot: 0, colour: 'R'});
  let b = move(build, freshAttempt(build), {type: 'add', slot: 1, colour: 'R'});
  b = move(build, b, {type: 'add', slot: 1, colour: 'B'});
  assert.deepEqual(nextHint(build, b).action, {type: 'add', slot: 1, colour: 'R'}, 'RB in a spot is kept: one more R makes the swap');
  b = move(build, b, {type: 'add', slot: 1, colour: 'B'});
  assert.deepEqual(nextHint(build, b).action, {type: 'add', slot: 0, colour: 'R'}, 'RBB is kept: RB in the other spot balances it');
});

test('saves: fresh boards are valid; forged wins, choices, streaks and builds are not; Restart sets up again', () => {
  for (const p of json.puzzles) assert.ok(validBoard(p, JSON.parse(JSON.stringify(freshAttempt(p, seeded(2)).board))), p.id);
  const duel = byId('hackenbush-01');
  assert.equal(validBoard(duel, {start: ['BB', 'R'], pos: ['', ''], colour: 'B', first: 'you', turns: []}), false);
  assert.equal(validBoard(duel, {start: ['BB', 'R'], pos: ['B', ''], colour: 'B', first: 'you', turns: [{player: 'you', stalk: 0, at: 1}, {player: 'opponent', stalk: 1, at: 0}]}), true);
  assert.equal(validBoard(duel, {start: ['BB', 'R'], pos: ['', 'R'], colour: 'B', first: 'you', turns: [{player: 'you', stalk: 1, at: 0}]}), false, 'a cut of the other colour');
  const boards = byId('hackenbush-02');
  assert.equal(validBoard(boards, {...freshAttempt(boards).board, round: 3, start: ['BB', 'R'], pos: ['BB', 'R']}), false, 'boards cannot be skipped');
  const rounds = byId('hackenbush-08');
  assert.equal(validBoard(rounds, {...freshAttempt(rounds, seeded(1)).board, streak: 3}), false);
  const build = byId('hackenbush-06');
  assert.equal(validBoard(build, {built: ['R', ''], play: null, checked: false, done: true}), false, 'a forged balance');
  assert.ok(validBoard(build, {built: ['RBR', ''], play: null, checked: false, done: true}));
  const done = {...freshAttempt(build), board: {built: ['RBR', ''], play: null, checked: false, done: true}};
  assert.deepEqual(restart(build, done).board, freshAttempt(build).board);
});

test('rendering: no title on the play screen, How to play opens with the move, every segment labelled, no number named', () => {
  for (const p of json.puzzles) {
    const a = freshAttempt(p, seeded(5)), html = view(p, a), board = M[p.mechanic].render(p, a);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    assert.doesNotMatch(html, new RegExp(`>${p.title}<`), `${p.id}: no title on the play screen`);
    assert.match(p.controls, /^Blue cuts one blue segment and Red one red segment; everything above a cut falls off\./);
    assert.match(board, /data-mechanic-wire="(stalks|stalkbuild)"/);
    for (const m of board.matchAll(/class="hb-seg [BR][^"]*"[^>]*aria-label="([^"]*)"/g)) assert.match(m[1], /^(Stalk|Spot) \d+, (blue|red) segment \d+ of \d+/);
    assert.doesNotMatch(board, /\d\s*\/\s*\d|half|quarter/i, `${p.id}: no number on the board`);
  }
});

test('the puzzles sit in Pebble Duel as the Stalks group, after Buckets', () => {
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, pack.puzzles);
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  const family = nim.slice(0, nim.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Buckets</h2>') < family.indexOf('<h2>Stalks</h2>'));
  assert.match(family, /aria-label="Pebble Duel, Stalks, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="hackenbush-/g)].length, 9);
  for (const p of json.puzzles) assert.equal(mechanicFor(p), M[p.mechanic]);
});

test('taps are quick: a cut with my reply, a hint and a render', () => {
  for (const p of json.puzzles.filter(p => p.mechanic === 'stalks')) {
    let b = M.stalks.fresh(p, seeded(1));
    if (b.first === null) b = M.stalks.move(p, b, {type: 'claim', claim: bestClaim(b.start)}, seeded(1));
    if (replay(b).winner !== null) continue;
    const ms = cpuMs(() => { const n = M.stalks.move(p, b, gameSolve(p, b), seeded(2)); M.stalks.render(p, {board: n || b, hintLevel: 2}); M.stalks.hint(p, b); });
    assert.ok(ms < 100, `${p.id}: ${ms} ms CPU`);
  }
  const build = byId('hackenbush-09');
  assert.ok(cpuMs(() => buildHint(build, {built: ['RBRB', 'BRBR'], play: null, checked: false, done: false})) < 100);
});
