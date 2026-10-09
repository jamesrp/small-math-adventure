// Builds dist/families/blocks/blocks.json, the Week 1 encore groups of
// Rhombus gardens (Rhombus duel, Fewest blocks, Red trapezoids), from the
// authoring lists below. Every fact a puzzle relies on (who wins, how many
// winning first rhombi, the fewest blocks and the trap a greedy filling
// falls into, how many trapezoid fillings and how many point down) is
// computed here from dist/families/blocks/blockmath.js and checked against
// the authored claims; scripts/validate-blocks.mjs checks them again by
// separate methods. Design notes and worksheet sources: docs/blocks/README.md.
import {writeFile} from 'node:fs/promises';
import {gridOf, placements} from '../dist/tri-grid.js';
import {covers, tilingKey, sortPiece} from '../dist/families/rhombus/lozenge.js';
import {hexagon} from '../dist/families/rhombus/rhombus.js';
import {toMoveWins, winningSpots, openSpots, halfTurn, turnedPiece, pieceKey, fewestOf, fillingsWith, fillWithin, kindsOf, upsAndDowns, hexagonPairs, recut, duelPositions, DUEL_LIMIT} from '../dist/families/blocks/blockmath.js';

const ENCORE = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-01-encore';
export const sources = [
  {id: 'blocks-week01e', title: 'Bellingham Math Circle — Week 1 encore: Pattern blocks II, packets and facilitator guide', url: ENCORE, kind: 'local curriculum'},
  {id: 'blocks-review', title: 'Bellingham Math Circle — Week 1 encore review card (keep), with its math check', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-01e.md', kind: 'local curriculum'},
  {id: 'blocks-cram', title: 'Cram (game), Wikipedia: the symmetry strategy for placing dominoes, after Berlekamp, Conway and Guy, Winning Ways for your Mathematical Plays', url: 'https://en.wikipedia.org/wiki/Cram_(game)', kind: 'reference'}
];
export const family = {
  id: 'blocks',
  title: 'Rhombus gardens: duel, fewest blocks and red trapezoids',
  mathematics: 'Boards are cut from the grid of triangles that pattern blocks fit. In the rhombus duel, players take turns laying a rhombus and a player with no room loses. On a board that looks the same after a half turn, copying wins: when the centre of the turn is a grid point, no rhombus is its own copy, so the second player can always answer with the copy of the last move; when the centre is the middle of an edge, the first player lays the one rhombus across it and copies from then on. Boards without that symmetry are won or lost by search. Fewest blocks: fitting the most hexagons first does not always give the fewest blocks (seven hexagons fit the hexagon of side 3, which then needs 13 blocks, though 12 fill it). A trapezoid covers two up triangles and one down, or two down and one up, so the numbers of each kind are fixed by the board: two-up minus two-down is ups minus downs, and the total is a third of the triangles. Two trapezoids that make a hexagon can be cut three ways, so three re-cuts come back to the start, an odd round trip that rhombus flips can never make.',
  rules: ['Pieces cover whole triangles, stay inside the board and never overlap.'],
  sourceIds: sources.map(s => s.id)
};

// Boards (the packets' shapes, as drawn there).
const tri = n => ({outline: [[0, 0], [n, 0], [0, n]]});
const par = (a, b) => ({outline: [[0, 0], [a, 0], [a, b], [0, b]]});
const B = {
  hex111: {outline: hexagon(1, 1, 1)},
  strip: par(3, 1),
  square: par(2, 2),
  hex211: {outline: hexagon(2, 1, 1)},
  p32: par(3, 2),
  p42: par(4, 2),
  hex222: {outline: hexagon(2, 2, 2)},
  p33: par(3, 3),
  tri3: tri(3),
  tri4: tri(4),
  hex123: {outline: hexagon(1, 2, 3)},
  p52: par(5, 2),
  star: {outline: [[1, 0], [1, 1], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-1, -1], [0, -1], [1, -2], [1, -1], [2, -1]]},
  boat: {outline: [[0, 0], [-1, 0], [1, -2], [3, -2], [3, 0], [2, 0], [0, 2]]},
  tri6: tri(6),
  hex333: {outline: hexagon(3, 3, 3)},
  arrow: {outline: [[0, 0], [0, 1], [-1, 2], [-4, 2], [-3, 1], [-3, 0]]},
  ramp: {outline: [[0, 0], [-3, 3], [-4, 3], [-4, 0]]},
  hex212: {outline: [[0, 0], [0, -2], [1, -3], [3, -3], [3, -1], [2, 0]]}
};

/* ------------------------------------------------------------------ *
 * Rhombus duel
 * ------------------------------------------------------------------ */
const DUEL = {
  group: 'Rhombus duel', mechanic: 'blueduel', prefix: 'blueduel',
  objective: 'Choose who goes first, then win: take turns laying a rhombus, and whoever has no room on their turn loses.',
  visibleObjective: 'Choose who goes first, then win.',
  controls: 'Me first or You first chooses who starts. Drag across two empty triangles that share a side, or tap them one after the other, to lay your rhombus; I lay mine at once, and it is the light one. After I win, Play again starts over. Undo takes back your last rhombus and my answer.',
  rules: [
    'A rhombus covers two empty triangles that share a side and stays inside the board.',
    'Players take turns. If there is no room for a rhombus on your turn, you lose.',
    'I play every board as well as it can be played.'
  ]
};
const duels = [
  {
    number: 1, difficulty_level: 'easy', title: 'Small hexagon', board: B.hex111,
    idea: 'Whatever the first player does, the second can do the same on the opposite side.',
    prerequisites: 'None once the move is shown. Taking turns.',
    hints: ['Play once with you first and once with me first. Who won each time?', 'Look at where my rhombus goes after yours.', 'Let me go first. Then lay your rhombus opposite mine.'],
    parent: {
      notice: 'Whether your child plays at random or starts to answer each rhombus with one opposite it.',
      prompt: 'Who won when you went first? When you went second? What did the winner do?',
      explanation: 'The hexagon looks the same after a half turn about its middle point. The opposite of any rhombus is free whenever the rhombus was laid, because a rhombus and its opposite never share a triangle when the middle is a grid point. So the second player can always lay the opposite of the first player’s rhombus, and always has a move when the first player did: the first player runs out first. Every game here lasts two or three rhombi.',
      extension: 'With real blocks, try the 2-by-2 board (puzzle 3). Does copying still work?',
      connection: 'The symmetry strategy (Tweedledum and Tweedledee): a second player who keeps the board symmetric can always move. It wins Cram, the same game with dominoes on a grid of squares, whenever a side is even.'
    },
    provenance: 'Week 1 encore K–1 Problem 2 and grades 2–3 Problem 1 (the small hexagon).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'second', centre: 'point', firstMoves: 6, winningFirst: 0}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'The strip', board: B.strip,
    idea: 'On a strip with an edge in the middle, the first player takes the middle and then copies.',
    prerequisites: 'None once the move is shown.',
    hints: ['Play a few games each way. Who wins?', 'There are five places for the first rhombus. Try each one.', 'Go first, and lay your rhombus across the middle of the strip.'],
    parent: {
      notice: 'Only one first rhombus wins: the one across the middle.',
      prompt: 'When you went first and won, where was your first rhombus?',
      explanation: 'The strip looks the same after a half turn about the middle of its middle edge. The rhombus across that edge is its own opposite. A first player who lays it leaves two ends that are copies of each other, and then answers each rhombus with its opposite, as the second player does on the small hexagon. Any other first rhombus loses: of the five places, only the middle wins.',
      extension: 'Make the strip longer by one rhombus. Who wins now?',
      connection: 'When the centre of the half turn is the middle of an edge, one rhombus is its own copy; the first player takes it and becomes the copier.'
    },
    provenance: 'Week 1 encore K–1 Problem 2 (the 3-by-1 strip).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 5, winningFirst: 1, selfWins: true}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'The square', board: B.square,
    idea: 'The same copying works on a different shape with a point in the middle.',
    prerequisites: 'Puzzle 1 helps.',
    hints: ['Does this board look the same after a half turn?', 'Where is its middle: a corner of the triangles, or the middle of a side?', 'Let me go first, and lay each rhombus opposite mine.'],
    parent: {
      notice: 'Whether your child recognises the small hexagon’s trick on a new board.',
      prompt: 'Where is the middle of this board? Is it a dot of the grid, or halfway along a line?',
      explanation: 'The middle of the 2-by-2 board is a grid point, so no rhombus is its own opposite and the second player wins by copying, exactly as on the small hexagon. Games last two, three or four rhombi.',
      extension: 'Which boards from the worksheets have a grid point in the middle, and which the middle of an edge?',
      connection: 'One strategy covers a whole family of boards: those that look the same after a half turn about a grid point.'
    },
    provenance: 'Week 1 encore K–1 Problem 2 and grades 2–3 Problem 1 (the 2-by-2 board).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'second', centre: 'point', firstMoves: 8, winningFirst: 0}
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Long hexagon', board: B.hex211,
    idea: 'Only the rhombus across the middle edge wins as a first move.',
    prerequisites: 'Puzzle 2 helps.',
    hints: ['Who wins on this board, the first player or the second?', 'Find the middle of the board. Is it a grid point or the middle of an edge?', 'Go first and lay the rhombus across the middle edge. Then copy.'],
    parent: {
      notice: 'Ten of the eleven first rhombi lose.',
      prompt: 'Which rhombus is its own opposite?',
      explanation: 'The long hexagon looks the same after a half turn about the middle of its middle edge. The rhombus across that edge is its own opposite; the first player lays it and then copies. Every other first rhombus leaves the second player a win, so the first move is a real decision: 1 winning place of 11.',
      extension: 'If you go first and lay some other rhombus, can you still win if I make a mistake?',
      connection: 'The same edge-centre rule as the strip, on a hexagon.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 1 (the hexagon 1, 1, 2, called long because two of its sides are 2).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 11, winningFirst: 1, selfWins: true}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Three by two', board: B.p32,
    idea: 'A wider board with an edge in the middle: the first player takes it.',
    prerequisites: 'Puzzle 2 or 4.',
    hints: ['Who wins on this board?', 'Look for the rhombus that a half turn leaves in place.', 'Go first, lay the middle rhombus, then answer each of mine with its opposite.'],
    parent: {
      notice: 'One first rhombus of 13 wins.',
      prompt: 'After your middle rhombus, what do the two sides of the board look like?',
      explanation: 'The 3-by-2 board looks the same after a half turn about the middle of an edge, so the first player lays the rhombus across that edge and copies. Only that first rhombus wins, of 13 places.',
      extension: 'Try a 3-by-1, 3-by-2 and 3-by-3 board (puzzle 8). Is the middle always an edge?',
      connection: 'A parallelogram with an odd side has an edge in the middle; with both sides even, a grid point.'
    },
    provenance: 'Week 1 encore K–1 Problem 4 and grades 2–3 Problem 1 (the 3-by-2 board).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 13, winningFirst: 1, selfWins: true}
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Four by two', board: B.p42,
    idea: 'Even sides put a grid point in the middle, so the second player copies.',
    prerequisites: 'Puzzle 1 or 3.',
    hints: ['Who wins on this board?', 'Where is the middle?', 'Let me go first. Lay each rhombus opposite mine.'],
    parent: {
      notice: 'Whether your child predicts the winner before playing.',
      prompt: 'Before you play: who do you think wins, and why?',
      explanation: 'Both sides of the 4-by-2 board are even, so its middle is a grid point and the second player wins by copying. Games last four to eight rhombi.',
      extension: 'Predict the winner on a 4-by-3 board, then check with blocks.',
      connection: 'For an a-by-b parallelogram: the middle is a grid point when a and b are both even, and otherwise the middle of an edge.'
    },
    provenance: 'Week 1 encore K–1 Problem 4 and grades 2–3 Problem 2 (the 4-by-2 board).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'second', centre: 'point', firstMoves: 18, winningFirst: 0}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Big hexagon', board: B.hex222,
    idea: 'Copying wins on a board too big to work out game by game.',
    prerequisites: 'Puzzle 1 or 3.',
    hints: ['Does this hexagon look the same after a half turn? Where is its middle?', 'Copying worked on the small hexagon. Who copies here?', 'Let me go first, and lay each rhombus opposite mine.'],
    parent: {
      notice: 'Whether your child copies from the start, or only notices after losing.',
      prompt: 'How do you know the opposite place is always free?',
      explanation: 'The hexagon with sides 2 has a grid point in the middle, so the second player wins by copying. The opposite place is free because after each of your answers the board is symmetric: if my rhombus fits, its opposite was free before I laid it, and my rhombus cannot cover it, since a rhombus and its opposite never share a triangle around a grid point.',
      extension: 'The hexagon with sides 3 has 54 triangles, too many to play out every game. Who wins there?',
      connection: 'A proof by strategy covers every game without listing them; the app confirms this board by a search through more than 160,000 positions.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 5 (the hexagon with sides 2).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'second', centre: 'point', firstMoves: 30, winningFirst: 0}
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Three by three', board: B.p33,
    idea: 'The middle rhombus wins, and here so do six others.',
    prerequisites: 'Puzzles 2 and 5.',
    hints: ['Who wins on this board?', 'Is the middle a grid point or the middle of an edge?', 'Go first with the rhombus across the middle edge, then copy.'],
    parent: {
      notice: 'Seven of the 21 first rhombi win; copying needs the middle one.',
      prompt: 'If you started somewhere else and still won, how did you know what to do next?',
      explanation: 'Three is odd, so the middle of the 3-by-3 board is the middle of an edge, and the first player wins by taking the rhombus across it and copying. Search finds six more winning first rhombi, but no simple rule for playing on from them; the middle one comes with a strategy.',
      extension: 'Is there a winning first rhombus that is not the middle one? (There are six.)',
      connection: 'A strategy proves who wins; it need not find every winning move.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 5 (the 3-by-3 board).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 21, winningFirst: 7, selfWins: true}
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Triangle of four', board: B.tri4,
    idea: 'A triangle has no half turn, so copying is no help; this one is a second-player win.',
    prerequisites: 'Patience for several games. Undo helps.',
    hints: ['Does a half turn leave the triangle looking the same?', 'Play several games each way. Who wins more often?', 'Let me go first. After each of my rhombi, try to leave me only bad places.'],
    parent: {
      notice: 'Every one of the 18 first rhombi loses, though there is no copying trick.',
      prompt: 'Could you copy here? What goes wrong?',
      explanation: 'A half turn takes the triangle to one pointing the other way, so copying is not available. Checking every game shows the second player wins: all 18 first rhombi lose. Games last five or six rhombi. The way to win is found by trying, not by a rule, which is why the worksheets put this board after the copying boards.',
      extension: 'The triangle of three is a first-player win whatever the first rhombus. Why must every game there last three rhombi?',
      connection: 'Most positions in most games have no symmetry to use; then who wins is a fact found by search, as the app does here.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 2 (the triangle with four edges on a side).',
    sourceIds: ['blocks-week01e'],
    expect: {winner: 'second', centre: null, firstMoves: 18, winningFirst: 0}
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Hexagon 1, 2, 3', board: B.hex123,
    idea: 'A hexagon with all different sides still has a half turn, about the middle of an edge.',
    prerequisites: 'Puzzles 4 and 7.',
    hints: ['Who wins here, the first player or the second?', 'Find the middle of the board. Which rhombus is its own opposite?', 'Go first with the rhombus across the middle edge, then copy.'],
    parent: {
      notice: 'One first rhombus of 27 wins.',
      prompt: 'How did you find the middle of a board with sides 1, 2 and 3?',
      explanation: 'The hexagon with sides 1, 2, 3, 1, 2, 3 looks the same after a half turn about its centre, which is the middle of an edge: the centre of a hexagon with sides a, b, c is a grid point exactly when a, b and c are all even or all odd. The first player lays the rhombus across that edge and copies; no other first rhombus wins.',
      extension: 'For the hexagon with sides a, b, c: when is the middle a grid point?',
      connection: 'The centre is half of a grid step from a corner, so it is a grid point or the middle of an edge, and the parities of the sides decide which.'
    },
    provenance: 'Week 1 encore grades 4–5 Problem 9 (the hexagon 1, 2, 3, drawn small there).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 27, winningFirst: 1, selfWins: true}
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Five by two', board: B.p52,
    idea: 'An odd side puts an edge in the middle, so the first player wins.',
    prerequisites: 'Puzzles 5 and 6.',
    hints: ['Predict the winner before you play.', 'Is the middle a grid point or the middle of an edge?', 'Go first with the middle rhombus, then copy.'],
    parent: {
      notice: 'Whether your child predicts the winner from the side lengths.',
      prompt: 'How could you tell who wins without playing?',
      explanation: 'One side is odd, so the middle of the 5-by-2 board is the middle of an edge and the first player wins by taking the rhombus across it and copying. Search finds five winning first rhombi in all, the middle one among them.',
      extension: 'Who wins on the 4-by-4 board? (The second player: both sides even.)',
      connection: 'The rule from puzzle 6 applied without playing: parity of the sides decides the centre.'
    },
    provenance: 'Week 1 encore grades 4–5 Problem 9 (the 5-by-2 board).',
    sourceIds: ['blocks-week01e', 'blocks-cram'],
    expect: {winner: 'first', centre: 'edge', firstMoves: 23, winningFirst: 5, selfWins: true}
  }
];

/* ------------------------------------------------------------------ *
 * Fewest blocks
 * ------------------------------------------------------------------ */
const FEWEST = {
  group: 'Fewest blocks', mechanic: 'blockfill', prefix: 'blockfill',
  controls: 'Choose a block: triangle, rhombus, trapezoid or hexagon. Drag across its triangles or tap them one after the other; a hexagon can also go down by tapping a yellow dot. Tap a block to lift it, or Clear to lift them all.',
  rules: budget => [
    'Blocks cover whole triangles, stay inside the board and never overlap.',
    'A triangle covers one triangle, a rhombus two, a trapezoid three and a hexagon six.',
    `Solved when every triangle is covered with at most ${budget} blocks.`
  ]
};
const fewest = [
  {
    number: 1, difficulty_level: 'easy', title: 'The mountain', board: B.tri3, budget: 3,
    idea: 'The hexagon fits, but it leaves three corners that each need a block.',
    prerequisites: 'None. Counting to four.',
    hints: ['Fill it any way, then count the blocks.', 'What is left if the hexagon goes in?', 'Leave the hexagon out: three trapezoids fill it.'],
    parent: {
      notice: 'Many children start with the hexagon, the biggest block, and end with four.',
      prompt: 'You used four with the hexagon. Can you use fewer without it?',
      explanation: 'The only hexagon leaves the three corner triangles apart, so it needs three more blocks: four in all. Three trapezoids fill the mountain, in two ways. Two blocks are too few: only a hexagon and a trapezoid together cover nine triangles, and the hexagon forces four. So three is the fewest.',
      extension: 'What is the most blocks you can use?  (Nine triangles.)',
      connection: 'Greedy choices (the biggest piece first) need not give the best answer.'
    },
    provenance: 'Week 1 encore K–1 Problem 3 (fewest blocks on the mountain).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 3, fillings: 2, greedy: 4}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'The star', board: B.star, budget: 6,
    idea: 'Each of the six points needs its own block, and no block reaches two points.',
    prerequisites: 'None. Counting to seven.',
    hints: ['Fill it any way, then count the blocks.', 'Can one block cover two points of the star?', 'Give each point a block that also reaches into the middle.'],
    parent: {
      notice: 'The hexagon in the middle leaves six points, so seven blocks.',
      prompt: 'How many blocks must the points use, however you fill it?',
      explanation: 'No block covers two points of the star, so the six points need six different blocks. Six is enough when each point’s block also takes part of the middle hexagon: six rhombi do it, and so do mixtures of triangles, rhombi and trapezoids (65 ways in all). The hexagon in the middle gives seven.',
      extension: 'Find a six-block filling that uses a trapezoid.',
      connection: 'A lower bound from pieces that must be different: six points, six blocks.'
    },
    provenance: 'Week 1 encore K–1 Problem 3 (fewest blocks on the star).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 6, fillings: 65, greedy: 7}
  },
  {
    number: 3, difficulty_level: 'medium', title: 'The boat', board: B.boat, budget: 5,
    idea: 'A hexagon helps only where it leaves room for trapezoids.',
    prerequisites: 'Counting to six.',
    hints: ['Try the hexagon in different places.', 'Where can the hexagon go so that trapezoids fill the rest?', 'Put the hexagon just under the top point.'],
    parent: {
      notice: 'There is exactly one way with five blocks.',
      prompt: 'Which places for the hexagon left room for trapezoids?',
      explanation: 'The hexagon fits in three places. Just under the top point, it leaves one triangle at the top and three trapezoids below: five blocks, the only five-block filling. In the other two places the best is six. Without a hexagon, 16 triangles need at least six blocks of at most three.',
      extension: 'What is the most blocks you can use? (Sixteen triangles.)',
      connection: 'A bound by area: blocks of at most three triangles need at least a third of the triangles, rounded up.'
    },
    provenance: 'Week 1 encore K–1 Problem 6 (the boat).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 5, fillings: 1, hexPlaces: 3}
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Triangle of four', board: B.tri4, budget: 5,
    idea: 'Only one hexagon fits, and then area decides.',
    prerequisites: 'Counting to 16, or puzzle 1.',
    hints: ['How many hexagons can fit at once?', 'With one hexagon, ten triangles are left. How few blocks can cover ten?', 'One hexagon, three trapezoids and one triangle.'],
    parent: {
      notice: 'Always one hexagon, three trapezoids and one triangle.',
      prompt: 'Why can’t two hexagons fit?',
      explanation: 'Any two hexagons in the triangle of four overlap, so at most one fits. Without one, 16 triangles need at least six blocks. With one, ten triangles are left, which need at least four blocks of at most three: five in all, and three ways reach it.',
      extension: 'Can you do it with the hexagon in the other two places?',
      connection: 'The fewest is at least h + ⌈(N − 6h)/3⌉ with h hexagons on N triangles; the best h is not always the most.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 3 (the triangle with four edges on a side).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 5, fillings: 3, maxHexagons: 1}
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Hexagon of two', board: B.hex222, budget: 6,
    idea: 'The hexagon in the middle is a trap: three hexagons round the edge do better.',
    prerequisites: 'Counting to 24, or puzzle 3.',
    hints: ['Try a hexagon in the middle first. How many blocks?', 'How many hexagons can fit at once?', 'Three hexagons and three rhombi.'],
    parent: {
      notice: 'The middle hexagon leads to seven; six needs three hexagons.',
      prompt: 'With the hexagon in the middle, what is left?',
      explanation: 'The middle hexagon leaves a ring of 18 triangles that six trapezoids fill: seven blocks. With one or two hexagons the best is seven too. Three hexagons fit in two ways, each leaving three rhombi: six blocks, and no four hexagons fit.',
      extension: 'Why does every possible hexagon cover 2 or 6 of the six middle triangles?',
      connection: 'The first move that looks best can rule out the best answer.'
    },
    provenance: 'Week 1 encore K–1 Problem 6 and grades 2–3 Problem 3 (the hexagon with sides 2).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 6, fillings: 2, maxHexagons: 3, middle: 7}
  },
  {
    number: 6, difficulty_level: 'hard', title: 'Triangle of six', board: B.tri6, budget: 9,
    idea: 'Four hexagons fit, but three give fewer blocks.',
    prerequisites: 'Puzzles 4 and 5.',
    hints: ['How many hexagons can fit at once? How many blocks does that give?', 'Try one hexagon fewer.', 'Three hexagons and six trapezoids.'],
    parent: {
      notice: 'Fitting the most hexagons (four) gives ten blocks; nine needs three.',
      prompt: 'With four hexagons in, what shapes are left over?',
      explanation: 'Four hexagons fit the triangle of six in only one way, and the twelve triangles left fall apart into pieces that need six more blocks: ten. Three hexagons and six trapezoids fill it with nine, in two ways. Fewer than nine is impossible: the bound h + ⌈(36 − 6h)/3⌉ is 12, 11, 10 and 9 for 0 to 3 hexagons, and four hexagons give ten.',
      extension: 'What is the fewest for the triangle of five?',
      connection: 'The most of the biggest piece and the fewest pieces are different questions.'
    },
    provenance: 'New, extending Week 1 encore grades 2–3 Problems 3 and 6 to a larger triangle.',
    sourceIds: ['blocks-week01e', 'blocks-review'],
    expect: {fewest: 9, fillings: 2, maxHexagons: 4, greedyMost: 10}
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Hexagon of three', board: B.hex333, budget: 12,
    idea: 'Seven hexagons fit, but the fewest uses six.',
    prerequisites: 'Puzzles 5 and 6. Patience: 54 triangles.',
    hints: ['How many hexagons can you fit? What is left?', 'Seven hexagons leave pieces too small for trapezoids.', 'Six hexagons and six trapezoids.'],
    parent: {
      notice: 'Seven hexagons fit in two ways and give 13 or 19 blocks.',
      prompt: 'After seven hexagons, why can’t trapezoids fill what is left?',
      explanation: 'Seven hexagons leave six gaps of two triangles (13 blocks) or twelve single triangles (19). With h hexagons the rest needs at least ⌈(54 − 6h)/3⌉ blocks, so h ≤ 6 gives at least 18 − h, which is 12 at h = 6. Six hexagons and six trapezoids reach 12, in two ways, a sixth of a turn apart.',
      extension: 'Can you find both twelve-block fillings?',
      connection: 'A bound plus a filling that meets it proves the fewest, the same shape of argument as Rhombus gardens’ dots.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 6 and grades 4–5 Problem 10 (the hexagon with sides 3).',
    sourceIds: ['blocks-week01e'],
    expect: {fewest: 12, fillings: 2, maxHexagons: 7, greedyMost: 13}
  }
];

/* ------------------------------------------------------------------ *
 * Red trapezoids
 * ------------------------------------------------------------------ */
const RED = {
  group: 'Red trapezoids', mechanic: 'redfill', prefix: 'redfill',
  lay: 'Drag across three triangles to lay a trapezoid, or tap them one after the other. Tap a trapezoid to lift it.',
  rules: ['A trapezoid covers three triangles in a row.', 'Pieces stay inside the board and never overlap.', 'A trapezoid points up when two of its triangles point up, and down when two point down. The counts above the board show how many of each.']
};
const reds = [
  {
    number: 1, difficulty_level: 'easy', title: 'Red arrow', board: B.arrow, mode: 'fill',
    idea: 'Some shapes can be filled with trapezoids and some cannot.',
    prerequisites: 'None once the move is shown.',
    hints: ['Start at a pointed corner.', 'A corner triangle has few neighbours. Which trapezoid covers it?', 'Four trapezoids fill it.'],
    parent: {
      notice: 'The arrow can be filled, in three ways.',
      prompt: 'How did you know where the first trapezoid had to go?',
      explanation: 'The arrow has 12 triangles, so four trapezoids could cover it, and they do, in three ways. Each way has two trapezoids pointing up and two pointing down.',
      extension: 'Find all three ways.',
      connection: 'Fillable or not is the first question about any board; the next puzzles show two ways to be sure it cannot be done.'
    },
    provenance: 'Week 1 encore K–1 Problem 5 (the arrow, with reds).',
    sourceIds: ['blocks-week01e'],
    expect: {fillings: 3, possible: true}
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Red ramp', board: B.ramp, mode: 'fill',
    idea: 'A board that rhombi cannot fill can still take trapezoids.',
    prerequisites: 'None.',
    hints: ['Start at the narrow end.', 'Look along the bottom row.', 'Five trapezoids fill it.'],
    parent: {
      notice: 'Five trapezoids fill it, in five ways; rhombi never can.',
      prompt: 'Could rhombi fill this ramp? Count the triangles pointing up and pointing down.',
      explanation: 'The ramp has 15 triangles, nine pointing up and six down. Five trapezoids fill it, and every filling has four pointing up and one pointing down. Rhombi cannot: each covers one up and one down, and the counts differ.',
      extension: 'How many trapezoids point down in each of the five ways?',
      connection: 'Counting ups and downs settles questions for rhombi and, as puzzle 8 shows, for trapezoids too.'
    },
    provenance: 'Week 1 encore K–1 Problem 5 (the trapezoid board: five reds, and no blues).',
    sourceIds: ['blocks-week01e'],
    expect: {fillings: 5, possible: true, kinds: [4, 1]}
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Red hexagon', board: B.hex212, mode: 'fill',
    idea: 'A count can prove a filling impossible.',
    prerequisites: 'Counting to 16; threes.',
    hints: ['Fill as much as you can. Is a triangle always left over?', 'Count the triangles. Each trapezoid covers three.', 'Sixteen is not a number of threes. Press Can’t.'],
    parent: {
      notice: 'Every try leaves one triangle over.',
      prompt: 'How many triangles are there? Can trapezoids of three make that many?',
      explanation: 'The hexagon has 16 triangles. Trapezoids cover three each, so any filling covers a multiple of three triangles, and 16 is not one. No filling exists, whatever the shape. (Eight rhombi fill it, in six ways.)',
      extension: 'Which board on this page could you change by one triangle so that trapezoids fit?',
      connection: 'An invariant: the number of triangles covered is always a multiple of three.'
    },
    provenance: 'Week 1 encore K–1 Problem 5 (the hexagon 2, 1, 2: reds X).',
    sourceIds: ['blocks-week01e'],
    expect: {fillings: 0, possible: false, cells: 16}
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Two ways', board: B.tri3, mode: 'every',
    idea: 'The mountain takes trapezoids in two ways, mirror images.',
    prerequisites: 'None.',
    hints: ['Fill it, then press Clear and fill it another way.', 'Look at the top corner. Which trapezoids can cover it?', 'There are two ways, mirror images of each other.'],
    parent: {
      notice: 'Both ways have three trapezoids pointing up and none down.',
      prompt: 'How do you know there isn’t a third way?',
      explanation: 'The top triangle is covered by a trapezoid running down the left side or the right side; either choice fills the rest one way. So there are two fillings, mirror images. Each has three trapezoids pointing up: the mountain has six up triangles and three down, so every trapezoid must take two ups.',
      extension: 'Why must every trapezoid here point up?',
      connection: 'With two ups for every down, no trapezoid can take two downs.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 4 (the triangle board: every red filling).',
    sourceIds: ['blocks-week01e'],
    expect: {fillings: 2, kinds: [3, 0]}
  },
  {
    number: 5, difficulty_level: 'hard', title: 'Nine ways', board: B.hex222, mode: 'every',
    idea: 'An outer ring and a middle: three rings times three ways to cut the middle.',
    prerequisites: 'Keeping track of a list. Puzzle 4.',
    hints: ['Fill it, then press Clear and find another.', 'Is the middle hexagon always made of two trapezoids?', 'The ring round the middle can go three ways, and the middle can be cut three ways.'],
    parent: {
      notice: 'Every filling has four trapezoids pointing up and four pointing down.',
      prompt: 'How can you be sure you have them all?',
      explanation: 'The six triangles round the middle point always end up as two trapezoids making a hexagon, which can be cut three ways. The ring of 18 triangles outside it can be filled three ways (two pinwheels turning opposite ways, and one frame). Three times three is nine. Turned or flipped copies count as different here; up to turning there are three, one per ring.',
      extension: 'Why does every filling have four of each kind? (Twelve ups and twelve downs.)',
      connection: 'Counting by cases: a structure (ring and middle) turns a list into a product.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 4 and grades 4–5 Problem 7 (every red filling of the hexagon with sides 2).',
    sourceIds: ['blocks-week01e', 'blocks-review'],
    expect: {fillings: 9, kinds: [4, 4]}
  },
  {
    number: 6, difficulty_level: 'easy', title: 'Odd way home', board: B.hex222, mode: 'home',
    idea: 'Two trapezoids that make a hexagon can be cut three ways, so three moves come back.',
    prerequisites: 'Puzzle 5 helps. Telling odd from even.',
    hints: ['Tap two trapezoids that fit together to re-cut them.', 'Which two trapezoids make a hexagon?', 'Re-cut the middle hexagon three times.'],
    parent: {
      notice: 'Only the two trapezoids in the middle can be re-cut on this board.',
      prompt: 'Rhombus flips can never come back in an odd number. Why can trapezoids?',
      explanation: 'A move picks up two trapezoids and lays them back a different way. Two trapezoids that make a hexagon can be cut three ways, so cutting the middle hexagon three times returns to the start: three moves, an odd number. Rhombus fillings cannot do this: each flip adds or takes away one cube, so a way back has as many of each and is even (Proofs, the flip-map puzzles).',
      extension: 'Can the outer ring ever change by moves of two trapezoids? (No: no two ring trapezoids make a hexagon.)',
      connection: 'An odd cycle in the move graph; the rhombus flip graph has none because it is bipartite.'
    },
    provenance: 'Week 1 encore grades 4–5 Problem 8 (moves that pick up two trapezoids; an odd way back).',
    sourceIds: ['blocks-week01e', 'blocks-review'],
    expect: {homeLength: 3, rings: 3}
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Three pointing down', board: B.tri6, mode: 'kind', down: 3,
    idea: 'Fill a big triangle and count how many trapezoids point down.',
    prerequisites: 'Puzzle 4. Patience: twelve trapezoids.',
    hints: ['Fill the triangle any way, and watch the counts above it.', 'Change a few trapezoids. Do the counts change?', 'Any filling has three pointing down.'],
    parent: {
      notice: 'However the triangle is filled, three trapezoids point down.',
      prompt: 'Did the number pointing down ever change?',
      explanation: 'Any filling works: all 220 fillings of the triangle of six have three trapezoids pointing down and nine pointing up. Puzzle 8 asks why.',
      extension: 'Try to make four point down.',
      connection: 'The first sight of an invariant: a number that stays the same however the board is filled.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 7 (the triangle with six edges on a side: the most two-down reds).',
    sourceIds: ['blocks-week01e'],
    expect: {fillings: 220, possible: true, kinds: [9, 3]}
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Four pointing down', board: B.tri6, mode: 'kind', down: 4,
    idea: 'Ups and downs fix how many trapezoids of each kind every filling uses.',
    prerequisites: 'Puzzle 7. Counting to 36.',
    hints: ['Try to fill it with four pointing down.', 'Count the triangles pointing up and pointing down: 21 and 15.', 'Each trapezoid pointing up takes one more up than down. Press Can’t.'],
    parent: {
      notice: 'Every filling has exactly three pointing down, so four is impossible.',
      prompt: 'Each trapezoid pointing up uses one more up triangle than down. How many more ups than downs does the whole triangle have?',
      explanation: 'The triangle of six has 21 triangles pointing up and 15 down. A trapezoid pointing up covers one more up than down; one pointing down covers one more down than up. So (pointing up) − (pointing down) = 21 − 15 = 6, and (pointing up) + (pointing down) = 36 ÷ 3 = 12. That makes nine up and three down in every filling, so four down is impossible.',
      extension: 'For a triangle with 3k edges on a side, how many trapezoids point down?',
      connection: 'An invariant from weights: count each up triangle +1 and each down triangle −1. A trapezoid weighs +1 or −1 by its kind, and the board weighs 6, whatever the filling.'
    },
    provenance: 'Week 1 encore grades 2–3 Problem 7, posed as the review card asks: “fill triangle 6 with 4 two-down” is impossible.',
    sourceIds: ['blocks-week01e', 'blocks-review'],
    expect: {fillings: 220, possible: false, kinds: [9, 3]}
  }
];

/* ------------------------------------------------------------------ *
 * Checks of the authored claims
 * ------------------------------------------------------------------ */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function mostHexagons(g) {
  const hexes = placements(g, 'hexagon');
  let best = [];
  const packs = [];
  (function rec(i, chosen, taken) {
    if (chosen.length > best.length) { best = [...chosen]; packs.length = 0; }
    if (chosen.length === best.length) packs.push([...chosen]);
    for (let j = i; j < hexes.length; j++) {
      if (hexes[j].some(c => taken.has(c))) continue;
      hexes[j].forEach(c => taken.add(c)); chosen.push(hexes[j]);
      rec(j + 1, chosen, taken);
      chosen.pop(); hexes[j].forEach(c => taken.delete(c));
    }
  })(0, [], new Set());
  return {most: best.length, packs};
}
const bestKeeping = (g, start) => { for (let k = start.length; k <= g.cells.length; k++) if (fillWithin(g, start, k)) return k; return null; };
function checkDuel(p) {
  const g = gridOf(p.board), e = p.expect, fail = msg => { throw Error(`Duel ${p.number}: ${msg}`); };
  if (g.cells.length > DUEL_LIMIT) fail('board too big to solve');
  const first = toMoveWins(g, []), turn = halfTurn(g), wins = winningSpots(g, []);
  if ((first ? 'first' : 'second') !== e.winner) fail(`${first ? 'first' : 'second'} player wins`);
  if ((turn?.centre ?? null) !== e.centre) fail(`centre ${turn?.centre}`);
  if (openSpots(g, []).length !== e.firstMoves || wins.length !== e.winningFirst) fail(`${wins.length} of ${openSpots(g, []).length} first rhombi win`);
  if (p.number === 7 && duelPositions(g) <= 160000) fail('the search is smaller than the notes say');
  if (e.selfWins && !wins.some(s => pieceKey(turnedPiece(g, s)) === pieceKey(s))) fail('the middle rhombus does not win');
  // The copy rule: on a point-centre board no rhombus is its own copy.
  if (e.centre === 'point' && openSpots(g, []).some(s => turnedPiece(g, s).some(c => s.includes(c)))) fail('a rhombus meets its copy');
}
function checkFewest(p) {
  const g = gridOf(p.board), e = p.expect, fail = msg => { throw Error(`Fewest ${p.number}: ${msg}`); };
  const best = fewestOf(g);
  if (best !== e.fewest || p.budget !== best) fail(`fewest ${best}`);
  const all = fillingsWith(g, best);
  if (all.length !== e.fillings) fail(`${all.length} fewest fillings`);
  const {most, packs} = mostHexagons(g);
  if (e.maxHexagons !== undefined && most !== e.maxHexagons) fail(`${most} hexagons fit`);
  if (e.greedy !== undefined && (most !== 1 || bestKeeping(g, packs[0]) !== e.greedy)) fail('the hexagon trap');
  if (e.greedyMost !== undefined && Math.min(...packs.map(pk => bestKeeping(g, pk))) !== e.greedyMost) fail('the most-hexagons trap');
  if (e.hexPlaces !== undefined && placements(g, 'hexagon').length !== e.hexPlaces) fail('hexagon places');
  if (e.middle !== undefined) {
    const k = g.points.findIndex((_, j) => g.around[j].length === 6 && Math.hypot(g.xy[j][0] - g.centre.reduce((s, c) => s + c[0], 0) / g.cells.length, g.xy[j][1] - g.centre.reduce((s, c) => s + c[1], 0) / g.cells.length) < 1e-6);
    if (bestKeeping(g, [sortPiece(g.around[k])]) !== e.middle) fail('the middle hexagon');
  }
}
function checkRed(p) {
  const g = gridOf(p.board), e = p.expect, fail = msg => { throw Error(`Red ${p.number}: ${msg}`); };
  const all = covers(g, 'trapezoid'), counts = new Set(all.map(t => JSON.stringify(kindsOf(g, t))));
  if (all.length !== (e.fillings ?? all.length)) fail(`${all.length} fillings`);
  if (counts.size > 1) fail('the kinds differ between fillings');
  if (e.kinds && all.length && !same(Object.values(kindsOf(g, all[0])), e.kinds)) fail(`kinds ${JSON.stringify(kindsOf(g, all[0]))}`);
  const {up, down} = upsAndDowns(g);
  if (all.length && e.kinds && (e.kinds[0] - e.kinds[1] !== up - down || e.kinds[0] + e.kinds[1] !== g.cells.length / 3)) fail('the count argument');
  if (e.cells !== undefined && (g.cells.length !== e.cells || g.cells.length % 3 === 0)) fail('the triangle count');
  if (p.mode === 'kind') {
    const possible = all.some(t => kindsOf(g, t).down === p.down);
    if (possible !== e.possible) fail(`possible ${possible}`);
  } else if (p.mode === 'fill' && (all.length > 0) !== e.possible) fail('possible');
  if (p.mode === 'home') {
    const start = all[0], pairs = hexagonPairs(g, start);
    if (pairs.length !== 1) fail(`${pairs.length} hexagon pairs`);
    // Every filling keeps a ring round the middle hexagon; the ring never changes by re-cuts.
    const middle = new Set(pairs[0].flatMap(k => k.split('.').map(Number)));
    const rings = new Set(all.map(t => tilingKey(t.filter(piece => !piece.every(c => middle.has(c))))));
    if (rings.size !== e.rings) fail(`${rings.size} rings`);
    // The shortest odd way back, over fillings paired with the parity of the steps.
    const seen = new Map([[`${tilingKey(start)}|0`, 0]]), queue = [[start, 0]];
    for (let i = 0; i < queue.length; i++) {
      const [now, parity] = queue[i], d = seen.get(`${tilingKey(now)}|${parity}`);
      for (const pair of hexagonPairs(g, now)) {
        const next = recut(g, now, ...pair), k = `${tilingKey(next)}|${parity ^ 1}`;
        if (!seen.has(k)) { seen.set(k, d + 1); queue.push([next, parity ^ 1]); }
      }
    }
    if (seen.get(`${tilingKey(start)}|1`) !== e.homeLength) fail(`odd way home ${seen.get(`${tilingKey(start)}|1`)}`);
    p.start = start;
  }
}

/* ------------------------------------------------------------------ *
 * The pack
 * ------------------------------------------------------------------ */
const entry = (kind, p, extra) => ({
  id: `${kind.prefix}-${String(p.number).padStart(2, '0')}`, number: p.number, title: p.title, band: 'all', difficulty_level: p.difficulty_level,
  mechanic: kind.mechanic, libraryFamily: 'rhombus', group: kind.group, familyTitle: 'Rhombus gardens', revision: 1,
  ...extra,
  idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
  parent: {...p.parent, sourceIds: p.sourceIds}, provenance: p.provenance, sourceDocument: 'docs/blocks/README.md'
});
const puzzles = [
  ...duels.map(p => { checkDuel(p); return entry(DUEL, p, {parameters: {board: p.board}, objective: DUEL.objective, visibleObjective: DUEL.visibleObjective, instruction: DUEL.objective, controls: DUEL.controls, rules: DUEL.rules}); }),
  ...fewest.map(p => {
    checkFewest(p);
    const objective = `Fill the board with at most ${p.budget} blocks.`;
    return entry(FEWEST, p, {parameters: {board: p.board, budget: p.budget}, objective, visibleObjective: `Fill it with ${p.budget} blocks.`, instruction: objective, controls: FEWEST.controls, rules: FEWEST.rules(p.budget)});
  }),
  ...reds.map(p => {
    checkRed(p);
    const q = {mode: p.mode, board: p.board, ...(p.mode === 'kind' ? {down: p.down} : {}), ...(p.mode === 'home' ? {start: p.start.map(sortPiece)} : {})};
    const objective = {
      fill: 'Fill the board with trapezoids, or press Can’t if it can’t be done.',
      every: 'Find every way to fill the board with trapezoids, then press That’s all.',
      kind: `Fill the board with trapezoids so that ${p.down} of them point down, or press Can’t if it can’t be done.`,
      home: 'Change the filling and come back to ⚑ after an odd number of moves. A move picks up two trapezoids and lays them back a different way.'
    }[p.mode];
    const visible = {fill: 'Fill it with trapezoids, or press Can’t.', every: 'Find every way to fill it.', kind: `Make ${p.down} point down, or press Can’t.`, home: 'Come back to ⚑ in an odd number of moves.'}[p.mode];
    const controls = {
      fill: `${RED.lay} Clear lifts them all. Press Can’t if no filling exists.`,
      kind: `${RED.lay} Clear lifts them all. Press Can’t if no filling has that many pointing down.`,
      every: `${RED.lay} Each way you fill the board joins the row below. Clear lifts every trapezoid. Press That’s all when you have every way.`,
      home: 'Tap a trapezoid, then another that makes a hexagon with it, to cut that hexagon the next way round. Start again goes back to ⚑.'
    }[p.mode];
    const rules = {
      fill: [...RED.rules, 'Solved when every triangle is covered, or when you press Can’t and no filling exists.'],
      kind: [...RED.rules, `Solved when every triangle is covered with ${p.down} pointing down, or when you press Can’t and no filling does that.`],
      every: [...RED.rules, 'Two ways are different when any trapezoid lies in a different place. The board never turns.', 'Solved when you press That’s all with every way found.'],
      home: [...RED.rules, 'Two trapezoids that make a hexagon can be cut three ways. A move re-cuts one such hexagon.', 'Solved when the board matches ⚑ again after an odd number of moves.']
    }[p.mode];
    return entry(RED, p, {parameters: q, objective, visibleObjective: visible, instruction: objective, controls, rules});
  })
];

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/blocks/blocks.json', import.meta.url), `${JSON.stringify(pack, null, 1)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
