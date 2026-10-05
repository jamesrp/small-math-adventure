# Bracing frames

October 5, 2026. Ten puzzles and a playground built from Week 52 of the Bellingham math circle (hinged frames and braces). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. The Week 52 worksheets have not been piloted either; their [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-52.md) asks for worksheet fixes that don't affect these puzzles. The frames and starting braces are new except where a puzzle's `provenance` says otherwise.

## The mathematics

A **frame** is a grid of square cells built from bars of one length joined by pins that turn, so each cell can lean into a diamond. A **brace** is a rigid bar across one cell's diagonal; it keeps that cell square. The frame **holds** when no motion changes its shape; sliding or turning the whole frame doesn't count.

- **Rows and columns.** Every cell stays a rhombus, so its opposite bars stay parallel. All the horizontal bars in one column therefore turn together (an angle for each column), and all the upright bars in one row turn together (an angle for each row). Any choice of these angles is a position of the frame, and a brace in row i, column j says exactly that row i's angle stays at a right angle to column j's.
- **Bolker and Crapo's theorem.** Draw a dot for each row and each column and a link for each brace, from its row to its column. The frame holds exactly when this row-column graph is connected. If it is connected, one angle decides all the others, so only turning the whole frame is left. If it falls into pieces, turning every row and column of one piece by the same amount keeps every brace square, and the frame moves. Push shows exactly this motion: each piece turns as a unit.
- **Fewest braces.** A frame of r rows and c columns has r + c dots, so it needs at least r + c − 1 braces, and those that work form a spanning tree: joined, with no loop. Without windows there are r^(c−1) · c^(r−1) such designs (the spanning trees of the complete bipartite graph K_{r,c}): 1 for 1 by 3, 4 for 2 by 2, 12 for 2 by 3, 81 for 3 by 3.
- **Spare braces.** A brace can come out of a frame that holds, and leave it holding, exactly when its link lies on a loop of the graph; the two dots stay joined the other way round. A frame holds with the fewest braces exactly when it holds and no brace is spare.
- **Covering is not holding.** A brace in every row and every column doesn't make the frame hold: the links can form two pieces, each with its own rows and columns. The most braces that leave an r-by-c frame moving with every row and column braced is (r − 1)(c − 1) + 1, from a full block and one lone corner: 5 on 3 by 3 (9 designs) and 10 on 4 by 4 (16 designs).
- **Windows** are cells with no brace, which take their links out of the graph. Some braces become forced (a column whose only open cell is at the bottom), and the designs are the spanning trees of what is left.
- **Limits.** This is a flat frame, with braces only on cell diagonals. A second brace in the same cell adds nothing (it is the same link), so the app allows one brace per cell. The theorem says nothing about frames with cells of different shapes, bars of different lengths, or braces that span several cells.

Experiments come first: a child braces cells and pushes the frame to see what still moves. The conjectures (a row of cells needs a brace in every cell; three braces hold a 2-by-2 frame; the fewest is always rows + columns − 1; a brace in every row and column isn't enough) come from that play. The explanations, such as why a piece of the graph turns together, why a spanning tree is enough, and why a loop means a brace to spare, are grown-up conversations in each puzzle's notes. The row-column graph appears beside the frame from puzzle 4 on. Its links and pieces show only after a push, so it explains what the push did rather than predicting it, as the Week 52 card asks (a live link view or piece count would give the theorem away); the child never has to draw it. The worksheet's written proofs stay on paper.

## Where they appear

**Puzzles → Bracing frames** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The row-column graph uses the shared graph board ([graph-board.md](../graph-board.md)). The puzzles are grade-free (`band: "all"`) with Easy (1–3), Medium (4–6) and Hard (7–10), plus a playground.

| # | Puzzle | Kind | Frame | Answer | Week 52 source |
|---|---|---|---|---|---|
| 1 | Three in a row | Fewest | 1 by 3 | 3 braces, 1 design | New, before Problem 2 |
| 2 | Two by two | Fewest | 2 by 2 | 3 braces, 4 designs | Problems 4 and 5 |
| 3 | One more | Add one brace to 3 | 2 by 3 | Either cell of column 3 | Problem 11 |
| 4 | Two by three | Fewest, with the graph | 2 by 3 | 4 braces, 12 designs | Problems 6 and 7 |
| 5 | Take some out | Fewest, starting full | 3 by 3 | 5 braces, 81 designs | Problems 9 and 10 |
| 6 | Every row, every column | Add one brace to 5 | 3 by 3 | 4 cells work | Problems 8 and 11 |
| 7 | Still wobbly | 5 braces, every row and column, still moving | 3 by 3 | 9 designs | Problem 13, as a construction |
| 8 | Windows | Fewest | 3 by 4, 4 windows | 6 braces, 12 designs | New, extending Problem 12 |
| 9 | Ten and still wobbly | 10 braces, every row and column, still moving | 4 by 4 | 16 designs | Problem 14, as the largest case |
| 10 | Building front | Fewest | 4 by 5, 9 windows | 8 braces, 32 designs | Problem 12, with windows |

The worksheets are in [math-circle-worksheets, week 52](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-52). Each puzzle's `provenance` names its problem.

## How a puzzle plays

- **Bracing.** Tap a cell to brace it and tap it again to take the brace out. One brace per cell. Windows are pale blue and take no brace.
- **Push.** **Push** moves the frame as far as it can really move: each piece of the row-column graph turns as a unit, the bars keep their length and braced cells stay square. A frame that holds gives a short shake and stays put. With reduced motion, the frame shows one leaning pose instead of the swing. A screen reader hears "It moves." or "It holds." Pushing never changes the board.
- **Fewest.** **Fewest** claims that the frame holds with as few braces as it can. If it still moves, "It still moves." appears and the push plays at once. If it holds with a brace to spare, "It holds, but this brace can go." appears and that brace is marked with a red dash. Otherwise the puzzle is solved. The answer is always a counterexample, never the target number, and the claim waits until a brace changes.
- **One more** (puzzles 3 and 6). The starting braces are fixed and can't be tapped; one brace may be added, and moved by taking it out again. Solved as soon as the frame holds.
- **Still wobbly** (puzzles 7 and 9). Beads count the braces up to the limit. Solved as soon as the limit is reached with a brace in every row and column and the frame still moves.
- **The graph.** From puzzle 4, rows (R1, R2, …) and columns (C1, C2, …) are labelled on the frame and drawn as dots beside it, rows on the left and columns on the right. A push draws a link for each brace. While the dots fall into pieces, each piece of more than one dot gets its own colour, and its braces in the frame share it, so the colours turn together; when every dot is joined, the dots and links all light. Changing a brace clears the links until the next push.
- **The playground** is a 3-by-4 frame with the graph: brace anything and push.
- **Hints** work from the child's own braces: take out a spare brace, then brace a cell that joins two pieces, then press Fewest. In one-more puzzles they take out an added brace that doesn't help first. In still-wobbly puzzles they move toward the nearest design one brace at a time. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: no brace in a window or a second brace in a cell; the starting braces of a one-more puzzle stay, with at most one added; no more braces than the beads allow; no Fewest with no braces or on a frame just answered; nothing after a solve.
- Saved boards are checked: braces are distinct open cells in order; a solved claim holds with the fewest braces; a stored answer to a wrong claim is the one the app would give.
- Every count in the notes is computed by `scripts/build-braces.mjs` with the row-column graph, and checked again by `scripts/validate-braces.mjs` against the rank of the frame's rigidity matrix in exact arithmetic, on every design of every frame up to 3 by 3 and on every puzzle's answers.

## Files

| File | Contents |
|---|---|
| `dist/families/braces/braces.js` | Pieces of the row-column graph, holding, spare braces, the fewest designs and the loose designs, the push's geometry, and the `braces` mechanic (moves, hints, rendering, the push animation, wiring) |
| `dist/families/braces/braces.css` | Bars, pins, braces and their piece colours, windows, the shake, beads, buttons and the graph's tints; imports the shared graph board styles |
| `dist/families/braces/braces.json` | The pack: a playground, 10 puzzles, 1 family and 3 sources, merged at load through `dist/families.js` |
| `scripts/build-braces.mjs` | Authoring list and frames; checks every count and every cell that works, and writes `braces.json` |
| `scripts/validate-braces.mjs` | Bolker and Crapo's theorem against exact rigidity-matrix rank on every design of frames up to 3 by 3; fewer than the fewest never holds; the design counts against Kirchhoff's matrix-tree theorem; loose designs by a separate search; a fewest design claimed through moves; wrong claims and their answers; hint chains; illegal moves and forged saves; run by `npm run build` |
| `tests/braces.test.mjs` | Pieces, holding and spare braces, the push's geometry, claims and answers, one more, still wobbly, windows, hints, saves and rendering |

To change a puzzle, edit `scripts/build-braces.mjs`, then run `node scripts/build-braces.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether pushing a frame and watching it move is enough for a child to see which part still leans, or whether they need the hinged frames from the circle in their hands first; whether the coloured pieces that appear beside the frame after a push help from puzzle 4 on, or are ignored; and whether "Fewest" reads as a claim to be tested or as a button to press after every brace.
- **Real frames.** The worksheet builds frames from straws or strips; the app is a picture of one. A child who has built one may read Push very differently from one who hasn't.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** The worksheet's proofs (why rows + columns − 1 braces are needed, and why six braces must hold a 3-by-3 frame) stay on paper.
