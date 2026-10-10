// Builds dist/families/chips/chips.json, the Chip firing pack, from the
// authoring list below. Answer counts are computed here by exhaustive search
// (dist/families/chips/chips.js) and checked again by scripts/validate-chips.mjs.
// Like the Proofs pack, it stays separate from dist/puzzles.json so the
// expansion importer is unchanged.
// Design notes and worksheet sources: docs/chips/README.md.
import {writeFile} from 'node:fs/promises';
import {answers, boardInfo, stabilize} from '../dist/families/chips/chips.js';

const WEEK11 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-11';
export const sources = [
  {id: 'chips-hlmppw', title: 'Alexander E. Holroyd, Lionel Levine, Karola Mészáros, Yuval Peres, James Propp and David B. Wilson — Chip-Firing and Rotor-Routing on Directed Graphs (2008), §2', url: 'https://arxiv.org/abs/0801.3306', kind: 'research'},
  {id: 'chips-sandpile', title: 'Lionel Levine and James Propp — What is a sandpile? (2010)', url: 'https://lionellevine.github.io/what-is-a-sandpile.pdf', kind: 'research'},
  {id: 'chips-dhar', title: 'Deepak Dhar — Self-organized critical state of sandpile automaton models (1990)', url: 'https://doi.org/10.1103/PhysRevLett.64.1613', kind: 'research'},
  {id: 'chips-week11', title: 'Bellingham Math Circle — Week 11: Chip firing with a sink, packets, return visit and adult guides', url: WEEK11, kind: 'local curriculum'}
];
export const family = {
  id: 'chips',
  title: 'Chip firing',
  mathematics: 'A circle with at least one chip per line may fire, sending one chip along each line; a sink absorbs chips and never fires. With a sink every run stops, and every complete run from a start has the same finish and fires each circle the same number of times (the abelian property). The finishes of large starts are the recurrent configurations, which form the sandpile group; a weight that drops by a fixed amount at every firing turns termination into counting.',
  rules: [
    'A circle can fire when it holds at least one chip for each line that touches it.',
    'Firing sends one chip along each of its lines. Extra chips stay.',
    'The sink keeps every chip it receives and never fires.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const NO_SINK = ['A circle can fire when it holds at least one chip for each line that touches it.', 'Firing sends one chip along each of its lines. Extra chips stay.', 'This board has no sink, so chips never leave.'];
const CONTROLS = {
  orders: 'Tap a glowing circle to fire it. When no circle can fire, the order is saved. Again puts the starting chips back. Undo takes back one firing; saved orders stay.',
  place: 'Tap circles to place the chips from the tray. Then tap glowing circles to fire until none can. Again clears the board. Undo takes back one step; saved answers stay.',
  avalanche: 'Tap circles to add chips. The first chip that lets a circle fire is the extra chip; then tap glowing circles to fire until none can. Again clears the board.',
  loop: 'Tap circles to place the 3 chips, then tap glowing circles to fire. A board that comes back to an earlier position will repeat forever. Again clears the board.'
};
const ORDERS_RULE = 'A run ends when no circle can fire. Each different order of firing counts once.';

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Two first moves',
    parameters: {mode: 'orders', board: 'triangle', start: [2, 2]},
    objective: 'Find every order of firing until no circle can fire.',
    idea: 'Two different legal orders end with the same piles.',
    prerequisites: 'Count to four and match one chip to each line. A grown-up can read the letters.',
    hints: ['Tap A. Keep firing until nothing glows.', 'Next time, fire the other circle first.', 'The two orders are AB and BA.'],
    parent: {
      notice: 'Both orders end with one chip on A, one on B and two in the sink.',
      prompt: 'Before you fire B first, what do you think the piles will be at the end?',
      explanation: 'From A 2, B 2, firing A gives A 0, B 3; then B gives A 1, B 1. Firing B first gives A 3, B 0, then A 1, B 1. This is the smallest case of the main theorem: on a board with a sink, every complete legal run from a start has the same finish and fires each circle the same number of times.',
      extension: 'Does the sink always collect the same number of chips? Why must it, once the finish is the same?',
      connection: 'Order independence (the abelian property) is the basic theorem of chip firing: Holroyd et al., Lemmas 2.2–2.4.'
    },
    provenance: 'Week 11 whole-group launch: the start A 2, B 2 on the triangle.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Four chips, few finishes',
    parameters: {mode: 'finishes', board: 'triangle', chips: 4},
    objective: 'Find every finish you can reach with 4 chips.',
    idea: 'Many starts lead to only three finishes, and never to an empty board.',
    prerequisites: 'Count to four. Compare two small piles. No reading needed once a grown-up has read the goal.',
    hints: ['Put all 4 chips on A, then fire until nothing glows.', 'Try splitting the chips between A and B in different ways.', 'The finishes are A 1 B 0, A 0 B 1, and A 1 B 1.'],
    parent: {
      notice: 'Five different starts give only three finishes, and none of them is empty.',
      prompt: 'Why can’t the board ever finish empty?',
      explanation: 'Each firing on the triangle leaves a chip on the other circle, so a board with chips never finishes empty. The finishes are the stable boards other than the empty one: A 1 B 0, A 0 B 1, A 1 B 1. Which one appears depends only on A − B modulo 3, because firing A changes A − B by −3 and firing B changes it by +3.',
      extension: 'Try 5 chips. Can you predict a start’s finish before firing?',
      connection: 'The three finishes are the recurrent configurations of this board; their number equals the number of spanning trees of a triangle, and they form the sandpile group, here cyclic of order 3 (Levine and Propp).'
    },
    provenance: 'Week 11 K–1 Problem 2 (four chips on A and B; find every finish).'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Three and three',
    parameters: {mode: 'orders', board: 'triangle', start: [3, 3]},
    objective: 'Find every order of firing until no circle can fire.',
    idea: 'Every complete order fires A twice and B twice, though not every arrangement of those letters is legal.',
    prerequisites: 'Count to six. Keep track of a short letter word with help.',
    hints: ['Fire A, then see what can fire next.', 'Every order here has four letters. Try starting with B.', 'The orders are ABAB, ABBA, BAAB and BABA.'],
    parent: {
      notice: 'All four orders have two A’s and two B’s, and the same finish.',
      prompt: 'AABB also has two of each letter. Why can’t it happen?',
      explanation: 'After A fires from A 3, B 3, A holds one chip and cannot fire again until B sends it another. So AABB and BBAA are illegal, and the other four arrangements are the legal orders. The number of firings at each circle is the same in every complete run, even though the order is free.',
      extension: 'Start from A 4, B 4. How many orders are there now, and how many letters does each have?',
      connection: 'The firing counts form the odometer, which the least-action principle pins down (Holroyd et al., Lemma 2.4).'
    },
    provenance: 'Week 11 grades 2–3 and 4–5 Problem 1 (start 3, 3; compare final piles and letter counts).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Around the square',
    parameters: {mode: 'orders', board: 'square', start: [2, 1, 2]},
    objective: 'Find every order of firing until no circle can fire.',
    idea: 'A circle that is not ready yet can become ready when a neighbor fires.',
    prerequisites: 'Count to three per circle. Read or point to three letters.',
    hints: ['Only A and C can fire at the start.', 'B is never first. Which circles can follow A?', 'The orders are ABC, ACB, CAB and CBA.'],
    parent: {
      notice: 'B never goes first: it starts with one chip and has two lines.',
      prompt: 'After A fires, which circles can fire? Why?',
      explanation: 'A and C each start at their threshold of 2. B starts with 1 and needs a chip from A or C before it can fire. Every complete run fires each circle exactly once and ends with one chip on each circle; two chips reach the sink.',
      extension: 'Start from A 0, B 4, C 0. How many times does B fire?',
      connection: 'Which orders are legal is a question about the run, not the finish; the finish and the firing counts never change (Holroyd et al., §2).'
    },
    provenance: 'Week 11 grades 2–3 Problem 2 (start 2, 1, 2 on the four-cycle).'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Six chips to one and one',
    parameters: {mode: 'starts', board: 'triangle', chips: 6, finish: [1, 1]},
    objective: 'Find every start with 6 chips that finishes like the card.',
    idea: 'Working backwards: several starts reach the same finish.',
    prerequisites: 'Split six into two parts and compare a finish with a card. Explaining completeness is a stretch.',
    hints: ['Try putting 3 chips on each circle.', 'There are seven ways to split 6 chips between A and B. Try the extremes.', 'The starts are A 0 B 6, A 3 B 3 and A 6 B 0.'],
    parent: {
      notice: 'The three starts that work are three chips apart.',
      prompt: 'How do you know you have found every start?',
      explanation: 'Each firing on the triangle sends exactly one chip to the sink, so every start here fires four times. The finish depends only on A − B modulo 3: one and one needs A − B to be a multiple of 3, and with A + B = 6 that gives 0 and 6, 3 and 3, 6 and 0. The seven splits can also simply be checked one by one.',
      extension: 'With 7 chips, which starts finish with A 0, B 1?',
      connection: 'Starts with the same finish differ by whole firings; the sandpile group measures these classes (Levine and Propp).'
    },
    provenance: 'Week 11 grades 2–3 Problem 3 (exactly 6 chips on A and B; every start that finishes one and one).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'The hub fires twice',
    parameters: {mode: 'orders', board: 'star', start: [3, 1, 1, 1]},
    objective: 'Find every order of firing until no circle can fire.',
    idea: 'One circle must wait for all of its neighbors before firing again.',
    prerequisites: 'Count to three per circle and keep a five-letter word, with help.',
    hints: ['Only H can fire first.', 'H fires again only after A, B and C have each sent it a chip.', 'Every order is H, then A, B, C in some order, then H.'],
    parent: {
      notice: 'H fires first and last; A, B and C fire in between in any order: 3 × 2 × 1 = 6 orders.',
      prompt: 'Why can’t H fire a second time sooner?',
      explanation: 'H has three lines, so it needs three chips. After its first firing it is empty and gets one chip from each of A, B and C. The finish is H 0, A 1, B 1, C 1 in every order, with three chips in the sink.',
      extension: 'Start with H 3 and nothing else. What changes?',
      connection: 'A circle with more lines needs more of its neighbors to fire before it can go again; the finish and the counts stay fixed (Holroyd et al., §2).'
    },
    provenance: 'New instance for the app on a star board; same theme as Week 11 Problems 1–2.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'One chip, four firings',
    parameters: {mode: 'avalanche', board: 'square', firings: 4},
    objective: 'Build a board where no circle can fire, then add one chip that sets off 4 firings.',
    idea: 'A full, still board turns one extra chip into a long avalanche.',
    prerequisites: 'Know that a circle with two lines holds at most one chip without firing. Count firings to four.',
    hints: ['Put one chip on every circle first.', 'Where should the extra chip land so that it can travel both ways?', 'Start with one chip on each circle and add the extra chip to B.'],
    parent: {
      notice: 'Only one board and one landing spot give four firings: one chip on each circle, then a chip on B.',
      prompt: 'Why does B fire twice?',
      explanation: 'Still boards here have 0 or 1 chip on each circle. Adding at B to the all-ones board gives B, then A and C (in either order), then B again: BACB or BCAB, finishing A 1, B 0, C 1. Adding at A or C gives three firings, and every other still board gives at most two. Checked over all 8 still boards and 3 landing spots.',
      extension: 'On a longer ring with four circles, what is the biggest avalanche from one chip?',
      connection: 'Avalanches from adding a single chip to a stable board are the dynamics of the abelian sandpile model (Dhar; Levine and Propp).'
    },
    provenance: 'Week 11 return visit Problem 2 (the biggest one-chip avalanche on the four-cycle).'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Four chips around the square',
    parameters: {mode: 'finishes', board: 'square', chips: 4},
    objective: 'Find every finish you can reach with 4 chips.',
    idea: 'Of the eight still boards, only four ever appear as finishes here.',
    prerequisites: 'Split four chips three ways and compare small piles.',
    hints: ['Put all 4 chips on B and fire until nothing glows.', 'Try putting chips on A and C only.', 'The finishes are A 1 B 0 C 1, A 1 B 1 C 0, A 0 B 1 C 1 and A 1 B 1 C 1.'],
    parent: {
      notice: 'Every finish has at most one empty circle.',
      prompt: 'Could a finish ever have just one chip in total?',
      explanation: 'At most three chips can sit still on this board, so four chips always fire. Fifteen starts lead to only four finishes: the four boards with at most one empty circle. Boards like A 1 B 0 C 0 are still, but they are never the finish of four chips.',
      extension: 'Do 3 chips give the same four finishes? What about 10?',
      connection: 'These are the recurrent configurations; a four-cycle has four spanning trees, and its sandpile group is cyclic of order 4 (Levine and Propp).'
    },
    provenance: 'Week 11 K–1 Problems 2 and 4 combined on the four-cycle (every finish; still boards hold at most 3 chips).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Ten chips to one and none',
    parameters: {mode: 'starts', board: 'triangle', chips: 10, finish: [1, 0]},
    objective: 'Find every start with 10 chips that finishes like the card.',
    idea: 'Moving three chips from one circle to the other never changes the finish.',
    prerequisites: 'Split ten into two parts and look for a pattern in the answers. Subtraction helps.',
    hints: ['Try A 1, B 9.', 'Once one start works, move three chips from B to A and try again.', 'The starts are A 1 B 9, A 4 B 6, A 7 B 3 and A 10 B 0.'],
    parent: {
      notice: 'The four starts are three chips apart.',
      prompt: 'If A 1, B 9 works, why does A 4, B 6 work too?',
      explanation: 'Firing A lowers A − B by 3 and firing B raises it by 3, so A − B modulo 3 never changes. Every nonempty start finishes at A 1 B 1, A 1 B 0 or A 0 B 1 according to whether A − B is 0, 1 or 2 modulo 3. With A + B = 10 the starts with A − B ≡ 1 are 1 and 9, 4 and 6, 7 and 3, 10 and 0.',
      extension: 'Without firing, which finish does A 37, B 12 reach?',
      connection: 'The invariant is the sandpile group of the triangle, the integers modulo 3 (Levine and Propp).'
    },
    provenance: 'New instance extending Week 11 grades 2–3 Problem 3 and the facilitator guide’s modulo-3 formula for the triangle.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Nine firings from six chips',
    parameters: {mode: 'firings', board: 'square', chips: 6, firings: 9},
    objective: 'Place 6 chips so that 9 firings happen.',
    idea: 'Chips far from the sink cause more firings.',
    prerequisites: 'Count firings to nine. Compare starts by how far chips are from the sink.',
    hints: ['Which circle is farthest from the sink?', 'Chips on A or C can reach the sink in one step. Chips on B cannot.', 'Put all six chips on B.'],
    parent: {
      notice: 'Only one start works: all six chips on B.',
      prompt: 'Why do chips on B cause more firings than chips on A?',
      explanation: 'Give A, B and C the weights 3, 4 and 3. Every firing lowers the total weight by exactly 2: firing B removes 8 and adds 3 + 3; firing A removes 6 and adds 4, since the chip in the sink counts zero. So the number of firings is (start weight − finish weight) ÷ 2. Six chips on B weigh 24 and finish at A 1, B 0, C 1, weight 6: (24 − 6) ÷ 2 = 9. Checked over all 28 starts; no other start reaches 9.',
      extension: 'With 8 chips, what is the most firings you can make?',
      connection: 'The weight is a termination certificate: it proves every run on this board stops. Weights like this come from the inverse of the reduced Laplacian (Holroyd et al., §2).'
    },
    provenance: 'Week 11 grades 4–5 Problem 5 (why sharing must stop on the four-cycle) and its facilitator score W = 3A + 4B + 3C, turned into an optimization.'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Ring of four',
    parameters: {mode: 'orders', board: 'path', start: [2, 1, 1, 2]},
    objective: 'Find every order of firing until no circle can fire.',
    idea: 'Each circle fires once; the only rule is that B and C each wait for a neighbor.',
    prerequisites: 'Keep track of four-letter words and organize a search by first letter.',
    hints: ['Only A and D can fire at the start.', 'Sort your orders by their first two letters.', 'There are four orders starting with A and four starting with D.'],
    parent: {
      notice: 'Every order fires each circle once. B comes after A or C; C comes after B or D.',
      prompt: 'How can you be sure you have all of them?',
      explanation: 'B and C each start one chip short. B gets a chip when A or C fires; C gets one when B or D fires. Of the 24 arrangements of ABCD, exactly 8 satisfy both conditions: ABCD, ABDC, ADBC, ADCB, DABC, DACB, DCAB, DCBA. Every one ends with one chip on each circle.',
      extension: 'Start from A 1, B 2, C 2, D 1. How many orders now?',
      connection: 'The number of legal orders grows quickly with the board, but the finish never depends on the order (Holroyd et al., §2).'
    },
    provenance: 'New instance on the four-circle ring; same theme as Week 11 Problems 1, 2 and 4.'
  },
  {
    number: 12, difficulty_level: 'hard', title: 'No way out',
    parameters: {mode: 'loop', board: 'ring', chips: 3},
    objective: 'Place 3 chips so the firing never stops.',
    idea: 'Without a sink, firing can go on forever.',
    prerequisites: 'Recognize a repeated position. Optional: explain why four chips can never stop here.',
    hints: ['Try 2 chips on one circle and 1 on another.', 'Three chips on one circle stop after one firing.', 'A 2, B 1, C 0 fires A, B, C and comes back to the start.'],
    parent: {
      notice: 'A board that returns to an earlier position must repeat forever.',
      prompt: 'Why does a repeated position prove the firing never stops?',
      explanation: 'With no sink, chips never leave. A 3 fires once and stops at one chip each. A 2, B 1 fires A, B, C and returns to where it began, so it repeats forever; one chip each cannot fire at all. With 4 chips no position is still, because each circle can hold at most one chip, so the firing never stops at all.',
      extension: 'With 3 chips, which starts stop and which repeat? Does the order of firing ever decide it?',
      connection: 'The sink is what makes every run stop; on a graph without one, whether a game stops depends only on the start (Björner, Lovász and Shor, 1991).'
    },
    provenance: 'Week 11 return visit Problem 1 (the closed triangle: which starts stop, which repeat).'
  }
];

const playground = {
  id: 'chips-playground', number: 0, title: 'Chip firing playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Add chips and fire them on any board.',
  controls: 'Choose a board. With Add, tap a circle to put a chip on it. With Fire, tap a glowing circle to fire it. Fire all keeps firing until no circle can; on the board with no sink it stops when a position repeats. On the big grid, tap a square to drop chips there: squares with four or more fire on their own, and chips that cross the edge fall into the sink.',
  rules: [...RULES, 'On the big grid every square has four lines, and the edge leads to the sink.'],
  idea: 'Free play on seven small boards and a 25 × 25 grid.',
  prerequisites: 'None. Grown-ups can suggest a question from the puzzles.',
  hints: ['Pick a board and add a few chips.', 'On the grid, choose +1000 and tap the middle.', 'Try the same start twice with different orders.'],
  parent: {
    notice: 'On the grid, a big pile dropped in the middle settles into the same intricate pattern every time, whatever order the squares fire in.',
    prompt: 'If we drop 100 chips one at a time instead of all at once, will the picture be the same?',
    explanation: 'Every board here except the no-sink triangle has a sink, so every run stops and the finish does not depend on the order. Adding chips in batches and settling in between also gives the same finish as adding them all at once. The grid is the abelian sandpile model: a large pile at the center settles into a fractal-like pattern.',
    extension: 'Fill every square of the grid with 3 chips, then drop one more in the middle. How far does the avalanche spread?',
    connection: 'The abelian sandpile model (Dhar) and its group of recurrent configurations (Levine and Propp).',
    sourceIds: ['chips-dhar', 'chips-sandpile', 'chips-hlmppw']
  },
  provenance: 'Week 11 materials: free exploration of the boards, staged additions and the no-sink triangle.'
};

const puzzles = authored.map(a => {
  const mode = a.parameters.mode;
  const p = {
    id: `chips-${String(a.number).padStart(2, '0')}`, number: a.number, title: a.title, band: 'all', difficulty_level: a.difficulty_level,
    mechanic: 'chips', familyTitle: family.title, revision: 1,
    parameters: {...a.parameters},
    objective: a.objective, instruction: a.objective,
    controls: mode === 'orders' ? CONTROLS.orders : mode === 'avalanche' ? CONTROLS.avalanche : mode === 'loop' ? CONTROLS.loop : CONTROLS.place,
    rules: mode === 'loop' ? [...NO_SINK, 'Place all 3 chips before firing. If the board repeats a position, it will repeat forever.'] : mode === 'orders' ? [...RULES, ORDERS_RULE] : mode === 'avalanche' ? [...RULES, 'Add chips one at a time. The first chip that lets a circle fire is the extra one; after it, only firing is allowed.'] : [...RULES, `Place all ${a.parameters.chips} chips before firing. A run ends when no circle can fire.`],
    idea: a.idea, prerequisites: a.prerequisites, hints: a.hints,
    parent: {...a.parent, sourceIds: ['chips-week11', 'chips-hlmppw', ...(a.parent.connection.includes('Levine and Propp') ? ['chips-sandpile'] : []), ...(a.parent.connection.includes('Dhar') ? ['chips-dhar'] : [])]},
    provenance: a.provenance, sourceDocument: 'docs/chips/README.md'
  };
  const found = answers(p);
  // Collections ask for every answer; a single target asks for one.
  p.parameters.answers = ['orders', 'finishes', 'starts'].includes(mode) ? found.size : 1;
  if (!found.size) throw new Error(`${p.id}: no answer`);
  return p;
});
const pg = {...playground, mechanic: 'chips', familyTitle: family.title, revision: 1, instruction: playground.objective, sourceDocument: 'docs/chips/README.md'};

const pack = {title: 'Chip firing', version: 1, families: [family], sources, puzzles: [pg, ...puzzles]};
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/chips/chips.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) {
    const q = p.parameters, g = boardInfo(q.board), list = [...answers(p).keys()];
    const finish = q.start ? stabilize(g, q.start).piles.join(',') : '';
    console.log(`${p.id} ${q.mode} ${q.board} answers=${q.answers}/${list.length}${finish ? ` finish=${finish}` : ''}: ${list.join(' ')}`);
  }
}
