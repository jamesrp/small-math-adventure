# Hidden pictures

October 5, 2026. Twelve puzzles and a playground built from Week 25 of the Bellingham math circle (row and column shadows, also called discrete tomography). They are in the puzzle satchel only, not on the Lantern Road. Children haven't played them in the app yet, and the worksheet they come from hasn't been piloted either. The theme's review card is in the worksheets repository at [plans/review/week-25.md](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-25.md).

## The mathematics

A **picture** is a grid with at most one counter in each square. Its **counts** are the number of counters in each row and in each column. A **switch** takes two counters at opposite corners of a rectangle whose other two corners are empty, and moves them to those corners, each along its own row. A switch never changes a count.

- **Different pictures can share their counts.** Rebuilding a picture from its counts is the smallest case of discrete tomography. Gale and Ryser (1957) said exactly which counts have a picture at all. A full or empty line is the first deduction; on counts with one picture, the deductions run all the way through (puzzles 4 and 9).
- **Switches connect every picture with the same counts** (Ryser, 1957). From any picture you can reach any other with the same counts by switches alone. So a picture is the **only one with its counts exactly when it has no switch**. Equivalently, its rows nest: of any two rows, one row's counters include all the other's. Sorted by count, those rows make a staircase (a Ferrers diagram), and the column counts are the conjugate of the row counts (puzzles 6, 8, 9 and 12). The validator checks all three descriptions against each other on every 3 × 3 picture with 4 counters and every 4 × 4 picture with 8.
- **Fewest switches.** A switch changes four squares, so two pictures that differ in d squares are at least d/4 switches apart. Equivalently, it moves two counters, so a route needs at least half as many switches as there are counters out of place. On **two rows** the fewest is exactly half the number of columns where the pictures differ (puzzle 7). With **one counter per line** a picture is a permutation and a switch is a transposition, so the fewest is n minus the number of cycles: a 3-cycle needs 2 (puzzle 10). In general the fewest is d/2 minus the largest number of alternating cycles the differences split into (Brualdi, *Combinatorial Matrix Classes*). In puzzle 11, 12 squares differ in three rectangles: 6 − 3 = 3 switches, and only first switches that fix four squares leave a 3-switch route.
- **Knowing you have them all** is part of the answer in the "every picture" puzzles. An organized search by row A's counter settles puzzle 5 (3 × 2 × 1 = 6).

Children experiment first: they place counters and watch the counts. Conjectures follow ("you always have to move two at once", "a staircase can't change"). Explanations are for older or keener children with a grown-up: the two-counter argument for switches, the four-squares bound, the nesting rows. The puzzles never ask for a written proof.

## Where they appear

**Puzzles → Hidden pictures** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Grid | What counts as a solve | Week 25 source |
|---|---|---|---|---|
| 1 | Three in a small grid | 2 × 3, rows 2 1, columns 1 1 1 | Any picture with the counts (3 exist) | K–1 Problem 1, grades 2–3 Problem 1 |
| 2 | Not this one | 2 × 3, from A1 A2 B3 | A different picture with the same counts (2 exist) | Grades 2–3 Problem 3 |
| 3 | Two diagonals | 2 × 2, all counts 1 | Find both pictures, then That’s all | K–1 Problem 1 |
| 4 | A full column | 3 × 3, rows 2 1 2, columns 1 3 1 | Any picture with the counts (2 exist) | New |
| 5 | One in every line | 3 × 3, all counts 1 | Find all 6, then That’s all | K–1 Problem 3 |
| 6 | Only one? | 3 × 3, rows 1 3 2, columns 2 3 1 | Find the one picture, then That’s all | K–1 Problem 4 (new counts) |
| 7 | Swap the rows | 2 × 4 | Fill the rings in 2 switches | Grades 4–5 Problems 2 and 3 |
| 8 | A lonely four | 3 × 3 | 4 counters with no switch (45 of 126 placements) | K–1 Problem 6, grades 2–3 Problem 5 |
| 9 | Five by five | 5 × 5, rows 3 1 5 1 4, columns 2 5 1 3 3 | The one picture with the counts | New |
| 10 | Round the corner | 3 × 3 permutation | Fill the rings in 2 switches | Grades 2–3 Problem 4 (new grid) |
| 11 | Every row moves up | 4 × 4, two per line | Fill the rings in 3 switches | New; extends grades 4–5 Problem 3 |
| 12 | A lonely eight | 4 × 4 | 8 counters with no switch (1,020 of 12,870 placements) | New; extends K–1 Problem 6 |

The worksheets are in [math-circle-worksheets, week 25](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-25). Each puzzle's `provenance` names its problem. All instances on the 3 × 3 and larger grids except 5 and 8 are new.

## How a puzzle plays

- **Placing.** Tap a square to put a counter there or take it away. Each row and column has its count circled at the end, as on the worksheet. A count turns green when its line has exactly that many counters, and ochre when it has too many.
- **Match** (1, 4, 9). The puzzle is solved the moment every count is green. Any picture that fits is accepted.
- **Not this one** (2). The grid starts with the picture on the small card marked ≠. A different picture with all counts green solves it.
- **Every picture** (3, 5, 6). A picture with every count green is kept as a small card below the grid. If it was kept already, its card lights up instead. **Clear** empties the grid. **That’s all** finishes the puzzle when every picture is there. If one is missing, it says "There is another." and the search goes on. There is no slot per answer and no count of answers: deciding that the list is complete is the mathematics. Undo never loses a kept picture.
- **Switches** (7, 10, 11). Only switches are allowed, so the counts never change; they are drawn grey. Rings mark where the goal picture has its counters, and a counter in its ring turns its ring green. Tap a counter that has a switch: it is picked, and its partners glow. Tap a partner to switch, or tap the picked counter again to put it back. The dots below the grid are the switches left; each budget is the fewest possible. A route that can no longer make it within the budget is a dead end, and the hint says so.
- **Lonely** (8, 12). The counts show the picture's own rows and columns. Placing stops at the counter count. When all are placed and the picture has a switch, its four corners are outlined: that switch is the other picture with the same counts.
- **Hints.** Before any move, the first hint is the authored nudge. After that, hints name one square ("Put a counter on B3.") toward the nearest accepted picture, or the next switch on a shortest route. The third level offers Apply hint. In "every picture" puzzles the last hint presses That’s all.

## The playground

The playground has no goal, no Hint, and never counts as solved. Choose a square grid from 3 × 3 to 6 × 6. **Draw** adds or removes counters; **Switch** picks a counter and switches it with a glowing partner; **Clear** empties the grid. Under the grid is the number of pictures that share the current counts. It is 1 exactly when no switch is possible, and a switch never changes it. With three counters in every row and column of the 6 × 6 grid it is 297,200.

## Rules that keep the record honest

- Only legal moves are accepted: no counter beyond the limit in lonely puzzles, no toggles in switch puzzles, no switch that isn't one, no switch past the budget, no That’s all before a picture is kept, and no moves after a solve.
- Switch puzzles save the switches made, not the picture; the picture is replayed from the start, so a save with an illegal or extra switch is rejected. A save whose kept pictures include a picture that doesn't fit the counts, a repeat, or a completed claim with pictures missing is rejected.
- The picked counter is view state, outside the save. It is honored only on the picture it was picked on.

## Files

| File | Contents |
|---|---|
| `dist/families/pictures/pictures.js` | Counts, the search for every picture with given counts, counting them without listing (for the playground), switches, shortest switch routes, lonely pictures, the `pictures` mechanic (moves, hints, rendering, motion) and the playground |
| `dist/families/pictures/pictures.css` | Styles, in the shared board palette |
| `dist/families/pictures/pictures.json` | The pack: 12 puzzles, the playground, 1 family and 4 sources |
| `scripts/build-pictures.mjs` | Authoring list. It computes answer counts and switch budgets and writes the pack |
| `scripts/validate-pictures.mjs` | Independent checks on bitmasks: brute-force answer sets, distances by a separate search, the switch, nesting and alone-in-its-counts descriptions agreeing, the two-row and permutation distance rules, hints solving from fresh and scrambled boards, dead ends, illegal moves, Undo and forged saves, and the playground's counts. `npm run build` runs it |
| `tests/pictures.test.mjs` | Matching, twins, That’s all, switches and rings, picking, lonely pictures, saves, the playground, the satchel and rendering |
| `scripts/pictures-browser-smoke.mjs` | The family in a real browser on a phone: tapping squares, the two-tap switch and its budget, That’s all, the lonely corners, keyboard play with focus kept on the square, and the playground's tools and sizes |

To change a puzzle, edit `scripts/build-pictures.mjs`, then run `node scripts/build-pictures.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch:
  1. Whether K–1 children read the circled counts as targets, and the green and ochre as "just right" and "too many", without a grown-up. On the 5 × 5 (puzzle 9), whether children reason from full lines or wiggle counters until every count turns green, the review card's concern. If they wiggle, Hard match puzzles could hide the colors until a Check button.
  2. Whether the two-tap switch (pick, then partner) is found without help. Also whether rings make the switch puzzles clear, or whether children try to tap empty rings.
  3. Whether children press That’s all as a guess after each find, or search until they are sure. If they guess, a later revision could limit early claims.
- **Story.** Hidden pictures is not on the Lantern Road and has no keeper lines.
- **Grade levels.** The family is grade-free; it does not yet appear in a K–1, 2–3 or 4–5 trail.
- **A certificate for "only one".** The review card suggests letting a child prove a picture is the only one by tapping full and empty lines in turn until every square is forced. Puzzle 6 asks for That’s all instead.
- **Counts with no picture.** Gale and Ryser's existence condition (some counts have no picture at all) isn't a puzzle yet. A later puzzle could show impossible counts and ask the child to press "No picture".
- **Most switches.** Grades 4–5 Problem 4 asks for the largest number of switches ever needed between two pictures with the same counts. A "far" puzzle (reach a picture 4 switches from the start on the 4 × 4 grid with two per line) would need a way to show distance without giving it away.
