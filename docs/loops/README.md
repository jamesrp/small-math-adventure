# Loop worlds

October 23, 2026. Fifteen puzzles and a playground built from Week 100 of the Bellingham math circle (Distance in nested worlds): thirteen in Easy, Medium and Hard, then a flat group, **Number cards** (two). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children; the Week 100 packet is unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-100.md) (keep, October 23, 2026, with its fixes in W100-G35-v2) decides what is built. Its App fit reads: loops round cards with labels 2, 4, 8, the app refusing crossing loops and labels that do not grow outward; rebuild a clue set, each clue lighting when it holds; Can't by tapping three clues whose largest is unique, then every one-clue repair ended with That's all and no slot count; pin it down, choosing the fewest clues that force a hidden world, with a second world shown if one fits. Its pitfalls: no predict-a-distance or watch-a-ball rounds, no tap that reveals a distance in a rebuild, and no all-8 adversary. Each puzzle's `provenance` names its worksheet problem.

## The mathematics

Cards sit in loops. Two loops are inside one another or apart, never crossing; a loop holds two or more cards; numbers grow outward, so a loop inside another has a smaller number. Here the numbers are 2 and 4, and the frame round every card is 8. The **distance** of two cards is the number on the smallest loop round both.

- **The largest of three distances occurs at least twice** (the strong triangle inequality, d(x, z) ≤ max(d(x, y), d(y, z))). The loops for the two smaller distances both hold the shared card, so one holds the other, and the larger holds all three cards. So 2, 2, 4 and 2, 4, 8 can't be made, while 2, 4, 4, 4, 4, 4 and 2, 8, 8 can. Three clues on three cards whose largest number is there once are therefore a **certificate** that no loops fit a clue list.
- **Distances rebuild the loops.** At each number r, "distance at most r" is an equivalence on the cards (by the rule above), and its classes are the loops of number r. So a full table of distances fits exactly one structure, up to loops that change nothing (a 4 loop round exactly the cards of a 2 loop). With numbers 2, 4, 8 there are 358 structures on five cards, 2,471 on six and 167,894 on eight; a structure is a pair of partitions, the 2-classes inside the 4-classes.
- **A certificate does not say which clue is wrong.** The worksheet's ten clues with A–C changed to 2 contain one bad triangle (A–B, A–C, B–C = 2, 2, 4), and exactly three one-clue changes repair them: A–B to 4, A–C back to 4, or B–C to 2. A change outside the triangle leaves it bad.
- **Fewer clues can pin a world.** A clue of 2 says two cards share a 2 loop, and two such clues on a shared card force the third, since 2 is the smallest number. A clue of 4 or 8 forces nothing about the other pairs between those two parts: with A–C = 8 and C–E = 8, A–E could be 4. So the fewest clues that pin a world are, for each 2 loop, its parts minus one (a chain inside it), and for each 4 loop and the frame, one clue for every two of its parts (parts are the loops and single cards directly inside). With no loops on six cards that is all 15, the worksheet's adversary bound.
- **A number world.** Cards 0–7 with distance 8 for different parity, 4 for the same parity and different remainders after dividing by 4, and 2 for the same remainder: the loops are {0, 4}, {1, 5}, {2, 6}, {3, 7} at 2 and the evens and odds at 4. This is 8 · 2^(−v), v the power of 2 in the difference: a scaled 2-adic distance. It pins with 4 + 2 + 1 = 7 clues.

What the app checks: that every clue lights (the loops make each distance), a claim of three clues by the rule above, every repair found before That's all, and that the chosen clues fit only the shown world. Why stays with grown-ups, in the notes.

What a child is meant to discover, by playing: that the distance is read from the smallest loop; that some triples of clues can't be made, and which three clues show it; that a full clue list leaves no choice of loops; that one bad triangle can be fixed in several ways; and that two small clues force a third while two large ones don't. The experiments are making each clue list; the conjectures are which triples are possible and which clues are needed; the explanations (shared cards force nesting; classes at each number) are for the notes and conversation.

## Where they appear

**Puzzles → Loop worlds** (⦾): the playground, then the thirteen puzzles in Easy, Medium and Hard, then **Number cards**. All are grade-free (`band: "all"`). Not on the Lantern Road.

| # | Level | Puzzle | Cards | Solve | Answer | Week 100 source |
|---|---|---|---|---|---|---|
| 1 | Easy | 2, 8 and 8 | A–C | Make every clue light, or Can't | 2 round A, B | P2 |
| 2 | Easy | 2, 4 and 4 | A–C | Make every clue light, or Can't | 2 round A, B in 4 round all | P2 |
| 3 | Easy | 2, 2 and 4 | A–C | Make every clue light, or Can't | Can't: all three clues | P2 |
| 4 | Easy | 4, 4 and 4 | A–C | Make every clue light, or Can't | 4 round all three | P2 |
| 5 | Easy | 2, 4 and 8 | A–C | Make every clue light, or Can't | Can't: all three clues | P2 |
| 6 | Medium | Two pairs | A–D | Six clues: make, or Can't | 2 round A, B and C, D in 4 round all | new, after P1 and P4 |
| 7 | Medium | A chain of twos | A–D | Six clues: make, or Can't | Can't: A–B, A–C, B–C | new, P5's certificate among other clues |
| 8 | Medium | Ten clues | A–E | Ten clues: make, or Can't | 2 round A, B in 4 with C; 2 round D, E | P4 |
| 9 | Medium | Ten clues, one changed | A–E | Ten clues: make, or Can't | Can't: A–B, A–C, B–C | P5, first question |
| 10 | Hard | Every repair | A–E | Every one-clue change, then That's all | A–B to 4, A–C to 4, B–C to 2 | P5 |
| 11 | Hard | Pin the ten-clue world | A–E | 4 clues that fit only the shown world | A–B, D–E, a 4 to C, an 8 across | P10 on P4's world |
| 12 | Hard | Three pairs | A–F | 6 clues | each pair, and an 8 between every two pairs | P10 |
| 13 | Hard | Two triples | A–F | 5 clues | a chain in each triple, one 4 across | new, for P10 |
| Number cards 1 | Hard | Number cards from seven clues | 0–7 | Seven clues: make | four 2 loops, evens and odds at 4 | P8, P9 |
| Number cards 2 | Hard | Pin the number world | 0–7 | 7 clues | one per 2 loop, per 4 loop and the frame | P10's game on P8's world |

The **playground** has six cards and no clues: make any loops, and choose two cards to see their distance. It covers P1 (build a world and read its distances) and P10's secret-world game played with a partner off the screen.

Not built: P3 and P7 (balls, and that they never partly overlap), which the card's pitfall rules out as watch-a-ball rounds; P6's general proof, which is in the notes; P1's rearranging, which the playground allows; the 2, 2, 2 triple of P2, which adds nothing to 4, 4, 4 in the app.

## How a puzzle plays

- **The board.** Cards are paper squares with a shape and a letter (A circle, B triangle, C square, D star, E pentagon, F hexagon) or a number, in a row inside the frame, which wears an 8 tag. A loop is a rounded box round its cards with its number in a tag on the top edge, 2 in sun and 4 in leaf; boxes nest. For Three pairs (puzzle 12) and the number cards the frame's parts wrap into rows, and on a phone the world uses most of the panel's side padding, so a row of six cards (Two triples, the playground) stays near 40 px a card.
- **Making a loop.** A tap on a card chooses it (ringed in pine; again to let it go). With two or more chosen, the 2 and 4 buttons wake; a tap puts a loop of that number round the chosen cards. A loop that would cross another, a number that would not grow outward, or a loop already there is refused with a line ("Loops can't cross.", "Numbers grow outward.", "That loop is there.") and the loop in the way ringed in ochre; nothing changes. A tap on a loop's tag takes the loop away.
- **Clues** sit above the board as two small cards (34 px, so the letters read on a phone) and a number, and light in pine when the smallest loop round the two cards has that number. With no loops every clue of 8 already lights.
- **Can't** (every make puzzle) is a toggle: the clues become buttons, and the third tap claims them. Three clues not on three cards say "Tap three clues on three cards." and clear. A claim whose largest number is there once is the solve. Otherwise the line says "Loops can make these." with a small world for the three, and Can't stays shut until a loop changes. Undo takes back loops, not the claim: the refusal stays while the loops are those it was made on.
- **A repair** (10). A tap on a clue changes its number to the next (2, 4, 8, round to the printed number); only one clue is changed at a time, drawn dashed in ochre. When every clue lights with the change, it goes onto the shelf below the clues. Changing a clue again starts the next search, with the loops kept. **That's all** wakes with one change found: with every change found it is the solve; otherwise the line says "There is another." and That's all stays shut until a new change is found. Undo keeps the changes found and the line.
- **A pin** (11–13, Number cards 2). The world is drawn and its loops cannot be changed. A tap on a card and then another adds the clue for those two, with its distance read from the world; a tap on a clue, or on the same two cards, takes it away. Pips show the clues allowed. When the pips are full and another world fits the clues, the line says "This world fits too." and draws it small below; the solve is full pips that fit only the shown world. Two cards for a new clue with the pips full say "Take a clue away first."
- **Hints.** The first press shows the puzzle's first authored hint before any move; after a move, and from the second press, the next step in words ("Put a 2 loop round A and B.", "Take away the 4 loop round A, B and D.", "Press Can't, then tap A–B, A–C and B–C.", "Change A–B to 4.", "Take away the clue B–C.", "Add the clue A–D."), with the cards, number, clue or button ringed; Apply hint on the third press. Every state has a next step (a wrong loop is taken away, a refused claim unwound), so no hint is a dead end. The playground has no Hint.

## Certificates and claims

- **Can't** is judged on the three clues alone: they must be on three different cards with the largest number once. Every such triple is a certificate (no world on three cards fits it), and every other triple on three cards has a world, which the refusal draws. The validator checks all 27 number triples against the model, and every claim in every make puzzle.
- **That's all** is accepted only when every one-clue change that some world fits has been made to light. The repairs are computed by trying all 20 changes and rebuilding each full clue list.
- **The pins.** The budget is the fewest clues: the validator checks, over every world on the puzzle's cards, that no set of one fewer clues pins the world (381,228 sets in all, 376,740 of them on the number cards) and that the hints' set does. The second world drawn when a set does not pin agrees on every chosen clue and differs on another pair (checked on every full set on five and six cards, every pinning set and 3,000 others on eight).
- **Uniqueness.** Each consistent make puzzle fits exactly one world among all worlds on its cards, the stated one; each Can't puzzle fits none. The seven number clues fit one world among 167,894.

## Rules that keep the record honest

- Saves hold only the child's moves: the loops in the order made, a claim of three clue indices, the clue changed and the changes found (with the That's all line), or the pairs asked. Distances, lit clues, refusals, second worlds and every line are recomputed. A save is valid only if each loop was legal beside the earlier ones (cards of the puzzle in order, two or more, no crossing, numbers growing outward), a claim is on three cards, every change found is a real repair and That's all matches the count, and pins stay within the pips without repeats. Forged and illegal saves are rejected in tests and the validator.

## Files

| File | Contents |
|---|---|
| `dist/families/loops/world.js` | The core: distances, refusals, certificates, rebuilding a world from a table, nodes and parts, the fewest clues, the pin check and a second world, and the layout of nested loops |
| `dist/families/loops/loops.js` | The `loops` and `loopsnum` mechanics: saves, moves, hints, taps, drawing, and the module entry |
| `dist/families/loops/loops.css` | Cards, loops and tags, clue tiles, pips and lines, scoped under `.lp-puzzle` |
| `dist/families/loops/loops.json` | The pack: 16 puzzles, the family's mathematics and 5 sources |
| `scripts/build-loops.mjs` | The authoring list; asserts each world, certificate, repair set and budget, and the facts the notes state; plays each puzzle by hints; writes the pack |
| `scripts/validate-loops.mjs` | An independent model (pairs of partitions), every world on up to eight cards, uniqueness, certificates, repairs, That's all, fewest clues and the pin check, the app's loops and refusals against the model, hints alone from fresh and after random play, illegal moves and forged saves |
| `tests/loops.test.mjs` | Distances and refusals, making, Can't and its refusal through Undo, repairs, pins, the playground, hints, saves and rendering |
| `scripts/loops-browser-smoke.mjs` | Every kind of tap through the real interface, Undo, focus, the lines, the satchel, and fit at phone and desktop sizes |

To change a puzzle, edit `scripts/build-loops.mjs`, then run `node scripts/build-loops.mjs`, `node scripts/validate-loops.mjs` and `npm test`.

## Sources

Week 100 grades 3–5 packet and adult guide (W100-G35-v2, W100-FAC-v2), its problem files, the review card and math check (worksheets repository); Oleksiy Dovgoshey, "Finite ultrametric balls" (2018), §1; Stephen C. Johnson, "Hierarchical clustering schemes", Psychometrika 32 (1967); Fernando Q. Gouvêa, *p-adic Numbers* (1997), Chapter 2. Puzzles 1–5 are P2's triples; 8–10 are P4's ten clues and P5's repair; 11–13 and Number cards 2 are P10's game on fixed worlds; Number cards 1 uses P8's distances; 6, 7, 12 and 13 are new.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether children find the loop action (tap cards, then 2 or 4) and taking a loop away by its tag, and whether the refusal lines "Loops can't cross." and "Numbers grow outward." are understood or read as the app being stubborn.
  2. Whether children press Can't and choose the three clues on three cards in the six- and ten-clue lists, or tap at random, and whether "Loops can make these." with its small world helps them look again.
  3. Whether the pin puzzles' pips and the second world ("This world fits too.") read as a fair game, and whether children see which clue the other world exploits.
- **Dragging.** The card's app fit says drag loops round cards; the app chooses cards by tapping and then a number, which works for loops round cards that are not next to each other and on phones. Dragging, and moving cards within their loops (P1's rearranging), are not built.
- **Labels.** Loops are 2 or 4 and the frame is 8; a loop of 8 inside the frame would change no distance. The worksheet lets children choose their own labels on page 1; the app's numbers are fixed.
- **K–1.** The worksheet has no K–1 packet; the card's fix 3 route reads clues as close and far. The three-card puzzles need only comparing 2, 4 and 8, with a grown-up reading How to play once.
- **Not built:** balls (P3, P7), the general proof (P6), choosing the fewest clues as an open count (the pips fix it, and the validator proves one fewer fails), and the secret-world game against the app.
- **Story.** The family is not on the Lantern Road.
