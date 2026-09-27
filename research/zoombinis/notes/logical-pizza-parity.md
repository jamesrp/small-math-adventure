# Pizza Pass: preference generation and difficulty

The four-level preference generator and its numeric feedback helper are reconstructed in [`logical_pizza_generator.py`](../tools/logical_pizza_generator.py). **520 complete generator cases, 7,200 feedback cases and all four native parameter branches matched the original x86.** The comparison checks the entire random-call trace, preferences, active ingredients, pit-constructor arguments and final random state. This is isolated function parity, not the full encounter's speech, UI or success state machine.

## What changes with difficulty

Levels below are displayed levels 1–4, corresponding to native values 0–3.
“Slot” means a binary ingredient/food preference position; the model retains numeric IDs rather than guessing all artwork labels.

| Parameter | Level 1 | Level 2 | Level 3 | Level 4 |
|---|---:|---:|---:|---:|
| Preference slots | 5 | 7 | 7 | 8 |
| Slots eligible to be liked | 5 | 6 | 7 | 8 |
| Troll preference groups | 1 | 2 | 3 | 3 |
| Minimum slots liked by someone | 2 | 3 | 3 | 4 |
| Inclusive `R(1000)` threshold, accept if below | 500 | 800 | 1,000 | 1,000 |
| Ensure each troll likes something | By minimum above | **No** | Yes | Yes |
| Initial pit examples | None | None | None | Four rejected pairs |

At level 2, zero-based slot 4 is excluded from the union of liked ingredients. At every level, each active slot belongs to exactly one troll: preferences are disjoint. Unselected slots are liked by nobody. Level 2 can assign every selected slot to the same troll, leaving the other with an empty preference set. There is no native repair for that case. Levels 3–4 explicitly repair empty groups.

The increase is therefore not simply “more toppings.” Level 1 identifies one hidden subset. Level 2 partitions active items between two labeled preferences while also allowing unused items and one empty group. Level 3 introduces a third group and guarantees all groups are nonempty. Level 4 adds another item and pre-existing evidence whose construction deliberately spans all three groups.

## Exact generation procedure

1. Clear three preference vectors and the active-slot mask.
2. Make a complete left-to-right pass over all slots. Draw `R(1000)` for **every** slot, including already-selected slots and the excluded level-2 slot. If the draw is below the level's threshold, the slot is not excluded, and it is not already active, add it to the mask. Repeat complete passes until the minimum active count is reached. Do not stop midway through a pass.
3. At level 1, copy the mask to troll 0. At higher levels, visit active slots in order and draw `R(troll_count-1)` to assign each to one troll.
4. At levels 3–4, visit empty groups in order. Choose the larger of the other two groups as donor; a tie selects the latter of those two groups in ascending index order. Draw random positions from the entire slot range until one belongs to the donor; move that slot to the empty group. Continue until every group is nonempty.
5. At level 4, select the largest group, breaking ties toward the lowest index. Randomly probe the entire slot range to select two distinct members of that group, and one member from each of the other groups, in ascending group order. If the returned tuple is `(a,b,c,d)`, then `a,c` share a preference group and `b,d` belong to the two other groups.
6. The pit constructor uses the adjacent pairs `(a,b), (b,c), (c,d), (d,a)`. Thus all four pairs mix groups and none is wholly liked by any one troll. The tuple is dynamically verified; the constructor's pair writes are independently checked in the native listing. Rendering is excluded.

The random helper is the original Logical Journey recurrence:

```text
state = (214013 * state + 2531011) mod 2^32
R(maximum) = (state >> 16) mod (uint16(maximum) + 1)
```

An inclusive maximum of zero returns zero without advancing the state. The API's `seed` is an **initialized state at generator entry**. It does not reproduce the game's time-based startup seed or earlier random calls. Threshold 1,000 does not mean certainty: the random result can equal 1,000. Likewise 500 and 800 are not exact 50% and 80% probabilities; the range has 1,001 outputs and modulo bias is preserved.

## Feedback and its information content

For a proposed subset `P` and one troll's hidden preference set `L`, the native helper returns:

| Condition | Native result |
|---|---:|
| Exactly one unwanted item: `|P − L| = 1` | 0 |
| Two or more unwanted items | 4 |
| No unwanted items and every liked item included: `P = L` | 2 |
| No unwanted items but some liked items omitted: `P` is a proper subset of `L` | 1 |

An unwanted item takes priority over whether liked items are still missing. For an empty preference group, an empty proposal therefore returns 2. The tests exhaust every binary proposal for every generated troll preference in five selected entry states per level. They establish the numeric helper, including empty proposals; they do not establish that every proposal is reachable through the UI or exactly which troll speaks in the complete encounter.

This feedback distinguishes partial compatibility, exact completion and two kinds of incompatibility. Interpreting the player's full decision problem also requires the later troll-selection and speech-routing code. No optimal experiment count or human solve-time claim is made here.

## Structural counts and measured variation

The number of labeled preference configurations compatible with the decoded constraints is:

| Level | Structural hypothesis count before pit evidence | Observed active-slot histogram, 10,000 entry states |
|---|---:|---|
| 1 | 26 | 2: 3,634; 3: 3,855; 4: 2,058; 5: 453 |
| 2 | 656 | 3: 821; 4: 2,408; 5: 4,094; 6: 2,677 |
| 3 | 10,206 | 5: 1; 6: 67; 7: 9,932 |
| 4 | 46,284 | 6: 1; 7: 77; 8: 9,922 |

These are combinatorial spaces, not a proof that every configuration occurs for some 32-bit seed. They are not uniform distributions, Shannon entropy estimates or calibrated difficulty scores. Level 4's initial pit evidence reduces what a player still needs to infer, so the raw count alone cannot measure its difficulty relative to level 3.

For `n` eligible positions, choose `k` active positions. Level 1 sums `C(5,k)` for `k≥2`. Level 2 sums `C(6,k)·2^k` for `k≥3`, because empty groups are allowed. Levels 3–4 sum `C(n,k)·(3^k − 3·2^k + 3)` over the allowed `k`, because assignments must use all three labeled groups.

The histogram uses consecutive integer entry states 0–9,999. It characterizes that reproducible sample, not real play-session frequencies. Level 2 produced **863 boards with an empty troll preference** (8.63% of this sample); levels 1, 3 and 4 produced none. Levels 3–4 usually activate every slot, but their rare omissions are real generator behavior. Full pass counts, repair counts, group-size tuples, distinct sampled preferences and random-call counts are retained in [`difficulty-analysis.json`](../local/analysis/logical-journey-pizza/difficulty-analysis.json).

## Native boundary and provenance

Source: `local/discs/logical-journey/INSTALL/HD/Zoombinis Logical Journey.exe`, SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`.

| Evidence | Native address |
|---|---|
| Difficulty parameter branches | `0x431c9e`, `0x431d90`, `0x431ea9`, `0x431fd1`; stop at `0x432138` |
| Complete preference generator | `0x434030` |
| Active-slot sampler | `0x435340` |
| Random member of a preference group | `0x434420` |
| Numeric feedback | `0x4344a0` |
| Pit constructor | `0x437a00` |
| Original bounded random helper | `0x40f9a0` |

Globals: difficulty `0x49bc36`, slot count `0x49bc56`, minimum active `0x49ba0a`, threshold `0x49bb6c`, mask `0x49bbc8`, preference vectors `0x49ba34/0x49bb44/0x49bc38`, proposal `0x49bc24`, RNG state `0x4959d0`, lazy-seed flag `0x48bc28`.

The oracle runs original arithmetic, branching, random selection and memory clearing in isolated emulated memory. The final pit constructor is replaced by an argument recorder. In the separate parameter tests, graphics factory `0x455db0` returns zero and pops 32 argument bytes; registers `EBP=1`, `ESI=7`, `EDI=3` supply the established branch-entry context. These initialization fragments verify parameters without claiming full scene initialization. The ordinary positive minimum-active parameters are the model's supported domain; the sampler's unused zero-minimum fallback is outside it.

Generation tests cover states 0–127 plus `0x7fffffff` and `0xffffffff`, at all four levels. Feedback tests use states 0, 1, 7, 31 and `0xffffffff`. [`native-validation.json`](../local/analysis/logical-journey-pizza/native-validation.json) records the result, examples and boundary. [`native-provenance.json`](../local/analysis/logical-journey-pizza/native-provenance.json) records each evidence slice's executable offset, virtual-address range and SHA-256; raw slices and correctly aligned disassembly remain beside it under ignored `local/`.

Run from the project root:

```sh
python3 research/zoombinis/tools/logical_pizza_generator.py --analysis-seeds 10000
research/zoombinis/.venv/bin/python research/zoombinis/tools/logical_pizza_generator.py --native --seeds 128 --analysis-seeds 10000
```

The first command requires only the standard library. The second uses the shared native oracle and pinned native dependencies. On this host Unicorn needs approved execution outside the restrictive sandbox. No original Windows process, filesystem, network or game UI is provided.

Remaining work for operational puzzle parity: food-label mapping, which troll is selected for feedback, message semantics, offer/mistake limits, scene/session progression and the complete success condition. These are separate from the preference and numeric-feedback functions now recovered.
