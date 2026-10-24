// Authoring list for Ways out (worksheet Week 68, "How many ways out").
// Describes the maps, finds every solution of each flat puzzle in a window
// round the start (kept up to moving it along the map, for hints), checks the
// counts in docs/ends/README.md with the mechanic's own piece finder, and
// writes dist/families/ends/ends.json. Run: node scripts/build-ends.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {counts, meets, impossible, endsOf, flatHas, keyOf, xyOf, sortDots, shiftOf, treeNeighbours, treePieces} from '../dist/families/ends/ends.js';

const ALL = [null, null];
// `narrow` changes the view on a phone (up to 560 px wide): 7 columns of the
// line, ladder and strip instead of 9, and 6 of the T instead of 8, so dots
// and rails are about 46 px apart on a 390 px phone rather than 36. The T
// keeps a column and a row of paper above and to the right of its dots for
// the button back to the start.
export const MAPS = {
  line: {kind: 'flat', name: 'Line', bands: [{x: ALL, y: [0, 0]}], view: {w: 9, h: 3, cx: 0, cy: -0.4}, narrow: {w: 7}, pan: 'x', start: [0, 0]},
  ladder: {kind: 'flat', name: 'Ladder', bands: [{x: ALL, y: [0, 1]}], view: {w: 9, h: 3.6, cx: 0, cy: 0.2}, narrow: {w: 7}, pan: 'x', start: [0, 0]},
  strip: {kind: 'flat', name: 'Strip of three rows', bands: [{x: ALL, y: [0, 2]}], view: {w: 9, h: 4.6, cx: 0, cy: 0.7}, narrow: {w: 7}, pan: 'x', start: [0, 1]},
  grid: {kind: 'flat', name: 'Grid', bands: [{x: ALL, y: ALL}], view: {w: 7, h: 7, cx: 0, cy: 0}, pan: 'xy', start: [0, 0]},
  tee: {kind: 'flat', name: 'T of three ladders', bands: [{x: ALL, y: [0, 1]}, {x: [0, 1], y: [2, null]}], view: {w: 8, h: 7.4, cx: 0.5, cy: 2.3, minY: 2.3}, narrow: {w: 6, h: 6.6, cy: 2.1, minY: 2.1}, pan: 'xy', start: [0, 1]},
  tree: {kind: 'tree', name: 'Tree'}
};
// Windows searched for solutions: [x0, x1, y0, y1].
const WINDOW = {line: [-4, 4, 0, 0], ladder: [-3, 3, 0, 1], strip: [-3, 3, 0, 2], grid: [-2, 2, -2, 2], tee: [-3, 4, 0, 4]};

function* subsets(list, k, from = 0, now = []) {
  if (now.length === k) { yield now; return; }
  for (let i = from; i <= list.length - (k - now.length); i++) yield* subsets(list, k, i + 1, [...now, list[i]]);
}
// Every placement of up to `budget` blocks in the window that meets the goal,
// one per shape up to moving along the map, centred on the start; and the
// number of placements in the window by size.
export function solutionsOf(m, window, budget, goal) {
  const [x0, x1, y0, y1] = window, dots = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (flatHas(m, x, y)) dots.push(keyOf(x, y));
  const shift = shiftOf(m), shapes = new Map(), bySize = [];
  for (let k = 0; k <= budget; k++) {
    let n = 0;
    for (const set of subsets(dots, k)) {
      if (!meets(goal, counts(m, set))) continue;
      n++;
      const pts = set.map(xyOf), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const tx = shift ? -Math.min(...xs) : 0, ty = shift === 'xy' ? -Math.min(...ys) : 0;
      const key = sortDots(m, pts.map(([x, y]) => keyOf(x + tx, y + ty))).join(' ');
      if (shapes.has(key)) continue;
      // Centre the shape on the start dot.
      const span = v => Math.max(...v) - Math.min(...v);
      const ox = shift ? m.start[0] - Math.floor(span(xs) / 2) - Math.min(...xs) : 0, oy = shift === 'xy' ? m.start[1] - Math.floor(span(ys) / 2) - Math.min(...ys) : 0;
      shapes.set(key, sortDots(m, pts.map(([x, y]) => keyOf(x + ox, y + oy))));
    }
    bySize.push(n);
  }
  return {patterns: [...shapes.values()], bySize};
}

const RULES = [
  'The map goes on forever. Drag it to look around.',
  'Tap a dot to block it, and tap it again to take the block off. A blocked dot takes its roads with it.',
  'The open dots fall into pieces. A forever piece goes on forever; a trapped piece stops.',
  'Press Check to see the pieces. The counts must match the goal exactly.',
  'After a Check, press Can’t if no blocks could ever reach the goal.'
];
const CONTROLS = 'Drag the map to look around; the round button goes back to the start. Tap a dot to block it, and again to take the block off. The slots show how many blocks you may use. Press Check to see the pieces; after a Check, press Can’t if the goal can never be reached. With a keyboard, Tab to the map, move along the roads with the arrow keys and press Enter or Space.';
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
function objective(goal, budget) {
  const parts = [goal.forever !== undefined ? `exactly ${plural(goal.forever, 'forever piece')}` : '', goal.trapped !== undefined ? `exactly ${plural(goal.trapped, 'trapped piece')}` : ''].filter(Boolean);
  return `Block at most ${plural(budget, 'dot')} so that the open dots make ${parts.join(' and ')}.`;
}
const PREREQUISITES = {
  line: 'Tell a piece that stops from one that keeps going. No reading; counting to four.',
  ladder: 'Follow a route round a block along the other rail. No reading; counting to four.',
  grid: 'See every road out of a dot. No reading; counting to six.',
  tree: 'Count roads out of a dot and keep blocks apart. Counting to nine; the 2m + 1 count is for grown-ups.',
  tee: 'Follow routes along three ladders and see where they meet.',
  strip: 'Follow three rows at once and see a wall that steps.',
  cant: 'Decide that something can never happen, after a few tries. The reason (a box round the blocks) is a grown-up conversation.'
};
const sources = ['ends-week68', 'ends-card68', 'ends-ggt'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two pockets', map: 'line', budget: 4, goal: {trapped: 2}, visible: 'Trap exactly 2 pieces.', prereq: 'line',
    check: {possible: true, bySize: [0, 0, 0, 35, 60]},
    idea: 'Blocks trap the pieces between them, but the two tails past the end blocks always go on forever.',
    hints: ['A trapped piece needs a block on each side.', 'Leave one open dot between blocks: block, gap, block, gap, block.', 'Three blocks with one open dot between each pair trap two pieces.'],
    parent: {notice: 'Whether your child counts the two ends of the line as trapped, and whether two blocks side by side seem to trap something.', prompt: 'Which pieces could you walk along forever?', explanation: 'On a line, the open dots between two neighbouring blocks make one piece that stops at both blocks: it is trapped. The dots before the first block and after the last make two tails that go on forever. Four blocks leave three gaps between them, so exactly two pieces are trapped when one gap is empty (two blocks side by side); three blocks with a gap between each pair work too. In the worksheet’s nine dots, 60 placements of four blocks and 35 of three do it. However many blocks, there are always exactly two forever pieces.', extension: 'How many pieces can four blocks trap? (Three: leave a gap between every pair.)', connection: 'The forever pieces are the unbounded components left after removing finitely many dots; the most there can ever be is the number of ends, two for the line (Druţu and Kapovich, Definition 9.3).'},
    provenance: 'Week 68 Problem 2 (four blockers so that exactly two pieces are trapped), on Problem 1’s line.'},
  {number: 2, level: 'easy', title: 'Split the ladder', map: 'ladder', budget: 2, goal: {forever: 2}, visible: 'Make 2 forever pieces.', prereq: 'ladder',
    check: {possible: true, bySize: [0, 0, 19]},
    idea: 'One block never splits the ladder, because the other rail goes round it; two blocks straight or slanting across it do.',
    hints: ['Try one block and Check. Can the pieces still go round?', 'A block on one rail leaves the other rail open. Block both rails.', 'Block the two dots of one rung, or one dot on each rail in neighbouring columns.'],
    parent: {notice: 'Whether your child expects one block to split the ladder, as on the line, and what they do when Check shows one piece.', prompt: 'Why doesn’t one block cut the ladder in two?', explanation: 'Every rung joins the two rails, so a route round a single block steps across a rung, along the other rail and back. Two blocks split the ladder when no road crosses between their columns: the two dots of one rung, or one rail at a column and the other rail at the next column. In a nine-column window 25 pairs split it, and 16 of them slant (the review’s math check). Two blocks on the same rail never do.', extension: 'Can two blocks trap anything on the ladder? (No: a trapped dot needs three blocks round it.)', connection: 'The fewest blocks that separate the two ends equals the most routes between them that share no dot, here the two rails (Menger’s theorem).'},
    provenance: 'Week 68 Problem 3 (the ladder game, split with the fewest blocks), with the review card’s fix 1 (slanting splits).'},
  {number: 3, level: 'easy', title: 'Fence a dot', map: 'grid', budget: 4, goal: {trapped: 1}, visible: 'Trap a piece.', prereq: 'grid',
    check: {possible: true, bySize: [0, 0, 0, 0, 9]},
    idea: 'On the grid a trapped piece needs every road out of it closed: four blocks round one dot.',
    hints: ['A trapped piece has no open road leading away from it.', 'One dot on the grid has four roads. Block the dot at the end of each.', 'Block the four dots next to one dot: above, below, left and right.'],
    parent: {notice: 'Whether your child builds a straight wall and sees the pieces join round its ends.', prompt: 'Where could a piece inside get out?', explanation: 'Each grid dot has four roads, to the dots above, below, left and right. Block those four and the dot in the middle is trapped; everything else is one forever piece. Four blocks trap nothing else: of every placement of up to four blocks in a 5 × 5 window, the 9 that trap something are exactly the four neighbours of a dot.', extension: 'Trap a piece of two dots side by side. How many blocks? (Six.)', connection: 'The smallest bounded component the grid can have is one dot, and its boundary has four dots.'},
    provenance: 'Week 68 Problem 5, left grid (four blockers trap an open dot), with the math check’s note that the dot must be in the middle of the blocks.'},
  {number: 4, level: 'easy', title: 'Three ways off a line?', map: 'line', budget: 4, goal: {forever: 3}, visible: 'Make 3 forever pieces.', prereq: 'cant',
    check: {possible: false, ends: 2}, trial: ['0,0'],
    idea: 'However the blocks go, a line has only two tails, so never more than two forever pieces.',
    hints: ['Try some blocks and Check. Where are the forever pieces?', 'Every forever piece goes on past all the blocks. Which ways can it go?', 'Past all the blocks there are only two ways to go, left and right. Press Can’t.'],
    parent: {notice: 'Whether your child keeps trying after a few Checks, or says why it can’t work.', prompt: 'Where would a third forever piece go?', explanation: 'All the blocks lie between the leftmost one and the rightmost one. Beyond them are two tails, each one piece that goes on forever. Every other piece lies between two blocks and stops. So there are always exactly two forever pieces, however many blocks. Pressing Can’t draws the box round the blocks and colours the two tails.', extension: 'Can a line have just one forever piece? (Only with no blocks; one block already leaves two.)', connection: 'The line has two ends: the most forever pieces finitely many blocks can make is the number of ends.'},
    provenance: 'Week 68 Problem 1 (as many forever pieces as you can on a line, with 1, 2 and 4 blockers: always 2), asked as a claim.'},
  {number: 5, level: 'medium', title: 'Seven ways out', map: 'tree', budget: 3, goal: {forever: 7}, visible: 'Make 7 forever pieces.', prereq: 'tree',
    check: {possible: true},
    idea: 'Each block splits its piece into at most three, so three blocks make at most seven, and only when no two touch and nothing is trapped.',
    hints: ['Block one dot and Check. How many pieces?', 'Each block can add two forever pieces, but not if it touches another block or traps a dot.', 'Block the centre and two dots two roads out on different branches.'],
    parent: {notice: 'Whether your child blocks the three dots next to the centre, which traps the centre: six forever pieces and one trapped.', prompt: 'What does each new block do to the piece it lands on?', explanation: 'A dot has three roads, so blocking it splits its piece into at most three: two more pieces. One block makes 3, two at most 5, three at most 7. A block next to another gains less, because one of its roads already led to a block, and closing every road round a dot traps it. Seven needs three blocks with no two touching and nothing trapped, for example the centre and two dots two roads out on different branches. The validator checks every placement of up to four blocks within three roads of the centre: the most is always 2m + 1. Blocking everything near the centre, as on the worksheet, is not the cheapest: four blocks for six pieces.', extension: 'How many forever pieces can ten blocks make? (21, spread out; blocking every dot within two roads of the centre uses ten and makes only 12.)', connection: 'The tree has infinitely many ends: m blocks can make 2m + 1 forever pieces, more than any number you name. In a tree the pieces (trapped ones included) number 2m + 1 minus the roads between blocks.'},
    provenance: 'The Week 68 review card’s App fit (“make seven forever pieces with three blocks”) and fix 12 (spread-out blockers), on Problem 7’s tree.'},
  {number: 6, level: 'medium', title: 'Three ways off a ladder?', map: 'ladder', budget: 4, goal: {forever: 3}, visible: 'Make 3 forever pieces.', prereq: 'cant',
    check: {possible: false, ends: 2}, trial: ['0,0', '0,1'],
    idea: 'The ladder has two ends: past all the blocks lie only two tails.',
    hints: ['Split the ladder and Check. Is there room for a third forever piece?', 'A forever piece goes on past every block. On a ladder that is left or right.', 'Only two tails lie past all the blocks, so it can’t be done. Press Can’t.'],
    parent: {notice: 'Whether your child makes three pieces with a trapped one in the middle and counts it as forever.', prompt: 'Where does a third piece go once it passes every block?', explanation: 'All the blocks lie in a box of columns. Left of it and right of it are two tails, each a whole half-ladder in one piece. Every forever piece goes on past the box, so it holds a tail, and there are only two. Four blocks can make three pieces (block two rungs with a rung between), but the middle one is trapped. The validator checks every placement of up to four blocks in a nine-column window.', extension: 'Would a strip of three rows do better? (No: still two tails.)', connection: 'The ladder has the same two ends as the line: from far away it looks like a line (it is quasi-isometric to it), and the number of ends does not change under that.'},
    provenance: 'Week 68 Problem 4 (can four blocked dots make three forever pieces on the ladder?).'},
  {number: 7, level: 'medium', title: 'Split and trap', map: 'ladder', budget: 3, goal: {forever: 2, trapped: 1}, visible: 'Make 2 forever pieces and trap 1.', prereq: 'ladder',
    check: {possible: true, bySize: [0, 0, 0, 10]},
    idea: 'Three blocks round one dot of a rail trap it and split the ladder at once.',
    hints: ['Which dots do one ladder dot’s roads lead to?', 'Block both neighbours of a dot on its rail, and the dot across the rung from it.', 'Block a dot’s two rail neighbours and its rung partner.'],
    parent: {notice: 'Whether your child splits the ladder with a rung first and then has one block left, which can’t trap anything.', prompt: 'Which three dots do one dot’s roads lead to?', explanation: 'A ladder dot has three roads: two along its rail and one across its rung. Blocking those three traps it. The three blocks also split the ladder: the rung partner and each rail neighbour make a slanting pair, and no road crosses between their columns. So the ladder falls into a left tail, the trapped dot and a right tail. Three blocks can do it no other way.', extension: 'Can three blocks trap two dots? (No: one trapped dot already takes all three blocks; two trapped pieces need four, as in a zigzag.)', connection: 'Trapping (a bounded component) and splitting (two unbounded ones) are different counts; this placement makes both.'},
    provenance: 'New, after Week 68 Problems 3 and 4.'},
  {number: 8, level: 'medium', title: 'Where three ladders meet', map: 'tee', budget: 3, goal: {forever: 3}, visible: 'Make 3 forever pieces.', prereq: 'tee',
    check: {possible: true, bySize: [0, 0, 0, 12]},
    idea: 'Three ladders meeting give three ends; cutting all three apart takes three blocks, at the junction.',
    hints: ['Where do the three ladders meet?', 'The stem joins the ladder across at two dots. Block them both.', 'Block the two dots where the stem joins, then one more on the top rail beside them.'],
    parent: {notice: 'Whether your child cuts one ladder off with two blocks far from the junction and is left with one block for the rest.', prompt: 'Which blocks do two jobs at once?', explanation: 'The T has three tails: left, right and down. Cutting the stem off needs two blocks across it, and cutting left from right needs both rails broken. The stem joins the bottom rail at two dots; blocking those two cuts the stem off and breaks the bottom rail at once, and one block on the top rail nearby finishes the split. Two blocks can’t do it, and all twelve three-block answers are at the junction.', extension: 'Can any blocks make four forever pieces on the T? (No: outside a box round the junction and the blocks there are only three tails.)', connection: 'The T has three ends, one for each ladder: built from ladders joined in a finite place, its ends are theirs put together.'},
    provenance: 'New, a combination board (three ladders joined) for the review card’s App fit.'},
  {number: 9, level: 'hard', title: 'A wall that steps', map: 'strip', budget: 4, goal: {forever: 2, trapped: 1}, visible: 'Make 2 forever pieces and trap 1.', prereq: 'strip',
    check: {possible: true, bySize: [0, 0, 0, 0, 35]},
    idea: 'To split a strip of three rows, every row needs a block and the wall may step one column at a time; a trapped dot on the edge can be part of the wall.',
    hints: ['Must a wall go straight down?', 'A dot on the top or bottom row has only three roads. Trap one of those.', 'Trap a dot on the top row with three blocks, then block a bottom-row dot below or beside the middle-row block.'],
    parent: {notice: 'Whether your child builds a straight wall of three first and then can’t trap anything with the last block.', prompt: 'Must a wall go straight down?', explanation: 'Three routes run along the strip, one per row, sharing no dot, so a split needs a block in every row; three blocks split it exactly when neighbouring rows’ blocks are at most one column apart. A dot on an edge row has three roads, so three blocks trap it, and two of them (one beside it, one below it) already make two rows of a stepped wall. The fourth block finishes the wall in the far row. Fewer than four can’t do both, and 35 placements of four do it in a seven-column window.', extension: 'How many blocks does a strip of five rows need to split it? (Five.)', connection: 'As on the ladder, the fewest blocks to separate the two ends is the most routes between them sharing no dot: three, one per row.'},
    provenance: 'New, after Week 68 Problems 3 and 5, on a strip of three rows.'},
  {number: 10, level: 'hard', title: 'Two ways off the grid?', map: 'grid', budget: 10, goal: {forever: 2}, visible: 'Make 2 forever pieces.', prereq: 'cant',
    check: {possible: false, ends: 1}, trial: ['0,0', '1,0', '-1,0'],
    idea: 'The grid has one end: outside a box round every block, a ring road joins everything.',
    hints: ['Build a long wall and Check. Do the pieces join round its ends?', 'All the blocks fit inside a box. Can you walk all the way round the outside of the box?', 'Outside the box a ring road joins every dot, so there is only one forever piece. Press Can’t.'],
    parent: {notice: 'Whether your child drags along a long wall to look for a way round its end, and whether a big trapped pocket looks like a second forever piece.', prompt: 'Could a wall of blocks go on forever?', explanation: 'Draw a box round all the blocks. The road just outside the box goes all the way round and has no block on it, and every dot outside the box reaches that ring road by walking straight toward the box. So everything outside the box is one piece. Every forever piece goes on past the box, so there is exactly one, however many blocks; the pieces inside the box are trapped. Pressing Can’t draws the box and the ring road.', extension: 'What about a grid with only the top half (a half-plane)? (Still one.)', connection: 'The square grid has one end. The same box argument shows every grid of two or more dimensions has one end.'},
    provenance: 'Week 68 Problem 6 (can finitely many blocked dots split the endless grid into two forever pieces?), with the guide’s box argument as the certificate.'},
  {number: 11, level: 'hard', title: 'Two pockets on the grid', map: 'grid', budget: 6, goal: {trapped: 2}, visible: 'Trap 2 pieces.', prereq: 'grid',
    check: {possible: true, bySize: [0, 0, 0, 0, 0, 0, 8]},
    idea: 'Two trapped dots can share blocks: side by side they share one, corner to corner two.',
    hints: ['Trapping one dot takes four blocks. Can two trapped dots share some?', 'Two dots with one dot between them share one neighbour. Two dots that touch at a corner share two.', 'Trap two dots that touch at a corner: their six neighbours are enough.'],
    parent: {notice: 'Whether your child traps two dots in a row with one dot between them and finds they need seven blocks.', prompt: 'Which blocks could do two jobs?', explanation: 'A trapped dot needs its four neighbours blocked. Two dots with one dot between them share that neighbour, so they need 4 + 4 − 1 = 7. Two dots that touch at a corner share two neighbours, so six blocks trap both. A trapped piece of two or more dots needs six blocks by itself, so five blocks never trap two pieces; the validator checks every placement of up to six blocks in a 5 × 5 window.', extension: 'Trap three pieces with as few blocks as you can. (Eight will do it: three dots in a diagonal row.)', connection: 'Boundaries of bounded components on the grid: shared boundary is what makes the count small.'},
    provenance: 'New, after Week 68 Problem 5 (left grid).'},
  {number: 12, level: 'hard', title: 'Nine ways out', map: 'tree', budget: 4, goal: {forever: 9}, visible: 'Make 9 forever pieces.', prereq: 'tree',
    check: {possible: true},
    idea: 'Four blocks make nine forever pieces only when no two touch and nothing is trapped, not even a pair of dots.',
    hints: ['Seven took three blocks. What must a fourth avoid?', 'Keep every block two or more roads from the others, and don’t close all the roads round a dot or round two joined dots.', 'Block the centre and one dot two roads out on each of its three branches.'],
    parent: {notice: 'Whether your child traps a pair of dots: four blocks, two round each end of one road.', prompt: 'Which pieces did the last block not split?', explanation: 'As in Seven ways out, m blocks make at most 2m + 1 pieces, so nine needs four blocks with no two touching and nothing trapped. Four blocks can trap a dot (three round it) or a pair of joined dots (two round each). The centre and one dot two roads out on each branch works. Blocking the centre and its three neighbours makes only six.', extension: 'Make 13 forever pieces with six blocks. (Dots three roads out can be tapped once they are dragged toward the middle.)', connection: 'Infinitely many ends: the counts 3, 5, 7, 9, … grow without bound.'},
    provenance: 'New, from the Week 68 review card’s fix 12, after Problem 7’s tree.'}
];

const id = n => `ends-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  const m = MAPS[item.map], q = {mode: 'goal', map: m, budget: item.budget, goal: item.goal};
  let solution;
  if (!item.check.possible) {
    assert.ok(impossible(q), `${id(item.number)}: the mechanic says no blocks can reach it`);
    assert.equal(endsOf(m), item.check.ends, `${id(item.number)}: ends`);
    // The try the hints lead to before Can't: within the budget, short of the goal.
    assert.ok(item.trial.length && item.trial.length <= item.budget && !meets(item.goal, counts(m, item.trial)), `${id(item.number)}: the trial`);
    q.patterns = [];
    q.trial = item.trial;
    solution = {possible: false, ends: item.check.ends};
  } else if (m.kind === 'tree') {
    assert.equal(item.goal.forever, 2 * item.budget + 1, `${id(item.number)}: the tree's goal is 2m + 1, which the hints rely on`);
    assert.ok(!impossible(q));
    // The centre, then one dot two roads out on each branch in turn.
    const witness = ['o', 'ab', 'ba', 'ca'].slice(0, item.budget);
    assert.deepEqual(counts(m, witness), {forever: item.goal.forever, trapped: 0}, `${id(item.number)}: the witness`);
    q.patterns = [];
    solution = {possible: true, witness};
  } else {
    assert.ok(!impossible(q));
    const {patterns, bySize} = solutionsOf(m, WINDOW[item.map], item.budget, item.goal);
    assert.deepEqual(bySize, item.check.bySize, `${id(item.number)}: solutions in the window by number of blocks`);
    assert.ok(patterns.length, `${id(item.number)}: a solution`);
    patterns.sort((a, b) => a.length - b.length || a.join(' ').localeCompare(b.join(' ')));
    for (const w of patterns) assert.ok(meets(item.goal, counts(m, w)), `${id(item.number)}: pattern ${w.join(' ')}`);
    q.patterns = patterns;
    solution = {possible: true, witness: patterns[0], shapes: patterns.length, inWindow: bySize};
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Ways out', mechanic: 'ends', band: 'all', revision: 1, sourceDocument: 'docs/ends/README.md',
    parameters: q,
    objective: objective(item.goal, item.budget), visibleObjective: item.visible, instruction: objective(item.goal, item.budget),
    controls: CONTROLS, rules: RULES,
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

// The tree's bound, checked here by the mechanic's own pieces for up to three
// blocks within two roads of the centre (the validator goes further).
const ball = ['o'];
for (let k = 0; k < ball.length && ball.length < 10; k++) for (const n of treeNeighbours(ball[k])) if (!ball.includes(n)) ball.push(n);
for (let k = 1; k <= 3; k++) {
  let best = 0;
  for (const set of subsets(ball.slice(0, 10), k)) best = Math.max(best, treePieces(set).pieces.filter(p => p.forever).length);
  assert.equal(best, 2 * k + 1, `tree: ${k} blocks make at most ${2 * k + 1}`);
}

const playground = {
  id: 'ends-playground', number: 0, title: 'Ways out playground', difficulty_level: 'playground', familyTitle: 'Ways out', mechanic: 'ends', band: 'playground', revision: 1, sourceDocument: 'docs/ends/README.md',
  parameters: {mode: 'playground', maps: Object.fromEntries(['line', 'ladder', 'strip', 'grid', 'tee', 'tree'].map(k => [k, MAPS[k]]))},
  objective: 'Block dots on any map and check the pieces.', visibleObjective: '',
  instruction: 'Block dots on any map and check the pieces.',
  controls: 'Choose a map. Drag it to look around, tap dots to block them and press Check to see the pieces. The round button goes back to the start.',
  rules: RULES.slice(0, 4),
  idea: 'Free play on the line, the ladder, a strip, the grid, the T and the tree: how many forever pieces can blocks make on each?',
  prerequisites: 'None. A grown-up or a partner can set a goal.',
  hints: ['Try for as many forever pieces as you can on each map.', 'On the line and the ladder the most is two; on the grid, one.', 'On the tree, spread the blocks out.'],
  parent: {notice: 'Whether your child finds the most forever pieces on each map, and says why more is impossible.', prompt: 'Which map lets you make the most forever pieces?', explanation: 'The line, the ladder and the strip never have more than two forever pieces, the T three, the grid one, and the tree as many as you like (2m + 1 with m blocks). These are the maps’ numbers of ends. Check only shows the pieces when asked, so the guessing is yours.', extension: 'With a partner: one sets a number of forever pieces, the other makes it or says why it can’t be done.', connection: 'The number of ends of a graph: the most unbounded components that removing a finite set can leave.', sourceIds: sources},
  provenance: 'Week 68 Problems 1, 5 and 7: blocking on each map in turn, with the card’s closing question, which map gives the most forever pieces.'
};
const json = {
  title: 'Ways out',
  version: 1,
  families: [{id: 'ends', title: 'Ways out', mathematics: 'A map of dots and roads goes on forever. Blocking a dot takes it and its roads away, and the open dots fall into pieces; a forever piece goes on forever and a trapped piece stops. The most forever pieces finitely many blocks can make is the number of ends of the map. The line, the ladder and every strip have two: all the blocks lie in a box of columns, and past it there are only two tails. The square grid has one: outside a box round every block a ring road joins everything. Three ladders joined in a T have three. The tree where every dot has three roads has infinitely many: a block splits its piece into at most three, so m blocks make at most 2m + 1, exactly when no two touch and nothing is trapped. Forever is decided by how the map continues, never by the edge of the screen. Separately, the fewest blocks that split two ends equals the most routes between them sharing no dot (two on the ladder, three on a strip of three rows).', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'ends-week68', title: 'Bellingham Math Circle — Week 68: How many ways out (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-68', kind: 'local curriculum'},
    {id: 'ends-card68', title: 'Week 68 review card and math check (lines, ladders, the grid and the tree; fixes 1 and 12; App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-68.md', kind: 'local curriculum'},
    {id: 'ends-ggt', title: 'Cornelia Druţu and Michael Kapovich — Geometric Group Theory, American Mathematical Society (2018), §9.1, Definition 9.3 and Exercise 9.4 (ends of graphs), printed pages 287–289', url: 'https://www.math.ucdavis.edu/~kapovich/EPR/ggt.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/ends/ends.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.map.name}: ${JSON.stringify(p.parameters.goal)} with ${p.parameters.budget} — ${p.solution.possible ? `e.g. ${p.solution.witness.join(' ')}${p.solution.shapes ? ` (${p.solution.shapes} shapes)` : ''}` : `can’t (${p.solution.ends} ${p.solution.ends === 1 ? 'end' : 'ends'})`}`).join('\n'));
