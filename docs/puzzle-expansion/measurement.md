# Pouring and weighing

Authored September 20, 2026. Proposed puzzle content; these mechanics are not yet in the app. Six instances per type. Solutions are below each problem for adult review.

## Spring-water jugs

**Child action:** tap a source, destination, fill, or empty control. Filling goes to capacity, emptying removes all water, and a pour continues until the source is empty or the destination is full; never stop a pour partway. **Success:** the displayed target amount or target distribution. Every successful path counts. Show jug capacity and current contents with both number and fill level; manual dexterity and estimating a waterline are not part of the puzzle.

**Simple object:** bounded integer states joined by maximal pours. With a spring and drain, gcd and integer linear combinations explain reachable amounts; the closed supply additionally conserves total water. The capacities, water source, and target define the whole puzzle. No colored liquids, forbidden vessel pairs, secret valves, or per-vessel exceptions.

**Sequence:** difference → overflow → measuring free space → repeated remainders → conserve all water → coordinate a small buffer. The sixth is consolidation rather than a claim of a wholly new insight. Counting and tracking amounts to 10 are the practical prerequisites; grade is not a gate. Older or experienced children can start at 3 or 5.

**Authoring limits:** avoid increasingly large coprime capacities that mainly add repetitive taps. Keep a shortest reference route under ten actions in this starter set. Never apply the open two-jug gcd criterion as a sufficiency test for a closed three-jug target. Give undo and current-state recovery hints.

**Lineage:** new instances based on the jug model in [MIT 6.042 Number Theory I, §§3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf). [Week 4 ring notes](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md) supply a related local gcd theme; they do not contain these jug exercises.

### jug-01: Make one unit

**Task:** Use the 3- and 2-unit jugs to leave exactly 1 unit in either jug.

**Setup:** capacities A=3, B=2; start `[0, 0]`. Spring and drain available.

**One solution:** fill A; A→B.

**States:** (0,0) → (3,0) → (1,2).

**Hint:** Fill the large jug, then use the smaller jug as a measuring gap.

**Why this instance:** A capacity difference produces a new amount. Entry: count to 3; recognize full and empty.

**Checked:** shortest solution 2 actions. This is an optional replay target, not required for ordinary completion.

### jug-02: Save the overflow

**Task:** Use the 5- and 3-unit jugs to leave exactly 1 unit in either jug.

**Setup:** capacities A=5, B=3; start `[0, 0]`. Spring and drain available.

**One solution:** fill B; B→A; fill B; B→A.

**States:** (0,0) → (0,3) → (3,0) → (3,3) → (5,1).

**Hint:** The second small jugful will not all fit. Keep what remains.

**Why this instance:** Two small fills can leave a remainder; a partial receiving jug is useful. Explore: count to 5 and remember an intermediate amount.

**Checked:** shortest solution 4 actions. This is an optional replay target, not required for ordinary completion.

### jug-03: Measure what is missing

**Task:** Use the 5- and 3-unit jugs to leave exactly 4 units in either jug.

**Setup:** capacities A=5, B=3; start `[0, 0]`. Spring and drain available.

**One solution:** fill A; A→B; empty B; A→B; fill A; A→B.

**States:** (0,0) → (5,0) → (2,3) → (2,0) → (0,2) → (5,2) → (4,3).

**Hint:** Save two units in the small jug. How much room is left there?

**Why this instance:** Use the receiving jug’s free space as a measure; filling the largest jug first is useful. Explore: same equipment, different target; reverse the earlier plan.

**Checked:** shortest solution 6 actions. This is an optional replay target, not required for ordinary completion.

### jug-04: Carry a remainder twice

**Task:** Use the 7- and 4-unit jugs to leave exactly 2 units in either jug.

**Setup:** capacities A=7, B=4; start `[0, 0]`. Spring and drain available.

**One solution:** fill A; A→B; empty B; A→B; fill A; A→B; empty B; A→B.

**States:** (0,0) → (7,0) → (3,4) → (3,0) → (0,3) → (7,3) → (6,4) → (6,0) → (2,4).

**Hint:** After making three units, use the small jug’s one empty space.

**Why this instance:** Iterated remainder transfer; progress is not monotone in a jug’s displayed amount. Stretch: track intermediate states through two fill-and-transfer rounds.

**Checked:** shortest solution 8 actions. This is an optional replay target, not required for ordinary completion.

### jug-05: Share the spring water

**Task:** All 8 units start in jug A. Share them so A and B each hold 4 and C is empty. Keep every drop.

**Setup:** capacities A=8, B=5, C=3; start `[8, 0, 0]`. Pour only; no adding or discarding water.

**One solution:** A→B; B→C; C→A; B→C; A→B; B→C; C→A.

**States:** (8,0,0) → (3,5,0) → (3,2,3) → (6,2,0) → (6,0,2) → (1,5,2) → (1,4,3) → (4,4,0).

**Hint:** Keep every drop. The smallest jug can return water to the big one.

**Why this instance:** Conservation changes the state graph: emptied water must be stored elsewhere. Stretch: three containers; no tap or drain, but no new arithmetic.

**Checked:** shortest solution 7 actions. This is an optional replay target, not required for ordinary completion.

### jug-06: A small amount is a useful tool

**Task:** All 10 units start in jug A. Share them so A and B each hold 5 and C is empty. Keep every drop.

**Setup:** capacities A=10, B=7, C=3; start `[10, 0, 0]`. Pour only; no adding or discarding water.

**One solution:** A→B; B→C; C→A; B→C; C→A; B→C; A→B; B→C; C→A.

**States:** (10,0,0) → (3,7,0) → (3,4,3) → (6,4,0) → (6,1,3) → (9,1,0) → (9,0,1) → (2,7,1) → (2,5,3) → (5,5,0).

**Hint:** Try to save one unit in the small jug before filling the middle jug.

**Why this instance:** A one-unit buffer lets a later pour remove only two; reuse space, not just water. Stretch: coordinate storage and free capacity; a longer consolidation problem, not a new theorem.

**Checked:** shortest solution 9 actions. This is an optional replay target, not required for ordinary completion.

## Odd-pebble balance

**Child action:** place equal numbers of pebbles on two pans, tap Weigh, then select the odd pebble (and heavy/light when requested). **Success:** identify it within the stated budget, with evidence that singles it out. No written strategy or proof is requested.

**Simple object:** one exceptional object, a balance, and three possible outcomes. The interesting choice is which experiment to make next. This differs from the code family’s fixed feedback transcript: the player selects the measurements adaptively.

**Rules:** all normal pebbles have one common weight. Exactly one suspect differs. No pebble may be on both pans or appear twice. Each weighing uses equal nonzero numbers on each pan so normal weight cancels. A tilt indicates which pan is heavier, not which individual pebble is exceptional. In 1–3 the odd pebble is known to be heavy; in 4–6 it may be heavy or light. Only 5 supplies the additional known normal pebble R.

**Interaction contract:** the app independently samples a valid hidden hypothesis for each new attempt, restart, or replay, including heavy/light when unknown. The secret is saved with the attempt and is unchanged by reload or Undo. The JSON fixed secret is only an authored example and the migration default for old saves. It keeps the set of hypotheses consistent with actual observations. An unsupported lucky guess does not complete a level: invite another weighing, or restart if the budget is exhausted. Reveal a visual candidate notebook on request; do not require notation for signed hypotheses. The solver must guide from the actual observation history.

**Sequence:** include the off-scale outcome → leave a follow-up → fully use three branches → unknown direction → exploit a genuine reference → manufacture references from evidence. Unknown heavy/light is a natural change of the same object, not an extra thematic rule. The last three are stretch material, with spoken instructions and a notebook.

**Mathematics:** ternary decision trees, information bounds, adaptive search, and signed hypotheses. The saved strategy handles every hidden possibility. A count of 3^k possible transcripts is only a lower-bound argument; legality of actual weighings also matters. Each supplied budget is checked by constructing a strategy and exhaustively excluding a strategy with one fewer weighing.

**Lineage:** [Week 6 facilitator](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex), decision trees and guaranteed identification; [Rosen §10.2 extra examples](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf), counterfeit-coin trees; [Nguyen, counterfeit-coin problem and generalization](https://arxiv.org/abs/1005.1391), further reading. The local Daniel Finkel balance article (path in `measurement.json`, pp. 1–3) was useful supplementary inspiration, but its two-bag premise is not imported. All six tasks here are new adaptations.

**Solution notation:** `L` means left pan heavier, `R` right pan heavier, `=` balanced. A history records those results from the start. A listed leaf identifies both the pebble and its sign; in the first three problems the sign is already given to the child. The tables describe one complete strategy, not the only accepted strategy.

### weigh-01: The pebble off the scale

**Task:** One of these 3 pebbles is heavier than the others. Find it using at most 1 weighing.

**Hint:** Try one pebble on each pan. A balance is information too.

**Why this instance:** Three possible outcomes distinguish three locations in one weighing.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A vs B |
| `L` | Declare A heavy |
| `=` | Declare C heavy |
| `R` | Declare B heavy |

**Checked:** all 3 hidden possibilities; worst-case 1 weighings, and a smaller worst-case budget is impossible.

### weigh-02: Keep an unweighed group

**Task:** One of these 4 pebbles is heavier than the others. Find it using at most 2 weighings.

**Hint:** You can learn something without putting every pebble on the scale.

**Why this instance:** A first question need not identify the pebble immediately; preserve a solvable follow-up.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A vs B |
| `L` | Declare A heavy |
| `=` | A vs C |
| `= =` | Declare D heavy |
| `= R` | Declare C heavy |
| `R` | Declare B heavy |

**Checked:** all 4 hidden possibilities; worst-case 2 weighings, and a smaller worst-case budget is impossible.

### weigh-03: Three groups, two questions

**Task:** One of these 9 pebbles is heavier than the others. Find it using at most 2 weighings.

**Hint:** Compare three with three; keep three off the scale.

**Why this instance:** All three outcomes must leave at most three suspects to finish in one more weighing.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A,B,C vs D,E,F |
| `L` | A vs B |
| `L L` | Declare A heavy |
| `L =` | Declare C heavy |
| `L R` | Declare B heavy |
| `=` | G vs H |
| `= L` | Declare G heavy |
| `= =` | Declare J heavy |
| `= R` | Declare H heavy |
| `R` | D vs E |
| `R L` | Declare D heavy |
| `R =` | Declare F heavy |
| `R R` | Declare E heavy |

**Checked:** all 9 hidden possibilities; worst-case 2 weighings, and a smaller worst-case budget is impossible.

### weigh-04: Which way is it different?

**Task:** One of these 3 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 2 weighings.

**Hint:** After a tilt, a pebble on the high side may be the light one.

**Why this instance:** Track signed hypotheses: A-heavy and B-light can produce the same tilt.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A vs B |
| `L` | A vs C |
| `L L` | Declare A heavy |
| `L =` | Declare B light |
| `=` | A vs C |
| `= L` | Declare C light |
| `= R` | Declare C heavy |
| `R` | A vs C |
| `R =` | Declare B heavy |
| `R R` | Declare A light |

**Checked:** all 6 hidden possibilities; worst-case 2 weighings, and a smaller worst-case budget is impossible.

### weigh-05: Use a trusted pebble

**Task:** One of these 4 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 2 weighings. R is a known normal pebble.

**Hint:** R is normal. Use it to make a comparison that could not be made before.

**Why this instance:** A reference changes what experiments are possible; four unknowns now fit in two weighings.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A,B vs C,R |
| `L` | A vs B |
| `L L` | Declare A heavy |
| `L =` | Declare C light |
| `L R` | Declare B heavy |
| `=` | A vs D |
| `= L` | Declare D light |
| `= R` | Declare D heavy |
| `R` | A vs B |
| `R L` | Declare B light |
| `R =` | Declare C heavy |
| `R R` | Declare A light |

**Checked:** all 8 hidden possibilities; worst-case 2 weighings, and a smaller worst-case budget is impossible.

### weigh-06: Learn which pebbles are trustworthy

**Task:** One of these 8 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 3 weighings.

**Hint:** Pebbles ruled out by the first weighing can become references.

**Why this instance:** Switch from locating a group to distinguishing heavy-on-one-side from light-on-the-other; reuse established normal pebbles.

| Results so far | Next weighing or answer |
|---|---|
| `start` | A,B,C vs D,E,F |
| `L` | A,D vs B,E |
| `L L` | A vs B |
| `L L L` | Declare A heavy |
| `L L =` | Declare E light |
| `L =` | A vs C |
| `L = =` | Declare F light |
| `L = R` | Declare C heavy |
| `L R` | A vs B |
| `L R =` | Declare D light |
| `L R R` | Declare B heavy |
| `=` | A vs G |
| `= L` | Declare G light |
| `= =` | A vs H |
| `= = L` | Declare H light |
| `= = R` | Declare H heavy |
| `= R` | Declare G heavy |
| `R` | A,D vs B,E |
| `R L` | A vs B |
| `R L L` | Declare B light |
| `R L =` | Declare D heavy |
| `R =` | A vs C |
| `R = L` | Declare C light |
| `R = =` | Declare F heavy |
| `R R` | A vs B |
| `R R =` | Declare E heavy |
| `R R R` | Declare A light |

**Authored playthrough:** the hidden pebble is E, light. In the strategy above, outcomes L, L, = exercise the full three-weighing signed-hypothesis branch. Other valid experiments are accepted.

**Checked:** all 16 hidden possibilities; worst-case 3 weighings, and a smaller worst-case budget is impossible.

## Reproduce checks

Run `python3 docs/puzzle-expansion/verify_measurement.py` from the app folder. It replays each maximal pour, searches the state graph for the shortest path, checks all branches of every stored weighing strategy, and searches for any strategy at a smaller budget. Data: [measurement.json](measurement.json).


## Additional instances 07–12 — September 23, 2026

These are implemented alongside 01–06. See [the difficulty expansion](difficulty-expansion.md) for criteria and source boundaries, and [the complete review](../PUZZLES.md) for exact starting data and witnesses.

### Spring-water Jugs additions

| ID | Level | Insight |
|---|---|---|
| `jug-07` | Medium | A common factor restricts reachable amounts; a two-unit target remains reachable. |
| `jug-08` | Medium | The receiving jug’s free space determines the remainder; starting with the largest jug is not always shortest. |
| `jug-09` | Hard | An exact distribution makes the location of each remainder matter, not just producing a target somewhere. |
| `jug-10` | Medium | Empty storage is a resource; a sealed process can begin from a split supply rather than a full reservoir. |
| `jug-11` | Hard | The smaller capacities exceed the supply together; reserve space deliberately to build and transfer a useful remainder. |
| `jug-12` | Hard | Several remainders must be stored and reused to split an odd-capacity pair into two equal shares. |

### Odd-pebble Balance additions

| ID | Level | Insight |
|---|---|---|
| `weigh-07` | Medium | Each first outcome must leave no more than three candidates. |
| `weigh-08` | Medium | References allow direct signed comparisons; preserve enough information to identify both the pebble and its sign. |
| `weigh-09` | Hard | A tilt leaves heavy and light hypotheses on opposite pans; a balanced result creates trusted references. |
| `weigh-10` | Hard | Adaptive experiments distinguish signed hypotheses by switching some suspects and leaving others off. |
| `weigh-11` | Hard | A reference changes the available partitions of signed hypotheses; every branch must fit the remaining information budget. |
| `weigh-12` | Hard | Twenty-four signed possibilities must be separated in three ternary experiments. A bad first partition leaves no guaranteed completion. |

