// Authoring list for Prime bags (worksheet Week 96, prime bags and divisor
// builders). Computes each puzzle's answers with the mechanic's own helpers
// (every value a bag makes, every first split of a card and the bag its
// routes finish in, the bags that make a goal's count and the smallest),
// checks them against the table in docs/primes/README.md, and writes
// dist/families/primes/primes.json. Run: node scripts/build-primes.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {subBags, valueOf, countOf, firstSplits, finishedBag, allBags, leastBag, KEYS, LIMIT} from '../dist/families/primes/primes.js';

const RULES = [
  'A card splits into two whole numbers greater than 1 that multiply to it. A number that cannot split is prime; it becomes a round token.',
  'Choose some tokens from a bag, each at most once. They multiply to a value; choosing none makes 1.',
  'Tokens with the same number are the same: choosing a different one of them makes the same value.'
];
const SPLIT_RULE = 'That’s all says whether a first split is missing.';
const ALL_RULE = 'That’s all says whether a value is missing.';
const DESIGN_RULE = 'Kept values stay while the bag can still make them.';
const CONTROLS = {
  every: 'Tap tokens to choose them; Keep puts their value in the tray. Press That’s all when every value is kept. Undo takes back the last move.',
  split: 'The chosen card is ringed; tap another card to choose it. Tap a key to split the card: 4 splits 20 into 4 × 5. New run starts the card again. Press That’s all when every first split is on the shelf. Undo takes back the last move.',
  design: 'Tap 2, 3, 5 or 7 to put a token in the bag, and − under it to take one out. Tap tokens in the bag to choose them; Keep puts their value in the tray. Press That’s all when every value is kept. Undo takes back the last move.',
  playground: 'Tap 2, 3, 5 or 7 to put a token in the bag, and − under it to take one out. Tap tokens in the bag to choose them; Keep puts their value in the tray.'
};
const PREREQ = {
  k1: 'Read numbers to 10 and tap; the app multiplies. No reading needed once a grown-up has read the goal line.',
  small: 'Read numbers to 30; the app multiplies. Knowing which numbers divide the bag’s value helps to check the tray.',
  split: 'Multiplication facts to 10 × 10, or trying keys one at a time (a wrong key is refused). Equal rows of counters help.',
  design: 'Multiplication with the app’s help, and planning a bag from earlier puzzles, perhaps by trying and adjusting.',
  upper: 'Fluent multiplication and an organized list of 9 to 12 values; counting choices for each number of the bag shortens the work.',
  least: 'Fluent multiplication; comparing bags that make the same count, and the idea that a count of values comes from how many copies of each prime the bag has.'
};
const sources = ['primes-week96', 'primes-card96', 'primes-conrad'];
const bag = list => [2, 3, 5, 7].map(x => list.filter(y => y === x).length);

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two tokens', mode: 'every', bag: bag([2, 3]), check: {values: [1, 2, 3, 6]}, prereq: 'k1',
    idea: 'Choosing none makes 1 and choosing all makes the bag’s value; each token is in or out, so two different tokens make four values.',
    hints: ['Tap tokens to choose them, then Keep the value.', 'What value do you make if you choose no tokens at all?', 'Each token is chosen or not. Try every way.'],
    parent: {notice: 'Whether your child keeps 1 (nothing chosen) and 6 (everything chosen) without being told.', prompt: 'Why does choosing nothing make 1?', explanation: 'The values are 1, 2, 3 and 6: each token is in or out, 2 × 2 = 4 ways, and each makes a different value. They are exactly the numbers that divide 6, because the tokens left behind always multiply to 6 divided by the value chosen. Choosing nothing makes 1, the number that changes nothing when you multiply by it.', extension: 'Which numbers divide 6 with nothing left over? Compare them with the tray.', connection: 'The values of a bag are the divisors of its value; the empty product is 1.'},
    provenance: 'New instance, after the choosing rules and worked example shared by both Week 96 packets (the 2, 2, 5 bag, choosing 2 and 5 to make 10).'},
  {number: 2, level: 'easy', title: 'Three twos', mode: 'every', bag: bag([2, 2, 2]), check: {values: [1, 2, 4, 8]}, prereq: 'k1',
    idea: 'Tokens with the same number are the same: only how many 2s you choose matters, so three 2s make four values, not eight.',
    hints: ['Choose some 2s and Keep the value.', 'Does choosing a different 2 make a different value?', 'You can choose no 2s, one, two or three.'],
    parent: {notice: 'Whether your child expects another 2 to make a new value, and what they say when Keep stays off and the tray rings the value they already have.', prompt: 'Puzzle 1 had two tokens and this bag has three. Why do they make the same number of values?', explanation: '1, 2, 4 and 8. Choosing the first 2 or the third makes the same value, so what counts is how many 2s: none, one, two or three, four values. Three different tokens (puzzle 7) make eight.', extension: 'How many values would five 2s make? (Six: 1, 2, 4, 8, 16, 32.)', connection: 'A prime power pᵉ has e + 1 divisors: 1, p, …, pᵉ.'},
    provenance: 'New instance: the Week 96 guide’s check that five 2s make six values, not five or 2⁵ (grades 4–5 Problem 4), on three 2s; the packets’ rule that tokens with the same number are the same.'},
  {number: 3, level: 'easy', title: 'Split 12', mode: 'split', card: 12, check: {splits: [[2, 6], [3, 4]], bag: [2, 2, 3]}, prereq: 'split',
    idea: 'Different first splits of 12 finish in the same bag of primes.',
    hints: ['Tap a key that makes 12 when you multiply it by something. Keep splitting until every card is a round token.', '12 is 2 rows of 6. Is it some other number of equal rows too?', 'Press New run and try a different key first.'],
    parent: {notice: 'Whether your child is surprised that the second route ends in the same tokens.', prompt: 'Could a different start ever end with different tokens?', explanation: '12 splits first as 2 × 6 or 3 × 4 (6 × 2 and 4 × 3 are the same splits). Then 6 becomes 2 × 3, or 4 becomes 2 × 2, and both routes finish with 2, 2, 3. Every route of every number finishes in one bag: unique factorization. Two routes are evidence, not proof; the proof through the fact that a prime dividing a product divides one of its factors is on p. 6 of the Week 96 guide.', extension: 'Make 12 counters into rectangles: 2 rows of 6 and 3 rows of 4 are the first splits.', connection: 'Unique factorization of whole numbers (the fundamental theorem of arithmetic).'},
    provenance: 'Week 96 grades 2–3 Problem 1 (card 12, two splitting routes), as a find-every: every first split.'},
  {number: 4, level: 'easy', title: 'The bag of 12', mode: 'every', bag: bag([2, 2, 3]), check: {values: [1, 2, 3, 4, 6, 12]}, prereq: 'small',
    idea: 'The values of the bag that 12 splits into are the numbers that divide 12.',
    hints: ['Keep a value, then change one token and keep the next.', 'Choose the 3 or leave it out; with each, choose no 2s, one or two.', 'Did you keep 1 and 12?'],
    parent: {notice: 'Whether your child works in an order (everything with the 3, everything without) or at random.', prompt: 'Is every number that divides 12 in your tray?', explanation: '1, 2, 3, 4, 6 and 12, every divisor of 12. Without the 3 there are 1, 2 and 4; with it, 3, 6 and 12: no, one or two 2s each time, 3 × 2 = 6. A value chosen and the tokens left behind multiply to 12, so every value divides 12, and every divisor of 12 has its own tokens in the bag.', extension: 'Pair each value with the tokens left behind: 1 with 12, 2 with 6, 3 with 4.', connection: 'The divisors of a number are the sub-bags of its prime factorization.'},
    provenance: 'Week 96 grades 2–3 Problem 2 (the 2, 2, 3 bag, value 12).'},
  {number: 5, level: 'medium', title: 'The bag of 18', mode: 'every', bag: bag([2, 3, 3]), check: {values: [1, 2, 3, 6, 9, 18]}, prereq: 'small',
    idea: 'Two of one prime and one of another, like 12’s bag, make the same number of values, whichever primes they are.',
    hints: ['Keep the values you can make, one at a time.', 'Choose the 2 or leave it out; with each, choose no 3s, one or two.', 'Did you keep 9?'],
    parent: {notice: 'Whether your child predicts the tray will be as long as puzzle 4’s, and checks.', prompt: 'What do 12’s bag and 18’s bag have in common?', explanation: '1, 2, 3, 6, 9 and 18. Like 12’s bag it has two copies of one prime and one of another, so it makes 3 × 2 = 6 values: the count depends on how many copies, not on which primes.', extension: 'Find a bag with a 5 that makes six values. (5, 5, 2, value 50, is one.)', connection: 'The number of divisors depends only on the exponents of the prime factorization.'},
    provenance: 'Week 96 grades 2–3 Problem 2 (the 2, 3, 3 bag, value 18).'},
  {number: 6, level: 'medium', title: 'Four tokens', mode: 'every', bag: bag([2, 2, 2, 3]), check: {values: [1, 2, 3, 4, 6, 8, 12, 24]}, prereq: 'small',
    idea: 'With repeated 2s, four tokens make eight values.',
    hints: ['Keep a value, then change one token.', 'Choose the 3 or leave it out; with each, choose no 2s up to three 2s.', 'Did you keep 8 and 24?'],
    parent: {notice: 'Whether your child organizes the tray by the 3 (with it, without it).', prompt: 'How do you know none is missing?', explanation: '1, 2, 3, 4, 6, 8, 12 and 24: no 2s, one, two or three, with or without the 3, 4 × 2 = 8 values, every divisor of 24.', extension: 'Puzzle 7 has one token fewer. Will it make fewer values?', connection: 'Divisors of 2³ · 3: one choice of exponent for each prime.'},
    provenance: 'Week 96 grades 2–3 Problem 3 and grades 4–5 Problem 2 (the 2, 2, 2, 3 bag, value 24).'},
  {number: 7, level: 'medium', title: 'Three different tokens', mode: 'every', bag: bag([2, 3, 5]), check: {values: [1, 2, 3, 5, 6, 10, 15, 30]}, prereq: 'small',
    idea: 'Three different tokens make as many values as puzzle 6’s four: more tokens need not mean more values.',
    hints: ['Keep a value, then change one token.', 'Each of the three tokens is chosen or not.', 'Did you keep 15?'],
    parent: {notice: 'Whether your child expected fewer values than puzzle 6’s bag, and what they say when the trays are the same length.', prompt: 'Does the bag with more tokens make more values?', explanation: '1, 2, 3, 5, 6, 10, 15 and 30: each token in or out, 2 × 2 × 2 = 8, the same as 24’s four tokens. Repeated tokens give fewer choices than different ones.', extension: 'Find a bag with four tokens that makes more than eight values. (2, 2, 3, 5 makes twelve: puzzle 11.)', connection: 'Squarefree numbers with k primes have 2ᵏ divisors, the subsets of their primes (Week 19’s subset cards).'},
    provenance: 'Week 96 grades 2–3 Problem 3 (does the bag with more tokens make more values?) and grades 4–5 Problem 2 (the 2, 3, 5 bag, value 30).'},
  {number: 8, level: 'medium', title: 'Split 36', mode: 'split', card: 36, check: {splits: [[2, 18], [3, 12], [4, 9], [6, 6]], bag: [2, 2, 3, 3]}, prereq: 'split',
    idea: '36 starts four ways, and every way finishes with two 2s and two 3s.',
    hints: ['Split 36, keep splitting until every card is a round token, then press New run and start another way.', 'Which keys make 36 when multiplied by something?', 'One split of 36 uses the same number twice.'],
    parent: {notice: 'Whether your child finds 6 × 6, and whether they keep splitting to the end each run.', prompt: 'Why does every route end with the same four tokens?', explanation: '2 × 18, 3 × 12, 4 × 9 and 6 × 6 (9 × 4 is 4 × 9 again). Every route finishes with 2, 2, 3, 3. With 1 × 36, the splits pair up the divisors of 36: 1 with 36, 2 with 18, 3 with 12, 4 with 9, and 6 with itself, which is why 36 has an odd number of divisors.', extension: 'Count the values of the bag 2, 2, 3, 3 (puzzle 10). How do they match these splits?', connection: 'A first split is a divisor d with d ≤ n ÷ d; a square has one split of a number by itself.'},
    provenance: 'Week 96 Problem 1 (card 36, in both packets), as a find-every: every first split.'},
  {number: 9, level: 'medium', title: 'Exactly six', mode: 'design', goal: 6, least: false, check: {bags: 16}, prereq: 'design',
    idea: 'A bag’s count of values comes from how many copies of each prime it has: two of one and one of another make six.',
    hints: ['Put tokens in the bag, keep every value it makes, and press That’s all.', 'Puzzles 4 and 5 had bags that made this many values.', 'Try two of one number and one of another.'],
    parent: {notice: 'Whether your child reuses a bag from puzzle 4 or 5, or builds and tests new ones.', prompt: 'Which other bags make six values?', explanation: 'Two copies of one prime and one of another make 3 × 2 = 6 values (12, 18, 20, 28, 45, 50, …), and so do five copies of one prime (32 = 2 × 2 × 2 × 2 × 2). No other bag does, because 6 is only 3 × 2 or 6. Any of these 16 bags solves it.', extension: 'What is the smallest bag that makes six values? (12.)', connection: 'τ(n) = 6 exactly for n = p²q or p⁵.'},
    provenance: 'Week 96 grades 2–3 Problem 4 (build a bag that makes exactly 4, 6 and 8 values), the six.'},
  {number: 10, level: 'hard', title: 'Two 2s and two 3s', mode: 'every', bag: bag([2, 2, 3, 3]), check: {values: [1, 2, 3, 4, 6, 9, 12, 18, 36]}, prereq: 'upper',
    idea: 'No 2s to two 2s, times no 3s to two 3s: nine values.',
    hints: ['Keep a value, then change one token.', 'Fix how many 3s you choose, and choose every number of 2s with it.', 'Did you keep 9 and 18?'],
    parent: {notice: 'Whether your child organizes by one prime, or finds the count before the last values.', prompt: 'How many values will there be, before you finish?', explanation: '1, 2, 3, 4, 6, 9, 12, 18 and 36: three choices for the 2s and three for the 3s, 3 × 3 = 9. The odd count goes with the 6 × 6 split of puzzle 8.', extension: 'Seven 2s and four 3s: how many values, without listing? (8 × 5 = 40.)', connection: 'τ(p₁^e₁ ⋯ p_r^e_r) = (e₁ + 1) ⋯ (e_r + 1).'},
    provenance: 'Week 96 grades 4–5 Problem 3 (36, counted without listing), here as a collection; Problem 4’s forty in the extension.'},
  {number: 11, level: 'hard', title: 'Four tokens again', mode: 'every', bag: bag([2, 2, 3, 5]), check: {values: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60]}, prereq: 'upper',
    idea: 'Four tokens like puzzle 10’s, but with three different numbers: twelve values.',
    hints: ['Keep a value, then change one token.', 'Fix the 3 and the 5 (in or out), and choose every number of 2s with them.', 'Did you keep 20 and 30?'],
    parent: {notice: 'Whether your child expects nine values, like puzzle 10’s four tokens.', prompt: 'Both bags have four tokens. Why does this one make more?', explanation: '1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30 and 60: three choices for the 2s, two for the 3 and two for the 5, 3 × 2 × 2 = 12. Puzzle 10’s four tokens make 3 × 3 = 9.', extension: 'Find a bag with five tokens that also makes twelve values. (2, 2, 2, 3, 3, value 72.)', connection: 'Equal numbers of prime factors, different divisor counts: 36 and 60 (and 60 and 72 tie with four and five tokens).'},
    provenance: 'Week 96 grades 4–5 Problem 3 (36, 60 and 72), here as a collection.'},
  {number: 12, level: 'hard', title: 'Split 60', mode: 'split', card: 60, check: {splits: [[2, 30], [3, 20], [4, 15], [5, 12], [6, 10]], bag: [2, 2, 3, 5]}, prereq: 'split',
    idea: 'Five first splits, many routes after them, and one bag at the end.',
    hints: ['Split 60 to the end, then press New run and start another way.', 'Which of the keys 2 to 9 divide 60?', 'Count up from 2: which keys make a split?'],
    parent: {notice: 'Whether your child tries the keys in order, and whether the repeated bag stops surprising them.', prompt: 'How do you know you have every first split?', explanation: '2 × 30, 3 × 20, 4 × 15, 5 × 12 and 6 × 10: the keys that divide 60 are 2, 3, 4, 5 and 6, and every split has a part of 7 or less because 8 × 8 is more than 60. Every route finishes with 2, 2, 3, 5.', extension: 'Pair the values of the bag 2, 2, 3, 5 (puzzle 11) the way the splits do: 1 with 60, 2 with 30, and so on. How many pairs? (Six: the five splits and 1 × 60.)', connection: 'Divisor pairs d · (n ÷ d) with d < √n: a non-square n has τ(n) ÷ 2 of them, one of them 1 × n.'},
    provenance: 'Week 96 grades 4–5 Problem 1 (cards 36, 48 and 60), as a find-every on 60.'},
  {number: 13, level: 'hard', title: 'Smallest with eight', mode: 'design', goal: 8, least: true, check: {least: 24}, prereq: 'least',
    idea: 'Put the extra copies on the smallest prime: three 2s and a 3 (24) beat 2, 3, 5 (30).',
    hints: ['Build a bag that makes exactly eight values, keep them all, and press That’s all.', 'Puzzles 6 and 7 both made eight values. Which bag was smaller?', 'Three copies of one prime and one of another make eight too.'],
    parent: {notice: 'Whether your child compares 24 and 30 from puzzles 6 and 7, or builds from scratch.', prompt: 'How do you know no smaller bag makes eight values?', explanation: 'Eight values come from three different primes (2 × 2 × 2), three of one prime and one of another (4 × 2), or seven of one (8). The smallest bag of each kind is 2 · 3 · 5 = 30, 2 · 2 · 2 · 3 = 24 and 2⁷ = 128, so 24. Checking every number below 24 confirms it.', extension: 'Why is 2, 2, 2, 3 (24) smaller than 2, 3, 3, 3 (54)? Swap the extra copies onto the smaller prime.', connection: 'The least number with a given divisor count uses the smallest primes with exponents in decreasing order.'},
    provenance: 'Week 96 grades 2–3 Problem 4 (the eight, how small) and grades 4–5 Problem 6 (the least number with 8 divisors).'},
  {number: 14, level: 'hard', title: 'Smallest with twelve', mode: 'design', goal: 12, least: true, check: {least: 60}, prereq: 'least',
    idea: 'Twelve is 3 × 2 × 2, 4 × 3, 6 × 2 or 12: compare the smallest bag of each pattern.',
    hints: ['Build a bag that makes exactly twelve values, keep them all, and press That’s all.', 'Puzzle 11’s bag made twelve values. Is there a smaller one?', 'Twelve is 3 × 2 × 2: two of one prime, one each of two others.'],
    parent: {notice: 'Whether your child tries 72 (puzzle 11’s extension) before 60, and why they move on.', prompt: 'Why can’t a bag smaller than 60 make twelve values?', explanation: 'The patterns are two copies of one prime and one each of two others (smallest 2 · 2 · 3 · 5 = 60), three and two (2 · 2 · 2 · 3 · 3 = 72), five and one (2⁵ · 3 = 96), and eleven of one (2¹¹, more tokens than the bag holds). So 60, and every number below 60 has a different count.', extension: 'Find the smallest bags with nine and ten values. (36 and 48.)', connection: 'Highly composite numbers: 60 has more divisors than any smaller number.'},
    provenance: 'Week 96 grades 4–5 Problems 5 and 6 (every pattern for 12 divisors; the least number with 12).'}
];

const id = n => `primes-${String(n).padStart(2, '0')}`;
const VISIBLE = {every: 'Keep every value the bag can make.', split: 'Start the split every way you can, and split to the end each time.'};
const FULL = {
  every: 'Choose tokens from the bag to make values, and keep each different value. Press That’s all when none is left.',
  split: 'Split the card into two numbers that multiply to it, and keep splitting until every card is prime. Start a different way each run. Press That’s all when every first split is on the shelf.'
};
const design = item => item.least ? `Build the smallest bag that makes exactly ${item.goal} values, and keep them all.` : `Build a bag that makes exactly ${item.goal} values, and keep them all.`;
const designFull = item => `${item.least ? `Build the smallest bag that makes exactly ${item.goal} values.` : `Put tokens in the bag so it makes exactly ${item.goal} values.`} Keep every value it makes, then press That’s all.`;

const out = PUZZLES.map(item => {
  let q, solution;
  if (item.mode === 'every') {
    q = {mode: 'every', bag: item.bag};
    const values = subBags(item.bag).map(valueOf);
    assert.deepEqual(values, item.check.values, `${id(item.number)}: values`);
    assert.equal(countOf(item.bag), values.length);
    solution = {values, count: values.length};
  } else if (item.mode === 'split') {
    q = {mode: 'split', card: item.card};
    const splits = firstSplits(item.card);
    assert.deepEqual(splits, item.check.splits, `${id(item.number)}: first splits`);
    assert.ok(splits.every(([a]) => KEYS.includes(a)), `${id(item.number)}: every first split starts with a key`);
    assert.deepEqual(finishedBag(item.card), item.check.bag, `${id(item.number)}: the bag`);
    solution = {splits, count: splits.length, bag: finishedBag(item.card)};
  } else {
    q = {mode: 'design', goal: item.goal, least: item.least};
    const hits = allBags().filter(c => countOf(c) === item.goal);
    const least = leastBag(item.goal);
    if (item.check.bags !== undefined) assert.equal(hits.length, item.check.bags, `${id(item.number)}: bags with the count`);
    if (item.check.least !== undefined) assert.equal(valueOf(least), item.check.least, `${id(item.number)}: the smallest`);
    assert.equal(hits.filter(c => valueOf(c) === valueOf(least)).length, 1, `${id(item.number)}: one smallest bag`);
    solution = {bags: hits.length, least, leastValue: valueOf(least), witness: item.least ? least : hits.sort((x, y) => valueOf(x) - valueOf(y))[0]};
  }
  const kind = item.mode;
  const objective = kind === 'design' ? designFull(item) : FULL[kind];
  const rules = [...RULES, kind === 'split' ? SPLIT_RULE : ALL_RULE, ...(kind === 'design' ? [DESIGN_RULE] : [])];
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Prime bags', mechanic: 'primes', band: 'all', revision: 1, sourceDocument: 'docs/primes/README.md',
    parameters: q, objective, visibleObjective: kind === 'design' ? design(item) : VISIBLE[kind], instruction: objective, controls: CONTROLS[kind], rules,
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.deepEqual(out.map(p => p.difficulty_level), [...Array(4).fill('easy'), ...Array(5).fill('medium'), ...Array(5).fill('hard')]);

const playground = {
  id: 'primes-playground', number: 0, title: 'Prime bags playground', difficulty_level: 'playground', familyTitle: 'Prime bags', mechanic: 'primes', band: 'playground', revision: 1, sourceDocument: 'docs/primes/README.md',
  parameters: {mode: 'playground'},
  objective: 'Build any bag, choose tokens and keep the values they make.', visibleObjective: '',
  instruction: 'Build any bag, choose tokens and keep the values they make.',
  controls: CONTROLS.playground, rules: [...RULES, DESIGN_RULE],
  idea: 'Free play with bags: add and take out tokens, and see which kept values stay.',
  prerequisites: 'None; the app multiplies. A grown-up can set a challenge: a bag that makes exactly ten values.',
  hints: ['Build a bag and keep its values.', 'Add a token: do the values you kept stay?', 'Take a token out: which kept values go?'],
  parent: {notice: 'Whether your child notices that adding a token keeps every value and adds new ones.', prompt: 'When you add a 3, which new values can you make?', explanation: `Adding a token keeps every value the bag could already make, and the new values are old values times the new token. Taking a token out removes the values that needed it. The bag holds at most ${LIMIT} tokens.`, extension: 'Build the smallest bags that make nine and ten values. (36 and 48.)', connection: 'The divisors of n · p contain the divisors of n, and the new ones are p times divisors of n with one more copy of p.', sourceIds: sources},
  provenance: 'New, from the Week 96 prime tokens 2, 3, 5 and 7 (the guide’s kit).'
};

const json = {
  title: 'Prime bags',
  version: 1,
  families: [{id: 'primes', title: 'Prime bags', mathematics: 'A number card splits into two whole numbers greater than 1 that multiply to it, until every card is prime; every route of a number ends in the same bag of primes (unique factorization). Choosing some tokens of a bag makes a value, and the values are exactly the divisors of the bag’s value, because the tokens left behind make the quotient and tokens with the same number are the same; a bag with e₁, …, e_r copies of its primes makes (e₁ + 1)⋯(e_r + 1) values. The least number with a given count of divisors puts the largest counts on the smallest primes: 6, 12, 24, 36, 48, 60 for 4, 6, 8, 9, 10, 12. The puzzles ask for every first split of a card, every value of a bag, and a bag with exactly k values, then the smallest one.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'primes-week96', title: 'Bellingham Math Circle — Week 96: Prime bags and divisor builders (grades 2–3 and 4–5 packets, adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-96', kind: 'local curriculum'},
    {id: 'primes-card96', title: 'Week 96 review card (App fit: split by entering a factor, collect every value with That’s all and no count, build a bag with exactly k values, then the smallest)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-96.md', kind: 'local curriculum'},
    {id: 'primes-conrad', title: 'Keith Conrad — Unique Factorization in Z and F[T], Theorems 1.1, 2.1, 2.3 and Lemma 2.2, as the Week 96 guide cites', url: 'https://kconrad.math.uconn.edu/blurbs/ugradnumthy/uniquefactnZF%5BT%5D.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/primes/primes.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode}: ${p.parameters.mode === 'design' ? `${p.solution.bags} bags, least ${p.solution.leastValue}` : `${p.solution.count} answers`}`).join('\n'));
