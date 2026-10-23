// Builds dist/families/hackenbush/hackenbush.json, Pebble Duel's Stalks group
// (worksheet Week 83, Hackenbush balances), from the authoring list below.
// Each puzzle's answer is computed here with the module's own search
// (dist/families/hackenbush/hackenbush.js), checked against the hand-worked
// answers in docs/hackenbush/README.md, and checked again by a different
// method in scripts/validate-hackenbush.mjs.
// Run: node scripts/build-hackenbush.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {outcome, winningMoves, firstCuts, after, other, value, boardPool, balancingBuilds, bestClaim, balances, STREAK} from '../dist/families/hackenbush/hackenbush.js';

const WEEK83 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-83';
export const sources = [
  {id: 'hackenbush-week83', title: 'Bellingham Math Circle — Week 83: Hackenbush balances (student packet W83-S-v2 and adult guide)', url: WEEK83, kind: 'local curriculum'},
  {id: 'hackenbush-card83', title: 'Week 83 review card and math check (App fit: a Pebble Duel group with duels, every reply, rounds choosing colour and who starts, and building a balance)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-83.md', kind: 'local curriculum'},
  {id: 'hackenbush-ww', title: 'Elwyn Berlekamp, John H. Conway and Richard Guy — Winning Ways for Your Mathematical Plays, Volume 1, Chapters 1–2 (Blue-Red Hackenbush, its numbers and how they add)', url: 'https://en.wikipedia.org/wiki/Winning_Ways_for_Your_Mathematical_Plays', kind: 'book'},
  {id: 'hackenbush-wiki', title: 'Wikipedia — Hackenbush (red–blue stalks and their values by sign expansion)', url: 'https://en.wikipedia.org/wiki/Hackenbush', kind: 'reference'}
];
export const family = {
  id: 'hackenbush',
  title: 'Pebble Duel: stalks',
  mathematics: 'Stalks of blue and red segments stand on the ground. Blue cuts one blue segment, Red one red segment, and everything above a cut falls off; whoever has nothing to cut loses. Every board is a number, and the numbers of boards side by side add: B is 1, R is −1, and in a stalk the first run of one colour counts one each, after which each segment counts half the one below it, so BR is 1/2, BRR is 1/4, BRB is 3/4 and RB is −1/2. Blue wins whoever starts when the number is positive, Red when it is negative, and whoever moves second when it is zero: a zero board balances. No board is won by whoever moves first. So two BR balance R, two BRR balance RB, and any stalk balances its colour swap, since the second player can copy every cut with colours swapped.',
  rules: [
    'Blue cuts one blue segment; Red cuts one red segment. Everything above a cut falls off.',
    'Players take turns. Whoever has nothing to cut loses.',
    'A board balances when whoever goes second can always win, whichever colour starts. The app never misses a winning cut.'
  ],
  sourceIds: sources.map(s => s.id)
};

// How to play opens with the move, then the taps.
const MOVE = 'Blue cuts one blue segment and Red one red segment; everything above a cut falls off. Whoever has nothing to cut loses.';
const TAP = 'Tap one of your segments to cut it.';
const CHOOSE = 'Choose Blue or Red, and I choose who starts; or choose Go second, and I choose my colour and go first. The choice is final for that game.';
const NAMES = {B: 'Blue', R: 'Red'};
function controls(q) {
  if (q.kind === 'build') return `${MOVE} Tap a + under a spot to add a blue or red segment to it, and tap a segment you added to take it off with everything above it. Check tests the whole board. If whoever goes second can always win, whichever colour starts, it balances and you are done. If not, I take the colour that can win going first, go first and win; then Back returns to your board, and Check waits for a change. Undo takes back one step at a time.`;
  if (q.mode === 'duel') return `${MOVE} You are ${NAMES[q.colour]}, and you go first. ${TAP} I reply at once. Undo takes back your cut and my reply.`;
  if (q.mode === 'replies') return `${MOVE} You go second, and I try each first cut in turn, in either colour; you play the other colour. ${TAP} After a win, Next first cut starts the next game; after a loss, Try again replays the same first cut.`;
  if (q.mode === 'boards') return `${MOVE} On each board: ${CHOOSE} ${TAP} After a win, Next board; after a loss, Try again.`;
  return `${MOVE} Before each game: ${CHOOSE} ${TAP} Win 3 games in a row from new boards. After a loss, Same board again is practice and does not count.`;
}
const words = pos => { const items = pos.filter(Boolean); return items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0]; };
function rules(q) {
  const out = ['Blue cuts one blue segment; Red cuts one red segment.', 'Everything above a cut falls off.', 'Players take turns. Whoever has nothing to cut loses.', 'The app never misses a winning cut.'];
  if (q.kind === 'build') return [...out, `The board starts as ${words(q.given)}, with ${q.slots} empty spots of up to ${q.height} segments.`, 'A board balances when whoever goes second can always win, whichever colour starts.', 'Check is final for that board: if it does not balance, I take the colour that can win going first, go first and win.'];
  if (q.mode === 'duel') return [...out, `You are ${NAMES[q.colour]} and go first.`];
  if (q.mode === 'replies') return [...out, `You go second from ${words(q.start)}, and I try each first cut in turn. Win every game.`];
  return [...out, 'Before each game, choose Blue or Red (I choose who starts) or Go second (I choose my colour and go first).', q.mode === 'boards' ? 'Win on every board.' : 'Win 3 games in a row. Only games from a new board count; Same board again is for practice.'];
}

const CONNECTION = 'Red–blue Hackenbush is a partizan game: Blue and Red have different moves. Conway showed that every board is a number, that boards side by side add, and that a board is won by whoever moves second exactly when its number is zero (Winning Ways, Chapters 1–2). A stalk’s number comes from its colours by sign expansion: the first run of one colour counts whole units, and each later segment half the one below it.';
const STREAK_HINTS = [
  'Lost a game? Same board again replays it. Which choice would have won?',
  'Compare the stalks of each colour. Which segments count for less than a whole B or R?',
  'Two BR count as much as one R, and two BRR as much as one RB. Which colour is ahead, or are they even?'
];

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'BB and R',
    parameters: {mode: 'duel', start: ['BB', 'R'], colour: 'B'},
    idea: 'A low cut drops your own segments too. As Blue first on BB and R, cut the top B, not the bottom one.',
    prerequisites: 'None. A grown-up can read how a cut works.',
    hints: ['Which of your two segments would you rather keep?', 'If you cut the bottom B, the top one falls too. What can you cut after that?', 'Cut the top B.'],
    parent: {notice: 'Whether your child sees that cutting the bottom segment drops the one above it, and after a loss tries the other cut.', prompt: 'Why does cutting the bottom B lose?', explanation: 'Blue has two cuts. The bottom B drops both blue segments and leaves R: I cut it, and Blue has nothing left. The top B leaves B and R: I must cut R, and Blue cuts the last B, leaving me nothing. A low cut costs everything above it, your own segments included.', extension: 'If Red starts on BB and R, who wins?', connection: CONNECTION},
    provenance: 'Week 83 Problem 1, board D (BB and R, where cutting low costs Blue its own top segment), as a duel against a perfect opponent with Blue first, as the card’s App fit asks.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Four boards',
    parameters: {mode: 'boards', boards: [['B'], ['R'], ['B', 'R'], ['BB', 'R']]},
    objective: 'On each board, choose Blue or Red (I choose who starts) or Go second (I choose my colour and go first), then win. Win on every board.',
    visibleObjective: 'Choose, then win on every board.',
    idea: 'On B, Blue wins whoever starts; on R, Red; on B and R, whoever goes second; on BB and R, Blue.',
    prerequisites: 'Puzzle 1.',
    hints: ['Try a choice. Which one can you win with, whatever I do?', 'On B and R, what happens to whoever cuts first?', 'Choose Blue on B and on BB and R, Red on R, and Go second on B and R.'],
    parent: {notice: 'Whether your child chooses by looking at the board, and notices on B and R that whoever cuts first loses.', prompt: 'On which boards can one colour always win? On which does the second player win?', explanation: 'On B, Blue wins whoever starts, since Red has nothing to cut; R is the same for Red. On B and R whoever moves first must cut their only segment, and then the other cuts theirs: the second player wins. On BB and R Blue wins whoever starts, provided Blue, moving first, cuts the top B. Choosing a colour lets me choose who starts, so it wins only when that colour wins both ways; Go second lets me choose my colour and go first, so it wins only when the second player always wins.', extension: 'Can you find a board where whoever goes first always wins, whichever colour starts? (There is none in this game.)', connection: CONNECTION},
    provenance: 'Week 83 Problem 1 (boards A–D: play each with Blue starting, then with Red; on which can one colour always win?), as choices that are then played out: a colour with me choosing who starts, or Go second.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'BR and R',
    parameters: {mode: 'duel', start: ['BR', 'R'], colour: 'R'},
    idea: 'As Red first on BR and R, cut the R on top of BR, leaving B and R for Blue to start; cutting the lone R leaves BR, which Blue wins.',
    prerequisites: 'Puzzles 1 and 2.',
    hints: ['After your cut, which board would you like me to face?', 'Puzzle 2 had a board where whoever cuts first loses. Can you leave me that board?', 'Cut the R on top of BR.'],
    parent: {notice: 'Whether your child aims for a board they know, B and R, rather than cutting the lone R because it stands alone.', prompt: 'Is BR worth as much to Blue as B?', explanation: 'Red has two cuts. The lone R leaves BR: Blue cuts its B, everything falls, and Red has nothing. The R on top of BR leaves B and R with Blue to move, and whoever moves first there loses. If Blue started instead, Blue’s only cut removes the whole BR and Red cuts R. So BR and R is Red’s whoever starts: BR is worth less than a B (it is 1/2).', extension: 'Who wins BR, BR and R?', connection: CONNECTION},
    provenance: 'Week 83 Problem 2, board A (one BR against one R), as a duel with Red first.'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Two BR and R',
    parameters: {mode: 'replies', start: ['BR', 'BR', 'R']},
    objective: 'You go second from BR, BR and R. I try each of my first cuts in turn, in either colour. Win every game.',
    visibleObjective: 'Go second. Win against each of my first cuts.',
    idea: 'BR, BR and R balances: whoever goes second wins. Answer each first cut so that I face B and R, or a single BR when you are Blue.',
    prerequisites: 'Puzzles 1–3.',
    hints: ['After my first cut, which board would you like me to face?', 'You know a board where whoever cuts first loses. Can you leave me that one?', 'Leave me B and R, or a single BR when you are Blue.'],
    parent: {notice: 'Whether your child answers each first cut by aiming for a known board, B and R, and sees that the reply depends on which colour cut.', prompt: 'Why does whoever goes second win here, whichever colour starts?', explanation: 'BR, BR and R is a second-player win, which the worksheet calls a balance: two BR count for Blue exactly as much as one R for Red, so a BR is worth half a B. Up to swapping the two BR there are three first cuts. If Blue removes a BR, Red cuts the top of the other, leaving B and R with Blue to move. If Red cuts the top of a BR, Blue removes the other BR, leaving B and R with Red to move. If Red cuts the lone R, Blue removes either BR, leaving one BR, which Blue wins.', extension: 'Does BR, BR, BR and R balance?', connection: CONNECTION},
    provenance: 'Week 83 Problem 2, board B (two BR against one R, the board that balances), as every reply: I try each of the three first cuts, as the card’s App fit asks.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'BRR and RB',
    parameters: {mode: 'duel', start: ['BRR', 'RB'], colour: 'R'},
    idea: 'As Red first on BRR and RB, cut the top R of BRR, leaving BR and RB, which balance; the other two cuts give Blue the win.',
    prerequisites: 'Puzzles 3 and 4.',
    hints: ['You have three cuts. Which board would you like me to face?', 'Try a cut. When I win, Undo and look at the board you left me.', 'Cut the top R of BRR.'],
    parent: {notice: 'Whether your child compares BR with RB, a stalk with its colours swapped.', prompt: 'Why do BR and RB balance?', explanation: 'BRR and RB is Red’s whoever starts (1/4 − 1/2 < 0). Red, first, has three cuts. The top R of BRR leaves BR and RB: whatever one player cuts on one stalk, the other cuts on the other stalk with colours swapped, so the second player wins (1/2 − 1/2 = 0). The middle R of BRR leaves B and RB (1 − 1/2 > 0), and the R under RB removes that stalk and leaves BRR (1/4 > 0): Blue wins both.', extension: 'Does BRR, BRR and RB balance?', connection: CONNECTION},
    provenance: 'Week 83 Problem 3, board A (BRR against RB, Red’s whoever starts), as a duel with Red first, as the card’s App fit asks.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Balance BRB',
    parameters: {kind: 'build', given: ['BRB'], slots: 2, height: 4},
    idea: 'RBR, the colour swap, balances BRB; so do R with BRR, and RB with RBB.',
    prerequisites: 'Puzzles 1–5.',
    hints: ['Which boards that balance do you know? What makes them balance?', 'In BR and RB, one stalk is the other with its colours swapped.', 'Build RBR in one spot.'],
    parent: {notice: 'Whether your child copies the stalk with its colours swapped, and whether, after a Check that fails, they use the game I played to change the board.', prompt: 'How do you know your board balances?', explanation: 'A board balances when its number is zero. BRB is 1 − 1/2 + 1/4 = 3/4, so the spots must add up to −3/4. RBR is −3/4: any stalk balances its colour swap, since the second player copies every cut on the other stalk with colours swapped. So are R and BRR (−1 + 1/4), and RB and RBB (−1/2 − 1/4). Check decides by searching the game, not by the numbers; a failed Check is played out by me in the colour that wins going first.', extension: 'Can you balance BRB with two stalks, neither of them RBR?', connection: CONNECTION},
    provenance: 'Week 83 Problem 4 (make boards that balance, each with a stalk of at least two segments), as building against the stalk B,R,B, which the card suggests balancing with R,B,R or RB and RBB; an unbalanced Check is certified by my playing it out.'
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Two BRR and RB',
    parameters: {mode: 'replies', start: ['BRR', 'BRR', 'RB']},
    objective: 'You go second from BRR, BRR and RB. I try each of my first cuts in turn, in either colour. Win every game.',
    visibleObjective: 'Go second. Win against each of my first cuts.',
    idea: 'Two BRR balance one RB, so a BRR is worth half a BR. Up to swapping the two BRR there are five first cuts, and each has a winning reply.',
    prerequisites: 'Puzzles 4 and 5.',
    hints: ['After my first cut, which board would you like me to face?', 'BR and RB balance. Can you leave me that board, or one where my colour is short?', 'If I remove a BRR or cut the top R of one, leave me BR and RB.'],
    parent: {notice: 'Whether your child reuses BR and RB as a known balance, and finds replies that leave a board my colour cannot win.', prompt: 'Why does whoever goes second win here?', explanation: 'BRR is 1/4 and RB is −1/2, so two BRR and RB add up to 0: whoever goes second wins. The five first cuts and winning replies: Blue removes a BRR, and Red cuts the top R of the other, leaving BR and RB. Blue cuts the B of RB, and Red cuts the top R of a BRR, leaving BR, BRR and R (−1/4 with Blue to move). Red cuts the middle R of a BRR, and Blue removes the other BRR (B and RB) or cuts the B of RB. Red cuts the top R of a BRR, and Blue removes the other BRR, leaving BR and RB. Red removes RB, and Blue removes a BRR, leaving one BRR.', extension: 'Does BRR, BRR, BRR and RB balance?', connection: CONNECTION},
    provenance: 'Week 83 Problem 3, board C (two BRR against one RB, the board that balances), as every reply: I try each of the five first cuts, as the card’s App fit asks.'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Drawn boards',
    parameters: {mode: 'streak', pieces: ['B', 'R', 'BB', 'RR', 'BR', 'RB', 'BRR', 'RBB', 'BRB', 'RBR'], least: 3, most: 8, streak: STREAK},
    idea: 'Choose Blue when Blue wins whoever starts (the board’s number is positive), Red when it is negative, and Go second when it is zero. No board is won by whoever goes first, so one of the three always wins.',
    prerequisites: 'Puzzles 1–7.',
    hints: STREAK_HINTS,
    parent: {notice: 'Whether your child decides by reading the board before playing, rather than by what won last time.', prompt: 'How do you decide what to choose?', explanation: 'Blue wins whoever starts when the board’s number is positive, Red when it is negative, and whoever goes second when it is zero. A colour lets me choose who starts, so it wins only when that colour wins both ways; Go second lets me choose my colour and go first, so it wins only on a zero board; no board is a first-player win, so one choice always wins. Boards are drawn from every set of 2 to 4 stalks from B, R, BB, RR, BR, RB, BRR, RBB, BRB and RBR with 3 to 8 segments, both colours and a stalk of both colours; each draw is Blue’s, Red’s or balanced with equal chance, and the app never misses a win, so three wins in a row from new boards shows the choice is known, not guessed.', extension: 'Make a board of three stalks that balances, with no stalk the colour swap of another.', connection: CONNECTION},
    provenance: 'Week 83 Problems 2 and 3 (which boards balance; find a way for the winning colour to win), as rounds choosing a colour or Go second, three wins in a row from new boards, in place of “which balance?”, as the card’s App fit asks.'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Two spots for four stalks',
    parameters: {kind: 'build', given: ['BR', 'BR', 'BRR', 'BRR'], slots: 2, height: 4},
    idea: 'Two BR balance R and two BRR balance RB, so R and RB balance this board; swapping every stalk’s colours would need four spots.',
    prerequisites: 'Puzzles 4, 6 and 7.',
    hints: ['Which boards that balance do you know with BR or BRR in them?', 'Two BR balance one R. What balances two BRR?', 'Build R in one spot and RB in the other.'],
    parent: {notice: 'Whether your child splits the board into parts they already know how to balance.', prompt: 'Why can’t you swap every stalk’s colours here?', explanation: 'BR, BR, BRR and BRR add up to 1/2 + 1/2 + 1/4 + 1/4 = 3/2, so the two spots must add up to −3/2. Two BR balance R (Puzzle 4) and two BRR balance RB (Puzzle 7), so R and RB work; so does RRB alone (−2 + 1/2). Swapping every stalk’s colours would need four spots.', extension: 'Balance the board with a single stalk.', connection: CONNECTION},
    provenance: 'Week 83 Problem 4 (make two balanced boards, each with a stalk of at least two segments), as building with two spots, so that the balances of Problems 2 and 3 do the work; the board is new.'
  }
];

// Hand-worked answers (docs/hackenbush/README.md), which the search must
// match: a duel's winning first cuts, each board's winner, every reply's
// first cuts and winning replies, a round's pool, and a build's balances.
const EXPECTED = {
  'hackenbush-01': {wins: '0:1', value: 1},
  'hackenbush-02': {outcomes: 'B R second B', values: '1 -1 0 1'},
  'hackenbush-03': {wins: '0:1', value: -0.5},
  'hackenbush-04': {replies: 'B:0:0>1:1 R:0:1>1:0 R:2:0>0:0,1:0', value: 0},
  'hackenbush-05': {wins: '0:2', value: -0.25},
  'hackenbush-06': {builds: 11, includes: ['|RBR', 'R|BRR', 'RB|RBB'], value: 0.75},
  'hackenbush-07': {replies: 'B:0:0>1:2 B:2:1>0:2,1:2 R:0:1>1:0,2:1 R:0:2>1:0 R:2:0>0:0,1:0', value: 0},
  'hackenbush-08': {pool: 490, counts: {B: 236, R: 236, second: 18}},
  'hackenbush-09': {builds: 10, includes: ['R|RB', '|RRB'], value: 1.5}
};
const cutKey = m => `${m.stalk}:${m.at}`;
const OBJECTIVE = {duel: 'Leave me nothing to cut. You go first.', streak: 'Choose Blue or Red (I choose who starts) or Go second (I choose my colour and go first), then win. Win 3 games in a row from new boards.'};
const VISIBLE = {duel: 'Leave me nothing to cut.', streak: 'Win 3 games in a row.'};
const BUILD_OBJECTIVE = 'Add stalks so that whoever goes second can always win, whichever colour starts. Then press Check.';
const BUILD_VISIBLE = 'Add stalks so the second player can always win, whichever colour starts.';

export const puzzles = authored.map(item => {
  const q = item.parameters, id = `hackenbush-${String(item.number).padStart(2, '0')}`, want = EXPECTED[id];
  let solution;
  if (q.kind === 'build') {
    const builds = balancingBuilds(q);
    assert.equal(builds.length, want.builds, `${id}: balancing builds`);
    for (const b of want.includes) assert.ok(builds.some(x => x.join('|') === b), `${id}: ${b} balances`);
    for (const b of builds) assert.ok(balances([...q.given, ...b]), `${id}: ${b} balances by search`);
    assert.equal(value(q.given), want.value);
    solution = {givenValue: value(q.given), witness: want.includes[0].split('|').sort((x, y) => (x === '') - (y === '')), balancingBuilds: builds.map(b => b.filter(Boolean)), count: builds.length};
  } else if (q.mode === 'duel') {
    assert.equal(outcome(q.start), q.colour, `${id}: ${q.colour} wins whoever starts`);
    const wins = winningMoves(q.start, q.colour);
    assert.equal(wins.map(cutKey).join(' '), want.wins, `${id}: the winning first cuts`);
    assert.equal(value(q.start), want.value);
    solution = {colour: q.colour, value: value(q.start), winningCuts: wins, leaves: wins.map(m => after(q.start, m))};
  } else if (q.mode === 'boards') {
    const rows = q.boards.map(start => ({start, outcome: outcome(start), choice: bestClaim(start), value: value(start)}));
    assert.equal(rows.map(r => r.outcome).join(' '), want.outcomes, `${id}: winners`);
    assert.equal(rows.map(r => r.value).join(' '), want.values, `${id}: numbers`);
    solution = {boards: rows};
  } else if (q.mode === 'replies') {
    assert.equal(outcome(q.start), 'second', `${id}: the second player wins`);
    const replies = firstCuts(q.start).map(c => {
      const to = after(q.start, c), w = winningMoves(to, other(c.colour));
      assert.ok(w.length, `${id}: a winning reply`);
      return {first: c, leaves: to, replies: w, then: w.map(m => after(to, m))};
    });
    assert.equal(replies.map(r => `${r.first.colour}:${cutKey(r.first)}>${r.replies.map(cutKey).join(',')}`).join(' '), want.replies, `${id}: replies`);
    solution = {value: value(q.start), replies};
  } else {
    const pool = boardPool(q), counts = {B: 0, R: 0, second: 0};
    for (const s of pool) counts[outcome(s)]++;
    assert.equal(pool.length, want.pool, `${id}: pool size`);
    assert.deepEqual(counts, want.counts, `${id}: winners in the pool`);
    solution = {pool: pool.length, counts, balanced: pool.filter(s => outcome(s) === 'second')};
  }
  const mode = q.kind === 'build' ? 'build' : q.mode;
  return {
    id,
    number: item.number,
    title: item.title,
    band: 'all',
    difficulty_level: item.difficulty_level,
    mechanic: q.kind === 'build' ? 'stalkbuild' : 'stalks',
    libraryFamily: 'nim',
    group: 'Stalks',
    familyTitle: 'Pebble Duel',
    revision: 1,
    parameters: q,
    objective: item.objective || (mode === 'build' ? BUILD_OBJECTIVE : OBJECTIVE[mode]),
    visibleObjective: item.visibleObjective ?? (mode === 'build' ? BUILD_VISIBLE : VISIBLE[mode]),
    instruction: item.objective || (mode === 'build' ? BUILD_OBJECTIVE : OBJECTIVE[mode]),
    controls: controls(q),
    rules: rules(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: sources.map(s => s.id)},
    solution,
    provenance: item.provenance,
    // As in Proofs and the other Pebble Duel groups, How to play leaves out
    // the grown-ups' notes, which hold the answers; the Grown-ups catalog
    // still lists them.
    proof: true,
    sourceDocument: 'docs/hackenbush/README.md'
  };
});
export const pack = {title: 'Pebble Duel stalks', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/hackenbush/hackenbush.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.title, JSON.stringify(p.parameters), JSON.stringify(p.solution).slice(0, 200));
}
