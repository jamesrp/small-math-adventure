# Three motion and transformation families

These implemented families each have twelve instances. This document details the original 01–06, followed by the 07–12 additions below. Every core task is solvable and finishes with a concrete pattern, prediction, or setting; no proof or adult discussion is required. The first one or two instances are rule introductions, not claims of sustained difficulty. Grade placement should follow playtesting.

All named worksheets and redesign notes below were read locally. Their undergraduate/research descriptions are the provenance for the connections; this document does not claim independent consultation of the external papers. Direct worksheet instances and new app adaptations are labeled separately.

Machine-readable instances: [motion.json](/Users/jamespfeiffer/business/small-math-adventure/docs/puzzle-expansion/motion.json). Verification: `python3 docs/puzzle-expansion/verify_motion.py` from the app folder. The checker uses BFS for toggle minima, direct orbit simulation for clocks, and exact rational wall collisions for billiards. Its billiard method is independent of the unfolded-lattice calculation used to author the answer paths. No app files or shipped puzzles are changed.

## Lantern Wires (`toggle`)

**Child-facing launch:** Tap a wire to change BOTH lanterns at its ends: bright becomes dark and dark becomes bright. Make the picture on the goal card.

**Prerequisites:** Entry: distinguish bright/dark and follow a two-object change; no reading or arithmetic beyond counting four. Later: compare current state with a target, follow paths, count a budget up to four, and plan interacting moves. Rough entry K–1, later instances often 2–3 or 4–5; placement should follow observed strategy.

**The mathematical object:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Uniform rules:**

1. A board is a graph: lanterns are vertices and every drawn wire is a legal move.
2. Pressing a wire flips both endpoint states. It never moves a lantern.
3. The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
4. Instances 3–12 have a displayed press budget; this is part of completion, not a bonus. Reset/undo is always available. Count presses in the final submitted replay.
5. Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Natural variation:** Use a whole cycle, a complete binary tree, or every nearest-neighbor edge of a rectangular grid. Vary target patterns to expose endpoint cancellation, complements around a cycle, forced leaf decisions, and pairing choices.

**Authoring guardrail:** Do not make arbitrary switch subsets or special lamp exceptions. The graph comes from a named geometry; every edge uses the same rule. Do not call a target challenging just because it has more lamps. A budget should expose a specific alternative that fails, not conceal an unmotivated numerical restriction.

**Depth assessment:** Strong candidate. The entry pair is intentionally brief. Later wins require repairing a mismatch set, choosing a shorter cycle solution, or avoiding a locally attractive pairing. Rings alone have limited replay depth once their two complementary solutions are understood; trees and full grids are deliberate structural changes.

### Six concrete instances

#### toggle-01 — Two neighbors

**Prompt and goal:** On 4 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 2 bright.

**Board:** `cycle`. Legal wires: 1–2, 2–3, 3–4, 4–1. All unlisted initial/target lamps are dark.

**Canonical solution:** Press 1–2. The minimum is **1 press** (informational only; there is no budget on this introduction).

**One-step hint:** Find the wire that touches both goal lanterns.

**Substantive idea:** One edge is one simultaneous two-state change.

**Why this step changes the thinking:** A one-move tutorial; immediately skip it once the rule is clear.

**Source/adaptation:** Direct source target, reworded for an app. References: T-K.

#### toggle-02 — Across the ring

**Prompt and goal:** On 4 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 3 bright.

**Board:** `cycle`. Legal wires: 1–2, 2–3, 3–4, 4–1. All unlisted initial/target lamps are dark.

**Canonical solution:** Press 1–2, then 2–3. The minimum is **2 presses** (informational only; there is no budget on this introduction).

**One-step hint:** Try a path from 1 to 3; watch what happens to the lamp in the middle.

**Substantive idea:** Two flips at the intermediate vertex cancel.

**Why this step changes the thinking:** The shortest solution temporarily lights a lamp that must finish dark.

**Source/adaptation:** Direct source target, reworded for an app. References: T-K, T-M.

#### toggle-03 — Repair the picture

**Prompt and goal:** On 5 lanterns in a ring, numbered clockwise: Only 1, 2 start bright. Make only 2, 3, 4, 5 bright. Use at most 2 wire presses.

**Board:** `cycle`. Legal wires: 1–2, 2–3, 3–4, 4–5, 5–1. All unlisted initial/target lamps are dark.

**Canonical solution:** Press 3–4, then 5–1. The minimum is **2 presses**, matching the required budget.

**One-step hint:** Which lamps differ between the starting picture and the goal?

**Substantive idea:** The relevant target is the symmetric difference of start and goal; already-correct lamps need no net change.

**Why this step changes the thinking:** The starting picture is nonempty. A child must reason about ON-to-OFF as well as OFF-to-ON; counting desired bright lamps is insufficient.

**Source/adaptation:** New initial/target pair built from the source binary-incidence model. References: T-F, T-R.

#### toggle-04 — Take the other way

**Prompt and goal:** On 7 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 3, 5, 7 bright. Use at most 3 wire presses.

**Board:** `cycle`. Legal wires: 1–2, 2–3, 3–4, 4–5, 5–6, 6–7, 7–1. All unlisted initial/target lamps are dark.

**Canonical solution:** Press 3–4, then 4–5, then 7–1. The minimum is **3 presses**, matching the required budget.

**One-step hint:** The wire from 7 back to 1 is as real as every other wire.

**Substantive idea:** The two reduced solutions on a cycle are complements. Pairing 1 with 3 and 5 with 7 takes four presses; pairing 7 with 1 and 3 with 5 takes three.

**Why this step changes the thinking:** A tempting four-press solution fails the required budget; the win comes from changing the pairing around the ring, not from the extra two lamps.

**Source/adaptation:** New ring target and mandatory budget; source supplies the complementary-cycle method. References: T-U, T-F.

#### toggle-05 — Branches can cancel

**Prompt and goal:** On a family tree: R above A/B, A above C/D, B above E/F: All lanterns start dark. Make only R, C, D, E bright. Use at most 4 wire presses.

**Board:** `complete_binary_tree_depth_2`. Legal wires: R–A, R–B, A–C, A–D, B–E, B–F. All unlisted initial/target lamps are dark.

**Canonical solution:** Press A–C, then A–D, then B–E, then R–B. The minimum is **4 presses**, matching the required budget.

**One-step hint:** Start at a bottom lantern: it has only one wire that could change it.

**Substantive idea:** Leaf requirements force moves upward. The two C/D paths cancel at A; the R–A wire is not needed.

**Why this step changes the thinking:** The topology changes from a loop with a global alternative to a tree with forced local choices. R must be lit without disturbing the already-balanced A branch.

**Source/adaptation:** New complete-binary-tree instance applying the source tree rule. References: T-F.

#### toggle-06 — A tempting pair

**Prompt and goal:** On two straight rows A–B–C–D and E–F–G–H, with four vertical wires: All lanterns start dark. Make only A, B, C, H bright. Use at most 3 wire presses.

**Board:** `rectangular_grid`. Legal wires: A–B, B–C, C–D, E–F, F–G, G–H, A–E, B–F, C–G, D–H. All unlisted initial/target lamps are dark.

**Canonical solution:** Press A–B, then C–D, then D–H. The minimum is **3 presses**, matching the required budget.

**One-step hint:** If you pair B with C first, how far apart are the two bright goals left over?

**Substantive idea:** Pairing nearby targets greedily can be wrong: B–C leaves A/H four edges apart, totaling five. A–B leaves C/H two edges apart, totaling three. Full rectangular grids supply overlapping cycles naturally.

**Why this step changes the thinking:** The board grows by one vertex from the tree, but the budget gets smaller. The difficulty is the pairing decision and temporary lamp cancellation.

**Source/adaptation:** New 2×4 grid target; no edges removed from the nearest-neighbor grid. References: T-M, T-F, T-R.

### Local sources and precise references

- **T-K** — [week-02-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex), **K–1 / 1, Tasks 1–2, “Two at a time”**. The uniform endpoint flip and the four-cycle adjacent/opposite targets.
- **T-M** — [week-02-grades-2-3.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex), **Grades 2–3 / 2, Task 4, “Make two far-apart lamps”**. A path flips only its endpoints.
- **T-U** — [week-02-grades-4-5.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex), **Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7**. Two complementary reduced solutions on a ring, plus equal-length alternatives.
- **T-F** — [week-02-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex), **Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”**. Binary incidence, tree forced edges, and T-joins.
- **T-R** — [week-02-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md), **“The mathematical destination”; “Sources and boundaries”; “Verification and future progression”**. Undergraduate/research lineage and natural progression from rings to trees/networks.

## Clockwork Gates (`clock`)

The clock renderer's red reference arrow follows one clockwise jump on an inner SVG lane. Its arc uses the full angular jump, including spans longer than half a ring. The arrowhead ends inside the numbered place, leaving a gap to the marker and number; stars sit outside the ring. Each clock computes its own geometry. `clock.render` accepts optional transient `clockPresentation` context with `jump`, `count`, and `animate` fields, separate from saved `{ prediction }`, for later controls and playback work.

**Child-facing launch:** Every bell makes the marker jump the same number of spaces clockwise. Set how many bells to ring so it first lands on the star. Later, one bell moves both clocks together.

**Prerequisites:** Entry: clockwise movement and counting to four, with icons/read-aloud. Middle: count to ten, track a wrap, distinguish landings from skipped positions. Final: track two repeated sequences and counts to twenty; multiplication, gcd, and CRT terminology are not required. These later tasks should be offered by readiness, not forced onto a K–1 trail.

**The mathematical object:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Uniform rules:**

1. Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
2. A jump counts landing positions, not positions passed over.
3. In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
4. In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
5. Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Natural variation:** Change ring size, a single uniform jump, starting phase, desired period, or couple two ordinary rings to the same bell. Select cases with a reason: wrapping, a proper orbit, two different generators of the same subgroup, or synchronization.

**Authoring guardrail:** Do not assign per-position jump exceptions, arbitrary missing landing sites, or a random menu of allowed jumps. Gear mode exposes the full stated integer interval. Synchronization changes the mathematical object to a product of two cycles; it does not add unrelated clues.

**Depth assessment:** Moderate candidate and a shorter content runway than Lantern Wires. Repeatedly tapping until arrival is shallow, so later completion requires a prediction of the first successful count, or a gear chosen for a specified orbit period. Keep the display concrete and allow replay. Once the child knows the orbit/CRT strategy, new numbers alone are practice, not new difficulty.

### Six concrete instances

#### clock-01 — Three spaces to the star

**Prompt and goal:** 4 places, jump 1, start 0, star at 3. Choose the first positive number of bells that lands the marker on the star.

**Canonical solution:** Set **3 bells**. Landings: 0 → 1 → 2 → 3. The first hit and the full joint period (4) were checked by finite simulation.

**One-step hint:** Count the spaces moved; the starting place is not the first jump.

**Substantive idea:** A cyclic shift is uniform and wraps at the end of the ring.

**Why this step changes the thinking:** A short rule tutorial, not intended as a sustained challenge.

**Source/adaptation:** New star target using the source four-ring. References: C-K.

#### clock-02 — Skip without stopping

**Prompt and goal:** 6 places, jump 2, start 0, star at 4. Choose the first positive number of bells that lands the marker on the star.

**Canonical solution:** Set **2 bells**. Landings: 0 → 2 → 4. The first hit and the full joint period (3) were checked by finite simulation.

**One-step hint:** Only where the marker lands counts.

**Substantive idea:** A +2 orbit stays on alternate positions, but it can still reach the target in its own orbit.

**Why this step changes the thinking:** The marker crosses a place without landing there. The child must separate jump distance from number of activations.

**Source/adaptation:** New target on the six-position extension. References: C-K, C-M.

#### clock-03 — Past zero

**Prompt and goal:** 10 places, jump 3, start 8, star at 0. Choose the first positive number of bells that lands the marker on the star.

**Canonical solution:** Set **4 bells**. Landings: 8 → 1 → 4 → 7 → 0. The first hit and the full joint period (10) were checked by finite simulation.

**One-step hint:** Your first landing wraps around from 8. Where is it?

**Substantive idea:** A target can require several wraps or an indirect-looking route; the state is a residue, not an ordinary increasing number.

**Why this step changes the thinking:** The route 8→1→4→7→0 defeats ordinary subtraction and requires maintaining one uniform jump through a wrap.

**Source/adaptation:** New start/target pair using the source +3 ten-ring. References: C-M.

#### clock-04 — Build a four-beat loop

**Prompt and goal:** On a 12-place clock starting at 0, choose a jump from 1 through 11. Keep that SAME jump. Make the marker return to 0 for the first time after exactly four bells.

**Canonical solution:** Choose jump **3**: 0 → 3 → 6 → 9 → 0. Every valid jump: 3, 9.

**One-step hint:** Four jumps must make whole laps, but no earlier number of jumps may do so.

**Substantive idea:** Jump size and period differ. +3 and +9 generate the same four-position subgroup in opposite orders; +6 returns too soon.

**Why this step changes the thinking:** The child designs an orbit instead of following a given rule. A candidate satisfying the four-bell endpoint still fails if it returns earlier.

**Source/adaptation:** New inverse-design prompt using the source exact period table. References: C-U, C-F.

#### clock-05 — Two clocks, one bell

**Prompt and goal:** 6 places, jump 1, start 0, star at 2; 8 places, jump 1, start 0, star at 4. Each bell moves both clocks. Choose the first positive number of bells that lands both markers on their stars together.

**Canonical solution:** Set **20 bells**. The joint state at activation 20 is [2, 4]. The first hit and the full joint period (24) were checked by finite simulation.

**One-step hint:** List the bell counts when the six-place clock is on its star; then check those on the other clock.

**Substantive idea:** Simultaneous congruences: t≡2 mod 6 and t≡4 mod 8. Matching one clock is insufficient; the first common match is 20, within a joint period of 24.

**Why this step changes the thinking:** One uniform action now acts on a product of two rings. The difficulty is synchronization; no individual jump is difficult.

**Source/adaptation:** New linked-clock adaptation. The source covers single rings and commuting rotations, not this simultaneous-target instance. References: C-U, C-F, C-R.

#### clock-06 — Different gears

**Prompt and goal:** 8 places, jump 3, start 1, star at 4; 6 places, jump 2, start 0, star at 4. Each bell moves both clocks. Choose the first positive number of bells that lands both markers on their stars together.

**Canonical solution:** Set **17 bells**. The joint state at activation 17 is [4, 4]. The first hit and the full joint period (24) were checked by finite simulation.

**One-step hint:** The eight-place clock hits its star after 1 bell, then after 9. When is its next chance?

**Substantive idea:** The first clock requires t≡1 mod 8. The second has a three-step orbit and requires t≡2 mod 3. Their first shared match is 17.

**Why this step changes the thinking:** Different speeds and a nonzero starting phase matter. The answer is smaller than the previous instance, but the child must coordinate orbit periods rather than raw ring sizes.

**Source/adaptation:** New product-of-cycles instance, authored from the source translation model. References: C-U, C-F, C-R.

### Local sources and precise references

- **C-K** — [week-04-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex), **K–1 / 1, Tasks 1–2; / 2, Tasks 3–5**. Concrete clockwise hops, skipped landings, and undo.
- **C-M** — [week-04-grades-2-3.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex), **Grades 2–3 / 2, Tasks 3–5, “A code that skips places”**. Compare +2 and +3 on a ten-position ring; split into disjoint loops.
- **C-U** — [week-04-grades-4-5.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex), **Grades 4–5 / 2, Task 3; / 3, Tasks 5–7**. Return times, divisibility, and the distinction between reversibility and a full orbit.
- **C-F** — [week-04-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex), **Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”**. The twelve-shift period table and cyclic-group interpretation.
- **C-R** — [week-04-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md), **“Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”**. Order n/gcd(n,k), including the local citation to Judson Ch. 4 §4.1, Theorem 4.13. Linked clocks are our extension, not a worksheet claim.

## Mirror Couriers (`billiard`)

**Child-facing launch:** Send the light from the bottom-left corner. It goes straight and bounces like a mirror at each wall. Which corner will it reach first? Later, shape the room or aim the light to deliver the message.

**Prerequisites:** Entry: follow a diagonal and distinguish a wall from a corner; no independent reading required. Later: count grid dimensions, compare repeated wall intervals, distinguish first arrival from a later one. Aiming levels require interpreting a rise/run arrow; fraction notation and gcd are optional strategies. The final level suits children comfortable coordinating two ratios, often 4–5 or beyond.

**The mathematical object:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Uniform rules:**

1. Start exactly at the bottom-left corner (0,0), initially moving right and up.
2. A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
3. Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
4. Count only non-corner wall reflections. Predictions are submitted before the path animation.
5. A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
6. Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Natural variation:** Use whole rectangles with all four sides reflective, vary aspect ratio or rational launch direction, and alternate forward prediction with inverse design. Offer an unfolding overlay after an attempt so the same mathematical object acquires a useful representation.

**Authoring guardrail:** No internal obstacle mazes, one-off mirror exceptions, colored locks, or arbitrary absent walls. Avoid implying that a bigger table is automatically harder. Keep the first-corner stop rule exact, and never confuse physical slope with normalized-square slope.

**Depth assessment:** Moderate candidate with a visual/number-theoretic strength. Tracing alone is a short-lived interaction. Later instances make inverse design the required win, and the last requires accounting for rectangle shape when selecting a direction. Once the reduced-ratio method is mastered, new rectangles alone are repetition.

### Six concrete instances

#### billiard-01 — Up the tall room

**Prompt and goal:** Room width 2, height 4. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Canonical solution:** First corner **top-left**, **1 wall bounces**.

**Replay path:** (0, 0) → (2, 2) → (0, 4). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** At the right wall, the light can still travel upward. Only its left/right direction changes.

**Substantive idea:** A wall reverses one component of direction; it does not turn the light back along its incoming path.

**Why this step changes the thinking:** A one-bounce tutorial with a concrete visual decision.

**Source/adaptation:** Direct source rectangle with a concise prediction interface. References: B-K.

#### billiard-02 — A crossing is not a wall

**Prompt and goal:** Room width 2, height 3. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Canonical solution:** First corner **bottom-right**, **3 wall bounces**.

**Replay path:** (0, 0) → (2, 2) → (1, 3) → (0, 2) → (2, 0). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** Imagine another copy of the room across the next wall, and keep going straight into it.

**Substantive idea:** Unfolding turns several reflections into a straight path; old path crossings do not create collisions.

**Why this step changes the thinking:** The route has three bounces and crosses itself. A local “turn at every intersection” rule fails.

**Source/adaptation:** Direct source rectangle; no worksheet proof is required. References: B-M.

#### billiard-03 — Both sides are even

**Prompt and goal:** Room width 6, height 10. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Canonical solution:** First corner **top-right**, **6 wall bounces**.

**Replay path:** (0, 0) → (6, 6) → (2, 10) → (0, 8) → (6, 2) → (4, 0) → (0, 4) → (6, 10). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** A 6-by-10 room has the same shape as a 3-by-5 room. Shrink the picture before following it.

**Substantive idea:** Raw side parity is misleading. Dividing out the common scale exposes a 3:5 shape, which reaches the top-right after six bounces.

**Why this step changes the thinking:** A deliberately selected parity trap introduces scale invariance; this is not merely a larger tracing task.

**Source/adaptation:** Direct source upper-table rectangle, adapted to a required corner/bounce prediction. References: B-U, B-F.

#### billiard-04 — Build the delivery room

**Prompt and goal:** The room is 6 squares tall. Set its width from 1 through 12. Launch diagonally up-right. Make the first corner top-right, after exactly 2 bounces.

**Canonical solution:** Set width **2**. All valid widths in the interval: [2]. First corner **top-right**, **2 wall bounces**.

**Replay path:** (0, 0) → (2, 2) → (0, 4) → (2, 6). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** Two bounces mean three straight pieces. Try a room that stacks three copies of its width up its height.

**Substantive idea:** Inverse design: the reduced shape must be 1:3 or 3:1. Height 6 and the full width interval leave width 2.

**Why this step changes the thinking:** The player must construct a room for a desired trajectory, rather than predict a supplied room.

**Source/adaptation:** New bounded inverse-design instance; source explicitly proposes top-right after at least one bounce. References: B-M, B-U, B-F.

#### billiard-05 — Aim across a square

**Prompt and goal:** Room width 1, height 1. Set the launch arrow's rise and run, each from 1 through 4. Make the first corner bottom-right, after exactly 3 bounces.

**Canonical solution:** Set rise **2**, run **3**. All valid (rise, run) settings in the interval: [[2, 3], [4, 1]]. First corner **bottom-right**, **3 wall bounces**.

**Replay path:** (0, 0) → (1, 2/3) → (1/2, 1) → (0, 2/3) → (1, 0). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** In mirrored square rooms, aim for a corner three room-widths right and two room-heights up.

**Substantive idea:** In a square, coprime rise/run p/q reaches the first lattice corner (q,p). Odd run and even rise give bottom-right; p+q−2 counts the bounces. Both 2/3 and 4/1 are valid here.

**Why this step changes the thinking:** The room stays tiny. Choosing a direction replaces changing size, and the exact bounce target rejects many directions that reach the correct corner.

**Source/adaptation:** New inverse form of the source rational-slope example, with the full 1–4 control range. Both successful directions are accepted. References: B-F.

#### billiard-06 — The room changes the aim

**Prompt and goal:** Room width 3, height 2. Set the launch arrow's rise and run, each from 1 through 10. Make the first corner top-right, after exactly 4 bounces.

**Canonical solution:** Set rise **10**, run **3**. All valid (rise, run) settings in the interval: [[10, 3]]. First corner **top-right**, **4 wall bounces**.

**Replay path:** (0, 0) → (3/5, 2) → (6/5, 0) → (9/5, 2) → (12/5, 0) → (3, 2). Coordinates are (right, up); rational coordinates are exact.

**One-step hint:** Open five copies of the room upward. Their far top-right corner is 3 squares right and 10 squares up.

**Substantive idea:** The physical slope differs from the unit-square slope. Rise/run 10/3 in a 3×2 room is five room-heights per room-width, reaching top-right after four horizontal-wall bounces.

**Why this step changes the thinking:** A square-based answer such as rise 5, run 1 is no longer right. The required solve must combine room aspect ratio with launch direction; no larger board or extra obstacle is added.

**Source/adaptation:** New rectangular rational-direction inverse instance applying the source explicit normalized-slope warning. References: B-F, B-U.

### Local sources and precise references

- **B-K** — [week-09-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex), **K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”**. Tall-table reflection and mirror-copy folding.
- **B-M** — [week-09-grades-2-3.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex), **Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5**. 2×3 route, shared wall multiples, and inverse table design.
- **B-U** — [week-09-grades-4-5.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex), **Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8**. Reduced parity instead of raw even/odd side lengths; bounce count; inverse design.
- **B-F** — [week-09-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex), **Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”**. Exact corner/bounce rules and physical versus normalized slope; local research lineage to Masur–Tabachnikov §§1.3–1.5.
- **B-R** — [week-09-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md), **“Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”**. Source boundary, existing Lowell rectangle work, and why unfolding/inverse design matter.

## Implementation-facing acceptance notes

### Clock playback presentation (job 9)

The saved clock board remains `{prediction}`. `dist/main.js` owns one transient
timeline per active play entry, including the draft answer and visible bell.
Ring explicitly restarts it even when the engine returns an unchanged attempt.
Editing an answer cancels the run and returns to bell zero; navigation, save
replacement, Undo and Restart also cancel its timer. Undo and retained resumed
predictions draw their bounded completed trail immediately. Existing resume
rules still reopen solved library puzzles fresh; retained campaign predictions
remain visible. Apply hint commits through the ordinary move path and displays
the resulting trail immediately.

Each jump uses an inner circular lane selected by the number of *geometric*
revolutions traveled so far. A jump crossing a revolution boundary includes a
short radial join; a landing at the boundary joins to the next jump's lane.
The red reference arrow stays in its own outer lane. Trail lanes range from
radius 72 toward radius 39 in the 320-unit SVG, leaving the number circles,
star, marker and centre bell count clear. The lane spacing shrinks for dense
runs such as clock-12. Each landing has one arrowhead. This depicts a path
around the drawn ring; the lanes are not distinct mathematical orbits.

Playback waits 400 ms per bell, or 10 seconds divided by the bell count for
longer runs. Reduced motion and counts above 48 show the result immediately.
For counts above 48, the picture draws only the first 48 jumps, then shows the
true final marker and bell count. The Help landing table retains its existing
48-bell bound.

- Lanterns: store ON sets separately from pressed-edge lists. Validate the final state and budget; do not demand the witness order. Presses commute, and repeated presses cancel. In a draft/rehearsal UI, a selected wire set may be edited freely before the final replay.
- Clocks: render zero as the clearly marked home position and expose skipped positions during a jump. The final linked-clock tasks must move both markers on every activation. A prediction field followed by replay keeps these from becoming timing games or repeated tapping.
- Billiards: the corner stops the animation. Never count the launch or endpoint as a bounce. Accept both directions in billiard-05. Unfolded copies are an optional representation/hint, not a required proof task.
- These bounded sequences are a proposal for playtesting. The later task types supply structural depth, but none is evidence that a particular five-year-old or eight-year-old will find the content difficult. For children who grasp a family quickly, move to the next structural change instead of generating larger numbers.


## Additional instances 07–12 — September 23, 2026

These are implemented alongside 01–06. See [the difficulty expansion](difficulty-expansion.md) for criteria and source boundaries, and [the complete review](../PUZZLES.md) for exact starting data and witnesses.

### Lantern Wires additions

| ID | Level | Insight |
|---|---|---|
| `toggle-07` | Medium | Solve the symmetric difference between the two pictures; a lamp already lit may need to stay lit. |
| `toggle-08` | Medium | Leaf requirements force wire choices. Their combined parity then decides the parent edges. |
| `toggle-09` | Hard | Different shortest pairings give valid answers; sending every path through the center wastes presses. |
| `toggle-10` | Hard | Both extinguishing and lighting count as odd endpoints. Overlapping routes cancel at intermediate lamps. |
| `toggle-11` | Hard | Six required endpoints turn a local pairing choice into a comparison of complete plans. |
| `toggle-12` | Hard | Several paths must cooperate; a shortest solution depends on the difference pattern, not on the goal alone. |

### Clockwork Gates additions

| ID | Level | Insight |
|---|---|---|
| `clock-07` | Medium | Different generators can have the same order. A return after five bells must be the first return. |
| `clock-08` | Medium | A nearby star can occur late in the orbit; spatial distance and number of activations differ. |
| `clock-09` | Hard | Shared factors shorten the orbits. Synchronize orbit periods rather than the printed ring sizes. |
| `clock-10` | Hard | Neither marker starts on its star. Two phase conditions must hold at the same positive time. |
| `clock-11` | Hard | A pairwise meeting need not solve three clocks. Filter one repeating set of meetings by the third orbit. |
| `clock-12` | Hard | Three non-unit jumps require reducing each orbit and coordinating its phase; ring-size LCM alone gives the wrong first hit. |

### Mirror Couriers additions

| ID | Level | Insight |
|---|---|---|
| `billiard-07` | Medium | Non-unit slope changes the first simultaneous wall crossing; reducing room width and height alone is insufficient. |
| `billiard-08` | Medium | The corner and bounce count together determine reduced room proportions. |
| `billiard-09` | Hard | Different reduced slopes can satisfy the same corner and bounce target; every bounded valid direction is accepted. |
| `billiard-10` | Hard | Inverse room design must combine fixed slope, reduced crossing counts, parity, and the first-corner condition. |
| `billiard-11` | Hard | Unreduced crossing counts can fit the endpoint but fail the first-corner requirement. |
| `billiard-12` | Hard | A bounded inverse problem joins parity, coprimality and aspect ratio; guessing the same slope as a unit square fails. |
