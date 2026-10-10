// Authoring list for Sharing circles (worksheet Week 20, averaging and the
// maximum principle). Lays out each board, computes every puzzle's answers
// with the mechanic's own methods (every square choice solved exactly for the
// circles; the one filling of a tie board; the chase from the given circle to
// a smaller square), checks them against the table in docs/averages/README.md,
// and writes dist/families/averages/averages.json.
// Run: node scripts/build-averages.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {waysOf, fillingOf, tieCan, groupOf, topOf, shapeOf, allWork, solve, chasePath, chaseStep, clashOf} from '../dist/families/averages/averages.js';

const SOURCES = ['averages-week20', 'averages-card20', 'averages-doyle'];
const sq = (x, y, name) => ({at: [x, y], shape: 'square', name});
const ci = (x, y, name) => ({at: [x, y], shape: 'circle', name});
// From worksheet coordinates (y down) to percentages of a board 100 wide.
function place(coords, pad) {
  const xs = Object.values(coords).map(c => c[0]), ys = Object.values(coords).map(c => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (100 - 2 * pad) / (x1 - x0), height = (y1 - y0) * s + 2 * pad, r = n => Number(n.toFixed(2));
  return {aspect: r(100 / height), at: Object.fromEntries(Object.entries(coords).map(([id, [x, y]]) => [id, [r(pad + (x - x0) * s), r((pad + (y - y0) * s) / height * 100)]]))};
}

// --- Boards ---------------------------------------------------------------------
const STAR = {aspect: 1.25, scale: 1.35, places: {t: sq(50, 14, 'top square'), c: ci(50, 52, 'circle'), l: sq(18, 86, 'left square'), r: sq(82, 86, 'right square')}, edges: [['t', 'c'], ['l', 'c'], ['r', 'c']]};
const ROW3 = {aspect: 3, scale: 1.5, places: {l: sq(12, 50, 'left square'), c: ci(50, 50, 'circle'), r: sq(88, 50, 'right square')}, edges: [['l', 'c'], ['c', 'r']]};
const ROW4 = names => ({aspect: 3.4, scale: 1.3, places: {A: sq(9, 50, names[0]), p: ci(36.3, 50, names[1]), q: ci(63.7, 50, names[2]), B: sq(91, 50, names[3])}, edges: [['A', 'p'], ['p', 'q'], ['q', 'B']]});
const TAIL = {aspect: 4.2, scale: 1.15, places: {z: sq(8, 50, '0 square'), a: ci(29, 50, 'left circle'), e: sq(50, 50, '8 square'), b: ci(71, 50, 'middle circle'), c: ci(92, 50, 'right circle')}, edges: [['z', 'a'], ['a', 'e'], ['e', 'b'], ['b', 'c']]};
const BRANCH = {aspect: 2.1, scale: 1.2, places: {z: sq(8, 28, '0 square'), a: ci(35, 28, 'left circle'), b: ci(62, 28, 'middle circle'), t: sq(91, 28, '12 square'), c: ci(62, 80, 'bottom circle')}, edges: [['z', 'a'], ['a', 'b'], ['b', 't'], ['b', 'c']]};
const TREE = names => ({aspect: 1.75, scale: 1.2, places: {R: sq(9, 17, names[0]), S: sq(9, 83, names[1]), u: ci(38, 50, 'left circle'), v: ci(66, 50, 'right circle'), T: sq(92, 50, names[2])}, edges: [['R', 'u'], ['S', 'u'], ['u', 'v'], ['v', 'T']]});
// Week 20 grades 4–5 page 2, upper board, from the worksheet's coordinates.
const P2 = place({Z: [94, 245], u: [205, 245], v: [317, 245], S: [428, 245], w: [317, 367], z: [450, 367], E: [529, 464]}, 8);
const LADDER = {aspect: P2.aspect, scale: 1.1, places: {Z: sq(...P2.at.Z, '0 square'), u: ci(...P2.at.u, 'left circle'), v: ci(...P2.at.v, 'middle circle'), S: sq(...P2.at.S, '6 square'), w: ci(...P2.at.w, 'lower circle'), z: ci(...P2.at.z, 'right circle'), E: sq(...P2.at.E, '11 square')}, edges: [['Z', 'u'], ['u', 'v'], ['v', 'S'], ['v', 'w'], ['v', 'z'], ['w', 'z'], ['z', 'E']]};
const ROOMS = {aspect: 1.55, scale: 1.15, places: {L: sq(8, 50, '2 square'), a: ci(33, 17, 'top left circle'), b: ci(33, 83, 'bottom left circle'), T: sq(60, 17, 'top 8 square'), B: sq(60, 83, 'bottom 8 square'), c: ci(90, 17, 'top right circle'), d: ci(90, 83, 'bottom right circle')}, edges: [['L', 'a'], ['L', 'b'], ['a', 'b'], ['a', 'T'], ['T', 'c'], ['c', 'd'], ['b', 'B'], ['B', 'd']]};

// --- Copy -----------------------------------------------------------------------
const RULES = [
  'Squares keep their numbers. A circle works when its number is the average of every place joined to it: add their numbers and share the total equally among them.',
  'An empty place has no number yet. A circle lights when it works, and every circle must work at the same time.'
];
const MODE_RULES = {
  every: ['Each way that makes every circle work is kept in a row below the board. Press That’s all when you think you have found every way.'],
  cards: ['Each number card can be on one place only: putting a card on a place takes it off any other place.', 'Each way that makes the circle work is kept in a row below the board. Press That’s all when you think you have found every way.'],
  change: ['Change one square: changing a second square puts the first back. Each way that makes every circle work is kept in a row below the board. Press That’s all when you think you have found every way.'],
  tie: ['The dark circle’s number is the biggest square’s. In a board where every circle works, no place is bigger than the biggest square, so a circle that big shares equally only if every place joined to it is just as big.', 'If you think the circles can’t all work, press Can’t, then tap places joined to the dark circle, one at a time, and places joined to the circles you tap. A square stops the chase. Reach a smaller square to show it can’t be done.']
};
const CONTROLS = {
  every: 'Tap a place to choose it, then tap a number below the board. With a keyboard, Tab to a place and type a digit, or use the arrow keys. Press That’s all when you have every way. Undo keeps the ways found.',
  change: 'Tap a place to choose it, then tap a number below the board. With a keyboard, Tab to a place and type a digit, or use the arrow keys. Press That’s all when you have every way. Undo keeps the ways found.',
  tie: 'Tap a circle to choose it, then tap a number below the board. With a keyboard, Tab to a place and type a digit, or use the arrow keys. To claim it can’t be done, press Can’t and tap the chase; press Can’t again to stop.'
};
const parent = (notice, prompt, explanation, extension, connection) => ({notice, prompt, explanation, extension, connection, sourceIds: SOURCES});

// --- Puzzles --------------------------------------------------------------------
// Each row: the board, the mode's data and the copy. `expect` is the table in
// docs/averages/README.md: every way (free places in `free` order), the tie
// filling, or the chase the hints tap.
const PUZZLES = [
  {
    title: 'Three squares', level: 'easy', board: STAR, mode: 'every', given: {c: 2}, free: ['t', 'l', 'r'], range: [0, 3],
    expect: [[0, 3, 3], [1, 2, 3], [1, 3, 2], [2, 1, 3], [2, 2, 2], [2, 3, 1], [3, 0, 3], [3, 1, 2], [3, 2, 1], [3, 3, 0]],
    objective: 'Put 0 to 3 in each square so the circle, holding 2, is their average. Find every way.',
    visible: 'Find every way to make the circle work.',
    idea: 'Three shares of 2 need squares that add to 6; sorting the ways by the smallest square finds all ten.',
    prerequisites: 'Count to 6 and share a few things into three equal piles. No reading: a grown-up can read How to play.',
    hints: ['How much must the three squares hold altogether, for three equal shares of 2?', 'They must add up to 6. If one square is 0, what must the other two be?', 'Sort by the smallest square: 0 with 3 and 3, 1 with 2 and 3, or 2, 2 and 2, each in every order. That makes ten.'],
    parent: parent('Whether your child counts an empty-looking 0 square as one of the three shares, and whether they move one number at a time or plan a whole way.', 'Could a square be 0? Could all three be different?', 'Three equal shares of 2 make 6, so the squares must total 6 with each from 0 to 3. If the smallest is 0 the others are 3 and 3; if it is 1, they are 2 and 3; if it is 2, all are 2; a smallest of 3 would total 9. In every order that is 3 + 6 + 1 = 10 ways.', 'With the circle at 1 and squares 0 to 3 there are again ten ways: every order of 0, 0, 3, of 0, 1, 2 and of 1, 1, 1.', 'Finding every input for a given average is counting compositions of 6 into three parts no bigger than 3.'),
    provenance: 'Week 20 K–1 Problem 3: “Put 2 cubes in the circle and use 0 to 3 cubes in each square. Find every way that works.” The ten printed recording boards are gone (review card fix 1): a way is kept when it is made, and That’s all is checked.'
  },
  {
    title: 'Three cards', level: 'easy', board: ROW3, mode: 'every', cards: true, given: {}, free: ['l', 'c', 'r'], range: [0, 4],
    expect: [[0, 1, 2], [0, 2, 4], [1, 2, 3], [2, 1, 0], [2, 3, 4], [3, 2, 1], [4, 2, 0], [4, 3, 2]],
    objective: 'Put three different number cards from 0 to 4 on the two squares and the circle so the circle is the average of the squares. Find every way.',
    visible: 'Find every way to make the circle work.',
    idea: 'The circle is halfway between its two squares, so it can never hold the smallest or biggest card.',
    prerequisites: 'Numbers 0 to 4 and halving an even number. No reading.',
    hints: ['Which card can never go in the circle?', 'The circle is halfway between the squares. 0 and 4 have nothing on one side of them.', 'Circle 1 needs 0 and 2; circle 2 needs 0 and 4 or 1 and 3; circle 3 needs 2 and 4. Each pair goes either way round.'],
    parent: parent('Whether your child tries 0 or 4 in the circle, and whether they notice that swapping the two squares gives another way.', 'Why can’t the circle hold the 0 card?', 'With two neighbours the circle is halfway between the squares, so with different cards it is strictly between them: never 0 or 4. Circle 1 needs squares adding to 2 (0 and 2), circle 2 adding to 4 (0 and 4, or 1 and 3; 2 and 2 repeats a card), circle 3 adding to 6 (2 and 4). Each pair in either order: 2 + 4 + 2 = 8 ways.', 'Allow repeated numbers: then there are 13 ways, the 8 here and the five where all three are the same.', 'A middle value strictly between two different numbers: the first case of the strict maximum principle.'),
    provenance: 'Week 20 K–1 Problem 4: “Use three different cards to fill the squares and circle. Find every way that works.” The cards are the number row; a card can sit on one place only.'
  },
  {
    title: 'One change', level: 'easy', board: ROW3, mode: 'change', given: {c: 6}, start: {l: 1, r: 7}, free: ['l', 'r'], range: [0, 12],
    expect: [[1, 11], [5, 7]],
    objective: 'Change one square so the circle, holding 6, is the average of its squares. Find every way.',
    visible: 'Find every way to make the circle work by changing one square.',
    idea: 'To raise an average of two by 2, the one square that changes must supply all 4 of the extra total.',
    prerequisites: 'Add and halve numbers to 12.',
    hints: ['With 1 and 7 the circle would be 4. What total do the squares need for 6?', 'The squares need 12 between them, which is 4 more than now. One square has to take all 4.', 'Make the 1 into 5, or make the 7 into 11.'],
    parent: parent('Whether your child tries both squares, and whether they predict that each needs the same change.', 'Which square should change, and by how much?', 'Two shares of 6 need a total of 12; the squares hold 8. One changed square must add 4: 1 becomes 5, or 7 becomes 11. Lowering a square makes the total smaller, so there are just these two ways.', 'With three squares, raising the circle by 2 needs one square to grow by 6: with d neighbours it is 2 × d.', 'Changing one of d neighbours by k moves the average by k ÷ d.'),
    provenance: 'Week 20 grades 2–3 Problem 1, upper left board (1 and 7): “change one square number … so that its circle number grows by 2.” The circle shows its new number, 6; finding every way is new.'
  },
  {
    title: 'Last circle', level: 'easy', board: TAIL, mode: 'tie', given: {z: 0, e: 8, c: 8}, target: 'c', free: ['a', 'b'], range: [0, 12],
    expect: {a: 4, b: 8},
    objective: 'The right circle holds 8, as much as the biggest square. Make every circle work, or press Can’t and show why not.',
    visible: 'Make every circle work.',
    idea: 'Equality spreads from circle to circle but stops at a square: the circles behind the 8 can all be 8.',
    prerequisites: 'Halve and average two numbers to 16.',
    hints: ['The right circle has only one place joined to it. What must that place be?', 'The middle circle must be 8, and then it sits between two 8s. The left circle sits between 0 and 8.', 'Make the middle circle 8 and the left circle 4.'],
    parent: parent('Whether your child checks the right circle first, the one with a single neighbour.', 'Does the 8 square have to be the average of its neighbours?', 'A circle with one neighbour equals it, so the middle circle is 8, and 8 is the average of 8 and 8. The left circle is (0 + 8) ÷ 2 = 4. The 8 square need not average 4 and 8: squares keep their numbers, so the chain of equal 8s stops there.', 'Puzzle 5 uses the same board with the 8 on the left circle instead.', 'The equality case of the maximum principle: a circle at the top forces its whole circle group, and the squares it touches, to the same value.'),
    provenance: 'Week 20 grades 4–5 Problem 4, upper board, and grades 2–3 Problem 4, upper board (with 6): “Which circles can equal the largest square number on their own board?” Here the right circle is given the 8.'
  },
  {
    title: 'First circle', level: 'medium', board: TAIL, mode: 'tie', given: {z: 0, e: 8, a: 8}, target: 'a', free: ['b', 'c'], range: [0, 12],
    expect: ['a', 'z'],
    objective: 'The left circle holds 8, as much as the biggest square. Make every circle work, or press Can’t and show why not.',
    visible: 'Make every circle work.',
    idea: 'A circle as big as the biggest square forces every neighbour up to it, and a 0 square can’t be raised.',
    prerequisites: 'Average two numbers to 16, and follow one step of a chain argument.',
    hints: ['What are the two places joined to the left circle?', 'Nothing on the board can be bigger than 8, so an 8 shared from two places needs both of them to be 8.', 'The 0 square would have to be 8. Press Can’t, then tap the 0 square.'],
    parent: parent('Whether your child tries to make the left circle work by changing the other circles, which aren’t joined to it.', 'What would the 0 square need to be for the left circle to work?', 'The left circle is joined to the 0 and the 8 squares, whose average is 4, not 8. As a chase: no number is above 8, so both neighbours of an 8 circle must be 8, and the 0 square isn’t. The other two circles can both be 8, but that doesn’t help.', 'Compare puzzle 4: the same board, with the 8 behind the 8 square, works.', 'The strong maximum principle: a circle at the maximum forces its neighbours; the chase ends at a square below the maximum.'),
    provenance: 'Week 20 grades 4–5 Problem 4, upper board: the circle between 0 and 8 can’t equal 8. The chase as the certificate is the review card’s App fit.'
  },
  {
    title: 'Four in a row', level: 'medium', board: ROW4(['left square', 'left circle', 'right circle', 'right square']), mode: 'every', given: {p: 2}, free: ['A', 'q', 'B'], range: [0, 6],
    expect: [[0, 4, 6], [1, 3, 4], [2, 2, 2], [3, 1, 0]],
    objective: 'The left circle holds 2. Choose both squares and the right circle, from 0 to 6, so that both circles work. Find every way.',
    visible: 'Find every way to make every circle work.',
    idea: 'On a path every circle is halfway between its neighbours, so the four numbers go up or down in equal steps.',
    prerequisites: 'Halve numbers to 12 and keep two checks in mind at once.',
    hints: ['The left circle holds 2. What could the two places joined to it be?', 'With 0 and 4 around it the 2 works; then the right circle needs 2 and the right square around it to average 4.', 'Every way is an equal-step row through 2: 0 2 4 6, 1 2 3 4, 2 2 2 2 and 3 2 1 0.'],
    parent: parent('Whether your child keeps both circles working, or fixes one and breaks the other.', 'What do the four numbers in a way have in common?', 'A circle between two places is their average, so it is as far above one as below the other: the steps along the row are equal. With 2 second, the rows are 0 2 4 6, 1 2 3 4, 2 2 2 2 and 3 2 1 0; a left square of 4 would need −2 on the right.', 'Without the 0 to 6 limit, any left square below 4 or above it with negative numbers works: the rows are exactly the equal-step rows through 2.', 'Discrete harmonic functions on a path are linear: equal gaps between fixed ends.'),
    provenance: 'New, after Week 20 K–1 Problem 2 and grades 2–3 Problem 2 (two circles on a path, equal steps): choosing the squares so a circle hits a target, as the review card asks.'
  },
  {
    title: 'From zero', level: 'medium', board: ROW4(['0 square', 'left circle', 'right circle', 'right square']), mode: 'every', given: {A: 0}, free: ['B', 'p', 'q'], range: [0, 9],
    expect: [[0, 0, 0], [3, 1, 2], [6, 2, 4], [9, 3, 6]],
    objective: 'Choose the right square from 0 to 9 and fill the circles with whole numbers so both circles work. Find every way.',
    visible: 'Find every way to make every circle work.',
    idea: 'Three equal steps from 0 reach the right square, so it must be a multiple of 3 for every circle to be whole.',
    prerequisites: 'Halve numbers and count by threes to 9.',
    hints: ['Try the right square at 1. Can the circles work?', 'With 1 the circles would need thirds: the four numbers go up from 0 in three equal steps.', 'The right square can be 0, 3, 6 or 9.'],
    parent: parent('Whether your child decides the right square first or the circles first, and what they do when no circles work.', 'Why does a right square of 4 never work?', 'The four numbers go up in equal steps from 0, three steps to the right square B, so each step is B ÷ 3. The circles are whole exactly when 3 divides B: 0, 3, 6 or 9. With B = 4 the circles would be 4/3 and 8/3.', 'With three circles between 0 and B, B must be a multiple of 4. In general a path of L steps between whole numbers A and B has whole circles exactly when L divides B − A.', 'Integer points on a line; the fractions on the worksheet’s last page show the other boards do have a filling.'),
    provenance: 'Week 20 grades 4–5 Problem 7 (“Which boards can you fill with whole numbers?”) and its guide’s extension (whole exactly when L divides B − A), turned into the review card’s “pick endpoints so every circle is whole”.'
  },
  {
    title: 'Branch', level: 'medium', board: BRANCH, mode: 'tie', given: {z: 0, t: 12, c: 12}, target: 'c', free: ['a', 'b'], range: [0, 12],
    expect: ['c', 'b', 'a', 'z'],
    objective: 'The bottom circle holds 12, as much as the biggest square. Make every circle work, or press Can’t and show why not.',
    visible: 'Make every circle work.',
    idea: 'With a circle at the junction, a 12 at the end forces 12 back along every circle to the 0.',
    prerequisites: 'Average up to three numbers and follow a chain of three steps.',
    hints: ['The bottom circle has one neighbour. What must it be?', 'The middle circle must be 12 too; it is joined to the left circle, the 12 square and the bottom circle. Can they all be 12?', 'The left circle would have to be 12, and then the 0 square. Press Can’t and tap the middle circle, the left circle and the 0 square.'],
    parent: parent('Whether your child compares this board with puzzle 4, where a square in the middle stopped the chain.', 'What changed from puzzle 4, where a circle could match the biggest square?', 'The bottom circle equals its one neighbour, the middle circle, which then needs 12 from the left circle, the 12 square and the bottom circle: all must be 12. The left circle then needs the 0 square to be 12. In the real filling the circles are 4, 8 and 8: the left one is (0 + 8) ÷ 2 and the middle one (4 + 12 + 8) ÷ 3.', 'Make the middle place a square of 12 instead: then the bottom circle could be 12.', 'A circle group touching any smaller square can never reach the biggest square’s value.'),
    provenance: 'Week 20 grades 4–5 Problem 4, lower board: “Explain what makes the two boards different.” Here the branch circle is given the 12.'
  },
  {
    title: 'Change on a path', level: 'hard', board: ROW4(['left square', 'left circle', 'right circle', 'right square']), mode: 'change', given: {q: 8}, start: {A: 0, B: 9}, free: ['A', 'p', 'B'], range: [0, 12],
    expect: [[0, 4, 12], [6, 7, 9]],
    objective: 'The right circle holds 8. Change one square and fill the left circle so both circles work. Find every way.',
    visible: 'Find every way to make every circle work by changing one square.',
    idea: 'The square next to a circle moves it twice as much as the square two steps away.',
    prerequisites: 'Halve numbers to 24 and keep two checks in mind at once.',
    hints: ['With 0 and 9 the circles would be 3 and 6. Which square do you want to change?', 'Change the right square: the left circle is half of 8. Change the left square: the steps from it to 8 and on to 9 must be equal.', 'Make the right square 12 (left circle 4), or the left square 6 (left circle 7).'],
    parent: parent('Whether your child expects both squares to need the same change.', 'Why does the near square need to change by 3 and the far one by 6?', 'From 0 and 9 the circles are 3 and 6. The right circle is (left square + 2 × right square) ÷ 3, so raising it by 2 takes 3 more on the right square or 6 more on the left: 0 4 8 12 or 6 7 8 9.', 'Raise the left circle by 2 instead: now the left square needs 3 more and the right one 6.', 'The weight each square gets is the chance that a random walk from the circle first reaches that square: harmonic measure.'),
    provenance: 'New, after Week 20 grades 2–3 Problem 1 (change one square so a circle grows by 2), on the two-circle path of grades 2–3 Problem 2 (0 and 9).'
  },
  {
    title: 'Tree', level: 'hard', board: TREE(['0 square', 'bottom square', '8 square']), mode: 'every', given: {R: 0, T: 8}, free: ['S', 'u', 'v'], range: [0, 12],
    expect: [[1, 2, 5], [6, 4, 6], [11, 6, 7]],
    objective: 'Choose the bottom square from 0 to 12 and fill the circles with whole numbers so both circles work. Find every way.',
    visible: 'Find every way to make every circle work.',
    idea: 'Off a path the steps aren’t equal: here the circles are whole only when the bottom square is 1 more than a multiple of 5.',
    prerequisites: 'Average two and three numbers to 36, and keep two checks in mind.',
    hints: ['Try the bottom square at 0. Can the circles work?', 'A bottom square of 6 works, with circles 4 and 6. Raising the square by 5 raises the left circle by 2 and the right circle by 1.', 'The bottom square can be 1, 6 or 11.'],
    parent: parent('Whether your child notices that the ways are 5 apart, and asks why 5.', 'Going from one way to the next, how much does each number go up?', 'With the bottom square S, the left circle is (2S + 8) ÷ 5 and the right circle (S + 24) ÷ 5. Both are whole exactly when S leaves 1 on division by 5: 1, 6 or 11, with circles 2 and 5, 4 and 6, 6 and 7.', 'Free the 8 square instead: it must be 3 or 8. Free the 0 square: 0, 5 or 10.', 'The 5 is the determinant of the circles’ equations; Cramer’s rule puts it under every circle.'),
    provenance: 'Week 20 grades 2–3 Problem 2, bottom tree (0, 6, 8), with the 6 square chosen: the review card’s “pick endpoints so every circle is whole”, on a board that is not a path.'
  },
  {
    title: 'Four circles', level: 'hard', board: LADDER, mode: 'tie', given: {Z: 0, S: 6, E: 11, z: 11}, target: 'z', free: ['u', 'v', 'w'], range: [0, 12],
    expect: ['z', 'v', 'S'],
    objective: 'The right circle holds 11, as much as the biggest square. Make every circle work, or press Can’t and show why not.',
    visible: 'Make every circle work.',
    idea: 'All four circles are one group touching the 0 and the 6, so none can reach 11.',
    prerequisites: 'Average up to four numbers and follow a chain through a triangle of circles.',
    hints: ['Which places are joined to the right circle?', 'Nothing is above 11, so the middle circle, the lower circle and the 11 square must all be 11. Then look at the middle circle’s neighbours.', 'The middle circle is joined to the 6 square. Press Can’t, then tap the middle circle and the 6 square.'],
    parent: parent('Whether your child notices the middle circle has four places joined to it, one of them diagonal.', 'Which square stops the chase, and could another one stop it too?', 'An 11 circle needs every neighbour at 11, so the middle circle is 11, and then the 6 square would have to be. The chase could also run through the left circle to the 0 square. The real filling is 3, 6, 7 and 8.', 'Can any circle on this board be 11? None: the strict maximum principle puts every circle below 11.', 'The strict maximum principle on a connected group: the maximum is reached inside only if the group is constant.'),
    provenance: 'Week 20 grades 4–5 Problem 2, upper board (“Can either board have a circle number of 13 or more?”) and its guide’s extension (“Ask whether 11 can occur in a circle”).'
  },
  {
    title: 'Ring', level: 'hard', board: ROOMS, mode: 'tie', given: {L: 2, T: 8, B: 8, d: 8}, target: 'd', free: ['a', 'b', 'c'], range: [0, 12],
    expect: {a: 5, b: 5, c: 8},
    objective: 'The bottom right circle holds 8, as much as the biggest square. Make every circle work, or press Can’t and show why not.',
    visible: 'Make every circle work.',
    idea: 'The board is one ring, but its two 8 squares wall the right circles off from the 2.',
    prerequisites: 'Average three numbers and solve two circles that depend on each other.',
    hints: ['What must the top right circle be for the bottom right circle to work?', 'The right circles touch only 8 squares, so they can both be 8. The left circles are joined to each other, the 2 and an 8.', 'Make the top right circle 8 and both left circles 5.'],
    parent: parent('Whether your child presses Can’t because the 2 square is on the same ring, and then finds the chase stops at both 8 squares.', 'Why doesn’t the 2 square stop the right circles?', 'The right circles are joined only to each other and to the two 8 squares, so both can be 8. Each left circle averages the 2, an 8 and the other left circle: 3 × 5 = 2 + 8 + 5, so both are 5.', 'Make one of the 8 squares a 7: now no circle can be 8.', 'A tie with the maximum depends on the circle group, not on the whole board: squares split a board into separate groups.'),
    provenance: 'New, after Week 20 grades 4–5 Problem 4 (“what makes the two boards different”): squares wall a circle group off from the smaller square.'
  }
];

const PLAYGROUND = {
  boards: {
    path: {title: 'Path', aspect: 4.2, scale: 1.1, places: {A: sq(8, 50, 'left square'), p: ci(29, 50, 'first circle'), q: ci(50, 50, 'middle circle'), r: ci(71, 50, 'last circle'), B: sq(92, 50, 'right square')}, edges: [['A', 'p'], ['p', 'q'], ['q', 'r'], ['r', 'B']], start: {A: 0, B: 12}},
    tree: {title: 'Tree', ...TREE(['top square', 'bottom square', 'right square']), start: {R: 0, S: 6, T: 8}},
    diamond: {title: 'Diamond', aspect: 1.5, scale: 1.2, places: {L: sq(10, 50, 'left square'), t: ci(50, 15, 'top circle'), b: ci(50, 85, 'bottom circle'), R: sq(90, 50, 'right square')}, edges: [['L', 't'], ['L', 'b'], ['R', 't'], ['R', 'b'], ['t', 'b']], start: {L: 2, R: 12}},
    triangle: {title: 'Triangle', aspect: 1.3, scale: 1.3, places: {t: ci(50, 15, 'top circle'), l: ci(18, 85, 'left circle'), r: ci(82, 85, 'right circle')}, edges: [['t', 'l'], ['t', 'r'], ['l', 'r']], start: {}}
  }
};

// --- Checks and the pack --------------------------------------------------------
function paramsOf(row) {
  const {board, mode, given, free, range} = row;
  const q = {mode, aspect: board.aspect, scale: board.scale, places: board.places, edges: board.edges, given, free, range};
  if (row.cards) q.cards = true;
  if (row.start) q.start = row.start;
  if (row.target) q.target = row.target;
  return q;
}
function check(q, row, n) {
  const {ids, nb, circles, squares} = shapeOf(q);
  assert.deepEqual([...ids].sort(), [...new Set([...Object.keys(q.given), ...q.free])].sort(), `${n}: every place is given or free`);
  assert.ok(!Object.keys(q.given).some(id => q.free.includes(id)), `${n}: no place both given and free`);
  assert.ok(circles.every(c => nb[c].length > 0), `${n}: no lonely circle`);
  assert.ok(squares.every(s => q.mode === 'change' ? q.free.includes(s) : true), `${n}: change puzzles may change every square`);
  if (q.mode === 'tie') {
    assert.ok(squares.every(s => Object.hasOwn(q.given, s)), `${n}: tie squares are given`);
    assert.equal(topOf(q), Math.max(...squares.map(s => q.given[s])), `${n}: the given circle has the biggest square’s number`);
    const fill = fillingOf(q);
    assert.equal(Boolean(fill), tieCan(q), `${n}: a filling exists exactly when the given circle’s group touches no smaller square`);
    if (Array.isArray(row.expect)) {
      assert.equal(fill, null, `${n}: no filling`);
      let chase = [q.target];
      while (!clashOf(q, chase)) chase = [...chase, chaseStep(q, chase)];
      assert.deepEqual(chasePath(q, chase), row.expect, `${n}: the chase`);
      return {chase: row.expect, group: groupOf(q, q.target)};
    }
    assert.deepEqual(Object.fromEntries(q.free.map(c => [c, fill[c]])), row.expect, `${n}: the filling`);
    assert.ok(allWork(q, fill));
    return {filling: row.expect};
  }
  const ways = waysOf(q);
  assert.deepEqual(ways, row.expect, `${n}: every way`);
  if (q.mode === 'change') {
    // With no square changed, the circles have no whole filling that works.
    const known = {...q.given, ...q.start}, s = solve(q, known);
    const vals = s && {...known, ...Object.fromEntries(Object.entries(s).map(([c, [num, den]]) => [c, num / den]))};
    assert.ok(!vals || !allWork(q, vals), `${n}: the start does not already work`);
  }
  return {ways};
}

const puzzles = [{
  id: 'averages-playground', number: 0, title: 'Sharing circles playground', difficulty_level: 'playground', familyTitle: 'Sharing circles', mechanic: 'averages', band: 'playground', revision: 1, sourceDocument: 'docs/averages/README.md',
  parameters: {mode: 'playground', range: [0, 12], ...PLAYGROUND},
  objective: 'Put numbers on any place and watch which circles work.', visibleObjective: '',
  instruction: 'Put numbers on any place and watch which circles work.',
  controls: 'Choose a board. Tap a place, then a number below the board; with a keyboard, Tab to a place and type a digit or use the arrow keys.',
  rules: [...RULES, 'Every place can change here, squares too.'],
  idea: 'Free play with averages on a path, a tree, a diamond and a triangle of circles with no squares.',
  prerequisites: 'None. A grown-up or a partner can set the squares as a challenge.',
  hints: ['Set the squares, then try to light every circle.', 'On the path, the numbers go up in equal steps.', 'On the triangle there are no squares: any number works if all three circles share it.'],
  parent: parent('Whether your child finds that on the triangle every circle works exactly when all three are the same.', 'On the triangle, can the circles work with different numbers?', 'With no squares, a biggest circle forces both its neighbours to match it, so every circle is the same: each number 0 to 12 gives one way, and nothing else works.', 'On the diamond, set the squares to 2 and 12 and find the circles (both 7). Then change one square and predict both circles.', 'Constant functions are the only harmonic functions on a finite connected graph with no boundary.'),
  provenance: 'Week 20 K–1 Problems 6 and 7, grades 2–3 Problem 6 and grades 4–5 Problem 6 (boards with one square or none), with the grades 2–3 Problem 2 tree and the grades 4–5 Problem 1 diamond.'
}];
const table = [];
PUZZLES.forEach((row, k) => {
  const id = `averages-${String(k + 1).padStart(2, '0')}`, q = paramsOf(row);
  const solution = check(q, row, id);
  table.push([k + 1, row.level, row.mode, Array.isArray(row.expect) && row.mode !== 'tie' ? `${row.expect.length} ways` : JSON.stringify(row.expect)]);
  puzzles.push({
    id, number: k + 1, title: row.title, difficulty_level: row.level, familyTitle: 'Sharing circles', mechanic: 'averages', band: 'all', revision: 1, sourceDocument: 'docs/averages/README.md',
    parameters: q, objective: row.objective, visibleObjective: row.visible, instruction: row.objective,
    controls: CONTROLS[row.mode], rules: [...RULES, ...MODE_RULES[row.cards ? 'cards' : row.mode]],
    idea: row.idea, prerequisites: row.prerequisites, hints: row.hints, parent: row.parent, solution, provenance: row.provenance
  });
});
for (const p of puzzles) {
  assert.equal(p.hints.length, 3, `${p.id}: three hints`);
  assert.ok(!/press can.t/i.test(p.hints[0]), `${p.id}: the first hint never says Press Can't`);
}
for (const [name, board] of Object.entries(PLAYGROUND.boards)) {
  const q = {...board, mode: 'playground', given: {}, free: Object.keys(board.places), range: [0, 12]};
  assert.ok(shapeOf(q).circles.every(c => shapeOf(q).nb[c].length), `playground ${name}: no lonely circle`);
  assert.ok(Object.values(board.start).every(v => Number.isInteger(v) && v >= 0 && v <= 12), `playground ${name}: start numbers in range`);
}

const pack = {
  version: 1,
  puzzles,
  sources: [
    {id: 'averages-week20', title: 'Bellingham Math Circle — Week 20: Averaging and the maximum principle (student packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-20', kind: 'local curriculum'},
    {id: 'averages-card20', title: 'Week 20 review card and math check (App fit and Decision: inverse and design goals, the chase as the certificate)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-20.md', kind: 'local curriculum'},
    {id: 'averages-doyle', title: 'Peter G. Doyle and J. Laurie Snell — Random Walks and Electric Networks (2006 version), sections 1.1.5 and 1.2.2: the maximum and uniqueness principles, as the worksheet guide cites', url: 'https://arxiv.org/abs/math/0001057', kind: 'research'}
  ],
  families: [{
    id: 'averages', title: 'Sharing circles',
    mathematics: 'Squares keep fixed numbers and each circle must equal the average of every place joined to it, all at once: the discrete Dirichlet problem on a finite graph. If every circle can reach a square there is exactly one filling, and every circle lies between the smallest and biggest square of its component (the maximum principle). A circle equals the biggest square only if its whole circle group, and every square that group touches, is that big: from a highest circle every neighbour is forced equal, until a square stops the chain. Whole-number squares can force fractions: on a path of L steps the circles are whole exactly when L divides the difference of the ends. With no squares, only constant fillings work.',
    rules: RULES,
    sourceIds: SOURCES
  }]
};
await writeFile(new URL('../dist/families/averages/averages.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
console.log(table.map(r => r.join(' | ')).join('\n'));
console.log(`Wrote ${puzzles.length} puzzles.`);
