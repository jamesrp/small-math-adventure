# Two network puzzle families

Implemented app content, expanded September 23, 2026. These two mechanics have twelve playable instances each; the detailed original 01–06 are followed by the additions below. The prompts and parameter sets are newly authored adaptations of standard mathematics. They are not claims to have invented new graphs. All twenty-four are solvable, and no player has to write a proof. The hidden author certificates explain why the targets are valid.

`networks.json` is the precise content specification; every graph has an explicit vertex list and complete edge list. An edge triple is `[u, v, length]`; links are undirected. For coloring, the length field is always 1 and has no gameplay effect. Accept every valid answer. Color names are interchangeable; add shape or pattern marks to the color buttons and dots.

The first instance in each family is a short optional onboarding step. It should not become a long grade-specific trail of easy reskins. The sequence changes the mathematical structure. The difficulty labels are hypotheses for playtesting, not age cutoffs or claims of measured difficulty.

## Bridge Courier (`route`)

Move along drawn roads, without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. In the first three instances use every road exactly once. In the final three cover every road at least once, return to the marked depot, and meet the displayed minimum-distance target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Mathematical object:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Authoring:** Use named constructions and deliberate structural contrasts. Tutorial 1 can be skipped. Choose endpoints, bridges, or weights to reveal one intended decision; do not hide randomly forbidden roads. Accept every route meeting the goal.

### route-01: The little side road

**Player prompt:** Choose where to start. Walk every road exactly once. You may visit a dot again.

**Exact board:** Square A–B–C–D–A with one leaf E joined to A. Vertices: A, B, C, D, E.

Edges: A–B, B–C, C–D, D–A, A–E. Parentheses show lengths; all other roads cost 1.

**Witness:** A → D → C → B → A → E. Total cost **5**.

**Hint:** Try starting at the end of the little side road.

**Intended insight:** A dead end must be an endpoint of the whole walk; the repeated visit to A is legal.

**Prerequisites:** No reading with narration; track five used edges. **Difficulty:** Entry/tutorial; the decision is choosing a viable start, not counting a large map. Let a confident child skip it.

**Author certificate, never required from the child:** Five roads; exactly A and E have odd degree. A complete trail therefore has endpoints A and E. Witness uses every road once.

### route-02: Do the small loop before home

**Player prompt:** Start at B. Walk every road exactly once and finish back at B.

**Exact board:** A square A–B–C–D–A and a triangle A–E–F–A share just A. Vertices: A, B, C, D, E, F.

Edges: A–B, B–C, C–D, D–A, A–E, E–F, F–A. Parentheses show lengths; all other roads cost 1.

**Witness:** B → C → D → A → F → E → A → B. Total cost **7**.

**Hint:** When you reach A, take the triangle detour before using your last road home.

**Intended insight:** Splice a complete loop into a larger route; returning home too early can strand unused roads.

**Prerequisites:** Track seven used edges; no arithmetic or graph terms required. **Difficulty:** Early planning; one real choice at the shared junction can end the walk too soon. This is a loop-splicing lesson, not an enlarged path.

**Author certificate, never required from the child:** Seven roads; all degrees even. For example B–C–D–A–E–F–A–B covers all seven exactly once.

### route-03: Cross the connecting bridge at the right time

**Player prompt:** Start at C. Walk every road exactly once. You may finish at a different dot.

**Exact board:** Two triangles A–B–C–A and D–E–F–D, joined only by C–D. Vertices: A, B, C, D, E, F.

Edges: A–B, B–C, C–A, C–D, D–E, E–F, F–D. Parentheses show lengths; all other roads cost 1.

**Witness:** C → B → A → C → D → F → E → D. Total cost **7**.

**Hint:** If you cross C–D now, can you ever return to unfinished roads on the left?

**Intended insight:** A bridge separates two regions: finish the departing side before the unique crossing.

**Prerequisites:** Track seven edges; plan which region to finish first. **Difficulty:** Planning; the tempting first move C→D loses immediately despite looking locally legal. Same edge count as instance 2, different insight.

**Author certificate, never required from the child:** Seven roads; odd vertices C,D force endpoints. The bridge can be crossed only once, after servicing the left triangle and before servicing the right.

### route-04: Three corridors, one depot

**Player prompt:** Start at S. Travel every road at least once and return to S in 8 steps. Roads can be repeated.

**Exact board:** Three internally disjoint length-two paths S–A–T, S–B–T, S–C–T (a subdivided three-edge theta graph). Vertices: S, T, A, B, C.

Edges: S–A, A–T, S–B, B–T, S–C, C–T. Parentheses show lengths; all other roads cost 1.

**Witness:** S → C → T → C → S → B → T → A → S. Total cost **8**.

**Hint:** You will have used three corridors to reach the far end. Which corridor will get you home?

**Intended insight:** Repetition is now allowed because the destination is a shortest closed delivery tour, not an Euler trail. One entire corridor must be repeated.

**Prerequisites:** Count to 8; distinguish used-once from used-again roads. **Difficulty:** Optimization entry; identify a necessary return trip instead of searching for an impossible six-step closed route.

**Author certificate, never required from the child:** Base length 6. S,T are odd. Extra traversals must connect them; their distance is 2, so minimum cost 8. Duplicating any one corridor attains it.

### route-05: Ladder delivery

**Player prompt:** Start at A. Cover every road and return to A in 12 steps. Every road costs 1 step.

**Exact board:** The ordinary ladder graph with top rail A–B–C–D, bottom rail a–b–c–d, and four aligned rungs. Vertices: A, B, C, D, a, b, c, d.

Edges: A–B, B–C, C–D, a–b, b–c, c–d, A–a, B–b, C–c, D–d. Parentheses show lengths; all other roads cost 1.

**Witness:** A → a → b → B → b → c → C → c → d → D → C → B → A. Total cost **12**.

**Hint:** The four middle junctions each have three roads. Try repeating the two middle rungs.

**Intended insight:** Repair odd degrees in pairs; two well-chosen repeats beat treating every road as an out-and-back errand.

**Prerequisites:** Count to 12; coordinate four junctions and undo route choices. **Difficulty:** Intermediate optimization; either pair the middle junctions vertically or horizontally. Both natural optimal plans are accepted.

**Author certificate, never required from the child:** Base length 10; B,C,b,c are odd. One extra edge changes degree parity at two ends, so at least two repeats are necessary. Repeating B–b and C–c attains 12.

### route-06: Choose the roads to repeat

**Player prompt:** Start at A. Cover every road and return to A with total distance 22. Each traversal costs the number written on its road, including repeats.

**Exact board:** Complete graph on four junctions: every pair has a road. Road lengths AB=1, AC=2, AD=3, BC=3, BD=2, CD=7. Draw D inside triangle ABC so every junction is unambiguous. Vertices: A, B, C, D.

Edges: A–B, A–C (2), A–D (3), B–C (3), B–D (2), C–D (7). Parentheses show lengths; all other roads cost 1.

**Witness:** A → C → A → B → D → B → C → D → A. Total cost **22**.

**Hint:** Plan both extra connections before committing to repeating the cheapest road. Long roads still need one delivery.

**Intended insight:** Pairing odd junctions is a global choice. Selecting AB as a repeated connection leaves an expensive extra connection between C and D. Starting the route along AB can still be optimal; the choice here is which roads to repeat. Shortest extra connections may use multiple roads.

**Prerequisites:** Add small positive lengths up to 22; compare complete plans. **Difficulty:** Stretch; six roads suffice to create a genuine optimization trap. The weights distinguish choosing both extra connections together from selecting the cheapest extra connection first, with no legal-road exclusions.

**Author certificate, never required from the child:** Base cost 18. All four junctions are odd. Shortest pairing costs AB + CD = 1 + 5 = 6, AC + BD = 2 + 2 = 4, AD + BC = 3 + 3 = 6. Minimum augmentation 4 yields 22; repeating AC and BD attains it. Selecting AB as an extra connection leaves C and D paired at shortest distance 5, hence augmentation 6. This concerns extra traversals, not the order in which the required roads are first visited.

### Source lineage

- [Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md): Euler-trail and route-inspection progression, adapted to app completion tasks.
- [One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex): Dead ends, cycle splicing, odd-vertex pairing; new maps or new parameters below.
- [Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html): Undergraduate Euler criterion and cycle-splicing construction.

## Neighbor Lanterns (`color`)

Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Mathematical object:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Authoring:** One optional path tutorial, then changes in structure rather than larger checkerboards. The six instances are a sequence of reusable ideas, not a promise that each will take longer than the preceding one. Test completion and recoloring behavior with children.

### color-01: A line of lanterns

**Player prompt:** Color all five lanterns with the two colors. Linked lanterns must differ.

**Exact board:** Path A–B–C–D–E. Vertices: A, B, C, D, E.

Edges: A–B, B–C, C–D, D–E.

**Witness:** color 1: B, D; color 2: A, C, E. Minimum palette: **2**.

**Hint:** Try alternating the two colors.

**Intended insight:** Two-coloring propagates along a path. This teaches the interaction, not the main difficulty.

**Prerequisites:** Distinguish two colors or shape patterns; no reading or counting. **Difficulty:** Optional tutorial, deliberately easy. Do not fill a grade trail with resized copies of it.

**Author certificate, never required from the child:** Any edge forces two colors; alternating is a witness.

### color-02: Closing the necklace

**Player prompt:** Color the five-lantern ring using these three colors. Linked lanterns must differ.

**Exact board:** Cycle A–B–C–D–E–A. Vertices: A, B, C, D, E.

Edges: A–B, B–C, C–D, D–E, E–A.

**Witness:** color 1: A, C; color 2: B, D; color 3: E. Minimum palette: **3**.

**Hint:** Remember that the last lantern is also linked to the first.

**Intended insight:** An odd loop breaks perfect alternation; reserve a third color for the closure.

**Prerequisites:** Notice the closing edge; willing to recolor. **Difficulty:** Early; introduces a global closure decision after the tutorial. Three colors allow several answers, all accepted.

**Author certificate, never required from the child:** With only two colors, alternating around five edges returns the wrong color to the start. Three colors suffice.

### color-03: The hub needs a color

**Player prompt:** Color the square and its center using three colors. Each spoke and rim link joins different colors.

**Exact board:** Wheel with rim A–B–C–D–A and hub H linked to every rim vertex; rim size 4. Vertices: A, B, C, D, H.

Edges: A–B, B–C, C–D, D–A, A–H, B–H, C–H, D–H.

**Witness:** color 1: H; color 2: A, C; color 3: B, D. Minimum palette: **3**.

**Hint:** Set a color aside for the center, then color the rim.

**Intended insight:** The hub must avoid every rim color, so the rim has to share colors strategically.

**Prerequisites:** Coordinate the four rim dots with the center. **Difficulty:** Early planning; freely using all three colors on the rim can block the center. Coloring the center first turns the remaining rim into a two-color task.

**Author certificate, never required from the child:** A hub and two adjacent rim vertices form a triangle, forcing 3. Alternating the even rim with colors 1 and 2 leaves 3 for H.

**Verified decision point:** `A=1; B=2; C=1; D=3` obeys every currently colored link but cannot extend to a complete coloring with this palette. The rim uses all three colors, leaving none for H. These are example player choices, not prefilled clues or extra rules.

### color-04: One more corner changes the wheel

**Player prompt:** Color the pentagon and its center using four colors. Each spoke and rim link joins different colors.

**Exact board:** Wheel with rim A–B–C–D–E–A and hub H linked to every rim vertex; rim size 5. Vertices: A, B, C, D, E, H.

Edges: A–B, B–C, C–D, D–E, E–A, A–H, B–H, C–H, D–H, E–H.

**Witness:** color 1: H; color 2: A, C; color 3: B, D; color 4: E. Minimum palette: **4**.

**Hint:** First solve the five-lantern rim. The center touches every rim lantern.

**Intended insight:** Combine two earlier ideas: the odd rim needs three colors, and the hub needs another.

**Prerequisites:** Recall odd-ring closure; coordinate center and rim. **Difficulty:** Structural contrast, not a size ramp: one added rim vertex changes the necessary palette from 3 to 4. Still short; advance quickly if solved immediately.

**Author certificate, never required from the child:** The odd rim needs 3 colors. Its universal hub cannot use any rim color, forcing 4. An odd-cycle coloring plus a new hub color attains 4.

**Verified decision point:** `A=1; B=2; C=1; D=3; E=4` obeys every currently colored link but cannot extend to a complete coloring with this palette. The rim uses all four colors, leaving none for H. These are example player choices, not prefilled clues or extra rules.

### color-05: Two neighbors each way

**Player prompt:** Color the eight-lantern ring with four colors. Every drawn link must join different colors. Links reach the next lantern and the one after it in each direction.

**Exact board:** Square of the 8-cycle: labels 1…8 clockwise; link labels whose circular distance is 1 or 2. No other links. Vertices: 1, 2, 3, 4, 5, 6, 7, 8.

Edges: 1–2, 1–3, 2–3, 2–4, 3–4, 3–5, 4–5, 4–6, 5–6, 5–7, 6–7, 6–8, 7–8, 7–1, 8–1, 8–2.

**Witness:** color 1: 1, 4; color 2: 2, 6; color 3: 3, 7; color 4: 5, 8. Minimum palette: **4**.

**Hint:** Any three consecutive lanterns need three different colors. Watch what happens when your pattern meets itself around the ring.

**Intended insight:** A local three-color pattern can fail globally. Uniform longer-range adjacency creates the challenge, rather than arbitrary forbidden pairs.

**Prerequisites:** Trace next-nearest links and coordinate a whole ring; no arithmetic required if links are drawn. **Difficulty:** Intermediate/stretch; decisions interact two positions ahead and across the closing seam. A repeated block of four colors works; many other valid colorings are allowed.

**Author certificate, never required from the child:** Every three consecutive vertices form a triangle. With only 3 colors, each next color is forced to repeat the color three positions earlier. That period cannot close on length 8. Pattern 1,2,3,4,1,2,3,4 is valid, so the minimum is 4.

**Verified decision point:** `1=1; 2=2; 3=3; 4=1; 5=2` obeys every currently colored link but cannot extend to a complete coloring with this palette. This legal five-dot prefix has no completion with four colors; later links across the seam force a recoloring. These are example player choices, not prefilled clues or extra rules.

### color-06: Pentagon and star

**Player prompt:** Color all ten lanterns with three colors. Every link joins different colors. Line crossings have no lantern and do not add connections.

**Exact board:** Petersen graph: outer pentagon o0–o1–o2–o3–o4–o0; inner star links i0–i2–i4–i1–i3–i0; five matching spokes oj–ij. Vertices: o0, o1, o2, o3, o4, i0, i1, i2, i3, i4.

Edges: o0–o1, o1–o2, o2–o3, o3–o4, o4–o0, i0–i2, i1–i3, i2–i4, i3–i0, i4–i1, o0–i0, o1–i1, o2–i2, o3–i3, o4–i4.

**Witness:** color 1: o0, o2, i1; color 2: o1, o3, i0, i4; color 3: o4, i2, i3. Minimum palette: **3**.

**Hint:** The inside is also a five-lantern loop, just drawn as a star. Color both loops while watching their five spokes.

**Intended insight:** Two odd loops can share three colors, but their colorings must agree with all matching spokes. This is a compact graph with interacting global choices.

**Prerequisites:** Track connections through a crossing drawing; revise several colors when necessary. **Difficulty:** Stretch; ten vertices give coupled cycles and real backtracking without a large board or extra rule types. The drawing must make non-junction crossings clear.

**Author certificate, never required from the child:** The outer 5-cycle rules out 2 colors. The stored 3-color assignment checks every one of 15 links, hence the minimum is 3. It is vertex coloring; the separate Petersen edge-coloring problem is not being claimed here.

**Verified decision point:** `o0=1; o1=2; o2=1; o3=2; o4=3; i0=3; i1=1` obeys every currently colored link but cannot extend to a complete coloring with this palette. The outer ring and two inner colors are locally legal, but no choice for the remaining inner dots can satisfy all links with three colors. These are example player choices, not prefilled clues or extra rules.

### Source lineage

- [Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md): Local source proposes neighbor coloring and smallest sufficient palette; its cited JRMF PDF was not independently read for this catalog.
- [Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html): Definition of proper vertex coloring and applications.
- [Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html): Chromatic number, bipartite and odd-cycle examples, and the Petersen graph; our witnesses independently verified.

## What Week 3 says about the existing Cup Swaps mechanic

The [Week 3 redesign](/Users/jamespfeiffer/math-circle/plans/week-03-redesign.md), sections “The mathematical destination” and “Exact keys, constructions, and proof,” and [upper worksheet, page 3, Tasks 5–6](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-03/week-03-grades-4-5.tex) investigate permutations through repeated bijections, disjoint cycles, and compositions. Its two overlapping swaps produce different outcomes when reversed; disjoint swaps commute; undoing a sequence requires reversing its order. Those are facts actually developed in the source. The new authoring recommendations below adapt those ideas to the app's sorting task; they are not quotations or a claim that Week 3 already contains the app's campaigns.

- **Any pair of positions:** choose starts with deliberately different cycle structures. Sorting a permutation of `n` distinct cups takes `n − c` arbitrary swaps when `c` counts all cycles, including fixed cups: one swap can increase the cycle count by at most one, and splitting each nontrivial cycle attains the bound. Use that as an internal authoring target if an instance asks for shortest play.
- **Adjacent positions only:** introduce this as cups on a row whose neighbors may exchange. Now the important quantity is inversions: each adjacent swap changes the inversion count by one, and repeatedly correcting inverted neighbors reaches the target in exactly that many swaps. A distant exchange that was easy in free-swap play now has to pass through the row. This restriction has a clean reason and an intended insight.
- **One fixed hub:** every swap must involve the marked table position. For target `A B C`, start `A C B` and use hub position 1. The three moves `(1,2), (1,3), (1,2)` solve it. The already-correct A has to move temporarily; a peripheral exchange can be simulated through the hub. This is a meaningful contrast with unrestricted play, which needs only `(2,3)`. Do not describe the rule as involving “cup A” if the restriction is actually on its initial position.
- **Two fixed hubs:** allow exactly the union of the two stars: a swap is legal iff at least one endpoint is one of the two marked positions. Pick a start that makes using the second hub helpful; compare the same start with a one-hub version before generating many such instances. Do not silently remove some spokes.
- **Adjacent on a ring:** display the wraparound adjacency explicitly. This is a distinct geometry from a row; a cup can travel around either side. Choose a start where the shorter direction or interaction of routes matters. Do not reuse the row inversion count as an optimum certificate on a ring.

A move limit is a natural optimization goal only when the minimum is checked. Save a shortest witness, and search all legal swaps for that fixed natural move graph. Do not randomly select forbidden pairs to manufacture difficulty. For the MVP, keep these as authoring guidance for the existing mechanic, not an eleventh new family and not a proof-writing feature.

## Verification

Run `python3 docs/puzzle-expansion/verify_networks.py` from the app directory. It uses only the Python standard library. It checks graph validity, all route/color witnesses, every stated route cost, all odd-vertex lists and weighted pairing costs, and every minimum palette. Four later coloring boards also have exhaustively checked examples of locally legal player choices that force recoloring, demonstrating actual decisions in the required solve. The route optima are found independently with Dijkstra on `(current vertex, serviced-edge mask)`, without using the parity certificates. Coloring search exhaustively rejects every palette smaller than the claimed optimum. The twelve success conditions are exact; the proposed difficulty remains a playtesting question.


## Additional instances 07–12 — September 23, 2026

These are implemented alongside 01–06. See [the difficulty expansion](difficulty-expansion.md) for criteria and source boundaries, and [the complete review](../PUZZLES.md) for exact starting data and witnesses.

### Bridge Courier additions

| ID | Level | Insight |
|---|---|---|
| `route-07` | Medium | An Euler trail can revisit junctions while using each road once; the endpoints are forced by degree parity. |
| `route-08` | Medium | Returning home early can strand a whole loop; splice all three cycles into one closed walk. |
| `route-09` | Hard | Six odd vertices require at least three extra crossings; a matching attains the bound on this prism. |
| `route-10` | Hard | Repeated connections can be paths through even junctions, not just roads between odd junctions. |
| `route-11` | Hard | The shortest parity repair can use two roads even when a direct road exists. Required coverage and cheapest repeats are different choices. |
| `route-12` | Hard | Weighted six-vertex matching combines parity with shortest-path costs; an optimal augmentation must be planned globally. |

### Neighbor Lanterns additions

| ID | Level | Insight |
|---|---|---|
| `color-07` | Medium | Two even cycles must use compatible phases across their matching links. |
| `color-08` | Medium | Color names may be permuted on one component, but the connecting links constrain that permutation. |
| `color-09` | Hard | With three colors on the octahedral graph, each nonadjacent opposite pair must share a color. |
| `color-10` | Hard | A three-color repeating pattern clashes when wrapped around seven positions; a fourth color must be placed to satisfy both seam links. |
| `color-11` | Hard | Independent sets are small and must be chosen together. Coloring the complement of an odd cycle becomes a covering by neighboring pairs and a singleton. |
| `color-12` | Hard | Copying each cycle vertex’s neighbors and adding a common neighbor forces a fourth color even though there is no triangle. The complete graph is small enough to check by search. |

