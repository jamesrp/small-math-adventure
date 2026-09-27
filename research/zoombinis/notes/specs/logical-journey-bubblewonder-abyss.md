# Bubblewonder Abyss — native board and event specification

The tool `tools/spec_lj_bubblewonder_abyss.py` exports exact source-generated boards and exposes original logical event callbacks in an isolated native backend. The machine spec is `local/specs/logical-journey/bubblewonder-abyss.json`. **This is not yet a complete standalone timing model:** the ordered animation events are explicit inputs. Marker event and sound meanings are now verified; native clock and linked-object traversal have not been integrated into a standalone replay loop. Simultaneous bubbles make this a material gameplay boundary.

All native calls are guarded by executable SHA-256 `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`. Function slices, exact resource paths and hashes are in the machine spec. No Windows game process runs.

## Generation and difficulty

The maze is a 13×13 grid, indexed `13*x+y`. An authored template in `maze2.mhk` contains ten header words (node count and up to nine launch-entry IDs), then ten words per node: kind, x, y, color group, four permitted-direction flags, initial direction, and whether the node cycles after use. All ten templates, including an apparently unused one, are preserved.

| UI / native level | Normal visit templates | Nodes | Condition generator |
|---|---|---:|---|
| 1 / 0 | 16600, 16601 | 16, 19 | 0x427a00 |
| 2 / 1 | 16602, 16603 | 19, 28 | 0x428030, 0x4283a0 |
| 3 / 2 | 16604, 16605 | 29, 27 | 0x4283a0, 0x428d00 |
| 4 / 3 | 16606, 16608 | 38, 42 | 0x429450 |
| 4 with fewer than 5 members / internal 4 | 16609 | 30 | 0x428d00 |

The first three visit counters alternate 0/1. Native level 3 increments by two and resets after two, alternating 0/2; therefore template 16607 is not reached by the normal initialized cycle. It is still decoded and cataloged. A small-party override occurs before selection and does not advance native-level-3 history.

Generation first assigns fixed color sprite base 31 to group 1, then rank-shuffles seven other bases among groups 2–8. Party-conditioned code chooses trait predicates; conditional nodes consume these predicates in authored order. The source backend executes every branch, retry, and random call rather than substituting a plausible independent generator. Each export contains party, input/output history, template bytes/hash, predicates, nodes, input/output RNG state, and every ordered RNG call. Node construction then consumes one speed draw in [20,25] per node. Rendering is stubbed; the uninitialized, irrelevant trait words on non-conditional nodes and decorative frame counters on traps/waiting nodes are excluded from logical comparison.

The helper structure is also identified: 0x427d20 copies party traits; 0x427d80 filters matching actors and counts remaining trait occurrences; 0x427ea0 selects the first maximum-frequency trait within specified bounds; 0x427f10 limits that selection to a feature family and scans codes 1–19, retaining the source's endpoint; 0x427f70–0x428010 construct absent-trait or fallback candidate sets. Their callers and exact control flow are retained as hash-checked source slices.

## Player state and actions

The state includes each bubble's identity, four traits, direction, previous/current grid cell, current ledge and passed flag; mutable arrows and held bubbles; cell reservations; active bubble IDs; and the original event queues. Directions are 0=up, 1=right, 2=down, 3=left. A move clamps coordinates to 0…12.

Launch is permitted only for a selectable, currently inactive actor, fewer than ten active bubbles, the global launch lock clear, and an enabled empty entry slot within that actor's ledge-specific drag rectangle. All fourteen entry positions, directions and ledge associations are exported from native tables. Enabled entries come from the template header. Launch reserves that entry until its bubblemaker callback releases it. For horizontal entry directions, the initial destination equals the authored entry coordinate; vertical entries advance one cell. This source detail differs from the general grid-step helper.

On arrival:

- Empty cells continue straight.
- Conditional arrows redirect matching actors and otherwise preserve direction.
- Ordinary and colored arrows redirect first, then cycle to the next enabled direction if their authored cycle flag is set.
- Waiting nodes hold one actor without advancing it.
- Colored switches iterate group members in reverse creation order. They rotate every kind-4 arrow and release every kind-5 held actor. Group 1 is a no-op; groups 2–8 are active.
- Moving into an already occupied waiting node releases its previous actor and changes that actor's direction to the incoming direction.
- Trap nodes start the original popping callback. Its cleanup removes the active bubble; its completion queues a return with the same ledge ID. These isolated functions do not clear a passed flag or decrement a mistake counter.
- Fixed edge kinds 20…23 set ledge 0…3. Kind 23 immediately marks the actor passed and enables GO after the first crossing.

GO permits the crossed subset to leave. There is no recovered fixed rejection budget or countdown. Remaining bubbles can be trapped, cycling, or stranded by the current board state. The manual's general warning about returning actors to Shade Tree Base Camp must not be substituted for the verified callback behavior: the stage callback preserves a return ledge, while journey departure separately handles members not marked passed.

## Event order and concurrency

`EventOracle.event(identity,event,callback)` executes original callbacks. Callback 0x4270f0 takes reservation events 20/30/40/50 only when actor word +0xc8 equals 3. The first reservation stores that actor; the second queues the pair and clears the reservation. A third after that reset starts a fresh reservation. Events 21/31/41/51/61 queue arrival. All other event values are ignored by that callback.

`EventOracle.drain()` runs source 0x425897…0x425db5. It drains launch requests, released actors, sorting/cleanup, landed actors, arrivals, then collision pairs. Queues are LIFO. Consequently, arrivals supplied together run in reverse input order, and a waiting actor released by a switch during the arrival phase moves in the **next** queue pass. Collision dispatch chooses direction-dependent animation programs. Those programs' future callbacks must be supplied by the caller; callbacks are not idempotent, so synthetic duplicate cleanup events change state incorrectly.

Callback 0x4267a0 event 92 removes active IDs and owned reservations and queues non-final actors to land; event 91 also handles final cleanup. Its −1 event queues landing. Trap callback 0x426a80 event 92 removes active/reservation state but waits until −1 to enqueue the actor's return. These distinct callback contracts are preserved rather than collapsed into one generic completion.

## Validation and reproduction

Passed with zero failures: **96 source-generated board exports**, **2,496 independent logical-node comparisons**, and **1,098 native rule/event/queue cases**. The latter comprise 900 local rules, 32 occupied-destination releases, 120 color triggers, 24 reservation/arrival cases, 8 cleanup/return traces, 4 trap dispatches, 4 landings and 6 original queue passes. Reports and exact exports are under `local/analysis/logical-journey-bubblewonder-abyss/`.

```sh
python3 -S research/zoombinis/tools/spec_lj_bubblewonder_abyss.py --write-spec
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_bubblewonder_abyss.py --validate-native
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_bubblewonder_abyss.py --validate-events
research/zoombinis/.venv/bin/python research/zoombinis/tools/spec_lj_bubblewonder_abyss.py --generate --level 3 --party-json '[[1,1,1,1],[2,2,2,2]]' --state 0x12345678
```

Spec writing and saved-board interpretation require only standard Python. Generating new exact instances and native event execution require the local guarded executable and native packages; Unicorn needs approved execution outside the macOS sandbox. Runtime animation scheduling, rendering and whole-session collision traces are not claimed as verified.

## Shared animation marker recovery

The shared export `local/analysis/logical-journey-titanic-tattooed-toads/animation-event-contract.json` now gives an event and optional sound for each frame. Source 0x4585c6…0x458614 consumes an extra sound word for FE-prefixed markers. A zero low byte means no event; otherwise the event is the low byte minus one. The event callback runs before the per-frame callback. Native comparisons passed for **3,396 frames across 293 lilly/maze2 SCRB resources**. The one excluded resource, lilly SCRB 10169, has a frame with at least 24 layers and needs the parser's continuation path. This is a shared test count, not another 3,396 Bubblewonder-only cases.

The engine clock gate is also source-linked: `now >= actor.deadline`, then `deadline = now + actor.step`. Linked actor groups use separate synchronization arrays. Event meanings are therefore resolved; a complete ordered clock/frame/linked-actor replay loop is still unverified. The pure helper `animation_events(archive, resource)` and native parser test live in `tools/spec_lj_toad_scheduler.py`.
