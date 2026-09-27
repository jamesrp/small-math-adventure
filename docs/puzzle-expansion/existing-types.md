# Revisions to the two existing puzzle types

These proposals accompany the ten new types; they are not counted as additional types. No shipped puzzles have been replaced in this authoring pass.

## Tile Garden: change the pieces and the required decisions

The family playtest is the strongest difficulty evidence available: all sampled K–1 boards and the sampled 2–3 boards were trivial for a five-year-old. The existing design notes acknowledge that some older rectangles are easy to cover and rely on counting, explanation, or comparison afterward. That does not satisfy the requested app experience by itself.

Use a domino `D` (two squares sharing a side) and an L-tromino `L` (three squares of a 2×2 square). Pieces can rotate freely. Cover all available cells exactly once, without overlap or overhang. An exact inventory means use every supplied piece. Do not add color-specific regions or other placement exceptions.

The following are six concrete **playtest probes**, not a claim of a calibrated difficulty order. Each diagram is a solution: every letter is one distinct piece, and `.` is a missing square. The child initially sees only the empty board and the inventory. Identical pieces are indistinguishable; rotation/reflection of the whole board is not factored out when counting placements.

| Probe | Board | Inventory | Tilings | First placements that allow completion / strand the board |
|---|---|---|---:|---:|
| 01 | 2×3 rectangle | 2 L | 2 | 4 / 4 |
| 02 | 4×4, top-left cell missing | 5 L | 1 | 5 / 28 |
| 03 | 4×4, row 2 column 2 missing | 5 L | 1 | 5 / 19 |
| 04 | 3×3 square | 3 D + 1 L | 8 | 16 / 12 |
| 05 | 3×4 rectangle | 3 D + 2 L | 40 | 37 / 4 |
| 06 | 4×4 square | 2 D + 4 L | 96 | 56 / 4 |

These counts come from exhaustive exact cover, not observations of children. A legal placement that cannot extend establishes a real decision; neither its frequency nor the number of solutions alone measures human difficulty. A highly forced board may still become routine once its forced moves are recognized.

### Probe 01: learn the L

**Prompt:** Cover this small rectangle with two L pieces. **Hint:** Each L leaves a corner of its little 2×2 square empty. Where will the other L go?

```text
AAB
ABB
```

Even this six-cell board has legal placements that strand the remainder. It is a quick test of whether changing the tile creates a meaningful new choice without enlarging the board.

### Probe 02: a missing corner

**Prompt:** Cover every square around the missing corner with five L pieces. **Hint:** Can you leave one missing square in each of four small 2×2 rooms?

```text
.ABB
AACB
DCCE
DDEE
```

The central C creates a missing cell in each of the three intact quadrants. This is a concrete instance of the deficient-board construction, with no induction explanation required.

### Probe 03: move the missing square inside

**Prompt:** Cover the board with five L pieces. **Hint:** The missing square is in the upper-left room; how could the other three rooms acquire their missing square?

```text
AABB
A.CB
DCCE
DDEE
```

The same-size contrast tests transfer of the decomposition rather than persistence on a bigger shape. Probes 02 and 03 each have exactly one tiling in the fixed board coordinates.

### Probe 04: two shapes on one small board

**Prompt:** Use all three dominoes and the one L to cover the square. **Hint:** Try the L near a corner; inspect the cells it leaves for pairs.

```text
AAB
CDB
CDD
```

A, B, C are dominoes; D is the L. Choosing an L changes which neighboring pairs remain possible. This is a nine-cell mixed-tile puzzle, not a large boundary-following task.

### Probe 05: plan two L pieces together

**Prompt:** Cover the rectangle using exactly three dominoes and two L pieces. **Hint:** Two L pieces can cooperate inside a 2×3 rectangle.

```text
AABB
CDDE
CDEE
```

A, B, C are dominoes; D and E are L pieces. This probes recognizing a reusable compound patch. It may be easier than Probe 04 for a child who spots that patch; do not assign grade level by area.

### Probe 06: an inventory changes an easy square

**Prompt:** Cover the square using exactly two dominoes and four L pieces. **Hint:** Set aside a strip for the two dominoes, then examine the remaining rectangle.

```text
AABB
CCDD
CEDF
EEFF
```

A and B are dominoes; C, D, E, F are L pieces. A board that is trivial with unrestricted dominoes now asks the child to allocate a genuinely different inventory. Ninety-six completions are accepted; this is not a hunt for a particular author's picture.

### Exact inventory versus a free piece menu

Offer both modes deliberately. A free menu removes a restriction and contains every exact-inventory solution, so it cannot be assumed to be harder as a feasibility problem. In particular, a 4×4 board with unlimited dominoes and L pieces immediately admits eight horizontal dominoes. Hiding an inventory would restore the very easy solution the revision is meant to avoid.

Use an odd-area board when testing a free domino/L menu so that at least one L is necessary. If the intended task is **use as few pieces as possible**, state that optimization explicitly and verify its optimum. Do not quietly grade a free-cover task against an unstated preferred mixture. Mixed inventories and free menus can both be mathematically clean; their difficulty must be checked separately.

### Mathematical lineage and verification

These are square-grid adaptations prompted by [Week 1's change-of-tile-set investigation](/Users/jamespfeiffer/math-circle/worksheets/week-01/week-01-grades-2-3.tex), especially Tasks 3–4, and [its redesign notes](/Users/jamespfeiffer/math-circle/plans/week-01-tiling-redesign.md), “The undergraduate source trail” and “What the research suggests teaching.” The circle uses triangular pattern blocks; the app trials above use different square-grid pieces. The precise deficient-board L-tromino construction is the one cited there from MIT Mathematics for Computer Science §5.1.5. It does not automatically establish results about an arbitrary mixed menu.

Run `python3 docs/puzzle-expansion/verify_tiling.py` from the app folder. It verifies every illustrated piece, all six inventories, complete tiling counts, and the number of individually legal first placements that do or do not admit a completion.

## Cup Swaps: preserve natural move families

Inspection of all 36 shipped cup puzzles in `dist/puzzles.json` found **14 unrestricted, 11 adjacent-on-a-row, 6 ring, and 5 single-hub** instances. Where a very small graph fits several descriptions, it is counted as unrestricted first. None requires repairing an arbitrary half-deleted swap graph.

Keep the same starting arrangement when introducing a new move family so the effect of the rule is visible. The existing row-versus-ring contrasts already do this. Natural restrictions should reveal a particular idea:

| Allowed exchanges | Intended insight |
|---|---|
| Any pair | Disjoint permutation cycles can be repaired independently. |
| Neighbors on a row | A distant cup has to pass intervening cups; inversions measure shortest work. |
| Neighbors on a ring | Wraparound changes routes; the row's inversion formula no longer gives the answer. |
| Every exchange touches one marked position | A cup already home may have to move temporarily; the hub mediates peripheral exchanges. |
| Every exchange touches one of two marked positions | A second transfer point changes routing; compare an authored start with the one-hub version. |

“Marked position 1” and “the moving cup labeled 1” are different rules. The current app uses fixed positions; keep that language precise. Never prune spokes or neighbor links randomly.

The [Week 3 source review and expanded recommendations](networks.md#what-week-3-says-about-the-existing-cup-swaps-mechanic) connect these choices to cycles, noncommuting overlapping swaps, and reversing a move sequence. No proof submission is needed to experience any of them.
