// Builds dist/families/copies/copies.json, the Copying bags pack, from the
// authoring list below. What each puzzle asks for is computed here from
// dist/families/copies/copies.js and checked against the list, and again, by
// a separate enumeration, in scripts/validate-copies.mjs.
// Design notes and worksheet sources: docs/copies/README.md.
import {writeFile} from 'node:fs/promises';
import {targetKeys} from '../dist/families/copies/copies.js';

const WEEK44 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-44';
export const sources = [
  {id: 'copies-week44', title: 'Bellingham Math Circle — Week 44: The bag that copies, K–1, grades 2–3 and grades 4–5 packets, bonus pages and adult guides', url: WEEK44, kind: 'local curriculum'},
  {id: 'copies-polya', title: 'F. Eggenberger and G. Pólya — Über die Statistik verketteter Vorgänge, Zeitschrift für Angewandte Mathematik und Mechanik 3 (1923), 279–289', url: 'https://doi.org/10.1002/zamm.19230030407', kind: 'paper'},
  {id: 'copies-wikipedia', title: 'Wikipedia — Pólya urn model', url: 'https://en.wikipedia.org/wiki/P%C3%B3lya_urn_model', kind: 'reference'}
];
export const family = {
  id: 'copies',
  title: 'Copying bags',
  mathematics: 'A bag starts with one red and one blue counter. Each draw takes one counter, every counter in the bag as likely as any other; it goes back, and a copy of its colour joins it (Pólya’s urn). Number the copies as they arrive and a history is a list of numbered counters. The first draw chooses among 2 counters, the next among 3, and so on, so n draws have 2 · 3 · … · (n + 1) = (n + 1)! histories, all equally likely. Sorted by the number of red draws, they split evenly, n! each: after any number of draws, every count of reds from none to all is equally likely, so a bag with a single red is exactly as likely as any other, the most even included. Two orders of the same colours are equally likely too (RRB, RBR and BRR have two histories each after three draws), although the draws depend on each other. Neither colour can vanish, since a counter that is drawn goes back. For two draws, putting a counter back without a copy gives 1, 2, 1 histories for none, one and two reds, and adding a counter of the other colour gives 1, 4, 1.',
  rules: [
    'A bag starts with one red and one blue counter.',
    'Draw any counter; each one in the bag is as likely as any other. It goes back, and a copy of its colour joins it, numbered next.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES_TEXT = family.rules;
// Puzzles 1–3 ask only which bags and stories can happen, so their rules leave chance out.
const MAKING = [RULES_TEXT[0], 'Draw any counter. It goes back, and a copy of its colour joins it, numbered next.'];
const HISTORY = 'A history lists the numbered counters drawn, in order.';
const W = ['copies-week44'];
const start = 'RB', rule = 'copy';

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Two red, three blue',
    parameters: {mode: 'make', start, rule, target: 'RRBBB'},
    objective: 'Make a bag of two red and three blue.',
    rules: MAKING,
    idea: 'Each draw adds a copy of the colour drawn, so the bag gains one red and two blue: one red draw and two blue draws, in any order.',
    prerequisites: 'Tell red from blue and count to five. No reading once a grown-up has read the goal.',
    hints: ['Each draw adds one counter of the colour you draw.', 'The bag needs one more red and two more blue.', 'Draw one red and two blue.'],
    parent: {
      notice: 'Three draws make it: one red and two blue, in any order. Red then blue then blue, blue then red then blue and blue then blue then red all work.',
      prompt: 'Which other bags could three draws make?',
      explanation: 'The bag starts with one of each, and each draw adds one counter of the drawn colour. Two red and three blue is one more red and two more blue.',
      extension: 'Could three draws make a bag with no blue at all?',
      connection: 'Week 44 K–1 Problems 1 and 2: make the bags you can reach.'
    },
    provenance: 'Week 44 K–1 Problems 1–2: reach bags by copying draws.',
    sourceIds: W,
    expect: 1
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Every bag, three draws',
    parameters: {mode: 'bags', start, rule, draws: 3},
    objective: 'Keep every bag three draws can make.',
    rules: MAKING,
    idea: 'Three draws add three counters, from no reds to three reds: four bags. A bag with no blue can’t happen, because blue 1 is never lost.',
    prerequisites: 'Puzzle 1.',
    hints: ['Try all red draws, then all blue.', 'The bag always has five counters at the end.', 'Count the reds drawn: none, one, two or three.'],
    parent: {
      notice: 'Four bags: 4 red and 1 blue, 3 and 2, 2 and 3, 1 and 4. Five red and no blue never comes.',
      prompt: 'Why can’t the blue counters all disappear?',
      explanation: 'A drawn counter always goes back, so blue 1 stays in the bag. The red count after three draws is 1 plus the number of red draws, 0 to 3.',
      extension: 'After four draws, how many bags are possible?',
      connection: 'Week 44 K–1 Problem 2 and grades 2–3 Problem 6: which bags are possible, and whether a colour can vanish.'
    },
    provenance: 'Week 44 K–1 Problem 2 (make a story for each possible three-draw bag and cross out the impossible one) and grades 2–3 Problem 6.',
    sourceIds: W,
    expect: 4
  },
  {
    number: 3, difficulty_level: 'medium', title: 'Every story to three and three',
    parameters: {mode: 'stories', start, rule, draws: 4, target: 'RRRBBB'},
    objective: 'Keep every colour story of four draws that ends with three red and three blue.',
    rules: [...MAKING, 'A colour story lists only the colours drawn, in order.'],
    idea: 'Ending with three of each needs two red draws and two blue draws in some order: six colour stories.',
    prerequisites: 'Puzzle 2.',
    hints: ['How many red draws does the bag need?', 'Two red draws and two blue draws.', 'Start with red, red; then try red, blue.'],
    parent: {
      notice: 'Six stories: RRBB, RBRB, RBBR, BRRB, BRBR, BBRR.',
      prompt: 'How do you know you have every order?',
      explanation: 'A story is four places, two of them red. Choosing the first red place and then a later one gives 3 + 2 + 1 = 6 orders.',
      extension: 'Are the six stories equally likely? Count the numbered histories of two of them.',
      connection: 'Week 44 K–1 Problem 3: every four-draw story ending with this bag.'
    },
    provenance: 'Week 44 K–1 Problem 3: every four-draw story ending with three red and three blue.',
    sourceIds: W,
    expect: 6
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Every history, two draws',
    parameters: {mode: 'histories', start, rule, draws: 2},
    objective: 'Keep every history of two draws.',
    rules: [...RULES_TEXT, HISTORY],
    idea: 'Two choices, then three: six histories, each as likely as any other, and two in each column.',
    prerequisites: 'Puzzle 2.',
    hints: ['After red 1 is drawn, which three counters can come next?', 'Each first draw leaves three counters for the second.', 'Red 1 then red 1, red 1 then red 2, red 1 then blue 1, and the same from blue 1.'],
    parent: {
      notice: 'Six histories, two for each number of reds: R1R1 and R1R2; R1B1 and B1R1; B1B1 and B1B2.',
      prompt: 'Which number of red draws is most likely?',
      explanation: 'Each history has chance 1/2 × 1/3 = 1/6. Two reds and two blues each get a copy’s extra history; one of each gets its two orders. So no reds, one red and two reds are each 2/6.',
      extension: 'With three draws there are 24 histories. How many in each column?',
      connection: 'Week 44 grades 4–5 Problem 1 and grades 2–3 Problem 2: every marked two-draw story.'
    },
    provenance: 'Week 44 grades 4–5 Problem 1 and grades 2–3 Problem 2: find every marked two-draw story and compare the red-draw totals.',
    sourceIds: [...W, 'copies-polya'],
    expect: 6
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Just put back',
    parameters: {mode: 'histories', start, rule: 'return', draws: 2},
    objective: 'No copies now. Keep every history of two draws.',
    rules: [RULES_TEXT[0], 'Draw any counter; each one in the bag is as likely as any other. It goes back, and nothing joins it.', HISTORY],
    idea: 'Without copies the bag stays red 1 and blue 1: four histories, and one red draw has twice the share of none or two.',
    prerequisites: 'Puzzle 4.',
    hints: ['The bag never changes now.', 'Two choices, then two again.', 'The middle column gets red then blue and blue then red.'],
    parent: {
      notice: 'Four histories: R1R1; R1B1 and B1R1; B1B1. One red draw is twice as likely as none.',
      prompt: 'Why did copying make the three columns even?',
      explanation: 'Without copies, each history has chance 1/4, and one red can come in two orders. With copies, the second draw of the same colour has an extra counter to choose, which gives two red draws (and two blue) an extra history each.',
      extension: 'With three draws and no copies, how do the 8 histories split?',
      connection: 'Week 44 grades 4–5 Problem 2 and grades 2–3 Problem 3: compare the copying rule with returning only.'
    },
    provenance: 'Week 44 grades 4–5 Problem 2 and grades 2–3 Problem 3: return each draw without a copy.',
    sourceIds: W,
    expect: 4
  },
  {
    number: 6, difficulty_level: 'medium', title: 'No reds in three draws',
    parameters: {mode: 'histories', start, rule, draws: 3, reds: 0},
    objective: 'Keep every history of three draws with no reds.',
    rules: [...RULES_TEXT, HISTORY],
    idea: 'All blue has as many histories as two reds: 1 × 2 × 3 = 6, because each blue draw adds a blue to choose next time.',
    prerequisites: 'Puzzle 4.',
    hints: ['After blue 1, the bag has two blues.', 'The second draw has two blues to choose; the third has three.', 'Blue 1, then blue 1 or blue 2, then any of the blues.'],
    parent: {
      notice: 'Six histories: B1B1B1, B1B1B2, B1B1B3, B1B2B1, B1B2B2, B1B2B3. Puzzle 7 finds six with two reds, and its catalog shows six for every number of reds.',
      prompt: 'All blue is the most lopsided bag. Why is it as likely as a mixed one?',
      explanation: 'The blue draws find 1, 2 and 3 blues: 1 × 2 × 3 = 6 histories. Two reds and a blue find 1 × 2 for the reds and 1 for the blue, times 3 orders: also 6. In general k reds and n − k blues give k!(n − k)! histories for each order, and there are n!/(k!(n − k)!) orders, so n! in all, whatever k is.',
      extension: 'With four draws there are 120 histories. How many in each of the five columns?',
      connection: 'Week 44 grades 4–5 Problem 4: every number of reds is equally likely.'
    },
    provenance: 'Week 44 grades 4–5 Problem 4: the all-blue column of the 24 three-draw histories.',
    sourceIds: [...W, 'copies-polya', 'copies-wikipedia'],
    expect: 6
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Two reds in three draws',
    parameters: {mode: 'histories', start, rule, draws: 3, reds: 2, catalog: true},
    objective: 'Keep every history of three draws with exactly two reds.',
    rules: [...RULES_TEXT, HISTORY],
    idea: 'Red, red, blue; red, blue, red; and blue, red, red each have two histories: the order of the colours doesn’t change the chance.',
    prerequisites: 'Puzzle 6.',
    hints: ['After red 1, the bag has two reds.', 'Each colour order has the same number of histories.', 'Red, red, blue: red 1, then red 1 or red 2, then blue 1.'],
    parent: {
      notice: 'Six histories, two for each order. The catalog shows all 24 three-draw histories, six for each number of reds, all blue included (puzzle 6).',
      prompt: 'Why do red, red, blue and blue, red, red come out the same?',
      explanation: 'Each colour order multiplies the same numbers: the reds drawn find 1 and then 2 reds to choose, the blue finds 1, whatever the order, and the bag grows 2, 3, 4 either way. So every order of two reds and one blue has 1 × 2 × 1 = 2 histories of 24.',
      extension: 'How many of the 24 histories have one red? Three reds?',
      connection: 'Week 44 grades 4–5 Problems 3 and 4: compare RRB, RBR and BRR, and count the 24 histories by reds.'
    },
    provenance: 'Week 44 grades 4–5 Problem 3 (RRB, RBR and BRR) and Problem 4 (24 histories by red draws).',
    sourceIds: [...W, 'copies-polya'],
    expect: 6
  },
  {
    number: 8, difficulty_level: 'hard', title: 'The other colour',
    parameters: {mode: 'histories', start, rule: 'other', draws: 2},
    objective: 'Now each draw adds the other colour. Keep every history of two draws.',
    rules: [RULES_TEXT[0], 'Draw any counter; each one in the bag is as likely as any other. It goes back, and a counter of the other colour joins it, numbered next.', HISTORY],
    idea: 'Drawing red adds blue, so the next draw leans to blue: one red and one blue gets four of the six histories.',
    prerequisites: 'Puzzle 5.',
    hints: ['After red 1, which counter joins the bag?', 'After red 1 the bag is red 1, blue 1 and blue 2.', 'One red and one blue has four histories.'],
    parent: {
      notice: 'Six histories: R1R1; R1B1, R1B2, B1R1, B1R2; B1B1. The columns are 1, 4, 1.',
      prompt: 'Copying spreads the columns evenly. What does adding the other colour do?',
      explanation: 'Drawing red adds a blue, so the next draw is more likely blue: the bag pulls back toward even. Two of the same colour have one history each; the mixed draws have two each way.',
      extension: 'With three draws and the other colour added, how do the 24 histories split? (1, 11, 11, 1.)',
      connection: 'Week 44 bonus: the bag that adds the other colour.'
    },
    provenance: 'Week 44 bonus pages: the add-the-other-colour rule (1, 4, 1).',
    sourceIds: W,
    expect: 6
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Three colours',
    parameters: {mode: 'histories', start: 'RBY', rule, draws: 2},
    objective: 'Start with red, blue and yellow. Keep every history of two draws.',
    rules: ['A bag starts with one red, one blue and one yellow counter.', RULES_TEXT[1], HISTORY],
    idea: 'Three choices, then four: twelve histories, two for each pair of colours, the same as for two colours.',
    prerequisites: 'Puzzle 4.',
    hints: ['After yellow 1, which four counters can come next?', 'Twelve histories in six columns.', 'Two of a colour: the counter, then itself or its copy. Two colours: either order.'],
    parent: {
      notice: 'Twelve histories, two in each of the six columns: red-red, red-blue, red-yellow, blue-blue, blue-yellow and yellow-yellow.',
      prompt: 'Why does each pair of colours get exactly two histories?',
      explanation: 'Two of one colour: its counter, then itself or its copy (2 histories). Two different colours: either order, one history each (2). With m colours the same reasoning makes every mix equally likely.',
      extension: 'With three colours and three draws, are the ten mixes equally likely?',
      connection: 'Week 44 bonus: a copying bag with three colours.'
    },
    provenance: 'Week 44 bonus pages: the three-colour copying bag (six columns of two).',
    sourceIds: [...W, 'copies-wikipedia'],
    expect: 12
  }
];

const playground = {
  id: 'copies-playground', number: 0, title: 'Copying bags playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Draw runs of four and watch where they land.',
  controls: 'Choose what joins the bag after each draw. Tap a counter to draw it, or press Draw for a random one. A run is four draws; when it ends, a dot drops into the column for how many reds were drawn. Finish completes a run at random and 10 runs makes ten more. Clear empties the columns.',
  rules: [RULES_TEXT[0], 'Draw any counter; each one in the bag is as likely as any other. It goes back, and the chosen rule says what joins it.'],
  idea: 'Free play: many random runs under three rules, to see the columns come out even, peaked or tall in the middle.',
  prerequisites: 'None. Grown-ups can suggest comparing the rules.',
  hints: ['Make 10 runs a few times with Add the same colour.', 'Clear and try Just put back.', 'Which rule fills the middle column most?'],
  parent: {
    notice: 'With copies the five columns fill about equally; with putting back only they fill about 1, 4, 6, 4, 1; adding the other colour crowds the middle even more.',
    prompt: 'Can a hundred runs prove the columns are even?',
    explanation: 'Random runs only suggest. Counting histories settles it: for four draws there are 120 copying histories, 24 for each number of reds, as puzzles 6 and 7 show for three draws.',
    extension: 'Draw red four times in a run. Is blue 1 still in the bag?',
    connection: 'Week 44 grades 4–5 Problems 5–6: predict the totals for four or more draws.'
  },
  provenance: 'Week 44 materials: a bag, red and blue counters and copies.',
  sourceIds: W
};

const puzzles = [playground, ...authored].map(({expect, sourceIds, parent, ...p}) => {
  const q = p.parameters;
  const count = q.mode === 'playground' ? undefined : targetKeys(q).length;
  if (expect !== undefined && count !== expect) throw Error(`${p.number}: ${count}, not ${expect}`);
  const controls = q.mode === 'playground' ? p.controls
    : q.mode === 'make' ? 'Tap a counter to draw it. Again starts over with the first bag.'
    : 'Tap counters to draw them. Keep puts the finished draws on the shelf; Again starts over. Press That’s all when every one is there.';
  return {
    id: q.mode === 'playground' ? p.id : `copies-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'copies', familyTitle: family.title, revision: 1, parameters: q,
    objective: p.objective, instruction: p.objective, controls, rules: p.rules || RULES_TEXT,
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...parent, sourceIds}, provenance: p.provenance, sourceDocument: 'docs/copies/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/copies/copies.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
