# Card totals

October 10, 2026. Eleven puzzles and a playground built from Week 55 of the Bellingham math circle (few sums and equal spacing). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 55 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-55.md) says keep, and its App fit and Decision shaped this family: number cards tapped into two trays with merging totals on a strip, fewest and most for given sizes with a route through the addition grid as the certificate for "fewest", find every B with a checked That's all and no answer slots, and the contrasts of evenly spaced trays with 9 totals and an uneven B that needs one A card. Nothing asks the child to predict a count, and the worksheet's proofs (Problems 9 and 10) stay on paper.

## The mathematics

Two trays A and B hold different whole-number cards, here 0–9. Each card of A pairs with each card of B; the **totals** are the sumset A + B = {a + b}. With m = |A| and n = |B|:

**m + n − 1 ≤ |A + B| ≤ m × n.**

- **The lower bound is a route.** Put A's cards up the side of a grid in increasing order and B's along the bottom; each dot holds a + b. A route from the bottom-left dot to the top-right dot, one step right or up, passes m + n − 1 dots, and each step adds a positive amount, so its totals climb and are all different. Every design has at least that many totals.
- **The route certifies the fewest.** If every total on the strip lies on one route, the design has exactly m + n − 1 totals, and the route shows that no cards of these sizes can do better. That is the app's "fewest" solve: the child chooses cards and taps such a route; the app checks that it is a route (from the bottom-left, each step right or up), that it climbs and that it passes every total. In a design with more totals, every route misses one, and the app names it.
- **Equality: one common gap (m, n ≥ 2).** If every total lies on every route, swap a route around one small square of the grid: both routes have the same totals, so the square's two corners a(i+1) + b(j) and a(i) + b(j+1) are equal, and A's jump there equals B's. Every square gives this, so A and B are evenly spaced with the same gap; conversely such trays give exactly m + n − 1 totals (puzzles 1, 3, 4, 5, 8, 11).
- **The one-card exception.** If A has one card, every total is B shifted, |A + B| = |B| = m + n − 1, whatever B's spacing (puzzle 7). The theorem's "evenly spaced" needs two cards in each tray.
- **The upper bound** is one token per pair. Two pairs share a total exactly when a jump inside B equals a jump inside A (b′ − b = a − a′), so |A + B| = mn exactly when the jumps of A and of B never agree (puzzles 2, 6, 9). Evenly spaced trays with different gaps can do this: {0, 2, 4} + {0, 3, 6} has 9 totals (puzzle 6).
- **Counting shared totals.** For B = {b, b + d}, the number of totals is 2|A| minus the number of ways d is a jump inside A (puzzle 10: in {0, 3, 6}, 3 is a jump twice and 6 once).

The validator checks the theorem on all 1,046,529 ordered pairs of non-empty trays from 0–9: both bounds, the fewest exactly for one common gap or a one-card tray (23,048 pairs, 20,360 of them with a one-card tray), and the most exactly for disjoint jumps. This is the elementary inverse theorem for two sets, not Freiman's theorem (Tao and Vu, *Additive Combinatorics*, Definition 0.1 and §2.1, as the Week 55 guide cites; the route proof is the guide's, pp. 7–8).

Experiments come first: tap cards, watch tokens land and stack, see which dots share a total. The conjectures (fewest is m + n − 1; equal jumps; evenly spaced is not enough; one card is the exception) come from the puzzles. The explanations (the route, the square swap, jumps that agree) are grown-up conversations in each puzzle's notes.

## Where they appear

**Puzzles → Card totals** (symbol ⊞) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Level | Kind | Trays | Answer | Solving designs | Week 55 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Fewest | A = {0, 2}, B two cards | 3 totals: B jumps by 2 | 8 of 45 | Problem 1 |
| 2 | Easy | Most | A = {0, 1, 2}, B three cards | 9: B's cards at least 3 apart | 20 of 120 | Problem 2, third trial |
| 3 | Easy | Fewest | two and three | 4: one common gap | 160 of 5,400 | Problem 4 (2 + 3) |
| 4 | Medium | Fewest | three and three | 5: one common gap | 120 of 14,400 | Problem 3 |
| 5 | Medium | Every | A = {0, 3, 6}, B two cards with 4 totals | {t, t + 3}, t = 0…6: seven | 7 of 45 | Problem 5 |
| 6 | Medium | Most, both evenly spaced | three and three | 9, e.g. {0, 2, 4} + {0, 3, 6} | 160 of 14,400 | Problem 6, fix 5 |
| 7 | Medium | Fit | A one to three cards, B = {0, 1, 3} | 3: A has one card | 10 of 175 | Problem 7 |
| 8 | Hard | Fewest | A = {1, 4, 7}, B four cards | 6: B = {0, 3, 6, 9} only | 1 of 210 | New, from Problems 4–5 |
| 9 | Hard | Most | four and four | 16: {0, 1, 8, 9} with four cards two apart | 8 of 44,100 | Fix 4 and App fit |
| 10 | Hard | Every | A = {0, 3, 6}, B two cards with 5 totals | {t, t + 6}, t = 0…3: four | 4 of 45 | New, from Problem 5 |
| 11 | Hard | Fewest | four and four | 7: one common gap | 66 of 44,100 | Fix 4 |

## How a puzzle plays

- **Trays.** Each tray is a row of the ten cards 0–9; a tap puts a card in (lit, sun for A, sky for B) or takes it out. Dots by the tray's letter show its size; a full tray's other cards fade. A given tray shows its cards with blank places between, so its spacing is visible.
- **The strip** of totals 0–18 gets one leaf token per total; pairs that share a total stack on one token, and new tokens drop in.
- **The grid** shows every pair, A going up and B across. In the most and find-every puzzles, dots that share a total are shaded ochre.
- **Fewest and fit.** When the trays are full, every dot of the grid is a control and nothing marks the next one: the certificate can fail. The child taps dots one at a time (a tap on a dot already tapped takes the taps back to just before it), and tapping the top-right dot ends the claim, judged at once. Taps that are not a route from the bottom-left dot, one step right or up at a time (taps in page order, a diagonal, the corner first), get "Step right or up from the bottom-left dot." A route that misses totals gets "Not on the route: …" with those totals ringed on the strip and in the grid. Either refusal clears the taps, is kept in the save, and stays through Undo until a card changes, so it is no free yes/no oracle; a route that passes every total solves. There is no Fewest button: the route is the claim, and the child supplies it. In puzzle 7's one-card solve the grid is one row, so its route is forced; the work there is finding that one card fits.
- **Most** solves the moment every pair has its own total (and, in puzzle 6, both trays are evenly spaced; if not, "A is not evenly spaced."). The bound needs no claim: the grid shows one dot per pair.
- **Find every.** A B that gives the count joins a row of found trays the moment it is made; making it again says "Found already." That's all is checked: too soon, "There is another." and That's all waits for a new find. Undo keeps the found row and that answer. There are no answer slots and no count.
- **Hints** start with the puzzle's authored question, then name one card to take out or put in, nearest the trays' current cards, then the route's next step (after taking back a tap that is no part of a route), or That's all. A hint is the only thing that marks a dot. They are memoised per board.

## Files

| File | Contents |
|---|---|
| `dist/families/sumsets/sumsets.js` | The mechanic and the module entry |
| `dist/families/sumsets/sumsets.css` | Trays, strip, grid and route |
| `dist/families/sumsets/sumsets.json` | The pack, written by the builder |
| `scripts/build-sumsets.mjs` | The authoring list: computes every puzzle's solving designs and witness |
| `scripts/validate-sumsets.mjs` | The theorem on every pair of trays from 0–9, every answer by brute force on a table of totals and by its structure, every route in every design, witnesses, taps that are no route refused, refusals kept through Undo, hint chains, refusals and forged saves |
| `tests/sumsets.test.mjs` | Unit tests |
| `scripts/sumsets-browser-smoke.mjs` | The browser suite (desktop and `TEST_PHONE=1`) |

## Sources

- Week 55 student packet (W55-S-v2) and adult guide (W55-F-v1): Problems 1–8; the guide's overview (p. 1) and route proofs (pp. 7–8).
- The Week 55 review card: fixes 4 and 5 (4 + 4 with 7 and 16 totals; {0, 2, 4} + {0, 3, 6}), App fit and the October 10 Decision.
- Terence Tao and Van Vu, *Additive Combinatorics* (Cambridge, 2006), Definition 0.1 and §2.1, for sumsets and the inverse problem, as the guide cites.

## Not yet done

1. **Watch whether children tap a route** without being told, now that nothing lights the start or the next dot, or need a grown-up after building a fewest design. If they stall, the first hint may need to point at the grid.
2. **Watch puzzle 7**: whether a child thinks of a one-card A, and whether the solve feels earned or accidental.
3. **Watch the strip on a phone**: its numerals are small at 375 px, and stacked tokens show shared totals only by their height.
4. The worksheet's proofs (Problems 9 and 10) are not in the app; the route certificate is the only proof step the child performs.
5. No K–1 route (the card's fix 1); the counter action might suit younger children with fewer cards.
6. Not on the Lantern Road, and no Plume scores.
