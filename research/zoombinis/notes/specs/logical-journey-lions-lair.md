# The Lion's Lair: puzzle specification

The executable model is `tools/spec_lj_lions_lair.py`; its structured companion is `local/specs/logical-journey/lions-lair.json`. The recovered rules are lexicographic sorting with hidden categorical orders, irreversible seating, and automatic correction at a cost. Native addresses refer to the supplied Logical Journey executable, SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`.

## Inputs, state and actions

An arriving party supplies four traits per character, each with values 1–5. The normal party has at most 16 characters; the native arrays and generator also support 17–20. There are 20 numbered positions along the winding path. For a party of n, active positions are the rightmost n: `21-n` through 20. Every active slot has a hidden primary trait value and, at levels 3–4, a secondary trait value. Slot multiplicities are calculated from the actual party; they are not a fixed template.

Drag an unseated character to an empty active position. A correct placement remains there. An incorrect placement is automatically moved to an unoccupied position with the correct key, and one mistake is recorded. If several correct positions remain, the game samples one uniformly with its native bounded RNG. Characters sharing the active sorting traits are interchangeable, even when other traits differ. The original validator accepts every matching empty slot; a canonical sorted order must not be used to reject an equally valid answer.

Seated characters cannot be picked up again (`0x409217..0x409233`). A drag outside valid targets is not a committed sort guess. The model exposes settled placement actions, omitting the secret-tunnel animation and pointer movement. GO can depart with seated characters once at least one placement has started the scene. Full success seats the whole incoming party. After the mistake limit is reached, the gate closes to further placement and the remaining unseated characters are left behind. The last mistaken character is still seated and marked successful before closure (`0x409298..0x40943b`). Thus n at or below the mistake allowance can be fully seated even using only erroneous guesses when wrong choices exist.

## Exact difficulty

| UI level | Active sorting attributes | Ordering clues | Mistake limit |
|---|---:|---|---:|
| Not So Easy (1) | 1 | All five values in order | 4 |
| Oh So Hard (2) | 1 | Exactly two positions in the five-value order | 5 |
| Very Hard (3) | 2 | Exactly two positions in each order | 6 |
| Very Very Hard (4) | 2 | None | 7 |

Secondary sorting is within primary groups, not an independent partition of the whole line. The important difficulty change is the information withheld, followed by hierarchical sorting. Larger groups of identical active keys supply interchangeable slots and can make individual placements easier. Traits absent from the party still occur in the hidden five-value order and may occupy clue positions. Counting each trait's multiplicity helps locate the boundaries between groups. An error also reveals a correct position through the tunnel correction.

There is no solving time limit and correct placements do not consume mistakes. The initialized allowance is exactly 4/5/6/7 (`0x409d90`). The mistake callback increments the counter at `0x408e71`; after the correction and gate animation, `0x408ede` and `0x408ffc` close further placement when the counter equals the allowance. There is no extra off-by-one attempt. Debug-only controls can clear the scene or alter the rule; `0x409ad5` gates them behind the shared debug flag, and they are excluded from ordinary actions.

## Exact generation

`0x409e70` calls the rule generator, party histogram and slot-key construction. `0x40a090` then builds clues. The model preserves the complete native range-call trace and final RNG state at these boundaries.

1. Draw a primary attribute from four indices 0–3, remove it, then draw a distinct secondary attribute from the remaining three. Each attribute is immediately followed by its order generation, so the exact draw order is primary attribute, primary order, secondary attribute, secondary order. Both are generated even when only one is active.
2. On the first generator visit in a fresh process, the initialized flag at `0x48b766` forces the primary attribute to index 2 and clears itself. The initial attribute draw is still consumed. Later visits use the sampled index. The source image initializes this flag to 1. Trait indices are retained to avoid assuming a visual name from incidental labels.
3. Generate each five-value order by drawing an index from the remaining pool, removing that item, and repeating. The final constant range call `R(1,1)` returns 1 without advancing the underlying RNG, but remains in the range trace. There is no balancing, retry or solvability filter.
4. Count primary values and primary/secondary pairs in the party. Concatenate groups according to the sampled orders to fill the n active slots. Every party member therefore has a compatible slot.
5. Level 1 reveals the entire primary order. Level 2 draws two distinct order positions. Level 3 independently draws two distinct positions in each order. These branches first call the constant range `R(2,2)`, then sample positions without replacement. Level 4 uses no clue draws. Native glyph code is `value+5*attribute_index`, with zero for an unrevealed position.

Initial rule selection is independent of party distribution. The same trait rule produces different slot boundaries for a different party. Later wrong guesses consume additional native randomness only when selecting their corrected slot (including a constant range call for a unique correction). Ambient and animation random calls outside these function boundaries are not assigned a fabricated session seed.

A zero-mistake witness sorts the party by the hidden key and places its members into the corresponding slots. If the active-key multiplicities are c₁,…,cₖ, the number of valid final assignments of distinct characters is `∏ cᵢ!`. This is exact; no unique solution is claimed. The model can enumerate valid positions at every step.

## Evidence, assets and verification

The source scene archive is `DATA/caves.mhk`; shared characters and help are in `DATA/zoombini.mhk`. Resource-level offsets, names and decoded animation frames remain in the extraction manifest. Help STRL 2600/2620/2640/2660 and manual PDF pages 30/41 corroborate ordering, clues, correction and the GO action. The structured spec binds both archives by hash.

The differential suite compares all generated orders, attribute choices, active slot keys, clue masks/glyphs, budget and complete RNG traces against original `0x409d90`, `0x409e70` and `0x40a090`. Fixtures cover every level, sizes 1/2/7/16/20, mixed and identical parties, and both first-visit flag states. Placement tests run original `0x40a420` against occupied positions, valid choices, wrong positions, and diagnostic out-of-range/no-compatible-slot inputs. The latter helper returns fallback slot 1 when no compatible slot exists; this is unreachable with a legal remaining party and must not become a new player action.

Run `research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_lions_lair.py --count 100`. Exact results are in `local/analysis/logical-journey-lions-lair/validation.json`. The oracle substitutes only party/entity access and an inert graphics completion helper; native RNG and rule instructions remain unchanged. Complete model witnesses and native final-mistake gates are also checked. Pixel hit testing, exact animation callback timing, campaign persistence and session-wide random consumption are outside this discrete puzzle specification.
