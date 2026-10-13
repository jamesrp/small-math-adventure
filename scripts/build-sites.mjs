// Authoring list for Nearest dots (worksheet Week 15, nearest-site regions).
// Puzzles are written in grid squares and stored in half-steps. For each one
// this computes, with the mechanic's own exact geometry, the answer it
// claims: the one set of dots that makes a target region, every single dot
// that touches or ties or takes, the fewest dots that close a region in the
// frame (searched over every placement of fewer), or the segment that proves
// Can't, checks them against the table in docs/sites/README.md and writes
// dist/families/sites/sites.json. Run: node scripts/build-sites.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as G from '../dist/families/sites/plane.js';
import {goal, makeAnswer, singleAnswers, certificates, own, sortDots} from '../dist/families/sites/sites.js';

const H = ([x, y]) => [2 * x, 2 * y];
const FRAME = 6, VIEW = 7;
// A half-plane a·x + b·y ≤ c in grid squares, stored in half-steps.
const half = (a, b, c) => ({a, b, c: 2 * c});
const TRI = {sites: [[-2, 0], [2, 0], [0, 2]], names: ['A', 'B', 'C']};

const RULES = [
  'Every place belongs to the dot nearest to it, measured straight to the middle of each dot. A place just as near to two or more dots belongs to all of them.',
  'A dot’s region is all of its places. The map goes on past the frame.',
  'New dots go where grid lines cross, inside the frame. The regions stay hidden until you press Check.'
];
const MORE = {
  make: 'A’s region must be exactly the shaded part everywhere, not just inside the frame.',
  touch: 'Two regions touch when they share a place, even a single point.',
  four: 'Where three or more regions meet, a small ring marks the place they share.',
  take: 'If it can’t be done, press Can’t after a Check and tap two places that show why.',
  part: 'Two regions touch when they share a place, even a single point.',
  fit: 'When the region fits, press Fewest if no fewer dots could do it. If fewer can, it says so.'
};
const CONTROLS = 'A dot’s region contains every place nearest to it, measured in a straight line. Equally near places belong to every tied dot; regions continue past the frame. Tap where grid lines cross to put a dot there. Drag a dot to move it, or tap it to take it away. Press Check to see every region. With a keyboard, the arrow keys move a ring, Enter or Space puts down, picks up or drops a dot, and Delete takes one away. Undo takes back the last change.';
const MORE_CONTROLS = {take: ' After a Check, press Can’t, then tap two places.', fit: ' Press Fewest once the region fits.'};

const PUZZLES = [
  {number: 1, level: 'easy', title: 'One new dot', mode: 'make', sites: [[-2, 0]], names: ['A'], target: [half(1, 0, -1)], budget: 1,
    visible: 'Make A’s region exactly the shaded part.',
    check: {answer: [[0, 0]]}, prereq: 'Compare distances by eye. No reading; a grown-up can read the goal.',
    idea: 'The edge between two dots is halfway between them.',
    hints: ['Try a dot anywhere, then press Check. Where does A’s region stop?', 'A’s region stops halfway between A and the new dot.', 'Put the dot 2 squares right of A.'],
    parent: {notice: 'Whether your child first puts the dot right on the edge of the shaded part. Check then shows the edge halfway between A and that dot, too far left.', prompt: 'Where does A’s region stop, compared with A and the new dot?', explanation: 'A place belongs to A when it is at least as near to A as to the new dot. The places just as near to both are the perpendicular bisector: the line halfway between them, at right angles to the segment joining them. For A’s region to stop at the shaded edge, one square right of A, the new dot must be one more square past it: 2 squares right of A, at the middle of the board.', extension: 'Where would the dot go to give A everything left of the middle of the board? (4 squares right of A, so that halfway is the middle.)', connection: 'Two sites split the plane along their perpendicular bisector: the simplest Voronoi diagram.'},
    provenance: 'New, a one-dot warm-up for Week 15 K–1 Problem 8 and grades 2–3 Problem 8: the edge is halfway between A and the dot.'},
  {number: 2, level: 'easy', title: 'Apart', mode: 'part', sites: [[-2, 0], [2, 0]], names: ['A', 'B'], apart: [0, 1], budget: 1,
    visible: 'Make A’s region and B’s region stop touching.',
    check: {count: 7, answers: [[-1.5, 0], [-1, 0], [-0.5, 0], [0, 0], [0.5, 0], [1, 0], [1.5, 0]]}, prereq: 'Compare distances by eye. No reading; a grown-up can read the goal.',
    idea: 'Two regions stop touching only when a new dot is nearer than both of their dots to every place they shared.',
    hints: ['Try a dot and press Check. Do A’s and B’s regions still share a place?', 'A and B share the line halfway between them. The new dot must be nearer than A and B to every place on that line, even far up and far down.', 'Put the dot on the straight line from A to B, between them.'],
    parent: {notice: 'Whether your child first puts the dot on the halfway line between A and B, above or below the middle. Check then shows that it takes only part of that line: far down (or far up) A and B still meet.', prompt: 'Is the new dot nearer than A to the places far up the halfway line? And far down?', explanation: 'A and B share the line halfway between them, running straight up and down through the middle. A new dot takes a place on that line only where it is nearer than A and B. Far up the line, a dot below the middle is farther away than A and B; far down, a dot above the middle is; and a dot level with A and B but outside them is always farther than the nearer of the two. Only a dot strictly between A and B, on the straight line joining them, is nearer than both to every place on the halfway line. So with one dot it can only be done there: at the 7 grid points between A and B.', extension: 'Can two dots, neither of them between A and B, keep A and B apart? (Yes: 1 square above and 1 square below the middle.)', connection: 'Two sites are Voronoi neighbours exactly when some circle through both has no other site inside it (the empty-circle test for Delaunay edges). Every circle through A and B has a third site inside it only when that site lies strictly between them on their segment.'},
    provenance: 'New, from the review card’s classroom evidence: the organizer’s home trial drew two dots, A and B, then added a third to compete with them (Week 15 K–1 Problems 2 and 7 and grades 2–3 Problem 2, where a third dot erases part of the line between two).'},
  {number: 3, level: 'easy', title: 'A strip', mode: 'make', sites: [[0, 0]], names: ['A'], target: [half(-1, 0, 1), half(1, 0, 1)], budget: 2,
    visible: 'Make A’s region exactly the shaded part.',
    check: {answer: [[-2, 0], [2, 0]]}, prereq: 'Compare distances by eye. No reading; a grown-up can read the goal.',
    idea: 'Each edge of a region comes from one other dot, as far past the edge as the region’s dot is before it.',
    hints: ['Each edge of the shaded part needs a dot of its own.', 'Each new dot sits as far past its edge as A is before it.', 'Put dots 2 squares left and 2 squares right of A.'],
    parent: {notice: 'Whether your child places one dot, checks, and uses where that edge landed to place the other.', prompt: 'Why can’t the dots go at the top and bottom of the strip?', explanation: 'The strip’s two edges are 1 square left and right of A. Each must be the line halfway between A and a new dot, so the dots are A’s mirror images across the edges: 2 squares left and 2 squares right of A. Dots anywhere else would make a different edge, so this is the only answer. A’s region is then the whole strip, running on past the frame at the top and bottom.', extension: 'Make a narrower strip in your head: where would the dots go for a strip half as wide? (1 square left and right of A.)', connection: 'The region of a dot between two others on a line is a strip between two parallel bisectors (Week 15 K–1 Problem 3).'},
    provenance: 'Week 15 K–1 Problem 8: A at the centre, the shaded strip −1 ≤ x ≤ 1, and two new dots B and C.'},
  {number: 4, level: 'easy', title: 'A corner', mode: 'make', sites: [[0, 0]], names: ['A'], target: [half(1, 0, 1), half(0, 1, 1)], budget: 4,
    visible: 'Make A’s region exactly the shaded part.',
    check: {answer: [[0, 2], [2, 0]]}, prereq: 'Compare distances by eye. No reading; a grown-up can read the goal.',
    idea: 'Only real edges need dots; the frame does not stop a region.',
    hints: ['Which edges of the shaded part are real edges, and which are only the frame?', 'Only the right edge and the top edge need dots.', 'Put dots 2 squares right of A and 2 squares above A.'],
    parent: {notice: 'Whether your child puts a dot by each of the four sides of the shaded part, using all four slots. The left and bottom sides are only the frame: A’s region goes on past them, and a dot out there cuts it off.', prompt: 'Which sides of the shaded part need a dot, and which don’t?', explanation: 'The shaded part has two real edges, 1 square right of A and 1 square above A; on the left and at the bottom it runs off past the frame. Each real edge is the halfway line between A and a new dot, so the dots go 2 squares right of A and 2 squares above A, and every answer has these two. A third or fourth dot works only where it changes nothing: not left of A or below it, and at least as far from the corner of the shaded part as A is. With just the two, their regions meet A’s at the corner, a place all three share, and split along the slanted line between them.', extension: 'Why doesn’t A get a closed square here? (Nothing is to its left or below it, so its region goes on forever that way.)', connection: 'A region bounded by two half-planes is a wedge; it is unbounded unless further sites close it.'},
    provenance: 'Week 15 grades 2–3 Problem 8: A at the centre and the corner region x ≤ 1, y ≤ 1.'},
  {number: 5, level: 'medium', title: 'A slanted edge', mode: 'make', sites: [[-1.5, -1]], names: ['A'], target: [half(3, 2, 0)], budget: 1,
    visible: 'Make A’s region exactly the shaded part.',
    check: {answer: [[1.5, 1]]}, prereq: 'Picture a mirror image across a slanted line. No reading; a grown-up can read the goal.',
    idea: 'A dot’s mirror image across a slanted line makes that line the edge.',
    hints: ['Try a dot and press Check. How does the edge sit against the line from A to your dot?', 'The edge crosses the line from A to the new dot at right angles, halfway: the dot is A’s mirror image across the edge.', 'Put the dot 3 squares right and 2 squares up from A.'],
    parent: {notice: 'Whether your child moves the dot straight across (right only) first. The edge then comes out upright, not slanted: the edge is always at right angles to the line between the two dots.', prompt: 'How must the line from A to the new dot sit against the slanted edge?', explanation: 'The edge between A and the new dot is their perpendicular bisector, so the segment from A to the dot crosses the edge at right angles, at its middle. The slanted edge passes through the centre of the board, and A is 1½ squares left and 1 square below it there; the mirror image is 1½ squares right and 1 square above the centre, 3 right and 2 up from A. It is the only answer.', extension: 'Fold a paper along the edge to check: does A land on the new dot?', connection: 'Week 15 K–1 Problem 2 and grades 4–5 Problem 1 draw this very line, 3x + 2y = 0, from the two dots; here it is the target.'},
    provenance: 'Week 15 K–1 Problem 2 and grades 4–5 Problem 1 (A at (−1.5, −1), B at (1.5, 1), boundary 3x + 2y = 0), asked backwards: A is given and the dividing line is the target.'},
  {number: 6, level: 'medium', title: 'A place for D', mode: 'four', ...TRI, dot: 'D', budget: 1, from: 2,
    visible: 'Make one place belong to four dots.',
    check: {answers: [[0, -2]]}, prereq: 'Compare distances by eye. A grown-up can read the goal.',
    idea: 'Four dots on one circle, with no dot inside it, all share its centre.',
    hints: ['Without D, A, B and C share one place. Put D in a corner and press Check to find it.', 'A, B and C meet at a place 2 squares from each of them. D must be just as far from it.', 'Put D 4 squares below C.'],
    parent: {notice: 'Whether your child uses a first Check to find where A, B and C meet, then places D by distance from that place.', prompt: 'How far is the place where A, B and C meet from each of them?', explanation: 'A, B and C are each 2 squares from the middle of the board, so the middle belongs to all three. D shares it when D is also 2 squares from it and no dot is nearer: D must be on the circle through A, B and C, centred in the middle. The only free grid point on that circle is 2 squares below the middle, opposite C. Then the middle belongs to A, B, C and D.', extension: 'Can five dots share one place? (Yes, if all five lie on one circle round it with no dot inside.)', connection: 'A place shared by k sites is the centre of an empty circle through them; four cocircular sites give a vertex of degree four, which algorithms often assume away (the guide’s note on Mount’s lecture).'},
    provenance: 'Week 15 grades 2–3 Problem 7’s failing placement, D at (0, −2), with the four-way meeting of K–1 Problem 5 and grades 2–3 Problem 4, on the dots of grades 2–3 Problem 2.'},
  {number: 7, level: 'medium', title: 'Two but not three', mode: 'touch', ...TRI, dot: 'D', budget: 1, touch: [0, 1], avoid: [2], from: 2, aim: [0, -2.5],
    visible: 'Make D’s region touch A’s and B’s, but not C’s.',
    check: {count: 56, includes: [[0, -2.5], [0, -3], [-2, -0.5]], excludes: [[0, -2], [0, -1]]}, prereq: 'Picture which regions lie next to a dot. A grown-up can read the goal.',
    idea: 'A region touches another when they share even one place; a four-way tie counts.',
    hints: ['Where would D’s region be? Which regions would be next to it?', 'If D is as far from the middle as A, B and C, all four share the middle. Go a little farther.', 'Put D 4½ squares below C.'],
    parent: {notice: 'A child who has just solved puzzle 6 may put D 4 squares below C. Then D’s region shares the middle with C’s at a single point, which counts as touching.', prompt: 'Do D’s region and C’s region share any place, even one point?', explanation: 'Regions touch when some place belongs to both. With D straight below the middle at distance 2, the middle is a four-way tie and D touches C there. Farther down, the middle belongs only to A, B and C, and D’s region shares a slanted edge with A’s and one with B’s and stays away from C’s. On the middle line, D works 2½ or 3 squares below the middle; across the frame, 56 grid points work, including some just below A or B.', extension: 'Can D’s region touch only C’s? (No: wherever D goes, its region borders at least two others.)', connection: 'Which regions share an edge is the Delaunay triangulation of the sites: a graph that this puzzle adds one vertex to.'},
    provenance: 'Week 15 grades 2–3 Problem 7: put D so its region shares places with A’s and B’s but none with C’s.'},
  {number: 8, level: 'medium', title: 'Take S', mode: 'take', sites: [[0, 2]], names: ['A'], keep: [['P', -2, 0], ['Q', 2, 0]], take: ['S', 0, -2], budget: 2, aim: [0, -2.5],
    visible: 'Take S from A, but keep P and Q with A.',
    check: {count: 17, includes: [[0, -2], [0, -2.5]]}, prereq: 'Compare a few distances. A grown-up can read the goal.',
    idea: 'A new dot takes the places near it but must not come nearer to P and Q than A is.',
    hints: ['Put a dot near S, then look at P and Q.', 'A dot right on S takes S, and P and Q tie between A and it, which still counts as A’s.', 'Put a dot half a square below S.'],
    parent: {notice: 'Whether your child puts a dot between S and the middle first; it takes P and Q too.', prompt: 'How near may the new dot come to P before P stops being A’s?', explanation: 'P is about 2.8 squares from A. A new dot takes P only if it comes nearer to P than that, and takes S if it is nearer to S than A is (4 squares). A dot half a square below S makes the edge with A a line a quarter square below the middle, so S is the new dot’s and P and Q are A’s. A dot right on S makes the edge pass through P and Q, which then tie and stay A’s. Seventeen grid points in the frame work for one dot.', extension: 'Can a dot above A take S? (No: S would still be nearer to A.)', connection: 'Puzzle 11 asks the same with R in the middle, where it can’t be done.'},
    provenance: 'Week 15 grades 4–5 Problem 8, the point S: A at (0, 2), P and Q at (∓2, 0), S at (0, −2).'},
  {number: 9, level: 'hard', title: 'Close A in', mode: 'fit', sites: [[0, 0]], names: ['A'], budget: 4,
    witnesses: [[[0, 2], [2, -1], [-2, -1]], [[0, -2], [2, 1], [-2, 1]], [[2, 0], [-1, 2], [-1, -2]], [[-2, 0], [1, 2], [1, -2]], [[0, 2], [2, -2], [-2, -2]]],
    visible: 'Fit A’s whole region in the frame, with the fewest dots.',
    check: {fewest: 3}, prereq: 'Count sides of a shape. A grown-up can read the goal.',
    idea: 'A closed region needs at least three sides, and each side needs its own dot.',
    hints: ['Close A’s region in first, with any number of dots.', 'Each side of A’s region comes from one new dot. How few sides can a closed shape have?', 'Three dots around A close it: 2 squares above A, and 2 right and 1 down, and 2 left and 1 down from A.'],
    parent: {notice: 'Whether your child starts with four dots in a square around A, and after “Fewer dots can.” takes one away and finds the region open on one side.', prompt: 'With two dots, which way does A’s region still run off?', explanation: 'Each side of A’s region is the halfway line between A and one other dot, so a region with k sides needs k dots. A closed region needs at least three sides: two lines leave a strip, a wedge or a half-plane, which runs off forever. So three dots are needed, and three around A, not all on one side of it, close it; the ones in hint 3 give the triangle of grades 4–5 Problem 3. The app checked every placement of two dots on the grid: none fits.', extension: 'Can three dots all on one side of A close it? (No: A’s region then runs off on the other side.)', connection: 'A bounded intersection of half-planes needs at least three of them, whose inward directions surround the origin; the guide’s lower bound says each straight edge of a whole cell needs a different competitor.'},
    provenance: 'New, from the Week 15 guide’s lower bound for minimum-site tasks (each straight edge of a whole cell needs a different competitor) and grades 4–5 Problem 3’s triangular cell.'},
  {number: 10, level: 'hard', title: 'A triangle', mode: 'make', sites: [[0, 0]], names: ['A'], target: [half(0, -1, 1), half(1, 1, 2), half(-1, 1, 2)], budget: 3,
    visible: 'Make A’s region exactly the shaded part.',
    check: {answer: [[-2, 2], [0, -2], [2, 2]]}, prereq: 'Picture mirror images across slanted lines.',
    idea: 'Reflecting the dot across each side makes a triangle round it into its region.',
    hints: ['Do one side at a time. Which dot makes the bottom side?', 'Each new dot is A’s mirror image across one side.', 'Put dots 2 squares below A, and 2 right and 2 up, and 2 left and 2 up from A.'],
    parent: {notice: 'Whether your child gets the bottom side first and then mirrors A across the slanted sides, or tries the corners of the triangle.', prompt: 'Why aren’t the new dots at the corners of the triangle?', explanation: 'Each side must be the halfway line between A and a new dot, so each dot is A’s mirror image across one side: 2 squares below A for the bottom (y = −1), and 2 right and 2 up, and 2 left and 2 up, for the slanted sides (x + y = 2 and y − x = 2). Three sides need three dots, and each is forced, so this is the only answer. A’s whole region is then the triangle with corners 3 left and 1 down, 3 right and 1 down, and 2 up from A.', extension: 'Can the same trick give A any shape? (Any shape with straight sides and no dents that holds A inside, and no other dots in the way.)', connection: 'The inverse construction: a convex polygon is the Voronoi cell of a point inside it when its sites are that point’s reflections in the sides (with no other sites present).'},
    provenance: 'Week 15 grades 4–5 Problem 7 (build the prescribed triangle), with a triangle whose reflections lie on the half-unit lattice: the worksheet’s triangle (−2, −1), (2, −1), (0, 2) needs dots at (±24/13, 16/13).'},
  {number: 11, level: 'hard', title: 'Take R', mode: 'take', sites: [[0, 2]], names: ['A'], keep: [['P', -2, 0], ['Q', 2, 0]], take: ['R', 0, 0], budget: 2,
    visible: 'Take R from A, but keep P and Q with A.',
    check: {count: 0, cant: ['P', 'Q']}, prereq: 'See that a region has no dents. A grown-up can read the goal.',
    idea: 'A region has no dents: holding P and Q, it holds everything between them.',
    hints: ['Try to take R with a dot. What happens to P or Q?', 'A’s region never has a dent: if it holds two places, it holds the straight line between them.', 'Put a dot on R and press Check. Then press Can’t and tap P and Q.'],
    parent: {notice: 'Whether your child tries several dots before suspecting it can’t be done, and then looks for why.', prompt: 'If P and Q are A’s, what about the places on the line between them?', explanation: 'Each region is the overlap of half-planes, one for each other dot, and a half-plane that holds two places holds the whole segment between them. So a region has no dents: if P and Q are A’s, every place between them is A’s, and R is the middle of P and Q. No dots, however many or wherever, can take R while keeping P and Q. The segment from P to Q through R is the certificate.', extension: 'Puzzle 8’s S is outside the triangle with corners A, P and Q. Is that why it can be taken? (Yes: a line can separate S from the triangle, and a dot at A’s mirror image across that line takes S. A place inside the triangle could never be taken, since A’s region would hold the whole triangle.)', connection: 'Voronoi cells are convex. The same argument shows a cell holds the convex hull of any of its points.'},
    provenance: 'Week 15 grades 4–5 Problem 8, the point R: A at (0, 2), P and Q at (∓2, 0), R at (0, 0).'},
  {number: 12, level: 'hard', title: 'Keep P, take R', mode: 'take', sites: [[-2, 2]], names: ['A'], keep: [['P', 2, -2]], take: ['R', 1, 1], budget: 2, aim: [-1, 3],
    visible: 'Take R from A, but keep P with A.',
    check: {count: 2, includes: [[-1, 3], [-1.5, 2.5]]}, prereq: 'Picture a mirror image across a line. A grown-up can read the goal.',
    idea: 'A place off the line from A to P can be taken: reflect A across a line that separates them.',
    hints: ['A dot near R takes P too. Where could a dot be nearer to R than A is, but not nearer to P?', 'Picture a line between R and the line from A to P. The new dot is A’s mirror image across it.', 'Put a dot 1 square right and 1 square up from A.'],
    parent: {notice: 'Whether your child keeps putting dots near R (each takes P too), and whether pressing Can’t and tapping A and P (“Misses R.”) sends them looking for another way.', prompt: 'Is R on the line from A to P? Then could a line separate them?', explanation: 'R is off the segment from A to P, so a line can run between them, parallel to that segment and between it and R. Put a dot at A’s mirror image across such a line: that line is then the edge, A and P are on A’s side, and R is on the new dot’s. Two such lines put the dot on the grid inside the frame: 1 right and 1 up from A, or ½ right and ½ up. Those are the only two grid points that work; lines nearer R put the dot outside the frame.', extension: 'If R were on the line from A to P, could it be taken? (No: A’s region holds A and P and so the whole segment.)', connection: 'A point outside a convex set can be separated from it by a line (the separating hyperplane theorem); reflecting the site across that line realizes the separation as a Voronoi edge.'},
    provenance: 'New, the review card’s App fit task “take a point while keeping others”, with R off the segment from A to P so that it can be taken, by a dot behind A.'}
];

const OBJECTIVE = {
  make: 'Put new dots in the frame so that A’s whole region is exactly the shaded part. Press Check to see the regions.',
  part: 'Put one new dot in the frame so that A’s region and B’s region share no place at all, not even a point. Press Check to see the regions.',
  touch: 'Put D in the frame so that D’s region shares at least one place with A’s region and one with B’s, and no place with C’s. Press Check to see the regions.',
  four: 'Put D in the frame so that one place belongs to four dots at once: A, B, C and D are all nearest to it. Press Check to see the regions.'
};
const objectiveOf = item => {
  if (item.mode === 'take') return `Put new dots so that ${item.take[0]} stops belonging to A while ${item.keep.map(k => k[0]).join(' and ')} still ${item.keep.length > 1 ? 'belong' : 'belongs'} to A, and press Check. If it can’t be done, press Can’t after a Check and tap two places that show why.`;
  if (item.mode === 'fit') return `Put new dots so that ${item.names[item.focus ?? 0]}’s whole region fits inside the frame, with as few dots as possible. Press Check, and then Fewest when no fewer dots could do it.`;
  return OBJECTIVE[item.mode];
};
const sources = ['sites-week15', 'sites-card15', 'sites-mount'];
const id = n => `sites-${String(n).padStart(2, '0')}`;
const units = z => [z[0] / 2, z[1] / 2];
const same = (a, b) => JSON.stringify(sortDots(a)) === JSON.stringify(sortDots(b));

const out = PUZZLES.map(item => {
  const q = {mode: item.mode, frame: FRAME, view: VIEW, sites: item.sites.map(H), names: item.names, focus: item.focus ?? 0, budget: item.budget};
  if (item.target) q.target = item.target;
  if (item.dot) Object.assign(q, {dot: item.dot});
  if (item.touch) Object.assign(q, {touch: item.touch, avoid: item.avoid});
  if (item.apart) q.apart = item.apart;
  if (item.keep) Object.assign(q, {keep: item.keep.map(([name, x, y]) => ({name, at: H([x, y])})), take: {name: item.take[0], at: H(item.take.slice(1))}});
  const label = id(item.number);
  for (const z of q.sites) assert.ok(G.inFrame(z, FRAME), `${label}: sites in the frame`);
  let solution;
  if (item.mode === 'make') {
    const answer = makeAnswer(q);
    assert.ok(same(answer, item.check.answer.map(H)), `${label}: the reflections are the answer`);
    assert.equal(answer.length, q.target.length, `${label}: one dot per side`);
    assert.ok(answer.length <= q.budget && answer.every(z => G.inFrame(z, FRAME)), `${label}: the answer fits the budget and the frame`);
    assert.ok(goal(q, sortDots(answer)), `${label}: the answer makes the target`);
    assert.ok(G.owns([q.sites[q.focus]], 0, q.sites[q.focus]) && q.target.every(h => G.holds(h, q.sites[q.focus])), `${label}: A is inside the target`);
    solution = {dots: sortDots(answer).map(units)};
  } else if (['part', 'touch', 'four', 'take'].includes(item.mode)) {
    const answers = singleAnswers(q);
    if (item.check.answers) assert.ok(same(answers, item.check.answers.map(H)), `${label}: the single dots that work`);
    if (item.check.count !== undefined) assert.equal(answers.length, item.check.count, `${label}: how many single dots work`);
    for (const z of item.check.includes || []) assert.ok(answers.some(a => G.samePoint(a, H(z))), `${label}: ${z} works`);
    for (const z of item.check.excludes || []) assert.ok(!answers.some(a => G.samePoint(a, H(z))), `${label}: ${z} fails`);
    if (item.mode === 'take') {
      const certs = certificates(q);
      if (item.check.cant) {
        assert.deepEqual(certs.map(pair => pair.map(k => own(q)[k].name)), [item.check.cant], `${label}: the one segment through ${q.take.name}`);
        solution = {try: [units(q.take.at)], cant: item.check.cant};
      } else {
        assert.deepEqual(certs, [], `${label}: no segment through ${q.take.name}`);
        solution = {answers: answers.map(units)};
      }
    } else solution = {answers: answers.map(units)};
  } else {
    q.witnesses = item.witnesses.map(W => W.map(H));
    for (const W of q.witnesses) assert.ok(W.length === item.check.fewest && goal(q, sortDots(W)), `${label}: witness ${JSON.stringify(W)} fits`);
    // The fewest: no placement of fewer dots on the grid fits.
    const free = G.framePoints(FRAME).filter(z => !q.sites.some(s => G.samePoint(s, z)));
    let fewest = 0;
    for (; fewest < item.check.fewest; fewest++) {
      let found = false;
      (function go(from, set) {
        if (found) return;
        if (set.length === fewest) { found = goal(q, set); return; }
        for (let i = from; i < free.length && !found; i++) go(i + 1, [...set, free[i]]);
      })(0, []);
      if (found) break;
    }
    assert.equal(fewest, item.check.fewest, `${label}: the fewest dots`);
    q.fewest = fewest;
    assert.ok(q.budget > q.fewest, `${label}: the budget is not the answer`);
    solution = {fewest, dots: sortDots(q.witnesses[0]).map(units)};
  }
  if (item.from !== undefined) q.from = item.from;
  if (item.aim) { q.aim = H(item.aim); assert.ok(singleAnswers(q).some(z => G.samePoint(z, q.aim)), `${label}: the hints' aim works`); }
  return {
    id: label, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Nearest dots', mechanic: 'sites', band: 'all', revision: 1, sourceDocument: 'docs/sites/README.md',
    parameters: q,
    objective: objectiveOf(item), visibleObjective: item.visible, instruction: objectiveOf(item),
    controls: CONTROLS + (MORE_CONTROLS[item.mode] || ''),
    rules: [...RULES, ...(MORE[item.mode] ? [MORE[item.mode]] : [])],
    idea: item.idea, prerequisites: item.prereq, hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'sites-playground', number: 0, title: 'Nearest dots playground', difficulty_level: 'playground', familyTitle: 'Nearest dots', mechanic: 'sites', band: 'playground', revision: 1, sourceDocument: 'docs/sites/README.md',
  parameters: {mode: 'playground', frame: FRAME, view: VIEW, start: [[-1.5, -1], [1.5, 1]].map(H)},
  objective: 'Put down, move and take away dots, and watch every dot’s region change.', visibleObjective: '',
  instruction: 'Put down, move and take away dots, and watch every dot’s region change.',
  controls: 'A dot’s region contains every place nearest to it, measured in a straight line. Equally near places belong to every tied dot; regions continue past the frame. Tap where grid lines cross to put a dot there. Drag a dot to move it, or tap it to take it away; the regions change as you go. With a keyboard, the arrow keys move a ring, Enter or Space puts down, picks up or drops a dot, and Delete takes one away.',
  rules: [RULES[0], RULES[1], 'Edges are places two dots share; a small ring marks a place three or more share, and a bigger one four or more.'],
  idea: 'Free play with up to ten dots: the edge between two dots, a third dot erasing part of it, ties of three and four, and regions shrinking when a dot is added.',
  prerequisites: 'None. A grown-up can suggest what to try.',
  hints: ['Put a third dot between A and B. What happens to their edge?', 'Put four dots at the corners of a square. Which place belongs to all four?', 'Add a dot in the middle of the square. Do the others gain or lose places?'],
  parent: {notice: 'Whether your child predicts where an edge will go before dropping a dot, and notices that a new dot only ever takes places from the others.', prompt: 'Can adding a dot ever give an old dot more places?', explanation: 'No. A place belongs to an old dot when no dot is nearer; adding a dot adds one more comparison, which can only take places away (Week 15 grades 4–5 Problem 5). Two dots split the map along the line halfway between them; a third can erase part of that line where it is nearer than both (grades 2–3 Problem 2); four dots on a circle share its centre (grades 2–3 Problem 4).', extension: 'Make a dot whose region is closed in on every side. How few other dots can do it?', connection: 'This is the Voronoi diagram of the dots; the edges and the rings are its edges and vertices.', sourceIds: sources},
  provenance: 'Week 15 throughout: the organizer’s home trial drew two dots, A and B, then added a third to compete with them (review card, Classroom evidence).'
};

const json = {
  title: 'Nearest dots',
  version: 1,
  families: [{id: 'sites', title: 'Nearest dots', mathematics: 'Every place belongs to the dot nearest to it, and a place just as near to several dots belongs to all of them; a dot’s region is its closed set of places. Two dots split the plane along their perpendicular bisector, and a region is the intersection of one half-plane per other dot: convex, containing its dot, possibly unbounded. Edges are two-way ties and corners are three-way or more, with four dots on a circle sharing its centre. Adding a dot only shrinks the others’ regions. Dots sit on a half-unit grid, so every edge is exact and the app checks each one with whole-number arithmetic. The puzzles run the theorems backwards: to give a dot A a region with given straight sides and no dents, put a new dot at A’s mirror image across each side; a closed region needs at least three sides, and two parallel ones need two more; and since a region has no dents, a place on the segment between two places A must keep can never be taken from A, while a place outside the shape spanned by A and the kept places can be cut off by one dot. These are Voronoi diagrams, the subject of a first lecture in computational geometry.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'sites-week15', title: 'Bellingham Math Circle — Week 15: Nearest-site regions (K–1, grades 2–3 and grades 4–5 packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-15', kind: 'local curriculum'},
    {id: 'sites-card15', title: 'Week 15 review card and math check (keep; App fit: drag dots on a half-unit lattice to make target cells)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-15.md', kind: 'local curriculum'},
    {id: 'sites-mount', title: 'David M. Mount — CMSC 754 Computational Geometry, Lecture 10: Voronoi Diagrams and Fortune’s Algorithm (Fall 2021), pp. 1–3: definition, half-planes, convexity and empty circles', url: 'https://www.cs.umd.edu/class/fall2021/cmsc754/Lects/lect10-vor.pdf', kind: 'lecture notes'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/sites/sites.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${JSON.stringify(p.solution).slice(0, 110)}`).join('\n'));
