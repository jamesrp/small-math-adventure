// Authoring list for Portal rooms (worksheet Week 41). Builds each room as a
// surface for the shared portal board, computes every puzzle's answers,
// counts and witness with the mechanic's own searches, checks them against
// the table in docs/portals/README.md, and writes
// dist/families/portals/portals.json. Run: node scripts/build-portals.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {surfaceOf, stepsOf} from '../dist/portal-board.js';
import {roomFromRows as room} from '../dist/portal-board.js';
import {reachIn, canReach, exactPossible, tradePossible, tradeRoute, shrinkPossible, editReach, tripLift, copyIndex, checkerboard, legal} from '../dist/families/portals/portals.js';

const THREE = ['ABC', 'DHE', 'FGI'], FOUR = ['ABCD', 'EFGH', 'IJKL', 'MNOP'];
export const ROOMS = {
  torus3: room(THREE),
  plain3: room(THREE, {wrapX: false, wrapY: false}),
  tube3: room(THREE, {wrapY: false}),
  torus4: room(FOUR)
};
// Every word of k steps, for the counts in the notes.
const words = k => k === 0 ? [''] : words(k - 1).flatMap(w => [...'RULD'].map(c => w + c));

const RULES = {
  torus: ['The room’s right edge is glued to its left edge, and its top to its bottom. Matching marks show which edges meet.', 'A step off one edge comes back in through the matching edge, in the same row or column.', 'The unrolled view repeats the room in every direction, so a trip goes straight on into the next copy. The first copy is shaded.'],
  plain: ['This room has no portals: its edges are walls.'],
  every: 'Each trip of exactly two steps rings the square it ends on, and the pawn goes back to the start. Press That’s all when no other square can be reached.',
  exact: n => `The beads count the steps. The trip must end on the start square, in any copy, after exactly ${n} steps. Press Can’t if no trip can.`,
  stars: 'Stand on each star in the unrolled view.',
  back: 'Then come back to H in the first copy, where the ring is.',
  trade: 'Both pawns take every step. Trade places: the yellow pawn onto the blue ring and the blue pawn onto the yellow ring. Press Can’t if they never can.',
  shrink: 'Tap a corner of the trip to slide it across its square: its two steps swap. Tap the tip of a step that goes straight back to erase both steps.',
  nothing: 'Shrink the trip to nothing, staying at H. Press Can’t if it never can.',
  turn: 'Turn the trip into the dashed trip.'
};
const CONTROLS = {
  walk: 'Tap an arrow, or a square next to the pawn in either view, or slide the pawn from square to square. Arrow keys work too. Undo takes back a step.',
  trade: 'Tap an arrow, or a square next to either pawn, or slide a pawn: both pawns take the same step. Arrow keys work too. Undo takes back a step.',
  shrink: 'Tap a corner to slide it, or the tip of a step that goes straight back to erase it. Tab and Enter work too. Undo takes back a move.',
  playground: 'Choose a room. Tap an arrow, or a square next to the pawn in either view, or slide the pawn. Arrow keys work too. Restart clears the trail.'
};
const PREREQ = {
  walk: 'Move a pawn one square at a time and keep its row or column at a portal. No reading; a grown-up can read How to play.',
  count: 'Count steps up to five and remember where the pawn started.',
  trade: 'Watch two pawns at once. No reading or arithmetic.',
  shrink: 'Read a trip as a row of arrows and see where two steps swap or cancel. Grades 4–5 in the worksheet; younger children can play it as pushing corners.',
  every: 'Decide when nothing is left to find.'
};
const sources = ['portals-week41', 'portals-card41', 'portals-hatcher'];

// The table in docs/portals/README.md.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Corner copy', mode: 'walk', room: 'torus3', home: 'H', stars: [{s: 'H', copy: [1, 1]}], check: {shortest: 6}, witness: 'RRRUUU', kind: 'walk',
    objective: 'Walk the pawn to the star in the unrolled view.', visible: '',
    idea: 'Walking off the room’s right edge brings the pawn back in on the left, while the unrolled view carries it straight on into the next copy.',
    hints: ['Watch where the pawn comes back in when it steps off the right edge of the room.', 'The star is three steps right and three steps up from H in the unrolled view.', 'Step right three times and up three times.'],
    parent: {notice: 'Whether your child watches the room or the unrolled view, and whether a jump from the right edge to the left edge surprises them.', prompt: 'The pawn is back on H in the room. Is it back where it started in the unrolled view?', explanation: 'The room is three squares wide, and its right edge is glued to its left edge at the same height. Three steps right take H to E, then across the portal to D, then back to H; in the unrolled view the same three steps go straight on to the H of the next copy to the right. Three steps up do the same upward. So the star, the H one copy right and one copy up, is reached by any trip with three steps right and three up, in any order, and no shorter trip reaches it.', extension: 'In the playground, walk to the H two copies to the right. How often does the pawn stand on H in the room on the way? (Once, after three steps, and again at the end.)', connection: 'The unrolled view is the universal cover of the torus: the plane, with a copy of the room on each square of a lattice. A trip lifts to the plane once its starting copy is chosen.'},
    provenance: 'Week 41 grades 2–3 Problem 3 (the trip RRRUUU finishes in the copy up and to the right), turned from replaying a given trip into walking to a marked copy.'},
  {number: 2, level: 'easy', title: 'Every square in two', mode: 'every', room: 'torus3', home: 'H', steps: 2, check: {answers: 'ABCDHEFGI', plain: 5}, kind: 'every',
    objective: 'Find every square the pawn can reach from H in exactly two steps, then press That’s all.', visible: 'Find every square exactly two steps away.',
    idea: 'With portals, every square of a three-by-three room is exactly two steps from H, H itself included.',
    hints: ['Try going two steps the same way, off the edge of the room.', 'Two steps right go through E and across the portal to D.', 'H counts too: one step out and one step back.'],
    parent: {notice: 'Whether your child counts H itself (a step out and straight back), and whether they use the portals for B, D, E and G, which are one step from H on the board but need a portal to be exactly two.', prompt: 'In a room without portals, which squares could you reach in exactly two steps?', explanation: 'Two steps the same way cross a portal: RR reaches D, LL reaches E, UU reaches G and DD reaches B. Two steps in different directions reach the corners: RU is C, LU is A, LD is F, RD is I. A step out and back is H. That is all nine squares, so That’s all is right once all nine are ringed. In the room without portals (puzzle 7) only five squares are two steps away.', extension: 'Which squares are exactly three steps from H? (All nine again: RRR comes home, and every other square has a three-step trip.)', connection: 'On the torus Z/3 × Z/3, the two-step displacements (±2, 0), (0, ±2), (±1, ±1) and (0, 0) cover every residue pair, since 2 ≡ −1 mod 3.'},
    provenance: 'Week 41 K–1 Problem 2 (find every square you can reach in exactly two steps), with That’s all in place of a list.'},
  {number: 3, level: 'easy', title: 'Home in three', mode: 'walk', room: 'torus3', home: 'H', steps: 3, check: {homeTrips: 4, of: 64}, witness: 'RRR', kind: 'count',
    objective: 'Get back to H in exactly 3 steps.', visible: 'Get back to H in exactly 3 steps.',
    idea: 'A trip home with an odd number of steps has to go all the way round the room.',
    hints: ['Can the pawn come home without going off the edge?', 'Going off the edge of the room is part of going round it.', 'Go the same way three times.'],
    parent: {notice: 'Whether your child first tries out-and-back trips (they always take an even number of steps), and whether going all the way round the room comes as a surprise.', prompt: 'Why can’t a trip of three steps come home without crossing a portal?', explanation: 'On a board without portals, each step right must be undone by a step left and each step up by a step down, so a trip home has an even number of steps. With portals, three steps the same way go once round the room and come back: RRR, LLL, UUU and DDD. These four are the only three-step trips home, out of 64 three-step trips. In the unrolled view each ends at an H in a neighbouring copy, never the first.', extension: 'Find a trip home in exactly 6 steps that ends in the first copy, and one that ends in the copy up and to the right.', connection: 'A trip returns to H on the torus exactly when its displacement (x, y) has both parts divisible by 3; with three steps the only such displacements are (±3, 0) and (0, ±3).'},
    provenance: 'Week 41 K–1 Problem 3 (trips home in 3 steps) and grades 2–3 Problem 2 (exactly three steps; the complete list is RRR, LLL, UUU, DDD).'},
  {number: 4, level: 'easy', title: 'Trading places', mode: 'trade', room: 'torus3', pawns: ['H', 'E'], check: {possible: false}, kind: 'trade',
    objective: 'Give both pawns the same steps so that they trade places. Press Can’t if they never can.', visible: 'Trade places.',
    idea: 'Two pawns given the same steps keep the same gap in the unrolled view, so on a room three wide they can never trade.',
    hints: ['Watch the two pawns in the unrolled view as they move.', 'The blue pawn always stands one square to the right of the yellow pawn in the unrolled view.', 'When the yellow pawn reaches E, the blue pawn is on D, not H. Press Can’t.'],
    parent: {notice: 'Whether your child keeps trying new trips or notices that the pawns always stand side by side in the unrolled view, the blue one on the right.', prompt: 'When the yellow pawn gets to E, where is the blue pawn?', explanation: 'Every step moves both pawns the same way, so in the unrolled view the blue pawn always stays one square to the right of the yellow pawn, through every portal. For a trade the yellow pawn must end on E, which needs a net move of one square right (or one right and any whole number of rooms), and the blue pawn must end on H, which needs a net move of one square left. In a room three wide those differ: one right is two left, not one left. So the blue pawn lands on D whenever the yellow pawn is on E. A list of failed tries is not the reason; the fixed gap is.', extension: 'In a room four squares wide, put the pawns two squares apart in a row. Can they trade now? (Yes: two steps right. Puzzle 9 asks it in both directions.)', connection: 'The same steps act on the torus as a translation, and a translation that swaps two points must move each by a vector v with 2v ≡ 0: on Z/3 that forces v = 0.'},
    provenance: 'Week 41 K–1 Problem 4 (pawns on H and E with the same arrow steps: can they trade places?), with Can’t checked by the app.'},
  {number: 5, level: 'medium', title: 'Two stars and home', mode: 'walk', room: 'torus3', home: 'H', stars: [{s: 'H', copy: [1, 0]}, {s: 'H', copy: [0, 1]}], back: true, check: {shortest: 12}, witness: 'RRRUUULLLDDD', kind: 'walk',
    objective: 'Stand on both stars in the unrolled view, then come back to H in the first copy, where the ring is.', visible: 'Collect both stars, then come back to the ringed H.',
    idea: 'Coming back to H in the room is not the same as coming back to the first copy: a trip home can end in another copy, or visit others and return.',
    hints: ['Every star is on an H. Which H is home?', 'After the first star, the pawn is on H in the room but not in the first copy.', 'Right three, up three, left three, down three.'],
    parent: {notice: 'Whether your child thinks the pawn is home whenever it stands on H in the room, and uses the ring in the unrolled view to tell the first H from the others.', prompt: 'The pawn is on H. Is it home?', explanation: 'Each star is the H of a neighbouring copy: one to the right, one above. Stepping right three times reaches the first star, and then the pawn is on H in the room but one copy to the right in the unrolled view. The quickest trip is twelve steps, such as RRRUUULLLDDD (through the copy up and to the right) or RRRLLLUUUDDD (back through the first copy), because the stars are three steps from H and six steps from each other. Any trip that stands on both stars and ends on the ringed H works.', extension: 'Make a trip that visits the copy to the right and comes back to the ringed H without ever standing on another H. (RRLL works; so does RURDLL.)', connection: 'A loop at H lifts to a path from the H of the first copy to the H of copy (m, n); this trip’s lift ends where it began, so (m, n) = (0, 0), although it visits other copies.'},
    provenance: 'Week 41 grades 2–3 Problem 5 (a trip that visits a copy above and a copy to the right and finishes at the original H), with stars on the Hs of those copies.'},
  {number: 6, level: 'medium', title: 'Home in five', mode: 'walk', room: 'torus3', home: 'H', steps: 5, check: {homeTrips: 100, of: 1024}, witness: 'RRRRL', kind: 'count',
    objective: 'Get back to H in exactly 5 steps.', visible: 'Get back to H in exactly 5 steps.',
    idea: 'Five steps home take one lap round the room and one step out and back.',
    hints: ['Five is three and two more.', 'A lap round the room is three steps. What do two steps that cancel look like?', 'Go round the room once, then take one step out and one back.'],
    parent: {notice: 'Whether your child builds on puzzle 3 (a lap of three) and adds a pair that cancels, or searches step by step.', prompt: 'Why can’t a trip of five steps come home by going out and back only?', explanation: 'Out-and-back trips have an even number of steps, so a five-step trip home must go round the room. Its net move is three squares one way (a lap), with the two other steps cancelling: RRRUD, RURRD, RRRRL and so on, in any order. Two laps (six squares) or a lap each way across and up (three and three) take at least six steps. Of the 1,024 five-step trips, 100 come home: 25 for each of the four laps.', extension: 'Find a seven-step trip home. (A lap and two cancelling pairs, such as RRRRLUD.)', connection: 'The five-step displacements with both parts divisible by 3 are exactly (±3, 0) and (0, ±3): one generator of the fundamental group Z × Z, with a cancelling pair.'},
    provenance: 'Week 41 K–1 Problem 3 (trips from H back to H in 5 steps); the count is the review card’s.'},
  {number: 7, level: 'medium', title: 'No portals', mode: 'every', room: 'plain3', home: 'H', steps: 2, check: {answers: 'AHCFI'}, kind: 'every',
    objective: 'Find every square the pawn can reach from H in exactly two steps, then press That’s all.', visible: 'Find every square exactly two steps away.',
    idea: 'Without portals only five squares are exactly two steps from the middle: the corners and the middle itself.',
    hints: ['Without portals, two steps the same way run into a wall. Try two different ways.', 'Two steps in different directions reach a corner, and a step out and back reaches H.', 'H and the four corners: press That’s all.'],
    parent: {notice: 'Whether your child is ready to press That’s all with four squares unringed, and why B, D, E and G can’t be reached.', prompt: 'B is next to H. Why can’t a two-step trip end there?', explanation: 'Colour the board like a checkerboard with H dark. Every step changes the colour, so after two steps the pawn is on a dark square: H or a corner. Each of those has a trip (RL, RU, LU, RD, LD), and the light squares B, D, E and G never do. In the portal room (puzzle 2) the same colouring breaks at the portals, which join two squares of one colour, and all nine squares are reachable.', extension: 'In this room, which squares are exactly three steps from H? (Only the four light squares B, D, E, G.)', connection: 'The plain grid is bipartite; the 3 × 3 torus is not, because each row and column is a cycle of odd length.'},
    provenance: 'New: the review card’s fix 10 (the plain-board contrast: two steps reach five cells), played as Week 41 K–1 Problem 2 in a room without portals.'},
  {number: 8, level: 'medium', title: 'Shrink the loop', mode: 'shrink', room: 'torus3', home: 'H', trip: 'RRRUUULLLDDD', target: '', check: {possible: true, moves: 15}, kind: 'shrink',
    objective: 'Shrink the trip to nothing by sliding corners and erasing steps that go straight back.', visible: 'Shrink the trip to nothing.',
    idea: 'A trip that ends in the copy where it started can shrink to staying at H, one square slide or erased pair at a time.',
    hints: ['Push a corner of the loop inwards.', 'Slide the corners until a step right sits next to a step left, then erase them.', 'Nine slides and six erasures do it.'],
    parent: {notice: 'Whether your child pushes corners inward one square at a time, and spots a step that goes straight back once one appears.', prompt: 'Does any move change where the trip ends?', explanation: 'A slide swaps two neighbouring steps that turn a corner, moving the trip across one square; an erasure removes a step and its way back. Neither moves the ends. RRRUUULLLDDD goes round a block of nine squares and ends in the first copy. Sliding each of the three left steps past each of the three up steps (nine slides) gives RRRLLLUUUDDD, and then three right-left pairs and three up-down pairs erase, fifteen moves in all.', extension: 'Shrink it a different way: slide the up steps before the right steps first. Does it still take nine slides? (Yes: each slide crosses one of the nine squares inside the loop.)', connection: 'These moves are the homotopies of lattice paths with the squares filled in: a loop is null-homotopic on the torus exactly when its lift is a closed loop in the plane.'},
    provenance: 'Week 41 grades 4–5 Problem 4 (which trip can shrink all the way to staying at H: RRRUUULLLDDD).'},
  {number: 9, level: 'hard', title: 'Trading in the big room', mode: 'trade', room: 'torus4', pawns: ['F', 'P'], check: {possible: true, shortest: 4}, witness: 'RRDD', kind: 'trade',
    objective: 'Give both pawns the same steps so that they trade places. Press Can’t if they never can.', visible: 'Trade places.',
    idea: 'In a room four wide and four tall, pawns half a room apart across and up can trade.',
    hints: ['Try to trade them across first, then up and down.', 'Two steps right swap their columns.', 'Two steps right and two steps down.'],
    parent: {notice: 'Whether your child expects “never”, after puzzle 4, and whether they see the trade happen one direction at a time.', prompt: 'Why does two steps right swap the columns here but not in puzzle 4?', explanation: 'The blue pawn starts two squares right of the yellow one and two squares down. Two steps right move the yellow pawn into the blue pawn’s column and the blue pawn two further right, which in a room four wide is back to the yellow pawn’s column. Two steps down do the same for the rows. So RRDD (in any order, or with steps left or up instead) trades them. In a room four wide, a trade across needs a net move v with v ≡ 2 and v ≡ −2: both hold for v = 2. In puzzle 4 the room is three wide and the pawns one apart, and v ≡ 1 and v ≡ −1 never agree.', extension: 'Put the pawns one square apart in this room. Can they trade? (No: one right is not one left in a room four wide.)', connection: 'Two points of Z/4 × Z/4 can be swapped by a translation exactly when their difference v has 2v ≡ 0: each part is 0 or 2.'},
    provenance: 'New, from the review card’s App fit (“possible at offset 2 on 4 wide”), with the pawns half a room apart in both directions.'},
  {number: 10, level: 'hard', title: 'Up first', mode: 'shrink', room: 'torus3', home: 'H', trip: 'RRRUUU', target: 'UUURRR', check: {possible: true, slides: 9}, kind: 'shrink',
    objective: 'Turn the trip into the dashed trip.', visible: 'Turn the trip into the dashed trip.',
    idea: 'Each slide moves the trip across one square, so turning RRRUUU into UUURRR takes at least nine slides, one for each square between the two trips; nine is enough.',
    hints: ['Which corner of the trip is next to the dashed trip?', 'Some slides move the trip towards the dashed trip and some move it away. Which corners move it towards?', 'Slide a corner where a step right is followed by a step up: each one moves the trip one square towards the dashed trip.'],
    parent: {notice: 'Whether your child slides corners that move the trip away from the dashed one and back again, and whether they count their slides. Any route solves the puzzle; there is no limit.', prompt: 'How many slides did your way take? Can you do it in fewer? What is the fewest?', explanation: 'A slide swaps a step right and a step up next to each other, moving the trip across one square. Between RRRUUU and UUURRR lie nine squares, so at least nine slides are needed, and nine are enough if each moves the trip one square towards the dashed one: RRRUUU, RRURUU, RURRUU, URRRUU, URRURU, URURRU, UURRRU, UURRUR, UURURR, UUURRR is one way. The fewest is nine. The app doesn’t count slides, so count them together, perhaps on a replay. Both trips end in the copy up and to the right; the start never moves.', extension: 'How many slides turn RRRUUU into RURURU? (Three: the squares between them.)', connection: 'For lattice paths, the fewest slides between two paths with the same ends is the area between them; these slides generate the homotopies, so the two trips are the same loop, ab = ba in Z × Z.'},
    provenance: 'Week 41 grades 4–5 Problem 5 (change RRRUUU into UUURRR using the allowed moves). The guide’s nine-slide fewest is a question for the grown-up notes, not a limit on screen.'},
  {number: 11, level: 'hard', title: 'Right, up and left', mode: 'shrink', room: 'torus3', home: 'H', trip: 'RRRUUULLL', target: '', check: {possible: false, endCopy: [0, 1]}, kind: 'shrink',
    objective: 'Shrink the trip to nothing by sliding corners and erasing steps that go straight back. Press Can’t if it never can.', visible: 'Shrink the trip to nothing.',
    idea: 'No slide or erasure moves the copy where a trip ends, so a trip that ends in another copy can never shrink to nothing.',
    hints: ['Where does the trip end in the unrolled view?', 'Slides and erasures never move the end of the trip.', 'The trip ends on H in the copy above, not the first copy. Press Can’t.'],
    parent: {notice: 'Whether your child shrinks the trip as far as it goes (it becomes UUU) before claiming, or reads the answer from the end ring.', prompt: 'Which move could ever move the ring at the end?', explanation: 'A slide replaces two sides of a square by the other two, with the same ends; an erasure removes a step and its way back. So the end of the lifted trip, H in the copy above, never moves, while staying at H ends in the first copy. The trip can shrink to UUU (nine slides and three erasures) and no further. The finishing copy is the certificate.', extension: 'Which trips home can shrink to RRR? (Exactly those ending in the copy to the right.)', connection: 'The finishing copy is the class of the loop in π₁(torus) = Z × Z; the moves are homotopies, which never change it.'},
    provenance: 'Week 41 grades 4–5 Problem 4 (the trip RRR cannot shrink), with a longer trip in the copy above so that there are moves to try.'},
  {number: 12, level: 'hard', title: 'Four wide, five steps', mode: 'walk', room: 'torus4', home: 'F', steps: 5, check: {homeTrips: 0, of: 1024}, kind: 'count',
    objective: 'Get back to F in exactly 5 steps. Press Can’t if no trip can.', visible: 'Get back to F in exactly 5 steps.',
    idea: 'In a room four wide and four tall, a checkerboard colouring survives the portals, so no trip with an odd number of steps comes home.',
    hints: ['Try some five-step trips. Which squares can the pawn reach in one step? In two? In three?', 'Colour the room like a checkerboard. Does a portal ever join two squares of the same colour?', 'Every step changes the colour, even through a portal, so after five steps the pawn is on the other colour from F. Press Can’t.'],
    parent: {notice: 'Whether your child tries laps, as in puzzle 6, and notices that a lap here is four steps.', prompt: 'In puzzle 6 a lap took three steps. How many does it take here?', explanation: 'Colour the room like a checkerboard. Because the room is four squares wide and tall, a portal joins a square of one colour to one of the other, just like an ordinary step. So every step changes the colour, and after an odd number of steps the pawn is never on F’s colour. None of the 1,024 five-step trips comes home. In the three-wide room the portals join squares of one colour, which is what lets a lap of three come home.', extension: 'Which numbers of steps can bring the pawn home here? (Every even number, and no odd one.)', connection: 'The 4 × 4 torus graph is bipartite, so it has no closed walks of odd length; the 3 × 3 torus has odd cycles (each row).'},
    provenance: 'New: the review card’s fix 10 (“no odd trip returns” on the plain board), moved to a portal room four wide, where it still holds.'}
];

const id = n => `portals-${String(n).padStart(2, '0')}`;
const base = item => ({mode: item.mode, room: ROOMS[item.room], ...(item.home ? {home: item.home} : {}), ...(item.pawns ? {pawns: item.pawns} : {})});
const out = PUZZLES.map(item => {
  const q = {...base(item)};
  const S = surfaceOf(q.room);
  let rules = item.room === 'plain3' ? [...RULES.plain] : [...RULES.torus], solution, controls = CONTROLS.walk;
  if (item.mode === 'walk' && item.steps) {
    q.steps = item.steps;
    const home = words(item.steps).filter(w => legal(S, item.home, w) && tripLift(S, item.home, w).end.s === item.home);
    assert.equal(home.length, item.check.homeTrips, `${id(item.number)}: trips home`);
    assert.equal(words(item.steps).length, item.check.of);
    assert.equal(exactPossible(q), home.length > 0, `${id(item.number)}: the search agrees`);
    if (!home.length) { assert.ok(checkerboard(S), `${id(item.number)}: the checkerboard certificate`); solution = {cant: true, certificate: 'checkerboard'}; }
    else { assert.ok(home.includes(item.witness)); solution = {trip: item.witness, homeTrips: home.length, examples: home.slice(0, 6)}; }
    rules.push(RULES.exact(item.steps));
  } else if (item.mode === 'walk') {
    q.stars = item.stars; if (item.back) q.back = true;
    rules.push(RULES.stars, ...(item.back ? [RULES.back] : []));
    solution = {trip: item.witness, shortest: item.check.shortest};
  } else if (item.mode === 'every') {
    q.steps = item.steps;
    const answers = reachIn(S, item.home, item.steps);
    assert.deepEqual([...answers].sort(), [...item.check.answers].sort(), `${id(item.number)}: answers`);
    const trips = Object.fromEntries(answers.map(s => [s, words(item.steps).find(w => legal(S, item.home, w) && tripLift(S, item.home, w).end.s === s)]));
    solution = {answers, trips};
    rules.push(RULES.every);
  } else if (item.mode === 'trade') {
    assert.equal(tradePossible(q), item.check.possible, `${id(item.number)}: trade`);
    const route = tradeRoute(S, item.pawns, [item.pawns[1], item.pawns[0]]);
    if (item.check.possible) { assert.equal(route.length, item.check.shortest); assert.equal(route.length, item.witness.length); solution = {trip: item.witness, shortest: route.length}; }
    else solution = {cant: true, certificate: 'gap'};
    rules.push(RULES.trade); controls = CONTROLS.trade;
  } else {
    Object.assign(q, {trip: item.trip, target: item.target});
    assert.equal(shrinkPossible(q), item.check.possible, `${id(item.number)}: shrink`);
    if (item.check.slides !== undefined) assert.equal(editReach(item.trip).get(item.target), item.check.slides, `${id(item.number)}: fewest slides`);
    if (item.check.endCopy) assert.deepEqual(copyIndex(S, tripLift(S, item.home, item.trip).end), item.check.endCopy);
    solution = item.check.possible ? {target: item.target, ...(item.check.slides !== undefined ? {slides: item.check.slides} : {moves: item.check.moves})} : {cant: true, certificate: 'end copy', endCopy: item.check.endCopy};
    rules.push(RULES.shrink, item.target ? RULES.turn : RULES.nothing);
    controls = CONTROLS.shrink;
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Portal rooms', mechanic: 'portals', band: 'all', revision: 1, sourceDocument: 'docs/portals/README.md',
    parameters: q, objective: item.objective, visibleObjective: item.visible, instruction: item.objective, controls, rules,
    idea: item.idea, prerequisites: PREREQ[item.kind], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playRooms = {
  torus3: {name: 'Portal room', room: ROOMS.torus3, home: 'H'},
  torus4: {name: 'Big portal room', room: ROOMS.torus4, home: 'F'},
  tube3: {name: 'Tube', room: ROOMS.tube3, home: 'H'},
  plain3: {name: 'Plain room', room: ROOMS.plain3, home: 'H'}
};
const playground = {
  id: 'portals-playground', number: 0, title: 'Portal rooms playground', difficulty_level: 'playground', familyTitle: 'Portal rooms', mechanic: 'portals', band: 'playground', revision: 1, sourceDocument: 'docs/portals/README.md',
  parameters: {mode: 'playground', rooms: playRooms},
  objective: 'Walk the pawn through the portals of four rooms and watch its trip in the unrolled view.', visibleObjective: '',
  instruction: 'Walk the pawn through the portals of four rooms and watch its trip in the unrolled view.',
  controls: CONTROLS.playground,
  rules: [...RULES.torus, 'The tube is glued only left to right; its top and bottom are walls. The plain room has no portals.'],
  idea: 'The same pawn in four rooms glued in different ways: a three-by-three portal room, a four-by-four one, a tube and a plain room.',
  prerequisites: 'None. A grown-up or a partner can call out trips to try.',
  hints: ['Walk off an edge and watch where the pawn comes back.', 'Walk round the room and back to H. Which copy are you in?', 'In the tube, walk up as far as you can.'],
  parent: {notice: 'Whether your child predicts where the pawn comes back in before stepping through a portal, and keeps its row or column.', prompt: 'Can you get back to H in an odd number of steps in each room? (Yes in the portal room, no in the big portal room and the plain room, yes in the tube, by a lap round it.)', explanation: 'The portal room and the big portal room are tori, the tube is a cylinder, and the plain room is a square with walls. In the unrolled view the torus repeats in every direction, the tube only sideways, and the plain room not at all.', extension: 'In the tube, which copies can the pawn reach? (Only those to the left and right.)', connection: 'The torus, the cylinder and the square are glued from the same square in different ways; their unrolled views (universal covers) are the plane, a strip and the square itself.', sourceIds: sources},
  provenance: 'Week 41 page 1 in every band (move a pawn through the portals, then replay on the copies), with the tube and the plain room as contrasts.'
};
for (const [name, r] of Object.entries(playRooms)) assert.ok(Object.hasOwn(r.room.squares, r.home), `playground ${name}: home`);

const json = {
  title: 'Portal rooms',
  version: 1,
  families: [{id: 'portals', title: 'Portal rooms', mathematics: 'A room of small squares whose right edge is glued to its left edge and top edge to bottom edge, by translation, is a torus. A pawn steps from square to square; at an edge it comes back in through the matching edge, in the same row or column. The unrolled view repeats the room on every square of a lattice (the universal cover), so each trip lifts to a path in the plane from the H of the first copy, and a trip that ends on H in the room ends at the H of some copy (m, n). In a room three wide every square is exactly two steps from H, and a trip home with an odd number of steps must lap the room; in a room four wide and tall a checkerboard colouring survives the portals and no odd trip comes home. Two pawns given the same steps move by one translation, so they trade only when twice their gap is a whole number of rooms. Erasing a step and its way back, or sliding a corner across a square, never moves the copy where a trip ends, and two trips from H back to H change into each other by these moves exactly when they end in the same copy: the loops of the torus are classified by Z × Z.', rules: RULES.torus, sourceIds: sources}],
  sources: [
    {id: 'portals-week41', title: 'Bellingham Math Circle — Week 41: Torus portals and lifts (student packets K–1, 2–3, 4–5 and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-41', kind: 'local curriculum'},
    {id: 'portals-card41', title: 'Week 41 review card (App fit: every square in two steps, trips home, the two-pawn trade, shrinking loops; fix 10)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-41.md', kind: 'local curriculum'},
    {id: 'portals-hatcher', title: 'Allen Hatcher — Algebraic Topology, Chapter 1: §1.1 (paths, homotopy, the fundamental group of the circle) and §1.3 (covering spaces and lifting), as the Week 41 guide cites', url: 'https://pi.math.cornell.edu/~hatcher/AT/AT.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/portals/portals.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode.padEnd(6)} ${JSON.stringify(p.solution).slice(0, 110)}`).join('\n'));
