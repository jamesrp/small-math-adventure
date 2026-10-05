// Paint rows (dist/families/paint/paint.js): cards acting on every row, paint
// forgetting, turns and the shift keeping differences, copies keeping the
// one-colour rows, the fewest cards, budgets, Can't on two rows and its
// refusal, the goal row, wide cards, the playground and Draw, hints, saves,
// rendering and the satchel.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {apply, allRows, rowsAfter, shortest, apart, canJoin, cardWords, singleCards} from '../dist/families/paint/paint.js';
import {libraryView} from '../dist/caravan-ui.js';
import {loadPack} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/paint/paint.json', import.meta.url), 'utf8'));
const byId = id => pack.puzzles.find(p => p.id === id);
const card = (p, c) => ({type: 'play', card: p.parameters.hand.indexOf(c)});
const run = (p, a, cards) => cards.reduce((x, c) => x && move(p, x, card(p, c)), a);
const html = (p, a) => mechanicFor(p).render(p, a);
const stacks = (p, a) => (html(p, a).match(/class="paint-stack/g) || []).length;

test('paint sets a tile, turn turns it, copy and shift move colours within each row', () => {
  assert.equal(apply('.B.', 'YYY'), 'YBY');
  assert.equal(apply('.B.', 'YBY'), 'YBY', 'painting a tile its own colour changes nothing');
  assert.equal(apply('F.F', 'YBY'), 'BBB');
  assert.equal(apply('YY..', 'BBBB'), 'YYBB');
  assert.equal(apply('C12', 'YBB'), 'YYB');
  assert.equal(apply('C31', 'YBB'), 'BBB');
  assert.equal(apply('<', 'YBB'), 'BBY', 'the first tile goes round to the end');
  assert.deepEqual(allRows(2), ['YY', 'YB', 'BY', 'BB']);
  assert.equal(allRows(4).length, 16);
  assert.equal(cardWords('.B.'), 'tile 2 blue');
  assert.equal(cardWords('F..F'), 'turn tiles 1 and 4');
  assert.equal(cardWords('YB..'), 'tile 1 yellow and tile 2 blue');
  assert.equal(cardWords('C23'), 'copy tile 2 to tile 3');
  assert.equal(cardWords('<'), 'shift every tile one place left');
});

test('painting a tile joins the rows there for good; turns, copies and shifts keep two rows apart', () => {
  const q = {slots: 3, rows: 'all'};
  assert.equal(new Set(rowsAfter(q, ['Y..'])).size, 4);
  assert.equal(new Set(rowsAfter(q, ['Y..', 'B..', '..Y'])).size, 2, 'tile 2 never painted: two finishes');
  assert.equal(new Set(rowsAfter(q, ['F..', '.F.', '..F', 'F..'])).size, 8, 'turns keep all eight');
  assert.equal(new Set(rowsAfter(q, ['<', '<', 'F..'])).size, 8, 'the shift keeps all eight');
  assert.equal(new Set(rowsAfter(q, ['.Y.', 'Y..', '..B', '.F.'])).size, 1, 'every tile painted: one finish');
  const copies = rowsAfter(q, ['C12', 'C23']);
  assert.equal(new Set(copies).size, 2);
  assert.ok(copies.includes('YYY') && copies.includes('BBB'));
  const hand = {slots: 3, rows: 'all', hand: ['C12', 'C23', 'C31']};
  assert.equal(canJoin(hand, 'YYY', 'BBB'), false);
  assert.equal(canJoin(hand, 'YBY', 'BYB'), false, 'rows that differ everywhere stay apart');
  assert.equal(canJoin(hand, 'YBY', 'BBB'), true);
  assert.deepEqual(apart(hand), ['BBB', 'YYY']);
  assert.equal(apart({...hand, hand: ['.B.', 'C12', 'C23', 'C31']}), null);
});

test('two rows: one card for each tile where they differ', () => {
  const p = byId('paint-01');
  let a = run(p, freshAttempt(p), ['Y..', '.B.']);
  assert.ok(!isSolved(p, a.board));
  assert.match(html(p, a), /paint-slot/, 'an outline for the card left');
  a = run(p, a, ['..Y']);
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, a), /paint-table solved/);
  assert.equal(move(p, a, card(p, 'Y..')), null, 'nothing after a solve');
  assert.equal(shortest(p.parameters, p.parameters.rows).length, 3);
  assert.doesNotMatch(html(p, a), /paint-cant/, 'no Can’t with two rows');
  assert.equal(move(p, freshAttempt(p), {type: 'cant', rows: p.parameters.rows}), null);
});

test('every start: the rows stack up as tiles are painted, and the budget is the fewest', () => {
  const p = byId('paint-02');
  let a = run(p, freshAttempt(p), ['Y..']);
  assert.equal(stacks(p, a), 4);
  assert.match(html(p, a), /×2/);
  assert.match(html(p, a), /paint-stack stacked merged/);
  a = run(p, a, ['B..']);
  assert.equal(stacks(p, a), 4, 'painting tile 1 again joins nothing');
  assert.doesNotMatch(html(p, a), /merged/);
  assert.equal(nextHint(p, a).type, 'deadend', 'one card left for two tiles');
  assert.equal(move(p, run(p, a, ['.Y.']), card(p, '..Y')), null, 'no card past the budget');
  a = run(p, undo(a), ['.B.', '..Y']);
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, a), /×8/);
});

test('Can’t names two rows: a pair that never joins solves, a pair that can is refused', () => {
  const p = byId('paint-03');
  assert.deepEqual(p.solution.apart, ['YBY', 'YYY']);
  let a = freshAttempt(p);
  assert.match(html(p, a), /paint-cant/);
  a = move(p, a, {type: 'cant', rows: ['YYY', 'YYB']});
  assert.ok(a && !isSolved(p, a.board));
  assert.match(html(p, a), /Those two can still become one\./);
  a = run(p, a, ['Y..']);
  assert.equal(a.board.refused, null, 'a card clears the refusal');
  a = run(p, a, ['..B']);
  assert.equal(stacks(p, a), 2, 'tiles 1 and 3 painted: two stacks of four');
  const rows = [...new Set(rowsAfter(p.parameters, a.board.story.map(k => p.parameters.hand[k])))];
  a = move(p, a, {type: 'cant', rows});
  assert.ok(isSolved(p, a.board));
  assert.equal((html(p, a).match(/paint-stack[^"]* apart/g) || []).length, 2, 'the two stacks are marked');
  assert.equal(move(p, freshAttempt(p), {type: 'cant', rows: ['YYY', 'YYY']}), null, 'two different rows');
});

test('the Can’t picker is view state: tap one stack, then another; it closes after a move', () => {
  const p = byId('paint-03'), m = mechanicFor(p);
  m.reset(p);
  assert.doesNotMatch(html(p, freshAttempt(p)), /paint-pickable/);
  m.ui(p, {claiming: true});
  assert.equal((html(p, freshAttempt(p)).match(/paint-pickable/g) || []).length, 8);
  assert.match(html(p, freshAttempt(p)), /paint-card[^>]*disabled/, 'cards wait while picking');
  m.ui(p, {pick: 'YYY'});
  const picking = html(p, freshAttempt(p));
  assert.match(picking, /paint-pickable picked/);
  assert.match(picking, /data-action="expansion-move" data-move="\{&quot;type&quot;:&quot;cant&quot;,&quot;rows&quot;:\[&quot;YYY&quot;,&quot;YYB&quot;\]\}"/, 'the other stacks make the claim');
  m.ui(p, {pick: 'YYY'});
  assert.doesNotMatch(html(p, freshAttempt(p)), /picked/, 'a second tap unpicks');
  move(p, freshAttempt(p), card(p, 'Y..'));
  assert.doesNotMatch(html(p, freshAttempt(p)), /paint-pickable/);
  m.ui(p, {claiming: 'yes'});
  assert.doesNotMatch(html(p, freshAttempt(p)), /paint-pickable/);
});

test('a goal row: the last paint, then its turns; a turn first is painted over', () => {
  const p = byId('paint-04');
  assert.match(html(p, freshAttempt(p)), /paint-goal/);
  let a = run(p, freshAttempt(p), ['F..', 'Y..']);
  assert.equal(nextHint(p, a).type, 'deadend', 'the turn before the paint wasted a card');
  a = run(p, freshAttempt(p), ['Y..', 'F..', '.Y.', '..Y', '..F']);
  assert.ok(isSolved(p, a.board));
  assert.match(html(p, move(p, freshAttempt(p), {type: 'cant', rows: ['YYY', 'BBB']})), /can still become one/);
});

test('two rows can take a turn where every start could not', () => {
  const p = byId('paint-05');
  assert.equal(p.parameters.cant, false);
  const a = run(p, freshAttempt(p), ['F...', '.Y..', '.F..', '..Y.']);
  assert.ok(isSolved(p, a.board));
  assert.ok(apart({...p.parameters, rows: 'all', target: undefined}), 'with every start, two rows would stay apart');
});

test('copies only: the all-yellow and all-blue rows never join', () => {
  const p = byId('paint-06');
  assert.equal(nextHint(p, freshAttempt(p)).action.type, 'cant');
  let a = run(p, freshAttempt(p), ['C12', 'C23']);
  assert.equal(stacks(p, a), 2);
  assert.match(html(p, a), /×4/);
  assert.match(html(p, a), /class="paint-face"/, 'copy cards are drawn');
  a = run(p, a, ['C31', 'C12']);
  assert.equal(stacks(p, a), 2, 'more copies change nothing');
  a = move(p, a, {type: 'cant', rows: ['BBB', 'YYY']});
  assert.ok(isSolved(p, a.board));
});

test('one paint and copies: paint first, then copy onward round the ring', () => {
  const p = byId('paint-07');
  assert.deepEqual(p.solution.cards, ['.B.', 'C23', 'C31']);
  assert.ok(isSolved(p, run(p, freshAttempt(p), ['.B.', 'C23', 'C31']).board));
  assert.equal(nextHint(p, run(p, freshAttempt(p), ['.B.', 'C12'])).type, 'deadend', 'a copy onto the painted tile undoes it');
  assert.equal(nextHint(p, run(p, freshAttempt(p), ['C23'])).type, 'deadend', 'a copy before the paint is wasted');
});

test('paint and shift: 2n − 1 cards, paint first and last', () => {
  const p = byId('paint-08'), p4 = byId('paint-09');
  assert.ok(isSolved(p, run(p, freshAttempt(p), ['Y..', '<', 'Y..', '<', 'Y..']).board));
  assert.equal(nextHint(p, run(p, freshAttempt(p), ['<'])).type, 'deadend');
  assert.equal(nextHint(p, run(p, freshAttempt(p), ['Y..', 'Y..'])).type, 'deadend');
  assert.equal(p4.parameters.budget, 7);
  assert.ok(isSolved(p4, run(p4, freshAttempt(p4), ['Y...', '<', 'Y...', '<', 'Y...', '<', 'Y...']).board));
  assert.match(html(p, freshAttempt(p)), /aria-label="Shift every tile one place left"/);
});

test('wide cards: only one order works, found by peeling from the end', () => {
  const p10 = byId('paint-10'), p11 = byId('paint-11');
  assert.ok(isSolved(p10, run(p10, freshAttempt(p10), ['YY..', '.BB.', '..YB']).board));
  assert.ok(!isSolved(p10, run(p10, freshAttempt(p10), ['.BB.', 'YY..', '..YB']).board));
  assert.ok(isSolved(p11, run(p11, freshAttempt(p11), ['..YY', '.BB.', 'YY..', 'F..F']).board));
  assert.ok(!isSolved(p11, run(p11, freshAttempt(p11), ['YY..', '.BB.', '..YY', 'F..F']).board));
});

test('hints name a card in words, or Can’t and two rows, and hints alone finish', () => {
  for (const p of pack.puzzles.filter(q => q.band !== 'playground')) {
    let a = freshAttempt(p);
    for (let i = 0; i < 12 && !isSolved(p, a.board); i++) {
      const h = nextHint(p, a);
      assert.equal(h.type, 'move', p.id);
      assert.doesNotMatch(h.text, /\.\.|[YBF]{2}|C\d\d|</, `${p.id}: ${h.text}`);
      a = move(p, a, h.action);
    }
    assert.ok(isSolved(p, a.board), `${p.id}: hints finish`);
  }
  const p = byId('paint-03');
  mechanicFor(p).reset(p);
  const shown = html(p, {...freshAttempt(p), hintLevel: 2});
  assert.equal((shown.match(/paint-pickable[^"]*hinted/g) || []).length, 2, 'the two rows are marked');
});

test('saves: only stories of the hand within the budget, and honest claims', () => {
  const p = byId('paint-03');
  assert.ok(validBoard(p, {story: [0, 1], claimed: null, refused: null}));
  assert.ok(validBoard(p, {story: [], claimed: ['YBY', 'YYY'], refused: null}));
  assert.ok(validBoard(p, {story: [], claimed: null, refused: ['YYB', 'YYY']}));
  for (const forged of [
    {story: [9], claimed: null, refused: null}, {story: [], claimed: ['YYB', 'YYY'], refused: null},
    {story: [], claimed: ['YYY', 'YBY'], refused: null}, {story: [], claimed: null, refused: ['YBY', 'YYY']},
    {story: [], claimed: ['YBY', 'YYY'], refused: ['YYB', 'YYY']}, {story: []}, null
  ]) assert.equal(validBoard(p, forged), false, JSON.stringify(forged));
  const budget = byId('paint-01');
  assert.equal(validBoard(budget, {story: [0, 1, 2, 3], claimed: null, refused: null}), false);
  assert.equal(validBoard(budget, {story: [], claimed: ['BYB', 'YBY'], refused: null}), false, 'no claims without Can’t');
});

test('the playground: tiles, two rows or every start, Draw and Clear', () => {
  const p = byId('paint-playground');
  let a = freshAttempt(p);
  assert.deepEqual(a.board, {slots: 3, rows: ['YBY', 'BYB'], story: []});
  assert.equal(nextHint(p, a).type, 'note');
  assert.equal(mechanicFor(p).noHint(p), true);
  assert.equal(singleCards(3).length, 9);
  a = move(p, a, {type: 'rows', rows: 'all'});
  let draws = 0, seed = 3;
  const random = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  while (new Set(rowsAfter({slots: 3, rows: 'all'}, a.board.story)).size > 1 && draws < 100) { a = move(p, a, {type: 'draw'}, random); draws++; }
  assert.ok(draws >= 3 && draws < 100);
  assert.ok(!isSolved(p, a.board));
  assert.match(html(p, a), /×8/);
  a = move(p, a, {type: 'clear'});
  assert.deepEqual(a.board.story, []);
  a = move(p, a, {type: 'size', slots: 2});
  assert.equal(a.board.slots, 2);
  a = move(p, a, {type: 'rows', rows: 'two'}, () => 0.1);
  assert.notEqual(a.board.rows[0], a.board.rows[1]);
  assert.equal(move(p, a, {type: 'size', slots: 2}), null);
  assert.equal(move(p, a, {type: 'play', card: 'Y..'}), null, 'a card must fit');
});

test('the satchel shows Paint rows with its playground and eleven puzzles', async () => {
  const merged = await loadPack();
  const page = libraryView({attempts: {}}, merged.puzzles);
  const at = page.slice(page.indexOf('data-view-key="family-paint"'));
  const section = at.slice(0, at.indexOf('</details>'));
  assert.match(section, /data-id="paint-playground"/);
  for (let i = 1; i <= 11; i++) assert.match(section, new RegExp(`data-id="paint-${String(i).padStart(2, '0')}"`));
});
