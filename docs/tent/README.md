# Ruler strips: Fold and stretch

October 23, 2026. Eleven puzzles built from Week 92 of the Bellingham math circle (fold-and-stretch predictions), added to Ruler strips as its **Fold and stretch** group. They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 92 worksheet is unpiloted.

The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-92.md) (verdict keep, App fit B, size M) asked for exactly this: the tent move as a group in Ruler strips, which already has bands, Break and Widen modes and two-pin certificates. Its three solves are here: **Break** an endpoint-only claim, with Can't certified by pinning the lowest and the highest landing (puzzles 2, 3, 4, 7, 8); **Widest** band from 0 that stays from 0 to 2 for three or six moves, on an enlarged 0–1 ruler fine enough for 1/32, with the app showing an escaping start while one exists and the certificate the band's end landing exactly on 2 (puzzles 9, 10); and **Fill on move k**, a band placed so the whole track is first full on a given move (puzzle 5). Its pitfalls are kept out: no typed or predicted band ends, no band animation to watch as the task, no "x of 8" counter on the pairs. Three more puzzles come from the worksheet's other problems: every pair that lands together (P1), a band that lands just as wide or half as wide again (P5's never-narrower), and every band 2 wide that is first full on move 3 (P8's halving pieces).

## The mathematics

A marker on the track [0, 16] moves to twice its distance from the nearer end: T(x) = 2·min(x, 16 − x), the tent map. It folds the track at 8 and stretches each half onto the whole track.

- **Mirror starts meet.** x and 16 − x land together, and two different starts land together only this way: the eight whole-number pairs 0 and 16, …, 7 and 9 (puzzle 1).
- **Ends can miss the turn.** A band [a, b] on one half lands on the band between its ends' landings, doubled (reversed on the right half). A band across 8 lands on [2·min(a, 16 − b), 16]: it reaches 16, and its lower end comes from the end farther from 8. So moving only the ends of a band can claim too little (puzzles 2 and 4 break such claims; puzzle 3's band is on one half and its claim holds). After two moves the turns are at 4, 8 and 12, so the band 3 to 8 breaks the claim 0 to 12 through 4, while 5 to 8, inside one quarter, does not (puzzles 7 and 8).
- **Never narrower.** The landing band of [a, b] across 8 is twice its longer half wide: at least b − a, equal only when 8 is the band's middle, and at most twice b − a. A band on one half lands exactly twice as wide (puzzle 6).
- **For every n, not forever.** Near 0 each move doubles: T^k([0, q]) = [0, 2^k·q] while 2^(k−1)·q ≤ 8. So [0, q] stays in [0, 2] for n moves exactly when q ≤ 2/2ⁿ: 1/4 for three moves, 1/32 for six (puzzles 9, 10). Every named n has such a band, but no band with width works for every n.
- **Halving pieces fill the track.** One move stretches each piece of width 16/2^(n+1) (from a multiple of its width) onto a piece of width 16/2ⁿ, so each of the 2ⁿ pieces of width 16/2ⁿ is first full on move n. A band 2 wide is first full on move 3 exactly when it is one of the eight pieces 0 to 2, …, 14 to 16, and on move 4 otherwise; a band 1 wide on move 4 with whole ends and on move 5 with half-unit ends (puzzles 5, 11). Every band with width holds some piece, so every band eventually fills the track; a single point need not.

Positions are whole ticks of 1/32 unit, so every move is exact; a puzzle's grid is whole units, halves, or thirty-seconds on the enlarged ruler. For the break claims the grid of starts reaches the same lowest and highest landings as every start of the band (the turns of one and two moves are at whole units), so pins on the board certify the claim about every start, not only whole ones; the validator checks this by sampling.

## How a puzzle plays

The board is one track from 0 to 16 with a ruler under it. The **start row** on top holds what the child moves; each numbered row below is one more move. A marker's path is drawn through its landings, and a band's shading in a row shows every place its starts can be after that many moves (pine when it covers the whole track, outlined in the row where it is first full). A press on the start row goes to the nearest control; dragging moves it and the board follows; letting go is one move and one Undo. Arrow keys move a focused control one grid step, Home and End to the ends of its reach.

- **Pairs** (1). Two markers, yellow and blue, on whole numbers. Two different starts that land together are ringed and go on the shelf as a chip ("3 and 13") at once. That's all is judged on the press: a short shelf gets "There is another." and the button stays off until a new pair is kept.
- **Break** (2, 3, 4, 7, 8). A gray band of starts with one marker in it, and an ochre window on the last row: the claim that every start lands inside it, which is what moving only the ends gives. A landing outside turns red and solves the puzzle. Can't is off until the marker has moved; it gives no verdict, and the child pins the lowest and the highest landing. The two pins are judged together: right only when they are the lowest and the highest landing and both are inside the window. A wrong pair is refused ("A start lands lower.", "A start lands higher."), the pins clear, and the refusal stays (through Undo) until the marker moves or a new pin goes in.
- **Widest** (9, 10). The start row is the track from 0 to 1, drawn large, joined to its place on the track; the band runs from 0 to its dark right handle. The ochre window, 0 to 2, covers every row. Before Widest the marker is the app's: it sits on the band's right end, which goes farthest, so any escape shows red. Widest is off until the band has moved and gives no verdict; the marker then starts halfway along the band and the child pins the start that lands farthest. The pin is right only when it is the band's end and lands exactly on 2 after the last move: then nothing escapes and any wider band would. Otherwise "A start lands farther.", "A start lands outside." or "The band can be wider.". Moving the band takes Widest back.
- **Full on which move** (5) and **Just as wide** (6). Goal chips above the board ("First full on move 4", or a picture of a start band over the band it lands on). A goal is met the moment the band meets it, stays met through later moves and Undo, and the puzzle is solved when every goal is met. A goal the starting band already meets shows as met, which explains the chips; Undo after the last goal takes it back.
- **Pieces** (11). A band 2 wide slides on half units; each band first full on move 3 goes on the shelf as a small picture of the track. That's all as in puzzle 1.

Hints: the first is each puzzle's idea; then the mechanic names one move at a time, which Apply hint plays: a marker or band to a place, or Can't, Widest, Pin or That's all with the reason only ("The lowest landing is 2 and the highest is 12, both inside the window."), never "Press Can't"; a second Hint marks the button. For a claim that holds, the chain first tries the lowest landing. Hints never judge a single pin: after a first pin that is in no certificate, the next hint goes on to a lowest or highest landing ("The two pins are checked together."), the pair is refused, and the chain starts again.

## The puzzles

| # | Level | Mode | Board | Goal | Answer |
|---|---|---|---|---|---|
| 1 | Easy | pairs | two markers, whole numbers | every pair that lands together | 0 and 16, 1 and 15, …, 7 and 9 (eight) |
| 2 | Easy | break | band 6–10, one move | land anywhere but 12 | 7, 8 or 9 (14, 16, 14) |
| 3 | Easy | break | band 10–15, one move | land outside 2 to 12 | Can't: 15 lands on 2, 10 on 12 |
| 4 | Medium | break | band 6–11, one move | land outside 10 to 12 | 7, 8 or 9 |
| 5 | Medium | fill | band 1 wide, half units, 6 rows | first full on move 4 and on move 5 | whole ends (move 4; the start, 7 to 8, meets it), half-unit ends (move 5) |
| 6 | Medium | width | band with two ends, whole units | lands just as wide; half as wide again | 8 − h to 8 + h (eight bands); 5–9, 7–11, 2–10, 6–14 |
| 7 | Medium | break | band 3–8, two moves | land outside 0 to 12 | 4 (lands on 16) |
| 8 | Hard | break | band 5–8, two moves | land outside 0 to 12 | Can't: 8 lands on 0, 5 on 12 |
| 9 | Hard | widest | band from 0, three moves | stay from 0 to 2 | 0 to 1/4 |
| 10 | Hard | widest | band from 0, six moves | stay from 0 to 2 | 0 to 1/32 |
| 11 | Hard | pieces | band 2 wide, half units, 4 rows | every band first full on move 3 | 0–2, 2–4, …, 14–16 (eight) |

The break puzzles alternate without saying so in their titles: two claims break, one holds, and then the same claim after two moves breaks for 3 to 8 and holds for 5 to 8.

## Provenance

| # | Source |
|---|---|
| 1 | Week 92 Problem 1 ("Find every pair that meets after one move") |
| 2 | Problem 4 (the child who moves just the ends of 6 to 10; both land at 12) |
| 3 | Problem 2's second band, 10 to 15 |
| 4 | Problem 2's third band, 6 to 11 (ends give 10 to 12, the truth is 10 to 16) |
| 5 | Problem 3 ([1, 2] and the wider [7, 9] both take four moves), with the band's width fixed and its place chosen |
| 6 | Problem 5 (a band that keeps its width; could any become narrower?) |
| 7, 8 | New, from Problems 2 and 4, taken two moves |
| 9, 10 | Problems 6 (three and six moves, the enlarged 0–1 line) and 7 |
| 11 | Problem 8 (pieces A to N: halves, quarters, eighths) |

Research: Gerald Teschl, *Ordinary Differential Equations and Dynamical Systems*, §11.3 (the tent map's iterates, equations 11.13–11.14), the worksheet's own source.

## Files

| File | Contents |
|---|---|
| `dist/families/tent/tent.js` | The move, band images, answers, the `tent` mechanic's six modes, hints, drawing, drags and keys, and the module entry (no family of its own) |
| `dist/families/tent/tent.css` | The board in the Ruler strips look |
| `dist/families/tent/tent.json` | The pack, written by the builder; puzzles set `libraryFamily: "ranges"` and `group: "Fold and stretch"` |
| `scripts/build-tent.mjs` | The authoring list: computes every answer with the mechanic and checks the table above |
| `scripts/validate-tent.mjs` | Recomputes every answer with T(x) = 16 − \|2x − 16\| and bands sampled every 1/2048 unit (never the interval rule); checks that each break board's grid reaches every start's extremes; the claims in the grown-up notes; hint chains from fresh, after random play and after Undo; wrong presses and pins refused and kept through Undo; illegal moves; forged saves; every Undo press changing the screen |
| `tests/tent.test.mjs` | Unit tests |
| `scripts/tent-browser-smoke.mjs` | Drags, taps, keys, the shelf, Can't and Widest with their pins, goals and Apply hint in a browser, desktop and phone |

To change a puzzle, edit `scripts/build-tent.mjs`, then run `node scripts/build-tent.mjs`, `node scripts/validate-tent.mjs`, `npm test` and `npm run build`.

## Not yet done

1. **Watch for:** whether children read the numbered rows as "after this many moves" and the dashed path as one marker's journey, or try to drag in the rows (they are not controls).
2. **Watch for:** whether the break puzzles become a hunt for the middle of the band (the turn) after puzzle 2, and whether puzzle 8's Can't, after puzzle 7's break with the same claim, is a surprise that leads to "it does not pass through 4".
3. **Watch for:** whether the enlarged 0–1 ruler in puzzles 9 and 10 is read as part of the same track, and whether children halve the band or creep down one thirty-second at a time.
4. No playground: Ruler strips shows one per family. A free board with a marker, a band and any number of rows would suit the worksheet's K–1 route (hop whole-number starts until they reach 0).
5. Not ported: P1's second half (two starts that move apart for three moves in a row), P7 and P9's proofs, and the fixed point 32/3. A Can't certificate for "no band lands narrower" or "no band 2 wide needs five moves" would be a general argument, not a pin.
6. Not on the road; a keeper and Plume lines would come with a road change after children have played it.
