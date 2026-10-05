# Mirror Couriers sight lines

October 5, 2026. Twelve puzzles built from Week 31 of the Bellingham math circle ("Hidden orchard", lattice points seen from a corner), added to Mirror Couriers as its **Sight lines** group. They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet, and the Week 31 worksheets have not been piloted either.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-31.md) says **revise**: its one must is an example in the adult guide's optional extension, (4, 3), which does not change when the viewer moves to (1, 1). Nothing here uses that example. The card's App fit asks for tap-to-solve puzzles with exact beams drawn on points, and for a name other than "orchard", since Symbol Orchard is already a family; the group is called Sight lines, and the module keeps `orchard` only as its internal id.

The plan folds Week 31 into Mirror Couriers because both are about the first grid point a straight line from a corner reaches: a courier's light stops at the first corner of the mirror-room grid, and a beam in the orchard stops at the first tree. Mirror Couriers is mostly "predict the corner", which children enjoyed less, so this group is built for tapping: cut, plant or move until the lanterns do what the goal says. It adds a group only and leaves the family's twelve room puzzles alone.

## The mathematics

Trees and lanterns stand on the points of a square grid. The courier stands on one point and sends a straight beam toward each lantern; a beam stops at the first tree or lantern exactly on its line.

- **A lantern a across and b up from the courier has gcd(a, b) − 1 grid points strictly between, at the multiples k · (a, b) / gcd(a, b) for 0 < k < gcd(a, b).** Those points are on the line. Conversely, a grid point a fraction t = r/s (lowest terms) of the way along forces s to divide both a and b, so there are no others. On an axis, gcd(a, 0) = a.
- **So in a full orchard a lantern is seen exactly when a and b share no factor,** it takes exactly gcd(a, b) − 1 cuts to see it, and in an empty field it can be hidden by one planted tree exactly when gcd(a, b) > 1.
- **Every point except the courier lies on exactly one line from the courier,** the line through its first point (a, b) / gcd(a, b). A lantern hides every lantern behind it on that line, and lines never share points, so the blockers of two lanterns overlap only when one lantern hides the other.
- **Visibility depends only on the steps from the courier,** not on where the lantern is. In a full orchard, a courier whose coordinates have the same even–odd pattern as a lantern's never sees it: both steps are even, so the halfway point is a grid point. Four lanterns that use all four even–odd patterns therefore can't all be seen from anywhere. On the 7 × 7 field the converse holds for four lanterns in the middle 5 × 5 (a computer check of all 12,650 sets); in general other primes give more obstructions, such as nine lanterns at 0, 2, 4 both ways, which a third-of-the-way point always blocks.

What is checked in the app: that the beams are drawn and stopped exactly; the budget of cuts or trees; that a claim that some lantern can't be hidden, or that no spot sees every lantern, is true (puzzles 7 and 12) and refused when false (6 and 11). What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Mirror Couriers → Sight lines**, below Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone.

| # | Level | Puzzle | Move | Goal | Answer | Week 31 source |
|---|---|---|---|---|---|---|
| 1 | Easy | One tree in the way | Cut | Light (4, 2) with 1 cut | (2, 1) | Whole-group launch |
| 2 | Easy | Three in the way | Cut | Light (4, 4) and (4, 3) with 3 cuts | (1, 1), (2, 2), (3, 3) | K–1 P2, 2–3 P2 |
| 3 | Easy | Hide the lantern | Plant | Hide (2, 4) with 1 tree | (1, 2) | K–1 P2, turned around |
| 4 | Easy | One tree, three lanterns | Plant | Hide (2, 2), (3, 3), (4, 4) with 1 tree | (1, 1) | K–1 P5 |
| 5 | Medium | A row of lanterns | Cut | Light the row 3 up with 6 cuts | Two each for 0, 3 and 6 across | K–1 P4, 2–3 P3 and P6 |
| 6 | Medium | Hide all three | Plant, or say no | Hide (6, 4), (6, 3), (4, 6) | (3, 2); (2, 1) or (4, 2); (2, 3) | 2–3 P2, 4–5 P4 |
| 7 | Medium | Hide all three again | Plant, or say no | Hide (6, 4), (5, 3), (4, 6) | None: (5, 3) has no point on its line | 2–3 P2, 4–5 P4 (the “can’t”) |
| 8 | Medium | Step among the trees | Move the courier | See (4, 4) and (6, 3) | 15 spots, such as (3, 1) | Guide extension: move O |
| 9 | Hard | Four lanterns, three cuts | Cut | Light 4 of 6 with 3 cuts | (5, 4) plus (6, 4), (2, 6), (6, 2) | K–1 P3, 2–3 P3 |
| 10 | Hard | See all three | Move the courier | See (1, 2), (2, 1), (2, 2) | 6 odd–odd spots | New |
| 11 | Hard | See all four | Move, or say no | See (1, 1), (1, 3), (2, 2), (3, 2) | 5 even–odd spots, such as (2, 1) | New |
| 12 | Hard | See all four again | Move, or say no | See (1, 1), (2, 3), (2, 2), (3, 2) | None: all four even–odd patterns | New (the parity “can’t”) |

Coordinates are (across, up) from the bottom-left point; the board shows no numbers. The worksheets are in [math-circle-worksheets, week 31](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-31). Every instance is new or rearranged; each puzzle's `provenance` names the problems it draws on. Puzzles 10–12 go beyond the packet: the guide's optional extension moves the viewer, and the even–odd certificate is this port's addition.

## How a puzzle plays

- **The field is the control.** Each point is a button the size of its grid cell, with a small mark: trees are leaf circles, lanterns rounded squares (paper when dark, sun when lit), and the courier a pine circle with a sun ring. A thin ochre beam, drawn over the marks, runs from the courier to each lantern and stops at the first tree or lantern on its line; when it stops short, a faint dashed thread carries on to the lantern, like the worksheet's string. The marks stay smaller than the nearest miss on these fields (a beam passes 0.156 of a cell from a point when its steps are 5 and 4), so a beam that misses a point is seen to pass beside it.
- **Cut** (1, 2, 5, 9): tap a tree to cut it (it becomes a stump), tap a stump to put the tree back. Beads below the field show the cuts left; a tap with none left shakes.
- **Plant** (3, 4, 6, 7): the field is empty apart from the lanterns. Tap a point to plant, tap a tree to take it away. Beads show the trees left.
- **Move the courier** (8, 10, 11, 12): every point except the courier and the lanterns holds a tree. Tap a tree and the courier steps there; the point it left grows a tree.
- **Say no** (6, 7, 11, 12): after the first move, a button says that some lantern can't be hidden, or that no spot sees them all. It is checked: refused with "Keep looking" in 6 and 11, accepted in 7 and 12. Hints in these four show the authored hints only, so they don't give away which twin is which.
- **Hints** elsewhere name the next tap (outlined at the second level, applied at the third). With wasted cuts or trees and too few left, the hint first puts one back.

## Rules that keep the record honest

- Lanterns and the courier's point can't be cut or planted on; the courier can't stand on a lantern. Nothing is accepted after a solve.
- Saves are checked: the cut or planted points must be a sorted list of distinct tree or empty points within the budget, with no other keys; the courier's point must be in the field and not on a lantern. In the four decide puzzles a claim is saved only after a move and only when true, and a refusal only when the claim was false.

## Files

| File | Contents |
|---|---|
| `dist/families/orchard/orchard.js` | Points on a line (found by testing every grid point), beams, the `orchard` mechanic, answers, hints and rendering |
| `dist/families/orchard/orchard.css` | The field, beams and threads, trees, stumps, lanterns, the courier, the beads and the claim button |
| `dist/families/orchard/orchard.json` | The pack: 12 puzzles, the group's mathematics and 3 sources |
| `scripts/build-orchard.mjs` | Authoring list; computes each answer on the grid and writes the pack |
| `scripts/validate-orchard.mjs` | Recomputes every answer with gcd; compares the module's beams with gcd on random boards; tries every planting within the budget and every spot for the courier; checks the even–odd claim on all four-lantern sets in the middle 5 × 5 and the nine-lantern thirds example; hints from a fresh and a wasteful start, claims, illegal taps and forged saves; run by `npm run build` |
| `tests/orchard.test.mjs` | Points on a line, beams, cutting, planting, standing, claims, hints, saves, rendering and the satchel group |

The module adds no satchel family; its puzzles set `libraryFamily: "billiard"` and `group: "Sight lines"`. To change a puzzle, edit `scripts/build-orchard.mjs`, then run `node scripts/build-orchard.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children treat a beam that passes close to a point as blocked (the worksheet's thread-thickness worry; the app draws the line exactly, but small fields make near misses look close); whether "cut" and "plant" read clearly as the same picture run in reverse; and whether children move the courier at random or start to aim for spots after a few tries.
- **A playground.** Free play with an orchard (plant, cut, move) would suit this group, but Mirror Couriers has no playground yet and a family has one; adding the orchard as the family's playground is a decision for the family as a whole.
- **Bigger fields and counting.** The worksheet's catalog of visible dots (13 on the 5 × 5, 25 on the 7 × 7) and its infinite-row arguments are left to paper. The card suggests "find every visible tree" and "the visible trees that hide the most" (K–1 P1, P3 and P5); they need a "That's all" claim the app checks, not a counter.
- **Two lookouts.** The bonus's spots hidden from two lookouts (P1–P2) suit a Hard tier, but with the lookouts next to each other almost no lantern can be hidden from both; they need wider spacing, worked out on paper first.
- **The card row.** The bonus's direction cards (P5–P6: insert the sum of two neighbours until (4, 3) and (3, 4) appear) would be a second group of its own.
- **Story.** The group is not on the Lantern Road.
