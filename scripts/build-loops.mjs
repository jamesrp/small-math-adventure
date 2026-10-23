// Authoring list for Loop worlds (worksheet Week 100, Distance in nested
// worlds). Computes each puzzle's answer with the mechanic's own core
// (dist/families/loops/world.js): the world a full clue list makes, the bad
// triangles of an impossible one, every one-clue repair, and the fewest clues
// that pin a world; checks them against the table in docs/loops/README.md and
// the worksheet's guide; plays a witness through the mechanic's hints; and
// writes dist/families/loops/loops.json. Run: node scripts/build-loops.mjs
// scripts/validate-loops.mjs checks the same claims by exhaustive search.
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as W from '../dist/families/loops/world.js';
import {loopMechanics, repairs} from '../dist/families/loops/loops.js';

const LETTERS = cards => cards.split('');
const clueList = text => text.split(' ').map(t => { const [pair, d] = t.split('='); const [u, v] = pair.split('-'); return [u, v, Number(d)]; });
const loopList = text => text.split(' ').map(t => { const [d, cards] = t.split(':'); return [Number(d), cards.split(',')]; });
const SOURCES = ['loops-week100', 'loops-card100', 'loops-dovgoshey', 'loops-johnson', 'loops-gouvea'];

const RULES = [
  'A loop holds two or more cards. Loops are inside one another or apart; they never cross.',
  'Numbers grow outward: a loop inside another has a smaller number. The frame round every card is 8.',
  'The distance between two cards is the number on the smallest loop round both.'
];
const CONTROLS = {
  make: 'Tap cards, then 2 or 4, to put a loop round them. Tap a loop’s number to take it away. A clue lights when the smallest loop round its two cards has its number; the frame is 8. If no loops can make every clue light, press Can’t and tap three clues on three cards that no loops can make together.',
  repair: 'Tap a clue to change its number, and again for the next number; only one clue changes at a time. Then make loops so that every clue lights: the change is kept below the clues. Change a clue again to look for more. That’s all says whether you have found every change.',
  pin: 'Tap two cards to add the clue for them, and tap a clue to take it away. When every pip is full, the app draws another world that fits your clues, if there is one.',
  playground: 'Tap cards, then 2 or 4, to put a loop round them. Tap a loop’s number to take it away. Choose two cards to see their distance.'
};
const OBJECTIVE = {
  make: () => 'Put the cards in loops so that every clue holds: the smallest loop round its two cards has its number. If no loops can, press Can’t and tap three clues that show it.',
  repair: () => 'Change one clue to another number so that loops can make every clue hold, and make them hold. Find every such change, then press That’s all.',
  pin: item => `Choose ${item.budget} clues, each the distance of two cards in this world, that no other world fits.`
};
const VISIBLE = {
  make: () => 'Make every clue light, or press Can’t.',
  repair: () => 'Find every one-clue change that lets every clue light.',
  pin: item => `Choose ${item.budget} clues that fit only this world.`
};
const PRE = {
  three: 'Compare the numbers 2, 4 and 8. No reading: a grown-up reads How to play once. The K–1 route reads the clues as close (2) and far (4 or 8).',
  rebuild: 'Hold several clues at once and compare numbers. Play the three-card puzzles first.',
  repair: 'Play Ten clues, one changed first. Find every case and keep track of them.',
  pin: 'Grades 3–5: ask which clues the others already settle. Play the rebuild puzzles first.',
  number: 'None for the puzzle. The rule behind the clues (remainders after dividing by 2 and by 4) is for grades 4–5, in the notes.'
};

// The puzzles. `check` holds the answer as the README and the guide give it.
const ITEMS = [
  {number: 1, level: 'easy', title: '2, 8 and 8', mode: 'make', cards: 'ABC', clues: 'A-B=2 A-C=8 B-C=8', check: {world: '2:A,B'}, prereq: 'three',
    idea: 'One loop makes two cards close; the frame makes everything else 8.',
    hints: ['Which two cards are close?', 'A and B are 2 apart; C is 8 from both.', 'Put a 2 loop round A and B.'],
    parent: {notice: 'Whether your child reads a clue as two cards and a number, and finds that the frame already makes the 8s light.', prompt: 'Which clues light before you make any loop?', explanation: 'With no loops every distance is 8, the frame. A 2 loop round A and B lights A–B = 2 and leaves C 8 from both.', extension: 'Can you make A–B = 2 and A–C = 2 and B–C = 2? (Yes: one 2 loop round all three.)', connection: 'The distance is read from the loops: the smallest loop round both cards.'},
    provenance: 'Week 100 Problem 2, the triple 2, 8, 8 (printed last of six).'},
  {number: 2, level: 'easy', title: '2, 4 and 4', mode: 'make', cards: 'ABC', clues: 'A-B=2 A-C=4 B-C=4', check: {world: '2:A,B 4:A,B,C'}, prereq: 'three',
    idea: 'Loops nest: a 2 loop inside a 4 loop.',
    hints: ['A and B are closest. What is the next loop out?', 'C is 4 from A and from B.', 'Put a 2 loop round A and B, then a 4 loop round all three.'],
    parent: {notice: 'Whether your child puts the 4 loop round the 2 loop, or tries a 4 loop round A and C only (the app refuses a crossing).', prompt: 'Which loop is the smallest one round A and C?', explanation: 'A and B share a 2 loop; the 4 loop holds that loop and C. The smallest loop round A and C, or B and C, is the 4 loop.', extension: 'Make 2, 8, 8 into 2, 4, 4 with one more loop. (A 4 loop round all three.)', connection: 'Two cards inside a smaller loop are both the same distance from a card outside it.'},
    provenance: 'Week 100 Problem 2, the triple 2, 4, 4.'},
  {number: 3, level: 'easy', title: '2, 2 and 4', mode: 'make', cards: 'ABC', clues: 'A-B=2 A-C=2 B-C=4', check: {bad: [[0, 1, 2]]}, prereq: 'three',
    idea: 'Two 2 clues that share a card force the third to be 2: the largest of three distances occurs at least twice.',
    hints: ['Try a 2 loop for A and B, and another for A and C.', 'Two 2 loops that share A would cross, so they must be one loop.', 'Press Can’t and tap all three clues.'],
    parent: {notice: 'Whether your child tries two 2 loops sharing A, and what they make of the app refusing the crossing.', prompt: 'If A and B share a 2 loop and A and C share a 2 loop, are they the same loop?', explanation: 'The loops for A–B = 2 and A–C = 2 both hold A. Loops never cross, so one holds the other, and both have the number 2, so they are one loop round all three. Then B–C = 2, not 4. The three clues are the certificate: their biggest number is there only once.', extension: 'Change one clue so loops can make it. (B–C to 2, or A–B or A–C to 4.)', connection: 'The strong triangle inequality: d(B, C) ≤ max(d(A, B), d(A, C)).'},
    provenance: 'Week 100 Problem 2, the triple 2, 2, 4 (impossible).'},
  {number: 4, level: 'easy', title: '4, 4 and 4', mode: 'make', cards: 'ABC', clues: 'A-B=4 A-C=4 B-C=4', check: {world: '4:A,B,C'}, prereq: 'three',
    idea: 'A loop may hold three cards directly: all three distances equal.',
    hints: ['Every clue says 4.', 'One loop can hold all three cards.', 'Put a 4 loop round A, B and C.'],
    parent: {notice: 'Whether your child expects one pair to be closer, and whether a loop round three cards feels allowed.', prompt: 'Does every loop have to hold two things?', explanation: 'One 4 loop round all three makes every distance 4. Loops may hold three or more cards.', extension: 'Can three cards have distances 4, 4, 8? (No: 8 would be the largest only once. 4, 8, 8 works.)', connection: 'Equilateral triangles are allowed; isosceles here means the two largest are equal.'},
    provenance: 'Week 100 Problem 2, the triple 4, 4, 4.'},
  {number: 5, level: 'easy', title: '2, 4 and 8', mode: 'make', cards: 'ABC', clues: 'A-B=2 A-C=4 B-C=8', check: {bad: [[0, 1, 2]]}, prereq: 'three',
    idea: 'A 4 loop round A and C must hold A’s 2 loop, and so B: then B–C is 4, not 8.',
    hints: ['Put A and B in a 2 loop first.', 'A loop round A and C has to hold all of A’s 2 loop.', 'Press Can’t and tap all three clues.'],
    parent: {notice: 'Whether your child sees that C can’t be 4 from A and 8 from B when A and B are close.', prompt: 'Once A and B share a 2 loop, how far is C from B if it is 4 from A?', explanation: 'The 4 loop round A and C holds A, so it holds A’s 2 loop and B with it. So B–C is at most 4. Three distances with the largest only once never come from loops.', extension: 'Which of 2, 4, 8 can the third clue be, with A–B = 2 and A–C = 4? (Only 4.)', connection: 'The same strong triangle inequality, with three different numbers.'},
    provenance: 'Week 100 Problem 2, the triple 2, 4, 8 (impossible).'},
  {number: 6, level: 'medium', title: 'Two pairs', mode: 'make', cards: 'ABCD', clues: 'A-B=2 A-C=4 A-D=4 B-C=4 B-D=4 C-D=2', check: {world: '2:A,B 2:C,D 4:A,B,C,D'}, prereq: 'rebuild',
    idea: 'Two 2 loops side by side inside one 4 loop.',
    hints: ['Find the closest pairs first.', 'A–B and C–D are 2; every other clue is 4.', 'Put 2 loops round A and B and round C and D, then a 4 loop round all four.'],
    parent: {notice: 'Whether your child builds the small loops first and then one loop round both.', prompt: 'Which pairs are closest? What holds them both?', explanation: 'A, B and C, D each share a 2 loop, and one 4 loop holds both loops, so every cross distance is 4.', extension: 'What changes if A–C, A–D, B–C and B–D are 8? (Leave out the 4 loop.)', connection: 'At each number r, “distance at most r” sorts the cards into groups: here {A, B} and {C, D} at 2, all four at 4.'},
    provenance: 'New instance on four cards, after Week 100 Problems 1 and 4.'},
  {number: 7, level: 'medium', title: 'A chain of twos', mode: 'make', cards: 'ABCD', clues: 'A-B=2 A-C=4 A-D=8 B-C=2 B-D=8 C-D=8', check: {bad: [[0, 1, 3]]}, prereq: 'rebuild',
    idea: 'A–B = 2 and B–C = 2 force A–C = 2, even when the clue for A and C is somewhere else in the list.',
    hints: ['Try to light the two 2 clues.', 'The loops for A–B and B–C share B.', 'Press Can’t and tap A–B, A–C and B–C.'],
    parent: {notice: 'Whether your child looks for the three clues on the same three cards among six, or presses Can’t and taps clues at random (a refusal shuts Can’t until a loop changes).', prompt: 'Which three clues are about A, B and C?', explanation: 'A–B = 2 and B–C = 2 put A, B and C in one 2 loop, so A–C would be 2, not 4. A–B, A–C and B–C are the certificate. The triangles with D are fine (2, 8, 8 and 4, 8, 8).', extension: 'Which single change makes all six clues possible? (A–C to 2, or A–B or B–C to 4.)', connection: 'The relation “distance at most 2” is transitive, so its classes are the 2 loops.'},
    provenance: 'New instance on four cards: Week 100 Problem 5’s certificate among clues for other cards.'},
  {number: 8, level: 'medium', title: 'Ten clues', mode: 'make', cards: 'ABCDE', clues: 'A-B=2 A-C=4 B-C=4 D-E=2 A-D=8 A-E=8 B-D=8 B-E=8 C-D=8 C-E=8', check: {world: '2:A,B 4:A,B,C 2:D,E'}, prereq: 'rebuild',
    idea: 'A full set of clues rebuilds the loops, and only one set of loops fits.',
    hints: ['Start with the clues that say 2.', 'C is 4 from A and from B, and 8 from D and E.', 'Put 2 loops round A and B and round D and E, then a 4 loop round A, B and C.'],
    parent: {notice: 'Whether your child sorts the clues (smallest first, or by card) or builds and checks one at a time.', prompt: 'Could loops round different cards fit the same ten clues?', explanation: 'At 2 the cards group as {A, B}, {D, E}, {C}; at 4 as {A, B, C}, {D, E}. Those are the loops, so one structure fits (of the 358 for five cards). A second loop round exactly the cards of another, say a 4 loop round D and E, changes no distance.', extension: 'Remove clues: which four of the ten still pin this world? (A–B, D–E, one of A–C or B–C, and one 8 between {A, B, C} and {D, E}: see Hard 11.)', connection: 'Reconstruction: complete distances determine the hierarchy, as in hierarchical clustering.'},
    provenance: 'Week 100 Problem 4 (its ten clue cards and the hidden world, C and D swapped from page 1).'},
  {number: 9, level: 'medium', title: 'Ten clues, one changed', mode: 'make', cards: 'ABCDE', clues: 'A-B=2 A-C=2 B-C=4 D-E=2 A-D=8 A-E=8 B-D=8 B-E=8 C-D=8 C-E=8', check: {bad: [[0, 1, 2]]}, prereq: 'rebuild',
    idea: 'One bad triangle proves ten clues impossible, without saying which clue is wrong.',
    hints: ['These are the ten clues with A–C changed to 2.', 'Look at A, B and C.', 'Press Can’t and tap A–B, A–C and B–C.'],
    parent: {notice: 'Whether your child finds the triangle at once from Ten clues, or searches.', prompt: 'Which three clues can’t all hold?', explanation: 'A–B = 2 and A–C = 2 force B–C = 2, but its clue says 4. The other triangles are fine.', extension: 'Which clue is wrong? (Consistency alone can’t say: three different one-clue changes work, Hard 10.)', connection: 'An inconsistent table has a certificate of three entries.'},
    provenance: 'Week 100 Problem 5, its first question.'},
  {number: 10, level: 'hard', title: 'Every repair', mode: 'repair', cards: 'ABCDE', clues: 'A-B=2 A-C=2 B-C=4 D-E=2 A-D=8 A-E=8 B-D=8 B-E=8 C-D=8 C-E=8', check: {repairs: 'A-B=4 A-C=4 B-C=2'}, prereq: 'repair',
    idea: 'Exactly three one-clue changes work, all inside the bad triangle.',
    hints: ['A change outside A, B and C leaves the bad triangle as it was.', 'For each of A–B, A–C and B–C, try both other numbers.', 'The changes are A–B to 4, A–C to 4 and B–C to 2.'],
    parent: {notice: 'Whether your child checks clues outside the triangle, and how they know they have every change.', prompt: 'Why can’t a change to D–E help?', explanation: 'Only A–B, A–C and B–C can fix the triangle 2, 2, 4. A–B: 4 works (A, C in a 2 loop, B joins at 4), 8 leaves 8 alone on top. A–C the same. B–C: 2 works (one 2 loop round A, B, C), 8 fails. So three changes, each with its world.', extension: 'Is the original A–C = 4 more right than the others? (No: consistency can’t tell which clue was wrong.)', connection: 'Completeness by cases: every other change keeps the certificate.'},
    provenance: 'Week 100 Problem 5 (every repair; the card’s fix 4 wording “these ten clues, with A–C = 2”).'},
  {number: 11, level: 'hard', title: 'Pin the ten-clue world', mode: 'pin', cards: 'ABCDE', world: '2:A,B 4:A,B,C 2:D,E', budget: 4, prereq: 'pin',
    idea: 'Four of the ten clues already force the other six.',
    hints: ['Each loop needs a clue that shows it.', 'Inside a 2 loop of two cards, one clue. Between C and the 2 loop, one 4. Between the two big groups, one 8.', 'Choose A–B, D–E, A–C and A–D.'],
    parent: {notice: 'Whether your child chooses the clues that say 2 first, and sees that one 8 is enough between the two big groups.', prompt: 'If A–B = 2 and A–C = 4, what is B–C?', explanation: 'A–B = 2 and D–E = 2 make the small loops; one 4 from C to A or B makes the 4 loop (the other is then 4 too); one 8 from {A, B, C} to {D, E} settles every 8. With fewer, some loop could be different: the app draws such a world.', extension: 'Why is one clue between {A, B, C} and {D, E} enough? (Every pair across is then 8: if A–D = 8 and A–B = 2, B–D must be 8.)', connection: 'A distance between groups needs one clue; two small distances force the third.'},
    provenance: 'Week 100 Problem 10 (a secret world, few questions), on Problem 4’s world; the card’s Pin it down.'},
  {number: 12, level: 'hard', title: 'Three pairs', mode: 'pin', cards: 'ABCDEF', maxWidth: 300, world: '2:A,B 2:C,D 2:E,F', budget: 6, prereq: 'pin',
    idea: 'Two 8s don’t force a third: every two groups need their own clue.',
    hints: ['One clue for each pair.', 'Between the three pairs: does A–C = 8 and C–E = 8 tell you A–E?', 'Choose A–B, C–D, E–F, then one 8 between each two pairs: A–C, A–E and C–E.'],
    parent: {notice: 'Whether your child tries two 8s between the three pairs and is shown a world where the third pair has moved closer.', prompt: 'If A–C = 8 and C–E = 8, could A–E be 4?', explanation: 'Each 2 loop needs its clue, and each two of the three groups need an 8 between them: with only two, the other two groups could share a 4 loop. 3 + 3 = 6.', extension: 'How many clues pin six cards with no loops at all? (All 15: every pair needs its own 8.)', connection: 'The worst case of the secret-world game: when every answer is 8, nothing less than every pair settles it.'},
    provenance: 'Week 100 Problem 10 and its guide (the all-8 argument), as a new world.'},
  {number: 13, level: 'hard', title: 'Two triples', mode: 'pin', cards: 'ABCDEF', world: '2:A,B,C 2:D,E,F 4:A,B,C,D,E,F', budget: 5, prereq: 'pin',
    idea: 'Inside a 2 loop a chain of clues is enough; between two groups one clue is.',
    hints: ['A loop of three cards needs only two clues inside.', 'A–B = 2 and B–C = 2 force A–C = 2.', 'Choose A–B, B–C, D–E, E–F and one 4 between the triples, say A–D.'],
    parent: {notice: 'Whether your child spends three clues on each triple, and is shown that the budget then runs out.', prompt: 'Does A–B = 2 and B–C = 2 settle A–C?', explanation: 'Two 2 clues sharing a card force the third (2 is the smallest number), so each triple needs two clues; one 4 between the triples settles all nine pairs across. 2 + 2 + 1 = 5, against 6 for three pairs.', extension: 'Why is a chain enough inside a 2 loop but not between groups at 8? (Two small distances force the third; two large ones don’t.)', connection: 'Below the smallest number nothing is possible, so a 2 clue is only an upper bound that chains.'},
    provenance: 'New world for Week 100 Problem 10.'},
  {number: 14, level: 'hard', group: 'Number cards', groupNumber: 1, title: 'Number cards from seven clues', mode: 'make', cards: '01234567', maxWidth: 250, clues: '0-4=2 2-6=2 1-5=2 3-7=2 0-2=4 1-3=4 0-1=8', check: {world: '2:0,4 2:2,6 2:1,5 2:3,7 4:0,2,4,6 4:1,3,5,7'}, prereq: 'number',
    idea: 'Seven clues pin the eight-number world: 0 and 4 are close, 0 and 1 are far.',
    hints: ['Start with the 2 clues.', '0–2 = 4 puts 0’s loop and 2’s loop in one 4 loop.', 'Loops: 2 round 0, 4; 2, 6; 1, 5; 3, 7; then 4 round 0, 2, 4, 6 and round 1, 3, 5, 7.'],
    parent: {notice: 'Whether the numbers distract: 0 and 4 close, 0 and 1 far.', prompt: 'Which other distances do these seven clues settle?', explanation: 'These are the worksheet’s number distances: 8 when one card is even and the other odd, 4 for the same parity but different remainders after dividing by 4, and 2 for the same remainder. The seven clues pin the world: each 2 loop, each 4 loop and the frame needs one clue.', extension: 'Why is 0 closer to 4 than to 1 here? (4 − 0 is divisible by 4; 1 − 0 is odd.)', connection: 'A scaled 2-adic distance: 8 · 2^(−v) where 2^v is the largest power of 2 dividing the difference.'},
    provenance: 'Week 100 Problems 8 and 9 (cards 0–7 and their distance rules), as clue cards.'},
  {number: 15, level: 'hard', group: 'Number cards', groupNumber: 2, title: 'Pin the number world', mode: 'pin', cards: '01234567', maxWidth: 250, world: '2:0,4 2:2,6 2:1,5 2:3,7 4:0,2,4,6 4:1,3,5,7', budget: 7, prereq: 'number',
    idea: 'Each loop and the frame needs one clue: 4 + 2 + 1.',
    hints: ['Each 2 loop holds two cards: one clue each.', 'Each 4 loop holds two 2 loops: one clue between them.', 'The frame holds the even and the odd loop: one 8.'],
    parent: {notice: 'Whether your child counts the loops to predict the clues needed.', prompt: 'How many clues does each loop need?', explanation: 'Four 2 loops of two cards (one clue each), two 4 loops of two parts (one each) and the frame of two parts (one): 7.', extension: 'How many clues pin the world of cards 0–15 with the same rules extended to 16 (2, 4, 8, 16)? (8 + 4 + 2 + 1 = 15.)', connection: 'Residues mod 2, 4 and 8 make the loops.'},
    provenance: 'Week 100 Problem 10’s game on Problem 8’s world.'}
];

const fmtLoops = loops => loops.map(([l, s]) => `${l}:${s.join(',')}`).join(' ');
function witness(m, p) {
  let b = m.fresh(p);
  const actions = [];
  for (let k = 0; k < 80 && !m.solved(p, b); k++) {
    const h = m.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: hint ${k} is a move (${h.text})`);
    b = m.move(p, b, h.action);
    assert.ok(b, `${p.id}: hint ${k} is legal`);
    actions.push(h.action);
  }
  assert.ok(m.solved(p, b), `${p.id}: hints solve it`);
  return {actions, board: b};
}
const id = item => item.group ? `loops-num-${String(item.groupNumber).padStart(2, '0')}` : `loops-${String(item.number).padStart(2, '0')}`;
const out = ITEMS.map(item => {
  const cards = LETTERS(item.cards), q = {mode: item.mode, cards};
  if (item.maxWidth) q.maxWidth = item.maxWidth;
  if (item.mode === 'pin') {
    q.world = W.canonical(cards, loopList(item.world));
    q.budget = item.budget;
    assert.equal(W.fewest(cards, q.world), item.budget, `${id(item)}: the fewest clues`);
  } else {
    q.clues = clueList(item.clues);
    if (item.mode === 'make') q.cant = true;
    const world = W.worldOfClues(cards, q.clues);
    if (item.check.world) {
      const want = W.canonical(cards, loopList(item.check.world));
      if (world) assert.equal(fmtLoops(world.sort((a, b) => a[0] - b[0] || cards.indexOf(a[1][0]) - cards.indexOf(b[1][0]))), fmtLoops(want), `${id(item)}: the world of the clues`);
      else {
        // A partial clue list: the world must fit and be pinned by the clues.
        assert.ok(q.clues.every(c => W.holds(want, c)), `${id(item)}: the world fits`);
        assert.ok(W.pins(cards, want, q.clues.map(([u, v]) => [u, v])), `${id(item)}: the clues pin the world`);
      }
      q.world = want;
    } else {
      assert.equal(world, null, `${id(item)}: no world fits`);
      if (item.check.bad) assert.deepEqual(W.badTriangles(q.clues), item.check.bad, `${id(item)}: its certificates`);
      if (item.check.repairs) {
        const want = clueList(item.check.repairs).map(([u, v, d]) => [q.clues.findIndex(c => c[0] === u && c[1] === v), d]).sort((x, y) => x[0] - y[0]);
        assert.deepEqual(repairs(q), want, `${id(item)}: every repair`);
      }
    }
  }
  const mechanic = item.group ? 'loopsnum' : 'loops', p = {id: id(item), mechanic, parameters: q};
  const w = witness(loopMechanics[mechanic], p);
  return {
    id: id(item), number: item.group ? item.groupNumber : item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Loop worlds',
    ...(item.group ? {libraryFamily: 'loops', group: item.group} : {}),
    mechanic, band: 'all', revision: 1, sourceDocument: 'docs/loops/README.md',
    parameters: q,
    objective: OBJECTIVE[item.mode](item), visibleObjective: VISIBLE[item.mode](item), instruction: OBJECTIVE[item.mode](item),
    controls: CONTROLS[item.mode], rules: RULES,
    idea: item.idea, prerequisites: PRE[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution: {actions: w.actions}, provenance: item.provenance
  };
});

// Facts the notes state that the core can check.
{
  const abc = ['A', 'B', 'C'];
  const possible = t => W.worldOfClues(abc, [['A', 'B', t[0]], ['A', 'C', t[1]], ['B', 'C', t[2]]]) !== null;
  assert.deepEqual([[2, 2, 2], [2, 4, 4], [2, 2, 4], [4, 4, 4], [2, 4, 8], [2, 8, 8]].map(possible), [true, true, false, true, false, true], 'Problem 2’s six triples');
  assert.equal(possible([4, 4, 8]), false, '4, 4, 8 can’t'); assert.equal(possible([4, 8, 8]), true, '4, 8, 8 can');
  const p7 = out.find(p => p.id === 'loops-07').parameters;
  const fixes = [];
  p7.clues.forEach((c, i) => W.VALUES.filter(v => v !== c[2]).forEach(v => { if (W.worldOfClues(p7.cards, p7.clues.map((d, j) => j === i ? [d[0], d[1], v] : d))) fixes.push(`${c[0]}-${c[1]}=${v}`); }));
  assert.deepEqual(fixes, ['A-B=4', 'A-C=2', 'B-C=4'], 'the chain of twos: its single changes');
  const p6 = out.find(p => p.id === 'loops-06').parameters;
  assert.ok(W.worldOfClues(p6.cards, p6.clues.map(c => c[2] === 4 ? [c[0], c[1], 8] : c)), 'two pairs with 8 across');
  // Six cards with no loops: every one of the 15 clues is needed.
  assert.equal(W.fewest(LETTERS('ABCDEF'), []), 15, 'all-8: fifteen clues');
  // The number world from the rule.
  const nums = LETTERS('01234567'), rule = (a, b) => { const d = Math.abs(Number(a) - Number(b)); return d % 2 ? 8 : d % 4 ? 4 : 2; };
  assert.equal(fmtLoops(W.worldOf(nums, rule).sort((a, b) => a[0] - b[0] || nums.indexOf(a[1][0]) - nums.indexOf(b[1][0]))), '2:0,4 2:1,5 2:2,6 2:3,7 4:0,2,4,6 4:1,3,5,7', 'the number world');
  const n14 = out.find(p => p.id === 'loops-num-01').parameters;
  assert.ok(n14.clues.every(([a, b, d]) => rule(a, b) === d), 'the number clues follow the rule');
}

const playground = {
  id: 'loops-playground', number: 0, title: 'Loop worlds playground', difficulty_level: 'playground', familyTitle: 'Loop worlds', mechanic: 'loops', band: 'playground', revision: 1, sourceDocument: 'docs/loops/README.md',
  parameters: {mode: 'playground', cards: LETTERS('ABCDEF')},
  objective: 'Make any world of loops, and choose two cards to see their distance.', visibleObjective: '',
  instruction: 'Make any world of loops, and choose two cards to see their distance.',
  controls: CONTROLS.playground, rules: RULES,
  idea: 'Free building on six cards, reading distances.',
  prerequisites: 'None.',
  hints: ['Make a world, then look for three cards whose largest distance is there only once.', 'Can two loops share a card without one holding the other?', 'Make a world where every distance is the same.'],
  parent: {notice: 'Whether your child predicts a distance before choosing the two cards.', prompt: 'Can you find three cards whose biggest distance is there only once?', explanation: 'No world has such three cards: the largest of three distances always occurs at least twice. The app’s refusals (no crossing, numbers growing outward) are what make this true.', extension: 'Make the world of Problem 1 on page 1 of the worksheet: 2 round A, B; 4 round A, B, D; 2 round C, E.', connection: 'An ultrametric: d(x, z) ≤ max(d(x, y), d(y, z)).', sourceIds: SOURCES},
  provenance: 'Week 100 Problem 1 (build a world and read its distances) and Problems 6–7 (any allowed arrangement).'
};

const MATHEMATICS = 'Cards sit in loops that are inside one another or apart, never crossing, with numbers that grow outward; the frame round every card is 8. The distance of two cards is the number on the smallest loop round both. This is an ultrametric: among any three cards the largest distance occurs at least twice, since the loops for the two smaller distances share a card, so one holds the other and with it all three cards. So 2, 2, 4 and 2, 4, 8 can’t be made, while 2, 4, 4 and 4, 4, 4 can. At each number r, “distance at most r” is an equivalence whose classes are the loops, so a full table of distances rebuilds the loops: one structure fits (of 358 on five cards and 2,471 on six, with numbers 2, 4, 8). A table that no loops fit always contains three clues on three cards whose largest is unique, and that certificate does not say which clue is wrong: on the worksheet’s ten clues with A–C changed to 2, exactly three one-clue changes work. Fewer clues can pin a world: inside a 2 loop a chain of 2s is enough, since two small distances force the third, but between the parts of a 4 loop or the frame every two parts need their own clue, since two large distances don’t. So the fewest clues are (parts − 1) for each 2 loop plus (parts choose 2) for each 4 loop and the frame; with no loops that is all 15 on six cards. Cards 0–7 with 8 for different parity, 4 for the same parity and different remainders by 4, and 2 for the same remainder by 4 form such a world: a scaled 2-adic distance.';
const json = {
  title: 'Loop worlds',
  version: 1,
  families: [{id: 'loops', title: 'Loop worlds', mathematics: MATHEMATICS, rules: RULES, sourceIds: SOURCES}],
  sources: [
    {id: 'loops-week100', title: 'Bellingham Math Circle — Week 100: Distance in nested worlds (grades 3–5 packet and adult guide, W100-G35-v2 and W100-FAC-v2)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-100', kind: 'local curriculum'},
    {id: 'loops-card100', title: 'Week 100 review card and math check (App fit: loops, rebuild, Can’t by a bad triangle, every repair, pin it down)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-100.md', kind: 'local curriculum'},
    {id: 'loops-dovgoshey', title: 'Oleksiy Dovgoshey — Finite ultrametric balls (2018), §1, Propositions 1.2 and 1.5 (every point of a ball is a centre; balls are nested or disjoint)', url: 'https://arxiv.org/abs/1810.03128', kind: 'research'},
    {id: 'loops-johnson', title: 'Stephen C. Johnson — Hierarchical clustering schemes, Psychometrika 32 (1967) 241–254 (ultrametrics and nested clusterings determine each other)', url: 'https://doi.org/10.1007/BF02289588', kind: 'research'},
    {id: 'loops-gouvea', title: 'Fernando Q. Gouvêa — p-adic Numbers: An Introduction, Springer (1997), Chapter 2 (the p-adic absolute value is non-Archimedean)', url: 'https://doi.org/10.1007/978-3-642-59058-0', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/loops/loops.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.solution.actions.length} hint steps`).join('\n'));
