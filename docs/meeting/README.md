# Meeting roads

October 10, 2026. Twelve puzzles and a playground built from Week 67 of the Bellingham math circle (meeting on shortest roads). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 67 worksheet is an unpiloted prototype awaiting organizer review. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-67.md) says keep, and its App fit shaped this family: the difficulty is in the maps, a meeting is checked only when all three walkers stand on one dot (no per-pair lights while walking), the find-every puzzles end with That's all and no count, and nothing scores total travel. The maps of puzzles 2, 3, 4, 5, 6 and 10 are the worksheet's; the others are new or come from the worksheet's questions or the card's fixes, as each puzzle's `provenance` says.

## The mathematics

Three homes A, B and C sit on dots of a road map, and every road is one step; d(X, Y) is the fewest steps from X to Y. A dot M is a **meeting dot** when each pair of homes has a shortest route through it:

d(A, M) + d(M, B) = d(A, B), d(A, M) + d(M, C) = d(A, C), d(B, M) + d(M, C) = d(B, C).

M may be a home. The test asks for *some* shortest route through M for each pair, not every one.

- **Full grids: exactly one.** On a full rectangular grid, d is the steps across plus the steps up, and M is on a shortest route between two dots exactly when its column is between theirs and its row is between theirs. For three numbers, the only number between each two of them is their middle one. So the meeting dot is the middle column of the homes with the middle row, and it exists and is unique, even when columns or rows repeat. The proof goes one coordinate at a time and needs the full grid: no missing roads, no diagonals (puzzles 1, 2, 5 and 8; every one of the 2,300 triples of different dots on the 5 × 5 grid has exactly one).
- **Trees: exactly one.** In a tree there is exactly one path between two dots, so M must be on all three paths. The three paths form a tripod, and its centre is the only dot on all three (puzzle 3; every triple on the puzzle's tree).
- **The cube: exactly one.** Label the eight corners of a cube by three binary digits, a road changing one digit; d is the number of places where two labels differ. A shortest route never changes a digit where its two ends agree, so the meeting label must agree with any two homes that agree, and in each place at least two of three homes agree: the meeting label is the majority digit in each place. The majority of three digits is their middle value, so this is the grid rule on a 2 × 2 × 2 grid (puzzles 6 and 7; all 56 triples). In each place at most one home differs from the majority, so the meeting label is never two steps from every home; but it need not be next to all three (puzzle 7: 000, 001 and 111 meet at 001, B's home, two steps from 111).
- **Other maps: none, or more than one.** On a triangle every pair is one road apart and no dot is on all three roads, so none works (puzzle 10). On the 3 × 3 grid with its centre removed (a ring of eight), 8 of the 56 triples have none, among them the homes of puzzle 11. Two crossroads each joined to A, B and C give two meeting dots (puzzle 9). Closing one road of a full grid can leave none (puzzle 12: only one of its twelve roads does it).
- **Not total travel.** A dot with the least total travel from the homes always exists, and on full grids it is the meeting dot, but it is a different test: on the triangle every dot has the least total travel and none is a meeting dot. No puzzle scores total travel.

These are **medians**: a vertex on a geodesic between each two of three vertices. Graphs in which every three vertices have exactly one median are **median graphs**; grids, trees and hypercubes are the basic examples, and the triangle, the ring of eight and the two crossroads (K(2, 3)) are not (Druţu and Kapovich, *Geometric Group Theory*, Definitions 6.1–6.3 and Examples 6.19, printed pages 177–180, as the worksheet guide cites).

**The app's representation.** The worksheet has children place a meeting counter and draw a shortest route for each pair through it. The app uses the equivalent tripod: each home has a walker, and the child walks the three walkers until they stand on one dot. Any two walks joined there make a route between their homes, and the dot works when all three joined routes are shortest. That is exactly the worksheet's test: if the walks of X and Y together take d(X, Y) steps, then since each walk takes at least d(X, M) and d(M, Y), each walk is shortest and M is on a shortest X–Y route; conversely, three shortest walks to a meeting dot pass every pair.

Experiments come first: walk the three walkers, meet, and see which joined route is too long. The conjectures (on a grid the middle column and middle row; on the cube the majority digit; only one ever on these maps; none or two on others) come from meeting, failing and finding every dot. The explanations (one coordinate at a time, the tripod, the majority) are grown-up conversations in each puzzle's notes. The worksheet's written proof (Problem 5) stays on paper.

## Where they appear

**Puzzles → Meeting roads** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)) and the shared graph board ([graph-board.md](../graph-board.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). Coordinates are (x, y) with (0, 0) at the bottom left, as on the worksheet; the tree's dots are named in [The maps](#the-maps) below.

| # | Level | Kind | Map | Homes A, B, C | Answer | Pair distances AB, AC, BC | Week 67 source |
|---|---|---|---|---|---|---|---|
| 1 | Easy | Meet | 3 × 3 grid | (0,0), (2,0), (1,2) | (1,0) | 2, 3, 3 | New, a warm-up before Problem 1 |
| 2 | Easy | Meet | 5 × 5 grid | (0,0), (4,1), (1,4) | (1,1) | 5, 5, 6 | Problem 1, left board |
| 3 | Easy | Meet | Tree | a, b, c | v, two steps from each | 4, 4, 4 | Problem 3, the tree |
| 4 | Easy | Meet | Square | three corners | B, a home | 1, 2, 1 | Problem 3, the square |
| 5 | Medium | Meet | 5 × 5 grid | (0,3), (4,0), (4,4) | (4,3), on the edge | 7, 5, 4 | Problem 1, right board |
| 6 | Medium | Meet | Cube | 000, 110, 101 | 100 | 2, 2, 2 | Problem 4, left map |
| 7 | Medium | Meet | Cube | 000, 001, 111 | 001, a home not next to 111 | 1, 3, 2 | The review card's fix 3 |
| 8 | Medium | Every | 5 × 5 grid | (0,4), (3,0), (4,3) | (3,3) only | 7, 5, 4 | Problem 2, "Can you make more than one work?" |
| 9 | Hard | Every | Two crossroads X, Y, each joined to A, B, C | A, B, C | X and Y | 2, 2, 2 | The review card's fix 7 |
| 10 | Hard | Every | Triangle | A, B, C | None | 1, 1, 1 | Problem 3, the triangle |
| 11 | Hard | Every | Ring of eight (3 × 3 grid, no centre) | (0,0), (0,2), (2,1) | None | 2, 3, 3 | Problem 2, "no meeting dot", moved to a map where it happens |
| 12 | Hard | Close 1 road | 3 × 3 grid | (0,0), (0,2), (1,1) | Close (0,1)–(1,1), the only road that works | 2, 2, 2 | New, the card's "cut a road so no dot works" |

The worksheets are in [math-circle-worksheets, week 67](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-67). Puzzles 2, 3, 4, 5, 6 and 10 use the worksheet's maps and homes; 8 and 11 ask the worksheet's Problem 2 questions (11 on a new map, the grid without its centre); 7 and 9 are the review card's fixes 3 and 7; 1 and 12 are new.

### The maps

Grids have no labels in their dots. The tree's dots are a (0,0), u (1,0), v (2,0), w (3,0), b (4,1), t (2,1), c (2,2), s (3,−1), r (4,−1) and q (0,1), with roads a–u, u–v, v–w, w–b, v–t, t–c, w–s, s–r and u–q; the branches u–q and w–s–r are the worksheet's decoys. The square is the worksheet's, with B at the corner next to A and C. The cube is drawn as the worksheet draws it, two offset squares joined at the corners, with every dot labelled by its three digits; its two crossings are away from the dots. The triangle is drawn equilateral; the ring of eight is the 3 × 3 grid without its centre dot and four roads.

## How a puzzle plays

- **The board.** Homes are dots ringed in sun (A), sky (B) and rose (C) with their letter; on the cube the ring is round the label. Each walker is a disc of its home's colour with its letter, standing on a dot; two walkers on one dot stand side by side, and three stand in a little triangle. Each walker's trail is drawn along the roads it has walked, in its colour; trails sharing a road are drawn side by side.
- **Walking.** Tap A, B or C above the map to choose a walker (it gets a pine ring), or tap the dot where another walker stands or lives. Then tap a dot next to the chosen walker, or the road between, to take a step; the dots it can step to are tinted. A finger can also slide from dot to dot. A tap on the dot the walker just left takes that step back, so a walk never turns straight back; Undo takes back the last move of any walker. Arrow keys move the chosen walker along the road that points most nearly that way, and Tab with Enter or Space works on every dot and road. Walks may be any length up to 16 steps; there is no step budget, since only the joined routes being shortest matters.
- **Meeting.** Nothing is checked until all three walkers stand on one dot. Then the three joined routes are checked at once. If all are shortest, that dot is a meeting dot: a one-answer puzzle is solved (the dot gets a pine ring), and in a find-every puzzle the dot keeps a pine ring and the walkers go home. If a joined route is too long, the walkers stay, a dashed ink line shows one shortest route between that pair's homes, and "Too long for A and B." names the pair. A pair whose routes miss the dot is named before one that fails only because a walk wandered.
- **Find every** (puzzles 8 to 11). Each meeting dot found keeps its ring; meeting again at one gives "Found already." and sends the walkers home. **That's all** says "There is another." until every meeting dot is found, and then waits for a new one; with no meeting dot at all (10, 11) it is right at once. There are no empty slots and no count. Undo keeps the dots found.
- **Close** (puzzle 12). There are no walkers. Tap a road to close it (a red bar across it) and again to open it; a slot shows how many roads may be closed. A closure that would cut the map in two is refused. **No dot works** is accepted when no dot is a meeting dot; otherwise "This dot still works." appears with the meeting dot ringed and a shortest walk to it from each home, until a road changes.
- **Copy.** Puzzles 1 to 7 show no objective: the homes and walkers show the task, and How to play gives the rule ("Bring the three walkers to one dot so that any two walks together make a shortest route between their homes."). Puzzles 8 to 11 show "Find every meeting dot." and puzzle 12 "Close one road so no dot works."
- **Hints.** Before any move, the first hint is the authored nudge. Then hints aim at the meeting dot (in a find-every puzzle, the one not yet found that needs the fewest steps from here, counting steps taken back): first "Take A back one step." for a walk that has left every shortest walk to it, then the next step of the walker furthest from it, in words ("Move B one step up.", "Move A to 100."), and "Press That's all." when none is left. In puzzle 12 they open a wrong road, name the road to close ("Close the road from C going left.") and then "Press No dot works.". The second level marks the walker and the dot or road on the board, and the third offers Apply hint. Hints alone finish every puzzle, from a fresh start, after a wasted step, after a wrong That's all, after a meeting at a wrong dot and after a wrong closure. A step that is not on a shortest walk is never flagged unless a hint is asked for: a live warning would turn tapping every neighbour into a strategy.

## The playground

The 5 × 5 grid, the tree and the cube, chosen with three map buttons, each starting with homes that have one meeting dot. Walkers and meetings work as in the puzzles, and meeting dots found keep their rings. **Homes** switches to moving homes: tap a home (or A, B or C) to choose it, then any other dot to move it there; the walkers go home and the rings clear. Press Homes again to walk. There is no goal and no Hint, and it never counts as solved. This is Problem 2's "Challenge your partner".

## Rules that keep the record honest

- The save is the walks (each the list of dots a walker has visited from its home), the meeting dots found, the answer to That's all and the done flag; or, in puzzle 12, the roads closed and the answer to No dot works; or, in the playground, the map and the homes as well. Everything shown, including which pair is too long and the dashed route, is derived from it.
- Only legal moves are accepted: a step along a road from the walker's end, a step back only to the dot just left, walks up to 16 steps, That's all only in find-every puzzles and not twice without a new dot, closures within the budget that keep the map in one piece, No dot works not twice without a change, homes only onto free dots, and nothing after a solve.
- Saved boards are checked: walks start at their homes, follow roads, never turn straight back and stay within 16 steps; every dot found is a meeting dot, found once; the walkers never rest together on a meeting dot in a find-every puzzle (it would have been kept); "There is another." only while one is missing; "Found already." only for a dot found, with the walkers home; done only with every dot found; closures within the budget, in order, keeping the map in one piece; a kept claim only when no dot works and a refusal only when one does.
- The answers, pair distances, witness walks and the one working closure are computed by `scripts/build-meeting.mjs` with the mechanic's breadth-first search, and checked again by `scripts/validate-meeting.mjs` by other methods.

## Files

| File | Contents |
|---|---|
| `dist/families/meeting/meeting.js` | Distances, meeting dots, walks and meetings, the closures that leave no meeting dot, the `meeting` mechanic (moves, hints, rendering, taps, slides and arrow keys) and the playground |
| `dist/families/meeting/meeting.css` | Homes, walkers, trails, the dashed shorter route, rings, bars, slots and the playground's map buttons; imports the shared graph board styles |
| `dist/families/meeting/meeting.json` | The pack: a playground, 12 puzzles, 1 family and 3 sources |
| `scripts/build-meeting.mjs` | Authoring list and maps; checks every answer, pair distance and the closure against the table above and writes `meeting.json` |
| `scripts/validate-meeting.mjs` | Answers by Floyd–Warshall and the pair test, the coordinate median on grids, the tripod's centre on the tree (depth-first paths) and the majority label on the cube; every triple of different homes on the 5 × 5 grid (2,300, each with exactly one), the tree (120), the cube (56) and the ring of eight (8 of 56 with none); every single closure in puzzle 12; witnesses as moves; found already, there is another and That's all; hint chains from fresh, after a wasted step, after a wrong That's all, after a meeting at a wrong dot, after wandering and after every wrong closure; illegal moves; forged saves; the playground; run by `npm run build` |
| `tests/meeting.test.mjs` | Meeting dots on every map, walking and stepping back, taps and choosing, meetings that work and that are too long, find every and Undo, closing, hints, arrow keys, the playground, saves and rendering |
| `scripts/meeting-browser-smoke.mjs` | The interface in a browser: taps, a slide, keys, chips, a meeting that is too long and its dashed route, Undo, a solve, That's all, closing and No dot works, refusals and the playground's Homes; `TEST_PHONE=1` for touch on a phone |

To change a puzzle, edit `scripts/build-meeting.mjs`, then run `node scripts/build-meeting.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children, and the worksheet is unpiloted. Three things to watch: whether children plan a meeting dot before walking, or walk all three to a guess and read the dashed line and "Too long for A and B." as a clue rather than a scolding; whether choosing a walker (the A, B, C buttons, or tapping its dot) is found without help, and whether tapping back along a trail to take steps back is discovered or Undo is used instead; and whether the find-every puzzles with no meeting dot (10 and 11) feel like a discovery or like pressing That's all as a guess.
- **Many taps.** A meeting on the 5 × 5 grid takes up to a dozen steps, and a wrong guess as many to undo. If that drags, a "Walkers home" button, or a long slide that walks a whole route, could help.
- **Story.** Not on the Lantern Road; no keeper lines.
- **Grade levels.** Grade-free; not yet in a K–1, 2–3 or 4–5 trail. The review card suggests a K–1 version with two homes on a 3 × 3 grid ("every dot where the walk can stop and still be shortest"), which this family does not have.
- **Paper only.** The worksheet's written rule for the cube (Problem 5) and the proof of uniqueness stay on paper, as do Week 69's thin triangles, which share the three homes.
