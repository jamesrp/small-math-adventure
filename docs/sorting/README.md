# Sorting machines

October 5, 2026. Twelve puzzles and a playground built from Week 23 of the Bellingham math circle (sorting networks and fixed machines). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 23 worksheets are unpiloted too. The theme's review card is in the worksheets repository at `plans/review/week-23.md`.

## The mathematics

A machine has a few horizontal **lanes**, one card on each, and **bars** that join two lanes. Cards ride from left to right. When they reach a bar, the two cards it joins compare, and the smaller goes to the upper lane. The bars never change, whatever the cards: the machine is a fixed list of compare-exchanges, a comparator network. It **sorts** a start when the cards finish smallest at the top.

- **One wrong finish disproves a sorter.** Many good runs only suggest a conjecture. Puzzles 1, 9 and 10 ask for one start that a machine gets wrong; the Test button in the build puzzles checks every start and shows one that goes wrong.
- **One start can defeat every repair.** A bar swaps at most one pair, so a finish with two separate pairs out of order (2, 1, 4, 3) cannot be put right by any one extra bar. Puzzle 8 asks for such a start on a machine that no single bar repairs (Week 23 grades 2–3 Problem 3): it is the checkable certificate for that "can't".
- **The 0–1 principle.** A machine sorts every start if and only if it sorts every start made of short and tall cards (0s and 1s). Calling every card at or below a cut "short" and the rest "tall" gives the same result before or after a bar, because a bar only compares. So a number start that finishes out of order has a short-and-tall copy that also does, for a cut between the two out-of-order cards. Puzzle 9 finds the one short-and-tall start a five-bar machine gets wrong; puzzle 10 lifts it to the four number orders that fail on the same machine. On four lanes a failing short-and-tall start with two of each kind gives 2! × 2! = 4 failing orders, which is why no machine on four lanes fails just once.
- **Counting the lights.** A bar lights when its cards swap. With k bars a run lights them in at most 2^k ways. Two starts that light the same bars are moved the same way, so they finish in different orders and at most one is sorted. A sorter for n cards therefore needs 2^k ≥ n!: three bars for three lanes (8 ≥ 6 > 4) and five for four (32 ≥ 24 > 16). Both are reached. Puzzle 5 asks for two starts with the same lights on a two-bar machine; puzzles 4 and 12 build the sorters, and puzzle 12's notes carry the four-lane count.
- **Neighbors only.** If every bar joins two neighboring lanes, each swap puts exactly one out-of-order pair in order, and 4, 3, 2, 1 has six such pairs, so four lanes need six bars (puzzle 7).

Experiments come first: a child runs starts and watches the finish. Conjectures follow ("the big card always ends at the bottom", "two lights for three cards isn't enough"), and the explanations are in the grown-up notes. The puzzles never ask for a written proof. The theorems are checked over every machine of the sizes used by `scripts/validate-sorting.mjs`: the 0–1 principle for every machine with up to five bars on three and four lanes, the light-pattern bound and shared-lights-different-finish for the same machines, and the fewest bars by exhaustive search.

General optimal sorting networks are beyond this family. The fewest comparators are known only for small n: nine for five inputs, and Codish et al. (2014) proved 25 for nine. The playground has five lanes for anyone who wants to try nine bars.

## Where they appear

**Puzzles → Sorting machines** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Machine | What counts as a solve | Week 23 source |
|---|---|---|---|---|
| 1 | Break the machine | 3 lanes: 12, 23 | One start it gets wrong (2 of 6 are) | K–1 P1, 2–3 P1 |
| 2 | Every wrong start | 3 lanes: 12, 13 | Every start it gets wrong (4 of 6), then That's all | K–1 P3, 2–3 P1 |
| 3 | One more bar | 3 lanes: 12, 23, open | The one bar that makes it sort: 12 | K–1 P5, 2–3 P3 |
| 4 | Three bars | 3 lanes, 3 open | Any of the 6 three-bar sorters | K–1 P2, 2–3 P2 |
| 5 | Same lights | 3 lanes: 12, 23 | Two starts that light the same bars | 4–5 P6 |
| 6 | One more bar, four lanes | 4 lanes: 12, 34, 13, 24, open | The one bar that makes it sort: 23 | 2–3 P3 |
| 7 | Neighbors only | 4 lanes, 6 open, neighbor bars | Any of the 16 neighbor-only sorters | 2–3 P6 |
| 8 | Past fixing | 4 lanes: 12, 34, 14, 23 | A start that one more bar can't fix (8 of 24, all finishing 2143) | 2–3 P3 |
| 9 | Short and tall | 4 lanes: 13, 24, 23, 12, 34; short and tall cards | The one wrong start: tall, short, tall, short | 2–3 P4, P5; 4–5 P4, P5 |
| 10 | Short, tall and numbers | Same machine, numbers | One of the 4 wrong orders (3142, 3241, 4132, 4231) | 4–5 P3, P4 |
| 11 | Every short-and-tall start | 4 lanes: 12, 34, 13, 24; short and tall | All 4 wrong starts of 16, then That's all | 2–3 P4, P5 |
| 12 | Five bars | 4 lanes, 5 open | Any of the 12 five-bar sorters (of 7,776 machines) | 4–5 P2, P7 |

Lanes are numbered from the top in this table and in the pack (`machine: [[1, 2], [2, 3]]`). The worksheets are in [math-circle-worksheets, week 23](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-23). Each puzzle's `provenance` names its problems. Puzzles 1, 3, 5, 6 and 8 use worksheet machines; the machines in puzzles 2, 9, 10 and 11 are new (9 and 10 reorder a sorter's bars, as 4–5 Problem 5 does, so that only one short-and-tall start fails). Puzzles 4, 7 and 12 keep the worksheets' build tasks.

## How a puzzle plays

- **Cards.** Number cards grow with their value, so a sorted finish reads small to large down the lanes. Short and tall cards are a small pale circle and a large dark one. Tap two number cards on the left to swap them, or drag one onto another; tap a short or tall card to change it.
- **Run.** Copies of the cards ride through the machine. At a bar that swaps, the cards cross and the bar lights; lit bars stay lit on the board. The finish appears on the right with a green ring when it is in order and red rings on the cards that are out of order. Pressing Run again replays it.
- **Starts tried.** In the find puzzles each start that has been run is kept below the board with ✓ or ✗; in the lights puzzles with its finish and its lights. Nothing shows how many answers there are: That's all is the claim, and an early claim says "There's another."
- **Building.** An open column shows a dot on each lane. Tap one dot, then another in the same column, to place a bar; drag between them works too. In the neighbor-only puzzle only the neighboring dots stay active. Tap a placed bar to take it away. **Test** sends every start through. If any goes wrong, one wrong start runs on the board and nothing else is shown, so a child repairs from one counterexample rather than from a table. If all come out in order, every start appears below as a small column with a green border: the certificate. A machine is tested once; changing a bar allows another Test.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name a move toward the nearest answer: a swap or a change of card, Run, a bar to place or take away, Test, or That's all. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

Two to five lanes, number cards or short and tall cards, and an empty machine with 2, 4, 6 or 9 columns. Run, Test (every start; a ✓ when the machine sorts them all, or the first wrong start running on the board), Shuffle and Clear. There is no goal, no Hint, and it never counts as solved.

## Rules that keep the record honest

- Only legal moves are accepted: no swapping short and tall cards, no flipping numbers, no bars on a fixed machine or on a given bar, no long bars in the neighbor-only puzzle, one Run per start, one Test per machine, no That's all twice in a row, and no moves after a solve.
- Everything shown is derived from the machine, the start and the list of starts run. A save is rejected if its fixed bars differ from the puzzle's, a tried start is not a start of the puzzle, a run is shown for a start that was never run, or That's all was accepted without every wrong start in the list.
- Undo keeps the starts already run (the `carry` hook). Changing a bar in a build puzzle clears them, since they belonged to the old machine.

## Files

| File | Contents |
|---|---|
| `dist/families/sorting/sorting.js` | Running a machine, every start, the `sorting` mechanic (moves, hints, rendering, the ride animation, tap and drag wiring) and the playground |
| `dist/families/sorting/sorting.css` | Styles, using the shared board palette |
| `dist/families/sorting/sorting.json` | The pack: 12 puzzles, the playground, 1 family and 4 sources |
| `scripts/build-sorting.mjs` | Authoring list; checks each puzzle's wrong starts and repairs, and writes the pack |
| `scripts/validate-sorting.mjs` | An independent simulator (lanes as objects, starts by Heap's algorithm and by counting); the starts no single bar can fix; the 0–1 principle, the light bound and the fewest bars over every machine of the sizes used; each puzzle's facts; that hints alone solve every puzzle; illegal moves; Undo; forged saves; the playground; run by `npm run build` |
| `tests/sorting.test.mjs` | Runs, breaking, That's all, same lights, building and Test, placing bars, short and tall cards, Undo, saves, the playground, the satchel and rendering |

To change a puzzle, edit `scripts/build-sorting.mjs`, then run `node scripts/build-sorting.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether K–1 children see from the first Run that the smaller card goes up (or need a grown-up to say it), whether placing a bar by tapping two dots is found without help, and whether children in the lights puzzles compare the lit bars or only the finishes.
- **A demo.** The plan gives each family a few-second demo of its move; this family has none yet. A demo here would run two cards through one bar.
- **Story.** Sorting machines is not on the Lantern Road and has no keeper lines.
- **Proofs.** The counting argument (four bars light in 16 ways, fewer than 24 starts) is in the grown-up notes. A later proof puzzle could ask a child to show that no two-bar machine sorts three cards by finding the shared lights on any machine they are given.
