# The other 24 puzzle families: rules, generation and difficulty

This pass covers the 24 families outside the initial [four generator recoveries](generator-parity.md). Each family has an analytical report, a machine-readable contract, source/resource provenance, executable research tools, and native comparison evidence. The contracts distinguish player-visible information from hidden state, generation from action evaluation, and full rescue from partial departure. The accompanying [worklog](specification-worklog.md) records the parallel batches.

The scope is puzzle logic and difficulty. Catapult, Toads, Bubblewonder and Snowboard have recovered frame or event contracts with explicit external timing inputs; whole-engine timing remains unverified. Stone Rise, Bubblewonder and Bubble Bumpers level 1 use original native functions for parts of generation that have not been independently ported. Bubble Bumpers also reads uninitialized scratch memory, so reproducible generation requires explicit memory inputs alongside party and RNG state. Each report records these limits; coverage of all families does not imply full-game parity.

## Logical Journey: ten families, four difficulty levels

| Family | Difficulty changes and consequential rules | Generation/evaluation evidence |
|---|---|---|
| [Stone Cold Caves](specs/logical-journey-stone-cold-caves.md) | One-trait rules → two-value OR on one trait → OR across two traits. Level 1 fixes a partition axis. Rejection budgets are 16/18/20/22. | Enumerated candidate sets, party-conditioned balancing, orientation draws, queue and cliff closure. |
| [Captain Cajun's Ferryboat](specs/logical-journey-captain-cajuns-ferryboat.md) | With 16 characters, graph edges grow 15 → 22 → 24 → 33. Every occupied neighbor must share at least one trait. Unlimited rearrangement; partial GO. | All 20 authored level/party-size templates decoded; selector, graph and placement comparisons. |
| [Titanic Tattooed Toads](specs/logical-journey-titanic-tattooed-toads.md) | Tattoo-restricted paths, shared finite swap budget, two trips per toad; higher levels add crossing crab traffic. | Native board/history, roster, path planners and next-hop comparisons; scheduler and actor event contracts. |
| [Stone Rise](specs/logical-journey-stone-rise.md) | Pairs → triples → three circuits → a larger network. Only source-connected occupied pads are rescued; an unmatched link may be bypassed by another conducting route. | Exact native board export; independent pair/triple labels and graph-power evaluator; native-checked solution witnesses. |
| [Fleens](specs/logical-journey-fleens.md) | Increasingly hidden correspondence between party traits and Fleen traits. Up to three designated Fleens must be lured; the tree holds six characters and evicts its oldest occupant on a seventh lure. | Generator, trait transformation and target selection; tree, eviction and victory lifecycle. |
| [Hotel Dimensia](specs/logical-journey-hotel-dimensia.md) | 1/2/2/3 axes and 5/25/25/125 rooms. Accepted placements establish partial label bijections. After the first placement, 7/10/8/10 rejected placements reach closure. | Exact setup, placement predicates and settled lifecycle; correct moves do not spend clock steps. |
| [Mirror Machine](specs/logical-journey-mirror-machine.md) | Direct crystal matching → fixed filters → movable filter chains → one chain for two inputs. Transparent, constant and cycling filters compose; the right chain runs in reverse order. | Independent generation/filter models, native comparisons and bounded witnesses. A source quirk can make isolated absent-second-input cases unsolvable. |
| [Mudball Wall](specs/logical-journey-mudball-wall.md) | 25 cells at levels 1–2, 125 at levels 3–4; additional shears and selector permutations obscure coordinates. For 16 characters, 16/16/16/17 usable shots. | Exact reward placement, mapping, random consumption, hit awards and shot exhaustion. |
| [Lion's Lair](specs/logical-journey-lions-lair.md) | One-axis sorting with all or two clues → two-axis sorting with two or zero clues. Wrong-placement allowances 4/5/6/7. | Exact permutations, clue masks, first-process axis override and tied-key acceptance. A wrong move places the character correctly and still rescues it. |
| [Bubblewonder Abyss](specs/logical-journey-bubblewonder-abyss.md) | Authored maze families combine conditional arrows, cycling arrows, colored switches, held bubbles and collisions. Level 4 has a separate small-party template. | All ten templates preserved; exact source generation, independent logical-node assembly and native rule/event/queue checks. Animation-to-event scheduling remains an explicit boundary. |

## Mountain Rescue: eight families, three normal difficulty levels

| Family | Difficulty changes and consequential rules | Generation/evaluation evidence |
|---|---|---|
| [Turtle Hurdle](specs/mountain-rescue-turtle-hurdle.md) | One axis/all clues → one axis/one or two clues → two axes/one shared clue position. Mistake allowance 3, then 5 or 4, then 6. | Exact generator, all tested slot predicates and wrong-placement side effects. Last wrong placement still rescues that character. |
| [Pipes of Paloo](specs/mountain-rescue-pipes-of-paloo.md) | Different pair/chain/network constructors; rearrangement is unlimited until the valve commits the connected subset. | Independent generators, legacy configuration, scene shuffle, water propagation and valve checks; bounded searches and wildcard fallback retained. |
| [Aqua Cube](specs/mountain-rescue-aqua-cube.md) | 1/3/24 logical board configurations and 0/1/2 available warps across levels. Warp selections are booleans executed in lever-index order. | Exact placement/RNG, edge movement, arrivals, Fleen scattering, warp gates and reachable-state analysis. Previously rescued characters can be lost to a Fleen. |
| [Chez Norf](specs/mountain-rescue-chez-norf.md) | Four authored templates per level; 4/4/6 diners, shared totals of 8/7/8 trays, different release quotas. | All twelve templates and 335 clue records extracted; exact food permutations, meal predicates, clue/audio lookup, notepad actions and budgets. |
| [Bubble Bumpers](specs/mountain-rescue-bubble-bumpers.md) | Bumpers, rotations, magnets and whirlpools alter moving bubbles; device interactions and collisions are part of the logical difficulty. | Independent level 2/3 generators and movement rules; level 1 uses original builders with independently checked selection and trait prefixes. Explicit scratch-memory inputs are required. |
| [Magic Mirrors](specs/mountain-rescue-magic-mirrors.md) | Six small boards share 12 balls at level 1; levels 2–3 have 54/72 unique candidates and 8/6 balls. A lucky first shot at a fresh level-1 board causes the target to change. | All 123 small-board templates, exact generators, mutable/read-only comparisons, retargeting, costs and board transitions. |
| [Snowboard Gulch](specs/mountain-rescue-snowboard-gulch.md) | Two binary trait tests yield four routes. Level 3 tests two values per trait; levels 2–3 cover the clue chart. Two initial descents precede blocking; mistake limits are 3/5/5. | Exact candidate generation and 5,000-attempt balance fallback, partition and route selection, plus independent launch/tick transitions for supplied movement and animation observations. |
| [Boolie Boggle](specs/mountain-rescue-boolie-boggle.md) | Binary addition on 2/3/4 Boolies; positive clusters 1…3/1…4/1…5. Normal eight-character budgets are 19/29/33 launches. | Exact initial and replacement row generation, per-ball carry, boarding and exhaustion. Only the final all-happy state boards a boat. |

## Island Odyssey: six families, three difficulty levels

| Family | Difficulty changes and consequential rules | Generation/evaluation evidence |
|---|---|---|
| [Catapult](specs/island-odyssey-catapult.md) | Thirteen authored configurations per level, differing wheel/catcher/cam periods, rotation and apparatus. Timing gates determine which item reaches each stage. | All 39 normal configurations, exact history selector and native frame gates. External TCX frame progression is not supplied by a complete timing simulator. |
| [Wall](specs/island-odyssey-wall.md) | Two rows of length 24/28/24; tile lengths 4/4/3; wrong-placement limits 5/3/2. Locally matching irreversible placements can prevent a full packing. | Exact layout/tile generation, placement comparisons, finite-budget actions and complete witnesses. |
| [Planetarium](specs/island-odyssey-planetarium.md) | Modular movement with finite denominations; level 3 adds coupled 24-hour and 28-day cycles. Passing and stopping at targets award differently. | Exact draws, denomination exceptions, unit callbacks and witnesses. Repeated target passes and hour/date ordering have consequential native quirks. |
| [Garden](specs/island-odyssey-garden.md) | 1/2/3 axes create 4/16/64 holes; rejection limits 5/10/10. The first planting establishes labels; duplicate traits may stack. | All levels consume the same 51 setup draws. Accepted placements extend partial bijections and cannot create a packing dead end. |
| [Corral](specs/island-odyssey-corral.md) | Two projectors/11 placements → three projectors/8 placements → hidden axis ordering/8 placements. Feeding remains possible after projector power runs out. | Exact generator and reposition draws, feeding predicates and matching witnesses. Wrong berries are permanently consumed; removal is free. |
| [Barn](specs/island-odyssey-barn.md) | Cyclic three-allele dominance. Level 1 reveals genes; level 2 hides them; level 3 changes feet to tails and reduces the wrong-attempt budget. | Exact inherited/incoming traits, alleles, removal ordinals, offspring multiset comparison and original success callbacks. Any accepted pair preserves a remaining solution. |

## How to interpret difficulty

The numeric level is not a single complexity scale. These games independently change the amount of hidden information, number of interacting constraints, freedom to reverse actions, cost of experiments, and movement timing. The reports keep these dimensions separate.

A known-state solution is weaker than a guaranteed player strategy. Garden and Barn preserve a solution after every accepted move, but Barn's hidden genes still make discovery costly. Wall accepts locally correct moves that can ruin a later packing. Boolie Boggle's finite-prefix solver assumes the supplied future clusters are known; it is not a claim about what the player can foresee. Native function parity establishes the tested boundary, not a theorem about every seed or every event interleaving.

Several apparent time limits are counters driven by actions: Hotel's post-placement clock, Garden's sun and Barn's pool. Other families genuinely depend on ordered movement events. Those differences should carry into any future difficulty model.

## Artifacts and reproducibility

`local/specs/<game>/<family>.json` contains the complete recorded contract, including generation steps, inputs, action legality, feedback, outcomes, level branches, asset bindings, evidence, validation and open questions. Original bytes and extracted tables remain local. Analytical notes and research models are separate from the app bundle.

`tools/specification_catalog.py` checks the 24 expected identities, required fields and per-family notes, then snapshots each specification, model and family evidence directory by SHA-256. It preserves the first-pass catalog and the previous four native-generator recoveries. Indexing rejects stale snapshots. Family reports document the commands and native stubs used in their comparisons.

```sh
python3 research/zoombinis/tools/generator_catalog.py
python3 research/zoombinis/tools/specification_catalog.py
python3 research/zoombinis/tools/corpus.py index
python3 -m unittest discover -s research/zoombinis/tools -p 'test_specification_catalog.py'
```

Use the explicit `completeness` and `open_questions` fields when deciding whether a family is ready for an independent generator, an offline difficulty study, or a future runtime. Full-session seed replay, animation marker emission and pixel rendering are separate claims and have not been globally established.
