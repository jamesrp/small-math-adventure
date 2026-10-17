// Authoring list for Corners (worksheet Week 56: corners of a solid and
// Euler's formula). Computes every puzzle's answers with the mechanic's own
// functions, checks them against the tables in docs/corners/README.md, and
// writes dist/families/corners/corners.json. scripts/validate-corners.mjs
// checks them again by other methods. Run: node scripts/build-corners.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {answersOf, fillsOf, possible, smallestRing, foldOf, totalOf, piecesOf, facesOf, isTree, treeMap} from '../dist/families/corners/corners.js';

const FAMILY = 'Corners';
const DOC = 'docs/corners/README.md';
const sources = ['corners-week56', 'corners-card56', 'corners-banchoff', 'corners-neale'];
const NAME = {T: 'triangle', S: 'square', P: 'pentagon'};
const plural = c => `${NAME[c]}s`;
const listWords = words => words.length < 3 ? words.join(' and ') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
const menuWords = menu => listWords(menu.map(plural));

// --- Rings ---------------------------------------------------------------------
const opening = menu => `${menu.length === 1 ? `Corners of ${plural(menu[0])}` : `Corners of ${menuWords(menu)}, all with the same side,`} lie flat round a point, side to side. Fold joins the first corner’s free side to the last one’s: the corners fold to a point, lie flat or overlap.`;
const RING_RULES = {
  base: menu => [
    `${menu.length === 1 ? `Corners of ${plural(menu[0])}` : `Corners of ${menuWords(menu)}, all with the same side,`} lie flat round the point, side to side, in the order they are added.`,
    'Fold joins the first corner’s free side to the last one’s. The corners fold to a point, lie flat or overlap.'
  ],
  every: (goal, count) => [
    'A ring read from another corner, or the other way round, is the same ring.',
    `Keep puts the ring on the shelf. Press That’s all when the shelf holds every ring${count ? ` of ${count} corners` : ''} that ${goal === 'flat' ? 'lies flat' : 'folds to a point'}, and no other.`
  ],
  make: count => [
    `The ring has ${count} places. The corners with a pin are fixed; fill the other places.`,
    'Press Can’t, after folding a full ring, if no ring like this folds to a point.'
  ]
};
const CONTROLS = {
  every: menu => `${opening(menu)} Tap a shape to add its corner, and tap a corner on the board to take it out. Tap the folded corner to lay it flat again. Keep puts the ring on the shelf (a ring turned round or flipped over is the same ring); tap a ring on the shelf to take it off. Press That’s all when the shelf is complete. Undo keeps That’s all’s answer until the shelf changes.`,
  make: menu => `${opening(menu)} Tap a shape to add its corner, and tap a corner you added to take it out; the corners with a pin are fixed. Fold a full ring. Press Can’t, after a Fold, if no ring like this folds to a point. Undo keeps Can’t’s answer until the ring changes.`,
  playground: menu => `${opening(menu)} Tap a shape to add its corner, and tap a corner on the board to take it out. Tap the folded corner to lay it flat again.`
};
const fixedWords = locked => {
  const counts = {};
  for (const c of locked) counts[c] = (counts[c] || 0) + 1;
  const words = Object.entries(counts).map(([c, n]) => n === 1 ? `the ${NAME[c]}` : `the ${['', '', 'two', 'three', 'four'][n]} ${plural(c)}`);
  return listWords(words);
};
const OBJECTIVE = {
  every: (goal, count) => `Find every ring${count ? ` of ${count} corners` : ''} that ${goal === 'flat' ? 'lies flat' : 'folds to a point'}, keep each one on the shelf, then press That’s all.`,
  make: (locked, count) => `With ${fixedWords(locked)} fixed, fill the other places of a ring of ${count} corners so that it folds to a point. If no ring like this does, press Can’t after folding a full ring.`
};
const VISIBLE = {
  every: (goal, count) => `Find every ring${count ? ` of ${count} corners` : ''} that ${goal === 'flat' ? 'lies flat' : 'folds to a point'}.`,
  make: 'Fold a pointed corner.'
};
const PREREQ = {
  shapes: 'Tell triangles, squares and pentagons apart and see whether corners leave a gap. No reading; a grown-up can read How to play.',
  every: 'See when two rings are the same after turning or flipping, and keep track of the shelf. The hints use degrees (60, 90 and 108); a grown-up can read How to play.',
  make: 'Fold a ring and see whether it overlaps, lies flat or leaves a gap. The hints use degrees (60, 90 and 108).'
};

const RINGS = [
  {number: 1, level: 'easy', title: 'Triangles', mode: 'every', menu: ['T'], goal: 'point', check: ['TTT', 'TTTT', 'TTTTT'], prereq: 'shapes',
    idea: 'Triangle corners fold to a point while they leave a gap: three, four or five of them. Six make a whole turn and lie flat.',
    hints: ['Add triangle corners one at a time and press Fold each time. When do they stop folding to a point?', 'Three, four and five triangle corners leave a gap and fold. Six make a whole turn and lie flat; seven overlap.', 'Keep the rings of three, four and five triangles, then press That’s all.'],
    parent: {notice: 'Whether your child adds one more triangle each time and watches the gap shrink, and whether they try six and seven.', prompt: 'What happens to the gap when you add a triangle?', explanation: 'Each triangle corner is 60°, a sixth of a turn. Three, four and five make 180°, 240° and 300°, leaving gaps of 180°, 120° and 60°, so they fold into the corners of the tetrahedron, the octahedron and the icosahedron. Six make exactly 360° and lie flat, like the triangles of a floor tiling; seven overlap.', extension: 'Which solids have three, four and five triangles at every corner? (The tetrahedron, the octahedron and the icosahedron.)', connection: 'A corner of a convex solid needs its face angles to add to less than a whole turn; the gap is its angular defect.'},
    provenance: 'Week 56 Grades 2–5 Problem 3: three, four, five and six triangles; which close into a pointed corner and which lie flat.'},
  {number: 2, level: 'easy', title: 'Three squares', mode: 'make', menu: ['T', 'S', 'P'], locked: ['S', 'S', 'S'], count: 4, check: ['T'], prereq: 'make',
    idea: 'Three squares leave a quarter turn; only a corner smaller than a square fits in it and still folds.',
    hints: ['Try each shape in the empty place and press Fold.', 'Another square makes a whole turn and lies flat, and a pentagon goes past it. A triangle leaves a gap.', 'Add a triangle and press Fold.'],
    parent: {notice: 'Whether your child tries all three shapes, and what they expect a fourth square to do.', prompt: 'Why does a fourth square lie flat?', explanation: 'Three squares make 270°. A triangle brings the total to 330° and the corner folds; a square makes 360° and lies flat; a pentagon makes 378° and overlaps.', extension: 'Three squares alone fold too: that is a cube’s corner. Which solid has three squares and a triangle at every corner? (The small rhombicuboctahedron.)', connection: 'Corners with more than one kind of face belong to the Archimedean solids.'},
    provenance: 'New: Week 56 Problem 3’s three squares (the cube’s corner) with one more place.'},
  {number: 3, level: 'easy', title: 'Squares and pentagons', mode: 'every', menu: ['S', 'P'], goal: 'point', check: ['PPP', 'PPS', 'PSS', 'SSS'], prereq: 'shapes',
    idea: 'Any three squares and pentagons leave a gap, and any four overlap or lie flat, so the rings are the four ways to choose three.',
    hints: ['Fold rings of three corners, then rings of four.', 'Every ring of three folds. Four squares make a whole turn already, and a pentagon is bigger than a square.', 'Keep three squares, two squares and a pentagon, a square and two pentagons, and three pentagons. Then press That’s all.'],
    parent: {notice: 'Whether your child tries four corners and sees that they never fold, and whether they notice that two squares and a pentagon is one ring however it is turned.', prompt: 'Why can’t a ring have four of these corners?', explanation: 'The smallest four are four squares, 360°, which lie flat; any pentagon makes more. Every three fold: the biggest, three pentagons, make 324°. That gives SSS, SSP, SPP and PPP, and with three corners every order is the same ring.', extension: 'Which solid has three pentagons at every corner? (The dodecahedron.) Is there a solid with a square and two pentagons at every corner? (No: round each pentagon its neighbours would have to alternate between squares and pentagons, and five is odd.)', connection: 'Three pentagons at a corner build the dodecahedron (Problem 9’s second picture).'},
    provenance: 'Week 56 Grades 4–5 Problem 9 (pentagon faces, three at every corner) with Problem 3’s squares; Banchoff, Chapter 5 §2, compares these corners.'},
  {number: 4, level: 'medium', title: 'Flat rings', mode: 'every', menu: ['T', 'S'], goal: 'flat', check: ['SSSS', 'SSTTT', 'STSTT', 'TTTTTT'], prereq: 'every',
    idea: 'Three triangle corners fill the same turn as two squares, so a flat ring trades squares for triangles; two squares with three triangles go round in two different orders.',
    hints: ['Fold rings until one lies flat. Can you swap some of its corners for others and still lie flat?', 'Three triangle corners make 180°, the same as two squares. Four squares, two squares with three triangles, and six triangles all make a whole turn.', 'Two squares and three triangles go round in two ways: the squares side by side, or with a triangle between them. Keep all four rings, then press That’s all.'],
    parent: {notice: 'Whether your child finds the trade of two squares for three triangles, and whether they find the second order.', prompt: 'Are the squares side by side in every flat ring with two squares?', explanation: 'A flat ring makes 360°: 90 × squares + 60 × triangles = 360 gives four squares, two squares and three triangles, or six triangles. Two squares and three triangles can be round the point with the squares touching or with one triangle between them (the other side then has two), and no turning or flipping takes one to the other.', extension: 'Each flat ring tiles a floor round one point. Which of them tile the whole floor with every point alike? (All four.)', connection: 'These are the vertex types of the regular and semiregular tilings made of squares and triangles.'},
    provenance: 'Week 56 Grades 2–5 Problem 3 (“Which close flat with no gap?”) widened to mixed rings, as the card’s second run counts them (SSSS, TTTTTT, TTTSS, TTSTS).'},
  {number: 5, level: 'medium', title: 'Two pentagons', mode: 'make', menu: ['T', 'S', 'P'], locked: ['P', 'P'], count: 4, check: ['TT'], prereq: 'make',
    idea: 'Two pentagons leave less than two squares’ room; only the two smallest corners fit.',
    hints: ['Fill both places and press Fold. If the corners overlap, which one could be smaller?', 'Two pentagon corners are 216°. Two more must make less than 144°: a square and a triangle make 150°, too much.', 'Add two triangles and press Fold.'],
    parent: {notice: 'Whether your child swaps one corner at a time after an overlap, or starts again.', prompt: 'How did you know which corner to change?', explanation: 'Two pentagons make 216°, so the other two corners must make less than 144°. Two triangles make 120° (total 336°) and fold; a triangle and a square make 150° (366°) and overlap; anything bigger overlaps more.', extension: 'Which solid has two pentagons and two triangles at every corner, alternating? (The icosidodecahedron.)', connection: 'The icosidodecahedron’s corner is triangle, pentagon, triangle, pentagon; here the pentagons sit side by side, which still folds.'},
    provenance: 'New, after Week 56 Problem 9’s pentagon corners.'},
  {number: 6, level: 'medium', title: 'Two squares', mode: 'make', menu: ['T', 'S', 'P'], locked: ['S', 'S'], count: 5, check: [], prereq: 'make',
    idea: 'The smallest corners in every free place decide it: two squares and three triangles already make a whole turn, so no ring like this folds.',
    hints: ['Fill the three places and press Fold. Could any corner be smaller?', 'Triangles are the smallest corners. Two squares and three triangles make exactly 360° and lie flat.', 'A bigger corner only adds more, so no ring like this folds to a point. Fold two squares and three triangles, then press Can’t.'],
    parent: {notice: 'Whether your child tries smaller corners after a fold that overlaps, and whether they can say why one ring settles every other.', prompt: 'How do you know no other filling works?', explanation: 'Two squares make 180°. Three more corners are at least three triangles, 180°, so every filling makes at least 360°: the smallest lies flat and every other overlaps. Folding the smallest is the proof.', extension: 'With four places instead of five, which fillings fold? (A triangle with a triangle, a square or a pentagon: 300°, 330° and 348°.)', connection: 'A bound by the smallest case: if the best case fails, every case fails.'},
    provenance: 'New: the card’s “can’t” certificate, the angle total of the smallest ring laid flat.'},
  {number: 7, level: 'hard', title: 'Five corners', mode: 'every', menu: ['T', 'S', 'P'], goal: 'point', count: 5, check: ['PTTTT', 'STTTT', 'TTTTT'], prereq: 'every',
    idea: 'Five corners fit in a turn only with four triangles; the fifth can be any shape.',
    hints: ['Fill the five places and press Fold. Which corners leave room for five?', 'Five triangles make 300°. Swapping one triangle for a square or a pentagon still leaves a gap; swapping two never does.', 'Keep five triangles, four triangles with a square, and four triangles with a pentagon. Then press That’s all.'],
    parent: {notice: 'Whether your child starts from five triangles and swaps, and whether they check two swaps.', prompt: 'Why can only one corner be something other than a triangle?', explanation: 'Five triangles make 300°. Swapping one triangle for a square adds 30° (330°) and for a pentagon 48° (348°): both fold. Two swaps add at least 60°, to 360° or more. With one odd corner, every order is the same ring.', extension: 'Which solid has five triangles at every corner? Four triangles and a pentagon? (The icosahedron; the snub dodecahedron.)', connection: 'The snub cube (four triangles and a square) and the snub dodecahedron are the two snub Archimedean solids.'},
    provenance: 'Week 56 Grades 4–5 Problem 9: five triangles at every corner (the icosahedron), with squares and pentagons offered.'},
  {number: 8, level: 'hard', title: 'One pentagon', mode: 'make', menu: ['S', 'P'], locked: ['P'], count: 4, check: [], prereq: 'make',
    idea: 'With squares as the smallest corner, a pentagon and three squares already go past a whole turn.',
    hints: ['Fill the three places and press Fold. Could any corner be smaller?', 'Squares are the smallest corners here. A pentagon and three squares make 378°, past a whole turn.', 'A bigger corner only adds more, so no ring like this folds to a point. Fold a pentagon and three squares, then press Can’t.'],
    parent: {notice: 'Whether your child fills with squares after seeing pentagons overlap.', prompt: 'Would it help to put the pentagon somewhere else in the ring?', explanation: 'A pentagon is 108° and a square 90°, so a pentagon and three squares make 378°. Every other filling has more pentagons and more degrees. The order round the point never changes the total.', extension: 'With triangles offered too, which fillings fold? (Three triangles; two triangles with a square or a pentagon; a triangle and two squares: 288°, 318°, 336° and 348°.)', connection: 'Only the total decides whether corners fold to a point; their order decides which ring it is.'},
    provenance: 'New: a Can’t with squares as the smallest corner on offer, after Week 56 Problem 9’s pentagon corners.'},
  {number: 9, level: 'hard', title: 'Triangles and squares', mode: 'every', menu: ['T', 'S'], goal: 'point', check: ['SSS', 'SST', 'STT', 'TTT', 'SSST', 'SSTT', 'STST', 'STTT', 'TTTT', 'STTTT', 'TTTTT'], prereq: 'every',
    idea: 'Sort the rings by how many corners they have: four of three, five of four (two squares and two triangles go round two ways) and two of five.',
    hints: ['Sort rings by how many corners they have. Which rings of three fold to a point?', 'Every ring of three folds. Four corners fold unless all four are squares; five fold only with at most one square.', 'Two squares and two triangles go round in two ways: squares side by side, or opposite. That makes 4 rings of three, 5 of four and 2 of five. Keep all 11, then press That’s all.'],
    parent: {notice: 'Whether your child organises the search by size or by number of squares, and how they spot that a ring is already on the shelf.', prompt: 'Is two squares and two triangles one ring or two?', explanation: 'Three corners: SSS, SST, STT, TTT (270° at most). Four: TTTT, STTT, SSTT, STST, SSST (330° at most; SSSS lies flat). Five: TTTTT and STTTT (330°); SSTTT lies flat. Six or more make at least 360°. That is 11 rings from 10 sets of corners, since two squares and two triangles can be side by side or opposite.', extension: 'Which of these are the corner of a solid with every corner alike? (All but two: TTT, TTTT, TTTTT, SSS, SST, STTT, SSST, STST and STTTT are the corners of the tetrahedron, octahedron, icosahedron, cube, triangular prism, square antiprism, small rhombicuboctahedron, cuboctahedron and snub cube. STT and SSTT are not: round a triangle the neighbours would have to alternate between triangles and squares.)', connection: 'Corners with a positive gap; the card’s second run finds 11 rings from 10 piece sets.'},
    provenance: 'Week 56 Problem 3 widened to every mix of triangles and squares, as the card’s second run counts them: 11 rings up to turning and flipping.'}
];

const ringId = n => `corners-ring-${String(n).padStart(2, '0')}`;
const rings = RINGS.map(item => {
  const q = {mode: item.mode, menu: item.menu};
  let solution;
  if (item.mode === 'every') {
    Object.assign(q, {goal: item.goal}, item.count ? {count: item.count} : {});
    const answers = answersOf(q);
    assert.deepEqual([...answers].sort(), [...item.check].sort(), `${ringId(item.number)}: answers`);
    for (const r of answers) assert.equal(foldOf([...r]), item.goal, `${ringId(item.number)}: ${r} ${item.goal}`);
    solution = {rings: answers};
  } else {
    Object.assign(q, {locked: item.locked, count: item.count});
    const fills = fillsOf(q);
    assert.deepEqual(fills, item.check, `${ringId(item.number)}: fills`);
    assert.equal(possible(q), fills.length > 0, `${ringId(item.number)}: the smallest ring decides`);
    const smallest = smallestRing(q);
    solution = fills.length ? {fills, witness: [...q.locked, ...fills[0]]} : {fills: [], certificate: smallest, total: totalOf(smallest), fold: foldOf(smallest)};
  }
  return {
    id: ringId(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: FAMILY, libraryFamily: 'corners', group: 'Rings', mechanic: 'corners', band: 'all', revision: 1, sourceDocument: DOC,
    parameters: q,
    objective: item.mode === 'every' ? OBJECTIVE.every(item.goal, item.count) : OBJECTIVE.make(item.locked, item.count),
    visibleObjective: item.mode === 'every' ? VISIBLE.every(item.goal, item.count) : VISIBLE.make,
    instruction: item.mode === 'every' ? OBJECTIVE.every(item.goal, item.count) : OBJECTIVE.make(item.locked, item.count),
    controls: CONTROLS[item.mode](item.menu),
    rules: [...RING_RULES.base(item.menu), ...(item.mode === 'every' ? RING_RULES.every(item.goal, item.count) : RING_RULES.make(item.count))],
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

// --- Trees -------------------------------------------------------------------------
// Opened drawings: a solid seen through one face that has been taken out.
// Positions are percentages of the board; y is a share of its height.
const round = n => Number(n.toFixed(1));
function triangleDrawing(aspect, inner) {
  // An equilateral outer triangle 88 wide, and (for the octahedron) an inner
  // triangle turned upside down round its middle.
  const H = 100 / aspect, side = 88, top = 6, h = side * Math.sqrt(3) / 2, cy = top * H / 100 + h * 2 / 3;
  const at = (x, y) => [round(x), round(y / H * 100)];
  const nodes = {A: at(50, top * H / 100), B: at(50 - side / 2, top * H / 100 + h), C: at(50 + side / 2, top * H / 100 + h)};
  if (inner === 'centre') nodes.D = at(50, cy);
  if (inner === 'triangle') {
    const r = 16;
    nodes.D = at(50, cy + r);
    nodes.E = at(50 - r * Math.cos(Math.PI / 6), cy - r / 2);
    nodes.F = at(50 + r * Math.cos(Math.PI / 6), cy - r / 2);
  }
  return nodes;
}
const TREES = [
  {number: 1, level: 'easy', title: 'Tetrahedron', aspect: 1.12, nodes: triangleDrawing(1.12, 'centre'),
    edges: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'D'], ['B', 'D'], ['C', 'D']], counts: [4, 6, 3], route: [0, 1, 2],
    idea: 'Erasing a line on a loop opens one shaded region and keeps every dot joined: three regions, three erasures, and three lines left make a tree.',
    hints: ['Which line lies on a loop? If you erase it, can its ends still reach each other?', 'Erasing a line between a shaded region and the outside opens that region, and every dot stays joined.', 'Erase the three outside lines.'],
    parent: {notice: 'Whether your child checks that every dot is still joined after an erasure.', prompt: 'How many lines did you erase, and how many shaded regions were there?', explanation: 'The tetrahedron has 4 corners, 6 edges and 4 faces; seen through one face, its drawing has 4 dots, 6 lines and 3 shaded regions. Each line erased on a loop takes away one line and one region. After three, 4 dots and 3 lines are left with no region: a tree. So dots − lines + regions is 1, and with the missing face back V − E + F = 2.', extension: 'Erase a different three lines that also leave a tree. How many ways are there? (Sixteen of the twenty ways to choose three lines; the other four leave a triangle and a lone dot.)', connection: 'Neale’s edge-removal proof of Euler’s formula (NRICH).'},
    provenance: 'Week 56 Grades 4–5 Problem 7: the page’s tetrahedron example (input, view through the opening, tree), erasing its three boundary edges as guide p. 7 does.'},
  {number: 2, level: 'medium', title: 'Cube', aspect: 1, nodes: {A: [6, 94], B: [94, 94], C: [94, 6], D: [6, 6], E: [33, 67], F: [67, 67], G: [67, 33], H: [33, 33]},
    edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['E', 'F'], ['F', 'G'], ['G', 'H'], ['H', 'E'], ['A', 'E'], ['B', 'F'], ['C', 'G'], ['D', 'H']], counts: [8, 12, 5], route: [0, 1, 2, 3, 4],
    idea: 'Each erasure takes away one line and one region, so dots − lines + regions stays 8 − 12 + 5 = 1 all the way to the tree (8 − 7 + 0). Put the missing face back: V − E + F = 2.',
    hints: ['Try one outside line first. Which shaded region joins the outside? Keep every dot joined.', 'A line with the same white space on both sides is the only way between its dots now: leave it.', 'Erase the four lines of the outer square, then one line of the inner square.'],
    parent: {notice: 'Whether your child erases a line that cuts dots off and then draws it back, and whether they peel from the outside or erase inner lines first.', prompt: 'When you erase a line on a loop, what happens to the regions on its two sides?', explanation: 'The opened cube has 8 dots, 12 lines and 5 shaded regions. A line with different spaces on its sides lies on a loop: erasing it joins the two spaces into one, so one region goes and every dot stays joined. A tree has no loop and one line fewer than dots, 7 here, so 5 erasures are needed and 1 = 8 − 12 + 5 throughout. Guide p. 7’s route erases AB, BC, CD, DA and then ab (here the inner square’s bottom line).', extension: 'Erase only inner lines first. Does it still take five erasures? (Yes: every erasure on a loop removes one region, whichever two spaces it joins.)', connection: 'The lines erased join the faces into a second tree (each face a dot, each erased line a link): F − 1 erased lines and V − 1 kept lines make E, which is Euler’s formula again.'},
    provenance: 'Week 56 Grades 4–5 Problem 7: the opened cube (“Can an opened drawing be changed into a tree while keeping all its vertices connected?”), with guide p. 7’s route.'},
  {number: 3, level: 'hard', title: 'Octahedron', aspect: 1.12, nodes: triangleDrawing(1.12, 'triangle'),
    edges: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['D', 'E'], ['E', 'F'], ['F', 'D'], ['A', 'E'], ['A', 'F'], ['B', 'D'], ['B', 'E'], ['C', 'D'], ['C', 'F']], counts: [6, 12, 7], route: [0, 1, 2, 6, 8, 11, 3],
    idea: 'Seven regions and twelve lines, but the same rule: erase lines that lie on a loop. Six dots need five lines, so seven erasures, one per region.',
    hints: ['Peel from the outside: each line you erase should open one shaded region to the outside.', 'A line with the outside on both sides is the only way between its dots now: leave it.', 'Erase the three outside lines, then one line from each corner dot to the inner triangle, then one line of the inner triangle.'],
    parent: {notice: 'Whether your child keeps track of which dots are still joined as the drawing thins out.', prompt: 'How many lines will be left when you are done?', explanation: 'The octahedron has 6 corners, 12 edges and 8 faces; seen through one face, 6 dots, 12 lines and 7 shaded regions. A tree on 6 dots has 5 lines, so 7 lines must go, one for each region: 6 − 12 + 7 = 1 = 6 − 5 + 0.', extension: 'Can a tree keep all three outside lines? (No: they make a loop.)', connection: 'The card’s fix 3 adds this drawing, with the prism and the square pyramid, to Problem 7.'},
    provenance: 'Week 56 card fix 3: the octahedron’s opened drawing (6 dots, 12 lines, 7 regions) after Problem 7.'}
];
const TREE_RULES = [
  'An opened drawing is a solid seen through one face that has been taken out. Its dots and lines are the solid’s corners and edges; its shaded regions are the other faces.',
  'A tree is a drawing with every dot joined and no closed region.',
  'Erase lines until a tree is left. Dots cut off from the others turn red.'
];
const TREE_CONTROLS = 'An opened drawing is a solid seen through one face that has been taken out: its shaded regions are the other faces. Erasing a line takes it away, and a tree has every dot joined with no closed region left. Tap a line to erase it, and tap an erased line to draw it back. Dots cut off from the others turn red.';
const treeId = n => `corners-tree-${String(n).padStart(2, '0')}`;
const trees = TREES.map(item => {
  const q = {nodes: item.nodes, edges: item.edges, aspect: item.aspect};
  const faces = facesOf(q, []);
  assert.deepEqual([Object.keys(q.nodes).length, q.edges.length, faces.closed.length], item.counts, `${treeId(item.number)}: dots, lines and regions`);
  assert.equal(piecesOf(q, []).count, 1, `${treeId(item.number)}: one piece`);
  // The route keeps every dot joined at each step and ends in a tree.
  item.route.forEach((_, k) => assert.equal(piecesOf(q, item.route.slice(0, k + 1).sort((x, y) => x - y)).count, 1, `${treeId(item.number)}: route step ${k + 1}`));
  assert.ok(isTree(q, [...item.route].sort((x, y) => x - y)), `${treeId(item.number)}: the route ends in a tree`);
  assert.equal(item.route.length, item.counts[2], `${treeId(item.number)}: one erasure per region`);
  treeMap(q);
  return {
    id: treeId(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: FAMILY, libraryFamily: 'corners', group: 'Trees', mechanic: 'corner-trees', band: 'all', revision: 1, sourceDocument: DOC,
    parameters: q,
    objective: 'Erase lines of the opened drawing until a tree is left: every dot still joined and no shaded region.',
    visibleObjective: 'Erase lines until a tree is left.',
    instruction: 'Erase lines of the opened drawing until a tree is left: every dot still joined and no shaded region.',
    controls: TREE_CONTROLS, rules: TREE_RULES,
    idea: item.idea,
    prerequisites: 'See whether every dot can still be reached along the lines, and whether a region is closed. Counting dots, lines and regions is for the grown-up conversation afterwards.',
    hints: item.hints, parent: {...item.parent, sourceIds: sources},
    solution: {route: item.route, erasures: item.route.length, dots: item.counts[0], lines: item.counts[1], regions: item.counts[2]},
    provenance: item.provenance
  };
});

// --- The playground ---------------------------------------------------------------
const playground = {
  id: 'corners-playground', number: 0, title: 'Corners playground', difficulty_level: 'playground', familyTitle: FAMILY, libraryFamily: 'corners', mechanic: 'corners', band: 'playground', revision: 1, sourceDocument: DOC,
  parameters: {mode: 'playground', menu: ['T', 'S', 'P']},
  objective: 'Build rings of triangle, square and pentagon corners and fold them.', visibleObjective: '',
  instruction: 'Build rings of triangle, square and pentagon corners and fold them.',
  controls: CONTROLS.playground(['T', 'S', 'P']), rules: RING_RULES.base(['T', 'S', 'P']),
  idea: 'Free building: which rings fold to a point, which lie flat and which overlap, and how a ring changes when a corner is swapped.',
  prerequisites: 'None. A grown-up can name a corner of a real solid to build.',
  hints: ['Build the corner of a cube, then of a tetrahedron.', 'Find a ring that lies flat. Can you swap corners and keep it flat?', 'Which corner of a solid on the table has a triangle and a square together?'],
  parent: {notice: 'Whether your child predicts the fold before pressing it, and whether they connect a folded ring with a corner of a paper solid.', prompt: 'Can you build the corner of the square pyramid’s top? Of its base?', explanation: 'The pyramid’s top has four triangles (240°) and each base corner a square and two triangles (210°). Rings fold to a point under 360°, lie flat at 360° and overlap past it.', extension: 'Build every corner of one paper solid and add up the gaps. (Always 720°, Descartes’ theorem; Problem 4.)', connection: 'Week 56 Problems 3, 4 and 5: corners of the paper solids and their gaps.', sourceIds: sources},
  provenance: 'Week 56 Grades 2–5 Problems 3 to 5 and the materials’ fan pieces: free building with triangle, square and pentagon corners.'
};

const json = {
  title: FAMILY,
  version: 1,
  families: [{id: 'corners', title: FAMILY,
    mathematics: 'Corners of regular polygons with the same side fit round a point side to side: a triangle’s corner is 60°, a square’s 90° and a pentagon’s 108°. Three or more fold into a pointed corner with no dent exactly when they make less than a whole turn (each angle is then less than the others together, so the corner exists); they lie flat at exactly a whole turn and overlap past it. The missing part of the turn is the corner’s gap. Up to turning and flipping, 11 rings of triangles and squares fold to a point (from 10 sets of corners) and 4 lie flat; pentagons add 14 pointed rings and no flat one. With some corners fixed, some filling of the free places folds exactly when the filling with the smallest corner everywhere folds, so that ring laid flat is the proof that none does. An opened drawing is a convex solid seen through one face that has been taken out: a connected plane drawing whose closed regions are the other faces. Erasing a line with different spaces on its two sides keeps every dot joined and removes one region; erasing a line with the same space on both sides cuts the drawing. A tree has one line fewer than dots, so erasing down to one takes one erasure per region and dots − lines + regions = 1 throughout: V − E + F = 2 on the solid.',
    rules: [...RING_RULES.base(['T', 'S', 'P']), 'A ring read from another corner, or the other way round, is the same ring.'], sourceIds: sources}],
  sources: [
    {id: 'corners-week56', title: 'Bellingham Math Circle — Week 56: Corners of a solid (student packet, materials and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-56', kind: 'local curriculum'},
    {id: 'corners-card56', title: 'Week 56 review card and its second run (App fit and Decision: a corner builder with a checked That’s all and the angle total as the “can’t” certificate, and erasing to a tree on the graph board)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-56.md', kind: 'local curriculum'},
    {id: 'corners-banchoff', title: 'Thomas F. Banchoff — Beyond the Third Dimension, Chapter 5 section 2: triangles, squares and pentagons round a corner, and why a full flat turn makes no convex corner (as cited by the Week 56 packet)', url: 'https://www.math.brown.edu/tbanchof/Beyond3d/chapter5/section02.html', kind: 'book'},
    {id: 'corners-neale', title: 'Vicky Neale — Euler’s Formula (NRICH, February 2011): the theorem for connected plane drawings and its edge-removal proof (as cited by the Week 56 packet)', url: 'https://nrich.maths.org/articles/eulers-formula', kind: 'article'}
  ],
  puzzles: [playground, ...rings, ...trees]
};
await writeFile(new URL('../dist/families/corners/corners.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log([...rings.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.mode === 'every' ? `${p.solution.rings.length} rings: ${p.solution.rings.join(' ')}` : p.solution.fills.length ? `fills ${p.solution.fills.join(' ')}` : `can't: ${p.solution.certificate.join('')} ${p.solution.total}° ${p.solution.fold}`}`), ...trees.map(p => `${p.id} ${p.solution.dots} dots, ${p.solution.lines} lines, ${p.solution.regions} regions; route ${p.solution.route.join(' ')}`)].join('\n'));
