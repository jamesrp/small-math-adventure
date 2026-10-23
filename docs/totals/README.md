# Running totals

October 23, 2026. Twelve puzzles and a playground built from Week 89 of the Bellingham math circle (Growing shapes and totals: discrete calculus). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 89 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-89.md) says keep, rates the app fit B, and its App fit shaped this family: input cards in a lane run through two or three trays, solves are an exact total or the largest or smallest, judged by the app, Can't past the maximum is certified by the child's sorted order, played, and the hidden-start problem becomes a find-every puzzle with That's all. Shapes, shells and corner piles stay on paper.

## The mathematics

Cards go into a lane, one card a turn. Each turn adds the card to tray 1's total, then adds tray 1's **new** total to tray 2's, and tray 2's new total to tray 3's. Every tray keeps what it had. On the board each total is the one to its left plus the one above it.

- **The weights.** After N turns the last of k trays holds what its starts give plus Σ C(N − i + k − 1, k − 1) · u_i, where u_i is the card on turn i. With one tray every card counts once. With two trays and five turns the cards count 5, 4, 3, 2 and 1 times (each card once for every turn left, its own included); with three trays 15, 10, 6, 3 and 1, the running totals of the two-tray weights read backwards. This is summation by parts, or the hockey-stick identity, in Concrete Mathematics §2.6 and §5.1. Assumption: the cascade copies the newly updated total, as the worksheet's rule says; copying the old one gives other weights.
- **Order and the extremes.** With one tray every order makes the same total (a sum does not depend on the order of its terms). With two or more trays the weights fall strictly, so if a smaller card a comes just before a bigger card b, swapping them raises the total by (b − a) times the drop in weight. Hence biggest first is the **only** order that makes the most, and smallest first the only order that makes the least (the rearrangement inequality, proved by the adjacent swap the worksheet's Problem 13 asks for). This is the certificate for **Can't**: a target above the most or below the least is ruled out by one sorted lane, played.
- **Not every total between.** The reachable totals need not fill the range. Two trays with 2, 2, 1, 0, 0 make every total from 9 to 21, but 4, 1, 0, 0, 0 make 4a + b with a ≠ b and miss 10, 15 and 20; three trays with 2, 2, 1, 0, 0 make only 25 of the totals from 14 to 56. So a target inside the range has no general certificate, and no puzzle asks Can't for one.
- **Going back.** Differences undo totals: a card is tray 1's new total minus its old one, and tray j − 1's new total is tray j's change. So a row of last-tray totals and the starts fix the cards (take differences once per tray). Without the start, totals with the same changes differ by a constant, and limits on the cards decide which starts are possible: totals 4, 7, 7, 12 with cards 0 to 5 allow exactly the starts 0 to 4.

Experiments come first: play cards and watch the trays fill, compare two orders, move a 0. The conjectures (order matters only with two trays, biggest first wins, a 0 still copies) come from the grid. The explanations, the swap argument above all, are grown-up conversations in each puzzle's notes.

**Why the child plays, not predicts.** The card's pitfall: no predict-the-total screen. Here every total appears as the child lays cards, and the puzzles ask for an order, a set of cards or every start; the app never runs a hidden step.

## Where they appear

**Puzzles → Running totals** (symbol Σ) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`); roughly, Easy suits K–1 with a grown-up reading, Medium grades 2–3 and Hard grades 4–5.

| # | Level | Kind | Trays | Cards or goal | Answer | Week 89 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Match | 1, start 2 | totals 5, 5, 9, 12 | 3, 0, 4, 3 | P8 |
| 2 | Easy | Make 12 | 1, start 3 | 0, 1, 2, 3, 4 | Can't: every order makes 13 | P7 |
| 3 | Easy | Make 5 | 2 | 2, 1 | 2, 1 (1, 2 makes 4) | two-tray worked turn |
| 4 | Easy | Make 4 | 2 | 2, 0 | 2, 0 (a 0 still copies) | P12's zero rule |
| 5 | Medium | Make 9 | 2 | 3, 1, 0, 0 | 0, 1, 3, 0, the only order | P12 |
| 6 | Medium | Make 21 | 2 | 2, 2, 1, 0, 0 | 2, 2, 1, 0, 0, the most | P11, P13 |
| 7 | Medium | Make 22 | 2 | 2, 2, 1, 0, 0 | Can't: biggest first makes 21 | card's App fit |
| 8 | Medium | Every start | 1 | totals 4, 7, 7, 12, starts 0–8 | starts 0, 1, 2, 3, 4 | P9 |
| 9 | Hard | Make 14 | 2 | 4, 1, 0, 0, 0 | 0, 0, 4, 1, 0, the only order (10, 15, 20 can't be made) | card's App fit |
| 10 | Hard | Make 41 | 3 | 2, 2, 1, 0, 0 | 1, 2, 0, 2, 0, the only order | P18, card's App fit |
| 11 | Hard | Make 13 | 3 | 2, 2, 1, 0, 0 | Can't: smallest first makes 14 | P13, P18 |
| 12 | Hard | Match | 2 | tray 2 totals 2, 5, 8, 14 | 2, 1, 0, 3 (differences twice) | P8, P10, carried to two trays |

The worksheets are in [math-circle-worksheets, week 89](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-89). Puzzles 1, 2, 5, 6 and 8 use the worksheet's own numbers (2 turns 7's question into a target it cannot reach); 3 and 4 are the two-tray rule's first cases; 7, 9, 10 and 11 follow the card's App fit (Can't past the maximum by the sorted order; the gapped deck; three trays, where drag-until-green stops working); 12 is new. Every exact target in a make puzzle is reached by exactly one order, so trying orders until a cell turns green is slow, and the card's warning that with 2, 2, 1, 0, 0 every total from 9 to 21 occurs is met by asking only for its ends there.

## How a puzzle plays

- **The board.** A grid like the worksheet's table: turn numbers across the top; the lane of cards (dashed empty turns, sun cards with a numeral and pips); one row per tray, numbered by a small tray glyph, with its start and then its total after each turn; and, in pine under the last tray, the goal: one flag total under the last turn for a make puzzle, a total under every turn for match and every puzzles. A last-tray total turns green when it meets its goal and ochre when it misses. Totals stop at the first empty turn. The cards to play are below the grid. There is no other text on the board except the every puzzle's objective line and the word "start" over the start column.
- **Cards.** Tapping a card puts it in the first empty turn. Tapping a turn picks it (outlined): a card tapped next goes there (changing the card in it, which goes back to the hand), another turn tapped next trades cards with it (one may be empty), and the picked turn tapped again gives its card back. A card can also be dragged onto a turn, a card in a turn onto another turn (they trade), or a turn's card back to the cards. When a move lands, the cells it changed pop in order, the card, then tray 1, tray 2 and tray 3, so the cascade can be watched (not with reduced motion).
- **Make** (2–7, 9–11). Use every card once. Solved the moment the lane is full and the last tray finishes on the flag. Every make puzzle has **Can't**, so its presence gives nothing away. Can't is off until every card is down, and judges the lane on the board: it is accepted when the lane makes the most and the flag is more, makes the least and the flag is less, or (one tray) every order makes the same, with one line, "Biggest first makes the most: 21.", "Smallest first makes the least: 14." or "Every order makes 13." Anything else gets "That doesn't rule it out."; the refusal is recorded in the save and Can't then waits until a card changes. Undo keeps that wait while the lane is the same, and one press goes back past it to the last card, so Can't and Undo are not a free yes-or-no test.
- **Match** (1, 12). Cards come from an endless supply, 0 to 5. Solved when the last tray's totals match every flag.
- **Every** (8). One tray with an unknown start (shown as ?). The child taps a start number, 0 to 8, and plays cards 0 to 5; a start is recorded (its button turns green) the moment its cards make every total. **That's all** says "There is another." until every start is found, and then waits for a new find. No slots, no count. Undo keeps the starts found and the wait.
- **Hints.** Before any move, the first hint is the authored nudge, which never names the deciding condition or says "Press Can't". Then each hint is one step toward a lane: the nearest lane that makes the target, the cards a row of totals needs, or, when the target can't be made, the sorted lane; it mends the first turn that differs ("Play 0 next.", "Put 2 in turn 3.", "Change turn 2 to 1.", "Swap turns 2 and 3." when the card it needs is in the lane in the wrong place). With the sorted lane down the hint gives the reason, "Biggest first makes the most, 21. 22 is more.", and outlines Can't. In an every puzzle the hints choose a start not yet found ("Start at 0."), its cards, and finally "Press That's all." The second level outlines the turn and card, the start or the button; the third offers Apply hint. Hints alone finish every puzzle from a fresh start, after random play, after a refused Can't and after a wrong That's all. Hints are memoised per board.

## The playground

Six turns, cards 0 to 5 from an endless supply, every tray starting at 0, and a choice of 1, 2 or 3 trays (the cards stay when the trays change). No goal and no Hint, and it never counts as solved. Six 1s through three trays show 1 to 6, the triangle numbers 1, 3, 6, 10, 15, 21 and the corner-pile numbers 1, 4, 10, 20, 35, 56 (Problem 18).

## Rules that keep the record honest

- The save is the lane and the Can't claim or refusal (make); the lane (match); the start, the lane, the starts found, That's all's answer and the done flag (every); or the number of trays and the lane (playground). Every total on the board is derived from it.
- Only legal moves are accepted: a card into an empty turn from the hand (make) or the supply (match, every); a different card into a full turn; a card back out; two turns with different cards trading; a start within 0 to 8 in an every puzzle; Can't only in make puzzles, only with the lane full, not again before a change; That's all only in every puzzles, not twice without a new find; 1 to 3 trays only in the playground; nothing after a solve.
- Saved boards are checked: the lane's length and cards (no card the deck does not hold, no more copies than it has, nothing past the supply); a kept claim only with its reason on the lane; a refusal only of a full lane that is no reason and misses the target; every start found works, in order, and a start whose lane makes the totals is found; "There is another." only while one is missing; done only with every start found.
- The answers, reasons and witnesses are computed by `scripts/build-totals.mjs` with the mechanic and checked again by `scripts/validate-totals.mjs` by other methods.

## Files

| File | Contents |
|---|---|
| `dist/families/totals/totals.js` | The tray machine, weights, every order of a deck and the totals it reaches, the most and least, differences back to cards, the starts a row allows, the Can't reasons, the `totals` mechanic (moves, hints, rendering, taps and drags) and the playground |
| `dist/families/totals/totals.css` | The grid, cards, tray glyphs, goal row, hand, start buttons, tray buttons and the pop |
| `dist/families/totals/totals.json` | The pack: a playground, 12 puzzles, 1 family and 4 sources |
| `scripts/build-totals.mjs` | Authoring list; checks each target's unique order, each Can't against the sorted ends, the gaps, the 25 three-tray totals, the cards for each match puzzle and the every puzzle's starts, and writes `totals.json` |
| `scripts/validate-totals.mjs` | A tray simulator written separately; every ordering of every deck of up to five cards 0–4 with one to three trays (753 decks): the weight formula, only biggest first makes the most and only smallest first the least, one tray ties; Can't sound for every full lane and every target from the least − 2 to the most + 2 (about 310,000 checks), and the sorted lane accepted past either end; each puzzle's claim by trying every order, every lane of cards 0–5 and every start to 30; the numbers in the copy; witnesses as moves; hint chains from fresh, after random play, a refused Can't and a wrong That's all; every Undo press changing the board; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/totals.test.mjs` | The machine and the worksheet's numbers, going back, Can't reasons, make and the hand, taps with and without a picked turn, the pop, Can't with its lock through Undo, hints, every and That's all, saves, the playground and rendering |
| `scripts/totals-browser-smoke.mjs` | The interface in a browser: tapping cards and turns, Enter on a card, dragging onto a turn, between turns and back to the cards, Can't refused and accepted with Undo past the refusal, the every puzzle with There is another, three trays, the playground, focus after moves and the phone layout |

To change a puzzle, edit `scripts/build-totals.mjs`, then run `node scripts/build-totals.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch: whether children read the grid's cascade, each total as the one to its left plus the one above, or need the pop and a grown-up to see that tray 2 gains tray 1's **new** total (the worksheet's own worry: only a partner enforces "copy the new first total"); whether the sorted-lane Can't is found, or children fill the lane in some order and press Can't, get refused and stop (puzzles 7 and 11 are the test; puzzle 2's any-lane Can't may teach the wrong lesson first); and whether tapping a turn to pick it, then a card or another turn, is discovered, or children only add cards and use Restart, and whether dragging is found at all.
- **Exact targets inside a gap.** A total like 15 with 4, 1, 0, 0, 0 has no sorted-lane certificate; its reason (4a + b needs a = b) is an argument about weights. No puzzle uses one; a certificate the child could point at is not designed.
- **Shapes, shells and corner piles** (Problems 1–6 and 14–20) stay on paper, as the card says: growth is watch-only, the solids are 3D, and the stair pairing is too easy for Tile gardens.
- **Problem 10** (the same cards from starts 1 and 4 keep the totals 3 apart) is not a puzzle here: on a screen it is a prediction. Puzzle 8's notes carry the idea that totals with the same changes differ by a constant. Two-tray puzzles with starts other than 0 work in the mechanic, but none is authored.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
