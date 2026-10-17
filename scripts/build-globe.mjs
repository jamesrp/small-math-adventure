// Authoring list for Ball triangles (worksheet Week 61). Computes every
// puzzle's solutions with the mechanic's own exact tests in Q(√2, √3), checks
// them against the table in docs/globe/README.md, and writes
// dist/families/globe/globe.json. Run: node scripts/build-globe.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {solutionsOf, factsOf, flat, sumOf, matches, targetSteps, fractionText, keyOf, globeMechanics} from '../dist/families/globe/globe.js';

const M = globeMechanics.globe;
const sources = ['globe-week61', 'globe-card61', 'globe-petrunin'];
const RULES = {
  common: [
    'The dots are every 15° of latitude and longitude, and each corner sits on a dot.',
    'A side is the shorter arc of the great circle through two corners: the shortest way between them on the surface. A dashed side is on the back of the ball.',
    'The triangle is the smaller region inside its three sides. No two corners may be opposite, and the three may not all lie on one great circle.',
    'A corner’s size is the angle between its two sides on the surface, shown on its card above the ball. A square marks a right angle; ≈ means the corner is not a whole number of degrees.'
  ],
  right: 'A right angle is 90°, a square corner.',
  fraction: 'Fractions are of the ball’s whole surface.',
  records: 'A set is made when the triangle has exactly those three corners, in any order. If a set can’t be made on the ball, press Can’t, then tap it.',
  playground: 'Pair at A shades two opposite lunes: the one between the great circles through A’s sides that holds the triangle, and the one across the ball from it. Each region shows how many shaded pairs cover it.'
};
const CONTROLS = {
  common: 'A side is the shortest way between two corners on the ball’s surface, along a great circle. A corner’s size is the angle between its two sides on the surface, as its card above the ball shows. Tap a corner or its card to choose it, then tap a dot to move it there, or drag the corner. Drag the ball, or use the arrows, to turn it. Dark corners stay put.',
  records: ' To claim a set can’t be made, press Can’t, then tap that set.',
  playground: ' Tap a pair button to shade that corner’s lune pair.'
};
const objective = q => q.mode === 'right' ? 'Make a triangle whose three corners are all right angles.'
  : q.mode === 'fraction' ? `Make a triangle that covers ${fractionText(q)} of the ball’s surface.`
  : 'Make a triangle with each set of corners, or press Can’t and tap a set that can’t be made.';
const visible = q => q.mode === 'right' ? 'Make every corner a right angle.' : q.mode === 'fraction' ? `Cover ${fractionText(q)} of the ball.` : 'Make a triangle with each set of corners.';
const PREREQUISITES = {
  right: 'Recognise a right angle; the cards mark one with a square. No reading or arithmetic: a grown-up can read the goal.',
  fraction: 'Fractions such as 1/12 and 3/16, and sharing 360° into equal parts. Reading degrees on the cards.',
  records: 'Adding three angles in degrees and reading them on the cards. A grown-up can read the sets aloud.',
  playground: 'Counting to three. A grown-up can explain what a lune is.'
};
const NAB = ['N', 'A', 'B'], ABC = ['A', 'B', 'C'];
const POLE = [90, 0];

// check: the number of labelled solutions (or, for records, per record; 0 for one that can't be made).
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three right corners', mode: 'right', letters: NAB, start: {N: POLE, A: [0, 0], B: [30, 45]}, locked: ['N', 'A'], view: [20, 30], check: 2,
    idea: 'A triangle on a ball can have three right corners: each of its sides is a quarter of a great circle.',
    hints: ['Look at the corners at N and at A. Where could B go to make both of them right?', 'A’s corner is right when B is on the equator; N’s corner is right when B is a quarter of the way round from A.', 'Move B onto the equator, 6 steps east or west of A.'],
    parent: {notice: 'Whether your child expects it to be impossible, as with three straws on a table, and what they try first: moving B onto the equator, or round to a quarter turn from A.', prompt: 'Could a triangle on paper have two right corners? What is different on the ball?', explanation: 'N is the pole and A is on the equator, so the side NA is a meridian, and a meridian meets the equator at a right angle. With B on the equator a quarter turn (90°) from A, the side NB is a meridian too, and the corner at N is the 90° gap between the two meridians. All three sides are quarter circles and all three corners are right. This triangle, the octant, covers exactly 1/8 of the ball: eight of them fill it, four above the equator and four below. The app checks each right angle exactly, not to within a tolerance.', extension: 'Make three right corners with no corner on a pole (puzzle 7).', connection: 'The three planes through the corners and the centre are at right angles to each other, like the coordinate planes. The angle sum is 270°, which Girard’s theorem turns into an area of (270 − 180)/720 = 1/8.'},
    provenance: 'Week 61 Problem 2 (Grades 2–5, p. 2), “Can all three corners be right angles?”, with N fixed on the pole and A on the equator as in Problem 3’s figure (p. 3).'},
  {number: 2, level: 'easy', title: 'A twelfth', mode: 'fraction', letters: NAB, start: {N: POLE, A: [0, 0], B: [0, 30]}, locked: ['N', 'A'], view: [20, 30], fraction: [1, 12], check: 6,
    idea: 'With N on the pole and A and B on the equator, the triangle is half the lune between their meridians, so it covers N’s corner out of 720°.',
    hints: ['How many triangles like this one would cover the whole ball?', 'Two of these triangles, one above the equator and one below, make a lune. How many lunes fill the ball for a twelfth?', 'Six lunes fill the ball when the meridians are 60° apart: move B 4 steps east of A.'],
    parent: {notice: 'Whether your child counts copies round the ball (how many triangles fill it) or guesses and moves B step by step. The app shows the corners but never the area.', prompt: 'How many triangles like yours, above and below the equator, would cover the whole ball?', explanation: 'The meridians through A and B cut out a lune; if their gap is g degrees, 360/g lunes fill the ball, so the lune covers g/360 of it. The equator cuts the lune into two equal triangles, so N, A, B covers g/720. For 1/12 the gap is 60°: B 4 steps east or west of A. Four other places for B also cover exactly 1/12, though they are not on the equator: 30° north at 90° east or west (corners 90°, 60°, 90°), and 30° north at 150° east or west (corners 150°, about 40.9° and about 49.1°). In every case the corners add up to 240°. The app accepts all six.', extension: 'What fraction does each 15° step of B along the equator add? (1/48.)', connection: 'A lune of angle θ covers θ/360 of the sphere; the triangle with two right corners is half of one. This is the first step of the classical proof of Girard’s theorem.'},
    provenance: 'Week 61 Problem 4 (Grades 3–5, p. 4) turned round: Problem 4 asks the fraction of a given gap; here the fraction is given and the child makes the gap. Its 40° lune → nine lunes → 1/9 record is the model.'},
  {number: 3, level: 'easy', title: 'Two sets', mode: 'records', letters: NAB, start: {N: POLE, A: [0, 0], B: [30, 60]}, locked: ['N', 'A'], view: [20, 30], records: [[90, 90, 45], [60, 60, 60]], check: [4, 0],
    idea: 'On a ball a triangle’s corners add up to more than 180°, so three 60° corners, a flat triangle’s, can’t be made.',
    hints: ['Make the set you can make first. What do its corners add up to?', 'For 90°, 90° and 45°, put B on the equator 3 steps from A. Then try for three 60° corners.', '60°, 60° and 60° add up to 180°. Every triangle you make adds up to more. Press Can’t, then tap that set.'],
    parent: {notice: 'Whether your child tries to make three equal corners for a while before claiming, and what reason they give.', prompt: 'Your triangles’ corners always add up to more than 180°. How much more, and where is the extra on the ball?', explanation: 'With B on the equator 45° from A the corners are 45° at N and 90° at A and B; with B halfway up the meridian 90° from A they are 90°, 45° and 90°. Either way they add up to 225°. Every triangle on the ball has corners adding up to more than 180°, and the extra, divided by 720°, is the fraction of the ball it covers (Girard’s theorem): here 45/720 = 1/16. Three 60° corners add up to exactly 180°, which would leave no area, so no triangle has them. Small triangles come close, with corners just over 60°. When the claim is right, the app draws both sets of corners side by side: yours pass a straight line by the part shaded like the triangle; 60°, 60°, 60° only reach it.', extension: 'Make a triangle with all three corners equal. How small can the corners be? (Always more than 60°.)', connection: 'Girard’s theorem: area = (A + B + C − 180°)/720° of the sphere, so the angle sum exceeds 180° by the area. On a flat page the sum is exactly 180°; on a saddle it is less (Week 65).'},
    provenance: 'Week 61 Problem 7’s angle records (Grades 4–5, p. 7) turned into sets to make or refute; 60°, 60°, 60° is new, the flat equilateral triangle, after the review card’s App fit (“a corner sum of 180° or less leaves no area”).'},
  {number: 4, level: 'medium', title: 'Tilted', mode: 'right', letters: ABC, start: {A: [0, 0], B: [45, 90], C: [15, 30]}, locked: ['A', 'B'], view: [25, 45], check: 2,
    idea: 'Three right corners need three quarter-circle sides; with A and B already a quarter circle apart, C is a quarter circle from both.',
    hints: ['A and B are a quarter of a great circle apart. Where else is a quarter of a great circle from both of them?', 'There are two such dots, on opposite sides of the ball. Turn the ball to look for them.', 'Move C to 45° south on the line 90° east, below B.'],
    parent: {notice: 'Whether your child tries the poles first, as in puzzle 1, and notices the corners at A and B change as C moves.', prompt: 'Why can’t C go on the north pole this time?', explanation: 'A triangle has three right corners exactly when its corners are a quarter turn from each other (each side 90°). A, on the equator at 0°, and B, at 45° north on the 90° east line, are already 90° apart. C must be 90° from both: the two ends of the axis of the great circle through A and B, at 45° south on the 90° east line and at 45° north on the 90° west line. From a pole, B is only 45° away.', extension: 'Where would C go if B were at 30° north on the 90° east line? (60° south on that line, or 60° north on the 90° west line.)', connection: 'Three mutually perpendicular unit vectors: C is ±A × B. The octant can be turned to sit anywhere on the sphere.'},
    provenance: 'New, after Week 61 Problem 2: three right corners with no corner on a pole, so the triangle of Problem 3’s figure is turned.'},
  {number: 5, level: 'medium', title: 'A sixth', mode: 'fraction', letters: NAB, start: {N: POLE, A: [0, 0], B: [0, 45]}, locked: ['N'], view: [20, 20], fraction: [1, 6], check: 624,
    idea: 'A sixth needs N’s corner to be 120°, larger than a right angle: the wider the gap at N, the more of the ball the triangle covers.',
    hints: ['Which changes make the triangle cover more of the ball?', 'Each 15° of the gap at N adds 1/48 of the ball. How many 48ths is a sixth?', 'A sixth is 8/48: put A and B on the equator 8 steps apart.'],
    parent: {notice: 'Whether your child widens the gap with both corners or one, and whether they predict the gap before moving.', prompt: 'If 60° gives a twelfth, what gap gives a sixth?', explanation: 'With A and B on the equator the triangle covers N’s corner out of 720°, and 720/6 = 120°: A and B 8 steps apart, either way round, anywhere on the equator. This is Problem 3’s “larger than a right angle” case, and its question “which changes make the triangle cover more?”: only the gap at N matters. Other triangles with a corner on the pole also cover exactly 1/6 (their corners add up to 300°), and the app accepts them.', extension: 'Can a triangle with N on the pole and A and B on the equator cover a quarter of the ball? (No: that needs a 180° gap, and then A and B are opposite.)', connection: 'Area grows linearly with the angle at the pole: the lune fraction θ/360.'},
    provenance: 'Week 61 Problem 3 (Grades 2–5, p. 3), N’s corner larger than a right angle, with a named fraction as in Problem 4’s 120° gap (1/6).'},
  {number: 6, level: 'medium', title: 'Three sets', mode: 'records', letters: NAB, start: {N: POLE, A: [0, 15], B: [15, 75]}, locked: ['N'], view: [20, 40], records: [[90, 90, 45], [90, 90, 120], [90, 90, 165]], check: [144, 144, 144],
    idea: 'With two right corners the third can be any size, up to 165° on this grid: it is the gap between meridians. Corners can add up to far more than 180°.',
    hints: ['Make two right corners first. What decides the third?', 'With A and B on the equator, N’s corner is the gap between them: 3 steps for 45°.', 'For 120° put A and B 8 steps apart on the equator; for 165°, 11 steps.'],
    parent: {notice: 'Whether your child finds that A and B on the equator give two right corners at once, and whether a set as wide as 90°, 90°, 165° makes them expect a Can’t.', prompt: 'These sets add up to 225°, 300° and 345°. Where on the ball is the extra over 180°?', explanation: 'With N on the pole and A and B on the equator, A and B are right corners and N’s corner is the gap: 3, 8 and 11 steps make 45°, 120° and 165° (Problem 3’s smaller and larger cases). The triangles cover 45/720 = 1/16, 120/720 = 1/6 and 165/720 = 11/48 of the ball. Every set here can be made, so a Can’t claim gets “There is a way.” The half-octant (A on the equator and B halfway up the meridian a quarter turn away) also makes 90°, 90°, 45°, with N as one of the right corners.', extension: 'What is the largest corner N can have? (Anything below 180°: 165° on this grid. At 180° A and B would be opposite, and the triangle would be half the ball.)', connection: 'Girard’s theorem again: the excess over 180° is the area.'},
    provenance: 'Week 61 Problem 3 (Grades 2–5, p. 3): N’s corner smaller and larger than a right angle, as sets of corners; 165° is new.'},
  {number: 7, level: 'hard', title: 'No pole', mode: 'right', letters: ABC, start: {A: [30, 0], B: [15, 45], C: [-15, 30]}, locked: ['A'], view: [10, 30], check: 8,
    idea: 'Three right corners can sit anywhere on the ball: each corner is a quarter of a great circle from the other two.',
    hints: ['Each side of a triangle with three right corners is a quarter of a great circle. What is a quarter circle from A?', 'One quarter circle from A is down A’s own line, through the equator, to 60° south. Another is on the equator, a quarter turn east or west.', 'Move C to 60° south on A’s line, then B onto the equator at 90° east.'],
    parent: {notice: 'Whether your child looks for a pole, and then realises any dot can play the pole’s part.', prompt: 'In puzzle 1 N was on the pole. What does A have here that the pole had there?', explanation: 'Three right corners means every two corners are 90° apart. A is at 30° north on the 0° line. Going down its line through the equator, 90° away is 60° south on the same line; on the equator, 90° east and 90° west are 90° from A too (as they are from every point of the 0° line). Two of these that are 90° from each other complete the triangle: for example C at 60° south on A’s line and B on the equator at 90° east. On this grid there are four such triangles with A, each with two ways to letter B and C.', extension: 'Is there a triangle with three right corners and no corner on the equator? (Not on this grid: each of its 528 such triangles has a corner on the equator. On a perfect ball, yes: tip the octant.)', connection: 'An orthonormal frame containing a given vector: its other two vectors lie on the great circle perpendicular to it, a quarter turn apart.'},
    provenance: 'New, after Week 61 Problem 2: three right corners with one corner fixed off both the pole and the equator.'},
  {number: 8, level: 'hard', title: 'Three sixteenths', mode: 'fraction', letters: NAB, start: {N: POLE, A: [0, 0], B: [0, 30]}, locked: ['N'], view: [20, 30], fraction: [3, 16], check: 624,
    idea: 'Fractions add up along the equator: 3/16 is three 1/16 triangles side by side, a gap of 3 × 45° = 135°.',
    hints: ['How big a gap at N makes 1/16? How about three of those?', 'A sixteenth is a 45° gap. Three sixteenths are three of them side by side.', 'Put A and B on the equator 9 steps apart: 135°.'],
    parent: {notice: 'Whether your child works from a known fraction (1/16 is 45°) or from 720 directly, and whether they keep A and B on the equator.', prompt: 'How would you make 5/16 the same way? (225° is more than 180°: it can’t be done this way.)', explanation: 'With A and B on the equator the triangle covers g/720 of the ball, where g is the gap at N. 3/16 of 720° is 135°, nine 15° steps: three 45° triangles side by side. Other triangles with N on the pole also cover exactly 3/16, with corners adding up to 315°; the app accepts every one.', extension: 'Which fractions can a pole–equator triangle cover on this grid? (k/48 for k = 1 to 11.)', connection: 'Additivity of area: lunes with the same poles add their angles.'},
    provenance: 'Week 61 Problems 3–4: a gap read as a fraction, here a non-unit fraction built from Problem 4’s 45° case (1/16).'},
  {number: 9, level: 'hard', title: 'On its side', mode: 'fraction', letters: ABC, start: {A: [30, 0], B: [0, 30], C: [0, 330]}, locked: ['A'], view: [15, 15], fraction: [1, 16], check: 16,
    idea: 'Any dot can be the pole: with B on the equator a quarter turn from A’s line, the line through A is B’s equator, and a 45° gap along it gives 1/16.',
    hints: ['A is not on the equator or a pole. Could another corner be the pole, with A on its equator?', 'From the equator at 90° east, A’s whole line is a quarter circle away: it is that point’s equator.', 'Move B 4 steps east along the equator, to 90° east, then C to 15° south on A’s line.'],
    parent: {notice: 'Whether your child tries to use the north pole, as before, and whether the idea of a sideways pole appears.', prompt: 'Which corner is playing the part of the pole?', explanation: 'A pole and two points on its equator g° apart make a triangle covering g/720. The point on the equator at 90° east is a quarter turn from every point of the 0° line, so that line (through A) is its equator. With B there and C 45° along the line from A (at 15° south, or at 75° north), the triangle covers 45/720 = 1/16: the pole–equator triangle turned on its side, with corners 45° at B and 90° at A and C. Other solutions use the north or south pole: N, A and 30° south at 45° east or west, with corners 45° at N, about 140.4° at A and about 39.6° at the third. The app accepts all of them.', extension: 'With A here, can you cover 1/24? (Yes: B on the equator a quarter turn away and C 2 steps along A’s line.)', connection: 'The sphere looks the same from every point: any point and its great circle of points 90° away play the part of a pole and its equator.'},
    provenance: 'New, after Week 61 Problems 3–4: the pole–equator triangle with its pole on the equator and its equator a meridian.'},
  {number: 10, level: 'hard', title: 'Any corners', mode: 'records', letters: ABC, start: {A: [15, 0], B: [15, 60], C: [45, 30]}, locked: [], view: [25, 30], records: [[90, 90, 30], [90, 45, 45], [90, 90, 150]], check: [3744, 0, 3744],
    idea: 'Two right corners make a pole with two points on its equator, and then the third corner is the gap; half a square’s corners, 90°, 45°, 45°, add up to only 180° and fit no triangle on the ball.',
    hints: ['Which sets have two right corners? What makes two right corners?', 'Put one corner on a pole and the other two on the equator: their gap is the third corner.', '90°, 45° and 45° add up to 180°. Every triangle you make adds up to more. Press Can’t, then tap that set.'],
    parent: {notice: 'Whether your child builds from the pole and equator again, and whether the right corner in 90°, 45°, 45° makes that set look possible.', prompt: 'Is there any set of three corners adding up to more than 180° that can’t be made on a perfect ball? (Every set adding up to between 180° and 540° fits some triangle, with each corner less than 180° and A + B < C + 180° and so on; on this grid of dots, only sets with two right corners have whole-number corners.)', explanation: 'A corner on a pole and two on the equator g° apart give corners g°, 90°, 90°: 30° and 150° here, the very thin and very wide triangles. 90°, 45°, 45° add up to 180°, the corners of half a square on paper, which would leave no area. A triangle’s corners always add up to 180° plus its share of the ball times 720°, so no triangle has these.', extension: 'With no corner on a pole, can you still make 90°, 90°, 30°? (Yes: any dot can be the pole.)', connection: 'Girard’s theorem; and on this 15° grid the only triangles whose corners are all whole numbers of degrees have two right corners (the validator checks all 3,032,624 triangles).'},
    provenance: 'Week 61 Problem 7’s angle records (Grades 4–5, p. 7) as sets; 90°, 45°, 45° is new, after the review card’s App fit.'}
];

const id = n => `globe-${String(n).padStart(2, '0')}`;
const params = item => ({mode: item.mode, letters: item.letters, start: item.start, locked: item.locked, view: item.view, ...(item.fraction ? {fraction: item.fraction} : {}), ...(item.records ? {records: item.records} : {})});
const out = PUZZLES.map(item => {
  const p = {id: id(item.number), parameters: params(item)}, q = p.parameters;
  const board = M.fresh(p);
  assert.ok(M.valid(p, board), `${p.id}: the start is a triangle`);
  assert.ok(!M.solved(p, board), `${p.id}: the start is not solved`);
  const sols = solutionsOf(p);
  let solution;
  if (q.mode === 'records') {
    assert.deepEqual(sols.map(s => s.length), item.check, `${p.id}: solutions for each set`);
    assert.deepEqual(matches(q, q.start), [], `${p.id}: the start makes no set`);
    q.records.forEach((r, i) => assert.equal(flat(r), sols[i].length === 0, `${p.id}: set ${r} can’t be made exactly when its corners add up to 180° or less`));
    solution = {records: q.records.map((r, i) => flat(r) ? {cant: true, sum: sumOf(r)} : {witness: sols[i][0], count: sols[i].length})};
  } else {
    assert.equal(sols.length, item.check, `${p.id}: ${sols.length} solutions`);
    for (const s of sols) {
      const f = factsOf(q, s);
      if (q.mode === 'right') assert.ok(f.corners.every(c => c.deg === 90));
      else assert.equal(f.excess, targetSteps(q));
    }
    solution = {count: sols.length, witness: sols[0], places: [...new Set(sols.map(s => q.letters.filter(x => !q.locked.includes(x)).map(x => keyOf(s[x])).join(' ')))].slice(0, 8)};
  }
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Ball triangles', mechanic: 'globe', band: 'all', revision: 1, sourceDocument: 'docs/globe/README.md',
    parameters: q,
    objective: objective(q), visibleObjective: visible(q), instruction: objective(q),
    controls: `${CONTROLS.common}${q.mode === 'records' ? CONTROLS.records : ''}`,
    rules: [...RULES.common, RULES[q.mode]],
    idea: item.idea, prerequisites: PREREQUISITES[q.mode], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'globe-playground', number: 0, title: 'Ball triangles playground', difficulty_level: 'playground', familyTitle: 'Ball triangles', mechanic: 'globe', band: 'playground', revision: 1, sourceDocument: 'docs/globe/README.md',
  parameters: {mode: 'playground', letters: ABC, start: {A: POLE, B: [0, 0], C: [0, 90]}, locked: [], view: [30, 45]},
  objective: 'Move the corners and shade the lune pair at each corner. Each region shows how many pairs cover it.', visibleObjective: '',
  instruction: 'Move the corners and shade the lune pair at each corner. Each region shows how many pairs cover it.',
  controls: `${CONTROLS.common}${CONTROLS.playground}`,
  rules: [...RULES.common, RULES.playground],
  idea: 'Free play with a triangle and its three lune pairs: the triangle and the triangle opposite it are covered three times, every other region once, whatever the triangle.',
  prerequisites: PREREQUISITES.playground,
  hints: ['Shade all three pairs, then turn the ball to see the back.', 'Move a corner and watch the numbers.', 'The triangle and the one opposite it always show 3.'],
  parent: {notice: 'Whether your child expects the counts to change when the regions change size, as Problem 6 asks.', prompt: 'The three pairs together cover the ball once, plus the triangle and its opposite twice more. What does that say about their areas?', explanation: 'A lune pair at a corner of angle α covers α/180 of the ball. The three pairs together cover 3,1,1,1,1,1,1,3 times the eight regions: the triangle and its opposite three times, every other region once. So their areas add up to the whole ball plus four more triangles: (A + B + C)/180 = 1 + 4f, which gives f = (A + B + C − 180)/720. Starting from the octant every pair covers half the ball and 3/2 = 1 + 4 × 1/8. This is the six-lune proof of Girard’s theorem (Problem 7), which stays on paper.', extension: 'Make a long, thin triangle. Do the counts change?', connection: 'Lemma A.17 in Petrunin and Zamora Barrera: the spherical excess by covering the sphere with three lune pairs.', sourceIds: sources},
  provenance: 'Week 61 Problems 5 and 6 (Grades 4–5, pp. 5–6): mark each corner’s lune pair and count how many pairs cover each of the eight regions, on the octant and on unequal regions.'
};
{
  const board = M.fresh(playground);
  assert.ok(M.valid(playground, board) && !M.solved(playground, board), 'the playground starts valid and unsolved');
}
const json = {
  title: 'Ball triangles',
  version: 1,
  families: [{id: 'globe', title: 'Ball triangles', mathematics: 'Three corners sit on the dots of a ball, every 15° of latitude and longitude. A side is the shorter arc of the great circle through two corners, the shortest way between them on the surface; a corner’s size is the angle between its two sides on the surface; the triangle is the smaller region inside the sides, and no two corners may be opposite. Girard’s theorem: the triangle covers (A + B + C − 180°)/720° of the ball, so its corners always add up to more than 180°, and corners adding up to 180° or less leave no area. A pole with two points on its equator g° apart makes corners g°, 90°, 90° and covers g/720, half of a lune; three right corners cover 1/8. The three lune pairs at the corners cover the triangle and its opposite three times and every other region once, which proves the theorem. Every test is exact: coordinates lie in Q(√2, √3).', rules: RULES.common, sourceIds: sources}],
  sources: [
    {id: 'globe-week61', title: 'Bellingham Math Circle — Week 61: Triangles on a ball (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-61', kind: 'local curriculum'},
    {id: 'globe-card61', title: 'Week 61 review card and math check (three right corners, lune fractions, lune-pair coverings; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-61.md', kind: 'local curriculum'},
    {id: 'globe-petrunin', title: 'Anton Petrunin and Sergio Zamora Barrera — What Is Differential Geometry? Curves and Surfaces, version 7 (2025), Lemma A.17 (spherical excess by lune covering), printed p. 178, and §14B (antipodal points), p. 119', url: 'https://arxiv.org/pdf/2012.11814v7', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/globe/globe.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.mode === 'records' ? p.solution.records.map((r, i) => `${p.parameters.records[i].join('-')}: ${r.cant ? 'can’t' : r.count}`).join(', ') : `${p.solution.count} solutions, e.g. ${p.solution.places.slice(0, 3).join(' | ')}`}`).join('\n'));
