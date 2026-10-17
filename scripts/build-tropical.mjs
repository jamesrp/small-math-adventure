// Authoring list for Three-arm lines (worksheet Week 78, tropical lines).
// Puzzles are written in grid squares and stored in half-steps. For each one
// this computes, with the mechanic's own geometry, the answer it claims (the
// places for B, the one junction, the ray of junctions, or the certificates
// that no line exists), checks them against the table in
// docs/tropical/README.md and writes dist/families/tropical/tropical.json.
// Run: node scripts/build-tropical.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as L from '../dist/families/tropical/lines.js';
import {meetAnswers, goalMet, throughAnswer, answerRay, certificatesOf} from '../dist/families/tropical/tropical.js';

const H = ([x, y]) => [2 * x, 2 * y];
const units = ([u, v]) => [u / 2, v / 2];
const WIN = [0, 0, 16, 16];
const NAMES = ['P', 'Q', 'R'];

const RULES = [
  'A line has a junction and three arms: one to the right, one up, and one down to the left along the diagonal. The arms go on for ever, past the edge of the board.',
  'Every line is this same shape, moved without turning.',
  'Points between grid dots count too.'
];
const MORE = {
  meet: 'Two lines share a point when it is on both of them. Sharing a stretch means sharing every point along it, past the edge too.',
  through: 'The line passes a circle when the middle of the circle is on one of its arms.',
  cant: 'Can’t is judged at your junction: its line must pass the two circles you tap, be the only line through both, and miss another circle.',
  every: 'Keep marks where the junction is; Drop takes off the marks there. A slide marks every point along the way, and a slide off the board keeps the mark going for ever.'
};
const MATH = 'A line is three arms from one junction: right, up, and down to the left along the diagonal, each running on for ever. Every line is the same shape, moved without turning.';
const CONTROLS = {
  meetPoint: `${MATH} Tap where grid lines cross to move B there, or drag it; arrow keys move it too. Press Check when you think the two lines share only the ringed point.`,
  meetRay: `${MATH} Tap where grid lines cross to move B there, or drag it; arrow keys move it too. Press Check when you think the two lines share exactly the shaded stretch, all the way past the edge.`,
  through: `${MATH} Tap where grid lines cross to move the junction there, or drag it; arrow keys move it too. Press Check when its line passes through every circle.`,
  cant: ' If no line can, press Can’t and tap two circles that show why.',
  every: `${MATH} Tap where grid lines cross to move the junction there; arrow keys move it too. Keep marks where the junction is, and Drop takes off the marks there. Slide from a point to mark every point along the way; slide on off the board to keep the mark going for ever (with a keyboard, Shift and an arrow key mark from the junction). Press That’s all when every junction whose line passes both circles is marked, and nothing else.`,
  playground: `${MATH} Tap A or B to choose it, then tap where grid lines cross to move it there, or drag either one. Arrow keys move the chosen one, and Enter switches. What the two lines share is drawn in green.`
};
const VISIBLE = {
  meetPoint: 'Make the two lines share only the ringed point.',
  meetRay: 'Make the two lines share exactly the shaded stretch.',
  through: 'Make the line pass through every circle.',
  every: 'Mark every junction whose line passes both circles.'
};
const OBJECTIVE = {
  meetPoint: 'Move B so that the two lines share the ringed point and no other point.',
  meetRay: 'Move B so that the two lines share exactly the shaded stretch: every point of it, running on past the edge, and nothing else.',
  through: 'Move the junction so that its line passes through every circle, or show with Can’t that no line can.',
  throughTwo: 'Move the junction so that its line passes through every circle.',
  every: 'Mark every junction whose line passes through both circles, and nothing else, then press That’s all.'
};
const SOURCES = ['tropical-week78', 'tropical-card78', 'tropical-speyer', 'tropical-tewari'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Just one point', mode: 'meet', A: [4, 4], goal: {kind: 'point', at: [6, 4]}, start: [2, 6],
    check: {answers: [[6, 0], [6, 1], [6, 2], [6, 3], [7, 5], [8, 6]]},
    prereq: 'Move a shape without turning it and look along its arms. No reading; a grown-up can read the goal.',
    idea: 'Two lines share a single point when B’s line reaches the ring along a different arm from A’s, with B off A’s row, column and diagonal.',
    hints: ['Follow A’s arm through the ring. Which arm of B could reach the ring another way?', 'B’s up arm or its slanting arm can pass the ring. Keep B off A’s row.', 'Put B straight below the ring.'],
    parent: {notice: 'Whether your child first puts B right on the ring. The lines then share A’s whole right arm from the ring on, not just the ring.', prompt: 'Where else could B go so that the lines still share only the ring?', explanation: 'The ring (6, 4) is on A’s right arm. B’s line must pass the ring, so the ring is on one of B’s arms: B is left of it on its row, below it in its column, or up and to the right of it on its diagonal. Left of the ring is A’s own row, and junctions on one row share the right arm of the right-hand one. Below the ring, at (6, 0) to (6, 3), or up and to the right, at (7, 5) or (8, 6), the lines share only the ring: 6 places on the board.', extension: 'Can two lines share exactly two points? (No: two lines share one point, a whole stretch, or everything.)', connection: 'These are tropical lines. Two of them always meet, usually in exactly one point as ordinary lines do, but there are no parallels.'},
    provenance: 'Week 78 Problem 1 (revised October 15): junction A at (4, 4) on a top grid, with B chosen so the lines share just one point; the ring at (6, 4) is new.'},
  {number: 2, level: 'easy', title: 'A whole stretch', mode: 'meet', A: [4, 4], goal: {kind: 'ray', from: [4, 4], dir: 'E'}, start: [6, 2],
    check: {answers: [[0, 4], [1, 4], [2, 4], [3, 4]]},
    prereq: 'Move a shape without turning it and look along its arms. No reading; a grown-up can read the goal.',
    idea: 'Two junctions in one row share the right arm of the right-hand one, so for the shared stretch to start at A, B goes left of A on its row.',
    hints: ['Which arm of B could lie along A’s right arm?', 'Two junctions in one row share the right arm of the right-hand one.', 'Put B on A’s row, left of A.'],
    parent: {notice: 'Whether your child puts B on the shaded stretch, right of A. Then the lines share B’s right arm, which starts too late, and Check shows it.', prompt: 'If B were right of A on the same row, where would the shared stretch start?', explanation: 'The shaded stretch is A’s whole right arm, from (4, 4). Two lines share a stretch running right only when their junctions are on one row, and then they share the right arm of the right-hand junction. For that to be A’s, A is the right-hand one, so B is left of A on row 4: (0, 4), (1, 4), (2, 4) or (3, 4), 4 places. B right of A starts the shared stretch at B; B off the row gives a single point.', extension: 'Where can B go to share A’s whole up arm instead? (Anywhere straight below A.)', connection: 'When the junctions share a column, a row or a rising diagonal, two tropical lines overlap along a ray: the one exception to meeting in a single point.'},
    provenance: 'Week 78 Problem 1 (revised October 15): junction A at (4, 4), with B chosen so the lines overlap along a whole stretch; Problem 2’s pair (2, 4) and (6, 4) shares a right arm the same way.'},
  {number: 3, level: 'easy', title: 'Through two', mode: 'through', targets: [[2, 5], [6, 2]], start: [6, 6],
    check: {junction: [2, 2]},
    prereq: 'Move a shape without turning it and see whether its arms pass through circles. No reading; a grown-up can read the goal.',
    idea: 'Each circle must be on one of the three arms; two circles on different arms fix the junction.',
    hints: ['Can one unchanged shape touch both circles? Try P on each of the three arms.', 'With P on the up arm and Q on the right arm, the junction is below P and level with Q.', 'Put the junction below P and left of Q.'],
    parent: {notice: 'Whether your child moves the whole shape about, or wishes an arm could bend to reach a circle.', prompt: 'Is there a second line through P and Q?', explanation: 'For P to be on an arm, the junction is left of P on its row, below P in its column, or up and to the right of P on its diagonal; the same goes for Q. Those places meet only at (2, 2): P is on its up arm and Q on its right arm. So exactly one line passes both.', extension: 'Where could two circles go so that more than one line passes both? (On one row, one column or one rising diagonal.)', connection: 'Two points of the tropical plane usually lie on exactly one tropical line, as in Euclid’s first postulate.'},
    provenance: 'Week 78 Problem 4, left grid: P = (2, 5) and Q = (6, 2), junction (2, 2).'},
  {number: 4, level: 'easy', title: 'Through two again', mode: 'through', targets: [[2, 2], [6, 5]], start: [2, 6],
    check: {junction: [5, 5]},
    prereq: 'Move a shape without turning it and see whether its arms pass through circles. No reading; a grown-up can read the goal.',
    idea: 'A circle on the slanting arm puts the junction up and to the right of it.',
    hints: ['Which arm could reach P, low on the left?', 'P is on the slanting arm, so the junction is up and to the right of P. Q is on another arm.', 'Put the junction up and to the right of P and left of Q.'],
    parent: {notice: 'Whether your child uses the slanting arm, or only tries the up and right arms, which can’t reach both circles.', prompt: 'Why can’t P be on the up arm?', explanation: 'P = (2, 2) is low and to the left of Q = (6, 5). With P on the right arm or the up arm, the junction is left of P or below P, and no arm from there reaches Q. With P on the slanting arm, the junction is up the diagonal from P: (3, 3), (4, 4), (5, 5) and so on. The right arm from (5, 5) passes Q. So (5, 5) is the only junction.', extension: 'Add a third circle that is on this line, and one that is not.', connection: 'Two points of the tropical plane usually lie on exactly one tropical line.'},
    provenance: 'Week 78 Problem 4, right grid: P = (2, 2) and Q = (6, 5), junction (5, 5).'},
  {number: 5, level: 'medium', title: 'Down the diagonal', mode: 'meet', A: [4, 4], goal: {kind: 'ray', from: [4, 4], dir: 'SW'}, start: [6, 2],
    check: {answers: [[5, 5], [6, 6], [7, 7], [8, 8]]},
    prereq: 'Move a shape without turning it and follow a diagonal. No reading; a grown-up can read the goal.',
    idea: 'Junctions on one rising diagonal share the slanting arm of the lower junction, and not the stretch between them; for the shared arm to be A’s, B goes up and to the right of A.',
    hints: ['Which places for B put its slanting arm along A’s?', 'Two junctions on one rising diagonal share the slanting arm of the lower one.', 'Put B up and to the right of A, on its diagonal.'],
    parent: {notice: 'Whether your child puts B down and to the left of A on the diagonal (then the shared stretch starts at B, too low), and notices that the stretch between A and B is not shared.', prompt: 'With B at (6, 6), is the point (5, 5) on both lines?', explanation: 'The shaded stretch is A’s slanting arm, down and to the left from (4, 4). Lines share a slanting stretch only when their junctions are on one rising diagonal, and then they share the slanting arm of the lower junction. For that to be A’s, A is the lower one, so B is up and to the right of A on its diagonal: (5, 5), (6, 6), (7, 7) or (8, 8), 4 places. The points between A and B, such as (5, 5) with B at (6, 6), are on B’s line but not on A’s, whose arms go right, up and down to the left from (4, 4). B down and to the left of A starts the shared stretch at B.', extension: 'Where must B go so that they share the slanting stretch from (2, 2) instead? (At (2, 2) itself.)', connection: 'When the junctions share a rising diagonal, two tropical lines overlap along a ray.'},
    provenance: 'Week 78 Problem 2, fourth pair: junctions (2, 2) and (6, 6) share the slanting ray from (2, 2) and not the stretch between; here the shared ray is A’s, so B goes above A, as in the guide’s answer menu for Problem 1, B = (6, 6) with A = (4, 4).'},
  {number: 6, level: 'medium', title: 'Just above A', mode: 'meet', A: [2, 2], goal: {kind: 'point', at: [2, 3]}, start: [6, 1],
    check: {answers: [[0, 3], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]]},
    prereq: 'Move a shape without turning it and look along its arms. No reading; a grown-up can read the goal.',
    idea: 'A ring on A’s up arm is reached by B’s right arm from the left or by B’s slanting arm from up and to the right, never from below, which is A’s column.',
    hints: ['Which arm of B could pass the ring without lying along A’s line?', 'B’s right arm reaches the ring from the left; B’s slanting arm reaches it from up and to the right.', 'Put B up and to the right of the ring.'],
    parent: {notice: 'Whether your child tries B straight below the ring first. Check then shows the whole up arm shared.', prompt: 'Why does B below the ring share a whole stretch?', explanation: 'The ring (2, 3) is on A’s up arm. Below the ring is A’s own column, and two junctions in one column share an up arm. Left of the ring, at (0, 3) or (1, 3), B’s right arm crosses A’s up arm at the ring only. Up and to the right, at (3, 4), (4, 5), (5, 6), (6, 7) or (7, 8), B’s slanting arm comes down to the ring: 7 places in all. The worksheet’s B = (5, 6) is one of them.', extension: 'Which places for B make the lines meet only at (3, 2), on A’s right arm? (Below it, or up and to the right of it.)', connection: 'Two tropical lines with junctions in general position meet in exactly one point.'},
    provenance: 'Week 78 Problem 1, fixed bottom grid: A = (2, 2) and B = (5, 6) share only (2, 3); here the point is given and B is chosen.'},
  {number: 7, level: 'medium', title: 'Side by side', mode: 'every', targets: [[2, 4], [6, 4]], start: [5, 6],
    check: {ray: {from: [2, 4], dir: 'W'}},
    prereq: 'Move the junction and see whether the line passes both circles; a slide to mark a stretch. A grown-up can read the goal.',
    idea: 'Circles on one row allow a whole ray of junctions: every point left of the left circle, between dots and past the edge.',
    hints: ['Find one junction that works. Can you slide it a little while both circles stay on the line?', 'Slide it the other way until it stops working.', 'Every junction on P’s row, at P or left of it, works.'],
    parent: {notice: 'Whether your child keeps only grid dots, or also the points between them and past the edge.', prompt: 'Does a junction at (1½, 4) work? And one far off the board to the left?', explanation: 'Both circles are on row 4. A junction on that row, at P or left of it, has both on its right arm. Anywhere else one circle is missed: below P, P is on the up arm and Q on no arm; right of P, P is behind the junction. So the junctions are the ray from P = (2, 4) to the left, every point between dots included, running on past the edge: infinitely many lines through two points.', extension: 'Which pairs of circles allow more than one line? (Pairs on one row, one column or one rising diagonal.)', connection: 'The exception to “two points, one line”: points on one row, column or rising diagonal have a whole ray of tropical lines through them.'},
    provenance: 'Week 78 Problem 5, first pair: (2, 4) and (6, 4); the junctions are the ray left from (2, 4).'},
  {number: 8, level: 'medium', title: 'One above the other', mode: 'every', targets: [[3, 2], [3, 6]], start: [6, 5],
    check: {ray: {from: [3, 2], dir: 'S'}},
    prereq: 'Move the junction and see whether the line passes both circles; a slide to mark a stretch. A grown-up can read the goal.',
    idea: 'Circles in one column allow every junction straight below the lower circle.',
    hints: ['Find one junction that works, then try its neighbours.', 'Which way can the junction slide with both circles still on its up arm?', 'Every junction in P’s column, at P or below it, works.'],
    parent: {notice: 'Whether your child expects the junctions between the circles to work.', prompt: 'Why doesn’t a junction at (3, 4), between the circles, work?', explanation: 'With both circles on the up arm, the junction is in their column at or below the lower circle P = (3, 2). At (3, 4), between them, P is below the junction and on no arm. So the junctions are the ray down from P, running on past the edge.', extension: 'Compare with puzzle 7’s row: which way does each ray of junctions point, and why?', connection: 'Points in one column have a whole ray of tropical lines through them.'},
    provenance: 'Week 78 Problem 5, second pair: (3, 2) and (3, 6); the junctions are the ray down from (3, 2).'},
  {number: 9, level: 'hard', title: 'On a slant', mode: 'every', targets: [[2, 2], [5, 5]], start: [4, 3], step: 1, win: [0, 0, 6, 6],
    check: {ray: {from: [5, 5], dir: 'NE'}},
    prereq: 'Move the junction in half-steps and see whether the line passes both circles; a slide to mark a stretch. A grown-up can read the goal.',
    idea: 'Circles on one rising diagonal allow every junction up and to the right of the upper circle, where both are on the slanting arm.',
    hints: ['Find one junction that works. Is it between the circles?', 'Both circles must be on the slanting arm, which runs down and to the left from the junction.', 'Every junction on the diagonal, at Q or beyond it up and to the right, works.'],
    parent: {notice: 'Whether your child marks the stretch between the circles, as on a ruler, and what That’s all says then.', prompt: 'With the junction at (3½, 3½), between the circles, which circle is off the line?', explanation: 'The slanting arm runs down and to the left from the junction, so both circles are on it exactly when the junction is on their diagonal at or beyond the upper circle Q = (5, 5): the ray up and to the right from Q, half-steps included, running on past the corner. A junction between them has P on its slanting arm, but Q is above and to the right of it, on no arm.', extension: 'The junctions allowed by one circle T are the rays left, down, and up and to the right from T: the line’s shape turned half a turn. Draw them for P and for Q and see where they overlap.', connection: 'Allowed junctions form the line shape turned half a turn, so the rule for joining two points is the rule for meeting two lines turned round: duality in the tropical plane.'},
    provenance: 'Week 78 Problem 5, third pair: (2, 2) and (5, 5); the junctions are the ray up and to the right from (5, 5).'},
  {number: 10, level: 'hard', title: 'Into the corner', mode: 'meet', A: [4, 4], goal: {kind: 'point', at: [0.5, 0.5]}, start: [6, 2], step: 1, win: [0, 0, 6, 6],
    check: {answers: [[0.5, 0], [0, 0.5]]},
    prereq: 'Move a shape in half-steps without turning it and look along its arms. No reading; a grown-up can read the goal.',
    idea: 'The ring is on A’s slanting arm, so B can’t reach it along that diagonal; B’s right arm or up arm must, from half a square left of it or below it.',
    hints: ['B’s slanting arm through the ring would lie along A’s. Which other arm of B could reach the ring?', 'B’s right arm reaches it from the left, or B’s up arm from below. There is only half a square of room.', 'Put B half a square left of the ring.'],
    parent: {notice: 'Whether your child puts B on the diagonal first, sharing a whole stretch, and then finds the half-steps.', prompt: 'Why must B go between grid dots?', explanation: 'The ring (½, ½) is on A’s slanting arm. Up and to the right of the ring is A’s diagonal, where the lines would share a slanting stretch. So the ring must be on B’s right arm, with B left of it on its row, or on B’s up arm, with B below it in its column. On the board that leaves two places, each half a square away: (0, ½) and (½, 0). Then the lines share only the ring.', extension: 'Where could B go if the board ran on further left and down? (Anywhere left of the ring on its row, or below it in its column.)', connection: 'Two tropical lines meet in one point unless the junctions are aligned; whether they meet at one point depends on where the junctions are, not on a grid.'},
    provenance: 'New, after Week 78 page 1 (“Points between grid dots count too”) and Problem 2’s diagonal pair: the point is on A’s slanting arm, in the corner.'},
  {number: 11, level: 'hard', title: 'Three circles', mode: 'through', targets: [[2, 2], [7, 5], [5, 8]], start: [2, 6], cant: true,
    check: {junction: [5, 5]},
    prereq: 'Find the junction for two circles, then check a third. A grown-up can read the goal.',
    idea: 'Two circles fix the junction; the third circle is on that line or it isn’t.',
    hints: ['Find the junction for two of the circles first.', 'P and Q fix the junction up and to the right of P and left of Q. Is R on that line?', 'Put the junction up and to the right of P and left of Q.'],
    parent: {notice: 'Whether your child finds the junction for two circles and then looks at the third, or moves the junction about hoping.', prompt: 'Which two circles would you start with?', explanation: 'P = (2, 2) and Q = (7, 5) allow only the junction (5, 5): P on its slanting arm and Q on its right arm. R = (5, 8) is on its up arm. So the line with junction (5, 5) passes all three circles, and Can’t is wrong.', extension: 'Move R one square so that no line passes all three.', connection: 'Three points lie on one tropical line only in special position, as for ordinary lines.'},
    provenance: 'Week 78 research notes (plans/frontier-prototypes-76-78/week-78/research.md, “A three-point challenge”): (2, 2), (7, 5) and (5, 8) all lie on the line with junction (5, 5).'},
  {number: 12, level: 'hard', title: 'Three more circles', mode: 'through', targets: [[2, 2], [7, 5], [6, 6]], start: [2, 6], cant: true,
    check: {certificates: [{picks: [0, 1], at: [5, 5]}, {picks: [1, 2], at: [6, 5]}]},
    prereq: 'Find the junction for two circles, see that the third is off its line, and explain why no other junction is possible. A grown-up can read the goal.',
    idea: 'When two circles allow only one junction and its line misses the third circle, no line passes all three: the two circles’ fans of allowed junctions meet only there.',
    hints: ['Find the only junction for two of the circles.', 'P and Q allow only one junction. Does its line pass R?', 'Put the junction up and to the right of P and left of Q: its line misses R, and no other junction passes P and Q.'],
    parent: {notice: 'Whether your child presses Can’t after a few tries, or after finding the one junction that two circles allow.', prompt: 'How do you know no other junction passes P and Q?', explanation: 'The junctions whose line passes P fill P’s fan: left of P, below P, and up and to the right of P. Q’s fan is the same shape at Q. P = (2, 2) and Q = (7, 5) are not on one row, column or rising diagonal, so their fans meet in one point, (5, 5). The line from (5, 5) has its arms along row 5, column 5 and the diagonal through (2, 2), and R = (6, 6) is on none of them. So no line passes all three. Q and R also fix a junction, (6, 5), whose line misses P: a second certificate. P and R, on one diagonal, allow a whole ray of junctions and certify nothing.', extension: 'Where could R go to make it possible? (Anywhere on the line with junction (5, 5).)', connection: 'Point–line duality in the tropical plane: the junctions allowed by a point form a turned line, so three points share a line exactly when their three fans share a point.'},
    provenance: 'Week 78 review card, App fit (“Three targets can make it impossible”), from the research notes: (2, 2), (7, 5) and (6, 6); the first two force junction (5, 5), and (6, 6) is not on that line.'}
];

const out = PUZZLES.map(item => {
  const id = `tropical-${String(item.number).padStart(2, '0')}`, step = item.step || 2;
  const q = {mode: item.mode, win: item.win ? item.win.map(c => 2 * c) : WIN, step};
  let solution, kind = item.mode;
  if (item.mode === 'meet') {
    Object.assign(q, {A: H(item.A), goal: item.goal.kind === 'point' ? {kind: 'point', at: H(item.goal.at)} : {kind: 'ray', from: H(item.goal.from), dir: item.goal.dir}, start: H(item.start)});
    const answers = meetAnswers(q);
    assert.deepEqual(answers.map(units).map(String).sort(), item.check.answers.map(String).sort(), `${id}: the places for B`);
    assert.ok(!goalMet(q, q.start), `${id}: B does not start on an answer`);
    kind = item.goal.kind === 'point' ? 'meetPoint' : 'meetRay';
    solution = {places: answers.map(units)};
  } else {
    Object.assign(q, {targets: item.targets.map(H), names: NAMES.slice(0, item.targets.length), start: H(item.start)});
    if (item.cant) q.cant = true;
    if (item.mode === 'through') {
      const X = throughAnswer(q);
      assert.ok(!L.passesAll(q.start, q.targets), `${id}: the start is not an answer`);
      if (item.check.junction) {
        assert.equal(X?.kind, 'point', `${id}: one junction`);
        assert.deepEqual(units(X.at), item.check.junction, `${id}: the junction`);
        solution = {junction: units(X.at)};
      } else {
        assert.equal(X, null, `${id}: no line passes every circle`);
        const certs = certificatesOf(q);
        assert.deepEqual(certs.map(c => ({picks: c.picks, at: units(c.at)})), item.check.certificates, `${id}: the certificates`);
        solution = {cant: true, certificates: certs.map(c => ({circles: c.picks.map(k => q.names[k]), junction: units(c.at)}))};
      }
    } else {
      const R = answerRay(q);
      assert.equal(R?.kind, 'ray', `${id}: a ray of junctions`);
      assert.deepEqual({from: units(R.from), dir: R.dir}, item.check.ray, `${id}: the ray`);
      assert.ok(!L.passesAll(q.start, q.targets), `${id}: the start is not an answer`);
      solution = {ray: {from: units(R.from), dir: R.dir}};
    }
  }
  const controlsKey = kind === 'through' ? 'through' : kind;
  const objective = kind === 'through' ? (item.cant ? OBJECTIVE.through : OBJECTIVE.throughTwo) : OBJECTIVE[kind];
  return {
    id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Three-arm lines', mechanic: 'tropical', band: 'all', revision: 1, sourceDocument: 'docs/tropical/README.md',
    parameters: q,
    objective, visibleObjective: VISIBLE[kind], instruction: objective,
    controls: CONTROLS[controlsKey] + (item.cant ? CONTROLS.cant : ''),
    rules: [...RULES, MORE[item.mode], ...(item.cant ? [MORE.cant] : [])],
    idea: item.idea, prerequisites: item.prereq, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'tropical-playground', number: 0, title: 'Three-arm lines playground', difficulty_level: 'playground', familyTitle: 'Three-arm lines', mechanic: 'tropical', band: 'playground', revision: 1, sourceDocument: 'docs/tropical/README.md',
  parameters: {mode: 'playground', win: WIN, step: 2, start: [[1, 4], [4, 2]].map(H)},
  objective: 'Move two lines and see what they share.', visibleObjective: '', instruction: 'Move two lines and see what they share.',
  controls: CONTROLS.playground,
  rules: [...RULES, MORE.meet],
  idea: 'Free play with two lines: one shared point, or a shared stretch when the junctions share a row, a column or a rising diagonal.',
  prerequisites: 'None. A grown-up can suggest what to try.',
  hints: ['Put B on A’s row. What do they share now?', 'Put B straight below A, then straight above it.', 'Can you make the two lines miss each other?'],
  parent: {notice: 'Whether your child looks for a way to make the lines miss each other, and what they conclude.', prompt: 'Can two of these lines ever miss each other?', explanation: 'No: two lines always meet. Draw the rectangle with the two junctions at opposite corners. If one junction is up and to the left of the other, its right arm meets the other’s up arm at a corner. If one is down and to the left, the other’s slanting arm comes down to the bottom or the left side of the rectangle, where the first one’s right or up arm runs. They share one point unless the junctions share a row (a stretch running right), a column (a stretch running up) or a rising diagonal (a stretch running down to the left).', extension: 'Where do the lines with junctions (2, 7) and (10, 5) meet? (At (10, 7), off this board: the arms run on.)', connection: 'Week 78 Problems 2, 3 and 6: how two tropical lines meet.', sourceIds: SOURCES},
  provenance: 'Week 78 page 1 (revised October 15): the worked example, blue U = (1, 4) and orange V = (4, 2), which share only (4, 4).'
};

const json = {
  title: 'Three-arm lines',
  version: 1,
  families: [{id: 'tropical', title: 'Three-arm lines', mathematics: 'A line is a junction with three arms, right, up and down to the left along the diagonal, running on for ever: the points where the least of x − a, y − b and 0 occurs at least twice, a tropical line in the min-plus convention. Two lines with different junctions always meet: in exactly one point, unless the junctions share a column, a row or a rising diagonal, when they share the up, right or slanting arm of the higher, right-hand or lower junction. The junctions whose line passes a point T fill T’s fan, the rays left, down, and up and to the right from T: the line shape turned half a turn. So two points lie on exactly one line unless they share a row, column or rising diagonal, when a whole ray of junctions works; and three points lie on a line exactly when their three fans share a point. Points are kept in half-squares, so every test is exact.', rules: RULES, sourceIds: SOURCES}],
  sources: [
    {id: 'tropical-week78', title: 'Bellingham Math Circle — Week 78: Three-armed lines (one Grades 4–5 student packet, revised October 15, 2026, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-78', kind: 'local curriculum'},
    {id: 'tropical-card78', title: 'Week 78 review card and math check (keep; App fit and Decision of October 10, 2026)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-78.md', kind: 'local curriculum'},
    {id: 'tropical-speyer', title: 'David Speyer and Bernd Sturmfels — Tropical Mathematics (2004), section 1, printed pages 1–2 (min-plus operations and the repeated minimum) and section 3, printed pages 6–8 (tropical lines, their intersection, the line through two points), as the Week 78 sources cite', url: 'https://www.claymath.org/wp-content/uploads/2022/03/Speyer.pdf', kind: 'research'},
    {id: 'tropical-tewari', title: 'Ayush Kumar Tewari — Point-Line Geometry in the Tropical Plane (2020 preprint), sections 3–4, printed pages 3 and 5–8 (point–line incidence and duality; its max-plus convention turns the arms round)', url: 'https://arxiv.org/abs/2006.04425', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/tropical/tropical.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${JSON.stringify(p.solution).slice(0, 120)}`).join('\n'));
