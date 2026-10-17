// Builds dist/families/buckets/buckets.json, Pebble Duel's Buckets group
// (worksheet Week 81, Buckets of fish), from the authoring list below. Each
// puzzle's answer is computed here with the module's own search
// (dist/families/buckets/buckets.js), checked against the hand-worked answers
// in docs/buckets/README.md, and checked again by a different method in
// scripts/validate-buckets.mjs.
// Run: node scripts/build-buckets.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {moverWins, winningMoves, firstMoves, after, startPool, secondCards, cardStart, STREAK} from '../dist/families/buckets/buckets.js';

const WEEK81 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-81';
export const sources = [
  {id: 'buckets-week81', title: 'Bellingham Math Circle — Week 81: Buckets of Fish (student packet and adult guide, with its encore)', url: WEEK81, kind: 'local curriculum'},
  {id: 'buckets-card81', title: 'Week 81 review card and math check (App fit and Decision: a Pebble Duel group, the capped game and the take-1-to-3 encore)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-81.md', kind: 'local curriculum'},
  {id: 'buckets-hamkins', title: 'Joel David Hamkins — Buckets of fish! (March 4, 2017): the game, why every play ends, and the parity strategy', url: 'https://jdh.hamkins.org/buckets-of-fish/', kind: 'research'},
  {id: 'buckets-ferguson', title: 'Thomas S. Ferguson — Game Theory, Part I: Impartial Combinatorial Games, §1 (P- and N-positions)', url: 'https://www.math.ucla.edu/~tom/Game_Theory/comb.pdf', kind: 'undergraduate'}
];
export const family = {
  id: 'buckets',
  title: 'Pebble Duel: buckets',
  mathematics: 'Buckets stand in a row, each holding some fish. A move takes one fish from a bucket and may add one fish to each bucket to its left; whoever takes the last fish wins. Every play ends, because the rightmost bucket never gains a fish (and then, by induction, the buckets to its left), even though the number of fish can grow. The second player wins exactly when every bucket holds an even number: a move from such a position makes the bucket it takes from odd, and from any other position exactly one move restores it, taking from the rightmost odd bucket and adding one to each odd bucket on its left. The same holds with no limit on what is added. In the encore a move takes 1, 2 or 3 fish and may add up to 3 to each bucket on the left, and the second player wins exactly when every bucket is a multiple of 4; with adds of only 1 or 2 that fails.',
  rules: [
    'Players take turns. A move takes one fish from a bucket and may then add one fish to each bucket to its left, to some of them, or to none.',
    'In the encore a move takes 1, 2 or 3 fish from one bucket and may add up to 3 fish to each bucket to its left.',
    'Whoever takes the last fish wins. The app never misses a winning move.'
  ],
  sourceIds: sources.map(s => s.id)
};

// How to play opens with the move, then the taps.
const CAPPED = 'A move takes one fish from a bucket and may add one fish to each bucket to its left. Whoever takes the last fish wins.';
const ENCORE = 'A move takes 1, 2 or 3 fish from one bucket and may add up to 3 fish to each bucket to its left. Whoever takes the last fish wins.';
const TAPS = 'Tap a bucket to take a fish from it, tap buckets to its left to add one to each, then End turn. Tap a bucket again to change it.';
const TAPS3 = 'Tap a bucket to take a fish from it, and again to take more, up to 3; tap a bucket to its left to add a fish, and again to add more, up to 3; one more tap puts them back. Then End turn.';
function controls(q) {
  const rule = q.cap > 1 ? ENCORE : CAPPED, taps = q.cap > 1 ? TAPS3 : TAPS;
  if (q.kind === 'sort') return `${rule} Tap a card to mark it, and again to clear it. Play, then a card, tries a game from it against me. That’s all checks every mark at once. While a start is still missing, it says “There is another.” Once none is missing, it is final: if a marked start is one where the first player can win, I go first from it and win, and then the marks are cleared.`;
  if (q.mode === 'duel') return `${rule} ${taps} I reply at once. Undo takes back your move and my reply.`;
  if (q.mode === 'replies') return `${rule} You go second, and I try each first move in turn. ${taps} After a win, Next first move starts the next game; after a loss, Try again replays the same first move.`;
  return `${rule} Choose Me first or You first. ${taps} I reply at once. Win 3 games in a row from new starts. After a loss, Same start again is practice and does not count.`;
}
function rules(q) {
  const out = ['Players take turns.', ...(q.cap > 1
    ? ['A move takes 1, 2 or 3 fish from one bucket.', 'It may then add up to 3 fish to each bucket to its left.']
    : ['A move takes one fish from a bucket.', 'It may then add one fish to each bucket to its left, to some of them, or to none.']),
  'Whoever takes the last fish wins.', 'The app never misses a winning move.'];
  if (q.kind === 'sort') return [...out, 'A start is a card with 0 to 3 fish in each of two buckets, not both empty.', 'While a start is still missing, That’s all says “There is another.”', 'Once none is missing, That’s all is final: if a marked start is one where the first player can win, I go first from it and win, and then the marks are cleared.'];
  if (q.mode === 'duel') return [...out, 'You go first.'];
  if (q.mode === 'replies') return [...out, `You go second from ${q.start.join(' and ')}, and I try each first move in turn. Win every game.`];
  return [...out, 'Before each game, choose who starts.', 'Win 3 games in a row. Only games from a new start count; Same start again is for practice.'];
}

const PARITY = 'The second player wins exactly when every bucket holds an even number of fish. A move from such a position makes the bucket it takes from odd, so it always leaves an odd bucket. From any other position, take a fish from the rightmost odd bucket and add one to each odd bucket on its left (and none to the even ones): every bucket is even again, and this is the only move that does it. Every play ends (the rightmost bucket never gains a fish), so whoever keeps every bucket even takes the last fish.';
const FOURS = 'With takes of 1, 2 or 3 and adds of up to 3, the second player wins exactly when every bucket is a multiple of 4. A move from such a position changes the bucket it takes from by 1 to 3, so it is no longer a multiple of 4. From any other position, take from the rightmost bucket that is not a multiple of 4 what is over the last multiple of 4, and add to each bucket on its left what it lacks of the next one (0 to 3): every bucket is a multiple of 4 again, and only that move does it. The adds of up to 3 matter: with adds of at most 1 or 2 the rule fails, already at 1 and 1.';
const CONNECTION = 'A normal-play impartial game: a start is lost for the player to move exactly when every move reaches a start that is won (Ferguson, §1). Hamkins’s buckets of fish show a game whose positions grow yet every play ends, by an ordinal ω^(n−1)·a_n + … + a_1 that drops at every move; parity in each bucket decides who wins.';
const STREAK_HINTS = (fours = false) => [
  'Lost a game? Same start again replays that start. Watch what I leave you.',
  fours ? 'When I won, how many fish did I leave in each bucket?' : 'When I won, look at the buckets I left you after each of my moves. What do they have in common?',
  fours ? 'Can the fish in every bucket I left you be shared into groups of four?' : 'Can the fish in every bucket I left you be paired up?'
];
const STREAK_PARENT = {
  notice: 'Whether your child decides who starts by looking at the buckets before playing, rather than by who won last time.',
  prompt: 'From which starts would you rather go second? How can you tell?'
};

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: '0, 0 and 1',
    parameters: {mode: 'duel', start: [0, 0, 1], cap: 1, takes: 1},
    idea: 'Adding fish is allowed, never required. From 0, 0 and 1, take the fish and add nothing: then I have no move.',
    prerequisites: 'Count to 3. A grown-up can read how a move works.',
    hints: ['After your move, what can I do?', 'If you leave me a fish, I can take it.', 'Take the fish from bucket 3, and add nothing.'],
    parent: {notice: 'Whether your child adds fish because the rule allows it, and changes course after I take a fish they gave me.', prompt: 'Why did adding a fish lose?', explanation: 'The only fish is in bucket 3, so the first move takes it and may add one fish to bucket 1, bucket 2, both or neither. Adding nothing leaves no fish, and the second player cannot move. Any addition leaves a bucket with one fish, which I take, and then you cannot move. Adding is a choice, and here the winning choice is none.', extension: 'From 0, 1 and 0, which move wins?', connection: CONNECTION},
    provenance: 'Week 81 Problem 1 (the start 0, 0 and 1: which starts let the first player win whatever the second player does?), as a duel against a perfect opponent.'
  },
  {
    number: 2, difficulty_level: 'easy', title: '2, 1 and 1',
    parameters: {mode: 'duel', start: [2, 1, 1], cap: 1, takes: 1},
    idea: 'The winning move takes from bucket 3 and adds to bucket 2 but not to bucket 1, leaving 2, 2 and 0.',
    prerequisites: 'Puzzle 1. Count to 6.',
    hints: ['Try a move. When I win, Undo and look at what I left you each time.', 'Which buckets did I leave you when I won? Leave me buckets like those.', 'Take a fish from bucket 3 and add one to bucket 2 only.'],
    parent: {notice: 'Whether your child compares the buckets I leave after my moves, and tries leaving me something like them.', prompt: 'Why does adding to bucket 1 as well lose?', explanation: `${PARITY} From 2, 1 and 1 the rightmost odd bucket is bucket 3, and bucket 2 is the only odd bucket on its left: take from 3 and add to 2, leaving 2, 2 and 0.`, extension: 'From 2, 2 and 2, would you rather go first or second?', connection: CONNECTION},
    provenance: 'Week 81 Problem 1 (the start 2, 1 and 1), as a duel against a perfect opponent.'
  },
  {
    number: 3, difficulty_level: 'medium', title: 'Replies to 2 and 2',
    parameters: {mode: 'replies', start: [2, 2], cap: 1, takes: 1},
    objective: 'You go second from 2 and 2. I try each of my first moves in turn. Win every game.',
    visibleObjective: 'Go second from 2 and 2. Win against each of my first moves.',
    idea: 'Going second from 2 and 2 wins against every first move: answer 1 and 2 with 0 and 2, answer 2 and 1 with 2 and 0, and answer 3 and 1 with 4 and 0.',
    prerequisites: 'Puzzles 1 and 2.',
    hints: ['After my first move, which buckets would you like to leave me?', 'You started from 2 and 2, a start you can win going second. Leave me something like it.', 'After each of my moves, make every bucket pair up again.'],
    parent: {notice: 'Whether your child answers each first move by restoring a position like the start, rather than by trying moves at random.', prompt: 'Why can I never win from 2 and 2 if I go first?', explanation: `${PARITY} From 2 and 2 my three first moves leave 1 and 2, 2 and 1, or 3 and 1, and each has one winning reply: 0 and 2, 2 and 0, 4 and 0.`, extension: 'Is 2 and 4 a start you would rather hand over?', connection: CONNECTION},
    provenance: 'Week 81 Problem 2 (the card 2 and 2, a second-player start), as every reply: the app tries each of its three first moves, as the card’s App fit asks.'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Two buckets of 0 to 3',
    parameters: {kind: 'sort'},
    objective: 'Mark every start where you would rather go second, then press That’s all.',
    visibleObjective: 'Mark every start where you would rather go second.',
    idea: 'Of the fifteen cards, 2 and 0, 0 and 2, and 2 and 2 are the starts where you would rather go second.',
    prerequisites: 'Puzzles 1–3. Count to 3.',
    hints: ['Use Play to try a card both ways. Which cards can you win going second?', 'A start is one to mark when every move from it reaches a start that is not marked.', 'Start with the cards with the fewest fish.'],
    parent: {notice: 'Whether your child decides each card by playing it, starting from the cards with the fewest fish, or marks a guessed pattern.', prompt: 'How do you know there is no other?', explanation: `${PARITY} So among the fifteen cards the second-player starts are 2 and 0, 0 and 2, and 2 and 2. While a start is missing, That’s all says only “There is another.”, with no count, even if a wrong card is marked too. Once none is missing, a wrong That’s all is final: the app goes first from the wrong card, wins, and clears the marks.`, extension: 'Which three-bucket starts with 0 to 3 fish would you rather hand over? (There are seven.)', connection: CONNECTION},
    provenance: 'Week 81 Problem 2 (sort the sixteen two-bucket cards into starts the first player can force and starts the second player can force); the empty card is left out.'
  },
  {
    number: 5, difficulty_level: 'medium', title: '3, 3 and 1',
    parameters: {mode: 'duel', start: [3, 3, 1], cap: 1, takes: 1},
    idea: 'Here the winning move adds to two buckets: take from bucket 3 and add one to buckets 1 and 2, leaving 4, 4 and 0.',
    prerequisites: 'Puzzles 2–4.',
    hints: ['Which buckets would you like to leave me? Think of the starts where you would rather go second.', 'Leave me a start like 2 and 2, or 2, 2 and 2.', 'Take a fish from bucket 3 and add one to buckets 1 and 2.'],
    parent: {notice: 'Whether your child uses the starts found in Every start, and sees that the winning move has to add to both buckets.', prompt: 'Is there another winning move?', explanation: `${PARITY} From 3, 3 and 1 all three buckets are odd: take from bucket 3 and add to buckets 1 and 2, leaving 4, 4 and 0.`, extension: 'From 1, 2 and 2, which move wins?', connection: CONNECTION},
    provenance: 'Week 81 Problem 3 (the start 3, 3 and 1, whose winning move adds to two buckets), as a duel against a perfect opponent.'
  },
  {
    number: 6, difficulty_level: 'hard', title: 'Three buckets of 0 to 3',
    parameters: {mode: 'streak', buckets: 3, max: 3, cap: 1, takes: 1, streak: STREAK},
    idea: 'Let me start exactly when every bucket is even: 0, 0 and 2; 0, 2 and 0; 2, 0 and 0; 0, 2 and 2; 2, 0 and 2; 2, 2 and 0; 2, 2 and 2.',
    prerequisites: 'Puzzles 1–5.',
    hints: STREAK_HINTS(),
    parent: {...STREAK_PARENT, explanation: `${PARITY} Starts are drawn from every three-bucket start with 0 to 3 fish in each, except those one move from the end, half of them from the seven all-even starts, and the app never misses a win, so three wins in a row from new starts shows the rule is known, not guessed.`, extension: 'Does the rule change with four buckets?', connection: CONNECTION},
    provenance: 'Week 81 Problems 1 and 3 (play from three-bucket starts; can you find a rule for choosing a winning move?), as a who-starts round, as the card’s App fit asks (half the starts all-even).'
  },
  {
    number: 7, difficulty_level: 'hard', title: 'Up to 3: 3 and 6',
    parameters: {mode: 'duel', start: [3, 6], cap: 3, takes: 3},
    objective: 'Take the last fish to win. You go first. A move takes 1, 2 or 3 fish and adds up to 3 to each bucket to its left.',
    visibleObjective: 'Take 1, 2 or 3 at a time, add up to 3 to each bucket on the left, and take the last fish.',
    idea: 'With takes of 1 to 3 and adds of up to 3, the starts to hand over are those where every bucket is a multiple of 4. From 3 and 6, take 2 from bucket 2 and add 1 to bucket 1, leaving 4 and 4.',
    prerequisites: 'Puzzles 1–6. Counting in fours helps.',
    hints: ['Try a move. When I win, Undo and look at what I left you.', 'When I won, how many fish did I leave in each bucket?', 'Take 2 from bucket 2 and add 1 to bucket 1, leaving 4 and 4.'],
    parent: {notice: 'Whether your child looks for a new kind of start to hand over, rather than keeping every bucket even.', prompt: 'Why does 2 and 2 no longer win for the second player?', explanation: `${FOURS} From 3 and 6, take 2 from bucket 2 (leaving 4) and add 1 to bucket 1 (making 4).`, extension: 'What if a move could take 1 to 4 and add up to 4?', connection: `${CONNECTION} The encore is the same argument with 4 in place of 2.`},
    provenance: 'Week 81 guide, encore (take 1, 2 or 3 and refill up to 3 to the left; multiples of four as the new losing target), as a duel; the start is new.'
  },
  {
    number: 8, difficulty_level: 'hard', title: 'Up to 3: two buckets of 0 to 5',
    parameters: {mode: 'streak', buckets: 2, max: 5, cap: 3, takes: 3, streak: STREAK},
    objective: 'Choose who starts, then take the last fish. A move takes 1, 2 or 3 fish and adds up to 3 to each bucket to its left. Win 3 games in a row from new starts.',
    visibleObjective: 'Take 1, 2 or 3 at a time, add up to 3 to each bucket on the left, and win 3 games in a row.',
    idea: 'Let me start exactly when every bucket is a multiple of 4: 4 and 0, 0 and 4, 4 and 4.',
    prerequisites: 'Puzzle 7. Counting in fours helps.',
    hints: STREAK_HINTS(true),
    parent: {...STREAK_PARENT, explanation: `${FOURS} Starts are drawn from every two-bucket start with 0 to 5 fish in each, except those one move from the end, half of them from 4 and 0, 0 and 4, and 4 and 4.`, extension: 'Which three-bucket starts with 0 to 5 fish would you hand over?', connection: `${CONNECTION} The encore is the same argument with 4 in place of 2.`},
    provenance: 'Week 81 guide, encore (multiples of four as the new losing target), as a who-starts round; the start range is new.'
  }
];

// Hand-worked answers (docs/buckets/README.md), which the search must match:
// a duel's one winning first move, every reply's first moves and winning
// replies, the cards and the second-player starts of a round.
const EXPECTED = {
  'buckets-01': {wins: '3:1:0,0,0'},
  'buckets-02': {wins: '3:1:0,1,0'},
  'buckets-03': {replies: '1,2>0,2 2,1>2,0 3,1>4,0'},
  'buckets-04': {cards: '2,0 0,2 2,2'},
  'buckets-05': {wins: '3:1:1,1,0'},
  'buckets-06': {second: '0,0,2 0,2,0 0,2,2 2,0,0 2,0,2 2,2,0 2,2,2', pool: 60},
  'buckets-07': {wins: '2:2:1,0'},
  'buckets-08': {second: '0,4 4,0 4,4', pool: 29}
};
const moveKey = m => `${m.from}:${m.take}:${m.add.join(',')}`;
const OBJECTIVE = {duel: 'Take the last fish to win. You go first.', streak: 'Choose who starts, then take the last fish. Win 3 games in a row from new starts.'};
const VISIBLE = {duel: 'Take the last fish.', streak: 'Win 3 games in a row.'};

export const puzzles = authored.map(item => {
  const q = item.parameters, id = `buckets-${String(item.number).padStart(2, '0')}`, want = EXPECTED[id];
  let solution;
  if (q.kind === 'sort') {
    solution = {cards: secondCards(), starts: secondCards().map(cardStart), count: 15};
    assert.equal(solution.starts.map(s => s.join()).join(' '), want.cards, `${id}: the cards match`);
  } else if (q.mode === 'duel') {
    assert.ok(moverWins(q, q.start), `${id}: the first player wins`);
    const wins = winningMoves(q, q.start);
    assert.equal(wins.map(moveKey).join(' '), want.wins, `${id}: the one winning first move`);
    solution = {winningMoves: wins, leaves: wins.map(m => after(q.start, m))};
  } else if (q.mode === 'replies') {
    assert.equal(moverWins(q, q.start), false, `${id}: the second player wins`);
    const replies = firstMoves(q).map(m => { const to = after(q.start, m), w = winningMoves(q, to); assert.equal(w.length, 1, `${id}: one winning reply`); return {first: m, leaves: to, reply: w[0], then: after(to, w[0])}; });
    assert.equal(replies.map(r => `${r.leaves}>${r.then}`).join(' '), want.replies, `${id}: replies`);
    solution = {replies};
  } else {
    const pool = startPool(q), second = pool.filter(s => !moverWins(q, s));
    assert.equal(pool.length, want.pool, `${id}: pool size`);
    assert.equal(second.map(s => s.join()).sort().join(' '), want.second, `${id}: second-player starts`);
    solution = {secondStarts: second, pool: pool.length};
  }
  const mode = q.kind === 'sort' ? null : q.mode;
  return {
    id,
    number: item.number,
    title: item.title,
    band: 'all',
    difficulty_level: item.difficulty_level,
    mechanic: q.kind === 'sort' ? 'bucketsort' : 'buckets',
    libraryFamily: 'nim',
    group: 'Buckets',
    familyTitle: 'Pebble Duel',
    revision: 1,
    parameters: q,
    objective: item.objective || OBJECTIVE[mode],
    visibleObjective: item.visibleObjective ?? VISIBLE[mode],
    instruction: item.objective || OBJECTIVE[mode],
    controls: controls(q),
    rules: rules(q),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: ['buckets-week81', 'buckets-card81', 'buckets-hamkins', 'buckets-ferguson']},
    solution,
    provenance: item.provenance,
    // As in Proofs and the Star race, How to play leaves out the grown-ups'
    // notes, which hold the answers; the Grown-ups catalog still lists them.
    proof: true,
    sourceDocument: 'docs/buckets/README.md'
  };
});
export const pack = {title: 'Pebble Duel buckets', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/buckets/buckets.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.title, JSON.stringify(p.parameters), JSON.stringify(p.solution).slice(0, 160));
}
