// Authoring list for Nesting cards (worksheet Week 19, no card inside
// another). Computes every puzzle's answers with the mechanic's own search,
// checks them against the table in docs/nests/README.md, finds a witness for
// each by playing the mechanic's hints from a fresh board, and writes
// dist/families/nests/nests.json. Run: node scripts/build-nests.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {nestMechanics, deckInfo, bestOf, largest, ofSize, lettersOf, tap} from '../dist/families/nests/nests.js';

// The decks in the worksheets' scrambled order (Week 19 packets); the
// five-picture deck is new, shuffled once and checked not to run by size.
const DECK2 = ['', 'AB', 'A', 'B'];
const DECK3 = ['AC', '', 'B', 'ABC', 'A', 'BC', 'AB', 'C'];
const DECK4 = ['AC', 'BD', '', 'ABC', 'CD', 'A', 'BCD', 'AB', 'D', 'BC', 'ABCD', 'AD', 'B', 'ACD', 'C', 'ABD'];
// Reshuffled where tapping every card in page order would finish a puzzle
// without a choice: in this order of the sixteen cards, tapping along the rows,
// backwards or down the columns (four or five wide) stops short of six (with
// or without the circle-and-triangle and circle-and-square cards pinned) and
// of four with the circle pinned; in this order of the eight, tapping along
// the rows or down the columns with the circle-and-triangle card pinned
// chooses the square first and stops at two.
const DECK4X = ['BCD', 'C', 'B', 'ACD', 'BD', 'AC', 'ABD', 'AD', 'AB', 'CD', 'ABCD', 'D', 'BC', 'A', '', 'ABC'];
const EXT3 = ['C', '', 'AB', 'BC', 'A', 'ABC', 'B', 'AC'];
const DECK5 = ['CD', 'D', 'BDE', 'AE', 'ABD', 'BCE', 'ACDE', 'ADE', 'BD', 'BC', 'ABCE', 'AD', 'E', 'CE', 'ABC', 'ABCD', 'ACD', 'ABDE', 'CDE', 'BE', 'A', 'AB', 'ABCDE', 'AC', '', 'ACE', 'DE', 'C', 'ABE', 'B', 'BCDE', 'BCD'];
const names = list => list.map(s => s || 'empty').join('/');

const FIT = 'A card fits inside another when all its pictures are on the other card. The empty card fits inside every card. Two cards nest when one fits inside the other.';
const TAP = 'Tap a card to choose it, and tap it again to put it back. A card that nests with a chosen card can’t be chosen: it fades, and a line joins it to the chosen card it nests with.';
const RULES = {
  reach: [FIT, TAP, 'Fill the circles above each deck with chosen cards.'],
  extend: [FIT, TAP, 'Pinned cards stay chosen. A deck is done when every other card is chosen or faded and no other way fits more cards.'],
  best: [FIT, TAP, 'Drag each card into a row, or onto the dashed row to start a new one. In a row each card must fit inside the next; a bar marks two that don’t.', 'A collection takes at most one card from each row. So when every card is in a row and each row holds one chosen card, no collection can be bigger. A filled circle at the start of a row means it holds one chosen card.'],
  pinned: 'A collection with the pinned card can take nothing from a row whose cards all nest with it, so that row needs no chosen card.',
  every: [FIT, TAP, 'When the chosen cards fill the circles, the collection is kept below and the cards go back. Press That’s all when you think none is left. It says if there is another.']
};
const CONTROLS = {
  tap: 'Tap a card to choose it or put it back. Tap a faded card to see which chosen card it nests with. Undo takes back the last tap.',
  rows: 'Tap a card to choose it or put it back. Drag a card into a row, onto the dashed row to start a new one, or back to the cards. With a keyboard, Enter chooses, a number key puts the card in that row and 0 takes it out. Undo takes back the last move.',
  every: 'Tap a card to choose it or put it back. Tap a faded card to see which chosen card it nests with. Press That’s all when you are sure. Undo takes back the last tap.',
  playground: 'Choose a deck. Tap cards to choose them, and drag them into rows or back.'
};
const OBJECTIVE = {
  reach: 'Choose cards with no chosen card inside another until the circles are full.',
  extend: 'Keep the pinned cards and add as many cards as you can, with no chosen card inside another; tap every other card to show it nests with a chosen card.',
  best: 'Choose as many cards as you can with no card inside another, and put every card in a row where each card fits inside the next, with one chosen card in each row.',
  pinned: 'Keep the pinned card and add as many cards as you can with no card inside another, and put every card in a row where each card fits inside the next: each row holds one chosen card, or only cards that nest with the pinned card.',
  every: 'Find every collection of this many cards with no card inside another. Press That’s all when none is left.'
};
const VISIBLE = {reach: '', extend: 'Add as many cards as you can.', best: 'Choose as many cards as you can, and put every card in a row with one chosen card.', pinned: 'Add as many cards as you can, and put every card in a row.', every: 'Find every collection of this size.'};
const PREREQUISITES = {
  look: 'Match pictures on two cards. No reading; a grown-up can read How to play.',
  count: 'Match pictures and count to three or four. A grown-up can read How to play.',
  rows: 'Match pictures, and drag cards into rows where each fits inside the next. A grown-up can read How to play.',
  rows16: 'Patience with sixteen cards; see that a row can hold only one card of each size. Reading the goal helps.',
  every: 'Keep the collections already found in mind and decide when none is left.',
  five: 'Sort cards by how many pictures they have, and keep a large collection in mind.'
};
const sources = ['nests-week19', 'nests-card19', 'nests-stanley', 'nests-dilworth', 'nests-sperner'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Four little decks', mode: 'reach', prereq: 'look', inOrder: [true, false, true, false],
    decks: [{cards: ['A', '', 'B'], target: 2}, {cards: ['AB', 'A', 'B'], target: 2}, {cards: ['AB', 'AC', 'BC'], target: 3}, {cards: ['ABC', 'A', 'BC'], target: 2}].map(d => ({...d, cols: 3, pictures: 3})),
    check: {answers: [['A/B'], ['A/B'], ['AB/AC/BC'], ['A/BC']]},
    idea: 'The empty card fits inside every card, and two cards may share pictures as long as neither has all of the other’s.',
    hints: ['Does the empty card fit inside the others?', 'The circle and triangle card has both pictures of the circle card, so those two nest. The three two-picture cards share pictures but none has all of another’s.', 'Choose the circle card and the triangle card in the first two decks, all three two-picture cards in the third, and the circle card and the triangle and square card in the fourth.'],
    parent: {notice: 'Whether your child thinks two cards that share a picture can’t go together. The third deck answers that: the three two-picture cards overlap and all three go.', prompt: 'Point to every picture of the smaller card on the bigger one. Is each one there?', explanation: 'A card fits inside another when every one of its pictures is on the other. The empty card has no pictures, so it fits inside every card and can only be chosen alone. In the second deck, the two-picture card holds both one-picture cards. In the third, each card has a picture the others lack, so none fits inside another, though each pair shares a picture. In the fourth, the three-picture card holds both others, and the circle and the triangle-and-square card share nothing. Each deck has exactly one largest choice.', extension: 'Make a little deck of three cards where all three can be chosen, using no card with two pictures. (Circle, triangle, square.)', connection: 'Cards are subsets of a set of pictures, and “fits inside” is inclusion. A collection with no card inside another is an antichain.'},
    provenance: 'Week 19 K–1 Problem 1, its four groups in printed order, with the cards inside the first, second and last group reordered so they are not laid out by size and, in the second and last, the first card tapped is the one that holds the others.'},
  {number: 2, level: 'easy', title: 'Eight cards', mode: 'reach', prereq: 'count',
    decks: [{cards: DECK3, target: 3, cols: 4}],
    check: {answers: [['A/B/C', 'AB/AC/BC']]},
    idea: 'Cards with the same number of pictures never nest.',
    hints: ['Can two cards with one picture each nest?', 'The empty card and the card with all three pictures nest with every other card.', 'The three one-picture cards work, and so do the three two-picture cards.'],
    parent: {notice: 'Whether your child starts with the empty card or the full card and then finds that nothing else can be added.', prompt: 'Why can’t the card with all three pictures be in a collection of two?', explanation: 'Two different cards with the same number of pictures can’t nest: to fit inside, a card needs all its pictures on the other, and with the same number that would make them the same card. So the three one-picture cards work, and so do the three two-picture cards. A mixed collection fails: a one-picture card can sit only with a two-picture card that lacks its picture, and then no third card fits. Three is the most; puzzle 6 shows why.', extension: 'Find a collection of three that mixes one-picture and two-picture cards. (There is none.)', connection: 'A level of the subset lattice (all subsets of one size) is always an antichain.'},
    provenance: 'Week 19 K–1 Problem 4 and grades 2–3 Problem 2: the eight-card deck in printed order.'},
  {number: 3, level: 'easy', title: 'Rows of four', mode: 'best', prereq: 'rows',
    decks: [{cards: DECK2, cols: 4}],
    check: {best: 2, answers: [['A/B']]},
    idea: 'Two rows hold all four cards, and a collection takes at most one card from each row, so two is the most.',
    hints: ['Put the empty card in a row. Which card fits inside the next?', 'A row can be the empty card, the circle card, then the circle and triangle card. The triangle card needs a row of its own.', 'Choose the circle card and the triangle card. Rows: empty, circle, circle and triangle; and the triangle card alone.'],
    parent: {notice: 'Whether your child sees that two chosen cards could never share a row, since every card in a row nests with the others.', prompt: 'Could you choose two cards from one row?', explanation: 'In the row empty, circle, circle and triangle, each card fits inside the next, so any two of them nest, and a collection takes at most one. The triangle sits alone in a second row. Every collection takes at most one card from each of the two rows, so no collection has more than two. The circle and triangle make two, so two is the most, and two rows is the fewest.', extension: 'Make the rows a different way. (Empty, triangle, circle and triangle; and circle.)', connection: 'Rows are chains. A partition into r chains bounds every antichain by r: the easy half of Dilworth’s theorem.'},
    provenance: 'Week 19 K–1 Problem 6, grades 2–3 and 4–5 Problem 4: the four-card deck in rows, with its collection.'},
  {number: 4, level: 'medium', title: 'Keep the start', mode: 'extend', prereq: 'count', inOrder: [true, true, false],
    decks: [{cards: EXT3, cols: 4, start: ['ABC']}, {cards: EXT3, cols: 4, start: ['A', 'BC']}, {cards: EXT3, cols: 4, start: ['AB']}],
    check: {best: [1, 2, 3]},
    idea: 'A collection that can take no more cards need not be as large as possible.',
    hints: ['Try adding each card in turn.', 'In the first two decks every card nests with a pinned card. In the third, two more cards fit.', 'Add the circle and square card and the triangle and square card to the third deck.'],
    parent: {notice: 'Whether your child decides the first two decks are finished, or keeps trying to add cards there.', prompt: 'Each deck ends with no card left to add. Is each collection as big as a collection from that deck can be?', explanation: 'The full card holds every card, so nothing joins it: one card. With the circle and the triangle-and-square card, every other card holds the circle or fits inside the triangle-and-square card (the empty card does both), so that collection stops at two. With the circle-and-triangle card, the other two two-picture cards join: three, the most from this deck. Being unable to add a card does not make a collection largest; it only means this collection is stuck.', extension: 'Start with the circle card and the square card. How many can you end with? (Three: add the triangle.)', connection: 'A maximal antichain (no card can be added) need not be a maximum antichain (as large as any).'},
    provenance: 'Week 19 grades 2–3 Problem 3 and K–1 Problem 5: the starts ABC, A/BC and AB, on the eight-card deck reshuffled so that tapping in order gets stuck in the third deck.'},
  {number: 5, level: 'medium', title: 'Another just as big', mode: 'every', prereq: 'every',
    decks: [{cards: DECK3, target: 3, cols: 4}],
    check: {answers: [['A/B/C', 'AB/AC/BC']]},
    idea: 'The eight-card deck has exactly two collections of three: the one-picture cards and the two-picture cards.',
    hints: ['Find one way first. Could different cards make another?', 'Look at how many pictures each card in your first collection has.', 'The one-picture cards, and the two-picture cards. Then press That’s all.'],
    parent: {notice: 'Whether your child presses That’s all after one collection, or looks for another made of different cards.', prompt: 'Could a collection of three mix one-picture and two-picture cards?', explanation: 'A one-picture card, say the circle, nests with every card that has a circle and with the empty card, which leaves the triangle, the square and the triangle-and-square card. Two of those that don’t nest are the triangle and the square, so with the circle they make the three one-picture cards. Without a one-picture card, the empty and full cards nest with everything, leaving the three two-picture cards. So there are exactly two.', extension: 'Take away one card, any card. Is there still a collection of three? (Yes: one of the two collections survives, since they share no card.)', connection: 'In the subset lattice on three elements the two middle levels are the only maximum antichains.'},
    provenance: 'Week 19 grades 2–3 Problem 2 (“Find every collection of that size”) and K–1 Problem 4 (“a different collection just as big”).'},
  {number: 6, level: 'medium', title: 'Rows of eight', mode: 'best', prereq: 'rows',
    decks: [{cards: DECK3, cols: 4}],
    check: {best: 3, answers: [['A/B/C', 'AB/AC/BC']]},
    idea: 'Three rows hold all eight cards, so no collection has four.',
    hints: ['Start a row with the empty card. What can go next?', 'One row can hold four cards, from the empty card to the full card. Two shorter rows hold the rest.', 'Rows: empty, circle, circle and triangle, full; square, circle and square; triangle, triangle and square. Choose the three one-picture cards.'],
    parent: {notice: 'Whether your child builds rows first and then chooses, or chooses first and then makes the rows fit, one chosen card in each.', prompt: 'If you chose four cards, where would they go in three rows?', explanation: 'Empty, circle, circle-and-triangle, full is a row; square, circle-and-square another; triangle, triangle-and-square a third. They hold all eight cards. Any collection takes at most one card from each row, so at most three. The one-picture cards (or the two-picture cards) make three, so three is the most, and three rows the fewest. The rows rule out four without trying every choice of four.', extension: 'Could four chosen cards sit in three rows with no two in one row? (No: two would share a row, and any two cards in a row nest.)', connection: 'A chain partition and an antichain of the same size certify each other (Dilworth’s theorem, here on the cube of subsets of three).'},
    provenance: 'Week 19 K–1 Problems 6 and 7, grades 2–3 Problems 4 and 5, grades 4–5 Problems 1 and 4: the eight-card deck in rows and the bound.'},
  {number: 7, level: 'medium', title: 'Sixteen cards', mode: 'reach', prereq: 'count',
    decks: [{cards: DECK4X, target: 6, cols: 4}],
    check: {answers: [['AB/AC/AD/BC/BD/CD']]},
    idea: 'The six two-picture cards are a collection, and the only one of six.',
    hints: ['Pick one card. Which cards can never be chosen with it?', 'Cards with the same number of pictures never nest.', 'Choose the six cards with two pictures.'],
    parent: {notice: 'Whether your child tries one-picture cards first (four of them) and then looks for a bigger kind.', prompt: 'There are four one-picture cards and four three-picture cards. Why do two-picture cards make more?', explanation: 'Cards with the same number of pictures never nest, so each size makes a collection: one empty card, four with one picture, six with two, four with three, one full card. The six two-picture cards are the biggest of these. They are in fact the only collection of six; the notes to puzzle 10 show why.', extension: 'Find a collection of four that mixes one-picture and two-picture cards. (The circle with the triangle and square, triangle and star, and square and star cards.)', connection: 'Sperner’s theorem: on n pictures the largest collection has as many cards as the middle size, here 6 = C(4, 2).'},
    provenance: 'Week 19 grades 2–3 Problem 6 and grades 4–5 Problem 2: the sixteen-card deck, reshuffled so that tapping in order stops short.'},
  {number: 8, level: 'medium', title: 'Two cards gone', mode: 'best', prereq: 'rows',
    decks: [{cards: DECK3.filter(s => s !== 'A' && s !== 'BC'), cols: 3, pictures: 3}],
    check: {best: 2, answers: [['B/C', 'B/AC', 'C/AB', 'AB/AC']]},
    idea: 'Taking out two cards can break both collections of three; two rows then prove two is the most.',
    hints: ['Which collections of three from the full eight are still here?', 'The circle is gone from the one-picture cards and the triangle-and-square card from the two-picture cards.', 'Choose the triangle and the square. Rows: empty, triangle, circle and triangle, full; square, circle and square.'],
    parent: {notice: 'Whether your child expects three, as with the full deck, and how they come to believe two is the most.', prompt: 'Taking out any one card leaves a collection of three. Why not taking out these two?', explanation: 'The full deck has exactly two collections of three, the one-picture cards and the two-picture cards, and they share no card. Setting aside one card breaks at most one of them. Setting aside the circle and the triangle-and-square card breaks both. The rows empty, triangle, circle-and-triangle, full and square, circle-and-square hold the six cards left, so no collection has three; the triangle and the square make two.', extension: 'Which two cards could you take out to break both collections of three? (Any one-picture card with any two-picture card: nine ways, this one among them.)', connection: 'Removing elements can lower the width of a poset; a chain partition of what is left certifies the new width.'},
    provenance: 'Week 19 adult guide p. 11 (“remove A and BC”), after K–1 Problem 8.'},
  {number: 9, level: 'hard', title: 'Two starts', mode: 'extend', prereq: 'rows16', inOrder: [true, false],
    decks: [{cards: DECK4X, cols: 4, start: ['A', 'BCD']}, {cards: DECK4X, cols: 4, start: ['AB', 'AC']}],
    check: {best: [2, 6]},
    idea: 'Two pinned cards can stop a collection at two, while two others grow to the largest of all.',
    hints: ['Try adding each card in turn.', 'In the first deck every card has a circle or fits inside the triangle, square and star card. In the second, four more two-picture cards fit.', 'Add the circle and star, triangle and square, triangle and star, and square and star cards to the second deck.'],
    parent: {notice: 'Whether your child finds a reason, in the first deck, that covers every card at once: it has a circle, or it hasn’t.', prompt: 'In the first deck, which cards nest with the circle and which with the big card?', explanation: 'A card with a circle holds the pinned circle card; a card without a circle uses only triangle, square and star, so it fits inside the triangle-square-star card. That covers every card, so the first collection stops at two. The second start, two two-picture cards, grows to all six two-picture cards, the largest collection of the whole deck. Stopping is not the same as being largest.', extension: 'Pin the full card instead. How big can that collection get? (One.)', connection: 'Maximal versus maximum antichains in the subset lattice on four elements.'},
    provenance: 'Week 19 grades 4–5 Problem 3: the starts A/BCD and AB/AC (the start ABCD is left out), on the reshuffled sixteen-card deck.'},
  {number: 10, level: 'hard', title: 'Rows of sixteen', mode: 'best', prereq: 'rows16',
    decks: [{cards: DECK4X, cols: 5}],
    check: {best: 6, answers: [['AB/AC/AD/BC/BD/CD']]},
    idea: 'Six rows hold all sixteen cards, each with one two-picture card, so six is the most.',
    hints: ['Build rows from the empty card up. Can you use as few rows as the cards you chose?', 'Each two-picture card needs a row of its own, and the other cards fit below and above them.', 'Rows: empty, circle, circle and triangle, circle triangle square, full; star, circle and star, circle triangle star; square, circle and square, circle square star; square and star; triangle, triangle and square, triangle square star; triangle and star. Choose the six two-picture cards.'],
    parent: {notice: 'Whether your child counts rows and chosen cards against each other, and what they do with a row that has no chosen card.', prompt: 'Which part of your board shows six can be done, and which shows seven can’t?', explanation: 'The six two-picture cards make a collection: same size, so none nests. Rows such as empty, circle, circle-triangle, circle-triangle-square, full; star, circle-star, circle-triangle-star; square, circle-square, circle-square-star; square-star; triangle, triangle-square, triangle-square-star; and triangle-star hold all sixteen cards. A collection takes at most one card from each row, so seven is impossible. Both halves are needed: a big collection alone does not rule out a bigger one, and rows alone do not show six can be reached. Many other six-row arrangements work.', extension: 'Explain why there is no other collection of six. (A one-picture card nests with seven cards that hold it and the empty card, leaving the three-picture world of the other symbols, whose largest collection is three; so a collection with it has at most four. The same goes for a three-picture card, by swapping each card for the pictures it lacks.)', connection: 'Sperner’s theorem (1928) for four elements, proved by a symmetric chain decomposition; the unique maximum antichain is the middle level.'},
    provenance: 'Week 19 grades 2–3 Problems 7 and 8, grades 4–5 Problems 5 and 6: the sixteen cards in rows and the largest collection, on the reshuffled deck.'},
  {number: 11, level: 'hard', title: 'The pinned circle', mode: 'best', prereq: 'rows16', pinned: true,
    decks: [{cards: DECK4X, cols: 5, start: ['A']}],
    check: {best: 4, answers: [['A/B/C/D', 'A/BC/BD/CD']]},
    idea: 'With the circle card kept, every card that holds the circle is out; the rest is the eight-card deck on the other three pictures.',
    hints: ['Which cards can never join the circle card?', 'The cards without a circle are like the eight-card deck on triangle, square and star. Cards with a circle can make rows of their own that need no chosen card.', 'Choose the triangle, square and star cards. Rows: empty, circle, circle and triangle, circle triangle square, full; circle and square, circle square star; circle and star, circle triangle star; triangle, triangle and square, triangle square star; square, square and star; star, triangle and star.'],
    parent: {notice: 'Whether your child notices that every card with a circle fades, and then thinks of the cards left as a smaller deck.', prompt: 'Which cards are left once the circle is pinned? Have you seen a deck like that before?', explanation: 'A card with a circle holds the circle card, and the empty card fits inside it, so none of them can join. The cards left are those made from triangle, square and star, apart from the empty card: a copy of the eight-card deck without its empty card, whose largest collection is three (puzzle 6). So the most is four, for example circle, triangle, square, star or circle with the three two-picture cards from triangle, square and star. In the rows, a row of cards that all hold the circle needs no chosen card: a collection with the circle takes nothing from it.', extension: 'Pin a two-picture card instead. How big can the collection get? (Six: it is one of the six two-picture cards.)', connection: 'The largest antichain through a given element; the reduction to a smaller lattice is the step in the proof that the middle level is the only maximum antichain.'},
    provenance: 'Week 19 grades 4–5 Problem 7: the largest collection that includes the circle card, on the reshuffled sixteen-card deck.'},
  {number: 12, level: 'hard', title: 'Five pictures', mode: 'every', prereq: 'five',
    decks: [{cards: DECK5, target: 10, cols: 5}],
    check: {answers: [['AB/AC/AD/AE/BC/BD/BE/CD/CE/DE', 'ABC/ABD/ABE/ACD/ACE/ADE/BCD/BCE/BDE/CDE']]},
    idea: 'On five pictures the largest collections are the ten two-picture cards and the ten three-picture cards, and there are no others.',
    hints: ['What made six work in sixteen cards?', 'Cards with the same number of pictures never nest. Which sizes have ten cards?', 'The ten two-picture cards, and the ten three-picture cards. Then press That’s all.'],
    parent: {notice: 'Whether your child carries “same number of pictures” over from sixteen cards, and whether they look for a second collection after the two-picture cards.', prompt: 'There are ten cards with two pictures and ten with three. Why can’t you mix them into a collection of ten?', explanation: 'Thirty-two cards: 1 empty, 5 with one picture, 10 with two, 10 with three, 5 with four, 1 full. Each size is a collection, and the two middle sizes have ten cards each. Sperner’s theorem says no collection is bigger, and for an odd number of pictures exactly these two collections reach the most. The deck has 7,581 collections in all, counting the empty one, and only these two have ten cards.', extension: 'How many cards would the largest collection have with six pictures? (Twenty, the three-picture cards.)', connection: 'Sperner’s theorem: the largest antichain in the subsets of an n-set has C(n, ⌊n/2⌋) sets, and for odd n the two middle levels are the only ones.'},
    provenance: 'New: a five-picture deck, after the review card’s “A five-symbol deck suits Hard”.'}
];

const id = n => `nests-${String(n).padStart(2, '0')}`;
const mech = nestMechanics.nests;
// A witness: the mechanic's own hints played from a fresh board.
function witness(p) {
  let b = mech.fresh(p);
  for (let k = 0; k < 400 && !mech.solved(p, b); k++) {
    const h = mech.hint(p, b);
    assert.equal(h.type, 'move', `${p.id}: hints name a move`);
    const next = mech.move(p, b, h.action);
    assert.ok(next, `${p.id}: hint move ${JSON.stringify(h.action)} is legal`);
    b = next;
  }
  assert.ok(mech.solved(p, b), `${p.id}: the hints solve it`);
  return b;
}
const out = PUZZLES.map(item => {
  const mode = item.pinned ? 'pinned' : item.mode;
  const q = {mode: item.mode, decks: item.decks.map(d => ({...d}))};
  const p = {id: id(item.number), parameters: q};
  const infos = q.decks.map(deckInfo);
  if (item.mode === 'reach' || item.mode === 'every') {
    infos.forEach((info, d) => assert.deepEqual(ofSize(info, info.target).map(s => s.map(i => info.deck.cards[i] || 'empty').sort((a, b) => a.length - b.length || a.localeCompare(b)).join('/')).sort(), [...item.check.answers[d]].sort(), `${p.id}: answers in deck ${d + 1}`));
    if (item.mode === 'reach') infos.forEach(info => assert.equal(bestOf(info), info.target, `${p.id}: the target is the most`));
  } else {
    const best = [item.check.best].flat();
    infos.forEach((info, d) => assert.equal(bestOf(info), best[d], `${p.id}: best in deck ${d + 1}`));
    if (item.check.answers) assert.deepEqual(largest(infos[0]).map(s => s.map(i => infos[0].deck.cards[i] || 'empty').sort((a, b) => a.length - b.length || a.localeCompare(b)).join('/')).sort(), [...item.check.answers[0]].sort(), `${p.id}: largest collections`);
  }
  // Tapping every card in page order reaches the goal only where there is no choice to make.
  if (item.mode !== 'best') infos.forEach((info, d) => {
    let st = {chosen: [...info.start], out: []};
    for (let i = 0; i < info.k; i++) st = tap(info, st, i);
    const goal = info.target ?? bestOf(info), forced = (item.inOrder || [])[d] ?? false;
    assert.equal(st.chosen.length >= goal, forced, `${p.id}: deck ${d + 1} tapped in page order ${forced ? 'finishes, as authored' : 'stops short'}`);
  });
  if (item.mode === 'every') assert.ok(ofSize(infos[0], infos[0].target).every(set => new Set(set.map(i => infos[0].masks[i]).map(m => lettersOf(m).length)).size === 1), `${p.id}: every answer is one size (the That's all hint says so)`);
  const end = witness(p);
  const solution = item.mode === 'every' ? {answers: infos[0] && ofSize(infos[0], infos[0].target).map(s => s.map(i => infos[0].deck.cards[i]))}
    : {chosen: end.decks.map((s, d) => s.chosen.map(i => q.decks[d].cards[i])), ...(item.mode === 'best' ? {rows: end.rows.map(row => row.map(i => q.decks[0].cards[i]))} : {}), ...(item.mode === 'reach' ? {} : {best: infos.map(bestOf)})};
  return {
    id: p.id, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Nesting cards', mechanic: 'nests', band: 'all', revision: 1, sourceDocument: 'docs/nests/README.md',
    parameters: q,
    objective: OBJECTIVE[mode], visibleObjective: VISIBLE[mode], instruction: OBJECTIVE[mode],
    controls: item.mode === 'best' ? CONTROLS.rows : item.mode === 'every' ? CONTROLS.every : CONTROLS.tap,
    rules: item.pinned ? [...RULES.best, RULES.pinned] : RULES[item.mode],
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'nests-playground', number: 0, title: 'Nesting cards playground', difficulty_level: 'playground', familyTitle: 'Nesting cards', mechanic: 'nests', band: 'playground', revision: 1, sourceDocument: 'docs/nests/README.md',
  parameters: {mode: 'playground', first: 1, choices: [{cards: DECK2, cols: 4}, {cards: DECK3, cols: 4}, {cards: DECK4, cols: 5}]},
  objective: 'Choose a deck, choose cards with no card inside another, and sort the cards into rows where each fits inside the next.', visibleObjective: '',
  instruction: 'Choose a deck, choose cards with no card inside another, and sort the cards into rows where each fits inside the next.',
  controls: CONTROLS.playground,
  rules: [FIT, TAP, 'Drag cards into rows, where each card fits inside the next. A filled circle at the start of a row means it holds one chosen card.'],
  idea: 'Free play with the four-, eight- and sixteen-card decks: choose collections and sort every card into rows.',
  prerequisites: 'None. A grown-up or a partner can set a challenge.',
  hints: ['Choose a big collection, then try to put every card in that many rows.', 'A row holds at most one chosen card.', 'Same-size cards never nest.'],
  parent: {notice: 'Whether your child counts chosen cards against rows without being asked.', prompt: 'Can you put every card in rows with one chosen card in each row?', explanation: 'When every card is in a row and each row holds one chosen card, the collection is as big as possible and the rows as few: each certifies the other.', extension: 'Set a challenge: choose two cards and ask how many more can join.', connection: 'Antichains and chain partitions in the subset lattices on two, three and four elements (Dilworth’s theorem).', sourceIds: sources},
  provenance: 'Week 19, all bands: the four-, eight- and sixteen-card decks in printed order.'
};
const json = {
  title: 'Nesting cards',
  version: 1,
  families: [{id: 'nests', title: 'Nesting cards', mathematics: 'Each card carries some of a few pictures, each always in its own place; a card fits inside another when all its pictures are on the other. The cards are the subsets of a small set ordered by inclusion, and a collection with no card inside another is an antichain. A row in which each card fits inside the next is a chain, and a collection takes at most one card from each row, so rows that hold every card bound every collection; an antichain as large as a chain partition proves both best (the easy half of Dilworth’s theorem). On the full decks of 2, 3, 4 and 5 pictures the most is 2, 3, 6 and 10, the middle size (Sperner’s theorem); on four pictures the six two-picture cards are the only collection of six, and on five the two-picture and three-picture cards are the only collections of ten. A collection that can take no more cards need not be largest. With a card kept, the cards that nest with it are out, and the rest is a smaller deck.', rules: [FIT], sourceIds: sources}],
  sources: [
    {id: 'nests-week19', title: 'Bellingham Math Circle — Week 19: No card inside another (subset antichains), K–1, grades 2–3 and grades 4–5 packets and adult guide', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-19', kind: 'local curriculum'},
    {id: 'nests-card19', title: 'Week 19 review card and math check (keep; App fit and Decision: choose with nesting pairs linked, fixed starts, rows as the certificate)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-19.md', kind: 'local curriculum'},
    {id: 'nests-stanley', title: 'Richard P. Stanley — Algebraic Combinatorics: Walks, Trees, Tableaux, and More, chapter 4, The Sperner property (chains, antichains and the chain-partition bound); the Week 19 guide cites the 2006 MIT 18.318 notes, section 4, pp. 17–25', url: 'https://math.mit.edu/~rstan/algcomb/algcomb.pdf', kind: 'research'},
    {id: 'nests-dilworth', title: 'R. P. Dilworth — A decomposition theorem for partially ordered sets, Annals of Mathematics 51 (1950), 161–166', url: 'https://doi.org/10.2307/1969503', kind: 'research'},
    {id: 'nests-sperner', title: 'Emanuel Sperner — Ein Satz über Untermengen einer endlichen Menge, Mathematische Zeitschrift 27 (1928), 544–548', url: 'https://doi.org/10.1007/BF01171114', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/nests/nests.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.mode === 'every' ? `${p.solution.answers.length} answers` : p.parameters.mode === 'reach' ? `targets ${p.parameters.decks.map(d => d.target).join(', ')}` : `best ${p.solution.best.join(', ')}`}${p.solution.rows ? `, ${p.solution.rows.length} rows` : ''}`).join('\n'));
void names; void lettersOf;
