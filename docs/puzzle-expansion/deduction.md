# Three additional families: Latin squares, code decoding, and Nim

These are **18 authored app adaptations**, six in each family. They adapt the mathematics of Weeks 5–8 while keeping a completed grid, a decoded signal, or a won Nim game as the required action. No proof-writing task is needed. The five-bit code probe set is borrowed explicitly from the Week 6 construction; the secrets and score histories here are new. Latin boards are new. Nim instances 03–05 deliberately reuse Week 8 starts in full games against optimal counterplay; this is adaptation of tested mathematics, not a claim to have invented those starts.

## What the source review changes

| Source week | Mathematical content reviewed | App choice |
| --- | --- | --- |
| Week 5 | All four student levels, facilitator guide, and redesign: Latin squares, visibility clues, uniqueness, minimal versus minimum clues, trades. | Use only the pure entry-clue Latin object. Exclude the separate skyscraper visibility rule. Replace proof of uniqueness with carefully chosen completion decisions. |
| Week 6 | All four student levels, facilitator guide, and redesign: exact-position binary feedback, baseline methods, decision trees, and resolving sets. | Decode a fixed transcript with one unique code. Keep repetition and the exact feedback convention explicit. No adaptive-query optimality proof. |
| Week 7 | All four student levels, facilitator guide, and redesign: backward induction, subtraction games, periodicity, and game sums. | Carry over the idea of a move that survives every reply. Do not import the changing 1/3/4 and 1/3/5 menus into the Nim sequence. |
| Week 8 | All four student levels, facilitator guide, and redesign: rook/two-pile equivalence, three-pile Nim, binary balance, Wythoff reserve. | Keep unrestricted one-pile removal throughout. Play a full game against optimal counterplay, with random legal replies from losing positions. Wythoff is a separate possible future family. |

## Verification and calibration

Run `python3 docs/puzzle-expansion/verify_deduction.py` from the app directory. It independently enumerates Latin completions and binary secrets, checks all Nim winning moves by backward recursion, and checks the claimed local-deduction stalls. It does not estimate child difficulty from solver running time.

The early instances teach each rule and should be skippable after mastery. The final Latin instances require reasoning beyond single-candidate placements; the last two code instances use the same board and test set but different inference structures; Nim changes from a visible mirror strategy to binary rebundling. These are hypotheses about useful difficulty, to be checked with children.

## Symbol Orchard: complete a Latin square

Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Mathematical object.** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Acceptance.** Accept every complete Latin square agreeing with the givens. These six particular instances are each verified unique. Never compare solely to the stored canonical board.

**MVP priority.** Medium: familiar interaction, unusually clean mathematical object; final two are deliberate challenge puzzles.

**Source lineage.**

- [week-05-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex), **Task 5, A tiny city** — Entry-level pure row/column object.
- [week-05-extra-grades-6-7.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex), **RuleBox; Tasks 1–3, Small swaps force a lower bound** — Entry-clue model and Latin trades; the app drops proof tasks.
- [week-05-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex), **Extra: a lower bound with an escape move; Where the mathematics goes** — Entry-clue determining sets, Latin trades, and research connection.
- [week-05-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md), **The mathematical work; Checked mathematics and boundaries; Sources and lineage** — Distinguishes entry clues from visibility clues; cites undergraduate Latin squares and critical-set research.

**Authoring cautions.**

- Do not add Sudoku boxes or skyscraper perimeter rules. They change the object and dilute this design.
- All three final boards have order five. Their progression is measured by deduction structure, not by increasing board size. Grade labels should follow playtesting.
- The final two require tentative choices or deductions beyond singles. Provide reversible placements and row/column conflict highlighting; do not silently fill forced cells.

### latin-01 — One of each

**Child task:** Fill the orchard. Put 1 and 2 exactly once in every row and column.

Starting board (`·` is blank):

```text
1 ·
· ·
```

Canonical completion (the only one for this instance):

```text
1 2
2 1
```

**Hint:** Look at the top row. Which symbol is missing?

**Insight:** One local choice propagates through the shared row and column.

**Prerequisites:** Match two symbols; follow a row and a column. No arithmetic or independent reading.

**Why this step:** A brief rules tutorial; three fills. Skip after demonstrated mastery.

### latin-02 — The crossing clue

**Child task:** Complete the board with 1, 2, and 3 once in each row and column.

Starting board (`·` is blank):

```text
1 · ·
· 3 ·
· · 2
```

Canonical completion (the only one for this instance):

```text
1 2 3
2 3 1
3 1 2
```

**Hint:** The top-middle square shares a row with 1 and a column with 3.

**Insight:** A cell is controlled by the intersection of its row and column, not just by one line.

**Prerequisites:** Distinguish three symbols and keep two lines in mind.

**Why this step:** Every line initially has two blanks, so merely finishing a nearly full line is insufficient; intersect row and column candidates.

### latin-03 — The empty row

**Child task:** Complete the board with 1–4 once in every row and column.

Starting board (`·` is blank):

```text
1 2 · ·
· · 4 1
· · · ·
· · 2 ·
```

Canonical completion (the only one for this instance):

```text
1 2 3 4
2 3 4 1
3 4 1 2
4 1 2 3
```

**Hint:** Finish the top row, then check the second row before trying to fill the empty third row.

**Insight:** Information can travel across a board through a chain of row/column exclusions.

**Prerequisites:** Track four symbols; make and revise placements.

**Why this step:** Eleven blanks, including an entire empty row. This is still a forced-chain bridge, not a claim of deep difficulty.

### latin-04 — Find a home for 2

**Child task:** Complete the board with 1–5 once in every row and column.

Starting board (`·` is blank):

```text
· · 3 4 ·
· · · 1 ·
· · · · 2
4 2 · · ·
1 4 · · ·
```

Canonical completion (the only one for this instance):

```text
2 5 3 4 1
5 3 2 1 4
3 1 4 5 2
4 2 1 3 5
1 4 5 2 3
```

**Hint:** Do not start by asking what fits a cell. Ask where the 2 can go in the top row.

**Insight:** A symbol can have only one possible home in a row even when every empty cell allows several symbols.

**Prerequisites:** Five symbols; compare possible homes across a full row.

**Why this step:** There is no cell with just one candidate initially. A hidden single (top-left 2), followed by another hidden single, starts a forced chain.

### latin-05 — A choice in the middle

**Child task:** Complete the board with 1–5 once in every row and column. You can undo any trial.

Starting board (`·` is blank):

```text
· 4 · · 1
· 5 · · ·
· · 2 · ·
· · · 3 5
1 · · 5 ·
```

Canonical completion (the only one for this instance):

```text
3 4 5 2 1
2 5 3 1 4
5 1 2 4 3
4 2 1 3 5
1 3 4 5 2
```

**Hint:** First finish the top row. Then the leftmost empty cell in row 2 allows 2 or 4. Try one lightly and check what it forces.

**Insight:** Locally legal placements can fail only after consequences travel through several rows.

**Prerequisites:** Five symbols; reversible trials; tolerate a delayed contradiction.

**Why this step:** Cell/hidden singles make four placements and then stop with thirteen blanks. At that point row 2, column 1 allows 2 or 4; 4 has no completion. This is a structural step beyond the preceding board.

### latin-06 — No obvious first move

**Child task:** Complete the board with 1–5 once in every row and column. Use trial marks if they help.

Starting board (`·` is blank):

```text
· 3 · · 4
2 4 · · ·
· · · · 1
· · · 3 ·
· · 5 · ·
```

Canonical completion (the only one for this instance):

```text
5 3 2 1 4
2 4 1 5 3
4 5 3 2 1
1 2 4 3 5
3 1 5 4 2
```

**Hint:** The top-left cell can hold 1 or 5. A trial 1 is locally legal but cannot lead to a complete board. Track its consequences and keep an undo point.

**Insight:** Uniqueness need not reveal itself through a forced first cell; global completion is a richer question than local legality.

**Prerequisites:** Five symbols; organize a small case split and recover from a failed attempt.

**Why this step:** Same 5×5 size as the previous two. Neither cell singles nor row/column hidden singles can even start. The unique completion requires a stronger deduction or branching; top-left 1 is a verified dead branch.

## Signal Lanterns: decode a binary word

Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Mathematical object.** A secret is a vertex of a binary hypercube. The score equals length minus Hamming distance to a known test vertex. Decoding intersects distance shells. The last pair uses a fixed resolving set that identifies all 32 five-bit words; this is a direct link to metric dimension, not generic clue soup.

**Acceptance.** Accept a submitted word exactly when every transcript score matches it. Exhaustive enumeration verifies one answer for each instance. Show all transcript rows continuously; scoring guesses is not an additional puzzle action.

**MVP priority.** High: compact new interaction, broad range of reasoning within a tiny state space.

**Source lineage.**

- [week-06-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex), **RuleBox; Tasks 2–4** — Binary repetition and exact-position feedback.
- [week-06-grades-2-3.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex), **Tasks 2–3, Change exactly one place; Three tests, then name the secret** — Difference-of-scores decoding.
- [week-06-extra-grades-6-7.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex), **Tasks 1–3, Five places, only four tests** — Five-bit landmarks 00000,00011,00101,01001; new score histories here.
- [week-06-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex), **Extra: decode and prove; Undergraduate and research connections** — Pair-sum decoding and local citation to Cáceres et al., Sections 2 and 6.
- [week-06-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md), **Checked mathematics and boundaries; Sources and lineage** — Identifying versus submitting; exact-position feedback distinguished from commercial Mastermind.

**Authoring cautions.**

- Repeated symbols are essential. An implicit no-repeat rule would invalidate the entire family.
- Do not use commercial Mastermind white pegs or add arithmetic/color side constraints.
- Avoid late examples containing score 0 or score n: either identifies the whole binary code immediately. Only the opening tutorial uses this shortcut.
- The five-bit probe set comes from the Week 6 source construction; these particular secrets and score histories are authored adaptations.

### code-01 — Opposite lanterns

**Child task:** The old test got no positions right. Set the two lanterns.

| Recorded test | Correct positions |
| --- | --- |
| `10` | 0 |

**Unique secret:** `01`.

**Hint:** A score of zero means every position must change.

**Insight:** In a binary alphabet, the antipodal vertex is uniquely determined.

**Prerequisites:** Match positions and distinguish two symbols; count zero.

**Why this step:** One clear tutorial inference introduces the exact-position rule; no search.

### code-02 — One change tells you something

**Child task:** Set the three lanterns so all three recorded tests have the shown scores.

| Recorded test | Correct positions |
| --- | --- |
| `000` | 1 |
| `100` | 2 |
| `010` | 2 |

**Unique secret:** `110`.

**Hint:** Compare 100 with 000. Only the first place changed; the score went up.

**Insight:** A single-coordinate flip changes the score by plus or minus one, revealing that bit. The baseline score determines the last bit.

**Prerequisites:** Count matches to 3; compare scores that differ by one.

**Why this step:** No zero or perfect score. Two local comparisons plus the total recover all three positions.

### code-03 — The last place is hidden

**Child task:** Find the four-symbol code that fits all four tests.

| Recorded test | Correct positions |
| --- | --- |
| `0000` | 2 |
| `1000` | 3 |
| `0100` | 1 |
| `0010` | 3 |

**Unique secret:** `1010`.

**Hint:** Compare each of the last three tests with 0000, then use the first score for the untested fourth place.

**Insight:** A baseline and coordinate differences reconstruct a vector without testing every coordinate separately.

**Prerequisites:** Count to 4; keep a baseline and three comparisons visible.

**Why this step:** Transfer the preceding baseline method to four positions and one additional comparison. Inferring the untested last coordinate reinforces code-02; this is a bridge in tracking load, not a new conceptual advance.

### code-04 — Tests that overlap

**Child task:** Find the four-symbol code. Some recorded tests changed more than one place at once.

| Recorded test | Correct positions |
| --- | --- |
| `0000` | 2 |
| `1100` | 2 |
| `1010` | 2 |
| `1110` | 3 |

**Unique secret:** `0110`.

**Hint:** Compare 1110 with 1100 to find position 3; compare 1110 with 1010 to find position 2. Then reuse the total.

**Insight:** Overlapping measurements can be subtracted so their shared coordinates cancel.

**Prerequisites:** Count to 4; compare two non-baseline tests and reuse information.

**Why this step:** Same length as the previous puzzle; direct baseline flips are replaced by overlapping measurements. No giveaway score and a unique answer.

### code-05 — Five places, four echoes

**Child task:** Set all five lanterns using the four recorded tests.

| Recorded test | Correct positions |
| --- | --- |
| `00000` | 2 |
| `00011` | 2 |
| `00101` | 4 |
| `01001` | 2 |

**Unique secret:** `10101`.

**Hint:** The first test has 2 matches and 00101 has 4. Flipping those two positions gained two matches: both positions must be 1.

**Insight:** A two-coordinate score difference determines how many 1s lie in that pair. Overlap recovers the shared bit.

**Prerequisites:** Count to 5; compare score changes of 0 or 2 and follow overlapping pairs.

**Why this step:** Fewer tests than positions; a pair with sum two anchors the deductions. The supplied probe set resolves every five-bit word.

### code-06 — Every echo sounds the same

**Child task:** All four recorded tests have the same score. Find the five-symbol code.

| Recorded test | Correct positions |
| --- | --- |
| `00000` | 3 |
| `00011` | 3 |
| `00101` | 3 |
| `01001` | 3 |

**Unique secret:** `10001`.

**Hint:** Each changed pair has one 0 and one 1. Try the last position as 0 and as 1; which case agrees with the first test?

**Insight:** The three pair relations allow two patterns for positions 2–5; position 1 remains free, leaving four complete candidate words. The baseline count of two 1s selects the right pattern and fixes position 1.

**Prerequisites:** Count to 5; hold two possibilities for one shared bit and compare total counts.

**Why this step:** Same probes and size as the previous puzzle, but no pair is directly fixed. The all-equal scores force a genuine two-case inference; only 10001 fits.

## Pebble Duel: play to the last pebble

Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Mathematical object.** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Acceptance.** Play the entire game. Complete only when the player takes the last pebble. After each player move, the opponent returns a zero-XOR position whenever possible, otherwise chooses uniformly among all legal moves. Undo restores the position before the player move and opponent reply.

**MVP priority.** High: very simple physical action and mathematical depth; requires an honest opponent/checker.

**Source lineage.**

- [week-07-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex), **Tasks 2–5, Can you leave a little trap? and A trap that grows** — Pedagogical precursor: a winning move must work against every reply. The constrained subtraction rule is not carried into this family.
- [week-07-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex), **Middle: backward reasoning; Extra: smallest-missing labels** — Recursive W/L definition and why combined games need richer labels.
- [week-08-k-1.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex), **Task 4, Two little piles** — Natural unrestricted removal rule and mirror play.
- [week-08-grades-2-3.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex), **Tasks 3–5, The board is two piles** — Equality strategy and third-pile counterexamples.
- [week-08-grades-4-5.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex), **Tasks 2–6, Compare two kinds of balance; Balance the binary columns** — Transition from total/equality heuristics to binary bundles.
- [week-08-facilitator.tex](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex), **The binary invariant; Why the test is sufficient, for any number of piles** — Winning algorithm and primary historical Bouton citation.
- [week-08-redesign.md](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md), **Verified mathematical backbone** — Exact normal-play rules and complete two-obligation reasoning.

**Authoring cautions.**

- Specify normal play consistently: taking the last wins. Misère changes the answer.
- Never restrict allowed removal amounts to an authored random subset. Every amount from 1 through the selected pile size is legal in every instance.
- A zero-XOR start has no winning first move, so none of these six starts has zero XOR.
- Display binary bundles only as an optional visual aid. Actual play still removes ordinary counters; a move must decrease exactly one pile.
- There may be multiple winning first moves. Store and accept all; especially the final instance has three.

### nim-01 — Leave the pair

**Child task:** Win a game starting with piles of 1 and 2.

**Start:** 1, 2 counters, piles numbered left to right.

**All winning first moves:**

- Remove 1 from pile 2; leave (1, 1).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** Leave the other player two piles of 1.

**Insight:** The smallest equal-pile position lets you answer either move with the last counter.

**Prerequisites:** Count and remove 1 or 2; understand alternating turns.

**Why this step:** A three-counter endgame with an immediate reply; first rules example.

### nim-02 — Build a mirror

**Child task:** Win a game starting with piles of 2 and 5.

**Start:** 2, 5 counters, piles numbered left to right.

**All winning first moves:**

- Remove 3 from pile 2; leave (2, 2).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** Can you make the two piles match in one move?

**Insight:** Equal piles let a player copy the opponent in the other pile until both are empty.

**Prerequisites:** Compare pile sizes to 5; remove several counters from one pile.

**Why this step:** Winning requires preserving a pattern across possible replies, not just taking the largest number.

### nim-03 — Three piles break the old rule

**Child task:** Win a game starting with piles of 1, 1, and 2.

**Start:** 1, 1, 2 counters, piles numbered left to right.

**All winning first moves:**

- Remove 2 from pile 3; leave (1, 1, 0).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** The two matching piles do not protect the player who receives this position. Can you remove the extra pile?

**Insight:** Two equal piles cancel as game components, but an unmatched third pile matters. An even total alone is not a losing-position test.

**Prerequisites:** Three piles; count to 2; remove a whole pile.

**Why this step:** Numbers shrink while the reasoning changes: a third component invalidates the earlier two-pile equality shortcut.

### nim-04 — No equal piles needed

**Child task:** Win a game starting with piles of 1, 2, and 4.

**Start:** 1, 2, 4 counters, piles numbered left to right.

**All winning first moves:**

- Remove 1 from pile 3; leave (1, 2, 3).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** Try leaving 1, 2, and 3. Whatever changes next, you can leave two equal piles and an empty pile.

**Insight:** A losing three-pile state need not contain equal piles. The 1/2 bundle pattern of 1,2,3 balances.

**Prerequisites:** Count to 4; consider several legal replies or use optional 1/2/4 bundle icons.

**Why this step:** Moves from the candidate result have six different replies to consider. This breaks the naive equality picture without large piles.

### nim-05 — Repair one binary column

**Child task:** Win a game starting with piles of 3, 4, and 5.

**Start:** 3, 4, 5 counters, piles numbered left to right.

**All winning first moves:**

- Remove 2 from pile 1; leave (1, 4, 5).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** Show each pile using bundles 4, 2, and 1. Which bundle appears an odd number of times?

**Insight:** Every binary column must contain an even number of bundles, not merely the total number of counters.

**Prerequisites:** Count to 5; use optional 4/2/1 bundles and odd/even; no binary notation prerequisite.

**Why this step:** The winning move changes the smallest pile, so a largest-pile heuristic fails. This is the first nontrivial use of the binary display.

### nim-06 — One move, several ways

**Child task:** Win a game starting with piles of 4, 5, and 6.

**Start:** 4, 5, 6 counters, piles numbered left to right.

**All winning first moves:**

- Remove 1 from pile 1; leave (3, 5, 6).
- Remove 3 from pile 2; leave (4, 2, 6).
- Remove 5 from pile 3; leave (4, 5, 1).

The first listed move is the stored canonical witness; every listed move is accepted.

**Hint:** One legal option changes 4 to 3. Removing one counter trades a 4-bundle for 2+1; inspect all the columns again.

**Insight:** Binary balancing can require lower bits to turn on as a pile shrinks. Different piles can provide different valid balancing moves.

**Prerequisites:** Count to 6; re-express a smaller pile in 4/2/1 bundles; tolerate multiple right answers.

**Why this step:** Three winning moves remove different amounts from different piles. The advance is rebundling and multiple strategies, not a larger collection of rules.

## Scope

These files are a content proposal and verifier. They do not add a mechanic, edit shipped puzzles, or change app behavior. The JSON records the exact parameters, canonical witnesses, complete winning-move lists, source sections, hints, and difficulty diagnostics.


## Additional instances 07–12 — September 23, 2026

These are implemented alongside 01–06. See [the difficulty expansion](difficulty-expansion.md) for criteria and source boundaries, and [the complete review](../PUZZLES.md) for exact starting data and witnesses.

### Symbol Orchard additions

| ID | Level | Insight |
|---|---|---|
| `latin-07` | Medium | A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction. |
| `latin-08` | Medium | A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction. |
| `latin-09` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-10` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-11` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |
| `latin-12` | Hard | Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing. |

### Signal Lanterns additions

| ID | Level | Insight |
|---|---|---|
| `code-07` | Medium | Pair totals overlap through a crossing comparison; after resolving the pairs, the total fixes the last bit. |
| `code-08` | Medium | Overlapping triples and a pair must describe the same hidden bits; no single-position probe is supplied. |
| `code-09` | Hard | Four equal-score relations couple five positions. A case split at their common position and the baseline count select the unique word. |
| `code-10` | Hard | Locally consistent pair assignments can disagree with a cross-group total. Every recorded test is necessary for this unique code. |
| `code-11` | Hard | A sparse transcript can uniquely specify six bits. Convert match changes into group counts, then reconcile the overlaps. |
| `code-12` | Hard | Three overlapping triple counts leave plausible partial assignments. Only a globally consistent case survives; omitting any test leaves at least four codes. |

### Pebble Duel additions

| ID | Level | Insight |
|---|---|---|
| `nim-07` | Medium | Equal game components cancel even when other piles remain. |
| `nim-08` | Medium | A whole collection can cancel even when no two piles match. |
| `nim-09` | Hard | A winning move can remove an entire pile while leaving three unequal piles. |
| `nim-10` | Hard | Shrinking a pile across a power of two can switch several smaller binary columns on. |
| `nim-11` | Hard | More than one winning opening may exist; every opponent reply must still be balanced again. |
| `nim-12` | Hard | Choosing among multiple reductions requires coordinating all binary columns across five components. |

