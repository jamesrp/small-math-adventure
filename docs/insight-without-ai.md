# Insight and proof without AI

October 3, 2026. A design memo for the Lantern Caravan, written after comparing the app with the Bellingham math circle worksheets. The playable companion is [`prototypes/proof-tools.html`](../prototypes/proof-tools.html), and [`insight-without-ai-checks.py`](insight-without-ai-checks.py) reproduces every number below. Following the worksheet-generation finding that one adversarial review pass reliably helps, both went through an independent review and revision. Everything here is unpiloted design.

## Summary

1. **The app does not need to judge an explanation. It needs to check a proof object.** In the circle, the adult is a verifier who reads informal arguments. The app is a verifier that reads formal ones. For each insight, the design question is what small object a child can build that is easy to build with the insight, hard without it, and checkable by a program.
2. **For "impossible" and "never" claims, that object usually exists, and it is the argument the circle is after:** a coloring with unequal counts, squares that share too few partners, a two-colored flip map, the odd junctions of a map, an odd cycle, a common divisor of two jugs. Domino gardens get a complete system: every uncoverable garden has a set of squares, none touching, with fewer neighbors than members (Hall's theorem). Your "no witness for the untileable ones" has an answer.
3. **The impossibility half of Week 1's Problem 4 works in the app without AI**, and the prototype's first room implements it: walk, prove with a painting, answer "which numbers of flips work?", then apply the painting to new trips. What the app cannot hear is the child saying why. That stays in the circle.
4. **Your sorting test (2b) is sound if three things hold:** instances chosen against named wrong rules (uniform sampling misses the interesting cases), base rates controlled, and no retries with item-level or count feedback. A second try with "N are wrong" raises a blind guesser's pass rate on six boards from 1 in 64 to 7 in 64.
5. **Mathematician-grade a-ha moments are available inside instance-solving when search is made to fail:** ask for a proof of impossibility, ask at a scale beyond enumeration, play a perfect opponent, or set a budget whose lower bound needs a reason.

Recommendation: keep (1) as the core and widen what counts as a solve, starting with "Can't be done" plus certificate checking in Tile Garden and "choose who starts" in Pebble Duel (§8). Option 3 is cheaper than it was but still not the path for an iPad web app, and where a certificate exists a checker beats a judge (§7).

## 1. Two verifiers

| | Math circle | Lantern Caravan |
|---|---|---|
| Who checks | An adult who listens and asks follow-ups | The app |
| What counts as an explanation | Words, gestures, drawings, objects; partial arguments welcome | An object the app can check: moves, a painting, a marked set, a number, a classification |
| Strength | Noticing, conjecturing, repairing half-right ideas, saying it aloud | Many fresh instances, exact checking, adversarial play, scale |
| Typical failure | Adult time; uneven attention | Guessing, fishing with feedback, rules that only work on easy cases |

The worksheets ask four kinds of question: find one; find all or the best; show it can't be done; explain what you notice. The app already handles "find one" with a witness. The rest of this memo is about the other three.

## 2. What a solo player can hand the app

| Claim | Evidence the app can check | Examples |
|---|---|---|
| It can be done | A witness | Every current puzzle |
| It can't be done | A refutation, which proves a universal statement at once | Paint a garden; star a set; two-color a flip map; mark odd junctions; tap an odd cycle; name a divisor of both jugs |
| This is the best possible | A witness plus a lower bound | Swap cycles (with any-pair swaps, n − cycles swaps are needed); each wire press fixes at most two lamps |
| It always works / here is the rule | Right answers on fresh instances the app chooses | Sorting rounds; "tap every jump that visits all 30 places" |
| I know how to win | Wins against a perfect opponent from fresh starts, including choosing who starts | Pebble Duel |
| I understand the boundary | An example with a stated property, checked by a solver | "A garden with equal colors that can't be covered" |

Problems where both a yes and a no have short proofs are what Edmonds called *well characterized* ("Paths, trees, and flowers," 1965); in complexity terms, NP ∩ coNP. Matchings (Hall, König), Euler routes, linear systems including toggles over F₂, and gcd problems are the classic examples, and they are the backbone of math-circle impossibility questions. Where a problem is NP-complete, there is no short refutation for every impossible instance unless NP = coNP. Tiling with right trominoes is NP-complete for general regions ([Moore and Robson](https://arxiv.org/abs/math/0003039)), so L-tromino gardens should be authored so that each impossible one has an area or coloring refutation; there is no complete child-sized system for them as there is for dominoes. The same holds for three-coloring and for completing partial Latin squares (§9).

Most certificates fall into a few reusable shapes. These could become the shared tools of the whole game:

- **Color or weight:** values on squares so every piece covers a fixed total; compare the board's total.
- **Parity set:** a set of lamps that every move flips an even number of times, so the number lit inside it keeps its parity. For Lantern Wires the set must be a whole island, one that no wire leaves. For Lights-Out-style boards it is a quiet pattern.
- **Closed set:** states containing the start, closed under every move, missing the target. Clock positions that are multiples of 3; jug amounts that are multiples of 3.
- **Two-colored state map:** every move changes the color, so the parity of the number of moves is forced.
- **Partners:** starred squares share too few partners (Hall).
- **Odd structure:** odd junctions (Euler), an odd cycle (two colors).
- **Counting:** more possibilities than outcomes (weighings, code tests).

## 3. Week 1, Problem 4, without AI

> Can you leave A and return to A in exactly three flips? Five flips? Any odd number of flips? Explain what you notice.

The six cards are the tilings of the 2–2–1 hexagon. Drawn as stacked cubes, a flip adds or removes one cube. The map is a square B–C–E–D with A attached to B and F attached to E. The prototype uses the worksheet's cards, letters and orientation, in four stages:

1. **Walk.** A back to A in exactly 4 flips. Teaches the move.
2. **Prove.** A back to A in exactly 5 flips. After failed walks, the child taps *Can't be done*. A paint tool appears with no instructions. *Check proof* reports the broken condition ("One flip keeps the same color"), so the rule is learned from feedback. It accepts only a painting in which every line joins two colors and start and finish share a color while the count is odd (or differ while it is even). Then a strip of dots shows the color alternating for five steps and finishing on the wrong one.
3. **Any odd number?** Tap every number from 1 to 12 that can bring you from A back to A. One try.
4. **Apply it.** Six trip cards ("from D to F in exactly 4"), sorted ✓ or ✗ in one try, with new cards until a round is all right. Some are ruled out by the colors, some by distance (A to F in 2 has the right parity but is too short), and the rest are possible. This checks the step the painting alone does not: using it to decide.

What is checked: that the child can produce a proper two-coloring, knows what it rules out, and can tell a parity obstruction from a distance one. What is not checked: that the child can say why. Whether children can find the paint rule from feedback alone, without a one-line hint, is the first thing to playtest.

The mathematician's version of "what do you notice" is a pleasant one. In the worksheet's ribbon codes (A = RRLL, …, F = LLRR), a flip swaps a neighboring L and R, and the number of cubes equals the number of L-before-R pairs. So the flip map's two-coloring is permutation parity, the same invariant as Cup Swaps with neighboring cups, and counting tilings by cubes gives a Gaussian binomial coefficient. A later puzzle could make that connection the solve.

The whole grades 4–5 packet translates:

| Problem | App form | Evidence |
|---|---|---|
| 1. Find as many tilings as you can | Build tilings onto a shelf that reports when it is complete | Exhaustive list |
| 2. Make the flip map; is it connected? | Draw lines between cards one flip apart | Construction |
| 3. Shortest route A to F | Route within a budget; claim "too short" with the cube count | Witness plus lower bound |
| 4. Odd returns | As above | Two-coloring, then classification |
| 5–6, 8. Draw a ribbon; rebuild a tiling from one | Draw or build; unique answers | Construction |
| 7. Why two L's and two R's? | Predict the code for a larger hexagon before drawing | Prediction at scale |
| 9–10. What does a flip do to the code? | Tap every place in a code where a flip can happen | Classification |

## 4. Insight-gated instances (your 2a)

**What makes an a-ha mathematical.** A Slitherlink lemma such as "a 3 beside a 0" is true only because of that puzzle's rules. A mathematical insight survives a change of instance and transfers to other families: an invariant, a coloring, a bijection, a symmetry, a recursion, an extremal choice, a disguised isomorphism. The line is generality, not genre; a well-known advanced Slitherlink technique is itself a parity argument (a closed loop crosses any boundary an even number of times). Blow and ten Bosch made a related argument in "Designing to Reveal the Nature of the Universe" (IndieCade 2011): puzzles should come from consequences of a system rather than from constraints a designer adds ([summary](https://marctenbosch.com/news/?p=181)). Your AGENTS.md rule against arbitrary clutter says the same about rules. The addition here is that the *question* should come from the system too: is this possible, how many, who wins, what is the least.

**Making search fail.** Insight matters only when search fails:

1. **Ask for a proof of impossibility.** Search never finishes an impossible task.
2. **Ask at scale.** "How many ways can you cover a 2×10 strip?" (89). "Tap every jump that visits all 30 places" (1, 7, 11, 13, 17, 19, 23, 29). "Which amounts from 1 to 15 can you leave in a jug, with jugs of 6 and 15?" (3, 6, 9, 12, 15). Small cases can be listed and checked; the large case needs the structure, and its answer is hard to guess in one try.
3. **Play a perfect opponent.** Random play wins Nim from random starts almost never. An opponent can also act out a lower bound: a balance-puzzle adversary that answers each weighing to keep the most possibilities alive makes "nine outcomes can't separate ten pebbles" felt before it is said.
4. **Set a budget with a lower bound.** Already in the app (shortest swaps, presses, repeated roads); pair it with a lower-bound refutation when the child claims a budget is too small.

My guess about the Tile Garden playtest is that covering open rectangles with dominoes is easy search. "Can this garden be covered?", with impossible gardens mixed in, is a decision problem whose hard half needs the idea. That is a hypothesis to playtest, and it suits 2–3 and 4–5 better than K–1: the coloring proof on the mutilated 6×6 board takes 34 taps.

Two more patterns produce the a-ha mathematicians enjoy most. **Disguises:** Northcott's game is Nim in disguise, and the silver-dollar game is staircase Nim; recognizing the game you already know is the Sprague–Grundy idea in its simplest form, and the evidence is winning. **Pattern traps:** Moser's circle-cutting counts run 1, 2, 4, 8, 16, then 31 (Guy's "strong law of small numbers"); a few of these teach that the reason matters more than the pattern.

## 5. The child as oracle (your 2b)

The sorting test is an interactive proof: the app samples instances, the child answers, and passing many fresh ones is evidence of a rule. Three design points.

**Choose instances against wrong rules.** List the rules a child might hold and make sure every round refutes each one:

| Plausible rule | Refuted by | Prototype |
|---|---|---|
| Odd number of holes ⇒ ✗, even ⇒ ✓ | Two holes of the same color | Level 1 always has one |
| Missing corners ⇒ ✗ | Two neighboring corners (opposite colors, coverable) | Level 2 always has one |
| Same color ⇒ ✗, else ✓ | Exactly right with two holes (Gomory's theorem); fails with four holes when a square is stranded | Level 3 always has a stranded square |
| Stranded ⇒ ✗, ignore colors | An unbalanced board with nothing stranded | Level 3 always has one |

Uniform sampling would miss the interesting cases. Of the 23,409 color-balanced 6×6 boards with four holes, only 540 (2.3%) cannot be covered, and every one of those has a stranded corner square. A port of the prototype's generator confirms that each wrong rule above passes 0% of its level's rounds while the true rule passes 100%.

**Control base rates.** With three Nim piles of 1–7, only 42 of 343 starts lose for the player to move, so under uniform sampling "Me first" is right 88% of the time. Draw positives and negatives deliberately.

**Don't let feedback be fished.** A blind guesser passes six coin-flip boards in one try with probability 1/64. Retries change that sharply: with a second try after "N are wrong," it is 7/64; after a coarse "two or fewer wrong" (the indicator *The Case of the Golden Idol* uses), 3/64. *Return of the Obra Dinn* confirms deductions in batches of three for the same reason, and players still fish when they can retry ([Golden Idol](https://www.gamedeveloper.com/design/case-of-the-golden-idol), [Obra Dinn](https://filmstories.co.uk/?p=83249)). The prototype gives one check per round, reveals a covering or a refutation for every board on a miss, and passes a level after two clean rounds in a row. A blind guesser passes a level about 1 time in 4,000. A forced 4/4 split is worse than coin flips because it lets a child reason by elimination.

**Zoombinis takes the other route.** Allergic Cliffs gives per-item feedback (each Zoombini crosses or is bounced) under a budget of mistakes: learning by feedback under a cost, not a test after the fact. Both are legitimate. Per-item feedback with an error budget suits discovery; one-try rounds with a reveal suit checking a rule the child believes they have. TERC's researchers built detectors of implicit computational thinking from Zoombinis gameplay logs, and the in-game measures correlated with external tests ([Rowe et al., 2021](https://www.terc.edu/publications/assessing-implicit-computational-thinking-in-zoombinis-puzzle-gameplay/)). So instance play can carry evidence of insight.

**Choose who starts** is the cheapest version, already inside a game. Before each Pebble Duel, the child picks "Me first" or "You first." Picking right is the classification; winning against perfect play is the strategy. The prototype counts a win toward its three-in-a-row streak only from a new start, so a memorized start cannot earn it.

## 6. More paths

**Make an example.** Ask for an instance with a stated property and check it with the solver. Watson and Mason argue that generating examples is both a way of learning and a window on understanding ([*Mathematics as a Constructive Activity*](https://oro.open.ac.uk/792), 2005). A garden with equal colors that can't be covered. A Nim start the second player wins. A ring and a jump that miss exactly four places. A room where the light ends top-right after exactly four bounces (Week 9, Problem 13). Three code tests that tell all eight three-lamp secrets apart. Counterexample hunts: "Pip says gardens with two missing corners can never be covered. Find one that proves Pip wrong." One boundary: when the requested example cannot exist ("a map with exactly one odd junction"; "a room ending top-right after three bounces," Week 9, Problem 14), the reason is a theorem about all instances. The app can only report that every attempt fails. Those belong to the circle.

**Find the flaw.** Pip offers a painting with one bad line, a star set with two touching stars, or a valid proof of the wrong claim; the child taps the error. This tests reading a proof rather than building one, and is checkable.

**Commit before acting.** Have the child declare possible or impossible before walking or painting, with an error budget. This closes the "try Can't be done and see what happens" loophole on harder levels.

**Teach the robot.** The child composes a rule from a few blocks and the app tests it on fresh instances. *Human Resource Machine* tests a player's program against randomized inputs the player never sees ([description](https://en.wikipedia.org/wiki/Human_Resource_Machine)); in Betty's Brain, students teach an agent with a concept map and watch it take quizzes ([report](https://hechingerreport.org/kids-teaching-robots-is-this-the-future-of-education/)). For the Caravan: a garden sorter built from "count gold", "count green", "anything stranded?"; a two-pile Nim rule "make the piles equal." The rule is the explanation, tested adversarially. It is the most expensive option, so save it for families with small rule languages.

**Menus of reasons** are cheap and weak. In the PACT Geometry Tutor, students justified steps by choosing a rule from a glossary, and explaining this way improved transfer ([Aleven et al., 1999](https://pact.cs.cmu.edu/koedinger/pubs/Aleven-et-al-AIED99.pdf); Aleven and Koedinger, *Cognitive Science*, 2002). [Proof Blocks](https://arxiv.org/abs/2106.11032) grades proofs assembled from given lines against a dependency graph. "Which of these three paintings proves it?" is the child version. Menus are guessable by trying each option, so use them beside stronger evidence. The "counter lens" in §3 is a menu of this kind.

**Behavioral evidence.** When a child gets an idea, first moves become right and solve times stop growing with board size. Stealth assessment work on *Physics Playground* uses evidence like this ([Kim, Almond and Shute, 2016](https://myweb.fsu.edu/vshute/pdf/IJT.pdf)). Use it to adapt difficulty, not to award "proved."

**Feed the circle.** You run both. A child's paintings, star sets and counterexamples could print or export as discussion objects for the next meeting, and a short voice note ("how I know") could be stored on the device for a parent to hear. That recovers the say-it-aloud step without AI.

## 7. Option 3 revisited

The key and billing problems are smaller than they were. Apple's Foundation Models framework gives native iOS and iPadOS 26 apps a free, offline, on-device model, but only on Apple Intelligence devices (not many older iPads), with about 4K tokens of context and weak reasoning ([overview](https://blakecrosley.com/blog/apple-foundation-models-framework)); it needs a native app. Chrome's Prompt API is stable for web pages in Chrome 148, desktop only ([docs](https://developer.chrome.com/docs/ai/prompt-api)). WebGPU in Safari 26 makes in-browser models possible on an iPad, at the cost of downloads from hundreds of megabytes to gigabytes, and a model small enough to download is unlikely to judge a child's reasoning well.

So for an iPad web app in October 2026, on-device AI is possible but not dependable. More importantly, wherever a certificate exists, a checker is better than a judge: exact, nothing to hallucinate, no child-safety surface. AI's real advantage is open noticing and follow-up questions. If you add it later, keep it optional and keep certificates as the record of what was proved. Storing children's artifacts now keeps that door open.

## 8. Recommendation

Keep "solve a well-defined instance" as the core, and widen what counts as a solve:

1. **"Can't be done" plus certificate checking,** starting with Tile Garden (paint and stars, complete for dominoes) on the 2–3 and 4–5 trails, then Bridge Courier (mark odd junctions on a connected map), Neighbor Lanterns (tap an odd cycle), Spring-water Jugs (name a common divisor), Cup Swaps (draw the cycles) and Clockwork Gates (mark a closed set). For K–1, try a tiny version first: one stranded square to star.
2. **"Choose who starts" in Pebble Duel,** with losing positions sampled at about half.
3. **Sorting and prediction rounds** with generators built against named wrong rules, one check per round, and a certificate reveal.
4. **Make-an-example tasks,** including counterexample hunts.
5. Rule programs later, for one or two families.

**What this touches in the codebase.** The README's systems assume every board has a witness, so refutations need explicit support:

- Suppress the dead-end detector on decision instances; on an impossible garden it would fire on the empty board and give the answer away.
- Define hint levels for refutations: a nudge, then naming the tool, and no solver-derived certificate.
- Extend the content schema, validation and `npm test` from "witness" to "witness or refutation," so each impossible instance stores a checked refutation and the tests check it.
- Save paint and star layers, with undo, like moves; let a checked refutation count as a solve for campaign progress.

A possible addition to AGENTS.md under *Mathematical substance*:

> An instance may ask whether something is possible. The player answers with a witness or with a refutation the app checks (a coloring, a marked set, an odd cycle, a closed set of states). A checked refutation is a required solve, not an optional explanation. Prefer families where every impossible instance has a refutation a child can build; author only such instances in families where this is not guaranteed.

And under *Difficulty and variation*:

> Generated rounds must refute named wrong rules and control base rates, not only check solvability. Allow one check per round; reveal witnesses and refutations after it.

## 9. Family by family

"Complete?" asks whether every impossible instance in the family has a refutation of the listed kind.

| Family | Insight | Refutation or evidence | Complete? | Instance idea |
|---|---|---|---|---|
| Tile Garden, dominoes | Coloring; Hall | Paint (unequal counts) or star set | Yes | "Can this garden be covered?" with impossible ones mixed in |
| Tile Garden, flips | Flip parity | Two-coloring of tilings (dark-left horizontal dominoes change by one per flip) | Parity only; with interior holes the flip graph can be disconnected | "Turn this garden into that one in exactly 5 flips," on gardens without holes |
| Tile Garden, L-trominoes | Area, coloring | Area mod 3 or a coloring | No (NP-complete) | Author only impossible gardens that have one |
| Cup Swaps | Cycles; parity | Arrows from each cup to its home | Yes for parity; minimum n − cycles holds for any-pair swaps only | "Sort in exactly 4 swaps" when the minimum is odd |
| Lantern Wires | Each press flips two lamps | An island with an odd number of mismatched lamps | Yes | Two separate islands, one with an odd number of mismatches |
| Clockwork Gates | +k reaches only multiples of gcd(n, k) | Closed set | Yes | "Tap every jump that visits all 30 places" |
| Mirror Couriers | Unfold; reduce the room | Predictions; make a room | Not a refutation family | Predict the corner of a 12×18 room before launching |
| Bridge Courier | Euler | Odd junctions; an open route repeats at least (odd − 2)/2 roads, a closed one odd/2 | Yes on connected maps | A map with four odd junctions |
| Symbol Orchard | Forced placements | Tag each placement with its reason; a cell with no symbol left | No (completion is NP-complete) | Author contradictions that propagation finds |
| Signal Lanterns | Tests as distances | Make a test set that identifies every secret | Construction | Three tests for all eight three-lamp secrets (three is the fewest) |
| Pebble Duel | Nim-sum | Choose who starts; win from fresh starts | Strategy | Northcott's game after ordinary Nim |
| Neighbor Lanterns | Odd cycles | Tap an odd cycle (two colors); four mutually linked lanterns or an odd wheel (three) | Yes for two colors; no for three (the Grötzsch graph has neither) | "Color with two" on a graph hiding a 5-cycle |
| Spring-water Jugs | Bézout | A number dividing both jugs but not the target | Yes for targets up to the larger jug | Jugs of 6 and 15, target 7 |
| Odd-pebble Balance | Three outcomes per weighing | Counting; an adversary | Counting refutes only when possibilities exceed outcomes; some cases need the adversary | Ten pebbles, two weighings |

The prototype covers dominoes, flips, sorting, and choose-who-starts. Its grown-up notes say what each room verifies and what it does not.

## Sources

- M. ten Bosch and J. Blow, [Designing to Reveal the Nature of the Universe](https://marctenbosch.com/news/?p=181), IndieCade 2011.
- [Mutilated chessboard problem](https://en.wikipedia.org/wiki/Mutilated_chessboard_problem): Gomory's theorem, Hall's theorem. Gomory's statement is also checked by exhaustion in the script.
- J. Edmonds, "Paths, trees, and flowers," *Canadian Journal of Mathematics* 17 (1965); [good characterizations as NP ∩ coNP](https://courses.cs.cornell.edu/cs4814/2020sp/lectures/goodcharacterization.pdf) (Cornell CS 4814 notes).
- C. Moore and J. M. Robson, [Hard Tiling Problems with Simple Tiles](https://arxiv.org/abs/math/0003039).
- E. Rowe et al., [Assessing implicit computational thinking in Zoombinis puzzle gameplay](https://www.terc.edu/publications/assessing-implicit-computational-thinking-in-zoombinis-puzzle-gameplay/), *Computers in Human Behavior* 120 (2021).
- V. Aleven et al., [Tutoring self-explanation in the PACT Geometry Tutor](https://pact.cs.cmu.edu/koedinger/pubs/Aleven-et-al-AIED99.pdf), AIED 1999; V. Aleven and K. Koedinger, [An effective metacognitive strategy](https://serc.carleton.edu/resources/40402.html), *Cognitive Science* 26 (2002).
- S. Poulsen et al., [Proof Blocks](https://arxiv.org/abs/2106.11032).
- A. Watson and J. Mason, [Mathematics as a Constructive Activity: Learners Generating Examples](https://oro.open.ac.uk/792), 2005.
- [The Case of the Golden Idol design interview](https://www.gamedeveloper.com/design/case-of-the-golden-idol); [Return of the Obra Dinn's rule of three](https://filmstories.co.uk/?p=83249); [Human Resource Machine](https://en.wikipedia.org/wiki/Human_Resource_Machine).
- [Betty's Brain and teachable agents](https://hechingerreport.org/kids-teaching-robots-is-this-the-future-of-education/).
- Y. J. Kim, R. Almond and V. Shute, [Applying evidence-centered design for the development of game-based assessments in Physics Playground](https://myweb.fsu.edu/vshute/pdf/IJT.pdf), *International Journal of Testing* (2016).
- [Apple Foundation Models overview](https://blakecrosley.com/blog/apple-foundation-models-framework) (third-party); [Chrome Prompt API](https://developer.chrome.com/docs/ai/prompt-api).
