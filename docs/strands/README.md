# Strands

October 10, 2026. Twelve puzzles and a playground built from Week 75 of the Bellingham math circle (twists on a cylinder). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 75 worksheet is unpiloted.

The family runs on the shared [portal board](../portal-board.md): its cylinder is a portal-board surface glued left to right only, with real rims at the top and bottom, and both views (the room and the unrolled view) are the board's. Portal rooms ([its notes](../portals/README.md)) is the model family. Puzzles 1–5 and 7–9 are the worksheet's Problem 6 and 7 pairs, puzzles 6, 11 and 12 come from the review card's App fit, and puzzle 10 is new; each puzzle's `provenance` says where it comes from.

## The mathematics

**The object.** A strip whose left and right edges are glued is a cylinder, an annulus (ℝ/ℤ) × [0, 1] with two rims. A **strand** is a simple arc from a fixed point A on the bottom rim to a fixed point B on the top rim, inside the cylinder between them. Cut the cylinder along the seam and lay copies side by side: this **unrolled view** is the universal cover, a strip ℝ × [0, 1]. A strand lifts to a path from the A of the first copy to the B of some copy w; w is its **winding**, the signed number of times it goes round.

**Facts the puzzles rest on.** Each holds for strands with both ends fixed, moved by sliding on the cylinder (isotopy fixing the ends), never lifted off it.

1. **Winding classifies.** Sliding a strand with its ends fixed never changes its winding, and two strands with the same winding slide into each other. The full twist of the cylinder (turn the top rim once round, dragging everything with it) fixes both rims and adds 1 to every winding.
2. **The fewest crossings.** Two strands with windings a and b share A and B. Away from those ends they cross at least max(|a − b| − 1, 0) times, and two straight strands cross exactly that often. *Lower bound:* in the unrolled view, a copy of the first strand that starts k copies right of A ends at the B of copy a + k. For 0 < k < b − a (or b − a < k < 0) the second strand starts on one side of that copy and ends on the other, so it crosses it; crossings with different copies are different points of the cylinder. *Upper bound:* straight lifts meet a copy only where their horizontal gap is a whole number of turns, |a − b| − 1 times strictly inside. A common twist changes neither strand's crossings, so only a − b matters.
3. **Three strands.** Pull three strands tight: each pair crosses max(gap − 1, 0) times, where the gap is the distance between their Bs in copies. On a line the outer gap of three ends is the sum of the two inner gaps. Pairwise targets 1, 1, 3 need gaps 2, 2, 4: windings 0, 2, 4 (the card's answer) or any shift. Targets 1, 1, 1 need gaps 2, 2, 2, and 2 + 2 ≠ 2: impossible, and the strand whose end is in the middle is the certificate. (The brief's "0, 2, 4 possible" reads the card's windings as targets; targets 0, 2, 4 are impossible, since the gaps would be at most 1, 3 and 5, and 5 is not 3 plus at most 1.)

**The model in the app.** The cylinder is four lattice columns round and eight rows up; A and B sit half way round from the seam. A strand is a **bead** on each of the seven rows between the rims, joined by straight pieces, so every strand goes upward. An upward strand never crosses itself: at each height it has one point. This loses nothing, since every winding has an upward strand and the straight strands that attain each minimum are upward. Beads of two strands never share a spot on a row, so two strands meet only between rows, where they cross; A and B are not counted. Crossings are then the whole turns strictly between consecutive gaps (blue's column minus red's, row by row). Beads stay inside the copies the unrolled view shows: the first copy, both Bs, every copy blue must cross from end to end, and a copy more on each side, at most six across. **The lattice is fine enough:** for every puzzle, the validator finds the exact minimum over every placement of both strands' beads in the view and it equals max(|a − b| − 1, 0). (The review card warns that a coarse grid raises minima: a 4 × 3 grid gives 3 for windings 0 and 3, where the answer is 2.)

**Experiments, conjectures, explanations.** The experiments are untangling (drag beads until no crossing will go) and choosing ends. The conjectures come from them: only the difference of windings matters; the fewest is one less than the difference; once, once, once can't be done. The explanations are acts the app checks: after Done the child taps each copy of red that blue must cross, the lower bound pointed at; after Can't the child taps the strand whose end is in the middle. The proofs in words stay in the grown-up notes.

**Grade bands.** The worksheet is grades 4–5 only. The app is grade-free: puzzles 1–3 need only dragging and watching rings disappear (a strong 2–3 player could untangle them); puzzles 4–5 and 7–10 add the copies of red; puzzles 6, 11 and 12 need counting crossings for three pairs at once.

## Where they appear

**Puzzles → Strands** (symbol ≀) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Windings are written red, blue; targets are red and blue, blue and green, red and green.

| # | Level | Kind | Windings or targets | Start | Answer | Week 75 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Untangle | 0, 0 | 2 crossings | 0; Done | P7 (5 and 5), at 0 |
| 2 | Easy | Untangle | 0, 1 | 2 | 0; Done | P6 row 1 |
| 3 | Easy | Untangle | 2, 2 | 2 | 0; Done | P7 (5 and 5; a common twist) |
| 4 | Medium | Untangle | 0, 2 | 3 | 1; Done, tap copy 1 | P6 row 2 |
| 5 | Medium | Untangle | −1, 1 | 3 | 1; Done, tap copy 1 | P6 row 4 |
| 6 | Medium | Design | 0, 0, 1 | ends 0, 0, 0 | ends 0, 1, 2 (or a shift) | card App fit, new targets |
| 7 | Medium | Untangle | 0, 3 | 4 | 2; Done, tap copies 1, 2 | P6 row 3 |
| 8 | Hard | Untangle | −1, 2 | 4 | 2; Done, tap copies 1, 2 | P6 row 5 |
| 9 | Hard | Untangle | 2, 4 | 3 | 1; Done, tap copy 1 | P6 row 6 (against (0, 2)) |
| 10 | Hard | Untangle | −1, 3 | 5 | 3; Done, tap copies 1, 2, 3 | new (P7's lower bound at a gap of four) |
| 11 | Hard | Design | 1, 1, 3 | ends 0, 0, 0 | ends 0, 2, 4 (or a shift) | card App fit |
| 12 | Hard | Design | 1, 1, 1 | ends 0, 0, 0 | Can't; tap the middle strand | card App fit and Decision |

Copy k is the copy of red that starts k copies right of A. Titles name the setting, never the fewest.

## How a puzzle plays

- **The board.** The unrolled view and the cylinder sit side by side; on a phone the unrolled view comes first, with the cylinder beneath it. Red is rose, blue sky and green leaf. The seam is a dashed edge in both views, the first copy is shaded sun, and every crossing is an ochre ring. In the unrolled view of an untangle puzzle, red's copies are drawn faintly beside red, and blue's crossings sit on them.
- **Untangling** (puzzles 1–5, 7–10). Slide a bead sideways along its row, in either view. In the cylinder a slide goes the short way round in the direction the finger moves, across the seam if need be; a spot held by the other strand on that row is skipped. Tab to a bead in the cylinder and use the left and right arrow keys (up and down go to the next bead). Undo takes back a move.
- **Done.** Press Done when no crossing will go. With crossings still to spare it says "There is a way with fewer." and Done waits for a bead to move. At the fewest with nothing forced, Done solves the puzzle. Otherwise it says "Tap each red copy that blue must cross." and the beads rest: each tap on a copy (or near one: a tap goes to the nearest copy) marks it, and the puzzle is solved when every forced copy is marked. A copy blue needn't cross, red itself or the copy ending at blue's B, says "Blue needn't cross that one." and the claim starts over from Done. Tab with Enter or Space works on every copy.
- **Design** (puzzles 6, 11, 12). Three strands from A pull themselves tight; each pair crosses the fewest times its ends allow. Each strand's end is a disc above its B in the unrolled view, side by side where ends share a B. Tap a disc (a tap goes to the nearest disc), then tap a B; or drag a disc along the rim. The three end buttons in the bar do the same with the left and right arrow keys. Chips above show each pair's number, and a chip turns pine when its pair crosses that often. Can't waits for the first moved end. A wrong Can't says "There is a way." and waits for an end to move. A right Can't says "Tap the strand whose end is in the middle.": the discs and buttons become the three strands, a strand that isn't in the middle says "Its end isn't between the other two." and the claim starts over, and the middle one solves the puzzle and draws the two inner gaps and the outer gap they add up to.
- **Undo** never escapes a refusal: undoing to the same strands keeps "There is a way with fewer.", "There is a way.", "Blue needn't cross that one." or "Its end isn't between the other two.".
- **Copy.** One sentence: "Untangle them, then press Done." or "Each pair crosses as often as its number.". No count, budget or answer slot is on screen; the fewest is never printed. The rules and controls are in How to play.
- **Hints.** Before any move, the first hint is the authored nudge, never a claim. After that, hints name one move in words ("Drag the fourth blue bead from the bottom two places left.", "Move the green end four copies right."). At the fewest they give the reason, then "Press Done."; in the claim, "Tap the red copy that starts one copy right of A: blue starts on one side of it and ends on the other.". In puzzle 12 the chain first makes an attempt (two pairs right, with three different ends), then gives the reason ("Red and blue ends are two copies apart, and so are blue and green. So red and green ends are four copies apart or level: they cross three times or not at all, never once. Press Can't."), then "Tap blue: its end is between the other two.". The second level marks the bead and its spot, the disc and its B, or the button on the board; the third offers Apply hint. Hints alone finish every puzzle: from fresh, after a wrong move, a wrong Done, pick or Can't, and from random tangles. Hints are remembered, so a hint after a tap answers at once.
- **What the app avoids.** No twist-word quiz, no predict-the-fewest question and no shown target count. Every solve is something done with the strands, and every claim is checked with its certificate supplied by the child.

## The playground

Two strands with beads, windings 0 and 1 to start. Slide beads, move either end (tap a disc and a B, drag it, or use the end buttons; the moved strand is re-laid by a twist of that strand alone), and twist the whole top rim once round either way with the twist buttons, which adds a turn to both windings and changes no crossing. There is no goal and no Hint, and it never counts as solved. This is the worksheet's Problems 1 and 4 without the twist-word quiz.

## Rules that keep the record honest

- The save is the strands' beads (untangle, playground), the three windings (design), plus the told refusal, the copies or strand tapped, whether an end has moved, and the windings (playground). Crossings, copies, chips and gaps are derived from it.
- Only legal moves are accepted: a bead to a whole column on its own row inside the view, never onto the other strand's spot on that row; an end to a B inside the view; Done and Can't only where the puzzle has them, not twice without a change, and Can't only after an end has moved; picks only in a claim, each copy once; no bead or end moves during a claim; twists only in the playground and only inside the view; nothing after a solve.
- Saved boards are checked: the right keys and nothing else; seven beads per strand on whole columns inside the view, apart on every row; "There is a way with fewer." only above the fewest; a claim and a solve only at the fewest, with only forced copies, and done only with all of them; "There is a way." only where one exists; a right Can't, a middle strand or "Its end isn't between the other two." only where none exists, the middle strand truly in the middle; untouched ends only at the start.
- `scripts/build-strands.mjs` computes start crossings, the fewest, the forced copies and tight witnesses with the mechanic's functions, and checks them against the table. `scripts/validate-strands.mjs` checks everything again by other methods.

## Shared files

None changed besides the registry line. The portal board already had what this family needed: a surface glued one way with real rims (`roomFromRows` with `wrapY: false`, lattice of crosses), straight pieces through the seam (`shoot`), both views with a fixed window, finger slides that follow a point (`wirePortal`'s `enter`) and keys. Counting crossings, keeping beads apart and laying tight strands are this family's own. `dist/sw.js` is rebuilt by `npm run build`, in its own commit.

## Files

| File | Contents |
|---|---|
| `dist/families/strands/strands.js` | Crossings between rows, the fewest, forced copies, tight strands for three windings (a search over rows with no three strands at a point), the twist, the `strands` mechanic (moves, claims, carry for Undo, hints, rendering, slides, taps to the nearest copy or disc, keys) and the playground |
| `dist/families/strands/strands.css` | The two views' layout, strands, beads, rings, copies, end discs and stems, gaps, chips, end buttons and the bar; imports the portal board styles |
| `dist/families/strands/strands.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources |
| `scripts/build-strands.mjs` | Authoring list; checks start crossings, the fewest, forced copies, witnesses and the hint chains; writes `strands.json` |
| `scripts/validate-strands.mjs` | The cylinder rebuilt from the room spec; crossings as sign changes against every translate of red; every fewest as the exact minimum over all bead placements in the view (a search over rows of red and blue columns), against the formula and a winding sweep by gaps; forced copies by sides at the ends; design targets over every triple of ends by gaps on a line, tight strands checked pair by pair with no three meeting, and 1, 1, 1 impossible over windings −12 to 12; witnesses as moves; hint words read back against their moves; hint chains from fresh, after wrong Done, picks and Can'ts, with Undo, and from random tangles; hint speed; illegal moves; forged saves; the playground's twists; run by `npm run build` |
| `tests/strands.test.mjs` | The cylinder, crossings, the fewest and forced copies, tight strands, untangling with Done and the claim, design with Can't and the middle strand, hints, forged saves, the playground and rendering |
| `scripts/strands-browser-smoke.mjs` | The interface in a browser: slides in both views (across the seam and past the other strand's spot), keys, a wrong Done and Undo, Done and the copies with a tap beside a copy, hints marked and applied, end discs tapped (nearest of three on one B), dropped on a B, dragged and moved by keys, a wrong and a right Can't with the middle strand, focus after each claim, the playground's twists, and no overflow; `TEST_PHONE=1` for touch on a phone |

To change a puzzle, edit `scripts/build-strands.mjs`, then run `node scripts/build-strands.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things for testers to watch first:
  - whether children drag beads in the cylinder or in the unrolled view, and whether the unrolled view's copies of red mean anything to them before Done asks them to tap one;
  - whether Done is pressed when no crossing will go, or as a guess, and whether tapping the forced copies after Done reads as the reason or as a chore;
  - whether the end discs are found and hit on a phone (they are small there; the end buttons in the bar are the large targets), and whether children see that only the gaps between ends matter in puzzles 6, 11 and 12.
- **Phone size.** On a 375 px phone the unrolled view is about 13 px a column, so its beads are small; the cylinder is the comfortable place to drag. Not tried on a real phone or tablet; checked by tests, the validator and browser suites at phone and desktop widths only.
- **Many beads.** A long hint move can drag a bead several turns round ("14 places") after a random tangle; the authored starts need two or three places at most.
- **The twist as a move.** The twist is only in the playground. A puzzle that asks for a twist of one strand to reach a target (the worksheet's P7 last question) is not built.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** The worksheet's yarn cylinder, seam-crossing records, twist words and written rule stay on paper.
