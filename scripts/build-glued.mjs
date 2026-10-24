// Authoring list for Glued squares (worksheet Week 64). Builds each puzzle's
// squares, computes its answers with the mechanic's own searches (the
// gluings that work, the longest trips, the corner points), checks them
// against the table in docs/glued/README.md, and writes
// dist/families/glued/glued.json. Run: node scripts/build-glued.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {solutionsOf, longestOf, gluedSurface, goalTrips, fixedSurface, cornerCycles, playStart, tripOf} from '../dist/families/glued/glued.js';
import {cornerClasses} from '../dist/portal-board.js';

const nulls = list => Object.fromEntries(list.map(s => [s, null]));
// Glue puzzles draw their squares apart, so no side looks glued until it is:
// A at the bottom left, B to its right, C above A, D above B.
const APART = {A: [0, 0], B: [2, 0], C: [0, 2], D: [2, 2]};
const apart = n => Object.fromEntries(Object.entries(APART).slice(0, n));
// The dot: half across and a quarter up for trips right, up, and one right
// and one up; a quarter across and half up for two right and one up (the
// worksheet's Problems 7 and 8). No trip from these dots meets a corner.
const SPOT = {low: [[1, 2], [1, 4]], left: [[1, 4], [1, 2]]};
const glue = (n, sides, trips, spot) => {
  const list = Object.keys(apart(n));
  return {mode: 'glue', squares: apart(n), sides, start: {right: nulls(list), up: nulls(list)}, spot: SPOT[spot], trips: trips.map(([from, dir, blocks]) => ({from, dir, blocks}))};
};
// The surfaces with fixed gluings: the worksheet's L, two squares in a ring,
// four squares with two tops crossed, and one square. The four are drawn as
// three in a row with D on B's top (glued there), not four in a row: on a
// phone a row of four leaves each square about 70 px and its corners 33 px.
export const SURFACES = {
  L: {name: 'L of three squares', squares: {A: [0, 0], B: [1, 0], C: [0, 1]}, right: {A: 'B', B: 'A', C: 'C'}, up: {A: 'C', B: 'B', C: 'A'}},
  ring: {name: 'Two squares in a ring', squares: {A: [0, 0], B: [1, 0]}, right: {A: 'B', B: 'A'}, up: {A: 'A', B: 'B'}},
  twist: {name: 'Four squares, two tops crossed', squares: {A: [0, 0], B: [1, 0], C: [2, 0], D: [1, 1]}, right: {A: 'B', B: 'C', C: 'D', D: 'A'}, up: {A: 'A', B: 'D', C: 'C', D: 'B'}},
  one: {name: 'One square', squares: {A: [0, 0]}, right: {A: 'A'}, up: {A: 'A'}}
};
const corners = name => ({mode: 'corners', squares: SURFACES[name].squares, right: SURFACES[name].right, up: SURFACES[name].up});

const RULES = {
  glue: [
    'Each square’s right side can be glued to the left side of one square, maybe its own, and each top to the bottom of one square. A square slides into place; nothing turns.',
    'A trip goes straight from its dot the way its arrow points. At a glued side it comes in through the side glued there, at the same place along it, and keeps going. At a side glued to nothing it stops.',
    'A block is one arrow’s length. After each block the trip is on the same spot of some square, where that square’s dot is. The trip is home when it lands on its own dot. The beads count the blocks.',
    'Beside the squares, each trip is drawn unrolled: one straight line across copies of the squares it passes through.'
  ],
  right: 'Only right sides and left sides glue here.',
  cant: 'If no gluing can do it, make the first trip land on every dot and come home, then press Can’t and tap the dots in the order it lands on them.',
  corners: [
    'Two corners meet when a glued side runs between them. Across a right side, a square’s two right corners meet the two left corners of the square glued there; across a top, its two top corners meet that square’s bottom corners. Matching marks show which sides are glued.',
    'Corners that meet, and the corners that meet those, are all one point of the surface.',
    'Join corners that meet into groups. Press That’s all when no two corners in different groups meet.'
  ]
};
const CONTROLS = {
  glue: sides => `Tap a side, then the side to glue it to: a right side with a left side${sides.includes('up') ? ', a top with a bottom' : ''}. Gluing a side again takes it from its old partner. Tab and Enter work too. Undo takes back a gluing.`,
  cant: ' Can’t shows the dots: tap them in the order the trip lands on them to claim. Tap a ringed dot to take it back.',
  corners: 'Tap a corner, then a corner that meets it, to join their groups. The second corner stays chosen, so you can keep going round a point. Tab and Enter work too. Undo takes back a join.',
  playground: 'Choose a surface and an arrow, then tap a small square to start from. The trip is drawn in the squares and unrolled beside them.'
};
const PREREQ = {
  glue: 'Follow a line through a glued side and count blocks up to three or four. A grown-up can read How to play.',
  two: 'Watch two or three trips at once and change one gluing at a time.',
  cant: 'Glue sides to make long trips, as in puzzle 4, and count dots and blocks up to five.',
  corners: 'Match a corner across a glued side by its marks, and decide when nothing more meets.'
};
const sources = ['glued-week64', 'glued-card64', 'glued-wright', 'glued-flatsurf', 'glued-forni'];

// The table in docs/glued/README.md. `check` holds the answer: how many full
// gluings work (of all full gluings of the sides that may be glued), or 0
// and the longest first return for Can't; the corner points' sizes.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Rightward', q: glue(3, ['right'], [['A', [1, 0], 3]], 'low'), check: {works: 2, of: 6}, kind: 'glue',
    objective: 'Glue right sides to left sides so that the trip from A comes home after exactly 3 blocks.', visible: 'Get the trip home in exactly 3 blocks.',
    idea: 'A trip to the right goes from square to square by the right gluing, so it is home after three blocks only if it lands on both other dots first.',
    hints: ['Glue A’s right side to the left side of another square, and watch the trip.', 'Before it comes home, the trip has to land on both other dots.', 'Glue A’s right side to B’s left side, B’s right side to C’s and C’s right side to A’s.'],
    witness: {right: {A: 'B', B: 'C', C: 'A'}},
    parent: {notice: 'Whether your child glues the side where the trip stops and then the next one, and what they make of gluing A’s right side to its own left side (home after one block).', prompt: 'Which dot does the trip land on after one block? Which gluing decided that?', explanation: 'Going right, a block is one square’s width. The trip leaves through a right side and comes in through the left side glued to it at the same height, so it lands on the dot of that square: the trip follows the right gluing from square to square. To be home after exactly three blocks it must land on the two other dots first, in some order, and then on A’s: A→B→C→A or A→C→B→A. Those are the only two gluings of the three right sides that work.', extension: 'Glue so that the trip is home after 2 blocks. Where does a trip from the square left over go? (Home after one block, once its right side is glued to its own left side.)', connection: 'A gluing of the right sides is a permutation of the squares, and the trip right from a square follows that square’s cycle: its first return is the length of the cycle through A.'},
    provenance: 'Week 64 grades 4–5 Problem 6 (closed trips to the right on the three-square L), turned round: the child chooses the gluing and the app draws the trip.'},
  {number: 2, level: 'easy', title: 'Two trips right', q: glue(3, ['right'], [['A', [1, 0], 1], ['B', [1, 0], 2]], 'low'), check: {works: 1, of: 6}, kind: 'two',
    objective: 'Glue right sides to left sides so that the trip from A comes home after exactly 1 block and the trip from B after exactly 2.', visible: 'Get A’s trip home in 1 block and B’s in 2.',
    idea: 'A trip home after one block comes straight back into its own square, so the other two squares have to trade.',
    hints: ['Where must A’s right side lead for its trip to land on A’s own dot after one block?', 'B’s trip has to land on C’s dot and come back.', 'Glue A’s right side to its own left side, B’s right side to C’s left side and C’s right side to B’s.'],
    witness: {right: {A: 'A', B: 'C', C: 'B'}},
    parent: {notice: 'Whether gluing a square to itself feels allowed, and whether your child sees that B and C must trade places.', prompt: 'Could B’s trip pass through A on its way?', explanation: 'A’s trip is home after one block only if A’s right side is glued to A’s own left side. Then no other right side can lead into A, so B’s trip can land only on C’s dot or its own. To take exactly two blocks it goes to C and back, so B’s and C’s right sides are glued to each other’s left sides. This is the only gluing that works.', extension: 'Can A’s trip be home after 1 block and B’s after 3? (No: B’s trip can never land on A’s dot, so it has only two dots to land on.)', connection: 'The gluing is the permutation (A)(B C): a fixed point and a 2-cycle. Starts in different cycles have different return times.'},
    provenance: 'Week 64 grades 4–5 Problem 8 (one start’s trip is shortest and the others twice as long), first with straight trips to the right.'},
  {number: 3, level: 'easy', title: 'Two squares’ corners', q: corners('ring'), check: {points: [4, 4]}, kind: 'corners',
    objective: 'Join the corners that meet into groups, then press That’s all.', visible: 'Join corners that meet, then press That’s all.',
    idea: 'Two squares glued in a ring have two points, each with four corners round it: one full turn, a flat point like a crossing on graph paper.',
    hints: ['Tap A’s lower-right corner, then the corner of B it touches.', 'A’s top is glued to its own bottom, so A’s upper-left corner meets A’s lower-left corner.', 'The corners along A’s left side meet the corners along B’s right side; the corners along the side between A and B meet each other.'],
    parent: {notice: 'Whether your child follows the marks to the far sides, and stops when no corner in one group meets a corner in another.', prompt: 'Why can’t the two groups be joined?', explanation: 'Across the side between A and B, A’s right corners meet B’s left corners. Across the seam from B’s right side to A’s left side, B’s right corners meet A’s left corners. Across each top, a square’s top corners meet its own bottom corners. Following these matches gives two groups of four: A’s left corners with B’s right corners, and A’s right corners with B’s left corners. No glued side runs between the groups, so That’s all is right with two. Each point has four corners round it, one full turn, so it is flat: the surface is a torus made of two squares.', extension: 'How many points does one square glued to itself both ways have? (One, with all four corners round it.)', connection: 'Each group is a vertex of the surface. With V vertices, n squares and 2n sides, the Euler characteristic is V − 2n + n = V − n; here 2 − 2 = 0, a torus.'},
    provenance: 'Week 64 grades 3–5 Problem 4 (match the corners of a glued shape into groups, with the square as the contrast), on two squares glued in a ring.'},
  {number: 4, level: 'medium', title: 'Up and over', q: glue(3, ['right', 'up'], [['A', [1, 1], 3]], 'low'), check: {works: 12, of: 36}, kind: 'glue',
    objective: 'Glue sides so that the trip from A, one right and one up each block, comes home after exactly 3 blocks.', visible: 'Get the trip home in exactly 3 blocks.',
    idea: 'Each block crosses a right side and then a top, so it moves the trip by the right gluing and then the up gluing; the trip still has to land on every dot before it is home.',
    hints: ['Glue the side where the trip stops, and watch where it goes next.', 'Each block crosses a right side and then a top. Which square should the first block end in?', 'The worksheet’s L does it: A’s and B’s right sides glued to each other’s left sides, A’s and C’s tops to each other’s bottoms, B’s top and C’s right side to themselves.'],
    witness: SURFACES.L,
    parent: {notice: 'Whether your child glues one side at a time where the trip stops, and uses the unrolled trip to see which square it is in.', prompt: 'After one block, which dot is the trip on? Which two gluings decided that?', explanation: 'From the dot (half across, a quarter up) a trip one right and one up crosses the right side halfway through a block and the top three quarters through, then lands on the dot of the square it is in. So a block moves the trip by the right gluing and then the up gluing. To be home after three blocks it must land on the two other dots first. On the worksheet’s L the trip goes A→B→C→A. Of the 36 full gluings, 12 work.', extension: 'Glue so that the trip is home after 2 blocks, then after 1.', connection: 'On a surface made of squares, one block of a whole-number direction permutes the squares: here the block map is the up gluing after the right gluing, and the first return is the length of A’s cycle.'},
    provenance: 'Week 64 grades 4–5 Problem 7 (first closed trips one right and one up on the L: A→B→C→A), turned round: the child glues the squares and the app draws the trip.'},
  {number: 5, level: 'medium', title: 'Two right, one up', q: glue(3, ['right', 'up'], [['A', [2, 1], 1], ['B', [2, 1], 2]], 'left'), check: {works: 6, of: 36}, kind: 'two',
    objective: 'Glue sides so that the trips two right and one up each block come home after exactly 1 block from A and exactly 2 blocks from B.', visible: 'Get A’s trip home in 1 block and B’s in 2.',
    idea: 'A block two right and one up crosses a right side, a top and a right side again; one start can come straight home while two others trade.',
    hints: ['Watch A’s trip: which three sides does it cross in one block?', 'For A’s trip to be home after one block, those three crossings must bring it back into A.', 'The worksheet’s L does it: A’s and B’s right sides glued to each other’s left sides, A’s and C’s tops to each other’s bottoms, B’s top and C’s right side to themselves.'],
    witness: SURFACES.L,
    parent: {notice: 'Whether your child counts three crossings in a block, and gets A’s trip home before working on B’s.', prompt: 'A’s trip crosses into B and comes back to A in the same block. Which sides did it cross?', explanation: 'From the dot (a quarter across, half up) a trip two right and one up crosses a right side three eighths of the way through a block, a top halfway and another right side seven eighths of the way. So a block moves the trip right, up, right. On the L, A’s trip goes A→B→B→A and is home after one block; B’s goes B→A→C→C and C’s goes C→C→A→B, so B and C trade and their trips take two blocks, exactly twice as long. Of the 36 full gluings, 6 work.', extension: 'Glue so that A’s trip two right and one up takes 3 blocks instead. (Possible: with every right side glued to its own left side, a block just follows the tops.)', connection: 'The block map is right, then up, then right: a word in the two gluing permutations. Its cycles are the families of trips with one return time.'},
    provenance: 'Week 64 grades 4–5 Problem 8 (two right and one up on the L: A alone is shortest, B and C twice as long), turned round.'},
  {number: 6, level: 'medium', title: 'Corners of the L', q: corners('L'), check: {points: [12]}, kind: 'corners',
    objective: 'Join the corners that meet into groups, then press That’s all.', visible: 'Join corners that meet, then press That’s all.',
    idea: 'All twelve corners of the L meet at one point, with three full turns of corners round it.',
    hints: ['Start at A’s lower-right corner and keep going round its point.', 'B’s right side is glued to A’s left side, so B’s lower-right corner meets A’s lower-left corner.', 'All twelve corners are one group.'],
    parent: {notice: 'Whether your child expects the corners to make several groups, as on puzzle 3, and keeps going when one group passes four corners.', prompt: 'How many corners are round this point? How many full turns is that?', explanation: 'Going round a point counterclockwise crosses one glued side per corner. Starting from A’s lower-left corner the chain goes to B’s lower-right, B’s upper-right, A’s upper-left, C’s lower-left, C’s lower-right, A’s upper-right, B’s upper-left, B’s lower-left, A’s lower-right, C’s upper-right, C’s upper-left and back to A’s lower-left: all twelve corners before it closes, so all twelve are one point. Twelve quarter turns are three full turns (1080°): the point is a cone point, where a flat sheet can’t lie. With one point and three squares, V − n = 1 − 3 = −2 = 2 − 2g, so the L is a surface of genus two.', extension: 'Cut twelve paper quarter circles and lay them round a point in the order of the chain. How many times round do they go?', connection: 'The L is the smallest square-tiled surface of genus two, with one cone point of angle 6π, as in the guide’s sources (surface-dynamics; Forni–Matheus, Figure 4).'},
    provenance: 'Week 64 grades 3–5 Problems 4–5 (the glued octagon’s corners make one group of three full turns), on the grades 4–5 L of Problems 6–9; the guide’s overview gives the L’s twelve corners as one 1080° point.'},
  {number: 7, level: 'medium', title: 'Four blocks', q: {...glue(3, ['right', 'up'], [['A', [1, 1], 4]], 'low'), cant: true}, check: {works: 0, of: 36, longest: 3, longestWays: 12}, kind: 'cant',
    objective: 'Glue sides so that the trip from A, one right and one up each block, comes home after exactly 4 blocks.', visible: 'Get the trip home in exactly 4 blocks.',
    idea: 'Until it is home a trip lands on a different dot each block, and there are only three dots, so on three squares every trip that comes home does so within three blocks.',
    hints: ['How many blocks can you make the trip take?', 'Each block ends on a dot. Can the trip land on the same dot twice before it is home?', 'Three dots, each landed on at most once: the trip is home by the third block. Make a three-block trip, then press Can’t and tap the dots in the order it lands on them.'],
    parent: {notice: 'Whether your child builds a three-block trip first (as in puzzle 4) and then tries to stretch it, and whether they say why it won’t stretch.', prompt: 'Could the trip land on B’s dot twice before it gets home?', explanation: 'Each block ends on a dot, and only one square’s block leads into each square, because each side is glued to one side. So if the trip landed on some dot twice before coming home, the blocks before those two landings would have started on one dot too, an earlier repeat, and so on back to the start: the dot would be A’s, and the trip would already be home. So before it is home the trip lands on each of the other two dots at most once, and it is home after at most three blocks. Exactly four is impossible. The certificate is your child’s own three-block trip: tapping its landings in order fills three beads with the three dots, and the fourth bead has no dot left.', extension: 'On four squares, what is the longest first return? (Four blocks: puzzle 8.)', connection: 'Week 64 Problem 9: a whole-number direction that misses the corners permutes the n squares, so every trip closes within n blocks. The cycle through A has length at most n.'},
    provenance: 'Week 64 grades 4–5 Problem 9 (must every whole-number direction close or reach a corner? the permutation bound, three blocks on three squares), as a goal that can’t be met.'},
  {number: 8, level: 'hard', title: 'Long arrow', q: glue(4, ['right', 'up'], [['A', [2, 1], 4]], 'left'), check: {works: 144, of: 576}, kind: 'glue',
    objective: 'Glue sides so that the trip from A, two right and one up each block, comes home after exactly 4 blocks.', visible: 'Get the trip home in exactly 4 blocks.',
    idea: 'With three sides crossed each block, the gluing has to send the trip through all four squares before it comes home: the longest first return there is on four squares.',
    hints: ['Follow A’s trip one block at a time: which three sides does it cross?', 'The trip has to land on the dots of B, C and D, in some order, before it comes home.', 'Glue the side where the trip stops so that it reaches a square it has not landed in yet.'],
    parent: {notice: 'Whether your child plans a whole block (three crossings) at a time, and whether a gluing made for an early block spoils a later one.', prompt: 'Which sides has the trip crossed twice? Did both crossings want the same gluing?', explanation: 'A block two right and one up crosses a right side, a top and a right side again, so the trip’s square changes by right, up, right each block. It is home after exactly four blocks when these moves carry A through the other three squares and back. The trip crosses the same right side more than once, and every crossing must agree, which is what makes the planning hard. 144 of the 576 full gluings work.', extension: 'Can it be done with every top glued to its own bottom? (No: then a block crosses two right sides, so it moves two steps round a cycle of the right gluing, and two steps at a time never visit four squares in one loop.)', connection: 'The block map r∘u∘r is a 4-cycle; by Problem 9’s bound four blocks is the longest first return on four squares.'},
    provenance: 'New: Week 64 grades 4–5 Problem 8’s direction (two right and one up) on four squares, aiming for the longest first return that Problem 9’s bound allows.'},
  {number: 9, level: 'hard', title: 'Three arrows from A', q: glue(3, ['right', 'up'], [['A', [1, 0], 2], ['A', [0, 1], 2], ['A', [1, 1], 3]], 'low'), check: {works: 2, of: 36}, kind: 'two',
    objective: 'Glue sides so that from A the trip right comes home after exactly 2 blocks, the trip up after exactly 2, and the trip one right and one up after exactly 3.', visible: 'Get A’s trips home in 2, 2 and 3 blocks.',
    idea: 'The trips right and up each pair A with another square; the slanted trip, right then up, lands on all three dots only when those two partners are different: the three-square L.',
    hints: ['Get the trip right home in 2 blocks first. Which square does it land in?', 'If the trips right and up go through the same square, where does the slanted trip go?', 'Pair A with B across the right sides and with C across the tops; B’s top and C’s right side go to themselves.'],
    witness: SURFACES.L,
    parent: {notice: 'Whether your child satisfies two trips and then sees the third one fail, and what they change.', prompt: 'The trips right and up both pass through B. Where does the slanted trip land after one block?', explanation: 'Home in 2 going right means A’s right side leads to some square X whose right side leads back to A; home in 2 going up means A’s top leads to some Y whose top leads back to A. A block one right and one up moves by the right gluing and then the up gluing. If X = Y, a block takes A across into X and up straight back into A: home after one block. If X and Y are different, it takes A to X, X to Y (through A’s top), and Y back to A (Y’s right side goes to Y itself, its top to A): home after three blocks. So the answer is the L, with B and C either way round: 2 of the 36 full gluings.', extension: 'Keep the trips right and up home in 2. Can the slanted trip be home in 2? (No: 1 or 3 only.)', connection: 'Three trips from one dot pin down the gluing: the L is the square-tiled surface with permutations (A B) and (A C), as in the surface-dynamics example the guide cites.'},
    provenance: 'Week 64 grades 4–5 Problems 6 and 7 (trips right, up, and one right and one up on the L), combined so that the three trips force the L.'},
  {number: 10, level: 'hard', title: 'Four squares’ corners', q: corners('twist'), check: {points: [8, 8]}, kind: 'corners',
    objective: 'Join the corners that meet into groups, then press That’s all.', visible: 'Join corners that meet, then press That’s all.',
    idea: 'Four squares can make two points with two full turns of corners each: not one point, as on the L, and neither of them flat.',
    hints: ['Start with a corner of B and follow the mark under it.', 'B’s bottom is glued to D’s top, so B’s lower-left corner meets D’s upper-left corner.', 'The corners make two groups of eight.'],
    parent: {notice: 'Whether your child stops at four corners, as on puzzle 3, or at one group, as on the L, before checking that nothing else meets.', prompt: 'How many full turns of corners are round each point?', explanation: 'Following the matches round a point, eight corners go by before the chain closes, and the other eight make a second chain. Each point has eight corners round it: two full turns (720°), so neither point is flat. With two points and four squares, V − n = 2 − 4 = −2 = 2 − 2g: genus two again, like the L, but with two cone points instead of one.', extension: 'Glue each square’s top to its own bottom instead, keeping the right sides. How many points now? (Four, each flat: a torus.)', connection: 'Square-tiled surfaces of genus two have either one cone point of angle 6π or two of angle 4π (the strata H(2) and H(1,1)).'},
    provenance: 'New: a four-square surface in the style of Week 64 Problems 4–5, whose corners make two points of two full turns each, in contrast with the L’s single point of three.'},
  {number: 11, level: 'hard', title: 'Five blocks', q: {...glue(4, ['right', 'up'], [['A', [1, 1], 5]], 'low'), cant: true}, check: {works: 0, of: 576, longest: 4, longestWays: 144}, kind: 'cant',
    objective: 'Glue sides so that the trip from A, one right and one up each block, comes home after exactly 5 blocks.', visible: 'Get the trip home in exactly 5 blocks.',
    idea: 'On four squares a trip lands on each of the other three dots at most once before it is home, so it is home within four blocks.',
    hints: ['How many blocks can you make the trip take on four squares?', 'Each block ends on a dot, and the trip can’t land on a dot twice before it is home.', 'Four dots: the trip is home by the fourth block. Make a four-block trip, then press Can’t and tap the dots in the order it lands on them.'],
    parent: {notice: 'Whether your child builds a four-block trip and recognises puzzle 7’s reason, or tries many gluings.', prompt: 'How many dots are there? How many beads?', explanation: 'As in puzzle 7: each block ends on a dot, only one square’s block leads into each square, so the trip never lands on a dot twice before it is home. With four dots it is home after at most four blocks, so exactly five is impossible. 144 of the 576 full gluings give the longest trip, four blocks.', extension: 'What is the longest first return on n squares? (n blocks, when the block map is one n-cycle.)', connection: 'Week 64 Problem 9’s bound: a permutation of n things has cycles of length at most n.'},
    provenance: 'Week 64 grades 4–5 Problem 9 (the bound: no first return takes more than n blocks on n squares), on four squares.'}
];

// Check every answer with the mechanic's own searches.
const id = n => `glued-${String(n).padStart(2, '0')}`;
const factorial = n => n <= 1 ? 1 : n * factorial(n - 1);
const fullCount = q => factorial(Object.keys(q.squares).length) ** q.sides.length;
const out = PUZZLES.map(item => {
  const q = item.q;
  let solution, rules, controls;
  if (q.mode === 'glue') {
    const sols = solutionsOf(q);
    assert.equal(sols.length, item.check.works, `${id(item.number)}: gluings that work`);
    assert.equal(fullCount(q), item.check.of, `${id(item.number)}: full gluings`);
    rules = [...RULES.glue, ...(q.sides.includes('up') ? [] : [RULES.right]), RULES.cant];
    controls = CONTROLS.glue(q.sides) + CONTROLS.cant;
    if (item.check.works) {
      const wit = item.witness || sols[0], w = {right: wit.right, up: wit.up || q.start.up};
      const trips = goalTrips(q, w);
      trips.forEach((t, k) => assert.equal(t.home, q.trips[k].blocks, `${id(item.number)}: witness trip ${k}`));
      assert.ok(!q.cant, `${id(item.number)}: possible puzzles don't say cant`);
      solution = {gluing: w, works: sols.length, of: item.check.of, homes: trips.map(t => t.home), squares: trips.map(t => t.blocks.map(b => b.s))};
    } else {
      const long = longestOf(q), n = Object.keys(q.squares).length;
      assert.equal(n, item.check.longest, `${id(item.number)}: the bound is the number of squares`);
      assert.ok(q.trips[0].blocks > n, `${id(item.number)}: the goal is past the bound`);
      assert.equal(long.length, item.check.longestWays, `${id(item.number)}: longest trips`);
      const w = {right: long[0].right, up: long[0].up}, t = goalTrips(q, w)[0];
      assert.equal(t.home, n);
      solution = {cant: true, certificate: 'trip', dots: n, beads: q.trips[0].blocks, longest: {gluing: w, home: n, ways: long.length, landings: t.blocks.map(b => b.s)}};
    }
  } else {
    const S = fixedSurface(q), sizes = cornerClasses(S).map(c => c.corners.length).sort((a, b) => a - b);
    assert.deepEqual(sizes, item.check.points, `${id(item.number)}: corner points`);
    const cycles = cornerCycles(S);
    assert.deepEqual(cycles.map(c => c.length).sort((a, b) => a - b), sizes, `${id(item.number)}: chains go round each point`);
    rules = [...RULES.corners]; controls = CONTROLS.corners;
    solution = {points: cycles.length, corners: cycles, turns: cycles.map(c => c.length / 4), links: cycles.reduce((m, c) => m + c.length - 1, 0)};
  }
  const {cant, ...parameters} = q;
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Glued squares', mechanic: 'glued', band: 'all', revision: 1, sourceDocument: 'docs/glued/README.md',
    parameters, objective: item.objective, visibleObjective: item.visible, instruction: item.objective, controls, rules,
    idea: item.idea, prerequisites: PREREQ[item.kind], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.ok(out.length >= 8 && out.length <= 12);
for (const level of ['easy', 'medium', 'hard']) assert.ok(out.some(p => p.difficulty_level === level), level);

const DIRS = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [3, 1], [3, 2], [2, 3]];
const playground = {
  id: 'glued-playground', number: 0, title: 'Glued squares playground', difficulty_level: 'playground', familyTitle: 'Glued squares', mechanic: 'glued', band: 'playground', revision: 1, sourceDocument: 'docs/glued/README.md',
  parameters: {mode: 'playground', surfaces: Object.fromEntries(['L', 'ring', 'twist', 'one'].map(k => [k, SURFACES[k]])), dirs: DIRS, n: 4, start: {s: 'A', i: 1, j: 0}},
  objective: 'Start straight trips from any small square of four glued surfaces, in eight directions, and watch where they come home or reach a corner.', visibleObjective: '',
  instruction: 'Start straight trips from any small square of four glued surfaces, in eight directions, and watch where they come home or reach a corner.',
  controls: CONTROLS.playground,
  rules: [RULES.glue[1], 'A block is one arrow’s length in squares: after each block the trip is at the same spot of some square. A trip that reaches a corner of a square stops there.', 'The surfaces are the worksheet’s L, two squares in a ring, four squares with two tops crossed, and one square glued to itself.'],
  idea: 'Straight trips in whole-number directions on four surfaces made of squares: each one comes home within as many blocks as there are squares, unless it runs into a corner.',
  prerequisites: 'None. A grown-up or a partner can suggest a start and an arrow.',
  hints: ['Pick the L and the arrow straight right. Try starts in different rows.', 'On the L, try two right and one up from different squares.', 'Find a start and an arrow whose trip runs into a corner.'],
  parent: {notice: 'Whether your child compares trips from different starts in one direction (some come home sooner), and finds starts that run into a corner.', prompt: 'On the L, do the trips right from the bottom row and from the top row take the same number of blocks? (Bottom row two, top row one.)', explanation: 'A trip in a whole-number direction lands on the same spot of some square after every block, and the block permutes the squares, so it comes home within as many blocks as there are squares: three on the L, two on the ring, four on the crossed row, one on the single square. It can stop sooner at a corner of a square, as one of Week 64 Problem 9’s trips does; the app stops a trip at every corner, as the worksheet does.', extension: 'On the L, find the direction and start whose trip is longest. (Three blocks, as in puzzle 4.)', connection: 'These are square-tiled translation surfaces. On them every straight trip in a rational direction is periodic unless it meets a corner, by Problem 9’s permutation argument.', sourceIds: sources},
  provenance: 'Week 64 grades 3–5 Problems 1–2 (straight trips from many starts, compared by length) and grades 4–5 Problem 9 (directions that close or reach a corner), on surfaces made of squares.'
};
const PQ = {parameters: playground.parameters};
assert.ok(playStart(PQ.parameters, {start: PQ.parameters.start}));

const json = {
  title: 'Glued squares',
  version: 1,
  families: [{id: 'glued', title: 'Glued squares', mathematics: 'A few unit squares whose right sides are glued to left sides and tops to bottoms by sliding (never turning) make a flat surface. A straight trip in a whole-number direction keeps its heading through every glued side, and after one block (as many squares right and up as its arrow) it is at the same spot of some square. So a block moves the trip from square to square by a permutation, the right and up gluings composed in the order the block crosses sides, and a trip that misses the corners comes home after at most n blocks on n squares: the length of its cycle (Week 64, Problem 9). Corners meet across glued sides; following the matches round a point groups the corners, and a point with 4k corners has k full turns round it. Two squares in a ring have two flat points (a torus); the three-square L has one point of three full turns and genus two; four squares can have two points of two turns each.', rules: RULES.glue, sourceIds: sources}],
  sources: [
    {id: 'glued-week64', title: 'Bellingham Math Circle — Week 64: Straight paths on strange surfaces (student packet, grades 3–5 and 4–5, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-64', kind: 'local curriculum'},
    {id: 'glued-card64', title: 'Week 64 review card (App fit: glue the squares to target return times; group corners with a checked That’s all; Problem 9’s bound)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-64.md', kind: 'local curriculum'},
    {id: 'glued-wright', title: 'Alex Wright — From Rational Billiards to Dynamics on Moduli Spaces, pp. 3–6 (translation surfaces, gluing by translation, cone points), as the Week 64 guide cites (S1)', url: 'https://public.websites.umich.edu/~alexmw/BilliardsToModuli.pdf', kind: 'research'},
    {id: 'glued-flatsurf', title: 'surface-dynamics documentation — Square-tiled surfaces (the three-square L with permutations (1, 2) and (1, 3), genus two, one cone point), as the Week 64 guide cites (S2)', url: 'https://flatsurf.github.io/surface-dynamics/examples/square_tiled_surfaces.html', kind: 'research'},
    {id: 'glued-forni', title: 'Giovanni Forni and Carlos Matheus — Introduction to Teichmüller theory and its applications to dynamics of interval exchange transformations, flows on surfaces and billiards, pp. 17–18, Figure 4 (the L), as the Week 64 guide cites (S3)', url: 'https://www.math.uchicago.edu/~masur/gm.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/glued/glued.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode.padEnd(8)} ${JSON.stringify(p.solution).slice(0, 120)}`).join('\n'));
