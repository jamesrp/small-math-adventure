// Builds dist/families/sorting/sorting.json, the Sorting machines pack, from
// the authoring list below. The facts each puzzle relies on (which starts a
// machine gets wrong, which bars repair it) are computed here from
// dist/families/sorting/sorting.js and checked again, by a separate simulator,
// in scripts/validate-sorting.mjs.
// Design notes and worksheet sources: docs/sorting/README.md.
import {writeFile} from 'node:fs/promises';
import {failures, sortsAll, key, breakers} from '../dist/families/sorting/sorting.js';

const WEEK23 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-23';
export const sources = [
  {id: 'sorting-week23', title: 'Bellingham Math Circle — Week 23: Sorting networks and fixed machines, packets and adult guide', url: WEEK23, kind: 'local curriculum'},
  {id: 'sorting-knuth', title: 'Donald E. Knuth — The Art of Computer Programming, Volume 3: Sorting and Searching, §5.3.4 Networks for sorting (2nd ed., 1998)', url: 'https://www-cs-faculty.stanford.edu/~knuth/taocp.html', kind: 'book'},
  {id: 'sorting-liverpool', title: 'University of Liverpool COMP308, Lecture 17: comparison networks and the zero–one principle', url: 'https://cgi.csc.liv.ac.uk/~igor/COMP308/files/Lecture17.pdf', kind: 'lecture notes'},
  {id: 'sorting-codish', title: 'Michael Codish, Luís Cruz-Filipe, Michael Frank and Peter Schneider-Kamp — Twenty-Five Comparators Is Optimal When Sorting Nine Inputs (and Twenty-Nine for Ten) (2014)', url: 'https://arxiv.org/abs/1405.5754', kind: 'research'}
];
export const family = {
  id: 'sorting',
  title: 'Sorting machines',
  mathematics: 'A bar joins two lanes and sends the smaller card to the upper lane; a machine is a fixed list of bars, the same for every start. One wrong finish shows a machine does not sort. A machine sorts every start exactly when it sorts every start made of short and tall cards (the 0–1 principle), because sorting commutes with replacing each card by short or tall. A run of k bars lights them in at most 2^k ways, and starts that light the same bars are moved the same way, so a sorter for n cards needs 2^k ≥ n!: three bars for three lanes and five for four, both reached.',
  rules: [
    'Cards ride from left to right along their lanes.',
    'At a bar, the two cards it joins compare: the smaller goes to the upper lane, the larger to the lower one.',
    'A machine sorts a start when the cards finish smallest at the top and largest at the bottom.',
    'The bars stay where they are for every start.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const TALL = 'Short and tall cards compare the same way: short goes up, tall goes down.';
const CONTROLS = {
  break: 'Tap two cards on the left to swap them, or drag one onto another. Run sends them through the machine.',
  binary: 'Tap a card on the left to change it between short and tall. Run sends them through the machine.',
  every: 'Tap two cards on the left to swap them, or drag one onto another. Run sends them through the machine; each start you run is kept below. Press That’s all when you have every start it gets wrong.',
  everyBinary: 'Tap a card on the left to change it between short and tall. Run sends them through the machine; each start you run is kept below. Press That’s all when you have every start it gets wrong.',
  lights: 'Tap two cards on the left to swap them, or drag one onto another. Run sends them through the machine; a bar lights when its cards swap, and each start you run is kept below with its lights.',
  build: 'Tap one dot in an empty column, then another dot in the same column, to place a bar between those lanes. Tap a bar you placed to take it away. Test sends every start through the machine. Run sends just the cards on the left; tap two of them to swap.'
};
const m = list => list.map(s => s.split('').map(Number));

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Break the machine',
    parameters: {mode: 'break', lanes: 3, cards: 'numbers', machine: [[1, 2], [2, 3]], start: [3, 1, 2]},
    objective: 'Find a start this machine gets wrong.',
    idea: 'A machine that sorts some starts can still fail; one wrong finish is enough to show it.',
    prerequisites: 'Tell which of two numbers up to 3 is smaller. No reading needed once a grown-up has read the goal.',
    hints: ['Press Run and watch where the 3 goes.', 'The big card always reaches the bottom. Which card might get stuck?', 'Try 3, 2, 1.'],
    parent: {
      notice: 'The largest card always ends at the bottom, but the top two can stay out of order.',
      prompt: 'Which cards does the last bar never compare?',
      explanation: 'The two bars carry the largest card down to the bottom lane, as one pass of bubble sort does. Nothing compares the top two lanes afterwards, so 3, 2, 1 finishes 2, 1, 3 and 2, 3, 1 also finishes 2, 1, 3. The machine sorts the other four starts. A single failing start is a complete proof that a machine does not sort.',
      extension: 'Add one more bar on the right so that every start comes out in order. Where must it go?',
      connection: 'This is one pass of bubble sort written as a comparator network (Knuth, §5.3.4).'
    },
    provenance: 'Week 23 K–1 Problem 1 and grades 2–3 Problem 1 (run every start through a fixed three-lane machine), as a search for one failing start.',
    sourceIds: ['sorting-week23', 'sorting-knuth']
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Every wrong start',
    parameters: {mode: 'every', lanes: 3, cards: 'numbers', machine: [[1, 2], [1, 3]], start: [2, 1, 3]},
    objective: 'Find every start this machine gets wrong.',
    idea: 'Knowing you have all of them means knowing all six orders of three cards.',
    prerequisites: 'Compare numbers up to 3. Keep track of which orders have been tried, using the row below the board.',
    hints: ['Press Run, then swap two cards and run again.', 'The 1 always reaches the top. Look at the other two lanes.', 'Three cards can start in six orders. Has each one been run?'],
    parent: {
      notice: 'The smallest card always reaches the top, but the bottom two lanes are never compared.',
      prompt: 'How do you know you have tried every start?',
      explanation: 'Both bars touch the top lane, so the 1 always finishes on top. The lower two lanes then keep whatever order they reach, so the machine gets 1, 3, 2, then 2, 3, 1, then 3, 1, 2 and 3, 2, 1 wrong and sorts only 1, 2, 3 and 2, 1, 3. Listing six orders systematically (by which card starts on top) is how a child can be sure the list is complete.',
      extension: 'Which single bar, added on the right, would make it sort everything?',
      connection: 'Finding a minimum among n cards takes n − 1 comparisons; this machine is that selection step, not a sorter (Knuth, §5.3.4).'
    },
    provenance: 'Week 23 K–1 Problem 3 and grades 2–3 Problem 1 (find every start a fixed machine gets wrong).',
    sourceIds: ['sorting-week23', 'sorting-knuth'],
    expect: {wrong: m(['132', '231', '312', '321'])}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'One more bar',
    parameters: {mode: 'build', lanes: 3, cards: 'numbers', machine: [[1, 2], [2, 3]], slots: 3, start: [3, 2, 1]},
    objective: 'Add a bar so this machine sorts every start.',
    idea: 'After the largest card has sunk to the bottom, one comparison of the top two finishes the job.',
    prerequisites: 'Compare numbers up to 3. Read the ticks under the board with a grown-up.',
    hints: ['Press Run to see where 3, 2, 1 goes wrong.', 'The bottom card is always right. Which two lanes still need comparing?', 'Join the top two lanes, then Test.'],
    parent: {
      notice: 'The only bar that works joins the top two lanes.',
      prompt: 'Why can’t the new bar join the bottom two lanes?',
      explanation: 'The first two bars always bring the 3 to the bottom lane. What is left is two cards in the top lanes, which only a bar joining those lanes can put in order. A bar on the bottom two lanes compares the 3 with something smaller and never moves it, and a bar joining the top and bottom lanes does the same.',
      extension: 'Can you build a three-bar sorter whose first bar joins the top and bottom lanes?',
      connection: 'Bubble sort on three cards as a network: 12, 23, 12 (Knuth, §5.3.4).'
    },
    provenance: 'Week 23 K–1 Problem 5 and grades 2–3 Problem 3 (add one bar at the right so the machine sorts every start).',
    sourceIds: ['sorting-week23', 'sorting-knuth'],
    expect: {repairs: [[1, 2]]}
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Three bars',
    parameters: {mode: 'build', lanes: 3, cards: 'numbers', machine: [], slots: 3, start: [3, 2, 1]},
    objective: 'Build a machine that sorts every start.',
    idea: 'Three bars are enough for three cards; there are six sorters with three bars.',
    prerequisites: 'Compare numbers up to 3. Place a bar by tapping two dots.',
    hints: ['Put any bar in the first column and press Test.', 'Try to get the biggest card to the bottom first.', 'Join the top two, then the bottom two, then the top two.'],
    parent: {
      notice: 'Every working machine uses all three columns.',
      prompt: 'Could a machine with only two bars sort every start?',
      explanation: 'Two bars can light up in at most four ways (each bar swaps or not), but there are six starts. Two starts that light the same bars are moved the same way, so they finish in different orders and one of them is wrong. Three bars give eight ways, enough for six starts, and six of the 27 three-bar machines sort.',
      extension: 'Find all six three-bar sorters. What do they have in common?',
      connection: 'The counting bound: a sorter with k bars needs 2^k ≥ n! (Knuth, §5.3.4; Week 23 guide, Exact small minima).'
    },
    provenance: 'Week 23 K–1 Problem 2 and grades 2–3 Problem 2 (build a three-lane sorter with as few bars as you can).',
    sourceIds: ['sorting-week23', 'sorting-knuth'],
    expect: {sorters: 6}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Same lights',
    parameters: {mode: 'lights', lanes: 3, cards: 'numbers', machine: [[1, 2], [2, 3]], start: [1, 2, 3]},
    objective: 'Find two starts that light the same bars.',
    idea: 'Two bars light up in only four ways, so six starts must share; starts that share are moved alike and cannot both finish in order.',
    prerequisites: 'Compare numbers up to 3. Match a pattern of lit bars in the row below the board.',
    hints: ['Run a start, then a different one, and compare the lights below.', 'Look for a start where only the second bar lights.', 'Try 1, 3, 2 and 2, 3, 1.'],
    parent: {
      notice: 'The two starts that light the same bars finish in different orders.',
      prompt: 'If two starts are moved exactly the same way, can both finish in order?',
      explanation: 'Each bar either swaps or not, so two bars give four light patterns for six starts, and some pattern must repeat. Two different starts with the same pattern are moved by the same swaps, so they finish in different orders, and at most one of them is in order. That is why no two-bar machine sorts three cards. Here 1, 3, 2 and 2, 3, 1 light only the second bar, and 3, 1, 2 and 3, 2, 1 light both.',
      extension: 'A machine with three bars has eight patterns. Must a three-bar sorter use six different ones?',
      connection: 'This is the information-theoretic lower bound for comparator networks, the same counting that gives n! ≤ 2^k (Knuth, §5.3.4; Week 23 grades 4–5 Problem 6).'
    },
    provenance: 'Week 23 grades 4–5 Problem 6 (swap/no-swap records and the starts that make each), with lit bars as the record.',
    sourceIds: ['sorting-week23', 'sorting-knuth']
  },
  {
    number: 6, difficulty_level: 'medium', title: 'One more bar, four lanes',
    parameters: {mode: 'build', lanes: 4, cards: 'numbers', machine: [[1, 2], [3, 4], [1, 3], [2, 4]], slots: 5, start: [4, 3, 2, 1]},
    objective: 'Add a bar so this machine sorts every start.',
    idea: 'Four bars already put the smallest card on top and the largest at the bottom; one more fixes the middle.',
    prerequisites: 'Compare numbers up to 4. Read the ticks under the board.',
    hints: ['Press Run on a few starts. Which lanes are always right?', 'The top and bottom cards are always right.', 'Join the two middle lanes.'],
    parent: {
      notice: 'After the first four bars the 1 is always on top and the 4 always at the bottom.',
      prompt: 'Why does the bar joining the middle lanes fix every start?',
      explanation: 'The first two bars sort each pair. The next two compare the two smaller cards and the two larger ones, which sends the smallest of all to the top and the largest to the bottom. Only the middle two can still be out of order, and one bar between the middle lanes settles them. This five-bar machine sorts all 24 orders.',
      extension: 'Rearrange the same five bars in a different order. Does it still sort?',
      connection: 'A five-comparator sorter for four inputs, the fewest possible (Knuth, §5.3.4).'
    },
    provenance: 'Week 23 grades 2–3 Problem 3 (add one bar at the right of a four-lane machine).',
    sourceIds: ['sorting-week23', 'sorting-knuth'],
    expect: {repairs: [[2, 3]]}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Neighbors only',
    parameters: {mode: 'build', lanes: 4, cards: 'numbers', machine: [], slots: 6, adjacent: true, start: [4, 3, 2, 1]},
    objective: 'Build a machine that sorts every start. Bars join lanes side by side.',
    idea: 'With bars only between neighboring lanes, each swap fixes one out-of-order pair, and 4, 3, 2, 1 has six.',
    prerequisites: 'Compare numbers up to 4. Place bars between neighboring lanes.',
    hints: ['Send 4, 3, 2, 1 through and count the swaps it needs.', 'Carry the biggest card down to the bottom with three bars first.', 'Top pair, middle pair, bottom pair; then top, middle; then top.'],
    parent: {
      notice: 'Every working machine uses all six columns, and 4, 3, 2, 1 lights every bar.',
      prompt: 'Why can’t five neighbor bars sort 4, 3, 2, 1?',
      explanation: 'A swap between neighbors puts one out-of-order pair in order and changes no other pair. The start 4, 3, 2, 1 has six pairs out of order, so it needs six swaps, and a machine with five neighbor bars cannot sort it. Bubble sort and odd–even transposition sort both use six.',
      extension: 'With bars allowed between any two lanes, five are enough. Which pairs does a long bar fix at once?',
      connection: 'Inversions: an adjacent transposition changes the inversion count by exactly one (Knuth, §5.3.4, exercise on bubble sort networks).'
    },
    provenance: 'Week 23 grades 2–3 Problem 6 (a four-lane sorter whose bars join neighboring lanes; explain why fewer cannot work).',
    sourceIds: ['sorting-week23', 'sorting-knuth'],
    expect: {sorters: 16}
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Past fixing',
    parameters: {mode: 'break', target: 'unfixable', lanes: 4, cards: 'numbers', machine: [[1, 2], [3, 4], [1, 4], [2, 3]], start: [1, 2, 3, 4]},
    objective: 'Find a start that one more bar can’t fix.',
    idea: 'One bar swaps one pair, so a finish with two separate pairs out of order shows that no single extra bar repairs this machine.',
    prerequisites: 'Compare numbers up to 4. See which cards in a finish are out of order.',
    hints: ['Press Run on a few starts and look at the red cards in each finish.', 'One bar can swap only one pair. Look for a finish with two pairs out of order.', 'Try 2, 4, 1, 3.'],
    parent: {
      notice: 'Every start that can’t be fixed finishes 2, 1, 4, 3: the top pair and the bottom pair are both reversed.',
      prompt: 'Why does this one start prove that no extra bar repairs the machine?',
      explanation: 'A bar compares two lanes and swaps at most those two cards. A finish of 2, 1, 4, 3 needs the top pair and the bottom pair swapped, two separate swaps, so whichever bar is added, this start still comes out wrong. Eight of the 24 starts finish that way, so the machine cannot be repaired with one bar. The same four bars in another order can be: with the long bar and the middle bar first and the top and bottom pairs after, one more bar on the middle lanes sorts every start.',
      extension: 'Put the same four bars in a different order so that one more bar sorts every start.',
      connection: 'A certificate for a "can’t": one start that defeats every possible last bar (Week 23 guide, grades 2–3 Problem 3).'
    },
    provenance: 'Week 23 grades 2–3 Problem 3, the bottom machine (12, 34, 14, 23), which no single bar repairs; 2413 finishes 2143.',
    sourceIds: ['sorting-week23'],
    expect: {repairs: [], unfixable: m(['2413', '2431', '3412', '3421', '4213', '4231', '4312', '4321'])}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Short and tall',
    parameters: {mode: 'break', lanes: 4, cards: 'binary', machine: [[1, 3], [2, 4], [2, 3], [1, 2], [3, 4]], start: [0, 0, 1, 1]},
    objective: 'Find a start this machine gets wrong.',
    idea: 'With only short and tall cards there are 16 starts to search, and this machine fails on just one.',
    prerequisites: 'Tell short from tall. Organize a search through starts made of two kinds of card.',
    hints: ['Press Run, then change a card and run again.', 'A start with all short or all tall cards can’t go wrong. Try two of each.', 'Try tall, short, tall, short.'],
    parent: {
      notice: 'Only tall, short, tall, short goes wrong; it finishes short, tall, short, tall.',
      prompt: 'This machine uses the same five bars as a sorter. What changed?',
      explanation: 'The bars are a five-bar sorter’s, but the middle bar comes before the outer pairs instead of last. For tall, short, tall, short the first three bars change nothing; then the top pair and the bottom pair each swap, leaving short, tall, short, tall, and no bar compares the middle lanes again. Every other short-and-tall start comes out in order.',
      extension: 'Move the middle bar to the end. Does the machine now sort every short-and-tall start?',
      connection: 'The 0–1 principle: a network sorts every input if and only if it sorts every input of 0s and 1s (Knuth, §5.3.4, Theorem Z).'
    },
    provenance: 'Week 23 grades 4–5 Problem 5 (a sorter’s five bars in another order) and grades 2–3 Problems 4 and 5 (0–1 starts as a complete test). The machine is new: it fails on one 0–1 start, where the worksheet’s fails on two.',
    sourceIds: ['sorting-week23', 'sorting-knuth', 'sorting-liverpool'],
    expect: {wrong: m(['1010'])}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Short, tall and numbers',
    parameters: {mode: 'break', lanes: 4, cards: 'numbers', machine: [[1, 3], [2, 4], [2, 3], [1, 2], [3, 4]], start: [1, 2, 3, 4]},
    objective: 'Find a start this machine gets wrong.',
    idea: 'Only 4 of the 24 orders fail, and each is the short-and-tall failure with small numbers on the short cards.',
    prerequisites: 'Compare numbers up to 4. Use the previous puzzle’s short-and-tall start as a guide.',
    hints: ['Press Run, then swap two cards and run again.', 'In the last puzzle, tall, short, tall, short went wrong. Put big numbers where the tall cards were.', 'Try 3, 1, 4, 2.'],
    parent: {
      notice: 'The failing orders are 3, 1, 4, 2 and 3, 2, 4, 1 and 4, 1, 3, 2 and 4, 2, 3, 1: big numbers exactly where the tall cards were.',
      prompt: 'If you call 1 and 2 short and 3 and 4 tall, which start do these four become?',
      explanation: 'Replacing small numbers by short and large ones by tall gives the same result whether you do it before or after a bar, since a bar only compares. So a number start finishes out of order exactly when, for some cut between small and large, its short-and-tall copy does. Here the only failing short-and-tall start is tall, short, tall, short, so the failing number starts are the four with 3 and 4 in the first and third lanes.',
      extension: 'Why must a machine that gets one number start wrong get at least four of the 24 wrong?',
      connection: 'The proof of the 0–1 principle by thresholding (Knuth, §5.3.4; Liverpool COMP308, Lecture 17).'
    },
    provenance: 'Week 23 grades 4–5 Problems 3 and 4 (thresholds commute with a bar; a sorter of 0–1 starts sorts number starts).',
    sourceIds: ['sorting-week23', 'sorting-knuth', 'sorting-liverpool'],
    expect: {wrong: m(['3142', '3241', '4132', '4231'])}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Every short-and-tall start',
    parameters: {mode: 'every', lanes: 4, cards: 'binary', machine: [[1, 2], [3, 4], [1, 3], [2, 4]], start: [0, 0, 0, 0]},
    objective: 'Find every start this machine gets wrong.',
    idea: 'Of 16 short-and-tall starts, the four that fail are the ones with two of each and different middle cards after the first bars.',
    prerequisites: 'Tell short from tall. Organize 16 starts; the row below keeps the ones tried.',
    hints: ['Run a start with one tall card, then two.', 'Starts with one tall card or three always come out in order. Look at two of each.', 'Two of the six starts with two tall cards come out in order.'],
    parent: {
      notice: 'Every failure has two short and two tall cards, and all four finish short, tall, short, tall.',
      prompt: 'Why can’t a start with just one tall card go wrong here?',
      explanation: 'The first four bars put a smallest card on top and a largest at the bottom. With one tall card, or one short card, that already sorts. With two of each, the middle lanes can finish tall above short: the machine fails on short, tall, short, tall and on short, tall, tall, short and their mirror images, and sorts short, short, tall, tall and tall, tall, short, short.',
      extension: 'Add the bar from the four-lane repair puzzle. Do all 16 now come out in order?',
      connection: 'Testing a network on 2^n inputs of 0s and 1s instead of n! orders is how sorting networks are checked by computer (Codish et al., §2).'
    },
    provenance: 'Week 23 grades 2–3 Problems 4 and 5 (find every 0–1 start and decide whether a machine sorts them all).',
    sourceIds: ['sorting-week23', 'sorting-codish'],
    expect: {wrong: m(['0101', '0110', '1001', '1010'])}
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Five bars',
    parameters: {mode: 'build', lanes: 4, cards: 'numbers', machine: [], slots: 5, start: [4, 3, 2, 1]},
    objective: 'Build a machine that sorts every start.',
    idea: 'Five bars are the fewest that sort four cards; only 12 of the 7,776 five-bar machines do.',
    prerequisites: 'Compare numbers up to 4. Plan: get the smallest card up and the largest down, then fix the middle.',
    hints: ['Start with bars that sort two pairs of lanes.', 'Two bars sort the top pair and the bottom pair. Then compare the smaller of each and the larger of each.', 'Top pair, bottom pair, first and third, second and fourth, middle pair.'],
    parent: {
      notice: 'Each sorter finds the smallest and largest with four bars and fixes the middle with the fifth.',
      prompt: 'How do the lights show that four bars can never be enough?',
      explanation: 'Four bars light up in at most 16 ways and there are 24 starts, so on any four-bar machine two starts light the same bars, are moved alike, and finish in different orders: one of them is wrong. Five bars give 32 patterns, and the machines that sort sort two pairs, compare the two winners and the two losers, and then compare the middle two.',
      extension: 'Run 1, 2, 3, 4 and 1, 3, 2, 4 through a four-bar machine such as 12, 34, 13, 24. Do they light the same bars? Five lanes need nine bars; try it in the playground.',
      connection: 'The fewest comparators that sort n inputs are known only for small n: nine for five, and 25 for nine, proved by computer search (Codish et al., 2014).'
    },
    provenance: 'Week 23 grades 4–5 Problems 2 and 7 (build a four-lane sorter with as few bars as you can; show fewer cannot work).',
    sourceIds: ['sorting-week23', 'sorting-knuth', 'sorting-codish'],
    expect: {sorters: 12}
  }
];

const playground = {
  id: 'sorting-playground', number: 0, title: 'Sorting machine playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Build any machine and send cards through it.',
  controls: 'Choose how many lanes and which cards. Tap two dots in a column to place a bar, and tap a bar to take it away. Tap two cards on the left to swap them, or tap a short or tall card to change it. Run sends the cards through; Test sends every start and shows one that goes wrong, if any; Shuffle picks a new start; Clear takes every bar away.',
  rules: RULES,
  idea: 'Free building with two to five lanes and either kind of card.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Pick four lanes and build a sorter, then switch to short and tall cards.', 'Try five lanes. How few bars can you use?', 'Build a machine that sorts every short-and-tall start, then test it with numbers.'],
  parent: {
    notice: 'A machine that gets every short-and-tall start right also gets every number start right.',
    prompt: 'Five lanes need nine bars. Can you find a nine-bar sorter?',
    explanation: 'Test checks every start. For numbers that is every order of the cards; for short and tall cards it is every row of the two kinds. By the 0–1 principle the two tests always agree about whether a machine sorts.',
    extension: 'Build a five-lane sorter with nine bars, the fewest possible.',
    connection: 'Optimal sorting networks are known only for small sizes (Codish et al., 2014).'
  },
  provenance: 'Week 23 materials: the four-lane mat with removable comparator strips, used for free building.',
  sourceIds: ['sorting-week23', 'sorting-codish']
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const puzzles = [playground, ...authored].map(({expect, sourceIds, parent, ...p}) => {
  const q = p.parameters;
  if (expect?.wrong) {
    const got = failures(q.machine.map(([a, b]) => [a - 1, b - 1]), q.lanes, q.cards);
    if (!same(got.map(key).sort(), expect.wrong.map(key).sort())) throw Error(`${p.number}: wrong starts are ${got.map(key)}`);
  }
  if (expect?.unfixable && !same(breakers(q).map(key).sort(), expect.unfixable.map(key).sort())) throw Error(`${p.number}: unfixable starts are ${breakers(q).map(key)}`);
  if (expect?.repairs) {
    const fixed = q.machine.map(([a, b]) => [a - 1, b - 1]), found = [];
    for (let i = 0; i < q.lanes; i++) for (let j = i + 1; j < q.lanes; j++) if (sortsAll([...fixed, [i, j]], q.lanes)) found.push([i + 1, j + 1]);
    if (!same(found, expect.repairs)) throw Error(`${p.number}: repairs are ${JSON.stringify(found)}`);
  }
  const controls = p.controls || (q.mode === 'break' ? (q.cards === 'binary' ? CONTROLS.binary : CONTROLS.break) : q.mode === 'every' ? (q.cards === 'binary' ? CONTROLS.everyBinary : CONTROLS.every) : CONTROLS[q.mode]);
  const rules = p.rules || [...RULES, ...(q.cards === 'binary' ? [TALL] : []), ...(q.adjacent ? ['Bars here join lanes that are side by side.'] : [])];
  return {
    id: q.mode === 'playground' ? p.id : `sorting-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'sorting', familyTitle: family.title, revision: 1, parameters: q,
    objective: p.objective, instruction: p.objective, controls, rules,
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...parent, sourceIds}, provenance: p.provenance, sourceDocument: 'docs/sorting/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/sorting/sorting.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
