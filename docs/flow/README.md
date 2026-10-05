# Routes and roadblocks

October 5, 2026. Ten route-packing puzzles and two roadblock games built from Week 13 of the Bellingham math circle (route packing and bottlenecks). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. The Week 13 worksheets have not been piloted either; the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-13.md) kept them as they are.

## The mathematics

Each map is a few dots joined by one-way arrows, with a start ▶ and a finish ⚑. A **route** follows arrows from ▶ to ⚑ and never visits a dot twice. Routes may share dots but not arrows. A **roadblock** closes one arrow.

- **The most routes equals the fewest roadblocks.** On every map, the largest number of routes that share no arrow equals the smallest number of roadblocks that stop every way from ▶ to ⚑. This is Menger's theorem for arcs, the unit-capacity case of the max-flow min-cut theorem.
- **Matching counts prove both are best.** The easy half needs no theorem. Each roadblock closes one arrow, and routes that share no arrow cannot both use it, so k routes need at least k roadblocks. So k routes plus k roadblocks that stop everything prove there is no (k + 1)th route and no smaller set of roadblocks, with no list of all routes. This is the solve in every packing puzzle.
- **Stuck is not the most.** A set of routes can be stuck (no route fits beside them) and still be smaller than the best. The shortcut (puzzle 2) is the smallest case: the route ▶ A B ⚑ blocks every other, yet two routes fit. Puzzles 9 and 10 start stuck.
- **Rerouting repairs a stuck set.** A stuck set grows only by giving up arrows it already uses. Puzzle 9's long route ▶ A B C D E ⚑ has to give up A to B and D to E; the walk ▶ B A C E D ⚑, which travels two of the long route's arrows backwards, cancels both at once. This is the Ford–Fulkerson augmenting path. The repair is left to the child; the app names it only in the grown-up notes.
- **The bottleneck need not be at the ends.** In puzzles 6 and 11, three or four arrows leave ▶ and reach ⚑, but every route has to cross a narrower set in the middle. In puzzle 11, back arrows let a route cross that middle set twice, which is how a first try wastes it.
- **The roadblock game.** Players take turns closing one arrow; whoever stops the last way through wins. On two separate roads the second player wins by answering on the other road (puzzle 8). On the shortcut map the first player wins, and only by closing the shortcut, which leaves two separate roads with the other side to move (puzzle 12). This is a small impartial game solved by reduction to a known lost position.

Experiments come first: a child draws routes until stuck, then places roadblocks and watches the dashed way through disappear. The conjecture ("the roadblocks always match the routes") comes from seeing every route cross exactly one roadblock at a solve. The explanations (why k routes need k roadblocks; why a stuck set can grow) are grown-up conversations, written in each puzzle's notes. The puzzles never ask for a written proof, and they never show the best count.

## Where they appear

**Puzzles → Routes and roadblocks** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard. Puzzles 1–3 and 8 need no reading or arithmetic; the rest need counting to three or four and keeping track of several routes.

| # | Puzzle | Map | Best | Week 13 source |
|---|---|---|---|---|
| 1 | Two roads | Diamond, 4 dots, 4 arrows | 2 (4 pairs of roadblocks) | Shared launch and K–1 Problem 2 |
| 2 | The shortcut | Diamond with a shortcut, 5 arrows | 2 | The reference greedy board, K–1 Problem 1, grades 2–3 Problem 1 |
| 3 | The funnel | Two roads that merge, 6 arrows | 1 | K–1 Problem 2, lower board |
| 4 | Three roads and two links | 5 dots, 8 arrows | 3 | New, in the style of K–1 Problem 3 |
| 5 | The bow tie | 7 dots through one middle dot | 2 (8 pairs of roadblocks) | K–1 Problems 1 and 5, grades 2–3 Problems 1 and 3 |
| 6 | Squeeze in the middle | 12 dots, 16 arrows | 2 | The interior bottleneck board (grades 2–3 Problem 2, grades 4–5 Problem 2) |
| 7 | The arrow that points back | 6 dots, 9 arrows | 2 | Grades 4–5 Problems 3 and 4 |
| 8 | Roadblock game: two roads | Diamond | Go second | K–1 Problem 6, upper board |
| 9 | Two crossings | 7 dots, 10 arrows; starts with a stuck route through every dot | 2 | The revised coupled board (grades 2–3 Problem 5, grades 4–5 Problem 1) |
| 10 | Up the ladder | 8 dots, 13 arrows; starts with two stuck routes | 3 | New: chosen by exhaustive search (26 ways to add routes until stuck, only 2 reach three) |
| 11 | Big squeeze | 13 dots, 20 arrows | 3 | New, extending the interior bottleneck and grades 4–5 Problem 4 |
| 12 | Roadblock game: the shortcut | Diamond with a shortcut | Go first, close the shortcut | K–1 Problem 6, lower board |

The worksheets are in [math-circle-worksheets, week 13](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-13). Each puzzle's `provenance` names its problem.

## How a puzzle plays

- **Two tools.** Buttons above the map switch between **Routes** and **Roadblocks**; each shows its count. Routes and roadblocks are separate layers: a roadblock never stops a route from being drawn, so at a solve each route visibly crosses one roadblock.
- **Drawing a route.** Tap ▶, then tap dots along the arrows, or slide a finger from dot to dot. The dots a route can reach next glow. A route ends at ⚑. Routes get four colours, each with its own dash pattern, so they never depend on colour alone. Tapping ▶ again drops an unfinished route and starts over. In the Routes tool, tapping an arrow of a drawn route clears that route, and a finger on the map draws instead of scrolling the page.
- **Placing roadblocks.** In the Roadblocks tool, tap an arrow to close it (a red bar) and tap it again to open it. A dashed red line shows a way that still gets through. When no way is left, ⚑ turns red.
- **The solve.** Solved when the number of routes equals the number of roadblocks and nothing gets through. More roadblocks than routes does not count, even when everything is stopped. The best count is never shown.
- **Stuck starts.** Puzzles 9 and 10 begin with routes already drawn, which are stuck. Restart returns to them.
- **The game.** Choose **I go first** or **You go first**, then tap arrows to close them; the other side answers at once with its best move. A lost game says "They stopped the last way through." and offers **Again**. A won game is solved.
- **Hints.** Hints keep as much of the child's work as a best answer allows. They clear a route only when no best answer contains it, then extend the route being drawn, start a new route, take away a stray roadblock, and finally place the missing roadblocks of the best-matching set. When the next step needs the other tool, its button is marked too. Hints alone solve every puzzle. In a game, the hint names a winning move, or says to press Again once the position is lost.

## Rules that keep the record honest

- Only legal moves are accepted: a step must follow an unused arrow to a dot not yet on the route, no arrow is closed twice, and nothing moves after a solve.
- Saved boards are checked against the map: every route follows arrows, routes share no arrow, only the last route may be unfinished, and every roadblock names a real arrow. In a game save, only the last closure may stop everything, and every closure the app made must be its own best move, so a forged win is rejected.
- The best count, every set of matching roadblocks and the game winners are computed by `scripts/build-flow.mjs` and checked again by `scripts/validate-flow.mjs` with an independent max-flow (Edmonds–Karp) and its own game search.

## Files

| File | Contents |
|---|---|
| `dist/families/flow/flow.js` | Routes, the leak, best counts, blocking sets, the game search, and the `flow` mechanic (moves, hints, rendering, wiring) |
| `dist/families/flow/flow.css` | Route colours and dashes, roadblocks, the leak and the game; imports the shared graph board styles |
| `dist/families/flow/flow.json` | The pack: 12 puzzles, 1 family and 4 sources, merged at load through `dist/families.js` |
| `dist/graph-board.js`, `dist/graph-board.css` | The shared graph board (drawing, taps, keys and drag strokes), described in [graph-board.md](../graph-board.md) |
| `scripts/build-flow.mjs` | Authoring list and maps; computes each best count and game winner and writes `flow.json` |
| `scripts/validate-flow.mjs` | Independent max flow with a route decomposition and residual cut; checks that no smaller set of roadblocks stops everything; plays each witness from an empty board; checks over-blocked boards, stuck starts, hint chains from fresh, trap and messy boards, illegal moves, forged saves and both games; run by `npm run build` |
| `tests/flow.test.mjs` | Routes, roadblocks, the solve, hints, Undo, saves, the game and rendering |
| `tests/graph-board.test.mjs` | The shared board's geometry, drawing and controls |
| `scripts/flow-browser-smoke.mjs` | Plays the shortcut, a stuck start and the game through real taps, keys, mouse drags and (with `TEST_PHONE=1`) touch slides |

To change a puzzle, edit `scripts/build-flow.mjs`, then run `node scripts/build-flow.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children find the **Roadblocks** tool without help, or try to block by drawing; whether a child who is stuck at fewer routes thinks to clear one (puzzles 2, 9 and 10), or treats stuck as finished; and whether K–1 children can slide along a route on a phone, or need taps.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** Counting all best packings, the worksheet's route table and the written proof that k roadblocks force at most k routes stay on paper, as the review card advises.
- **Roadblock game on more maps.** The extension "find a map where every first move wins" is a grown-up note, not a puzzle, because the app has no map editor (no make-a-puzzle editors until that is decided).
