// Authoring list for Pairs that stay (worksheet Week 27). Computes every
// puzzle's blocking pairs, pairings that can stay, repairs and design
// witnesses with the mechanic's own helpers, checks them against the table in
// docs/matching/README.md, and writes dist/families/matching/matching.json.
// Run: node scripts/build-matching.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {blockersOf, stableOf, repairsOf, disjointBlockers, lastOnes, canStay, profilesOf} from '../dist/families/matching/matching.js';

// Strips as 'A:YX B:XY X:AB Y:AB', first choice first.
const strips = s => Object.fromEntries(s.split(' ').map(t => t.split(':')));
const TWO = {circles: 'AB', squares: 'XY'}, THREE = {circles: 'ABC', squares: 'XYZ'}, FOUR = {circles: 'ABCD', squares: 'WXYZ'};

const RULES = [
  'Each letter has a strip ranking the letters on the other side, its first choice next to it.',
  'A circle and a square that are not together block the pairing when each would rather have the other than its own partner. One letter wanting to switch is not enough.',
  'A pairing can stay when no circle and square block it.'
];
const MORE = {
  check: 'Press Stays if the pairing can stay. If it can’t, tap a circle and a square that block it; if one of them would keep its partner, the board says so.',
  every: 'Stays keeps a pairing that can stay. If it can’t, tap a circle and a square that block it before changing the pairing. Press That’s all when no other pairing can stay; it says if there is another.',
  design: 'Changing a strip clears the pairings kept for the old strips.',
  repair: 'Only one strip may change at a time: changing a second strip puts the first one back. Can’t is right when no single strip can make the pairing stay.',
  last: 'A letter gets its last choice when its partner is at the far end of its strip.'
};
const CONTROLS = {
  check: 'Tap a circle and then a square, or drag one onto the other, to say they would both rather be together. Press Stays if no circle and square would. Undo takes back a claim.',
  every: 'Tap a circle and then a square, or drag one onto the other, to pair them; their old partners pair with each other. Press Stays to keep a pairing; if it can’t stay, tap a circle and a square that would both rather be together. Undo takes back the last move.',
  edit: 'Tap two places on one strip, or drag one onto the other, to swap them.',
  repair: 'Tap two places on one strip, or drag one onto the other, to swap them. Press Stays when the pairing can stay, or Can’t. Tapping a circle and then a square asks whether they would both rather be together. Undo takes back the last move.',
  last: 'Tap two places on one strip to swap them, and tap a circle and then a square to pair them. Press Stays when the pairing can stay and three letters get their last choice; if it can’t stay, tap a circle and a square that would both rather be together.'
};
const OBJECTIVE = {
  check: 'Press Stays if this pairing can stay; if not, tap a circle and a square that would both rather be together.',
  every: 'Find every pairing that can stay: keep each with Stays, then press That’s all.',
  both: 'Change the strips so that both pairings can stay, keep both with Stays, then press That’s all.',
  two: 'Change the strips so that exactly two pairings can stay, keep both with Stays, then press That’s all.',
  repair: 'Change one strip so that the drawn pairing can stay, or press Can’t if no one strip can.',
  last: 'Make a pairing that can stay in which three letters get their last choice, then press Stays.'
};
const VISIBLE = {
  check: 'Press Stays, or tap a circle and a square that would both rather be together.',
  every: 'Find every pairing that can stay.',
  both: 'Change the strips so both pairings can stay.',
  two: 'Change the strips so exactly two pairings can stay.',
  repair: 'Change one strip so this pairing can stay.',
  last: 'Make a pairing that can stay where three letters get their last choice.'
};
const PREREQUISITES = {
  two: 'Recognise four letters and compare two places on a strip. No arithmetic; a grown-up can read How to play.',
  three: 'Keep three pairs in mind and check both letters of a pair against their strips.',
  four: 'Organise a search over many pairings, and notice letters that rank each other first.',
  design: 'Change rankings with a goal in mind, then check every pairing of the new strips.'
};
const sources = ['matching-week27', 'matching-card27', 'matching-gs', 'matching-pass'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Who would switch?', mode: 'check', market: TWO, lists: 'A:YX B:XY X:AB Y:AB', pairing: 'XY', check: {blockers: ['AY']}, prereq: 'two',
    idea: 'A pair blocks only when both would rather be together; one letter wanting to switch is not enough.',
    hints: ['Ask each letter: who does it want more than its partner? Then ask that one back.', 'B would rather have X. Would X rather have B than A?', 'A would rather have Y, and Y would rather have A.'],
    parent: {notice: 'Whether your child taps B and X first. B wants X, but X keeps A, its first choice: a one-sided wish, and the board says “X says no.”', prompt: 'B would rather have X. Why isn’t that enough?', explanation: 'A ranks Y first but is with X, and Y ranks A first but is with B, so each would rather have the other: A and Y block, and the pairing can’t stay. B would rather have X too, but X ranks A, its partner, ahead of B, so X says no. A blocking pair needs a yes from both letters. The crossed pairing, A with Y and B with X, gives both circles their first choices, so neither circle wants to switch and it can stay.', extension: 'Pair A with Y and B with X. Would anyone switch now? (No circle would: both have their first choices.)', connection: 'This is a blocking pair in Gale and Shapley’s stable matching problem; a pairing is stable when it has none.'},
    provenance: 'New: the Week 27 review card’s fix 2 launch profile, printed in no packet (A: Y > X; B: X > Y; X: A > B; Y: A > B), with A–X and B–Y drawn.'},
  {number: 2, level: 'easy', title: 'Can it stay?', mode: 'check', market: TWO, lists: 'A:XY B:XY X:AB Y:AB', pairing: 'XY', check: {blockers: []}, prereq: 'two',
    idea: 'A pairing can stay even when letters want to switch, as long as every wish meets a no.',
    hints: ['Who would rather have someone else? Ask that one back.', 'B would rather have X, and Y would rather have A.', 'X keeps A, and A keeps X: every wish meets a no.'],
    parent: {notice: 'Whether your child presses Stays only after checking each wish. Two letters want to switch here, and both are told no.', prompt: 'B wants X. What does X say?', explanation: 'A and X have their first choices. B would rather have X, but X prefers A, its partner. Y would rather have A, but A prefers X, its partner. Those are the only wishes, and neither is answered yes, so the pairing can stay. The crossed pairing can’t: A and X want each other.', extension: 'Which pair would block the crossed pairing, A with Y and B with X? (A and X.)', connection: 'Checking stability means asking about every circle and square that are not together; checking them all is the proof.'},
    provenance: 'Week 27 K–1 Problem 1, bottom case (Grades 2–3 Problem 1, top case): its straight pairing.'},
  {number: 3, level: 'easy', title: 'One strip', mode: 'repair', market: TWO, lists: 'A:YX B:YX X:AB Y:AB', pairing: 'XY', check: {repairs: ['A:XY', 'Y:BA']}, prereq: 'two',
    idea: 'To stop a blocking pair, change the wish of one of its two letters.',
    hints: ['Which two would both rather be together?', 'A and Y block. Whose strip could change that?', 'Swap the two places on A’s strip, or on Y’s, then press Stays.'],
    parent: {notice: 'Whether your child changes the strip of a letter in the blocking pair, or tries B’s or X’s first.', prompt: 'A and Y want each other. Which strips could stop that?', explanation: 'The only blocking pair is A and Y: A ranks Y first but is with X, and Y ranks A first but is with B. Reversing A’s strip makes A content with X; reversing Y’s makes Y content with B. Either one alone lets the pairing stay. Reversing B’s or X’s strip leaves A and Y wanting each other.', extension: 'Which strips work? (A’s and Y’s: the two letters of the blocking pair.)', connection: 'Changing one letter’s ranking removes only blocking pairs through that letter, and can create new ones through it.'},
    provenance: 'Week 27 K–1 Problem 3, top case.'},
  {number: 4, level: 'easy', title: 'Two blocking pairs', mode: 'repair', market: TWO, lists: 'A:YX B:XY X:BA Y:AB', pairing: 'XY', check: {repairs: [], cant: ['AY', 'BX']}, prereq: 'two',
    idea: 'Two blocking pairs with no letter in common can’t both be stopped by changing one strip.',
    hints: ['Find every circle and square that would both rather be together.', 'A and Y block, and so do B and X.', 'No strip belongs to a letter of both pairs. Press Can’t.'],
    parent: {notice: 'Whether your child finds the second blocking pair, or keeps trying strips.', prompt: 'Which strips touch A and Y? Which touch B and X?', explanation: 'A and Y rank each other first, and so do B and X, but the drawn pairing puts A with X and B with Y. A blocking pair can only be stopped by changing the strip of one of its letters. Changing A’s or Y’s strip leaves B and X; changing B’s or X’s leaves A and Y. So no single strip works. The crossed pairing gives everyone a first choice and can stay.', extension: 'With two strips allowed, which two work? (One from each pair, such as A’s and B’s, each putting its partner first.)', connection: 'Blocking pairs are edges between circles and squares. Edges that pairwise share a letter all share one, so one strip can repair a pairing exactly when its blocking pairs meet at one letter; two with no letter in common prove it can’t.'},
    provenance: 'Week 27 K–1 Problem 3, bottom case (“cross out the pairing if none works”).'},
  {number: 5, level: 'medium', title: 'Three pairs', mode: 'check', market: THREE, lists: 'A:XYZ B:XZY C:YXZ X:CBA Y:ACB Z:BAC', pairing: 'YXZ', check: {blockers: ['CX']}, prereq: 'three',
    idea: 'With three pairs there are six circle–square pairs to check; here several letters want to switch, and only one wish is answered yes.',
    hints: ['Start with a letter that is badly off. Who has its last choice?', 'C has Z, its last choice. Ask each square C would rather have.', 'C would rather have X, and X would rather have C than B.'],
    parent: {notice: 'Whether your child checks the pairs in order, or taps the first wish they notice. A would rather have X, but X says no.', prompt: 'Which letters would rather have someone else? Which of those wishes is answered yes?', explanation: 'A has Y, its second choice, and wants X, but X ranks C, B, A and is with B: no. B has X, its first. C has Z, its last, and wants Y and X: Y has A, its first, so no; X ranks C first, so yes. So C and X block. From the squares’ side, Z has C, its last, and wants B and A, but B has its first choice and A prefers Y to Z. One blocking pair, C and X. The only pairing of these strips that can stay is A with Y, B with Z and C with X.', extension: 'Pair C with X; B moves to Z. Can it stay now? (Yes: it is the only pairing of these strips that can.)', connection: 'Checking a pairing of n pairs means n(n − 1) questions, one for each circle and square that are not together.'},
    provenance: 'Week 27 Grades 2–3 Problem 2’s strips (also Grades 4–5 Problem 1, bottom), with the candidate A–Y, B–X, C–Z from the guide’s audit.'},
  {number: 6, level: 'medium', title: 'Both stay', mode: 'every', edit: true, count: 2, goal: 'both', market: TWO, lists: 'A:XY B:XY X:AB Y:AB', pairing: 'XY', check: {answers: 2}, prereq: 'design',
    idea: 'Both pairings stay exactly when the circles’ first choices differ and the squares’ first choices point the other way.',
    hints: ['Could A and B both put X first? What would X need to want?', 'Give A and B different first choices, and X and Y the opposite ones.', 'A: X first, B: Y first, X: B first, Y: A first.'],
    parent: {notice: 'Whether your child changes strips at random, or reasons from what X would need.', prompt: 'In the straight pairing, who has a first choice? In the crossed one?', explanation: 'If A and B both put X first, X would have to prefer A to keep one pairing and B to keep the other, so the circles’ first choices differ, and so do the squares’. If the squares’ first choices matched the circles’, the other pairing would have a blocking pair. So they are opposite: one pairing gives both circles their first choices and the other both squares. Two of the sixteen sets of strips do this: A: X, Y; B: Y, X; X: B, A; Y: A, B, and its mirror image.', extension: 'Make strips where only the straight pairing can stay. (Seven of the sixteen sets of strips do.)', connection: 'When two pairings stay, the circles’ best and the squares’ best differ: they are the two ends of the lattice of stable matchings.'},
    provenance: 'Week 27 K–1 Problem 6 (“fill the strips so both drawn pairings can stay”), starting from Problem 1’s bottom strips.'},
  {number: 7, level: 'medium', title: 'One letter', mode: 'repair', market: THREE, lists: 'A:ZXY B:YXZ C:XYZ X:BAC Y:ACB Z:CBA', pairing: 'YZX', check: {repairs: ['X:CBA', 'X:CAB']}, prereq: 'three',
    idea: 'When every blocking pair shares a letter, that letter can put its partner first.',
    hints: ['Find every circle and square that would both rather be together.', 'A and X block, and so do B and X. Both pairs have X.', 'Put C first on X’s strip, then press Stays.'],
    parent: {notice: 'Whether your child changes X’s strip, the letter in both blocking pairs, or A’s or B’s, which stops only one.', prompt: 'Which letter is in both blocking pairs?', explanation: 'With A and Y, B and Z, C and X, X has C, its last choice, while A and B both rank X ahead of their partners. So A and X block, and B and X block. Every blocking pair contains X, so X’s strip is the one to change: put C first and X says no to both. Moving C up only one place, ahead of A, still leaves B and X. Changing A’s or B’s strip stops one blocking pair and leaves the other.', extension: 'Is C first the only way? (Yes: C must be ahead of both A and B on X’s strip.)', connection: 'One strip can repair a pairing exactly when its blocking pairs all meet at one letter; that letter then puts its partner first.'},
    provenance: 'Week 27 Grades 2–3 Problem 3’s strips with the candidate A–Y, B–Z, C–X (the guide lists only A and X blocking it; the math check adds B and X), asked as K–1 Problem 3’s repair.'},
  {number: 8, level: 'medium', title: 'Find them all', mode: 'every', market: FOUR, lists: 'A:ZXYW B:YXZW C:XYZW D:WXYZ W:DABC X:BACD Y:ACBD Z:CBAD', pairing: 'WXYZ', check: {answers: ['YXZW', 'ZXYW', 'ZYXW']}, prereq: 'four',
    idea: 'D and W rank each other first, so they stay together; the other six letters have three pairings that can stay.',
    hints: ['Who ranks each other first?', 'D and W are together in every pairing that can stay. Then look at A, B and C with X, Y and Z.', 'One pairing gives every square its first choice, one every circle, and one is in between.'],
    parent: {notice: 'Whether your child pairs D with W early, and looks for the in-between pairing after the two first-choice ones.', prompt: 'How do you know there isn’t a fourth?', explanation: 'D and W rank each other first, so if they were apart they would block: they are together in every pairing that can stay. The rest is Grades 2–3 Problem 3. A–Z, B–Y, C–X gives every circle its first choice, and A–Y, B–X, C–Z every square; both can stay. A–Z, B–X, C–Y can stay too: A has its first choice, B wants Y but Y prefers C, and C wants X but X prefers B. The other three pairings of A, B, C each have a blocking pair: A–X, B–Y, C–Z (C and Y), A–X, B–Z, C–Y (B and X) and A–Y, B–Z, C–X (A and X).', extension: 'Compare A’s partner in the three: Z, Z and Y. Does every circle move the same way from one end to the other? (Yes, from the circles’ best to the squares’ best.)', connection: 'The stable matchings of a market form a distributive lattice, with the circles’ best at one end and the squares’ best at the other.'},
    provenance: 'Week 27 Grades 2–3 Problem 3’s strips with a fourth pair, D and W, who rank each other first and are last for everyone else (the guide’s Problem 5 construction), so the search is over 24 pairings.'},
  {number: 9, level: 'hard', title: 'Everyone wants X', mode: 'every', market: FOUR, lists: 'A:XWZY B:XYWZ C:XYZW D:XYWZ W:BCDA X:DBAC Y:BCAD Z:BDAC', pairing: 'WXYZ', check: {answers: ['WYZX', 'ZYWX']}, prereq: 'four',
    idea: 'Peel off pairs that rank each other first: D and X, then B and Y; two circles and two squares are left.',
    hints: ['Every circle wants X first. Whom does X want?', 'D and X rank each other first. With them together, B and Y rank each other first too.', 'A and C with W and Z: one pairing for the circles’ first choices, one for the squares’.'],
    parent: {notice: 'Whether your child notices that X decides first, and keeps D with X while trying the rest.', prompt: 'Everyone wants X. Who gets X in every pairing that can stay, and why?', explanation: 'X ranks D first and D ranks X first, so D and X are together in every pairing that can stay. Then B ranks Y next and Y ranks B first, so B and Y are too. A and C are left with W and Z: A prefers W, C prefers Z, W prefers C and Z prefers A, opposite first choices, so both pairings stay: A–W, B–Y, C–Z, D–X and A–Z, B–Y, C–W, D–X. Every other pairing has a blocking pair. These are exactly what the Grades 4–5 asking rules give with the circles asking and with the squares asking.', extension: 'Run the asking rules of Week 27 Grades 4–5 Problem 2 with the circles asking, then the squares. Which pairing does each give?', connection: 'Deferred acceptance with the circles asking gives the circles’ best stable matching, and with the squares asking the squares’ best; here they differ.'},
    provenance: 'Week 27 Grades 4–5 Problem 2’s strips (every circle wants X), asked as “find every pairing that can stay”.'},
  {number: 10, level: 'hard', title: 'Two blocks', mode: 'every', market: FOUR, lists: 'A:WXYZ B:XWZY C:YZWX D:ZYXW W:BACD X:ABDC Y:DCAB Z:CDBA', pairing: 'YZWX', check: {answers: ['WXYZ', 'WXZY', 'XWYZ', 'XWZY']}, prereq: 'four',
    idea: 'The strips split into two blocks, A and B with W and X, and C and D with Y and Z; a pairing that crosses them can’t stay, and each block stays two ways.',
    hints: ['Which two squares do A and B put ahead of the others?', 'A and B rank W and X first, and W and X rank A and B first. C, D, Y and Z do the same.', 'Each block has two pairings that can stay: two times two.'],
    parent: {notice: 'Whether your child keeps trying pairings that cross the blocks, or notices the blocks and builds inside them.', prompt: 'Can a pairing that stays put A with Y or Z?', explanation: 'A and B rank W and X ahead of Y and Z, and W and X rank A and B ahead of C and D; C, D, Y and Z do the same with each other. If a pairing crosses the blocks, some circle and some square of one block are both paired outside it, and each prefers the other to its outside partner, so they block. So a pairing that can stay keeps both blocks. Inside each block the first choices are opposite (A–W, B–X for the circles and A–X, B–W for the squares; C–Y, D–Z and C–Z, D–Y), so each block stays two ways: four pairings, and none gives all eight letters a first choice.', extension: 'Can one pairing give all eight letters their first choice? (No: A wants W, but W wants B.)', connection: 'A market that splits into blocks has as its stable matchings the products of the blocks’ stable matchings.'},
    provenance: 'Week 27 Grades 2–3 Problem 4.'},
  {number: 11, level: 'hard', title: 'Exactly two', mode: 'every', edit: true, count: 2, goal: 'two', market: THREE, lists: 'A:XYZ B:XYZ C:XYZ X:ABC Y:ABC Z:ABC', pairing: 'ZYX', check: {answers: 2}, prereq: 'design',
    idea: 'A pair that ranks each other first is forced; with it fixed, the other two pairs can be made to stay both ways.',
    hints: ['Start from two pairs that stay both ways, as in puzzle 6.', 'Let C and Z rank each other first, so they stay together.', 'Then give A and B different first choices, and X and Y the opposite ones.'],
    parent: {notice: 'Whether your child builds from the two-pair pattern, and checks the other four pairings before pressing That’s all.', prompt: 'How do you know every other pairing fails?', explanation: 'One way, from the Week 27 guide: A: X, Y, Z; B: Y, X, Z; C: Z, X, Y; X: B, A, C; Y: A, B, C; Z: C, A, B. C and Z rank each other first, so they are together in every pairing that can stay, and any pairing that separates them is blocked by C and Z. With C and Z fixed, A and B with X and Y have opposite first choices, so A–X, B–Y and A–Y, B–X both stay. Of the 46,656 sets of three-place strips, 11,484 have exactly two pairings that can stay, 34,080 one and 1,092 three; none has more.', extension: 'Can you make three stay? (Yes, as with puzzle 8’s A, B, C, X, Y and Z; no set of three-place strips has four.)', connection: 'A market has one stable matching exactly when the circles’ best and the squares’ best agree; making two means making them differ.'},
    provenance: 'Week 27 Grades 2–3 Problem 5.'},
  {number: 12, level: 'hard', title: 'Three last choices', mode: 'last', market: THREE, lists: 'A:XYZ B:YZX C:ZXY X:ABC Y:BCA Z:CAB', pairing: 'XYZ', goal: 3, check: {most: 3}, prereq: 'design',
    idea: 'A pairing can stay with three last choices when one side has all its first choices; four is impossible.',
    hints: ['If every circle has its first choice, can any circle want to switch?', 'Keep each circle with its first choice, and move it to the end of its square’s strip.', 'X, Y and Z each put their partner last.'],
    parent: {notice: 'Whether your child tries to make everyone unhappy, and finds that two unhappy letters in different pairs block.', prompt: 'Why can’t a circle and a square in different pairs both have their last choice?', explanation: 'Give every circle its first choice and put each circle last on its partner’s strip, for example A: X, Y, Z; B: Y, X, Z; C: Z, X, Y with A–X, B–Y, C–Z, and X: B, C, A; Y: A, C, B; Z: A, B, C. No circle wants to switch, so nothing blocks, and X, Y and Z all get their last choice. Four is impossible: four letters with their last choice include a circle and a square that are not partners, each would rather have anyone else, so they would block. The validator checks all 46,656 sets of strips: the most is three.', extension: 'With four pairs, what is the most? (Four: give one side its first choices and put each partner last.)', connection: 'Stability limits how unhappy both sides can be at once: with n pairs (n at least 2) at most n letters get their last choice.'},
    provenance: 'Week 27 Grades 4–5 Problem 6.'}
];

const id = n => `matching-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  const q = {mode: item.mode, ...item.market, lists: strips(item.lists), pairing: item.pairing, ...(item.edit ? {edit: true, count: item.count} : {}), ...(item.goal === 3 ? {goal: 3} : {})};
  const L = q.lists, k = q.pairing, tag = id(item.number);
  let solution;
  if (item.mode === 'check') {
    assert.deepEqual(blockersOf(q, L, k), item.check.blockers, `${tag}: blocking pairs`);
    solution = item.check.blockers.length ? {blockers: item.check.blockers} : {stays: true};
  } else if (item.mode === 'repair') {
    const repairs = repairsOf(q, L, k).map(r => `${r.owner}:${r.order}`);
    assert.deepEqual(repairs, item.check.repairs, `${tag}: repairs`);
    assert.ok(!canStay(q, L, k), `${tag}: the drawn pairing can’t stay`);
    if (!repairs.length) assert.deepEqual(disjointBlockers(q, L, k), item.check.cant, `${tag}: the certificate`);
    solution = repairs.length ? {repairs, blockers: blockersOf(q, L, k)} : {cant: disjointBlockers(q, L, k), blockers: blockersOf(q, L, k)};
  } else if (item.mode === 'every' && !item.edit) {
    assert.deepEqual(stableOf(q, L), item.check.answers, `${tag}: pairings that can stay`);
    assert.ok(!canStay(q, L, k), `${tag}: the starting pairing can’t stay`);
    solution = {stable: stableOf(q, L)};
  } else if (item.mode === 'every') {
    assert.notEqual(stableOf(q, L).length, item.count, `${tag}: the starting strips don’t already do it`);
    const witness = profilesOf(q).filter(M => stableOf(q, M).length === item.count);
    solution = {count: item.count, profiles: witness.length, example: item.goal === 'two' ? strips('A:XYZ B:YXZ C:ZXY X:BAC Y:ABC Z:CAB') : witness[0]};
    assert.equal(stableOf(q, solution.example).length, item.count, `${tag}: the example works`);
    if (item.goal === 'both') assert.equal(witness.length, 2, `${tag}: two of sixteen`);
    if (item.goal === 'two') assert.equal(witness.length, 11484, `${tag}: 11,484 of 46,656`);
  } else {
    assert.equal(lastOnes(q, L, k).length, 0, `${tag}: no last choices to start`);
    const example = {lists: strips('A:XYZ B:YXZ C:ZXY X:BCA Y:ACB Z:ABC'), pairing: 'XYZ'};
    assert.ok(canStay(q, example.lists, example.pairing) && lastOnes(q, example.lists, example.pairing).length === 3, `${tag}: the example works`);
    solution = {most: 3, example};
  }
  const kind = item.goal === 'both' || item.goal === 'two' ? item.goal : item.mode;
  const controls = item.mode === 'every' ? `${CONTROLS.every}${item.edit ? ` ${CONTROLS.edit}` : ''}` : CONTROLS[item.mode];
  const rules = [...RULES, item.mode === 'every' ? MORE.every : MORE[item.mode], ...(item.edit ? [MORE.design] : [])];
  return {
    id: tag, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Pairs that stay', mechanic: 'matching', band: 'all', revision: 1, sourceDocument: 'docs/matching/README.md',
    parameters: q,
    objective: OBJECTIVE[kind], visibleObjective: VISIBLE[kind], instruction: OBJECTIVE[kind],
    controls, rules, idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const markets = {
  2: {...TWO, lists: strips('A:XY B:YX X:BA Y:AB'), pairing: 'XY'},
  3: {...THREE, lists: strips('A:ZXY B:YXZ C:XYZ X:BAC Y:ACB Z:CBA'), pairing: 'XYZ'},
  4: {...FOUR, lists: strips('A:WXYZ B:XWZY C:YZWX D:ZYXW W:BACD X:ABDC Y:DCAB Z:CDBA'), pairing: 'YZWX'}
};
const playground = {
  id: 'matching-playground', number: 0, title: 'Pairs that stay playground', difficulty_level: 'playground', familyTitle: 'Pairs that stay', mechanic: 'matching', band: 'playground', revision: 1, sourceDocument: 'docs/matching/README.md',
  parameters: {mode: 'playground', start: 3, markets},
  objective: 'Change strips and pairings freely, and keep the pairings that can stay.', visibleObjective: '',
  instruction: 'Change strips and pairings freely, and keep the pairings that can stay.',
  controls: `Choose two, three or four pairs. ${CONTROLS.every} ${CONTROLS.edit}`,
  rules: [...RULES, 'Stays keeps a pairing that can stay; if it can’t, tap a circle and a square that block it. Changing a strip clears the pairings kept.'],
  idea: 'Free play: set strips for a partner and challenge them to find every pairing that can stay.',
  prerequisites: 'None. A grown-up or a partner can set the strips as a challenge.',
  hints: ['Set strips for someone else, then find every pairing that can stay.', 'Two letters that rank each other first are always together.', 'Give each circle a different first choice, and put it last on that square’s strip.'],
  parent: {notice: 'Whether your child can set strips with a plan, such as two pairings that stay, and check them.', prompt: 'Can you make strips where no pairing can stay?', explanation: 'No: Gale and Shapley proved that with equal sides and complete strips with no ties, some pairing can always stay. The asking rules of Week 27 Grades 4–5 Problem 2 find one in at most n × n requests.', extension: 'With three pairs, can four pairings stay? (No: three is the most.)', connection: 'The existence theorem for stable matchings (Gale and Shapley, 1962).', sourceIds: sources},
  provenance: 'Week 27’s strips: the two-pair market of K–1 Problem 2 (top), the three-pair market of Grades 2–3 Problem 3 and the four-pair market of Grades 2–3 Problem 4.'
};
for (const [n, m] of Object.entries(markets)) assert.ok(stableOf(m, m.lists).length >= 1, `playground ${n}`);

const json = {
  title: 'Pairs that stay',
  version: 1,
  families: [{id: 'matching', title: 'Pairs that stay', mathematics: 'Circles and squares each rank every letter on the other side, with no ties. A circle and a square that are not together block a pairing when each would rather have the other than its own partner; a pairing with no blocking pair can stay (it is stable). Gale and Shapley proved one always exists for equal sides, by deferred acceptance in at most n² requests. There can be several, and none need give everyone a first choice. Two letters that rank each other first are together in every pairing that can stay. One strip can be rewritten to make a pairing stay exactly when all its blocking pairs share a letter; two with no letter in common prove it can’t. In a three-pair pairing that can stay, at most three letters get their last choice. The puzzles ask a child to name a blocking pair, find every pairing that can stay, repair one strip, and design strips, and they check each claim only when it is made.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'matching-week27', title: 'Bellingham Math Circle — Week 27: Stable pairings and deferred acceptance (student packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-27', kind: 'local curriculum'},
    {id: 'matching-card27', title: 'Week 27 review card and math check (blocking pairs, repairs, block markets, last choices; fix 2’s launch profile; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-27.md', kind: 'local curriculum'},
    {id: 'matching-gs', title: 'David Gale and Lloyd Shapley — College Admissions and the Stability of Marriage, American Mathematical Monthly 69 (1962), 9–15', url: 'https://www.jstor.org/stable/2312726', kind: 'research'},
    {id: 'matching-pass', title: 'Rafael Pass and Joseph Y. Halpern — A Course in Networks and Markets, Chapter 14 (stable matching, deferred acceptance, proposer optimality)', url: 'https://www.cs.cornell.edu/~rafael/networks-html/chapter14.html', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/matching/matching.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode}${p.parameters.edit ? ' (strips)' : ''} ${JSON.stringify(p.solution).slice(0, 90)}`).join('\n'));
