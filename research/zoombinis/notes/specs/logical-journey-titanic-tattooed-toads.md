# Titanic Tattooed Toads — native specification

Board generation, roster generation, toad route scoring and hopping, crab route scoring and hopping, swap allowance and crossing limits are recovered. The pure model is `tools/spec_lj_titanic_tattooed_toads.py`; the machine spec is `local/specs/logical-journey/titanic-tattooed-toads.json`. **Whole-session parity remains incomplete**, but the original actor scheduler, repeated crab spawning and concurrent reservation callbacks are now executable in `tools/spec_lj_toad_scheduler.py`. They take explicit clock/frame/event inputs. Shared marker meanings are verified; integrating the complete engine object traversal and linked animation timing is still required. The older `ToadState` helper remains a simplified settled projection and should not replace this backend.

All results use executable SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. Hashed raw function slices, exact addresses and local resource hashes accompany the machine spec. No Windows process executes.

## Board, rules and actions

The board has 12×12 playable pads. Each carries three native attributes with respectively 3, 4 and 5 values. Native cell storage has a thirteenth padding column used for exit reservations; its stride is 14 bytes. The 12 toads represent every attribute/value pair once, in a randomized display order. Incoming Zoombini traits do not affect this puzzle, only party count and rider order.

A toad may be placed only on an unoccupied matching pad in the leftmost column. The next waiting member boards it. It follows matching orthogonal pads. A successful crossing increments that toad's completed-crossing byte: the first crossing returns it to the bank and the second retires it (`0x41c3af..0x41c406`). A wrong route can strand its rider. Blocked hopping is retried rather than immediately counted as permanent loss. GO requires at least one completed crossing and allows that crossed subset to advance; it need not wait for the full party.

Higher levels permit swapping two unoccupied pads. Swap all three attributes and the composite sprite, keeping coordinates fixed. Selecting the same pad twice consumes no swap. Swapping clears both cells in active actors' score maps and replans affected feature routes. There is no separate launch quota or timer. Each toad has two successful crossings; swap availability is finite.

## Exact generation

Three authored 144-word big-endian REGS resources, 15000–15002 in `DATA/lilly.mhk`, provide path IDs 1–3, 4–7, and 8–12. Their zero cells are holes in that feature plane. Board generator `0x41d930` transforms and combines these planes:

1. On UI levels 3/4, select one plane and rotate it clockwise for perpendicular crab paths. If `ceil(party_count/2) < 8`, UI 3 draws in [3,5] and UI 4 draws in [4,5]; otherwise both use 4. Subtract 3 for the plane index.
2. Draw [0,2]. Result 0 rotates all planes by 180°; result 1 draws a horizontal/vertical reflection independently for each plane; result 2 leaves them as they are.
3. Select path IDs for corruption by rank deletion without replacement. UI 1 preserves `ceil(party_count/2)` paths; higher levels select all 12 for corruption.
4. Permute the attribute values within each of the 3/4/5-value families, using rank deletion in that order. Singleton draws do not advance the RNG.
5. Visit cells in row-major order, then planes in order. At row and column at least 2, each corruptible path whose mutation counter is below 2 draws [0,100]. Mutate on a result greater than 75, or in the last row if its counter is still zero. Ordinary path IDs cycle to the next ID within their family. The perpendicular family retains its original ID but **still counts the mutation**. Resolve through the permuted feature labels.
6. Fill missing attributes with draws [0,2], [0,3], [0,4], in attribute order. Capture the first 2/3 perpendicular path labels on row 0 as crab seeds. On UI 2–4 make two fixed swaps, `(row4,col4)↔(row6,col3)` and `(row3,col8)↔(row5,col10)`.
7. Set swaps per stick segment to `ceil((counted_mutations+5)/6)`. There are six segments. UI 1 has no stick. The total allowance is therefore six times that threshold, not a fixed number by difficulty.

The difficulty setter writes 0/4/5/6 to `0x497588`, but the executable never reads this word. It is not the live swap allowance. UI 1/2 have no crabs; UI 3/4 have 2/3 initial crab seeds.

There is a native counter alias worth preserving: the generator clears 24 bytes at `0x499884` but indexes mutation counters with IDs 1–12. Counter 12 consequently lies outside that cleared range, at `0x49989c`, the swap sound cycling counter. Its previous value changes later generation and RNG consumption. The model exposes it as `shared_swap_sound_counter` rather than resetting it silently.

The separate roster generator `0x41cb90` repeatedly draws a remaining tattoo rank and then an idle speed in [3,6]. It always builds 12 toads, covering all tattoos once. Its RNG state is a separate entry boundary because engine initialization lies between board and roster creation. Both generators use the shared LCG `state=(214013*state+2531011) mod 2^32`, inclusive modulo bounds, with no state advance for a singleton choice.

## Exact movement cores

Toad planning (`0x41f4d0`, `0x41f8f0`, `0x41fc10`) uses two bounded visit-count walks followed by pruning. Each forward walk is capped at 200 iterations. It explores toward column 11, retries toward the furthest column reached, then clears a path by following recorded visit numbers. The implementation preserves the native direction updates and strict comparisons.

Actual toad hopping (`0x41c770`) checks N,E,S,W cyclically from its current direction. It chooses the matching unoccupied neighbor with the lowest visit count strictly below the current count; the first tie wins. It reserves the destination and assigns current count plus one. The right-edge exit is considered during the same scan and can wait for its reservation to clear. If the current score reaches 10,000, scores reset. The original visit planner ignores occupancy; the actual hop checks it.

Crab maps (`0x41f570`, `0x41f750`) use multi-source breadth-first search from the lowest still-unassigned matching row, progressing from row 11 toward row 0. Neighbor order is N,E,S,W. Each matching connected component records distance to its bottommost row. The actual crab step (`0x420160`) takes the first unoccupied matching N/E/S/W neighbor with a smaller distance, exits at the bottom edge, or waits. These exact cores are also used by the newly recovered source-backed scheduler below.

## Validation and assets

All comparisons passed with zero failures: **96 board-generator cases**, **32 shared-counter history cases**, **8 roster cases**, **96 toad route-planner cases**, **48 crab BFS cases**, **400 toad hop cases**, and **400 crab hop cases**. Board checks compare all 432 attribute bytes, feature mappings, crab seeds, swap threshold and exit RNG state. Route checks compare complete score/distance fields; hop checks compare animation IDs, directions, updated visit fields and occupancy reservations. Reports are under `local/analysis/logical-journey-titanic-tattooed-toads/`.

The machine spec carries the entire `lilly.mhk` resource inventory, raw paths and hashes. Path planes are REGS 15000–15002; coordinate vectors REGS 100/101; pad bitmap bank tBMP 13000; toad idle actors SCRB 10043–10054; toad hop IDs 10001–10004 and 10031; crab hop IDs 10071/10077/10073/10075 and 10069; stick frames 10078–10084. Help STRL 2100/2120/2140/2160 is in `DATA/zoombini.mhk`. Native attribute indices are stable; full renderer labeling/palette composition remains separate.

From the project root:

```sh
python3 -S research/zoombinis/tools/spec_lj_titanic_tattooed_toads.py --write-spec
python3 -S research/zoombinis/tools/spec_lj_titanic_tattooed_toads.py --difficulty 3 --party-count 16 --state 0x12345678
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_titanic_tattooed_toads.py --validate-native
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_titanic_tattooed_toads.py --validate-movement
```

Pure commands need only standard Python and the extracted corpus. Native tests use the guarded local executable with explicit service stubs; Unicorn requires approved execution outside the macOS sandbox. Full original-process execution and full-session timing parity are not claimed.

## Recovered actor scheduler and spawn lifecycle

`SchedulerOracle.tick(now)` executes original code 0x41a71d…0x41acf2. The phase word alternates: phase 1 processes toads and sets 0; phase 0 processes crabs and sets 1. UI levels 1/2 still alternate, but have no crab work. A swap/motion lock at 0x4976ca suppresses the motion block. Ready queues are LIFO; old deferred actors are appended in reverse before draining, giving them priority over newly queued actors. An actor whose deadline is in the future or has no legal hop is deferred again.

Toad event 11 copies the previous cell and advances the current cell in the chosen direction. Destination occupancy was already reserved by the hop selector. Event 12 releases the previous pad. Event 10 commits position, queues the next move and sets its deadline to `now+30`; event 15 queues without resetting that deadline. Native toad eligibility is `now >= deadline`. Competing toads consequently cannot both claim the same destination: the later ready entry wins its reservation and the other waits.

On UI levels 3/4, crab spawn attempts require `now > spawn_deadline` (strict), fewer than 20 live crabs, and the departure animation count clear. A seed's top pad must be free, or occupied with the source's authored path marker equal to 1. A free pad creates a normal crab; the occupied-marker case creates a special uncolored crab. The seed index advances after every due attempt, including a blocked one; the deadline advances to `now+720` only after successful construction. Constructor 0x41cde0 consumes a speed draw in [4,7]. Normal crab features come from the first seed's axis and the **current** top pad value, so later swaps affect later spawned crabs.

Special mode is not ordinary BFS movement. Function 0x420440 moves down one row, even through an occupied cell with a nonzero authored marker. On reaching a free pad, it takes that pad's feature value, reserves it, and sets a flag. On its next scheduler step it clears special mode and queues a route replan. It exits at the bottom. This branch is now retained in the source backend.

Crab per-frame callback 0x41b660 moves grid coordinates at frame index 0, releases the old pad at index 6 for normal-mode crabs, and at index 7 commits the position, queues the next move and sets deadline `now+35`. Event 70 queues a newly appeared crab; event 80 frees its cell, removes it from the live array/count, and queues object deletion. The crossing callback event 30 increments success count, enables GO on the first success, queues first-trip return or second-trip retirement, and marks the linked real party actor passed.

The new scheduler tests passed **87 cases**, including deadline boundaries, all four levels, spawn cap and occupied starts, seed rotation, actor reservation contention, special crab routing, crab exits and both crossing limits. They are additional to the earlier 1,080 generator/movement cases.

## Resource events and remaining integration

The recovered shared engine parser maps each FE/FF frame marker's nonzero low byte to event `lowbyte−1`; zero means no event. FE markers also carry a sound resource word. The event callback executes before the per-frame callback. For example, SCRB 10001 emits events 11,12,13,14,14,14,10 around its hop frames; its first frame has no event.

`animation-event-contract.json` exports that meaning for all tested lilly/maze2 SCRB scripts. The native parser passed **3,396 frame comparisons across 293 resources**; lilly SCRB 10169 is explicitly excluded because a frame reaches the 24-layer continuation path. Source slices cover 0x458180…0x4586aa, including the animation clock gate and linked-actor synchronization. This shared count also supports Bubblewonder and must not be counted twice across families.

The native animation clock checks `now >= deadline`, then advances the deadline by the actor's frame step. The source-backed scheduler plus ordered original frame events gives a reproducible logical interface. A complete replay integration still needs the engine's object traversal, linked actor synchronization and generated actor graph; these are not merely drawing details. `ToadState` continues to omit them.

```sh
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_toad_scheduler.py
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_toad_scheduler.py --validate-markers
```

These native commands require the same approved Unicorn execution described above. Importing the pure marker helper does not require native packages.
