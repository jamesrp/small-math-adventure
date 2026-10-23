// Authoring list for Catch and mark (worksheet Week 95, Count the unseen).
// Computes each puzzle's answer with the mechanic's own helpers (the overlap
// range, the bags that fit a record, every second catch and its dots),
// checks them against the table in docs/catches/README.md, and writes
// dist/families/catches/catches.json. Run: node scripts/build-catches.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {lowest, highest, overlapsOf, fits, smallestBag, subsets, keyOf, choose} from '../dist/families/catches/catches.js';

const RULES = [
  'The bag holds lettered tiles.',
  'Tap tiles to make the first catch. Its tiles get a dot: they are marked, and they stay in the bag.',
  'When the first catch is full, tap tiles to make the second catch. Dotted tiles can be caught again.',
  'Tap a tile in a catch to take it out.'
];
const MODE_RULES = {
  arrange: 'Make the second catch match the goal: the same number of dotted tiles. If no second catch can, make the one that comes closest and press Can’t.',
  every: 'Each time both catches are full, the number of dots in the second catch is kept. That’s all says whether one is missing.',
  sizes: 'Choose a bag and make catches that match the goal in it. Each bag where it works gets a tick. That’s all says whether one is missing.',
  sort: 'The dotted tiles are the first catch, already made. Each second catch you make is kept, sorted by its dots. That’s all says whether one is missing.'
};
const CONTROLS = {
  arrange: 'Tap a tile to put it in the catch being filled; tap it again, or tap it in its catch, to take it out. Can’t says no second catch can match the goal. Undo takes back the last move.',
  every: 'Tap a tile to put it in the catch being filled; tap it again, or tap it in its catch, to take it out. Undo takes back the last move.',
  sizes: 'Tap a bag to choose it. Tap a tile to put it in the catch being filled; tap it again, or tap it in its catch, to take it out. Undo takes back the last move.',
  sort: 'Tap a tile to put it in the second catch; tap it again to take it out. Undo takes back the last move.',
  playground: 'Use − and + to change the bag and the catches. Catch makes one random first and second catch and adds it to a pile by its dots; Catch 10 makes ten. Clear empties the piles.'
};
const VISIBLE = {arrange: '', every: 'Find every number of dots the second catch can hold.', sizes: 'Find every bag that can make the goal.', sort: 'Find every second catch.'};
const FULL = {
  arrange: 'Make a first catch and a second catch so the second catch has as many dotted tiles as the goal. If no second catch can, make the closest one and press Can’t.',
  every: 'Find every number of dotted tiles the second catch can hold in this bag. Press That’s all when none is left.',
  sizes: 'Find every bag in which catches of these sizes can match the goal. Press That’s all when none is left.',
  sort: 'The dotted tiles are the first catch. Find every second catch, each sorted by its dots. Press That’s all when none is left.'
};
const PREREQ = {
  k1: 'Count to 6 and match a picture of dotted and plain squares. No reading; a grown-up can read How to play.',
  cant: 'Count to 5 and say why something can’t be done. A grown-up can read How to play.',
  every: 'Count to 9 and keep track of which numbers of dots have turned up. A grown-up can read the goal line.',
  sizes: 'Count to 20 and compare the number of different tiles caught with the size of the bag. A grown-up can read the goal line.',
  sort: 'Count to 20 and list catches in an order, so none is missed or repeated. A grown-up can read the goal line.',
  bound: 'Count to 10 and reason about how many plain tiles there are.'
};
const sources = ['catches-week95', 'catches-card95', 'catches-mcclintock'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Catch a dot', q: {mode: 'arrange', bag: 6, m: 2, n: 3, goal: 1}, prereq: 'k1',
    idea: 'A marked tile can be caught again: the dotted tiles in the second catch are what the two catches share.',
    hints: ['Fill the first catch, then the second. Compare the second catch with the goal.', 'Which tiles in the bag have dots?', 'Put one dotted tile and two plain tiles in the second catch.'],
    parent: {notice: 'Whether your child sees that a dotted tile can be caught again, and that the goal counts only the dotted tiles in the second catch.', prompt: 'How many different tiles have you caught in all?', explanation: 'The first catch marks 2 of the 6 tiles. A second catch of 3 must hold exactly 1 of them and 2 of the 4 plain tiles. Whatever the first catch, 2 × 6 = 12 of the 20 possible second catches work, so careful tries succeed quickly. The two catches show 2 + 3 − 1 = 4 different tiles.', extension: 'Can the second catch have no dots? Can it have three? (Yes: there are four plain tiles. No: only two tiles have dots.)', connection: 'This is the mark–recapture set-up: mark a first catch, put it back, and count the marked ones in a second catch.'},
    provenance: 'Week 95 opening demonstration and Problem 1’s rounds (catch, mark, return, recapture), as an arranged catch with a goal overlap; new instance.'},
  {number: 2, level: 'easy', title: 'Miss every dot', q: {mode: 'arrange', bag: 8, m: 4, n: 4, goal: 0}, prereq: 'k1',
    idea: 'A second catch with no dots is made of plain tiles only; here it must take every plain tile.',
    hints: ['Fill the first catch, then make a second catch with no dotted tiles.', 'How many plain tiles are in the bag?', 'The second catch must be exactly the plain tiles.'],
    parent: {notice: 'Whether your child counts the plain tiles before choosing, or swaps tiles until the dots are gone.', prompt: 'What if the bag had one tile fewer?', explanation: 'After a first catch of 4 there are 4 plain tiles, and a second catch of 4 with no dots must be all of them: just 1 of the 70 second catches works. With one tile fewer, catches of 4 and 4 would always share a tile.', extension: 'Make the goal four dots instead. What must the second catch be then? (The first catch again.)', connection: 'An overlap of 0 is possible exactly when the two catches fit side by side in the bag: here 4 + 4 = 8, just enough.'},
    provenance: 'Week 95 grades 2–3 Problem 5 (overlap 0 from a bag of 8 with catches of 4), as an arranged catch.'},
  {number: 3, level: 'easy', title: 'A small bag', q: {mode: 'arrange', bag: 5, m: 3, n: 3, goal: 0}, prereq: 'cant',
    idea: 'Only two tiles are plain, so a catch of three always holds a dot. Can’t is shown by catching both plain tiles.',
    hints: ['Fill the first catch, then try for a second catch with no dots.', 'How many plain tiles are left after the first catch?', 'Put both plain tiles in the second catch. It still needs another tile.'],
    parent: {notice: 'Whether your child keeps trying different tiles, or notices that there are only two plain tiles and says so.', prompt: 'How do you know no second catch can miss the dots?', explanation: 'The first catch dots 3 of the 5 tiles, leaving 2 plain. A second catch of 3 can hold at most those 2, so it always holds at least 1 dot. Can’t is accepted when the second catch shows this: both plain tiles caught, and a dot anyway.', extension: 'How big must the bag be for a second catch of three to miss every dot? (Six.)', connection: 'A catch of n from a bag with N − M plain tiles holds at least n − (N − M) dots: the forced overlap, max(0, M + n − N).'},
    provenance: 'Week 95 grades 2–3 Problem 7 (a record the bag could never give) with the review card’s certificate (only N − M tiles are plain); new instance.'},
  {number: 4, level: 'medium', title: 'Full catches', q: {mode: 'every', bag: 6, m: 5, n: 4}, prereq: 'every',
    idea: 'With most of the bag dotted, every second catch holds at least three dots.',
    hints: ['Make both catches, then change one tile in the second catch and see how its dots change.', 'How many plain tiles are there?', 'The second catch either holds the plain tile or it doesn’t.'],
    parent: {notice: 'Whether your child tries for a catch with fewer dots, and what they say when it can’t be done.', prompt: 'Why can’t the second catch have only two dots?', explanation: 'A first catch of 5 from 6 leaves 1 plain tile. A second catch of 4 holds that plain tile or not, so it has 3 or 4 dots and nothing else.', extension: 'What if the bag had seven tiles? (2, 3 or 4 dots.)', connection: 'The overlap runs from max(0, M + n − N) = 3 to min(M, n) = 4.'},
    provenance: 'Week 95 grades 2–3 Problem 6 (every possible overlap), its bag of 6.'},
  {number: 5, level: 'medium', title: 'A roomier bag', q: {mode: 'every', bag: 8, m: 5, n: 4}, prereq: 'every',
    idea: 'A bigger bag lets the overlap fall lower, but these catches still always share a tile, and no number between is skipped.',
    hints: ['Make both catches, then swap one tile at a time and watch the dots.', 'Can the second catch avoid every dot? How many plain tiles are there?', 'Swapping a plain tile for a dotted one changes the dots by one.'],
    parent: {notice: 'Whether your child changes one tile at a time and sees the dots go up or down by one.', prompt: 'Why is there always at least one dot?', explanation: 'Three tiles are plain, so a second catch of 4 holds at least 1 dot, and at most 4. Swapping one tile changes the dots by at most one, so every number from 1 to 4 appears, and never 0. The worksheet’s third bag, of 12, allows every number from 0 to 4.', extension: 'What is the smallest bag where the second catch can miss every dot? (Nine.)', connection: 'M + n = 9 is more than 8, so an overlap is forced: a pigeonhole argument.'},
    provenance: 'Week 95 grades 2–3 Problem 6 (every possible overlap), its bag of 8.'},
  {number: 6, level: 'medium', title: 'How big a bag?', q: {mode: 'sizes', bags: [6, 7, 8, 12, 20], start: 8, m: 5, n: 5, goal: 3}, prereq: 'sizes',
    idea: 'The catches show seven different tiles, so the bag holds at least seven; any bigger bag could give the same record.',
    hints: ['Choose a bag, make catches that match the goal, then try another bag.', 'How many different tiles do the two catches show?', 'In the bag of 6, can a second catch of five hold only three dots?'],
    parent: {notice: 'Whether your child expects big bags to fail, and what they make of the bag of 20 working.', prompt: 'Is there a biggest bag that could give these catches?', explanation: 'A first catch of 5, with 3 of them caught again in a second catch of 5, shows 5 + 5 − 3 = 7 different tiles, so the bag has at least 7. In the bag of 6, catches of 5 and 5 share at least 4 tiles. Any bigger bag works: its extra tiles are simply never caught, so a record has a smallest bag but no biggest.', extension: 'What is the smallest bag if the two catches share nothing? (Ten.)', connection: 'A record (M, n, R) proves N ≥ M + n − R, sharply, and nothing more. That is what a record shows before any estimate.'},
    provenance: 'Week 95 grades 2–3 Problems 2 and 3 (ABCDE and BDEFG: which of 6, 7, 8, 12, 20 are possible; is there a largest bag), with the catches left to the child.'},
  {number: 7, level: 'medium', title: 'Pairs by dots', q: {mode: 'sort', bag: 5, marked: [0, 1], n: 2}, prereq: 'sort',
    idea: 'Listing every second catch shows how often each number of dots comes up: one dot is the most common.',
    hints: ['Make a second catch, then change a tile to make a new one.', 'Keep A in the catch and change the other tile, then do the same with B.', 'Some catches have no dots, some one, and one has both.'],
    parent: {notice: 'Whether your child works through the catches in an order (all with A, then all with B, …) or jumps around.', prompt: 'Which pile is biggest, and why?', explanation: 'Two of the five tiles are dotted. Of the 10 second catches of 2, 3 have no dots (two of C, D, E), 6 have one (A or B with one of the three plain tiles) and 1 has both. If every catch is equally likely, the average is (0 × 3 + 1 × 6 + 2 × 1) ÷ 10 = 0.8 dots, which is 2 × 2 ÷ 5.', extension: 'How many catches have A in them? (4 of the 10, the same share as 2 of 5.)', connection: 'The piles are the hypergeometric counts C(2, k) × C(3, 2 − k).'},
    provenance: 'The review card’s App fit (“Where the average comes from”: sort every catch into bins by its dots), on a smaller bag; new instance.'},
  {number: 8, level: 'hard', title: 'Fewest and most', q: {mode: 'every', bag: 9, m: 6, n: 5}, prereq: 'every',
    idea: 'The fewest dots come from catching every plain tile, the most from a catch of dotted tiles, and swaps reach every number between.',
    hints: ['Find the second catch with the fewest dots and the one with the most, then fill in between.', 'What is the fewest dots a catch of five can have, if every plain tile is in it?', 'A swap of one tile changes the dots by one, so nothing between is skipped.'],
    parent: {notice: 'Whether your child aims at the two ends first, or wanders and finds the middle numbers by chance.', prompt: 'How do you know nothing between is missing?', explanation: 'Six of nine tiles are dotted, three plain. A second catch of 5 holds at most 3 plain tiles, so at least 2 dots, and it can be all dotted: 5 dots. Swapping one tile changes the dots by one, so 2, 3, 4 and 5 all appear. In general the overlap takes every whole number from max(0, M + n − N) to min(M, n).', extension: 'With the same bag and first catch, what size of second catch forces at least four dots? (Seven: 7 − 3 = 4.)', connection: 'Both ends are sharp and nothing between is skipped, a whole-number version of the intermediate value theorem.'},
    provenance: 'New instance, after Week 95 grades 2–3 Problem 6 and grades 4–5 Problem 5 (catch sizes that force an overlap).'},
  {number: 9, level: 'hard', title: 'Few dots', q: {mode: 'arrange', bag: 10, m: 6, n: 6, goal: 1}, prereq: 'bound',
    idea: 'Only four tiles are plain, so a catch of six holds at least two dots: one dot is out of reach.',
    hints: ['Fill both catches and try for the goal.', 'How many plain tiles are there? How many tiles does the second catch hold?', 'Put every plain tile in the second catch and see what else it needs.'],
    parent: {notice: 'Whether your child counts the plain tiles and argues, or keeps swapping in hope.', prompt: 'Which goals could this bag make?', explanation: 'Four of the ten tiles are plain. A second catch of 6 holds at most those 4, so at least 2 dots. Can’t is accepted once the second catch holds all four plain tiles and two dotted ones, the fewest dots any second catch can have.', extension: 'Which goals can this bag make? (2 to 6 dots.)', connection: 'An overlap below M + n − N is impossible: here 6 + 6 − 10 = 2.'},
    provenance: 'Week 95 grades 4–5 Problem 5 (which catch sizes make a small overlap impossible), as Can’t on a new instance.'},
  {number: 10, level: 'hard', title: 'Bags for a record', q: {mode: 'sizes', bags: [8, 9, 10, 11, 16], start: 11, m: 6, n: 6, goal: 2}, prereq: 'sizes',
    idea: 'Catches of six and six sharing two tiles show ten different tiles: bags of ten and up fit, and smaller bags force a bigger overlap.',
    hints: ['Choose a bag, make catches that match the goal, then try another bag.', 'How many different tiles do the catches show?', 'In the bag of 9, a second catch of six holds at least three dots.'],
    parent: {notice: 'Whether your child predicts which bags will fail before trying them.', prompt: 'What is the smallest bag that fits, and why that one?', explanation: 'The record shows 6 + 6 − 2 = 10 different tiles, so the bag holds at least 10. In a bag of 9 the catches share at least 3 tiles; in a bag of 8, at least 4. Bags of 10, 11 and 16 all work.', extension: 'What is the smallest bag for catches of six and six that share nothing? (Twelve, the worksheet’s record B.)', connection: 'N ≥ M + n − R is sharp and has no upper partner: a record never caps the bag.'},
    provenance: 'Week 95 grades 4–5 Problem 2, record A (catches of 6 and 6, overlap 2: smallest bag 10), with a list of bags to test.'},
  {number: 11, level: 'hard', title: 'Threes by dots', q: {mode: 'sort', bag: 6, marked: [0, 2], n: 3}, prereq: 'sort',
    idea: 'Sorting every catch of three by its dots shows where the average comes from: it is two times three divided by six.',
    hints: ['Make a second catch, then change one tile at a time to make new ones.', 'Work in order: every catch with A first, then the rest.', 'The piles end up four, twelve and four.'],
    parent: {notice: 'Whether your child organizes the list (by first letter, or by dots) and how they decide it is complete.', prompt: 'If you picked a catch at random, how many dots would you expect?', explanation: 'From six tiles there are 20 catches of 3. With A and C dotted, 4 have no dots (three of B, D, E, F), 12 have one (A or C with two of the four plain tiles: 2 × 6) and 4 have both (A, C and one plain tile). The average is (0 × 4 + 1 × 12 + 2 × 4) ÷ 20 = 1 = 2 × 3 ÷ 6: each dotted tile is in 10 of the 20 catches, the same share as 3 of 6.', extension: 'If the bag’s size were unknown, a catch with one dot suggests 2 × 3 ÷ 1 = 6 tiles. What does a catch with no dots suggest?', connection: 'The average overlap is Mn/N, since each marked tile lies in C(N − 1, n − 1) of the C(N, n) catches. Turned around, it gives the Lincoln–Petersen guess Mn/R, which wanders from catch to catch and fails at R = 0.'},
    provenance: 'The review card’s App fit (“Where the average comes from”: all 20 catches of 3 from A–F, A and C marked, into bins 4, 12, 4; mean 1 = 2 × 3 ÷ 6), after grades 4–5 Problems 3 and 6.'}
];

const id = n => `catches-${String(n).padStart(2, '0')}`;
const table = [];
const out = PUZZLES.map(item => {
  const q = item.q;
  let solution;
  if (q.mode === 'arrange') {
    const low = lowest(q.bag, q.m, q.n), high = highest(q.m, q.n);
    assert.ok(q.goal >= 0 && q.goal <= q.n, `${id(item.number)}: a goal the catch can show`);
    const possible = q.goal >= low && q.goal <= high;
    // A witness: the first catch A, B, …; the second takes its dots from the
    // front and its plain tiles from after the first catch.
    const first = Array.from({length: q.m}, (_, i) => i), t = Math.min(Math.max(q.goal, low), high);
    const second = [...first.slice(0, t), ...Array.from({length: q.n - t}, (_, i) => q.m + i)];
    solution = {possible, overlaps: overlapsOf(q.bag, q.m, q.n), witness: {first, second}, ...(possible ? {} : {cant: q.goal < low ? 'low' : 'high'})};
    table.push(`${id(item.number)} arrange bag ${q.bag}, ${q.m} and ${q.n}, goal ${q.goal}: ${possible ? 'possible' : 'Can’t'} (overlaps ${low}–${high})`);
  } else if (q.mode === 'every') {
    const answers = overlapsOf(q.bag, q.m, q.n);
    solution = {answers, count: answers.length};
    table.push(`${id(item.number)} every bag ${q.bag}, ${q.m} and ${q.n}: ${answers}`);
  } else if (q.mode === 'sizes') {
    assert.ok(q.bags.includes(q.start) && q.bags.every((N, i) => i === 0 || N > q.bags[i - 1]));
    const answers = q.bags.filter(N => fits(N, q.m, q.n, q.goal));
    assert.ok(answers.length && answers.length < q.bags.length, `${id(item.number)}: some bags fit and some don’t`);
    assert.equal(answers[0], smallestBag(q.m, q.n, q.goal));
    solution = {answers, count: answers.length, smallest: smallestBag(q.m, q.n, q.goal)};
    table.push(`${id(item.number)} sizes ${q.m} and ${q.n}, overlap ${q.goal}, bags ${q.bags}: ${answers}`);
  } else {
    const all = subsets(q.bag, q.n), piles = {};
    for (const c of all) { const k = c.filter(t => q.marked.includes(t)).length; piles[k] = (piles[k] || 0) + 1; }
    for (const [k, c] of Object.entries(piles)) assert.equal(c, choose(q.marked.length, Number(k)) * choose(q.bag - q.marked.length, q.n - Number(k)));
    solution = {answers: all.map(keyOf), count: all.length, piles};
    table.push(`${id(item.number)} sort bag ${q.bag}, ${q.marked.map(t => 'ABCDEFGH'[t]).join('')} marked, catches of ${q.n}: ${all.length} catches, piles ${JSON.stringify(piles)}`);
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Catch and mark', mechanic: 'catches', band: 'all', revision: 1, sourceDocument: 'docs/catches/README.md',
    parameters: q, objective: FULL[q.mode], visibleObjective: VISIBLE[q.mode], instruction: FULL[q.mode], controls: CONTROLS[q.mode], rules: [...RULES, MODE_RULES[q.mode]],
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.deepEqual(out.map(p => p.difficulty_level), [...Array(3).fill('easy'), ...Array(4).fill('medium'), ...Array(4).fill('hard')]);
// The table in docs/catches/README.md.
assert.deepEqual(out.map(p => p.solution.possible ?? p.solution.answers.length), [true, true, false, 2, 4, 4, 10, 4, false, 3, 20]);
assert.deepEqual(out[10].solution.piles, {0: 4, 1: 12, 2: 4});
assert.deepEqual(out[6].solution.piles, {0: 3, 1: 6, 2: 1});

const playground = {
  id: 'catches-playground', number: 0, title: 'Catch and mark playground', difficulty_level: 'playground', familyTitle: 'Catch and mark', mechanic: 'catches', band: 'playground', revision: 1, sourceDocument: 'docs/catches/README.md',
  parameters: {mode: 'playground', bag: 6, m: 2, n: 3},
  objective: 'Choose a bag and two catch sizes, make random catches and watch the piles grow.', visibleObjective: '',
  instruction: 'Choose a bag and two catch sizes, make random catches and watch the piles grow.',
  controls: CONTROLS.playground, rules: ['Each catch takes tiles at random from the whole bag. The first catch is marked; the pile is the number of dotted tiles in the second catch.'],
  idea: 'Random catches pile up around the average and never land outside the possible overlaps.',
  prerequisites: 'None. A grown-up can ask which pile will be biggest before catching.',
  hints: ['Press Catch 10 a few times and look at the piles.', 'Which piles stay empty? Could they ever fill?', 'Make the bag bigger and catch again. Where do the piles move?'],
  parent: {notice: 'Whether your child notices piles that never fill, and whether the biggest pile moves when the bag grows.', prompt: 'If you didn’t know the bag, what would one catch tell you about it?', explanation: 'With a bag of 6 and catches of 2 and 3, the piles settle near 4 : 12 : 4 out of 20 (one dot most often); the average overlap is 2 × 3 ÷ 6 = 1. Overlaps below M + n − N or above the smaller catch never come. Guessing the bag from one catch as Mn/R (the Lincoln–Petersen estimate) wanders from round to round and fails when no dots come up: the puzzles show what a record proves, the playground only what is likely.', extension: 'Keep the bag at 12 and give the catches sizes that add to 8. Which split gives the most dots on average? (Four and four: 4 × 4 ÷ 12 is the biggest.)', connection: 'Mark–recapture estimation in ecology starts here: the hypergeometric distribution, with mean Mn/N.', sourceIds: sources},
  provenance: 'Week 95 Problem 1’s live rounds and grades 2–3 Problem 4 (rounds from one bag lean but don’t decide), as random catches; the review card keeps random catches in a playground.'
};

const json = {
  title: 'Catch and mark',
  version: 1,
  families: [{id: 'catches', title: 'Catch and mark', mathematics: 'A bag holds N objects. A first catch of M is marked and returned; a second catch of n holds R marked objects. In a bag of N the overlap R takes every whole number from max(0, M + n − N) to min(M, n), and no other: only N − M objects are unmarked, and swapping one object in a catch changes R by at most one. So M + n > N forces a shared object. A record (M, n, R) shows M + n − R different objects, so N ≥ M + n − R, sharply, with no upper bound. Of the C(N, n) second catches, C(M, R) · C(N − M, n − R) have overlap R, and the average overlap is Mn/N; turning it around suggests the Lincoln–Petersen estimate Mn/R, which is a guess, not a bound. The puzzles ask for a second catch with a goal overlap or Can’t, every overlap a bag allows, every bag that fits a record, and every second catch sorted by its overlap.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'catches-week95', title: 'Bellingham Math Circle — Week 95: Count the unseen (grades 2–3 and 4–5 packets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-95', kind: 'local curriculum'},
    {id: 'catches-card95', title: 'Week 95 review card and math check (App fit: arrange catches for a target overlap or Can’t, every overlap, sort all catches into overlap bins)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-95.md', kind: 'local curriculum'},
    {id: 'catches-mcclintock', title: 'Brett McClintock — Mark-resight models, chapter 18 in Cooch and White, Program MARK: A Gentle Introduction, pp. 18-2–18-3 (the Lincoln–Petersen set-up)', url: 'https://sites.warnercnr.colostate.edu/gwhite/wp-content/uploads/sites/73/2017/05/MARK_resight_help.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/catches/catches.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(table.join('\n'));
