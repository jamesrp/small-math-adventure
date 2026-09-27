# Rescue at the Clockwork Citadel

The Last Lantern Caravan now follows a single rescue: the Keeper has taken the lantern tree, Fern has followed it into the tower, and his ship leaves at dawn. Eleven solved encounters span three acts. The clock advances through authored events, never elapsed time or mistakes. Both entry routes lead to the same rescue, but establish different allies and escapes.

## Story and consequences

| Act | Encounter | Puzzle | Consequence |
| --- | --- | --- | --- |
| Find a way in | Before the gates close | Cup swaps | Meet Fern; the Keeper takes the tree and Fern follows it |
| | Under the watchlights | Lantern wires | Redirect the sentries and reach the route choice |
| | Ally entry | Mirrors for Luma; clockwork lookouts for Bracken | Enter via water or rooftops and arrange an escape |
| Reach Fern | Tower lift preview | Pour-only 5/3 jugs, initially (5,0), target 4 | Discover the missing pump; the workshop becomes the next stop |
| | Workshop door | Signal code | Open the workshop and find the broken pump |
| | Bea’s pump | Odd-pebble balance | Repair the pump; permanently earn Fill and Empty |
| | Try the pump | 3/2 jugs, target 1 | Learn the newly available operations |
| | Tower lift | The same 5/3 board, now with the pump | Raise the lift to Fern’s landing |
| | Fern’s signal | Signal code | Contact Fern and learn about the alarm |
| | Both sides of the door | Clockwork gates | Coordinate with Fern, free her, and trigger lockdown |
| Get everyone out | Decoy lights | Lantern wires | Send the sentries toward the empty loading bay |
| | Escape counterweight | 7/4 jugs, target 2 | Open Luma’s water gate or lift Bracken’s cable basket |

The preview is not a completed encounter and does not award anything. It is an inspectable, genuinely impossible version of a later puzzle. Its explicit “The lift needs Bea’s pump” message and workshop action remain visible. Undo, Restart and Hint are available, but hints identify missing equipment instead of suggesting that another attempt can solve it. No puzzle mistake raises an alarm or harms a companion.

Campaign scenes use 18 finished ImageGen illustrations with the original companions and a textured, paper-cut storybook style. Each encounter places its story setup in a caption directly beneath the image and above the puzzle, with a Listen control. A solved encounter switches to an aftermath screen with the next illustration and its consequence together: the pump works, the lift rises, Fern joins the party, and each route has its own escape. The illustrations depict story states; the puzzle boards display exact quantities and moves. Operational details remain behind How to play. Prompts and original PNGs are preserved in `artwork/story/`; optimized JPEGs in `dist/assets/story/` are included in the offline cache.

## Bea’s pump: exact model

The lift has capacities `(5,3)`, starts at `(5,0)`, and succeeds when either jug holds exactly four. Before the pump, a pour must run until the source is empty or the destination is full. The complete reachable set is `{(5,0),(2,3)}`. Neither state contains four.

The pump adds two uniform operations for either jug: fill to capacity, or empty completely. A shortest solution from the authored start is:

`(5,0) → (2,3) → (2,0) → (0,2) → (5,2) → (4,3)`

Those five moves are Pour A→B, Empty B, Pour A→B, Fill A, Pour A→B. A preview left at `(2,3)` resumes there, with its history, hint assistance and move count intact. The same saved board is valid under the expanded rules. Undoing a move never removes the earned pump.

The pump trial and escape counterweight reuse the checked `jug-01` and `jug-04` mathematics, with independent campaign IDs. The lift adapts `jug-03` to a nonempty start and an explicit capability transition. All valid solutions count; shortest paths are verification facts, not a required move budget. The three campaign IDs are `rescue-pump-practice`, `rescue-tower-lift`, and `rescue-escape-ballast`. They are defined by `withCampaignPuzzles` in `dist/caravan.js`; the 192-instance public catalog stays unchanged.

Specific mathematical sources: `docs/puzzle-expansion/measurement.md` and its checked `measurement.json` supply the jug model and earlier witnesses. `/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md` and `lowell-math-circle-year-2/source/week-04/week-04-k-1.tex` were consulted for the reachable-set contrast (the two-hop ring misses half the positions). The requested historical `worksheets/` directory is absent on this machine; the current TeX source was used instead. The jug capability transition is a new app design, not a borrowed worksheet exercise. The existing pack retains the underlying source records and mathematical qualifications.

## Progress, validation and compatibility

A new profile’s optional `journey` is version 2:

- `started`, `route` (`reeds`, `ridge`, or null), `seenLift`;
- ordered completed encounter IDs and stable encounter-to-puzzle bindings.

The pump is derived from a completed `pump-repair` encounter. There is no independently writable inventory flag. Completing ordinary library puzzles does not advance the campaign or earn the pump. Campaign completion requires a currently solved board, the correct binding, and the current encounter. Already completed encounters can be replayed without advancing or removing progress. An encounter that has been opened retains its selected difficulty when the grade trail changes.

The lift may be opened early after the ally encounter. Completing the pump trial is required before returning with the pump. Campaign-only puzzle URLs must identify an accessible, correctly bound encounter. Storage validates their board and undo history under the capabilities actually earned. An impossible preview is never treated as a solved catalog puzzle; forged fill/empty states before the pump, future bindings, skipped events, and unearned completions are rejected.

Older version-one journeys are validated by `dist/caravan-legacy.js`, retained as `caravanJourney`, and displayed under “Your earlier caravan journey” in Journal. The new rescue begins separately. Existing puzzle attempts, completion, assistance and history are copied unchanged during migration. A concise notice explains the new campaign on an existing explorer’s starting map. Export/import includes both journeys. Profiles without a journey remain valid. The previous campaign’s historical notes are in `docs/CARAVAN-LEGACY.md`.

## Verification

`npm test` checks every route and grade combination using actual puzzle solves, sealed-lift impossibility, pump acquisition and persistence, preview state preservation, source witness lengths, branch payoffs, replay, corruption rejection, migration, backup independence, and the existing mathematics/storage suites.

`npm run build` validates the 192 catalog puzzles and all three campaign witnesses, then includes every new module in the versioned offline cache.

`scripts/caravan-browser-smoke.mjs` uses isolated profiles to verify migration from an actual earlier campaign, both full 11-encounter routes, actual UI hints and controls, unavailable/available pump moves, saved lift state, reloads, phone/tablet fit, story effects, replay, 192-puzzle library access, exports and imports. The rooftop route finishes offline after the pump is earned. Screenshots and results are written to ignored `test-results/rescue/`.

Real iPad Safari installation, voice and offline relaunch still need testing on a device. The dramatic pacing and new capability progression need family playtesting; the earlier puzzle difficulty feedback remains applicable.

Current desktop verification: 143 unit tests pass; both routes complete all 22 encounters across the two browser runs with no browser errors; the rooftop route completes offline. The existing copy/accessibility regression suite passes all 192 catalog screens and their Help dialogs at phone/tablet sizes. The release build verifies the three additional campaign witnesses. Device testing and family pacing feedback remain separate from these automated checks.
