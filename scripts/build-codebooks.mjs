// Builds dist/families/codebooks/codebooks.json, the Signal Lanterns codebooks
// group, from the authoring list below. Each puzzle's answers (whether a key
// exists, the fewest lanterns, which keys the changer can fool, every partner
// row) are computed here by search (dist/families/codebooks/codebooks.js) and
// checked again by scripts/validate-codebooks.mjs. Design notes and sources:
// docs/codebooks/README.md.
import {writeFile} from 'node:fs/promises';
import {possible, fewest, fooling, partnersOf, words, distance} from '../dist/families/codebooks/codebooks.js';

const WEEK18 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-18';
export const sources = [
  {id: 'codebooks-week18', title: 'Bellingham Math Circle — Week 18: Hidden changes (codebooks), packets and adult guide', url: WEEK18, kind: 'local curriculum'},
  {id: 'codebooks-hamming', title: 'R. W. Hamming — Error detecting and error correcting codes, Bell System Technical Journal 29 (1950)', url: 'https://doi.org/10.1002/j.1538-7305.1950.tb00463.x', kind: 'research'},
  {id: 'codebooks-brouwer', title: 'A. E. Brouwer — Table of the largest binary codes A(n, d)', url: 'https://www.win.tue.nl/~aeb/codes/binary-1.html', kind: 'research'}
];
export const family = {
  id: 'codebooks',
  title: 'Signal Lanterns codebooks',
  mathematics: 'A key gives each picture a row of lit and dark lanterns. If a changer may turn over at most t lanterns unseen, the receiver can always recover the picture exactly when every two rows differ in at least 2t + 1 places (Hamming distance): then the sets of rows each picture can become never overlap. For one change each row of n lanterns can become n + 1 rows, so M pictures need M(n + 1) ≤ 2ⁿ (the packing bound). Two pictures need 3 lanterns and four need 5, but the bound is not sufficient: three pictures do not fit in 4 lanterns although 3 × 5 ≤ 16, because three rows of length 4 have pairwise distances summing to at most 8. With 6 lanterns, eight pictures fit (a shortened Hamming code), and a greedy search in counting order finds them.',
  rules: [
    'A key gives each picture its own row of lanterns, all the same length.',
    'The changer may turn over one lantern, or none, without saying which.',
    'The receiver sees only the final row and knows the key.'
  ],
  sourceIds: sources.map(s => s.id)
};
const TWO_RULES = [family.rules[0], 'The changer may turn over up to two lanterns, or none, without saying which.', family.rules[2]];

const CONTROLS = {
  key: 'Tap a lantern to light it or put it out. Each picture has its own row. Check lets the changer try to fool the receiver; if it can, you see how.',
  decide: 'Tap a lantern to light it or put it out. Check lets the changer try to fool the receiver. After you have checked a key, you may say no key works with this many lanterns.',
  fewest: 'Choose how many lanterns, then tap lanterns to light them. Check lets the changer try. After checking a key, you may say no key works with this many lanterns.',
  changer: 'Tap the lanterns in the dashed row to build the row the receiver will see, then Send. If no row can fool the receiver, say so (after one send). Next key moves on once you have fooled the receiver or shown it cannot be done.',
  partners: 'Tap the square’s lanterns to make a row, then Add row. Tap × to remove one. When you have every row that always works, press That’s every one. You get one check per question.'
};
const range = (a, b) => Array.from({length: b - a + 1}, (_, i) => a + i);
const design = (pictures, lengths, goal, extra = {}) => ({mode: 'design', pictures, lengths, flips: 1, goal, ...extra});

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Two pictures, three lanterns',
    parameters: design(2, [3], 'key'),
    objective: 'Give the triangle and the square each a row of three lanterns so that the changer can never fool the receiver. Check to let the changer try.',
    visibleObjective: 'Make a key the changer can’t fool.',
    idea: 'Two rows of three lanterns survive one change exactly when they are opposites, such as dark-dark-dark and lit-lit-lit.',
    prerequisites: 'Tap to light a lantern. Nothing to read but the goal.',
    hints: ['Check any key and watch how the changer fools it.', 'Make the two rows as different as you can.', 'Light every lantern in one row and none in the other.'],
    parent: {
      notice: 'Whether your child changes the key after seeing the changer’s trick, or tries keys at random.',
      prompt: 'Why can’t the changer fool this key?',
      explanation: 'From 000 the changer can make 000, 100, 010 and 001: at most one lit. From 111 it makes rows with at least two lit. The lists never meet, so the receiver can always tell. Any two opposite rows work the same way, and only opposite rows do.',
      extension: 'How many different keys work? (Swapping the pictures makes a different key.)',
      connection: 'Rows that differ in 3 places correct one error: the repetition code.'
    },
    provenance: 'Week 18 K–1 Problems 1 and 4 and grades 2–3 Problem 3 (three-counter keys).'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Be the changer',
    parameters: {mode: 'changer', flips: 1, keys: [['0110', '0100'], ['1100', '0010'], ['1001', '0101'], ['0101', '1010']]},
    objective: 'You are the changer. For each key, build a row that both pictures could become after one change or none, and send it. If no such row exists, say the key can’t be fooled.',
    visibleObjective: 'Fool the receiver, or say it can’t be done.',
    idea: 'Keys whose rows differ in 1 or 2 places can be fooled; 3 or 4 places cannot.',
    prerequisites: 'Codebooks puzzle 1.',
    hints: ['Compare the two rows lantern by lantern. Where are they different?', 'If they differ in two places, change one of them.', 'Rows that differ in three or more places can’t be fooled.'],
    parent: {
      notice: 'Whether your child counts the places where the two rows differ before trying.',
      prompt: 'Which keys could you fool? What do they have in common?',
      explanation: 'Rows that differ in 1 place: either row is one change from the other. In 2 places: change one of them and you are halfway. In 3 or more places, a row one change from each would make the rows differ in at most 2 places.',
      extension: 'Make a key the changer can’t fool with as few lanterns as you can.',
      connection: 'The changer can fool a key exactly when some two rows are at Hamming distance at most 2.'
    },
    provenance: 'Week 18 grades 2–3 Problem 2 (keys differing in 1, 2, 3 and 4 places) and K–1 Problem 2. New keys.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Fewest lanterns',
    parameters: design(2, [1, 2, 3, 4], 'fewest'),
    objective: 'Find a key for two pictures that the changer can’t fool, using as few lanterns as possible, and say when fewer lanterns cannot work.',
    visibleObjective: 'Use as few lanterns as you can.',
    idea: 'Three lanterns are needed: with two, any two different rows differ in only one or two places.',
    prerequisites: 'Codebooks puzzles 1 and 2.',
    hints: ['Start with 1 lantern. What does the changer do?', 'With 2 lanterns there are only four rows. Try them.', 'Three lanterns work; can two?'],
    parent: {
      notice: 'Whether your child tries every key with two lanterns before saying none works.',
      prompt: 'How do you know no key with two lanterns works?',
      explanation: 'With two lanterns, two different rows differ in 1 or 2 places, and puzzle 2 showed both can be fooled. With three, opposite rows work.',
      extension: 'With two lanterns, which keys at least let the receiver notice that something changed?',
      connection: 'For one change, two pictures need distance 3, so length 3.'
    },
    provenance: 'Week 18 K–1 Problem 3 and grades 2–3 Problem 3 (the shortest key for two pictures).'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Three pictures, three lanterns',
    parameters: design(3, [3], 'decide'),
    objective: 'Give three pictures rows of three lanterns that the changer can never confuse, or say that it cannot be done.',
    visibleObjective: 'Make a key, or say it can’t be done.',
    idea: 'It cannot be done: the only rows that differ in three places are opposites, and a third row is close to one of them.',
    prerequisites: 'Codebooks puzzles 1–3.',
    hints: ['Start with a key that works for two pictures. Where could the third row go?', 'Which rows differ from both 000 and 111 in three places?', 'Each row of three is within one change of 000 or of 111.'],
    parent: {
      notice: 'Whether your child explains why each third row fails, not just that the ones tried failed.',
      prompt: 'Is there any row that is far from both of the first two?',
      explanation: 'Two rows that differ in 3 places of 3 are opposites. Any third row has at most one or at least two lit lanterns, so it is within one change of all-dark or all-lit: the changer can confuse it with one of them.',
      extension: 'How many lanterns do three pictures need?',
      connection: 'A(3, 3) = 2: the largest code of length 3 and distance 3 has two words.'
    },
    provenance: 'Week 18 K–1 Problem 6 (three pictures on three counters).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Two lit in every row',
    parameters: design(2, [4], 'key', {weight: 2}),
    objective: 'Give the triangle and the square rows of four lanterns, each with exactly two lit, so that the changer can never fool the receiver.',
    visibleObjective: 'Two lit in every row. Make a key the changer can’t fool.',
    idea: 'Rows with two lit each differ in an even number of places: 0, 2 or 4. Only 4 works, so the rows must be opposites.',
    prerequisites: 'Codebooks puzzles 1–3.',
    hints: ['Check a key and count the places where the rows differ.', 'Can two such rows differ in exactly three places?', 'Make the square’s row the opposite of the triangle’s.'],
    parent: {
      notice: 'Whether your child notices that the rows never differ in an odd number of places.',
      prompt: 'Why can’t two of these rows differ in exactly three places?',
      explanation: 'Going from one row to the other, every lantern turned on must be matched by one turned off, since both have two lit. So the number of differences is even. Three is impossible; four means opposites. There are 6 such keys.',
      extension: 'What if each row has exactly one lit lantern?',
      connection: 'A parity argument: words of equal weight are at even distance.'
    },
    provenance: 'Week 18 grades 2–3 Problem 4 (four-counter keys with two filled).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Every partner',
    parameters: {mode: 'partners', flips: 1, rounds: ['0100', '1100', '0000']},
    objective: 'The triangle’s row is given. Find every row for the square that the changer can never confuse with it, then press That’s every one.',
    visibleObjective: 'Find every square row that always works.',
    idea: 'A partner differs from the triangle in 3 or 4 places: the opposite row and the four rows one change from it.',
    prerequisites: 'Codebooks puzzles 1–3.',
    hints: ['Start with the row opposite the triangle’s.', 'Now change one lantern of that opposite row. Does it still work?', 'There are five.'],
    parent: {
      notice: 'Whether your child organises the search (the opposite, then each one-change variant) rather than guessing.',
      prompt: 'How do you know you have them all?',
      explanation: 'A square row works when it differs from the triangle’s in at least 3 of 4 places: in all 4 (the opposite) or in exactly 3 (the opposite with one lantern turned back). That is 1 + 4 = 5 rows, whatever the triangle’s row is.',
      extension: 'With five lanterns, how many partners does a row have?',
      connection: 'The rows at distance at least 3 from a word of length 4.'
    },
    provenance: 'Week 18 K–1 Problem 5 (every square row for each key), without its both-kinds rule.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Longer rows',
    parameters: {mode: 'changer', flips: 1, keys: [['100110', '011110'], ['000000', '111000', '011100'], ['001001', '001111'], ['110011', '001111', '111100']]},
    objective: 'You are the changer. For each key, build a row that two pictures could both become after one change or none, and send it. If no such row exists, say the key can’t be fooled.',
    visibleObjective: 'Fool the receiver, or say it can’t be done.',
    idea: 'Length does not matter: only the number of places where two rows differ. With three pictures, look for the closest pair.',
    prerequisites: 'Codebooks puzzle 2.',
    hints: ['For each two pictures, count the places where their rows differ.', 'Find the two rows that differ in only two places.', 'If every two rows differ in three or more places, the key can’t be fooled.'],
    parent: {
      notice: 'Whether your child compares every pair of pictures in the three-picture keys.',
      prompt: 'Does it matter how long the rows are?',
      explanation: 'The changer fools a key exactly when some two rows differ in at most 2 places, at any length. The second key has two rows that differ in 2 places (111000 and 011100), although each is 3 from all-dark.',
      extension: 'Make a three-picture key with six lanterns that can’t be fooled.',
      connection: 'The minimum distance of a code decides how many errors it corrects.'
    },
    provenance: 'Week 18 grades 4–5 Problem 3 (pairs of six-entry rows) and Problem 1. New keys, with three pictures added.'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Four pictures, five lanterns',
    parameters: design(4, [5], 'decide'),
    objective: 'Give four pictures rows of five lanterns that the changer can never confuse, or say that it cannot be done.',
    visibleObjective: 'Make a key, or say it can’t be done.',
    idea: 'It can be done, for example 00000, 11100, 00111 and 11011: every two differ in at least 3 places.',
    prerequisites: 'Codebooks puzzles 1–7.',
    hints: ['Start with two opposite rows. Where can a third go?', 'Each new row must differ from every row so far in at least three places.', 'Try 00000 and 11100, then a row that is far from both.'],
    parent: {
      notice: 'Whether your child checks each new row against every earlier row.',
      prompt: 'How do you know this key always works?',
      explanation: 'Check all six pairs: each differs in at least 3 places, so no received row can come from two pictures. The catalogue shows four groups of six rows, 24 of the 32, with no overlap.',
      extension: 'Can five pictures share five lanterns?',
      connection: 'A(5, 3) = 4.'
    },
    provenance: 'Week 18 grades 2–3 Problem 5 and grades 4–5 Problem 2 (four pictures, five counters).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Four pictures, four lanterns',
    parameters: design(4, [4], 'decide'),
    objective: 'Give four pictures rows of four lanterns that the changer can never confuse, or say that it cannot be done.',
    visibleObjective: 'Make a key, or say it can’t be done.',
    idea: 'It cannot be done: each picture can become 5 rows, so four pictures need 20 different rows, but there are only 16.',
    prerequisites: 'Codebooks puzzle 8.',
    hints: ['After a check, look at the list of every row. How many rows does each picture use?', 'Each picture uses 5 rows. How many rows of four lanterns are there?', 'Four pictures need 20 rows; there are 16.'],
    parent: {
      notice: 'Whether your child uses the catalogue to count, rather than trying keys until tired.',
      prompt: 'How many rows of four lanterns are there? How many does each picture need?',
      explanation: 'A row of 4 can become itself or one of 4 one-change rows: 5 rows, which must not overlap between pictures. Four pictures need 20 rows, but there are only 2 × 2 × 2 × 2 = 16.',
      extension: 'Does the same count rule out three pictures on four lanterns?',
      connection: 'The sphere-packing (Hamming) bound M(n + 1) ≤ 2ⁿ.'
    },
    provenance: 'Week 18 grades 4–5 Problem 5 (the shortest length for four pictures).'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Three pictures, four lanterns',
    parameters: design(3, [4], 'decide'),
    objective: 'Give three pictures rows of four lanterns that the changer can never confuse, or say that it cannot be done.',
    visibleObjective: 'Make a key, or say it can’t be done.',
    idea: 'It cannot be done, although the count allows it: 3 × 5 = 15 ≤ 16. Three rows of four differ in at most 8 places in total, and three pairs at 3 or more need 9.',
    prerequisites: 'Codebooks puzzle 9.',
    hints: ['The count from puzzle 9 says 15 rows are needed and 16 exist. Try it.', 'Look at one lantern across the three rows. In how many of the three pairs can it differ?', 'Each lantern differs in at most 2 of the 3 pairs.'],
    parent: {
      notice: 'Whether your child is surprised that the count allows it, and keeps looking for another reason.',
      prompt: 'If the count fits, why does every key fail?',
      explanation: 'At each lantern, three rows are either all alike (0 differing pairs) or two against one (2 differing pairs). So the three pairwise differences add up to at most 2 × 4 = 8, but three pairs at 3 or more need 9.',
      extension: 'How many lanterns do three pictures need?',
      connection: 'The packing bound is necessary, not sufficient; this is the Plotkin-style pair-sum argument.'
    },
    provenance: 'Week 18 grades 4–5 Problem 6 (three pictures with four entries).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Two changes',
    parameters: {...design(2, [3, 4, 5, 6], 'fewest'), flips: 2},
    rules: TWO_RULES,
    objective: 'The changer may now turn over up to two lanterns. Find a key for two pictures that the changer can’t fool, using as few lanterns as possible, and say when fewer lanterns cannot work.',
    visibleObjective: 'Up to two changes. Use as few lanterns as you can.',
    idea: 'Two changes need rows that differ in 5 places, so 5 lanterns.',
    prerequisites: 'Codebooks puzzles 1–3.',
    hints: ['Check a key with 4 lanterns and watch the changer.', 'Two changes from each side can meet in the middle of 4 differences.', 'Try opposite rows of five.'],
    parent: {
      notice: 'Whether your child connects “3 for one change” with “5 for two changes”.',
      prompt: 'How many differences does the changer need to close the gap?',
      explanation: 'With up to t changes, two rows can meet in the middle when they differ in 2t places or fewer. So t = 2 needs 5 differences, and 4 lanterns are too few. On 5 lanterns, each picture can become 16 rows: together exactly the 32.',
      extension: 'How many lanterns would three changes need?',
      connection: 'Correcting t errors needs minimum distance 2t + 1; 00000/11111 is a perfect code.'
    },
    provenance: 'Week 18 grades 2–3 Problem 6 (up to two changes).'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Eight pictures, six lanterns',
    parameters: design(8, [6], 'key'),
    objective: 'Give eight pictures rows of six lanterns that the changer can never confuse. Check to let the changer try.',
    visibleObjective: 'Make a key for eight pictures.',
    idea: 'Eight pictures fit in six lanterns: going through rows in counting order and keeping each row that differs from every kept row in 3 or more places finds them.',
    prerequisites: 'Codebooks puzzles 8–10.',
    hints: ['Start with all dark. Each new row must differ from every kept row in at least three places.', 'Try rows in counting order: 000000, 000001, 000010, …, and keep the ones that are far enough from all kept rows.', '000000, 000111, 011001, 011110, 101010, 101101, 110011, 110100.'],
    parent: {
      notice: 'Whether your child finds a system (counting order) rather than guessing rows.',
      prompt: 'Is there room for a ninth picture? How could you tell?',
      explanation: 'The greedy list 000000, 000111, 011001, 011110, 101010, 101101, 110011, 110100 has every two rows 3 or more apart. Each picture uses 7 of the 64 rows, 56 in all. A ninth picture would need 63 ≤ 64, which the count allows, but no ninth row fits.',
      extension: 'Turning over the first lantern of every row gives another key. Why does it still work?',
      connection: 'A shortened Hamming code; greedy “lexicodes” in counting order are always linear codes.'
    },
    provenance: 'New: beyond Week 18, the next size up after grades 4–5 Problems 2 and 5.'
  }
];

export function answers(item) {
  const q = item.parameters, gap = 2 * q.flips + 1;
  if (q.mode === 'changer') return {foolable: q.keys.map(key => Boolean(fooling(key, q.flips))), rows: q.keys.map(key => fooling(key, q.flips)?.row ?? null)};
  if (q.mode === 'partners') return {rounds: q.rounds.map(row => partnersOf(row, q.flips))};
  if (q.goal === 'fewest') return {fewest: fewest(q)};
  const n = q.lengths[0], can = possible(n, q.pictures, gap, q.weight ?? null);
  const keys = q.pictures === 2 ? words(n).flatMap(a => words(n).filter(b => a !== b && distance(a, b) >= gap && (q.weight == null || [a, b].every(r => [...r].filter(c => c === '1').length === q.weight))).map(b => [a, b])).length : undefined;
  return {possible: can, ...(keys !== undefined ? {keys} : {})};
}
export const puzzles = authored.map(item => ({
  id: `codebooks-${String(item.number).padStart(2, '0')}`,
  number: item.number,
  title: item.title,
  band: 'all',
  difficulty_level: item.difficulty_level,
  mechanic: 'codebook',
  libraryFamily: 'code',
  group: 'Codebooks',
  familyTitle: 'Signal Lanterns',
  revision: 1,
  parameters: item.parameters,
  objective: item.objective,
  visibleObjective: item.visibleObjective ?? item.objective,
  instruction: item.objective,
  controls: CONTROLS[item.parameters.mode === 'design' ? item.parameters.goal : item.parameters.mode],
  rules: item.rules ?? (item.parameters.mode === 'partners' ? [...family.rules, 'You get one check per question. After a miss, the answer is shown and Next brings a different question.'] : family.rules),
  idea: item.idea,
  prerequisites: item.prerequisites,
  hints: item.hints,
  parent: {...item.parent, sourceIds: ['codebooks-week18', 'codebooks-hamming', ...(/A\(|bound|lexicode|Plotkin/.test(item.parent.connection) ? ['codebooks-brouwer'] : [])]},
  solution: answers(item),
  provenance: item.provenance,
  sourceDocument: 'docs/codebooks/README.md'
}));
export const pack = {title: 'Signal Lanterns codebooks', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/codebooks/codebooks.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, JSON.stringify(p.parameters), JSON.stringify(p.solution));
}
