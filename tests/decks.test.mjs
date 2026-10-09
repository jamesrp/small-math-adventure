import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo, resumeAttempt} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import decksModule, {wins, beats, bigWin, isCycle, bigWins, GOALS, dealsOf, swapCards, stepToward, dealKey} from '../dist/families/decks/decks.js';
import {validateDecks} from '../scripts/validate-decks.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const decks = await read('../dist/families/decks/decks.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const mark = (cell, side) => ({type: 'mark', cell, side}), swap = (a, b) => ({type: 'swap', a, b}), pick = value => ({type: 'pick', value});
const keep = {type: 'keep'}, claim = {type: 'claim'}, cant = {type: 'cant'};
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 400; i++) a = move(p, a, nextHint(p, a).action); return a; };
const mechanic = decksModule.mechanics.decks;
const P1 = [[2, 4, 9], [1, 6, 8], [3, 5, 7]];

test('the pack validates: answers match a separate enumeration, hints solve, illegal moves fail', async () => {
  const report = await validateDecks();
  assert.equal(report.decksPuzzles, 12);
  assert.deepEqual([report.deals, report.cycles], [1680, 15]);
  assert.deepEqual(report.answers, {'decks-01': 1, 'decks-02': 1, 'decks-03': 1, 'decks-04': 2, 'decks-05': 5, 'decks-06': 2, 'decks-07': 0, 'decks-08': 3, 'decks-09': 15, 'decks-10': 0, 'decks-11': 3, 'decks-12': 0});
});

test('A beats B, B beats C and C beats A; big wins; deals and swaps', () => {
  assert.deepEqual([wins(P1[0], P1[1]), wins(P1[1], P1[0])], [5, 4]);
  assert.ok(beats(P1[0], P1[1]) && beats(P1[1], P1[2]) && beats(P1[2], P1[0]) && isCycle(P1));
  assert.ok(!bigWin(P1[0], P1[1]) && bigWin([7, 8, 9], P1[0]));
  assert.equal(bigWins([[2, 3, 9], [1, 7, 8], [4, 5, 6]]), 2);
  assert.ok(GOALS.tie([[1, 4], [2, 3]]) && !GOALS.tie([[1, 2, 6], [3, 4, 5]]));
  const q = {decks: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]};
  assert.equal(dealsOf(q).length, 1680);
  assert.equal(dealsOf(q).filter(isCycle).length, 15);
  assert.equal(dealsOf({decks: [[1, 2, 9], [3, 4, 8], [5, 6, 7]], pins: [[9], [8], [7]]}).length, 90, 'with 9, 8 and 7 pinned');
  assert.deepEqual(swapCards(P1, 9, 1), [[1, 2, 4], [6, 8, 9], [3, 5, 7]]);
  assert.equal(swapCards(P1, 2, 4), null, 'cards in one deck don’t swap');
  // A hint step puts at least one card where it belongs, by a direct exchange when there is one.
  assert.deepEqual(stepToward([[1, 2, 3], [4, 5, 6], [7, 8, 9]], [[1, 7, 8], [4, 5, 6], [2, 3, 9]]), [2, 7]);
  assert.deepEqual(stepToward([[1, 2], [3, 4], [5, 6]], [[3, 4], [5, 6], [1, 2]]), [1, 5], 'no direct exchange: one card goes home');
  assert.equal(dealKey(P1), '2-4-9|1-6-8|3-5-7');
});

test('pairs: each pair shows both cards until its winner is tapped, then the winner’s colour', () => {
  const p = byId('decks-01');
  let a = freshAttempt(p);
  let html = view(p, a);
  assert.equal((html.match(/class="deck-pair /g) || []).length, 18, 'nine pairs, two cards each');
  assert.match(html, /aria-label="A wins more pairs" disabled/, 'nothing to choose yet');
  assert.doesNotMatch(html, /class="deck-verdict"/, 'no verdict before the child decides');
  assert.equal(move(p, a, mark(0, 1)), null, 'B’s 1 is smaller than A’s 2');
  assert.match(html, /class="deck-pair deck-B" data-deck-say="2 is bigger than 1\." data-focus="pair-0-1"/, 'the smaller card says which is bigger');
  mechanic.ui(p, {say: '2 is bigger than 1.', moves: 0});
  assert.match(view(p, a), /<p class="case-note" role="status">2 is bigger than 1\.<\/p>/);
  a = play(p, a, [mark(0, 0)]);
  assert.doesNotMatch(view(p, a), /2 is bigger than 1\.<\/p>/, 'a move clears it');
  html = view(p, a);
  assert.match(html, /<span class="deck-cell win-A" role="img" aria-label="A 2 against B 1: A wins"><i class="deck-A won">2<\/i><i class="deck-B">1<\/i><\/span>/);
  a = play(p, a, [mark(1, 1), mark(2, 1), mark(3, 0), mark(4, 1), mark(5, 1), mark(6, 0), mark(7, 0), mark(8, 0)]);
  a = play(p, a, [{type: 'choose', deck: 1}]);
  assert.match(view(p, a), /Count again\./);
  assert.match(view(p, a), /aria-label="B wins more pairs" disabled/, 'the deck refused greys');
  a = play(p, a, [{type: 'choose', deck: 0}]);
  assert.ok(isSolved(p, a.board));
  assert.match(view(p, a), /class="deck-verdict"><span class="deck-tag deck-A" aria-hidden="true">A<\/span> beats/);
  // Puzzle 3 then asks whether any deck beats both others.
  const p3 = byId('decks-03');
  let b = play(p3, freshAttempt(p3), [...[[0, 0], [1, 1], [2, 1], [3, 0], [4, 0], [5, 1], [6, 0], [7, 0], [8, 1]].map(([k, s]) => mark(k, s)), {type: 'choose', deck: 0}]);
  assert.ok(!isSolved(p3, b.board));
  html = view(p3, b);
  assert.match(html, /class="deck-loop">(<span>[^]*?<\/span><\/span>){3}<\/p><p class="deck-ask">Does any deck beat both others\?<\/p>/);
  assert.match(html, /aria-label="No deck does"/);
  b = play(p3, b, [{type: 'best', deck: 0}]);
  assert.match(view(p3, b), /C beats A\.<\/p>/);
  assert.match(view(p3, b), /aria-label="A does" disabled/);
  b = play(p3, b, [{type: 'best', deck: null}]);
  assert.ok(isSolved(p3, b.board));
  assert.match(view(p3, b), /No deck beats both others: each beats one and loses to one\./);
  assert.match(view(p3, solve(p3)), /<span class="sr-only">C beats A<\/span>/);
});

test('a deal: card buttons, pinned pictures, live grids with verdicts, and the picked card', () => {
  const p = byId('decks-09'), a = freshAttempt(p);
  let html = view(p, a);
  assert.match(html, /<button type="button" class="deck-card deck-C" data-card="1" data-focus="card-1" aria-pressed="false" aria-label="1 in deck C"><b>1<\/b><span class="deck-dots" aria-hidden="true"><i><\/i><\/span><\/button>/);
  assert.equal((html.match(/class="deck-grid"/g) || []).length, 3);
  assert.match(html, /<span class="sr-only">A beats B<\/span>/);
  assert.match(html, /<span class="sr-only">A beats C<\/span>/, 'C against A');
  assert.match(html, /role="status">A: 3, 6, 9\. B: 2, 5, 8\. C: 1, 4, 7\. A beats B\. B beats C\. A beats C\.</);
  assert.doesNotMatch(html, /\b[0-9] of 9\b/, 'no counts');
  mechanic.ui(p, {pick: 2, moves: 0});
  html = view(p, a);
  assert.match(html, /class="deck-card deck-B picked" data-card="2" data-focus="card-2" aria-pressed="true" aria-label="2 in deck B, picked"/);
  assert.match(html, /Picked 2\./);
  assert.doesNotMatch(view(p, play(p, a, [swap(1, 5)])), /picked/, 'a move, Undo or applied hint forgets the pick');
  mechanic.ui(p, {pick: 'x', moves: 0});
  assert.doesNotMatch(view(p, a), /picked/);
  mechanic.ui(p, {pick: 3, moves: 0}); mechanic.reset(p);
  assert.doesNotMatch(view(p, a), /picked/, 'Restart forgets the pick');
  const b = play(p, a, [cant]);
  assert.match(view(p, b), /Keep looking\./);
  // Pinned cards are pictures, not buttons.
  const p8 = byId('decks-08'), pinned = view(p8, freshAttempt(p8));
  assert.doesNotMatch(pinned, /data-card="9"/);
  assert.match(pinned, /role="img" aria-label="9 in deck A, stays put"><b>9<\/b>[^]*?case-pin/);
});

test('a card in the empty place, a swap and the certificates', () => {
  const p6 = byId('decks-06');
  let a = play(p6, freshAttempt(p6), [pick(9)]);
  let html = view(p6, a);
  assert.match(html, /class="deck-card deck-A trial" role="img" aria-label="9, tried in the empty place"/);
  assert.match(html, /aria-pressed="true" aria-label="Try 9"/);
  assert.doesNotMatch(html, /class="deck-verdict"/, 'find every: Keep checks, the grids don’t say');
  a = play(p6, a, [keep]);
  assert.match(view(p6, a), /<p class="case-note" role="status">C doesn’t beat A\.<\/p>/, 'the win that is missing');
  html = view(p6, solve(p6));
  assert.match(html, /<h3 class="case-bin-label">It works<\/h3><ol class="case-list"><li class="case-kept yes" style="--i:0" aria-label="2: it works">/);
  assert.match(html, /<h3 class="case-bin-label">C doesn’t beat A<\/h3>/);
  assert.equal((html.match(/<li class="case-kept /g) || []).length, 5, 'every card of the menu');
  assert.doesNotMatch(html, /case-shelf/);

  const p5 = byId('decks-05');
  a = play(p5, freshAttempt(p5), [swap(9, 6)]);
  html = view(p5, a);
  assert.match(html, /class="deck-card deck-A moved" data-card="6"[^>]*disabled/, 'one swap at a time, the moved cards marked');
  assert.equal((html.match(/deck-card deck-[AB] waiting/g) || []).length, 4, 'the others wait');
  a = play(p5, a, [keep]);
  assert.deepEqual(a.board, {swap: null, kept: ['9-6'], claimed: false, missed: false, wrong: false});
  assert.match(view(p5, a), /<section class="case-shelf" aria-label="Swaps kept">/);
  assert.equal((view(p5, solve(p5)).match(/class="case-kept yes"/g) || []).length, 5);

  const p7 = byId('decks-07'), split = play(p7, freshAttempt(p7), [cant]);
  assert.ok(isSolved(p7, split.board));
  html = view(p7, split);
  assert.equal((html.match(/<li class="case-kept /g) || []).length, 10, 'every split with 1 in A');
  assert.match(html, /<h3 class="case-bin-label">5 to 4<\/h3>/);
  assert.doesNotMatch(html, /tie/);
  const p10 = byId('decks-10');
  html = view(p10, play(p10, freshAttempt(p10), [cant]));
  assert.equal((html.match(/deck-cell win-[ABC] lost/g) || []).length, 4, 'card 1’s pairs');
  assert.match(html, /Card 1 loses every pair it is in/);
  const p12 = byId('decks-12');
  html = view(p12, play(p12, freshAttempt(p12), [cant]));
  assert.equal((html.match(/<li class="case-kept /g) || []).length, 15);
  assert.match(html, /Two big wins/); assert.doesNotMatch(html, /Three big wins/);

  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Three decks/);
});

test('the playground: a match of two decks, rounds piled by the winner; never solved', () => {
  const pg = byId('decks-playground');
  let a = freshAttempt(pg);
  a = move(pg, a, {type: 'random', n: 10}, () => 0.5);
  assert.deepEqual(a.board.rounds, Array(10).fill([4, 6]));
  const html = view(pg, a);
  assert.match(html, /data-bin="B"[^]*?(case-kept[^]*?){10}<\/ol>/);
  assert.match(html, /role="status">A: 2, 4, 9\. B: 1, 6, 8\. C: 3, 5, 7\. A against B\. A 4, B 6\. A has won 0, B 10\./);
  assert.match(html, /aria-pressed="true" aria-label="A against B"/);
  a = play(pg, a, [{type: 'match', match: 1}]);
  assert.deepEqual(a.board.rounds, []);
  assert.ok(!isSolved(pg, a.board));
  assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('decks-08'), a = solve(p);
  const half = play(byId('decks-01'), freshAttempt(byId('decks-01')), [mark(0, 0), mark(1, 1)]);
  const menu = play(byId('decks-06'), freshAttempt(byId('decks-06')), [pick(2), keep, pick(9)]);
  const swaps = play(byId('decks-05'), freshAttempt(byId('decks-05')), [swap(4, 8), keep]);
  const deal = play(byId('decks-11'), freshAttempt(byId('decks-11')), [swap(4, 3), cant]);
  const pg = byId('decks-playground'), toy = move(pg, freshAttempt(pg), {type: 'random', n: 10}, () => 0.7);
  const saved = {[p.id]: a, 'decks-01': half, 'decks-06': menu, 'decks-05': swaps, 'decks-11': deal, [pg.id]: toy};
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile(saved)]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of Object.entries(saved)) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.deepEqual(resumeAttempt(p, a).board, freshAttempt(p).board);
  assert.deepEqual(undo(deal).board, play(byId('decks-11'), freshAttempt(byId('decks-11')), [swap(4, 3)]).board);
  const forged = {...store, profiles: [profile({[p.id]: {...a, board: {...a.board, kept: a.board.kept.slice(1)}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'claimed with a deal missing');
  const p11 = byId('decks-11');
  assert.equal(isSolved(p11, {decks: P1, cant: true}), false, 'Can’t when a deal works is not a solve');
});

test('the satchel lists Three decks with its playground and twelve puzzles', () => {
  assert.equal(decks.puzzles.length, 13);
  const html = libraryView(profile({'decks-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-decks"/);
  assert.match(html, /data-id="decks-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 12; n++) assert.ok(html.includes(`data-id="decks-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Three decks, Easy, puzzle 2, completed/);
});
