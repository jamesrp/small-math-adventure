# Gentle hills

October 2026. Twelve puzzles and a playground built from Week 47 of the Bellingham math circle (gentle-step landscapes) and its bonus pages. They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 47 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-47.md) says keep, and its App fit shaped this family. Once the app refuses a jump of two, filling in clues is greedy, so the main puzzle is a different one: **pin a shown landscape with the fewest towers** so that no other landscape fits. Around it are clue sets to fill or refute with Can't, and "find every landscape" with the child saying when they are done. Totals, move routes and predicting a tower's range, which the card calls warm-ups or prediction, are left out.

## The mathematics

A **landscape** is a row of towers, or a ring of them, each a whole number of blocks high (0 allowed), with neighbouring towers differing by at most one block. **Clues** are towers whose heights are given. The distance between two towers is the number of steps between them; on a ring, the shorter way round.

- **When clues fit.** Clues can be completed exactly when every two of them differ in height by at most the distance between them. One way is clear: each step changes the height by at most one. For the other, the lowest landscape below gives a completion. A pair too far apart is the certificate for Can't (puzzles 2, 6 and 10). On a row, if two clues are too far apart then two neighbouring clues along the way are too; on a ring both ways round count, so a 0 and a 3 three steps apart on a row may be only two apart round the back (puzzle 10, Week 47 bonus Problem 1).
- **The lowest and highest landscapes.** When the clues fit, L(i) = max(0, max over clues of a − d(i, c)) and U(i) = min over clues of a + d(i, c) are both landscapes, and every completion lies between them, tower by tower. Every height from L(i) to U(i) occurs at tower i: clamp a constant height t between L and U. So a tower is fixed exactly when L(i) = U(i), which happens exactly when two clues have a straight ramp through it, climbing or falling one block every step (puzzle 1, Week 47 Problem 3).
- **Fewest pins.** Pinning towers of a shown landscape makes them clues. The landscape is fixed exactly when every unpinned tower lies on a straight ramp between two pins. So the fewest pins are the **turning towers**, those not strictly between their two neighbours (a peak, a valley or one tower of a level step), plus the two ends of a row; every pinning that works contains them, so that smallest pinning is unique (puzzles 4, 7, 11 and 12). A ring has no ends: 0, 1, 2, 3, 2, 1 needs only its 0 and its 3 (puzzle 11).
- **Every landscape.** "Find every one" puzzles ask for all completions of a set of clues; the child decides when the list is complete (puzzles 3, 8 and 9: four, three and ten landscapes, from Week 47 K–1 Problem 4, bonus Problem 1 and Problem 5).

This is the discrete case of McShane's extension theorem (1934): a function with a Lipschitz bound on part of a metric space extends to the whole space with the same bound, and max_c (a_c − d(x, c)) and min_c (a_c + d(x, c)) are the least and greatest extensions. Here the space is a path or a cycle, the bound is 1, and the heights are whole numbers (the floor at 0 clips the lowest). `scripts/validate-hills.mjs` checks the statements over every case it can list: every set of clues on rows and rings of up to 5 towers with heights up to 3 (fit exactly when no two are too far apart; the envelopes; every height between them), and every landscape of up to 6 towers with heights up to 3 against every set of pins (the turning towers fix it, and every pinning that fixes it contains them).

## Where they appear

**Puzzles → Gentle hills** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Kind | Towers | Clues or landscape | Answer | Week 47 source |
|---|---|---|---|---|---|---|
| 1 | One ramp | Fill | 5, heights 0–4 | 0 and 4 at the ends | 0, 1, 2, 3, 4 (the only one) | P3, every band |
| 2 | Too steep | Fill, Can't | 5, 0–3 | 0 at column 1, 3 at column 3 | Can't, columns 1 and 3 | K–1 P4, first set |
| 3 | Four ways down | Every | 5, 0–3 | 3 and 0 at the ends | 4 landscapes | K–1 P4, second set |
| 4 | Pin a hill | Pin | 5, 0–4 | 0, 1, 2, 3, 2 | 3 pins: columns 1, 4, 5 | New; after P3 |
| 5 | Just enough room | Fill, Can't | 7, 0–4 | 2, 0, 3 at columns 1, 4, 7 | Any of 3 landscapes (Can't is refused) | New; after 2–3 P7, 4–5 P7 |
| 6 | The steep pair | Fill, Can't | 7, 0–4 | 1, 3, 0, 2 at columns 1, 3, 5, 7 | Can't, columns 3 and 5 | New; after 4–5 P7 |
| 7 | Pin a valley | Pin | 7, 0–4 | 3, 2, 1, 1, 2, 3, 4 | 4 pins: columns 1, 3, 4, 7 | New; after 2–3 P6 |
| 8 | Ring of three | Every | Ring of 5, 0–3 | 0 at column 1, 2 at column 4 | 3 landscapes | Bonus P1 |
| 9 | Ten landscapes | Every | 7, 0–5 | 1, 3, 1 at columns 1, 5, 7 | 10 landscapes | K–1 P5, 2–3 and 4–5 P5 |
| 10 | Round the ring | Fill, Can't | Ring of 5, 0–3 | 0 at column 1, 3 at column 4 | Can't, columns 1 and 4 | Bonus P1 |
| 11 | Pin a ring | Pin | Ring of 6, 0–3 | 0, 1, 2, 3, 2, 1 | 2 pins: columns 1 and 4 | New; after bonus P1 |
| 12 | Pin a long ridge | Pin | 9, 0–5 | 1, 2, 3, 2, 2, 3, 4, 3, 2 | 6 pins: columns 1, 3, 4, 5, 7, 9 | New; after 2–3 P6 |

Each puzzle's `provenance` names its problems. The worksheets are in [math-circle-worksheets, week 47](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-47); they use markers on printed level boards. Puzzles 1, 2, 3, 8, 9 and 10 use the worksheets' clue sets; the other clue sets and every pinned landscape are new.

## How a puzzle plays

- **The board.** Each tower is a column of level cells with the levels numbered at the left, 0 at the bottom. Blocks fill a tower up to its top block, which carries a ring. Clue and pinned towers are dark green; towers the child builds are yellow. A red bar between two towers marks a jump of more than one block. On a ring, a faint copy of the first tower stands after the last, so the jump between them can be seen.
- **Fill and every.** Tap a level in a tower to build it to that height, or drag up and down the tower; tap the top block again to clear the tower. A fill puzzle is solved by any landscape that keeps the clues. In an every puzzle, each finished landscape drops into a row of small pictures under the board, once; **That's all** solves the puzzle when every landscape is there, and otherwise says "There is another landscape." No count of how many are left is shown.
- **Can't.** Fill puzzles from puzzle 2 on offer Can't, solvable or not. Can't makes each clue a button: tap one, then another, to claim that those two can never be joined. A right claim solves the puzzle and rings both clues; a wrong one is refused ("Those two clues fit.") and the next move clears it.
- **Pin.** The landscape is shown whole. Tap a tower to pin it or unpin it; small circles under the board are the pins, filled as they are used, and there are exactly as many as the fewest pins. Dashed cells on each unpinned tower show the other heights its top could have with the pins so far, so a tower with no dashed cells is fixed. When every pin is used and the landscape is not fixed, dotted rings show a second landscape that keeps the pins: the certificate that a pin is in the wrong place. The puzzle is solved when no dashed cells are left.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name one move in words: a tower and a height ("Make column 3 2 high."), the tower to pin or unpin, Can't with the two clues marked, or That's all. The third level offers Apply hint, and hints alone finish every puzzle.

## The playground

Five, seven or nine towers, in a row or a ring, heights 0 to 6. Tap a level to build, and tap a tower's top block to pin it; once something is pinned, the empty towers show, dashed, every height the pins allow, and two pins too far apart are reported to screen readers. **Clear** empties every tower that is not pinned. There is no goal, no Hint, and it never counts as solved.

## Rules that keep the record honest

- Only legal moves are accepted: no change to a clue, heights only on the board, Can't only where offered and only on two clues, That's all only in every puzzles, no pin past the budget, and nothing after a solve.
- The save is the heights and the claim (fill), the heights, the landscapes found and That's all (every), or the pins (pin). Everything shown is derived from it. A save is rejected if it changes a clue, puts a height off the board, keeps a claim on clues that fit or a refusal of clues that don't, lists a landscape that doesn't fit or lists one twice, says That's all before every landscape is found, or holds more pins than the budget.

## Files

| File | Contents |
|---|---|
| `dist/families/hills/hills.js` | Distances, the envelopes, every completion, the turning towers, the `hills` mechanic (fill, every and pin; moves, hints, rendering and the drag) and the playground |
| `dist/families/hills/hills.css` | Styles, using the shared board palette |
| `dist/families/hills/hills.json` | The pack: 12 puzzles, the playground, 1 family and 2 sources |
| `scripts/build-hills.mjs` | Authoring list; computes each answer and writes the pack |
| `scripts/validate-hills.mjs` | Separate searches (every height vector listed; landscapes counted by dynamic programming for every set of pins); the theorems over every small case; each puzzle's answer, the unique smallest pinning, refusals, That's all too soon, and the second landscape; hints alone from fresh, refused and wrong states; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/hills.test.mjs` | Envelopes and completions, the turning towers, fill and its red bar, Can't and the picker, every landscape and That's all, rings, pins and the second landscape, hints, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-hills.mjs`, then run `node scripts/build-hills.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 47: Gentle-step landscapes, packets, bonus pages and adult guides, and the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-47.md) with its math check.
- E. J. McShane, Extension of range of functions, *Bull. Amer. Math. Soc.* 40 (1934), 837–842, [doi:10.1090/S0002-9904-1934-05978-0](https://doi.org/10.1090/S0002-9904-1934-05978-0).

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read the dashed cells as "this tower could still be here" and use them to choose the next pin, rather than pinning towers at random until the dashes go; whether building by tapping a level, and dragging, is easy on a phone, where the cells are about 30 pixels across; and whether children check a ring's last jump, from the final tower back to the first.
- **A demo.** The plan gives each family a few-second demo of its move; a demo here would build a tower, show the red bar of a steep jump, then pin two towers and watch the dashed cells between them shrink.
- **Story.** Gentle hills is not on the Lantern Road and has no keeper lines.
- **Trees and moves.** The bonus pages also put landscapes on trees and count one-block moves between two landscapes; neither is here. Moves are a warm-up at most once illegal jumps are refused, as the card notes.
