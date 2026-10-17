# Holes

October 17, 2026. Twelve puzzles built from Week 77 of the Bellingham math circle (Persistent holes), as a **Holes** group in Lantern Wires. They are in the puzzle satchel only, not on the Lantern Road. No child has played them, and the Week 77 packet is an unpiloted prototype (its guide, p. 2: "Physical rehearsal and classroom piloting have not been performed").

## The mathematics

A **board** is a connected flat region cut into triangles. Some triangles carry a **tile**; some boards have a **hole**, a region inside the board that is not a triangle and never takes a tile. The sides of the triangles are **wires**. A **loop** is a set of wires with an even number at every dot (a cycle mod 2: it may be one closed path or several). A **face** is a triangle or a hole.

- **Every loop goes round exactly one set of faces.** The outlines of the faces are independent mod 2 and add up to every loop, so each loop L is the outline, counted mod 2, of exactly one set of faces, *inside(L)*: the faces from which a path to the edge of the page crosses L an odd number of times. (Fill the holes in and the board is a disc: its first homology over Z₂ is zero, so every 1-cycle is the boundary of a unique set of 2-cells.)
- **Tapping a tile changes inside(L) by that tile alone**, since a tap adds the tile's outline to the lit wires mod 2. So the faces inside the lit wires that are not tiles never change. **The wires can all go dark exactly when every face inside them is a tile**, and then one tap on each face inside does it (an odd number of taps on each, in any order). An empty triangle or a hole inside the lit wires is a **certificate** that they can't: it is inside now and stays inside after every tap. On a board with no empty triangle and no hole that is everything; the hole is what no tiles can ever remove.
- **On a growing board** (wires and tiles added, never removed), a loop is **gone** when some filled tiles together have it as their outline. By the first fact, a loop is gone exactly when every face inside it is a filled triangle. So a loop goes out with the last tile inside it, a loop round a hole never goes out, and a loop that is out stays out. When the wires at the start join every dot without a loop (a spanning tree), the first wire added closes exactly one loop, itself plus the start wires' path between its dots; that is the loop that is **born** and that the schedule puzzles follow.
- **Two loops race.** With neither loop round a hole, the yellow loop can go out while the pink loop is still lit exactly when the pink loop needs a triangle the yellow one doesn't: fill the triangles inside the yellow loop and nothing else. If every triangle inside the pink loop is inside the yellow loop, then when the yellow loop goes out the pink loop's triangles are all filled, so it went out then or before, in every order. Those triangles are the certificate.

In the language of the subject: the board with its filled tiles is a cell complex over Z₂, a loop is a 1-cycle, gone means a boundary, and a loop round the hole is a class in the first homology that no tiles kill. Adding wires and tiles one at a time is a **filtration**: a class is born when a wire closes a loop and dies when tiles fill it in, which is **persistent homology** in miniature (Edelsbrunner and Harer, *Computational Topology*, §IV.1 and §VII.1; Ghrist, "Barcodes", 2008). The limits are those of the Week 77 guide: on these small flat boards a loop's death is read off the faces inside it, and the puzzles follow one chosen loop, not the barcode of a whole filtration ("A loop's first appearance and final filling do not by themselves identify a barcode interval for an arbitrary loop", guide p. 1).

What a child is meant to find: a tap inside the lit loop shrinks it and one outside grows it; an empty triangle or the hole inside the loop never leaves it; a loop that hugs the hole may not go round it, and two loops round the hole together go round no hole; an empty triangle blocks the wires even when no lit wire touches it; the first wire decides which loop is born, and filling triangles outside it first makes it go out later; a loop whose triangles all lie inside another always goes out first. The puzzles are the experiments, a Can't claim is the child's conjecture, and the certificate tapped is the explanation, which the app checks.

`scripts/validate-holes.mjs` checks all of this by methods other than the mechanic's crossing count. It rebuilds each board with wires as bit masks and decides dark boards by trying every set of tiles, certificates by ray casting from each face, and "gone" by Gaussian elimination over Z₂ on the filled tiles' outlines. It checks the first fact on every set of faces of the square, the strip of four and the wheel (and on 1,500 random sets on the ring), and that random taps never change the empty faces inside. It decides every schedule's first wire by searching sets of k tiles, every play on the strip of four (1,090 complete plays), and races by trying every set of tiles.

## Where they appear

**Puzzles → Lantern Wires → Holes** is a group inside Lantern Wires on the family seam ([Adding a family](../ADDING-A-FAMILY.md)): `libraryFamily: "toggle"`, `group: "Holes"`, mechanic `holes`. It sits below Lantern Wires' Easy, Medium and Hard, after the Lamplighter group. The puzzles are grade-free (`band: "all"`). Lantern Wires' own puzzles and Lamplighter are unchanged.

Triangles are numbered in reading order from the top left (from 1 in the app's words, from 0 in the pack). Boards: Week 77's square with its diagonal (2 triangles); strips of six and of four lattice triangles; a hexagonal **ring** of 18 triangles round a hexagonal hole; a **wheel** of six triangles round a dot; a **big triangle** of sixteen.

| # | Level | Kind | Board | Goal and answer | Insight | Week 77 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Cancel | Square, both halves tiled, rim lit | Dark: tap both halves | A tap flips three wires; the rim is the outline of both halves | Page 1 (worked example), Problem 1 |
| 2 | Easy | Cancel | Strip of six, last triangle empty, loop round triangles 2–4 | Dark: tap the three inside | Taps inside shrink the loop; outside ones grow it | New (page 1's token test) |
| 3 | Easy | Cancel | Strip of six, rim of the first five lit, triangle 3 empty | Can't: triangle 3 | An empty triangle inside never leaves | New (page 1) |
| 4 | Easy | Cancel | Ring, all tiled, loop round the hole and three tiles | Can't: the hole | A loop round the hole stays round it; every lit wire touches a tile | New (card's ring with a hole) |
| 5 | Medium | Cancel | Ring, two top triangles empty, loop along the bottom of the hole | Dark: tap the seven inside | Hugging the hole is not going round it | New |
| 6 | Medium | Cancel | Ring, all tiled, hexagon and star lit | Dark: tap the six inner tiles | Two loops round the hole cancel the hole | New |
| 7 | Medium | Cancel | Big triangle, top corner and middle empty, hexagon lit | Can't: the middle triangle | A buried empty triangle blocks with no lit wire beside it | New |
| 8 | Medium | Cancel | Ring, one triangle by the hole and one at the bottom empty, loop round the top | Can't: the triangle by the hole (the hole is refused) | The hole is outside; the empty triangle is the reason | New |
| 9 | Hard | Schedule | Strip of four, rim with a gap; out with tile 3 | 3 of 4 first wires can win (loops round 1, 2 or 3 triangles; the gap closes the rim round 4) | The first wire decides the loop; fill outside it first | Problem 2 |
| 10 | Hard | Schedule | Ring, rim with a gap and six spokes; out with tile 2 | 11 of 19 first wires can win (3 close loops round the hole, 5 round three triangles) | A loop round the hole never goes out | New (Problem 2 on a ring) |
| 11 | Hard | Race | Wheel: yellow round all but the top, pink round all but the top right | Win: fill all but the top | The pink loop needs a triangle the yellow one doesn't | Problem 6 |
| 12 | Hard | Race | Big triangle: yellow round rows 2–3, pink round row 3 | Can't: the five tiles of the pink loop | Nested tile sets: the smaller set always finishes first | Problem 6 and its guide argument |

Puzzle 6's lit wires are two loops that touch at the hole's six corners; the "loop" of the rules is any set of wires with an even number at each dot, so this is still one lit set.

## How a puzzle plays

**Cancel (1–8).** The tiles are fixed. Tapping a tile flips its three wires; the lit wires glow yellow on a dark line. The goal line reads "Make every wire dark." Only tiles are buttons, each the shape of its triangle. After at least one tap, **Can't** turns on; pressed, it makes every triangle (tiles and empty ones) and the hole a button and sends focus to the board; the next tap on a face is the claim.

**Schedule (9–10).** Solid lines are wires in; dashed lines are places for wires. The first loop the wires close lights; later loops stay dark. A triangle with all three wires in is tinted and takes a tile when tapped. Under the board, an outline for each tile up to the marked one (the target, with a small dark loop in it): tiles fill the outlines in order, and the outline where the loop went out gets the loop too. The goal line reads "Make the first loop go out with the marked tile." A dashed line's button is a wide invisible line over its middle, stopping short of its dots, so a tap near a dot where several dashed lines meet adds none.

**Race (11–12).** Every wire is in and nothing is filled. Tapping a triangle fills it. The yellow and pink loops glow; where they share a wire they run side by side. A loop that went out leaves a faint dashed trace. The goal line reads "Make the yellow loop go out while the pink one is lit." After at least one fill, while the pink loop is lit, **Can't** turns on; pressed, every triangle is a button, a tap rings it (a second tap unrings it), and **Check** judges the ringed set once.

With a keyboard, Tab moves between the buttons and Enter or Space taps; focus stays on the board after every move, never on Can't or Check. How to play opens with the definitions ("The sides of the triangles are wires. Tapping a tile flips its three wires…") and then the gestures.

## Certificates and claims

**Cancel.** The child supplies the certificate: after a tap, Can't, then the empty triangle or the hole inside the lit wires. It is accepted exactly when the face tapped is not a tile and is inside the lit wires (which, by the second fact, is the same at every step). The app then shades the faces inside the lit wires and rings the face. It proves the claim, since taps never move that face out of the loop, and every Can't board has one. It can fail: after Can't every face is a button and none is tinted, so a random face is right 1 time in 6 (puzzle 3) to 1 in 19 (puzzles 4 and 8). A wrong face gets one note, "That one doesn’t keep it lit.", true of the face tapped and the same on every board. Can't stays off until the next tap (the lock). Undo keeps the lock and hides the note, so Undo always changes what is on screen.

**Why this certificate and not the card's.** The card's Decision says "can't" is certified by "a lit edge that only unfilled tiles touch". That wire exists on some boards (puzzle 3 has one: the rim wire of the empty triangle), but not on all. In puzzle 4 every triangle is tiled and the loop goes round the hole, so every lit wire touches a tile at every step of play. In puzzle 7 the empty triangle is buried: its three sides lie between tiles, so even when the lit wires shrink to its outline, each lit wire touches a tile. Both can't go dark. The face certificate covers every case and includes the card's: a lit wire has one side inside the loop and one outside, so if neither side is a tile, the inside side is an empty triangle or the hole, which is what the child taps here. A wire the child points at would be a weaker certificate, and on these boards it can't always be pointed at; a face can.

**Race.** After a fill, while the pink loop is lit: Can't, tap the tiles that fill the pink loop, Check. The claim is accepted exactly when the set is the pink loop's triangles and the board can't be won; the app then shades the triangles inside the yellow loop and rings the claimed ones, which all lie inside it. That containment is the argument (Week 77 guide, Problem 6: "If one required set contains another, the smaller set is completed no later than the larger, in every order"), so the certificate is the set, and the child taps it. A wrong set gets "Those tiles don’t fill the pink loop." on any board. The pink loop's own tiles on a board that can be won get "There is a way." Either way the taps clear and Can't stays off until the next fill, through Undo. A random set is right 1 time in 65,535 (puzzle 12). Once the pink loop is out, the board shows the attempt failed and Can't waits for Undo.

**Hints.** The first hint is the authored one, never Can't. Live hints lead to an attempt (a tap or fill) and then give the reason in words ("The loop goes round the hole. Tapping tiles moves the loop, but the hole stays inside it."). From the second hint the board marks Can't and the face or tiles (the marks stay after Can't is pressed); the third applies the claim. Hints in play never say "Press Can’t"; only the authored list in the grown-ups' notes ends with it.

**Failures the board shows, and ones it doesn't yet.** When the board shows the failure, the line under it says so: "It went out too soon. Undo.", "It is still lit. Undo.", "The pink loop went out first. Undo." or "They went out together. Undo." When an attempt can no longer succeed but the board doesn't show it yet, nothing appears under the board, so the line is not an instant oracle. This happens in a schedule after a first wire whose loop goes round the hole or round too many triangles, and in a race after the pink loop's own triangle is filled. A hint then offers Undo.

## Packet revision

The review card (October 10) was written on packet F77-45-v1. The packet was revised on October 15 (worksheets commit 8b825bf: F77-45-v2 and guide F77-FAC-v2). The revision adds a page 1 with the square example (build the rim, add the diagonal, fill one half, fill both halves) and the definition "the saved loop is gone when filled tiles have that loop as their combined boundary". It replaces the token example with a full-loop XYZ test and adds "any selection of the currently filled triangles". Problems 1–6 are unchanged and move to pages 2–6, and the guide's page references and launch follow. The Decision still fits: the revised definition is exactly the app's rule ("a lit loop goes out once some filled tiles together have it as their outline"), and puzzle 1 is the revised page 1. For the port, the changes are that How to play uses the revised definition, puzzle 1 and the provenance cite page 1, and Problems 2 and 6 are cited by number. The card's fixes concern the paper kit, Problem 3 and the guide, which the app doesn't use.

## Files

| File | What it is |
|---|---|
| `dist/families/holes/holes.js` | The mechanic: boards (faces, holes, the crossing count), the three kinds, claims, hints, drawing and wiring |
| `dist/families/holes/holes.css` | Styles, every rule under `[data-mechanic-wire="holes"]` |
| `dist/families/holes/holes.json` | The pack, written by the builder |
| `scripts/build-holes.mjs` | Boards, the authored puzzles and their notes; checks each answer against the module and records the witness from its hints |
| `scripts/validate-holes.mjs` | The independent checks above, hints from fresh and after wrong moves and refusals, illegal moves and forged saves |
| `tests/holes.test.mjs` | Unit tests |
| `scripts/holes-browser-smoke.mjs` | The browser suite (desktop and `TEST_PHONE=1`) |

## Sources

- Bellingham Math Circle, Week 77: Persistent holes, student packet (Grades 4–5, F77-45-v2) and adult guide (F77-FAC-v2): [week-77](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-77). Review card `plans/review/week-77.md` and math check `week-77-math.md`.
- H. Edelsbrunner and J. Harer, *Computational Topology: An Introduction* (AMS, 2010), §IV.1 and §VII.1.
- R. Ghrist, "Barcodes: the persistent topology of data", *Bulletin of the AMS* 45 (2008) 61–75.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things testers should watch:
  1. **Inside and outside.** Do children decide whether the hole is inside a loop by looking (puzzles 5, 6 and 8), or press Can't on the hole whenever a loop curls round it, and does "That one doesn’t keep it lit." help?
  2. **Planning in schedules.** Do children choose the first wire by tracing the solid path it closes, or by adding a wire and pressing Undo until a good loop lights? Is the marked outline under the board read as "the loop must go out here"?
  3. **The race claim.** Is tapping the pink loop's tiles and pressing Check understood as the reason, or found by trial? Is "There is a way." used as an oracle on puzzle 11?
- **Goal loops.** The card's other cancel idea, tapping tiles until the lit loop matches a goal loop, is not here.
- **Choose your pair.** Week 77 Problem 6 asks the child to find two loops that can go out in either order. That needs a way to draw loops and is not here; puzzle 11 gives the pair.
- **Left out by the Decision.** Problem 3's hole counts, Problem 4's stage changes and Problem 5's predict-and-explain question; no counters.
- **Bigger boards.** Boards with two holes, or a wider ring where two loops round the hole need not touch, would extend puzzle 6.
- **A demo** of the move, and **story**: Holes is not on the Lantern Road and has no keeper lines.
- **Rehearsal.** The hatched hole, the yellow and pink lines running side by side, and the trimmed dashed-line buttons pass the digital checks at 375 px and on desktop, but have not been tried on a real phone by a child.
