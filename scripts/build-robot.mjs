// Builds dist/families/robot/robot.json, the Memory robot family, from the
// authoring list below. Each puzzle's budget, the fewest moves that bring the
// robot to the flag with the goal memory on the board, is computed here with
// the module's own backward search (dist/families/robot/robot.js), with a
// shortest walk as its witness and the number of shortest walks; both are
// checked again by scripts/validate-robot.mjs with a separate simulator.
// Design notes and sources: docs/robot/README.md.
import {writeFile} from 'node:fs/promises';
import {ORDER, SEARCH_CAP, startOf, step, onBoard, reached, toGo, finish} from '../dist/families/robot/robot.js';

const WEEK72 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-72';
export const sources = [
  {id: 'robot-week72', title: 'Bellingham Math Circle — Week 72: A robot that remembers area (grades 4–5 packet and adult guide)', url: WEEK72, kind: 'local curriculum'},
  {id: 'robot-review', title: 'Bellingham Math Circle — Week 72 review card, with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-72.md', kind: 'local curriculum'},
  {id: 'robot-duchin-mooney', title: 'Moon Duchin and Christopher Mooney — Fine asymptotic geometry in the Heisenberg group (word metrics on the integer Heisenberg group, and the area a loop encloses as its height)', url: 'https://arxiv.org/abs/1106.5276', kind: 'research'},
  {id: 'robot-harary-harborth', title: 'Frank Harary and Heiko Harborth — Extremal animals, Journal of Combinatorics, Information & System Sciences 1 (1976), 1–8: the least perimeter of n unit squares is 2⌈2√n⌉', url: 'https://oeis.org/A027709', kind: 'research'}
];
const RULES = [
  'The robot walks along the streets, one block per move: east, west, north or south.',
  'Its memory starts at 0. A step north adds the robot’s column number, and a step south takes it away. East and west leave the memory alone.',
  'The columns are numbered from the wall: 1, 2, 3 to its right and −1, −2 to its left.',
  'Each step north or south shades the squares between the robot and the wall, in the row it crosses. Yellow squares count 1 and blue squares −1, and a square with a number counts that number. The shaded squares add up to the memory.'
];
const BUDGET = 'The boxes under the board show how many moves you have.';
const DONE = 'The puzzle is solved when the robot stands on the flag with the goal memory.';
export const family = {
  id: 'robot',
  title: 'Memory robot',
  mathematics: 'The robot walks the streets of a square grid, one block per move, and carries a memory that starts at 0: a step north adds its column number x, a step south subtracts it, and east and west change nothing. So the memory after a walk is the sum of x·Δy over its north and south steps, the signed area between the walk and the wall (the column x = 0), strip by strip. The end corner does not decide it: EN leaves 1 and NE leaves 0, and the staircases to (a, b) leave every memory from 0 to ab. A walk that comes back to its start keeps only the strips inside it, so its memory is the area it encloses, positive anticlockwise and negative clockwise, wherever the loop is slid. A loop that remembers n ≥ 1 needs at least 2⌈2√n⌉ moves, the least perimeter of n unit squares (Harary and Harborth, 1976), and that many are enough. An open walk can be shorter for going past the flag and back. The robot’s state (x, y, z) is an element of the integer Heisenberg group, each move multiplying it by a generator; the fewest moves to change only the memory by n grow like the square root of n.',
  rules: [...RULES, BUDGET, DONE],
  sourceIds: sources.map(s => s.id)
};
const OBJECTIVE = 'Bring the robot to the flag with the goal memory, in exactly the moves shown.';
const CONTROLS = 'Tap a corner next to the robot to move it there, or use the arrow keys. Undo takes a move back.';

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Order matters',
    parameters: {start: [0, 0], flag: [1, 1], goal: 1},
    idea: 'East then north leaves 1; north then east leaves 0. Both walks end at the same corner, so the order of the moves decides the memory, not the corner.',
    prerequisites: 'Tell east, west, north and south on the board, and add small whole numbers.',
    hints: ['There are two ways to the flag. Watch the memory on each.', 'A step north adds the column the robot is standing on.', 'East, then north.'],
    parent: {
      notice: 'Whether your child predicts the memory before the step north, or reads it afterwards.',
      prompt: 'Why does going north first leave 0?',
      explanation: 'Only steps north and south change the memory, by the column the robot is on. North first happens on column 0, the wall, and adds nothing; after one step east the robot is on column 1, and north adds 1. Both walks end at the same corner with different memories.',
      extension: 'Find three walks to the corner two east and one north. What memories do they leave? (EEN 2, ENE 1, NEE 0.)',
      connection: 'East and north do not commute: the robot’s state, its corner and its memory, is an element of the integer Heisenberg group, and EN and NE differ only in the memory.'
    },
    provenance: 'Week 72 shared launch (EE, EEN and EENE) and Problem 1 (two E and two N cards in any order), cut to one of each.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Staircases',
    parameters: {start: [0, 0], flag: [2, 2], goal: 3},
    idea: 'The six staircases to (2, 2) leave 4, 3, 2, 2, 1 or 0: each step north adds the column it climbs. Only east, north, east, north climbs on columns 1 and 2.',
    prerequisites: 'Order matters.',
    hints: ['Try a few ways to the flag and watch the memory.', 'Each step north adds the column it is on. Which two columns add up to 3?', 'East, north, east, north.'],
    parent: {
      notice: 'Whether your child starts to plan which columns the two steps north happen on.',
      prompt: 'Which staircase leaves the most memory, and which the least?',
      explanation: 'Two steps east and two north reach the flag in four moves. The steps north happen on two of the columns 0, 1 and 2 (perhaps the same one twice), and the memory is their sum: NNEE 0, NENE 1, NEEN 2, ENNE 2, ENEN 3, EENN 4. Only ENEN leaves 3. The memory is also the number of squares between the staircase and the wall.',
      extension: 'Which memories can a staircase to the corner three east and two north leave? (Every number from 0 to 6.)',
      connection: 'A staircase to (a, b) leaves the number of squares between it and the wall, and every number from 0 to ab occurs.'
    },
    provenance: 'Week 72 Problem 1 (the six routes from O to the ring with two E and two N cards, memories 4, 3, 2, 2, 1 and 0).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'A loop at home',
    parameters: {start: [0, 0], flag: [0, 0], goal: 1},
    idea: 'Round one square anticlockwise, the robot climbs on the column one to the right of where it comes down, and comes home with 1 more: a loop can change the memory without moving the robot.',
    prerequisites: 'Order matters.',
    hints: ['Can the robot come home with a different memory?', 'Walk round one square.', 'East, north, west, south.'],
    parent: {
      notice: 'Whether your child is surprised that the robot can come home changed.',
      prompt: 'Where did the 1 come from?',
      explanation: 'Round a square anticlockwise the robot climbs north on its right side and comes down south on its left side, one column less, so the two steps leave 1 between them. The shading shows it: the strip shaded going up is taken back coming down, except the one square inside the loop. Any of the four squares at home works, on either side of the wall.',
      extension: 'Walk round the same square twice. What memory now?',
      connection: 'East, north, west, south is a commutator: the robot is back where it started and only the memory has changed. In the Heisenberg group such loops are central, so they can be done anywhere along a walk with the same effect.'
    },
    provenance: 'Week 72 Problem 2 (E, N, W and S once each, coming back to O; the memories are −1, 0 and 1).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'The other way round',
    parameters: {start: [0, 0], flag: [0, 0], goal: -1},
    idea: 'Round a square clockwise, the robot climbs on the left side and comes down on the right: the direction round a loop sets the sign of its memory.',
    prerequisites: 'A loop at home.',
    hints: ['Go round a square the other way.', 'Climb on the left side and come down on the right.', 'North, east, south, west.'],
    parent: {
      notice: 'Whether your child predicts −1 from the last puzzle before trying.',
      prompt: 'What do the same four moves do in the other order?',
      explanation: 'A square’s right side is one column more than its left. Walking it clockwise, the step north is on the left side and the step south on the right, so they leave −1, and the square inside shades blue. This holds on either side of the wall.',
      extension: 'Come home in four moves with memory 0. (Go out and back, as in east, west, north, south.)',
      connection: 'A loop walked backwards undoes it: its memory changes sign. The three memories four moves can bring home, −1, 0 and 1, are Week 72 Problem 2.'
    },
    provenance: 'Week 72 Problem 2 (NESW leaves −1; the guide compares a loop with its reverse).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Two by two',
    parameters: {start: [0, 0], flag: [0, 0], goal: 4},
    idea: 'A loop’s memory is the number of squares inside it: round a 2 × 2 square it is 4.',
    prerequisites: 'A loop at home.',
    hints: ['Watch which squares stay shaded when the robot comes home.', 'A loop keeps the squares inside it shaded.', 'East, east, north, north, west, west, south, south.'],
    parent: {
      notice: 'Whether your child counts the shaded squares to predict the memory before the loop closes.',
      prompt: 'Why do the squares outside the loop go back to blank?',
      explanation: 'In each row it crosses, a loop goes up once and down once. Each step shades the row from the wall to the robot, one way or the other, so the two strips cancel except for the stretch between the two columns: the inside of the loop. A loop round a 2 × 2 square, anticlockwise, comes home with 4, from any of its eight corners and edge midpoints.',
      extension: 'Can a loop of 8 moves remember 5? (No: 8 moves enclose at most 4 squares.)',
      connection: 'This is Green’s theorem on the grid: the sum of x·Δy round a closed walk is the signed area inside it (Week 72 guide, Problem 3).'
    },
    provenance: 'Week 72 Problem 3 (walk once round each outline in each direction) and the guide’s cancellation argument that a loop remembers its signed area.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Three squares',
    parameters: {start: [0, 0], flag: [0, 0], goal: 3},
    idea: 'Three squares in a row and an L of three both take 8 moves to walk round and both remember 3: only the area counts, not the shape.',
    prerequisites: 'Two by two.',
    hints: ['Find a loop round three squares.', 'Three in a row, or an L.', 'East, east, east, north, west, west, west, south.'],
    parent: {
      notice: 'Whether your child tries a second shape after one works.',
      prompt: 'Is there another shape that remembers 3 in 8 moves?',
      explanation: 'A loop remembers its area. Three squares in a row and an L of three both have 8 sides round them, so both work, from many corners. Three squares can’t be walked round in fewer: 6 moves enclose at most 2.',
      extension: 'Find a loop of 8 moves that remembers −3.',
      connection: 'The L is one of Week 72 Problem 3’s outlines, remembering 3 one way round and −3 the other.'
    },
    provenance: 'Week 72 Problem 3 (the L outline, +3 and −3, beside the 2 × 1 rectangles).'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Six squares',
    parameters: {start: [0, 0], flag: [0, 0], goal: 6},
    idea: 'Ten moves enclose at most six squares, and only a 2 × 3 rectangle does it: a shape near a square holds the most for its length.',
    prerequisites: 'Three squares.',
    hints: ['Which shape of 6 squares has the shortest way round?', 'A rectangle 3 wide and 2 tall, or 2 wide and 3 tall.', 'East, east, east, north, north, west, west, west, south, south.'],
    parent: {
      notice: 'Whether your child tries six squares in a row first and runs out of moves.',
      prompt: 'Why does a row of six need more moves?',
      explanation: 'A row of six squares has 14 sides round it and a 2 × 3 rectangle has 10. A loop of 10 moves encloses at most 6 squares, and only a 2 × 3 rectangle, either way up, does it.',
      extension: 'How many squares can a loop of 12 moves hold? (9, round a 3 × 3 square.)',
      connection: 'The fewest moves round n squares is 2⌈2√n⌉, the least perimeter of n unit squares (Harary and Harborth, 1976); Garden fences finds the same shortest fences.'
    },
    provenance: 'New for the app: the most area for the moves, after Week 72 Problem 3.'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Far from the wall',
    parameters: {start: [3, 0], flag: [3, 0], goal: 2},
    idea: 'Far from the wall each step north or south shades a long strip, but round a loop the strips cancel: sliding a loop keeps its memory, 2 for two squares.',
    prerequisites: 'Two by two.',
    hints: ['Watch the long strips when you come back down.', 'A loop remembers only the squares inside it, wherever it is.', 'East, north, west, west, south, east.'],
    parent: {
      notice: 'Whether your child expects a loop far from the wall to need a big memory.',
      prompt: 'Why did going up add 4 here, when the loop only remembers 2?',
      explanation: 'The step north at column 4 shades four squares in its row; the step south at column 2, in the same row, takes back the two nearest the wall. The two left are the inside of the loop. Sliding a loop sideways adds the same to its climbs as to its descents, and they cancel.',
      extension: 'Walk the same loop next to the wall. Does its memory change?',
      connection: 'Sliding a closed walk sideways by h adds h times the sum of its steps north and south, which is 0 for a loop (Week 72 guide, Problem 3).'
    },
    provenance: 'Week 72 Problem 3 (the same 2 × 1 rectangle at columns 0, 2 and −3 keeps its memory).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Seven squares',
    parameters: {start: [0, 0], flag: [0, 0], goal: 7},
    idea: 'No rectangle holds seven squares, but a 2 × 4 box with one corner bitten out, or a 3 × 3 box with two, does in 12 moves, and no loop of 10 moves can: 2⌈2√7⌉ = 12.',
    prerequisites: 'Six squares.',
    hints: ['Start from a box that holds more than seven squares.', 'Leave a corner square out of a 2 by 4 loop.', 'East, east, east, north, east, north, west, west, west, west, south, south.'],
    parent: {
      notice: 'Whether your child tries a long strip or a rectangle first and finds it needs more moves.',
      prompt: 'Why does biting a corner out of a box keep the loop the same length?',
      explanation: 'Taking a corner square out of a rectangle swaps two sides of the box for the two sides of the notch, so the loop keeps its length. A 2 × 4 box minus one corner holds 7 in 12 moves, and so does a 3 × 3 box minus two corners. Ten moves hold at most six squares, so 12 is the fewest.',
      extension: 'What’s the most memory a 12-move loop can hold? (9, round a 3 × 3 square.)',
      connection: 'The fewest moves for a loop that remembers n is 2⌈2√n⌉, the least perimeter of n unit squares (Harary and Harborth, 1976), the same bound as Week 26’s shortest fences.'
    },
    provenance: 'New for the app: the least perimeter of seven squares, after Week 72 Problem 3; Week 26 (Garden fences) has the same bound.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Past the flag',
    parameters: {start: [0, 0], flag: [2, 2], goal: 5},
    idea: 'A staircase to (2, 2) leaves at most 4. Two more moves take the robot one column past the flag and back, and a step north there adds 3.',
    prerequisites: 'Staircases.',
    hints: ['The flag doesn’t have to be the farthest you go.', 'A step north on column 3 adds 3.', 'East, east, east, north, west, north.'],
    parent: {
      notice: 'Whether your child tries the staircases first and sees that none reaches 5.',
      prompt: 'Why can’t four moves do it?',
      explanation: 'Four moves to (2, 2) must be two east and two north, and the most they leave is 4 (EENN). Six moves can step out to column 3, climb there for 3, and come back: EEENWN leaves 3 + 2 = 5. Three other six-move walks work too, such as ESENNN, which dips below the start first.',
      extension: 'Reach the flag with memory 7, as Week 72 Problem 4 asks. How few moves can you use? (Eight, as in the guide’s EEEENWNW; memory 6 takes only six, as in EEENNW.)',
      connection: 'Week 72 Problem 4 shows any whole number can be the memory at the ring. The fewest moves for each is a distance in the Heisenberg group’s word metric, which Duchin and Mooney study.'
    },
    provenance: 'New for the app: the fewest moves, after Week 72 Problem 4 (reach the ring with memory 7, and with −3).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Over the wall',
    parameters: {start: [0, 0], flag: [2, 2], goal: -2},
    idea: 'A negative memory comes from climbing on the far side of the wall, or from coming down far to its right: WNNEEE climbs twice on column −1.',
    prerequisites: 'Staircases, and adding negative numbers.',
    hints: ['Where would a step north take memory away?', 'Left of the wall, the column numbers are negative.', 'West, north, north, east, east, east.'],
    parent: {
      notice: 'Whether your child uses the blue squares to keep track of the minus signs.',
      prompt: 'Is there a six-move walk that never crosses the wall?',
      explanation: 'A step north on column −1 adds −1. WNNEEE climbs there twice, −2, then walks east to the flag. NNNEES climbs the wall, which adds nothing, goes past the flag and comes down on column 2, taking away 2. Those are the only two six-move walks; four moves can only leave 0 to 4.',
      extension: 'Reach the flag with memory −3. (Eight moves, as in the Week 72 guide’s NNNENESS.)',
      connection: 'Week 72 Problem 4 asks for memory −3 at the ring; its guide climbs past the ring and comes back down on column 2.'
    },
    provenance: 'New for the app, after Week 72 Problem 4 (memory −3 at the ring) and Problem 2’s negative columns.'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'One block out',
    parameters: {start: [0, 0], flag: [0, 3], goal: 3},
    idea: 'Straight up the wall leaves 0. One block east first makes each of the three steps north add 1, and one block back keeps it.',
    prerequisites: 'Order matters.',
    hints: ['Going straight up the wall adds nothing.', 'Climb one column out from the wall.', 'East, north, north, north, west.'],
    parent: {
      notice: 'Whether your child sees that two extra moves can be worth it.',
      prompt: 'Why does climbing on column 1 add 3 here?',
      explanation: 'Straight up, NNN, leaves 0, since column 0 adds nothing. ENNNW climbs three blocks on column 1, adding 1 each time, and the steps east and west change nothing. A walk to the flag has an odd number of moves, so after 3 the next try is 5, and ENNNW is the only one.',
      extension: 'Reach the flag with memory 6. (Seven moves: EENNNWW.)',
      connection: 'Raising the memory at a fixed corner costs moves, and for large memories the fewest moves grow like the square root of the memory: the Heisenberg group’s word metric (Duchin and Mooney).'
    },
    provenance: 'New for the app: climbing on the wall against climbing one column out, after Week 72 Problem 1.'
  }
];

// Every shortest walk's count: walks of exactly the budget that reach the
// goal, by counting walks layer by layer and keeping only states that can
// still finish in time.
function shortestCount(q) {
  let layer = new Map([[startOf(q).join(), {s: startOf(q), n: 1}]]);
  for (let k = 0; k < q.budget; k++) {
    const next = new Map();
    for (const {s, n} of layer.values()) for (const d of ORDER) {
      const t = step(s, d);
      if (!onBoard(t[0], t[1]) || toGo(q, t) > q.budget - k - 1) continue;
      const key = t.join();
      next.set(key, {s: t, n: (next.get(key)?.n || 0) + n});
    }
    layer = next;
  }
  return [...layer.values()].filter(({s}) => reached(q, s)).reduce((sum, {n}) => sum + n, 0);
}
const solve = q => {
  const fewest = toGo(q, startOf(q), SEARCH_CAP);
  if (!Number.isFinite(fewest) || fewest === 0) throw Error(`no puzzle in ${JSON.stringify(q)}`);
  const budgeted = {...q, budget: fewest};
  return {budget: fewest, walk: finish(budgeted), count: shortestCount(budgeted)};
};
const common = {familyTitle: 'Memory robot', mechanic: 'robot', band: 'all', revision: 1, sourceDocument: 'docs/robot/README.md'};
export const puzzles = authored.map(item => {
  const {budget, walk, count} = solve(item.parameters);
  return {
    id: `robot-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    difficulty_level: item.difficulty_level,
    ...common,
    parameters: {...item.parameters, budget},
    objective: OBJECTIVE,
    visibleObjective: '',
    instruction: OBJECTIVE,
    controls: CONTROLS,
    rules: [...RULES, BUDGET, DONE],
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['robot-week72', ...(/Harary/.test(item.parent.connection) ? ['robot-harary-harborth'] : []), ...(/Heisenberg/.test(item.parent.connection) ? ['robot-duchin-mooney'] : [])]},
    solution: {walk, fewest: budget, shortestWalks: count},
    provenance: item.provenance
  };
});
const playground = {
  id: 'robot-playground',
  number: 0,
  title: 'Memory robot playground',
  difficulty_level: 'playground',
  ...common,
  band: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Walk the robot anywhere and watch its memory.',
  visibleObjective: '',
  instruction: 'Walk the robot anywhere and watch its memory.',
  controls: 'Tap a corner next to the robot to move it there, or use the arrow keys. Clear takes the robot home with memory 0. Undo takes a move back.',
  rules: [...RULES, 'Nothing needs finishing.'],
  idea: 'Free walking: draw loops, big and small, either way round, and watch the shading outside them cancel.',
  prerequisites: 'None.',
  hints: ['Walk round a big loop and come home.', 'Walk the same loop the other way round.', 'Make a loop that crosses itself, like a figure eight.'],
  parent: {
    notice: 'Whether your child predicts the memory before closing a loop.',
    prompt: 'Can you come home with memory 10? With −10?',
    explanation: 'A loop’s memory is its signed area: the squares inside an anticlockwise loop count 1 each and those inside a clockwise loop −1. A loop walked twice counts its squares twice, and a figure eight with one lobe each way can come home with 0.',
    extension: 'Come home with memory 0 by a walk that never goes straight back along a street.',
    connection: 'The robot’s state is an element of the integer Heisenberg group; a loop changes only the memory, its central coordinate (Duchin and Mooney).',
    sourceIds: ['robot-week72', 'robot-duchin-mooney']
  },
  solution: null,
  provenance: 'Week 72 Problems 2 to 4 with free moves: the worksheet’s move cards and memory strip on screen, the strip drawn as shading.'
};
export const pack = {title: 'Memory robot', version: 1, families: [family], sources, puzzles: [playground, ...puzzles]};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/robot/robot.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, JSON.stringify(p.solution));
}
