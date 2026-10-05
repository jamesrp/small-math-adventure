// Builds dist/families/paint/paint.json, the Paint rows family, from the
// authoring list below. Each puzzle's fewest cards, or the two starts that can
// never become one, are computed here with the module's own search
// (dist/families/paint/paint.js) and checked again by
// scripts/validate-paint.mjs with a separate simulator.
// Design notes and sources: docs/paint/README.md.
import {writeFile} from 'node:fs/promises';
import {shortest, startsOf, apart} from '../dist/families/paint/paint.js';

const WEEK46 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-46';
export const sources = [
  {id: 'paint-week46', title: 'Bellingham Math Circle — Week 46: Two boards forget their starts, packets, bonus pages (Boards that forget) and adult guides', url: WEEK46, kind: 'local curriculum'},
  {id: 'paint-lpw', title: 'D. A. Levin, Y. Peres and E. L. Wilmer, Markov Chains and Mixing Times: the coupling for the lazy random walk on the hypercube, where every copy of the walk refreshes the same coordinate with the same bit, and copies agree once every coordinate has been refreshed', url: 'https://pages.uoregon.edu/dlevin/MARKOV/', kind: 'research'},
  {id: 'paint-cftp', title: 'J. G. Propp and D. B. Wilson, Exact sampling with coupled Markov chains (1996): run every start with the same random moves until all of them agree (coupling from the past)', url: 'https://en.wikipedia.org/wiki/Coupling_from_the_past', kind: 'research'}
];
// The rules for each kind of card, shown only in puzzles that have that kind.
const EVERY = 'Every card acts on every row at once.';
const KINDS = [
  [c => /[YB]/.test(c) && c.length > 1 && c[0] !== 'C', 'A paint card makes its tiles yellow or blue, whatever they showed before.'],
  [c => c.includes('F'), 'A turn card turns its tiles over: yellow becomes blue and blue becomes yellow.'],
  [c => c[0] === 'C', 'A copy card gives one tile’s colour to another, in each row.'],
  [c => c === '<', 'The shift card moves every tile one place left, and the first tile round to the end.']
];
const DONE = 'The rows are done when they all look the same.', DONE_GOAL = 'The rows are done when every row looks like the goal.';
const BUDGET = 'The outlines under the rows show how many cards you may play.';
const CANT = 'Can’t says two rows on the table can never become one, whatever cards you play. Press it, then tap the two rows. A wrong claim is refused.';
const RULES = [EVERY, ...KINDS.map(k => k[1]), DONE];
export const family = {
  id: 'paint',
  title: 'Paint rows',
  mathematics: 'Cards act on every row at once. Once a tile is painted, every row shows the same colour there, and no later card can make the rows differ at that tile again, so two rows need exactly one paint card for each tile where they differ (their Hamming distance). A run of paint and turn cards makes every start finish alike exactly when it paints every tile; with u tiles never painted, the 2^n starts finish as 2^u different rows. Turn cards and the shift are one-to-one, so on their own they never join two rows; copies never change an all-yellow or all-blue row, so copies alone never join those two. With turns mixed in, a painted tile finishes as its last paint, turned over once for each later turn. Painting tile 1 and shifting joins every start in 2n − 1 cards and no fewer. This is the coupling behind the lazy random walk on the hypercube and behind coupling from the past.',
  rules: RULES,
  sourceIds: sources.map(s => s.id)
};
const rulesFor = q => [EVERY, ...KINDS.filter(([has]) => q.hand.some(has)).map(k => k[1]), q.target ? DONE_GOAL : DONE, ...(q.budget ? [BUDGET] : []), ...(q.cant ? [CANT] : [])];
const controlsFor = q => `Tap a card to play it on every row. Undo takes it back.${q.cant ? ' If two rows can never become one, press Can’t and tap them both.' : ''}`;
const MATCH = 'Make the rows match.', GOAL = 'Make every row look like the goal.';
const SINGLE = n => Array.from({length: n}, (_, i) => ['Y', 'B'].map(c => Array.from({length: n}, (_, j) => j === i ? c : '.').join(''))).flat();

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Three differences',
    parameters: {slots: 3, rows: ['YBY', 'BYB'], hand: SINGLE(3), budget: 3},
    idea: 'One paint card fixes one tile, and these rows differ at all three.',
    prerequisites: 'Tell yellow from blue and compare two rows tile by tile.',
    hints: ['Look at one tile at a time. Do the two rows show the same colour there?', 'A card changes the same tile in both rows.', 'Paint each tile once, any colour.'],
    parent: {
      notice: 'Whether your child plays a card at a tile where the rows already match.',
      prompt: 'Could two cards ever be enough here?',
      explanation: 'A paint card changes only one tile, and it leaves both rows the same colour there. These rows differ at all three tiles, so they need three cards, and any three that paint each tile once will do.',
      extension: 'Make up two rows that need just one card.',
      connection: 'The fewest cards is the number of tiles where the rows differ, their Hamming distance.'
    },
    provenance: 'Week 46 shared launch and K–1 Problem 1, 2–3 Problem 1 (RBR and BRB), with yellow and blue for red and blue.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Every start',
    parameters: {slots: 3, rows: 'all', hand: SINGLE(3), budget: 3},
    idea: 'Each newly painted tile halves the different rows, 8 to 4 to 2 to 1; painting a tile twice gains nothing.',
    prerequisites: 'Three differences.',
    hints: ['Here are all eight rows of three tiles. Play a card and watch them.', 'A tile you have painted is the same in every row.', 'Paint each tile once.'],
    parent: {
      notice: 'Whether your child sees the rows join in stacks of 2, then 4, then 8.',
      prompt: 'After two cards, how many different rows are left?',
      explanation: 'Every start is here. A painted tile shows the same colour in every row, so the rows only differ at tiles not painted yet. With u tiles unpainted there are 2^u different rows: 8, 4, 2, 1. Three cards, one for each tile, are the fewest that make every start alike.',
      extension: 'Which three cards make every row finish blue, yellow, blue?',
      connection: 'A run of cards that sends every start to the same row has forgotten where it started. In probability this is a coupling: the lazy random walk on the hypercube forgets its start once every coordinate has been refreshed.'
    },
    provenance: 'Week 46 grades 2–3 Problems 2 and 5, grades 4–5 Problems 2 and 3 (stories that make every pair of starts agree), shown with all eight starts at once.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'One tile only turns',
    parameters: {slots: 3, rows: 'all', hand: ['Y..', 'F..', '.F.', '..B', '..F'], cant: true},
    idea: 'A turn card keeps every difference, so rows that differ at a tile no card paints never become one.',
    prerequisites: 'Every start.',
    hints: ['Play each card once and watch the stacks.', 'Rows join only where a tile is painted. Which tile has no paint card?', 'Two rows that differ at tile 2 can never become one. Press Can’t and tap them both.'],
    parent: {
      notice: 'Whether your child sees that turn cards move the stacks around without ever joining two.',
      prompt: 'Which two rows can never become one, and why?',
      explanation: 'Painting tiles 1 and 3 leaves two stacks of four, one yellow and one blue at tile 2. The only card for tile 2 turns it over in every row, so those two stacks swap colours there and stay apart. Rows that differ at tile 2 never become one.',
      extension: 'Add one card so that every start can become one row.',
      connection: 'A turn is a one-to-one change of rows, so it can never join two different rows. With paint and turn cards mixed, every start finishes alike exactly when every tile gets at least one paint card.'
    },
    provenance: 'Week 46 grades 2–3 Problems 6 and 7 and grades 4–5 Problems 4 and 5 (shared toggles never erase a disagreement; every slot needs a setting instruction), on every start.'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'One picture',
    parameters: {slots: 3, rows: 'all', target: 'BYB', hand: ['Y..', '.Y.', '..Y', 'F..', '..F'], budget: 5, cant: true},
    idea: 'A painted tile ends as its last paint, turned over once for each later turn; a turn before the paint is wasted.',
    prerequisites: 'Every start.',
    hints: ['There are no blue paint cards. How can a tile end blue?', 'A turn before a paint is painted over.', 'Paint tile 1 yellow, then turn it.'],
    parent: {
      notice: 'Whether your child plays a turn card first, then sees the paint wipe it out.',
      prompt: 'In what order must the cards for tile 1 go?',
      explanation: 'Tile 2 needs one yellow paint. Tiles 1 and 3 must end blue, and the only paint is yellow, so each needs its yellow paint and then its turn. A turn played before the paint does nothing to the finish. Five cards, with each turn after its paint.',
      extension: 'Make every row end yellow, blue, yellow with these cards.',
      connection: 'The last paint fixes a tile’s colour for every start; later turns change it in a known way.'
    },
    provenance: 'Week 46 grades 4–5 Problem 5 (a slot’s final colour is its last assigned colour flipped once per later toggle), on every start with a goal row.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Two rows, one picture',
    parameters: {slots: 4, rows: ['YBYB', 'YYBB'], target: 'BBYB', hand: ['F...', '.Y..', '.F..', '..Y.', '...Y', '...F'], budget: 4},
    idea: 'Where two rows already match, a turn card can fix them; where they differ, only a paint can.',
    prerequisites: 'One picture.',
    hints: ['Tile 1 has no paint card. Do these two rows need one there?', 'The rows match at tile 1, so turning it turns both to blue.', 'Turn tile 1, paint tile 2 yellow then turn it, and paint tile 3 yellow.'],
    parent: {
      notice: 'Whether your child uses the turn card on tile 1, where both rows show yellow.',
      prompt: 'Would these cards work with every start on the table?',
      explanation: 'Tile 1 is yellow in both rows, so one turn makes both blue. Tile 2 differs, and its only paint is yellow, so it needs the paint and then a turn. Tile 3 differs and one yellow paint fixes it. Tile 4 is right already. Four cards. With every start on the table, tile 1 would differ and nothing could fix it.',
      extension: 'Which cards here are never useful?',
      connection: 'Turns can fix tiles where the rows already agree; only paint can make rows agree.'
    },
    provenance: 'New for the app: contrasts puzzle 4 (every start) with two particular rows, after Week 46 grades 2–3 Problems 3 and 7.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Copies only',
    parameters: {slots: 3, rows: 'all', hand: ['C12', 'C23', 'C31'], cant: true},
    idea: 'A copy moves a colour inside each row, so an all-yellow row and an all-blue row never change.',
    prerequisites: 'Every start.',
    hints: ['Play a copy card and watch the all-yellow row.', 'A copy can only use colours already in the row.', 'The all-yellow and all-blue rows can never become one. Press Can’t and tap them both.'],
    parent: {
      notice: 'Whether your child keeps playing copies, hoping the last two stacks will join.',
      prompt: 'What does a copy do to the row that is all yellow?',
      explanation: 'A copy takes a colour from inside each row. A row that is all yellow has only yellow to copy, so it stays all yellow, and an all-blue row stays all blue. Two copies leave just those two stacks of four, and no copy ever joins them.',
      extension: 'Which other pairs of starts can never become one? (Rows that differ at every tile.)',
      connection: 'Copies keep two rows that differ at every tile differing at every tile, so joining every start needs a card that brings in a colour from outside: a paint card.'
    },
    provenance: 'Week 46 bonus Problem 1 (COPY i to j; RRR and BBB cannot match using any number of copies), with three of the six copies.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'One paint and copies',
    parameters: {slots: 3, rows: 'all', hand: ['.B.', 'C12', 'C23', 'C31'], budget: 3, cant: true},
    idea: 'One paint card brings in a colour from outside, and copies carry it to every tile, if they go the right way round.',
    prerequisites: 'Copies only.',
    hints: ['Which card has to come first?', 'Once tile 2 is painted, never copy onto it. Copy it onward.', 'Tile 2 blue, copy tile 2 to tile 3, then copy tile 3 to tile 1.'],
    parent: {
      notice: 'Whether your child paints first, and then copies away from the painted tile.',
      prompt: 'Why can the copy from tile 1 to tile 2 not help here?',
      explanation: 'Only the paint card makes a tile the same in every row, so it comes first, on tile 2. A copy onto tile 2 would bring back the old colours there, so the copies must carry tile 2 onward: to tile 3, then from tile 3 to tile 1. That is the only order with three cards.',
      extension: 'If the paint card painted tile 1 instead, which order would work?',
      connection: 'One paint card joins every start exactly when the copies can carry its tile’s colour to every tile, following the arrows (Week 46 bonus guide, Problem 1).'
    },
    provenance: 'Week 46 bonus Problem 1 (copies and one reset; the shortest story has three instructions) and its extension (one reset works exactly when the reset site reaches every site), with a new menu.'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Paint and shift',
    parameters: {slots: 3, rows: 'all', hand: ['Y..', '<'], budget: 5, cant: true},
    idea: 'Only tile 1 can be painted; the shift brings each tile to the front in turn.',
    prerequisites: 'Every start.',
    hints: ['Only tile 1 can be painted. How can paint reach the other tiles?', 'After a shift, the painted tile sits at the end and a new tile is at the front.', 'Paint, shift, paint, shift, paint.'],
    parent: {
      notice: 'Whether your child shifts first, or paints twice in a row, and finds it wastes a card.',
      prompt: 'Why does the story start and end with a paint card?',
      explanation: 'Every tile needs painting, and only the front tile can be painted, so three paints with a shift between each two: five cards. A shift at the start or the end only moves the rows around, and two paints in a row paint the same tile. Paint, shift, paint, shift, paint is the only five-card story.',
      extension: 'Puzzle 9 has four tiles. How many cards will it need?',
      connection: 'With n tiles this takes 2n − 1 cards and the shortest story is unique; the shift on its own is one-to-one, so it never joins rows.'
    },
    provenance: 'Week 46 bonus Problem 3 (S: slot 1 becomes red; T: every colour moves one place left and the first to the end; STSTS is the shortest), with yellow for red.'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Paint and shift, four tiles',
    parameters: {slots: 4, rows: 'all', hand: ['Y...', '<'], budget: 7, cant: true},
    idea: 'Four tiles need four paints and three shifts between them: 2n − 1 cards.',
    prerequisites: 'Paint and shift.',
    hints: ['How many paints does every start need now?', 'Four paints, with a shift between each two.', 'Paint, shift, paint, shift, paint, shift, paint.'],
    parent: {
      notice: 'Whether your child predicts seven cards from puzzle 8 before starting.',
      prompt: 'How many cards would five tiles need?',
      explanation: 'Each of the four tiles needs a paint while it is at the front, so four paints, and three shifts between them to bring each new tile forward. A shift at either end is wasted. Seven cards: 2 × 4 − 1.',
      extension: 'With five tiles, how many cards? Why can no story be shorter?',
      connection: 'The shortest story for n tiles is 2n − 1 cards, and it is unique (Week 46 bonus guide, Problem 3 extension).'
    },
    provenance: 'Week 46 bonus Problem 3 extension (2n − 1 instructions with n slots), with four tiles.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Wide cards',
    parameters: {slots: 4, rows: 'all', target: 'YBYB', hand: ['YY..', '.BB.', '..YB', 'B..B'], budget: 3, cant: true},
    idea: 'The last card must agree with the goal everywhere it paints; peel cards off from the end.',
    prerequisites: 'One picture.',
    hints: ['Which card could be the last one played?', 'Only the card that paints tiles 3 and 4 agrees with the goal everywhere it paints.', 'Yellow-yellow first, then blue-blue, then yellow-blue.'],
    parent: {
      notice: 'Whether your child thinks about the last card first.',
      prompt: 'Which card could go last, and why?',
      explanation: 'Each tile ends as the last paint on it. The last card therefore has to agree with the goal on all its tiles, and only the card painting tiles 3 and 4 yellow, blue does. Before it, tiles 1 and 2 still matter, and only the blue-blue card agrees with the goal at tile 2; before that, the yellow-yellow card gives tile 1. Working backwards gives the only three-card order.',
      extension: 'Can these four cards make every row blue, blue, blue, blue?',
      connection: 'Building a picture from overlapping stamps is solved by peeling the last stamp off first.'
    },
    provenance: 'New for the app: cards that paint two tiles, after Week 46’s rule that a tile finishes as its last assigned colour (adult guide, page 1).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Wide cards and a turn',
    parameters: {slots: 4, rows: 'all', target: 'BYBB', hand: ['.BB.', 'YY..', '..YY', 'F..F', 'YB..'], budget: 4, cant: true},
    idea: 'No paint card agrees with the goal, so the turn goes last; before it, aim for the goal with tiles 1 and 4 turned.',
    prerequisites: 'Wide cards.',
    hints: ['Which card could be the last one played?', 'No paint card agrees with the goal, so the turn is last.', 'Before the turn, aim for yellow, yellow, blue, yellow.'],
    parent: {
      notice: 'Whether your child works backwards again once the turn card is in play.',
      prompt: 'What should the rows look like just before the turn?',
      explanation: 'Each paint card disagrees with the goal somewhere it paints, so none can be last; the turn must be. Just before it, every row must show yellow, yellow, blue, yellow. Peeling as before: yellow-yellow on tiles 1 and 2 is next to last, then blue-blue on tiles 2 and 3, then yellow-yellow on tiles 3 and 4 first. Four cards in that order are the only way.',
      extension: 'Is there a goal these cards can reach with exactly two cards?',
      connection: 'A turn played after every paint changes the goal by the same turn, so the problem reduces to the one before.'
    },
    provenance: 'New for the app: wide cards and a turn, after Week 46 grades 4–5 Problem 5.'
  }
];

// The answer: two starts that can never become one, or the fewest cards.
const solve = q => {
  const pair = apart(q);
  if (pair) {
    if (!q.cant || q.budget) throw Error(`unsolvable without Can’t: ${JSON.stringify(q)}`);
    return {apart: pair};
  }
  const path = shortest(q, startsOf(q));
  if (!path) throw Error(`no solution for ${JSON.stringify(q)}`);
  if (q.budget && path.length !== q.budget) throw Error(`budget ${q.budget} is not the fewest ${path.length}`);
  return {cards: path.map(k => q.hand[k]), fewest: path.length};
};
const common = {familyTitle: 'Paint rows', mechanic: 'paint', band: 'all', revision: 1, sourceDocument: 'docs/paint/README.md'};
export const puzzles = authored.map(item => {
  const q = {...item.parameters, cant: item.parameters.cant ?? false}, solution = solve(q);
  const objective = q.target ? GOAL : MATCH;
  return {
    id: `paint-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    difficulty_level: item.difficulty_level,
    ...common,
    parameters: q,
    objective,
    visibleObjective: objective,
    instruction: objective,
    controls: controlsFor(q),
    rules: rulesFor(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['paint-week46', ...(/coupling|hypercube/i.test(item.parent.connection) ? ['paint-lpw'] : [])]},
    solution,
    provenance: item.provenance
  };
});
const playground = {
  id: 'paint-playground',
  number: 0,
  title: 'Paint rows playground',
  difficulty_level: 'playground',
  ...common,
  band: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Play cards on two rows or on every start.',
  visibleObjective: '',
  instruction: 'Play cards on two rows or on every start.',
  controls: 'Choose 2, 3 or 4 tiles, and two rows or every start. Tap a card to play it on every row. Draw plays a random paint card. Clear takes every card back. Two rows deals a new pair.',
  rules: [EVERY, KINDS[0][1], KINDS[1][1], 'Draw picks one of the paint cards at random, each equally likely. Nothing needs finishing.'],
  idea: 'Free play with forgetting: paint cards join rows, turn cards only move them around, and random paint cards join every start in the end.',
  prerequisites: 'None.',
  hints: ['Choose Every start and press Draw a few times.', 'How many draws did it take for every row to match?', 'Try only turn cards. Do any rows join?'],
  parent: {
    notice: 'Whether your child predicts how many draws every start needs, and whether the guess holds up.',
    prompt: 'Can six draws fail to make every start match?',
    explanation: 'Draw picks a tile and a colour at random. Every start matches once each tile has been drawn at least once, which can take many draws, because the same tile can come up again and again. Once every tile has been drawn, the finish is equally likely to be any of the rows, whatever the starts were.',
    extension: 'With three tiles, draw until every start matches, and count the draws. Do it several times.',
    connection: 'Running every start with the same random moves until they agree is coupling from the past (Propp and Wilson, 1996), which turns a random process into an exact random sample.',
    sourceIds: ['paint-week46', 'paint-cftp', 'paint-lpw']
  },
  solution: null,
  provenance: 'Week 46 grades 2–3 Problem 4 and grades 4–5 Problems 6 and 7 (random draws from six cards), and free play with the instruction cards.'
};
export const pack = {title: 'Paint rows', version: 1, families: [family], sources, puzzles: [playground, ...puzzles]};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/paint/paint.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, JSON.stringify(p.solution));
}
