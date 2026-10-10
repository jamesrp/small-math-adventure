// Authoring list for Squares, a group in Tile gardens (worksheet Week 32,
// squares inside rectangles, and its bonus "Square recipes encore"). Computes
// every puzzle's answer with the mechanic's own searches (fewest squares, 2s
// and 3s fillings, the line certificate, the biggest-square rule), checks
// them against the table in docs/squares/README.md, and writes
// dist/families/squares/squares.json. Run: node scripts/build-squares.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fewestCover, fewestOf, fillCover, certificateFor, cutsOf, sizesOf, recipeOf, lastOf, firstOf, kindsOf, maxThrees} from '../dist/families/squares/squaremath.js';
import {designTargets, fourKeys} from '../dist/families/squares/squares.js';

const sources = ['squares-week32', 'squares-bonus32', 'squares-card32'];
const PLACE = 'Drag from one corner of a square to the opposite corner, or tap the two corners; tap one square twice for the smallest square. Tap a square to lift it; Clear lifts them all.';
const CONTROLS = {
  fewest: `${PLACE} Press Done when you think no filling uses fewer squares.`,
  fill: `${PLACE} Only 2 by 2 and 3 by 3 squares. Once a square is down, Can’t puts a tab beside each row and below each column: tap tabs to pick lines, and tap a tab again to drop it.`,
  four: 'Tap where a square’s top-left corner goes, or drag one out from a corner. Tap a square to lift it; Clear lifts them all.',
  design: 'Tap a square of the grid to stretch the rectangle to it, or drag its corner; arrow keys move the corner too. Press Cut to run the biggest-square rule, and change the rectangle to try again.',
  playground: 'Tap a square of the grid to stretch the rectangle to it, or drag its corner; arrow keys move the corner too. Cut takes the biggest square off one end of what is left; press it again for the next.'
};
const RULE = 'The biggest-square rule cuts the largest square from one end of the rectangle and repeats on what is left. The last square it cuts is ringed.';
const RULES = {
  fewest: ['Squares of any whole size, with edges on the grid lines, no gaps and no overlaps.', 'Done says no filling uses fewer squares. The app checks; if fewer fit, it says so, and that count stays answered.'],
  fill: ['Only 2 by 2 and 3 by 3 squares, with edges on the grid lines, no gaps and no overlaps.', 'Solved when the rectangle is full, or with a right Can’t.', 'Can’t comes after a try, with at least one square on the board. Then pick rows, or columns, that each need a 3 by 3 square of their own, more of them than 3 by 3 squares fit. One 3 by 3 square crosses three neighbouring lines, so picked lines are at least three apart; a row and a column can share one.'],
  four: ['Each rectangle uses all four 3 by 3 squares, side to side.', `When the four make a rectangle, the app runs the rule on it. ${RULE}`, 'A rectangle turned round is the same one.'],
  design: [`Cut runs the rule. ${RULE}`, 'The first square is the first one cut.'],
  playground: [RULE]
};
const OBJECTIVE = {
  fewest: ['Fill the rectangle with as few squares as you can, then press Done.', 'Fill it with as few squares as you can.'],
  fill: ['Fill the rectangle with 2 by 2 and 3 by 3 squares, or press Can’t and pick rows or columns that each need their own 3 by 3 square, more than fit.', ''],
  four: ['Make two rectangles from the four 3 by 3 squares whose last squares are different sizes.', 'Make two rectangles with different last squares.']
};
const PREREQ = {
  fewest: 'None to start: drag squares from corner to corner. Counting to about ten; square numbers (1, 4, 9, 16, 25) help explain why fewer can’t fit.',
  fill: 'Telling odd lengths from even; counting to 7. Reading the Can’t rule with a grown-up the first time.',
  four: 'None: tap to place squares. The app runs the rule.',
  design: 'Reading numbers up to 15. The app runs the rule; multiplication facts help to plan.'
};

// The table in docs/squares/README.md.
const PUZZLES = [
  {n: 1, level: 'easy', mode: 'four', title: 'Four threes', q: {cols: 12, rows: 12, size: 3, count: 4, need: 2},
    check: {keys: ['12x3', '6x6'], lasts: [3, 6]},
    idea: 'Four equal squares make a long strip or a big square, and the rule ends on a different size for each: 3 for 12 by 3, 6 for 6 by 6.',
    hints: ['Put the four squares side to side to make a rectangle, and look at its last square.', 'Lift them and make a different rectangle.', 'One row of four, then two rows of two. The rule cuts 6 by 6 in one piece.'],
    parent: {notice: 'Whether your child makes both the strip and the big square, and sees that the big square is cut in one piece.', prompt: 'Why does the long one end on a 3 and the big square on a 6?', explanation: 'Four 3 by 3 squares fill only two rectangles, 12 by 3 and 6 by 6, up to turning. The rule cuts 12 by 3 into four 3s, so its last square is 3, and cuts 6 by 6 in one piece, a 6. The last square is always the largest square whose equal copies fill the rectangle: 3 fills 12 by 3 and 6 does not; 6 fills 6 by 6.', extension: 'Which rectangles can six 2 by 2 squares make? Do their last squares match? (12 by 2 and 6 by 4 both end on 2.)', connection: 'The last square of the biggest-square rule is the greatest common divisor of the sides.'},
    provenance: 'Week 32 K–1 Problem 5: every rectangle of four 3 by 3 squares (3 by 12 and 6 by 6) and whether their last squares match.'},
  {n: 2, level: 'easy', mode: 'fewest', title: 'Four by three', q: {cols: 4, rows: 3}, check: {fewest: 4, rule: 4},
    idea: 'Biggest first works here: a 3 by 3 and three 1s. Three squares can’t fill it.',
    hints: ['Fill it, then count. Could fewer squares fill it?', 'Try the biggest square that fits first.', 'A 3 by 3 and three 1 by 1 squares make four. Could three squares have area 12?'],
    parent: {notice: 'Whether your child counts the squares and tries for fewer before pressing Done.', prompt: 'Could three squares fill it?', explanation: 'A 3 by 3 and three 1s make four. Fewer can’t: one or two of the square numbers 1, 4 and 9 never add to 12, and the only three that do are 4 + 4 + 4. Three 2 by 2 squares in a rectangle 3 tall would each take two of its rows, so no two can sit one above the other; side by side they need 6 across, and there are 4.', extension: 'Is the biggest square first always fewest? Puzzle 4 says no.', connection: 'How few squares can tile a rectangle is a research question (Kenyon, 1996).'},
    provenance: 'Week 32 bonus Problem 1, the 4 by 3 board, where the rule’s four is fewest.'},
  {n: 3, level: 'easy', mode: 'fill', title: 'Five by two', q: {cols: 5, rows: 2}, check: {fills: false, claim: {dir: 'row', at: [0]}},
    idea: 'A row of 5 can’t be all 2s, so it needs a 3 by 3 square, and none fits in 2 rows.',
    hints: ['Try to fill it. What is left over?', 'Can 2 by 2 squares make a row of 5?', 'Press Can’t and tap one row.'],
    parent: {notice: 'Whether your child sees that 2s only make even lengths.', prompt: 'Why does a row of 5 need a 3?', explanation: 'Every square that crosses a row covers 2 or 3 of its squares. 2s alone always cover an even number, so a row of 5 needs a 3 by 3 square across it. A 3 by 3 square is taller than this rectangle, so it can’t be filled.', extension: 'Which strips 2 tall can be filled? (Even lengths, with 2s.)', connection: 'Even plus even is even: a parity argument.'},
    provenance: 'New: an entry to Week 32 bonus Problem 3 (fill with only 2s and 3s).'},
  {n: 4, level: 'medium', mode: 'fewest', title: 'Six by five', q: {cols: 6, rows: 5}, check: {fewest: 5, rule: 6},
    idea: 'The rule cuts a 5 by 5 and five 1s, six squares; five fit, two 3s over three 2s.',
    hints: ['Fill it the biggest-square way and count.', 'Try squares that are not the biggest: a 6 by 3 strip and a 6 by 2 strip.', 'Two 3 by 3 squares fill one strip and three 2 by 2 squares the other.'],
    parent: {notice: 'Many children put the 5 by 5 down first and end with six.', prompt: 'Is the biggest square first always fewest?', explanation: 'The rule uses a 5 by 5 and five 1s: six. Two 3 by 3 squares over three 2 by 2 squares make five. Four can’t: the only four square numbers that add to 30 are 16 + 9 + 4 + 1, and a 4 by 4 and a 3 by 3 can’t sit apart in 6 by 5 (4 + 3 is more than 6 across and more than 5 down). Three would be 25 + 4 + 1, where the 5 and the 2 clash the same way, and two square numbers never make 30.', extension: 'Find another rectangle where biggest first is not fewest. (Puzzle 8.)', connection: 'A greedy choice need not be the best one.'},
    provenance: 'Week 32 bonus Problems 1 and 2: the rule’s six against the fewest, five, on 6 by 5.'},
  {n: 5, level: 'medium', mode: 'fill', title: 'Six by five, twos and threes', q: {cols: 6, rows: 5}, check: {fills: true},
    idea: 'Area 30 is two 9s and three 4s, and they fit: a strip of 3s over a strip of 2s.',
    hints: ['A column of 5 can’t be all 2s.', 'Fill a 6 by 3 strip with 3 by 3 squares.', 'Two 3 by 3 squares on top, three 2 by 2 squares below.'],
    parent: {notice: 'Whether your child reuses the five-square filling from puzzle 4.', prompt: 'Why does 6 by 5 fill when 5 by 5 does not?', explanation: 'Two 3 by 3 squares fill a 6 by 3 strip and three 2 by 2 squares a 6 by 2 strip. A rectangle with both sides at least 2 fills with 2s and 3s exactly when both sides are even, or both are multiples of 3, or one side is a multiple of 6; here 6 is.', extension: 'Fill 7 by 6 with 2s and 3s.', connection: 'Which rectangles two square sizes fill is a classical tiling question; area alone does not decide it.'},
    provenance: 'Week 32 bonus Problem 3, the 6 by 5 board.'},
  {n: 6, level: 'medium', mode: 'design', title: 'Last square 3', q: {goal: 'last', cols: 12, rows: 12, last: 3, need: 3}, check: {firsts: {3: ['3x3', '3x6', '3x9', '3x12', '6x3', '9x3', '12x3'], 6: ['6x9', '9x6'], 9: ['9x12', '12x9']}},
    objective: ['Make three rectangles, up to 12 by 12, whose last square is 3, each with a different first square. Press Cut to run the biggest-square rule.', 'Make three rectangles with last square 3 and different first squares.'],
    extraRule: 'A rectangle whose last square is 3 is kept, unless one with the same first square is kept already.',
    idea: 'The last square measures both sides, so every side is a multiple of 3; first squares 6 and 9 need 9 by 6 and 12 by 9.',
    hints: ['Try a few rectangles and cut each one. Which ones end on a 3?', 'Every side is a multiple of 3. Which rectangle starts with a 6 and still ends on a 3?', '9 by 6 starts with a 6, and 12 by 9 with a 9.'],
    parent: {notice: 'Whether your child switches to sides that are multiples of 3 after a few cuts.', prompt: 'Why must both sides be multiples of 3?', explanation: 'The last square is the largest square whose equal copies fill the rectangle, so 3 divides both sides and no bigger number divides both. Within 12 the sides are 3, 6, 9 or 12, and the first square is the shorter side. First square 3: 3 by 3, 6 by 3, 9 by 3 or 12 by 3. First square 6 needs 9 as the other side (6 by 12 ends on 6), and first square 9 needs 12. So every answer has 9 by 6 and 12 by 9.', extension: 'Make three rectangles within 12 that end on 2, with different first squares.', connection: 'Euclid’s algorithm: the last square is the greatest common divisor.'},
    provenance: 'Week 32 grades 2–3 Problem 6: three rectangles with different first squares and last square 3, sides from 3, 6, 9 and 12.'},
  {n: 7, level: 'medium', mode: 'fill', title: 'Five by five', q: {cols: 5, rows: 5}, check: {fills: false, claim: {dir: 'row', at: [0, 3]}},
    idea: 'Rows 1 and 4 each need their own 3 by 3 square, and two never fit in 5 by 5.',
    hints: ['Try to fill it. Where can a 3 by 3 square go?', 'Every row of 5 needs a 3 by 3 square across it. Can one cross both row 1 and row 4?', 'Press Can’t and tap rows 1 and 4.'],
    parent: {notice: 'Whether your child sees that area (25 is four 4s and a 9) is not enough.', prompt: 'Why do rows 1 and 4 need different 3s?', explanation: 'A row of 5 can’t be all 2s, so a 3 by 3 square crosses every row. One crosses three neighbouring rows, so rows 1 and 4 need two different ones. Two 3 by 3 squares never fit in 5 by 5: 3 + 3 is more than 5 across and down. The bonus guide argues the same way along the top and bottom edges.', extension: 'Which squares fill with 2s and 3s? (Those with an even side or a side that is a multiple of 3.)', connection: 'Packing bounds: a rectangle holds at most (width ÷ 3) × (height ÷ 3) squares of side 3, rounding down.'},
    provenance: 'Week 32 bonus Problem 3, the 5 by 5 board.'},
  {n: 8, level: 'medium', mode: 'fewest', title: 'Seven by six', q: {cols: 7, rows: 6}, check: {fewest: 5, rule: 7},
    idea: 'The rule cuts a 6 and six 1s; five fit: a 4, two 3s and two 2s.',
    hints: ['Count the biggest-square way first.', 'Try a 4 by 4 in a corner.', '4 by 4 at the top left, two 3 by 3 squares down the right, two 2 by 2 squares under the 4.'],
    parent: {notice: 'Whether your child looks for squares whose sides add up to 7 and to 6.', prompt: 'Which two squares fit across the top exactly?', explanation: 'The rule uses a 6 by 6 and six 1s: seven. Five fit: a 4 by 4 in a corner, two 3 by 3 squares in the strip 3 wide beside it, two 2 by 2 squares under the 4. Four can’t: the only ways to make 42 from four square numbers are 36 + 4 + 1 + 1, 25 + 9 + 4 + 4 and 16 + 16 + 9 + 1, and each has two squares whose sides add to more than 7, which can’t sit apart; three would be 25 + 16 + 1, with the same clash.', extension: 'Is there a rectangle where the rule uses twice as many as the fewest? (10 by 9: ten against six.)', connection: 'Two squares that don’t overlap sit side by side or one above the other, so their sides fit across or down.'},
    provenance: 'New: another rectangle where the rule is not fewest, after Week 32 bonus Problems 1 and 2.'},
  {n: 9, level: 'hard', mode: 'design', title: 'Recipe 2, 1, 2', q: {goal: 'recipe', cols: 12, rows: 12, recipe: [2, 1, 2]}, check: {answers: ['8x3', '3x8']},
    objective: ['Make a rectangle, up to 12 by 12, that the biggest-square rule cuts into 2 equal squares, then 1 smaller square, then 2 smaller still. Press Cut to check.', 'Make a rectangle whose cuts follow the card.'],
    extraRule: 'The card counts the squares of each size the rule cuts, largest size first: 2, then 1, then 2. The sizes are left out.',
    idea: 'Build backwards from the smallest squares: two 1s make 2 by 1, one 2 makes 3 by 2, two 3s make 8 by 3.',
    hints: ['Start from the end: the last two squares are equal and make a small rectangle together.', 'Two 1 by 1 squares make 2 by 1. One square on its long side makes the rectangle before it.', '8 by 3: the rule cuts 3, 3, then 2, then 1, 1.'],
    parent: {notice: 'Whether your child builds from the last squares or tries sizes at random.', prompt: 'Could a bigger rectangle follow the same card?', explanation: 'Backwards: two equal last squares of side 1 make 2 by 1. One square on its long side makes 3 by 2. Two squares of 3 on that make 8 by 3. Doubling every length (16 by 6) keeps the card, so a card fixes a rectangle’s shape, not its size; within 12 by 12 only 8 by 3 (or 3 by 8) follows it. The card is the continued fraction 8/3 = 2 + 1/(1 + 1/2).', extension: 'Find the rectangle for the card 1, 1, 3. (7 by 4.)', connection: 'The counts are the partial quotients of the continued fraction of long side over short side.'},
    provenance: 'Week 32 bonus Problem 4, the recipe 2, 1, 2.'},
  {n: 10, level: 'hard', mode: 'fill', title: 'Seven by five', q: {cols: 7, rows: 5}, check: {fills: false, claim: {dir: 'col', at: [0, 3, 6]}},
    idea: 'Columns 1, 4 and 7 each need their own 3 by 3 square, and only two fit side by side.',
    hints: ['Try to fill it. How many 3 by 3 squares fit at once?', 'Every column of 5 needs a 3 by 3 square across it. Which columns need different ones?', 'Press Can’t and tap columns 1, 4 and 7.'],
    parent: {notice: 'Whether your child tries rows first, and why rows of 7 don’t settle it.', prompt: 'Why can’t three 3 by 3 squares fit?', explanation: 'A column of 5 can’t be all 2s, so a 3 by 3 square crosses every column, and columns 1, 4 and 7 need three different ones. Two 3 by 3 squares in a rectangle 5 tall always share a row (3 + 3 is more than 5), so they sit side by side, and three need 9 across where there are 7. Area allows it (35 is two 4s and three 9s), which is why area alone does not decide.', extension: 'Which widths fill when the rectangle is 5 tall? (Multiples of 6.)', connection: 'The lines and the 3s that fit are a certificate: a short reason anyone can check.'},
    provenance: 'Week 32 bonus Problem 3, the 7 by 5 board.'},
  {n: 11, level: 'hard', mode: 'fewest', title: 'Thirteen by eleven', q: {cols: 13, rows: 11}, check: {fewest: 6, rule: 8},
    idea: 'The rule cuts an 11, five 2s and two 1s: eight. Six fit, and none of them is 11.',
    hints: ['The rule uses eight. Try a different first square.', 'Try a 7 by 7 in one corner and a 6 by 6 beside it.', '7 and 6 across the top; under them a 4, a 4, a 1 and a 5.'],
    parent: {notice: 'Whether your child gives up the biggest square and looks for sides that add to 13 and 11.', prompt: 'Which two squares fit across the top exactly?', explanation: 'The rule uses an 11, then five 2s and two 1s: eight. Six fit: 7 and 6 across the top, then 4, 4, a 1 and a 5 below. Showing that five can’t is a long case check; the app’s search tries every way.', extension: 'What does the rule give for 13 by 8? (Six squares in five sizes: puzzle 12.)', connection: 'How few squares can tile a rectangle is a research question (Kenyon, 1996).'},
    provenance: 'New: a 13 by 11 board, after Week 32 bonus Problems 1 and 2.'},
  {n: 12, level: 'hard', mode: 'design', title: 'Five sizes', q: {goal: 'kinds', cols: 15, rows: 15, kinds: 5}, check: {answers: ['13x8', '8x13']},
    objective: ['Make a rectangle, up to 15 by 15, that the biggest-square rule cuts into squares of five different sizes. Press Cut to check.', 'Make a rectangle whose cuts have five different sizes.'],
    idea: 'Each size is at least the next two together, so the sides grow like 1, 2, 3, 5, 8, 13: 13 by 8 is the only one within 15.',
    hints: ['Small squares come last. Build up from the end: a 1, then a 2, then a 3.', 'Each size is at least the sum of the next two.', '13 by 8.'],
    parent: {notice: 'Whether your child builds up from small squares, or tries rectangles one after another.', prompt: 'Why do the sides of the best rectangle go 1, 2, 3, 5, 8, 13?', explanation: 'Each new size is one division step of Euclid’s algorithm. The sides shrink slowest when each step cuts one square, until the last cuts two; then each size is the sum of the next two, and the sides are Fibonacci numbers: 3 by 2, 5 by 3, 8 by 5 and 13 by 8 for five sizes. Within 15, 13 by 8 (turned or not) is the only rectangle with five; six need 21 by 13.', extension: 'Which rectangles within 15 have four sizes? (Eight, up to turning: 8 by 5, 13 by 5, 11 by 7, 12 by 7, 11 by 8, 14 by 9, 14 by 11 and 15 by 11.)', connection: 'Lamé (1844): Euclid’s algorithm takes the most steps on consecutive Fibonacci numbers.'},
    provenance: 'Week 32 grades 4–5 Problem 6 (the most different sizes, longer side 9 to 15 and shorter 2 to 8), set here as a target within 15 by 15.'}
];

const id = n => `squares-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  const q = {mode: item.mode, ...item.q}, c = item.check;
  let solution;
  if (item.mode === 'fewest') {
    const best = fewestCover(q.cols, q.rows, [], q.cols * q.rows);
    assert.equal(best.length, c.fewest, `${id(item.n)}: fewest`);
    assert.equal(sizesOf(q.cols, q.rows).length, c.rule, `${id(item.n)}: the rule's count`);
    q.fewest = best.length;
    solution = {fewest: best, rule: cutsOf(q.cols, q.rows)};
  } else if (item.mode === 'fill') {
    q.sizes = [2, 3];
    const filling = fillCover(q.cols, q.rows, [], q.sizes);
    assert.equal(Boolean(filling), c.fills, `${id(item.n)}: fills`);
    if (filling) solution = {filling};
    else {
      const claim = certificateFor(q.cols, q.rows);
      assert.deepEqual(claim, c.claim, `${id(item.n)}: certificate`);
      solution = {claim, threesFit: maxThrees(q.cols, q.rows)};
    }
  } else if (item.mode === 'four') {
    assert.deepEqual(fourKeys(q.size), c.keys, `${id(item.n)}: rectangles of four`);
    assert.deepEqual(c.keys.map(k => lastOf(...k.split('x').map(Number))), c.lasts, `${id(item.n)}: last squares`);
    solution = {rectangles: c.keys, lasts: c.lasts};
  } else {
    const targets = designTargets(q).map(([w, h]) => `${w}x${h}`);
    if (q.goal === 'last') {
      const byFirst = {};
      for (const t of targets) { const [w, h] = t.split('x').map(Number); (byFirst[firstOf(w, h)] ||= []).push(t); }
      const sortKey = t => t.split('x').map(Number);
      for (const k of Object.keys(byFirst)) byFirst[k].sort((a, b) => sortKey(a)[0] - sortKey(b)[0] || sortKey(a)[1] - sortKey(b)[1]);
      const want = Object.fromEntries(Object.entries(c.firsts).map(([k, v]) => [k, [...v].sort((a, b) => sortKey(a)[0] - sortKey(b)[0] || sortKey(a)[1] - sortKey(b)[1])]));
      assert.deepEqual(byFirst, want, `${id(item.n)}: rectangles by first square`);
      solution = {firsts: byFirst};
    } else {
      assert.deepEqual([...targets].sort(), [...c.answers].sort(), `${id(item.n)}: answers`);
      solution = {answers: targets, cuts: targets.map(t => sizesOf(...t.split('x').map(Number)))};
    }
  }
  const objective = item.objective || OBJECTIVE[item.mode];
  return {
    id: id(item.n), number: item.n, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'squares', libraryFamily: 'tile', group: 'Squares', familyTitle: 'Tile gardens', revision: 1, sourceDocument: 'docs/squares/README.md',
    parameters: q, objective: objective[0], visibleObjective: objective[1], instruction: objective[0],
    controls: CONTROLS[item.mode], rules: [...RULES[item.mode], ...(item.extraRule ? [item.extraRule] : [])],
    idea: item.idea, prerequisites: PREREQ[item.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: item.mode === 'fewest' ? [...sources, 'squares-kenyon'] : item.mode === 'design' || item.mode === 'four' ? [...sources, 'squares-euclid'] : sources},
    solution, provenance: item.provenance
  };
});

// Every number the copy names, checked once more.
assert.equal(fewestOf(10, 9), 6, '10 by 9: six');
assert.equal(sizesOf(10, 9).length, 10, '10 by 9: the rule uses ten');
assert.deepEqual(recipeOf(7, 4), [1, 1, 3], '7 by 4: recipe 1, 1, 3');
assert.equal(kindsOf(21, 13), 6, '21 by 13: six sizes');
assert.equal(designTargets({goal: 'kinds', kinds: 4, cols: 15, rows: 15}).filter(([w, h]) => w > h && kindsOf(w, h) === 4).length, 8, 'four sizes within 15: eight up to turning');
assert.deepEqual(fewestCover(13, 11, [], 13 * 11).map(s => s[2]).sort((a, b) => a - b), [1, 4, 4, 5, 6, 7], '13 by 11: 7, 6, 5, 4, 4, 1');

const playground = {
  id: 'squares-play', number: 0, title: 'Squares playground', band: 'playground', difficulty_level: 'playground', mechanic: 'squares', libraryFamily: 'tile', familyTitle: 'Tile gardens', revision: 1, sourceDocument: 'docs/squares/README.md',
  parameters: {mode: 'playground', cols: 15, rows: 15, start: [5, 2]},
  objective: 'Size a rectangle and cut its biggest squares one at a time.', visibleObjective: '', instruction: 'Size a rectangle and cut its biggest squares one at a time.',
  controls: CONTROLS.playground, rules: RULES.playground,
  idea: 'Free play with the biggest-square rule. The cuts are forced, so this is for watching them, not a puzzle.',
  prerequisites: 'None: the app cuts the squares. Reading numbers to 15 helps.',
  hints: ['Make a long thin rectangle and cut it.', 'Make a rectangle whose sides are both even. What is its last square?', 'Try 13 by 8.'],
  parent: {notice: 'Whether your child starts to say the next square before pressing Cut.', prompt: 'Which rectangles end with a big last square?', explanation: 'Cutting the biggest square from an a by b rectangle leaves (a − b) by b, which has the same common divisors, so the last square has side gcd(a, b): Euclid’s algorithm, drawn.', extension: 'Find a rectangle that takes many cuts but is not very big.', connection: 'Euclid’s algorithm, and continued fractions.', sourceIds: [...sources, 'squares-euclid']},
  provenance: 'Week 32, the shared rule and its 5 by 2 example on every packet’s first page; the card calls tapping through the forced cuts a playground.'
};

const json = {
  title: 'Squares',
  version: 1,
  families: [{id: 'squares', title: 'Tile gardens: squares', mathematics: 'Square pieces on a rectangle. The biggest-square rule cuts the largest square from one end and repeats on what is left. Cutting a × b to (a − b) × b keeps every common divisor and the sides shrink, so the last square has side gcd(a, b), the largest square whose equal copies fill the rectangle: Euclid’s algorithm, drawn. The counts of equal squares are the partial quotients of the continued fraction of the sides, and the most sizes within a range come from consecutive Fibonacci numbers (13 by 8 has five within 15). The rule is not always fewest: 6 by 5 needs 5 squares where the rule uses 6, and 13 by 11 needs 6 where it uses 8. With only 2 by 2 and 3 by 3 squares, a rectangle fills exactly when both sides are even, both are multiples of 3, or one side is a multiple of 6. A row of odd length can’t be all 2s, so a 3 by 3 square crosses it; more such lines, three apart, than 3 by 3 squares fit is a certificate that it can’t be filled.', rules: RULES.fewest, sourceIds: [...sources, 'squares-euclid', 'squares-kenyon']}],
  sources: [
    {id: 'squares-week32', title: 'Bellingham Math Circle — Week 32: Squares inside rectangles (K–1, grades 2–3 and grades 4–5 packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-32', kind: 'local curriculum'},
    {id: 'squares-bonus32', title: 'Bellingham Math Circle — Week 32 bonus: Square recipes encore (packet and adult bonus guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-32', kind: 'local curriculum'},
    {id: 'squares-card32', title: 'Week 32 review card (keep, fit B), with its second run: the App fit and the Decision for this group', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-32.md', kind: 'local curriculum'},
    {id: 'squares-euclid', title: 'Euclidean algorithm, Wikipedia: the rectangle cut into squares, continued fractions, and Lamé’s theorem on Fibonacci numbers', url: 'https://en.wikipedia.org/wiki/Euclidean_algorithm', kind: 'reference'},
    {id: 'squares-kenyon', title: 'Richard Kenyon — Tiling a rectangle with the fewest squares, Journal of Combinatorial Theory, Series A 76 (1996), 272–291', url: 'https://doi.org/10.1006/jcta.1996.0104', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/squares/squares.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode}${p.parameters.goal ? `/${p.parameters.goal}` : ''} ${p.parameters.cols}x${p.parameters.rows} ${JSON.stringify(p.solution).slice(0, 90)}`).join('\n'));
