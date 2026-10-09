# Shuffle machines

October 9, 2026. Twelve puzzles and a playground built from Week 3 of the Bellingham math circle (shuffle machines that loop), as a **Shuffle machines** group in Cup swaps. They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 3 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-03.md) says keep, App fit B, size M, as a group in Cup swaps: a swap is a natural editor for a machine. It asks for lettered cups on homes, a lower row showing where one turn sends each cup and arrows between, so that swapping two cups in the lower row swaps two arrowheads; a Run that moves every cup at once with a turn counter, colours each loop as it closes and stops when all are home; solves checked by running; find-every puzzles with That's all and a shelf of loop splits as the certificate; a Can't for moving exactly one cup; and arrows always shown, because undo goals depend on direction. It rules out asking "how many turns?" before a run, colouring loops while the child builds, scoring swaps and composing machines in the child's head, and asks for rare Hard targets.

## The mathematics

A **machine** on n cups is a permutation: one arrow out of every home and one into every home. One **turn** moves every cup along its arrow at once. There are n! machines (6, 24, 120, 720 and 5,040 for three to seven cups).

- **Loops.** Following the arrows from any home comes back to it, so the homes split into loops. A cup in a loop of length L is home after L, 2L, 3L, … turns and at no other time.
- **Turn counts.** All the cups are home together first after the least common multiple of the loop lengths, the machine's **turn count** (its order). So the turn counts n cups can make are the least common multiples of the ways to split n into loops: 1 to 4 for four cups, 1 to 6 for five or six, and 1 to 7, 10 and 12 for seven. A loop of 2 and one of 3 take 6 turns on five cups (20 of the 120 machines). Splitting can beat one big loop: on seven cups, 4 + 3 takes 12 (420 of the 5,040 machines), more than one loop of 7. The most for 1 to 10 cups is 1, 2, 3, 4, 6, 6, 12, 15, 20, 30 (Landau's function, OEIS A000793); it never drops but stalls from five cups to six.
- **No machine moves exactly one cup.** A turn puts exactly one cup on every home, so a cup that leaves its home lands on another, and the cup there has to move too. A machine moves no cups or at least two.
- **Undoing.** Reversing every arrow gives the one machine that puts every cup home after one turn of a machine. To undo A then B, undo B, then A (socks and shoes): the reverse of the combined machine.
- **Undoing itself.** Two turns put every cup home exactly when every loop has length 1 or 2. Such a machine moves every cup exactly when all its loops are swaps, so the cups pair up, which needs an even number of them: 3 machines on four cups, none on five.

Experiments come first. A child makes a machine by swapping cups in the lower row and checks it by running; the counter counts turns, and a loop takes its colour only once its cups are home, so the loops are seen, not announced (a screen reader hears the arrows, not the loops). No objective asks how many turns a machine will take before it runs. The catalogs after the find-every and Can't puzzles list every way the cups can loop, the certificate that nothing is missing. Least common multiples, Landau's function and socks and shoes are in the grown-up notes; no puzzle asks for a written proof. `scripts/validate-machines.mjs` checks every claim above with a separate simulation (a machine as the list of homes each cup goes to, run turn by turn until every cup is home, every machine tried).

## Where they appear

**Puzzles → Cup swaps → Shuffle machines** is a group inside Cup swaps on the family seam ([Adding a family](../ADDING-A-FAMILY.md)): `libraryFamily: "swap"`, `group: "Shuffle machines"`, mechanic `machine`. It sits below Cup swaps' three grade bands, and its playground is the **Playground** button above them (Cup swaps had none). The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Cups | Task | Answer | Week 3 source |
|---|---|---|---|---|---|
| 1 | Turn a machine | 5 | Turn a given machine until every cup is home | 6 turns: A and C home every 2, B, D, E every 3 | K–1 P1, P3 |
| 2 | Three turns | 4 | A machine that takes exactly 3 turns | A loop of three, one cup staying (8 machines) | K–1 P4 |
| 3 | Four turns | 4 | Exactly 4 turns | One loop of four (6 machines) | K–1 P4 |
| 4 | Just one cup | 4 | A machine that moves exactly one cup | Can't | K–1 P5 |
| 5 | Six turns on five cups | 5 | Exactly 6 turns | A swap and a loop of three (20 machines) | K–1 P8; 2–3 P3 |
| 6 | Undo a machine | 4 | After one turn of A, one turn of yours puts every cup home | A reversed: A to C, B to D, C to B, D to A | K–1 P6; 2–3 P4 |
| 7 | Every machine on three cups | 3 | Every machine | 6: 1 takes 1 turn, 3 take 2, 2 take 3 | K–1 P7 |
| 8 | Undo itself | 4 | Every machine that moves every cup and is home in 2 turns | 3 pairings | 2–3 P5 |
| 9 | Undo itself on five cups | 5 | The same on five cups | Can't: five cups can't pair up | 2–3 P5 |
| 10 | Every number of turns | 5 | Every turn count, a machine for each | 1, 2, 3, 4, 5 and 6 | 4–5 P3; 2–3 P3 |
| 11 | The slowest machine | 7 | The most turns | 12, from 4 + 3 | 2–3 P8; 4–5 P4, P9 |
| 12 | Undo two machines | 4 | After A then B, one turn of yours puts every cup home | A to C, C to D, D to A, B stays | 4–5 P7 |

Each puzzle's `provenance` quotes its problems. Puzzle 1's machine is K–1 Problem 3's five-slot machine, puzzle 6's is K–1 Problem 6's and puzzle 12's are 4–5 Problem 7's first pair. Puzzles 8 and 9 add "moves every cup" to 2–3 Problem 5's "undoes itself", so that four cups have a short list to find and five cups none.

## How a puzzle plays

- **The board.** The cups stand on their lettered homes in the top row, each in its colour and symbol as in Cup swaps; a home turns ochre while its own cup stands on it. Below, one arrow leaves the middle of each home and points at the middle of another, and the lower row shows where one turn sends the cups now on top, so each arrow joins a cup to itself and a turn brings the lower row up. At the start of a run it shows where the cups from home land; mid-run it shows the next turn.
- **Making a machine.** Tap two cups in the lower row, or drag one onto another, to swap where they land: their two arrowheads swap. Any new machine starts its run again, cups home and counter at 0, so after a swap mid-run the lower row shows the new machine from home. In puzzle 1 the machine is given and its lower row can't change.
- **Running.** **Turn** moves every cup along its arrow at once; the cups glide from their old homes to their new ones. The counter shows the turns since the cups were last all home. A loop's arrows take their own colour the first time its cups are all home (a loop of 2 after 2 turns, a loop of 3 after 3), and stay coloured for the rest of the run, as a record that the loop has closed. When every cup is home the counter reads "Every cup home after 6 turns" and Turn greys. **Cups home** (**Start again** at the end) puts every cup home and the counter at 0.
- **Make a machine** (puzzles 2–5 and 9). Every one of them ends "or press Can't if none can", so the wording doesn't give away which can't be done. Puzzles 2, 3 and 5 are solved when a run ends in exactly the asked number of turns. **Can't** is checked: right in puzzles 4 and 9, which then show every way four (or five) cups can loop, by how many cups move (nothing under 1, under the line "Every swap moves two arrowheads: a cup that leaves its home lands on another, and that cup has to move too.") or by turn count with the ones home in 2 turns or fewer marked (each has a loop of 1). Anywhere else it says "Keep looking." and greys until the machine changes.
- **Undo** (puzzles 6 and 12). Machine A (and B) are drawn small above the board; the board's arrows are yours, starting straight down. Turn reads "Turn A", then "Turn B", then "Turn your machine"; a fixed machine that has turned is ticked. So the child turns A, and the lower row then shows where their machine would send each cup: the machine is right when every cup there is under its own home, and its arrows are A's reversed. Hints turn A (and B) first. A last turn that leaves cups away says "Not every cup is home."; changing your machine then takes back your turn but not A's or B's.
- **Find every** (puzzles 7 and 8). **Keep** puts the machine on the shelf, drawn small with its arrows; in puzzle 8 only after a run has shown it moves every cup and is home in 2 turns, as its controls say. A kept machine tapped goes back on the board. **That's all** is the claim, as in the other case families: "There's another." if one is missing. After it the catalog shows every machine on three cups by turn count, or every machine on four cups home in 2 turns or fewer by how many cups move, the three pairings ringed.
- **Turn counts** (puzzles 10 and 11). Keep takes a machine whose run has ended, shown on the shelf with its turn count, one machine per count. **That's all** (puzzle 10) needs every count; **That's the most** (puzzle 11) needs the largest, otherwise "There's another." or "A slower machine exists.". After it the catalog shows every way the cups can loop as coloured bars, in columns by turn count: 7 ways for five cups, 15 for seven, with 4 + 3 ringed under 12.
- **Keyboard and screen readers.** Every lower-row cup is a button: Enter on one cup and then another swaps them, and focus stays on the cup. When the control used greys (Turn at the end of a run, Keep, Can't), focus moves to the next action. A screen reader hears each home ("Home B: cup D"), the machine's arrows in words ("arrows A to C, B to D, C to A, D to E and E to B"), the cups and the turn count after each move, and the notes. The loops are said only in the catalogs after a solve.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints swap toward the nearest machine that does what is missing ("Swap B and C in the lower row."), turn it until every cup is home, and keep it or claim; in puzzles 4 and 9 they explain the Can't. The third level offers Apply hint, and hints lead all the way to a solve.

## The playground

Three to seven cups, starting with five and every cup staying. Swap cups in the lower row, Turn, Cups home or Start again, **Mix** for a random machine and **Straight arrows** to make every cup stay. It has no goal and no Hint and never counts as solved; Undo works. A grown-up note suggests building a perfect shuffle of six cards (A stays, B to C, C to E, D to B, E to D, F stays: 4 turns), the review card's home for Week 3's perfect shuffles.

## Rules that keep the record honest

- Only legal moves are accepted: no swap in puzzle 1 or of a cup with itself, no Turn once every cup is home (or, in an undo puzzle, after your machine's turn), no Cups home before a turn, no Can't again until the machine changes, no Keep without a finished run where one is needed, of a machine already kept or of a second machine with the same turn count, no That's all with nothing kept or twice in a row, no loading a machine that isn't kept, and no moves after a solve.
- A save is rejected if its machine isn't a row of the right letters, puzzle 1's machine has changed, its turn counter passes the machine's turn count, a Can't is recorded as right where a machine works or as refused where none does, an undo stage is out of range, a kept machine is repeated, doesn't count or repeats a turn count, That's all was accepted with something missing, or the playground's cups are out of range.
- Undo takes back the last action, a refused Can't included.

## Files

| File | Contents |
|---|---|
| `dist/families/machines/machines.js` | Turns, loops, turn counts, undoing, splits; the `machine` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/machines/machines.css` | The two rows and the arrows, loop colours, the run controls, small machines, the fixed machines of an undo puzzle, split bars; imports `dist/cases.css` |
| `dist/families/machines/machines.json` | The pack: 12 puzzles, the playground, 1 family record and 3 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine, now with a seventh cup (G, ♥, lime) |
| `scripts/build-machines.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-machines.mjs` | A separate simulation; the theorems above, including OEIS A009490 and A000793 for 1 to 10 cups; each puzzle's answers; Can't right exactly when no machine works, Keep only after a run where one is needed; the drawn lower row one turn on from the top row at every hint step and walk step, and all home after an undo chain exactly for the answer; hints from every machine on four cups and a sample on five, before and during a run, from shelves and from random walks with Undo; illegal moves; forged saves; the playground; run by `npm run build` |
| `scripts/machines-browser-smoke.mjs` | Plays the group in a browser: the satchel; a run with gliding cups, loops coloured as they close and the lower row brought up by each turn; swaps by tap, drag and keyboard; a refused and a right Can't with its catalog; an undo with A's turn kept through an edit; That's all and That's the most too early, a kept machine tapped back, hints to a solve on seven cups; the playground |
| `tests/machines.test.mjs` | Turns, loops and undoing, moves, hints, rendering, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-machines.mjs`, then run `node scripts/build-machines.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read the lower row as "where the next turn sends the cups" or as a second set of cups, and whether a swap mid-run, which sends the cups home, surprises them; whether sorting the lower row in the undo puzzles hides the reversed arrows (the grown-up prompt asks to compare them with A's); whether they swap in the lower row and run, or swap at random until the counter shows the number (puzzle 5's target is common, 20 of 120); and whether seven cups fit a phone well enough to tap (each cup is about 40 pixels wide).
- **Exactly 2 turns.** K–1 Problem 4's 2-turn machine on four cups is not a puzzle: 9 of the 24 machines take 2 turns, so one swap finds it by chance. Puzzle 8 asks for the 2-turn machines that move every cup instead.
- **Same both ways.** 4–5 Problem 8 (two machines, each moving all four cups, with A then B the same as B then A) needs two editable machines on one board; it is left out.
- **Prediction.** 2–3 Problem 2 and 4–5 Problem 2 (colour the loops and predict, then run) stay on paper, as the card asks: the app colours loops only as they close.
- **Perfect shuffles.** 4–5 Problems 5 and 10 are not puzzles; the playground's grown-up note builds one.
- **Six cups.** 2–3 Problem 7 (every turn count on six cups) and the six-cup half of 4–5 Problem 4 are notes, not puzzles; puzzle 10 asks the same on five.
- **Story.** Shuffle machines is not on the Lantern Road and has no keeper lines.
