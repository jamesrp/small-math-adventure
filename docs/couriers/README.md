# Mirror Couriers

October 17, 2026. The base mechanic `billiard` (symbol ↗), reworked in place for Week 9 of the Bellingham math circle (bouncing paths). The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-09.md) says revise, and its Decision is what this rework builds: shape the room by dragging its corner to hit a target, with one impossible target per set answered with Can't and the unfolded corner map as the certificate; find every one-bounce room and claim done with no counter; send it home, answered with Can't; and aim in the sheet of unfolded rooms by tapping the first crossing, which then folds into the path. The path draws on Launch, not while dragging. The four prediction screens and the width and rise/run menus of revision 1 are gone. Nothing here has been played by children. Each puzzle's `provenance` names its worksheet source.

## The mathematics

A ball leaves the bottom-left corner of a w × h room of squares, going one square right for every square up (or `rise` up for every `run` across), bounces off each wall like light in a mirror, and stops at the first corner it reaches. Reaching the corner is not a bounce.

- **Unfolding.** Reflect the room in the wall the ball hits instead of bouncing the ball, and the path becomes a straight line through a sheet of mirror copies. The ball stops at the first copy corner on the line. With g = gcd(w, h), at 45° that corner is q = h/g rooms across and p = w/g rooms up. In general it is q = run·h/g′ across and p = rise·w/g′ up, with g′ = gcd(run·h, rise·w).
- **Where it stops.** A copy corner q across and p up folds onto the right wall exactly when q is odd and onto the top exactly when p is odd. The ball has crossed q − 1 side walls and p − 1 end walls of the copies, one bounce each: **p + q − 2 bounces**. (The worksheet's rule: a p by q table in lowest terms stops right iff q is odd, top iff p is odd.)
- **Parity.** A top-right stop is odd across and odd up, so its bounces are even. A top-left or bottom-right stop is odd one way and even the other, so its bounces are odd. So top right after 3 bounces and bottom right after 8 are impossible in every room and for every direction (puzzles 17 and 18).
- **One bounce.** p + q = 3 means one side is twice the other: six rooms up to 6 by 6 (puzzle 15).
- **Never home.** Every copy of the start corner is an even number of rooms across and an even number up. Halfway along the straight line to it is a copy corner, so the ball always stops there first (puzzle 16).
- **Aiming.** Aiming at copy corner (a, b) is the direction b·h up for a·w across. The ball stops at (a, b) only when a and b share no factor; otherwise it stops earlier, at (a, b)/gcd(a, b) (puzzle 11's trap).
- **Limits.** Rooms are whole rectangles with four mirror walls and whole-number directions. Nothing here claims anything about irrational directions, density or ergodicity; this is the elementary unfolding behind billiards in rectangles and on the flat torus.

The children's route goes from experiments (drag, Launch, watch where it stops) to conjectures (doubling a room changes nothing; top right is always even; one bounce means twice) to explanations, which the app supplies as certificates: the corner map with every copy corner's bounces, the halfway rings, the two lines through the one-bounce rooms. Grade bands are not used; the K–1 sheet's targets are the easy set, 2–3's the medium set and 4–5's the hard set, roughly.

## The puzzles

All grade-free (`band: "all"`), in the family's Easy, Medium and Hard groups. Rooms are w × h (wide × high); crossings and copy corners are (across, up) in rooms.

| # | Level | Kind | Goal | Answers | Week 9 source |
|---|---|---|---|---|---|
| 1 | Easy | Shape, 4 × 4 grid | Top left | 1×2, 1×4, 2×4, 3×2, 3×4 | K–1 P5 (top left) |
| 2 | Easy | Shape, 4 × 4 | Bottom right | 2×1, 4×1, 4×2, 2×3, 4×3 | K–1 P5 (bottom right) |
| 13 | Easy | First crossing, 2 × 3 room, sheet 4 × 3 | Tap the first crossing | (3, 2) | 4–5 P3 |
| 16 | Easy | Shape, 6 × 6, map 6 × 6 | Back to the start | Can't: a copy of the start, then a corner on the way | K–1 P6, 2–3 P8, 4–5 P7 |
| 3 | Medium | Shape, 10 × 10, map 7 × 7 | Top right after 6 | 5×3, 10×6, 3×5, 6×10, 7×1, 1×7 | 4–5 P5 (6 by 10) |
| 4 | Medium | Shape, 6 × 6, map 4 × 4 | Top right after 2 | 3×1, 6×2, 1×3, 2×6 | 2–3 P4 (design) |
| 5 | Medium | Aim, 1 × 1 room, sheet 4 × 4 | Bottom right after 3 | (3, 2), (1, 4) | 4–5 P3–P4 sheet; card App fit |
| 8 | Medium | Shape, 6 × 6, map 5 × 5 | Bottom right after 3 | 4×1, 2×3, 4×6 | 2–3 P4 (design) |
| 14 | Medium | First crossing, 4 × 3 room, sheet 4 × 5 | Tap the first crossing | (3, 4): bottom right after 5 | 4–5 P4 |
| 15 | Medium | Find every, 6 × 6 | Every room with one bounce | 2×1, 4×2, 6×3, 1×2, 2×4, 3×6 | 2–3 P6 |
| 17 | Medium | Shape, 6 × 6, map 6 × 6 | Top right after 3 | Can't: (1,4), (2,3), (3,2), (4,1) | 2–3 P4, fourth target |
| 6 | Hard | Aim, 3 × 2 room, sheet 6 × 6 | Top right after 4 | (1, 5), (5, 1) | card App fit |
| 7 | Hard | Shape, 2 up for 1 across, 6 × 6, map 10 × 10 | Bottom right after 9 | 4×3, 5×1, 3×5 | new (revision 1's room) |
| 9 | Hard | Aim, 2 × 3 room, sheet 6 × 6 | Top right after 6 | (3, 5), (5, 3) | card App fit |
| 10 | Hard | Shape, 3 up for 2 across, 8 × 8, map 6 × 6 | Top left after 5 | 5×3, 1×2, 2×4, 3×6, 4×8 | new (revision 1's room) |
| 11 | Hard | Aim, 4 × 3 room, sheet 7 × 7 | Top right after 8 | (3, 7), (7, 3); (5, 5) stops at (1, 1) | card App fit |
| 12 | Hard | Aim, 3 × 4 room, sheet 7 × 7 | Bottom right after 9 | (5, 6), (7, 4) | card App fit |
| 18 | Hard | Shape, 8 × 8, map 9 × 9 | Bottom right after 8 | Can't: (1,9), (3,7), (7,3), (9,1); the other corners on the line may be tapped too | 4–5 P6, fourth target (10 became 8) |

One impossible target per set: 16 (easy), 17 (medium), 18 (hard), as each worksheet set has one. Every answer is accepted, not only the listed witness. `scripts/build-couriers.mjs` holds the list and checks it against this table; the worksheets are in [math-circle-worksheets, week 9](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-09), with the facilitator's answers in its guide (“Table by table”).

## How a puzzle plays

- **Shape the room.** The board is a grid of squares with the room drawn from the start corner; the goal corner has a dashed ring. Drag the room's corner (or tap a grid point; arrow keys on the focused corner) to change the room. Dragging is not a move and draws no path; any old path hides while the room changes. **Launch** is the move: the path draws, with a dot at each bounce and the stopping corner's mark, and one line says where it stopped and after how many bounces ("Top right after 2 bounces."). A launch that meets the goal solves the puzzle.
- **Can't** (shape puzzles) is a claim. It is off until the first launch. It opens the **corner map**: copies of the room as squares, every copy corner marked by the room corner it folds onto, in colour and in shape (start: hollow circle, top left: triangle, top right: square, bottom right: diamond), with the room itself at the bottom left and the child's own launch's stop outlined. Pressing Can't again closes the map.
  - With a bounce count, the child taps the copy corners where a ball could stop after that many bounces (taps toggle) and presses **That's all**. Accepted when every such corner that is first on its own line is tapped and nothing off the line is; corners on the line behind an earlier one may be tapped or left. Then each corner's bounce count is written beside it and the line is drawn as a band.
  - Without a bounce count (the start corner), the child taps a copy of the goal corner, then a copy corner on the straight way to it; the second tap is the claim. Then the line, and a ring halfway to every copy of the start, are drawn.
- **Find every.** The room board with **Launch**, **Keep** and **That's all**. Keep puts the current room on the shelf (a pin at its corner) or takes it off, with no verdict. That's all judges the whole shelf. There is no count and no slot per answer. After the solve, the lines "one side twice the other" are drawn through the pins.
- **Aim.** The room is above, the sheet of copies below. Tapping a crossing chooses the aim (an arrow at the start); choosing is not a move. **Launch** draws the straight line to the first copy corner it meets (faint past it if the aim was further), tints the staircase of rooms it passed, folds those rooms one by one onto the room, and leaves the bouncing path there.
- **First crossing.** The sheet with the 45° line drawn. A tap on the first crossing of two copy walls solves it and folds the staircase into the path; a tap off the line says "The line doesn't go there.", and a later crossing on it "It stops before that.".
- **Copy.** One short visible objective, because the ring cannot say the bounce count: "Stop at the ringed corner after 2 bounces.", "Stop at the ringed corner.", "Stop back at the start.", "Find every room where the ball bounces once.", "Tap where the line first meets a crossing of two walls.". How to play opens with the mathematics ("The ball rolls straight from the bottom-left corner and bounces off each wall like light in a mirror. Each wall it hits is one bounce; the first corner it reaches stops it."), then the gestures; Help and read-aloud keep the full objective.
- **Hints.** Before any move the first hint is the authored nudge (it never names an answer or says Can't). Then: for a possible target, the room or aim to use ("Make the room 3 wide and 1 high, then Launch."); for an impossible one, a launch first, then the reason with "Press Can’t." (the parity of the crossings, or the halfway crossing), then the corners to tap or let go, then "Press That’s all."; for find every, a wrong room to take off, a missing room to keep, then That's all; for the first crossing, the crossing. The second level marks the corner, dot or crossing; the third offers Apply hint. Hints alone finish every puzzle from a fresh start, after wrong moves and claims, and from random states.

## Certificates and claims

- **The child supplies the certificate.** After Can't the child taps the copy corners themselves; the app confirms and only then draws the full argument (every corner's bounce count, or the halfway rings). For the start corner the child taps one instance of the argument, a copy of the start and a corner the ball reaches first on the way; the app then draws it for every copy on the map, because "every copy has a halfway crossing" is a statement about all of them at once that one tap pair exemplifies.
- **Can't comes after an attempt.** Can't is off until a launch, and the map outlines where the child's own ball stopped. The hint chain for an impossible target launches first and gives the reason before Can't.
- **A certificate can fail.** Nothing on the map is tinted, ringed or labelled before the claim (bounce counts appear only after it), taps toggle without a verdict, and the claim is judged once, when That's all is pressed (or when the second tap is in). The validator counts random tap sets that pass: 0 of 20,000 for both bounce-count maps, 15 of 1,260 tap pairs for the start corner.
- **Refusals.** One short line each: "This one isn’t 3 bounces." (that corner ringed), "There is another.", "That corner folds to the top right.", "That isn’t on the way there.", and on a possible target "There is a way.". A refusal clears the taps; Undo brings them back with the refusal, and That's all stays off until they change. "There is a way." closes the map and locks Can't while the launched room is the same; Undo reopens the map with the taps and keeps the lock (the taps and That's all are off; Can't only closes the map). In find every, a refused shelf is remembered, so That's all stays off for it through Undo. No refusal prints a count.
- **Undo always changes the board visibly**: it takes back a launch, a tap, a claim (bringing the taps back) or a Keep.

## Saves and the old puzzles

Revision 1 boards were `{prediction}`: a corner and bounce count, a width, or a rise and run. Ids `billiard-01` to `-12` keep their ids at revision 2, because each reworked puzzle is the same room or target as before and its old answer still answers it (2 by 4 for 01, 2 by 3 for 02, 6 by 10 for 03, 2 by 6 for 04, the aims 2 up for 3 across and 4 up for 1 across for 05, 10 up for 3 across for 06, 4 by 3 for 07, 4 by 6 for 08, the three old aims of 09, 4 by 8 for 10, both old aims of 11 and 8 up for 5 across for 12). `storage.js` reads a revision-1 billiard save, with its Undo history, and restarts that puzzle on a fresh board, keeping `completed`, `helpUsed` and `hintLevel`, as the L-tromino gardens did. A malformed old board, an old board at revision 2, or a forged `done` on a new board is still refused. Ids 13 to 18 are new, at revision 1. The archived caravans keep their numbered picks (numbers 1 to 5 are still ids 01 to 05).

**The Lantern Road.** The Stormy Lighthouse's Mirror room still picks `billiard-02` (K–1, shape: bottom right), `billiard-04` (2–3, shape: top right after 2) and `billiard-05` (4–5, aim: bottom right after 3). Plume's number is still 1 launch: dragging the room and choosing an aim are view state, not moves, so a child who thinks before launching ties Plume. A Can't on a possible target counts as a move.

## Files

- `dist/couriers.js`: the mechanic. Its geometry is pure and exported for the family's groups (Week 71's aiming group starts from `aimAt`, `firstCrossing`, `unfoldLine`, `foldPoint`, `foldMap`, `cornerMap` and `launchOutcome`). `dist/motion.js` imports `billiard` from it and re-exports `simulateBilliard` and the geometry.
- `dist/motion.css`: the board's styles, all under `[data-mechanic-wire="billiard"]`.
- `scripts/build-couriers.mjs` writes the family into `docs/puzzle-expansion/motion.json`; `node scripts/import-expansion.mjs` then rebuilds `dist/puzzles.json` (it now keeps an instance's `revision`).
- `scripts/validate-couriers.mjs`: the independent check. It walks the ball tick by tick on a scaled lattice to recompute every answer set and every launch, searches every room up to 40 by 40 for the impossible targets, checks the certificates against the walked stops and counts random taps, runs hints from fresh boards, wrong moves and random states, and refuses illegal moves and forged saves. `npm run validate` and `npm run build` run it through `scripts/validate-content.mjs`.
- `tests/couriers.test.mjs`, `scripts/couriers-browser-smoke.mjs` (desktop, and `TEST_PHONE=1` for a 375 × 667 phone with touch; screenshots in `SHOTS_DIR` or `test-results/couriers/`); the billiard parts of `tests/motion.test.mjs`, `scripts/expansion-browser-smoke.mjs`, `scripts/copy-browser-smoke.mjs` and `docs/puzzle-expansion/verify_motion.py`.

## Sources

- Week 9 packets: `lowell-math-circle-year-2/source/week-09/src/k-1.tex` (Problems 5–7), `grades-2-3.tex` (Problems 4, 6–8), `grades-4-5.tex` (Problems 3–7), and the facilitator guide `guide-src/facilitator.tex` (“Table by table”, “The mathematics behind the week”). The packet's last change (October 6) predates the card (October 10).
- The review card `plans/review/week-09.md` (App fit and Decision) and its checks in `plans/review/checks/week-09/` (`app_check.py` confirmed revision 1's twelve instances).
- Unfolding in rectangles: S. Tabachnikov, *Geometry and Billiards* (AMS, 2005), Chapter 1, as the facilitator guide cites.

## Not yet done

- **Walk the ball** as a playground or demo (K–1 P1's floor walk, with wrong-way taps refused): the card notes the path is forced, so it is not a puzzle.
- **Place the copy walls** for a 4 by 3 room (4–5 P4 asks the child to draw the sheet): puzzle 14 draws them.
- **4–5 P6's big-grid targets** (top left after 13, top right after 8, bottom right after 11 on a 14 by 12 grid) as shape puzzles; the board would need a larger grid than fits a phone.
- **Bottom right after 10** (4–5 P6) became bottom right after 8 so its map fits the board.
- **2–3 P5's prediction game** for two players, and 4–5 P8's written rule: paper activities.
- **Classroom evidence.** Nothing has been played by children. Watch whether children read the corner map's shapes without help, whether the halfway claim is understood or only tapped, whether the fold animation is followed, and whether the drag (no live path) makes them think before Launch.
- **Story.** The keepers' lines on the road are unchanged; no new art slot.
