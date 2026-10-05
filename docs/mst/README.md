# Cheapest networks

October 5, 2026. Twelve puzzles built from Week 53 of the Bellingham math circle (cheapest connected networks). They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app yet. The Week 53 worksheets have not been piloted either; the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-53.md) asked for revisions to two diagrams and the K–1 route, which don't affect these puzzles. The maps and prices are new, except that puzzle 12 keeps the worksheet's four places with prices 1 to 4.

## The mathematics

Each map is a few places joined by links, each with a positive price. Buying links until every place is joined to every other builds a **network**; its price is the total of its links. The cheapest networks are the minimum spanning trees.

- **A cheapest network has no loop.** Returning any link on a loop keeps every place joined and lowers the price. So a cheapest network on n places has n − 1 links. Puzzles 1, 2 and 4 make this concrete: the cheapest-looking links close a loop and waste money.
- **Kruskal's rule finds one.** Taking links from the cheapest up and skipping any that would close a loop always ends with a cheapest network. Puzzles 1–4 can be solved this way; the app never names the rule.
- **The swap test.** A network with no loop is cheapest exactly when no single swap (buy one link, return one link on the loop it makes) lowers its price. When a claim is wrong, the app answers with such a swap, or with a loop link to return.
- **The exchange property.** A network that lacks k links of some cheapest network can reach it in exactly k swaps, each buying one of those links and returning a link on the loop it makes. Puzzles 5 and 9 give exactly that many new links. Most swaps that save money waste one: in puzzle 5, only 2 of the 10 money-saving swaps make progress. In puzzle 9 two cheapest networks tie, and only the one closer to the start is within budget.
- **Ties multiply choices.** Within one price, the choices are the spanning trees of the places that cheaper links have already joined, and separate choices multiply. Puzzle 3 has 2 × 2 = 4 cheapest networks and puzzle 6 has 3 × 2 = 6. In puzzle 10, the four price-2 links interact with the two 1s: five of the six pairs work, because one pair closes a loop with the 1s.
- **The cut property.** If a link is strictly the cheapest of the links crossing some split of the places, it is in every cheapest network. A network without it would cross the split elsewhere, and swapping that crossing link for it would be cheaper. In puzzle 11 the link is forced although eight links are cheaper.
- **The cycle property.** If a link is strictly the dearest on some loop, it is in no cheapest network. In puzzle 8 the link is the third cheapest on the map and is still never bought.
- **Distinct prices give one cheapest network;** ties are needed for more. On four places with prices 1 to 4 (puzzle 12), exactly four cheapest networks come from 144 of the 4096 pricings. The counts that occur are 1, 2, 3, 4, 5, 6, 8, 9 and 16, never 7.

Experiments come first: a child buys links, watches places light up and loops appear, and claims a network is cheapest. The app's answer to a wrong claim is a counterexample, never a target price. The conjectures (a cheapest network has no loop; this link must always be bought) come from the play. The explanations, such as why the swap test works, why a split forces a link and why a loop excludes one, are grown-up conversations, written in each puzzle's notes. In puzzles 7, 8 and 11 the child builds the certificate itself: a split or a loop. The worksheet's uniqueness proof (Problem 9) stays on paper.

## Where they appear

**Puzzles → Cheapest networks** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). It uses the shared graph board ([graph-board.md](../graph-board.md)). The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard. The app adds every price, so no puzzle needs written arithmetic. Puzzles 1–4 need only comparing small numbers; swaps, certificates and design need planning.

| # | Puzzle | Kind | Map | Answer | Week 53 source |
|---|---|---|---|---|---|
| 1 | First network | Cheapest | Square with a diagonal | 6, one network | New, in the style of Problems 1 and 3 |
| 2 | Three cheap links | Cheapest | 5 places, 7 links | 9, two networks | Problem 3 (the greedy trap) |
| 3 | Two choices twice | Every cheapest | Square with a diagonal | 4 networks at 5 | Problems 2 and 4 |
| 4 | Around the middle | Cheapest | 6 places, 8 links | 12, one network | New, a larger Problem 3 |
| 5 | Two new links | Swaps, budget 2 | Wheel of 6 places | 23 down to 15 | Problems 5 and 8, as a fewest-swaps goal |
| 6 | Two groups of ties | Every cheapest | 5 places, 7 links | 6 networks at 8 | Problem 4 and the card's 3 × 3 suggestion |
| 7 | The middle rung | Split | Ladder of 6 places | 4 splits work | Problem 6 (in every cheapest) |
| 8 | Cheap but never bought | Loop | Wheel of 6 places | 1 loop works | Problem 6 (in no cheapest) |
| 9 | Three new links | Swaps, budget 3 | 7 places, 11 links | 27 down to 14 | Problem 8, with ties |
| 10 | The hidden loop | Every cheapest | House of 5 places | 5 networks at 6 | New, extends Problems 2 and 4 |
| 11 | Worth its price | Split | 7 places, 11 links | 1 split works | Problem 6 (forced but not a bridge) |
| 12 | Exactly four | Design | 4 places, all 6 links | 144 of 4096 pricings | Problem 7, with the card's rarer target |

The worksheets are in [math-circle-worksheets, week 53](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-53). Each puzzle's `provenance` names its problem. Maps are not drawn to scale: on every map with more than one price, some longer link is cheaper than a shorter one.

## How a puzzle plays

- **Buying.** Tap a link to buy it (it turns thick pine) and tap it again to return it. Places tint by the group they are joined to, and all turn gold once every place is joined. Bought links on a loop show an ochre dash. The coin shows what has been paid.
- **The claim.** **Cheapest** works once every place is joined. If the network is cheapest, the puzzle is solved. If not, the app shows a cheaper swap (a gold dashed link to buy and a red dashed link to return), or a loop link to return when the network has a loop. The claim waits until something changes.
- **Every cheapest network.** A correct claim adds a small picture of the network to a row below the map; a repeat says "Found already". **That's all** says "There is another cheapest network" until the row is complete. There are no empty slots and no count. Undo keeps the row.
- **Swaps.** The start network is already bought. Arrow tokens show how many new links may still be bought; returning a new link gives its token back, and returning a start link costs nothing. A start link that has been returned is drawn dotted.
- **Splits.** Tap places to put them on your side (pine). Links that cross turn gold and the rest fade. Solved as soon as the dark link is the strictly cheapest crossing link.
- **Loops.** Tap links to pick them. Solved as soon as the picked links form exactly one loop through the dark link, with every other link in it cheaper.
- **Design.** Tap a link to change its price: 1, 2, 3, 4, then 1. **Check** solves it when exactly four networks are cheapest; otherwise it shows every cheapest network for those prices.
- **Hints.** Hints aim at the answer nearest the child's own work. They return a loop link the target lacks, then buy a target link, then claim. With swaps, they give back a wasted new link first. With splits, loops and design, they change one place, link or price at a time. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: no claim before every place is joined, no repeated claim of an unchanged board, no new link past the swap budget, and nothing after a solve.
- Saved boards are checked: every found network must be a distinct cheapest network, a claim must be cheapest, a stored answer to a wrong claim must be the one the app would give, a design check must have the right count, and prices must be 1 to 4.
- The cheapest price, every count, every swap budget, every forcing split and excluding loop, and the 144 designs are computed by `scripts/build-mst.mjs` and checked again by `scripts/validate-mst.mjs` by different methods.

## Files

| File | Contents |
|---|---|
| `dist/families/mst/mst.js` | Groups, loops, paths, every spanning tree, the cheapest networks, swaps, splits, loops and designs, and the `mst` mechanic (moves, hints, rendering, wiring) |
| `dist/families/mst/mst.css` | Bought links, loops, tints, the coin and swap tokens, splits, the found row; imports the shared graph board styles |
| `dist/families/mst/mst.json` | The pack: 12 puzzles, 1 family and 4 sources, merged at load through `dist/families.js` |
| `scripts/build-mst.mjs` | Authoring list and maps; computes and checks every claim in the notes and writes `mst.json` |
| `scripts/validate-mst.mjs` | Prim's algorithm and a search over all link subsets for prices and counts; swap budgets; every split and every loop against the mechanic's solve; all 4096 pricings; every cheapest network claimed through moves; the answers to 52 wrong claims; hint chains from fresh and messy boards; illegal moves and forged saves; run by `npm run build` |
| `tests/mst.test.mjs` | Buying, claims and answers, collecting, Undo, swaps, splits, loops, design, hints, saves and rendering |
| `scripts/mst-browser-smoke.mjs` | Plays six puzzles through real taps and keys, on a desktop and (with `TEST_PHONE=1`) a phone |

To change a puzzle, edit `scripts/build-mst.mjs`, then run `node scripts/build-mst.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children read the gold and red swap after a wrong claim as "do this" and copy it, rather than as a reason to rethink; whether they plan swaps in puzzles 5 and 9 or spend tokens on the first saving they see; and whether the split and loop puzzles (7, 8, 11) make sense without a grown-up, or need one to say what a split is.
- **Story.** Not on the Lantern Road; no keeper or companion lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail.
- **Every improving swap.** The worksheet's "list every cheaper swap" (Problems 5 and 8) is not a puzzle here: on a screen it turns into trying every pair. Fewest swaps replaced it.
- **Paper only.** The uniqueness proof with distinct prices (Problem 9) and the general swap-test argument stay on paper, as the review card advises.
