// Authoring list for Moving piles (worksheet Week 99). Lays out the maps,
// computes every least work, design count and the farthest cards with the
// mechanic's own methods, checks them against the table in
// docs/piles/README.md, records a solution witness for each puzzle (played
// through the move rules), and writes dist/families/piles/piles.json.
// Run: node scripts/build-piles.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {leastWork, pilesFrom, replay, samePiles, designStarts, farthest, planSteps, shapeOf, STACK} from '../dist/families/piles/piles.js';
import {NODE_R} from '../dist/graph-board.js';

const r2 = n => Number(n.toFixed(2));
// --- Maps --------------------------------------------------------------------
// Board units: 100 wide and 100 / aspect high; a pile of four stacks about 28
// units from its dot (FIRST + 3 SPACE + RING in piles.js, about 30).
// A line is only as tall as its tallest pile can be (`slots` counters).
function line(n, slots = 4) {
  const h = STACK.first + (slots - 1) * STACK.space + STACK.ring + NODE_R + 3.2, aspect = r2(100 / h), y = r2((h - NODE_R - 1.6) / (100 / aspect) * 100), x0 = n === 6 ? 8 : 10, dx = (100 - 2 * x0) / (n - 1);
  return {title: 'Line', shape: 'line', word: 'bin', aspect, ...(slots === 4 ? {} : {slots}), nodes: Object.fromEntries(Array.from({length: n}, (_, i) => [String(i), [r2(x0 + i * dx), y]])), roads: Array.from({length: n - 1}, (_, i) => [String(i), String(i + 1)])};
}
// Six bins round a hexagon, 0 on the left and the numbers going clockwise;
// piles stack straight out from the middle.
function ring(n = 6, aspect = 1.14, R = 19) {
  const h = 100 / aspect, nodes = {}, out = {};
  for (let i = 0; i < n; i++) {
    const deg = 180 - i * 360 / n, t = deg * Math.PI / 180;
    nodes[String(i)] = [r2(50 + R * Math.cos(t)), r2((h / 2 - R * Math.sin(t)) / h * 100)];
    out[String(i)] = ((deg % 360) + 360) % 360;
  }
  return {title: 'Ring', shape: 'ring', word: 'bin', aspect, nodes, out, roads: Array.from({length: n}, (_, i) => [String(i), String((i + 1) % n)])};
}
// The worksheet's three-leaf star: A upper left, B upper right, C below, O in
// the middle; leaves stack away from O and O stacks upward between A and B.
function star(aspect = 1.13, L = 26) {
  const h = 100 / aspect, oy = 30.5, at = deg => { const t = deg * Math.PI / 180; return [r2(50 + L * Math.cos(t)), r2((oy - L * Math.sin(t)) / h * 100)]; };
  return {title: 'Star', shape: 'star', word: '', aspect, nodes: {A: at(150), O: [50, r2(oy / h * 100)], B: at(30), C: at(270)}, out: {A: 150, O: 90, B: 30, C: 270}, roads: [['O', 'A'], ['O', 'B'], ['O', 'C']]};
}
const LINE6 = line(6), LINE6_2 = line(6, 2), LINE5 = line(5), RING6 = ring(), STAR = star();
const P = (m, list) => pilesFrom(m, list.split(''));

// --- Copy --------------------------------------------------------------------
const SOURCES = ['piles-week99', 'piles-card99', 'piles-peyre-cuturi'];
const MOVE_RULES = [
  'Move one counter at a time along a road to the next place. Each move costs 1.',
  'Places hold any number of counters, and counters may pass through any place. Any counter can fill any ring.',
  'Fill every ring, with no counter left over, using no more moves than the dots show.'
];
const RULES = {
  move: MOVE_RULES,
  design: [
    'Put every counter on the map first. Then move counters one at a time along the roads to fill the rings.',
    'Places hold any number of counters. Any counter can fill any ring.',
    'Solved when filling the rings takes exactly the moves the dots show, and no plan from your start could take fewer.'
  ],
  cards: [
    'Each card has four counters on bins 0 to 4, and their bin numbers add to 8.',
    'Tap one card for the counters and another for the rings, then fill the rings, one counter along one road at a time.',
    'Press Best when you think no two cards take more moves. Best checks that you used the fewest moves for your pair, and that no other pair needs more.'
  ]
};
const SLIDE = 'Tap a pile to pick up a counter, then tap a place joined to it to move the counter there. Or slide a counter along the roads: each road it crosses is one move.';
const CONTROLS = {
  move: `${SLIDE} The dots show how many moves you have; extra moves turn red. Undo takes back one move.`,
  design: `Tap places to put the counters down; the row shows how many are left. Then move them: ${SLIDE.charAt(0).toLowerCase()}${SLIDE.slice(1)} The dots show how many moves the start must need. Undo takes back a move or a counter.`,
  cards: `Tap a card for the counters, then another for the rings; tap a card again to start a new pair. ${SLIDE} The dots count your moves. Press Best to claim the pair.`
};
const OBJECTIVES = {
  move: q => `Fill the rings in ${q.budget} moves.`,
  design: q => `Start the counters where filling the rings takes ${q.exact} moves and no fewer.`,
  cards: () => 'Which two cards are the most moves apart?'
};
const VISIBLE = {move: () => '', design: OBJECTIVES.design, cards: OBJECTIVES.cards};
const PREREQUISITES = {
  move: 'Count to about 10 and compare. The move dots do the counting; a grown-up can count moves aloud with K–1 children. Saying why no plan uses fewer is for older children with a grown-up.',
  design: 'Count small distances and add them; plan before moving. Grades 2–3 and up, or younger children with a grown-up.',
  cards: 'Compare several pairs and keep track of which were tried. Grades 4–5, or keen younger children with a grown-up.'
};

// --- Puzzles -----------------------------------------------------------------
const move = (map, start, target, budget) => ({mode: 'move', map, start: P(map, start), target: P(map, target), budget});
const design = (map, target, count, exact, starts) => ({mode: 'design', map, target: P(map, target), count, exact, starts});
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two counters', q: move(LINE6_2, '03', '12', 2),
    idea: 'Each counter can take the ring next to it; sending them past each other wastes moves.',
    hints: ['Which ring is nearest each counter?', 'The counter on 0 can fill ring 1, and the counter on 3 can fill ring 2.', 'Move a counter from 0 to 1 and from 3 to 2.'],
    parent: {notice: 'Sending the counter on 0 to ring 2 and the counter on 3 to ring 1 also fills the rings, but takes 4 moves.', prompt: 'Why do two moves fill these rings, and why can’t one?', explanation: 'Counters are interchangeable, so a counter fills whichever ring it reaches. 0 → 1 and 3 → 2 cost 1 each. The crossed plan, 0 → 2 and 3 → 1, costs 4: both counters cross the road between 1 and 2, in opposite directions, and those two crossings achieve nothing. One move cannot do it, because two places hold a counter and no ring.', extension: 'Put both counters on 0 and the rings on 2 and 4. How few moves now? (6.)', connection: 'Least work is the earth mover’s distance between two piles. Crossing traffic is always wasted, which is why matching counters to rings in order, first to first, is best on a line.'},
    provenance: 'Week 99, Grades 2–3 Problem 1, second pair (03 → 12).'},
  {number: 2, level: 'easy', title: 'Three from one end', q: move(LINE6, '0005', '1234', 7),
    idea: 'Three counters must leave bin 0, and the counter on 5 needs to go only one step.',
    hints: ['How many counters must cross the road from 0 to 1?', 'Three of the rings are to the right of 0, and bin 5 has a counter but no ring.', 'Send the counters on 0 to 1, 2 and 3, and the counter on 5 to 4.'],
    parent: {notice: 'Three counters must cross the first road, two the second, one the third, none the fourth, and one the last, going left.', prompt: 'Could any plan use fewer than 7 moves? How do you know?', explanation: 'Cover everything right of a road and compare. Left of the road from 0 to 1 there are 3 counters and no ring, so at least 3 counters must cross it to the right. The same count gives 2, 1, 0 and 1 (to the left) for the other roads, so every plan needs at least 3 + 2 + 1 + 0 + 1 = 7 moves. Sending 0 → 1, 0 → 2, 0 → 3 and 5 → 4 costs 1 + 2 + 3 + 1 = 7, so 7 is the least.', extension: 'Is there a different best plan, not just the same trips in another order? (No: here the best matching is the only one.)', connection: 'The gap bound: on a line the net number of counters crossing each road is forced (counters minus rings to its left), so the sum is a lower bound, and matching in order meets every road’s count at once. The bound and the plan together certify the least work.'},
    provenance: 'Week 99, Grades 2–3 Problem 2 first pair and Grades 4–5 Problem 1 first pair (0005 → 1234).'},
  {number: 3, level: 'easy', title: 'Nearest first', q: move(LINE6_2, '03', '25', 4),
    idea: 'The shortest single trip, 3 to 2, is a trap: it leaves the counter on 0 to go all the way to 5.',
    hints: ['Try a plan and watch the dots. Does the quickest first trip help?', 'If the counter on 3 takes ring 2, the counter on 0 must go all the way to 5.', 'Move the counter on 0 to 2 and the counter on 3 to 5.'],
    parent: {notice: 'Filling the nearest ring first (3 → 2, one move) leaves 0 → 5, five moves: 6 in all.', prompt: 'The rule “always make the shortest trip” used 6 moves here. What went wrong?', explanation: 'The trips 0 → 2 and 3 → 5 cost 2 + 2 = 4. Nearest first takes 3 → 2 (1 move) and then has only 0 → 5 left (5 moves), 6 in all. Left of the road from 2 to 3 there is one counter and one ring, so no counter needs to cross it, yet the rule sends one across. The road counts 1, 1, 0, 1, 1 add to 4.', extension: 'With counters on 0 and 4 and rings on 2 and 5, does nearest first work? (Yes: 4 → 5, then 0 → 2, 3 moves, the least.)', connection: 'Greedy choices can fail in transport problems; on a line, matching in sorted order is always optimal.'},
    provenance: 'Week 99, Problem 3 in both bands (03 → 25 and the shortest-delivery rule).'},
  {number: 4, level: 'easy', title: 'Star roads', q: move(STAR, 'AAC', 'OBB', 5),
    idea: 'On a star, each road must carry the difference between the counters and the rings at its leaf.',
    hints: ['Look at each leaf. How many counters must leave it, or arrive?', 'A has two counters and no ring, B needs two, and C has a counter and no ring.', 'Move both counters from A through O to B, and the counter on C to O.'],
    parent: {notice: 'Two counters must leave A, two must reach B and one must leave C, and each crosses its own leaf’s road.', prompt: 'Why can’t 4 moves be enough?', explanation: 'Each leaf hangs on one road. Two counters must cross A’s road (two counters, no ring), two must cross B’s (two rings, no counter) and one must cross C’s: at least 2 + 2 + 1 = 5 moves. Moving both A counters to B through O (4) and C’s counter to O (1) uses exactly 5.', extension: 'Draw a start and rings with three counters each that need 6 moves. Why is 6 the most?', connection: 'On a tree, removing a road splits the places in two, and the imbalance on one side must cross it; the sum over the roads is the exact least work.'},
    provenance: 'Week 99, Grades 2–3 Problem 5 first pair and Grades 4–5 Problem 5 first pair (A2 C1 → O1 B2).'},
  {number: 5, level: 'medium', title: 'Both ways', q: move(LINE6, '1144', '0225', 5),
    idea: 'Counters in one pile can go different ways: from each pile one goes left and one goes right.',
    hints: ['Which rings will the two counters on 1 fill?', 'Match in order: the first counter to the first ring, the second to the second, and so on.', 'Move 1 to 0, 1 to 2, 4 to 2 and 4 to 5.'],
    parent: {notice: 'Each road is crossed exactly once: left, right, left, left, right.', prompt: 'Why should the two counters on 1 split up?', explanation: 'Match counters to rings in order: 1 → 0, 1 → 2, 4 → 2, 4 → 5, costing 1 + 1 + 2 + 1 = 5. Counters minus rings to the left of each road are −1, 1, −1, −1, 1, so every road must be crossed at least once and 5 is the least. Sending both counters on 1 to the right means a counter from 4 must come back to 0, crossing roads that other counters cross the other way.', extension: 'Find the least work from 2222 to 0134. (6.)', connection: 'Matching in order never sends two counters across one road in opposite directions, so it meets every forced road count.'},
    provenance: 'Week 99, Grades 2–3 Problem 2 second pair and Grades 4–5 Problem 1 second pair (1144 → 0225).'},
  {number: 6, level: 'medium', title: 'All to the middle', q: design(LINE6, '2222', 4, 7, 19),
    idea: 'With every ring on 2, the least work is the distance of each counter from 2, added up.',
    hints: ['How far is each bin from 2?', 'A counter on 0 is 2 moves from bin 2, and a counter on 5 is 3; make the distances add to 7.', 'For example, put three counters on 0 and one on 3.'],
    parent: {notice: 'Any start whose distances to bin 2 add to 7 works: 19 starts do.', prompt: 'How can you tell the least work before you move anything?', explanation: 'Every counter must reach bin 2, and a counter on bin x needs at least |x − 2| moves however the others go. So the least work is the sum of the distances, and any start whose distances add to 7 works, such as 0003 (2 + 2 + 2 + 1) or 0115 (2 + 1 + 1 + 3). Of the 126 four-counter starts, 19 need exactly 7 and 16 need exactly 4.', extension: 'Find a start that needs exactly 4. What is the most a start can need? (12, all four on 5.)', connection: 'With every ring in one place, transport cost is the sum of distances to that place.'},
    provenance: 'Week 99, Grades 2–3 Problem 4 (a fixed 2222 target; starts with least work 4 and 7).'},
  {number: 7, level: 'medium', title: 'Three on A', q: move(STAR, 'AAAB', 'AOCC', 5),
    idea: 'Two counters must leave A, one must leave B, and two must reach C: 2 + 1 + 2.',
    hints: ['Which leaves have too many counters, and which too few?', 'A has two extra, B one extra, and C needs two.', 'Move a counter from A to O, another from A through O to C, and the counter on B through O to C.'],
    parent: {notice: 'The leaves’ imbalances are 2 at A, 1 at B and 2 at C, and they add to 5.', prompt: 'Can you know the least work before moving?', explanation: 'Each leaf’s road must carry the leaf’s extra counters out, or its missing counters in: 2 across A’s road, 1 across B’s and 2 across C’s. So at least 5 moves are needed, and A → O, A → O → C and B → O → C use exactly 5. O needs no count of its own: whatever crosses into O either stays to fill its ring or goes on along another road.', extension: 'Does adding the leaves’ imbalances give the least work for every start and target on these roads? (Yes, whenever the totals are equal.)', connection: 'The cut formula on a tree: removing a road splits the tree, and the imbalance on one side is exactly what that road carries in a best plan.'},
    provenance: 'Week 99, Grades 4–5 Problem 5 second pair (A3 B1 → A1 O1 C2).'},
  {number: 8, level: 'medium', title: 'The longest trips', q: design(STAR, 'BBC', 3, 6, 1),
    idea: 'Six is the most three counters can need: each crosses two roads, so each must start on a leaf without a ring.',
    hints: ['How many roads can one counter need to cross on this star?', 'Each counter crosses at most two roads, so all three must go from leaf to leaf.', 'Put all three counters on A.'],
    parent: {notice: 'Only one start works: all three counters on A.', prompt: 'Why can’t a counter start on O, B or C?', explanation: 'Any two places on the star are at most two roads apart, so three counters need at most 6 moves, and exactly 6 only if every counter crosses two roads: each starts on a leaf and ends on another leaf, and none starts on O. A counter on B could stay and fill a ring there, and a counter on C could too, so they would need fewer. That leaves A: A3 → B2 C1 needs 2 + 2 + 2 = 6.', extension: 'Choose your own rings for three counters and find every start that needs 6. (Rings on three different places allow none; rings all on one leaf allow four starts.)', connection: 'The star’s diameter is 2, so n counters need at most 2n moves; equality forces every counter onto a leaf-to-leaf path.'},
    provenance: 'Week 99, Grades 2–3 Problem 5’s invention (three counters needing 6), with the rings fixed so that the start is unique.'},
  {number: 9, level: 'hard', title: 'Exactly five', q: design(LINE6, '2345', 4, 5, 14),
    idea: 'Least work matches counters to rings in order, so a counter far from one ring may still have a near one.',
    hints: ['Place the counters, then fill the rings first counter to first ring, second to second.', 'Counters on 0 and 0 would fill rings 2 and 3 for 2 + 3 moves.', 'For example, put counters on 0, 0, 4 and 5.'],
    parent: {notice: 'A counter on 0 does not have to travel to 5: in order it takes ring 2, and the counters to its right move along one ring each.', prompt: 'You put a counter far away, and the app said fewer moves would do. Why?', explanation: 'The least work from any start comes from matching counters to rings in order. With rings on 2, 3, 4 and 5, the start 0045 needs 2 + 3 + 0 + 0 = 5. A start such as 0345 looks like one trip of 5 (0 to 5), but in order it is 0 → 2 and nothing else: 2 moves. 14 starts need exactly 5.', extension: 'Play it as the worksheet’s partner game: one player sets four rings, the other places counters that need exactly 5. Can a target make it impossible? (No: every target has between 6 and 28 such starts.)', connection: 'On a line the earth mover’s distance is the area between the two running totals, and sorted matching attains it, so least work is computed, not searched for.'},
    provenance: 'Week 99, Grades 2–3 Problem 6 (the exactly-5 partner game), with the rings fixed on 2, 3, 4 and 5.'},
  {number: 10, level: 'hard', title: 'Farthest cards', q: {mode: 'cards', map: LINE5, cards: ['0044', '0134', '0224', '0233', '1124', '1133', '1223', '2222'].map(s => P(LINE5, s)), best: 8},
    idea: 'On these cards at most two counters ever need to cross a road, so no pair can need more than 4 × 2 = 8.',
    hints: ['Try a pair and watch the dots. Which cards look most different?', 'A spread-out card and a bunched-up card are far apart.', 'Pick the card with two counters on 0 and two on 4, and the card with all four on 2.'],
    parent: {notice: 'Only one pair needs 8: two on 0 and two on 4, against four on 2.', prompt: 'How do you know no pair needs more than 8?', explanation: 'On every card, bins 0 and 1 together hold 0 to 2 counters, and bins 0 to 2 (and 0 to 3) hold 2 to 4. So between two cards the counters left of any road differ by at most 2, and at most 2 must cross it: a pair needs at most 4 × 2 = 8. 0044 → 2222 sends two counters right across the first two roads and two left across the last two, 8 moves, and it is the only one of the 28 pairs that reaches 8. Both cards have the same position total, so equal totals do not make piles close.', extension: 'Which pairs need only 2? Which card is closest to all the others?', connection: 'Least work is a distance on piles (the Wasserstein-1 distance times the number of counters): zero only for equal piles, symmetric, and obeying the triangle rule. Equal centres of mass can still be far apart.'},
    provenance: 'Week 99, Grades 4–5 Problem 4 (the eight cards with position total 8; which two need the most work), with the review card’s prefix-count bound (fix 11).'},
  {number: 11, level: 'hard', title: 'Round the ring', q: move(RING6, '0000', '1245', 6),
    idea: 'On a ring a counter can go either way round: rings 5 and 4 are close to 0 going backwards.',
    hints: ['Which rings are nearest bin 0 if you go the other way round?', 'From 0, ring 5 is one step back and ring 4 two.', 'Move counters from 0 to 1, to 2, back to 5 and back to 4.'],
    parent: {notice: 'On a line the same piles need 12 moves; on the ring, 6.', prompt: 'Why can the ring do it in half the moves?', explanation: 'On the ring 0 is next to both 1 and 5. Sending counters 0 → 1, 0 → 2, 0 → 5 and 0 → 4 costs 1 + 2 + 1 + 2 = 6. On a line from 0 the trips are 1 + 2 + 4 + 5 = 12. No counter needs more than its distance to the nearest ring left for it, and here every trip goes the short way round.', extension: 'Where could four rings go so that four counters on 0 need the most moves? (All on 3: 12.)', connection: 'On a cycle no single road has a forced count, since counters could circle round. The least work is the line’s road counts with the best constant taken off every road, and the best constant is a median of the counts (here the counts 4, 3, 2, 2, 1, 0 give 6 with 2 taken off).'},
    provenance: 'Week 99, the review card’s App fit (a six-bin ring, 0000 → 1245, 6 against 12 on the line) and the guide’s closing remark that cycles need a different argument.'},
  {number: 12, level: 'hard', title: 'Halfway round', q: move(RING6, '012', '345', 5),
    idea: 'Sliding the whole pile three places round costs 9; sending the end counters opposite ways costs 5.',
    hints: ['Which ring is nearest the counter on 0? And the counter on 2?', 'The counter on 0 can go back to 5 and the counter on 2 forward to 3.', 'Move 0 to 5, 2 to 3, and the counter on 1 three steps to 4.'],
    parent: {notice: 'The counters go both ways round the ring.', prompt: 'Why is sliding all three counters round by three a waste?', explanation: 'Moving each counter three places costs 9. The ends can go the short way, 0 → 5 and 2 → 3 for 1 each, and the middle counter goes three places to 4, either way round: 5 in all. Several plans tie at 5. To see that 5 is least, take the line’s road counts (counters minus rings to the left): 1, 2, 3, 2, 1 and 0 on the road from 5 back to 0. On a ring any constant can be taken off every road, since counters could circle the other way; taking off 1 leaves 0, 1, 2, 1, 0, 1, and taking off 2 leaves 1, 0, 1, 0, 1, 2. Both total 5, and no constant gives less.', extension: 'With all three rings on 3, how many moves? (3 + 2 + 1 = 6.)', connection: 'Transport on a circle: the least work is the smallest total of |count − c| over a constant circulation c, attained at a median of the line’s road counts.'},
    provenance: 'New, for the review card’s ring: three counters halfway round (9 by sliding the pile, 5 by splitting it).'}
];

// The playground: free play on a line, a star and a ring.
const PLAYGROUND = {
  id: 'piles-playground', number: 0, title: 'Moving piles playground', band: 'playground', difficulty_level: 'playground', mechanic: 'piles', familyTitle: 'Moving piles', revision: 1,
  parameters: {mode: 'playground', maps: {line: LINE6, star: STAR, ring: RING6}},
  objective: 'Put down counters and rings, then fill the rings and count the moves.', visibleObjective: '', instruction: 'Put down counters and rings, then fill the rings and count the moves.',
  controls: 'Choose a map. With Counters, tap a place to add a counter; with Rings, tap a place to add a ring; with Move, tap a pile and then a place joined to it, or slide a counter along the roads. The dots count the moves since anything was last added. Clear empties the map.',
  rules: ['Each move carries one counter along one road.', 'A place holds up to 6 counters and 6 rings, and the map up to 12 of each.'],
  idea: 'Free play with piles, rings and moves on a line, a star and a ring.',
  prerequisites: 'None. A grown-up can set up a pair from the worksheet or the puzzles.',
  hints: ['Put down two counters and two rings, then fill the rings.', 'Try the same piles on the line and on the ring.', 'Play the partner game: one player puts down rings, the other counters that need exactly 5 moves.'],
  parent: {notice: 'The move dots let children check a claimed least work by playing it out.', prompt: 'Can you fill these rings in fewer moves?', explanation: 'The playground has no goal and never counts as solved. It holds the worksheet’s exactly-5 partner game (Grades 2–3 Problem 6): one child sets four rings, the other places four counters that need exactly 5, and the moves check it; the least is found by matching counters to rings in order on the line, by leaf imbalances on the star, and with the best constant circulation on the ring.', extension: 'Make three arrangements A, B and C. Is the least work from A to B plus B to C ever less than straight from A to C? (Never: least work obeys the triangle rule; Grades 4–5 Problem 6.)', connection: 'Least work between piles is the earth mover’s distance on the map’s roads.', sourceIds: SOURCES},
  provenance: 'Week 99 materials: the line mat and the star board, with the review card’s ring.',
  sourceDocument: 'docs/piles/README.md'
};

// --- Checks and witnesses ----------------------------------------------------
// A witness plan: best steps from the start, carrying one counter on where it can.
function planFrom(m, start, target) {
  const log = [];
  let now = start;
  while (!samePiles(now, target)) {
    const step = planSteps(m, now, target, log.at(-1)?.[1] ?? null)[0];
    log.push(step); now = replay(m, start, log);
  }
  return log;
}
const out = PUZZLES.map(item => {
  const q = {...item.q}, m = q.map;
  assert.equal(shapeOf(m).ids.length, Object.keys(m.nodes).length, `${item.title}: map`);
  if (q.mode === 'move') {
    assert.equal(q.start.reduce((a, b) => a + b), q.target.reduce((a, b) => a + b), `${item.title}: equal totals`);
    assert.equal(leastWork(m, q.start, q.target), q.budget, `${item.title}: the budget is the least work`);
    q.witness = planFrom(m, q.start, q.target);
    assert.equal(q.witness.length, q.budget);
  }
  if (q.mode === 'design') {
    const starts = designStarts(m, q.target, q.count, q.exact);
    assert.equal(starts.length, q.starts, `${item.title}: ${starts.length} starts need exactly ${q.exact}`);
    const start = starts[0], placed = shapeOf(m).ids.flatMap((id, i) => Array(start[i]).fill(id));
    q.witness = {placed, plan: planFrom(m, start, q.target)};
    assert.equal(q.witness.plan.length, q.exact);
  }
  if (q.mode === 'cards') {
    const far = farthest(m, q.cards);
    assert.equal(far.best, q.best, `${item.title}: the farthest pair`);
    assert.deepEqual(far.pairs, [[0, 7]], `${item.title}: only 0044 and 2222`);
    q.witness = {pair: [0, 7], plan: planFrom(m, q.cards[0], q.cards[7])};
  }
  const id = `piles-${String(item.number).padStart(2, '0')}`, objective = OBJECTIVES[q.mode](q);
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'piles', familyTitle: 'Moving piles', revision: 1,
    parameters: q,
    objective, visibleObjective: VISIBLE[q.mode](q), instruction: objective,
    controls: CONTROLS[q.mode], rules: RULES[q.mode],
    idea: item.idea, prerequisites: PREREQUISITES[q.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    provenance: item.provenance,
    sourceDocument: 'docs/piles/README.md'
  };
});

const pack = {
  title: 'Moving piles',
  version: 1,
  families: [{id: 'piles', title: 'Moving piles', mathematics: 'Counters sit in piles on the places of a map, and rings mark a fixed target with the same number of places. A move carries one counter along one road and costs 1; the least work is the earth mover’s distance between the two piles. On a line every road must carry, net, the counters minus the rings to its left, so the sum of those counts is a lower bound, and matching counters to rings in order meets every count at once; nearest-first can fail. On a tree each road carries the imbalance on one side of it, exactly. Least work is a distance: equal position totals can still be far apart (two on 0 and two on 4 against four on 2, 8 moves). On a ring no single road is forced, and the best plan takes the median constant circulation off the line’s counts.', rules: MOVE_RULES, sourceIds: SOURCES}],
  sources: [
    {id: 'piles-week99', title: 'Bellingham Math Circle — Week 99: Moving piles (worksheets, materials and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-99', kind: 'worksheet'},
    {id: 'piles-card99', title: 'Bellingham Math Circle — Week 99 review card (Moving piles), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-99.md', kind: 'worksheet'},
    {id: 'piles-peyre-cuturi', title: 'Gabriel Peyré and Marco Cuturi — Computational Optimal Transport, §2.6 (one-dimensional transport) and §6.3 (transport on graphs)', url: 'https://arxiv.org/abs/1803.00567', kind: 'research'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
await writeFile(new URL('../dist/families/piles/piles.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.budget ?? p.parameters.exact ?? p.parameters.best}${p.parameters.starts ? ` (${p.parameters.starts} starts)` : ''}`).join('\n'));
