# The Lantern Road

The old lantern road has gone dark. Six friends carry their living lantern tree along it, lighting the way again.

Fern, Moss, Bea, Pip, Tumble, and Rook stay together for the whole journey. Six recognizable places form one visible route: Sleepy Ferry → Reed Marsh → Windy Ridge → Old Workshop → Lighthouse → Clockwork Citadel. Completing the three tasks at a place lights it on the map. The final square completes the road.

There are no route decisions, hidden equipment prerequisites, rescues, or return trips to remember. The map carries the goal and progress. The tree and friends remain the visual center. Every puzzle is a local task with a short consequence; Nim is honestly a game at a rest stop, rather than an unexplained lock operated by a game.

## Story and interaction

Tap the current place to enter its next puzzle. A solve has a visible consequence and returns attention to the map. Story and Journal hold optional context; there is no mandatory sequence of setup paragraphs and aftermath paragraphs. Each encounter has at most one context sentence and a short factual journal consequence. Rule explanations belong in How to play; precise budgets and other non-obvious constraints stay on the board where needed.

| Place | First task | Second task | Task that lights the place |
| --- | --- | --- | --- |
| Sleepy Ferry | Swap cargo into its cradles | Start the departure bell | Connect the landing lights |
| Reed Marsh | Carry lanterns along the paths | Plant the lantern beds | Measure the garden water |
| Windy Ridge | Find the faulty cable weight | Play Tumble’s pebble game | Color the ridge lanterns |
| Old Workshop | Repair the floor with tiles | Open the supply cupboard | Match lanterns to their cradles |
| Lighthouse | Direct the mirror-room light | Set the beacon gears | Connect the harbor lamps |
| Clockwork Citadel | Carry lanterns along the streets | Balance the fountain lift | Color the square’s lanterns |

All twelve existing mechanics appear. A solved puzzle changes its local place; finishing each third task lights that stop. The same six stops and story work at every grade entry point.

## Grade entry points

The road uses checked instances from the existing catalog, selected for a mathematical contrast rather than a universal puzzle-number scale. No catalog rules, IDs, or revisions have changed. The 54 campaign definitions are independent copies: eighteen encounters for each of K–1, grades 2–3, and grades 4–5.

K–1 begins with small cycles, two-pile Nim, direct reflections, small deduction boards, and water remainders. Its later lantern and coloring tasks introduce modest interacting constraints. Grades 2–3 use row/column propagation, bridge decisions, overlapping code clues, first-return gears, and temporary storage. Grades 4–5 use synchronized cycles, conserved water, signed weighing hypotheses, global color constraints, and optimal repeated-road choices. These are approximate entry points; counting, reading, planning, and familiarity with each interaction still vary within an age group.

The workshop floor uses L-trominoes at all three entry points. The K–1 board asks for two interlocking pieces, grades 2–3 use a missing-square decomposition, and grades 4–5 require managing a less regular boundary. This preserves the family feedback that small domino boards had been too easy. New road difficulty and pacing still need family playtesting.

The exact source mapping is below. Numbers refer to the existing family instances; tile and swap use the column’s grade-specific catalog IDs.

| Encounter | Mechanic | K–1 | 2–3 | 4–5 |
| --- | --- | --- | --- | --- |
| ferry-cargo | swap | 3 | 4 | 5 |
| ferry-bell | clock | 1 | 3 | 5 |
| ferry-lights | toggle | 2 | 3 | 5 |
| marsh-paths | route | 1 | 3 | 5 |
| marsh-garden | latin | 2 | 3 | 5 |
| marsh-water | jug | 1 | 3 | 5 |
| ridge-balance | weigh | 2 | 3 | 5 |
| ridge-game | nim | 2 | 4 | 5 |
| ridge-lanterns | color | 2 | 3 | 6 |
| workshop-floor | tile | 4 | 8 | 8 |
| workshop-lock | code | 2 | 4 | 5 |
| workshop-cradles | swap | 8 | 10 | 9 |
| lighthouse-mirrors | billiard | 2 | 4 | 5 |
| lighthouse-turn | clock | 2 | 4 | 6 |
| lighthouse-lamps | toggle | 3 | 8 | 6 |
| citadel-streets | route | 2 | 8 | 11 |
| citadel-water | jug | 2 | 8 | 6 |
| citadel-lanterns | color | 3 | 8 | 10 |

The original catalog retains its source records, mathematical qualifications, valid-solution checks, hints, and witnesses. Specific sources for these instances remain in `docs/puzzle-expansion/` and `dist/puzzles.json`; this change authors a new story arrangement, not new mathematical exercises. The 192 catalog instances remain directly available in Puzzles.

## Progress and saved data

The optional `journey` is now version 3 and contains only `started`, ordered `completed` encounter IDs, and stable encounter-to-puzzle `bindings`.

Campaign puzzle IDs are `road-<encounter>-<band>`. Each definition records its `sourceId`, `campaignEncounter`, and `campaignVersion`. Campaign attempts never overwrite catalog attempts. Solving a library board cannot advance the road, and solving a road board does not mark its library source completed. An opened encounter keeps its selected band if the player changes grade; subsequent unopened encounters use the new band.

Only the next encounter and already completed encounters are accessible. Completion requires the correct binding and a currently solved board. Historical completion alone cannot advance a restarted board. Replays retain completed road progress. Campaign-only URLs must be checked against the accessible encounter and its binding; they cannot open as ordinary library play.

Jug operations come directly from each selected instance. K–1 and middle-grade water tasks have a source and drain immediately. The selected upper-grade tasks use a fixed conserved supply and pour-only operations. Neither case depends on an earned item or another encounter.

Both earlier adventures remain readable archives:

- Version 1 is validated with `dist/caravan-legacy.js` and stored as `caravanJourney`.
- Version 2 is validated with the frozen `dist/caravan-rescue.js` and stored as `rescueJourney`.
- A migrated profile starts a separate fresh version-3 road. Attempts retain their boards, histories, moves, assistance, and completion under the existing content-compatibility rules.
- The three old `rescue-*` boards remain in the validation catalog. Their allowed operations are derived from the archived rescue’s earned pump, so pre-pump previews remain sealed and earned pump boards remain valid. They cannot be opened from the new road or library.
- Export/import includes the new journey and both archives. Profiles with no journey remain valid. Imports are independent copies.

Historical design notes are preserved in `docs/CARAVAN-LEGACY.md` and `docs/CARAVAN-RESCUE.md`.

## Verification

`npm test` covers actual solves through all 18 encounters in each grade, cumulative stop lighting, stable bindings after grade changes, completed-encounter replay, library isolation, future encounter rejection, invalid saves, and authored jug operations. Migration tests cover both earlier routes, completed and partial journeys, sealed lift previews, earned pump attempts, repeated save round-trips, and imported archive independence.

`npm run validate` checks all 192 catalog instances, 54 road instances, and three archived rescue instances with legal moves to a solved board. `scripts/caravan-browser-smoke.mjs` covers the journey and save migration through the browser. Device-specific Safari installation and family pacing remain separate from automated verification.
