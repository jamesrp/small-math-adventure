# Logical Journey player audit: campaign and Hotel rendering

This bounded milestone-0 audit was made for the separate `business/zoombinis/` player. It collates the extracted 2001 Windows edition's manual, embedded help, current Hotel native comparisons and decoded image manifest. It does **not** establish a native campaign transition implementation or a complete original renderer. Existing family contracts and their evidence remain authoritative and unchanged.

## Campaign requirements and evidence boundary

Source: `local/manuals/logical-journey.txt`, PDF pages 9–15, 19, 20, 24, 28, 29 and 33; matching embedded `DATA/zoombini.mhk` STRL 1300, 1400, 1500 and 1600 in `local/derived/logical-journey/texts.jsonl`.

| Operation | Documented behavior | Remaining native recovery |
|---|---|---|
| Recruit | Each Zoombini has four five-valued traits; leave the island with exactly 16. At most two characters with the same complete trait tuple may be recruited throughout a campaign. Individual candidates can return to the cave before departure. | Persistent identity/name allocation, lifetime tuple-use ledger and undo semantics; original random recruiter consumption. The maximum of 1,250 possible recruits is an arithmetic inference from these documented constraints, not a verified native finale condition. |
| First trail | Allergic Cliffs → Stone Cold Caves → Pizza Pass → Shelter Rock. | Source scene IDs, pending return processing and atomic destination updates. |
| Shelter Rock | Preserve arrivals and stored occupants. Select exactly 16 on departure stones. Choose the north or south GO arrow. | Stable inventory ordering, resident versus selected lists, capacity representation and transition history. |
| Northern trail | Captain Cajun's Ferryboat → Titanic Tattooed Toads → Stone Rise → Shade Tree. | Native route counters and failure return callbacks. |
| Southern trail | Fleens → Hotel Dimensia → Mudball Wall → Shade Tree. | Native route counters and failure return callbacks. |
| Shade Tree | Preserve residents and arrivals; exactly 16 must be selected to depart. | Native inventory and transition representation. |
| Last trail | Lion's Lair → Mirror Machine → Bubblewonder Abyss → Zoombiniville. | Destination arrival mutation and ending conditions. |
| Failure or map departure | Unsuccessful travelers eventually return to their most recent base camp, or Zoombini Isle before the first camp. Accessing the map at puzzle entry forfeits direct re-entry into that encounter; the map permits island/camps/destination in campaign mode. | When returns occur, incoming-party order, zero-party transitions and whether different loss callbacks have different delays. |
| Difficulty | Manual p.9 says three complete bands of 16 through each three-puzzle trail advance that trail, and completed lower levels remain accessible only in practice. Four named levels map to green/yellow/orange/red trails. | Exact increment/reset behavior after partial runs, counter storage, maximum-level saturation, history interactions and whether source behavior qualifies the manual wording. Do not implement a guessed reset. |
| Rewards/destination | A full band through an entire trail earns a commemorative building; manual p.33 describes 16 reward buildings. Town growth reflects arrivals. | Exact award key, repeat prevention, house/population thresholds, plaque/name association and the final campaign completion trigger. |

Practice remains independent: manual p.11 describes a random band of 16 and free difficulty selection. The browser's saved practice sessions and optional smaller supplied parties are intentional player features; neither establishes original full-session seed parity. The Hotel adapter's generated practice party uses a separately derived seed before the exact native generator-entry boundary. Its snapshots record `partySource` so that supplied incoming characters and generated practice characters are distinguishable.

A campaign shell may display these routes but must not advance through missing encounters or award progression. Before enabling a route, native differential transition fixtures must cover full and partial groups, both branches, returning travelers, recruitment constraints, all difficulty transitions, and duplicate encounter-result application.

## Hotel semantics affecting the player

The [Hotel native report](specs/logical-journey-hotel-dimensia.md), [Python model](../tools/spec_lj_hotel_dimensia.py), and `local/specs/logical-journey/hotel-dimensia.json` establish the implementation boundary. The executable fingerprint is `82afd175c9bf6c39556299b2c59fe96c6d14c843b6a3e34e94786e6f13902ce3`.

- Original STRL 2400 explicitly requires the player to discover which trait sorts the rooms. STRL 2420/2440 use two unknown governing traits; STRL 2460 uses three. A browser view must not reveal `selected_traits`, operative axis labels, or temporary blocked-room generator mappings. Show the actual occupants and all their visible traits so observations remain possible.
- UI1 rooms are floors. UI2/3 room `i` means column `i % 5`, floor `i // 5`. UI4 native coordinates are column `(i % 25) // 5`, floor `i // 25`, doorway `i % 5`. Five separate doorway boards are a different presentation of the same coordinates; their labels must make the third axis clear.
- The first accepted placement establishes operative labels. Successful placements never spend clock steps. Only rule-rejected placements advance the post-first clock; outside/boarded-room drops are ignored. Baselines are 5/2/4/2, closure 12, allowances 7/10/8/10.
- The original room occupancy counter saturates at six for presentation. It is not an acceptance cap. Keep every accommodated identity and trait in the browser snapshot and room details, even after six matching occupants.
- GO transfers the accommodated subset, preserving incoming identity/order. Unaccommodated people remain available for the campaign's separately recovered return mechanism. Hotel itself does not delete characters or award campaign progress.
- Logical Journey's random helper uses the full upper 16 bits of the updated 32-bit recurrence and an inclusive bound. A zero maximum does not advance RNG. Using the other editions' 15-bit CRT output changes Hotel level-3 permutations and blocked rooms.

## Concrete renderer resources

All paths in this table are relative to `local/derived/logical-journey/`. `images.jsonl` retains original resource hashes, indexed-pixel hashes, palette references, dimensions and compound offsets. The source archive is `DATA/hotel.mhk`, SHA-256 `58e4b0e2a75d38f1cacb03584743b89457960b72b7ec4276830abc9c8362571e`.

| Resource | Decoded path | Bounded observation |
|---|---|---|
| tBMP 5000 | `images/hotel/05000/0000.png` | Visually inspected 640×480 woodland/fence backdrop, open foliage area on left. Matching SHPL 5000; no unresolved used indices. Source bytes SHA-256 `f99a2d95ca7791b58b51aa203362f7aadd45cb12ab5febc731978984f563489a`. |
| tBMP 5001 | `images/hotel/05001/0000.png` | Visually inspected 640×480 five-trunk backdrop with leafy outer borders. Matching resource-ID palette. Original level-selection binding is not newly established by visual inspection. |
| tBMP 5002 | `images/hotel/05002/0000.png` | Visually inspected 640×480 five-trunk backdrop, nearly full-width trunks. Matching resource-ID palette. |
| tBMP 9000 | `images/hotel/09000/0000.png` | Visually inspected first frame is another full-width trunk backdrop. Manifest's palette uses an inferred preceding SHPL 5002. Do not assume it has the same scene/level binding as 5002. |
| tBMP 8000 bank | `images/hotel/08000/0000.png` and other frame indices | Current Hotel contract calls this a hotel bank. First frame is 38×36. Palette inferred from SHPL 5002, unresolved index 0; opacity/layer composition are not established. |
| tBMP 11000 bank | `images/hotel/11000/0000.png` and other frame indices | Contract associates UI3. First frame 172×37, inferred SHPL 5002, no unresolved used indices. Source bytes SHA-256 `de5ff3643994c3035de6fc22f8d1b8a625e946eb010e3f526b962251f5ecf0c4`. |
| tBMP 12000 bank | `images/hotel/12000/0000.png` and other frame indices | Contract associates UI4. First frame 175×139, inferred SHPL 5002, unresolved index 0. Source bytes SHA-256 `2fa421142d3d5adb2f865da8616b6944527a2b41c1c0dfa5a198dabccf812581`. |
| SCRB 11000–11003 / 12000–12003 | `animations/hotel/SCRB/11000.json` etc. | Existing contract's boards/alternate boards. The inspected 11000 and 12000 manifests each contain one frame, with shape/position data. Preserve bank binding and source coordinates instead of treating every PNG as an independent complete object. |
| REGS 11000–11005, 9000–9003, 12004/12005 | `resources/hotel/REGS/<id>.bin` | Existing contract identifies geometry; source static positions are at `0x48bfc0` / `0x48c028`. This audit does not invent a semantic REGS parser. |
| SND resources | `audio/hotel/…` via `audio.jsonl` | Original audio has decoded WAVs, but feedback-to-sound routing and timing must be bound from source before claiming the original soundscape. |

The feature help names hair, eyes, nose and feet. Current independent native reports deliberately preserve numeric IDs: only native trait index 3 is independently established as feet. The first three native category-to-feature assignments and all value-to-sprite mappings remain unverified here. The first player slice therefore uses visibly distinct symbolic category/value tokens and identifies the fourth as feet; these are player presentation substitutes, not a claim that all original character layers have been reconstructed. Rendering original Zoombinis needs source-linked bank/shape selections, palette context, transparency, anchors and composition tests over all 625 tuples.

## Player comparison fixture handoff

`business/zoombinis/tests/hotel-fixtures.py` reads the canonical Python model and creates ignored `business/zoombinis/tests/local/hotel-parity.json`. Its metadata includes exporter version, source executable fingerprint, model path/hash and regeneration command. It exports the same 140 generator inputs used by the native Hotel generator checks and 1,000 settled action probes. The browser port compares selected axes, distinct counts, rejected-draw round counts, temporary permutations, blocked selection order and sorted set, visual-style draw order, labels and final RNG, then action acceptance/placement/clock consequences. Further player tests cover completion witnesses and JSON resume at every difficulty, clock exhaustion/partial GO, blocked-room ignores, no six-person cap, hidden-view boundaries, immutability and contradictory snapshot rejection.

These fixtures test the independent port at the same bounded native-established semantics; they do not run original code in the browser, prove native campaign parity, or supply original animation timing. No original source table or media has been copied into tracked player code.
