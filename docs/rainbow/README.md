# Rainbow triangles

October 5, 2026. Eleven puzzles, a group of four called Starred dots, and a playground, built from Week 16 of the Bellingham math circle, three-colour triangles. They are in the puzzle satchel only, not on the Lantern Road. Children have not played them in the app, and the Week 16 worksheets have not been taught.

## The mathematics

A big triangle is cut into little triangles that meet edge to edge. Its corners are lettered R (bottom left), B (bottom right) and Y (top). A dot on a side may use only that side's two corner letters; a dot inside may use any of the three. A little triangle with R, B and Y at its corners is a **rainbow**.

- **Sperner's lemma.** However the dots are lettered, the number of rainbows is odd, so there is at least one. This holds for any cutting into triangles that meet edge to edge, whatever their shapes and sizes (puzzle 6's fan, the playground's fan).
- **Doors.** Call an edge with R at one end and B at the other a door. A rainbow has exactly one door; a little triangle with R and B but no Y has two; every other has none. Along the bottom side the letters start at R, end at B and use only R and B, so they change an odd number of times: the outside has an odd number of doors, and the other two sides have none.
- **The counting proof.** Count doors triangle by triangle: rainbows + 2 × (two-door triangles) = outside doors + 2 × (inside doors), because an inside door belongs to two triangles. The right side is odd, so the number of rainbows is odd.
- **The walking proof.** Walk in through an outside door and keep going through the next door. A two-door triangle always lets you on, so a walk ends outside or in a rainbow; walks never branch. Walks from outside pair the outside doors two by two, an odd number can't all pair, so some walk from outside ends in a rainbow. Other walks join two rainbows, and closed loops are possible.
- **The walk as a search.** The walk finds a rainbow while looking at few letters: halve the bottom between an R and a B to find a door, then go through doors, looking only at each triangle's third corner. This is the idea behind path-following algorithms for fixed points (Scarf) and fair division (Su).
- **The side rule matters.** Let one bottom dot also be Y, and a Y can sit between the R's and the B's: the bottom then has no door, and a board can have no rainbow at all, or any even number. Let a dot on the left side be B, and R, B, Y up that side adds one outside door, so the outside doors are even and zero is possible again (Starred dots).
- **Counts on small boards.** The two-row board has 8 letterings, each with exactly one rainbow, which can be any of its 4 triangles. The three-row board has 192 letterings with 1, 3 or 5 rainbows (108, 72 and 12 of them). The four-row board has 13,824 letterings with 1, 3, 5, 7 or 9 (2,920; 6,192; 3,840; 848; 24), and each of its 16 triangles can be the only rainbow. The fan has at most 7 (each of its four parts holds at most two, and the count is odd). Nine rainbows on the four-row board need only one outside door: the other eight pair up by walks inside.

Experiments come first: children change letters and watch the count, which never goes even. Conjectures come from what the board shows: rainbows appear and disappear in pairs. Walking through doors is the explanation, done with a finger before it is said; the counting proof stays in grown-up notes. Enumerations prove facts about one board only (the guide says the same); the door argument covers every board.

## Where they appear

**Puzzles → Rainbow triangles** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). The puzzles are grade-free (`band: "all"`), with Easy, Medium and Hard. Letters are drawn with their colours (R rose, B sky, Y sun) but the letter carries the meaning.

| # | Puzzle | Kind | Board | The answer | Week 16 source |
|---|---|---|---|---|---|
| 1 | Move the rainbow | Only rainbow, each triangle | Two rows | All 4 places; every lettering has exactly 1 | K–1 P1; shared launch |
| 2 | Three rainbows | Make a count | Three rows | 3 (a Y in the middle) | 2–3 and 4–5 P1 |
| 3 | Through the doors | Walk every door | Three rows, RBRB/RRB/RB/Y | 9 doors: out–out and out–rainbow | 2–3 P2 |
| 4 | Five rainbows | Make a count | Three rows | 5, the most; 12 of 192 letterings | K–1 P3; 2–3 and 4–5 P1 |
| 5 | How many can there be? | Every count, That's all | Three rows | 1, 3 and 5 only | K–1 P2; 2–3 and 4–5 P1; 4–5 P5 |
| 6 | The fan | Make a count | Two rows, each triangle cut in three | 7, the most; 6 letterings | K–1 P4 |
| 7 | Sixteen places | Only rainbow, each triangle | Four rows | All 16 places | K–1 P5 |
| 8 | Nine rainbows | Make a count | Four rows | 9, the most; 24 of 13,824 | Four-row distribution in the guide |
| 9 | Doors inside | Walk every door | Four rows, RRBRB/YBRB/RBB/RB/Y | 14 doors: out–out, out–rainbow, rainbow–rainbow | 4–5 P2 |
| 10 | Hidden letters | Peek | Five rows, letters hidden | One bottom door; the walk finds the rainbow | New: the proof as a search |
| 11 | A walk that comes back | Peek | Six rows, letters hidden | Three bottom doors; the first walk comes back out | New, after 2–3 P5 and 4–5 P2 |
| | Playground | Free lettering | Two to five rows, and the fan | Always odd | Shared launch; K–1 P4's fan |

**Starred dots** is a group below Hard. In each puzzle one dot on a side carries a star and may take any letter, which breaks the side rule. The review card asks for broken rules as a separate group so that they never mix with puzzles where the guarantee holds.

| # | Puzzle | Kind | Board | The answer | Week 16 source |
|---|---|---|---|---|---|
| 1 | No rainbow | Make a count | Two rows, the bottom dot starred | 0; 3 of 12 letterings | K–1 P6 |
| 2 | Two rainbows | Make a count | Two rows, the bottom dot starred | 2; only RYB/RB/Y, its two rainbows joined by one inside door | 4–5 P6; new instance |
| 3 | How many now? | Every count, That's all | Three rows, a bottom dot starred | 0 to 5; 16 of 288 have none, 4 have four | 4–5 P6 against P1 |
| 4 | A blue on the left | Make a count | Three rows, a left-side dot starred | 0; every such lettering reads R, B, Y up the left | New, after 4–5 P6 |

The worksheets are in [math-circle-worksheets, week 16](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-16). Each puzzle's `provenance` names its problem. Puzzles 10 and 11 and Starred dots 4 are new. Their hidden boards are picked by the builder: exactly one rainbow, the right number of bottom doors, a walk of moderate length, and a budget one peek above what the door search needs on the hardest of the three boards, while peeking row by row runs out and random peeking rarely wins.

The [Week 16 review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-16.md) (keep) set the app fit: the triangle grid rather than Neighbor Lanterns, side dots that take only their two letters, the only rainbow on each cell, exactly k with even k impossible, the most (5, 7, 9), broken rules as a separate group, and rows with exactly k doors. All but the rows are here. The plan suggested Neighbor Lanterns' colouring palette. A palette lets a child choose a letter a dot may not take; here a tap moves a dot to its next allowed letter instead, so the side rule is in the board itself (a bottom dot only ever switches between R and B), and there is no tool to pick first. The plan's "even counts become 'prove it can't' with doors" became two things: puzzle 5 asks for every possible count and checks That's all, and the walk puzzles (3, 9) and peek puzzles (10, 11) are the door proof done with a finger. A general proof that no lettering is even is not something a child can hand the app as a certificate, so it stays in the notes.

## How a puzzle plays

- **Letters.** Tap a dot to change its letter. A dot on a side switches between its side's two letters; a dot inside goes R, B, Y in turn. Corners never change and are drawn with a heavier ring. A starred dot (Starred dots) may take any letter; its star sits just outside the big triangle beside it.
- **The count.** Rainbows are shaded with all three colours, and a counter above the board shows how many there are. **Doors** shows the R–B edges as violet bars (violet is between the rose of R and the sky of B).
- **Make a count.** Solved when exactly that many triangles are rainbows.
- **Only rainbow.** When exactly one triangle is a rainbow, it gets a star. Solved when every triangle has a star. Undo keeps the stars; Restart clears them.
- **Every count.** Each count reached joins a row of numbers below the board. **That's all** checks the row: with one missing it says "There's another." and waits for a change.
- **Walks.** Doors are always shown. Outside doors glow when no walk is under way; tap one to walk in. Inside a triangle, its unused door glows; tap it to go through. A walk stops in a rainbow or when it leaves the board. A rainbow that no walk has reached also glows: tap it to start a walk inside. The trail of each walk stays on the board, and a counter shows doors walked. Solved when every door is walked.
- **Peeks.** Only the corners show. Tap a dot to see its letter; doors between letters already seen appear. Solved when the three letters of a rainbow are in view, within the peeks allowed. When the peeks run out, **Start again** hides the letters of the next of three boards.
- **The playground.** Boards of two to five rows, and the fan. Pressing the chosen board again starts it over. There are no hints and no solve.
- **Hints.** Hints keep as much of the child's work as an answer allows. In lettering puzzles they change one dot toward the nearest lettering that does the job: the target count, the next uncollected only rainbow, or a count not yet found, then That's all. In walks they show the next door, an unwalked outside door, or a rainbow to start in. In peeks they follow the door search, or say Start again once the peeks left can't reach a rainbow. Hints alone solve every puzzle.

## Rules that keep the record honest

- Only legal moves are accepted: a letter a dot may not take, a corner, a door that is not in the current triangle, a second walk mid-walk, a peek at a corner or past the budget, and anything after a solve are refused.
- Saved boards are checked: letters follow the side rules; collected stars and counts are ones the board allows, listed once, and include what is on the board now; walks replay door by door, only the last may be unfinished, and no door is walked twice; peeks are distinct dots, not corners, within the budget, and stop at the first rainbow.
- `scripts/build-rainbow.mjs` computes the claims as it writes the pack. `scripts/validate-rainbow.mjs` checks them again by separate methods: it rebuilds every board from coordinates and checks that its triangles cover the big triangle edge to edge; takes side rules from collinearity with the corners; sweeps every lettering in mixed radix and checks Sperner's lemma and the door count on each; finds walks with a union-find of the door graph; and tests each peek budget against a separately written search, peeking row by row, and random peeking. It plays witnesses, hint chains from fresh and from trap boards, illegal moves and forged saves.

## Files

| File | Contents |
|---|---|
| `dist/families/rainbow/rainbow.js` | The `rainbow` mechanic, and `starred` for the group on the same hooks: moves, solves, hints, the peek search, rendering and wiring |
| `dist/families/rainbow/sperner.js` | The mathematics: boards and side rules, rainbows, doors, walks, every lettering and the count table |
| `dist/families/rainbow/rainbow.css` | Lettered dots, rainbow shading, doors, trails, hidden dots and the counter; imports the shared grid styles |
| `dist/families/rainbow/rainbow.json` | The pack: 11 puzzles, 4 Starred dots and a playground, 1 family and 6 sources, merged at load through `dist/families.js` |
| `dist/tri-mesh.js` | The shared board of any triangles (edges, outside edges, drawing; taps through `wireTri`), described in [tri-grid.md](../tri-grid.md) |
| `scripts/build-rainbow.mjs` | Authoring list and copy; picks the hidden boards, checks every stated count and writes `rainbow.json` |
| `scripts/validate-rainbow.mjs` | The independent checks above; run by `npm run build` |
| `scripts/rainbow-browser-smoke.mjs` | Taps, keys, the counter, stars, That's all, walks, peeks and the playground in a real browser (`TEST_PHONE=1` for touch) |
| `tests/rainbow.test.mjs`, `tests/tri-mesh.test.mjs` | Boards, counts, doors, walks, taps, collecting, peeks, the playground, rendering; the mesh's edges and controls |

To change a puzzle, edit `scripts/build-rainbow.mjs`, then run `node scripts/build-rainbow.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, in the app or on paper. Three things to watch:
  - Whether a tap that moves a dot to its *next* letter is clear, or whether children want to choose a letter directly (a palette, as in Neighbor Lanterns).
  - Whether children see the doors as a way through, and whether the walk puzzles feel like a puzzle or like tracing a forced path.
  - Whether the peek puzzles are fun or frustrating: do children find the halving and the walk from the hints, or spend their peeks at random and give up?
- The card's rows (a row of R's and B's from R to B, or from R to R, with exactly k doors; the wrong parity can't be made) are not in the app. They need a board of dots in a line, not triangles; the bottom row of every puzzle here, and the doors along it, carry the same fact.
- The return visit (a fourth letter inside, a square, positive and negative rainbows) is not in the app.
- Boards of seven rows or more, and irregular cuttings other than the fan, are not offered; the peek boards stop at six rows so dots stay tappable on a phone.
