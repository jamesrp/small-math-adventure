// Pebble Duel's Buckets group (dist/families/buckets/buckets.js): the rule and
// its single repair move, the perfect opponent and its longest games, a move
// built by taps (take, add on the left, End turn) and taken back by Undo as
// one move with my reply, the duels that hinge on refilling nothing or two
// buckets, every reply, who-starts rounds and their streak, Every start with
// That's all, its lock and the play-out of a wrong card, the take-1-to-3
// encore, hints, saves, rendering, the satchel group and CPU time.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo, restart} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {libraryView} from '../dist/caravan-ui.js';
import {bucketMechanics as M, moverWins, winningMoves, opponentMove, longest, moves, after, startPool, drawStart, judge, cardStart, secondCards, gameSolve, sortHint} from '../dist/families/buckets/buckets.js';
import {seeded} from '../scripts/validate-buckets.mjs';
import {loadPack} from '../scripts/packs.mjs';

const json = JSON.parse(await readFile(new URL('../dist/families/buckets/buckets.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const byId = id => json.puzzles.find(p => p.id === id) || pack.puzzles.find(p => p.id === id);
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const unesc = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const cpuMs = f => { const t = process.cpuUsage(); f(); const u = process.cpuUsage(t); return (u.user + u.system) / 1000; };
const box = (n, max) => n === 0 ? [[]] : box(n - 1, max).flatMap(s => Array.from({length: max + 1}, (_, c) => [...s, c]));
// The buckets on the screen: for each, whether it is a button and the move its tap stores.
function buckets(html) {
  return [...html.matchAll(/<(button|span) type="button" class="(fb-bucket[^"]*)" data-i="(\d+)" data-action="mechanic-ui" data-ui="([^"]*)"|<span class="(fb-bucket[^"]*)" data-i="(\d+)" role="img"/g)]
    .map(m => m[1] ? {i: Number(m[3]), cls: m[2], ui: JSON.parse(unesc(m[4]))} : {i: Number(m[6]), cls: m[5], ui: null});
}
// Tap bucket i (1 is the leftmost) as the screen does: store what the button carries, then draw again.
function tap(p, a, i) {
  const b = buckets(M[p.mechanic].render(p, a)).find(x => x.i === i - 1);
  assert.ok(b?.ui, `bucket ${i} is a button`);
  M[p.mechanic].ui(p, b.ui);
  return M[p.mechanic].render(p, a);
}
const endTurn = html => {
  const m = html.match(/<button type="button" class="primary fb-button" data-action="expansion-move" data-move="([^"]*)" data-focus="fb-move" (disabled)?/);
  assert.ok(m, 'End turn is drawn');
  return {action: JSON.parse(unesc(m[1])), disabled: Boolean(m[2])};
};

test('the rule: the second player wins exactly when every bucket is even, and from any other start one move wins', () => {
  for (const [q, n, max] of [[{cap: 1}, 3, 4], [{cap: 1}, 4, 2]]) for (const pos of box(n, max)) {
    assert.equal(moverWins(q, pos), pos.some(c => c % 2), `${pos}`);
    if (moverWins(q, pos)) {
      const [win, ...more] = winningMoves(q, pos), j = pos.findLastIndex(c => c % 2);
      assert.equal(more.length, 0, `${pos}: one winning move`);
      assert.deepEqual(win, {from: j + 1, take: 1, add: pos.map((c, i) => i < j ? c % 2 : 0)}, `${pos}: from the rightmost odd bucket, topping up the odd ones on its left`);
    }
  }
  // The encore: takes of 1 to 3 and adds of up to 3, multiples of 4; adds of 1 or 2 are not enough.
  for (const pos of box(2, 8)) assert.equal(moverWins({cap: 3, takes: 3}, pos), pos.some(c => c % 4), `${pos}`);
  for (const cap of [1, 2]) assert.equal(moverWins({cap, takes: 3}, [1, 1]), false, `adds of ${cap}: 1 and 1 is a second-player start`);
  // A game ends: the longest one reads the buckets in base cap + 1.
  assert.equal(longest({cap: 1}, [0, 0, 1]), 4);
  assert.equal(longest({cap: 3}, [5, 5]), 25);
});

test('the opponent never misses a win and, when losing, makes the game as long as it can', () => {
  for (const q of [{cap: 1, takes: 1}, {cap: 3, takes: 3}]) for (const pos of box(q.cap > 1 ? 2 : 3, q.cap > 1 ? 7 : 3)) {
    if (pos.every(c => !c)) continue;
    for (const r of [0, .5, .99]) {
      const m = opponentMove(q, pos, () => r), to = after(pos, m);
      if (moverWins(q, pos)) assert.equal(moverWins(q, to), false, `${pos}`);
      else {
        assert.equal(winningMoves(q, to).length, 1, `${pos}: every losing move leaves one winning reply`);
        assert.equal(longest(q, to), Math.max(...moves(q, pos).map(x => longest(q, after(pos, x)))), `${pos}: a longest game`);
      }
    }
  }
});

test('a move by taps: take from a bucket, add to buckets on its left, End turn; I reply at once and Undo takes back both', () => {
  const p = byId('buckets-02');
  M.buckets.reset(p);
  let a = freshAttempt(p);
  let html = M.buckets.render(p, a);
  assert.ok(endTurn(html).disabled, 'nothing to end before a tap');
  assert.deepEqual(buckets(html).map(b => b.ui !== null), [true, true, true], 'every bucket with fish is a button');
  html = tap(p, a, 3);
  let shown = buckets(html);
  assert.match(shown[2].cls, /taking/);
  assert.match(shown[0].cls, /adding/); assert.match(shown[1].cls, /adding/);
  assert.match(html, /class="fb-fish lift"/, 'the taken fish is lifted');
  assert.equal([...html.matchAll(/class="fb-fish slot"/g)].length, 2, 'a place for one fish in each bucket on the left');
  assert.match(html, /data-focus="fb-cancel"/);
  html = tap(p, a, 2);
  assert.equal([...html.matchAll(/class="fb-fish new"/g)].length, 1);
  const end = endTurn(html);
  assert.equal(end.disabled, false);
  assert.deepEqual(end.action, {type: 'move', from: 3, take: 1, add: [0, 1, 0]});
  // A second tap on the same bucket on the left takes the added fish out again.
  html = tap(p, a, 2);
  assert.deepEqual(endTurn(html).action, {type: 'move', from: 3, take: 1, add: [0, 0, 0]});
  html = tap(p, a, 2);
  assert.equal(buckets(html)[2].ui.pending, null, 'with takes of 1, a tap on the bucket taken from puts the fish back');
  const before = a;
  a = move(p, a, endTurn(html).action, seeded(1));
  assert.equal(a.board.turns.length, 2, 'my reply comes with the move');
  const reply = a.board.turns[1];
  assert.deepEqual(a.board.pos, [2, 2, 0].map((c, i) => c + reply.add[i] - (reply.from === i + 1 ? reply.take : 0)));
  html = view(p, a);
  assert.match(html, /I took 1 from bucket \d( and added 1 to buckets? [\d, and]+)?\. Your turn/);
  assert.equal(buckets(M.buckets.render(p, a)).some(b => /taking|adding/.test(b.cls)), false, 'the move being built is gone');
  assert.deepEqual(undo(a).board, before.board, 'Undo takes back the take, the added fish and my reply as one move');
  // A tap on a bucket right of the one taken from is not a button; the wire
  // reports it by applying a move the rules refuse.
  M.buckets.reset(p);
  html = tap(p, freshAttempt(p), 1);
  shown = buckets(html);
  assert.equal(shown[1].ui, null); assert.match(shown[1].cls, /off/);
  assert.equal(move(p, freshAttempt(p), {type: 'move', from: 1, take: 1, add: [0, 1, 0]}), null, 'nothing is added on the right');
  assert.equal(move(p, freshAttempt(p), {type: 'move', from: 3, take: 1, add: [2, 0, 0]}), null, 'at most one fish to a bucket');
  assert.equal(move(p, freshAttempt(p), {type: 'move', from: 3, take: 2, add: [0, 0, 0]}), null, 'one fish taken');
  M.buckets.reset(p);
});

test('a pending move belongs to its board: a stale one is dropped, and a forged one is ignored', () => {
  const p = byId('buckets-02');
  let a = freshAttempt(p);
  tap(p, a, 3);
  a = move(p, a, {type: 'move', from: 3, take: 1, add: [1, 0, 0]}, seeded(2));
  assert.equal(buckets(M.buckets.render(p, a)).some(b => /taking/.test(b.cls)), false);
  M.buckets.ui(p, {pending: {key: 'x', from: 1, take: 9, add: [0, 0, 0]}});
  assert.ok(endTurn(M.buckets.render(p, a)).disabled);
  M.buckets.ui(p, {nonsense: true});
  M.buckets.reset(p);
});

test('0, 0 and 1 is won only by refilling nothing; 3, 3 and 1 only by refilling two buckets', () => {
  const first = byId('buckets-01');
  for (const add of [[1, 0, 0], [0, 1, 0], [1, 1, 0]]) {
    let a = move(first, freshAttempt(first), {type: 'move', from: 3, take: 1, add}, seeded(1));
    assert.ok(a, `${add} is legal`);
    for (let i = 0; i < 10 && a.board.pos.some(Boolean); i++) a = move(first, a, {type: 'move', ...moves(first.parameters, a.board.pos)[0]}, seeded(i));
    assert.equal(a.board.turns.at(-1).player, 'opponent', `refilling ${add} loses`);
    assert.match(view(first, a), /I took the last fish\./);
  }
  const won = move(first, freshAttempt(first), {type: 'move', from: 3, take: 1, add: [0, 0, 0]});
  assert.ok(isSolved(first, won.board));
  assert.match(M.buckets.render(first, won), /You took the last fish\./);
  const p = byId('buckets-05');
  assert.deepEqual(winningMoves(p.parameters, p.parameters.start), [{from: 3, take: 1, add: [1, 1, 0]}]);
  for (const m of moves(p.parameters, p.parameters.start).filter(m => m.add.join() !== '1,1,0')) {
    const a = move(p, freshAttempt(p), {type: 'move', ...m}, seeded(3));
    assert.equal(nextHint(p, a).type, 'deadend');
    if (a.board.pos.some(Boolean)) assert.equal(nextHint(p, a).quiet, true, 'said only behind Hint');
  }
});

test('every reply: go second from 2 and 2 against each of my three first moves, one at a time', () => {
  const p = byId('buckets-03');
  assert.equal(p.solution.replies.length, 3);
  let a = freshAttempt(p);
  assert.equal(a.board.first, 'opponent');
  assert.match(M.buckets.render(p, a), /aria-label="0 of 3 first moves answered"/);
  assert.equal(M.buckets.noUndo(p), true);
  // A wrong reply: I win, and Try again replays the same first move.
  const wrong = moves(p.parameters, a.board.pos).find(m => moverWins(p.parameters, after(a.board.pos, m)));
  a = move(p, a, {type: 'move', ...wrong}, seeded(1));
  for (let i = 0; i < 10 && a.board.pos.some(Boolean); i++) a = move(p, a, {type: 'move', ...moves(p.parameters, a.board.pos)[0]}, seeded(i));
  assert.equal(move(p, a, {type: 'next'}), null, 'the next first move waits for a win');
  a = move(p, a, {type: 'again'});
  assert.equal(a.board.round, 0);
  for (let round = 0; round < 3; round++) {
    while (a.board.pos.some(Boolean)) a = move(p, a, gameSolve(p, a.board), seeded(round));
    assert.equal(a.board.turns.at(-1).player, 'you');
    if (round < 2) { assert.match(M.buckets.render(p, a), /Next first move/); a = move(p, a, {type: 'next'}); assert.equal(a.board.round, round + 1); }
  }
  assert.ok(isSolved(p, a.board));
  assert.ok(validBoard(p, JSON.parse(JSON.stringify(a.board))));
  assert.equal(a.board.won.length, 2, 'the games won against the first two moves are kept');
  assert.equal(validBoard(p, {...a.board, won: []}), false, 'a last round alone is not a solve');
  assert.equal(validBoard(p, {...a.board, won: [a.board.won[1], a.board.won[0]]}), false);
});

test('who starts: choose, win three in a row from new starts; the choice is final, a loss empties the streak, a practice win does not count', () => {
  const p = byId('buckets-06'), q = p.parameters;
  assert.equal(startPool(q).length, 60);
  assert.equal(startPool(q).filter(s => !moverWins(q, s)).length, 7);
  const r = seeded(4);
  let b = M.buckets.fresh(p, r), wins = 0;
  const html = M.buckets.render(p, {board: b, hintLevel: 0});
  const looks = [...html.matchAll(/<button type="button" class="([^"]*)"[^>]*data-focus="fb-choose-(?:you|opponent)"/g)].map(m => m[1]);
  assert.equal(looks.length, 2); assert.equal(looks[0], looks[1], 'neither choice looks like the default');
  assert.equal(M.buckets.move(p, b, {type: 'move', from: 1, take: 1, add: [0, 0, 0]}), null, 'choose first');
  while (!M.buckets.solved(p, b)) {
    b = M.buckets.move(p, b, gameSolve(p, b), r);
    if (b.first !== null && b.pos.every(c => !c)) { wins++; assert.equal(b.streak, wins); }
  }
  assert.equal(b.streak, 3);
  assert.ok(validBoard(p, JSON.parse(JSON.stringify(b))));
  // A losing choice: from 2, 2 and 2, Me first loses to perfect play.
  let c = {...M.buckets.fresh(p, r), start: [2, 2, 2], pos: [2, 2, 2]};
  c = M.buckets.move(p, c, {type: 'choose', first: 'you'}, r);
  assert.equal(M.buckets.move(p, c, {type: 'choose', first: 'opponent'}), null, 'the choice is final');
  while (c.pos.some(Boolean)) c = M.buckets.move(p, c, gameSolve(p, c), r);
  assert.equal(c.turns.at(-1).player, 'opponent');
  assert.equal(c.streak, 0);
  c = M.buckets.move(p, c, {type: 'again'}, r);
  assert.deepEqual(c.start, [2, 2, 2]); assert.equal(c.fresh, false);
  c = M.buckets.move(p, c, {type: 'choose', first: 'opponent'}, r);
  while (c.pos.some(Boolean)) c = M.buckets.move(p, c, gameSolve(p, c), r);
  assert.equal(c.turns.at(-1).player, 'you');
  assert.equal(c.streak, 0, 'a practice win does not count');
  assert.match(M.buckets.render(p, {board: c, hintLevel: 0}), /Wins count from a new start\./);
  assert.equal(M.buckets.move(p, c, {type: 'again'}), null, 'Same start again follows a loss only');
  const n = M.buckets.move(p, c, {type: 'new'}, r);
  assert.notDeepEqual(n.start, [2, 2, 2]); assert.equal(n.fresh, true);
  // Half the starts are second-player starts, and none is one move from the end.
  let second = 0;
  for (let i = 0, prev = null; i < 2000; i++) { const s = drawStart(q, r, prev); if (!moverWins(q, s)) second++; assert.ok(!moves(q, s).some(m => after(s, m).every(x => !x))); prev = s; }
  assert.ok(Math.abs(second / 2000 - .5) < .05);
  assert.equal(M.buckets.hint(p, M.buckets.fresh(p, r)).type, 'note', 'hints never say who starts');
  assert.equal(M.buckets.noUndo(p), true);
});

test('Every start: marks, Play, That’s all and its lock; a wrong card is played out with me first, and the marks are cleared', () => {
  const p = byId('buckets-04');
  assert.deepEqual(secondCards().map(cardStart), [[2, 0], [0, 2], [2, 2]]);
  let a = freshAttempt(p);
  let html = M.bucketsort.render(p, a);
  assert.equal([...html.matchAll(/<button type="button" class="fb-card/g)].length, 15);
  assert.match(html, /data-focus="fb-all" disabled/, 'nothing marked, nothing to judge');
  assert.doesNotMatch(html, /\b(3|three) (starts|cards)\b/i, 'no count');
  a = move(p, a, {type: 'mark', cell: 2});
  a = move(p, a, {type: 'mark', cell: 5});
  a = move(p, a, {type: 'mark', cell: 5});
  assert.deepEqual(a.board.marked, [2], 'a second tap clears');
  // With an answer missing, That's all says only "There is another.", even with a wrong mark.
  a = move(p, a, {type: 'mark', cell: 5});
  const partial = move(p, a, {type: 'all'});
  assert.deepEqual(partial.board.refused, {more: true});
  assert.equal(partial.board.play, null);
  assert.match(M.bucketsort.render(p, partial), /There is another\./);
  assert.equal(move(p, partial, {type: 'all'}), null, 'That’s all waits for a change');
  // Practice: Play, a card, then who starts; Back keeps the marks.
  let t = move(p, a, {type: 'try'});
  assert.match(M.bucketsort.render(p, t), /Tap a card to start from\./);
  assert.equal(move(p, t, {type: 'choose', first: 'you'}), null, 'a card comes first');
  t = move(p, move(p, t, {type: 'start', cell: 6}), {type: 'choose', first: 'you'});
  assert.match(M.bucketsort.render(p, t), /Your turn/);
  t = move(p, t, {type: 'back'});
  assert.deepEqual(t.board.marked, a.board.marked);
  // Every answer and a wrong card: I go first from it at once and win.
  let full = move(p, move(p, a, {type: 'mark', cell: 8}), {type: 'mark', cell: 10});
  let w = move(p, full, {type: 'all'}, seeded(2));
  assert.deepEqual(w.board.refused, {wrong: 5});
  assert.equal(w.board.play.kind, 'out'); assert.equal(w.board.play.turns[0].player, 'opponent');
  html = M.bucketsort.render(p, w);
  assert.match(html, /Whoever starts from 1 and 1 can win\. I go first\./);
  assert.doesNotMatch(html, /data-focus="fb-back"/, 'no way out but to play it');
  assert.equal(move(p, w, {type: 'back'}), null);
  for (let i = 0; i < 20 && w.board.marked.length; i++) w = move(p, w, sortHint(p, w.board).action, seeded(i));
  assert.deepEqual(w.board.marked, []);
  html = M.bucketsort.render(p, w);
  assert.match(html, /Whoever starts from 1 and 1 can win\.<\/span> I took the last fish\. The marks are cleared\./, 'why I went first stays after the game');
  w = move(p, w, {type: 'back'});
  assert.deepEqual(w.board, M.bucketsort.fresh(p));
  // A wrong card one move from the end: the play-out is over at once, and the line still says why.
  const quick = move(p, move(p, full, {type: 'mark', cell: 1}), {type: 'all'}, seeded(1));
  assert.deepEqual(quick.board.refused, {wrong: 1});
  assert.deepEqual(quick.board.marked, []);
  assert.match(M.bucketsort.render(p, quick), /Whoever starts from 1 and 0 can win\.<\/span> I took the last fish\. The marks are cleared\./);
  full = move(p, full, {type: 'mark', cell: 5});
  const right = move(p, full, {type: 'all'});
  assert.ok(isSolved(p, right.board));
  assert.equal(judge([2, 8, 10]), null);
  assert.deepEqual(judge([2, 8]), {more: true});
  assert.equal(M.bucketsort.noUndo(p), true);
});

test('the encore: take 1 to 3, add up to 3, and 3 and 6 is won only by leaving 4 and 4', () => {
  const p = byId('buckets-07');
  assert.deepEqual(winningMoves(p.parameters, [3, 6]), [{from: 2, take: 2, add: [1, 0]}]);
  M.buckets.reset(p);
  const a = freshAttempt(p);
  let html = tap(p, a, 2);
  html = tap(p, a, 2);
  assert.equal([...html.matchAll(/class="fb-fish lift"/g)].length, 2, 'a second tap takes another fish');
  assert.equal([...html.matchAll(/class="fb-fish slot"/g)].length, 3, 'room for up to 3 added fish');
  html = tap(p, a, 1);
  assert.deepEqual(endTurn(html).action, {type: 'move', from: 2, take: 2, add: [1, 0]});
  for (let i = 0; i < 3; i++) html = tap(p, a, 1);
  assert.deepEqual(endTurn(html).action, {type: 'move', from: 2, take: 2, add: [0, 0]}, 'after 3, a tap takes the added fish out');
  assert.match(html, /class="fb-board fours"/);
  M.buckets.reset(p);
  const won = move(p, a, {type: 'move', from: 2, take: 2, add: [1, 0]}, seeded(1));
  assert.deepEqual(won.board.turns.at(-1).player, 'opponent');
  assert.equal(nextHint(p, won).type, 'move');
  const q8 = byId('buckets-08').parameters;
  assert.deepEqual(startPool(q8).filter(s => !moverWins(q8, s)).map(String), ['0,4', '4,0', '4,4']);
});

test('hints point to a winning move without naming the rule; Apply hint makes it; hints alone finish every puzzle', () => {
  for (const p of json.puzzles) {
    assert.doesNotMatch(p.hints[0], /\beven\b|\bodd\b|pair|multiple/i, `${p.id}: the first hint gives nothing away`);
    let a = freshAttempt(p, seeded(3)), worst = 0;
    for (let i = 0; i < 400 && !isSolved(p, a.board); i++) {
      let h; worst = Math.max(worst, cpuMs(() => { h = nextHint(p, a); }));
      if (h.type === 'note') { a = move(p, a, gameSolve(p, a.board), seeded(i)); continue; }
      assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
      a = move(p, a, h.action, seeded(i));
      assert.ok(a, `${p.id}: the hint is legal`);
    }
    assert.ok(isSolved(p, a.board), p.id);
    assert.ok(worst < 50, `${p.id}: hints take ${worst} ms CPU`);
  }
  const p = byId('buckets-02'), h = nextHint(p, freshAttempt(p));
  assert.equal(h.text, 'Some move wins from here. Which buckets would you like to leave me?');
  // From the second press, the bucket a winning move takes from is ringed; never in a round.
  const ringed = level => buckets(M.buckets.render(p, {...freshAttempt(p), hintLevel: level})).filter(b => /hinted/.test(b.cls)).map(b => b.i);
  assert.deepEqual(ringed(1), []); assert.deepEqual(ringed(2), [2]); assert.deepEqual(ringed(3), [2]);
  const round = byId('buckets-06'), b = M.buckets.move(round, {...M.buckets.fresh(round, seeded(1)), start: [3, 1, 1], pos: [3, 1, 1]}, {type: 'choose', first: 'you'});
  assert.doesNotMatch(M.buckets.render(round, {board: b, hintLevel: 3}), /hinted/);
  // A lost duel: the line above the buckets says who took the last fish, the hint only what to do.
  const first = byId('buckets-01'), lost = move(first, freshAttempt(first), {type: 'move', from: 3, take: 1, add: [1, 0, 0]}, seeded(1));
  assert.equal(nextHint(first, lost).text, 'Undo or restart to try again.');
});

test('saves: fresh boards are valid; forged wins, streaks and marks are not; Restart deals a fresh board', () => {
  for (const p of json.puzzles) assert.ok(validBoard(p, JSON.parse(JSON.stringify(freshAttempt(p, seeded(2)).board))), p.id);
  const duel = byId('buckets-01');
  assert.equal(validBoard(duel, {start: [0, 0, 1], pos: [0, 0, 0], first: 'you', turns: []}), false);
  assert.equal(validBoard(duel, {start: [0, 0, 1], pos: [0, 0, 0], first: 'you', turns: [{player: 'you', from: 1, take: 1, add: [0, 0, 0]}]}), false);
  const rounds = byId('buckets-06');
  assert.equal(validBoard(rounds, {...freshAttempt(rounds, seeded(1)).board, streak: 3}), false);
  const sort = byId('buckets-04');
  assert.equal(validBoard(sort, {marked: [2, 8], refused: null, play: null, done: true}), false);
  assert.ok(validBoard(sort, {marked: [2, 8, 10], refused: null, play: null, done: true}));
  const done = {...freshAttempt(sort), board: {marked: [2, 8, 10], refused: null, play: null, done: true}};
  assert.deepEqual(restart(sort, done).board, freshAttempt(sort).board);
  assert.equal(M.buckets.noUndo(duel), false, 'a duel keeps Undo');
});

test('rendering: no title on the play screen, How to play opens with the move, labels on every bucket, no count anywhere', () => {
  for (const p of json.puzzles) {
    const a = freshAttempt(p, seeded(5)), html = view(p, a), board = M[p.mechanic].render(p, a);
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    assert.doesNotMatch(html, new RegExp(`>${p.title}<`), `${p.id}: no title on the play screen`);
    assert.match(p.controls, /^A move takes /);
    assert.doesNotMatch(`${p.title} ${p.controls} ${p.rules.join(' ')}`, /\beven\b|\bodd\b|pair|multiple|parity/i, `${p.id}: How to play names no rule`);
    assert.match(board, /data-mechanic-wire="(buckets|bucketsort)"/);
    if (p.mechanic === 'buckets') for (const b of buckets(board)) assert.ok(b.cls.startsWith('fb-bucket'));
    for (const m of board.matchAll(/class="fb-bucket[^"]*"[^>]*aria-label="([^"]*)"/g)) assert.match(m[1], /^Bucket \d+, \d+ fish/);
    assert.doesNotMatch(board, /\b\d+ (more|left|to go|to find)\b/, `${p.id}: no count`);
  }
});

test('the puzzles sit in Pebble Duel as the Buckets group, after its other groups', () => {
  const html = libraryView({id: 'x', name: 'X', avatar: 0, band: 'k1', sound: false, attempts: {}}, pack.puzzles);
  const nim = html.slice(html.indexOf('data-view-key="family-nim"'));
  const family = nim.slice(0, nim.indexOf('</details>'));
  assert.ok(family.indexOf('<h2>Every start</h2>') < family.indexOf('<h2>Buckets</h2>'));
  assert.match(family, /aria-label="Pebble Duel, Buckets, puzzle 1"/);
  assert.equal([...family.matchAll(/data-id="buckets-/g)].length, 8);
  for (const p of json.puzzles) assert.equal(mechanicFor(p), M[p.mechanic]);
});

test('taps are quick: a move with my reply, a hint and a render', () => {
  for (const p of json.puzzles.filter(p => p.mechanic === 'buckets')) {
    let b = M.buckets.fresh(p, seeded(1));
    if (b.first === null) b = M.buckets.move(p, b, {type: 'choose', first: 'you'}, seeded(1));
    if (!b.pos.some(Boolean)) continue;
    const ms = cpuMs(() => { const n = M.buckets.move(p, b, gameSolve(p, b), seeded(2)); M.buckets.render(p, {board: n || b, hintLevel: 2}); M.buckets.hint(p, b); });
    assert.ok(ms < 100, `${p.id}: ${ms} ms CPU`);
  }
});
