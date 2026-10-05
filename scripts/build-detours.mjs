// Authoring list for Road detours (worksheet Week 39). Computes what every
// trip that fits can shorten to, checks each puzzle's claims (the answers to
// find-every puzzles, that make puzzles can be done and how rarely), and
// writes dist/families/detours/detours.json. Run: node scripts/build-detours.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {allTrips, results, complete, shorten, isTrip, resultOk, roadOf} from '../dist/families/detours/detours.js';

const roads = list => list.split(' ').map(t => [t[0], t[1]]);
const MAPS = {
  tree: {name: 'Tree', aspect: 1.6, nodes: {A: [8, 60], B: [36, 60], C: [36, 12], D: [64, 60], E: [92, 22], F: [92, 92]}, roads: roads('AB BC BD DE DF'), start: 'A'},
  ring: {name: 'Ring', aspect: 1.25, nodes: {A: [20, 50], B: [50, 10], C: [80, 50], D: [50, 90]}, roads: roads('AB BC CD DA'), start: 'A'},
  rings: {name: 'Two rings', aspect: 1.7, nodes: {H: [50, 50], A: [12, 12], B: [12, 88], C: [88, 12], D: [88, 88]}, roads: roads('HA AB BH HC CD DH'), start: 'H'}
};
const map = name => { const {name: _, start: __, ...m} = MAPS[name]; return m; };
const ids = (name, list) => list.split(' ').map(r => roadOf(MAPS[name], r[0], r[1]));
const arrows = list => list.join('→');

const RULES = [
  'Each step takes the pawn along one road to the next dot.',
  'Two steps cancel when they go along the same road there and straight back. The dot between them is a turning point.',
  'Cancelling takes out both steps and keeps the rest in order, so the start and the end stay the same.'
];
const MORE = {
  shorten: 'Tap turning points until none is left.',
  make: 'Press Shorten when your trip is ready, then tap turning points until none is left.',
  every: 'Press Shorten when your trip is ready, then tap turning points until none is left. What is left joins the row below. Press New trip for another, and That’s all when you think the row has every route.',
  kept: 'A trip loses no steps when it has no turning point.'
};
const CONTROLS = {
  shorten: 'Tap a turning point in the row of dots to cancel the steps into and out of it.',
  walk: 'Tap a dot next to the pawn, or a road it stands on, to take a step; or slide along the dots. The beads count your steps, and Undo takes a step back. After Shorten, tap a turning point in the row of dots to cancel its two steps.',
  playground: 'Choose a map. Tap a dot next to the pawn to take a step, or slide along the dots. Tap a turning point in the row of dots to cancel its two steps.'
};
const PREREQUISITES = {
  shorten: 'Spot a letter with the same letter on both sides. No reading or arithmetic.',
  make: 'Count steps to 12 with the beads, and plan a few steps ahead. A grown-up can read the goal.',
  every: 'Plan a trip, then keep track of the routes already found. A grown-up can read the goal.',
  kept: 'Plan a trip of 9 to 12 steps without turning straight back.'
};
const sources = ['detours-week39', 'detours-stillwell', 'detours-office-hours'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Back and forth', map: 'tree', p: {mode: 'shorten', trip: [...'ABABDFDE']},
    objective: 'Shorten the trip as far as it goes.',
    idea: 'A step there and straight back changes nothing about where the trip ends.',
    hints: ['Look for a letter with the same letter on both sides.', 'The A between two Bs is a turning point.', 'Tap the A in the middle, then the F.'],
    check: {result: 'ABDE'},
    parent: {notice: 'Each cancelled pair is a little detour: out to a dead end and straight back.', prompt: 'Where does the pawn end up before and after you shorten?', explanation: 'A→B→A→B goes from A to B the long way; cancelling the turn at A leaves A→B. D→F→D is a detour to the dead end F; cancelling the turn at F leaves A→B→D→E. Nothing is left to cancel, and the trip still goes from A to E.', extension: 'Make your own 8-step trip from A to E in the playground. What does it shorten to?', connection: 'Cancelling a step and its reverse is how words in a free group are reduced.'},
    provenance: 'Week 39 Problem 1, first trip (all bands).'},
  {number: 2, level: 'easy', title: 'Detours inside detours', map: 'tree', p: {mode: 'shorten', start: 'C', trip: [...'CBDEDBABDF']},
    objective: 'Shorten the trip as far as it goes.',
    idea: 'Cancelling one pair can make a new turning point appear.',
    hints: ['Cancel a turning point, then look again.', 'Once the turn at E goes, B, D, B makes a new turning point at D.', 'Cancel at E, then at the D that appears, then at A.'],
    check: {result: 'CBDF'},
    parent: {notice: 'The trip went out past D to E and came all the way back; that detour only shows as a turning point at D once E is gone.', prompt: 'Did it matter which turning point you cancelled first?', explanation: 'C→B→D→E→D→B→A→B→D→F has turning points at E and at A. Cancelling the turn at E leaves C→B→D→B→A→B→D→F, where a new turning point at D has appeared. Cancelling everything leaves C→B→D→F, the only route from C to F that never turns back. Every order of cancelling ends there.', extension: 'Cancel in a different order. Do you ever get stuck somewhere else?', connection: 'Reduction is confluent: every order of cancellations ends at the same reduced word (the diamond lemma).'},
    provenance: 'Week 39 K–1 Problem 5 (a nine-step trip from C to F with detours to dead ends), with a new trip whose detours are nested.'},
  {number: 3, level: 'easy', title: 'Every road and home', map: 'tree', p: {mode: 'make', start: 'A', finish: 'A', min: 12, max: 12, everyRoad: true, result: 'empty'},
    objective: 'Make a 12-step trip from A back to A that uses every road. Then shorten it.',
    idea: 'On a map with no loop, every trip home shortens to nothing.',
    hints: ['Visit every dead end and come back.', 'Ten steps go out and back along every road once. Where can two more go?', 'Try A, B, A, B, C, B, D, E, D, F, D, B, A.'],
    check: {trips: 48, kept: 48},
    parent: {notice: 'However the trip is made, it shortens to staying at A.', prompt: 'Could any trip home on this map keep a step after shortening?', explanation: 'Every trip that returns home on a map with no loop shortens to nothing. Take the dot of the trip farthest from A: the trip arrives there along the one road toward A and must leave along that same road, because every other road leads farther away. That arrival and departure cancel. Repeat until nothing is left. There are 48 different 12-step trips home that use every road, and every one shortens to staying at A.', extension: 'How many 10-step trips from A back to A use every road? (Four: at B and at D the two dead ends can come in either order.)', connection: 'A tree is simply connected: every loop in it can be shrunk to a point.'},
    provenance: 'Week 39 grades 2–3 and 4–5 Problem 2 (12-step trips home that use every road).'},
  {number: 4, level: 'easy', title: 'Only one way', map: 'tree', p: {mode: 'every', start: 'C', finish: 'F', min: 7, max: 7},
    objective: 'Find every route a 7-step trip from C to F can shorten to.',
    idea: 'Between two dots of a map with no loop there is only one route that never turns back.',
    hints: ['Make a 7-step trip from C to F and shorten it.', 'Try a different 7-step trip. Does it shorten to something new?', 'Every one shortens to C→B→D→F. Press That’s all.'],
    check: {answers: 1, trips: 21},
    parent: {notice: 'Different trips, same result.', prompt: 'Why can’t a trip from C to F shorten to anything else?', explanation: 'A shortened trip never turns straight back, so on a map with no loop it never visits a dot twice: between two visits it would make a loop home that shortens to nothing. The only route from C to F that visits no dot twice is C→B→D→F, so all 21 seven-step trips from C to F shorten to it.', extension: 'Is the same true of trips from C to F of any length?', connection: 'In a tree there is exactly one path between any two vertices.'},
    provenance: 'Week 39 grades 4–5 Problem 3 and grades 2–3 Problem 1 (seven-step trips from C to F).'},
  {number: 5, level: 'medium', title: 'Once around', map: 'ring', p: {mode: 'make', start: 'A', finish: 'A', min: 8, max: 8, result: [...'ABCDA']},
    objective: 'Make an 8-step trip from A back to A that shortens to A→B→C→D→A.',
    idea: 'On a ring, a trip can keep a whole turn: four steps that never turn back.',
    hints: ['Go round once. You have four steps to spare.', 'Spend the spare steps on detours that cancel.', 'Try A, B, A, B, C, D, C, D, A.'],
    check: {trips: 128, kept: 28},
    parent: {notice: 'The extra four steps have to cancel, and the four that stay go round one way.', prompt: 'What happens if a trip goes three steps one way and one step back?', explanation: 'A shortened trip on a ring never turns back, so it keeps going one way. A trip home that keeps steps goes round whole turns: 4 steps for one turn, 8 for two. Here, four steps go round clockwise and two pairs cancel. Of the 128 eight-step trips from A back to A, 28 shorten to A→B→C→D→A.', extension: 'Make an 8-step trip that shortens to going round the other way.', connection: 'The loops of a ring are counted by a whole number, its winding number: the fundamental group of a circle is the integers.'},
    provenance: 'Week 39 K–1 Problem 6 and grades 2–3 Problem 3 (eight-step ring trips), with a named target.'},
  {number: 6, level: 'medium', title: 'Every ring trip', map: 'ring', p: {mode: 'every', start: 'A', finish: 'A', min: 8, max: 8},
    objective: 'Find every route an 8-step trip from A back to A can shorten to.',
    idea: 'An 8-step trip home can keep 0, 4 or 8 steps, and the kept steps go round one way.',
    hints: ['Try going round once and spending the other steps on a detour.', 'Can a trip keep two whole turns? Can it go the other way?', 'Five routes: stay at A, once round each way, twice round each way.'],
    check: {answers: 5},
    parent: {notice: 'A trip that turns back on the ring loses steps; one that keeps going gains whole turns.', prompt: 'How do you know there isn’t a sixth?', explanation: 'A shortened trip never turns back, so on a ring it goes one way all along. To end at A it makes whole turns of 4 steps, and it can’t be longer than 8. That leaves staying at A, one turn clockwise or anticlockwise, and two turns clockwise or anticlockwise: five routes.', extension: 'How many routes can a 12-step trip home shorten to? (Seven.)', connection: 'Reduced loops on a cycle graph are its powers of one turn.'},
    provenance: 'Week 39 grades 2–3 Problem 3 and K–1 Problem 6 (every result of an eight-step ring trip).'},
  {number: 7, level: 'medium', title: 'Never turn back', map: 'rings', p: {mode: 'make', start: 'H', finish: 'H', min: 12, max: 12, groups: [ids('rings', 'HA AB BH'), ids('rings', 'HC CD DH')], groupsName: 'both rings', result: 'kept'},
    objective: 'Make a 12-step trip from H back to H, through both rings, that loses no steps.',
    idea: 'A trip loses no steps exactly when it never turns straight back.',
    hints: ['Each time round a ring takes three steps.', 'Go round four times, never turning back, and use both rings.', 'Try H, A, B, H, C, D, H, A, B, H, C, D, H.'],
    check: {trips: 27624, kept: 104},
    parent: {notice: 'Any order of whole turns works as long as two turns that undo each other never touch.', prompt: 'Which trips round the rings would lose steps?', explanation: 'A trip that never turns back can’t be shortened at all. On this map, leaving H without turning back means going round a whole ring: three steps. Four turns make 12 steps. Each turn is one of four (left or right ring, either way), and a turn may not be followed by the same ring the other way: 4 × 3 × 3 × 3 = 108 trips, of which 104 use both rings. They are 104 of the 27,624 twelve-step trips home through both rings.', extension: 'Is there a 12-step trip home that loses no steps and uses only the left ring? (Two: four turns one way, or four the other.)', connection: 'Reduced words of length four in a free group on two letters.'},
    provenance: 'Week 39 grades 2–3 Problem 6 (a 12-step trip home that loses no steps).'},
  {number: 8, level: 'hard', title: 'Halfway round', map: 'ring', p: {mode: 'every', start: 'A', finish: 'C', min: 1, max: 6},
    objective: 'Find every route a trip of up to 6 steps from A to C can shorten to.',
    idea: 'A route to the far side of a ring is half a turn plus whole turns, either way.',
    hints: ['Start with the two shortest routes.', 'A route can go past C and all the way round again.', 'Four routes: A→B→C, A→D→C, and each of those with a whole turn more.'],
    check: {answers: 4},
    parent: {notice: 'The kept routes have 2 or 6 steps, never 4.', prompt: 'Why can’t a route from A to C keep exactly 4 steps?', explanation: 'A shortened route never turns back, so it goes one way round. From A to C that takes 2 steps, or 6 with a whole turn more. With at most 6 steps that leaves A→B→C, A→D→C, A→B→C→D→A→B→C and A→D→C→B→A→D→C. The two long ones use the same roads in different orders.', extension: 'With up to 10 steps, how many routes are there? (Six.)', connection: 'Paths between two points of a circle, up to homotopy, are also counted by the integers.'},
    provenance: 'Week 39 K–1 Problem 7 (every result of a trip from A to C).'},
  {number: 9, level: 'hard', title: 'Both ways round', map: 'rings', p: {mode: 'make', start: 'H', finish: 'H', min: 9, max: 9, eachWay: ids('rings', 'HA AB BH'), eachWayName: 'the left ring', result: 'kept'},
    objective: 'Make a 9-step trip from H back to H that goes round the left ring once each way and loses no steps.',
    idea: 'A turn and its reverse cancel when they touch, but not when something comes between them.',
    hints: ['Going round the left ring and straight back round it cancels.', 'Put a turn of the right ring between the two left turns.', 'Try H, A, B, H, C, D, H, B, A, H.'],
    check: {trips: 36, kept: 4},
    parent: {notice: 'The left ring is used both ways, yet nothing cancels.', prompt: 'The trip goes round the left ring one way and then the other. Why doesn’t it shrink?', explanation: 'Going round the left ring and back cancels only if the two turns are next to each other. With the right ring between them, every step is followed by a step along a different road, so no pair cancels. Four trips work: left, right, left back; left, right back, left back; and the two that start the other way round the left ring.', extension: 'Can you make a trip that goes round both rings once each way and loses no steps?', connection: 'Conjugation in a free group: a b a⁻¹ is reduced and not the identity.'},
    provenance: 'New, a step toward Week 39 grades 4–5 Problems 5 and 6.'},
  {number: 10, level: 'hard', title: 'Each road both ways', map: 'rings', p: {mode: 'make', start: 'H', finish: 'H', min: 12, max: 12, eachWay: ids('rings', 'HA AB BH HC CD DH'), result: 'kept'},
    objective: 'Make a trip from H back to H that goes along every road once each way and loses no steps.',
    idea: 'Going each way round each ring doesn’t make a trip vanish: the order matters.',
    hints: ['Turn round each ring once each way, so 12 steps.', 'A turn and its reverse must never touch. Alternate the rings.', 'Try H, A, B, H, C, D, H, B, A, H, D, C, H.'],
    check: {trips: 216, kept: 8},
    parent: {notice: 'Of the 216 trips that use every road once each way, only 8 lose no steps; the other 208 vanish.', prompt: 'Two trips use the same roads the same number of times each way. Must they shorten to the same thing?', explanation: 'Left, right, left back, right back has no turning point: every step goes along a different road from the one before. So it can’t be shortened, even though each ring is used once each way. Counting turns, as on a single ring, isn’t enough here: the order of the turns matters. The 8 trips that work all alternate the rings.', extension: 'Does going right then left give the same route as going left then right?', connection: 'The commutator a b a⁻¹ b⁻¹ is not the identity in the free group on two letters: the fundamental group of two rings joined at a point is not commutative.'},
    provenance: 'Week 39 grades 4–5 Problems 5 and 6 (the commutator, and equal counts with different results).'}
];

const out = PUZZLES.map(item => {
  const m = map(item.map), q = {...m, ...item.p};
  q.start = q.start || MAPS[item.map].start;
  const id = `detours-${String(item.number).padStart(2, '0')}`;
  if (q.mode === 'shorten') {
    assert.ok(isTrip(q, q.trip) && q.trip[0] === q.start, `${id}: the trip follows roads`);
    assert.equal(shorten(q.trip).join(''), item.check.result, `${id}: shortens to`);
  } else {
    const trips = allTrips(q), good = trips.filter(t => resultOk(q, t, shorten(t)));
    if (q.mode === 'every') q.answers = results(q).length;
    for (const [what, value] of Object.entries(item.check)) {
      const actual = {trips: trips.length, kept: good.length, answers: q.answers}[what];
      assert.equal(actual, value, `${id}: ${what}`);
    }
    assert.ok(good.length > 0, `${id}: possible`);
    assert.ok(complete(q, [q.start], (t, r) => resultOk(q, t, r)), `${id}: the search finds one`);
    assert.ok(trips.length <= 30000, `${id}: small enough to search`);
  }
  const kind = q.mode === 'shorten' ? 'shorten' : q.result === 'kept' ? 'kept' : q.mode;
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'detours', familyTitle: 'Road detours', revision: 1,
    parameters: q,
    objective: item.objective, visibleObjective: item.objective, instruction: item.objective,
    controls: q.mode === 'shorten' ? CONTROLS.shorten : CONTROLS.walk,
    rules: [...RULES, q.mode === 'shorten' ? MORE.shorten : q.mode === 'every' ? MORE.every : MORE.make, ...(q.result === 'kept' ? [MORE.kept] : [])],
    idea: item.idea, prerequisites: PREREQUISITES[kind], hints: item.hints,
    parent: {...item.parent, sourceIds: sources},
    provenance: item.provenance, sourceDocument: 'docs/detours/README.md'
  };
});
const playground = {
  id: 'detours-playground', number: 0, title: 'Road detours playground', band: 'playground', difficulty_level: 'playground', mechanic: 'detours', familyTitle: 'Road detours', revision: 1,
  parameters: {mode: 'playground', maps: Object.fromEntries(Object.entries(MAPS).map(([k, v]) => [k, {...v}]))},
  objective: 'Walk the pawn on any map and cancel steps that turn straight back.',
  controls: CONTROLS.playground,
  rules: [...RULES, 'Walking and cancelling can be mixed in any order here.'],
  idea: 'Free walking and shortening on a tree, a ring and two rings.',
  prerequisites: 'None. A grown-up can suggest a question from the puzzles.',
  hints: ['Walk somewhere and back, then cancel the turning points.', 'On the ring, go round twice. What is left?', 'On two rings, go left, right, left back, right back.'],
  parent: {notice: 'However the turning points are cancelled, the same trip is left at the end.', prompt: 'Can you make a long trip home that loses no steps on each map?', explanation: 'On the tree no trip home can keep a step; on the ring the kept trips go round whole turns one way; on two rings a kept trip can go round each ring both ways, as long as the turns alternate.', extension: 'Make two trips that use the same roads the same number of times each way but shorten to different routes.', connection: 'Reduced words in free groups; the fundamental groups of a tree, a circle and a figure eight.', sourceIds: sources},
  provenance: 'Week 39 materials: free pawn travel on the tree, ring and two-ring maps before any rules.',
  instruction: 'Walk the pawn on any map and cancel steps that turn straight back.', sourceDocument: 'docs/detours/README.md'
};
const json = {
  title: 'Road detours',
  version: 1,
  families: [{id: 'detours', title: 'Road detours', mathematics: 'A trip is a list of steps along the roads of a map. Two steps cancel when they go along one road there and straight back; cancelling keeps the start, the end and the order of the other steps. Every order of cancelling ends at the same shortest trip (unique reduced form). On a tree every trip between two places shortens to the one direct route, so every trip home vanishes; on a ring the shortened trips home go round whole turns one way; on two rings joined at a point order matters, and left, right, left back, right back loses no steps although it uses each ring once each way (the commutator in a free group).', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'detours-week39', title: 'Bellingham Math Circle — Week 39: Road detours (worksheets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-39', kind: 'worksheet'},
    {id: 'detours-stillwell', title: 'John Stillwell — Classical Topology and Combinatorial Group Theory, 2nd edition, Springer (1993), chapters 2 and 3 (the fundamental group of a graph, free groups and reduced words)', url: 'https://doi.org/10.1007/978-1-4612-4372-4', kind: 'undergraduate'},
    {id: 'detours-office-hours', title: 'Matt Clay and Dan Margalit, editors — Office Hours with a Geometric Group Theorist, Princeton University Press (2017), chapters on free groups and Cayley graphs', url: 'https://press.princeton.edu/books/paperback/9780691158662/office-hours-with-a-geometric-group-theorist', kind: 'undergraduate'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/detours/detours.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode}${p.parameters.answers ? ` answers ${p.parameters.answers}` : ''}`).join('\n'));
