# Mixed-up cups

October 5, 2026. Nine puzzles and a playground built from Week 63 of the Bellingham math circle (cards away from home: overlap counting and derangements). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 63 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-63.md) says VERDICT. The worksheet's cards become the cups children liked in Cup swaps, and the family is the first user of the [shared case engine](../cases.md), which the other listing themes (24, 42–45, 60) can build on.

## The mathematics

Lettered cups stand on lettered homes, one cup per home. A cup is **at home** on the home with its own letter. A row with no cup at home is a **derangement**; D(n) counts the rows of n cups with none at home.

- **Fixing named cups.** Requiring k named cups at home leaves (n − k)! rows, whatever the other cups do; more cups may land home too. So two hoops, "A at home" and "B at home", hold 2 rows each on three cups, 6 each on four, and overlap in 1 or 2 rows.
- **Overlaps (inclusion–exclusion).** Taking both hoops away from all the rows removes the overlap twice, so it is added back once: rows with A and B away number 6 − 2 − 2 + 1 = 3 on three cups and 24 − 6 − 6 + 2 = 14 on four. With every cup banned, D(n) = n! − C(n,1)(n − 1)! + C(n,2)(n − 2)! − … ± 1 = 2, 9, 44 for n = 3, 4, 5. The proof follows one row: if m cups are home in it, it is counted 1 − m + C(m,2) − … = (1 − 1)^m times, which is 1 when m = 0 and 0 otherwise.
- **Exactly k at home.** Choose the k cups that stay home; the rest must all leave, so there are C(n,k) · D(n − k) rows. For four cups: 9, 8, 6, 0, 1 rows with 0 to 4 at home. Exactly n − 1 at home is impossible, because the last cup has only its own home left.
- **Two families (the recurrence).** Stand cup E on home A. In a row with none at home, either A stands on home E (A and E trade places; take both out and a row of B, C, D with none home is left) or A is elsewhere (take E out and slide the cup from home E onto home A: a row of A, B, C, D with none home). Both steps reverse, one row to one row, so there are D(3) + D(4) = 2 + 9 = 11 such rows. E can stand on any of four homes, so D(5) = 4 × 11 = 44, and in general D(n) = (n − 1)(D(n − 1) + D(n − 2)).

Experiments come first: a child swaps cups and keeps rows. A complete list establishes a small count, and the shelf's columns and hoops show the overlap and the two families as they fill. The general arguments are in the grown-up notes; the puzzles never ask for a written proof. `scripts/validate-mixup.mjs` checks every count above by an enumeration of its own for up to seven cups (D(6) = 265, D(7) = 1854), the per-row cancellation, the exactly-k counts, and that the shrinking step is one-to-one and onto for three to seven cups.

## Where they appear

**Puzzles → Mixed-up cups** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Every puzzle is a find-every: keep each row that counts, then That's all.

| # | Puzzle | Cups | Rows to keep | Shelf | Week 63 source |
|---|---|---|---|---|---|
| 1 | No cup at home | 3 | None at home: BCA, CAB | In order found | P1 |
| 2 | A and B away | 3 | A and B away, C free: BAC, BCA, CAB | In order found | P2 |
| 3 | A or B at home | 3 | A or B home: ACB, ABC, CBA | Two hoops, ABC in both | P2 |
| 4 | D stays on home A | 4, D fixed on A | None at home: 3 | A on D (1) / not (2) | P7 |
| 5 | Four cups, none at home | 4 | None at home: 9 | In order found | P3 |
| 6 | Two hoops, four cups | 4 | A or B home: 10 | Two hoops, 4 + 2 + 4 | P4, P5 |
| 7 | Exactly one at home | 4 | Exactly one home: 8 | By the cup at home, 2 each | New (guide P6 notes) |
| 8 | A and B away, four cups | 4 | A and B away: 14 | By C and D: 9, 2, 2, 1 | P4 |
| 9 | E stays on home A | 5, E fixed on A | None at home: 11 | A on E (2) / not (9) | P8 |

Rows are written as the cups on homes A, B, C, … in order. The pairs 2–3 and 6–8 are complements: together they keep every row of three cups, and 10 + 14 = 24 for four. Puzzles 4 and 9 introduce the two families on a small case and then a large one, and puzzle 8's first column is puzzle 5's nine rows again. Each puzzle's `provenance` names its problems. All rows and splits are the worksheet's except puzzle 7, which collects one count from the guide's table of home matches.

## How a puzzle plays

- **Cups.** Tap a cup, then another, to swap them, or drag one cup onto another; Enter on two cups does the same. A home turns ochre while its own cup stands on it. A cup with a dark dot is fixed to its home and can't be picked.
- **Keep** puts the row on the shelf. It is greyed out while the row on the cups is not one the puzzle asks for, or is already kept; the kept copy of the row on the cups has a green border. Tap a kept row to set the cups that way again, a quick start for the next row.
- **The shelf** keeps rows in the order found, or sorts them as they arrive into two hoops (a row with both cups home sits where the hoops overlap) or into labelled columns. Nothing shows how many rows there are.
- **That's all** is the claim. If a row is missing it says "There's another." and stays greyed until something new is kept. When every row is kept the puzzle is solved and every row of the puzzle's cups appears below in columns, the ones that count in green: the certificate.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name a move toward the missing row nearest the cups ("Put C in home A."), Keep, or That's all. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

Three, four or five cups, swapped freely. Keep puts any row on the shelf, in a column for how many cups are at home (0 home, 1 home, …). Shuffle mixes the cups; Clear empties the shelf. A child can find for themselves that the column for all-but-one at home never fills. There is no goal, no Hint, and it never counts as solved.

## Rules that keep the record honest

- Only legal moves are accepted: no swapping a fixed cup, no keeping a row that doesn't count or is already kept, no loading a row that isn't kept, no That's all with nothing kept or twice in a row, and no moves after a solve.
- A save is rejected if its row is not a row of the puzzle's cups or moves a fixed cup, a kept row is repeated or doesn't count, or That's all was accepted with a row missing.
- Undo takes back the last action, a Keep included.

## Files

| File | Contents |
|---|---|
| `dist/families/mixup/mixup.js` | The rules (away, some at home, exactly k at home), fixed cups, the shelf layouts, the `mixup` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/mixup/mixup.css` | Layout; imports `dist/cases.css` |
| `dist/families/mixup/mixup.json` | The pack: 9 puzzles, the playground, 1 family and 4 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine and cups ([cases.md](../cases.md)) |
| `scripts/build-mixup.mjs` | Authoring list; checks each puzzle's number of rows and writes the pack |
| `scripts/validate-mixup.mjs` | An independent enumeration (Heap's algorithm, homes looked up from each cup's side); the theorems above for up to seven cups; each puzzle's rows and shelf splits; that hints alone solve every puzzle; illegal moves; That's all early and twice; Load and Undo; forged saves; the playground; run by `npm run build` |
| `scripts/mixup-browser-smoke.mjs` | Plays the family in a browser: taps, a drag (a touch drag with `TEST_PHONE=1`), the keyboard, Keep, That's all, Load, a fixed cup, hoops, columns, a hint solve and the playground |
| `tests/mixup.test.mjs`, `tests/cases.test.mjs` | Rules, moves, hints, rendering, saves, the playground and the satchel; the engine's listings, shelf, groups and drawings |

To change a puzzle, edit `scripts/build-mixup.mjs`, then run `node scripts/build-mixup.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children see a cup at home from the ochre home without being told; whether a long find-every (9, 11 or 14 rows) stays fun or turns into bookkeeping, and whether they use a kept row as the start for the next; and whether the hoops make "ABC goes in both" visible, or need a grown-up to point at the overlap.
- **A demo.** The plan gives each family a few-second demo of its move; this one has none yet. A demo here would swap two cups and keep the row.
- **Impossibility.** "Can exactly two of three cups be home?" is a grown-up prompt and the playground's empty column, not a puzzle. A "Can't" puzzle needs a checkable certificate, and the natural one (the last cup is forced home) is an argument rather than an object.
- **Shrinking on screen.** Puzzle 9's columns show the two families' sizes; the shrinking step itself (take E out, slide the cup from home E onto home A) is in the notes. The review card suggests a later puzzle where a child pairs each five-cup row with its smaller row.
- **Story.** Mixed-up cups is not on the Lantern Road and has no keeper lines.
