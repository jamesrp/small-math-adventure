# Week 2 lantern worksheets in the adventure

Thirty additions (`toggle-13`–`toggle-42`) bring Lantern Wires to 42 puzzles and the full catalog to 222. The original 192 records retain their IDs, revisions, rules, and save behavior. New puzzles appear in Puzzles → Lantern Wires, across the existing Easy, Medium, and Hard groups and all grade trails. Road encounters keep their existing boards.

These are adaptations of the September 30 [compact catalog](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf) and [upper catalog](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf). Graphs and states were taken from `plans/week-02-shared-data.json` and `plans/week-02-catalog-upper-data.json` in the math-circle repository. Explicit coordinates preserve the worksheet geometry. Compact targets are numbered in reading order. The first two compact targets are already shipped as `toggle-01` and `toggle-02`.

| App ID | Worksheet problem / case | Graph | Minimum presses | Required budget |
|---|---|---|---:|---:|
| `toggle-13` | Compact 1 / target 3 | Four lanterns | 2 | None |
| `toggle-14` | Compact 2 / target 1 | Six-lamp ring | 2 | None |
| `toggle-15` | Compact 2 / target 2 | Six-lamp ring | 3 | None |
| `toggle-16` | Compact 4 / target 1 | Branching tree | 4 | None |
| `toggle-17` | Compact 4 / target 2 | Branching tree | 4 | None |
| `toggle-18` | Compact 4 / target 3 | Branching tree | 4 | None |
| `toggle-19` | Compact 5 / target 1 | Branching tree | 4 | None |
| `toggle-20` | Compact 6 / target 1 | Six-lamp ring | 1 | None |
| `toggle-21` | Compact 6 / target 2 | Six-lamp ring | 3 | None |
| `toggle-22` | Compact 6 / target 3 | Six-lamp ring | 2 | None |
| `toggle-23` | Compact 6 / target 4 | Six-lamp ring | 3 | None |
| `toggle-24` | Compact 7 / target 1 | Nine-lamp grid | 2 | None |
| `toggle-25` | Compact 7 / target 2 | Nine-lamp grid | 2 | None |
| `toggle-26` | Compact 7 / target 3 | Nine-lamp grid | 4 | None |
| `toggle-27` | Compact 7 / target 4 | Nine-lamp grid | 4 | None |
| `toggle-28` | Compact 9 / target 1 | Island bridge | 2 | None |
| `toggle-29` | Upper 1B | Five-lamp ring | 2 | None |
| `toggle-30` | Upper 1F | Bent path | 2 | None |
| `toggle-31` | Upper 2A | Separate islands | 1 | None |
| `toggle-32` | Upper 2C | Joined islands | 2 | None |
| `toggle-33` | Upper 2D | Two square islands | 2 | None |
| `toggle-34` | Upper 2F | Two branching islands | 2 | None |
| `toggle-35` | Upper 3D | Seven-lamp ring | 2 | None |
| `toggle-36` | Upper 4A | Eight-lamp ring | 2 | 2 |
| `toggle-37` | Upper 4B | Eight-lamp ring | 4 | 4 |
| `toggle-38` | Upper 4C | Six-lamp ring | 3 | 3 |
| `toggle-39` | Upper 4D | Bent path | 5 | 5 |
| `toggle-40` | Upper 4E | Four-spoke star | 4 | 4 |
| `toggle-41` | Upper 6A | Two branch points | 4 | None |
| `toggle-42` | Upper 6B | Six-spoke star | 6 | None |

The compact catalog removes the earlier one-light-only restriction; the app follows that version. For compact Problem 9, the app supplies the specific 2–5 bridge from the checked source data. Upper reachability problems include only reachable, nontrivial targets. All-solutions investigations become single target solves, with the comparison in adult notes. Impossible cases, initially solved targets, drawing, partner design, visit-every-lamp rules, and the bonus packet's additional mechanics are not imported. No budget is added except for the five retained shortest-solution cases. The upper grid-corner optimum is already represented by `toggle-09`; its unbudgeted compact counterpart is included for exploration.

The mathematical distinction is between paths (only endpoints change), cycles (every lamp changes twice), trees (forced leaf edges), and components (independent parity). On each connected component, a transition is reachable exactly when its set of changed lamps has even size: necessity follows because each press changes two lamps; sufficiency follows by pairing changed lamps and pressing paths between each pair. Canceling repeated edges leaves a reduced edge set. A tree has no nonempty even-degree edge subset, so its reachable reduced solution is unique. See the [source facilitator notes](/Users/jamespfeiffer/math-circle/plans/week-02-catalog-upper.md) for detailed arguments and the shortest-solution lower bounds.

Authoring data is appended to `motion.json`; `node scripts/import-expansion.mjs` regenerates the runtime pack without needing the source repository. `node scripts/generate-review.mjs` regenerates the full review catalog. Run `python3 docs/puzzle-expansion/verify_all.py`, `npm test`, `npm run build`, and `node scripts/lantern-browser-smoke.mjs` (using the same Playwright environment variables as the other browser suites). Independent finite checks enumerate states and edge subsets, verify shortest witnesses and alternate completions, and check current-state hints and budget dead ends. Browser checks cover direct wire presses, keyboard input, undo/reload, replay, mobile layouts, and offline access. Automated checks do not establish enjoyment or difficulty calibration; these additions await child playtesting.

## Verification record

- `npm test`: 216 tests passed, including all original puzzles, save compatibility, and exhaustive edge-subset checks of the additions.
- `python3 docs/puzzle-expansion/verify_all.py`: 150 expansion instances and six tiling probes passed, with independent BFS checks of every lantern minimum.
- `npm run build`: 222 catalog puzzles and 57 campaign boards validated; offline cache rebuilt.
- Source comparison: all 30 graphs, initial states, targets, and required budgets match the checked worksheet data. All original 192 puzzle records remain byte-equivalent after JSON serialization.
- Chromium in a disposable profile: all 30 additions solved using actual wire taps; Enter/Space, undo, reload, replay, every wire midpoint, and no horizontal overflow checked at widths 320, 390, 600, and 768. Budget recovery, live hints, and offline solves also passed. Representative phone and tablet screenshots were visually inspected. Evidence is in ignored `test-results/lanterns/`.

Published October 1, 2026 to [GitHub Pages](https://jamesrp.github.io/small-math-adventure/) in commit `0d2aebf4fa2d182abebacbbce29b75e4e5891b32`. The deployment reran all 216 tests and the release build. GitHub Pages reported success, and all 11 changed or added public app files matched the tested local build by SHA-256, including the 222-puzzle pack and cache version `47a9342514788280`. The publish also included the already completed local clock controls and navigation updates. Actual iPad Safari and child playtesting remain unverified for these additions.
