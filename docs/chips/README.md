# Chip firing

October 4, 2026. Twelve puzzles and a playground built from Week 11 of the Bellingham math circle (chip firing with a sink). They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet; the worksheets it comes from have not been piloted either.

## The mathematics

Each board is a few circles joined by lines, usually with a **sink**. A circle can **fire** when it holds at least one chip per line that touches it; firing sends one chip along each line. The sink keeps what it receives and never fires.

- **Every run stops when there is a sink** (on a connected board). Chips drift toward the sink and are lost there, so a run cannot go on forever. Puzzle 10 makes this a count: on the square, the weight W = 3A + 4B + 3C drops by exactly 2 at every firing, so a start's weight caps its number of firings.
- **The finish does not depend on the order** (the abelian property). Every complete run from a start ends at the same board and fires each circle the same number of times. Children meet this by finding every order (puzzles 1, 3, 4, 6, 11) and seeing one finish. Only the letters' arrangement changes; how many of each letter does not.
- **Invariants decide which starts reach a finish.** On the triangle, firing A or B changes A − B by 3, so A − B keeps its remainder after division by 3. Puzzles 5 and 9 ask for every start with a given total that finishes like the card; the answers are exactly the starts with the right remainder.
- **Finishes of big starts form a small set.** With enough chips, the finishes on the triangle are the three boards (1,1), (1,0), (0,1), and on the square the four boards with at most one empty circle (puzzles 2 and 8). These are the recurrent configurations; under addition followed by firing they form the sandpile group (order 3 and order 4 here, the number of spanning trees).
- **Without a sink, firing can go on forever.** On a closed triangle, 3 chips placed 2, 1, 0 in any arrangement cycle forever, while 3 chips on one circle stop after one firing (puzzle 12).
- **Avalanches.** On a still board, one extra chip can set off a long run. On the square the largest is four firings, from 1, 1, 1 with the new chip on B (puzzle 7).

Experiments come first: a child fires, records the order, and looks at the finish. Conjectures follow (“it always ends the same”), and explanations are for older or keener children with a grown-up: the weight argument for stopping, the remainder argument for the triangle starts. The puzzles never ask for a written proof.

## Where they appear

**Puzzles → Chip firing** is the first family in the satchel and starts open. A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`) and use Easy/Medium/Hard like the other expansion families, so K–1 children can start at puzzle 1 and older children can go straight to Medium.

| # | Puzzle | Board | What counts as a solve | Answers | Week 11 source |
|---|---|---|---|---|---|
| 1 | Two first moves | Triangle, A 2, B 2 | Both firing orders | 2 | Whole-group launch |
| 2 | Four chips, few finishes | Triangle, place 4 | Every finish | 3 | K–1 Problem 2 |
| 3 | Three and three | Triangle, A 3, B 3 | Every firing order | 4 | 2–3 and 4–5 Problem 1 |
| 4 | Around the square | Square, 2, 1, 2 | Every firing order | 4 | 2–3 Problem 2 |
| 5 | Six chips to one and one | Triangle, place 6 | Every start that finishes 1, 1 | 3 | 2–3 Problem 3 |
| 6 | The hub fires twice | Star, hub 3, legs 1 | Every firing order | 6 | New, same theme as Problems 1–2 |
| 7 | One chip, four firings | Square | A still board plus one chip that sets off 4 firings | 1 | Return visit Problem 2 |
| 8 | Four chips around the square | Square, place 4 | Every finish | 4 | K–1 Problems 2 and 4 |
| 9 | Ten chips to one and none | Triangle, place 10 | Every start that finishes 1, 0 | 4 | New, extends 2–3 Problem 3 and the guide’s remainder rule |
| 10 | Nine firings from six chips | Square, place 6 | A start with 9 firings (the most possible) | 1 | 4–5 Problem 5 and the guide’s weight W, as an optimization |
| 11 | Ring of four | Four circles in a ring with the sink | Every firing order | 8 | New, same theme as Problems 1, 2 and 4 |
| 12 | No way out | Closed triangle, place 3 | A start that never stops | 1 (of 6) | Return visit Problem 1 |

The worksheets are in [math-circle-worksheets, week 11](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-11). Each puzzle’s `provenance` names its problem.

## How a puzzle plays

- **Placing.** Puzzles that start empty show a tray of chips. Tap a circle to put one there. Firing waits until the tray is empty, so a start is always complete before the run.
- **Firing.** A circle that can fire has a gold ring and a gentle glow. Tap it to fire; chips fly along the lines. The letters fired so far show below the board, with a count in firing and avalanche puzzles.
- **Again.** When nothing can fire, **Again** returns to the start (or to an empty tray) and keeps everything found so far. Undo takes back one move and also keeps discoveries.
- **What was found.** Puzzles that ask for every answer show one slot per answer. A new order, finish or start fills a slot with a small picture of that board. A run that ends without counting in puzzles 5, 7, 9 and 10 (a finish unlike the card, or too few firings) turns the goal card or the count red.
- **Avalanche (puzzle 7).** Chips can be added while nothing can fire. The chip that first makes a circle ready is the extra chip; after it, only firing is allowed.
- **Loop (puzzle 12).** The board has no sink. If a run comes back to a board it has already shown, a ↻ appears and the puzzle is solved.
- **Hints.** Before any move, the first hint is the authored nudge. Otherwise hints name a move toward an answer not yet found (“Fire C. An order you haven’t found yet goes this way.”), and the third level offers Apply hint. Hints can lead all the way to a solve, as in the other expansion families.

## The playground

The playground has no goal, no Hint and never counts as solved.

- **Boards:** triangle, square, square with a diagonal, kite (three circles joined to each other and to a sink in the middle), star, ring of four, the closed triangle, and a 25 × 25 grid.
- **Tools:** Add (tap a circle to add a chip), Fire (tap a ready circle), **Fire all** (fire until nothing can, or until a board repeats on the closed triangle, shown by ↻), and Clear. The sink shows its total.
- **Grid:** every square is a circle with four lines; the edge is the sink. Tap a square to add 1, 10, 100 or 1000 chips; the grid then fires in waves until it is still, with colors for 0–3 chips and gold for squares about to fire. 1000 chips on the center square take 161 waves and 18,226 firings and leave the familiar sandpile fractal. Arrow keys and Enter work too.

## Rules that keep the record honest

- Only legal moves are accepted: no firing a circle that is short of chips, no firing during placing, no adding in order puzzles, and no moves after a solve.
- Saved boards are replayed from their placed chips and fired letters, so the piles shown are always derived, never stored. A save whose found list holds anything that is not an answer to that puzzle is rejected.
- Undo keeps discoveries through the `carry` hook in `main.js`. Restart clears them.

## Files

| File | Contents |
|---|---|
| `dist/chips.js` | Boards, firing, stabilizing, exhaustive answer sets, the `chips` mechanic (moves, hints, rendering, animation, keyboard and pointer wiring) and the playground, including the grid |
| `dist/chips.css` | Styles, using the shared board palette |
| `dist/chips.json` | The pack: 12 puzzles, the playground, 1 family and 4 sources, merged with `puzzles.json` and `proofs.json` in `main.js` |
| `scripts/build-chips.mjs` | Authoring list; computes each puzzle’s answer count and writes `dist/chips.json` |
| `scripts/validate-chips.mjs` | Recomputes every answer set with an independent simulator; checks one finish and one firing count per start, that puzzles 7 and 10 ask for the true maximum, that hints alone solve every puzzle, illegal moves, Undo keeping discoveries, forged saves, and every playground board (including the 1000-chip grid against a separate settle, conservation and symmetry); run by `npm run build` |
| `tests/chips.test.mjs` | Firing orders, Again, placing, the avalanche, the loop, Undo, saves, the playground, the satchel and rendering |

Two small hooks were added for this family and are available to any mechanic: `carry(p, from, to)` lets Undo keep part of the board, and `noHint(p)` hides the Hint button (`ui.js`). The pack is additive, like the proofs pack, so existing puzzles and their saves are unchanged.

To change a puzzle, edit `scripts/build-chips.mjs`, then run `node scripts/build-chips.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children’s play.** Nothing here has been tried by children. Things to watch: whether K–1 children read the letter record or just the board, whether **Again** is found without help, and whether the slot pictures make it clear that a finish has already been found.
- **Story.** Chip firing is not on the Lantern Road and has no keeper or companion lines.
- **Grade levels.** The family is grade-free; it does not yet appear in a K–1, 2–3 or 4–5 trail.
- **Proofs.** The weight and remainder arguments live in the grown-up notes. A later proof puzzle could ask a child to show that a start cannot reach a finish, using the remainder, in the style of the Proofs groups.
