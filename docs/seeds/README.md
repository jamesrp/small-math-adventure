# Seed plots

October 23, 2026. Twelve puzzles and a playground built from Week 98 of the Bellingham math circle (Growing from a few seeds). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet, and the Week 98 worksheets have not been piloted either. Their [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-98.md) says keep and proposes this family (fit B) on the shared square grid beside [Garden fences](../fences/README.md). The plots of puzzles 2 and 7–10 are new; each puzzle's `provenance` names its source.

## The mathematics

Seeds fill some squares of a plot. An empty square **grows** when at least two filled squares share its sides; corners don't count, and nothing outside the plot helps. This is two-neighbour bootstrap percolation (Morris, *Minimal percolating sets in bootstrap percolation*, introduction).

- **The finish doesn't depend on the order.** Filling a square only gives other squares more filled neighbours, so a square that can grow stays able to grow. Any square one order fills, another can fill too, and every run stops only when nothing more can grow: at the same set, the least set holding the seeds that no outside square could grow into. A finish is filled rectangles with no empty square touching two filled ones.
- **The fence never grows.** The fence is every side of a filled square with no filled square beside it; edges of the plot and sides against a rock count. A square growing beside k filled squares adds its four sides and hides 2k, a change of 4 − 2k: 0 for two neighbours, −2 for three, −4 for four. It is a monovariant.
- **The fewest seeds.** s seeds have a fence of at most 4s (exactly 4s when no two touch), and the full plot's fence P must be reached from below, so filling needs 4s ≥ P. An n-by-n plot (P = 4n) needs n seeds, and the diagonal fills it. A rock inside a plot adds four to P, so a smaller plot can need more seeds (puzzle 8). A 2-by-7 bed (P = 18) needs five (puzzle 7).
- **A local reason.** A square with only one neighbour on the plot can never grow, so it must be a seed. On the cross of puzzle 2 the fence allows three seeds, but the four ends must all be seeds. On the ring of puzzle 10 every square has two neighbours, so two empty squares side by side never fill; both reasons give six.
- **Tight starts.** When 4s = P, the fence must stay at P all the way: no two seeds may touch and no square may grow beside three filled squares (puzzle 9's L: all 64 filling starts of five have their seeds apart).
- **Every seed needed is not the fewest.** A start needs every seed (it is minimal) when leaving out any one seed stops the rest filling, which happens exactly when no seed sits where the others would grow it. That is different from using the fewest seeds (minimum): four seeds can all be needed on 3 by 3 although three fill it, and five on 4 by 4 although four do; no start of six or more on 4 by 4 needs every seed.
- **Limits.** Only two neighbours, only squares sharing sides, and only finite plots with no growth from outside. The app shows order independence by experiment (the playground's Regrow) and the fence argument through a live count; the proofs are conversations in the grown-up notes.

Experiments come first: plant, grow, watch the fence. The conjectures (the diagonal always works; the fence never goes up; you can't do it with fewer than the side length; the order doesn't matter) come from that play. Can't is the one place the app asks for the explanation, and it asks for it as a start: the seeds spread out so their fence is as long as it can be, and still short of the plot's.

## Where they appear

**Puzzles → Seed plots** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), drawn on the shared square grid ([sq-grid.md](../sq-grid.md)) with Garden fences' rails. The puzzles are grade-free (`band: "all"`) with Easy (1–4), Medium (5–8) and Hard (9–12), plus a playground.

| # | Puzzle | Kind | Plot | Answer | Week 98 source |
|---|---|---|---|---|---|
| 1 | Three seeds | Fill, 3 seeds | 3 by 3 | 14 of 84 starts, in 4 shapes | 2–3 Problem 1 |
| 2 | Four ends | Fill, 4 seeds | A cross of 5 | Only the four ends (the fence would allow 3) | New |
| 3 | How many squares? | Every finish of 3 seeds | 3 by 3 | 3, 4, 6, 9 | 4–5 Problem 1; 2–3 Problem 3 |
| 4 | Four by four | Fill, 4 seeds | 4 by 4 | 130 of 1,820 starts | 2–3 and 4–5 Problem 2 |
| 5 | Three for sixteen | Fill, 3 seeds | 4 by 4 | Can't: fence 12 against 16 | 4–5 Problems 4 and 5 |
| 6 | Every seed needed | 4 seeds, all needed | 3 by 3 | 9 starts in 3 shapes | 2–3 Problem 5; 4–5 Problem 6 |
| 7 | A long bed | Fewest | 2 by 7 | 5 (176 starts) | New, on 4–5 Problems 4 and 5 |
| 8 | A rock | Fill, 4 seeds | 4 by 4 with a rock | Can't: fence 16 against 20 (5 fill) | New, on 4–5 Problems 4 and 5 |
| 9 | An L | Fill, 5 seeds | An L of 16 | 64 of 4,368 starts, seeds all apart | The card's L-shapes, on 4–5 Problem 3 |
| 10 | A ring | Fewest | 12 round a 2-by-2 of rocks | 6, every second square (2 starts) | New |
| 11 | Room to spread | Every finish of 3 seeds | 4 by 4 | 3, 4, 5, 6, 8, 9 (no 7) | New, extending 4–5 Problem 1 |
| 12 | Five needed | 5 seeds, all needed | 4 by 4 | 360 starts; none of 6 or more | The card's Hard; 4–5 Problem 6 |

The worksheets are in [math-circle-worksheets, week 98](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-98). The card's guessing risk shapes the list: random seeds fill 3 by 3 one time in six and 4 by 4 one time in fourteen, so those two are the Easy openers, and every later fill or fewest puzzle uses a plot that isn't square (after the diagonal, every square plot is alike) or a seed budget that is too small.

## How a puzzle plays

- **Planting and growing.** Tap an empty square to plant a seed, or to grow it when two filled squares are beside it; a seed never goes where the others would grow a square. Tap a seed to lift it, which takes back any growth that needed it. Drag across squares to grow them one after another (all or nothing); drag a seed to carry it. A tap that can do nothing flashes the square, and the tray too when it is empty. The newest square is dark green and the two (or more) squares that let it grow are lit.
- **Counters.** The tray shows the seeds still to plant (Fewest and the playground count seeds up instead). The fence is drawn as rails and counted as "N / P", where P is the full plot's fence.
- **Fill** (puzzles 1, 2, 4, 5, 8, 9) is solved the moment every square is filled. **Can't** needs every seed planted and the plot not full. With seeds touching it asks "Spread the seeds out first."; on a plot that can be filled it says "It can be done."; otherwise it is accepted, the growth fades, the fence shows the seeds' own count against P, and the note reads "Growing never makes the fence longer."
- **Fewest** (7, 10) is pressed on a full plot; one with too many seeds is told "Fewer seeds can do it."
- **Every seed needed** (6, 12) checks itself once the plot is full with every seed: small plots below show what the others grow without each seed, a seed that isn't needed is ringed with "A seed isn't needed.", and the puzzle is solved when none is.
- **Every finish** (3, 11). With every seed planted and nothing more able to grow, the number of filled squares joins the chips (ringed while the plot shows it). **Clear** lifts every seed. **That's all** is the claim; a short list is told "There's another."
- **Undo** takes back moves, not answers: a told answer stays while the seeds are the same, and finishes stay found.
- **The playground** is a plot of 4, 6 or 8 squares a side. **Regrow** keeps the seeds and takes back the growth, so the same seeds can be grown in another order.
- **Hints** start with a question. Then they move the child's own seeds toward the nearest start that answers the puzzle, one seed at a time (plant here, move this seed there, lift this one), then grow the first square that can grow or press the claim. Aiming only at starts that need every seed means a missing seed's square is never already grown, so a hint never stalls. Hints alone solve every puzzle from fresh, messy and wrongly claimed boards.

## Rules that keep the record honest

- Only legal moves are accepted: seeds go on empty squares where nothing would grow, within the tray; a square grows only beside two filled squares; a carry lands on an empty square; Clear only in the finishes and the playground; no claim before it is allowed or while an answer still shows; nothing after a solve.
- Saved boards are checked: squares in order and on the plot, seeds within the tray and never closing a loop of side neighbours (such seeds can't all be planted), every grown square able to grow again from the seeds, finishes that are real and include the one on the plot, a solved claim that is right, and a stored answer that is the one the app would give.
- `scripts/build-seeds.mjs` computes every answer with the mechanic's own growth by listing every start, and checks the authored notes. `scripts/validate-seeds.mjs` checks them again with a separate bit-mask simulator: on every puzzle plot and on 4 by 4 it checks, for every set of squares and every legal growth, that the finish is unchanged and the fence changes by 4 − 2k (about 1.7 million growths), which proves order independence and the monovariant on those plots; then the fewest seeds, each Can't with its fence certificate, the starts that need every seed and that none larger exists, the finishes (also over starts that can be planted), every fact in the notes, every filling start played and accepted, wrong claims answered and kept through Undo, hint chains from fresh, messy, wrongly claimed and 480 random-walk boards, and illegal moves and forged saves.

## Files

| File | Contents |
|---|---|
| `dist/families/seeds/seeds.js` | Growth, finishes, the fence, starts that need every seed, claims and their answers, hints toward the nearest start, and the `seeds` mechanic (moves, rendering, wiring, the shake) |
| `dist/families/seeds/seeds.css` | Soil, green squares, seeds, the lit supports, rocks, rails, the tray and counters, chips and small plots; imports the square grid styles |
| `dist/families/seeds/seeds.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources, merged at load through `dist/families.js` |
| `scripts/build-seeds.mjs` | Authoring list and plots; computes and checks every answer, count and quoted fact, and writes `seeds.json` |
| `scripts/validate-seeds.mjs` | The separate checks above; run by `npm run build` |
| `tests/seeds.test.mjs` | Growth and planting, slides and carries, lifting, order and the fence, each kind of claim, rocks, every seed needed, finishes and Undo, hints, saves and rendering |
| `scripts/seeds-browser-smoke.mjs` | Plays the family in a real browser on a phone and a desktop: taps, keys, slides, a carry, the shake, Can't refused then accepted, every seed needed, finishes, the playground |

To change a puzzle, edit `scripts/build-seeds.mjs`, then run `node scripts/build-seeds.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether puzzles 1 and 4 are solved by scattering seeds until one works (one start in six, and one in fourteen) or by noticing that seeds touching at a corner grow a block; whether a child who wants a seed on a square that can already grow is puzzled when the tap grows it instead (the worksheet allows any start); and whether "Spread the seeds out first." on a Can't reads as a fair step towards a reason or as being told they are wrong, and whether the fence count is what convinces them.
- **Order independence** is an experiment in the playground (Regrow), as the card advises; there is no predict-the-finish puzzle.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Paper only.** Numbering added squares in order (grades 2–3 Problem 4), counting exposed sides before and after an addition by hand (grades 4–5 Problem 4) and the 10-by-10 board (grades 4–5 Problem 3) stay on paper; the most seeds that can all be needed on 5 by 5 (at least 7, from the card's search) is in puzzle 12's notes only.
