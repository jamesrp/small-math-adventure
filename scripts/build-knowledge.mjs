// Authoring list for Who knows (worksheet Week 84, public knowledge).
// Computes each puzzle's answers with the mechanic's own helpers (the cards
// left after every step of a conversation or a list of rounds, the round in
// which every blue doll proves, the conversations of the café), checks them
// against the table in docs/knowledge/README.md and writes
// dist/families/knowledge/knowledge.json. Run: node scripts/build-knowledge.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fitTables, coachRun, conversations, worlds} from '../dist/families/knowledge/knowledge.js';

const sources = ['knowledge-week84', 'knowledge-card84', 'knowledge-hamkins'];
const people = n => Array.from({length: n}, (_, i) => i + 1).join(', ');
const CAFE_RULES = n => [
  'Each person sees only their own card: YES if they want a cup, NO if not. Everyone knows the cards could be dealt any way.',
  `In order, people ${people(n)} answer “Does everyone want a cup?”: YES or NO when their own card and the earlier answers settle it, NOT YET otherwise.`,
  'The cards on the table are the deals still possible. After each answer, remove every card on which that person would have answered differently, then press Next.'
];
const DOLL_RULES = ({least, mode, cant}) => [
  'Each doll wears a blue (B) or red (R) headband. It sees the other dolls’ headbands but not its own.',
  'The cards on the table are the arrangements still possible.',
  ...(least ? [`First everyone hears “${least === 1 ? 'At least one headband is blue' : 'At least two headbands are blue'}.” Remove the cards it rules out, then press Next.`] : []),
  'A doll shows Prove blue only when every card that matches what it sees gives it blue. Otherwise it shows Not yet.',
  mode === 'fit'
    ? 'You can’t see the headbands. After each round, remove every card that would have given different replies, then press Next.'
    : 'Choose every doll’s reply from the cards on the table, without removing any, and press Show: the replies are shown together. Then remove every card that would have given different replies, and press Next for the next round.',
  ...(cant ? ['Can’t says the blue dolls will never all prove blue.'] : [])
];
const CONTROLS = {
  fit: 'Tap a card to take it off the table; tap it again to put it back. Next checks the cards for the answer it is on, and That’s all the last one. Undo takes back the last move.',
  design: 'Tap Yes, No or Not yet for the next person. Then tap the cards that answer rules out and press Next. Again starts a new conversation. Undo takes back the last move.',
  coach: 'Tap a doll to choose its reply (its own headband is hidden), then Not yet or Prove blue. Show reveals the replies together. Tap a card to take it off the table, again to put it back, and Next checks the cards. Undo takes back the last move.',
  playground: 'Choose how many dolls, tap the headbands above the dolls to change them, and switch the announcement on or off. Then play rounds as in the puzzles. Again starts over with the same dolls.'
};
const OBJECTIVE = {
  fit: ['Remove every deal that doesn’t fit the answers, one answer at a time, pressing Next after each and That’s all after the last.', 'Remove every deal that doesn’t fit.'],
  design: ['Choose each person’s answer so that exactly two deals fit the conversation, removing the deals each answer rules out.', 'Make answers that exactly two deals fit.'],
  coach: ['Choose each doll’s reply from the cards on the table, show the replies together, then remove the cards they rule out, until every blue doll proves blue.', 'Keep going until every blue doll proves blue.'],
  cant: ['Choose each doll’s reply from the cards on the table, show the replies together, then remove the cards they rule out, until every blue doll proves blue. If that can never happen, press Can’t.', 'Keep going until every blue doll proves blue.']
};
const PREREQ = {
  cafe2: 'No arithmetic. A grown-up reads the question and the answers; the child compares one person’s view with four cards.',
  dolls2: 'No arithmetic. A grown-up reads How to play; the child compares what one doll sees with up to four cards.',
  cafe3: 'No arithmetic. Read YES, NO and NOT YET, or have a grown-up read them; compare one person’s view with up to eight cards, one card at a time.',
  dolls3: 'No arithmetic. Read the two replies, or have a grown-up read them; compare what one doll sees with up to eight cards, then each card’s replies with the ones shown.',
  design: 'Plan a whole conversation from what each answer does to the table; trying, undoing and trying again is part of it.',
  rounds: 'Keep a round in mind while checking several cards; the cards carry the bookkeeping. Grades 4–5 or a quick grade 3.',
  four: 'Four dolls and up to sixteen cards: patient checking of one card at a time. Grades 4–5.'
};

const N = 'notyet', P = 'prove';
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two at the café', q: {kind: 'cafe', mode: 'fit', n: 2, said: [N, 'yes']}, check: {left: ['YY']}, prereq: 'cafe2',
    idea: 'A NOT YET from person 1 tells everyone their card is YES; then person 2 can answer for sure.',
    hints: ['Start with person 1. On which cards would person 1 answer NOT YET?', 'With a NO card, person 1 knows at once that not everyone wants a cup.', 'After person 1, look at each card left: would person 2 say YES on it?'],
    parent: {notice: 'Whether your child sees why person 1 can’t answer YES straight away.', prompt: 'Why did person 1 say NOT YET?', explanation: 'Person 1 sees only their own card. With NO they know at once that not everyone wants a cup and would say NO; with YES they can’t tell yet. So NOT YET removes the two cards where person 1 has NO. Person 2 heard that, and with a YES card knows everyone wants one: YES. On YES NO person 2 would say NO, so it goes. Only YES YES fits.', extension: 'What would the two people say with YES NO? (NOT YET, then NO.) With NO YES? (NO, NO.)', connection: 'Each card is a possible world. Someone knows a fact when every card that fits what they can see agrees on it; an answer everyone hears removes the cards on which it would have been different (a public announcement, in epistemic logic).'},
    provenance: 'Week 84 page 1 (the two-person café of the worked example) and the guide’s K–1 route (two children play the café, then sort the four two-person deals by conversation): conversation NOT YET, YES.'},
  {number: 2, level: 'easy', title: 'A first NO', q: {kind: 'cafe', mode: 'fit', n: 2, said: ['no', 'no']}, check: {left: ['NY', 'NN']}, prereq: 'cafe2',
    idea: 'After a NO, everyone knows the answer, so a later NO tells nothing about the speaker’s card.',
    hints: ['Person 1 says NO. On which cards would they?', 'After person 1’s NO, does person 2 still need their own card to answer?', 'Check each card left: would person 2 say NO on it?'],
    parent: {notice: 'Whether your child expects person 2’s NO to remove a card.', prompt: 'Does person 2’s NO tell you person 2’s card?', explanation: 'Person 1 says NO only with a NO card, so YES YES and YES NO go. Then everyone knows the answer is NO, and person 2 says NO whatever their card: on NO YES and on NO NO alike, so nothing is removed. Two deals fit, and nobody learns person 2’s card.', extension: 'Make the conversation with three people that starts with NO. How many deals fit it? (Puzzle 6: four.)', connection: 'A later NO is not evidence about the speaker’s own card once the answer is known to everyone: in the café, after the first NO, later answers reveal nothing.'},
    provenance: 'Week 84 page 1 worked example (person 1 says NO, leaving NO YES and NO NO) and the guide’s K–1 route: conversation NO, NO.'},
  {number: 3, level: 'easy', title: 'Two dolls', q: {kind: 'dolls', mode: 'coach', n: 2, deal: 'RB', least: 1}, check: {proved: 1}, prereq: 'dolls2',
    idea: 'A doll that sees no blue knows, after the announcement, that it must be the blue one.',
    hints: ['First remove the card the announcement rules out.', 'Doll 2 sees a red headband on doll 1. Which cards on the table match that?', 'Doll 1 sees blue on doll 2. Is there a card left where doll 1 is red?'],
    parent: {notice: 'Whether your child chooses a doll’s reply from the cards, with its own headband hidden, or from what they remember of it.', prompt: 'Why can doll 2 be sure, but not doll 1?', explanation: 'Everyone heard that at least one headband is blue, so RR leaves the table. Doll 1 sees blue on doll 2: BB and RB both match, and on RB doll 1 is red, so NOT YET. Doll 2 sees red on doll 1: only RB matches, so PROVE BLUE. Doll 2 is the only blue doll, so the round is done.', extension: 'Which cards would this round have removed? (BB, which gives NOT YET twice, and BR, which gives PROVE BLUE, NOT YET.)', connection: 'The muddy children puzzle with two children: a doll that sees no blue proves blue in round 1.'},
    provenance: 'Week 84 page 2 worked example (two dolls, deal RB: doll 1 NOT YET, doll 2 PROVE BLUE), as a puzzle.'},
  {number: 4, level: 'easy', title: 'Two blue dolls', q: {kind: 'dolls', mode: 'coach', n: 2, deal: 'BB', least: 1}, check: {proved: 2}, prereq: 'dolls2',
    idea: 'Silence is evidence: a round of NOT YET removes the cards on which someone would have known.',
    hints: ['Remove the card the announcement rules out, then choose both replies from the cards left.', 'Each doll sees blue. Is there a card where it would be red?', 'On BR, what would doll 2 have shown?'],
    parent: {notice: 'Whether your child is surprised that a round where nobody proves anything still removes cards.', prompt: 'What did the dolls learn when neither could prove blue?', explanation: 'Round 1: each doll sees blue and still has a card where it is red (BR for doll 2, RB for doll 1), so both show NOT YET. On BR doll 2 would have proved blue, and on RB doll 1 would have, so those cards give other replies and go. Only BB is left, and in round 2 both prove blue.', extension: 'With three blue dolls, how many rounds? (Puzzle 10: three.)', connection: 'Two blue dolls prove in round 2: the first step of the induction behind the muddy children puzzle.'},
    provenance: 'New, the two-doll case between page 2’s worked example and Problem 2’s three-doll deals.'},
  {number: 5, level: 'medium', title: 'Three at the café', q: {kind: 'cafe', mode: 'fit', n: 3, said: [N, N, 'no']}, check: {left: ['YYN']}, prereq: 'cafe3',
    idea: 'Each NOT YET says the speaker’s card is YES; the first NO then settles the last card.',
    hints: ['Answer by answer: on which cards would person 1 say NOT YET?', 'Person 2 has heard person 1. On which cards left would person 2 know the answer already?', 'Person 3 says NO. Would they on YES YES YES?'],
    parent: {notice: 'Whether your child removes cards answer by answer or tries to see the whole conversation at once.', prompt: 'How do you know person 3’s card is NO?', explanation: 'Person 1’s NOT YET removes the four deals where their card is NO. Person 2’s NOT YET removes YES NO YES and YES NO NO, where person 2 would already know the answer is NO. Person 3 says NO: on YES YES YES they would have said YES, so it goes. Only YES YES NO fits.', extension: 'What conversation does YES YES YES give? (NOT YET, NOT YET, YES.)', connection: 'The Logic Café puzzle (“Does everyone want a drink?”), in Hamkins’s presentation of the classic.'},
    provenance: 'Week 84 Problem 1, Conversation 1 (NOT YET, NOT YET, NO).'},
  {number: 6, level: 'medium', title: 'NO, NO, NO', q: {kind: 'cafe', mode: 'fit', n: 3, said: ['no', 'no', 'no']}, check: {left: ['NYY', 'NYN', 'NNY', 'NNN']}, prereq: 'cafe3',
    idea: 'After the first NO the answer is known to everyone, and later answers remove nothing.',
    hints: ['On which cards would person 1 say NO?', 'Once person 1 has said NO, what does person 2 know about the answer?', 'If no card would give a different answer, nothing needs removing: press Next.'],
    parent: {notice: 'Whether your child presses Next without removing anything, or hunts for a card to remove.', prompt: 'What do you know about persons 2 and 3?', explanation: 'Person 1’s NO removes the four deals where their card is YES. From then on everyone knows the answer is NO and says it whatever their card, so persons 2 and 3 remove nothing. All four deals that start with NO fit; only person 1’s card is known.', extension: 'Which conversation leaves exactly two deals? (Puzzle 9.)', connection: 'Once a fact is common knowledge, announcing it again changes no one’s knowledge: the table stays the same.'},
    provenance: 'Week 84 Problem 1, Conversation 2 (NO, NO, NO).'},
  {number: 7, level: 'medium', title: 'One blue', q: {kind: 'dolls', mode: 'coach', n: 3, deal: 'BRR', least: 1, cant: true}, check: {proved: 1}, prereq: 'dolls3',
    idea: 'With one blue headband, the blue doll sees two reds and proves blue at once.',
    hints: ['Remove the card the announcement rules out first.', 'Doll 1 sees two reds. Which cards match that?', 'Doll 2 sees blue and red. Is there a card that matches where doll 2 is red?'],
    parent: {notice: 'Whether your child checks every matching card for a doll, or decides from one.', prompt: 'Why can’t doll 2 prove anything yet?', explanation: 'After RRR leaves, doll 1 sees two reds and only BRR matches, so it proves blue. Doll 2 sees blue and red: BBR and BRR match, and doll 2 is red on BRR, so NOT YET; doll 3 has BRB and BRR, so NOT YET. The only blue doll proves in round 1.', extension: 'If the round went on, which cards would leave? (Every card but BRR.)', connection: 'The base case of the induction: one blue proves in round 1.'},
    provenance: 'Week 84 Problem 2, Deal 1 (B R R).'},
  {number: 8, level: 'medium', title: 'Two blue', q: {kind: 'dolls', mode: 'coach', n: 3, deal: 'BBR', least: 1, cant: true}, check: {proved: 2}, prereq: 'dolls3',
    idea: 'Two blue dolls prove in round 2, because nobody proved in round 1.',
    hints: ['After the announcement, choose all three replies from the seven cards.', 'After round 1, which cards would have had a doll proving blue?', 'In round 2, which cards match what doll 1 sees?'],
    parent: {notice: 'Whether your child keeps the table unchanged while choosing the three replies, and removes cards only after Show.', prompt: 'How did doll 1 know in round 2 what it didn’t know in round 1?', explanation: 'Round 1: doll 1 has BBR and RBR, doll 2 has BBR and BRR, doll 3 has BBR and BBB, so all show NOT YET. On BRR, RBR and RRB one doll would have proved blue, so those three go. Round 2: doll 1 sees blue and red and RBR is gone, so it proves; so does doll 2; doll 3 still has BBR and BBB: NOT YET. Both blue dolls prove in round 2.', extension: 'Why would removing cards after each doll’s reply, one at a time, go wrong? (Doll 1’s NOT YET would remove BRR before doll 2 replies, and doll 2 would prove in round 1.)', connection: 'The induction step: k blue dolls first prove in round k, because each would have proved a round earlier if it were red.'},
    provenance: 'Week 84 Problem 2, Deal 2 (B B R).'},
  {number: 9, level: 'hard', title: 'Exactly two', q: {kind: 'cafe', mode: 'design', n: 3, target: 2}, check: {said: [N, 'no', 'no'], left: ['YNY', 'YNN']}, prereq: 'design',
    idea: 'A conversation pins down every card up to the first NO and nothing after it.',
    hints: ['Try a conversation and see how many deals are left at the end.', 'After a NO, the later answers remove nothing. Who should say the first NO?', 'If person 1 says NO, four deals are left. Try a NOT YET first.'],
    parent: {notice: 'Whether your child plans from the earlier puzzles (one deal, four deals) or tries answers until two are left.', prompt: 'Which conversations can happen at all, and how many deals fit each?', explanation: 'Only four conversations can happen: NOT YET, NOT YET, YES (one deal), NOT YET, NOT YET, NO (one), NOT YET, NO, NO (two) and NO, NO, NO (four), and 1 + 1 + 2 + 4 = 8. Exactly two deals fit when person 2 says the first NO: person 1’s card is YES, person 2’s is NO, and person 3’s is never revealed. The app refuses an answer no card on the table gives, such as a YES from person 1.', extension: 'With four people, which conversation leaves exactly two deals? (Only NOT YET, NOT YET, NO, NO: the first NO must come from person 3.)', connection: 'Two hidden deals with the same public conversation: the encore in the Week 84 guide.'},
    provenance: 'The card’s App fit (design a conversation fitting exactly two deals) and the Week 84 guide’s encore (two hidden café arrangements with the same conversation).'},
  {number: 10, level: 'hard', title: 'Three blue', q: {kind: 'dolls', mode: 'coach', n: 3, deal: 'BBB', least: 1, cant: true}, check: {proved: 3}, prereq: 'rounds',
    idea: 'Three blue dolls prove in round 3: each silent round removes the cards with one more blue.',
    hints: ['Play round 1 as in puzzle 8: which cards go after three NOT YETs?', 'In round 2 each doll still has a card where it is red. Which?', 'After round 2, on which cards would two dolls have proved blue?'],
    parent: {notice: 'Whether your child expects the dolls to prove in round 2, as in puzzle 8, and what they say when they can’t.', prompt: 'Every doll sees two blues from the start. Why do they need three rounds?', explanation: 'Round 1: all NOT YET, so the one-blue cards go. Round 2: each doll sees two blues and still has a two-blue card where it is red, so all NOT YET again; now the two-blue cards go, since on each two dolls would have proved. Only BBB is left, and in round 3 all three prove. With k blue dolls, the blue dolls prove first in round k.', extension: 'With four blue dolls, which round? (Round 4.)', connection: 'The muddy children theorem: with k muddy children, they all know in round k, after k − 1 rounds of silence.'},
    provenance: 'Week 84 Problem 2, Deal 3 (B B B).'},
  {number: 11, level: 'hard', title: 'Which deal?', q: {kind: 'dolls', mode: 'fit', n: 3, least: 1, rounds: [[N, N, N], [P, N, P]]}, check: {left: ['BRB']}, prereq: 'rounds',
    idea: 'Onlookers who see no headband can find the deal from the replies alone.',
    hints: ['Start with the announcement. Then round 1: on which cards would some doll have proved blue?', 'In round 2, work out each card’s three replies and compare them with the ones shown.', 'On BBR, dolls 1 and 2 would prove in round 2.'],
    parent: {notice: 'Whether your child works out each card’s replies doll by doll.', prompt: 'Could two different deals have given these replies?', explanation: 'The announcement removes RRR. Round 1’s three NOT YETs remove BRR, RBR and RRB, where one doll would have proved blue. In round 2, BBR would give PROVE BLUE, PROVE BLUE, NOT YET; RBB NOT YET, PROVE BLUE, PROVE BLUE; BBB three NOT YETs; only BRB gives PROVE BLUE, NOT YET, PROVE BLUE. So onlookers know dolls 1 and 3 are blue. In the same way the seven deals give seven different replies by round 2.', extension: 'Which deal gives three NOT YETs in rounds 1 and 2? (BBB, and onlookers know it before the dolls prove anything.)', connection: 'Comparing whole reply histories: the onlookers’ knowledge is the table, the same for everyone.'},
    provenance: 'Week 84 Problem 3 (group the deals by each doll’s reply in round 1; can later rounds separate every group?), as one transcript seen from outside.'},
  {number: 12, level: 'hard', title: 'No announcement', q: {kind: 'dolls', mode: 'coach', n: 3, deal: 'BBB', least: 0, cant: true}, check: {proved: null}, prereq: 'rounds',
    idea: 'Without the announcement no card ever leaves, so no doll ever proves blue, though each sees two blues.',
    hints: ['Choose each doll’s reply from all eight cards.', 'Which card would give a different round 1?', 'When a round removes no card, what will the next round look like?'],
    parent: {notice: 'Whether your child presses Can’t after one unchanged round, or plays several identical rounds first.', prompt: 'In puzzle 10 the same dolls proved blue. What did the announcement change, if every doll could already see a blue?', explanation: 'With all eight cards, every doll on every card still has a card where it is red, so every reply on every card is NOT YET. A round of NOT YETs removes nothing, the table stays the same, and so does every later round: no doll can ever prove blue. The announcement told no doll anything new about the headbands. What changed is that everyone heard it, so RRR left the shared table: in BBB, doll 1 allows RBB, where doll 2 would allow RRB, where doll 3 would allow RRR, and the announcement cuts that chain.', extension: 'With one red doll, BBR, is it the same? (Yes: without the announcement no deal ever gives a proof.)', connection: 'The fixed point: a public set that no round changes. Knowing that everyone knows (common knowledge) is what the announcement adds.'},
    provenance: 'Week 84 Problem 4 (all eight headband cards, no announcement), on Problem 2’s Deal 3.'},
  {number: 13, level: 'hard', title: 'Four dolls', q: {kind: 'dolls', mode: 'coach', n: 4, deal: 'BBBR', least: 2, cant: true}, check: {proved: 2}, prereq: 'four',
    idea: 'With “at least two are blue”, three blue dolls prove in round 2: one round sooner than with “at least one”.',
    hints: ['The announcement removes every card with fewer than two blues.', 'Round 1: does any doll have only blue cards that match what it sees?', 'After round 1, which cards would have had two dolls proving blue?'],
    parent: {notice: 'Whether your child predicts round 3, from three blues, and what they find.', prompt: 'Why does the stronger announcement save a round?', explanation: 'The announcement removes RRRR and the four one-blue cards, leaving 11. Round 1: every doll still has a card where it is red, so all NOT YET, which removes the six two-blue cards (on each, the two blue dolls would have proved). Round 2: dolls 1, 2 and 3 each see two blues and a red, and the card where they would be red has only two blues and is gone, so they prove. Doll 4 sees three blues and still has BBBR and BBBB: NOT YET. With “at least m are blue” and k blue dolls, they prove in round k − m + 1.', extension: 'With “at least one is blue”, which round would BBBR take? (Round 3.)', connection: 'Changing the announcement changes the starting table, and every later round with it.'},
    provenance: 'New: four dolls and “at least two are blue”, from the card’s App fit; the guide’s Grades 4–5 return visit (four dolls, BBBR proving in round 3 with “at least one”).'}
];

const id = n => `knowledge-${String(n).padStart(2, '0')}`;
const RN = {notyet: 'NOT YET', no: 'NO', yes: 'YES', prove: 'PROVE BLUE'};
const out = PUZZLES.map(item => {
  const q = item.q;
  let solution;
  if (q.mode === 'fit') {
    const tables = fitTables(q);
    assert.deepEqual(tables.at(-1), item.check.left, `${id(item.number)}: cards left`);
    solution = {tables, left: tables.at(-1)};
  } else if (q.mode === 'design') {
    const all = conversations(q.n), hits = all.filter(c => c.left.length === q.target);
    assert.equal(hits.length, 1, `${id(item.number)}: one conversation leaves ${q.target}`);
    assert.deepEqual(hits[0].said, item.check.said);
    assert.deepEqual(hits[0].left, item.check.left);
    solution = {said: hits[0].said, left: hits[0].left, conversations: all.map(c => ({said: c.said, left: c.left}))};
  } else {
    const run = coachRun(q);
    assert.equal(run.proved, item.check.proved, `${id(item.number)}: round in which every blue doll proves`);
    solution = {tables: run.tables, rounds: run.rounds, proved: run.proved, ...(run.proved ? {} : {still: run.still})};
  }
  const kind = q.mode === 'coach' ? (q.cant ? 'cant' : 'coach') : q.mode;
  const [objective, visible] = OBJECTIVE[kind];
  const rules = q.kind === 'cafe' ? CAFE_RULES(q.n) : DOLL_RULES(q);
  if (q.mode === 'design') rules.push('An answer that no card on the table gives is refused.');
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Who knows', mechanic: 'knowledge', band: 'all', revision: 1, sourceDocument: 'docs/knowledge/README.md',
    parameters: q, objective, visibleObjective: visible, instruction: objective, controls: CONTROLS[q.mode], rules,
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints, parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});
assert.deepEqual(out.map(p => p.difficulty_level), [...Array(4).fill('easy'), ...Array(4).fill('medium'), ...Array(5).fill('hard')]);

const playground = {
  id: 'knowledge-playground', number: 0, title: 'Who knows playground', difficulty_level: 'playground', familyTitle: 'Who knows', mechanic: 'knowledge', band: 'playground', revision: 1, sourceDocument: 'docs/knowledge/README.md',
  parameters: {kind: 'dolls', mode: 'playground'},
  objective: 'Choose the dolls and their headbands, with or without the announcement, and play rounds.', visibleObjective: '',
  instruction: 'Choose the dolls and their headbands, with or without the announcement, and play rounds.',
  controls: CONTROLS.playground, rules: DOLL_RULES({least: 1, mode: 'coach'}),
  idea: 'Free play with the dolls: any number from two to four, any headbands, with or without the announcement.',
  prerequisites: 'None. A grown-up can set a challenge: four blue dolls, or no announcement.',
  hints: ['Try four blue dolls.', 'Switch the announcement off and play two rounds.', 'Try one red doll among blues.'],
  parent: {notice: 'Whether your child sets up deals to test an idea (more blues, no announcement) or plays at random.', prompt: 'With four blue dolls, in which round do they prove blue?', explanation: 'With the announcement and k blue dolls, the blue dolls prove first in round k and the red dolls never prove anything. Without it, no card ever leaves the table and no doll ever proves. The playground stops after eight rounds.', extension: 'Set up a deal where the dolls prove in round 3 with only three dolls. (Only BBB.)', connection: 'The muddy children puzzle for up to four children, with and without the father’s announcement.', sourceIds: sources},
  provenance: 'Week 84 Problems 2 and 4 and the guide’s four-doll return visit, as free play.'
};
// The playground's claim: every deal of 2–4 dolls, with the announcement, proves in round k; without, never.
for (const n of [2, 3, 4]) for (const deal of worlds('dolls', n)) {
  const k = [...deal].filter(c => c === 'B').length;
  if (k) assert.equal(coachRun({n, deal, least: 1}).proved, k, `${deal}: round ${k}`);
  assert.equal(coachRun({n, deal, least: 0}).proved, null, `${deal}: never without the announcement`);
}

const json = {
  title: 'Who knows',
  version: 1,
  families: [{id: 'knowledge', title: 'Who knows', mathematics: 'Possible worlds and public announcements. The cards on the table are the worlds still possible: every deal of YES/NO cards in the café, every arrangement of blue and red headbands for the dolls. A person knows a fact when every remaining card that fits what they can see agrees on it. An answer everyone hears is a public announcement: it removes every card on which that person would have answered differently, so even “not yet” is evidence. In the café, a first NOT YET proves a YES card, and after the first NO, later answers reveal nothing. After “at least one headband is blue”, k blue dolls first prove blue in round k (the muddy children puzzle); without the announcement no card ever leaves and no doll ever proves. The puzzles ask for the deals that fit a café conversation, a conversation that exactly two deals fit, the dolls’ replies round by round until every blue doll proves blue, the deal behind a list of replies, and, with no announcement, Can’t.', rules: CAFE_RULES(3).concat(DOLL_RULES({least: 1, mode: 'coach'})), sourceIds: sources}],
  sources: [
    {id: 'knowledge-week84', title: 'Bellingham Math Circle — Week 84: Public knowledge (student packet W84-PK-draft-v3, Problems 1–4 and worked examples, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-84', kind: 'local curriculum'},
    {id: 'knowledge-card84', title: 'Week 84 review card and math check (App fit: tap the fitting deals; choose each doll’s reply with its own headband hidden; remove the cards the replies rule out)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-84.md', kind: 'local curriculum'},
    {id: 'knowledge-hamkins', title: 'Joel David Hamkins — I know that you know that I know that you know (Oxford, October 2019): the Logic Café and the blue-eyed islanders, classic puzzles presented there', url: 'https://jdh.hamkins.org/i-know-that-you-know-that-i-know-that-you-know-oxford-october-2019/', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/knowledge/knowledge.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => {
  const q = p.parameters, s = p.solution;
  const what = q.mode === 'fit' ? `left ${s.left.join(' ')}` : q.mode === 'design' ? `${s.said.map(r => RN[r]).join(', ')} leaves ${s.left.join(' ')}` : s.proved ? `every blue doll proves in round ${s.proved}` : `can’t (round ${s.still} changes nothing)`;
  return `${p.id} ${p.difficulty_level} ${q.kind} ${q.mode}: ${what}`;
}).join('\n'));
