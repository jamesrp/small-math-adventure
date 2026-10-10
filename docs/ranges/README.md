# Ruler strips

October 10, 2026. Eight puzzles and a playground built from Week 51 of the Bellingham math circle (honest measurement ranges). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 51 worksheet is unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-51.md) and its [second run](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/checks/week-51/card-second-run.md) shaped this family. Their Decision: a short group of six to eight puzzles on a strips-on-a-ruler board where each strip's end drags only inside its band, so the screen enforces the rule; break the app's claim or say it can't be broken; widen a band while the app looks for a join that escapes; one A drawn twice that moves as one. No typed or predicted ranges, no running sum, no answer slots. Eight puzzles is the low end of the seam's range, as the card's "short group" asks.

## The mathematics

A strip's length is a whole number of units somewhere in its band [lo, hi]. Strips laid end to end from 0 make a **join**; two rows started at 0 leave a **gap** between their ends.

- **Joins add bands.** A join of strips with bands [a, b] and [c, d] ends somewhere in [a + c, b + d], and every whole end between occurs. So a claim "every join ends inside the window [L, U]" is broken by one setting outside, and it holds exactly when the **shortest join** (every strip at its left end) and the **longest join** (every strip at its right end) are both inside. Those two settings are the certificate for "can't break it" (puzzles 1, 2, 4).
- **Widths add.** The spread of a join, b + d − a − c, is the sum of the bands' widths. For a window [L, U] and the other strips fixed in their bands, the widest safe band for the last strip runs from L − (the others' left ends) to U − (the others' right ends), so its width is the window's width less the others' widths. Each end is pinned by one extreme setting: the shortest join touches L and the longest touches U; one unit wider at either end lets that setting out (puzzles 5, 7).
- **The same strip cancels.** A letter drawn twice is one strip. The gap (A + 4) − (A + 1) is exactly 3 for every A, while (A + 4) − (B + 1) with a separate B of the same band runs from 1 to 5, longest less shortest. Taking away the very same A from A + B leaves exactly B (puzzles 3, 6). Working each row's range out separately and subtracting gives 1 to 5 in the first case and 1 to 6 in the third: safe but loose. This is the **dependency problem** of interval arithmetic.
- **A locked total ties two strips.** With A + B = 12, B = 12 − A, so B's band cuts A's: with A in [7, 10] and B in [3, 7], A can only reach [7, 9]. The gap A − B = 2A − 12 runs from 2 to 6 (puzzle 8).

All bands, windows and totals are whole, so every extreme is a whole setting; the board moves in whole units. The worksheet's lengths between ticks (8.5 − 5.5, say) are not on the board.

## How a puzzle plays

The board is one ruler. On top, a **card row** for each strip shows its gray band from 0 and the strip, with a round end to drag; the end never leaves the band, and with a locked total it stops where the partner would leave its own band. Below a dashed line, **result rows** lay strips and white exact pieces end to end from 0. A tap on a card row moves the nearest control in that row to the tapped unit; a drag moves it and the board follows; letting go is one move and one Undo. Arrow keys move a focused end by one unit, Home and End to the ends of its reach.

- **Break** (puzzles 1, 2, 4). An ochre window on the ruler is the app's claim, and the objective names it ("Make the join end outside 8 to 10"). A join ending outside breaks it: the end line turns red and the puzzle is solved. Can't is off until the child has changed a strip. A wrong Can't is refused ("It can break.") and stays refused through Undo until Restart. A right Can't asks the child to show the shortest and the longest join: each is kept by a pine pin under the join when the child sets it (the setting already on the board counts at the press), and with both the span between them is drawn inside the window.
- **Widen** (puzzles 5, 7). One strip's band has two dark handles. Before Widest the strips are the app's: whenever some join can end outside the window, the app sets the strips to one that does (the join line red); otherwise to the extreme join nearest an edge. Widest is checked: a band that lets a join out is refused with "A join lands outside.", a safe band that can grow with "It can be wider."; either refusal waits for a change to the band, and Undo doesn't clear it. After a right Widest the band is fixed and the strips are the child's: setting the shortest and the longest join, which touch the window's two edges, pins both ends of the band and solves it.
- **Gap** (puzzles 3, 6, 8). An ochre box shows each pair's gap. Each time a move makes a pair's biggest or smallest gap, a pine bar under the pair keeps it at that place; a pair is done when it has both bars, and the puzzle when every pair has. Bars from the start position don't count until a move makes them. Undo keeps the bars.
- **Playground.** Strips A and B joined, both bands editable by their handles, both strips by their ends. No hints and no solve.

The certificates can't be tapped as single objects, so the child supplies them by setting them: the two extreme joins for Can't and Widest, the two extreme gaps for every gap puzzle. The app confirms each one as it is made (a pin or a bar) and draws the full argument when both are there.

## The puzzles

| # | Level | Mode | Strips | Goal | Answer |
|---|---|---|---|---|---|
| 1 | Easy | break | A 4–6, B 3–4 | end outside 8 to 10 | 4 + 3 = 7 (joins 7 to 10) |
| 2 | Easy | break | A 6–8, B 2–4 | end outside 8 to 10 | 11 or 12: 8 + 3, 7 + 4, 8 + 4 (joins 8 to 12) |
| 3 | Easy | gap | A + B over the same A; A 4–6, B 3–4 | biggest and smallest gap | 4 and 3 (the gap is B) |
| 4 | Medium | break | A 4–5, B 4–5 | end outside 8 to 10 | Can't: 4 + 4 = 8 and 5 + 5 = 10 |
| 5 | Medium | widen | A 3–4; B's band from 5–6 | widest band for B, joins 7 to 9 | B 4–5, pinned by 3 + 4 and 4 + 5 |
| 6 | Medium | gap | A + 4 over A + 1; A + 4 over B + 1; A, B 4–6 | biggest and smallest gap of each pair | top 3 and 3; bottom 5 (A 6, B 4) and 1 (A 4, B 6) |
| 7 | Hard | widen | A 2–3, B 3–5; C's band from 5–5 | widest band for C, joins 9 to 14 | C 4–6, pinned by 2 + 3 + 4 and 3 + 5 + 6 |
| 8 | Hard | gap | A 7–10 over B 3–7, A + B = 12 | biggest and smallest gap | 6 (A 9, B 3) and 2 (A 7, B 5); A can't reach 10 |

The two easy break puzzles break on opposite sides of the window, and puzzle 4, with the same window, can't be broken; the titles don't say which. Puzzle 5 starts on the worksheet K–1 Problem 3's "too long" card, so the app's first join already escapes. Puzzle 6 is the worksheet's comparison page with fix 2 built in: the two A's on top are one strip, always the same length. Puzzle 6's bottom pair needs the cross pairing (longest A with shortest B), which the card's fix 3 asked to meet before the shared-A page; here puzzle 3 introduces the gap mode with the same A, and puzzle 6 sets the shared and the separate pair side by side, as the worksheet does.

## Hints

The first hint, on a fresh board, is an idea (each puzzle's `hints[0]`). After that the mechanic names one move at a time, which Apply hint plays: a strip to a length, a band end to a unit, or Can't or Widest with the reason first ("The shortest join ends at 8 and the longest at 10, both inside the window. Press Can't."). For a claim that can't be broken, the chain first makes a try (the shortest join), so Can't is never the first move. In gap puzzles the chain heads for the nearest setting, other than the current one, that makes an extreme not yet kept. Settings, extremes and widest bands are cached per band; the validator times every hint with its move, and the slowest takes a few milliseconds.

## Provenance

| # | Source |
|---|---|
| 1 | K–1 Problem 2 and Grades 2–3/4–5 Problem 2, the pair A (4 to 6) with B (3 to 4), against "always reaches 8 and fits within 10" |
| 2 | The same problems' pair E (6 to 8) with F (2 to 4), renamed A and B |
| 3 | Grades 4–5 Problem 9: join A to B, then remove that very same A |
| 4 | The same Problem 2's pair C (4 to 5) with D (4 to 5), renamed A and B |
| 5 | Grades 2–3/4–5 Problem 3 (A 3 to 4, every join 7 to 9, the widest card for B); K–1 Problem 3's cards |
| 6 | K–1 Problem 4 and Grades 2–3/4–5 Problem 5, with the white pieces 4 and 1 |
| 7 | New, from Problem 3 with a third strip and Problem 4's question of which width matters |
| 8 | Grades 4–5 Problem 8: A 7 to 10, B 3 to 7, their join exactly 12 |
| Playground | Page 1's launch (A 2 to 3, B 1 to 2) and Problem 1, made free |

Research: Ramon E. Moore, R. Baker Kearfott and Michael J. Cloud, *Introduction to Interval Analysis* (SIAM, 2009), for interval addition, widths and the dependency problem. The connections in each puzzle's grown-up notes go no further than the board: whole-unit bands, sums, differences and one linear constraint.

## The board, for reuse

The board in `dist/families/ranges/ranges.js` is general: a puzzle's `parameters` give `ruler` (the last unit), `cards` (each strip's band, letters A, B, C in sun, sky and rose), `start` lengths, `rows` (each a list of strip letters and white piece lengths, laid from 0), and optionally `window` (a claim on the first row's end), `pairs` (rows whose gap is measured, top less bottom), `total` (`{strips: [s, t], sum}`, drawn as a wall on a row of just those two strips) and `edit` (the strip whose band has handles). `settings`, `extremes`, `reach`, `withLength`, `targetsIn`, `nearestTarget` and `actionFor` are exported. A future rods family (Week 29's, say) can reuse the card rows and result rows with its own measures; the renderer draws any number of strips and rows on one ruler.

## Files

| File | Contents |
|---|---|
| `dist/families/ranges/ranges.js` | The mechanic, the board, drags and keys, and the module entry |
| `dist/families/ranges/ranges.css` | Styles in the shared board look |
| `dist/families/ranges/ranges.json` | The pack, written by the builder |
| `scripts/build-ranges.mjs` | The authoring list: computes every answer with the mechanic and checks the table above |
| `scripts/validate-ranges.mjs` | Recomputes every range as a linear form band by band (a locked total substituted out), the widest band from the window and by brute force over every band with a separate simulator; plays witnesses and hint chains (from fresh, after a try, after a wrong Can't or Widest); checks Undo keeps a refusal and kept extremes; refuses illegal moves and forged saves; times hints |
| `tests/ranges.test.mjs` | Unit tests |
| `scripts/ranges-browser-smoke.mjs` | Drags, taps on contested controls, keys, focus, Can't and Widest, kept gaps, Undo and the playground in a browser |

## Not yet done

1. **Watch for:** whether children read the card rows as the strips and the result rows as the strips laid on the ruler, or try to drag in the result rows (they are not controls).
2. **Watch for:** whether a K–1 child knows what to do after a right Can't or Widest from "Show the shortest and the longest join.", and whether the pins and bars read as "kept".
3. **Watch for:** whether the app's attack in the widen puzzles is read as the app trying to break the band, and whether children move one end at a time or guess a band.
4. Lengths are whole units only; the worksheet's between-tick lengths (K–1 Problem 6's 8.5 − 5.5) are not on the board.
5. Not ported: the worksheet's K–1 Problem 7 and Grades 2–3 Problem 8 (fill 9 exactly, every pair; the card asks for no answer slots), Grades 2–3/4–5 Problem 4 (which strip to uncover), Problems 6–7 (the gap's guaranteed range and the "middle values" claim; a gap window can't be drawn on the ruler because both ends move) and the bonus pages.
6. The playground has one join of two strips. A second layout (two rows and their gap), a third strip and a claim window a partner sets are possible additions.
7. Not on the road; a keeper and Plume lines would come with a road change after children have played it.
