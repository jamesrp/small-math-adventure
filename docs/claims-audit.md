# Claims and refusals audit

October 24, 2026. This audit covers all 106 puzzle modules: the 12 base mechanics and the 94 modules on the family seam (`dist/families.js`). It looks for six patterns that six play-through critics found in 32 families on October 23–24:

1. **Oracle refusals.** A refused claim tells the child more than whether the claim is right.
2. **Claims before any attempt.** A claim on a fresh board solves the puzzle, or its refusal gives away the answer.
3. **Unasked hints.** Without Hint, a line says whether the child is still on a winning path.
4. **Answer-stating confirmations.** A line states the result before the child has claimed it.
5. **The generic error on an ordinary tap.** "That move is not allowed. Check How to play."
6. **Silent cancel on a double tap.** A claim button that toggles a mode has no `data-toggle` guard.

No family was changed. This file lists findings so that fixes can be routed. Nothing here has been played by children.

## Method

- **`scripts/claims-audit.mjs`** (committed with this file). In Node, it walks every expansion puzzle through the controls its own board draws: `expansion-move` and `mechanic-ui` buttons, plus the `data-<prefix>-move` buttons that a family's `wire()` hands to `api.apply`. It uses seeded random walks with some hint moves mixed in. At every board it records:
  - the lines above, on and under the board, with the press that made each appear;
  - unasked dead-end lines (a `deadend` hint without `quiet`, which `dist/ui.js` shows in the feedback line until the first Hint);
  - presses of enabled controls that the mechanic refuses, which `dist/main.js` answers with the generic line;
  - claim buttons whose second press restores the board, and whether they carry `data-toggle`;
  - claims that solve the puzzle when pressed once on a fresh board.

  Runs used 8 walks of 30 steps per puzzle for every module, then 1 walk of 1 step for the fresh-board claims. `node scripts/claims-audit.mjs [module ...] [--walks N] [--steps N] [--out file.json]` reproduces them. The script does not walk gestures that only `wire()` makes (drags, board taps by position), so those were read in the code.
- **A scan of pressed controls.** Every control drawn with `aria-pressed="true"` (the option already chosen) in every puzzle was tried against the mechanic. A family's wire can turn a refusal into something other than the generic line, so these cases were read in the code and set aside:
  - wires that skip pressed controls: bags, copies, decks, machines, mixup, offers, shuffles, and sides when drawing;
  - wires that check a move before applying it and shake instead: stars, firstfit, orchard, folds;
  - sorting's Run, which replays;
  - chips' aria-disabled buttons, which its wire blocks.
- **Targeted Node probes** of a claim on constructed boards, wherever an oracle or early claim was suspected. Each probe is noted as verified in the table: a strategy that solves without reasoning was played to a solve.
- **Reading.** For every module: the README's play sections, the refusal and objective strings in its code, and its hint function's dead ends. The fixed rules used as the standard come from the READMEs of Who knows (`knowledge`), Flip switches (`rotor`), Square leftovers (`leftovers`), Meeting roads (`meeting`) and Memory robot (`robot`), and from Shrink strips (`shrink`) for That's all.
- **Browser confirmations** (own server on port 4481, Chromium, five taps):
  - kits-01: tapping the weight's place already chosen shows the generic line;
  - weigh-01: tapping the pan a pebble is already on shows the generic line;
  - code-01: a second tap on the same bit shows the generic line;
  - toggle-03: one wasted press shows "This picture needs 2 more presss, but only 1 press remain. Undo a press or start again." without Hint.

**Severity.**
- **should:** the finding changes what a child must think about (an oracle, a claim that a guess can satisfy, an unasked winning-path line), or the generic line appears on a common tap inside a puzzle.
- **could:** a playground selector, a rare action, harmless verbosity, a claim that is open early but whose refusal says nothing, and pattern 6.

A refusal that names what is wrong with the child's own move or own claim, without telling them how to solve the puzzle, is treated as harmless feedback, not an oracle.

## Summary

| Pattern | should (modules) | could (modules) |
|---|---|---|
| 1. Oracle refusals | 7: billiard, menus, mst, braces, tank, radon, folds | 3: corners, decks, rookrace |
| 2. Claims before any attempt | 8: tank, paint, hills, sides, blocks, decks, machines, portals | 19 with That's all (or Can't) open on a fresh board but refused with nothing to learn |
| 3. Unasked hints | 10: toggle, latin, weigh, tile, pictures, detours, paint, cuts, portals, ranges | 2: pictures (lonely), hills (pin ranges) |
| 4. Answer-stating confirmation | 0 | 1: weigh |
| 5. Generic error on an ordinary tap | 12: color, code, weigh, codebooks, kits, tank, secrets, detours, hills, menus, calibrate\*, catches\* | sides, and the playground selector in 32 modules |
| 6. Double tap cancels a claim | n/a | 27 modules without the guard (21, plus 6 fixed families) |

\* marks a family among the 32 fixed on October 23–24. Twenty-nine modules have at least one should finding. Thirty-two have nothing.

## Findings to fix (should)

The table is ranked by how directly a child could skip the mathematics. Within a rank group, the order follows the module registry.

| # | Module | Puzzles | Pattern | Line or behaviour | Why it matters | Proposed fix |
|---|---|---|---|---|---|---|
| 1 | radon (Split bands) | radon-01, 03, 04, 08 (find every) | 1 | That's all rings the first shelved split that misses and draws it apart: "This one doesn't meet." | In these puzzles no band is drawn, so judging "meets" is the whole task. Shelving all 7 splits (39 taps) and then repeating That's all and taking off the ringed chip solves each puzzle in 4–7 presses with no judging (verified). | Follow Square leftovers and Shrink strips: one line, "A split on the shelf doesn't meet.", with nothing ringed. The refused shelf stays refused through Undo while it is the same. |
| 2 | tank (Water levels) | tank-07–10 (last gap); 11–12 (choose) | 1, 2 | On a fresh board with no water, "Last gap is t" answers every level t: "Level 10 can be filled", "A level after 7 can't be filled either", and "Show that every level after 11 can be filled", which names the answer. In 11–12 the same claim says whether a chosen pair of jugs is right. | One press per level reads off the answer: 11 for 4 and 5, 17 for 4 and 7, 23 for 5 and 7 (verified). | Open the claim only once the m levels after t are lit, with no "show" refusal. For filled and later, one refusal, "Not the last gap.", locked until the tank changes. (Gaps never stop already waits for evidence.) |
| 3 | billiard (base) | billiard-15 (every room) | 1 | That's all rings a wrong kept room. | Keeping all 36 rooms and pressing That's all 31 times, taking off the ringed room each time, solves the puzzle with no launch (verified). | "A kept room is wrong." or "There is another.", with no ring; locked until the kept set changes (Square leftovers). |
| 4 | folds (River folds) | folds-05, 09 (every start) | 1 | That's all rings the start whose shortest route misses P: "This one's shortest route misses P." | The README says starts show their routes "with no verdict". Starting every point, folding, and repeating That's all and taking away the ringed start solves folds-05 in 45 presses and folds-09 in 58 (verified). A few guesses get judged one by one. | "A start misses P." with no ring; the refused set stays refused through Undo. |
| 5 | menus (Menu games) | menus-04, 08, 13, 17 (track) | 1 | Check outlines the lowest wrong square and says why ("Leave 3, ... you can answer."). | Check, fix, Check fills the track square by square without working out which squares win. | As in Who knows: name a square only if the child changed it since the last Check, otherwise give only the kind of fault; keep Check off until a change. |
| 6 | braces (Braced frames) | braces-01, 02, 04, 05, 08, 10, 11 (fewest) | 1 | Fewest is refused with "It holds, but this brace can go.", and that brace is marked. | Brace every cell, press Fewest, take out the marked brace, repeat: this reaches the fewest with no reasoning. | Mark a brace only if it was added since the last Fewest, otherwise "It holds, but a brace can go." Keep the wait. |
| 7 | mst (Cheapest network) | buy puzzles, every-cheapest, swaps | 1 | The Cheapest refusal draws the exact swap: a gold link to buy and a red one to return, or the loop link to return. | Claim, make the drawn swap, claim again: this converges on a cheapest network with no comparison of costs. | Refuse with only the kind ("Some swap costs less." / "There is a loop."); draw the swap behind Hint only. The claim already stays off until a change. |
| 8 | paint (Paint stacks) | paint-03, 06 and every Can't puzzle | 2 | Can't is open on a fresh board, and a refusal ("Those two can still become one.") does not lock, so the next pair can be tried at once. | Pressing Can't and tapping a pair on a fresh board solves paint-03 for 16 of its 28 pairs and paint-06 for 4 of 28 (verified). | Open Can't after the first card. A refusal keeps Can't off until the next card (Flip switches: Can't after the first counter). |
| 9 | hills (Skyline) | hills-02, 10 (two clues); every Can't puzzle | 2 | Can't is open on a fresh board, and refusals do not lock between pairs. | hills-02 and hills-10 have one clue pair, so Can't plus that pair solves on a fresh board (verified). hills-06 has 1 right pair of 6. In hills-05, a refusal on any of its 3 pairs tells the child the puzzle can be done. | Open Can't after an attempt (a tower built between clues, or a red bar shown). A refusal locks Can't until a height changes. |
| 10 | sides | sides-08; 09, 10 | 2 | The whole-cards Can't is open on a fresh table. | One press solves sides-08 (verified). In 09 and 10, "Keep looking." says the puzzle can be done before any try. | Can't after one Try it (Square leftovers: Can't needs one try first). |
| 11 | blocks (Red trapezoids) | redfill-03, 08; 01, 02, 07 | 2 | Can't is open on a fresh board. | One press solves redfill-03 and redfill-08 (verified). In 01, 02 and 07, "It can be done." answers before a piece is down. | Can't after a first filling attempt (a trapezoid down). The existing lock stays. |
| 12 | decks (Card decks) | decks-07, 10, 12; 04, 09, 11 (deal) | 2 | The deal puzzles' Can't is open on a fresh deal. | One press solves decks-07, 10 and 12, with the certificate drawn (verified). In 04, 09 and 11, "Keep looking." answers before any swap. | Can't after the first swap. |
| 13 | machines (Arrow machines) | machines-04, 09; 02, 03, 05 | 2 | Can't is open on a fresh machine (straight arrows). | One press solves machines-04 and machines-09 (verified). In 02, 03 and 05, "Keep looking." answers before any swap. | Can't after a first finished run, on a machine changed from straight. |
| 14 | portals | portals-04, 11, 12; the other Can't puzzles | 2 | Can't is open on a fresh board. | One press solves portals-04 (trade), 11 (shrink) and 12 (exactly 3 steps) (verified). Elsewhere, "There is a way." answers before a step. | Can't after a first full trip; the lock exists. |
| 15 | ranges (Ruler strips) | every pinning puzzle (01–09) | 3 | After the first pin, an unasked "That pin is not the shortest or the longest join." (or "That pin is not a biggest or a smallest gap.") appears whenever that pin is not one end of a certificate. | It judges each pin alone, so pin, Undo, move finds the extremes. The README says "nothing marks which settings are extremes" and that the two pins are judged together. | Make `pinPlan`'s dead end `quiet: true`. |
| 16 | toggle (base) | toggle-03–12, 36–40 (budget = fewest) | 3 | Each wasted press shows, unasked, "This picture needs N more presss, but only M press(es) remain. Undo a press or start again." This was confirmed in a browser. | Blind presses plus Undo find the shortest solution. The text also has typos: `plural()` gives "more presss", and "1 press remain". | Follow Memory robot: quiet while presses remain; once the budget is spent, "The lanterns don't match the card. Undo." Fix `plural()`. |
| 17 | cuts (Card cuts) | cuts-05, 07, 09, 10 (reach); 11 (tour) | 3 | "The card is too many flips away now. Undo." comes after the first wasted flip, and "From here you can't visit every way. Undo." in the tour. | The line came within a few flips in 38–40 of 40 random walks (verified), so trial plus Undo solves. | `quiet: true` while the budget remains. |
| 18 | detours | detours-03–10 (make, every) | 3 | "This trip can't work. Undo some steps." comes unasked as soon as a trip is doomed. | Random walks hit it in 16–30 of 30 within a few steps (verified). Shorten's rule line already speaks after a finished trip. | `quiet: true`. |
| 19 | portals | portals-03, 06 (exactly k) | 3 | "That trip can't finish on H. Undo." comes unasked after the step that dooms the trip. | Random walks hit it in 35 and 31 of 40, within 2–4 steps. The README files it under Hints. | `quiet: true`; a finished trip off H already shows the failure. |
| 20 | paint | paint-01, 02, 04, 05, 07–11 (budget = fewest) | 3 | "Too few cards are left. Undo." comes unasked after a wasted card. | Trial plus Undo finds the fewest. | Quiet until the budget is spent. |
| 21 | pictures (Switch pictures) | pictures-07, 10, 11 (switch) | 3 | "The rings are N switches away, but only M left" comes unasked. The budget equals the fewest. | Same as above. | Quiet until the budget is spent. |
| 22 | latin (base) | latin-01–12 | 3 | "These entries cannot lead to a complete orchard, even though no symbol repeats yet. Undo a trial or clear an entry." comes unasked. | It tells the child that a legal-looking entry is wrong, which is the deduction itself. The repeat line also shows twice, once on the board and once in the feedback line. | `quiet: true`; show the repeat line once. |
| 23 | weigh (base) | weigh-01–12 | 3 | "These observations leave no guaranteed plan within the N remaining weighings" comes unasked after a weighing while weighings remain. | It judges the experiment design, which is the point of the puzzle. | `quiet: true` while weighings remain. |
| 24 | tile (base Tile garden) | tile-k1-12, tile-23-04, 23-08, tile-45-08, 45-12 most; every tile puzzle | 3 | `dist/ui.js` shows "This leaves an unfillable gap. Undo or lift a tile." whenever the rest can't be covered. | In these five puzzles most first placements trigger it (28 of 33, 19 of 23, 19 of 24, 40 of 61, 36 of 60), so trial and Undo finds the few good starts without seeing why. | Show it unasked only when no tile fits anywhere (stuck); otherwise only behind Hint, whose card has its own line. |
| 25 | kits (Balance kits) | kits-01–12 and playground | 5 | Tapping the place a weight already has (◀ ● ▶) or the target already on the scale shows the generic line. This was confirmed in a browser. | It happens on the most common tap in the family. | Render the chosen option without a move, as Flip switches does, or as a `{noop: true}` UI control, as Who knows does. See the shared fix below. |
| 26 | code (base) | code-01–12 | 5 | A second tap on the bit already chosen shows the generic line. This was confirmed in a browser. | It is a common tap. | Same as above. |
| 27 | weigh (base) | weigh-01–12 | 5 | Tapping the pan a pebble is already on (or Off for a pebble off the scale) shows the generic line. This was confirmed in a browser. | Same as above. | Same as above. |
| 28 | color (base) | color-01–12 | 5 | Tapping a lantern that already has the chosen colour shows the generic line: `networks.js` `moveColor` refuses when `b.colors[i] === color`. | Same as above. | Make it a silent no-op. |
| 29 | tank | tank-02, 04, 06–12 | 5 | Tapping the target level already on the line shows the generic line. | Same as above. | Same as above. |
| 30 | codebooks | codebooks-03, 04, 08–11 | 5 | A refused "No key with N lanterns" stays enabled (render ignores `b.wrong`) while the move refuses it, so a second press or a double tap shows the generic line. In 03 and 11 the chosen length does the same. | A double tap on a claim produces an error. | Draw the refused claim disabled; make the chosen length a no-op. |
| 31 | secrets | secrets-07, 08, 10, 11 | 5 | Tapping the budget or question number tab already chosen shows the generic line. | Same as above. | Make it a no-op. |
| 32 | detours | detours-01, 02 and every shortening | 5 | Every inside dot of the trip row is a button; a dot that is not a turning point shows the generic line. The README says "Other dots do nothing." | The README promises silence. | Do nothing, as documented. |
| 33 | hills | hills-04, 07, 11, 12 (pins) | 5 | Tapping a tower to pin when the pins are used up shows the generic line: a slot past the budget. | Same as Ways out E1. | Shake the pin circles, as sites shakes its slots. |
| 34 | menus | menus-01, 02, 05–07, 11, 15, 18 (game) | 5 (bug) | After a lost game the hint says "Try a new start." with action `new`, which game mode refuses, so Apply hint shows the generic line. No New start button exists there. | Hint leads into an error. | Say "Undo your last turn." with an undo action, as the duels do. |
| 35 | calibrate\* | calibrate-01–04, 06–08 (dial); 05, 09 (report row); 08 (strip); 10, 11 (▲ ▼) | 5 | Several taps show the generic line:<br>• tapping the dial value already set;<br>• tapping the report row already picked;<br>• in calibrate-08, a strip when the tray is full;<br>• in 10 and 11, ▲ or ▼ past the error band. | These are residual cases in a fixed family. | Make chosen options no-ops, shake the tray, and draw ▲ and ▼ disabled at the band's ends. |
| 36 | catches\* | catches-06, 10 | 5 | Tapping the bag size already chosen shows the generic line. | This is a residual case in a fixed family. | Make it a no-op. |

## Smaller findings (could)

| Module | Puzzles | Pattern | Line or behaviour | Proposed fix |
|---|---|---|---|---|
| corners | corners-ring-01, 03, 04, 07, 09 (find every) | 1 | That's all marks the first kept ring that doesn't belong ("This one lies flat.") or both copies of a duplicate ("These two are the same ring."). Each ring's fold already shows on the board, so the first is near harmless. Marking duplicates judges "the same ring, turned or flipped", which is part of the count. | "Two of these are the same ring." with no marks; the refusal is kept while the shelf is the same. |
| decks | decks-01–03 (pairs) | 1 | "A wins more / B wins more" is a two-way guess once the pairs are marked; a wrong answer greys out. decks-03's A/B/C/No question can be answered by pressing all four, since each refusal names the deck that beats it. | Make the answer a final choice, or lock it until a pair changes. |
| rookrace | every start (board and piles) | 1 | Once no start is missing, That's all plays a wrong mark out from that square (ochre ring) and clears every mark. It names one wrong square per press, but each costs a lost game and re-marking. | Acceptable as a counterexample by play. Optionally keep the ring off and play from the square without naming it. |
| mst | mst-12 (design) | 1 | Check on a fresh board gives the number of cheapest networks for the child's own prices and draws them all. | It evaluates the child's own design. Consider counting without drawing. |
| weigh (base) | weigh-01–12 | 4 | Unasked "Your observations single out one possibility. Choose the pebble and submit your answer." tells the child they know enough before they say so. | Drop it, or show it behind Hint. |
| pictures | pictures-08, 12 (lonely) | 3 | The switch corners are outlined automatically once everything is placed. The outline names what is wrong with the child's own picture. | Optionally show the outline only on Check. |
| hills | pin puzzles | 3 | The live dashed heights do the range inference (designed). | Note only. |
| sides | sides-01–03 (draw) | 5 | Tapping the wrong pile after turning the card shows the generic line. The README says "the wrong pile is refused". | Shake the pile instead. |
| latin (base) | latin-01–12 | none | The repeat line shows twice, on the board and in the feedback line. | Show it once. |
| Early That's all | sorting-02, 11; rhombus-03, 07, 11; kits-03, 04, 06, 08–10; tank-02–05; cuts-01, 02, 04, 08; hills-03, 08, 09; redfill-04, 05; portals-02, 07; towers-07, 10; geoboard-06; averages-01–03, 06, 07, 09, 10; diffs-07, 10; sumsets-05, 10; trios-02, 04; nests-05, 07, 12; strings-01, 06, 10; shares-05, 06 | 2 | That's all is open on a fresh board and always says "There is another." | Harmless, but chips, beads, copies, mixup, shuffles, bags, joins and tetra keep it off until the first find. Do the same for consistency. |
| Early Can't with nothing to learn | matching-03, 04, 07 (repair); cardmachines split pairs | 2 | Repair Can't on a fresh board answers "One strip can do it." versus a reason before a strip changes, though the reason still has to be tapped. Cardmachines' split-pair Can't can be pressed before any ending is tried, and "Keep looking." then says the pair can be split. | Open after one change to the strip, or one ending tried on the pair. |
| Playground selectors | chips, sorting, pictures, beads, rhombus, detours, kits, tank, rainbow, fences, paint, cuts, hills, portals, matching, knots, geoboard, covers, averages, trios, nests, mobius; fixed families meeting, ends, glued, shields, taquin, piles, cops, seeds, votes, strands (twists at the limit) | 5 | Tapping the board or size already chosen (or rhombus's chosen hexagon on an empty box, or rainbow's chosen board on a fresh board) shows the generic line. | The shared fix below. |

## Shared fixes

**Tapping the option already chosen (pattern 5).** Every should row for pattern 5 except detours, hills, menus and the calibrate strip and steps is the same case: a control drawn `aria-pressed="true"` whose move the mechanic refuses. The same case accounts for all 32 playground rows. The fixed families make the chosen option do nothing:
- Flip switches draws the chosen tree without `data-action`;
- Who knows sends the chosen count as a `{noop: true}` UI payload;
- bags, copies and the others listed under Method skip pressed controls in their wires.

Two routes:
- **Per family:** do the same in each family, which matches the fixed families.
- **Shared:** a guard in the `dist/main.js` click handler: an `expansion-move` control with `aria-pressed="true"` whose move returns null does nothing, with no message. This fixes all of them at once. It is a change to a shared file, so it needs a decision.

**Unasked dead ends (pattern 3).** All ten should rows are a `deadend` hint without `quiet`, except tile, whose line `ui.js` writes itself. The fixed families' rule, from Memory robot, Doubling elevators and Lamplighter, is `quiet: true` while the budget remains. Once the budget is spent, they say what is wrong. Lamplighter, elevators, robot, cops and hackenbush were checked: none shows a line before that.

**Double tap (pattern 6).** These claim buttons open a claim mode, and a second press of the same button closes it. A quick double tap therefore opens and closes the claim silently. None carries `data-toggle`, so the 350 ms guard in `dist/main.js` (`repeatToggle`) does not apply. Adding `data-toggle="<slot>"` to the button is enough wherever the button is a `data-action` control, including move toggles such as averages' Can't/stop and creases' Can't:
- **Base:** billiard (Can't opens the corner map; shape puzzles 01–04, 07, 08, 10, 16–18).
- **Families:** paint, squares, sites, averages, cardmachines, hills, diffs, mobius (puzzles with more than one edge), shares, strings, trios, globe, geoboard, creases, friezes (Can't and Shortest), tetra, islands (No walk and Fewest), towers (No city), stairs (Fewest).
- **Fixed families:** gapflood, reshape, tropical, votes.
- **Need a guard inside the wire,** because they bypass `main.js`: chips (chips-s02 That's all through `data-chip-pick`), rotor (Can't through its own click listener) and holes (Can't through `data-hl-ui`).

Already guarded: glued, shields, strands.

## Residual cases in the 32 fixed families

- **Generic line:** calibrate (rank 35) and catches (rank 36), plus the playground selectors listed above.
- **Double tap:** gapflood, reshape, tropical, votes, rotor and holes have no guard.
- **Nothing else found.** No fixed family solves when a claim is pressed on a fresh board. No dead end shows before its budget is spent. No oracle refusal was found.

## Modules with nothing found

- **Base:** clock, route, nim, jug, swap.
- **Families added before October 13:** proofs, flow, stars, firstfit, mixup, orchard, shuffles, bags, copies, offers, joins, width. Their designs already match the fixed families:
  - claims wait for the child's own attempt or certificate;
  - refusals say only the kind of fault and lock until a change;
  - dead ends are quiet;
  - chosen options do nothing or are skipped.
- **Fixed families:** hackenbush, loops, primes, knowledge, totals, pantograph, tent, leftovers, octagon, lamplighter, aims, robot, elevators, shrink, buckets.

These families already follow the model and have only could-level items (a playground selector, the double-tap guard, or That's all open early): chips, sorting, beads, rhombus, rainbow, fences, matching, towers, knots, cardmachines, geoboard, squares, covers, sites, averages, diffs, sumsets, trios, nests, strings, shares, stairs, creases, mobius, islands, rookrace, globe, friezes, corners, tetra.

These fixed families have only could-level items: meeting, ends, glued, shields, taquin, piles, cops, seeds, votes and strands (a playground selector), and gapflood, reshape, tropical, rotor and holes (the double-tap guard).

## Fixed since

### Lane B: oracle refusals and chosen options (October 24)

Rechecked with `node scripts/claims-audit.mjs` and each family's tests, validator and browser suite. Untested with children.

- **radon:** That's all answers "Not yet." with nothing ringed and no split drawn apart, the same words for a split that misses and one still to find, locked while the shelf is the same. Shelving all seven splits and taking off the ringed chip no longer works: nothing is ringed. ("A split on the shelf doesn't meet." would judge a one-split shelf; radon has no drawn bands to check it against.)
- **folds:** "A start misses P." with no start ringed, locked while the starts are the same.
- **braces:** Fewest marks a spare brace only if the child added it since the last Fewest, otherwise "It holds, but a brace can go." (an optional `last` field; old saves load).
- **mst:** a refused Check names the kind ("Not the cheapest: a swap costs less." or "… there is a loop.") and draws no swap. mst-12's Check is off until a price changes and gives only the number of cheapest networks, none drawn.
- **menus:** track Check names a square only if the child changed it since the last Check (an optional `before` field), otherwise "A coloured square is not one to leave." or "A square to leave is not coloured."; it is off until a change. After a lost game the hint is a quiet "Undo your last turn." with the Undo button, so Apply hint no longer meets the generic line.
- **tank:** Last gap opens only once the m levels after t are lit; filled and later levels get "Not the last gap.", and the "show" refusal is gone. That's all waits for a first lit level; a refused claim locks every claim until the tank changes. A chosen level or jug: the shared guard.
- **codebooks:** a refused claim is drawn off; the chosen key length is skipped by the wire.
- **secrets:** the chosen budget and question tab are skipped by the wire.
- **calibrate:** strips are off while the tray is full, and −/+ and ▲▼ at their ends. Chosen dials and report rows: the shared guard.
- **kits, catches:** the chosen place, target and bag are the shared guard's case; no family change.
- **corners:** a shelf with a ring kept twice gets "Two of these are the same ring." with neither copy marked.
- **decks, rookrace (could, declined):** in decks the pairs cannot change once all are marked, so a lock would only repeat today's greying; decks-03's refusals are the counterexamples themselves. Rookrace's play-out starts on the wrong square, so taking the ring off hides nothing.
- No lane B module is in pattern 6's list, so no `data-toggle` was added.

## Not covered

- Gestures that only a family's `wire()` makes (drags, positional board taps) were read in the code, not walked.
- Pattern 4 was judged from the strings a module can show. Confirmations after a right claim were accepted when brief, as the brief allows.
- The browser was used for five confirmations only. No child has played any of this.
