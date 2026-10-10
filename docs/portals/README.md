# Portal rooms

October 10, 2026. Twelve puzzles and a playground built from Week 41 of the Bellingham math circle (torus portals and lifts). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 41 worksheet is unpiloted.

The family runs on the shared [portal board](../portal-board.md). Its rooms use the worksheet's 3 × 3 portal room with squares lettered A B C / D H E / F G I, and the worksheet's trips: RRRUUU, RRRUUULLLDDD, RRR, and RRRUUU into UUURRR. Puzzles 7, 9 and 12 are new, from the Week 41 review card's App fit and fix 10; each puzzle's `provenance` says where it comes from.

## The mathematics

A room of W × H squares whose right edge is glued to its left edge, and top edge to bottom edge, by translation is a **torus**. A pawn steps from square to square. At an edge it comes back in through the matching edge, in the same row or column. Its squares are the pairs (x mod W, y mod H).

The **unrolled view** repeats the room on every W × H block of the plane. This is the universal cover ℝ² → T². Once the start copy is fixed, a trip from H lifts to exactly one path in the plane, starting at the H of the first copy. If the trip ends on H in the room, its lift ends at the H of some copy (m, n). That copy equals the trip's displacement divided by (W, H): (number of R − number of L, number of U − number of D) / (W, H). It is part of the trip, not of where the pawn stands.

The puzzles rest on these facts. Each holds for the rooms in the app, with gluing by translation and steps of one square.

1. **Every square in two steps** (3 × 3 torus). The two-step displacements are (±2, 0), (0, ±2), (±1, ±1) and (0, 0). Since 2 ≡ −1 (mod 3), they reach all nine squares, H itself included (puzzle 2). In the 3 × 3 room without portals, colour the squares like a checkerboard: each step changes the colour, so two steps from H reach only H and the four corners (puzzle 7).
2. **Trips home in exactly k steps.** A trip comes home exactly when both parts of its displacement are multiples of 3. An odd trip can't have displacement (0, 0), so on the 3 × 3 torus it must go round the room. Three steps: RRR, LLL, UUU and DDD, 4 of the 64 trips (puzzle 3). Five steps: a lap (±3, 0) or (0, ±3) plus a step out and back, 25 trips per lap, so 100 of the 1,024 trips (puzzle 6). On a 4 × 4 torus the checkerboard survives the portals, because a portal joins columns 3 and 0 (or rows 3 and 0), which have opposite colours. Every step changes the colour, so no odd trip comes home (puzzle 12). In general, a W × H torus has an odd trip home exactly when W or H is odd.
3. **Copies.** Standing on H in the room does not tell which copy the pawn is in. A trip can visit other copies and come back to the first one (puzzle 5: RRRUUULLLDDD visits the copy to the right, the copy up and to the right and the copy above, then returns). It can also end on H in another copy (puzzles 1 and 3).
4. **The trade.** Two pawns given the same steps both move by the same displacement v, so in the unrolled view the gap between them never changes. They trade places from p and q exactly when v ≡ q − p and v ≡ p − q, that is, when 2(q − p) ≡ 0 in each coordinate. On a room three wide this never holds for two different squares (puzzle 4: H and E, a gap of one). On a 4 × 4 room it holds when each part of the gap is 0 or 2. The shortest trade then moves each pawn by the gap itself (puzzle 9: F and P, two across and two down, four steps). The certificate for "can't" is the fixed gap, not a list of failed tries.
5. **Shrinking loops.** Two moves change a trip without moving its ends: **erase** a step and its way back (→← or ↑↓), and **slide** a corner (→↑ becomes ↑→), which moves the trip across one square. So neither move changes the copy where the lift ends. A trip can shrink to nothing exactly when its lift ends in the first copy: slide the sideways steps to the front, then erase the pairs (puzzle 8). A trip that ends in another copy never can; RRRUUULLL ends on H one copy up, and shrinks only as far as UUU (puzzle 11). When moves may also be undone (inserting a step and its way back), two trips from H to H change into each other exactly when they end in the same copy. Their copies classify the loops: π₁(T²) = ℤ × ℤ.
6. **Fewest slides.** A slide changes the signed area under the trip by exactly one, and an erasure doesn't change it. So turning one trip into another takes at least the area between them. For trips of R and U steps that many slides is also enough: RRRUUU becomes UUURRR in nine slides, the nine squares between them (puzzle 10, which accepts any route and leaves the fewest to the grown-up notes). Shrinking RRRUUULLLDDD takes nine slides (the area of its loop) and six erasures.

**Experiments, conjectures, explanations.** The experiments are walking the pawn, collecting stars, trying trips of a given length, moving two pawns and pushing corners. The conjectures come from them: everything is two steps away; odd trips home go round; the pawns never trade; some loops won't shrink. The explanations are grown-up conversations in each puzzle's notes: displacement, the fixed gap, the checkerboard, and the end copy that no move changes. The app checks every Can't claim but never asks for the reason.

**Grade bands.** The puzzles are grade-free. Puzzles 1 to 4 need counting to three and a grown-up to read a one-line goal, and match the K–1 packet (walk, every square in two, home in three, the trade). Puzzles 5 to 7 and 9 add copies, laps and walls (the 2–3 packet). Puzzles 8 and 10 to 12 are the 4–5 packet's shrinking loops and slides, with the checkerboard as a certificate.

## Where they appear

**Puzzles → Portal rooms** (symbol ⧉) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Trips are written R, U, L and D for right, up, left and down. The 3 × 3 rooms are lettered A B C / D H E / F G I, top row first; the 4 × 4 room is A B C D / E F G H / I J K L / M N O P.

| # | Level | Kind | Room | Goal | Answer | Week 41 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Walk | 3 × 3 portal room | Reach the star: H one copy right and one up | 6 steps, three R and three U in any order | 2–3 Problem 3 (RRRUUU), as a walk to a marked copy |
| 2 | Easy | Every | 3 × 3 portal room | Every square exactly two steps from H, then That's all | All nine squares | K–1 Problem 2 |
| 3 | Easy | Exact | 3 × 3 portal room | Back to H in exactly 3 steps | RRR, LLL, UUU or DDD (4 of 64) | K–1 Problem 3; 2–3 Problem 2 |
| 4 | Easy | Trade | 3 × 3 portal room | Pawns on H and E trade places | Can't: the gap never changes | K–1 Problem 4 |
| 5 | Medium | Walk | 3 × 3 portal room | Both stars (H one copy right, H one copy up), then H in the first copy | 12 steps, such as RRRUUULLLDDD | 2–3 Problem 5 |
| 6 | Medium | Exact | 3 × 3 portal room | Back to H in exactly 5 steps | A lap and a step out and back, such as RRRRL (100 of 1,024) | K–1 Problem 3 |
| 7 | Medium | Every | 3 × 3 room, no portals | Every square exactly two steps from H, then That's all | H and the four corners | New: the card's fix 10 |
| 8 | Medium | Shrink | 3 × 3 portal room | Shrink RRRUUULLLDDD to nothing | 9 slides and 6 erasures | 4–5 Problem 4 |
| 9 | Hard | Trade | 4 × 4 portal room | Pawns on F and P trade places | RRDD, or any order of two steps the same way across and two the same way up or down (4 steps) | New: the card's App fit |
| 10 | Hard | Shrink | 3 × 3 portal room | Turn RRRUUU into UUURRR, by any route | Any route solves; the fewest is 9 slides, each toward the dashed trip (grown-up notes only) | 4–5 Problem 5 |
| 11 | Hard | Shrink | 3 × 3 portal room | Shrink RRRUUULLL to nothing | Can't: it ends on H one copy up (shrinks to UUU) | 4–5 Problem 4 (RRR can't), with a longer trip |
| 12 | Hard | Exact | 4 × 4 portal room | Back to F in exactly 5 steps | Can't: the checkerboard | New: the card's fix 10, on a room four wide |

The worksheets are in [math-circle-worksheets, week 41](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-41), and the review card is [plans/review/week-41.md](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-41.md). The adult guide cites Hatcher, *Algebraic Topology*, Chapter 1, §1.1 and §1.3.

## How a puzzle plays

- **The board.** The portal room and its unrolled view sit side by side, with the arrow pad under the room. On a phone the unrolled view comes first, with the room and the pad beneath it.
  - In the room, the portals are dashed edges in the colour of their marks: a sun circle just outside the middle of the left and right edges, and a sky diamond outside the top and bottom.
  - The unrolled view outlines each copy with dashed lines in the same colours (sun where it crosses a left–right portal, sky where it crosses a top–bottom one), and shades the first copy in sun. It shows at least seven squares across (eight for the 4 × 4 room), recentring and growing as the trip goes on.
  - The pawn is a sun disc, with a dashed pine ring on its start. Its trail is drawn in both views: one line in the unrolled view, broken in the room where it goes through a portal, with a dot where it leaves and comes back in.
  - The room with no portals (puzzle 7) has walls instead, and no unrolled view.
- **Stepping.** There are several ways to take a step, in either view:
  - tap a square next to the pawn (these are tinted);
  - tap an arrow;
  - press an arrow key;
  - slide a finger from square to square.

  A slide on the unrolled view holds the view still until the finger lifts. Undo takes back a step. Tab with Enter or Space works on every tinted square.
- **Walks to stars** (puzzles 1 and 5). Stars sit on squares of named copies in the unrolled view and fill in when the pawn stands on them. In puzzle 5 the ring on the first copy's H is home. A trip may be up to 30 steps.
- **Exactly k steps** (puzzles 3, 6 and 12). Beads count the steps, and the trip stops when they run out. A trip that ends on H (in any copy) solves the puzzle. **Can't** is accepted only when no trip can. Otherwise it says "There is a way." until the trip changes. After a right Can't in puzzle 12, the squares show their checkerboard colours.
- **Every square** (puzzles 2 and 7). Each two-step trip rings the square it ends on, and the pawn goes back to H. A trip to a ringed square says "Found already." **That's all** says "There is another." until every square is ringed. After that it stays off until a new square is ringed, through any "Found already." on the way. There is no count and no slots.
- **The trade** (puzzles 4 and 9). Two pawns, yellow and blue, each start on a ring of its colour. Every step moves both. In the unrolled view a dotted line joins them, and its length never changes. The goal is each pawn on the other's ring. **Can't** is checked as above.
- **Shrinking** (puzzles 8, 10 and 11). There is no pawn and no pad. The trip is drawn in the unrolled view with a chevron on each step and a ring at its end, and written below as a row of arrows. Each corner has a blue disc: tap it to slide the corner across its square. Each step that goes straight back has a rose disc: tap it to erase the pair. Tab with Enter or Space works on every disc. In puzzle 10 the target trip is dashed, and any route to it solves the puzzle. Nothing on screen counts slides: the fewest, nine, is a question in the grown-up notes. (Portal rooms has no stars to give for a fewest count; stars and Plume's score are on the Lantern Road only.) The square letters sit in a corner of each square, clear of the trip. Can't is checked as above.
- **Copy.** Puzzle 1 shows no objective: the star shows the task. The others show one sentence: "Find every square exactly two steps away.", "Get back to H in exactly 3 steps." (with its own square and count), "Trade places.", "Collect both stars, then come back to the ringed H.", "Shrink the trip to nothing." or "Turn the trip into the dashed trip.". The portal rules and the controls are in How to play.
- **Hints.** Before any move, the first hint is the authored nudge. After that, hints name the next step, slide or erasure in words ("Step right.", "Slide a ↑← corner.", "Erase a there-and-back pair: →←."), or "Press That's all." or "Press Can't." with the reason in one sentence (the fixed gap, the checkerboard, the copy where the trip ends). A trip that can no longer finish gets "That trip can't finish on H. Undo." or "Too many steps. Undo.", and the app's Undo rescue. The second level marks the arrow, square, disc or button on the board, and the third offers Apply hint. Hints alone finish every puzzle: from a fresh start, after a wrong turn, after a wrong Can't or That's all, and after a dead end.
- **What the app avoids.** It asks no "where does it end?" predictions or copy-arithmetic questions, shows no found-count, and never shrinks a loop by itself. Every solve is something done with the pawn or the trip, and every Can't is checked.

## The playground

The playground has four rooms, chosen with small room pictures: the 3 × 3 portal room, the 4 × 4 portal room, a tube (portals left and right only, with walls top and bottom) and the plain room. The pawn walks with a trail of up to 60 steps, and the unrolled view follows it. In the tube the unrolled view is a strip; the plain room has no unrolled view. There is no goal and no Hint, and the playground never counts as solved. This is page 1 of the worksheet in every band.

## Rules that keep the record honest

- The save is the trip as a word of steps, plus:
  - the squares ringed, the answer to That's all and the done flag (every-square puzzles);
  - the answer to Can't;
  - the room (the playground).

  Everything shown, including copies, stars collected, the gap and the end ring, is derived from it.
- Only legal moves are accepted:
  - steps through portals but not walls, up to the beads or the step limit;
  - slides only at corners and erasures only where a step goes straight back;
  - Can't only where the puzzle has it, and not twice without a change; That's all only in every-square puzzles, and not twice without a new ring;
  - nothing after a solve.
- Saved boards are checked:
  - trips use only R, U, L and D, stay legal, and never continue after the goal was reached;
  - every ring is on a square the steps can reach, each ringed once, "Found already." only for a ringed square, and "There is another." only while a square is unringed;
  - done only with every square ringed;
  - a kept Can't only where no trip, trade or shrink exists, and "There is a way." only where one does;
  - a shrinking trip is one the moves reach from the start.
- `scripts/build-portals.mjs` computes the answers, counts and witnesses with the mechanic's searches. `scripts/validate-portals.mjs` checks them again by other methods.

## Files

| File | Contents |
|---|---|
| `dist/portal-board.js`, `dist/portal-board.css` | The shared portal board ([portal-board.md](../portal-board.md)) |
| `dist/families/portals/portals.js` | Reaching, trips home, the trade search, erasing and sliding with fewest slides, the checkerboard test, the `portals` mechanic (moves, hints, rendering, taps, slides and keys) and the playground |
| `dist/families/portals/portals.css` | The views' layout, pawns, stars, rings, the gap, the dashed target, beads, the row of arrows and the room buttons; imports the portal board styles |
| `dist/families/portals/portals.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources |
| `scripts/build-portals.mjs` | Authoring list and rooms; checks every count, answer and witness against the table above and writes `portals.json` |
| `scripts/validate-portals.mjs` | Each room rebuilt from its rows; a pawn simulated with coordinates modulo the room; every trip of up to five steps on three rooms (4,095), with its end and copy compared with the lift; counts by enumeration; the trade by the test 2v ≡ 0 for every pair of squares on both tori; shrinking by displacement, fewest slides by the area and by matching step positions; the worksheet guide's nine slides, and a longer route that also solves; witnesses as moves; hint chains from fresh, after wrong turns, wrong Can'ts and That's alls, and dead ends with Undo; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/portals.test.mjs` | The board (rationals, surfaces for Weeks 41, 64, 70 and 75, marks, steps, lifts, shots, unrolling, the window, trip moves, drawing) and the family (answers, walks, exact trips, every square, the trade, shrinking, the playground, saves, rendering) |
| `scripts/portals-browser-smoke.mjs` | The interface in a browser: taps in both views, the arrow pad, arrow keys, slides in both views, beads, That's all, Can't, the trade, corner and erase discs, any route in puzzle 10, Undo, the playground's rooms, and no overflow at phone width; `TEST_PHONE=1` for touch on a phone |

To change a puzzle, edit `scripts/build-portals.mjs`, then run `node scripts/build-portals.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch first:
  - whether children look at the unrolled view at all, or watch only the room, and whether two views at once is too much to follow;
  - whether Can't is pressed after noticing the fixed gap, the checkerboard or the end ring, or only as a guess. The app accepts a right Can't for any reason;
  - whether the corner and erase discs are found and hit on a phone, and whether children see that a slide moves the trip across one square.
- **Many taps.** Puzzle 2 takes nine two-step trips (18 steps). If that drags, a K–1 version could ask for fewer squares.
- **Fewest slides.** Puzzle 10 accepts any route and counts nothing, so "what is the fewest?" is a grown-up's question. If the app gains a star for a fewest count outside the Lantern Road, nine slides is that star.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** The worksheet's written replays on the copies, copy arithmetic, and the written conjecture about which trips shrink stay on paper.
- **The rest of Wave 4.** Weeks 64, 70 and 75 are not built. The board's surfaces, shots and trip moves are ready for them, and are tested on their surfaces, but no family uses `shoot` or `develop`'s cuts yet.
- **Rehearsal.** Checked by tests, the validator and browser suites at phone and desktop widths only; not tried on a real phone or tablet.
