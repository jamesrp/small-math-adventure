// Builds dist/families/secrets/secrets.json, the Signal Lanterns slippery
// secrets group, from the authoring list below. Each puzzle's answer (whether
// a budget can always work, the fewest questions or tests) is computed here by
// the module's exact search (dist/families/secrets/secrets.js) and checked
// again by scripts/validate-secrets.mjs with a separate search. Design notes
// and sources: docs/secrets/README.md.
import {writeFile} from 'node:fs/promises';
import {need, words, askNeed, workingSets} from '../dist/families/secrets/secrets.js';

const WEEK6 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-06';
export const sources = [
  {id: 'secrets-week06', title: 'Bellingham Math Circle — Week 6: Code breaking, packets and adult guide', url: WEEK6, kind: 'local curriculum'},
  {id: 'secrets-coins', title: 'B. Lindström — On a combinatory detection problem I, Magyar Tud. Akad. Mat. Kutató Int. Közl. 9 (1964); D. G. Cantor and W. H. Mills — Determination of a subset from certain combinatorial properties, Canadian Journal of Mathematics 18 (1966)', url: 'https://doi.org/10.4153/CJM-1966-007-2', kind: 'research'},
  {id: 'secrets-cube', title: 'J. Cáceres et al. — On the metric dimension of Cartesian products of graphs, SIAM Journal on Discrete Mathematics 21 (2007)', url: 'https://doi.org/10.1137/050641867', kind: 'research'}
];
export const family = {
  id: 'secrets',
  title: 'Signal Lanterns slippery secrets',
  mathematics: 'A secret may change at any time to anything that fits every answer so far, so a way of asking wins only if it always works: the slippery secret is the worst case made visible. k yes-or-no answers form at most 2^k answer rows, so k questions always find one of 2^k things and can never find one of more (8 shapes need 3, 20 numbers need 5); halving achieves it, and so do questions planned ahead, which give every thing its own row of answers, a binary code. A test of n lanterns scores the number of places where it matches the secret. It has n + 1 possible scores, yet for 2, 3 and 4 lanterns n tests are needed and enough: after any first test the secret can hide among rows the next tests cannot separate. For 5 lanterns 4 tests suffice, even planned ahead, and for long rows about 2n/log₂ n do (the coin-weighing problem). Ending only on a full match costs one more test.',
  rules: [
    'The secret may change at any time, but only to one that fits every answer so far.'
  ],
  sourceIds: sources.map(s => s.id)
};

const SLIPPERY = family.rules[0];
const ASK_RULES = noun => [`A secret hides among the ${noun}.`, `A question asks whether the secret is one of the ${noun} you choose. The answer is yes or no.`, SLIPPERY];
const TEST_RULES = (n, hit) => [
  `The secret is a row of ${n} lanterns, each lit or dark.`,
  'A test is a row you choose. Its score is the number of places where it matches the secret: lit under lit or dark under dark.',
  SLIPPERY.replace('every answer', 'every score'),
  hit ? `A round ends when a test scores ${n}, or when the tests run out.` : 'When you are sure, say the secret. Saying it while another secret still fits loses the round.'
];
const PLAN_TEST_RULES = (n, k) => [...TEST_RULES(n, false).slice(0, 3), `Choose all ${['', 'one', 'two', 'three', 'four', 'five'][k]} tests before hearing any score.`];
const CLAIM = noun => ` After a round, you may say that many ${noun} can’t always do it.`;
function controls(q) {
  const noun = q.items === 'numbers' ? 'numbers' : 'shapes';
  if (q.mode === 'plantest') return 'Tap lanterns in each test to light them or put them out. Test them all to hear every score at once; Again lets you change the tests.';
  if (q.mode === 'plan') return `Choose a question by its number, then tap the ${noun} it asks about. The small lanterns under each one show its answers: lit for yes. Ask them all to hear every answer at once; Again lets you change the questions.`;
  const pick = q.goal === 'fewest' ? `Choose how many ${q.mode === 'ask' ? 'questions' : 'tests'} first. ` : '';
  const claim = q.goal === 'find' ? '' : CLAIM(q.mode === 'ask' ? 'questions' : 'tests');
  if (q.mode === 'ask') return `${pick}Tap ${noun} to choose them, then ask “Is it one of these?”. Answers light up above: lit for yes. ${noun[0].toUpperCase()}${noun.slice(1)} that no longer fit fade. A round ends when one is left or the questions run out; Again starts a new round.${claim}`;
  return `${pick}Tap lanterns to light them or put them out, then Test. The score appears beside the test.${q.hit ? '' : ' When you are sure, set the secret’s lanterns and press That’s the secret.'} Again starts a new round.${claim}`;
}
const ask = (items, count, budgets, goal) => ({mode: 'ask', items, count, budgets, goal});
const test = (length, budgets, goal, hit = false) => ({mode: 'test', length, budgets, goal, hit});

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Four shapes',
    parameters: ask('shapes', 4, [2], 'find'),
    objective: 'A secret shape hides among four. Ask yes-or-no questions (“Is it one of these?”) and be sure which shape it is within two questions. The secret may change, but only to one that fits every answer so far.',
    visibleObjective: 'Be sure which shape is the secret.',
    idea: 'Two yes-or-no answers make four answer pairs, one for each shape, so each question must split what is left in half.',
    prerequisites: 'Tap to choose. Nothing to read but the goal; a grown-up can read the question button aloud.',
    hints: ['Tap some shapes, then ask whether the secret is one of them.', 'If you ask about one shape, the secret can hide among the other three.', 'Ask about two shapes first.'],
    parent: {
      notice: 'Whether your child asks about one shape at a time at first, and what changes after a lost round.',
      prompt: 'Which first question leaves the fewest shapes, whatever the answer?',
      explanation: 'Asking about one shape leaves three when the answer is no, and one more question cannot always split three. Asking about two leaves two either way, and the second question splits them.',
      extension: 'With three questions, how many shapes could you always sort out?',
      connection: 'Each question at best halves the possibilities, so k questions sort out 2^k things.'
    },
    provenance: 'Week 6 K–1 Problem 1 (four pattern blocks, two questions), with shapes in place of blocks.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Eight shapes',
    parameters: ask('shapes', 8, [3], 'find'),
    objective: 'A secret shape hides among eight. Be sure which shape it is within three yes-or-no questions.',
    visibleObjective: 'Be sure which shape is the secret.',
    idea: 'Three questions, each halving what is left: 8, 4, 2, 1.',
    prerequisites: 'Slippery secrets puzzle 1.',
    hints: ['Ask about half of the shapes that are left.', 'After a no, the secret is among the shapes you didn’t choose.', 'Ask about four shapes, then two, then one.'],
    parent: {
      notice: 'Whether your child chooses half of what remains each time.',
      prompt: 'Why does half work best?',
      explanation: 'Whatever the answer, the secret is on the side it chose, and the slippery secret chooses the bigger side. Halving means each answer leaves at most half: 8, 4, 2, 1. Any other split lets the secret keep more.',
      extension: 'Could you write all three questions down before hearing any answer? (Slippery secrets puzzle 8.)',
      connection: 'Binary search. The three answers form a row of three lanterns for each shape.'
    },
    provenance: 'Week 6 K–1 Problem 3 and grades 2–3 Problem 2 (eight blocks in three questions).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Two lanterns',
    parameters: test(2, [2], 'find'),
    objective: 'The secret is a row of two lanterns, each lit or dark. Test a row: its score is the number of places where it matches the secret. Be sure of the secret within two tests, then set it and say so. The secret may change, but only to one that fits every score so far.',
    visibleObjective: 'Be sure of the secret in two tests.',
    idea: 'One test scores 0, 1 or 2, and a score of 1 fits two secrets, so a second test is needed. Changing one lantern from the first test tells those two apart.',
    prerequisites: 'Count matching places in two short rows. A grown-up can explain the score with the first test.',
    hints: ['Test any row. A score of 2 means your row is the secret; 0 means the opposite row.', 'A score of 1 means one lantern matches. Which one?', 'Change one lantern and test again.'],
    parent: {
      notice: 'Whether your child uses a score of 0: every lantern is the other way.',
      prompt: 'After a score of 1, what could the secret be?',
      explanation: 'There are four secrets. A test scores 2 for one of them, 0 for its opposite and 1 for the other two, so the slippery secret answers 1 and one test is never enough. A second test that changes one lantern scores those two differently.',
      extension: 'How many tests for three lanterns?',
      connection: 'A score is the number of lanterns minus the Hamming distance between the test and the secret.'
    },
    provenance: 'Week 6 K–1 Problem 6 and grades 2–3 Problems 4 and 5 (the two-counter code game).'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Eight shapes, two questions',
    parameters: ask('shapes', 8, [2], 'decide'),
    objective: 'A secret shape hides among eight. Is there a way to be sure which it is with only two yes-or-no questions? Find a way, or play a round and say two questions can’t always do it.',
    visibleObjective: 'Can two questions always find it?',
    idea: 'Two answers make only four answer pairs, so two of the eight shapes share a pair and the secret can be either.',
    prerequisites: 'Slippery secrets puzzle 2.',
    hints: ['Play a round. How many shapes can still be the secret at the end?', 'Count the possible answer pairs: yes yes, yes no, no yes, no no.', 'Eight shapes and four answer pairs: some two shapes share one.'],
    parent: {
      notice: 'Whether your child plays a few rounds with different questions before deciding.',
      prompt: 'How do you know no way works, not just your way?',
      explanation: 'Whatever two questions you ask, there are only four possible pairs of answers. Eight shapes in four answer pairs means some pair fits two shapes, and the secret can be either of them.',
      extension: 'How many shapes can two questions always sort out? Four questions?',
      connection: 'The pigeonhole principle: k yes-or-no answers tell apart at most 2^k things.'
    },
    provenance: 'Week 6 K–1 Problem 4 and grades 2–3 Problem 3 (can two questions be enough?).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Three lanterns',
    parameters: test(3, [3], 'find'),
    objective: 'The secret is a row of three lanterns. Be sure of it within three tests, then set it and say so.',
    visibleObjective: 'Be sure of the secret in three tests.',
    idea: 'Test all dark to count the dark lanterns, then light one lantern at a time: each score says whether that lantern is lit. Two such tests and the count give the third.',
    prerequisites: 'Slippery secrets puzzle 3.',
    hints: ['Test all dark. The score is the number of dark lanterns in the secret.', 'Now light just the first lantern. Did the score go up or down?', 'Each one-lantern change tells you that lantern; the first score tells you the last one.'],
    parent: {
      notice: 'Whether your child changes one lantern at a time and compares scores.',
      prompt: 'What does it mean when the score goes up by one?',
      explanation: 'Changing one lantern changes the score by exactly one: up if the new state matches the secret there, down if not. So all dark, then lantern 1 lit, then lantern 2 lit, tell lanterns 1 and 2, and the first score, the number of dark lanterns, gives lantern 3.',
      extension: 'Could you choose all three tests before hearing any score? (Slippery secrets puzzle 9.)',
      connection: 'For three lanterns, tests chosen ahead do as well as tests chosen one at a time.'
    },
    provenance: 'Week 6 grades 2–3 Problems 6 and 8 and grades 4–5 Problems 2 and 4 (three counters in three tests).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Three lanterns, two tests',
    parameters: test(3, [2], 'decide'),
    objective: 'The secret is a row of three lanterns. Is there a way to be sure of it in two tests? Find a way, or play a round and say two tests can’t always do it.',
    visibleObjective: 'Can two tests always find it?',
    idea: 'After any first test the secret can be one of the three rows that differ from the test in exactly one place, and a second test gives those three only two different scores.',
    prerequisites: 'Slippery secrets puzzle 5.',
    hints: ['Play a round and look at what still fits at the end.', 'After your first test, which three secrets score one less than a full match?', 'Any second test gives those three only two different scores.'],
    parent: {
      notice: 'Whether your child notices which secrets keep surviving.',
      prompt: 'Why can’t any second test tell those three apart?',
      explanation: 'Three of the eight secrets differ from the first test in exactly one place, and the slippery secret keeps them. If the secret were the first test itself, a second test would get some score. Each of the three differs from the first test in one place, so it scores one more or one less than that, depending only on whether the second test also differs from the first there. Two scores for three secrets: two of them always share a score.',
      extension: 'Two tests have 4 × 4 = 16 possible score pairs, more than the 8 secrets. Why isn’t that enough?',
      connection: 'Counting answers gives a lower bound that need not be the truth; the structure of the scores matters.'
    },
    provenance: 'Week 6 grades 4–5 Problem 8 (two tests are not always enough for three counters); grades 2–3 Problem 5 asks the same for two counters and one test.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Numbers to twenty',
    parameters: ask('numbers', 20, [3, 4, 5, 6], 'fewest'),
    objective: 'A secret number from 1 to 20. Find the fewest yes-or-no questions that always find it: be sure of it with that many, and say when one fewer can’t always do it.',
    visibleObjective: 'Use as few questions as you can.',
    idea: 'Four answers make only 16 answer rows, fewer than 20 numbers; five questions halve 20, 10, 5, 3, 2, 1.',
    prerequisites: 'Slippery secrets puzzles 2 and 4. Numbers to 20.',
    hints: ['Choose how many questions, then play a round.', 'Each question can at best halve what is left. How many halvings bring 20 down to 1?', 'Four questions give 16 answer rows; 20 numbers need five.'],
    parent: {
      notice: 'Whether your child asks about ranges (1 to 10) or other halves, and whether they try four before claiming.',
      prompt: 'Why are five needed when four work for 16?',
      explanation: 'With k questions the answers form 2^k rows of yes and no. 2^4 = 16 is less than 20, so two numbers share a row and the secret can be either. Five questions give 32 rows, and halving each time (20, 10, 5, 3, 2, 1) works.',
      extension: 'What is the largest set of numbers that five questions always sort out?',
      connection: 'The fewest questions is the base-2 logarithm of 20 rounded up: an information-theoretic bound.'
    },
    provenance: 'Week 6 grades 4–5 Problem 1 (a number from 1 to 16, then from 1 to 20).'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Questions planned ahead',
    parameters: {mode: 'plan', items: 'shapes', count: 8, questions: 3},
    rules: [...ASK_RULES('shapes'), 'Choose all three questions before hearing any answer.'],
    objective: 'Choose all three questions before any answer: for each question, pick the shapes it asks about. Then hear all three answers at once. Make questions that always tell which shape is the secret.',
    visibleObjective: 'Choose all three questions first.',
    idea: 'Each shape gets a row of three answers. The questions work exactly when all eight rows differ, so every row of three lanterns is used once.',
    prerequisites: 'Slippery secrets puzzle 2.',
    hints: ['The small lanterns under each shape show its answers: lit for yes.', 'Two shapes with the same row of answers can’t be told apart.', 'There are exactly eight rows of three lanterns. Give each shape a different one.'],
    parent: {
      notice: 'Whether your child reads the small lantern rows, or reasons about the questions one at a time.',
      prompt: 'Why must every row of three lanterns be used?',
      explanation: 'Planned questions give each shape a fixed row of answers. If two shapes share a row, the secret can be either. There are exactly 2 × 2 × 2 = 8 rows, so eight shapes need all eight. For example, question 1 asks about the top row of shapes, question 2 about the first two shapes in each row, and question 3 about the first and third.',
      extension: 'Can two planned questions always sort out four shapes? Five?',
      connection: 'Planned yes-or-no questions are a binary code: numbering the shapes 0 to 7 in base 2 gives one set of questions.'
    },
    provenance: 'Week 6 grades 2–3 Problem 2 (write questions someone else could use). Planning all questions ahead is new.'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Three lanterns planned ahead',
    parameters: {mode: 'plantest', length: 3, tests: 3},
    rules: PLAN_TEST_RULES(3, 3),
    objective: 'The secret is a row of three lanterns. Choose all three tests before any score, then hear every score at once. Make tests that always tell which row is the secret.',
    visibleObjective: 'Choose all three tests first.',
    idea: 'Planned tests give each of the eight secrets a list of three scores, and they work exactly when all eight lists differ. The way from puzzle 5 (all dark, then lantern 1 lit, then lantern 2 lit) never waited for a score, so it works planned.',
    prerequisites: 'Slippery secrets puzzles 5 and 8.',
    hints: ['Set all three tests, then test them all. If two rows share every score, they show what to change.', 'What does the score of an all-dark test count?', 'Try all dark, then only lantern 1 lit, then only lantern 2 lit.'],
    parent: {
      notice: 'Whether your child starts from the way that worked in puzzle 5, and whether they use the two rows shown after a failed plan to change a test.',
      prompt: 'Why can these tests be chosen before hearing any score?',
      explanation: 'In puzzle 5 the next test never depended on a score, so the same tests can be written down ahead: all dark counts the dark lanterns; a test with only lantern 1 lit scores one more than all dark when lantern 1 is lit in the secret and one less when it is dark; the same for lantern 2; and the count gives lantern 3. Lighting a different single lantern in each of the three tests also works. Planned tests work exactly when no two of the eight secrets get the same three scores; 32 of the 56 sets of three different tests do.',
      extension: 'Can three planned tests ever work for four lanterns?',
      connection: 'Tests whose scores tell every secret apart form a resolving set of the cube; the fewest is its metric dimension: 1, 2, 3, 4 and 4 for 1 to 5 lanterns.'
    },
    provenance: 'Week 6 grades 2–3 Problem 8 and grades 4–5 Problem 4 (a way to know a three-counter secret in three tests, written so someone else could use it). Choosing every test before any score is new.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Four lanterns',
    parameters: test(4, [2, 3, 4, 5], 'fewest'),
    objective: 'The secret is a row of four lanterns. Find the fewest tests that always find it: be sure of it with that many, and say when one fewer can’t always do it.',
    visibleObjective: 'Use as few tests as you can.',
    idea: 'Four tests always work. Three never do: after the first test the secret hides among the six rows two changes away, the best second test leaves four of them, and no third test separates those four.',
    prerequisites: 'Slippery secrets puzzles 5 and 6.',
    hints: ['Choose how many tests, then play a round.', 'Changing one lantern at a time works with four tests. Try three and watch what still fits.', 'Three tests can’t always do it; four can.'],
    parent: {
      notice: 'Whether your child tries several different second tests with three before claiming.',
      prompt: 'Three tests give 5 × 5 × 5 = 125 possible score lists for 16 secrets. Why aren’t they enough?',
      explanation: 'After any first test the secret keeps the six rows that differ from it in two places. A second test scores each of those by how many of their two places it also differs from the first test in: 0, 1 or 2. So some score keeps at least three of the six (they split 3 and 3, or 1, 4 and 1). A third test scores those in the same way, and three or four such rows never all get different scores, so two still fit. Four tests are enough: all dark counts the dark lanterns, and lighting one lantern at a time reveals three of them.',
      extension: 'Choose four tests ahead of time that always work.',
      connection: 'The fewest tests chosen ahead for n lanterns is the metric dimension of the n-cube: 1, 2, 3, 4 and 4 for 1 to 5 lanterns.'
    },
    provenance: 'Week 6 grades 2–3 Problems 10 and 11 and grades 4–5 Problems 5, 6 and 9 (four counters; can three tests be enough?).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Light all three',
    parameters: test(3, [2, 3, 4, 5], 'fewest', true),
    objective: 'The secret is a row of three lanterns, and a round ends only when a test scores 3. Find the fewest tests that always get a 3: do it with that many, and say when one fewer can’t always do it.',
    visibleObjective: 'Get a 3 with as few tests as you can.',
    idea: 'The secret lets a test score 3 only when it is the one row left, so you must know the secret before the last test: three tests to know it, one more to light it.',
    prerequisites: 'Slippery secrets puzzles 5 and 6.',
    hints: ['Choose how many tests, then play a round.', 'A test can only score 3 once you are sure of the secret.', 'Three tests find the secret and a fourth lights it. Can three ever be enough?'],
    parent: {
      notice: 'Whether your child sees this game as the last one plus one more test.',
      prompt: 'Why can’t three tests always end the game?',
      explanation: 'The slippery secret lets a test score 3 only when that row is the one secret left. So before the last test you must already know the secret, and knowing a three-lantern secret takes three tests (puzzle 6). Three tests to know it, then one to light it: four.',
      extension: 'With four lanterns, how many tests to be sure of scoring 4?',
      connection: 'Two-colour Mastermind with only exact-match scores, where the game ends on a full match.'
    },
    provenance: 'Week 6 grades 2–3 Problem 9 and grades 4–5 Problem 10 (the game ends only when a test scores 3).'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Five lanterns, four tests',
    parameters: test(5, [4], 'decide'),
    objective: 'The secret is a row of five lanterns. Is there a way to be sure of it in only four tests? Find a way, or play a round and say four tests can’t always do it.',
    visibleObjective: 'Can four tests always find it?',
    idea: 'The pattern breaks: five lanterns need only four tests. All dark, then three tests that each light lantern 5 and one other lantern, pin down every lantern.',
    prerequisites: 'Slippery secrets puzzle 10.',
    hints: ['Start with all dark. Then try lighting two lanterns at a time.', 'Compared with all dark, lighting lanterns 4 and 5 tells you how many of those two are lit in the secret.', 'Try all dark, then lanterns 4 and 5 lit, then 3 and 5, then 2 and 5. Why does that always work?'],
    parent: {
      notice: 'Whether your child expects five tests from the earlier pattern, and what they do when a claim is refused.',
      prompt: 'Why do these four tests always work?',
      explanation: 'Compared with all dark, a test with lanterns a and 5 lit scores 2 more when both are lit in the secret, the same when one is, and 2 less when neither is. So the tests with 4 and 5, 3 and 5, and 2 and 5 lit tell how many of each pair are lit. If any of those counts is 0 or 2, lantern 5 is known, and then so is every lantern, lantern 1 from the all-dark score. If all three counts are 1, lanterns 2, 3 and 4 are the opposite of lantern 5, and the all-dark score (the number of dark lanterns) is 1 or 2 when lantern 5 is dark and 3 or 4 when it is lit, which settles lantern 5 and then lantern 1.',
      extension: 'Could you choose all four tests before hearing any score? (Slippery secrets puzzle 13.)',
      connection: 'For long rows far fewer than n tests suffice, about 2n/log₂ n chosen ahead (the coin-weighing problem: Lindström; Cantor and Mills).'
    },
    provenance: 'Beyond the Week 6 student pages, which stop at 4 counters; the adult guide’s “Where it goes next” gives the same four tests for five counters, and Signal Lanterns puzzles 5 and 6 record them.'
  },
  {
    number: 13, difficulty_level: 'hard', title: 'Five lanterns planned ahead',
    parameters: {mode: 'plantest', length: 5, tests: 4},
    rules: PLAN_TEST_RULES(5, 4),
    objective: 'The secret is a row of five lanterns. Choose all four tests before any score, then hear every score at once. Make tests that always tell which row is the secret.',
    visibleObjective: 'Choose all four tests first.',
    idea: 'Four planned tests must give all 32 secrets different lists of scores. All dark and then single lanterns runs out of tests, but lighting one lantern in each test, and never testing lantern 5 alone, works.',
    prerequisites: 'Slippery secrets puzzles 9 and 12.',
    hints: ['Set all four tests, then test them all. If two rows share every score, they show what to change.', 'In puzzle 9, lighting a different single lantern in each test worked. Try it with five lanterns.', 'Light only lantern 1 in test 1, only lantern 2 in test 2, and so on to lantern 4.'],
    parent: {
      notice: 'Whether your child reuses a way from puzzle 9 or 12, and how they change a test when the board shows two rows that share every score.',
      prompt: 'Lighting one lantern per test fails for four lanterns with three tests. Why does it work for five lanterns with four?',
      explanation: 'A test with one lantern lit scores one more than the number of dark lanterns in the secret when that lantern is lit, and one less when it is dark. So if the four scores take two values, the lower one is the dark count minus one, the higher ones mark the lit lanterns among 1 to 4, and the dark count settles lantern 5. If all four scores are equal, lanterns 1 to 4 are all dark (scores of 4 or 3) or all lit (scores of 2 or 1), and the score settles lantern 5. With four lanterns and three tests, the rows with only lantern 4 lit and with lanterns 1 to 3 lit both score 2 on every test. The tests from puzzle 12 work planned too; 1,280 of the 35,960 sets of four different tests work.',
      extension: 'Six lanterns can be done with five planned tests. Can you find them?',
      connection: 'Sets of tests that tell every secret apart are resolving sets of the cube, and the fewest is its metric dimension; for long rows about 2n/log₂ n planned tests suffice (the coin-weighing problem: Lindström; Cantor and Mills).'
    },
    provenance: 'Beyond the Week 6 student pages, which stop at 4 counters; the adult guide’s “Where it goes next” gives four tests for five counters, and the review card’s App fit names this design puzzle. Choosing every test before any score is new.'
  }
];

const possibleAt = q => q.mode === 'ask' ? k => askNeed(q.count) <= k : k => need(q.length, q.hit, words(q.length)) <= k;
export function answers(item) {
  const q = item.parameters;
  if (q.mode === 'plan') return {rows: 2 ** q.questions, things: q.count, possible: q.count <= 2 ** q.questions};
  if (q.mode === 'plantest') return {working: workingSets(q.length, q.tests).length, possible: workingSets(q.length, q.tests).length > 0};
  const can = possibleAt(q);
  if (q.goal === 'fewest') return {fewest: q.budgets.find(can)};
  return {possible: can(q.budgets[0])};
}
export const puzzles = authored.map(item => {
  const q = item.parameters;
  const rules = item.rules ?? (q.mode === 'test' ? TEST_RULES(q.length, q.hit) : ASK_RULES(q.items));
  return {
    id: `secrets-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    band: 'all',
    difficulty_level: item.difficulty_level,
    mechanic: 'secret',
    libraryFamily: 'code',
    group: 'Slippery secrets',
    familyTitle: 'Signal Lanterns',
    revision: 1,
    parameters: q,
    objective: item.objective,
    visibleObjective: item.visibleObjective ?? item.objective,
    instruction: item.objective,
    controls: controls(q),
    rules,
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['secrets-week06', ...(/coin-weighing/.test(item.parent.connection) ? ['secrets-coins'] : []), ...(/metric dimension/.test(item.parent.connection) ? ['secrets-cube'] : [])]},
    solution: answers(item),
    provenance: item.provenance,
    sourceDocument: 'docs/secrets/README.md'
  };
});
export const pack = {title: 'Signal Lanterns slippery secrets', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/secrets/secrets.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, JSON.stringify(p.parameters), JSON.stringify(p.solution));
}
