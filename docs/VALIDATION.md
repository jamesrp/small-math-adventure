# Validation record

The layout audit (`node scripts/layout-audit.mjs`) is a report, not a pass/fail suite: it measures tap targets, text size and fit for every puzzle at 390 × 844, 375 × 667 and 820 × 1180; method and latest results are in [layout-audit.md](layout-audit.md).

## Start-up under load — October 24, 2026

Now and then a reload stopped at the start-up screen with "Failed to fetch dynamically imported module". The cause was the browser, not the test server, and a child could meet it on GitHub Pages too. `node scripts/reload-stress.mjs` (README) is the harness: a fresh browser opens the app, waits until the service worker has every file, opens a road board and reloads it many times, recording for each reload that doesn't start which requests failed and how (the server's answer, the worker's own fetch, or a request Chromium cancelled, with the browser's trace of the step that gave up). `RELOAD_FAULT=server` and `abort` check that it tells these apart.

- **Before (main's worker).** In headless Chromium 141 on a 4-core machine kept busy (load average 15 to 48: several browsers reloading side by side, sometimes with busy threads), main's worker failed to start 5 times in about 2,050 reloads. Each one was a single module (orchard.js, bead-ring.js, pantograph.js, stage-placeholders.js, seeds.js…) cancelled in the page with `net::ERR_ABORTED`. The server never received the request and the worker's fetch never failed. The browser's trace names the step: `ServiceWorkerSubresourceLoader::CommitCompleted`, `net::ERR_ABORTED`, "Body reading completed". The worker had answered from its cache, and the cached file's body, streamed to the page through a pipe, was cut off part way. With the worker blocked, 600 reloads under the same load all started.
- **Who can meet it.** Once the worker has the files, a reload never reaches a server, so the host makes no difference: any Chromium browser (Chrome, Edge, Android tablets, Chromebooks) on a busy device could stop at the start-up screen, rarely, and Try again starts the app. Safari's worker (WebKit) was not tested.
- **The fix (`dist/sw.js`).** The worker reads a cached file whole and answers from memory, so Chromium hands the page a finished body instead of a stream: in a trace of one reload, the worker's answers change from `RespondToFetchEventWithResponseStream` to `RespondToFetchEvent`. A failed read is now the worker's to see: it reads once more, then asks the network. Pages still open from the cached `index.html`; art voice and video (byte ranges) are answered as before.
- **After.** With the fixed worker, under the same load, 0 of about 1,490 reloads failed. That is good evidence, not proof: at the old rate about 3.6 failures were expected, and seeing none would happen by chance about 3% of the time.
- **Cost.** Medians of 12 interleaved rounds on the same machine when quiet (first visit: a fresh profile to the name field; cold start: the browser just launched, straight to a road board; warm reload: 60 reloads of that board): first visit 803 → 788 ms, cold start 3,527 → 3,288 ms, warm reload 1,471 → 1,698 ms. A warm reload is about 0.2 s slower, because scripts and data are read whole before they are handed over; reading only scripts, data, styles and pages that way cost the same, so images are not the cost.
- **The test server.** `scripts/serve.mjs` answered every read error as a 404, so a busy machine's "too many open files" looked like a missing file. It now answers 404 only for a file that isn't there, retries other read errors and then answers 500 with the error's code, logged. No server read error was seen in any of these runs.
- **Checks.** `tests/sw-cache.test.mjs` runs the worker against a stand-in cache: a cached file answered from memory with its status and headers, a failed read retried and then fetched, `index.html` for pages, a file the cache lacks from the network, and art byte ranges from the art cache. `tests/serve.test.mjs` covers the server's 404, retry and 500.

The worker's file list and version (`CACHE`, `ASSETS`) are left to the release build; until it runs, the list lacks `click-echo.js`, which comes from the network. Not verified: Safari and real devices.

## Saved progress across a deploy — October 24, 2026

Children's saves from the live build (`gh-pages` 6fe77e0, deployed October 11) were made and read back with `main` (916e7a4, and again at caf7871) by the new `node scripts/save-compat.mjs` ([Saved progress across a deploy](save-compat.md)): 9,510 browser-made attempts over all 988 satchel puzzles (opened, after Hint, after one to three applied hints, solved, and after seeded random presses on the board), about 7,800 Node-made attempts, and 18 explorers part way along and at the end of each road trail.

- No saved attempt fails the strict validator on `main`, so no store would have been emptied. Mirror Couriers' revision 2 migration starts billiard-01 to -12 and the three lighthouse road boards afresh, stars kept.
- Sensitivity: with Lamplighter's longer street removed in a scratch copy, two Lamplighter saves fail; `main` without the repair then empties the store in the app, and with it they start afresh.
- `loadStore` now repairs a save per attempt (a changed puzzle's attempt starts afresh keeping its star; an attempt at a gone puzzle is dropped), after copying the untouched save to `small-math-adventure:before-repair:v1`. Imports and everything outside the attempts stay strict. `tests/save-repair.test.mjs` (11 tests) and a step in `scripts/browser-smoke.mjs` cover it.
- `npm test` (1,590), `npm run validate`, the main browser suite, the caravan suite on the K–1 trail and the families suite for 13 modules (chips, lamplighter, shares, proofs, robot, strands, cops, piles, meeting, gapflood, elevators, beads, portals) pass. The release build was not run.

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
