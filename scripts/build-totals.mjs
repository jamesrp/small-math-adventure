// Authoring list for Running totals (worksheet Week 89, Growing shapes and
// totals). Computes every target's orders, the most and least, the Can't
// reasons, the cards a row of totals needs and the starts an every puzzle
// allows with the mechanic's own methods, checks them against the claims in
// the copy and in docs/totals/README.md, records a witness for each puzzle
// (played through the move rules by scripts/validate-totals.mjs, which also
// checks every claim again by brute force), and writes
// dist/families/totals/totals.json.
// Run: node scripts/build-totals.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {reach, extremes, sortedDown, sortedUp, inputsFor, startsFor, weights, finalOf, orders, SUPPLY} from '../dist/families/totals/totals.js';

// --- Copy --------------------------------------------------------------------
const SOURCES = ['totals-week89', 'totals-card89', 'totals-alper', 'totals-gkp'];
const TURN = {
  1: ['Each turn uses one card: add it to the tray’s total. The tray keeps what it had.'],
  2: ['Each turn uses one card. First add the card to tray 1’s total.', 'Then add tray 1’s new total to tray 2’s total. Both trays keep what they had.'],
  3: ['Each turn uses one card. First add the card to tray 1’s total.', 'Then add tray 1’s new total to tray 2’s, and tray 2’s new total to tray 3’s. Every tray keeps what it had.']
};
const GOAL = {
  make: 'Use every card once. Make the last tray finish on the flag’s total, or press Can’t if no order of these cards can.',
  match: 'Cards come from an endless supply, 0 to 5. Make the last tray’s totals match the flags under every turn.',
  every: 'Choose the tray’s start, then use cards 0 to 5 to make its totals match the flags. Find every start that works, then press That’s all.'
};
const PLAY = 'Tap a card to play it in the next empty turn, or drag it onto a turn. Tap a turn to pick it: then tap a card to put it there, or another turn to swap the two. Tap a picked turn again, or drag its card back to the cards, to take it out.';
const GRID = 'The grid shows each tray’s total after every turn: each total is the one to its left plus the one above it.';
const CONTROLS = {
  make: `${PLAY} ${GRID} Can’t works once every card is down, and the cards on the board are your reason. Undo takes back a card.`,
  match: `${PLAY} ${GRID} A last-tray total turns green when it matches its flag. Undo takes back a card.`,
  every: `Tap a start number to choose the tray’s start. ${PLAY} ${GRID} The starts you have found turn green. Undo takes back a card or a start.`
};
const OBJECTIVES = {
  make: q => `Use every card once so the last tray finishes on ${q.target}.`,
  match: () => 'Choose cards so the last tray’s totals match the flags.',
  every: () => 'Find every start that makes these totals.'
};
const VISIBLE = {make: () => '', match: () => '', every: OBJECTIVES.every};
const PREREQUISITES = {
  'make-1': 'Add numbers to about 15. A grown-up can read the rule aloud with K–1 children.',
  'make-2': 'Add numbers to about 25; the grid keeps both running totals. Grades 2–3 and up, or younger children with a grown-up reading the rule.',
  'make-3': 'Add numbers to about 60, with the grid doing the bookkeeping. Saying why a sorted order makes the most or least is grades 4–5 work, with a grown-up.',
  'match-1': 'Subtract small numbers, to 12: how much did the tray go up? K–1 with a grown-up reading, grades 2–3 alone.',
  'match-2': 'Subtract twice: tray 2’s change is tray 1’s total. Grades 4–5, or keen younger children with a grown-up.',
  'every-1': 'Subtract to 12 and keep track of which starts were tried. Grades 2–3 and up.'
};

// --- Puzzles -----------------------------------------------------------------
const zeros = k => Array(k).fill(0);
const make = (k, cards, target, start = zeros(k)) => ({mode: 'make', trays: k, cards, start, target, cant: true});
const match = (k, goal, start = zeros(k)) => ({mode: 'match', trays: k, start, goal, supply: SUPPLY});
const every = (goal, startCap) => ({mode: 'every', trays: 1, goal, supply: SUPPLY, startCap});
// Each claim: an exact target's unique order, or Can't with its reason.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Missing cards', q: match(1, [5, 5, 9, 12], [2]), claim: {inputs: [3, 0, 4, 3]},
    idea: 'Each card is how much the tray went up: the difference between one total and the next.',
    hints: ['How much did the tray go up on the first turn?', 'The tray starts at 2 and is 5 after turn 1, so the first card is 3. A turn where the total stays the same used a 0.', 'Play 3, 0, 4 and 3.'],
    parent: {notice: 'The second total equals the first, so that turn’s card is 0: a 0 card is still a turn.', prompt: 'How can you tell a card from two totals next to each other?', explanation: 'A tray keeps what it had and adds the card, so each card is the new total minus the old one: 5 − 2 = 3, 5 − 5 = 0, 9 − 5 = 4 and 12 − 9 = 3. The cards add up to 10, the last total minus the start (12 − 2): differences undo running totals.', extension: 'Start at 0 instead of 2 with the same cards. What are the totals now? (3, 3, 7, 10: every total is 2 less.)', connection: 'Differences and running totals undo each other, the discrete form of the fundamental theorem of calculus: adding up the changes gives the total change.'},
    provenance: 'Week 89, Problem 8 (start 2, totals 5, 5, 9, 12).'},
  {number: 2, level: 'easy', title: 'Any order', q: make(1, [0, 1, 2, 3, 4], 12, [3]), claim: {cant: 'same'},
    idea: 'One tray keeps every card it gets, so every order of the cards makes the same last total.',
    hints: ['Play the cards in one order. Then try another order.', 'The tray keeps every card it gets, so the last total is the start plus all the cards.', 'Every order makes 3 + 0 + 1 + 2 + 3 + 4 = 13.'],
    parent: {notice: 'The totals along the way change with the order, but the last one is always 13.', prompt: 'Could some clever order reach 12?', explanation: 'A single tray only ever adds. Whatever order the cards come in, the last total is the start plus every card, 3 + 10 = 13. So 12 can’t be made, and one full lane is the whole argument, because every order gives the same total. Can’t is accepted after any full lane.', extension: 'What start would make 12 with these cards? (2.) Does the order ever matter with one tray? (Only for the totals along the way.)', connection: 'A sum does not depend on the order of its terms. The next puzzles add a second tray, and there the order starts to matter.'},
    provenance: 'Week 89, Problem 7 (cards 0 to 4, a tray starting at 3), with a target it cannot reach.'},
  // Puzzles 3 and 4 have three cards whose six orders all make different
  // totals, so the order is a decision, not a coin flip (revision 2, after
  // the app critic's review of October 23, 2026; revision 1 had two cards).
  {number: 3, level: 'easy', title: 'Two trays', revision: 2, q: make(2, [3, 1, 0], 9), claim: {order: [1, 3, 0], distinct: true},
    idea: 'With two trays the first card counts three times, the second twice and the last once.',
    hints: ['Try an order and watch tray 2.', 'Tray 2 gains tray 1’s new total every turn, so the first card is counted on all three turns, the second on two and the last on one.', 'Play 1, 3, 0.'],
    parent: {notice: 'Every order makes a different total: 11, 10, 9, 7, 6 or 5. Only 1, 3, 0 makes 9.', prompt: 'Why does 3, 1, 0 make more than 1, 3, 0?', explanation: 'Turn 1 puts the first card in tray 1, and tray 2 gains it. Every later turn tray 2 gains tray 1’s new total, which still holds the first card. So tray 2 ends with 3 × the first card + 2 × the second + the third. 1, 3, 0 gives 3 + 6 + 0 = 9; 3, 1, 0 gives 9 + 2 = 11, the most; 0, 1, 3 gives 2 + 3 = 5, the least.', extension: 'With only the cards 2 and 1, what can tray 2 make? (5 from 2, 1 or 4 from 1, 2.)', connection: 'Tray 2 holds the running total of the running totals, and each card counts once for every turn left, its own included.'},
    provenance: 'Week 89, the two-tray rule and its worked turn (before Problem 11), with three cards whose six orders all make different totals (the app critic’s deck 3, 1, 0).'},
  {number: 4, level: 'easy', title: 'A zero turn', revision: 2, q: make(2, [3, 2, 0], 11), claim: {order: [3, 0, 2], distinct: true},
    idea: 'A 0 card adds nothing to tray 1, but tray 2 still gains tray 1’s total on that turn.',
    hints: ['Where should the 0 go: first, in the middle or last?', 'On a 0 turn tray 1 stays the same, but tray 2 still adds it on.', 'Play 3, 0, 2.'],
    parent: {notice: 'After 3 then 0, tray 1 reads 3, 3 and tray 2 reads 3, 6: the 0 turn still added 3.', prompt: 'Why does a 0 card still change tray 2?', explanation: 'Every turn adds tray 1’s new total to tray 2, even when the card is 0. Tray 2 ends with 3 × the first card + 2 × the second + the third, so where the 0 goes decides which turns the 3 and the 2 get. 3, 0, 2 gives 9 + 0 + 2 = 11. The six orders make 13, 12, 11, 9, 8 and 7, all different.', extension: 'Where should the 0 go to make the most, and the least? (Last: 3, 2, 0 makes 13. First: 0, 2, 3 makes 7.)', connection: 'A zero input is still a step: the running total of a running total keeps growing while the first total stands still.'},
    provenance: 'Week 89, Problem 12’s rule that a zero input is a whole turn, with three cards whose six orders all make different totals.'},
  {number: 5, level: 'medium', title: 'Where the zeros go', q: make(2, [3, 1, 0, 0], 9), claim: {order: [0, 1, 3, 0]},
    idea: 'Each card counts once for every turn left, its own included: 4, 3, 2 and 1 times.',
    hints: ['Play the cards and compare the last total with 9. Too big or too small?', 'A card counts more the earlier it is played: four times on turn 1, once on turn 4.', 'Play 0, 1, 3, 0.'],
    parent: {notice: 'Only one order makes 9: 0, 1, 3, 0.', prompt: 'How do the zeros change the total when they add nothing?', explanation: 'Tray 2 ends with 4 × the first card + 3 × the second + 2 × the third + the fourth. A 0 turn still adds tray 1’s total to tray 2, so where the zeros go decides how often the 1 and the 3 count. 0, 1, 3, 0 gives 3 + 6 = 9. With the 1 before the 3, zeros last (1, 3, 0, 0) make 13 and zeros first (0, 0, 1, 3) make 5.', extension: 'Which totals from 5 to 15 can these cards make? (All but 8 and 12: 3 × one weight + another weight can never be 3 × 2 + 2 or 3 × 3 + 3, because the cards sit on different turns.)', connection: 'The weights 4, 3, 2, 1 are the turns left, and tray 2 is a weighted sum of the cards.'},
    provenance: 'Week 89, Problem 12 (cards 1, 3, 0, 0: zeros last make 13 and zeros first 5), with a target between them.'},
  {number: 6, level: 'medium', title: 'The most', q: make(2, [2, 2, 1, 0, 0], 21), claim: {order: [2, 2, 1, 0, 0], most: true},
    idea: 'The biggest cards go first, where they count the most times.',
    hints: ['Which turn counts its card the most times?', 'Turn 1’s card counts 5 times, turn 2’s 4 times, down to turn 5’s once.', 'Play 2, 2, 1, 0, 0.'],
    parent: {notice: '21 is the most these cards can make, and only the biggest-first order makes it.', prompt: 'How do you know nothing beats 21?', explanation: 'Tray 2 ends with 5, 4, 3, 2 and 1 times the cards in turn order. If a smaller card comes just before a bigger one, swapping them gives the bigger card the turn that counts one more time and raises the total by their difference. So any order that is not biggest first can be beaten, and 2, 2, 1, 0, 0 makes the most: 10 + 8 + 3 = 21.', extension: 'What is the least these cards can make, and in which order? (9, from 0, 0, 1, 2, 2.)', connection: 'The rearrangement inequality: pairing the largest weights with the largest numbers gives the largest sum. The swap of two neighbours is a proof children can act out.'},
    provenance: 'Week 89, Problems 11 and 13 (cards 2, 2, 1, 0, 0: the largest is 21, and why it cannot be beaten).'},
  {number: 7, level: 'medium', title: 'Past the most', q: make(2, [2, 2, 1, 0, 0], 22), claim: {cant: 'most'},
    idea: 'Biggest first makes the most, so a bigger target needs no search: the sorted lane, played, is the proof.',
    hints: ['What is the most these cards can make?', 'Biggest first makes the most, and it makes 21.', 'Play 2, 2, 1, 0, 0. Can any order beat it?'],
    parent: {notice: 'Can’t is accepted only with the biggest-first lane down: that lane is the reason.', prompt: 'Why is one lane enough to show that 22 is impossible?', explanation: 'Every order makes at most 21: an order with a smaller card just before a bigger one can be raised by swapping them, and the only order with no such pair is 2, 2, 1, 0, 0, which makes 21. The app accepts Can’t when the lane makes the most and the target is more, or makes the least and the target is less. Any other lane is refused, because it doesn’t rule the target out.', extension: 'Which totals from 9 to 21 can these cards make? (All of them, in 30 orders, so with these cards an exact target can be found by trying.)', connection: 'A certificate: an extreme example together with a reason it is extreme. Here the reason is the swap argument, and the example is played.'},
    provenance: 'Week 89, the review card’s App fit: Can’t past the maximum, certified by the sorted order.'},
  {number: 8, level: 'medium', title: 'Hidden start', q: every([4, 7, 7, 12], 8), claim: {starts: [0, 1, 2, 3, 4]},
    idea: 'Cards run from 0 to 5, so the first card, 4 minus the start, decides which starts work.',
    hints: ['Choose a start and find the cards. Then try another start.', 'Only the first card depends on the start: it is 4 minus the start. The other cards are 3, 0 and 5 every time.', 'Starts 0, 1, 2, 3 and 4 all work.'],
    parent: {notice: 'Starts 5 to 8 fail: the first card would have to take counters away.', prompt: 'How do you know you have found every start?', explanation: 'Turns 2 to 4 need cards 3, 0 and 5 whatever the start (7 − 4, 7 − 7 and 12 − 7). Turn 1’s card is 4 minus the start. Cards run from 0 to 5, so the start can be 0, 1, 2, 3 or 4 (cards 4, 3, 2, 1, 0), and a start of 5 or more would need a card below 0. That makes five starts.', extension: 'If cards went up to 9, would more starts work? (No: a start above 4 still needs a card below 0.)', connection: 'Differences forget the start: totals with the same changes differ by a constant. Here the limits on the cards decide which constants are possible.'},
    provenance: 'Week 89, Problem 9 (totals 4, 7, 7, 12 with inputs 0 to 5: exactly five starts).'},
  {number: 9, level: 'hard', title: 'Gaps', q: make(2, [4, 1, 0, 0, 0], 14), claim: {order: [0, 0, 4, 1, 0], gaps: [10, 15, 20]},
    idea: 'With one 4 and one 1 the total is 4 × the 4’s weight + the 1’s weight, and some totals between the least and the most can’t be made.',
    hints: ['Try the 4 on different turns. How much does it add each time?', 'The 4 counts 5, 4, 3, 2 or 1 times, so it adds 20, 16, 12, 8 or 4. The 1 adds its own turn’s weight, which must be a different one.', 'Play 0, 0, 4, 1, 0.'],
    parent: {notice: 'Only one order makes 14. The totals 10, 15 and 20 can’t be made at all, though they lie between the least, 6, and the most, 24.', prompt: 'Why can’t these cards make 15?', explanation: 'The 4 sits on a turn that counts a times and the 1 on a different turn that counts b times, with a and b from 5, 4, 3, 2 and 1. The total is 4a + b. 14 = 4 × 3 + 2: the 4 on turn 3 and the 1 on turn 4. 15 would need 4 × 3 + 3, both cards on turn 3, and 10 and 20 would need a = b too. Sorting finds the two ends, but not every total between them.', extension: 'Which totals from 6 to 24 can these cards make? (All but 10, 15 and 20.)', connection: 'A weighted sum of a fixed set of cards can skip values; which values a set of weights can make is a small subset-sum question.'},
    provenance: 'Week 89, the review card’s App fit (the deck 4, 1, 0, 0, 0 misses 10, 15 and 20).'},
  {number: 10, level: 'hard', title: 'Three trays', q: make(3, [2, 2, 1, 0, 0], 41), claim: {order: [1, 2, 0, 2, 0], count: 25},
    idea: 'With three trays the cards count 15, 10, 6, 3 and 1 times, and most totals between 14 and 56 can’t be made.',
    hints: ['Watch how much tray 3 changes when you swap two cards.', 'Turn 1’s card counts 15 times, turn 2’s 10, turn 3’s 6, turn 4’s 3 and turn 5’s once. 41 is odd, so the 1 card needs a turn with an odd count: 15, 3 or 1.', 'Play 1, 2, 0, 2, 0.'],
    parent: {notice: 'Only one order makes 41, and only 25 of the totals from 14 to 56 can be made at all.', prompt: 'How can you find the order without trying all 30?', explanation: 'Tray 3 ends with 15, 10, 6, 3 and 1 times the cards in turn order. The two 2s add twice their weights, an even number, so the 1 must sit on an odd weight: 15, 3 or 1. With the 1 on turn 1 (15), the 2s need weights adding to 13, which is 10 + 3: so 1, 2, 0, 2, 0. With the 1 on turn 4 or turn 5, the 2s would need weights adding to 19 or 20, and no two of the others do.', extension: 'What is the most these cards can make with three trays, and the least? (56 biggest first, 14 smallest first.)', connection: 'The weights are the triangle numbers 15, 10, 6, 3, 1 read backwards: each new tray makes the weights the running totals of the last tray’s weights (1, 2, 3, 4, 5 → 1, 3, 6, 10, 15).'},
    provenance: 'Week 89, Problem 18 (a third tray) and the review card’s App fit (three trays with 2, 2, 1, 0, 0 make only 25 of the values 14 to 56).'},
  {number: 11, level: 'hard', title: 'Below the least', q: make(3, [2, 2, 1, 0, 0], 13), claim: {cant: 'least'},
    idea: 'Smallest first makes the least, so a smaller target is ruled out by one sorted lane.',
    hints: ['What is the least these cards can make?', 'Smallest first makes the least: the turns that count the most times get the 0s.', 'Play 0, 0, 1, 2, 2. Can any order make less?'],
    parent: {notice: 'The least is 14, from 0, 0, 1, 2, 2, and Can’t needs that lane down.', prompt: 'Why can’t any order make less than 14?', explanation: 'Swapping a bigger card that comes just before a smaller one lowers the total by their difference times the drop in weight, so any order that is not smallest first can be lowered. The only order left is 0, 0, 1, 2, 2, which makes 6 + 6 + 2 = 14. 13 is less, so no order makes it.', extension: 'Does the same argument work for any cards and any number of trays? (Yes, with two or more trays, where the weights fall strictly. With one tray every order ties.)', connection: 'The rearrangement inequality for the smallest sum: weights and cards sorted opposite ways give the least.'},
    provenance: 'Week 89, Problems 13 and 18: the smallest total, with three trays.'},
  {number: 12, level: 'hard', title: 'Twice back', q: match(2, [2, 5, 8, 14]), claim: {inputs: [2, 1, 0, 3]},
    idea: 'Tray 2’s changes are tray 1’s totals, and tray 1’s changes are the cards: take differences twice.',
    hints: ['How much does tray 2 go up each turn? That is tray 1’s new total.', 'Tray 2 goes up 2, 3, 3 and 6, so tray 1 reads 2, 3, 3, 6. Now find the cards that make tray 1.', 'Play 2, 1, 0, 3.'],
    parent: {notice: 'A turn where tray 1 stays the same (a 0 card) still raises tray 2.', prompt: 'How do you undo two trays?', explanation: 'Tray 2 gains tray 1’s new total each turn, so tray 1 after each turn is tray 2’s change: 2 − 0, 5 − 2, 8 − 5 and 14 − 8 give 2, 3, 3, 6. Tray 1 gains the card, so the cards are tray 1’s changes: 2, 1, 0, 3. Taking differences twice undoes two running totals, and only these cards work.', extension: 'Find the cards for tray 2 totals 1, 3, 6, 10. (1, 1, 1, 1: the triangle numbers come from all ones.)', connection: 'Second differences undo a double sum. A constant second difference gives a quadratic, as the triangle numbers do.'},
    provenance: 'Week 89, Problems 8 and 10 (differences undo totals, and the start must be known), carried to two trays.'}
];

const PLAYGROUND = {
  id: 'totals-playground', number: 0, title: 'Running totals playground', band: 'playground', difficulty_level: 'playground', mechanic: 'totals', familyTitle: 'Running totals', revision: 1,
  parameters: {mode: 'playground', supply: SUPPLY},
  objective: 'Play cards and watch the trays.', visibleObjective: '', instruction: 'Play cards and watch the trays.',
  controls: `Choose 1, 2 or 3 trays with the tray buttons. ${PLAY} ${GRID} Undo takes back a card.`,
  rules: ['Each turn uses one card: add it to tray 1, then add tray 1’s new total to tray 2, and tray 2’s new total to tray 3.', 'Cards come from an endless supply, 0 to 5, and every tray starts at 0.'],
  idea: 'Free play with one, two and three trays.',
  prerequisites: 'Adding. None for watching the trays fill.',
  hints: ['Play six 1s with three trays. What does each tray show?', 'Play the same cards in two orders and compare the last tray.', 'Try a 0 card first, and then last.'],
  parent: {notice: 'With all 1s the three trays show 1 to 6, the triangle numbers 1, 3, 6, 10, 15, 21, and the corner-pile numbers 1, 4, 10, 20, 35, 56.', prompt: 'Which tray changes most when you move a card one turn earlier?', explanation: 'The playground has no goal and never counts as solved. With a 1 every turn, the three trays hold n, n(n + 1)/2 and n(n + 1)(n + 2)/6 after n turns (Problem 18): 6, 21 and 56 after six turns. Moving a card one turn earlier raises every tray after the first.', extension: 'Predict tray 3 after six turns of 2s, then play it. (112, twice 56.)', connection: 'Running totals of a constant, taken again and again, give the counting numbers, the triangle numbers and the tetrahedral numbers.', sourceIds: SOURCES},
  provenance: 'Week 89, Problem 18 (three trays with input 1 for six turns).',
  sourceDocument: 'docs/totals/README.md'
};

// --- Checks and witnesses ----------------------------------------------------
const out = PUZZLES.map(item => {
  const q = {...item.q}, c = item.claim;
  assert.equal(q.trays, q.mode === 'every' ? 1 : q.start.length, `${item.title}: trays`);
  if (q.mode === 'make') {
    const ways = reach(q).get(q.target), {most, least} = extremes(q);
    if (c.order) {
      assert.deepEqual(ways, [c.order], `${item.title}: ${c.order} is the only order that makes ${q.target}`);
      if (c.most) assert.equal(most, q.target, `${item.title}: the target is the most`);
      q.witness = {lane: c.order};
    } else {
      assert.equal(ways, undefined, `${item.title}: no order makes ${q.target}`);
      const lane = c.cant === 'most' ? sortedDown(q.cards) : c.cant === 'least' ? sortedUp(q.cards) : q.cards;
      if (c.cant === 'same') assert.equal(most, least, `${item.title}: every order ties`);
      if (c.cant === 'most') assert.ok(q.target > most && most > least, `${item.title}: past the most`);
      if (c.cant === 'least') assert.ok(q.target < least && most > least, `${item.title}: below the least`);
      q.witness = {lane, cant: c.cant};
    }
    if (c.gaps) assert.deepEqual(Array.from({length: most - least + 1}, (_, i) => least + i).filter(t => !reach(q).has(t)), c.gaps, `${item.title}: the gaps`);
    if (c.count) assert.equal(reach(q).size, c.count, `${item.title}: ${c.count} totals`);
    if (c.distinct) assert.equal(reach(q).size, orders(q.cards).length, `${item.title}: every order makes a different total`);
  }
  if (q.mode === 'match') {
    assert.deepEqual(inputsFor(q.start, q.goal), c.inputs, `${item.title}: the cards`);
    assert.ok(c.inputs.every(u => q.supply.includes(u)));
    q.witness = {lane: c.inputs};
  }
  if (q.mode === 'every') {
    assert.deepEqual(startsFor(q), c.starts, `${item.title}: the starts`);
    q.witness = {starts: c.starts.map(s => ({start: s, lane: inputsFor([s], q.goal)}))};
  }
  const id = `totals-${String(item.number).padStart(2, '0')}`, objective = OBJECTIVES[q.mode](q);
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'totals', familyTitle: 'Running totals', revision: item.revision ?? 1,
    parameters: q,
    objective, visibleObjective: VISIBLE[q.mode](q), instruction: objective,
    controls: CONTROLS[q.mode], rules: [...TURN[q.trays], GOAL[q.mode]],
    idea: item.idea, prerequisites: PREREQUISITES[`${q.mode}-${q.trays}`], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    provenance: item.provenance,
    sourceDocument: 'docs/totals/README.md'
  };
});
// The worksheet's numbers behind the copy.
assert.deepEqual(weights(5, 2), [5, 4, 3, 2, 1]);
assert.deepEqual(weights(5, 3), [15, 10, 6, 3, 1]);
assert.equal(finalOf([0, 0], [1, 3, 0, 0]), 13, 'zeros last make 13');
assert.equal(finalOf([0, 0], [0, 0, 1, 3]), 5, 'zeros first make 5');
assert.deepEqual([1, 2, 3].map(k => finalOf(zeros(k), Array(6).fill(1))), [6, 21, 56], 'Problem 18 after six turns');
assert.equal(orders([2, 2, 1, 0, 0]).length, 30);

const pack = {
  title: 'Running totals',
  version: 1,
  families: [{id: 'totals', title: 'Running totals', mathematics: 'Cards go into a lane, one a turn. Each turn adds the card to tray 1, then tray 1’s new total to tray 2, and tray 2’s new total to tray 3. The last of k trays after N turns holds what its starts give plus the cards weighted C(N − i + k − 1, k − 1): 5, 4, 3, 2, 1 for two trays and five turns, 15, 10, 6, 3, 1 for three. With one tray every order ties. With two or more the weights fall strictly, so swapping a smaller card ahead of a bigger one raises the total: biggest first is the only order that makes the most, smallest first the only order that makes the least, and that sorted lane certifies Can’t past either end. Between the ends some totals may be missing. Going back, differences undo totals, but only once the start is known, and limits on the cards decide which starts are possible.', rules: [...TURN[2], GOAL.make], sourceIds: SOURCES}],
  sources: [
    {id: 'totals-week89', title: 'Bellingham Math Circle — Week 89: Growing shapes and totals (worksheets, materials and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-89', kind: 'worksheet'},
    {id: 'totals-card89', title: 'Bellingham Math Circle — Week 89 review card (Growing shapes and totals), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-89.md', kind: 'worksheet'},
    {id: 'totals-alper', title: 'Ted Alper — Computer Programming in the 18th Century (OK, really, finite differences), Berkeley Math Circle, December 4, 2012', url: 'https://mathcircle.berkeley.edu/sites/default/files/archivedocs/2012_2013/lectures/1213lecturespdf/BMC_Int_Dec4_2012_ComputerProgramming18thCentury.pdf', kind: 'exposition'},
    {id: 'totals-gkp', title: 'Ronald L. Graham, Donald E. Knuth and Oren Patashnik — Concrete Mathematics, 2nd ed., §2.6 (finite and infinite calculus) and §5.1 (binomial coefficients)', url: 'https://www-cs-faculty.stanford.edu/~knuth/gkp.html', kind: 'undergraduate'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
await writeFile(new URL('../dist/families/totals/totals.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${p.parameters.trays}× ${p.parameters.target ?? p.parameters.goal.join(',')} → ${JSON.stringify(p.parameters.witness)}`).join('\n'));
