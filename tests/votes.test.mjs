// Voting and agendas: pair votes and knockouts on the worksheet's cards, the
// top cycle, the knockout mat and its lines, Can't groups and their refusals,
// writing blank cards and Vote, the line with its moved dots, adding a voter,
// hints, Undo keeping refusals, view state, saves, the playground and
// rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {knockout, votesFor, beats, topCycle, dominant, breaks, winsFrom, failing, finishes, lineWinner, pairOnLine, fewest, addSpots, movedOf} from '../dist/families/votes/votes.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/votes/votes.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = n => pack.puzzles.find(p => p.id === `votes-${n}`);
const mech = mechanicFor(byId('01'));
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const board = (p, a) => mech.render(p, a, {});
const told = html => html.match(/<p class="vt-told">([^<]*)<\/p>/)?.[1] ?? '';
const letters = order => [...order].map(letter => ({type: 'play', letter}));

test('pair votes and knockouts on the worksheet’s cards', () => {
  const def = ['DFE', 'EFD', 'FED'];
  assert.equal(votesFor(def, 'D', 'E'), 1); assert.equal(votesFor(def, 'E', 'D'), 2);
  assert.deepEqual(knockout(def, 'DEF').rounds.map(r => [r.a, r.b, r.va, r.vb, r.win]), [['D', 'E', 1, 2, 'E'], ['E', 'F', 1, 2, 'F']], 'E beats D 2 to 1, then F beats E');
  const cyc = ['ABC', 'BCA', 'CAB'];
  assert.ok(beats(cyc, 'A', 'B') && beats(cyc, 'B', 'C') && beats(cyc, 'C', 'A'), 'the cycle');
  for (const [order, w] of [['BCA', 'A'], ['CAB', 'B'], ['ABC', 'C']]) assert.equal(knockout(cyc, order).winner, w, 'the waiting letter wins');
  assert.equal(topCycle(cyc, 'ABC'), 'ABC');
  assert.equal(topCycle(def, 'DEF'), 'F');
  assert.ok(dominant(def, 'DEF', 'EF') && !dominant(def, 'DEF', 'DE'));
  assert.equal(breaks(byId('12').parameters.cards, 'ABCDE', 'ABCD'), 'ED', 'E beats D');
  assert.deepEqual(winsFrom(cyc, 'ABC', '', 'A'), ['BCA', 'CBA']);
  assert.deepEqual(winsFrom(cyc, 'ABC', 'A', 'A'), []);
});

test('a knockout: letters, the mat, the final and the line', () => {
  const p = byId('01');
  let a = freshAttempt(p);
  let html = board(p, a);
  assert.match(html, /vt-tok big ghost">A</, 'the goal waits faint in the final slot');
  assert.equal(told(html), '', 'no objective line');
  a = play(p, a, ...letters('AB'));
  html = board(p, a);
  assert.match(html, /vt-l pick">A</, 'a card lights the letter its voter picks');
  assert.match(html, /<small>2<\/small>/, 'the vote count shows');
  a = play(p, a, {type: 'play', letter: 'C'});
  assert.ok(!isSolved(p, a.board));
  assert.equal(told(board(p, a)), 'C wins.');
  assert.equal(move(p, a, {type: 'play', letter: 'A'}), null, 'a letter plays once');
  assert.deepEqual(nextHint(p, a), {type: 'deadend', quiet: true, text: 'C wins. Undo.'});
  a = play(p, freshAttempt(p), ...letters('CBA'));
  assert.ok(isSolved(p, a.board), 'C and B first, then A');
});

test('Can’t: groups, refusals that stay, and the pair wins', () => {
  const p = byId('12');
  let a = freshAttempt(p);
  a = play(p, a, {type: 'cant', group: 'ABCE'});
  assert.equal(told(board(p, a)), 'Leave E out.');
  a = play(p, a, {type: 'cant', group: 'ABCD'});
  assert.equal(told(board(p, a)), 'E beats D.');
  assert.equal(move(p, a, {type: 'cant', group: 'ABCD'}), null, 'refused once, refused for good');
  a = play(p, a, {type: 'play', letter: 'A'});
  assert.equal(a.board.told, null, 'a letter clears the line');
  assert.deepEqual(a.board.shut, ['ABCE', 'ABCD']);
  a = play(p, a, {type: 'cant', group: 'ABC'});
  assert.ok(isSolved(p, a.board));
  const html = board(p, a);
  assert.equal((html.match(/<li>/g) || []).length, 6, 'each of A, B, C beats D and E');
  assert.match(html, /beats<\/span><b class="vt-tok small">E<\/b><small>2 to 1<\/small>/);
  // A one-letter group: its two pair wins.
  const q = byId('02'), b = play(q, freshAttempt(q), {type: 'cant', group: 'F'});
  assert.equal((board(q, b).match(/<li>/g) || []).length, 2);
});

test('blank cards: writing, Vote and its line, and the table of knockouts', () => {
  const p = byId('03');
  let a = freshAttempt(p);
  assert.equal(p.visibleObjective, 'Make C win every knockout.');
  assert.equal(move(p, a, {type: 'write', card: 0, letter: 'A'}), null, 'V1 is printed');
  a = play(p, a, {type: 'write', card: 2, letter: 'A'}, {type: 'write', card: 2, letter: 'B'});
  assert.equal(move(p, a, {type: 'write', card: 2, letter: 'A'}), null, 'a letter once a card');
  assert.equal(move(p, a, {type: 'vote'}), null, 'Vote waits for full cards');
  a = play(p, a, {type: 'write', card: 2, letter: 'C'}, {type: 'vote'});
  assert.equal(told(board(p, a)), 'B wins when B waits.', 'A and C first, then B beats C');
  assert.equal(move(p, a, {type: 'vote'}), null, 'Vote is off until a letter changes');
  a = play(p, a, {type: 'erase', card: 2, letter: 'B'});
  assert.equal(a.board.fill[0], 'AC', 'the letters below move up');
  a = play(p, a, {type: 'write', card: 2, letter: 'B'}, {type: 'vote'});
  assert.ok(isSolved(p, a.board), 'A, C, B works');
  assert.equal((board(p, a).match(/<li>/g) || []).length, 3, 'all three knockouts, each won by C');
  assert.deepEqual(finishes(p.parameters, ['']).map(f => f[0]).sort(), ['ACB', 'CAB', 'CBA']);
  assert.equal(failing('ABC', ['ABC', 'BCA', 'CAB'], {kind: 'waiting'}), null);
});

test('cards Can’t: blank cards, too few, no letter above', () => {
  const p = byId('07');
  let a = freshAttempt(p);
  a = play(p, a, {type: 'cant', cards: [0, 2]});
  assert.equal(told(board(p, a)), 'A blank card can go either way.');
  a = play(p, a, {type: 'cant', cards: [1]});
  assert.equal(told(board(p, a)), 'That isn’t most of the cards.');
  a = play(p, a, {type: 'cant', cards: [0, 1]});
  assert.ok(isSolved(p, a.board));
  assert.match(board(p, a), /A beats B on most cards\./);
  const q = byId('03'), b = play(q, freshAttempt(q), {type: 'cant', cards: [0, 1]});
  assert.equal(told(board(q, b)), 'No letter is above C on all of them.');
  assert.equal(move(byId('13'), freshAttempt(byId('13')), {type: 'cant', cards: [0, 1]}), null, 'no Can’t on puzzle 13');
});

test('the line: winners, moved dots, Vote and its lines', () => {
  assert.equal(lineWinner([0, 2, 4, 7, 10]), 4);
  assert.equal(lineWinner([9, 1, 10, 6, 0]), 6, 'the middle favourite, not the middle of the line');
  assert.equal(lineWinner([1, 3, 7, 9]), null, 'four voters, no winner');
  assert.deepEqual(pairOnLine([0, 2, 4, 7, 10], 4, 0), [3, 1], 'V2 is the same distance from 0 and 4');
  assert.equal(fewest(byId('04').parameters).least, 1);
  assert.equal(fewest(byId('14').parameters).ends.length, 30);
  const p = byId('04');
  let a = freshAttempt(p);
  assert.equal((board(p, a).match(/vt-pips/g) || []).length, 1);
  a = play(p, a, {type: 'vote'});
  assert.equal(told(board(p, a)), '4 wins.');
  assert.equal(move(p, a, {type: 'vote'}), null, 'Vote is off until a voter moves');
  a = play(p, a, {type: 'put', voter: 0, to: 7}, {type: 'put', voter: 1, to: 8});
  assert.equal(movedOf(p.parameters, a.board.at), 2);
  assert.match(board(p, a), /<i class="over"><\/i>/, 'a red dot past the budget');
  a = play(p, a, {type: 'vote'});
  assert.equal(told(board(p, a)), 'Fewer moves would do.');
  a = play(p, a, {type: 'put', voter: 1, to: 2}, {type: 'vote'});
  assert.ok(isSolved(p, a.board), 'back to one moved');
  assert.match(board(p, a), /vt-tick goal crowned/);
});

test('adding a voter, and Can’t on the line', () => {
  const p = byId('09');
  assert.deepEqual(addSpots(p.parameters), [5]);
  let a = freshAttempt(p);
  assert.match(board(p, a), /class="vt-tray"/, 'V5 waits off the line');
  assert.equal(move(p, a, {type: 'put', voter: 0, to: 5}), null, 'V1 stays put');
  a = play(p, a, {type: 'put', voter: 4, to: 6}, {type: 'vote'});
  assert.equal(told(board(p, a)), '6 wins.');
  a = play(p, a, {type: 'put', voter: 4, to: 5}, {type: 'vote'});
  assert.ok(isSolved(p, a.board));
  const q = byId('15');
  let b = play(q, freshAttempt(q), {type: 'cant', voters: [1, 2, 3]});
  assert.equal(told(board(q, b)), 'They aren’t all on one side of 8.');
  b = play(q, b, {type: 'cant', voters: [0, 1, 2]});
  assert.ok(isSolved(q, b.board));
  assert.match(board(q, b), /V1, V2 and V3 all pick 7 over 8\./);
});

test('hints say the next step, and Can’t with its reason', () => {
  const p = byId('06');
  let a = freshAttempt(p);
  assert.equal(nextHint(p, a).text, 'Start with B.');
  a = play(p, a, {type: 'play', letter: 'B'});
  assert.equal(nextHint(p, a).text, 'Put C against B.');
  a = play(p, a, {type: 'play', letter: 'C'});
  assert.equal(nextHint(p, a).text, 'Bring in A next.');
  const b = play(p, freshAttempt(p), {type: 'play', letter: 'D'});
  assert.deepEqual(nextHint(p, b), {type: 'deadend', quiet: true, text: 'D can’t win from here. Undo.'});
  assert.equal(nextHint(byId('02'), freshAttempt(byId('02'))).text, 'F beats D and E, so once F plays it keeps winning. Press Can’t and ring F.');
  assert.match(nextHint(byId('10'), freshAttempt(byId('10'))).text, /^A, B and C each beat D/);
  assert.equal(nextHint(byId('03'), freshAttempt(byId('03'))).text, 'Write A at the top of V3.');
  assert.match(nextHint(byId('07'), freshAttempt(byId('07'))).text, /^A is above B on V1 and V2/);
  assert.equal(nextHint(byId('04'), freshAttempt(byId('04'))).text, 'Move V3 to 7.');
  assert.equal(nextHint(byId('09'), freshAttempt(byId('09'))).text, 'Put V5 on 5.');
  const q = byId('04'), c = play(q, freshAttempt(q), {type: 'put', voter: 0, to: 7}, {type: 'put', voter: 1, to: 9});
  assert.equal(nextHint(q, c).text, 'Move V1 back to 0.', 'over the budget, a voter goes back');
});

test('Undo takes back moves, not refusals', () => {
  const p = byId('05');
  let a = play(p, freshAttempt(p), {type: 'play', letter: 'C'}, {type: 'cant', group: 'C'});
  assert.deepEqual(a.board.told, {group: 'C', why: 'BC'});
  const draw = att => view(p, att);
  const back = undoPress(p, a, draw, draw(a));
  assert.equal(back.board.order, '', 'the refusal shows nothing new alone, so the letter goes too');
  assert.deepEqual(back.board.shut, ['C']);
  assert.equal(move(p, back, {type: 'cant', group: 'C'}), null);
  // A carried refusal stays while the letters are where they were.
  const carried = mech.carry(p, a.board, {...a.board, told: null, shut: []});
  assert.deepEqual(carried.told, a.board.told);
  assert.deepEqual(mech.carry(p, a.board, {order: '', told: null, shut: [], claim: null}).told, null, 'not once the letters change');
});

test('view state: Can’t rings, a refusal clears the taps, a pick belongs to its board', () => {
  const p = byId('10');
  mech.reset(p);
  let a = freshAttempt(p);
  mech.ui(p, {claiming: true});
  mech.ui(p, {choose: 'A'}); mech.ui(p, {choose: 'B'}); mech.ui(p, {choose: 'B'});
  let html = board(p, a);
  assert.match(html, /vt-letter chosen[^>]*data-ui="\{&quot;choose&quot;:&quot;A&quot;\}"/, 'A is ringed');
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;group&quot;:&quot;A&quot;\}"/, 'Check sends the ringed group');
  a = play(p, a, {type: 'cant', group: 'A'});
  html = board(p, a);
  assert.doesNotMatch(html, /class="vt-puzzle[^"]*claiming/, 'the refusal lets go of the taps');
  assert.equal(told(html), 'C beats A.');
  const q = byId('04');
  mech.reset(q);
  let b = freshAttempt(q);
  mech.ui(q, {pick: 2, at: b.moves});
  assert.match(board(q, b), /data-vt-tick="7" data-action="expansion-move"/, 'with V3 picked, the ticks are buttons');
  b = play(q, b, {type: 'put', voter: 0, to: 1});
  assert.doesNotMatch(board(q, b), /data-vt-tick="7" data-action/, 'a move lets go');
  mech.reset(p); mech.reset(q);
});

test('saves: forged boards are refused', () => {
  const p = byId('01'), b = freshAttempt(p).board;
  assert.equal(validBoard(p, {...b, order: 'AA'}), false);
  assert.equal(validBoard(p, {...b, claim: 'BC'}), false, 'B and C don’t beat A');
  assert.equal(validBoard(p, {...b, told: {group: 'BC', why: 'AB'}}), false, 'a line without its refusal');
  const q = byId('13'), c = freshAttempt(q).board;
  assert.equal(validBoard(q, {...c, fill: ['ABC', 'BCA', 'CAB'], done: true}), true);
  assert.equal(validBoard(q, {...c, fill: ['ABC', 'ABC', 'CAB'], done: true}), false);
  const r = byId('14'), d = freshAttempt(r).board;
  assert.equal(validBoard(r, {...d, at: [1, 8, 9, 4, 9], done: true}), true);
  assert.equal(validBoard(r, {...d, at: [1, 9, 9, 4, 9], done: true}), false, '9 wins, not 8');
});

test('the playground: write cards, run knockouts, never solved', () => {
  const g = pack.puzzles.find(p => p.id === 'votes-playground');
  let a = freshAttempt(g);
  for (const [card, word] of [[0, 'ABC'], [1, 'BCA'], [2, 'CAB']]) for (const letter of word) a = play(g, a, {type: 'write', card, letter});
  a = play(g, a, ...letters('ABC'));
  assert.match(board(g, a), /vt-final won/);
  assert.ok(!isSolved(g, a.board));
  a = play(g, a, {type: 'size', size: 5});
  assert.equal((board(g, a).match(/class="vt-card blank/g) || []).length, 5);
});

test('every puzzle renders, the same way twice, with no button inside another', () => {
  for (const p of pack.puzzles) {
    for (const setup of [null, 'claim', 'pick', 'hint']) {
      mech.reset(p);
      let a = freshAttempt(p);
      if (setup === 'claim') { mech.ui(p, {claiming: true}); mech.ui(p, {choose: p.parameters.mode === 'agenda' ? 'A' : 0}); }
      if (setup === 'pick' && p.parameters.mode === 'line') mech.ui(p, {pick: 0, at: 0});
      if (setup === 'hint') a = {...a, hintLevel: 2};
      const html = view(p, a);
      assert.match(html, /data-mechanic-wire="votes"/, p.id);
      assert.equal(view(p, a), html, `${p.id}: the same HTML twice`);
      const part = html.slice(html.indexOf('vt-puzzle'));
      let depth = 0, nested = false;
      for (const m of part.matchAll(/<(\/?)button\b/g)) { depth += m[1] ? -1 : 1; if (depth > 1) nested = true; }
      assert.equal(nested, false, `${p.id}: no button inside a button (${setup})`);
      assert.match(part, /role="status"/);
    }
    mech.reset(p);
  }
});
