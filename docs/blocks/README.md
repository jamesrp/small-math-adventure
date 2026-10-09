# Rhombus gardens: duel, fewest blocks and red trapezoids

October 9, 2026. Twenty-six puzzles in three new groups of Rhombus gardens, built from the Week 1 encore of the Bellingham math circle (Pattern blocks II). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app, and the encore worksheets have not been taught.

## The mathematics

Boards are cut from the grid of triangles that pattern blocks fit. A green **triangle** covers one, a blue **rhombus** two, a red **trapezoid** three in a row and a yellow **hexagon** the six round a grid point.

- **The rhombus duel.** Two players take turns laying a rhombus; a player with no room on their turn loses. Every board is finite and has no draws, so one player can always win.
- **Copying wins on a board with a half turn.** A half turn of the grid turns up triangles into down ones, so its centre is never the middle of a triangle: it is a grid point or the middle of an edge.
  - At a grid point, no rhombus meets its own copy (a rhombus holding a triangle and its copy would have the centre in the middle of its edge). The second player answers each rhombus with its copy, which is always free, so the first player runs out first.
  - At the middle of an edge, the one rhombus across that edge is its own copy. The first player lays it and then copies.
  - A parallelogram has a grid point in the middle when both sides are even, and the middle of an edge otherwise. The hexagon with sides a, b, c has a grid point in the middle when a, b and c are all even or all odd.
- **Copying is one way to win, not the only one.** On the 3-by-3 board 7 of 21 first rhombi win, and on the 5-by-2 board 5 of 23; the middle one comes with a rule for the rest of the game. A triangle has no half turn, so the triangle of four is decided by search alone: the second player wins, and all 18 first rhombi lose.
- **Fewest blocks: the most hexagons is a trap.** A block other than a hexagon covers at most three triangles, so a board of N triangles with h hexagons needs at least h + ⌈(N − 6h)/3⌉ blocks. That bound falls as h grows, which makes "most hexagons first" look right. It fails: four hexagons fit the triangle of six but leave pieces that need ten blocks, where three hexagons give nine; seven hexagons fit the hexagon of side 3 and give 13 or 19, where six give the fewest, 12. Here the bound, with the few largest hexagon packings checked one by one, proves every fewest but the star's, where no block reaches two of the six points. In general there is no short certificate that fewer is impossible.
- **Trapezoids cover multiples of three.** A board whose triangle count is not a multiple of three has no trapezoid filling, whatever its shape (the hexagon 2, 1, 2 has 16).
- **The two kinds are fixed by the board.** A trapezoid has two triangles of one kind and one of the other: it points up when two point up. With U up and D down triangles on the board, every filling has (pointing up) − (pointing down) = U − D and (pointing up) + (pointing down) = (U + D)/3. On the triangle of six, U = 21 and D = 15, so all 220 fillings have nine pointing up and three pointing down. Rhombi, which take one of each kind, cannot fill a board with U ≠ D at all; trapezoids can (the ramp: nine up, six down).
- **Red fillings of the hexagon of side 2.** The six triangles round the middle point are always two trapezoids making a hexagon, cut one of three ways, and the ring outside can be filled three ways (two pinwheels and a frame): nine fillings, three up to turning.
- **An odd way home.** A move picks up two trapezoids that make a hexagon and lays them back cut the next way round. Three moves bring the hexagon home: an odd round trip. Rhombus flips can never do this, because each adds or takes away one cube, so a way back is even (Rhombus gardens' flip puzzles, and Proofs 8–11).

Experiments come first: children play the duel both ways and lose some, lay blocks against a budget, and fill boards with reds. Conjectures come from what happens: the winner put a rhombus opposite each of mine; the hexagon always helps (it doesn't); the count pointing down never changes. Explanations stay with grown-ups: why the copy is always free, why a fewest is the fewest, and why ups and downs fix the kinds. They are in each puzzle's notes, and the puzzles never show a winning side or a fewest count before it is asked for.

## Where they appear

**Puzzles → Rhombus gardens** gains three groups through the family seam ([Adding a family](../ADDING-A-FAMILY.md)): **Rhombus duel**, **Fewest blocks** and **Red trapezoids**. Each puzzle carries `libraryFamily: 'rhombus'` and its group, and each group has its own mechanic. The puzzles are grade-free (`band: "all"`), with Easy, Medium and Hard. The duel needs no reading or counting once the move is shown; fewest blocks needs counting to the budget, at most twelve; red puzzles 3, 7 and 8 need counting triangles and telling up from down.

| Group | # | Puzzle | Board | The answer | Encore source |
|---|---|---|---|---|---|
| Duel | 1 | Small hexagon | Hexagon 1, 1, 1 | Second wins by copying | K–1 P2; 2–3 P1 |
| | 2 | The strip | 3 by 1 | First wins: 1 of 5 first rhombi | K–1 P2 |
| | 3 | The square | 2 by 2 | Second wins by copying | K–1 P2; 2–3 P1 |
| | 4 | Long hexagon | Hexagon 2, 1, 1 | First wins: 1 of 11 | 2–3 P1 |
| | 5 | Three by two | 3 by 2 | First wins: 1 of 13 | K–1 P4; 2–3 P1 |
| | 6 | Four by two | 4 by 2 | Second wins by copying | K–1 P4; 2–3 P2 |
| | 7 | Big hexagon | Hexagon 2, 2, 2 | Second wins by copying; more than 160,000 positions | 2–3 P5 |
| | 8 | Three by three | 3 by 3 | First wins: 7 of 21 | 2–3 P5 |
| | 9 | Triangle of four | Triangle, side 4 | Second wins; no half turn | 2–3 P2 |
| | 10 | Hexagon 1, 2, 3 | Hexagon 1, 2, 3 | First wins: 1 of 27 | 4–5 P9 |
| | 11 | Five by two | 5 by 2 | First wins: 5 of 23 | 4–5 P9 |
| Fewest | 1 | The mountain | Triangle, side 3 | 3 (the hexagon gives 4) | K–1 P3 |
| | 2 | The star | Six-point star | 6, in 65 ways (the hexagon gives 7) | K–1 P3 |
| | 3 | The boat | Boat | 5, one way: one of three hexagon places | K–1 P6 |
| | 4 | Triangle of four | Triangle, side 4 | 5, in 3 ways; one hexagon fits | 2–3 P3 |
| | 5 | Hexagon of two | Hexagon 2, 2, 2 | 6 with three hexagons; the middle one gives 7 | K–1 P6; 2–3 P3 |
| | 6 | Triangle of six | Triangle, side 6 | 9 with three hexagons; four give 10 | New, after 2–3 P3 and P6 |
| | 7 | Hexagon of three | Hexagon 3, 3, 3 | 12 with six hexagons; seven give 13 | 2–3 P6; 4–5 P10 |
| Red | 1 | Red arrow | Arrow | Fill: 3 ways | K–1 P5 |
| | 2 | Red ramp | Ramp | Fill: 5 ways, 4 up and 1 down | K–1 P5 |
| | 3 | Red hexagon | Hexagon 2, 1, 2 | Can't: 16 triangles | K–1 P5 |
| | 4 | Two ways | Triangle, side 3 | Every way: 2 | 2–3 P4 |
| | 5 | Nine ways | Hexagon 2, 2, 2 | Every way: 9 = 3 × 3 | 2–3 P4; 4–5 P7 |
| | 6 | Odd way home | Hexagon 2, 2, 2 | 3 re-cuts of the middle | 4–5 P8 |
| | 7 | Three pointing down | Triangle, side 6 | Any of 220 fillings | 2–3 P7 |
| | 8 | Four pointing down | Triangle, side 6 | Can't: always 3 | 2–3 P7, as the card poses it |

The worksheets are in [math-circle-worksheets, the Week 1 encore](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/source/week-01-encore). Each puzzle's `provenance` names its problem. The boards are the packets' own, except the triangle of six for Fewest 6, which is new.

The [Week 1 encore review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-01e.md) (keep, fit B) set the app fit, and its [math check](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-01e-math.md) gave the answers this pack checks again.

- **The duel.** The child picks Me first or You first and wins against perfect play. Boards mix grid-point centres, edge-middle centres and a triangle, and the puzzle never asks only "who wins?".
- **Fewest blocks.** A four-block palette and a budget, on boards with a hexagon trap, chosen so the bound with the hexagons that fit proves the fewest.
- **Red trapezoids.** Every filling of the hexagon of side 2 with That's all and no slot count; a re-cut move with a return in three; and the kind count posed as a decision, "fill triangle 6 with 4 pointing down", refuted by counting.

The card's other items are not here (see Not yet done). Rhombus gardens already had the encore's cube piles and odd-return question for rhombi.

## How a puzzle plays

- **Laying a piece.** Drag across a piece's triangles, or tap them one after the other, as in the rest of Rhombus gardens. A tapped triangle shows a mark and the triangles that can join it glow. Tap a piece to lift it.
- **The duel.** **Me first** or **You first** chooses who starts. The app answers at once; its rhombi are light, and its last one has an ochre edge. A line above the board says whose turn it is and who won. After a loss, **Play again** starts over. Undo takes back the child's last rhombus and the app's answer. The app plays every board perfectly: it copies the child's last rhombus when the copy wins, else lays a winning rhombus, else any free one.
- **Fewest blocks.** Four tools (triangle, rhombus, trapezoid, hexagon) show how many of each are down, and a counter shows blocks used against the budget. A slide places the chosen block, or another block whose triangles the slide covers exactly, and the tool follows. With the hexagon chosen, yellow dots mark where one fits; tap one to place it. **Clear** lifts every block. Solved when the board is full within the budget.
- **Red fill.** Counts above the board show how many trapezoids point up and down. **Can't** solves when no filling exists; otherwise it says "It can be done." and waits for a change. Puzzles 7 and 8 ask for a number pointing down and solve the same way.
- **Every way.** Each filling joins a shelf below the board, once. **That's all** checks the shelf: with one missing it says "There's another." and waits for a change. Undo keeps the fillings found; Restart clears them.
- **Odd way home.** The start is a small card marked ⚑, beside a count of moves. Tap a trapezoid, then another that makes a hexagon with it: the hexagon is cut the next way round. Two that don't make a hexagon give "Those two don't make a hexagon." **Start again** returns to ⚑. Solved when the board is back at ⚑ after an odd number of moves.
- **Hints.** In the duel a hint chooses the winning side, then glows the copy when it wins, else a winning rhombus; from a lost position it says so and suggests Undo. In fewest blocks it places the next block of a fewest filling that keeps the child's blocks, choosing the tool, else lifts the latest block a fewest filling can do without. Red hints build toward a filling (lifting a stray piece first), press Can't with a counting question when the task is impossible, build the next missing filling and then press That's all, or glow the pair to re-cut on the shortest odd way home. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: pieces must be real placements of an allowed block on free triangles; the duel accepts a rhombus only on the child's turn; a re-cut needs two trapezoids that make a hexagon; That's all and Can't each answer once until the board changes; nothing moves after a solve.
- Saved boards are checked. Pieces are placements that don't overlap. A duel is saved only at the child's turn or at the end, every rhombus was free when laid, and the app never passed up a win. A shelf holds real fillings, once each, including the board on show if it is full. Can't and That's all agree with the puzzle. A route home starts at ⚑, each step is one re-cut, and it stops at 99 moves.
- `scripts/build-blocks.mjs` computes every claim as it writes the pack: duel winners, centres and winning first moves by exact search (boards up to 30 triangles); fewest counts, their fillings and the hexagon traps; filling counts, kinds and the shortest odd way home. `scripts/validate-blocks.mjs` checks them again by separate methods. Triangles come from a point-in-polygon test, and pieces from turning the block's triangle centres. Duels are decided by its own win-or-lose search, and centres from the board's centre of mass. Fewest counts come from a memoised search, and on the hexagon of three from the seven-hexagon argument above. Red fillings are listed afresh, and two trapezoids make a hexagon when their six triangle centres are equally far from their middle. It plays 25 random games against the app on every duel board, every hint chain from fresh and from trap boards, Can't, That's all with Undo, the way home, illegal moves and forged saves.

## Files

| File | Contents |
|---|---|
| `dist/families/blocks/blocks.js` | The `blueduel`, `blockfill` and `redfill` mechanics: moves, solves, hints, rendering and wiring |
| `dist/families/blocks/blockmath.js` | The mathematics: block shapes, the duel search and half turns, fewest fillings, kinds, re-cuts |
| `dist/families/blocks/blocks.css` | Pattern-block colours, the app's rhombi, tools and counter, kinds, the shelf and the start card; imports the shared grid styles |
| `dist/families/blocks/blocks.json` | The pack: 26 puzzles, 1 family record and 3 sources, merged at load through `dist/families.js` |
| `dist/families/rhombus/lozenge.js` | Exact covers, piece keys and the ring round a point, shared with the rest of Rhombus gardens |
| `dist/tri-grid.js` | Boards, placements, drawing and taps ([tri-grid.md](../tri-grid.md)) |
| `scripts/build-blocks.mjs` | Authoring list, boards and copy; checks every stated claim and writes `blocks.json` |
| `scripts/validate-blocks.mjs` | The independent checks above; run by `npm run build` |
| `scripts/blocks-browser-smoke.mjs` | Duels won and lost, tools, hexagon dots, Clear, Can't, That's all and re-cuts in a real browser (`TEST_PHONE=1` for touch) |
| `tests/blocks.test.mjs` | Shapes, the duel and its saves, fewest search and hints, kinds, re-cuts, every mode and rendering |

To change a puzzle, edit `scripts/build-blocks.mjs`, then run `node scripts/build-blocks.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, in the app or on paper. Three things to watch:
  - Whether a child who loses the duel starts to copy, or keeps playing at random. The app copies whenever copying wins, so the move is there to be seen.
  - Whether the budget counter and four tools read at once on a phone, and whether children find the hexagon dots.
  - Whether a re-cut, two taps on trapezoids, reads as one hexagon turning, or needs to be shown.
- **The hexagon of three duel.** It has 54 triangles, beyond the exact search (30). The card's plan, an app that copies on that board, is not built.
- **K–1 Problem 1** (fill each block's outline with smaller pieces of its own colour, or mark X) and **grades 4–5 Problem 6** (count the light rhombi of the hexagon 1, 3, 3 as shaded cubes) are not puzzles here.
- **Story and grade trails.** Not on the Lantern Road, no keeper or companion lines, and not in a K–1, 2–3 or 4–5 trail.
