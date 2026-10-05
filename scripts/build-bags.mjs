// Builds dist/families/bags/bags.json, the Fair bags pack, from the authoring
// list below. What each puzzle asks for is computed here from
// dist/families/bags/bags.js and checked against the list, and again, by a
// separate enumeration, in scripts/validate-bags.mjs.
// Design notes and worksheet sources: docs/bags/README.md.
import {writeFile} from 'node:fs/promises';
import {pairs, tally, isFair, fewestSkips, mostShapes, RULES} from '../dist/families/bags/bags.js';

const WEEK42 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-42';
export const sources = [
  {id: 'bags-week42', title: 'Bellingham Math Circle — Week 42: Fair results from a bag, K–1, grades 2–3 and grades 4–5 packets, bonus pages and adult guide', url: WEEK42, kind: 'local curriculum'},
  {id: 'bags-von-neumann', title: 'John von Neumann — Various techniques used in connection with random digits, in Monte Carlo Method, National Bureau of Standards Applied Mathematics Series 12 (1951), pp. 36–38', url: 'https://mcnp.lanl.gov/pdf_files/InBook_Computing_1961_Neumann_JohnVonNeumannCollectedWorks_VariousTechniquesUsedinConnectionwithRandomDigits.pdf', kind: 'paper'},
  {id: 'bags-wikipedia', title: 'Wikipedia — Fair coin: fair results from a biased coin (von Neumann’s procedure)', url: 'https://en.wikipedia.org/wiki/Fair_coin#Fair_results_from_a_biased_coin', kind: 'reference'}
];
export const family = {
  id: 'bags',
  title: 'Fair bags',
  mathematics: 'Two counters are drawn in order from a bag of r red and b blue, each counter as likely as any other and the first put back. The (r + b)² marked pairs, such as red 2 then blue 1, are equally likely; the colour pairs are not: red-red, red-blue, blue-red and blue-blue come r², rb, br and b² ways. A rule gives each colour pair a square, a circle or a skip, and it is fair when squares and circles come equally often and both can come. Since red-blue and blue-red always tie, square for red-blue and circle for blue-red is fair for every bag with both colours (von Neumann’s trick), skipping r² + b² of the pairs. A rule skips fewer only when other sums tie, such as r² = 2rb when there are twice as many red as blue. Drawing without putting back changes the counts (no counter twice, so red-red comes r(r − 1) ways) but red-blue and blue-red still tie; drawing the second counter from a different bag can break that tie.',
  rules: [
    'A bag holds numbered red and blue counters.',
    'Two counters are drawn in order, each counter as likely as any other. The first goes back before the second is drawn.',
    'A rule gives each colour pair a square, a circle or a skip. It is fair when squares and circles come equally often, and at least one of each.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES_TEXT = family.rules;
const RULE = 'Tap a square, a circle or a skip beside each colour pair. Every pair of counters moves to its shape.';
const W = ['bags-week42'];
const pairsOf = q => pairs(q.first, q.second || q.first, Boolean(q.distinct));
const solving = q => RULES.filter(r => { const t = tally(pairsOf(q), r); return isFair(t) && (q.goal === 'fair' || t.X === (q.goal === 'noskip' ? 0 : fewestSkips(pairsOf(q)))); });

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Every pair',
    parameters: {mode: 'pairs', first: 'RRB'},
    objective: 'Keep every pair.',
    idea: 'A first draw and a second draw: 3 choices, then 3 again, so 9 marked pairs, each equally likely.',
    prerequisites: 'Tell red from blue and read the numbers 1 and 2. No reading once a grown-up has read the goal.',
    hints: ['Tap a counter, then another. The same one twice is allowed.', 'Each column holds the pairs that start with its counter.', 'Every column fills with three pairs.'],
    parent: {
      notice: 'The pairs are red 1 or red 2 or blue 1, then any of the three again: 9 in all, three in each column. Red then red happens 4 ways, red then blue 2, blue then red 2, blue then blue 1.',
      prompt: 'Which colour pair has the most pictures? Which two have the same number?',
      explanation: 'Each counter is as likely as any other on each draw, so each of the 9 marked pairs is as likely as any other. Grouping them by colour gives 4, 2, 2 and 1: the colour pairs are not equally likely, but red-blue and blue-red tie.',
      extension: 'How many pairs would three red and one blue make? (16.)',
      connection: 'Week 42 K–1 Problem 3 and grades 2–3 Problem 2: every equally likely labelled pair.'
    },
    provenance: 'Week 42 K–1 Problem 3 and grades 2–3 Problem 2 list the 16 marked pairs of R1, R2, R3 and B; this puzzle uses a smaller bag of two red and one blue.',
    sourceIds: W,
    expect: 9
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Two of each',
    parameters: {mode: 'rule', first: 'RRBB', goal: 'noskip'},
    objective: 'Make a fair rule that skips nothing.',
    idea: 'With two of each colour, every colour pair comes 4 ways, so any two colour pairs against the other two is fair.',
    prerequisites: 'Puzzle 1.',
    hints: ['Watch the square and circle piles as you choose.', 'Each colour pair brings four pairs of counters.', 'Give two colour pairs the square and two the circle.'],
    parent: {
      notice: 'Six rules work: any two colour pairs get the square and the other two the circle, 8 pairs each. "The first counter’s colour decides" is one of them.',
      prompt: 'Why does any two-against-two choice work here?',
      explanation: 'With two red and two blue, each colour pair (red-red, red-blue, blue-red, blue-blue) comes 2 × 2 = 4 ways out of 16, so any two of them make 8.',
      extension: 'Does "the first counter’s colour decides" stay fair with three red and one blue?',
      connection: 'Week 42 K–1 Problem 4 and grades 2–3 Problem 3: the two-red, two-blue bag.'
    },
    provenance: 'Week 42 K–1 Problem 4 and grades 2–3 Problem 3 (the two-red, two-blue bag), and grades 2–3 Problem 7’s question of a rule that never skips.',
    sourceIds: W,
    expect: 6
  },
  {
    number: 3, difficulty_level: 'medium', title: 'Three red, one blue',
    parameters: {mode: 'rule', first: 'RRRB', goal: 'fair', start: 'SSCC'},
    objective: 'Make a fair rule.',
    idea: 'Red-red comes 9 ways, red-blue 3, blue-red 3 and blue-blue 1: only red-blue against blue-red ties.',
    prerequisites: 'Puzzle 2.',
    hints: ['Which colour pairs bring the same number of pairs of counters?', 'Red then blue and blue then red bring three each.', 'Give red then blue the square, blue then red the circle, and skip the rest.'],
    parent: {
      notice: 'The puzzle starts with “the first counter’s colour decides”, which gives 12 squares and 4 circles. Only two rules are fair: red-blue against blue-red, either way round. Both skip 10 of the 16 pairs.',
      prompt: 'Could a fair rule here skip fewer than 10 pairs?',
      explanation: 'The colour pairs come 9, 3, 3 and 1 ways. The square and circle need equal totals: 9 is more than the other three together, so red-red is skipped; of 3, 3 and 1, only 3 against 3 ties (3 + 1 is not 3), so blue-blue is skipped too.',
      extension: 'Does the same rule work for one red and three blue? For any bag with both colours?',
      connection: 'Von Neumann’s trick (1951): red-blue and blue-red always come equally often.'
    },
    provenance: 'Week 42 grades 2–3 Problems 1–2, grades 4–5 Problems 1–2 and K–1 Problems 2–3: a fair rule for three red and one blue, checked with the 16 marked pairs.',
    sourceIds: [...W, 'bags-von-neumann'],
    expect: 2
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Busiest bag',
    parameters: {mode: 'busiest', size: 4, start: 'RRRB', rule: 'XSCX'},
    objective: 'Make the skip pile as small as you can.',
    idea: 'With r red among four counters, red-blue and blue-red come 2r(4 − r) of 16 ways, most at two of each.',
    prerequisites: 'Puzzle 3.',
    hints: ['Watch the skip pile as you change colours.', 'Which bag puts the most pairs on a square or a circle?', 'Two red and two blue.'],
    parent: {
      notice: 'Two red and two blue give 8 shapes in 16 pairs; one or three red give 6; all one colour gives none.',
      prompt: 'Why is half the most this rule can give?',
      explanation: 'Red-blue comes r × b ways and blue-red b × r, so shapes come 2rb ways. With r + b = 4, rb is largest when r = b = 2: 2 × 2 × 2 = 8 of 16.',
      extension: 'With five counters, which bags are busiest?',
      connection: 'Week 42 K–1 Problem 5 and grades 2–3 Problem 4: which bag makes shapes come out most often.'
    },
    provenance: 'Week 42 K–1 Problem 5 and grades 2–3 Problem 4: choose a four-counter bag that makes shapes come out as often as possible.',
    sourceIds: W,
    expect: 8
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Two different counters',
    parameters: {mode: 'rule', first: 'RRRB', distinct: true, goal: 'noskip'},
    objective: 'With the first counter kept out, make a fair rule that skips nothing.',
    rules: [family.rules[0], 'Two counters are drawn in order, each as likely as any other left in the bag. The first stays out, so the two are always different.', family.rules[2]],
    idea: 'Without putting back there are 12 pairs: red-red 6, red-blue 3, blue-red 3 and no blue-blue, so red-red against the mixed pairs skips nothing.',
    prerequisites: 'Puzzle 3.',
    hints: ['Which pairs are missing now?', 'Red-red brings six pairs; the two mixed colour pairs bring three each.', 'Give red-red one shape and both mixed pairs the other.'],
    parent: {
      notice: 'Red-red against red-blue and blue-red, 6 against 6, skips nothing. Blue-blue can’t happen, so its choice doesn’t matter: six rules work.',
      prompt: 'Why can’t blue then blue happen any more?',
      explanation: 'The first counter stays out, so the 4 × 3 = 12 pairs never repeat a counter. With one blue, blue-blue is gone; red-red loses its three repeats and comes 3 × 2 = 6 ways.',
      extension: 'With two red and two blue, drawn without putting back, which rules are fair?',
      connection: 'Week 42 grades 4–5 Problem 6: return both counters only after drawing a pair.'
    },
    provenance: 'Week 42 grades 4–5 Problem 6: draw both counters before returning them, with three red and one blue.',
    sourceIds: W,
    expect: 6
  },
  {
    number: 6, difficulty_level: 'hard', title: 'Fewest skips',
    parameters: {mode: 'rule', first: 'RRB', goal: 'fewest', start: 'SSCC'},
    objective: 'Make a fair rule with the skip pile as small as you can.',
    idea: 'Red-red comes 4 ways, red-blue 2, blue-red 2, blue-blue 1. Red-blue against blue-red skips 5; red-red against both mixed pairs skips only 1.',
    prerequisites: 'Puzzle 3.',
    hints: ['Red-blue against blue-red is fair. Can a fair rule skip less?', 'Red-red brings four pairs. What else makes four?', 'Give red-red one shape and both mixed pairs the other; skip blue-blue.'],
    parent: {
      notice: 'The fewest skips is 1: red-red against red-blue and blue-red, 4 against 4, skipping blue-blue.',
      prompt: 'Why can’t a fair rule skip nothing here?',
      explanation: 'The colour pairs come 4, 2, 2 and 1 ways, 9 in all. A rule that skips nothing splits 9 into two equal parts, which is impossible, so at least one pair is skipped; skipping blue-blue leaves 4 against 2 + 2.',
      extension: 'For which bags does red-red against the two mixed pairs work? (Twice as many red as blue.)',
      connection: 'Week 42 grades 4–5 Problem 4: the smallest number of labelled pairs a fair rule must skip.'
    },
    provenance: 'Week 42 grades 4–5 Problem 4 asks for the fewest skips with three red and one blue (10); this puzzle uses two red and one blue, where a better rule than von Neumann’s exists.',
    sourceIds: [...W, 'bags-von-neumann'],
    expect: 2
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Two bags',
    parameters: {mode: 'rule', first: 'RRRB', second: 'RBBB', goal: 'fair', start: 'SSCC'},
    objective: 'Make a fair rule for these two bags.',
    rules: [family.rules[0], 'The first counter comes from the 1st bag and the second from the 2nd, each counter as likely as any other in its bag.', family.rules[2]],
    idea: 'Red-blue now comes 3 × 3 = 9 ways and blue-red 1 × 1 = 1: von Neumann’s trick fails. Red-red and blue-blue come 3 ways each.',
    prerequisites: 'Puzzle 3.',
    hints: ['Try red then blue against blue then red. Are the piles even?', 'Which two colour pairs bring three pairs each now?', 'Give red-red the square, blue-blue the circle, and skip the mixed pairs.'],
    parent: {
      notice: 'Red-blue against blue-red gives 9 against 1. The fair rules put red-red against blue-blue, 3 against 3.',
      prompt: 'Why does the red-blue trick fail with these two bags?',
      explanation: 'Red then blue comes (reds in bag 1) × (blues in bag 2) ways and blue then red (blues in bag 1) × (reds in bag 2). These match when both draws come from one bag, as r × b = b × r, but here they are 3 × 3 and 1 × 1.',
      extension: 'Find two different bags where red-blue against blue-red is still fair. (Any two with the same share of red, such as one red and one blue, then two red and two blue.)',
      connection: 'Week 42 grades 2–3 Problem 5 and grades 4–5 Problem 5: change bags between draws.'
    },
    provenance: 'Week 42 grades 2–3 Problem 5 and grades 4–5 Problem 5: first draw from three red and one blue, second from one red and three blue.',
    sourceIds: W,
    expect: 2
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Fewest skips, six counters',
    parameters: {mode: 'rule', first: 'RRRRBB', goal: 'fewest', start: 'SSCC'},
    objective: 'Make a fair rule with the skip pile as small as you can.',
    idea: 'Red-red 16, red-blue 8, blue-red 8, blue-blue 4 of 36: red-red against both mixed pairs skips only 4.',
    prerequisites: 'Puzzle 6.',
    hints: ['Red-blue against blue-red skips 20. Can you do better?', 'Red-red brings sixteen pairs. Which two colour pairs make sixteen together?', 'Give red-red one shape and both mixed pairs the other; skip blue-blue.'],
    parent: {
      notice: 'The fewest skips is 4: red-red (16) against red-blue and blue-red (8 + 8).',
      prompt: 'Puzzle 6 had two red and one blue; this bag has four and two. Why does the same rule work?',
      explanation: 'Red-red comes r² ways and the two mixed pairs 2rb together; these tie when r = 2b. Then only blue-blue, b² of the (r + b)² pairs, is skipped.',
      extension: 'Can any bag with both colours have a fair rule that skips nothing? (Only when red and blue are equal.)',
      connection: 'Week 42 grades 4–5 Problem 4: the fewest skips, here for a bag where von Neumann’s rule is not the best.'
    },
    provenance: 'New instance of Week 42 grades 4–5 Problem 4’s fewest-skips question, with four red and two blue.',
    sourceIds: [...W, 'bags-von-neumann'],
    expect: 2
  }
];

const playground = {
  id: 'bags-playground', number: 0, title: 'Fair bags playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Fill a bag, choose a rule and draw.',
  controls: 'Tap a counter to change its colour; + and − add or take away a counter. Choose a square, a circle or a skip for each colour pair. Draw takes one random pair and Draw 10 takes ten; each lands on its shape. Clear empties the piles.',
  rules: RULES_TEXT,
  idea: 'Free play: random pairs from any bag of two to six counters under any rule.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Try red then blue against blue then red with a lopsided bag.', 'Draw 10 a few times. Are the piles even?', 'Change the bag. Does the rule stay fair?'],
  parent: {
    notice: 'Random draws pile up unevenly even for a fair rule: with the starting bag and rule, twenty draws leave the square and circle piles three or more apart about a third of the time.',
    prompt: 'Can a few draws prove a rule is fair, or unfair?',
    explanation: 'A run of draws only suggests. The puzzles settle fairness exactly, with every equally likely pair.',
    extension: 'With the red-blue rule and a lopsided bag, how many draws does it take, on average, to get one shape?',
    connection: 'Week 42 K–1 Problem 6 and grades 4–5 Problem 7: what a fair rule can and can’t promise in six pairs.'
  },
  provenance: 'Week 42 materials: a bag, red and blue counters, and the shape rule.',
  sourceIds: W
};

const puzzles = [playground, ...authored].map(({expect, sourceIds, parent, ...p}) => {
  const q = p.parameters;
  // Find-every: the pairs to keep. A rule: the rules that solve. Busiest: the most shapes.
  const count = q.mode === 'pairs' ? pairsOf(q).length : q.mode === 'busiest' ? mostShapes(q.size, q.rule) : q.mode === 'rule' ? solving(q).length : undefined;
  if (expect !== undefined && count !== expect) throw Error(`${p.number}: ${count}, not ${expect}`);
  const controls = q.mode === 'playground' ? p.controls
    : q.mode === 'pairs' ? 'Tap a counter, then another (the same one again is allowed). Keep puts the pair on the shelf; Again puts both back without keeping them. Press That’s all when every one is there.'
    : q.mode === 'busiest' ? 'Tap a counter to change its colour. Every pair of counters moves to its shape. Press Done when shapes come as often as they can.'
    : q.goal === 'fewest' ? `${RULE} Press Done when you can’t skip fewer.` : RULE;
  return {
    id: q.mode === 'playground' ? p.id : `bags-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'bags', familyTitle: family.title, revision: 1, parameters: q,
    objective: p.objective, instruction: p.objective, controls, rules: p.rules || RULES_TEXT,
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...parent, sourceIds}, provenance: p.provenance, sourceDocument: 'docs/bags/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/bags/bags.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
