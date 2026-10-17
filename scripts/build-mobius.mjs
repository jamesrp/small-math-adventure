// Authoring list for Seams (worksheet Week 38, seams and cuts). Builds each
// puzzle's band, computes its answers with the mechanic's own model (closed
// edges and pieces as cycles of the seam maps; breadth-first searches over
// seams, cuts and holes), checks them against the table in
// docs/mobius/README.md, and writes dist/families/mobius/mobius.json.
// Run: node scripts/build-mobius.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {mobiusMechanics, topology, shapeFrom, dotsPossible, marksOk, reachable, pathFrom, topologyOf, groupSizes} from '../dist/families/mobius/mobius.js';

const M = mobiusMechanics.mobius;
const one = (n, extra) => ({strips: 1, len: 2, n, layout: [[0, 0]], ...extra});
const ROW3 = [[0, 2], [3, 2], [0, 0]], ROW4 = [[0, 2], [3, 2], [0, 0], [3, 0]];
const strips = (K, extra) => ({strips: K, len: 2, n: 2, layout: (K === 3 ? ROW3 : ROW4), ...extra});
const dots = (n, seam, cuts, rings) => ({mode: 'dots', ...one(n), seams: [seam], cuts, rings});
const mark = (kind, k, top, x) => ({kind, k, top, x});

const RULES = {
  band: 'A band is a strip whose ends are joined. Each strip’s left end has • at the top and □ at the bottom. Join • to • and □ to □: at an M seam the right end has them the same way up, at an R seam swapped, so the strip is joined after a half-turn.',
  edge: 'A closed edge is an edge you can follow round, through the seams, until you are back where you started.',
  dots: 'Four dots go on the edges. Dots in one ring must be on one closed edge, and dots in different rings on different closed edges. Other closed edges may have no dots.',
  cant: 'If it can’t be done, press Can’t once four dots are down, tap each closed edge once, and press That’s all.',
  cantOne: 'If it can’t be done, put dots on both the top and the bottom edge, four in all, and press Can’t.',
  cut: 'A cut runs along the band all the way round, through the seams, until it closes.',
  circle: 'In a circle of strips, each strip’s right end is joined to the next strip’s left end, and the last strip’s right end to the first strip’s left end.',
  marks: 'The two stars must be on one closed edge, and the two diamonds on another.',
  pieces: 'Make pieces like the cards: each ring on a card is one closed edge of that piece.',
  holes: 'A hole takes out paper inside the band.',
  notch: 'A hole takes out paper inside the band; a notch takes a bite out of an edge.',
  lock: 'While the band is cut, its seam stays as it is.'
};
const DEFINE = 'A band is a strip with its ends joined: M joins • to • and □ to □ straight across, R joins them after a half-turn. A closed edge is an edge you can follow round until you are back where you started.';
const CONTROLS = {
  dots: `${DEFINE} Tap an edge to put a dot there: it lights its closed edge, and dots on one closed edge share a colour. Tap a dot to take it off. Can’t opens once four dots are down: then tap each closed edge once and press That’s all. Tab and Enter work too. Undo takes back a dot.`,
  dotsOne: `${DEFINE} Tap an edge to put a dot there: it lights its closed edge, and dots on one closed edge share a colour. Tap a dot to take it off. Can’t opens once four dots are down, on both the top and the bottom edge. Tab and Enter work too. Undo takes back a dot.`,
  seams: 'A circle of strips is joined end to end: each seam joins • to • and □ to □, straight across at M and after a half-turn at R. A closed edge is an edge you can follow round until you are back where you started. Tap a seam’s letter to change it; a padlock means it stays. Tap an edge to light its closed edge, and again to turn it off. The arrow button carries an arrow once round. Tab and Enter work too. Undo takes back a change.',
  playground: 'A band is a strip with its ends joined: M straight across, R after a half-turn. Choose one strip or a circle of three or four. Tap a seam’s letter to change it, a dashed line or ✂ to cut all the way round, a dashed ring to punch it out, and an edge to light its closed edge. The arrow button carries an arrow once round.'
};
const PREREQ = {
  dots: 'Follow an edge with a finger and group four dots by colour. No reading or counting past four; a grown-up can read How to play.',
  cutdots: 'Puzzles 1 and 2 first: follow an edge through the seam. Notice that a cut makes new edges on both of its sides.',
  seams: 'Puzzles 1 and 2 first. Change one seam at a time and watch which dots light together; keep track of three or four seams.',
  pieces: 'Puzzles 1 to 4 first. Cut and tape back, and compare pieces with cards by counting closed edges up to four.',
  holes: 'Count closed edges up to four, and add one for each hole.'
};
// A pieces puzzle's controls and objective name lines and holes only when it has them.
const and = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0];
function piecesControls(q) {
  const notch = q.spots.some(sp => sp.y === 0 || sp.y === q.n);
  return [DEFINE, q.lines.length ? 'Tap the seam’s letter to change it, but not while the band is cut.' : 'Tap the seam’s letter to change it.',
    ...(q.lines.length ? ['Tap a dashed line or its ✂ to cut along it all the way round, and the ✂ again to tape it back.'] : []),
    ...(q.spots.length ? [notch ? 'Tap a dashed ring to punch a hole, or the dashed half ring on the edge to cut the notch, and again to fill it.' : 'Tap a dashed ring to punch a hole, and again to fill it.'] : []),
    'Tap an edge to light its closed edge. Tab and Enter work too. Undo takes back a change.'].join(' ');
}
const piecesObjective = q => `${and(['Choose the seam', ...(q.lines.length ? ['cut along lines'] : []), ...(q.spots.length ? ['punch holes'] : [])])} to make pieces like the cards: one piece for each card, with one closed edge for each ring on it.`;
const OBJ = {
  dots: () => ['Put four dots on the edges so that they group like the rings: dots in one ring on one closed edge, different rings on different closed edges, or show that it can’t be done.', 'Put four dots on the edges to match the rings.'],
  seams: () => ['Change seams so that the marks group like the rings: the two stars on one closed edge and the two diamonds on another.', 'Change seams so the marks group like the rings.'],
  pieces: q => [piecesObjective(q), 'Make pieces like these.']
};
const sources = ['mobius-week38', 'mobius-bonus38', 'mobius-card38', 'mobius-hatcher', 'mobius-nrich'];

// The table in docs/mobius/README.md. Dots: the closed edges and whether the
// picture can be made. Seams and pieces: the solving boards among every
// board the child can reach, and the fewest moves from the start.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Rings on A', q: dots(4, 'M', [], [2, 2]), check: {circles: 2, possible: true}, kind: 'dots',
    idea: 'A strip joined M has two closed edges, the top and the bottom: each holds one ring.',
    hints: ['Put a dot on the top edge and watch what lights up.', 'The top edge and the bottom edge light separately. Each ring can have its own edge.', 'Put two dots on the top edge and two on the bottom edge.'],
    parent: {notice: 'Whether your child places a dot and watches the whole top edge light, and then tries the bottom edge for the second ring.', prompt: 'Can you follow the top edge with your finger all the way round without crossing to the bottom?', explanation: 'At an M seam the top of the right end meets the top of the left end, so the top edge closes up on itself, and so does the bottom: band A is an annulus with two closed edges. A ring picture can be made exactly when it has no more rings than the band has closed edges, so 2 + 2 works with one ring on each edge.', extension: 'Which of the five ring pictures (4, 3 + 1, 2 + 2, 2 + 1 + 1, 1 + 1 + 1 + 1) work on A? (4, 3 + 1 and 2 + 2.)', connection: 'An annulus has two boundary circles. The dots group by boundary component, the first invariant a topologist reads off a surface with edges.'},
    provenance: 'Week 38 K–1 and grades 2–3 Problem 3 (place four edge dots to match each ring picture on A), the 2 + 2 picture; K–1 Problem 2 (two dots on one closed edge, or on different ones).'},
  {number: 2, level: 'easy', title: 'Rings on B', q: dots(4, 'R', [], [2, 2]), check: {circles: 1, possible: false}, kind: 'dots',
    idea: 'A strip joined after a half-turn has one closed edge: following the top edge through the R seam leads onto the bottom edge.',
    hints: ['Put a dot on the top edge and watch what lights up.', 'The light goes through the seam and comes back along the bottom edge, so B has only one closed edge.', 'Put two dots on the top edge and two on the bottom edge, then press Can’t.'],
    parent: {notice: 'The moment the top edge lights the bottom one too. Your child may try every place on the band before believing it.', prompt: 'Where does your finger come out after the seam if it starts on the top edge?', explanation: 'At an R seam the top of the right end meets the bottom of the left end, so a trip along the top edge carries on along the bottom edge and only closes after two laps: band B, a Möbius band, has one closed edge. Two rings need two closed edges, so 2 + 2 can’t be made. With one closed edge there is nothing to choose in a tap, so Can’t needs no taps here; it opens once dots are on both the top and the bottom edge, where your child has seen them light as one, and the app then draws the edge and crosses out the second ring.', extension: 'Which ring pictures work on B? (Only 4.)', connection: 'The Möbius band has one boundary circle, which wraps twice round the band’s core circle (Hatcher, Algebraic Topology, Chapter 0).'},
    provenance: 'Week 38 K–1 and grades 2–3 Problem 3 on B (the 2 + 2 picture is impossible) and K–1 Problem 2 on B (no two dots can be on different closed edges).'},
  {number: 3, level: 'easy', title: 'Cut A', q: dots(4, 'M', [2], [1, 1, 1, 1]), check: {circles: 4, possible: true}, kind: 'cutdots',
    idea: 'A cut down the middle of A gives two thinner bands, each with a top and a bottom edge: four closed edges.',
    hints: ['A cut has two sides. Is each side an edge?', 'Light the edge just under the cut and the edge just over it. Do they light together?', 'Put one dot on the top edge, one on the bottom edge, one just under the cut and one just over it.'],
    parent: {notice: 'Whether your child counts the two sides of the cut as two different edges.', prompt: 'If you ran your finger along the cut, which piece would you be touching?', explanation: 'Cutting A along its middle line leaves two annuli, the upper and lower halves, since the M seam takes each half to itself. Each has two closed edges, so four in all: one for each ring of 1 + 1 + 1 + 1.', extension: 'Can you put two dots on the same piece but on different closed edges? (Yes: the top edge and the edge just over the cut.)', connection: 'The cut adds two boundary circles; pieces and boundary components are different counts (grades 2–3 Problem 5).'},
    provenance: 'Week 38 K–1 and grades 2–3 Problem 6 (which four-dot pictures can be made with the cut pieces of A), the 1 + 1 + 1 + 1 picture.'},
  {number: 4, level: 'medium', title: 'Cut B', q: dots(4, 'R', [2], [2, 2]), check: {circles: 2, possible: true}, kind: 'cutdots',
    idea: 'B cut down the middle stays in one piece, with two closed edges: the old edge and the cut.',
    hints: ['Light the top edge. What lights with it?', 'The cut’s two sides light together, and the top and bottom edges light together.', 'Put two dots on the top edge and two just under the cut.'],
    parent: {notice: 'Surprise that the cut band is one piece with two edges. On paper the cut band is a longer loop.', prompt: 'Which bits of edge light up together when you tap just over the cut?', explanation: 'The R seam swaps the upper and lower halves of the strip, so after the middle cut they join into one piece that goes round twice. The old edge (top and bottom) is one closed edge and the two sides of the cut are another: two, enough for 2 + 2.', extension: 'Which ring pictures work on cut B? (4, 3 + 1 and 2 + 2.)', connection: 'The seam acts on the halves U and L by swapping them, and the pieces are the cycles of that action: one cycle, one piece (grades 4–5 Problem 5).'},
    provenance: 'Week 38 K–1 and grades 2–3 Problem 6 on cut B, the 2 + 2 picture; grades 2–3 and 4–5 Problem 5 (the U and L halves explain the pieces).'},
  {number: 5, level: 'medium', title: 'Cut B again', q: dots(4, 'R', [2], [2, 1, 1]), check: {circles: 2, possible: false}, kind: 'cutdots',
    idea: 'Cut B has two closed edges, so a picture with three rings can’t be made.',
    hints: ['Find every closed edge of the cut band.', 'There are just two closed edges: the old edge, and the cut’s two sides together. The picture has three rings.', 'Put four dots down, press Can’t, tap the old edge once and the cut once, then press That’s all.'],
    parent: {notice: 'Whether your child taps each closed edge once, not each line: the top and bottom are one closed edge here, and so are the two sides of the cut.', prompt: 'How many different colours can four dots make on this band?', explanation: 'Cut B has two closed edges (puzzle 4), and each ring needs its own, so the three rings of 2 + 1 + 1 can’t all be placed. The certificate is one tap on each closed edge.', extension: 'Make 2 + 2 and 3 + 1 on the same band.', connection: 'A pigeonhole argument: four dots in at most two boundary circles fall into at most two groups.'},
    provenance: 'Week 38 K–1 and grades 2–3 Problem 6 on cut B, the 2 + 1 + 1 picture (impossible); grades 4–5 Problem 7.'},
  {number: 6, level: 'medium', title: 'Three strips', q: {mode: 'seams', ...strips(3), start: ['M', 'M', 'M'], fixed: [false, false, false], marks: [mark('star', 0, true, 2), mark('star', 1, false, 2), mark('diamond', 0, false, 1), mark('diamond', 2, true, 1)]}, check: {solutions: ['RMR'], of: 8, fewest: 2}, kind: 'seams',
    idea: 'At an R seam the top edge carries on as the bottom of the next strip. The dots decide each seam, and the last seam closes the circle with two edges.',
    hints: ['Light the edge under a star. Where does it go after each seam?', 'The star on strip 2 is on the bottom edge: the light from strip 1’s top must cross to the bottom at the first seam.', 'Change the seam after strip 1 to R and the seam after strip 3 to R.'],
    parent: {notice: 'Whether your child follows a light seam by seam, and fixes the seams one at a time rather than toggling at random.', prompt: 'If an edge starts on top of strip 1, is it on top or bottom of strip 2? Which seam decided?', explanation: 'An edge on top of strip 1 is on top of strip 2 after an M seam and on the bottom after an R seam. The stars (top of strip 1, bottom of strip 2) need the first seam R; the diamonds (bottom of strip 1, top of strip 3) need the first two seams to turn over once in all, so the second is M; and stars and diamonds must be on different closed edges, which needs an even number of R seams, so the third is R. RMR is the only answer of the eight.', extension: 'Bonus Problem 2: which seam choices of three strips give one closed edge? (An odd number of R seams.)', connection: 'The edge count depends only on the parity of the R seams, the orientation character of the loop round the band. Fixed marks on single edges pin the seams one by one, so the parity bit alone never decides the puzzle.'},
    provenance: 'Week 38 bonus Problem 2 (three strips joined in a circle with M and R seams; a rule for the number of closed edges), with fixed stars and diamonds that pin each seam: new.'},
  {number: 7, level: 'medium', title: 'Two lines', q: {mode: 'pieces', ...one(6), start: ['M'], fixed: [false], lines: [2, 4], spots: [], goal: [1, 2]}, check: {solves: 1, of: 6, fewest: 2}, kind: 'pieces',
    idea: 'A strip cut a third of the way across: with an R seam the middle lane stays a Möbius band (one edge) and the outer lanes join into a band with two edges.',
    hints: ['Try the seam both ways, and cut.', 'With an M seam every lane is its own band with two edges. With R, the top lane joins the bottom lane.', 'Change the seam to R, then cut the lower line.'],
    parent: {notice: 'Cut a paper strip first: the app tints each piece as soon as the band is cut, which gives away what the scissors would show. Then watch whether your child notices that cutting one line with an R seam also cuts the other: the cut comes back through the seam at the other height.', prompt: 'Light the edges of the middle piece. How many closed edges does it have?', explanation: 'With an R seam a cut one third of the way up comes back through the seam two thirds of the way up, so one cut divides the band into three lanes. The seam takes the middle lane to itself (turned over: a Möbius band, one edge) and swaps the top and bottom lanes (one piece, an annulus with two edges).', extension: 'With the seam M, how many pieces does cutting both lines make, and how many edges does each have? (Three bands, two edges each.)', connection: 'Bonus Problem 1’s lane cycles: the R seam reverses the lanes, so lanes k and n + 1 − k pair up, and a middle lane exists only for an odd number of lanes.'},
    provenance: 'Week 38 bonus Problem 1 (three lanes with M and R seams; a cut result with both a one-edge piece and a two-edge piece).'},
  {number: 8, level: 'medium', title: 'Holes', q: {mode: 'pieces', ...one(4), start: ['M'], fixed: [false], lines: [], spots: [{x: 2, y: 2, name: 'left hole'}, {x: 6, y: 2, name: 'right hole'}, {x: 4, y: 4, name: 'notch'}], goal: [4]}, check: {solves: 2, of: 16, fewest: 2}, kind: 'holes',
    idea: 'Each hole adds a closed edge and a notch adds none: A with both holes has four closed edges, but B with both holes has only three.',
    hints: ['Punch a hole and light its rim.', 'Each hole is a new closed edge; the notch only bends an edge you already have. A has two closed edges and B only one.', 'Keep the seam M, and punch the left hole and the right hole.'],
    parent: {notice: 'Whether your child expects the notch to make a new edge, and checks by lighting the edge it bites into; and whether they try B and find it falls one short.', prompt: 'If you ran your finger round the notch, would you come back to where you started without leaving the old edge?', explanation: 'A small hole inside the band adds its rim as a new closed edge and leaves the band in one piece; a notch only detours an existing edge. So the closed edges are the seam’s (two for M, one for R) plus the holes. With two places for holes, A reaches four but B at most three, so the seam must be M, with both holes punched; the notch may be cut or not. Two of the sixteen boards work.', extension: 'Make a band with exactly three closed edges in two different ways.', connection: 'Removing a disc from the interior of a surface adds one boundary component and lowers the Euler characteristic by one; a notch at the boundary changes neither.'},
    provenance: 'Week 38 bonus Problem 3 (bands with holes and notches; design a connected band with four closed edges), with two places for holes so that only A can do it. The bonus’s hole across the seam is left out.'},
  {number: 9, level: 'hard', title: 'B in thirds', q: dots(6, 'R', [2, 4], [1, 1, 1, 1]), check: {circles: 3, possible: false}, kind: 'cutdots',
    idea: 'B cut a third of the way across makes a Möbius band and an annulus: three closed edges, one too few for four rings.',
    hints: ['Light each edge of the cut band in turn.', 'The middle piece’s edge is the inner sides of both cuts. The outer piece has the old edge and the outer sides of both cuts. That makes three closed edges, and the picture has four rings.', 'Put four dots down, press Can’t, tap one edge of each colour, then press That’s all.'],
    parent: {notice: 'Whether your child sees that the edge under the lower cut and the edge over the upper cut light together.', prompt: 'Which two sides of the cuts light up together?', explanation: 'With the R seam the two cut lines are one cut that goes round twice. The middle lane is a Möbius band whose edge is the two inner sides of the cut; the outer lanes join into an annulus whose edges are the old edge and the two outer sides. Three closed edges can’t hold four rings.', extension: 'Which pictures can be made? (All but 1 + 1 + 1 + 1.)', connection: 'The card’s proposed K–1 and grades 2–3 Problem 7: cutting B one third of the way across gives a Möbius band linked with an annulus.'},
    provenance: 'Week 38 review card, fix 3 (an adult cuts B one third of the way across; which four-dot pictures can be made), the 1 + 1 + 1 + 1 picture; bonus Problem 1’s three-lane R band.'},
  {number: 10, level: 'hard', title: 'Four strips', q: {mode: 'seams', ...strips(4), start: ['R', 'R', 'R', 'R'], fixed: [false, false, true, false], marks: [mark('star', 0, true, 2), mark('star', 2, false, 2), mark('diamond', 1, false, 1), mark('diamond', 3, false, 1)]}, check: {solutions: ['MRRM'], of: 8, fewest: 2}, kind: 'seams',
    idea: 'With one seam fixed, the dots decide the other three: follow an edge seam by seam, then close the circle with an even number of R seams.',
    hints: ['Light the edge under each mark and see which marks share it.', 'If the first seam were R, the top of strip 1 would carry on along the bottom of strip 2, onto a diamond. So the first seam is M.', 'Change the seam after strip 1 to M and the seam after strip 4 to M.'],
    parent: {notice: 'Whether your child plans from the fixed seam, or follows one light all the way round before changing anything.', prompt: 'Is strip 3’s bottom edge on the same closed edge as strip 1’s top? Which seams decide that?', explanation: 'From the top of strip 1 an edge is on the bottom of strip k exactly when an odd number of the seams before strip k are R. The stars (top of strip 1, bottom of strip 3) need seams 1 and 2 to turn over once in all; the diamonds (bottom of strips 2 and 4) must not share the stars’ edge, so seam 1 is M, seam 2 is R, and with the fixed seam 3 (R) the edge is on the bottom of strip 4 too; stars and diamonds need two closed edges, so the number of R seams is even and seam 4 is M.', extension: 'Bonus Problem 2: design a four-strip circle with one closed edge, and another with two.', connection: 'The edge count is the parity of the R seams, but which edges join depends on the partial sums: the dots pin the first three, and the parity pins the last.'},
    provenance: 'Week 38 bonus Problem 2 (four-strip circles with one closed edge or two), with one seam fixed and fixed stars and diamonds: new.'},
  {number: 11, level: 'hard', title: 'Three lines', q: {mode: 'pieces', ...one(4), start: ['M'], fixed: [false], lines: [1, 2, 3], spots: [], goal: [1, 2]}, check: {solves: 1, of: 12, fewest: 2}, kind: 'pieces',
    idea: 'On an R band the middle cut gives one piece with two edges, but a cut a quarter of the way across leaves a Möbius band in the middle.',
    hints: ['Try cutting different lines, with each seam.', 'With the seam R, the middle line is a cut by itself, and the lowest and top lines are one cut that goes round twice.', 'Change the seam to R, then cut the lowest line.'],
    parent: {notice: 'Cut paper strips first: the app tints each piece as soon as the band is cut, which gives away what the scissors would show. Then watch whether your child compares the middle cut with the off-centre cut, and lights the middle piece’s edge.', prompt: 'After cutting the middle line, how many pieces are there? After cutting the lowest line?', explanation: 'On B the middle cut gives one piece with two edges (puzzle 4). The lowest line comes back through the R seam as the top line, so cutting it leaves three lanes: the middle two lanes form a Möbius band (one edge) and the outer lanes an annulus (two edges). Cutting the middle line as well would split that Möbius band into an annulus.', extension: 'With four lanes and an R seam, cut every line: what pieces do you get? (Two annuli, as bonus Problem 1’s 4R.)', connection: 'Bonus Problem 1’s four-lane R band: lanes 1 and 4 pair up, and lanes 2 and 3; cutting only some lines merges lanes first.'},
    provenance: 'Week 38 bonus Problem 1 (four lanes, M and R seams) and grades 2–3 and 4–5 Problems 4–5 (the middle cut of B), combined: new.'},
  {number: 12, level: 'hard', title: 'Cut and punch', q: {mode: 'pieces', ...one(6), start: ['M'], fixed: [false], lines: [2, 4], spots: [{x: 2, y: 5, name: 'hole in the top lane'}, {x: 6, y: 3, name: 'hole in the middle lane'}, {x: 10, y: 1, name: 'hole in the bottom lane'}], goal: [1, 3]}, check: {solves: 2, of: 48, fewest: 3}, kind: 'pieces',
    idea: 'A piece with one edge must be a Möbius band; the hole goes in the piece beside it, which already has two edges.',
    hints: ['Which piece can have just one closed edge?', 'Only a Möbius band has one closed edge, so the seam must be R and the band cut; the outer piece then needs one more closed edge.', 'Change the seam to R, cut the lower line, then punch the hole in the top lane.'],
    parent: {notice: 'Cut a paper strip first: the app tints each piece as soon as the band is cut, which gives away what the scissors would show. Then watch whether your child works backwards from the one-edge card.', prompt: 'Which piece does the top lane belong to after the cut?', explanation: 'Every piece of an M band has at least two edges, so the one-edge piece is the Möbius band in the middle of an R band cut a third of the way across. The outer piece is an annulus with two edges, and a hole in the top or bottom lane (both in that piece) makes three.', extension: 'Make pieces with two and two closed edges in two different ways.', connection: 'Pieces are cycles of the lanes, and holes add boundary components to the piece they are in: the two counts combine independently.'},
    provenance: 'Week 38 bonus Problems 1 and 3 combined (lane cuts and holes): new.'}
];

const id = n => `mobius-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  const q = item.q, p = {id: id(item.number), parameters: q}, fresh = M.fresh(p);
  assert.ok(M.valid(p, fresh), `${p.id}: fresh board is valid`);
  assert.ok(!M.solved(p, fresh), `${p.id}: starts unsolved`);
  let solution, rules, controls;
  if (q.mode === 'dots') {
    const sh = shapeFrom(q), topo = topology(sh, q.seams, q.cuts);
    assert.equal(topo.circles.length, item.check.circles, `${p.id}: closed edges`);
    assert.equal(dotsPossible(q, topo), item.check.possible, `${p.id}: possible`);
    for (const h of q.cuts) assert.ok(q.seams[0] === 'M' || q.cuts.includes(q.n - h), `${p.id}: a cut on B runs on round`);
    // Play the hints from a fresh board: they place dots and, when the
    // picture can't be made, claim with one tap on each closed edge (with
    // Can't alone on a band with one closed edge).
    let b = fresh, steps = 0;
    while (!M.solved(p, b)) { const h = M.hint(p, b); b = M.move(p, b, h.action); assert.ok(b && ++steps < 20, `${p.id}: hints solve`); }
    solution = item.check.possible
      ? {possible: true, closedEdges: topo.circles.length, dots: b.dots, groups: groupSizes(topo, b.dots)}
      : {cant: true, certificate: topo.circles.length === 1 ? 'Can’t after dots on both edge lines' : 'one tap on each closed edge', closedEdges: topo.circles.length, rings: q.rings.length, dots: b.dots, taps: b.claimed};
    const bare = topo.circles.length === 1 && !item.check.possible;
    if (bare) assert.deepEqual(b.claimed, [], `${p.id}: Can't alone`);
    rules = [RULES.band, RULES.edge, ...(q.cuts.length ? [RULES.cut] : []), RULES.dots, bare ? RULES.cantOne : RULES.cant];
    controls = bare ? CONTROLS.dotsOne : CONTROLS.dots;
  } else {
    const all = reachable(p), solves = all.filter(b => M.solved(p, b)), path = pathFrom(p, fresh);
    if (q.mode === 'seams') {
      assert.deepEqual(solves.map(b => b.seams.join('')), item.check.solutions, `${p.id}: the only seams`);
      assert.equal(all.length, item.check.of, `${p.id}: seam choices`);
      rules = [RULES.band, RULES.edge, RULES.circle, RULES.marks];
      controls = CONTROLS.seams;
      solution = {seams: solves[0].seams, of: all.length, fewest: path.length};
    } else {
      assert.equal(solves.length, item.check.solves, `${p.id}: solving boards`);
      assert.equal(all.length, item.check.of, `${p.id}: boards`);
      for (const sp of q.spots) assert.ok(!q.lines.includes(sp.y), `${p.id}: no spot on a line`);
      const notch = q.spots.some(sp => sp.y === 0 || sp.y === q.n);
      rules = [RULES.band, RULES.edge, ...(q.lines.length ? [RULES.cut, RULES.lock] : []), RULES.pieces, ...(q.spots.length ? [notch ? RULES.notch : RULES.holes] : [])];
      controls = piecesControls(q);
      solution = {boards: solves, of: all.length, fewest: path.length, edges: q.goal};
    }
    assert.equal(path.length, item.check.fewest, `${p.id}: fewest moves`);
  }
  const [objective, visible] = OBJ[q.mode](q);
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Seams', mechanic: 'mobius', band: 'all', revision: 1, sourceDocument: 'docs/mobius/README.md',
    parameters: q, objective, visibleObjective: visible, instruction: objective, controls, rules,
    idea: item.idea, prerequisites: PREREQ[item.kind], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.ok(out.length >= 8 && out.length <= 12);
for (const level of ['easy', 'medium', 'hard']) assert.ok(out.some(p => p.difficulty_level === level), level);

const playground = {
  id: 'mobius-playground', number: 0, title: 'Seams playground', difficulty_level: 'playground', familyTitle: 'Seams', mechanic: 'mobius', band: 'playground', revision: 1, sourceDocument: 'docs/mobius/README.md',
  parameters: {mode: 'playground', shapes: {
    one: {name: 'One strip', ...one(6), start: ['M'], fixed: [false], lines: [2, 4], spots: [{x: 2, y: 5, name: 'hole in the top lane'}, {x: 6, y: 3, name: 'hole in the middle lane'}, {x: 10, y: 1, name: 'hole in the bottom lane'}, {x: 8, y: 6, name: 'notch'}]},
    three: {name: 'Three strips', ...strips(3), start: ['M', 'M', 'M'], fixed: [false, false, false]},
    four: {name: 'Four strips', ...strips(4), start: ['M', 'M', 'M', 'M'], fixed: [false, false, false, false]}
  }},
  objective: 'Join strips with M and R seams, cut them along their lines, punch holes, and light the closed edges.', visibleObjective: '',
  instruction: 'Join strips with M and R seams, cut them along their lines, punch holes, and light the closed edges.',
  controls: CONTROLS.playground,
  rules: [RULES.band, RULES.edge, RULES.circle, RULES.cut, RULES.notch, RULES.lock],
  idea: 'Free play with seams, cuts and holes: the closed edges and pieces follow from the seams alone.',
  prerequisites: 'None. A grown-up or a partner can suggest a seam to change or a line to cut.',
  hints: ['Light an edge of one strip with an M seam, then change the seam to R.', 'In three strips, change one seam at a time and light an edge each time.', 'Cut one strip along a line with each seam, and light every edge.'],
  parent: {notice: 'Whether your child predicts what lights before tapping, and compares the same cut with each seam.', prompt: 'With three strips, which seams can you change without changing how many closed edges there are? (Any two at once.)', explanation: 'The band has two closed edges when an even number of seams are R and one when it is odd; the arrow comes back flipped exactly when it is odd. Cutting along lines splits the band into pieces that are the cycles of the lanes under the seams; holes add closed edges and notches don’t.', extension: 'Find a way to cut one strip into three pieces, and one into two pieces where one has a single edge.', connection: 'Each strip circle is an annulus or a Möbius band according to the orientation character of its loop: the parity of the R seams.', sourceIds: sources},
  provenance: 'Week 38 base packets Problems 1 and 4 (tracing edges, cutting), grades 4–5 Problem 6 (the carried arrow) and bonus Problems 1–3 (lanes, circles of strips, holes and notches).'
};
assert.ok(M.valid(playground, M.fresh(playground)));

const json = {
  title: 'Seams',
  version: 1,
  families: [{id: 'mobius', title: 'Seams', mathematics: 'A strip whose ends are joined matching (M) is an annulus with two closed edges; joined after a half-turn (R), a Möbius band with one. In a circle of strips an edge comes back to itself after one lap exactly when the number of R seams is even, so the band has two closed edges for an even number and one for an odd number, and a carried arrow comes back flipped exactly when the number is odd. A cut along the band runs through the seams until it closes; the seam maps lanes to lanes (turned over at R), and the pieces are the cycles of that map, so a middle cut leaves A in two annuli and B in one annulus with two edges, and a cut a third of the way across B gives a Möbius band beside an annulus. A small hole adds a closed edge to its piece, a notch none. Four dots can group like a ring picture exactly when the picture has no more rings than the band has closed edges.', rules: [RULES.band, RULES.edge], sourceIds: sources}],
  sources: [
    {id: 'mobius-week38', title: 'Bellingham Math Circle — Week 38: Seams and cuts (student packets K–1, grades 2–3 and grades 4–5, F38-K-v3, F38-23-v3, F38-45-v3, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-38', kind: 'local curriculum'},
    {id: 'mobius-bonus38', title: 'Bellingham Math Circle — Week 38 bonus: Seams and cuts (W38-BONUS-v1), Problems 1–3 (lanes, circles of strips, holes and notches), and its adult guide', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/lowell-math-circle-year-2/week-38/week-38-bonus.pdf', kind: 'local curriculum'},
    {id: 'mobius-card38', title: 'Week 38 review card (App fit and Decision: a reversing seam on the portal board; dots and Can’t; seam choices; seam, lane and hole targets)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-38.md', kind: 'local curriculum'},
    {id: 'mobius-hatcher', title: 'Allen Hatcher — Algebraic Topology, Chapter 0 (the Möbius band and its core circle), as the Week 38 adult guide cites', url: 'https://pi.math.cornell.edu/~hatcher/AT/ATpage.html', kind: 'research'},
    {id: 'mobius-nrich', title: 'NRICH — Bands and Bridges: Bringing Topology Back (2011), the strip-and-band activity the Week 38 adult guide cites', url: 'https://nrich.maths.org/articles/bands-and-bridges-bringing-topology-back', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/mobius/mobius.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode.padEnd(7)} ${JSON.stringify(p.solution).slice(0, 150)}`).join('\n'));
