# Odd-pebble Balance weight kits

October 5, 2026. Twelve puzzles and a playground built from Week 30 of the Bellingham math circle (two-pan weight kits), added to the Odd-pebble Balance as its **Weight kits** group. They are in the puzzle satchel only, not on the Lantern Road. No child has played them in the app, and the Week 30 worksheets have not been piloted either. The theme's review card is `plans/review/week-30.md` in the worksheets repository.

## The mathematics

A target block sits on the left pan. Each weight of a kit goes **beside the target**, on the **other pan**, or **off**. The scale balances when the target plus the weights beside it equals the weights opposite.

- **A target balances exactly when it is a signed sum of the kit,** each weight counted +1 (opposite), 0 (off) or −1 (beside the target). A weight beside the target takes away: 2 + 1 = 3 balances 2 with weights 1 and 3.
- **m weights balance at most (3^m − 1)/2 targets.** They have 3^m placements. All off gives 0, and the others pair up as mirror images (swap the pans), so at most half of the rest are positive. Two weights reach at most 4 targets, three at most 13, four at most 40. Every repeat (two placements with the same total) costs one target: 1, 3, 8 makes 4 two ways and stops at 12.
- **Weights 1, 3, 9, …, 3^(m−1) reach that bound with no gap, and each target in exactly one way.** This is balanced ternary: every whole number has exactly one expansion in powers of 3 with digits −1, 0 and 1. It is Bachet's weights problem (1612): 1, 3, 9 and 27 weigh every whole load from 1 to 40.
- **Extending a run.** If the first weights balance every target to R, a new weight w balances every target from w − R to w + R. So the run carries on without a gap exactly when w ≤ 2R + 1, and w = 2R + 1 takes it to 3R + 1. Among whole-number kits, 1, 3, 9 is the only three-weight kit that balances every target from 1 to 13 (the 13 targets must be the only positive totals, so the weights add to 13).
- **Scaling.** Multiplying every weight by k multiplies every target by k: 2 and 6 balance 2, 4, 6 and 8.

What is checked in the app: that every lit target really balances with the kit as it stands; that That's all is accepted only when no dark target in the row can balance (or no other way exists), and refused otherwise; that a chosen kit balances every target before the puzzle counts as solved. What is not checked: that the child can say why. The grown-up notes carry the explanations, including the counting bound, which the app does not try to make a child prove.

## Where they appear

**Puzzles → Odd-pebble Balance → Weight kits**, below Easy, Medium and Hard, and a **Playground** button at the top of the family. The puzzles are grade-free (`band: "all"`) with Easy, Medium and Hard levels; Next puzzle walks through the group alone.

| # | Level | Puzzle | Kind | Kit | Targets | Answer | Week 30 source |
|---|---|---|---|---|---|---|---|
| 1 | Easy | Two with one and three | Balance | 1, 3 | 2 | 2 + 1 = 3 | Launch; K–1 Problem 1 |
| 2 | Easy | One and three | Balance each | 1, 3 | 1–4 | All four, one way each | K–1 Problem 1 |
| 3 | Easy | One and two | Which balance | 1, 2 | 1–5 | 1, 2, 3 | K–1 Problem 2 |
| 4 | Medium | One and four | Which balance | 1, 4 | 1–6 | 1, 3, 4, 5 (gap at 2) | K–1 Problem 3; 2–3 Problem 1 |
| 5 | Medium | Doubled | Choose two of 1–8 | ? | 2, 4, 6, 8 | 2 and 6 only | K–1 Problem 4 and 4–5 Problem 1, doubled |
| 6 | Medium | Every way to make four | Every way | 1, 3, 8 | 4 | 4 = 1 + 3 and 4 + 1 + 3 = 8 | 2–3 Problem 4 |
| 7 | Medium | A third weight | Choose 8, 9 or 10 | 1, 3, ? | 5–13 | 9 only | K–1 Problem 5; 2–3 Problem 2; 4–5 Problem 2 |
| 8 | Hard | One, three and ten | Which balance | 1, 3, 10 | 1–9 | All but 5 | 2–3 Problem 3 |
| 9 | Hard | Five with one, three and nine | Every way | 1, 3, 9 | 5 | One way: 5 + 1 + 3 = 9 | 4–5 Problem 3; 2–3 Problem 4 |
| 10 | Hard | Two, three and nine | Which balance | 2, 3, 9 | 10–14 | All but 13, though 14 balances | New, after 2–3 Problem 3 |
| 11 | Hard | Twenty-two | Balance | 1, 3, 9, 27 | 22 | 22 + 9 = 27 + 3 + 1 | New, after 4–5 Problem 6 |
| 12 | Hard | A fourth weight | Choose 14–40 | 1, 3, 9, ? | 14, 22, 31, 40 | 27 only | 2–3 Problem 6; 4–5 Problem 6 |

The worksheets are in [math-circle-worksheets, week 30](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-30). Each puzzle's `provenance` names the problems it draws on; puzzles 5, 10 and 11 are new instances. Left to paper: the bound for any three-weight kit (2–3 Problem 5, 4–5 Problem 4), the most targets any kit can balance with gaps allowed (4–5 Problem 5), and five weights (4–5 Problem 7). Those are counting arguments, which the grown-up notes give.

## How a puzzle plays

- **The scale is the board.** The beam tips toward the heavier side and the total on each pan is written under it, as on the worksheet (3 + 1 and 4). An = appears between them when they balance.
- **Placing weights.** Each weight has three buttons, as in the Odd-pebble Balance: ◀ beside the target, ● off, ▶ the other pan.
- **Targets light up.** When the scale balances, the target lights in the row above the scale and stays lit. Tap another target to put it on the scale; the weights stay where they are.
- **Balance** (1, 2, 11): light every target.
- **Which balance** (3, 4, 8, 10): light every target the kit can balance, then press That's all. That's all is refused with "Another target balances" while a dark target could balance. After a solve, the targets that cannot balance are struck through.
- **Every way** (6, 9): each different placement that balances the target joins a list of equations. That's all is refused with "There is another way" while one is missing.
- **Choose** (5, 7, 12): tap weights at the top to make the kit (puzzle 12 uses − and + over 14 to 40), then light every target. A weight that leaves the kit leaves the pans, and the targets it balanced go dark.
- **Playground:** choose up to four of 1, 2, 3, 4, 5, 8, 9, 10 and 27, and light any target from 1 to 40. It starts with 1 and 3.
- **Hints** first choose a kit that works, then the target to light, then the placement nearest the pans, naming the heaviest misplaced weight first ("Put 27 on the other pan", "Put 9 beside the target"). At the second level the button is outlined; the third applies it.

## Rules that keep the record honest

- A save lists the kit (for choose puzzles), the target on the scale, the pans and the lit targets with their placements. Every placement must use weights in the kit, put no weight on both pans, and balance its target.
- One record per target, or one per placement in the every-way puzzles. A save may say That's all only when it is true, and may show a refusal only when it was false.
- At most the offered number of weights may be chosen, and a fixed weight cannot be chosen or removed.

## Files

| File | Contents |
|---|---|
| `dist/families/kits/kits.js` | Placements and signed sums, the `kit` mechanic, hints and rendering |
| `dist/families/kits/kits.css` | The target block and weights on the shared balance drawing, the target row, the kit picker and stepper, the ways list |
| `dist/families/kits/kits.json` | The pack: 12 puzzles, a playground, the group's mathematics and 3 sources |
| `scripts/build-kits.mjs` | Authoring list; computes each puzzle's answers by listing placements and writes the pack |
| `scripts/validate-kits.mjs` | Recomputes every answer by counting signed sums weight by weight; plays every answer and every offered kit as moves; checks That's all and its refusals, records dropped with a weight, hints alone from fresh and wrong starts, illegal moves and forged saves; run by `npm run build` |
| `tests/kits.test.mjs` | Signed sums, placing, lighting targets, That's all, every way, choosing and the stepper, hints, saves, the playground and the satchel group |

The module adds no satchel family; its puzzles set `libraryFamily: "weigh"` and `group: "Weight kits"`. The base balance drawing's classes in `dist/boards.css` style the scale, so no shared file changed. To change a puzzle, edit `scripts/build-kits.mjs`, then run `node scripts/build-kits.mjs`, `npm test` and `npm run build`.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch: whether children think of putting a weight beside the target without the hint (puzzle 1 depends on it), whether the totals under the pans help or turn the puzzle into sums, and whether the 9-target rows in puzzles 7 and 8 feel long.
- **The counting bound.** Why no three weights balance 14 targets is a counting argument (27 placements). A puzzle could let a child see the 27 placements laid out as mirror pairs; nothing like that is built.
- **A playground in the Odd-pebble Balance.** The family had no playground, so its Playground button now opens weight kits. If the odd-pebble puzzles get a playground of their own, the two will need separate buttons.
- **Story.** Weight kits are not on the Lantern Road.
