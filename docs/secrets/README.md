# Signal Lanterns slippery secrets

October 5, 2026. Thirteen puzzles built from Week 6 of the Bellingham math circle (code breaking: guess-my-block and the counter code game), added to Signal Lanterns as its **Slippery secrets** group. They are in the puzzle satchel only, not on the Lantern Road. None of this has been played by children in the app yet, and the Week 6 worksheets have not been piloted either.

The [Week 6 review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-06.md) says **revise**: the pages and answers are right, and the one must is a line in the adult guide (its key for 2–3 Problem 11). Ports don't wait on card fixes. The card's App fit (Fit A) asks for what this group does: tests chosen one at a time against a keeper that keeps as many secrets as it can, within a budget; the pair of secrets that still fit as the reason a round was lost; tests fixed in advance, with a colliding pair shown, up to four tests for five lanterns; a full-score variant; yes-or-no questions against the same keeper; and no live count of the secrets left.

Signal Lanterns already decodes Week 6's recorded tests: its twelve puzzles give a fixed list of tests and scores. What it lacked is the worksheet's other half, the one about *guaranteed* information: a way of asking that always works, and proof that fewer questions cannot. On paper a partner keeps the secret, and a lucky round proves nothing. Here the secret is slippery: it may change at any moment, but only to one that fits every answer so far, so it always answers in the way that leaves the most doubt. A round won against it is a way that always works; a round lost ends with two secrets that both fit, which is the reason. The plan's App fit names this "adaptive mode: the child picks tests, the app answers adversarially, with a budget".

## The mathematics

- **k yes-or-no answers make at most 2^k answer rows,** so k questions can always find one of 2^k things and never one of more: two of them would share a row, and the secret could be either. Halving what is left achieves it. Four shapes need 2 questions, eight need 3, and the numbers 1 to 20 need 5 (16 < 20 ≤ 32).
- **Questions planned ahead do as well.** Planned questions give every thing a fixed row of answers, and they work exactly when no two rows are equal. Eight shapes in three questions use every row of three lanterns once (numbering the shapes 0 to 7 in base 2 gives one plan).
- **A test** is a row of n lanterns; its score is the number of places where it matches the secret, n minus the Hamming distance. Changing one lantern changes the score by exactly one, up when the new state matches the secret there. So all dark (the number of dark lanterns), then one lantern lit at a time, finds the secret in n tests.
- **For 2, 3 and 4 lanterns, n tests are needed.** After any first test the secret keeps the rows a fixed number of changes away from it, and a later test scores those rows by how many of their changed places it shares, which gives too few different scores. For 3 lanterns: the three rows one change away get only two scores from any second test. For 4: the six rows two changes away get at most three scores, so some score keeps three or four of them, and no third test separates those. The counting bound (n + 1 scores per test) is weaker: three tests give 125 score lists for 16 secrets.
- **Tests planned ahead** give every secret a fixed list of scores and work exactly when all 2^n lists differ. For three lanterns 32 of the 56 sets of three different tests work (all dark, then lantern 1 lit, then lantern 2 lit; or one lantern lit in each); for four lanterns no three do.
- **Five lanterns need only 4 tests,** even planned ahead: all dark, then lanterns 4 and 5, 3 and 5, and 2 and 5 lit (Signal Lanterns puzzles 5 and 6 record the same four), or simply lanterns 1, 2, 3 and 4 lit one per test. A one-lantern test scores the number of dark lanterns plus one when that lantern is lit and minus one when it is dark; with five lanterns the all-dark and all-lit cases of lanterns 1 to 4 give different scores (4 or 3 against 2 or 1), while with four lanterns 0001 and 1110 both score 2 on every one-lantern test. 1,280 of the 35,960 sets of four different tests work. Six lanterns need 5 (a computer check, planned or not). The fewest planned tests is the metric dimension of the n-cube (1, 2, 3, 4, 4, 5 for n = 1 to 6), and for long rows about 2n/log₂ n suffice (the coin-weighing problem).
- **Ending only on a full match costs one more test:** the secret lets a test score n only when it is the one row left, so the child must know the secret before the last test. Three lanterns need 4 tests.

The app's secret plays by exact search. For yes-or-no questions it keeps the side that needs more questions (by the 2^k bound). For tests it keeps the score group whose fewest remaining tests is largest, found by a minimax search over the groups of secrets that fit (at most 32 rows), then the larger group, then the lower score. For tests planned ahead it gives the scores shared by the most secrets. Winning a round against this secret means each question asked was one from which the round could still always be won.

What is checked in the app: every answer the secret gives, on load as well as in play; that a round counts as won only when one thing is left, or, with tests, when the child names the one secret that fits (or a test scores n); that a claim that a budget can't always work is true; and in planned puzzles that the answer rows, or the lists of scores, all differ. What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Signal Lanterns → Slippery secrets**, below Easy, Medium, Hard and Codebooks. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone.

| # | Level | Puzzle | Kind | Answer | Week 6 source |
|---|---|---|---|---|---|
| 1 | Easy | Four shapes | Ask, 2 questions | Halve: 2 then 1 | K–1 P1 |
| 2 | Easy | Eight shapes | Ask, 3 questions | Halve: 4, 2, 1 | K–1 P3; 2–3 P2 |
| 3 | Easy | Two lanterns | Test, 2 tests | Change one lantern | K–1 P6; 2–3 P4, P5 |
| 4 | Medium | Eight shapes, two questions | Can it be done? | No: 4 answer pairs, 8 shapes | K–1 P4; 2–3 P3 |
| 5 | Medium | Three lanterns | Test, 3 tests | All dark, then one lit at a time | 2–3 P6, P8; 4–5 P2, P4 |
| 6 | Medium | Three lanterns, two tests | Can it be done? | No | 4–5 P8 |
| 7 | Medium | Numbers to twenty | Fewest questions, 3–6 | 5, and not 4 | 4–5 P1 |
| 8 | Hard | Questions planned ahead | Plan 3 questions for 8 shapes | Every row of three used once | 2–3 P2, planned (new) |
| 9 | Hard | Three lanterns planned ahead | Plan 3 tests | All dark, then lanterns 1 and 2 alone (32 sets work) | 2–3 P8; 4–5 P4, planned (new) |
| 10 | Hard | Four lanterns | Fewest tests, 2–5 | 4, and not 3 | 2–3 P10, P11; 4–5 P5, P6, P9 |
| 11 | Hard | Light all three | Fewest tests to score 3, 2–5 | 4, and not 3 | 2–3 P9; 4–5 P10 |
| 12 | Hard | Five lanterns, four tests | Can it be done? | Yes | Adult guide, “Where it goes next” |
| 13 | Hard | Five lanterns planned ahead | Plan 4 tests | Lanterns 1 to 4 one per test (1,280 sets work) | Adult guide, “Where it goes next”; card App fit (new) |

The worksheets are in [math-circle-worksheets, week 6](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-06). Shapes and numbers replace the pattern blocks, and lanterns replace the red and yellow counters; each puzzle's `provenance` names the problems it draws on. The worksheet's "Is it this one?" rounds (K–1 P2, 2–3 P1) and its lists of secrets that fit (K–1 P7, 2–3 P7, 4–5 P3) are left out: the second is what the family's own twelve puzzles do. The flip-both-counters invariance (4–5 P7) is not built (see Not yet done).

## How a puzzle plays

- **Ask** (1, 2, 4, 7): the shapes or numbers are buttons. Tap some to choose them, then press **Is it one of these?**. The answer lights a lantern above the board (lit for yes, with the word under it) and the things that no longer fit fade. A round ends by itself: won when one thing is left, lost when the questions run out first, with the things that still fit named. **Again** starts a new round.
- **Plan questions** (8): number tabs choose a question; tapping a shape or number puts it in that question or takes it out. A small row of lanterns under each thing shows its answers to all the questions (lit for yes), with the current question's lantern ringed. **Ask them all** answers every question at once. A lost plan names two things with the same answers, and **Again** keeps the questions for fixing.
- **Plan tests** (9, 13): a table holds every test, all dark at first; tap lanterns in any test to light them or put them out. **Test them all** gives every score at once: the secret picks the scores shared by the most secrets. A plan wins when only one secret fits every score, which the board shows; a lost plan shows two rows with the same scores, and **Again** keeps the tests for fixing.
- **Test** (3, 5, 6, 10, 11, 12): a table has one row per test allowed, empty until used, with the score beside each test. Tap the lanterns in the dashed row, then **Test**. When sure, set the secret's lanterns and press **That’s the secret**. Naming while another secret still fits loses the round, and the board shows two rows that fit every score (and says so if the named row doesn't). In puzzle 11 there is no naming: the round ends when a test scores 3, or when the tests run out.
- **Can it be done?** (4, 6, 12) and **fewest** (7, 10, 11): after a finished round, a button says that this many questions or tests can't always do it. It is checked: refused with "There is a way that always works … Keep looking", accepted with "Right". In fewest puzzles a row of numbers chooses the budget; a win at a budget puts a green bar under its number, and an accepted claim strikes it through. The puzzle is solved by a win at the fewest together with the claim one below. Hints in these six show the authored hints only, so they never say which budgets work.
- **Hints** elsewhere name the next tap (outlined at the second level, applied at the third): half of what still fits, the next test of a best strategy near the child's row, the one secret left, or, in planned puzzles, the question that would separate two things with the same answers, or the lantern to change toward the nearest set of tests that works.
- **No Undo** in ask and test puzzles: an answer can't be taken back to try another question for free. Planned puzzles keep Undo, since no answer or score is heard until the end.

## Rules that keep the record honest

- Every saved answer and score is replayed against the secret's rule on load; a save with an answer the secret would not give is refused.
- A won round is saved with its questions or tests and replayed; a win counts only for the budget it was played at.
- A claim is accepted only after a finished round at that budget and only when no way always works (by the 2^k bound for questions, by exhaustive search for tests); a refused claim is remembered until the next action.
- Things that no longer fit can't be chosen, and nothing changes after a round ends except Again, a new budget or a claim.

## Files

| File | Contents |
|---|---|
| `dist/families/secrets/secrets.js` | Scores, the fewest-tests search, the slippery answers, the sets of planned tests that work, the `secret` mechanic's ask, plan, plantest and test modes, hints and rendering |
| `dist/families/secrets/secrets.css` | Things to ask about, answer lanterns, question tabs, the test table and the budget picker |
| `dist/families/secrets/secrets.json` | The pack: 13 puzzles, the group's mathematics and 3 sources |
| `scripts/build-secrets.mjs` | Authoring list; computes each answer by search and writes the pack |
| `scripts/validate-secrets.mjs` | Recomputes every answer by a separate search (a recursion on how many things are left for questions, plain minimax over lists of rows for tests); checks that every answer the secret gives keeps the most doubt; plays every sequence of tests or questions within each "no" budget and a known way within each "yes" budget; claims, hints alone finishing every find and plan puzzle (also from a lost round), a direct count of the planned test sets that work and that planned scores keep the most secrets, illegal moves and forged saves; run by `npm run build` |
| `tests/secrets.test.mjs` | Scores, the fewest tests, slippery answers, asking and testing rounds, claims, scoring n, planned questions and tests, saves, no Undo and the satchel group |

The module adds no satchel family; its puzzles set `libraryFamily: "code"` and `group: "Slippery secrets"`. To change a puzzle, edit `scripts/build-secrets.mjs`, then run `node scripts/build-secrets.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children accept a secret that may change (and whether "slippery" needs a grown-up's word at the first lost round); whether they read the answer lanterns and the faded things without help, or keep asking about faded things in their heads; and whether the lost-round rows ("these both fit") explain the loss, especially after naming too early in test puzzles.
- **Asking one at a time.** The worksheet's "Is it this one?" rounds (K–1 P2, 2–3 P1: seven questions for eight blocks) would be a contrast for the youngest; not built.
- **Sixteen numbers planned ahead.** Four planned questions for 1 to 16 (base 2, 4–5 P1) was drafted and dropped to make room for planned tests; the plan mode handles it if wanted.
- **More from the card's App fit.** A proof puzzle asking for two secrets a given transcript can't separate; transcripts with a wrong score (“which score is wrong?”, from the games no secret fits in K–1 P7, 2–3 P7, 4–5 P3); a playground for the flip-both-counters invariance (4–5 P7).
- **Story.** Slippery secrets are not on the Lantern Road.
