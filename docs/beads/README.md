# Bead rings

October 5, 2026. Twelve necklace puzzles, seven Hidden turns puzzles and a playground built from Weeks 33 and 34 of the Bellingham math circle (prime-length necklaces, and distinguishing colourings of a ring). They are in the puzzle satchel only, not on the Lantern Road. Children haven't played them in the app yet, and neither worksheet has been piloted. The review cards are in the worksheets repository at [plans/review/week-33.md](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-33.md) and [plans/review/week-34.md](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-34.md). Both weeks draw on the shared [bead-ring board](../bead-ring.md).

## The mathematics

A **ring** is n beads round a circle, each painted one of two or three colours. Reading clockwise from one bead gives a **readout**. A **turn** moves every bead one place clockwise; a **flip** turns the ring over about a mirror line.

- **Necklaces.** In the necklace puzzles a ring stays face up, so two rings are the same when a turn carries one onto the other. There are 4 rings of three beads in two colours, 8 of five beads (puzzles 1 and 7), and 11 of three beads in three colours (puzzle 9). Burnside's lemma counts them in general; the validator checks it against brute force for every n from 2 to 9 in two and three colours.
- **Readouts and the period.** The fewest turns that bring a ring back to itself is its **period**. It is also the number of different readouts the ring shows from its n starting beads, and it **divides n**: on four beads a ring comes back after 1, 2 or 4 turns, never 3 (puzzles 3 and 5); on six beads 3 is possible (puzzle 6).
- **Prime lengths and Fermat.** At a prime length p the only divisors are 1 and p, so every ring that uses two colours or more shows p readouts (puzzle 8). The c^p − c mixed readouts therefore fall into families of p, and p divides c^p − c. That is Fermat's little theorem, counted with beads (Golomb, 1956). It is the destination of Week 33 for older children; the app's puzzles stop at the period fact and leave the count to a grown-up.
- **Rings with rules.** With no two neighbours alike (the closing pair counts), five beads in three colours give (c − 1)^n + (−1)^n (c − 1) = 30 readouts and, since 5 is prime, 30 / 5 = 6 rings (puzzle 10). A ring that shows every window of k beads exactly once is a de Bruijn ring: AABB for k = 2, and two rings of eight beads for k = 3 (puzzles 11 and 12). There are 2^(2^(k−1) − k) of them up to turning.
- **Hidden turns** (Week 34). Now a ring can be turned and flipped. A turn or flip **matches** a ring when every bead lands on a bead of its own colour; staying still does not count. A ring is **lopsided** when nothing matches it, so every bead can be told apart from the others by colour alone: a distinguishing colouring of the cycle (Albertson and Collins, 1996). Rings of three, four and five beads need three colours (puzzles h01 and h03). From six beads on, two colours are enough (h02), but the less common colour needs at least three beads, because one gold bead sits on a mirror line and two gold beads swap across one (h04). With three gold beads in eight there are exactly two lopsided rings up to turning and flipping (h05).
- **Turns and flips come in step.** The matching flips of a ring number either 0 or exactly as many as its matching turns, counting the whole turn. On six beads that is 0, 1, 2, 3 or 6 flips, so exactly two flips is possible (AABAAB, h06) and exactly four is not (h07).

Children experiment first: they paint a ring, turn or flip the see-through copy, and watch which beads match. Conjectures follow ("four beads never come back in three", "five-bead rings always have five readouts", "a pattern that repeats has a flip too"). Explanations are for older or keener children with a grown-up: why the period divides n, why the families have p readouts, why one or two gold beads always have a mirror line. The puzzles never ask for a written proof.

## Where they appear

**Puzzles → Bead rings** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard, and **Hidden turns** follows as a group of its own, with mechanic `lopsided`. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Ring | What counts as a solve | Answers | Source |
|---|---|---|---|---|---|
| 1 | Three beads | 3 beads, 2 colours | Find every ring, then That’s all | 4 | Week 33 Problem 1, every band, and Problem 2 |
| 2 | Two and two | 4 beads, 2 green and 2 gold | Find every ring, then That’s all | 2 | Week 33 K–1 Problem 3 |
| 3 | Back in two | 4 beads | A ring with period 2 | ABAB | Week 33 K–1 Problem 4, 2–3 Problem 3 |
| 4 | Two gold on five | 5 beads, 3 green and 2 gold | Find every ring, then That’s all | 2 | Week 33 K–1 Problem 5 |
| 5 | Back in three? | 4 beads | No ring can | None | Week 33 2–3 and 4–5 Problem 3 |
| 6 | Back in three | 6 beads | A ring with period 3 | AABAAB, ABBABB | Week 33 K–1 Problem 6 |
| 7 | Five beads | 5 beads, 2 colours | Find every ring, then That’s all | 8 | Week 33 2–3 and 4–5 Problem 4 |
| 8 | Sooner on five | 5 beads, both colours | No ring can | None | Week 33 2–3 and 4–5 Problem 5 |
| 9 | Three colours | 3 beads, 3 colours | Find every ring, then That’s all | 11 | Week 33 4–5 Problem 6, on three beads |
| 10 | No neighbours alike | 5 beads, 3 colours | Find every ring, then That’s all | 6 | Week 33 encore Problems 2 and 3 |
| 11 | Every pair once | 4 beads, cards AA AB BA BB | A ring that shows each card once | AABB | Week 33 encore Problems 4 and 5 |
| 12 | Every three once | 8 beads, eight 3-bead cards | Find every ring, then That’s all | 2 | Week 33 encore Problems 6 and 7 |
| h01 | Four beads | 4 beads, up to 3 colours | A lopsided ring in 3 colours, and None with 2 | 3 colours | Week 34 Problem 2, every band |
| h02 | Six beads, two colours | 6 beads, 2 colours | A lopsided ring | AABABB | Week 34 K–1 Problem 5, 2–3 and 4–5 Problem 4 |
| h03 | Five beads | 5 beads, up to 3 colours | A lopsided ring in 3 colours, and None with 2 | 3 colours | Week 34 K–1 Problem 4, 2–3 and 4–5 Problem 3 |
| h04 | Fewest gold | 8 beads, 2 colours | A lopsided ring with 3 gold, and None with 2 gold | 3 gold | Week 34 2–3 Problem 5 |
| h05 | Every lopsided eight | 8 beads, 5 green and 3 gold | Find every lopsided ring, then That’s all | 2 | Week 34 K–1 Problem 6, 4–5 Problem 5 |
| h06 | Two flips | 6 beads | A ring with exactly two matching flips | AABAAB | Week 34 encore Problem 1 |
| h07 | Four flips? | 6 beads | No ring can | None | Week 34 encore Problem 2 |

The worksheets are in [math-circle-worksheets, week 33](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-33) and [week 34](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-34). Each puzzle's `provenance` names its problems; the rings and colour counts are the worksheets' own except puzzles 9, 10 and h04, which change the size. The other sources are Golomb (Fermat by necklaces), OEIS A000031 (necklace counts), de Bruijn (1946) and Albertson and Collins (1996).

## How a puzzle plays

- **Painting.** Tap a bead to cycle its colour: green, gold, blue where three colours are allowed, and back. The beads are green, gold and blue, never letters, but the pack and the saves use A, B and C. Where a puzzle fixes the colours, badges above the ring show how many of each, green when the ring has exactly that many and ochre when it has too many. In puzzle 10 the string between two neighbours of one colour turns red and dashed.
- **Every ring** (1, 2, 4, 7, 9, 10, 12, h05). When every bead is painted and the ring fits, it is kept as a small ring below the board. A ring kept already (turned, or turned and flipped in h05) lights up its card instead, and the card turns to show the motion that matches. **Clear** empties the ring. **That’s all** finishes the puzzle when every ring is there; if one is missing it says "There is another." and the search goes on. There is no slot per answer and no count of answers. Undo never loses a kept ring.
- **The see-through copy** (3, 5, 6, 8, Hidden turns, playground). **Turn** moves a copy of the ring one bead clockwise, and its number counts the turns. **Flip** turns the copy over (Hidden turns and the playground only). Where a copy dot lands on a bead of its own colour, the bead's edge turns green; when every bead matches, the ring glows. The copy is view state, outside the save, and returns home after a whole turn or two flips.
- **Make a ring** (3, 6, 8, 11, h02, h06, and the impossible 5 and h07). A ring that fits solves the puzzle at once. **No ring can** is the other answer. It stays disabled until a full ring has been tried, and if a ring exists it says "There is one." and the puzzle goes on.
- **Windows** (11, 12). Cards under the ring show every window of two or three beads. A card turns green when the ring shows it once and ochre when more than once.
- **Fewest** (h01, h03, h04). A lopsided ring is marked ✓ with its number of colours or gold beads. When a turn or flip matches the ring, a button **None with 2 colours** (or 2 gold) claims that no lopsided ring has that many or fewer; a true claim is marked ✗, a false one says "There is one with 2 gold." The puzzle is solved when the fewest has a ✓ and one fewer has a ✗.
- **Hints.** Before any move, the first hint is the authored nudge. In "every ring" puzzles later hints name one bead ("Make the outlined bead gold.") toward the nearest ring not yet kept, and the last presses That’s all. Make and fewest puzzles show only the authored hints, so a hint never gives away whether a ring exists.

## The playground

The playground has no goal, no Hint, and never counts as solved. Choose 3 to 10 or 12 beads and two or three colours, paint, and turn and flip the copy. **Clear** empties the ring.

## Rules that keep the record honest

- Only legal moves are accepted: a colour the puzzle allows, no That’s all before a ring is kept, no No ring can before a full ring is tried or after a wrong claim until the ring changes, no claim on a lopsided ring, and no moves after a solve.
- A save is rejected if a kept ring doesn't fit, repeats, or isn't a ring of the puzzle; if That’s all is marked with a ring missing; if No ring can is marked where a ring exists; or if a fewest claim is false.
- Undo keeps kept rings, tried counts and true claims.

## Files

| File | Contents |
|---|---|
| `dist/bead-ring.js`, `dist/bead-ring.css` | The shared board: turns, flips, periods, rings up to turning and flipping, matches, the copy and the drawing ([bead-ring.md](../bead-ring.md)) |
| `dist/families/beads/beads.js` | The rules of each kind of puzzle, the `beads` and `lopsided` mechanics (moves, hints, rendering, motion) and the playground |
| `dist/families/beads/beads.css` | Styles, in the shared board palette |
| `dist/families/beads/beads.json` | The pack: 19 puzzles, the playground, 1 family and 6 sources |
| `scripts/build-beads.mjs` | Authoring list. It computes answers and witnesses and writes the pack |
| `scripts/validate-beads.mjs` | Independent checks on rings as number lists with symmetries as permutations: the theorems above for every small case, each puzzle's answers, hints solving from fresh and scrambled boards, claims, illegal moves, Undo and forged saves. `npm run build` runs it |
| `tests/bead-ring.test.mjs`, `tests/beads.test.mjs` | The board, painting, That’s all, the copy, claims, fewest, saves, the playground, the satchel and rendering |

To change a puzzle, edit `scripts/build-beads.mjs`, then run `node scripts/build-beads.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch:
  1. Whether children use the see-through copy to check a turn, or paint at random until a puzzle is accepted. Period puzzles solve the moment a ring fits, as counts turn green in other families.
  2. Whether "a turned ring is the same ring" lands. Watch for surprise when a new-looking ring lights up an old card, and whether the turning card explains it.
  3. Whether No ring can and None with 2 are pressed after a real search or as a guess. If guessing is common, a later revision could ask for a few tried rings first.
- **Story.** Bead rings is not on the Lantern Road and has no keeper lines.
- **Sorting readouts.** Week 33 sorts printed readout cards into rings; here the shelf of kept rings stands in for the sort. A card-sorting puzzle (drag eight readouts into four bins) would need a drag board.
- **Counting to Fermat.** The worksheet's 4–5 band counts 32 readouts into 8 rings and 243 into 51. The app stops at the period; counting families of readouts is left to a grown-up.
- **Grade levels.** The family is grade-free; it does not yet appear in a K–1, 2–3 or 4–5 trail.
