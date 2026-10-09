# Copying bags

October 5, 2026. Nine puzzles and a playground built from Week 44 of the Bellingham math circle (the bag that copies). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 44 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-44.md) says keep, App fit B, size M: tap a numbered counter to draw it, let the app add the copy so the rule enforces itself, and keep every history on the case engine's shelf with "That's all" and no visible count. It warns against more than 24 histories, random-simulation solves and predict-the-bin questions.

## The mathematics

A bag starts with one red and one blue counter. Each draw takes one counter, every counter in the bag as likely as any other; it goes back, and a **copy** of its colour joins it (Pólya's urn). Copies are numbered as they arrive, so the bag after drawing red 1 is red 1, red 2 and blue 1. A **history** is the list of numbered counters drawn, in order.

- **Every history is equally likely.** The first draw chooses among 2 counters, the next among 3, and so on, so n draws have 2 · 3 · … · (n + 1) = (n + 1)! histories, each with chance 1/(n + 1)!.
- **Every number of reds is equally likely.** A history with k red draws and n − k blue draws in a given order has k! · (n − k)! versions: the reds drawn find 1, 2, …, k reds to choose from, the blues 1, 2, …, n − k, wherever they fall. There are n!/(k!(n − k)!) orders, so n! histories for each k from 0 to n: two each for two draws, six each for three, 24 each for four. The lopsided final bag (one red, n + 1 blue) is exactly as likely as the balanced one.
- **Order doesn't matter.** The same count shows that red, red, blue; red, blue, red; and blue, red, red each have two histories of three draws, although each draw depends on the ones before (exchangeability).
- **Neither colour vanishes.** A drawn counter always goes back, so red 1 and blue 1 stay in the bag; after n draws the bag holds 1 to n + 1 reds.
- **Other rules.** Putting the counter back without a copy keeps the bag at red 1 and blue 1: the 2ⁿ histories give 1, n, …, 1 (binomial) for 0 to n reds, 1, 2, 1 for two draws. Adding a counter of the *other* colour pulls the bag back toward even: 1, 4, 1 for two draws, 1, 11, 11, 1 of 24 for three and 1, 26, 66, 26, 1 of 120 for four.
- **Three colours.** Starting from red, blue and yellow, every mix of colours has the same number of histories too, n! for each mix of n draws: 2 for each of the six mixes of two draws.

Experiments come first: a child draws and watches the copy arrive, and a find-every puzzle's shelf, sorted into columns, shows the even split. The general count is in the grown-up notes; no puzzle asks for a written proof. `scripts/validate-copies.mjs` checks every claim above with a separate enumeration (bags as colour counts, histories built by recursion): copying and putting back for one to six draws, the other colour's columns for two to four, three colours for one to four.

## Where they appear

**Puzzles → Copying bags** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Rule | Task | Answer | Week 44 source |
|---|---|---|---|---|---|
| 1 | Two red, three blue | Copy | Make the bag | One red and two blue draws, any order | K–1 P1–P2 |
| 2 | Every bag, three draws | Copy | Keep every bag | 4 bags; five red and no blue never comes | K–1 P2, 2–3 P6 |
| 3 | Every story to three and three | Copy | Keep every colour story of four draws ending 3 red, 3 blue | 6 stories | K–1 P3 |
| 4 | Every history, two draws | Copy | Keep every history | 6, two per column | 2–3 P2, 4–5 P1 |
| 5 | Just put back | No copy | Keep every history | 4: 1, 2, 1 | 2–3 P3, 4–5 P2 |
| 6 | No reds in three draws | Copy | Keep every history with no reds | 6, as many as two reds | 4–5 P4 |
| 7 | Two reds in three draws | Copy | Keep every history with two reds | 6, two per colour order; catalog of 24 | 4–5 P3–P4 |
| 8 | The other colour | Other colour | Keep every history | 6: 1, 4, 1 | bonus |
| 9 | Three colours | Copy, from red, blue and yellow | Keep every history | 12, two per mix | bonus |

Puzzles 6 and 7 split the worksheet's 24-history list (4–5 P4) into two finds of six, the all-blue column first, and the catalog after puzzle 7 shows all 24 in four columns of six. Each puzzle's `provenance` names its problems.

## How a puzzle plays

- **The bag.** Numbered counters, a colour at a time. Tap one to draw it: it stays, and its copy drops into the bag. The draws so far sit in a row below, with an empty place for each draw to come; when the row is full the bag is still. Puzzles 1 and 3 show the bag to aim for as small discs beside a flag. Puzzles 1–3 ask only which bags and stories can happen, so their rules leave chance out.
- **Make the bag** (puzzle 1) is solved when the last draw leaves the bag asked for. **Again** starts over.
- **Find every** (puzzles 2–9). **Keep** puts the finished draws on the shelf: the final bag (puzzle 2), the colour story (3) or the history (4–9), and empties the draw row. It is greyed out while the row isn't full, doesn't count or is already kept; a case already kept lights up on the shelf. Histories land in columns, one for each mix of colours (puzzles 4, 5, 8 and 9) or each colour order (7); puzzle 6's all-blue histories share one shelf. **That's all** is the claim: if something is missing it says "There's another." and stays greyed until something new is kept. Nothing shows how many there are. Puzzle 7 then shows the catalog of every three-draw history in columns named by their reds ("3 red" to "no red", so they don't look like the order columns), the ones asked for in green.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the next counter of the first missing case ("Draw red 2."), Keep, Again or That's all. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

One red and one blue, and three rules: **Add the same colour**, **Just put back** and **Add the other colour**. A run is four draws, by tapping counters or pressing **Draw** for a random one; when a run ends, a dot drops into the column for how many reds were drawn, labelled by the mix, and the bag goes back to one of each; the finished run stays in the row until the next draw starts a new one. **Finish** completes a run at random and **10 runs** adds ten, up to a hundred. Changing the rule or **Clear** empties the columns. There is no goal, no Hint, and it never counts as solved. With copies the five columns fill about evenly; with putting back only they peak in the middle; the other colour crowds the middle more. A hundred runs suggest; the puzzles count.

## Rules that keep the record honest

- Only legal moves are accepted: no counter that isn't in the bag yet (blue 3 before it joins), no draw after the last, no keeping an unfinished row, one that doesn't count or one already kept, no That's all with nothing kept or twice in a row, and no moves after a solve. In the playground, no new run once the hundred places are full, and no choosing the rule already chosen.
- A save is rejected if its draws use a counter before it joined or run too long, a kept case is repeated or doesn't count, That's all was accepted with something missing, or the playground's columns hold more than a hundred runs, an impossible count, a finished run that isn't filed, or a run under way when the hundred places are full.
- Undo takes back the last action, a Keep included.

## Files

| File | Contents |
|---|---|
| `dist/families/copies/copies.js` | Bags after draws under each rule, histories, mixes, what each puzzle keeps, the `copies` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/copies/copies.css` | The growing bag, the shelf rows and the playground's columns of runs; imports `dist/cases.css` |
| `dist/families/copies/copies.json` | The pack: 9 puzzles, the playground, 1 family and 3 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine ([cases.md](../cases.md)); this family added yellow counters |
| `scripts/build-copies.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-copies.mjs` | A separate enumeration; the theorems above; each puzzle's answers; that each puzzle's rules state its own rule and that puzzles 1–3 leave chance out; that hints alone solve every puzzle; illegal moves; That's all early and twice; Undo; forged saves; the playground; run by `npm run build` |
| `scripts/copies-browser-smoke.mjs` | Plays the family in a browser: copies joining the bag, the goal bag, Again, a make solve, Keep, a repeat, That's all, Undo, hint solves with the catalog and its labels, yellow counters, and the playground's runs (the bag back to one of each after a run) and rules |
| `tests/copies.test.mjs` | Bags, histories, moves, hints, rendering, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-copies.mjs`, then run `node scripts/build-copies.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children notice the copy arriving and connect it to the counter they drew; whether the numbered histories feel like real differences or like bookkeeping (the worksheet's marks rule had the same risk); and whether the playground's columns lead to a surprise about the lopsided bags or just to pressing 10 runs.
- **A demo.** The plan gives each family a few-second demo of its move; this one has none yet. A demo here would draw red 1 and show red 2 joining.
- **One draw back.** K–1 P4 asks which bags could come just before a given one. That is a backward question with a different board, left out.
- **Four draws.** 4–5 P5 asks for the four-draw totals without a 120-row list; the card rules out lists over 24, so it stays on paper, and the playground's columns stand in for it.
- **Story.** Copying bags is not on the Lantern Road and has no keeper lines.
