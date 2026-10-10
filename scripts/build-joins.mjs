// Authoring list for Joining strips (worksheet Week 54). Computes each
// puzzle's answers with the mechanic's own helpers (catalogs, all-odd forms,
// fewest joins and halvings, the longest strip that can appear), checks them
// against the table in docs/joins/README.md, and writes
// dist/families/joins/joins.json. Run: node scripts/build-joins.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {answersOf, oddForm, joinAll, distancesTo, reachable, longestIn, halfMoves, applyTo, keyOf, sortDown, sum, allOdd} from '../dist/families/joins/joins.js';

const RULES = {
  strips: 'A collection is some strips of squares. Their squares add up to its total, and their order does not matter.',
  halving: [
    'Two strips of the same length can join into one strip twice as long.',
    'A strip of even length can be halved into two equal strips.'
  ],
  free: [
    'Cut any strip into two, or join any two strips.',
    'Keep each collection that fits. Press That’s all when none is left; it says if there is another.'
  ],
  reach: 'Make the goal, or press Can’t once you have tried, if no joins and halvings can make it. After Can’t, halve every even strip in both rows.',
  flip: 'Flip turns the rows of squares into columns.',
  match: 'Tap a collection to put its strips on the bench. When no two strips match, it pairs with what it has become.'
};
const CONTROLS = {
  halving: 'Tap a strip to choose it. Tap it again to halve it at the dashed line, or tap a strip of the same length to join the two. Undo takes back the last move.',
  reach: 'Tap a strip to choose it. Tap it again to halve it at the dashed line, or tap a strip of the same length to join the two. Press Can’t when the goal can’t be made; then halve strips in both rows the same way. Undo takes back the last move.',
  free: 'Tap a strip to choose it. Tap a dashed line on it to cut there, or tap another strip to join the two. Keep puts the collection on the shelf. Undo takes back the last move.',
  match: 'Tap a collection to take it. Tap a strip to choose it, then a strip of the same length to join the two, or the chosen strip again to halve it. Undo takes back the last move.',
  playground: 'Tap a strip to choose it. Tap it again to halve it, or tap a strip of the same length to join the two. + adds a strip of 1 and − takes one away.'
};
const KIND_WORDS = {all: n => `every way to make ${n}`, odd: n => `every way to make ${n} from odd strips`, distinct: n => `every way to make ${n} from strips that all differ`, parts: (n, k) => `every way to make ${n} from at most ${k} strips`};
const PREREQUISITES = {
  join: 'Compare lengths by eye and count squares to 16. No reading; a grown-up can read How to play.',
  catalog: 'Count squares to the total and remember which collections are on the shelf. A grown-up can read the goal line.',
  match: 'Join equal strips. Comparing the pictures helps; no arithmetic beyond counting to 8.',
  reach: 'Join and halve with purpose, and compare two collections strip by strip. Halving even numbers to 16.',
  flip: 'Read a collection as rows of squares and see its columns.'
};
const sources = ['joins-week54', 'joins-card54', 'joins-koroteev'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Join up', mode: 'reach', start: [2, 2, 2, 1, 1], goal: [8], check: {moves: 4}, prereq: 'join',
    idea: 'Only equal strips join, so the two 1s must become a 2 before the 2s can grow.',
    hints: ['Which strips are the same length?', 'The two 1s make a 2. Then there are four 2s.', 'Join the 1s, then the 2s in pairs, then the two 4s.'],
    parent: {notice: 'Whether your child tries to join a 2 to a 1 first, and how they react when the app refuses it.', prompt: 'Why can’t the three 2s become one strip on their own?', explanation: 'Joining only doubles: two 1s make a 2, two 2s a 4, two 4s an 8. Three 2s leave one 2 over, so the 1s must first join into a fourth 2. Four joins in all: 1 + 1, then 2 + 2 twice, then 4 + 4.', extension: 'Could 2, 2, 2, 1 become one strip? (No: joining 1s only ever makes 2, 4, 8 or 16, never 7.)', connection: 'Joining equal strips is carrying in base two: the strips of length 1, 2, 4, 8 are the binary digits of the total.'},
    provenance: 'New, a joining warm-up after Week 54 Problem 3 (nine 1s carry to 8 and 1).'},
  {number: 2, level: 'easy', title: 'Every way to make 5', mode: 'catalog', kind: 'all', total: 5, check: {count: 7}, prereq: 'catalog',
    idea: 'A catalog is complete when it is organized: by the longest strip, then by what is left.',
    hints: ['Cut the 5 somewhere, then keep it.', 'Try each longest strip in turn: 5, then 4, then 3, and so on.', 'With longest strip 3, the rest is 2 or 1 and 1.'],
    parent: {notice: 'Whether your child keeps 3, 2 and 2, 3 as two collections. The app shows them as the same strips, longest first.', prompt: 'How do you know none is missing?', explanation: 'Sort by the longest strip. 5 alone; 4 and 1; 3 and 2, or 3, 1, 1; 2, 2, 1 or 2, 1, 1, 1; and five 1s. Seven collections. Each longest strip leaves a smaller total to split with strips no longer than it.', extension: 'How many ways to make 6? (11.)', connection: 'These are the partitions of 5; there are p(5) = 7.'},
    provenance: 'Week 54 Problem 1, total 5.'},
  {number: 3, level: 'easy', title: 'Only odd strips', mode: 'catalog', kind: 'odd', total: 7, check: {count: 5}, prereq: 'catalog',
    idea: 'With odd strips only, the 1s fill whatever the bigger odd strips leave.',
    hints: ['Which strip lengths are odd?', 'Start with the longest odd strip, 7, then 5, then 3, and fill the rest with 1s or 3s.', 'With a 3: 3, 3, 1 and 3, 1, 1, 1, 1.'],
    parent: {notice: 'Whether your child cuts at random or chooses the longest odd strip first.', prompt: 'Why is there no collection with a 5 and a 3?', explanation: 'Odd strips adding to 7: 7; 5, 1, 1; 3, 3, 1; 3, 1, 1, 1, 1; and seven 1s. Five in all. A 5 and a 3 already make 8.', extension: 'Count the ways to make 7 from strips that all differ (puzzle 4). What do you notice?', connection: 'Partitions of 7 into odd parts; Euler showed there are as many as partitions into different parts.'},
    provenance: 'Week 54 Problem 2, total 7, the only-odd catalog.'},
  {number: 4, level: 'easy', title: 'All different', mode: 'catalog', kind: 'distinct', total: 7, check: {count: 5}, prereq: 'catalog',
    idea: 'With all strips different, the longest strip can’t be too short: 3 + 2 + 1 is only 6.',
    hints: ['No two strips may be the same length.', 'Start with 7, then 6 and 1, then 5 and 2.', 'With longest strip 4: 4, 3 and 4, 2, 1.'],
    parent: {notice: 'Whether your child notices that this catalog has as many collections as the odd one in puzzle 3.', prompt: 'Why can’t the longest strip be 3?', explanation: 'Different strips adding to 7: 7; 6, 1; 5, 2; 4, 3; 4, 2, 1. Five in all, as many as with odd strips. If the longest were 3, the most the strips could add to is 3 + 2 + 1 = 6.', extension: 'Is it a coincidence? Try 8 both ways (puzzle 5 pairs them).', connection: 'Partitions into distinct parts, q(7) = 5, equal to the odd-part count.'},
    provenance: 'Week 54 Problem 2, total 7, the all-different catalog; the review card’s fix 4 (why 3 fails).'},
  {number: 5, level: 'medium', title: 'Odd to different', mode: 'match', to: 'distinct', total: 8, prereq: 'match',
    idea: 'Joining equal strips turns each odd collection into one with all strips different, and every such collection appears once.',
    hints: ['Take one collection and join equal strips.', 'Keep joining until no two strips match.', '7, 1 and 5, 3 are already all different.'],
    parent: {notice: 'Whether your child predicts the result before joining, and notices that the results are all different from each other.', prompt: 'Could two odd collections become the same all-different one?', explanation: 'Six odd collections of 8 pair with the six all-different ones: 7, 1 and 5, 3 stay; 5, 1, 1, 1 becomes 5, 2, 1; 3, 3, 1, 1 becomes 6, 2; 3, 1, 1, 1, 1, 1 becomes 4, 3, 1; eight 1s become 8. Halving every even strip takes each back, so no two can meet.', extension: 'Which odd collection of 9 becomes 6, 2, 1? (3, 3, 1, 1, 1.)', connection: 'Glaisher’s bijection between partitions into odd parts and into distinct parts.'},
    provenance: 'Week 54 Problem 5, the 8-unit matching.'},
  {number: 6, level: 'medium', title: 'Three into five', mode: 'reach', start: [4, 3, 3], goal: [6, 1, 1, 1, 1], check: {moves: 4}, prereq: 'reach',
    idea: 'Some goals need joins and halvings both: the 3s join while the 4 breaks down.',
    hints: ['Which strips of the goal can you see coming from yours?', 'The 6 can come from the two 3s. Where do the 1s come from?', 'Join the 3s, then halve the 4 and both 2s.'],
    parent: {notice: 'Whether your child only joins, or only halves, and gets stuck.', prompt: 'Which strips of the goal come from which of yours?', explanation: 'The goal’s 6 is the two 3s joined, and its four 1s are the 4 halved twice: one join and three halvings.', extension: 'Can 4, 3, 3 become 5, 5? (No: halving everything gives 3, 3, 1, 1, 1, 1 against 5, 5.)', connection: 'Moves inside one odd family (u, 2u, 4u, …) never touch another family.'},
    provenance: 'New: a pair from the review card’s search that needs both kinds of move.'},
  {number: 7, level: 'medium', title: 'Two and two', mode: 'reach', start: [10, 2], goal: [6, 6], check: {can: false}, prereq: 'reach',
    idea: 'Halving everything gives an all-odd collection that no move changes; different ones mean no route.',
    hints: ['Halve something and see what you can make.', 'Halve every even strip as far as it goes. What do you get from 10, 2? From 6, 6?', 'Halved all the way, 10, 2 is 5, 5, 1, 1 and 6, 6 is 3, 3, 3, 3. Press Can’t and halve both.'],
    parent: {notice: 'Whether your child tries many moves before suspecting it can’t be done, and how they decide.', prompt: 'Once both are halved all the way, could any joins make them match?', explanation: 'Halving 10, 2 all the way gives 5, 5, 1, 1, and 6, 6 gives 3, 3, 3, 3. A join or a halving never changes a collection’s all-odd form: joining 2u and 2u makes 4u, which halves to the same four u. So no route connects collections with different all-odd forms.', extension: 'What can 10, 2 become? (Only 10, 1, 1; 5, 5, 2; and 5, 5, 1, 1.)', connection: 'The all-odd form is an invariant, and a complete one: equal forms always connect.'},
    provenance: 'New: a reach-or-refute pair for the review card’s certificate (both sides halved to different all-odd collections).'},
  {number: 8, level: 'medium', title: 'At most three strips', mode: 'catalog', kind: 'parts', k: 3, total: 8, flip: true, check: {count: 10}, prereq: 'flip',
    idea: 'Flip turns “at most 3 strips” into “no strip longer than 3”, so either catalog counts the other.',
    hints: ['Cut the 8 into one, two or three strips.', 'Try Flip on something with lots of short strips.', 'With three strips: 6, 1, 1; 5, 2, 1; 4, 3, 1; 4, 2, 2; 3, 3, 2.'],
    parent: {notice: 'Whether your child uses Flip to turn a collection of short strips into one with few strips.', prompt: 'What does Flip do to the number of strips?', explanation: 'Ten collections: 8; 7, 1; 6, 2; 5, 3; 4, 4; 6, 1, 1; 5, 2, 1; 4, 3, 1; 4, 2, 2; 3, 3, 2. Flip reads the columns of squares as strips, so the number of strips becomes the longest strip, and the other way round. 3, 3, 2 flips to itself.', extension: 'Which collections of 8 flip to themselves? (4, 2, 1, 1 and 3, 3, 2.)', connection: 'Conjugation of Young diagrams: partitions into at most k parts match partitions with parts at most k.'},
    provenance: 'Week 54 Problem 8 (the review card: Flip only inside this catalog).'},
  {number: 9, level: 'hard', title: 'Every way to make 8', mode: 'catalog', kind: 'all', total: 8, check: {count: 22}, prereq: 'catalog',
    idea: 'A long catalog needs an order: by longest strip, then by the longest strip of what is left.',
    hints: ['Work through one longest strip at a time.', 'For each longest strip, make every way to finish the rest with strips no longer.', 'Longest strip 2: 2, 2, 2, 2; 2, 2, 2, 1, 1; 2, 2, 1, 1, 1, 1; 2, 1, 1, 1, 1, 1, 1.'],
    parent: {notice: 'Whether your child settles on an order, or keeps making collections at random until That’s all accepts.', prompt: 'How many collections have longest strip 4?', explanation: 'There are 22. By longest strip: 8 (1), 7 (1), 6 (2), 5 (3), 4 (5), 3 (5), 2 (4), 1 (1). With longest strip 4, the other 4 squares make 4; 3, 1; 2, 2; 2, 1, 1; or 1, 1, 1, 1.', extension: 'Which of the 22 have only odd strips, and which all different? (6 each.)', connection: 'p(8) = 22.'},
    provenance: 'Week 54 Problem 1, extended to 8 as the port brief asks.'},
  {number: 10, level: 'hard', title: 'All different, 11', mode: 'catalog', kind: 'distinct', total: 11, check: {count: 12}, prereq: 'catalog',
    idea: 'The all-different catalog grows with the total; organizing by the longest strip keeps it complete.',
    hints: ['No two strips the same length.', 'Go through the longest strip from 11 down. Which longest strip is too short?', 'With longest strip 5: 5, 4, 2 and 5, 3, 2, 1.'],
    parent: {notice: 'Whether your child checks the smallest possible longest strip, and how many strips a collection can have.', prompt: 'Why can’t a collection of 11 have five different strips?', explanation: 'Twelve: 11; 10, 1; 9, 2; 8, 3; 7, 4; 6, 5; 8, 2, 1; 7, 3, 1; 6, 4, 1; 6, 3, 2; 5, 4, 2; 5, 3, 2, 1. Five different strips add to at least 1 + 2 + 3 + 4 + 5 = 15. The longest strip is at least 5, since 4 + 3 + 2 + 1 = 10.', extension: 'How many ways to make 11 from odd strips? (12 again.)', connection: 'q(11) = 12, the number of partitions of 11 into distinct parts, and into odd parts.'},
    provenance: 'Week 54 Problem 2’s all-different catalog at total 11 (the review card: “all-different to about 12”).'},
  {number: 11, level: 'hard', title: 'Seven 2s', mode: 'reach', start: [8, 1, 1, 1, 1, 1, 1], goal: [2, 2, 2, 2, 2, 2, 2], check: {moves: 6}, prereq: 'reach',
    idea: 'The 8 must come down and the 1s go up to meet at 2s: neither kind of move alone gets there.',
    hints: ['Where can the goal’s 2s come from?', 'Some 2s come from halving the 8, and some from joining 1s.', 'Halve the 8, then both 4s. Join the 1s in pairs.'],
    parent: {notice: 'Whether your child halves everything to 1s first and then joins back up, which works but takes longer.', prompt: 'How many of the seven 2s come from the 8?', explanation: 'Halving the 8 gives 4, 4, then four 2s: three halvings. The six 1s join into three 2s: three joins. Six moves, the fewest. Halving all the way to fourteen 1s and joining seven pairs also works, in 14 moves.', extension: 'Can 8, 1, 1, 1, 1, 1, 1 become 4, 4, 4, 2? (Yes: halve the 8, and join the 1s into a 4 and a 2.)', connection: 'All these collections lie in the odd family of 1; the moves are binary carries and borrows.'},
    provenance: 'The Week 54 review card’s App fit: 8, 1, 1, 1, 1, 1, 1 → 2, 2, 2, 2, 2, 2, 2 needs both kinds of move.'},
  {number: 12, level: 'hard', title: 'Four different', mode: 'reach', start: [6, 2, 2], goal: [4, 3, 2, 1], check: {can: false}, prereq: 'reach',
    idea: 'Two collections can share strip lengths and still not connect: the count of each odd strip is what stays.',
    hints: ['Try making the 3 of the goal.', 'Halve every strip of yours as far as it goes, then do the same to the goal. Count the 3s.', 'Yours halves to 3, 3, 1, 1, 1, 1 and the goal to 3, 1, 1, 1, 1, 1, 1, 1. Press Can’t and halve both.'],
    parent: {notice: 'Whether your child makes the 4 and the 3 and then looks for the 2 and 1, and when they suspect the second 3.', prompt: 'What happens to the other 3?', explanation: 'Halving 6, 2, 2 all the way gives two 3s and four 1s; halving 4, 3, 2, 1 gives one 3 and seven 1s. Every move keeps the number of 3s (a 6 is two 3s, a 12 four), so the two 3s can never become one.', extension: 'Change one strip of the goal so it can be made. (4, 3, 3 works: two 3s and four 1s.)', connection: 'For each odd u, the number of u’s in the all-odd form is invariant; together they decide reachability.'},
    provenance: 'New: a reach-or-refute pair whose all-odd forms differ only in their 3s.'}
];

const id = n => `joins-${String(n).padStart(2, '0')}`;
const route = (start, goal) => {
  const d = distancesTo(goal), out = [];
  let at = sortDown(start);
  while (keyOf(at) !== keyOf(goal)) { const m = halfMoves(at).find(x => d.get(keyOf(applyTo(at, x))) === d.get(keyOf(at)) - 1); out.push(m); at = applyTo(at, m); }
  return out;
};
const out = PUZZLES.map(item => {
  let q, solution;
  if (item.mode === 'catalog') {
    q = {mode: 'catalog', kind: item.kind, total: item.total, ...(item.k ? {k: item.k} : {}), ...(item.flip ? {flip: true} : {}), start: [item.total], span: item.total};
    const answers = answersOf(q);
    assert.equal(answers.length, item.check.count, `${id(item.number)}: catalog size`);
    solution = {answers};
  } else if (item.mode === 'reach') {
    const can = reachable(item.start, item.goal);
    q = {mode: 'reach', start: sortDown(item.start), goal: sortDown(item.goal), span: Math.max(longestIn(item.start), can ? 0 : Math.max(...item.goal))};
    assert.equal(sum(q.start), sum(q.goal), `${id(item.number)}: same total`);
    if (item.check.can === false) {
      assert.equal(can, false, `${id(item.number)}: can’t`);
      assert.ok(halfMoves(q.start).length, `${id(item.number)}: a first move exists`);
      solution = {can: false, start: oddForm(q.start), goal: oddForm(q.goal)};
    } else {
      assert.ok(can, `${id(item.number)}: reachable`);
      const moves = route(q.start, q.goal);
      assert.equal(moves.length, item.check.moves, `${id(item.number)}: fewest moves`);
      solution = {can: true, fewest: moves.length, moves};
    }
  } else {
    const cards = answersOf({kind: 'odd', total: item.total});
    q = {mode: 'match', to: item.to, total: item.total, cards, span: Math.max(...cards.map(longestIn))};
    solution = {pairs: cards.map(c => [c, joinAll(c)])};
  }
  const objective = item.mode === 'catalog' ? `Keep ${KIND_WORDS[item.kind](item.total, item.k)}. Press That’s all when none is left.` : item.mode === 'reach' ? 'Make the goal by joining equal strips and halving even ones, or press Can’t if it can’t be made.' : 'Join each odd collection until no two of its strips match.';
  const visible = item.mode === 'catalog' ? `Keep ${KIND_WORDS[item.kind](item.total, item.k)}.` : item.mode === 'reach' ? '' : 'Join each until no two strips match.';
  const kind = item.mode === 'catalog' ? 'free' : item.mode;
  const rules = item.mode === 'catalog' ? [RULES.strips, ...RULES.free, ...(item.flip ? [RULES.flip] : [])] : [RULES.strips, ...RULES.halving, item.mode === 'reach' ? RULES.reach : RULES.match];
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Joining strips', mechanic: 'joins', band: 'all', revision: 1, sourceDocument: 'docs/joins/README.md',
    parameters: q, objective, visibleObjective: visible, instruction: objective, controls: CONTROLS[kind], rules,
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.deepEqual(out.map(p => p.difficulty_level), [...Array(4).fill('easy'), ...Array(4).fill('medium'), ...Array(4).fill('hard')]);

const playground = {
  id: 'joins-playground', number: 0, title: 'Joining strips playground', difficulty_level: 'playground', familyTitle: 'Joining strips', mechanic: 'joins', band: 'playground', revision: 1, sourceDocument: 'docs/joins/README.md',
  parameters: {mode: 'playground', start: [3, 3, 1, 1, 1, 1], max: 16, span: 16},
  objective: 'Join equal strips and halve even ones freely, and change the total with + and −.', visibleObjective: '',
  instruction: 'Join equal strips and halve even ones freely, and change the total with + and −.',
  controls: CONTROLS.playground, rules: [RULES.strips, ...RULES.halving],
  idea: 'Free play with the joining machine: whatever you start from, halving everything and joining everything each end in one place.',
  prerequisites: 'None. A grown-up can set a starting collection as a challenge.',
  hints: ['Join until no two strips match.', 'Now halve until every strip is odd.', 'Start again from the same strips and join in a different order.'],
  parent: {notice: 'Whether your child joins in different orders and notices the same final strips.', prompt: 'Does the order of joins change where you end up?', explanation: 'No. Each odd size u has its own family u, 2u, 4u, …, and joining within a family is carrying in base two: the strips left at the end are the binary digits of how many u’s there were. From 3, 3, 1, 1, 1, 1, every order ends at 6, 4.', extension: 'Find two different starting collections that end at the same strips. (They halve to the same all-odd collection.)', connection: 'Week 54 Problem 6: order-independence of joining, the heart of Euler’s odd = distinct theorem.', sourceIds: sources},
  provenance: 'Week 54 page 3’s demonstration collection, 3, 3, 1, 1, 1, 1, and Problem 6’s question.'
};
assert.equal(keyOf(joinAll(playground.parameters.start)), '6,4');
assert.ok(out.filter(p => p.parameters.mode === 'reach').every(p => p.parameters.span >= Math.max(p.parameters.start[0], p.parameters.goal[0]) && allOdd(oddForm(p.parameters.goal))));

const json = {
  title: 'Joining strips',
  version: 1,
  families: [{id: 'joins', title: 'Joining strips', mathematics: 'A collection is a partition: strips of whole-unit lengths adding to a total, with no order. Joining two equal strips and halving an even one keep the total. Each odd size u has its own family u, 2u, 4u, …, so halving everything gives one all-odd collection that no move changes, and two collections connect by joins and halvings exactly when their all-odd forms agree. Joining equal strips until none match gives the one collection in each class whose strips all differ, whatever the order: Euler’s theorem that partitions into odd parts and into distinct parts are equinumerous, by Glaisher’s bijection. Flipping rows and columns (conjugation) swaps “at most k strips” with “no strip longer than k”.', rules: [RULES.strips, ...RULES.halving], sourceIds: sources}],
  sources: [
    {id: 'joins-week54', title: 'Bellingham Math Circle — Week 54: Partitions and rebuilding (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-54', kind: 'local curriculum'},
    {id: 'joins-card54', title: 'Week 54 review card and math check (App fit: strip workbench, catalogs, reach or refute)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-54.md', kind: 'local curriculum'},
    {id: 'joins-koroteev', title: 'Peter Koroteev — Integer Partitions, Berkeley Math Circle (2020), §1 pp. 1–3 (diagrams) and §2.2 pp. 6–9 (odd and distinct parts, splitting even parts)', url: 'https://mathcircle.berkeley.edu/sites/default/files/handouts/2020/PartitionsChapter.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/joins/joins.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${p.parameters.mode === 'catalog' ? `${p.parameters.kind} ${p.parameters.total}: ${p.solution.answers.length}` : p.parameters.mode === 'reach' ? `${p.parameters.start} -> ${p.parameters.goal}: ${p.solution.can ? `${p.solution.fewest} moves` : 'can’t'} (span ${p.parameters.span})` : `${p.solution.pairs.length} pairs`}`).join('\n'));
