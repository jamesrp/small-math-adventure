# Complete puzzle specification pass

Requested scope: the 24 families outside the initial four native generator recoveries. Runtime UI implementation is excluded. Work proceeds in batches, with independent per-family artifacts and shared review/integration.

## Completion standard

A family specification records its concrete state and inputs, legal actions, rule evaluation and feedback, success/partial-success/failure, all difficulty branches, generation/table selection and random consumption, and source/resource bindings. Evidence identifies executable/data hashes and native addresses or manual/help references. Models and differential tests make the recovered portions executable. Unresolved behavior is listed explicitly; a document's existence alone does not establish a complete specification or full-game parity.

Machine-readable specifications live under ignored `local/specs/<game>/`. Analytical reports live under `notes/specs/`; models and tests under `tools/`; extracted evidence and result fixtures under ignored `local/analysis/<game>-<family>/`. No original content enters the app bundle.

## Batch assignments

| Batch | Logical Journey investigator | Mountain Rescue investigator | Island Odyssey investigator | Main investigator |
|---|---|---|---|---|
| 1 | Stone Cold Caves; Captain Cajun's Ferryboat | Turtle Hurdle; Pipes of Paloo | Catapult; Wall | Mirror Machine |
| 2 | Titanic Tattooed Toads | Aqua Cube; Chez Norf | Planetarium; Garden | Mudball Wall; Stone Rise |
| 3 | Fleens; Hotel Dimensia | Magic Mirrors; Bubble Bumpers | Corral; Barn | Lion's Lair; Boolie Boggle |
| 4 | Bubblewonder Abyss; shared actor/animation event audit | Bubble Bumpers completion | Fleens and Snowboard lifecycle cross-review | Snowboard Gulch; Bubble L1 candidate trace; integration |

These assignments total 24 distinct families. Stone Rise, Boolie Boggle and Snowboard Gulch moved to the main investigator as earlier batches finished. Shared follow-up work audited Fleens' eviction/transfer rule, Toads' scheduler, Bubblewonder's event queues, Snowboard's speech-phase ordering, Stone Rise's reusable saved-board evaluator, and Bubble Bumpers' candidate selection and scratch-memory inputs.

The [coverage report](puzzle-specifications.md) links all 24 family reports. Machine-readable artifacts preserve explicit remaining boundaries: exact native backends are labeled separately from independent generator ports, and supplied frame/event inputs are not described as verified whole-engine playback. The additive catalog checks that all expected family identities are present and binds each spec, model and evidence directory by hash.
