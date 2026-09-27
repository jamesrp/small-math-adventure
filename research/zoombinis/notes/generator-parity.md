# Zoombinis generator parity and difficulty

This report covers the **initial four of the 28 cataloged puzzle families**, compared directly against isolated functions from the supplied executables. The follow-up [24-family specification pass](puzzle-specifications.md) documents the other families, their detailed difficulties, executable models and individual parity boundaries. Both passes focus on generation, feedback and solvability and add no runtime UI or app content.

The central finding is that the level label is only one part of difficulty. Incoming characters can collapse a large rule family into a small deduction problem; supplied clues can offset extra preferences; template scrambling may leave paths intact; and permutation puzzles require a reachability check before their solution length is meaningful.

## Coverage and strength of evidence

| Puzzle | Generator cases matched | Additional native comparisons | Detailed report |
|---|---:|---|---|
| Logical Journey — Allergic Cliffs | 1,560 | 56,880 rule-validator cases; full candidate arrays and per-candidate party counts | [Hidden rules, balancing and query complexity](logical-bridge-parity.md) |
| Logical Journey — Pizza Pass | 520 | 7,200 numeric-feedback cases; all four level-parameter branches | [Preference generation and feedback](logical-pizza-parity.md) |
| Mountain Rescue — Beetle Bug Alley | 120 | 6,200 gameplay-move cases over 310 distinct move/reversal patterns; native confirmation of an unreachable all-matched target | [Permutations, exact distances and reachability](mountain-generator-parity.md) |
| Island Odyssey — Greenhouse | 3,012 | Five labeled transform cases; all four post-generation random lists | [Templates, path structure and scramble invariants](island-generator-parity.md) |

These **5,212 generator comparisons** establish agreement for the listed deterministic fixtures and explicit function boundaries, not an exhaustive proof over all seeds or complete game replay. The Mountain Rescue tests also exercise its fourth data category, which is outside the three normal difficulty levels. The shared random-helper oracle additionally passes 642 cases.

Each model preserves native random-call order, inclusive bounds/modulo behavior, retry rules and final RNG state. Logical Journey and Mountain Rescue execute their original random arithmetic in the oracle. Island Odyssey imports its RNG from MSVCRT, so the oracle supplies a documented compatibility implementation; that external dependency is not independently verified against an original DLL. Reports identify all replaced dependencies and unmodeled session behavior.

The reusable models, source hashes, address ranges, deterministic fixtures and machine-readable reports are organized for future compatibility work. Original code slices and source-derived data remain under ignored `local/`. The additive [`generator-parity.json`](../local/generator-parity.json) and combined [`puzzles.json`](../local/puzzles.json) preserve the original manual/data evidence alongside the newer native evidence.

## Allergic Cliffs: rule complexity versus required deductions

Each Zoombini has four attributes with five values each. One bridge accepts a hidden predicate; the other accepts its complement. Across levels 1–4, the generated predicate is:

1. One value of one attribute: **20** candidate rules.
2. Either of two values of one attribute: **40** candidates.
3. One value in each of two different attributes, connected by **OR**: **150** candidates.
4. One value in each of three different attributes, connected by **OR**: **500** candidates.

The generator enumerates these rules, counts their matches on the actual incoming party, and chooses from a matching-count bucket. It tries to produce a useful split, but the recovered bucket search is asymmetric. Starting at half the party size `h`, its effective preference is `h, h+1, h−1, h−2, …`; it does not search outward symmetrically. A legal 16-member counterexample selects a four-match rule despite an available eleven-match rule.

For deduction difficulty, rules must be collapsed when they classify every party member identically. In one level-4 duplicate-pair fixture, **500 candidates become 133 eligible rules, then 33 distinct matching vectors and 48 distinct oriented classifications**. There are 266 eligible rule/orientation pairs, but only 48 different answers to the actual classification problem.

The follow-up analysis enumerates 260 party/level cases and solves optimal binary-query decision trees for five 16-member fixtures at every level:

| Displayed level | Exact optimal worst-case individual queries, across the five fixtures |
|---|---:|
| 1 | 1–3 |
| 2 | 3–5 |
| 3 | 4–6 |
| 4 | 6–8 |

This is an ideal query model: both acceptance and rejection cost one test, any party member can be queried, the level and generation constraints are known, and the objective is to classify the whole party. It is not a simulation of crossing animations, the six-mistake budget or human strategy. In the duplicate-pair example a greedy decision tree needs seven tests while the optimum needs six. That distinction measures planning in the deduction itself rather than merely counting trait combinations. Full assumptions and constructive witnesses are in the [bridge report](logical-bridge-parity.md).

## Pizza Pass: partition inference and richer evidence

The levels use **5, 7, 7 and 8 preference slots**, respectively, assigned to **1, 2, 3 and 3 trolls**. Each liked item belongs to exactly one troll. Some items may be liked by nobody. Level 2 excludes one slot entirely and permits an empty troll preference; levels 3–4 transfer items between groups until every troll likes something.

The four structural configuration counts are **26, 656, 10,206 and 46,284**, before level 4's pit evidence. These are constrained combinatorial counts, not uniformly sampled possibilities or human-difficulty scores. In 10,000 consecutive entry states, level 2 produces 863 boards with an empty troll preference. Thresholds at levels 3–4 make almost every slot active, but rare unused slots remain possible because the random range includes its upper bound.

Level 4 supplies four rejected pairs arranged as a cycle. Two opposite vertices of the four-cycle share a preference group; the other two vertices belong to the two other groups. This deliberately constructed evidence changes the deduction problem, so the extra slot's raw hypothesis count cannot alone establish that level 4 requires more experiments.

The numeric feedback helper distinguishes an exact preference match, a proper subset, exactly one unwanted item, and multiple unwanted items. Unwanted items take precedence over missing liked items. Its output is verified; the full troll-selection and speech-routing logic remains to be recovered before assigning an optimal experiment count to the encounter. See the [exact algorithm, feedback table and samples](logical-pizza-parity.md).

## Greenhouse: repair of overlapping attribute paths

All levels use the same **12 × 12 board**. Every plant carries leaf, flower-shape and flower-color fields, so a swap moves information in three path systems at once.

| Property | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Leaf / shape / color values | 3 / 4 / 5 | 3 / 4 / 5 | 3 / 6 / 6 |
| Accepted generation swaps | 0 | 20 | 20, between plants with equal leaves |
| Moth traits to route | 3 leaf + 4 shape + 5 color | Same | 6 shape + 6 color |
| Preserved initial structure | All 12 horizontal crossings | No post-scramble crossing guarantee | All 3 vertical leaf corridors |
| Samples with at least one initial moth crossing, out of 1,000 | 1,000 | 420 | 277 |

Level 1 therefore starts with a solved structural layout and asks for path identification/routing. Level 2 requires repairs that can help one attribute and damage another. Level 3 preserves an entire subsystem during generation, then asks the player to repair the other two while dealing with documented moving beetles. Its whole leaf layout is identical across seeds. Player swaps can exchange unequal leaves, so they can damage the corridors that generation preserved.

Seventy-five exhaustive template path certificates establish crossings before any scramble, for every used template, trait and orientation. Reversing the 20 accepted swaps supplies a **static solution in at most 20 swaps**, within the initial budget of 30. That is a useful solvability witness, not a minimum-distance result or an executable schedule around moving creatures.

The measured crossings use orthogonal same-trait graph connectivity. Original path annotations, moving-agent choices, occupancy, timing and the operational win condition remain outside parity. The manuals' assertion that level 2 has no complete paths is stronger than what this generator guarantees. See [exact transforms, random consumption and certificate limits](island-generator-parity.md).

## Beetle Bug Alley: group structure, distance and target reachability

Here difficulty is a permutation problem: each button acts on fixed positions, and the full-restoration target puts every bead on its matching marker. This opens all four doors for that round; the manual also permits partial exits when only some doors' markers match. The distances below measure complete restoration, not the minimum work for a partial exit. The three normal levels select different weighted authored layouts and move pools. Optional reversals change button directions; the resulting groups can be full symmetric groups, alternating groups, independent groups on separate orbits, or a structured subgroup that preserves a two-block partition.

Complete graph exploration covers **266 positive-weight layout/variant combinations** across normal levels. Each group contains from hundreds to hundreds of thousands of reachable arrangements. Exact shortest solutions were also computed for 100 deterministic generator-entry states at each level, using the actual generated button directions:

| Level | Samples able to reach full restoration | Mean shortest restoration sequence among those samples | Maximum shortest restoration sequence |
|---|---:|---:|---:|
| 1 | 100 / 100 | 6.48 | 14 |
| 2 | 99 / 100 | 9.60 | 18 |
| 3 | 100 / 100 | 8.04 | 19 |

The sampling scheme and every entry state are saved. This is not a uniform sample of all generated boards or a human playtest. It establishes substantial overlap between levels and a nonmonotonic mean in this sample; larger boards do not automatically imply longer solutions.

The generator's scramble routine applies sequential transfers differently from gameplay's marked transfers. It then searches for full restoration only up to depth six. If none is found, it accepts the board immediately; otherwise it tries again, up to six attempts, retaining the last nontrivial board when one exists. Six already-solved attempts return the final solved board. This neither guarantees a minimum restoration length nor distinguishes a distant all-matched target from an unreachable one.

A confirmed example uses level 2, entry RNG state **1,788,458,156**, record 10. The original generator returns `[5,6,4,3,2,0,1]`. Its two buttons are a 7-cycle and a 3-cycle, both even permutations; the output is odd, consisting of three transpositions. It cannot reach the identity. Complete enumeration finds exactly the 2,520 even permutations of seven positions and excludes that state; original gameplay instructions also match the two modeled buttons. Native lamp evaluation compares each bead's identity with its position, so graphical color equivalence does not alter this full-restoration target. Static tracing also shows that a successful lever use disables move buttons and ends that board; partial exits cannot be accumulated by subsequently rearranging that same board. Partial rescue remains possible, so this is not a complete softlock claim. The entry state's frequency in actual sessions is unknown.

For that same example, exhaustive search of its 2,520 reachable arrangements finds a maximum of **three doors open together**, achievable in a shortest sequence of **10 button presses**. The initial arrangement already permits one door. Thus the instance has an impossible complete-restoration objective and a finite, measurable partial-rescue objective. The report preserves the exact button sequence and final state, alongside the native evidence for the door conditions.

For compatibility research, preserving this behavior is necessary. For new puzzles requiring complete restoration, using the same legal operations for scrambling and play and retaining a verified solution witness would prevent this failure of reachability. Grade those reachable instances by exact distance and structural decisions. Those are design implications of the evidence; this pass does not alter the source game or the math adventure's content. See [the native proof, partial-exit distinction and level analysis](mountain-generator-parity.md).

## What remains

The other **24 puzzle families** retain the first pass's manuals, authored data and asset evidence; no recovered generator is claimed for them. Further work can extend the same boundary-by-boundary method: exact input and RNG state, generation output, allowed moves/feedback, native differential fixtures, and an explicit difficulty analysis.

Within these four puzzles, the most useful next logic boundaries are Pizza Pass's complete feedback selection and offer limits, Greenhouse's deterministic path annotations and moving-agent rules, and the session-level inputs/progression around all generators. Allergic Cliffs' ideal query model can be extended to mistakes and irreversible crossings. These are logic questions and do not require building a runtime UI.

Human solve difficulty remains distinct from generator parity and mathematical distance. The corpus now supports defensible measurements and reproducible counterexamples; it does not yet supply broad player calibration. Reproduction instructions and environment setup are in the [research README](../README.md).
