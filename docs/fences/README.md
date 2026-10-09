# Garden fences

October 5, 2026. Twelve puzzles and a playground built from Week 26 of the Bellingham math circle (same area, different boundaries). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. The Week 26 worksheets have not been piloted either. Their [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-26.md) says revise: the adult guide accepts only one answer to the grades 4–5 question "Can it have a hole?", which depends on whether two tiles touching at a corner close a hole. Puzzle 8 takes the corner-closed reading, with the fence drawn to show it; the card's other fixes don't affect these puzzles. The gardens are new except where a puzzle's `provenance` says otherwise.

## The mathematics

A **garden** is a set of square tiles on a plot, joined in one piece by whole shared sides; touching at a corner is not a join. Its **fence** is every tile side with no tile beside it, so a garden with a hole, or a pond shut inside it, has fence round the hole too. A garden turned or flipped is the same garden.

- **Counting sides.** n tiles bring 4n sides, and each pair of tiles that share a side hides two of them, so a garden with s shared sides has a fence of 4n − 2s. The fence is always even. A new tile changes it by 4 − 2k, where k is the number of tiles it touches: +2, 0, −2 or −4.
- **The longest fence.** A joined garden of n tiles has at least n − 1 shared sides, so its fence is at most 2n + 2. It is exactly 2n + 2 when the tiles close no loop (the tiles and their shared sides form a tree). The smallest loop is a full 2-by-2 square, so a longest garden has none, but having none is not enough: a ring of eight round one square is a loop too. Tiles touching at a corner close no loop, so a tree can still shut a pond in where two tiles meet at a point; then the garden has a hole and the longest fence (puzzle 8: 18, where the full ring has 16).
- **The longest fence on a small plot.** A plot can be too small for a tree. Every 2-by-2 square of a 4-by-4 plot needs an empty square for the tiles to close no loop, and the four corner 2-by-2 squares don't overlap, so thirteen tiles (three empty squares) must close a loop and have a fence of at most 26, the same as twelve.
- **The shortest fence.** A garden that reaches over r rows and c columns has at least two fence sides on each row (its two ends) and two on each column, so its fence is at least 2(r + c), and it holds at most rc tiles. The fence equals 2(r + c) exactly when every row and every column of the garden is one unbroken run; each gap adds two more (puzzle 5, where twelve tiles must reach all 4 rows and 5 columns, so 18 is the least). The shortest fence for n tiles is therefore the least 2(r + c) with rc ≥ n, which is 2⌈2√n⌉ (Harary and Harborth, 1976): 12 for 7 tiles, where puzzle 9's four gardens are exactly the ones with no gap, and 14 for 12 tiles.
- **A limit on moves.** In puzzle 10 the garden starts planted and only two tiles may move. The single move that shortens the fence most (20 to 16) is a trap: no second move then reaches 14, the 3-by-4 block that two other moves make. Taking the best step each time (a greedy method) can miss the best result two steps away.
- **The most inside a fence.** Turned round, the same bound says a fence of 2s holds at most ⌊s/2⌋ · ⌈s/2⌉ tiles, reached by the nearest-to-square block: 12 inside a fence of 14. A tile planted in a nook between two tiles keeps the fence the same, which is how a garden grows to a rectangle for free.
- **Which fences can be made.** Five tiles give only 10 or 12: even, at least 2⌈2√5⌉ = 10 and at most 2 · 5 + 2 = 12.
- **Limits.** Only whole square tiles joined along sides, on a plot of fixed size. The longest fence depends on the plot (puzzles 3, 11 and 12), and so does the shortest when the garden must reach every row and column (puzzle 5); the most inside a fence is the plot-free answer, and puzzle 6 has room for it. A pond counts as shut in when no step across a side reaches the outside, so two tiles touching at a corner seal it (puzzle 8); this is the reading the Week 26 card asks the guide to make explicit, and here the drawn fence, which runs along all four sides of the pond, settles it. The app counts the fence for the child; it does not ask for area from a drawn outline.

Experiments come first: a child plants tiles and watches the fence counter change. Because the counter is live, the plain goals (a blob is shortest, a straight row longest) would be too easy, so the shortest puzzles add a condition (reach every row and column, or move only two tiles), and the longest ones a small plot or a pond, as the Week 26 card's app fit advises. The conjectures (the square is the shortest; spreading out makes the fence longer; the fence is never odd; a tile in a nook is free; a gap in a row costs two) come from that play. The explanations, such as why each shared side hides two tile sides, why a tree is the longest and why a block is the shortest, are grown-up conversations in each puzzle's notes. The worksheet's tables of sides and its proofs stay on paper.

## Where they appear

**Puzzles → Garden fences** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The plot uses the shared square grid ([sq-grid.md](../sq-grid.md)), which Weeks 48 and 54 can build on. The puzzles are grade-free (`band: "all"`) with Easy (1–4), Medium (5–8) and Hard (9–12), plus a playground.

| # | Puzzle | Kind | Plot | Answer | Week 26 source |
|---|---|---|---|---|---|
| 1 | Four tiles | Every garden of 4 | 4 by 4 | 5 gardens (square 8, the others 10) | K–1 Problem 1 |
| 2 | A fence of ten | 5 tiles with a fence of 10 | 4 by 4 | 1 garden: a 2-by-2 square and one more | K–1 Problem 2 |
| 3 | A small plot | Longest, 6 tiles | 3 by 3 | 14, three gardens | 4–5 Problem 2, on a small plot |
| 4 | Which fences? | Which of 8 to 13 can 5 tiles make | 5 by 5 | 10 and 12 | K–1 Problem 5 |
| 5 | Every row, every column | Shortest, 12 tiles reaching every row and column | 4 by 5 | 18, any garden with no gap in a row or column | 4–5 Problem 3 |
| 6 | Fourteen pieces of fence | Most tiles, fence 14 or less | 6 by 6 | 12, a 3-by-4 block | 4–5 Problem 4 |
| 7 | Six with a fence of twelve | Every garden of 6 with fence 12 | 5 by 5 | 7 gardens, each with one 2-by-2 square | 2–3 Problem 1 |
| 8 | Round the pond | Longest, 8 tiles round a pond | 5 by 5, 1 pond | 18, sealed at a corner (the ring has 16) | 4–5 Problem 2 and the guide's corner note |
| 9 | Seven with a fence of twelve | Every garden of 7 with fence 12 | 5 by 5 | 4 gardens | 4–5 Problems 1 and 3 |
| 10 | Two moves | Shortest after moving two of 12 planted tiles | 5 by 5 | 14, a 3-by-4 block; the best single move (16) is a trap | New, extending K–1 Problem 6 to two moves |
| 11 | Twelve in a square | Longest, 12 tiles | 4 by 4 | 26, four gardens | 4–5 Problem 2, on a 4-by-4 plot |
| 12 | Thirteen in a square | Longest, 13 tiles | 4 by 4 | 26 again | New, extending 4–5 Problem 2 |

The worksheets are in [math-circle-worksheets, week 26](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-26). Each puzzle's `provenance` names its problem.

## How a puzzle plays

- **Planting.** Tap an empty square to plant a tile and tap a tile to lift it. Drag across empty squares to plant a row, as many as the tray holds; drag a tile to carry it to an empty square. The tray above the plot shows the tiles still to plant, and tapping an empty square with the tray empty gives the tray a shake. Pond squares take no tile.
- **The fence** is drawn as rails with posts along every tile side with no tile beside it, and counted beside the tray. It is drawn even while the tiles are in pieces; when every tile is down (in Most, at once) "Join the tiles side to side." appears, and round a pond left open, "Close the fence round the pond."
- **Claims.** **Shortest**, **Longest**, **Most** and **That's all** claim that the garden on the plot answers the puzzle. A claim needs every tile planted in one garden (round the pond, if there is one). If it is wrong, the app says only which way it is wrong ("There's a shorter fence.", "There's a longer fence.", "More tiles fit.", "There's another."), never the target, and the claim waits until a tile changes.
- **A fence of ten** (puzzle 2) has no claim: it is solved as soon as the garden has that fence.
- **Every row, every column** (puzzle 5). A garden that misses a row or a column can't be claimed, and "Reach every row and every column." appears once every tile is down.
- **Two moves** (puzzle 10) starts planted. Two round markers count the moves left; a square a tile has left is a darker patch, and carrying a tile back there gives its move back. A tile moved twice counts once. With no moves left, tapping or dragging another tile shakes the markers. The tray appears only while a lifted tile waits in it.
- **Most** (puzzle 6) has no tray; the tiles are counted up, the fence shows "/ 14", and it turns red over 14, when Most can't be pressed.
- **Every garden** (puzzles 1, 7, 9). Each garden that counts joins the row below the plot when it is made; a turned or flipped copy lights the one already there. **Clear** lifts every tile. There is no count of how many are left: **That's all** is the claim.
- **Which fences?** (puzzle 4). The six lengths are chips below the plot. Each lights when all five tiles make a garden with that fence, and is ringed while the plot shows it.
- **Undo** keeps the gardens and lengths already found.
- **The playground** is a plot of 4, 6 or 8 squares a side with the tiles and the fence counted.
- **Hints** start with a question. Then they work from the child's own tiles toward the nearest garden that answers the puzzle, one tile at a time, with the square or tile glowing: plant here, move this tile there, lift this tile; then press the claim. In puzzle 10 they move tiles already moved first and fill starting squares first, so they never need a move the goal doesn't. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: tiles go on empty plot squares (no pond), at most as many as the tray holds; a carry moves a tile to an empty square; no more tiles off their starting squares than the limit; no claim with tiles in pieces, a pond open, a row or column missed where the plot asks, tiles still in the tray, a fence over the limit, or an answer still showing; nothing after a solve.
- Saved boards are checked: tiles are distinct plot squares in order, within the count and within the limit on moves; every found garden and length is one that counts, and the garden on the plot is already in the row; a solved claim is right; a stored answer to a wrong claim is the one the app would give.
- Every answer in the notes is computed by `scripts/build-fences.mjs` with the mechanic's own grid and shape keys, and checked again by `scripts/validate-fences.mjs` by separate methods: shapes from Redelmeier's enumeration (counts checked against OEIS A001168 and A000105), fences as 4n − 2s, holes by flood fill, the bound 2(r + c) on every shape up to ten squares, the longest fence on each plot and the shortest reaching every row and column by listing every joined set of its squares, and the two-move puzzle by playing every carry (the best within two moves, its one goal, and that the best single move can't be finished).

## Files

| File | Contents |
|---|---|
| `dist/sq-grid.js`, `dist/sq-grid.css` | The shared square grid: coordinates, boundaries, pieces, holes, outlines, shape keys, drawing and wiring ([sq-grid.md](../sq-grid.md)) |
| `dist/families/fences/fences.js` | Gardens and fences, plots that must be spanned, starts with a limit on moves, claims and their answers, the found row, hints toward the nearest best garden, and the `fences` mechanic (moves, rendering, wiring, the tray's and markers' shake) |
| `dist/families/fences/fences.css` | Soil, tiles, ponds, rails and posts, the tray and counters, chips and the row of gardens; imports the square grid styles |
| `dist/families/fences/fences.json` | The pack: a playground, 12 puzzles, 1 family and 5 sources, merged at load through `dist/families.js` |
| `scripts/build-fences.mjs` | Authoring list and plots; computes every answer, best garden and count, checks the authored notes, and writes `fences.json` |
| `scripts/validate-fences.mjs` | The separate checks above; answers played as moves, wrong claims answered, hint chains from fresh, messy and wrongly claimed boards, illegal moves and forged saves; run by `npm run build` |
| `tests/sq-grid.test.mjs` | The grid's numbering, boundaries, pieces, holes sealed at a corner, outlines through a pinch, shape keys, hit-testing and drawing |
| `tests/fences.test.mjs` | The fence, planting and carrying, ponds, reaching every row and column, two moves, each kind of claim, the found row and Undo, hints, saves and rendering |
| `scripts/fences-browser-smoke.mjs` | Plays the family in a real browser on a phone and a desktop: slides, taps, keys, carries, the tray's and markers' shake, each kind of claim, the playground |

To change a puzzle, edit `scripts/build-fences.mjs`, then run `node scripts/build-fences.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether a child predicts how the fence will change before planting a tile, or only reads the counter afterwards (the worksheet has them count with edge markers, and the app counts for them); whether children find the drags (a row at once, carrying a tile) or tap everything; and whether a pond shut in at a corner (puzzle 8) reads as fair or as a trick, since that is the reading the Week 26 card flags.
- **Real tiles.** The worksheet uses square tiles and edge markers on the table; the app is a picture of them.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** The worksheet's one-move starts (K–1 Problem 6, which puzzle 10 takes to two moves) and one-tile changes (grades 2–3 Problems 2 and 6), the shared-sides table (grades 2–3 Problem 3), the formula for the most inside a fence (grades 4–5 Problem 6) and the bonus packet's cube surfaces stay on paper.
