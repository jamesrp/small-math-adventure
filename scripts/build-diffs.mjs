// Authoring list for Gap rings (worksheet Week 49, four towers and
// differences). Computes every puzzle's answers with the mechanic's own
// search (every ring under the cap), checks them against the table in
// docs/diffs/README.md, finds a witness for each, and writes
// dist/families/diffs/diffs.json. Run: node scripts/build-diffs.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gaps, predecessors, deepest, reasonOf, keyOf, movesToZero, zero} from '../dist/families/diffs/diffs.js';

const RULE = [
  'Each arrow goes from a tower to the next one round the ring. The number on it is the gap: how many blocks taller one of its towers is than the other.',
  'The next ring puts each gap at the tower its arrow leaves: the gap from A to B becomes the new A.'
];
const RULES = {
  make: [...RULE, 'If no ring can do it, build a ring, press Can’t, tap the towers on the right that show why, and press Can’t again.'],
  every: [...RULE, 'Each ring that works is kept below the board. Press That’s all when you think none is left; it says if there is another.'],
  grow: [...RULE, 'A ring whose gaps make the ring on the right joins the row, and the next ring must make it in turn. Tap the newest ring in the row to take it back.']
};
const BUILD = 'Tap a block to build a tower up to it, or the floor under a tower for 0. Tap the top block (or the floor) again to clear the tower.';
const CONTROLS = {
  make: `${BUILD} Can’t: press it, tap the towers on the right that show why, then press it again. Undo takes back the last change.`,
  every: `${BUILD} Undo takes back the last change and keeps the rings found.`,
  grow: `${BUILD} Tap the newest ring in the row to take it back and change it. Undo takes back the last change.`,
  playground: `${BUILD} Tap the newest ring in the row to take it back and change it.`
};
const OBJECTIVE = {
  make: 'Build a ring whose gaps make the ring on the right, or press Can’t and show why no ring can.',
  every: cap => `Find every ring with towers up to ${cap} whose gaps make the ring on the right, then press That’s all.`,
  moves: n => `Fill the row back from zero: each ring’s gaps make the next ring, so the first ring takes ${n} moves to reach all zeros.`,
  loop: 'Build rings back from the one on the right, each one’s gaps making the ring after it, until a ring comes again.'
};
const VISIBLE = {make: 'Make the gaps match the ring on the right.', every: 'Find every ring whose gaps make the ring on the right.', moves: 'Fill the row: each ring’s gaps make the next.', loop: 'Go back until a ring comes again.'};
const PREREQUISITES = {
  gaps: 'Compare two towers and count how many blocks taller one is (gaps up to 4). No reading; a grown-up can read How to play.',
  cant: 'Compare towers, and see that equal gaps of 0 mean equal towers. A grown-up can read the reason after Can’t.',
  odd: 'Tell odd from even and follow a ring all the way round. A grown-up can talk through the reason.',
  every: 'Keep the rings already found in mind, and look for a way to make new ones from them.',
  grow: 'Compare towers; plan a few rings ahead and take a ring back when it leads nowhere.'
};
const sources = ['diffs-week49', 'diffs-card49', 'diffs-shapiro'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'All ones', mode: 'make', target: [1, 1, 1, 1], cap: 2, check: {answers: 8}, prereq: 'gaps',
    idea: 'A ring that goes up, down, up, down by one block has every gap 1.',
    hints: ['Every gap should be 1. What do neighbouring towers look like then?', 'Neighbours must differ by one block all the way round.', 'Set A to 0, B to 1, C to 0 and D to 1.'],
    parent: {notice: 'Whether your child builds one tower at a time and fixes gaps as they appear, or plans the up-down pattern.', prompt: 'Can you make all ones a different way?', explanation: 'Each tower must be one block from both neighbours, so the towers go up or down by one at every arrow and come back round to A. Up, down, up, down gives (0, 1, 0, 1) or (1, 0, 1, 0); up, up, down, down gives (0, 1, 2, 1) and its turns. With towers up to 2 there are eight rings in all, counting (1, 2, 1, 2), which is (0, 1, 0, 1) with one block added to every tower.', extension: 'Add one block to every tower of your ring. What happens to the gaps?', connection: 'The rule is the Ducci map D(a, b, c, d) = (|a − b|, |b − c|, |c − d|, |d − a|) (Shapiro, The Four-Number Game).'},
    provenance: 'Week 49 grades 2–3 and 4–5 Problem 3, the ring (1,1,1,1): “Is this ring the result of one move?”'},
  {number: 2, level: 'easy', title: 'Two and nothing', mode: 'make', target: [2, 0, 2, 0], cap: 2, check: {answers: 2}, prereq: 'gaps',
    idea: 'A gap of 0 means two towers are equal.',
    hints: ['Which towers must be equal?', 'The gaps from B to C and from D to A are 0, so B equals C and D equals A.', 'Set A to 0, B to 2, C to 2 and D to 0.'],
    parent: {notice: 'Whether your child reads the 0s as “these two towers match”.', prompt: 'Why must A and D be the same height?', explanation: 'The gap from B to C is 0, so B and C are equal; the gap from D to A is 0, so D and A are equal. Then A and B must be 2 apart: (0, 2, 2, 0) or (2, 0, 0, 2) with towers up to 2.', extension: 'With towers up to 3, how many rings make (2, 0, 2, 0)? (Four: add one block to every tower of either.)', connection: 'Equal gaps of 0 glue towers together; this is what makes three zero gaps impossible in puzzle 4.'},
    provenance: 'Week 49 grades 2–3 and 4–5 Problem 3, the ring (2,0,2,0).'},
  {number: 3, level: 'easy', title: 'Two moves to zero', mode: 'grow', stations: 4, cap: 2, goal: {moves: 2}, check: {deepest: 4}, prereq: 'grow',
    idea: 'Only a flat ring becomes all zeros in one move, and a ring becomes flat when all its gaps are equal.',
    hints: ['Which rings have every gap 0?', 'All four towers equal makes all zeros. Then which ring has all its gaps equal to that height?', 'Set every tower to 1. Then build 0, 1, 0, 1.'],
    parent: {notice: 'Whether your child sees that the first ring must be flat, and then looks for a ring whose gaps are all the same.', prompt: 'Could the ring before all zeros have two different heights?', explanation: 'All four gaps are 0 only when all four towers are equal, so the ring just before zero is flat, (c, c, c, c), with c not 0. The ring before that has every gap c, so it goes up and down by c round the ring, like (0, 1, 0, 1) for c = 1. Rings that first reach zero on the second move are exactly those whose four gaps are equal and not 0.', extension: 'How many flat rings are there with towers up to 2? Which of them can you go back from?', connection: 'Running the Ducci map backward: the preimage of zero is the constant rings.'},
    provenance: 'Week 49 K–1 Problems 3 and 4: starts that become all zeros in one move, and on the second move.'},
  {number: 4, level: 'easy', title: 'Three zeros', mode: 'make', target: [0, 2, 0, 0], cap: 2, check: {answers: 0, reason: 'zeros'}, prereq: 'cant',
    idea: 'Three gaps of 0 make all four towers equal, so the fourth gap must be 0 too.',
    hints: ['Try to build it. What do the three 0 gaps say about the towers?', 'C equals D, D equals A, and A equals B. What is the gap from B to C then?', 'Build any ring, then press Can’t, tap the three 0s on the right, and press Can’t again.'],
    parent: {notice: 'Whether your child tries several rings before deciding none works, and can say why.', prompt: 'If A and B are the same, C and D are the same, and D and A are the same, what is the gap from B to C?', explanation: 'A gap of 0 means two towers are equal. The gaps from A to B, C to D and D to A are 0, so all four towers are equal, and then the gap from B to C is 0 as well, never 2. So no ring makes (0, 2, 0, 0).', extension: 'The total of (0, 2, 0, 0) is even, so the odd-total reason of puzzle 6 does not apply. Can you find another ring of gaps with an even total that no ring makes? ((0, 0, 2, 4): one gap is bigger than the other three together.)', connection: 'A ring of gaps comes from a ring exactly when its numbers split into two groups with equal totals: the gaps that climb and the gaps that fall.'},
    provenance: 'Week 49 grades 2–3 and 4–5 Problem 3, the ring (0,0,0,2), turned to (0,2,0,0) so its certificate is not the first three towers; impossible because three zero gaps force a constant ring.'},
  {number: 5, level: 'medium', title: 'Back from the example', mode: 'make', target: [3, 2, 2, 1], cap: 4, check: {answers: 2}, prereq: 'gaps',
    idea: 'Going round the ring, the gaps that climb must add up to the gaps that fall.',
    hints: ['Start A at 0 or at 4. Which way can the 3 go?', 'Going round, the climbs and the falls must balance: 3 + 1 against 2 + 2.', 'Set A to 1, B to 4, C to 2 and D to 0.'],
    parent: {notice: 'Whether your child fixes one tower and works round the ring, undoing when the last gap comes out wrong.', prompt: 'If A to B climbs 3, which other gaps must fall?', explanation: 'Going round from A and back, every gap is a climb or a fall, and the climbs must equal the falls. Here 3 + 1 = 2 + 2, so either the 3 and the 1 climb and the 2s fall, giving (1, 4, 2, 0), or the other way, giving (3, 0, 2, 4). Both span 4 blocks, so with towers up to 4 these are the only two.', extension: 'Is there a ring whose gaps make (3, 2, 2, 2)? (No: its total is odd.)', connection: 'Choosing a sign for each gap so the signed total is 0 is the partition problem for four numbers.'},
    provenance: 'Week 49 page 1 worked example run backward: (1,4,2,0) makes (3,2,2,1).'},
  {number: 6, level: 'medium', title: 'Odd one out', mode: 'make', target: [0, 1, 1, 1], cap: 3, check: {answers: 0, reason: 'odd'}, prereq: 'odd',
    idea: 'The gaps of any ring add up to an even number.',
    hints: ['Try to build it. Each odd gap joins an odd tower to an even one.', 'Going round from A, a tower switches between odd and even at each odd gap. How many switches are there?', 'Build any ring, then press Can’t, tap the three odd gaps on the right, and press Can’t again.'],
    parent: {notice: 'Whether your child keeps trying rings, or notices that the last gap always comes out wrong.', prompt: 'Start at an even tower and go round. Is each tower odd or even?', explanation: 'A gap is odd exactly when one of its towers is odd and the other even. Going round from A, the towers switch between odd and even at each odd gap, and must come back to A. So there is an even number of odd gaps, and the gaps add up to an even number. (0, 1, 1, 1) has three odd gaps, so no ring makes it.', extension: 'Is an even total enough? ((0, 0, 0, 2) has an even total and no ring makes it: puzzle 4.)', connection: 'The total of the gaps has the same parity as twice the total of the towers: an invariant mod 2. Four moves later every height is even (worksheet grades 4–5 Problem 5).'},
    provenance: 'Week 49 grades 2–3 and 4–5 Problem 3, the ring (1,1,1,0), turned to (0,1,1,1) so its certificate is not the first three towers; impossible because its total is odd.'},
  {number: 7, level: 'medium', title: 'Every way to 0 1 0 1', mode: 'every', target: [0, 1, 0, 1], cap: 2, check: {answers: 4}, prereq: 'every',
    idea: 'Adding the same number of blocks to every tower keeps every gap.',
    hints: ['Find one ring first. Which towers must be equal?', 'A equals B and C equals D, one block apart. Once you have one, add a block to every tower.', 'The rings are 0 0 1 1, 1 1 0 0, 1 1 2 2 and 2 2 1 1. Then press That’s all.'],
    parent: {notice: 'After the first ring, whether your child changes towers at random or lifts every tower by one.', prompt: 'How do you know there are no more?', explanation: 'The 0 gaps make A equal B and C equal D, and the 1 gaps make those two pairs one block apart. So the ring is two equal towers next to two equal towers one higher or one lower: (x, x, x ± 1, x ± 1). With towers up to 2 that is (0, 0, 1, 1), (1, 1, 2, 2), (1, 1, 0, 0) and (2, 2, 1, 1).', extension: 'With towers up to 3, how many are there? (Six.)', connection: 'The map ignores adding a constant: every preimage comes in a family of shifts.'},
    provenance: 'New, in the style of the Week 49 bonus Problem 1 (find every old ring); the ring (0,1,0,1) is the guide’s first move of (1,1,0,0).'},
  {number: 8, level: 'medium', title: 'Four moves back', mode: 'grow', stations: 4, cap: 2, goal: {moves: 4}, check: {deepest: 4}, prereq: 'grow',
    idea: 'Some rings have no ring before them, so the order of choices matters going back.',
    hints: ['Start from a flat ring, and look for rings with gaps that a ring can still make.', 'A ring whose gaps add up to an odd number has nothing before it.', 'Build 1 1 1 1, then 1 0 1 0, then 1 0 0 1, then 1 0 0 0.'],
    parent: {notice: 'Whether your child takes back a ring that leads nowhere, and whether they notice the odd totals.', prompt: 'Why can’t you go back from 1, 2, 1, 2 here?', explanation: 'Some choices are dead ends. A ring with an odd total of gaps, like (0, 0, 1, 0), has nothing before it; and (1, 2, 1, 2), which makes 1, 1, 1, 1, has rings before it only with a tower of 3. One run of four: (1, 0, 0, 0) → (1, 0, 0, 1) → (1, 0, 1, 0) → (1, 1, 1, 1) → zeros, which is also the four-station start of the worksheet’s Problem 5.', extension: 'Try a run that ends at 2, 2, 2, 2 instead. How far back can you go with towers up to 2?', connection: 'With towers up to 2 no run is longer than 4 moves (checked by trying all 81 rings).'},
    provenance: 'Week 49 K–1 Problem 5 and older Problem 4: (1,0,0,0) on four stations takes 4 moves; here built backward.'},
  {number: 9, level: 'hard', title: 'Three towers', mode: 'grow', stations: 3, cap: 1, start: [[1, 0, 1]], goal: {loop: true}, check: {loop: 3}, prereq: 'grow',
    idea: 'On three towers a run can come round for ever, so it never reaches zero.',
    hints: ['Build a ring of three whose gaps make 1, 0, 1. Which of those rings can you go back from again?', 'A ring with an odd total of gaps has nothing before it. Keep the rings with two 1s.', 'Build 0 1 1, then 1 1 0, then 1 0 1.'],
    parent: {notice: 'Whether your child sees that the ring comes back, and what that means for reaching zero.', prompt: 'If 1, 0, 1 comes back after three moves, can it ever reach all zeros?', explanation: 'Building back: (0, 1, 1) makes (1, 0, 1), (1, 1, 0) makes (0, 1, 1), and (1, 0, 1) makes (1, 1, 0). So forward the run goes (1, 0, 1) → (1, 1, 0) → (0, 1, 1) → (1, 0, 1) round and round, and never reaches zero. The other choices, (1, 0, 0), (0, 0, 1) and (0, 1, 0), have one odd gap and nothing before them.', extension: 'On four towers the same start (1, 0, 0, 0) reaches zero in four moves (puzzle 8). Why can’t a run on four towers come round?', connection: 'With an odd number of stations the Ducci map can cycle; with 4 (or any power of 2) every whole-number start reaches zero (Shapiro).'},
    provenance: 'Week 49 K–1 Problem 5 and older Problem 4: (1,0,0) on three stations reaches (1,0,1) and repeats; here the loop is built backward.'},
  {number: 10, level: 'hard', title: 'Every way to 1 2 1 2', mode: 'every', target: [1, 2, 1, 2], cap: 3, check: {answers: 4}, prereq: 'every',
    idea: 'Each ring that works is a choice of which gaps climb, with the climbs balancing the falls.',
    hints: ['Find one ring first. Going round, which gaps climb and which fall?', 'The climbs must add up to the falls: a 1 and a 2 climb, the other 1 and 2 fall.', 'The rings are 0 1 3 2, 1 0 2 3, 2 3 1 0 and 3 2 0 1. Then press That’s all.'],
    parent: {notice: 'Whether your child finds new rings by turning or flipping one they found.', prompt: 'If you turn a ring that works upside down (each tower becomes 3 minus itself), does it still work?', explanation: 'Going round, the climbs must equal the falls, and 1 + 2 = 1 + 2 can be split four ways with one 1 and one 2 climbing. Each split gives a ring that spans 3 blocks, so with towers up to 3 there is exactly one ring for each: (0, 1, 3, 2), (1, 0, 2, 3), (2, 3, 1, 0) and (3, 2, 0, 1).', extension: 'How many rings make (1, 1, 1, 1) with towers up to 3, if one tower must be 0? (Six, the bonus page’s first answer.)', connection: 'Each preimage is a sign vector with signed sum 0; shifting and flipping (h → 3 − h) map preimages to preimages.'},
    provenance: 'Week 49 bonus Problem 1, the target (1,2,1,2) with heights 0–3 (four old rings).'},
  {number: 11, level: 'hard', title: 'Six moves', mode: 'grow', stations: 4, cap: 3, goal: {moves: 6}, check: {deepest: 6}, prereq: 'grow',
    idea: 'A long run must end at a flat ring of an even height: four moves make every height even.',
    hints: ['Starting from 1 1 1 1 gives at most four moves. Try a flat ring of 2s.', 'Going back from 2 2 2 2, keep every height even for two rings, then use odd ones.', 'Build 2 2 2 2, 0 2 0 2, 0 0 2 2, 1 1 1 3, 0 1 2 3, then 0 0 1 3.'],
    parent: {notice: 'Whether your child notices that runs ending at 1, 1, 1, 1 stop at four, and tries 2, 2, 2, 2.', prompt: 'After four moves every height is even. What does that say about a ring that is flat after five moves?', explanation: 'After four moves every height is even (worksheet grades 4–5 Problem 5). A run of six moves is flat after five, so that flat ring is even: here 2, 2, 2, 2. Going back, (0, 2, 0, 2), (0, 0, 2, 2), (1, 1, 1, 3), (0, 1, 2, 3) and (0, 0, 1, 3) make a run of six. With towers up to 3 no run is longer (checked by trying all 256 rings), but the puzzle only asks for six.', extension: 'Double every tower of a run. Does it take the same number of moves?', connection: 'Doubling commutes with the map, so moves are unchanged by scaling (worksheet grades 4–5 Problem 6).'},
    provenance: 'Week 49 Problem 2 (longest run), with heights 0–3; built backward as the review card suggests.'},
  {number: 12, level: 'hard', title: 'Seven moves', mode: 'grow', stations: 4, cap: 4, goal: {moves: 7}, check: {deepest: 7}, prereq: 'grow',
    idea: 'Building back under a cap, each choice must leave room to keep going.',
    hints: ['End at 2 2 2 2, and keep the early rings small so the later ones can climb.', 'Going back from 2 2 2 2: 0 2 0 2, then 0 0 2 2, then 1 1 1 3.', 'Then 0 1 2 3, then 1 1 2 4, then 0 1 2 4.'],
    parent: {notice: 'How your child recovers from a dead end: taking back one ring or starting again.', prompt: 'Which rings did you have to take back, and why?', explanation: 'One run of seven: (0, 1, 2, 4) → (1, 1, 2, 4) → (0, 1, 2, 3) → (1, 1, 1, 3) → (0, 0, 2, 2) → (0, 2, 0, 2) → (2, 2, 2, 2) → zeros. Sixteen of the 625 rings with towers up to 4 take 7 moves and none takes more, but only checking every ring shows that, so the puzzle asks for seven, not for the most.', extension: 'In the playground, with towers up to 5, how long a run can you build? (Still seven.)', connection: 'The worst case grows slowly with the cap: about four moves for each doubling of the tallest tower (Shapiro’s halving proof).'},
    provenance: 'Week 49 Problem 2, the longest run with heights 0–4, and the guide’s chain from (0,1,2,4); built backward as the review card suggests.'}
];

const id = n => `diffs-${String(n).padStart(2, '0')}`;
// A run of `moves` rings back from zero under the cap, the first that the mechanic's longest-run table allows.
function witnessRun(cap, moves) {
  const run = [];
  let top = zero(4);
  for (let k = moves; k > 0; k--) {
    const next = predecessors(top, cap).find(r => deepest(r, cap) >= k - 1);
    assert.ok(next, `a run of ${moves} under ${cap}`);
    run.unshift(next); top = next;
  }
  return run;
}
const out = PUZZLES.map(item => {
  const kind = item.mode === 'grow' ? (item.goal.loop ? 'loop' : 'moves') : item.mode;
  const q = {mode: item.mode, stations: item.target?.length || item.stations, cap: item.cap,
    ...(item.target ? {target: item.target} : {}), ...(item.mode === 'make' ? {cant: true} : {}),
    ...(item.goal ? {goal: item.goal} : {}), ...(item.start ? {start: item.start} : {})};
  let solution;
  if (item.mode === 'make' || item.mode === 'every') {
    const answers = predecessors(item.target, item.cap);
    assert.equal(answers.length, item.check.answers, `${id(item.number)}: answers`);
    answers.forEach(r => assert.deepEqual(gaps(r), item.target));
    if (item.check.answers === 0) {
      assert.equal(reasonOf(item.target)?.kind, item.check.reason, `${id(item.number)}: the reason`);
      solution = {answers: [], reason: reasonOf(item.target)};
    } else {
      assert.equal(reasonOf(item.target), null, `${id(item.number)}: no false reason`);
      solution = {answers: answers.map(keyOf)};
    }
  } else if (item.goal.moves) {
    assert.equal(deepest(zero(4), item.cap), item.check.deepest, `${id(item.number)}: the longest run under the cap`);
    const run = witnessRun(item.cap, item.goal.moves);
    assert.equal(movesToZero(run[0]), item.goal.moves);
    solution = {run: run.map(keyOf)};
  } else {
    // The loop: back from the start until a ring comes again.
    const run = [...item.start];
    while (!run.slice(1).some(r => keyOf(r) === keyOf(run[0]))) run.unshift(predecessors(run[0], item.cap).find(r => movesToZero(r) === Infinity && predecessors(r, item.cap).length));
    assert.equal(run.length - 1, item.check.loop, `${id(item.number)}: loop length`);
    assert.equal(movesToZero(item.start[0]), Infinity, `${id(item.number)}: never zero`);
    solution = {run: run.map(keyOf)};
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Gap rings', mechanic: 'diffs', band: 'all', revision: 1, sourceDocument: 'docs/diffs/README.md',
    parameters: q,
    objective: kind === 'every' ? OBJECTIVE.every(item.cap) : kind === 'moves' ? OBJECTIVE.moves(item.goal.moves) : OBJECTIVE[kind],
    visibleObjective: VISIBLE[kind],
    instruction: kind === 'every' ? OBJECTIVE.every(item.cap) : kind === 'moves' ? OBJECTIVE.moves(item.goal.moves) : OBJECTIVE[kind],
    controls: CONTROLS[item.mode], rules: RULES[item.mode],
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'diffs-playground', number: 0, title: 'Gap rings playground', difficulty_level: 'playground', familyTitle: 'Gap rings', mechanic: 'diffs', band: 'playground', revision: 1, sourceDocument: 'docs/diffs/README.md',
  parameters: {mode: 'playground'},
  objective: 'Build rings back from zero with towers up to 5, each ring’s gaps making the one after it, as far back as you like.', visibleObjective: '',
  instruction: 'Build rings back from zero with towers up to 5, each ring’s gaps making the one after it, as far back as you like.',
  controls: CONTROLS.playground, rules: RULES.grow,
  idea: 'Free play: how long a run can you build backward?',
  prerequisites: 'Compare towers. A grown-up can read How to play.',
  hints: ['Start with a flat ring.', 'Rings whose gaps add up to an odd number have nothing before them.', 'A flat ring of 2s lets you go back further than a flat ring of 1s.'],
  parent: {notice: 'Whether your child aims for long runs and what they learn from dead ends.', prompt: 'What is the longest run you can build? Is there a longer one?', explanation: 'With towers up to 5 the longest runs take 7 moves, the same as with towers up to 4 (checked by trying every ring). Showing that nothing is longer needs that whole search, so it is a question for grown-ups.', extension: 'Build a run, then double every tower of its first ring in your head. How long is that run?', connection: 'Ducci’s four-number game (Shapiro).', sourceIds: sources},
  provenance: 'Week 49 Problem 2, “longest run”, as free play built backward.'
};
assert.equal(deepest(zero(4), 5), 7, 'the playground: still seven moves at most');

const json = {
  title: 'Gap rings',
  version: 1,
  families: [{id: 'diffs', title: 'Gap rings', mathematics: 'A ring of towers whose next ring is the gaps between neighbours: D(a, b, c, d) = (|a − b|, |b − c|, |c − d|, |d − a|), Ducci’s four-number game. Every puzzle goes backward. A ring of gaps comes from some ring exactly when its numbers split into two groups with equal totals; two certificates the child can point at rule a ring out: an odd total (going round, odd and even swap at each odd gap and must come back), or three gaps of 0 (all four towers equal, so the fourth gap is 0 too). Adding the same to every tower keeps the gaps. On four towers every whole-number start reaches all zeros (after four moves every height is even, and the tallest never grows); with towers up to 4 the longest runs take 7 moves. On three towers a run can come round for ever.', rules: RULE, sourceIds: sources}],
  sources: [
    {id: 'diffs-week49', title: 'Bellingham Math Circle — Week 49: Four towers and differences (student packets, adult guide and bonus)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-49', kind: 'local curriculum'},
    {id: 'diffs-card49', title: 'Week 49 review card and math checks (predecessors, the two certificates, longest runs, three stations; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-49.md', kind: 'local curriculum'},
    {id: 'diffs-shapiro', title: 'Daniel Shapiro — The Four-Number Game (2005), the parity proof that every start reaches zero', url: 'https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/d/5402/files/2014/08/4NumbersGame-18ok6xx.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/diffs/diffs.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${JSON.stringify(p.solution)}`).join('\n'));
