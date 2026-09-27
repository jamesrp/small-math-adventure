# Beetle Bug Alley: generator parity and measured difficulty

The mathematical generator is reconstructed through its complete native entry function, `0x440ab0`: layout selection, variant selection, move reversal, initial scrambling, bounded search, retries and fallback. It produces the same ordered buttons, bead positions, candidate history and RNG stream as the original executable in the tested boundary. This supersedes the unresolved Beetle generator/category details in the first extraction report; the original corpus is preserved.

The significant finding is that scrambling and gameplay apply directed moves differently. A native-confirmed level-2 example cannot reach the all-beetles-matched target, although partial rescue is possible. Separately, exact graph measurements show substantial variation within each level, and shortest all-bead restoration length does not increase monotonically across the three levels in the deterministic sample.

## Sources and scope

- Executable: `local/discs/mountain-rescue/INSTALL/HD/zoombini2.exe`, SHA-256 `1e123163e9b5e583718d650420289fa38c9970ad58fce1bd170bbf75b34513aa`.
- Layout data: `local/discs/mountain-rescue/Data/Bmp/magic_wall/DEFAULT.ZTL`, 5,330 bytes, SHA-256 `951d5f5358feb8e85fd72e4c74a1ff820d2407ff1ba89e9aceced9692727fa35`.
- Guide: `INSTALL/Data/Zoombinimr.pdf`, PDF pages 10, 18, 30–31. The local manual extraction preserves page numbers. Page 18 defines unlimited moves and the matching-color target; pages 30–31 describe permutations, temporary displacement, and harder move patterns.
- Implementation: [mountain_generator.py](../tools/mountain_generator.py). The existing ZTL decoder retains record/variant/move/triple byte offsets; generated cases retain record offsets. New result files include source provenance and native function addresses/file offsets.

This is parity given the CRT RNG **state at generator entry**. Full-session time seeding and earlier random calls are outside the claim. No game process, UI or installer is run. The shared Unicorn oracle executes the identified code in isolated memory. Native file loading is replaced by marshaling the decoded table; allocation/free and the CRT thread-state accessor are supplied by the harness. Gameplay move validation needs no function stubs. Allocation failure and malformed input behavior are outside the model.

## Level mapping is resolved

| Displayed level | Native category | Selectable record indices | Weights in record order | Possible beads | Possible buttons |
|---|---:|---|---|---:|---:|
| Not So Easy | 1 | 0–5 | 4, 3, 2, 2, 4, 4 | 5–8 | 2–5 |
| Oh So Hard | 2 | 6–11 | 1, 4, 3, 3, 5, 4 | 5–8 | 2–5 |
| Very Hard | 3 | 12, 14–16 | 4, 4, 3, 4 | 6–9 | 2–5 |

The native save field for this activity is `save+0x13e8` (scene index 6 in the array starting `save+0x13d0`; dispatch tables `0x461d68` and `0x461cfc`). The dispatcher carries the selected level into the scene's `+0x108` field (`0x461622`); initialization passes that field directly to the generator (`0x41d47f`–`0x41d496`). Normal progression increments it only below 3 (`0x41ab1b`–`0x41ab27`). The complete-party counter `save+0x176c` increments and resets on its third success (`0x41aaeb`–`0x41ab0b`), after verifying an eight-member party with every success flag set. This branch alone does not establish that these successes must be consecutive. An earlier draft incorrectly cited the adjacent scene5/save+0x13e4 progression routine; the generator/category parity results were unaffected.

Record 13 has category 3 but weight zero, so ordinary weighted selection never picks it. Category 4 contains records 17–21 and is accepted by the generator, but is outside the normal three-level progression. Category 4 is included only in native diagnostic tests, not in the main difficulty analysis.

These are ranges across actual selectable variant combinations. The guide's broad description of increasing beetles/pattern complexity is not a strict per-instance increase: levels 1 and 2 overlap in both counts.

## Exact generator sequence

1. **Weighted layout.** Construct the record-index list in file order, repeating each matching-category index by its weight. Consume one `rand()` and select `rand()%total_weight` (`0x440210`). Totals for normal levels are 19, 20 and 15.
2. **Three independent variant draws.** Visit the record's three pools in order, consume one `rand()%variant_count` for each, including singleton pools, and append each selected move list. A variant whose first move has no transfers contributes nothing (`0x4402f0`). These pools are compositional choices, not difficulty levels.
3. **Button direction.** For each resulting button, in order, consume `rand()%3`. On zero, swap every transfer's source/destination. This reverses cycles; swaps remain equivalent but still consume the RNG draw (`0x440597`).
4. **Reset before each candidate.** Assign bead `i` to position `i`, clear marks.
5. **Scramble length.** Repeatedly consume `rand()%7` until the result is 4, 5 or 6. Store that length. This uses rejection sampling, not `4+rand()%3` (`0x44069a`).
6. **Scramble steps.** Consume exactly one `rand()%button_count` per step. Apply that button using the special sequential transfer routine described below (`0x4406df`).
7. **Check.** Search button sequences in fixed button order, depth first, up to six moves. No visited-state pruning exists in the original. Return 1 for already solved, 2 for a found solution, 0 for no solution within six moves (`0x4407c0`, `0x4408e0`). Its depth result is the first DFS witness length, not an optimum. A failed nontrivial root leaves depth 1. The Python reconstruction memoizes equivalent subtrees while preserving that first witness.
8. **Accept/retry.** Code 0 saves the candidate and stops immediately. Code 2 with nonnegative depth saves it, but continues. Code 1 is not saved. After at most six candidates, return the last saved candidate. If all candidates were already solved, return the final checker snapshot, also solved (`0x440ab0`). The apparent minimum-depth test is against zero, not four or six.

The RNG is exact Microsoft CRT arithmetic: `state=(214013*state+2531011) mod 2^32`, returning `(state>>16)&32767` (`0x46c7c0`). There are no random calls in the checker. Every random call's reason, modulus, return value and resulting state is exported for an individual generated case.

The acceptance rule therefore favors candidates without an all-bead restoration sequence of six or fewer moves. It does **not** establish that full restoration is reachable. A 4–6-step scramble is not a 4–6-move restoration guarantee, because directed buttons need not have a one-click inverse, and because scrambling is not the same operation as gameplay. Partial-door rescue is a separate, weaker objective.

## Scrambling and legal moves differ

State tuples map bead identity to position. The target is the identity tuple. A button is an ordered collection of `(from,to,flag)` transfers; flag 1 exchanges two positions, flag 0 transfers one direction.

The gameplay routine (`0x440f20`, called by the scene at `0x41ce8b`) marks beads already handled during that button press. This makes a cycle's transfers simultaneous: each bead moves at most once. The solver uses an equivalent routine (`0x4411a0`). Every shipped move and its reversal defines a bijective position permutation.

The scrambler (`0x440690`) has no marker check. It searches the current position array for each transfer, keeps the **last** matching bead index, and writes immediately. For a directed cycle, intermediate duplicated position values can cause it to act on a different bead than the gameplay operation would. This difference is native-confirmed; whether it was intentional is unknown. The model preserves it rather than correcting it.

## The actual target and partial rescue

The all-matched condition is not inferred from rendered colors. After a button press, the scene calls `0x41c5f0` at `0x41cfb0`. Its loop at `0x41c658`–`0x41c668` directly compares each state entry's identity (`+0`) and current position (`+4`), increments the matching count only on equality, and compares that count with the bead count at `0x41c6e6`–`0x41c6f1`. Color assignment cannot make another permutation count as fully matched.

The game also permits partial rescue, as the guide explicitly describes on PDF page 18. Door `d` checks the bead indices `d`, `d+4`, `d+8`; unused entries beyond the bead count are treated as matched. This predicate is visible at `0x41cb20`, with its three equality checks at `0x41cb95`, `0x41cba1`, and `0x41cbad`. All four doors' subsets partition the real bead indices, so all four doors open in the same batch exactly when the board is at identity.

The lever does not let the player accumulate different door subsets on the same board. Its callback calls `0x41cbd0` at `0x41d168`; that routine evaluates all four doors against the same board and disables all five button controls if any door admits a character (`0x41cc13`–`0x41cc8b`). On the first round it sets the board-replacement flag at `0x41d1a9`. After departure animations, `0x41bcc2`–`0x41bd27` disposes of the old generator and invokes `0x41d310`, which creates a new board; the round increments at `0x41bd37`. A second-round lever success sets the ending state at `0x41d1b2`–`0x41d1be`. This matches the guide's two boards for the full eight-character party. Animation timings were not emulated.

Accordingly, all reported distances measure **all-bead restoration on one board**, the documented way to open all four doors together. They are not minimum moves to get any character through, and an identity-unreachable board is not a no-escape or softlock claim.

## Native-confirmed identity-unreachable example

Use normal category 2 and entry RNG state **1788458156**. The selected record is 10, beginning at ZTL byte offset **1920**, with variant indices `[0,7,0]`. The seven beads receive two buttons: a 7-cycle and a 3-cycle. Both are even permutations. Their generated group is exactly `A7`, containing **2,520** states.

The native generator returns bead positions `[5,6,4,3,2,0,1]`, whose cycle form is `(0 5)(1 6)(2 4)`: an odd permutation. No sequence of those even buttons can reach the even identity state. Exhaustive reverse BFS visits all 2,520 reachable states and independently excludes this one. This is a parity proof and complete graph proof, not a search-timeout claim.

The candidate was scrambled with button indices `[0,0,1,0,1]`. The checker returns 0, so the generator accepts its first candidate after 14 RNG calls; final RNG state is 237733426. The original full generator and both original gameplay buttons were directly checked in [beetle-unreachable-native-proof.json](../local/analysis/mountain-rescue/beetle-unreachable-native-proof.json).

Partial rescue remains possible. The initial state already meets door 3's predicate. Complete forward BFS of its 2,520-state component proves that the maximum simultaneously open doors is **three**. A shortest route to three doors uses ten button presses (zero-based indices): `[1,0,0,0,0,0,1,0,0,0]`. It reaches `[0,5,2,3,4,1,6]`, opening doors 0, 2 and 3 while door 1 stays closed. Thus the example is unreachable only with respect to full restoration; it can still rescue part of a party. The predicate evidence, complete door-mask histogram, and shortest witness for each attainable door mask are in [beetle-goal-analysis.json](../local/analysis/mountain-rescue/beetle-goal-analysis.json).

This establishes behavior within the isolated generator/gameplay boundary and statically inspected lever/round logic. It does not claim how frequently a full game session encounters this entry state. The generator's preference for states outside a short restoration search should not by itself be labeled a game-breaking bug; its intent remains unknown.

## Difficulty measured on exact state graphs

For **every 266 positive-weight record/variant combination in normal categories 1–3**, the analysis enumerates the entire permutation group. These exhaustive table graphs use the raw on-disc button directions. Reversing a generator leaves its group unchanged, but can change shortest forward distances, so their diameter ranges are labeled accordingly.

Separately, the full generator was sampled at **100 specified entry RNG states per level**. Each sampled result was analyzed by complete reverse BFS to the identity/all-bead restoration target for its actual button directions. The reverse edges are an analysis technique; reported shortest witnesses use only the player's forward buttons. These are deterministic samples, not asserted uniform samples of the game's output distribution.

| Level | Exhaustive variant combinations | Reachable states in each group | Raw-direction graph diameter range | Samples allowing full restoration | Sample mean restoration moves | Sample maximum |
|---|---:|---|---:|---:|---:|---:|
| 1 | 91 | 120, 720, 5,040, 40,320 | 6–22 | 100/100 | 6.48 | 14 |
| 2 | 119 | 120, 720, 1,440, 2,520, 5,040, 40,320 | 5–24 | 99/100 | 9.60 | 18 |
| 3 | 56 | 720, 1,152, 5,040, 40,320, 362,880 | 7–21 | 100/100 | 8.04 | 19 |

The identity-unreachable level-2 sample is excluded from its mean. All selectable records were represented in the sample; no all-solved fallback occurred in these 300 runs. The synthetic fallback test separately verifies that branch.

The structural distinctions are more informative than bead count alone:

- Every level-1 variant generates the full symmetric group on its beads. There are no parity or block restrictions on reachable states, but a long cycle plus a single swap can still require many button presses.
- Most level-2 variants also generate full symmetric groups. Some split into independent position orbits. Record 6, variants `[0,1,0]`, has a two-position orbit and a six-position orbit, giving `S2 × S6`, order 1,440. Record 10's `[0,7,0]` variant instead gives `A7`, causing the unreachable example above when the scrambler changes parity.
- Sixteen of level-3 record 14's 28 variants generate a group of order 1,152: `S4 wreath S2`. Positions split into two four-position blocks, `[0,1,6,7]` and `[2,3,4,5]`; buttons permit arbitrary rearrangement within blocks and exchange of whole blocks. The other twelve variants generate `S8` (40,320 states). Thus a small change in a button changes the underlying problem structure substantially, even with the same eight visible beads.
- Record 16's three level-3 variants generate `S9`, all 362,880 permutations. More states need not mean a longer sampled optimum: extra or more powerful buttons can shorten routes.

The level-2 sample's higher mean than level 3 is a measured property of these seeds, not a claim that the named difficulty ordering is universally reversed. Human difficulty also involves understanding and planning with the operators; these metrics measure mathematical state space and shortest move count only.

Every graph's distance histogram, group order, position orbits, generator cycle types, invariant blocks, and sampled shortest witness are in [beetle-difficulty.json](../local/analysis/mountain-rescue/beetle-difficulty.json). The `examples` section retains complete generator traces for representative long-restoration and identity-unreachable cases. For compatibility, fields named `shortest_solution_length`, `shortest_witness`, and `sample_unreachable` retain their names; `method.objective` and `method.distance` explicitly define them in terms of identity/all-bead restoration, never partial rescue.

## Verification and reproduction

- **120 native full-generator cases**: 30 entry seeds for each category, covering all 21 positively weighted records; 282 candidate attempts and 2,953 RNG steps. Compared ordered move triples, final bead state, each RNG return/state, every candidate's state/checker code/depth, and scramble lengths. [Result](../local/analysis/mountain-rescue/beetle-native-parity.json).
- **6,200 native gameplay cases**: all 310 distinct shipped move patterns including reversals, each on 20 valid bead permutations; no native function stubs. [Result](../local/analysis/mountain-rescue/beetle-native-moves.json).
- **One focused native unreachable-case check**, including the two actual gameplay buttons; its generator seed is also present in the 120-case run. [Result](../local/analysis/mountain-rescue/beetle-unreachable-native-proof.json).
- **One native fallback branch test** using a synthetic two-position table. Six already-solved attempts return the solved fallback and matching final RNG state. This is explicitly not a shipped puzzle. [Result](../local/analysis/mountain-rescue/beetle-native-fallback.json).
- **Eight Python tests** cover native regression cases, every table move's permutation/composition behavior, scramble/gameplay differences, exact unreachable parity, directed shortest paths, DFS depth versus optimum, the two-block group, and fallback. [Tests](../tools/mountain_generator_test.py).

From the project root, use `research/zoombinis/.venv/bin/python` as `python` below. The model, graph analysis and tests use only the standard library; native checks additionally require `pefile` and `unicorn`:

```sh
python research/zoombinis/tools/mountain_generator_test.py
python research/zoombinis/tools/mountain_generator.py --category 2 --seed 1788458156
python research/zoombinis/tools/mountain_generator.py --difficulty --samples 100
python research/zoombinis/tools/mountain_generator.py --native-validate --native-seeds 30
python research/zoombinis/tools/mountain_generator.py --native-moves
python research/zoombinis/tools/mountain_generator.py --native-unreachable-proof
python research/zoombinis/tools/mountain_generator.py --native-fallback
python research/zoombinis/tools/mountain_generator.py --goal-analysis
```

The existing extractor now imports image libraries only inside image functions, so its shared ZTL decoder imposes no image-library dependency on the generator. Initial native checks used the bundled Python and research venv's Unicorn/pefile; the final focused proof was also checked directly with the research venv. macOS sandboxing caused Unicorn's memory mapper to receive SIGILL, so native validation required an approved unsandboxed invocation. All execution remained inside the isolated, bounded harness; no original process was launched.

## Remaining limits

The mathematical generation boundary is covered; native resource-file loading, session seeding, save/load interactions, rendering, color assignment and UI behavior are not part of this parity claim. Exact group graphs cover all normal positive-weight variant combinations, but sample statistics cover 300 selected entry states rather than all 2^32 seeds and all move-direction combinations. Category 4 and zero-weight record 13 remain preserved for further analysis and are not treated as normal difficulty levels. No original asset or puzzle has been added to the MVP.
