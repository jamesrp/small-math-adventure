// Authoring list for Card totals (worksheet Week 55, few sums and equal
// spacing). Computes every puzzle's solving designs with the mechanic's own
// enumeration, checks the counts in docs/sumsets/README.md, adds a witness
// (a design and a route, or every answer), and writes
// dist/families/sumsets/sumsets.json. Run: node scripts/build-sumsets.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {designs, totalsOf} from '../dist/families/sumsets/sumsets.js';

const fixed = (...cards) => ({fixed: cards});
const size = n => ({size: n});
const RULES = {
  pairs: 'Each card in A pairs with each card in B. A pair drops a token on the strip at its total, and pairs with the same total share a token.',
  grid: 'The grid shows every pair: A’s cards go up, B’s go across, and each dot holds their total.',
  route: 'A route starts at the bottom-left dot and steps right or up, one dot at a time, to the top-right dot.',
  fewest: 'Finish by tapping a route that passes every total on the strip; the top-right dot checks it.',
  fit: 'Finish by tapping a route that passes every total on the strip; the top-right dot checks it. A may have one, two or three cards; a route with one card counts once a route with more has been tried.',
  most: 'Dots that share a total are shaded.',
  even: 'Evenly spaced means the same jump between each card and the next.',
  every: 'Each B that works joins the row above the strip. Press That’s all when you think none is left. It says if there is another.'
};
const CONTROLS = {
  route: 'Tap a card to put it in its tray, and tap it again to take it out. The dots by a tray show how many cards it holds. Tap the dots of a route one at a time, starting at the bottom-left; tapping the top-right dot checks it. Tap a dot of your route to take back the taps from there. Undo takes back the last move.',
  fit: 'Tap a card to put it in A, and tap it again to take it out. Tap the dots of a route one at a time, starting at the bottom-left; tapping the top-right dot checks it. Tap a dot of your route to take back the taps from there. Undo takes back the last move.',
  cards: 'Tap a card to put it in its tray, and tap it again to take it out. The dots by a tray show how many cards it holds. Undo takes back the last move.',
  every: 'Tap a card to put it in B, and tap it again to take it out. Press That’s all when you are sure. Undo takes back the last card.',
  playground: 'Tap cards to put them in A and B, up to six in each, and tap again to take them out. Tap the dots of a route one at a time, starting at the bottom-left; tapping the top-right dot checks it.'
};
const OBJECTIVE = {
  fewest: 'Choose cards for A and B that make as few different totals as you can, then tap a route through the grid that passes every total.',
  fit: 'Choose cards for A so that one route through the grid passes every total.',
  most: 'Choose cards for A and B that make as many different totals as you can.',
  even: 'Choose evenly spaced cards for A and for B that make as many different totals as you can.',
  every: n => `Find every B of two cards that makes exactly ${n} different totals with this A. Press That’s all when none is left.`
};
const VISIBLE = {
  fewest: 'As few totals as you can, all on one route.',
  fit: 'Every total on one route.',
  most: 'As many totals as you can.',
  even: 'Both trays evenly spaced, as many totals as you can.',
  every: n => `Find every B with ${n} totals.`
};
const PREREQUISITES = {
  add: 'Recognise 0–9; the strip does the adding, and a child who adds to 18 can check it. A grown-up can read How to play.',
  route: 'Follow right and up steps on a grid, and see that a route’s totals keep growing.',
  design: 'Choose several cards with a plan in mind and keep track of which pairs share a total.',
  every: 'Keep the trays already found in mind and decide when none is left.'
};
const sources = ['sumsets-week55', 'sumsets-card55', 'sumsets-taovu'];

// check: the count of totals every solving design makes, and how many designs
// (or B trays) solve.
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two and two', mode: 'fewest', trays: {A: fixed(0, 2), B: size(2)}, check: {totals: 3, designs: 8}, prereq: 'add',
    idea: 'Pairs land on the same total when B jumps by as much as A does; a route through the grid shows no two cards can do with fewer.',
    hints: ['Which pairs could land on the same total?', 'A jumps by 2. If B jumps by 2 too, two pairs share a total.', 'Put 0 and 2 in B, then walk a route through the grid.'],
    parent: {notice: 'Whether your child picks B at random or looks for pairs that share a total, and whether they see that the route has three dots whatever B is.', prompt: 'Why can no B make fewer than three totals?', explanation: 'With A = {0, 2} and B = {b, c}, b < c, the totals 0 + b, 2 + b and 2 + c are always different: they climb along the route bottom-left, up, right (or right, then up). So there are at least three totals. Three is reached exactly when 0 + c equals 2 + b, that is, when B jumps by 2: {0, 2}, {1, 3}, up to {7, 9}, eight ways.', extension: 'In the playground, try A = {0, 3}. Which B give three totals now?', connection: 'The smallest sumset theorem: two sets of sizes m and n have at least m + n − 1 different sums.'},
    provenance: 'Week 55 Problem 1: {0, 2} + {1, 3} gives 3 totals and {0, 2} + {1, 4} gives 4; here the child chooses B.'},
  {number: 2, level: 'easy', title: 'Choose B', mode: 'most', trays: {A: fixed(0, 1, 3), B: size(3)}, check: {totals: 9, designs: 4}, prereq: 'add',
    idea: 'All nine totals are different when B’s cards are far enough apart that none of A’s jumps fits between two of them.',
    hints: ['Where do two pairs land together?', 'A’s cards are 1, 2 and 3 apart. Two B cards that close let two pairs meet.', 'Put 0, 4 and 8 in B.'],
    parent: {notice: 'Whether your child spreads B’s cards out after seeing shaded dots, or keeps adjusting one card at a time.', prompt: 'Why can’t there be more than nine totals?', explanation: 'Three A cards and three B cards make nine pairs, and each pair drops one token, so nine is the most. Two pairs a + b and a′ + b′ share a total exactly when b′ − b = a − a′, a jump inside B equal to a jump inside A. A’s jumps are 1, 2 and 3, so every jump in B must be at least 4, and three such cards fit in 0–9 four ways: {0, 4, 8}, {0, 4, 9}, {0, 5, 9} and {1, 5, 9}.', extension: 'Which B makes the fewest totals with this A? (Six, for example B = {0, 1, 3}; five would need A evenly spaced.)', connection: 'The largest sumset: |A + B| = mn exactly when the differences of A and of B never agree (a Sidon-type condition).'},
    provenance: 'Week 55 Problem 2: the third trial {0, 1, 2} + {0, 3, 6} gives 9 totals; here A is the second trial’s {0, 1, 3}, so that only four B work, and the child chooses B.'},
  {number: 3, level: 'easy', title: 'Two and three', mode: 'fewest', trays: {A: size(2), B: size(3)}, check: {totals: 4, designs: 160}, prereq: 'route',
    idea: 'With two cards in A and three in B the fewest is 4, and a route through the grid shows it.',
    hints: ['How many dots does a route through this grid pass?', 'A route has four dots, all different totals. Can every total be on it?', 'Put 0 and 1 in A and 0, 1 and 2 in B, then walk a route.'],
    parent: {notice: 'Whether your child uses a route to see how many totals they must have before trying to get fewer.', prompt: 'Could any cards make three totals?', explanation: 'A route through a 2 × 3 grid passes 2 + 3 − 1 = 4 dots, and each step adds to the total, so every choice of cards has at least four different totals. Four is reached exactly when A and B jump by the same amount: A = {a, a + d} and B = {b, b + d, b + 2d}.', extension: 'Predict the fewest for three and four cards, then try it in the playground.', connection: 'The lower bound m + n − 1, proved by one monotone path in the addition table.'},
    provenance: 'Week 55 Problem 4, the 2 + 3 sizes: “choose cards that make the fewest possible different totals”.'},
  {number: 4, level: 'medium', title: 'Three and three', mode: 'fewest', trays: {A: size(3), B: size(3)}, check: {totals: 5, designs: 120}, prereq: 'design',
    idea: 'The fewest for three and three is 5, and it needs A and B to jump by the same amount every time.',
    hints: ['Which totals must be different whatever cards you choose?', 'A route has five dots. For every total to be on it, each step around a square of the grid must give the same total either way.', 'Put 0, 1 and 2 in A and the same in B, then walk a route.'],
    parent: {notice: 'Whether your child finds that equal jumps help, and whether they try different jumps in A and B.', prompt: 'You have 5 totals and a route through all of them. Why can no cards make 4?', explanation: 'Any route through a 3 × 3 grid passes 5 dots with growing totals, so every choice has at least 5 totals. If every total is on the route, swap the route around one small square: both routes must have the same totals, so the two corners of that square hold the same total, and the jump in A there equals the jump in B. That holds for every square, so A and B are evenly spaced with one gap. 120 of the 14,400 choices of three and three cards from 0–9 do it.', extension: 'Is the fewest for four and four cards 7? Try it (puzzle 11).', connection: 'The inverse theorem: for m, n ≥ 2, |A + B| = m + n − 1 exactly when A and B are arithmetic progressions with the same difference.'},
    provenance: 'Week 55 Problem 3, “make as few different totals as you can”, with the route certificate of Problems 8 and 9.'},
  {number: 5, level: 'medium', title: 'Every B', mode: 'every', trays: {A: fixed(0, 3, 6), B: size(2)}, target: 4, check: {totals: 4, designs: 7}, prereq: 'every',
    idea: 'The B trays that give the fewest totals are exactly the ones that jump by A’s jump.',
    hints: ['Try a B: which pairs land on the same total?', 'Each one found has the same jump between its two cards.', 'Every B that jumps by 3 works: from 0 and 3 up to 6 and 9.'],
    parent: {notice: 'Whether your child finds B trays one by one at random or notices the jump of 3 and slides it along.', prompt: 'How do you know there isn’t another?', explanation: 'With B = {b, b + d}, the six pairs give A + b and A + b + d, two copies of {0, 3, 6} shifted. They overlap in two totals exactly when d = 3, A’s jump; d = 6 overlaps one total and any other jump none. So four totals means B = {t, t + 3}, and t can be 0 to 6: seven trays.', extension: 'Which B trays give five totals? (Puzzle 10.)', connection: 'The equality case of the sumset bound, found by a complete search.'},
    provenance: 'Week 55 Problem 5: A = {0, 3, 6}, every two-card B from 0–9 with four totals; no answer slots here.'},
  {number: 6, level: 'medium', title: 'Two even trays', mode: 'most', even: true, trays: {A: size(3), B: size(3)}, check: {totals: 9, designs: 160}, prereq: 'design',
    idea: 'Two evenly spaced trays need the same jump to make few totals; with different jumps they can make the most.',
    hints: ['Do evenly spaced trays always give few totals?', 'Try A jumping by 2 and B jumping by 3.', 'Put 0, 2 and 4 in A and 0, 3 and 6 in B.'],
    parent: {notice: 'Whether your child expects evenly spaced trays to give few totals, as in puzzle 4.', prompt: 'Both trays are evenly spaced. Why are all nine totals different?', explanation: 'With A = {0, 2, 4} and B = {0, 3, 6}, two pairs share a total only when a jump in B equals a jump in A. A’s jumps are 2 and 4 and B’s are 3 and 6, so none agree and all nine totals differ. Even spacing gives the fewest only when the two gaps are the same.', extension: 'Which pairs of jumps give nine totals? (Any two of 1, 2, 3, 4 where neither is the other or twice the other.)', connection: 'The inverse theorem needs one common difference; two progressions with unrelated differences give a sumset as large as possible.'},
    provenance: 'Week 55 Problem 6 and the review card’s fix 5: {0, 2, 4} + {0, 3, 6}, both equally spaced, with 9 totals.'},
  {number: 7, level: 'medium', title: 'Uneven B', mode: 'fit', trays: {A: {max: 3, start: [0, 2]}, B: fixed(0, 1, 3)}, check: {totals: 3, designs: 10}, prereq: 'route',
    idea: 'With an uneven B, every total fits on one route only when A has a single card: one card shifts B without merging any totals.',
    hints: ['Tap a route through the grid. Which total does it miss?', 'B jumps by 1 and then 2. Two A cards would need to jump by both at once.', 'After a route with two cards is refused, take cards out of A until it has just one.'],
    parent: {notice: 'Whether your child keeps trying two-card A trays, and what they make of the one-card solve. A starts with two cards, and a one-card route counts only after a route with more cards has been refused, so the solve follows a real attempt.', prompt: 'Why does one A card always work, even though B is uneven?', explanation: 'With A = {a}, the totals are a + 0, a + 1 and a + 3: B shifted by a, three different totals, and the grid is one row, so the route passes them all. With two A cards {a, a + d} there are at least four totals but a route passes only four dots; every total fits only if d equals both of B’s jumps, 1 and 2, which is impossible. So the theorem’s “evenly spaced” needs two cards in each tray.', extension: 'Is there a B tray of three cards for which some two-card A fits every total on one route? (Yes: any evenly spaced B, with A jumping by B’s gap.)', connection: 'The exception in the inverse theorem: when one set is a singleton, |A + B| = |B| for every B.'},
    provenance: 'Week 55 Problem 7: {4} + {0, 1, 3} gives 3 totals, and “Does B need equal spacing?”'},
  {number: 8, level: 'hard', title: 'Given A', mode: 'fewest', trays: {A: fixed(1, 4, 7), B: size(4)}, check: {totals: 6, designs: 1}, prereq: 'design',
    idea: 'With A evenly spaced by 3, four B cards make the fewest only when they jump by 3 too, and that fits in 0–9 one way.',
    hints: ['Which B lets every total be on one route?', 'Each step around a square of the grid must give the same total either way, so B must jump by A’s jump.', 'Put 0, 3, 6 and 9 in B, then walk a route.'],
    parent: {notice: 'Whether your child tries B jumping by 1 or 2 first, and how they see that only a jump of 3 can work.', prompt: 'Why is there only one B?', explanation: 'A route through a 3 × 4 grid passes 3 + 4 − 1 = 6 dots, so there are at least six totals. Every total on one route forces A and B to share a gap (puzzle 4), and A’s gap is 3, so B = {t, t + 3, t + 6, t + 9}; within 0–9 only t = 0 fits.', extension: 'With A = {1, 3, 5}, how many four-card B give six totals? (Four: B jumps by 2 and starts at 0, 1, 2 or 3.)', connection: 'The inverse theorem pins B down once A is given.'},
    provenance: 'New, from Week 55 Problems 4 and 5: a fixed A and a larger B with a single answer.'},
  {number: 9, level: 'hard', title: 'Many from four', mode: 'most', trays: {A: size(4), B: size(4)}, check: {totals: 16, designs: 8}, prereq: 'design',
    idea: 'Sixteen different totals from four and four cards needs every jump in A to differ from every jump in B, and 0–9 leaves very little room.',
    hints: ['Fill both trays and look at the shaded dots. Which pairs land together?', 'Two pairs share a total when a jump inside A equals a jump inside B. Give one tray small jumps and the other jumps too big for them, inside 0–9.', 'Put 0, 1, 8 and 9 in A and 0, 2, 4 and 6 in B.'],
    parent: {notice: 'Whether your child plans the jumps of each tray, or changes cards one by one after shaded dots appear.', prompt: 'Why can’t A be four cards in a row?', explanation: 'Two pairs share a total exactly when a jump inside A equals a jump inside B. Four cards in a row have jumps 1, 2 and 3, so B’s cards would all need to be at least 4 apart, which takes 12 in 0–9. The only way is A = {0, 1, 8, 9} (jumps 1, 7, 8 and 9) with B four cards two apart, or the same with A and B exchanged: 8 of the 44,100 choices.', extension: 'What is the fewest for four and four? (Puzzle 11.)', connection: 'The upper bound mn, reached when the difference sets of A and B meet only in 0.'},
    provenance: 'The Week 55 review card’s fix 4 and App fit: 4 + 4 with 16 totals, “only {0, 1, 8, 9} with four cards of gap 2”.'},
  {number: 10, level: 'hard', title: 'Every B again', mode: 'every', trays: {A: fixed(0, 3, 6), B: size(2)}, target: 5, check: {totals: 5, designs: 4}, prereq: 'every',
    idea: 'The jump inside B decides how many pairs land together: a jump A makes once gives one shared total.',
    hints: ['Which jumps in B make two pairs land together?', 'A jumps 3 twice and 6 once. A B that jumps by 3 shares two totals.', 'Every B that jumps by 6 works: from 0 and 6 up to 3 and 9.'],
    parent: {notice: 'After puzzle 5, whether your child tries jumps other than 3 and notices which one shares a single total.', prompt: 'Why does a jump of 6 share one total and a jump of 3 share two?', explanation: 'B = {b, b + d} gives A + b and A + b + d. A total is shared when a card of A plus d is another card of A. In {0, 3, 6}, adding 3 lands on another card twice (0 → 3, 3 → 6) and adding 6 once (0 → 6). So d = 6 gives 6 − 1 = 5 totals: B = {0, 6}, {1, 7}, {2, 8} or {3, 9}.', extension: 'Which two-card B give six totals with this A? (Every B whose jump is not 3 or 6.)', connection: 'The number of shared totals counts the representations of d as a difference of A, the start of additive energy.'},
    provenance: 'New, from Week 55 Problem 5’s method with a different count.'},
  {number: 11, level: 'hard', title: 'Few from four', mode: 'fewest', trays: {A: size(4), B: size(4)}, check: {totals: 7, designs: 66}, prereq: 'design',
    idea: 'The fewest for four and four is 7, and the route around every square forces one common jump.',
    hints: ['How many dots does a route through a 4 × 4 grid pass?', 'Seven. For every total to be on one route, A and B must jump by the same amount everywhere.', 'Put 0, 1, 2 and 3 in A and the same in B, then walk a route.'],
    parent: {notice: 'Whether your child predicts 7 from the route before building it.', prompt: 'Could a gap of 2 work? A gap of 3?', explanation: 'A route passes 4 + 4 − 1 = 7 dots with growing totals, so there are at least 7. Seven means every total is on one route, which forces A and B to jump by one common gap d. Gap 1: 7 starts each, 49 ways; gap 2: 4 each, 16 ways; gap 3: only {0, 3, 6, 9}, 1 way. 66 of 44,100.', extension: 'With a route and a square, explain to a grown-up why every gap must be the same.', connection: 'The inverse theorem for the smallest sumset, proved by swapping the path around one square.'},
    provenance: 'The Week 55 review card’s fix 4: 4 + 4, fewest 7.'}
];

const id = n => `sumsets-${String(n).padStart(2, '0')}`;
const kind = item => item.mode === 'most' && item.even ? 'even' : item.mode;
const out = PUZZLES.map(item => {
  const q = {mode: item.mode, trays: item.trays, ...(item.target ? {target: item.target} : {}), ...(item.even ? {even: true} : {})};
  const list = designs(q);
  assert.equal(list.length, item.check.designs, `${id(item.number)}: designs`);
  for (const d of list) assert.equal(totalsOf(d.A, d.B).length, item.check.totals, `${id(item.number)}: totals`);
  const [d] = list, k = kind(item);
  let solution;
  if (item.mode === 'every') solution = {answers: list.map(x => x.B)};
  else if (item.mode === 'most') solution = {A: d.A, B: d.B, totals: item.check.totals};
  else {
    const route = [];
    for (let j = 0; j < d.B.length; j++) route.push([0, j]);
    for (let i = 1; i < d.A.length; i++) route.push([i, d.B.length - 1]);
    solution = {A: d.A, B: d.B, totals: item.check.totals, route};
    if (item.mode === 'fit') {
      const A0 = item.trays.A.start, first = [];
      for (let j = 0; j < d.B.length; j++) first.push([0, j]);
      for (let i = 1; i < A0.length; i++) first.push([i, d.B.length - 1]);
      solution.refusedFirst = {A: A0, route: first, missed: totalsOf(A0, d.B).filter(x => !first.some(([i, j]) => A0[i] + d.B[j] === x))};
    }
  }
  const rules = [RULES.pairs, RULES.grid, ...(item.mode === 'fewest' || item.mode === 'fit' ? [RULES.route, RULES[item.mode]] : []), ...(item.mode === 'most' ? [RULES.most] : []), ...(item.even ? [RULES.even] : []), ...(item.mode === 'every' ? [RULES.every] : [])];
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Card totals', mechanic: 'sumsets', band: 'all', revision: 1, sourceDocument: 'docs/sumsets/README.md',
    parameters: q,
    objective: item.mode === 'every' ? OBJECTIVE.every(item.target) : OBJECTIVE[k], visibleObjective: item.mode === 'every' ? VISIBLE.every(item.target) : VISIBLE[k],
    instruction: item.mode === 'every' ? OBJECTIVE.every(item.target) : OBJECTIVE[k],
    controls: item.mode === 'every' ? CONTROLS.every : item.mode === 'most' ? CONTROLS.cards : item.mode === 'fit' ? CONTROLS.fit : CONTROLS.route,
    rules, idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'sumsets-playground', number: 0, title: 'Card totals playground', difficulty_level: 'playground', familyTitle: 'Card totals', mechanic: 'sumsets', band: 'playground', revision: 1, sourceDocument: 'docs/sumsets/README.md',
  parameters: {mode: 'playground', trays: {A: {max: 6}, B: {max: 6}}},
  objective: 'Put cards in A and B, watch the totals land on the strip, and tap routes through the grid.', visibleObjective: '',
  instruction: 'Put cards in A and B, watch the totals land on the strip, and tap routes through the grid.',
  controls: CONTROLS.playground,
  rules: [RULES.pairs, RULES.grid, RULES.route],
  idea: 'Free play with two trays: which cards give few totals, which give many, and what a route shows.',
  prerequisites: 'None. A grown-up or a partner can set a challenge, such as a number of totals to make.',
  hints: ['Make as few totals as you can with four cards in each tray.', 'A route through the grid has one dot fewer than the cards in A and B together.', 'Equal jumps in A and B make the fewest.'],
  parent: {notice: 'Whether your child sets challenges for someone else: a number of totals, or a tray to match.', prompt: 'Which choice of cards makes exactly 6 totals with three cards in each tray? Are there several?', explanation: 'With m and n cards there are at least m + n − 1 and at most m × n totals, and every number in between can happen for many sizes. The fewest needs A and B evenly spaced with the same jump, unless a tray has one card.', extension: 'Put one card in A. How many totals are there, whatever B is?', connection: 'Sumsets, the basic objects of additive combinatorics.', sourceIds: sources},
  provenance: 'Week 55 Problem 3’s open trials and Problem 8’s grid, without a goal.'
};
const json = {
  title: 'Card totals',
  version: 1,
  families: [{id: 'sumsets', title: 'Card totals', mathematics: 'Two trays A and B hold number cards 0–9, and each pair a + b drops a token on a strip of totals 0–18; pairs with the same total share a token, so the strip is the sumset A + B. With m cards in A and n in B there are at least m + n − 1 and at most m × n different totals. The lower bound is a route in the addition grid (A going up, B going across) from the bottom-left dot to the top-right dot, one step right or up: each step adds, so its m + n − 1 totals are all different. When every total is on one route the design has the fewest, and with m, n ≥ 2 that happens exactly when A and B are evenly spaced with the same gap (swap the route around one square). A one-card tray only shifts the other, so any B attains the bound then. The upper bound is one token per pair, reached when no jump inside A equals a jump inside B.', rules: [RULES.pairs, RULES.grid, RULES.route], sourceIds: sources}],
  sources: [
    {id: 'sumsets-week55', title: 'Bellingham Math Circle — Week 55: Few sums and equal spacing (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-55', kind: 'local curriculum'},
    {id: 'sumsets-card55', title: 'Week 55 review card and math check (sumset bounds, the inverse theorem and its one-card exception; fixes 4 and 5; App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-55.md', kind: 'local curriculum'},
    {id: 'sumsets-taovu', title: 'Terence Tao and Van Vu — Additive Combinatorics, Cambridge University Press (2006), Definition 0.1 and §2.1 (sumsets and the inverse problem), as the Week 55 guide cites; the route proof is the guide’s', url: 'https://teorth.github.io/tao-web/additive-combinatorics.html', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/sumsets/sumsets.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode}${p.parameters.even ? ' even' : ''}: ${p.parameters.mode === 'every' ? `answers ${p.solution.answers.map(b => `{${b.join(',')}}`).join(' ')}` : `A {${p.solution.A}} B {${p.solution.B}} ${p.solution.totals} totals`}`).join('\n'));
