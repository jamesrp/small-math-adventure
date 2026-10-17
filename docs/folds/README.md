# Mirror Couriers shortest routes

October 17, 2026. Twelve puzzles and a playground built from Week 21 of the Bellingham math circle ("The shortest route that touches a line", with its encore on two walls, windows and a rectangle), added to Mirror Couriers as its **Shortest routes** group. They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 21 worksheets are unpiloted.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-21.md) says **keep**, and its Decision (October 10, 2026) asks for a group in Mirror Couriers: dots and every best contact on grid points, the child taps a contact and claims, and the fold is the certificate, made only when the child asks. No live length readout, no length tolerance, no multiple-choice "predict the contact". The packet has not changed since the card (its last source change is October 6).

The module's internal id is `folds`. Mirror Couriers is about light bouncing off mirrors; this group is the same reflection used the other way round, to find the shortest route that touches a line, and the children act on the route instead of predicting where it goes.

## The mathematics

A route goes straight from its start A to one point M of a line, then straight to its finish B, with A and B strictly on one side.

- **Heron's theorem.** Reflect B in the line to B′. Every route A–M–B is exactly as long as A–M–B′ (the second legs are mirror images), so it is at least the straight segment AB′, with equality only where AB′ crosses the line. So the shortest route touches at one point, it is the only contact whose fold is straight, and its length is the distance AB′. At that point the route makes equal angles with the line (the law of reflection).
- **Ties and shared contacts are independent.** Two finishes need the same shortest rope from A exactly when their images are equally far from A, wherever the routes touch; two routes share a best contact exactly when each start, the contact and its finish's image are in line. Puzzles 6 and 7 use each without the other.
- **The inverse problem.** The starts whose best contact with B is P are exactly the points of the ray from P directly away from B′ (Heron's equality case). On the grid they are the lattice points of that ray, spaced by the direction's reduced steps (puzzles 5 and 9).
- **Windows.** If touching is allowed only on some stretches, the length along the line is strictly convex with its least value where AB′ crosses. So a stretch that holds the crossing has its best there, and any other stretch has its best at the end nearer the crossing; the stretches' candidates are compared (puzzle 8).
- **Two walls.** A route touching two parallel walls in a given order is unfolded twice: B over the second wall, then that image and the second leg over the first. Its shortest length is the distance from A to the double image, and the two orders give different images. For walls at heights 0 and H, the vertical distances are 2H + yA − yB (lower first) and 2H + yB − yA (upper first), so lower first wins exactly when B is higher than A (puzzle 10).
- **A block.** Round a convex block a tight route bends only at its corners, so the candidates are the routes through corners. A fold over the line through A and B maps one side's routes to the other; when the block is symmetric about that line the over and under routes are mirror images and tie (puzzle 12), and when it is not, the folded route from the farther side lies outside the nearer one, so it is longer (puzzle 11).

Every dot and best contact is a grid point, and every length is a sum of square roots of whole numbers. The module compares such sums exactly: it writes each √n as k√s with s squarefree (equal sums have equal coefficients, since roots of distinct squarefree numbers are independent), and otherwise finds the sign of the difference from binary bounds that tighten until they agree. Straightness of a fold is an integer cross product. No float tolerance decides anything.

What is checked in the app: that the child's route is shorter than both drawn routes, or shortest, or that the routes tie or share a contact, or that the starts or kept routes are exactly all of them, or which finish needs less rope; always on the child's own folded board. What is not checked: that the child can say why. The grown-up notes carry the arguments.

## Where they appear

**Puzzles → Mirror Couriers → Shortest routes**, below Easy, Medium and Hard (and below Sight lines). The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone. The playground is the family's **Playground** button above the groups.

| # | Level | Puzzle | Goal | Answer | Week 21 source |
|---|---|---|---|---|---|
| 1 | Easy | Beat both | A (1, 2) to B (11, 3), shorter than the routes touching at 3 and 9 | Touch at 4, 5, 6 or 7; 5 is shortest | K–1 P2 |
| 2 | Easy | Shortest | A (1, 4) to B (10, 2) | Touch at 7 | K–1 P4, 2–3 P3 |
| 3 | Easy | The wall | A (1, 1) to B (3, 9), touching the wall x = 0 | Touch at 3 up | K–1 P6, 2–3 P4 |
| 4 | Easy | Less rope | Shortest routes A (1, 3) to B (9, 1) and to C (8, 4); choose the one needing less rope | Touch at 7 and 4; B (80 < 98 squared), though C is nearer A | 2–3 P1, K–1 P5, 4–5 P1 |
| 5 | Medium | Every start | Every start whose shortest route to B (10, 2) touches P = 6 | (0, 3), (2, 2), (4, 1) | K–1 P7, 2–3 P5, 4–5 P5 |
| 6 | Medium | Same rope | Move C so the shortest routes from A (3, 2) to B (9, 1) and to C need the same rope | C at (6, 4) or (0, 4); touch at 7 and 4 (or 2) | 2–3 P6 |
| 7 | Medium | Same place | Move D so the shortest routes A (1, 3)–B (11, 2) and C (5, 2)–D share a contact | D at (8, 1), (9, 2), (10, 3) or (11, 4); both touch at 7 | 4–5 P4 |
| 8 | Medium | Windows | Puzzle 2's A and B, touching only 0–3 or 9–12 | Touch at 9 | 4–5 P6, 2–3 P7, encore P3 |
| 9 | Hard | Every start again | Every start whose shortest route to B (0, 2) touches P = 3 | (6, 2), (9, 4) | 4–5 P5 |
| 10 | Hard | Two walls | A (1, 1) to B (11, 2), touching walls y = 0 and y = 3 once each, either order | Lower at 3, then upper at 9 (125 < 149 squared) | Encore P1, P2 |
| 11 | Hard | Round the block | Every shortest route from A (0, 3) to B (8, 3) round the block 2–6 by 2–5 | Under only: √5 + 4 + √5 | Encore P4 |
| 12 | Hard | Round the block again | The same, with the block 2–6 by 1–5 | Over and under tie: √8 + 4 + √8 | Encore P5 |
| – | Playground | Shortest routes playground | Slide the contact of A–M–B and A–M–C, C being B's mirror image; move A and B | — | K–1 P1, P3; 2–3 P2 |

Coordinates are (across, up) from the bottom-left of the board, with the river or wall at 0; the board shows no numbers. The worksheets are in [math-circle-worksheets, week 21](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-21). Every instance is new except the blocks: puzzle 11 keeps the encore's rectangle and dots, and puzzle 12 stretches the rectangle down to 1–5 so that its middle height is the grid line through A and B (the encore lifts A and B half a unit instead); each puzzle's `provenance` names the problems it draws on. The worksheets measure string; the app replaces measuring with the fold, and turns "Which needs the same string?" and "Can both touch at the same point?" into placing the letter that makes it so.

## How a puzzle plays

- **The board.** A grid card with the river (sky blue, between end marks) or the wall (ink), and the far side tinted. The river's grid points are small circles; each is a button the size of its grid cell, so a tap goes to the nearest point. Routes are drawn in the couriers' rust and, when there are two, deep blue. Nothing shows a length.
- **Touch.** Tap the river where the route touches; tap elsewhere to move the touch. With two routes, tap a finish (B, C or D) to choose its route first; the chosen finish wears a ring.
- **Move a letter** (6, 7): the sun-coloured letter moves to any empty grid point above the river that is tapped.
- **Fold.** Fold flips the finish's side of every route over the line: the second leg turns faint and the route is drawn on to B′ (or C′). Unfold flips it back. The claim button appears only on a folded board, so every claim is made looking at the certificate.
- **Claims.** Shorter (1), Shortest (2, 3, 8, 10), Less rope: B or C (4, the chosen finish), Same rope (6), Same place (7), That's all (5, 9, 11, 12). A right claim solves. A wrong one gets one short line: "Not shorter than this one." (with that dashed route marked), "There is a shorter one." (with the bent route's finish ringed when there are two), "Not the same rope.", "They touch at different places.", "This one bends.", "This one's shortest route misses P." (ringed), "There is another.", "This one isn't shortest." (its shelf card marked).
- **Every start** (5, 9): tap grid points to put starts on them, and again to take them away. Each start shows its route to P but no verdict.
- **Two walls** (10): the wall tapped first is touched first; a second tap on the same wall moves its touch, and a tap on the same point takes it away. Folded, the board grows to show B′ and B″ and the second wall's image; after the claim, both orders' double images are drawn.
- **The block** (11, 12): tap corners in order to bend the route round them (tapping the last corner again takes it back); the last piece runs on to B, red and dashed while it crosses the block. Keep puts the route on the shelf as a small card, and tapping a card takes it off. Folded, every kept route and the route in hand are drawn flipped (dashed) over the line through A and B.
- **After a solve** the argument is drawn: the circle round A through the shorter image (4, and through B′ in 6), the straight line from A to B′ through the closed stretch (8), the ray from B′ through P (5, 9), both orders' double images (10), and the best route round the other side of the block, flipped, lying outside the kept one (11).
- **The playground**: C is B's mirror image, so the routes A–M–B and A–M–C always need the same rope. Slide along the river (or tap it, or use the arrow keys) to move M; tap A or B to pick it up and an empty point to put it down; Fold lays B's route on C's. No hints and no Undo.

## Certificates and claims

- **The fold is the certificate, and the child makes it.** No claim is possible on an unfolded board, and nothing is folded until the child presses Fold (or applies a level-3 hint, which the child asked for). The fold shows a route straight or bent; a straight fold is a proof that no route is shorter, because every route has a folded version from A to B′ and the straight one is the shortest of those. The app never draws the straight line A–B′ before a right claim.
- **Claims come after an attempt.** The claim is off until every route touches (5 and 9: at least one start; 11 and 12: a kept route; 10: both walls). A fresh board, folded, has nothing to claim.
- **A claim can fail, and a refusal is not an oracle.** Each refusal is saved with the board it judged (the contacts, the place of the moving letter, the starts, the touches or the shelf) and the claim stays off on that board through Undo and back-and-forth taps; only a different board can be claimed again. Refusals print no numbers and no counts. The validator plays 1,500 random sequences of up to six taps, then Fold and a claim, per puzzle: they solve 30% of the time in puzzle 1 (four of its thirteen contacts beat both drawn routes, which is the task), 12% in puzzle 8 (one of eight allowed contacts), 9% or less in 2 and 3 (one of twelve or eleven) and under 4% everywhere else.
- **Find every is judged as a whole** (5, 9, 11, 12): starts and kept routes get no verdict until That's all, which answers once for the whole set, naming one wrong member or saying that one is missing, never how many.
- **A final choice is final.** In puzzle 4 the child chooses one of two finishes, and in puzzle 10 one of two orders (the wall touched first). A wrong one ends the try: the board says "The rope to B is shorter." or "The other order is shorter.", draws why, and offers Again; Undo is off until then. A bent route is not a final choice: it is refused like any other wrong claim.
- **Why the app draws the arguments after a right claim.** The straight fold is the child's own certificate. The extra drawings (the circle, the ray, the other order's image, the line through the closed stretch) complete the argument for the comparison the claim made, which the child has already acted out.

## Rules that keep the record honest

- Saves are checked key by key: contacts are whole numbers on an allowed stretch; the moving letter stays in its box, above the river and off the other letters; starts are a sorted list of distinct free points above the river; touches name each wall at most once; the shelf holds distinct legal corner routes; the route in hand never crosses the block.
- Every saved refusal is re-judged: it must be a refusal (not a right claim, not a final one) with exactly the saved reason and mark, on a complete board, and at most one per board. The note shows only for a refusal of the board on screen.
- `done` is saved only on a folded, complete board whose claim is right (with the chosen finish in puzzle 4), and a lost try only on a folded board whose claim is a wrong final choice.
- Undo takes back moves, never a refusal or a lost try: it keeps every refusal and clears only the note, and in a lost try it is off. Restart starts a fresh board.

## Files

| File | Contents |
|---|---|
| `dist/families/folds/folds.js` | Exact lengths, folds and best contacts, windows, two walls, the block, the `folds` mechanic (boards, moves, claims, refusals, hints) and rendering |
| `dist/families/folds/folds.css` | The board, river, walls, routes, letters, images, shelf and controls, scoped under `[data-mechanic-wire="folds"]` |
| `dist/families/folds/folds.json` | The pack: 12 puzzles, the playground, the group's mathematics and 3 sources |
| `scripts/build-folds.mjs` | Authoring list; computes each answer with the mechanic, checks it against the expected one and writes the pack |
| `scripts/validate-folds.mjs` | Recomputes every answer by brute force over grid contacts, starts, places, pairs of wall contacts and corner sequences, with its own exact comparison (decimal bounds and prime factors), the equal-angle law in place of the fold and its own crossing test; hints from fresh and random boards, after a refusal and after a lost try; claims, refusals and lost tries through Undo; random-tap pass rates; illegal moves, forged saves and hint CPU time; run by `npm run build` |
| `tests/folds.test.mjs` | Exact lengths, folds, windows, every start, two walls, the block, each kind of claim, refusals through Undo, a lost try, hints, saves, rendering, the playground and the satchel group |
| `scripts/folds-browser-smoke.mjs` | Plays the group in a browser on a desktop and (TEST_PHONE=1) a 375 × 667 phone |

The module adds no satchel family; its puzzles set `libraryFamily: "billiard"` and `group: "Shortest routes"`. It does not import the Mirror Couriers mechanic. To change a puzzle, edit `scripts/build-folds.mjs`, then run `node scripts/build-folds.mjs`, `node scripts/validate-folds.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children press Fold on their own and read a bent fold as "not yet", or tap contacts and claim until one is accepted (each refusal costs a change of board; if claiming becomes the strategy, the claim could wait for a second fold); whether K–1 children can do the Easy puzzles at all without the string the worksheets use, since folding is the worksheets' adult-level step; and whether the Hard puzzles' final choices (the first wall in puzzle 10) are understood as choices before they are made, rather than discovered by losing.
- **Puzzle 1's claim is easy to pass by chance** (four of thirteen contacts), as the task (beat two routes) is. Puzzle 2 asks for the shortest on the next board.
- **The two-walls board** puts only the better order's contacts on grid points, so a child who tries the worse order can't straighten it; putting both orders' contacts on grid points needs a far wider board than a phone holds. The worse order is still refused as final when claimed.
- **Not built.** 4–5 Problem 7's "can two contacts tie?" as its own puzzle (it is the uniqueness every Shortest claim relies on), 2–3 Problem 7's three windows on one board, the encore's practice visuals, free placement off the grid, and any written explanation.
- **The playground** is the family's only playground, so it takes Mirror Couriers' Playground button; another group adding one would need the satchel to show two.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail. Puzzles 1–4 suit K–1 and 2–3 with a grown-up reading; 9–12 suit 4–5 and the encore.
