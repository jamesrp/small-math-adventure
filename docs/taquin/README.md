# Sliding numbers

October 23, 2026. Ten puzzles and a playground built from Week 90 of the Bellingham math circle (sliding number arrays, jeu de taquin). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 90 packet is unpiloted and physically unrehearsed. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-90.md) says keep, App fit B: the screen enforces "smaller", which removes paper's main risk; the solves are design (place 1–n so sliding reaches a target outline or an exact finish), two starts with one finish, and every start of a finish declared done; unreachable outlines have no child-checkable "can't", so every goal here is reachable; and auto-played slides, "will the other corner change it?" and a "3 of 5" counter are the pitfalls.

## The mathematics

A **board** is a skew shape λ/μ: a Young diagram λ (left-justified rows, none longer than the row above) with a smaller diagram μ missing from its top-left corner, drawn as gray squares. A **start** fills the white squares with 1, …, n so numbers grow to the right and down (a standard skew tableau).

- **A slide.** Open a gray corner (a gray square with no gray square right of it or below it) as the ring. The smaller of the numbers immediately right of the ring and below it moves in, and the ring moves to where it was; with one neighbour, that one moves. When neither neighbour holds a number, the ring's square leaves the board. A slide keeps every number, keeps rows and columns growing, removes one gray square and one outer square, and ends, because the ring only moves right or down.
- **The first fundamental theorem of jeu de taquin** (Schützenberger). Sliding until no gray square is left gives a straight standard tableau, the rectification, and it is the same whichever gray corner each slide opens. Children meet this as a surprise in the order puzzles (3 and 9): the ring's paths and the order in which squares leave the board differ, and the finish never does. The puzzles check it on every start and order of their boards; they do not prove it. The general proof (dual equivalence, or Knuth equivalence of reading words) is grown-up reading.
- **Rectification is insertion.** The finish is the Schensted insertion tableau of the start's reading word (rows left to right, bottom row first). The validator computes every answer this way, never by sliding.
- **Starts of a finish.** A finish does not always tell its start: on the D board two starts finish as 1 3 over 2 (puzzle 4). The number of starts of a finish T of shape ν depends only on the shapes: it is the Littlewood–Richardson coefficient c^λ_{μν}. Puzzles 4 and 7 have c = 2; on the B board every coefficient is 0 or 1, so every finish has one start (puzzle 10) and the 16 starts give 16 different finishes.
- **Which shapes appear.** The finished shapes are those ν with c^λ_{μν} > 0. With one gray square (puzzles 1 and 6) the finish is the board minus one outer corner (the Pieri rule). On (4, 2, 1)/(2, 1) a column of four never appears (puzzle 8): the finish has as many rows as the longest falling sequence in the reading word (Greene's theorem), and the top row's two numbers always rise. On the playground's 3 × 3 board with three gray squares every start finishes as the staircase 3, 2, 1, each of its 16 standard tableaux once.
- **Orders.** The orders of opening the gray squares are the ways to take μ apart corner by corner, the standard fillings of μ read backwards: 2 for μ = (2, 1), 3 for μ = (3, 1), 16 for (3, 2, 1).

Experiments come first: filling, sliding, watching which square leaves. Conjectures come from the shelf (order never changes the finish; two starts can share a finish; some shapes never appear). Explanations are grown-up conversations in each puzzle's notes: where 1 can go (puzzle 2), the ring travelling along the top row (puzzle 1), one outer corner per slide (puzzle 6), and the falling sequence (puzzle 8).

## Why a new family

The closest families are **Joining strips** (Week 54: partitions drawn as rows of squares, with Flip for conjugation), **Chip firing** (Week 11: a finish that does not depend on the order) and **Sorting machines** (Week 23: comparing numbers on a fixed network). None has numbers filling a grid with a hole to slide into. A Joining strips group would put a numbered grid with a ring on a bench built for unnumbered strips that join and halve, with no shared move, rule or certificate; Chip firing's object is a graph with a sink. The object here (a standard skew tableau) and the move (a slide into a hole, the smaller neighbour first) are new, so Sliding numbers is its own family on the seam, symbol ◰ (a square with its top-left corner missing).

## Where they appear

**Puzzles → Sliding numbers** (symbol ◰) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

Boards are written outer/inner. A = (3, 2)/(1), D = (3, 2, 1)/(2, 1), B = (3, 3, 2)/(2, 1) are the worksheet's; P = (3, 2, 1)/(1), W = (4, 2, 1)/(2, 1) and T = (4, 3, 1)/(3, 1) are new. Starts are listed in reading order.

| # | Level | Title | Kind | Board | Goal | Answer | Week 90 source |
|---|---|---|---|---|---|---|---|
| 1 | Easy | A goal shape | Design | A | Finish as 2, 2 | 2 of 5 starts do | Problem 1, as a design (Problem 4's question on A) |
| 2 | Easy | Every start | Every start, shelved by finished shape | A | — | 5 (3 + 2) | Problem 2 |
| 3 | Easy | Which corner first | Every order | D, start 1, 3, 2 (card D2) | — | 2 orders, one finish 1 3 / 2 | Problem 3 |
| 4 | Medium | Same finish | Every start of a finish | D | 1 3 / 2 | 2 (D2, D5) | Problem 6 |
| 5 | Medium | Goal shapes | Design, three goals | B | 3, 2; 3, 1, 1; 2, 2, 1 | every start meets one | Problem 4 |
| 6 | Medium | One gray square | Every shape | P | — | 3 | New, after Problem 4 |
| 7 | Medium | Another finish | Every start of a finish | W | 1 2 4 / 3 | 2 | New, extends Problem 6 |
| 8 | Hard | Three gray squares | Every shape | W | — | 4 (never a column) | New, after Problems 4–5 |
| 9 | Hard | Many ways to open | Every order | T, start 1, 3, 4, 2 | — | 3 orders, one finish 1 3 4 / 2 | New, extends Problem 3 |
| 10 | Hard | Exactly this finish | Design, exact finish | B | 1 2 4 / 3 5 | 1 start | Problems 6 (last question) and 7 |

The worksheets are in [math-circle-worksheets, week 90](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-90); each puzzle's `provenance` names its problem. Not ported: Problem 7's backward slides as a move (puzzle 10 asks for the same reasoning), Problem 8's larger-number rule (the app refuses it, so the counterexample would need a second mechanic) and Problem 9's three proofs (in the notes).

## How a puzzle plays

- **Placing.** The board starts with its gray squares and empty white squares; the next number sits in a tile under the board. Tap a white square to put it there. A square whose neighbour above or to the left is still empty is refused: those empty squares are marked and "Numbers grow right and down." shows until the next move. So every start is increasing, and 1 can only go where nothing is above it or left of it. Sliding waits until every number is placed. The order puzzles (3 and 9) start filled.
- **Opening.** Gray corners show a dashed ring. Tap one to open it: it becomes the ring. A gray square that is not a corner is refused, its blocking gray squares marked, "Only a gray corner opens."
- **Sliding.** The numbers right of the ring and below it get a pine outline. Tap the smaller: it glides into the ring (no glide with reduced motion). The larger is refused: both are marked, "The smaller number slides." Nothing slides by itself, and nothing is predicted. When no number is right of the ring or below it, its square leaves the board and stays drawn as a dashed square for the rest of the run, so the finished outline and the squares that left are both visible.
- **A finished run** counts at once. In a design puzzle a goal it meets turns green with a ✓ (a goal it misses turns the frame red); the run that meets the last goal solves the puzzle. In the catalogs it joins the shelf if it is new: starts (puzzle 2, in columns headed by their finished shape; puzzles 4 and 7, only when they finish like the goal, which otherwise turns red), shapes (6, 8), or orders (3, 9, a small gray picture with the order the squares opened in pine discs, so it does not read as tiles, an arrow and the finish, which is the same on every one). The item the run made is ringed on the shelf. **New run** empties the board (puts the start back in 3 and 9) and keeps the shelf.
- **That's all** judges the shelf once. It is off while the shelf is empty; an incomplete shelf gets "There is another." and stays off until a new item joins. No slots, no count.
- **Copy.** Design puzzles show no objective: the goal frame and the board carry the task. Catalogs show one line ("Fill the board every way you can.", "Find every start that finishes like the goal.", "Find every shape the numbers can finish in.", "Find every order to open the gray squares."). How to play has the rules and controls.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name one move: "Put 3 in the second row." (each row has at most one square that can take the next number), "Open the gray corner in the top row.", "Slide the 2.", "Press New run." (with the reason when the start on the board adds nothing: "This start finishes another way.", "You have this start."), or "Every start is found." with That's all as the move. They aim at a start, shape or order not yet found. Level 2 marks the square or button, level 3 offers Apply hint. Hints alone finish every puzzle from a fresh start, after random play and after Undo.
- **Keyboard.** Every square that is a control is a button with a spoken label; after a move focus falls back to the first square button, then New run or That's all.

## The playground

Seven boards to choose from (A, D, B, P, W, T and a 3 × 3 board with three gray squares), placing and sliding as in the puzzles, and New run. No goal, no Hint, never solved. It is the place for the order question on any start, for two starts with one finish on D, and for the 3 × 3 board, where every start finishes as the staircase.

## Rules that keep the record honest

- The save holds where each number was placed (`place`, cell indices in order 1, 2, …), every tap since (`steps`: corners opened and numbers slid, as [row, column]), and the shelf, `more` and `done` (catalogs), the goals met (`reached`, design) or the board (`shape`, playground). The grid is always replayed from these, so a save with an illegal placing, a corner that is not one, or the larger number slid cannot load.
- A shelf must hold different items that are answers (standard starts; starts of the goal; shapes that appear; orders that are orders); `more` only while it is incomplete and not empty; `done` only when complete.
- Only legal moves are accepted: a placing where the squares above and left hold numbers; an opening only with every number placed, no ring out, at a gray corner; a slide only of the smaller neighbour; New run only once something has happened; That's all only in catalogs, with a shelf and not twice on one shelf; a board change only in the playground; nothing after a solve.
- Undo takes back placings, openings and slides, never a discovery: the shelf, the goals met and a refused That's all stay (`carry`). Every Undo press changes the screen (checked by the validator on random play, after a refusal).
- The answers are computed by `scripts/build-taquin.mjs` with the mechanic's own helpers and checked again by `scripts/validate-taquin.mjs` by insertion.

## Files

| File | Contents |
|---|---|
| `dist/families/taquin/taquin.js` | Shapes, starts, corners, slides, rectification, corner orders, the run replayed from the save, answers, the `taquin` mechanic (moves, hints, taps and refusals, rendering, the glide) and the family entry |
| `dist/families/taquin/taquin.css` | Tiles, gray and gone squares, the ring, goals, the shelf and the board picker, in the shared board look |
| `dist/families/taquin/taquin.json` | The pack: a playground, 10 puzzles, 1 family and 3 sources |
| `scripts/build-taquin.mjs` | Authoring list; computes answers, checks one finish per start in every order and writes `taquin.json` |
| `scripts/validate-taquin.mjs` | Starts as filtered permutations; finishes by Schensted insertion of the reading word; orders as filtered permutations, counted by the hook length formula; every start in every order played through the engine and compared with insertion (155 runs); answers, counts and the notes' claims (counts depend only on shapes, the Pieri shapes, no column of four on W and no reading word there falling four times, the 3 × 3 staircase, the unique start of puzzle 10, the 16 orders of a staircase); That's all and its refusal kept through New run and Undo; Undo keeping goals met; every Undo press changing the screen; illegal moves; forged saves; copy that gives no count away; hint chains from fresh, after random play and after Undo; the playground. Run by `npm run build` |
| `tests/taquin.test.mjs` | The worksheet's worked example and its A, B and D tables, corners and orders, placing and its refusal, the smaller-number rule, a refusal belonging to its board, the shelf, orders, starts of a finish and goals, hints, saves, rendering and the playground |
| `scripts/taquin-browser-smoke.mjs` | The interface in a browser: placing and its refusal, opening, a larger number refused, a miss and New run, a solve, the shelf with That's all refused and kept through Undo, the order puzzle, keyboard play, the playground and no page overflow. `TEST_PHONE=1` for touch on a phone; `SHOTS=<dir>` saves tablet and phone screenshots |

To change a puzzle, edit `scripts/build-taquin.mjs`, then run `node scripts/build-taquin.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 90: Sliding number arrays, student packet W90-students-v1 (Problems 1–7), materials and adult guide W90-FAC-v1; unpiloted.
- The Week 90 review card and math check (October 23, 2026), its App fit and pitfalls, and its preimage counts (D: 2, 2, 1, 1; B: 1 each).
- Colleen Robichaux, Harshit Yadav and Alexander Yong, *Equivariant cohomology, Schubert calculus, and edge labeled tableaux*, §3: slides J1/J2, Theorem 3.1 and Example 3.2 (order independence), Theorem 3.3 and Example 3.4 (preimage counts), as the worksheet's sources cite. Boards P, W and T and the 3 × 3 playground board are new; A, B and D and cards D2 and the target 13/2 are the worksheet's.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Three things to watch: whether children read the dashed ring as "open here" and find the smaller-number tap without help, or keep tapping the larger number; whether the order puzzles' sameness lands as a surprise or the shelf's order pictures (gray squares with 1, 2, 3 in pine discs, drawn apart from the tile numbers since October 23 after a play-through review found plain numerals could read as a board) go unread; and whether the long catalogs (puzzles 2 and 8, five and four answers with up to twelve starts to try) are organized or done by trial until That's all accepts.
- **Reading and K–1.** The card notes the worksheet has no K–1 route. Puzzles 1–3 need only comparing numbers to 5 and tapping, but they are grade-free and untested with young children; the hint text names rows ("the second row"), which a grown-up may need to read.
- **Backward slides.** Problem 7's undo of one slide (larger number up or left, from the exit) is not a move here; puzzle 10 asks for the same reasoning without it. A later group could make the backward slide a move, with the exit square marked, and ask for every start of a finish by undoing.
- **Larger rule.** Problem 8 (the larger number slides, and order breaks) needs a second rule the app would have to allow; it stays on paper.
- **Story.** Not on the Lantern Road; no keeper lines. Stars come only once a road stop uses it.
