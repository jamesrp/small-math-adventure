// Authoring list for Voting and agendas (worksheet Week 87). Computes every
// agenda winner, top cycle, Can't certificate, card filling and fewest move
// with the mechanic's own methods, checks them against the counts in
// docs/votes/README.md, records a solution witness for each puzzle (a list of
// moves played from a fresh board), and writes dist/families/votes/votes.json.
// Run: node scripts/build-votes.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {voteMechanics, knockout, agendas, topCycle, dominant, groupOf, finishes, blanksOf, cardsRefusal, fewest, addSpots, votersRefusal, lineWinner, TICKS} from '../dist/families/votes/votes.js';

const M = voteMechanics.votes;
const FAMILY = 'Voting and agendas';
const SOURCES = ['votes-week87', 'votes-card87', 'votes-math87', 'votes-black'];

// --- Copy --------------------------------------------------------------------
const PAIR_RULE = 'Each voter picks whichever of the two letters is higher on their card. More votes wins.';
const RULES = {
  agenda: [
    PAIR_RULE,
    'The first two letters vote. The winner stays in and meets the next letter, and so on; the last winner wins the knockout.',
    'To show the crowned letter can’t win, ring a group of other letters in which every letter beats every letter outside the group.'
  ],
  cards: [
    'Every card has A, B and C once, favourite at the top.',
    PAIR_RULE,
    'A knockout has a first pair, then the winner meets the letter that waited.'
  ],
  cardsCant: 'To show it can’t be done, tap most of the cards where one letter is above the goal letter.',
  line: [
    'Each voter picks the nearer of two spots. If both are the same distance away, that voter doesn’t vote.',
    'A spot wins when it beats every other spot.'
  ],
  budget: 'Move no more voters than the dots show.',
  add: 'The voters on the line stay put. To show the crowned spot can’t win, tap most of the voters, all on one side of it.'
};
const CONTROLS = {
  agenda: 'Tap letters in the order they join the knockout. The first two vote; each letter after that meets the winner so far. The cards light up the letter each voter picks. Can’t: press it, tap letters to ring a group, then press Check. Undo takes back a letter.',
  cards: 'Tap a letter to write it in the next space on the blank card, top first; tap a written letter to take it off. Vote plays every knockout on the cards.',
  cardsMany: 'Tap a letter to write it in the next space on a blank card, top first; tap a card’s next space to write on that card, and tap a written letter to take it off. Vote plays every knockout on the cards.',
  cant: ' Can’t: press it, tap cards, then press Check.',
  line: 'Tap a voter, then a spot, or drag the voter there; arrow keys move a picked voter. A moved voter leaves a faint mark where it started, and the dots count the voters moved. Vote finds the spot that beats every other spot.',
  add: 'Tap a spot to put the new voter there; tap the new voter and a spot to move it. Vote finds the spot that beats every other spot. Can’t: press it, tap voters, then press Check.',
  play: 'Choose 3 or 5 voters. Write each card by tapping letters, top first; tap a card’s next space to write there, and a written letter to take it off. When every card is full, tap letters to run a knockout. Again clears the knockout.'
};
const PRE = {
  agendaEasy: 'Reading the letters and seeing which of two is higher on a card. A grown-up can read the cards aloud, so K–1 with a grown-up; 2–3 alone.',
  agenda5: 'Counting votes up to five and keeping a pair in mind. Grades 2–3.',
  agendaLong: 'Following a knockout of four or five letters and working backwards from the end. Grades 4–5; 2–3 with a grown-up.',
  cards: 'Writing a card as a ranking, and running a knockout in your head or with the board. Grades 2–3.',
  cardsHard: 'Planning three cards so that every pair vote goes round in a circle. Grades 4–5.',
  line: 'Counting steps along a line from 0 to 10 and comparing two distances. Grades 3–5; 2–3 with a grown-up.',
  lineHard: 'Seeing which voters must change sides of a spot. Grades 4–5.'
};

// --- Puzzles -------------------------------------------------------------------
const agenda = (cards, target) => ({mode: 'agenda', letters: [...cards[0]].sort().join(''), cards, target});
const cardsQ = (cards, goal, cant) => ({mode: 'cards', letters: 'ABC', cards, goal, cant});
const budget = (start, goal, n) => ({mode: 'line', start, goal, budget: n});
const add = (start, goal) => ({mode: 'line', start, goal, add: true});
const word = n => ['no', 'one', 'two', 'three', 'four', 'five'][n];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Three cards', q: agenda(['ABC', 'BCA', 'CAB'], 'A'), wins: 1, pre: PRE.agendaEasy,
    idea: 'On these cards each letter beats one letter and loses to the other, so the letter that waits wins.',
    hints: ['Which letter does A beat? Let that letter win the first vote.', 'A should play last, against the letter it beats.', 'Start with B and C: B wins, then A beats B.'],
    parent: {notice: 'Children often start with A. Watch for the moment they see that A only has to win once, at the end.', prompt: 'Can you make B win? Can you make C win?', explanation: 'A beats B, B beats C and C beats A, each 2 to 1, though every card is a sensible ranking (Condorcet’s paradox). In a knockout of three the letter that waits wins, so A wins exactly when B and C vote first.', extension: 'Find the knockouts for B and for C on paper (Week 87 shared Problem 2).', connection: 'Majority voting need not have a winner; the order of the votes decides.'},
    provenance: 'Week 87 shared Problems 1 and 2: the cards ABC, BCA, CAB and choosing who waits (borrowed).'},
  {number: 2, level: 'easy', title: 'F beats both', q: agenda(['DFE', 'EFD', 'FED'], 'D'), cant: ['F', 'EF'], pre: PRE.agendaEasy,
    idea: 'A letter that beats both others wins every knockout, and its two pair wins prove that the others can’t.',
    hints: ['Try F against D, and then F against E.', 'F beats D and F beats E. Once F plays, what happens?', 'Press Can’t and ring F.'],
    parent: {notice: 'Only one voter puts F first, so children may expect D or E to have a chance.', prompt: 'What happens to F in every knockout?', explanation: 'F beats D 2 to 1 and E 2 to 1. Once F plays it stays, so the winner is F in every knockout, and D can never win. The two pair wins are the whole proof; ringing E and F also works, since both beat D.', extension: 'Change one card so that D can win some knockout.', connection: 'A letter that beats every other letter (a Condorcet winner) wins every agenda.'},
    provenance: 'Week 87 worked example: the cards DFE, EFD, FED with the card-vote rules and the D, E, F knockout (borrowed); the goal of making D win is new.'},
  {number: 3, level: 'easy', title: 'Fill one card', q: cardsQ(['CAB', 'BCA', ''], {kind: 'always', letter: 'C'}, true), finishes: 3, pre: PRE.cards,
    visible: 'Make C win every knockout.',
    idea: 'C already beats A on the two cards; the blank card only decides C against B.',
    hints: ['Who wins C against A on V1 and V2?', 'V1 and V2 split on C against B, so V3 decides it.', 'Write C above B on V3, for example C, A, B.'],
    parent: {notice: 'Children may think C must be at the top of the blank card. A, C, B works too.', prompt: 'Which spaces on the blank card matter, and which don’t?', explanation: 'C beats A 2 to 1 on V1 and V2 whatever V3 says. V1 and V2 split on C against B, so V3 needs C above B: C, A, B or C, B, A or A, C, B. Then C beats both other letters and wins every knockout. 3 of the 6 ways to write the card work.', extension: 'Write the blank card so that B wins every knockout instead. (B must go at the top: B, A, C or B, C, A.)', connection: 'Designing a profile: a letter wins every knockout exactly when it beats each other letter.'},
    provenance: 'Week 87 shared Problem 3 (design cards with a fixed winner), with two cards given (new instance).'},
  {number: 4, level: 'easy', title: 'Move one favourite', q: budget([0, 2, 4, 7, 10], 7, 1), pre: PRE.line,
    idea: 'The middle favourite wins; for 7 to be the middle, one more voter must stand at 7 or to its right.',
    hints: ['Count the voters at 7 or to the right of it.', 'Two voters are at 7 or right of it. A third must join them.', 'Move V3 from 4 to 7.'],
    parent: {notice: 'Now 4 wins. Any of V1, V2 or V3 moved to 7, 8, 9 or 10 makes 7 the winner: 12 ways.', prompt: 'Why does it not matter how far right the moved voter goes?', explanation: 'With five voters the third favourite from the left beats every other spot: against a spot to its left, it and the two favourites to its right all pick it, three votes; the same on the other side (Black’s median voter theorem). 7 has two voters at or right of it, so one voter from the left must move to 7 or beyond. Then 7 is the third favourite.', extension: 'Without moving anyone, which spot wins? (4, line Problem 1.)', connection: 'On a line the median favourite beats every other spot, so only how many voters sit on each side matters.'},
    provenance: 'Week 87 line Problem 1 favourites 0, 2, 4, 7, 10 (borrowed); the reverse goal of making 7 win is the review card’s.'},
  {number: 5, level: 'medium', title: 'Most first places', q: agenda(['ABC', 'ABC', 'BCA', 'CBA', 'CBA'], 'A'), cant: ['B', 'BC'], pre: PRE.agenda5,
    idea: 'A is first on two cards and B on only one, but B beats A and C, 3 to 2 each, so B wins every knockout.',
    hints: ['Count the voters who pick B over A.', 'B beats A 3 to 2 and C 3 to 2.', 'Press Can’t and ring B.'],
    parent: {notice: 'Most first places is not the same as winning: B is first on only one card.', prompt: 'Which letter would win if each voter voted only for their favourite?', explanation: 'A and C are each first on two cards, B on one. But B is above A on three cards and above C on three, so B beats both 3 to 2 and wins every knockout; A can’t win. B alone proves it, and so does the group B and C.', extension: 'Change one card so that A beats B. Can A win now?', connection: 'Plurality (most first places) and pair voting can disagree; a Condorcet winner can have few first places.'},
    provenance: 'New instance, from the week’s theorem that a letter that beats both others wins every knockout (shared Problem 3, upper Problem 1).'},
  {number: 6, level: 'medium', title: 'Four letters', q: agenda(['ABCD', 'BCDA', 'CDAB'], 'D'), wins: 1, pre: PRE.agendaLong,
    idea: 'Work backwards: D beats only A, so D must come last against A, and A beats only B.',
    hints: ['Which letters does D beat?', 'D beats only A, so A must be the winner when D comes in last. Which letter does A beat?', 'Start with B and C, then bring in A, then D.'],
    parent: {notice: 'Of the twelve knockouts only one makes D win; children who work backwards find it quickly.', prompt: 'How did you know D had to come last?', explanation: 'D beats A 2 to 1 and loses to B and C, so D must play last, against A. A beats only B, so A must come in against B; and B beats C. The only knockout is B and C first, then A, then D.', extension: 'Which letters can win some knockout on these cards? (All four.)', connection: 'A letter can win some agenda when it reaches every other letter by a chain of pair wins.'},
    provenance: 'New instance with four letters, extending shared Problem 2’s choice of agenda.'},
  {number: 7, level: 'medium', title: 'B every time?', q: cardsQ(['ABC', 'CAB', ''], {kind: 'always', letter: 'B'}, true), cant: [[0, 1]], pre: PRE.cards,
    visible: 'Make B win every knockout.',
    idea: 'A is above B on both written cards, so A beats B whatever the blank card says.',
    hints: ['Look at A and B on V1 and V2.', 'A is above B on V1 and on V2.', 'Press Can’t and tap V1 and V2.'],
    parent: {notice: 'Some children try every way of writing V3 first; the two written cards already decide it.', prompt: 'Which knockout does B always lose?', explanation: 'A is above B on V1 and V2, so A beats B at least 2 to 1. B loses any knockout where it meets A first, so B can’t win every knockout. V1 and V2 together are the proof.', extension: 'Write V3 so that A wins every knockout. Can C win every knockout too? (A: put A above C. C: put C at the top.)', connection: 'A majority that already agrees decides a pair, whatever the other voters do.'},
    provenance: 'New instance: shared Problem 3’s fixed winner turned into an impossible goal.'},
  {number: 8, level: 'medium', title: 'Not the middle spot', q: budget([9, 1, 10, 6, 0], 5, 1), pre: PRE.line,
    idea: 'The winner is the middle favourite, not the middle of the line: 6 wins, and 5 needs a voter on it.',
    hints: ['Which spot wins now? It isn’t 5.', 'Three voters are at 5 or right of it, but only two at 5 or left of it.', 'Move V4 from 6 to 5.'],
    parent: {notice: 'Moving a voter to 3 or 4 does not help: the voter must land exactly on 5.', prompt: 'Why is 5, the middle of the line, not the winner?', explanation: 'Now 6 wins, the third favourite, not 5 (the middle of the line) or 5.2 (the average). 5 has three voters at or right of it but only two at or left of it, so a voter from the right must move. Anywhere left of 5 would make that spot the middle instead, so the voter lands on 5: V1, V3 or V4 moved to 5.', extension: 'Find the winner for 0, 0, 0, 8, 10 (0: voters who share a spot each still count).', connection: 'Median, not midpoint or mean: the winner depends only on the order of the favourites.'},
    provenance: 'Week 87 line Problem 2, third set (9, 1, 10, 6, 0, numbered out of order as on the worksheet, borrowed); the goal 5 is new.'},
  {number: 9, level: 'medium', title: 'A fifth voter', q: add([1, 3, 7, 9], 5), pre: PRE.line,
    idea: 'Four voters leave no winner; a fifth makes the middle of five, so it must stand on 5.',
    hints: ['With only four voters, does any spot beat every other one?', 'With five voters the middle favourite wins. Where must the new voter stand to be the middle?', 'Put V5 on 5.'],
    parent: {notice: 'V5 on 4 or 6 makes that spot the winner, not 5.', prompt: 'What would win if V5 stood on 8?', explanation: 'With voters at 1, 3, 7 and 9, every spot from 3 to 7 never loses, but none beats every other (line Problem 4). A fifth voter at x makes the winner the middle of five: 3 if x is at most 3, 7 if x is at least 7, and x itself in between. So 5 needs V5 exactly on 5.', extension: 'Which spots can win with one more voter? (3 to 7.)', connection: 'Adding one voter turns a tie between halves into a median.'},
    provenance: 'Week 87 line Problem 4 favourites 1, 3, 7, 9 (borrowed); adding a voter is the review card’s reverse goal.'},
  {number: 10, level: 'hard', title: 'Three in a ring', q: agenda(['ABCD', 'BCAD', 'DCAB'], 'D'), cant: ['ABC'], pre: PRE.agendaLong,
    idea: 'A, B and C each beat D and go round in a circle among themselves, so once one of them plays, the winner stays among them.',
    hints: ['Who beats D?', 'A, B and C each beat D. Is there one letter that beats both others?', 'Press Can’t and ring A, B and C.'],
    parent: {notice: 'No single letter beats all the others here, so no one-letter proof works; children have to find a group.', prompt: 'Why is ringing just A not enough?', explanation: 'A, B and C each beat D 2 to 1, and among themselves A beats B, B beats C and C beats A. Once any of them plays, the survivor is always one of them, so D can only win if it plays first and nobody else plays, which never happens. A, B, C is the top cycle: the smallest group that beats everything outside it.', extension: 'Which letters can win some knockout? Find one for each.', connection: 'The letters that can win some agenda are exactly the top cycle.'},
    provenance: 'New instance; the top-cycle certificate is the review card’s App fit.'},
  {number: 11, level: 'hard', title: 'One agenda in sixty', q: agenda(['EBCDA', 'CDABE', 'ABCED'], 'E'), wins: 1, pre: PRE.agendaLong,
    idea: 'Working backwards from E gives a chain: E beats only D, D beats only A, A beats only B among what is left, and B beats C.',
    hints: ['Which letter does E beat?', 'E beats only D, so E must come last against D. Which letter does D beat?', 'Start with B and C, then A, then D, then E.'],
    parent: {notice: 'Of the 60 knockouts only one makes E win. Trying at random rarely finds it; working backwards does.', prompt: 'Why must E come last?', explanation: 'E beats only D, so E must play last against D. D beats only A, so D comes in against A; A beats only B of the rest, and B beats C. The only knockout is B and C, then A, D and E.', extension: 'Make C win. How many ways are there? (Many: C wins 16 of the 60.)', connection: 'A chain of pair wins ending at the target is an agenda for it.'},
    provenance: 'New instance with five letters.'},
  {number: 12, level: 'hard', title: 'A false group', q: agenda(['EDABC', 'BCAED', 'CABDE'], 'E'), cant: ['ABC'], pre: PRE.agendaLong,
    idea: 'A, B and C beat both D and E, but A, B, C and D is not a proof: E beats D.',
    hints: ['Who beats E? Who beats D?', 'A, B and C each beat D and E. E beats D.', 'Press Can’t and ring A, B and C.'],
    parent: {notice: 'Ringing every letter but E looks safe, but the check refuses it because E beats D.', prompt: 'Why can’t the group be A, B, C and D?', explanation: 'A, B and C each beat D and E, and go round in a circle among themselves. Once one plays, the winner stays among them, so E can’t win. The group A, B, C and D fails because E beats D 2 to 1, so a knockout that brings in E against D keeps E alive.', extension: 'Can D win some knockout? (No: the same group proves it.)', connection: 'Only a group that beats everything outside it is a proof; the smallest one is the top cycle.'},
    provenance: 'New instance with five letters.'},
  {number: 13, level: 'hard', title: 'Waiting wins', q: cardsQ(['', '', ''], {kind: 'waiting'}, false), finishes: 12, pre: PRE.cardsHard,
    visible: 'Make the waiting letter win every knockout.',
    idea: 'The waiting letter always wins exactly when the pair votes go round in a circle.',
    hints: ['For the waiting letter to win, what must each pair vote look like?', 'You need A to beat B, B to beat C and C to beat A, or the other way round.', 'Write A, B, C on V1, B, C, A on V2 and C, A, B on V3.'],
    parent: {notice: 'Children who copy the cards from puzzle 1 are right; the mirror A, C, B / C, B, A / B, A, C works too.', prompt: 'Is there a way that isn’t puzzle 1’s cards or their mirror?', explanation: 'If the waiting letter always wins, each letter beats the one it meets after the other pair, so the pair votes go round: A beats B, B beats C and C beats A, or the reverse. Each card agrees with at most two of the three wins, and each win needs two cards, so every card agrees with exactly two: the cards are A, B, C / B, C, A / C, A, B or A, C, B / C, B, A / B, A, C, in some order. 12 of the 216 ways to write three cards work.', extension: 'Write three different cards on which one letter wins every knockout (shared Problem 3, first half).', connection: 'With three letters and three voters, pair votes are either a ranking with a top letter or a cycle.'},
    provenance: 'Week 87 shared Problem 3, second half, and upper Problem 1 (borrowed task).'},
  {number: 14, level: 'hard', title: 'Two to move', q: budget([1, 4, 4, 4, 9], 8, 2), pre: PRE.lineHard,
    idea: 'Three voters must stand at 8 or to its right, and one of them exactly on 8.',
    hints: ['How many voters must be at 8 or right of it?', 'Two voters must move there, and the third from the left must be exactly 8.', 'Move V2 to 8 and V3 to 9.'],
    parent: {notice: 'Moving two voters to 9 and 10 makes 9 the winner; one of the two must land on 8.', prompt: 'Why can’t one move do it?', explanation: 'Now 4 wins: the three voters on 4 each count. 8 has one voter at or right of it, and a winner needs three, so two must move there; with V5 on 9, the middle favourite is the lower of the two moved, so one of them must be on 8.', extension: 'What is the fewest voters to move so that 1 wins? (2.)', connection: 'Fewest moves is how many voters the spot lacks on its short side.'},
    provenance: 'Week 87 line Problem 2, second set (1, 4, 4, 4, 9, borrowed); the goal is new.'},
  {number: 15, level: 'hard', title: 'Can 8 win?', q: add([1, 3, 7, 9], 8), cant: [[0, 1, 2]], pre: PRE.lineHard,
    idea: 'Three voters left of 8 all pick 7 over 8, wherever the new voter goes.',
    hints: ['Where can V5 stand to make 8 the middle of five?', 'V1, V2 and V3 are all left of 8. Which do they pick, 7 or 8?', 'Press Can’t and tap V1, V2 and V3.'],
    parent: {notice: 'Children may try every spot for V5; the winner is never more than 7.', prompt: 'Which spots can win with one more voter?', explanation: 'V1, V2 and V3 at 1, 3 and 7 are all left of 8, so each is nearer 7 than 8: 7 beats 8 at least 3 to 2, wherever V5 stands. With five voters the winner is the middle favourite, which here is always from 3 to 7.', extension: 'Which spot wins if V5 stands on 10? (7.)', connection: 'A majority on one side of a spot is a certificate that it can’t win.'},
    provenance: 'Week 87 line Problem 4 favourites with the review card’s add-a-voter goal (new instance).'}
];

// --- Answers -------------------------------------------------------------------
const P = {parameters: null};
const play = (q, actions) => {
  const p = {...P, id: 'build', parameters: q};
  let b = M.fresh(p);
  for (const action of actions) { const next = M.move(p, b, action); assert.ok(next, `${JSON.stringify(action)} is legal`); b = next; }
  return {p, b};
};
const subsets = n => Array.from({length: (1 << n) - 1}, (_, m) => Array.from({length: n}, (_, i) => i).filter(i => (m + 1) >> i & 1));
const out = PUZZLES.map(item => {
  const q = item.q;
  let witness, note;
  if (q.mode === 'agenda') {
    const winners = agendas(q.letters).filter(o => knockout(q.cards, o).winner === q.target);
    const top = topCycle(q.cards, q.letters);
    const certs = subsets(q.letters.length).map(s => s.map(i => q.letters[i]).join('')).filter(g => !g.includes(q.target) && dominant(q.cards, q.letters, g));
    if (item.cant) {
      assert.equal(winners.length, 0, `${item.title}: ${q.target} wins no knockout`);
      assert.ok(!top.includes(q.target), `${item.title}: the top cycle leaves ${q.target} out`);
      assert.deepEqual(certs, item.cant, `${item.title}: the certificates`);
      witness = [{type: 'cant', group: top}];
      note = `Can't (${certs.join(', ')})`;
    } else {
      assert.equal(winners.length, item.wins, `${item.title}: ${item.wins} agenda(s) of ${agendas(q.letters).length}`);
      assert.ok(top.includes(q.target) && certs.length === 0);
      witness = [...winners[0]].map(letter => ({type: 'play', letter}));
      note = `${winners.join(', ')} of ${agendas(q.letters).length}`;
    }
  } else if (q.mode === 'cards') {
    const ends = finishes(q, blanksOf(q).map(() => ''));
    if (item.cant) {
      assert.equal(ends.length, 0, `${item.title}: no way to write the blank cards`);
      const certs = subsets(q.cards.length).filter(s => cardsRefusal(q, s) === null);
      assert.deepEqual(certs, item.cant, `${item.title}: the certificates`);
      witness = [{type: 'cant', cards: certs[0]}];
      note = `Can't (${certs.map(s => s.map(i => `V${i + 1}`).join('+')).join(', ')})`;
    } else {
      assert.equal(ends.length, item.finishes, `${item.title}: ${item.finishes} ways`);
      if (q.cant) assert.equal(subsets(q.cards.length).filter(s => cardsRefusal(q, s) === null).length, 0, `${item.title}: no certificate`);
      const blanks = blanksOf(q);
      witness = [...ends[0].flatMap((c, k) => [...c].map(letter => ({type: 'write', card: blanks[k], letter}))), {type: 'vote'}];
      note = `${ends.length} ways, e.g. ${ends[0].join(' ')}`;
    }
  } else if (q.add) {
    const spots = addSpots(q), certs = subsets(q.start.length).filter(s => votersRefusal(q, s) === null);
    if (item.cant) {
      assert.equal(spots.length, 0, `${item.title}: no spot for the new voter`);
      assert.deepEqual(certs, item.cant, `${item.title}: the certificates`);
      witness = [{type: 'cant', voters: certs[0]}];
      note = `Can't (${certs.map(s => s.map(i => `V${i + 1}`).join('+')).join(', ')})`;
    } else {
      assert.deepEqual(spots, [q.goal], `${item.title}: the new voter must stand on ${q.goal}`);
      assert.equal(certs.length, 0);
      witness = [{type: 'put', voter: q.start.length, to: q.goal}, {type: 'vote'}];
      note = `V${q.start.length + 1} on ${spots.join(', ')}`;
    }
  } else {
    const {least, ends} = fewest(q);
    assert.equal(least, q.budget, `${item.title}: fewest moved is ${q.budget}`);
    assert.notEqual(lineWinner(q.start), q.goal);
    const end = ends[0];
    witness = [...end.flatMap((x, i) => x === q.start[i] ? [] : [{type: 'put', voter: i, to: x}]), {type: 'vote'}];
    note = `${least} moved, ${ends.length} ways`;
  }
  const {p, b} = play(q, witness);
  assert.ok(M.solved(p, b), `${item.title}: the witness solves it`);
  const n = String(item.number).padStart(2, '0');
  const rules = q.mode === 'agenda' ? RULES.agenda : q.mode === 'cards' ? [...RULES.cards, ...(q.cant ? [RULES.cardsCant] : [])] : [...RULES.line, q.add ? RULES.add : RULES.budget];
  const controls = q.mode === 'agenda' ? CONTROLS.agenda : q.mode === 'cards' ? (blanksOf(q).length > 1 ? CONTROLS.cardsMany : CONTROLS.cards) + (q.cant ? CONTROLS.cant : '') : q.add ? CONTROLS.add : CONTROLS.line;
  const objective = q.mode === 'agenda' ? `Make ${q.target} win the knockout, or show that it can’t.`
    : q.mode === 'cards' ? (q.goal.kind === 'always' ? `Write the blank card so that ${q.goal.letter} wins every knockout${q.cant ? ', or show that it can’t' : ''}.` : 'Write the three cards so that the letter that waits wins every knockout.')
    : q.add ? `Add a voter so that ${q.goal} wins, or show that it can’t.` : `Move ${word(q.budget)} ${q.budget === 1 ? 'voter' : 'voters'} so that ${q.goal} wins.`;
  console.log(`votes-${n} ${q.mode} ${item.title}: ${note}`);
  return {
    id: `votes-${n}`, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'votes', familyTitle: FAMILY, revision: 1,
    parameters: {...q, witness},
    objective, visibleObjective: item.visible ?? '', instruction: objective, controls, rules,
    idea: item.idea, prerequisites: item.pre, hints: item.hints,
    parent: {...item.parent, sourceIds: SOURCES}, provenance: item.provenance, sourceDocument: 'docs/votes/README.md'
  };
});

const PLAYGROUND = {
  id: 'votes-playground', number: 0, title: 'Voting playground', band: 'playground', difficulty_level: 'playground', mechanic: 'votes', familyTitle: FAMILY, revision: 1,
  parameters: {mode: 'playground', letters: 'ABC', sizes: [3, 5]},
  objective: 'Write voters’ cards, then run knockouts on them.', visibleObjective: '', instruction: 'Write voters’ cards, then run knockouts on them.',
  controls: CONTROLS.play,
  rules: [PAIR_RULE, 'The winner of each vote meets the next letter.'],
  idea: 'Free play: write cards and see which knockouts each letter wins.',
  prerequisites: 'None. A grown-up can copy cards from the worksheet.',
  hints: ['Write A, B, C on every card. Who wins?', 'Write the cards A, B, C / B, C, A / C, A, B and try each letter last.', 'With five voters, can a letter win every knockout without being anyone’s favourite?'],
  parent: {notice: 'The knockout shows each vote’s count, so children can check a claim about who wins.', prompt: 'Can you write cards on which every letter can win?', explanation: 'The playground has no goal and never counts as solved. With three letters, the pair votes either have a letter that beats both others, which wins every knockout, or go round in a circle, where the waiting letter wins.', extension: 'With five voters, can a letter win every knockout when no card puts it first? (No: a card that doesn’t put B first has B above only one other letter, and B needs three cards above A and three above C.)', connection: 'Pair votes form a tournament; a knockout is a path through it.', sourceIds: SOURCES},
  provenance: 'Week 87 shared Problem 3 and the knockout mat (materials).', sourceDocument: 'docs/votes/README.md'
};

const pack = {
  title: FAMILY,
  version: 1,
  families: [{id: 'votes', title: FAMILY, mathematics: 'Each voter ranks the letters on a card, and in a pair vote each voter picks the higher of the two; more votes wins (an odd number of voters, so no ties). A knockout runs a first pair, then the winner meets each waiting letter. With three letters the pair votes either have a letter that beats both others, which wins every knockout, or go round in a circle (Condorcet’s paradox), where the waiting letter wins. In general a letter can win some knockout exactly when it is in the top cycle, the smallest group of letters that beats every letter outside it: such a group that leaves a letter out proves it can’t win, because once a member plays the winner stays in the group, and a letter in the top cycle has a chain of pair wins through it. On a line, where each voter picks the nearer spot, the middle of an odd number of favourites beats every other spot (Black’s median voter theorem), so the fewest voters to move is how many a spot lacks on its short side; four voters leave no winner.', rules: [PAIR_RULE, 'The winner of each vote meets the next letter; the last winner wins.', 'On a line each voter picks the nearer spot, and a spot wins when it beats every other spot.'], sourceIds: SOURCES}],
  sources: [
    {id: 'votes-week87', title: 'Bellingham Math Circle — Week 87: Voting and agendas (worksheets, materials and facilitator guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-87', kind: 'worksheet'},
    {id: 'votes-card87', title: 'Bellingham Math Circle — Week 87 review card (Voting and agendas), October 23, 2026', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-87.md', kind: 'worksheet'},
    {id: 'votes-math87', title: 'Bellingham Math Circle — Week 87 math check (every agenda and profile enumerated)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-87-math.md', kind: 'worksheet'},
    {id: 'votes-black', title: 'Duncan Black — On the Rationale of Group Decision-making, Journal of Political Economy 56 (1948)', url: 'https://doi.org/10.1086/256633', kind: 'research'}
  ],
  puzzles: [PLAYGROUND, ...out]
};
assert.equal(new Set(out.map(p => p.id)).size, out.length);
assert.ok(TICKS === 10);
await writeFile(new URL('../dist/families/votes/votes.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
