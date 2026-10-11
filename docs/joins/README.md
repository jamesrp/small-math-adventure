# Joining strips

October 10, 2026. Twelve puzzles and a playground built from Week 54 of the Bellingham math circle (partitions and rebuilding). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 54 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-54.md) says keep, App fit B, and its Decision shaped this family: a strip workbench where two equal strips join and an even strip halves, the app refusing unequal joins; a free bench that cuts anywhere for the catalogs; catalogs the child declares complete with That's all and no visible count; and reach-or-refute targets whose "can't" certificate is the two halved, all-odd collections, which the child makes. There is no "predict the final collection", no join that runs by itself, and Flip appears only inside the at-most-three-strips catalog. The worksheet's general order question (Problem 6) and its written proof (Problem 9) stay on paper.

## The mathematics

A **collection** is a partition: strips of whole-unit lengths whose units add to a total, with no order. The board draws them longest first, as rows of unit squares on one scale.

- **Two moves keep the total.** Join two strips of the same length into one twice as long, or halve a strip of even length into two equal strips. Each move undoes the other.
- **The all-odd form is invariant.** Write each length as u · 2^j with u odd. A join turns two u · 2^j into one u · 2^(j+1), and a halving the reverse, so the number of squares in strips of each odd family u, 2u, 4u, … never changes. Halving everything gives one all-odd collection, the same after any move. So two collections with different all-odd forms are never connected: this is the certificate for Can't (puzzles 7 and 12).
- **It is a complete invariant.** If two collections have the same all-odd form, halve one all the way down and join back up to the other: halving is undone by joining. So joins and halvings connect two collections exactly when their all-odd forms agree (`scripts/validate-joins.mjs` checks every class for totals to 12 by searching moves, never by the form).
- **Euler's theorem by Glaisher's map.** Inside a class, join equal strips until no two match. In family u the strips left are u · 2^j for the 1-digits of m in base two, where m is the number of u's in the all-odd form; carrying in base two ends in one place whatever the order. So each class holds exactly one all-odd collection and exactly one all-different collection, and joining pairs them: partitions into odd parts and into distinct parts are equinumerous for every total (puzzles 3, 4 and 5; checked to 16 by generating functions).
- **Flip.** Reading the columns of squares as strips (conjugation) is its own inverse and turns the number of strips into the longest strip, so collections with at most k strips match those with no strip longer than k (puzzle 8).
- **Both kinds of move.** Some connected pairs need joins and halvings both, such as 8, 1, 1, 1, 1, 1, 1 → 2, 2, 2, 2, 2, 2, 2 in six moves: halve the 8 three times and join the 1s three times. For totals 10 to 16, 11 to 21% of connected pairs need both, as the card's search found (puzzles 6 and 11).

Experiments come first: joining, halving and keeping collections. The conjectures (the odd and all-different catalogs are the same size; joining ends in one place; halving everything decides a reach) come from the catalogs, the matching and the reach puzzles. The explanations (families u, 2u, 4u; binary carrying) are grown-up conversations in each puzzle's notes.

## Where they appear

**Puzzles → Joining strips** (symbol ▤) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Level | Kind | Start | Goal | Answer | Week 54 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Reach | 2, 2, 2, 1, 1 | 8 | 4 joins | New, after Problem 3 |
| 2 | Easy | Catalog, free | 5 | Every way to make 5 | 7 collections | Problem 1, total 5 |
| 3 | Easy | Catalog, free | 7 | Every way with odd strips | 5 | Problem 2, total 7 |
| 4 | Easy | Catalog, free | 7 | Every way with strips that all differ | 5 | Problem 2, total 7; card fix 4 |
| 5 | Medium | Match | the 6 odd collections of 8 | Join each until no two strips match | 6 pairs | Problem 5 |
| 6 | Medium | Reach | 4, 3, 3 | 6, 1, 1, 1, 1 | 4 moves, both kinds | New, from the card's search |
| 7 | Medium | Reach | 10, 2 | 6, 6 | Can't: 5, 5, 1, 1 against 3, 3, 3, 3 | New |
| 8 | Medium | Catalog, free, Flip | 8 | Every way with at most 3 strips | 10 | Problem 8 |
| 9 | Hard | Catalog, free | 8 | Every way to make 8 | 22 | Problem 1 at 8, as the port brief asks |
| 10 | Hard | Catalog, free | 11 | Every way with strips that all differ | 12 | Problem 2 at 11 |
| 11 | Hard | Reach | 8, 1, 1, 1, 1, 1, 1 | 2, 2, 2, 2, 2, 2, 2 | 6 moves, both kinds | The card's App fit |
| 12 | Hard | Reach | 6, 2, 2 | 4, 3, 2, 1 | Can't: two 3s against one | New |

Puzzle 1 needs joins only; puzzles 6 and 11 need both kinds of move. Puzzles 7 and 12 are the refutations; 12's two collections share every strip length the goal shows, and only the count of 3s tells them apart. The worksheets are in [math-circle-worksheets, week 54](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-54); each puzzle's `provenance` names its problem.

## How a puzzle plays

- **The bench.** Strips are rows of sun-coloured unit squares in ink, 36 px tall (the goal's 22 px, and 40 px while they can be halved), all on the scale of the longest strip the puzzle can produce, so lengths compare by eye. Tap a strip to choose it (a pine ring).
- **Joining and halving** (puzzles 1, 5–7, 11, 12 and the playground). A chosen strip of even length shows a dashed line across its middle; tap it again to halve it. Tap another strip of the same length to join the two. A strip of another length is refused: both are marked and "Only equal strips join." appears, until the next tap. Tapping a chosen odd strip again is refused the same way ("Only even strips halve.").
- **The free bench** (the catalogs). A chosen strip shows a dashed line at every join between its squares; tap one to cut there. Tap any other strip to join the two, whatever their lengths. In puzzle 8, **Flip** turns rows into columns.
- **Catalogs.** **Keep** puts the bench's collection on the shelf as a small picture. A collection kept already is refused by ringing its copy on the shelf ("Kept already."); one that does not fit is refused by marking the strips at fault ("Only odd strips.", "Two strips match." or "Too many strips."). **That's all** is the claim: if a collection is missing it says "There is another." and stays greyed until something new is kept. There are no slots and no count.
- **Matching** (puzzle 5). The six odd collections of 8 are cards. Tap one to put its strips on the bench, then join (and halve, if wanted). When no two strips match, the card pairs with what it has become, shown beside it, and the bench clears. 7, 1 and 5, 3 pair as soon as they are taken.
- **Reach or refute** (puzzles 1, 6, 7, 11 and 12). The goal sits above the bench in a dashed leaf-green frame tagged Goal. The puzzle is solved when the bench matches it. **Can't** is greyed until the child has made a move, and it is not judged when pressed. It starts the certificate: joins turn off, the goal's strips become tappable, and "Halve every even strip in both rows." appears. Nothing marks which strips are left to halve. The claim is judged when the last halving leaves both rows all odd. If they differ, the puzzle is solved, the strips with no partner in the other row are ringed in ochre and "The odd strips differ." appears. If they are the same, the claim is refused ("There is a way."): both rows stay halved, and the refusal is saved and kept through Undo until the bench moves again. Each Undo visibly takes back one halving (the goal's first, joining it back up); the next move on the bench brings the goal back whole. One route to the goal starts from the halved bench. Halving a chosen odd strip is refused too ("Only even strips halve."), never ignored. Can't is on every reach puzzle, so its presence gives nothing away. Halving everything is not a free test: in a reachable puzzle it is also the first half of a route.
- **Copy.** Reach puzzles show no objective: the goal frame and the bench show the task. Catalogs show one line ("Keep every way to make 7 from odd strips."), and matching shows "Join each until no two strips match.". How to play has the rules and controls.
- **Keyboard.** Every strip, cut line, card and button is a button. After a move, focus stays on the strip in the same place, or else goes to the first strip button; it never lands on Can't or That's all, or on the goal's strips while they are only a picture.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name one move in words: "Join two 1s.", "Halve the 8.", "Cut the 5 into 3 and 2.", "Join the 3 and the 2.", "Press Keep.", "Press Flip.", "Tap 3, 3, 1, 1." or "Every one is kept." (with That's all as the move). In reach puzzles they follow a shortest route found by search; for a goal that can't be made they halve the bench's strips first (an attempt), then give the reason ("Halved all the way, the goal is 3, 3, 3, 3.") with Can't as the move, which the second level marks; no hint says "Press Can't.". After Can't they halve both rows. After a refusal they follow the shortest route from the halved bench. In catalogs they aim at the missing collection fewest free moves away. The second level marks the strips or the button, and the third offers Apply hint. Hints alone finish every puzzle, from a fresh start, after a wasted move, after a wrong That's all, inside and after a wrong Can't and after wandering. Searches are memoised per board; a hint takes a few milliseconds.

## The playground

The worksheet's page-3 collection 3, 3, 1, 1, 1, 1 on a joining-and-halving bench, with **+** to add a strip of 1 and **−** to take one away (totals 1 to 16). There is no goal and no Hint, and it never counts as solved. It is the place for Problem 6's question: whatever order the joins come in, 3, 3, 1, 1, 1, 1 ends at 6, 4.

## Rules that keep the record honest

- The save is the bench, plus the shelf, the That's-all refusal and the done flag (catalogs); the goal row, whether a move has been tried and the claim, which is none, halving (after Can't) or refused (reach); the card taken and the cards paired (matching). The chosen strip and the pointing refusals are view state, made on one board and gone when it changes.
- Only legal moves are accepted: joins of strips that are on the bench, equal ones except on the free bench; halvings of even strips at the middle except on the free bench, where a cut may fall between any two squares; Flip only in puzzle 8; Keep only for a new collection that fits; That's all only with something kept and not twice without a new keep; Can't only after a move and not again while a refusal stands; goal halvings only after Can't, and no joins then; a card only when not taken or paired; + and − within 1 to 16 and only on a 1; nothing after a solve.
- Saved boards are checked: collections sorted longest first with the right total; a reach bench in the start's class, unmoved unless tried; a claim only after a try; a refusal only for a goal that can be made; a halving claim never resting on two matching all-odd rows (it would have been judged); the goal unchanged except while halving, and then in the goal's class; shelves of different collections that fit; "There is another." only while one is missing; done only with every collection kept; a matching bench in its card's class and never already all different.
- Undo takes back moves, goal halvings, keeps and pairs one at a time, each a visible change, but never a verdict: "There is another." stays while anything is kept, and "There is a way." stays until the bench moves. Undo can step back out of a Can't that has not been judged yet, since nothing has been told.
- The answers, fewest moves, spans and partners are computed by `scripts/build-joins.mjs` with the mechanic's helpers and checked again by `scripts/validate-joins.mjs` by other methods.

## Files

| File | Contents |
|---|---|
| `dist/families/joins/joins.js` | Collections, all-odd forms, joining all, Flip, joins and cuts, the searches, the `joins` mechanic (moves, hints, taps, rendering) and the playground |
| `dist/families/joins/joins.css` | Strips and cut lines, the goal frame, the shelf's small pictures, matching cards and buttons, in the shared board look |
| `dist/families/joins/joins.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources |
| `scripts/build-joins.mjs` | Authoring list; computes catalogs, routes, spans and partners and writes `joins.json` |
| `scripts/validate-joins.mjs` | Collections generated smallest strip first and counted by generating functions; reachability, fewest moves and "needs both kinds" by a search over strip counts; partners by binary digits; Flip by a transposed grid; Euler's theorem and Flip's swap to 16, every class to 12; witnesses; hint chains from fresh, after wasted moves, a wrong That's all, inside and after a wrong Can't and wandering; Can't judged only at the last halving; Undo keeping refusals; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/joins.test.mjs` | Helpers, taps and refusals, the free bench and Flip, catalogs, matching, Can't and its certificate, hints, Undo, saves and rendering |
| `scripts/joins-browser-smoke.mjs` | The interface in a browser at phone width: choosing, halving, joining, an unequal join refused, cut lines, Keep and its refusals, That's all, Flip, matching, a wrong Can't judged after both rows are halved and kept through Undo, a right Can't with the goal halved, keyboard focus, Undo and the playground |

To change a puzzle, edit `scripts/build-joins.mjs`, then run `node scripts/build-joins.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 54: Partitions and rebuilding, student packet W54-S-v1 (Problems 1, 2, 3, 5, 6, 8) and adult guide; unpiloted.
- The Week 54 review card (October 10, 2026), its App fit and Decision, and its search for pairs that need both kinds of move.
- Peter Koroteev, *Integer Partitions*, Berkeley Math Circle (2020), §1 pp. 1–3 (diagrams) and §2.2 pp. 6–9 (odd and distinct parts, splitting even parts), as the worksheet's research notes cite.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch: whether children find "tap a chosen strip again to halve it" and the free bench's cut lines without help, or need How to play; whether, in the reach puzzles, children discover halving everything as a strategy, and whether the Can't certificate (halving both rows) reads as their own argument or as a chore after the claim; and whether the long catalogs (puzzles 9 and 10) are organized or done by trial until That's all accepts.
- **Two benches.** Catalogs cut anywhere and join anything, while the other puzzles join only equal strips. The dashed lines show which bench is which, but the switch may confuse; a different look for the free bench may help.
- **Tall and narrow boards.** A bench of many short strips (fourteen 1s in puzzle 11 when everything is halved) makes a tall column on a phone, and the playground's scale of 16 leaves a strip of 1 about 18 px wide there.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels and K–1.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail. The card's K–1 should (an adult-supported route through Problems 1–3) is not built here.
- **Paper only.** Problem 4's round trips are inside the reach puzzles and the matching only in passing; Problem 6's general order question, Problem 7's exchange exercises and Problem 9's proof stay on paper.
