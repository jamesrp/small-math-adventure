// Builds dist/families/seeds/seeds.json, the Seed plots pack, from the
// authoring list below. Every fact a puzzle relies on (the fewest seeds that
// fill a plot, how many starts fill it, whether a seed budget can, the starts
// that need every seed, the numbers of squares a few seeds can finish with)
// is computed here by listing every start with the mechanic's own growth and
// checked against the authored claims; scripts/validate-seeds.mjs checks them
// again with a separate simulator. Design notes and worksheet sources:
// docs/seeds/README.md.
import {writeFile} from 'node:fs/promises';
import {gridOf, freeKey} from '../dist/sq-grid.js';
import {fills, closureOf, plotFence, minimalStarts, apart, gridSpec, canGrow} from '../dist/families/seeds/seeds.js';

const WEEK98 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-98';
export const sources = [
  {id: 'seeds-week98', title: 'Bellingham Math Circle — Week 98: Growing from a few seeds (packets for grades 2–3 and 4–5, and the adult guide)', url: WEEK98, kind: 'local curriculum'},
  {id: 'seeds-review', title: 'Bellingham Math Circle — Week 98 review card, with its app-fit counts', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-98.md', kind: 'local curriculum'},
  {id: 'seeds-morris', title: 'Robert Morris — Minimal percolating sets in bootstrap percolation, Electronic Journal of Combinatorics 16 (2009), introduction pp. 1–2', url: 'https://arxiv.org/abs/math/0702370', kind: 'research'}
];
export const family = {
  id: 'seeds',
  title: 'Seed plots',
  mathematics: 'Seeds fill some squares of a plot, and an empty square grows when at least two filled squares share its sides (two-neighbour bootstrap percolation). A square that can grow stays able to grow while others fill, so every complete run from the same seeds stops at the same finish, whatever the order. The fence, every side of a filled square with no filled square beside it, never gets longer: a square growing beside k filled squares changes it by 4 − 2k. So s seeds, with a fence of at most 4s, can fill a plot only if 4s is at least the plot’s own fence; an n-by-n plot needs n seeds, and the diagonal does it. A square with one neighbour on the plot can never grow, so it must be a seed. A start can need every one of its seeds without using the fewest: four on 3 by 3 and five on 4 by 4, where the diagonals need three and four.',
  rules: [
    'An empty square grows when at least two filled squares share its sides. Corners don’t count, and nothing outside the plot helps.',
    'The fence runs along every side of a filled square with no filled square beside it. The number after it is the fence of the full plot.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const ROCK = 'Rocks are not part of the plot: nothing grows on them, and their sides are fence.';
const TAP = 'Tap an empty square to plant a seed, or to grow it when two filled squares are beside it. Tap a seed to lift it. Drag a seed to move it, or drag across squares to grow them one after another.';
const CONTROLS = {
  fill: `${TAP} Press Can’t if the seeds can never fill the plot.`,
  fewest: `${TAP} Press Fewest when the plot is full and you think fewer seeds can’t fill it.`,
  needed: TAP,
  finishes: `${TAP} Clear lifts every seed. Press That’s all when you have every number.`
};
const MODE_RULES = {
  fill: ['Solved when every square is filled.', 'Can’t is checked with every seed planted and no two touching. If the plot can be filled, you’re told.'],
  fewest: ['Solved when you press Fewest on a full plot grown from as few seeds as can fill it. If fewer can, you’re told.'],
  needed: ['Solved when all the seeds fill the plot and each one is needed: without it, the others can’t. The small plots below show each seed left out.'],
  finishes: ['Plant every seed and grow until nothing more can grow. The number of filled squares joins the list.', 'Solved when you press That’s all with every number found.']
};
const OBJECTIVE = {
  fill: 'Fill the plot.',
  fewest: 'Fill the plot with the fewest seeds.',
  needed: 'Fill the plot with every seed needed.',
  finishes: 'Find every number of squares the seeds can end with.'
};

// A plot drawn as rows of '#' (a square of the plot), 'o' (a rock) and '.'
// (nothing), top row first.
function plot(rows) {
  const lines = rows.split('/'), cells = [], rocks = [];
  lines.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') cells.push([x, y]); if (ch === 'o') rocks.push([x, y]); }));
  const cols = Math.max(...lines.map(r => r.length)), whole = cells.length === cols * lines.length;
  return {cols, rows: lines.length, ...(whole ? {} : {cells}), ...(rocks.length ? {rocks} : {})};
}

/* ---------------- The puzzles ---------------- */
const playground = {
  id: 'seeds-playground', number: 0, title: 'Seed plots playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground', size: 6},
  objective: 'Plant seeds and grow any plot.',
  controls: `${TAP} The squares above the plot change its size. Regrow keeps the seeds and takes back the growth; Clear lifts every seed.`,
  rules: RULES,
  idea: 'Free planting on plots of 4, 6 or 8 squares a side, with the fence counted. The same seeds can be grown again in another order.',
  prerequisites: 'None. A grown-up can suggest a question from the puzzles.',
  hints: ['Plant three seeds and grow all you can. Press Regrow and grow them in a different order.', 'Watch the fence while a square grows. Can it ever get longer?', 'How few seeds fill the 8-by-8 plot?'],
  parent: {
    notice: 'However the squares are grown, the same seeds stop at the same finish, and the fence never gets longer.',
    prompt: 'Did growing in a different order ever end differently?',
    explanation: 'Filling a square only gives other squares more filled neighbours, so a square that can grow stays able to grow. Any square one order fills, another order can fill too, and both stop only when nothing more can grow: at the same set. A square growing beside k filled squares adds four sides to the fence and hides 2k, a change of 4 − 2k, which is never more than 0 when k is at least 2.',
    extension: 'Seeds on a diagonal fill any square plot. Find four seeds that fill the 4-by-4 plot with none on either diagonal. (Fourteen such starts exist.)',
    connection: 'Two-neighbour bootstrap percolation, a model of how a rumour or an infection spreads.'
  },
  provenance: 'Week 98 grades 2–3 Problem 4 (grow the same seeds in different orders; can the finishes differ?).',
  sourceIds: ['seeds-week98', 'seeds-morris'],
  expect: {offDiagonal: 14}
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Three seeds',
    plot: '###/###/###', parameters: {mode: 'fill', seeds: 3},
    idea: 'Seeds on the diagonal grow into the whole square; most other starts get stuck.',
    prerequisites: 'None beyond counting to 12.',
    hints: ['A square needs two filled squares beside it to grow. Seeds that touch at a corner help each other.', 'Plant two seeds touching at a corner and grow the two squares between them.', 'Plant all three seeds on a diagonal.'],
    parent: {
      notice: '14 of the 84 starts of three seeds fill the plot; the diagonal is only one of them.',
      prompt: 'What do the starts that get stuck have in common?',
      explanation: 'Fourteen starts fill, in four shapes up to turning and flipping: the diagonal, three corners, two corners of a side with the middle of the opposite side, and a corner with the middles of the two far sides. Growth stops when no empty square touches two filled ones. Seeds side by side waste fence: two touching along a side have a fence of 6 instead of 8.',
      extension: 'Can two seeds fill it? (No: two seeds have a fence of at most 8, and the full plot’s is 12.)',
      connection: 'The fewest seeds that fill an n-by-n board is n (Morris, introduction).'
    },
    provenance: 'Week 98 grades 2–3 Problem 1 (three seeds on a 3-by-3 board: one start that fills the board, one that gets stuck).',
    sourceIds: ['seeds-week98', 'seeds-review'],
    expect: {least: 3, starts: 14, of: 84, shapes: 4}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Four ends',
    plot: '.#./###/.#.', parameters: {mode: 'fill', seeds: 4},
    idea: 'An end square touches only one square, so it can never grow: it has to be a seed.',
    prerequisites: 'None beyond counting to 12.',
    hints: ['Which squares could ever have two filled squares beside them?', 'An end of the cross touches only the middle.', 'Plant a seed on every end.'],
    parent: {
      notice: 'Only one start works: a seed on each end. The middle then grows.',
      prompt: 'Why can’t the middle be a seed?',
      explanation: 'Each end touches only the middle square, so it can never have two filled squares beside it: every end must be a seed, and that uses all four. The fence alone would allow three seeds (the cross’s fence is 12), so the ends give a second reason that needs the fourth.',
      extension: 'Make each arm two squares long. How many seeds now? (Five: the four ends and the middle, the only start that works.)',
      connection: 'A lower bound from a local reason, different from the fence count.'
    },
    provenance: 'New for the app, on the Week 98 growth rule.',
    sourceIds: ['seeds-week98'],
    expect: {least: 4, starts: 1, of: 5}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'How many squares?',
    plot: '###/###/###', parameters: {mode: 'finishes', seeds: 3},
    idea: 'Three seeds finish with 3, 4, 6 or 9 squares, never 5, 7 or 8.',
    prerequisites: 'Count to 9.',
    hints: ['Plant all three seeds and grow until nothing more can grow. The number of filled squares joins the list.', 'Put the seeds where none can help another. Then let two of them help each other.', 'Seeds on both ends of a row and one below its middle make 6.'],
    parent: {
      notice: 'Four numbers: 3, 4, 6 and 9.',
      prompt: 'Why can’t three seeds end with 5 squares?',
      explanation: 'When growth stops, no empty square touches two filled squares, so the finish is filled rectangles kept apart. Three seeds alone give 3; seeds helping each other give a 2-by-2 (4), a 2-by-3 (6) or the whole plot (9). Five would be a 2-by-2 and a lone seed, but every square outside a 2-by-2 on this plot is close enough to set off more growth, and no other shape fits.',
      extension: 'Which numbers can three seeds make on a 4-by-4 plot? (Puzzle 11.)',
      connection: 'A finish is the same whatever the order, so each start has one number.'
    },
    provenance: 'Week 98 grades 4–5 Problem 1 (how many final numbers three seeds can make on 3 by 3) and grades 2–3 Problem 3 (finishes of 3, 4, 6 and 9; any other?).',
    sourceIds: ['seeds-week98', 'seeds-review'],
    expect: {answers: [3, 4, 6, 9], hint: {start: '#.#/.#./...', finish: 6}}
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Four by four',
    plot: '####/####/####/####', parameters: {mode: 'fill', seeds: 4},
    idea: 'Four seeds are enough, and many starts work besides the diagonal.',
    prerequisites: 'Puzzle 1 first.',
    hints: ['Seeds touching at a corner grow a 2-by-2 square.', 'Grow a 3-by-3 square, then plant a seed touching its corner.', 'Plant the four seeds on a diagonal.'],
    parent: {
      notice: '130 of the 1,820 starts of four seeds fill the plot.',
      prompt: 'Can you fill it with no seed on either diagonal?',
      explanation: 'A filled square block grows by a row and a column when a seed touches its corner from outside: 1 by 1, 2 by 2, 3 by 3, 4 by 4. Other starts grow two rectangles that meet and merge. Fourteen starts avoid both diagonals.',
      extension: 'Can three seeds do it? (Puzzle 5.)',
      connection: 'The fewest seeds for 4 by 4 is 4: the worksheet’s Problem 2.'
    },
    provenance: 'Week 98 grades 2–3 and 4–5 Problem 2 (the fewest seeds that fill a 4-by-4 board; three different starts).',
    sourceIds: ['seeds-week98'],
    expect: {least: 4, starts: 130, of: 1820, offDiagonal: 14}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Three for sixteen',
    plot: '####/####/####/####', parameters: {mode: 'fill', seeds: 3},
    idea: 'Three seeds have a fence of at most 12, the full plot’s is 16, and growing never makes the fence longer.',
    prerequisites: 'Count to 16. Puzzle 4 first.',
    hints: ['Watch the fence number while squares grow.', 'Three seeds with none touching have the longest fence three seeds can have.', 'Plant the seeds with none touching, then press Can’t.'],
    parent: {
      notice: 'The fence starts at 12 at most and never grows, but a full plot has a fence of 16.',
      prompt: 'Why can’t the fence ever get longer?',
      explanation: 'A square grows only beside at least two filled squares. Its four sides join the fence, but each side it shares with a filled square leaves the fence, together with that square’s side: two neighbours add 4 and take away 4, three take away 2 more. Three seeds start with a fence of at most 3 × 4 = 12, so they can never reach a full plot’s 16, whatever the start.',
      extension: 'Can four seeds fill a 5-by-5 plot? (No: 16 is less than 20.)',
      connection: 'A monovariant: a number that only goes one way shows some positions are out of reach.'
    },
    provenance: 'Week 98 grades 4–5 Problem 5 (can three seeds fill a 4-by-4 board? explain for every start) with Problem 4 (exposed sides never increase).',
    sourceIds: ['seeds-week98', 'seeds-review'],
    expect: {possible: false, least: 4}
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Every seed needed',
    plot: '###/###/###', parameters: {mode: 'needed', seeds: 4},
    idea: 'A start can need every one of its seeds without using the fewest.',
    prerequisites: 'Puzzle 1 first.',
    hints: ['When the plot is full, the small plots below show what happens without each seed.', 'If any three of the seeds could fill the plot, the fourth isn’t needed.', 'Plant a seed in the middle of each side.'],
    parent: {
      notice: 'Nine starts work, in three shapes up to turning and flipping, and none holds a diagonal.',
      prompt: 'Four seeds are all needed, yet three can fill the plot. How can both be true?',
      explanation: '“Needed” is about this start: no one of its seeds can be left out. The diagonal is a different start, so it says nothing about this one. A start that can’t lose a seed (minimal) need not be a start with the fewest seeds (minimum).',
      extension: 'What is the most seeds that can all be needed on a 4-by-4 plot? (Five: Puzzle 12.)',
      connection: 'Inclusion-minimal versus minimum percolating sets (Morris, introduction).'
    },
    provenance: 'Week 98 grades 2–3 Problem 5 and grades 4–5 Problem 6 (grow a four-seed start, test the four ways to leave out one seed, and find a different four-seed start that still needs every seed).',
    sourceIds: ['seeds-week98', 'seeds-review', 'seeds-morris'],
    expect: {starts: 9, shapes: 3, larger: 0, hintStart: '.#./#.#/.#.'}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'A long bed',
    plot: '#######/#######', parameters: {mode: 'fewest'},
    idea: 'The full plot’s fence is 18, so four seeds (fence 16 at most) are too few, and five can do it.',
    prerequisites: 'Count to 20. Puzzle 5 helps.',
    hints: ['Watch the fence: a full plot has a fence of 18.', 'Four seeds have a fence of at most 16.', 'Grow a 2-by-2 square at one end. A seed two columns along lets it grow two more columns.'],
    parent: {
      notice: 'Five seeds are the fewest; 176 starts of five work.',
      prompt: 'How do you know four can’t?',
      explanation: 'Four seeds have a fence of at most 16, growing never lengthens it, and the full 2-by-7 plot has a fence of 18. Five seeds can: two touching at a corner grow a 2-by-2, and a seed two columns along grows two more columns at a time.',
      extension: 'How many seeds fill a 2-by-10 bed? (Six: 4 × 6 = 24 reaches the fence of 24.)',
      connection: 'For a rectangle a by b the fence bound gives ⌈(a + b)/2⌉ seeds.'
    },
    provenance: 'New for the app, on the Week 98 fence argument (grades 4–5 Problems 4 and 5) for a plot that is not square.',
    sourceIds: ['seeds-week98', 'seeds-review'],
    expect: {least: 5, starts: 176, of: 2002, longer: {cols: 10, rows: 2, least: 6}}
  },
  {
    number: 8, difficulty_level: 'medium', title: 'A rock',
    plot: '####/#o##/####/####', parameters: {mode: 'fill', seeds: 4},
    idea: 'The rock’s sides are fence too, so the plot needs a fence of 20: more than four seeds can have.',
    prerequisites: 'Count to 20. Puzzle 5 first.',
    hints: ['Count the fence of the full plot, round the rock too.', 'Four seeds have a fence of at most 16.', 'Plant the four seeds with none touching, then press Can’t.'],
    parent: {
      notice: 'Without the rock four seeds fill the plot (Puzzle 4). The rock takes a square away but adds four sides to the fence.',
      prompt: 'How can a smaller plot need more seeds?',
      explanation: 'The full plot has a fence of 16 round the outside and 4 round the rock: 20. Four seeds have a fence of at most 16 and growing never lengthens it, so no start of four fills the plot. Five seeds can.',
      extension: 'Where else could the rock go? In a corner four seeds fill again (fence 16); in the middle of an edge it takes five (fence 18).',
      connection: 'The bound counts every edge of the plot, holes included.'
    },
    provenance: 'New for the app, on Week 98 grades 4–5 Problems 4 and 5 (exposed sides; the fence argument for every start).',
    sourceIds: ['seeds-week98'],
    expect: {possible: false, least: 5, corner: 4, edge: 5}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'An L',
    plot: '##.../##.../##.../#####/#####', parameters: {mode: 'fill', seeds: 5},
    idea: 'Five seeds have a fence of at most 20, exactly the L’s fence, so no two seeds may touch and every square must grow beside exactly two filled squares.',
    prerequisites: 'Count to 20. Puzzles 4 and 5 first.',
    hints: ['The L has a fence of 20. Five seeds can only just reach it.', 'The fence must stay at 20 all the way: no two seeds touching, and no square growing beside three filled squares.', 'Grow a 2-by-2 square at the top of the L, then grow down and along.'],
    parent: {
      notice: '64 of the 4,368 starts of five seeds work, and in every one no two seeds touch.',
      prompt: 'Why must the fence stay at 20 the whole time?',
      explanation: 'The fence starts at most at 5 × 4 = 20, never grows and must end at the L’s 20. So it can never drop: seeds touching would start it lower, and a square growing beside three filled squares would take 2 away.',
      extension: 'Make the L’s arms one square wide. How many seeds now? (Five again, and only one start: the two ends must be seeds.)',
      connection: 'When the bound is reached exactly, every step must be tight: an equality case.'
    },
    provenance: 'New for the app: the review card’s suggestion of L-shaped plots, on Week 98 grades 4–5 Problem 3 (the fewest seeds for larger boards).',
    sourceIds: ['seeds-week98', 'seeds-review'],
    expect: {least: 5, starts: 64, of: 4368, allApart: true}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'A ring',
    plot: '####/#oo#/#oo#/####', parameters: {mode: 'fewest'},
    idea: 'Each square of the ring touches just two others, so a gap of two empty squares can never fill.',
    prerequisites: 'Count to 24. Puzzle 8 first.',
    hints: ['The ring’s fence runs round the inside too.', 'Each square of the ring touches only two others. An empty square grows only when both are filled.', 'Plant a seed on every second square.'],
    parent: {
      notice: 'Six seeds, on every second square: only two starts work.',
      prompt: 'Find two different reasons five seeds are too few.',
      explanation: 'The fence: 16 outside and 8 round the rocks make 24, and five seeds have at most 20. The gaps: each square touches only its two neighbours round the ring, so an empty square grows only when both are filled, and two empty squares side by side never fill. Twelve squares with no two empty side by side need at least six seeds.',
      extension: 'A ring of 16 squares round a 3-by-3 rock garden: how many seeds? (Eight, by the same gap reason.)',
      connection: 'Two lower bounds agree here; on the cross of Puzzle 2 only the local one is sharp.'
    },
    provenance: 'New for the app, on the Week 98 growth rule and fence argument.',
    sourceIds: ['seeds-week98'],
    expect: {least: 6, starts: 2, of: 924}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Room to spread',
    plot: '####/####/####/####', parameters: {mode: 'finishes', seeds: 3},
    idea: 'On a bigger plot a lone seed can stay apart and a 2-by-4 fits, so 5 and 8 appear; 7 never does.',
    prerequisites: 'Count to 9. Puzzle 3 first.',
    hints: ['Plant all three seeds and grow until nothing more can grow. Each number joins the list.', 'This plot has room for a seed to stay away from the others.', 'Grow a 2-by-2 in a corner, then plant the last seed on the edge with one empty square between it and the 2-by-2.'],
    parent: {
      notice: 'Six numbers: 3, 4, 5, 6, 8 and 9. Seven is missing.',
      prompt: 'Why can’t three seeds end with 7 squares?',
      explanation: 'A finish is filled rectangles kept apart, and a rectangle needs at least a quarter of its fence in seeds. Seven squares would be a 2-by-3 with a lone seed, or a 2-by-2 with a row of three; a 2-by-3 (fence 10) needs three seeds, a 2-by-2 and a row of three need two each, so both need four.',
      extension: 'Which numbers can four seeds make on this plot?',
      connection: 'The fence bound applied to each piece of a finish.'
    },
    provenance: 'New for the app, extending Week 98 grades 4–5 Problem 1 (final numbers of three seeds) to a 4-by-4 board.',
    sourceIds: ['seeds-week98'],
    expect: {answers: [3, 4, 5, 6, 8, 9], hint: {start: '#..#/.#../..../....', finish: 8}}
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Five needed',
    plot: '####/####/####/####', parameters: {mode: 'needed', seeds: 5},
    idea: 'Five seeds can all be needed on 4 by 4, one more than the fewest; six never can.',
    prerequisites: 'Puzzle 6 first.',
    hints: ['When the plot is full, the small plots below show what happens without each seed.', 'If any four of the seeds could fill the plot, the fifth isn’t needed.', 'Try a corner seed with a seed beside it, in each of two corners, and one more seed.'],
    parent: {
      notice: '360 starts of five seeds need every seed; no start of six or more does.',
      prompt: 'What makes a seed unnecessary?',
      explanation: 'A seed isn’t needed when the others fill the plot without it, which happens exactly when the other seeds would grow its square anyway. Five seeds can all avoid that; with six or more that fill the plot, some seed always sits where the others would grow it. Any start that fills with a corner seed and a seed beside it in each of two corners, and one more seed, needs every seed.',
      extension: 'On 5 by 5 the most is at least 7 (the review card’s search).',
      connection: 'How large an inclusion-minimal percolating set can be (Morris, Theorem 1).'
    },
    provenance: 'The review card’s Hard suggestion: the most seeds that can all be needed, 5 on 4 by 4 with none larger, on Week 98 grades 4–5 Problem 6.',
    sourceIds: ['seeds-week98', 'seeds-review', 'seeds-morris'],
    expect: {starts: 360, larger: 0, hintStart: '##.#/...#/..../#...'}
  }
];

/* ---------------- Answers, computed and checked ---------------- */
function* choose(n, k, from = 0, acc = []) {
  if (acc.length === k) { yield acc; return; }
  for (let i = from; i <= n - (k - acc.length); i++) yield* choose(n, k, i + 1, [...acc, i]);
}
const fail = (p, msg) => { throw Error(`Puzzle ${p.number}: ${msg}`); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const coords = (g, s) => s.map(i => g.cells[i]);
const starts = (g, k) => [...choose(g.cells.length, k)].filter(s => fills(g, s));
export function leastOf(g) {
  for (let k = 1; k <= g.cells.length; k++) if (starts(g, k).length) return k;
  return null;
}
// Seeds drawn as '#' in rows of the plot's box.
const seedsOf = (g, rows) => rows.split('/').flatMap((row, y) => [...row].flatMap((ch, x) => ch === '#' ? [g.at(x, y)] : [])).sort((a, b) => a - b);
const onDiagonal = (g, i) => { const [x, y] = g.cells[i]; return x === y || x + y === g.cols - 1; };
const fenceOfShape = rows => plotFence(gridOf(plot(rows)));

function complete(p) {
  const q = p.parameters, e = p.expect;
  if (q.mode === 'playground') {
    const g = gridOf({cols: 4, rows: 4});
    if (starts(g, 4).filter(s => s.every(i => !onDiagonal(g, i))).length !== e.offDiagonal) fail(p, 'off-diagonal starts');
    return;
  }
  Object.assign(q, plot(p.plot), {...q});
  const g = gridOf(gridSpec(q)), P = plotFence(g), n = g.cells.length;
  q.fence = P;
  if (q.mode === 'fill' || q.mode === 'fewest') {
    const least = leastOf(g);
    if (least !== e.least) fail(p, `least ${least}`);
    if (4 * least < P) fail(p, 'the fence bound is broken');
    const best = starts(g, least);
    if (q.mode === 'fewest') {
      if (best.length !== e.starts || [...choose(n, least)].length !== e.of) fail(p, `${best.length} fewest starts`);
      q.best = least;
      q.witness = coords(g, best[0]);
    } else {
      q.least = least;
      q.possible = least <= q.seeds;
      if (q.possible !== (e.possible ?? true)) fail(p, 'possible');
      if (q.possible) {
        const ok = starts(g, q.seeds);
        if (e.shapes !== undefined && new Set(ok.map(s => freeKey(coords(g, s)))).size !== e.shapes) fail(p, 'shapes');
        if (ok.length !== e.starts || [...choose(n, q.seeds)].length !== e.of) fail(p, `${ok.length} starts`);
        if (e.allApart && !ok.every(s => apart(g, s))) fail(p, 'a start with seeds touching');
        if (e.offDiagonal !== undefined && ok.filter(s => s.every(i => !onDiagonal(g, i))).length !== e.offDiagonal) fail(p, 'off-diagonal');
        q.witness = coords(g, best[0]);
      } else {
        // Can't is right only with the fence as its proof: every start of
        // this many seeds has a fence of at most 4 per seed, less than P.
        if (4 * q.seeds >= P) fail(p, 'Can’t without a fence certificate');
        q.witness = coords(g, [...choose(n, q.seeds)].find(s => apart(g, s)));
      }
    }
  }
  if (q.mode === 'needed') {
    const found = minimalStarts(g, q.seeds);
    if (found.length !== e.starts) fail(p, `${found.length} needed starts`);
    if (e.shapes !== undefined && new Set(found.map(s => freeKey(coords(g, s)))).size !== e.shapes) fail(p, 'shapes');
    for (let k = q.seeds + 1; k <= n; k++) if (minimalStarts(g, k).length) fail(p, `a needed start of ${k}`);
    if (!found.some(s => same(s, seedsOf(g, e.hintStart)))) fail(p, 'the hinted start');
    q.witness = coords(g, seedsOf(g, e.hintStart));
  }
  if (q.mode === 'finishes') {
    const byFinish = new Map();
    // Each witness can be planted in reading order: no seed lands where the
    // seeds before it would grow a square.
    const plantable = s => s.every((x, j) => !canGrow(g, new Set(s.slice(0, j)), x));
    for (const s of choose(n, q.seeds)) { const f = closureOf(g, s).size; if (!byFinish.has(f) || (!plantable(byFinish.get(f)) && plantable(s))) byFinish.set(f, s); }
    if (![...byFinish.values()].every(plantable)) fail(p, 'a witness can’t be planted');
    const answers = [...byFinish.keys()].sort((a, b) => a - b);
    if (!same(answers, e.answers)) fail(p, `finishes ${answers}`);
    q.answers = answers;
    q.witnesses = answers.map(f => coords(g, byFinish.get(f)));
    if (closureOf(g, seedsOf(g, e.hint.start)).size !== e.hint.finish) fail(p, 'the hinted start');
  }
  // Facts quoted in the notes.
  if (p.number === 1 && fenceOfShape('##/##') !== 8) fail(p, 'fence of two seeds');
  if (p.number === 2) {
    const arms = gridOf(plot('..#../..#../#####/..#../..#..'));
    const five = starts(arms, 5);
    if (leastOf(arms) !== 5 || five.length !== 1 || !same(five[0], seedsOf(arms, '..#../...../#.#.#/...../..#..'))) fail(p, 'long arms');
  }
  if (e.longer && leastOf(gridOf({cols: e.longer.cols, rows: e.longer.rows})) !== e.longer.least) fail(p, 'longer bed');
  if (e.corner !== undefined) {
    if (leastOf(gridOf(plot('o###/####/####/####'))) !== e.corner || leastOf(gridOf(plot('#o##/####/####/####'))) !== e.edge) fail(p, 'rock places');
  }
  if (p.number === 9) {
    const thin = gridOf(plot('#..../#..../#..../#..../#####'));
    if (leastOf(thin) !== 5 || starts(thin, 5).length !== 1) fail(p, 'thin L');
  }
  if (p.number === 10) {
    const big = gridOf(plot('#####/#ooo#/#ooo#/#ooo#/#####'));
    if (big.cells.length !== 16 || plotFence(big) !== 32 || leastOf(big) !== 8) fail(p, 'bigger ring');
  }
}

const puzzles = [playground, ...authored].map(p => {
  complete(p);
  const q = p.parameters, mode = q.mode, objective = mode === 'playground' ? p.objective : OBJECTIVE[mode];
  return {
    id: mode === 'playground' ? p.id : `seeds-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'seeds', familyTitle: family.title, revision: 1, parameters: q,
    objective, visibleObjective: mode === 'playground' ? '' : objective, instruction: objective,
    controls: p.controls || CONTROLS[mode], rules: p.rules || [...RULES, ...(q.rocks ? [ROCK] : []), ...MODE_RULES[mode]],
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...p.parent, sourceIds: p.sourceIds}, provenance: p.provenance, sourceDocument: 'docs/seeds/README.md'
  };
});
export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};
if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/seeds/seeds.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
