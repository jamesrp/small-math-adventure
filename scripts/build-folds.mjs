// Builds dist/families/folds/folds.json, the Mirror Couriers shortest
// routes group, from the authoring list below. Each puzzle's answer (the
// best contacts, the finish to choose, the starts, the order of the walls or
// the shortest routes round the block) is computed here with the mechanic
// (dist/families/folds/folds.js) and checked again by brute force over the
// grid in scripts/validate-folds.mjs. Design notes and sources:
// docs/folds/README.md.
import {writeFile} from 'node:fs/promises';
import {bestContact, everyAnswer, placeSolutions, wallsBest, wallsWinner, blockRoutes, ropeSquared, routeOf} from '../dist/families/folds/folds.js';

const WEEK21 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-21';
export const sources = [
  {id: 'folds-week21', title: 'Bellingham Math Circle — Week 21: The shortest route that touches a line, K–1, Grades 2–3 and Grades 4–5 packets and adult guide', url: WEEK21, kind: 'local curriculum'},
  {id: 'folds-week21-bonus', title: 'Bellingham Math Circle — Week 21: Shortest routes encore (two walls, windows, a rectangle), packet and adult guide', url: WEEK21, kind: 'local curriculum'},
  {id: 'folds-heron', title: 'Heron of Alexandria, Catoptrica: the reflection principle for the shortest path touching a line (as in Courant and Robbins, What Is Mathematics?, Chapter VII §1)', url: 'https://en.wikipedia.org/wiki/Heron%27s_problem', kind: 'reference'}
];
const SOURCE_IDS = ['folds-week21', 'folds-heron'];
const BONUS_IDS = ['folds-week21-bonus', 'folds-heron'];

export const family = {
  id: 'folds',
  title: 'Mirror Couriers shortest routes',
  mathematics: 'For A and B strictly on one side of a line, reflect B to B′. Every route A–M–B through a point M of the line is exactly as long as A–M–B′, so it is at least the straight segment AB′, with equality only where AB′ crosses the line. So the shortest route has one best contact, it is the only contact whose fold is straight, and its length is AB′. Consequences on these boards: two finishes need the same shortest rope from A exactly when their images are equally far from A, independently of where the routes touch; the starts whose best contact is P form the ray from P directly away from B′; when touching is allowed only on some stretches of the line, the length is strictly convex along the line, so each stretch’s best is the point nearest the crossing and the stretches’ candidates are compared; with two walls the route unfolds twice and the order of the walls changes the double image; round a block a taut route bends only at corners, and a fold along a line of symmetry pairs equal routes. Every dot and best contact here is a grid point, and lengths are compared exactly as sums of square roots.',
  rules: [
    'A route goes straight from its start to one point of the line, then straight to its finish.',
    'Fold flips the finish’s side of the route over the line.',
    'Claims are made on the folded board.'
  ],
  sourceIds: sources.map(s => s.id)
};

// The rules How to play lists, by kind of board.
const RULES = {
  route: ['A route goes straight from its start to one point of the line, then straight to its finish.', 'Fold flips the finish’s side of the route over the line.', 'Claims are made on the folded board.'],
  walls: ['A route goes straight from A to one point of each wall, then straight to B.', 'Fold flips the route over the walls, one wall at a time.', 'Claims are made on the folded board.'],
  block: ['A route goes in straight pieces round the block, never through it.', 'Fold flips the routes over the line through A and B.', 'Claims are made on the folded board.']
};
const rulesFor = q => RULES[q.mode === 'walls' || q.mode === 'block' ? q.mode : 'route'];

// The coordinates are (across, up); the river is y = 0, the wall x = 0.
const river = (from, to) => ({dir: 'h', at: 0, from, to});
const FOLD = 'Fold flips the finish’s side of the route over the river, and Unfold flips it back.';
const CLAIM_RULE = 'A wrong claim is refused, and the claim stays off until the board changes.';
const DEF = {
  river: 'A route goes straight from its start to one point of the river, then straight to its finish.',
  wall: 'A route goes straight from its start to one point of the wall, then straight to its finish.',
  windows: 'A route goes straight from its start to one point of a heavy stretch of the river, then straight to its finish.'
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Beat both',
    parameters: {mode: 'route', view: [0, -3, 12, 3], line: river(0, 12), dots: {A: [1, 2], B: [11, 3]}, routes: [['A', 'B']], claim: 'shorter', guesses: [3, 9]},
    objective: 'Make a route from A to B that is shorter than both dashed routes.',
    controls: `${DEF.river} Tap the river where your route touches. ${FOLD} After folding, press Shorter when your route is shorter than both dashed routes. ${CLAIM_RULE}`,
    idea: 'Folded, each route becomes a path from A to B′; the straighter the path, the shorter the route. The fold of the dashed routes bends, and a contact near the crossing of A–B′ beats both.',
    prerequisites: 'None. Nothing to read on the board.',
    hints: ['Try a few places on the river. Which way do the routes get shorter?', 'Press Fold. Which folded route is closest to a straight line from A to B′?', 'Touch where the straight line from A to B′ crosses the river.'],
    parent: {
      notice: 'Whether your child compares routes by how bent they look once folded, rather than by guessing.',
      prompt: 'After folding, which route would a tight string make?',
      explanation: 'Folding B’s leg over the river doesn’t change its length, so every route from A to B is as long as its folded route from A to B′. The straight segment from A to B′ is the shortest of those, and it crosses the river at 5 across (counting grid lines from the left edge). Contacts at 4, 5, 6 and 7 across all beat both dashed routes, which touch at 3 and 9; 5 across is the shortest of all.',
      extension: 'Can two different contacts give routes of exactly the same length? (Yes: for each contact on one side of the best one there can be one on the other side, but they need not be grid points.)',
      connection: 'Heron’s reflection principle: the route through M is as long as A–M–B′, and A–M–B′ is shortest when it is straight.'
    },
    provenance: 'Week 21 K–1 Problem 2 (beat both drawn routes, then find the shortest you can), on a new grid instance with the drawn contacts on either side of the best one.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Shortest',
    parameters: {mode: 'route', view: [0, -4, 11, 4], line: river(0, 11), dots: {A: [1, 4], B: [10, 2]}, routes: [['A', 'B']], claim: 'shortest'},
    objective: 'Make the shortest route from A to B.',
    controls: `${DEF.river} Tap the river where your route touches. ${FOLD} After folding, press Shortest when no route can be shorter. ${CLAIM_RULE}`,
    idea: 'The shortest route touches where the straight line from A to B′ crosses the river, and it is the only contact whose fold is straight.',
    prerequisites: 'Shortest routes puzzle 1.',
    hints: ['Fold first, then move the contact until the folded route looks right.', 'A folded route that bends can be pulled straighter, and shorter.', 'Touch where the straight line from A to B′ crosses the river, at 7 across.'],
    parent: {
      notice: 'Whether your child aims at B′ through the river, or slides the contact back and forth by feel.',
      prompt: 'How do you know no other contact is shorter, even one you haven’t tried?',
      explanation: 'A is 4 above the river and B′ is 2 below it, 9 to the right. The straight line from A to B′ goes 6 down and 9 across, so it reaches the river after 4 of the 6 steps down, 6 to the right of A, at 7 across. Every other contact gives a folded route that bends, and a bent path from A to B′ is longer than the straight one.',
      extension: 'Move A one point higher. Where does the best contact go?',
      connection: 'The equality case of the triangle inequality: A–M–B′ equals A–B′ only when M is on the segment.'
    },
    provenance: 'Week 21 K–1 Problem 4 and Grades 2–3 Problem 3 (find the shortest route from A to B), on a new grid instance.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'The wall',
    parameters: {mode: 'route', view: [-4, 0, 4, 10], line: {dir: 'v', at: 0, from: 0, to: 10}, dots: {A: [1, 1], B: [3, 9]}, routes: [['A', 'B']], claim: 'shortest'},
    objective: 'Make the shortest route from A to B that touches the wall.',
    visibleObjective: 'Make the shortest route from A to B.',
    controls: `${DEF.wall} Tap the wall where your route touches. Fold flips the finish’s side of the route over the wall, and Unfold flips it back. After folding, press Shortest when no route can be shorter. ${CLAIM_RULE}`,
    idea: 'The same fold works for a wall standing up: B′ is behind the wall, and the best contact is where A–B′ crosses it.',
    prerequisites: 'Shortest routes puzzle 2.',
    hints: ['Press Fold. Where is B′?', 'Pull the folded route straight from A to B′.', 'Touch the wall 3 up.'],
    parent: {
      notice: 'Whether your child carries the fold over to a line that runs up the page.',
      prompt: 'Where would you aim if the wall were a mirror?',
      explanation: 'B′ is 3 behind the wall and 9 up. The straight line from A (1 in front, 1 up) to B′ crosses 4 across and 8 up, so it meets the wall after a quarter of the way: 2 up from A, at 3 up.',
      extension: 'Where would a ball bounce off the wall to roll from A to B?',
      connection: 'The law of reflection: the shortest route makes equal angles with the wall on the way in and out.'
    },
    provenance: 'Week 21 K–1 Problem 6 and Grades 2–3 Problem 4 (a line running up the page), one pair of dots, on a new grid instance.'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Less rope',
    parameters: {mode: 'route', view: [0, -4, 10, 4], line: river(0, 10), dots: {A: [1, 3], B: [9, 1], C: [8, 4]}, routes: [['A', 'B'], ['A', 'C']], claim: 'less'},
    objective: 'Make the shortest routes from A to B and from A to C, then choose the finish that needs less rope.',
    visibleObjective: 'Which finish needs less rope?',
    controls: `${DEF.river} Tap B or C to choose its route, then tap the river where that route touches. ${FOLD} After folding, choose a finish and press Less rope. A wrong choice ends the try: press Again. Any other wrong claim is refused, and the claim stays off until the board changes.`,
    idea: 'Once both routes are straight when folded, their lengths are the distances from A to B′ and to C′, which can be compared directly, even though C is nearer A than B is.',
    prerequisites: 'Shortest routes puzzle 2.',
    hints: ['C is nearer to A than B is. Does its route need less rope?', 'Make each route straight when folded, then compare B′ and C′.', 'Swing the rope round A: C′ is farther from A than B′, so choose B.'],
    parent: {
      notice: 'Whether your child compares the shortest routes, not the first routes they made, and not the straight distances A–B and A–C.',
      prompt: 'Why does the closer finish need more rope?',
      explanation: 'Folded, the shortest rope to B is the straight line from A to B′ (8 across, 4 down) and the shortest rope to C is the straight line to C′ (7 across, 7 down). 8 × 8 + 4 × 4 = 80 is less than 7 × 7 + 7 × 7 = 98, so B needs less rope, though C is nearer to A: C is high above the river, and the rope has to go down and back up.',
      extension: 'Where could you put a finish C so that it needs exactly as much rope as B?',
      connection: 'The minimum length is the distance from A to the reflected finish: the reflection turns a constrained problem into a distance.'
    },
    provenance: 'Week 21 Grades 2–3 Problem 1, K–1 Problem 5 and Grades 4–5 Problem 1 (which of two finishes needs less string), on a new grid instance where the nearer finish needs more rope.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Every start',
    parameters: {mode: 'every', view: [0, -2, 11, 4], line: river(0, 11), dots: {B: [10, 2]}, finish: 'B', p: 6, place: [0, 1, 11, 4]},
    objective: 'Put a start on every point whose shortest route to B touches the river at P, then press That’s all.',
    visibleObjective: 'Put a start on every point whose shortest route to B touches P.',
    controls: `A route goes straight from its start to one point of the river, then straight to B. Tap a point to put a start there, and tap it again to take it away. ${FOLD} After folding, press That’s all when every start whose shortest route touches P is there. ${CLAIM_RULE}`,
    idea: 'A start’s shortest route touches P exactly when its straight line to B′ passes through P, so the starts are the grid points on the ray from P directly away from B′.',
    prerequisites: 'Shortest routes puzzle 2.',
    hints: ['Put a start somewhere and look at its route to B through P. Is it the shortest?', 'Fold. A start works when its line through P points straight at B′.', 'Follow the straight line from B′ through P beyond the river: put starts on the grid points it meets.'],
    parent: {
      notice: 'Whether your child predicts the next start from the first one or two, and whether they check the points between.',
      prompt: 'Is there a pattern to where the starts go? Why does it stop at the edge of the board?',
      explanation: 'B′ is 4 across from P and 2 below the river. A start’s shortest route touches P exactly when the start, P and B′ are in a straight line, so the starts lie on the line from B′ through P, beyond P: 2 left and 1 up each time. On this board those are 2 left and 1 up from P, 4 left and 2 up, and 6 left and 3 up. Points between them aren’t grid points of the line.',
      extension: 'If the starts didn’t have to be grid points, where could they all go?',
      connection: 'The inverse of Heron’s problem: the set of starts with a given best contact is a ray, by the equality case.'
    },
    provenance: 'Week 21 K–1 Problem 7, Grades 2–3 Problem 5 and Grades 4–5 Problem 5 (starts whose shortest route to B touches P; describe all of them), on a new grid instance.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Same rope',
    parameters: {mode: 'route', view: [0, -5, 10, 5], line: river(0, 10), dots: {A: [3, 2], B: [9, 1], C: [8, 4]}, routes: [['A', 'B'], ['A', 'C']], claim: 'tie', move: 'C', place: [0, 1, 10, 5]},
    objective: 'Move C so that the shortest routes from A to B and from A to C need the same rope, and make both routes.',
    visibleObjective: 'Move C so its shortest route needs as much rope as B’s.',
    controls: `${DEF.river} Tap an empty point to move C there. Tap B or C to choose its route, then tap the river where that route touches. ${FOLD} After folding, press Same rope when both routes are as short as they can be and need the same rope. ${CLAIM_RULE}`,
    idea: 'The shortest ropes are the distances from A to B′ and to C′, so C works exactly when C′ is as far from A as B′, whatever the contacts are.',
    prerequisites: 'Shortest routes puzzle 4.',
    hints: ['Make the shortest route to B first. How far does its fold reach?', 'C′ must be as far from A as B′ is.', 'B′ is 6 across and 3 down from A. Put C′ 3 across and 6 down from A, so C is at 6 across, 4 up.'],
    parent: {
      notice: 'Whether your child uses the folded distance, and whether they notice the two routes touch at different places.',
      prompt: 'Do equal ropes have to touch the river at the same point?',
      explanation: 'B′ is 6 across and 3 down from A, so its shortest rope is the diagonal of a 6 by 3 box. C′ needs a box with the same diagonal: 3 by 6 works, giving C at 6 across, 4 up (or 0 across, 4 up). The route to B touches at 7 across and the route to C at 4 across, so equal ropes need not share a contact.',
      extension: 'Find every place on this board for C. Could C need the same rope and touch at the same point as B without being B? (No: C′ would be on the line from A through the contact, as far from A as B′.)',
      connection: 'Two right triangles with legs (6, 3) and (3, 6) have equal hypotenuses. Equal minima and shared contacts are independent conditions.'
    },
    provenance: 'Week 21 Grades 2–3 Problem 6 (do the shortest routes to B and C need the same string?), turned into placing C; new grid instance.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Same place',
    parameters: {mode: 'route', view: [0, -4, 11, 4], line: river(0, 11), dots: {A: [1, 3], B: [11, 2], C: [5, 2], D: [2, 1]}, routes: [['A', 'B'], ['C', 'D']], claim: 'share', move: 'D', place: [0, 1, 11, 4]},
    objective: 'Move D so that the shortest routes from A to B and from C to D touch the river at the same point, and make both routes.',
    visibleObjective: 'Move D so the two shortest routes touch at the same point.',
    controls: `${DEF.river} Tap an empty point to move D there. Tap B or D to choose its route, then tap the river where that route touches. ${FOLD} After folding, press Same place when both routes are as short as they can be and touch at the same point. ${CLAIM_RULE}`,
    idea: 'D works exactly when D′ lies on the straight line from C through the best contact of A–B, beyond the river.',
    prerequisites: 'Shortest routes puzzles 5 and 6.',
    hints: ['Where does the shortest route from A to B touch?', 'Fold. D′ must be straight on from C through that point.', 'The shortest route from A to B touches at 7 across. Go from C to that point and keep going: put D′ 1 across and 1 down from it, so D is at 8 across, 1 up.'],
    parent: {
      notice: 'Whether your child fixes the contact first and then aims through it.',
      prompt: 'Could the two routes share a contact and still need different rope?',
      explanation: 'A is 3 up and B′ 2 down, 10 across, so A–B′ crosses the river 6 across from A, at 7 across. The route from C (5 across, 2 up) is shortest through that point exactly when D′ is on the line from C through it, which goes 1 across and 1 down each step: D at 8 across 1 up, 9 across 2 up, 10 across 3 up or 11 across 4 up.',
      extension: 'Move C somewhere else. Where can D go now?',
      connection: 'The starts (or finishes) with a given best contact form a ray; two rays from one point.'
    },
    provenance: 'Week 21 Grades 4–5 Problem 4 (can the shortest routes A–B and C–D touch at the same point?), turned into placing D; new grid instance.'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Windows',
    parameters: {mode: 'route', view: [0, -4, 12, 4], line: {dir: 'h', at: 0, windows: [[0, 3], [9, 12]]}, dots: {A: [1, 4], B: [10, 2]}, routes: [['A', 'B']], claim: 'shortest'},
    objective: 'Make the shortest route from A to B that touches a heavy stretch of the river.',
    visibleObjective: 'Make the shortest route from A to B.',
    controls: `${DEF.windows} Tap a heavy stretch where your route touches. ${FOLD} After folding, press Shortest when no allowed route can be shorter. ${CLAIM_RULE}`,
    idea: 'The straight line from A to B′ crosses where touching isn’t allowed. Along the river the length grows steadily away from that crossing, so each stretch’s best is its end nearer the crossing, and the two ends are compared.',
    prerequisites: 'Shortest routes puzzle 2 (the same A and B).',
    hints: ['Fold. Where does the straight line from A to B′ cross the river?', 'The nearer to that crossing, the shorter: try the end of each heavy stretch nearer it, and compare.', 'Touch the left end of the right stretch, at 9 across.'],
    parent: {
      notice: 'Whether your child knows to try only the stretch ends nearest the crossing, and then compares two candidates.',
      prompt: 'Why can’t a point in the middle of a heavy stretch be best?',
      explanation: 'Unrestricted, the best contact is at 7 across, which is not allowed. Moving the contact away from it makes the route longer and longer, so in the left stretch the best is its right end (3 across) and in the right stretch its left end (9 across). Folded, 3 across gives √20 + √53 ≈ 11.75 and 9 across gives √80 + √5 ≈ 11.18, so the right stretch wins, and its route is the only shortest one.',
      extension: 'Lengthen the left stretch to end at 5 across. Which stretch wins now? (The left: √32 + √29 ≈ 11.04.)',
      connection: 'A strictly convex function on an interval takes its minimum at the point nearest the global minimum.'
    },
    provenance: 'Week 21 Grades 4–5 Problem 6 and Grades 2–3 Problem 7 (touching only between C and D, or E and F), and the encore Problem 3 (two windows), on puzzle 2’s board.'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Every start again',
    parameters: {mode: 'every', view: [0, -2, 11, 5], line: river(0, 11), dots: {B: [0, 2]}, finish: 'B', p: 3, place: [0, 1, 11, 5]},
    objective: 'Put a start on every point whose shortest route to B touches the river at P, then press That’s all.',
    visibleObjective: 'Put a start on every point whose shortest route to B touches P.',
    controls: `A route goes straight from its start to one point of the river, then straight to B. Tap a point to put a start there, and tap it again to take it away. ${FOLD} After folding, press That’s all when every start whose shortest route touches P is there. ${CLAIM_RULE}`,
    idea: 'The ray from P away from B′ climbs 2 for every 3 across, so it meets the grid only every third column, and the diagonal guesses miss.',
    prerequisites: 'Shortest routes puzzle 5.',
    hints: ['Fold. Where must a start be for its folded route through P to be straight?', 'The line climbs 2 for every 3 across. Which grid points does it pass through?', 'Put starts at 6 across, 2 up and 9 across, 4 up.'],
    parent: {
      notice: 'Whether your child checks the points near the line, such as 5 across 1 up, and rules them out.',
      prompt: 'How do you know there are no more?',
      explanation: 'B′ is 2 below the river, 3 left of P. The starts are on the line from B′ through P beyond P, 3 across and 2 up at a time: 6 across 2 up and 9 across 4 up on this board. A start such as 5 across 1 up looks close, but its line to B′ crosses the river at 3 1/3 across.',
      extension: 'Make the board wider. Where is the next start?',
      connection: 'Lattice points on a line through a lattice point with direction (3, 2) occur every 3 columns, because 3 and 2 share no factor.'
    },
    provenance: 'Week 21 Grades 4–5 Problem 5 (describe all the places a start could go), on a new grid instance where the line is not a diagonal.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Two walls',
    parameters: {mode: 'walls', view: [0, -1, 11, 4], walls: {lower: 0, upper: 3, from: 0, to: 11}, dots: {A: [1, 1], B: [11, 2]}},
    objective: 'Make the shortest route from A to B that touches each wall once, in either order.',
    visibleObjective: 'Touch each wall once. Make the shortest route.',
    controls: 'A route goes straight from A to a point of one wall, straight to a point of the other wall, then straight to B. The wall you tap first is touched first. Tap a point of a wall to touch it there; tap another point of the same wall to move the touch, and the same point to take it away. Fold flips the route over the walls, one wall at a time, and Unfold flips it back. After folding, press Shortest when no route touching both walls is shorter. If the other order is shorter, the try ends: press Again. Any other wrong claim is refused, and the claim stays off until the board changes.',
    idea: 'Fold B over the second wall, then that image and the second leg over the first wall: the shortest route in each order is the straight line from A to that double image, and the two orders give different images.',
    prerequisites: 'Shortest routes puzzle 3.',
    hints: ['Which wall should the route touch first? Try both orders.', 'Fold: B flips over the second wall, then over the first. Which order puts the double image nearer A?', 'Touch the lower wall first at 3 across, then the upper wall at 9 across.'],
    parent: {
      notice: 'Whether your child tries both orders before claiming, and whether the folded route is straight through both walls.',
      prompt: 'Would the same order still win if A were higher than B?',
      explanation: 'Lower first: B flips over the upper wall to 4 up, then over the lower wall to 4 down, so the rope is the straight line from A (1 up) to 10 across and 5 down: √125 ≈ 11.2. Upper first: B flips to 2 down, then to 8 up, giving 10 across and 7 up: √149 ≈ 12.2. The straight line for lower first touches the lower wall at 3 across and the upper wall at 9 across. In general the vertical distances are 2 × 3 + 1 − 2 = 5 and 2 × 3 + 2 − 1 = 7, so lower first wins exactly when B is higher than A, wherever they are between the walls.',
      extension: 'Where could A be so that both orders need the same rope?',
      connection: 'Unfolding a billiard path across two mirrors, as in Mirror Couriers: each bounce becomes a reflection of the board.'
    },
    provenance: 'Week 21 encore Problems 1 and 2 (two walls, both orders), as one board where the child chooses the order; new grid instance.'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Round the block',
    parameters: {mode: 'block', view: [0, 0, 8, 6], rect: [2, 2, 6, 5], axis: 3, dots: {A: [0, 3], B: [8, 3]}},
    objective: 'Keep every shortest route from A to B round the block, then press That’s all.',
    visibleObjective: 'Keep every shortest route round the block.',
    controls: 'A route goes in straight pieces from A to B, bending only at corners of the block. It may run along the block’s edge but never through it. Tap corners in order to bend the route there; tap the last corner again to take it back. Press Keep to put the route on the shelf, and tap a kept route to take it off. Fold flips the routes over the line through A and B, and Unfold flips them back. After folding, press That’s all when every shortest route is kept. A wrong claim is refused, and the claim stays off until the shelf changes.',
    idea: 'A tight rope round a block bends only at corners, so there are few candidates. Folded over the line through A and B, the route over the top lies outside the route underneath, so it is longer.',
    prerequisites: 'Shortest routes puzzle 2.',
    hints: ['Try going over the block and under it.', 'Fold with both routes drawn. Which folded route is outside the other?', 'Keep only the route round the two bottom corners.'],
    parent: {
      notice: 'Whether your child pulls the route tight to the corners, and how they decide between over and under.',
      prompt: 'How do you know a route with different bends can’t be shorter?',
      explanation: 'Under the block: √5 + 4 + √5 ≈ 8.47, round the corners 1 below the line through A and B. Over: √8 + 4 + √8 ≈ 9.66, round corners 2 above it. Folding the top route over the line puts it 2 below, outside the bottom route, and of two routes bulging the same way the outer one is longer. Routes round three corners are longer still.',
      extension: 'Move the block so that over and under need the same rope.',
      connection: 'Shortest paths round convex obstacles are taut strings that bend only at the obstacle’s corners (visibility graphs).'
    },
    provenance: 'Week 21 encore Problem 4 (the shortest route round a rectangle), same rectangle and dots.'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Round the block again',
    parameters: {mode: 'block', view: [0, 0, 8, 6], rect: [2, 1, 6, 5], axis: 3, dots: {A: [0, 3], B: [8, 3]}},
    objective: 'Keep every shortest route from A to B round the block, then press That’s all.',
    visibleObjective: 'Keep every shortest route round the block.',
    controls: 'A route goes in straight pieces from A to B, bending only at corners of the block. It may run along the block’s edge but never through it. Tap corners in order to bend the route there; tap the last corner again to take it back. Press Keep to put the route on the shelf, and tap a kept route to take it off. Fold flips the routes over the line through A and B, and Unfold flips them back. After folding, press That’s all when every shortest route is kept. A wrong claim is refused, and the claim stays off until the shelf changes.',
    idea: 'With the block centred on the line through A and B, the fold carries the route over the top exactly onto the route underneath, so two routes tie for shortest.',
    prerequisites: 'Shortest routes puzzle 11.',
    hints: ['Compare with the last puzzle. What changed?', 'Fold. Where does the route over the top land?', 'Keep the route round the two top corners and the route round the two bottom corners.'],
    parent: {
      notice: 'Whether your child expects one answer, as in the last puzzle, and checks before pressing That’s all.',
      prompt: 'Can two different routes both be shortest?',
      explanation: 'The block now reaches 2 above and 2 below the line through A and B. Over and under are mirror images across that line, each √8 + 4 + √8 ≈ 9.66, and every route round three corners is longer. So exactly two routes are shortest.',
      extension: 'Move A up by one. Which route wins, and why?',
      connection: 'A symmetry of the problem maps shortest routes to shortest routes; when the shortest route is not symmetric itself, it comes in a pair.'
    },
    provenance: 'Week 21 encore Problem 5 (every shortest route; can routes tie?), with the rectangle stretched down one so that A and B sit at its middle height on the grid (the encore lifts A and B half a unit instead).'
  }
];

const playground = {
  id: 'folds-playground',
  number: 0,
  title: 'Shortest routes playground',
  band: 'playground',
  difficulty_level: 'playground',
  parameters: {mode: 'playground', view: [0, -4, 11, 4], line: river(0, 11), dots: {A: [2, 3], B: [9, 2]}, place: [0, 1, 11, 4], start: 4},
  objective: 'Slide the point where both routes touch the river, and move A and B.',
  visibleObjective: '',
  controls: 'C is B flipped over the river. Both routes, A to B and A to C, touch the river at the same point. Slide along the river, or tap it, to move that point; the arrow keys move it too. Tap A or B to pick it up, then tap a point above the river to put it there. Fold flips B’s side of the route over the river, and Unfold flips it back.',
  idea: 'B and its mirror image C need the same rope through every contact, so the shortest route to B is the straight line to C.',
  prerequisites: 'None.',
  hints: ['Slide the contact. Is one route ever longer than the other?', 'Press Fold. Where does B’s route land?', 'Find the contact where the route to C is straight.'],
  parent: {
    notice: 'Whether your child sees that the two routes always use the same rope.',
    prompt: 'Why are the routes to B and to C always the same length?',
    explanation: 'C is B’s mirror image in the river, so the second legs M–B and M–C are mirror images, the same length, wherever M is. The route to C is shortest when it is straight, so the route to B is too.',
    extension: 'Put the contact where the route from A to C is straight. Then move A. Does the best contact move?',
    connection: 'The reflection principle behind Heron’s problem.'
  },
  provenance: 'Week 21 K–1 Problem 3 and Grades 2–3 Problem 2 (routes to B and to C touching at the same spot), with the contact slid rather than redrawn, and Week 21 K–1 Problem 1 (two routes with the same string).'
};

// The answer each puzzle must have, computed with the mechanic; the
// validator recomputes it by brute force.
export function answers(item) {
  const q = item.parameters;
  if (q.mode === 'route') {
    if (q.move) return {places: placeSolutions(q).map(s => ({at: s.at, contacts: s.contacts.map(([n, d]) => d === 1 ? n : null)}))};
    const contacts = q.routes.map((_, i) => { const [n, d] = bestContact(q.line, ...routeOf(q, {}, i)); return d === 1 ? n : null; });
    if (q.claim === 'less') {
      const ropes = q.routes.map((_, i) => ropeSquared(q.line, ...routeOf(q, {}, i)));
      return {contacts, choose: ropes[0] < ropes[1] ? 0 : 1, ropes};
    }
    return {contacts};
  }
  if (q.mode === 'every') return {starts: everyAnswer(q)};
  if (q.mode === 'walls') {
    const first = wallsWinner(q), best = wallsBest(q, first), other = wallsBest(q, first === 'lower' ? 'upper' : 'lower');
    return {first, touches: best.at.map(([n, d]) => d === 1 ? n : null), rope: best.rope, otherRope: other.rope};
  }
  return {routes: blockRoutes(q).shortest};
}

const EXPECT = {
  1: {contacts: [5]}, 2: {contacts: [7]}, 3: {contacts: [3]}, 4: {contacts: [7, 4], choose: 0},
  5: {starts: [[0, 3], [2, 2], [4, 1]]}, 6: {places: [[0, 4], [6, 4]]}, 7: {places: [[8, 1], [9, 2], [10, 3], [11, 4]]}, 8: {contacts: [9]},
  9: {starts: [[6, 2], [9, 4]]}, 10: {first: 'lower', touches: [3, 9]}, 11: {routes: [[0, 1]]}, 12: {routes: [[0, 1], [3, 2]]}
};
const check = (item, solution) => {
  const want = EXPECT[item.number], q = item.parameters;
  for (const [key, value] of Object.entries(want)) {
    const got = key === 'places' ? solution.places.map(s => s.at) : key === 'routes' ? [...solution.routes].map(r => JSON.stringify(r)).sort().map(r => JSON.parse(r)) : solution[key];
    if (JSON.stringify(got) !== JSON.stringify(value)) throw new Error(`folds-${item.number}: ${key} is ${JSON.stringify(got)}, expected ${JSON.stringify(value)}`);
  }
  if (solution.contacts?.includes(null) || solution.touches?.includes(null) || solution.places?.some(s => s.contacts.includes(null))) throw new Error(`folds-${item.number}: a best contact is off the grid`);
  if (q.mode === 'route' && q.move && solution.places.some(s => s.at.every((v, i) => v === q.dots[q.move][i]))) throw new Error(`folds-${item.number}: solved at the start`);
  if (q.mode === 'walls' && solution.rope === solution.otherRope) throw new Error(`folds-${item.number}: the orders tie`);
};

export const puzzles = [...authored.map(item => {
  const solution = answers(item);
  check(item, solution);
  const q = item.parameters, bonus = q.mode === 'walls' || q.mode === 'block' || item.number === 8;
  return {
    id: `folds-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    band: 'all',
    difficulty_level: item.difficulty_level,
    mechanic: 'folds',
    libraryFamily: 'billiard',
    group: 'Shortest routes',
    familyTitle: 'Mirror Couriers',
    revision: 1,
    parameters: q,
    objective: item.objective,
    visibleObjective: item.visibleObjective ?? item.objective,
    instruction: item.objective,
    controls: item.controls,
    rules: rulesFor(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: bonus ? [...new Set([...BONUS_IDS, ...SOURCE_IDS])] : SOURCE_IDS},
    solution,
    provenance: item.provenance,
    sourceDocument: 'docs/folds/README.md'
  };
}), {
  ...playground,
  mechanic: 'folds',
  libraryFamily: 'billiard',
  familyTitle: 'Mirror Couriers',
  revision: 1,
  instruction: playground.objective,
  rules: RULES.route.slice(0, 2),
  parent: {...playground.parent, sourceIds: SOURCE_IDS},
  solution: null,
  sourceDocument: 'docs/folds/README.md'
}];

export const pack = {title: 'Mirror Couriers shortest routes', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/folds/folds.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.parameters.mode, JSON.stringify(p.solution));
}
