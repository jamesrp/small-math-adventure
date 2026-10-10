// Nesting cards: the counts and largest collections, taps that choose, refuse
// and put back, kept cards, extend decks done and stuck, rows and their marks,
// rows that need no chosen card, find-every with That's all, Undo, hints,
// saves, rendering and the playground.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {freshAttempt, move, isSolved, nextHint, validBoard, undo} from '../dist/engine.js';
import {playView} from '../dist/ui.js';
import {nestMechanics, deckInfo, antichainsOf, bestOf, largest, maskOf, lettersOf, cardWords, rowStates, certified, coverPaths} from '../dist/families/nests/nests.js';
import {loadPack} from '../scripts/packs.mjs';

const nests = JSON.parse(await readFile(new URL('../dist/families/nests/nests.json', import.meta.url), 'utf8'));
const pack = await loadPack();
const mech = nestMechanics.nests;
const byId = id => nests.puzzles.find(p => p.id === id);
const play = (p, a, ...actions) => actions.reduce((b, action) => { const next = move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); return next; }, a);
const at = (p, d, s) => p.parameters.decks[d].cards.indexOf(s);
const taps = (p, d, list) => list.split(' ').map(s => ({type: 'tap', deck: d, card: at(p, d, s === '0' ? '' : s)}));
const put = (p, s, row) => ({type: 'place', card: at(p, 0, s === '0' ? '' : s), row});
const chosen = (p, a, d = 0) => a.board.decks[d].chosen.map(i => p.parameters.decks[d].cards[i]).sort().join('/');
// The card whose links show is view state; a view starts fresh unless kept.
const view = (p, a, keep = false) => { if (!keep) mech.reset(p); return playView(p, a, {pack, selected: null, message: ''}); };
const visible = html => html.replace(/<p class="sr-only"[^]*?<\/p>/g, '').replace(/<[^>]*>/g, ' ');
const DECK = n => ({cards: Array.from({length: 1 << n}, (_, m) => lettersOf(m))});

test('counts: every collection of the full decks, and the largest ones', () => {
  assert.deepEqual([1, 2, 3, 4].map(n => antichainsOf(deckInfo(DECK(n))).length), [3, 6, 20, 168], 'with the collection of no cards');
  assert.deepEqual([1, 2, 3, 4, 5].map(n => bestOf(deckInfo(DECK(n)))), [1, 2, 3, 6, 10], 'the middle layer');
  assert.deepEqual(largest(deckInfo(DECK(4))).map(set => set.map(lettersOf).sort().join('/')), ['AB/AC/AD/BC/BD/CD'], 'the six pairs, only');
  const five = deckInfo(byId('nests-12').parameters.decks[0]);
  assert.equal(antichainsOf(five).length, 7581, 'Dedekind’s number for five');
  assert.deepEqual(largest(five).map(set => set.map(i => five.masks[i]).map(m => lettersOf(m).length)[0]).sort(), [2, 3], 'all pairs and all triples');
  assert.equal(cardWords(maskOf('')), 'the empty card');
  assert.equal(cardWords(maskOf('AC')), 'the circle and square card');
  assert.equal(cardWords(maskOf('ABD')), 'the circle, triangle and star card');
});

test('taps: choose, refuse and mark with the chosen cards it nests with, put back', () => {
  const p = byId('nests-02');
  let a = play(p, freshAttempt(p), ...taps(p, 0, 'A'));
  assert.equal(chosen(p, a), 'A');
  a = play(p, a, ...taps(p, 0, 'AC'));
  assert.equal(chosen(p, a), 'A', 'not chosen');
  assert.deepEqual(a.board.decks[0].out, [at(p, 0, 'AC')], 'marked');
  const html = view(p, a, true);
  assert.match(html, new RegExp(`data-links="\\[\\[0,${at(p, 0, 'AC')},${at(p, 0, 'A')},&quot;try&quot;\\]\\]"`), 'a line joins it to the circle');
  assert.match(html, /class="ns-card out shown"/);
  assert.match(html, /class="ns-card chosen blocker"/);
  assert.match(html, /aria-label="Circle and square card, nests with circle card"/);
  assert.equal(move(p, a, taps(p, 0, 'AC')[0]), a, 'a tap on a marked card changes nothing');
  a = play(p, a, ...taps(p, 0, 'B AB'));
  assert.equal(chosen(p, a), 'A/B');
  const both = JSON.parse(view(p, a, true).match(/data-links="([^"]*)"/)[1].replaceAll('&quot;', '"'));
  assert.deepEqual(both.map(l => l.join()).sort(), [[0, at(p, 0, 'AB'), at(p, 0, 'A'), 'try'], [0, at(p, 0, 'AB'), at(p, 0, 'B'), 'try']].map(l => l.join()).sort(), 'both chosen cards it holds');
  a = play(p, a, ...taps(p, 0, 'A'));
  assert.equal(chosen(p, a), 'B');
  assert.deepEqual(a.board.decks[0].out, [at(p, 0, 'AB')], 'the mark stays while the triangle is chosen; the circle and square card is free again');
  a = play(p, a, ...taps(p, 0, 'B'));
  assert.deepEqual(a.board.decks[0], {chosen: [], out: []}, 'putting back the last chosen card clears every mark');
  a = play(p, a, ...taps(p, 0, 'ABC'));
  assert.equal(a.board.decks[0].out.length, 0);
  a = play(p, a, ...taps(p, 0, '0'));
  assert.deepEqual(a.board.decks[0].out, [at(p, 0, '')], 'the empty card nests with every card');
});

test('reach: the circles fill, and four little decks each have one answer', () => {
  const p = byId('nests-02');
  let a = play(p, freshAttempt(p), ...taps(p, 0, 'A B'));
  assert.match(view(p, a), /<i class="on"><\/i><i class="on"><\/i><i class=""><\/i>/, 'two of three circles filled');
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, ...taps(p, 0, 'C'));
  assert.ok(isSolved(p, a.board));
  assert.equal(move(p, a, taps(p, 0, 'A')[0]), null, 'a solved board takes no moves');
  const k = byId('nests-01');
  let b = freshAttempt(k);
  for (const [d, list] of [[0, 'A B'], [1, 'A B'], [2, 'AB AC BC'], [3, 'A BC']]) b = play(k, b, ...taps(k, d, list));
  assert.ok(isSolved(k, b.board));
  b = play(k, freshAttempt(k), ...taps(k, 1, 'AB A'));
  assert.equal(chosen(k, b, 1), 'AB', 'the circle fits inside the two-picture card');
});

test('extend: pinned cards stay, a deck is done when every other card is shown to nest, stuck says so', () => {
  const p = byId('nests-04');
  let a = freshAttempt(p);
  assert.deepEqual([0, 1, 2].map(d => chosen(p, a, d)), ['ABC', 'A/BC', 'AB']);
  assert.equal(move(p, a, taps(p, 0, 'ABC')[0]), a, 'a pinned card can’t be put back');
  assert.match(view(p, a), /class="ns-card chosen kept"/);
  a = play(p, a, ...taps(p, 0, 'AC 0 B A BC AB C'));
  assert.deepEqual(a.board.decks[0].out.length, 7, 'every card nests with the full card');
  let html = view(p, a, true);
  assert.match(html, /class="ns-deck done framed"/, 'the first deck is done');
  assert.equal((html.match(/&quot;proof&quot;/g) || []).length, 6, 'each refused card’s line is drawn; the last one tried shows as a try');
  a = play(p, a, ...taps(p, 1, 'AC 0 B ABC AB C'));
  a = play(p, a, ...taps(p, 2, 'C AC BC ABC 0 A B'));
  assert.equal(chosen(p, a, 2), 'AB/C');
  html = view(p, a, true);
  assert.match(html, /Another way fits more cards\./, 'every card tried and fewer than the most');
  assert.deepEqual(a.board.stuck, [2], 'the answer is in the save');
  assert.equal(isSolved(p, a.board), false);
  const back = mech.carry(p, a.board, undo(a).board);
  assert.deepEqual(back.stuck, [2], 'Undo takes back the last tap, not the answer');
  assert.ok(validBoard(p, back));
  assert.equal(validBoard(p, {...a.board, stuck: [0]}), false, 'the full card’s deck is as big as it can be');
  assert.equal(validBoard(p, {...freshAttempt(p).board, stuck: [2]}), false, 'a collection that can still take a card');
  a = play(p, a, ...taps(p, 2, 'C'));
  assert.deepEqual(a.board.stuck, [], 'a change of chosen cards clears it');
  assert.doesNotMatch(view(p, a, true), /Another way fits more cards\./);
  a = play(p, a, ...taps(p, 2, 'AC BC'));
  assert.equal(chosen(p, a, 2), 'AB/AC/BC');
  assert.equal(isSolved(p, a.board), false, 'the square card, put back, is still to try');
  a = play(p, a, ...taps(p, 2, 'C'));
  assert.ok(isSolved(p, a.board), 'the marks that still nest with a chosen card stay');
});

test('tapping every card in page order finishes a deck only where there is nothing to choose', () => {
  const inOrder = (p, d) => p.parameters.decks[d].cards.reduce((a, _, i) => (isSolved(p, a.board) ? a : move(p, a, {type: 'tap', deck: d, card: i}) || a), freshAttempt(p));
  const k = byId('nests-04');
  let a = freshAttempt(k);
  for (const d of [0, 1, 2]) a = k.parameters.decks[d].cards.reduce((b, _, i) => move(k, b, {type: 'tap', deck: d, card: i}) || b, a);
  assert.deepEqual(a.board.stuck, [2], 'the first two decks finish; the third chooses the square first and stops at two');
  for (const id of ['nests-02', 'nests-05', 'nests-07', 'nests-12']) assert.equal(isSolved(byId(id), inOrder(byId(id), 0).board), false, id);
  const n = byId('nests-07'), t = inOrder(n, 0);
  assert.ok(t.board.decks[0].chosen.length < 6, 'the sixteen cards in order stop short of six');
});

test('rows: place, sort, break, take out; a filled mark for one chosen card; best is certified', () => {
  const p = byId('nests-03');
  let a = play(p, freshAttempt(p), ...taps(p, 0, 'A B'));
  assert.equal(move(p, a, put(p, 'A', 1)), null, 'no row past the new one');
  a = play(p, a, put(p, 'AB', 0), put(p, '0', 0), put(p, 'A', 0));
  assert.deepEqual(a.board.rows, [[at(p, 0, ''), at(p, 0, 'A'), at(p, 0, 'AB')]], 'kept smallest first');
  assert.equal(move(p, a, put(p, 'A', 0)), null, 'already in that row');
  assert.equal(move(p, play(p, a, {type: 'unplace', card: at(p, 0, 'A')}), {type: 'unplace', card: at(p, 0, 'A')}), null, 'not in a row');
  a = play(p, a, put(p, 'B', 0));
  let html = view(p, a);
  assert.match(html, /class="ns-row many broken"/, 'two chosen cards that don’t nest');
  assert.match(html, /ns-break/);
  assert.equal(isSolved(p, a.board), false);
  a = play(p, a, put(p, 'B', 1));
  assert.ok(isSolved(p, a.board), 'two rows, one chosen card in each');
  html = view(p, a);
  assert.equal((html.match(/class="ns-row one"/g) || []).length, 2);
  assert.doesNotMatch(html, /ns-row new/, 'no new row once solved');
  const lone = play(p, freshAttempt(p), put(p, 'B', 0));
  assert.equal(move(p, lone, put(p, 'B', 1)), null, 'a card alone in its row is already in a row of its own');
  assert.match(view(p, lone), /class="ns-row none".*class="ns-row new"/s, 'an empty mark, and always a dashed row for another');
  const fewer = play(p, freshAttempt(p), ...taps(p, 0, 'A'), put(p, '0', 0), put(p, 'A', 0), put(p, 'AB', 0), put(p, 'B', 1));
  assert.equal(isSolved(p, fewer.board), false, 'a row without a chosen card');
  assert.match(view(p, fewer), /class="ns-row none"/);
});

test('rows that need no chosen card: every card nests with the pinned circle', () => {
  const p = byId('nests-11'), info = deckInfo(p.parameters.decks[0]);
  let a = play(p, freshAttempt(p), ...taps(p, 0, 'B C D'));
  p.solution.rows.forEach((row, r) => row.forEach(s => { a = play(p, a, put(p, s || '0', r)); }));
  assert.ok(isSolved(p, a.board));
  const states = rowStates(info, a.board.decks[0].chosen, a.board.rows);
  assert.equal(states.filter(s => s.blocked).length, 2, 'circle and triangle with its star; circle and star with its square');
  assert.equal((view(p, a).match(/class="ns-row blocked"/g) || []).length, 2);
  // A free card in such a row needs a chosen card there.
  const rows = a.board.rows.map(row => [...row]), free = at(p, 0, 'BD'), from = rows.findIndex(row => row.includes(free));
  assert.equal(certified(info, a.board.decks[0].chosen, rows.map((row, r) => (r === from ? row.filter(c => c !== free) : row)).filter(r => r.length).concat([[free]])), false);
});

test('find every: collections kept as made, found already, That’s all checked, and Undo keeps the answer', () => {
  const p = byId('nests-05');
  let a = play(p, freshAttempt(p), ...taps(p, 0, 'A B C'));
  assert.equal(a.board.found.length, 1);
  assert.deepEqual(a.board.decks[0], {chosen: [], out: []}, 'the cards go back');
  a = play(p, a, ...taps(p, 0, 'C B A'));
  assert.deepEqual(a.board.told, {kind: 'again', at: 0});
  assert.match(view(p, a), /Found already\./);
  a = play(p, a, {type: 'all'});
  assert.deepEqual(a.board.told, {kind: 'more'});
  assert.match(view(p, a), /There is another\./);
  assert.match(view(p, a), /class="secondary ns-button ns-all"[^>]*disabled/, 'That’s all waits for another collection');
  assert.equal(move(p, a, {type: 'all'}), null);
  const back = mech.carry(p, a.board, undo(a).board);
  assert.deepEqual(back.told, {kind: 'more'}, 'Undo takes back moves, not the answer');
  assert.equal(back.found.length, 1);
  a = play(p, a, ...taps(p, 0, 'AB AC'));
  assert.deepEqual(a.board.told, {kind: 'more'}, 'still answered while a collection is half made');
  a = play(p, a, ...taps(p, 0, 'BC'));
  assert.equal(a.board.found.length, 2);
  assert.equal(a.board.told, null);
  assert.equal(isSolved(p, a.board), false, 'That’s all is the claim');
  a = play(p, a, {type: 'all'});
  assert.ok(isSolved(p, a.board));
  assert.doesNotMatch(visible(view(p, a)), /\d+\s+of\s+\d+/, 'no count of answers');
});

test('hints: name a card, reach a solve alone from fresh and from a wrong start, and stay fast', () => {
  for (const p of nests.puzzles.filter(x => x.band !== 'playground')) {
    for (const start of ['fresh', 'wrong']) {
      let a = freshAttempt(p), n = 0;
      if (start === 'wrong') {
        const d = p.parameters.decks.length - 1, info = deckInfo(p.parameters.decks[d]), sol = (p.solution.chosen || p.solution.answers)[p.solution.chosen ? d : 0];
        const off = [...Array(info.k).keys()].find(i => !info.start.includes(i) && !sol.includes(p.parameters.decks[d].cards[i]));
        a = play(p, a, {type: 'tap', deck: d, card: off});
      }
      let spent = 0;
      while (!isSolved(p, a.board) && n++ < 120) {
        const t = performance.now(), h = nextHint(p, a);
        spent += performance.now() - t;
        assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
        assert.ok(h.text && !/\d+\s+of\s+\d+/.test(h.text), `${p.id}: ${h.text}`);
        a = play(p, a, h.action);
      }
      assert.ok(isSolved(p, a.board), `${p.id} from ${start}`);
      // An average, so one pause on a busy machine does not fail the run; the validator times the slowest.
      assert.ok(spent / n < 50, `${p.id}: hints well under 100 ms`);
    }
  }
  // That's all: the hint gives the reason, and the second level marks the button; it never says "Press That's all."
  const e = byId('nests-05');
  let all = play(e, freshAttempt(e), ...taps(e, 0, 'A B C AB AC BC'));
  const h = nextHint(e, all);
  assert.deepEqual(h.action, {type: 'all'});
  assert.equal(h.text, 'Every collection of three here has cards of only one size, and you have found both.');
  assert.doesNotMatch(view(e, {...all, hintLevel: 1}), /ns-all hinted/);
  assert.match(view(e, {...all, hintLevel: 2}), /class="secondary ns-button ns-all hinted"/);
  // Rows hints end in a solve from any rows, including ones that tempt the fewest-row cover to change.
  const ten = byId('nests-10'), rnd = (() => { let x = 7; return () => (x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32; })();
  for (let trial = 0; trial < 40; trial++) {
    let b = freshAttempt(ten);
    for (let m = 0; m < 30; m++) { const card = Math.floor(rnd() * 16), r = rnd(), action = r < 0.3 ? {type: 'tap', deck: 0, card} : r < 0.85 ? {type: 'place', card, row: Math.floor(rnd() * (b.board.rows.length + 1))} : {type: 'unplace', card}; const nx = move(ten, b, action); if (nx && !isSolved(ten, nx.board)) b = nx; }
    let steps = 0;
    while (!isSolved(ten, b.board) && steps++ < 120) b = play(ten, b, nextHint(ten, b).action);
    assert.ok(isSolved(ten, b.board), `rows from wandering ${trial + 1}`);
  }
  const p = byId('nests-06');
  assert.equal(p.hints[0], 'Start a row with the empty card. What can go next?', 'the written first hint asks, and names no answer');
  assert.match(nextHint(p, freshAttempt(p)).text, /^Choose the (circle|triangle|square)/);
});

test('the fewest rows keep the child’s rows where they can', () => {
  const p = byId('nests-10'), info = deckInfo(p.parameters.decks[0]);
  const free = [...Array(info.k).keys()];
  assert.equal(coverPaths(info, free, []).length, 6, 'six rows cover sixteen cards');
  const row = ['', 'A', 'AB', 'ABC', 'ABCD'].map(s => at(p, 0, s));
  const paths = coverPaths(info, free, [row]);
  assert.equal(paths.length, 6);
  assert.ok(paths.some(path => row.every(c => path.includes(c))), 'a whole chain the child built stays together');
});

test('saves: forged boards are refused', () => {
  const p = byId('nests-06'), fresh = freshAttempt(p).board, A = at(p, 0, 'A'), AB = at(p, 0, 'AB');
  assert.ok(validBoard(p, fresh));
  assert.equal(validBoard(p, {...fresh, decks: [{chosen: [A, AB].sort((x, y) => x - y), out: []}]}), false, 'two chosen cards that nest');
  assert.equal(validBoard(p, {...fresh, decks: [{chosen: [], out: [A]}]}), false, 'a mark with nothing chosen');
  assert.equal(validBoard(p, {...fresh, rows: [[AB, A]]}), false, 'a row not smallest first');
  assert.equal(validBoard(p, {...fresh, rows: [[A], [A]]}), false, 'a card in two rows');
  assert.equal(validBoard(p, {...fresh, rows: [[]]}), false, 'an empty row');
  assert.equal(validBoard(p, {decks: fresh.decks}), false, 'no rows');
  const k = byId('nests-11');
  assert.equal(validBoard(k, {decks: [{chosen: [], out: []}], rows: []}), false, 'the pinned card put back');
  const e = byId('nests-05'), ef = freshAttempt(e).board;
  assert.equal(validBoard(e, {...ef, done: true}), false, 'That’s all with collections left');
  assert.equal(validBoard(e, {...ef, found: [[at(e, 0, 'A')]]}), false, 'a collection of the wrong size');
  assert.equal(validBoard(e, {...ef, told: {kind: 'again', at: 0}}), false, 'found already, with nothing found');
});

test('every puzzle renders its cards scrambled, a dashed row where rows are used, and no counters', () => {
  for (const p of nests.puzzles) {
    const a = freshAttempt(p), html = view(p, a), q = p.parameters;
    assert.match(html, /class="ns-puzzle/, p.id);
    assert.match(html, /data-mechanic-wire="nests"/, p.id);
    const decks = q.mode === 'playground' ? [q.choices[a.board.pick]] : q.decks;
    assert.equal((html.match(/class="ns-card[ "]/g) || []).length, decks.reduce((n, d) => n + d.cards.length, 0), `${p.id}: every card`);
    for (const d of decks) if (new Set(d.cards.map(s => s.length)).size > 1) assert.ok(d.cards.some((s, i) => i && s.length < d.cards[i - 1].length), `${p.id}: not by size`);
    assert.equal((html.match(/class="ns-row new/g) || []).length, ['best', 'playground'].includes(q.mode) ? 1 : 0, `${p.id}: room for another row`);
    assert.doesNotMatch(visible(html), /\d+\s+of\s+\d+/, `${p.id}: no counter`);
    assert.equal(p.visibleObjective, {reach: '', extend: 'Add as many cards as you can.', best: q.decks?.[0].start ? 'Add as many cards as you can, and put every card in a row.' : 'Choose as many cards as you can, and put every card in a row with one chosen card.', every: 'Find every collection of this size.', playground: ''}[q.mode], p.id);
    for (const word of [String(p.solution?.best?.[0] ?? 'none')]) if (p.solution?.best) assert.ok(!p.title.includes(word) && !p.hints[0].includes(word), `${p.id}: the answer is not in the title or first hint`);
  }
});

test('the playground: three decks, choose and sort, never solved, no Hint', () => {
  const p = nests.puzzles.find(x => x.band === 'playground');
  assert.ok(mech.noHint(p));
  let a = freshAttempt(p);
  assert.equal(a.board.pick, 1);
  a = play(p, a, {type: 'tap', deck: 0, card: 4}, {type: 'place', card: 4, row: 0});
  a = play(p, a, {type: 'deck', pick: 2});
  assert.deepEqual(a.board, {pick: 2, decks: [{chosen: [], out: []}], rows: []}, 'a new deck starts clean');
  assert.equal(move(p, a, {type: 'deck', pick: 2}), null);
  assert.equal(move(p, a, {type: 'all'}), null);
  const q = p.parameters.choices[2];
  for (const s of ['AB', 'AC', 'AD', 'BC', 'BD', 'CD']) a = play(p, a, {type: 'tap', deck: 0, card: q.cards.indexOf(s)});
  assert.equal(isSolved(p, a.board), false);
  assert.equal(nextHint(p, a).type, 'done');
  assert.match(view(p, a), /class="secondary ns-pick" [^>]*aria-pressed="true" aria-label="16 cards"/);
});
