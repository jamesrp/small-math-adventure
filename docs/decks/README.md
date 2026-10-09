# Three decks

October 9, 2026. Twelve puzzles and a playground built from Week 24 of the Bellingham math circle (nontransitive dice and decks). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 24 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-24.md) says keep, App fit B, size M ("Deal 1–9 into three decks with a live win grid; goal a cycle, or the best cycle"). It asks for nine number cards moved among three decks by two-tap swaps, so every state is a legal deal; a 3 × 3 win grid for each pair of decks; cycles, the three pinned cycles with That's all, find-every puzzles, two big wins, and Can't puzzles mixed with possible ones so that Can't is no free guess. It warns against "x of n" counters, and that a live grid lets random swapping stumble on a cycle (lean on pins and find-every, or have K–1 tap each pair's winner first).

## The mathematics

Two decks play: a card is drawn from each, every card in a deck as likely as any other, so every pair of one card from each deck is as likely as any other, and the bigger number wins. A deck beats another when it wins more than half of the pairs.

- **The cycle.** A = (2, 4, 9), B = (1, 6, 8) and C = (3, 5, 7) each win 5 of their 9 pairs against the next: A beats B, B beats C and C beats A. Every deck totals 15, so totals don't settle anything, and no deck is best (nontransitive dice).
- **How rare and how strong.** Of the 1,680 ways to deal 1–9 into decks A, B and C, 15 make the cycle A beats B, B beats C, C beats A (and 15 the other way). Every one has a weakest win of exactly 5 of 9. Two big wins (6 of 9 or more) happen in one cycle only, A 2 3 9, B 1 7 8, C 4 5 6, turned round; three never. The argument: turn the decks round so A holds the 9, with smaller cards a < b. No card beats 9, so for 6 wins over A every C card beats a and b; B's cards below b then lose to all of C, so B needs two cards above b; that leaves at most one B card for a and b to beat, and A wins at most 5 pairs against B.
- **Pinned 9, 8 and 7.** With 9 in A, 8 in B and 7 in C, 3 of the 90 deals cycle (none the other way, though B beats A in 30). A beats B exactly when A's two small cards win at least 2 of their 4 pairs against B's, and likewise for B against C; C beats A exactly when C's small cards win at least 3 of 4 (the guide's certificate, p. 9).
- **Ties.** Two decks of two from 1–4 tie only as 1 4 against 2 3 (either way round): the 1 loses both its pairs, so its partner must win both of its own, and only the 4 can.
- **Impossible.** Two decks of three with no shared number never tie: nine pairs can't split evenly. Two-card decks never cycle: the deck holding the smallest card loses both pairs it is in, so it wins at most 2 of 4 and beats nobody.
- **Find every.** With A = (2, _, 9), of 0, 2, 4, 9 and 10 only 2 and 4 keep the cycle (the card must beat B's 1 and lose to two of C's cards); of the nine swaps of an A card with a B card, the five that give B the 9 or A the 1 make B beat A (B then wins 9, 6, 5, 5 and 6 pairs).

Experiments come first: puzzles 1–3 have the child find the winner of each pair before anything is coloured, and the later grids colour every pair by its winner but show no counts. In the find-every puzzles (5, 6 and 8) the grids say nothing about who beats whom: the child counts, and Keep checks. Only the deal puzzles, which solve themselves the moment the decks work, say "A beats B" under each grid. The general arguments are in the grown-up notes; no puzzle asks for a written proof or a fraction. `scripts/validate-decks.mjs` checks every claim above with a separate enumeration (a deal as a deck letter for each card, every pair compared).

## Where they appear

**Puzzles → Three decks** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Decks | Task | Answer | Week 24 source |
|---|---|---|---|---|---|
| 1 | A against B | A 2 4 9, B 1 6 8 | Tap each pair's winner; which deck wins more? | A, 5 pairs to 4 | K–1 P1, 2–3 P1 |
| 2 | B against C | B 1 6 8, C 3 5 7 | The same | B, 5 to 4 | K–1 P2, 2–3 P1 |
| 3 | C against A | C 3 5 7, A 2 4 9 | The same; then does any deck beat both others? | C, 5 to 4; no | K–1 P3, 2–3 P1 |
| 4 | Split four cards evenly | 1–4 in two decks of 2 | A tie | A 1 4, B 2 3, either way round | companion to K–1 P7 |
| 5 | Every swap | A 2 4 9, B 1 6 8 | Every swap of an A card with a B card that makes B beat A | 5 swaps | K–1 P6 |
| 6 | A missing card | A 2 _ 9, B, C | Every card of 0, 2, 4, 9, 10 that keeps the cycle | 2 and 4 | 2–3 P4 |
| 7 | Split six cards evenly | 1–6 in two decks of 3 | A tie | Can't (nine pairs) | K–1 P7 |
| 8 | 9, 8 and 7 stay put | 9, 8, 7 pinned | Every deal of 1–6 that cycles | 3 deals | 2–3 P3, 4–5 P2 |
| 9 | Make a cycle | From A 3 6 9, B 2 5 8, C 1 4 7 | A beats B, B beats C, C beats A | Any of 15 (the two nearest, two swaps away, have one big win each) | review card, 4–5 P2 |
| 10 | Two-card decks | 1–6 in three decks of 2 | A cycle | Can't (the deck with 1) | K–1 P8, 2–3 P7, 4–5 P6 |
| 11 | Two big wins | From puzzle 1's decks | A cycle with two wins of 6 or more | 3 deals (one cycle turned round) | review card |
| 12 | Three big wins | From puzzle 1's decks | A cycle with three | Can't | 4–5 P7 |

Each puzzle's `provenance` names its problems. The worksheets' bags and rounds become the playground; the cards themselves are the controls. Puzzle 4 is not on the worksheets: it comes before puzzle 7 so that the first Can't has an answer, and it took the place of K–1 Problem 5 (a third card for A 2 4 _), whose idea puzzle 6 carries for grades 2–3.

## How a puzzle plays

- **The decks.** A row per deck, lettered A, B and C in brown, green and blue. Each card shows its numeral over its dots, in rows of five as on a ten frame.
- **Pairs** (puzzles 1–3). The nine pairs of the two decks, a box each, show both cards as buttons. Tapping the bigger card circles it and fills the box with its deck's colour; tapping the smaller one only says which is bigger ("2 is bigger than 1."). Once every pair is marked, **A wins more** and **B wins more** (with the puzzle's letters) ask which deck wins more pairs; the wrong one says "Count again." and greys. Puzzle 3 then shows the three results together (A beats B, B beats C, C beats A) and asks "Does any deck beat both others?" with **A**, **B**, **C** and **No**: a deck named is answered with the deck that beats it ("C beats A.") and greys, and No solves the puzzle.
- **Win grids** (every other puzzle). Each comparison (A against B, B against C, C against A) has its grid of pairs, each box in its winner's colour with the winning card ringed. No numbers. In the deal puzzles a line under each grid says "A beats B" or "A and B tie"; in the find-every puzzles it doesn't.
- **A card to try** (puzzle 6). A row of cards below the decks; tapping one puts it in the empty place, dashed. **Keep** checks it: one that doesn't work is refused, naming the win it misses ("C doesn't beat A."), until another card is tried. **That's all** is the claim, as in the other case families: "There's another." if something is missing. Then the catalog shows every card in columns: It works, A doesn't beat B, C doesn't beat A.
- **One swap** (puzzle 5). Tap an A card and then a B card (or the other way) to swap them; the two moved cards are tinted and the others fade until **Swap back** undoes it or **Keep** checks it, puts it on the shelf and swaps back, or refuses it ("B doesn't beat A."). After That's all, the catalog shows all nine swaps by A's card, the five that work in green.
- **Deals** (puzzles 4, 7 and 9–12). Tap a card, then a card in another deck, to swap them; tapping another card in the same deck picks that one instead, and the picked card again puts it down. Any move, Undo or applied hint puts a picked card down. The puzzle is solved the moment the decks work. **Can't** is checked: refused with "Keep looking." until the decks change if some deal works, otherwise it solves the puzzle and shows a certificate: all ten splits of puzzle 7 with 1 in A, in columns by score ("5 to 4" … "9 to 0"); card 1's pairs ringed in puzzle 10's grids; all 15 cycles of puzzle 12 in columns by their big wins. Puzzle 4, the first with Can't, has an answer; so do puzzles 9 and 11.
- **Every deal** (puzzle 8). Cards swap as above, but 9, 8 and 7 are pinned pictures. Keep checks the decks, naming each win missing ("A doesn't beat B. B doesn't beat C."); That's all as above, then the catalog of all 90 deals in columns by A's two small cards, each showing B's and C's small cards, the three cycles in green.
- **Keyboard and screen readers.** Every card and pair is a button; focus stays on the card that moved (it follows the card to its new deck), after a marked pair it moves to the first open one, and after puzzle 3's choice to its question. A screen reader hears the decks and the card picked, each box ("A 2 against B 1: A wins"), every note, and in the deal puzzles the verdicts.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the next pair's winner ("2 is bigger than 1."), puzzle 3's answer ("Look at each deck in turn. Which deck beats it?"), the next card or swap to try, Keep or That's all; in a deal, one swap toward the nearest deal that works ("Swap 1 and 5."), a direct exchange when there is one so each swap puts at least one card where it belongs; or Can't when no deal works. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

Puzzle 1's three decks, with free swaps. **A against B**, **B against C** and **C against A** choose the match; **Draw** plays one round (a card from each deck, the bigger wins) and **Draw 10** ten, up to sixty; each round lands in its winner's pile, beside the match's win grid. Changing the decks or the match clears the piles; **Clear** empties them. There is no goal, no Hint, and it never counts as solved. A 5-to-4 edge is small: ten rounds often go the other way, which is the worksheets' point about short runs.

## Rules that keep the record honest

- Only legal moves are accepted: no marking the smaller card or a pair twice, no choosing a deck before every pair is marked or the same wrong deck twice, no answer to puzzle 3's question before the choice or the same deck twice, no menu card outside the menu or the one already there, no second swap before Swap back, no swap within a deck or of a pinned card, no Keep twice on the same case or after a refusal without a change, no That's all with nothing kept or twice in a row, no Can't twice without a change, and no moves after a solve. In the playground, no more than sixty rounds.
- A save is rejected if its decks are not a deal of the puzzle's cards (sorted, pins in place), a marking is out of order, a chosen deck is wrong, puzzle 3's answer comes before the choice, a kept case is repeated or doesn't count, That's all was accepted with something missing, a refused Keep is recorded for a case that works, or the playground's rounds hold a card not in its match's decks.
- Undo takes back the last action, a Keep included.

## Files

| File | Contents |
|---|---|
| `dist/families/decks/decks.js` | Wins, beats and big wins; deals, swaps and goals; the `decks` mechanic (moves, hints, rendering, wiring, the picked card as view-only state) and the playground |
| `dist/families/decks/decks.css` | Cards with dots, deck rows, win grids and pair buttons, small decks for shelves and catalogs; imports `dist/cases.css` |
| `dist/families/decks/decks.json` | The pack: 12 puzzles, the playground, 1 family and 2 sources |
| `scripts/build-decks.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-decks.mjs` | A separate enumeration; the theorems above; each puzzle's answers; that hints alone solve every puzzle from its start and from every deal, card, swap or marking a child can reach; illegal moves; That's all early and twice; refused Keeps and Can'ts; Undo; forged saves; the playground; run by `npm run build` |
| `scripts/decks-browser-smoke.mjs` | Plays the family in a browser: marking pairs (by keyboard too), the smaller card's note, a wrong deck greyed, puzzle 3's question; a possible Can't; a card tried and refused with the win it misses, and the catalog; swaps kept and refused with the catalog; Can't refused and right with each certificate; two-tap swaps by keyboard and a pick Undo forgets; pins; and the playground |
| `tests/decks.test.mjs` | Wins and deals, moves, hints, rendering, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-decks.mjs`, then run `node scripts/build-decks.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether K–1 children can mark nine pairs without losing interest (the worksheets share them among a table); whether counting a grid without a verdict in puzzles 5, 6 and 8 is too much, or just right; whether the live verdicts in puzzles 9 and 11 invite random swapping (the card's worry), or children aim at the verdict that is wrong; and whether "big win" (6 of 9 or more) is clear without numbers.
- **Totals.** Grades 2–3 Problem 6 (deal nine of the cards 1 to 12 into decks totalling 15, 18 and 21 that cycle: 119 such deals, one works, A 3 5 7, B 2 4 12, C 1 9 11) is left out by choice of scope: it needs three spare cards beside the decks, which the deal puzzles don't have. The card names totals as a Hard puzzle and as a guard against random swapping, so it is the first candidate for a return visit.
- **Repeats.** Grades 4–5 Problem 3 (numbers 1 to 6 with repeats within a deck, 30 solutions) needs written numbers; it stays on paper.
- **A third card.** K–1 Problem 5 (try 3, 5, 7 and 9 in A 2 4 _) gave its place to puzzle 4; puzzle 6 asks the same kind of question.
- **Copies and chances.** Grades 2–3 Problem 5 and grades 4–5 Problems 4 and 5 (six-card decks, exact chances, the rule for two-card decks) are left out, as are the bonus packet's label bags.
- **Rounds to predict.** K–1 Problem 4 and grades 2–3 Problem 2 ask what short runs of rounds can show; the playground stands in for them, with no goal.
- **Drag.** Cards swap by two taps; dragging one card onto another is not supported.
- **Story.** Three decks is not on the Lantern Road and has no keeper lines.
