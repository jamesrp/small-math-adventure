# Twelve puzzles per expansion family

September 23, 2026. Each of the ten previously six-puzzle types now has **12 instances**, bringing the shipped app to **192 puzzles**. The original 72 Tile Garden / Cup Swaps puzzles and the original 60 expansion starting boards, solutions, IDs, numbering, and revisions are preserved. No save migration is needed.

## Choosing difficulty

The puzzle library groups each expanded family into **Easy**, **Medium**, and **Hard**, available from every grade trail. Numbers remain stable, so a new medium puzzle can appear before an older hard one. Labels describe reasoning within that family; they are not age ratings or promises of a strict numerical progression. The additional medium instances offer useful practice and contrasting structures before the hardest problems. These new labels and designs still need family playtesting.

- Easy introduces the legal move and a short concrete goal.
- Medium combines a reusable idea with several interacting moves or clues.
- Hard requires global planning, coordinating constraints, or recovering from a locally reasonable choice that cannot finish. Size alone is not a difficulty certificate.

## What makes the new problems different

| Family | Structural change in the harder instances |
|---|---|
| Lantern Wires | Plan several pairs of mismatched lamps on full 3×3 and 3×4 grids under an exact shortest-press budget. Both extinguishing and lighting matter. |
| Clockwork Gates | Coordinate three orbit periods and phases. The hardest two answers are 22 and 19 bells, not merely larger counts. |
| Mirror Couriers | Combine room aspect ratio, reduced crossing counts, parity, and the first-corner condition when choosing a width or aim. All valid bounded alternatives are accepted. |
| Bridge Courier | Repair six odd junctions, repeat multi-road shortest paths, and compare weighted complete pairings. |
| Symbol Orchard | Unique 5×5 and 6×6 completions with verified stalls under cell and row/column singles; some have no initial single at all. |
| Signal Lanterns | Overlapping pair/triple tests with no giveaway score. Every new transcript uniquely identifies its secret and every test is necessary for that secret. |
| Pebble Duel | Four or five piles, cancellation of whole groups, and rebundling across the 8-bit boundary. The player must win a full game, not just name an opening. |
| Neighbor Lanterns | Coordinate colorings across components, recognize shared-color pairs, close graph-power seams, and color a triangle-free graph requiring four colors. |
| Spring-water Jugs | Exact unequal distributions, a split starting supply, and conserving useful remainders or empty space. Every valid solution remains accepted; shortest paths are authoring evidence, not new requirements. |
| Odd-pebble Balance | Track signed hypotheses, create or use normal references, and identify any of twelve heavy-or-light possibilities within three weighings (24 signed possibilities). |

## Source review and adaptation boundaries

The former `math-circle/worksheets/` sources now live in `math-circle/lowell-math-circle-year-2/source/`. Relevant current facilitator sources and corresponding plans were consulted. Existing source IDs are retained; relocated source paths are repaired when the current file exists.

| Local source | Use |
|---|---|
| [Week 2 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md) | Graph endpoint flips, parity and shortest paths; the new lamp patterns are authored here. |
| [Week 4 redesign](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md) | Orbit length and phase; three-clock products are new app instances. |
| [Week 5 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md) | Partial Latin squares and the gap between local legality and unique completion. No skyscraper constraints are imported. |
| [Week 6 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md) | Binary exact-position feedback and decision trees. New probes and signed balance strategies are authored and enumerated here. |
| [Week 8 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md) | Normal-play Nim and binary bundle balancing; new four/five-pile starts. |
| [Week 9 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md) | First-corner unfolding and rational-direction design; new bounded inverse instances. |
| [Week 10 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex), [redesign](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md) | `route-07` adapts the house graph; `route-09` adapts the unit triangular prism and its three-repeat bound. Other maps/weight assignments are newly selected app instances of the same graph families. |

Standard cube, prism, octahedral, graph-power, complement, and Mycielski constructions are not claimed as new mathematics. Their coloring minima are exhaustively checked here. The existing network and measurement catalogs retain their mathematical references for coloring, pouring, and balance trees. No research theorem is inferred from these small computations.

Latin clue sets were selected from partial Latin squares for a specific property: unique completion plus a measured singles closure. The last two use relabeled permutation-group tables of order six; fixed reviewed clue sets are stored in `extended-latin-clues.json`. Code probes are fixed in `extended-code-probes.json`. No runtime random generation selects puzzle boards.

## Added instances

Every entry below also has explicit parameters, a useful hint, prerequisites, a checked witness, and an insight in the family JSON and [complete review catalog](../PUZZLES.md).

### Lantern Wires

| ID | Level | Required reasoning |
|---|---|---|
| `toggle-07` | Medium | Solve the symmetric difference between the two pictures; a lamp already lit may need to stay lit. |
| `toggle-08` | Medium | Leaf requirements force wire choices. Their combined parity then decides the parent edges. |
| `toggle-09` | Hard | Different shortest pairings give valid answers; sending every path through the center wastes presses. |
| `toggle-10` | Hard | Both extinguishing and lighting count as odd endpoints. Overlapping routes cancel at intermediate lamps. |
| `toggle-11` | Hard | Six required endpoints turn a local pairing choice into a comparison of complete plans. |
| `toggle-12` | Hard | Several paths must cooperate; a shortest solution depends on the difference pattern, not on the goal alone. |

### Clockwork Gates

| ID | Level | Required reasoning |
|---|---|---|
| `clock-07` | Medium | Different generators can have the same order. A return after five bells must be the first return. |
| `clock-08` | Medium | A nearby star can occur late in the orbit; spatial distance and number of activations differ. |
| `clock-09` | Hard | Shared factors shorten the orbits. Synchronize orbit periods rather than the printed ring sizes. |
| `clock-10` | Hard | Neither marker starts on its star. Two phase conditions must hold at the same positive time. |
| `clock-11` | Hard | A pairwise meeting need not solve three clocks. Filter one repeating set of meetings by the third orbit. |
| `clock-12` | Hard | Three non-unit jumps require reducing each orbit and coordinating its phase; ring-size LCM alone gives the wrong first hit. |

### Mirror Couriers

| ID | Level | Required reasoning |
|---|---|---|
| `billiard-07` | Medium | Non-unit slope changes the first simultaneous wall crossing; reducing room width and height alone is insufficient. |
| `billiard-08` | Medium | The corner and bounce count together determine reduced room proportions. |
| `billiard-09` | Hard | Different reduced slopes can satisfy the same corner and bounce target; every bounded valid direction is accepted. |
| `billiard-10` | Hard | Inverse room design must combine fixed slope, reduced crossing counts, parity, and the first-corner condition. |
| `billiard-11` | Hard | Unreduced crossing counts can fit the endpoint but fail the first-corner requirement. |
| `billiard-12` | Hard | A bounded inverse problem joins parity, coprimality and aspect ratio; guessing the same slope as a unit square fails. |

### Bridge Courier

| ID | Level | Required reasoning |
|---|---|---|
| `route-07` | Medium | An Euler trail can revisit junctions while using each road once; the endpoints are forced by degree parity. |
| `route-08` | Medium | Returning home early can strand a whole loop; splice all three cycles into one closed walk. |
| `route-09` | Hard | Six odd vertices require at least three extra crossings; a matching attains the bound on this prism. |
| `route-10` | Hard | Repeated connections can be paths through even junctions, not just roads between odd junctions. |
| `route-11` | Hard | The shortest parity repair can use two roads even when a direct road exists. Required coverage and cheapest repeats are different choices. |
| `route-12` | Hard | Weighted six-vertex matching combines parity with shortest-path costs; an optimal augmentation must be planned globally. |

### Neighbor Lanterns

| ID | Level | Required reasoning |
|---|---|---|
| `color-07` | Medium | Two even cycles must use compatible phases across their matching links. |
| `color-08` | Medium | Color names may be permuted on one component, but the connecting links constrain that permutation. |
| `color-09` | Hard | With three colors on the octahedral graph, each nonadjacent opposite pair must share a color. |
| `color-10` | Hard | A three-color repeating pattern clashes when wrapped around seven positions; a fourth color must be placed to satisfy both seam links. |
| `color-11` | Hard | Independent sets are small and must be chosen together. Coloring the complement of an odd cycle becomes a covering by neighboring pairs and a singleton. |
| `color-12` | Hard | Copying each cycle vertex’s neighbors and adding a common neighbor forces a fourth color even though there is no triangle. The complete graph is small enough to check by search. |

### Symbol Orchard

| ID | Level | Required reasoning |
|---|---|---|
| `latin-07` | Medium | A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction. |
| `latin-08` | Medium | A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction. |
| `latin-09` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-10` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-11` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-12` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |

### Signal Lanterns

| ID | Level | Required reasoning |
|---|---|---|
| `code-07` | Medium | Pair totals overlap through a crossing comparison; after resolving the pairs, the total fixes the last bit. |
| `code-08` | Medium | Overlapping triples and a pair must describe the same hidden bits; no single-position probe is supplied. |
| `code-09` | Hard | Four equal-score relations couple five positions. A case split at their common position and the baseline count select the unique word. |
| `code-10` | Hard | Locally consistent pair assignments can disagree with a cross-group total. Every recorded test is necessary for this unique code. |
| `code-11` | Hard | A sparse transcript can uniquely specify six bits. Convert match changes into group counts, then reconcile the overlaps. |
| `code-12` | Hard | Three overlapping triple counts leave plausible partial assignments. Only a globally consistent case survives; omitting any test leaves at least four codes. |

### Pebble Duel

| ID | Level | Required reasoning |
|---|---|---|
| `nim-07` | Medium | Equal game components cancel even when other piles remain. |
| `nim-08` | Medium | A whole collection can cancel even when no two piles match. |
| `nim-09` | Hard | A winning move can remove an entire pile while leaving three unequal piles. |
| `nim-10` | Hard | Shrinking a pile across a power of two can switch several smaller binary columns on. |
| `nim-11` | Hard | More than one winning opening may exist; every opponent reply must still be balanced again. |
| `nim-12` | Hard | Choosing among multiple reductions requires coordinating all binary columns across five components. |

### Spring-water Jugs

| ID | Level | Required reasoning |
|---|---|---|
| `jug-07` | Medium | A common factor restricts reachable amounts; a two-unit target remains reachable. |
| `jug-08` | Medium | The receiving jug’s free space determines the remainder; starting with the largest jug is not always shortest. |
| `jug-09` | Hard | An exact distribution makes the location of each remainder matter, not just producing a target somewhere. |
| `jug-10` | Medium | Empty storage is a resource; a sealed process can begin from a split supply rather than a full reservoir. |
| `jug-11` | Hard | The smaller capacities exceed the supply together; reserve space deliberately to build and transfer a useful remainder. |
| `jug-12` | Hard | Several remainders must be stored and reused to split an odd-capacity pair into two equal shares. |

### Odd-pebble Balance

| ID | Level | Required reasoning |
|---|---|---|
| `weigh-07` | Medium | Each first outcome must leave no more than three candidates. |
| `weigh-08` | Medium | References allow direct signed comparisons; preserve enough information to identify both the pebble and its sign. |
| `weigh-09` | Hard | A tilt leaves heavy and light hypotheses on opposite pans; a balanced result creates trusted references. |
| `weigh-10` | Hard | Adaptive experiments distinguish signed hypotheses by switching some suspects and leaving others off. |
| `weigh-11` | Hard | A reference changes the available partitions of signed hypotheses; every branch must fit the remaining information budget. |
| `weigh-12` | Hard | Twenty-four signed possibilities must be separated in three ternary experiments. A bad first partition leaves no guaranteed completion. |

## Rebuild and verify

```sh
python3 scripts/extend-catalog.py
python3 docs/puzzle-expansion/verify_all.py
node scripts/import-expansion.mjs
node scripts/generate-review.mjs
npm test
npm run build
```

`extend-catalog.py` deterministically rebuilds only 07–12 plus difficulty/source metadata. It preserves the original six mathematical instances. Independent verifiers check toggle and route minima, finite clock orbits, exact rational reflections, Latin uniqueness and failed branches, all binary codes, Nim openings by backward induction, chromatic minima, jug shortest paths, and every balance-tree branch. Runtime tests check legal moves, alternate answers, current-state hints, undo, saved progress, and full Nim play.

The browser expansion suite exercises all 120 expansion instances through real UI hints, save/reload, and completion; it also checks phone/iPad layout, 44-pixel controls, and offline opening of the final puzzle in every family. Verification establishes mathematical correctness and functioning controls. Child engagement and difficulty calibration need playtesting.
