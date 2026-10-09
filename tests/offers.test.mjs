import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, nextHint, isSolved, undo} from '../dist/engine.js';
import {emptyStore, validateStore, loadStore, persistStore} from '../dist/storage.js';
import {libraryView} from '../dist/caravan-ui.js';
import {playView, parentView} from '../dist/ui.js';
import {cardsOf, stopAt, total, bestOf, isBest, planKey, follow, GOALS, sayPlan, offerMechanics} from '../dist/families/offers/offers.js';
import {validateOffers} from '../scripts/validate-offers.mjs';
import {loadPack} from '../scripts/packs.mjs';

const read = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const offers = await read('../dist/families/offers/offers.json');
const pack = await loadPack();
const puzzles = pack.puzzles, byId = id => puzzles.find(p => p.id === id);
const profile = (attempts = {}) => ({id: 'one', name: 'Explorer', avatar: 0, band: 'k1', sound: false, attempts});
function memory() { const values = new Map(); return {getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k)}; }
const play = (p, a, actions) => actions.reduce((x, action) => { const next = move(p, x, action); assert.ok(next, `${p.id}: ${JSON.stringify(action)}`); return next; }, a);
const flip = at => ({type: 'flip', at}), best = {type: 'best'}, keep = {type: 'keep'}, claim = {type: 'claim'};
const view = (p, a) => playView(p, a, {pack, selected: null, message: ''});
const solve = p => { let a = freshAttempt(p); for (let i = 0; !isSolved(p, a.board) && i < 100; i++) a = move(p, a, nextHint(p, a).action); return a; };

test('the pack validates: answers match a separate simulation, hints solve, illegal moves fail', async () => {
  const report = await validateOffers();
  assert.equal(report.offersPuzzles, 10);
  assert.deepEqual(report.answers, {'offers-01': 1, 'offers-02': 1, 'offers-03': 1, 'offers-04': 2, 'offers-05': 5, 'offers-06': 1, 'offers-07': 1, 'offers-08': 2, 'offers-09': 4, 'offers-10': 1});
});

test('cards, plans and the best plans', () => {
  const bag = [0, 4, 6];
  assert.equal(cardsOf(bag, 2).length, 9); assert.equal(cardsOf(bag, 3).length, 27);
  assert.equal(stopAt(bag, 'PTT', [0, 4]), 1, 'a first 0 passed');
  assert.equal(stopAt(bag, 'PTT', [4, 0]), 0, 'a first 4 taken');
  assert.equal(stopAt(bag, 'PPTPTTPTTTTT', [4, 0, 6]), 2, 'a first 4 passed, a second 0 passed');
  assert.deepEqual([total(bag, 2, 'PTT'), total(bag, 2, 'TTT'), total(bag, 2, 'PPP')], [40, 30, 30]);
  assert.deepEqual(bestOf(bag, 3), {most: 134, keys: ['PPTPTTPTT---']});
  assert.equal(planKey('TTTPPPPPPPPP'), 'TTT---------', 'switches after a taken first offer can’t matter');
  assert.equal(follow(bag, 2), 40);
  assert.ok(!isBest(bag, 2, 'TTT') && isBest(bag, 2, 'PTT'));
  assert.ok(!isBest(bag, 3, 'PTTPTTPTTPTT'), 'a first 4 passed scores more');
  assert.ok(!isBest(bag, 3, 'PPTPPTPTTPTT'), 'after a first 0, a second 4 taken scores more');
  assert.ok(isBest(bag, 3, 'PPTPTTPTTPPP'), 'switches after a taken first offer don’t matter');
  assert.ok(GOALS.tie([1, 5, 9]) && GOALS.tie([1, 9, 17]) && !GOALS.tie([1, 6, 9]));
  assert.ok(GOALS.flip([0, 4, 6]) && !GOALS.flip([0, 5, 6]) && !GOALS.flip([0, 3, 6]));
  assert.equal(sayPlan(bag, 3, 'PPTPTTPTT---'), 'Pass a first 0, pass a first 4, take a first 6; after a first 0, pass 0, take 4, take 6; after a first 4, pass 0, take 4, take 6.');
});

test('a plan: switches by row, the taken offer lit, a wrong claim refused without pointing, towers after', () => {
  const p = byId('offers-01');
  let a = freshAttempt(p);
  let html = view(p, a);
  assert.match(html, /<button type="button" class="off-switch take" data-off-move="[^"]*" data-focus="off-flip0" aria-label="First offer 0: take">Take<\/button>/);
  assert.match(html, /<span class="off-card" role="img" aria-label="0, 4: takes 0"><i class="off-t taken">0<\/i><i class="off-t unseen">4<\/i><\/span>/);
  assert.doesNotMatch(html, /off-tower|\b40\b/, 'no totals before a solve');
  a = play(p, a, [best]);
  assert.equal(a.board.wrong, true);
  html = view(p, a);
  assert.doesNotMatch(html, /better/, 'nothing says which row is wrong');
  assert.match(html, /Another plan scores more\./);
  assert.match(html, /data-focus="off-best" disabled/, 'one claim per plan');
  a = play(p, a, [flip(0)]);
  assert.equal(a.board.wrong, false);
  assert.match(view(p, a), /aria-label="0, 4: takes 4"><i class="off-t passed">0<\/i><i class="off-t taken">4<\/i>/);
  a = play(p, a, [best]);
  assert.ok(isSolved(p, a.board));
  html = view(p, a);
  assert.equal((html.match(/<figure class="off-towers"/g) || []).length, 3);
  assert.match(html, /aria-label="First 4: taking scores 12, passing at most 10"/);
});

test('three offers: lines after a passed first, closed while it is taken', () => {
  const p = byId('offers-06');
  let a = freshAttempt(p);
  let html = view(p, a);
  assert.equal((html.match(/class="off-switch /g) || []).length, 12);
  assert.match(html, /class="off-line shut"/);
  assert.match(html, /aria-label="After a first 0, second offer 4: take" disabled/);
  assert.equal(move(p, a, flip(4)), null, 'closed while the first 0 is taken');
  a = play(p, a, [flip(0), flip(3)]);
  html = view(p, a);
  assert.match(html, /aria-label="0, 0, 6: takes 6"><i class="off-t passed">0<\/i><i class="off-t passed">0<\/i><i class="off-t taken">6<\/i>/);
  assert.ok(isSolved(p, solve(p).board));
  assert.match(view(p, solve(p)), /aria-label="First 4: taking scores 36, passing at most 40"/);
});

test('every best plan, cards where A and B differ, and tickets for the bag', () => {
  const p4 = byId('offers-04');
  let a = play(p4, freshAttempt(p4), [flip(0), keep]);
  assert.deepEqual(a.board.kept, ['PTT']);
  assert.match(view(p4, a), /<section class="case-shelf" aria-label="Plans kept">/);
  a = play(p4, a, [claim]);
  assert.match(view(p4, a), /There’s another\./);
  a = play(p4, a, [flip(1), keep, claim]);
  assert.ok(isSolved(p4, a.board));

  const p5 = byId('offers-05');
  let b = freshAttempt(p5);
  let html = view(p5, b);
  assert.equal((html.match(/<button type="button" class="off-card/g) || []).length, 27);
  assert.doesNotMatch(html, /taken/, 'the plans are applied by the child');
  b = play(p5, b, [{type: 'keep', key: '6-0-0'}]);
  assert.match(view(p5, b), /A and B score the same on 6 0 0\./);
  html = view(p5, solve(p5));
  assert.equal((html.match(/class="off-card two yes"/g) || []).length, 5);
  assert.match(html, /aria-label="Where they differ, A scores 20 and B 24"/);

  const p8 = byId('offers-08');
  let c = play(p8, freshAttempt(p8), [{type: 'pick', value: 6}]);
  html = view(p8, c);
  assert.match(html, /<i class="off-t pin">1<\/i><i class="off-t chosen">6<\/i><i class="off-t pin">9<\/i>/);
  assert.equal((html.match(/class="off-card"/g) || []).length, 9);
  c = play(p8, c, [keep]);
  assert.equal(c.board.wrong, 'plan', 'Keep needs a best plan for the bag');
  assert.match(view(p8, c), /Another plan scores more\./);
  c = play(p8, c, [flip(0), keep]);
  assert.equal(c.board.wrong, 'goal');
  assert.match(view(p8, c), /No tie\./);
  html = view(p8, solve(p8));
  assert.match(html, /<h3 class="case-bin-label">A tie<\/h3>/);
  assert.equal((html.match(/<li class="case-kept /g) || []).length, 19);

  const p10 = byId('offers-10');
  html = view(p10, solve(p10));
  assert.match(html, /<h3 class="case-bin-label">Passed first, taken second<\/h3><ol class="case-list"><li class="case-kept yes" style="--i:0" aria-label="4: passed first, taken second">/);
  assert.match(parentView({...emptyStore(), profiles: []}, null, pack), /Take it or pass/);
});

test('the playground: draw, pass, take; the last offer must be taken; rounds piled by score', () => {
  const pg = byId('offers-playground');
  let a = freshAttempt(pg);
  a = move(pg, a, {type: 'draw'}, () => 0);
  a = move(pg, a, {type: 'pass'}, () => 0.5);
  let html = view(pg, a);
  assert.match(html, /<i class="off-t passed">0<\/i><i class="off-t current">4<\/i>/);
  assert.match(html, /aria-label="1 offer left"/);
  assert.match(html, /data-focus="off-pass" disabled/, 'the last offer must be taken');
  assert.match(html, /aria-label="Bag 0, 2, 6" disabled/, 'the bag stays fixed during a round');
  assert.ok(offerMechanics.offers.noUndo(pg), 'a passed offer is gone for good');
  a = move(pg, a, {type: 'take'});
  html = view(pg, a);
  assert.match(html, /data-bin="4"[^]*?aria-label="0, 4: took 4"/);
  a = move(pg, a, {type: 'offers', n: 3});
  assert.deepEqual(a.board, {bag: 0, n: 3, offers: [], rounds: []});
  assert.ok(!isSolved(pg, a.board)); assert.equal(nextHint(pg, a).type, 'done');
});

test('saves round-trip through storage, and forged saves are refused', () => {
  const p = byId('offers-06'), a = solve(p);
  const wrong = play(byId('offers-01'), freshAttempt(byId('offers-01')), [best]);
  const shelf = play(byId('offers-09'), freshAttempt(byId('offers-09')), [flip(0), flip(1), flip(4), keep]);
  const cards = play(byId('offers-05'), freshAttempt(byId('offers-05')), [{type: 'keep', key: '4-0-0'}, {type: 'keep', key: '0-0-0'}]);
  const bag = play(byId('offers-10'), freshAttempt(byId('offers-10')), [{type: 'pick', value: 2}, flip(1), keep]);
  const pg = byId('offers-playground'), toy = move(pg, move(pg, freshAttempt(pg), {type: 'draw'}, () => 0.9), {type: 'take'}, () => 0.1);
  const saved = {[p.id]: a, 'offers-01': wrong, 'offers-09': shelf, 'offers-05': cards, 'offers-10': bag, [pg.id]: toy};
  const store = {...emptyStore(), activeProfileId: 'one', profiles: [profile(saved)]};
  const storage = memory();
  assert.equal(persistStore(storage, store, puzzles), '');
  const loaded = loadStore(storage, puzzles);
  for (const [id, x] of Object.entries(saved)) assert.deepEqual(loaded.store.profiles[0].attempts[id].board, x.board, id);
  assert.equal(bag.board.wrong, 'plan');
  assert.equal(undo(bag).board.wrong, null);
  const forged = {...store, profiles: [profile({'offers-01': {...wrong, board: {...wrong.board, wrong: 1}}})]};
  assert.throws(() => validateStore(forged, puzzles), 'a stored answer the app would not give');
});

test('the satchel lists Take it or pass with its playground and ten puzzles', () => {
  assert.equal(offers.puzzles.length, 11);
  const html = libraryView(profile({'offers-02': {completed: true}}), puzzles);
  assert.match(html, /data-view-key="family-offers"/);
  assert.match(html, /data-id="offers-playground"[^>]*>.*Playground/);
  for (let n = 1; n <= 10; n++) assert.ok(html.includes(`data-id="offers-${String(n).padStart(2, '0')}"`));
  assert.match(html, /Take it or pass, Easy, puzzle 2, completed/);
});
