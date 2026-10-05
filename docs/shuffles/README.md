# Ticket shuffles

October 5, 2026. Nine puzzles and a playground built from Week 43 of the Bellingham math circle (shuffling picture cards: which ticket-and-swap rules give every order the same chance). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 43 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-43.md) says revise, for a K–1 problem whose page and guide expect different answers; it finds the mathematics and the problems right and asks the app for a "story player" on the shared case engine. The worksheet's picture cards become the lettered cups from Cup swaps and Mixed-up cups, standing in numbered slots.

## The mathematics

Cups stand in numbered slots. A **rule** is a list of steps; each step has a slot and a cup of tickets naming slots. At each step one ticket is drawn and the step's slot swaps with the slot on the ticket (a ticket for the slot itself changes nothing). The tickets drawn, in order, are a **story**. If the ticket cups hold s₁, s₂, … tickets, the rule has s₁ · s₂ · … stories, all equally likely. A rule is **fair** when every order of the cups comes from the same number of stories.

- **Itself or later (Fisher and Yates).** Slot 1 swaps with any of slots 1…n, then slot 2 with any of 2…n, and so on. There are n · (n − 1) · … · 2 = n! stories, and every order of the cups comes from exactly one: slot 1 is settled by the first ticket and never touched again, so the first ticket must fetch the cup the target wants in slot 1; then slot 2's ticket must fetch the next cup from wherever it now stands, and so on. Each ticket is forced, from any starting order. Knuth's Algorithm P is the same rule run from the last slot down.
- **Any slot.** Every slot swaps with any of the n slots. There are nⁿ stories, and n! does not divide nⁿ for n ≥ 3 (n − 1 divides n! but shares no factor with nⁿ), so the stories can't split evenly among the orders: the rule is unfair whatever happens. For three cups the 27 stories make A B C, A C B, B A C, B C A, C A B and C B A 4, 5, 5, 5, 4 and 4 times.
- **Never itself (Sattolo).** Slot k swaps with any of slots k + 1…n. It makes (n − 1)! stories, each a different order, and the orders it makes are exactly those that move every cup round one loop: B C A and C A B for three cups.
- **Designing a fair rule.** For every order of four cups to come from exactly one story there must be exactly 24 stories, so with three steps (slots 1, 2, 3) the ticket cups hold 4, 3 and 2 tickets in some arrangement; then no two stories may meet. Of the 15³ = 3,375 ways to fill three cups from tickets 1–4, exactly six pass: 1234 / 234 / 34 (Fisher–Yates), 1234 / 24 / 234, 14 / 124 / 1234, 14 / 1234 / 134, 124 / 24 / 1234 and 134 / 1234 / 34.

Experiments come first: a child draws tickets and watches the cups move. A complete list of stories, sorted into a column per order, establishes fairness for a small rule; the columns of the any-slot rule show the 4s and 5s. The general arguments (the forced reading of a story, the divisibility, the loops) are in the grown-up notes; the puzzles never ask for a written proof. `scripts/validate-shuffles.mjs` checks every claim above with a separate simulation: Fisher–Yates for two to six cups (and from every start for up to four), Sattolo's loops for two to six, the divisibility for three to eight, the 27-story split, and all 3,375 four-cup designs.

## Where they appear

**Puzzles → Ticket shuffles** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Rule | Task | Answer | Week 43 source |
|---|---|---|---|---|---|
| 1 | Make C A B | Itself or later, 3 cups | Make a row | 3, 3 | K–1 P3, 2–3 P3 |
| 2 | Every story | Itself or later, from A B C | Keep every story | 6, one per order | 2–3 P2, 4–5 P2 |
| 3 | Start from B A C | Itself or later, from B A C | Keep every story | 6, one per order | 2–3 P3, 4–5 P3 |
| 4 | Ticket 1 is lost | Slot 1 with 2 or 3, slot 2 with 2 or 3 | Keep every row it makes | B A C, B C A, C A B, C B A | K–1 P4 |
| 5 | Never itself | Slot 1 with 2 or 3, slot 2 with 3 | Keep every row it makes | B C A, C A B | 4–5 P5 |
| 6 | Any slot: A B C | Any slot, 3 steps | Keep every story ending A B C | 123, 132, 213, 321 | 2–3 P5 |
| 7 | Any slot: A C B | Any slot, 3 steps | Keep every story ending A C B | 122, 133, 212, 231, 311 | 2–3 P6, 4–5 P4 |
| 8 | Make B D A C | Itself or later, 4 cups | Make a row | 2, 4, 4 | 4–5 P6 |
| 9 | Design a fair shuffle | Slots 1, 2, 3 of 4 cups | Choose the tickets | Any of the six designs | 4–5 P6 |

Puzzles 1 and 8 are new targets, and puzzle 9 fixes the worksheet's open design to three steps on slots 1, 2 and 3; the rules and the other questions are the worksheet's. Puzzle 4 asks for the rows that remain, where the worksheet asks which become impossible. Puzzles 6 and 7 together show the any-slot rule's unequal columns without listing all 27 stories: the catalog after each solve shows the rest. Each puzzle's `provenance` names its problems.

## How a puzzle plays

- **The board.** Lettered cups stand over numbered slots. Below them, one ticket cup per step reads "Swap slot k with" and holds that step's tickets. The cup in this step's slot is lifted; only it and the cups its tickets name can be used.
- **Drawing.** Tap a ticket, or tap the cup in that ticket's slot (tapping the lifted cup itself draws its own slot, when that is one of the tickets), or drag the lifted cup onto another. The two cups swap and the next step's ticket cup opens. The drawn ticket stays pressed, so the story stays on screen. **Again** puts the cups back.
- **Make a row** (puzzles 1 and 8) is solved when the cups match the row.
- **Find every** (puzzles 2–7). **Keep** puts the finished story, or the row it made, on the shelf. It is greyed out while the story isn't finished, doesn't count or is already kept. In puzzles 2 and 3 the shelf has a column for each order from the start, and each story lands under the order it makes; tap a kept story to play it again. **That's all** is the claim: if something is missing it says "There's another." and stays greyed until something new is kept. Nothing shows how many there are. When everything is kept, That's all solves the puzzle and the catalog appears: every row, the ones the rule makes in green (puzzles 4 and 5), or all 27 stories in columns by the order they make, the target's in green (6 and 7).
- **Design** (puzzle 9). The cups are a picture; the tickets are switches, in their step's cup or out of it (a cup always keeps at least one). **Try it** runs every story at once. A rule that fails shows why: two stories that make the same order, or an order no story makes. A rule that passes solves the puzzle, and the catalog shows its 24 stories, one per order.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the next ticket of the first story, in ticket order, that leads somewhere new ("Swap slot 2 with slot 3."), Keep, Again or That's all; in puzzle 9 they move one ticket toward the nearest passing design ("Take ticket 1 out of the cup for slot 2."), then Try it. The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

Three or four cups and three rules: **Itself or later**, **Any slot** and **Never itself**. Draw tickets by hand, or press **Draw** to finish the story at random. **Keep** puts any story in the column for the order it makes, with a column for every order; tap a kept story to play it again. **Clear** empties the shelf. There is no goal, no Hint, and it never counts as solved. A chart of random draws is evidence for a hunch, not a proof; the puzzles carry the proofs.

## Rules that keep the record honest

- Only legal moves are accepted: no ticket outside the step's cup or after the last step, no keeping an unfinished story, one that doesn't count or one already kept, no loading a kept row (a row may have several stories) or a story that isn't kept, no That's all with nothing kept or twice in a row, no emptying a design's ticket cup, no Try it twice without a change, and no moves after a solve.
- A save is rejected if its story uses a ticket outside its step's cup or is too long, a kept story or row is repeated or doesn't count, That's all was accepted with something missing, or a design's ticket cups are empty, repeated, out of order or out of range.
- Undo takes back the last action, a Keep or a design change included.

## Files

| File | Contents |
|---|---|
| `dist/families/shuffles/shuffles.js` | Stories and how they move the cups, the rules' tallies and the design check, the `shuffles` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/shuffles/shuffles.css` | The ticket cups, story pictures and the design verdict; imports `dist/cases.css` |
| `dist/families/shuffles/shuffles.json` | The pack: 9 puzzles, the playground, 1 family and 3 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine and cups ([cases.md](../cases.md)); this family added `product` and numbered slots |
| `scripts/build-shuffles.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-shuffles.mjs` | A separate simulation (cups as an array, stories counted in mixed radix); the theorems above; each puzzle's answers; that hints alone solve every puzzle; illegal moves; That's all early and twice; Load and Undo; forged saves; the playground; run by `npm run build` |
| `scripts/shuffles-browser-smoke.mjs` | Plays the family in a browser: tickets, cup taps, the lifted cup, a drag (a touch drag with `TEST_PHONE=1`), a cup outside the ticket cup, Again, Keep, That's all, Load, Undo, two hint solves with their catalogs, the design's verdict and solve, and the playground |
| `tests/shuffles.test.mjs` | Stories, moves, hints, rendering, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-shuffles.mjs`, then run `node scripts/build-shuffles.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children see that the lifted cup is the one that swaps and the ticket names the other slot, and which way they prefer to draw (ticket or cup); whether puzzles 6 and 7 stay puzzles or turn into trying stories at random among 27; and whether the design verdict ("These make the same order.") leads a child to change a ticket cup's size, or only to toggling and trying again.
- **A demo.** The plan gives each family a few-second demo of its move; this one has none yet. A demo here would draw a ticket and swap two cups.
- **Five cups.** The worksheet's 4–5 Problem 7 designs a five-card shuffle (120 stories); a five-cup design puzzle would need a catalog of 120 and is left out.
- **The card shuffle itself.** The worksheet opens with drawing cards out of a cup one at a time (every row once, because each draw removes a card). Itself or later is that chooser done in place, so it is not a separate puzzle.
- **Story.** Ticket shuffles is not on the Lantern Road and has no keeper lines.
