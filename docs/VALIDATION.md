# Validation record

## Difficulty expansion — September 23, 2026

The pack contains **192 puzzles**: the original 72 plus twelve puzzles in each of ten expansion families. All 132 prior IDs, revisions, boards, targets, and witnesses were compared with the previous pack and preserved. Difficulty groups are available from every grade trail.

- `npm test`: **141 tests pass**, including all 120 expansion puzzles, larger-pile Nim bundle help, difficulty selection with retained completion, current-state hints, saves, and undo.
- `python3 docs/puzzle-expansion/verify_all.py`: all 120 instances and six separate tiling proposals pass independent mathematical checks. This includes every signed balance secret, all bounded clock/billiard alternatives, Latin uniqueness and singles stalls, irredundant code clues, graph coloring minima, and optimal route/jug/toggle witnesses.
- `npm run build`: validates the 192-puzzle pack and updates its offline asset version.
- `node scripts/expansion-browser-smoke.mjs`: all 120 expansion instances pass through real browser controls and hints, save/reload, completion, phone/iPad layout and touch targets, and offline opening of each family’s twelfth puzzle. No browser page errors.
- `node scripts/copy-browser-smoke.mjs`: default views, Help/read-aloud objectives, exact goals and budgets, and responsive layouts pass against the expanded pack.
- Screenshots of the new difficulty selector, six-symbol grid, three-clock layout, larger lamp/route/color graphs, and five-pile Nim were visually inspected. A route weight near the top prism vertex was obscured at phone width; spacing was adjusted and the new route labels were checked for overlap.

[Design notes and all additions](puzzle-expansion/difficulty-expansion.md). The difficulty bands still need family playtesting. Real iPad Safari installation/relaunch remains unverified.

## Expansion release — September 20, 2026

The shipped pack now contains **132 puzzles across 12 mechanics**: the original 72 plus all 60 checked expansion instances. There are 55 resolved source records. The existing version-one save format remains compatible; new family attempts use the same validated save, history, backup, and recovery flow.

- `npm test`: **88 tests pass**. Coverage includes every family witness, all valid bounded clock/billiard choices, every legal Nim first move against an independent game oracle, all binary words against the code transcripts, current-state Latin/color completions and repairs, route budgets and dead ends, and every weighing strategy branch.
- All 60 expansion attempts round-trip through the actual store validator at each hinted move; undo, assistance, completion, and replay remain consistent.
- `python3 docs/puzzle-expansion/verify_all.py`: independent authoring checks pass for all 60 new instances and six separate tiling trials. The tiling trials are still proposals.
- `npm run build`: validates the 132-puzzle pack and derives the complete precache asset list and version from public files, including every new module and stylesheet.
- Both browser suites pass in isolated Chromium contexts. Expansion coverage includes direct controls for all ten types, completion of all 60 instances through live hints, saved-state reload, completion focus, help dialogs, phone/iPad layout checks, button touch targets, and every family offline. Screenshots were visually reviewed.

Real iPad Safari installation/relaunch and new-family playtesting remain unverified. Family feedback on the original mechanics is recorded in the expansion catalog. Browser reports and screenshots are in `test-results/`.

## Original release — September 19, 2026

### Content and engine

- 72 unique authored puzzles; 24 per grade band; 12 of each mechanic in each band.
- 12 research/undergraduate source records, with every per-puzzle reference resolved.
- All 72 canonical solutions replayed through the application's rules: 362 legal moves.
- All 36 swap minimum lengths independently confirmed by breadth-first search. Applicable cycle, inversion, and star formulas also checked during authoring.
- All 36 garden counts independently confirmed by bitmask enumeration; authoring checks additionally examined matching and local-flip claims.
- Alternate valid tilings accepted; overlapping, diagonal, row-wrapping, out-of-bounds, and forbidden swap moves rejected.
- Hints checked after every single legal starting move on every puzzle. Every advertised continuation reaches completion; detected dead ends recover through undo.

### Save tests

Ten automated Node tests pass. Coverage includes board/hint/undo/completion round trips, independent imported profiles, malformed backups, unsupported versions, corrupted-primary recovery, blocked/quota-failed storage, and truncated histories after more than 120 moves. Completion and assistance records survive replay.

### Browser checks

The Chromium integration suite passed with no page errors:

- Profile creation and separation; all three grade trails in the content pack.
- Hints and partial boards resume after reload, including visible hinted cells.
- Offline reload and a previously unopened puzzle from the precached pack.
- Completion, replay, backup download/import, and malformed-import rejection.
- Keyboard focus for hint actions and completion.
- Phone 390×844, iPad landscape 1024×768, and portrait 768×1024 page-width checks.
- Clear-data removes only this app's save keys and leaves unrelated local storage intact.

The final landscape adjustment was also checked in the in-app browser: the Hint control ends at y≈635 in a 768-pixel-high viewport; a six-column/six-row garden's smallest cell is approximately 46×46 pixels. Temporary viewport overrides were reset.

Both optional WebMCP tools registered in the supported in-app browser. Read-back returned the active explorer; a valid open action visibly opened the same persisted puzzle; invalid input failed intentionally. The standalone Chromium test environment did not expose native WebMCP, so its report correctly records `nativeWebMCP: false`.

Screenshots and machine test output are in ignored `test-results/`. The primary local preview now uses **127.0.0.1:4187** to avoid another project's preview on port 4173. A clearly labeled **Demo explorer** was created in the in-app browser for manual review; isolated test-browser saves were discarded with those browser contexts.

### Still unverified

Real iPad Safari Home Screen installation, offline relaunch, platform file pickers, installed speech voices, and usability with children. Grade labels and instruction clarity need parent/family review. The responsive desktop-browser checks do not replace these tests. A hosted HTTPS URL awaits publication approval required by the original plan.
