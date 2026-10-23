// Authoring list for Sliding numbers (worksheet Week 90, jeu de taquin).
// Computes each puzzle's answers with the mechanic's own helpers (every
// start of a board, its finish under every order of corners, the finished
// shapes, the starts of a finish, the orders of opening the gray squares),
// checks them against the table in docs/taquin/README.md, and writes
// dist/families/taquin/taquin.json. Run: node scripts/build-taquin.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fillings, finishOf, finishKey, outlineOf, ordersOf, answersOf, filledGrid, rectify, finishRows, matches, skewCells} from '../dist/families/taquin/taquin.js';

const A = {outer: [3, 2], inner: [1]}, D = {outer: [3, 2, 1], inner: [2, 1]}, B = {outer: [3, 3, 2], inner: [2, 1]};
const P = {outer: [3, 2, 1], inner: [1]}, W = {outer: [4, 2, 1], inner: [2, 1]}, T = {outer: [4, 3, 1], inner: [3, 1]};
const BOX = {outer: [3, 3, 3], inner: [2, 1]};

const RULES = [
  'Numbers grow to the right and down.',
  'Gray squares are missing. A gray corner, with no gray square right of it or below it, can open: it becomes the ring.',
  'The smaller of the numbers right of the ring and below it slides into the ring, and the ring moves to where it was. With only one, that one slides.',
  'When no number is right of the ring or below it, that square leaves the board. Then open another gray corner, until no gray is left.'
];
const PLACE_RULE = 'Fill the white squares with 1, 2, 3, … in order; a number goes where the squares above it and left of it already hold numbers. Sliding starts when every number is placed.';
const ALL_RULE = 'That’s all says whether one is missing.';
const CONTROLS = {
  place: 'Tap a white square to put the next number there. Then tap a gray corner to open it, and tap the number that slides into the ring. New run empties the board. Undo takes back the last move.',
  orders: 'Tap a gray corner to open it, then tap the number that slides into the ring. New run puts the start back. Undo takes back the last move.',
  playground: 'Tap a board picture to choose a board. Tap a white square to put the next number there, then open gray corners and tap the number that slides. New run empties the board.'
};
const PREREQ = {
  k1: 'Compare numbers to 5 and tap. No reading; a grown-up can read How to play.',
  catalog: 'Compare numbers to 6 and keep track of which starts are on the shelf. A grown-up can read the goal line.',
  orders: 'Compare numbers to 5 and remember which corner was opened first. A grown-up can read the goal line.',
  design: 'Compare numbers to 5 and plan a start from a goal, perhaps by trying and adjusting.'
};
const sources = ['taquin-week90', 'taquin-card90', 'taquin-ryy'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'A goal shape', mode: 'design', board: A, targets: [{outline: [2, 2]}], check: {starts: 2}, prereq: 'k1',
    idea: 'The ring leaves the board where its path ends, so the start decides which corner of the board is lost.',
    hints: ['Put 1, 2, 3 and 4 so numbers grow right and down, then slide.', 'For this shape the top-right square must leave. Which way must the ring travel?', 'Put 1 in the top row and 4 at the bottom right.'],
    parent: {notice: 'Whether your child places numbers at random or starts to aim the ring along the top row.', prompt: 'Which square leaves the board, and why that one?', explanation: 'The ring starts at the gray square and always takes the smaller neighbour, right or below. The goal keeps two rows of two, so the square that leaves is the top-right one: the ring must move right twice. That happens exactly when 1 is in the top row and 4 is at the bottom right, so two starts do it: 1 2 over 3 4 and 1 3 over 2 4.', extension: 'Make the other finished shape, three on top and one below. (Three starts make it.)', connection: 'With one gray square the finish is always the board with one outer corner gone, the simplest case of the Pieri rule.'},
    provenance: 'Week 90 Problem 1 (the A board, its two finished outlines), as a design: fill the board to reach a goal outline (Problem 4’s question on the A board).'},
  {number: 2, level: 'easy', title: 'Every start', mode: 'fillings', board: A, check: {count: 5}, prereq: 'catalog',
    idea: 'A catalog is complete when it is organized: 1 can only go in two squares.',
    hints: ['Fill the board, slide it, then press New run and fill it another way.', 'Where can 1 go? Only where nothing is above it or left of it.', 'With 1 in the top row there are three starts; with 1 in the bottom row, two.'],
    parent: {notice: 'Whether your child varies one start a little at a time, or starts afresh each run.', prompt: 'How do you know none is missing?', explanation: 'Call the top numbers a, b and the bottom ones c, d. Rows and columns grow, so a < b, a < d and c < d, and 1 is a or c. If a = 1, the other three can be placed with c < d in three ways; if c = 1, then a = 2 and b, d are 3, 4 either way: 3 + 2 = 5 starts. Sorted by finish: two keep two rows of two, three finish three over one. All five finishes differ.', extension: 'Why is the finish never one row of four? (One slide takes away one outer corner of the board, and a row of four does not fit in the board.)', connection: 'The five starts are the standard fillings of the skew shape (3, 2)/(1); their finishes are the standard tableaux of (2, 2) and (3, 1), each once.'},
    provenance: 'Week 90 Problem 2 (sort the five A cards by finished outline; is the collection complete?).'},
  {number: 3, level: 'easy', title: 'Which corner first', mode: 'orders', board: D, start: [1, 3, 2], check: {count: 2}, prereq: 'orders',
    idea: 'Different orders of opening the corners take different paths and end at the same array.',
    hints: ['Open a gray corner and slide until no gray is left. Then press New run and open the other corner first.', 'At the start two gray squares are corners. After the first slide, which can open?', 'Compare the two finished arrays on the shelf.'],
    parent: {notice: 'Whether your child expects the two orders to finish differently, and what they say when they match.', prompt: 'Could a third order exist?', explanation: 'The gray squares form a small staircase: top-left, top-middle and middle-left. Either the top-middle or the middle-left opens first; the other must follow, and the top-left always opens last. So there are exactly two orders, and both finish with 1 3 over 2. The paths of the ring differ, but the finish does not.', extension: 'Try a start of your own in the playground on this board. Does the order ever matter?', connection: 'The first fundamental theorem of jeu de taquin: sliding until no gray is left gives the same array whatever corner each slide opens.'},
    provenance: 'Week 90 Problem 3 (each D card finished twice, upper corner first and lower corner first), on card D2.'},
  {number: 4, level: 'medium', title: 'Same finish', mode: 'starts', board: D, target: [[1, 3], [2]], check: {count: 2}, prereq: 'catalog',
    idea: 'A finish does not always tell you its start: two starts can slide to the same array.',
    hints: ['Fill the board, slide it and compare the finish with the goal.', 'The three numbers sit in different rows and columns, so any order is a start.', 'Try 1 at the top, then 1 in the middle.'],
    parent: {notice: 'Whether your child is surprised that a second start works once one is found.', prompt: 'Can a finished array tell you which start made it?', explanation: 'On this board the three squares share no row or column, so all six orders of 1, 2, 3 are starts. Two of them finish as 1 3 over 2 (reading top to bottom, 1 3 2 and 3 1 2); two finish as 1 2 over 3; the row 1 2 3 and the column 1, 2, 3 have one start each. So no: here a finish of this shape has two starts.', extension: 'Find the two starts of 1 2 over 3. Is it a coincidence that it also has two? (No: puzzle 7 shows it again.)', connection: 'The number of starts of a finish depends only on the shapes: it is the Littlewood–Richardson coefficient, here c of (3, 2, 1) over (2, 1) and (2, 1), which is 2.'},
    provenance: 'Week 90 Problem 6 (find every D start that reaches each target; can a finish tell the start?), target 13/2.'},
  {number: 5, level: 'medium', title: 'Goal shapes', mode: 'design', board: B, targets: [{outline: [3, 2]}, {outline: [3, 1, 1]}, {outline: [2, 2, 1]}], check: {starts: 16}, prereq: 'design',
    idea: 'Which corners of the board leave depends on where the small numbers sit near the gray squares.',
    hints: ['Fill the board, slide, and see which goal the finish matches.', 'The bottom row keeps its two squares only if the ring never ends there.', 'Change where 1 and 2 sit, and watch which squares leave.'],
    parent: {notice: 'Whether your child plans the next start from the last finish or tries at random.', prompt: 'Is there a start that finishes in some other shape?', explanation: 'All 16 starts on this board finish in one of these three shapes: 5 starts finish as 3 over 2, 6 as 3, 1, 1 and 5 as 2, 2, 1. Each finished array appears exactly once, so 5 + 6 + 5 = 16 counts the standard arrays of the three shapes.', extension: 'Can two different starts on this board ever finish as exactly the same array? (No: every finish here has one start.)', connection: 'The board (3, 3, 2) with (2, 1) missing has every Littlewood–Richardson coefficient 0 or 1.'},
    provenance: 'Week 90 Problem 4 (arrange 1–5 on the blank B start to finish with each outline).'},
  {number: 6, level: 'medium', title: 'One gray square', mode: 'outlines', board: P, check: {count: 3}, prereq: 'catalog',
    idea: 'With one gray square, one slide finishes the run and takes exactly one outer corner away.',
    hints: ['Fill the board and slide. Then press New run and try to finish in a new shape.', 'Which square left the board? Could another one leave instead?', 'The board has three outer corners.'],
    parent: {notice: 'Whether your child connects the finished shape with the square that left the board.', prompt: 'Why can’t the finish be a long row of five?', explanation: 'There is one gray square, so there is one slide, and it removes one square of the outside edge where the ring stops. The ring can only stop where nothing is right of it or below it: an outer corner. The board 3, 2, 1 has three outer corners, so three shapes: 3 over 2, 3, 1, 1 and 2, 2, 1. Each is reached; a row of five does not even fit in the board.', extension: 'How many starts finish in each shape? (5, 6 and 5 of the 16.)', connection: 'The Pieri rule for one box: sliding a single box out gives the board minus one outer corner.'},
    provenance: 'New, after Week 90 Problem 4 (which finished outlines can a board reach?), on a one-gray board.'},
  {number: 7, level: 'medium', title: 'Another finish', mode: 'starts', board: W, target: [[1, 2, 4], [3]], check: {count: 2}, prereq: 'catalog',
    idea: 'Starts of one finish can differ in where the small numbers sit, yet slide together.',
    hints: ['Fill the board, slide and compare the finish with the goal.', 'Numbers in the top row only move left, so they stay in the top row.', 'Try 2 and 4 in the top row.'],
    parent: {notice: 'Whether your child reasons from the goal (which numbers can sit where) or only tries.', prompt: 'What do the two starts have in common?', explanation: 'Both starts have 2 and 4 in the top row; 1 and 3 swap between the middle and bottom squares. Of the twelve starts on this board, each of the three finishes three over one has two starts, and the other six finishes have one each: 3 · 2 + 2 + 3 + 1 = 12.', extension: 'Find the two starts of 1 3 4 over 2.', connection: 'Here c of (4, 2, 1) over (2, 1) and (3, 1) is 2: the count is the same for every finish of that shape.'},
    provenance: 'New, extends Week 90 Problem 6 (D’s shared finishes) to a four-number board.'},
  {number: 8, level: 'hard', title: 'Three gray squares', mode: 'outlines', board: W, check: {count: 4}, prereq: 'catalog',
    idea: 'Some shapes never appear; the top row’s two numbers always grow.',
    hints: ['Fill the board and slide. Then try for a shape you have not made.', 'A row of four needs every number to finish in the top row. Can it?', 'Can the four numbers ever finish in one column?'],
    parent: {notice: 'Whether your child tries hard for a column of four before pressing That’s all.', prompt: 'Why can’t the finish be one column of four?', explanation: 'Four shapes appear: a row of four, 3 over 1, 2 over 2 and 2, 1, 1. A column of four never does. Read the numbers row by row from the bottom row up: the finish has as many rows as the longest sequence in that list that keeps falling, taking numbers in order but not necessarily side by side (Greene’s theorem). The top row’s two numbers always rise, so no such sequence falls four times.', extension: 'Which start finishes as a row of four? (Only 3 4 on top, 2 in the middle, 1 at the bottom.)', connection: 'The shapes that appear are those with a nonzero Littlewood–Richardson coefficient c of (4, 2, 1) over (2, 1) and the shape.'},
    provenance: 'New, after Week 90 Problems 4 and 5 (which outlines a board reaches), on a board that misses one shape.'},
  {number: 9, level: 'hard', title: 'Many ways to open', mode: 'orders', board: T, start: [1, 3, 4, 2], check: {count: 3}, prereq: 'orders',
    idea: 'Four gray squares open in several orders, the squares leave the board in different orders, and the finish never changes.',
    hints: ['Open a gray corner, slide, and keep going until no gray is left. Then press New run and choose differently.', 'Which gray squares can open first? Which must wait?', 'The top-left square always opens last.'],
    parent: {notice: 'Whether your child records which corner came first, or keeps repeating an order.', prompt: 'Why does the top-left square always open last?', explanation: 'The gray squares are three in the top row and one below. A square opens only when no gray is right of it or below it, so the top-right square or the lower one goes first, and the top-left always last. That gives three orders: right, middle, lower, left; right, lower, middle, left; lower, right, middle, left. The squares leave the board in a different order each time, yet every order finishes 1 3 4 over 2.', extension: 'How many orders would a staircase of three, two and one gray squares have? (16.)', connection: 'The orders are the standard fillings of the gray shape read backwards; the theorem says each gives the same rectification.'},
    provenance: 'New, extends Week 90 Problem 3 to four gray squares (three orders).'},
  {number: 10, level: 'hard', title: 'Exactly this finish', mode: 'design', board: B, targets: [{finish: [[1, 2, 4], [3, 5]]}], check: {starts: 1}, prereq: 'design',
    idea: 'On this board every finish has exactly one start, so the goal tells you the start, if you can work backwards.',
    hints: ['Fill the board, slide and compare with the goal.', 'Undo a slide in your head: the last square to leave was the end of a ring’s path.', 'In the start, 1 is in the bottom row.'],
    parent: {notice: 'Whether your child works backwards from the goal or tries many starts.', prompt: 'How do you know there is only one start?', explanation: 'The 16 starts on this board finish as 16 different arrays (puzzle 5), so each finish has one start. For 1 2 4 over 3 5 it is gray, gray, 4 over gray, 2, 5 over 1, 3. A slide can be undone: put the ring back where the square left and slide the larger number above it or left of it in, until it reaches the gray square it started from.', extension: 'Find the start of 1 3 4 over 2 5.', connection: 'Undoing slides (reverse jeu de taquin) recovers a start from its finish once the squares that left are known; with one start per finish, the finish alone is enough.'},
    provenance: 'Week 90 Problem 6’s last question (can two B starts reach the same arrangement?) and Problem 7 (undoing a slide), as a design: reach one exact finish.'}
];

const id = n => `taquin-${String(n).padStart(2, '0')}`;
const VISIBLE = {fillings: 'Fill the board every way you can.', starts: 'Find every start that finishes like the goal.', outlines: 'Find every shape the numbers can finish in.', orders: 'Find every order to open the gray squares.'};
const FULL = {
  fillings: 'Fill the board every way you can so numbers grow right and down, and slide each start until no gray is left. Press That’s all when none is left.',
  starts: 'Find every start that slides to exactly the goal. Press That’s all when none is left.',
  outlines: 'Find every shape a start on this board can finish in. Press That’s all when none is left.',
  orders: 'Find every order of opening the gray squares, sliding until no gray is left each time. Press That’s all when none is left.'
};
const out = PUZZLES.map(item => {
  const s = item.board, q = {mode: item.mode, outer: s.outer, inner: s.inner};
  if (item.mode === 'design') q.targets = item.targets;
  if (item.mode === 'starts') q.target = item.target;
  if (item.mode === 'orders') q.start = item.start;
  const all = fillings(s);
  // Every start finishes the same whatever corner each slide opens.
  for (const f of all) {
    const ends = new Set(ordersOf(s.inner).map(order => {
      const cells = skewCells(s.inner, []); let k = 0;
      return finishKey(finishRows(rectify(filledGrid(s, f), () => cells[order[k++]]).grid));
    }));
    assert.equal(ends.size, 1, `${id(item.number)}: one finish for ${f}`);
  }
  let solution;
  if (item.mode === 'design') {
    const starts = all.filter(f => q.targets.some(t => matches(t, finishOf(s, f))));
    for (const t of q.targets) assert.ok(all.some(f => matches(t, finishOf(s, f))), `${id(item.number)}: every goal is reachable`);
    assert.equal(starts.length, item.check.starts, `${id(item.number)}: starts that reach a goal`);
    solution = {witnesses: q.targets.map(t => all.find(f => matches(t, finishOf(s, f)))), starts: starts.length};
  } else {
    const answers = answersOf(q);
    assert.equal(answers.length, item.check.count, `${id(item.number)}: answers`);
    solution = {answers, count: answers.length, ...(item.mode === 'orders' ? {finish: finishOf(s, item.start)} : {})};
  }
  const catalog = item.mode !== 'design';
  const objective = catalog ? FULL[item.mode] : item.targets.length > 1 ? 'Fill the board and slide so the numbers finish in each goal shape.' : item.targets[0].finish ? 'Fill the board and slide so the numbers finish exactly like the goal.' : 'Fill the board and slide so the numbers finish in the goal shape.';
  const rules = [...RULES, ...(item.mode === 'orders' ? [] : [PLACE_RULE]), ...(catalog ? [ALL_RULE] : [])];
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Sliding numbers', mechanic: 'taquin', band: 'all', revision: 1, sourceDocument: 'docs/taquin/README.md',
    parameters: q, objective, visibleObjective: catalog ? VISIBLE[item.mode] : '', instruction: objective, controls: CONTROLS[item.mode === 'orders' ? 'orders' : 'place'], rules,
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.deepEqual(out.map(p => p.difficulty_level), [...Array(3).fill('easy'), ...Array(4).fill('medium'), ...Array(3).fill('hard')]);

const shapes = [A, D, B, P, W, T, BOX];
const playground = {
  id: 'taquin-playground', number: 0, title: 'Sliding numbers playground', difficulty_level: 'playground', familyTitle: 'Sliding numbers', mechanic: 'taquin', band: 'playground', revision: 1, sourceDocument: 'docs/taquin/README.md',
  parameters: {mode: 'playground', shapes},
  objective: 'Choose a board, fill it and slide in any order you like.', visibleObjective: '',
  instruction: 'Choose a board, fill it and slide in any order you like.',
  controls: CONTROLS.playground, rules: [...RULES, PLACE_RULE],
  idea: 'Free play with sliding: any board, any start, any order of corners.',
  prerequisites: 'None. A grown-up can set a challenge: make the same finish from two starts.',
  hints: ['Fill a board and slide it two ways.', 'Try the last board: three by three with three gray squares.', 'Does any start on that board finish in a new shape?'],
  parent: {notice: 'Whether your child tries the same start in different orders, or different starts on one board.', prompt: 'On the three-by-three board, what shape does every start finish in?', explanation: 'On the 3 × 3 board with three gray squares, all 16 starts finish in the staircase 3, 2, 1, and each of its 16 standard arrays exactly once: in a rectangle the finish is always the white squares turned upside down.', extension: 'Make two starts on the D board that finish the same way.', connection: 'Rectification by jeu de taquin is well defined (the first fundamental theorem) and gives Littlewood–Richardson coefficients as counts of starts.', sourceIds: sources},
  provenance: 'The boards of Week 90 (A, B, D) and of the puzzles here, with a 3 × 3 board added.'
};
// The playground's 3 × 3 board: every start finishes as the staircase, each array once.
const boxFinishes = fillings(BOX).map(f => finishOf(BOX, f));
assert.ok(boxFinishes.every(r => String(outlineOf(r)) === '3,2,1') && new Set(boxFinishes.map(finishKey)).size === 16);

const json = {
  title: 'Sliding numbers',
  version: 1,
  families: [{id: 'taquin', title: 'Sliding numbers', mathematics: 'A board is a skew shape: a Young diagram with a smaller one missing from its top-left corner. A start fills it with 1, …, n so rows and columns grow. A slide (jeu de taquin) opens a corner of the missing squares and moves the smaller of the right and lower neighbours into the hole until it leaves the board; order and the numbers are kept, and each slide ends. Sliding until nothing is missing gives a standard Young tableau that does not depend on the order of corners (the first fundamental theorem of jeu de taquin, Schützenberger). The number of starts of a finished tableau depends only on the shapes: it is a Littlewood–Richardson coefficient. The puzzles ask for a start that finishes in a goal, every start of a finish, every finished shape, every start sorted by its finished shape, and every order of opening the corners.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'taquin-week90', title: 'Bellingham Math Circle — Week 90: Sliding number arrays (student packet, materials and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-90', kind: 'local curriculum'},
    {id: 'taquin-card90', title: 'Week 90 review card and math check (App fit: tap tiles into the hole, place 1–n to reach a target, every start of a finish)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-90.md', kind: 'local curriculum'},
    {id: 'taquin-ryy', title: 'Colleen Robichaux, Harshit Yadav and Alexander Yong — Equivariant cohomology, Schubert calculus, and edge labeled tableaux, §3 (slides J1/J2, Theorem 3.1 and Example 3.2, Theorem 3.3 and Example 3.4)', url: 'https://arxiv.org/abs/1908.11224', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/taquin/taquin.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${p.parameters.outer}/${p.parameters.inner}: ${p.parameters.mode === 'design' ? `${p.solution.starts} starts reach a goal` : `${p.solution.count} answers`}`).join('\n'));
