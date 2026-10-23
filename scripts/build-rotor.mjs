// Authoring list for Flip switches (worksheet Week 91, rotor-router machines).
// States each puzzle's tree and target, checks with the mechanic's own methods
// that each target is possible or not as intended (and every certificate and
// That's-all count in docs/rotor/README.md), records a solution witness as a
// list of moves, and writes dist/families/rotor/rotor.json.
// Run: node scripts/build-rotor.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {allStarts, lettersOf, startsFitting, ordersFitting, possible, certificates, switchId, switchCount} from '../dist/families/rotor/rotor.js';

const SOURCES = ['rotor-week91', 'rotor-card91', 'rotor-levine', 'rotor-holroyd-propp'];
const RULES = [
  'Counters drop in at the top, one at a time. A switch sends a counter down the road it points to, then flips to point down the other road.',
  'Set every switch before the first counter. After that only the counters flip them.',
  'The exits are lettered from the left. The bottom row shows where the counters landed, in order.'
];
const CONTROLS = {
  make: 'Tap a switch to flip it, or tap a road below a switch to point the switch down that road. Send drops the next counter. If no start can make the order, press Can’t, then tap a switch and two letters of the order that would both leave that switch the same way, one after the other. Undo takes back a counter or a flip.',
  every: 'Tap a switch to flip it, or tap a road below a switch to point the switch down that road. Send drops the next counter. Keep puts the order on the shelf and brings the counters back. Press That’s all when the shelf has every order that fits. Undo takes back a counter, a flip or a Keep.'
};
const words = target => target.map(x => x ?? '_').join(' ');
const prefixOf = target => target.slice(0, target.indexOf(null)).join(', ');
const OBJECTIVES = {
  make: q => q.target.includes(null) ? `Make the counters land in an order that starts with ${prefixOf(q.target)}, or press Can’t if no start can.` : `Make the counters land in the order ${words(q.target)}, or press Can’t if no start can.`,
  every: q => `Find every order that starts with ${prefixOf(q.target)}: keep each one, then press That’s all.`
};
const VISIBLE = {make: () => '', every: () => 'Find every order that fits.'};
const PREREQUISITES = {
  1: 'Tell left from right and match two letters. No reading is needed: a grown-up can read the letters aloud. Can’t asks a child to point at two counters in a row.',
  2: 'Match the letters A to D and follow a counter down two switches. Can’t needs the idea that two letters share a switch; a grown-up can help with the taps.',
  3: 'Match the letters A to H and keep track of seven switches, usually grades 4–5. A grown-up can help read each switch’s visitors in order before a Can’t.'
};
const T = word => word.split('').map(x => x === '_' ? null : x);

// kind: what the build expects (make: 'possible' or 'cant'; every: the count).
const PUZZLES = [
  {number: 1, level: 'easy', title: 'One switch', q: {mode: 'make', depth: 1, target: T('ABAB')}, kind: 'possible',
    idea: 'A switch takes turns: after a counter goes one way, the next goes the other way.',
    hints: ['Which exit must the first counter reach?', 'The first counter goes where the switch points, so point the switch toward A.', 'Point the switch to the left, then press Send four times.'],
    parent: {notice: 'Each counter flips the switch, so the exits take turns: A, B, A, B.', prompt: 'Where will the fifth counter go? And the twelfth?', explanation: 'A counter follows the arrow and then the switch flips, so two counters in a row always leave on opposite sides. Pointing the switch left gives A B A B …, and pointing it right gives B A B A …. These are the only orders one switch can make, and over any run of counters the two exits differ by at most one.', extension: 'Send twelve counters. How many reach each exit? Could one exit ever be two ahead?', connection: 'A single rotor: a machine with a memory, whose counts stay as even as they can be, unlike a coin.'},
    provenance: 'Week 91, Problem 1 (one switch: arrival orders): XYXY, with the exits lettered A and B.'},
  {number: 2, level: 'easy', title: 'Twice in a row', q: {mode: 'make', depth: 1, target: T('ABBA')}, kind: 'cant',
    idea: 'A switch never sends two counters in a row the same way.',
    hints: ['Send a counter or two. What does the switch do after each one?', 'Look at the second and third letters. Could two counters in a row both reach B?', 'Press Can’t, then tap the switch and the two Bs.'],
    parent: {notice: 'Children often try both starts before they suspect that no start works.', prompt: 'Could any start make two Bs in a row?', explanation: 'After a counter reaches B the switch points to A, so the next counter reaches A. The second and third letters are both B, so no start makes A B B A. The claim is the switch and those two Bs. The first and last letters, both A, are not a proof: the Bs come between them, and the app says so.', extension: 'Which four-letter orders can the switch make? (Only A B A B and B A B A, 2 of the 16.)', connection: 'Week 91’s coin comparison: a coin can make B B, a switch can’t.'},
    provenance: 'Week 91, Problem 1: XYYX cannot be made (two Ys in a row).'},
  {number: 3, level: 'easy', title: 'D first', q: {mode: 'make', depth: 2, target: T('D___')}, kind: 'possible',
    idea: 'The first counter’s trip fixes only the switches it passes; the other switch is free.',
    hints: ['Which switches does a counter pass on its way to D?', 'To reach D, the first counter goes right at the top switch and right again.', 'Point the top switch and the switch above C and D to the right, set the other switch either way, then send four counters.'],
    parent: {notice: 'The switch above A and B doesn’t matter for the first counter, and either way is accepted.', prompt: 'Did every exit get one counter?', explanation: 'D’s trip passes the top switch and the switch above C and D, so both must start pointing right. The switch above A and B is free, which gives two orders: D A C B and D B C A. Every block of four counters reaches each exit once, whatever the start.', extension: 'Can the second counter land on D as well? (No: the top switch has flipped to the left.)', connection: 'The guide’s K–1 route: “Make the first counter land on D” and “Send four counters. Does every exit get one?”'},
    provenance: 'Week 91, guide p. 2, K–1 route (“Make the first counter land on D”), with Problem 2’s D-first starts.'},
  {number: 4, level: 'easy', title: 'Four in order', q: {mode: 'make', depth: 2, target: T('ACBD')}, kind: 'possible',
    idea: 'Each switch’s first counter shows which way that switch must start.',
    hints: ['Where does the first counter go? Which switches does it pass?', 'A needs the top switch and the switch above A and B to point left. Which counter is first through the switch above C and D?', 'Point all three switches to the left, then send four counters.'],
    parent: {notice: 'The start can be read off the order: each switch’s first visitor names its side.', prompt: 'Which switch does C’s trip tell you about?', explanation: 'A, the first counter, needs the top switch and the switch above A and B pointing left. C is the first counter through the switch above C and D, so that switch starts left too. All three left makes A C B D. Each of the 8 starts makes a different order.', extension: 'Make B D A C. (Top left, the other two right.)', connection: 'Week 91 Problem 3; the guide lists all eight four-exit orders by start.'},
    provenance: 'Week 91, Problem 3 (program four arrival orders): ACBD.'},
  {number: 5, level: 'medium', title: 'Next to each other', q: {mode: 'make', depth: 2, target: T('ABCD')}, kind: 'cant',
    idea: 'Two counters in a row leave the top switch on opposite sides, but A and B are both on its left.',
    hints: ['Try a start. Where does the second counter go?', 'A and B are both on the left of the top switch. Which way does the top switch send the second counter?', 'Press Can’t, then tap the top switch, A and B.'],
    parent: {notice: 'Some children try several starts first; the useful question is which switch two letters share.', prompt: 'Which switch stops A and B from coming first?', explanation: 'Counters 1 and 2 are consecutive visits to the top switch, so they leave on opposite sides. A and B are both on the left, so no start makes A B C D. C and D, the third and fourth, fail the same way, and either claim is accepted.', extension: 'Which of the 24 orders of A, B, C and D can the tree make? (8, one per start: the left and right halves must take turns.)', connection: 'Week 91 Problem 3: ABCD is impossible.'},
    provenance: 'Week 91, Problem 3: ABCD.'},
  {number: 6, level: 'medium', title: 'Every D first', q: {mode: 'every', depth: 2, target: T('D___')}, kind: 2,
    idea: 'Only the switches on D’s trip are forced; the free switch doubles the answers.',
    hints: ['Make one order that starts with D, and keep it.', 'Which switch does the first counter not pass? Change only that one.', 'The two orders are D A C B and D B C A.'],
    parent: {notice: 'Keep brings the counters back, so the next start is one flip away.', prompt: 'How do you know there are no more?', explanation: 'D’s trip fixes the top switch and the switch above C and D, both right. The switch above A and B is free, so exactly two starts put D first: right, left, right gives D A C B and right, right, right gives D B C A (top, then the switches above A and B and above C and D).', extension: 'How many orders start with A? How many end with A? (2 and 2.)', connection: 'Week 91 Problem 2 (keep D first): exactly two answers.'},
    provenance: 'Week 91, Problem 2 (four-exit tree: keep D first; find every arrival order).'},
  {number: 7, level: 'medium', title: 'C first', q: {mode: 'make', depth: 2, target: T('CBDA')}, kind: 'possible',
    idea: 'Read each switch’s start from the first counter through it.',
    hints: ['Which switches does C’s trip pass?', 'C needs the top switch right and the switch above C and D left. Which counter is first through the switch above A and B?', 'Point the top switch right, the switch above A and B right and the switch above C and D left.'],
    parent: {notice: 'B is the first counter through the switch above A and B, though it comes second.', prompt: 'Which counter tells you about each switch?', explanation: 'C goes right at the top switch and left at the switch above C and D. B is the first counter through the switch above A and B, and goes right there. So the start is right, right, left, and it is the only one.', extension: 'Change one switch at a time. Which letters trade places?', connection: 'Week 91 Problem 3’s programming task; the guide’s key lists C B D A under right, right, left.'},
    provenance: 'A new target for Week 91 Problem 3’s task; CBDA is in the guide’s eight-order key.'},
  {number: 8, level: 'medium', title: 'One step later', q: {mode: 'make', depth: 2, target: T('DABC')}, kind: 'cant',
    idea: 'The same rule one step later: counters 2 and 3 can’t both go left at the top.',
    hints: ['The first two letters can be made. Try it, and watch the third counter.', 'After D and A, which way does the top switch point?', 'Press Can’t, then tap the top switch, A and B.'],
    parent: {notice: 'D A can be made, so the trouble shows only at the third counter.', prompt: 'Is this the same reason as A B C D?', explanation: 'Counters 2 and 3 are consecutive visits to the top switch, and A and B are both on its left. It is the same rule as A B C D, one step later (the review card’s fix 5). Put another way, counters 1 and 3 must share a half, but D is on the right and B on the left.', extension: 'Can an order of A, B, C and D go wrong only at its last two letters? (No: once three take turns at the top, the fourth is the letter left in the other half.)', connection: 'Week 91 Problem 3: DABC is impossible for the root reason.'},
    provenance: 'Week 91, Problem 3: DABC.'},
  {number: 9, level: 'hard', title: 'Eight exits', q: {mode: 'make', depth: 3, target: T('AECGBFDH')}, kind: 'possible',
    idea: 'Every switch’s first counter names its start; here every switch starts left.',
    hints: ['Which switches does A’s trip pass? Which counter is first through each of the others?', 'A, E, C and G are each the first through some switches, and each goes left there.', 'Point all seven switches to the left, then send eight counters.'],
    parent: {notice: 'The order looks scrambled, but it comes from the all-left start.', prompt: 'Number the exits 0 to 7. Do you see a pattern in A E C G B F D H?', explanation: 'Every letter that is first through a switch goes left there, so all seven switches start left. Numbering the exits 0 to 7, counter k lands on the exit whose three-digit binary number is k written backwards: the bit-reversal order.', extension: 'What does the all-right start make? (H D F B G C E A.)', connection: 'Week 91 Problem 4; the review card names the bit-reversal order.'},
    provenance: 'Week 91, Problem 4: AECGBFDH (all seven cards L).'},
  {number: 10, level: 'hard', title: 'Mixed switches', q: {mode: 'make', depth: 3, target: T('FBGDEAHC')}, kind: 'possible',
    idea: 'Find the first counter through each switch; its side there is the start.',
    hints: ['F is first. Which three switches does its trip pass, and which way?', 'After F, find the first counter through each switch F didn’t pass: B, then G, then D.', 'Point the top switch right, the switches above A to D and above E to H left, the switches above A and B, above C and D and above E and F right, and the switch above G and H left.'],
    parent: {notice: 'Four counters (F, B, G and D) set all seven switches.', prompt: 'Which counters are the first through some switch?', explanation: 'F sets the top switch (right), the switch above E to H (left) and the switch above E and F (right). B sets the switch above A to D (left) and the switch above A and B (right). G sets the switch above G and H (left), and D the switch above C and D (right). Each of the 128 starts makes a different order, so this start is the only one.', extension: 'Flip only the switch above G and H. Which two letters trade places? (G and H.)', connection: 'Week 91 Problem 5: the eight-exit tree makes 128 orders, one per start.'},
    provenance: 'A new target for Week 91 Problem 4’s task, from a mixed start; the count is Problem 5’s (128 orders, one per start).'},
  {number: 11, level: 'hard', title: 'Below the top', q: {mode: 'make', depth: 3, target: T('AEBFCGDH')}, kind: 'cant',
    idea: 'The top switch takes turns here; the switch above A to D gets A and B in a row, both on its left.',
    hints: ['The top switch takes turns here. Look at the counters that pass the switch above A, B, C and D.', 'That switch is visited by A, B, C and D, in that order. Which way do A and B go there?', 'Press Can’t, then tap the switch above A, B, C and D, then A and B.'],
    parent: {notice: 'Children who check only the top switch expect this one to work.', prompt: 'Which switch sees A and B one after the other?', explanation: 'The top switch alternates: A left, E right, B left, and so on. But the switch above A to D is visited by A, B, C and D in that order, and A and B both leave it on the left. The switch above E to H fails the same way with E and F. Any of these claims proves it.', extension: 'Write an order where the top switch and the switch above A to D take turns but the switch above E to H doesn’t. (A E C F B G D H is one.)', connection: 'Week 91 Problem 4: AEBFCGDH is impossible.'},
    provenance: 'Week 91, Problem 4: AEBFCGDH.'},
  {number: 12, level: 'hard', title: 'The other side', q: {mode: 'make', depth: 3, target: T('AECFBGDH')}, kind: 'cant',
    idea: 'Check every switch’s visitors: here only the switch above E to H fails.',
    hints: ['Check each switch’s visitors in order. Does the switch above A to D take turns?', 'The switch above E, F, G and H is visited by E, F, G and H, in that order.', 'Press Can’t, then tap the switch above E, F, G and H, then E and F.'],
    parent: {notice: 'The top switch and the switch above A to D both take turns here.', prompt: 'How can you check a whole order quickly?', explanation: 'Read each switch’s visitors in order. The top switch sees A E C F B G D H, left and right in turn. The switch above A to D sees A C B D, also in turn. The switch above E to H sees E F G H, and E and F both leave it on the left (G and H both go right). An order can be made exactly when every switch’s visitors take turns.', extension: 'How many of the 40,320 orders of A to H can the tree make? (128.)', connection: 'Week 91 Problem 5: 128 of 40,320.'},
    provenance: 'A new impossible target for Week 91 Problem 4’s task, failing only below the top on the right.'},
  {number: 13, level: 'hard', title: 'A then E', q: {mode: 'every', depth: 3, target: T('AE______')}, kind: 4,
    idea: 'The first two counters fix five switches; the two they don’t pass give four orders.',
    hints: ['Make one order that starts A, E, and keep it.', 'Which switches do the trips of A and E not pass? Only those can change.', 'The free switches are the ones above C and D and above G and H.'],
    parent: {notice: 'Two free switches give 2 × 2 orders.', prompt: 'Why four?', explanation: 'A’s trip fixes the top switch, the switch above A to D and the switch above A and B, all left; E’s trip fixes the switch above E to H and the switch above E and F, also left. The switches above C and D and above G and H are free, so there are 2 × 2 = 4 orders: A E C G B F D H, A E C H B F D G, A E D G B F C H and A E D H B F C G.', extension: 'How many orders start with A? (16: four switches are free.)', connection: 'Week 91 Problems 2 and 5: each free switch doubles the orders.'},
    provenance: 'A new find-every target, Week 91 Problem 2’s question on the eight-exit tree.'}
];

const PLAYGROUND = {
  id: 'rotor-playground', number: 0, title: 'Flip switches playground', band: 'playground', difficulty_level: 'playground', mechanic: 'rotor', familyTitle: 'Flip switches', revision: 1,
  parameters: {mode: 'playground'},
  objective: 'Set the switches, send counters and see where they land.', visibleObjective: '', instruction: 'Set the switches, send counters and see where they land.',
  controls: 'Choose a tree. Tap a switch to flip it, or tap a road to point its switch that way, then press Send for each counter. Clear brings the counters back so the switches can change.',
  rules: ['Set every switch before the first counter. After that only the counters flip them.', 'A switch sends a counter down the road it points to, then flips.'],
  idea: 'Free play with one switch and the four- and eight-exit trees.',
  prerequisites: 'None. A grown-up can read the letters.',
  hints: ['Send four counters through the four-exit tree. Did every exit get one?', 'Send four more without changing anything. Are the switches back where they started?', 'On paper, toss a coin for each counter instead and compare with one switch.'],
  parent: {notice: 'After each full block the switches are back where they started.', prompt: 'Does every exit get a counter before any exit gets a second?', explanation: 'The playground has no goal and never counts as solved. A complete tree sends every block of 2, 4 or 8 counters once to each exit, from any start, and every switch is visited an even number of times, so it ends the block as it began (Week 91 Problem 6). The playground holds two blocks, so children can see the order repeat.', extension: 'Week 91 Problem 7 compares one switch with a coin: a coin can make A A, a switch never can.', connection: 'This is the rotor-router machine on a complete binary tree.', sourceIds: SOURCES},
  provenance: 'Week 91 materials: the one-switch board and the four- and eight-exit tree boards.',
  sourceDocument: 'docs/rotor/README.md'
};

// --- Checks and witnesses ----------------------------------------------------
const setMoves = start => start.map((side, i) => ({type: 'set', node: switchId(i), side}));
const sends = n => Array.from({length: n}, () => ({type: 'send'}));
const out = PUZZLES.map(item => {
  const q = {...item.q}, d = q.depth, len = q.target.length;
  assert.equal(len, d === 1 ? 4 : 2 ** d, `${item.title}: length`);
  if (q.mode === 'make' && item.kind === 'possible') {
    const starts = startsFitting(d, q.target);
    assert.ok(starts.length > 0, `${item.title}: possible`);
    if (!q.target.includes(null)) assert.equal(starts.length, 1, `${item.title}: one start`);
    q.witness = [...setMoves(starts[0]), ...sends(len)];
  }
  if (q.mode === 'make' && item.kind === 'cant') {
    assert.equal(possible(d, q.target), false, `${item.title}: impossible`);
    const c = certificates(d, q.target)[0];
    q.witness = [...setMoves(allStarts(d)[0]), {type: 'send'}, {type: 'cant', node: c.node, at: c.at}];
  }
  if (q.mode === 'every') {
    const starts = startsFitting(d, q.target);
    assert.equal(starts.length, item.kind, `${item.title}: ${item.kind} orders`);
    assert.equal(new Set(ordersFitting(d, q.target)).size, item.kind, `${item.title}: distinct orders`);
    q.witness = [...starts.flatMap((s, k) => [...(k ? s.map((side, i) => side === starts[k - 1][i] ? null : {type: 'set', node: switchId(i), side}).filter(Boolean) : setMoves(s)), ...sends(len), {type: 'keep'}]), {type: 'all'}];
  }
  assert.equal(switchCount(d), 2 ** d - 1);
  const id = `rotor-${String(item.number).padStart(2, '0')}`, objective = OBJECTIVES[q.mode](q);
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'rotor', familyTitle: 'Flip switches', revision: 1,
    parameters: q,
    objective, visibleObjective: VISIBLE[q.mode](q), instruction: objective,
    controls: CONTROLS[q.mode], rules: RULES,
    idea: item.idea, prerequisites: PREREQUISITES[d], hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES},
    provenance: item.provenance,
    sourceDocument: 'docs/rotor/README.md'
  };
});
// The guide's four-exit key, in its card order.
assert.deepEqual(allStarts(2).map(s => lettersOf(2, s, 4).join('')), ['ACBD', 'ADBC', 'BCAD', 'BDAC', 'CADB', 'DACB', 'CBDA', 'DBCA']);

const pack = {
  title: 'Flip switches',
  version: 1,
  families: [{id: 'rotor', title: 'Flip switches', mathematics: 'Counters drop one at a time into a complete binary tree of switches; each switch sends a counter down the road it points to and then flips (a rotor-router). So at every switch, consecutive visits leave on opposite sides, and any run of visits splits as evenly as it can. A complete tree of depth d therefore sends every block of 2^d counters once to each exit, from any start, and every switch ends the block as it began. A full order of the exits can be made exactly when, at every switch, its visitors in that order take turns left and right; then the first visitor of each switch gives its start, so each of the 2^(2^d − 1) starts makes its own order (8 of the 24 orders on four exits, 128 of the 40,320 on eight). An order that can’t be made has a switch and two consecutive visitors that leave it on the same side, and that pair is the proof.', rules: RULES, sourceIds: SOURCES}],
  sources: [
    {id: 'rotor-week91', title: 'Bellingham Math Circle — Week 91: Rotor-router machines (worksheets, materials and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-91', kind: 'worksheet'},
    {id: 'rotor-card91', title: 'Bellingham Math Circle — Week 91 review card (Rotor-router machines), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-91.md', kind: 'worksheet'},
    {id: 'rotor-levine', title: 'Lionel Levine — The Rotor-Router Model, §1 (definition, with the follow-then-flip convention used here) and Lemma 1.1', url: 'https://arxiv.org/abs/math/0409407', kind: 'research'},
    {id: 'rotor-holroyd-propp', title: 'Alexander E. Holroyd and James Propp — Rotor Walks and Markov Chains, introduction and Theorem 1 (background on how evenly rotors share visits)', url: 'https://arxiv.org/abs/0904.4507', kind: 'research'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
await writeFile(new URL('../dist/families/rotor/rotor.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.target.map(x => x ?? '_').join('')} ${PUZZLES[p.number - 1].kind}`).join('\n'));
