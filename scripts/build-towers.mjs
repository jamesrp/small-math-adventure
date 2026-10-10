// Authoring list for Tower cities (worksheet Week 5), a group in Symbol
// Orchard. Computes every puzzle's answers with the mechanic's own search over
// rows and Latin squares, checks them against the table in
// docs/towers/README.md, and writes dist/families/towers/towers.json.
// scripts/validate-towers.mjs checks them again by other methods.
// Run: node scripts/build-towers.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rowsFor, tallestPlaces, cities, fitting, clueArray, certificates, cityKey, viewsOf, singlingOut, designSets, slotWords} from '../dist/families/towers/towers.js';

const SEE = 'You see a tower when it is taller than every tower in front of it.';
const RULES = {
  row: [SEE, 'Each end number counts the towers seen looking along the row from that end.'],
  city: [SEE, 'A city has one tower of each height in every row and every column.', 'An edge number counts the towers seen looking along its row or column from that side.']
};
const CONTROLS = {
  row: 'Tap a tower, then another, to swap them, or drag one onto another. Tap an end number to look from that end: the towers it sees light up. After a swap, press No row if no row shows both numbers; a wrong No row is refused.',
  city: 'Tap a square, then a height below it, or type the height; Clear empties the square. When a row or column is full, tap its edge number to look along it. After placing a height, press No city, then tap beside the row or above the column whose tallest tower has no place; a wrong No city is refused.',
  every: 'Tap a square, then a height below it, or type the height. Each city that fits is kept below the grid. Press That’s all when you have every one. Then tap an empty edge place and a number to add it there; tap a city below to show it in the grid.',
  design: 'Tap an edge place to show this city’s number there, and tap it again to hide it. The beads show how many numbers you may show. Beside the city, another city that fits the numbers shown appears, if there is one.',
  twins: 'Tap a square, then a height below it, or type the height. When a row or column is full, tap its edge number to look along it. The small grid is the first city.'
};
const OBJECTIVE = {
  row: ([L, R]) => `Arrange the towers so that the left end sees ${L} and the right end sees ${R}, or say that no row can.`,
  city: () => 'Build a city that fits the edge numbers, or say that no city does.',
  every: () => 'Find every city that fits the edge numbers and press That’s all. Then add one edge number so that only one of them fits.',
  design: budget => `Show at most ${budget} of this city’s edge numbers so that no other city fits them.`,
  twins: () => 'Build a different city with the same sixteen edge numbers.'
};
const VISIBLE = {
  row: 'Make each end see its number.',
  city: 'Build a city that fits the edge numbers.',
  every: 'Find every city that fits, then add one number so only one does.',
  design: 'Show numbers so that only this city fits.',
  twins: 'Build a different city with the same sixteen numbers.'
};
const sources = ['towers-week05', 'towers-card05', 'towers-records', 'towers-latin', 'towers-tatham'];
const grid = rows => rows.split('/').join('').split('').map(Number);
const C = (top, right, bottom, left) => ({top, right, bottom, left});
const none = n => Array(n).fill(0);

const PUZZLES = [
  {number: 1, level: 'easy', title: 'A card of 2 and 1', mode: 'row', order: 3, card: [2, 1], start: [1, 2, 3], check: {rows: ['213']},
    prereq: 'Count to 3 and compare heights. No reading; a grown-up can read How to play.',
    idea: 'Seeing just 1 from an end puts the tallest tower at that end.',
    hints: ['Which tower can always be seen, from both ends?', 'The right end sees just 1, so the 3 stands at the right end.', 'Swap the 1 and the 2: the row 2, 1, 3.'],
    parent: {notice: 'Whether your child gets down to the row’s level and counts only the towers that stick up above the ones in front.', prompt: 'Which tower do you always see?', explanation: 'The tallest tower is seen from both ends, and it hides everything behind it. Seeing only 1 tower from the right means the tallest is the first tower from the right, so the 3 is at the right end. Then the left end sees the first tower and the 3, so the first tower must be taller than the second: 2, 1, 3. It is the only row for this card.', extension: 'Which card does the row 1, 3, 2 show? (2 and 2.)', connection: 'The towers seen from an end are the records (left-to-right maxima) of a permutation.'},
    provenance: 'Week 5 K–1 Problem 3, the 2-and-1 card (also grades 2–3 Problem 1).'},
  {number: 2, level: 'easy', title: 'A card of 1 and 1', mode: 'row', order: 3, card: [1, 1], start: [2, 1, 3], check: {rows: []},
    prereq: 'Count to 3. No reading; a grown-up can read How to play.',
    idea: 'No row shows 1 from both ends: the tallest tower can’t stand at both ends.',
    hints: ['Where must the 3 stand for the left end to see just 1?', 'And where must it stand for the right end to see just 1?', 'The 3 can’t stand at both ends. Press No row.'],
    parent: {notice: 'Whether your child tries several rows before saying no, and what reason they give.', prompt: 'Can a row ever show just 1 from both ends? Why not?', explanation: 'To see only 1 tower from the left, the tallest must stand first from the left; to see only 1 from the right, it must stand first from the right. There is only one tallest tower, so no row of two or more towers shows 1 and 1. After a swap and No row, two lanes under the child’s own row show where each end number allows the tallest (the left end for one, the right end for the other), with a cross under the child’s 3 in the lane that bars it.', extension: 'Which other cards can no row of three show? (3 and 3, 2 and 3, 3 and 2.)', connection: 'Every permutation has its largest entry as a record from both ends.'},
    provenance: 'Week 5 K–1 Problem 3, the 1-and-1 X card, and the session’s sharing question.'},
  {number: 3, level: 'easy', title: 'Five edge numbers', mode: 'city', order: 3, clues: C([0, 1, 3], [0, 2, 1], none(3), [2, 0, 0]), check: {cities: ['231312123']},
    prereq: 'Fill a 3-by-3 grid with one of each height in every row and column; count the towers seen along a line.',
    idea: 'A 1 on the edge puts the tallest tower next to it; a 3 makes its line climb 1, 2, 3.',
    hints: ['Find a 1 on the edge. Where must the 3 stand?', 'A 3 on the edge sees every tower, so its line climbs 1, 2, 3.', 'The 1 above column 2 puts a 3 at its top; the 3 above column 3 makes it 1, 2, 3 going down.'],
    parent: {notice: 'Whether your child starts from the 1s and the 3, or fills squares and checks afterwards.', prompt: 'What does a 1 on the edge tell you? And a 3?', explanation: 'A 1 means the tallest tower is the first one seen, so it stands next to the 1: a 3 at the top of column 2 and at the right end of row 3. A 3 means every tower is seen, so the line climbs 1, 2, 3 away from the number: column 3 reads 1, 2, 3 going down. The rest follows from one of each height in every row and column, and the city is 231/312/123, the only one.', extension: 'Remove one edge number. Does the city stay the only one?', connection: 'Each edge number restricts its line to the permutations with that many records; the city is the one Latin square that every line allows.'},
    provenance: 'Week 5 grades 2–3 Problem 3, puzzle 1.'},
  {number: 4, level: 'medium', title: 'A card of 4 and 2', mode: 'row', order: 4, card: [4, 2], start: [1, 2, 3, 4], check: {rows: []},
    prereq: 'Count to 4 and think about where the tallest tower stands.',
    idea: 'With the tallest in place j, the left end sees at most j towers and the right at most n + 1 − j.',
    hints: ['What must the row be for the left end to see all 4?', 'Seeing all 4 from the left needs 1, 2, 3, 4 in order, with the 4 last.', 'Then the right end sees only the 4. Press No row.'],
    parent: {notice: 'Whether your child notices that keeping the left end at 4 leaves only one row.', prompt: 'If you see all 4 towers from the left, how many can you see from the right?', explanation: 'The tallest tower is seen from both ends, and the towers seen from the left stand at or before it, those from the right at or after it. Seeing 4 from the left puts the 4 last, so the right end sees just the 4. In general, with the tallest in place j, L ≤ j and R ≤ n + 1 − j, so L + R ≤ n + 1; here 4 + 2 = 6 > 5.', extension: 'Which cards of four towers have a row? (Every L and R from 1 to 4 with L + R ≤ 5, except 1 and 1.)', connection: 'L + R ≤ n + 1 holds for every permutation, with equality exactly for the 2^(n−1) rows that rise to the tallest and then fall.'},
    provenance: 'Week 5 K–1 Problem 7, the 4-and-2 X card (also grades 4–5 Problem 1).'},
  {number: 5, level: 'medium', title: 'A card of 2 and 3', mode: 'row', order: 4, card: [2, 3], start: [2, 1, 4, 3], check: {rows: ['1432', '2431', '3421']},
    prereq: 'Count to 4 and think about where the tallest tower stands.',
    idea: 'Seeing 3 from the right needs two towers to the right of the 4, rising toward it.',
    hints: ['How many towers must stand to the right of the 4 for the right end to see 3?', 'The 4 is seen from both ends. Seeing 3 from the right needs two towers after it, the nearer one taller.', 'Put the 4 second, then 3, 2 going down: 1, 4, 3, 2.'],
    parent: {notice: 'Whether your child moves the 4 first, or swaps the small towers until the numbers come out.', prompt: 'Where must the 4 stand? Why?', explanation: 'The right end sees the 4 and the records before it from the right, so seeing 3 from the right needs two towers right of the 4, the one nearer the 4 taller. Seeing 2 from the left needs exactly one tower left of the 4. So the 4 is second, and the last two go down: 1432, 2431 or 3421. Any of them solves the puzzle.', extension: 'How many rows of four show 2 from each end? (Six.)', connection: 'Rows with records (a, b) number C(a + b − 2, a − 1) times the Stirling number c(n − 1, a + b − 2): here C(3, 1) · 1 = 3.'},
    provenance: 'Week 5 K–1 Problem 7, the 2-and-3 card (also grades 4–5 Problem 1).'},
  {number: 6, level: 'medium', title: 'Twos along the top', mode: 'city', order: 3, clues: C([2, 2, 2], none(3), none(3), none(3)), check: {cities: [], line: 'left of row 1'},
    prereq: 'Puzzle 3. Think about where the tallest tower of a row can stand.',
    idea: 'The top row’s 3 stands at the top of some column, and looking down that column you would see only the 3.',
    hints: ['Pick a 2 on top. Which squares of its column can hold the 3?', 'Now look at the top row. Where can its 3 stand?', 'Wherever the top row’s 3 stands, the number above it would be 1. Press No city and tap beside the top row.'],
    parent: {notice: 'Whether your child keeps trying cities, or stops to ask where the top row’s 3 can go.', prompt: 'If the 3 stood at the top of column 2, what number would be above it?', explanation: 'The top row has a 3 somewhere, and it is the first tower seen looking down its column, so it hides the other two: that column would show 1, not 2. So no city fits. After No city, the child taps beside the top row, the line whose tallest tower has no place, and each of its squares shows the 2 that rules it out.', extension: 'Change one of the 2s to make a puzzle that has a city. How many cities does it have?', connection: 'A clue set can fit no Latin square; here a single line already fails, which is the simplest kind of certificate.'},
    provenance: 'Week 5 grades 2–3 Problem 3, puzzle 3 (2, 2, 2 above, no city), with the guide’s “why not”.'},
  {number: 7, level: 'medium', title: 'A 1 and a 2', mode: 'every', order: 3, clues: C([1, 0, 0], none(3), none(3), [0, 0, 2]), check: {cities: ['312123231', '321132213', '321213132'], single: 9},
    prereq: 'Puzzle 3. Keep track of the cities found, and compare two cities’ edge numbers.',
    idea: 'Two numbers can fit several cities; one more number, chosen where they differ, picks one out.',
    hints: ['The 1 above column 1: where is the 3 in that column?', 'Row 1 starts with 3. How can it go on?', 'Lay two cities side by side. Which edge number differs?'],
    parent: {notice: 'Whether your child organises the search (row 1 is 312 or 321) or builds cities at random.', prompt: 'How do you know there is no fourth city?', explanation: 'The 1 above column 1 puts the 3 at the top of column 1, so row 1 is 312 or 321. With the 2 left of row 3, row 3 has its 3 in the middle or the end but not first, which leaves three cities: 312/123/231, 321/132/213 and 321/213/132. One more number singles one out where the cities differ: for example 3 above column 2 leaves only the first, 3 below column 1 only the third.', extension: 'Which added numbers leave only the second city? (3 above column 3, 2 below column 2, 1 below column 3, 2 right of row 2, 1 right of row 3.)', connection: 'Finding every completion, then a clue that separates them, is how puzzle makers make a puzzle with one answer.'},
    provenance: 'Week 5 grades 2–3 Problem 4: every city for the 1 above column 1 and the 2 left of row 3, then one more number.'},
  {number: 8, level: 'medium', title: 'Make a puzzle', mode: 'design', order: 3, city: grid('132/321/213'), budget: 2, check: {sets: 13, fewest: 2},
    prereq: 'Puzzle 7. Compare a second city with this one and find a number they show differently.',
    idea: 'One number never fixes a 3-by-3 city, but two can.',
    hints: ['Show one number. Where does the other city differ?', 'Choose a number that the other city shows differently.', 'Try the 3 right of row 2 with one more number.'],
    parent: {notice: 'Whether your child reads the other city to choose the next number, or picks places at random.', prompt: 'Why is one number never enough?', explanation: 'With one number along, say, column 1, swap columns 2 and 3: the result is still a city, the number does not change, and the city is different. So one number always leaves another city, which the app shows at once. Two can be enough: 13 of the 66 pairs of this city’s twelve numbers fit only this city, such as the 3 right of row 2 with the 3 below column 2.', extension: 'How many different pairs of numbers fix this city? (13 of the 66 pairs; the 3 right of row 2 is in six of them.)', connection: 'The fewest clues that determine a Latin square is a critical set; for skyscraper clues on 3-by-3 cities the fewest is 2.'},
    provenance: 'Week 5 grades 2–3 Problem 5 (hide a city with as few numbers as you can), with the app as the partner who looks for a second city.'},
  {number: 9, level: 'hard', title: 'Only twos', mode: 'city', order: 4, clues: C([2, 0, 2, 0], [0, 0, 0, 2], none(4), [0, 2, 0, 0]), check: {cities: ['2134142343123241']},
    prereq: 'Fill a 4-by-4 Latin square, and try a case and check it.',
    idea: 'A 2 on the edge keeps the 4 out of the first square and lets only one tower show in front of it.',
    hints: ['Where can each 4 stand? A 2 keeps it out of the first square.', 'Next to a 2, every tower in front of the 4 except the first is hidden.', 'Build a guess, then tap the edge numbers to look along each line.'],
    parent: {notice: 'Whether your child marks where the 4s can go before filling, and whether they test a guess by looking.', prompt: 'Next to a 2, which squares can the 4 not be in?', explanation: 'A 2 sees the first tower and the 4, so the 4 is not first, and every tower between the first and the 4 is shorter than the first. With four 2s and no 1s or 4s, the solver has to combine lines; going through the rows and columns in turn and keeping what each line allows settles it in about seven passes. The city is 2134/1423/4312/3241, the only one.', extension: 'Could three of these four 2s be enough? (No: dropping any one leaves at least ten cities. Three other numbers of this city can fix it, though.)', connection: 'Puzzles of this kind are Skyscrapers (Towers in Simon Tatham’s collection).'},
    provenance: 'Week 5 grades 4–5 Problem 3, puzzle F (four 2s).'},
  {number: 10, level: 'hard', title: 'Two fours', mode: 'every', order: 4, clues: C([4, 0, 0, 0], none(4), none(4), [4, 0, 0, 0]), check: {cities: ['1234214334124321', '1234214334214312', '1234234134124123', '1234241331424321'], single: 8},
    prereq: 'Fill 4-by-4 Latin squares; compare cities’ edge numbers.',
    idea: 'Some cities can’t be told apart by any edge number.',
    hints: ['What do the two 4s say about row 1 and column 1?', 'Row 2 starts with 2. What can come next?', 'Two of the four cities have the same sixteen numbers. Single out one of the others.'],
    parent: {notice: 'Whether your child, trying to single out one city, finds that some pair never separates.', prompt: 'Which two cities could no number tell apart?', explanation: 'The two 4s make row 1 and column 1 read 1, 2, 3, 4, and four cities fit. One more number singles out the second (3 below column 3 or 4, or 3 right of row 3 or 4) or the third (3 above column 2, 3 left of row 2, 2 below column 4 or 2 right of row 4). The first and fourth, 1234/2143/3412/4321 and 1234/2413/3142/4321, show the same sixteen numbers, so no number picks out either: they differ only in the middle 2-by-2 block, where the 1s are hidden and the 4s are seen either way.', extension: 'Swap the middle 2-by-2 block of another city. When do its edge numbers stay the same?', connection: 'Edge numbers do not always determine a 4-by-4 city: 204 of the 576 share all sixteen with another (puzzle 12).'},
    provenance: 'Week 5 grades 4–5 Problem 4: every city for a 4 above column 1 and a 4 left of row 1, then one more number.'},
  {number: 11, level: 'hard', title: 'Hide a bigger city', mode: 'design', order: 4, city: grid('1234/2341/4123/3412'), budget: 3, check: {sets: 8, fewest: 3},
    prereq: 'Puzzle 8. Read a second city’s differences and choose numbers that rule it out.',
    idea: 'A 4 on the edge fixes a whole line, and two more numbers can finish the city.',
    hints: ['Show a number, then look at where the other city differs.', 'Choose a number that the other city shows differently.', 'The 4 left of row 1 fixes the whole top row.'],
    parent: {notice: 'Whether your child uses the other city’s marked squares to choose the next number.', prompt: 'Which number tells you the most about this city?', explanation: 'No two numbers fit only one 4-by-4 city (a computer check over all 576), so three is the budget. This city has eight sets of three that work, and every one uses the 4 left of row 1, which makes the top row 1, 2, 3, 4; seven also use the 3 left of row 2. Only 208 of the 576 cities can be fixed by three numbers, and 204 can’t be fixed by any number of them.', extension: 'Can you fix this city with three numbers, none of them a 4? (No: every set of three that works uses the 4.)', connection: 'Smallest determining sets (critical sets) of Latin squares; for Sudoku the answer is 17 clues.'},
    provenance: 'Week 5 grades 4–5 Problems 5 and 6 (hide a city with as few numbers as you can), with the app as the partner; the city is one of those that three numbers can single out, as the review card asks.'},
  {number: 12, level: 'hard', title: 'Same sixteen numbers', mode: 'twins', order: 4, city: grid('1234/2143/3412/4321'), check: {twins: ['1234241331424321']},
    prereq: 'Puzzle 10. Fill a 4-by-4 Latin square and look along lines to check them.',
    idea: 'Two different cities can have the same sixteen edge numbers.',
    hints: ['Which towers could change height without any edge number changing?', 'A tower hidden from every side can change without being seen. Which towers are hidden from all four sides?', 'Switch the middle four: the 1s and 4s trade places.'],
    parent: {notice: 'Whether your child looks for squares that no edge number sees, before changing anything.', prompt: 'Why doesn’t switching the middle four change any edge number?', explanation: 'The middle block is 1 4 / 4 1. Rows 2 and 3 and columns 2 and 3 each have a 2 or a 3 at both ends, so from either end you see that tower and the 4 and the 1 is hidden, whichever middle square holds the 4. Switching the block to 4 1 / 1 4 changes no count, and the other rows and columns keep their towers. The new city 1234/2413/3142/4321 is puzzle 10’s fourth city. In all, 204 of the 576 cities share their numbers with another; 152 of the 262 such pairs differ by a switch like this one.', extension: 'Can two 3-by-3 cities have the same twelve numbers? (No: the twelve cities have twelve different sets.)', connection: 'A Latin trade (here an intercalate) that no edge view can detect.'},
    provenance: 'Week 5 grades 4–5 Problem 9 (can two cities share all sixteen numbers?), starting from Problem 4’s city A.'}
];

const id = n => `towers-${String(n).padStart(2, '0')}`;
const keys = list => list.map(c => (Array.isArray(c) ? c : c).join(''));
const out = PUZZLES.map(item => {
  const n = item.order, pid = id(item.number);
  let parameters, solution;
  if (item.mode === 'row') {
    parameters = {mode: 'row', order: n, card: item.card, start: item.start};
    const rows = keys(rowsFor(n, ...item.card));
    assert.deepEqual(rows, item.check.rows, `${pid}: rows for the card`);
    assert.equal(tallestPlaces(n, ...item.card).length > 0, rows.length > 0, `${pid}: the tallest-place rule agrees`);
    assert.ok(!rows.includes(item.start.join('')), `${pid}: the start is not a solve`);
    solution = rows.length ? {rows} : {none: true};
  } else if (item.mode === 'design') {
    parameters = {mode: 'design', order: n, city: item.city, budget: item.budget};
    const p = {id: pid, parameters}, sets = designSets(p);
    assert.equal(sets.length, item.check.sets, `${pid}: sets of numbers that fit only this city`);
    assert.equal(Math.min(...sets.map(s => s.length)), item.check.fewest, `${pid}: fewest numbers`);
    solution = {sets: sets.map(s => s.map(x => [slotWords(n, x), viewsOf(n, item.city)[x]]))};
  } else if (item.mode === 'twins') {
    parameters = {mode: 'twins', order: n, city: item.city};
    const twins = keys(fitting(n, viewsOf(n, item.city)).map(i => cities(n)[i])).filter(k => k !== cityKey(item.city));
    assert.deepEqual(twins, item.check.twins, `${pid}: twin cities`);
    solution = {twins};
  } else {
    parameters = {mode: item.mode, order: n, clues: item.clues};
    const clues = clueArray(n, item.clues), found = keys(fitting(n, clues).map(i => cities(n)[i]));
    assert.deepEqual(found, item.check.cities, `${pid}: cities that fit`);
    if (item.mode === 'city') {
      assert.ok(found.length <= 1, `${pid}: one city or none`);
      if (!found.length) {
        const certs = certificates(n, clues);
        assert.ok(certs.length, `${pid}: a line whose tallest has no place`);
        assert.equal(slotWords(n, certs[0]), item.check.line, `${pid}: the certificate line`);
        solution = {none: true, lines: certs.map(s => slotWords(n, s))};
      } else solution = {cities: found};
    } else {
      const single = singlingOut({id: pid, parameters});
      assert.equal(single.length, item.check.single, `${pid}: added numbers that leave one city`);
      solution = {cities: found, oneMore: single.map(([s, v]) => [slotWords(n, s), v])};
    }
  }
  const objective = item.mode === 'row' ? OBJECTIVE.row(item.card) : item.mode === 'design' ? OBJECTIVE.design(item.budget) : OBJECTIVE[item.mode]();
  return {
    id: pid, number: item.number, title: item.title, difficulty_level: item.level, band: 'all', group: 'Towers', libraryFamily: 'latin', familyTitle: 'Symbol Orchard', mechanic: 'towers', revision: 1, sourceDocument: 'docs/towers/README.md',
    parameters,
    objective, visibleObjective: VISIBLE[item.mode], instruction: objective,
    controls: CONTROLS[item.mode], rules: item.mode === 'row' ? RULES.row : RULES.city,
    idea: item.idea, prerequisites: item.prereq, hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const json = {
  title: 'Tower cities',
  version: 1,
  families: [{id: 'towers', title: 'Symbol Orchard: Towers', mathematics: 'A row of towers 1 to n tall is a permutation, and the towers seen from an end are its records. The tallest is seen from both ends; with it in place j, L ≤ j and R ≤ n + 1 − j, and 1 is seen from an end exactly when the tallest stands there, so (1, 1) never happens and L + R ≤ n + 1. A city is a Latin square, and its edge numbers count the records along each row and column. A set of edge numbers can fit one city, several or none; a line whose tallest tower has no place proves none. The fewest numbers that fix a city are 2 for 3-by-3 and 3 for 4-by-4 (by computer), and 204 of the 576 4-by-4 cities share all sixteen numbers with another.', rules: RULES.city, sourceIds: sources}],
  sources: [
    {id: 'towers-week05', title: 'Bellingham Math Circle — Week 5: Tower cities (K–1, grades 2–3 and 4–5 packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-05', kind: 'local curriculum'},
    {id: 'towers-card05', title: 'Week 5 review card and math check (records, the L + R bound, no-city cards, fewest numbers, twin cities; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-05.md', kind: 'local curriculum'},
    {id: 'towers-records', title: 'Richard P. Stanley — Enumerative Combinatorics, Volume 1 (2nd ed., Cambridge, 2012), Section 1.3: cycles of permutations, left-to-right maxima and the fundamental bijection (rows counted by records are the Stirling numbers of the first kind)', url: 'https://math.mit.edu/~rstan/ec/ec1.pdf', kind: 'undergraduate'},
    {id: 'towers-latin', title: 'OEIS A002860 — Number of Latin squares of order n (1, 2, 12, 576, 161280, …)', url: 'https://oeis.org/A002860', kind: 'reference'},
    {id: 'towers-tatham', title: 'Simon Tatham’s Portable Puzzle Collection — Towers (Latin squares with skyscraper clues)', url: 'https://www.chiark.greenend.org.uk/~sgtatham/puzzles/js/towers.html', kind: 'reference'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/towers/towers.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${JSON.stringify(p.solution).slice(0, 110)}`).join('\n'));
