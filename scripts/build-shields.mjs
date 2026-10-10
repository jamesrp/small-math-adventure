// Authoring list for Portal shields (worksheet Week 70). Computes each
// puzzle's fewest shields and every fewest arrangement with the mechanic's own
// search, checks them and the certificate (shots that cross only at S and T)
// against the table in docs/shields/README.md, and writes
// dist/families/shields/shields.json. Run: node scripts/build-shields.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {ROOM, fewestSets, shotClasses, isShot, meet, endOf, escaping, crossKey, targetsIn, shotAt} from '../dist/families/shields/shields.js';

const CENTRE = [4, 4], EDGE = [4, 0];
const CORNERS = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
const RULES = {
  room: ['The room’s right edge is glued to its left edge, and its top to its bottom. All four corners are the same S.', 'A shot goes straight from S. At an edge it comes back in through the matching edge, at the same height or the same place along, and keeps its direction.', 'The unrolled view repeats the room in every direction, so a shot goes on in one straight line. The shaded copy is the room itself.'],
  toT: 'A shot stops at the first T it reaches.',
  toS: 'This room has no T: a shot stops when it comes back to S.',
  shield: 'A shield sits on one cross of the room, never on S or T. It stops a shot only if the shot passes exactly through that cross, and it is on that cross in every copy.',
  drawn: 'Only the shots drawn count.',
  all: 'Every straight shot counts. After each change the app fires a shot that still gets through, if there is one.',
  fewest: (to) => `When no shot gets through, press Fewest. Then tap the ends of as many shots as you have shields, in the unrolled view, no two crossing except at ${to}: one shield could never stop two of them. Press Fewest again to go back to the shields.`,
  budget: (n, to) => `Use at most ${n} shields. If no ${n} can do it, press Can’t, then tap the ends of ${n + 1} shots in the unrolled view, no two crossing except at ${to}.`
};
const CONTROLS = 'Tap a cross in the room to put a shield there, and tap it again to take it off. After pressing Fewest or Can’t, tap the end of a shot (a T, or an S in a room without T) in the unrolled view to choose it, and tap it again to drop it. Tab with Enter or Space works too. Undo takes back a move.';
const PREREQ = {
  drawn: 'Follow a straight line across an edge of the room and back in at the other side. Counting to four; no reading beyond the one-line goal.',
  all: 'Watching a shot cross the room’s edges, and keeping track of a few shields at once. The worksheet is for grades 4–5.',
  cant: 'Seeing that two shots cross only at S and T, so no single shield stops both. The worksheet is for grades 4–5.'
};
const sources = ['shields-week70', 'shields-card70', 'shields-lmw'];

// The table in docs/shields/README.md. Coordinates are the app's: the room is
// 8 wide with S at (0, 0); the worksheet's are half of these.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three shots', mode: 'fewest', T: CENTRE, shots: [[1, 1], [1, 3], [3, 1]], check: {fewest: 2, sets: 6}, certificate: [[1, 3], [1, 1]],
    idea: 'Two shots that cross can share one shield; two that cross only at S and T can’t.',
    hints: ['Watch where the shots cross in the room.', 'The two steep shots cross each other twice in the room, away from S and T.', 'One shield where the steep shots cross, and one on the corner shot.'],
    parent: {notice: 'Whether your child looks for the places where shots cross in the room, and whether the dots where a shot leaves one edge and comes back in at the other help them follow it.', prompt: 'Why can’t one shield stop all three shots?', explanation: 'The shot towards the T one copy up passes the crosses (1, 3), (2, 6) and (3, 1) of the room, and the shot towards the T one copy right passes (3, 1), (6, 2) and (1, 3), so they cross at (1, 3) and at (3, 1), and one shield there stops both. The corner shot passes (1, 1), (2, 2) and (3, 3), none of them on the steep shots, and it crosses each of them only at S and T. So two shields are needed and enough, in six ways. The two shots tapped after Fewest, the corner shot and a steep one, show that one shield is not enough: no point is on both.', extension: 'Add the corner shot down and to the left. How many shields now? (Three: it meets neither steep shot nor the first corner shot.)', connection: 'Stopping every shot with the fewest shields is a hitting-set problem; shots that pairwise share no point give a lower bound, and here the two bounds meet.'},
    provenance: 'New, from Week 70 Problem 2’s shots to (2, 6) and (6, 2) and Problem 1’s corner shot (worksheet coordinates; the app doubles them).'},
  {number: 2, level: 'easy', title: 'Corner shots', mode: 'fewest', T: CENTRE, shots: CORNERS, check: {fewest: 4, sets: 81}, certificate: CORNERS,
    idea: 'The four shots from the corners to the centre cross only at S and T, so each needs its own shield.',
    hints: ['Can one shield stop two of these shots?', 'The four shots meet only at S and T, where no shield may go.', 'One shield on each shot, anywhere along it.'],
    parent: {notice: 'Whether your child tries to put one shield where two shots seem to meet, and notices that they meet only at T.', prompt: 'Where could one shield stop two of these shots?', explanation: 'All four corners are the same S, and each shot goes from a corner straight to the centre T without crossing an edge. The shots meet only at S and T, where shields are not allowed, so each needs its own shield: at least four. One on each shot is enough. Each has three crosses, so there are 3 × 3 × 3 × 3 = 81 fewest arrangements. After Fewest, the four shots themselves are the reason.', extension: 'Which arrangement of four would also stop a steep shot like the one to the T one copy up? (Puzzle 4 asks.)', connection: 'This is the lower bound in the Week 70 theorem: four shots with no common point other than S and T need four point shields.'},
    provenance: 'Week 70 Problem 1 (the four diagonal shots, fewest shields), in one room as the review card’s fix 1 suggests.'},
  {number: 3, level: 'easy', title: 'Four steep shots', mode: 'fewest', T: CENTRE, shots: [[1, 3], [3, 1], [3, -1], [-1, 3]], check: {fewest: 2, sets: 2}, certificate: [[1, 3], [-1, 3]],
    idea: 'Shots that cross the room’s edges can meet away from S and T, so fewer shields than shots can do.',
    hints: ['Follow each shot across the edges. Where do two of them cross?', 'Two of the shots cross at the same place halfway along.', 'A shield halfway along two of the shots, and one where the other two cross.'],
    parent: {notice: 'Whether your child follows the shots through the edges of the room, using the dots where they leave and come back in.', prompt: 'Which two shots can one shield stop?', explanation: 'The shots towards the T one copy right of the shaded copy and one copy up cross at (1, 3) and (3, 1). The shots towards the T one copy right, one down and one copy left, one up both pass (6, 6) halfway along. So two shields, such as (1, 3) and (6, 6), stop all four. One is not enough: the shot to the T one copy up and the shot to the T one copy left, one up cross only at S and T.', extension: 'Is there another pair of shields that works? (Yes: (3, 1) and (6, 6).)', connection: 'On a torus two straight segments can cross several times; their crossings are found by unrolling, as differences of whole rooms.'},
    provenance: 'New, from Week 70 Problem 2’s shots to (2, 6) and (6, 2) and the review card’s forcing shot to (6, −2), with its mirror image (−2, 6).'},
  {number: 4, level: 'easy', title: 'Corner shots and two more', mode: 'fewest', T: CENTRE, shots: [...CORNERS, [1, 3], [3, 1]], check: {fewest: 4, sets: 9, forced: ['2,6', '6,2']}, certificate: CORNERS,
    idea: 'Four shields are still enough, but now the two steep shots decide where two of them go.',
    hints: ['Where does each steep shot cross one of the corner shots?', 'Each steep shot crosses only one of the corner shots, at one place, and the corner shots share no point but S and T.', 'Put two of the shields where the steep shots cross corner shots, halfway along each.'],
    parent: {notice: 'Whether your child keeps four shields and moves them along the corner shots, rather than adding a fifth.', prompt: 'Where does the steep shot cross a corner shot?', explanation: 'The four corner shots still need four shields, one on each. The steep shot towards the T one copy up meets the corner shots only at (2, 6), halfway along the corner shot down and to the right, and the other steep shot only at (6, 2). So those two shields are forced, and the other two can go anywhere on their shots: nine arrangements. Pressing Fewest and tapping the four corner shots shows four are needed.', extension: 'Add the steep shots down and to the left as well. Are the four halfway crosses forced now? (Yes, on the whole map; see puzzle 6.)', connection: 'The review card found that a few more shots force the four halfway points, the arrangement that stops every shot.'},
    provenance: 'Week 70 Problem 1 with the review card’s fix 1: the four arrows in one room plus the folded shots to (2, 6) and (6, 2); the minimum stays 4 and (1, 3) and (3, 1) become forced (worksheet coordinates).'},
  {number: 5, level: 'medium', title: 'The map', mode: 'fewest', T: CENTRE, shots: [[1, 3], [3, 1], [1, 1], [5, 3]], check: {fewest: 3, sets: 21}, certificate: [[3, 1], [1, 1], [5, 3]],
    idea: 'A long shot crosses the room’s edges three times; still only its crosses matter.',
    hints: ['Follow the long shot through the room. Which crosses does it pass?', 'The long shot passes (5, 3), (2, 6) and (7, 1).', 'Three shields: where the steep shots cross, on the corner shot, and on the long shot.'],
    parent: {notice: 'Whether your child follows the long shot through three edges without losing it, and uses the unrolled view to check.', prompt: 'The worksheet aimed one shot at the T two copies up and right. Where did it stop?', explanation: 'These are Problem 2’s four aimed shots. The one aimed at (6, 6) on the worksheet stops at the first T it reaches, the one in the shaded copy, so it is the corner shot. The long shot crosses right, top, right before its T and passes (5, 3), (2, 6) and (7, 1). The steep shots share (1, 3) and (3, 1); none of the corner shot’s crosses is on another shot, and none of the long shot’s is on the corner shot. Three shields are enough in 21 ways, and the corner shot, the long shot and the shot one copy right cross only at S and T, so three are needed.', extension: 'Aim a shot at the T three copies right and two up in the playground. Where does it stop?', connection: 'A shot stops at its first target: the line to (2 + 4m, 2 + 4n) on the worksheet first reaches T at (2u, 2v) with u, v odd.'},
    provenance: 'Week 70 Problem 2 (shots aimed at (2, 6), (6, 2), (6, 6) and (10, 6), each to the first T it reaches), as a fewest-shields puzzle.'},
  {number: 6, level: 'medium', title: 'Every shot, four shields', mode: 'budget', budget: 4, T: CENTRE, check: {fewest: 4, sets: 1, forced: ['2,2', '2,6', '6,2', '6,6']}, certificate: CORNERS,
    idea: 'Four shields halfway between S and T stop every straight shot, however long.',
    hints: ['Move your shields until the app finds no shot that gets through.', 'Put one shield on each corner shot, then move them along until the steep shots are stopped too.', 'Every shield halfway along its corner shot.'],
    parent: {notice: 'Whether your child moves shields along the corner shots after each new escaping shot, as the worksheet’s partner game does, or starts again.', prompt: 'The shot to a far T copy: where is its halfway point in the room?', explanation: 'Every shot that reaches T first reaches it at (4u, 4v) with u and v odd. Its halfway point (2u, 2v) folds into the room as (2, 2), (2, 6), (6, 2) or (6, 6), and it comes before T. So shields at those four crosses stop every shot. They are the only four that work: one shield must sit on each corner shot, and the shots to the T copies one up, one right, one right and one down, and two right (the worksheet’s (2, 6), (6, 2), (6, −2) and (10, 2)) leave no other choice, as the review card checked. The app checks all 16 kinds of shot; two shots of the same kind modulo 8 pass the same crosses.', extension: 'Can three shields do it? (Puzzle 7.)', connection: 'In the worksheet’s 4 × 4 room these are (1, 1), (1, 3), (3, 1) and (3, 3): Lelièvre, Monteil and Weiss, Lemma 12, a blocking set of four midpoints.'},
    provenance: 'Week 70 Problem 3 (four shield points that stop every shot on the map, with a partner testing), with the app firing shots beyond the map too.'},
  {number: 7, level: 'medium', title: 'Every shot, three shields', mode: 'budget', budget: 3, T: CENTRE, check: {fewest: 4, cant: true}, certificate: CORNERS, reason: 'The four corner shots cross only at S and T, so each needs its own shield.',
    idea: 'Three shields can never stop every shot: four shots that cross only at S and T need four.',
    hints: ['Try three shields, and watch which shots get through.', 'Look at the four shots from the corners to the centre. Can one shield stop two of them?', 'The corner shots cross only at S and T: press Can’t and tap their four Ts.'],
    parent: {notice: 'Whether your child tries several arrangements before pressing Can’t, and whether they find the four corner shots as the reason or need the hint.', prompt: 'Which four shots could never share a shield?', explanation: 'The four corner shots go from S to the four Ts round it in the unrolled view. In the room they are the four half-diagonals, and they meet only at S and T. A shield is one point, so it stops at most one of them, and three shields leave one corner shot open. Tapping those four after Can’t is the whole proof; with puzzle 6, four is exactly the fewest.', extension: 'Is there another set of four shots that cross only at S and T? (Yes: swap one corner shot for a steep one that misses the other three, such as the shot to the T one copy left and one down along (−3, −1).)', connection: 'Week 70 Problem 4: matching upper and lower bounds, as in the blocking-cardinality computation of Lelièvre, Monteil and Weiss.'},
    provenance: 'Week 70 Problem 4 (“Could three shields ever stop every shot?”), as a checked Can’t with the four disjoint corner shots as the certificate.'},
  {number: 8, level: 'hard', title: 'Back to S', mode: 'fewest', T: null, shots: [[1, 0], [1, 1], [1, 2], [1, 3]], check: {fewest: 2, sets: 1, forced: ['4,0', '4,4']}, certificate: [[1, 0], [1, 1]],
    idea: 'Without a T, shots come back to S after a whole room, and their halfway points line up.',
    hints: ['Look for a cross that two of the shots both pass.', 'Each shot goes a whole room before it is back at S, and two of them pass the same cross halfway along.', 'Shields at 4 across, 0 up and at 4 across, 4 up.'],
    parent: {notice: 'Whether your child looks for crosses where several shots meet, and whether the halfway idea from puzzle 6 comes back.', prompt: 'Where is each shot halfway back to S?', explanation: 'A shot along (1, k) comes back to S at (8, 8k), so halfway it is at (4, 4k): (4, 0) for k even and (4, 4) for k odd. The bottom-edge shot and the shot along (1, 2) both pass (4, 0); the corner shot and the shot along (1, 3) both pass (4, 4). Those two shields are the only pair that works. The bottom-edge shot and the corner shot cross only at S, so one shield is not enough.', extension: 'Add the shot up the left edge. How many shields now? (Three.)', connection: 'The review card’s fix 5: shots that return to S, with no T, have halfway points (4, 0), (0, 4) and (4, 4) in this room.'},
    provenance: 'New, from the review card’s fix 5 (shots that return to S), with four shots that pair up.'},
  {number: 9, level: 'hard', title: 'Every shot back to S', mode: 'fewest', T: null, check: {fewest: 3, sets: 1, forced: ['0,4', '4,0', '4,4']}, certificate: [[1, 0], [0, 1], [1, 1]],
    idea: 'Every shot back to S is stopped by three shields halfway, and three shots that cross only at S show three are needed.',
    hints: ['Shots back to S go a whole room before they stop. Try some shields and watch which shots still get through.', 'Each shot passes its halfway point, and there are only three places that can be.', 'Shields halfway along the bottom edge, the left edge and the diagonal.'],
    parent: {notice: 'Whether your child carries the halfway idea over from the shots to T, and how many shields they use before Fewer can do it sends them back.', prompt: 'Halfway back to S, where can a shot be?', explanation: 'A shot along a primitive (a, b) comes back to S first at (8a, 8b), and halfway it is at (4a, 4b). One of a, b is odd, so that point folds to (4, 0), (0, 4) or (4, 4), and shields there stop every shot. The shots along the bottom edge, up the left edge and along the diagonal cross only at S, so three shields are needed. Only the three halfway crosses work; the app checks all 48 kinds of shot.', extension: 'Why can’t the diagonal shot and the other diagonal shot both be in a set that crosses only at S? (They cross at the centre, (4, 4).)', connection: 'The review card’s fix 5: “The halfway points (2, 0), (0, 2), (2, 2) block all of them, and the disjoint shots (4, 0), (0, 4), (4, 4) show that three are needed” (worksheet coordinates).'},
    provenance: 'The review card’s fix 5, the extension it proposes after Problem 4 (shots that return to S).'},
  {number: 10, level: 'hard', title: 'T on the edge', mode: 'fewest', T: EDGE, check: {fewest: 4, sets: 1, forced: ['2,0', '2,4', '6,0', '6,4']}, certificate: [[1, 0], [-1, 0], [1, 2], [-1, 2]],
    idea: 'With T moved to the middle of an edge, four shields halfway still stop every shot, and four shots still cross only at S and T.',
    hints: ['Which shots reach this T first? Try a few shields and watch.', 'Halfway between S and this T, a shot can be in only four places.', 'Shields at 2 across, 0 up; 6 across, 0 up; 2 across, 4 up; and 6 across, 4 up.'],
    parent: {notice: 'Whether your child expects the same four shields as in puzzle 6, and what they do when the app shows a shot that gets past them.', prompt: 'Where is the shot along the bottom edge halfway to T?', explanation: 'T is at (4, 0), halfway along the bottom edge. A shot along a primitive (a, b) reaches it only when a is odd and b even, first at (4a, 4b), and halfway it is at (2a, 2b), which folds to (2, 0), (6, 0), (2, 4) or (6, 4). Those four stop every shot, and they are the only four that do. The shots both ways along the bottom edge and along (1, 2) and (−1, 2) cross only at S and T, so four are needed. The worksheet guide warns that a new T needs its own argument; here it works the same way.', extension: 'Put T a quarter of the way along the diagonal, at (2, 2). Which four shields stop every shot then?', connection: 'Lelièvre, Monteil and Weiss, Lemma 12: on a flat torus any two distinct points have blocking number 4, the four midpoints of the first-hit lifts.'},
    provenance: 'New: the Week 70 guide’s caution that other source and target positions “need their own argument”, with T at the middle of the bottom edge.'}
];

const id = n => `shields-${String(n).padStart(2, '0')}`;
const sameDir = (a, b) => a[0] === b[0] && a[1] === b[1];
const out = PUZZLES.map(item => {
  const q = {mode: item.mode, room: ROOM, T: item.T, ...(item.shots ? {shots: item.shots} : {}), ...(item.budget ? {budget: item.budget} : {}), certificate: item.certificate, ...(item.reason ? {reason: item.reason} : {})};
  const label = id(item.number);
  // Every shot is a shot of its room.
  for (const d of item.shots || []) assert.ok(isShot(q, d), `${label}: ${d} reaches its target`);
  if (!item.shots) assert.equal(shotClasses(q).length, q.T ? 16 : 48, `${label}: every kind of shot`);
  // The fewest shields and every fewest arrangement.
  const {k, sets} = fewestSets(q);
  assert.equal(k, item.check.fewest, `${label}: fewest`);
  if (item.check.sets !== undefined) assert.equal(sets.length, item.check.sets, `${label}: fewest arrangements`);
  for (const c of item.check.forced || []) assert.ok(sets.every(s => s.some(x => crossKey(x) === c)), `${label}: ${c} is forced`);
  for (const s of sets) assert.equal(escaping(q, s).length, 0, `${label}: ${JSON.stringify(s)} stops every shot`);
  // The certificate: shots of the puzzle that pairwise cross only at S and T.
  const cert = item.certificate;
  assert.equal(cert.length, item.mode === 'budget' && item.check.cant ? item.budget + 1 : k, `${label}: certificate size`);
  for (const d of cert) {
    assert.ok(isShot(q, d), `${label}: certificate shot ${d}`);
    if (item.shots) assert.ok(item.shots.some(s => sameDir(s, d)), `${label}: ${d} is drawn`);
    else assert.ok(targetsIn(q, [-2, -2, 1, 1]).some(at => { const s = shotAt(q, at); return s && sameDir(s, d); }), `${label}: ${d} ends in the first window`);
  }
  for (let x = 0; x < cert.length; x++) for (let y = x + 1; y < cert.length; y++) assert.ok(!meet(q, cert[x], cert[y]), `${label}: ${cert[x]} and ${cert[y]} cross only at S and T`);
  if (item.mode === 'budget') assert.equal(k <= item.budget, !item.check.cant, `${label}: possible with ${item.budget}`);
  const to = q.T ? 'S and T' : 'S';
  const rules = [...RULES.room, q.T ? RULES.toT : RULES.toS, RULES.shield, item.shots ? RULES.drawn : RULES.all, item.mode === 'fewest' ? RULES.fewest(to) : RULES.budget(item.budget, to)];
  const objective = item.mode === 'fewest' ? `Stop every ${item.shots ? 'drawn ' : ''}shot from S with as few shields as you can, then press Fewest and tap that many shots that cross only at ${to}.` : `Stop every shot from S to T with ${item.budget} shields, or press Can’t and tap ${item.budget + 1} shots that cross only at S and T.`;
  const visible = item.mode === 'fewest' ? 'Stop every shot with as few shields as you can.' : `Stop every shot with ${item.budget} shields.`;
  const solution = {fewest: k, arrangements: sets.length, witness: sets[0], certificate: cert, ...(item.mode === 'budget' ? {budget: item.budget, cant: Boolean(item.check.cant)} : {})};
  return {
    id: label, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Portal shields', mechanic: 'shields', band: 'all', revision: 1, sourceDocument: 'docs/shields/README.md',
    parameters: q, objective, visibleObjective: visible, instruction: objective, controls: CONTROLS, rules,
    idea: item.idea, prerequisites: PREREQ[item.mode === 'budget' ? (item.check.cant ? 'cant' : 'all') : item.shots ? 'drawn' : 'all'], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const rooms = {
  centre: {name: 'T in the middle', T: CENTRE},
  none: {name: 'No T', T: null},
  edge: {name: 'T on the edge', T: EDGE}
};
const playground = {
  id: 'shields-playground', number: 0, title: 'Portal shields playground', difficulty_level: 'playground', familyTitle: 'Portal shields', mechanic: 'shields', band: 'playground', revision: 1, sourceDocument: 'docs/shields/README.md',
  parameters: {mode: 'playground', room: ROOM, rooms},
  objective: 'Aim shots at copies of T in the unrolled view, put shields in the room, and see where each shot stops.', visibleObjective: '',
  instruction: 'Aim shots at copies of T in the unrolled view, put shields in the room, and see where each shot stops.',
  controls: 'Choose a room. Tap a T (or an S, in the room without T) in the unrolled view to aim a shot at it, and again to take the shot away. Tap a cross in the room to put a shield there or take it off. Restart clears everything.',
  rules: [...RULES.room, RULES.toT, 'In the room without T a shot stops when it comes back to S.', 'A shot also stops at the first shield on its way. A shield is on its cross in every copy.'],
  idea: 'Aiming at a far copy of T shows the first T the shot reaches, and how one shield in the room appears in every copy.',
  prerequisites: 'None. A grown-up or a partner can choose the copies to aim at.',
  hints: ['Aim at a T two copies up and two copies right. Where does the shot stop?', 'Put a shield on a shot in the room. Where else does it stop shots?', 'In the room without T, aim at the S one copy right.'],
  parent: {notice: 'Whether your child predicts where a shot comes back in at an edge, and notices that a shot aimed at a far T can stop at a nearer one.', prompt: 'Which shots does one shield stop?', explanation: 'The three rooms are the same torus with T in the middle, on the edge, or missing. A shot aimed at a copy of T goes straight in the unrolled view and stops at the first copy of T on its way, which may be nearer than the one aimed at. A shield is one point of the room, so in the unrolled view it repeats in every copy.', extension: 'Find a shield that stops the shots to two different Ts. (Where they cross in the room.)', connection: 'The unrolled view is the universal cover of the torus; a straight shot on the torus is a straight line in the plane.', sourceIds: sources},
  provenance: 'Week 70 page 1 (shared rules and the launch example of a shot crossing an edge) and Problem 2 (aiming at copies of T), in three rooms.'
};
for (const r of Object.values(rooms)) assert.ok(targetsIn(r, [-2, -2, 1, 1]).length >= 8, `${r.name}: targets to aim at`);

const json = {
  title: 'Portal shields',
  version: 1,
  families: [{id: 'shields', title: 'Portal shields', mathematics: 'A square room whose opposite edges are glued by translation is a flat torus. S sits at the corner and T at the centre. A straight shot from S stops at the first T it reaches; a point shield, never at S or T, stops it only if the shot passes through it. In the app the room is 8 lattice steps wide, so T is (4, 4), and a shot along a primitive (a, b) reaches T exactly when a and b are odd, first at (4a, 4b). Its halfway point (2a, 2b) folds to (2, 2), (2, 6), (6, 2) or (6, 6), so those four shields stop every shot. The four corner shots cross only at S and T, so no three shields can. With no T, shots back to S are stopped by the three halfway points (4, 0), (0, 4) and (4, 4), and three of them cross only at S. These are the blocking sets of Lelièvre, Monteil and Weiss.', rules: RULES.room, sourceIds: sources}],
  sources: [
    {id: 'shields-week70', title: 'Bellingham Math Circle — Week 70: Four shields in a portal room (student packet, grades 4–5, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-70', kind: 'local curriculum'},
    {id: 'shields-card70', title: 'Week 70 review card (App fit and Decision; fix 1 and fix 5) and its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-70.md', kind: 'local curriculum'},
    {id: 'shields-lmw', title: 'Samuel Lelièvre, Thierry Monteil and Barak Weiss — Everything is illuminated (blocking sets; Lemma 12 on the flat torus), as the Week 70 guide cites', url: 'https://arxiv.org/abs/1407.2975', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/shields/shields.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode.padEnd(6)} fewest ${p.solution.fewest} (${p.solution.arrangements} ways)${p.solution.cant ? ' — Can’t' : ''} witness ${p.solution.witness.map(c => `(${c})`).join(' ')} certificate ${p.solution.certificate.map(d => `[${d}]`).join(' ')} ends ${p.solution.certificate.map(d => `(${endOf(p.parameters, d)})`).join(' ')}`).join('\n'));
