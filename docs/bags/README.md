# Fair bags

October 5, 2026. Eight puzzles and a playground built from Week 42 of the Bellingham math circle (fair results from a bag of red and blue counters). They are in the puzzle satchel only, not on the Lantern Road. No child has played them; the Week 42 worksheets are unpiloted too. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-42.md) says keep, App fit B, size S ("a short set rather than twelve puzzles"), and asks that a tap move a whole colour pair, never a single marked pair.

## The mathematics

A bag holds r red and b blue counters, numbered within each colour. Two counters are drawn in order, each counter as likely as any other, and the first goes back before the second is drawn. The (r + b)² **marked pairs**, such as red 2 then blue 1, are equally likely. The four **colour pairs** are not: red-red, red-blue, blue-red and blue-blue come r², rb, br and b² ways. A **rule** gives each colour pair a square, a circle or a skip; it is **fair** when squares and circles come equally often and both can come. The puzzles' shared rules say so in a child's words: "It is fair when squares and circles come equally often, and at least one of each."

- **Von Neumann's trick.** Red-blue and blue-red come rb and br ways, which are equal, so "square for red-blue, circle for blue-red, skip the rest" is fair for every bag with both colours. Drawing without putting back keeps the tie (r · b both ways) and changes only red-red and blue-blue to r(r − 1) and b(b − 1).
- **Skipping nothing.** A fair rule with no skips splits all (r + b)² pairs evenly between two groups of colour pairs. Checking the groupings, the sums tie only when r = b: then any two colour pairs against the other two work, six rules in all.
- **Fewest skips.** A rule moves whole colour pairs, so it can only balance sums of r², rb, rb and b². A rule beats von Neumann's only when another sum ties: when r = b (every colour pair comes r² ways, so nothing need be skipped), or r² = 2rb (when r = 2b) and its mirror. So a fair rule skips fewer than r² + b² exactly when the colours are equal or one is twice the other; for r = 2b, red-red against both mixed pairs skips only blue-blue, and for b = 2r the mirror skips only red-red. Two red and one blue need 1 skip, not 5; three red and one blue need 10, and the certificate is that 9 is more than 3 + 3 + 1, so red-red is skipped, and of 3, 3 and 1 only 3 against 3 ties (3 + 1 is not 3), so blue-blue is skipped too.
- **Two bags.** If the first counter comes from one bag and the second from another, red-blue and blue-red come r₁b₂ and b₁r₂ ways, equal exactly when the bags have the same share of red. From three red and one blue, then one red and three blue, they are 9 and 1; red-red against blue-blue (3 and 3) is fair instead.
- **The busiest bag.** Under von Neumann's rule shapes come 2rb ways, most when the colours split evenly: 8 of 16 for two red and two blue.

Experiments come first: in the find-every puzzle a child draws pairs and sees each counter pair land in its column; in the rule puzzles every marked pair sits in a square, circle or skip pile and moves with its colour pair, so a child counts the piles rather than calculating. The general arguments are in the grown-up notes; no puzzle asks for a written proof. `scripts/validate-bags.mjs` checks every claim above by a separate count over bags of up to eight of each colour.

## Where they appear

**Puzzles → Fair bags** is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)). A **Playground** button sits above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`).

| # | Puzzle | Bag | Task | Answer | Week 42 source |
|---|---|---|---|---|---|
| 1 | Every pair | 2 red, 1 blue | Keep every marked pair | 9 pairs | K–1 P3, 2–3 P2 |
| 2 | Two of each | 2 red, 2 blue | Fair rule that skips nothing | Any two colour pairs against the other two (6 rules) | K–1 P4, 2–3 P3 and P7 |
| 3 | Three red, one blue | 3 red, 1 blue | Fair rule | Red-blue against blue-red (2 rules) | K–1 P2–P3, 2–3 P1–P2, 4–5 P1–P2 |
| 4 | Busiest bag | 4 counters, von Neumann's rule set | Flip colours for the smallest skip pile | Two of each (8 of 16) | K–1 P5, 2–3 P4 |
| 5 | Two different counters | 3 red, 1 blue, first stays out | Fair rule that skips nothing | Red-red against both mixed pairs (6 rules; blue-blue can't happen) | 4–5 P6 |
| 6 | Fewest skips | 2 red, 1 blue | Fair rule, fewest skips | Red-red against both mixed pairs, skip blue-blue (2 rules) | 4–5 P4 (new bag) |
| 7 | Two bags | 3 red, 1 blue, then 1 red, 3 blue | Fair rule | Red-red against blue-blue (2 rules) | 2–3 P5, 4–5 P5 |
| 8 | Fewest skips, six counters | 4 red, 2 blue | Fair rule, fewest skips | As puzzle 6, skipping 4 of 36 | 4–5 P4 (new bag) |

Puzzles 6 and 8 use bags where a better rule than von Neumann's exists; the worksheet's fewest-skips bag (three red, one blue) is puzzle 3, where the only fair rules are already the fewest. Puzzles 2 and 5 start with every pair skipped; puzzles 3, 6, 7 and 8 start from "the first counter's colour decides" (square for red-red and red-blue, circle for the rest), the worksheets' natural first rule, which is fair only in puzzle 2's bag. Puzzle 7 replaces the shared drawing rule with its own: the first counter comes from the 1st bag and the second from the 2nd. Each puzzle's `provenance` names its problems.

## How a puzzle plays

- **The bag.** Red and blue discs in a bag, numbered within each colour (red 1, red 2, blue 1). Two bags, tagged 1st and 2nd, in puzzle 7. Where a tap changes a counter's colour (puzzle 4 and the playground) the counters are numbered by place instead, 1 to 6, so a flip changes a colour and never a number; the pairs in the piles use the same numbers.
- **Every pair** (puzzle 1). Tap a counter, then another (the same one again is allowed). **Keep** puts the pair on the shelf, in the column for its first counter, and empties the draw; a pair already kept lights up on the shelf instead. **Again** puts both counters back without keeping them. **That's all** is the claim: if a pair is missing it says "There's another." and stays greyed until something new is kept. Nothing shows how many there are.
- **A rule** (puzzles 2, 3 and 5–8). Four rows, red-red, red-blue, blue-red and blue-blue, each with a square, a circle and a skip button. Every marked pair sits in the square, circle or skip pile, and the whole colour pair moves when its row changes. A screen reader hears the piles' sizes ("12 squares, 4 circles, 0 skips."). A rule that does what the puzzle asks solves it at once (puzzles 2, 3, 5 and 7). In the fewest-skips puzzles (6 and 8) **Done** is the claim and is greyed until the rule is fair; a fair rule that could skip less gets "You can skip fewer." once, until the rule changes.
- **Busiest bag** (puzzle 4). The rule is set and greyed; tap a counter to change its colour and the piles re-sort. **Done** on a bag that could give more shapes says "The skip pile can be smaller."
- **Keyboard.** Focus stays on the control that moved. A second draw hands focus to Keep (or Again when the pair can't be kept), and the playground's Draw buttons never hand it to a counter, whose tap would clear the piles.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name the next counter of the first missing pair ("Draw red 1."), Keep, Again or That's all; in the rule puzzles they change one row toward the nearest rule that works ("Give red, then blue the square.", "Skip red, then red."), then Done; in puzzle 4 they flip one counter ("Make the first counter blue."). The third level offers Apply hint, and hints can lead all the way to a solve.

## The playground

A bag of two to six counters (tap one to change its colour; + and − add a blue or take away the last), any rule, and random draws with the first put back: **Draw** takes one pair and **Draw 10** ten, up to sixty, each landing on its shape. Changing the bag clears the piles; changing the rule re-sorts them. **Clear** empties them. There is no goal, no Hint, and it never counts as solved. Random piles are evidence for a hunch, not a proof; the puzzles count every pair. Even for a fair rule they wander: with the starting bag and rule, twenty draws leave the square and circle piles three or more apart about a third of the time (36%, computed exactly).

## Rules that keep the record honest

- Only legal moves are accepted: no third draw, no counter outside the bag, no keeping an unfinished pair or one already kept, no That's all with nothing kept or twice in a row, no setting a row to the shape it already has, no Done on an unfair rule or twice in a row, no flipping outside the bag, and no moves after a solve.
- A save is rejected if its draw is too long or uses a counter outside the bag, a kept pair is repeated or outside the bag, That's all or Done was accepted when it shouldn't have been, or a rule or bag isn't four letters or the right size.
- Undo takes back the last action, a Keep or a claim included.

## Files

| File | Contents |
|---|---|
| `dist/families/bags/bags.js` | Marked pairs, colour pairs, tallies, fairness and fewest skips, the `bags` mechanic (moves, hints, rendering, wiring) and the playground |
| `dist/families/bags/bags.css` | The rule rows, their shape buttons and the two bags side by side; imports `dist/cases.css` |
| `dist/families/bags/bags.json` | The pack: 8 puzzles, the playground, 1 family and 3 sources |
| `dist/cases.js`, `dist/cases.css` | The shared case engine ([cases.md](../cases.md)); this family added numbered counters, bags of them and the draw row |
| `scripts/build-bags.mjs` | Authoring list; checks each puzzle's number of answers and writes the pack |
| `scripts/validate-bags.mjs` | A separate count (bags as colour arrays, pairs by place); the theorems above, for up to eight of each colour and two bags of up to four of each; each puzzle's answers; that hints alone solve every puzzle from its start and from every rule, bag or kept pair a child can reach; illegal moves; That's all and Done early and twice; Undo; forged saves; the playground; run by `npm run build` |
| `scripts/bags-browser-smoke.mjs` | Plays the family in a browser: drawing and keeping pairs (Keep by keyboard too), a repeat, That's all, Undo, puzzles 2, 3 and 5 by hand with the rule rows by tap and keyboard, Done and its note, flipping counters, hint solves, and the playground up to its sixty draws |
| `tests/bags.test.mjs` | Counters, pairs, tallies, moves, hints, rendering, saves, the playground and the satchel |

To change a puzzle, edit `scripts/build-bags.mjs`, then run `node scripts/build-bags.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children read the piles as counts of equally likely pairs or as the colour pairs themselves (four rows, four piles); whether puzzle 4's flips feel like a search or a guess; and whether "You can skip fewer." leads to comparing pile sizes.
- **A demo.** The plan gives each family a few-second demo of its move; this one has none yet. A demo here would draw two counters and drop the pair on its shape.
- **Three shapes.** The bonus packet's P1 (three draws and three shapes, fair for every bag: 36 of the 3⁶ = 729 ways to give the six mixed colour words a shape) is left out: it needs three-counter draws and a third shape pile.
- **Six-pair stories.** The worksheet's question of what a fair rule can promise in six pairs is in the playground's notes, not a puzzle.
- **Story.** Fair bags is not on the Lantern Road and has no keeper lines.
