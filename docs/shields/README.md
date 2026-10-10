# Portal shields

October 10, 2026. Ten puzzles and a playground built from Week 70 of the Bellingham math circle (four shields in a portal room). They are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 70 worksheet is unpiloted.

The family runs on the shared [portal board](../portal-board.md), the board that [Portal rooms](../portals/README.md) uses. The room is the worksheet's square room with opposite edges glued straight across, drawn with 8 lattice steps a side instead of the worksheet's 4, so that a shot passes three crosses before it reaches T. App coordinates are twice the worksheet's: S is (0, 0), T is (4, 4), and the worksheet's T copy at (2, 6) is (4, 12) here. Each puzzle's `provenance` says where it comes from; puzzles 1, 3, 8 and 10 are new, from the review card's App fit and its fix 5.

## The mathematics

A square room whose right edge is glued to its left edge, and top edge to bottom edge, by translation is a **flat torus**. S sits at the corner (all four corners are one point) and T at the centre. A **shot** is a straight segment from S, which goes out through an edge and comes back in at the matching edge with the same direction, and stops at the first T it reaches. A **shield** is a point of the room other than S and T; it stops a shot only if the shot passes exactly through it. In the unrolled view the room is repeated on every 8 × 8 block of the plane (the universal cover), a shot is one straight line from S, and a shield in the room appears in every copy.

The puzzles rest on these facts. Each holds for this room, gluing by translation, with the target and shields as stated.

1. **Where a shot goes.** A shot along a direction (a, b) with whole numbers a, b sharing no factor meets lattice crosses only at k(a, b), which fold into the room as k(a, b) taken modulo 8. It reaches T = (4, 4) exactly when a and b are both odd, first at k = 4, at the T copy (4a, 4b). So a shot aimed at the copy (4 + 8m, 4 + 8n) may stop at an earlier T: the shot aimed at (12, 12) stops at (4, 4) (the worksheet's Problem 2 trap). Which crosses a shot passes depends only on (a, b) modulo 8, so for shields there are exactly 16 kinds of shot to T.
2. **Four halfway shields stop every shot.** The halfway point of a shot to its first T is (2a, 2b), which folds to (2, 2), (2, 6), (6, 2) or (6, 6), and comes before T. Shields there stop every shot, however long (puzzle 6). This is Lemma 12 of Lelièvre, Monteil and Weiss in one room.
3. **Three never do.** The four corner shots, from the corners straight to the centre, meet only at S and T. A shield is one point, so it stops at most one of them; four are needed (puzzles 2 and 7). With the corner shots and the shots along (1, 3), (3, 1), (3, −1) and (5, 1) (the worksheet's targets (2, 6), (6, 2), (6, −2) and (10, 2)), the four halfway crosses are the only four that work: the card's finite check, rechecked by the validator.
4. **Shots back to S** (no T). A shot along (a, b) first comes back to S at (8a, 8b), passing seven crosses. Its halfway point (4a, 4b) folds to (4, 0), (0, 4) or (4, 4), so those three shields stop every shot, and they are the only three. The shots along the bottom edge, up the left edge and along the diagonal meet only at S, so three are needed (puzzle 9; the review card's fix 5). There are 48 kinds of shot.
5. **T on an edge.** With T at (4, 0), the middle of the bottom edge, a shot reaches T exactly when a is odd and b even, first at (4a, 4b). Its halfway point folds to (2, 0), (6, 0), (2, 4) or (6, 4), and the shots along (1, 0), (−1, 0), (1, 2) and (−1, 2) meet only at S and T, so the fewest is again four, in one arrangement (puzzle 10). The worksheet guide warns that other positions need their own argument; this is one.
6. **Fewest shields and shots that share no point.** For a set of drawn shots, the fewest shields is the size of the smallest set of crosses that meets every shot. Shots that pairwise share no point other than S and T need a shield each, so as many such shots as shields prove the count is fewest. Two shots meet where one is a whole number of rooms from the other: t(a, b) − s(c, d) has both parts multiples of 8 for some t and s strictly inside both shots. The two counts need not agree: the four steep shots along (±1, ±3) cross in pairs between crosses, so they need four shields on crosses (two anywhere), while no three of them avoid one another. Every puzzle here was chosen, and checked, so that the counts agree.

**Shields snap to crosses.** The worksheet's shields are points anywhere in the room. The app places them only on lattice crosses. For every puzzle here the fewest is the same either way, because the tapped shots that prove it share no point at all, crosses or not. Counts of arrangements (in the notes) are counts of crosses.

**Experiments, conjectures, explanations.** The experiments are placing shields and watching which shot the app fires through them. The conjectures come from moving shields along a shot until the next shot is stopped too: the halfway crosses work; three never do; with no T, three halfway crosses work. The explanations are the halfway point of a shot to its first T, and four shots that share no point. The app checks the second explanation by having the child tap the shots; the first stays a grown-up conversation in the notes.

**Grade bands.** The puzzles are grade-free. The worksheet is one Grades 4–5 packet and implies no K–1 route. Puzzles 1 to 4 grow from its Problem 1 and are the gentlest entry: they need following a straight line out through an edge and back in at the other side, and a grown-up to read the one-line goal. Puzzles 5 to 7 are Problems 2 to 4. Puzzles 8 to 10 are the review card's extension (shots back to S) and a new room (T on an edge), for children who finished Problem 4.

## Where they appear

**Puzzles → Portal shields** (symbol ⊠) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Crosses are named "i across, j up" from S at the bottom left; a shot is named by its direction (a, b) and the T copy where it stops.

| # | Level | Room | Shots | Goal | Answer | Proof tapped | Week 70 source |
|---|---|---|---|---|---|---|---|
| 1 | Easy | T in the middle | (1, 1), (1, 3), (3, 1) | Fewest | 2, such as (1, 1) and (1, 3) (6 ways) | (1, 3) and (1, 1) | New, from P1 and P2 |
| 2 | Easy | T in the middle | The four corner shots | Fewest | 4, one on each (81 ways) | The four corner shots | P1 |
| 3 | Easy | T in the middle | (1, 3), (3, 1), (3, −1), (−1, 3) | Fewest | 2: (1, 3) or (3, 1), with (6, 6) | (1, 3) and (−1, 3) | New, from P2 and the card's (6, −2) |
| 4 | Easy | T in the middle | Corner shots, (1, 3), (3, 1) | Fewest | 4, with (2, 6) and (6, 2) forced (9 ways) | The four corner shots | P1 with the card's fix 1 |
| 5 | Medium | T in the middle | (1, 3), (3, 1), (1, 1), (5, 3) | Fewest | 3 (21 ways) | (3, 1), (1, 1), (5, 3) | P2's four aimed shots |
| 6 | Medium | T in the middle | Every shot | Stop them with 4 shields | (2, 2), (2, 6), (6, 2), (6, 6), the only way (Can't is refused) | — | P3 |
| 7 | Medium | T in the middle | Every shot | Stop them with 3 shields | Can't | The four corner shots | P4 |
| 8 | Hard | No T | (1, 0), (1, 1), (1, 2), (1, 3) | Fewest | 2: (4, 0) and (4, 4), the only way | (1, 0) and (1, 1) | New, from the card's fix 5 |
| 9 | Hard | No T | Every shot back to S | Fewest | 3: (0, 4), (4, 0), (4, 4), the only way | (1, 0), (0, 1), (1, 1) | The card's fix 5 |
| 10 | Hard | T at (4, 0) | Every shot | Fewest | 4: (2, 0), (2, 4), (6, 0), (6, 4), the only way | (1, 0), (−1, 0), (1, 2), (−1, 2) | New, after the guide's caution about other positions |

Puzzle 6 shows a budget of four because that is the worksheet's own Problem 3 ("Find four shield points…"); it is a budget puzzle with Can't offered, not a "fewest" puzzle, and puzzle 7 then asks whether three can do. Every fewest puzzle shows only "Stop every shot with as few shields as you can.", with no count.

The worksheets are in [math-circle-worksheets, week 70](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-70), and the review card is [plans/review/week-70.md](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-70.md). The adult guide cites Samuel Lelièvre, Thierry Monteil and Barak Weiss, [*Everything is illuminated*](https://arxiv.org/abs/1407.2975), the definition of a blocking set on page 1 and Lemma 12 on page 12.

## How a puzzle plays

- **The board.** The room and its unrolled view sit side by side; on a phone the room comes first, and the unrolled view moves above it while shots are being tapped.
  - In the room, every cross is a small dot. The portals are dashed edges in the colour of their marks (a sun circle beside the left and right edges, a sky diamond above and below), as on the shared board. S is an ink dot at each corner and T an ink ring, labelled outside the room.
  - The unrolled view outlines each copy in the same colours and shades the room itself. S copies are dots and T copies rings. It shows four by four copies, more when a drawn shot is long (five for puzzle 5, six for puzzle 8).
- **Shields.** Tap a cross in the room to put a shield there (a pine ×), and tap it again to take it off. Enter or Space on a cross does the same. A cross on an edge is drawn on both edges, and either copy works. S and T are not controls. Shields appear lighter in every other copy of the unrolled view. In puzzles 6 and 7, once the budget is full only the shields can be tapped.
- **The partner's shot.** Drawn shots are faint dashes; each one is drawn solid up to the first shield it meets (pine) or, if none, all the way to its T (rose). In puzzles 6, 7, 9 and 10 the app fires one shot that gets through, the shortest one, drawn rose in both views: one line in the unrolled view, broken in the room where it goes through a portal, with a dot where it leaves and comes back in. When no shot gets through, nothing is fired.
- **Fewest** (fewest puzzles). With no shot getting through, press **Fewest**.
  - With more shields than needed it says "Fewer can do it." and stays off at that many shields or more. Undo takes back shields, not that answer.
  - With the fewest, the crosses rest and the line "Tap 2 shots that cross only at S and T." (with the number of shields; "only at S" in the room with no T) appears. Tap the ends of that many shots: T copies (S copies with no T) in the unrolled view, each where its shot stops. In drawn-shot puzzles only the drawn shots can be tapped. A tapped shot is drawn in its own colour in both views; tap it again to drop it. A shot that crosses one already tapped is not taken: "Those two cross.", with the crossings ringed on both lines.
  - The last shot solves the puzzle, and each shield is ringed in the colour of the tapped shot it stops: one shield per shot. Pressing Fewest again before then goes back to the shields.
- **Can't** (puzzles 6 and 7). Can't stays off until there is a shield on the board. Where there is a way (puzzle 6) it says "There is a way." and stays off for good, through Undo. In puzzle 7 it is right: tap four shots that cross only at S and T, as above.
- **Copy.** Each puzzle shows one sentence: "Stop every shot with as few shields as you can." or "Stop every shot with 4 shields." (3 in puzzle 7). The prompt and the short answers ("Fewer can do it.", "There is a way.", "Those two cross.") appear under the button. The rules and controls are in How to play.
- **Hints.** Before any move, the first hint is the authored nudge, which names no cross and never says Can't. After that, hints name one move: "Put a shield at 2 across, 6 up.", "Take off the shield at 0 across, 1 up.", "Press Fewest.", "Tap T in the copy 1 left, 1 down." or "Tap T in the shaded copy again to drop that shot." In puzzle 7 the hints first put a shield on, and only then give the reason in one sentence and "Press Can't.". The second level marks the cross, copy or button, and the third offers Apply hint. Hints alone finish every puzzle: from a fresh start, after stray shields, after a refused Fewest or Can't, after a crossing shot, and after shots that can't be extended.
- **What the app avoids.** No shield slots or shield counter, no discs (a shield stops only a shot through its exact point), no near-miss hits, and no "where does this shot stop?" questions: the app draws every shot.

## The playground

Three rooms, chosen with small room pictures: T in the middle, no T, and T on the edge. Tap a T copy (an S copy in the room with no T) in the unrolled view to aim a shot at it, and again to take it away; up to eight shots, the oldest going first. Each is drawn to the first T it reaches, or to the first shield on its way. Tap crosses in the room to put shields on or take them off. There is no goal and no Hint, and the playground never counts as solved. This is the worksheet's page 1 and Problem 2.

## Rules that keep the record honest

- The save is the shields (crosses in order), the claim (none, Fewest or Can't) and the shots tapped since, the last answer shown, the count Fewest was refused at, and whether Can't was refused. The playground saves its room, shields and aimed copies. Everything drawn, including the partner's shot, is derived from it.
- Only legal moves are accepted:
  - shields on crosses of the room, never on S or T, and not past a budget;
  - Fewest only with shields on the board, no shot getting through, and fewer shields than any refused count; Can't only with a shield on the board and only once where there is a way;
  - shots tapped only during a claim, only at the copy where a shot stops, only the drawn shots in drawn-shot puzzles, and never past the number needed;
  - nothing after a solve.
- Saved boards are checked: shields in order on crosses; a Fewest claim only with the fewest shields stopping every shot; a Can't claim only where no budget-sized set works; tapped shots pairwise sharing only S and T; a refused count above the fewest; "There is a way." only where there is one; aimed copies in the playground that are copies of the target.
- **Undo** (dist/main.js) applies the mechanic's `carry`, which keeps the refused count and the Can't refusal on the board Undo goes back to. Restart clears them.
- `scripts/build-shields.mjs` computes each fewest and every fewest arrangement with the mechanic's search and checks them, the forced crosses and the tapped proofs against the table. `scripts/validate-shields.mjs` checks them again by other methods.

## A change to the shared board

`pointHit` in `dist/portal-board.js` takes an optional `look.r`, the radius of a cross's tap disc in lattice units (default .42, as before). The unrolled view here is zoomed out to four copies of an 8-wide room, where a T copy is a small ring; its tap disc is widened to 2.3 so a T can be tapped where it is seen, and the room's crosses use .5 so neighbouring discs touch but never overlap. The line in [portal-board.md](../portal-board.md) says so, and `tests/shields.test.mjs` checks both the default and a wider disc.

## Files

| File | Contents |
|---|---|
| `dist/families/shields/shields.js` | Shots and where they stop, the 16 or 48 kinds of shot, fewest shields by search over crosses, crossings of two shots, the `shields` mechanic (moves, claims, refusals, carry, hints, rendering, taps) and the playground |
| `dist/families/shields/shields.css` | The two views, cross dots, shields, shots (stopped, getting through, tapped, refused), the copies to tap, buttons and words; imports the portal board styles |
| `dist/families/shields/shields.json` | The pack: a playground, 10 puzzles, 1 family and 3 sources |
| `scripts/build-shields.mjs` | Authoring list; checks every fewest, count of arrangements, forced cross, stopping set and tapped proof against the table above and writes `shields.json` |
| `scripts/validate-shields.mjs` | Shots traced piece by piece through the room in exact fractions; every direction up to 16 steps either way in all three rooms; every set of up to four crosses for each fewest and arrangement; two shots tested for a common point by intersecting their pieces, moved by whole rooms; the card's finite check; the largest set of drawn shots sharing no point; 60 shield sets per puzzle judged against the traced shots, with the fired shot checked; Fewest, Can't and every tappable shot judged; hint chains through controls the board shows, from fresh and after wrong moves; Undo keeping refusals; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/shields.test.mjs` | Shots, the three rooms' theorems, crossings, answers and proofs, shields and budgets, Fewest, Can't, hints, the playground, saves, rendering, the window and words, and the board's wider tap disc |
| `scripts/shields-browser-smoke.mjs` | The interface in a browser: a shield where two shots cross, both copies of a seam cross, Enter on a cross, the fired shot in both views, a refused Fewest kept through Undo, focus after Fewest and Can't, how long a tap takes, tapped shots with a crossing refused, Can't refused and right, the room with no T, hints applied, the playground; no overflow; `TEST_PHONE=1` for touch on a phone |

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch:
  1. Whether children follow the fired shot in the room, where it breaks at the portals, or only in the unrolled view, and whether in puzzles 6 and 9 they move a shield along the shot that got through (the worksheet's partner game) or keep adding shields.
  2. Whether tapping shots after Fewest or Can't reads as the reason ("no shield could stop two of these") or as a second puzzle tapped until the refusals stop; and whether "cross only at S and T" is understood for shots that cross in the room but look apart in the unrolled view (puzzle 1's steep shots).
  3. Mis-taps on a phone: the room's crosses are about 33 px apart at 375 px wide, and the unrolled view moves above the room during a claim.
- **What Fewest reveals.** Fewest is judged when pressed: "Fewer can do it." refuses a count above the fewest, and an accepted press says the count is right before the child has tapped the shots. Undo can't undo a refusal, but Restart clears it.
- **The halfway argument.** Problem 4's "Explain why your points work" is in the grown-up notes only; the app checks the lower bound (the tapped shots) but never asks for the halfway point.
- **Long shots on a phone.** Puzzles 5 and 8 zoom the unrolled view out to five and six copies to hold their longest drawn shot; T and S copies are small there.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** Partner play (one child sets shields, the other aims), and the guide's other positions of S and T beyond the edge room, such as T at (2, 2).
