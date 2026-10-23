// Checks the Square leftovers pack (dist/families/leftovers/leftovers.json)
// by methods separate from the mechanic's (which uses n * n % m):
//   - leftovers by building each square row by row and taking away a bundle
//     whenever a whole one is there, written here from scratch;
//   - every sort puzzle's bins, the empty bins as leftovers no square of any
//     side can leave (sides up to five times the size), the strips rule, the
//     prime count (p + 1)/2 and the composite exceptions;
//   - every find answer, and every That's all over all 2^k sets of cards in
//     the bin: exactly the answer is accepted, a part of it is told "There's
//     another." and anything else "A card here doesn't belong.";
//   - every tell claim over every choice of sizes (all 11 single sizes, all 55
//     pairs), and Can't against the same search;
//   - witnesses and hint chains played through the move rules, from fresh and
//     after random play; refusals and their locks through Undo; every Undo
//     changing the board; illegal moves and forged saves; the playground.
// Run: node scripts/validate-leftovers.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {leftover, workingChoices, matchOf, answerOf, nextBundle, whereKey} from '../dist/families/leftovers/leftovers.js';
import {loadPack} from './packs.mjs';

// --- An independent model ----------------------------------------------------
// Lay down the square one row of n counters at a time; whenever m loose
// counters are there, take a bundle away.
function byBundles(n, m) {
  let loose = 0;
  for (let row = 0; row < n; row++) { loose += n; while (loose >= m) loose -= m; }
  return loose;
}
const groupsOf = (sides, m) => { const g = new Map(); for (const n of sides) g.set(byBundles(n, m), [...(g.get(byBundles(n, m)) || []), n]); return g; };
const leftoversOf = m => new Set(Array.from({length: m}, (_, n) => byBundles(n, m)));
const choicesOf = (list, k) => k === 0 ? [[]] : list.flatMap((x, i) => choicesOf(list.slice(i + 1), k - 1).map(rest => [x, ...rest]));
// Two cards x < y that every chosen size leaves the same, or none.
function clash(top, sizes) {
  for (let x = 0; x <= top; x++) for (let y = x + 1; y <= top; y++) if (sizes.every(m => byBundles(x, m) === byBundles(y, m))) return [x, y];
  return null;
}

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 600; steps++) {
    const h = nextHint(p, a);
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    assert.ok(typeof h.text === 'string' && h.text.length > 3 && !/Press Can’t/.test(h.text), `${p.id} ${label}: a hint in words, never “Press Can’t”`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return a;
}
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
// A random action: bundles (the next one, or a random rectangle), placings,
// That's all; sizes, Try, Can't and Again.
function randomAction(p, a, rand) {
  const q = p.parameters, b = a.board, pick = list => list[Math.floor(rand() * list.length)];
  if (q.mode === 'tell') { const r = rand(); return r < .6 ? {type: 'size', size: pick(q.sizes)} : r < .8 ? {type: 'try'} : r < .9 ? {type: 'cant'} : {type: 'again'}; }
  const r = rand(), side = pick(q.sides);
  if (r < .45) {
    if (rand() < .6) return {type: 'bundle', side, cells: nextBundle(b.bundles, side, q.size)};
    const w = 1 + Math.floor(rand() * side), h = 1 + Math.floor(rand() * side), cells = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push(y * side + x);
    return {type: 'bundle', side, cells};
  }
  if (r < .92) return {type: 'place', side, bin: rand() < .2 ? null : pick(q.bins)};
  return {type: 'claim'};
}
let ctx = null;
const draw = p => att => playView(p, att, ctx);

export default async function validateLeftovers() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/leftovers/leftovers.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'leftovers');
  for (const s of pack.sources) { assert.match(s.url, /^https:\/\//); assert.ok(s.title && s.kind); }
  const ids = new Set(pack.sources.map(s => s.id));
  const puzzles = pack.puzzles.filter(p => p.band !== 'playground'), playground = pack.puzzles.find(p => p.band === 'playground');
  assert.ok(playground, 'a playground');
  assert.deepEqual(puzzles.map(p => p.number), puzzles.map((_, i) => i + 1), 'numbers run 1..n');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 15, '8 to 15 puzzles');
  for (const p of pack.puzzles) {
    assert.match(p.id, /^leftovers-/);
    for (const field of ['title', 'objective', 'instruction', 'controls', 'idea', 'prerequisites', 'provenance']) assert.ok(typeof p[field] === 'string' && p[field].length > 3, `${p.id}: ${field}`);
    assert.ok(Array.isArray(p.rules) && p.rules.length && Array.isArray(p.hints) && p.hints.length >= 3, `${p.id}: rules and hints`);
    for (const field of ['notice', 'prompt', 'explanation', 'extension', 'connection']) assert.ok(p.parent[field], `${p.id}: parent.${field}`);
    assert.ok(p.parent.sourceIds.every(id => ids.has(id)), `${p.id}: sources exist`);
    assert.ok(validBoard(p, freshAttempt(p).board), `${p.id}: starts valid`);
    // At most one short sentence of objective on the play screen.
    assert.ok(p.visibleObjective === '' || (p.visibleObjective.split(/[.?!]\s/).length === 1 && p.visibleObjective.length <= 90), `${p.id}: one short visible sentence at most`);
  }
  for (const level of ['easy', 'medium', 'hard']) assert.ok(puzzles.some(p => p.difficulty_level === level), `a ${level} puzzle`);

  // --- The theorems behind the copy ------------------------------------------
  for (let m = 2; m <= 15; m++) for (let n = 0; n <= 5 * m; n++) {
    assert.equal(byBundles(n, m), leftover(n, m), `${n} with bundles of ${m}: the model matches the mechanic`);
    assert.equal(byBundles(n, m), byBundles(n % m, m), `${n} with bundles of ${m}: cutting strips leaves the square of the side’s leftover`);
    assert.equal(byBundles(n, m), byBundles((m - n % m) % m, m), `${n} with bundles of ${m}: x and m − x match`);
  }
  // Odd primes give (p + 1)/2 leftovers, and only x, p − x match; 8, 9 and 15 don't.
  for (const p of [3, 5, 7, 11, 13]) {
    assert.equal(leftoversOf(p).size, (p + 1) / 2, `${p}: (p + 1)/2 leftovers`);
    for (let x = 0; x < p; x++) for (let y = x + 1; y < p; y++) assert.equal(byBundles(x, p) === byBundles(y, p), x + y === p, `${p}: ${x} and ${y} match only when they add to ${p}`);
  }
  assert.deepEqual([8, 9, 15].map(m => leftoversOf(m).size), [3, 4, 6], '8, 9 and 15 give 3, 4 and 6 leftovers');
  assert.deepEqual(groupsOf([...Array(8).keys()], 8).get(1), [1, 3, 5, 7], 'with 8, cards 1, 3, 5 and 7 leave 1');
  assert.deepEqual(groupsOf([...Array(9).keys()], 9).get(0), [0, 3, 6], 'with 9, cards 0, 3 and 6 leave 0');
  assert.deepEqual(groupsOf([...Array(15).keys()], 15).get(1), [1, 4, 11, 14], 'with 15, cards 1, 4, 11 and 14 leave 1');
  assert.deepEqual(groupsOf([...Array(15).keys()], 15).get(4), [2, 7, 8, 13], 'with 15, leftover 4 also hides four cards');
  // The L between x by x and y by y re-forms as a (y − x) by (x + y) rectangle.
  for (let x = 0; x <= 15; x++) for (let y = x; y <= 15; y++) assert.equal(y * y - x * x, (y - x) * (x + y));
  // One size from 2 to 12 never tells cards 0 to 15 apart; of the 55 pairs only 10 and 11 do.
  const SIZES = Array.from({length: 11}, (_, i) => i + 2);
  assert.ok(SIZES.every(m => clash(15, [m])), 'one size never tells 0 to 15 apart');
  const pairs = choicesOf(SIZES, 2);
  assert.equal(pairs.length, 55);
  assert.deepEqual(pairs.filter(c => !clash(15, c)), [[10, 11]], 'only 10 and 11');

  // --- Each puzzle's claim ----------------------------------------------------
  for (const p of puzzles) {
    const q = p.parameters;
    assert.ok(['sort', 'find', 'tell'].includes(q.mode), `${p.id}: mode`);
    if (q.mode === 'sort') {
      assert.equal(p.visibleObjective, '', `${p.id}: the bins show the goal`);
      assert.deepEqual(q.bins, Array.from({length: q.size}, (_, r) => r), `${p.id}: a bin for every leftover from 0 to ${q.size - 1}`);
      const right = q.sides.map(n => byBundles(n, q.size)), m = mechanicFor(p);
      assert.ok(m.valid(p, {...freshAttempt(p).board, where: right}), `${p.id}: the arrangement is a board`);
      // The answer is accepted, and every arrangement one card away is not.
      const verdictOf = where => { let a = {...freshAttempt(p), board: {...freshAttempt(p).board, where}}; a = move(p, a, {type: 'claim'}); return a.board.claimed; };
      assert.equal(verdictOf(right), true, `${p.id}: the right bins are accepted`);
      q.sides.forEach((_, i) => q.bins.forEach(r => { if (r !== right[i]) { const w = [...right]; w[i] = r; assert.equal(verdictOf(w), false, `${p.id}: card ${q.sides[i]} in bin ${r} is refused`); } }));
      // Every arrangement of the smaller puzzles: exactly one is accepted.
      if (q.bins.length ** q.sides.length <= 5e4) {
        let accepted = 0;
        const rec = (i, w) => { if (i === q.sides.length) { if (verdictOf(w)) accepted++; return; } for (const r of q.bins) rec(i + 1, [...w, r]); };
        rec(0, []);
        assert.equal(accepted, 1, `${p.id}: one arrangement of ${q.bins.length ** q.sides.length} is accepted`);
      }
      // Empty bins are leftovers no square of any side can leave.
      const reached = new Set(right), never = q.bins.filter(r => !reached.has(r));
      for (let n = 0; n <= 5 * q.size; n++) assert.ok(!never.includes(byBundles(n, q.size)), `${p.id}: no side leaves ${byBundles(n, q.size)} with an empty bin`);
      assert.ok(never.length > 0, `${p.id}: some bin stays empty`);
    }
    if (q.mode === 'find') {
      const answer = q.sides.filter(n => byBundles(n, q.size) === q.bins[0]);
      assert.deepEqual(answerOf(q), answer, `${p.id}: the answer`);
      assert.ok(answer.length >= 2, `${p.id}: more than one card, so stopping early is possible`);
      // Every set of cards in the bin.
      const fresh = freshAttempt(p);
      for (let mask = 1; mask < 2 ** q.sides.length; mask++) {
        const where = q.sides.map((_, i) => mask >> i & 1 ? q.bins[0] : null), inBin = q.sides.filter((_, i) => mask >> i & 1);
        const a = move(p, {...fresh, board: {...fresh.board, where}}, {type: 'claim'});
        const right = inBin.length === answer.length && inBin.every(n => answer.includes(n)), part = !right && inBin.every(n => answer.includes(n));
        assert.equal(a.board.claimed, right, `${p.id}: {${inBin}} ${right ? 'accepted' : 'refused'}`);
        // The line itself is drawn for every set of the smaller puzzle and a sample of the larger.
        if (!right && (q.sides.length <= 8 || mask % 61 === 0 || part)) assert.match(draw(p)(a), part ? /There’s another\./ : /A card here doesn’t belong\./, `${p.id}: {${inBin}} told why`);
        if (!right) assert.equal(mechanicFor(p).valid(p, a.board) && a.board.shut.length, 1, `${p.id}: {${inBin}} is locked`);
      }
    }
    if (q.mode === 'tell') {
      assert.deepEqual(q.sizes, SIZES, `${p.id}: sizes 2 to 12`);
      const works = choicesOf(q.sizes, q.k).filter(c => !clash(q.top, c));
      assert.deepEqual(workingChoices(q), works, `${p.id}: the working choices match the search`);
      for (const c of choicesOf(q.sizes, q.k)) {
        const shown = matchOf(q.top, c);
        if (shown) assert.ok(c.every(m => byBundles(shown[0], m) === byBundles(shown[1], m)), `${p.id}: ${c} really makes ${shown} match`);
        else assert.equal(clash(q.top, c), null);
      }
      assert.ok(q.budget >= 2 && q.budget <= 5, `${p.id}: a small budget`);
    }
  }
  const byTitle = t => puzzles.find(p => p.title === t);
  assert.deepEqual(workingChoices(byTitle('One size').parameters), [[10], [11]], 'cards 0 to 5: 10 or 11');
  assert.deepEqual(workingChoices(byTitle('One more card').parameters), [], 'cards 0 to 6: no size');
  assert.deepEqual(workingChoices(byTitle('Two sizes').parameters), [[10, 11]], 'cards 0 to 15: 10 and 11');

  // --- Witnesses, hints and play ---------------------------------------------
  for (const p of puzzles) {
    const q = p.parameters;
    let a = freshAttempt(p);
    if (q.mode === 'tell') {
      for (const c of q.witness.tries) { for (const m of c) a = play(p, a, {type: 'size', size: m}); a = play(p, a, {type: 'try'}); }
      if (q.witness.cant) a = play(p, a, {type: 'cant'});
    } else for (const step of q.witness) a = play(p, a, step);
    assert.ok(isSolved(p, a.board), `${p.id}: the witness solves it`);
    refuse(p, a, q.mode === 'tell' ? {type: 'size', size: 2} : {type: 'place', side: q.sides[0], bin: null}, 'nothing after a solve');
    hintsSolve(p, freshAttempt(p), 'from fresh');
    // Every press of Undo changes the board, all the way back.
    for (let u = a, k = 0; u.history.length && k < 150; k++) { const shown = draw(p)(u), back = undoPress(p, u, draw(p), shown); assert.notEqual(draw(p)(back), shown, `${p.id}: Undo changes the board`); u = back; }
    for (let seed = 1; seed <= 25; seed++) {
      const rand = rng(seed * 7919 + p.number);
      let b = freshAttempt(p);
      for (let k = 0; k < 30 && !isSolved(p, b.board); k++) { const next = move(p, b, randomAction(p, b, rand)); if (next) b = next; }
      assert.ok(validBoard(p, b.board), `${p.id}: random play stays valid`);
      if (!isSolved(p, b.board)) hintsSolve(p, b, `after random play ${seed}`);
    }
  }

  // --- Rules: bundling and placing ---------------------------------------------
  {
    const p = byTitle('Bundles of 4');
    let a = freshAttempt(p);
    refuse(p, a, {type: 'bundle', side: 3, cells: [0, 1, 2]}, 'three counters are not a bundle of 4');
    refuse(p, a, {type: 'bundle', side: 3, cells: [0, 1, 2, 2]}, 'a counter twice');
    refuse(p, a, {type: 'bundle', side: 3, cells: [0, 1, 2, 9]}, 'no counter 9 in a 3 by 3 square');
    refuse(p, a, {type: 'bundle', side: 1, cells: [0]}, 'card 1 has no bundle of 4');
    refuse(p, a, {type: 'bundle', side: 5, cells: [0, 1, 2, 3]}, 'no card 5');
    a = play(p, a, {type: 'bundle', side: 3, cells: [0, 1, 3, 4]});
    refuse(p, a, {type: 'bundle', side: 3, cells: [4, 5, 7, 8]}, 'counter 4 is already bundled');
    // Stopping early: card 3 has 5 loose counters, so another bundle fits.
    refuse(p, a, {type: 'place', side: 3, bin: 1}, 'no placing while another bundle fits');
    a = play(p, a, {type: 'bundle', side: 3, cells: [2, 5, 6, 7]});
    refuse(p, a, {type: 'bundle', side: 3, cells: [8]}, 'fewer than a bundle is left');
    a = play(p, a, {type: 'place', side: 3, bin: 3});
    a = play(p, a, {type: 'place', side: 3, bin: 1});
    refuse(p, a, {type: 'place', side: 3, bin: 1}, 'already in bin 1');
    refuse(p, a, {type: 'place', side: 3, bin: 4}, 'no bin 4');
    refuse(p, a, {type: 'claim'}, 'That’s all needs every card in a bin');
    // Two whole bundles at once (a 2 by 4 strip of a 4 by 4 square) in a 3-size puzzle is not whole bundles of 3.
    const p2 = byTitle('Bundles of 3');
    let c = freshAttempt(p2);
    refuse(p2, c, {type: 'bundle', side: 4, cells: [0, 1, 2, 3, 4, 5, 6, 7]}, 'eight counters are not whole bundles of 3');
    c = play(p2, c, {type: 'bundle', side: 4, cells: [0, 1, 2, 4, 5, 6, 8, 9, 10, 12, 13, 14]});
    assert.equal(c.board.bundles.length, 1, 'a 4 by 3 strip is four bundles at once');
    // An unbundled card may be placed (the child may know its leftover).
    c = play(p2, c, {type: 'place', side: 2, bin: 1});
    assert.equal(c.board.where[1], 1);
  }
  // --- That's all: refusals and their locks through Undo ------------------------
  {
    const p = byTitle('Bundles of 4');
    let a = freshAttempt(p);
    for (const [side, bin] of [[0, 0], [1, 1], [2, 1], [3, 1]]) a = play(p, a, {type: 'place', side, bin});
    const before = a;
    a = play(p, a, {type: 'claim'});
    assert.equal(a.board.shut.length, 1);
    assert.match(draw(p)(a), /A card is in the wrong bin\./);
    refuse(p, a, {type: 'claim'}, 'the same arrangement stays refused');
    // Undo goes back past the claim to the last placing, and the lock stays.
    const shown = draw(p)(a), back = undoPress(p, a, draw(p), shown);
    assert.notEqual(draw(p)(back), shown, 'Undo changes the board');
    assert.equal(back.board.where[3], null, 'Undo takes back the last placing, not the claim');
    assert.equal(back.board.shut.length, 1, 'the lock is kept');
    let again = play(p, back, {type: 'place', side: 3, bin: 1});
    refuse(p, again, {type: 'claim'}, 'still refused after Undo');
    assert.match(draw(p)(again), /A card is in the wrong bin\./, 'the line comes back with the arrangement');
    again = play(p, again, {type: 'place', side: 2, bin: 0});
    assert.doesNotMatch(draw(p)(again), /wrong bin/, 'a new arrangement has no line');
    again = play(p, again, {type: 'claim'});
    assert.ok(isSolved(p, again.board));
    assert.match(draw(p)(again), /lo-bin never/, 'empty bins are marked after the solve');
    assert.equal((draw(p)(again).match(/lo-bin never/g) || []).length, 2, 'bins 2 and 3');
    assert.ok(before);
  }
  {
    const p = byTitle('Secret card');
    let a = freshAttempt(p);
    a = play(p, a, {type: 'place', side: 3, bin: 2});
    a = play(p, a, {type: 'claim'});
    assert.match(draw(p)(a), /There’s another\./);
    a = play(p, a, {type: 'place', side: 5, bin: 2});
    a = play(p, a, {type: 'claim'});
    assert.match(draw(p)(a), /A card here doesn’t belong\./);
    a = play(p, a, {type: 'place', side: 5, bin: null});
    refuse(p, a, {type: 'claim'}, 'back to a refused set');
    assert.match(draw(p)(a), /There’s another\./);
    a = play(p, play(p, a, {type: 'place', side: 4, bin: 2}), {type: 'claim'});
    assert.ok(isSolved(p, a.board));
  }
  // --- Tell: tries, Can't and Again ------------------------------------------------
  {
    const p = byTitle('One size');
    let a = freshAttempt(p);
    refuse(p, a, {type: 'try'}, 'no Try without a size');
    refuse(p, a, {type: 'cant'}, 'no Can’t before a try');
    refuse(p, a, {type: 'size', size: 13}, 'no size 13');
    a = play(p, a, {type: 'size', size: 7});
    assert.deepEqual(move(p, a, {type: 'size', size: 8}).board.chosen, [8], 'another size replaces the one chosen');
    a = play(p, a, {type: 'try'});
    assert.deepEqual(a.board.tries, [[7]]);
    assert.match(draw(p)(a), /Bundles of 7: cards 3 and 4 both leave 2\./, 'the failed try shows 3 and 4');
    refuse(p, a, {type: 'try'}, 'the same size is not tried twice');
    a = play(p, a, {type: 'cant'});
    assert.equal(a.board.cant, 'refused');
    assert.match(draw(p)(a), /There is a way\./);
    refuse(p, a, {type: 'cant'}, 'Can’t stays refused');
    // Undo of the size keeps the try and the refused Can't.
    a = play(p, play(p, a, {type: 'size', size: 7}), {type: 'size', size: 12});
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.deepEqual(back.board.tries, [[7]]); assert.equal(back.board.cant, 'refused');
    a = play(p, a, {type: 'try'});
    assert.match(draw(p)(a), /cards 2 and 4 both leave 4\./, '12 makes 2 and 4 match');
    a = play(p, play(p, play(p, a, {type: 'size', size: 12}), {type: 'size', size: 9}), {type: 'try'});
    assert.equal(a.board.tries.length, 3);
    refuse(p, a, {type: 'size', size: 9}, 'no sizes when the tries are used up');
    a = play(p, a, {type: 'again'});
    assert.deepEqual(a.board, {chosen: [], tries: [], cant: 'refused'}, 'Again starts over and keeps the refused Can’t');
    a = play(p, play(p, a, {type: 'size', size: 11}), {type: 'try'});
    assert.ok(isSolved(p, a.board), '11 works');
    assert.match(draw(p)(a), /lo-sig/, 'every card shows its leftover after the win');
    // Undo of the winning Try takes it back.
    const u = undoPress(p, a, draw(p), draw(p)(a));
    assert.ok(!isSolved(p, u.board), 'a winning Try is taken back like any move');
  }
  {
    const p = byTitle('One more card');
    let a = freshAttempt(p);
    a = play(p, play(p, a, {type: 'size', size: 11}), {type: 'try'});
    assert.match(draw(p)(a), /cards 5 and 6 both leave 3\./);
    const h = nextHint(p, a);
    assert.equal(h.action.type, 'cant');
    assert.match(h.text, /add up to the size/);
    assert.match(h.text, /12 makes 2 and 4 match/);
    a = play(p, a, {type: 'cant'});
    assert.ok(isSolved(p, a.board), 'Can’t is right');
    const html = draw(p)(a);
      for (const m of p.parameters.sizes) assert.match(html, new RegExp(`aria-label="Bundles of ${m}: cards \\d+ and \\d+ both leave \\d+\\."`), `the catalog shows a match for ${m}`);
  }
  // --- Forged saves --------------------------------------------------------------
  {
    const p = byTitle('Bundles of 4'), fresh = freshAttempt(p).board, right = [0, 1, 0, 1];
    assert.ok(!validBoard(p, {...fresh, claimed: true}), 'claimed on a wrong arrangement');
    assert.ok(validBoard(p, {...fresh, where: right, claimed: true}), 'claimed on the right one');
    assert.ok(!validBoard(p, {...fresh, shut: [whereKey(right)]}), 'a lock on the answer');
    assert.ok(!validBoard(p, {...fresh, shut: [whereKey([0, 1, null, 1])]}), 'a lock on an arrangement That’s all can’t judge');
    assert.ok(validBoard(p, {...fresh, shut: [whereKey([0, 1, 1, 1])]}), 'a real lock');
    assert.ok(!validBoard(p, {...fresh, bundles: [[3, [0, 1, 3, 4]], [3, [4, 5, 7, 8]]]}), 'a counter in two bundles');
    assert.ok(!validBoard(p, {...fresh, bundles: [[3, [0, 1, 3]]]}), 'a bundle of 3');
    assert.ok(!validBoard(p, {...fresh, where: [0, 1, 0]}), 'a card missing');
    assert.ok(!validBoard(p, {...fresh, where: [0, 1, 0, 7]}), 'no bin 7');
    assert.ok(!validBoard(p, {...fresh, extra: 1}), 'an extra field');
    const t = byTitle('One size'), tf = freshAttempt(t).board;
    assert.ok(!validBoard(t, {...tf, tries: [[11], [7]]}), 'a try after a win');
    assert.ok(!validBoard(t, {...tf, tries: [[7]], cant: 'right'}), 'Can’t right where a size works');
    assert.ok(!validBoard(t, {...tf, tries: [[7], [8], [9], [12]]}), 'past the budget');
    assert.ok(!validBoard(t, {...tf, tries: [[7], [7]]}), 'a size tried twice');
    assert.ok(!validBoard(t, {...tf, chosen: [7, 8]}), 'two sizes in a one-size puzzle');
    const t2 = byTitle('One more card'), t2f = freshAttempt(t2).board;
    assert.ok(!validBoard(t2, {...t2f, cant: 'refused'}), 'a refused Can’t where none works');
    assert.ok(!validBoard(t2, {...t2f, cant: 'right'}), 'Can’t before any try');
    assert.ok(validBoard(t2, {...t2f, tries: [[12]], cant: 'right'}), 'a real Can’t');
  }
  // --- Playground ------------------------------------------------------------------
  {
    const g = playground;
    assert.equal(mechanicFor(g).noHint(g), true, 'the playground has no Hint');
    let a = freshAttempt(g);
    assert.deepEqual(a.board, {side: 3, size: 4, bundles: []});
    a = play(g, a, {type: 'bundle', side: 3, cells: [0, 1, 2, 3]});
    refuse(g, a, {type: 'bundle', side: 4, cells: [4, 5, 6, 7]}, 'only the square on show');
    a = play(g, a, {type: 'side', side: 10});
    assert.deepEqual(a.board.bundles, [], 'a new square starts unbundled');
    a = play(g, a, {type: 'size', size: 7});
    const strip = [];
    for (let y = 0; y < 10; y++) for (let x = 0; x < 7; x++) strip.push(y * 10 + x);
    a = play(g, a, {type: 'bundle', side: 10, cells: strip});
    assert.equal(100 - strip.length, 30);
    a = play(g, a, {type: 'clear'});
    refuse(g, a, {type: 'clear'}, 'nothing to clear');
    refuse(g, a, {type: 'side', side: 16}, 'sides up to 15');
    refuse(g, a, {type: 'size', size: 1}, 'sizes from 2');
    assert.ok(!isSolved(g, a.board), 'never solved');
  }
  return {puzzles: puzzles.length, pairs: pairs.length};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await validateLeftovers();
  console.log(`Square leftovers: ${result.puzzles} puzzles checked, ${result.pairs} pairs of sizes searched.`);
}
