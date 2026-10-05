# The Lantern Caravan

A mathematics and logic adventure: race a rival caravan along the Lantern Road to the Lantern Fair.

Play the [published app](https://jamesrp.github.io/small-math-adventure/). The [GitHub repository](https://github.com/jamesrp/small-math-adventure) keeps the complete source on `main`; GitHub Pages publishes released files from `gh-pages` at its root. Source commits do not publish the app. `main` includes development work such as Lantern Road v4 that has not yet been deployed. Run `npm run deploy` only for an explicitly requested release.

Six travelers (Pip, Moss, Rook, Bea, Fern and Tumble) haul their lantern tree along **seven stops and twenty-one road puzzles** to the Lantern Fair. At each stop a keeper sets the puzzles and talks a little: Snooze the ferry turtle, Mr. Hops the frog lamplighter, Billie the goat, Rattle the skeleton gardener, Sprocket the raccoon inventor and Wick the lighthouse owl. Plume, a show-off peacock, leads a rival caravan one stop ahead, leaves a score to beat, plays a pebble game at the ridge and waits at the fair for a rematch. Each puzzle earns up to three stars: solved, no hints, and beat or tied Plume. Chalk from the Spooky Hollow and a pump from the Old Workshop open two side puzzles you could only try before. Each grade trail is its own run of the road.

All twelve mechanics appear on the road, plus a proof garden and the proof duel. All **222 catalog puzzles** remain freely available, and free play never moves the road. Earlier stories (the caravan, the citadel rescue and the six-stop lantern road) stay readable in the Journal. See [the road notes](docs/ROAD.md).

**Art is in progress.** Every picture is a drawn placeholder until finished art is added through the manifest; [the art roadmap](docs/art/ROADMAP.md) is the brief.

## Run locally

Requires Node.js 22 or later. No package installation is needed.

```sh
cd /Users/jamespfeiffer/business/small-math-adventure
npm start
```

Open [the local adventure](http://127.0.0.1:4187). `PORT=4174 npm start` chooses another port. The server binds to the local network so an iPad can try online play using the Mac’s LAN address, but **a normal HTTPS deployment is needed for iPad installation and offline service-worker support**. A Mac’s HTTP LAN address is not the iPad’s localhost.

## Included

- Twelve mechanics with generous targets, keyboard controls, symbols alongside colors, and reduced-motion support. Tile Gardens support drag or tap placement.
- Seven stops with bright and dark moods, a keeper at each, Plume’s score cards, stars, two tools and two side puzzles, a map with both caravans, stop sheets for replays, and a fair finale. Road boards have their own saves; revisited encounters keep their solved boards and Replay starts a fresh attempt without losing stars. The puzzle satchel keeps all 222 catalog puzzles immediately available; completion survives replay.
- Art slots: each picture can be a still or a video, recorded in `dist/art/manifest.json`, with drawn placeholders until then. Videos are cached the first time they play.
- Separate nickname/avatar profiles, up to 30 local saves. Change grade trails without losing progress on another trail.
- Automatic saves after moves, undo, hint requests, restarts, and completion. Unfinished boards, undo history, hints, and assistance resume together. Solved library boards reopen as fresh attempts with a Solved indicator; road encounters retain their solved boards until Replay. Earned completion stays saved. Restart is immediate.
- Three hint levels: a nudge, a solver-derived next move, and an invitation to apply that one move. Legal tiling dead ends offer an undo back to a solvable position. Hints never apply a fixed initial solution over incompatible pieces.
- A parent area with every puzzle’s explanation, questions, extensions, sources, assistance summaries, six printable paper activities, and install instructions.
- Export/import JSON backups. Import creates new profiles, preserving existing saves. Corrupted imports are rejected before mutation. A previous-good save supports recovery; storage failures produce visible warnings.
- A small, confirmed clear-data action and per-profile deletion. Only this app’s save keys are removed.
- Complete offline caching of the app, icons, and all 222 puzzles. No runtime fonts, libraries, analytics, or AI services. Browser read-aloud is optional; availability depends on installed voices.

Thirty puzzles from the current Week 2 lamp catalogs are now in **Puzzles → Lantern Wires**, bringing that family to 42 puzzles. Rings, trees, stars, grids, islands, and a bridge retain their worksheet layouts; five added puzzles require a shortest solution. See the [source mapping and adaptation notes](docs/puzzle-expansion/lantern-worksheets.md). These additions await child playtesting.

## Review the mathematics

The supplied Zoombinis discs are being analyzed separately in the [local research corpus](research/zoombinis/README.md), with reproducible asset decoders, puzzle/difficulty evidence, and source provenance. Original game material stays outside the app bundle.

- [Puzzle expansion: ten more types and 150 checked instances](docs/puzzle-expansion/README.md) records the September 2026 expansion, six additional tiling trials, and family playtest feedback. All 150 new-family instances are implemented, including [30 Week 2 lantern worksheet adaptations](docs/puzzle-expansion/lantern-worksheets.md). The six separate tiling trials remain authoring proposals. [AGENTS.md](AGENTS.md) preserves the design brief.
- [Research and design](docs/RESEARCH.md) explains the research → undergraduate mathematics → child activity bridge.
- [All 222 puzzles](docs/PUZZLES.md) includes boards, rules, hints, parent notes, and canonical witnesses.
- [Tiling research](docs/tiling-research.md) and [swap research](docs/swap-research.md) preserve detailed source findings and qualifications.
- The app’s **Grown-ups → All 222 puzzle notes** section is the interactive review view.
- [Authored content](dist/puzzles.json) is the canonical shipped content. Editing this file changes the app; the review catalog can be regenerated with `node scripts/generate-review.mjs`.

Every core board is solvable. All valid solutions are accepted. Shortest swap counts, alternative tilings, counting questions, and research extensions are invitations to investigate, not scoring requirements. Initial family playtesting found the sampled K–1 and 2–3 tile gardens too easy for a five-year-old; cup swaps worked better. The expansion proposal records the response. Grade bands remain authoring judgments requiring further calibration, not curriculum or assessment claims.

## Validate and prepare a release

To publish from the command line (Node.js 22+, Git, SSH, and rsync):

```sh
cd /Users/jamespfeiffer/business/small-math-adventure
npm run deploy
```

This is a separate release step: it runs the tests and release build, clones `gh-pages` into a temporary directory, synchronizes `dist/` including icons and removed assets, and commits and pushes any changes to `gh-pages` over SSH. GitHub Pages deploys that commit. The deployment README and hosting configuration are preserved. An unchanged build creates no commit. A concurrent deployment update causes the push to fail safely; review the newer release before retrying.

Preview the changes without committing or pushing, or supply a commit message:

```sh
npm run deploy -- --dry-run
npm run deploy -- "Update puzzles"
```

The existing SSH key must be available to Git. If it is locked, run `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` in your own Terminal and enter its passphrase there. `ssh -T git@github.com` should identify you as `jamesrp` (GitHub returns exit status 1 even on success). The deployment script uses `git@github.com:jamesrp/small-math-adventure.git` and targets only `gh-pages`; `PAGES_REMOTE` can override the repository for testing against a local bare repository that has that branch.

## Shared source and local resources

GitHub `main` is the durable source of truth. Local and cloud coding sessions use their own checkouts or worktrees and follow [AGENTS.md](AGENTS.md) to integrate. Chat attachments and private resource downloads are inputs, not an automatic two-way sync with this repository.

The optional [local resource manifest](LOCAL-RESOURCES.md) identifies the original game discs and their expected placement. App tests, validation, build, and ordinary development use the committed owned files and do not require the discs or extracted commercial assets. This project uses AI-assisted code and art; documented family playtests and remaining calibration limits are retained in the content notes.

To validate and build without publishing:

```sh
npm test
npm run build
```

`npm test` checks all 222 puzzles, including every new-family witness and current-state hint, exact swap distances, alternate solutions, illegal moves, current-board hints, dead ends, undo, save recovery, truncated history, and safe imports. `npm run build` validates content and **hashes all public assets into the service-worker cache version**. Run it after any change and before deploying the `dist/` directory. There is no transpiler or bundler; `dist/` contains the authored application source.

The optional [browser smoke suite](scripts/browser-smoke.mjs) uses Playwright. Install Playwright in your test environment, or point `PLAYWRIGHT_MODULE` to its `index.mjs`. `BROWSER_EXECUTABLE` can select a browser binary. With the local server running:

```sh
node scripts/browser-smoke.mjs
```

It covers creation and isolation of profiles, hints after reload, offline reload and unopened puzzles, export/import, malformed backups, replay, keyboard focus, several phone/iPad viewport sizes, and clearing only app-owned saves. Screenshots and reports go in ignored `test-results/`.

The navigation regression suite (`node scripts/navigation-browser-smoke.mjs`) uses the same environment variables. It checks Puzzles groups and scroll position through Back/Forward and reload, independent history entries, all-closed groups, Grown-ups filters and nested notes, Journal archives, and explorer isolation. Set `TEST_BROWSER=webkit` for WebKit or `TEST_PHONE=1` for a phone viewport.

Presentation state lives in each browser-history entry, scoped to the active explorer, separately from puzzle saves. `dist/view-state.js` captures it before replacing the page and restores disclosures before scrolling. Give page disclosures and filters a stable `data-view-key` (use puzzle IDs for catalog entries); render filter-dependent content from the saved values. New history entries use the view's defaults. Ordinary rerenders preserve the current entry.


The road suite (`node scripts/road-browser-smoke.mjs`) plays all twenty-one encounters and both side puzzles on all three grade trails through the real interface (K–1 on a phone, 2–3 on a tablet, 4–5 on a desktop), with keeper lines and reactions, Plume’s cards, stars, tools, the finale, earlier-story archives, offline replay and manifest-driven art. `TEST_BANDS=k1` runs one trail. It checks all three earlier-story migrations, saved moves and hints after reload, a keeper’s reaction to an illegal move, lit-stop progress, phone/tablet/desktop layouts, tapping the map’s stop buttons with reduced motion on the phone and tablet, and offline replay. Screenshots and results go in ignored `test-results/road/`. It uses the same browser environment variables.

The caravan suite (`node scripts/caravan-browser-smoke.mjs`) checks saves around the road through the real interface, on the same devices and with the same environment variables. It carries the three earlier stories through an exported backup file, an import and their Journals, then plays each trail to the fair: Undo and reload partway through a puzzle, solved boards locked and kept through reload until Next, Next above the board (and on screen on the phone), library free play of a road puzzle’s source with its own save, the second half of the 2–3 trail offline, Journal replay that keeps the trail and never lowers stars, and an export/import round trip of the finished trail. Screenshots and results go in ignored `test-results/caravan/`.

To review art by eye, `node scripts/road-art-preview.mjs` writes screenshots of the map, every stop’s opening scene and the finale at phone, tablet and desktop sizes to `test-results/road-preview/`.

The expansion suite uses the same environment variables:

```sh
node scripts/expansion-browser-smoke.mjs
```

It exercises direct controls for all ten new types, completes all 150 instances through current-state hints, checks saved progress after reload, verifies 44-pixel controls and phone/iPad layouts, and opens every family offline. Latin squares use a square-and-number keypad with reversible marks; balance puzzles draw a random odd pebble (and heavy/light sign where applicable) for each new attempt. The secret stays fixed through reload and Undo, and answers still require evidence identifying one possibility. Old balance saves retain their original secret and observations until a new attempt starts. Route and toggle budgets are part of completion; code, clock, and billiard submissions accept alternate valid answers. Pebble Duel plays full normal-play Nim games: the opponent uses a winning reply when possible and a random legal move otherwise. Completion requires taking the last pebble; Undo reverses a full round. Legacy first-move saves start a fresh match while preserving previously earned completion and assistance.

The replay regression suite (`node scripts/reattempt-browser-smoke.mjs`) checks all 222 solved puzzles reopening on fresh boards, persistent completion, randomized balance restarts, secret stability through reload and Undo, and immediate restart. It uses the same browser environment variables.

The Tile Garden browser checks (`node scripts/tile-browser-smoke.mjs` and `node scripts/shipped-gardens-browser-smoke.mjs`) exercise pointer, tap, keyboard, save, hint, and story encounter behavior, and complete all 36 shipped gardens through the UI. Their reports and screenshots go in ignored `test-results/`. Run them with a localhost-only server for isolated verification.

To refresh the expansion from its checked authoring JSON, run `node scripts/import-expansion.mjs`, then `npm test` and `npm run build`. The checked JSON remains authoring data; `dist/puzzles.json` is the canonical runtime pack. Lantern Wires has 42 instances; the other nine expansion families have twelve each, grouped by Easy, Medium, and Hard. Difficulty is relative within a family and still needs family playtesting. See [the difficulty expansion](docs/puzzle-expansion/difficulty-expansion.md) for the new designs and reproduction instructions.

**New families** join through one line in `dist/families.js`, which lists every puzzle module added after the twelve base mechanics. The app loads each module's mechanics, pack and stylesheet from there, the satchel lists its family first, the build runs its validator, and `node scripts/families-browser-smoke.mjs` opens every one of its puzzles. [Adding a family](docs/ADDING-A-FAMILY.md) is the recipe.

**Proofs (17 puzzles).** The satchel’s Tile gardens and Pebble Duel families open with a Proofs group above the grade groups. A solve can be a covering, a checked star or paint proof that a garden cannot be covered, two clean one-check rounds, or three wins in a row against perfect play. The pack is `dist/proofs.json`, built by `node scripts/build-proofs.mjs` and merged with `puzzles.json` at load through `dist/families.js`. `npm test` and `npm run build` validate it; `node scripts/proofs-browser-smoke.mjs` plays every puzzle. See [Proofs](docs/proofs/README.md).

**Chip firing (12 puzzles and a playground).** A satchel family from Week 11 of the math circle: fire circles that hold a chip per line, find every firing order, every finish or every start that finishes like a card, set off the biggest avalanche, and find a start that never stops. The playground has eight boards, including a 25 × 25 sandpile grid. It lives in `dist/families/chips/`, and its pack is built by `node scripts/build-chips.mjs`; `npm test` and `npm run build` check every answer set against an independent simulator. It is not on the road yet and has not been played by children. See [Chip firing](docs/chips/README.md).

## Install on iPad

1. Open the hosted HTTPS address in Safari.
2. Share → Add to Home Screen → enable Open as Web App → Add.
3. Open the installed app online and wait for **Ready for offline play**.
4. Turn on Airplane Mode and reopen it to verify offline readiness on the actual device.

Saves belong to this browser/app installation and origin. A new hostname, HTTP-to-HTTPS transition, or separate installed context may need an exported backup imported there. Home Screen installation is not a backup. Source links in the parent area require the internet. See [Apple’s iPad guide](https://support.apple.com/guide/ipad/open-as-web-app-ipad8f1f7a29/ipados) and [WebKit’s storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/).

Updates wait until existing app tabs close, avoiding replacement of a live board. The UI indicates an update is waiting. Save schema and content versions are explicit. The expansion is additive and keeps version-one saves compatible. Puzzle-rule changes require a deliberate migration; unsupported save versions are rejected rather than silently reinterpreted.

## Files and boundaries

| File | Responsibility |
|---|---|
| `dist/road.js`, `dist/road-cast.js` | The Lantern Road: stops, encounters, keepers and lines, Plume’s scores, stars, tools, trails, campaign boards and validation |
| `dist/road-ui.js`, `dist/road.css`, `dist/road-placeholders.js` | Map, scenes, solved strip, journal, finale and drawn placeholders |
| `dist/art.js`, `dist/art-slots.js`, `dist/art/` | Art slots, their catalog and the manifest of finished art |
| `dist/boards.css` | The shared look of every puzzle board |
| `dist/caravan-road3.js`, `dist/caravan-legacy.js`, `dist/caravan-rescue.js` | Earlier stories, frozen for validation and journal archives |
| `artwork/road4/` | Art references and, as art arrives, its sources and prompts; `artwork/road/` holds the previous road’s ImageGen originals |
| `artwork/story/`, `dist/assets/story/` | Historical rescue illustrations and provenance |
| `dist/caravan-ui.js`, `dist/caravan-art.js`, `dist/caravan.css` | Header, explorers, puzzle satchel, the travelers’ vector drawings, and base styles |
| `dist/engine.js` | Shared moves, undo, completion, original tile/swap rules, and family dispatch |
| `dist/{motion,networks,deduction,measurement}.js` | Ten new mechanics: pure validators/solvers and accessible board controls |
| `dist/storage.js` | Save schema, validation, recovery, backup parsing |
| `dist/main.js` | Interaction, persistence, navigation, PWA lifecycle |
| `dist/ui.js` | Profile/map/play/parent views |
| `dist/puzzles.json` | 222 fixed authored puzzles and 57 source records |
| `dist/families.js` | The family seam: every module added after the base pack, oldest first ([Adding a family](docs/ADDING-A-FAMILY.md)) |
| `dist/proofs.{js,css,json}` | Proofs: four mechanics, styles, and 17 puzzles with 4 sources |
| `dist/families/chips/` | Chip firing: the mechanic and playground, styles, and 12 puzzles plus the playground with 4 sources (`scripts/build-chips.mjs`, `scripts/validate-chips.mjs`) |
| `scripts/import-expansion.mjs` | Reproducible adapter from the 150 checked authoring instances into the shipped pack |
| `dist/sw.js` | Atomic precache and versioned offline shell |
| `scripts/release.mjs` | Validation and asset-derived offline cache version |

No database, purchase system, child accounts, analytics, cloud sync, or data collection is implemented. The parent entry is an adult-oriented UI transition, not authentication. The prototype uses browser voices and a brief visual demonstration instead of recorded narration. It includes generated storybook illustrations, original vector companion portraits and UI icons, responsive layouts, and reduced-motion support. Story narration uses the device’s browser voice; it is not recorded character dialogue.

Desktop Chromium integration checks passed, including offline operation and phone/iPad viewport layouts. **Real iPad Safari installation, offline relaunch, and speech remain to be checked.** Initial family puzzle feedback is recorded above; broader difficulty calibration remains. Optional WebMCP tools are feature-detected. Both tools were validated in the supported in-app browser: read-back, opening a puzzle in the visible interface, and rejection of invalid inputs. GitHub Pages deployment was authorized on September 22, 2026.
