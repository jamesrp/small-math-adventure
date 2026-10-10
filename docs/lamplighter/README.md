# Lamplighter

October 10, 2026. Twelve puzzles built from Week 66 of the Bellingham math circle (Lamplighter streets), as a **Lamplighter** group in Lantern Wires. They are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 66 worksheet is an unpiloted prototype whose counters and partner roles have not been rehearsed either. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-66.md) says keep, App fit A, size S: tap a neighbouring lantern to walk, tap the lantern underfoot to flip it, with the true fewest moves as the target, instances where the order matters, and the dead ends at 7 and 11.

## The mathematics

A **lamplighter** stands at one lantern of a street, a ring or a grid. One **move** walks to a neighbouring lantern, or lights or puts out the lantern underfoot (a **flip**). A **state** is where the lamplighter stands and which lanterns are lit. In the pack a move word is a string of letters: `L` and `R` walk left and right (on the ring, anticlockwise and clockwise), `U` and `D` walk up and down on a grid, and `F` flips.

- **Flips plus the walk.** To turn lit set S into T and walk from p to q, every lantern in the difference D = S △ T needs an odd number of flips, so at least one, and the lamplighter must stand at each of them. Extra flips never shorten the walk, and a shortest walk that visits D can flip each lantern of D once as it passes. So the **fewest moves = |D| + the shortest walk from p that visits every lantern of D and ends at q.**
- **On a street** (the integer line), with a = min D and b = max D, that walk is min(|p − a| + (b − a) + |b − q|, |p − b| + (b − a) + |a − q|), or |p − q| when D is empty: the only choice is which end to visit first, and the end you finish near should come last (puzzles 2, 4, 5 and 7). From the dark street with the lamplighter home at 0 this is the Week 66 guide's formula.
- **On a ring** of n lanterns the walk may go either way round. A walk that visits D either goes round, leaving out at most one stretch between consecutive stops, or turns back; going once round can beat going out and back (puzzles 9 and 10).
- **On a grid** the walk is a shortest tour through D with distances counted along the streets (Manhattan distance): a small travelling-salesman path with no simple formula in general (puzzles 11 and 12).
- **Dead ends.** Every move changes the fewest moves back to the dark street by exactly one, since each move changes the parity of (position + number lit). A state is a **dead end** when every move from it is one closer to dark. Home at 0 with lanterns −1, 0 and 1 lit takes 7 moves, and walking left, walking right or putting out lantern 0 each gives a state that takes 6 (puzzle 6, Week 66 Problems 3 to 5). On the street, a state is a dead end exactly when the lamplighter is home, lantern 0 is lit and lit lanterns lie on both sides. Why: lighting a dark lantern adds a flip without shortening the walk, so lantern 0 must be lit; and between the two end lanterns ℓ ≤ 0 ≤ r the walk is 2(r − ℓ) − |p|, which both steps shorten only when p = 0 and both neighbours lie in [ℓ, r]. Puzzle 5's state (home, −2, 0 and 2 lit, 11 moves; every neighbour 10) is one too, as the review card notes.

This is the word length of the lamplighter group Z₂ ≀ Z with the generators "step" and "flip" (Z₂ ≀ Z₈ on the ring, Z₂ ≀ Z² on the grid; the grids here are finite boards, not the whole group). Druţu and Kapovich, *Geometric Group Theory*, Exercise 7.82, gives the wreath-product length; Cleary and Taback, "Dead end words in lamplighter groups and other wreath products" (Quarterly Journal of Mathematics, 2005), §3.1 and §4.1, give the word length and the dead ends. The puzzles show only the finite statements above.

Lantern Wires' own puzzles flip the two lanterns at the ends of a wire: linear algebra over two colours, where order never matters. Here the lanterns are the same objects, but a flip happens only where the lamplighter stands, so the walking is the cost and the order is everything.

`scripts/validate-lamplighter.mjs` checks every claim above with its own simulator: the street formula and the dead-end rule for every state with lanterns and lamplighter in −3 … 3 (7 × 128 states, searched on a street of −6 … 6 so that no move meets an end; 49 dead ends), and flips plus walk between every pair of states on a street of 5, a ring of 6 and a 2 × 3 grid.

## Where they appear

**Puzzles → Lantern Wires → Lamplighter** is a group inside Lantern Wires on the family seam ([Adding a family](../ADDING-A-FAMILY.md)): `libraryFamily: "toggle"`, `group: "Lamplighter"`, mechanic `lamplighter`. It sits below Lantern Wires' Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). There is no playground (a group has none).

Positions on the street are −4 … 4 with home at 0; ring lanterns are 0 … 7 clockwise from the top; grid cells are (row, column) from the top left, counted from 0.

| # | Level | Board | Start (lamplighter; lit) | Goal (lamplighter; lit) | Moves | A shortest word | Insight | Week 66 source |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | Street | 0; none | 1; {1} | 2 | RF | Walk, then flip: two kinds of move | P1 A |
| 2 | Easy | Street | 0; none | 1; {−1, 1} | 5 | LFRRF | The far side first: 3 walks | P1 B |
| 3 | Easy | Street | 0; none | 0; {0, 2} | 6 | RRFLLF or FRRFLL | Out and back: 4 walks | P1 C |
| 4 | Medium | Street | 0; none | 2; {−2, 0, 2} | 9 | LLFRRFRRF | Finish at the end you visit last | P2 C |
| 5 | Medium | Street | 0; none | 0; {−2, 0, 2} | 11 | LLFRRRRFLLF | Ending at home costs 2 more; a dead end | P2 B |
| 6 | Medium | Street | 0; none | 0; {−1, 0, 1} | 7 | LFRRFLF | The dead end: every move is closer to dark | P3 (P4, P5 in the notes) |
| 7 | Medium | Street | 0; none | −1; {−3, 1, 2} | 12 | RRFLFLLLLFRR | Right side first saves 2 (left first: 14) | New, after P2 |
| 8 | Hard | Street | 1; {−3, −1, 2} | −2; {−1, 0, 3} | 13 | RRFLFLLFLLLFR | Flip only the 4 that differ, then the order | New, after the guide's rule |
| 9 | Hard | Ring of 8 | 0; none | 2; {1, 4, 5, 7} | 12 | LFLLFLFLLLFR | Round the long way beats turning back | New |
| 10 | Hard | Ring of 8 | 0; none | 0; {1, 3, 6} | 11 | LLFLLLFLLFL | Once round (8 walks) beats out and back (10) | New |
| 11 | Hard | Grid 3 × 3 | (1,1); none | (1,1); the four corners | 14 | ULFRRFDDFLLFUR | A tour round the corners | New |
| 12 | Hard | Grid 3 × 4 | (1,0); none | (1,3); {(0,1), (2,1), (0,3), (2,3)} | 13 | DRFUUFRRFDDFU | Sweep the near column, then the finish's | New |

Each puzzle's `provenance` names its Week 66 problem, or says New and what it contrasts with. The worksheets are in [math-circle-worksheets, week 66](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-66): one shared Grades 3–5 packet with lamps, a walker and a −4 … 4 street. Puzzles 1 to 6 are its targets (Problems 1 to 3); Problems 4 and 5 (one move from the dead end, and whether a move can always make a target harder) are in puzzle 6's grown-up notes, since the app's solve is reaching a state, not judging one. Puzzles 7 to 12 are new: a choice of order with the finish between the ends, a start that is not dark, the ring and the grid.

Every budget is the true fewest moves, computed by breadth-first search in `scripts/build-lamplighter.mjs` and checked again by the validator by formula and by trying every order of the lanterns that differ. Puzzles 5, 6 and 11 have 6, 6 and 32 shortest words; puzzles 1 and 2 have one; the others two or four.

## How a puzzle plays

- **The board.** Lanterns in the Lantern Wires look (sun with short rays when lit, dotted when dark) stand on street lines: a row for the street, with Georgia numerals −4 … 4 under it and a small house round 0; a circle for the ring; a lattice for the grid. The lamplighter, a small pine figure holding a pole up to its lantern, stands just below it, and a pine ring marks that lantern. Faint rings mark the lanterns it can walk to.
- **The goal card** above the board (beside it on a wide screen for the ring and grid) is a smaller copy in the yellow goal-card style, with the goal's lit lanterns and a dashed ghost lamplighter at the finish. On the street it has the board's width, so each goal lantern sits straight above its lantern on the board. Puzzle 8's board starts with lanterns lit.
- **Moves.** Tap a lantern next to the lamplighter to walk there (it glides across); tap the lantern it stands at to light or put it out. A tap on any other lantern does nothing. Keyboard: the arrow keys walk (on the ring, left is anticlockwise and right clockwise; up and down only on the grid), and Enter or Space taps the lantern in focus, so Enter on the lantern underfoot flips it; focus follows the lamplighter.
- **Budget.** An outline under the board stands for each move allowed; each move fills one with an arrow (a turn arrow on the ring) or a small lantern, lit or put out. The budget is always the fewest moves, so a wasted move means Undo: the feedback line under Undo, Restart and Hint then says "Too few moves are left. Undo." (the shared convention: Lantern Wires and Paint rows do the same). When the outlines are full, every lantern greys.
- **Solved** when the lit lanterns and the lamplighter's place both match the goal card. Any shortest word counts, not only the witness. There is no objective line on the board (`visibleObjective: ''`); How to play gives the objective, the controls and the rules.
- **Hints.** Before any move, the first hint is the authored nudge ("Which lantern should you visit first?", "Compare with the last puzzle: only the finishing spot changed.", "Which lanterns already look right?"). Then hints name the next move of a shortest finish within the moves left, lighting or putting out the lantern underfoot first when that is on a shortest route ("Walk left.", "Light this lantern.", "Walk anticlockwise.", "Walk up."), with an ochre ring round the lantern to tap; after a wasted move they say Undo. The third level offers Apply hint, and hints alone finish every puzzle.
- **Screen readers.** Each lantern is a button named for what a tap does ("Walk to lantern −1, lit", "Light lantern 0", "Put out lantern in row 1, column 2"); the others are named and disabled ("Lantern 3, lit"). The goal card reads "Goal: lanterns −1 and 1 lit; the lamplighter at 1.", a polite status line reads the board and the moves left, and each recorded move has its words.

## Rules that keep the record honest

- Only legal moves are accepted: a tap on the lantern underfoot or on a neighbour (round the end of the ring, never round the end of a street or off a grid), nothing past the budget and nothing after a solve.
- The save is the move word, `{word: "LFRRF"}`, and everything shown is replayed from it. A save is rejected if it has another key, a letter the board doesn't use, a walk off the board, more letters than the budget, or letters after the goal is reached.

## Files

| File | Contents |
|---|---|
| `dist/families/lamplighter/lamplighter.js` | Boards (street, ring, grid), walks and flips, the breadth-first search from the goal, the `lamplighter` mechanic (moves, hints, rendering, keyboard) and the module entry |
| `dist/families/lamplighter/lamplighter.css` | Styles, using the shared board palette and the Lantern Wires lanterns from `boards.css` |
| `dist/families/lamplighter/lamplighter.json` | The pack: 12 puzzles, 1 family record and 3 sources |
| `scripts/build-lamplighter.mjs` | Authoring list; computes each budget by search, replays each witness and writes the pack |
| `scripts/validate-lamplighter.mjs` | A separate simulator; every budget by flips plus every order of the walk, by the street formula and by a separate search; the theorems over every small case; hints alone from fresh, after a wasted move and from a spent budget; illegal taps; forged saves; run by `npm run build` |
| `scripts/lamplighter-browser-smoke.mjs` | Taps, a refused far tap, a wasted move and Undo, the keyboard on the street, ring and grid with focus following the lamplighter, a spent budget, a ringed hint, hints to a solve; `TEST_PHONE=1` for a phone |
| `tests/lamplighter.test.mjs` | Walks and flips, fewest moves, dead ends, taps and refusals, any shortest word, budgets, hints, rendering and screen-reader words, saves through storage, the satchel |

To change a puzzle, edit `scripts/build-lamplighter.mjs`, then run `node scripts/build-lamplighter.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether the line "Too few moves are left. Undo." right after a wasted step turns the order puzzles (2, 4, 7, 8) into trying each first step, rather than planning which end comes first; whether children see the faint rings and tap a neighbour to walk, or tap the far lantern they want lit and wonder why nothing happens; and whether the ghost lamplighter on the goal card is noticed, so that puzzles 4 and 5, with the same lanterns, read as different.
- **Build a dead end.** The review card suggests a puzzle where the child lights lanterns and parks the lamplighter so that every move makes the street quicker to reach from dark, at 9 moves or more. That needs a different solve (a claim checked against all three moves) and is not here; puzzles 5 and 6 reach dead ends and the notes say so.
- **A demo.** The plan gives each family a few-second demo of its move; a demo here would walk two lanterns and light one.
- **Story.** Lamplighter is not on the Lantern Road and has no keeper lines; the review card names Mr. Hops, the road's frog lamplighter, as the natural keeper once children have played it.
