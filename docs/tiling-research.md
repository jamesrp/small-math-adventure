# Mathematical spine for the domino half of Small Math Adventure

Researched and authored September 19, 2026. The companion JSON contains 36 fixed puzzles: twelve per grade band. Every core goal is an achievable exact cover by 1 by 2 dominoes. Questions about impossibility, counting, or changing solutions are optional parent conversations and paper extensions. They are not unimplemented win conditions.

## The choice of mechanic

Domino tiling has an unusually direct route from a child's action to mathematical structure. Pair two neighboring cells. Ask whether every cell can get one partner. Ask how many different pairings exist. Ask whether small changes connect all the answers. Finally, ask what a large randomly chosen answer usually looks like. The activity and the research question are about the same objects, rather than arithmetic exercises with decorative shapes.

The elementary model is a graph with one vertex for each available square and an edge for each shared side. A tiling is a perfect matching. Checkerboard colors provide its two vertex classes. A forced endpoint is a matching constraint; a narrow doorway gives a cut constraint; independent rooms provide a multiplication rule. These are the mathematical reasons for the shapes in this collection.

The source records in the JSON provide primary papers, an author survey that includes its authors' own results, and MIT course materials. Specific small-board counts and forced moves below come from our own exhaustive verification, not from claims that those exact authored boards appear in a publication.

## Research-level directions and their limits

**Height functions and local transformations.** [Thurston, *Conway's Tiling Groups*, American Mathematical Monthly 97 (1990), 757–773](https://doi.org/10.1080/00029890.1990.11995660) is the historical anchor. The publisher page verifies the citation. Its full-text mirror timed out in this session; the mathematical statements were checked in the accessible author survey below. Do not claim the full Thurston article was read here.

[Saldanha and Tomei, *An overview of domino and lozenge tilings*](https://arxiv.org/abs/math/9801111), especially pp. 6 and 11–13, supplies the precise bridge: domino tilings can be encoded by height functions, and local flips connect every pair of tilings of a simply connected region. Holes can separate the flip graph into components, described through flow data. The paper also gives a height-based distance formula within the applicable setting. We use the local flip and hole distinction, without implementing height arithmetic, minimum flip distance, or sampling.

Our three narrow rings give a completely checkable example: each has two tilings and no full 2 by 2 patch, so each tiling is frozen under the small flip. The solid 4 by 4 and 4 by 6 capstones provide the contrasting connected solution graphs. This keeps the simply connected hypothesis visible rather than presenting a false universal rule.

**Large random tilings and visible order.** [Jockusch, Propp and Shor, *Random Domino Tilings and the Arctic Circle Theorem*](https://arxiv.org/abs/math/9801068) studies uniformly random Aztec diamonds. In the large-size limit, the central mixed region approaches a circle, while outer portions are ordered. The authored order-two and order-three diamonds are a foothold for that question, not evidence of an asymptotic theorem. Hand-selected solutions are not a uniform sample. This MVP neither samples uniformly nor claims to display the limiting phenomenon.

**Height fluctuations.** [Kenyon, *Dominos and the Gaussian free field*](https://arxiv.org/abs/math-ph/0002027) connects scaling limits of random domino height functions with the Gaussian free field, under the paper's geometric and limiting assumptions. This is a parent-facing destination: local pairing rules can produce a universal random surface. Nothing in a twelve-domino play session estimates this limit.

**A further research direction, not an MVP feature.** [Saldanha, *Domino tilings of cylinders: the domino group and connected components under flips*](https://arxiv.org/abs/1912.12102), revised 2022, studies three-dimensional regions, a twist invariant, and when flips connect tilings after adding space. It illustrates why “can small moves reach every solution?” remains a substantive research question when geometry changes. We are describing the scope of that paper, not claiming that its conjectures remain open today. The game is strictly two-dimensional.

## Undergraduate bridge

[Albert R. Meyer's MIT 6.042 notes on bipartite matching](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf) explicitly teach bottlenecks and Hall's theorem. In our model, a collection of black squares needs at least as many neighboring white squares. Equal total colors are necessary but do not rule out a local bottleneck. The child's usable version is to protect a square's last neighbor, or notice a doorway that must carry a pair. The odd-room bridge in grades 4–5 is forced by parity even though neither doorway cell starts as a tip.

[Lehman, Leighton and Meyer, *Mathematics for Computer Science* (MIT, 2015)](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf), §5.1.5, pp. 119–122, gives the L-tromino courtyard example and the stronger induction statement: a 2^n by 2^n square with any one square removed can be tiled. A central L supplies one missing cell to each of the other three quadrants. This is a distinct three-cell tile mechanic and appears only as a paper extension. The same text's induction and counting curriculum provides the undergraduate context for constructing families and counting by cases.

Our two-row domino recurrence is proved directly in the parent explanation: the left boundary begins with one vertical domino or two horizontal dominoes. Thus T(n)=T(n−1)+T(n−2), T(0)=T(1)=1. The app's widths five and six have eight and thirteen tilings. No appeal to memorized Fibonacci numbers is required.

## Curriculum progression

| Band | Board sizes | Main reasoning moves |
|---|---:|---|
| K–1 | 2–8 cells | Make a side-sharing pair; find a forced tip; distinguish two solutions; rotate a whole shape; reuse a small room; revise a move; follow a loop; explain a unique solution by pointing. |
| 2–3 | 8–16 cells | Separate starting cases; decompose shapes; pair across odd rows; count independent room choices; inspect colors; reason about a narrow doorway; compare rings with solid boards. |
| 4–5 | 12–24 cells | Derive a recurrence; distinguish necessary conditions from constructions; use even/odd cut arguments; count families; explore boundary effects; recognize why holes matter; ask about a graph of all solutions. |

These are differentiated in reasoning demand as well as board size. The simple instructions keep the core motor task stable. The three hints move from noticing a feature toward a construction, while parent explanations identify the precise mathematical idea. Any “find another,” “count,” “prove,” or paper-board question is an extension and does not block completion.

The 36 board designs are fixed. No random puzzle generation is used. Brief instructions and tap-to-pair interaction support a parent reading aloud to a younger child; the source vocabulary stays in the parent view.

## Verification and content review

`build-math-tiling-content.py` writes the JSON and exhaustively enumerates tilings with a small minimum-degree backtracker. `verify-math-tiling.py` reads that exported JSON, checks every canonical solution is an exact cover of orthogonally adjacent cells, and confirms feasibility again with an independent augmenting-path bipartite matching algorithm. It also checks connectivity of every board, authored counts, selected hint constructions, claimed crossing extensions, reachable dead-end examples, and the complete graph of 2 by 2 flips. The machine-readable report is `math-tiling-validation.json`.

Every board is connected, fits a grid of at most 6 by 6, has at most 24 available cells, and has at least one solution. Counts by puzzle number:

| Band | Counts for puzzles 01 through 12 |
|---|---|
| K–1 | 1, 1, 2, 1, 1, 3, 2, 1, 5, 2, 4, 1 |
| 2–3 | 8, 3, 11, 10, 6, 5, 4, 8, 18, 2, 8, 36 |
| 4–5 | 13, 10, 41, 4, 33, 51, 16, 64, 75, 2, 33, 281 |

The two potentially easy-to-miss cut examples are verified: the even rooms in `tile-45-05` cannot be joined by a crossing domino, while the nine-cell rooms in `tile-45-07` must share the doorway domino. The three rings each have two singleton flip components; the two solid capstones have one component of 36 and 281 tilings respectively.

Hints describe a strategy from the original board. When the child already has tiles in place, concrete highlighted moves must come from the current remaining-board solver, or the UI must label the authored strategy as something to try after changing/restarting the arrangement. A legal domino placement may produce a dead end; no hint should claim that equal remaining colors guarantees completion.

Content is mathematically checked but still awaits the requested parent review and observation of actual children. Grade labels are intended scaffolding, not measured curriculum alignment or a diagnosis of ability.
