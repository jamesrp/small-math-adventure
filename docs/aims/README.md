# Mirror Couriers bounce words

October 17, 2026. Eleven puzzles built from Week 71 of the Bellingham math circle ("Can you hear the room?", bounce words in a square, a wide rectangle and a 60° rhombus), added to Mirror Couriers as its **Bounce words** group. They are in the puzzle satchel only, not on the Lantern Road. Nobody has played them yet, and the Week 71 worksheets have not been piloted.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-71.md) says **keep**. Its Decision (October 10) is what this group builds: an aiming group in Mirror Couriers that moves the predict-heavy family toward clicking. The child drags an aim through the unfolded rooms and the app folds it into bounces and spells the word, with exact arithmetic for corner hits. Solves: a target word, ABA in the rhombus or "impossible" in the square with the collinear seams as the certificate, a square word remade in the wide rectangle, and a word only one room can make; no guess-the-room quizzes. The packet's sources last changed on October 6, before the card, so the group is built from the packet the card reviewed. Mirror Couriers' own puzzles (45° paths in rectangles, tap the first corner) are left alone; nothing here repeats them.

## The mathematics

A room is a convex quadrilateral with lettered walls, A at the bottom, D on the right, C at the top and B on the left. A shot starts inside and bounces like light in a mirror; its **word** is the walls it meets, in order. A shot that meets a corner is not allowed: it would meet two walls at once, so its word is not defined.

- **Unfolding.** Mirror the room in the wall a shot meets, and the bounced shot is the straight continuation in the copy. So a shot is a straight segment through mirror copies of the room, and its word is the walls of the copies it crosses. Every claim below is about straight lines crossing walls of copies.
- **Rectangles: each direction takes turns.** In a rectangle's copies the A and C walls lie on the level lines y = jH, A on even j and C on odd j, and the B and D walls on the upright lines x = kW. A straight line crosses each level line once, in order, so the A and C letters of a word alternate, and so do B and D. In particular **no rectangle makes ABA**: in the copies, the A wall the shot crosses and the A wall it would need after B lie on one line, and a straight shot crosses a line only once. The same two walls are the certificate for any word in which a letter comes back with only walls of the other direction between (CABA, BAB, DCD, …).
- **The 60° rhombus makes ABA.** At its sharp corner the walls A, B and the next copy's A all start from the corner and spread over 120°, less than a straight line's half turn, so one line can cross all three. In the rhombus the two A walls are not on one line, and the square's certificate fails.
- **All rectangles have the same words (both ways).** Stretching the square's copies across to twice the width gives the wide room's copies: lines stay straight, every wall keeps its letter and crossings keep their order. Squeezing goes back. So words can tell the rhombus from a rectangle, never one rectangle from another.
- **Which words rectangles make.** Exactly the words in which each direction's letters alternate and the order of the two directions is *balanced*: any two stretches of the word of the same length hold numbers of A-or-C letters that differ by at most one. These are the cutting sequences of straight lines across two families of evenly spaced lines (finite pieces of Sturmian words). So **ACDB** is not a rectangle word, though each direction alternates: A then C means the shot crossed a whole room height between side walls (steeper than the room), D then B a whole width between top and bottom (flatter). It can't be both. The rhombus, being slanted, makes ACDB, BDCA, CABD and DBAC.

Limits. The app's aim points are a lattice (the centres of 25 small cells in each rectangle, the centroids of 50 small triangles in the rhombus); mirrors carry aim points to aim points and none lies on a wall line, so a shot between two aim points can still hit a corner exactly, and the app decides that exactly. Answer counts are counts of aim points. The impossibility claims are stronger: no start and no end anywhere make ABA or CABA in any rectangle, which the validator checks by linear programming over real starts and slopes, not by searching the lattice.

What children are meant to discover: that the letters can be read off the copies one wall at a time (puzzles 1–3); that the order of walls is set by the slope (4); that ABA can't happen in the square and why, by pointing at the two A walls on one line (5, 10), and that the same walls are not on one line in the rhombus (6); that a word moves between rectangles by keeping the copy and the spot, not the direction (7, 9); and that some words rule out every rectangle (8, 11). Experiments are the shots; the conjecture is "no shot makes ABA"; the explanation is the line through both A walls, which the child taps and the app draws.

What is checked in the app: every word, crossing and corner exactly; that a Can't is right only with the two walls that lie on one line; that a Check is right only for a word no rectangle makes. What is not checked: that the child can say why. The grown-up notes carry the explanations.

## Where they appear

**Puzzles → Mirror Couriers → Bounce words**, below Easy, Medium and Hard and beside Sight lines. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels.

| # | Level | Puzzle | Room | Goal | Answer | Week 71 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Two walls | Square | DC from the centre | 10 spots, a little flatter than the diagonal into the copy up and right | P1, new instance |
| 2 | Easy | Three walls | Square | CBA | 20 spots (guide's direction (−2, 3)) | P1 table |
| 3 | Easy | A slanted room | Rhombus | AB | 34 spots, down through A then the copy's B | P2 rhombus copies |
| 4 | Medium | Two in a row | Square | ACB | 3 spots, two copies down and one left | P1 window, new |
| 5 | Medium | Back to A | Square, start movable | ABA, or Can't | Can't: the room's A wall and the A wall after A, B (both on y = 0) | P2 square |
| 6 | Medium | Back to A again | Rhombus, start movable | ABA, or Can't | ABA at the sharp corner (1,172 shots over 49 starts); Can't is refused | P2 rhombus |
| 7 | Medium | Same word, wide room | Wide | The square shot's word, DCB | 20 spots; the stretched square shot is one | P4 |
| 8 | Medium | No rectangle | Rhombus | Any word no rectangle makes, then Check | 64 shots: ABA, BAB (20 each), BABC (13), ABAD (9), ABADC, ADCD | P3, as a design goal |
| 9 | Hard | Same word, square | Square | The wide shot's word, BDC | 3 spots; the squeezed wide shot is one | P4, the other way |
| 10 | Hard | Up and back | Wide, start movable | CABA, or Can't | Can't: the A wall crossed after C and the A wall after B (both on y = 20) | P2's argument inside a longer word, new |
| 11 | Hard | All four walls | Rhombus | A word with each wall once that no rectangle makes, then Check | 45 shots: BDCA (23), DBAC (10), ACDB (9), CABD (3) | the card's first fix, new |

Puzzle 5 comes before 6 as on the worksheet (square beside rhombus), so a child who has proved the square case can try the same certificate in the rhombus and see it refused.

## How a puzzle plays

The board is a window of mirror copies of the room on paper, the room itself in sun, with every wall in ink and its letter. Drag or tap in the window to choose where the shot ends; it snaps to the nearest aim point. The shot is drawn straight from the start, with an ochre dot at each wall it crosses; the copies it passes through are tinted and the crossed walls are ochre. Below, the goal word in dashed tiles over the shot's word, and beside them the same shot folded into the room, bouncing. While dragging, the shot, word and folded room follow the finger; letting go makes one move. On a touch screen the end rides 34 px above the finger.

- In a rectangle the whole window of copies is drawn. In the rhombus only the copies along the shot are drawn (the rhombus's copies do not fill the plane edge to edge: at its 120° corners three copies meet, and the copies along different shots overlap), clipped to the window.
- A shot that meets a corner stops there: an ochre-red ring on the corner, the rest of the segment faint, a ⌟ tile after the word, and "That shot hits a corner."
- Where the start can move (puzzles 5, 6, 10), its dot has a sun ring; drag it. With a keyboard, arrow keys move the end to the nearest aim point within 45° of the arrow, and Shift with an arrow moves the start.
- Remakes (7, 9) show the other room's window and shot, small, above the play window. After the solve, **Stretch** (or **Squeeze**) changes that window to the play window's shape: its lines stretch, its letters and dots slide, and the stretched shot is drawn dashed over the child's in the play window. It is a reveal, not a move; it does not redraw the board.
- How to play opens with the operation (a shot bounces like light; in the copies it runs straight on; the walls it crosses spell its word) and shows the worksheet's first example, AD, folded and through one copy.

## Certificates and claims

**Can't** (puzzles 5, 6, 10) is off until the child has made a shot with at least one letter, so a fresh board can't be claimed. After Can't every wall in the window (in the rhombus, every wall of the copies the shot passes) can be tapped; none is tinted or ringed before it is tapped, and a tap goes to the nearest wall within 22 px, so a tap near a corner where four walls meet picks the one under the finger. Tapping a picked wall lets it go; Escape puts the walls away. The claim is judged when the second wall is in:

- the two walls the word needs, on one line: solved; the app draws the line through both across the window and says "Both A walls lie on one line.";
- two walls not on one line: "Not on one line.";
- two walls on one line that the word doesn't need: "Not the A walls ABA needs."

A refusal clears the taps and holds Can't off until the shot changes. It is saved, and Undo keeps it (without its words, so Undo still changes the screen) until a new shot. In the rhombus no pair is accepted. Out of 4,000 random two-tap sequences on the walls after a shot, 17 solve puzzle 5 and 18 solve puzzle 10 (1 pair in 276); none solves puzzle 6.

The certificate is the word's route, not the child's attempt: whichever shot the child tried, the walls to tap are the A wall a shot making the word would cross and the A wall it would need next. Any first shot opens Can't because after one shot the 24 walls still leave 276 pairs, so the tap is a real choice.

**Check** (puzzles 8, 11) asks whether some rectangle could make the shot's word. It is judged once per shot: "A rectangle can make it too.", or in puzzle 11 "Use each wall once." for a word that doesn't. A refused Check is saved and kept through Undo like a refused claim. The reason a word rules out rectangles is not tapped: it is either a returning letter (which the child already points at in puzzles 5 and 10) or the balance of the two directions, which has no single thing on the board to point at. A drawn rectangle shot with the same word, as the refusal's evidence, is not yet done.

## Rules that keep the record honest

- A save holds only the start, the end, and for Can't puzzles the claimed pair or the refusal, for Check puzzles `done` or the refusal. Both points must be aim points; the start inside the room (and where it is fixed, the puzzle's start); the end inside the window.
- A claimed pair must be the right one for the puzzle's word, on a board with a shot; a refusal must carry the verdict its walls actually get, and a design refusal the reason its word actually fails. `done` must belong to a word no rectangle makes. Forged saves are refused.
- Hints are memoised per board. For an impossible word the chain makes an attempt (a shot with the word's letters up to the returning one, AB or CAB), then names the reason and the two walls before marking Can't; the first hint never says Can't. For a possible word they move the end, or the start first when the child's start can't work.

## Files

- `dist/families/aims/fold.js`: rooms, mirrors, aim points and the exact fold (whole numbers and fractions only; the rhombus in slanted coordinates).
- `dist/families/aims/aims.js`: the mechanic (boards, moves, claims, Check, hints, drawing, gestures, keyboard) and the seam entry. The group adds no satchel family and no symbol: it joins Mirror Couriers (`libraryFamily: "billiard"`, `group: "Bounce words"`).
- `dist/families/aims/aims.css`: styles, all under `[data-mechanic-wire="aims"]`.
- `dist/families/aims/aims.json`: the pack, written by `scripts/build-aims.mjs`, which counts every puzzle's answers with the mechanic and checks them against the table above.
- `scripts/validate-aims.mjs`: an independent check, run by `npm run build`. A Euclidean billiard in exact Q(√3) arithmetic (velocity reflected inside the room, not unfolded) and, for rectangles, the cutting sequence of the straight shot, both compared with the mechanic on every one of the 34,694 shots the puzzles allow; every rectangle word up to 8 letters by linear programming (Fourier–Motzkin) against the balanced-word test; every rectangle word up to 4 letters made by a square shot; 15,625 square shots stretched; the guide's own rhombus ABA example; certificates by unfolding the room itself; random taps; witnesses; hints from fresh, after a wrong shot, a corner hit, a moved start, a refused claim or Check, and Undo; illegal moves and forged saves.
- `tests/aims.test.mjs`, `scripts/aims-browser-smoke.mjs` (desktop and `TEST_PHONE=1` at 375 × 667).
- `dist/families.js`: one registry line.

## Provenance

- Bellingham Math Circle, Week 71, "Can you hear the room?" (student packet GGT71-S-v1 and adult guide GGT71-FAC-v1, sources in `lowell-math-circle-year-2/source/week-71/`), and its review card and math check. Each puzzle's `provenance` names its problem.
- Aaron Calderon, Solly Coles, Diana Davis, Justin Lanier and Andre Oliveira, *How to hear the shape of a billiard table* (2018): the ABA comparison and Figure 2, p. 4; Proposition 1.6 and Corollary 1.7, p. 6.
- Moon Duchin, Viveka Erlandsson, Christopher J. Leininger and Chandrika Sadanand, *You can hear the shape of a billiard table: symbolic dynamics and rigidity for flat surfaces*, the Bounce Theorem, §1, pp. 2–3. Lineage only: the puzzles show its elementary core, not the theorem.

## Not yet done

Three things to watch for first when children play:

- **Whether they plan from the letters or drag until the word appears.** Dragging shows the word live, so the target puzzles can be solved by search. Puzzles 4 and 9 have only three solving spots each; watch whether those still feel like search.
- **Whether Can't lands.** Do children press Can't in puzzle 5 and find the two A walls, or reach them only through hints? And in puzzle 6, does the refusal "Not on one line." make them look at the rhombus walls, or just try more shots?
- **Whether Check becomes a guessing button.** Each new shot gets one Check, so a child can shoot and press Check until it is accepted: about one random shot in six works in puzzle 8 (one in forty in 11). If that is how it is played, a Check should cost more (for example, a refused Check holding until Restart).

Also not done:

- **A playground.** Free aiming in all three rooms would suit this group, but Mirror Couriers has no playground and that is a decision for the family.
- **The rhombus's own impossibilities.** The rhombus can't make ACB (the math check's eight square-only words) or ADA at a 120° corner; neither is a puzzle, since the reason is an angle argument the board doesn't yet show.
- **A rectangle witness for a refused Check**, drawn as the evidence that a rectangle makes the word too.
- **Words that need a long shot.** The ACDB family needs shots crossing several copies, so puzzle 11's window is large and mostly empty paper, with the room small in it.
- **The other room's window is small.** In puzzles 7 and 9 it is at most 130 px tall, to leave the play window room on a phone; its letters are small there.
- **Story.** The group is not on the Lantern Road. Grade trails are not set: the puzzles are grade-free.
