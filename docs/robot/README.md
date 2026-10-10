# Memory robot

October 10, 2026. Twelve puzzles and a playground built from Week 72 of the Bellingham math circle (a robot that remembers area). They are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 72 worksheet is itself an unpiloted prototype: one shared grades 4–5 packet whose cards, memory strip and partner roles have not been rehearsed. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-72.md) says keep; its App fit (B, size S) asks for a live memory, budgets at the optimum, no predict-the-memory tasks, and never calling an open walk's memory its area. The board keeps the memory on screen as shading, so the negative-number arithmetic that gates the worksheet at Problem 2 is done for the child and checked by the picture.

## The mathematics

The robot walks the streets of a square grid, one block per move: east, west, north or south. It carries a **memory**, a whole number that starts at 0. East and west leave the memory alone; a step north adds the robot's column number x, and a step south subtracts it. So after a walk the memory is

  z = Σ x·Δy, over the walk's steps north and south,

the signed area between the walk and the **wall** (the column x = 0), counted strip by strip: a step north at column x > 0 adds the x unit squares between the wall and the robot in the row it crosses, and at x < 0 it takes away the |x| squares between the robot and the wall; a step south does the opposite.

- **Order matters, and the corner doesn't decide the memory.** EN and NE both end at (1, 1), with memories 1 and 0 (puzzle 1). The staircases to (a, b), walks of a steps east and b north, leave every memory from 0 to ab, the number of squares between the staircase and the wall: the six walks to (2, 2) leave 4, 3, 2, 2, 1 and 0 (puzzle 2, Week 72 Problem 1).
- **A loop remembers its area.** For a walk that comes back to where it started, each row it crosses is climbed and descended the same number of times, so the strips cancel outside the loop. A square's final count is the loop's winding number round it: a simple loop shades exactly its inside, and its memory is its area, positive anticlockwise and negative clockwise (puzzles 3 to 6, Week 72 Problems 2 and 3). Sliding a loop sideways by h adds h·ΣΔy = 0, so a loop's memory doesn't depend on where it is (puzzle 8). A loop walked twice counts twice, and a figure eight with one lobe each way can come home with 0.
- **Fewest moves for a loop.** A loop that remembers n ≠ 0 needs at least 2⌈2√|n|⌉ moves, and that many suffice. Since a loop's steps north and south cancel, its memory is also Σ (x − c)·Δy for any c; take c halfway across the columns the loop visits. A loop with H moves east and west has to come back as far as it goes, so its columns lie within a width of H/2 and each |x − c| is at most H/4, and with V moves north and south |z| ≤ V·H/4, which for L = V + H moves (V and H even) is at most ⌊L/4⌋·⌈L/4⌉. Crossing loops obey this too. A near-square rectangle, trimmed at a corner, reaches it (puzzles 5, 7 and 9); for simple loops this is the least perimeter of n unit squares (Harary and Harborth, 1976), the bound Week 26 (Garden fences) teaches. The validator checks the formula against search for every n from −12 to 16.
- **Shortcuts outside the box.** An open walk can be shorter for going past the flag: to (2, 2) a staircase leaves at most 4, but EEENWN leaves 5 in six moves, the north step at column 3 adding 3 (puzzle 10); WNNEEE leaves −2 by climbing left of the wall (puzzle 11); and to (0, 3) with memory 3, ENNNW climbs one column out (puzzle 12).

The robot's state (x, y, z) is an element of the integer Heisenberg group, with the law (x, y, z)(a, b, c) = (x + a, y + b, z + c + x·b): each move multiplies the state on the right by a generator, the matrix entry z is the memory, and a loop such as ENWS (a commutator) changes only the central coordinate. The fewest moves to change only the memory by n grow like the square root of n, as the loops show; Duchin and Mooney study this word metric exactly. Their coordinates use the symmetric height t = z − xy/2, which for an open walk is not the worksheet's memory (the area closed by a straight chord); the two agree on loops. The puzzles use only the finite statements above, and none calls an open walk's memory "its area" without saying which area.

## Where they appear

**Puzzles → Memory robot** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

Every board is the same: street corners with x and y from −2 to 4, the wall at x = 0. The budget is the fewest moves, found by search on the board, and the board never makes a puzzle longer than the open plane does (the validator checks both). It does cut some of the open plane's shortest walks, noted in the last column.

| # | Level | Start | Flag | Memory | Moves | Shortest walks (on the board, of those in the plane) | Insight | Week 72 source |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | (0, 0) | (1, 1) | 1 | 2 | EN only | Order matters: NE gives 0 | Launch, Problem 1 |
| 2 | Easy | (0, 0) | (2, 2) | 3 | 4 | ENEN only | Staircases to one corner leave different memories | Problem 1 |
| 3 | Easy | (0, 0) | (0, 0) | 1 | 4 | 4: one square at O, anticlockwise | A loop changes the memory without moving the robot | Problem 2 |
| 4 | Easy | (0, 0) | (0, 0) | −1 | 4 | 4: clockwise | The direction round a loop sets the sign | Problem 2 |
| 5 | Medium | (0, 0) | (0, 0) | 4 | 8 | 8: the 2 × 2 squares with O on their boundary | A loop remembers its area | Problem 3 |
| 6 | Medium | (0, 0) | (0, 0) | 3 | 8 | 44 of 48: strips of three and L shapes | Different shapes, same area, same memory | Problem 3 |
| 7 | Medium | (0, 0) | (0, 0) | 6 | 10 | 14 of 20: 2 × 3 rectangles | The most area for the moves: near-square | New |
| 8 | Medium | (3, 0) | (3, 0) | 2 | 6 | 10 of 12: 1 × 2 rectangles | Long strips cancel; sliding a loop keeps its memory | Problem 3 (sliding) |
| 9 | Hard | (0, 0) | (0, 0) | 7 | 12 | 145 of 264 | Seven squares need 12 moves, 2⌈2√7⌉ | New |
| 10 | Hard | (0, 0) | (2, 2) | 5 | 6 | 4: EEENWN, ESENNN, SENENN, EENENW | Go past the flag: north at column 3 adds 3 | New, after Problem 4 |
| 11 | Hard | (0, 0) | (2, 2) | −2 | 6 | 2: WNNEEE, NNNEES | Negative memory by climbing left of the wall | New, after Problem 4 |
| 12 | Hard | (0, 0) | (0, 3) | 3 | 5 | ENNNW only | Straight up leaves 0; one block out, three up, one back | New, after Problem 1 |

Each puzzle's `provenance` names its problems. The worksheets are in [math-circle-worksheets, week 72](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-72): a grades 4–5 packet of four problems with move cards and a −10 to 10 memory strip, and an adult guide. Puzzles 1 to 6 and 8 use the worksheet's routes and outlines as single targets with a budget; the targets of puzzles 7 and 9 to 12 are new.

## How a puzzle plays

- **The board.** The streets are the grid lines, the wall a bold ink line at column 0, and the column numbers −2 to 4 sit under it, 0 in bold. The start corner has a small ring; the flag stands on the target corner. The robot is a pine square with a face, and its walk is an ink trail with a paper edge, so it shows even along the wall.
- **Shading.** Each step north or south shades its strip (above). A square's net count shows as sun yellow when positive and Paint rows blue when negative, lighter for ±1 and deeper with a Georgia numeral for 2 or more in size. The squares add up to the memory; when a loop closes, everything outside it goes back to blank.
- **The memory and the goal.** Above the board: the memory as a large Georgia numeral beside a small robot, and the goal memory beside a small flag in the yellow goal card. There is no task line on the play screen (`visibleObjective: ''`); How to play says the goal, the rules and the controls, with one worked picture (east, east, north from the wall: two squares, memory 2).
- **Moves.** The four corners next to the robot carry a soft pine dot; tap one to move there. A corner off the board has no dot, and taps anywhere else do nothing. With a keyboard, Tab to a corner and press Enter or Space, or use the arrow keys while a corner has focus; focus stays on the board. Each corner's accessible name is "Move east" and so on, and a polite status line says "Memory 3. At 2 across, 1 up. 2 moves left."
- **Budget.** One box per move sits under the board, filling with arrows as moves are made; more than eight boxes split into two even rows. The budget is the fewest moves, so a wasted move means Undo, and the app says so at once ("Too few moves are left. Undo."). Every shortest walk is accepted: a puzzle is solved when the robot stands on the flag with the goal memory, which can only happen on the last box.
- **Hints.** Before any move, the first hint is the authored nudge. Then each hint names the next move of a shortest finish within the moves left, searched from where the robot is ("Move west."), and marks that corner in ochre; with no finish left it says Undo. The third level offers Apply hint, and hints alone finish every puzzle.

## The playground

The same board with no flag, goal or budget: walk anywhere (up to 200 moves), watch the memory and the shading, and **Clear** to go home with memory 0. There is no Hint, and it never counts as solved. Big loops either way round, loops walked twice and figure eights are the natural things to try.

## Rules that keep the record honest

- Only legal moves are accepted: one block to a corner next to the robot, on the board, within the budget, and nothing after a solve. Two blocks, a diagonal, a corner off the board and anything that isn't a move are refused.
- The save is the walk, a string of E, N, W and S, and everything shown is derived from it. A save is rejected if it has any other letter, leaves the board, runs past the budget (200 moves in the playground), has any other field, or goes on after reaching the flag with the goal memory.

## Files

| File | Contents |
|---|---|
| `dist/families/robot/robot.js` | Moves and the memory, the shading, the backward search for the fewest moves and its hints, the `robot` mechanic (moves, saves, rendering on the shared square grid, taps and arrow keys, the How to play picture) and the playground |
| `dist/families/robot/robot.css` | Styles, in the shared board palette, on top of `sq-grid.css` |
| `dist/families/robot/robot.json` | The pack: 12 puzzles, the playground, 1 family and 4 sources |
| `scripts/build-robot.mjs` | The authoring list; computes each budget, a shortest walk and the number of shortest walks, and writes the pack |
| `scripts/validate-robot.mjs` | A separate simulator (it tracks w = Σ y·Δx and reads the memory as z = xy − x₀y₀ − w), searching forwards over (x, y, w) for each budget and count of shortest walks on the board and in the open plane; the loop formula for n from −12 to 16; staircases, sliding and reversed loops, the group law; the shading over every walk of up to 8 moves (it adds up to the memory, closed walks shade their winding numbers, simple loops their inside); every walk of a puzzle's length up to 8 checked as a save and a solve; hints alone from fresh, after a wasted move and with the budget spent; illegal moves; forged saves; the playground. `npm run build` runs it |
| `tests/robot.test.mjs` | Moves, order, the shading and its cancelling, budgets and the search, every shortest walk accepted, rendering, hints and their marked corner, saves, the playground, How to play and the satchel |
| `scripts/robot-browser-smoke.mjs` | Taps (touch taps with `TEST_PHONE=1`), refused taps, the boxes, the dead-end message and Undo, the keyboard and arrow keys, the long strips cancelling, a marked hint and hints alone, negative memory, the playground's numerals and Clear, and How to play; screenshots in `test-results/robot/` |

To change a puzzle, edit `scripts/build-robot.mjs`, then run `node scripts/build-robot.mjs`, `npm test` and `npm run build`.

## Sources

- [Week 72 worksheets and adult guide](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-72) and the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-72.md), with its math check.
- Moon Duchin and Christopher Mooney, [Fine asymptotic geometry in the Heisenberg group](https://arxiv.org/abs/1106.5276): the integer Heisenberg group, its word metrics, and the symmetric height t = z − xy/2 (the worksheet guide's convention warning applies).
- Frank Harary and Heiko Harborth, Extremal animals, Journal of Combinatorics, Information & System Sciences 1 (1976), 1–8: the least perimeter of n unit squares, 2⌈2√n⌉ ([OEIS A027709](https://oeis.org/A027709)).

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether children connect the shaded squares to the number, and read the deeper squares with numerals as counting twice, or watch only the numeral above the board.
  2. Whether the immediate "Too few moves are left. Undo." after a wasted move cuts short the experiment a puzzle is for (in puzzle 1, walking NE to see the flag reached with memory 0), or helps.
  3. Whether tapping the dots next to the robot is found without help, and whether children on a phone tap the robot or far corners expecting the robot to walk there.
- **The review card's other ideas.** Its App fit also suggests the worksheet's own targets at the ring (memory 7 and −3, eight moves each; here they are puzzle extensions), a "can't" claim certified by the bound that a loop of L moves remembers at most (L/4)², a collection puzzle (every memory at the ring from two E and two N, claimed done), tapping arrow buttons rather than corners, and a walker engine shared with Week 66.
- **A demo.** A few-second demo of the move would walk EEN from the wall, then close the loop and watch the strip outside cancel.
- **Story.** Memory robot is not on the Lantern Road and has no keeper lines; Plume's count would be the budget.
