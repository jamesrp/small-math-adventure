# Captain Cajun’s Ferryboat — native logical specification

The four difficulty branches use **20 authored seating layouts**, selected by difficulty and eligible party count. There is no random rule or topology generator. Layout selection, the original SCRB constructor, all adjacency graphs, and placement acceptance have been compared with native execution. The executable model is `tools/spec_lj_captain_cajuns_ferryboat.py`; `local/specs/logical-journey/captain-cajuns-ferryboat.json` contains the full state contract, all 20 coordinates/graphs and resource provenance.

The source executable SHA-256 is `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. Source ranges and raw hashed slices are recorded in `local/analysis/logical-journey-captain-cajuns-ferryboat/source-evidence.json`. Models use native trait indices; only the fourth trait's feet label is independently confirmed.

## State and rules

Every incoming member has an identity and four native trait values in 1–5. The boat has 16–20 seats, each empty or occupied by one member. A proposed occupant must share at least one trait value with **every occupied neighbor**. Empty neighbors impose no constraint. The native validator checks neighbor slots in ascending index and stops at the first incompatible occupied neighbor. A bitmask accumulates all matching native attribute indices examined before that failure; this supplies matching-trait feedback.

Drag pickup frees the member's old seat before validation. A destination must be vacant; there is no swap into an occupied seat. The generic drag transaction temporarily fills a valid target, then rejection clears that target via `0x448e30`. Thus a rejected relocation also leaves the old seat empty. Members can return to the waiting bank and be rearranged without a puzzle penalty. The logical `FerryState` reproduces these settled occupancy transitions, not pointer trajectories or animation scheduling.

GO requires at least one seated member. It advances the seated subset, so partial departure is legal. Full success means seating the whole incoming party compatibly and departing. There is no attempt quota or time limit. The consecutive-rejection counter influences speech, including a draw in [3,5] for a special complaint; it does **not** force failure or departure. Layout construction never examines traits or searches for a solvable arrangement, so arbitrary supplied parties are not guaranteed a full seating solution.

## Layout selection and four difficulties

Native `0x4115c0` reads eligible count from `0x447d20`, replaced by nonzero override `0x495a4c` if present. Counts outside 16–20 become 16. For ordinary native difficulties 0–3 (UI 1–4), choose SCRB `1510 + 5*level + count - 16`. No RNG is consumed by this selection, construction, adjacency or acceptance. Native index 4 has an out-of-UI fallthrough selecting resources 0–4; the model rejects that branch explicitly.

`0x411660` traverses two SCRB frames, alternating runs at zero-shape separators. On all 20 shipped templates, seat shapes 1–3 occur in frame 0 and decorative cargo in frame 1. Seat order follows the frame's authored nonzero seat order. All seat shapes measure 44×36 pixels. A seat at `(x,y)` has rectangle `[x,y,x+44,y+36]` and member anchor `[x+22,y-7]`.

The graph builder `0x4118f0` derives adjacency geometrically. For `(L,T,R,B)`, let `d = truncate((B-T)/2)-2` (16 for these assets). Connect another rectangle if it has strict positive overlap with either `(L+d,T-d,R-d,B+d)` or `(L-d,T+d,R+d,B-d)`. UI level 4 additionally tests `(L,T-d,R,B+d)`. Exclude self, preserve ascending seat order, retain at most eight neighbors. All shipped graphs are symmetric.

| UI / native | SCRB templates | Edges for 16,17,18,19,20 seats |
| --- | --- | --- |
| 1 / 0 | 1510–1514 | 15,16,17,18,20 |
| 2 / 1 | 1515–1519 | 22,23,25,26,28 |
| 3 / 2 | 1520–1524 | 24,25,27,29,31 |
| 4 / 3 | 1525–1529 | 33,36,38,41,43 |

The predicate is identical on every difficulty. Difficulty changes authored topology and, at the fourth level, the additional geometric adjacency test. Edge counts describe constraints, not calibrated human difficulty.

## Assets and validation

The family archive is `DATA/ferry.mhk`. Layouts are SCRB 1510–1529; seat actors SCRB 1500–1502 use bitmap bank tBMP 1500; cargo shapes map to SCRB 1503–1509 and can be suppressed by the engine context. Help strings are STRL 2000/2020/2040/2060 in **DATA/zoombini.mhk**. The machine spec includes the complete archive inventory with local raw paths and hashes, plus coordinates and ordered adjacency for every layout.

Native checks passed with zero failures: **20 template-selection cases**, **20 original template-constructor cases**, **20 graph cases**, and **4,320 placement cases**. The original SCRB frame walker executes against the extracted resource words; mocked object construction records resource IDs and positions. Graph checks use original rectangle intersection; placement cases compare both acceptance and accumulated attribute mask. The report and all layout witnesses are under `local/analysis/logical-journey-captain-cajuns-ferryboat/`. Shared drag findings are preserved at `local/analysis/logical-journey-shared-drag.txt`.

From the project root:

```sh
python3 -S research/zoombinis/tools/spec_lj_captain_cajuns_ferryboat.py --write-spec
python3 -S research/zoombinis/tools/spec_lj_captain_cajuns_ferryboat.py --difficulty 3 --party-count 16
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_captain_cajuns_ferryboat.py --validate-native
```

Pure commands use only the standard library and extracted local corpus. Native comparison requires Unicorn/Capstone/pefile and the source hash guard; on this macOS host Unicorn needs approved execution outside the sandbox. All native checks are isolated memory-only emulation. Pointer movement, return animations, audio/idle RNG timing and shared checkpoint progression remain outside the logical family model; a complete native player is not claimed.
