// Authoring list for Strands (worksheet Week 75, twists on a cylinder).
// Builds every puzzle's cylinder on the shared portal board, computes its
// crossings, fewest, certificate and witness with the mechanic's own
// functions, checks them against the table in docs/strands/README.md, and
// writes dist/families/strands/strands.json. Run: node scripts/build-strands.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {roomFromRows} from '../dist/portal-board.js';
import {strandMechanics, cylOf, routeOf, crossCount, fewest, barriers, apart, pairCounts, designPossible, layout, levelsBetween, ready} from '../dist/families/strands/strands.js';

const M = strandMechanics.strands;
// The cylinder: a strip one square wide and two tall, glued left to right,
// with real rims at the top and bottom; four lattice columns round and eight
// rows up. A and B sit half way round from the seam.
export const ROOM = {...roomFromRows(['a', 'b'], {wrapY: false}), n: 4, lattice: 'crosses'};
const A = 2, N = 4, ROWS = 8;
// A strand pulled straight: the nearest column on each row to the line from A to its B.
const straight = w => Array.from({length: ROWS - 1}, (_, j) => Math.round(A + w * N * (j + 1) / ROWS + 1e-9) + 0);
// The copies the unrolled view shows: the first, both strands' Bs, every
// copy of red that blue must cross from end to end, and a copy more on each
// side, at most six copies across (a phone's width), trimmed on the right
// first. Beads stay inside them.
const copiesFor = (wr, wb) => {
  const ks = [0, wr, wb];
  for (const k of barriers(wr, wb)) ks.push(k, wr + k);
  const lo = Math.min(...ks), hi = Math.max(...ks), extra = Math.max(0, hi - lo + 3 - 6);
  return [lo - 1 + Math.max(0, extra - 1), hi + 1 - Math.min(1, extra)];
};

// The fewest bead moves from a start to the fewest crossings: a search over
// rows of (red, blue) columns in the view, crossings first, then beads moved.
function movesToFewest(C, w, red, blue) {
  const cols = [];
  for (let x = C.lo; x <= C.hi; x++) cols.push(x);
  let prev = [[C.a, C.a, 0]];
  for (let j = 1; j <= C.M; j++) {
    const here = j === C.M ? [[C.a + w[0] * C.N, C.a + w[1] * C.N]] : cols.flatMap(x => cols.filter(y => ((y - x) % C.N + C.N) % C.N !== 0).map(y => [x, y]));
    prev = here.map(([x, y]) => {
      let best = Infinity;
      for (const [px, py, c] of prev) best = Math.min(best, c + levelsBetween(py - px, y - x, C.N) * 100);
      return [x, y, best + (j === C.M ? 0 : (x !== red[j - 1]) + (y !== blue[j - 1]))];
    });
  }
  return {crossings: Math.floor(prev[0][2] / 100), moves: prev[0][2] % 100};
}

const RULES = {
  shared: ['The strip’s left and right edges are glued, so it is a cylinder. Its top and bottom edges are rims.', 'Each strand runs up from A on the bottom rim to a B on the top rim. Its ends never move.', 'The unrolled view repeats the cylinder side by side. Each strand starts at the first A, in the shaded copy, and ends at the B of the copy it winds round to.'],
  untangle: 'Strands cross or keep apart: no two beads share a spot. A and B are not crossings.',
  design: 'Each strand pulls itself tight, so each pair crosses as few times as its ends allow.'
};
const CONTROLS = {
  untangle: 'Slide a bead sideways, in the cylinder or the unrolled view, or tab to a bead and use the left and right arrow keys (up and down go to the next bead). When they can’t cross fewer times, press Done, tap each copy of red that blue has to cross, and press That’s all. Undo takes back a move.',
  design: 'Tap an end above the top rim and then a B, or drag the end along the rim. Or choose an end’s button and use the left and right arrow keys. If no ends work, get two pairs right with every end at a different B, press Can’t and tap the strand whose end is in the middle. Undo takes back a move.',
  playground: 'Slide beads in either view. Tap an end above the top rim and then a B, or drag it. The twist buttons turn the top rim once round with both strands. Restart puts everything back.'
};
const PREREQ = {
  untangle: 'Drag beads and watch two strands at once. No arithmetic; a grown-up can read How to play. The unrolled view is the Week 41 lift.',
  certificate: 'Drag beads and watch two strands at once, then point at copies of red in the unrolled view. Grades 4–5 in the worksheet; younger children can untangle and leave the copies to a grown-up.',
  design: 'Count crossings up to three and keep three pairs in mind. Grades 4–5.'
};
const sources = ['strands-week75', 'strands-card75', 'strands-davis'];

// The table in docs/strands/README.md. D is blue minus red, row by row: the
// start's gaps in the unrolled view.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Both straight up', mode: 'untangle', w: [0, 0], red: [2, 2, 2, 2, 2, 2, 2], D: [1, 1, -1, -1, 1, 1, 1], check: {start: 2, fewest: 0, moves: 2},
    idea: 'Two strands whose ends sit straight above A can always be pulled apart: no crossing between them is forced.',
    hints: ['Look at the cylinder: where does blue cross red?', 'Blue can stay on one side of red all the way up.', 'Move the blue beads that are left of red over to its right.'],
    parent: {notice: 'Whether your child drags beads one at a time and watches the crossing rings disappear, and whether they press Done as soon as no ring is left.', prompt: 'Could a crossing ever be needed here?', explanation: 'Both strands end at the B straight above A (winding 0). Blue starts just right of red and dips across it to the left at its third and fourth beads and back: two crossings. Move those two blue beads (or the red beads) so blue stays on the right of red on every row, and there is no crossing at all. Equal windings never force a crossing.', extension: 'Make blue cross red four times without moving either end. Can it cross an odd number of times? (Yes: start on one side of red and finish on the other.)', connection: 'Arcs with the same winding are isotopic rel endpoints; one can be pushed off the other except at the shared ends.'},
    provenance: 'Week 75 grades 4–5 Problem 7 (fewest crossings for windings 5 and 5: equal windings), with both strands at winding 0.'},
  {number: 2, level: 'easy', title: 'One turn more', mode: 'untangle', w: [0, 1], red: [2, 2, 2, 2, 2, 2, 2], D: [1, -1, -2, -1, 1, 2, 3], check: {start: 2, fewest: 0, moves: 3},
    idea: 'Windings 0 and 1 need no crossing: blue can wind once round without ever meeting red away from the ends.',
    hints: ['In the unrolled view, blue goes from the first A to the next copy’s B. Does it have to cross red on the way?', 'Keep blue to the right of red from the bottom.', 'Drag the second, third and fourth blue beads from the bottom to the right of red.'],
    parent: {notice: 'Whether your child expects one crossing because blue goes round once, and checks in the unrolled view where blue really meets red.', prompt: 'Blue goes round once and red doesn’t. Why don’t they have to cross?', explanation: 'In the unrolled view red goes straight up from the first A and the next copy of red goes straight up from the next A. Blue runs from the first A to the next copy’s B: it starts on red and ends on the next copy, and it can run between them all the way up. Back on the cylinder it never meets red except at A and B. The start crosses red twice on its way, by going left of red and back.', extension: 'With windings 0 and 1, can blue cross red exactly once? (Yes: start blue on the left of red, then cross over once.)', connection: 'For windings a and b the fewest interior crossings is max(|a − b| − 1, 0); here |a − b| = 1.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings 0 and 1 (fewest 0).'},
  {number: 3, level: 'easy', title: 'Two turns each', mode: 'untangle', w: [2, 2], D: [-1, -3, -5, -6, -5, -2, -1], check: {start: 2, fewest: 0, moves: 3},
    idea: 'A strand can wind round twice and still need no crossing with another that winds the same: only the difference in winding matters.',
    hints: ['Both strands end at the same B. Is a crossing forced?', 'Blue drops back past the copy of red on its left and comes back. Take that out.', 'Keep blue just left of red on every row.'],
    parent: {notice: 'Whether your child thinks two windings each must mean crossings, and whether they use the room or the unrolled view to find the lap.', prompt: 'Red and blue both go round twice. Do they ever have to meet?', explanation: 'Both strands wind twice and end at the same B. In the unrolled view blue drops back across the copy of red to its left and returns: two crossings. Keeping blue one column left of red on every row removes both. Any two strands with the same winding can lie side by side.', extension: 'Twist the cylinder in the playground. Does a twist of both strands change the fewest crossings?', connection: 'A full twist of the cylinder adds the same number to every winding and is a homeomorphism fixing both rims, so it never changes the fewest crossings.'},
    provenance: 'Week 75 grades 4–5 Problem 7 (windings 5 and 5; does adding the same twist to both routes change the fewest crossings?), at windings 2 and 2.'},
  {number: 4, level: 'medium', title: 'Two turns', mode: 'untangle', w: [0, 2], red: [2, -1, -1, 2, 2, 2, 2], D: [-3, 3, -1, 1, 3, 7, 9], check: {start: 5, fewest: 1, moves: 3},
    idea: 'Windings 0 and 2 must cross once: in the unrolled view, blue starts left of the next copy of red and ends to its right.',
    hints: ['Untangle as far as you can. Then look at the unrolled view: which copies of red does blue have to get past?', 'Near the bottom blue winds round red itself and back. Take those laps out first.', 'Blue starts left of the copy of red that starts one copy right of A and ends right of it. That crossing has to stay.'],
    parent: {notice: 'Whether your child tries hard to remove the last crossing before pressing Done, and whether they can point at the copy of red that blue has to cross.', prompt: 'Which copy of red does blue have to cross, and why?', explanation: 'Blue runs from the first A to the B two copies right. The copy of red that starts at the A one copy right ends at the B one copy right: it starts right of blue and ends left of blue, so blue crosses it at least once, and each crossing with a copy of red is a crossing with red on the cylinder. The start also winds round red itself three times near the bottom, where red has a lap of its own, and crosses the copy that ends at blue’s B; those four can go, so one crossing is the fewest.', extension: 'Is there a drawing with exactly two crossings? (Yes: blue can leave A on red’s left and cross red itself once on the way.)', connection: 'This is the lower bound in the theorem: the lift of blue must pass every copy of red strictly between its ends.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings 0 and 2 (fewest 1).'},
  {number: 5, level: 'medium', title: 'Opposite ways', mode: 'untangle', w: [-1, 1], red: [2, 1, 1, -3, -3, -4, -4], D: [3, 3, -2, 5, 7, 10, 14], check: {start: 6, fewest: 1, moves: 3},
    idea: 'Strands that wind once each in opposite directions differ by 2, so they cross at least once.',
    hints: ['Red winds left and blue winds right. Watch the copy of red that starts one copy right of A.', 'Near the top blue goes past its own B and comes back. Take that out first.', 'Blue starts left of the copy of red that starts one copy right of A and ends right of it. That crossing has to stay.'],
    parent: {notice: 'Whether your child adds the two windings (1 and 1 the other way) to find the difference of 2, and whether that difference, not the turns, decides.', prompt: 'Red goes round once one way and blue once the other. How far apart are their Bs?', explanation: 'Red ends at the B one copy left and blue at the B one copy right: two copies apart. The copy of red that starts at the A one copy right ends at the first B, so blue starts left of it and ends right of it: one crossing is forced. The start also crosses red itself twice near the bottom and, near the top, the copies that start two and three copies right, past blue’s own B; all of those can go.', extension: 'With windings −1 and 2, how many crossings are forced? (Two: Puzzle 8.)', connection: 'Only the difference of windings matters: −1 and 1 behave like 0 and 2, since a twist of the whole cylinder takes one pair to the other.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings −1 and 1 (fewest 1).'},
  {number: 6, level: 'medium', title: 'Three strands', mode: 'design', targets: [0, 0, 1], start: [0, 0, 0], copies: [-1, 4], check: {possible: true}, witness: [0, 1, 2],
    idea: 'Ends one copy apart need no crossing and ends two apart need one, so a strand with its end between the other two keeps clear of both.',
    hints: ['Move one end and watch which pairs cross.', 'Red and green need ends two copies apart.', 'Put blue’s end between red’s and green’s.'],
    parent: {notice: 'Whether your child moves ends one at a time and watches all three pairs, and notices that a pair’s crossings depend only on how far apart its ends are.', prompt: 'How far apart must two ends be for their strands to cross once?', explanation: 'Pulled tight, two strands with ends g copies apart cross max(g − 1, 0) times. Red and green must cross once, so their ends are two copies apart, and blue must cross neither, so its end is at most one copy from each: between them. Red at the first B, blue one copy right and green two copies right is one answer.', extension: 'Can all three pairs cross once? (Puzzle 12.)', connection: 'The fewest crossings of two arcs is a distance on windings, minus one; on a line, three points have their outer gap equal to the sum of the inner two.'},
    provenance: 'New, from the Week 75 review card’s App fit (choose windings for crossing targets), with a first target of 0, 0, 1.'},
  {number: 7, level: 'medium', title: 'Three turns', mode: 'untangle', w: [0, 3], red: [5, 5, 2, 2, 2, 2, 2], D: [-1, -5, 2, 5, 10, 11, 14], check: {start: 6, fewest: 2, moves: 3},
    idea: 'Windings 0 and 3 force two crossings: blue must pass the two copies of red that start between its ends.',
    hints: ['Untangle as far as you can, then look for the copies of red that blue starts on one side of and ends on the other.', 'Near the bottom blue goes left round a copy of red and back. Take that lap out first.', 'Keep blue between red and the copy that ends at blue’s B all the way up.'],
    parent: {notice: 'Whether your child is surprised that three turns force only two crossings, and whether they can say which two copies of red blue must pass.', prompt: 'Blue winds three times. Why only two crossings and not three?', explanation: 'In the unrolled view blue runs from the first A to the B three copies right. The copies of red that start one and two copies right of A end at the Bs one and two copies right, so each has blue on one side at the bottom and the other side at the top: two crossings are forced. Red itself and the copy that starts three right share an end with blue, and shared ends don’t count. The start also goes left round the copy that starts one copy left and back, and crosses red itself and the copy that starts three right; those four can go. Straight strands cross exactly twice.', extension: 'Predict the fewest for windings 2 and 7. (Four.)', connection: 'max(|a − b| − 1, 0) with |a − b| = 3. A coarse grid can make two strands cross more than they must; this lattice is fine enough that the minimum is always reachable.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings 0 and 3 (fewest 2; the review card warns a 4 × 3 grid would give 3).'},
  {number: 8, level: 'hard', title: 'Back and forth', mode: 'untangle', w: [-1, 2], red: [2, 4, 4, 0, 0, -1, -1], D: [5, -1, -1, -2, 2, 5, 7], check: {start: 6, fewest: 2, moves: 4},
    idea: 'Windings −1 and 2 differ by 3, so two crossings are forced, exactly as for 0 and 3.',
    hints: ['Untangle first. Then find the copies of red that start right of A and end left of blue’s B.', 'Blue goes back and forth across red itself and the copy one right of A. Keep one crossing with that copy.', 'Keep blue right of red all the way up, and cross each copy that must be crossed once.'],
    parent: {notice: 'Whether your child connects this to Puzzle 7: the windings differ by 3 in both.', prompt: 'How is this like windings 0 and 3?', explanation: 'Red ends one copy left and blue two copies right: three copies apart. The copies of red that start one and two copies right of A end at the first B and one copy right, so blue must pass both: two crossings, and the straight strands achieve two. The start crosses the copy that starts one right three times and red itself twice; four of those can go. A twist of the whole cylinder by one turn takes windings −1 and 2 to 0 and 3 without changing any crossing.', extension: 'Which pairs of windings force exactly two crossings? (Those that differ by 3.)', connection: 'The full twist is a homeomorphism of the annulus fixing both rims; it adds 1 to every winding, so the minimum depends on a − b alone.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings −1 and 2 (fewest 2).'},
  {number: 9, level: 'hard', title: 'Four and two', mode: 'untangle', w: [2, 4], red: [6, 7, 8, 6, 7, 8, 9], D: [-5, -3, 1, 7, 7, 11, 9], check: {start: 5, fewest: 1, moves: 4},
    idea: 'Windings 2 and 4 force one crossing, the same as 0 and 2: only the difference matters.',
    hints: ['Compare with Puzzle 4.', 'Near the bottom blue goes left round a copy of red and back. Take that lap out first.', 'Only one copy of red has blue on different sides at its two ends.'],
    parent: {notice: 'Whether your child expects more crossings because both strands wind more, and checks against Puzzle 4.', prompt: 'Both strands wind more than in Puzzle 4. Why the same fewest?', explanation: 'Red ends two copies right and blue four. Only the copy of red that starts one right of A has blue on different sides at its two ends (it ends three copies right, left of blue’s B), so one crossing is forced, and one is enough. The start also goes left round the copy that starts one copy left of A and back, and crosses red itself and the copy that ends at blue’s B; those four can go.', extension: 'Does twisting just one strand change the fewest? (Yes: it changes the difference.)', connection: 'The pairs (0, 2) and (2, 4) are related by two full twists of the cylinder.'},
    provenance: 'Week 75 grades 4–5 Problem 6, windings 2 and 4 (fewest 1; the card keeps “(0,2) against (2,4)”).'},
  {number: 10, level: 'hard', title: 'The long way', mode: 'untangle', w: [-1, 3], red: [2, 4, 4, 3, 3, 2, -1], D: [5, -1, -3, -2, 3, 5, 11], check: {start: 7, fewest: 3, moves: 4},
    idea: 'Windings −1 and 3 differ by 4, so blue must pass three copies of red: three crossings.',
    hints: ['Take out the crossings that go back and forth first.', 'Near the bottom blue crosses red itself and the copy one right of A back and forth.', 'Keep blue right of red all the way up, and cross each copy that must be crossed once.'],
    parent: {notice: 'Whether your child can find all three copies of red after Done, and skips red itself and the copy that ends at blue’s B.', prompt: 'Which copies of red does blue have to cross? Which ones can it miss?', explanation: 'Blue goes from the first A to the B three copies right; red winds once left. The copies of red that start one, two and three copies right of A end at the first B and one and two copies right: blue starts left of each and ends right of each, so three crossings are forced, and straight strands make exactly three. Red itself shares A with blue and the copy that starts four right shares blue’s B, so neither is forced. The start crosses the copy that starts one right three times and red itself twice; four of those can go.', extension: 'For windings 2 and 7, which copies does blue have to pass? (Four: those starting one to four copies right.)', connection: 'The lift of blue goes from horizontal position 0 to d = 4 turns relative to red, and must pass each integer strictly between.'},
    provenance: 'New: the review card’s lower bound at a gap of four (Week 75 grades 4–5 Problem 7 asks for windings 2 and 7, too wide for this board).'},
  {number: 11, level: 'hard', title: 'Wider apart', mode: 'design', targets: [1, 1, 3], start: [0, 0, 0], copies: [-1, 4], check: {possible: true}, witness: [0, 2, 4],
    idea: 'Red and green crossing three times needs ends four copies apart; blue’s end two from each sits half way between.',
    hints: ['Red and green need their ends far apart. How far for three crossings?', 'Blue must be two copies from red and two from green.', 'Ends at the first B, two copies right and four copies right.'],
    parent: {notice: 'Whether your child finds the gap for three crossings (four copies) by trying, and then places blue in the middle.', prompt: 'Where can blue’s end go so it crosses each of the others once?', explanation: 'Pulled tight, ends g copies apart cross g − 1 times (g ≥ 1). Red and green cross three times, so their ends are four apart; blue crosses each once, so it is two from each: exactly in the middle. Windings 0, 2, 4 (the card’s answer) work, and so does any shift of them, such as −1, 1, 3.', extension: 'Which numbers can three pairs meet? (Turn each number into a gap between ends: one more than the number, or 0 or 1 for a number 0. The largest gap must be the sum of the other two.)', connection: 'On a line the outer gap of three points is the sum of the two inner gaps; with gap = crossings + 1 this gives (x + 1) + (y + 1) = z + 1.'},
    provenance: 'Week 75 review card, App fit: “three windings with pairwise crossings 1, 1, 3 (0, 2, 4)”.'},
  {number: 12, level: 'hard', title: 'Once each', mode: 'design', targets: [1, 1, 1], start: [0, 0, 0], copies: [-1, 4], check: {possible: false},
    idea: 'Three strands can’t each cross the other two once: crossing once needs ends two copies apart, and the outer two of three ends are then four apart (or level).',
    hints: ['Make two pairs cross once. What happens to the third?', 'Crossing once needs ends two copies apart. Where are the ends of the outer pair then?', 'With two pairs right and the ends apart, the third crosses three times. Press Can’t, then tap the strand whose end is in the middle.'],
    parent: {notice: 'Whether your child keeps moving ends after seeing two pairs right and the third wrong, and whether they can say why the third must go wrong.', prompt: 'If red and blue cross once and blue and green cross once, how far apart are red and green?', explanation: 'Crossing once means ends exactly two copies apart, so the three ends would sit at three different Bs, each two from the others. Order them along the rim: the strand in the middle is two from each of the others, and the outer two are then four apart, which is three crossings. No placement works. The middle strand is the certificate: its two gaps add up to the outer gap.', extension: 'Which numbers can three pairs meet? (Turn each number into a gap between ends: one more than the number, or 0 or 1 for a number 0. The largest gap must be the sum of the other two.)', connection: 'The fewest crossings max(|a − b| − 1, 0) comes from a distance on the integers, and three points on a line have one gap equal to the sum of the other two; once, once, once would need gaps 2, 2, 2.'},
    provenance: 'Week 75 review card, App fit and Decision: “1, 1, 1 is impossible since the outer gap is the sum of the inner two”.'}
];

const id = n => `strands-${String(n).padStart(2, '0')}`;
const base = {room: ROOM, a: A};
const out = PUZZLES.map(item => {
  let q, solution, rules = [...RULES.shared], controls, objective, visible, prerequisites;
  if (item.mode === 'untangle') {
    const [wr, wb] = item.w, red = item.red || straight(wr), blue = red.map((x, j) => x + item.D[j]);
    q = {mode: 'untangle', ...base, copies: copiesFor(wr, wb), w: item.w, start: [red, blue]};
    const C = cylOf(q), xr = routeOf(C, red, wr), xb = routeOf(C, blue, wb);
    assert.ok([...red, ...blue].every(x => x >= C.lo && x <= C.hi), `${id(item.number)}: beads inside the view`);
    assert.ok(apart(C, [xr, xb]), `${id(item.number)}: beads apart`);
    assert.equal(crossCount(C, xr, xb), item.check.start, `${id(item.number)}: start crossings`);
    assert.equal(fewest(wr, wb), item.check.fewest, `${id(item.number)}: fewest`);
    assert.ok(item.check.start > item.check.fewest, `${id(item.number)}: starts tangled`);
    // Several moves from the fewest: a start one drag away would make Done a guess.
    assert.deepEqual(movesToFewest(C, item.w, red, blue), {crossings: item.check.fewest, moves: item.check.moves}, `${id(item.number)}: moves to the fewest`);
    // The witness: both strands pulled tight.
    const tight = layout(C, item.w);
    assert.equal(crossCount(C, ...tight), item.check.fewest, `${id(item.number)}: tight strands reach the fewest`);
    solution = {startCrossings: item.check.start, fewest: item.check.fewest, movesToFewest: item.check.moves, barriers: barriers(wr, wb), witness: tight.map(r => r.slice(1, -1))};
    rules.push(RULES.untangle);
    controls = CONTROLS.untangle;
    objective = 'Slide the beads until red and blue cross as few times as they can. Then press Done, tap each copy of red that blue has to cross, and press That’s all.';
    visible = 'Untangle them, then press Done.';
    prerequisites = item.check.fewest ? PREREQ.certificate : PREREQ.untangle;
  } else {
    q = {mode: 'design', ...base, copies: item.copies, start: item.start, targets: item.targets};
    const C = cylOf(q);
    assert.equal(designPossible(q), item.check.possible, `${id(item.number)}: possible`);
    assert.notDeepEqual(pairCounts(item.start), item.targets, `${id(item.number)}: starts unsolved`);
    // Can't stands on an attempt: two pairs right with the ends apart, which the view can show.
    const W = [];
    for (let w = item.copies[0]; w <= item.copies[1]; w++) W.push(w);
    assert.ok(W.some(a => W.some(b => W.some(c => ready(q, [a, b, c])))), `${id(item.number)}: an attempt for Can’t exists`);
    assert.ok(!ready(q, item.start), `${id(item.number)}: the start isn’t one`);
    if (item.witness) {
      assert.deepEqual(pairCounts(item.witness), item.targets, `${id(item.number)}: witness`);
      const tight = layout(C, item.witness);
      [[0, 1], [1, 2], [0, 2]].forEach(([i, k], n) => assert.equal(crossCount(C, tight[i], tight[k]), item.targets[n], `${id(item.number)}: tight witness`));
      solution = {windings: item.witness};
    } else solution = {cant: true, certificate: 'the middle strand: its two gaps add up to the outer gap'};
    rules.push(RULES.design);
    controls = CONTROLS.design;
    objective = 'Move the ends so that each pair of strands crosses as often as its number. If no ends work, get two pairs right with every end at a different B, press Can’t and tap the strand whose end is in the middle.';
    visible = 'Each pair crosses as often as its number.';
    prerequisites = PREREQ.design;
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Strands', mechanic: 'strands', band: 'all', revision: 1, sourceDocument: 'docs/strands/README.md',
    parameters: q, objective, visibleObjective: visible, instruction: objective, controls, rules,
    idea: item.idea, prerequisites, hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playQ = {mode: 'playground', ...base, copies: [-1, 3]};
playQ.start = {s: layout(cylOf(playQ), [0, 1]).map(r => r.slice(1, -1)), w: [0, 1]};
assert.ok(M.valid({parameters: playQ}, M.fresh({parameters: playQ})), 'playground: a valid start');
const playground = {
  id: 'strands-playground', number: 0, title: 'Strands playground', difficulty_level: 'playground', familyTitle: 'Strands', mechanic: 'strands', band: 'playground', revision: 1, sourceDocument: 'docs/strands/README.md',
  parameters: playQ,
  objective: 'Slide strands on the cylinder, move their ends and twist the top rim, and watch the crossings in the unrolled view.', visibleObjective: '',
  instruction: 'Slide strands on the cylinder, move their ends and twist the top rim, and watch the crossings in the unrolled view.',
  controls: CONTROLS.playground,
  rules: [...RULES.shared, RULES.untangle],
  idea: 'Two strands on a cylinder with ends to move and a twist of the whole top rim: windings, crossings and twists to play with.',
  prerequisites: 'None. A grown-up or a partner can suggest windings to try.',
  hints: ['Move blue’s end one copy at a time and untangle each time.', 'Twist the top rim. Do the crossings change?', 'Move one end only. Do the crossings change now?'],
  parent: {notice: 'Whether your child predicts the crossings before moving an end, and whether a twist of the whole rim surprises them by changing nothing.', prompt: 'A twist turns both strands once round. Why doesn’t it change the crossings?', explanation: 'A twist turns every row sideways by its share of a full turn, so both strands move together and every gap between them stays the same: the crossings stay where they are and every winding goes up by one. Moving one end changes one winding and so the difference, and then the fewest crossings change too.', extension: 'Find windings that force exactly three crossings. (Any two that differ by 4.)', connection: 'The full twist generates the mapping class group of the annulus fixing its boundary pointwise, Z; it adds 1 to every winding.', sourceIds: sources},
  provenance: 'Week 75 grades 4–5 Problems 1 and 4 (lay routes of different windings; twist words), with crossings shown live and no twist-word quiz.'
};

const json = {
  title: 'Strands',
  version: 1,
  families: [{id: 'strands', title: 'Strands', mathematics: 'A strip whose left and right edges are glued is a cylinder (an annulus) with two rims. A strand runs from A on the bottom rim to B on the top rim; sliding it with its ends fixed never changes its winding, the copy of B its lift in the unrolled view reaches. Two strands with windings a and b sharing both ends cross at least max(|a − b| − 1, 0) times away from the ends, and strands pulled straight cross exactly that often: in the unrolled view the second strand starts on one side of each copy of the first that lies strictly between its ends and finishes on the other. A full twist of the cylinder adds the same number to every winding and changes no crossing. For three strands the gaps between ends add up along the rim, so three pairs that each cross once is impossible.', rules: RULES.shared, sourceIds: sources}],
  sources: [
    {id: 'strands-week75', title: 'Bellingham Math Circle — Week 75: Twists on a cylinder (grades 4–5 packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/source/week-75', kind: 'local curriculum'},
    {id: 'strands-card75', title: 'Week 75 review card (App fit: untangle to the fewest crossings, the lift view as the certificate, three windings for crossing targets)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-75.md', kind: 'local curriculum'},
    {id: 'strands-davis', title: 'Diana Davis — Billiards, Surfaces, and Geometry, Chapter 4 “Twisted cylinders”, Problem 111 and Figure 83 (related twist and shear imagery only; the fixed-end formula is the worksheet’s own extension)', url: 'https://dianadavis.github.io/billiards-book.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};

// Every puzzle starts valid and unsolved; the hints alone finish it.
for (const p of out) {
  let b = M.fresh(p);
  assert.ok(M.valid(p, b) && !M.solved(p, b), `${p.id}: fresh`);
  for (let i = 0; !M.solved(p, b) && i < 60; i++) {
    const h = M.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: ${h.text}`);
    b = M.move(p, b, h.action);
    assert.ok(b, `${p.id}: hint is legal`);
  }
  assert.ok(M.solved(p, b), `${p.id}: hints solve`);
}

await writeFile(new URL('../dist/families/strands/strands.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level.padEnd(6)} ${p.parameters.mode.padEnd(8)} ${JSON.stringify(p.parameters.w || p.parameters.targets)} copies ${JSON.stringify(p.parameters.copies)} ${JSON.stringify({...p.solution, witness: undefined})}`).join('\n'));
