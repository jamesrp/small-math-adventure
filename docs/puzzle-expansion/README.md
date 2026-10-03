# Ten more puzzle types for the math adventure

The [Week 2 worksheet additions](lantern-worksheets.md) add 30 Lantern Wires puzzles (42 total), bringing the expansion to 150 instances and the app to 222. The original expansion design history below remains useful; current content and verification include the additions.


Prepared September 20, 2026, from the current ten-week math-circle worksheets, facilitator solutions, redesign notes, and selected supplementary references.

**120 concrete problems: ten additional types with twelve instances each.** Every instance has explicit rules and starting data, a completion condition, a checked answer or strategy, a hint, and its mathematical idea. Six additional tiling trials address the existing Tile Garden feedback. All 120 new-family instances are now implemented in the live app, alongside the original 72 puzzles, for 192 puzzles across twelve mechanics. The six additional tiling trials below remain proposals.

The design brief is saved in [AGENTS.md](../../AGENTS.md). The standard is a well-defined instance of a simple mathematical object, with the interesting decision inside the required solve. Proofs, discussion, and research exposition are not prerequisites for finishing.

## The ten types

| Type and full sequence | What the player does | Mathematical structure | Original six-step progression |
|---|---|---|---|
| **1. [Lantern Wires](motion.md#lantern-wires-toggle)** | Flip both endpoints of a wire to match a target; later meet a small press budget. | Linear algebra over F₂, graph incidence, T-joins. | Adjacent pair → path cancellation → repair a pattern → shorter cycle route → forced leaves → pair targets on a full grid. |
| **2. [Clockwork Gates](motion.md#clockwork-gates-clock)** | Predict first arrival, choose a repeating jump, or synchronize clocks. | Cyclic groups, gcd, orders, simultaneous congruences. | Unit jump → skipped landings → wraparound → choose a four-beat orbit → synchronize clocks → coordinate different gears and phases. |
| **3. [Mirror Couriers](motion.md#mirror-couriers-billiard)** | Predict a reflected ray's first corner, then design its room or aim. | Unfolding, rational billiards, lattice intersections. | One reflection → ignore path crossings → remove common scale → choose width → aim across a square → account for rectangular aspect ratio. |
| **4. [Bridge Courier](networks.md#bridge-courier-route)** | Draw an exact-once route; later cover all roads and return at the optimal distance. | Euler trails and undirected route inspection. | Choose endpoints → splice a loop → delay a bridge crossing → repeat a corridor → repair four odd junctions → select repeated roads globally. |
| **5. [Symbol Orchard](deduction.md#symbol-orchard-complete-a-latin-square)** | Complete a grid with each symbol once per row and column. | Partial Latin squares, quasigroups, determining sets. | Two-symbol propagation → crossing exclusions → long deduction chain → a symbol's only home → choice after forced moves → no initial singles. |
| **6. [Signal Lanterns](deduction.md#signal-lanterns-decode-a-binary-word)** | Recover a binary code from exact-position match totals. | Hamming distance, hypercubes, resolving sets. | Opposite word → compare tests → infer a remaining bit → overlapping information → five-bit decoding → reuse probes with a different deduction. |
| **7. [Pebble Duel](deduction.md#pebble-duel-find-a-winning-first-move)** | Choose a removal from one pile that gives a winning position against best play. | Normal-play Nim, backward induction, binary XOR. | Tiny endgame → equalize two piles → cancel an extra pile → three unequal piles → change the smallest pile → rebundle with multiple winning moves. |
| **8. [Neighbor Lanterns](networks.md#neighbor-lanterns-color)** | Color dots so every linked pair differs, using the given palette. | Proper graph coloring, chromatic number, cycles and graph powers. | Path → odd cycle → even-rim wheel → odd-rim wheel → square of an eight-cycle → Petersen graph. |
| **9. [Spring-water Jugs](measurement.md#spring-water-jugs)** | Fill, empty, and pour to an exact amount or distribution. | Integer state graphs, gcd, linear combinations, conservation. | Capacity difference → save overflow → measure free space → carry remainders → share a sealed supply → coordinate a small buffer. |
| **10. [Odd-pebble Balance](measurement.md#odd-pebble-balance)** | Choose weighings that identify one exceptional pebble within a budget. | Ternary decision trees, adaptive search, signed hypotheses. | Off-scale answer → preserve a follow-up → use three branches → heavy or light → known reference → create references from evidence. |

Each new type has twelve instances total, grouped by Easy, Medium, and Hard. This is not twelve instances per grade band. Original instances 01–06 retain their IDs and starting data; 07–12 add consolidation and harder structural problems. [The difficulty expansion](difficulty-expansion.md) documents the additions, source review, and relative difficulty criteria. Introductory problems should be skippable; they teach controls and the mathematical rule. Readiness notes replace unsupported age-difficulty claims. Some late tasks can exceed ordinary K–5 expectations; younger children can access the same objects through entry instances.

## What I would prototype first

**First, revise Tile Garden and add Lantern Wires and Bridge Courier.** They offer tangible, short actions and useful wrong turns on small boards. They also support undo and visual next-move hints. These priorities are design judgments, not playtest results.

**Next, try Spring-water Jugs, Signal Lanterns, and Nim.** They give three different experiences: manipulating quantities, decoding observations, and choosing a strategic move. Jugs need a clear animation of exactly when pouring stops. Nim's core task is one winning first move; an optional opponent can demonstrate consequences without requiring a strategy explanation.

**Then test Coloring, Latin Squares, and Balance.** Coloring needs a legible graph; Latin needs pencil marks and undo for branch points; Balance needs a visible observation history. Latin is stylistically closest to a conventional constraint-completion puzzle, so test the pure row/column object's appeal before making a large campaign. No boxes, cages, visibility clues, or color quotas are added.

**Clockwork and Billiards deserve small experimental releases.** Their mathematical connections are strong, but passive hopping or tracing soon becomes routine. Later problems require synchronization or inverse design as the actual win. Once those strategies are learned, larger numbers alone will not sustain novelty. Keep counting to 20 or interpreting an aim arrow from becoming an arithmetic barrier.

The shared mathematics does not make these reskins: toggles manipulate a binary configuration, codes infer an unknown configuration, and weighing chooses an experiment adaptively. Clock orbits, jug amounts, and billiard trajectories all touch gcd, but their actions and solve experiences differ.

## Changes to the existing types

The [existing-types review](existing-types.md) contains six checked **L-tromino and domino/L mixed-inventory boards**, with solutions and counts of legal placements that strand the board. Even a 2×3 L-tromino board creates decisions absent from many large domino rectangles. These trials are small; actual difficulty still needs your children's feedback.

A free two-piece menu can be easier than an exact inventory. Unlimited dominoes plus L pieces leave the all-domino solution available on a 4×4 square. A minimum-piece objective is natural, but it must be stated if required.

The current 36 cup puzzles already use natural graphs: unrestricted exchanges, adjacent positions, rings, and fixed hubs. Preserve those families and select starts to expose cycles, inversions, routing choices, or temporary displacement of a correct cup. The review distinguishes a marked position from a moving cup identity.

## How the ten-week review informed the result

The review covered current student and facilitator sources, not only curriculum titles. The detailed documents give exact local source sections and separate borrowed targets from newly authored adaptations.

| Material reviewed | Resulting decision |
|---|---|
| [Week 1 packet](/Users/jamespfeiffer/math-circle/worksheets/week-01/README.md) and [tiling redesign](/Users/jamespfeiffer/math-circle/plans/week-01-tiling-redesign.md) | Move the change-of-tile-set idea into the cover task. Square-grid L trials adapt the idea; they are not the circle's triangular pattern blocks. |
| [Week 2 switches](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md) | Keep endpoint flips on whole cycles, trees, and grids; later budgets expose actual decisions. |
| [Week 3 permutation machines](/Users/jamespfeiffer/math-circle/plans/week-03-redesign.md) | Improve existing cup authoring; do not count another permutation reskin as a new type. |
| [Week 4 rings](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md) | Use arrival prediction and gear selection; linked clocks are a new extension. |
| [Week 5 cities](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md) | Use pure Latin-square entries; omit additional skyscraper visibility rules. |
| [Week 6 code queries](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md) | Use fixed exact-position transcripts; adaptive experiments inform the separate balance mechanic. |
| [Week 7 take-away](/Users/jamespfeiffer/math-circle/plans/week-07-redesign.md) and [Week 8 piles](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md) | Combine into one unrestricted Nim family; do not inflate the ten by counting arbitrary subtraction menus. |
| [Week 9 billiards](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md) | Retain exact reflection and first-corner conventions; make inverse design a required solve. |
| [Week 10 routes](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md) | Draw valid or optimal routes without a submitted parity proof. |
| [Earlier summer plan, Week 15](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md) | Add coloring through named graph families; primary undergraduate references appear in the network document. |
| Local balance resources and undergraduate number theory | Add adaptive weighing and jug pouring; exact references and adaptation boundaries appear in the measurement document. |

Supplementary local reading included both pages of *Imbalance Problems* and the archived Daniel Finkel balance article. The hanging-mobile inequality collection was not imported as a stack of clues. The article's two-bag premise was also not copied: the chosen balance object is exactly one exceptional pebble. Directly reused worksheet targets or probe sets are identified in the detailed files.

## Check the content

From `/Users/jamespfeiffer/business/small-math-adventure/`, run:

```sh
python3 docs/puzzle-expansion/verify_all.py
```

The checks use only Python's standard library. They validate all **150 expansion instances plus 6 tiling probes**: witnesses, claimed minima, unique code/Latin answers, all winning Nim moves, complete bounded clock/billiard choices, and every weighing-strategy branch. Independent reviews used separate enumeration or formula checks for deduction, network, and tiling claims. Verification establishes mathematical correctness; it does not establish child engagement or grade placement.

| Files | Contents |
|---|---|
| [motion.md](motion.md) / [motion.json](motion.json) | 66 toggle, clock, and billiard instances. |
| [deduction.md](deduction.md) / [deduction.json](deduction.json) | 36 Latin, code, and Nim instances. |
| [networks.md](networks.md) / [networks.json](networks.json) | 24 route and coloring instances, exact graphs, and cup notes. |
| [measurement.md](measurement.md) / [measurement.json](measurement.json) | 24 jug and weighing instances, paths and complete adaptive strategies. |
| [existing-types.md](existing-types.md) / [verify_tiling.py](verify_tiling.py) | Six tiling trials, counts, and existing cup topology review. |

The JSON files retain their authoring schema. [The import adapter](../../scripts/import-expansion.mjs) maps all 150 instances into [the shipped runtime pack](../../dist/puzzles.json). Each type now has controls, a mathematical validator, current-state hints, undo, saved progress, and offline assets. [The browser suite](../../scripts/expansion-browser-smoke.mjs) checks direct controls, every instance, save/reload, mobile layouts, touch targets, and offline loading. Accept every valid solution; stored witnesses are explanations and verification artifacts, not answer templates to match literally.

Implementation checks: `npm test`, `npm run build`, and `node scripts/expansion-browser-smoke.mjs` (with Playwright and a running local server). Existing version-one saves remain compatible because the expansion adds puzzle IDs without changing earlier rules or revisions. The app groups the collections by family and difficulty and lets players enter at any step from any grade trail.
