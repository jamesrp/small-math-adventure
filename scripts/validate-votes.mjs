// Checks the Voting and agendas pack (dist/families/votes/votes.json) by
// methods separate from the mechanic's (which simulates knockouts from a
// prefix, finds groups by trying subsets, finishes cards by growing them and
// finds a line's winner by trying every pair of spots):
//   - a majority table counted once per puzzle, every order of the letters
//     generated here by Heap's method and knocked out on that table;
//   - the top cycle as the letters that reach every letter by a chain of pair
//     wins (closure of the table), which must be exactly the letters that win
//     some order, for every letter of every puzzle;
//   - every group of letters, every set of cards and every set of voters
//     tried as a Can't certificate through the move rules, against its
//     definition, and every accepted certificate checked to be sound;
//   - every way to write the blank cards, judged by the table (a letter that
//     beats both others; a three-cycle) and through Vote;
//   - every arrangement of the line's voters on 0 to 10, by the middle
//     favourite, for the fewest moved and the number of ways, and the median
//     rule against the mechanic's pair search on every multiset of five;
//   - witnesses and hint chains played through the move rules, from fresh and
//     messy boards; refusals and their locks through Undo, every Undo
//     changing the screen; illegal moves and forged saves.
// Run: node scripts/validate-votes.mjs
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {freshAttempt, move, isSolved, nextHint, validBoard, undoPress, undoToSolvable} from '../dist/engine.js';
import {mechanicFor} from '../dist/expansion.js';
import {playView} from '../dist/ui.js';
import {lineWinner} from '../dist/families/votes/votes.js';
import {loadPack} from './packs.mjs';

// --- An independent model ----------------------------------------------------
// table[x][y]: the number of cards with x above y.
function tableOf(cards, letters) {
  const t = {};
  for (const x of letters) { t[x] = {}; for (const y of letters) t[x][y] = 0; }
  for (const c of cards) for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) t[c[i]][c[j]]++;
  return t;
}
const wins = (t, x, y) => t[x][y] > t[y][x];
// Every order of a list, by Heap's method.
function heap(list) {
  const a = [...list], out = [a.join('')], c = a.map(() => 0);
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) { const j = i % 2 ? c[i] : 0; [a[j], a[i]] = [a[i], a[j]]; out.push(a.join('')); c[i]++; i = 0; } else { c[i] = 0; i++; }
  }
  return out;
}
const runOn = (t, order) => [...order].slice(1).reduce((w, x) => wins(t, w, x) ? w : x, order[0]);
// Letters that reach every letter by a chain of pair wins.
function reachAll(t, letters) {
  const L = [...letters], r = {};
  for (const x of L) { r[x] = {}; for (const y of L) r[x][y] = x === y || wins(t, x, y); }
  for (const k of L) for (const x of L) for (const y of L) if (r[x][k] && r[k][y]) r[x][y] = true;
  return L.filter(x => L.every(y => r[x][y]));
}
const subsetsOf = list => Array.from({length: (1 << list.length) - 1}, (_, m) => list.filter((_, i) => (m + 1) >> i & 1));
const sortedMid = at => [...at].sort((x, y) => x - y)[(at.length - 1) / 2];
function allArrangements(n, top) {
  const out = [];
  (function grow(at) { if (at.length === n) { out.push(at); return; } for (let x = 0; x <= top; x++) grow([...at, x]); })([]);
  return out;
}
const PERMS3 = heap(['A', 'B', 'C']);

const play = (p, a, action) => { const next = move(p, a, action); assert.ok(next && next !== a, `${p.id}: ${JSON.stringify(action)} is legal`); return next; };
const refuse = (p, a, action, why) => assert.equal(move(p, a, action), null, `${p.id}: ${why}`);
function hintsSolve(p, a, label) {
  let steps = 0;
  for (; !isSolved(p, a.board) && steps < 200; steps++) {
    const h = nextHint(p, a);
    if (h.type === 'deadend') { assert.ok(h.quiet, `${p.id} ${label}: dead ends are told only behind Hint`); a = undoToSolvable(p, a); continue; }
    assert.equal(h.type, 'move', `${p.id} ${label}: ${h.text}`);
    assert.ok(h.text && h.text.length < 220, `${p.id} ${label}: the hint says something short`);
    a = play(p, a, h.action);
  }
  assert.ok(isSolved(p, a.board), `${p.id} ${label}: hints reach a solve`);
  return a;
}
const rng = seed => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
// A random action: legal or not, the engine decides.
function randomAction(p, a, rand) {
  const q = p.parameters, b = a.board, pick = list => list[Math.floor(rand() * list.length)];
  if (q.mode === 'agenda') return rand() < .85 ? {type: 'play', letter: pick([...q.letters])} : {type: 'cant', group: [...q.letters].filter(() => rand() < .5).join('') || q.letters[0]};
  if (q.mode === 'cards') {
    const blanks = q.cards.flatMap((c, i) => c === '' ? [i] : []), r = rand();
    if (r < .6) return {type: 'write', card: pick(blanks), letter: pick([...q.letters])};
    if (r < .8) return {type: 'erase', card: pick(blanks), letter: pick([...q.letters])};
    if (r < .92 || !q.cant) return {type: 'vote'};
    return {type: 'cant', cards: q.cards.map((_, i) => i).filter(() => rand() < .5)};
  }
  const n = q.start.length, r = rand();
  if (r < .75) return {type: 'put', voter: q.add ? n : Math.floor(rand() * n), to: Math.floor(rand() * 11)};
  if (r < .9 || !q.add) return {type: 'vote'};
  return {type: 'cant', voters: q.start.map((_, i) => i).filter(() => rand() < .6)};
}
let ctx = null;
const draw = p => att => playView(p, att, ctx);
// Every Undo press changes what the screen shows.
function undoChanges(p, a) {
  for (let u = a, k = 0; u.history.length && k < 60; k++) { const shown = draw(p)(u), back = undoPress(p, u, draw(p), shown); assert.notEqual(draw(p)(back), shown, `${p.id}: Undo changes the screen`); u = back; }
}

export default async function validateVotes() {
  const pack = JSON.parse(await readFile(new URL('../dist/families/votes/votes.json', import.meta.url), 'utf8'));
  const merged = await loadPack(), all = merged.puzzles;
  ctx = {pack: merged, selected: null, message: ''};
  assert.equal(new Set(all.map(p => p.id)).size, all.length, 'puzzle ids are unique across the packs');
  assert.equal(pack.families.length, 1); assert.equal(pack.families[0].id, 'votes');
  const puzzles = all.filter(p => p.mechanic === 'votes' && p.parameters.mode !== 'playground');
  assert.equal(puzzles.length, pack.puzzles.length - 1, 'every puzzle is in the merged pack');
  assert.ok(puzzles.length >= 8 && puzzles.length <= 15, 'eight to fifteen puzzles');
  const counts = {orders: 0, groups: 0, profiles: 0, arrangements: 0};

  // --- The median rule against the mechanic's pair search ---------------------
  for (const at of allArrangements(5, 10)) if (at.every((x, i) => i === 0 || at[i - 1] <= x)) { assert.equal(lineWinner(at), sortedMid(at), `${at}: the middle favourite wins`); counts.arrangements++; }
  // Four voters: a winner only when the two middle favourites share a spot.
  for (const at of allArrangements(4, 10)) if (at.every((x, i) => i === 0 || at[i - 1] <= x)) assert.equal(lineWinner(at), at[1] === at[2] ? at[1] : null, `${at}: four voters`);

  for (const p of puzzles) {
    const q = p.parameters;
    assert.ok(p.id.startsWith('votes-') && p.familyTitle === pack.families[0].title);
    assert.ok(p.objective && p.controls && p.rules.length && p.hints.length === 3 && p.parent.explanation && p.provenance && p.prerequisites);
    // The board shows the goal of a knockout and of adding a voter; the cards
    // ("every knockout") and the allowance on the line need one sentence.
    if (q.mode === 'cards' || (q.mode === 'line' && !q.add)) assert.ok(p.visibleObjective && p.visibleObjective.split('. ').length === 1, `${p.id}: one short sentence`);
    else assert.equal(p.visibleObjective, '', `${p.id}: no objective copy`);
    if (q.mode === 'line' && !q.add) assert.equal(p.visibleObjective, `Move ${q.budget === 1 ? 'one voter' : 'two voters'} so that ${q.goal} wins.`, `${p.id}: the allowance in words`);
    // The witness solves it.
    let w = freshAttempt(p);
    for (const action of q.witness) w = play(p, w, action);
    assert.ok(isSolved(p, w.board), `${p.id}: the witness solves it`);

    if (q.mode === 'agenda') {
      const t = tableOf(q.cards, q.letters), orders = heap([...q.letters]), top = reachAll(t, q.letters);
      assert.ok(q.cards.length % 2 === 1 && q.cards.every(c => [...c].sort().join('') === q.letters), `${p.id}: odd voters, full rankings`);
      // Each letter wins some order exactly when it reaches every letter.
      for (const x of q.letters) assert.equal(orders.some(o => runOn(t, o) === x), top.includes(x), `${p.id}: ${x} wins some knockout iff it is in the top cycle`);
      // Every order through the move rules: solved exactly when the target wins.
      for (const o of orders) {
        let a = freshAttempt(p);
        for (const x of o) a = play(p, a, {type: 'play', letter: x});
        assert.equal(isSolved(p, a.board), runOn(t, o) === q.target, `${p.id}: ${o}`);
        counts.orders++;
      }
      const winning = orders.filter(o => runOn(t, o) === q.target);
      // Every group as a certificate.
      const accepted = [];
      for (const g of subsetsOf([...q.letters])) {
        const group = g.join(''), out = [...q.letters].filter(x => !g.includes(x));
        const sound = !g.includes(q.target) && out.length > 0 && g.every(y => out.every(x => wins(t, y, x)));
        const a = play(p, freshAttempt(p), {type: 'cant', group});
        assert.equal(isSolved(p, a.board), sound, `${p.id}: group ${group}`);
        if (sound) {
          accepted.push(group);
          // Sound: once a member plays, the survivor stays in the group, so
          // no order lets the target win.
          for (const o of orders) {
            const k = [...o].findIndex(x => g.includes(x));
            let s = o[0];
            for (let i = 1; i < o.length; i++) { s = wins(t, s, o[i]) ? s : o[i]; if (i >= Math.max(k, 1)) assert.ok(g.includes(s), `${p.id}: ${o} stays in ${group}`); }
          }
          assert.equal(winning.length, 0, `${p.id}: a sound group means no winning order`);
        } else {
          const why = a.board.told.why;
          if (g.includes(q.target)) assert.equal(why, 'target');
          else assert.ok(!g.includes(why[0]) && g.includes(why[1]) && wins(t, why[0], why[1]), `${p.id}: ${group} refused with a true pair`);
          refuse(p, a, {type: 'cant', group}, 'a refused group stays refused');
        }
        counts.groups++;
      }
      assert.equal(accepted.length > 0, winning.length === 0, `${p.id}: Can't is provable exactly when the target can't win`);
    }

    if (q.mode === 'cards') {
      const blanks = q.cards.flatMap((c, i) => c === '' ? [i] : []);
      const meets = cards => {
        const t = tableOf(cards, q.letters);
        if (q.goal.kind === 'always') return [...q.letters].every(y => y === q.goal.letter || wins(t, q.goal.letter, y));
        return (wins(t, 'A', 'B') && wins(t, 'B', 'C') && wins(t, 'C', 'A')) || (wins(t, 'B', 'A') && wins(t, 'C', 'B') && wins(t, 'A', 'C'));
      };
      let good = 0;
      (function grow(k, fill) {
        if (k === blanks.length) {
          const cards = q.cards.map((c, i) => c === '' ? fill[blanks.indexOf(i)] : c), t = tableOf(cards, q.letters);
          // The table's verdict against every knockout.
          const byKnockout = PERMS3.every(o => q.goal.kind === 'always' ? runOn(t, o) === q.goal.letter : runOn(t, o) === o[2]);
          assert.equal(meets(cards), byKnockout, `${p.id}: ${cards}`);
          let a = freshAttempt(p);
          fill.forEach((c, j) => { for (const x of c) a = play(p, a, {type: 'write', card: blanks[j], letter: x}); });
          a = play(p, a, {type: 'vote'});
          assert.equal(isSolved(p, a.board), meets(cards), `${p.id}: Vote on ${cards}`);
          if (!meets(cards)) refuse(p, a, {type: 'vote'}, 'Vote is off until a letter changes');
          good += meets(cards);
          counts.profiles++;
          return;
        }
        for (const c of PERMS3) grow(k + 1, [...fill, c]);
      })(0, []);
      // Every set of cards as a certificate.
      let certs = 0;
      for (const s of subsetsOf(q.cards.map((_, i) => i))) {
        const sound = s.every(i => q.cards[i] !== '') && s.length * 2 > q.cards.length && [...q.letters].some(y => y !== q.goal.letter && s.every(i => q.cards[i].indexOf(y) < q.cards[i].indexOf(q.goal.letter)));
        if (!q.cant) { refuse(p, freshAttempt(p), {type: 'cant', cards: s}, 'no Can’t here'); continue; }
        const a = play(p, freshAttempt(p), {type: 'cant', cards: s});
        assert.equal(isSolved(p, a.board), sound, `${p.id}: cards ${s}`);
        if (sound) { certs++; assert.equal(good, 0, `${p.id}: a sound set means no way to write the cards`); }
      }
      if (q.cant) assert.equal(certs > 0, good === 0, `${p.id}: Can't is provable exactly when no way works`);
      p.__ways = good;
    }

    if (q.mode === 'line') {
      const n = q.start.length;
      if (q.add) {
        const spots = [];
        for (let x = 0; x <= 10; x++) {
          const at = [...q.start, x], a = play(p, play(p, freshAttempt(p), {type: 'put', voter: n, to: x}), {type: 'vote'});
          assert.equal(isSolved(p, a.board), sortedMid(at) === q.goal, `${p.id}: V${n + 1} on ${x}`);
          if (sortedMid(at) === q.goal) spots.push(x);
        }
        let certs = 0;
        for (const s of subsetsOf(q.start.map((_, i) => i))) {
          const sound = s.length * 2 > n + 1 && (s.every(i => q.start[i] < q.goal) || s.every(i => q.start[i] > q.goal));
          const a = play(p, freshAttempt(p), {type: 'cant', voters: s});
          assert.equal(isSolved(p, a.board), sound, `${p.id}: voters ${s}`);
          if (sound) {
            certs++;
            // Sound: the spot next to the goal on their side beats it wherever the new voter stands.
            const near = q.start[s[0]] < q.goal ? q.goal - 1 : q.goal + 1;
            for (let x = 0; x <= 10; x++) { const at = [...q.start, x]; assert.ok(at.filter(v => Math.abs(v - near) < Math.abs(v - q.goal)).length * 2 > at.length); }
            assert.equal(spots.length, 0);
          }
        }
        assert.equal(certs > 0, spots.length === 0, `${p.id}: Can't is provable exactly when no spot works`);
      } else {
        // Every arrangement on 0 to 10.
        let least = Infinity, ways = 0;
        for (const at of allArrangements(n, 10)) {
          if (sortedMid(at) !== q.goal) continue;
          const moved = at.filter((x, i) => x !== q.start[i]).length;
          if (moved < least) { least = moved; ways = 0; }
          if (moved === least) ways++;
        }
        assert.equal(least, q.budget, `${p.id}: the fewest voters to move`);
        p.__ways = ways;
        // Every arrangement within one more than the budget, through Vote.
        const near = allArrangements(n, 10).filter(at => at.filter((x, i) => x !== q.start[i]).length <= q.budget + 1);
        for (const at of near) {
          let a = freshAttempt(p);
          at.forEach((x, i) => { if (x !== q.start[i]) a = play(p, a, {type: 'put', voter: i, to: x}); });
          a = play(p, a, {type: 'vote'});
          const moved = at.filter((x, i) => x !== q.start[i]).length;
          assert.equal(isSolved(p, a.board), sortedMid(at) === q.goal && moved <= q.budget, `${p.id}: ${at}`);
          if (sortedMid(at) === q.goal && moved > q.budget) assert.equal(a.board.told.kind, 'more');
          counts.arrangements++;
        }
        refuse(p, freshAttempt(p), {type: 'cant', voters: [0, 1, 2]}, 'no Can’t on a budget line');
      }
    }

    // Hints from fresh, and after random play (with Undo when it is stuck).
    hintsSolve(p, freshAttempt(p), 'fresh');
    const rand = rng(p.number * 7919 + 17);
    for (let trial = 0; trial < 12; trial++) {
      let a = freshAttempt(p);
      for (let k = 0; k < 9; k++) { const next = move(p, a, randomAction(p, a, rand)); if (next && !isSolved(p, next.board)) a = next; }
      assert.ok(validBoard(p, a.board), `${p.id}: random play stays valid`);
      undoChanges(p, a);
      hintsSolve(p, a, `after random play ${trial}`);
    }
  }

  // --- Counts the docs and the build print -------------------------------------
  const byId = id => puzzles.find(p => p.id === id);
  assert.equal(byId('votes-03').__ways, 3); assert.equal(byId('votes-13').__ways, 12);
  assert.equal(byId('votes-04').__ways, 12); assert.equal(byId('votes-08').__ways, 3); assert.equal(byId('votes-14').__ways, 30);

  // --- Undo keeps refusals -----------------------------------------------------
  {
    const p = byId('votes-12');
    let a = play(p, freshAttempt(p), {type: 'play', letter: 'A'});
    a = play(p, a, {type: 'cant', group: 'ABCD'});
    assert.deepEqual(a.board.told, {group: 'ABCD', why: 'ED'}, 'E beats D');
    const shown = draw(p)(a), back = undoPress(p, a, draw(p), shown);
    assert.equal(back.board.order, '', 'one Undo takes back the refusal and the letter before it');
    assert.deepEqual(back.board.shut, ['ABCD'], 'the refusal stays');
    refuse(p, back, {type: 'cant', group: 'ABCD'}, 'still refused after Undo');
    hintsSolve(p, back, 'after a refused group');
  }
  {
    const p = byId('votes-07');
    let a = play(p, freshAttempt(p), {type: 'write', card: 2, letter: 'B'});
    a = play(p, a, {type: 'cant', cards: [0, 2]});
    assert.equal(a.board.told.why, 'blank');
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.deepEqual(back.board.fill, [''], 'Undo after a refused set also takes back the letter');
    refuse(p, back, {type: 'cant', cards: [0, 2]}, 'still refused');
    a = play(p, back, {type: 'cant', cards: [0]});
    assert.equal(a.board.told.why, 'few');
    a = play(p, a, {type: 'cant', cards: [0, 1]});
    assert.ok(isSolved(p, a.board));
  }
  {
    const p = byId('votes-15');
    let a = play(p, freshAttempt(p), {type: 'cant', voters: [0, 1]});
    assert.equal(a.board.told.why, 'few');
    a = play(p, a, {type: 'cant', voters: [1, 2, 3]});
    assert.equal(a.board.told.why, 'side');
    a = play(p, a, {type: 'put', voter: 4, to: 8});
    a = play(p, a, {type: 'vote'});
    assert.deepEqual(a.board.told, {kind: 'vote', winner: 7}, 'V5 on 8 makes 7 win');
    const back = undoPress(p, a, draw(p), draw(p)(a));
    assert.deepEqual(back.board.shut, [[0, 1], [1, 2, 3]], 'refused voters stay refused');
  }

  // --- Illegal moves and forged saves ----------------------------------------
  {
    const p = byId('votes-01'), f = freshAttempt(p);
    for (const action of [{type: 'play', letter: 'D'}, {type: 'play', letter: 'AB'}, {type: 'play'}, {type: 'cant', group: 'BA'}, {type: 'cant', group: ''}, {type: 'cant', group: 'AA'}, {type: 'write', card: 0, letter: 'A'}, {type: 'vote'}, {type: 'nope'}, null, 'A'])
      assert.equal(move(p, f, action), null, `refused: ${JSON.stringify(action)}`);
    let a = play(p, f, {type: 'play', letter: 'A'});
    refuse(p, a, {type: 'play', letter: 'A'}, 'a letter plays once');
    const b = f.board;
    for (const forged of [{...b, order: 'AA'}, {...b, order: 'D'}, {...b, claim: 'B'}, {...b, claim: 'BC'}, {...b, shut: ['ABC'], told: {group: 'BC', why: 'AB'}}, {...b, told: {group: 'BC', why: 'AB'}}, {...b, shut: ['BC', 'BC']}, {...b, extra: 1}, {...b, order: 7}])
      assert.ok(!validBoard(p, forged), `forged agenda: ${JSON.stringify(forged)}`);
    assert.ok(validBoard(p, {...b, shut: ['ABC'], told: {group: 'ABC', why: 'target'}}), 'a true refusal is a valid save');
  }
  {
    const p = byId('votes-03'), b = freshAttempt(p).board;
    refuse(p, freshAttempt(p), {type: 'write', card: 0, letter: 'A'}, 'a printed card can’t be written');
    for (const forged of [{...b, fill: ['AAB']}, {...b, fill: ['ABCD']}, {...b, fill: ['A', 'B']}, {...b, done: true}, {...b, fill: ['ABC'], done: true}, {...b, told: {kind: 'fail'}}, {...b, fill: ['CAB'], told: {kind: 'fail'}}, {...b, claim: [0, 1]}, {...b, told: {kind: 'cards', cards: [0, 1], why: 'none'}}])
      assert.ok(!validBoard(p, forged), `forged cards: ${JSON.stringify(forged)}`);
    assert.ok(validBoard(p, {...b, fill: ['ABC'], told: {kind: 'fail'}}), 'A, B, C fails: B beats C');
  }
  {
    const p = byId('votes-04'), b = freshAttempt(p).board;
    for (const forged of [{...b, at: [0, 2, 4, 7]}, {...b, at: [0, 2, 4, 7, 11]}, {...b, at: [0, 2, 4, 7, 10.5]}, {...b, done: true}, {...b, at: [0, 2, 7, 7, 10], told: {kind: 'vote', winner: 7}}, {...b, told: {kind: 'vote', winner: 7}}, {...b, at: [7, 7, 4, 7, 10], told: {kind: 'vote', winner: 7}}, {...b, claim: [0, 1, 2]}, {...b, shut: [[0, 1, 2]]}])
      assert.ok(!validBoard(p, forged), `forged line: ${JSON.stringify(forged)}`);
    assert.ok(validBoard(p, {...b, at: [7, 7, 4, 7, 10], told: {kind: 'more'}}), 'two moved with one allowed');
    const q = byId('votes-09'), c = freshAttempt(q).board;
    refuse(q, freshAttempt(q), {type: 'put', voter: 0, to: 5}, 'the four voters stay put');
    refuse(q, freshAttempt(q), {type: 'vote'}, 'Vote waits for the new voter');
    for (const forged of [{...c, at: [2, 3, 7, 9, null]}, {...c, at: [1, 3, 7, 9]}, {...c, at: [1, 3, 7, 9, 5], done: true, told: {kind: 'more'}}, {...c, claim: [0, 1, 2]}])
      assert.ok(!validBoard(q, forged), `forged add: ${JSON.stringify(forged)}`);
  }

  // --- Playground ------------------------------------------------------------------
  {
    const g = all.find(p => p.id === 'votes-playground');
    assert.equal(mechanicFor(g).noHint(g), true, 'the playground has no Hint');
    let a = freshAttempt(g);
    refuse(g, a, {type: 'play', letter: 'A'}, 'knockouts wait for full cards');
    for (const [card, word] of [[0, 'ABC'], [1, 'BCA'], [2, 'CAB']]) for (const letter of word) a = play(g, a, {type: 'write', card, letter});
    for (const letter of 'BCA') a = play(g, a, {type: 'play', letter});
    assert.equal(a.board.order, 'BCA');
    a = play(g, a, {type: 'erase', card: 0, letter: 'B'});
    assert.equal(a.board.order, '', 'changing a card clears the knockout');
    a = play(g, a, {type: 'write', card: 0, letter: 'B'});
    a = play(g, a, {type: 'play', letter: 'A'}); a = play(g, a, {type: 'again'});
    refuse(g, a, {type: 'again'}, 'nothing to clear');
    a = play(g, a, {type: 'size', size: 5});
    assert.deepEqual(a.board.fill, ['', '', '', '', '']);
    refuse(g, a, {type: 'size', size: 4}, 'three or five voters');
    assert.ok(!isSolved(g, a.board), 'the playground is never solved');
    assert.ok(!validBoard(g, {...a.board, order: 'A'}), 'no knockout on blank cards');
  }
  return {puzzles: pack.puzzles.length, ...counts};
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(await validateVotes());
