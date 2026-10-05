# Road detours

October 5, 2026. Ten puzzles and a playground built from Week 39 of the Bellingham math circle (road detours). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. The Week 39 worksheets have not been piloted either; their [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-39.md) asks for worksheet fixes that don't affect these puzzles. The three maps are the worksheet's tree, ring and two rings; the trips and targets are new except where a puzzle's `provenance` says otherwise.

## The mathematics

A **trip** is a list of steps along the roads of a fixed map, each from one dot to the next. Two steps **cancel** when they go along the same road there and straight back; the dot between them is a **turning point**. Cancelling takes out both steps and keeps the rest in order, so the start and the end never change.

- **Unique shortest form.** However the turning points are cancelled, a trip ends at the same trip with no turning point, its reduced form. Each cancellation shortens the trip by two, so the process stops; a stack that reads the steps left to right, dropping a step when it undoes the one before, gives an invariant normal form. Puzzles 1 and 2 let a child cancel in any order; in puzzle 2 a new turning point appears only after another is cancelled.
- **Trees.** On a map with no loop, every trip between two dots shortens to the one route that never turns back, so every trip home shortens to staying put. The farthest dot of a trip home is entered and left along the same road, and that pair cancels. Puzzles 3 and 4.
- **One ring.** A shortened trip on a ring never turns back, so it keeps going one way, and a trip home keeps whole turns: 0, 4 or 8 steps on the 4-dot ring with at most 8 steps (puzzle 6, five routes), 2 or 6 steps from A to the far side C (puzzle 8, four routes). Counting turns forward minus turns back settles everything; the loops of a ring are the integers.
- **Two rings joined at a point.** Here order matters. Left then right (H→A→B→H→C→D→H) and right then left are different shortened trips. A trip that goes round each ring once each way, left, right, left back, right back, has no turning point at all, so it loses no steps although every road is used once each way (puzzle 10: 8 of the 216 such trips; the other 208 vanish). Equal counts each way don't decide whether a trip vanishes. These are reduced words in the free group on two letters, and the surviving trip is the commutator a b a⁻¹ b⁻¹.
- **Limits.** The open middles of the rings are holes, not faces: a trip can't slide across them, cancel steps that aren't next to each other, or swap the order of two turns. Trips may revisit dots and roads.

Experiments come first: a child walks a trip, presses Shorten and cancels turning points, then sees what is left. The conjectures (trips home on the tree always vanish; a ring trip keeps whole turns; order matters on two rings) come from building trips that meet a goal. The explanations, such as the farthest-dot argument, the stack proof of uniqueness and why counting turns fails on two rings, are grown-up conversations in each puzzle's notes. The worksheet's written proofs (grades 4–5 Problems 2–4) stay on paper.

## Where they appear

**Puzzles → Road detours** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)) and the shared graph board ([graph-board.md](../graph-board.md)). The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard, plus a playground with all three maps.

| # | Puzzle | Kind | Map | Answer | Week 39 source |
|---|---|---|---|---|---|
| 1 | Back and forth | Shorten | Tree | A→B→D→E | Problem 1, first trip |
| 2 | Detours inside detours | Shorten | Tree | C→B→D→F; a turning point appears | K–1 Problem 5, with nested detours |
| 3 | Every road and home | Make, 12 steps, every road | Tree | Any of 48 trips; all vanish | 2–3 and 4–5 Problem 2 |
| 4 | Only one way | Find every route, 7 steps C to F | Tree | 1 route (21 trips) | 4–5 Problem 3 |
| 5 | Once around | Make, 8 steps, shortens to A→B→C→D→A | Ring | 28 of 128 trips | K–1 Problem 6, with a target |
| 6 | Every ring trip | Find every route, 8 steps home | Ring | 5 routes | 2–3 Problem 3, K–1 Problem 6 |
| 7 | Never turn back | Make, 12 steps, both rings, loses no steps | Two rings | 104 of 27,624 trips | 2–3 Problem 6 |
| 8 | Halfway round | Find every route, up to 6 steps A to C | Ring | 4 routes | K–1 Problem 7 |
| 9 | Both ways round | Make, 9 steps, left ring once each way, loses no steps | Two rings | 4 of 36 trips | New, toward 4–5 Problems 5–6 |
| 10 | Each road both ways | Make, every road once each way, loses no steps | Two rings | 8 of 216 trips | 4–5 Problems 5 and 6 |

The worksheets are in [math-circle-worksheets, week 39](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-39). Each puzzle's `provenance` names its problem.

## How a puzzle plays

- **Walking.** The pawn (a pine dot) starts at the start, ringed on the map. Tap a dot next to the pawn, or a road it stands on, to take a step; a finger can also slide from dot to dot. Roads used one way turn sage, roads used both ways pine. Beads count the steps against the limit, which can't be passed. On a road that is to be used once each way, the same direction can't be taken twice. Undo takes a step back.
- **The trip row.** Below the map, the trip is a row of dots joined by arrows, ending at the pawn.
- **Shorten.** **Shorten** checks the trip against the goal's rules and says the first one it misses ("End at F.", "Take 8 steps.", "Use every road.", "Use both rings.", "Go round the left ring once each way."). When the trip is to lose no steps and has a turning point, that turning point is marked instead. Otherwise the trip is kept, walking stops, and the dots in the row become buttons.
- **Cancelling.** Tap a turning point, a dot with the same dot on both sides, to cancel the steps into and out of it. Other dots do nothing. When no turning point is left, the puzzle is solved if what is left meets the goal; otherwise "It shortens to a different route." or "Some steps are left." appears with **New trip**.
- **Find every route.** Each shortened trip joins a row of routes found, or "Found already" marks the copy. **New trip** starts again; **That’s all** says "There is another." until the row is complete. There are no empty slots and no count. Undo keeps the row.
- **Shorten puzzles** (1 and 2) start with the trip already made; only cancelling is possible.
- **The playground** has the tree, the ring and the two rings. Walking and cancelling mix freely, with up to 16 steps.
- **Hints** continue the child's own trip whenever it can still meet the goal (a depth-first search over the remaining steps), then press Shorten, then cancel the first turning point. A trip that can no longer work is a dead end that Undo leaves. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: steps along roads from the pawn, within the step limit and the each-way rule; no walking while shortening; cancelling only at turning points; no Shorten on an unchanged trip that was just answered; New trip only after a shortening ends; nothing after a solve.
- Saved boards are checked: the trip follows roads from the start; a kept trip meets the goal's rules; the current trip can be reached from the kept one by cancelling (each kept step matched in order, with every stretch between matched steps shortening to nothing); every found route is a distinct possible result; an answer on the board is the one the app would give.
- Every count in the notes is computed by `scripts/build-detours.mjs` with the mechanic's search, and checked again by `scripts/validate-detours.mjs` with a plain enumeration of walks and a stack of signed road steps.

## Files

| File | Contents |
|---|---|
| `dist/families/detours/detours.js` | Trips, turning points, shortening, reachability, the goal's rules, every trip that fits and its results, the search behind hints, and the `detours` mechanic (moves, hints, rendering, wiring) |
| `dist/families/detours/detours.css` | The pawn and used roads, the trip row, step beads, routes found and the playground's map buttons; imports the shared graph board styles |
| `dist/families/detours/detours.json` | The pack: a playground, 10 puzzles, 1 family and 3 sources, merged at load through `dist/families.js` |
| `scripts/build-detours.mjs` | Authoring list and maps; checks every count in the notes and writes `detours.json` |
| `scripts/validate-detours.mjs` | Every order of cancelling for the shorten puzzles; a stack reduction of signed road steps; plain enumeration of every walk for the counts and the routes; witnesses through moves; a miss and its answer; collecting every route with a repeat and an early That's all; hint chains from fresh and wandering boards; illegal moves and forged saves; run by `npm run build` |
| `tests/detours.test.mjs` | Shortening, reachability, Shorten and its answers, turning points in trips that lose no steps, each-way roads, collecting and Undo, the playground, hints, saves and rendering |

To change a puzzle, edit `scripts/build-detours.mjs`, then run `node scripts/build-detours.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children see a turning point in the row of dots without help, or need a grown-up to point at the first one; whether the find-every-route puzzles (4, 6, 8) feel like exploring or like guessing when to press That’s all; and whether the two-ring goals in puzzles 9 and 10 can be read and kept in mind, or need a grown-up to restate them.
- **Replay.** The worksheet replays a trip with a pawn; here the pawn jumps to the end of each step and the row keeps the order. A replay animation could help the youngest.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** The worksheet's written proofs of uniqueness and of the tree theorem stay on paper, as does the bonus packet's torus, where faces let trips slide.
