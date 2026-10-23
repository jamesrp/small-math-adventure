# Ruler strips: Hidden machines

October 23, 2026. Eleven puzzles built from Week 94 of the Bellingham math circle (calibration lab), added to Ruler strips as its **Hidden machines** group. They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 94 worksheet is unpiloted.

## Why a group with a slippery machine

The theme's two card runs disagreed on form. The [card of record](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-94.md) (App fit B, size M) proposed a new mechanic: feed known strips to a hidden machine, then set its dials within a request budget, with "better solves need no luck". The [second run](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/checks/week-94/card-second-run.md) (fit B, size S) proposed a small Ruler strips group: a slippery 21-rule machine like Signal Lanterns' Slippery secrets, shared-offset pairs declared with That's all, repairs, and noisy-band extremes marked with pins.

As product owner I chose the second run's form and kept the card of record's core action. Children send known strips to the machine and set its dials within a request budget, and the machine is slippery. Three reasons:

- **No luck.** A fixed hidden machine lets a child win by luck. One report such as 6 → 24 can identify the machine by chance, and a guessed name can be right. A budget round would then reward guessing as well as planning. The slippery machine keeps every machine that fits the reports so far, and it answers each request to leave the most doubt. A round therefore ends with one machine exactly when every request was one that always works, and the validator checks this over every sequence of requests. Better solves need no luck because no solve can use any.
- **Checkable losses.** A lost round ends with two machines that both fit every report, the certificate that Slippery secrets also uses. This is the card of record's "confused pair for each strip": for D, copies 2 extra 6 and copies 3 extra 0 both report 18.
- **The same board.** The mathematics is strips laid end to end on a ruler with a shared offset that cancels, which is Week 51's join-and-cancel. The board uses the Ruler strips look. A new family for eleven puzzles would add a satchel entry and a playground but no new idea.

Every solve the card of record listed is here: every pair of hidden lengths for two reports, with That's all (puzzles 2 and 3); the fewest requests that separate all 21 machines, including the one request of 7 or more (puzzles 6 and 8); every repair of a wrong report (puzzles 5 and 9); and the steepest and shallowest lines through error bars (puzzles 10 and 11). Its pitfalls are kept out. No screen asks "What will it report?". Dial guesses are free, but naming is judged against a machine that can't be lucky. No slot per answer gives a count away.

## The mathematics

A machine reports c·L + e for a strip L units long: c copies of the strip end to end, then an extra e.

- **Shared offsets cancel.** With c = 1, lengths raised by t and an extra lowered by t give the same reports, so two reports fix only the difference of two hidden lengths. For reports 7 and 10 with extras 1–6 there are six pairs, and in all of them Q − P = 3 (puzzles 2, 3). One known strip fixes the extra and then every hidden length (puzzle 4).
- **Telling machines apart.** With c in 1–3 and e in 0–6 there are 21 machines. Two different lengths L and M always tell them apart, because machines that agree at L differ at M by (difference in copies)·(M − L). One length does so exactly when L ≥ 7, since then the report ranges cL to cL + 6 don't overlap. The kit's strips are 2, 3, 4 and 6, so one request must join two of them: B + C, A + D, B + D or C + D (puzzles 1, 6, 7, 8). With extras 0–9 the threshold is 10.
- **Checking and repairing.** Three reports from one machine can be checked. For an extra-only machine with exactly one wrong report, the two right reports agree on the extra, so there is exactly one repair (puzzle 5). For a stretch and a shift, any two points fix a line, so each point can be the wrong one: up to three repairs (puzzle 9).
- **Worst-case design.** If each display is off by at most 1, two references D apart leave the stretch in a range 4/D wide. Reference pair A (2 and 4) gives stretches 1 to 3, pair B (2 and 10) gives 1¾ to 2¼, and 1 and 10 is the best pair from lengths 1 to 10 (puzzles 10, 11).

**The slippery machine.** In a request puzzle the machine keeps every machine that fits the reports so far. For a request it gives the report whose machines need the most further requests to separate, and among those the report with the most machines. Among reports that are just as good, it takes one that depends on the request and the position, so that no report (and no starting dial) is always right. It is deterministic, so saved requests replay to the same reports.

## How a puzzle plays

Dial and number rows sit beside their name, or under it when they don't fit; on a narrow screen seven or more chips go in two balanced lines (4 and 3, 5 and 4, 6 and 5), so no chip is left alone. Each bars board has one ruler from 0 and a row per request or strip. A row lays pieces end to end from 0 against the row's report, a pine mark with its number. A tick at the right means the row meets its report.

- **Requests** (1, 6, 8). Dashed empty rows show the requests left. Tapping kit strips puts them in the tray: a tray for one strip swaps it, and a tray for two takes a second tap as removal. Send makes a request. Its row is labelled with what was sent until the copies are set, and then the strips carry their letters. The dials (Copies, Extra) start unset. Once set, each row shows the dials' own answer for that request, copies of it and then the extra, so a child checks a machine against every report at once. That's the machine stays off until there is a report and every row has a tick, so dials that miss a report can't be named. A win needs the one machine left. A round lost by naming a fitting machine while another still fits, or by using every request with two machines still fitting, ends with "These both fit every report:" and both machines drawn in place of the board, each under its name ("copies 1, extra 6") on every report row with its tick, then Again. Request rounds have no Undo, because a report can't be taken back to ask again for free.
- **Every machine** (7). The given row and its report, with dials. A machine that fits goes on the shelf the moment the dials meet the report.
- **Hidden lengths** (2, 3, 4). Rows P and Q (and the known strip K) with number rows for each hidden length and the extra. A hidden strip that isn't set draws nothing. In 2 and 3 every fitting pair goes on the shelf as it is made, and That's all is judged on the press. A short shelf gets "There is another.", and the button stays off until something new is kept, through Undo too. Puzzle 4 is solved when every row fits.
- **Repairs** (5, 9). Tap a report chip ("6 → 10"), then − or + by one unit (5) or a half (9). Puzzle 5 draws bars, and puzzle 9 a plot whose line appears when the three points fit. Every repair goes on the shelf, with That's all.
- **Stretches** (10, 11). A plot with an ochre bar for each reference: every place its true report can be, 14 units wide (about 25 px on a phone), with heavy caps at its ends, a notch at each half and the display across it. Each reference has its own row, its name ("2 → 7½", the length and the true report) with ▼ and ▲, which move the true report by halves inside its bar. The stretch is shown in the same fraction style as the reports (2¼, and sixteenths drawn small, like 2¹⁄₁₆). The line through both shows its stretch, which is also shown in words. Pin keeps a line, and the second pin judges the pair together: right only when it is the steepest and the shallowest line, otherwise "A line can be steeper." or "A line can be shallower.", the pins clear, and the refusal stays (through Undo) until the line moves.

Hints: the first is the puzzle's idea. After that the mechanic names one move at a time, which Apply hint plays, and a second Hint marks the control. In request puzzles the hint picks a request that always works (fewest strips, then shortest), then sets the dials and names the machine. After a lost round it says "Start a new round.". A hint never judges a single pin, because the app shows a dead end at once. After a first pin that is neither extreme, the hint goes on to the steepest line ("The two pins are checked together."), the pair is refused, and the chain starts again.

## The puzzles

| # | Level | Mode | Board | Goal | Answer |
|---|---|---|---|---|---|
| 1 | Easy | requests | extras 1–6, one request of one strip | find the extra | any strip: the report less its length |
| 2 | Easy | hidden lengths | P → 4, Q → 6, extras 1–3 | every pair | 3 and 5, 2 and 4, 1 and 3 |
| 3 | Easy | hidden lengths | P → 7, Q → 10, extras 1–6 | every pair | six pairs, Q always 3 longer |
| 4 | Medium | hidden lengths | K 4 → 8, P → 9, Q → 12 | make every row fit | extra 4, P 5, Q 8 |
| 5 | Medium | repair | 2 → 5, 4 → 7, 6 → 10, extra-only | every repair | 6 → 9 (only one) |
| 6 | Medium | requests | 21 machines, two requests of one strip | find copies and extra | any two different strips |
| 7 | Medium | every machine | a strip 2 long reports 6 | every machine | copies 1 extra 4, 2 and 2, 3 and 0 |
| 8 | Hard | requests | 21 machines, one request of up to two strips | find copies and extra | B + C, A + D, B + D or C + D |
| 9 | Hard | repair | 2 → 7, 4 → 11, 6 → 16, a line | every repair | 2 → 6, 4 → 11½, 6 → 15 |
| 10 | Hard | stretch | references 2 → 8, 4 → 12, displays ±1 | steepest and shallowest | stretch 1 to 3 |
| 11 | Hard | stretch | references 2 → 8, 10 → 24, displays ±1 | steepest and shallowest | stretch 1¾ to 2¼ |

Puzzles 10 and 11 share axes so the two spreads can be compared.

## Provenance

| # | Source |
|---|---|
| 1 | Week 94 Grades 2–3 Problem 1 (play the extra-number machine), with the kit's strips A–D (2, 3, 4, 6) as the known strips |
| 2 | K–1 Problem 5 (P and Q come out as 4 and 6 cubes: every pair of towers that could have gone in) |
| 3 | Grades 2–3 Problems 2 and 3 (every pair for reports 7 and 10; what can you know without the extra?) |
| 4 | Grades 2–3 Problem 4, first row (a known strip 4 long reports 8; hidden strips report 9 and 12) |
| 5 | Grades 2–3 Problem 6, box I, and Problem 7's claim that such a list has one repair |
| 6 | Grades 4–5 Problem 1 (copies and extra: how few requests can you manage?) |
| 7 | Grades 4–5 Problem 2 (a 2-unit strip reports 6: every machine, and a second strip that separates them) |
| 8 | Grades 4–5 Problem 1 with the guide's note that B and C end to end make 7, one request that identifies every rule |
| 9 | Grades 4–5 Problem 4 (repair 2 → 7, 4 → 11, 6 → 16 by changing one report: three ways) |
| 10, 11 | Grades 4–5 Problem 6, reference pairs A and B, and Problem 7 (the best pair from 1 to 10) |

Research: NIST/SEMATECH *e-Handbook of Statistical Methods*, §2.3.6 (calibration with reference standards) and §2.4.5 (bias), the worksheet's background on calibration.

## Files

| File | Contents |
|---|---|
| `dist/families/calibrate/calibrate.js` | Machines, requests, the slippery machine (`needed`, `answer`, `play`, `winningRequest`), fits, repairs and stretches, the `calibrate` mechanic's five modes, hints, drawing, and the module entry (no family of its own) |
| `dist/families/calibrate/calibrate.css` | The board in the Ruler strips look |
| `dist/families/calibrate/calibrate.json` | The pack, written by the builder; puzzles set `libraryFamily: "ranges"` and `group: "Hidden machines"` |
| `scripts/build-calibrate.mjs` | The authoring list: computes every answer with the mechanic and checks the table above |
| `scripts/validate-calibrate.mjs` | Enumerates machines, requests, pairs, repairs and slopes afresh, with an independent minimax for which positions can always be won. Over every sequence of requests in each request puzzle it checks that the slippery machine keeps exactly the machines that fit, and ends a round with one machine exactly when every request always worked. It also checks the claims in the grown-up notes, hint chains (from fresh, after random play, after Undo and from lost rounds, never a dead end), lost rounds' two machines, wrong presses and pins refused and kept through Undo, illegal moves, forged saves, and every Undo press changing the screen |
| `tests/calibrate.test.mjs` | Unit tests |
| `scripts/calibrate-browser-smoke.mjs` | Requests, dials, a win, a lost round and Again, the shelf with That's all, a repair, pins, and Apply hint, in a browser, on desktop and phone |

To change a puzzle, edit `scripts/build-calibrate.mjs`, then run `node scripts/build-calibrate.mjs`, `node scripts/validate-calibrate.mjs`, `npm test` and `npm run build`.

## Not yet done

1. **Watch for:** whether children read a row's dial pieces as "what this machine would report" and use the ticks to test machines against every report, or set dials at random until a tick appears.
2. **Watch for:** whether the slippery machine feels fair. A lost round's two machines should read as "I couldn't have known", not as the app cheating. Puzzle 6's same-strip-twice loss and puzzle 8's single-strip loss are the moments to watch.
3. **Watch for:** whether the stretch bars (wider since the October 23 review, with a notch at each half) are big enough on a phone to see the true report move by halves, and whether children reach for the bars' opposite ends after puzzle 10.
4. No playground: Ruler strips shows one per family. A free machine with any kit, budget and dial ranges would suit the worksheets' partner games (2–3 P1 and P5, 4–5 P1).
5. Not ported: the K–1 ruler and cover problems (P1–P3, and P4's cube towers by hand), the partner game of 2–3 P5, 2–3 P4's other two rows, 4–5 P3 (rules from two reports and a third that refutes them), and 4–5 P5 (no promised form, so no tests force a value), which the card keeps on paper.
6. Not on the road. A keeper and Plume lines would come with a road change after children have played it.
