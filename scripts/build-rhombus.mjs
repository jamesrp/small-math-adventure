// Builds dist/families/rhombus/rhombus.json, the Rhombus gardens pack, from
// the authoring list below. Every fact a puzzle relies on (the most rhombi,
// the dots that prove it, how many fillings, the fewest flips) is computed
// here from dist/families/rhombus/lozenge.js and checked here against the
// authored claims; scripts/validate-rhombus.mjs checks them again by
// separate methods. Design notes and worksheet sources: docs/rhombus/README.md.
import {writeFile} from 'node:fs/promises';
import {gridOf, cellsInside, placements, cellKey} from '../dist/tri-grid.js';
import {covers, maxPacking, minCover, openSpot, flipRoute, flipPoints, flipAt, cornerTiling, stackTiling, tilingKey, sortPiece} from '../dist/families/rhombus/lozenge.js';
import {hexagon} from '../dist/families/rhombus/rhombus.js';

const WEEK1 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-01';
export const sources = [
  {id: 'rhombus-week01', title: 'Bellingham Math Circle — Week 1: Tiling lab (pattern blocks), packets, facilitator guide and extensions', url: WEEK1, kind: 'local curriculum'},
  {id: 'rhombus-review', title: 'Bellingham Math Circle — Week 1 review card (keep), with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-01.md', kind: 'local curriculum'},
  {id: 'rhombus-thurston', title: 'William P. Thurston — Conway’s tiling groups, American Mathematical Monthly 97 (1990), 757–773', url: 'https://doi.org/10.1080/00029890.1990.11995660', kind: 'research'},
  {id: 'rhombus-saldanha-tomei', title: 'Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1995)', url: 'https://arxiv.org/abs/math/9801111', kind: 'research'},
  {id: 'rhombus-david-tomei', title: 'Guy David and Carlos Tomei — The problem of the calissons, American Mathematical Monthly 96 (1989), 429–431', url: 'https://doi.org/10.1080/00029890.1989.11972212', kind: 'research'},
  {id: 'rhombus-lovasz-plummer', title: 'László Lovász and Michael D. Plummer — Matching Theory, §1.1 (König’s minimax theorem), AMS Chelsea (2009)', url: 'https://bookstore.ams.org/chel-367', kind: 'book'},
  {id: 'rhombus-stanley', title: 'Richard P. Stanley — Enumerative Combinatorics, Volume 2, §7.20 (MacMahon’s formula for plane partitions in a box), Cambridge (1999)', url: 'https://math.mit.edu/~rstan/ec/', kind: 'book'}
];
export const family = {
  id: 'rhombus',
  title: 'Rhombus gardens',
  mathematics: 'Boards are cut from the grid of triangles that pattern blocks fit. Two triangles that share a side always point opposite ways, so a rhombus covers one up and one down triangle and a set of rhombi is a matching between them. The most rhombi equals the fewest dots that every place a rhombus could go must cover (König’s theorem), so a packing and a set of dots of the same size prove each other best. Shaded by direction, a rhombus filling of a hexagon is a pile of cubes in a box; a flip turns the three rhombi round a point and adds or takes away one cube, so flips connect every filling and the fewest flips between two is the number of cubes in one pile and not the other (Thurston). The fillings of the hexagon with sides a, b, c are the piles in an a × b × c box, counted by MacMahon’s formula.',
  rules: [
    'A rhombus covers two triangles that share a side.',
    'Pieces stay inside the board and never overlap.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const DRAG = 'Drag across two triangles that share a side to lay a rhombus, or tap them one after the other. Tap a rhombus to lift it.';
const FLIP = 'Tap a white dot to flip the three rhombi round it.';
const CONTROLS = {
  fill: DRAG,
  chevron: 'Drag across four triangles in the shape of a chevron, or tap them one at a time. Tap a chevron to lift it. Chevrons can face any way.',
  pack: `Rhombi: ${DRAG} Dots: tap a triangle to put a dot on it, and tap it again to take the dot off. While you place dots, a dashed rhombus shows a place that covers no dot.`,
  every: `${DRAG} Each way you fill the board joins the row below. Clear lifts every rhombus. Press That’s all when you have every way.`,
  everyFlip: `${FLIP} ${DRAG} Each way you fill the board joins the row below. Press That’s all when you have every way.`,
  flip: `${FLIP} Start again goes back to the first picture.`
};
const MODE_RULES = {
  fill: ['Solved when every triangle is covered.'],
  chevron: ['A chevron covers four triangles in a bent row, like the purple pattern block. It can face any way.', 'Solved when every triangle is covered.'],
  pack: ['A dot marks a triangle. Dots are checked on their own: they don’t stop you laying a rhombus.', 'Solved when the board is full, or when there are as many dots as rhombi and every place a rhombus could go covers a dot.'],
  every: ['Two ways are different when any rhombus lies in a different place. The board never turns.', 'Solved when you press That’s all with every way found.'],
  everyFlip: ['A flip turns three rhombi that make a small hexagon round a point into the hexagon’s other filling.', 'Two ways are different when any rhombus lies in a different place. The board never turns.', 'Solved when you press That’s all with every way found.'],
  flip: ['A flip turns three rhombi that make a small hexagon round a point into the hexagon’s other filling.', 'Solved when your tiling matches ⚑ within the flips allowed.']
};
const OBJECTIVE = {
  fill: 'Fill the board with rhombi.',
  chevron: 'Fill the board with chevrons.',
  pack: 'Fill the board with rhombi. If it can’t be filled, fit as many as you can and prove it: put down as many dots as rhombi, so that every place a rhombus could go covers a dot.',
  every: 'Find every way to fill the board with rhombi, then press That’s all.'
};
const VISIBLE = {fill: '', chevron: '', pack: 'Fill it, or match rhombi and dots so no rhombus fits without a dot.', every: 'Find every way to fill it.'};

// Boards.
const tri = n => [[0, 0], [n, 0], [0, n]];
const upTriangle = (n, du = 0, dv = 0) => cellsInside(tri(n)).map(([u, v, o]) => [u + du, v + dv, o]);
const downTriangle = (n, du = 0, dv = 0) => cellsInside([[0, 0], [n, -n], [n, 0]]).map(([u, v, o]) => [u + du, v + dv, o]);
const union = (...lists) => [...new Map(lists.flat().map(c => [c.join(','), c])).values()];
const B = {
  longHexagon: {outline: hexagon(2, 1, 1)},
  mountain: {outline: tri(3)},
  star: {outline: [[1, 0], [1, 1], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-1, -1], [0, -1], [1, -2], [1, -1], [2, -1]]},
  sailboat: {outline: [[0, 0], [3, 0], [3, 1], [2, 1], [0, 3], [0, 1], [-1, 1]]},
  bowTie: {cells: union(upTriangle(2), [[-1, 1, 1], [0, 1, 1]])},
  hex122: {outline: hexagon(1, 2, 2), turn: true},
  hex222: {outline: hexagon(2, 2, 2), turn: true},
  hex222flat: {outline: hexagon(2, 2, 2)},
  hourglass: {cells: union(upTriangle(3), downTriangle(3, -1, 0))},
  hex333: {outline: hexagon(3, 3, 3), turn: true}
};
const stack = (spec, size, heights) => stackTiling(gridOf(spec), size, size, size, heights);
const room = (spec, size) => cornerTiling(gridOf(spec), size, size, size);

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Long hexagon',
    parameters: {mode: 'fill', board: B.longHexagon},
    idea: 'A rhombus always covers one triangle pointing up and one pointing down.',
    prerequisites: 'None. No reading needed once a grown-up has shown the move.',
    hints: ['Start at one of the pointed ends.', 'Each rhombus covers one triangle pointing up and one pointing down.', 'Fill one end, then the other.'],
    parent: {
      notice: 'Every rhombus covers one triangle pointing up and one pointing down.',
      prompt: 'How many triangles point up? How many point down?',
      explanation: 'Two triangles that share a side always point opposite ways, so each rhombus covers one of each. The long hexagon has five of each and five rhombi fill it, in three different ways.',
      extension: 'Find a different way to fill it. Puzzle 3 asks for all of them.',
      connection: 'A rhombus filling is a perfect matching between the up and the down triangles: the bipartite graph behind every puzzle in this family.'
    },
    provenance: 'Week 1 K–1 Problem 4 (fill the long hexagon with small blue rhombi).',
    sourceIds: ['rhombus-week01'],
    expect: {fillings: 3}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'The mountain',
    parameters: {mode: 'pack', board: B.mountain},
    idea: 'Every rhombus needs a triangle pointing down, and the mountain has only three.',
    prerequisites: 'Count to six. Tell a triangle pointing up from one pointing down.',
    hints: ['Fit as many rhombi as you can.', 'Each rhombus covers one triangle pointing down. How many point down?', 'Put a dot on every triangle that points down.'],
    parent: {
      notice: 'However the rhombi go, three triangles stay empty.',
      prompt: 'Why can’t a fourth rhombus fit?',
      explanation: 'Every rhombus covers exactly one triangle pointing down, and the mountain has three, so at most three rhombi fit and three of the six up triangles stay empty. Dots on the three down triangles are that argument in a form the app can check: every place a rhombus could go covers a dot, and no two rhombi share one.',
      extension: 'On paper, a triangle with four edges on each side has ten up and six down triangles. How many stay empty? (Four; with five on a side, five.)',
      connection: 'The simplest case of König’s theorem: when one kind of triangle is scarce, dots on all of that kind prove the most.'
    },
    provenance: 'Week 1 grades 2–3 Problem 1, Board A, and Problem 2 (triangles with 2 to 5 edges on a side leave that many triangles empty); the K–1 mountain outline.',
    sourceIds: ['rhombus-week01', 'rhombus-lovasz-plummer'],
    expect: {best: 3, cover: 'downs'}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Three ways',
    parameters: {mode: 'every', board: B.longHexagon},
    idea: 'Sorting the ways by one choice shows when the list is complete.',
    prerequisites: 'None. Remembering which ways are already in the row helps.',
    hints: ['Fill it, then press Clear and fill it a different way.', 'Look at the two triangles at the left point. Do they share a rhombus?', 'If they share one there is one way; if not, there are two.'],
    parent: {
      notice: 'There are exactly three ways.',
      prompt: 'How do you know there isn’t a fourth?',
      explanation: 'The two triangles at the left point either share a rhombus or they don’t. If they do, the rest of the board can be filled only one way; if they don’t, each joins its other neighbour and the rest can be filled two ways. One plus two is three.',
      extension: 'Shade each rhombus by which way it leans. Do the three ways look like 0, 1 and 2 cubes?',
      connection: 'The long hexagon is the hexagon with sides 2, 1, 1; its fillings are piles of cubes in a 2 × 1 × 1 box, so there are three (MacMahon’s formula).'
    },
    provenance: 'Week 1 review card, fix 1: “Fill the long hexagon using only small blue rhombi. Find every way.” (there are 3).',
    sourceIds: ['rhombus-review', 'rhombus-week01', 'rhombus-stanley'],
    expect: {fillings: 3, leftSplit: [1, 2]}
  },
  {
    number: 4, difficulty_level: 'easy', title: 'The star',
    parameters: {mode: 'fill', board: B.star},
    idea: 'A triangle with only one neighbour has only one way to be covered.',
    prerequisites: 'None.',
    hints: ['Look at the six points of the star.', 'Each point touches only one other triangle.', 'Cover every point with the triangle it touches.'],
    parent: {
      notice: 'Half of the first moves lead to a dead end; there is only one way to fill the star.',
      prompt: 'Which triangle can the tip of a point share a rhombus with?',
      explanation: 'Each of the six points touches only one other triangle, so its rhombus is forced, and the six forced rhombi fill the star exactly. A rhombus that joins two triangles of the middle hexagon leaves some point with no partner.',
      extension: 'With purple chevrons the star can be filled two ways. Can you find them with real pattern blocks?',
      connection: 'Forced moves: a vertex of degree one must be matched to its only neighbour. Matching algorithms start the same way.'
    },
    provenance: 'Week 1 K–1 star outline (K–1 Problem 3 fills it with chevrons; here with blue rhombi).',
    sourceIds: ['rhombus-week01'],
    expect: {fillings: 1, deadFirst: 6}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'The sailboat',
    parameters: {mode: 'pack', board: B.sailboat},
    idea: 'Being stuck is not the same as having the most.',
    prerequisites: 'Count to six; compare two small counts.',
    hints: ['Fit as many rhombi as you can. Can you fill it?', 'Count the triangles pointing up and pointing down.', 'Five triangles point down, so five dots on them prove that five rhombi are the most.'],
    parent: {
      notice: 'Many ways of laying rhombi get stuck at three or four; five is the most.',
      prompt: 'When you are stuck at four, is a down triangle still empty?',
      explanation: 'The sailboat has six up and five down triangles. Every rhombus covers one down triangle, so five is the most, and dots on the five down triangles prove it. Of the 20 ways to lay rhombi until none fits, 15 stop at three or four; reaching five can mean lifting a rhombus to make room.',
      extension: 'Find a way to get stuck with only three rhombi.',
      connection: 'A maximal matching need not be maximum; a path that alternates between empty and covered places shows how to gain one (Berge’s theorem).'
    },
    provenance: 'Week 1 K–1 sailboat outline, posed as grades 2–3 Problem 1 poses Board C (one more up triangle than down).',
    sourceIds: ['rhombus-week01', 'rhombus-lovasz-plummer'],
    expect: {best: 5, cover: 'downs', stuck: {3: 3, 4: 12, 5: 5}}
  },
  {
    number: 6, difficulty_level: 'medium', title: 'The bow tie',
    parameters: {mode: 'pack', board: B.bowTie},
    idea: 'Equal numbers of up and down triangles do not guarantee a filling.',
    prerequisites: 'Count to three.',
    hints: ['Three triangles point up and three point down. Can you fill it?', 'The two bottom corners both need the same triangle.', 'Put a dot on each of the two triangles in the middle.'],
    parent: {
      notice: 'Equal numbers of up and down triangles, and still two stay empty.',
      prompt: 'Which triangle do both bottom corners need?',
      explanation: 'The two bottom corners each touch only the middle triangle of the bottom, so at most one of them is covered; the two top corners each touch only the middle triangle of the top. Dots on those two middle triangles prove it: every place a rhombus could go covers one of them, so two rhombi are the most.',
      extension: 'Add one triangle so that the board can be filled.',
      connection: 'Hall’s condition fails: two corners share a single partner. Equal counts are necessary for a filling but not enough.'
    },
    provenance: 'Week 1 facilitator guide, reserve “Equal up/down counts can still fail” (the six-cell bottleneck).',
    sourceIds: ['rhombus-week01', 'rhombus-lovasz-plummer'],
    expect: {best: 2, cover: 'mixed', stuck: {1: 1, 2: 4}}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Six fillings',
    parameters: {mode: 'every', board: B.hex122},
    idea: 'Seen as cubes, each filling is a pile in a small box, and the piles can be listed by size.',
    prerequisites: 'Keep track of a growing list. Counting to six.',
    hints: ['Fill it, then press Clear and find another.', 'Look at the shading: each filling looks like cubes in the corner of a box.', 'The box holds up to four cubes. How many ways are there with none, one, two, three and four?'],
    parent: {
      notice: 'There are exactly six fillings.',
      prompt: 'How can you be sure there isn’t a seventh?',
      explanation: 'Shaded by direction, each filling looks like cubes in the corner of a box two cubes wide, two deep and one high. A cube sits on a floor square only if the squares behind it are full, so the piles have 0, 1, 2, 3 or 4 cubes, with two ways to place two: 1 + 1 + 2 + 1 + 1 = 6. The worksheet counts the same six with ribbons: each filling’s ribbon is a word of two L’s and two R’s.',
      extension: 'How many fillings has the hexagon with all sides 2? (Twenty: puzzle 11.)',
      connection: 'The hexagon with sides a, b, c has as many fillings as there are piles in an a × b × c box (MacMahon). Proofs 8 and 9 use the same six fillings as cards A to F.'
    },
    provenance: 'Week 1 grades 4–5 Problem 1 (find every tiling of the hexagon with sides 1, 2, 2; the six cards A–F).',
    sourceIds: ['rhombus-week01', 'rhombus-david-tomei', 'rhombus-stanley'],
    expect: {fillings: 6, byCubes: [1, 1, 2, 1, 1], size: [1, 2, 2]}
  },
  {
    number: 8, difficulty_level: 'medium', title: 'First flips',
    parameters: {mode: 'flip', board: B.hex222, start: room(B.hex222, 2), goal: stack(B.hex222, 2, [[2, 1], [1]]), budget: 4},
    idea: 'A flip adds or takes away exactly one cube.',
    prerequisites: 'Count to four. Seeing the rhombi as cubes helps but is not needed.',
    hints: ['Tap a white dot and watch the three rhombi round it turn.', 'Each flip adds a cube or takes one away.', 'Build the ⚑ pile one cube at a time, starting in the corner.'],
    parent: {
      notice: 'A flip adds one cube or takes one away.',
      prompt: 'How many cubes are in the ⚑ picture?',
      explanation: 'The ⚑ picture is four cubes in the corner of the box, and each flip adds or removes exactly one cube, so four flips is the fewest. Any order works that adds those four cubes, each resting on the floor or on a cube already there.',
      extension: 'What is the most flips any picture of this box can need from the empty corner? (Eight: the full box.)',
      connection: 'Thurston’s height function: a flip changes the height at one grid point by one cube, so the fewest flips between two fillings is the number of cubes in one pile and not the other.'
    },
    provenance: 'Week 1 grades 4–5 Problems 2 and 3 (the flip, and the shortest route between two cards), on the hexagon with all sides 2 from the facilitator guide’s scaling reserve.',
    sourceIds: ['rhombus-week01', 'rhombus-thurston', 'rhombus-saldanha-tomei'],
    expect: {fewest: 4}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'The hourglass',
    parameters: {mode: 'pack', board: B.hourglass},
    idea: 'Count the scarce kind of triangle in each part, and the rhombi that can cross between them.',
    prerequisites: 'Count to nine; keep two counts in mind at once.',
    hints: ['Nine triangles point up and nine point down. Can you fill it?', 'In the top part every rhombus needs a triangle pointing down; in the bottom part, one pointing up.', 'Put dots on the top part’s down triangles, the bottom part’s up triangles, and the two top-part triangles that touch the bottom part.'],
    parent: {
      notice: 'Most ways of laying rhombi get stuck at six or seven; eight is the most.',
      prompt: 'How many rhombi can cross from the top triangle into the bottom one?',
      explanation: 'The top triangle has six up and three down triangles, the bottom one three up and six down. A rhombus inside the top needs one of its three downs, a rhombus inside the bottom needs one of its three ups, and only two rhombi can cross the seam, each through one of two triangles. So at most 3 + 3 + 2 = 8 rhombi fit and two triangles stay empty; the eight dots make the argument checkable. Only 9 of the 356 ways to lay rhombi until none fits reach eight.',
      extension: 'On paper, slide the bottom triangle so that three rhombi can cross the seam. Can the board be filled then?',
      connection: 'König’s theorem: the most rhombi equals the fewest dots, the matching form of max-flow min-cut. Routes and roadblocks plays the same count on arrows.'
    },
    provenance: 'New: an hourglass of two triangles with three edges on a side, found by exhaustive search for a board with equal up and down counts whose proof needs both kinds of dot. It extends the facilitator guide’s bottleneck reserve.',
    sourceIds: ['rhombus-week01', 'rhombus-lovasz-plummer'],
    expect: {best: 8, cover: 'mixed', stuck: {6: 193, 7: 154, 8: 9}}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Purple pinwheel',
    parameters: {mode: 'fill', piece: 'chevron', board: B.hex222flat},
    idea: 'A bent piece fits only where its bend has room; the hexagon fills only as a pinwheel.',
    prerequisites: 'Turning a shape in your head. No counting needed.',
    hints: ['Every corner of the hexagon needs a chevron.', 'Look at the middle point: the chevrons can turn round it.', 'Each chevron reaches from the middle out to the edge, all bent the same way.'],
    parent: {
      notice: 'There are only two ways, mirror images of each other, and most first chevrons lead nowhere.',
      prompt: 'Where can a chevron go so that the corner beside it can still be filled?',
      explanation: 'Six chevrons fill the hexagon only as a pinwheel round the centre, turning one way or the other. Of the 42 places a first chevron can go, 30 cannot be part of a filling.',
      extension: 'A chevron is two rhombi joined. How many of the twenty rhombus fillings of this hexagon can be paired up into chevrons? (Just one, the pile of four cubes, and it pairs up both ways: the two pinwheels split into the same rhombi.)',
      connection: 'Purples never do better than blues, because each chevron splits into two rhombi (Week 1 grades 2–3 Problem 3). For bent pieces there is no short proof that a board can’t be filled in general, unlike rhombi, where dots always work.'
    },
    provenance: 'Week 1 grades 2–3 Problem 3 (blue rhombi against purple chevrons) and K–1 Problem 3 (chevron-only fills), on the hexagon with all sides 2.',
    sourceIds: ['rhombus-week01'],
    expect: {fillings: 2, deadFirst: 30, chevronOfRhombus: 1}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Twenty piles',
    parameters: {mode: 'every', board: B.hex222, flips: true, start: room(B.hex222, 2)},
    idea: 'Flips reach every filling, and piles of cubes can be listed by size.',
    prerequisites: 'Keep track of a long list; counting to twenty. Seeing the rhombi as cubes.',
    hints: ['Tap a white dot to flip. Every new filling joins the row below.', 'Each filling is a pile of cubes in a box two cubes on every side.', 'Sort the piles by how many cubes they have, from 0 to 8.'],
    parent: {
      notice: 'There are exactly twenty fillings, and flips reach all of them.',
      prompt: 'How many piles have four cubes?',
      explanation: 'Each filling is a pile of cubes in a 2 × 2 × 2 box with nothing floating: a cube needs the floor or a cube under it, and full squares behind and beside it. Piles with 0 to 8 cubes number 1, 1, 3, 3, 4, 3, 3, 1, 1, twenty in all; the list is symmetric because the missing cubes of a pile form a pile too. Taking cubes away one at a time leads from any pile back to the empty box, so flips connect them all.',
      extension: 'Count by columns instead: each of the four columns holds 0, 1 or 2 cubes, never more than the columns behind it.',
      connection: 'Piles in an a × b × c box are plane partitions, counted by MacMahon’s product formula: 20 for 2 × 2 × 2 and 980 for 3 × 3 × 3. Flips connect the rhombus fillings of any board without holes (Thurston).'
    },
    provenance: 'Week 1 facilitator guide, “Scaling and random moves” reserve (the doubled hexagon has twenty tilings); Week 1 encore grades 4–5 (rhombus tilings as cube stacks, a flip adds or removes one cube). The extension packet’s twenty-tiling map is of a different hexagon (sides 1, 3, 3).',
    sourceIds: ['rhombus-week01', 'rhombus-thurston', 'rhombus-stanley'],
    expect: {fillings: 20, byCubes: [1, 1, 3, 3, 4, 3, 3, 1, 1], size: [2, 2, 2]}
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Turn the wall',
    parameters: {mode: 'flip', board: B.hex333, start: stack(B.hex333, 3, [[2, 2, 2]]), goal: stack(B.hex333, 3, [[2], [2], [2]]), budget: 8},
    idea: 'The fewest flips is the number of cubes in one pile and not the other.',
    prerequisites: 'Compare two pictures cube by cube; count to eight.',
    hints: ['Compare the two pictures: which cubes are in both?', 'Take away only cubes that ⚑ doesn’t have, and add only cubes it does.', 'Four cubes go and four come.'],
    parent: {
      notice: 'Two cubes stay put; four go and four come.',
      prompt: 'Which cubes are in both pictures?',
      explanation: 'Each flip adds or removes one cube, so the fewest flips is the number of cubes in one pile and not the other: four to take away and four to add, eight in all. A flip that adds a cube ⚑ lacks, or removes one ⚑ keeps, must be undone later and costs two more.',
      extension: 'Which two piles in this box are farthest apart? (The empty box and the full one, 27 flips.)',
      connection: 'For rhombus fillings of a board without holes, the fewest flips between two fillings is the total difference of their height functions, counted in cubes (Thurston; Saldanha and Tomei).'
    },
    provenance: 'New, extending Week 1 grades 4–5 Problem 3 (the shortest route) to the hexagon with all sides 3, in the cube-pile reading of the Week 1 encore.',
    sourceIds: ['rhombus-week01', 'rhombus-thurston', 'rhombus-saldanha-tomei'],
    expect: {fewest: 8}
  }
];

const playground = {
  id: 'rhombus-playground', number: 0, title: 'Rhombus garden playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Pile cubes in a corner by flipping rhombi, or lay rhombi on a hexagon.',
  controls: `Pick a hexagon. ${FLIP} Each flip adds or takes away a cube. ${DRAG} Tap the chosen hexagon again to empty the box.`,
  rules: [...RULES, 'A flip turns three rhombi that make a small hexagon round a point into the hexagon’s other filling.'],
  idea: 'Free play on hexagons with sides 2, 3 and 4.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Tap the white dot in the corner and watch a cube appear.', 'Build a staircase of cubes.', 'Fill the box, then empty it one cube at a time.'],
  parent: {
    notice: 'Every flip adds or removes one cube, and the shading makes the rhombi look like cubes in a corner.',
    prompt: 'How many flips does it take to fill the biggest box?',
    explanation: 'Each hexagon here is the picture of a box: sides 2, 3 or 4 cubes. Filling it takes 8, 27 or 64 flips, one per cube. The biggest box has 232,848 different piles, each a different way to fill the hexagon with rhombi.',
    extension: 'Lift a few rhombi and lay them back a different way. Is the result always a pile of cubes?',
    connection: 'The calisson problem: in every filling of a regular hexagon, each of the three directions of rhombus appears equally often, because a pile seen from three sides shows the same area each way (David and Tomei).'
  },
  provenance: 'Week 1 materials: blue rhombi on a large hexagon, and the encore’s cube stacks, for free play.',
  sourceIds: ['rhombus-week01', 'rhombus-david-tomei', 'rhombus-stanley']
};

/* ------------------------------------------------------------------ *
 * Checks of the authored claims
 * ------------------------------------------------------------------ */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function stuckSizes(g) {
  const sizes = {}, seen = new Set();
  (function rec(taken, pieces) {
    const key = tilingKey(pieces);
    if (seen.has(key)) return;
    seen.add(key);
    const free = g.pairs.filter(([a, b]) => !taken.has(a) && !taken.has(b));
    if (!free.length) { sizes[pieces.length] = (sizes[pieces.length] || 0) + 1; return; }
    for (const p of free) { taken.add(p[0]); taken.add(p[1]); pieces.push(p); rec(taken, pieces); pieces.pop(); taken.delete(p[0]); taken.delete(p[1]); }
  })(new Set(), []);
  return sizes;
}
function check(p) {
  const q = p.parameters, e = p.expect || {}, g = gridOf(q.board), shape = q.piece || 'rhombus', fail = msg => { throw Error(`Puzzle ${p.number}: ${msg}`); };
  if (q.mode === 'fill' || q.mode === 'every') {
    const all = covers(g, shape);
    if (e.fillings !== undefined && all.length !== e.fillings) fail(`${all.length} fillings`);
    if (e.deadFirst !== undefined) {
      const dead = placements(g, shape).filter(piece => !covers(g, shape, 1, [piece]).length).length;
      if (dead !== e.deadFirst) fail(`${dead} dead first pieces`);
    }
    if (e.chevronOfRhombus !== undefined) {
      const split = ch => { const sub = gridOf({cells: ch.map(i => g.cells[i])}); return covers(sub)[0].map(pair => sortPiece(pair.map(i => g.index.get(cellKey(sub.cells[i]))))); };
      const fromChevrons = new Set(all.map(t => tilingKey(t.flatMap(split))));
      if (fromChevrons.size !== e.chevronOfRhombus) fail('chevron fillings do not split into distinct rhombus fillings');
    }
    if (e.leftSplit) {
      const left = g.points.map((_, k) => k).sort((a, b) => g.xy[a][0] - g.xy[b][0])[0], [x, y] = g.around[left];
      const together = all.filter(t => t.some(piece => piece.includes(x) && piece.includes(y))).length;
      if (!same([together, all.length - together], e.leftSplit)) fail(`left split ${together}`);
    }
    if (e.byCubes) {
      const [a, b, c] = e.size, empty = cornerTiling(g, a, b, c), counts = [];
      for (const t of all) { const n = flipRoute(g, empty, t).length; counts[n] = (counts[n] || 0) + 1; }
      if (!same(counts, e.byCubes)) fail(`by cubes ${counts}`);
    }
    if (q.start && !all.some(t => tilingKey(t) === tilingKey(q.start))) fail('start is not a filling');
  }
  if (q.mode === 'pack') {
    const best = maxPacking(g).length, cover = minCover(g);
    if (best !== e.best || cover.length !== best || openSpot(g, cover)) fail(`best ${best}, cover ${cover.length}`);
    const ups = g.cells.filter(c => !c[2]).length, downs = g.cells.length - ups;
    if (e.cover === 'downs' && downs !== best) fail('the down triangles are not a fewest set of dots');
    if (e.cover === 'mixed' && (ups === best || downs === best)) fail('one kind of triangle alone proves it');
    if (e.stuck && !same(stuckSizes(g), Object.fromEntries(Object.entries(e.stuck).map(([k, v]) => [k, v])))) fail(`stuck ${JSON.stringify(stuckSizes(g))}`);
    if (p.number === 9) {
      // The hint's dots: top downs, bottom ups, and the two seam triangles.
      const top = new Set(upTriangle(3).map(c => c.join(','))), dots = g.cells.map((c, i) => [c, i]).filter(([c, i]) => top.has(c.join(',')) ? (c[2] === 1 || g.nbr[i].some(j => !top.has(g.cells[j].join(',')))) : c[2] === 0).map(([, i]) => i);
      if (dots.length !== 8 || openSpot(g, dots)) fail('the hinted dots do not prove eight');
    }
    if (p.number === 6) {
      const middle = g.cells.map((c, i) => i).filter(i => g.nbr[i].length === 3);
      if (middle.length !== 2 || openSpot(g, middle)) fail('the two middle triangles are not the proof');
    }
  }
  if (q.mode === 'flip') {
    const route = flipRoute(g, q.start, q.goal);
    if (route.length !== e.fewest || q.budget !== e.fewest) fail(`fewest ${route.length}`);
  }
}

const pieceOf = q => q.piece || 'rhombus';
const puzzles = [playground, ...authored].map(p => {
  if (p.number) check(p);
  const {expect, sourceIds, parent, ...rest} = p, q = rest.parameters;
  if (q.start) q.start = q.start.map(sortPiece);
  if (q.goal) q.goal = q.goal.map(sortPiece);
  const kind = q.mode === 'fill' ? (pieceOf(q) === 'chevron' ? 'chevron' : 'fill') : q.mode === 'every' ? (q.flips ? 'everyFlip' : 'every') : q.mode;
  const objective = rest.objective || (q.mode === 'flip' ? `Flip rhombi until the board matches ⚑, in at most ${q.budget} flips.` : OBJECTIVE[kind] || OBJECTIVE[q.mode]);
  const visibleObjective = q.mode === 'flip' ? `Make ⚑ in ${q.budget} flips.` : VISIBLE[kind] ?? VISIBLE[q.mode];
  return {
    id: q.mode === 'playground' ? rest.id : `rhombus-${String(rest.number).padStart(2, '0')}`,
    number: rest.number, title: rest.title, band: rest.band || 'all', difficulty_level: rest.difficulty_level,
    mechanic: 'rhombus', familyTitle: family.title, revision: 1, parameters: q,
    objective, ...(visibleObjective === undefined ? {} : {visibleObjective}), instruction: objective,
    controls: rest.controls || CONTROLS[kind], rules: rest.rules || [...(kind === 'chevron' ? ['Pieces stay inside the board and never overlap.'] : RULES), ...MODE_RULES[kind]],
    idea: rest.idea, prerequisites: rest.prerequisites, hints: rest.hints,
    parent: {...parent, sourceIds}, provenance: rest.provenance, sourceDocument: 'docs/rhombus/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/rhombus/rhombus.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
