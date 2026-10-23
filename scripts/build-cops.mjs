// Authoring list for Cops and robbers (worksheet Week 86, Pursuit and escape).
// Draws each map from coordinates, computes every puzzle's answer with the
// mechanic's own game search (dist/families/cops/game.js), checks it against
// the table in docs/cops/README.md and the worksheet's math check, plays a
// witness through the mechanic's hints, and writes
// dist/families/cops/cops.json. Run: node scripts/build-cops.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as game from '../dist/families/cops/game.js';
import {copsMechanics, gameOf, goodSets, roadSets, bestValue} from '../dist/families/cops/cops.js';

// A map from coordinates with y up: positions become percentages of a board
// 100 units wide, with `pad` units of margin.
function place(coords, pad) {
  const xs = Object.values(coords).map(c => c[0]), ys = Object.values(coords).map(c => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (100 - 2 * pad) / (x1 - x0), height = (y1 - y0) * s + 2 * pad, r = n => Number(n.toFixed(2));
  return {aspect: r(100 / height), nodes: Object.fromEntries(Object.entries(coords).map(([id, [x, y]]) => [id, [r(pad + (x - x0) * s), r((pad + (y1 - y) * s) / height * 100)]]))};
}
const letters = n => Array.from({length: n}, (_, i) => String.fromCharCode(97 + i));
const roadList = list => list.split(' ').map(r => r.split('-'));
const path = (n, pad, scale) => ({...place(Object.fromEntries(letters(n).map((id, i) => [id, [i, 0]])), pad), roads: letters(n).slice(1).map((id, i) => [letters(n)[i], id]), ...(scale ? {scale} : {})});
// A regular ring with a at the top, going clockwise, as the worksheet draws it.
const ringCoords = n => Object.fromEntries(letters(n).map((id, i) => [id, [Math.sin(2 * Math.PI * i / n), Math.cos(2 * Math.PI * i / n)]]));
const ring = (n, pad, extra = '') => ({...place(ringCoords(n), pad), roads: [...letters(n).map((id, i) => [id, letters(n)[(i + 1) % n]]), ...(extra ? roadList(extra) : [])]});
export const MAPS = {
  P5: path(5, 10),
  P7: path(7, 8, .82),
  // Worksheet shared P2: T1's branch c–f–g–h bends right at g (card fix 4);
  // T2's branch forks at f.
  T1: {...place({a: [-2, 0], b: [-1, 0], c: [0, 0], d: [1, 0], e: [2, 0], f: [0, 1], g: [0, 2], h: [1, 2]}, 9), roads: roadList('a-b b-c c-d d-e c-f f-g g-h')},
  T2: {...place({a: [-2, 0], b: [-1, 0], c: [0, 0], d: [1, 0], e: [2, 0], f: [0, -1], g: [-1, -2], h: [1, -2]}, 9), roads: roadList('a-b b-c c-d d-e c-f f-g f-h')},
  R4: ring(4, 14),
  R5: ring(5, 12),
  R6: ring(6, 12),
  // The guide's cop-win example for upper P3: a triangle with a tail.
  D1: {...place({a: [0, 0.577], b: [0, -0.577], c: [1, 0], d: [2, 0], e: [3, 0], f: [4, 0]}, 9), roads: roadList('a-b b-c c-a c-d d-e e-f')},
  // A square with a roof: the roof folds away and leaves the square.
  house: {...place({a: [0, 1], b: [1, 1], c: [1, 0], d: [0, 0], e: [0.5, 1.75]}, 16), roads: roadList('a-b b-c c-d d-a e-a e-b')},
  // A square with a tail at two opposite corners, a and c: of the nine roads
  // that can be added, only the two across the square let C win.
  tails: {...place({a: [0, 1], b: [1, 1], c: [1, 0], d: [0, 0], e: [-0.75, 1.75], f: [1.75, -0.75]}, 10), roads: roadList('a-b b-c c-d d-a a-e c-f')},
  // Worksheet materials p. 1: F1 is the triangle a–b–c with tail c–d–e and stalk a–f.
  F1: {...place({a: [0, 0], b: [1, 1], c: [2, 0], d: [3, 0], e: [4, 0], f: [0, -1]}, 9), roads: roadList('a-b b-c c-a c-d d-e a-f')},
  // Materials p. 2: F2 is the pentagon with the chord a–c.
  F2: ring(5, 12, 'a-c'),
  // A hexagon with the triangle a–c–e inside.
  sun: ring(6, 12, 'a-c c-e e-a'),
  Q6: ring(6, 12),
  Q8: ring(8, 10)
};
const mapOnly = name => structuredClone(MAPS[name]);

const SOURCES = ['cops-week86', 'cops-card86', 'cops-nw', 'cops-af', 'cops-bn'];
const RULES = [
  'C chooses a dot first, then R chooses another.',
  'C moves first. On a turn a piece stays or takes one road to the next dot.',
  'C catches R by landing on R’s dot. R never steps onto C.',
  'The app plays the other piece as well as it can.'
];
const EVERY = 'Keeping R away: C tries every start and every move it has, and goes back to try another when it needs to. A position like one you have already answered, after turning or flipping the map, is not asked again. When C has tried everything and never caught R, R gets away forever.';
const ROADS = 'A new road joins two dots. Where two roads cross there is no dot.';
const CONTROLS = {
  catch: 'Tap a dot to put C there. Then tap a dot next to C to move, or C’s own dot to stay. R answers at once. The pips show your moves. Undo takes back your move and R’s answer.',
  start: 'C starts where it stands. Tap a dot next to C to move, or C’s own dot to stay. R answers at once. The pips show your moves. Undo takes back your move and R’s answer.',
  cant: ' If you think R can always get away, press Can’t: then you play R, and C tries every move against you.',
  escape: 'C chooses a dot; tap a dot to put R there. After each C move, tap a dot next to R to move, or R’s own dot to stay. Undo takes back your last answer.',
  roads: 'Tap two dots to add a road between them, and tap a new road to take it away. The slots show how many you may add. Press Play, then put C down and catch R. Roads goes back to change them.',
  fold: 'Tap a dot, then a dot it folds into: it leaves the map with its roads. Tap the chosen dot again to let it go. If no dot can fold, press Can’t.',
  two: 'Tap C1 or C2, then a dot next to it, or its own dot, to plan its move; a dot only the other cop can reach plans that cop. Press Go: both cops move, then R answers. A cop with no plan stays. Undo takes back the turn.',
  playground: 'Choose a map, and C or R. Put your piece down and play; the app plays the other piece as well as it can. Restart plays again.'
};
const PRE = {
  path: 'Count roads to three. No reading: a grown-up reads How to play once.',
  tree: 'Count roads to five. No reading: a grown-up reads How to play once.',
  ring: 'No arithmetic. A grown-up explains that C keeps trying every move, so a lucky long game is not enough.',
  either: 'Play the catching game first (Easy). Then decide, by playing, which side wins.',
  roads: 'Play catching and escaping first (Easy and Medium). Reading: none beyond the buttons.',
  fold: 'Read dot letters and compare two short lists: the dots one dot reaches and the dots its neighbour reaches. Grades 4–5, or younger with a grown-up reading the letters.',
  two: 'Plan two pieces at once. Count roads to four.'
};

const ITEMS = [
  {number: 1, level: 'easy', title: 'Path of five', map: 'P5', mode: 'catch', budget: 2,
    check: {best: ['c'], value: 2, starts: {a: 4, b: 3, c: 2, d: 3, e: 4}},
    idea: 'On a path R can only run to an end, so the best start is the middle: from there each end is two roads away.', prereq: 'path',
    hints: ['Try C at one end. Where does R go?', 'R runs to the end farther from C and waits.', 'Start C on the middle dot, then walk toward R.'],
    parent: {notice: 'Whether your child starts C at an end first and sees R run to the far end, then tries the middle.', prompt: 'Where can C start so that the farther end is as near as possible?', explanation: 'R chooses after C and goes to the end farther from C. From the middle dot c both ends are two roads away; walking toward R, C reaches that end in two moves however R moves, because R can’t get past C. From b or d one end is three roads away, from a or e four, and R starting there and staying forces that many moves. So c, with 2, is the only best start.', extension: 'On a path of six dots, what is the best start and how many moves does it need? (Either middle dot, three moves.)', connection: 'On a path of n dots C needs ⌊n/2⌋ moves from a middle dot, the path’s radius. On any tree a start needs as many moves as its distance to the farthest dot.'},
    provenance: 'Week 86 shared Problem 1, board P5 (“Choose a starting dot for C that guarantees capture in the fewest C turns”).'},
  {number: 2, level: 'easy', title: 'Path of seven', map: 'P7', mode: 'catch', budget: 3,
    check: {best: ['d'], value: 3, starts: {a: 6, b: 5, c: 4, d: 3, e: 4, f: 5, g: 6}},
    idea: 'Seven in a row: the middle dot is three roads from each end.', prereq: 'path',
    hints: ['Which dot is equally far from both ends?', 'R always runs to the end farther from C.', 'Start C on the middle dot, the fourth from either end.'],
    parent: {notice: 'Whether the middle is found at once after the path of five, or found again by trying.', prompt: 'Is there a dot as far from one end as from the other?', explanation: 'From the middle dot d each end is three roads away, so C walking toward R needs three moves; any other start has an end four or more roads away, where R waits. Exact values from a to g: 6, 5, 4, 3, 4, 5, 6.', extension: 'Add one dot to the path. Where is the best start now? (Either of the two middle dots, four moves.)', connection: 'The middle of a path is its centre: the dot whose farthest dot is nearest.'},
    provenance: 'Week 86 shared Problem 1, board P7.'},
  {number: 3, level: 'easy', title: 'The fork', map: 'T2', mode: 'catch', budget: 2,
    check: {best: ['c'], value: 2, starts: {a: 4, b: 3, c: 2, d: 3, e: 4, f: 3, g: 4, h: 4}},
    idea: 'On a tree R can’t slip past C into another branch, so walking toward R works; from the junction c every end is two roads away.', prereq: 'tree',
    hints: ['Where can C start so that no end is far away?', 'Walk toward R: R can’t get past C to reach another branch.', 'Start C where the row meets the branch.'],
    parent: {notice: 'Whether your child walks C toward R or chases where R was.', prompt: 'If C stands at the junction, can R ever get from one branch to another?', explanation: 'With C at c, the ends a, e, g and h are each two roads away. R chooses an end and C walks toward it along the only road there; R is trapped at the end of its branch within two C moves. From any other dot some end is three or four roads away. The moves needed from each start equal its distance to the farthest dot.', extension: 'Put a long branch on one side. Does the best start move? (Toward the long branch: the best start is the tree’s centre.)', connection: 'Every tree is cop-win: with C’s dot removed, the piece of the tree holding R shrinks at every C step toward R.'},
    provenance: 'Week 86 shared Problem 2, tree T2.'},
  {number: 4, level: 'easy', title: 'Square', map: 'R4', mode: 'escape',
    check: {robberWin: true},
    idea: 'On a ring of four R stays opposite C: when C stays, R stays; when C steps next to R, R steps on to the new opposite dot.', prereq: 'ring',
    hints: ['Put R where C can’t reach it in one move.', 'When C comes next to R, which way can R go?', 'Keep R on the dot across the square from C.'],
    parent: {notice: 'Whether your child puts R across from C, and keeps it there after each C move rather than running anywhere.', prompt: 'After C moves, where is the dot across from C now?', explanation: 'R starts across from C. If C stays, R stays; if C steps one way, R steps the same way round, to the new opposite dot. Before every C move there are two roads between them, so C never lands on R. The app’s C tries every move, and positions that are the same after turning or flipping the square count once, so three answers can cover everything: where to start, what to do when C stays, and what to do when C steps.', extension: 'Is the triangle different? (Yes: on a ring of three every dot is next to C, and C catches R on its first move.)', connection: 'A bare ring of four or more dots is robber-win: no dot folds. It is the smallest graph that one cop can’t search.'},
    provenance: 'Week 86 shared Problem 3, ring R4 (“On which can R keep escaping forever? Find a plan that works against every reply”).'},
  {number: 5, level: 'medium', title: 'The bent branch', map: 'T1', mode: 'catch', start: 'h', budget: 5,
    check: {value: 5},
    idea: 'From the end of the bent branch C walks toward R. R may run out of the branch into the row ahead of C, but it must pick a side, and C follows it to that end.', prereq: 'tree',
    hints: ['Walk C toward R every move.', 'If R runs into the row, which end can it reach?', 'Follow R: it is trapped at the end of whichever side it chose.'],
    parent: {notice: 'Whether your child keeps walking toward R when R runs out of the branch, or turns back.', prompt: 'When R comes out into the row, can it ever get behind C?', explanation: 'C starts at h, the end of the branch c–f–g–h. R starts as far away as it can, at an end of the row, five roads off, and stays; or it starts on f or g and runs ahead of C into the row. Either way C walks the unique road toward R, and the part of the tree R can reach shrinks every move. Five moves always suffice and R waiting at a or e needs all five.', extension: 'Where would C start to need only three moves? (At c or f, the centre of this tree.)', connection: 'The shrinking-piece argument: delete C’s dot, look at the piece holding R; each step toward R makes it strictly smaller, so a finite tree runs out. Saying “the distance shrinks” is not enough, since R can run away for a while.'},
    provenance: 'Week 86 shared Problem 2, tree T1, with the review card’s fix 4 (the branch lengthened to c–f–g–h, C starting at h).'},
  {number: 6, level: 'medium', title: 'Ring of five', map: 'R5', mode: 'escape',
    check: {robberWin: true},
    idea: 'An odd ring has no single opposite dot, but R stays on one of the two dots across from C, never next to C.', prereq: 'ring',
    hints: ['Put R where C can’t reach it in one move.', 'When C comes next to R, step away along the other road.', 'Stay on a dot two roads from C.'],
    parent: {notice: 'Whether your child looks for “opposite” and finds there are two dots across from C, either of which works.', prompt: 'Which dots can C not reach in one move?', explanation: 'On the pentagon the dots C can’t reach in one move are exactly the two across from it. R starts on one. If C stays, R stays; if C steps toward R, R steps away along its other road, which lands on a dot across from C’s new place. R is never next to C before C moves, so C never catches it.', extension: 'Try a ring of six. (R stays opposite, as on the square; the dot two away works too, if R steps away when C comes next to it.)', connection: 'Every bare ring of four or more dots is robber-win, and for the same reason: after C moves, R’s other neighbour is never next to C.'},
    provenance: 'Week 86 shared Problem 4, ring R5.'},
  {number: 7, level: 'medium', title: 'Triangle with a tail', map: 'D1', mode: 'catch', cant: true, budget: 2,
    check: {best: ['d'], value: 2, starts: {a: 4, b: 4, c: 3, d: 2, e: 3, f: 4}},
    idea: 'A triangle is no hiding place, so this map is cop-win; from d C is one road from the triangle’s corner and two from the tail’s end.', prereq: 'either',
    hints: ['Try to catch R. Where should C start?', 'From c, the tail is long. Is there a start nearer both the triangle and the tail’s end?', 'Start C on the dot next to the triangle’s corner.'],
    parent: {notice: 'Whether a cycle makes your child expect an escape, and whether Can’t is pressed before trying a few starts.', prompt: 'Is there anywhere on the triangle where R is safe?', explanation: 'From d, R chooses a or b (two roads away through c) or f (two roads along the tail). C walks toward R: to c, then onto R, which can’t escape since every triangle dot is next to c; or to e, then onto f. So two moves suffice, and no other start manages two: c, e need three, and a, b, f four. Pressing Can’t here lets the app’s C show a catch.', extension: 'Add a road from a to d. Who wins now? (Still C: the map still folds to one dot.)', connection: 'A triangle with a tail folds to one dot (the tail end into its neighbour, then up the tail, then the triangle corner by corner), so it is cop-win though it has a cycle.'},
    provenance: 'Week 86 upper Problem 3, the guide’s cop-win example (“the triangle a–b–c with tail c–d–e–f”), as a catch with Can’t available.'},
  {number: 8, level: 'medium', title: 'The house', map: 'house', mode: 'catch', cant: true, budget: 3,
    check: {robberWin: true},
    idea: 'The roof adds a triangle, but R can stay on the square and treat C on the roof as if it stood on a corner below it.', prereq: 'either',
    hints: ['Try to catch R. Where does R keep going?', 'When C climbs onto the roof, which square dots can it reach next?', 'R stays on the square: C on the roof reaches only what a top corner reaches.'],
    parent: {notice: 'Whether your child tries starts for a while, then switches to escaping, and whether the roof is used as a hiding place (it isn’t one: the roof is next to C whenever C is on a top corner).', prompt: 'Is the roof ever useful to R? Is it useful to C?', explanation: 'The roof e reaches only a and b, and a reaches those too, so e folds into a; what is left is a bare square, where R stays across from C. On the house R plays the square strategy, pretending C on the roof stands on a: from there C reaches nothing the corner a doesn’t. So C never catches R, and Can’t is right. In Can’t, the app’s C tries its three kinds of start (a top corner, a bottom corner, the roof) and every move.', extension: 'Add the road a–c. Who wins now? (C: a is next to every dot.)', connection: 'A fold never changes who wins (Nowakowski and Winkler): the house folds to a square, which is robber-win, so the house is robber-win.'},
    provenance: 'New instance for the classification, in the spirit of upper Problem 3 (design a robber-win map with a cycle).'},
  {number: 9, level: 'hard', title: 'Square with two tails', map: 'tails', mode: 'roads', add: 1, budget: 2,
    check: {good: [['a-c'], ['b-d']], roadStarts: {'a-c': {a: 2, b: 2, c: 2, d: 2, e: 3, f: 3}, 'b-d': {a: 3, b: 2, c: 3, d: 2, e: 4, f: 4}}},
    idea: 'Only a road across the square takes away R’s escape, and the one joining the two corners with tails lets C start on any corner.', prereq: 'roads',
    hints: ['Add a road and play. Where does R run?', 'A road across the square takes away R’s ring. Which one is next to both tails?', 'Add the road a–c, then start C on a corner of the square.'],
    parent: {notice: 'Whether your child joins the two tails first (a natural try: R still escapes), and whether both roads across the square are tried, and from which starts.', prompt: 'After your road, where can R hide? Where should C start?', explanation: 'Of the nine roads that can be added, seven leave a map where R escapes forever (the app checks all nine by search): joining the tails, or a tail to a corner, still leaves R a ring to run around. A road across the square works. With a–c, the corners a and c are next to every corner and to their own tails, and C catches R within two moves from any corner of the square (a tail end needs three). With b–d, only b and d manage two: from a, R waits on the far tail f, three moves away.', extension: 'With the road b–d, which starts catch R within two moves? (Only b and d.)', connection: 'Adding a road helps C only when it takes away every place R can run; which road matters, not how many.'},
    provenance: 'Week 86 upper Problem 2 (“Add as few roads as possible to each ring so C can always catch R”) on a new map chosen by search so that the road matters: 2 of 9 single roads work. It replaces the board E4 square, where both roads work and every start catches in two.'},
  {number: 10, level: 'hard', title: 'Pentagon and a new road', map: 'R5', mode: 'roads', add: 1, cant: true, budget: 2,
    check: {good: []},
    idea: 'Any one road across the pentagon cuts off a triangle and leaves a square that R runs around; C on the cut-off dot is no better off than on a corner next to it.', prereq: 'roads',
    hints: ['Add a road and play. Where does R run?', 'Look for four dots joined in a ring that avoids the dot your road cuts off.', 'Every single road is the same map turned: if R escapes with yours, it escapes with any. Press Can’t and keep R on the square.'],
    parent: {notice: 'Whether your child tries one road, loses, and then thinks of trying them all; and whether they see that all five roads give the same map turned.', prompt: 'Does it matter which road you add?', explanation: 'With the road a–c, the dot b reaches only a, b and c, and a reaches those too: b folds into a and leaves the square a–c–d–e. R stays on that square, pretending C on b stands on a, so C never catches it. Every one of the five possible roads gives the same map turned, so this answers them all: one road is not enough. Can’t is a claim about your own road, and the app’s C tries every start and move against it.', extension: 'Which roads would you add if you could add two? (Puzzle 11.)', connection: 'The projection b ↦ a is a retraction onto the square; a retract of a cop-win graph is cop-win, so a robber-win retract proves the whole map robber-win.'},
    provenance: 'Week 86 upper Problem 2, board E5, its one-chord impossibility; the guide’s projection proof and the second card run’s “one pentagon chord can’t … since all five chords give one map turned”.'},
  {number: 11, level: 'hard', title: 'Pentagon and two new roads', map: 'R5', mode: 'roads', add: 2, budget: 1,
    check: {good: [['a-c', 'a-d'], ['a-c', 'c-e'], ['a-d', 'b-d'], ['b-d', 'b-e'], ['b-e', 'c-e']]},
    idea: 'Two roads from one dot make it next to every dot, so C starts there and catches R at once. Two roads that cross leave a square R can still run around.', prereq: 'roads',
    hints: ['Try two roads that cross. Who wins?', 'With two crossing roads, look for a square that R can run around.', 'Add two roads from the same dot, then start C there.'],
    parent: {notice: 'Whether your child adds two crossing roads (the natural first try), finds R still escapes, and looks for why.', prompt: 'Do your two roads share a dot?', explanation: 'Of the ten pairs of roads, exactly the five that share an end work: that end is next to every dot, so C starts there and catches R on the first move. From any other start one move is not enough. The five crossing pairs, such as a–c with b–d, still lose: b and c then reach the same dots, b folds into c, and the square a–c–d–e is left. The worksheet’s guide adds this check for adults.', extension: 'Is a map with more roads always better for C? (No: the pentagon with two crossing roads has seven roads and R escapes, while a tree on five dots has four and C wins.)', connection: 'Cop-win graphs are exactly the dismantlable graphs; the number of roads alone does not decide.'},
    provenance: 'Week 86 upper Problem 2, board E5, with the math check’s finding that the five crossing pairs lose.'}
];
const FOLDS = [
  {number: 1, level: 'easy', title: 'Triangle with two tails', map: 'F1', check: {foldsDown: true},
    idea: 'Ends fold into their neighbours, and then a triangle folds corner by corner: F1 folds to one dot.',
    hints: ['Find a dot at the end of a tail.', 'An end reaches itself and one neighbour, and that neighbour reaches both.', 'Fold e into d.'],
    parent: {notice: 'Whether your child checks the rule (everything the first dot reaches, the second reaches too) or folds by eye; and whether a refused fold is read to find the missed dot.', prompt: 'Which dots does e reach? Which does d reach?', explanation: 'e folds into d, then d into c, then f into a. The triangle a, b, c is left, and any corner folds into another, leaving one dot. Other orders work as well: on a map that folds to one dot, every order does. One dot left certifies that one cop always catches R on F1.', extension: 'Play the chasing game on F1 in the playground’s spirit: where should C start? (c: two moves.)', connection: 'A fold is a retraction onto a smaller map; a map folds to one dot exactly when it is cop-win (Nowakowski and Winkler; Quilliot).'},
    provenance: 'Week 86 upper Problem 4, board F1 (materials p. 1).'},
  {number: 2, level: 'medium', title: 'Pentagon with a road across', map: 'F2', check: {stuckAt: 4},
    idea: 'Only b can fold; then the bare square a, c, d, e is left, with no fold. R escapes on F2.',
    hints: ['Look for a dot whose neighbours are all next to one of its neighbours.', 'After b folds, check each dot of the square against each neighbour.', 'On a bare square each dot reaches a dot its neighbours miss. Press Can’t.'],
    parent: {notice: 'Whether your child tries every pair before pressing Can’t, and whether “There is a fold.” sends them back to look.', prompt: 'On the square that is left, does any dot have a neighbour that reaches all it reaches?', explanation: 'At first only b folds, into a or c. Either way the square a–c–d–e is left, and in a bare square two neighbours each reach a dot the other misses (the dot across). So no fold is left with four dots, and every order ends there: F2 does not fold to one dot, and R escapes on it, staying across the square and treating C on b as on a.', extension: 'Add the road a–d to F2. Does it fold down now? (Yes: a is then next to every dot, and every other dot folds into a.)', connection: 'The map left when no fold remains is the same, up to relabelling, whatever order the folds are made in.'},
    provenance: 'Week 86 upper Problem 4, board F2 (materials p. 2).'},
  {number: 3, level: 'hard', title: 'Hexagon with a triangle', map: 'sun', check: {foldsDown: true},
    idea: 'It looks like a ring, but each dot between two triangle corners folds into one of them, and then the triangle folds down.',
    hints: ['A bare ring has no fold. Does this one?', 'Compare b with a: what does b reach, and does a reach it all?', 'Fold b into a.'],
    parent: {notice: 'Whether the outside ring makes your child expect Can’t, as on F2.', prompt: 'Is this map more like F1 or like the square?', explanation: 'The outer dots b, d and f each reach two triangle corners and themselves, and either corner reaches those too. Fold b, d and f into corners, and the triangle a, c, e is left, which folds to one dot. So one cop catches R on this map, though a bare ring of six is robber-win: the triangle’s roads take away every hiding place.', extension: 'Take away the road c–e. Does it still fold down? (No: b and f fold into a, and the square a–c–d–e is left.)', connection: 'Chordal graphs, where every ring of four or more dots has a road across, always fold to one dot.'},
    provenance: 'New instance: a hexagon with an inner triangle, beside the bare ring of shared Problem 4.'}
];
const TWOS = [
  {number: 1, level: 'medium', title: 'Two cops on a ring of six', map: 'Q6', start: 'a', budget: 3, check: {value: 3},
    idea: 'One cop holds a dot so R can’t run round the ring; the other walks toward R along what is left, a path.',
    hints: ['One cop alone never catches R on a ring. What can two do?', 'Leave one cop on a, so R can’t get past it.', 'Keep C1 on a and walk C2 toward R.'],
    parent: {notice: 'Whether your child moves both cops toward R together (which works too, from either side) or finds the blocker.', prompt: 'If one cop never moves, what shape is left for R to run on?', explanation: 'Both cops start at a and R chooses a dot. With C1 holding a, the rest of the ring is a path that R can’t leave past C1, and C2 sweeps it from b. Closing in from both sides, three cop turns always suffice from a, and R starting at d forces three.', extension: 'Can two cops starting on different dots do better? (Yes: on opposite dots they catch in one turn.)', connection: 'The cop number of a bare ring of four or more dots is 2.'},
    provenance: 'Week 86 upper Problem 5, ring Q6 (“Start both cops at a”).'},
  {number: 2, level: 'hard', title: 'Two cops on a ring of eight', map: 'Q8', start: 'a', budget: 4, check: {value: 4},
    idea: 'The blocker and sweeper work on every ring, however many dots it has.',
    hints: ['Does your plan for six dots still work?', 'One cop blocks at a; the ring without a is a path.', 'Close in from both sides: move C1 and C2 toward R round opposite ways.'],
    parent: {notice: 'Whether your child reuses the plan from the ring of six, and can say why it would work on any ring.', prompt: 'Would your plan work on a ring of a hundred dots?', explanation: 'From a common start at a, the two cops close in from both sides and catch R within four turns; R starting opposite at e forces four. The blocker plan (C1 holds a, C2 sweeps) also always catches, more slowly. On every ring the piece R can use shrinks once a dot is held.', extension: 'How many turns does the blocker plan alone take here? (Up to seven.)', connection: 'Aigner and Fromme: every planar map needs at most three cops; rings need two.'},
    provenance: 'Week 86 upper Problem 6, ring Q8 (“Will your plan work on every ring?”).'}
];

const id = n => `cops-${String(n).padStart(2, '0')}`;
const OBJECTIVE = {
  catch: item => `${item.start ? 'C starts on the dot shown.' : 'Choose where C starts.'} Catch R within ${item.budget} moves.${item.cant ? ' If you think R can always get away, press Can’t and keep R away from C forever.' : ''}`,
  escape: () => 'Put R down after C, then answer every C move so that C never catches R.',
  roads: item => `Add ${item.add === 1 ? 'one road' : `${item.add} roads`}, then catch R within ${item.budget === 1 ? 'one move' : `${item.budget} moves`}.${item.cant ? ' If no road works, press Can’t and keep R away from C forever.' : ''}`
};
const VISIBLE = {
  catch: item => item.cant ? 'Catch R, or press Can’t if R can always get away.' : 'Catch R.',
  escape: () => 'Keep R away from C forever.',
  roads: item => item.cant ? 'Add a road, then catch R, or press Can’t if no road works.' : `Add ${item.add === 1 ? 'a road' : 'two roads'}, then catch R.`
};
const mech = copsMechanics.cops, foldMech = copsMechanics.copsfold, twoMech = copsMechanics.copstwo;
// A witness: the mechanic's own hints played from a fresh board.
function witness(m, p) {
  let b = m.fresh(p);
  const actions = [];
  for (let k = 0; k < 120 && !m.solved(p, b); k++) {
    const h = m.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: hint ${k} is a move (${h.text})`);
    b = m.move(p, b, h.action);
    assert.ok(b, `${p.id}: hint ${k} is legal`);
    actions.push(h.action);
  }
  assert.ok(m.solved(p, b), `${p.id}: hints solve it`);
  return {actions, board: b};
}
const starts = (G, ids) => Object.fromEntries(ids.map(x => [x, game.oneCop(G).start(G.index[x])]));

const out = ITEMS.map(item => {
  const q = {mode: item.mode, ...mapOnly(item.map), ...(item.start ? {start: item.start} : {}), ...(item.budget ? {budget: item.budget} : {}), ...(item.cant ? {cant: true} : {}), ...(item.add ? {add: item.add} : {})};
  const G = gameOf(q), c = item.check;
  if (c.value !== undefined && !item.start) assert.equal(bestValue(G), c.value, `${id(item.number)}: best value`);
  if (c.best) assert.deepEqual(game.bestStarts(G).map(i => G.ids[i]), c.best, `${id(item.number)}: best starts`);
  if (c.starts) assert.deepEqual(starts(G, Object.keys(c.starts)), c.starts, `${id(item.number)}: every start`);
  if (item.start) assert.equal(game.oneCop(G).start(G.index[item.start]), c.value, `${id(item.number)}: value from ${item.start}`);
  if (c.robberWin) assert.equal(bestValue(G), game.INF, `${id(item.number)}: robber-win`);
  if (item.mode === 'catch' && !c.robberWin) assert.ok(bestValue(G) <= item.budget, `${id(item.number)}: catchable within the budget`);
  if (item.mode === 'roads') {
    assert.equal(bestValue(G), game.INF, `${id(item.number)}: the map without new roads is robber-win`);
    // The budget is the fewest moves with the best roads from the best start.
    if (c.good.length) assert.equal(Math.min(...goodSets(q).map(set => bestValue(gameOf({...q, roads: [...q.roads, ...set]})))), item.budget, `${id(item.number)}: the budget is the optimum`);
    for (const [road, want] of Object.entries(c.roadStarts || {})) assert.deepEqual(starts(gameOf({...q, roads: [...q.roads, road.split('-')]}), Object.keys(want)), want, `${id(item.number)}: every start with ${road}`);
    assert.deepEqual(goodSets(q).map(set => set.map(r => r.join('-')).sort()).sort(), c.good.map(s => [...s].sort()).sort(), `${id(item.number)}: the road sets that work`);
    // Can't is judged on the child's own roads, so it is offered only where
    // every full set of roads gives the same map up to relabelling.
    if (item.cant) {
      const full = roadSets(q, item.add).filter(s => s.length === item.add).map(s => gameOf({...q, roads: [...q.roads, ...s]}));
      const iso = (A, B) => game.automorphisms(game.graphOf([...A.ids, ...B.ids.map(x => `${x}'`)], [...A.ids.flatMap((x, i) => A.nb[i].filter(j => j > i).map(j => [x, A.ids[j]])), ...B.ids.flatMap((x, i) => B.nb[i].filter(j => j > i).map(j => [`${x}'`, `${B.ids[j]}'`]))])).some(s => s.slice(0, A.n).every(v => v >= A.n));
      assert.ok(full.every(H => iso(full[0], H)), `${id(item.number)}: every full set of roads gives one map`);
    }
  }
  const p = {id: id(item.number), parameters: q};
  const w = witness(mech, p);
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Cops and robbers', mechanic: 'cops', band: 'all', revision: 1, sourceDocument: 'docs/cops/README.md',
    parameters: q,
    objective: OBJECTIVE[item.mode](item), visibleObjective: VISIBLE[item.mode](item), instruction: OBJECTIVE[item.mode](item),
    controls: item.mode === 'escape' ? CONTROLS.escape : item.mode === 'roads' ? CONTROLS.roads + (item.cant ? CONTROLS.cant : '') : (item.start ? CONTROLS.start : CONTROLS.catch) + (item.cant ? CONTROLS.cant : ''),
    rules: [...RULES, ...(item.mode === 'roads' ? [ROADS] : []), ...(item.mode === 'escape' || item.cant ? [EVERY] : [])],
    idea: item.idea, prerequisites: PRE[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution: {actions: w.actions}, provenance: item.provenance
  };
});
const folds = FOLDS.map(item => {
  const q = mapOnly(item.map), G = gameOf(q), p = {id: `cops-fold-${String(item.number).padStart(2, '0')}`, parameters: q};
  // Every order of folds ends at one dot, or at maps of the same size.
  const ends = new Set();
  (function all(gone) { const open = game.folds(G, gone); if (!open.length) { ends.add(G.n - gone.size); return; } for (const [v] of open) if (!gone.has(v)) { gone.add(v); all(gone); gone.delete(v); } })(new Set());
  assert.deepEqual([...ends], [item.check.foldsDown ? 1 : item.check.stuckAt], `${p.id}: every fold order ends the same way`);
  assert.equal(bestValue(G) < game.INF, Boolean(item.check.foldsDown), `${p.id}: folds down exactly when cop-win`);
  const w = witness(foldMech, p);
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Cops and robbers', libraryFamily: 'cops', group: 'Folds', mechanic: 'copsfold', band: 'all', revision: 1, sourceDocument: 'docs/cops/README.md',
    parameters: q,
    objective: 'Fold the map dot by dot down to one dot. If no dot can fold and more than one is left, press Can’t.', visibleObjective: 'Fold the map down to one dot, or press Can’t.',
    instruction: 'Fold the map dot by dot down to one dot. If no dot can fold and more than one is left, press Can’t.',
    controls: CONTROLS.fold,
    rules: ['A dot folds into a neighbour that reaches every dot it reaches, by staying or taking one road.', 'The dot leaves the map with its roads.', 'If no dot can fold and more than one dot is left, Can’t is right. If a fold is left, Can’t says so and waits for a fold.'],
    idea: item.idea, prerequisites: PRE.fold, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution: {actions: w.actions}, provenance: item.provenance
  };
});
const twos = TWOS.map(item => {
  const q = {...mapOnly(item.map), start: item.start, budget: item.budget}, G = gameOf(q), s = G.index[item.start], p = {id: `cops-two-${String(item.number).padStart(2, '0')}`, parameters: q};
  assert.equal(game.twoCops(G).start(s, s), item.check.value, `${p.id}: value from ${item.start}`);
  const w = witness(twoMech, p);
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Cops and robbers', libraryFamily: 'cops', group: 'Two cops', mechanic: 'copstwo', band: 'all', revision: 1, sourceDocument: 'docs/cops/README.md',
    parameters: q,
    objective: `Both cops start on the dot shown. Catch R within ${item.budget} turns; on a turn both cops move.`, visibleObjective: 'Catch R.',
    instruction: `Both cops start on the dot shown. Catch R within ${item.budget} turns; on a turn both cops move.`,
    controls: CONTROLS.two,
    rules: ['Both cops start on the same dot; then R chooses a dot.', 'On a cop turn each cop stays or takes one road; then R stays or takes one road.', 'A cop catches R by landing on R’s dot. Cops may share a dot.', 'The app plays R as well as it can.'],
    idea: item.idea, prerequisites: PRE.two, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution: {actions: w.actions}, provenance: item.provenance
  };
});

// The grown-ups' extension answers that a search can check.
const winsAfter = (name, extra) => bestValue(gameOf({...MAPS[name], roads: [...MAPS[name].roads, ...roadList(extra)]})) < game.INF;
const without = (name, road) => ({...MAPS[name], roads: MAPS[name].roads.filter(r => r.join('-') !== road)});
assert.equal(bestValue(gameOf(without('sun', 'c-e'))), game.INF, 'the hexagon without c–e is robber-win');
assert.ok(winsAfter('D1', 'a-d'), 'the triangle with a tail and a–d stays cop-win');
assert.ok(winsAfter('house', 'a-c'), 'the house with a–c is cop-win');
assert.ok(winsAfter('F2', 'a-d'), 'F2 with a–d is cop-win');
assert.ok(!winsAfter('F2', 'b-d'), 'F2 with b–d (the crossing pair) is robber-win');
assert.equal(game.oneCop(gameOf(MAPS.F1)).start(gameOf(MAPS.F1).index.c), 2, 'F1 from c: two moves');
assert.deepEqual(game.bestStarts(gameOf(MAPS.F1)).map(i => MAPS.F1 && gameOf(MAPS.F1).ids[i]), ['c']);
// On the trees and paths, a start needs as many moves as its farthest dot is far.
for (const name of ['P5', 'P7', 'T1', 'T2']) {
  const G = gameOf(MAPS[name]), d = game.distances(G);
  G.ids.forEach((_, c) => assert.equal(game.oneCop(G).start(c), Math.max(...d[c]), `${name}: moves from a start equal its farthest distance`));
}
for (const n of [6, 8]) { const G = gameOf(path(n, 8)); assert.equal(Math.min(...G.ids.map((_, c) => game.oneCop(G).start(c))), n / 2, `a path of ${n}`); }
{ const G = gameOf(MAPS.Q6), a = G.index.a, d = G.index.d; assert.equal(game.twoCops(G).start(a, d), 1, 'two cops on opposite dots of six'); }

const playMaps = {
  path: {name: 'Path', ...mapOnly('P7')},
  tree: {name: 'Tree', ...mapOnly('T2')},
  ring: {name: 'Ring', ...mapOnly('R6')},
  house: {name: 'House', ...mapOnly('house')},
  sun: {name: 'Hexagon with a triangle', ...mapOnly('sun')}
};
const playground = {
  id: 'cops-playground', number: 0, title: 'Cops and robbers playground', difficulty_level: 'playground', familyTitle: 'Cops and robbers', mechanic: 'cops', band: 'playground', revision: 1, sourceDocument: 'docs/cops/README.md',
  parameters: {mode: 'playground', maps: playMaps},
  objective: 'Choose a map and a side, and play against the app.', visibleObjective: '',
  instruction: 'Choose a map and a side, and play against the app.',
  controls: CONTROLS.playground,
  rules: RULES,
  idea: 'Free play on a path, a tree, a ring, the house and a hexagon with a triangle, as C or as R.',
  prerequisites: 'None.',
  hints: ['Play C on the tree. Where is the best start?', 'Play R on the ring and stay across from C.', 'On the house, does the roof help anyone?'],
  parent: {notice: 'Whether your child predicts who will win on a map before playing, and changes sides to check.', prompt: 'On which maps can you always get away as R?', explanation: 'The path, the tree and the hexagon with a triangle fold to one dot, so C always wins; the ring and the house do not, so R can always get away. The app’s C on those maps keeps trying to corner R and never succeeds against a good escape.', extension: 'Can you get away as R on the hexagon with a triangle? (No: it folds to one dot.)', connection: 'Who wins depends on the map alone: C wins exactly on maps that fold to one dot.', sourceIds: SOURCES},
  provenance: 'Week 86 shared p. 1: “Swap jobs between games”, and upper Problem 3’s “Challenge your partner on both”.'
};
for (const [name, m] of Object.entries(playMaps)) assert.equal(bestValue(gameOf(m)) < game.INF, ['path', 'tree', 'sun'].includes(name), `playground ${name}: who wins`);

const MATHEMATICS = 'C and R stand on dots of a map of roads. C chooses a dot, then R; C moves first, and on a turn a piece stays or takes one road. C catches R by landing on its dot. With one cop, C wins from every start exactly on the maps that fold to one dot, a fold removing a dot v whose reach (v and its neighbours) lies inside a neighbour’s reach (Nowakowski and Winkler; Quilliot). Every tree folds, leaf by leaf: walking toward R, C shrinks the piece of the tree that R can use. A bare ring of four or more dots has no fold, and R stays across from C forever. A fold never changes who wins, so a map that folds down to a bare ring is robber-win: the house, or a pentagon with one road across. Two cops always win on a ring: one holds a dot and the other sweeps the path that is left. The app plays the other side perfectly, by exhaustive game search: as R it holds out as long as it can, so a catch within the moves shown is a real strategy; as C it tries every start and every move, and an escape counts only when every C move from every position the child’s replies reach has been answered.';
const json = {
  title: 'Cops and robbers',
  version: 1,
  families: [{id: 'cops', title: 'Cops and robbers', mathematics: MATHEMATICS, rules: RULES, sourceIds: SOURCES}],
  sources: [
    {id: 'cops-week86', title: 'Bellingham Math Circle — Week 86: Pursuit and escape (shared and upper packets, materials and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-86', kind: 'local curriculum'},
    {id: 'cops-card86', title: 'Week 86 review card, second card run and math check (fix 4’s tree, the odd-ring and crossing-chord notes, App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-86.md', kind: 'local curriculum'},
    {id: 'cops-nw', title: 'Richard Nowakowski and Peter Winkler — Vertex-to-vertex pursuit in a graph, Discrete Mathematics 43 (1983) 235–239 (cop-win graphs are the dismantlable ones)', url: 'https://doi.org/10.1016/0012-365X(83)90160-7', kind: 'research'},
    {id: 'cops-af', title: 'Martin Aigner and Michael Fromme — A game of cops and robbers, Discrete Applied Mathematics 8 (1984) 1–12 (cop numbers; three cops suffice on planar graphs)', url: 'https://doi.org/10.1016/0166-218X(84)90073-8', kind: 'research'},
    {id: 'cops-bn', title: 'Anthony Bonato and Richard Nowakowski — The Game of Cops and Robbers on Graphs, American Mathematical Society, Student Mathematical Library 61 (2011), Chapter 2 (cop-win graphs, retracts and Quilliot’s theorem)', url: 'https://bookstore.ams.org/stml-61', kind: 'research'}
  ],
  puzzles: [playground, ...out, ...folds, ...twos]
};
await writeFile(new URL('../dist/families/cops/cops.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log([...out, ...folds, ...twos].map(p => `${p.id} ${p.parameters.mode || p.mechanic} ${p.solution.actions.length} hint steps`).join('\n'));
