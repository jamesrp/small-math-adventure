// Prime bags: the Week 96 worksheet's worked examples (20 → 4 × 5 → 2, 2, 5;
// choosing 2 and 5 from 2, 2, 5 makes 10), the bag helpers, choosing and
// keeping, tokens with the same number, That's all and its refusals, kept
// values through bag changes and Undo, splitting with the keypad and its
// refusal, the shelf, hints, saves, rendering and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import primesModule, {primesMechanics, cardsOf, finished, firstSplits, finishedBag, subBags, valueOf, countOf, leastBag, pickCounts, tokensOf, canSplit, isPrime, allBags, LIMIT} from '../dist/families/primes/primes.js';
import {loadPack} from '../scripts/packs.mjs';

const primes = JSON.parse(await readFile(new URL('../dist/families/primes/primes.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = primesMechanics.primes;
const byId = id => primes.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal from ${JSON.stringify(b.board)}`); return next; }, a);
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const draw = (p, a, level = 0) => mech.render(p, {...a, hintLevel: level}, {});
const undo = (p, a) => ({...a, board: mech.carry(p, a.board, a.history.at(-1).board), history: a.history.slice(0, -1)});
const pick = (...tokens) => tokens.map(token => ({type: 'pick', token}));
const keep = {type: 'keep'}, all = {type: 'all'};
const add = (...xs) => xs.map(prime => ({type: 'add', prime})), drop = prime => ({type: 'drop', prime});
const uiOf = html => [...html.matchAll(/data-ui='([^']+)'/g)].map(x => JSON.parse(x[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")));

test('the worksheet’s worked examples', () => {
  // Splitting: 20 → 4 × 5 → 2, 2, 5.
  assert.deepEqual(cardsOf(20, [[0, 4]]), [4, 5]);
  assert.deepEqual(cardsOf(20, [[0, 4], [0, 2]]), [2, 2, 5]);
  assert.ok(finished([2, 2, 5]) && !finished([4, 5]));
  assert.deepEqual(finishedBag(20), [2, 2, 5]);
  // Choosing: from 2, 2, 5 choose one 2 and the 5: 2 × 5 = 10, and 20 ÷ 10 = 2 is left behind.
  const bag = [2, 0, 1, 0];
  assert.deepEqual(tokensOf(bag), [2, 2, 5]);
  assert.equal(valueOf(pickCounts(bag, [0, 2])), 10);
  assert.equal(valueOf(pickCounts(bag, [1, 2])), 10, 'the other 2 makes the same value');
  assert.equal(valueOf(bag) / 10, 2);
  assert.deepEqual(subBags(bag).map(valueOf), [1, 2, 4, 5, 10, 20]);
});

test('bag helpers: counts, splits, the smallest bags', () => {
  assert.deepEqual([[1, 1, 0, 0], [3, 0, 0, 0], [2, 1, 0, 0], [1, 1, 1, 0], [2, 2, 0, 0], [2, 1, 1, 0], [7, 4, 0, 0]].map(countOf), [4, 4, 6, 8, 9, 12, 40]);
  assert.deepEqual(firstSplits(12), [[2, 6], [3, 4]]);
  assert.deepEqual(firstSplits(36), [[2, 18], [3, 12], [4, 9], [6, 6]]);
  assert.deepEqual([4, 6, 8, 9, 10, 12].map(k => valueOf(leastBag(k))), [6, 12, 24, 36, 48, 60]);
  assert.equal(allBags().length, 330, 'bags of at most seven tokens from 2, 3, 5, 7');
  assert.ok(canSplit(12, 3) && !canSplit(12, 5) && !canSplit(9, 9) && !canSplit(60, 10), 'keys are 2 to 9, smaller than the card, and divide it');
  assert.deepEqual([1, 2, 3, 4, 9, 11, 25, 49].map(isPrime), [false, true, true, false, false, true, false, false]);
});

test('choosing and keeping: one value per choice, tokens with the same number are the same', () => {
  const p = byId('primes-02');
  let a = freshAttempt(p);
  assert.match(draw(p, a), /<span class="pm-value"[^>]*>1<\/span>/, 'nothing chosen makes 1');
  a = play(p, a, keep, ...pick(0));
  assert.match(draw(p, a), /<span class="pm-value"[^>]*>2<\/span>/);
  a = play(p, a, keep, ...pick(0, 1));
  assert.equal(move(p, a, keep), null, 'the second 2 alone makes 2 again');
  const html = draw(p, a);
  assert.match(html, /pm-keep"[^>]*disabled/, 'Keep is off');
  assert.match(html, /<li class="pm-item now"[^>]*><b>2<\/b>/, 'and the kept 2 is ringed');
  assert.deepEqual(a.board.tray.map(valueOf), [1, 2]);
  a = play(p, a, ...pick(0), keep, ...pick(2), keep);
  assert.deepEqual(a.board.tray.map(valueOf), [1, 2, 4, 8], 'kept smallest first');
  a = play(p, a, all);
  assert.ok(isSolved(p, a.board));
});

test('That’s all: refused while a value is missing, held until the tray grows, kept through Undo', () => {
  const p = byId('primes-04');
  let a = play(p, freshAttempt(p), keep, ...pick(0), keep, ...pick(0, 2), keep);
  a = play(p, a, all);
  assert.equal(a.board.said, 'more');
  assert.match(draw(p, a), /There is another\./);
  assert.match(draw(p, a), /pm-all"[^>]*disabled/);
  assert.equal(move(p, a, all), null);
  let b = play(p, a, ...pick(1));
  assert.equal(b.board.said, 'more', 'choosing keeps the refusal');
  b = undo(p, b);
  assert.equal(b.board.said, 'more', 'Undo keeps the refusal while the tray is the same');
  b = play(p, b, ...pick(0), keep);
  assert.equal(b.board.said, null, 'a new value lifts it');
  const back = undo(p, b);
  assert.deepEqual(back.board.tray.map(valueOf), [1, 2, 3, 6], 'Undo keeps the kept value');
  assert.equal(back.board.said, null, 'and That’s all stays on for the bigger tray');
  assert.doesNotMatch(draw(p, a), /\b6\b.*values|of 6/, 'no count');
});

test('design: tokens in and out, kept values pruned and given back, the refusals', () => {
  const p = byId('primes-13');
  let a = play(p, freshAttempt(p), ...add(2, 3, 5));
  assert.match(draw(p, a), /= 30/);
  for (const t of [[], [0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]]) {
    const clear = a.board.pick.map(token => ({type: 'pick', token}));
    a = play(p, a, ...clear, ...pick(...t), keep);
  }
  assert.deepEqual(a.board.tray.map(valueOf), [1, 2, 3, 5, 6, 10, 15, 30]);
  a = play(p, a, all);
  assert.equal(a.board.said, 'smaller', 'eight values, but 30 is not the smallest');
  assert.match(draw(p, a), /A bag with a smaller = number makes 8 values\./);
  assert.doesNotMatch(draw(p, a), /24/, 'the refusal does not show the smaller bag');
  let b = play(p, a, drop(5));
  assert.deepEqual(b.board.tray.map(valueOf), [1, 2, 3, 6], 'taking out the 5 drops the values that need it');
  assert.equal(b.board.said, null);
  const back = undo(p, b);
  assert.deepEqual(back.board.tray.map(valueOf), [1, 2, 3, 5, 6, 10, 15, 30], 'Undo gives them back');
  assert.equal(back.board.said, 'smaller', 'with the refusal');
  b = play(p, b, ...add(2, 2));
  assert.deepEqual(b.board.tray.map(valueOf), [1, 2, 3, 6], 'adding tokens keeps every kept value');
  assert.deepEqual(b.board.pick, [], 'a bag change clears the choice');
  for (const t of [[0, 1], [0, 1, 2], [0, 1, 3], [0, 1, 2, 3]]) {
    const clear = b.board.pick.map(token => ({type: 'pick', token}));
    b = play(p, b, ...clear, ...pick(...t), keep);
  }
  assert.deepEqual(b.board.tray.map(valueOf), [1, 2, 3, 4, 6, 8, 12, 24]);
  b = play(p, b, all);
  assert.ok(isSolved(p, b.board), '24 is the smallest bag with eight values');
  // A complete tray of the wrong count.
  const six = byId('primes-09');
  let c = play(six, freshAttempt(six), ...add(2, 3), keep, ...pick(0), keep, ...pick(1), keep, ...pick(0), keep, all);
  assert.equal(c.board.said, 'short');
  assert.match(draw(six, c), /This bag makes 4 values, not 6\./, 'the count is the full tray’s');
  assert.equal(c.board.tray.length, 4);
  // The bag holds at most seven tokens.
  const full = play(six, freshAttempt(six), ...add(...Array(LIMIT).fill(7)));
  assert.equal(move(six, full, {type: 'add', prime: 2}), null);
  assert.match(draw(six, full), /aria-label="Put a 2 in the bag" disabled/);
});

test('splitting: keys, the chosen card, a refused key, the shelf and New run', () => {
  const p = byId('primes-03');
  mech.reset(p);
  let a = freshAttempt(p);
  let html = draw(p, a);
  assert.match(html, /<span class="pm-eq" aria-hidden="true">12 =<\/span>/);
  // A key that does not divide is a refusal, not a move.
  const told = uiOf(html).find(u => u.told && u.told.d === 5);
  assert.ok(told, '5 on 12 is a refusal');
  assert.equal(move(p, a, {type: 'split', card: 0, by: 5}), null);
  mech.ui(p, told);
  html = draw(p, a);
  assert.match(html, /5 doesn’t split 12\./);
  assert.match(html, /class="pm-key marked"[^>]*>5</);
  a = play(p, a, {type: 'split', card: 0, by: 3});
  html = draw(p, a);
  assert.doesNotMatch(html, /doesn’t split/, 'the refusal goes with the board');
  assert.match(html, /aria-label="3, prime">3<\/span>/, 'a prime becomes a round token');
  assert.match(html, /pm-card selected[^>]*aria-pressed="true" aria-label="4"/, 'the composite card is chosen');
  assert.match(html, /data-focus="pm-key-4" disabled/, 'keys from the card up are off');
  a = play(p, a, {type: 'split', card: 1, by: 2});
  assert.deepEqual(a.board.shelf, [{pair: [3, 4], bag: [2, 2, 3]}]);
  assert.equal(move(p, a, {type: 'split', card: 0, by: 2}), null, 'nothing splits when every card is prime');
  a = play(p, a, all);
  assert.equal(a.board.said, 'more');
  a = play(p, a, {type: 'new'}, {type: 'split', card: 0, by: 4}, {type: 'split', card: 0, by: 2});
  assert.equal(a.board.shelf.length, 1, '4 × 3 is the first split 3 × 4 again');
  assert.match(draw(p, a), /pm-run now/);
  assert.equal(a.board.said, 'more', 'still refused');
  // Choosing another card is view state.
  a = play(p, a, {type: 'new'}, {type: 'split', card: 0, by: 2});
  html = draw(p, a);
  assert.match(html, /aria-label="6"/);
  a = play(p, a, {type: 'split', card: 1, by: 2});
  assert.equal(a.board.shelf.length, 2);
  assert.equal(a.board.said, null, 'a new first split lifts the refusal');
  a = play(p, a, all);
  assert.ok(isSolved(p, a.board));
});

test('choosing a card among several', () => {
  const p = byId('primes-08');
  mech.reset(p);
  let a = play(p, freshAttempt(p), {type: 'split', card: 0, by: 6});
  let html = draw(p, a);
  assert.match(html, /pm-card selected[^>]*aria-label="6"/, 'the first composite card starts chosen');
  const second = uiOf(html).find(u => u.sel === 1);
  mech.ui(p, second);
  html = draw(p, a);
  assert.match(html, /aria-label="Split 6"/);
  assert.match(html, /data-move="\{&quot;type&quot;:&quot;split&quot;,&quot;card&quot;:1,&quot;by&quot;:2\}"/);
});

test('hints: the authored nudge first, then one move at a time', () => {
  const every = byId('primes-04');
  let a = freshAttempt(every);
  assert.match(view(every, {...a, hintLevel: 1}), new RegExp(every.hints[0]));
  assert.equal(nextHint(every, a).text, 'Keep 1.');
  a = play(every, a, keep);
  assert.equal(nextHint(every, a).text, 'Choose a 2.');
  a = play(every, a, ...pick(2));
  assert.equal(nextHint(every, a).text, 'Keep 3.');
  const split = byId('primes-08');
  let s = freshAttempt(split);
  assert.equal(nextHint(split, s).text, 'Split 36 into 2 × 18.');
  s = play(split, s, {type: 'split', card: 0, by: 6});
  assert.equal(nextHint(split, s).text, 'Split 6 into 2 × 3.');
  const design = byId('primes-14');
  let d = play(design, freshAttempt(design), ...add(7));
  assert.equal(nextHint(design, d).text, 'Take a 7 out of the bag.');
  d = play(design, d, drop(7));
  assert.equal(nextHint(design, d).text, 'Put a 2 in the bag.');
  assert.match(draw(design, d, 2), /class="pm-token pm-add hinted"[^>]*aria-label="Put a 2 in the bag"/);
});

test('saves: forged boards are rejected', () => {
  const p = byId('primes-04'), fresh = freshAttempt(p).board;
  assert.ok(validBoard(p, fresh));
  for (const board of [{...fresh, tray: [[0, 2, 0, 0]]}, {...fresh, tray: [[1, 0, 0, 0], [0, 0, 0, 0]]}, {...fresh, pick: [3]}, {...fresh, said: 'more'}, {...fresh, done: true}, {...fresh, said: 'short', tray: [[0, 0, 0, 0]]}]) assert.equal(validBoard(p, board), false, JSON.stringify(board));
  const d = byId('primes-13'), df = freshAttempt(d).board;
  assert.equal(validBoard(d, {...df, bag: [4, 4, 0, 0]}), false, 'eight tokens');
  assert.equal(validBoard(d, {...df, bag: [1, 1, 1, 0], tray: subBags([1, 1, 1, 0]), done: true}), false, '30 is not the smallest');
  assert.ok(validBoard(d, {...df, bag: [1, 1, 1, 0], tray: subBags([1, 1, 1, 0]), said: 'smaller'}));
  const s = byId('primes-03'), sf = freshAttempt(s).board;
  assert.equal(validBoard(s, {...sf, steps: [[0, 5]]}), false);
  assert.equal(validBoard(s, {...sf, shelf: [{pair: [2, 6], bag: [2, 6]}]}), false);
});

test('every puzzle renders with its objective, and the playground has no Hint and no That’s all', () => {
  for (const p of primes.puzzles) {
    const html = view(p, freshAttempt(p));
    assert.match(html, new RegExp(`data-puzzle-id="${p.id}"`));
    if (p.visibleObjective) assert.ok(html.includes(p.visibleObjective.replace(/’/g, '’')), `${p.id}: one objective line`);
  }
  const g = byId('primes-playground');
  assert.equal(mech.noHint(g), true);
  const a = play(g, freshAttempt(g), ...add(2, 2, 3), keep);
  assert.doesNotMatch(draw(g, a), /That’s all/);
  assert.equal(move(g, a, all), null);
  assert.ok(!isSolved(g, a.board));
  assert.equal(primesModule.family.symbol, '∏');
});
