# Square leftovers

October 23, 2026. Twelve puzzles and a playground built from Week 97 of the Bellingham math circle (Square remainders). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 97 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-97.md) proposed this port (fit B, size M, "a small new family" or a Signal Lanterns group) and shaped it: a square of counters that the child bundles, with the app refusing a wrong size or an early stop; side cards sorted into leftover bins with That's all, where an empty bin certifies "cannot occur"; and choosing bundle sizes whose leftovers tell sides 0 to 15 apart, with a budget of tries. Its pitfalls are kept: the app never says a leftover before the child's own bundles show it, there are no predict-the-leftover rounds, and the proofs of Problems 5 and 6 stay on paper (the grown-up notes give them).

## The mathematics

A card n stands for an n by n square of counters. Taking away whole bundles of m until fewer than m are left leaves the **leftover** n² mod m (the worksheet's "output" for "input" n).

- **The leftover depends only on the side's leftover.** Cutting an m-wide strip off the square takes away whole bundles, so n and n − m leave the same, and sides 0 to m − 1 show every leftover there is (Problem 5). In the playground a 10 by 10 square with bundles of 7 loses a 10 by 7 strip (ten bundles) and a 3 by 7 strip, leaving the 3 by 3 corner.
- **A card and the size minus it always match.** Between an x by x and a y by y square (x < y) lies an L of y² − x² counters, which re-forms as a (y − x) by (x + y) rectangle (the review card's counters picture, fix 2). When x + y = m the rectangle is whole bundles, so x and m − x leave the same, for every m.
- **At an odd prime those are the only matches.** A (y − x) by (x + y) rectangle is whole bundles of a prime p only when p divides a side (Euclid's lemma, Week 96). With sides 0 to p − 1 that means x + y = p, so card 0 is alone and the other p − 1 cards pair up: (p + 1)/2 leftovers counting 0, each nonzero one hiding exactly two cards (3, 5, 7 and 11 give 2, 3, 4 and 6; Problems 1, 2 and 6).
- **Composite sizes break the pairing.** With 8 the cards 1, 3, 5 and 7 all leave 1 (every odd square is one more than a multiple of 8); with 9 the cards 0, 3 and 6 leave 0; with 15 the cards 1, 4, 11 and 14 leave 1 and the cards 2, 7, 8 and 13 leave 4, while 0 is alone as at a prime (Problems 3 and 4). 8, 9 and 15 give 3, 4 and 6 leftovers, not (m + 1)/2.
- **Telling cards apart.** One size m makes x and m − x match, so it tells apart at most the cards 0 to m/2. For cards 0 to 5 only 10 and 11 work among 2 to 12 (12 makes 2 and 4 match); for cards 0 to 6 no size from 2 to 12 works; for cards 0 to 15 one size never works, and of the 55 pairs of sizes only 10 and 11 do (the card's claim, from card_checks.py). That 10 and 11 work has a short proof: a match under 11 needs x + y = 11 or 22 or y − x = 11, and the first and last make the rectangle odd, so not whole bundles of 10, while x + y = 22 with whole bundles of 10 forces y − x = 10 and y = 16. The other 54 pairs fail by search.

Experiments come first: a child bundles squares and sorts the cards, and the empty bins and the pairs are there to notice. Conjectures follow ("cards that add to the size match", "a prime gives half"), and explanations are for older children with a grown-up, with the L re-formed as a rectangle. No puzzle asks for a written proof.

## Where the puzzles appear

**Puzzles → Square leftovers** (symbol ⊟) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). K–1 children can play puzzles 1–3 with a grown-up reading How to play; 2–3 the find and sort puzzles to 9; 4–5 the rest.

| # | Level | Kind | Bundles | Cards | Answer | Week 97 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Sort | 4 | 0–3 | 0: 0, 2 · 1: 1, 3 (2 and 3 empty) | p. 1's worked example and table |
| 2 | Easy | Sort | 3 | 1–5 | 0: 3 · 1: 1, 2, 4, 5 (2 empty) | the card's K–1 route (fix 1) |
| 3 | Easy | Sort | 5 | 0–4 | 0: 0 · 1: 1, 4 · 4: 2, 3 | Problem 1 |
| 4 | Easy | Find | 7 | 0–6, leftover 2 | 3 and 4 | Problem 2 (the secret input) |
| 5 | Medium | Sort | 7 | 0–6 | 0: 0 · 1: 1, 6 · 2: 3, 4 · 4: 2, 5 | Problems 2 and 3 |
| 6 | Medium | Sort | 8 | 0–7 | 0: 0, 4 · 1: 1, 3, 5, 7 · 4: 2, 6 | Problem 3 |
| 7 | Medium | Sort | 9 | 0–8 | 0: 0, 3, 6 · 1: 1, 8 · 4: 2, 7 · 7: 4, 5 | Problem 3 |
| 8 | Medium | Tell | one of 2–12 | 0–5, 3 tries | 10 or 11 | new, after the card's App fit |
| 9 | Hard | Find | 15 | 0–14, leftover 1 | 1, 4, 11 and 14 | Problem 4 |
| 10 | Hard | Sort | 11 | 0–10 | six leftovers: 0 · 1: 1, 10 · 3: 5, 6 · 4: 2, 9 · 5: 4, 7 · 9: 3, 8 | Problem 6, with the card's counters picture |
| 11 | Hard | Tell | one of 2–12 | 0–6, 3 tries | Can't | new, a contrast with puzzle 8 |
| 12 | Hard | Tell | two of 2–12 | 0–15, 4 tries | 10 and 11 only | the card's App fit (55 pairs) |

The worksheet is in [math-circle-worksheets, week 97](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-97), with the editable problem files in `source/week-97/problems/`. Each puzzle's `provenance` names its problem. The instances of puzzles 1–7, 9 and 10 are the worksheet's or the card's; puzzles 8 and 11 are new, and puzzle 12 is the card's.

### Why its own family

The card offered a small new family or a group in Signal Lanterns for the tell puzzles. Signal Lanterns (secret codes of two-state lanterns deduced from match counts) and its groups ([Codebooks](../codebooks/README.md), [Slippery secrets](../secrets/README.md)) are about codes of lit and dark lanterns; their object and move would not fit a square of counters, and putting only the tell puzzles there would split the week from the bundling that gives it meaning. The square of counters, the bundle, the leftover bin and the size choice belong together, and no family in the app takes squares (or anything) modulo m by bundling, so the week is ported as its own small family. [Chip firing](../chips/README.md) and [Moving piles](../piles/README.md) move counters, but along a graph; [Hidden sides](../sides/README.md) sorts by cases, not by remainders.

## How a puzzle plays

- **The card in hand.** Sort and find puzzles show a row of cards and the bins. One card is in hand (pine in the row) and its square fills the work area beside the bins (above them on a phone) with "Bundles of m" and **Bundle**. The card in hand is the one last bundled while it is in the row, else the first card in the row; tapping any card, in the row or in a bin, puts it in hand.
- **Bundling.** Slide across counters, or tap counters to choose or unchoose them one at a time, then press Bundle. A slide chooses the rectangle between the first counter and the last when its loose counters are whole bundles (a 4 by 3 strip of a 4 by 4 square is four bundles of 3), and otherwise the counters the finger passed over, so a bundle bigger than the square's side (11 on a 6 by 6) is one bent slide. A choice that is whole bundles goes at once on Bundle; any other is let go on Bundle with "Not whole bundles.", and Bundle is outlined, because pressed with nothing chosen it takes the next whole bundle in reading order. Each bundle is drawn as a pale loop round its counters, which fade. Once fewer than one bundle is left, the leftover counters get an ochre ring and Bundle turns off. Bundling never says a number: the leftover is the counters the child sees.
- **Placing.** With a card in hand, tap a bin, or drag the card onto a bin. A card with bundles taken goes in a bin only once fewer than one bundle is left; otherwise it stays put and the board says "Another bundle fits." (the card's early stop). A card with no bundles taken may be placed straight away, so a child who knows its leftover, from the pairing or from a square smaller than a bundle, need not bundle it. The row ends with an empty dashed place: tapping it (or dragging there) takes the card in hand out of its bin.
- **Bins** are labelled by a sun counter with the leftover's number under "Left over"; there are no slots or counts. A sort has a bin for every leftover from 0 to m − 1. A find has one bin and one sentence on the board, "Find every card that leaves r."; a sort has no objective copy.
- **That's all** checks the whole arrangement (a sort needs every card in a bin; a find needs a card in the bin). A sort with a card in the wrong bin gets "A card is in the wrong bin."; a find gets "Not yet." both when a card doesn't belong and when one is missing, so That's all on one card at a time can't judge the cards one by one: bundling is the check. The arrangement stays refused (That's all off, the line shown whenever the board comes back to it) through Undo and new placings, until Restart. A right That's all solves the puzzle, and in a sort the bins no card reached turn dashed: those are leftovers no square can leave.
- **Tell puzzles** show the cards 0 to `top`, the sizes 2 to 12 as round buttons, try dots, **Try** and **Can't**. With one size to choose, tapping a size chooses it (another replaces it); with two, tap two. Try checks the choice: a failure outlines two cards that still match in red, shows their leftovers under them, and adds a record to the list (the sizes, the two cards and what they leave). The dots count tries; when they run out, **Again** starts the tries over, and the earlier rounds' records stay in the list, faded. A choice is tried only once in a round. A winning Try shows every card's leftovers under it, with a key for the sizes. **Can't** needs one try first; it is refused with "There is a way." (and stays refused) when a choice works, and when none does it solves the puzzle and lists, for every size, two cards it makes match.
- **Hints.** Before any move the first hint is the authored nudge. Then sort and find hints take a card out of a bin it doesn't belong in, bundle the next card that still has to go in a bin ("Tap card 5, then press Bundle." or "Press Bundle."), place it ("Put card 5 in bin 4."), and finally "Press That's all."; tell hints choose the nearest working choice and press Try, and in puzzle 11 make one try and then give the reason ("Two cards that add up to the size always match, so sizes 2 to 11 have a match, and 12 makes 2 and 4 match.") with Can't outlined, never "Press Can't". Level 2 outlines the card, bin, Bundle, size or button; level 3 offers Apply hint. Hints alone solve every puzzle from fresh and from random play.

## The playground

The playground has no goal, no Hint and never counts as solved. Two steppers set the square's side (0 to 15, shown as a card) and the bundle size (2 to 15). Bundle works as in the puzzles; **Clear** takes the bundles apart; changing the side or the size starts a new square. Problem 5 plays here: a 10 by 10 square with bundles of 7, a 10 by 7 strip, then a 3 by 7 strip, and the 3 by 3 corner is left.

## Rules that keep the record honest

- Only legal moves are accepted: a bundle must be a whole number of bundles of loose counters of one card's square; a placement must change something, into a bin the puzzle has or back to the row, and not while another bundle fits; That's all only on an arrangement it can judge and has not refused; in tell puzzles at most k sizes, Try on a full choice not tried before with a try left, Can't once after a try, Again only when the tries are used up; nothing after a solve.
- Saves hold only what was done: the bundles taken (replayed and checked: no counter twice, whole bundles only), where each card is, the refused arrangements (each one That's all would refuse) and whether the claim was accepted (only on the answer); the tell choice, the tries (no try after a winning one, within the budget), the failed tries of earlier rounds and Can't (right only where no choice works and after a try, refused only where one does).
- Undo takes back bundles, placings and sizes, and keeps what a refusal learned, through the `carry` hook: refused arrangements stay refused, failed tries stay tried, earlier rounds' records stay and a refused Can't stays refused. A winning Try, a right Can't or a right That's all is a move like any other and is taken back. The card in hand, the counters chosen and the "Not whole bundles." and "Another bundle fits." lines are view state, cleared by every move and Undo, so the same board always draws the same.

## Files

| File | Contents |
|---|---|
| `dist/families/leftovers/leftovers.js` | Squares and bundles, telling cards apart (`matchOf`, `workingChoices`, `cantReason`), the `leftovers` mechanic (moves, refusals, hints, the sort, find and tell boards, the playground, taps, slides, drags and keys) |
| `dist/families/leftovers/leftovers.css` | Styles in the shared board palette, scoped under `lo-` classes, importing `sq-grid.css` |
| `dist/families/leftovers/leftovers.json` | The pack: 12 puzzles, the playground, 1 family and 3 sources |
| `scripts/build-leftovers.mjs` | Authoring list: checks every bin, find answer and working choice against the table above with the mechanic, records a witness for each puzzle, and writes the pack |
| `scripts/validate-leftovers.mjs` | Recomputes every leftover by building squares row by row and taking away bundles (sides up to 5m, sizes 2 to 15) and checks the strips rule, the pairing, the prime count (p + 1)/2 for 3 to 13 with no other matches, the composite exceptions, every sort's bins and that the empty bins are leftovers no side reaches, every arrangement of the smaller sorts and every single-card change of the larger, every one of the 2^k sets in each find bin with its refusal line, all 11 single sizes and all 55 pairs for the tell claims and every shown match; witnesses; hints from fresh and from 25 random plays per puzzle; every Undo changing the board; refusals and their locks through Undo; illegal moves; forged saves; the playground. Run by `npm run build` |
| `tests/leftovers.test.mjs` | Squares and bundles, matches, the card in hand, bundling and the early stop, That's all and its lock through Undo, the empty bins, a find refusing with "Not yet." and a card taken out, tries, Can't and Again with the earlier rounds' records, slides (strips and bent slides), hints and their outlines, saves, the playground, rendering and hint timing |
| `scripts/leftovers-browser-smoke.mjs` | The interface in a browser: bundling by Bundle, by taps, by a slide and by a bent slide for bundles of 11 (mouse, or touch with `TEST_PHONE=1`), "Not whole bundles." with Bundle outlined, and "Another bundle fits.", placing by tap and by drag, That's all refused, locked through Undo and accepted with the empty bins marked, a find refused with "Not yet." and a card taken out, the tell puzzles with a failed Try, a refused and a right Can't, two sizes and a win, a level-2 hint, the playground, no page overflow, and screenshots in `test-results/leftovers/` |

To change a puzzle, edit `scripts/build-leftovers.mjs`, then run `node scripts/build-leftovers.mjs`, `npm test` and `npm run build`.

## Sources

- The Week 97 worksheet (Grades 3–5) and facilitator guide, and the review card of October 23, 2026, with its math check (`plans/review/week-97.md`, `week-97-math.md`) and its fixes: the K–1 route in groups of 3 and the counters picture for the prime pairing.
- The prime count and the composite exceptions are the worksheet's Problems 3, 4 and 6; the proof that 10 and 11 tell cards 0 to 15 apart is written here and checked by search with the other 54 pairs.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch:
  1. whether children find the slide across counters and the empty Bundle press on their own, or tap counters one at a time on big squares (a 10 by 10 square is 100 taps), whether a bent slide is found for bundles bigger than the side (puzzles 3, 5 and 10), and whether "Not whole bundles." with Bundle outlined reads as "choose a multiple, or let Bundle choose" rather than "you did it wrong";
  2. whether children bundle before placing or guess and lean on That's all (cards with no bundles taken may be placed at once, and a refused arrangement only locks that one arrangement), and whether the dashed empty bins after a solve are noticed as "no square leaves this";
  3. in the tell puzzles, whether a failed Try's red pair and its record lead children to the pairing (cards that add to the size) or to random tries and Again, and whether Can't in puzzle 11 is pressed for a reason.
- **Long pages on a phone.** Puzzle 10 has eleven bins below the square and the row, so a phone needs scrolling between the square and the bins; dragging a card to a bin off screen is not possible, and tapping a bin is the way.
- **Not built from the card.** Problems 5 and 6's explanations (the strips and the prime rule) stay on paper and in the grown-up notes; the worksheet's secret-input partner game (Problem 2) is a find puzzle here, not a two-player game. The playground does not tell cards apart.
- **Story and grade trails.** Square leftovers is off the Lantern Road and has no keeper lines; the family is grade-free and in no K–1, 2–3 or 4–5 trail.
