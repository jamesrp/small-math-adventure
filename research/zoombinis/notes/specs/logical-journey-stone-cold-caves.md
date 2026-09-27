# Stone Cold Caves — native logical specification

The rule generator, four difficulty branches, cave acceptance, ordered guardian feedback, easiest-level fixed coordinate, and rejection budget have been recovered from the supplied executable. The executable model is `tools/spec_lj_stone_cold_caves.py`; the complete machine-readable contract, resource inventory and source hashes are in `local/specs/logical-journey/stone-cold-caves.json`. This is a logical specification, not a reconstructed renderer or callback scheduler.

The source executable SHA-256 is `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. Raw function slices and their addresses/hashes are under `local/analysis/logical-journey-stone-cold-caves/source-evidence.json`. Native trait attributes remain numbered 1–4; the fourth is feet, but the first three labels are not independently renderer-verified.

## State and actions

The input is an ordered party of 1–16 distinct identities, each with four native trait values in 1–5. A member can wait, enter a cave path, fail and return, or pass. Native cave IDs 1–4 run left to right (entry marker SCRB 5000–5003). The rule occupies 30 bytes at `0x4a2c48`: a two-byte axis count followed by two 14-byte axis records containing orientation, term count, native attribute IDs and values.

For an axis, OR its feature equalities, then XOR the result with `orientation == 0`. Caves 1, 2, 3, 4 require respectively `(1,1)`, `(1,0)`, `(0,0)`, `(0,1)`. The first guardian's failure takes priority; if the first accepts but the second rejects, the feedback identifies the second. The native validator `0x452ca0` returns 0 for acceptance and 1 for rejection, with a separate output indicating first-guardian acceptance.

On UI level 1, only the first axis is generated. The reset's fixed-coordinate bit supplies the other coordinate: bit 1 disallows caves 1/4, bit 0 disallows caves 2/3. The gameplay modifier is `0x45119c`. Every valid trait tuple therefore still has exactly one accepted cave.

Only rejections consume the shared budget: UI levels 1–4 begin with 16, 18, 20, 22 respectively. At zero the cave closes, pending/waiting members return to the waiting side, and no further attempts are accepted this visit. Successful passages consume no budget. GO may advance any nonempty passed subset, including before the full party passes; during closure the collapse animation must finish first. The family does not impose a timer.

The native attempt queue holds up to five records (`0x452440`), corresponding to the current passage and four path waiting spots. `CaveState` offers settled atomic attempts and an ordered-queue projection. Exact pointer motion, queue editing during animation, callback timing and audio timing are outside that projection; the full event loop was not emulated. Shared checkpoint progression and zero-survivor navigation are outside this family contract.

## Four generators

| UI / native | Axis family | Candidates per axis | Rejection budget |
| --- | --- | ---: | ---: |
| 1 / 0 | One single-feature predicate plus fixed second coordinate | 20 | 16 |
| 2 / 1 | Two single-feature predicates | 20 | 18 |
| 3 / 2 | Two predicates, each OR of two values of one attribute | 40 | 20 |
| 4 / 3 | Two predicates, each OR of features from two different attributes | 150 | 22 |

Candidate enumeration reuses the independently recovered bridge enumeration: native attributes descend, values ascend; same-attribute pairs use 12,13,14,15,23,24,25,34,35,45; cross-attribute pairs are (4,3),(4,2),(4,1),(3,2),(3,1),(2,1), with the first value advancing fastest.

UI level 1 counts each single feature. If the previous cliff's unique-rule word and count are nonzero, and another positive feature count differs from that count, **all** candidates with the previous count are excluded. Search bucket counts in the exact sequence `floor(n/2), floor(n/2)+1, floor(n/2)-1, floor(n/2), floor(n/2)-2, …`; only counts 1–15 qualify. Draw a rank in the first populated bucket, then one orientation bit. The model explicitly rejects parties/history for which that native search cannot terminate rather than silently repairing them.

UI levels 2–4 enumerate ordered pairs in row-major order, excluding equal candidate indices. For each pair, count members in its four Boolean quadrants. Maximize the number of nonempty quadrants, then minimize the sum of the six absolute differences between quadrant counts. Draw a rank among exact ties, then two orientation bits. This is deterministic filtering and rank selection, not rejection sampling. Four nonempty caves are preferred but not required when the incoming party cannot populate them.

Reset `0x4505b0` draws a fixed-coordinate bit on **every** level. It also clears the previous cliff history when context flag `0x4a2188` is nonzero; this flag's global mode meaning is not assumed. Generator-entry RNG parity starts at the actual initialized state supplied to the selected generator. Presentation callbacks can consume additional shared RNG outside that boundary. The LCG is `state = (214013*state + 2531011) mod 2^32`, returning `(state >> 16) mod (u16(max)+1)`; max 0 returns 0 without advancing.

## Assets and validation

The family archive is `DATA/tunnels.mhk`. The spec includes every extracted resource's identity, byte range and SHA-256. Entry markers are SCRB 5000–5003; guardian base poses 6000–6003; loaded guardian animation/sound banks 4000–4699; collapse actors include 7000/7001. Difficulty help is STRL 1800/1820/1840/1860 in **DATA/zoombini.mhk**. Palette fidelity limitations from the shared extraction report still apply.

Native comparisons passed with zero failures: **208 generator cases**, **11,200 validator cases**, **52 previous-cliff-history cases**, **64 fixed-axis modifier cases**, **44 rejection-budget cases**, and **8 reset cases**. Generator cases cover four initialized RNG states, all four difficulties, and 13 deterministic parties of sizes 1, 4 and 16. Reports retain source hashes, boundaries and witnesses in `local/analysis/logical-journey-stone-cold-caves/`. Allocator, supplied-party and resource-reset services are explicit stubs; the original generator, validator, counter and RNG machine code executes. No Windows process is launched.

From the project root:

```sh
python3 -S research/zoombinis/tools/spec_lj_stone_cold_caves.py --write-spec
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_stone_cold_caves.py --validate-native
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_stone_cold_caves.py --validate-state
```

Pure imports, generation and spec writing use only the standard library. Native checks require the local guarded executable, Unicorn, Capstone and pefile; this macOS environment requires approved execution outside the sandbox for Unicorn memory mapping. The checks are bounded memory-only emulation.
