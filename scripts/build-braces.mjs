// Authoring list for Bracing frames (worksheet Week 52). Checks each
// puzzle's claims (the fewest braces and how many designs use that many, the
// cells that make a frame hold with one more brace, how many loose designs
// there are) and writes dist/families/braces/braces.json.
// Run: node scripts/build-braces.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fewest, fewestDesigns, looseDesigns, holds, pieces, covers, allowed} from '../dist/families/braces/braces.js';

// Cells are written row by row, '#' for a window and '.' for an open cell.
const windowsOf = (rows, cols, picture) => [...picture.replaceAll('/', '')].flatMap((ch, k) => ch === '#' ? [k] : []);
const cells = (q, list) => list.split(' ').map(rc => (Number(rc[0]) - 1) * q.cols + Number(rc[1]) - 1);

const FRAME = [
  'The bars keep their length and the pins let them turn, so a square can lean into a diamond. Push shows how the frame can move.',
  'A brace across a cell keeps that cell square.',
  'The frame holds its shape when no push can change it. Sliding or turning the whole frame doesn’t count.'
];
const MORE = {
  fewest: 'Press Fewest when you think the frame holds with as few braces as it can. If it still moves, Push shows how; if a brace can go, it is marked.',
  one: 'The braces already there stay. Add one more.',
  loose: 'Every row and every column needs at least one brace.',
  windows: 'A window can’t take a brace.',
  graph: 'Beside the frame, each row and each column is a dot. After a push, each brace links its row to its column there.'
};
const CONTROLS = {
  fewest: 'Tap a cell to brace it, and tap it again to take the brace out. Push makes the frame move if it can. Press Fewest when you are done.',
  one: 'Tap a cell to brace it, and tap it again to take the brace out. Push makes the frame move if it can.',
  loose: 'Tap a cell to brace it, and tap it again to take the brace out. The beads count your braces. Push makes the frame move if it can.',
  playground: 'Tap a cell to brace it, and tap it again to take the brace out. Push makes the frame move if it can.'
};
const PREREQUISITES = {
  fewest: 'Count to about 10. No reading needed once the goal is read aloud.',
  one: 'None beyond tapping and pushing. A grown-up can read the goal.',
  loose: 'Keep rows and columns in mind at once; older children.',
  graph: 'Match a row or column of the frame to its dot beside it.'
};
const sources = ['braces-bolker-crapo', 'braces-graver', 'braces-week52'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three in a row', p: {rows: 1, cols: 3, mode: 'fewest'},
    objective: 'Make the frame hold its shape with the fewest braces.',
    idea: 'In a single row, every cell needs its own brace.',
    hints: ['Brace one cell and push. What still moves?', 'Each cell without a brace can lean on its own.', 'Brace all three cells.'],
    check: {fewest: 3, designs: 1},
    parent: {notice: 'A braced cell can’t help its neighbour: an unbraced cell next to it still leans.', prompt: 'Why isn’t one brace in the middle enough?', explanation: 'In one row, the upright bars of each cell can lean separately. A brace keeps only its own cell square, so each of the three cells needs one: 3 braces, the row count plus the column count minus one.', extension: 'What about a single column of three cells?', connection: 'A 1-by-n frame’s row-column graph is a star; it is connected only with every link.'},
    provenance: 'New, before Week 52 Problem 2 (the fewest braces for one square).'},
  {number: 2, level: 'easy', title: 'Two by two', p: {rows: 2, cols: 2, mode: 'fewest'},
    objective: 'Make the frame hold its shape with the fewest braces.',
    idea: 'Braces can hold cells they don’t touch: three braces hold four cells.',
    hints: ['Try two braces and push.', 'With two braces in a row, the other row still leans.', 'Brace any three cells.'],
    check: {fewest: 3, designs: 4},
    parent: {notice: 'The unbraced cell is held square by its three braced neighbours.', prompt: 'The fourth cell has no brace. Why can’t it lean?', explanation: 'Its top bar is parallel to the top bar of the braced cell above or below it, and its side bar is parallel to the side bar of the braced cell beside it. Both of those are held at right angles to bars that can’t lean, so the fourth cell is square too. Two braces always leave a row or a column free to lean. Any three of the four cells work.', extension: 'Brace two cells on a diagonal. Which way does it move?', connection: 'Week 52 Problem 5: a 2-by-2 grid needs 3 braces (rows + columns − 1).'},
    provenance: 'Week 52 Problems 4 and 5 (2-by-2 designs; fewest braces).'},
  {number: 3, level: 'easy', title: 'One more', p: {rows: 2, cols: 3, mode: 'one', start: '11 12 22'},
    objective: 'Add one brace so the frame holds its shape.',
    idea: 'A column with no brace leans however many braces the rest has.',
    hints: ['Push. Which part still moves?', 'The third column has no brace.', 'Brace either cell in the third column.'],
    check: {works: '13 23'},
    parent: {notice: 'Three braces hold the first two columns, and the third column leans on its own.', prompt: 'Could a fourth brace in the first two columns help?', explanation: 'The braces link rows 1 and 2 with columns 1 and 2, so that part is held. Column 3’s top and bottom bars can still turn. Only a brace in column 3 links it to the rest. Either cell works.', extension: 'Take out one of the starting braces. Can the frame still hold with one more?', connection: 'A brace joins its row to its column; the frame holds when everything is joined.'},
    provenance: 'Week 52 Problem 11 (one new brace), on a 2-by-3 frame.'},
  {number: 4, level: 'medium', title: 'Two by three', p: {rows: 2, cols: 3, mode: 'fewest', graph: true},
    objective: 'Make the frame hold its shape with the fewest braces.',
    idea: 'Fewest braces link the rows and columns with no loop: rows + columns − 1.',
    hints: ['Brace some cells, push, and look at the dots beside the frame.', 'Every dot must join one piece. Five dots need four links.', 'Brace row 1 all along and one cell of row 2.'],
    check: {fewest: 4, designs: 12},
    parent: {notice: 'After a push, the frame holds exactly when the dots beside it are all joined.', prompt: 'Why can’t three braces hold it?', explanation: 'Two rows and three columns are five dots. Each brace links two dots, so three links leave at least two pieces, and a piece that isn’t joined can turn. Four braces that join all five dots with no loop work, and there are 12 such designs.', extension: 'How many braces would a 3-by-3 frame need?', connection: 'Week 52 Problems 6–7; the number of spanning trees of the complete bipartite graph K₂,₃ is 2²·3¹ = 12.'},
    provenance: 'Week 52 Problems 6 and 7 (fewest braces on a 2-by-3 frame, and the row-column links).'},
  {number: 5, level: 'medium', title: 'Take some out', p: {rows: 3, cols: 3, mode: 'fewest', graph: true, start: '11 12 13 21 22 23 31 32 33'},
    objective: 'Take out as many braces as you can while the frame holds its shape.',
    idea: 'A brace can go when its link is on a loop of the dots.',
    hints: ['Take one out and push. Does it still hold?', 'A brace can go when its two dots are still joined some other way.', 'Keep row 1 and column 1 braced; take the rest out.'],
    check: {fewest: 5, designs: 81},
    parent: {notice: 'The first few braces come out freely; then every brace matters.', prompt: 'When you can’t take any more out, how many braces are left, and why that many?', explanation: 'Six dots need five links to be joined. A brace can go whenever its link is on a loop, because the two dots stay joined around the loop. At five braces there is no loop left, and taking any brace out splits the dots. 81 different designs use five braces.', extension: 'Can you take out four braces and still have it hold? Five?', connection: 'Week 52 Problem 10 (pairs you can remove); spanning trees of K₃,₃ (3²·3² = 81).'},
    provenance: 'Week 52 Problems 9 and 10 (removing braces while it holds), on a 3-by-3 frame.'},
  {number: 6, level: 'medium', title: 'Every row, every column', p: {rows: 3, cols: 3, mode: 'one', graph: true, start: '11 12 21 22 33'},
    objective: 'Add one brace so the frame holds its shape.',
    idea: 'A brace in every row and column isn’t enough: the links must join into one piece.',
    hints: ['Push. Which part moves against the rest?', 'Push: the dots make two pieces. Join them.', 'Brace a cell in row 3 that is not in column 3, or a cell in column 3 that is not in row 3.'],
    check: {works: '13 23 31 32'},
    parent: {notice: 'Every row and every column already has a brace, yet the corner cell and the block of four turn against each other.', prompt: 'Why does a brace in the corner cell not join it to the rest?', explanation: 'The braces join rows 1, 2 with columns 1, 2 in one piece, and row 3 with column 3 in another. The two pieces can turn against each other. A brace in a cell where one piece’s row meets the other’s column joins them: four cells work.', extension: 'With five braces, is there another design with a brace in every row and column that still moves?', connection: 'Week 52 Problems 8, 11 and 13: covering every row and column doesn’t make the row-column graph connected.'},
    provenance: 'Week 52 Problems 8 and 11 (a brace in every row and column; one new brace).'},
  {number: 7, level: 'hard', title: 'Still wobbly', p: {rows: 3, cols: 3, mode: 'loose', graph: true, count: 5},
    objective: 'Brace 5 cells, with a brace in every row and every column, so the frame can still move.',
    idea: 'To stay loose with many braces, put them all inside a smaller block.',
    hints: ['With five braces most designs hold. Keep two pieces apart.', 'Fill a 2-by-2 block and brace one cell of the row and column left over.', 'Brace rows 1–2 in columns 1–2, and the cell in row 3, column 3.'],
    check: {loose: 9},
    parent: {notice: 'Five is the most braces a 3-by-3 frame can have, with every row and column braced, and still move.', prompt: 'Could six braces, in six different cells, leave it moving?', explanation: 'To move, the dots must split into at least two pieces, each with a row and a column. Two rows and two columns hold at most 4 braces, and the other row and column 1, so 5 at most. With six braces in different cells, every row and column braced, the frame must hold. 9 designs work: pick the lone row and the lone column.', extension: 'On a 4-by-4 frame, what is the most braces that leave it moving?', connection: 'Week 52 Problem 13 (six braces must hold a 3-by-3 frame), turned into building the largest loose design.'},
    provenance: 'Week 52 Problem 13, as a construction.'},
  {number: 8, level: 'hard', title: 'Windows', p: {rows: 3, cols: 4, mode: 'fewest', graph: true, windows: '.##./.##./....'},
    objective: 'Make the frame hold its shape with the fewest braces.',
    idea: 'A column whose only open cell is at the bottom must be braced there.',
    hints: ['Which columns have only one cell that can take a brace?', 'Columns 2 and 3 can only be braced in row 3.', 'Brace row 3 all along, then rows 1 and 2 in column 1.'],
    check: {fewest: 6, designs: 12},
    parent: {notice: 'The windows decide some braces: columns 2 and 3 can only be braced in row 3.', prompt: 'Which braces does every answer share?', explanation: 'Seven dots need six links. Columns 2 and 3 can only link to row 3, so those two braces are in every answer. Rows 1 and 2 can only link to columns 1 and 4. The rest is choosing links among rows 1–3 and columns 1 and 4 with no loop: 12 designs.', extension: 'Add one more window so that the frame can never hold.', connection: 'Spanning trees of a bipartite graph with some links missing.'},
    provenance: 'New, extending Week 52 Problem 12 (fewest braces) with cells that can’t be braced.'},
  {number: 9, level: 'hard', title: 'Ten and still wobbly', p: {rows: 4, cols: 4, mode: 'loose', graph: true, count: 10},
    objective: 'Brace 10 cells, with a brace in every row and every column, so the frame can still move.',
    idea: 'The largest loose design fills a 3-by-3 block and braces the lone corner.',
    hints: ['Keep one row and one column apart from the rest.', 'Fill a 3-by-3 block: that is 9 braces.', 'Fill rows 1–3 in columns 1–3, and brace the cell in row 4, column 4.'],
    check: {loose: 16},
    parent: {notice: 'Ten braces, one in every row and column, and the frame still moves.', prompt: 'Could 11 braces in different cells, every row and column braced, still move?', explanation: 'A moving frame splits its dots into two pieces, each with some rows and columns. A piece with a rows and c columns holds at most a × c braces, and the most for two pieces of a 4-by-4 frame is 3 × 3 + 1 × 1 = 10. So 11 braces must hold. 16 designs reach 10: choose the lone row and the lone column.', extension: 'What is the most for a 4-by-5 frame?', connection: 'Week 52 Problem 14 (nine braces in every row and column need not hold), pushed to the extreme case.'},
    provenance: 'Week 52 Problem 14, as the largest loose design.'},
  {number: 10, level: 'hard', title: 'Building front', p: {rows: 4, cols: 5, mode: 'fewest', graph: true, windows: '#.#.#/#.#.#/#.#.#/.....'},
    objective: 'Make the frame hold its shape with the fewest braces.',
    idea: 'Forced braces first, then a loop-free choice for the rest.',
    hints: ['Columns 1, 3 and 5 can only be braced in the bottom row.', 'Rows 1–3 can only link to columns 2 and 4.', 'Brace the whole bottom row, then row 1, 2 and 3 in column 2.'],
    check: {fewest: 8, designs: 32},
    parent: {notice: 'Three braces are decided by the windows; the other five have 32 arrangements.', prompt: 'Why can’t seven braces hold it?', explanation: 'Four rows and five columns are nine dots, and eight links are needed to join them. Columns 1, 3 and 5 can only be braced in row 4, so those are in every answer. Rows 1–3 link only to columns 2 and 4, so the rest is a loop-free choice among rows 1–4 and columns 2 and 4: 32 designs.', extension: 'Without windows, how many braces does a 4-by-5 frame need?', connection: 'Week 52 Problem 12 (fewest braces for a 4-by-5 grid, and why fewer cannot work).'},
    provenance: 'Week 52 Problem 12 (a 4-by-5 grid), with windows.'}
];

const out = PUZZLES.map(item => {
  const q = {...item.p};
  if (typeof q.windows === 'string') q.windows = windowsOf(q.rows, q.cols, q.windows);
  if (typeof q.start === 'string') q.start = cells(q, q.start).sort((a, b) => a - b);
  const id = `braces-${String(item.number).padStart(2, '0')}`, c = item.check;
  assert.ok((q.start || []).every(k => allowed(q, k)), `${id}: start braces are open cells`);
  if (q.mode === 'fewest') {
    assert.equal(fewest(q), c.fewest, `${id}: fewest`);
    assert.equal(fewestDesigns(q).length, c.designs, `${id}: designs`);
    if (q.start) assert.ok(holds(q, q.start) && q.start.length > fewest(q), `${id}: the start holds with braces to spare`);
  }
  if (q.mode === 'one') {
    assert.ok(!holds(q, q.start), `${id}: the start moves`);
    const works = Array.from({length: q.rows * q.cols}, (_, k) => k).filter(k => allowed(q, k) && !q.start.includes(k) && holds(q, [...q.start, k]));
    assert.deepEqual(works, cells(q, c.works).sort((a, b) => a - b), `${id}: the cells that work`);
  }
  if (q.mode === 'loose') assert.equal(looseDesigns(q).length, c.loose, `${id}: loose designs`);
  if (q.mode === 'one' && item.number === 6) assert.ok(covers(q, q.start), `${id}: every row and column braced`);
  const kind = q.mode;
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'braces', familyTitle: 'Bracing frames', revision: 1,
    parameters: q,
    objective: item.objective, visibleObjective: item.objective, instruction: item.objective,
    controls: CONTROLS[kind],
    rules: [...FRAME, MORE[kind], ...(q.windows ? [MORE.windows] : []), ...(q.graph ? [MORE.graph] : [])],
    idea: item.idea, prerequisites: `${PREREQUISITES[kind]}${q.graph ? ` ${PREREQUISITES.graph}` : ''}`, hints: item.hints,
    parent: {...item.parent, sourceIds: sources},
    provenance: item.provenance, sourceDocument: 'docs/braces/README.md'
  };
});
const playground = {
  id: 'braces-playground', number: 0, title: 'Bracing frames playground', band: 'playground', difficulty_level: 'playground', mechanic: 'braces', familyTitle: 'Bracing frames', revision: 1,
  parameters: {mode: 'playground', rows: 3, cols: 4, graph: true},
  objective: 'Brace any cells and push the frame.',
  controls: CONTROLS.playground,
  rules: [...FRAME, MORE.graph],
  idea: 'Free bracing and pushing on a 3-by-4 frame, with its rows and columns beside it.',
  prerequisites: 'None. A grown-up can suggest a question from the puzzles.',
  hints: ['Brace a few cells and push.', 'Brace a whole row and a whole column. Does it hold?', 'Brace cells on a diagonal and push.'],
  parent: {notice: 'The frame holds exactly when the dots beside it are all joined.', prompt: 'What is the fewest number of braces that holds this frame?', explanation: 'Three rows and four columns are seven dots, so at least six braces are needed. A row of braces and a column of braces that cross make six that work.', extension: 'Brace every row and every column and still let it move. How many braces can you use?', connection: 'Bolker and Crapo’s theorem on bracing rectangular frameworks.', sourceIds: sources},
  provenance: 'Week 52 materials: free building and pushing with the hinged frames.',
  instruction: 'Brace any cells and push the frame.', sourceDocument: 'docs/braces/README.md'
};
const json = {
  title: 'Bracing frames',
  version: 1,
  families: [{id: 'braces', title: 'Bracing frames', mathematics: 'A grid of square cells is built from bars of fixed length and pins that turn; a brace keeps its cell square. All horizontal bars in a column stay parallel, and all vertical bars in a row, so a brace locks its row’s angle to its column’s. The frame holds its shape exactly when the braces join every row and column into one piece: the bipartite row-column graph is connected (Bolker and Crapo, 1979). The fewest braces are rows + columns − 1, and they form a spanning tree; a brace can go exactly when its link is on a loop; and a brace in every row and column does not make the frame hold.', rules: FRAME, sourceIds: sources}],
  sources: [
    {id: 'braces-bolker-crapo', title: 'Ethan D. Bolker and Henry Crapo — Bracing rectangular frameworks I, SIAM Journal on Applied Mathematics 36 (1979), 473–490', url: 'https://doi.org/10.1137/0136036', kind: 'research'},
    {id: 'braces-graver', title: 'Jack E. Graver — Counting on Frameworks: Mathematics to Aid the Design of Rigid Structures, Dolciani Mathematical Expositions 25, Mathematical Association of America (2001), chapters 1–2', url: 'https://bookstore.ams.org/DOL/25', kind: 'undergraduate'},
    {id: 'braces-week52', title: 'Bellingham Math Circle — Week 52: Hinged frames and braces (worksheets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-52', kind: 'worksheet'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/braces/braces.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.rows}x${p.parameters.cols}`).join('\n'));
