# Neighbor Lanterns: First fit and Why not fewer

October 5, 2026. Twelve puzzles built from Week 62 of the Bellingham math circle (conflict networks: scheduling as colouring), added to Neighbor Lanterns as two groups, **First fit** (7) and **Why not fewer** (5). They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet; the Week 62 packet has not been piloted either. The theme's review card is `plans/review/week-62.md` in the worksheets repository; it confirms both groups (App fit A) and its pitfalls, which the design follows: each tap places a lantern at once (no entering a whole order and then running it), no "fewest colours" targets for first fit, and no counting puzzles.

The graphs use the Neighbor Lanterns format (`vertices`, `edges` as `[u, v, 1]`, `positions` in percent), so Wave 2's shared graph editor can read them. Nothing here depends on how that editor will work.

## The mathematics

Linked lanterns must have different colours (a schedule where linked activities need different slots).

- **Enough and needed.** A colouring with k colours shows k are enough. A set of r lanterns that all link to each other (a clique) shows r are needed. A ring of odd length shows 3 are needed, since two colours must alternate around a ring. The clique can be smaller than the fewest colours: a ring of five has no triangle but needs 3.
- **Two colours work exactly when there is no ring of odd length** (Kőnig): colour by the parity of the distance from a starting lantern.
- **First fit.** Tap the lanterns in some order; each takes the first colour none of its lit neighbours has. The result always has no clash and uses at most one more colour than the most links at any lantern (Δ + 1), but the order matters. The most any order uses is the Grundy number: 3 on a path of four (2 on the square), 4 on a tree with eight or more lanterns arranged as a binomial tree, and k on the crown graph with 2k lanterns, although 2 colours are enough for all of these.

What is checked in the app: in First fit, that the order the child tapped makes the rule use the target number of colours, or that no order can (claims are checked by search); in Why not fewer, that the colouring has no clash and that the proof (a clique, or an odd ring tapped in order) shows the same number of colours as the colouring uses. What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Neighbor Lanterns → First fit** and **→ Why not fewer**, below Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`); each group has Easy, Medium and Hard levels, and Next puzzle walks through one group.

| Puzzle | Level | Lanterns | Goal | Answer | Orders that reach it | Week 62 source |
|---|---|---|---|---|---|---|
| First fit 1, Four in a row | Easy | Path of 4 | Use 3 | A, D, B, C | 6 of 24 | P7 |
| First fit 2, Close the square | Easy | Ring of 4 | Use 3, or say no order can | No | 0 of 24 | P7, ends joined |
| First fit 3, Six in a ring | Medium | Ring of 6 | Use 3 | A, D, B, C, … | 240 of 720 | P7, new |
| First fit 4, A branching tree | Medium | Tree of 10 | Use 4 | B, F, C, G, I, H, D, A, … | 136,080 of 3,628,800 | P8, new tree |
| First fit 5, Could any order use five? | Hard | The same tree | Use 5, or say no | No (at most 3 links) | 0 | P8 |
| First fit 6, Two rows of four | Hard | Crown graph, 8 | Use 4, or say no | Yes: partners in pairs | 2,880 of 40,320 | New (card) |
| First fit 7, Two rows of five | Hard | Crown graph, 10 | Use 5 | Partners in pairs | 43,200 of 3,628,800 | New |
| Why not fewer 1, A triangle and a tail | Easy | 5 | Fewest, with proof | 3; the triangle | | P2 |
| Why not fewer 2, The cube | Easy | 8 | Fewest, with proof | 2; one link | | P1, new |
| Why not fewer 3, A ring of five | Medium | 7 | Fewest, with proof | 3; the ring of five | | P3–P4, new |
| Why not fewer 4, A ring with a shortcut | Hard | 7 | Fewest, with proof | 3; the ring of five or of seven | | P4–P5, new |
| Why not fewer 5, Hidden four | Hard | 8 | Fewest, with proof | 4; A, D, F, H | | P3, new |

The counts of orders come from `scripts/validate-firstfit.mjs`, which tries every order; they show that tapping at random rarely solves the tree and crown puzzles. The worksheet is in [math-circle-worksheets, week 62](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-62). Problem 6 (add the fewest links so two colours no longer work) waits for the shared graph editor; Problem 9 (counting schedules) is left to paper, as the card advises.

## How a puzzle plays

- **First fit.** A tap lights a lantern at once with the first free colour; a small number on it records when it was tapped, the strip below lists the order in its colours, and the swatches above show how many colours have appeared. A tapped lantern cannot be changed (Undo takes back the last tap; Again clears the order). When every lantern is lit, a miss says how many colours the order used. In the two "or say no order can" puzzles (2 and 5) and in puzzle 6, a button says no order reaches the target; it is available after one finished order and is checked: a false claim is refused. Hints in target puzzles name the next lantern of an order that still reaches the target, or suggest Again when none does; in claim puzzles they show the authored hints only.
- **Why not fewer.** Choose a colour and tap lanterns, as in the family's other puzzles; a clash shows as a dashed red link. Offering more colours than needed is deliberate. When every lantern is lit with no clash, Show why not fewer switches to proving: taps add lanterns to the proof (ringed, with the links between them highlighted), and Check accepts the proof when it shows exactly as many colours as the colouring uses. Recolour goes back. Hints lead to a colouring with the fewest colours that keeps as much of the child's as possible, then to the proof.

## Rules that keep the record honest

- First-fit saves keep only the order; colours are recomputed from it. A save with a finished order must count it as tried, and a claim is saved only when it is true.
- A proof can be checked only after a colouring with no clash, and it solves only when its bound equals the colours used, so a wasteful colouring can never be certified.

## Files

| File | Contents |
|---|---|
| `dist/families/firstfit/firstfit.js` | The first-fit rule, the search for orders and the Grundy number, proofs, both mechanics (`firstfit`, `fewest`), hints and rendering |
| `dist/families/firstfit/firstfit.css` | Lantern dots on links, the order strip and swatches, the proof highlight |
| `dist/families/firstfit/firstfit.json` | The pack: 12 puzzles in two groups, the mathematics and 3 sources |
| `scripts/build-firstfit.mjs` | Authoring list with the graphs; computes each answer and writes the pack |
| `scripts/validate-firstfit.mjs` | Tries every order and every colouring to recheck each answer; checks stored orders and proofs, that targets waste colours, that lanterns sit apart, claims, that hints alone finish from a fresh and a bad start, illegal moves and forged saves; run by `npm run build` |
| `tests/firstfit.test.mjs` | The rule, the Grundy numbers, target and claim puzzles, proofs, colouring and proving, hints, saves and the two satchel groups |

The module adds no satchel family; its puzzles set `libraryFamily: "color"` and `group: "First fit"` or `"Why not fewer"`. To change a puzzle, edit `scripts/build-firstfit.mjs`, then run `node scripts/build-firstfit.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children plan backward from the lantern that should take the top colour or tap at random; whether the proof step reads as a separate task; and whether tapping an odd ring in order is natural.
- **Odd wheels.** A proof for four colours without four lanterns all linked (an odd ring plus a lantern linked to all of it) is not accepted yet, so every four-colour puzzle has a clique of four.
- **Add the fewest links** (Week 62 Problem 6) belongs in the shared graph editor.
- **Story.** These groups are not on the Lantern Road.
