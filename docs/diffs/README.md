# Gap rings

October 10, 2026. Twelve puzzles and a playground built from Week 49 of the Bellingham math circle (four towers and differences). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 49 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-49.md) says keep, and its App fit and Decision shaped this family: reverse goals only, no Run button, "find every" with no slot per answer, Can't with a certificate the child points at (an odd total, or three zero gaps), and no puzzle asks the child to certify that 7 moves is the most.

## The mathematics

A ring of four towers, each a whole number of blocks high, has an arrow from each tower to the next (A → B → C → D → A). The number on an arrow is the **gap** between its two towers, and the next ring puts each gap at the tower the arrow leaves:

D(a, b, c, d) = (|a − b|, |b − c|, |c − d|, |d − a|).

This is Ducci's four-number game (Shapiro, *The Four-Number Game*).

- **Which rings come from a ring.** Going round from A and back, each arrow climbs or falls by its gap, and the climbs must equal the falls. So a ring of gaps (t₁, t₂, t₃, t₄) comes from some ring exactly when its numbers split into two groups with equal totals; each split gives a ring, up to adding the same height to every tower (which keeps every gap). Under a height cap, only the shifts that fit count.
- **Two certificates for "no ring".** (1) *An odd total.* A gap is odd exactly when one of its towers is odd and the other even, so going round the ring a tower switches between odd and even at each odd gap; it must come back to itself, so a ring of gaps always has an even number of odd gaps and an even total. (2) *Three gaps of 0.* They make all four towers equal, so the fourth gap is 0 too. Neither is the whole story: (0, 0, 2, 4) and (1, 3, 3, 3) have even totals, no three zeros and no ring before them (no equal split). No puzzle uses such a target, since its certificate is a search over splits; it is in Not yet done.
- **Four towers always stop.** Every whole-number start reaches all zeros: after four moves every height is even, the tallest never grows, and halving shows the run must end (worksheet grades 4–5 Problems 5–8). With towers up to 1, 2, 3, 4 and 5 the longest runs take 4, 4, 6, 7 and 7 moves; only trying every ring shows this, so no puzzle asks for the most. A run longer than 4 moves ends at a flat ring of even height, because the ring one move before zero is flat and, after four moves, even.
- **Three towers can go round.** On three towers only a flat ring reaches zero, and (1, 0, 1) → (1, 1, 0) → (0, 1, 1) → (1, 0, 1) goes round for ever.

Experiments come first: build rings and watch the gaps on the arrows. The conjectures (equal 0s glue towers together, adding a block everywhere changes nothing, odd totals never appear, long runs end at 2s) come from building, failing and taking rings back. The explanations are grown-up conversations in each puzzle's notes; the termination proof stays on paper.

**Why every puzzle runs backward.** The card's App fit: if the app ran the rule, a puzzle would be predict-an-outcome, which children liked less, and a free Run button invites fishing (16 of the 625 starts with towers up to 4 last 7 moves). Here the child always builds an old ring, and the app only shows the gaps of what the child built.

## Where they appear

**Puzzles → Gap rings** (symbol Δ) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Rings are written A, B, C, D.

| # | Level | Kind | Ring to make, or goal | Towers up to | Answer | Week 49 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Make | (1, 1, 1, 1) | 2 | 8 rings, e.g. (0, 1, 0, 1) | 2–3 / 4–5 P3 |
| 2 | Easy | Make | (2, 0, 2, 0) | 2 | (0, 2, 2, 0) or (2, 0, 0, 2) | 2–3 / 4–5 P3 |
| 3 | Easy | Grow | a run of 2 back from zero | 2 | e.g. (1, 1, 1, 1), then (0, 1, 0, 1) | K–1 P3–P4 |
| 4 | Easy | Make | (0, 2, 0, 0) | 2 | Can't: three 0 gaps (A, C, D) | 2–3 / 4–5 P3, turned |
| 5 | Medium | Make | (3, 2, 2, 1) | 4 | (1, 4, 2, 0) or (3, 0, 2, 4) | page 1 example, backward |
| 6 | Medium | Make | (2, 1, 2, 2) | 3 | Can't: one odd number (B) | 2–3 / 4–5 P3's reason, new ring |
| 7 | Medium | Every | (0, 1, 0, 1) | 2 | (0, 0, 1, 1), (1, 1, 0, 0), (1, 1, 2, 2), (2, 2, 1, 1) | new, bonus P1 style |
| 8 | Medium | Grow | a run of 4 back from zero | 2 | e.g. (1, 0, 0, 0) → (1, 0, 0, 1) → (1, 0, 1, 0) → (1, 1, 1, 1) | K–1 P5 / older P4 |
| 9 | Medium | Loop | back from (1, 0, 1) on three towers until a ring comes again | 1 | (0, 1, 1), (1, 1, 0), (1, 0, 1) | K–1 P5 / older P4 |
| 10 | Hard | Every | (1, 2, 1, 2) | 3 | (0, 1, 3, 2), (1, 0, 2, 3), (2, 3, 1, 0), (3, 2, 0, 1) | bonus P1 |
| 11 | Hard | Grow | a run of 6 back from zero | 3 | e.g. (0, 0, 1, 3) → … → (2, 2, 2, 2) | P2, heights 0–3 |
| 12 | Hard | Grow | a run of 7 back from zero | 4 | e.g. (0, 1, 2, 4) → … → (2, 2, 2, 2) | P2, heights 0–4 |

The worksheets are in [math-circle-worksheets, week 49](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-49). Puzzles 1, 2 and 4 are rings of grades 2–3 and 4–5 Problem 3 (4 turned so its certificate is not A, B, C), and 6 uses that problem's odd-total reason on a new ring with one odd number; 10 is the bonus Problem 1's second target; 5 runs the page-1 worked example backward; 3, 8, 11 and 12 build the worksheet's runs (K–1 Problems 3–5, Problem 2) backward, as the card's App fit asks; 9 is the three-station Problem (K–1 P5, older P4) built backward; 7 is new. The card's fix 1 (a printed longest order) and the bonus answer counts were checked against the card's math checks.

## How a puzzle plays

- **The board.** Two rings side by side: the child's ring on the left, with dashed empty towers, and the ring to make on the right, in pine. Each tower is a column of block cells over a floor, with its letter and height below. Each arrow of the child's ring carries a disc with its gap, empty until both its towers are built. Tapping a cell builds the tower up to it; tapping the floor makes it 0; tapping the top block (or the floor of a 0 tower) again clears it. The cells show the cap. There is no other text on the board except the one-line objective.
- **Sizes on a phone.** The floor is a whole level tall (its bar drawn at the top), so it is as easy to tap as a block, and the child's towers are wider (40 px on a phone) than the ones to make (28 px, still 40 px with the station round them when they are tapped for Can't). A level is 40 px tall up to a cap of 2 (puzzles 1–4, 7–9), 30 px at a cap of 3 (6, 10, 11) and 24 px at a cap of 4 or 5 (5, 12 and the playground): a ring has two towers one above the other, and five 40 px levels a tower would make the pair of rings about 500 px tall, more than a phone shows. A tap one level off builds a neighbouring height, which the tower and its gap disc show at once, and a second tap fixes it. On a tablet held upright (at least 700 × 1000) every level is 40 px.
- **Make** (1, 2, 4, 5, 6). Solved the moment the four gaps are the ring on the right. Every make puzzle has **Can't**, so its presence gives nothing away. Can't is off until the child has built a whole ring (an attempt), and is used in three taps: press Can't, tap the towers on the right that show why (each tapped tower gets a red outline; all four look alike before a tap, so nothing points at the answer), and press Can't again, which judges the claim. It is accepted for the three 0s of (0, 2, 0, 0) or for all the odd numbers of a ring with an odd count of them, as the single 1 of (2, 1, 2, 2); the two certificates differ in shape and neither is the first towers in page order, so tapping in order proves nothing; while marks are in, Can't is named "Can't: check marks" for screen readers; then the marked towers and their arrows stay outlined and one line gives the argument ("Three 0 gaps make all four towers equal." or "Odd and even can't swap an odd number of times round a ring."). Anything else, including Can't on a ring some ring makes, gets one short refusal, "Those don't rule it out." (the same words either way), which clears the taps; the refusal is recorded in the save, Can't then waits until a tower changes, and Undo keeps that wait, so Can't and Undo are not a free yes-or-no test.
- **Every** (7, 10). Each ring that works is kept as a small number ring below the board the moment it is built, ringed when it is the one on the board. **That's all** says "There is another." until every ring is found, and then waits for a new one. No slots, no count. Undo keeps the rings found.
- **Grow** (3, 8, 11, 12). The ring on the right starts as all zeros. A ring whose gaps make it joins the row under the board, and the ring on the right becomes that ring; the row shows dashed slots for the rings still to build, then the run, then zeros. All zeros never joins (it is no move). The newest ring in the row is a button: tapping it takes it back onto the left to change. A ring joins the moment its four towers work, so changing a ring one tower at a time can join an in-between ring that already works; tapping it in the row takes it back. Solved when the slots are full: the first ring takes that many moves to reach zero. The slot count is the goal, not a hint at the best possible.
- **Loop** (9). Three towers in a triangle (A on top, C and B below). The row starts with (1, 0, 1), which cannot be taken back, and has no slots and no zeros. Solved when a ring built is one already in the row; both copies are ringed.
- **Copy.** One objective line each: "Make the gaps match the ring on the right.", "Find every ring whose gaps make the ring on the right.", "Fill the row: each ring's gaps make the next." and "Go back until a ring comes again." The rule is in How to play.
- **Hints.** Before any move, the first hint is the authored nudge: it starts an attempt and never names the deciding condition or says "Press Can't". Puzzle titles are neutral too ("Tall B", "Low B"). Then: in a make or every puzzle, "Set B to 2." toward the nearest ring that works (not yet found); "Press That's all." when every ring is found. For a ring no ring makes, the hints first build the ring with the most gaps right (an attempt), then give the reason ("Three gaps of 0 would make all four towers equal, and then the last gap is 0 too."), never "Press Can't" in words; the second level outlines the Can't button only, not the towers to tap; after a refusal, "Change a tower first." In a run, the next ring is one that can still reach the goal under the cap (for a loop, the nearest way back to a ring in the row), and a ring that cannot is taken back with its reason ("No ring makes this one: its numbers add up to an odd number. Take it back.", "No ring makes this one." when no ring of any height does, "No ring with towers up to 2 makes this one." when only the cap stops it). The second level outlines the cell, floor, ring or button (for Can't, the button alone); the third offers Apply hint. Hints alone finish every puzzle from a fresh start, after wrong towers, after a wrong Can't, after a wrong That's all and after a dead-end ring. Hints are memoised per board; the longest-run table is built once per cap (a few milliseconds).

**Why Can't is pointed at, not drawn.** Both certificates are towers of the target ring, so the child taps them. The marks accepted are exact (all three 0s; every odd number, an odd count of them), so a child who taps the right towers has found the reason; the app then draws the outline and one line of argument.

## The playground

Grow from zero with towers up to 5, with no goal and no Hint: how far back can you go? The newest ring can be taken back as in the puzzles. It never counts as solved. With towers up to 5 the longest runs still take 7 moves; the notes say that only a search shows it.

## Rules that keep the record honest

- The save is the child's ring and the Can't claim or refusal (make); the ring, the rings found, That's all's answer and the done flag (every); or the run and the draft (grow, loop, playground). Everything shown, including the gaps and the run's slots, is derived from it.
- Only legal moves are accepted: towers within the cap and changed by the move, Can't only in make puzzles, only after a whole ring, not again before a change, with marks in order on the ring; That's all only in every puzzles and not twice without a new ring; taking back only a ring the child built; nothing after a solve.
- Saved boards are checked: heights within the cap; a kept claim only with the certificate and a whole ring; a refusal only of marks that are not one; every ring found works, in order, and a ring on the board that works is found; "There is another." only while one is missing; done only with every ring found; each ring in a run makes the next, the last makes zero (or is the start), no all-zero ring, no ring twice except a loop's last, and no run longer than its goal.
- The answers, reasons and witness runs are computed by `scripts/build-diffs.mjs` with the mechanic and checked again by `scripts/validate-diffs.mjs` by other methods.

## Files

| File | Contents |
|---|---|
| `dist/families/diffs/diffs.js` | The rule, rings before a target, longest runs back, the two certificates, the `diffs` mechanic (moves, hints, rendering, Can't marks) and the playground |
| `dist/families/diffs/diffs.css` | Rings, towers, gap discs, marks, the run row and the rings found |
| `dist/families/diffs/diffs.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources |
| `scripts/build-diffs.mjs` | Authoring list; checks answer counts, reasons, longest runs and the loop against the table above and writes `diffs.json` |
| `scripts/validate-diffs.mjs` | Rings before every target with towers up to 4 by sign choices against the mechanic; the equal-split test; even totals of gaps; both certificates sound for every target and every set of marks; longest runs for caps 1–5 by a forward simulator, and the mechanic's longest run back from every ring; three towers; witnesses as moves; hint chains from fresh, after wrong towers, a wrong Can't, a wrong That's all and dead-end rings; illegal moves; forged saves; Undo; the playground; run by `npm run build` |
| `tests/diffs.test.mjs` | The rule, certificates, make and Can't, the Can't flow on the board, every and That's all, grow and taking back, the loop, hints, saves and rendering |
| `scripts/diffs-browser-smoke.mjs` | The interface in a browser: building towers by tap and key, live gaps, Can't with marks (refused and accepted), That's all, a run with a ring taken back, the loop, focus after moves and the phone layout |

To change a puzzle, edit `scripts/build-diffs.mjs`, then run `node scripts/build-diffs.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch: whether children read the gap on an arrow as belonging to the tower it leaves (the letters are the only link to the ring on the right); whether the three-tap Can't (press, tap the towers, press again) is found without help, and whether the odd-total reason is within reach or only the three-zeros one; and whether, in the long runs (11, 12), taking a ring back by tapping it in the row is discovered, or children restart instead. Also watch whether an in-between ring joining the row by itself, while a ring is changed tower by tower, surprises children; if it does, a ring could join only when the child taps the ring on the right.
- **Sorting the 16 even/odd rings** by how many moves they take to reach all even (grades 4–5 Problem 5) is not here. It fits only if it can be an act (building each ring's next letter ring) rather than a prediction.
- **Other impossible targets.** Rings like (0, 0, 2, 4) or (1, 3, 3, 3) have no ring before them with neither certificate. A third certificate (one gap bigger than the other three together) would cover the first; the second needs the equal-split search.
- **Drag to build.** Towers are built by tapping; a slide up a tower, as in Gentle hills, is not done.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
