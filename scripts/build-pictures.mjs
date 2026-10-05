// Builds dist/families/pictures/pictures.json, the Hidden pictures pack, from
// the authoring list below. Answer counts and switch budgets are computed here
// with dist/families/pictures/pictures.js and checked again, by other methods,
// in scripts/validate-pictures.mjs.
// Design notes and worksheet sources: docs/pictures/README.md.
import {writeFile} from 'node:fs/promises';
import {answers, cellsOf, switchRoute, towardGoal} from '../dist/families/pictures/pictures.js';

const WEEK25 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-25';
export const sources = [
  {id: 'pictures-ryser', title: 'H. J. Ryser — Combinatorial properties of matrices of zeros and ones, Canadian Journal of Mathematics 9 (1957), 371–377', url: 'https://www.cambridge.org/core/journals/canadian-journal-of-mathematics/article/combinatorial-properties-of-matrices-of-zeros-and-ones/4BE766CCFDF1704C196AA182C0C5EC88', kind: 'research'},
  {id: 'pictures-gale', title: 'David Gale — A theorem on flows in networks, Pacific Journal of Mathematics 7 (1957), 1073–1082', url: 'https://msp.org/pjm/1957/7-2/p04.xhtml', kind: 'research'},
  {id: 'pictures-brualdi', title: 'Richard A. Brualdi — Combinatorial Matrix Classes (Cambridge University Press, 2006): the class of (0,1)-matrices with given row and column sums, and its interchange graph', url: 'https://resolve.cambridge.org/core/books/abs/combinatorial-matrix-classes/preface/6A4196B5279C4BCABBA1DA50D9E1D4B4', kind: 'research'},
  {id: 'pictures-week25', title: 'Bellingham Math Circle — Week 25: Row and column shadows, packets and adult guide', url: WEEK25, kind: 'local curriculum'}
];
export const family = {
  id: 'pictures',
  title: 'Hidden pictures',
  mathematics: 'A picture is a grid with at most one counter per square; its counts are the number of counters in each row and column. A switch moves two counters at opposite corners of a rectangle to its two empty corners and keeps every count. Any two pictures with the same counts are joined by switches (Ryser), so a picture is the only one with its counts exactly when it has no switch; those pictures are staircases once rows and columns are sorted. Each switch changes four squares, which bounds the fewest switches between two pictures; on two rows the fewest is half the number of columns where they differ.',
  rules: [
    'Each number counts the counters in its row or column.',
    'A square holds at most one counter.',
    'A switch moves two counters at opposite corners of a rectangle to its two empty corners.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const CONTROLS = {
  match: 'Tap a square to put a counter there or take it away. A count turns green when its row or column has exactly that many counters.',
  twin: 'Tap a square to put a counter there or take it away. The small card shows the starting picture. A count turns green when its row or column has exactly that many counters.',
  every: 'Tap a square to put a counter there or take it away. A picture that matches every count is kept below the grid. Clear empties the grid. When you are sure you have them all, press That’s all. Undo never loses a kept picture.',
  reach: 'The rings show where the goal picture has its counters. Tap a counter, then tap a glowing counter at the opposite corner of a rectangle whose other two corners are empty: the two counters jump to those corners. Tap the first counter again to put it back. The dots show the switches left. Undo takes back a switch.',
  lonely: n => `Tap a square to put a counter there or take it away. The counts show your picture’s own rows and columns. When all ${n} counters are placed and another picture could share the counts, four corners light up to show a switch.`
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Three in a small grid',
    parameters: {mode: 'match', size: [2, 3], rowCounts: [2, 1], colCounts: [1, 1, 1]},
    objective: 'Place counters to match every count.',
    idea: 'The counts can be matched in more than one way.',
    prerequisites: 'Count to three and match a number to a row or column. A grown-up can read the goal.',
    hints: ['Row B needs just one counter. Where will it go?', 'Each column needs one counter, so row B’s column is full once it has one.', 'Try A1, A2 and B3.'],
    parent: {
      notice: 'Wherever row B’s counter goes, row A’s two counters fill the other two columns.',
      prompt: 'Could someone else match the same counts with a different picture?',
      explanation: 'Row B’s single counter can sit in any of the three columns, and row A then fills the other two, so exactly three pictures match: A1 A2 B3, A1 A3 B2 and A2 A3 B1. Any two of them differ by one switch.',
      extension: 'Make all three pictures. How do you know there is no fourth?',
      connection: 'Rebuilding a picture from its row and column counts is the smallest case of discrete tomography; Ryser (1957) described every picture these counts allow.'
    },
    provenance: 'Week 25 K–1 Problem 1 (third pair) and grades 2–3 Problem 1 (first pair): rows 2, 1 and columns 1, 1, 1.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Not this one',
    parameters: {mode: 'twin', size: [2, 3], picture: '110/001'},
    objective: 'Make a different picture with the same counts.',
    idea: 'Moving two counters at once, each along its row, keeps every count.',
    prerequisites: 'Count to three. Notice that taking a counter away changes two counts.',
    hints: ['Taking one counter away changes a row count and a column count.', 'Move one counter along its row, then fix the column you emptied.', 'Move A2 to A3 and B3 to B2.'],
    parent: {
      notice: 'Every way to do it moves two counters, one in each row.',
      prompt: 'Why can’t you change the picture by moving just one counter?',
      explanation: 'Moving one counter along its row keeps the row counts but empties one column and overfills another, and moving it anywhere else changes a row count too. So a second counter has to move the other way. The two other pictures are A1 A3 B2 and A2 A3 B1, each one switch from the start.',
      extension: 'Starting from A1 A2 B3, how many different pictures share its counts, counting the start?',
      connection: 'This two-counter move is the switch (Ryser’s interchange); it is the only kind of move needed to reach every picture with the same counts.'
    },
    provenance: 'Week 25 grades 2–3 Problem 3 (move exactly two counters to make a different picture with the same counts), on the 2 × 3 grid of Problem 1.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Two diagonals',
    parameters: {mode: 'every', size: [2, 2], rowCounts: [1, 1], colCounts: [1, 1]},
    objective: 'Find every picture with these counts.',
    idea: 'Knowing you have them all is part of the answer.',
    prerequisites: 'Count to two. A grown-up can read the goal and the That’s all button.',
    hints: ['Put one counter in row A. Where must row B’s counter go?', 'Row A’s counter has only two places to go.', 'The pictures are A1 B2 and A2 B1.'],
    parent: {
      notice: 'Once row A’s counter is placed, row B’s counter has only one place left.',
      prompt: 'How can you be sure there are only two?',
      explanation: 'Row A’s counter goes in column 1 or column 2. Each column needs exactly one counter, so row B’s counter must go in the other column. That gives two pictures, the two diagonals, and they differ by one switch.',
      extension: 'On a 3 × 3 grid with every count 1, how many pictures are there?',
      connection: 'Pictures with every count equal to 1 are permutations, the same objects as non-attacking rooks.'
    },
    provenance: 'Week 25 K–1 Problem 1 (first pair: two different pictures on the 2 × 2 grid with every count 1).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'A full column',
    parameters: {mode: 'match', size: [3, 3], rowCounts: [2, 1, 2], colCounts: [1, 3, 1]},
    objective: 'Place counters to match every count.',
    idea: 'A count as big as the grid fills its whole line.',
    prerequisites: 'Count to three and compare a count with the length of a row or column.',
    hints: ['Column 2 needs 3 counters, and it has only 3 squares.', 'With column 2 full, row B is finished.', 'Try A1, A2, B2, C2 and C3.'],
    parent: {
      notice: 'The 3 under column 2 fills that column, which settles row B at once.',
      prompt: 'Which counters were forced, and where did you have a choice?',
      explanation: 'Column 2 has three squares and needs three counters, so it is full. That gives row B its one counter. Rows A and C each need one more, in column 1 or 3, and columns 1 and 3 each need one, so the pictures are A1 C3 or A3 C1 added to the full column: two pictures, one switch apart.',
      extension: 'Change one count so that only one picture fits.',
      connection: 'A full or empty line is the first deduction in reconstructing a picture from its counts; Gale and Ryser’s condition says when the deductions can be completed at all.'
    },
    provenance: 'New instance; same task as Week 25 K–1 Problem 1 on the 3 × 3 grid.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'One in every line',
    parameters: {mode: 'every', size: [3, 3], rowCounts: [1, 1, 1], colCounts: [1, 1, 1]},
    objective: 'Find every picture with these counts.',
    idea: 'An organized search (by where row A’s counter goes) shows when the list is complete.',
    prerequisites: 'Count to six. Keep a short list in order, with the kept pictures as a record.',
    hints: ['Start with row A’s counter in column 1. How many pictures begin that way?', 'Each choice for row A leaves two for row B.', 'Row A has 3 choices, row B then 2 and row C 1: 3 × 2 × 1 = 6 pictures.'],
    parent: {
      notice: 'Row A’s counter has three places; after it, row B’s has two; row C’s is then forced.',
      prompt: 'How did you know you had found them all?',
      explanation: 'Every row and column holds exactly one counter, so a picture is a choice of column for each row with no column used twice: 3 × 2 × 1 = 6 pictures. Grouping them by row A’s counter gives three pairs. Two of them differ by one switch when they agree in one row, and by two switches otherwise.',
      extension: 'How many pictures on a 4 × 4 grid with every count 1?',
      connection: 'These pictures are the permutation matrices; a switch is a transposition, and the fewest switches between two of them is 3 minus the number of cycles of the permutation that takes one to the other.'
    },
    provenance: 'Week 25 K–1 Problem 3 (find every three-counter picture with counts 1, 1, 1 and 1, 1, 1).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Only one?',
    parameters: {mode: 'every', size: [3, 3], rowCounts: [1, 3, 2], colCounts: [2, 3, 1]},
    objective: 'Find every picture with these counts.',
    idea: 'Some counts allow only one picture, and a picture with no switch is that one.',
    prerequisites: 'Count to three. Decide when a search is finished.',
    hints: ['Row B needs 3 counters.', 'Column 3 needs only 1, and row B already gives it one.', 'The only picture is A2, B1, B2, B3, C1, C2.'],
    parent: {
      notice: 'Every counter is forced: row B is full, which uses up column 3, so column 2’s three counters and row C’s two settle the rest.',
      prompt: 'Can you find two counters that could switch in this picture?',
      explanation: 'Row B is full. Column 3 needs one counter and already has B3, so A3 and C3 are empty. Column 2 needs three, so A2 and C2. Row C needs two, so C1 as well, and row A is done. Only A2 B1 B2 B3 C1 C2 fits. It has no switch: every rectangle with counters on one diagonal has a counter on the other.',
      extension: 'Make a different 3 × 3 picture with only one possible picture for its counts.',
      connection: 'Ryser’s theorem: a picture is the only one with its counts exactly when no switch is possible. Sorted by size, the rows of such a picture form a staircase.'
    },
    provenance: 'Week 25 K–1 Problem 4 and grades 2–3 Problem 1 (counts that allow only one picture); new 3 × 3 instance.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Swap the rows',
    parameters: {mode: 'reach', size: [2, 4], start: '1100/0011', goal: '0011/1100'},
    objective: 'Fill the rings in 2 switches.',
    idea: 'On two rows, each switch fixes two columns, so the fewest switches is half the number of columns that differ.',
    prerequisites: 'Pick two counters on opposite corners of a rectangle. Count the columns that differ.',
    hints: ['Tap A1, then see which counters glow.', 'Four counters are out of their rings, and a switch moves two.', 'Switch A1 with B3, then A2 with B4.'],
    parent: {
      notice: 'All four columns differ from the goal, and each switch fixes two of them.',
      prompt: 'Could one switch ever be enough here?',
      explanation: 'A switch changes exactly two columns, so four differing columns need at least two switches. Pairing a column that needs its counter moved up with one that needs it moved down gives a switch that fixes both: A1 with B3, then A2 with B4. On any two-row grid, the fewest switches between two pictures with the same counts is half the number of columns where they differ.',
      extension: 'On a 2 × 6 grid with three counters in each row, what is the most switches ever needed?',
      connection: 'For two rows this is the whole story; on more rows the fewest switches is half the number of differing squares minus the most cycles the differences can be split into (Brualdi).'
    },
    provenance: 'Week 25 grades 4–5 Problems 2 and 3 (switches between pictures on the 2 × 4 and 2 × 6 grids; the fewest switches between two pictures).'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'A lonely four',
    parameters: {mode: 'lonely', size: [3, 3], counters: 4},
    objective: 'Place 4 counters so that no other picture has the same counts.',
    idea: 'A picture is the only one with its counts exactly when no two counters can switch.',
    prerequisites: 'Recognize a rectangle with counters on one diagonal and the other two corners empty.',
    hints: ['Try putting the counters close together.', 'If four corners light up, those two counters can switch into a different picture.', 'A1, A2, A3 and B1 works.'],
    parent: {
      notice: 'The pictures that work look like staircases or blocks once rows and columns are put in order.',
      prompt: 'When the corners light up, what different picture do they show?',
      explanation: 'If two counters sit on one diagonal of a rectangle and the other corners are empty, switching them gives a different picture with the same counts. Ryser showed the converse: if no switch is possible, no other picture shares the counts. So the task is to place 4 counters with no switch. Of the 126 ways to place 4 counters on a 3 × 3 grid, 45 work, such as a full row with one counter below its end (A1 A2 A3 B1) or a 2 × 2 block.',
      extension: 'With 5 counters, which pictures are lonely? Is there a pattern after you sort the rows by count?',
      connection: 'Pictures that are alone in their class are exactly those whose rows and columns can be reordered into a Ferrers diagram (a staircase); their counts are conjugate partitions (Ryser, Gale).'
    },
    provenance: 'Week 25 K–1 Problem 6 and grades 2–3 Problem 5 (choose a four-counter picture whose counts fit only one picture).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Five by five',
    parameters: {mode: 'match', size: [5, 5], rowCounts: [3, 1, 5, 1, 4], colCounts: [2, 5, 1, 3, 3]},
    objective: 'Place counters to match every count.',
    idea: 'Full lines force counters, forced counters finish other lines, and the deductions run all the way to a single picture.',
    prerequisites: 'Count to five. Keep several forced facts in mind; the counts update as you go.',
    hints: ['Row C and column 2 are both full.', 'Rows B and D already have their one counter, in column 2.', 'Column 3 is finished by C3. Now only rows A and E are open.'],
    parent: {
      notice: 'Only one picture fits, and every counter can be explained without guessing.',
      prompt: 'Which counter did you place first, and why was it forced?',
      explanation: 'Row C and column 2 are full. Rows B and D need one counter each, which is their column-2 counter. Column 3 needs one, already C3. Columns 4 and 5 need three each, so they take A and E; column 1 needs two, C1 and one more. Row A then has A2, A4, A5 and is done, so E1 is the last counter. The picture is A2 A4 A5, B2, row C, D2, E1 E2 E4 E5. Its rows nest, each inside every longer one (C, then E, then A, then B and D), so no two counters can switch, which is why it is unique.',
      extension: 'Change two counts so that exactly two pictures fit.',
      connection: 'Counts like these, whose sorted column counts are the conjugate of the sorted row counts, are the equality case of the Gale–Ryser theorem; the unique picture is a Ferrers diagram with its rows and columns shuffled.'
    },
    provenance: 'New instance on a 5 × 5 grid; extends the Week 25 match-the-counts problems to a deduction with one answer.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Round the corner',
    parameters: {mode: 'reach', size: [3, 3], start: '100/010/001', goal: '010/001/100'},
    objective: 'Fill the rings in 2 switches.',
    idea: 'Three counters must move and a switch moves two, so one switch can’t do it; one counter has to move twice.',
    prerequisites: 'Pick a switch; count how many squares differ from the goal.',
    hints: ['Which counters are already in rings?', 'One switch moves only two counters, and all three are out of their rings.', 'Switch A1 with B2, then B1 with C3.'],
    parent: {
      notice: 'All three counters are in the wrong place, but a switch moves only two.',
      prompt: 'Why can’t one switch be enough?',
      explanation: 'The start and the goal differ in six squares, and a switch changes only four, so at least two switches are needed. Two are enough: switching A1 with B2 gives A2 B1 C3, with A2 already right; switching B1 with C3 then gives the goal. Every first switch here works, because the goal is a 3-cycle of the start and any transposition splits it.',
      extension: 'On a 4 × 4 grid with one counter in each line, go from the main diagonal to A2 B3 C4 D1. How many switches?',
      connection: 'With one counter per line, pictures are permutations and switches are transpositions; the fewest switches is n minus the number of cycles, so a 3-cycle needs 2.'
    },
    provenance: 'New 3 × 3 instance of Week 25 grades 2–3 Problem 4 (a picture two switches away that one switch cannot reach).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Every row moves up',
    parameters: {mode: 'reach', size: [4, 4], start: '1100/1010/0101/0011', goal: '1010/0101/0011/1100'},
    objective: 'Fill the rings in 3 switches.',
    idea: 'Six counters are out of place and a switch moves two, so a 3-switch route must put two counters home with every switch.',
    prerequisites: 'Compare two 4 × 4 pictures square by square and plan several moves ahead.',
    hints: ['Count the counters that are not in rings.', 'Six counters are out of their rings and a switch moves two, so every switch must put both in rings.', 'Switch A2 with B3, then B1 with D4, then C2 with D3.'],
    parent: {
      notice: 'Only 5 of the 12 possible first switches fix four squares, and those are exactly the ones that leave a 3-switch route.',
      prompt: 'How do you know 3 is the fewest?',
      explanation: 'The start and goal differ in twelve squares and every switch changes four, so at least three switches are needed. The route A2↔B3, B1↔D4, C2↔D3 uses three, each fixing four squares. A first switch that fixes fewer than four leaves too many differences for the switches remaining.',
      extension: 'With two counters in every row and column of a 4 × 4 grid there are 90 pictures. What is the most switches ever needed between two of them?',
      connection: 'The squares that differ split into rectangles and longer alternating cycles; the fewest switches is half the number of differing squares minus the most cycles they can be split into (Brualdi). Here that is 6 − 3 = 3.'
    },
    provenance: 'New 4 × 4 instance; extends Week 25 grades 4–5 Problem 3 (a shortest route and why fewer switches cannot work) beyond two rows.'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'A lonely eight',
    parameters: {mode: 'lonely', size: [4, 4], counters: 8},
    objective: 'Place 8 counters so that no other picture has the same counts.',
    idea: 'With many counters, only staircase-like pictures avoid every switch.',
    prerequisites: 'Spot a switch on a 4 × 4 grid, and adjust a picture to remove one.',
    hints: ['Fill a whole row first.', 'Make each row’s counters a part of the row above them.', 'Try A1 A2 A3 A4, B1 B2, C1, D1.'],
    parent: {
      notice: 'Every picture that works has rows that nest: each row’s counters lie inside the row with more counters, once the rows are sorted.',
      prompt: 'What happens to a lonely picture if you swap two of its rows?',
      explanation: 'A switch needs two counters on one diagonal of a rectangle with the other corners empty. That is impossible exactly when, for any two rows, one row’s counters include all of the other’s. Sorted by count, such rows form a staircase. Of the 12,870 ways to place 8 counters on a 4 × 4 grid, 1,020 work.',
      extension: 'Is every lonely picture a staircase after you reorder its rows and its columns?',
      connection: 'Yes: lonely pictures are exactly the Ferrers diagrams up to reordering rows and columns, and their column counts are the conjugate of their row counts (Ryser; Gale).'
    },
    provenance: 'New 4 × 4 instance; extends Week 25 K–1 Problem 6 and grades 2–3 Problem 5.'
  }
];

const playground = {
  id: 'pictures-playground', number: 0, title: 'Hidden pictures playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Draw a picture and see its counts.',
  controls: 'Choose a grid size. With Draw, tap squares to add or take away counters; the counts change as you go. With Switch, tap a counter and then a glowing partner to switch them. The number under the grid is how many pictures share these counts. Clear empties the grid.',
  rules: [...RULES],
  idea: 'Free play on square grids from 3 × 3 to 6 × 6, with a live count of the pictures that share your counts.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Draw a few counters and watch the counts.', 'Find a picture whose number is 1.', 'Switch two counters and watch the number stay the same.'],
  parent: {
    notice: 'The number under the grid never changes during a switch, and it is 1 exactly when no switch is possible.',
    prompt: 'Can you draw a picture with 6 counters on the 4 × 4 grid whose number is 1? What about the biggest number?',
    explanation: 'The number is how many pictures share the current counts; switches move between them without changing the counts. It is 1 exactly when the picture has no switch (Ryser), which happens for staircase-like pictures. Spread-out pictures have the most twins: on the 6 × 6 grid with three counters in every row and column there are 297,200.',
    extension: 'On the 3 × 3 grid, which counts give the most pictures?',
    connection: 'The pictures with given counts form the class 𝒜(R, S) studied by Ryser and Brualdi; counting them is a classic hard problem in combinatorics.',
    sourceIds: ['pictures-ryser', 'pictures-brualdi']
  },
  provenance: 'Week 25 materials: making pictures, reading their counts, and switches.'
};

const puzzles = authored.map(a => {
  const q = {...a.parameters}, [R, C] = q.size;
  const p = {
    id: `pictures-${String(a.number).padStart(2, '0')}`, number: a.number, title: a.title, band: 'all', difficulty_level: a.difficulty_level,
    mechanic: 'pictures', familyTitle: family.title, revision: 1,
    parameters: q,
    objective: a.objective, instruction: a.objective,
    controls: q.mode === 'lonely' ? CONTROLS.lonely(q.counters) : CONTROLS[q.mode],
    rules: q.mode === 'reach' ? [...RULES, 'Only switches are allowed, so the counts never change.'] : [...RULES],
    idea: a.idea, prerequisites: a.prerequisites, hints: a.hints,
    parent: {...a.parent, sourceIds: ['pictures-week25', 'pictures-ryser', ...(a.parent.connection.includes('Gale') ? ['pictures-gale'] : []), ...(a.parent.connection.includes('Brualdi') ? ['pictures-brualdi'] : [])]},
    provenance: a.provenance, sourceDocument: 'docs/pictures/README.md'
  };
  const found = answers(p);
  if (!found.length) throw new Error(`${p.id}: no answer`);
  if (q.mode === 'every') q.answers = found.length;
  if (q.mode === 'reach') {
    // The budget is the fewest switches, so a solve is always a shortest route.
    const fewest = towardGoal(R, C, q.goal).get(q.start);
    if (fewest === undefined) throw new Error(`${p.id}: goal unreachable`);
    q.budget = fewest;
    if (!a.objective.includes(`${fewest} switch`)) throw new Error(`${p.id}: objective must say ${fewest} switches`);
  }
  return p;
});
const pg = {...playground, mechanic: 'pictures', familyTitle: family.title, revision: 1, instruction: playground.objective, sourceDocument: 'docs/pictures/README.md'};

const pack = {title: 'Hidden pictures', version: 1, families: [family], sources, puzzles: [pg, ...puzzles]};
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/pictures/pictures.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) {
    const q = p.parameters, [R, C] = q.size, list = answers(p);
    const extra = q.mode === 'reach' ? ` budget=${q.budget} route=${JSON.stringify(switchRoute(R, C, cellsOf(q.start), q.goal))}` : q.mode === 'lonely' ? ` lonely=${list.length}` : ` answers=${list.length}`;
    console.log(`${p.id} ${q.mode} ${R}x${C}${extra}${list.length <= 6 ? `: ${list.join(' ')}` : ''}`);
  }
}
