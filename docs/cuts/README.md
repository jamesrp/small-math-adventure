# Polygon cuts

October 5, 2026. Eleven puzzles and a playground, built from Week 14 of the Bellingham math circle, polygon triangulations and flips. They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app, and the Week 14 worksheets have not been taught.

## The mathematics

A convex polygon has n labelled corners, A at the top and the rest clockwise. Straight lines from corner to corner that do not cross cut it into triangles; a way of doing this is a **way** (the worksheets say *filling*; mathematicians say *triangulation*).

- **Every way has n − 3 lines and n − 2 triangles.** Each line cuts one piece into two, and the triangles' angles add up to the polygon's, (n − 2) × 180°. The count of triangles never depends on how you cut.
- **The number of ways is a Catalan number:** 2, 5, 14, 42 and 132 for 4 to 8 corners. Every way has one triangle on the side from A to the last corner; its third corner splits the rest into two smaller polygons, so the counts add up products of smaller counts. In the hexagon the third corner is B, C, D or E, with 5, 2, 2 and 5 ways: 14. The app sorts a collection this way.
- **Kept lines split the problem.** A kept line cuts the polygon into two pieces cut independently: in the pentagon, AC leaves a four-sided piece (2 ways); in the hexagon, AD leaves two (2 × 2 = 4).
- **Flips.** Two triangles that share a line make a convex four-sided piece; a **flip** swaps the line for the piece's other diagonal. Every line can be flipped, so every way has exactly n − 3 flips.
- **The flip map** joins ways that are a flip apart (the associahedron). The pentagon's map is a ring of five, so a route can come home after an odd number of flips, unlike the rhombus tilings of [Rhombus gardens](../rhombus/README.md), whose map is two-coloured. The hexagon's map has 14 ways, three flips each, and no three ways all a flip apart, so the shortest odd way home takes five flips (a pentagon ring, keeping one line).
- **The fan rule.** A fan has every line at one corner. A flip draws one line, so if a target shares k lines with a start, at least n − 3 − k flips are needed. For a fan that bound is exact: while the fan at v is unfinished, some triangle at v has a third side that is a line, and flipping it draws a new line at v. So the fewest flips to the fan at v is n − 3 minus the lines already at v, and any two ways are joined by flips (through a fan).
- **The bound is not always exact.** For a target that is not a fan, the missing-line count can fall short: in the hexagon, 8 of the 182 ordered pairs of ways need one flip more than their missing lines. A route through a fan is a route, not a shortest one: in puzzle 10 it takes 3 + 4 = 7 flips where 5 suffice.
- **Rings through every way.** The flip map of every polygon with five or more corners has a ring through every way (Lucas, 1987). The hexagon has 6, so 12 directed rings from any start, and a route that never repeats usually gets stuck.

Beyond these: the largest flip distance between two ways of an n-gon is 2n − 10 once n > 12 (Sleator, Tarjan and Thurston, 1988; Pournin, 2014), and whether the fewest flips between two ways can be found quickly in general is open.

Experiments come first: children draw ways and flip lines. Conjectures come from what the board shows: the number of lines never changes; the pentagon's ways come round in a ring. Explanations: sorting by the triangle on one side proves a collection complete; "a flip draws one line" plus a route that meets it proves a fewest. The general fan rule and the Catalan recursion stay in grown-up notes.

## Where they appear

**Puzzles → Polygon cuts** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The puzzles are grade-free (`band: "all"`), with Easy, Medium and Hard.

| # | Puzzle | Kind | Shape | The answer | Week 14 source |
|---|---|---|---|---|---|
| 1 | Keep the line | Every way, a kept line | Pentagon, AC kept | 2 | K–1 P4 |
| 2 | Five ways | Every way | Pentagon | 5, the five fans | K–1 P2; 2–3 P2; 4–5 P1 |
| 3 | Round the pentagon | Visit every way once, home | Pentagon, from AC AD | 5 flips round the ring | K–1 P6; 2–3 P4; 4–5 P3 |
| 4 | Keep the middle line | Every way, a kept line | Hexagon, AD kept | 2 × 2 = 4 | K–1 P4 |
| 5 | Fan to fan | Flip to the card | Hexagon, B fan to A fan | 3 flips: BF, BE, BD | 2–3 P6; 4–5 P4 |
| 6 | An odd way home | Odd flips home | Hexagon, from the A fan | 5 flips, keeping AE | New, after 2–3 P5 |
| 7 | One more flip | Flip to the card | Hexagon, BF CE CF to AD AE BD | 4 flips though 3 lines are missing | New: the card's strict-bound pairs |
| 8 | Fourteen ways | Every way | Hexagon | 14 = 5 + 2 + 2 + 5 | 2–3 P7 |
| 9 | Octagon to a fan | Flip to the card | Octagon, AC AD DF DG DH to the A fan | 3 flips | 4–5 P5, P6 |
| 10 | Nothing in common | Flip to the card | Octagon, the same start to AE BD BE EG EH | 5 flips; 7 through the A fan | 4–5 P7 |
| 11 | Every hexagon way once | Visit every way once, home | Hexagon, from the A fan | 14 flips; 12 rings | New, after K–1 P6 |
| | Playground | Free drawing and flipping | 4 to 8 corners | | 2–3 and 4–5 P1; shared launch |

The worksheets are in [math-circle-worksheets, week 14](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-14). The worksheets number the K–1 corners 1 to n; the app uses the letters of grades 2–5 for every puzzle. Each puzzle's `provenance` names its problem.

The [Week 14 review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-14.md) (keep) set the app fit: tap two corners to draw a line, with crossings refused, and tap a line to flip it, which enforces the one-line rule that paper can't (fix 1). Its three kinds of puzzle are here: every way, or every completion of a kept line, with That's all instead of a slot per answer and the row sorted by the triangle on one side; flip to a card within a budget; and the pentagon's odd return (puzzle 3 comes home in five). Its pitfalls are followed: budgets come from a search, never from the missing-line count (puzzle 7 is one of the eight pairs where that count falls short); no puzzle asks for a predicted number of flips; labels stay fixed, so a turned way is a different way; and nothing goes past octagons. Every budget is the fewest flips, so a solve is a shortest route. The card's "best" certificate for fans (tapping the card's lines already there) is not asked for: the counter and the card show the same thing, and why it is the fewest stays in the notes. Puzzles 6, 7 and 11 are new: an odd return in the hexagon, a pair where the bound fails, and a ring through every way.

## How a puzzle plays

- **Drawing.** Tap a corner to choose it, then another to draw a line between them. Tapping the chosen corner again lets it go; tapping a neighbouring corner chooses that one instead. A line that would cross another is refused with "Lines can't cross." and a dashed red line. Tap a line to erase it. A kept line is drawn thick and can't be erased.
- **Every way.** When the shape is cut all the way into triangles, the way joins a row below the board, sorted by the triangle on the side from A to the last corner. **That's all** checks the row: with one missing it says "There's another." and waits for a change. Undo keeps the ways found; Restart clears them. **Clear** erases every line but kept ones.
- **Flipping.** Tap a line to flip it. The board shows the current way; nothing is drawn by hand.
- **Flip to the card.** The goal card shows the way to make and a counter shows flips used of those allowed. A flip past the allowance is refused with "No flips left."
- **Odd way home.** The home card shows the start; solved when it is back after an odd number of flips.
- **Every way once.** A trail below the board shows the ways visited, home first. A flip back to a way already visited is refused with "You've been there."; the last flip may come home once every way is visited.
- **The playground.** Four to eight corners, chosen by small pictures. Draw lines; **Flip** and **Erase** choose what tapping a line does (a line beside a four-sided piece can't flip). There are no hints and no solve.
- **Hints.** In every-way puzzles a hint erases a line, or draws one, toward the nearest way not yet found, then presses That's all. In flip puzzles it glows the line to flip on a shortest route; when the card or home is out of reach, or a tour can't be finished, it says to undo. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: a side or a crossing line, a line drawn twice, erasing a kept line, flipping in a drawing puzzle, drawing in a flip puzzle, a flip of a line not drawn, a flip back to a visited way, a flip past the allowance, and anything after a solve are refused.
- Saved boards are checked: lines are legal and don't cross; kept lines are there; ways found are ways the puzzle asks for, listed once, and include a full way on the board; a route starts at the start and every step is a flip; tours repeat nothing until home; routes home stop at 40 flips.
- `scripts/build-cuts.mjs` computes the claims as it writes the pack. `scripts/validate-cuts.mjs` checks them again by separate methods: it rebuilds each polygon from coordinates and decides crossings with orientation tests; finds the ways as every set of n − 3 lines that pairwise don't cross, and checks that each is full and that its n − 2 triangles' areas add up to the polygon's; takes flips as ways sharing all but one line; checks the fan rule on every way of every polygon from 4 to 8 corners, and counts the hexagon pairs where the missing-line bound falls short; and finds distances, odd returns and rings by its own searches. It plays the notes' routes, hint chains from fresh and from trap boards, illegal moves and forged saves.

## Files

| File | Contents |
|---|---|
| `dist/families/cuts/cuts.js` | The `cuts` mechanic: moves, solves, hints, rendering and wiring |
| `dist/families/cuts/polygon.js` | The mathematics: polygons and lines, crossings, pieces, flips, every way, the flip map and distances |
| `dist/families/cuts/cuts.css` | The polygon board, lines, shaded triangles, corners, cards, the row of ways and the counter; imports the shared grid styles |
| `dist/families/cuts/cuts.json` | The pack: 11 puzzles and a playground, 1 family and 4 sources, merged at load through `dist/families.js` |
| `dist/tri-grid.js` | `wireTri`, the shared taps for corners and lines ([tri-grid.md](../tri-grid.md)); the polygon board is drawn here, not by the grid |
| `scripts/build-cuts.mjs` | Authoring list and copy; checks every stated count and distance and writes `cuts.json` |
| `scripts/validate-cuts.mjs` | The independent checks above; run by `npm run build` |
| `scripts/cuts-browser-smoke.mjs` | Taps, keys, drawing, refusals, flips, the row, cards, the trail and the playground in a real browser (`TEST_PHONE=1` for touch) |
| `tests/cuts.test.mjs` | Polygons, ways, flips, the fan rule, every kind of puzzle, the playground, hints, saves and rendering |

To change a puzzle, edit `scripts/build-cuts.mjs`, then run `node scripts/build-cuts.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, in the app or on paper. Three things to watch:
  - Whether two taps to draw a line are clear, especially when the first tap lands on a neighbouring corner, or whether children expect to drag.
  - Whether a flip reads as one line changing: the card's fix 1 worried that paper hides which line moved. The app redraws at once; children may need the change to be shown (a fade, or the old line ghosted).
  - Whether Fourteen ways and Every hexagon way once are absorbing or just long, and whether the sorted row helps children see what is missing.
- **The flip map itself.** Grades 2–3 P4 and 4–5 P3 have children join their drawings into the map. The app shows routes (the trail) but never the map; a board where children join ways would be its own puzzle kind.
- The card's "best" certificate for fans, a predicted flip count, and the return visit (Week 14 RV) are not in the app. Heptagon puzzles are only in the playground.
