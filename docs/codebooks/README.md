# Signal Lanterns codebooks

October 5, 2026. Twelve puzzles built from Week 18 of the Bellingham math circle (hidden changes: error-correcting codebooks), added to Signal Lanterns as its **Codebooks** group. They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet; the Week 18 worksheets have not been piloted either. The theme's review card is `plans/review/week-18.md` in the worksheets repository; it confirms this group (App fit A) and its pitfalls, which the design follows: no decoding tasks, no live overlap shading, the receiver's catalogue shown only after a check, and the unchanged row always counted.

## The mathematics

A **key** gives each picture its own row of lit and dark lanterns, all the same length n. A **changer** may turn over at most t lanterns without saying which (or whether). The receiver sees only the result and knows the key.

- **The receiver can always recover the picture exactly when every two rows differ in at least 2t + 1 places.** If two rows differ in 2t places or fewer, the changer can meet in the middle: turn over up to t lanterns of one row and the rest of the other, and both become the same row. If they differ in more, a row within t changes of both would put them within 2t of each other. For one change this is 3 places; for two changes, 5.
- **The packing bound.** With one change, each row of n lanterns can become n + 1 rows (itself and one change at each place), and these sets must not overlap. So M pictures need M(n + 1) ≤ 2ⁿ. Two pictures need 3 lanterns; four pictures cannot fit in 4 (20 > 16) but fit in 5.
- **The bound is not enough.** Three pictures do not fit in 4 lanterns although 3 × 5 = 15 ≤ 16: at each lantern, three rows are all alike or two against one, so the three pairwise differences add up to at most 2 × 4 = 8, but three pairs at 3 or more need 9.
- **Parity.** Rows with the same number of lit lanterns differ in an even number of places.
- **Eight pictures fit in six lanterns** (a shortened Hamming code; A(6, 3) = 8). Going through the rows in counting order and keeping each one that differs from every kept row in 3 or more places finds them: 000000, 000111, 011001, 011110, 101010, 101101, 110011, 110100.

What is checked in the app: that a key the child checks has no two rows the changer can confuse; that a claim that no key exists is true; that a row the child sends as the changer really comes from two pictures; and that a list of partner rows is complete and correct. What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Signal Lanterns → Codebooks**, below Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone.

| # | Level | Puzzle | Kind | Answer | Week 18 source |
|---|---|---|---|---|---|
| 1 | Easy | Two pictures, three lanterns | Make a key | Opposite rows (8 keys) | K–1 P1, P4; 2–3 P3 |
| 2 | Easy | Be the changer | Changer, 4 keys | Fool 2, claim 2 | 2–3 P2; K–1 P2 |
| 3 | Easy | Fewest lanterns | Fewest, 1–4 | 3, and none with 2 | K–1 P3; 2–3 P3 |
| 4 | Medium | Three pictures, three lanterns | Can it be done? | No | K–1 P6 |
| 5 | Medium | Two lit in every row | Make a key | Opposites (6 keys) | 2–3 P4 |
| 6 | Medium | Every partner | Partners, 3 rounds | 5 rows each | K–1 P5 |
| 7 | Medium | Longer rows | Changer, 4 keys, two with three pictures | Claim, fool, fool, claim | 4–5 P1, P3 |
| 8 | Hard | Four pictures, five lanterns | Can it be done? | Yes | 2–3 P5; 4–5 P2 |
| 9 | Hard | Four pictures, four lanterns | Can it be done? | No (20 > 16) | 4–5 P5 |
| 10 | Hard | Three pictures, four lanterns | Can it be done? | No (pair sums) | 4–5 P6 |
| 11 | Hard | Two changes | Fewest, 3–6, up to two changes | 5, and none with 4 | 2–3 P6 |
| 12 | Hard | Eight pictures, six lanterns | Make a key | The greedy list, for example | New |

The worksheets are in [math-circle-worksheets, week 18](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-18). Every key in the changer puzzles is new; each puzzle's `provenance` names the problems it draws on. The worksheet's physical folder game (sender, changer and receiver at a table) stays on paper.

## How a puzzle plays

- **Lanterns are the controls.** Each picture (triangle, square, circle, star, …) has a row of lantern buttons; a tap lights a lantern or puts it out.
- **Make a key** (1, 5, 12): Check lets the changer try. If it can fool the key, the board shows its trick: the two pictures' rows with the lanterns it turns over ringed, and the one row the receiver sees either way. Below, a catalogue of every row of that length (up to 5 lanterns) shows which pictures could send it, with clashes in red. Nothing is shown before Check. A working key solves.
- **Can it be done?** (4, 8, 9, 10): the same board, plus a button to say no key works with this many lanterns. The claim is available only after checking at least one key at that length. A true claim solves; a false one is refused ("the changer cannot break every key"). Hints show the authored hints by level and never say which answer is right.
- **Fewest lanterns** (3, 11): a row of numbers chooses the length. The puzzle is solved by a working key at the fewest length together with a true claim one length below it. A working key at a longer length is recorded (a green bar under its number) but does not solve.
- **Be the changer** (2, 7): the key is shown; the child builds the row the receiver will see in a dashed box and sends it. The receiver answers with the one picture it could be, or the board shows the trick when two pictures fit. After one send the child may say the key can't be fooled; that claim is checked. Each key must be fooled or correctly claimed before Next key; dots above the key count progress.
- **Every partner** (6): the triangle's row is given. The child collects square rows (Add row, × to remove) and presses That's every one. There is one check per question: a miss marks the wrong rows and lists the missing ones, and Next brings a different triangle row. Partner rounds have no Undo.
- **Hints** in Make a key puzzles name the next lantern toward a working key that keeps as many of the child's rows as possible (outlined at the second level, applied at the third). In changer puzzles they point at the two closest rows, or suggest the claim for a safe key.

## Rules that keep the record honest

- A key counts as found only when the check finds no clash (and, in puzzle 5, every row has two lit lanterns). Saves store each found key, and loading re-checks it.
- A claim is accepted only when no key of that length exists (by exhaustive search) and the child has checked a key at that length.
- In changer puzzles a won key needs either a sent row that two pictures can produce or a true claim, and the save must agree.
- Partner rounds accept only rows of the right length, without repeats; the one check is final for that round.

## Files

| File | Contents |
|---|---|
| `dist/families/codebooks/codebooks.js` | Distances, the changer's trick, the key search, the `codebook` mechanic's three modes, hints and rendering |
| `dist/families/codebooks/codebooks.css` | Lantern rows, the trick, the catalogue grid, the length picker and the partner list |
| `dist/families/codebooks/codebooks.json` | The pack: 12 puzzles, the group's mathematics and 3 sources |
| `scripts/build-codebooks.mjs` | Authoring list; computes each answer by search and writes the pack |
| `scripts/validate-codebooks.mjs` | Recomputes every answer by plain enumeration (and the greedy list for eight pictures); checks that working keys solve, claims are accepted only when true, every possible sent row in every changer key, that hints alone finish every key and every changer round, the partner rounds, illegal moves and forged saves; run by `npm run build` |
| `tests/codebooks.test.mjs` | The trick, which keys exist, design and check, claims, fewest lanterns, the lit rule, playing the changer, partners, saves and the satchel group |

The module adds no satchel family; its puzzles set `libraryFamily: "code"` and `group: "Codebooks"`. To change a puzzle, edit `scripts/build-codebooks.mjs`, then run `node scripts/build-codebooks.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read the trick picture without help; whether they try keys at a length before claiming none works, or claim at once; and whether the catalogue helps the counting argument in puzzle 9 or is too dense on a phone.
- **Find every key.** The worksheets ask for every key in some problems (K–1 P4, 2–3 P4). Only partner rows (puzzle 6) are collected here.
- **Two changes as the changer.** A changer round with up to two changes would follow puzzle 11.
- **Story.** Codebooks are not on the Lantern Road.
