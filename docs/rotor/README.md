# Flip switches

October 23, 2026. Thirteen puzzles and a playground built from Week 91 of the Bellingham math circle (rotor-router machines). They are in the puzzle satchel only, not on the Lantern Road. Nothing here has been played by children, and the Week 91 worksheets are unpiloted. The theme's [review card](https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-91.md) proposed this port (fit B, size M) and shaped it: set every switch, then Send; make a named exit order; find every D-first order, judged by That's all; Can't by tapping a switch and the two letters that would leave it the same way; roads later; no auto-runs that a child only watches and no coverage-prediction screens. The whole start must be set before the first counter, so the eight four-exit starts can't be brute-forced one counter at a time.

## The mathematics

A complete binary tree of depth d has 2^d − 1 switches and 2^d exits, lettered from the left. Counters drop in at the top one at a time. Each switch points down one of its two roads; a counter follows it, and the switch then flips to the other road (a rotor-router with two rotor positions, in the follow-then-flip convention of Levine §1). A start gives every switch a side.

- **A switch takes turns.** Consecutive visits to one switch leave on opposite sides, so any run of visits splits as evenly as it can: within one. This is the only rule, and every fact below follows from it.
- **Every block reaches every exit once.** On a complete tree of depth d, any 2^d consecutive counters split 2^(d−1) and 2^(d−1) at the top, then evenly at each switch below, so each exit gets exactly one of them, from any start. Every switch is visited an even number of times in the block, so the switches end the block as they began, and the order repeats with period 2^d. (Worksheet Problem 6 and the guide's bundle argument; checked here for every start and every window of 2^d counters.)
- **Which orders can be made.** A full order of the 2^d exits can be made exactly when, at every switch, the letters below it that appear in the order alternate left, right, left, … or right, left, right, …. Necessity is the rule above. Sufficiency: set each switch to the side of its first visitor; then by induction down the tree each switch's visitors come in the order's sequence and leave as the order says. The first visitor of each switch is determined by the order, so different starts make different orders, and there are exactly 2^(2^d − 1) of them: 8 of the 24 orders on four exits and 128 of the 40,320 on eight (Problem 5's new count). One switch's puzzles use four counters, two blocks: of the 16 four-letter words in A and B, only ABAB and BABA can be made. All left gives AECGBFDH, the bit-reversal order.
- **The certificate for Can't.** If an order can't be made, some switch has two visitors in a row, among the counters that pass it, that leave it on the same side. That switch and those two letters are the proof: a child can point at them, and the app checks that both letters lie below the switch, on the same side, with no letter from below that switch between them in the order. On a target with open slots (D _ _ _) an open slot can't be one of the two, and an open slot between them breaks the proof, since its counter might pass the switch. So a claim can hold only when no start makes the target: on a target some start can make, every claim fails for a reason a child can see. Every impossible target here has a certificate, and every certificate found is sound (no start agrees with the order up to its later letter), by exhaustive search over every full order, every pattern with open slots on one switch and four exits, and 20,000 patterns on eight.
- **Patterns.** A target with some letters given ("starts with D") fits the orders whose given letters match. On four exits, D first forces the top switch and its right switch to point right, and the left switch is free: exactly DACB and DBCA. On eight exits, A then E leaves four orders.

Experiments come first: a child sets switches, sends counters and watches the trail and the cards flip. Conjectures follow ("every exit gets one", "A and B can't be next to each other"), and the explanation is a pointing argument: both of these go left at the top switch, one after the other, and the top switch takes turns. Nothing claims anything about trees that are not complete, more than two roads per switch, or counters that start partway down; the return packet's roads (a path with a score) are not built.

## Where the puzzles appear

**Puzzles → Flip switches** (symbol ⋎) is a satchel family on the family seam ([Adding a family](../ADDING-A-FAMILY.md)), with a **Playground** button above Easy, Medium and Hard. The puzzles are grade-free (`band: "all"`). In targets, `_` is an open slot that any exit fills.

| # | Level | Kind | Tree | Target | Answer | Week 91 source |
|---|---|---|---|---|---|---|
| 1 | Easy | Make | 1 switch | ABAB | start L | P1 (XYXY) |
| 2 | Easy | Make | 1 switch | ABBA | Can't: the switch, B B | P1 (XYYX) |
| 3 | Easy | Make | 4 exits | D _ _ _ | 2 starts | guide p. 2, K–1 route; P2 |
| 4 | Easy | Make | 4 exits | ACBD | start LLL | P3 |
| 5 | Medium | Make | 4 exits | ABCD | Can't: top switch, A B or C D | P3 |
| 6 | Medium | Every | 4 exits | D _ _ _ | DACB, DBCA | P2 |
| 7 | Medium | Make | 4 exits | CBDA | start RRL | new, P3's task |
| 8 | Medium | Make | 4 exits | DABC | Can't: top switch, A B | P3 |
| 9 | Hard | Make | 8 exits | AECGBFDH | all L | P4 |
| 10 | Hard | Make | 8 exits | FBGDEAHC | start RLLRRRL | new, P4's task; P5's count |
| 11 | Hard | Make | 8 exits | AEBFCGDH | Can't: a switch below the top (4 proofs) | P4 |
| 12 | Hard | Make | 8 exits | AECFBGDH | Can't: only the right switch below the top (2 proofs) | new, P4's task |
| 13 | Hard | Every | 8 exits | A E _ _ _ _ _ _ | 4 orders | new, P2's question on P4's tree |

Starts list the switches in level order: the top switch, then its left and right switches, then the four below them from the left. The worksheets are in [math-circle-worksheets, week 91](https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-91); each puzzle's `provenance` names its problem. Problem 6 (every block reaches every exit) and Problem 7 (the coin) are claims and contrasts that stay on paper; the playground's two blocks show the first.

### Why its own family

Week 91 is ported as its own family, not as a group in an existing one. Its object is a switch with memory routing one counter at a time, and its question is which orders a start can make. [Chip firing](../chips/README.md) also sends counters through a graph, but it fires a chip along every line at once and asks about order independence and stable boards; the card says "No merge". [Sorting machines](../sorting/README.md) are fixed comparators with no state. The rule (a switch takes turns), its certificate (two visitors in a row on one side) and its progression (one switch, four exits, eight exits, then roads) are what a family is for. The board reuses the shared graph board (`dist/graph-board.js`) for the tree, its taps and keys.

## How a puzzle plays

- **The board.** The tree is drawn on the shared graph board. Each switch is a card with a pine arrow toward the road it points down, and that road is drawn thick in pine; an unset switch is a dashed circle with no arrow. The exits are lettered circles; landed counters stack under their exit. The next counter waits at the top; the last counter's trip glows pale gold.
- **Setting the start.** Every switch starts unset. Tap a switch to flip it (an unset switch points left first), or tap a road below a switch to point the switch down that road; a tap on the road it already points down does nothing. Send is off until every switch is set, and once a counter has been sent only the counters flip the switches. Each flip is one Undo.
- **Sending.** Send drops one counter; it follows the arrows to an exit and each switch it passes flips. Under the tree the target sits in dashed ochre slots (lighter where open), and the bottom row fills with the exits the counters reached, in red where a letter differs from the target. The tray beside Send shows the counters left.
- **Make puzzles** are solved when the bottom row matches the target. The play screen shows no objective, because the slots say it; How to play says it.
- **Can't.** After the first counter, Can't is on. Press it, then tap a switch and two slots of the target (in either order); the claim is judged at once. A right claim solves the puzzle and rings the switch and the two letters. A wrong one gets the claim's own reason: "Both counters must pass that switch." (a letter isn't below it), "Those two go different ways there.", "Another counter passes that switch between them." (a letter below the switch, or an open slot, lies between the two) or "That slot could be any exit." (an open slot was chosen). A target some start can make gets the same kinds of answer, since no claim holds there, so pressing Can't once doesn't tell a child whether to keep trying starts (an independent play-through found that the earlier "There is a way." did, and it was dropped with its lock). The lines never lock Can't, and they go away with the next move or Undo. Pressing Can't again, or Undo, lets go of a half-made claim; the claim being made is view state, so the same board always draws the same.
- **Every puzzles** show one objective line, "Find every order that fits.", and a shelf. Make an order that fits and press **Keep**: the order goes on the shelf and the counters come back, so the switches can be set again. Keep is off unless the row is full, fits and isn't kept already. **That's all** claims the shelf has every order; too early, it gets "There is another." and stays off until the shelf changes (through Undo too). There is no slot per answer.
- **Hints.** Before any move the first hint is the authored nudge, and no hint opens with a claim. Then hints name one switch to set toward a start that works ("Point the top switch to the right."), or "Send a counter."; on an impossible target they first lead to a start that comes as close as any, and then name the certificate in words ("A and B would both go left at the top switch, one after the other, and a switch takes turns. Press Can't, then tap that switch, A and B."). A start that can't make the target, a row that doesn't fit, or an order already kept is told only behind Hint, with Undo back to a board that can still be solved. Level 2 marks the switch, the slots or the button; level 3 offers Apply hint. Hints alone solve every puzzle from fresh and from random play.

## The playground

The playground has no goal, no Hint and never counts as solved. Three small tree pictures choose one switch, four exits or eight exits (tapping the chosen one again does nothing). Set the switches, then send up to two blocks (at least 8 counters) and watch every block reach every exit once and the order repeat. **Clear** brings the counters back with the switches as they were set; Undo takes back flips and counters.

## Rules that keep the record honest

- Only legal moves are accepted: flips only before the first counter; Send only with every switch set and counters left; Can't only on a make puzzle after the first counter, with a switch and two different slots; Keep only on a full fitting row not kept already; That's all only while it isn't refused for this shelf; nothing after a solve.
- Saves hold the start, the counters sent, the shelf, the refusal line and an accepted claim. Each is checked on load: a refusal line only after a counter, only one that some claim on this target gets, and never beside an accepted claim; an accepted claim only with a valid certificate (so only on a target no start makes) and at least one counter sent; kept orders distinct and fitting; That's all accepted only on the full shelf; "There is another." only on a partial one.
- Undo keeps "There is another." through the `carry` hook while the shelf is the same.

## Files

| File | Contents |
|---|---|
| `dist/families/rotor/rotor.js` | The machine (`run`), which starts fit a target, certificates and their check, names for switches; the `rotor` mechanic (moves, hints, the tree on the graph board with cards, trail and stacks, the target and arrival rows, Can't taps, the shelf) and the playground |
| `dist/families/rotor/rotor.css` | Styles in the shared board palette, scoped under `rr-` classes, importing `graph-board.css` |
| `dist/families/rotor/rotor.json` | The pack: 13 puzzles, the playground, 1 family and 4 sources |
| `scripts/build-rotor.mjs` | Authoring list: checks each target's possibility, start counts, certificates and That's-all counts with the mechanic, records a witness for each puzzle, and writes the pack |
| `scripts/validate-rotor.mjs` | An independent model of the tree (built by halving the letter range) checked against the mechanic: every order on one switch (16 words), four exits (24) and eight exits (40,320) three ways (machine from every start, the alternation rule, and the mechanic), with a certificate existing exactly when the order can't be made (2, 8 and 128 orders); the guide's eight-order key, all L and all R; every window of 2^d counters; every claim on every make puzzle, played, answered with the verdict an independent check gives, makeable or not, and soundness; every claim on every pattern with open slots on one switch and four exits, and on 20,000 patterns on eight; That's all on every subset of each answer set; witnesses; hints from fresh and from 25 random plays per puzzle; every Undo changing the screen; refusals and their lines; forged saves; the playground and its chosen tree. Run by `npm run build` |
| `tests/rotor.test.mjs` | The machine against the keys, which orders fit and their certificates, setting before Send, red letters, Can't proofs and refusals, the same kinds of answer on an order that can be made, the chosen road's label, the claim as view state, find every, the playground, saves, layout, rendering and hint timing |
| `scripts/rotor-browser-smoke.mjs` | The interface in a browser: taps on switches and roads, Enter on a switch, Send, a red letter, Undo, a second tap on the chosen road or tree doing nothing, Can't through taps with refusals (on a target that can be made too) and a proof, 44 px switches on the eight-exit tree on a phone, Keep and That's all, the playground's trees and Clear, no page overflow, and screenshots in `test-results/rotor/` (`TEST_PHONE=1` for a phone) |

To change a puzzle, edit `scripts/build-rotor.mjs`, then run `node scripts/build-rotor.mjs`, `npm test` and `npm run build`.

## Sources

- The Week 91 worksheets (Grades 2–5 and 4–5), materials and facilitator guide, and the review card of October 23, 2026, with its math check (`plans/review/week-91.md`, `week-91-math.md`).
- Lionel Levine, *The Rotor-Router Model*, §1 (the definition, follow then flip) and Lemma 1.1, [arXiv math/0409407](https://arxiv.org/abs/math/0409407).
- Alexander E. Holroyd and James Propp, *Rotor Walks and Markov Chains*, introduction and Theorem 1, as background on how evenly rotors share visits, [arXiv 0904.4507](https://arxiv.org/abs/0904.4507). The order count and the certificate are derived here and checked by exhaustive search, not taken from a source.

## Not yet done

- **Children's play.** Nothing here has been tried by children. Things to watch:
  1. whether children understand that every switch must be set before Send (Send is simply off until then), and whether they come to set a switch by reading its first visitor in the target rather than by trying starts;
  2. whether the Can't taps (press Can't, then a switch and two letters) are found without help, and whether children use Can't as a guess on targets that can be made now that a wrong claim's reason never says whether the target can be made;
  3. in the find-every puzzles, whether Keep bringing the counters back is clear, and whether children press That's all because they have a reason (the free switch) rather than after guessing.
- **Roads.** The return packet's roads (a path of switches with exit targets and a live score) are a later group, as the card proposed.
- **Not built from the card.** Problem 6 (every block covers every exit, as a prediction) and Problem 7 (a coin's runs against the switch's) stay on paper; the card avoids coverage prediction. No puzzle asks for the count 128; it is in the grown-up notes.
- **K–1.** Puzzles 1 to 3 follow the card's K–1 route, but the eight-exit tree and Can't need a grown-up.
- **No animation.** A sent counter appears at its exit with its trip lit; it does not travel down the tree.
- **Story and grade trails.** Flip switches is off the Lantern Road and has no keeper lines; the family is grade-free and in no K–1, 2–3 or 4–5 trail.
