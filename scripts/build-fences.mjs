// Builds dist/families/fences/fences.json, the Garden fences pack, from the
// authoring list below. Every fact a puzzle relies on (the gardens of a kind,
// the fence lengths a number of tiles can have, the shortest and longest
// fences, the most tiles a fence holds) is computed here with the mechanic's
// own grid and shape keys and checked against the authored claims;
// scripts/validate-fences.mjs checks them again by separate methods. Design
// notes and worksheet sources: docs/fences/README.md.
import {writeFile} from 'node:fs/promises';
import {gridOf, boundaryOf, piecesOf, freeKey, cellsOfKey, normalize, STEPS, cellKey} from '../dist/sq-grid.js';
import {gardenOf, placementsOf} from '../dist/families/fences/fences.js';

const WEEK26 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-26';
export const sources = [
  {id: 'fences-week26', title: 'Bellingham Math Circle — Week 26: Same area, different boundaries (packets for K–1, grades 2–3 and 4–5, and the adult guide)', url: WEEK26, kind: 'local curriculum'},
  {id: 'fences-review', title: 'Bellingham Math Circle — Week 26 review card, with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-26.md', kind: 'local curriculum'},
  {id: 'fences-harary-harborth', title: 'Frank Harary and Heiko Harborth — Extremal animals, Journal of Combinatorics, Information & System Sciences 1 (1976), 1–8', url: 'https://oeis.org/A027709', kind: 'research'},
  {id: 'fences-golomb', title: 'Solomon W. Golomb — Polyominoes: Puzzles, Patterns, Problems, and Packings, second edition, Princeton University Press (1994)', url: 'https://press.princeton.edu/books/paperback/9780691024448/polyominoes', kind: 'book'},
  {id: 'fences-oeis', title: 'OEIS A000105 (free polyominoes with n cells) and A027709 (the least perimeter of n cells)', url: 'https://oeis.org/A000105', kind: 'reference'}
];
export const family = {
  id: 'fences',
  title: 'Garden fences',
  mathematics: 'A garden is n square tiles joined along whole sides, and its fence is every tile side with no tile beside it, round holes too. Each shared side hides two tile sides, so the fence is 4n − 2s for s shared sides, and it is always even. A joined garden has at least n − 1 shared sides, so the fence is at most 2n + 2, reached exactly when no tiles close a loop (the tiles and their shared sides form a tree); a hole sealed at a corner closes no loop. A garden over r rows and c columns has a fence of at least 2(r + c) and at most rc tiles, so the shortest fence for n tiles is 2⌈2√n⌉ (Harary and Harborth) and a fence of 2s holds at most ⌊s/2⌋·⌈s/2⌉ tiles.',
  rules: [
    'Tiles that share a whole side are joined. Touching at a corner is not enough.',
    'A garden is all its tiles, joined in one piece.',
    'The fence runs along every tile side with no tile beside it, round ponds and holes too.'
  ],
  sourceIds: sources.map(s => s.id)
};

const RULES = family.rules;
const TAP = 'Tap a square to plant a tile, and tap a tile to lift it. Drag across empty squares to plant a row; drag a tile to carry it to another square.';
const CONTROLS = {
  target: TAP,
  fewest: `${TAP} Press Shortest when you think no garden of these tiles has a shorter fence.`,
  longest: `${TAP} Press Longest when you think no garden of these tiles has a longer fence.`,
  most: `${TAP} Press Most when you think no more tiles fit inside the fence.`,
  every: `${TAP} Clear lifts every tile. Press That’s all when you have every garden.`,
  fences: `${TAP} Clear lifts every tile. Press That’s all when you have made every length that can be made.`
};
const MODE_RULES = {
  target: ['Solved when every tile is in one garden with exactly that fence.'],
  fewest: ['Solved when you press Shortest on a garden with the shortest fence its tiles can have. If a shorter one exists, you’re told.'],
  longest: ['Solved when you press Longest on a garden with the longest fence its tiles can have on this plot. If a longer one exists, you’re told.'],
  most: ['The fence may be shorter than the number given, never longer.', 'Solved when you press Most with as many tiles as any garden inside that fence can hold. If more fit, you’re told.'],
  every: ['A garden turned or flipped is the same garden. Each new one joins the row below the plot.', 'Solved when you press That’s all with every garden found.'],
  fences: ['Each fence length you make with all the tiles lights up.', 'Solved when you press That’s all with every length that can be made lit.']
};
const POND = 'The pond must end up inside the garden, with fence all round it.';
const SPAN = 'The garden must reach every row and every column of the plot.';
const MOVES = n => `Move at most ${n === 2 ? 'two tiles' : plural(n, 'tile')}. A tile carried back where it started gives its move back.`;
const plural = (n, one) => `${n} ${n === 1 ? one : `${one}s`}`;

/* ---------------- Shapes, by growing one square at a time ---------------- */
const free = new Map([[1, [freeKey([[0, 0]])]]]);
export function freeShapes(n) {
  for (let k = 2; k <= n; k++) {
    if (free.has(k)) continue;
    const next = new Set();
    for (const key of free.get(k - 1)) {
      const cells = cellsOfKey(key), have = new Set(cells.map(cellKey));
      for (const [x, y] of cells) for (const [dx, dy] of STEPS) {
        const c = [x + dx, y + dy];
        if (!have.has(cellKey(c))) next.add(freeKey([...cells, c]));
      }
    }
    free.set(k, [...next].sort());
  }
  return free.get(n);
}
const perimeter = key => { const cells = normalize(cellsOfKey(key)), g = gridOf({cols: 99, rows: 99, cells: cells.map(([x, y]) => [x + 1, y + 1])}); return boundaryOf(g, g.cells.map((_, i) => i)).length; };
// Every joined set of n squares of a plot, grown from smaller ones.
function plotGardens(g, n, allowed) {
  let level = new Set(allowed.map(i => String(i)));
  for (let k = 2; k <= n; k++) {
    const next = new Set();
    for (const s of level) {
      const set = s.split(',').map(Number), have = new Set(set);
      for (const i of set) for (const j of g.nbr[i]) if (!have.has(j) && allowed.includes(j)) next.add([...set, j].sort((a, b) => a - b).join(','));
    }
    level = next;
  }
  return [...level].map(s => s.split(',').map(Number));
}
// Every k-element subset of a list.
const choose = (list, k) => k === 0 ? [[]] : list.flatMap((x, i) => choose(list.slice(i + 1), k - 1).map(rest => [x, ...rest]));
// The shortest fence for n tiles: the least 2(r + c) with rc ≥ n.
const shortest = n => { let best = Infinity; for (let r = 1; r <= n; r++) best = Math.min(best, 2 * (r + Math.ceil(n / r))); return best; };
const mostInside = fence => { let best = 0; for (let r = 1; r < fence / 2; r++) best = Math.max(best, r * (fence / 2 - r)); return best; };
// A near-square garden: r full rows of c, then a part row from a corner.
function nearSquare(n) {
  const k = Math.floor(Math.sqrt(n)), c = k * k === n ? k : k * (k + 1) >= n ? k + 1 : k + 1, cells = [];
  for (let i = 0; i < n; i++) cells.push([i % c, Math.floor(i / c)]);
  return cells;
}

// A plot drawn as rows of '#' (a tile) and '.', top row first.
const picture = rows => rows.split('/').flatMap((row, y) => [...row].flatMap((ch, x) => ch === '#' ? [[x, y]] : []));

/* ---------------- The puzzles ---------------- */
const playground = {
  id: 'fences-playground', number: 0, title: 'Garden fences playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground', size: 6},
  objective: 'Plant any garden and watch its fence.',
  controls: `${TAP} The squares above the plot change its size; Clear lifts every tile.`,
  rules: RULES,
  idea: 'Free planting on plots of 4, 6 or 8 squares a side, with the fence and the number of tiles counted.',
  prerequisites: 'None. A grown-up can suggest a question from the puzzles.',
  hints: ['Plant one tile, then another beside it. How did the fence change?', 'Where can a new tile go without making the fence longer?', 'Plant 12 tiles in a row, then in a block. Which fence is longer?'],
  parent: {
    notice: 'A new tile changes the fence by 4 − 2k, where k is the number of tiles it touches: +2, 0, −2 or −4.',
    prompt: 'Where can a tile go so the fence stays the same?',
    explanation: 'A tile brings four sides. Each tile it touches hides one of its sides and one of the other tile’s, so touching one tile adds two to the fence, touching two adds nothing, touching three takes two away and filling a hole takes four away.',
    extension: 'How many shared sides does a garden with 10 tiles and a fence of 14 have? (13, because 40 − 2 × 13 = 14.)',
    connection: 'The fence is 4n − 2s: counting sides two ways, the same double counting as the handshake lemma.'
  },
  provenance: 'Week 26 materials: building with square tiles and counting the boundary with edge markers.',
  sourceIds: ['fences-week26']
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Four tiles',
    parameters: {mode: 'every', cols: 4, rows: 4, tiles: 4},
    visibleObjective: 'Find every garden of 4 tiles.',
    idea: 'Five shapes of four squares; turning or flipping one makes no new shape.',
    prerequisites: 'None. Turning a shape in the head, or on the plot, helps.',
    hints: ['Start with all four in a straight row.', 'Make a row of three, and put the last tile beside it in different places.', 'With no row of three, the tiles make a square or a zigzag.'],
    parent: {
      notice: 'There are five gardens. The square has a fence of 8; the other four have 10.',
      prompt: 'How do you know there isn’t a sixth?',
      explanation: 'Sort by the longest straight row. Four in a row is one garden. With a row of three, the last tile goes beside an end (the L) or beside the middle (the T). With no row of three, the tiles fill a 2-by-2 square or make a zigzag. Turned and flipped copies are the same garden.',
      extension: 'Which gardens can take a fifth tile without the fence getting longer? (Any with a corner nook: the L, the T and the zigzag. The square and the straight row can’t.)',
      connection: 'These are the five tetrominoes; with five tiles there are twelve pentominoes, and nobody has a formula for the count in general.'
    },
    provenance: 'Week 26 K–1 Problem 1 (make every different four-tile shape and count its boundary).',
    sourceIds: ['fences-week26', 'fences-golomb', 'fences-oeis'],
    expect: {answers: 5}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'A fence of ten',
    parameters: {mode: 'target', cols: 4, rows: 4, tiles: 5, fence: 10},
    visibleObjective: 'Plant all 5 tiles with a fence of 10.',
    idea: 'Tiles packed into a block share more sides, which shortens the fence.',
    prerequisites: 'Count to 12.',
    hints: ['A straight row of five has a fence of 12. Make the tiles touch more.', 'Make a 2-by-2 square first.', 'Put the fifth tile beside the square.'],
    parent: {
      notice: 'Only one garden works, up to turning and flipping: a 2-by-2 square with one tile beside it.',
      prompt: 'Why do all the other five-tile gardens have a fence of 12?',
      explanation: 'Five tiles bring 20 sides and each shared side hides two, so a fence of 10 needs five shared sides. A joined garden of five has at least four; a fifth comes only from a closed loop, and the only loop five tiles can make is a 2-by-2 square.',
      extension: 'Can five tiles have a fence of 8? (No: that needs six shared sides, and five tiles can close only one loop.)',
      connection: 'Fence = 4n − 2s, the double count behind every puzzle in this family.'
    },
    provenance: 'Week 26 K–1 Problem 2 (shortest and longest boundaries with five tiles).',
    sourceIds: ['fences-week26'],
    expect: {places: true}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'A small plot',
    parameters: {mode: 'longest', cols: 3, rows: 3, tiles: 6},
    visibleObjective: 'Plant all 6 tiles with the longest fence.',
    idea: 'With no room for a straight row, the longest fence comes from never closing a square.',
    prerequisites: 'Count to 14.',
    hints: ['A 2-by-2 square of tiles makes the fence shorter.', 'Try to plant all six without making any 2-by-2 square.', 'Plant a whole row of three, then two tiles down one side and one more.'],
    parent: {
      notice: 'The longest fence is 14, the same as a straight row of six would have.',
      prompt: 'Why can’t six tiles ever have a fence longer than 14?',
      explanation: 'Six joined tiles share at least five sides, so the fence is at most 24 − 10 = 14. It is exactly 14 when no four tiles make a 2-by-2 square, and three gardens on this plot do that.',
      extension: 'On this plot, what is the longest fence for seven tiles? (16: leave the middle square empty, and no 2-by-2 square is full.)',
      connection: 'The fence is longest exactly when the tiles and their shared sides form a tree.'
    },
    provenance: 'Week 26 grades 4–5 Problem 2 (longest boundaries with none in a straight row), on a 3-by-3 plot instead.',
    sourceIds: ['fences-week26'],
    expect: {best: 14, gardens: 3}
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Which fences?',
    parameters: {mode: 'fences', cols: 5, rows: 5, tiles: 5, chips: [8, 9, 10, 11, 12, 13]},
    visibleObjective: 'Which of these fences can 5 tiles have?',
    idea: 'Every fence is even, and five tiles have a fence of 10 or 12.',
    prerequisites: 'Count to 13. Odd and even numbers help but aren’t needed.',
    hints: ['Plant all five in a row and look at the fence.', 'Pack the tiles tighter and look again.', 'A 2-by-2 square with one tile beside it.'],
    parent: {
      notice: 'Only 10 and 12 can be made.',
      prompt: 'Why can’t you make 9, 11 or 13?',
      explanation: 'Five tiles bring 20 sides, and every shared side hides two of them, so the fence is 20 take away an even number: always even. Five joined tiles share at least four sides (fence at most 12) and at most five (fence at least 10).',
      extension: 'Which fences can six tiles have? (10, 12 and 14.)',
      connection: 'Parity: fence = 4n − 2s is even for every garden, the invariant behind the whole family.'
    },
    provenance: 'Week 26 K–1 Problem 5 (which boundary lengths from 8 to 13 can five tiles make).',
    sourceIds: ['fences-week26'],
    expect: {answers: [10, 12]}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Every row, every column',
    parameters: {mode: 'fewest', cols: 5, rows: 4, tiles: 12, span: true},
    visibleObjective: 'Plant all 12 tiles with the shortest fence, reaching every row and every column.',
    idea: 'A garden that reaches every row and every column has at least two fence sides on each of them.',
    prerequisites: 'Count to 20. Adding 4 and 5 for the reason why.',
    hints: ['Count the fence sides along one row. Can a row with tiles have fewer than two?', 'A gap inside a row or a column adds two more sides.', 'Keep every row and every column in one unbroken run.'],
    parent: {
      notice: 'The shortest fence is 18, and many gardens reach it: exactly those with no gap inside any row or column.',
      prompt: 'Why can’t the fence be 16?',
      explanation: 'Each row with tiles has a fence side at its left end and one at its right end, and each column has one at its top and one at its bottom, so a garden that reaches 4 rows and 5 columns has a fence of at least 2 × (4 + 5) = 18. A gap inside a row or a column adds two more sides, so the fence is exactly 18 when there is none.',
      extension: 'How few tiles can reach every row and every column of this plot? (8, in a staircase, also with a fence of 18.)',
      connection: 'The same count bounds every garden’s fence from below, which is how the shortest fence for n tiles, 2⌈2√n⌉, is proved (Harary and Harborth, 1976).'
    },
    provenance: 'Week 26 grades 4–5 Problem 3 (twelve tiles reaching 4 rows and 5 columns: the least boundary).',
    sourceIds: ['fences-week26', 'fences-harary-harborth'],
    solvedRule: 'Solved when you press Shortest on the shortest fence a garden reaching every row and every column can have. If a shorter one exists, you’re told.',
    expect: {best: 18}
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Fourteen pieces of fence',
    parameters: {mode: 'most', cols: 6, rows: 6, fence: 14},
    visibleObjective: 'Plant as many tiles as you can with a fence of 14 or less.',
    idea: 'For a fixed fence, the squarest rectangle holds the most.',
    prerequisites: 'Count to 14. Multiplying small numbers helps.',
    hints: ['Find a tile that fits in a nook between two others: the fence stays the same.', 'Fill every nook. What shape is left?', 'A block of three rows of four.'],
    parent: {
      notice: 'Twelve tiles fit, in a 3-by-4 block, and no garden with a fence of 14 holds more.',
      prompt: 'Why can’t thirteen tiles fit?',
      explanation: 'A garden over r rows and c columns has a fence of at least 2(r + c), so a fence of 14 means r + c ≤ 7, and rc is largest when r and c are as close as they can be: 3 × 4 = 12. A tile in a nook touches two tiles and leaves the fence as it is, which is how a garden grows for free until it is a rectangle.',
      extension: 'How many tiles fit inside a fence of 16? Of 18? (16 and 20.)',
      connection: 'The discrete isoperimetric problem: among shapes with a given boundary, the squarest holds the most.'
    },
    provenance: 'Week 26 grades 4–5 Problem 4 (the greatest number of tiles for boundaries of 12, 14, 16 and 18).',
    sourceIds: ['fences-week26', 'fences-harary-harborth'],
    expect: {best: 12}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Six with a fence of twelve',
    parameters: {mode: 'every', cols: 5, rows: 5, tiles: 6, fence: 12},
    visibleObjective: 'Find every garden of 6 tiles with a fence of 12.',
    idea: 'A fence of 12 means exactly one loop, so each garden has one 2-by-2 square.',
    prerequisites: 'Count to 14. Remembering which gardens are already in the row helps.',
    hints: ['Start with a 2-by-2 square and add two tiles.', 'Two tiles that make a second 2-by-2 square shorten the fence too much.', 'Put both tiles on one side of the square, or one on each of two sides.'],
    parent: {
      notice: 'There are seven, and each contains exactly one 2-by-2 square.',
      prompt: 'Why does every one of them have a 2-by-2 square?',
      explanation: 'Six tiles bring 24 sides, so a fence of 12 needs six shared sides: one more than a garden without loops. Six tiles can close only one loop, and on a square grid the smallest loop is a 2-by-2 square (a ring round a hole needs eight). So each garden is a 2-by-2 square with two tiles added, without making a 2-by-3 block.',
      extension: 'How many six-tile gardens have a fence of 10? (One, the 2-by-3 block.)',
      connection: 'Of the 35 hexominoes, 27 have the longest fence (14), seven have 12 and one has 10.'
    },
    provenance: 'Week 26 grades 2–3 Problem 1 (find a different shape reaching each length).',
    sourceIds: ['fences-week26', 'fences-oeis'],
    expect: {answers: 7}
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Round the pond',
    parameters: {mode: 'longest', cols: 5, rows: 5, tiles: 8, ponds: [[2, 2]]},
    visibleObjective: 'Plant all 8 tiles round the pond with the longest fence.',
    idea: 'A garden can close round a hole without closing a loop of tiles.',
    prerequisites: 'Count to 18.',
    hints: ['A ring of all eight round the pond has a fence of 16.', 'Can tiles shut the pond in by touching only at a corner?', 'Leave one corner of the ring open and use that tile outside.'],
    parent: {
      notice: 'The longest fence is 18, and the full ring has only 16.',
      prompt: 'Doesn’t a garden with a pond inside need a loop of tiles?',
      explanation: 'Eight tiles have a fence of at most 2 × 8 + 2 = 18, reached when no tiles close a loop. The four tiles beside the pond must all be planted. Joined through three of the four corner squares, they close no loop, and the pond stays shut in because across the empty corner two tiles touch at a point. The eighth tile goes outside, touching one tile.',
      extension: 'Seven tiles round the pond: how long is the fence? (16: there is only one way, a C with its open corner sealed.)',
      connection: 'The fence is 2n + 2 exactly when the tiles form a tree, holes or not.'
    },
    provenance: 'Week 26 grades 4–5 Problem 2 (can a longest-boundary twelve-tile shape have a hole?) and the guide’s note that a corner contact can seal a hole.',
    sourceIds: ['fences-week26'],
    expect: {best: 18, ring: 16}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Seven with a fence of twelve',
    parameters: {mode: 'every', cols: 5, rows: 5, tiles: 7, fence: 12},
    visibleObjective: 'Find every garden of 7 tiles with a fence of 12.',
    idea: 'The shortest gardens fill their rows and columns with no gaps.',
    prerequisites: 'Count to 16. Remembering which gardens are already in the row helps.',
    hints: ['Seven tiles fit in 2 rows of 4, or in 3 rows of 3.', 'Take tiles away only from the corners of the block.', 'In 3 rows of 3, take two tiles from the corners or one corner and its neighbour.'],
    parent: {
      notice: 'There are four: a 2-by-4 block with a corner missing, and three ways to take two tiles off a 3-by-3 square.',
      prompt: 'Why doesn’t taking a tile from the middle of a side work?',
      explanation: 'The fence is at least 2(r + c), so a fence of 12 needs r + c = 6: two rows of four or three of three. It equals 2(r + c) only when every row and every column is one unbroken run. Removing a tile from the middle of a side breaks a run (the fence gets two sides longer), so tiles come off corners: one from a 2-by-4, two from a 3-by-3 (two corners on one side, opposite corners, or a corner and the tile beside it).',
      extension: 'Eight tiles with a fence of 12: how many gardens? (Two, the 2-by-4 block and the 3-by-3 square with a corner missing.)',
      connection: 'Gardens whose rows and columns are unbroken runs are called orthogonally convex; their fence is exactly twice the rows plus the columns.'
    },
    provenance: 'Week 26 grades 4–5 Problem 1 (find two different shapes reaching the shortest boundary for 7 tiles) and Problem 3 (rows and columns).',
    sourceIds: ['fences-week26', 'fences-harary-harborth'],
    expect: {answers: 4}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Two moves',
    parameters: {mode: 'fewest', cols: 5, rows: 5, tiles: 12, moves: 2, start: picture('...../##.../##.#./##.#./####.')},
    visibleObjective: 'Move two tiles to make the fence as short as you can.',
    idea: 'The move that shortens the fence most is not always the start of the best two moves.',
    prerequisites: 'Count to 20.',
    hints: ['Which shape of twelve tiles has the shortest fence of all?', 'A 3-by-4 block has a fence of 14. Where could two moves make one?', 'Move the two tiles at the top into the gaps.'],
    parent: {
      notice: 'Two moves make a fence of 14: the two top tiles fill the gaps, giving a 3-by-4 block. The single move that shortens the fence most (a right-hand tile into a gap, fence 16) leaves no second move that reaches 14, and the best routes first leave the fence at 18 or make it 20.',
      prompt: 'Which first move makes the fence shortest straight away? What can the second move do after it?',
      explanation: 'Twelve tiles have a fence of at least 14, reached only by a 3-by-4 block, since a garden over r rows and c columns has a fence of at least 2(r + c) and holds at most rc tiles. The only block that two moves can make covers the bottom three rows and the first four columns: it is missing two squares, and the two top tiles are the only ones outside it.',
      extension: 'With three moves, how short can the fence get? (Still 14: no garden of twelve tiles has less.)',
      connection: 'Taking the best step each time is a greedy method; this garden shows how it can miss the best result two steps away.'
    },
    provenance: 'New for the app, extending Week 26 K–1 Problem 6 (one move to make the boundary shorter) to two moves.',
    sourceIds: ['fences-week26'],
    solvedRule: 'Solved when you press Shortest on the shortest fence two moves can make. If a shorter one exists, you’re told.',
    controls: `Drag a tile to carry it to another square, or tap a tile to lift it and tap an empty square to plant it. A tile carried back where it started gives its move back. Press Shortest when you think no two moves make a shorter fence.`,
    expect: {best: 14, goals: 1, oneMove: 16}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Twelve in a square',
    parameters: {mode: 'longest', cols: 4, rows: 4, tiles: 12},
    visibleObjective: 'Plant all 12 tiles with the longest fence.',
    idea: 'Four empty squares have to break every 2-by-2 square of the plot.',
    prerequisites: 'Count to 26.',
    hints: ['Every 2-by-2 square of tiles makes the fence shorter.', 'Each corner of the plot has its own 2-by-2 square, and they don’t overlap. Each needs an empty square.', 'Leave one empty square in each corner 2-by-2 block, then check every other 2-by-2 block has one too.'],
    parent: {
      notice: 'The longest fence is 26, as long as twelve tiles can ever have, and only four gardens reach it.',
      prompt: 'How can twelve tiles on a 4-by-4 plot avoid every 2-by-2 square?',
      explanation: 'A fence of 2 × 12 + 2 = 26 needs the tiles to close no loop, so no 2-by-2 square may be full. The four corner 2-by-2 squares don’t overlap, so each holds exactly one of the four empty squares; the empty squares must also break the five middle 2-by-2 squares and leave the garden in one piece.',
      extension: 'Thirteen tiles leave only three empty squares. Puzzle 12 asks what happens.',
      connection: 'The most squares of a grid that form a tree: the largest induced tree of the grid graph.'
    },
    provenance: 'Week 26 grades 4–5 Problem 2 (the longest boundary of a twelve-tile shape, none in a straight row; can it contain a 2-by-2 block?), on a 4-by-4 plot instead.',
    sourceIds: ['fences-week26'],
    expect: {best: 26, gardens: 4}
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Thirteen in a square',
    parameters: {mode: 'longest', cols: 4, rows: 4, tiles: 13},
    visibleObjective: 'Plant all 13 tiles with the longest fence.',
    idea: 'Three empty squares can’t break all four corner 2-by-2 squares, so a loop is forced.',
    prerequisites: 'Count to 28. Puzzle 11 first.',
    hints: ['Thirteen tiles leave three empty squares.', 'Each corner 2-by-2 square of the plot without an empty square closes a loop.', 'Start from a garden of Puzzle 11 and plant the thirteenth tile in a nook between two tiles.'],
    parent: {
      notice: 'The longest fence is 26, the same as for twelve tiles: the extra tile adds nothing.',
      prompt: 'Why can’t thirteen tiles reach 2 × 13 + 2 = 28 here?',
      explanation: 'Twenty-eight needs no loop at all, so every 2-by-2 square of the plot needs an empty square. The four corner 2-by-2 squares don’t overlap, and three empty squares can’t reach all four, so at least one loop closes and the fence is at most 26. A twelve-tile garden of Puzzle 11 with a tile added in a nook, touching two tiles, keeps its fence of 26.',
      extension: 'What is the longest fence for fourteen tiles on this plot? (24.)',
      connection: 'A pigeonhole argument: four disjoint corner squares, three empty squares.'
    },
    provenance: 'New for the app, extending Week 26 grades 4–5 Problem 2 (longest boundaries, 2-by-2 blocks and loops).',
    sourceIds: ['fences-week26'],
    expect: {best: 26, gardens: 1}
  }
];

/* ---------------- Answers, computed and checked ---------------- */
function plotOf(q) { const g = gridOf({cols: q.cols, rows: q.rows}); return {g, ponds: (q.ponds || []).map(c => g.index.get(cellKey(c)))}; }
const puzzleOf = (number, q) => ({id: `fences-${String(number).padStart(2, '0')}`, parameters: q});
const fail = (p, msg) => { throw Error(`Puzzle ${p.number}: ${msg}`); };
function complete(p) {
  const q = p.parameters, e = p.expect, probe = (qq = q) => puzzleOf(p.number, qq), board = {tiles: [], found: [], told: null, claimed: false};
  const {g, ponds} = plotOf(q);
  const fits = key => placementsOf(probe(), board, [key]).length > 0;
  if (q.mode === 'every') {
    const keys = freeShapes(q.tiles).filter(k => q.fence === undefined || perimeter(k) === q.fence);
    if (!keys.every(fits)) fail(p, 'a garden does not fit the plot');
    if (keys.length !== e.answers) fail(p, `${keys.length} gardens`);
    q.answers = keys;
  }
  if (q.mode === 'fences') {
    const byFence = new Map();
    for (const k of freeShapes(q.tiles)) if (fits(k) && !byFence.has(perimeter(k))) byFence.set(perimeter(k), k);
    const made = [...byFence.keys()].filter(n => q.chips.includes(n)).sort((a, b) => a - b);
    if (JSON.stringify(made) !== JSON.stringify(e.answers)) fail(p, `fences ${made}`);
    if ([...byFence.keys()].some(n => !q.chips.includes(n))) fail(p, 'a fence length lies outside the chips');
    q.answers = made;
    q.witnesses = made.map(n => byFence.get(n));
  }
  if (q.mode === 'target') {
    const keys = freeShapes(q.tiles).filter(k => perimeter(k) === q.fence && fits(k));
    if (!keys.length) fail(p, 'no garden');
    q.witnesses = keys;
  }
  if (q.mode === 'fewest' && q.span) {
    // Every joined set of the plot's squares that reaches every row and column.
    const legal = plotGardens(g, q.tiles, g.cells.map((_, i) => i)).map(tiles => gardenOf(probe(), {tiles, told: null, claimed: false})).filter(gd => gd.legal);
    q.best = Math.min(...legal.map(gd => gd.fence));
    if (q.best !== e.best || q.best !== 2 * (q.cols + q.rows)) fail(p, `shortest spanning ${q.best}`);
    q.witnesses = [...new Set(legal.filter(gd => gd.fence === q.best).map(gd => gd.key))].sort();
  } else if (q.mode === 'fewest' && q.moves) {
    // Every garden reached by moving at most q.moves tiles off their starting squares.
    const start = q.start.map(c => g.index.get(cellKey(c))), others = g.cells.map((_, i) => i).filter(i => !start.includes(i));
    const reached = k => choose(start, k).flatMap(gone => choose(others, k).map(add => [...start.filter(i => !gone.includes(i)), ...add].sort((a, b) => a - b)))
      .map(tiles => ({tiles, gd: gardenOf(probe(), {tiles, told: null, claimed: false})})).filter(r => r.gd.legal);
    const within = k => Array.from({length: k + 1}, (_, j) => reached(j)).flat(), bestOf = list => Math.min(...list.map(r => r.gd.fence));
    q.best = bestOf(within(q.moves));
    const goals = within(q.moves).filter(r => r.gd.fence === q.best);
    if (q.best !== e.best || goals.length !== e.goals || bestOf(within(1)) !== e.oneMove) fail(p, `${q.best} with ${goals.length} goals, ${bestOf(within(1))} in one move`);
    q.goals = goals.map(r => r.tiles.map(i => g.cells[i]));
  } else if (q.mode === 'fewest') {
    q.best = shortest(q.tiles);
    if (q.best !== e.best) fail(p, `shortest ${q.best}`);
    // Every garden for small counts; the near-square garden otherwise.
    q.witnesses = q.tiles <= 9 ? freeShapes(q.tiles).filter(k => perimeter(k) === q.best) : [freeKey(nearSquare(q.tiles))];
    if (q.tiles <= 9 && Math.min(...freeShapes(q.tiles).map(perimeter)) !== q.best) fail(p, 'enumeration disagrees');
    if (perimeter(q.witnesses[0]) !== q.best || !fits(q.witnesses[0])) fail(p, 'witness');
  }
  if (q.mode === 'most') {
    q.best = mostInside(q.fence);
    if (q.best !== e.best) fail(p, `most ${q.best}`);
    q.witnesses = [freeKey(nearSquare(q.best))];
    if (perimeter(q.witnesses[0]) > q.fence || !fits(q.witnesses[0])) fail(p, 'witness');
  }
  if (q.mode === 'longest') {
    const allowed = g.cells.map((_, i) => i).filter(i => !ponds.includes(i));
    const legal = plotGardens(g, q.tiles, allowed).map(tiles => gardenOf(probe(), {tiles, told: null, claimed: false})).filter(gd => gd.legal);
    q.best = Math.max(...legal.map(gd => gd.fence));
    const keys = [...new Set(legal.filter(gd => gd.fence === q.best).map(gd => gd.key))].sort();
    if (q.best !== e.best || keys.length !== (e.gardens ?? keys.length)) fail(p, `longest ${q.best} with ${keys.length} gardens`);
    if (e.ring !== undefined && !legal.some(gd => gd.fence === e.ring && gd.key === freeKey([[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]]))) fail(p, 'the ring');
    q.witnesses = keys;
  }
  if (e.places && !placementsOf(probe(), board, q.witnesses).length) fail(p, 'no place');
}

const puzzles = [playground, ...authored].map(p => {
  if (p.number) complete(p);
  const {expect, sourceIds, parent, visibleObjective, solvedRule, ...rest} = p, q = rest.parameters;
  const mode = q.mode, objective = mode === 'playground' ? rest.objective : visibleObjective;
  return {
    id: mode === 'playground' ? rest.id : `fences-${String(rest.number).padStart(2, '0')}`,
    number: rest.number, title: rest.title, band: rest.band || 'all', difficulty_level: rest.difficulty_level,
    mechanic: 'fences', familyTitle: family.title, revision: 1, parameters: q,
    objective, ...(mode === 'playground' ? {} : {visibleObjective}), instruction: objective,
    controls: rest.controls || CONTROLS[mode], rules: rest.rules || [...RULES, ...(q.ponds ? [POND] : []), ...(q.span ? [SPAN] : []), ...(q.moves ? [MOVES(q.moves)] : []), ...(solvedRule ? [solvedRule] : MODE_RULES[mode])],
    idea: rest.idea, prerequisites: rest.prerequisites, hints: rest.hints,
    parent: {...parent, sourceIds}, provenance: rest.provenance, sourceDocument: 'docs/fences/README.md'
  };
});
export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};
if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/fences/fences.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
