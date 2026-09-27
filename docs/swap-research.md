# Cup swaps: mathematical design and research

Researched 2026-09-19. This is the research and authoring record for 36 fixed swap activities: 12 in each of K–1, grades 2–3, and grades 4–5. The puzzle data is in `math-swap-content.json`; `author-swap-content.py` preserves the authored text and regenerates exact solution witnesses.

## The mechanic and its mathematical question

Each cup has a distinct identity and a matching home. A move exchanges the cups at two linked spots. Every supplied spot graph is connected. The child succeeds by restoring the target arrangement; there are no move limits, timers, random completion rules, or impossible swap boards. Shortest solutions are optional material for investigation, not a condition for success.

This is the standard **token-swapping problem** in a small form. The adult question is: given an initial permutation and a graph specifying legal exchanges, how many swaps suffice, and how can we prove that fewer cannot work? Its separate probabilistic relative asks what happens when moves are chosen randomly.

There are two different graphs worth keeping distinct:

- The **spot graph** has one vertex per physical spot; its edges specify legal swaps.
- The **configuration graph** has one vertex per complete arrangement; its edges represent legal one-swap changes. It is a Cayley graph of the symmetric group for these generators.

A connected spot graph on n spots makes all n! distinct arrangements reachable. Even when its spot degrees differ, every vertex of the configuration graph has exactly |E| neighbors: each permitted spot edge gives one distinct transposition.

## Research-level anchors

**Optimal routing and computational complexity.** Aichholzer, Demaine, Korman, Lynch, Lubiw, Masárová, Rudoy, Vassilevska Williams and Wein prove NP-hardness of minimum token swapping even on trees. The paper also identifies paths, cycles, stars and cliques as tractable special graph families. The MVP deliberately uses those families at tiny sizes. The research result motivates why routing and lower bounds matter; it does not imply that our six-cup boards are computationally difficult. [Hardness of Token Swapping on Trees, ESA 2022; preprint 2021](https://arxiv.org/abs/2103.06707).

**When local progress misleads.** Biniaz and collaborators show that an optimal solution on a tree can require moving a correct token at a leaf, disproving a prior conjecture. Our simpler hub puzzles make a weaker, directly visible point: a correct hub token must move so outer tokens can exchange. They are not examples of the stronger leaf theorem. [Token Swapping on Trees, DMTCS 24:2 (2022), paper 9; preprint 2019](https://arxiv.org/abs/1903.06981).

**Random swaps and mixing.** Diaconis and Shahshahani analyze how repeated random transpositions approach the uniform distribution, using representation theory. Their convention chooses two labels independently, permitting no move with probability 1/n; the mixing threshold is around (1/2)n log n with a window of order n. A chain forced to make a genuine transposition every step has period two, so the same convergence statement cannot simply be applied to it. The child's deliberate solving game is not a probability lesson by itself; it supplies the tangible state space for a later random-walk experiment. [Generating a Random Permutation with Random Transpositions (1981), pp. 159–179](https://www.imo.universite-paris-saclay.fr/~pierre-loic.meliot/symmetric/texts/Diaconis%2C%20Shahshahani%20-%20Generating%20a%20random%20permutation%20with%20random%20transpositions.pdf).

## Undergraduate bridge

**Permutations and parity.** Judson's undergraduate abstract algebra text develops cycles, transpositions and the even/odd distinction. These motivate fixed cups, independent loops, reversible swaps and the fact that every solution to a fixed scramble has the same move-count parity. Our unrestricted minimum formula n − c follows by observing that a swap changes cycle count by one and each k-cycle can be split using k − 1 swaps. [Abstract Algebra: Theory and Applications, §5.1](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

**Inversions and algorithms.** Sedgewick and Wayne's undergraduate algorithms text uses the number of out-of-order pairs to analyze insertion sort. For our path graph, every neighbor swap changes one pair's relative order, so the minimum equals the inversion count. This becomes counting crossings, triangular numbers for reversal, and products for two ordered blocks passing each other. [Algorithms, 4th edition, §2.1](https://algs4.cs.princeton.edu/21elementary/).

**Markov chains and occupancy.** Blum, Hopcroft and Kannan discuss stationary distributions and the reciprocal relation between stationary mass and mean return time in Chapter 5; the January 2016 manuscript places this at printed page 141. These supply the later probabilistic bridge. [Foundations of Data Science, Chapter 5](https://www.cs.cornell.edu/jeh/bookJan25_2016.pdf).

## The user's Fiddler question, with conventions stated

Start from the home arrangement. At each step choose uniformly among the allowed spot edges and perform a genuine swap. Let T+ be the first return time after **at least one** step. For a finite connected spot graph, the configuration walk is irreducible, undirected and regular, so its stationary distribution is uniform on the n! states. The mean positive return is

`E[T+] = 1 / stationary_probability(home) = n!`.

This relation does not require aperiodicity. The genuine-swap chain has period two because each move reverses parity and two repetitions of one swap return to the same arrangement. Thus returns occur at even times, while their expectation can still equal n!. Stationary occupancy is a long-run time proportion; it does not assert that the distribution at each large fixed time converges from one starting parity. The return-time identity is explained in [Foundations of Data Science, Chapter 5](https://www.cs.cornell.edu/jeh/bookJan25_2016.pdf).

For three cups with all three pairs allowed, the configuration graph is K3,3. Partition the states into home, the three states one swap from home, and the other two even states. Let h_odd and h_even be expected times to hit home from the latter classes. Then

`h_odd = 1 + (2/3)h_even`, `h_even = 1 + h_odd`.

Consequently h_odd = 5 and the positive return from home is 1 + 5 = **6 swaps**. This is our elementary derivation, not a claim that a single trial usually or necessarily takes six. It also shows why the shortest chosen solution and the expected random return are different questions.

The formula assumes a fixed connected spot graph and uniform selection among its edges. It should not be transferred without checking assumptions to state-dependent legal moves, indistinguishable cups, biased state-dependent choices, or a rule that excludes a holding step from the clock. A fixed state-independent positive weighting of transpositions also preserves uniform stationarity, but that extension is not used in the MVP.

## Age progression

| Band | Concrete work | Mathematical direction |
|---|---|---|
| K–1 | Predict where two cups go; identify a cup already home; repeat a repair; follow links; borrow and restore a spot | Inverses, fixed points, cycles, legal moves and temporary detours |
| 2–3 | Explain independent jobs; count backward pairs; compare a path with a ring; reuse a hub routine | Commutativity, inversions, pair counting, graph metrics and composed operations |
| 4–5 | Explain a minimum; compare lower bounds; investigate a shortcut that does not help; discuss parity and map arrangements | Cycle bounds, invariants, routing obstructions, configuration graphs and a parent-guided bridge to Markov chains |

The same mechanic supports these bands, but the distinction is not just more cups. Paired boards keep the scramble fixed while changing legal links; the learner can isolate the effect of a rule. The grade 4–5 ring with two blocks demonstrates that an extra edge does **not** always improve the optimum. The reversed six-cup ring demonstrates that a plausible distance lower bound can fail to be attainable.

## Catalog

Numbers are within the swap half of each 24-activity band. Complete titles, child wording, three hints, parent prompts, explanations, extensions, source IDs and machine-checkable witnesses are in the JSON file. “Any” means any pair of spots; “path” means neighbors only; “ring” adds the end-to-end edge; “star” means every move uses spot 1.

| # | K–1 | Grades 2–3 | Grades 4–5 |
|---|---|---|---|
| 1 | Two little cups — inverse | Across the table — any pair | Break one loop — cycle bound |
| 2 | One cup can rest — fixed point | Trace the loop — decomposition | Two different loops — add bounds |
| 3 | Follow cup A — three-cycle | Jobs in either order — commutativity | Two three-cup teams — repeated structure, parity |
| 4 | Around the other way — inverse cycle | Five in a loop — repeat a repair | One loop, six cups — proof of minimum |
| 5 | Two friendly pairs — independent jobs | Pairs that crossed — inversions | Count the crossings — inversion proof |
| 6 | Four-cup trail — larger cycle | Everyone crossed — triangular count | The backward parade — worst-case count |
| 7 | Little stepping stones — allowed routes | One long journey — relative order | Two groups pass — multiplication principle |
| 8 | Make room in the middle — temporary move | Two travelers — shared crossing | Does a shortcut help? — sharp distance bound |
| 9 | A quiet last cup — embedded subproblem | Close the loop — new edge | Borrow the hub — necessary disruption |
| 10 | The long way round — path detour | A hub for three — temporary storage | A pair and a loop — compose routines |
| 11 | A new shortcut — controlled comparison | Two hub deliveries — reusable routine | Reverse around a ring — limits of lower bounds |
| 12 | The helping spot — hub exchange | Choose a way around — compare routes | Map the possibilities — configuration graph |

## Verification and delivery notes

The authoring script enumerates legal edges in sorted order and runs breadth-first search from each start to its target. This proves each `minimumMoves` value and supplies a stable shortest witness. It replays every witness, verifies every swap is legal, verifies the target and checks the parity of every witness against the start's inversion parity. State spaces have at most 720 arrangements.

An independent verification pass also searched backward from the goal for all 15 distinct graph/size combinations, enumerating 3,470 states in total. Each graph reached all n! arrangements. It checked 14 unrestricted boards against n − cycle count, 11 path boards against inversion count, and five star boards against the star-cycle formula; the remaining six ring boards matched the reverse-search distances. Every source reference resolved to a source ID in the file.

- K–1 minimum lengths: **1, 1, 2, 2, 2, 3, 2, 3, 2, 5, 1, 3**.
- Grades 2–3: **1, 2, 2, 4, 3, 6, 4, 7, 1, 4, 6, 6**.
- Grades 4–5: **3, 3, 4, 5, 4, 10, 9, 9, 5, 7, 7, 5**.

Token 0 is A, 1 is B, and so on. Edge endpoints and solution moves use zero-based position indices; child copy calls these spots 1, 2, etc. The third hint is explicitly a suggestion **from the starting arrangement**. A live contextual hint should instead recompute a shortest continuation from the current board.

All parent explanation text and all puzzle instances were newly authored for this MVP. The cited sources anchor the mathematics; they are not the source of copied child problems. The age bands are design judgments awaiting child and parent testing, not validated grade-level assessments. Parent guidance should invite explanation, alternative plans and conjectures without treating the mathematical vocabulary or shortest path as required achievement.
