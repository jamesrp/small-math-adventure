# The Last Lantern Caravan

Small math adventure’s story campaign.

Play the [published app](https://jamesrp.github.io/small-math-adventure/). The [GitHub Pages repository](https://github.com/jamesrp/small-math-adventure) contains the contents of `dist/` at its root and publishes from `main`. Run `npm run deploy` to test, build, and publish an update from this Mac.

Sneak into the **Clockwork Citadel**, rescue Fern and the lantern tree, and get everyone out before the Keeper’s ship leaves. **Three acts and eleven encounters** connect each puzzle to a visible consequence. Enter through the water gate with Luma or over the rooftops with Bracken; your chosen ally provides the escape.

**Bea’s pump changes the jug rules.** First encounter a lift that cannot be solved with pouring alone, find and repair the pump, learn Fill and Empty, then return to the same saved lift. Carry the pump onward to the escape counterweight. The campaign uses existing mechanics plus **three separate campaign jug instances**; all **192 catalog puzzles** remain freely available.

Route choices, encounters, the earned pump and unfinished boards persist per explorer. Earlier caravan journeys move into Journal without changing puzzle progress. See [the campaign notes](docs/CARAVAN.md) for the story, mathematical witnesses and save behavior.

## Run locally

Requires Node.js 22 or later. No package installation is needed.

```sh
cd /Users/jamespfeiffer/business/small-math-adventure
npm start
```

Open [the local adventure](http://127.0.0.1:4187). `PORT=4174 npm start` chooses another port. The server binds to the local network so an iPad can try online play using the Mac’s LAN address, but **a normal HTTPS deployment is needed for iPad installation and offline service-worker support**. A Mac’s HTTP LAN address is not the iPad’s localhost.

## Included

- Twelve mechanics with generous targets, keyboard controls, symbols alongside colors, and reduced-motion support. Tile Gardens support drag or tap placement.
- An illustrated citadel, six recurring companions, two entry/escape routes, captioned story scenes, a journey journal, and a lasting rescue finale. The puzzle satchel keeps all 192 catalog puzzles immediately available; completion survives replay.
- Eleven story encounters plus an explicitly blocked lift preview. Repairing Bea’s pump permanently adds Fill and Empty to the campaign jugs. Revisited encounters show a fresh puzzle; free play does not silently advance the story.
- Separate nickname/avatar profiles, up to 30 local saves. Change grade trails without losing progress on another trail.
- Automatic saves after moves, undo, hint requests, restarts, and completion. Unfinished boards, undo history, hints, and assistance resume together. Solved boards reopen as fresh attempts with a Solved indicator; earned completion stays saved. Restart is immediate.
- Three hint levels: a nudge, a solver-derived next move, and an invitation to apply that one move. Legal tiling dead ends offer an undo back to a solvable position. Hints never apply a fixed initial solution over incompatible pieces.
- A parent area with every puzzle’s explanation, questions, extensions, sources, assistance summaries, six printable paper activities, and install instructions.
- Export/import JSON backups. Import creates new profiles, preserving existing saves. Corrupted imports are rejected before mutation. A previous-good save supports recovery; storage failures produce visible warnings.
- A small, confirmed clear-data action and per-profile deletion. Only this app’s save keys are removed.
- Complete offline caching of the app, icons, and all 192 puzzles. No runtime fonts, libraries, analytics, or AI services. Browser read-aloud is optional; availability depends on installed voices.

## Review the mathematics

The supplied Zoombinis discs are being analyzed separately in the [local research corpus](research/zoombinis/README.md), with reproducible asset decoders, puzzle/difficulty evidence, and source provenance. Original game material stays outside the app bundle.

- [Puzzle expansion: ten more types and 120 checked instances](docs/puzzle-expansion/README.md) records the September 2026 expansion, six additional tiling trials, and family playtest feedback. All 120 new-family instances are implemented. The six separate tiling trials remain authoring proposals. [AGENTS.md](AGENTS.md) preserves the design brief.
- [Research and design](docs/RESEARCH.md) explains the research → undergraduate mathematics → child activity bridge.
- [All 192 puzzles](docs/PUZZLES.md) includes boards, rules, hints, parent notes, and canonical witnesses.
- [Tiling research](docs/tiling-research.md) and [swap research](docs/swap-research.md) preserve detailed source findings and qualifications.
- The app’s **Grown-ups → All 192 puzzle notes** section is the interactive review view.
- [Authored content](dist/puzzles.json) is the canonical shipped content. Editing this file changes the app; the review catalog can be regenerated with `node scripts/generate-review.mjs`.

Every core board is solvable. All valid solutions are accepted. Shortest swap counts, alternative tilings, counting questions, and research extensions are invitations to investigate, not scoring requirements. Initial family playtesting found the sampled K–1 and 2–3 tile gardens too easy for a five-year-old; cup swaps worked better. The expansion proposal records the response. Grade bands remain authoring judgments requiring further calibration, not curriculum or assessment claims.

## Validate and prepare a release

To publish from the command line (Node.js 22+, Git, SSH, and rsync):

```sh
cd /Users/jamespfeiffer/business/small-math-adventure
npm run deploy
```

This runs the tests and release build, clones the current Pages branch into a temporary directory, synchronizes `dist/` including icons and removed assets, and commits and pushes any changes over SSH. GitHub Pages deploys the pushed commit. The repository README and hosting configuration are preserved. An unchanged build creates no commit. A concurrent remote update causes the push to fail safely; rerun the command to publish against the latest branch.

Preview the changes without committing or pushing, or supply a commit message:

```sh
npm run deploy -- --dry-run
npm run deploy -- "Update puzzles"
```

The existing SSH key must be available to Git. If it is locked, run `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` in your own Terminal and enter its passphrase there. `ssh -T git@github.com` should identify you as `jamesrp` (GitHub returns exit status 1 even on success). The deployment script uses `git@github.com:jamesrp/small-math-adventure.git`; `PAGES_REMOTE` can override it for testing against a local bare repository.

To validate and build without publishing:

```sh
npm test
npm run build
```

`npm test` checks all 192 puzzles, including every new-family witness and current-state hint, exact swap distances, alternate solutions, illegal moves, current-board hints, dead ends, undo, save recovery, truncated history, and safe imports. `npm run build` validates content and **hashes all public assets into the service-worker cache version**. Run it after any change and before deploying the `dist/` directory. There is no transpiler or bundler; `dist/` contains the authored application source.

The optional [browser smoke suite](scripts/browser-smoke.mjs) uses Playwright. Install Playwright in your test environment, or point `PLAYWRIGHT_MODULE` to its `index.mjs`. `BROWSER_EXECUTABLE` can select a browser binary. With the local server running:

```sh
node scripts/browser-smoke.mjs
```

It covers creation and isolation of profiles, hints after reload, offline reload and unopened puzzles, export/import, malformed backups, replay, keyboard focus, several phone/iPad viewport sizes, and clearing only app-owned saves. Screenshots and reports go in ignored `test-results/`.


The expansion suite uses the same environment variables:

```sh
node scripts/expansion-browser-smoke.mjs
```

It exercises direct controls for all ten new types, completes all 120 instances through current-state hints, checks saved progress after reload, verifies 44-pixel controls and phone/iPad layouts, and opens every family offline. Latin squares use a square-and-number keypad with reversible marks; balance puzzles draw a random odd pebble (and heavy/light sign where applicable) for each new attempt. The secret stays fixed through reload and Undo, and answers still require evidence identifying one possibility. Old balance saves retain their original secret and observations until a new attempt starts. Route and toggle budgets are part of completion; code, clock, and billiard submissions accept alternate valid answers. Pebble Duel plays full normal-play Nim games: the opponent uses a winning reply when possible and a random legal move otherwise. Completion requires taking the last pebble; Undo reverses a full round. Legacy first-move saves start a fresh match while preserving previously earned completion and assistance.

The replay regression suite (`node scripts/reattempt-browser-smoke.mjs`) checks all 192 solved puzzles reopening on fresh boards, persistent completion, randomized balance restarts, secret stability through reload and Undo, and immediate restart. It uses the same browser environment variables.

The Tile Garden browser checks (`node scripts/tile-browser-smoke.mjs` and `node scripts/shipped-gardens-browser-smoke.mjs`) exercise pointer, tap, keyboard, save, hint, and story encounter behavior, and complete all 36 shipped gardens through the UI. Their reports and screenshots go in ignored `test-results/`. Run them with a localhost-only server for isolated verification.

To refresh the expansion from its checked authoring JSON, run `node scripts/import-expansion.mjs`, then `npm test` and `npm run build`. The checked JSON remains authoring data; `dist/puzzles.json` is the canonical runtime pack. The ten expansion families now have twelve instances each, grouped by Easy, Medium, and Hard. Difficulty is relative within a family and still needs family playtesting. See [the difficulty expansion](docs/puzzle-expansion/difficulty-expansion.md) for the new designs and reproduction instructions.

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
| `dist/caravan.js` | Rescue story, route choices, pump capability, campaign jug instances, bindings and validation |
| `dist/caravan-legacy.js` | Earlier campaign validation and journal archive |
| `dist/rescue-art.js` | Story illustration selection, alt text, and inline captions |
| `dist/assets/story/` | Optimized story illustrations, also available offline |
| `artwork/story/` | ImageGen prompts and original PNG artwork |
| `dist/caravan-ui.js`, `dist/caravan-art.js`, `dist/caravan.css` | Illustrated campaign, companions, journal, satchel, and visual design |
| `dist/engine.js` | Shared moves, undo, completion, original tile/swap rules, and family dispatch |
| `dist/{motion,networks,deduction,measurement}.js` | Ten new mechanics: pure validators/solvers and accessible board controls |
| `dist/storage.js` | Save schema, validation, recovery, backup parsing |
| `dist/main.js` | Interaction, persistence, navigation, PWA lifecycle |
| `dist/ui.js` | Profile/map/play/parent views |
| `dist/puzzles.json` | 192 fixed authored puzzles and 55 source records |
| `scripts/import-expansion.mjs` | Reproducible adapter from the 120 checked authoring instances into the shipped pack |
| `dist/sw.js` | Atomic precache and versioned offline shell |
| `scripts/release.mjs` | Validation and asset-derived offline cache version |

No database, purchase system, child accounts, analytics, cloud sync, or data collection is implemented. The parent entry is an adult-oriented UI transition, not authentication. The prototype uses browser voices and a brief visual demonstration instead of recorded narration. It includes 18 generated storybook illustrations, original vector companion portraits and UI icons, responsive layouts, and reduced-motion support. Story narration uses the device’s browser voice; it is not recorded character dialogue.

Desktop Chromium integration checks passed, including offline operation and phone/iPad viewport layouts. **Real iPad Safari installation, offline relaunch, and speech remain to be checked.** Initial family puzzle feedback is recorded above; broader difficulty calibration remains. Optional WebMCP tools are feature-detected. Both tools were validated in the supported in-app browser: read-back, opening a puzzle in the visible interface, and rejection of invalid inputs. GitHub Pages deployment was authorized on September 22, 2026.
