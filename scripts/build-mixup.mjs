// Builds dist/families/mixup/mixup.json, the Mixed-up cups pack, from the
// authoring list below. The rows each puzzle asks for are computed here from
// dist/families/mixup/mixup.js and checked against the list, and again, by a
// separate enumeration, in scripts/validate-mixup.mjs.
// Design notes and worksheet sources: docs/mixup/README.md.
import {writeFile} from 'node:fs/promises';
import {targetRows} from '../dist/families/mixup/mixup.js';

const WEEK63 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-63';
export const sources = [
  {id: 'mixup-week63', title: 'Bellingham Math Circle — Week 63: Cards away from home (overlap counting and derangements), packet, materials and adult guide', url: WEEK63, kind: 'local curriculum'},
  {id: 'mixup-stanley', title: 'Richard P. Stanley — Enumerative Combinatorics, Volume 1, Chapter 2: Sieve methods (inclusion–exclusion and derangements), 2nd ed. (2012)', url: 'https://math.mit.edu/~rstan/ec/', kind: 'book'},
  {id: 'mixup-oeis-derangements', title: 'OEIS A000166 — Subfactorial or rencontres numbers, or derangements', url: 'https://oeis.org/A000166', kind: 'reference'},
  {id: 'mixup-oeis-rencontres', title: 'OEIS A008290 — Triangle of rencontres numbers: permutations of n elements with exactly k fixed points', url: 'https://oeis.org/A008290', kind: 'reference'}
];
export const family = {
  id: 'mixup',
  title: 'Mixed-up cups',
  mathematics: 'A row of n lettered cups on n lettered homes is a permutation, and a row with no cup at home is a derangement. Requiring k named cups at home leaves (n − k)! rows however the others fall, so adding and subtracting the overlaps counts the rows with none at home: n! − C(n,1)(n − 1)! + C(n,2)(n − 2)! − … ± 1, which is 2, 9 and 44 for three, four and five cups. A row with any cup at home cancels exactly, because its overlaps pair off with opposite signs. Fixing where one cup goes splits the rows with none at home into two families that shrink, reversibly, to smaller rows with none at home, so D(n) = (n − 1)(D(n − 1) + D(n − 2)).',
  rules: [
    'Each home holds one cup.',
    'A cup is at home when it stands on the home with its own letter.',
    'Keep puts the row on the shelf when it is one the puzzle asks for. Each row is kept once.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const PINNED = 'A cup with a dot stays on its home.';
const HOOPS = 'Each kept row goes in every hoop it belongs to. A row in both hoops sits where they overlap.';
const BINS = 'The shelf sorts kept rows into columns.';
const CONTROLS = 'Tap a cup, then another, to swap them, or drag one onto the other. Keep puts the row on the shelf; tap a kept row to set the cups that way again. Press That’s all when every row is on the shelf.';
const W = ['mixup-week63'];

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'No cup at home',
    parameters: {cups: 3, start: 'ABC', rule: {type: 'away', cups: 'ABC'}, shelf: {type: 'list'}},
    objective: 'Keep every row with no cup at home.',
    idea: 'Home A can take B or C, and each choice finishes only one way, so there are two rows.',
    prerequisites: 'Recognize the letters A, B and C. No reading is needed once a grown-up has read the goal.',
    hints: ['Move every cup off its home, then press Keep.', 'Which cups can stand on home A? Try each one.', 'With B on home A, where can A and C go?'],
    parent: {
      notice: 'BCA and CAB. Each moves every cup one home along, the two ways round a ring of three.',
      prompt: 'Can exactly two of the three cups be at home?',
      explanation: 'Choose the cup for home A: B or C (A would be at home). With B there, home B must take C, since A would leave C at home; then A goes on home C. With C there, the same reasoning forces CAB. So the list BCA, CAB is complete. Exactly two at home is impossible: once two named cups are home, one cup and one home are left, with the same letter, so the third is home too.',
      extension: 'Four cups with D kept on home A (puzzle 4) has three rows.',
      connection: 'A row with no cup at home is a derangement; three cups have D(3) = 2 (Week 63 Problem 1).'
    },
    provenance: 'Week 63 Problem 1 (find every A–C row with no home matches; can exactly two match?), with cups for cards.',
    sourceIds: W,
    expect: 2
  },
  {
    number: 2, difficulty_level: 'easy', title: 'A and B away',
    parameters: {cups: 3, start: 'ABC', rule: {type: 'away', cups: 'AB'}, shelf: {type: 'list'}},
    objective: 'Keep every row with A and B away from home.',
    idea: 'C may stay home now, so BAC joins the two rows of puzzle 1.',
    prerequisites: 'Recognize the letters A, B and C.',
    hints: ['Move A and B off their homes. C can go anywhere.', 'Puzzle 1 found two rows. Is there one with C at home?', 'Swap A and B.'],
    parent: {
      notice: 'Three rows: BAC, BCA and CAB. In BAC, C is at home.',
      prompt: 'Two of the six rows have A at home and two have B at home. Why is the answer not 6 − 2 − 2 = 2?',
      explanation: 'ABC has A and B both at home, so it is in both groups, and 6 − 2 − 2 takes it away twice. Adding it back once gives 6 − 2 − 2 + 1 = 3. The other two rows in the groups, ACB and CBA, are taken away once each.',
      extension: 'Puzzle 3 keeps the other three rows, the ones with A or B at home.',
      connection: 'Inclusion–exclusion for two sets: |not A and not B| = total − |A| − |B| + |A and B| (Week 63 Problem 2).'
    },
    provenance: 'Week 63 Problem 2 (rows outside both the A-home and B-home groups; repair 6 − 2 − 2 = 2).',
    sourceIds: [...W, 'mixup-stanley'],
    expect: 3
  },
  {
    number: 3, difficulty_level: 'easy', title: 'A or B at home',
    parameters: {cups: 3, start: 'BCA', rule: {type: 'some-home', cups: 'AB'}, shelf: {type: 'hoops', cups: 'AB'}},
    objective: 'Keep every row with A or B at home.',
    idea: 'ABC belongs in both hoops at once: two rows with A home and two with B home make three rows, not four.',
    prerequisites: 'Recognize the letters A, B and C. See that one row can sit in two hoops.',
    hints: ['Put A back on home A and press Keep.', 'Where does a row with A and B both at home go?', 'Try ACB, CBA and ABC.'],
    parent: {
      notice: 'ACB in the A hoop, CBA in the B hoop, ABC where they overlap.',
      prompt: 'This puzzle and puzzle 2 each found three rows. Why do they make all six?',
      explanation: 'Each row either has A or B at home, or has both away, never both, so the two lists split the six rows. Counting the hoops: 2 + 2 − 1 = 3, because ABC is counted in each hoop. That is the overlap a subtract-only count misses.',
      extension: 'Puzzle 6 does the same with four cups.',
      connection: 'A union of two sets: |A or B| = |A| + |B| − |A and B| (Week 63 Problem 2).'
    },
    provenance: 'Week 63 Problem 2 (one outcome card in two groups at once), with hoops for the groups.',
    sourceIds: W,
    expect: 3
  },
  {
    number: 4, difficulty_level: 'medium', title: 'D stays on home A',
    parameters: {cups: 4, pinned: 'A', start: 'DBCA', rule: {type: 'away', cups: 'ABCD'}, shelf: {type: 'bins', by: 'in-home', cup: 'A', home: 'D'}, catalog: 'D'},
    objective: 'Keep every row with no cup at home.',
    idea: 'A either takes home D, trading places with D, or goes elsewhere: one row one way and two the other.',
    prerequisites: 'Recognize the letters A to D.',
    hints: ['D stays put. Move A, B and C so none is on its own home.', 'Can A go on home D?', 'Try DCBA, DABC and DCAB.'],
    parent: {
      notice: 'DCBA, where A and D trade homes, and DABC and DCAB, where A is elsewhere.',
      prompt: 'Cover A and D in DCBA. What row of B and C is left?',
      explanation: 'If A sits on home D, then A and D have traded places and B and C must avoid their homes too: only CB, so one row. If A goes elsewhere, take D out and slide the cup on home D onto home A. DABC becomes CAB and DCAB becomes BCA, the two rows of puzzle 1. Putting D back undoes it, so 1 + 2 = 3, and every row is counted once.',
      extension: 'D could stand on home B or C instead, with three rows each, giving the 9 rows of puzzle 5.',
      connection: 'The two families behind D(n) = (n − 1)(D(n − 1) + D(n − 2)) (Week 63 Problem 7).'
    },
    provenance: 'Week 63 Problem 7 (keep D in home A, find every row with no home matches, and sort by whether A is in home D).',
    sourceIds: W,
    expect: 3
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Four cups, none at home',
    parameters: {cups: 4, start: 'ABCD', rule: {type: 'away', cups: 'ABCD'}, shelf: {type: 'list'}},
    objective: 'Keep every row with no cup at home.',
    idea: 'Home A takes B, C or D, and each choice finishes three ways: 3 × 3 = 9.',
    prerequisites: 'Recognize the letters A to D. Organize a search so no row is missed; the shelf keeps the rows found.',
    hints: ['Choose a cup for home A, then find every way to finish.', 'Puzzle 4 found the three with D on home A.', 'B, C and D on home A give three rows each.'],
    parent: {
      notice: 'B on home A: BADC, BCDA, BDAC. C: CADB, CDAB, CDBA. D: DABC, DCAB, DCBA.',
      prompt: 'How do you know the list is complete?',
      explanation: 'Sort the rows by the cup on home A. Each of B, C and D gives three rows, as puzzle 4 found for D, and renaming letters turns one branch into another. Three of the nine are two trades (BADC, CDAB, DCBA); the other six send the cups round one ring of four. Overlaps give the same count: 24 − 4·6 + 6·2 − 4·1 + 1 = 9.',
      extension: 'Rows with exactly one cup at home number 8 (puzzle 7). How many have exactly two?',
      connection: 'D(4) = 9 (Week 63 Problems 3 and 5; OEIS A000166).'
    },
    provenance: 'Week 63 Problem 3 (find every A–D row with no home matches in a checkable catalog).',
    sourceIds: [...W, 'mixup-oeis-derangements'],
    expect: 9
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Two hoops, four cups',
    parameters: {cups: 4, start: 'BADC', rule: {type: 'some-home', cups: 'AB'}, shelf: {type: 'hoops', cups: 'AB'}},
    objective: 'Keep every row with A or B at home.',
    idea: 'Six rows have A home and six have B home, but two have both, so the hoops hold ten.',
    prerequisites: 'Recognize the letters A to D. Keep two groups in mind at once.',
    hints: ['Put A on home A. How many ways can B, C and D finish?', 'Which rows go where the hoops overlap?', 'ABCD and ABDC belong in both hoops.'],
    parent: {
      notice: 'Both hoops: ABCD, ABDC. A only: ACBD, ACDB, ADBC, ADCB. B only: CBAD, CBDA, DBAC, DBCA.',
      prompt: 'How many of the 24 rows have A and B both away?',
      explanation: 'With A on home A the other three cups fill their homes in 6 ways, and likewise with B on home B. Fixing both leaves C and D two ways, so the overlap holds 2 and the hoops hold 6 + 6 − 2 = 10. The other 24 − 10 = 14 rows have A and B away, which is 24 − 6 − 6 + 2: subtracting both hoops takes the two middle rows away twice.',
      extension: 'Puzzle 8 keeps those 14.',
      connection: 'Fixing k named cups leaves (n − k)! rows, however many others land home (Week 63 Problems 4 and 5).'
    },
    provenance: 'Week 63 Problems 4 and 5 (the A-home and B-home groups among 24 rows, and their inclusive overlap).',
    sourceIds: [...W, 'mixup-stanley'],
    expect: 10
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Exactly one at home',
    parameters: {cups: 4, start: 'ABCD', rule: {type: 'home-count', count: 1}, shelf: {type: 'bins', by: 'home'}},
    objective: 'Keep every row with exactly one cup at home.',
    idea: 'With one cup home, the other three must avoid their homes, which they do two ways: 4 × 2 = 8.',
    prerequisites: 'Recognize the letters A to D and count the cups at home.',
    hints: ['Leave A at home and move the others so none is home.', 'Each column needs the rows for one cup at home.', 'With A at home: ACDB and ADBC.'],
    parent: {
      notice: 'A home: ACDB, ADBC. B home: CBDA, DBAC. C home: BDCA, DACB. D home: BCAD, CABD.',
      prompt: 'Why does every column hold the same number?',
      explanation: 'Fix the cup that stays home. The other three then form a row of three with none at home, which has two ways (puzzle 1). Renaming letters turns one column into another, so each holds two.',
      extension: 'Four cups have 9, 8, 6, 0 and 1 rows with 0, 1, 2, 3 and 4 at home, 24 in all. Why can’t exactly three be home?',
      connection: 'Rows with exactly k cups home number C(n, k) · D(n − k), the rencontres numbers (OEIS A008290; Week 63 guide, Problem 6 notes).'
    },
    provenance: 'New. The Week 63 guide lists how many rows have each number of home matches (Problem 6 notes); this puzzle collects one such count.',
    sourceIds: [...W, 'mixup-oeis-rencontres'],
    expect: 8
  },
  {
    number: 8, difficulty_level: 'hard', title: 'A and B away, four cups',
    parameters: {cups: 4, start: 'ABCD', rule: {type: 'away', cups: 'AB'}, shelf: {type: 'bins', by: 'staying', cups: 'CD'}},
    objective: 'Keep every row with A and B away from home.',
    idea: 'C and D may stay home: the 9 rows with none home, 2 with only C home, 2 with only D home, and BACD.',
    prerequisites: 'Recognize the letters A to D. Keep a long list organized.',
    hints: ['Swap A and B, then keep rows with C and D in different places.', 'One column is the nine rows of puzzle 5.', 'With C and D both home, only BACD works.'],
    parent: {
      notice: 'Fourteen rows: 9 with C and D away, 2 with C home (BDCA, DACB), 2 with D home (BCAD, CABD) and BACD.',
      prompt: 'Which column holds the rows from puzzle 5?',
      explanation: 'Overlaps give 24 − 6 − 6 + 2 = 14. The columns split the same 14 by C and D: both away is exactly the 9 rows with no cup at home; C home leaves A, B and D to avoid their homes, 2 ways; D home likewise; both home forces BACD. 9 + 2 + 2 + 1 = 14.',
      extension: 'With A, B and C away and D free there are 24 − 18 + 6 − 1 = 11 rows.',
      connection: 'Week 63 Problem 4, and puzzle 6 counts the other 10.'
    },
    provenance: 'Week 63 Problem 4 (count the A–D rows with A and B away; repair 24 − 6 − 6).',
    sourceIds: W,
    expect: 14
  },
  {
    number: 9, difficulty_level: 'hard', title: 'E stays on home A',
    parameters: {cups: 5, pinned: 'A', start: 'EBCDA', rule: {type: 'away', cups: 'ABCDE'}, shelf: {type: 'bins', by: 'in-home', cup: 'A', home: 'E'}, catalog: 'E'},
    objective: 'Keep every row with no cup at home.',
    idea: 'A on home E leaves a row of B, C and D with none home (2 ways); A elsewhere shrinks to a row of four with none home (9 ways).',
    prerequisites: 'Recognize the letters A to E. The nine rows of puzzle 5 help.',
    hints: ['E stays put. Start from a row of puzzle 5 and fit E in.', 'Take a row from puzzle 5, put its cup from home A on home E instead, and E on home A.', 'A on home E: ECDBA and EDBCA.'],
    parent: {
      notice: 'A on home E: ECDBA, EDBCA. A elsewhere: nine rows, one for each row of puzzle 5.',
      prompt: 'Take EADBC. Take E out and put the cup from home E on home A. What row do you get?',
      explanation: 'CADB, a row of four with none at home. Every row with A elsewhere shrinks this way, and every row of puzzle 5 grows back one way: move its cup on home A to home E and stand E on home A. So that column matches the 9 rows of puzzle 5, and the A-on-E column matches the 2 rows of puzzle 1 (take A and E out). 2 + 9 = 11. E can stand on any of four homes, so five cups have 4 × 11 = 44 rows with none at home: D(5) = 4(D(4) + D(3)).',
      extension: 'Use the same step to grow the 44 rows of five cups into the rows of six. How many are there?',
      connection: 'The recurrence D(n) = (n − 1)(D(n − 1) + D(n − 2)), proved by reversible deletion (Week 63 Problems 8 and 9; Stanley, Chapter 2).'
    },
    provenance: 'Week 63 Problem 8 (keep E in home A; make every home-free A–E row in two families and give reversible constructions).',
    sourceIds: [...W, 'mixup-stanley'],
    expect: 11
  }
];

const playground = {
  id: 'mixup-playground', number: 0, title: 'Mixed-up cups playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Swap cups and keep any rows you like.',
  controls: 'Choose three, four or five cups. Tap a cup, then another, to swap them, or drag one onto the other. Keep puts the row on the shelf, in a column for how many cups are at home; tap a kept row to set the cups that way again. Shuffle mixes the cups and Clear empties the shelf.',
  rules: RULES.slice(0, 2),
  idea: 'Free play with three to five cups; the shelf sorts rows by how many cups are home.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Try to put a row in every column.', 'Which column stays empty?', 'How many rows of four cups have none at home?'],
  parent: {
    notice: 'With four cups the columns can hold 9, 8, 6, 0 and 1 rows; the column for three at home stays empty.',
    prompt: 'Why can’t exactly three of four cups be home?',
    explanation: 'If three named cups are home, the last cup has only its own home left. In general the rows of n cups with exactly k at home number C(n, k) · D(n − k), where D(m) counts rows of m cups with none at home: for four cups 1·9, 4·2, 6·1, 4·0 and 1·1.',
    extension: 'With five cups the columns can hold 44, 45, 20, 10, 0 and 1 rows.',
    connection: 'Rencontres numbers (OEIS A008290).'
  },
  provenance: 'Week 63 materials: the lettered card decks and home strips, for free arranging before any rule.',
  sourceIds: [...W, 'mixup-oeis-rencontres']
};

const puzzles = [playground, ...authored].map(({expect, sourceIds, parent, ...p}) => {
  const q = p.parameters;
  if (expect !== undefined && targetRows(q).length !== expect) throw Error(`${p.number}: ${targetRows(q).length} rows, not ${expect}`);
  const rules = [...RULES, ...(q.pinned ? [PINNED] : []), ...(q.shelf?.type === 'hoops' ? [HOOPS] : q.shelf?.type === 'bins' ? [BINS] : [])];
  return {
    id: q.mode === 'playground' ? p.id : `mixup-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'mixup', familyTitle: family.title, revision: 1, parameters: q.mode ? q : {mode: 'every', ...q},
    objective: p.objective, instruction: p.objective, controls: p.controls || (q.pinned ? `${CONTROLS} ${PINNED}` : CONTROLS), rules: p.rules || rules,
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...parent, sourceIds}, provenance: p.provenance, sourceDocument: 'docs/mixup/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/mixup/mixup.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
