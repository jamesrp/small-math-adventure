# Mirror twins

October 17, 2026. Twelve puzzles and a playground built from Week 37 of the Bellingham math circle (tetrahedron chirality). They are in the puzzle satchel only, not on the Lantern Road. No children have played them yet, and the Week 37 worksheet is an unpiloted prototype. The [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-37.md) shaped this family through its App fit and its Decision of October 10, 2026. The model is a flat view from corner A, and a tap on a corner turns the model a third of the way round it. The solves are turning to match, merging letters, placing letters so a pair matches or can't, and sorting into turn-to-match groups. A sort ends with a That's all that the app checks, and no class count is shown. "Can't match" is a claim the app checks against the two views from A. The worksheet packet has not changed since the card. The printed models are used in puzzles 1–5, 7 and 10. The other puzzles are new or come from the worksheet's questions; each puzzle's `provenance` says which.

## The mathematics

A **model** is a rigid regular tetrahedron with a letter on each of its four corners. Two models **match** when a rotation carries one onto the other letter for letter. Rotations count; reflections do not. Which way a letter faces does not count either.

- **The turns.** A tap on a corner turns the model 120° about the axis through that corner and the centre of the opposite face. The tapped corner stays where it is, and the other three move one place round it, clockwise as seen from outside looking at that corner. The four turns generate the rotation group of the tetrahedron. That group has 12 elements, and they are exactly the even permutations of the four corners (A₄). So taps reach all 12 poses, each within three taps, and they never reach a reflection: a reflection swaps two corners and fixes two, which is an odd permutation. The validator checks this by building the solid from alternate corners of a cube and turning it by Rodrigues' formula. It finds twelve matrices, each of determinant +1, inducing exactly the 12 even permutations.
- **Four different letters: two classes of twelve.** There are 24 ways to put A, B, C and D on the corners. Each model looks 12 different ways, so the 24 labellings fall into exactly two classes of 12, and each class is the mirror image of the other. Two models with the same four letters match exactly when the permutation taking one to the other is even. A **mirror twin** is a model's reflection, for example a copy with two letters swapped. It never matches the model.
- **The certificate: the view from one corner.** Put the same letter, say A, in the middle of both models. That letter is then nearest the eye, and the other three letters make the triangle behind it. On one class B, C and D run clockwise round A, and on the other class they run anticlockwise. A turn that matches the models must put A on A. That leaves only the three turns about the middle (none, one tap or two), and each of them keeps the way round. So if the three letters run opposite ways on the two models, no turn can match them. This is the 4–5 Problem 3 argument, and it is complete: A has to go on A, and all three turns about A fail. It also works the other way. With four different letters and the same letter in the middle of both models, the arrows run opposite ways exactly when the models can't match. The validator checks this on all 864 traced pairs.
- **Two equal letters: always a match.** Make any two letters equal and the model becomes its own mirror image. The mirror through the other two corners and the midpoint of the equal pair's edge swaps the equal corners and changes nothing. Two reflections make a rotation, so the twin, which is the model reflected, is also the model turned. So every one of the six merges lets the twins match (puzzles 4, 6 and 8). All 12 arrangements of A, A, B and C match each other (puzzles 5, 7 and 12), and so do the arrangements of any other set of letters with a repeat. The validator checks every pair of the 256 labellings with letters A to D.
- **Restoring a fourth letter can land in either class.** Change one A on each of two matching A, A, B, C models to D. If the two changed As meet when the models match, the new pair still matches. Otherwise the result is a pair of mirror twins (puzzles 7 and 10).
- **What is not claimed.** Nothing here is about chirality beyond rotation classes of labellings. The organic-chemistry connection in the grown-up notes is an analogy: a carbon atom with four different groups is chiral in the same way.

Children should experiment first. They turn the models to match, try a Can't, merge two letters, place letters and sort. Their conjectures come from that work. One is that the twins never match whatever you do. Others are that making two letters the same always fixes it, that two As always match, and that there are only two kinds of A, B, C, D model. The explanations are the view from A, which is the Can't certificate, and the mirror through two equal corners. Grown-ups can take these up in each puzzle's notes. The worksheet's counting question (4–5 Problem 5, the 12 rotations of a bare frame) and its written explanations stay on paper.

Rough bands: puzzles 1–4 suit K–1 with a grown-up reading How to play. Puzzles 5–8 suit grades 2–3. Puzzles 9–12 suit grades 4–5. The puzzles are grade-free, and these bands are entry points, not ceilings.

## Where they appear

**Puzzles → Mirror twins** (symbol ◬) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). A model is written as its letters by position: middle, top, right, left. For example, ADCB has A in the middle, D at the top, C on the right and B on the left. The worksheet's picture of ABCD (A at the apex, B lower left, C lower right, D behind) is ADCB in this notation.

| # | Level | Title | Goal | Models (other / yours) | Answer | Week 37 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Turn it back | Turn to match | ADCB / ACBD | One tap on the middle | The worked "turn around A" before Problem 1, played backwards; K–1 P1 |
| 2 | Easy | Hide and turn | Turn to match (Can't offered) | ADCB / BACD | Two taps at fewest: the middle, then the top | K–1, 2–3 and 4–5 P1 |
| 3 | Easy | The printed pair | Turn to match, or Can't | ADCB / BDCA | Can't. Bring A to the middle (one tap on the right corner), then trace B then C on each: the arrows run opposite ways | K–1 P2, 2–3 P2, 4–5 P2–P3 |
| 4 | Easy | Two Cs | Turn to match (Can't offered) | ACCB / ACBC | One tap on the middle | K–1 P3 |
| 5 | Medium | Two As | Turn to match (Can't offered) | ACBA / ACAB | One tap on the top corner, which brings the other A into the middle | K–1 P4, 2–3 P5 |
| 6 | Medium | Make two the same | One change, then turn to match | ADCB / ADBC | All 12 changes work. C to B or B to C needs no tap; D to C needs one tap on the middle | 2–3 P4, K–1 P3 |
| 7 | Medium | A becomes D | Change one A on each to D so they match | ACBA / ACAB | Change the other model's middle A with your right A, or its left A with your middle A; then one tap on the top | 2–3 P6, first question |
| 8 | Medium | Every pair | Find every pair that, made the same, lets the twins match; That's all | ADCB / ADBC | All six pairs. Fewest taps: BC 0, AB 1, CD 1, AC 2, BD 2, AD 3 | 2–3 P4, 4–5 P4 |
| 9 | Hard | Four blank corners | Put on A, B, C, D so the two can't match; Can't | ADCB / four blanks | 12 of the 24 placements, namely the copy with any two letters swapped (ABCD, for example); then a turn and Can't | K–1 P5, 2–3 P3 |
| 10 | Hard | A becomes D again | Change one A on each to D so they can't match; Can't | ACBA / ACAB | Both middle As, or the other model's left A with your right A; then a turn and Can't | 2–3 P6, second question |
| 11 | Hard | Six models | Sort into stacks that match; That's all | ADCB, ABCD, BCDA, CABD, DCAB, DBAC | Two stacks: models 1, 3, 5 and models 2, 4, 6 | 4–5 P6, with the card's fix 8 (A, B, C and D) |
| 12 | Hard | Eight models | Sort into stacks that match; That's all | ACBA, ADCB, ABCD, ACAB, DCAB, BACA, CABD, BCDA | Three stacks: the A, A, B, C models (1, 4, 6), then 2, 5, 8 and 3, 7 | New, after 4–5 P6 with the A, A, B, C pair |

Two puzzles have answers that may surprise children. Puzzle 2 looks like puzzle 3 but matches: Can't is offered there and is wrong. Puzzle 5's models look like mirror twins, and the second A lets them match. Puzzle 12's A, A, B, C models include such a look-alike pair, and they still make one stack.

## How a puzzle plays

- **The board.** Each model is a triangle with a corner in the middle, three paper faces and ink edges, and a lettered disc on each corner. The other model sits on a sun card. Yours is plain paper, and its four discs are buttons. A tap on a disc, or Enter or Space on a focused one, turns your model a third of the way round that corner. The letters then glide round the axis while a wire frame of the solid turns with them (460 ms; prefers-reduced-motion turns this off). Discs never overlap, and a tap goes to the disc it lands on. The faces between the discs take no taps.
- **Turn to match** (puzzles 1–5). The puzzle is solved the moment every corner shows the same letter as the other model. The turning puzzles show no objective: the two models and the tappable corners say it. Puzzles 2–5 also have **Can't**.
- **Can't** (puzzles 2–5, 9 and 10). The button is off until the child has turned the model at least once. Pressing it starts tracing. On each model the child taps two of the three outer letters. The first tap marks where an arrow starts, and the second draws an ochre arrow round the middle, from the first letter through the second. A tap on the start takes the arrow back, and a tap on a model that already has an arrow starts that arrow again. The claim is judged when both arrows are in:
  - *Different middle letters* gives "Not the same letter in the middle." This refusal is about the claim's form, not the pair. It clears the taps and locks nothing.
  - *Different letters traced* (the same two letters must be traced in the same order on both) gives "Follow the same letters on both.". This is also a form refusal, and it also locks nothing.
  - *Arrows running the same way* gives "Same way round.". The ochre arrows stay dashed on both models.
  - *Opposite arrows on a pair that matches anyway* (only possible with a repeated letter) gives "There is a way.".
  - *Opposite arrows on twins* solves the puzzle, and both arrows turn pine.

  The last two refusals are wrong claims. They are saved, and Can't stays off while the letters are the same.
- **One change** (puzzle 6). Letter chips under the models: tap the letter to change, and it lifts with a pine ring. Then tap the letter it becomes. The change happens on both models at once, the chips go, and taps then turn your model. Undo takes the change back.
- **Set-ups** (puzzles 7, 9 and 10). The letters still to put on wait under the model as small stickers. In puzzles 7 and 10, the As of both models are buttons until each model has had one A changed to D. In puzzle 9, your model's four corners are blank, and taps put on A, B, C and D in that order. Turns and Can't open only when the set-up is done. Puzzle 7 is solved by turning to a match. Puzzles 9 and 10 are solved only by Can't: a set-up alone, or a pair that matches, is not a solve.
- **Every pair** (puzzle 8). The chips work as in puzzle 6. When your model matches after a change, that pair of letters (B = C, for example) goes on the shelf, and both models start again from the twins. A pair already on the shelf gives "Found already.", and its shelf chip pops. **That's all** is off while the shelf is empty. It judges the whole shelf once. With a pair still missing it says "There is another." and stays off until the shelf grows. With all six, the puzzle is solved. Nothing counts the pairs.
- **Sorting** (puzzles 11 and 12). Every model is shown small, and one is on the big board. Tap a small model to put it on the big board, then tap the big board's corners to turn it. Small models that show the same letter in every place stack together automatically and glide into the stack. That's all opens after a turn. It is solved when no two stacks could be turned to match. Otherwise it says "Some can still match." and stays off while the stacks are the same. Neither the board nor the refusal shows a count of classes or stacks.
- **Copy.** Puzzles 1–5 show no objective. The others show one sentence, because the board alone can't say what is asked: "Make two letters the same, then turn to match.", "Change one A on each to D so they match." (or "so they can't match."), "Put on A, B, C and D so the two can't match.", "Find every pair of letters that, made the same, lets the models match." and "Turn models so the ones that match stack together.". How to play opens with what a model is and what matching means, and then describes the taps. It states rules, never the theorem.
- **Hints.** Before any move, the first hint is the authored nudge. None of the first hints is Can't or That's all. After that the hints go step by step:
  - turning puzzles: the corner to tap, as "Tap the top corner.";
  - set-ups: where the next letter goes, as "On the left model, change the A in the middle to D." or "Put B at the top.", chosen from a search over every completion;
  - a change: "Change D to C.";
  - every pair: the next missing pair, its taps, then "Press That's all.";
  - sorts: which small model to turn to look like which, by its letters, as "Turn the model with B in the middle to look like the model with D at the top: tap its middle.", then "Press That's all.".

  For a pair that can't match, the chain first brings the same letter to the middle with at least one tap, so an attempt comes first. Then it gives the reason before naming Can't: "With A in the middle of both, B, C and D go round opposite ways, and a turn never changes that. Press Can't, then tap B and then C on each." A set-up that can no longer reach its goal is a dead end with the rescue Undo: "These two can't match now. Undo a change.", "These two can match. Undo the letters." or "That letter can't lead to it. Undo it.". The second hint level marks the disc, chip, small model or button, and the third offers Apply hint. Hints alone finish every puzzle from a fresh start, after random play, after each kind of refusal and after every set-up.

## Certificates and claims

- **The child supplies the certificate.** "Can't match" is a pair of traced arrows, one on each model, round the same middle letter. The child chooses the letter to bring to the middle, the two letters to follow and their order. The app judges the claim once, when the last tap is in, and then draws the arrows pine, running opposite ways. That drawing is the whole argument of the mathematics above, shown on the child's own models.
- **Can't comes after an attempt.** Can't is off until the model has been turned, and the hint chain makes that turn before it names Can't. On a fresh board Can't solves nothing.
- **The certificate can fail, and it is rarely hit by chance.** No tap is tinted, ringed or focused while tracing (except as a level-2 hint). On a pair that matches, every claim with the right form is refused, and the claim then locks. On a true twin pair, a correctly formed claim is accepted because it is true: with four different letters, opposite arrows are equivalent to can't match. The validator counts every reachable pose and all 36 trace pairs. It reports 18 of 432 (4.2%) accepted on puzzles 3, 9 and 10, and none on puzzles 2, 4 and 5. A random tapper must first land the right middle letter and then trace the same two letters in order on both models, which is 1 in 6 even with the right middle.
- **Refusals are not a free oracle.** A wrong claim ("Same way round." or "There is a way.") tells the child that the pair can be matched. It is saved, and Can't stays off for as long as the letters stay the same: through turns, through Undo and back to the start. Only a change of letters, by a merge or a set-up, frees it. The two form refusals reveal nothing about the pair, so they lock nothing. A refused That's all stays off until the shelf grows (every pair) or the stacks change (sorting).
- **Undo takes back moves, never a refusal.** It keeps a wrong claim, the pairs on the shelf and a refused That's all. Undo always changes the screen. An Undo straight after a refusal takes away the message and the refusal's arrows but keeps the refusal itself. In a sort, the model whose turn is taken back goes onto the big board.
- **Find every is judged as a whole.** In every pair there is no per-pair verdict before the match: a pair goes on the shelf only when the models match. Then That's all judges the shelf with "There is another." and no count. A sort has no Check per stack, and its That's all answers "Some can still match." without saying which stacks or how many.
- **No quizzes, no free dragging, no swaps.** Nothing asks "will these match?". The models turn only by the four corner taps, and no move swaps two letters, which is the one thing turning can't do.

## The playground

The playground has two models, starting as the printed twins (ADCB and ADBC), and both can be turned. **Letters** switches the taps to changing letters: each tap moves that corner on to the next letter, A to B to C to D and back to A. Press Letters again to turn. There is no goal and no Hint, and the playground never counts as solved. It is the worksheet's partner game (K–1 Problem 1 and Problem 5). One player sets a pair, and the other tries to match it or says why it can't be matched.

## Rules that keep the record honest

- **What is saved.** For a pair, the save holds your model's pose and letters, the other model's letters, whether a turn has been made, the set-up and merge, the claim and the last message. For every pair it holds the shelf, the refused shelf, the last message and done. For a sort it holds each model's pose, whether a turn has been made, the refused stacks, the last message and done. The playground saves both models. Everything drawn is derived from the save.
- **Only legal moves are accepted:**
  - a turn about one of four corners, never during a set-up or after a solve;
  - a letter put only on a corner that is to change (an A, or a blank), on its own side, in order;
  - one change, only in puzzle 6 or every pair, between two different letters on the board;
  - Can't only where it is offered, after a turn, while not locked, with two different outer corners traced on each model;
  - That's all only with something shelved, or after a turn in a sort, and never twice on the same shelf or stacks.
- **Saved boards are checked:**
  - Every pose must be a rotation, so a reflected pose is refused.
  - The letters must follow from the start by the set-up and at most one merge.
  - A claim is judged again against the letters. An accepted claim needs a turn and the claim's own pose. A wrong claim must be of the kind it says.
  - A message must fit the board.
  - The shelf must hold real pairs, each once. A refusal must fall short of six pairs, and done needs all six.
  - The models must never rest matched after a change, because a match goes on the shelf at once.
  - Refused stacks must be a partition by class with too many stacks. A sort can be done only with exactly one stack per class.
- **Who computes the answers.** `scripts/build-tetra.mjs` computes the answers with the mechanic's own rotations and checks them against the table above. `scripts/validate-tetra.mjs` computes them again by parity and by a separate search over its own turn matrices.

## Files

| File | Contents |
|---|---|
| `dist/families/tetra/tetra.js` | The turns, rotations and matching; the claim's judge; classes and stacks; the `tetra` mechanic (moves, hints, Undo's carry, rendering, the turn animation and Can't's tracing) and the playground |
| `dist/families/tetra/tetra.css` | Models, faces and edges, letter discs, arrows, stickers, chips, the shelf, the sort's big board and stacked small models; every rule scoped under `[data-mechanic-wire="tetra"]` |
| `dist/families/tetra/tetra.json` | The pack: a playground, 12 puzzles, 1 family and 4 sources |
| `scripts/build-tetra.mjs` | Authoring list. It checks every answer against the table above (can match, the fewest taps, every merge, every set-up, the classes) and writes `tetra.json` |
| `scripts/validate-tetra.mjs` | The solid rebuilt from a cube; the turns by Rodrigues' formula; the group (12 matrices of determinant +1, exactly the even permutations); matching by parity for all 65,536 pairs of labellings, with the classes of every set of letters; the certificate theorem on every traced pair of twins; the share of random traces accepted. It also checks every puzzle's answers, witnesses as moves, every set-up and change, wrong claims and their locks through Undo and turns, Found already, There is another and the sort's refusal, and that Undo changes the screen. Hint chains run from fresh, after 25 random plays per puzzle and after every refusal. It covers illegal moves, forged saves, the playground and hint CPU time. `npm run build` runs it |
| `tests/tetra.test.mjs` | Turns and rotations (no reflection), the two classes and the A, A, B, C class, turning to match, Can't's form refusals and right claim, a wrong claim kept through Undo, tracing, one change, set-ups, every pair, sorting with no class count, the playground, hints (never a claim first, the reason before Can't, CPU time), forged saves, rendering, the registry line, the symbol, scoped styles and the focus selector |
| `scripts/tetra-browser-smoke.mjs` | The interface in a browser. It checks turning by taps (one with the animation on, one at a disc's edge), Enter and Undo; Can't's tracing with both form refusals, a right claim and a wrong claim kept through Undo; chips, set-ups and blank corners; every pair with Found already, There is another and its lock through Undo; a sort with a refused That's all; and every other puzzle solved through the interface by its hints. It also checks the playground's Letters, focus after moves, no overflow, compact boards and tap sizes. `TEST_PHONE=1` runs it on a 375 × 667 phone with touch; `SHOTS_DIR` moves its screenshots |

To change a puzzle, edit `scripts/build-tetra.mjs`. Then run `node scripts/build-tetra.mjs`, `node scripts/validate-tetra.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 37, "Mirror twins": the K–1, 2–3 and 4–5 student packets and the adult guide (`lowell-math-circle-year-2/week-37/` in the worksheets repository). They supply the printed models, the worked "turn around A", and the problems named in the table.
- The Week 37 [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-37.md) and its math check (`plans/review/week-37-math.md`, `checks/week-37/`). These cover the App fit, the Decision of October 10, 2026, fixes 3 and 8, the view-from-A certificate, every merge and the A, A, B, C class.
- Richard Evan Schwartz, *Symmetry Groups of Platonic Solids*, handout (Brown University, 2007), §3 "Rotations of the Tetrahedron", printed p. 3: the 12 rotations as the even permutations of the corners. The worksheet guide cites the same handout.
- OpenStax, *Organic Chemistry*, §5.1 "Enantiomers and the Tetrahedral Carbon": the chemistry analogy in the grown-up notes.

## Not yet done

- **Children's play.** No children have tried these puzzles yet. Three things to watch first:
  - **The flat view as a solid.** Do children read it that way and use all four corners? Watch whether they turn only round the middle and never bring an outer letter in (puzzles 2 and 5 need that), and whether the turn animation makes the letters' paths clear or is too quick at 460 ms.
  - **Can't's tracing.** Do children understand that they must trace the same two letters in the same order on both models, and do they see the opposite arrows as the reason? Or do they press Can't as a guess? A wrong claim locks Can't for those letters, and the pair must then be matched by turning. If guessing becomes the strategy, the claim may need to cost more.
  - **The sort.** Are the small models legible and the automatic stacking understood? Does That's all read as "nothing else can join"? Do children expect the mirror-looking A, A, B, C models of puzzle 12 to need separate stacks? On a phone the small models' letters are about 11 px.
- **Rehearsal.** The checks are digital only: rules, answers, hint chains and the interface in Chromium on a desktop and a 375 × 667 touch phone. Speed of the turn animation on slow phones, and whether a younger child can trace arrows without adult help, are untested.
- **Not built.** These are left out:
  - 4–5 Problem 5, the count of the 12 rotations of a bare frame;
  - the written explanations of 2–3 P4 and 4–5 P3–P4 ("explain why your conclusion covers every choice");
  - 2–3 Problem 3's "Which of the two does it match?" as a separate choice;
  - the worksheet's physical frames, with their hidden back corner and dashed edges;
  - the separate bonus packet (flat tiles, edge patterns, three-armed corners).

  By the card's rules there are also no "will these match?" quizzes, no free 3D dragging and no swap moves.
- **Sorting** stacks show at most four layers. That is enough here: the largest stack is three.
- **Story.** Not on the Lantern Road, and no keeper lines.
- **Grade levels.** Grade-free, and not yet in a K–1, 2–3 or 4–5 trail. The rough bands are in The mathematics above.
