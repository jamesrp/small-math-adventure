// Authoring list for Square leftovers (worksheet Week 97, Square remainders).
// Computes every bin's cards, every find answer and every working choice of
// bundle sizes with the mechanic's own methods, checks them against the table
// in docs/leftovers/README.md, records a solution witness for each puzzle
// (played through the move rules in the validator), and writes
// dist/families/leftovers/leftovers.json.
// Run: node scripts/build-leftovers.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {leftover, nextBundle, finished, answerOf, workingChoices, possible, matchOf} from '../dist/families/leftovers/leftovers.js';

const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const SIZES = range(2, 12);

// --- Copy --------------------------------------------------------------------
const SOURCES = ['leftovers-week97', 'leftovers-card97', 'leftovers-math97'];
const SQUARE = 'Card n is a square of n rows of n counters. Take away whole bundles until fewer than one bundle is left: the counters left over are its leftover.';
const RULES = {
  sort: [SQUARE, 'Put every card in the bin for its leftover, then press That’s all.'],
  find: [SQUARE, 'Put every card with the bin’s leftover in the bin, and no other card, then press That’s all.'],
  tell: [SQUARE, 'Choose bundle sizes so that no two cards leave the same, then press Try. A Try that fails shows two cards that still match.', 'Press Can’t if no choice can work.']
};
const BUNDLING = 'Tap a card to see its square. Slide across counters to choose a rectangle, or tap counters one at a time, then press Bundle; with nothing chosen, Bundle takes the next bundle.';
const CONTROLS = {
  sort: `${BUNDLING} Tap a bin to put the card in it, or drag the card onto a bin. Undo takes back a bundle or a card move.`,
  find: `${BUNDLING} Tap the bin to put the card in it, or drag the card onto the bin; tap a card in the bin and then the row to take it out. Undo takes back a bundle or a card move.`,
  tell: 'Tap bundle sizes to choose them, then press Try. The dots show the tries left; when they run out, Again starts over. Undo takes back a size; tries stay tried.'
};
const OBJECTIVES = {
  sort: q => `Put each card from ${q.sides[0]} to ${q.sides.at(-1)} in the bin for its leftover with bundles of ${q.size}.`,
  find: q => `Find every card that leaves ${q.bins[0]}.`,
  tell: q => q.k === 1 ? `Choose a bundle size that gives cards 0 to ${q.top} different leftovers.` : `Choose two bundle sizes that give cards 0 to ${q.top} different pairs of leftovers.`
};
const VISIBLE = {sort: () => '', find: OBJECTIVES.find, tell: OBJECTIVES.tell};
const PREREQUISITES = {
  sort: 'Count up to about 10 counters, and press Bundle until fewer than a bundle is left; the app does the taking away. No reading once a grown-up has read How to play. Saying why a bin stays empty is for older children with a grown-up.',
  find: 'Count small leftovers and keep looking after the first answer. Grades 2–3 and up, or younger children with a grown-up reading.',
  tell: 'Compare a few small numbers and learn from a failed try. Grades 3–5; knowing that cards adding to the size match (from the sorting puzzles) helps.'
};

// --- Puzzles -----------------------------------------------------------------
const sort = (size, sides) => ({mode: 'sort', size, sides, bins: range(0, size - 1)});
const find = (size, sides, bin) => ({mode: 'find', size, sides, bins: [bin]});
const tell = (top, k, budget) => ({mode: 'tell', top, k, sizes: SIZES, budget});
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Bundles of 4', q: sort(4, range(0, 3)),
    expect: {0: [0, 2], 1: [1, 3]},
    idea: 'With bundles of 4, squares of 0 to 3 leave only 0 or 1: bins 2 and 3 stay empty.',
    hints: ['Tap card 3 and press Bundle until fewer than 4 counters are left.', '3 by 3 is 9 counters: two bundles of 4 and 1 left over.', 'Cards 0 and 2 go in bin 0; cards 1 and 3 go in bin 1.'],
    parent: {notice: 'Bins 2 and 3 stay empty: no card leaves 2 or 3.', prompt: 'Could any square at all leave 2 with bundles of 4?', explanation: '0 × 0 = 0 and 2 × 2 = 4 leave 0; 1 × 1 = 1 and 3 × 3 = 9 = 4 + 4 + 1 leave 1. Bigger squares repeat these, because cutting 4-wide strips off a square leaves a smaller square with the same leftover. So squares leave only 0 or 1 with bundles of 4: an even side makes whole bundles, an odd one leaves 1.', extension: 'With bundles of 3 and cards 1 to 5, which bin stays empty? (Bin 2: puzzle 2.)', connection: 'The leftovers squares can leave are the quadratic residues. With 4 they are 0 and 1, which is why a sum of two squares never leaves 3 with bundles of 4.'},
    provenance: 'Week 97, page 1: the worked example (input 3, bundles of 4, 9 = 4 + 4 + 1) and its bundles-of-4 table for inputs 0 to 3.'},
  {number: 2, level: 'easy', title: 'Bundles of 3', q: sort(3, range(1, 5)),
    expect: {0: [3], 1: [1, 2, 4, 5]},
    idea: 'Bundles of 3 never leave 2: a side that is a multiple of 3 leaves 0, and every other side leaves 1.',
    hints: ['Bundle card 2 and card 4. How many counters are left each time?', '4 by 4 is 16 counters: five bundles of 3 and 1 left over.', 'Card 3 goes in bin 0; cards 1, 2, 4 and 5 go in bin 1.'],
    parent: {notice: 'No card reaches bin 2.', prompt: 'Can a square leave 2 with bundles of 3?', explanation: '1, 4, 16 and 25 leave 1, and 9 leaves 0. Cutting 3-wide strips off a square leaves the square of the side’s leftover, 0, 1 or 2, and 0, 1 and 4 leave 0, 1 and 1. So no square leaves 2 with bundles of 3. A 4 by 4 square shows the strips: a 4 by 3 strip is four whole bundles, then a 3 by 1 strip is one more, and the 1 by 1 corner is left.', extension: 'With bundles of 4 and cards 1 to 5, which bins stay empty? (2 and 3.)', connection: 'This is the K–1 route the review card added to Week 97: build squares 1 × 1 to 5 × 5, put each in groups of 3 and ask whether one can leave 2.'},
    provenance: 'Week 97 review card, fix 1: the K–1 route (squares 1 × 1 to 5 × 5 in groups of 3; “Can a square leave 2?”).'},
  {number: 3, level: 'easy', title: 'Bundles of 5', q: sort(5, range(0, 4)),
    expect: {0: [0], 1: [1, 4], 4: [2, 3]},
    idea: 'Cards 1 and 4 match, and so do 2 and 3: a card and 5 minus it always leave the same.',
    hints: ['Bundle card 4: 16 counters.', '16 is three bundles of 5 and 1 left over, the same as card 1.', 'Card 0 in bin 0, cards 1 and 4 in bin 1, cards 2 and 3 in bin 4.'],
    parent: {notice: 'Bins 2 and 3 stay empty, and the other cards pair up: 1 with 4, 2 with 3.', prompt: 'Why do 2 and 3 leave the same?', explanation: '4 leaves 4 and 9 = 5 + 4 leaves 4; 1 leaves 1 and 16 = 15 + 1 leaves 1. The 3 by 3 square is the 2 by 2 square with an L of 5 counters round it: one more bundle. From 1 by 1 to 4 by 4 the L has 15 counters and re-forms as a 3 by 5 rectangle, three bundles. The L between an x by x and a y by y square always re-forms as a (y − x) by (x + y) rectangle, so x and 5 − x match.', extension: 'With bundles of 7, which cards pair up? (1 with 6, 2 with 5, 3 with 4.)', connection: 'The quadratic residues mod 5 are 0, 1 and 4. (m − x)² = m² − 2mx + x², so x and m − x leave the same for every bundle size m.'},
    provenance: 'Week 97, Problem 1 (bundles of 5, inputs 0 to 4: which inputs share an output, and which outputs cannot occur).'},
  {number: 4, level: 'easy', title: 'Secret card', q: find(7, range(0, 6), 2),
    answer: [3, 4],
    idea: 'With bundles of 7, leftover 2 hides two cards, 3 and 4, which add to 7.',
    hints: ['Bundle a few cards and look for 2 counters left over.', '3 by 3 is 9 = 7 + 2.', 'Cards 3 and 4 both leave 2.'],
    parent: {notice: 'A child who finds card 3 and presses That’s all is told there is another.', prompt: 'If a friend says their square left 2, which cards could it be?', explanation: '9 = 7 + 2 and 16 = 14 + 2. The other squares leave 0 (card 0 only), 1 (cards 1 and 6: 36 = 35 + 1) and 4 (cards 2 and 5: 25 = 21 + 4). With bundles of 7 every leftover but 0 hides exactly two cards, x and 7 − x.', extension: 'Play the worksheet’s secret game: one player chooses a card and says only its leftover with bundles of 7, and the other names every card it could be.', connection: 'Week 97 Problem 2: with a prime bundle size each nonzero leftover hides exactly two inputs.'},
    provenance: 'Week 97, Problem 2 (a secret input with bundles of 7), for leftover 2.'},
  {number: 5, level: 'medium', title: 'Bundles of 7', q: sort(7, range(0, 6)),
    expect: {0: [0], 1: [1, 6], 2: [3, 4], 4: [2, 5]},
    idea: 'With 7, every leftover except 0 holds two cards that add to 7, and three bins stay empty.',
    hints: ['Card 0 has no counters at all.', 'Cards 1 and 6 both leave 1: 36 = 35 + 1.', 'Bin 0: card 0. Bin 1: 1 and 6. Bin 2: 3 and 4. Bin 4: 2 and 5.'],
    parent: {notice: 'Bins 3, 5 and 6 stay empty; bins 1, 2 and 4 hold two cards each, and bin 0 holds card 0 alone.', prompt: 'How many different leftovers are there, counting 0?', explanation: '0 leaves 0; 1 and 36 leave 1; 4 and 25 leave 4; 9 and 16 leave 2. That is four leftovers, 0, 1, 2 and 4, which is (7 + 1)/2. Because 7 is prime the pairs x and 7 − x are the only matches (puzzle 10 says why).', extension: 'With bundles of 11, how many leftovers? (Six: puzzle 10.)', connection: 'The quadratic residues mod 7 are 0, 1, 2 and 4.'},
    provenance: 'Week 97, Problem 3 (bundles of 7) and Problem 2’s inventory.'},
  {number: 6, level: 'medium', title: 'Bundles of 8', q: sort(8, range(0, 7)),
    expect: {0: [0, 4], 1: [1, 3, 5, 7], 4: [2, 6]},
    idea: '8 is not prime, and four cards share leftover 1: 1, 3, 5 and 7.',
    hints: ['Bundle card 3: 9 counters.', 'Every odd card leaves 1.', 'Bin 0: 0 and 4. Bin 1: 1, 3, 5 and 7. Bin 4: 2 and 6.'],
    parent: {notice: 'Bin 1 holds four cards, more than any bin with 7.', prompt: 'Why does 3 match 1 here, when 3 and 1 don’t add to 8?', explanation: 'Every odd square leaves 1 with bundles of 8: 9 = 8 + 1, 25 = 24 + 1, 49 = 48 + 1. Even squares leave 0 (0 and 16) or 4 (4 and 36). So three leftovers occur: 0, 1 and 4. The pairs x and 8 − x still match (1 with 7, 3 with 5, 2 with 6), but now 1 matches 3 as well: the L between 1 by 1 and 3 by 3 re-forms as a 2 by 4 rectangle, one whole bundle, because 8 = 2 × 4.', extension: 'With bundles of 9, which bin holds the most cards? (Bin 0: 0, 3 and 6.)', connection: 'With a composite bundle size, (y − x)(y + x) can be whole bundles without either side being one.'},
    provenance: 'Week 97, Problem 3 (bundles of 8: output 1 hides four inputs).'},
  {number: 7, level: 'medium', title: 'Bundles of 9', q: sort(9, range(0, 8)),
    expect: {0: [0, 3, 6], 1: [1, 8], 4: [2, 7], 7: [4, 5]},
    idea: 'With 9, leftover 0 holds three cards, 0, 3 and 6; with a prime only card 0 makes whole bundles.',
    hints: ['Bundle card 6: 36 counters.', '36 is exactly four bundles of 9.', 'Bin 0: 0, 3 and 6. Bin 1: 1 and 8. Bin 4: 2 and 7. Bin 7: 4 and 5.'],
    parent: {notice: 'Bin 0 holds 0, 3 and 6.', prompt: 'Why does 6 by 6 come out in whole bundles of 9?', explanation: 'A 6 by 6 square cuts into four 3 by 3 squares, four bundles; 3 by 3 is one bundle. So 0, 3 and 6 leave 0; 1 and 8 leave 1; 2 and 7 leave 4; 4 and 5 leave 7. Four leftovers occur: 0, 1, 4 and 7.', extension: 'With bundles of 15, find every card that leaves 1. (Puzzle 9.)', connection: 'When the bundle size is a square, 9 = 3 × 3, every multiple of 3 squares to whole bundles.'},
    provenance: 'Week 97, Problem 3 (bundles of 9: output 0 hides three inputs).'},
  {number: 8, level: 'medium', title: 'One size', q: tell(5, 1, 3),
    expect: [[10], [11]],
    idea: 'A size makes a card and the size minus it match, so it must be at least 10, and 12 makes 2 and 4 match: 10 and 11 work.',
    hints: ['Try a size and look at the two cards that match.', 'Size 7 makes 3 and 4 match: cards that add to the size always match.', 'Try a size bigger than 9.'],
    parent: {notice: 'A failed Try shows two cards that add up to the size, except with 12, which shows 2 and 4.', prompt: 'Which sizes can you rule out without trying them?', explanation: 'Any size m makes x and m − x match. Up to 9 two different cards from 0 to 5 add to m (0 and m up to 5, then 1 and 5, 2 and 5, 3 and 5, 4 and 5), so they match. 12 makes 2 and 4 match (16 = 12 + 4). 10 leaves 0, 1, 4, 9, 6, 5 and 11 leaves 0, 1, 4, 9, 5, 3: all different.', extension: 'Add card 6. Does any size from 2 to 12 still work? (No: puzzle 11.)', connection: 'Because x and m − x match, one size m can tell apart at most the cards 0 to m/2, about half as many cards as the size.'},
    provenance: 'New, after the review card’s App fit (“choose bundle sizes from 2 to 12 whose leftovers tell sides apart”), with cards 0 to 5 so that one size works.'},
  {number: 9, level: 'hard', title: 'Bundles of 15', q: find(15, range(0, 14), 1),
    answer: [1, 4, 11, 14],
    idea: 'Four cards leave 1 with bundles of 15: 1, 4, 11 and 14. Because 15 = 3 × 5, card 4 matches card 1.',
    hints: ['Card 1 leaves 1. Which card is 15 minus 1?', '4 by 4 is 16 = 15 + 1.', 'Cards 1, 4, 11 and 14 leave 1.'],
    parent: {notice: 'A child who expects pairs may stop at 1 and 14; That’s all then says there is another.', prompt: 'Could another leftover hide even more cards?', explanation: '1 = 1, 16 = 15 + 1, 121 = 120 + 1 and 196 = 195 + 1. Card 4 matches card 1 because the L between 1 by 1 and 4 by 4 re-forms as a 3 by 5 rectangle, one whole bundle; 11 and 14 are 15 − 4 and 15 − 1. Leftover 4 also hides four cards (2, 7, 8 and 13), while leftover 0 hides only card 0, as at a prime.', extension: 'Which leftovers occur with 15? (0, 1, 4, 6, 9 and 10: six.)', connection: '15 = 3 × 5: a square leaves 1 exactly when its side leaves 1 or 2 with 3 and 1 or 4 with 5, giving 2 × 2 = 4 cards (the Chinese remainder theorem).'},
    provenance: 'Week 97, Problem 4 (output 1 with bundles of 15, inputs 0 to 14).'},
  {number: 10, level: 'hard', title: 'Bundles of 11', q: sort(11, range(0, 10)),
    expect: {0: [0], 1: [1, 10], 3: [5, 6], 4: [2, 9], 5: [4, 7], 9: [3, 8]},
    idea: 'Six leftovers, (11 + 1)/2: card 0 alone, and pairs that add to 11.',
    hints: ['Cards that add to 11 land in the same bin.', '5 by 5 is 25 = 22 + 3, so cards 5 and 6 go in bin 3.', 'Bin 0: 0. Bin 1: 1 and 10. Bin 3: 5 and 6. Bin 4: 2 and 9. Bin 5: 4 and 7. Bin 9: 3 and 8.'],
    parent: {notice: 'Five bins stay empty, and the six others hold card 0 alone or two cards that add to 11.', prompt: 'With 3, 5, 7 and 11, how many leftovers are there each time? Is there a rule?', explanation: '3 gives 2 leftovers, 5 gives 3, 7 gives 4 and 11 gives 6: (p + 1)/2, counting 0. Two cards x < y match exactly when the L between their squares, a (y − x) by (x + y) rectangle, is whole bundles. 11 is prime, so a rectangle is whole bundles of 11 only when a side is a multiple of 11; here y − x is less than 11, so x + y = 11. Card 0 matches nothing, and the other ten cards pair up into five leftovers.', extension: 'Does the rule work for 8, 9 or 15? (No: they give 3, 4 and 6 leftovers.)', connection: 'Euclid’s lemma (Week 96): a prime that divides a product divides one of its factors. There are (p − 1)/2 nonzero quadratic residues mod an odd prime p.'},
    provenance: 'Week 97, Problem 6 (a rule for odd primes: bundle sizes 3, 5, 7 and 11), with the review card’s counters picture for the pairing (fix 2: the L re-formed as a rectangle).'},
  {number: 11, level: 'hard', title: 'One more card', q: tell(6, 1, 3),
    expect: [],
    idea: 'No size from 2 to 12 gives cards 0 to 6 different leftovers: 11 makes 5 and 6 match and 12 makes 2 and 4 match.',
    hints: ['Size 11 worked for cards 0 to 5. Try it here.', 'Cards that add to the size match, so the size would have to be 12 or more.', 'Size 12 makes 2 and 4 match, so every size has a match.'],
    parent: {notice: 'After a right Can’t, every size shows two cards it makes match.', prompt: 'How do you know no size works, without trying all eleven?', explanation: 'A size m makes x and m − x match. For every m up to 11, two different cards from 0 to 6 add to m (0 and m up to 6, then 1 and 6, 2 and 6, 3 and 6, 4 and 6, 5 and 6), and 12 makes 2 and 4 match (16 = 12 + 4). So no size from 2 to 12 tells cards 0 to 6 apart. Can’t needs one try first, and it is refused while a size works.', extension: 'What is the smallest size that tells cards 0 to 6 apart? (13.)', connection: 'The review card notes that one size never tells cards 0 to 15 apart; this puzzle shows the same obstruction with seven cards.'},
    provenance: 'New, as a contrast with puzzle 8: one more card makes every size fail, the review card’s “one size never works” at a smaller scale.'},
  {number: 12, level: 'hard', title: 'Two sizes', q: tell(15, 2, 4),
    expect: [[10, 11]],
    idea: 'Of the 55 pairs of sizes from 2 to 12, only 10 and 11 give cards 0 to 15 different pairs of leftovers.',
    hints: ['Which sizes worked for cards 0 to 5?', 'Each size makes x and size − x match, so the other size has to tell those two apart.', 'Try 10 and 11.'],
    parent: {notice: 'Each failed Try shows two cards that both sizes still match.', prompt: 'Why can’t one size do it?', explanation: 'One size m makes x and m − x match, and for m up to 12 two different cards from 0 to 15 add to m, so one size never works. With 10 and 11, two cards x < y match under 11 only when x + y is 11 or 22 or y − x is 11, since 11 is prime. If x + y = 11 or y − x = 11, then x + y and y − x are odd, so the rectangle (y − x) by (x + y) has an odd number of counters and is not whole bundles of 10. If x + y = 22, whole bundles of 10 need y − x to be a multiple of 5 and even, so 10, and then y = 16, past 15. Checking all 55 pairs shows that no other pair works.', extension: 'Add card 16. Do 10 and 11 still work? (No: 6 and 16 match under both, 36 and 256.)', connection: 'Two sizes give each card a two-part code. By the Chinese remainder theorem, leftovers with 10 and 11 together are leftovers with 110, and 16 is the first card that matches an earlier one (6: 256 − 36 = 220 = 2 × 110).'},
    provenance: 'The review card’s App fit (“choose bundle sizes from 2 to 12 whose leftovers tell sides 0 to 15 apart … of the 55 pairs only 10 and 11 work”, card_checks.py), with a budget of four tries.'}
];

// The playground: one square, any side and bundle size.
const PLAYGROUND = {
  id: 'leftovers-playground', number: 0, title: 'Square leftovers playground', band: 'playground', difficulty_level: 'playground', mechanic: 'leftovers', familyTitle: 'Square leftovers', revision: 1,
  parameters: {mode: 'playground', maxSide: 15, sizes: range(2, 15), start: {side: 3, size: 4}},
  objective: 'Build a square, bundle it and see what is left over.', visibleObjective: '', instruction: 'Build a square, bundle it and see what is left over.',
  controls: '+ and − change the square’s side and the bundle size. Slide across counters to choose a rectangle, or tap counters one at a time, then press Bundle; with nothing chosen, Bundle takes the next bundle. Clear takes the bundles apart.',
  rules: ['Card n is a square of n rows of n counters.', 'A bundle takes away whole bundles of the chosen size.'],
  idea: 'Free play with squares and bundles, sides 0 to 15 and bundle sizes 2 to 15.',
  prerequisites: 'None. A grown-up can set up a square from the worksheet or the puzzles.',
  hints: ['Try a 7 by 7 square with bundles of 7.', 'Make a 10 by 10 square with bundles of 7: choose a 10 by 7 strip and press Bundle.', 'Compare 3 by 3 and 10 by 10 with bundles of 7.'],
  parent: {notice: 'Choosing a strip as wide as a bundle takes away a whole row of bundles at once.', prompt: 'Can a square bigger than 6 by 6 leave something new with bundles of 7?', explanation: 'The playground has no goal and never counts as solved. It holds the worksheet’s Problem 5: with bundles of 7, a 10 by 10 square loses a 10 by 7 strip (ten bundles) and then a 3 by 7 strip (three bundles), leaving the 3 by 3 corner, so 10 leaves what 3 leaves. Every side leaves what its leftover with 7 leaves, so sides 0 to 6 show every leftover.', extension: 'Which bundle sizes from 2 to 15 leave nothing over from a 10 by 10 square? (2, 4, 5 and 10, the factors of 100 up to 15.)', connection: 'n² mod m depends only on n mod m: the square of (n − m) and the square of n differ by whole strips of m.', sourceIds: SOURCES},
  provenance: 'Week 97 materials (counters in squares and bundles) and Problem 5 (“Can a bigger input give a new output?”), the strips of the guide’s 100 = 70 + 21 + 9 diagram.',
  sourceDocument: 'docs/leftovers/README.md'
};

// --- Checks and witnesses ----------------------------------------------------
// A sort or find witness: for each card that goes in a bin, take the next
// bundle until fewer than one is left, then put it in its bin; then That's all.
function witnessOf(q) {
  const steps = [], bundles = [];
  for (const n of q.sides) {
    const bin = leftover(n, q.size);
    if (q.mode === 'find' && bin !== q.bins[0]) continue;
    while (!finished(bundles, n, q.size)) { const cells = nextBundle(bundles, n, q.size); bundles.push([n, cells]); steps.push({type: 'bundle', side: n, cells}); }
    steps.push({type: 'place', side: n, bin});
  }
  return [...steps, {type: 'claim'}];
}
const out = PUZZLES.map(item => {
  const q = {...item.q};
  if (q.mode === 'sort') {
    const groups = {};
    for (const n of q.sides) (groups[leftover(n, q.size)] ??= []).push(n);
    assert.deepEqual(groups, Object.fromEntries(Object.entries(item.expect).map(([k, v]) => [k, v])), `${item.title}: the bins`);
    q.witness = witnessOf(q);
  }
  if (q.mode === 'find') {
    assert.deepEqual(answerOf(q), item.answer, `${item.title}: the cards that leave ${q.bins[0]}`);
    q.witness = witnessOf(q);
  }
  if (q.mode === 'tell') {
    assert.deepEqual(workingChoices(q), item.expect, `${item.title}: the working choices`);
    // A Can't instance needs one try first: the witness tries the largest size.
    q.witness = possible(q) ? {tries: [item.expect[0]]} : {tries: [SIZES.slice(-q.k)], cant: true};
    if (!possible(q)) assert.ok(matchOf(q.top, q.witness.tries[0]), `${item.title}: the witness try fails`);
  }
  const id = `leftovers-${String(item.number).padStart(2, '0')}`, objective = OBJECTIVES[q.mode](q);
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'leftovers', familyTitle: 'Square leftovers', revision: 1,
    parameters: q,
    objective, visibleObjective: VISIBLE[q.mode](q), instruction: objective,
    controls: CONTROLS[q.mode], rules: RULES[q.mode],
    idea: item.idea, prerequisites: PREREQUISITES[q.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    provenance: item.provenance,
    sourceDocument: 'docs/leftovers/README.md'
  };
});

const pack = {
  title: 'Square leftovers',
  version: 1,
  families: [{id: 'leftovers', title: 'Square leftovers', mathematics: 'A card n stands for an n by n square of counters. Taking away whole bundles of m until fewer than m are left leaves n² mod m. The leftover depends only on n mod m, because m-wide strips cut off the square are whole bundles; and x and m − x always leave the same. Two cards x < y match exactly when the L between their squares, re-formed as a (y − x) by (x + y) rectangle, is whole bundles. For an odd prime p that happens only when x + y = p (Euclid’s lemma), so p gives (p + 1)/2 leftovers counting 0 and every nonzero one hides two cards. Composite sizes break the pairing: with 8, cards 1, 3, 5 and 7 all leave 1; with 9, cards 0, 3 and 6 leave 0; with 15, cards 1, 4, 11 and 14 leave 1. One size from 2 to 12 never tells cards 0 to 15 apart, and of the 55 pairs of sizes only 10 and 11 do.', rules: RULES.sort, sourceIds: SOURCES}],
  sources: [
    {id: 'leftovers-week97', title: 'Bellingham Math Circle — Week 97: Square remainders (worksheet and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-97', kind: 'worksheet'},
    {id: 'leftovers-card97', title: 'Bellingham Math Circle — Week 97 review card (Square remainders), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-97.md', kind: 'worksheet'},
    {id: 'leftovers-math97', title: 'Bellingham Math Circle — Week 97 math check (inventories, proofs and the 55 pairs of sizes)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-97-math.md', kind: 'worksheet'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
await writeFile(new URL('../dist/families/leftovers/leftovers.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.size ?? ''}${p.parameters.mode === 'tell' ? `top ${p.parameters.top}, ${p.parameters.k} size(s): ${JSON.stringify(workingChoices(p.parameters))}` : ` sides ${p.parameters.sides[0]}–${p.parameters.sides.at(-1)}${p.parameters.mode === 'find' ? ` leftover ${p.parameters.bins[0]}: ${answerOf(p.parameters)}` : ''}`}`).join('\n'));
