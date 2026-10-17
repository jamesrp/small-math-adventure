// Authoring list for the Staircases group in Memory robot (worksheet Week 50,
// staircases and lengths). Computes every puzzle's answer with the
// mechanic's own searches (fewest turns, every set of windows, a staircase
// by hints, the number of exact-length paths and two of them), checks them
// against the table in docs/stairs/README.md, and writes
// dist/families/stairs/stairs.json.
// Run: node scripts/build-stairs.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {stairMechanics, fewest, need, windowSets, ways, trace, turnsOf, spans} from '../dist/families/stairs/stairs.js';

const M = stairMechanics.stairs;
const SOURCES = ['stairs-week50', 'stairs-card50'];
const turnsRules = q => [
  'The robot starts at the ring and walks to the flag, only right and up, along the streets.',
  'It must stay in the gray strip. It may run along the strip’s edge.',
  'A turn is a corner where the walk changes from right to up or from up to right. A flat piece is a straight run to the right.',
  'Fewest: tap columns until the slots beside it are full. The claim is right when no flat piece inside the strip could cross two of the columns you tapped.'
];
const exactRules = q => [
  'The robot starts at the ring and walks to the flag along the streets: right, left or up, one block per step.',
  ...(q.D === undefined ? [] : ['It must stay in the gray strip. It may run along the strip’s edge.']),
  'It never turns straight back along the street it just walked, so a path never meets itself.',
  'It must reach the flag on the last box. The first path that does is kept; a second, different one solves the puzzle.'
];
const CONTROLS = {
  turns: 'A staircase goes only right and up along the streets. A turn is a corner where it changes direction, and a flat piece is a straight run to the right. Tap a dot to send the robot straight there, or drag from the robot; tap a corner of the trail, or drag back over it, to go back there. The arrow keys move one block. On the flag, press Fewest and tap columns, one for each slot: columns no flat piece inside the strip can cross two of. Undo takes back a move.',
  exact: 'Each step is one block right, left or up, and a path never turns straight back along the street it just walked. Each box under the board is one step. Tap a dot to send the robot straight there, or drag from the robot; tap a corner of the trail, or drag back over it, to go back there. The arrow keys move one block. A path that reaches the flag on the last box is kept as a dashed line, and the robot starts again for a second, different path. Undo takes back a move.'
};

// check (turns): the fewest turns, how many sets of windows prove it, and
// the spans of the rows. check (exact): the left steps L with
// steps = a + b + 2L, and how many paths there are.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'First strip', parameters: {mode: 'turns', a: 6, b: 3, D: 9},
    check: {fewest: 2, sets: 1, spans: [[0, 3], [0, 5], [1, 6], [3, 6]]},
    idea: 'The strip holds only the first 3 blocks of the bottom street and the last 3 of the top street, so no flat piece crosses both the first and the last column. Two flat pieces need a climb between them: 2 turns are the fewest.',
    prerequisites: 'Counting blocks to 6, and seeing whether a corner is inside the gray strip. Reading: one short goal; a grown-up can read How to play.',
    hints: ['How far along the bottom street can the robot go before it leaves the strip?', 'Make each straight piece as long as the strip allows.', 'Can one flat piece cross both the first column and the last?'],
    parent: {
      notice: 'Whether your child makes each straight piece as long as the strip allows, and then asks which columns could never share a flat piece.',
      prompt: 'Why can’t the robot do it with just one turn?',
      explanation: 'One turn would mean right along the bottom and up the right side, or up the left side and right along the top; both leave the strip. Every staircase crosses every column once, going right, on one of its flat pieces. On the bottom street the strip holds 0 to 3 across, on the top street 3 to 6, and no street holds both column 1 and column 6. So two flat pieces, with a climb between them: 2 turns. Right 3, up 3, right 3 is the only staircase with 2.',
      extension: 'How many turns can a staircase in this strip have at most?',
      connection: 'The fewest straight pieces of a path inside a region is its link distance, a question of computational geometry. Here the region is the streets of a strip, and columns that no one flat piece can join give a lower bound that a staircase meets.'
    },
    provenance: 'New, after Week 50 Problem 4 (all bands: the fewest turns for a staircase inside the gray strip), on a 6 × 3 rectangle with a strip 1½ blocks above and below the diagonal.'},
  {number: 2, level: 'easy', title: 'Wide strip', parameters: {mode: 'turns', a: 9, b: 6, D: 15},
    check: {fewest: 4, sets: 1, spans: [[0, 2], [0, 4], [1, 5], [2, 7], [4, 8], [5, 9], [7, 9]]},
    idea: 'In the middle the strip holds a flat piece 5 blocks long, at the bottom and top only 2. Columns 1, 5 and 9 are the only three no flat piece can join, so 3 flat pieces and 4 turns are needed.',
    prerequisites: 'Counting blocks, and seeing whether a corner is inside the gray strip. Reading: one short goal; a grown-up can read How to play.',
    hints: ['Which is the longest flat piece the strip holds?', 'Turn only where the strip makes you.', 'A flat piece on the bottom or top street is short. Which columns can’t share one?'],
    parent: {
      notice: 'Whether your child notices that the strip holds a longer flat piece in the middle than at the ends.',
      prompt: 'Could a staircase manage with 2 turns here?',
      explanation: 'Two turns means two flat pieces, or one flat piece between two climbs. A flat piece that crosses column 1 runs on one of the bottom two streets, which the strip ends by 4 across; one that crosses column 9 runs on one of the top two, which start at 5 across or later. So no flat piece crosses two of columns 1, 5 and 9: three flat pieces need at least 4 turns, and right 2, up 3, right 5, up 3, right 2 has 4. Columns 1, 5 and 9 are the only three that prove it.',
      extension: 'How many blocks can the middle flat piece be, in a staircase with 4 turns?',
      connection: 'The strip here is 5/3 of a block above and below the diagonal of a 9 × 6 rectangle; on the bottom and top streets it holds 2 blocks against 5 in the middle, as the worksheet guide’s 20 mm end pieces against 40 mm middle pieces.'
    },
    provenance: 'New, after Week 50 Problem 4: a 9 × 6 rectangle (slope 2/3) with a strip 5/3 of a block above and below the diagonal.'},
  {number: 3, level: 'medium', title: 'Shallow strip', parameters: {mode: 'turns', a: 12, b: 3, D: 9},
    check: {fewest: 6, sets: 4, spans: [[0, 3], [1, 7], [5, 11], [9, 12]]},
    idea: 'A shallow strip: 12 blocks across, 3 up. A flat piece covers at most 6 blocks in the middle streets and 3 at the ends, so four columns far enough apart need four flat pieces and 6 turns.',
    prerequisites: 'Counting blocks to 12. Reading: one short goal; a grown-up can read How to play.',
    hints: ['Count the blocks across, and how many one flat piece can cover.', 'Each climb is only one block. Make the flat pieces long.', 'The first and last columns need their own flat pieces. How many more?'],
    parent: {
      notice: 'Whether your child counts how far a flat piece can reach on each street, and uses that to choose columns.',
      prompt: 'Why does the staircase need four flat pieces, not three?',
      explanation: 'The streets hold flat pieces from 0 to 3, 1 to 7, 5 to 11 and 9 to 12 across. Columns 1, 4 or 5, 8 or 9, and 12 lie on no common flat piece, so four flat pieces and at least 6 turns are needed. Right 3, up 1, right 4, up 1, right 4, up 1, right 1 has 6.',
      extension: 'With the same strip on a rectangle 16 blocks across and 4 up, how many turns would the fewest be?',
      connection: 'Every column must be crossed by one flat piece, and a flat piece crosses a set of consecutive columns that one street of the strip holds; choosing columns no such set contains two of is the dual of covering the columns by those sets.'
    },
    provenance: 'New, after Week 50 Problem 4: a 12 × 3 rectangle (slope 1/4) with a strip 3/4 of a block above and below the diagonal.'},
  {number: 4, level: 'medium', title: 'Steeper strip', parameters: {mode: 'turns', a: 12, b: 9, D: 18},
    check: {fewest: 6, sets: 13, spans: [[0, 2], [0, 3], [1, 4], [2, 6], [4, 7], [5, 8], [6, 10], [8, 11], [9, 12], [10, 12]]},
    idea: 'The worksheet’s strip, 1½ blocks above and below the diagonal, on a smaller rectangle. A flat piece covers at most 4 blocks, and 2 at the bottom and top, so 12 blocks need four flat pieces and 6 turns.',
    prerequisites: 'Counting blocks to 12, and judging whether a corner on the strip’s edge is in (it is). Reading: one short goal; a grown-up can read How to play.',
    hints: ['A flat piece on the bottom street is short. How long can one in the middle be?', 'The staircase may run along the strip’s edge.', 'Look for columns 4 blocks apart, and closer at the ends.'],
    parent: {
      notice: 'Whether your child uses corners on the strip’s edge, and whether the columns they choose get closer together near the two ends.',
      prompt: 'Can one flat piece reach from column 1 to column 4?',
      explanation: 'A flat piece in the strip covers at most 4 blocks, and one on the bottom or top street at most 2. So no flat piece crosses two of columns 1, 4, 7 and 11, for example, and four flat pieces make at least 6 turns. Right 2, up 3, right 4, up 3, right 4, up 3, right 2 has 6, every corner on the strip’s edge. Thirteen different sets of four columns prove it.',
      extension: 'Make the rectangle 16 blocks across and 12 up with the same strip (puzzle 5): how many turns now?',
      connection: 'The worksheet guide’s argument: a horizontal piece spans at most 40 mm, one beginning at S or ending at F at most 20 mm; here at 10 mm a block on a 120 × 90 mm rectangle.'
    },
    provenance: 'Week 50 Problem 4’s strip (15 mm above and below the diagonal, at 10 mm a block) on a new 120 × 90 mm rectangle instead of 160 × 120.'},
  {number: 5, level: 'hard', title: 'Full size', parameters: {mode: 'turns', a: 16, b: 12, D: 24},
    check: {fewest: 8, sets: 40, spans: [[0, 2], [0, 3], [1, 4], [2, 6], [4, 7], [5, 8], [6, 10], [8, 11], [9, 12], [10, 14], [12, 15], [13, 16], [14, 16]]},
    idea: 'The worksheet’s own puzzle. Each flat piece covers at most 4 blocks, 2 at the ends; 16 blocks need five flat pieces, so 8 turns. With 7 turns there are at most four flat pieces, one of them at an end, covering at most 2 + 4 + 4 + 4 = 14 blocks.',
    prerequisites: 'Counting to 16 and planning five flat pieces. Reading: one short goal; a grown-up can read How to play.',
    hints: ['How long can one flat piece be, and how long at the very start?', 'Every corner can sit on the strip’s edge.', 'Five columns: the first, the last, and three spread between them.'],
    parent: {
      notice: 'Whether your child plans the staircase from how long a flat piece can be, rather than turning when the trail first looks close to the edge.',
      prompt: 'Why can’t a staircase with 7 turns cover 16 blocks across?',
      explanation: 'With 7 turns there are at most 8 pieces, so at most four flat pieces, and if four, one of them starts at S or ends at F. They cover at most 2 + 4 + 4 + 4 = 14 blocks, short of 16. The windows say the same thing column by column: no flat piece crosses two of columns 1, 4, 7, 11 and 15, for example. Right 2, up 3, right 4, up 3, right 4, up 3, right 4, up 3, right 2 has 8 turns, the guide’s staircase.',
      extension: 'Narrow the strip in your head until the corners on its edge fall out. Can a staircase still get through, and with how many turns?',
      connection: 'This is the worksheet’s Problem 4 at 10 mm a block: 160 × 120 mm, the ±15 mm strip, the fewest 8. The guide notes that the answer depends on the edge counting as inside; without it the fewest is 9.'
    },
    provenance: 'Week 50 Problem 4, all bands: the 160 × 120 mm rectangle and the strip 15 mm above and below the diagonal, at 10 mm a block; the guide’s eight-turn staircase and seven-turn proof.'},
  {number: 6, level: 'easy', title: 'Nine steps', parameters: {mode: 'exact', a: 4, b: 3, steps: 9},
    check: {left: 1, ways: 28},
    idea: 'A staircase to the flag takes 7 steps. Every step left needs one more step right to make up for it, so 9 steps means exactly one step left, anywhere it fits.',
    prerequisites: 'Counting to 9. No reading needed beyond the goal; a grown-up can read How to play.',
    hints: ['A staircase uses 7 boxes. How can the robot use 2 more?', 'A step left has to be made up with a step right.', 'Go left once on a street above the bottom one.'],
    parent: {
      notice: 'Whether your child sees that one step left costs two boxes, a left and the right that makes up for it.',
      prompt: 'Could a path with a step left ever use fewer boxes than a staircase?',
      explanation: 'A path that ends 4 across has made 4 more steps right than left, and 3 steps up, so it has 7 + 2 × (steps left) steps. Nine steps means one step left; the 28 paths of 9 steps put it in different places.',
      extension: 'Can the robot reach the flag in exactly 10 steps?',
      connection: 'Length = a + b + 2L, the worksheet guide’s 280 + 2L mm, counted in blocks.'
    },
    provenance: 'Week 50 K–1 Problem 5 (two different paths with the same amount of string, more than a staircase), on a new 4 × 3 rectangle with 9 steps.'},
  {number: 7, level: 'medium', title: 'Eighteen steps', parameters: {mode: 'exact', a: 8, b: 6, steps: 18},
    check: {left: 2, ways: 16016},
    idea: 'At 20 mm a block, the worksheet’s 360 mm paths: 18 steps, 4 more than a staircase, so exactly 2 steps left. Very different paths have the same length when they go left the same total.',
    prerequisites: 'Counting to 18. Reading: one short goal; a grown-up can read How to play.',
    hints: ['How many more boxes than a staircase are there?', 'Two steps left, made up by two more steps right.', 'Try the two steps left together on one street, then apart on two streets.'],
    parent: {
      notice: 'Whether your child predicts how many steps left are needed before drawing the second path.',
      prompt: 'How many steps left does every 18-step path take?',
      explanation: 'Every path to the flag makes 8 more steps right than left, and 6 up: 14 + 2 × (steps left). So 18 steps means exactly 2 steps left. The guide’s Route A, right 4, up 2, left 2, up 2, right 6, up 2, is one; there are 16,016 in all.',
      extension: 'Make a path of 18 steps that goes left on two different streets.',
      connection: 'The worksheet guide: rightward travel is 160 + L, so the length is 280 + 2L mm; here 14 + 2L blocks.'
    },
    provenance: 'Week 50 Grades 2–3 Problem 5 and K–1 Problem 5: two very different 360 mm paths on the 160 × 120 mm rectangle, at 20 mm a block (18 steps); the guide’s Route A is one.'},
  {number: 8, level: 'hard', title: 'Twenty-seven steps', parameters: {mode: 'exact', a: 5, b: 4, steps: 27},
    check: {left: 9, ways: 4},
    idea: 'The longest path snakes along every street, right, left, right, left, right: 29 steps. Twenty-seven means moving one of the four climbs one block in, which shortens the run on each side of it. There are four ways.',
    prerequisites: 'Counting to 27 and planning a long path. Reading: one short goal; a grown-up can read How to play.',
    hints: ['How long is the longest path you can make?', 'Two boxes fewer than the longest: a step left and a step right fewer.', 'Stop one block short on one of the long runs.'],
    parent: {
      notice: 'Whether your child finds the longest snake first and then works out what to take away.',
      prompt: 'Why can’t a path here use 28 boxes?',
      explanation: 'Each street is one run, because a path never turns back along a street. The longest path runs the full 5 blocks on all five streets: 25 + 4 = 29 steps, with 10 steps left. Every path has 9 + 2 × (steps left) steps, so 27 needs 9 steps left: one of the four climbs moves one block in from the edge, and the runs on both sides of it are one block shorter. That makes the four paths. An even number of boxes, like 28, is impossible.',
      extension: 'How many different paths use exactly 25 boxes?',
      connection: 'Steps = 9 + 2L, so the length of every path is odd here; the parity of a + b decides which lengths are possible.'
    },
    provenance: 'New, after Week 50 Grades 2–3 Problem 5: a 5 × 4 rectangle and 27 steps, two short of the longest path.'},
  {number: 9, level: 'hard', title: 'Left in the strip', parameters: {mode: 'exact', a: 9, b: 6, D: 15, steps: 23},
    check: {left: 4, ways: 9},
    idea: 'Puzzle 2’s strip, with steps left allowed. Twenty-three steps is the longest a path can be in it: 4 steps left, and the strip only has room for them where a street holds more than the climbs need.',
    prerequisites: 'Counting to 23 and planning where the strip has room to go back. Reading: one short goal; a grown-up can read How to play.',
    hints: ['Where does the strip leave room to go back left?', 'Each step left costs two boxes: 23 is 15 + 8, so 4 steps left.', 'Go back 2 blocks on one street, and 2 more higher up.'],
    parent: {
      notice: 'Whether your child looks for streets where the strip leaves room to go back, before drawing.',
      prompt: 'Why is 23 the most steps a path can take in this strip?',
      explanation: 'Every path has 15 + 2 × (steps left) steps. A path enters each street where it climbed on and leaves where it climbs off, and both corners must be in the strip on two streets, so the strip leaves little room to go back: the most any path can go left is 4 blocks, 2 on the third street from the bottom (from 4 across to 2) and 2 on the fifth (from 7 to 5). All nine 23-step paths do exactly that and differ only in where they climb off the bottom street and onto the top one.',
      extension: 'Make a path of exactly 21 steps in the same strip.',
      connection: 'Length = a + b + 2L still holds in the strip; the strip limits L, as the worksheet’s rectangle limits it on paper.'
    },
    provenance: 'New: puzzle 2’s strip with steps left allowed, at its longest (23 steps); joins Week 50 Problems 4 and 5.'}
];

const objective = q => q.mode === 'turns'
  ? 'Draw a staircase from the ring to the flag inside the gray strip with the fewest turns, then press Fewest and tap columns no flat piece can cross two of.'
  : `Walk from the ring to the flag in exactly ${q.steps} steps, using every box, in two different ways.`;
const visible = q => q.mode === 'turns' ? 'Reach the flag with the fewest turns.' : 'Two ways to the flag on the last box.';
const choose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; };

// Plays hints from a fresh board to a solve; returns the board.
function byHints(p) {
  let b = M.fresh(p), steps = 0;
  while (!M.solved(p, b) && steps++ < 200) {
    const h = M.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: hints keep going`);
    b = M.move(p, b, h.action);
    assert.ok(b, `${p.id}: the hint is a legal move`);
  }
  assert.ok(M.solved(p, b), `${p.id}: hints solve it`);
  return b;
}

const puzzles = PUZZLES.map(item => {
  const q = item.parameters, id = `stairs-${String(item.number).padStart(2, '0')}`;
  const p = {id, parameters: q};
  let solution;
  if (q.mode === 'turns') {
    const t = fewest(q), k = need(t), sets = windowSets(q, k);
    assert.equal(t, item.check.fewest, `${id}: fewest turns`);
    assert.equal(sets.length, item.check.sets, `${id}: sets of windows`);
    assert.deepEqual(spans(q), item.check.spans, `${id}: spans`);
    assert.equal(windowSets(q, k + 1).length, 0, `${id}: no more windows than flat pieces`);
    const b = byHints(p);
    assert.equal(turnsOf(b.walk), t);
    solution = {fewest: t, flatPieces: k, staircase: b.walk, windows: b.windows, windowSets: sets.length, ofColumnSets: choose(q.a, k)};
  } else {
    const L = (q.steps - q.a - q.b) / 2;
    assert.equal(L, item.check.left, `${id}: steps left`);
    assert.equal(ways(q), item.check.ways, `${id}: paths of ${q.steps} steps`);
    const b = byHints(p);
    assert.notEqual(b.kept, b.walk);
    for (const w of [b.kept, b.walk]) assert.equal(trace(q, w).length, q.steps + 1);
    solution = {steps: q.steps, left: L, paths: ways(q), walks: [b.kept, b.walk]};
  }
  return {
    id, number: item.number, title: item.title, mechanic: 'stairs', band: 'all', difficulty_level: item.level, revision: 1,
    libraryFamily: 'robot', group: 'Staircases', familyTitle: 'Memory robot', sourceDocument: 'docs/stairs/README.md',
    parameters: q, objective: objective(q), visibleObjective: visible(q), instruction: objective(q), controls: CONTROLS[q.mode],
    rules: q.mode === 'turns' ? turnsRules(q) : exactRules(q),
    idea: item.idea, prerequisites: item.prerequisites, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    solution, provenance: item.provenance
  };
});

const pack = {
  title: 'Memory robot: Staircases',
  version: 1,
  sources: [
    {id: 'stairs-week50', title: 'Bellingham Math Circle — Week 50: Staircases and lengths (K–1, grades 2–3 and grades 4–5 packets, and the adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-50', kind: 'local curriculum'},
    {id: 'stairs-card50', title: 'Bellingham Math Circle — Week 50 review card, with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-50.md', kind: 'local curriculum'}
  ],
  puzzles
};
await writeFile(new URL('../dist/families/stairs/stairs.json', import.meta.url), JSON.stringify(pack, null, 2) + '\n');
console.log(JSON.stringify(puzzles.map(p => ({id: p.id, level: p.difficulty_level, solution: p.solution})), null, 1));
