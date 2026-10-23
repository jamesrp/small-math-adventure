// Square leftovers: squares and bundles, sorting into bins and That's all,
// finding every card, telling cards apart with tries and Can't, the view
// state (the card in hand, chosen counters, refusal lines), hints, Undo,
// saves, the playground and rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import leftoversModule, {leftover, nextBundle, bundleOk, finished, looseOf, loopsOf, matchOf, tells, workingChoices, shownCard, inHand, cantReason, slid, gridFor} from '../dist/families/leftovers/leftovers.js';
import {loadPack, FAMILIES} from '../scripts/packs.mjs';

const pack = JSON.parse(await readFile(new URL('../dist/families/leftovers/leftovers.json', import.meta.url), 'utf8'));
const merged = await loadPack();
const byId = id => pack.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const view = (p, a) => playView(p, a, {pack: merged, selected: null, message: ''});
const mech = mechanicFor(byId('leftovers-01'));
const reset = p => mech.reset(p);

test('the family entry and its symbol', () => {
  assert.deepEqual(leftoversModule.family, {id: 'leftovers', symbol: '⊟'});
  const others = FAMILIES.filter(m => m.family && m.id !== 'leftovers').map(m => m.family.symbol);
  assert.ok(!others.includes('⊟'), 'no other family uses ⊟');
  assert.equal(pack.puzzles.filter(p => p.band !== 'playground').length, 12);
  assert.deepEqual(['easy', 'medium', 'hard'].map(l => pack.puzzles.filter(p => p.difficulty_level === l).length), [4, 4, 4]);
});

test('squares and bundles', () => {
  assert.deepEqual([0, 1, 2, 3].map(n => leftover(n, 4)), [0, 1, 0, 1]);
  assert.equal(leftover(14, 15), 1);
  assert.deepEqual(nextBundle([], 3, 4), [0, 1, 2, 3]);
  assert.deepEqual(nextBundle([[3, [0, 1, 2, 3]]], 3, 4), [4, 5, 6, 7]);
  assert.equal(nextBundle([[3, [0, 1, 2, 3]], [3, [4, 5, 6, 7]]], 3, 4), null, 'one counter is left');
  assert.ok(bundleOk([], 4, 4, [0, 1, 4, 5, 2, 3, 6, 7]), 'two bundles at once');
  assert.ok(!bundleOk([], 4, 4, [0, 1, 4]), 'not whole bundles');
  assert.ok(finished([], 2, 5), '4 counters are fewer than a bundle of 5');
  assert.ok(finished([], 0, 3), 'no counters at all');
  assert.equal(looseOf([[4, [0, 1, 2, 4, 5, 6]]], 4), 10);
  assert.deepEqual(loopsOf([[4, [0, 1, 2, 4, 5, 6]]], 4, 3), [[0, 1, 2], [4, 5, 6]], 'each bundle is its own loop');
});

test('a slide: the rectangle when it is whole bundles, else the counters slid over', () => {
  const all = cells => cells;
  // 4 by 4 with bundles of 3: a 4 by 3 strip is four bundles.
  assert.equal(slid(gridFor(4), all, [0, 1, 2, 6, 10, 14], 3).length, 12);
  // 4 by 4 with bundles of 5: no rectangle is whole bundles, so a lasso of five is chosen.
  assert.deepEqual(slid(gridFor(4), all, [0, 1, 2, 3, 7], 5), [0, 1, 2, 3, 7]);
  // A stroke that doubles back counts each counter once.
  assert.deepEqual(slid(gridFor(4), all, [0, 1, 0], 5), [0, 1]);
  // Bundled counters are never chosen again.
  assert.deepEqual(slid(gridFor(4), cells => cells.filter(i => i > 0), [0, 1, 2, 3, 7, 11], 5), [1, 2, 3, 7, 11]);
  // ...and a rectangle whose loose counters are whole bundles is taken whole.
  assert.deepEqual(slid(gridFor(4), cells => cells.filter(i => i > 0), [0, 1, 2, 6], 5), [1, 2, 4, 5, 6]);
});

test('telling cards apart', () => {
  assert.deepEqual(matchOf(5, [7]), [3, 4]);
  assert.deepEqual(matchOf(5, [12]), [2, 4]);
  assert.equal(matchOf(5, [11]), null);
  assert.ok(tells(15, [10, 11]) && !tells(16, [10, 11]), '10 and 11 tell 0 to 15 apart, not 0 to 16');
  assert.deepEqual(matchOf(16, [10, 11]), [6, 16]);
  assert.deepEqual(workingChoices(byId('leftovers-12').parameters), [[10, 11]]);
  assert.equal(cantReason(byId('leftovers-11').parameters), 'Two cards that add up to the size always match, so sizes 2 to 11 have a match, and 12 makes 2 and 4 match.');
});

test('a sort: the card in hand, bundling and the early stop', () => {
  const p = byId('leftovers-01');
  reset(p);
  let a = freshAttempt(p);
  assert.equal(shownCard(p, a.board), 0, 'the first card is in hand');
  let html = view(p, a);
  assert.match(html, /lo-work/);
  assert.match(html, /Bundles of 4/);
  assert.doesNotMatch(html, /puzzle-goal|Put each card/, 'no objective copy on the board');
  assert.doesNotMatch(html, /leaves|left over: \d/i, 'no leftover is said before bundling');
  // Tapping card 3 shows its square; nothing is bundled yet.
  mech.ui(p, {card: 3});
  assert.equal(shownCard(p, a.board), 3);
  html = view(p, a);
  assert.equal((html.match(/class="lo-counter"/g) || []).length, 9, 'nine loose counters');
  // Choosing three counters and pressing Bundle says the size; the view keeps the choice.
  mech.ui(p, {show: 3, chosen: [0, 1, 2], told: 'size'});
  assert.match(view(p, a), /Not whole bundles\.<\/p>/);
  assert.match(view(p, a), /lo-bundle hinted/, 'Bundle is outlined after a refused choice');
  assert.equal((view(p, a).match(/lo-counter chosen/g) || []).length, 3);
  // A bundle (a move) clears the view state, and the card bundled stays in hand.
  a = play(p, a, {type: 'bundle', side: 3, cells: [0, 1, 3, 4]});
  assert.equal(shownCard(p, a.board), 3);
  assert.equal(inHand(p.parameters, a.board), 3);
  html = view(p, a);
  assert.equal((html.match(/lo-counter taken/g) || []).length, 4);
  assert.match(html, /lo-loop lo-loop-0/);
  // Stopping early is refused by the rules; the board says another bundle fits.
  assert.equal(move(p, a, {type: 'place', side: 3, bin: 1}), null);
  mech.ui(p, {show: 3, chosen: [], told: 'more'});
  assert.match(view(p, a), /Another bundle fits\./);
  a = play(p, a, {type: 'bundle', side: 3, cells: nextBundle(a.board.bundles, 3, 4)});
  html = view(p, a);
  assert.equal((html.match(/lo-counter left/g) || []).length, 1, 'the leftover counter is ringed');
  assert.match(html, /lo-bundle"[^>]*disabled/, 'Bundle is off with fewer than a bundle left');
  a = play(p, a, {type: 'place', side: 3, bin: 1});
  assert.match(view(p, a), /Bin 1: 3\./);
  assert.match(view(p, a), /lo-claim"[^>]*disabled/, 'That’s all waits for every card');
  reset(p);
});

test('That’s all: a wrong bin is locked through Undo; the solve marks the empty bins', () => {
  const p = byId('leftovers-03');
  reset(p);
  let a = play(p, freshAttempt(p), ...[[0, 0], [1, 1], [2, 4], [3, 1], [4, 1]].map(([side, bin]) => ({type: 'place', side, bin})));
  a = play(p, a, {type: 'claim'});
  assert.match(view(p, a), /A card is in the wrong bin\./);
  assert.match(view(p, a), /lo-claim"[^>]*disabled/);
  const back = undoPress(p, a, b => view(p, b), view(p, a));
  assert.equal(back.board.where[4], null, 'Undo takes back the last placing');
  assert.equal(back.board.shut.length, 1, 'the lock stays');
  a = play(p, back, {type: 'place', side: 4, bin: 1});
  assert.equal(move(p, a, {type: 'claim'}), null, 'the same arrangement is still refused');
  a = play(p, a, {type: 'place', side: 3, bin: 4}, {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  const html = view(p, a);
  assert.equal((html.match(/lo-bin never/g) || []).length, 2, 'bins 2 and 3 never fill');
  assert.doesNotMatch(html, /lo-work/, 'no work area after the solve');
  reset(p);
});

test('a find: every card, no slots, and the two refusals', () => {
  const p = byId('leftovers-09');
  reset(p);
  let a = freshAttempt(p);
  const html = view(p, a);
  assert.match(html, /Find every card that leaves 1\./);
  assert.equal((html.match(/class="lo-bin[ "]/g) || []).length, 1, 'one bin');
  assert.doesNotMatch(html, /lo-slot/, 'no slot per answer');
  a = play(p, a, {type: 'place', side: 1, bin: 1}, {type: 'place', side: 14, bin: 1}, {type: 'claim'});
  assert.match(view(p, a), /Not yet\./);
  assert.doesNotMatch(view(p, a), /another|belong/, 'the line doesn’t say what is wrong');
  // Taking a card out uses the empty place at the end of the row.
  mech.ui(p, {card: 14});
  assert.match(view(p, a), /lo-row-drop"[^>]*data-lo-bin="row"[^>]*aria-label="Take card 14 out of its bin"/);
  a = play(p, a, {type: 'place', side: 4, bin: 1}, {type: 'place', side: 11, bin: 1}, {type: 'claim'});
  assert.ok(isSolved(p, a.board));
  reset(p);
});

test('tell: tries, the matching pair, Can’t refused and right, Again', () => {
  const p = byId('leftovers-08');
  reset(p);
  let a = freshAttempt(p);
  let html = view(p, a);
  assert.match(html, /lo-try"[^>]*disabled/, 'Try waits for a size');
  assert.match(html, /lo-cant"[^>]*disabled/, 'Can’t waits for a try');
  assert.equal((html.match(/lo-size-button/g) || []).length, 11);
  a = play(p, a, {type: 'size', size: 7}, {type: 'try'});
  html = view(p, a);
  assert.equal((html.match(/lo-card pair/g) || []).length, 2, 'two cards match');
  assert.match(html, /aria-label="Bundles of 7: cards 3 and 4 both leave 2\."/);
  assert.match(html, /<span class="lo-mini" aria-hidden="true">3<\/span><span class="lo-mini" aria-hidden="true">4<\/span><span class="lo-to" aria-hidden="true">→ 2<\/span>/);
  assert.match(html, /lo-pip used/);
  a = play(p, a, {type: 'cant'});
  assert.match(view(p, a), /There is a way\./);
  a = play(p, a, {type: 'size', size: 7}, {type: 'size', size: 11}, {type: 'try'});
  assert.ok(isSolved(p, a.board));
  assert.equal((view(p, a).match(/class="lo-sig"/g) || []).length, 7, 'every card shows its leftover after the win, behind the key');
  assert.match(view(p, a), /lo-card lo-key/);
  // Again keeps the round's failed tries, faded, and Undo of Again brings the round back.
  const r = byId('leftovers-12');
  let c2 = freshAttempt(r);
  for (const pair of [[2, 3], [2, 4], [3, 4], [2, 5]]) c2 = play(r, c2, ...c2.board.chosen.map(size => ({type: 'size', size})), ...pair.map(size => ({type: 'size', size})), {type: 'try'});
  c2 = play(r, c2, {type: 'again'});
  assert.deepEqual(c2.board.past, [[2, 3], [2, 4], [3, 4], [2, 5]]);
  assert.equal((view(r, c2).match(/<li class="past"/g) || []).length, 4, 'four faded records');
  c2 = play(r, c2, {type: 'size', size: 2}, {type: 'size', size: 3}, {type: 'try'});
  assert.equal((view(r, c2).match(/<li class="past"/g) || []).length, 3, 'a record tried again shows once, in this round');
  assert.ok(validBoard(r, JSON.parse(JSON.stringify(c2.board))));
  const back2 = undoPress(r, c2, b => view(r, b), view(r, c2));
  assert.deepEqual(back2.board.past, [[2, 3], [2, 4], [3, 4], [2, 5]], 'Undo keeps the earlier rounds');
  assert.ok(!validBoard(r, {...c2.board, past: [[10, 11]]}), 'a working choice is never a past failure');
  assert.ok(!validBoard(r, {...c2.board, past: [[2, 3], [2, 3]]}), 'each once');
  const q = byId('leftovers-11');
  let c = play(q, freshAttempt(q), {type: 'size', size: 12}, {type: 'try'}, {type: 'cant'});
  assert.ok(isSolved(q, c.board));
  assert.match(view(q, c), /lo-catalog/);
  reset(p);
});

test('hints: level 2 outlines, bundles before placing, and they solve every puzzle', () => {
  for (const p of pack.puzzles.filter(x => x.band !== 'playground')) {
    reset(p);
    let a = freshAttempt(p);
    const outlined = view(p, {...a, hintLevel: 2});
    assert.match(outlined, /hinted/, `${p.id}: level 2 outlines something`);
    for (let k = 0; k < 600 && !isSolved(p, a.board); k++) { const h = nextHint(p, a); assert.equal(h.type, 'move', `${p.id}: ${h.text}`); a = play(p, a, h.action); }
    assert.ok(isSolved(p, a.board), `${p.id}: hints solve it`);
  }
  const p = byId('leftovers-01');
  reset(p);
  mech.ui(p, {card: 3});
  assert.equal(nextHint(p, freshAttempt(p)).text, 'Put card 0 in bin 0.', 'card 0 needs no bundle');
  reset(p);
  const p3 = byId('leftovers-01');
  let a = play(p3, freshAttempt(p3), {type: 'place', side: 0, bin: 0}, {type: 'place', side: 1, bin: 1});
  assert.equal(nextHint(p3, a).text, 'Press Bundle.', 'card 2 is in hand: Bundle');
  mech.ui(p3, {card: 3});
  assert.equal(nextHint(p3, a).text, 'Tap card 2, then press Bundle.', 'another card shown: tap card 2 first');
  reset(p3);
});

test('saves round-trip, and forged boards are rejected', () => {
  const p = byId('leftovers-06');
  let a = play(p, freshAttempt(p), {type: 'bundle', side: 5, cells: nextBundle([], 5, 8)}, {type: 'place', side: 0, bin: 0});
  const saved = JSON.parse(JSON.stringify(a.board));
  assert.ok(validBoard(p, saved));
  assert.ok(!validBoard(p, {...saved, bundles: [[5, [0, 1, 2, 3, 4, 5, 6, 99]]]}), 'no counter 99');
  assert.ok(!validBoard(p, {...saved, shut: ['not json']}));
  const t = byId('leftovers-12');
  assert.ok(!validBoard(t, {chosen: [10], tries: [[10]], cant: null}), 'a try of one size in a two-size puzzle');
  assert.ok(validBoard(t, {chosen: [10, 11], tries: [[2, 3]], cant: null}));
});

test('the playground: side, size, bundles and Clear', () => {
  const g = pack.puzzles.find(p => p.band === 'playground');
  reset(g);
  let a = freshAttempt(g);
  let html = view(g, a);
  assert.match(html, /lo-steppers/);
  assert.equal((html.match(/class="lo-counter"/g) || []).length, 9);
  a = play(g, a, {type: 'side', side: 10}, {type: 'size', size: 7});
  const strip = [];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 7; x++) strip.push(y * 10 + x);
  a = play(g, a, {type: 'bundle', side: 10, cells: strip});
  html = view(g, a);
  assert.equal((html.match(/lo-loop lo-loop/g) || []).length, 10, 'a 10 by 7 strip is ten bundles');
  assert.equal(nextHint(g, a).type, 'note');
  assert.equal(mechanicFor(g).noHint(g), true);
  reset(g);
});

test('every puzzle renders, and hints answer quickly', () => {
  for (const p of pack.puzzles) {
    reset(p);
    const a = freshAttempt(p);
    assert.match(view(p, a), new RegExp(`data-puzzle-id="${p.id}"`));
    const t = performance.now();
    for (let k = 0; k < 20; k++) nextHint(p, a);
    assert.ok(performance.now() - t < 400, `${p.id}: twenty hints in under 0.4 s`);
  }
});
