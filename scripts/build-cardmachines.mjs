// Authoring list for Card machines (worksheet Week 17, machine memory).
// Computes each puzzle's answers with the mechanic (the rule's smallest
// machine, the shortest ending that splits each pair or Can't, and rows that
// can be split two at a time), checks them against the table in
// docs/cardmachines/README.md, and writes dist/families/cardmachines/cardmachines.json.
// Run: node scripts/build-cardmachines.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ruleMachine, renamings, fewest, splitter, separable, pairsOf, ruleState, CARDS} from '../dist/families/cardmachines/cardmachines.js';

const SOURCES = ['cm-week17', 'cm-card17', 'cm-trevisan'];
const sources = [
  {id: 'cm-week17', title: 'Bellingham Math Circle — Week 17: Machine memory (student packets K–1, grades 2–3 and 4–5, adult guide, and the return visit with its guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-17', kind: 'local curriculum'},
  {id: 'cm-card17', title: 'Week 17 review card and math check (App fit and Decision; fix 1, one shared ending per pair; fix 4, “next to each other”)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-17.md', kind: 'local curriculum'},
  {id: 'cm-trevisan', title: 'Luca Trevisan — Notes on the Myhill–Nerode Theorem, Stanford CS103, Lecture 15 (May 12, 2014), section 1, Lemmas 2 and 4: states reached by distinguishable strings differ, so k pairwise distinguishable strings need k states', url: 'https://theory.stanford.edu/~trevisan/cs103-14/lecture15.pdf', kind: 'research'}
];

const MACHINE_RULES = [
  'A machine is circles joined by arrows. Each circle has one R arrow and one B arrow, and says ✓ or ×.',
  'The marker starts on circle 1, at the small arrow. Each card of a row moves it along that card’s arrow from the circle it is on, even an arrow that loops back. The circle where it stops gives the answer; with no cards, circle 1 answers.'
];
const TEST_RULE = 'Test checks the machine against the rule on every row there is and shows one of the shortest rows it gets wrong. Each machine is tested once; change it to test again.';
const SHARED_RULES = [
  'A shared ending is the same cards, in the same order, after both rows of a pair. No cards is an ending too.',
  'Two rows that leave the marker on the same circle get the same answer after any shared ending: each next card takes both along the same arrow.'
];
const BUILD_CONTROLS = 'Drag the R or B on an arrow onto a circle to point the arrow there, or tap it and then tap the circle. Tap a circle to switch it between ✓ and ×. Press Test when every arrow is placed; tap a row Test showed to see where it ends.';
const SPLIT_CONTROLS = 'Tap the ending of a pair, then add cards with R and B; ⌫ takes the last one back. The same cards go after both rows, and both answers show. Can’t says no ending can give one ✓ and one ×. Keys R, B and Backspace work too.';
const PROVE_CONTROLS = 'Tap a row and add cards with R and B; ⌫ takes the last one back. Tap the ending of a pair to put the same cards after both of its rows. Keys R, B and Backspace work too.';

// Each puzzle: [level, title, parameters, text]. Text fields are written out
// in full below; the builder adds the computed solution.
const P = [];
const add = (level, title, parameters, text) => P.push({level, title, parameters, ...text});

add('easy', 'Last card blue', {mode: 'build', rule: {kind: 'last', card: 'B'}, circles: 2}, {
  objective: 'Make a machine with 2 circles that says ✓ exactly when the last card is blue. With no cards it says ×.',
  visibleObjective: '✓ when the last card is blue.',
  idea: 'A machine can remember just the last card: every B arrow goes to one circle and every R arrow to the other.',
  prerequisites: 'Tell red from blue and follow an arrow. No reading for the child; a grown-up reads the rule.',
  hints: ['Where should the marker be right after a blue card, wherever it was before?', 'Two arrows may go to the same circle. Send both B arrows to the circle that says ✓.', 'Circle 1 says × and circle 2 says ✓. Every R arrow goes to circle 1 and every B arrow to circle 2.'],
  parent: {
    notice: 'Whether your child sees that the last card alone decides, so both B arrows point at one circle, whichever circle they leave.',
    prompt: 'After R B B R B, where is the marker? Do you need to know the first four cards?',
    explanation: 'Circle 1 means “the last card was not blue” (true at the start, with no cards) and circle 2 means “the last card was blue”. Every B sends the marker to circle 2 and every R to circle 1, so after any row the marker stands on the circle for its last card. One circle can’t work: with no cards the answer is × and after B it is ✓, and one circle has one answer.',
    extension: 'Change the rule to “the last card is red”. What changes, and what does the machine say with no cards?',
    connection: 'This is a deterministic finite automaton: states, one arrow per symbol from each state, a start state and accepting states. “The last symbol is b” needs two states.'
  },
  provenance: 'Week 17 K–1 Problem 4 (“Use two circles to make a machine that says ✓ exactly when the last card is blue. With no cards, it must say ×.”) and grades 2–3 Problem 3.'
});
add('easy', 'A red card', {mode: 'build', rule: {kind: 'seen', word: 'R'}, circles: 2}, {
  objective: 'Make a machine with 2 circles that says ✓ exactly when the row has at least one red card.',
  visibleObjective: '✓ when the row has a red card.',
  idea: 'Some memories can’t be undone: once a red card has come, no blue card takes it back, so the ✓ circle keeps the marker for good.',
  prerequisites: 'Tell red from blue and follow an arrow. Puzzle 1 first helps.',
  hints: ['Try R B B on your machine. Does it still remember the red?', 'Once the marker reaches the ✓ circle, both of that circle’s arrows should keep it there.', 'Circle 1 says ×: B loops back and R goes to circle 2. Circle 2 says ✓, and both its arrows loop back to it.'],
  parent: {
    notice: 'Whether your child first builds “the last card is red” (every R to ✓, every B to ×) and then sees from Test’s row R B that a later blue must not erase the red.',
    prompt: 'How is this machine different from the last-card-blue machine?',
    explanation: 'Circle 1 means “no red yet” and circle 2 “a red has come”. Circle 1’s B keeps the marker there, its R moves it on, and circle 2 never lets go. One circle can’t work: no cards needs × and R needs ✓.',
    extension: 'Make a machine that says ✓ when no red card has come (K–1 Problem 5: swap ✓ and ×).',
    connection: 'Circle 2 is an absorbing state. “Contains a” and “ends with a” are different two-state languages: one memory resets and the other does not.'
  },
  provenance: 'Week 17 grades 2–3 Problem 2 (“Draw a machine that says YES exactly when at least one red card has appeared.”); K–1 Problem 5 is the same machine with ✓ and × swapped.'
});
add('easy', 'Pairs of reds', {mode: 'build', rule: {kind: 'mod', m: 2}, circles: 2}, {
  objective: 'Make a machine with 2 circles that says ✓ exactly when the red cards make pairs with none left over. No red cards counts.',
  visibleObjective: '✓ when the red cards make pairs with none left over.',
  idea: 'A machine can count in a loop: each red moves the marker to the other circle, and blue changes nothing.',
  prerequisites: 'Pair up objects and see one left over. Follow an arrow.',
  hints: ['Where should the marker go after one red? After two?', 'Blue cards don’t change the pairs, so every B arrow loops back to its own circle.', 'Circle 1 says ✓ and circle 2 says ×. Each R arrow goes to the other circle; each B arrow loops back.'],
  parent: {
    notice: 'Whether your child sees that blue cards don’t matter here at all, and that the marker goes back and forth with each red.',
    prompt: 'With no red cards, do the reds make pairs?',
    explanation: 'Circle 1 means an even number of reds so far (zero at the start) and circle 2 an odd number. Red switches, blue stays. This is the machine drawn in K–1 Problem 1.',
    extension: 'How many circles would groups of three need? (Puzzle 5.)',
    connection: 'Counting modulo 2, parity, as a two-state automaton: the simplest cyclic group acting on states.'
  },
  provenance: 'New as a building task. The machine is Week 17 K–1 Problem 1’s (circle 1 ✓ and circle 2 ×, R both ways, B loops).'
});
add('easy', 'Same cards after', {mode: 'split', rule: {kind: 'mod', m: 3}, pairs: [['', 'R'], ['R', 'RR'], ['RR', 'RBR'], ['B', 'RRR']], machine: {arrows: [[1, 0], [2, 1], [0, 2]], marks: [true, false, false]}}, {
  objective: 'For each pair of rows, add the same cards in the same order after both so that the machine gives one ✓ and one ×, or press Can’t when no cards can do it. Adding no cards is allowed.',
  visibleObjective: 'Add the same cards to both rows to get one ✓ and one ×.',
  idea: 'Two markers on the same circle move together for good: the next card takes both along the same arrow.',
  prerequisites: 'Follow arrows with two markers at once. Puzzles 1 to 3 first help.',
  hints: ['Look where each row leaves its marker. Are the two markers on the same circle?', 'No cards and R already give one ✓ and one ×. R and R R split with one more R.', 'R R and R B R both end on circle 3, and B and R R R both on circle 1: press Can’t for those two pairs.'],
  parent: {
    notice: 'Whether your child tries many endings on a pair whose markers stand together before seeing that they can never part.',
    prompt: 'When two markers stand on the same circle, can one card send them to different circles?',
    explanation: 'The machine counts reds in threes: circle 1 for 0, 3, 6 … reds, circle 2 for one left over, circle 3 for two. No cards and R end on circles 1 and 2, already ✓ and ×. R and R R end on circles 2 and 3, and one more R takes them to 3 and 1, × and ✓. R R and R B R both have two reds and end on circle 3; B and R R R both end on circle 1. The same next card moves both markers along the same arrow, so they stay together after any ending.',
    extension: 'Find two rows with different numbers of reds that still can’t be split. (R and R R R R.)',
    connection: 'If two inputs reach the same state, no suffix separates them: the lemma behind the Myhill–Nerode theorem.'
  },
  provenance: 'Week 17 K–1 Problem 6: the same machine (a red cycle of three circles, ✓ × ×, B loops) and the same four pairs. The board applies one ending to both rows, the review card’s fix 1.'
});
add('medium', 'Groups of three', {mode: 'build', rule: {kind: 'mod', m: 3}, circles: 3}, {
  objective: 'Make a machine with 3 circles that says ✓ exactly when the red cards make groups of three with none left over. No red cards counts.',
  visibleObjective: '✓ when the red cards make groups of three with none left over.',
  idea: 'Three circles remember how many reds are left over: none, one or two.',
  prerequisites: 'Make groups of three and see what is left over. Puzzle 3 first helps.',
  hints: ['What should happen after a third red?', 'Each R arrow moves on to the next circle, and the third comes back to circle 1. Blue loops back.', 'Circle 1 says ✓, circles 2 and 3 say ×. R goes from circle 1 to 2, 2 to 3 and 3 to 1; every B loops back to its own circle.'],
  parent: {
    notice: 'Whether your child uses circles 2 and 3 for “one left over” and “two left over”, or keeps trying a two-circle idea.',
    prompt: 'Why can’t two circles do it? (Think of no cards, R and R R.)',
    explanation: 'Circle 1 means no reds left over, circle 2 one and circle 3 two. R moves on one circle and B stays, so after every card the marker shows the reds left over, and only circle 1 says ✓. Two circles are not enough: no cards and R differ with no ending, no cards and R R too, and R and R R after one more R. With two circles two of these rows would share a circle.',
    extension: 'Groups of four take four circles (puzzle 9); groups of m take m.',
    connection: 'The cyclic group of order 3 acting on three states. “The number of a’s is a multiple of m” needs exactly m states.'
  },
  provenance: 'Week 17 grades 2–3 Problem 5 (“Draw a machine that says YES exactly when its red cards can be put in groups of three with none left over.”) and grades 4–5 Problem 1’s machine.'
});
add('medium', 'Reds left over', {mode: 'split', rule: {kind: 'mod', m: 3}, pairs: [['R', 'BRR'], ['RB', 'BR'], ['BBB', 'RRR'], ['BRB', 'RBRB']]}, {
  objective: 'The rule is ✓ when the red cards make groups of three with none left over. For each pair of rows, add the same cards in the same order after both to get one ✓ and one ×, or press Can’t when no cards can do it.',
  visibleObjective: '✓ when the red cards make groups of three with none left over.',
  idea: 'Only the reds left over matter. Rows that look different can be the same to the rule, and then no ending splits them.',
  prerequisites: 'Count reds and make groups of three. Puzzles 4 and 5 first.',
  hints: ['Count the reds left over after groups of three in each row.', 'R and B R R: add one R. B R B and R B R B: one more R too.', 'R B and B R have the same reds, and so do B B B and R R R (none left over). Press Can’t for both.'],
  parent: {
    notice: 'Whether your child tries many endings on B B B and R R R before noticing that both have no reds left over.',
    prompt: 'Both rows say ✓ now. Could some ending ever make them disagree?',
    explanation: 'An ending adds the same number of reds to both rows. Rows with the same reds left over after threes (R B and B R: one; B B B and R R R: none) stay alike for good. Rows with different numbers left over split: R has one and B R R two, so one more R makes B R R R three, ✓, and R R two, ×. After a right Can’t, the app shows the groups-of-three machine with both rows ending on one circle.',
    extension: 'Find two rows that both say × and can’t be split, and two that both say × and can.',
    connection: 'The Myhill–Nerode classes of “the number of a’s is a multiple of 3” are the three remainders.'
  },
  provenance: 'Week 17 grades 2–3 Problem 4 (R B / B R) and grades 4–5 Problem 2 (B B B / R R R). R / B R R and B R B / R B R B are new pairs with different remainders, so that two pairs split and two can’t.'
});
add('medium', 'Red then blue', {mode: 'build', rule: {kind: 'ends', word: 'RB'}, circles: 3}, {
  objective: 'Make a machine with 3 circles that says ✓ exactly when the last two cards are red then blue. Every other row gets ×.',
  visibleObjective: '✓ when the last two cards are red then blue.',
  idea: 'Two circles can both say × and still have to be different: after no cards and after R the answers agree, but one B splits them.',
  prerequisites: 'Puzzles 1 and 5 first. Reading a two-card ending.',
  hints: ['After R, one B gives ✓. After no cards, one B gives ×. Can those two rows share a circle?', 'Use one × circle for “nothing useful yet”, one × circle for “the last card is R” and the ✓ circle for “the last two are R B”. Every R goes to the “last card R” circle.', 'Circle 1 says ×: R to circle 2, B loops back. Circle 2 says ×: R loops back, B to circle 3. Circle 3 says ✓: R to circle 2, B to circle 1.'],
  parent: {
    notice: 'Whether your child builds a machine that says ✓ once R B has ever come (Test then shows R B R) and whether they see why two × circles are needed.',
    prompt: 'The marker is on the ✓ circle and a B comes. Where should it go? And after an R?',
    explanation: 'The circles remember how much of R B the row ends with: nothing, R, or R B. Every R leads to “ends in R”. A B after R completes R B; a B anywhere else leaves nothing useful. Three are needed: no cards and R are split by B (×, ✓), and R B is split from both by no cards.',
    extension: 'What about “the last two cards are red then red”? Or “R B has come somewhere”?',
    connection: 'The pattern automaton of Knuth–Morris–Pratt string matching: its states are the longest beginning of the pattern that ends the input.'
  },
  provenance: 'Week 17 grades 2–3 Problem 6 and grades 4–5 Problem 5 (“…says YES exactly when the last two cards are red followed by blue. Every other row must give NO.”).'
});
add('medium', 'Not two circles', {mode: 'fewest', rule: {kind: 'ends', word: 'RB'}, circles: 0, rows: 3}, {
  objective: 'Show that 2 circles are not enough for ✓ when the last two cards are red then blue: make 3 rows, and for every two of them a shared ending that gives one ✓ and one ×.',
  visibleObjective: 'Show 2 circles are not enough for ✓ when the last two cards are red then blue.',
  idea: 'Three rows that can be split two at a time need three circles: two rows on one circle could never be split.',
  prerequisites: 'Puzzles 4 and 7 first.',
  hints: ['Which rows did your machine in puzzle 7 keep on different circles?', 'Try no cards, R and R B.', 'Row 1 no cards, row 2 R, row 3 R B. Rows 1 and 2: add B. The other pairs need no cards.'],
  parent: {
    notice: 'Whether your child picks three rows that all say × and finds they can’t split them all, or uses the three kinds of ending: nothing, R, R B.',
    prompt: 'No cards and R both say ×. Why must a machine still keep them apart?',
    explanation: 'With no cards and R, adding B gives × and ✓, so they can’t share a circle. R B says ✓ and the others ×, so it can’t share with either. Any two-circle machine puts two of the three rows on one circle, and then that pair’s ending gives them the same answer, so the machine is wrong on one of them. With puzzle 7’s machine, three is exactly the fewest.',
    extension: 'Can you find four rows that split two at a time? (No: each row ends on one of the three circles of a right machine.)',
    connection: 'Pairwise distinguishable strings give a lower bound on the states of any automaton for a language: the easy direction of Myhill–Nerode.'
  },
  provenance: 'Week 17 grades 2–3 Problem 6 (“explain why fewer circles cannot work”) and grades 4–5 Problem 5, with the adult guide’s witnesses: no cards and R split by B, R B split from both by stopping.'
});
add('hard', 'Groups of four', {mode: 'fewest', rule: {kind: 'mod', m: 4}, circles: 4, rows: 4}, {
  objective: 'Make a machine with 4 circles that says ✓ exactly when the red cards make groups of four with none left over, then show that 3 circles are not enough.',
  visibleObjective: '✓ when the red cards make groups of four with none left over.',
  idea: 'A working machine and four rows that split two at a time together show that four circles is exactly the fewest.',
  prerequisites: 'Puzzles 5 and 8 first.',
  hints: ['Build it like groups of three, with one more circle.', 'For the rows, try no cards, R, R R and R R R. To split two rows, add reds until one of them makes groups of four.', 'Rows: no cards, R, R R, R R R. Pairs with no cards need nothing; R and R R take R R; R and R R R, and R R and R R R, take R.'],
  parent: {
    notice: 'Whether your child builds the loop quickly after puzzle 5 and then picks rows by their reds left over.',
    prompt: 'Why do the four rows need different numbers of reds left over?',
    explanation: 'A loop of four circles, R moving on and B staying, counts the reds left over after fours; only circle 1 says ✓. For the lower bound take rows with 0, 1, 2 and 3 reds. For two of them with i < j reds, adding 4 − i reds (none when i = 0) makes groups of four in the first and leaves j − i over in the second. So the four rows need four circles, and three are not enough.',
    extension: 'Groups of five need five circles, and groups of m need m, by the same rows and endings (grades 4–5 Problem 6).',
    connection: 'The smallest automaton for “the number of a’s is a multiple of m” has m states, the m remainders being its Myhill–Nerode classes.'
  },
  provenance: 'Week 17 grades 4–5 Problem 4 (“Find the fewest circles needed by a machine that says YES exactly when its red cards can be grouped in fours…”), with the adult guide’s witnesses (append 4 − i reds).'
});
add('hard', 'Two reds together', {mode: 'fewest', rule: {kind: 'seen', word: 'RR'}, circles: 3, rows: 3}, {
  objective: 'Make a machine with 3 circles that says ✓ exactly when two red cards have come next to each other somewhere in the row, and still says ✓ after more cards; then show that 2 circles are not enough.',
  visibleObjective: '✓ when two red cards have come next to each other.',
  idea: 'This machine needs a memory that resets (one red waiting, wiped by a blue) and one that never resets (two reds together have come).',
  prerequisites: 'Puzzles 2 and 7 first.',
  hints: ['After R B, is anything useful waiting? After R?', 'Circle 1: no red waiting. Circle 2: one red waiting. Circle 3: two reds together have come, and it keeps the marker for good.', 'Circle 1 says ×: R to circle 2, B loops back. Circle 2 says ×: R to circle 3, B to circle 1. Circle 3 says ✓ and both its arrows loop. Rows: no cards, R, R R.'],
  parent: {
    notice: 'Whether your child’s first machine says ✓ for R B R (two reds, but not next to each other); Test will show that row.',
    prompt: 'R B R has two reds. Why does it get ×?',
    explanation: 'Circle 1 means no red is waiting, circle 2 that the last card was R (and no R R yet), circle 3 that R R has come. B wipes a waiting red; nothing leaves circle 3. For the lower bound, no cards and R are split by R (×, ✓), and R R says ✓ while the other two say ×.',
    extension: '“R B R has come somewhere” needs four circles (the Week 17 return visit’s return question).',
    connection: 'A pattern-detecting automaton for “contains RR”, with an absorbing accepting state.'
  },
  provenance: 'Week 17 return visit Problem 1, worded as the review card’s fix 4 asks (“two red cards next to each other”), with the return-visit guide’s three-state table N, P, F.'
});
add('hard', 'Both in pairs', {mode: 'fewest', rule: {kind: 'even2'}, circles: 4, rows: 4}, {
  objective: 'Make a machine with 4 circles that says ✓ exactly when the red cards make pairs and the blue cards make pairs, with none left over (no cards counts); then show that 3 circles are not enough.',
  visibleObjective: '✓ when the red cards and the blue cards both make pairs.',
  idea: 'Two memories, reds even or odd and blues even or odd, combine into four circles, one for each pair of answers.',
  prerequisites: 'Puzzles 3 and 9 first.',
  hints: ['One question for reds and one for blues: each odd or even. How many ways can the two answers go?', 'Think of the circles as the corners of a square: R moves across, B moves up and down.', 'Circle 1 says ✓. R swaps circles 1 and 2 and circles 3 and 4; B swaps circles 1 and 4 and circles 2 and 3. Rows: no cards, R, B, R B.'],
  parent: {
    notice: 'Whether your child first builds a machine for one colour only, and how Test’s rows (B, R B and so on) lead to the second memory.',
    prompt: 'R and B both say ×. What one card would turn each of them into ✓?',
    explanation: 'Each circle is a pair of answers: reds even or odd, blues even or odd. R changes only the red answer and B only the blue one, so the marker always knows both, and only even–even says ✓. For the lower bound, no cards, R, B and R B end with four different pairs. To split two of them, add the cards that make the first one even–even (nothing, R, B or R B): the second stays odd somewhere and says ×.',
    extension: 'What if the rule is “the reds make pairs and the last card is blue”? Three circles are enough (the return visit’s extension).',
    connection: 'The product of two automata recognizes the intersection of their languages; here the Klein four-group acts on four states.'
  },
  provenance: 'Week 17 return visit Problem 2 (“…says YES exactly when the row has an even number of red cards and an even number of blue cards…”), with its guide’s four-corner machine and witnesses.'
});
add('hard', 'As many reds as blues', {mode: 'fewest', rule: {kind: 'equal'}, circles: 0, rows: 4}, {
  objective: 'Show that 3 circles are not enough for ✓ when there are as many red cards as blue cards: make 4 rows, and for every two of them a shared ending that gives one ✓ and one ×.',
  visibleObjective: 'Show 3 circles are not enough for ✓ when there are as many red cards as blue cards.',
  idea: 'Each extra red needs a circle of its own, so no number of circles is ever enough.',
  prerequisites: 'Puzzles 8 and 9 first.',
  hints: ['What would a row with one more red than blue need to get ✓?', 'Try rows with no cards, R, R R and R R R. Blue cards can balance one row of a pair and not the other.', 'Rows: no cards, R, R R, R R R. A pair whose first row has some reds splits by adding that many B: nothing, B or B B.'],
  parent: {
    notice: 'Whether your child sees that more rows (R R R R and so on) would always work too, so no machine with a fixed number of circles can follow this rule.',
    prompt: 'Could 10 circles do it? Which rows would you pick then?',
    explanation: 'Take rows with 0, 1, 2 and 3 reds. For two with i < j reds, adding i blues balances the first (✓) and not the second (×). So the four rows need four circles. The same works with R repeated as often as you like, so no machine with a fixed number of circles says ✓ exactly for equal counts on rows of every length.',
    extension: 'The rule “reds minus blues is a multiple of 3” looks alike. How many circles does it need? (Three.)',
    connection: 'The strings with equally many a’s and b’s form the classic language no finite automaton recognizes: a, aa, aaa, … are pairwise distinguishable. A counter or a stack is extra memory.'
  },
  provenance: 'Week 17 return visit Problem 3 (“Could any machine with a fixed number of states work for rows of every length?”) and its guide’s argument: histories with 0 to m reds, then i blues.'
});

const playground = {
  id: 'cardmachines-playground', number: 0, title: 'Card machines playground', difficulty_level: 'playground', familyTitle: 'Card machines', libraryFamily: 'cardmachines', mechanic: 'cardmachine', band: 'playground', revision: 1, sourceDocument: 'docs/cardmachines/README.md',
  parameters: {mode: 'playground', machine: {arrows: [[1, 0], [0, 1]], marks: [true, false]}},
  objective: 'Build any machine with 1 to 5 circles and run rows of cards through it.',
  visibleObjective: '',
  instruction: 'Build any machine with 1 to 5 circles and run rows of cards through it.',
  controls: 'Drag the R or B on an arrow onto a circle, or tap it and then the circle. Tap a circle to switch ✓ and ×. − and + change the number of circles; Mix makes a random machine. Add cards to the row below with R and B and see where the marker stops.',
  rules: MACHINE_RULES,
  idea: 'Free play: build a machine, guess its answer before adding a card, and change one arrow at a time.',
  prerequisites: 'None. A grown-up or a partner can call out rows to run.',
  hints: ['Press Mix, then run rows. Which rows get ✓?', 'Change one arrow and run the same row again.', 'Try to make a machine that says ✓ only for no cards.'],
  parent: {
    notice: 'Whether your child can say what a machine they didn’t build does, by running rows.',
    prompt: 'Press Mix. Can you say in words which rows this machine gives ✓?',
    explanation: 'Every machine follows some rule: the rows that end on a ✓ circle. Two rows that end on the same circle get the same answer whatever cards come next, which is why the circle is the machine’s whole memory.',
    extension: 'Make a machine that says ✓ only for no cards. How many circles does it need? (Two.)',
    connection: 'The rules some machine follows are the regular languages (Kleene’s theorem).',
    sourceIds: SOURCES
  },
  provenance: 'New free play. Running rows through a drawn machine is Week 17 K–1 Problem 1 and grades 2–3 Problem 1.'
};

// The table in docs/cardmachines/README.md.
const TABLE = [
  {fewest: 2}, {fewest: 2}, {fewest: 2},
  {answers: ['', 'R', 'cant', 'cant']},
  {fewest: 3},
  {answers: ['R', 'cant', 'cant', 'R']},
  {fewest: 3},
  {fewest: 3, rows: ['', 'R', 'RB'], ends: ['B', '', '']},
  {fewest: 4, rows: ['', 'R', 'RR', 'RRR'], ends: ['', '', '', 'RR', 'R', 'R']},
  {fewest: 3, rows: ['', 'R', 'RR'], ends: ['R', '', '']},
  {fewest: 4, rows: ['', 'R', 'B', 'RB'], ends: ['', '', '', 'R', 'R', 'B']},
  {fewest: Infinity, rows: ['', 'R', 'RR', 'RRR'], ends: ['', '', '', 'B', 'B', 'BB']}
];

// Rows that can be split two at a time: the shortest row to each circle of
// the smallest machine (breadth first, R before B), or i reds for `equal`.
function witnessRows(rule, n) {
  if (!ruleMachine(rule)) return Array.from({length: n}, (_, i) => 'R'.repeat(i));
  const m = ruleMachine(rule), words = [''];
  for (let k = 0; k < words.length; k++) for (const c of CARDS) { const w = words[k] + c, s = ruleState(rule, w); if (!words.some(x => ruleState(rule, x) === s)) words.push(w); }
  return words.slice(0, n);
}

const puzzles = P.map((x, i) => {
  const q = x.parameters, want = TABLE[i], number = i + 1;
  const solution = {};
  if (q.mode !== 'split') assert.equal(fewest(q.rule), want.fewest, `${x.title}: fewest circles`);
  if (q.mode === 'build' || (q.mode === 'fewest' && q.circles)) { assert.equal(q.circles, fewest(q.rule), `${x.title}: the budget is the fewest`); solution.fewest = q.circles; solution.machine = renamings(q.rule)[0]; }
  if (q.mode === 'fewest') {
    assert.equal(q.rows, Number.isFinite(want.fewest) ? want.fewest : 4);
    const rows = witnessRows(q.rule, q.rows), ends = pairsOf(q.rows).map(([a, b]) => splitter(q.rule, rows[a], rows[b]));
    assert.deepEqual(rows, want.rows, `${x.title}: witness rows`);
    assert.deepEqual(ends, want.ends, `${x.title}: witness endings`);
    Object.assign(solution, {rows, ends});
  }
  if (q.mode === 'split') {
    const answers = q.pairs.map(([a, b]) => (separable(q.rule, a, b) ? splitter(q.rule, a, b) : 'cant'));
    assert.deepEqual(answers, want.answers, `${x.title}: answers`);
    if (q.machine) assert.deepEqual(q.machine, ruleMachine(q.rule), `${x.title}: the drawn machine is the rule’s`);
    solution.answers = answers;
  }
  const controls = q.mode === 'build' ? BUILD_CONTROLS : q.mode === 'split' ? SPLIT_CONTROLS : q.circles ? `${BUILD_CONTROLS} Once it passes, ${PROVE_CONTROLS[0].toLowerCase()}${PROVE_CONTROLS.slice(1)}` : PROVE_CONTROLS;
  const rules = [
    ...MACHINE_RULES,
    ...(q.mode === 'build' || q.circles ? [TEST_RULE] : []),
    ...(q.mode === 'build' ? [] : SHARED_RULES),
    ...(q.mode === 'split' ? ['Can’t claims that no shared ending gives one ✓ and one ×. The app checks the claim; when it is right, it shows a machine for the rule with both rows ending on one circle.'] : []),
    ...(q.mode === 'fewest' ? [`When every two of the ${q.rows} rows have a shared ending that gives one ✓ and one ×, no two of them can share a circle, so ${q.rows - 1} ${q.rows === 2 ? 'circle is' : 'circles are'} not enough.`] : [])
  ];
  return {
    id: `cardmachines-${String(number).padStart(2, '0')}`, number, title: x.title, difficulty_level: x.level, familyTitle: 'Card machines', libraryFamily: 'cardmachines', mechanic: 'cardmachine', band: 'all', revision: 1, sourceDocument: 'docs/cardmachines/README.md',
    parameters: q, objective: x.objective, visibleObjective: x.visibleObjective, instruction: x.objective, controls, rules,
    idea: x.idea, prerequisites: x.prerequisites, hints: x.hints, parent: {...x.parent, sourceIds: SOURCES}, solution, provenance: x.provenance
  };
});

const pack = {
  title: 'Card machines', version: 1,
  families: [{
    id: 'cardmachines', title: 'Card machines',
    mathematics: 'A machine is a few circles, each with one R arrow, one B arrow and a fixed ✓ or ×; a marker starts on circle 1 and each card of a row moves it along that card’s arrow. The circle is the whole memory, so two rows that end on the same circle get the same answer after any shared ending. Hence k rows that can be split two at a time (one shared ending per pair giving ✓ and ×) need k circles in every machine for the rule, and a working machine with k circles proves k is the fewest: the easy half of the Myhill–Nerode theorem. Exact minima: 2 for the last card or a red having come, m for the reds making groups of m, 3 for ending in R B or for two reds next to each other having come, 4 for reds and blues both even. No machine at all says ✓ exactly when there are as many reds as blues: the rows with 0, 1, 2, … reds split two at a time.',
    rules: [...MACHINE_RULES, TEST_RULE, ...SHARED_RULES],
    sourceIds: SOURCES
  }],
  sources,
  puzzles: [playground, ...puzzles]
};
await writeFile(new URL('../dist/families/cardmachines/cardmachines.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
console.log(JSON.stringify({puzzles: puzzles.length, playground: 1, sources: sources.length}));
