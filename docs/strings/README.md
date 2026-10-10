# Circle strings

October 2026. Twelve puzzles and a playground built from Week 12 of the Bellingham math circle (Catalan bijections) and its return visit. They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 12 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-12.md) says port, and its Decision shaped this family: the child lays a string by tapping two dots on a circle and the app refuses a crossing, which paper cannot. Around that one move are four kinds of puzzle: finish a pairing or show where it is trapped, collect every pairing and say when you have them all, build the pairing or tree that matches a given path or tree, and the return visit's fewest swaps between two paths. Pure "is this code legal?" questions are left out, as the card asks.

## The mathematics

Dots sit round a circle, numbered 1 to n clockwise from the top. A **string** joins two dots across the inside of the circle; each dot takes at most one string, and two strings may not cross. Strings a–b and c–d (a < b, c < d) cross exactly when a < c < b < d or c < a < d < b. A **pairing** uses every dot once.

- **Regions and Can't.** Strings that don't cross cut the disc into regions, each touching the circle. A new string can only join two free dots of one region, and the free dots of a region lie in order round its edge. So a set of strings can be finished exactly when every region has an even number of free dots: one way, pair each region's free dots in order; the other, strings stay in their region and take two dots each. An odd number of dots in all is the case with no strings (puzzle 3, K–1 Problem 5). A fixed string a–b can be finished exactly when it leaves an even number of dots on each side (puzzles 2 and 5, K–1 Problem 3). A region of the dark strings with an odd number of free dots is the **certificate** for Can't: whatever the child's strings do inside it, some part of it keeps an odd number.
- **Neighbours.** Every pairing joins two neighbours round the circle. Take an innermost string, one with no other string on one side: any dot on that side would need a string there too, so there is none, and the string's ends are neighbours (puzzle 7, K–1 Problem 6). It needs the no-crossing rule: on eight dots, 31 pairings with crossings join no neighbours.
- **Paths.** Reading the dots in order, write U (a step up) at the first end of each string and D (a step down) at the other. The path never dips below its start and ends where it began. The no-crossing rule forces the way back: each D closes the newest string still open. So each such path comes from exactly one pairing (puzzle 4, grades 2–3 Problem 3).
- **Trees.** The strings nest into an ordered tree: a string's children are the strings just inside it, left to right, and the root's are the strings inside no other. Walking round the tree (U away from the root, D back, each child's branch in turn) gives the same path, and the walk can be undone, since each U adds a new child on the right of where the walk is and each D goes back up (puzzles 8 and 11, grades 4–5 Problems 2–3). Pairings of 2n dots, these paths with n U's and these trees with n edges are all counted by the Catalan numbers 1, 1, 2, 5, 14, 42, 132. Sorting pairings by dot 1's partner gives 5 = 2 + 1 + 2 and 14 = 5 + 2 + 2 + 5 (puzzles 1 and 10).
- **Swaps.** Swapping a neighbouring D U to U D raises the path by two at one corner and nowhere else; U D to D U lowers it (allowed while the path stays off the floor). Each swap changes the number of D-before-U pairs (for each D, the U's after it) by exactly one, and the mountain U…U D…D has none. So the fewest swaps to the mountain is that count, 3 + 2 + 1 + 0 = 6 from U D U D U D U D (puzzle 9, return visit Problem 4). To any other path the count is not enough (the return visit's guide says so); the fewest swaps is half the summed height gap, the number of diamonds between the two paths (puzzle 12). Each swap fills or empties one diamond.

`scripts/validate-strings.mjs` checks these statements by methods unlike the mechanic's: all perfect matchings of up to 12 dots by brute force with an interleaving test (Catalan counts; one path per pairing; the paths are exactly those that stay off the floor; the tree's walk is the path; every pairing joins neighbours; 31 crossing ones on eight dots don't); every partial pairing of 8 and 10 dots against brute-force completion (871 sets) and the even-region test; the trap test at every gap for 91,920 taps by a separation test (a string separates two points when exactly one lies strictly between its ends); and swap distances by breadth-first search for every pair of paths of up to ten steps.

## Where they appear

**Puzzles → Circle strings** (symbol ⌒) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Level | Kind | Start | Answer | Witness | Week 12 source |
|---|---|---|---|---|---|---|---|
| 1 | Six dots | Easy | Every | 6 dots | 5 pairings | lay each; That's all | K–1 P1–P2, 2–3 P1 |
| 2 | One string down | Easy | Finish | 8 dots, 1–4 dark | 2 ways (either solves) | 2–3, 5–6, 7–8 | K–1 P3, the 1–4 start |
| 3 | Seven dots | Easy | Finish | 7 dots | Can't | lay 2–3; Can't; tap the part with dot 1 | K–1 P5, seven dots |
| 4 | Strings from a path | Easy | Path to strings | U U D U D D | 1–6, 2–3, 4–5 | lay them | 2–3 P3, first path |
| 5 | Straight across | Medium | Finish | 8 dots, 1–5 dark | Can't (2, 3, 4 and 6, 7, 8) | lay 2–3; Can't; tap the part with dot 4 | K–1 P3, the 1–5 start |
| 6 | Every way to finish | Medium | Every | 10 dots, 1–6 dark | 4 ways | lay each; That's all | New, after K–1 P3 |
| 7 | No neighbours | Medium | Neighbours | 10 dots | Can't | lay 1–3; Can't; tap 1–3 | K–1 P6, on ten dots |
| 8 | Grow a tree | Medium | Path to tree | U U D U D U D D | root, one child, three grandchildren | grow 0, 1, 1, 1 | 4–5 P3, third code |
| 9 | Fewest swaps | Medium | Swaps | U D U D U D U D to the mountain | 6 swaps | corners 2, 4, 3, 6, 5, 4 | Return visit P4, first start |
| 10 | Eight dots | Hard | Every | 8 dots | 14 pairings | lay each; That's all | K–1 P4, 2–3 P6 |
| 11 | Strings for a tree | Hard | Tree to strings | the five-edge tree | 1–6, 2–3, 4–5, 7–10, 8–9 | lay them | 4–5 p. 1 example tree |
| 12 | Move the mountain | Hard | Swaps | U U U D D D U D U D to U D U D U U U D D D | 6 swaps | corners 3, 2, 4, 6, 8, 7 | New, after return visit P4 |

Each puzzle's `provenance` names its problems, and its `solution` holds the witness. The worksheets are in [math-circle-worksheets, week 12](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-12); they use strings on large circles, pencil on small ones, and rows of dots for grades 2–3. Puzzle 6, the ten-dot circle of puzzle 7 and the target of puzzle 12 are new.

Each puzzle has a first hint that leads to an attempt, then hints computed from the board that alone reach a solve:

| # | First hint (before any move) | Insight |
|---|---|---|
| 1 | Keep one string and change the others. Did a dot get a new partner? | Dot 1 joins 2, 4 or 6; 2 + 1 + 2. |
| 2 | Which dots can still reach each other without crossing the dark string? | Each side pairs on its own. |
| 3 | Join two dots, then two more. How many are left each time? | Each string takes two: 7, 5, 3, 1. |
| 4 | Steps 1 and 2 go up, so dots 1 and 2 each start a string. Which string does step 3 end? | Each D closes the newest open string. |
| 5 | Count the dots on each side of the dark string. | Three on a side can't pair. |
| 6 | Finish one side in a new way and keep the other. | Two inside times two outside. |
| 7 | Lay a string, then look at the dots on its smaller side. | An innermost string traps its side. |
| 8 | The first step goes up: the root needs a child. | Each U adds a child on the right; each D goes back. |
| 9 | Which corners make the path higher? Which make it lower? | Each swap changes the D-before-U count by one. |
| 10 | Choose a partner for dot 1 and find every pairing with it before moving on. | 5 + 2 + 2 + 5. |
| 11 | The root has two children, so two strings are inside no other string. | A string's children are the strings just inside it. |
| 12 | Where is the path above the dashed one, and where below? | Fewest swaps = diamonds between the paths. |

## How a puzzle plays

- **The circle.** Dots sit on a paper circle with their numbers outside. Tap a dot to pick it (a green ring), then another to join them; tap the picked dot again to put it down. A tap goes to the nearest dot, so a tap between two close dots reaches the nearer. Dark strings are fixed; the child's strings are yellow with an ink edge, and a tap on a dot with the child's string takes that string off. A string that would cross another is not laid: it is drawn dashed in brick red, with the strings it would cross haloed, until the next tap. In puzzle 7 a string joining neighbours is shown the same way, with "Those two are neighbours."
- **Finish and Can't.** Puzzles 2, 3 and 5 are solved by finishing the pairing, or by Can't. Can't is offered only once the child has laid a string. Pressing it turns each part of the circle into a button, all drawn alike, and sends keyboard focus to the circle itself (Tab then reaches the parts), so neither a mark nor the focus points at the trapped part. Tap the part where the free dots can't all get partners; a tap that misses every part lets go of Can't. The claim is one tap, judged at once. A right claim solves the puzzle: the app shades the part of the circle the dark strings make (the whole circle when there are none) and rings its dots. A wrong claim gets one short refusal: "There is a way." in puzzle 2, which can be finished, so the refusal says nothing about which part was tapped; "Nothing is trapped there." for a part with an even number of free dots; or "Your own strings trap it." for a part that is odd only because of the child's strings. Can't is then off until the strings change. The refusal is in the save and Undo keeps it while the strings are the same, so pressing Can't again and again is not a free yes-or-no answer.
- **Every.** Puzzles 1, 6 and 10: each finished pairing goes on a shelf of small circles below the board, once; making one already there pops it on the shelf with "Found already." **That's all** solves the puzzle when every pairing is on the shelf, and otherwise says "There is another." (kept in the save) and stays off until a new pairing is found. No count is shown, there is no slot per answer, and Undo keeps the shelf and "There is another."
- **Neighbours.** Puzzle 7: strings joining neighbours are refused. Can't is offered once the child has laid a string; pressing it turns the child's strings into buttons, unmarked, with focus on the circle (a tap goes to the nearest string; a tap far from every string lets go of Can't). The claim is kept for a string with no string on one side and, there, an odd number of dots or exactly two: the app shades that side, rings its dots and, for two, draws their forced neighbour string dashed. Otherwise "A string can still go beside it." (four or more free dots there, an even number) or "It has strings on both sides.", with the same lock and Undo rule as Can't.
- **Path to strings.** Puzzle 4: the path is drawn beside the circle with its steps numbered. As strings go down, each step whose dot is strung turns dark green if that dot goes the right way, or dashed brick red if it goes the other way.
- **Path to tree.** Puzzle 8: tap a dot of the tree to give it a new child on the right; tap an edge to take it away with everything below it. A tap close to a dot goes to that dot, and otherwise to the nearest edge, so the middle of a short edge is not lost to the dots at its ends. The tree's walk is drawn in yellow over the path. The tree can grow two edges past the path's size; then it says "The tree is as big as it can be."
- **Tree to strings.** Puzzle 11: the goal tree and the tree of the child's strings stand side by side with ≠ or =.
- **Swaps.** Puzzles 9 and 12: the path is drawn with the target dashed. Each corner that can be swapped carries a ring (a low corner always; a peak only above height 1). Tap it to swap the two steps there; tapping the corner just swapped takes that swap back. A bead appears for each swap. Reaching the target with more than the fewest swaps is not a solve and says "Fewer swaps can do it."; Undo or the hints take swaps back. After the solve the board shows the diamonds between the start and the target, each numbered by the swap that filled it, and in puzzle 9 the start's steps with each D tagged by the U's after it, 3 + 2 + 1 + 0 = 6.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name one move in words, marked on the board at the second level: "Join 2 and 3.", "Take off the string from 1 to 4.", "Give the dot at the top of step 1 a child.", "Take away the edge walked up at step 3.", "Swap steps 4 and 5." or "Swap steps 2 and 3 back.". A claim is never named in words, because after a move the level-1 hint shows the same text: in a Can't puzzle the hints first make an attempt, then give only the reason, "There are seven dots, and each string takes two.", "Dots 2, 3 and 4 can only join each other, and each string takes two." or "Dot 2 is alone on one side of the string from 1 to 3."; level 2 then rings the Can't button, and once it is pressed, marks the part (with a dot of it) or the string. Before That's all the hint says "Every pairing is on the shelf." and level 2 rings the button. No hint text says "Press Can't" or "Press That's all", and no first hint mentions Can't. The third level offers Apply hint, and hints alone finish every puzzle from every board the validator tries: fresh, after wrong strings, swaps and children, after refused claims and a wrong That's all, every partial attempt in puzzle 7, and 25 random plays per puzzle. Hints are remembered per board; the validator requires each under 100 ms, and the slowest measured is under 20 ms on an idle machine (about 50 ms during a full build).

### Who supplies each certificate

- **Can't (finish):** the child taps the trapped part; the app confirms, shades it and rings its dots. Nothing marks or focuses the trapped part before the tap (only a level-2 hint does), a wrong tap is refused rather than ignored, and a tap on a part the child's own strings made odd is refused too, so the claim is about the dark strings, not the attempt. A refusal ends the claim until the strings change, so the parts can't be tried one by one.
- **Can't (neighbours):** the child taps the string whose side is stuck; strings are drawn alike, and a wrong string is refused with its reason. This is the key step of the innermost-string argument shown on the child's own try; the app's shading and dashed neighbour string make it visible. The claim that every try fails rests on "every try has an innermost string", which the parent notes explain; the app cannot check a claim about all tries by one tap.
- **That's all:** the child declares it; the app checks it against the count it knows and never shows the count. A wrong one is kept in the save and through Undo until a new pairing is found.
- **Fewest swaps:** drawn by the app after the solve. There is nothing single to point at: the lower bound is a sum over every D (or every corner), and the child's act is reaching the target in that many swaps. Reaching it in more is refused as a solve, so the app's drawing always follows a route that already meets the bound.

## The playground

Two to twelve dots (**−** and **+**; fewer dots drop strings past the last), strings laid and cut as in the puzzles, neighbours allowed, and **Clear**. Beside the circle stand the path of the strung dots and the tree of the strings, updating as strings go down. There is no goal, no Hint, and it never counts as solved.

## Rules that keep the record honest

- Only legal moves are accepted: strings between two free dots of the circle that cross nothing (and join no neighbours in puzzle 7), cuts only of the child's strings, Can't only in Can't puzzles, only after a string and once per change of the strings, That's all only in every puzzles and not twice without a new pairing, grow and prune only on nodes there (the tree at most two edges past the path's size), swaps only at corners that keep the path off the floor, at most 40 swaps, and nothing after a solve.
- The save is the child's strings with a kept or refused claim (finish, neighbours), the strings, the shelf, the last note and That's all (every), the strings (path or tree to strings), the parents of the tree's nodes (tree), or the corners swapped in order (swaps). The picked dot, a refused try and Can't being pressed are view state. A save is rejected if it has crossing strings, a string on a dark dot or joining neighbours where that is refused, a kept claim that isn't trapped or stuck, a refusal of one that is, a claim with no strings, a shelf pairing that isn't one or appears twice, a finished pairing not on the shelf, That's all before every pairing, "There is another" when none is, a node hanging from a later one, a tree past its size, a swap that leaves the floor or repeats the last corner, or any unknown field.

## Files

| File | Contents |
|---|---|
| `dist/families/strings/strings.js` | Pairings, regions and the trap test, completions, neighbours and stuck sides, paths and the stack rule, trees and walks, swaps and their distance, the `strings` mechanic (moves, hints, rendering and taps) and the playground |
| `dist/families/strings/strings.css` | Styles, using the shared board palette |
| `dist/families/strings/strings.json` | The pack: 12 puzzles, the playground, 1 family and 3 sources |
| `scripts/build-strings.mjs` | Authoring list; computes each answer and witness and writes the pack |
| `scripts/validate-strings.mjs` | Brute-force matchings, separation-test regions, searched paths, trees and swap distances; the theorems; every Can't tap on every attempt of up to three strings (finish) or four (neighbours); witnesses; hints alone from fresh, after wrong strings, refused claims, a wrong That's all, one short of all, a wasted swap, the long way round and 25 random plays per puzzle, with their texts checked against what they name; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/strings.test.mjs` | Pairings, regions, laying and cutting, Can't and its lock, every and That's all, neighbours, paths, trees, swaps, taps at close points, hints, the playground, saves and rendering |
| `scripts/strings-browser-smoke.mjs` | The real interface on desktop and, with `TEST_PHONE=1`, a 375-pixel phone with touch |

To change a puzzle, edit `scripts/build-strings.mjs`, then run `node scripts/build-strings.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 12: Catalan bijections, the K–1, grades 2–3 and grades 4–5 packets, the return visit and the adult guides, and the [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-12.md) with its math check. The card's fix 1 is used: the guide's K–1 Problem 4 hint, "compare only the partners at a single numbered dot", is false (12|34|56|78 and 12|38|45|67 agree at dot 1), so no hint here compares one dot; puzzle 10's second hint says two pairings are the same only if every dot has the same partner.
- Richard P. Stanley, *Catalan Numbers*, Cambridge University Press (2015), [doi:10.1017/CBO9781139871495](https://doi.org/10.1017/CBO9781139871495), Chapter 2: noncrossing matchings, Dyck paths and plane trees.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children read the dashed brick string and haloed blockers as "that would cross", or tap again and again at a refused string; whether pressing Can't and then tapping a *part of the circle* (rather than a dot) is found without help, and whether a child who claims Can't in puzzle 7 after one string believes it holds for every try; and whether the shelf in puzzles 1 and 10 is used to organise the search (by dot 1's partner, say) or only as a record, with That's all pressed as a guess.
- **Many taps.** Puzzle 10 takes 14 pairings of four strings each; changing a pairing means taking strings off one by one. If that drags, a "keep these strings, take off the rest" gesture could help.
- **The two remaining conversions.** The card also suggests tapping out the path of a given pairing or tree. Here a child builds strings for a path or a tree, and a tree for a path; a step-by-step path builder is not made.
- **A demo.** The plan gives each family a few-second demo of its move; a demo here would lay two strings, show a refused crossing, then press Can't and tap a trapped part.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail. K–1 can start with puzzles 1–3 and 5; paths, trees and swaps need reading U and D.
- **Paper only.** Counting trees with four, five and six edges and stating a counting rule (grades 4–5 Problems 5–6), and the return visit's other investigations (label compatibility and a height ceiling), stay on paper.
