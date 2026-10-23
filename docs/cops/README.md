# Cops and robbers

October 23, 2026. Sixteen puzzles and a playground built from Week 86 of the Bellingham math circle (Pursuit and escape): eleven chases, catches, escapes and road puzzles, then two flat groups, **Folds** (three) and **Two cops** (two). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children; the Week 86 packet is unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-86.md) (keep, October 23, 2026) and its second run decide what is built. Its App fit reads: the child taps C's moves on the graph board and the app plays a perfect R; catch R within a target (2 on P5, 3 on P7, from h on fix 4's tree); on rings, Can't, then play R against every cop move, certified when the positions close up; add the fewest roads, then catch; fold by tapping v, then u, an illegal fold showing the dot u misses; two cops on rings of 6 and 8. Its pitfalls: never accept a turn count as escape, R must play perfectly, no highlighted reach sets or safe dots, no predict-who-wins screens. Each puzzle's `provenance` names its worksheet problem and board.

## The mathematics

C and R stand on dots of a map of roads. C chooses a dot, then R chooses another; C moves first, and on a turn a piece stays or takes one road. C catches R by landing on R's dot. A map is **cop-win** when C catches R from some start whatever R does, and **robber-win** otherwise. Maps here are connected and small (at most eight dots).

- **Trees are cop-win.** C walks toward R along the only road to it. R can never get past C, and the part of the tree R can use shrinks by a dot every C move, so C catches R within as many moves as the farthest dot is from C's start. The best start is a centre: P5 from c in 2, P7 from d in 3, the fork from c in 2, and the bent branch from h in 5 (the card's fix 4 tree, whose start is fixed).
- **Bare rings of four or more dots are robber-win.** R starts on a dot C can't reach in one move and after each C move steps to such a dot again: across the square, or one of the two dots across on a pentagon. The triangle is not a ring for this purpose: every dot is next to every other.
- **Folds.** A dot v folds into a neighbour u when u reaches every dot v reaches (v itself and v's neighbours, by staying or taking one road). Removing v keeps the winner: R on the smaller map plays as if C on v stood on u, and C on the smaller map catches R's shadow. So a map is cop-win exactly when it folds down to one dot (Nowakowski and Winkler; Quilliot). Because a fold keeps the winner, every order of folds on a cop-win map ends at one dot, and on a robber-win map every order gets stuck with more than one dot left. The house folds its roof into a top corner and leaves a bare square; a pentagon with one road across folds the cut-off dot and leaves a square. Both are robber-win.
- **Adding roads.** One road across the square makes its two ends next to every dot: cop-win. No single road works on the pentagon (all five give one map turned, and the cut-off dot folds away to leave a square). Two roads work exactly when they share an end, which is then next to every dot; the five crossing pairs leave a square again.
- **Two cops always win on a ring.** One cop holds a dot, so the rest of the ring is a path R can't leave past it, and the other sweeps it. Closing in from both sides is faster: 3 turns on a ring of six from a common start, 4 on a ring of eight.

What the app checks: in a chase, a catch within the moves shown against a perfect R; in an escape or after Can't, that the child's R has answered every C move from every position its own answers reach; in a road puzzle, a catch on the map with the child's roads, or Can't after adding the roads and then a full escape; in a fold puzzle, a legal fold each time, down to one dot or a Can't with no fold left. Why stays with grown-ups, in the notes.

What a child is meant to discover, by playing: the middle of a path and the junction of a tree; walking toward R; the dot across from C on a ring, and staying there; that a roof or a road across can be a trap or a fix; that the dots of a fold are what a cop on v and a cop on u can reach; and on a ring, that one cop holding still turns it into a path. The experiments are the chases and escapes; the conjecture is which maps are cop-win; the explanations (the shrinking piece, the shadow, the blocker) are for the notes and conversation.

## Where they appear

**Puzzles → Cops and robbers** (◐): the playground, then the eleven puzzles in Easy, Medium and Hard, then **Folds** and **Two cops**. All are grade-free (`band: "all"`). Not on the Lantern Road.

| # | Level | Puzzle | Map | Solve | Answer | Week 86 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Path of five | P5 | Choose C's start, catch within 2 | start at c | shared P1 |
| 2 | Easy | Path of seven | P7 | Choose C's start, catch within 3 | start at d | shared P1 |
| 3 | Easy | The fork | T2 | Choose C's start, catch within 2 | start at c, the junction | shared P2 |
| 4 | Easy | Square | R4 | Put R down after C and keep it away forever | stay across from C | shared P3 |
| 5 | Medium | The bent branch | T1 (fix 4) | C starts at h, catch within 5 | walk toward R | shared P2, card fix 4 |
| 6 | Medium | Ring of five | R5 | Keep R away forever | stay two roads from C | shared P4 |
| 7 | Medium | Triangle with a tail | D1 | Catch within 2, or Can't | catch from d | upper P3 (guide's example) |
| 8 | Medium | The house | ring of four with a roof | Catch within 3, or Can't | Can't: the roof folds away | new, after upper P3 |
| 9 | Hard | Square and a new road | E4 | Add 1 road, catch within 2, or Can't | either diagonal | upper P2 |
| 10 | Hard | Pentagon and a new road | E5 | Add 1 road, catch within 2, or Can't | Can't | upper P2 |
| 11 | Hard | Pentagon and two new roads | E5 | Add 2 roads, catch within 2 | two roads from one dot | upper P2 |
| Folds 1 | Easy | Triangle with two tails | F1 | Fold to one dot, or Can't | folds down | upper P4 |
| Folds 2 | Medium | Pentagon with a road across | F2 | Fold to one dot, or Can't | Can't at the square | upper P4 |
| Folds 3 | Hard | Hexagon with a triangle | ring of six with a triangle | Fold to one dot, or Can't | folds down | new |
| Two cops 1 | Medium | Two cops on a ring of six | Q6 | Both cops from a, catch within 3 | close in from both sides | upper P5 |
| Two cops 2 | Hard | Two cops on a ring of eight | Q8 | Both cops from a, catch within 4 | close in from both sides | upper P6 |

The **playground** has a path, a tree, a ring of six, the house and the hexagon with a triangle, and a side to play (C or R) against the app; nothing is judged. It covers shared p. 1's "swap jobs" and upper P3's "challenge your partner".

Upper P3's map design (draw a map R wins on) is not a solve: the house and the triangle with a tail give its two answers to classify, and the playground lets a child try maps.

## How a puzzle plays

- **The board** is the shared graph board (`dist/graph-board.js`), letters off except in folds. C is sky, R rose, each in a token the size of a dot; the piece the child moves wears a pine ring. When both share a dot (a catch) they sit side by side. Each move leaves a short trail on the road taken, C's then R's, and the pieces glide along it (C first). A piece that stayed pulses once.
- **A chase.** Before C is down, a C token waits above the board and every dot is a button. Then the dots C can move to are shaded, including C's own dot (to stay); a tap moves C there, or a tap on a road from C's dot. R answers at once. Pips show the moves used. Undo takes back a move with R's answer, or takes C back up. After the last move without a catch, "Out of moves."
- **An escape.** C is down and an R token waits; a tap on any other dot puts R there. Then the dots R can move to are shaded (its own dot and its neighbours other than C's); a tap answers C's move. Shading shows legal moves only, never which are safe. When C has tried every move from a position, it goes back to an earlier position it has not finished, and the line says "C tries another move."; when it starts again from another dot, "C tries another start." The escape ends with "R gets away forever." A caught R says "C caught R."; Undo takes back the answer that lost.
- **Can't** (7, 8, 10) is pressed instead of catching. The child then plays R as in an escape, against every C move. On a cop-win map C catches R in the end, and Hint says "C can always catch R here. Restart and catch R." Undo takes back the answers; Restart clears Can't.
- **Roads** (9–11). A tap on a dot chooses it (ringed), a tap on another adds the road between them (pine, thicker), a tap on a new road or on its two ends takes it away. Pips show the roads added; past the number allowed, "No more new roads." **Play** starts the chase on the map with the new roads; **Roads** goes back and clears the chase. Can't is enabled only once the roads are added.
- **Folds.** Tap a dot v (ringed), then a neighbour u. If u reaches all v reaches, v and its roads fade out; otherwise the line names a dot u misses ("b can't reach f.") and rings it in ochre, and nothing changes. A second tap on v lets it go. **Can't** when a fold is left says "There is a fold." and stays off until the next fold (Undo keeps the refusal while the map is the same); with no fold left and more than one dot, it is the solve.
- **Two cops.** C1 and C2 both start on a; R starts as far as it can. Chips C1 and C2 choose a cop; a tap on a dot plans that cop's move there (shown as a dotted ghost on a dotted road), and the other cop is chosen next. **Go** makes both moves; a cop with no plan stays. Pips count turns.
- **Hints.** The first press shows the puzzle's first authored hint before any move; after a move, and from the second press, the next step in words ("Start C on the ringed dot.", "Move C one step down and left.", "Put R far from C.", "Fold e into d.", "Keep C1 where it is and move C2 one step right."), with the dot ringed; Apply hint on the third press. When R can now hold out longer than the moves left, or C can now always catch R, the hint says so quietly and offers Undo. The playground has no Hint.

## Certificates and claims

- **The perfect R** (catch, roads, playground). R's start and every answer come from an exhaustive game search (retrograde analysis of every C and R position, `game.js`): R maximises the number of C moves to a catch, then the distance from C, then prefers staying, then the first dot in map order. So a catch within the moves shown is a real strategy, and every move budget equals the optimum from the puzzle's best start (the validator checks this and that one fewer fails).
- **Escape is never a turn count.** The app's C tries, in order, every start (one from each class of dots alike under the map's symmetries) and from every position the child's answers reach, every C move, best first: a catch, then the move that would catch soonest against best play, then the one leaving R the fewest safe answers, then the nearest. A position already answered up to symmetry is not asked again. The escape is done when every start and every C move has been answered. The square and the ring of five take 3 answers (every dot alike, so one start); the house and the pentagon with a road take 10, over three starts, with one "C tries another move." The validator checks every saved answer list as a certificate by an independent search over all positions it reaches.
- **Can't on a road puzzle** is allowed only after adding the roads, and the escape is then played on the child's map. On the pentagon all five roads give one map turned, so escaping on the child's map shows no road works; on the square, Can't with a road across is always caught.
- **Folds.** Each fold is checked as it is made, and Can't is judged on the child's own map: since a fold keeps the winner, getting stuck with more than one dot means the map was robber-win, whatever the order.
- **Values.** The build asserts every budget, best start, road set and fold end, and the extension answers in the grown-ups' notes, by search. The validator re-solves every map with its own model (round-by-round), checks one cop and two cops, and checks on all 27,476 connected maps up to six dots that cop-win is exactly folding to one dot (on maps up to five dots, every order of folds).

## Rules that keep the record honest

- Saves hold only the child's moves: the start and C's moves, R's answers, the roads added, the folds, or the two cops' moves. R's start and answers, C's moves in an escape, and every line are recomputed from them, so a save is valid only if each move was legal when made (a road or a stay; R never onto C; a fold whose dot u reaches all v reaches). A chase stops at its budget; a fixed start must match; Can't needs a Can't puzzle and, on roads, the roads added; a fold refusal stands only while a fold is left. Forged and illegal saves are rejected in tests and the validator.

## Files

| File | Contents |
|---|---|
| `dist/families/cops/game.js` | The game core: graphs, distances, one-cop and two-cop solves, the perfect R and C, symmetries, folds and the escape exploration |
| `dist/families/cops/cops.js` | The `cops`, `copsfold` and `copstwo` mechanics: saves, moves, hints, drawing, taps and gliding, and the module entry |
| `dist/families/cops/cops.css` | Tokens, trails, pips, the tray, chips, map buttons and fold marks, scoped under `.cp-puzzle` |
| `dist/families/cops/cops.json` | The pack: 17 puzzles, the family's mathematics and 5 sources |
| `scripts/build-cops.mjs` | Maps and authoring list; asserts every value, start, road set, fold end, two-cop value and extension answer by search; writes the pack |
| `scripts/validate-cops.mjs` | An independent model and solver, every map's values and budgets, escape certificates over every position, hints alone from fresh and after mistakes, wrong Can't, forged saves and illegal folds, and all connected maps up to six dots |
| `tests/cops.test.mjs` | The game core, chases, escapes, Can't, roads, folds, two cops, the playground, hints, saves and rendering |
| `scripts/cops-browser-smoke.mjs` | Every kind of tap through the real interface, Undo and Restart, focus, the lines, the satchel, and fit at phone and desktop sizes |

To change a puzzle, edit `scripts/build-cops.mjs`, then run `node scripts/build-cops.mjs`, `node scripts/validate-cops.mjs` and `npm test`.

## Sources

Week 86 shared and upper packets, materials and adult guide, the review card, its second run and math check (worksheets repository); Richard Nowakowski and Peter Winkler, "Vertex-to-vertex pursuit in a graph" (1983); Martin Aigner and Michael Fromme, "A game of cops and robbers" (1984); Anthony Bonato and Richard Nowakowski, *The Game of Cops and Robbers on Graphs* (2011), Chapter 2. The maps of puzzles 1–7, 9–11, Folds 1–2 and Two cops follow the worksheet (the bent branch as the card's fix 4); the house and the hexagon with a triangle are new.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch first:
  1. Whether "C tries another move" makes sense, or reads as the app cheating; and whether escapes of 3 answers feel too short to be convincing and 10 too long.
  2. Whether children find staying (a tap on the piece's own dot), and in Two cops the plan-then-Go turn with the C1 and C2 chips.
  3. Whether children press Can't after trying a few starts, or before; and whether a wrong Can't played out to a catch teaches or discourages.
- **The shaded dots** show legal moves for the piece being moved. The card's pitfall forbids highlighting reach sets or safe dots; legal moves are a reach set of one dot, so whether the shading gives away folds should be watched. Folds never shade.
- **K–1.** The worksheet has no K–1 route. The chases need no reading but counting roads; a grown-up reads How to play once.
- **Not built:** fewest roads as an open count (the puzzles fix 1 or 2 and Can't certifies that 1 is too few on the pentagon); designing a map as a judged solve; three or more cops, and the cop number of other maps.
- **Story.** The family is not on the Lantern Road.
