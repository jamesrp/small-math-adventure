# Prime bags

October 23, 2026. Fourteen puzzles and a playground built from Week 96 of the Bellingham math circle (prime bags and divisor builders). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 96 packets are unpiloted and physically unrehearsed. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-96.md) says keep, App fit B: split a card by entering a factor, with non-factors refused and primes turned into tokens (buttons for every split would remove the factoring); collect every value a bag makes in a tray and claim That's all with no visible count; build a bag with exactly k values and then the smallest, with no live divisor counter. Its pitfalls: no typed divisor counts, and uniqueness and the counting rule stay on paper.

## The mathematics

A **card** is a whole number. It **splits** into two whole numbers greater than 1 that multiply to it; a number that cannot split is **prime**. Splitting until every card is prime gives a **bag** of prime tokens.

- **Unique factorization.** Every route of splits from a number ends in the same bag. Splitting keeps the product and always stops, so every route ends in some bag of primes; that it is the same bag needs the lemma that a prime dividing a product divides one of its factors (Euclid), proved in the Week 96 guide (p. 6) through the Euclidean algorithm. The split puzzles (3, 8, 12) show it as an experiment: every first split is a different start, and the shelf shows the same bag after each one. They do not prove it.
- **First splits are divisor pairs.** The first splits of n are its factor pairs a × b with 1 < a ≤ b: 2 for 12, 4 for 36 (6 × 6 among them), 5 for 60. With 1 × n they pair up the divisors of n, so a square has an odd number of divisors.
- **Values are divisors.** Choosing some tokens of a bag, each at most once, makes a **value**: their product, or 1 when none is chosen. A value d divides the bag's value n, because the tokens left behind multiply to n ÷ d. Every divisor of n is made, because the bag of d and the bag of n ÷ d together are a route's bag for n, which by uniqueness is n's own bag. Different choices of how many of each prime make different values, again by uniqueness, and tokens with the same number are the same: choosing another 2 makes the same value.
- **The count.** A bag with e₁, …, e_r copies of its primes makes (e₁ + 1)⋯(e_r + 1) values: each prime contributes a choice of how many copies, from none to all. More tokens need not mean more values: 2, 2, 2, 3 (24) and 2, 3, 5 (30) both make eight (puzzles 6 and 7); 2, 2, 3, 3 (36) makes nine and 2, 2, 3, 5 (60) twelve with four tokens each (10 and 11); two 2s and a 3, and two 3s and a 2, both make six (4 and 5).
- **The least number with k values.** The counts of a bag with k values are a factorization of k into factors at least 2, each lowered by 1; for a fixed pattern the smallest bag uses the smallest primes with the largest counts first, since p^a q^b < p^b q^a for p < q and a > b. So the least numbers with 4, 6, 8, 9, 10 and 12 divisors are 6, 12, 24, 36, 48 and 60. Puzzle 13 asks for 24 (against 30 and 128), puzzle 14 for 60 (against 72, 96 and 2¹¹); any primes are allowed in principle, and the validator checks every whole number below each answer.

Experiments come first: splitting, choosing, keeping. Conjectures come from the trays and shelves (the same bag every time; the values are the divisors; counts multiply; extra copies belong on small primes). The explanations are grown-up conversations in each puzzle's notes.

## Why a new family

The closest families are **Nesting cards** (Week 19, subset antichains: for a number with different primes its sub-bags are exactly those subset cards, but the object there is the subset order, not multiplication), **Card totals** (Week 55, sums of two trays) and **Sliding numbers** (a catalog with That's all). None has a number to factor or a bag whose choices multiply. The object (a multiset of primes and its sub-multisets) and the moves (split by a factor; choose and keep) are new, so Prime bags is its own family on the seam, symbol ∏.

## Where they appear

**Puzzles → Prime bags** (symbol ∏) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`); the levels are rough entry points, K–1 for puzzles 1–2 (the app multiplies), grades 2–3 for 3–9, grades 4–5 for 10–14, and each puzzle's notes state its prerequisites.

| # | Level | Title | Kind | Bag or card | Answer | Week 96 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Two tokens | Every value | 2, 3 (6) | 1, 2, 3, 6 | New, after the shared choosing example |
| 2 | Easy | Three twos | Every value | 2, 2, 2 (8) | 1, 2, 4, 8 | New, after the guide's five-2s check |
| 3 | Easy | Split 12 | Every first split | 12 | 2 × 6, 3 × 4; bag 2, 2, 3 | 2–3 Problem 1 |
| 4 | Easy | The bag of 12 | Every value | 2, 2, 3 (12) | six values | 2–3 Problem 2 |
| 5 | Medium | The bag of 18 | Every value | 2, 3, 3 (18) | six values | 2–3 Problem 2 |
| 6 | Medium | Four tokens | Every value | 2, 2, 2, 3 (24) | eight values | 2–3 Problem 3, 4–5 Problem 2 |
| 7 | Medium | Three different tokens | Every value | 2, 3, 5 (30) | eight values | 2–3 Problem 3, 4–5 Problem 2 |
| 8 | Medium | Split 36 | Every first split | 36 | 2 × 18, 3 × 12, 4 × 9, 6 × 6 | Problem 1, both packets |
| 9 | Medium | Exactly six | Design | 2, 3, 5, 7 | any of 16 bags (p²q or p⁵) | 2–3 Problem 4 |
| 10 | Hard | Two 2s and two 3s | Every value | 2, 2, 3, 3 (36) | nine values | 4–5 Problem 3 |
| 11 | Hard | Four tokens again | Every value | 2, 2, 3, 5 (60) | twelve values | 4–5 Problem 3 |
| 12 | Hard | Split 60 | Every first split | 60 | five first splits | 4–5 Problem 1 |
| 13 | Hard | Smallest with eight | Design, smallest | 2, 3, 5, 7 | 2, 2, 2, 3 (24) | 2–3 Problem 4, 4–5 Problem 6 |
| 14 | Hard | Smallest with twelve | Design, smallest | 2, 3, 5, 7 | 2, 2, 3, 5 (60) | 4–5 Problems 5–6 |

The worksheets are in [math-circle-worksheets, week 96](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-96); each puzzle's `provenance` names its problem. Bags 2, 3 and 2, 2, 2 are new; the other bags and cards are the packets'. Not ported: 4–5 Problem 4 (seven 2s and four 3s, a count to predict, which the card rules out as a typed answer; it is puzzle 10's extension), Problem 5's full table of patterns (puzzle 14's notes), the proofs, and the guide's gcd and lcm return visit.

## How a puzzle plays

- **Choosing.** The bag's tokens are round buttons; a tap chooses a token (it lifts and turns pine) or puts it back. The bag's value stands beside it (= 12). Under the bag the chosen tokens' product shows, with the multiplication when two or more are chosen (2 × 3 = 6), and 1 when nothing is chosen.
- **Keep** puts the value in the tray, smallest first, each value with its tokens drawn small under it. Keep is off when the value is already in the tray, and that tray item is ringed: choosing the other 2 shows at once that it makes the same value. The choice stays after Keep, so the next value is one tap away.
- **That's all** judges the tray once. It is off while the tray is empty. A tray with a value missing gets "There is another." and That's all stays off until the tray grows (or, in a design, the bag changes). No slots, no count, nothing that says how many values a bag makes.
- **Design** adds the supply above the bag: tap 2, 3, 5 or 7 to put a token in, and − under it to take one out; the bag holds at most seven tokens. A bag change clears the choice; kept values stay while the bag can still make them, so adding a token keeps every value and taking one out drops only the values that need it. The tray is the record of the count: That's all with every value kept and the wrong count gets "Every value is here, but not 6."; in the smallest puzzles, the right count in a bag that is not the smallest gets "There is a smaller bag." The refusal does not show the smaller bag (the card suggested showing one as a refutation, but here it would hand over the answer); it stays until the bag changes.
- **Splitting.** The card is a square sun card; under it, "12 =", eight keys 2–9 and "× ?". The chosen card is ringed; with several cards left, the first that can split starts chosen and a tap chooses another. A key splits the card into the key and the rest (3 makes 3 and 4). Keys from the card's own value up are off; a key that does not divide is refused, marked red, "5 doesn't split 12.", and nothing changes. A prime becomes a round token. When every card is a token the run is over: it joins the shelf as its first split and its bag ("3 × 4 → 2 2 3") if that first split is new, or rings the shelf item that has it (as soon as the first split is made). **New run** starts the card again and keeps the shelf. That's all judges the shelf as above.
- **Copy.** Each puzzle shows one line: "Keep every value the bag can make.", "Start the split every way you can, and split to the end each time.", "Build a bag that makes exactly 6 values, and keep them all." or "Build the smallest bag …". How to play has the rules and controls; its split example is the worksheet's non-task 20 = 4 × 5.
- **Hints.** Before any move, the first hint is the authored nudge. Then hints name one move toward the nearest missing value ("Choose a 3.", "Leave out a 2.", "Keep 12."), toward a bag with the goal's count, the smallest one in puzzles 13 and 14 ("Put a 2 in the bag.", "Take a 7 out of the bag."), or along a new route ("Split 36 into 4 × 9.", "You have this first split. Press New run."), and finally That's all ("Every value is kept."). Level 2 marks the token, key, card or button; level 3 offers Apply hint. Hints alone finish every puzzle from a fresh start, after random play and after Undo.
- **Keyboard.** Every token, card and key is a button with a spoken label; the status line reads the bag, the choice and the kept values.

## The playground

The design board with no goal: build any bag of up to seven tokens, choose, keep values, and watch which kept values stay when a token goes in or out. No That's all, no Hint, never solved.

## Rules that keep the record honest

- The save holds the bag (design and playground, as counts of 2, 3, 5 and 7), the choice (`pick`, token places in order), the tray (chosen bags as counts, smallest value first), `said` and `done`; for splitting, every split as [card place, key] (`steps`), the shelf (first split and bag) and `said` and `done`. The cards are always replayed from the steps, so a save with an illegal split cannot load.
- A tray must hold different values the bag can make; `said` must be what That's all says of that bag and tray, and `done` only with a tray That's all accepts. A shelf must hold different first splits of the card in order, each with the card's bag.
- Only legal moves are accepted: a choice of a token in the bag; Keep of a value not kept; That's all with a tray or shelf and not twice on one; a token in only below seven, out only if present, and only in designs; a split only of a card that can split, by a key below it that divides it, and none after every card is prime; New run only after a split; nothing after a solve.
- Undo takes back choices, keeps, bag changes and splits, never a discovery: kept values stay while the bag can make them (Undo of taking a token out gives back the values it dropped), the shelf stays, and a refused That's all stays while the bag and tray are as they were when it was refused (`carry`). Every Undo press changes the screen (checked by the validator on random play, after a refusal).

## Files

| File | Contents |
|---|---|
| `dist/families/primes/primes.js` | Bags, values and counts, cards and splits, the smallest bags, the `primes` mechanic (moves, hints, the chosen card and a refused key as view state, rendering) and the family entry |
| `dist/families/primes/primes.css` | Tokens, the bag, the supply, the choice, the tray, cards, keys and the shelf, in the shared board look |
| `dist/families/primes/primes.json` | The pack: a playground, 14 puzzles, 1 family and 3 sources |
| `scripts/build-primes.mjs` | Authoring list; computes and checks answers with the mechanic's helpers and writes `primes.json` |
| `scripts/validate-primes.mjs` | Divisors by trial division; every route of every split card through multisets (the math check's 2, 7 and 11 routes) and through the engine (60 runs), each ending in the trial-division bag; least numbers by counting divisors of 1, 2, 3, … with any primes; every one of the 330 buildable bags judged by That's all in each design puzzle; trays missing each value refused; Undo keeping values, refusals and the shelf; every Undo press changing the screen; illegal moves; forged saves; copy that gives no count away; the notes' claims (6, 12, 24, 36, 48, 60; forty divisors of 10,368; 60 beats every smaller number); hint chains from fresh, after random play and after Undo; the playground. Run by `npm run build` |
| `tests/primes.test.mjs` | The worksheet's worked examples (20 → 4 × 5 → 2, 2, 5; choosing 2 and 5 makes 10), helpers, choosing and keeping, That's all, design refusals and pruning, splitting and its refusal, choosing a card, hints, saves, rendering and the playground |
| `scripts/primes-browser-smoke.mjs` | The interface in a browser: choosing, Keep off for a value kept, That's all refused and kept through Undo, a solve, splitting with a refused key and the shelf, a design with "There is a smaller bag.", pruning and Undo, keyboard play, the playground and no page overflow. `TEST_PHONE=1` for touch on a phone; `SHOTS=<dir>` saves tablet and phone screenshots |

To change a puzzle, edit `scripts/build-primes.mjs`, then run `node scripts/build-primes.mjs`, `npm test` and `npm run build`.

## Sources

- Bellingham Math Circle, Week 96: Prime bags and divisor builders, grades 2–3 packet W96-23-v1 (Problems 1–4), grades 4–5 packet W96-45-v1 (Problems 1–6) and adult guide W96-FAC-v1; unpiloted, as fixed on October 23, 2026.
- The Week 96 review card (October 23, 2026), its App fit, pitfalls and the math check's answers (routes, divisor lists, patterns and minima).
- Keith Conrad, *Unique Factorization in Z and F[T]*, Theorems 1.1, 2.1, 2.3 and Lemma 2.2, as the guide cites. The counting and least-number arguments are the guide's, written independently of that source.

## Not yet done

1. **Watch whether children keep 1** without help (choosing nothing), and whether they read the ringed tray item and the greyed Keep as "you have this one" when they choose the other 2, or think the button broke.
2. **Watch the split keypad**: whether children try keys in order or know a factor, whether "5 doesn't split 12." reads as information rather than failure, and whether the same bag after every first split surprises them or goes unnoticed on the shelf.
3. **Watch the design puzzles' length**: building a bag, then keeping every value to claim it (twelve values in puzzle 14), may feel like repetition once a child knows the counting rule; if so, a later version could accept the claim on the bag alone for children who have finished puzzles 10 and 11.
4. The card's K–1 route (rectangles of counters, primes as "only one row") is not in the app; puzzles 1 and 2 are the youngest entry.
5. 4–5 Problem 4's forty divisors, Problem 5's pattern table and the proofs stay on paper; the guide's gcd and lcm return visit is not ported.
6. Not on the Lantern Road, no keeper lines and no Plume scores; stars come only once a road stop uses it.
