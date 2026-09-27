# The mathematical spine

The chosen mechanics are **domino tiling** and **permutation swapping**. They retain the same objects and operations from the child’s activity through undergraduate theory to research. The newer request replaces the plan’s bridge-trail mechanic and native iPad stack with cup swaps and a responsive PWA.

## Domino gardens

| Child’s question | Undergraduate formulation | Research destination |
|---|---|---|
| Does every patch have a partner? | A domino tiling is a perfect matching of a grid graph; checkerboard colors make it bipartite. | Algorithms, height functions, and geometric constraints on tilings. |
| Which pair must we place? Can we split the garden? | Forced edges; parity across cuts; independent components. Equal black/white counts are necessary, not sufficient. | The structure of spaces of tilings. |
| How many different gardens are there? | Counting by cases, product rules, and T(n)=T(n−1)+T(n−2) for a 2×n strip. | Uniform random tilings, limit shapes, and fluctuations. |
| Can we change one answer into another a little at a time? | A graph whose vertices are tilings and edges are 2×2 two-domino flips. | Thurston height functions and flip connectivity; holes change the answer. |

Thurston’s [*Conway’s Tiling Groups* (1990)](https://doi.org/10.1080/00029890.1990.11995660) is the historical anchor. Its publisher record was checked; a full-text mirror was unavailable. The precise local-flip and height-function statements were checked in Saldanha and Tomei’s accessible [author survey](https://arxiv.org/abs/math/9801111). For a simply connected tileable planar region, local flips connect the tilings. Our narrow rings have two tilings and no available 2×2 flips: **no sequence of these flips connects them**.

[MIT’s undergraduate matching notes](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf) provide Hall’s theorem and bottlenecks. [Mathematics for Computer Science](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf), §5.1.5, presents the missing-square L-tromino induction example. The latter is a parent paper activity; the screen uses dominoes only.

The [Arctic Circle Theorem](https://arxiv.org/abs/math/9801068) and Kenyon’s [Gaussian free field work](https://arxiv.org/abs/math-ph/0002027) anchor larger questions about random tilings. Our tiny, deliberately chosen boards do not demonstrate a scaling limit or constitute uniform sampling.

## Cup swaps

| Child’s question | Undergraduate formulation | Research destination |
|---|---|---|
| Where will the cups go? Can a correct cup rest? | Permutations, cycles, inverses, fixed points. | Routing tokens under restricted exchanges. |
| How do the allowed pairs change the route? | A graph on positions induces a graph on all arrangements, a Cayley graph of S_n. | Complexity and algorithms for token swapping. |
| Could fewer swaps work? | n−cycle-count for arbitrary swaps; inversion count for neighbors; distance lower bounds. | Optimal token swapping, including hardness on trees. |
| What happens if we choose swaps randomly? | Finite Markov chains, stationary distribution, mean positive return time. | Random-transposition mixing and representation-theoretic analysis. |

[Judson’s undergraduate text](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation) supports cycles and parity; [Sedgewick and Wayne](https://algs4.cs.princeton.edu/21elementary/) supports inversion counting. [Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707) shows why seemingly simple routing questions remain substantive research. These six-cup puzzles use tractable small graph families; their difficulty is not an NP-hardness claim.

The Fiddler example has expected first positive return **6 swaps**. With n distinct cups and uniform selection among a fixed connected graph’s allowed swaps, the arrangement graph is regular on n! vertices. Its stationary distribution is uniform, so the mean positive return is n!. This identity holds despite period two. The random process and deliberate shortest solving are different questions. [Foundations of Data Science, Chapter 5](https://www.cs.cornell.edu/jeh/bookJan25_2016.pdf) provides the stationary/return-time bridge.

[Diaconis and Shahshahani’s random-transposition paper](https://www.imo.universite-paris-saclay.fr/~pierre-loic.meliot/symmetric/texts/Diaconis%2C%20Shahshahani%20-%20Generating%20a%20random%20permutation%20with%20random%20transpositions.pdf) permits a holding step with probability 1/n. Its mixing result must not be copied unqualified to the period-two chain forced to perform a real swap at every step.

## The three trails

- **K–1:** pair side-sharing squares, protect a forced partner, predict a swap, spot a cup already home, and undo a move. Gardens have 2–8 cells; swap puzzles have 2–4 cups.
- **2–3:** split boards into cases or rooms, count small families, compare constrained routes, and count crossed pairs. Gardens have 8–16 cells; swaps use 3–5 cups.
- **4–5:** investigate recurrence, color/cut arguments, holes and local flips, cycle bounds, and routing obstructions. Gardens have 12–24 cells; swaps use 4–6 cups. An optional “Wonder together” question appears during play, and every solved board asks a mathematical question.

Each trail has 12 gardens and 12 swaps, interleaved into three chapters of eight. All core completions are achievable. Older questions intentionally invite explanations and comparisons instead of making a proof, minimum, or special tiling mandatory. Some older rectangles are easy to cover: their challenge is to count, compare, or justify. Parent review should decide whether these investigations need stronger in-game structure.

## Verification and limits

The tiling author used exhaustive exact cover; a separate reviewer confirmed all counts with an independent bitmask enumeration and checked matching/flip claims. The swap author used BFS and checked applicable cycle, inversion, and star formulas; a separate reviewer confirmed all 36 minima. The application validates all 72 witnesses and accepts alternative valid solutions. Live hints compute a continuation from the current state.

The source material informs the mathematics. All child prompts, parent explanations, and fixed puzzle instances were authored for this prototype. The grade bands and play experience have not yet been tested with children.
