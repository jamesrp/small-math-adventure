# Stone Rise: puzzle specification

Stone Rise assigns the arriving characters to a power network whose labeled connections require equal traits. All four levels are available through the exact, hash-checked native generator exporter in `tools/spec_lj_stone_rise.py`. An independent graph model evaluates the resulting puzzle. The level 1 pair and level 2 triple generators also have independent translations. Levels 3–4 still use the original instructions for exact layout generation; the procedure below explains their construction, but is not a claim of an independently ported generator.

## State, actions and acceptance

Input is the difficulty 1–4, an ordered party of 1–16 characters with four trait values in 1–5, and the initialized Logical Journey random state at `0x43d6d0`. The board has 117 possible cells in a staggered 13-by-9 grid. The generated graph, rather than geometric proximity alone, determines connectivity. Its 18-byte records at `0x49bd80` contain nine signed 16-bit fields: graphics ID, cell type, data, and six neighbor indices; -1 is absent.

| Type | Meaning |
|---|---|
| 500 | Inactive cell |
| 501 / 502 | Unpowered / powered wire |
| 504 / 505 | Power source or source extension, in two visual styles |
| 506 | Empty character pad |
| 507 / 508 | Occupied unpowered / powered pad |

A wire data value 510–513 names trait index 0–3. It conducts only when both adjacent character pads are occupied and the two characters agree in that trait. Other wire data is unlabeled and conducts without a trait test. Empty pads block power. A character is powered if its occupied pad is reachable from any source through conducting cells. This is a connectivity condition: it is **not** necessary to satisfy every named connection. Cycles can supply an alternate route around a mismatched connection.

Players may place a character on an empty pad, move it to another empty pad, or return it to the pool. Settled actions recompute power. The interface does not supply a direct occupied-pad swap. Placements and rearrangements are unlimited and have no error counter or solving deadline. GO commits the currently powered subset. Unpowered and unplaced characters stay behind; full success powers the whole incoming party. The departure branch at `0x439ca2..0x439d5d` separates powered types and attaches only type-508 occupants to the departing stones. Animation travel is outside the settled-action model.

The native power functions are `0x43b090` for levels 1–2, `0x43bf30` for levels 3–4, and the pair predicate `0x43c390`. Recalculation first normalizes old powered cells, then spreads power from the level's sources. The exporter retains the original generated witness data for research, but all player pads begin **empty**: the following graphics setup normalizes generated type 507 to type 506. A constructor witness is not player-visible information and is not assumed to be a complete solution.

## Difficulty and generation

| UI level | Structure | Main mathematical demand |
|---|---|---|
| 1 | Separate rows of one or two pads | Pair characters sharing the displayed trait; manage the remaining pool |
| 2 | Separate paths of up to three pads | Choose a middle character meeting two potentially different trait equalities |
| 3 | Three circuits | Allocate the party across circuits and exploit either direction of power |
| 4 | One branching network | Coordinate shared junctions and multiple routes across the entire party |

The generator uses the actual incoming party. Difficulty is therefore not determined by the level alone: repeated trait combinations increase interchangeability, uncommon values restrict junction choices, and alternate powered routes can weaken the effective constraints. There is no unique-solution requirement or target-permutation checker.

**Level 1 — `0x43b4d0`.** Draw one starting trait with `R(3)`. Visit unused working characters in order. Advance the trait cyclically before testing, scan later unused characters in order, and pair with the first equal value; try at most four traits. Emit label `510+trait` for a pair or 501 for a single. When there are problematic singles, scan backward and swap a single's trait record with working index 0 when index 0 was not itself flagged single, then repeat, at most ten passes. The native singles counter is accumulated across passes, not cleared each pass; this quirk is preserved. No extra randomness is consumed by retries. A zero-single pass, or one single for an odd party, satisfies the stopping test only against that accumulated count. The layout uses the authored start/stride tables at `0x48f5e8` / `0x48f604`, with source extensions for densely packed rows.

**Level 2 — `0x43b810` and `0x43b9f0`.** Make `ceil(n/3)` groups. Start at character 0 and mark it used. For each next character, draw `R(3)`, advance the trait cyclically before comparing, and scan unused characters from index 0 for a match. A failed first match emits an unlabeled edge and chooses the first remaining character; a failed second match emits an unlabeled edge and chooses the last remaining character. After a triple, the next group starts with the last remaining character. A final single still consumes its attempted first-match draw and emits a label that the shortened layout does not use. The path geometry uses the same start/stride tables. The independent port preserves these tie orders, unused labels, and all random calls.

**Level 3 — `0x43dcf1` construction branch.** Build the three authored circuits rooted at cells 19, 55 and 91, with sources 18, 54 and 90. The opposite starting pads are 24, 60 and 96. Sort characters by their number of party members sharing any trait, including themselves, descending with stable original-index ties (`0x43bbf0`). Choose a circuit processing order using inclusive `R(100)`: the first branch tests `<50`, then a second such draw distinguishes the other two orders. This is not a uniform three-way shuffle.

For each circuit, use the first two unused characters in that order for its root and opposite pad. Expand from the root in directions 8 then 9, and from its opposite in directions 6 then 7; the second expansion is conditional on the first succeeding. Each expansion (`0x43c950`) draws a starting trait, then scans unused characters in reverse degree order, cycling traits starting **at** the drawn trait. On the first match it creates a labeled wire and places that character; failure leaves the extension unused. Directions 6/7/8/9 are neighbor pairs (0,1)/(2,1)/(5,4)/(3,4). Direct directions 0–5 follow that direction twice through a wire.

Closing horizontal links use the six pad pairs (11,13), (29,31), (47,49), (65,67), (83,85), (101,103). The helper chooses a cyclic trait priority from inclusive `R(1000)` split at 250/500/750 and uses the first equal trait, or an unlabeled result. Finally the builder adjusts pad count to the incoming party using the exact priority table at `0x48f644`. Empty candidate pads can become wires; generated pads and labels are exported after this pruning. `local/analysis/logical-journey-stone-rise/tables.json` preserves every referenced authored cell list and its address.

**Level 4 — `0x43e0b4` construction branch.** Start with 26 candidate pads and 43 wire cells from `0x48f4a8` and `0x48f4dc`. A leading `R(1)` chooses one of two visual source styles and corresponding frame offset. Source 54 feeds root pad 55. Small parties have specialized shortened central layouts; parties above five use `0x43eb50`. The construction uses the same party degree ordering but grows toward compatible characters in forward order through `0x43f2b0`, which draws its trait even when the requested direction is unavailable. Its return -2 means unavailable geometry and -1 means no compatible candidate.

The expansion controller `0x43eda0` visits the authored targets 55,40,76,23,95,42,78,38,74,21,93,19,91 and branches from available occupied neighbors. The initial controller can search consecutive degree-ranked characters for a compatible starting pair (`0x43ecb0`); it must not be approximated as always placing the two highest-degree characters. Unplaced characters are handled by `0x43f4d0`, then `0x43f020` prunes unused branches. `0x43fa70` adds compatible closing links in a fixed list of thirteen endpoint/wire triples retained in the table export. A special empty-branch case removes cells 60 and 61 via `0x43fb70`; it is a deletion, not a rotation. Subsequent small-party cleanup and final expansion complete the records before `0x43e986`.

For this level, the authoritative executable specification is the isolated native backend and exported records/RNG trace. The prose intentionally does not replace the many conditional pruning cases with an invented simplified algorithm. An independent complete high-level port of levels 3–4 remains an explicit parity gap.

## Witnesses and verification

`powered(board, placement)` is independent of the original evaluator. `solve_strong` searches for an assignment satisfying every named edge, which is sufficient for a fully powered solution when confirmed by reachability. This is a **stronger** condition than the real rules. A failed or bounded search does not prove the real puzzle unsolvable. Identical trait tuples are interchangeable during search. Every returned witness is checked by the actual power function.

The current differential report covers 6,000 exact native generator exports; 1,500 independent level-1 label/RNG comparisons; 1,500 independent level-2 label/RNG comparisons; 1,800 arbitrary partial/full placement power comparisons; and 60 native-verified full solution witnesses. Fixtures span all four levels, sizes 1/2/5/7/16, mixed, identical and cyclically distinct parties, and seeds 0–99. The 6,000 generator runs are exact native exports, **not** 6,000 independent generator comparisons. The exporter stops before graphics allocation, substitutes entity lookup, and retains original generator and random instructions. The evaluator suppresses celebration and audio effects after preserving mathematical decisions.

Run `research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_stone_rise.py --count 100`. Results and examples are in `local/analysis/logical-journey-stone-rise/validation.json`. Source SHA-256 is `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. Scene art/animation is in `DATA/slides.mhk`, shared characters/help in `DATA/zoombini.mhk`, help STRL 2200/2220/2240/2260, manual PDF pages 23/39. The structured spec binds source archives and evidence by hash. Session seeding, prior random consumption, pixels, callback scheduling and campaign save logic are excluded.

A cross-review also checked 24 saved-board evaluations in a fresh oracle and reverse level order. The evaluator restores party, level, source color, labels and slot mapping from the requested board, so it does not depend on whichever board was generated most recently. The additional report is `saved-board-validation.json`.
