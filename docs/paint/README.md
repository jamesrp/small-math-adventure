# Paint rows

October 5, 2026. Eleven puzzles and a playground built from Week 46 of the Bellingham math circle (two boards forget their starts) and its bonus pages (boards that forget). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 46 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-46.md) says keep, and its App fit shaped this family: show every start, let identical rows stack, and make the puzzles from restricted menus of cards (copies with one paint, paint-tile-1 with the shift, tiles that can only be turned), since with every paint card on offer the answer is always "paint each tile once". Two-row repairs, which the card calls too easy, appear only as the entry puzzle and as one contrast.

## The mathematics

A **row** is a few two-sided tiles, each showing yellow or blue. A **card** acts on every row on the table at once: a paint card makes one tile (or, on a wide card, several) yellow or blue whatever it showed before; a turn card turns a tile over; a copy card gives one tile's colour to another, in each row separately; the shift moves every tile one place left and the first tile round to the end. In the pack a card is a string: one character per tile (`.` leaves the tile, `Y` or `B` paints it, `F` turns it), `C12` for the copy from tile 1 to tile 2, or `<` for the shift.

- **Painting forgets.** After a tile is painted every row shows the same colour there, and every later paint or turn card treats those rows alike at that tile, so they never differ there again. Two rows therefore need exactly one paint card for each tile where they differ: the fewest cards is their Hamming distance (puzzle 1). Each card fixes at most one difference, and one card per difference is enough.
- **Every start.** Put all 2^n rows of n tiles on the table. A run of paint and turn cards makes them all alike exactly when it paints every tile; with u tiles never painted, there are exactly 2^u different rows left (puzzle 2 shows 8, 4, 2, 1).
- **One-to-one cards never join.** A turn card changes both rows at its tile, so a difference there stays a difference; the shift only moves tiles around. Both are one-to-one on rows, so on their own they never join two rows. A tile that only turn cards touch keeps every difference it starts with, so rows that differ there never become one (puzzle 3).
- **Copies keep the one-colour rows.** A copy uses only colours already in each row, so the all-yellow and all-blue rows never change, and two rows that differ at every tile still differ at every tile after any copy. Copies alone never join those pairs (puzzle 6, Week 46 bonus Problem 1). With one paint card, every start can be joined exactly when the copies lead from the painted tile to every tile (puzzle 7, the bonus guide's extension).
- **Paint and shift.** With "paint tile 1" and the shift, every tile must be painted while it is at the front, and two paints in a row paint the same tile, so the fewest cards is n paints with n − 1 shifts between them: 2n − 1, in exactly one order, paint first and last (puzzles 8 and 9, bonus Problem 3 and its extension).
- **The last paint, then its turns.** A painted tile finishes as its last paint, turned over once for each later turn on it; turns before that paint are wiped out (puzzle 4). For two rows that already agree at a tile, a turn alone can bring both to the goal there, which every start could not do (puzzle 5).
- **Peeling.** With wide cards the order matters: the last card must agree with the goal on every tile it paints, and working backwards from it finds the order (puzzles 10 and 11, each with exactly one shortest order).
- **Random cards.** The playground's Draw plays one of the 2n single-tile paint cards at random. Every start is alike once each tile has been drawn, which no fixed number of draws guarantees; once it happens, each finish is equally likely, whatever the starts (Week 46 grades 4–5 Problem 6: tiles 1, 3, 1, 2 with 16 colour choices give each of the 8 finishes twice).

This is the coupling of the lazy random walk on the hypercube (every copy refreshes the same coordinate with the same bit, and the copies agree once every coordinate has been refreshed; Levin, Peres and Wilmer, *Markov Chains and Mixing Times*), and the idea behind coupling from the past (Propp and Wilson, 1996), which runs every start with the same random moves until they agree. The puzzles only use the finite statements above. `scripts/validate-paint.mjs` checks them over every case it can list: the Hamming distance for every pair of rows of up to 4 tiles; 2^u finishes, turns keeping differences, and the last paint then its turns for every run of up to four single-tile cards on 3 tiles; every run of up to five of the six copies on 3 tiles; one paint with each of the 64 sets of copies on 3 tiles; and paint-and-shift for 2 to 5 tiles.

## Where they appear

**Puzzles → Paint rows** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Rows | Cards | What counts as a solve | Week 46 source |
|---|---|---|---|---|---|
| 1 | Three differences | YBY, BYB | 6 single paints, 3 to play | Rows match (any 3 cards painting each tile once) | Launch; K–1 P1, 2–3 P1 |
| 2 | Every start | All 8 | 6 single paints, 3 to play | Every row alike | 2–3 P2, P5; 4–5 P2, P3 |
| 3 | One tile only turns | All 8 | Y.., F.., .F., ..B, ..F | Can't, two rows that differ at tile 2 | 2–3 P6, P7; 4–5 P4, P5 |
| 4 | One picture | All 8, goal BYB | Y.., .Y., ..Y, F.., ..F, 5 to play | Each turn after its paint | 4–5 P5 |
| 5 | Two rows, one picture | YBYB, YYBB, goal BBYB | F..., .Y.., .F.., ..Y., ...Y, ...F, 4 to play | Turn tile 1; paint then turn tile 2; paint tile 3 | New; contrasts 4 |
| 6 | Copies only | All 8 | copy 1→2, 2→3, 3→1 | Can't, the all-yellow and all-blue rows | Bonus P1 |
| 7 | One paint and copies | All 8 | .B., copy 1→2, 2→3, 3→1, 3 to play | .B., copy 2→3, copy 3→1 (the only order) | Bonus P1 and its extension |
| 8 | Paint and shift | All 8 | Y.., shift, 5 to play | Paint, shift, paint, shift, paint (the only order) | Bonus P3 |
| 9 | Paint and shift, four tiles | All 16 | Y..., shift, 7 to play | Paint and shift in turn, 2n − 1 (the only order) | Bonus P3 extension |
| 10 | Wide cards | All 16, goal YBYB | YY.., .BB., ..YB, B..B, 3 to play | YY.., .BB., ..YB (the only order) | New; guide page 1 |
| 11 | Wide cards and a turn | All 16, goal BYBB | .BB., YY.., ..YY, F..F, YB.., 4 to play | ..YY, .BB., YY.., F..F (the only order) | New; 4–5 P5 |

Each puzzle's `provenance` names its problems. The worksheets are in [math-circle-worksheets, week 46](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-46); they use red and blue counters on three-slot boards. Puzzles 1 and 2 use the worksheet's rows and full card set; puzzles 6, 8 and 9 use the bonus menus (with three of its six copies in 6); the other pairs, hands, goals, the copy menu of puzzle 7 and the wide cards are new.

## How a puzzle plays

- **The table.** Two rows are drawn large, one above the other. Every start is drawn as stacks: rows that have come to match sit on one stack with its count (×2, ×4, …), in the place of the first start that reached it, so the number of stacks is the number of different rows. A goal row, when there is one, sits above in a yellow card. Tiles that a card changed turn over briefly; a stack that just gathered rows pops.
- **Cards.** A paint or turn card is a small row of cells: a painted cell where it paints, a half-yellow, half-blue cell with a turn arrow where it turns, and a dotted empty cell where it leaves the tile alone. A copy card draws an arrow from a dot on one cell to the outlined cell it writes; the shift card puts a left arrow in every cell and a curve from the first cell round to the last. Tap a card to play it on every row. Cards can be played again.
- **Budget.** In puzzles with a budget, an outline under the rows stands for each card that may be played; each card played fills one. The budget is always the fewest cards, so a wasted card means Undo.
- **Can't.** Every puzzle with every start on the table offers Can't, solvable or not, so its presence gives nothing away; the two-row puzzles do not. Can't turns each stack into a button: tap one, then another, to claim that those two rows can never become one. The claim is about the starts on the two stacks, so it can be made before any card or later. A right claim solves the puzzle and rings both stacks; a wrong one is refused ("Those two can still become one.") and the next card clears it.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the first card of a shortest finish in words ("Tile 2 blue.", "Copy tile 2 to tile 3.", "Shift every tile one place left."), or, when two rows can never join, Can't with those two stacks marked; with the budget spent they say Undo. The third level offers Apply hint, and hints alone finish every puzzle.

## The playground

Two, three or four tiles; two rows (Two rows deals a new random pair) or every start; every single-tile paint and turn card; **Draw**, which plays a random paint card; and **Clear**. There is no goal, no Hint, and it never counts as solved.

## Rules that keep the record honest

- Only legal moves are accepted: cards from the hand, no card past the budget, Can't only where offered and only on two different rows on the table, and nothing after a solve. The playground takes only single-tile paint and turn cards that fit its rows.
- The save is the list of cards played plus the claim, stored as the two starts it names (in order), and everything shown is derived from it. A save is rejected if it names a card not in the hand, runs past the budget, keeps a claim on two starts that can join, or keeps a refusal of two starts that really never join.

## Files

| File | Contents |
|---|---|
| `dist/families/paint/paint.js` | Cards on rows, every start, the shortest-finish search, the search for two starts that never join, the `paint` mechanic (moves, hints, rendering) and the playground |
| `dist/families/paint/paint.css` | Styles, using the shared board palette |
| `dist/families/paint/paint.json` | The pack: 11 puzzles, the playground, 1 family and 3 sources |
| `scripts/build-paint.mjs` | Authoring list; computes each puzzle's fewest cards, or the two starts that never join, and writes the pack |
| `scripts/validate-paint.mjs` | A separate simulator (rows as bit masks, every run of cards listed in turn, pairs of rows searched); the theorems over every small case; each puzzle's fewest cards, budget, witness, unique order on Hard, the pairs that never join with a certificate for each, and refusals; hints alone from fresh, refused and wasted states; illegal moves; forged saves; the playground and Draw; run by `npm run build` |
| `tests/paint.test.mjs` | Cards (paint, turn, copy, shift), forgetting, budgets, stacks, Can't on two rows and its refusal, the picker, the goal row, copies, paint and shift, wide cards, hints, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-paint.mjs`, then run `node scripts/build-paint.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read a card's mini row as "this tile, this colour", and the copy and shift faces, without help; whether the stacks with ×2 and ×4 make the joining of every start visible, or children lose track of which stack came from where; and whether Can't is used to name two rows that stay apart, rather than pressed as a guess.
- **A demo.** The plan gives each family a few-second demo of its move; a demo here would play one paint card and one turn card on two rows, then a copy on every start.
- **Story.** Paint rows is not on the Lantern Road and has no keeper lines.
- **Random draws as puzzles.** The worksheet's random-draw problems live only in the playground's Draw. A puzzle could ask a child to stop drawing as soon as every start is certain to match, which is the coupling time.
