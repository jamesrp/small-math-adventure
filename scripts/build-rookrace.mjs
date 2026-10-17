// Builds dist/families/rookrace/rookrace.json, Pebble Duel's Star race and
// Every start groups (worksheet Week 8), from the authoring list below. Each
// puzzle's second-player squares or starts are computed here with the
// module's own search (dist/families/rookrace/rookrace.js), checked against the
// hand-worked lists in docs/rookrace/README.md, and checked again by a
// different method in scripts/validate-rookrace.mjs.
// Run: node scripts/build-rookrace.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {secondSquares, secondStarts, allSquares, pileStarts, keyOf, cellOf, MAX_SIZE, MAX_PILE, STREAK} from '../dist/families/rookrace/rookrace.js';

const WEEK8 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-08';
export const sources = [
  {id: 'rookrace-week08', title: 'Bellingham Math Circle — Week 8: Rook race and Nim (student packets and adult guide)', url: WEEK8, kind: 'local curriculum'},
  {id: 'rookrace-card08', title: 'Week 8 review card and math check (App fit and Decision: a board group on the duel engine, a queen board, find every start)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-08.md', kind: 'local curriculum'},
  {id: 'rookrace-ferguson', title: 'Thomas S. Ferguson — Game Theory, Part I: Impartial Combinatorial Games, §1 (P- and N-positions), §2 (Nim and Bouton’s theorem)', url: 'https://www.math.ucla.edu/~tom/Game_Theory/comb.pdf', kind: 'undergraduate'},
  {id: 'rookrace-bouton', title: 'Charles L. Bouton — Nim, a game with a complete mathematical theory, Annals of Mathematics 3 (1901–1902), 35–39', url: 'https://en.wikipedia.org/wiki/Nim', kind: 'research'},
  {id: 'rookrace-wythoff', title: 'Willem A. Wythoff — A modification of the game of Nim, Nieuw Archief voor Wiskunde 7 (1907), 199–202', url: 'https://en.wikipedia.org/wiki/Wythoff%27s_game', kind: 'research'}
];
export const family = {
  id: 'rookrace',
  title: 'Pebble Duel: star race and every start',
  mathematics: 'A token sits on a square board with a star in the bottom-left corner. A turn slides it straight left or straight down, one or more squares, and whoever moves it onto the star wins. A start is a second-player win exactly when every move from it leads to a first-player win, and working back from the star sorts every square. The square x columns right of the star and y rows up is two-pile Nim with piles x and y, so the second-player squares are the diagonal x = y: every move leaves it and every other square can return to it, which is the copying strategy. When the token may also slide diagonally down and to the left (a queen), each row, column and down-left diagonal holds at most one second-player square; they are Wythoff’s pairs (1, 2), (3, 5), (4, 7), (6, 10), … and their mirror images, (⌊kφ⌋, ⌊kφ²⌋) with differences 1, 2, 3, …. With three piles the second player wins exactly when every bundle size 1, 2, 4, … appears an even number of times across the piles (Bouton): a move always breaks a pair, and from an unpaired position one pile can be rebuilt to pair them all again.',
  rules: [
    'Players take turns. On a board, a turn slides the token straight left or straight down, one or more squares; on the queen boards it may also slide diagonally down and to the left. Whoever moves the token onto the star wins.',
    'With piles, a turn takes one or more pebbles from one pile, and whoever takes the last pebble wins.',
    'The app never misses a winning move.'
  ],
  sourceIds: sources.map(s => s.id)
};

const SLIDE = q => q.queen ? 'A turn slides the token straight left, straight down, or diagonally down and to the left, one or more squares' : 'A turn slides the token straight left or straight down, one or more squares';
function controls(q) {
  if (q.kind === 'race') return `${SLIDE(q)}, and whoever moves it onto the star wins. Choose Me first or You first, then tap a dotted square to move the token there; I reply at once. Win 3 games in a row from new starts. After a loss, Same start again is practice and does not count.`;
  if (q.kind === 'board') return `${SLIDE(q)}, and whoever moves it onto the star wins. Tap a square to mark it, and again to clear it. Play, then a square, tries a game from it against me. That’s all checks every mark at once: if a marked start is one where the first player can win, I go first from it and win, and then the marks are cleared.`;
  return 'A turn takes one or more pebbles from one pile, and whoever takes the last pebble wins. The order of the piles does not matter. Tap a slot to set a pile, Keep to put the start on the shelf, and a kept start to take it off. Play tries the start against me. That’s all checks the whole shelf at once: if a kept start is one where the first player can win, I go first from it and win, and then the shelf is cleared.';
}
function rules(q) {
  if (q.kind === 'piles') return ['Players take turns.', 'A turn takes one or more pebbles from one pile.', 'Whoever takes the last pebble wins.', `Each pile has 1 to ${q.max} pebbles, and the order of the piles does not matter.`, 'The app never misses a winning move.', 'That’s all is final: if a kept start is one where the first player can win, I play it going first, and then the shelf is cleared.'];
  const out = ['Players take turns.', `${SLIDE(q)}.`, 'Whoever moves the token onto the star wins.'];
  if (q.kind === 'race') return [...out, 'Before each game, choose who starts. The app never misses a winning move.', 'Win 3 games in a row. Only games from a new start count; Same start again is for practice.'];
  return [...out, 'A start is any square except the star.', 'The app never misses a winning move.', 'That’s all is final: if a marked start is one where the first player can win, I play it going first, and then the marks are cleared.'];
}

const RACE_HINTS = queen => [
  'Lost a game? Same start again replays that start. Watch where I move the token.',
  'Starts where you went first and lost get a ring. What do they have in common?',
  `When I won, where did my moves leave the token? No ${queen ? 'queen ' : ''}move goes from one of those squares to another.`
];
const RACE_PARENT = {
  notice: 'Whether your child decides who starts by looking at where the token is, before playing, rather than by who won last time.',
  prompt: 'From which squares would you rather go second? How can you tell?'
};
const ROOK_EXPLANATION = size => `Square x columns right of the star and y rows up is the game with two piles x and y: a move left takes from one pile, a move down from the other. From a diagonal square (x = y) every move leaves the diagonal, and from any other square one move returns to it, so whoever moves the token onto the diagonal can keep it there (by copying) until it reaches the star. On this ${size}-by-${size} board the ${size - 1} diagonal squares are the starts where you would rather go second. Starts are drawn half from them, and the app never misses a win, so three wins in a row from new starts shows the rule is known, not guessed.`;
const QUEEN_EXPLANATION = (size, list) => `Work back from the star. Every square in the star’s row, column or diagonal is a first-player win (one move reaches the star). The nearest squares that cannot reach the star are 1 right 2 up and 2 right 1 up, and every move from them reaches a first-player win, so they are second-player squares. Each row, column and down-left diagonal can hold only one second-player square, since a move would join two of them. Continuing, the second-player squares on this ${size}-by-${size} board are ${list}. In general they are Wythoff’s pairs (⌊kφ⌋, ⌊kφ²⌋) and their mirror images, with φ the golden ratio; the k-th pair has difference k.`;
const words = list => list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0];
const queenList = q => `${words(secondSquares(q).filter(([x, y]) => x < y).map(([x, y]) => `(${x}, ${y})`))} and their mirror images`;

const authored = [
  // Star race: choose who starts, then win; three in a row from new starts.
  {
    group: 'race', number: 1, difficulty_level: 'easy', title: 'Four by four',
    parameters: {kind: 'race', size: 4, streak: STREAK},
    idea: 'The starts where you would rather go second are the diagonal from the star.',
    prerequisites: 'Take turns and slide a token along a row or a column. A grown-up can read the goal.',
    hints: RACE_HINTS(false),
    parent: {...RACE_PARENT, explanation: ROOK_EXPLANATION(4), extension: 'Your partner goes first from the top-right corner. How can you always win?', connection: 'The second-player squares are the P-positions of two-pile Nim, the equal pairs; copying is a strategy proved by an invariant (Ferguson, §1–2).'},
    provenance: 'Week 8 launch (a token on a 4-by-4 board) and K–1 Problems 1–2 (play many games from the dot; circle whether you would rather go first or second), as a choose-who-starts round on the Proofs duel engine.'
  },
  {
    group: 'race', number: 2, difficulty_level: 'easy', title: 'Five by five',
    parameters: {kind: 'race', size: 5, streak: STREAK},
    idea: 'The diagonal rule holds on a bigger board: from a diagonal square every move leaves it, and from any other square one move returns to it.',
    prerequisites: 'Star race 1, or any board from Week 8.',
    hints: RACE_HINTS(false),
    parent: {...RACE_PARENT, explanation: ROOK_EXPLANATION(5), extension: 'From 3 right and 1 up, which moves let you win? Is there more than one?', connection: 'P-positions of two-pile Nim (Ferguson, §1–2).'},
    provenance: 'Week 8 grades 2–3 Problem 1 (a 5-by-5 board: would you rather go first or second from each start?).'
  },
  {
    group: 'race', number: 3, difficulty_level: 'medium', title: 'Eight by eight',
    parameters: {kind: 'race', size: 8, streak: STREAK},
    idea: 'On the full board the same diagonal decides: going second from it, answer each move by returning the token to the diagonal.',
    prerequisites: 'Star race 1 or 2.',
    hints: RACE_HINTS(false),
    parent: {...RACE_PARENT, explanation: ROOK_EXPLANATION(8), extension: 'Which two piles of pebbles make the same game as the token on 5 right and 2 up?', connection: 'The board is two-pile Nim drawn as a grid; the equal pairs are its P-positions (Ferguson, §2).'},
    provenance: 'Week 8 K–1 Problem 7, grades 2–3 Problems 2–3 and grades 4–5 Problem 1 (the 8-by-8 board).'
  },
  {
    group: 'race', number: 4, difficulty_level: 'medium', title: 'Queen on six by six',
    parameters: {kind: 'race', size: 6, queen: true, streak: STREAK},
    idea: 'With the diagonal move the diagonal is no longer safe; the second-player squares are 1 right 2 up, 2 right 1 up, 3 right 5 up and 5 right 3 up.',
    prerequisites: 'Star race 1–3.',
    hints: RACE_HINTS(true),
    parent: {...RACE_PARENT, explanation: QUEEN_EXPLANATION(6, queenList({size: 6, queen: true})), extension: 'Why can no row hold two second-player squares?', connection: 'Wythoff’s game (1907); its P-positions are (⌊kφ⌋, ⌊kφ²⌋) and their mirrors (Wythoff; Ferguson, §2 exercises).'},
    provenance: 'Week 8 grades 4–5 Problem 8 (the token may also slide diagonally down and to the left), on a 6-by-6 board. New instance size.'
  },
  {
    group: 'race', number: 5, difficulty_level: 'hard', title: 'Queen on eight by eight',
    parameters: {kind: 'race', size: 8, queen: true, streak: STREAK},
    idea: 'The queen’s second-player squares come in mirror pairs whose differences are 1, 2 and 3: (1, 2), (3, 5), (4, 7).',
    prerequisites: 'Star race 4.',
    hints: RACE_HINTS(true),
    parent: {...RACE_PARENT, explanation: QUEEN_EXPLANATION(8, queenList({size: 8, queen: true})), extension: 'Where is the next pair beyond this board? What is its difference?', connection: 'Wythoff’s pairs split the positive whole numbers between them: each appears exactly once as a smaller or a larger coordinate (Beatty’s theorem with φ and φ²).'},
    provenance: 'Week 8 grades 4–5 Problem 8 (the 8-by-8 queen board), as a choose-who-starts round.'
  },
  // Every start: mark or keep every start where you would rather go second; That’s all judges the whole set.
  {
    group: 'every', number: 1, difficulty_level: 'easy', title: 'Six by six',
    parameters: {kind: 'board', size: 6},
    objective: 'Mark every start where you would rather go second, then press That’s all.',
    visibleObjective: 'Mark every start where you would rather go second.',
    idea: 'On the rook board the starts where you would rather go second are the diagonal.',
    prerequisites: 'Star race 1 or 2.',
    hints: ['Start near the star. From which squares can the first player reach the star at once?', 'A start is one to mark when every move from it reaches a square that is not marked.', 'Work outward from the star, one square at a time.'],
    parent: {notice: 'Whether your child works outward from the star, deciding each square from the squares it can reach, or marks a guessed pattern.', prompt: 'Why is 1 right and 1 up a good square to hand over, and 2 right and 1 up not?', explanation: `${ROOK_EXPLANATION(6).split(' Starts are drawn')[0]} After a wrong That’s all the app goes first from the ringed wrong square, wins, and clears the marks; a missing square gets only “There is another.”, with no count.`, extension: 'How do you know you have found them all?', connection: 'P-positions of two-pile Nim; marking works outward by backward induction (Ferguson, §1).'},
    provenance: 'Week 8 K–1 Problem 4 (the open 6-by-6 board: colour every square you want to move the token to), as in grades 2–3 Problem 2 and grades 4–5 Problem 1 on 8-by-8.'
  },
  {
    group: 'every', number: 2, difficulty_level: 'easy', title: 'Piles of 1 to 3',
    parameters: {kind: 'piles', max: 3},
    objective: 'Find every start with three piles of 1 to 3 pebbles where you would rather go second, then press That’s all.',
    visibleObjective: 'Find every start where you would rather go second.',
    idea: 'Of the ten starts with piles of 1 to 3, only 1, 2 and 3 is one where you would rather go second.',
    prerequisites: 'Two-pile copying (Pebble Duel easy puzzles or Duel 1). Count to 9.',
    hints: ['Use Play to try a start both ways. Which starts can you win going second?', 'If two piles are equal, the first player can take the whole third pile. What then?', 'Check the starts with no two piles equal.'],
    parent: {notice: 'Whether your child rules out starts with two equal piles quickly (take the third pile, then copy) and then checks the rest by play.', prompt: 'How do you know there is no other?', explanation: 'There are ten starts. Any start with two equal piles is a first-player win: take the whole third pile and copy. That leaves only 1, 2 and 3, and from there every move leaves two piles that can be made equal or a pair plus one, so the second player wins.', extension: 'What changes with piles up to 4?', connection: 'Bouton’s theorem: 1 ⊕ 2 ⊕ 3 = 0 (Ferguson, §2).'},
    provenance: 'Week 8 grades 2–3 Problem 8 (every start with three piles of 1, 2 or 3 where you would rather go second; explain how you know you have found them all) and K–1 Problem 8.'
  },
  {
    group: 'every', number: 3, difficulty_level: 'medium', title: 'Piles of 1 to 6',
    parameters: {kind: 'piles', max: 6},
    objective: 'Find every start with three piles of 1 to 6 pebbles where you would rather go second, then press That’s all.',
    visibleObjective: 'Find every start where you would rather go second.',
    idea: 'Four of the 56 starts: 1, 2, 3; 1, 4, 5; 2, 4, 6; 3, 5, 6. In each, every bundle size of 4, 2 and 1 appears an even number of times.',
    prerequisites: 'Every start 2. Patience with bookkeeping; piles split into bundles of 4, 2 and 1 help.',
    hints: ['Look at the start you already know. Can a pile of 4 or more join a start like it?', 'Split each pile into bundles of 4, 2 and 1. Compare the starts you keep with the ones I won from.', 'If two piles are fixed, at most one size of third pile can work.'],
    parent: {notice: 'Whether your child finds the starts by organised search (fix the smallest pile) or by a pattern, and whether they notice that two piles fix the third.', prompt: 'If two piles are 2 and 4, what must the third be?', explanation: 'Write each pile in bundles of 4, 2 and 1. The second player wins exactly when each bundle size appears an even number of times (the Nim-sum is 0). For any two piles a and b the third must be a ⊕ b, so a start is decided by its two smallest piles; within 1 to 6 that gives 1, 2, 3; 1, 4, 5; 2, 4, 6; 3, 5, 6.', extension: 'With piles up to 7, which three starts join these?', connection: 'Bouton’s theorem (Bouton 1902; Ferguson, §2).'},
    provenance: 'Week 8 grades 2–3 Problem 9 (all the starts with three piles of 1 to 6 where you would rather go second).'
  },
  {
    group: 'every', number: 4, difficulty_level: 'medium', title: 'Queen on eight by eight',
    parameters: {kind: 'board', size: 8, queen: true},
    objective: 'Mark every start where you would rather go second, then press That’s all.',
    visibleObjective: 'Mark every start where you would rather go second.',
    idea: 'With the queen’s diagonal move the starts to mark are (1, 2), (2, 1), (3, 5), (5, 3), (4, 7) and (7, 4).',
    prerequisites: 'Every start 1; Star race 4 helps.',
    hints: ['Start near the star. From which squares can the first player reach the star at once?', 'A start is one to mark when every move from it reaches a square that is not marked.', 'Work outward from the star, one row at a time.'],
    parent: {notice: 'Whether your child works outward from the star, and whether they notice that no row, column or diagonal holds two marks.', prompt: 'Why can a row never have two marked squares?', explanation: QUEEN_EXPLANATION(8, queenList({size: 8, queen: true})), extension: 'Without marking, where is the next pair after (4, 7)?', connection: 'Wythoff’s game (Wythoff 1907).'},
    provenance: 'Week 8 grades 4–5 Problem 8 (the 8-by-8 queen board: colour every square red if the second player can always win).'
  },
  {
    group: 'every', number: 5, difficulty_level: 'hard', title: 'Piles of 1 to 7',
    parameters: {kind: 'piles', max: 7},
    objective: 'Find every start with three piles of 1 to 7 pebbles where you would rather go second, then press That’s all.',
    visibleObjective: 'Find every start where you would rather go second.',
    idea: 'Seven of the 84 starts: the four for piles up to 6, and 1, 6, 7; 2, 5, 7; 3, 4, 7.',
    prerequisites: 'Every start 3.',
    hints: ['Which starts from piles up to 6 still count? What can a pile of 7 join?', 'Split each pile into bundles of 4, 2 and 1. Compare the starts you keep with the ones I won from.', 'If two piles are fixed, at most one size of third pile can work.'],
    parent: {notice: 'Whether your child reuses the answers for piles up to 6 and searches only the new starts with a 7.', prompt: 'Which piles go with a 7?', explanation: 'With 7 = 4 + 2 + 1, the other two piles must together hold each bundle size once: 1 and 6, 2 and 5, or 3 and 4. Together with 1, 2, 3; 1, 4, 5; 2, 4, 6; 3, 5, 6 that makes seven starts, and every one has Nim-sum 0.', extension: 'How many starts are there with piles of 1 to 15?', connection: 'Bouton’s theorem; the second-player starts with piles below 2^k are the triples a, b, a ⊕ b (Ferguson, §2).'},
    provenance: 'Week 8 grades 4–5 Problem 4 (all the starts with three piles of 1 to 7 where the second player can always win).'
  },
  {
    group: 'every', number: 6, difficulty_level: 'hard', title: 'Queen on eleven by eleven',
    parameters: {kind: 'board', size: 11, queen: true},
    objective: 'Mark every start where you would rather go second, then press That’s all.',
    visibleObjective: 'Mark every start where you would rather go second.',
    idea: 'On the larger queen board a fourth mirror pair, (6, 10) and (10, 6), joins the three below it; the differences go 1, 2, 3, 4.',
    prerequisites: 'Every start 4.',
    hints: ['Use the squares you found on the eight-by-eight board. What comes next?', 'Each row, column and down-left diagonal can hold at most one marked square.', 'Look at the differences between the two numbers of each pair.'],
    parent: {notice: 'Whether your child extends the pattern from the 8-by-8 board and checks it, or starts again.', prompt: 'How do you know you have found them all?', explanation: `${QUEEN_EXPLANATION(11, queenList({size: 11, queen: true}))} Each new pair uses the smallest number not yet used as its smaller coordinate, and its difference is one more than the last.`, extension: 'On the worksheet’s 20-by-20 board, which pairs are there?', connection: 'Wythoff’s pairs and Beatty sequences: ⌊kφ⌋ and ⌊kφ²⌋ together list every positive whole number once.'},
    provenance: 'Week 8 grades 4–5 Problem 9 (mark all the red squares of the queen game on a 20-by-20 board; explain how you know you have found them all), on an 11-by-11 board that fits a phone.'
  }
];

// Hand-worked answers (docs/rookrace/README.md), which the search must match.
const EXPECTED = {
  'rookrace-01': '1,1 2,2 3,3', 'rookrace-02': '1,1 2,2 3,3 4,4', 'rookrace-03': '1,1 2,2 3,3 4,4 5,5 6,6 7,7',
  'rookrace-04': '2,1 1,2 5,3 3,5', 'rookrace-05': '2,1 1,2 5,3 7,4 3,5 4,7',
  'everystart-01': '1,1 2,2 3,3 4,4 5,5', 'everystart-02': '1,2,3', 'everystart-03': '1,2,3 1,4,5 2,4,6 3,5,6',
  'everystart-04': '2,1 1,2 5,3 7,4 3,5 4,7', 'everystart-05': '1,2,3 1,4,5 1,6,7 2,4,6 2,5,7 3,4,7 3,5,6',
  'everystart-06': '2,1 1,2 5,3 7,4 3,5 10,6 4,7 6,10'
};

const RACE_OBJECTIVE = 'Choose who starts, then move the token onto the star. Win 3 games in a row from new starts.';
export const puzzles = authored.map(item => {
  const q = item.parameters, race = item.group === 'race';
  assert.ok(q.size === undefined || (q.size >= 2 && q.size <= MAX_SIZE), `${item.title}: board size`);
  assert.ok(q.max === undefined || (q.max >= 1 && q.max <= MAX_PILE), `${item.title}: pile size`);
  const id = `${race ? 'rookrace' : 'everystart'}-${String(item.number).padStart(2, '0')}`;
  const solution = q.kind === 'piles'
    ? {secondStarts: secondStarts(q).map(keyOf), starts: pileStarts(q).length}
    : {secondSquares: secondSquares(q), cells: secondSquares(q).map(s => cellOf(q, s)), starts: allSquares(q).length};
  const found = (solution.secondStarts || solution.secondSquares.map(s => s.join(','))).join(' ');
  assert.equal(found, EXPECTED[id], `${id}: answers match the hand-worked list`);
  return {
    id,
    number: item.number,
    title: item.title,
    band: 'all',
    difficulty_level: item.difficulty_level,
    mechanic: race ? 'rookrace' : 'everystart',
    libraryFamily: 'nim',
    group: race ? 'Star race' : 'Every start',
    familyTitle: 'Pebble Duel',
    revision: 1,
    parameters: q,
    objective: item.objective || RACE_OBJECTIVE,
    visibleObjective: item.visibleObjective ?? 'Win 3 games in a row.',
    instruction: item.objective || RACE_OBJECTIVE,
    controls: controls(q),
    rules: rules(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['rookrace-week08', 'rookrace-card08', 'rookrace-ferguson', ...(/Wythoff|Beatty/.test(item.parent.connection + item.idea) || q.queen ? ['rookrace-wythoff'] : []), ...(/Bouton/.test(item.parent.connection) ? ['rookrace-bouton'] : [])]},
    solution,
    provenance: item.provenance,
    // As in Proofs, How to play leaves out the grown-ups' notes, which hold the
    // answers; the Grown-ups catalog still lists them.
    proof: true,
    sourceDocument: 'docs/rookrace/README.md'
  };
});
export const pack = {title: 'Pebble Duel star race and every start', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/rookrace/rookrace.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.title, JSON.stringify(p.parameters), (p.solution.secondStarts || p.solution.secondSquares.map(s => s.join(','))).join(' '), `of ${p.solution.starts}`);
}
