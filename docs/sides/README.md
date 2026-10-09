# Hidden sides

October 9, 2026. Ten puzzles and a playground built from Week 45 of the Bellingham math circle (the visible side). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 45 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-45.md) says keep, App fit A, size S ("a short set"). It asks for three cards whose six sides toggle into a cup, with no separate tickets or screen; sorting red-showing sides by the colour underneath, designs checked on a claim, the 16 tying cups with That's all, whole cards that never tie as a "can't", and copies of cards. It warns against a live tie meter (that would do the conditioning for the child), a "k of 16" counter, typed probabilities and colour guessing.

## The mathematics

Three cards are red on both sides (sides 1 and 2), red and blue (3 red, 4 blue) and blue on both (5 and 6). A number is drawn from a cup, each number in the cup as likely as any other, and that side shows; the other side of its card is underneath.

- **Red shows: red underneath 2 times in 3.** Knowing only that red shows, the side is one of the red sides in the cup, each as likely as any other. With every number in the cup that is sides 1, 2 and 3, and two of them hide red. Counting cards instead (the red card or the mixed card, one each) gives the wrong 1 in 2: the red card has two ways to show red. This is Bertrand's box. Blue is the mirror image: blue underneath 2 times in 3, and the colour underneath matches the one showing for 4 of the 6 sides.
- **How the clue was made matters.** A cup of sides 1 and 3 always shows red, and then red and blue underneath tie: the same clue with a different chance.
- **Every tie.** A red clue ties exactly when red can show and the cup holds side 3 and exactly one of sides 1 and 2; sides 4 to 6 never show red, so any of them may be there too. That is 2 × 8 = 16 of the 64 cups. A red clue always hides blue exactly when the cup holds 3 and neither 1 nor 2 (8 cups), and always hides red when it holds 1 or 2 and not 3 (24 cups). The empty cup and the seven other cups without a red side can't show red.
- **Whole cards never tie.** With at most one of each card, the red-underneath sides come two at a time (the red card) and the blue-underneath side one at a time (the mixed card), so over the seven tables the piles hold 0 or 2 against 0 or 1: never equal except 0 against 0, when red can't show. With copies, a tie needs twice as many mixed cards as red cards (one red with two mixed, up to three of each), and red underneath 3 times for every blue needs 2 × red cards = 3 × mixed cards (three red with two mixed).

Experiments come first: in the draw puzzles the child turns each drawn card over and sorts each red side by what is underneath; the designs show the sorted red sides only when the child presses Try it (or Keep refuses a cup), so the child does the conditioning. The general arguments are in the grown-up notes; no puzzle asks for a written proof or a fraction. `scripts/validate-sides.mjs` checks every claim above with a separate enumeration (cards as colour pairs, every cup of sides, every table of up to six copies of each card).

## Where they appear

**Puzzles → Hidden sides** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Cup or cards | Task | Answer | Week 45 source |
|---|---|---|---|---|---|
| 1 | Red shows | All six sides | Sort every side that could show red by the colour underneath | 1 and 2 with red underneath, 3 with blue | K–1 P1–P2, 2–3 P2, 4–5 P1 |
| 2 | Blue shows | All six sides | Sort every side that could show blue | 5 and 6 with blue underneath, 4 with red | 2–3 P3, 4–5 P1 |
| 3 | Only 1 and 3 | Sides 1 and 3 | Sort every side that could show red | 1 with red underneath, 3 with blue: a tie | K–1 p. 3, 2–3 P4, 4–5 P4 |
| 4 | Make a tie | Starts full | A cup where red showing ties | Take out 1 or 2 (16 cups work) | K–1 P2 |
| 5 | Always blue underneath | Starts full | A cup where red can show and always hides blue | 3 without 1 and 2 (8 cups) | K–1 P5 |
| 6 | Always red underneath | Starts full | A cup where red can show and always hides red | 1 or 2 without 3 (24 cups) | K–1 P6, 2–3 P5 |
| 7 | Every tie | Any cup but the empty one | Keep every cup where red showing ties | 16 cups; catalog of 63 | 4–5 P6 |
| 8 | Whole cards | At most one of each card, from one of each | A table where red showing ties, or Can't | Can't: no table ties; catalog of the 7 tables | 4–5 P7 |
| 9 | Copies for a tie | Up to 3 of each, from two red, one mixed, one blue | A table where red showing ties, or Can't | One red card, two mixed (4 tables, any blue cards); Can't is refused | the card's copies |
| 10 | Three to one | Up to 3 of each, from one of each | Red underneath three times for every blue, or Can't | Three red cards, two mixed (4 tables) | the card's copies |

Each puzzle's `provenance` names its problems. The worksheets' secret ticket, screen and "chooser" become the cup itself: the sides in the cup are what can be drawn. Puzzles 8 and 9 are twins, one "can't" and one "can", so Can't is a claim to check rather than a giveaway.

## How a puzzle plays

- **The cards and the cup.** Three cards, each with its two numbered sides side by side, red or blue. A side out of the cup is an empty dashed outline in its colour, its number still legible. Below the cards a cup shows the numbers in it.
- **Draw** (puzzles 1–3). Tap a side in the cup to draw it: it shows, ringed, and the other side of its card is covered with a question mark. Sides not in the cup can't be drawn. Tap the **?** to turn the card over, then tap one of the two piles, **■ underneath** in red or blue, to sort the side; the wrong pile is refused, and the piles stay greyed until the card is turned over, so sorting is never a guess. A side already sorted lights up on the shelf instead. **That's all** is the claim: if a side is missing it says "There's another." and stays greyed until something new is sorted. Nothing shows how many there are.
- **Design** (puzzles 4–6). Every side is a switch, in the cup or out; the cup is never empty. **Try it** shows the red sides in the cup, sorted by the colour underneath, and solves the puzzle if the cup works; otherwise it says why ("Not a tie.", "Red can hide red.", "Red can hide blue.", "Red can't show.") until the cup changes. Nothing is sorted before Try it.
- **Every tie** (puzzle 7). The same switches, and the cup is never empty; **Keep** checks the cup. A cup that doesn't tie is refused with "Not a tie." (or "Red can't show.") and its red sides sorted, as Try it shows them, and Keep greys until the cup changes; a cup that ties goes on the shelf, in a column for its red sides. That's all as above (a new cup alone doesn't bring it back), then the catalog of all 63 cups by their red sides, the 16 ties in green.
- **Whole cards** (puzzles 8–10). A stack per card with − and +: at most one of each in puzzle 8, up to three in 9 and 10. **Try it** shows the red sides on the table, sorted by the colour underneath. **Can't** is checked: in puzzle 8 it is right, and the catalog shows the seven tables in columns by their two piles (none ties); in 9 and 10 it says "Keep looking." and greys until the table changes.
- **Keyboard and screen readers.** Focus stays on the control that moved. A drawn side that can be sorted hands focus to the covered side, turning the card over hands it to the first pile, and a + or − that greys out hands it to the other one on the same card; the playground's Draw buttons never hand it to a side. A screen reader hears the side drawn and what is underneath once turned over ("Side 3: red shows. Underneath: blue.") and, in the playground, the piles' sizes.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the next side ("Tap side 2."), "Tap the ? to turn the card over.", the pile ("Put it with red underneath.") or That's all; in a design one side toward the nearest cup that works ("Take side 2 out of the cup.", putting a side in before taking one out), then Try it; in the card puzzles one card ("Add a red card."), then Try it, or Try it and then Can't in puzzle 8. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

The six sides as switches for the cup (never empty). **Draw** takes one random number from the cup and **Draw 10** ten, up to sixty; the side drawn is ringed on its card (nothing is covered here, since a tap on a side changes the cup), and each lands in one of three piles: red with red underneath, red with blue underneath, and blue. Changing the cup clears the piles; **Clear** empties them. There is no goal, no Hint, and it never counts as solved. With every side in the cup the first red pile grows about twice as fast as the second; with only 1 and 3 they grow about evenly. Short runs wander; the puzzles count.

## Rules that keep the record honest

- Only legal moves are accepted: no drawing a side outside the cup or the side already showing, no turning a card over twice, no sorting before the card is turned over, into the wrong pile, a side of the other colour or one already sorted, no That's all with nothing kept or twice in a row, no emptying the cup, no Try it twice without a change, no Keep twice on the same cup, no Can't twice without a change, no more copies of a card than the puzzle allows or fewer than none, and no moves after a solve. In the playground, no more than sixty draws.
- A save is rejected if a side or cup is outside the puzzle or empty, a card is turned over with no side drawn, a kept case is repeated or doesn't count, That's all was accepted with something missing, a refused Keep is recorded for a cup that ties, a count is out of range, or the playground's draws include a side not in its cup.
- Undo takes back the last action, a sort or a Keep included.

## Files

| File | Contents |
|---|---|
| `dist/families/sides/sides.js` | Cards, sides and cups; what a clue hides; the `sides` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/sides/sides.css` | The cards and their sides, the stacks of whole cards and the piles; imports `dist/cases.css` |
| `dist/families/sides/sides.json` | The pack: 10 puzzles, the playground, 1 family and 2 sources |
| `scripts/build-sides.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-sides.mjs` | A separate enumeration; the theorems above; each puzzle's answers; that hints alone solve every puzzle from its start, from every draw, cup or table (covered or turned over, tried or not, with That's all refused) and from random walks with Undo; sorting only after turning over; Can't right only when no table works; illegal moves; That's all early and twice; refused Keeps; Undo; forged saves; the playground; run by `npm run build` |
| `scripts/sides-browser-smoke.mjs` | Plays the family in a browser: drawing, turning over and sorting sides (by keyboard too), a wrong pile, a repeat, That's all, Undo, designs and Try it, Keep refusing a cup with its red sides shown, a hint solve with the catalog, whole cards with Can't and its catalog, copies with Can't refused and + and − by keyboard, and the playground |
| `tests/sides.test.mjs` | Cups and cards, moves, hints, rendering (no tie meter before a claim, no count of the answers part way or solved, nothing covered in the playground), saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-sides.mjs`, then run `node scripts/build-sides.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether a child connects "red shows" with "it's one of the red sides in the cup" or keeps reasoning by cards; whether turning each card over and sorting feels like the experiment or like busywork; whether Try it and Keep's refusals invite trial and error in the designs (the card's worry about six toggles); whether puzzle 3 lands as a surprise after puzzle 1; and whether Can't in puzzle 8 is reasoned or guessed.
- **Fair pairs.** The card's two-side designs (K–1 P7, 2–3 P6: {1, 3} and {2, 3}) are not a puzzle of their own; puzzles 3 and 4 come closest.
- **Colours.** Red and blue sides differ in hue far more than in lightness, as Fair bags' counters do; each side keeps its number as its name rather than an R or B mark.
- **The secret round.** The worksheets' game, a secret draw where only the colour is shown and the child guesses what is underneath, is in puzzle 1's grown-up notes, not on screen. A guessing round would be a natural demo.
- **The chooser's facts.** 4–5 P3 (the chooser also reveals a fact about the covered number) and P5 (whether six rounds can prove a difference) stay on paper; the playground stands in for P5.
- **Bonus histories.** The bonus packet's twelve histories (a card, then which side) are left out.
- **Story.** Hidden sides is not on the Lantern Road and has no keeper lines.
