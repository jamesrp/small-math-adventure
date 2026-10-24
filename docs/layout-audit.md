# Layout audit at phone and tablet sizes

`scripts/layout-audit.mjs` opens every puzzle of every module on the family seam (`dist/families.js`) and of the twelve base mechanics (`dist/puzzles.json`) at three screen sizes with touch, and measures what a child has to hit and read. It reports and never fails, so it is not part of `npm test` or the release build. Run it after a change to a board's layout, or before a release, and compare with the results below.

## Running it

Serve `dist/` (`npm start`, or `PORT=4414 node scripts/serve.mjs` in a worktree), then:

```sh
node scripts/layout-audit.mjs                          # every module, into <os tmp>/layout-audit/all.json
TEST_FAMILY=seeds node scripts/layout-audit.mjs        # one module; a comma list works; base-tile ... base-weigh for the base mechanics
TEST_PUZZLE=seeds-03 node scripts/layout-audit.mjs     # one puzzle
node scripts/layout-audit.mjs report a.json b.json     # the ranked Markdown below, from saved runs
```

It takes the browser variables of the other suites (`TEST_URL`, default `http://127.0.0.1:4187`; `PLAYWRIGHT_MODULE`; `BROWSER_EXECUTABLE`) and three of its own: `AUDIT_OUT` (the JSON file), `AUDIT_SHOTS` (a folder for full-page screenshots of puzzles with findings, with each flagged target outlined in red or amber and labelled with its size, small text in blue and overlapping labels in purple; `0` turns them off) and `AUDIT_VIEWPORTS` (for example `390x844`). A module takes 10 to 40 seconds. On a busy machine run one module per process, as the smoke suite advises; the results below came from two processes at a time:

```sh
for m in $(node --input-type=module -e "const {FAMILIES}=await import('./scripts/packs.mjs');console.log(FAMILIES.map(m=>m.id).join(' '))") base-tile base-swap base-toggle base-clock base-billiard base-route base-color base-latin base-code base-nim base-jug base-weigh; do
  TEST_FAMILY=$m AUDIT_OUT=/tmp/layout-audit/$m.json node scripts/layout-audit.mjs
done
node scripts/layout-audit.mjs report /tmp/layout-audit/*.json
```

## What it measures

Each puzzle opens at `#play/<id>` for a fresh explorer named "Explorer" on the K–1 trail, at **390 × 844** (iPhone 12–15), **375 × 667** (iPhone SE) and **820 × 1180** (iPad Air, portrait), each with touch. The audit waits for the board, fonts, finite animations and two frames, then measures the play screen below the app's top bar (`#main`: How to play, the board, Undo, Restart and Hint) as it first appears.

| Check | Flagged when | Counted as a problem |
|---|---|---|
| Tap target | its hit area is under **40 px** at its thinnest; **40–43 px** is listed as a near miss (44 px is the goal) | yes; near misses are listed separately |
| Text | rendered size under **12 px** | yes, marked aria-hidden when every instance is |
| Page width | the page is wider than the screen | yes |
| Board below the screen | the bottom of `.board-panel` is below the screen | on 390 × 844 only; a note on the other two sizes |
| Wrapped row | a `flex-wrap` row of controls lies on more than one line; the report gives the height the extra lines add | when it sits in or above a board that runs off a 390 × 844 screen; otherwise a note |
| Cut off | a target or label loses more than 4 px and a quarter of its width or height to an `overflow: hidden` box, an `<svg>` edge or the side of the screen | yes |
| Overlapping labels | two text boxes overlap by more than a third of the smaller | yes |
| Crowding | a target of 44 px or more has two or more other targets' centres within 40 px | a note |
| Shared class names | a class starts a selector in two modules' stylesheets and in no shared one | listed at the end of the report |

**Which elements are targets.** Visible, enabled elements in `#main` that are natively interactive (`button`, `a[href]`, inputs, `select`, `textarea`, `summary`, ARIA widget roles, `[tabindex]` other than −1, `[data-action]`), elements where a pointer, grab or crosshair cursor starts (the boards' way of marking an SVG mark tappable), and every attribute selector the board code passes to `closest()` (read from `dist/` at start, so new families' hooks such as `[data-sg-point]` are covered). A hook alone counts only when the element also has a role, a name, focus or a pointer cursor, or when the hook names a drop zone (`[data-lo-drop]`): the portal board marks every point with `data-pb-point` so a finger slide can find it, but only acting points take taps. Class-only `closest()` selectors are left out because they also find containers (`.gb-edge` finds a road's group, label and all), and so are a few container selectors listed in `SELECTORS.hookIgnore`. A hit shape found by its cursor inside a single control (a knot arc's `path.kn-hit` inside its `role=button` group) is measured as that control; inside a focusable board (`svg tabindex=0 role=group`) it is a target of its own. An input hidden behind a styled label is measured as its label. Screen-reader-only elements (a 1 px box that clips, such as `.sr-only` and `.pebble-place-name`) and targets drawn wholly outside their `<svg>` are skipped.

**How a hit area is measured.** From a point inside the target, the audit walks outward with `document.elementFromPoint` in four directions (across, down and both diagonals) until the point stops landing in the target or its children. The thinnest of the four chords is the target's size there; the report gives the across and down chords, and the thinnest when it is smaller (a road is long but only as wide as its hit stroke). This measures what a tap actually reaches: a transparent hit circle or a `::after` hit area larger than the drawing counts, and so does anything drawn on top that takes the tap instead. SVG marks are measured at the widest of up to thirteen points inside them, so a road is measured where it is widest between the dots that cover its ends.

**Text size** is the computed font size times the element's scale: the SVG's screen transform (`getScreenCTM`) for SVG text, so a 10-unit label in a viewBox drawn at 0.8 is 8 px, and the CSS transform scale for HTML.

**Thresholds and selectors** are constants at the top of the script (`VIEWPORTS`, `THRESHOLDS`, `SELECTORS`).

## Known false positives and limits

- **Chromium on Linux.** Georgia is not installed, so serif numerals fall back to DejaVu Serif, which is wider; wrapping and widths are close to an iPhone or iPad but not identical. Font sizes do not depend on the font. Nothing here was measured on a device.
- **First load only.** Controls that appear after a tap (a picked voter's drop columns, a hint's Apply button, a solved screen) are measured only when a puzzle starts in that state. The playground of each family is included.
- **Geometric hit tests.** A few boards pick the nearest link to a finger (`handlers.nearest` in the graph board) or start a drag within 12 px of a point (`sq-grid`, `tri-grid`, `portal-board`). The audit measures where a tap lands, not these corrections, so those targets can be slightly easier to hit than reported.
- **aria-hidden symbols.** A shape repeated beside a letter (the cup identities' ●▲■) is reported as small text and marked aria-hidden. Whether it matters depends on whether children read the shape; at K–1 they may.
- **Intended grids.** A wrapped row may be a deliberate two-row keypad or picker. It counts only when it sits above a board that runs off a 390 × 844 screen, and the report gives how much height the wrap adds against how far the board runs off.
- **Edges.** The shared graph board's roads take taps on a 30 px stroke (`.gb-hit` in `dist/graph-board.css`), so every tappable road reads 30 px at its thinnest, and a short road between two dots reads as the stretch the dots leave uncovered.
- **Text boxes are font boxes.** Overlap compares each label's box from ascent to descent, not its ink, so a large glyph such as Card machines' × can overlap a small number by box while the ink only touches.
- **Targets that cannot be hit** at any probe point (covered by another element) are kept in the JSON as `covered` and listed as notes; none remained in this run. A thin ring that misses every grid point is probed along its stroke.
- **Severity is not ranked.** The ranking counts distinct problems; a module with one broken board can rank below one with several small labels. The shared causes below come first for that reason.

## Results, October 24, 2026

Main at `caf7871`, measured in headless Chromium: 88 modules at `402f01f` (the release build of `7466486`), whose files have not changed since, and again at `caf7871` the 18 modules that the October 24 fixes changed (aims, buckets, elevators, ends, gapflood, glued, holes, lamplighter, meeting, octagon, robot, shields, shrink, strands and tropical, and portals, mobius and primes through the portal board's arrow pad). 106 modules (the 94 on the family seam and the 12 base mechanics), 1414 puzzles, 4242 puzzle views, no page errors. Counting the same element across puzzles and sizes once, there are **208 distinct problems in 83 modules**: 83 tap targets under 40 px (57 modules), 57 groups of text under 12 px (37 modules), 41 modules whose board runs below a 390 × 844 screen, 24 wrapped rows above such a board (16 modules), 2 overlapping labels and 1 cut-off target. No page is wider than the screen. There are 55 more near misses at 40–43 px. 23 modules have no problems.

The October 24 fixes removed six problems: Lamplighter's lanterns and numerals, Shields' S label, Aims' fold letters, Holes' dashed wires and Shrink's piece buttons now pass, and Shrink's tiles miss 40 px only in puzzle 10 on a 375 × 667 phone (39 × 44 px). Two changes moved the other way. The portal arrow pad's own class gave Portal rooms its 3 × 3 cross back and larger points (41–43 px on most puzzles), and the taller pad puts the board's bottom 68 px below a 390 × 844 screen in 11 puzzles (1 px in 3 before). Strands' cylinder column (190–230 px) leaves the unrolled strip's beads at 17 px and its letters at 9.6 px on an 820 × 1180 tablet, smaller than before.

These are digital measurements, not play with children or checks on devices. Screenshots were inspected for every module in the table's top 20 and for each shared cause below; the flagged sizes matched what is drawn and what a tap reaches.

### Shared causes, most efficient fixes first

1. **A class clash breaks every Proofs garden.** `dist/families/pantograph/pantograph.css` (Drawing machines, October 23) styles `.pg-board{display:block}`, and `.pg-board` is also the Proofs garden's grid in `dist/proofs.css`. The later stylesheet wins, so proof-garden-01 to 07 draw their squares in one column, 1204 px below a 390 × 844 screen and 775 px below an 820 × 1180 tablet. The leak runs both ways: the Proofs garden's green mat, padding, border and corner radius reach the Drawing machines board. Scoping one of them (for example `.pg-puzzle .pg-board` in pantograph.css) fixes both. The last section of this report lists eight more class names that two modules both style (`.gf-*` in fences and gapflood, `.ct-puzzle` in cuts and catches, `.s-sun`, `.s-sky` and `.s-rose` in ranges and calibrate, `.dragging` in ranges and tent). None broke a board visibly in this run, but each lets one family's rules reach the other. The family stylesheet isolation item claimed on the work board on October 24 covers this cause.
2. **The top bar takes 181 px on a phone.** Below 700 px, `.caravan-topbar` wraps (`dist/caravan.css`) into three rows: the lantern and name, the explorer row (nickname, trail, Grown-ups) and the Road, Puzzles and Journal tabs. With the How to play row, every board starts 252 px down a 390 × 844 screen. 188 of the 1414 phone views (41 modules) end below the screen, 116 of them by 120 px or less, about what a one-row bar would give back. On a 375 × 667 phone, 841 of 1414 views end below the screen. No other single change affects as many modules.
3. **Three shared boards size marks and hit areas in board units, so both shrink with the board on a phone.** A minimum on-screen hit size in these three files would fix about twenty modules at once.
   - **Graph board** (`dist/graph-board.css` and `.js`): roads take taps on a 30 px stroke (`.gb-hit{stroke-width:30px}`), so every tappable road is 30 px at its thinnest. Short roads keep only the stretch the dots leave uncovered: 5–11 px for the lower roads in Flip switches, 19–20 px for Flow's first arrows, 16 px in Gap flood. Dots' reach circles (`NODE_R + 2.2` board units) come out at 33–39 px on crowded maps (flow, gapflood, cops, mst), and Flow's dot letters at 9.5–10 px. Affects corners, detours, flow, gapflood, meeting, mst and rotor.
   - **Square and triangle grids** (`dist/sq-grid.*`, `dist/tri-grid.*`): point reach (0.3 of a square) and cell hit shapes (`.sg-hit`, `.tg-hit`) scale with the grid: 17–19 px squares in squares, 21–23 px triangles in rainbow, 29 px in geoboard and reshape, 31–33 px in rhombus. Affects blocks, covers, geoboard, holes, rainbow, reshape, rhombus and squares.
   - **Portal board** (`dist/portal-board.*`): a point's disc is 0.42 lattice units, so the small views give points of 15 px in mobius, 29–30 px in portals and glued and 33 px in shields, and 8.1 px letters (`text.pb-label`) in portals 08 and 10–11. Affects glued, mobius, portals and shields.
4. **Cup symbols.** `.cup-identity i{font-size:clamp(.7rem,1.5vw,1.2rem)}` in `dist/play.css`, scaled down with the cup, draws the ●▲■ shapes at 9.9 px in base-swap, mixup, shuffles and machines. They are aria-hidden; at K–1 a child may still read the shape rather than the letter.
5. **Copied 36 px pickers.** Kits and tank shrink their many-target buttons to 36 × 36 px (`.many .kit-target`, `.many .tank-target`) and wrap them into five rows above the board, adding 156 px.
6. **SVG labels authored at 8–10 board units.** Most of the 60 small-text groups are SVG labels in a viewBox that is drawn smaller on a phone: 7.9 px in knowledge, 8.1 px in portals, 8.6 px in creases, 8.8 px in tetra, 9.3 px in tent. This is a habit rather than one file. A family can size labels from the rendered scale, or draw them in HTML over the board.

Boards that do not fit for their own reasons: three stacked clocks in base-clock (763 px below a 390 × 844 screen in clock-11 and 12), the weighing board in base-weigh (557 px), the offers tree in offers (543 px) and the balance with its five rows of targets in kits (269 px).

### Ranked by distinct problems

| Rank | Module | Puzzles | Problems | Near misses | Top issue |
|---|---|---|---|---|---|
| 1 | votes | 16 | 7 | 1 | Tap target `button.vt-voter` (“V1 at 0. Pick up”, “V2 at 2. Pick up”, “V3 at 4. Pick up”): 28×39 px at 390×844, 28×39 px at 375×667, 44×38 px at 820×1180 (only 14); puzzles 04, 08–09, 14–15 |
| 2 | tank | 13 | 6 | 0 | Tap target `button.tank-target` (“Level 1”, “Level 2”, “Level 3”): 36×36 px at 390×844, 36×36 px at 375×667, 36×36 px at 820×1180; puzzles playground; 08, 10, 12 |
| 3 | base-clock | 12 | 6 | 1 | Tap target `label.bell-number` (“1”, “2”, “3”): 28×40 px at 390×844, 26×40 px at 375×667; puzzles clock-01–03, 08–10 |
| 4 | tent | 11 | 5 | 0 | Tap target `g.tn-handle` (“The band’s left end”, “The band’s right end”): 11×15 px at 390×844, 11×14 px at 375×667, 21×29 px at 820×1180; puzzles 06, 09–10 |
| 5 | width | 10 | 5 | 0 | Tap target `g.wd-pt` (“Dot halfway from A to B”, “Dot halfway from B to C”, “Dot halfway from C to A”): 17×17 px at 390×844, 15×15 px at 375×667, 19×18 px at 820×1180; puzzles 01, 04–09 |
| 6 | calibrate | 11 | 5 | 0 | Small text `text.cb-num` (“0”, “1”, “2”): 11 px at 390×844, 9.5 px at 375×667; puzzles 01–11 |
| 7 | cardmachines | 12 | 5 | 1 | Tap target `g.cm-chip` (“R arrow from circle 1, t”, “B arrow from circle 1, t”, “R arrow from circle 2, t”): 43×28 px at 390×844, 35×27 px at 375×667, 48×37 px at 820×1180; puzzles playground |
| 8 | ranges | 10 | 5 | 2 | Tap target `g.rg-handle` (“A’s band, left end”, “A’s band, right end”, “B’s band, left end”): 12×15 px at 390×844, 11×15 px at 375×667, 21×28 px at 820×1180; puzzles playground; 05, 08 |
| 9 | strands | 13 | 4 | 0 | Tap target `g.st-bead` (“Red bead 1”, “Red bead 2”, “Red bead 3”): 11×11 px at 390×844, 11×11 px at 375×667, 17×17 px at 820×1180; puzzles playground; 01–05, 07–10 |
| 10 | creases | 13 | 4 | 0 | Tap target `g.cr-chip` (“Ray 1, no letter. Make i”, “Ray 2, no letter. Make i”, “Ray 3, no letter. Make i”): 17×17 px at 390×844, 17×16 px at 375×667, 23×22 px at 820×1180; puzzles playground; 01–12 |
| 11 | base-weigh | 12 | 4 | 1 | Board below the screen: 557 px at 390×844, 727 px at 375×667; puzzles weigh-01–12 |
| 12 | portals | 13 | 4 | 1 | Tap target `g.pb-point` (“B. Step up”, “D. Step down”, “E. Step left”): 33×33 px at 390×844 (only 09, 12), 29×29 px at 375×667; puzzles 01–06, 09, 12; playground |
| 13 | strings | 13 | 4 | 2 | Tap target `g.st-dot` (“Dot 1. Pick it”, “Dot 2. Pick it”, “Dot 3. Pick it”): 36×36 px at 390×844, 33×35 px at 375×667, 37×37 px (35 at its thinnest) at 820×1180; puzzles playground; 01–07, 10–11 |
| 14 | radon | 11 | 4 | 2 | Tap target `g.sb-disc` (“A, yellow”, “B, yellow”, “C, blue”): 25×25 px at 390×844, 25×25 px at 375×667, 29×29 px at 820×1180 (only 04, 08, 10); puzzles playground; 01, 03–04, 08, 10 |
| 15 | kits | 13 | 4 | 0 | Tap target `button.kit-target` (“Target 1”, “Target 2”, “Target 3”): 36×36 px at 390×844, 36×36 px at 375×667, 36×36 px at 820×1180; puzzles playground |
| 16 | pantograph | 13 | 4 | 2 | Tap target `polygon.pg-stencil` (“Green shape. Drag it, or”): 30×35 px at 390×844, 28×33 px at 375×667; puzzles 10 |
| 17 | glued | 12 | 4 | 1 | Tap target `g.pb-point` (“A, small square 1 across”, “A, small square 2 across”, “A, small square 3 across”): 30×30 px at 390×844 (only playground), 30×30 px at 375×667, 30×30 px at 820×1180 (only playground); puzzles playground; 10 |
| 18 | base-toggle | 42 | 3 | 1 | Tap target `line.wire-hit` (“Press wire A to C; flip ”, “Press wire B to E; flip ”, “Press wire 1 to 2; flip ”): 42×56 px (35 at its thinnest) at 390×844, 42×56 px (35 at its thinnest) at 375×667; puzzles toggle-05, 08, 31–32 |
| 19 | diffs | 13 | 3 | 0 | Tap target `button.df-floor` (“A, 0 high”, “B, 0 high”, “C, 0 high”): 38×14 px at 390×844, 38×14 px at 375×667, 46×14 px at 820×1180; puzzles playground; 01–12 |
| 20 | machines | 13 | 3 | 0 | Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667, 11.9 px at 820×1180 (only 11); puzzles playground; 01–12 |
| 21 | totals | 13 | 3 | 3 | Tap target `button.tt-slot` (“Turn 6: empty”, “Turn 1: empty”, “Turn 2: empty”): 39×50 px at 390×844, 37×50 px at 375×667; puzzles playground |
| 22 | knowledge | 14 | 3 | 0 | Small text `text.wk-held-q` (“?”), aria-hidden: 7.9 px at 390×844, 7.9 px at 375×667, 9.8 px at 820×1180; puzzles 01–02, 05–06, 09 |
| 23 | folds | 13 | 3 | 1 | Tap target `button.fd-pt` (“river at 0”, “river at 1”, “river at 2”): 25×26 px at 390×844, 23×24 px at 375×667, 29×30 px at 820×1180 (only 01–10; playground); puzzles 01–12; playground |
| 24 | matching | 13 | 3 | 0 | Tap target `button.sm-cell` (“A’s choice 3: Y”, “B’s choice 3: Z”, “C’s choice 3: Z, its par”): 98×34 px at 390×844, 94×34 px at 375×667, 106×34 px at 820×1180; puzzles playground; 03–04, 06–07, 11–12 |
| 25 | flow | 12 | 3 | 1 | Tap target `line.gb-hit` (“Arrow Start to Dot A. Fo”, “Arrow Start to Dot B. Fo”, “Arrow Start to Dot C. Fo”): 22×30 px (20 at its thinnest) at 390×844, 20×28 px at 375×667, 38×36 px (29 at its thinnest) at 820×1180; puzzles 01–07, 09–11 |
| 26 | shuffles | 10 | 3 | 0 | Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles playground; 01–09 |
| 27 | leftovers | 13 | 3 | 0 | Board below the screen: 250 px at 390×844 (only 02, 04–07, 09–10), 427 px at 375×667; puzzles 01–07, 09–10; playground |
| 28 | braces | 11 | 3 | 0 | Small text `text.bf-name` (“R1”, “R2”, “R3”): 11.7 px at 375×667; puzzles 10 |
| 29 | rookrace | 11 | 3 | 2 | Tap target `button.rr-cell` (“0 right, 10 up”, “1 right, 10 up”, “2 right, 10 up”): 29×30 px at 390×844 (only everystart-06), 26×26 px at 375×667, 34×34 px at 820×1180 (only everystart-06); puzzles everystart-01, 04, 06 |
| 30 | covers | 13 | 3 | 1 | Tap target `polygon.sg-hit` (“top-left small square of”, “top-right small square o”, “bottom-left small square”): 39×39 px at 390×844, 37×37 px at 375×667; puzzles 11–12 |
| 31 | cops | 17 | 3 | 1 | Tap target `g.gb-node` (“Dot a. Put C here”, “Dot b. Put C here”, “Dot c. Put C here”): 39×39 px at 375×667; puzzles playground; 02 |
| 32 | rhombus | 13 | 3 | 0 | Tap target `g.tg-point` (“Flip the three rhombi ro”): 33×33 px at 390×844, 31×31 px at 375×667; puzzles playground; 12 |
| 33 | offers | 11 | 3 | 0 | Board below the screen: 543 px at 390×844 (only 05–07, 09), 720 px at 375×667; puzzles 05–09 |
| 34 | rainbow | 16 | 3 | 0 | Tap target `polygon.tg-hit` (“Triangle 9, rainbow. Sta”, “Triangle 2, rainbow. Sta”, “Triangle 8, rainbow. Sta”): 23×30 px at 390×844, 21×28 px at 375×667, 31×40 px at 820×1180; puzzles 03, 09 |
| 35 | base-swap | 36 | 2 | 0 | Small text `.cup-identity i` (“▲”, “●”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles swap-k1-01–12; swap-23-01–12; swap-45-01–12 |
| 36 | chips | 15 | 2 | 0 | Small text `span.chip-sink-label` (“Sink”), aria-hidden: 11.4 px at 390×844, 11.4 px at 375×667, 11.4 px at 820×1180; puzzles playground; 01–11; s01–02 |
| 37 | shields | 11 | 2 | 1 | Tap target `g.pb-point` (“1 across, 0 up”, “2 across, 0 up”, “3 across, 0 up”): 35×35 px at 390×844, 33×33 px at 375×667, 39×39 px at 820×1180; puzzles playground; 01–10 |
| 38 | knots | 13 | 2 | 1 | Tap target `g.kn-arc` (“the loop, no colour. Cha”, “the top arc, no colour. ”, “the bottom left arc, no ”): 25×22 px (17 at its thinnest) at 390×844, 16×215 px at 375×667, 20×261 px at 820×1180; puzzles playground; 02–12 |
| 39 | sumsets | 12 | 2 | 0 | Tap target `button.ss-card` (“A 0”, “A 1”, “A 2”): 29×44 px at 390×844, 28×44 px at 375×667; puzzles playground; 01–11 |
| 40 | globe | 11 | 2 | 1 | Tap target `button.gl-turn` (“Turn left”, “Turn up”, “Turn down”): 44×38 px at 390×844, 44×38 px at 375×667, 44×38 px at 820×1180; puzzles playground; 01–10 |
| 41 | base-billiard | 18 | 2 | 1 | Tap target `g.cr-crossing` (“Crossing 1 across, 1 up”, “Crossing 2 across, 1 up”, “Crossing 3 across, 1 up”): 25×25 px at 390×844, 25×25 px at 375×667, 29×29 px at 820×1180; puzzles billiard-05–06, 09, 11–14 |
| 42 | mobius | 13 | 2 | 1 | Tap target `g.pb-point` (“Cut the lower line”, “Cut the upper line”, “Light the bottom edge”): 29×16 px at 390×844, 27×15 px at 375×667, 37×21 px at 820×1180 (only playground; 03–12); puzzles playground; 01–12 |
| 43 | joins | 13 | 2 | 0 | Tap target `button.jn-strip` (“3”, “1”, “2”): 20×36 px at 390×844, 19×36 px at 375×667, 34×36 px at 820×1180; puzzles playground; 01–04, 06–12 |
| 44 | proofs | 17 | 2 | 0 | Small text `text.flip-label` (“A”, “⚑”, “B”): 10.3 px at 390×844, 9.8 px at 375×667; puzzles proof-flip-03–04 |
| 45 | reshape | 12 | 2 | 1 | Tap target `polygon.sg-hit` (“The 8 by 2, chosen”, “The 10 by 4, chosen”, “Row 1, column 1”): 29×29 px at 390×844 (only 05, 08, 10–12), 29×29 px at 375×667; puzzles 01–12 |
| 46 | cuts | 12 | 2 | 1 | Tap target `line.tm-edge-hit` (“Line AC. Flip”, “Line AD. Flip”, “Line BD. Flip”): 31×31 px (21 at its thinnest) at 390×844, 31×31 px (21 at its thinnest) at 375×667, 31×31 px (21 at its thinnest) at 820×1180; puzzles 03, 05–07, 09–11 |
| 47 | bags | 9 | 2 | 0 | Small text `i.case-counter` (“1”, “2”, “3”): 11.1 px at 390×844, 11.1 px at 375×667, 11.8 px at 820×1180 (only 01); puzzles 01–08 |
| 48 | loops | 16 | 2 | 1 | Small text `.lp-badge text` (“8”, “4”, “2”): 11.5 px at 375×667; puzzles 13 |
| 49 | mst | 12 | 2 | 1 | Tap target `line.gb-hit` (“Link A to C, price 1. Bu”, “Link A to B, price 1. Bu”, “Link B to C, price 2. Bu”): 42×42 px (30 at its thinnest) at 390×844, 42×42 px (30 at its thinnest) at 375×667, 42×42 px (30 at its thinnest) at 820×1180; puzzles 01–06, 08–10, 12 |
| 50 | mixup | 10 | 2 | 0 | Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles playground; 01–09 |
| 51 | blocks | 26 | 2 | 0 | Tap target `polygon.tg-hit` (“Row 1, triangle 1, point”, “Row 2, triangle 1, point”, “Row 2, triangle 2, point”): 35×42 px (33 at its thinnest) at 390×844, 33×41 px at 375×667; puzzles blockfill-06–07; redfill-07–08 |
| 52 | detours | 11 | 2 | 0 | Tap target `line.gb-hit` (“Road A to B. Step to B”, “Road D to A. Step to D”, “Road H to A. Step to A”): 41×43 px (31 at its thinnest) at 390×844, 41×43 px (31 at its thinnest) at 375×667, 41×43 px (31 at its thinnest) at 820×1180; puzzles 05–10 |
| 53 | aims | 11 | 2 | 0 | Small text `text.am-lab` (“D”, “B”, “C”): 11.5 px at 375×667; puzzles 01–11 |
| 54 | decks | 13 | 2 | 0 | Board below the screen: 143 px at 390×844 (only playground; 06, 08–09, 11–12), 325 px at 375×667; puzzles playground; 01–12 |
| 55 | beads | 20 | 2 | 0 | Board below the screen: 30 px at 390×844 (only playground), 207 px at 375×667; puzzles playground; 02–06, 08, 10–12; h01–07 |
| 56 | stars | 12 | 2 | 0 | Board below the screen: 112 px at 390×844 (only 07, 09–11), 277 px at 375×667; puzzles 01–11 |
| 57 | gapflood | 10 | 2 | 1 | Tap target `line.gb-hit` (“Road from 12 o’clock to ”, “Road from 11 o’clock to ”): 17×31 px at 390×844, 16×31 px at 375×667, 26×31 px at 820×1180; puzzles 06 |
| 58 | base-nim | 12 | 2 | 0 | Board below the screen: 237 px at 390×844 (only nim-08, 11–12), 414 px at 375×667; puzzles nim-02, 05–09, 11–12 |
| 59 | tetra | 13 | 2 | 1 | Small text `.tt-mini-letters text` (“A”, “D”, “C”), aria-hidden: 8.8 px at 390×844, 8.8 px at 375×667, 9.9 px at 820×1180; puzzles 11–12 |
| 60 | towers | 12 | 2 | 0 | Board below the screen: 10 px at 390×844 (only 11–12), 212 px at 375×667; puzzles 03, 06–12 |
| 61 | ends | 13 | 2 | 1 | Tap target `g.ends-dot` (“Dot two roads from the c”, “Dot one road from the ce”): 3×3 px at 390×844 (only 05, 12), 3×3 px at 375×667 (only 05, 12), 3×3 px at 820×1180; puzzles 05, 08, 12 |
| 62 | shrink | 11 | 2 | 2 | Tap target `button.sk-gap` (“Seams between tiles 1 an”, “Seams between tiles 2 an”, “Seams between tiles 3 an”): 35×46 px at 390×844, 33×46 px at 375×667; puzzles 03, 06, 09 |
| 63 | rotor | 14 | 1 | 0 | Tap target `line.gb-hit` (“Road from the switch to ”, “Road from the top switch”, “Road from the switch abo”): 11×6 px at 390×844, 17×5 px at 375×667, 20×10 px at 820×1180; puzzles playground; 01–13 |
| 64 | geoboard | 13 | 1 | 0 | Tap target `g.sg-point` (“Dot 0 across, 6 up. Star”, “Dot 1 across, 6 up. Star”, “Dot 1 across, 5 up. Star”): 29×29 px at 390×844, 29×29 px at 375×667, 33×33 px at 820×1180; puzzles playground; 01–12 |
| 65 | hills | 13 | 1 | 0 | Tap target `button.hills-cell` (“Column 1, 6 high”, “Column 1, 5 high”, “Column 1, 4 high”): 24×26 px at 390×844, 24×26 px at 375×667, 34×28 px at 820×1180; puzzles playground; 01–12 |
| 66 | piles | 13 | 1 | 1 | Tap target `g.pl-col`: 27×44 px at 390×844, 26×41 px at 375×667, 39×93 px at 820×1180 (only 04, 07–08, 12); puzzles 01–09, 11–12 |
| 67 | squares | 13 | 1 | 1 | Tap target `polygon.sg-hit` (“Row 1, column 1. Make it”, “Row 1, column 2. Make it”, “Row 1, column 3. Make it”): 19×19 px at 390×844, 17×17 px at 375×667, 31×31 px at 820×1180 (only play; 01, 06, 09, 11–12); puzzles play; 01, 04–06, 08–12 |
| 68 | codebooks | 12 | 1 | 1 | Tap target `button.cb-lantern` (“triangle, lantern 1, dar”, “triangle, lantern 2, dar”, “triangle, lantern 3, dar”): 34×34 px at 390×844, 34×34 px at 375×667; puzzles 01–12 |
| 69 | stairs | 9 | 1 | 1 | Tap target `g.st-go` (“Go right to 1 across”, “Go right to 2 across”, “Go right to 3 across”): 17×17 px at 390×844, 17×17 px at 375×667, 19×19 px at 820×1180 (only 01–05, 07, 09); puzzles 01–05, 07–09 |
| 70 | secrets | 13 | 1 | 1 | Tap target `button.sx-lantern` (“Lantern 1, dark”, “Lantern 2, dark”, “Lantern 3, dark”): 34×34 px at 390×844, 34×34 px at 375×667, 36×36 px at 820×1180 (only 09, 13); puzzles 03, 05–06, 09–13 |
| 71 | friezes | 12 | 1 | 0 | Tap target `rect.fz-hit` (“place 1 of the top row: ”, “place 2 of the top row: ”, “place 3 of the top row: ”): 35×41 px at 390×844, 33×39 px at 375×667; puzzles playground; 03–06, 08–10 |
| 72 | sides | 11 | 1 | 0 | Small text `span.side-face` (“1”, “2”, “3”), aria-hidden: 10.7 px at 390×844, 10.7 px at 375×667; puzzles playground; 01–07 |
| 73 | robot | 13 | 1 | 1 | Tap target `g.mr-step` (“Move east”, “Move north”, “Move west”): 39×39 px at 375×667; puzzles playground; 01–12 |
| 74 | base-route | 12 | 1 | 0 | Small text `.network-graph text` (“1”, “2”, “3”), aria-hidden: 11.7 px at 375×667; puzzles route-01–12 |
| 75 | meeting | 13 | 1 | 1 | Tap target `line.gb-hit` (“Road from 000 to 001. Mo”, “Road from left crossroad”, “Road from right crossroa”): 45×41 px (31 at its thinnest) at 390×844, 45×41 px (31 at its thinnest) at 375×667, 45×41 px (31 at its thinnest) at 820×1180; puzzles 06–07, 09–10 |
| 76 | menus | 18 | 1 | 1 | Tap target `button.menu-square` (“Square 0”, “Square 1”, “Square 2”): 28×28 px at 390×844, 27×28 px at 375×667, 36×32 px at 820×1180; puzzles 04, 08, 13, 17 |
| 77 | trios | 13 | 1 | 0 | Board below the screen: 36 px at 390×844 (only 04), 266 px at 375×667; puzzles 02–10, 12; playground |
| 78 | holes | 12 | 1 | 0 | Tap target `polygon.tg-hit` (“Add the wire between dot”, “Tile on triangle 1: flip”, “Tile on triangle 2: flip”): 34×39 px at 390×844 (only 09–10), 28×32 px at 375×667; puzzles 04–10, 12 |
| 79 | corners | 13 | 1 | 0 | Tap target `line.gb-hit` (“Line from A to B, betwee”, “Line from C to A, betwee”, “Line from B to D, betwee”): 43×43 px (30 at its thinnest) at 390×844, 31×49 px (28 at its thinnest) at 375×667, 42×42 px (30 at its thinnest) at 820×1180; puzzles tree-01–03 |
| 80 | nests | 13 | 1 | 0 | Board below the screen: 152 px at 390×844 (only 04, 09, 12), 299 px at 375×667; puzzles 01, 04, 07, 09–10, 12 |
| 81 | lamplighter | 12 | 1 | 1 | Board below the screen: 10 px at 390×844 (only 11), 179 px at 375×667; puzzles 09–12 |
| 82 | sites | 13 | 1 | 0 | Tap target `g.st-site` (“A”, “B”): 27×26 px at 390×844, 26×24 px at 375×667, 27×26 px at 820×1180; puzzles playground |
| 83 | sorting | 13 | 1 | 2 | Tap target `button.sort-peg` (“Slot 1, lane 1”, “Slot 1, lane 2”, “Slot 1, lane 3”): 32×40 px at 390×844, 32×40 px at 375×667, 32×40 px at 820×1180; puzzles 07 |

## The 20 worst modules

### votes: 7 problems over 16 puzzles

- Tap target `button.vt-voter` (“V1 at 0. Pick up”, “V2 at 2. Pick up”, “V3 at 4. Pick up”): 28×39 px at 390×844, 28×39 px at 375×667, 44×38 px at 820×1180 (only 14); puzzles 04, 08–09, 14–15
- Tap target `div.vt-col` (“0”, “V11”, “2”): 29×138 px at 390×844, 29×138 px at 375×667; puzzles 09, 15
- Tap target `button.vt-tick` (“Put V5 on 0”, “Put V5 on 1, V1”, “Put V5 on 2”): 29×46 px at 390×844, 29×46 px at 375×667; puzzles 09, 15
- Tap target `button.vt-l` (“V1: write here”, “V2: write here”, “V3: write here”): 36×32 px at 390×844, 36×32 px at 375×667, 40×34 px at 820×1180; puzzles playground; 03, 07, 13
- Small text `button.vt-voter` (“V1”, “V2”, “V3”): 9.6 px at 390×844, 9.6 px at 375×667, 10.6 px at 820×1180; puzzles 04, 08–09, 14–15
- Small text `span.vt-voter` (“V1”, “V2”, “V3”): 9.6 px at 390×844, 9.6 px at 375×667, 10.6 px at 820×1180; puzzles 09, 15
- Small text `span.vt-who` (“V1”, “V2”, “V3”): 11.2 px at 390×844, 11.2 px at 375×667, 11.2 px at 820×1180; puzzles playground; 01–03, 05–07, 10–13
- Near miss (40–43 px) `button.vt-voter` (“V1 at 0. Pick up”, “V2 at 2. Pick up”, “V3 at 4. Pick up”): 44×43 px at 820×1180; puzzles 04, 08, 14
- Note. Board below the screen: 47 px at 375×667; puzzles 06, 10–12

### tank: 6 problems over 13 puzzles

- Tap target `button.tank-target` (“Level 1”, “Level 2”, “Level 3”): 36×36 px at 390×844, 36×36 px at 375×667, 36×36 px at 820×1180; puzzles playground; 08, 10, 12
- Small text `text.tank-scale` (“5”, “10”, “15”): 10.4 px at 390×844, 9.9 px at 375×667; puzzles playground; 01–12
- Board below the screen: 131 px at 390×844 (only playground; 04, 06–12), 294 px at 375×667; puzzles playground; 01–12
- Wrapped row above a board that runs off a 390 × 844 screen `div.tank-targets` (“Level 1 Level 2 Level 3 ”, “Level 6 Level 7 Level 8 ”): 5 rows, +156 px (board 131 px off) at 390×844; puzzles playground; 04, 06–12
- Wrapped row above a board that runs off a 390 × 844 screen `div.tank-picker` (“2-jug 3-jug 4-jug 5-jug ”): 2 rows, +64 px (board 128 px off) at 390×844; puzzles 11–12
- Wrapped row above a board that runs off a 390 × 844 screen `div.tank-tools` (“Empty Last gap is 1 Gaps”): 2 rows, +58 px (board 70 px off) at 390×844; puzzles 07–10
- Note. Wrapped row `div.tank-targets` (“Level 1 Level 2 Level 3 ”, “Level 6 Level 7 Level 8 ”): 2 rows, +50 px at 390×844 (only 02), 5 rows, +156 px (board 294 px off) at 375×667, 5 rows, +156 px at 820×1180 (only playground; 07–12); puzzles 02, 04, 06–12; playground
- Note. Wrapped row `div.tank-tools` (“Empty Last gap is 1 Gaps”): 2 rows, +58 px (board 233 px off) at 375×667; puzzles 07–10
- Note. Wrapped row `div.tank-picker` (“2-jug 3-jug 4-jug 5-jug ”): 2 rows, +64 px (board 291 px off) at 375×667; puzzles 11–12

### base-clock: 6 problems over 12 puzzles

- Tap target `label.bell-number` (“1”, “2”, “3”): 28×40 px at 390×844, 26×40 px at 375×667; puzzles clock-01–03, 08–10
- Small text `text.clock-center-label` (“bells”): 10.1 px at 820×1180; puzzles clock-11–12
- Small text `.clock-position text` (“0”, “1”, “2”): 10.8 px at 820×1180; puzzles clock-11–12
- Small text `text.clock-star` (“★”): 10.8 px at 820×1180; puzzles clock-11–12
- Board below the screen: 763 px at 390×844 (only clock-05–06, 08–12), 895 px at 375×667; puzzles clock-01–12
- Wrapped row above a board that runs off a 390 × 844 screen `form.motion-form` (“Bells Ring”, “Bell count12345678910111”): 2 rows, +58 px (board 396 px off) at 390×844; puzzles clock-05–06, 08–12
- Near miss (40–43 px) `label.bell-number` (“1”, “2”, “3”): 52×40 px at 820×1180; puzzles clock-01–03, 08–10
- Note. Wrapped row `form.motion-form` (“Bell count12345678910 Ri”, “Bells Ring”, “Bell count12345678910111”): 2 rows, +50 px at 390×844 (only clock-01–03), 2 rows, +58 px (board 543 px off) at 375×667; puzzles clock-01–03, 05–06, 08–12

### tent: 5 problems over 11 puzzles

- Tap target `g.tn-handle` (“The band’s left end”, “The band’s right end”): 11×15 px at 390×844, 11×14 px at 375×667, 21×29 px at 820×1180; puzzles 06, 09–10
- Tap target `g.tn-knob` (“The yellow marker”, “The blue marker”, “The marker”): 19×19 px at 390×844, 17×17 px at 375×667, 35×35 px at 820×1180; puzzles 01–05, 07–08, 11
- Tap target `rect.tn-hit`: 87×33 px at 390×844, 313×31 px at 375×667; puzzles 01–11
- Small text `text.tn-rowlabel` (“1”, “2”, “3”): 9.8 px at 390×844, 9.3 px at 375×667; puzzles 01–11
- Small text `text.tn-mark` (“0”, “1”, “2”): 10.1 px at 390×844, 9.7 px at 375×667; puzzles 01–11

### width: 5 problems over 10 puzzles

- Tap target `g.wd-pt` (“Dot halfway from A to B”, “Dot halfway from B to C”, “Dot halfway from C to A”): 17×17 px at 390×844, 15×15 px at 375×667, 19×18 px at 820×1180; puzzles 01, 04–09
- Tap target `path.wd-hit` (“Gap from A to B, chosen”, “Gap from C to A”, “Gap from B to C”): 18×21 px at 390×844, 18×19 px at 375×667, 20×22 px at 820×1180; puzzles 01, 04–09
- Tap target `button.wd-pick` (“Oval”, “Square”, “Triangle”): 40×39 px at 390×844, 39×39 px at 375×667, 40×39 px at 820×1180; puzzles playground
- Small text `text.wd-mark-label` (“O”): 11.8 px at 390×844, 11.3 px at 375×667; puzzles playground
- Small text `text.wd-letter` (“A”, “B”, “C”): 11.8 px at 390×844, 11.3 px at 375×667; puzzles 02–03
- Note. Crowded targets `svg.wd-board` (“Corners and gaps”): 2 centres within 40 px at 390×844, 2 centres within 40 px at 375×667; puzzles 07, 09
- Note. Board below the screen: 63 px at 375×667; puzzles playground; 01–09

### calibrate: 5 problems over 11 puzzles

- Small text `text.cb-num` (“0”, “1”, “2”): 11 px at 390×844, 9.5 px at 375×667; puzzles 01–11
- Small text `text.cb-report` (“4”, “6”, “7”): 11.3 px at 390×844, 10.8 px at 375×667; puzzles 02–05, 07
- Small text `text.cb-rowlabel` (“P”, “Q”, “K”): 11.5 px at 375×667; puzzles 02–04
- Small text `text.cb-letter` (“K”): 11.5 px at 375×667; puzzles 04
- Board below the screen: 57 px at 390×844 (only 10–11), 189 px at 375×667; puzzles 02–04, 06, 08–11
- Note. Wrapped row `div.cb-dial` (“Extra 123456”, “Q 123456”, “P 1234567891011”): 2 rows, +31 px at 390×844 (only 01, 03–04), 2 rows, +31 px at 375×667; puzzles 01–04

### cardmachines: 5 problems over 12 puzzles

- Tap target `g.cm-chip` (“R arrow from circle 1, t”, “B arrow from circle 1, t”, “R arrow from circle 2, t”): 43×28 px at 390×844, 35×27 px at 375×667, 48×37 px at 820×1180; puzzles playground
- Small text `text.cm-num` (“1”, “2”, “3”): 10.4 px at 390×844, 10.4 px at 375×667, 10.4 px at 820×1180 (only 04); puzzles playground; 01–06, 08–10
- Small text `span.cm-dot` (“1”, “2”, “3”), aria-hidden: 11.2 px at 390×844, 11.2 px at 375×667, 11.2 px at 820×1180; puzzles 07, 11
- Overlapping labels `text.cm-num / text.cm-mark`: “1” and “×” 34% at 375×667, “1” and “×” 35% at 820×1180; puzzles 08, 10
- Board below the screen: 223 px at 390×844 (only 04, 11), 400 px at 375×667; puzzles 04–11
- Near miss (40–43 px) `g.cm-chip` (“B arrow from circle 2, t”, “R arrow from circle 1, n”, “B arrow from circle 1, n”): 43×43 px at 390×844, 41×41 px at 375×667; puzzles playground; 01–03, 05–06, 08–10

### ranges: 5 problems over 10 puzzles

- Tap target `g.rg-handle` (“A’s band, left end”, “A’s band, right end”, “B’s band, left end”): 12×15 px at 390×844, 11×15 px at 375×667, 21×28 px at 820×1180; puzzles playground; 05, 08
- Tap target `g.rg-knob` (“A’s end”, “B’s end”): 19×19 px at 390×844, 19×19 px at 375×667, 35×35 px at 820×1180 (only 06); puzzles playground; 01–04, 06–07, 09
- Tap target `rect.rg-hit`: 328×34 px at 390×844 (only 06, 08), 313×33 px at 375×667; puzzles 01–02, 04, 06, 08–09
- Small text `text.rg-mark` (“0”, “1”, “2”): 10.6 px at 390×844, 10.1 px at 375×667; puzzles 06, 08
- Small text `text.rg-letter` (“A”, “B”): 11.3 px at 390×844, 10.8 px at 375×667; puzzles 06, 08
- Near miss (40–43 px) `rect.rg-hit`: 71×41 px at 390×844 (only 01–02, 04, 09), 288×42 px at 375×667 (only playground; 05, 07); puzzles 01–02, 04–05, 07, 09; playground
- Near miss (40–43 px) `g.rg-knob` (“A’s end”, “B’s end”): 41×41 px at 820×1180; puzzles 01–02, 04, 07, 09
- Note. Crowded targets `rect.rg-hit`: 2 centres within 40 px at 390×844; puzzles 05
- Note. Board below the screen: 42 px at 375×667; puzzles 07

### strands: 4 problems over 13 puzzles

- Tap target `g.st-bead` (“Red bead 1”, “Red bead 2”, “Red bead 3”): 11×11 px at 390×844, 11×11 px at 375×667, 17×17 px at 820×1180; puzzles playground; 01–05, 07–10
- Tap target `rect.st-band`: 283×34 px at 390×844, 270×33 px at 375×667; puzzles playground; 06, 11–12
- Small text `text.st-letter` (“A”): 10.2 px at 390×844 (only 06–12), 9.8 px at 375×667, 9.6 px at 820×1180; puzzles 06–12; playground
- Board below the screen: 111 px at 390×844 (only 01–12), 278 px at 375×667; puzzles 01–12; playground

### creases: 4 problems over 13 puzzles

- Tap target `g.cr-chip` (“Ray 1, no letter. Make i”, “Ray 2, no letter. Make i”, “Ray 3, no letter. Make i”): 17×17 px at 390×844, 17×16 px at 375×667, 23×22 px at 820×1180; puzzles playground; 01–12
- Tap target `g.cr-knob` (“Add a ray”, “New ray”): 33×33 px at 390×844, 33×33 px at 375×667, 37×37 px at 820×1180; puzzles playground; 01, 07, 12
- Small text `.cr-chip text` (“M”, “V”): 9.1 px at 390×844, 8.6 px at 375×667; puzzles 03, 06, 11
- Small text `text.cr-num` (“1”, “2”, “3”), aria-hidden: 10.8 px at 390×844, 10.8 px at 375×667; puzzles playground; 01–02, 04–05, 07–10, 12
- Note. Wrapped row `div.cr-disks` (“MVA MMB VVC”, “MMA VVB MVC MVD”): 2 rows, +159 px at 390×844, 2 rows, +152 px (board 61 px off) at 375×667, 2 rows, +208 px at 820×1180 (only 11); puzzles 03, 06, 11
- Note. Board below the screen: 61 px at 375×667; puzzles 01–12

### base-weigh: 4 problems over 12 puzzles

- Board below the screen: 557 px at 390×844, 727 px at 375×667; puzzles weigh-01–12
- Wrapped row above a board that runs off a 390 × 844 screen `form.balance-answer` (“Odd pebbleABCDEFGHJ Chec”, “Odd pebbleABC WeightHeav”, “Odd pebbleABCD WeightHea”): 2 rows, +93 px (board 383 px off) at 390×844; puzzles weigh-03–12
- Wrapped row above a board that runs off a 390 × 844 screen `fieldset.answer-coins` (“Odd pebble A B C”, “Odd pebble A B C D”, “Odd pebble A B C D E”): 3 rows, +72 px (board 449 px off) at 390×844; puzzles weigh-01–12
- Wrapped row above a board that runs off a 390 × 844 screen `fieldset.answer-weight` (“Weight Heavy Light”): 2 rows, +26 px (board 146 px off) at 390×844; puzzles weigh-04–06, 08–12
- Near miss (40–43 px) `label.answer-coin` (“A”, “B”, “C”): 44×40 px at 390×844, 44×40 px at 375×667, 44×40 px at 820×1180; puzzles weigh-01–12
- Note. Wrapped row `fieldset.answer-coins` (“Odd pebble A B C”, “Odd pebble A B C D”, “Odd pebble A B C D E”): 3 rows, +72 px (board 618 px off) at 375×667, 2 rows, +26 px at 820×1180; puzzles weigh-01–12
- Note. Wrapped row `form.balance-answer` (“Odd pebbleABCDEFGHJ Chec”, “Odd pebbleABC WeightHeav”, “Odd pebbleABCD WeightHea”): 2 rows, +93 px (board 553 px off) at 375×667, 2 rows, +89 px at 820×1180 (only weigh-12); puzzles weigh-03–12
- Note. Wrapped row `fieldset.answer-weight` (“Weight Heavy Light”): 2 rows, +26 px (board 333 px off) at 375×667, 2 rows, +26 px at 820×1180; puzzles weigh-04–06, 08–12

### portals: 4 problems over 13 puzzles

- Tap target `g.pb-point` (“B. Step up”, “D. Step down”, “E. Step left”): 33×33 px at 390×844 (only 09, 12), 29×29 px at 375×667; puzzles 01–06, 09, 12; playground
- Tap target `g.pb-vertex` (“Slide the right then up ”, “Slide the up then left c”, “Slide the left then down”): 33×33 px at 390×844, 31×31 px at 375×667; puzzles 08, 10–11
- Small text `text.pb-label` (“A”, “B”, “C”), aria-hidden: 8.1 px at 390×844, 8.1 px at 375×667; puzzles 08, 10–11
- Board below the screen: 68 px at 390×844 (only playground; 02–06, 08–12), 218 px at 375×667; puzzles playground; 01–06, 08–12
- Near miss (40–43 px) `g.pb-point` (“B. Step up”, “D. Step left”, “E. Step right”): 41×41 px at 390×844, 41×41 px at 375×667; puzzles playground; 01–06

### strings: 4 problems over 13 puzzles

- Tap target `g.st-dot` (“Dot 1. Pick it”, “Dot 2. Pick it”, “Dot 3. Pick it”): 36×36 px at 390×844, 33×35 px at 375×667, 37×37 px (35 at its thinnest) at 820×1180; puzzles playground; 01–07, 10–11
- Tap target `g.st-corner` (“Peak after step 3, heigh”, “Low corner after step 6,”, “Low corner after step 8,”): 39×39 px at 390×844, 37×37 px at 375×667; puzzles 12
- Small text `text.st-num` (“1”, “2”, “3”): 11.7 px at 375×667; puzzles 12
- Board below the screen: 4 px at 390×844 (only 04), 158 px at 375×667; puzzles 01–07, 10–11; playground
- Near miss (40–43 px) `g.st-dot` (“Dot 1. Pick it”, “Dot 4. Pick it”): 41×40 px at 820×1180; puzzles playground; 04
- Near miss (40–43 px) `g.st-corner` (“Peak after step 3, heigh”, “Low corner after step 6,”, “Low corner after step 8,”): 41×41 px at 820×1180; puzzles 12

### radon: 4 problems over 11 puzzles

- Tap target `g.sb-disc` (“A, yellow”, “B, yellow”, “C, blue”): 25×25 px at 390×844, 25×25 px at 375×667, 29×29 px at 820×1180 (only 04, 08, 10); puzzles playground; 01, 03–04, 08, 10
- Tap target `g.sb-spot` (“0 across, 5 up. Put C he”, “1 across, 5 up. Put C he”, “2 across, 5 up. Put C he”): 31×31 px at 390×844 (only 06, 10), 29×29 px at 375×667, 33×33 px at 820×1180 (only 06, 10); puzzles 02, 05–07, 09–10
- Board below the screen: 19 px at 390×844 (only 10), 176 px at 375×667; puzzles 01–03, 05, 07–10
- Wrapped row above a board that runs off a 390 × 844 screen `div.sb-two` (“ABCD ABCD”): 2 rows, +230 px (board 19 px off) at 390×844; puzzles 10
- Near miss (40–43 px) `g.sb-spot` (“0 across, 6 up. Move D h”, “1 across, 6 up. Move D h”, “2 across, 6 up. Move D h”): 41×41 px at 390×844; puzzles 02, 05, 07, 09
- Near miss (40–43 px) `g.sb-disc` (“A, yellow”, “B, yellow”, “C, blue”): 43×43 px at 820×1180; puzzles playground; 01, 03, 08
- Note. Wrapped row `div.sb-two` (“ABCD ABCD”): 2 rows, +220 px (board 176 px off) at 375×667; puzzles 10

### kits: 4 problems over 13 puzzles

- Tap target `button.kit-target` (“Target 1”, “Target 2”, “Target 3”): 36×36 px at 390×844, 36×36 px at 375×667, 36×36 px at 820×1180; puzzles playground
- Board below the screen: 269 px at 390×844 (only playground; 03–04, 06–12), 437 px at 375×667; puzzles playground; 01–12
- Wrapped row above a board that runs off a 390 × 844 screen `div.kit-targets` (“Target 1 Target 2 Target”, “Target 5 Target 6 Target”): 5 rows, +156 px (board 269 px off) at 390×844; puzzles playground; 07–08
- Wrapped row above a board that runs off a 390 × 844 screen `div.kit-picker` (“Weight 1 Weight 2 Weight”): 3 rows, +122 px (board 269 px off) at 390×844; puzzles playground
- Note. Wrapped row `div.kit-picker` (“Weight 1 Weight 2 Weight”): 2 rows, +68 px at 390×844 (only 05), 3 rows, +122 px (board 437 px off) at 375×667; puzzles 05; playground
- Note. Wrapped row `div.kit-targets` (“Target 1 Target 2 Target”, “Target 5 Target 6 Target”): 5 rows, +156 px (board 437 px off) at 375×667, 5 rows, +156 px at 820×1180 (only playground); puzzles playground; 07–08

### pantograph: 4 problems over 13 puzzles

- Tap target `polygon.pg-stencil` (“Green shape. Drag it, or”): 30×35 px at 390×844, 28×33 px at 375×667; puzzles 10
- Tap target `g.pg-pin` (“Pin 2 at 2, 0. Drag it, ”, “Pin 2 at 8, 2. Drag it, ”, “Pin at 2, 2. Drag it, or”): 38×41 px at 390×844 (only 11–12), 36×39 px at 375×667; puzzles 08–09, 11–12; playground
- Tap target `g.pg-knob` (“Knob at 4, 3. Drag it to”, “Knob at 1, 1. Drag it to”, “Knob at 6, 4. Drag it to”): 39×39 px at 375×667; puzzles playground; 01–12
- Small text `text.pg-pin-mark` (“1”, “2”): 11.5 px at 375×667; puzzles 11–12
- Near miss (40–43 px) `g.pg-pin` (“Pin at 2, 2. Drag it, or”, “Pin at 2, 6. Drag it, or”, “Pin at 1, 7. Drag it, or”): 41×41 px at 390×844; puzzles playground; 08–09, 12
- Near miss (40–43 px) `g.pg-knob` (“Knob at 4, 3. Drag it to”, “Knob at 1, 1. Drag it to”, “Knob at 6, 4. Drag it to”): 41×41 px at 390×844; puzzles playground; 01–12
- Note. Board below the screen: 24 px at 375×667; puzzles 05

### glued: 4 problems over 12 puzzles

- Tap target `g.pb-point` (“A, small square 1 across”, “A, small square 2 across”, “A, small square 3 across”): 30×30 px at 390×844 (only playground), 30×30 px at 375×667, 30×30 px at 820×1180 (only playground); puzzles playground; 10
- Board below the screen: 163 px at 390×844 (only playground; 02, 05, 09), 325 px at 375×667; puzzles playground; 01–02, 04–09, 11
- Wrapped row above a board that runs off a 390 × 844 screen `div.gl-play-bar` (“Surface Direction”): 2 rows, +72 px (board 60 px off) at 390×844; puzzles playground
- Wrapped row above a board that runs off a 390 × 844 screen `div.gl-dirs` (“right up 1 right, 1 up 2”): 2 rows, +52 px (board 60 px off) at 390×844; puzzles playground
- Near miss (40–43 px) `g.pb-point` (“A, right side, glued to ”, “A, left side, glued to n”, “B, right side, glued to ”): 41×41 px at 390×844, 41×41 px at 375×667 (only 01–02, 04–05, 07–09, 11); puzzles 01–02, 04–05, 07–11
- Note. Wrapped row `div.gl-play-bar` (“Surface Direction”): 2 rows, +72 px (board 231 px off) at 375×667; puzzles playground
- Note. Wrapped row `div.gl-dirs` (“right up 1 right, 1 up 2”): 2 rows, +52 px (board 231 px off) at 375×667; puzzles playground
- Note. Crowded targets `g.pb-point` (“A, right side, glued to ”, “A, left side, glued to n”, “A, top, glued to nothing”): 2 centres within 40 px at 820×1180; puzzles 04–05, 07–09, 11

### base-toggle: 3 problems over 42 puzzles

- Tap target `line.wire-hit` (“Press wire A to C; flip ”, “Press wire B to E; flip ”, “Press wire 1 to 2; flip ”): 42×56 px (35 at its thinnest) at 390×844, 42×56 px (35 at its thinnest) at 375×667; puzzles toggle-05, 08, 31–32
- Small text `.lantern text` (“1”, “2”, “3”): 11.6 px at 390×844, 11.6 px at 375×667; puzzles toggle-01–42
- Board below the screen: 8 px at 390×844 (only toggle-03–12, 36–40), 185 px at 375×667; puzzles toggle-01–42
- Near miss (40–43 px) `line.wire-hit` (“Press wire B to E; flip ”): 43×71 px at 820×1180; puzzles toggle-05, 08

### diffs: 3 problems over 13 puzzles

- Tap target `button.df-floor` (“A, 0 high”, “B, 0 high”, “C, 0 high”): 38×14 px at 390×844, 38×14 px at 375×667, 46×14 px at 820×1180; puzzles playground; 01–12
- Tap target `button.df-cell` (“A, 5 high”, “A, 4 high”, “A, 3 high”): 30×22 px at 390×844, 30×22 px at 375×667, 38×26 px at 820×1180; puzzles playground; 01–12
- Small text `.df-foot i` (“A”, “B”), aria-hidden: 10.9 px at 390×844, 10.9 px at 375×667, 10.9 px at 820×1180; puzzles playground; 01–12
- Note. Board below the screen: 111 px at 375×667; puzzles playground; 05–06, 10–12

### machines: 3 problems over 13 puzzles

- Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667, 11.9 px at 820×1180 (only 11); puzzles playground; 01–12
- Small text `.cup-home span` (“●”, “▲”, “■”), aria-hidden: 10.6 px at 820×1180; puzzles playground; 01–12
- Board below the screen: 107 px at 390×844 (only 12), 284 px at 375×667; puzzles 02–12; playground

## Other modules with problems

- **totals** (3 problems, 3 near misses): Tap target `button.tt-slot` (“Turn 6: empty”, “Turn 1: empty”, “Turn 2: empty”): 39×50 px at 390×844, 37×50 px at 375×667; puzzles playground · Small text `span.tt-h` (“start”), aria-hidden: 9.9 px at 390×844, 9.8 px at 375×667, 11.1 px at 820×1180; puzzles playground; 01–12 · Small text `span.tt-hs` (“start”), aria-hidden: 9.8 px at 390×844, 9.8 px at 375×667, 11 px at 820×1180; puzzles 08
- **knowledge** (3 problems): Small text `text.wk-held-q` (“?”), aria-hidden: 7.9 px at 390×844, 7.9 px at 375×667, 9.8 px at 820×1180; puzzles 01–02, 05–06, 09 · Small text `text.wk-band-letter` (“B”, “R”, “?”), aria-hidden: 10.5 px at 390×844, 10.5 px at 375×667; puzzles playground; 03–04, 07–08, 10–13 · Small text `span.wk-chip` (“Not yet”, “Yes”, “No”): 11.4 px at 390×844, 11.4 px at 375×667; puzzles 01–02, 05–06, 11
- **folds** (3 problems, 1 near misses): Tap target `button.fd-pt` (“river at 0”, “river at 1”, “river at 2”): 25×26 px at 390×844, 23×24 px at 375×667, 29×30 px at 820×1180 (only 01–10; playground); puzzles 01–12; playground · Small text `.fd-letter text` (“A”, “B”), aria-hidden: 11.9 px at 390×844, 11.3 px at 375×667; puzzles 08 · Small text `.fd-p text` (“P”), aria-hidden: 11.6 px at 375×667; puzzles 05, 09
- **matching** (3 problems): Tap target `button.sm-cell` (“A’s choice 3: Y”, “B’s choice 3: Z”, “C’s choice 3: Z, its par”): 98×34 px at 390×844, 94×34 px at 375×667, 106×34 px at 820×1180; puzzles playground; 03–04, 06–07, 11–12 · Small text `.sm-mini text` (“A”, “B”, “X”), aria-hidden: 7.7 px at 390×844, 7.7 px at 375×667, 7.7 px at 820×1180; puzzles playground · Board below the screen: 5 px at 390×844 (only 08–10), 182 px at 375×667; puzzles 01–12; playground
- **flow** (3 problems, 1 near misses): Tap target `line.gb-hit` (“Arrow Start to Dot A. Fo”, “Arrow Start to Dot B. Fo”, “Arrow Start to Dot C. Fo”): 22×30 px (20 at its thinnest) at 390×844, 20×28 px at 375×667, 38×36 px (29 at its thinnest) at 820×1180; puzzles 01–07, 09–11 · Tap target `g.gb-node` (“Start. Start a route”, “Dot A. Go here”, “Dot B. Go here”): 35×35 px at 390×844 (only 06), 33×33 px at 375×667; puzzles 06, 11 · Small text `text.gb-label` (“▶”, “A”, “B”): 10 px at 390×844, 9.5 px at 375×667; puzzles 06, 11
- **shuffles** (3 problems): Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles playground; 01–09 · Board below the screen: 160 px at 390×844 (only playground; 02–03), 332 px at 375×667; puzzles playground; 02–09 · Wrapped row above a board that runs off a 390 × 844 screen `div.case-tools` (“Itself or later Any slot”): 2 rows, +51 px (board 160 px off) at 390×844; puzzles playground
- **leftovers** (3 problems): Board below the screen: 250 px at 390×844 (only 02, 04–07, 09–10), 427 px at 375×667; puzzles 01–07, 09–10; playground · Wrapped row above a board that runs off a 390 × 844 screen `div.lo-bins` (“Left over 0 1 2”, “Left over 2”, “Left over 0 1 2 3 4”): 4 rows, +298 px (board 250 px off) at 390×844; puzzles 02, 04–07, 09–10 · Wrapped row above a board that runs off a 390 × 844 screen `div.lo-row` (“Card 0, in hand Card 1 C”): 3 rows, +118 px (board 88 px off) at 390×844; puzzles 04–07, 09–10
- **braces** (3 problems): Small text `text.bf-name` (“R1”, “R2”, “R3”): 11.7 px at 375×667; puzzles 10 · Board below the screen: 197 px at 390×844, 359 px at 375×667; puzzles playground; 04–10 · Wrapped row above a board that runs off a 390 × 844 screen `div.bf-boards` (“R1R2R3C1C2C3C4 R1R2R3C1C”, “R1R2C1C2C3 R1R2C1C2C3”, “R1R2R3C1C2C3 R1R2R3C1C2C”): 2 rows, +275 px (board 172 px off) at 390×844; puzzles playground; 04–10
- **rookrace** (3 problems, 2 near misses): Tap target `button.rr-cell` (“0 right, 10 up”, “1 right, 10 up”, “2 right, 10 up”): 29×30 px at 390×844 (only everystart-06), 26×26 px at 375×667, 34×34 px at 820×1180 (only everystart-06); puzzles everystart-01, 04, 06 · Tap target `span.rr-cell` (“Star”, “0 right, 7 up”, “1 right, 7 up”): 29×29 px at 390×844 (only everystart-06), 26×26 px at 375×667, 34×34 px at 820×1180 (only everystart-06); puzzles everystart-01, 04, 06; 03–05 · Tap target `button.es-slot` (“Make the left pile 1”, “Make the left pile 2”, “Make the left pile 3”): 38×32 px at 390×844, 38×32 px at 375×667, 42×34 px at 820×1180; puzzles everystart-02–03, 05
- **covers** (3 problems, 1 near misses): Tap target `polygon.sg-hit` (“top-left small square of”, “top-right small square o”, “bottom-left small square”): 39×39 px at 390×844, 37×37 px at 375×667; puzzles 11–12 · Board below the screen: 1561 px at 390×844 (only playground), 1723 px at 375×667, 526 px at 820×1180 (only playground); puzzles playground; 01–12 · Wrapped row above a board that runs off a 390 × 844 screen `div.cv-shapes` (“Triangle Diamond Plus He”): 5 rows, +1320 px (board 1561 px off) at 390×844; puzzles playground
- **cops** (3 problems, 1 near misses): Tap target `g.gb-node` (“Dot a. Put C here”, “Dot b. Put C here”, “Dot c. Put C here”): 39×39 px at 375×667; puzzles playground; 02 · Small text `text.two` (“C1”, “C2”), aria-hidden: 11.6 px at 390×844, 11.1 px at 375×667; puzzles two-01–02 · Board below the screen: 72 px at 390×844 (only 08), 226 px at 375×667; puzzles 04, 06, 08–11; fold-02–03; two-01–02
- **rhombus** (3 problems): Tap target `g.tg-point` (“Flip the three rhombi ro”): 33×33 px at 390×844, 31×31 px at 375×667; puzzles playground; 12 · Tap target `polygon.tg-hit` (“Rhombus on row 5, triang”, “Rhombus on row 7, triang”): 39×56 px at 390×844, 37×53 px at 375×667; puzzles playground · Board below the screen: 38 px at 390×844 (only 08, 12), 198 px at 375×667; puzzles 02, 04, 06–09, 11–12; playground
- **offers** (3 problems): Board below the screen: 543 px at 390×844 (only 05–07, 09), 720 px at 375×667; puzzles 05–09 · Wrapped row above a board that runs off a 390 × 844 screen `div.off-board` (“Cards starting with 0 Ca”): 3 rows, +624 px (board 543 px off) at 390×844; puzzles 05–07, 09 · Wrapped row above a board that runs off a 390 × 844 screen `div.off-cards` (“0, 0, 0 0, 0, 4 0, 0, 6 ”, “4, 0, 0 4, 0, 4 4, 0, 6 ”, “6, 0, 0 6, 0, 4 6, 0, 6 ”): 3 rows, +98 px (board 193 px off) at 390×844; puzzles 05
- **rainbow** (3 problems): Tap target `polygon.tg-hit` (“Triangle 9, rainbow. Sta”, “Triangle 2, rainbow. Sta”, “Triangle 8, rainbow. Sta”): 23×30 px at 390×844, 21×28 px at 375×667, 31×40 px at 820×1180; puzzles 03, 09 · Tap target `g.tg-point` (“Dot 2 in row 1, hidden. ”, “Dot 3 in row 1, hidden. ”, “Dot 4 in row 1, hidden. ”): 39×39 px at 390×844, 37×37 px at 375×667; puzzles 11 · Small text `text.tg-letter` (“R”, “B”, “Y”), aria-hidden: 11.9 px at 375×667; puzzles 01; s01–02
- **base-swap** (2 problems): Small text `.cup-identity i` (“▲”, “●”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles swap-k1-01–12; swap-23-01–12; swap-45-01–12 · Small text `.cup-home span` (“●”, “▲”, “■”), aria-hidden: 10.8 px at 820×1180; puzzles swap-k1-01–12; swap-23-01–12; swap-45-01–12
- **chips** (2 problems): Small text `span.chip-sink-label` (“Sink”), aria-hidden: 11.4 px at 390×844, 11.4 px at 375×667, 11.4 px at 820×1180; puzzles playground; 01–11; s01–02 · Board below the screen: 81 px at 390×844 (only 05, 09), 246 px at 375×667; puzzles 01–12; playground
- **shields** (2 problems, 1 near misses): Tap target `g.pb-point` (“1 across, 0 up”, “2 across, 0 up”, “3 across, 0 up”): 35×35 px at 390×844, 33×33 px at 375×667, 39×39 px at 820×1180; puzzles playground; 01–10 · Board below the screen: 236 px at 390×844, 383 px at 375×667; puzzles playground; 01–10
- **knots** (2 problems, 1 near misses): Tap target `g.kn-arc` (“the loop, no colour. Cha”, “the top arc, no colour. ”, “the bottom left arc, no ”): 25×22 px (17 at its thinnest) at 390×844, 16×215 px at 375×667, 20×261 px at 820×1180; puzzles playground; 02–12 · Board below the screen: 75 px at 390×844 (only 07, 12), 197 px at 375×667; puzzles 01–02, 05–07, 09–12; playground
- **sumsets** (2 problems): Tap target `button.ss-card` (“A 0”, “A 1”, “A 2”): 29×44 px at 390×844, 28×44 px at 375×667; puzzles playground; 01–11 · Small text `span.ss-num` (“0”, “1”, “2”): 11 px at 390×844, 11.1 px at 375×667; puzzles playground; 01–11
- **globe** (2 problems, 1 near misses): Tap target `button.gl-turn` (“Turn left”, “Turn up”, “Turn down”): 44×38 px at 390×844, 44×38 px at 375×667, 44×38 px at 820×1180; puzzles playground; 01–10 · Board below the screen: 19 px at 390×844 (only 03, 06, 10), 170 px at 375×667; puzzles 01–10; playground
- **base-billiard** (2 problems, 1 near misses): Tap target `g.cr-crossing` (“Crossing 1 across, 1 up”, “Crossing 2 across, 1 up”, “Crossing 3 across, 1 up”): 25×25 px at 390×844, 25×25 px at 375×667, 29×29 px at 820×1180; puzzles billiard-05–06, 09, 11–14 · Board below the screen: 8 px at 390×844 (only billiard-05, 09, 12), 166 px at 375×667; puzzles billiard-01–18
- **mobius** (2 problems, 1 near misses): Tap target `g.pb-point` (“Cut the lower line”, “Cut the upper line”, “Light the bottom edge”): 29×16 px at 390×844, 27×15 px at 375×667, 37×21 px at 820×1180 (only playground; 03–12); puzzles playground; 01–12 · Small text `text.mb-strip-number` (“1”, “2”, “3”): 11.3 px at 390×844, 10.8 px at 375×667; puzzles 06, 10
- **joins** (2 problems): Tap target `button.jn-strip` (“3”, “1”, “2”): 20×36 px at 390×844, 19×36 px at 375×667, 34×36 px at 820×1180; puzzles playground; 01–04, 06–12 · Board below the screen: 29 px at 390×844, 206 px at 375×667; puzzles 11
- **proofs** (2 problems): Small text `text.flip-label` (“A”, “⚑”, “B”): 10.3 px at 390×844, 9.8 px at 375×667; puzzles proof-flip-03–04 · Board below the screen: 1204 px at 390×844 (only proof-garden-01–07; proof-flip-01–02, 04; proof-sort-01–03), 1381 px at 375×667, 775 px at 820×1180 (only proof-garden-05–07); puzzles proof-garden-01–07; proof-flip-01–04; proof-sort-01–03; proof-duel-01–03
- **reshape** (2 problems, 1 near misses): Tap target `polygon.sg-hit` (“The 8 by 2, chosen”, “The 10 by 4, chosen”, “Row 1, column 1”): 29×29 px at 390×844 (only 05, 08, 10–12), 29×29 px at 375×667; puzzles 01–12 · Board below the screen: 10 px at 390×844 (only 04–06, 08, 10–11), 149 px at 375×667; puzzles 01–12
- **cuts** (2 problems, 1 near misses): Tap target `line.tm-edge-hit` (“Line AC. Flip”, “Line AD. Flip”, “Line BD. Flip”): 31×31 px (21 at its thinnest) at 390×844, 31×31 px (21 at its thinnest) at 375×667, 31×31 px (21 at its thinnest) at 820×1180; puzzles 03, 05–07, 09–11 · Board below the screen: 25 px at 390×844 (only 06), 187 px at 375×667; puzzles 01–11; playground
- **bags** (2 problems): Small text `i.case-counter` (“1”, “2”, “3”): 11.1 px at 390×844, 11.1 px at 375×667, 11.8 px at 820×1180 (only 01); puzzles 01–08 · Board below the screen: 705 px at 390×844 (only 02–08), 882 px at 375×667; puzzles 02–08; playground
- **loops** (2 problems, 1 near misses): Small text `.lp-badge text` (“8”, “4”, “2”): 11.5 px at 375×667; puzzles 13 · Small text `text.lp-letter` (“A”, “B”, “C”), aria-hidden: 11.6 px at 390×844, 11.6 px at 375×667, 11.6 px at 820×1180; puzzles 01–10
- **mst** (2 problems, 1 near misses): Tap target `line.gb-hit` (“Link A to C, price 1. Bu”, “Link A to B, price 1. Bu”, “Link B to C, price 2. Bu”): 42×42 px (30 at its thinnest) at 390×844, 42×42 px (30 at its thinnest) at 375×667, 42×42 px (30 at its thinnest) at 820×1180; puzzles 01–06, 08–10, 12 · Tap target `g.gb-node` (“Place A. Put it on your ”, “Place B. Put it on your ”, “Place C. Put it on your ”): 39×39 px at 375×667; puzzles 11
- **mixup** (2 problems): Small text `.cup-identity i` (“●”, “▲”, “■”), aria-hidden: 9.9 px at 390×844, 9.9 px at 375×667; puzzles playground; 01–09 · Small text `.cup-home span` (“●”, “▲”, “■”), aria-hidden: 10.8 px at 820×1180; puzzles playground; 01–09
- **blocks** (2 problems): Tap target `polygon.tg-hit` (“Row 1, triangle 1, point”, “Row 2, triangle 1, point”, “Row 2, triangle 2, point”): 35×42 px (33 at its thinnest) at 390×844, 33×41 px at 375×667; puzzles blockfill-06–07; redfill-07–08 · Board below the screen: 22 px at 390×844 (only blockfill-02), 182 px at 375×667; puzzles blockfill-01–07; blueduel-01, 07, 09–10; redfill-03–08
- **detours** (2 problems): Tap target `line.gb-hit` (“Road A to B. Step to B”, “Road D to A. Step to D”, “Road H to A. Step to A”): 41×43 px (31 at its thinnest) at 390×844, 41×43 px (31 at its thinnest) at 375×667, 41×43 px (31 at its thinnest) at 820×1180; puzzles 05–10 · Tap target `button.dt-stop` (“Step 1 reaches B. Cancel”, “Step 2 reaches A. Cancel”, “Step 3 reaches B. Cancel”): 44×38 px at 390×844, 44×38 px at 375×667, 44×38 px at 820×1180; puzzles 01–02
- **aims** (2 problems): Small text `text.am-lab` (“D”, “B”, “C”): 11.5 px at 375×667; puzzles 01–11 · Board below the screen: 1 px at 390×844 (only 11), 163 px at 375×667; puzzles 01–11
- **decks** (2 problems): Board below the screen: 143 px at 390×844 (only playground; 06, 08–09, 11–12), 325 px at 375×667; puzzles playground; 01–12 · Wrapped row above a board that runs off a 390 × 844 screen `div.case-tools` (“A against B B against C ”): 2 rows, +51 px (board 77 px off) at 390×844; puzzles playground
- **beads** (2 problems): Board below the screen: 30 px at 390×844 (only playground), 207 px at 375×667; puzzles playground; 02–06, 08, 10–12; h01–07 · Wrapped row above a board that runs off a 390 × 844 screen `div.bd-sizes` (“3 beads 4 beads 5 beads ”): 2 rows, +50 px (board 30 px off) at 390×844; puzzles playground
- **stars** (2 problems): Board below the screen: 112 px at 390×844 (only 07, 09–11), 277 px at 375×667; puzzles 01–11 · Wrapped row above a board that runs off a 390 × 844 screen `div.star-picker` (“Ring of 5 dots Ring of 6”): 3 rows, +100 px (board 112 px off) at 390×844; puzzles 07, 09–10
- **gapflood** (2 problems, 1 near misses): Tap target `line.gb-hit` (“Road from 12 o’clock to ”, “Road from 11 o’clock to ”): 17×31 px at 390×844, 16×31 px at 375×667, 26×31 px at 820×1180; puzzles 06 · Tap target `g.gb-node` (“0 across, 0 up, home A, ”, “1 across, 0 up. Draw AB ”, “0 across, 1 up. Draw AB ”): 35×35 px at 390×844, 33×33 px at 375×667 (only 05, 10); puzzles 01–10
- **base-nim** (2 problems): Board below the screen: 237 px at 390×844 (only nim-08, 11–12), 414 px at 375×667; puzzles nim-02, 05–09, 11–12 · Wrapped row above a board that runs off a 390 × 844 screen `div.duel-piles` (“Pile 1, 1 pebble Pile 2,”, “Pile 1, 3 pebbles Pile 2”): 2 rows, +356 px (board 237 px off) at 390×844; puzzles nim-08, 11–12
- **tetra** (2 problems, 1 near misses): Small text `.tt-mini-letters text` (“A”, “D”, “C”), aria-hidden: 8.8 px at 390×844, 8.8 px at 375×667, 9.9 px at 820×1180; puzzles 11–12 · Overlapping labels `h1.puzzle-goal / .tt-corner span`: “Find every pair of letters that, made th” and “D” 70% at 390×844 (only 08), “Find every pair of letters that, made th” and “D” 62% at 375×667 (only 08, 10), “Make two letters the same, then turn to ” and “D” 61% at 820×1180 (only 06, 08–09); puzzles 06, 08–10
- **towers** (2 problems): Board below the screen: 10 px at 390×844 (only 11–12), 212 px at 375×667; puzzles 03, 06–12 · Wrapped row above a board that runs off a 390 × 844 screen `div.tw-main` (“City 1234214343213412Als”, “City 1234214334124321”): 2 rows, +186 px (board 10 px off) at 390×844; puzzles 11–12
- **ends** (2 problems, 1 near misses): Tap target `g.ends-dot` (“Dot two roads from the c”, “Dot one road from the ce”): 3×3 px at 390×844 (only 05, 12), 3×3 px at 375×667 (only 05, 12), 3×3 px at 820×1180; puzzles 05, 08, 12 · Cut off `target g.ends-dot`: 31 of 62×62 px at 820×1180; puzzles 08
- **shrink** (2 problems, 2 near misses): Tap target `button.sk-gap` (“Seams between tiles 1 an”, “Seams between tiles 2 an”, “Seams between tiles 3 an”): 35×46 px at 390×844, 33×46 px at 375×667; puzzles 03, 06, 09 · Tap target `button.sk-tile` (“Tile 1, A”, “Tile 3, B”, “Tile 5, B”): 39×44 px at 375×667; puzzles 10
- **rotor** (1 problems): Tap target `line.gb-hit` (“Road from the switch to ”, “Road from the top switch”, “Road from the switch abo”): 11×6 px at 390×844, 17×5 px at 375×667, 20×10 px at 820×1180; puzzles playground; 01–13
- **geoboard** (1 problems): Tap target `g.sg-point` (“Dot 0 across, 6 up. Star”, “Dot 1 across, 6 up. Star”, “Dot 1 across, 5 up. Star”): 29×29 px at 390×844, 29×29 px at 375×667, 33×33 px at 820×1180; puzzles playground; 01–12
- **hills** (1 problems): Tap target `button.hills-cell` (“Column 1, 6 high”, “Column 1, 5 high”, “Column 1, 4 high”): 24×26 px at 390×844, 24×26 px at 375×667, 34×28 px at 820×1180; puzzles playground; 01–12
- **piles** (1 problems, 1 near misses): Tap target `g.pl-col`: 27×44 px at 390×844, 26×41 px at 375×667, 39×93 px at 820×1180 (only 04, 07–08, 12); puzzles 01–09, 11–12
- **squares** (1 problems, 1 near misses): Tap target `polygon.sg-hit` (“Row 1, column 1. Make it”, “Row 1, column 2. Make it”, “Row 1, column 3. Make it”): 19×19 px at 390×844, 17×17 px at 375×667, 31×31 px at 820×1180 (only play; 01, 06, 09, 11–12); puzzles play; 01, 04–06, 08–12
- **codebooks** (1 problems, 1 near misses): Tap target `button.cb-lantern` (“triangle, lantern 1, dar”, “triangle, lantern 2, dar”, “triangle, lantern 3, dar”): 34×34 px at 390×844, 34×34 px at 375×667; puzzles 01–12
- **stairs** (1 problems, 1 near misses): Tap target `g.st-go` (“Go right to 1 across”, “Go right to 2 across”, “Go right to 3 across”): 17×17 px at 390×844, 17×17 px at 375×667, 19×19 px at 820×1180 (only 01–05, 07, 09); puzzles 01–05, 07–09
- **secrets** (1 problems, 1 near misses): Tap target `button.sx-lantern` (“Lantern 1, dark”, “Lantern 2, dark”, “Lantern 3, dark”): 34×34 px at 390×844, 34×34 px at 375×667, 36×36 px at 820×1180 (only 09, 13); puzzles 03, 05–06, 09–13
- **friezes** (1 problems): Tap target `rect.fz-hit` (“place 1 of the top row: ”, “place 2 of the top row: ”, “place 3 of the top row: ”): 35×41 px at 390×844, 33×39 px at 375×667; puzzles playground; 03–06, 08–10
- **sides** (1 problems): Small text `span.side-face` (“1”, “2”, “3”), aria-hidden: 10.7 px at 390×844, 10.7 px at 375×667; puzzles playground; 01–07
- **robot** (1 problems, 1 near misses): Tap target `g.mr-step` (“Move east”, “Move north”, “Move west”): 39×39 px at 375×667; puzzles playground; 01–12
- **base-route** (1 problems): Small text `.network-graph text` (“1”, “2”, “3”), aria-hidden: 11.7 px at 375×667; puzzles route-01–12
- **meeting** (1 problems, 1 near misses): Tap target `line.gb-hit` (“Road from 000 to 001. Mo”, “Road from left crossroad”, “Road from right crossroa”): 45×41 px (31 at its thinnest) at 390×844, 45×41 px (31 at its thinnest) at 375×667, 45×41 px (31 at its thinnest) at 820×1180; puzzles 06–07, 09–10
- **menus** (1 problems, 1 near misses): Tap target `button.menu-square` (“Square 0”, “Square 1”, “Square 2”): 28×28 px at 390×844, 27×28 px at 375×667, 36×32 px at 820×1180; puzzles 04, 08, 13, 17
- **trios** (1 problems): Board below the screen: 36 px at 390×844 (only 04), 266 px at 375×667; puzzles 02–10, 12; playground
- **holes** (1 problems): Tap target `polygon.tg-hit` (“Add the wire between dot”, “Tile on triangle 1: flip”, “Tile on triangle 2: flip”): 34×39 px at 390×844 (only 09–10), 28×32 px at 375×667; puzzles 04–10, 12
- **corners** (1 problems): Tap target `line.gb-hit` (“Line from A to B, betwee”, “Line from C to A, betwee”, “Line from B to D, betwee”): 43×43 px (30 at its thinnest) at 390×844, 31×49 px (28 at its thinnest) at 375×667, 42×42 px (30 at its thinnest) at 820×1180; puzzles tree-01–03
- **nests** (1 problems): Board below the screen: 152 px at 390×844 (only 04, 09, 12), 299 px at 375×667; puzzles 01, 04, 07, 09–10, 12
- **lamplighter** (1 problems, 1 near misses): Board below the screen: 10 px at 390×844 (only 11), 179 px at 375×667; puzzles 09–12
- **sites** (1 problems): Tap target `g.st-site` (“A”, “B”): 27×26 px at 390×844, 26×24 px at 375×667, 27×26 px at 820×1180; puzzles playground
- **sorting** (1 problems, 2 near misses): Tap target `button.sort-peg` (“Slot 1, lane 1”, “Slot 1, lane 2”, “Slot 1, lane 3”): 32×40 px at 390×844, 32×40 px at 375×667, 32×40 px at 820×1180; puzzles 07

## Modules with no problems (23)

averages (near misses: `button.av-key` 42×54 px), base-code, base-color, base-jug, base-latin, base-tile, buckets, catches, copies, elevators, fences, firstfit (near misses: `button.ff-dot` 42×42 px), hackenbush (near misses: `span.hb-seg` 42×40 px, `button.hb-add` 48×40 px), islands, octagon (near misses: `button.oc-tab` 91×40 px), orchard, paint, pictures, primes, seeds (near misses: `polygon.sg-hit` 43×43 px), shares, taquin, tropical

## Classes styled by more than one module

- `.pg-board`: proofs, pantograph
- `.gf-bar`: fences, gapflood
- `.gf-puzzle`: fences, gapflood
- `.gf-chips`: fences, gapflood
- `.ct-puzzle`: cuts, catches
- `.s-sun`: ranges, calibrate
- `.s-sky`: ranges, calibrate
- `.s-rose`: ranges, calibrate
- `.dragging`: ranges, tent
