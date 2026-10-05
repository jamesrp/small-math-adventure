# Rhombus gardens

October 5, 2026. Twelve puzzles and a playground built from Week 1 of the Bellingham math circle, the pattern-block tiling lab. They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. James's children were taught the Week 1 worksheets and liked them; the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-01.md) says keep.

## The mathematics

Boards are cut from the grid of triangles that pattern blocks fit. A blue **rhombus** covers two triangles that share a side. A purple **chevron** covers four triangles in a bent row.

- **Every rhombus covers one up and one down triangle.** Two triangles that share a side always point opposite ways, so a set of rhombi is a matching between the up and the down triangles. A board with more of one kind leaves at least the difference empty. The triangle with n edges on a side has n more up triangles than down, and leaves exactly n empty (puzzle 2). This is the review card's "imbalance forces gaps".
- **The most rhombi equals the fewest dots (König).** Put dots on triangles so that every place a rhombus could go covers a dot. No two rhombi can share a dot, so k dots allow at most k rhombi. König's theorem says that on every board the most rhombi equals the fewest such dots. So k rhombi and k dots that stop every place prove each other best, with no list of packings. This is the solve in every pack puzzle, and it is the same count as Routes and roadblocks (max-flow min-cut).
- **Equal counts are necessary, not sufficient.** The bow tie (puzzle 6) has three of each and still leaves two empty, because two corners share one partner. The hourglass (puzzle 9) has nine of each and leaves two empty. Its proof needs dots of both kinds: three in each half, plus two on the seam.
- **Stuck is not the most.** Laying rhombi until none fits often stops short. On the sailboat, 15 of the 20 ways to get stuck stop at three or four rhombi, not five. On the hourglass, 347 of 356 stop at six or seven, not eight. Getting from stuck to the most can mean lifting a rhombus (Berge's augmenting paths).
- **A filling of a hexagon is a pile of cubes.** Shade each rhombus by which way it leans. A filling of the hexagon with sides a, b, c then looks like a pile of cubes in the corner of an a × b × c box. There are as many fillings as piles, counted by MacMahon's formula: 3 for the long hexagon (2, 1, 1), 6 for (1, 2, 2), 20 for (2, 2, 2), 980 for (3, 3, 3), and 232,848 for (4, 4, 4). Seen from any of the three sides, a pile shows the same area, so each direction of rhombus is used equally often (the calisson problem).
- **A flip adds or takes away one cube.** Three rhombi that make a small hexagon round a grid point can turn to the hexagon's other filling. Thurston's height function rises by 3 at that point and nowhere else. So on a board without holes, the fewest flips between two fillings is the number of cubes in one pile and not the other, and flips connect every filling. Puzzles 8 and 12 ask for exactly the fewest. In puzzle 12 the two piles share two cubes, so four go and four come; a flip the wrong way costs two.
- **Chevrons have no short certificate.** A chevron is two rhombi, so chevrons never fill a board that rhombi cannot. The converse fails, and there is no dot-style proof that a board cannot be filled with chevrons. Puzzle 10 is therefore a board that can be filled: only as a pinwheel, turning either way, and 30 of the 42 places for a first chevron lead nowhere. Both pinwheels split into the same rhombus filling, the pile of four cubes.

Experiments come first: a child lays rhombi, gets stuck, and lifts some. Conjectures come from what the board shows. Dots that stop every rhombus match the rhombi at a solve. The shelf of fillings looks like piles of cubes, and a flip adds a cube. Explanations stay with grown-ups: why k dots allow at most k rhombi, why a list of fillings is complete, and why the fewest flips is a cube count. They are in each puzzle's notes. The puzzles never show the best count or the number of fillings.

## Where they appear

**Puzzles → Rhombus gardens** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The puzzles are grade-free (`band: "all"`), with Easy, Medium and Hard. Puzzles 1, 3, 4 and 10 need no reading or counting once the move is shown. The pack puzzles need counting to three, six or nine and telling up from down. The flip puzzles need counting to four or eight.

| # | Puzzle | Kind | Board | The answer | Week 1 source |
|---|---|---|---|---|---|
| 1 | Long hexagon | Fill | Hexagon 2, 1, 1 | 3 fillings | K–1 Problem 4 |
| 2 | The mountain | Pack | Triangle with 3 edges a side | 3 rhombi; dots on the 3 downs | 2–3 Problems 1–2; card fix 1 (K–1 mountain) |
| 3 | Three ways | Every | Hexagon 2, 1, 1 | 3, split by the left point | Card fix 1: "Find every way" |
| 4 | The star | Fill | Six-pointed star | 1 filling; 6 of 12 first rhombi dead | K–1 star outline |
| 5 | The sailboat | Pack | 6 up, 5 down | 5; dots on the downs | K–1 sailboat, posed as 2–3 Board C |
| 6 | The bow tie | Pack | 3 up, 3 down | 2; dots on the two middles | Guide reserve "Equal up/down counts can still fail" |
| 7 | Six fillings | Every | Hexagon 1, 2, 2, turned | 6 piles (0, 1, 2, 2, 3, 4 cubes) | 4–5 Problem 1 (cards A–F) |
| 8 | First flips | Flip | Hexagon 2, 2, 2, turned | Empty corner to 4 cubes in 4 | 4–5 Problems 2–3; guide scaling reserve |
| 9 | The hourglass | Pack | Two triangles of side 3 | 8; dots of both kinds | New (exhaustive search), extending the bottleneck reserve |
| 10 | Purple pinwheel | Fill, chevrons | Hexagon 2, 2, 2 | 2 pinwheels; 30 of 42 first chevrons dead | 2–3 Problem 3, K–1 Problem 3 |
| 11 | Twenty piles | Every, with flips | Hexagon 2, 2, 2, turned | 20 piles: 1, 1, 3, 3, 4, 3, 3, 1, 1 by size | Guide scaling reserve; encore 4–5 cube stacks |
| 12 | Turn the wall | Flip | Hexagon 3, 3, 3, turned | A wall of 6 to another wall of 6 in 8 | New, extending 4–5 Problem 3 |
| | Playground | Flips and rhombi | Hexagons 2, 3, 4, turned | 8, 27, 64 flips to fill the box | Week 1 blocks; encore cube stacks |

The worksheets are in [math-circle-worksheets, week 1](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-01) and its [encore](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/source/week-01-encore). Each puzzle's `provenance` names its problem. Puzzles 9 and 12 and every board's exact choice are new; they were picked by exhaustive search for a real decision: a stuck state below the most, dead first moves, a proof needing both kinds of dot, or a flip route needing both removals and additions.

The review card asked for its K–1 fixes (the mountain "Can you do it?" and "find every way" on the long hexagon); puzzles 2 and 3 are those. Its app-fit section suggested a starred set of triangles with too few neighbours (Hall's condition) as the certificate for fewest gaps. The app uses König's dots instead. They are checked one rhombus place at a time, match the rhombi one for one, and are the same certificate as Routes and roadblocks. The grades 4–5 ribbon codes appear only in grown-up notes. The question of odd round trips on the flip map is already in Proofs (puzzles 8–11, the same six fillings as cards A–F), so it is not repeated here.

## How a puzzle plays

- **Laying a piece.** Drag a finger across two triangles that share a side, or tap them one after the other. A tapped triangle shows a small mark, and the triangles it could pair with glow. A tap on a triangle that cannot join the piece starts a new one. Chevrons take four triangles the same way. Tap a piece to lift it. On a board where pieces can be laid, a finger on the board draws instead of scrolling the page.
- **Shading.** Rhombi are shaded by direction: light tops, mid and dark sides. Turned boards (puzzles 7, 8, 11, 12 and the playground) are drawn so the rhombi read as cubes in a corner.
- **Pack puzzles.** Buttons above the board switch between **Rhombi** and **Dots**, each with its count. Dots are a separate layer: they never stop a rhombus, and a rhombus never stops a dot. While placing dots, a dashed rhombus shows a place that covers no dot. Solved when the board is full, or when there are as many dots as rhombi and no place is free of dots.
- **Every way.** Each filling joins a shelf of small pictures below the board, once. **Clear** lifts every rhombus. **That's all** checks the list: with one missing it says "There's another." and waits for a change. Undo keeps the fillings already found; Restart clears them.
- **Flips.** White dots mark the points where a flip can happen. Tap one to turn the three rhombi round it. In flip puzzles these dots are the only controls, the goal is a small picture marked ⚑, and a counter shows flips used against the budget. **Start again** returns to the first picture. Reaching ⚑ over budget does not solve it. In Twenty piles, flips are an extra way to reach new fillings and are not counted.
- **The playground.** Three hexagons (sides 2, 3 and 4), each starting as an empty corner. Flip to add cubes, or lift and lay rhombi freely. Pressing the chosen hexagon again empties the box. There are no hints and no solve.
- **Hints.** Hints keep as much of the child's work as an answer allows. In fill puzzles they place the next piece of a filling that keeps every piece already down, and when there is none, lift a piece that is in the way. In pack puzzles they first complete a most packing that keeps the child's rhombi, then take away a dot that is in no fewest set and add missing ones; the tool button is marked when the next step needs the other tool. In listing puzzles they build or flip toward the nearest filling not yet found, then press That's all. In flip puzzles they flip along a shortest route, or say Start again once the budget cannot be met. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: a piece must be a real placement on free triangles, a flip needs three rhombi round an inner point, dots exist only in pack puzzles, and nothing moves after a solve.
- Saved boards are checked: pieces are placements that do not overlap; a flip puzzle's board is a full filling, and its flip count is at least the fewest from the start and differs from it by an even number (each flip changes the cube count by one); every entry on a listing shelf is a real filling, listed once; the board on show, if full, is on the shelf; and That's all is consistent with the list.
- `scripts/build-rhombus.mjs` computes the claims as it writes the pack. `scripts/validate-rhombus.mjs` checks them again by separate methods. Triangles come from a point-in-polygon test. Filling counts come from the determinant of the up-down adjacency matrix (Kasteleyn), MacMahon's product and a separate listing. Most rhombi comes from a search over every packing; fewest dots, from trying every smaller set. Chevron places come from turning the piece's triangle centres. Flip distances come from Thurston's height function. The validator plays every witness, hint chains from fresh and from trap boards, illegal moves and forged saves.

## Files

| File | Contents |
|---|---|
| `dist/families/rhombus/rhombus.js` | The `rhombus` mechanic: boards, moves, solves, hints, rendering and wiring |
| `dist/families/rhombus/lozenge.js` | The mathematics: most packings, König covers, exact covers, flips, flip distances, the empty corner and cube piles |
| `dist/families/rhombus/rhombus.css` | Face shading, dots, tools, the goal card, the shelf and the playground; imports the shared grid styles |
| `dist/families/rhombus/rhombus.json` | The pack: 12 puzzles and a playground, 1 family and 7 sources, merged at load through `dist/families.js` |
| `dist/tri-grid.js`, `dist/tri-grid.css` | The shared triangle grid (cells, points, placements, drawing, taps, keys and finger strokes), described in [tri-grid.md](../tri-grid.md) |
| `scripts/build-rhombus.mjs` | Authoring list, boards and copy; checks every stated count and writes `rhombus.json` |
| `scripts/validate-rhombus.mjs` | The independent checks above; run by `npm run build` |
| `tests/rhombus.test.mjs` | Packing and covers, flips and piles, taps, the two-sided solve, listing with Undo, flip budgets and saves, the playground, hints and rendering |
| `tests/tri-grid.test.mjs` | The shared grid's geometry, placements, outlines, hit-testing and controls |

To change a puzzle, edit `scripts/build-rhombus.mjs`, then run `node scripts/build-rhombus.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children in the app. Three things to watch:
  - Whether children lay rhombi by dragging, or need taps, on a phone. Whether they find **Lift** by tapping a rhombus.
  - Whether children find the **Dots** tool without help, and whether a child who is stuck at fewer rhombi thinks to lift one (puzzles 5 and 9).
  - Whether the cube shading carries the flip puzzles: does a child see "add a cube", or flip at random until the budget runs out?
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **More of Week 1.** Fewest-gap packings with chevrons, the ribbon codes, and the encore's placement game and red trapezoids are not here. The grid is ready for them ([tri-grid.md](../tri-grid.md)).
- **Paper only.** Written proofs that a list of fillings is complete, and the guide's "Turn your reason into a rule for any board", stay with grown-ups.
