# Bridge Courier: Islands

October 17, 2026. These are eleven puzzles built from Week 10 of the Bellingham math circle (bridges and one-stroke walks). They form a group inside Bridge Courier, below its Easy, Medium and Hard levels. They are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 10 packets are unpiloted.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-10.md) keeps Bridge Courier. Its Decision (October 10) asks for this group:

- **Where can it start.** Tap every island that works, or "No walk", then Done. The odd islands are lit as the certificate.
- **Add a bridge.** Half the odd islands certify the fewest.
- **The three-arm star.**

The same pass changes the base family and the shared graph board:

- **The dead end.** "This route cannot finish within the rules" now waits behind Hint.
- **Double bridges.** Towns can draw them, so Königsberg appears as it is.

The packet's source was last changed on October 6, before the card, so the group is built from the packet the card reviewed.

## The mathematics

A town is islands joined by bridges, and two islands may have more than one bridge between them (a multigraph). A walk starts on an island and crosses bridges one after another. The question is whether a walk crosses every bridge exactly once (an Euler trail), and where such a walk can start.

**Euler's theorem (1736).** Assume the town is in one piece. Then a walk over every bridge exactly once exists exactly when zero or two islands have an odd number of bridges.

- With zero odd islands, the walk can start anywhere and ends where it started.
- With two odd islands, every such walk runs from one of them to the other, and it can start only there.

The reason is a counting argument. An island in the middle of a walk is entered and left, so its bridges are used in pairs. Only the walk's two ends can use an odd number. So more than two odd islands means no walk, and this is the certificate children point at. The converse (zero or two odd islands is enough) is what the walks themselves show. Every town here is in one piece, and the validator checks that.

**Adding bridges.** A new bridge changes the parity of exactly its two ends.

- One new bridge between two of four odd islands leaves two odd islands, so a walk exists. A new bridge with an even end leaves four, so no walk.
- For a walk that ends where it started, every island must be even. Each odd island needs a new bridge end, and a bridge has two ends. So the fewest new bridges is half the number of odd islands, and pairing them in any way achieves it.
- Königsberg has degrees 5, 3, 3 and 3. It has no walk, and it needs two new bridges for a walk that comes back.

**Repeating instead of building (route inspection).** A delivery route must cross every bridge at least once and come back. Repeats run along existing bridges, so a repeat that fixes two odd islands far apart costs a whole path.

- A dead end's bridge is crossed in and out, so it is repeated whatever the route.
- The three-arm star therefore needs 3 repeats, one for each dead end. That is not the 2 that half its four odd islands would suggest.
- This is the Chinese postman problem (Edmonds and Johnson, 1973). Its general answer pairs the odd islands along shortest paths. The group uses only the star's dead-end argument.

**Experiments, conjectures and explanations.** Children experiment by walking: counters disappear as bridges are crossed, and walks get stuck. The conjectures come from where walks end and from refusals. The ends are the islands with an odd number of bridges, a new bridge must reach the troubled islands, and dead ends force repeats. The explanation (bridges used in pairs, a walk has two ends, a bridge has two ends) is in each puzzle's grown-up notes. Children supply it by tapping the islands that certify a claim, and the board shows the bridge counts once the puzzle is solved. Week 10's written explanations (2–3 P6, 4–5 P4, P6, P9 and P11) stay on paper.

## Where they appear

**Puzzles → Bridge Courier → Islands** is a group on the family seam ([Adding a family](../ADDING-A-FAMILY.md), "A group inside an existing family"). It uses `libraryFamily: "route"` and `group: "Islands"`. It has its own mechanic, `islands`, so Next puzzle walks through the group alone. It has no symbol of its own; it sits under Bridge Courier's ♧. The puzzles are grade-free (`band: "all"`), and there is no playground.

| # | Level | Goal | Town | Answer | Week 10 source |
|---|---|---|---|---|---|
| 1 | Easy | Where can it start | Two islands, three bridges | A and B | K–1 P3 town 2, asked as P2 |
| 2 | Easy | Where can it start | A=B (double), B–C | B and C | K–1 P4 town 2, asked as P2 |
| 3 | Easy | Add one bridge | Three-arm star | Any new bridge works (6 of 6) | K–1 P6 and 2–3 P4, town 1 |
| 4 | Medium | Where can it start | Two squares, doubled middle rung | All six | K–1 P4 town 3, asked as P2 |
| 5 | Medium | Where can it start | Fan: hub D, five bridges, B–E | No walk. Certificate A, C, D, F | 2–3 P2 town 1 |
| 6 | Medium | Where can it start | Ladder with two diagonals from B | D and F | 2–3 P2 town 3 |
| 7 | Medium | Add one bridge | Square with both diagonals through C | Join two corners (6 of 10 work) | K–1 P6 town 2 |
| 8 | Medium | Fewest new bridges, come back | House | 1 (B–C). Certificate B, C | 2–3 P5 town 1 |
| 9 | Hard | Where can it start | Königsberg (A=B, A=C, A–D, B–D, C–D) | No walk. Certificate A, B, C, D | 4–5 P5 |
| 10 | Hard | Fewest new bridges, come back | Königsberg | 2 (any pairing). Certificate A, B, C, D | 4–5 P5, last question |
| 11 | Hard | Delivery route, fewest repeats | Three-arm star | 3. Certificate the dead ends A, C, D | 4–5 P10 town 2 and P11 |

Islands are lettered in reading order, as the worksheet's towns are. The towns are the worksheet's own designs (`designs.py`, `towns.py`, `koenigsberg.py` in `source/week-10/src/`) redrawn on the graph board. Problems 1, 2 and 4 ask the K–1 Problem 2 question (every start) of towns the packet uses elsewhere. The packet's tracing pictures (P5, P7), building towns (K–1 P7, 2–3 P8–P9) and written explanations are not here: tracing needs a dot at every crossing, which the card flags, and building to a spec belongs with a shared graph editor.

## How a puzzle plays

**Board.** Islands are labelled dots. Bridges are roads, and double and triple bridges curve apart. A gold counter sits on every bridge not yet crossed. The token's island is ringed in pine, and walked bridges turn pine. Tools sit above the map: Walk and Color, or Walk and Bridge. Buttons sit below it: Again, No walk or Fewest, and Done or Check.

**Walking.**
1. Tap an island to put the token there.
2. Tap a bridge to cross it. Tapping the island across also works, and it takes that pair's first bridge that still has its counter.
3. A bridge without its counter can't be crossed, except in a delivery.
4. Again lifts the token and puts every counter back. Undo takes back one step.

A walk begun counts as a try once it crosses a bridge.

**Where can it start (1, 2, 4, 5, 6, 9).** A walk that picks up every counter colours the island it started on. The Color tool colours or uncolours an island by hand.
- **Done.** Done judges the coloured islands as a whole. It needs at least one walk tried, and it shows no count.
  - Wrong: "One of these can't start a walk." (a coloured island is no start) or "There is another." (one is missing).
  - Done then stays off until the colours change.
  - Right: the puzzle is solved. The odd islands, if any, are lit in pine, and every island shows its number of bridges.
- **No walk.** No walk is off until a walk has crossed a bridge, and while anything is coloured. Pressing it shows "Tap every island a walk would have to start or end on."
  - The child taps islands (ochre rings, nothing else marked) and presses Check.
  - Right: the exact set of odd islands solves, they stay lit, and the board says "A walk has only two ends."
  - Too many: "A walk can pass through one of these."
  - Too few: "There is another."
  - Where a walk exists: "There is a walk." No walk is not played back, because that would show both starts for free.
  - Any refusal clears the taps. No walk then waits for a new walk.

**Add a bridge (3, 7).** The Bridge tool starts selected.
- Tap two islands to build a new bridge (dashed), or tap a new bridge to take it away.
- After the one new bridge, the tool switches to Walk.
- A walk over every bridge, the new one included, solves.
- New bridges bend away from the town's bridges on the same pair and around islands in the way. A new diagonal across the square's middle island curves around it, and its counter moves off the road it crosses.

**Fewest new bridges (8, 10).** This works like adding bridges, up to six, but the walk must end where it started.
- Fewest is off until such a walk is on the board. Pressing it shows "Tap every island that needs a new bridge." Check judges the taps.
- More new bridges than needed: "Fewer new bridges can work."
- Wrong islands: "One of these doesn't need a new bridge." or "There is another."
- Right: solves, and the board says "A new bridge has only two ends."

**Delivery (11).** There are no tools.
- Bridges can be crossed again. A bridge crossed twice shows ×2.
- Fewest is off until the route has crossed every bridge and is back where it started. Pressing it shows "Tap every dead end."
- More repeats than needed: "Fewer repeats can work."
- Right: solves, and the board says "Each dead end's bridge is crossed twice."

**Copy.** The board shows one objective:
- "Color every island where a walk that picks up every counter can start."
- "Add one bridge, then pick up every counter."
- "Add as few bridges as you can, then pick up every counter and end where you started."
- "Pick up every counter and end where you started, crossing bridges again as few times as you can."

How to play opens with what a walk is, then gives the gestures. No title, rule or first hint says "odd", "even" or "half", or names an answer. The fewest count is never shown as a budget.

**Hints.** Before any move, the first hint is the authored nudge, such as "Try a walk from each island." or "Walk first: where do you get stuck?". It is never a claim. After that, hints name one move at a time:
- They walk a walk over every bridge from a start, then press Again.
- In a town where one start is coloured, they colour the rest and give the reason ("B and C have an odd number of bridges, and a walk over every bridge runs from one of them to the other. Color C."), then "Press Done."
- They uncolour a wrong island first.
- In a no-walk town, they walk until stuck, then give the reason with the counts before the claim ("Count the bridges: A has 5 bridges, and B, C and D have 3 each. A walk can start or end only on an island with an odd number of bridges, and it has just two ends. Press No walk, tap A, B, C and D and Check."). No hint says only "Press No walk".
- For new bridges, they take away a new bridge that doesn't help, add one between odd islands, and walk.
- For the delivery, they follow a fewest-repeat route, then give the dead-end argument with the claim.

The second level marks the island, bridge, tool or button on the board, and the third offers Apply hint. Hints alone finish every puzzle from a fresh start and after wrong moves and refused claims. They are memoised per board and timed in CPU time in the tests.

## Rules that keep the record honest

- **The certificate is the child's.** No walk and Fewest are solved only by the child's taps of the certifying islands: the odd islands, or in the delivery the dead ends. The taps are judged once on Check as an exact set. Nothing marks which islands are right. In the validator, exactly one set of islands passes in every claim puzzle: 1 of 15 in Königsberg and the star, 1 of 31 in the house, 1 of 63 in the fan. Done likewise accepts one set of coloured islands, 1 of 63 for six islands. Puzzle 1 has only two islands, so its Done is a choice among 3 sets; it is the entry puzzle, where the second start is the point.
- **Can't comes after an attempt.** No walk needs a walk that has crossed a bridge. Fewest needs a finished closed walk or route. A fresh-board claim is refused, and so is a Done before any walk.
- **Refusals are kept.** A refused No walk or Fewest records a lock: the claim waits for a new walk, counted by walks tried. A refused Done records the coloured set it judged and waits for the colours to change.
  - Undo never takes back a lock or a recorded Done.
  - Undo does take back the answer line, so every Undo visibly changes the screen; the claim stays locked.
  - Refusals print no counts.
- **Saves.** The save is the new bridges, the token's start, the bridges crossed in order, walks tried, coloured islands, the last answer, the lock, the judged colours and the accepted claim. Everything shown is derived from it.
  - Saves are checked against all of this. A walk must follow bridges, cross none twice outside a delivery, and stay within the cap of new bridges.
  - Colours are sorted and only in start puzzles. An answer must be one the board could have given.
  - A claimed solve must be true for the board, and Done needs a walk tried. A forged `done` or answer fails.
- **Moves.** Only legal moves are accepted. A bridge must join the token's island and still carry its counter (outside the delivery). New bridges must join two different islands, only in puzzles that allow them. Done, No walk and Fewest follow the conditions above.
- **Building and checking.** `scripts/build-islands.mjs` computes the answers with the mechanic's own search: memoised walks and Dijkstra over walk states. `scripts/validate-islands.mjs` checks them again by plain search over every walk, every set of new bridges and every route up to a length, and against Euler's parity rule.

## Base Bridge Courier and the board

- **The dead end.** `dist/networks.js` marks the route's dead end `quiet`. `dist/ui.js` then shows it only behind Hint: level 1 gives the text, and level 2 adds the Undo rescue. This is a general hook: any mechanic's dead-end hint may set `quiet: true`. Other dead ends still speak unasked. Route puzzle ids, saves and hints are unchanged.
- **Double bridges.** `dist/graph-board.js` gains a per-edge `bend`, drawn as a curve, and an opt-in `nearest` tap rule; see [the graph board](../graph-board.md).
  - Both are additive. Every existing graph-board family renders byte-identical boards.
  - The base route keeps its own network drawing and vertex-path saves. Königsberg's double bridges live in this group, whose saves record bridges by index.

## Files

| File | Contents |
|---|---|
| `dist/families/islands/islands.js` | Towns, bends of new bridges, walks, starts, fewest new bridges and repeats, and the `islands` mechanic: moves, claims, hints, rendering, counters, taps and keys, view state and Undo's carry |
| `dist/families/islands/islands.css` | The map (counters, walked and new bridges, coloured, token, tapped and lit islands), the tools, buttons and answer line. Scoped under `[data-mechanic-wire="islands"]` |
| `dist/families/islands/islands.json` | The pack: 11 puzzles, a family record and 3 sources. It is generated: edit `scripts/build-islands.mjs` and run `node scripts/build-islands.mjs` |
| `scripts/build-islands.mjs` | The authoring list. It computes answers and a witness for each puzzle, replays the witness, and writes `islands.json` |
| `scripts/validate-islands.mjs` | The independent checks. Brute-force walks, starts, working new bridges, fewest new bridges, fewest repeats, and Euler's rule. The drawing (every bridge clear of other islands, double bridges apart). Witnesses. Hints from fresh and after 12 random wanderings per puzzle with refusals and Undo. Claims, locks and the one passing set per certificate. Illegal moves and forged saves. Run by `npm run build` |
| `tests/islands.test.mjs` | Euler's rule on the towns, single crossings of double bridges, Done as a whole with no count, No walk and its refusals, adding and bending a bridge, Fewest refused and finished by hints, the star's repeats, CPU-timed hints, Undo, the claim view, saves, fresh and solved renders, and the quiet base dead end |
| `scripts/islands-browser-smoke.mjs` | The interface in a browser. Taps on curved roads and at contested points between bridges of one pair, a keyboard crossing, focus after moves, Done, No walk refused and certified, three A–B bridges in Königsberg, a bent new bridge, the delivery, the board's fit, and the base route's quiet dead end. `TEST_PHONE=1` runs it at 375 px with touch |
| `docs/islands/README.md` | This spec |

## Not yet done

- **Children's play.** No child has played these, and the worksheet is unpiloted. Testers should watch three things:
  - Whether children find every start by walking from each island or begin to predict from the bridges. Colour by hand makes prediction possible; walking colours automatically.
  - Whether "Tap every island a walk would have to start or end on" makes sense to a child who has walked into dead ends, or reads as a riddle. The K–1 children may need an adult to read it.
  - Whether the star delivery's 3 lands as a surprise after "half the odd islands" in puzzles 8 and 10, or whether children just tap the obvious dead ends.
- **"Tap every dead end."** The delivery's certificate names its class, so the tap is recognition. The argument is in the caption and the notes. A version that asks which bridges must be crossed twice would be harder to judge as a set.
- **A route that may end anywhere.** 4–5 P10 also asks the fewest for a route that may end anywhere (2 for the star). K4 and the arc town of P10 are not here; K4 would contrast 2 repeats with the star's 3.
- **The H town and the window.** The H town (2–3 P5 town 3) is left out, and base route-09 and route-12 already pair six odd junctions.
- **Tracing pictures.** Tracing (K–1 P5, 2–3 P7, 4–5 P7) needs a dot at every crossing, while here a crossing without a dot is not a junction. A new diagonal bent around an island crosses another road with no junction there. This is only in puzzle 7, where it is the child's own bridge, and it is untested whether that confuses.
- **Base routes.** The base routes still draw one straight road per pair. Moving them onto the graph board would let base towns have double bridges too, but it would change their saves.
- **Story.** The group is not on the Lantern Road, and it has no keeper lines.
- **Grade levels.** The puzzles are grade-free and not yet in a K–1, 2–3 or 4–5 trail. The card's K–1 entries map to puzzles 1 to 4 and 7.
