# Catch and mark

October 23, 2026. Eleven puzzles and a playground built from Week 95 of the Bellingham math circle, Count the unseen. In that week a keeper hides objects in a bag. Children catch some, mark them, put them back, catch again and reason about the hidden total. The puzzles are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 95 worksheets are unpiloted too.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-95.md) says keep, App fit B, size M. It proposes the three kinds of puzzle built here:
- arrange catches for a target overlap, or Can't;
- every overlap a bag allows;
- every catch sorted into overlap bins.

It also names the pitfall avoided here: guessing the total is predicting an outcome, so random catches stay in the playground.

## The mathematics

A bag holds N lettered tiles. A **first catch** of M tiles is marked with a dot and stays in the bag. A **second catch** of n tiles then holds some dotted tiles. Their number, R, is the **overlap**: how many tiles the two catches share.

- **The overlap range.** In a bag of N, the overlap takes every whole number from max(0, M + n − N) to min(M, n), and no other.
  - *Lower bound.* Only N − M tiles are plain, so a catch of n holds at least n − (N − M) dots.
  - *Upper bound.* A catch can't hold more dots than there are, or more tiles than it has.
  - *Nothing between is skipped.* Swapping one tile of the second catch changes R by at most one, so every value between the two ends appears.
  - *Forced overlap.* When M + n > N, the two catches must share a tile: a pigeonhole argument.
- **What a record proves.** A record (M, n, R) shows M + n − R different tiles, so the bag holds at least that many.
  - The bound is sharp: a bag of exactly that size can give the record.
  - It has no upper partner: a bigger bag gives the same record, because its extra tiles are simply never caught.
  - So a record has a smallest bag and no largest.
- **Counting catches.** Of the C(N, n) second catches, C(M, R) · C(N − M, n − R) have overlap R. Each dotted tile is in C(N − 1, n − 1) of them, so the average overlap is Mn/N.
  - For A–F with A and C dotted and catches of three, the piles are 4, 12 and 4, and the average is 1 = 2 × 3 ÷ 6.
- **An estimate, not a proof.** Turning the average around suggests the Lincoln–Petersen guess Mn/R for the total. It wanders from catch to catch and fails when R = 0.
  - It appears only in the grown-up notes and behind the playground. No puzzle asks for a guess, because the card rules guessing out as a predict-an-outcome screen.

Experiments come first. A child taps tiles into catches and sees the dotted tiles in the second catch. The general arguments are in the grown-up notes. A certificate is a catch the child builds:
- every plain tile caught, and still too many dots, for Can't;
- the shelf, for That's all.

`scripts/validate-catches.mjs` checks every claim above by listing catches as bitmasks, never from the formula:
- every bag up to 10;
- every record in bags up to 20;
- the piles and the average.

## Where they appear

**Puzzles → Catch and mark** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Roughly:
- **Easy** is a K–1 or 2–3 entry: count to 8 and match a picture of dotted and plain squares.
- **Medium** is 2–3.
- **Hard** is 4–5.

| # | Level | Kind | Instance | Answer | Week 95 source |
|---|---|---|---|---|---|
| 1 | Easy | Goal | Bag of 6, catches of 2 and 3, goal 1 dot | Any second catch with 1 dot (12 of the 20) | Opening demo and Problem 1’s rounds; new instance |
| 2 | Easy | Goal | Bag of 8, catches of 4 and 4, goal 0 dots | The four plain tiles (1 of 70) | 2–3 P5 |
| 3 | Easy | Goal, Can't | Bag of 5, catches of 3 and 3, goal 0 dots | Can't: both plain tiles caught, a dot anyway | 2–3 P7 and the card’s certificate; new instance |
| 4 | Medium | Every overlap | Bag of 6, catches of 5 and 4 | 3, 4 | 2–3 P6, bag of 6 |
| 5 | Medium | Every overlap | Bag of 8, catches of 5 and 4 | 1, 2, 3, 4 | 2–3 P6, bag of 8 |
| 6 | Medium | Every bag | Catches of 5 and 5 sharing 3; bags 6, 7, 8, 12, 20 | 7, 8, 12, 20 | 2–3 P2 and P3 |
| 7 | Medium | Every catch | Bag of 5, A and B dotted, catches of 2 | 10 catches: 3, 6 and 1 by dots | The card’s sort; new, smaller instance |
| 8 | Hard | Every overlap | Bag of 9, catches of 6 and 5 | 2, 3, 4, 5 | New, after 2–3 P6 and 4–5 P5 |
| 9 | Hard | Goal, Can't | Bag of 10, catches of 6 and 6, goal 1 dot | Can't: all four plain tiles caught, 2 dots | 4–5 P5; new instance |
| 10 | Hard | Every bag | Catches of 6 and 6 sharing 2; bags 8, 9, 10, 11, 16 | 10, 11, 16 | 4–5 P2, record A |
| 11 | Hard | Every catch | Bag of 6, A and C dotted, catches of 3 | 20 catches: 4, 12 and 4 by dots | The card’s own instance, after 4–5 P3 and P6 |

Problem numbers are those of the printed packets (`week-95-grades-2-3.pdf`, `week-95-grades-4-5.pdf`). The progression runs as follows:
- **Goal puzzles.** Making an overlap comes first (1, 2). Then a goal no catch can make (3, 9).
- **Every overlap.** A bag's whole range of overlaps comes next: nearly full (4), roomier (5), both ends binding (8).
- **Every bag.** Next comes turning a record around into the bags it fits (6, 10).
- **Every catch.** Last, sorting every catch shows where the average comes from (7, 11).

Each puzzle's `provenance` names its problems.

## Why its own family

The bag of lettered tiles and the two overlapping catches are new: no existing board picks two sets that may share members. Fair bags, Copying bags and Hidden sides draw ordered counters or sides from a cup, one at a time. Here a catch is an unordered set taken without replacement.

The shelf, the bins and the catalogs come from the shared case engine ([cases.md](../cases.md)), the list-and-sort engine of Weeks 24 and 42–45:
- `keepCase`, `claimCases` and `validShelf` keep the overlaps, bags and catches honest;
- `binsHTML` and `catalogHTML` draw the sort puzzles.

## How a puzzle plays

- **The board.** The bag is a grid of lettered paper tiles, A to T, up to 20. Under it are two trays, **1st catch** and **2nd catch**, with one slot per tile, so the catch sizes are always visible. The tray being filled has a pine border.
  - A tile in the first catch gets an ink dot.
  - A tile in the second catch gets a pine frame and a green fill.
  - A dotted tile in the second catch is part of the overlap.
- **Taps.**
  - A tap on a tile puts it into the catch being filled: the first catch until it is full, then the second. Tapping it again takes it out.
  - Tapping a tile in a tray also takes it out of that catch. That is how to change a full first catch: taps then go back to it.
  - A full second catch greys out the other tiles.
  - In the sort puzzles the dotted tiles are given and every tap goes to the second catch.
- **Goal puzzles (1, 2, 3 and 9).**
  - A **Goal** card shows the second catch as squares, the right number dotted. It is the whole task, so there is no objective line.
  - Full catches that match solve the puzzle at once.
  - **Can't** works once both catches are full. It is accepted only when the goal is out of reach and the catches show the closest possible overlap: every plain tile caught when the goal is too few dots, or every dotted tile caught when it is too many. Then the board says so ("Every plain tile is in the second catch.") and rings the tiles that prove it.
  - Otherwise Can't is refused with the swap that would come closer ("A plain tile could swap in." or "A dotted tile could swap in."). The refusal lasts until the catches change.
- **Every overlap (4, 5 and 8).**
  - Each time both catches are full, their overlap joins the shelf as a small picture of the second catch, dotted squares first. Nothing shows how many there are.
  - **That's all** is the claim. If an overlap is missing it says "There is another." and stays greyed until something new is kept.
  - After a solve, every overlap from none to the most is drawn, with the impossible ones faded.
- **Every bag (6 and 10).**
  - The candidate bags are chips above the board, starting on a middle one. Changing the bag keeps the tiles that are still in it; tiles beyond the new size leave the catches.
  - Catches that match the goal tick the bag at once, so one arrangement in a big bag ticks every bigger bag as the child moves up.
  - In a bag that is too small, no arrangement matches.
  - That's all judges the ticks. After a solve, the bags that can't fit are faded.
- **Every catch (7 and 11).**
  - Each full second catch joins the bin for its number of dots (`binsHTML`, every bin drawn from the start). The catch on the board is outlined in its bin.
  - After That's all, the full catalog shows every catch by its dots.
- **Hints.**
  - Before any move, the first hint is the authored nudge.
  - Then hints name one tile at a time: "Put A in the first catch.", "Take C out of the second catch.", "Put E in the second catch."
  - In goal puzzles they walk toward the goal, or toward the closest overlap when the goal is out of reach, and then say "Every plain tile is in the second catch. Press Can’t."
  - In the find-every puzzles they walk toward the first missing overlap, bag or catch, changing the fewest tiles. Then they offer That's all.
  - The second level outlines the tile or button; the third offers Apply hint. Hints alone solve every puzzle.
- **Undo** takes back taps and bag changes, never a discovery: the shelf and a refused That's all stay. A refused Can't stays while the catches are the same, so one press after a refusal also takes back the tap before it. Every press changes the screen.

## The playground

The playground has − and + steppers:
- a bag of 3 to 20 tiles;
- a first catch and a second catch of 1 to 8 each.

**Catch** makes one random first catch and one random second catch, shows them on the bag and adds a pebble to the pile for its dots. **Catch 10** makes ten, up to sixty. **Clear** empties the piles. Changing the bag or a catch clears them too.

Piles outside the overlap range never fill. With the starting bag (6, catches of 2 and 3) the piles settle near 4 : 12 : 4. There is no goal and no Hint, and the playground never counts as solved. Random piles suggest what is likely; the puzzles show what is possible.

## Rules that keep the record honest

- **Only legal moves are accepted.** These are refused:
  - a tile outside the bag, or a tile into a full second catch;
  - taking out a tile that isn't in the catch, or changing the given first catch in a sort puzzle;
  - a bag not on the list, or the bag already chosen;
  - Can't before both catches are full, or twice on the same catches;
  - That's all with nothing kept, or twice on the same shelf;
  - a random catch outside the playground;
  - any move after a solve.
- **Forged saves are rejected.** A save is rejected if it has:
  - a catch with a repeated tile, a tile outside the bag or too many tiles;
  - an accepted Can't on catches that aren't the closest, or on a goal that can be made;
  - a refused Can't on the closest catches;
  - a shelf with a repeat, or an overlap, bag or catch that can't happen;
  - That's all accepted early, or refused on a complete shelf;
  - in the playground, an overlap the bag can't give, or last catches that don't show the last overlap.

## Files

| File | Contents |
|---|---|
| `dist/families/catches/catches.js` | The overlap range, the bags that fit a record, every catch and its dots, the `catches` mechanic (moves, Can't, the shelf, hints, rendering, Undo) and the playground |
| `dist/families/catches/catches.css` | The bag, its tiles, dots and frames, the trays, the goal, the bag chips, the playground's steppers and piles; imports `dist/cases.css` |
| `dist/families/catches/catches.json` | The pack: 11 puzzles, the playground, 1 family and 3 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine ([cases.md](../cases.md)) for the shelf, bins and catalogs |
| `scripts/build-catches.mjs` | Authoring list; computes and checks each puzzle’s answer and writes the pack |
| `scripts/validate-catches.mjs` | A separate count over bitmask catches, listed at the engine level for every arrange puzzle and every shelf. It checks the overlap theorem for every bag up to 10 and every pair of catch sizes, the smallest-bag bound for every record of catches up to 6 in bags up to 20, the piles and the average, and each puzzle's answers. It judges Can't on every full arrangement of every goal puzzle and That's all on every shelf. It also checks the claims in the grown-up notes, hint chains from fresh, after random play and after Undo, illegal moves, forged saves, Undo and the playground. `npm run build` runs it |
| `scripts/catches-browser-smoke.mjs` | Plays the family in a browser (desktop, or phone with touch): taps into both catches, a full second catch, a refused and an accepted Can't with its certificate, Undo, the shelf and That's all, the bag chips, the sort bins and catalog, a hint, Apply hint, the playground, and no page overflow. `SHOTS=<dir>` saves tablet and phone screenshots |
| `tests/catches.test.mjs` | The worksheet's answers, piles and average, taps, Can't, the shelf, bags, sorting, hints, saves, rendering, the playground and the satchel |

To change a puzzle, edit `scripts/build-catches.mjs`, then run `node scripts/build-catches.mjs`, `npm test` and `npm run build`.

## Sources

- **Bellingham Math Circle, Week 95: Count the unseen.** The grades 2–3 and 4–5 packets (W95-23-v1, W95-45-v1) and the adult guide (W95-F-v1), [lowell-math-circle-year-2/week-95](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-95).
  - **Borrowed:** puzzle 2 is 2–3 P5's bag of 8 with catches of 4. Puzzles 4 and 5 are 2–3 P6's bags of 6 and 8. Puzzle 6 is 2–3 P2's record and totals. Puzzle 10 is 4–5 P2's record A.
  - **New:** puzzles 1, 3, 7, 8 and 9 are new instances of those problems' questions.
  - **From the card:** puzzle 11 is the card's own sort instance.
- **The Week 95 review card and math check,** `plans/review/week-95.md` and `week-95-math.md` in the worksheets repository. They supply the App fit, the Can't certificate, the 4, 12, 4 sort and the verified answers.
- **Brett McClintock, "Mark-resight models",** chapter 18 in Cooch and White, *Program MARK: A Gentle Introduction*, pp. 18-2–18-3: the Lincoln–Petersen set-up, in the grown-up notes only.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch:
  - **Dotted tiles.** Do children see that a dotted tile can be caught again and is what the goal counts? Or do they think the second catch should avoid dots, or count all its tiles against the goal? (Puzzle 1 is the test.)
  - **Can't.** Do children build the closest catch on purpose, every plain tile caught, before pressing Can't? Or do they press it after a few random tries and follow the refusal's swap like a hint?
  - **The sort puzzles.** Do puzzles 7 and 11 feel like organized listing or long tapping? Puzzle 11's twenty catches take about forty taps. Watch whether children reach the 4, 12, 4 bins and connect the biggest bin with the average.
- **One bag for many records.** 4–5 P4 (one bag that fits five records) is left out. It would need several records checked at once in one bag.
- **Catch budgets.** The catch-budget problems (4–5 P6 and P7) are left out too. The card warns that a budget split with the formula shown is a dozen guessable choices; they are in the playground's notes instead.
- **A demo.** The plan gives each family a few-second demo of its move; this one has none yet. A demo here would mark a first catch and catch one dotted tile again.
- **Story.** Catch and mark is not on the Lantern Road and has no keeper lines.
