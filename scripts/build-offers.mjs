// Builds dist/families/offers/offers.json, the Take it or pass pack, from the
// authoring list below. What each puzzle asks for is computed here from
// dist/families/offers/offers.js and checked against the list, and again, by
// a separate simulation, in scripts/validate-offers.mjs.
// Design notes and worksheet sources: docs/offers/README.md.
import {writeFile} from 'node:fs/promises';
import {bestOf, targetsOf} from '../dist/families/offers/offers.js';

const WEEK60 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-60';
export const sources = [
  {id: 'offers-week60', title: 'Bellingham Math Circle — Week 60: Take it or pass, student packet and adult guide', url: WEEK60, kind: 'local curriculum'},
  {id: 'offers-ferguson', title: 'Thomas S. Ferguson — Optimal Stopping and Applications, Chapter 2', url: 'https://www.math.ucla.edu/~tom/Stopping/sr2.pdf', kind: 'reference'}
];
export const family = {
  id: 'offers',
  title: 'Take it or pass',
  mathematics: 'A bag holds three tickets, each as likely to be drawn as any other, and every offer is a fresh draw, so offers can repeat. Take an offer to score it and stop, or pass it for good; the last offer must be taken. A card lists every offer of a round in order, the ones never seen after a take included, so with n offers there are 3ⁿ equally likely cards, and the plan that scores the most on all of them has the best average. The best plan takes an offer when it beats the best average of the offers after it: with one offer after it, that is the bag’s mean; with more, it is the mean, over the tickets, of the larger of each ticket and the best average with one offer fewer. For 0, 4 and 6 the best averages with one, two and three offers are 10/3, 40/9 and 134/27, so a 4 is taken with two offers left and passed with three. Remembering earlier offers doesn’t help: what is left comes from the same bag whatever was passed.',
  rules: [
    'A bag holds three tickets, each as likely to be drawn as any other. Every offer is a fresh draw: the ticket goes back, so offers can repeat.',
    'Take an offer to score it and stop, or pass it for good. The last offer must be taken.',
    'A card shows every offer of a round in order, the ones never seen after a take included. Every card is equally likely, so the plan that scores the most on all the cards has the best average.'
  ],
  sourceIds: sources.map(s => s.id)
};

const W = ['offers-week60'];
const CONTROLS = {
  plan: 'Tap a switch to change Take to Pass or back. Each card lights the offer the plan takes and fades the ones it never sees. Press Best plan when no plan scores more on all the cards together.',
  plans: 'Tap a switch to change Take to Pass or back. Each card lights the offer the plan takes and fades the ones it never sees. Keep checks the plan. Press That’s all when every best plan is there.',
  differ: 'Tap a card to keep it. Press That’s all when every card where A and B score differently is there.',
  bag: 'Tap a ticket to put it in the bag, then set the switches to a best plan for that bag. Keep checks the ticket with that plan. Press That’s all when every one is there.'
};
const two = 'Choose Take or Pass for each first offer so that the nine cards score as much as possible together.';
const three = 'Choose Take or Pass for each first offer, and for each second offer after a passed first, so that the 27 cards score as much as possible together.';

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Two offers: 0, 4 and 6',
    parameters: {mode: 'plan', bag: [0, 4, 6], n: 2},
    objective: two,
    idea: 'Pass a first 0 and take a first 4 or 6. On the cards starting with 4, taking scores 4, 4 and 4 and passing scores 0, 4 and 6: 12 against 10.',
    prerequisites: 'Compare small numbers and add three of them. A grown-up can read the cards aloud.',
    hints: ['Look at the three cards that start with 0. Which switch scores more on them?', 'Each switch changes only the cards in its row.', 'Compare a row taking with the same row passing.'],
    parent: {
      notice: 'The best plan passes 0 and takes 4 and 6. On all nine cards it scores 40 (one 0, four 4s and four 6s), an average of 40/9.',
      prompt: 'Why can you choose each row on its own?',
      explanation: 'A switch changes only the cards that start with its offer, so the best plan makes the best choice in each row. Taking a first x scores x on each of the row’s three cards; passing scores the second offers, 0 + 4 + 6 = 10 in all. Take when 3 × x is more than 10: take 4 (12) and 6 (18), pass 0.',
      extension: 'With tickets 0, 4 and 9, which first offers would you take? (Only 9: 3 × 4 = 12 is less than 0 + 4 + 9 = 13.)',
      connection: 'Week 60 Problem 3; the playground plays rounds.'
    },
    provenance: 'Week 60 Problem 3: “Find first-offer choices for 0, 4 and 6 that give the highest total score on all nine cards.”',
    sourceIds: W, expect: 1
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Two offers: 0, 5 and 6',
    parameters: {mode: 'plan', bag: [0, 5, 6], n: 2},
    objective: two,
    idea: 'Pass 0 and take 5 and 6: taking a first 5 scores 15 on its row, passing 11.',
    prerequisites: 'Puzzle 1.',
    hints: ['Start with the row of cards that start with 5.', 'Passing a first offer scores 0 + 5 + 6 = 11 on its row.', 'Taking a first 5 scores 5 three times.'],
    parent: {
      notice: 'Pass 0, take 5 and 6: 44 on the nine cards, an average of 44/9.',
      prompt: 'Is the middle ticket always worth taking?',
      explanation: 'No: it depends on how it compares with the bag’s average. Here 5 beats the average of 0, 5 and 6 (11/3), so it is taken. Puzzle 3 has a middle ticket below its bag’s average.',
      extension: 'Which middle tickets between 0 and 6 are worth taking with two offers? (4 and 5; 3 ties; 1 and 2 are passed.)',
      connection: 'Week 60 Problem 7, second bag.'
    },
    provenance: 'Week 60 Problem 7: “For each new bag, find all the first-offer choices that give the highest total score on its nine two-offer cards”, the bag 0, 5, 6.',
    sourceIds: W, expect: 1
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Two offers: 0, 2 and 6',
    parameters: {mode: 'plan', bag: [0, 2, 6], n: 2},
    objective: two,
    idea: 'Take only 6. A first 2 scores 6 on its row taken and 8 passed, so passing only the smallest ticket isn’t enough.',
    prerequisites: 'Puzzle 1.',
    hints: ['Is a first 2 worth taking? Look at its row.', 'Passing a first offer scores 0 + 2 + 6 = 8 on its row.', 'Taking a first 2 scores 2 three times: 6.'],
    parent: {
      notice: 'Take only 6: 34 on the nine cards, an average of 34/9. Passing only 0 and taking 2 scores 32.',
      prompt: 'Passing only the smallest ticket worked in puzzles 1 and 2. Why not here?',
      explanation: 'Passing is worth the bag’s average, 8/3 here, a little under 3. A first 2 is below it, so it is passed too. In puzzles 1 and 2 the middle tickets, 4 and 5, are above their bags’ averages.',
      extension: 'Change the 2 so that taking and passing it tie. (3: puzzle 4.)',
      connection: 'The bag the Week 60 review card adds to Problem 7.'
    },
    provenance: 'The Week 60 review card, fix 6: “Bag: 0, 2, 6” (pass 0 and 2, take 6, total 34, unique), so that passing only the smallest ticket is refuted.',
    sourceIds: W, expect: 1
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Two offers: 0, 3 and 6',
    parameters: {mode: 'plans', bag: [0, 3, 6], n: 2},
    objective: 'Find every plan that scores as much as possible on the nine cards.',
    idea: 'Two plans tie at 36: both pass 0 and take 6, and a first 3 can be taken or passed (9 either way on its row).',
    prerequisites: 'Puzzles 1–3.',
    hints: ['Find one best plan first.', 'Look at the row of cards starting with 3, taking and passing.', 'Taking a first 3 scores 9 on its row; passing scores 0 + 3 + 6 = 9.'],
    parent: {
      notice: 'Both best plans pass 0 and take 6; a first 3 ties, 9 against 9. Each scores 36, an average of 4.',
      prompt: 'How can two different plans both be best?',
      explanation: 'The two plans differ only on the three cards starting with 3, and there they score the same: 3 + 3 + 3 taking, 0 + 3 + 6 passing. Taking and passing tie exactly when the middle ticket equals the bag’s average.',
      extension: 'Which ticket instead of 3 would tie beside 1 and 9? (Puzzle 8.)',
      connection: 'Week 60 Problem 7, first bag.'
    },
    provenance: 'Week 60 Problem 7: “find all the first-offer choices that give the highest total score on its nine two-offer cards”, the bag 0, 3, 6.',
    sourceIds: W, expect: 2
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Where plans A and B differ',
    parameters: {mode: 'differ', bag: [0, 4, 6], n: 3, plans: {A: [[4, 6], [4, 6]], B: [[6], [4, 6]]}, say: {A: 'Take 4 or 6 whenever it appears.', B: 'Take only 6 on the first offer; on the second, take 4 or 6.'}},
    objective: 'Find every card where plans A and B score differently.',
    idea: 'Five cards, all starting with 4: on 4 0 0 A scores 4 more; on 4 0 6, 4 6 0, 4 6 4 and 4 6 6 B scores 2 more. B wins by 4 in all, 134 to 130, without winning every card.',
    prerequisites: 'Puzzle 1.',
    hints: ['The plans only disagree about one first offer. Which?', 'On a card starting with 0 or 6, do A and B take the same offer?', 'Look at the cards starting with 4: A takes the 4. What does B take?'],
    parent: {
      notice: 'The five cards: 4 0 0 (A scores 4, B 0), and 4 0 6, 4 6 0, 4 6 4 and 4 6 6 (A 4, B 6). On the other 22 cards both plans take the same offer.',
      prompt: 'B loses on one card. Is B still the better plan?',
      explanation: 'Yes. On all 27 cards A scores 130 and B 134: B gains 2 on four cards and loses 4 on one. After That’s all the towers compare the five cards. A plan that is better on average needn’t be better on every card, and a short game can go either way.',
      extension: 'Which plan would you rather use for one round? For many rounds?',
      connection: 'Week 60 Problem 4.'
    },
    provenance: 'Week 60 Problem 4: “Which plan gives the higher total score on these 27 three-offer cards?”, with plans A (“Take 4 or 6 whenever it appears. Pass 0.”) and B (“Take only 6 on the first offer. On the second, take 4 or 6 and pass 0.”).',
    sourceIds: W, expect: 5
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Three offers: 0, 4 and 6',
    parameters: {mode: 'plan', bag: [0, 4, 6], n: 3},
    objective: three,
    idea: 'Take a first offer only if it is 6; after passing, take a second 4 or 6. A 4 is taken with two offers left but passed with three: what follows a passed first 4 is worth 40 on its nine cards, more than nine 4s.',
    prerequisites: 'Puzzle 1.',
    hints: ['After a passed first offer, the last two offers are puzzle 1.', 'Then compare each row: taking its first offer, or passing and playing its lines.', 'Taking a first 4 scores 36 on its nine cards. What does passing score?'],
    parent: {
      notice: 'The best plan: first, take only 6; second, take 4 or 6; then the last. It scores 134 on the 27 cards (an average of 134/27), more than plan A’s 130 in puzzle 5. The same lines are best after every first offer.',
      prompt: 'Why is a 4 worth taking with two offers left but not with three?',
      explanation: 'With two left, passing a 4 leaves one offer, worth 0 + 4 + 6 = 10 over its three cards, less than 4 + 4 + 4 = 12. With three left, passing leaves puzzle 1, whose best plan scores 40 over its nine cards, more than nine 4s, 36. The comparison is with the best plan for what is left, not with the next offer alone (whose average, 10/3, is below 4).',
      extension: 'Could a plan that remembers the first offer do better? (No. The switches after each first offer already let a plan remember it, and the best lines are the same in every row: what is left comes from the same bag either way.)',
      connection: 'Week 60 Problems 5 and 6.'
    },
    provenance: 'Week 60 Problem 5 (“The current offer is 4… 2 offers left… 3 offers left”) and Problem 6 (“Find a three-offer plan for the 0, 4, 6 bag with the largest possible total on the 27 cards… A plan is allowed to remember earlier passed offers.”).',
    sourceIds: W, expect: 1
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Three offers: 0, 5 and 6',
    parameters: {mode: 'plan', bag: [0, 5, 6], n: 3},
    objective: three,
    idea: 'Take 5 or 6 whenever it appears. A first 5 beats what passing it is worth even with three offers left: 45 against 44 on its row.',
    prerequisites: 'Puzzle 6.',
    hints: ['After a passed first offer, the last two offers are puzzle 2.', 'Taking a first 5 scores 45 on its nine cards.', 'What does passing a first 5 score, played as well as possible?'],
    parent: {
      notice: 'Take 5 or 6 at either of the first two offers and pass 0: 143 on the 27 cards, an average of 143/27.',
      prompt: 'With four offers, would you still take a first 5?',
      explanation: 'With three offers, passing a 5 leaves puzzle 2, worth 44 on its nine cards, less than nine 5s, 45, so 5 is taken. With four offers, passing leaves this puzzle, worth 143 on 27 cards, more than 27 fives, 135, so a first 5 is passed: the 5 flips one offer later than the 4.',
      extension: 'What is the best average with four offers? (448/81: pass a first 0 or 5, take a first 6, then play this puzzle’s plan.)',
      connection: 'Week 60 Problem 8.'
    },
    provenance: 'Week 60 Problem 8: “Use a bag with tickets 0, 5, 6. Find the best taking plan for three-offer rounds and for four-offer rounds.” The three-offer half; the four-offer half is in the notes.',
    sourceIds: W, expect: 1
  },
  {
    number: 8, difficulty_level: 'hard', title: 'A tie with 1 and 9',
    parameters: {mode: 'bag', pins: [1, 9], menu: [0, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], n: 2, goal: 'tie'},
    objective: 'Find every ticket from 0 to 20, other than 1 and 9, that makes taking a first middle ticket tie with passing it.',
    idea: 'Taking the middle ticket scores it three times on its row; passing scores 1 + 9 + the new ticket. They tie only with 5 (the middle: 15 and 15) and 17 (9 is the middle: 27 and 27).',
    prerequisites: 'Puzzle 4.',
    hints: ['Which ticket is the middle one? It can change.', 'Try a ticket between 1 and 9, and one above 9.', 'Taking the middle scores 3 × middle on its row; passing scores the whole bag.'],
    parent: {
      notice: 'Two tickets work: 5 (bag 1, 5, 9: 15 against 15) and 17 (bag 1, 9, 17: 27 against 27). With 0 the middle is 1, and passing it always wins.',
      prompt: 'How can a ticket above 9 make a tie?',
      explanation: 'With a ticket x above 9, 9 becomes the middle. Taking a first 9 scores 27 on its row; passing scores 1 + 9 + x. They tie when x = 17. Between 1 and 9 the new ticket is the middle, and 3 × x = 10 + x at x = 5. With 0 the middle is 1, which scores 3 taken and 10 passed. After That’s all, every ticket shows in a column by what the best plan does with the middle.',
      extension: 'Which tickets make the middle worth taking? (6, 7 and 8, and 10 to 16.)',
      connection: 'The Week 60 review card’s “make a bag”.'
    },
    provenance: 'The Week 60 review card, App fit: “the third ticket up to 20 that ties the middle of 1, 9 and it (5 or 17)”.',
    sourceIds: W, expect: 2
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Three offers: 0, 3 and 6',
    parameters: {mode: 'plans', bag: [0, 3, 6], n: 3},
    objective: 'Find every plan that scores as much as possible on the 27 cards.',
    idea: 'Four plans tie at 126. All take only a first 6 and, after a passed first 0 or 3, pass a second 0 and take a second 6; a second 3 ties and can be taken or passed after each.',
    prerequisites: 'Puzzles 4 and 6.',
    hints: ['Find one best plan first.', 'Which switches can change without changing any card’s score?', 'After a passed first offer, a second 3 ties: 9 either way.'],
    parent: {
      notice: 'The four best plans take only a first 6; after a first 0 and after a first 3 they pass a second 0 and take a second 6, and take or pass a second 3. Each scores 126, an average of 14/3.',
      prompt: 'Why four plans, not two?',
      explanation: 'The second-offer switches after a first 0 and after a first 3 are separate, and each tie can go either way: 2 × 2 = 4 plans. A first 3 is passed, though: nine 3s make 27, while passing scores 36 on its nine cards.',
      extension: 'If a plan had to treat a second 3 the same whatever the first offer was, how many best plans would there be? (Two.)',
      connection: 'Week 60 Problems 6 and 7.'
    },
    provenance: 'Week 60 Problem 7’s bag 0, 3, 6 with three offers, and Problem 6’s plans that may remember earlier offers.',
    sourceIds: W, expect: 4
  },
  {
    number: 10, difficulty_level: 'hard', title: 'A middle that flips',
    parameters: {mode: 'bag', pins: [0, 6], menu: [1, 2, 3, 4, 5], n: 3, goal: 'flip'},
    objective: 'Find every ticket from 1 to 5 that every best plan passes as a first offer and takes as a second.',
    idea: 'Only 4. A ticket is worth taking with two offers left when it beats the bag’s average, and with three left when it beats the best average of two offers: 4 beats 10/3 but not 40/9.',
    prerequisites: 'Puzzles 6, 7 and 9.',
    hints: ['For each ticket, find a best plan.', 'Is the ticket taken after a passed first offer? Is it taken first?', 'Puzzles 6, 7 and 9 show what happens to 4, 5 and 3.'],
    parent: {
      notice: 'Only 4 flips. 1 and 2 are passed both times, 3 ties with two offers left and is passed with three, and 5 is taken both times. A best plan may take a second 3, as in puzzle 9, but another passes it, so 3 doesn’t count.',
      prompt: 'Why does a ticket have to be better to be taken earlier?',
      explanation: 'Passing with two offers left leaves one offer: its average is the bag’s, (6 + b)/3. Passing with three left leaves two offers, played well, which is worth more. So a first offer has to clear a higher bar. 4 clears the lower bar (4 is more than 10/3) but not the higher (4 is less than 40/9). After That’s all, every ticket shows in a column by what the best plan does with it.',
      extension: 'Could a ticket be passed with two offers left but taken with three? (No: the bar only rises as more offers remain.)',
      connection: 'Week 60 Problems 5 and 8; the review card’s “make a bag”.'
    },
    provenance: 'The Week 60 review card, App fit: “the b in 0, b, 6 taken with two offers and passed with three (only 4)”.',
    sourceIds: W, expect: 1
  }
];

const playground = {
  id: 'offers-playground', number: 0, title: 'Take it or pass playground', band: 'playground', difficulty_level: 'playground',
  parameters: {mode: 'playground'},
  objective: 'Choose a bag and the number of offers, and play rounds.',
  controls: 'Choose a bag and 2 or 3 offers. Draw shows the first offer; Take scores it and ends the round, and Pass gives it up and shows the next. The last offer must be taken. Each round goes in the pile of its score, the offers it never saw shown faded. Clear empties the piles; changing the bag or the offers clears them too.',
  idea: 'Free play: invent a rule and play it.',
  prerequisites: 'None. A grown-up can suggest a rule from the puzzles.',
  hints: ['Pick a rule before you draw, and keep it.', 'Look at the faded offers: what would another choice have scored?', 'Play ten rounds with one rule, then ten with another.'],
  parent: {
    notice: 'A few rounds can favour the worse rule: each round is chance. The puzzles count every card instead, which settles which rule has the better average.',
    prompt: 'Can six rounds prove one rule better than another?',
    explanation: 'No: any run of rounds can happen with either rule. Counting every equally likely card, as the puzzles do, gives the exact average.',
    extension: 'Play two rules on the same draws: one child plays, the other says what their rule would have done.',
    connection: 'Week 60 Problems 1 and 2.'
  },
  provenance: 'Week 60 Problem 1: “Invent a taking rule for two-offer rounds and one for three-offer rounds. Keep each rule fixed while playing six rounds with a partner.”',
  sourceIds: W
};

// What each puzzle asks for: the best plans, the cards, or the tickets.
const answers = q => q.mode === 'plan' ? bestOf(q.bag, q.n).keys : q.mode === 'playground' ? undefined : targetsOf(q);

const puzzles = [playground, ...authored].map(({expect, sourceIds, parent, ...p}) => {
  const q = p.parameters, count = answers(q)?.length;
  if (expect !== undefined && count !== expect) throw Error(`${p.number}: ${count}, not ${expect}`);
  return {
    id: q.mode === 'playground' ? p.id : `offers-${String(p.number).padStart(2, '0')}`,
    number: p.number, title: p.title, band: p.band || 'all', difficulty_level: p.difficulty_level,
    mechanic: 'offers', familyTitle: family.title, revision: 1, parameters: q,
    objective: p.objective, instruction: p.objective, controls: p.controls || CONTROLS[q.mode], rules: family.rules,
    idea: p.idea, prerequisites: p.prerequisites, hints: p.hints,
    parent: {...parent, sourceIds}, provenance: p.provenance, sourceDocument: 'docs/offers/README.md'
  };
});

export const pack = {title: family.title, version: 1, families: [family], sources, puzzles};

if (import.meta.url === `file://${process.argv[1]}`) {
  await writeFile(new URL('../dist/families/offers/offers.json', import.meta.url), `${JSON.stringify(pack, null, 2)}\n`);
  console.log(`Wrote ${puzzles.length} puzzles.`);
}
