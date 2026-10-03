# All 222 authored puzzles

Canonical shipped content: `dist/puzzles.json`. Coordinates and allowed swap positions below are one-based. All core boards are solvable; every legal completion is accepted. Hints here describe the initial board. In-app actionable hints are computed from the current board.

## Grades K–1

### 1. A pair of stepping stones

ID: `tile-k1-01` · Domino garden

**Child instruction:** Cover both squares with one domino.

**Idea:** A domino makes one neighboring pair.

```text
□ □
```

Garden: 2 cells, 1 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2).

**Starting-board hints**

1. Find the two squares.
2. They touch along a whole side.
3. Tap one square, then the other.

**Notice:** Notice whether your child uses touching sides rather than touching corners.

**Ask together:** What makes these two squares a pair?

**Explanation:** There are two squares and one allowed neighboring pair. Covering them gives a complete matching: every square has exactly one partner.

**Extension:** Draw two squares that touch only at a corner. Can one straight domino cover them?

**Mathematical connection:** A first example of a perfect matching.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 2. Two little cups

ID: `swap-k1-01` · Cup swaps

**Child instruction:** Swap the two cups. Put each cup on its matching spot.

**Idea:** A swap can undo itself.

Start: **B A** → home: **A B**.

Allowed positions: 1↔2. Exact minimum: **1**. One shortest route: 1↔2.

**Starting-board hints**

1. Find the spot for cup A.
2. Each cup will move to the other spot.
3. From the start, try swapping spots 1 and 2.

**Notice:** Your child tracks both cups, not only the one they tap first.

**Ask together:** If we do the same swap again, where will the cups go?

**Explanation:** The two cups exchange places. Repeating that exact exchange returns to the starting arrangement; no cup disappears or changes its name.

**Extension:** Use two toys. Predict the result after two swaps, then three.

**Mathematical connection:** The first tiny example of an inverse: a transposition is its own inverse.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 3. The narrow trail

ID: `tile-k1-02` · Domino garden

**Child instruction:** Cover the trail. Start at either end.

**Idea:** An end can tell us what must happen next.

```text
□ □ □ □
```

Garden: 4 cells, 2 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4).

**Starting-board hints**

1. Look for an end of the trail.
2. That square has just one neighbor.
3. Pair the two left squares, then the two right squares.

**Notice:** Notice the move your child calls unavoidable.

**Ask together:** Could the end square choose a different partner?

**Explanation:** An end has only one neighbor, so its domino is forced. Removing that pair leaves another pair. The middle pair alone would strand both ends.

**Extension:** Draw a trail of six squares. Keep removing a pair from an end.

**Mathematical connection:** Forced choices are useful when constructing matchings.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 4. One cup can rest

ID: `swap-k1-02` · Cup swaps

**Child instruction:** One cup is home. Help the other two get home.

**Idea:** Notice what can stay the same.

Start: **A C B** → home: **A B C**.

Allowed positions: 1↔2, 1↔3, 2↔3. Exact minimum: **1**. One shortest route: 2↔3.

**Starting-board hints**

1. Which cup already matches its spot?
2. Look at the two cups that do not match.
3. From the start, try swapping spots 2 and 3.

**Notice:** They notice a cup that can be left alone.

**Ask together:** Which two cups need to trade places?

**Explanation:** A is already home. Swapping B and C solves the puzzle while preserving A. Looking for the part that is already correct reduces the work.

**Extension:** With three toys, make a new puzzle in which a different toy stays home.

**Mathematical connection:** A fixed point is an item a permutation leaves in place.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 5. A square, two ways

ID: `tile-k1-03` · Domino garden

**Child instruction:** Cover the little square.

**Idea:** One shape can have more than one solution.

```text
□ □
□ □
```

Garden: 4 cells, 2 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,1)–(2,2).

**Starting-board hints**

1. A domino can lie across or stand up.
2. Try covering one whole row.
3. Cover the top row, then the bottom row.

**Notice:** A different solution is worth noticing even after the puzzle is finished.

**Ask together:** Can you cover the same square another way?

**Explanation:** The top-left square has two possible partners. Each choice forces the other domino. So there are exactly two tilings: two across or two upright.

**Extension:** Remove both dominoes and turn both. Mathematicians call this two-domino change a flip.

**Mathematical connection:** This is the smallest local move between tilings.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111).

### 6. Follow cup A

ID: `swap-k1-03` · Cup swaps

**Child instruction:** Help all three cups find their spots.

**Idea:** One move can make the next move clear.

Start: **C A B** → home: **A B C**.

Allowed positions: 1↔2, 1↔3, 2↔3. Exact minimum: **2**. One shortest route: 1↔2, 2↔3.

**Starting-board hints**

1. Find cup A and its home.
2. Put A home, then look at the other two.
3. From the start, try swapping spots 1 and 2.

**Notice:** They follow one cup through a move and inspect what remains.

**Ask together:** After A gets home, who still needs to move?

**Explanation:** The cups make a three-cup cycle: each is sitting in another cup's home. Two swaps suffice. One cannot suffice because a swap touches only two spots, while all three begin wrong.

**Extension:** Make the same puzzle with toys. Can you solve it by helping B first?

**Mathematical connection:** Following where each item belongs is the concrete beginning of cycle decomposition.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 7. Interlocking elbows

ID: `tile-k1-04` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Fit two L pieces together to make a rectangle.

```text
□ □ □
□ □ □
```

Garden: 6 cells, 2 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(2,1)–(2,2); (1,2)–(1,3)–(2,3).

**Starting-board hints**

1. Fit two L pieces together to make a rectangle.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Fit two L pieces together to make a rectangle. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 8. Around the other way

ID: `swap-k1-04` · Cup swaps

**Child instruction:** The cups moved around. Bring them home.

**Idea:** A plan can work in more than one direction.

Start: **B C A** → home: **A B C**.

Allowed positions: 1↔2, 1↔3, 2↔3. Exact minimum: **2**. One shortest route: 1↔2, 1↔3.

**Starting-board hints**

1. Point from each cup to its home.
2. Choose one cup to put home first.
3. From the start, try swapping spots 1 and 2.

**Notice:** They reuse a strategy after the starting order changes.

**Ask together:** Does helping A first still work?

**Explanation:** This is the other three-cup cycle. A familiar plan still works: put one cup home, then exchange the remaining two. The visible letters change, but the structure of the task stays the same.

**Extension:** Ask the child to invent a three-cup scramble with nobody home.

**Mathematical connection:** The two directions of a three-cycle are inverse permutations.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 9. Three little steps

ID: `tile-k1-05` · Domino garden

**Child instruction:** Cover all three steps.

**Idea:** An even number is helpful, but neighbors still matter.

```text
□ □ · ·
· □ □ ·
· · □ □
```

Garden: 6 cells, 3 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,2)–(2,3); (3,3)–(3,4).

**Starting-board hints**

1. Look at the top-left tip.
2. After its pair is covered, look for the next tip.
3. Place one domino across each short row.

**Notice:** Notice whether the child follows the trail of forced choices.

**Ask together:** Why can each step be a pair?

**Explanation:** Each row has two squares. Covering each row works. Starting from the top-left tip also proves that these three horizontal pairs are forced.

**Extension:** Add one more two-square step on paper. Explain how the old solution grows.

**Mathematical connection:** Building a larger example from a smaller one prepares for induction.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 10. Two friendly pairs

ID: `swap-k1-05` · Cup swaps

**Child instruction:** Two pairs traded places. Help both pairs get home.

**Idea:** Separate jobs can be done in either order.

Start: **B A D C** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4, 2↔3, 2↔4, 3↔4. Exact minimum: **2**. One shortest route: 1↔2, 3↔4.

**Starting-board hints**

1. A and B can help each other.
2. Then look at C and D.
3. From the start, try swapping spots 1 and 2.

**Notice:** They see two small puzzles inside a bigger one.

**Ask together:** Could we help C and D before A and B?

**Explanation:** A and B need one exchange, and C and D need another. These swaps use different spots, so either order has the same result.

**Extension:** Do the two repairs in opposite orders with toys. Compare the endings.

**Mathematical connection:** Disjoint transpositions commute: independent operations can be reordered.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 11. Three across

ID: `tile-k1-06` · Domino garden

**Child instruction:** Cover the six-square garden.

**Idea:** Odd rows can help one another.

```text
□ □ □
□ □ □
```

Garden: 6 cells, 3 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(2,3); (2,1)–(2,2).

**Starting-board hints**

1. Count the squares in one row.
2. A domino may reach from one row to the other.
3. Try three upright dominoes, one in each column.

**Notice:** A row of three need not be solved by itself.

**Ask together:** Where can the last square in a row find a partner?

**Explanation:** A horizontal-only attempt leaves one square in each row. A vertical domino can pair those leftovers. Three vertical dominoes also cover everything.

**Extension:** Find a tiling with just one upright domino. Then find one with three.

**Mathematical connection:** Choosing a useful boundary between subproblems matters.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 12. Four-cup trail

ID: `swap-k1-06` · Cup swaps

**Child instruction:** Put the four cups home, one step at a time.

**Idea:** A bigger cycle can be broken into smaller jobs.

Start: **B C D A** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4, 2↔3, 2↔4, 3↔4. Exact minimum: **3**. One shortest route: 1↔2, 1↔3, 1↔4.

**Starting-board hints**

1. Start by finding cup A.
2. After one cup is home, help another cup.
3. From the start, try swapping spots 1 and 2.

**Notice:** They keep working after a move solves only part of the puzzle.

**Ask together:** Which cup could we settle next?

**Explanation:** All four cups belong to one cycle. Three well-chosen swaps solve it. Fixing a cup breaks a piece off the remaining cycle, so the same small strategy can be repeated.

**Extension:** Make a trail with five toys and try the same plan together.

**Mathematical connection:** This is an accessible instance of breaking a cycle into transpositions.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 13. A room with a tail

ID: `tile-k1-07` · Domino garden

**Child instruction:** Cover the room and its little tail.

**Idea:** Solve a forced part, then a free part.

```text
□ □ · ·
□ □ □ □
```

Garden: 6 cells, 3 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,1)–(2,2); (2,3)–(2,4).

**Starting-board hints**

1. Find the far-right tip.
2. The two tail squares can make a pair.
3. Cover the tail across. Then cover the little square that remains.

**Notice:** The tail has one choice; the square room has two.

**Ask together:** Which part can you change without touching the tail?

**Explanation:** The far-right square forces the tail domino. The remaining 2 by 2 room has two tilings. The tail stays the same in both.

**Extension:** Change just the room by turning its two dominoes together.

**Mathematical connection:** Separate forced structure from local freedom.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111).

### 14. Little stepping stones

ID: `swap-k1-07` · Cup swaps

**Child instruction:** Only linked spots can swap. Help the cups home.

**Idea:** A cup can travel in small steps.

Start: **C A B** → home: **A B C**.

Allowed positions: 1↔2, 2↔3. Exact minimum: **2**. One shortest route: 1↔2, 2↔3.

**Starting-board hints**

1. Look at the links before you tap.
2. Cup C can travel toward its home one link at a time.
3. From the start, try swapping spots 1 and 2.

**Notice:** They distinguish a desired move from an allowed move.

**Ask together:** Can C jump straight home, or does it need a stop?

**Explanation:** C starts two links from home. Two neighbor swaps carry it across the row and also settle A and B. The route matters even when the goal stays the same.

**Extension:** Make a row of three paper spots and let toys move only between neighbors.

**Mathematical connection:** Neighbor swaps are the local operations used by elementary sorting algorithms.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 15. Turning the strip

ID: `tile-k1-08` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Split the garden into two 2-by-3 rectangles; interlock two L pieces in each.

```text
□ □ □ □
□ □ □ □
□ □ □ □
```

Garden: 12 cells, 4 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2)–(2,2); (2,1)–(3,1)–(3,2); (1,3)–(1,4)–(2,4); (2,3)–(3,3)–(3,4).

**Starting-board hints**

1. Split the garden into two 2-by-3 rectangles; interlock two L pieces in each.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Split the garden into two 2-by-3 rectangles; interlock two L pieces in each. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 16. Make room in the middle

ID: `swap-k1-08` · Cup swaps

**Child instruction:** The end cups want to trade. Use the links.

**Idea:** A helpful move may move a cup away from home.

Start: **C B A** → home: **A B C**.

Allowed positions: 1↔2, 2↔3. Exact minimum: **3**. One shortest route: 1↔2, 2↔3, 1↔2.

**Starting-board hints**

1. The end cups are not linked.
2. Let the middle cup move for a little while.
3. From the start, try swapping spots 1 and 2.

**Notice:** They accept a temporary mismatch as part of a plan.

**Ask together:** Can B help the others and come back home?

**Explanation:** The two end cups cannot exchange directly. B must leave its correct spot temporarily; three neighbor swaps restore it while exchanging A and C.

**Extension:** Replay the three moves backward. What happens?

**Mathematical connection:** Restricted token routing shows why counting correct spots is not always a reliable progress measure.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 17. Leave a friend

ID: `tile-k1-09` · Domino garden

**Child instruction:** Cover the picnic blanket.

**Idea:** Every square needs a neighbor at the end.

```text
□ □ □ □
□ □ □ □
```

Garden: 8 cells, 4 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (2,1)–(2,2); (2,3)–(2,4).

**Starting-board hints**

1. Look ahead before placing a domino.
2. Try leaving two touching squares, not two far-apart ones.
3. A fresh start: cover each row with two dominoes across.

**Notice:** Treat undoing a move as useful information.

**Ask together:** If a square gets left alone, which earlier move could you change?

**Explanation:** Four horizontal dominoes work. Some legal partial placements can leave isolated squares. A legal next move does not always lead to a complete tiling.

**Extension:** Find a second complete tiling and compare just the part that changed.

**Mathematical connection:** Backtracking revises a local decision to meet a global condition.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 18. A quiet last cup

ID: `swap-k1-09` · Cup swaps

**Child instruction:** Use the links to get A, B, and C home.

**Idea:** Reuse a small solution inside a larger puzzle.

Start: **B C A D** → home: **A B C D**.

Allowed positions: 1↔2, 2↔3, 3↔4. Exact minimum: **2**. One shortest route: 2↔3, 1↔2.

**Starting-board hints**

1. Cup D is already home.
2. Move A toward the first spot, one link at a time.
3. From the start, try swapping spots 2 and 3.

**Notice:** They recognize the three-cup task despite the extra cup.

**Ask together:** Can we finish while D rests?

**Explanation:** Two neighbor swaps move A left through C and then B. D need not move. An extra object does not always make the part needing work larger.

**Extension:** Add a fifth toy already at home. Does the plan change?

**Mathematical connection:** Decomposing a problem into an active part and fixed points is a useful algorithmic habit.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation); [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 19. Around the pond

ID: `tile-k1-10` · Domino garden

**Child instruction:** Cover every square around the pond.

**Idea:** A first choice can guide a whole loop.

```text
□ □ □
□ · □
□ □ □
```

Garden: 8 cells, 4 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(2,3); (2,1)–(3,1); (3,2)–(3,3).

**Starting-board hints**

1. The pond in the middle stays empty.
2. Choose a partner for one corner, then follow the edge.
3. Pair the top-left with the top-middle. Keep pairing around the pond.

**Notice:** Once one pair is chosen, the other pairs follow around the loop.

**Ask together:** Can you start the first domino the other way?

**Explanation:** The eight squares form a loop. Pairing neighbors in either alternating pattern gives its two tilings. There is no complete 2 by 2 square here to flip.

**Extension:** Try changing one ring tiling into the other. No sequence of two-domino flips can do it; several dominoes must be lifted together.

**Mathematical connection:** Holes can change which rearrangements are possible.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111).

### 20. The long way round

ID: `swap-k1-10` · Cup swaps

**Child instruction:** Help the end cups trade places along the links.

**Idea:** A route can need some temporary stops.

Start: **D B C A** → home: **A B C D**.

Allowed positions: 1↔2, 2↔3, 3↔4. Exact minimum: **5**. One shortest route: 1↔2, 2↔3, 3↔4, 2↔3, 1↔2.

**Starting-board hints**

1. The end cups cannot swap directly.
2. Move D toward the last spot, then help the other cups.
3. From the start, try swapping spots 1 and 2.

**Notice:** They make a multi-step plan without expecting every cup to stay settled.

**Ask together:** Who needs to move out of the way?

**Explanation:** A and D exchange ends using five neighbor swaps. B and C can return home afterward. One route moves D all the way right, then moves A left through the middle cups.

**Extension:** Keep this starting order for the next puzzle and compare its new link.

**Mathematical connection:** The permitted edges define a routing problem; the shortest route depends on that graph.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 21. Two cozy rooms

ID: `tile-k1-11` · Domino garden

**Child instruction:** Cover both little rooms.

**Idea:** Small solutions can fit together.

```text
□ □ · ·
□ □ □ □
· · □ □
```

Garden: 8 cells, 4 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,1)–(2,2); (2,3)–(2,4); (3,3)–(3,4).

**Starting-board hints**

1. Look for a square room at each end.
2. Each room can hold two dominoes.
3. Cover the top-left room across. Cover the bottom-right room across.

**Notice:** Look for the child grouping squares into useful chunks.

**Ask together:** Can you solve one room and reuse that idea in the other?

**Explanation:** The board separates into two 2 by 2 rooms along a vertical cut. Each has two tilings, giving four complete tilings. A domino across the single joining edge cannot complete the board: it would leave three squares in each room.

**Extension:** Keep one room fixed and find both choices for the other room.

**Mathematical connection:** Independent choices lead to multiplication when counting.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 22. A new shortcut

ID: `swap-k1-11` · Cup swaps

**Child instruction:** There is a new link. Use it to help the cups home.

**Idea:** Changing a rule can change the best plan.

Start: **D B C A** → home: **A B C D**.

Allowed positions: 1↔2, 1↔4, 2↔3, 3↔4. Exact minimum: **1**. One shortest route: 1↔4.

**Starting-board hints**

1. Look for the link joining the two end spots.
2. Which cups need to trade places?
3. From the start, try swapping spots 1 and 4.

**Notice:** They inspect the changed links instead of automatically repeating the old plan.

**Ask together:** What can we do now that we could not do before?

**Explanation:** The start matches the previous puzzle, but the end spots are now linked. One swap solves it. Comparing identical starts isolates what the extra route changes.

**Extension:** Draw a different extra link on a row of toy spots. Invent a puzzle that uses it.

**Mathematical connection:** Adding an edge can shorten a shortest path in the configuration graph.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 23. The missing corner

ID: `tile-k1-12` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Place an L on the three central squares outside the quadrant with the missing corner. Each 2-by-2 quadrant then needs one L.

```text
· □ □ □
□ □ □ □
□ □ □ □
□ □ □ □
```

Garden: 15 cells, 5 L-trominoes. A witness (row,column coordinates grouped by piece): (1,3)–(1,4)–(2,4); (1,2)–(2,1)–(2,2); (2,3)–(3,2)–(3,3); (3,4)–(4,3)–(4,4); (3,1)–(4,1)–(4,2).

**Starting-board hints**

1. Place an L on the three central squares outside the quadrant with the missing corner. Each 2-by-2 quadrant then needs one L.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Place an L on the three central squares outside the quadrant with the missing corner. Each 2-by-2 quadrant then needs one L. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 24. The helping spot

ID: `swap-k1-12` · Cup swaps

**Child instruction:** Every swap uses spot 1. Help B and C trade places.

**Idea:** Borrow a spot, then put its cup back.

Start: **A C B D** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4. Exact minimum: **3**. One shortest route: 1↔2, 1↔3, 1↔2.

**Starting-board hints**

1. B and C cannot swap directly.
2. Let A's spot help them pass.
3. From the start, try swapping spots 1 and 2.

**Notice:** They use a correct cup as a temporary helper and restore it.

**Ask together:** How can A help B and C, then return home?

**Explanation:** The links form a star centered at spot 1. Three swaps through this hub exchange B and C and restore A. D can stay home throughout.

**Extension:** Try another pair of outer cups with real toys and one central paper spot.

**Mathematical connection:** A restricted set of swaps can still generate every arrangement. A hub provides indirect exchanges.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation); [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

## Grades 2–3

### 1. The long greenhouse

ID: `tile-23-01` · Domino garden

**Child instruction:** Cover the two-row greenhouse.

**Idea:** The first column gives two kinds of start.

```text
□ □ □ □ □
□ □ □ □ □
```

Garden: 10 cells, 5 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(2,5); (2,1)–(2,2); (2,3)–(2,4).

**Starting-board hints**

1. Focus on the two squares at the far left.
2. Cover them together, or send both dominoes to the right.
3. Five upright dominoes will cover the board.

**Notice:** Listen for a child separating cases rather than guessing every arrangement.

**Ask together:** What are the two ways the left edge can begin?

**Explanation:** Either the first column is one vertical domino, or its two squares begin two horizontal dominoes. Those choices leave a shorter two-row rectangle. This board has eight tilings.

**Extension:** Draw two-row boards of lengths 1, 2, 3, 4 and 5. Their counts are 1, 2, 3, 5 and 8. Explain the add-the-last-two rule.

**Mathematical connection:** A recurrence counts big objects by smaller cases.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 2. Across the table

ID: `swap-23-01` · Cup swaps

**Child instruction:** Any two spots can swap. Bring the cups home.

**Idea:** Check the rules before choosing a route.

Start: **C B A** → home: **A B C**.

Allowed positions: 1↔2, 1↔3, 2↔3. Exact minimum: **1**. One shortest route: 1↔3.

**Starting-board hints**

1. B is already home.
2. A and C can exchange directly.
3. From the start, try swapping spots 1 and 3.

**Notice:** They use a long exchange when it is allowed.

**Ask together:** Do the two cups have to be neighbors today?

**Explanation:** One swap exchanges A and C. An unrestricted swap can repair two far-apart positions at once. Keeping the move rule explicit will matter when paths are introduced.

**Extension:** With three toys, compare this rule with neighbor-only swaps.

**Mathematical connection:** Changing the generating swaps changes distances between the same permutations.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 3. A hook with a room

ID: `tile-23-02` · Domino garden

**Child instruction:** Cover the hook-shaped garden.

**Idea:** Find the part that cannot change.

```text
□ □ □ □
□ □ · ·
□ □ · ·
```

Garden: 8 cells, 4 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (2,1)–(2,2); (3,1)–(3,2).

**Starting-board hints**

1. Look at the top-right tip.
2. Its only neighbor is the square just left of it.
3. Cover the rightmost top pair. Fill the remaining two-column rectangle.

**Notice:** A forced pair can make an irregular outline familiar.

**Ask together:** Which domino appears in every solution?

**Explanation:** The rightmost top pair is forced. Removing it leaves a 3 by 2 rectangle with three tilings, so the hook has three tilings as well.

**Extension:** Find all three by keeping the forced pair fixed.

**Mathematical connection:** Removing a forced edge reduces a matching problem.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 4. Trace the loop

ID: `swap-23-02` · Cup swaps

**Child instruction:** Follow where each cup belongs, then bring them home.

**Idea:** Follow a cycle of destinations.

Start: **B C A D** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4, 2↔3, 2↔4, 3↔4. Exact minimum: **2**. One shortest route: 1↔2, 1↔3.

**Starting-board hints**

1. D can stay where it is.
2. Trace A's home, then the home of the cup sitting there.
3. From the start, try swapping spots 1 and 2.

**Notice:** They describe the loop A, B, C rather than treating each mismatch separately.

**Ask together:** Which cups are all waiting for one another?

**Explanation:** A, B, and C form a three-cycle; D is fixed. Two swaps solve the cycle. At least two are necessary because a single swap cannot move all three misplaced cups.

**Extension:** Find a different first swap that still leads to a two-swap solution.

**Mathematical connection:** Cycle decomposition describes an arrangement by its independent loops.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 5. Odd-height orchard

ID: `tile-23-03` · Domino garden

**Child instruction:** Cover the three-row orchard.

**Idea:** A useful split can ignore the outline.

```text
□ □ □ □
□ □ □ □
□ □ □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (2,1)–(2,2); (2,3)–(2,4); (3,1)–(3,2); (3,3)–(3,4).

**Starting-board hints**

1. The board is three squares tall but four squares wide.
2. Rows of four can each make two pairs.
3. Place two horizontal dominoes in each row.

**Notice:** A tall odd side does not make the whole rectangle impossible.

**Ask together:** Why does pairing across the rows work?

**Explanation:** There are twelve squares, so every tiling uses six dominoes. Each row has an even length and can be tiled separately. Counting area is necessary, while an actual arrangement proves possibility.

**Extension:** Can you include two vertical dominoes? Turn the two dominoes in one 2 by 2 patch.

**Mathematical connection:** Constructive proofs give an arrangement, not only a count.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111); [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 6. Jobs in either order

ID: `swap-23-03` · Cup swaps

**Child instruction:** Fix both mixed-up pairs. Pick which pair goes first.

**Idea:** Independent moves can trade order.

Start: **B A D C** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4, 2↔3, 2↔4, 3↔4. Exact minimum: **2**. One shortest route: 1↔2, 3↔4.

**Starting-board hints**

1. Which cups want each other's spots?
2. Repair one pair, then the other pair.
3. From the start, try swapping spots 1 and 2.

**Notice:** They explain why one repair does not spoil the other.

**Ask together:** Will switching the order of our two swaps change the answer?

**Explanation:** The two disjoint pairs each need one swap. The repairs do not share a spot, so both orders work. Swaps that share a spot need not behave this way.

**Extension:** Try swaps 1–2 and 2–3 in both orders on three toys. Compare the results.

**Mathematical connection:** This is a concrete contrast between commuting and noncommuting operations.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 7. Stepped edges

ID: `tile-23-04` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Start at the top-left corner and the bottom-right corner; fit the middle pieces between them.

```text
□ □ □ ·
□ □ □ □
· □ □ □
· · □ □
```

Garden: 12 cells, 4 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2)–(2,1); (1,3)–(2,3)–(2,4); (2,2)–(3,2)–(3,3); (3,4)–(4,3)–(4,4).

**Starting-board hints**

1. Start at the top-left corner and the bottom-right corner; fit the middle pieces between them.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Start at the top-left corner and the bottom-right corner; fit the middle pieces between them. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 8. Five in a loop

ID: `swap-23-04` · Cup swaps

**Child instruction:** Put the five cups home. Try keeping each settled cup safe.

**Idea:** Repeat a useful step.

Start: **B C D E A** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5, 2↔3, 2↔4, 2↔5, 3↔4, 3↔5, 4↔5. Exact minimum: **4**. One shortest route: 1↔2, 1↔3, 1↔4, 1↔5.

**Starting-board hints**

1. Put one cup in its matching spot.
2. Keep that cup home while you work on the others.
3. From the start, try swapping spots 1 and 2.

**Notice:** They apply the same repair step to a shrinking problem.

**Ask together:** What smaller puzzle is left after the first repair?

**Explanation:** A five-cycle can be split by settling one cup at a time. Four swaps suffice. The final swap settles the last two cups together.

**Extension:** Predict how this strategy would work for six cups arranged in one loop.

**Mathematical connection:** The repeating strategy is a simple algorithm; cycle structure explains its length.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 9. The connecting hallway

ID: `tile-23-05` · Domino garden

**Child instruction:** Cover the two rooms and the hallway.

**Idea:** A narrow connection can force a domino.

```text
□ □ · · □ □
□ □ □ □ □ □
· · · · □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,5)–(1,6); (2,1)–(2,2); (2,3)–(2,4); (2,5)–(2,6); (3,5)–(3,6).

**Starting-board hints**

1. Look at the two middle hallway squares.
2. Try pairing those two squares with one another.
3. Then cover the left 2 by 2 room and the right 3 by 2 room.

**Notice:** Ask for a reason the hallway pair is needed.

**Ask together:** What would be left in the left room if a domino reached out of it?

**Explanation:** The left room has four squares and only one edge to the hallway. A crossing domino would leave three squares there, which cannot be paired internally. Thus the hallway squares pair together. The two rooms then offer 2 times 3 = 6 tilings.

**Extension:** Draw an imaginary line at each doorway. How many dominoes cross it in your solution?

**Mathematical connection:** Parity across a cut constrains a perfect matching.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 10. Pairs that crossed

ID: `swap-23-05` · Cup swaps

**Child instruction:** Only neighbors can swap. Put the cups in order.

**Idea:** Count pairs that are in the wrong order.

Start: **C A D B** → home: **A B C D**.

Allowed positions: 1↔2, 2↔3, 3↔4. Exact minimum: **3**. One shortest route: 1↔2, 3↔4, 2↔3.

**Starting-board hints**

1. Look for a neighbor pair in the wrong order.
2. Swap a wrong-order pair, then check again.
3. From the start, try swapping spots 1 and 2.

**Notice:** They use the target order to choose a swap instead of guessing.

**Ask together:** Which pair is backward compared with A, B, C, D?

**Explanation:** The backward pairs are C–A, C–B, and D–B. Each must cross once. Three neighbor swaps solve the puzzle, and each helpful swap removes one backward pair.

**Extension:** Write the three backward pairs on paper and cross them out as they pass.

**Mathematical connection:** These backward pairs are inversions, the standard measure behind insertion sort.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 11. Missing corners

ID: `tile-23-06` · Domino garden

**Child instruction:** Cover the garden with two corners missing.

**Idea:** Check both colors, then find a construction.

```text
· □ □ □
□ □ □ □
□ □ □ ·
```

Garden: 10 cells, 5 dominoes. A witness (row,column coordinates grouped by piece): (1,2)–(1,3); (1,4)–(2,4); (2,1)–(2,2); (2,3)–(3,3); (3,1)–(3,2).

**Starting-board hints**

1. The missing corners are at opposite ends of this three-row board.
2. Look for vertical pairs near the top-right and bottom-left corners.
3. Pair the top-right square downward, and the bottom-left square upward; complete the touching pairs.

**Notice:** Count squares of each checkerboard color if coloring is available.

**Ask together:** Why does every domino use one square of each color?

**Explanation:** On this 3 by 4 board, the two removed corners have opposite checkerboard colors. Five squares of each color remain. That check permits a tiling but does not prove one exists; completing the board provides the proof.

**Extension:** On paper, instead remove the two top corners of a 3 by 3 board. Those corners share a color, so the remaining odd number of squares cannot tile.

**Mathematical connection:** An invariant can rule out a possibility before searching.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 12. Everyone crossed

ID: `swap-23-06` · Cup swaps

**Child instruction:** The row is backward. Use neighbor swaps to untangle it.

**Idea:** A count can explain how much work is needed.

Start: **D C B A** → home: **A B C D**.

Allowed positions: 1↔2, 2↔3, 3↔4. Exact minimum: **6**. One shortest route: 1↔2, 2↔3, 1↔2, 3↔4, 2↔3, 1↔2.

**Starting-board hints**

1. Every pair is in the wrong order.
2. Move A left or D right, one neighbor at a time.
3. From the start, try swapping spots 1 and 2.

**Notice:** They organize the count instead of losing track of repeated pairs.

**Ask together:** How many other cups does D need to pass? What about C?

**Explanation:** D must pass three cups, C must pass two, and B must pass A. That is 3 + 2 + 1 = 6 crossings. Six helpful neighbor swaps achieve exactly those crossings.

**Extension:** Reverse three toys and compare its 2 + 1 crossings with this row's six.

**Mathematical connection:** The triangular-number pattern comes from counting all unordered pairs.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 13. A tight entrance

ID: `tile-23-07` · Domino garden

**Child instruction:** Cover the little entrance and the big room.

**Idea:** A small group needs enough possible partners.

```text
□ □ □ · □ □
· · □ □ □ □
· · · □ □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(2,3); (1,5)–(1,6); (2,4)–(2,5); (2,6)–(3,6); (3,4)–(3,5).

**Starting-board hints**

1. Start at the far-left tip.
2. After that pair is placed, the last entrance square needs a partner below.
3. Pair the first two top squares, then pair the third top square downward.

**Notice:** Watch how one forced pair reveals another.

**Ask together:** Which neighbor will this square still have after your first move?

**Explanation:** The far-left pair is forced. Then the third top square can only pair with the square below it. The remaining eight-square room has four tilings. Every complete solution shares the first two dominoes.

**Extension:** Before a move, point to a square whose last possible partner might disappear.

**Mathematical connection:** This is the local face of the matching bottleneck question.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 14. One long journey

ID: `swap-23-07` · Cup swaps

**Child instruction:** Cup E is far from home. Swap along the row.

**Idea:** One moving cup can settle many others.

Start: **E A B C D** → home: **A B C D E**.

Allowed positions: 1↔2, 2↔3, 3↔4, 4↔5. Exact minimum: **4**. One shortest route: 1↔2, 2↔3, 3↔4, 4↔5.

**Starting-board hints**

1. A, B, C, and D are in the right order already.
2. Move E right across its next neighbor.
3. From the start, try swapping spots 1 and 2.

**Notice:** They distinguish being in the right relative order from being on the correct spot.

**Ask together:** What happens to the other cups each time E moves right?

**Explanation:** E passes four cups. Each exchange puts the other cup in its home, so four swaps finish. Although all five cups start misplaced, their relative order makes the task simple.

**Extension:** Place the last toy first in a longer row. Predict the number of neighbor swaps.

**Mathematical connection:** Inversion count captures useful structure that the number of misplaced cups misses.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 15. An inside gap

ID: `tile-23-08` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Find the 2-by-2 quadrant containing the gap. Put a central L in the other three quadrants, then fill each quadrant.

```text
□ □ □ □
□ · □ □
□ □ □ □
□ □ □ □
```

Garden: 15 cells, 5 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2)–(2,1); (1,3)–(1,4)–(2,4); (2,3)–(3,2)–(3,3); (3,1)–(4,1)–(4,2); (3,4)–(4,3)–(4,4).

**Starting-board hints**

1. Find the 2-by-2 quadrant containing the gap. Put a central L in the other three quadrants, then fill each quadrant.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Find the 2-by-2 quadrant containing the gap. Put a central L in the other three quadrants, then fill each quadrant. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 16. Two travelers

ID: `swap-23-08` · Cup swaps

**Child instruction:** The end cups must trade places. Use neighbor links.

**Idea:** A shared crossing can help two travelers.

Start: **E B C D A** → home: **A B C D E**.

Allowed positions: 1↔2, 2↔3, 3↔4, 4↔5. Exact minimum: **7**. One shortest route: 1↔2, 2↔3, 3↔4, 4↔5, 3↔4, 2↔3, 1↔2.

**Starting-board hints**

1. Move E toward the far end.
2. After E is home, move A toward the first spot.
3. From the start, try swapping spots 1 and 2.

**Notice:** They see why some cups must move even though they start home.

**Ask together:** When A and E cross each other, does that help one cup or both?

**Explanation:** E is before four smaller cups, and A is after B, C, and D as well. These seven backward pairs give a seven-swap solution. Counting A–E twice would overcount their shared crossing.

**Extension:** Compare two, three, four, and five spots with only the end cups exchanged.

**Mathematical connection:** Counting inversions provides a lower bound and a matching constructive solution.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 17. Keep the leftovers friendly

ID: `tile-23-09` · Domino garden

**Child instruction:** Cover the greenhouse and its lower room.

**Idea:** A good partial solution leaves a solvable remainder.

```text
□ □ □ □ □
□ □ □ □ □
· □ □ · ·
· □ □ · ·
```

Garden: 14 cells, 7 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(2,5); (2,1)–(2,2); (2,3)–(2,4); (3,2)–(3,3); (4,2)–(4,3).

**Starting-board hints**

1. Look for a small room at the bottom.
2. Cover that 2 by 2 room first if you like.
3. Then cover the upper two rows with five upright dominoes.

**Notice:** Praise a reason for undoing a move, not speed.

**Ask together:** What do you know about the shape left after your next domino?

**Explanation:** The lower four cells form a square and the upper ten form a two-row rectangle. Tiling those parts separately is a safe construction. Other legal starts may need revision.

**Extension:** Find a solution with a domino crossing from the top section to the lower room.

**Mathematical connection:** A search algorithm keeps decisions only when the remaining constraints allow completion.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 18. Close the loop

ID: `swap-23-09` · Cup swaps

**Child instruction:** The end spots are linked now. Bring the cups home.

**Idea:** A new edge can create a shortcut.

Start: **E B C D A** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔5, 2↔3, 3↔4, 4↔5. Exact minimum: **1**. One shortest route: 1↔5.

**Starting-board hints**

1. This is the same start as the last puzzle.
2. Find the new link between the end spots.
3. From the start, try swapping spots 1 and 5.

**Notice:** They compare two rule sets while holding the starting arrangement fixed.

**Ask together:** Why did the same scramble become easier?

**Explanation:** Adding the end-to-end link turns the path into a ring. A and E can now exchange in one move; the middle cups need not move at all. The neighbor-row crossing count no longer measures the minimum.

**Extension:** Invent another scramble that becomes easier when the end link is added.

**Mathematical connection:** A shortest-path bound must match the allowed operations; changing the graph changes the metric.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707); [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 19. The square pond

ID: `tile-23-10` · Domino garden

**Child instruction:** Cover the path around the square pond.

**Idea:** A hole changes the rearrangement game.

```text
□ □ □ □
□ · · □
□ · · □
□ □ □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (2,1)–(3,1); (2,4)–(3,4); (4,1)–(4,2); (4,3)–(4,4).

**Starting-board hints**

1. Keep the four pond squares empty.
2. Start at a corner and follow the outside path.
3. Pair the top row across, the bottom row across, and the two middle squares of each side vertically.

**Notice:** There are two complete arrangements, but no two-domino square to turn.

**Ask together:** Can you change just two dominoes and still cover the board?

**Explanation:** The twelve cells make one cycle. Exactly two alternating pairings cover it. Neither contains a 2 by 2 patch, so neither allows a local flip.

**Extension:** Compare this board with the solid 4 by 4 board. The hole removes a way to rearrange tiles locally.

**Mathematical connection:** A tiling space can split into separate components.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111).

### 20. A hub for three

ID: `swap-23-10` · Cup swaps

**Child instruction:** Every swap uses spot 1. Send B, C, and D home.

**Idea:** Use a temporary holding place.

Start: **A C D B** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4. Exact minimum: **4**. One shortest route: 1↔2, 1↔3, 1↔4, 1↔2.

**Starting-board hints**

1. The three outer cups cannot swap directly.
2. Move an outer cup into spot 1, then follow its destination.
3. From the start, try swapping spots 1 and 2.

**Notice:** They plan to restore A after borrowing its spot.

**Ask together:** Can one borrowed spot help all three outer cups?

**Explanation:** B, C, and D form a cycle around the hub. Bring one into spot 1, route the displaced cups through that spot, then return A. Four swaps suffice, compared with two if any pair could exchange.

**Extension:** Write down which cup visits the hub after each move.

**Mathematical connection:** Token swapping on a star is a small, tractable routing problem.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 21. Three linked rooms

ID: `tile-23-11` · Domino garden

**Child instruction:** Cover the three square rooms.

**Idea:** Repeated independent choices multiply.

```text
□ □ · · · ·
□ □ □ □ · ·
· · □ □ □ □
· · · · □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,1)–(2,2); (2,3)–(2,4); (3,3)–(3,4); (3,5)–(3,6); (4,5)–(4,6).

**Starting-board hints**

1. Find a 2 by 2 room at each step.
2. Cover each room on its own.
3. One solution uses a horizontal domino in every two-square row segment.

**Notice:** Keeping a chosen boundary helps organize all the solutions.

**Ask together:** If each room has two choices, how many choices do all three rooms have?

**Explanation:** Each 2 by 2 room has two tilings. A domino across either single joining edge would leave an odd number of cells on one side, so it cannot occur. The choices are independent: 2 times 2 times 2 gives eight tilings.

**Extension:** List the eight solutions with three symbols: across or upright for each room.

**Mathematical connection:** Product counting turns geometry into short symbolic descriptions.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 22. Two hub deliveries

ID: `swap-23-11` · Cup swaps

**Child instruction:** Use spot 1 to repair both mixed-up pairs.

**Idea:** Reuse a small sequence as a tool.

Start: **A C B E D** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5. Exact minimum: **6**. One shortest route: 1↔2, 1↔3, 1↔2, 1↔4, 1↔5, 1↔4.

**Starting-board hints**

1. B and C need to trade; D and E need to trade.
2. Repair one pair through spot 1, then reuse the same pattern.
3. From the start, try swapping spots 1 and 2.

**Notice:** They treat three swaps as one reusable exchange routine.

**Ask together:** Can the plan for B and C also help D and E?

**Explanation:** Each outer pair can be exchanged with three hub swaps that restore A. Reusing that routine solves both pairs in six swaps. The reusable sequence matters more here than speed.

**Extension:** Describe the three-move routine without naming particular cups.

**Mathematical connection:** Building a compound operation from allowed generators is a basic group-theoretic and algorithmic idea.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation); [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 23. Crosswise strips

ID: `tile-23-12` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Split the width into three strips of two columns. Each strip is a 2-by-3 rectangle filled by two interlocking L pieces.

```text
□ □ □ □ □ □
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 18 cells, 6 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2)–(2,2); (2,1)–(3,1)–(3,2); (1,3)–(1,4)–(2,4); (2,3)–(3,3)–(3,4); (1,5)–(1,6)–(2,6); (2,5)–(3,5)–(3,6).

**Starting-board hints**

1. Split the width into three strips of two columns. Each strip is a 2-by-3 rectangle filled by two interlocking L pieces.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Split the width into three strips of two columns. Each strip is a 2-by-3 rectangle filled by two interlocking L pieces. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 24. Choose a way around

ID: `swap-23-12` · Cup swaps

**Child instruction:** The cups can travel around the loop. Find a way home.

**Idea:** More than one route may be worth trying.

Start: **C D E A B** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔5, 2↔3, 3↔4, 4↔5. Exact minimum: **6**. One shortest route: 1↔2, 1↔5, 2↔3, 1↔2, 4↔5, 1↔5.

**Starting-board hints**

1. Look at both directions around the loop.
2. Try a plan, and use Undo if you want to compare another.
3. From the start, try swapping spots 1 and 2.

**Notice:** They compare plans instead of assuming the first plan is the only one.

**Ask together:** Could a cup get home by going the other way?

**Explanation:** There are two directions around the ring. A shortest solution uses six swaps, verified by checking all 120 arrangements. A successful longer route is still a valid solution.

**Extension:** After solving, draw arrangements as dots and connect two when one swap joins them.

**Mathematical connection:** This configuration graph turns a manipulation puzzle into a shortest-path problem; random walks on such graphs lead to deeper probability questions.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707); [Diaconis and Shahshahani (1981), Generating a Random Permutation with Random Transpositions](https://www.imo.universite-paris-saclay.fr/~pierre-loic.meliot/symmetric/texts/Diaconis%2C%20Shahshahani%20-%20Generating%20a%20random%20permutation%20with%20random%20transpositions.pdf).

## Grades 4–5

### 1. The Fibonacci greenhouse

ID: `tile-45-01` · Domino garden

**Child instruction:** Cover the greenhouse; look for smaller cases.

**Idea:** Count by the first choice, not by guessing.

```text
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 12 cells, 6 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(1,6); (2,1)–(2,2); (2,3)–(2,4); (2,5)–(2,6).

**Starting-board hints**

1. At the left edge, choose one vertical domino or two horizontal dominoes.
2. Those starts leave widths five and four.
3. Six vertical dominoes give a first complete tiling.

**Notice:** A reason for an exhaustive case split matters more than remembering a sequence.

**Ask together:** Why can no other kind of start occur at the left edge?

**Explanation:** Let T(n) count tilings of a two-row rectangle of width n. The first column is covered by one vertical domino or by two horizontals. Thus T(n)=T(n-1)+T(n-2), with T(0)=T(1)=1. This board has T(6)=13 tilings.

**Extension:** Predict T(7) without drawing all the solutions: 13+8=21. Explain why the two cases cannot overlap.

**Mathematical connection:** Recurrences and recursive algorithms turn geometry into enumeration.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 2. Break one loop

ID: `swap-45-01` · Cup swaps

**Child instruction:** Any two spots can swap. Untangle the four-cup loop.

**Idea:** Use structure to explain a short solution.

Start: **B C D A** → home: **A B C D**.

Allowed positions: 1↔2, 1↔3, 1↔4, 2↔3, 2↔4, 3↔4. Exact minimum: **3**. One shortest route: 1↔2, 1↔3, 1↔4.

**Starting-board hints**

1. Trace the chain of cups waiting for one another's spots.
2. Try fixing one cup while leaving the smaller loop to solve.
3. From the start, try swapping spots 1 and 2.

**Notice:** They explain their strategy in terms of the loop, not only a memorized sequence.

**Ask together:** How does the loop change when one cup reaches home?

**Explanation:** This arrangement has one cycle. A swap can increase the number of cycles by at most one, while the goal has four one-cup cycles. At least three swaps are needed, and three suffice.

**Extension:** Predict the minimum for one loop of five cups, then test it.

**Mathematical connection:** The unrestricted minimum is n minus the number of cycles, counting fixed points.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 3. Two hooks, one plan

ID: `tile-45-02` · Domino garden

**Child instruction:** Cover the hooks by finding small solvable parts.

**Idea:** Separate constraints from choices.

```text
□ □ □ □ □ □
□ □ · · □ □
□ □ · · · ·
□ □ □ □ · ·
```

Garden: 16 cells, 8 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(1,6); (2,1)–(2,2); (2,5)–(2,6); (3,1)–(3,2); (4,1)–(4,2); (4,3)–(4,4).

**Starting-board hints**

1. Look at the far-right pair on the bottom row.
2. That bottom tip forces a horizontal domino.
3. After that pair, cover the top two rows across and the remaining left squares in pairs.

**Notice:** Ask which claims describe one strategy and which hold in every solution.

**Ask together:** Is this domino forced, or is it simply a useful choice?

**Explanation:** The bottom-right tip forces its neighbor. The remaining region can be tiled in several ways. The complete board has ten tilings, so a successful construction alone does not establish uniqueness.

**Extension:** Find one domino present in every tiling and one that can be changed.

**Mathematical connection:** Existence, uniqueness and counting are different questions.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 4. Two different loops

ID: `swap-45-02` · Cup swaps

**Child instruction:** Find the two loops. Bring all five cups home.

**Idea:** Add the work in independent parts.

Start: **B A D E C** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5, 2↔3, 2↔4, 2↔5, 3↔4, 3↔5, 4↔5. Exact minimum: **3**. One shortest route: 1↔2, 3↔4, 3↔5.

**Starting-board hints**

1. A and B make one loop.
2. C, D, and E make another loop.
3. From the start, try swapping spots 1 and 2.

**Notice:** They partition the problem into a pair and a three-cycle.

**Ask together:** How many swaps does each loop need?

**Explanation:** The pair needs one swap and the three-cycle needs two. Together they need three. Since there are five cups and two cycles, the cycle-count lower bound is also three.

**Extension:** Interleave repairs of the two loops. Does the order matter when their spots are disjoint?

**Mathematical connection:** Cycle decomposition makes a global optimization problem additive when every pair may swap.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 5. Odd rows, even width

ID: `tile-45-03` · Domino garden

**Child instruction:** Cover the orchard with a plan you can explain.

**Idea:** Area is a necessary check; a tiling is a witness.

```text
□ □ □ □ □ □
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 18 cells, 9 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(1,6); (2,1)–(2,2); (2,3)–(2,4); (2,5)–(2,6); (3,1)–(3,2); (3,3)–(3,4); (3,5)–(3,6).

**Starting-board hints**

1. There are eighteen squares.
2. Each row can be split into three neighboring pairs.
3. Place three horizontal dominoes in each of the three rows.

**Notice:** Encourage a statement that also applies to larger rectangles.

**Ask together:** Why can every rectangle with an even width be tiled this way?

**Explanation:** Pair consecutive cells in every row. This works for any rectangle with even width, regardless of height. Conversely, a rectangle with both side lengths odd has odd area and cannot be covered by two-cell tiles.

**Extension:** Now remove two opposite corners from a 4 by 4 paper board. There are fourteen squares, but the color counts differ, so area alone misses the obstruction.

**Mathematical connection:** Constructive arguments and invariants answer complementary questions.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 6. Two three-cup teams

ID: `swap-45-03` · Cup swaps

**Child instruction:** Untangle both teams. Look for a plan you can reuse.

**Idea:** Repeated structure suggests a repeated method.

Start: **B C A E F D** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5, 1↔6, 2↔3, 2↔4, 2↔5, 2↔6, 3↔4, 3↔5, 3↔6, 4↔5, 4↔6, 5↔6. Exact minimum: **4**. One shortest route: 1↔2, 1↔3, 4↔5, 4↔6.

**Starting-board hints**

1. The first three cups form a loop.
2. The last three cups need the same kind of repair.
3. From the start, try swapping spots 1 and 2.

**Notice:** They transfer a method between matching subproblems.

**Ask together:** What stays the same when the cup names change?

**Explanation:** There are two three-cycles, each requiring two unrestricted swaps. Four swaps solve the full arrangement. Relabeling the cups changes the story but preserves the mathematical structure.

**Extension:** Could this starting arrangement be solved in exactly five swaps? Every swap changes parity, so all solutions here have even length.

**Mathematical connection:** Cycle structure and permutation parity provide information about whole families of solutions.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 7. Off-center gap

ID: `tile-45-04` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Treat the four 2-by-2 quadrants as smaller missing-square puzzles. A central L supplies the three missing squares you need.

```text
□ □ □ □
□ □ □ □
□ □ · □
□ □ □ □
```

Garden: 15 cells, 5 L-trominoes. A witness (row,column coordinates grouped by piece): (3,4)–(4,3)–(4,4); (1,1)–(1,2)–(2,1); (1,3)–(1,4)–(2,4); (2,2)–(2,3)–(3,2); (3,1)–(4,1)–(4,2).

**Starting-board hints**

1. Treat the four 2-by-2 quadrants as smaller missing-square puzzles. A central L supplies the three missing squares you need.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Treat the four 2-by-2 quadrants as smaller missing-square puzzles. A central L supplies the three missing squares you need. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 8. One loop, six cups

ID: `swap-45-04` · Cup swaps

**Child instruction:** Bring all six cups home. Try to explain your plan.

**Idea:** A lower bound can prove a plan is best.

Start: **B C D E F A** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5, 1↔6, 2↔3, 2↔4, 2↔5, 2↔6, 3↔4, 3↔5, 3↔6, 4↔5, 4↔6, 5↔6. Exact minimum: **5**. One shortest route: 1↔2, 1↔3, 1↔4, 1↔5, 1↔6.

**Starting-board hints**

1. Everyone belongs to the same loop.
2. Each well-chosen swap can split off one settled cup.
3. From the start, try swapping spots 1 and 2.

**Notice:** They support a minimum claim with a reason, not just repeated attempts.

**Ask together:** Why would four swaps be too few?

**Explanation:** One cycle must become six cycles. Since a swap increases that count by at most one, at least five swaps are necessary. A five-swap plan meets the bound. Counting only six misplaced cups gives the weaker bound of three.

**Extension:** Compare six cups in one loop with the two three-cycles in the previous puzzle.

**Mathematical connection:** An invariant or bounded-change statistic can certify optimality.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 9. A good place to split

ID: `tile-45-05` · Domino garden

**Child instruction:** Cover the bent garden by choosing a useful split.

**Idea:** A decomposition is a proof strategy.

```text
□ □ □ · · ·
□ □ □ □ □ □
· · · □ □ □
· · · □ □ □
· · · □ □ □
```

Garden: 18 cells, 9 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(2,3); (2,1)–(2,2); (2,4)–(2,5); (2,6)–(3,6); (3,4)–(3,5); (4,4)–(4,5); (4,6)–(5,6); (5,4)–(5,5).

**Starting-board hints**

1. The left part is a rectangle two rows tall and three columns wide.
2. The right part is a rectangle four rows tall and three columns wide.
3. Cover the left part vertically. Cover the right part in two-row strips.

**Notice:** The child chooses an imaginary boundary and explains why both sides work.

**Ask together:** Does your split find all solutions, or just enough to prove one exists?

**Explanation:** The two rectangles have six and twelve cells. Tiling them separately constructs a solution. A domino across the single joining edge would leave an odd number of cells on each side, so no complete tiling crosses it. The independent counts multiply: 3 times 11 gives 33.

**Extension:** Explain why a domino cannot cross this particular cut. Then compare the board with odd rooms and a forced crossing.

**Mathematical connection:** Divide-and-conquer can prove existence without enumerating everything.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 10. Count the crossings

ID: `swap-45-05` · Cup swaps

**Child instruction:** Only neighbors can swap. Find the backward pairs.

**Idea:** Measure progress with inversions.

Start: **C A E B D** → home: **A B C D E**.

Allowed positions: 1↔2, 2↔3, 3↔4, 4↔5. Exact minimum: **4**. One shortest route: 1↔2, 3↔4, 2↔3, 4↔5.

**Starting-board hints**

1. A backward pair appears in the opposite order from the goal.
2. Swap backward neighbors to remove one crossing at a time.
3. From the start, try swapping spots 1 and 2.

**Notice:** They count pairs that need to pass, including pairs that are not neighbors yet.

**Ask together:** Which four pairs are in the wrong order?

**Explanation:** The inverted pairs are C–A, C–B, E–B, and E–D. A neighbor swap changes only the relative order of its two cups, so four swaps are necessary. Swapping inverted neighbors achieves four.

**Extension:** Explain why swapping two neighbors already in order adds one inversion.

**Mathematical connection:** The inversion statistic proves the running cost of adjacent-exchange sorting.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 11. The color-balance garden

ID: `tile-45-06` · Domino garden

**Child instruction:** Cover the garden with its two top corners removed.

**Idea:** A coloring test can reject a board, but cannot certify every board.

```text
· □ □ □ □ ·
□ □ □ □ □ □
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 22 cells, 11 dominoes. A witness (row,column coordinates grouped by piece): (1,2)–(1,3); (1,4)–(1,5); (2,1)–(2,2); (2,3)–(2,4); (2,5)–(2,6); (3,1)–(3,2); (3,3)–(3,4); (3,5)–(3,6); (4,1)–(4,2); (4,3)–(4,4); (4,5)–(4,6).

**Starting-board hints**

1. There are twenty-two squares: eleven of each checkerboard color.
2. The shortened top row has four cells.
3. Cover each row horizontally, including the top row.

**Notice:** Separate the useful test from a complete proof.

**Ask together:** What does equal color balance tell us, and what does it not tell us?

**Explanation:** Each domino covers one square of each checkerboard color. These two removed corners have opposite colors, so balance remains. The horizontal row construction proves this particular board is tileable. Equal color counts alone are not sufficient for arbitrary shapes.

**Extension:** On a 4 by 4 paper board, remove opposite corners instead. Both missing squares have the same color, making domino tiling impossible.

**Mathematical connection:** Invariants give obstructions; matchings give actual solutions.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 12. The backward parade

ID: `swap-45-06` · Cup swaps

**Child instruction:** Reverse the parade using neighbor swaps.

**Idea:** Every pair can contribute once.

Start: **E D C B A** → home: **A B C D E**.

Allowed positions: 1↔2, 2↔3, 3↔4, 4↔5. Exact minimum: **10**. One shortest route: 1↔2, 2↔3, 1↔2, 3↔4, 2↔3, 1↔2, 4↔5, 3↔4, 2↔3, 1↔2.

**Starting-board hints**

1. Every pair starts backward.
2. Count the pairs as 4 + 3 + 2 + 1.
3. From the start, try swapping spots 1 and 2.

**Notice:** They recognize a triangular number without double-counting pairs.

**Ask together:** Why does this row need ten crossings?

**Explanation:** All ten pairs of five cups are inverted. Every successful neighbor-only solution must reverse their order. Ten helpful swaps are enough, and no shorter plan can cross all ten pairs.

**Extension:** Predict the minimum for six cups in reverse order. The pair count is 5 + 4 + 3 + 2 + 1 = 15.

**Mathematical connection:** This is the worst case for adjacent-swap sorting, with n(n−1)/2 inversions.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 13. The unavoidable bridge

ID: `tile-45-07` · Domino garden

**Child instruction:** Cover both odd-sized rooms and their shared doorway.

**Idea:** An odd region must send a domino across its boundary.

```text
□ □ □ · · ·
□ □ □ · · ·
□ □ □ □ □ □
· · · □ □ □
· · · □ □ □
```

Garden: 18 cells, 9 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(2,3); (2,1)–(2,2); (3,1)–(3,2); (3,3)–(3,4); (3,5)–(3,6); (4,4)–(4,5); (4,6)–(5,6); (5,4)–(5,5).

**Starting-board hints**

1. Each 3 by 3 room contains nine squares.
2. An odd room cannot be tiled entirely on its own.
3. Place a horizontal domino across the middle doorway, then tile each remaining eight-square room.

**Notice:** The bridge is forced even though neither of its cells is initially a tip.

**Ask together:** Why must a domino cross the doorway?

**Explanation:** Each room has odd area. The only adjacency between rooms is the middle doorway, so its crossing domino is forced. Removing it leaves two 3 by 3 boards missing a corner, each with four tilings; the full board has sixteen.

**Extension:** For any cut, the parity of the number of crossing dominoes equals the parity of the number of cells on one side. Prove it by counting the cells covered internally in pairs.

**Mathematical connection:** Cut constraints are a bridge from parity to perfect matching theory.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 14. Two groups pass

ID: `swap-45-07` · Cup swaps

**Child instruction:** Let A, B, C pass D, E, F using neighbor swaps.

**Idea:** Count crossings as a product.

Start: **D E F A B C** → home: **A B C D E F**.

Allowed positions: 1↔2, 2↔3, 3↔4, 4↔5, 5↔6. Exact minimum: **9**. One shortest route: 3↔4, 2↔3, 1↔2, 4↔5, 3↔4, 2↔3, 5↔6, 4↔5, 3↔4.

**Starting-board hints**

1. Each group is already in order inside itself.
2. Each cup in one group must pass every cup in the other.
3. From the start, try swapping spots 3 and 4.

**Notice:** They organize nine crossings into three groups of three.

**Ask together:** Why is the needed crossing count 3 times 3?

**Explanation:** The only inverted pairs have one cup from each block. There are 3 × 3 = 9 such pairs. Nine swaps suffice. There is no need to disturb the order within either block.

**Extension:** Predict the crossing count for a block of two passing a block of four.

**Mathematical connection:** Counting pairs across two sets is the multiplication principle in a sorting problem.

**Sources:** [Robert Sedgewick and Kevin Wayne, Algorithms, 4th edition — Elementary Sorts](https://algs4.cs.princeton.edu/21elementary/).

### 15. A square with a tail

ID: `tile-45-08` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Reserve two L pieces for the bottom row: one reaches up at the left edge, the other reaches up above its right end. Then work around the remaining boundary.

```text
□ □ □ □ □
□ □ □ □ □
□ □ □ □ □
□ □ □ □ □
□ □ □ □ ·
```

Garden: 24 cells, 8 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(2,1)–(2,2); (1,2)–(1,3)–(2,3); (1,4)–(1,5)–(2,5); (2,4)–(3,3)–(3,4); (3,5)–(4,4)–(4,5); (4,3)–(5,3)–(5,4); (3,1)–(3,2)–(4,2); (4,1)–(5,1)–(5,2).

**Starting-board hints**

1. Reserve two L pieces for the bottom row: one reaches up at the left edge, the other reaches up above its right end. Then work around the remaining boundary.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Reserve two L pieces for the bottom row: one reaches up at the left edge, the other reaches up above its right end. Then work around the remaining boundary. These reservations leave an 18-cell region with several corner choices. Check the next corner before committing; area divisible by three alone does not guarantee an L tiling.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 16. Does a shortcut help?

ID: `swap-45-08` · Cup swaps

**Child instruction:** The ends are linked now. Find a route for every cup.

**Idea:** An extra choice does not always shorten a best plan.

Start: **D E F A B C** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔6, 2↔3, 3↔4, 4↔5, 5↔6. Exact minimum: **9**. One shortest route: 1↔2, 1↔6, 2↔3, 1↔2, 3↔4, 2↔3, 5↔6, 1↔6, 1↔2.

**Starting-board hints**

1. This is the same start as the previous puzzle.
2. Each cup is three links from home, whichever way it travels.
3. From the start, try swapping spots 1 and 2.

**Notice:** They test the idea that an extra edge must always help.

**Ask together:** Could this ring finish in fewer than nine swaps?

**Explanation:** Each of six cups starts three ring-edges from home: total distance 18. One swap moves two cups one edge each, reducing that total by at most two. At least nine swaps are required. The earlier nine-swap path plan still works, so the new link does not improve the minimum.

**Extension:** Find a different start where the new end link does help.

**Mathematical connection:** Graph-distance lower bounds can certify routing optimality even when inversion count no longer applies.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 17. The windowed courtyard

ID: `tile-45-09` · Domino garden

**Child instruction:** Cover the courtyard around the little window.

**Idea:** A valid local move still needs a global check.

```text
□ □ □ □ □ □
□ □ · · □ □
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 22 cells, 11 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(1,6); (2,1)–(2,2); (2,5)–(2,6); (3,1)–(3,2); (3,3)–(3,4); (3,5)–(3,6); (4,1)–(4,2); (4,3)–(4,4); (4,5)–(4,6).

**Starting-board hints**

1. The two missing squares form a window in the second row.
2. Each remaining row segment has even length.
3. Pair the top row across, both pairs beside the window across, then both bottom rows across.

**Notice:** Ask what remains possible after a move near the window.

**Ask together:** Can you explain why the squares left over still fit together?

**Explanation:** The row-by-row construction tiles all 22 cells. There are 75 complete tilings. The hole changes the available connections; merely preserving equal checkerboard counts after a placement does not guarantee completion.

**Extension:** Choose a square with few remaining neighbors before choosing a square with many. Explain why that may reveal trouble sooner.

**Mathematical connection:** Constraint propagation makes exact-cover search more efficient.

**Sources:** [Albert R. Meyer — Bipartite Matching, MIT Mathematics for Computer Science](https://courses.csail.mit.edu/6.042/spring18/bipartite-matching.pdf).

### 18. Borrow the hub

ID: `swap-45-09` · Cup swaps

**Child instruction:** Every swap uses spot 1. Untangle the outer loop.

**Idea:** A correct item may need to move temporarily.

Start: **A C D E B** → home: **A B C D E**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5. Exact minimum: **5**. One shortest route: 1↔2, 1↔3, 1↔4, 1↔5, 1↔2.

**Starting-board hints**

1. A is home, but every legal move must use A's spot.
2. Bring an outer cup into the hub and follow the loop.
3. From the start, try swapping spots 1 and 2.

**Notice:** They plan a temporary disruption and include its repair.

**Ask together:** Why can we not insist that A stay home?

**Explanation:** The four outer cups form a cycle and have no direct links to one another. A must leave its home so the cycle can pass through the hub. Five swaps suffice; a rule forbidding all temporary mismatches would prevent any move.

**Extension:** Compare with unrestricted swaps, where the same outer cycle needs only three.

**Mathematical connection:** The child meets the failure of a naive 'never disturb correct tokens' rule. Research on trees studies much subtler failures, including correct leaves.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707); [Biniaz et al. (2022), Token Swapping on Trees](https://arxiv.org/abs/1903.06981).

### 19. The frozen ring

ID: `tile-45-10` · Domino garden

**Child instruction:** Cover the narrow ring around the large pond.

**Idea:** Several solutions need not be linked by small flips.

```text
□ □ □ □ □
□ · · · □
□ · · · □
□ · · · □
□ □ □ □ □
```

Garden: 16 cells, 8 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (1,3)–(1,4); (1,5)–(2,5); (2,1)–(3,1); (3,5)–(4,5); (4,1)–(5,1); (5,2)–(5,3); (5,4)–(5,5).

**Starting-board hints**

1. The sixteen cells form a single loop.
2. Once the first pair is chosen, keep alternating pairs around the loop.
3. Start with the two leftmost top cells; follow the perimeter to finish.

**Notice:** This board deliberately breaks an overgeneralization from solid rectangles.

**Ask together:** There are two tilings. Can a two-domino square flip connect them?

**Explanation:** The cycle has exactly two perfect matchings. Every domino choice forces the next around the ring. There is no 2 by 2 patch, so each solution has zero local flips. The two tilings occupy different components of the flip graph.

**Extension:** Compare with the solid courtyard. The theorem linking every pair by flips requires a simply connected region; this ring has a hole.

**Mathematical connection:** Topology can obstruct local transformations.

**Sources:** [Nicolau C. Saldanha and Carlos Tomei — An overview of domino and lozenge tilings (1998)](https://arxiv.org/abs/math/9801111).

### 20. A pair and a loop

ID: `swap-45-10` · Cup swaps

**Child instruction:** Use the hub to repair the outer pair and outer loop.

**Idea:** Combine reusable routing routines.

Start: **A C B E F D** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔3, 1↔4, 1↔5, 1↔6. Exact minimum: **7**. One shortest route: 1↔2, 1↔3, 1↔2, 1↔4, 1↔5, 1↔6, 1↔4.

**Starting-board hints**

1. B and C form a pair; D, E, and F form a loop.
2. Finish one group and restore the hub before the next.
3. From the start, try swapping spots 1 and 2.

**Notice:** They build a full solution from two smaller procedures.

**Ask together:** What does each routine promise about the hub when it ends?

**Explanation:** The outer pair can be repaired in three hub swaps and the outer three-cycle in four. Both routines restore A, so they compose into a seven-swap solution. Exhaustive search confirms that seven is minimal here.

**Extension:** Describe the routine for an outer cycle of k cups. It uses k + 1 hub swaps when the hub begins and ends correct.

**Mathematical connection:** Local procedures with clear input and output conditions are useful in constructive proofs and algorithms.

**Sources:** [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation); [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707).

### 21. A growing staircase

ID: `tile-45-11` · Domino garden

**Child instruction:** Cover the staircase using a pattern that can grow.

**Idea:** Find a rule that works for a whole family.

```text
□ □ · · · ·
□ □ □ □ · ·
□ □ □ □ □ □
· · □ □ □ □
· · · · □ □
```

Garden: 18 cells, 9 dominoes. A witness (row,column coordinates grouped by piece): (1,1)–(1,2); (2,1)–(2,2); (2,3)–(2,4); (3,1)–(3,2); (3,3)–(3,4); (3,5)–(3,6); (4,3)–(4,4); (4,5)–(4,6); (5,5)–(5,6).

**Starting-board hints**

1. Count the squares in each row: 2, 4, 6, 4, 2.
2. Every count is even.
3. Pair each row from its left edge.

**Notice:** A repeatable argument is stronger than a single successful drawing.

**Ask together:** What property of every row makes your method work?

**Explanation:** Each row is one contiguous even-length interval. Pairing consecutive squares tiles it. Therefore any board whose rows are contiguous even-length intervals has this construction, regardless of how the rows are shifted.

**Extension:** On paper, explore a different tile: every 2^n by 2^n square with one cell removed can be tiled by L-trominoes. A central L gives each of four smaller squares one missing cell. Those three-cell tiles are not in this domino game.

**Mathematical connection:** A construction for an entire family prepares for induction.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 22. Reverse around a ring

ID: `swap-45-11` · Cup swaps

**Child instruction:** Bring the backward cups home using the ring links.

**Idea:** Compare lower bounds instead of trusting just one.

Start: **F E D C B A** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔6, 2↔3, 3↔4, 4↔5, 5↔6. Exact minimum: **7**. One shortest route: 1↔2, 1↔6, 1↔2, 3↔4, 5↔6, 1↔6, 1↔2.

**Starting-board hints**

1. The end link lets A and F pass directly.
2. Try tracing short routes for all the cups, then compare plans.
3. From the start, try swapping spots 1 and 2.

**Notice:** They distinguish a plausible lower bound from an attainable solution.

**Ask together:** Can the best-looking route for each cup work for all cups together?

**Explanation:** The total ring distance is ten, so distance alone only proves a bound of five swaps. Exhaustive search finds that seven are needed. The reversed permutation is odd, so every valid solution length is odd; parity rules out six but cannot by itself rule out five.

**Extension:** Compare the seven-swap ring solution with the fifteen swaps required on a path. Try to explain the remaining gap between the distance bound and seven.

**Mathematical connection:** Competing routing demands make token swapping richer than moving each token along its own shortest path.

**Sources:** [Aichholzer et al. (2022), Hardness of Token Swapping on Trees](https://arxiv.org/abs/2103.06707); [Thomas Judson, Abstract Algebra: Theory and Applications — Permutation Groups](https://math.libretexts.org/Bookshelves/Abstract_and_Geometric_Algebra/Abstract_Algebra%3A_Theory_and_Applications_%28Judson%29/05%3A_Permutation_Groups/5.01%3A_Definitions_and_Notation).

### 23. Joining rectangles

ID: `tile-45-12` · L-tromino garden

**Child instruction:** Cover every patch with L-trominoes.

**Idea:** Separate this into two 3-by-4 rectangles, then split each into two 3-by-2 blocks. Avoid sealing off a strip one square wide.

```text
□ □ □ □ □ □
□ □ □ □ □ □
□ □ □ □ □ □
□ □ □ □ □ □
```

Garden: 24 cells, 8 L-trominoes. A witness (row,column coordinates grouped by piece): (1,1)–(2,1)–(2,2); (1,2)–(1,3)–(2,3); (1,4)–(2,4)–(2,5); (1,5)–(1,6)–(2,6); (3,1)–(4,1)–(4,2); (3,2)–(3,3)–(4,3); (3,4)–(4,4)–(4,5); (3,5)–(3,6)–(4,6).

**Starting-board hints**

1. Separate this into two 3-by-4 rectangles, then split each into two 3-by-2 blocks. Avoid sealing off a strip one square wide.
2. Before placing an L, check which pieces can still reach the corners.
3. Use the highlighted L placement, then look for the next corner.

**Notice:** Watch for planning around corners instead of filling a row greedily.

**Ask together:** Which empty region will remain after this L?

**Explanation:** Separate this into two 3-by-4 rectangles, then split each into two 3-by-2 blocks. Avoid sealing off a strip one square wide. Every piece covers three corners of a 2-by-2 square; rotation is allowed. The required task is an exact cover, not a proof.

**Extension:** Try another cover, or explain why a tempting first placement leaves a gap.

**Mathematical connection:** Exact cover groups cells into triples. Deficient power-of-two squares also admit a divide-and-conquer construction; domino matching and flip theorems do not automatically apply to L tiles.

**Sources:** [Eric Lehman, F. Thomson Leighton and Albert R. Meyer — Mathematics for Computer Science (2015), induction and counting](https://ocw.mit.edu/courses/6-042j-mathematics-for-computer-science-spring-2015/mit6_042js15_textbook.pdf).

### 24. Map the possibilities

ID: `swap-45-12` · Cup swaps

**Child instruction:** Plan a way home around the ring. Compare two routes.

**Idea:** Think about a whole space of arrangements.

Start: **C E B F D A** → home: **A B C D E F**.

Allowed positions: 1↔2, 1↔6, 2↔3, 3↔4, 4↔5, 5↔6. Exact minimum: **5**. One shortest route: 1↔2, 1↔6, 2↔3, 4↔5, 5↔6.

**Starting-board hints**

1. Which allowed swap would put a cup home?
2. If your plan gets tangled, undo a move and explore another branch.
3. From the start, try swapping spots 1 and 2.

**Notice:** They regard exploration as comparing routes through possible arrangements.

**Ask together:** How could we record all the arrangements without losing any?

**Explanation:** There are 6! = 720 arrangements. Connect two when a legal swap joins them. A shortest route for this start has five edges, checked by breadth-first search. The puzzle asks for a chosen route; choosing swaps at random is a separate experiment on the same graph.

**Extension:** With three physical cups, choose one of the three pairs uniformly at each turn. Record the first return after at least one swap. Repeating the experiment gives an average tending to six, not necessarily six each time.

**Mathematical connection:** For a uniformly chosen allowed edge on a fixed connected spot graph, the configuration walk has uniform stationary law. The mean positive return is n!, even though real swaps force period two. Mixing results require an aperiodic convention; Diaconis–Shahshahani allow a no-swap step with probability 1/n.

**Sources:** [Blum, Hopcroft and Kannan, Foundations of Data Science — Markov Chains](https://www.cs.cornell.edu/jeh/bookJan25_2016.pdf); [Diaconis and Shahshahani (1981), Generating a Random Permutation with Random Transpositions](https://www.imo.universite-paris-saclay.fr/~pierre-loic.meliot/symmetric/texts/Diaconis%2C%20Shahshahani%20-%20Generating%20a%20random%20permutation%20with%20random%20transpositions.pdf).

## Ten expanded puzzle families

Each puzzle collection is available from every grade trail, grouped by Easy, Medium, and Hard. See [the expansion specification](puzzle-expansion/README.md) for exact source lineage and mathematical checks. Difficulty labels are relative within each family and await family playtesting. All valid completions are accepted; witnesses are examples, not answer templates.

### Lantern Wires

#### 1. Two neighbors

ID: `toggle-01`

**Task:** On 4 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 2 bright.

**Readiness:** Match two states; count to two.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "cycle",
  "vertices": [
    "1",
    "2",
    "3",
    "4"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "1"
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2"
  ],
  "press_budget": null
}
```

**Hint:** Find the wire that touches both goal lanterns.

**Insight:** One edge is one simultaneous two-state change.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ]
  ],
  "minimum_presses": 1
}
```

**Adaptation:** Direct source target, reworded for an app.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex).

#### 2. Across the ring

ID: `toggle-02`

**Task:** On 4 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 3 bright.

**Readiness:** Match two states; count to two.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "cycle",
  "vertices": [
    "1",
    "2",
    "3",
    "4"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "1"
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3"
  ],
  "press_budget": null
}
```

**Hint:** Try a path from 1 to 3; watch what happens to the lamp in the middle.

**Insight:** Two flips at the intermediate vertex cancel.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Direct source target, reworded for an app.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex).

#### 3. Repair the picture

ID: `toggle-03`

**Task:** On 5 lanterns in a ring, numbered clockwise: Only 1, 2 start bright. Make only 2, 3, 4, 5 bright. Use at most 2 wire presses.

**Readiness:** Match two states; plan a replay of at most 2 moves.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "cycle",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "1"
    ]
  ],
  "initial_on": [
    "1",
    "2"
  ],
  "target_on": [
    "2",
    "3",
    "4",
    "5"
  ],
  "press_budget": 2
}
```

**Hint:** Which lamps differ between the starting picture and the goal?

**Insight:** The relevant target is the symmetric difference of start and goal; already-correct lamps need no net change.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "3",
      "4"
    ],
    [
      "5",
      "1"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** New initial/target pair built from the source binary-incidence model.

**Sources:** [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 4. Take the other way

ID: `toggle-04`

**Task:** On 7 lanterns in a ring, numbered clockwise: All lanterns start dark. Make only 1, 3, 5, 7 bright. Use at most 3 wire presses.

**Readiness:** Match two states; plan a replay of at most 3 moves.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "cycle",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "1"
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3",
    "5",
    "7"
  ],
  "press_budget": 3
}
```

**Hint:** The wire from 7 back to 1 is as real as every other wire.

**Insight:** The two reduced solutions on a cycle are complements. Pairing 1 with 3 and 5 with 7 takes four presses; pairing 7 with 1 and 3 with 5 takes three.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "7",
      "1"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** New ring target and mandatory budget; source supplies the complementary-cycle method.

**Sources:** [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex).

#### 5. Branches can cancel

ID: `toggle-05`

**Task:** On a family tree: R above A/B, A above C/D, B above E/F: All lanterns start dark. Make only R, C, D, E bright. Use at most 4 wire presses.

**Readiness:** Match two states; plan a replay of at most 4 moves.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "complete_binary_tree_depth_2",
  "vertices": [
    "R",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "R",
      "A"
    ],
    [
      "R",
      "B"
    ],
    [
      "A",
      "C"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "B",
      "F"
    ]
  ],
  "initial_on": [],
  "target_on": [
    "R",
    "C",
    "D",
    "E"
  ],
  "press_budget": 4
}
```

**Hint:** Start at a bottom lantern: it has only one wire that could change it.

**Insight:** Leaf requirements force moves upward. The two C/D paths cancel at A; the R–A wire is not needed.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "C"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "R",
      "B"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** New complete-binary-tree instance applying the source tree rule.

**Sources:** [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex).

#### 6. A tempting pair

ID: `toggle-06`

**Task:** On two straight rows A–B–C–D and E–F–G–H, with four vertical wires: All lanterns start dark. Make only A, B, C, H bright. Use at most 3 wire presses.

**Readiness:** Match two states; plan a replay of at most 3 moves.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "rectangular_grid",
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H"
  ],
  "edges": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "C",
      "D"
    ],
    [
      "E",
      "F"
    ],
    [
      "F",
      "G"
    ],
    [
      "G",
      "H"
    ],
    [
      "A",
      "E"
    ],
    [
      "B",
      "F"
    ],
    [
      "C",
      "G"
    ],
    [
      "D",
      "H"
    ]
  ],
  "initial_on": [],
  "target_on": [
    "A",
    "B",
    "C",
    "H"
  ],
  "press_budget": 3,
  "rows": [
    [
      "A",
      "B",
      "C",
      "D"
    ],
    [
      "E",
      "F",
      "G",
      "H"
    ]
  ]
}
```

**Hint:** If you pair B with C first, how far apart are the two bright goals left over?

**Insight:** Pairing nearby targets greedily can be wrong: B–C leaves A/H four edges apart, totaling five. A–B leaves C/H two edges apart, totaling three. Full rectangular grids supply overlapping cycles naturally.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "B"
    ],
    [
      "C",
      "D"
    ],
    [
      "D",
      "H"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** New 2×4 grid target; no edges removed from the nearest-neighbor grid.

**Sources:** [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 7. Repair only the differences

ID: `toggle-07`

**Task:** Match the goal card in at most 3 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "cycle",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "initial_on": [
    "1",
    "2"
  ],
  "target_on": [
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "press_budget": 3
}
```

**Hint:** Lantern 2 is already right. Compare which lamps differ before choosing wires.

**Insight:** Solve the symmetric difference between the two pictures; a lamp already lit may need to stay lit.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 8. Work from the leaves

ID: `toggle-08`

**Task:** Match the goal card in at most 6 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "complete_binary_tree_depth_2",
  "vertices": [
    "R",
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "initial_on": [
    "C",
    "D",
    "E",
    "F"
  ],
  "target_on": [
    "A",
    "B"
  ],
  "edges": [
    [
      "R",
      "A"
    ],
    [
      "R",
      "B"
    ],
    [
      "A",
      "C"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "B",
      "F"
    ]
  ],
  "press_budget": 6
}
```

**Hint:** Every leaf has just one wire. Decide those four wires before the two root wires.

**Insight:** Leaf requirements force wire choices. Their combined parity then decides the parent edges.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "R",
      "A"
    ],
    [
      "R",
      "B"
    ],
    [
      "A",
      "C"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "B",
      "F"
    ]
  ],
  "minimum_presses": 6
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 9. Pair across the square

ID: `toggle-09`

**Task:** Match the goal card in at most 4 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "rectangular_grid",
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I"
  ],
  "initial_on": [],
  "target_on": [
    "A",
    "C",
    "G",
    "I"
  ],
  "rows": [
    [
      "A",
      "B",
      "C"
    ],
    [
      "D",
      "E",
      "F"
    ],
    [
      "G",
      "H",
      "I"
    ]
  ],
  "edges": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "D",
      "E"
    ],
    [
      "E",
      "F"
    ],
    [
      "G",
      "H"
    ],
    [
      "H",
      "I"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "C",
      "F"
    ],
    [
      "D",
      "G"
    ],
    [
      "E",
      "H"
    ],
    [
      "F",
      "I"
    ]
  ],
  "press_budget": 4
}
```

**Hint:** Connect the corner goals in pairs. Any middle lamps used along a path must change twice.

**Insight:** Different shortest pairings give valid answers; sending every path through the center wastes presses.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "G",
      "H"
    ],
    [
      "H",
      "I"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 10. Cancel through the center

ID: `toggle-10`

**Task:** Match the goal card in at most 4 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "rectangular_grid",
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I"
  ],
  "initial_on": [
    "B",
    "D",
    "F",
    "H"
  ],
  "target_on": [
    "A",
    "I"
  ],
  "rows": [
    [
      "A",
      "B",
      "C"
    ],
    [
      "D",
      "E",
      "F"
    ],
    [
      "G",
      "H",
      "I"
    ]
  ],
  "edges": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "D",
      "E"
    ],
    [
      "E",
      "F"
    ],
    [
      "G",
      "H"
    ],
    [
      "H",
      "I"
    ],
    [
      "A",
      "D"
    ],
    [
      "B",
      "E"
    ],
    [
      "C",
      "F"
    ],
    [
      "D",
      "G"
    ],
    [
      "E",
      "H"
    ],
    [
      "F",
      "I"
    ]
  ],
  "press_budget": 4
}
```

**Hint:** Mark the six lamps that differ. Decide which can be paired without leaving a long final connection.

**Insight:** Both extinguishing and lighting count as odd endpoints. Overlapping routes cancel at intermediate lamps.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "B"
    ],
    [
      "D",
      "E"
    ],
    [
      "E",
      "F"
    ],
    [
      "H",
      "I"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 11. Plan all three pairs

ID: `toggle-11`

**Task:** Match the goal card in at most 4 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "rectangular_grid",
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L"
  ],
  "initial_on": [],
  "target_on": [
    "A",
    "B",
    "D",
    "I",
    "J",
    "L"
  ],
  "rows": [
    [
      "A",
      "B",
      "C",
      "D"
    ],
    [
      "E",
      "F",
      "G",
      "H"
    ],
    [
      "I",
      "J",
      "K",
      "L"
    ]
  ],
  "edges": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "C",
      "D"
    ],
    [
      "E",
      "F"
    ],
    [
      "F",
      "G"
    ],
    [
      "G",
      "H"
    ],
    [
      "I",
      "J"
    ],
    [
      "J",
      "K"
    ],
    [
      "K",
      "L"
    ],
    [
      "A",
      "E"
    ],
    [
      "B",
      "F"
    ],
    [
      "C",
      "G"
    ],
    [
      "D",
      "H"
    ],
    [
      "E",
      "I"
    ],
    [
      "F",
      "J"
    ],
    [
      "G",
      "K"
    ],
    [
      "H",
      "L"
    ]
  ],
  "press_budget": 4
}
```

**Hint:** Pairing two neighbors is safe only if the four remaining goals can still fit the budget.

**Insight:** Six required endpoints turn a local pairing choice into a comparison of complete plans.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "B"
    ],
    [
      "I",
      "J"
    ],
    [
      "D",
      "H"
    ],
    [
      "H",
      "L"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 12. Change the whole pattern

ID: `toggle-12`

**Task:** Match the goal card in at most 6 wire presses.

**Readiness:** Compare two lamp patterns; plan cancellations within a fixed budget.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "rectangular_grid",
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L"
  ],
  "initial_on": [
    "B",
    "C",
    "E",
    "H"
  ],
  "target_on": [
    "A",
    "F",
    "I",
    "K"
  ],
  "rows": [
    [
      "A",
      "B",
      "C",
      "D"
    ],
    [
      "E",
      "F",
      "G",
      "H"
    ],
    [
      "I",
      "J",
      "K",
      "L"
    ]
  ],
  "edges": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "C",
      "D"
    ],
    [
      "E",
      "F"
    ],
    [
      "F",
      "G"
    ],
    [
      "G",
      "H"
    ],
    [
      "I",
      "J"
    ],
    [
      "J",
      "K"
    ],
    [
      "K",
      "L"
    ],
    [
      "A",
      "E"
    ],
    [
      "B",
      "F"
    ],
    [
      "C",
      "G"
    ],
    [
      "D",
      "H"
    ],
    [
      "E",
      "I"
    ],
    [
      "F",
      "J"
    ],
    [
      "G",
      "K"
    ],
    [
      "H",
      "L"
    ]
  ],
  "press_budget": 6
}
```

**Hint:** Compare start and goal first, then look for disjoint short paths between the differing lamps.

**Insight:** Several paths must cooperate; a shortest solution depends on the difference pattern, not on the goal alone.

**Mathematics:** Binary graph incidence: solve Ax = initial XOR target over F₂. A path changes only its endpoints; cycles change nothing. Every reachable target on a tree has a unique reduced edge set, while cycles create alternative solutions. Minimizing presses is the minimum-cardinality T-join problem for the mismatch vertices. This is a direct small case of combinatorial optimization, not a claim to teach its general algorithm.

**Checked witness:**

```json
{
  "presses": [
    [
      "A",
      "B"
    ],
    [
      "B",
      "C"
    ],
    [
      "G",
      "H"
    ],
    [
      "B",
      "F"
    ],
    [
      "E",
      "I"
    ],
    [
      "G",
      "K"
    ]
  ],
  "minimum_presses": 6
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-02-k-1.tex — K–1 / 1, Tasks 1–2, “Two at a time”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-k-1.tex); [week-02-grades-2-3.tex — Grades 2–3 / 2, Task 4, “Make two far-apart lamps”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-2-3.tex); [week-02-grades-4-5.tex — Grades 4–5 / 2, Tasks 3–4, and / 3, Task 7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-grades-4-5.tex); [week-02-facilitator.tex — Facilitator / 3, “Undergraduate interpretation”; / 4, “Extra: why a tree has one solution” and “Research connection and its boundary”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-02/week-02-facilitator.tex); [week-02-redesign.md — “The mathematical destination”; “Sources and boundaries”; “Verification and future progression”](/Users/jamespfeiffer/math-circle/plans/week-02-redesign.md).

#### 13. Four lanterns

ID: `toggle-13`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      285,
      140
    ],
    [
      180,
      245
    ],
    [
      75,
      140
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2",
    "3",
    "4"
  ],
  "press_budget": null
}
```

**Hint:** Try lighting disjoint neighboring pairs.

**Insight:** Disjoint edges can change four lamps in two presses.

**Mathematics:** Disjoint edges can change four lamps in two presses. One shortest solution uses 2 presses: 1–2, 3–4. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "3",
      "4"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 1, target 3. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 14. Six-lamp ring

ID: `toggle-14`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "3"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 2 presses: 1–2, 2–3. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 2, target 1. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 15. Six-lamp ring

ID: `toggle-15`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "4"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 3 presses: 1–2, 2–3, 3–4. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** Week 2 compact catalog, Problem 2, target 2. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 16. Branching tree

ID: `toggle-16`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "6",
      "8"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      107.5,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      252.5,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      180,
      140
    ],
    [
      107.5,
      212.5
    ],
    [
      252.5,
      212.5
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "5"
  ],
  "press_budget": null
}
```

**Hint:** Trace from the starting light toward the goal. At a fork, choose the branch that contains the goal.

**Insight:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints.

**Mathematics:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints. One shortest solution uses 4 presses: 1–2, 2–3, 3–4, 4–5. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 4, target 1. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 17. Branching tree

ID: `toggle-17`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "6",
      "8"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      107.5,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      252.5,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      180,
      140
    ],
    [
      107.5,
      212.5
    ],
    [
      252.5,
      212.5
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "7"
  ],
  "press_budget": null
}
```

**Hint:** Trace from the starting light toward the goal. At a fork, choose the branch that contains the goal.

**Insight:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints.

**Mathematics:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints. One shortest solution uses 4 presses: 1–2, 2–3, 3–6, 6–7. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "7"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 4, target 2. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 18. Branching tree

ID: `toggle-18`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "6",
      "8"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      107.5,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      252.5,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      180,
      140
    ],
    [
      107.5,
      212.5
    ],
    [
      252.5,
      212.5
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "8"
  ],
  "press_budget": null
}
```

**Hint:** Trace from the starting light toward the goal. At a fork, choose the branch that contains the goal.

**Insight:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints.

**Mathematics:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints. One shortest solution uses 4 presses: 1–2, 2–3, 3–6, 6–8. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "8"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 4, target 3. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 19. Branching tree

ID: `toggle-19`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "6",
      "8"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      107.5,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      252.5,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      180,
      140
    ],
    [
      107.5,
      212.5
    ],
    [
      252.5,
      212.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "8"
  ],
  "press_budget": null
}
```

**Hint:** Trace from the starting light toward the goal. At a fork, choose the branch that contains the goal.

**Insight:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints.

**Mathematics:** A tree has a unique path between two lamps. Pressing that path changes only its endpoints. One shortest solution uses 4 presses: 1–2, 2–3, 3–6, 6–8. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "8"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 5, target 1. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 20. Six-lamp ring

ID: `toggle-20`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 1 presses: 1–2. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ]
  ],
  "minimum_presses": 1
}
```

**Adaptation:** Week 2 compact catalog, Problem 6, target 1. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 21. Six-lamp ring

ID: `toggle-21`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "4"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 3 presses: 1–2, 2–3, 3–4. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** Week 2 compact catalog, Problem 6, target 2. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 22. Six-lamp ring

ID: `toggle-22`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2",
    "4",
    "5"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 2 presses: 1–2, 4–5. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "4",
      "5"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 6, target 3. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 23. Six-lamp ring

ID: `toggle-23`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "press_budget": null
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 3 presses: 1–2, 3–4, 5–6. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "3",
      "4"
    ],
    [
      "5",
      "6"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** Week 2 compact catalog, Problem 6, target 4. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 24. Nine-lamp grid

ID: `toggle-24`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "9"
    ],
    [
      "1",
      "4"
    ],
    [
      "4",
      "7"
    ],
    [
      "2",
      "5"
    ],
    [
      "5",
      "8"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "9"
    ]
  ],
  "positions": [
    [
      75,
      35
    ],
    [
      180,
      35
    ],
    [
      285,
      35
    ],
    [
      75,
      140
    ],
    [
      180,
      140
    ],
    [
      285,
      140
    ],
    [
      75,
      245
    ],
    [
      180,
      245
    ],
    [
      285,
      245
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "5"
  ],
  "press_budget": null
}
```

**Hint:** Pair up lamps that need to change, then try paths between each pair.

**Insight:** Different pairings can yield different edge sets. Repeated edges cancel in pairs.

**Mathematics:** Different pairings can yield different edge sets. Repeated edges cancel in pairs. One shortest solution uses 2 presses: 1–2, 2–5. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "5"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 7, target 1. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 25. Nine-lamp grid

ID: `toggle-25`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "9"
    ],
    [
      "1",
      "4"
    ],
    [
      "4",
      "7"
    ],
    [
      "2",
      "5"
    ],
    [
      "5",
      "8"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "9"
    ]
  ],
  "positions": [
    [
      75,
      35
    ],
    [
      180,
      35
    ],
    [
      285,
      35
    ],
    [
      75,
      140
    ],
    [
      180,
      140
    ],
    [
      285,
      140
    ],
    [
      75,
      245
    ],
    [
      180,
      245
    ],
    [
      285,
      245
    ]
  ],
  "initial_on": [],
  "target_on": [
    "2",
    "8"
  ],
  "press_budget": null
}
```

**Hint:** Pair up lamps that need to change, then try paths between each pair.

**Insight:** Different pairings can yield different edge sets. Repeated edges cancel in pairs.

**Mathematics:** Different pairings can yield different edge sets. Repeated edges cancel in pairs. One shortest solution uses 2 presses: 2–5, 5–8. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "2",
      "5"
    ],
    [
      "5",
      "8"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 7, target 2. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 26. Nine-lamp grid

ID: `toggle-26`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "9"
    ],
    [
      "1",
      "4"
    ],
    [
      "4",
      "7"
    ],
    [
      "2",
      "5"
    ],
    [
      "5",
      "8"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "9"
    ]
  ],
  "positions": [
    [
      75,
      35
    ],
    [
      180,
      35
    ],
    [
      285,
      35
    ],
    [
      75,
      140
    ],
    [
      180,
      140
    ],
    [
      285,
      140
    ],
    [
      75,
      245
    ],
    [
      180,
      245
    ],
    [
      285,
      245
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3",
    "7",
    "9"
  ],
  "press_budget": null
}
```

**Hint:** Pair up lamps that need to change, then try paths between each pair.

**Insight:** Different pairings can yield different edge sets. Repeated edges cancel in pairs.

**Mathematics:** Different pairings can yield different edge sets. Repeated edges cancel in pairs. One shortest solution uses 4 presses: 1–2, 2–3, 7–8, 8–9. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "9"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 7, target 3. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 27. Nine-lamp grid

ID: `toggle-27`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "9"
    ],
    [
      "1",
      "4"
    ],
    [
      "4",
      "7"
    ],
    [
      "2",
      "5"
    ],
    [
      "5",
      "8"
    ],
    [
      "3",
      "6"
    ],
    [
      "6",
      "9"
    ]
  ],
  "positions": [
    [
      75,
      35
    ],
    [
      180,
      35
    ],
    [
      285,
      35
    ],
    [
      75,
      140
    ],
    [
      180,
      140
    ],
    [
      285,
      140
    ],
    [
      75,
      245
    ],
    [
      180,
      245
    ],
    [
      285,
      245
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3",
    "4",
    "6",
    "7",
    "9"
  ],
  "press_budget": null
}
```

**Hint:** Pair up lamps that need to change, then try paths between each pair.

**Insight:** Different pairings can yield different edge sets. Repeated edges cancel in pairs.

**Mathematics:** Different pairings can yield different edge sets. Repeated edges cancel in pairs. One shortest solution uses 4 presses: 1–2, 2–3, 4–7, 6–9. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "7"
    ],
    [
      "6",
      "9"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 compact catalog, Problem 7, target 4. Exact start, target, and graph from the compact catalog; no one-light constraint (matching that catalog).

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 28. Island bridge

ID: `toggle-28`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "1"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "5"
    ],
    [
      "2",
      "5"
    ]
  ],
  "positions": [
    [
      35,
      103.75
    ],
    [
      107.5,
      103.75
    ],
    [
      107.5,
      176.25
    ],
    [
      35,
      176.25
    ],
    [
      252.5,
      103.75
    ],
    [
      325,
      103.75
    ],
    [
      325,
      176.25
    ],
    [
      252.5,
      176.25
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "5"
  ],
  "press_budget": null
}
```

**Hint:** Find the wire that joins the two islands.

**Insight:** Adding a bridge joins the components and lets a path transfer the light between them.

**Mathematics:** Adding a bridge joins the components and lets a path transfer the light between them. One shortest solution uses 2 presses: 1–2, 2–5. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "5"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 compact catalog, Problem 9, target 1. The worksheet asks the child to draw a bridge. This fixed app instance uses bridge 2–5 from the checked shared data, then asks for the pictured target.

**Sources:** [Week 2 / Lamp lab / Compact puzzle catalog (F02-S-CAT-v2)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog.pdf).

#### 29. Five-lamp ring

ID: `toggle-29`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      290.404,
      115.213
    ],
    [
      248.233,
      245
    ],
    [
      111.767,
      245
    ],
    [
      69.596,
      115.213
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "3"
  ],
  "press_budget": null
}
```

**Hint:** Compare the two ways around the ring.

**Insight:** The two reduced edge sets on a ring are complements; the shorter one minimizes presses.

**Mathematics:** The two reduced edge sets on a ring are complements; the shorter one minimizes presses. One shortest solution uses 2 presses: 1–2, 2–3. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 1, case B. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 30. Bent path

ID: `toggle-30`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      325,
      212.5
    ],
    [
      180,
      212.5
    ],
    [
      35,
      212.5
    ]
  ],
  "initial_on": [
    "1",
    "2"
  ],
  "target_on": [
    "5",
    "6"
  ],
  "press_budget": null
}
```

**Hint:** Which end lamps need to change? Each has only one wire.

**Insight:** Removing a tree edge separates the board: that edge is forced exactly when one side has an odd number of changed lamps.

**Mathematics:** Removing a tree edge separates the board: that edge is forced exactly when one side has an odd number of changed lamps. One shortest solution uses 2 presses: 1–2, 5–6. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "5",
      "6"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 1, case F. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 31. Separate islands

ID: `toggle-31`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "1"
    ],
    [
      "4",
      "5"
    ]
  ],
  "positions": [
    [
      35,
      182.647
    ],
    [
      86.176,
      97.353
    ],
    [
      137.353,
      182.647
    ],
    [
      222.647,
      182.647
    ],
    [
      325,
      182.647
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "3"
  ],
  "press_budget": null
}
```

**Hint:** Which island contains both the starting light and the goal?

**Insight:** Each component preserves its own parity. Lamps in another component need not be touched.

**Mathematics:** Each component preserves its own parity. Lamps in another component need not be touched. One shortest solution uses 1 presses: 3–1. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "3",
      "1"
    ]
  ],
  "minimum_presses": 1
}
```

**Adaptation:** Week 2 upper catalog, Problem 2, case A. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 32. Joined islands

ID: `toggle-32`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "1"
    ],
    [
      "4",
      "5"
    ],
    [
      "3",
      "4"
    ]
  ],
  "positions": [
    [
      35,
      182.647
    ],
    [
      86.176,
      97.353
    ],
    [
      137.353,
      182.647
    ],
    [
      222.647,
      182.647
    ],
    [
      325,
      182.647
    ]
  ],
  "initial_on": [
    "1"
  ],
  "target_on": [
    "4"
  ],
  "press_budget": null
}
```

**Hint:** Find the path from the starting light across the bridge.

**Insight:** The bridge joins the two components. A path changes just its endpoints.

**Mathematics:** The bridge joins the two components. A path changes just its endpoints. One shortest solution uses 2 presses: 3–1, 3–4. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "3",
      "1"
    ],
    [
      "3",
      "4"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 2, case C. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 33. Two square islands

ID: `toggle-33`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "1"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "5"
    ]
  ],
  "positions": [
    [
      35,
      91.667
    ],
    [
      131.667,
      91.667
    ],
    [
      131.667,
      188.333
    ],
    [
      35,
      188.333
    ],
    [
      228.333,
      91.667
    ],
    [
      325,
      91.667
    ],
    [
      325,
      188.333
    ],
    [
      228.333,
      188.333
    ]
  ],
  "initial_on": [
    "1",
    "5"
  ],
  "target_on": [
    "2",
    "8"
  ],
  "press_budget": null
}
```

**Hint:** Work on one island at a time.

**Insight:** Each connected component can be solved independently when its start and target have the same parity.

**Mathematics:** Each connected component can be solved independently when its start and target have the same parity. One shortest solution uses 2 presses: 1–2, 8–5. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "8",
      "5"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 2, case D. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 34. Two branching islands

ID: `toggle-34`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "4",
      "6"
    ],
    [
      "4",
      "7"
    ]
  ],
  "positions": [
    [
      35,
      97.353
    ],
    [
      94.706,
      182.647
    ],
    [
      154.412,
      97.353
    ],
    [
      248.235,
      140
    ],
    [
      248.235,
      63.235
    ],
    [
      325,
      140
    ],
    [
      248.235,
      216.765
    ]
  ],
  "initial_on": [
    "1",
    "4"
  ],
  "target_on": [
    "2",
    "6"
  ],
  "press_budget": null
}
```

**Hint:** Find the lamps that must change on each separate tree.

**Insight:** A reachable target has a unique reduced edge set on each tree, even when each tree starts with an odd number of lights.

**Mathematics:** A reachable target has a unique reduced edge set on each tree, even when each tree starts with an odd number of lights. One shortest solution uses 2 presses: 1–2, 4–6. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "4",
      "6"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 2, case F. Exact reachable worksheet case, adapted to an individual target solve.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 35. Seven-lamp ring

ID: `toggle-35`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      266.369,
      76.593
    ],
    [
      287.7,
      170.052
    ],
    [
      227.931,
      245
    ],
    [
      132.069,
      245
    ],
    [
      72.3,
      170.052
    ],
    [
      93.631,
      76.593
    ]
  ],
  "initial_on": [
    "1",
    "3"
  ],
  "target_on": [
    "2",
    "4"
  ],
  "press_budget": null
}
```

**Hint:** Look at which lamps differ from the goal, including bright lamps that need to go dark.

**Insight:** Pairing the changed lamps along the ring gives complementary reduced solutions.

**Mathematics:** Pairing the changed lamps along the ring gives complementary reduced solutions. One shortest solution uses 2 presses: 1–2, 3–4. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "3",
      "4"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 3, case D. Exact graph, start, and target; the worksheet asks for every solution set. The app accepts any solution; comparing all reduced sets remains in the grown-up notes.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 36. Eight-lamp ring

ID: `toggle-36`

**Task:** Make the goal picture in 2 presses.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths. Count a press budget up to six.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      254.246,
      65.754
    ],
    [
      285,
      140
    ],
    [
      254.246,
      214.246
    ],
    [
      180,
      245
    ],
    [
      105.754,
      214.246
    ],
    [
      75,
      140
    ],
    [
      105.754,
      65.754
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2",
    "5",
    "6"
  ],
  "press_budget": 2
}
```

**Hint:** Compare pairs that share a wire with lamps separated by dark neighbors.

**Insight:** The graph, not just the number of changed lamps, determines the shortest solution.

**Mathematics:** The graph, not just the number of changed lamps, determines the shortest solution. One shortest solution uses 2 presses: 1–2, 5–6. The app accepts every legal solution within the displayed budget. Four changed lamps need at least two presses, and two disjoint wires attain it.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "5",
      "6"
    ]
  ],
  "minimum_presses": 2
}
```

**Adaptation:** Week 2 upper catalog, Problem 4, case A. Exact shortest-solution worksheet case; the proven minimum is enforced as the press budget.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 37. Eight-lamp ring

ID: `toggle-37`

**Task:** Make the goal picture in 4 presses.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths. Count a press budget up to six.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ],
    [
      "7",
      "8"
    ],
    [
      "8",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      254.246,
      65.754
    ],
    [
      285,
      140
    ],
    [
      254.246,
      214.246
    ],
    [
      180,
      245
    ],
    [
      105.754,
      214.246
    ],
    [
      75,
      140
    ],
    [
      105.754,
      65.754
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3",
    "5",
    "7"
  ],
  "press_budget": 4
}
```

**Hint:** Compare pairs that share a wire with lamps separated by dark neighbors.

**Insight:** The graph, not just the number of changed lamps, determines the shortest solution.

**Mathematics:** The graph, not just the number of changed lamps, determines the shortest solution. One shortest solution uses 4 presses: 1–2, 2–3, 5–6, 6–7. The app accepts every legal solution within the displayed budget. The four target lamps have no wires between them. A press can change at most one of them, so at least four presses are needed.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "7"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 upper catalog, Problem 4, case B. Exact shortest-solution worksheet case; the proven minimum is enforced as the press budget.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 38. Six-lamp ring

ID: `toggle-38`

**Task:** Make the goal picture in 3 presses.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths. Count a press budget up to six.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ],
    [
      "6",
      "1"
    ]
  ],
  "positions": [
    [
      180,
      35
    ],
    [
      270.933,
      87.5
    ],
    [
      270.933,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.067,
      192.5
    ],
    [
      89.067,
      87.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "press_budget": 3
}
```

**Hint:** Follow a path between lamps that need to change. What happens to the lamps in between?

**Insight:** The interior of a pressed path changes twice, leaving only its endpoints changed.

**Mathematics:** The interior of a pressed path changes twice, leaving only its endpoints changed. One shortest solution uses 3 presses: 1–2, 3–4, 5–6. The app accepts every legal solution within the displayed budget. Six changed lamps need at least three presses; alternating wires attain it.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "3",
      "4"
    ],
    [
      "5",
      "6"
    ]
  ],
  "minimum_presses": 3
}
```

**Adaptation:** Week 2 upper catalog, Problem 4, case C. Exact shortest-solution worksheet case; the proven minimum is enforced as the press budget.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 39. Bent path

ID: `toggle-39`

**Task:** Make the goal picture in 5 presses.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths. Count a press budget up to six.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ]
  ],
  "positions": [
    [
      35,
      67.5
    ],
    [
      180,
      67.5
    ],
    [
      325,
      67.5
    ],
    [
      325,
      212.5
    ],
    [
      180,
      212.5
    ],
    [
      35,
      212.5
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "6"
  ],
  "press_budget": 5
}
```

**Hint:** Which end lamps need to change? Each has only one wire.

**Insight:** Removing a tree edge separates the board: that edge is forced exactly when one side has an odd number of changed lamps.

**Mathematics:** Removing a tree edge separates the board: that edge is forced exactly when one side has an odd number of changed lamps. One shortest solution uses 5 presses: 1–2, 2–3, 3–4, 4–5, 5–6. The app accepts every legal solution within the displayed budget. Removing any wire separates the two changed endpoints. Every wire must therefore be pressed an odd number of times, so five presses are necessary.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "3",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "5",
      "6"
    ]
  ],
  "minimum_presses": 5
}
```

**Adaptation:** Week 2 upper catalog, Problem 4, case D. Exact shortest-solution worksheet case; the proven minimum is enforced as the press budget.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 40. Four-spoke star

ID: `toggle-40`

**Task:** Make the goal picture in 4 presses.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths. Count a press budget up to six.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "1",
      "3"
    ],
    [
      "1",
      "4"
    ],
    [
      "1",
      "5"
    ]
  ],
  "positions": [
    [
      180,
      140
    ],
    [
      180,
      35
    ],
    [
      285,
      140
    ],
    [
      180,
      245
    ],
    [
      75,
      140
    ]
  ],
  "initial_on": [],
  "target_on": [
    "2",
    "3",
    "4",
    "5"
  ],
  "press_budget": 4
}
```

**Hint:** Each outer lantern has just one wire.

**Insight:** Every leaf that must change forces its spoke. Four spokes change the center four times, leaving it unchanged.

**Mathematics:** Every leaf that must change forces its spoke. Four spokes change the center four times, leaving it unchanged. One shortest solution uses 4 presses: 1–2, 1–3, 1–4, 1–5. The app accepts every legal solution within the displayed budget. Each of the four leaves must change and has only one wire. All four spokes are forced.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "1",
      "3"
    ],
    [
      "1",
      "4"
    ],
    [
      "1",
      "5"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 upper catalog, Problem 4, case E. Exact shortest-solution worksheet case; the proven minimum is enforced as the press budget.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 41. Two branch points

ID: `toggle-41`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "2",
      "4"
    ],
    [
      "4",
      "5"
    ],
    [
      "4",
      "6"
    ]
  ],
  "positions": [
    [
      35,
      140
    ],
    [
      131.667,
      140
    ],
    [
      131.667,
      43.333
    ],
    [
      228.333,
      140
    ],
    [
      228.333,
      236.667
    ],
    [
      325,
      140
    ]
  ],
  "initial_on": [],
  "target_on": [
    "1",
    "3",
    "5",
    "6"
  ],
  "press_budget": null
}
```

**Hint:** Start by looking at the leaves that must change.

**Insight:** Leaf constraints force a unique reduced edge set; the middle wire may not be needed.

**Mathematics:** Leaf constraints force a unique reduced edge set; the middle wire may not be needed. One shortest solution uses 4 presses: 1–2, 2–3, 4–5, 4–6. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "2",
      "3"
    ],
    [
      "4",
      "5"
    ],
    [
      "4",
      "6"
    ]
  ],
  "minimum_presses": 4
}
```

**Adaptation:** Week 2 upper catalog, Problem 6, case A. Exact graph, start, and target; the worksheet asks for every solution set. The app accepts any solution; comparing all reduced sets remains in the grown-up notes.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

#### 42. Six-spoke star

ID: `toggle-42`

**Task:** Make the picture on the goal card.

**Readiness:** Compare bright and dark lamps, follow a pair flip, and track paths.

**Rules:**

- A board is a graph: lanterns are vertices and every drawn wire is a legal move.
- Pressing a wire flips both endpoint states. It never moves a lantern.
- The goal is the entire displayed ON/OFF pattern, including lamps required to stay OFF.
- When a press budget is displayed, it is part of completion. Undo restores a press; every successful replay within the budget is accepted.
- Every successful replay within the budget is accepted; the supplied replay is only a witness.

**Starting data:**

```json
{
  "topology": "worksheet_graph",
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7"
  ],
  "edges": [
    [
      "1",
      "2"
    ],
    [
      "1",
      "3"
    ],
    [
      "1",
      "4"
    ],
    [
      "1",
      "5"
    ],
    [
      "1",
      "6"
    ],
    [
      "1",
      "7"
    ]
  ],
  "positions": [
    [
      180,
      140
    ],
    [
      180,
      35
    ],
    [
      270.93,
      87.5
    ],
    [
      270.93,
      192.5
    ],
    [
      180,
      245
    ],
    [
      89.07,
      192.5
    ],
    [
      89.07,
      87.5
    ]
  ],
  "initial_on": [
    "2",
    "4"
  ],
  "target_on": [
    "3",
    "5",
    "6",
    "7"
  ],
  "press_budget": null
}
```

**Hint:** Compare each outer lamp with its goal.

**Insight:** Every leaf differs from the target, so all six spokes are forced. The center changes six times and stays dark.

**Mathematics:** Every leaf differs from the target, so all six spokes are forced. The center changes six times and stays dark. One shortest solution uses 6 presses: 1–2, 1–3, 1–4, 1–5, 1–6, 1–7. The app accepts every legal solution.

**Checked witness:**

```json
{
  "presses": [
    [
      "1",
      "2"
    ],
    [
      "1",
      "3"
    ],
    [
      "1",
      "4"
    ],
    [
      "1",
      "5"
    ],
    [
      "1",
      "6"
    ],
    [
      "1",
      "7"
    ]
  ],
  "minimum_presses": 6
}
```

**Adaptation:** Week 2 upper catalog, Problem 6, case B. Exact graph, start, and target; the worksheet asks for every solution set. The app accepts any solution; comparing all reduced sets remains in the grown-up notes.

**Sources:** [Week 2 / Lamp lab / Upper puzzle catalog (F02-S-CAT-UP-v1)](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/week-02/week-02-shared-catalog-upper.pdf).

### Clockwork Gates

#### 1. Three spaces to the star

ID: `clock-01`

**Task:** 4 places, jump 1, start 0, star at 3. Choose the first positive number of bells that lands the marker on the star.

**Readiness:** Count/track landings to 4.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 4,
      "jump": 1,
      "start": 0,
      "target": 3
    }
  ]
}
```

**Hint:** Count the spaces moved; the starting place is not the first jump.

**Insight:** A cyclic shift is uniform and wraps at the end of the ring.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 3,
  "joint_route": [
    [
      0
    ],
    [
      1
    ],
    [
      2
    ],
    [
      3
    ]
  ],
  "joint_period": 4
}
```

**Adaptation:** New star target using the source four-ring.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex).

#### 2. Skip without stopping

ID: `clock-02`

**Task:** 6 places, jump 2, start 0, star at 4. Choose the first positive number of bells that lands the marker on the star.

**Readiness:** Count/track landings to 6.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 6,
      "jump": 2,
      "start": 0,
      "target": 4
    }
  ]
}
```

**Hint:** Only where the marker lands counts.

**Insight:** A +2 orbit stays on alternate positions, but it can still reach the target in its own orbit.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 2,
  "joint_route": [
    [
      0
    ],
    [
      2
    ],
    [
      4
    ]
  ],
  "joint_period": 3
}
```

**Adaptation:** New target on the six-position extension.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex).

#### 3. Past zero

ID: `clock-03`

**Task:** 10 places, jump 3, start 8, star at 0. Choose the first positive number of bells that lands the marker on the star.

**Readiness:** Count/track landings to 10.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 10,
      "jump": 3,
      "start": 8,
      "target": 0
    }
  ]
}
```

**Hint:** Your first landing wraps around from 8. Where is it?

**Insight:** A target can require several wraps or an indirect-looking route; the state is a residue, not an ordinary increasing number.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 4,
  "joint_route": [
    [
      8
    ],
    [
      1
    ],
    [
      4
    ],
    [
      7
    ],
    [
      0
    ]
  ],
  "joint_period": 10
}
```

**Adaptation:** New start/target pair using the source +3 ten-ring.

**Sources:** [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex).

#### 4. Build a four-beat loop

ID: `clock-04`

**Task:** On a 12-place clock starting at 0, choose a jump from 1 through 11. Keep that SAME jump. Make the marker return to 0 for the first time after exactly four bells.

**Readiness:** Track up to four landings on a twelve-place ring; compare first return with later returns.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_jump",
  "positions": 12,
  "start": 0,
  "jump_min": 1,
  "jump_max": 11,
  "required_first_return": 4
}
```

**Hint:** Four jumps must make whole laps, but no earlier number of jumps may do so.

**Insight:** Jump size and period differ. +3 and +9 generate the same four-position subgroup in opposite orders; +6 returns too soon.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "jump": 3,
  "orbit": [
    0,
    3,
    6,
    9,
    0
  ],
  "all_valid_jumps": [
    3,
    9
  ]
}
```

**Adaptation:** New inverse-design prompt using the source exact period table.

**Sources:** [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex).

#### 5. Two clocks, one bell

ID: `clock-05`

**Task:** 6 places, jump 1, start 0, star at 2; 8 places, jump 1, start 0, star at 4. Each bell moves both clocks. Choose the first positive number of bells that lands both markers on their stars together.

**Readiness:** Count/track landings to 20.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 6,
      "jump": 1,
      "start": 0,
      "target": 2
    },
    {
      "positions": 8,
      "jump": 1,
      "start": 0,
      "target": 4
    }
  ]
}
```

**Hint:** List the bell counts when the six-place clock is on its star; then check those on the other clock.

**Insight:** Simultaneous congruences: t≡2 mod 6 and t≡4 mod 8. Matching one clock is insufficient; the first common match is 20, within a joint period of 24.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 20,
  "joint_route": [
    [
      0,
      0
    ],
    [
      1,
      1
    ],
    [
      2,
      2
    ],
    [
      3,
      3
    ],
    [
      4,
      4
    ],
    [
      5,
      5
    ],
    [
      0,
      6
    ],
    [
      1,
      7
    ],
    [
      2,
      0
    ],
    [
      3,
      1
    ],
    [
      4,
      2
    ],
    [
      5,
      3
    ],
    [
      0,
      4
    ],
    [
      1,
      5
    ],
    [
      2,
      6
    ],
    [
      3,
      7
    ],
    [
      4,
      0
    ],
    [
      5,
      1
    ],
    [
      0,
      2
    ],
    [
      1,
      3
    ],
    [
      2,
      4
    ]
  ],
  "joint_period": 24
}
```

**Adaptation:** New linked-clock adaptation. The source covers single rings and commuting rotations, not this simultaneous-target instance.

**Sources:** [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 6. Different gears

ID: `clock-06`

**Task:** 8 places, jump 3, start 1, star at 4; 6 places, jump 2, start 0, star at 4. Each bell moves both clocks. Choose the first positive number of bells that lands both markers on their stars together.

**Readiness:** Count/track landings to 17.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 8,
      "jump": 3,
      "start": 1,
      "target": 4
    },
    {
      "positions": 6,
      "jump": 2,
      "start": 0,
      "target": 4
    }
  ]
}
```

**Hint:** The eight-place clock hits its star after 1 bell, then after 9. When is its next chance?

**Insight:** The first clock requires t≡1 mod 8. The second has a three-step orbit and requires t≡2 mod 3. Their first shared match is 17.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 17,
  "joint_route": [
    [
      1,
      0
    ],
    [
      4,
      2
    ],
    [
      7,
      4
    ],
    [
      2,
      0
    ],
    [
      5,
      2
    ],
    [
      0,
      4
    ],
    [
      3,
      0
    ],
    [
      6,
      2
    ],
    [
      1,
      4
    ],
    [
      4,
      0
    ],
    [
      7,
      2
    ],
    [
      2,
      4
    ],
    [
      5,
      0
    ],
    [
      0,
      2
    ],
    [
      3,
      4
    ],
    [
      6,
      0
    ],
    [
      1,
      2
    ],
    [
      4,
      4
    ]
  ],
  "joint_period": 24
}
```

**Adaptation:** New product-of-cycles instance, authored from the source translation model.

**Sources:** [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 7. A five-landing orbit

ID: `clock-07`

**Task:** Choose a fixed jump whose first return takes 5 bells.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_jump",
  "positions": 10,
  "start": 0,
  "jump_min": 1,
  "jump_max": 9,
  "required_first_return": 5
}
```

**Hint:** Five landings on ten places means visiting half the ring. More than one jump can work.

**Insight:** Different generators can have the same order. A return after five bells must be the first return.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "jump": 2,
  "all_valid_jumps": [
    2,
    4,
    6,
    8
  ],
  "orbit": [
    0,
    2,
    4,
    6,
    8,
    0
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 8. The star just behind

ID: `clock-08`

**Task:** Find the first positive bell count that lands every marker on its star.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 12,
      "jump": 5,
      "start": 9,
      "target": 4
    }
  ]
}
```

**Hint:** Find a jump that undoes +5 on this ring. How does that help reach a star five places behind?

**Insight:** A nearby star can occur late in the orbit; spatial distance and number of activations differ.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 11,
  "joint_route": [
    [
      9
    ],
    [
      2
    ],
    [
      7
    ],
    [
      0
    ],
    [
      5
    ],
    [
      10
    ],
    [
      3
    ],
    [
      8
    ],
    [
      1
    ],
    [
      6
    ],
    [
      11
    ],
    [
      4
    ]
  ],
  "joint_period": 12
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 9. Reduced gears

ID: `clock-09`

**Task:** Find the first positive bell count that lands every marker on its star.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 12,
      "jump": 4,
      "start": 1,
      "target": 9
    },
    {
      "positions": 8,
      "jump": 2,
      "start": 1,
      "target": 3
    }
  ]
}
```

**Hint:** List the bells that reach each star, using periods three and four.

**Insight:** Shared factors shorten the orbits. Synchronize orbit periods rather than the printed ring sizes.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 5,
  "joint_route": [
    [
      1,
      1
    ],
    [
      5,
      3
    ],
    [
      9,
      5
    ],
    [
      1,
      7
    ],
    [
      5,
      1
    ],
    [
      9,
      3
    ]
  ],
  "joint_period": 12
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 10. Meet after different laps

ID: `clock-10`

**Task:** Find the first positive bell count that lands every marker on its star.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 10,
      "jump": 4,
      "start": 2,
      "target": 0
    },
    {
      "positions": 12,
      "jump": 3,
      "start": 1,
      "target": 10
    }
  ]
}
```

**Hint:** One star is reached on bells 2, 7, 12; compare that list with the other clock.

**Insight:** Neither marker starts on its star. Two phase conditions must hold at the same positive time.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 7,
  "joint_route": [
    [
      2,
      1
    ],
    [
      6,
      4
    ],
    [
      0,
      7
    ],
    [
      4,
      10
    ],
    [
      8,
      1
    ],
    [
      2,
      4
    ],
    [
      6,
      7
    ],
    [
      0,
      10
    ]
  ],
  "joint_period": 20
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 11. Three clocks together

ID: `clock-11`

**Task:** Find the first positive bell count that lands every marker on its star.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 6,
      "jump": 2,
      "start": 1,
      "target": 3
    },
    {
      "positions": 8,
      "jump": 2,
      "start": 0,
      "target": 4
    },
    {
      "positions": 5,
      "jump": 1,
      "start": 4,
      "target": 1
    }
  ]
}
```

**Hint:** Match the first two clocks, then test those meeting bells on the third.

**Insight:** A pairwise meeting need not solve three clocks. Filter one repeating set of meetings by the third orbit.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 22,
  "joint_route": [
    [
      1,
      0,
      4
    ],
    [
      3,
      2,
      0
    ],
    [
      5,
      4,
      1
    ],
    [
      1,
      6,
      2
    ],
    [
      3,
      0,
      3
    ],
    [
      5,
      2,
      4
    ],
    [
      1,
      4,
      0
    ],
    [
      3,
      6,
      1
    ],
    [
      5,
      0,
      2
    ],
    [
      1,
      2,
      3
    ],
    [
      3,
      4,
      4
    ],
    [
      5,
      6,
      0
    ],
    [
      1,
      0,
      1
    ],
    [
      3,
      2,
      2
    ],
    [
      5,
      4,
      3
    ],
    [
      1,
      6,
      4
    ],
    [
      3,
      0,
      0
    ],
    [
      5,
      2,
      1
    ],
    [
      1,
      4,
      2
    ],
    [
      3,
      6,
      3
    ],
    [
      5,
      0,
      4
    ],
    [
      1,
      2,
      0
    ],
    [
      3,
      4,
      1
    ]
  ],
  "joint_period": 60
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

#### 12. Three different gears

ID: `clock-12`

**Task:** Find the first positive bell count that lands every marker on its star.

**Readiness:** Track repeating landings and their starting phases.

**Rules:**

- Positions are labeled 0 through n−1 clockwise; jumping k adds k and wraps around.
- A jump counts landing positions, not positions passed over.
- In count mode, choose a positive activation count before running the animation. The accepted answer is the first positive count at which every target is met together.
- In gear mode, choose one fixed jump for the entire run; success is the specified first positive return time.
- Reset and revised predictions are unlimited. No timing skill, written argument, or hidden feedback is needed.

**Starting data:**

```json
{
  "mode": "choose_first_activation_count",
  "clocks": [
    {
      "positions": 12,
      "jump": 8,
      "start": 1,
      "target": 9
    },
    {
      "positions": 10,
      "jump": 6,
      "start": 3,
      "target": 7
    },
    {
      "positions": 8,
      "jump": 6,
      "start": 1,
      "target": 3
    }
  ]
}
```

**Hint:** The three orbit lengths are 3, 5, and 4. Each star has a different phase within its orbit.

**Insight:** Three non-unit jumps require reducing each orbit and coordinating its phase; ring-size LCM alone gives the wrong first hit.

**Mathematics:** Translation in a finite cyclic group: x ↦ x+k mod n. One orbit has period n/gcd(n,k), but every shift is reversible whether or not that orbit visits the whole ring. The final linked-clock instances are an authored extension to simultaneous congruences in a product of cyclic groups; the shared activation counter is one orbit in that product.

**Checked witness:**

```json
{
  "activations": 19,
  "joint_route": [
    [
      1,
      3,
      1
    ],
    [
      9,
      9,
      7
    ],
    [
      5,
      5,
      5
    ],
    [
      1,
      1,
      3
    ],
    [
      9,
      7,
      1
    ],
    [
      5,
      3,
      7
    ],
    [
      1,
      9,
      5
    ],
    [
      9,
      5,
      3
    ],
    [
      5,
      1,
      1
    ],
    [
      1,
      7,
      7
    ],
    [
      9,
      3,
      5
    ],
    [
      5,
      9,
      3
    ],
    [
      1,
      5,
      1
    ],
    [
      9,
      1,
      7
    ],
    [
      5,
      7,
      5
    ],
    [
      1,
      3,
      3
    ],
    [
      9,
      9,
      1
    ],
    [
      5,
      5,
      7
    ],
    [
      1,
      1,
      5
    ],
    [
      9,
      7,
      3
    ]
  ],
  "joint_period": 60
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-k-1.tex — K–1 / 1, Tasks 1–2; / 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-k-1.tex); [week-04-grades-2-3.tex — Grades 2–3 / 2, Tasks 3–5, “A code that skips places”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-2-3.tex); [week-04-grades-4-5.tex — Grades 4–5 / 2, Task 3; / 3, Tasks 5–7](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-grades-4-5.tex); [week-04-facilitator.tex — Facilitator / 2, “Upper: key and complete classification”; / 3, “Upper: inverse and composition”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-04/week-04-facilitator.tex); [week-04-redesign.md — “Mathematical destination”; “Checked results and proofs”; “Sources, research boundary, and history”](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md).

### Mirror Couriers

#### 1. Up the tall room

ID: `billiard-01`

**Task:** Room width 2, height 4. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Readiness:** Follow grid directions; count wall contacts.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "predict",
  "width": 2,
  "height": 4,
  "rise": 1,
  "run": 1
}
```

**Hint:** At the right wall, the light can still travel upward. Only its left/right direction changes.

**Insight:** A wall reverses one component of direction; it does not turn the light back along its incoming path.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "corner": "top-left",
  "bounces": 1,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "2",
      "2"
    ],
    [
      "0",
      "4"
    ]
  ]
}
```

**Adaptation:** Direct source rectangle with a concise prediction interface.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex).

#### 2. A crossing is not a wall

ID: `billiard-02`

**Task:** Room width 2, height 3. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Readiness:** Follow grid directions; count wall contacts.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "predict",
  "width": 2,
  "height": 3,
  "rise": 1,
  "run": 1
}
```

**Hint:** Imagine another copy of the room across the next wall, and keep going straight into it.

**Insight:** Unfolding turns several reflections into a straight path; old path crossings do not create collisions.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "corner": "bottom-right",
  "bounces": 3,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "2",
      "2"
    ],
    [
      "1",
      "3"
    ],
    [
      "0",
      "2"
    ],
    [
      "2",
      "0"
    ]
  ]
}
```

**Adaptation:** Direct source rectangle; no worksheet proof is required.

**Sources:** [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex).

#### 3. Both sides are even

ID: `billiard-03`

**Task:** Room width 6, height 10. Launch diagonally up-right (rise 1, run 1). Choose the first corner and the number of wall bounces before it.

**Readiness:** Follow grid directions; count wall contacts.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "predict",
  "width": 6,
  "height": 10,
  "rise": 1,
  "run": 1
}
```

**Hint:** A 6-by-10 room has the same shape as a 3-by-5 room. Shrink the picture before following it.

**Insight:** Raw side parity is misleading. Dividing out the common scale exposes a 3:5 shape, which reaches the top-right after six bounces.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "corner": "top-right",
  "bounces": 6,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "6",
      "6"
    ],
    [
      "2",
      "10"
    ],
    [
      "0",
      "8"
    ],
    [
      "6",
      "2"
    ],
    [
      "4",
      "0"
    ],
    [
      "0",
      "4"
    ],
    [
      "6",
      "10"
    ]
  ]
}
```

**Adaptation:** Direct source upper-table rectangle, adapted to a required corner/bounce prediction.

**Sources:** [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex).

#### 4. Build the delivery room

ID: `billiard-04`

**Task:** The room is 6 squares tall. Set its width from 1 through 12. Launch diagonally up-right. Make the first corner top-right, after exactly 2 bounces.

**Readiness:** Follow grid directions; coordinate a geometric control with a first-corner target.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_width",
  "height": 6,
  "width_min": 1,
  "width_max": 12,
  "rise": 1,
  "run": 1,
  "target_corner": "top-right",
  "target_bounces": 2
}
```

**Hint:** Two bounces mean three straight pieces. Try a room that stacks three copies of its width up its height.

**Insight:** Inverse design: the reduced shape must be 1:3 or 3:1. Height 6 and the full width interval leave width 2.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "width": 2,
  "all_valid_widths": [
    2
  ],
  "corner": "top-right",
  "bounces": 2,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "2",
      "2"
    ],
    [
      "0",
      "4"
    ],
    [
      "2",
      "6"
    ]
  ]
}
```

**Adaptation:** New bounded inverse-design instance; source explicitly proposes top-right after at least one bounce.

**Sources:** [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex).

#### 5. Aim across a square

ID: `billiard-05`

**Task:** Room width 1, height 1. Set the launch arrow's rise and run, each from 1 through 4. Make the first corner bottom-right, after exactly 3 bounces.

**Readiness:** Follow grid directions; coordinate a geometric control with a first-corner target.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_direction",
  "width": 1,
  "height": 1,
  "component_min": 1,
  "component_max": 4,
  "target_corner": "bottom-right",
  "target_bounces": 3
}
```

**Hint:** In mirrored square rooms, aim for a corner three room-widths right and two room-heights up.

**Insight:** In a square, coprime rise/run p/q reaches the first lattice corner (q,p). Odd run and even rise give bottom-right; p+q−2 counts the bounces. Both 2/3 and 4/1 are valid here.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "rise": 2,
  "run": 3,
  "all_valid_directions": [
    [
      2,
      3
    ],
    [
      4,
      1
    ]
  ],
  "corner": "bottom-right",
  "bounces": 3,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "1",
      "2/3"
    ],
    [
      "1/2",
      "1"
    ],
    [
      "0",
      "2/3"
    ],
    [
      "1",
      "0"
    ]
  ]
}
```

**Adaptation:** New inverse form of the source rational-slope example, with the full 1–4 control range. Both successful directions are accepted.

**Sources:** [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex).

#### 6. The room changes the aim

ID: `billiard-06`

**Task:** Room width 3, height 2. Set the launch arrow's rise and run, each from 1 through 10. Make the first corner top-right, after exactly 4 bounces.

**Readiness:** Follow grid directions; coordinate a geometric control with a first-corner target.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_direction",
  "width": 3,
  "height": 2,
  "component_min": 1,
  "component_max": 10,
  "target_corner": "top-right",
  "target_bounces": 4
}
```

**Hint:** Open five copies of the room upward. Their far top-right corner is 3 squares right and 10 squares up.

**Insight:** The physical slope differs from the unit-square slope. Rise/run 10/3 in a 3×2 room is five room-heights per room-width, reaching top-right after four horizontal-wall bounces.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "rise": 10,
  "run": 3,
  "all_valid_directions": [
    [
      10,
      3
    ]
  ],
  "corner": "top-right",
  "bounces": 4,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "3/5",
      "2"
    ],
    [
      "6/5",
      "0"
    ],
    [
      "9/5",
      "2"
    ],
    [
      "12/5",
      "0"
    ],
    [
      "3",
      "2"
    ]
  ]
}
```

**Adaptation:** New rectangular rational-direction inverse instance applying the source explicit normalized-slope warning.

**Sources:** [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex).

#### 7. A steeper launch

ID: `billiard-07`

**Task:** Predict the first corner and bounce count.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "predict",
  "width": 4,
  "height": 3,
  "rise": 2,
  "run": 1
}
```

**Hint:** In reflected rooms, the ray rises two units for every unit right. Find its first intersection of both wall grids.

**Insight:** Non-unit slope changes the first simultaneous wall crossing; reducing room width and height alone is insufficient.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "corner": "bottom-right",
  "bounces": 9,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "3/2",
      "3"
    ],
    [
      "3",
      "0"
    ],
    [
      "4",
      "2"
    ],
    [
      "7/2",
      "3"
    ],
    [
      "2",
      "0"
    ],
    [
      "1/2",
      "3"
    ],
    [
      "0",
      "2"
    ],
    [
      "1",
      "0"
    ],
    [
      "5/2",
      "3"
    ],
    [
      "4",
      "0"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

#### 8. Design the opposite side

ID: `billiard-08`

**Task:** Reach bottom-right first after exactly 3 bounces.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_width",
  "height": 6,
  "width_min": 1,
  "width_max": 12,
  "rise": 1,
  "run": 1,
  "target_corner": "bottom-right",
  "target_bounces": 3
}
```

**Hint:** Three bounces means five whole room crossings in all. Bottom-right needs an odd horizontal count and an even vertical count.

**Insight:** The corner and bounce count together determine reduced room proportions.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "width": 4,
  "all_valid_widths": [
    4
  ],
  "corner": "bottom-right",
  "bounces": 3,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "4",
      "4"
    ],
    [
      "2",
      "6"
    ],
    [
      "0",
      "4"
    ],
    [
      "4",
      "0"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

#### 9. Several correct arrows

ID: `billiard-09`

**Task:** Reach top-right first after exactly 6 bounces.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_direction",
  "width": 2,
  "height": 3,
  "component_min": 1,
  "component_max": 10,
  "target_corner": "top-right",
  "target_bounces": 6
}
```

**Hint:** Look for coprime odd room counts adding to eight, then convert rooms into actual units.

**Insight:** Different reduced slopes can satisfy the same corner and bounce target; every bounded valid direction is accepted.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "rise": 5,
  "run": 2,
  "all_valid_directions": [
    [
      5,
      2
    ],
    [
      9,
      10
    ],
    [
      10,
      4
    ]
  ],
  "corner": "top-right",
  "bounces": 6,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "6/5",
      "3"
    ],
    [
      "2",
      "1"
    ],
    [
      "8/5",
      "0"
    ],
    [
      "2/5",
      "3"
    ],
    [
      "0",
      "2"
    ],
    [
      "4/5",
      "0"
    ],
    [
      "2",
      "3"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

#### 10. Change the room, keep the arrow

ID: `billiard-10`

**Task:** Reach top-left first after exactly 5 bounces.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_width",
  "height": 8,
  "width_min": 1,
  "width_max": 12,
  "rise": 3,
  "run": 2,
  "target_corner": "top-left",
  "target_bounces": 5
}
```

**Hint:** Top-left needs an even number of widths and an odd number of heights; their sum must be seven.

**Insight:** Inverse room design must combine fixed slope, reduced crossing counts, parity, and the first-corner condition.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "width": 4,
  "all_valid_widths": [
    4
  ],
  "corner": "top-left",
  "bounces": 5,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "4",
      "6"
    ],
    [
      "8/3",
      "8"
    ],
    [
      "0",
      "4"
    ],
    [
      "8/3",
      "0"
    ],
    [
      "4",
      "2"
    ],
    [
      "0",
      "8"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

#### 11. Reject an early corner

ID: `billiard-11`

**Task:** Reach top-right first after exactly 8 bounces.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_direction",
  "width": 4,
  "height": 3,
  "component_min": 1,
  "component_max": 12,
  "target_corner": "top-right",
  "target_bounces": 8
}
```

**Hint:** Five widths and five heights share a factor and reach a corner too early. Try another pair adding to ten.

**Insight:** Unreduced crossing counts can fit the endpoint but fail the first-corner requirement.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "rise": 1,
  "run": 12,
  "all_valid_directions": [
    [
      1,
      12
    ],
    [
      7,
      4
    ]
  ],
  "corner": "top-right",
  "bounces": 8,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "4",
      "1/3"
    ],
    [
      "0",
      "2/3"
    ],
    [
      "4",
      "1"
    ],
    [
      "0",
      "4/3"
    ],
    [
      "4",
      "5/3"
    ],
    [
      "0",
      "2"
    ],
    [
      "4",
      "7/3"
    ],
    [
      "0",
      "8/3"
    ],
    [
      "4",
      "3"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

#### 12. Nine bounces, one aim

ID: `billiard-12`

**Task:** Reach bottom-right first after exactly 9 bounces.

**Readiness:** Use reflected copies, room counts, and the direction arrow.

**Rules:**

- Start exactly at the bottom-left corner (0,0), initially moving right and up.
- A vertical wall reverses the horizontal direction; a horizontal wall reverses the vertical direction. Crossing an old part of the path has no effect.
- Stop at the FIRST corner reached after launch. A corner collision is terminal, not a bounce.
- Count only non-corner wall reflections. Predictions are submitted before the path animation.
- A direction is specified by positive integer rise/run: move run units right per rise units up before reflection. The controls show this as an aim arrow; it is not necessary to read fraction notation.
- Design modes accept every permitted setting satisfying the exact corner and reflection count; reset and replay are unlimited.

**Starting data:**

```json
{
  "mode": "choose_direction",
  "width": 3,
  "height": 4,
  "component_min": 1,
  "component_max": 12,
  "target_corner": "bottom-right",
  "target_bounces": 9
}
```

**Hint:** Try five widths and six heights. Convert those distances to an arrow, then reduce it.

**Insight:** A bounded inverse problem joins parity, coprimality and aspect ratio; guessing the same slope as a unit square fails.

**Mathematics:** Unfold a rectangle into mirror copies: the reflected trajectory becomes a straight ray through a rectangular lattice. For slope 1 and reduced dimensions w=ga,h=gb, the first corner has horizontal side right iff b is odd and vertical side top iff a is odd, after a+b−2 bounces. Rational directions reduce to the same lattice problem after scaling the axes. This is the elementary unfolding construction used in billiard dynamics and the torus model, without claiming ergodicity or density results.

**Checked witness:**

```json
{
  "rise": 8,
  "run": 5,
  "all_valid_directions": [
    [
      8,
      5
    ]
  ],
  "corner": "bottom-right",
  "bounces": 9,
  "path": [
    [
      "0",
      "0"
    ],
    [
      "5/2",
      "4"
    ],
    [
      "3",
      "16/5"
    ],
    [
      "1",
      "0"
    ],
    [
      "0",
      "8/5"
    ],
    [
      "3/2",
      "4"
    ],
    [
      "3",
      "8/5"
    ],
    [
      "2",
      "0"
    ],
    [
      "0",
      "16/5"
    ],
    [
      "1/2",
      "4"
    ],
    [
      "3",
      "0"
    ]
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-09-k-1.tex — K–1 page 1, Tasks 1–2; page 2, Task 4, “Open the wall”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-k-1.tex); [week-09-grades-2-3.tex — Grades 2–3 page 1, Tasks 1–2; page 2, Tasks 3–5](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-2-3.tex); [week-09-grades-4-5.tex — Grades 4–5 page 2, Tasks 3–6; page 3, Tasks 7–8](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-grades-4-5.tex); [week-09-facilitator.tex — Facilitator / 2, “Upper theorem with all hypotheses”; / 3, “Extra page: rational and irrational directions” and “Keep the conventions straight”; / 4, “Mathematical direction and primary sources”](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-09/week-09-facilitator.tex); [week-09-redesign.md — “Verified mathematical backbone”; “Sources and boundary between class and research”; “Returning children and future branches”](/Users/jamespfeiffer/math-circle/plans/week-09-redesign.md).

### Bridge Courier

#### 1. The little side road

ID: `route-01`

**Task:** Choose where to start. Walk every road exactly once. You may visit a dot again.

**Readiness:** No reading with narration; track five used edges.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "A",
      1
    ],
    [
      "A",
      "E",
      1
    ]
  ],
  "mode": "each_edge_once",
  "start": null,
  "closed": false,
  "construction": "Square A–B–C–D–A with one leaf E joined to A.",
  "target_cost": 5
}
```

**Hint:** Try starting at the end of the little side road.

**Insight:** A dead end must be an endpoint of the whole walk; the repeated visit to A is legal.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "D",
    "C",
    "B",
    "A",
    "E"
  ],
  "cost": 5,
  "odd_vertices": [
    "A",
    "E"
  ]
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 2. Do the small loop before home

ID: `route-02`

**Task:** Start at B. Walk every road exactly once and finish back at B.

**Readiness:** Track seven used edges; no arithmetic or graph terms required.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "A",
      1
    ],
    [
      "A",
      "E",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "A",
      1
    ]
  ],
  "mode": "each_edge_once",
  "start": "B",
  "closed": true,
  "construction": "A square A–B–C–D–A and a triangle A–E–F–A share just A.",
  "target_cost": 7
}
```

**Hint:** When you reach A, take the triangle detour before using your last road home.

**Insight:** Splice a complete loop into a larger route; returning home too early can strand unused roads.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "B",
    "C",
    "D",
    "A",
    "F",
    "E",
    "A",
    "B"
  ],
  "cost": 7,
  "odd_vertices": []
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 3. Cross the connecting bridge at the right time

ID: `route-03`

**Task:** Start at C. Walk every road exactly once. You may finish at a different dot.

**Readiness:** Track seven edges; plan which region to finish first.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "A",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "D",
      1
    ]
  ],
  "mode": "each_edge_once",
  "start": "C",
  "closed": false,
  "construction": "Two triangles A–B–C–A and D–E–F–D, joined only by C–D.",
  "target_cost": 7
}
```

**Hint:** If you cross C–D now, can you ever return to unfinished roads on the left?

**Insight:** A bridge separates two regions: finish the departing side before the unique crossing.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "C",
    "B",
    "A",
    "C",
    "D",
    "F",
    "E",
    "D"
  ],
  "cost": 7,
  "odd_vertices": [
    "C",
    "D"
  ]
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 4. Three corridors, one depot

ID: `route-04`

**Task:** Start at S. Travel every road at least once and return to S in 8 steps. Roads can be repeated.

**Readiness:** Count to 8; distinguish used-once from used-again roads.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "S",
    "T",
    "A",
    "B",
    "C"
  ],
  "edges": [
    [
      "S",
      "A",
      1
    ],
    [
      "A",
      "T",
      1
    ],
    [
      "S",
      "B",
      1
    ],
    [
      "B",
      "T",
      1
    ],
    [
      "S",
      "C",
      1
    ],
    [
      "C",
      "T",
      1
    ]
  ],
  "mode": "shortest_closed_cover",
  "start": "S",
  "closed": true,
  "construction": "Three internally disjoint length-two paths S–A–T, S–B–T, S–C–T (a subdivided three-edge theta graph).",
  "target_cost": 8
}
```

**Hint:** You will have used three corridors to reach the far end. Which corridor will get you home?

**Insight:** Repetition is now allowed because the destination is a shortest closed delivery tour, not an Euler trail. One entire corridor must be repeated.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "S",
    "C",
    "T",
    "C",
    "S",
    "B",
    "T",
    "A",
    "S"
  ],
  "cost": 8,
  "odd_vertices": [
    "S",
    "T"
  ],
  "base_cost": 6,
  "extra_cost": 2
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 5. Ladder delivery

ID: `route-05`

**Task:** Start at A. Cover every road and return to A in 12 steps. Every road costs 1 step.

**Readiness:** Count to 12; coordinate four junctions and undo route choices.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "a",
    "b",
    "c",
    "d"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "a",
      "b",
      1
    ],
    [
      "b",
      "c",
      1
    ],
    [
      "c",
      "d",
      1
    ],
    [
      "A",
      "a",
      1
    ],
    [
      "B",
      "b",
      1
    ],
    [
      "C",
      "c",
      1
    ],
    [
      "D",
      "d",
      1
    ]
  ],
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "The ordinary ladder graph with top rail A–B–C–D, bottom rail a–b–c–d, and four aligned rungs.",
  "target_cost": 12
}
```

**Hint:** The four middle junctions each have three roads. Try repeating the two middle rungs.

**Insight:** Repair odd degrees in pairs; two well-chosen repeats beat treating every road as an out-and-back errand.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "a",
    "b",
    "B",
    "b",
    "c",
    "C",
    "c",
    "d",
    "D",
    "C",
    "B",
    "A"
  ],
  "cost": 12,
  "odd_vertices": [
    "B",
    "C",
    "b",
    "c"
  ],
  "base_cost": 10,
  "extra_cost": 2
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 6. Choose the roads to repeat

ID: `route-06`

**Task:** Start at A. Cover every road and return to A with total distance 22. Each traversal costs the number written on its road, including repeats.

**Readiness:** Add small positive lengths up to 22; compare complete plans.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "A",
      "C",
      2
    ],
    [
      "A",
      "D",
      3
    ],
    [
      "B",
      "C",
      3
    ],
    [
      "B",
      "D",
      2
    ],
    [
      "C",
      "D",
      7
    ]
  ],
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "Complete graph on four junctions: every pair has a road. Road lengths AB=1, AC=2, AD=3, BC=3, BD=2, CD=7. Draw D inside triangle ABC so every junction is unambiguous.",
  "target_cost": 22
}
```

**Hint:** Plan both extra connections before committing to repeating the cheapest road. Long roads still need one delivery.

**Insight:** Pairing odd junctions is a global choice. Selecting AB as a repeated connection leaves an expensive extra connection between C and D. Starting the route along AB can still be optimal; the choice here is which roads to repeat. Shortest extra connections may use multiple roads.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "C",
    "A",
    "B",
    "D",
    "B",
    "C",
    "D",
    "A"
  ],
  "cost": 22,
  "odd_vertices": [
    "A",
    "B",
    "C",
    "D"
  ],
  "base_cost": 18,
  "extra_cost": 4,
  "pairing_costs": [
    {
      "pairs": [
        [
          "A",
          "B"
        ],
        [
          "C",
          "D"
        ]
      ],
      "cost": 6
    },
    {
      "pairs": [
        [
          "A",
          "C"
        ],
        [
          "B",
          "D"
        ]
      ],
      "cost": 4
    },
    {
      "pairs": [
        [
          "A",
          "D"
        ],
        [
          "B",
          "C"
        ]
      ],
      "cost": 6
    }
  ]
}
```

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 7. Choose the house endpoints

ID: `route-07`

**Task:** Walk every road exactly once.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "A",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "C",
      1
    ]
  ],
  "positions": {
    "A": [
      12,
      82
    ],
    "B": [
      88,
      82
    ],
    "C": [
      88,
      42
    ],
    "D": [
      12,
      42
    ],
    "E": [
      50,
      10
    ]
  },
  "mode": "each_edge_once",
  "start": null,
  "closed": false,
  "construction": "A square with a triangular roof.",
  "target_cost": 6
}
```

**Hint:** Only two junctions have an odd number of roads. Start at one of them.

**Insight:** An Euler trail can revisit junctions while using each road once; the endpoints are forced by degree parity.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "C",
    "E",
    "D",
    "C",
    "B",
    "A",
    "D"
  ],
  "cost": 6,
  "base_cost": 6,
  "extra_cost": 0,
  "odd_vertices": [
    "C",
    "D"
  ]
}
```

**Adaptation:** App adaptation of the house graph and Euler-trail task in Week 10 middle/facilitator sources. The graph is borrowed; app interaction and hint are newly written.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 8. Three loops to splice

ID: `route-08`

**Task:** Walk every road exactly once.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "A",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "C",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "G",
      1
    ],
    [
      "G",
      "E",
      1
    ]
  ],
  "positions": {
    "A": [
      10,
      20
    ],
    "B": [
      10,
      80
    ],
    "C": [
      35,
      50
    ],
    "D": [
      50,
      12
    ],
    "E": [
      65,
      50
    ],
    "F": [
      90,
      20
    ],
    "G": [
      90,
      80
    ]
  },
  "mode": "each_edge_once",
  "start": "A",
  "closed": true,
  "construction": "Three triangles in a chain, sharing one vertex at a time.",
  "target_cost": 9
}
```

**Hint:** At C and E, visit the next loop before closing the one that brought you there.

**Insight:** Returning home early can strand a whole loop; splice all three cycles into one closed walk.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "C",
    "E",
    "G",
    "F",
    "E",
    "D",
    "C",
    "B",
    "A"
  ],
  "cost": 9,
  "base_cost": 9,
  "extra_cost": 0,
  "odd_vertices": []
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 9. Repair six odd junctions

ID: `route-09`

**Task:** Cover every road and return to A with total distance 12.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "A",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "D",
      1
    ],
    [
      "A",
      "D",
      1
    ],
    [
      "B",
      "E",
      1
    ],
    [
      "C",
      "F",
      1
    ]
  ],
  "positions": {
    "A": [
      50,
      10
    ],
    "B": [
      10,
      85
    ],
    "C": [
      90,
      85
    ],
    "D": [
      50,
      40
    ],
    "E": [
      32,
      66
    ],
    "F": [
      68,
      66
    ]
  },
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "Triangular prism with unit roads.",
  "target_cost": 12
}
```

**Hint:** All six junctions need one extra arrival or departure. Plan three repeated roads that touch each junction once.

**Insight:** Six odd vertices require at least three extra crossings; a matching attains the bound on this prism.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "D",
    "F",
    "C",
    "F",
    "E",
    "B",
    "E",
    "D",
    "A",
    "C",
    "B",
    "A"
  ],
  "cost": 12,
  "base_cost": 9,
  "extra_cost": 3,
  "odd_vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ]
}
```

**Adaptation:** App adaptation of the six-odd-vertex triangular-prism construction in Week 10 upper/facilitator sources. The graph and three-repeat bound are borrowed; the concrete interactive route task is new to the app.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 10. Pair through the grid

ID: `route-10`

**Task:** Cover every road and return to A with total distance 16.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "G",
      "H",
      1
    ],
    [
      "H",
      "I",
      1
    ],
    [
      "A",
      "D",
      1
    ],
    [
      "B",
      "E",
      1
    ],
    [
      "C",
      "F",
      1
    ],
    [
      "D",
      "G",
      1
    ],
    [
      "E",
      "H",
      1
    ],
    [
      "F",
      "I",
      1
    ]
  ],
  "positions": {
    "A": [
      12,
      12
    ],
    "B": [
      50,
      12
    ],
    "C": [
      88,
      12
    ],
    "D": [
      12,
      50
    ],
    "E": [
      50,
      50
    ],
    "F": [
      88,
      50
    ],
    "G": [
      12,
      88
    ],
    "H": [
      50,
      88
    ],
    "I": [
      88,
      88
    ]
  },
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "Complete 3 by 3 nearest-neighbor square grid.",
  "target_cost": 16
}
```

**Hint:** The four side-middle junctions have odd degree. Compare the two-road paths that can pair them.

**Insight:** Repeated connections can be paths through even junctions, not just roads between odd junctions.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "D",
    "G",
    "H",
    "I",
    "F",
    "I",
    "H",
    "E",
    "D",
    "E",
    "B",
    "E",
    "F",
    "C",
    "B",
    "A"
  ],
  "cost": 16,
  "base_cost": 12,
  "extra_cost": 4,
  "odd_vertices": [
    "B",
    "D",
    "F",
    "H"
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 11. The shorter detour

ID: `route-11`

**Task:** Cover every road and return to A with total distance 17.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D"
  ],
  "edges": [
    [
      "A",
      "B",
      7
    ],
    [
      "A",
      "C",
      1
    ],
    [
      "C",
      "B",
      2
    ],
    [
      "A",
      "D",
      2
    ],
    [
      "D",
      "B",
      2
    ]
  ],
  "positions": {
    "A": [
      12,
      50
    ],
    "B": [
      88,
      50
    ],
    "C": [
      50,
      12
    ],
    "D": [
      50,
      88
    ]
  },
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "A theta graph with three differently weighted A–B paths.",
  "target_cost": 17
}
```

**Hint:** You must cross the long direct road once. For the extra trip between A and B, compare whole paths.

**Insight:** The shortest parity repair can use two roads even when a direct road exists. Required coverage and cheapest repeats are different choices.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "C",
    "A",
    "D",
    "B",
    "C",
    "B",
    "A"
  ],
  "cost": 17,
  "base_cost": 14,
  "extra_cost": 3,
  "odd_vertices": [
    "A",
    "B"
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

#### 12. Pair all six economically

ID: `route-12`

**Task:** Cover every road and return to A with total distance 28.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Move along drawn roads without teleporting. Dots are junctions; crossings without dots are not junctions. Revisit dots freely. When the goal says exactly once, use each road once. For a distance target, cover every road, return to the marked depot, and meet the target; repeats are allowed. All roads are undirected. Every unlabelled road has length 1.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      3
    ],
    [
      "C",
      "A",
      3
    ],
    [
      "D",
      "E",
      3
    ],
    [
      "E",
      "F",
      3
    ],
    [
      "F",
      "D",
      1
    ],
    [
      "A",
      "D",
      2
    ],
    [
      "B",
      "E",
      4
    ],
    [
      "C",
      "F",
      2
    ]
  ],
  "positions": {
    "A": [
      50,
      10
    ],
    "B": [
      10,
      85
    ],
    "C": [
      90,
      85
    ],
    "D": [
      50,
      40
    ],
    "E": [
      32,
      66
    ],
    "F": [
      68,
      66
    ]
  },
  "mode": "shortest_closed_cover",
  "start": "A",
  "closed": true,
  "construction": "Weighted triangular prism; no roads removed.",
  "target_cost": 28
}
```

**Hint:** Compare complete pairings of all six odd junctions; the cheapest single road does not choose the other two pairs for you.

**Insight:** Weighted six-vertex matching combines parity with shortest-path costs; an optimal augmentation must be planned globally.

**Mathematics:** Euler trails, degree parity, cycle splicing, bridges, and the undirected route-inspection (Chinese postman) problem. The change from exact-once to shortest delivery explicitly introduces necessary repetition. Pairing odd vertices explains the optimization; no proof answer is required.

**Checked witness:**

```json
{
  "route": [
    "A",
    "B",
    "A",
    "D",
    "F",
    "C",
    "F",
    "E",
    "D",
    "E",
    "B",
    "C",
    "A"
  ],
  "cost": 28,
  "base_cost": 22,
  "extra_cost": 6,
  "odd_vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ]
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-10-redesign.md — Entry points and mathematical work; Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-10-redesign.md); [week-10-facilitator.tex — One-walk maps: checks and proof; Delivery routes and optimality](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-10/week-10-facilitator.tex); [Bridge Courier — Eulerian paths](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec36-graphs2.html).

### Neighbor Lanterns

#### 1. A line of lanterns

ID: `color-01`

**Task:** Color all five lanterns with the two colors. Linked lanterns must differ.

**Readiness:** Distinguish two colors or shape patterns; no reading or counting.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ]
  ],
  "palette_size": 2,
  "construction": "Path A–B–C–D–E."
}
```

**Hint:** Try alternating the two colors.

**Insight:** Two-coloring propagates along a path. This teaches the interaction, not the main difficulty.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 2,
    "B": 1,
    "C": 2,
    "D": 1,
    "E": 2
  },
  "minimum_colors": 2
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 2. Closing the necklace

ID: `color-02`

**Task:** Color the five-lantern ring using these three colors. Linked lanterns must differ.

**Readiness:** Notice the closing edge; willing to recolor.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "A",
      1
    ]
  ],
  "palette_size": 3,
  "construction": "Cycle A–B–C–D–E–A."
}
```

**Hint:** Remember that the last lantern is also linked to the first.

**Insight:** An odd loop breaks perfect alternation; reserve a third color for the closure.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 1,
    "B": 2,
    "C": 1,
    "D": 2,
    "E": 3
  },
  "minimum_colors": 3
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 3. The hub needs a color

ID: `color-03`

**Task:** Color the square and its center using three colors. Each spoke and rim link joins different colors.

**Readiness:** Coordinate the four rim dots with the center.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "H"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "A",
      1
    ],
    [
      "A",
      "H",
      1
    ],
    [
      "B",
      "H",
      1
    ],
    [
      "C",
      "H",
      1
    ],
    [
      "D",
      "H",
      1
    ]
  ],
  "palette_size": 3,
  "construction": "Wheel with rim A–B–C–D–A and hub H linked to every rim vertex; rim size 4."
}
```

**Hint:** Set a color aside for the center, then color the rim.

**Insight:** The hub must avoid every rim color, so the rim has to share colors strategically.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 2,
    "B": 3,
    "C": 2,
    "D": 3,
    "H": 1
  },
  "minimum_colors": 3
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 4. One more corner changes the wheel

ID: `color-04`

**Task:** Color the pentagon and its center using four colors. Each spoke and rim link joins different colors.

**Readiness:** Recall odd-ring closure; coordinate center and rim.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "H"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "A",
      1
    ],
    [
      "A",
      "H",
      1
    ],
    [
      "B",
      "H",
      1
    ],
    [
      "C",
      "H",
      1
    ],
    [
      "D",
      "H",
      1
    ],
    [
      "E",
      "H",
      1
    ]
  ],
  "palette_size": 4,
  "construction": "Wheel with rim A–B–C–D–E–A and hub H linked to every rim vertex; rim size 5."
}
```

**Hint:** First solve the five-lantern rim. The center touches every rim lantern.

**Insight:** Combine two earlier ideas: the odd rim needs three colors, and the hub needs another.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 2,
    "B": 3,
    "C": 2,
    "D": 3,
    "E": 4,
    "H": 1
  },
  "minimum_colors": 4
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 5. Two neighbors each way

ID: `color-05`

**Task:** Color the eight-lantern ring with four colors. Every drawn link must join different colors. Links reach the next lantern and the one after it in each direction.

**Readiness:** Trace next-nearest links and coordinate a whole ring; no arithmetic required if links are drawn.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8"
  ],
  "edges": [
    [
      "1",
      "2",
      1
    ],
    [
      "1",
      "3",
      1
    ],
    [
      "2",
      "3",
      1
    ],
    [
      "2",
      "4",
      1
    ],
    [
      "3",
      "4",
      1
    ],
    [
      "3",
      "5",
      1
    ],
    [
      "4",
      "5",
      1
    ],
    [
      "4",
      "6",
      1
    ],
    [
      "5",
      "6",
      1
    ],
    [
      "5",
      "7",
      1
    ],
    [
      "6",
      "7",
      1
    ],
    [
      "6",
      "8",
      1
    ],
    [
      "7",
      "8",
      1
    ],
    [
      "7",
      "1",
      1
    ],
    [
      "8",
      "1",
      1
    ],
    [
      "8",
      "2",
      1
    ]
  ],
  "palette_size": 4,
  "construction": "Square of the 8-cycle: labels 1…8 clockwise; link labels whose circular distance is 1 or 2. No other links."
}
```

**Hint:** Any three consecutive lanterns need three different colors. Watch what happens when your pattern meets itself around the ring.

**Insight:** A local three-color pattern can fail globally. Uniform longer-range adjacency creates the challenge, rather than arbitrary forbidden pairs.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 1,
    "5": 4,
    "6": 2,
    "7": 3,
    "8": 4
  },
  "minimum_colors": 4
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 6. Pentagon and star

ID: `color-06`

**Task:** Color all ten lanterns with three colors. Every link joins different colors. Line crossings have no lantern and do not add connections.

**Readiness:** Track connections through a crossing drawing; revise several colors when necessary.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "o0",
    "o1",
    "o2",
    "o3",
    "o4",
    "i0",
    "i1",
    "i2",
    "i3",
    "i4"
  ],
  "edges": [
    [
      "o0",
      "o1",
      1
    ],
    [
      "o1",
      "o2",
      1
    ],
    [
      "o2",
      "o3",
      1
    ],
    [
      "o3",
      "o4",
      1
    ],
    [
      "o4",
      "o0",
      1
    ],
    [
      "i0",
      "i2",
      1
    ],
    [
      "i1",
      "i3",
      1
    ],
    [
      "i2",
      "i4",
      1
    ],
    [
      "i3",
      "i0",
      1
    ],
    [
      "i4",
      "i1",
      1
    ],
    [
      "o0",
      "i0",
      1
    ],
    [
      "o1",
      "i1",
      1
    ],
    [
      "o2",
      "i2",
      1
    ],
    [
      "o3",
      "i3",
      1
    ],
    [
      "o4",
      "i4",
      1
    ]
  ],
  "palette_size": 3,
  "construction": "Petersen graph: outer pentagon o0–o1–o2–o3–o4–o0; inner star links i0–i2–i4–i1–i3–i0; five matching spokes oj–ij."
}
```

**Hint:** The inside is also a five-lantern loop, just drawn as a star. Color both loops while watching their five spokes.

**Insight:** Two odd loops can share three colors, but their colorings must agree with all matching spokes. This is a compact graph with interacting global choices.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "o0": 1,
    "o1": 2,
    "o2": 1,
    "o3": 2,
    "o4": 3,
    "i0": 2,
    "i1": 1,
    "i2": 3,
    "i3": 3,
    "i4": 2
  },
  "minimum_colors": 3
}
```

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 7. Two squares, one coloring

ID: `color-07`

**Task:** Color every lantern using 2 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "A",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "G",
      1
    ],
    [
      "G",
      "H",
      1
    ],
    [
      "H",
      "E",
      1
    ],
    [
      "A",
      "E",
      1
    ],
    [
      "B",
      "F",
      1
    ],
    [
      "C",
      "G",
      1
    ],
    [
      "D",
      "H",
      1
    ]
  ],
  "positions": {
    "A": [
      10,
      10
    ],
    "B": [
      90,
      10
    ],
    "C": [
      90,
      90
    ],
    "D": [
      10,
      90
    ],
    "E": [
      32,
      32
    ],
    "F": [
      68,
      32
    ],
    "G": [
      68,
      68
    ],
    "H": [
      32,
      68
    ]
  },
  "construction": "Cube graph: two 4-cycles joined by matching spokes.",
  "palette_size": 2
}
```

**Hint:** Alternate around each square, then check the four joining links.

**Insight:** Two even cycles must use compatible phases across their matching links.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 1,
    "B": 2,
    "C": 1,
    "D": 2,
    "E": 2,
    "F": 1,
    "G": 2,
    "H": 1
  },
  "minimum_colors": 2
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 8. Join two triangles

ID: `color-08`

**Task:** Color every lantern using 3 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "A",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "F",
      1
    ],
    [
      "F",
      "D",
      1
    ],
    [
      "A",
      "D",
      1
    ],
    [
      "B",
      "E",
      1
    ],
    [
      "C",
      "F",
      1
    ]
  ],
  "positions": {
    "A": [
      50,
      10
    ],
    "B": [
      10,
      85
    ],
    "C": [
      90,
      85
    ],
    "D": [
      50,
      40
    ],
    "E": [
      32,
      66
    ],
    "F": [
      68,
      66
    ]
  },
  "construction": "Triangular prism.",
  "palette_size": 3
}
```

**Hint:** Each triangle uses all three colors. Rotate the second triangle’s colors to avoid matching across a spoke.

**Insight:** Color names may be permuted on one component, but the connecting links constrain that permutation.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 2,
    "F": 1,
    "E": 3
  },
  "minimum_colors": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 9. Three pairs share colors

ID: `color-09`

**Task:** Color every lantern using 3 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "edges": [
    [
      "A",
      "C",
      1
    ],
    [
      "A",
      "D",
      1
    ],
    [
      "A",
      "E",
      1
    ],
    [
      "A",
      "F",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "B",
      "D",
      1
    ],
    [
      "B",
      "E",
      1
    ],
    [
      "B",
      "F",
      1
    ],
    [
      "C",
      "E",
      1
    ],
    [
      "C",
      "F",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "D",
      "F",
      1
    ]
  ],
  "positions": {
    "A": [
      50,
      11
    ],
    "C": [
      83.77,
      30.5
    ],
    "E": [
      83.77,
      69.5
    ],
    "B": [
      50,
      89
    ],
    "D": [
      16.23,
      69.5
    ],
    "F": [
      16.23,
      30.5
    ]
  },
  "construction": "Complete tripartite graph K2,2,2 (octahedral graph).",
  "palette_size": 3
}
```

**Hint:** Which pairs have no link? Can those pairs share the three colors?

**Insight:** With three colors on the octahedral graph, each nonadjacent opposite pair must share a color.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 1,
    "C": 2,
    "E": 3,
    "B": 1,
    "D": 2,
    "F": 3
  },
  "minimum_colors": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 10. Close a crowded ring

ID: `color-10`

**Task:** Color every lantern using 4 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7"
  ],
  "edges": [
    [
      "1",
      "2",
      1
    ],
    [
      "1",
      "3",
      1
    ],
    [
      "1",
      "6",
      1
    ],
    [
      "1",
      "7",
      1
    ],
    [
      "2",
      "3",
      1
    ],
    [
      "2",
      "4",
      1
    ],
    [
      "2",
      "7",
      1
    ],
    [
      "3",
      "4",
      1
    ],
    [
      "3",
      "5",
      1
    ],
    [
      "4",
      "5",
      1
    ],
    [
      "4",
      "6",
      1
    ],
    [
      "5",
      "6",
      1
    ],
    [
      "5",
      "7",
      1
    ],
    [
      "6",
      "7",
      1
    ]
  ],
  "positions": {
    "1": [
      50,
      11
    ],
    "2": [
      80.49,
      25.68
    ],
    "3": [
      88.02,
      58.68
    ],
    "4": [
      66.92,
      85.14
    ],
    "5": [
      33.08,
      85.14
    ],
    "6": [
      11.98,
      58.68
    ],
    "7": [
      19.51,
      25.68
    ]
  },
  "construction": "Square of the 7-cycle: circular distances 1 and 2 are linked.",
  "palette_size": 4
}
```

**Hint:** Every three consecutive dots need three different colors. Save room for the links that cross the closing seam.

**Insight:** A three-color repeating pattern clashes when wrapped around seven positions; a fourth color must be placed to satisfy both seam links.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 1,
    "5": 2,
    "6": 3,
    "7": 4
  },
  "minimum_colors": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 11. Neighbors may share

ID: `color-11`

**Task:** Color every lantern using 4 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G"
  ],
  "edges": [
    [
      "A",
      "C",
      1
    ],
    [
      "A",
      "D",
      1
    ],
    [
      "A",
      "E",
      1
    ],
    [
      "A",
      "F",
      1
    ],
    [
      "B",
      "D",
      1
    ],
    [
      "B",
      "E",
      1
    ],
    [
      "B",
      "F",
      1
    ],
    [
      "B",
      "G",
      1
    ],
    [
      "C",
      "E",
      1
    ],
    [
      "C",
      "F",
      1
    ],
    [
      "C",
      "G",
      1
    ],
    [
      "D",
      "F",
      1
    ],
    [
      "D",
      "G",
      1
    ],
    [
      "E",
      "G",
      1
    ]
  ],
  "positions": {
    "A": [
      50,
      11
    ],
    "B": [
      80.49,
      25.68
    ],
    "C": [
      88.02,
      58.68
    ],
    "D": [
      66.92,
      85.14
    ],
    "E": [
      33.08,
      85.14
    ],
    "F": [
      11.98,
      58.68
    ],
    "G": [
      19.51,
      25.68
    ]
  },
  "construction": "Complement of the 7-cycle: all pairs except ring neighbors are linked.",
  "palette_size": 4
}
```

**Hint:** Only neighboring positions on the ring are unlinked. Pair those positions when sharing a color.

**Insight:** Independent sets are small and must be chosen together. Coloring the complement of an odd cycle becomes a covering by neighboring pairs and a singleton.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "A": 1,
    "C": 2,
    "E": 3,
    "F": 3,
    "D": 2,
    "B": 1,
    "G": 4
  },
  "minimum_colors": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

#### 12. A fourth color without a triangle

ID: `color-12`

**Task:** Color every lantern using 4 colors so linked pairs differ.

**Readiness:** Track connections and revise a plan; line crossings are not junctions.

**Rules:**

- Color every dot with the supplied palette. The endpoints of every drawn link must have different colors. Recolor freely; no fixed clues, color quotas, or one-off restrictions. A crossing without a dot is not a junction. Color dots, not links.

**Starting data:**

```json
{
  "vertices": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "a",
    "b",
    "c",
    "d",
    "e",
    "X"
  ],
  "edges": [
    [
      "A",
      "B",
      1
    ],
    [
      "B",
      "C",
      1
    ],
    [
      "C",
      "D",
      1
    ],
    [
      "D",
      "E",
      1
    ],
    [
      "E",
      "A",
      1
    ],
    [
      "A",
      "b",
      1
    ],
    [
      "B",
      "a",
      1
    ],
    [
      "B",
      "c",
      1
    ],
    [
      "C",
      "b",
      1
    ],
    [
      "C",
      "d",
      1
    ],
    [
      "D",
      "c",
      1
    ],
    [
      "D",
      "e",
      1
    ],
    [
      "E",
      "d",
      1
    ],
    [
      "E",
      "a",
      1
    ],
    [
      "A",
      "e",
      1
    ],
    [
      "a",
      "X",
      1
    ],
    [
      "b",
      "X",
      1
    ],
    [
      "c",
      "X",
      1
    ],
    [
      "d",
      "X",
      1
    ],
    [
      "e",
      "X",
      1
    ]
  ],
  "positions": {
    "A": [
      50,
      8
    ],
    "B": [
      89.94,
      37.02
    ],
    "C": [
      74.69,
      83.98
    ],
    "D": [
      25.31,
      83.98
    ],
    "E": [
      10.06,
      37.02
    ],
    "a": [
      50,
      27
    ],
    "b": [
      71.87,
      42.89
    ],
    "c": [
      63.52,
      68.61
    ],
    "d": [
      36.48,
      68.61
    ],
    "e": [
      28.13,
      42.89
    ],
    "X": [
      50,
      50
    ]
  },
  "construction": "Mycielski construction on the 5-cycle: uppercase cycle, independent lowercase neighbor copies, and X adjacent to all copies.",
  "palette_size": 4
}
```

**Hint:** The center links to every lowercase dot. Try sharing its color with selected uppercase dots, then coordinate both rings.

**Insight:** Copying each cycle vertex’s neighbors and adding a common neighbor forces a fourth color even though there is no triangle. The complete graph is small enough to check by search.

**Mathematics:** Proper vertex coloring and chromatic number; bipartition, odd-cycle closure, wheels, graph powers, and the Petersen graph. The supplied palette is minimal, checked exhaustively. The player only has to produce a coloring, never a proof of minimality.

**Checked witness:**

```json
{
  "colors": {
    "X": 1,
    "a": 2,
    "B": 1,
    "A": 2,
    "b": 3,
    "C": 2,
    "d": 3,
    "E": 1,
    "D": 3,
    "e": 4,
    "c": 2
  },
  "minimum_colors": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [grades-2-3-year-a.md — Summer Week 15 Map coloring; Entry points item 15 Maps](/Users/jamespfeiffer/math-circle/plans/grades-2-3-year-a.md); [Neighbor Lanterns — Graph coloring](https://www.cs.cornell.edu/courses/cs2800/2017sp/lectures/lec37-coloring.html); [Neighbor Lanterns — Definitions 14.3.2–3; Examples 14.3.6–7 and 14.3.13](https://opentext.uleth.ca/Combinatorics/sect_colouring-Vertices.html).

### Symbol Orchard

#### 1. One of each

ID: `latin-01`

**Task:** Fill the orchard. Put 1 and 2 exactly once in every row and column.

**Readiness:** Match two symbols; follow a row and a column. No arithmetic or independent reading.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 2,
  "givens": [
    [
      1,
      0
    ],
    [
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** Look at the top row. Which symbol is missing?

**Insight:** One local choice propagates through the shared row and column.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      2
    ],
    [
      2,
      1
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 2. The crossing clue

ID: `latin-02`

**Task:** Complete the board with 1, 2, and 3 once in each row and column.

**Readiness:** Distinguish three symbols and keep two lines in mind.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 3,
  "givens": [
    [
      1,
      0,
      0
    ],
    [
      0,
      3,
      0
    ],
    [
      0,
      0,
      2
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** The top-middle square shares a row with 1 and a column with 3.

**Insight:** A cell is controlled by the intersection of its row and column, not just by one line.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      2,
      3
    ],
    [
      2,
      3,
      1
    ],
    [
      3,
      1,
      2
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 3. The empty row

ID: `latin-03`

**Task:** Complete the board with 1–4 once in every row and column.

**Readiness:** Track four symbols; make and revise placements.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 4,
  "givens": [
    [
      1,
      2,
      0,
      0
    ],
    [
      0,
      0,
      4,
      1
    ],
    [
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** Finish the top row, then check the second row before trying to fill the empty third row.

**Insight:** Information can travel across a board through a chain of row/column exclusions.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      2,
      3,
      4
    ],
    [
      2,
      3,
      4,
      1
    ],
    [
      3,
      4,
      1,
      2
    ],
    [
      4,
      1,
      2,
      3
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 4. Find a home for 2

ID: `latin-04`

**Task:** Complete the board with 1–5 once in every row and column.

**Readiness:** Five symbols; compare possible homes across a full row.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 5,
  "givens": [
    [
      0,
      0,
      3,
      4,
      0
    ],
    [
      0,
      0,
      0,
      1,
      0
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      4,
      2,
      0,
      0,
      0
    ],
    [
      1,
      4,
      0,
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** Do not start by asking what fits a cell. Ask where the 2 can go in the top row.

**Insight:** A symbol can have only one possible home in a row even when every empty cell allows several symbols.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      2,
      5,
      3,
      4,
      1
    ],
    [
      5,
      3,
      2,
      1,
      4
    ],
    [
      3,
      1,
      4,
      5,
      2
    ],
    [
      4,
      2,
      1,
      3,
      5
    ],
    [
      1,
      4,
      5,
      2,
      3
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 5. A choice in the middle

ID: `latin-05`

**Task:** Complete the board with 1–5 once in every row and column. You can undo any trial.

**Readiness:** Five symbols; reversible trials; tolerate a delayed contradiction.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 5,
  "givens": [
    [
      0,
      4,
      0,
      0,
      1
    ],
    [
      0,
      5,
      0,
      0,
      0
    ],
    [
      0,
      0,
      2,
      0,
      0
    ],
    [
      0,
      0,
      0,
      3,
      5
    ],
    [
      1,
      0,
      0,
      5,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** First finish the top row. Then the leftmost empty cell in row 2 allows 2 or 4. Try one lightly and check what it forces.

**Insight:** Locally legal placements can fail only after consequences travel through several rows.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      3,
      4,
      5,
      2,
      1
    ],
    [
      2,
      5,
      3,
      1,
      4
    ],
    [
      5,
      1,
      2,
      4,
      3
    ],
    [
      4,
      2,
      1,
      3,
      5
    ],
    [
      1,
      3,
      4,
      5,
      2
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 6. No obvious first move

ID: `latin-06`

**Task:** Complete the board with 1–5 once in every row and column. Use trial marks if they help.

**Readiness:** Five symbols; organize a small case split and recover from a failed attempt.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 5,
  "givens": [
    [
      0,
      3,
      0,
      0,
      4
    ],
    [
      2,
      4,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      1
    ],
    [
      0,
      0,
      0,
      3,
      0
    ],
    [
      0,
      0,
      5,
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows top to bottom and columns left to right, both numbered from 1."
}
```

**Hint:** The top-left cell can hold 1 or 5. A trial 1 is locally legal but cannot lead to a complete board. Track its consequences and keep an undo point.

**Insight:** Uniqueness need not reveal itself through a forced first cell; global completion is a richer question than local legality.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      5,
      3,
      2,
      1,
      4
    ],
    [
      2,
      4,
      1,
      5,
      3
    ],
    [
      4,
      5,
      3,
      2,
      1
    ],
    [
      1,
      2,
      4,
      3,
      5
    ],
    [
      3,
      1,
      5,
      4,
      2
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 7. Rebuild an empty row

ID: `latin-07`

**Task:** Complete the board with 1–4 once in every row and column.

**Readiness:** Use 4 symbols; compare exclusions across rows and columns.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 4,
  "givens": [
    [
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      4
    ],
    [
      2,
      4,
      0,
      0
    ],
    [
      3,
      0,
      0,
      1
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** When no cell is forced, ask where a missing symbol can go in one row or column.

**Insight:** A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      4,
      1,
      3,
      2
    ],
    [
      1,
      3,
      2,
      4
    ],
    [
      2,
      4,
      1,
      3
    ],
    [
      3,
      2,
      4,
      1
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 8. Find a symbol’s only home

ID: `latin-08`

**Task:** Complete the board with 1–5 once in every row and column.

**Readiness:** Use 5 symbols; compare exclusions across rows and columns.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 5,
  "givens": [
    [
      5,
      0,
      0,
      0,
      1
    ],
    [
      3,
      0,
      0,
      0,
      0
    ],
    [
      0,
      2,
      0,
      0,
      0
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      4,
      0,
      3,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** When no cell is forced, ask where a missing symbol can go in one row or column.

**Insight:** A sparse row can still be determined by exclusions from crossing columns; revisit rows after each deduction.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      5,
      3,
      4,
      2,
      1
    ],
    [
      3,
      1,
      2,
      5,
      4
    ],
    [
      4,
      2,
      3,
      1,
      5
    ],
    [
      2,
      5,
      1,
      4,
      3
    ],
    [
      1,
      4,
      5,
      3,
      2
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 9. A small board with no singles

ID: `latin-09`

**Task:** Complete the board with 1–5 once in every row and column.

**Readiness:** Use 5 symbols; follow a small case split and undo failed trials.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 5,
  "givens": [
    [
      4,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      2
    ],
    [
      0,
      3,
      0,
      5,
      0
    ],
    [
      0,
      0,
      1,
      0,
      0
    ],
    [
      0,
      4,
      3,
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** After the forced entries, try the possibilities in row 1, column 2. Keep an undo point.

**Insight:** Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      4,
      5,
      2,
      1,
      3
    ],
    [
      3,
      1,
      5,
      4,
      2
    ],
    [
      2,
      3,
      4,
      5,
      1
    ],
    [
      5,
      2,
      1,
      3,
      4
    ],
    [
      1,
      4,
      3,
      2,
      5
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 10. Forced moves run out

ID: `latin-10`

**Task:** Complete the board with 1–6 once in every row and column.

**Readiness:** Use 6 symbols; follow a small case split and undo failed trials.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 6,
  "givens": [
    [
      0,
      0,
      0,
      0,
      0,
      5
    ],
    [
      3,
      0,
      0,
      4,
      0,
      0
    ],
    [
      6,
      5,
      0,
      0,
      1,
      0
    ],
    [
      0,
      1,
      2,
      0,
      0,
      0
    ],
    [
      2,
      0,
      6,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      2,
      4,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** After the forced entries, try the possibilities in row 1, column 1. Keep an undo point.

**Insight:** Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      4,
      3,
      6,
      2,
      5
    ],
    [
      3,
      2,
      5,
      4,
      6,
      1
    ],
    [
      6,
      5,
      4,
      3,
      1,
      2
    ],
    [
      4,
      1,
      2,
      5,
      3,
      6
    ],
    [
      2,
      3,
      6,
      1,
      5,
      4
    ],
    [
      5,
      6,
      1,
      2,
      4,
      3
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 11. Six symbols, no first single

ID: `latin-11`

**Task:** Complete the board with 1–6 once in every row and column.

**Readiness:** Use 6 symbols; follow a small case split and undo failed trials.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 6,
  "givens": [
    [
      0,
      4,
      0,
      0,
      3,
      0
    ],
    [
      0,
      0,
      2,
      0,
      1,
      0
    ],
    [
      0,
      0,
      5,
      0,
      2,
      3
    ],
    [
      0,
      0,
      0,
      1,
      0,
      5
    ],
    [
      6,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      3,
      4,
      2,
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** After the forced entries, try the possibilities in row 1, column 1. Keep an undo point.

**Insight:** Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      4,
      6,
      5,
      3,
      2
    ],
    [
      3,
      5,
      2,
      4,
      1,
      6
    ],
    [
      4,
      1,
      5,
      6,
      2,
      3
    ],
    [
      2,
      6,
      3,
      1,
      4,
      5
    ],
    [
      6,
      2,
      1,
      3,
      5,
      4
    ],
    [
      5,
      3,
      4,
      2,
      6,
      1
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

#### 12. A different pattern of trades

ID: `latin-12`

**Task:** Complete the board with 1–6 once in every row and column.

**Readiness:** Use 6 symbols; follow a small case split and undo failed trials.

**Rules:**

- Fill each empty cell with one of the displayed symbols. Every row and every column must contain each symbol exactly once. Keep given cells fixed. No boxes, diagonals, visibility counts, or extra rules. Symbols 1–n may be displayed as distinct fruit shapes; their arithmetic values do not matter.

**Starting data:**

```json
{
  "order": 6,
  "givens": [
    [
      0,
      0,
      0,
      5,
      3,
      0
    ],
    [
      0,
      0,
      4,
      3,
      6,
      0
    ],
    [
      5,
      0,
      6,
      1,
      0,
      0
    ],
    [
      0,
      4,
      5,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      0,
      2
    ],
    [
      6,
      1,
      0,
      0,
      0,
      0
    ]
  ],
  "blank": 0,
  "coordinates": "Rows and columns numbered from 1."
}
```

**Hint:** After the forced entries, try the possibilities in row 1, column 1. Keep an undo point.

**Insight:** Local row and column checks leave plausible choices that cannot extend to a full square; follow consequences before committing.

**Mathematics:** Latin squares, partial Latin-square completion, quasigroup multiplication tables, and determining sets. The same uniform row/column condition defines the entire object; fixed entries reveal part of that object. Later puzzles expose the gap between local consistency and global completion.

**Checked witness:**

```json
{
  "canonical_grid": [
    [
      1,
      6,
      2,
      5,
      3,
      4
    ],
    [
      2,
      5,
      4,
      3,
      6,
      1
    ],
    [
      5,
      2,
      6,
      1,
      4,
      3
    ],
    [
      3,
      4,
      5,
      2,
      1,
      6
    ],
    [
      4,
      3,
      1,
      6,
      5,
      2
    ],
    [
      6,
      1,
      3,
      4,
      2,
      5
    ]
  ],
  "completion_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-05-k-1.tex — Task 5, A tiny city](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-k-1.tex); [week-05-extra-grades-6-7.tex — RuleBox; Tasks 1–3, Small swaps force a lower bound](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-extra-grades-6-7.tex); [week-05-facilitator.tex — Extra: a lower bound with an escape move; Where the mathematics goes](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-05/week-05-facilitator.tex); [week-05-redesign.md — The mathematical work; Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-05-redesign.md).

### Signal Lanterns

#### 1. Opposite lanterns

ID: `code-01`

**Task:** The old test got no positions right. Set the two lanterns.

**Readiness:** Match positions and distinguish two symbols; count zero.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 2,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "10",
      "matches": 0
    }
  ]
}
```

**Hint:** A score of zero means every position must change.

**Insight:** In a binary alphabet, the antipodal vertex is uniquely determined.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "01",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 2. One change tells you something

ID: `code-02`

**Task:** Set the three lanterns so all three recorded tests have the shown scores.

**Readiness:** Count matches to 3; compare scores that differ by one.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 3,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "000",
      "matches": 1
    },
    {
      "guess": "100",
      "matches": 2
    },
    {
      "guess": "010",
      "matches": 2
    }
  ]
}
```

**Hint:** Compare 100 with 000. Only the first place changed; the score went up.

**Insight:** A single-coordinate flip changes the score by plus or minus one, revealing that bit. The baseline score determines the last bit.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "110",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 3. The last place is hidden

ID: `code-03`

**Task:** Find the four-symbol code that fits all four tests.

**Readiness:** Count to 4; keep a baseline and three comparisons visible.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 4,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "0000",
      "matches": 2
    },
    {
      "guess": "1000",
      "matches": 3
    },
    {
      "guess": "0100",
      "matches": 1
    },
    {
      "guess": "0010",
      "matches": 3
    }
  ]
}
```

**Hint:** Compare each of the last three tests with 0000, then use the first score for the untested fourth place.

**Insight:** A baseline and coordinate differences reconstruct a vector without testing every coordinate separately.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "1010",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 4. Tests that overlap

ID: `code-04`

**Task:** Find the four-symbol code. Some recorded tests changed more than one place at once.

**Readiness:** Count to 4; compare two non-baseline tests and reuse information.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 4,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "0000",
      "matches": 2
    },
    {
      "guess": "1100",
      "matches": 2
    },
    {
      "guess": "1010",
      "matches": 2
    },
    {
      "guess": "1110",
      "matches": 3
    }
  ]
}
```

**Hint:** Compare 1110 with 1100 to find position 3; compare 1110 with 1010 to find position 2. Then reuse the total.

**Insight:** Overlapping measurements can be subtracted so their shared coordinates cancel.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "0110",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 5. Five places, four echoes

ID: `code-05`

**Task:** Set all five lanterns using the four recorded tests.

**Readiness:** Count to 5; compare score changes of 0 or 2 and follow overlapping pairs.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 5,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "00000",
      "matches": 2
    },
    {
      "guess": "00011",
      "matches": 2
    },
    {
      "guess": "00101",
      "matches": 4
    },
    {
      "guess": "01001",
      "matches": 2
    }
  ]
}
```

**Hint:** The first test has 2 matches and 00101 has 4. Flipping those two positions gained two matches: both positions must be 1.

**Insight:** A two-coordinate score difference determines how many 1s lie in that pair. Overlap recovers the shared bit.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "10101",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 6. Every echo sounds the same

ID: `code-06`

**Task:** All four recorded tests have the same score. Find the five-symbol code.

**Readiness:** Count to 5; hold two possibilities for one shared bit and compare total counts.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 5,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "00000",
      "matches": 3
    },
    {
      "guess": "00011",
      "matches": 3
    },
    {
      "guess": "00101",
      "matches": 3
    },
    {
      "guess": "01001",
      "matches": 3
    }
  ]
}
```

**Hint:** Each changed pair has one 0 and one 1. Try the last position as 0 and as 1; which case agrees with the first test?

**Insight:** The three pair relations allow two patterns for positions 2–5; position 1 remains free, leaving four complete candidate words. The baseline count of two 1s selects the right pattern and fixes position 1.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "10001",
  "consistent_code_count": 1
}
```

**Adaptation:** Authored app instance; mathematical rule and lineage adapted from the listed local sources.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 7. Two pairs and a crossing

ID: `code-07`

**Task:** Find the 5-symbol code that fits every recorded test.

**Readiness:** Count matches to 5; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 5,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "00000",
      "matches": 2
    },
    {
      "guess": "11000",
      "matches": 2
    },
    {
      "guess": "00110",
      "matches": 4
    },
    {
      "guess": "10100",
      "matches": 2
    }
  ]
}
```

**Hint:** Compare each test with 00000. Which changed pair must contain two 1s?

**Insight:** Pair totals overlap through a crossing comparison; after resolving the pairs, the total fixes the last bit.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "01110",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 8. Overlapping triples

ID: `code-08`

**Task:** Find the 5-symbol code that fits every recorded test.

**Readiness:** Count matches to 5; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 5,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "00000",
      "matches": 3
    },
    {
      "guess": "11100",
      "matches": 2
    },
    {
      "guess": "10011",
      "matches": 4
    },
    {
      "guess": "01010",
      "matches": 3
    }
  ]
}
```

**Hint:** The first test counts all the 1s. Compare how the two three-position changes divide those 1s.

**Insight:** Overlapping triples and a pair must describe the same hidden bits; no single-position probe is supplied.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "10010",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 9. One shared position

ID: `code-09`

**Task:** Find the 6-symbol code that fits every recorded test.

**Readiness:** Count matches to 6; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 6,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "000000",
      "matches": 2
    },
    {
      "guess": "110000",
      "matches": 2
    },
    {
      "guess": "101000",
      "matches": 2
    },
    {
      "guess": "100100",
      "matches": 2
    },
    {
      "guess": "100010",
      "matches": 2
    }
  ]
}
```

**Hint:** Every changed pair contains one 0 and one 1. Try the shared first position both ways, then check the total.

**Insight:** Four equal-score relations couple five positions. A case split at their common position and the baseline count select the unique word.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "011110",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 10. Connect the two halves

ID: `code-10`

**Task:** Find the 6-symbol code that fits every recorded test.

**Readiness:** Count matches to 6; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 6,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "000000",
      "matches": 2
    },
    {
      "guess": "110000",
      "matches": 2
    },
    {
      "guess": "001100",
      "matches": 2
    },
    {
      "guess": "101010",
      "matches": 3
    },
    {
      "guess": "010001",
      "matches": 2
    }
  ]
}
```

**Hint:** First find what each two-position test says about its pair. Then use the three-position test to connect them.

**Insight:** Locally consistent pair assignments can disagree with a cross-group total. Every recorded test is necessary for this unique code.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "100111",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 11. Four tests for six bits

ID: `code-11`

**Task:** Find the 6-symbol code that fits every recorded test.

**Readiness:** Count matches to 6; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 6,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "000000",
      "matches": 4
    },
    {
      "guess": "111000",
      "matches": 3
    },
    {
      "guess": "100110",
      "matches": 3
    },
    {
      "guess": "010101",
      "matches": 5
    }
  ]
}
```

**Hint:** There are only two 1s. Work out how many belong in each of the three overlapping groups.

**Insight:** A sparse transcript can uniquely specify six bits. Convert match changes into group counts, then reconcile the overlaps.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "010100",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

#### 12. No pairwise shortcut

ID: `code-12`

**Task:** Find the 6-symbol code that fits every recorded test.

**Readiness:** Count matches to 6; combine overlapping groups of positions.

**Rules:**

- Each position is 0 or 1 (display as two labeled shapes/colors); repetitions are allowed. A recorded test earns one match for each symbol in the correct position. Only the total is shown: no indication of which positions match and no right-symbol/wrong-position score. All tests are visible from the start. Set the secret code that fits every test, then submit; there is no query budget or proof requirement.

**Starting data:**

```json
{
  "length": 6,
  "alphabet": [
    "0",
    "1"
  ],
  "repetitions_allowed": true,
  "feedback": "total_exact_position_matches_only",
  "transcript": [
    {
      "guess": "000000",
      "matches": 3
    },
    {
      "guess": "110100",
      "matches": 4
    },
    {
      "guess": "101010",
      "matches": 2
    },
    {
      "guess": "100011",
      "matches": 2
    }
  ]
}
```

**Hint:** Try the shared first bit as 0 and as 1. Each choice constrains three different groups; check all three and the total.

**Insight:** Three overlapping triple counts leave plausible partial assignments. Only a globally consistent case survives; omitting any test leaves at least four codes.

**Mathematics:** A secret is a vertex of a binary hypercube. Its match score is length minus Hamming distance to a test vertex. Decoding intersects distance shells. Instances 05 and 06 use a resolving set for all 32 five-bit words. Later transcripts need only identify their authored secret uniquely; they do not claim to resolve every possible word.

**Checked witness:**

```json
{
  "code": "010110",
  "consistent_code_count": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-k-1.tex — RuleBox; Tasks 2–4](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-k-1.tex); [week-06-grades-2-3.tex — Tasks 2–3, Change exactly one place; Three tests, then name the secret](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-grades-2-3.tex); [week-06-extra-grades-6-7.tex — Tasks 1–3, Five places, only four tests](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-extra-grades-6-7.tex); [week-06-facilitator.tex — Extra: decode and prove; Undergraduate and research connections](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [week-06-redesign.md — Checked mathematics and boundaries; Sources and lineage](/Users/jamespfeiffer/math-circle/plans/week-06-redesign.md).

### Pebble Duel

#### 1. Leave the pair

ID: `nim-01`

**Task:** Win a game starting with piles of 1 and 2.

**Readiness:** Count and remove 1 or 2; understand alternating turns.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    1,
    2
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Leave the other player two piles of 1.

**Insight:** The smallest equal-pile position lets you answer either move with the last counter.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 2,
    "remove": 1,
    "after": [
      1,
      1
    ]
  },
  "all_winning_moves": [
    {
      "pile": 2,
      "remove": 1,
      "after": [
        1,
        1
      ]
    }
  ],
  "nim_sum": 3
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 2. Build a mirror

ID: `nim-02`

**Task:** Win a game starting with piles of 2 and 5.

**Readiness:** Compare pile sizes to 5; remove several counters from one pile.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    2,
    5
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Can you make the two piles match in one move?

**Insight:** Equal piles let a player copy the opponent in the other pile until both are empty.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 2,
    "remove": 3,
    "after": [
      2,
      2
    ]
  },
  "all_winning_moves": [
    {
      "pile": 2,
      "remove": 3,
      "after": [
        2,
        2
      ]
    }
  ],
  "nim_sum": 7
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 3. Three piles break the old rule

ID: `nim-03`

**Task:** Win a game starting with piles of 1, 1, and 2.

**Readiness:** Three piles; count to 2; remove a whole pile.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    1,
    1,
    2
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** The two matching piles do not protect the player who receives this position. Can you remove the extra pile?

**Insight:** Two equal piles cancel as game components, but an unmatched third pile matters. An even total alone is not a losing-position test.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 3,
    "remove": 2,
    "after": [
      1,
      1,
      0
    ]
  },
  "all_winning_moves": [
    {
      "pile": 3,
      "remove": 2,
      "after": [
        1,
        1,
        0
      ]
    }
  ],
  "nim_sum": 2
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 4. No equal piles needed

ID: `nim-04`

**Task:** Win a game starting with piles of 1, 2, and 4.

**Readiness:** Count to 4; consider several legal replies or use optional 1/2/4 bundle icons.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    1,
    2,
    4
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Try leaving 1, 2, and 3. Whatever changes next, you can leave two equal piles and an empty pile.

**Insight:** A losing three-pile state need not contain equal piles. The 1/2 bundle pattern of 1,2,3 balances.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 3,
    "remove": 1,
    "after": [
      1,
      2,
      3
    ]
  },
  "all_winning_moves": [
    {
      "pile": 3,
      "remove": 1,
      "after": [
        1,
        2,
        3
      ]
    }
  ],
  "nim_sum": 7
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 5. Repair one binary column

ID: `nim-05`

**Task:** Win a game starting with piles of 3, 4, and 5.

**Readiness:** Count to 5; use optional 4/2/1 bundles and odd/even; no binary notation prerequisite.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    3,
    4,
    5
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Show each pile using bundles 4, 2, and 1. Which bundle appears an odd number of times?

**Insight:** Every binary column must contain an even number of bundles, not merely the total number of counters.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 1,
    "remove": 2,
    "after": [
      1,
      4,
      5
    ]
  },
  "all_winning_moves": [
    {
      "pile": 1,
      "remove": 2,
      "after": [
        1,
        4,
        5
      ]
    }
  ],
  "nim_sum": 2
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 6. One move, several ways

ID: `nim-06`

**Task:** Win a game starting with piles of 4, 5, and 6.

**Readiness:** Count to 6; re-express a smaller pile in 4/2/1 bundles; tolerate multiple right answers.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    4,
    5,
    6
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** One legal option changes 4 to 3. Removing one counter trades a 4-bundle for 2+1; inspect all the columns again.

**Insight:** Binary balancing can require lower bits to turn on as a pile shrinks. Different piles can provide different valid balancing moves.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 1,
    "remove": 1,
    "after": [
      3,
      5,
      6
    ]
  },
  "all_winning_moves": [
    {
      "pile": 1,
      "remove": 1,
      "after": [
        3,
        5,
        6
      ]
    },
    {
      "pile": 2,
      "remove": 3,
      "after": [
        4,
        2,
        6
      ]
    },
    {
      "pile": 3,
      "remove": 5,
      "after": [
        4,
        5,
        1
      ]
    }
  ],
  "nim_sum": 7
}
```

**Adaptation:** Authored one-move app adaptation of the standard Nim rule. Source-start lineage is explicit below; no worksheet prose is copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 7. Cancel the matching pair

ID: `nim-07`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    2,
    2,
    3,
    5
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** The two piles of 2 cancel. Balance the other two piles.

**Insight:** Equal game components cancel even when other piles remain.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 4,
    "remove": 2,
    "after": [
      2,
      2,
      3,
      3
    ]
  },
  "all_winning_moves": [
    {
      "pile": 4,
      "remove": 2,
      "after": [
        2,
        2,
        3,
        3
      ]
    }
  ],
  "nim_sum": 6
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 8. A balanced group plus one

ID: `nim-08`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    1,
    3,
    5,
    7,
    2
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Check the 1,3,5,7 group in bundles. What remains outside that balanced group?

**Insight:** A whole collection can cancel even when no two piles match.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 2,
    "remove": 2,
    "after": [
      1,
      1,
      5,
      7,
      2
    ]
  },
  "all_winning_moves": [
    {
      "pile": 2,
      "remove": 2,
      "after": [
        1,
        1,
        5,
        7,
        2
      ]
    },
    {
      "pile": 4,
      "remove": 2,
      "after": [
        1,
        3,
        5,
        5,
        2
      ]
    },
    {
      "pile": 5,
      "remove": 2,
      "after": [
        1,
        3,
        5,
        7,
        0
      ]
    }
  ],
  "nim_sum": 2
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 9. Remove a whole component

ID: `nim-09`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    3,
    5,
    6,
    7
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Look at the first three piles as 4,2,1 bundles. Can one whole pile be removed to leave every column even?

**Insight:** A winning move can remove an entire pile while leaving three unequal piles.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 2,
    "remove": 3,
    "after": [
      3,
      2,
      6,
      7
    ]
  },
  "all_winning_moves": [
    {
      "pile": 2,
      "remove": 3,
      "after": [
        3,
        2,
        6,
        7
      ]
    },
    {
      "pile": 3,
      "remove": 5,
      "after": [
        3,
        5,
        1,
        7
      ]
    },
    {
      "pile": 4,
      "remove": 7,
      "after": [
        3,
        5,
        6,
        0
      ]
    }
  ],
  "nim_sum": 7
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 10. Break the eight bundle

ID: `nim-10`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    2,
    4,
    7,
    8
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Try reducing 8 to 1, then compare the 8,4,2,1 columns.

**Insight:** Shrinking a pile across a power of two can switch several smaller binary columns on.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 4,
    "remove": 7,
    "after": [
      2,
      4,
      7,
      1
    ]
  },
  "all_winning_moves": [
    {
      "pile": 4,
      "remove": 7,
      "after": [
        2,
        4,
        7,
        1
      ]
    }
  ],
  "nim_sum": 9
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 11. Five piles, several repairs

ID: `nim-11`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    1,
    4,
    6,
    9,
    11
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Inspect the 1-bundle column first. Several piles can repair the imbalance.

**Insight:** More than one winning opening may exist; every opponent reply must still be balanced again.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 1,
    "remove": 1,
    "after": [
      0,
      4,
      6,
      9,
      11
    ]
  },
  "all_winning_moves": [
    {
      "pile": 1,
      "remove": 1,
      "after": [
        0,
        4,
        6,
        9,
        11
      ]
    },
    {
      "pile": 4,
      "remove": 1,
      "after": [
        1,
        4,
        6,
        8,
        11
      ]
    },
    {
      "pile": 5,
      "remove": 1,
      "after": [
        1,
        4,
        6,
        9,
        10
      ]
    }
  ],
  "nim_sum": 1
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

#### 12. Rebundle across five piles

ID: `nim-12`

**Task:** Win the game by taking the last pebble.

**Readiness:** Compare piles and use 8/4/2/1 bundles; continue a strategy through a full game.

**Rules:**

- Two players alternate. On a turn, remove any positive number of counters from exactly one pile; removing the whole pile is allowed. Take the last counter to win (normal play). Empty piles remain labeled but cannot be chosen. The app takes a winning move whenever one exists, otherwise a random legal move.

**Starting data:**

```json
{
  "piles": [
    3,
    5,
    8,
    10,
    12
  ],
  "pile_numbering": "left to right, starting at 1",
  "normal_play": true,
  "task": "win_game",
  "allowed_removal": "any positive amount from exactly one nonempty pile"
}
```

**Hint:** Find the highest unbalanced bundle column. Which pile can lose that bundle and repair the smaller columns too?

**Insight:** Choosing among multiple reductions requires coordinating all binary columns across five components.

**Mathematics:** Normal-play impartial games and backward induction lead from equal two-pile positions to Nim sum zero. Binary column parity is addition over the field with two elements; this is Bouton’s classical solved game and an entry to Sprague–Grundy theory.

**Checked witness:**

```json
{
  "canonical_move": {
    "pile": 3,
    "remove": 8,
    "after": [
      3,
      5,
      0,
      10,
      12
    ]
  },
  "all_winning_moves": [
    {
      "pile": 3,
      "remove": 8,
      "after": [
        3,
        5,
        0,
        10,
        12
      ]
    },
    {
      "pile": 4,
      "remove": 8,
      "after": [
        3,
        5,
        8,
        2,
        12
      ]
    },
    {
      "pile": 5,
      "remove": 8,
      "after": [
        3,
        5,
        8,
        10,
        4
      ]
    }
  ],
  "nim_sum": 8
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-07-k-1.tex — Tasks 2–5, Can you leave a little trap? and A trap that grows](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-k-1.tex); [week-07-facilitator.tex — Middle: backward reasoning; Extra: smallest-missing labels](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-07/week-07-facilitator.tex); [week-08-k-1.tex — Task 4, Two little piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-k-1.tex); [week-08-grades-2-3.tex — Tasks 3–5, The board is two piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-2-3.tex); [week-08-grades-4-5.tex — Tasks 2–6, Compare two kinds of balance; Balance the binary columns](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-grades-4-5.tex); [week-08-facilitator.tex — The binary invariant; Why the test is sufficient, for any number of piles](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-08/week-08-facilitator.tex); [week-08-redesign.md — Verified mathematical backbone](/Users/jamespfeiffer/math-circle/plans/week-08-redesign.md).

### Spring-water Jugs

#### 1. Make one unit

ID: `jug-01`

**Task:** Use the 3- and 2-unit jugs to leave exactly 1 unit in either jug.

**Readiness:** Entry: count to 3; recognize full and empty.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    3,
    2
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 1
}
```

**Hint:** Fill the large jug, then use the smaller jug as a measuring gap.

**Insight:** A capacity difference produces a new amount.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      3,
      0
    ],
    [
      1,
      2
    ]
  ],
  "minimum_moves": 2
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 2. Save the overflow

ID: `jug-02`

**Task:** Use the 5- and 3-unit jugs to leave exactly 1 unit in either jug.

**Readiness:** Explore: count to 5 and remember an intermediate amount.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    5,
    3
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 1
}
```

**Hint:** The second small jugful will not all fit. Keep what remains.

**Insight:** Two small fills can leave a remainder; a partial receiving jug is useful.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      1
    ],
    [
      "pour",
      1,
      0
    ],
    [
      "fill",
      1
    ],
    [
      "pour",
      1,
      0
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      0,
      3
    ],
    [
      3,
      0
    ],
    [
      3,
      3
    ],
    [
      5,
      1
    ]
  ],
  "minimum_moves": 4
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 3. Measure what is missing

ID: `jug-03`

**Task:** Use the 5- and 3-unit jugs to leave exactly 4 units in either jug.

**Readiness:** Explore: same equipment, different target; reverse the earlier plan.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    5,
    3
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 4
}
```

**Hint:** Save two units in the small jug. How much room is left there?

**Insight:** Use the receiving jug’s free space as a measure; filling the largest jug first is useful.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "empty",
      1
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      5,
      0
    ],
    [
      2,
      3
    ],
    [
      2,
      0
    ],
    [
      0,
      2
    ],
    [
      5,
      2
    ],
    [
      4,
      3
    ]
  ],
  "minimum_moves": 6
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 4. Carry a remainder twice

ID: `jug-04`

**Task:** Use the 7- and 4-unit jugs to leave exactly 2 units in either jug.

**Readiness:** Stretch: track intermediate states through two fill-and-transfer rounds.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    7,
    4
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 2
}
```

**Hint:** After making three units, use the small jug’s one empty space.

**Insight:** Iterated remainder transfer; progress is not monotone in a jug’s displayed amount.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "empty",
      1
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "empty",
      1
    ],
    [
      "pour",
      0,
      1
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      7,
      0
    ],
    [
      3,
      4
    ],
    [
      3,
      0
    ],
    [
      0,
      3
    ],
    [
      7,
      3
    ],
    [
      6,
      4
    ],
    [
      6,
      0
    ],
    [
      2,
      4
    ]
  ],
  "minimum_moves": 8
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 5. Share the spring water

ID: `jug-05`

**Task:** All 8 units start in jug A. Share them so A and B each hold 4 and C is empty. Keep every drop.

**Readiness:** Stretch: three containers; no tap or drain, but no new arithmetic.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    8,
    5,
    3
  ],
  "start": [
    8,
    0,
    0
  ],
  "source_and_drain": false,
  "target_state": [
    4,
    4,
    0
  ]
}
```

**Hint:** Keep every drop. The smallest jug can return water to the big one.

**Insight:** Conservation changes the state graph: emptied water must be stored elsewhere.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ]
  ],
  "states": [
    [
      8,
      0,
      0
    ],
    [
      3,
      5,
      0
    ],
    [
      3,
      2,
      3
    ],
    [
      6,
      2,
      0
    ],
    [
      6,
      0,
      2
    ],
    [
      1,
      5,
      2
    ],
    [
      1,
      4,
      3
    ],
    [
      4,
      4,
      0
    ]
  ],
  "minimum_moves": 7
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 6. A small amount is a useful tool

ID: `jug-06`

**Task:** All 10 units start in jug A. Share them so A and B each hold 5 and C is empty. Keep every drop.

**Readiness:** Stretch: coordinate storage and free capacity; a longer consolidation problem, not a new theorem.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    10,
    7,
    3
  ],
  "start": [
    10,
    0,
    0
  ],
  "source_and_drain": false,
  "target_state": [
    5,
    5,
    0
  ]
}
```

**Hint:** Try to save one unit in the small jug before filling the middle jug.

**Insight:** A one-unit buffer lets a later pour remove only two; reuse space, not just water.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ]
  ],
  "states": [
    [
      10,
      0,
      0
    ],
    [
      3,
      7,
      0
    ],
    [
      3,
      4,
      3
    ],
    [
      6,
      4,
      0
    ],
    [
      6,
      1,
      3
    ],
    [
      9,
      1,
      0
    ],
    [
      9,
      0,
      1
    ],
    [
      2,
      7,
      1
    ],
    [
      2,
      5,
      3
    ],
    [
      5,
      5,
      0
    ]
  ],
  "minimum_moves": 9
}
```

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 7. Measure in twos

ID: `jug-07`

**Task:** Leave exactly 2 units in either jug.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    6,
    4
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 2
}
```

**Hint:** Fill A and pour into B. Think of every quantity in two-unit bundles.

**Insight:** A common factor restricts reachable amounts; a two-unit target remains reachable.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      0
    ],
    [
      "pour",
      0,
      1
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      6,
      0
    ],
    [
      2,
      4
    ]
  ],
  "minimum_moves": 2
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 8. Save the smaller remainder

ID: `jug-08`

**Task:** Leave exactly 2 units in either jug.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    4,
    3
  ],
  "start": [
    0,
    0
  ],
  "source_and_drain": true,
  "target_amount": 2
}
```

**Hint:** Fill the smaller jug twice, saving the overflow from the second fill.

**Insight:** The receiving jug’s free space determines the remainder; starting with the largest jug is not always shortest.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "fill",
      1
    ],
    [
      "pour",
      1,
      0
    ],
    [
      "fill",
      1
    ],
    [
      "pour",
      1,
      0
    ]
  ],
  "states": [
    [
      0,
      0
    ],
    [
      0,
      3
    ],
    [
      3,
      0
    ],
    [
      3,
      3
    ],
    [
      4,
      2
    ]
  ],
  "minimum_moves": 4
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 9. Leave three different amounts

ID: `jug-09`

**Task:** Keep every drop and reach the displayed distribution.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    9,
    5,
    4
  ],
  "start": [
    9,
    0,
    0
  ],
  "source_and_drain": false,
  "target_state": [
    3,
    2,
    4
  ]
}
```

**Hint:** First save two units in B, then fill C without disturbing that amount.

**Insight:** An exact distribution makes the location of each remainder matter, not just producing a target somewhere.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ]
  ],
  "states": [
    [
      9,
      0,
      0
    ],
    [
      4,
      5,
      0
    ],
    [
      4,
      1,
      4
    ],
    [
      8,
      1,
      0
    ],
    [
      8,
      0,
      1
    ],
    [
      3,
      5,
      1
    ],
    [
      3,
      2,
      4
    ]
  ],
  "minimum_moves": 6
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 10. Start with the storage full

ID: `jug-10`

**Task:** Keep every drop and reach the displayed distribution.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    10,
    6,
    4
  ],
  "start": [
    0,
    6,
    4
  ],
  "source_and_drain": false,
  "target_state": [
    2,
    4,
    4
  ]
}
```

**Hint:** A starts empty. Use it to free measuring space before restoring the requested amounts.

**Insight:** Empty storage is a resource; a sealed process can begin from a split supply rather than a full reservoir.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      1,
      0
    ],
    [
      "pour",
      2,
      1
    ],
    [
      "pour",
      0,
      2
    ]
  ],
  "states": [
    [
      0,
      6,
      4
    ],
    [
      6,
      0,
      4
    ],
    [
      6,
      4,
      0
    ],
    [
      2,
      4,
      4
    ]
  ],
  "minimum_moves": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 11. Overlapping capacities

ID: `jug-11`

**Task:** Keep every drop and reach the displayed distribution.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    12,
    8,
    5
  ],
  "start": [
    12,
    0,
    0
  ],
  "source_and_drain": false,
  "target_state": [
    6,
    6,
    0
  ]
}
```

**Hint:** Try transferring between the two smaller jugs before refilling either one completely.

**Insight:** The smaller capacities exceed the supply together; reserve space deliberately to build and transfer a useful remainder.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ]
  ],
  "states": [
    [
      12,
      0,
      0
    ],
    [
      4,
      8,
      0
    ],
    [
      4,
      3,
      5
    ],
    [
      9,
      3,
      0
    ],
    [
      9,
      0,
      3
    ],
    [
      1,
      8,
      3
    ],
    [
      1,
      6,
      5
    ],
    [
      6,
      6,
      0
    ]
  ],
  "minimum_moves": 7
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

#### 12. A one-unit measuring gap

ID: `jug-12`

**Task:** Keep every drop and reach the displayed distribution.

**Readiness:** Track amounts and free space; pours stop only at an empty source or full destination.

**Rules:**

- A fill goes to capacity; emptying removes all water; a pour continues until the source is empty or the destination is full. No stopping partway. Fill and Empty controls are available only when a spring and drain are provided. Otherwise the supply is sealed: pour only and keep every drop. All goal-reaching paths count; minima are optional replay targets.

**Starting data:**

```json
{
  "capacities": [
    12,
    7,
    5
  ],
  "start": [
    12,
    0,
    0
  ],
  "source_and_drain": false,
  "target_state": [
    6,
    6,
    0
  ]
}
```

**Hint:** Try to leave one unit in C. Its four empty spaces can turn a full B into three, then help build six.

**Insight:** Several remainders must be stored and reused to split an odd-capacity pair into two equal shares.

**Mathematics:** Integer state graphs, conserved quantities, gcd and integer linear combinations; Bézout reachability with a source/drain. The closed three-jug variant adds total-volume conservation; do not transfer the two-jug sufficiency theorem without checking.

**Checked witness:**

```json
{
  "moves": [
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      0,
      1
    ],
    [
      "pour",
      1,
      2
    ],
    [
      "pour",
      2,
      0
    ]
  ],
  "states": [
    [
      12,
      0,
      0
    ],
    [
      5,
      7,
      0
    ],
    [
      5,
      2,
      5
    ],
    [
      10,
      2,
      0
    ],
    [
      10,
      0,
      2
    ],
    [
      3,
      7,
      2
    ],
    [
      3,
      4,
      5
    ],
    [
      8,
      4,
      0
    ],
    [
      8,
      0,
      4
    ],
    [
      1,
      7,
      4
    ],
    [
      1,
      6,
      5
    ],
    [
      6,
      6,
      0
    ]
  ],
  "minimum_moves": 11
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-04-redesign.md — Mathematical destination; Checked results and proofs](/Users/jamespfeiffer/math-circle/plans/week-04-redesign.md); [Spring-water jugs — Sections 3.1 and 4.1–4.3](https://web.mit.edu/neboat/Public/6.042/numbertheory1.pdf).

### Odd-pebble Balance

#### 1. The pebble off the scale

ID: `weigh-01`

**Task:** One of these 3 pebbles is heavier than the others. Find it using at most 1 weighing.

**Readiness:** Entry: distinguish a tilt from balance.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C"
  ],
  "odd_kind": "heavy",
  "known_genuine": [],
  "weighing_budget": 1,
  "fixed_secret": [
    "C",
    1
  ]
}
```

**Hint:** Try one pebble on each pan. A balance is information too.

**Insight:** Three possible outcomes distinguish three locations in one weighing.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A"
    ],
    "right": [
      "B"
    ],
    "branches": {
      "L": {
        "coin": "A",
        "deviation": 1
      },
      "=": {
        "coin": "C",
        "deviation": 1
      },
      "R": {
        "coin": "B",
        "deviation": 1
      }
    }
  },
  "worst_case_weighings": 1
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 2. Keep an unweighed group

ID: `weigh-02`

**Task:** One of these 4 pebbles is heavier than the others. Find it using at most 2 weighings.

**Readiness:** Explore: track candidate groups.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D"
  ],
  "odd_kind": "heavy",
  "known_genuine": [],
  "weighing_budget": 2,
  "fixed_secret": [
    "D",
    1
  ]
}
```

**Hint:** You can learn something without putting every pebble on the scale.

**Insight:** A first question need not identify the pebble immediately; preserve a solvable follow-up.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A"
    ],
    "right": [
      "B"
    ],
    "branches": {
      "L": {
        "coin": "A",
        "deviation": 1
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "=": {
            "coin": "D",
            "deviation": 1
          },
          "R": {
            "coin": "C",
            "deviation": 1
          }
        }
      },
      "R": {
        "coin": "B",
        "deviation": 1
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 3. Three groups, two questions

ID: `weigh-03`

**Task:** One of these 9 pebbles is heavier than the others. Find it using at most 2 weighings.

**Readiness:** Explore: track candidate groups.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "J"
  ],
  "odd_kind": "heavy",
  "known_genuine": [],
  "weighing_budget": 2,
  "fixed_secret": [
    "H",
    1
  ]
}
```

**Hint:** Compare three with three; keep three off the scale.

**Insight:** All three outcomes must leave at most three suspects to finish in one more weighing.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B",
      "C"
    ],
    "right": [
      "D",
      "E",
      "F"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "coin": "C",
            "deviation": 1
          },
          "R": {
            "coin": "B",
            "deviation": 1
          }
        }
      },
      "=": {
        "left": [
          "G"
        ],
        "right": [
          "H"
        ],
        "branches": {
          "L": {
            "coin": "G",
            "deviation": 1
          },
          "=": {
            "coin": "J",
            "deviation": 1
          },
          "R": {
            "coin": "H",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "D"
        ],
        "right": [
          "E"
        ],
        "branches": {
          "L": {
            "coin": "D",
            "deviation": 1
          },
          "=": {
            "coin": "F",
            "deviation": 1
          },
          "R": {
            "coin": "E",
            "deviation": 1
          }
        }
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 4. Which way is it different?

ID: `weigh-04`

**Task:** One of these 3 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 2 weighings.

**Readiness:** Stretch: track both identity and heavy/light status; a visible notebook helps.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [],
  "weighing_budget": 2,
  "fixed_secret": [
    "B",
    -1
  ]
}
```

**Hint:** After a tilt, a pebble on the high side may be the light one.

**Insight:** Track signed hypotheses: A-heavy and B-light can produce the same tilt.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A"
    ],
    "right": [
      "B"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "coin": "B",
            "deviation": -1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "L": {
            "coin": "C",
            "deviation": -1
          },
          "R": {
            "coin": "C",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "=": {
            "coin": "B",
            "deviation": 1
          },
          "R": {
            "coin": "A",
            "deviation": -1
          }
        }
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 5. Use a trusted pebble

ID: `weigh-05`

**Task:** One of these 4 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 2 weighings. R is a known normal pebble.

**Readiness:** Stretch: track both identity and heavy/light status; a visible notebook helps.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [
    "R"
  ],
  "weighing_budget": 2,
  "fixed_secret": [
    "D",
    -1
  ]
}
```

**Hint:** R is normal. Use it to make a comparison that could not be made before.

**Insight:** A reference changes what experiments are possible; four unknowns now fit in two weighings.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B"
    ],
    "right": [
      "C",
      "R"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "coin": "C",
            "deviation": -1
          },
          "R": {
            "coin": "B",
            "deviation": 1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "D"
        ],
        "branches": {
          "L": {
            "coin": "D",
            "deviation": -1
          },
          "R": {
            "coin": "D",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "B",
            "deviation": -1
          },
          "=": {
            "coin": "C",
            "deviation": 1
          },
          "R": {
            "coin": "A",
            "deviation": -1
          }
        }
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 6. Learn which pebbles are trustworthy

ID: `weigh-06`

**Task:** One of these 8 pebbles is heavier or lighter than the others. Find it and tell which way it differs using at most 3 weighings.

**Readiness:** Stretch: track both identity and heavy/light status; a visible notebook helps.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [],
  "weighing_budget": 3,
  "fixed_secret": [
    "E",
    -1
  ]
}
```

**Hint:** Pebbles ruled out by the first weighing can become references.

**Insight:** Switch from locating a group to distinguishing heavy-on-one-side from light-on-the-other; reuse established normal pebbles.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B",
      "C"
    ],
    "right": [
      "D",
      "E",
      "F"
    ],
    "branches": {
      "L": {
        "left": [
          "A",
          "D"
        ],
        "right": [
          "B",
          "E"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "A",
                "deviation": 1
              },
              "=": {
                "coin": "E",
                "deviation": -1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "=": {
                "coin": "F",
                "deviation": -1
              },
              "R": {
                "coin": "C",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "=": {
                "coin": "D",
                "deviation": -1
              },
              "R": {
                "coin": "B",
                "deviation": 1
              }
            }
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "G"
        ],
        "branches": {
          "L": {
            "coin": "G",
            "deviation": -1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "H"
            ],
            "branches": {
              "L": {
                "coin": "H",
                "deviation": -1
              },
              "R": {
                "coin": "H",
                "deviation": 1
              }
            }
          },
          "R": {
            "coin": "G",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A",
          "D"
        ],
        "right": [
          "B",
          "E"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "B",
                "deviation": -1
              },
              "=": {
                "coin": "D",
                "deviation": 1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "L": {
                "coin": "C",
                "deviation": -1
              },
              "=": {
                "coin": "F",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "=": {
                "coin": "E",
                "deviation": 1
              },
              "R": {
                "coin": "A",
                "deviation": -1
              }
            }
          }
        }
      }
    }
  },
  "worst_case_weighings": 3
}
```

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 7. Split into three pairs

ID: `weigh-07`

**Task:** Find the odd pebble in at most 2 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "odd_kind": "heavy",
  "known_genuine": [],
  "weighing_budget": 2,
  "fixed_secret": [
    "F",
    1
  ]
}
```

**Hint:** Compare two pebbles against two, leaving a pair off the scale.

**Insight:** Each first outcome must leave no more than three candidates.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B"
    ],
    "right": [
      "C",
      "D"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "R": {
            "coin": "B",
            "deviation": 1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "E"
        ],
        "branches": {
          "=": {
            "coin": "F",
            "deviation": 1
          },
          "R": {
            "coin": "E",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "=": {
            "coin": "D",
            "deviation": 1
          },
          "R": {
            "coin": "C",
            "deviation": 1
          }
        }
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 8. Compare with a reference

ID: `weigh-08`

**Task:** Find the odd pebble and whether it is heavy or light in at most 2 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [
    "R"
  ],
  "weighing_budget": 2,
  "fixed_secret": [
    "C",
    -1
  ]
}
```

**Hint:** A known normal pebble can separate heavy and light possibilities immediately.

**Insight:** References allow direct signed comparisons; preserve enough information to identify both the pebble and its sign.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A"
    ],
    "right": [
      "B"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "coin": "B",
            "deviation": -1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "L": {
            "coin": "C",
            "deviation": -1
          },
          "R": {
            "coin": "C",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "C"
        ],
        "branches": {
          "=": {
            "coin": "B",
            "deviation": 1
          },
          "R": {
            "coin": "A",
            "deviation": -1
          }
        }
      }
    }
  },
  "worst_case_weighings": 2
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 9. Build your own reference

ID: `weigh-09`

**Task:** Find the odd pebble and whether it is heavy or light in at most 3 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [],
  "weighing_budget": 3,
  "fixed_secret": [
    "E",
    -1
  ]
}
```

**Hint:** Compare two against two. Pebbles eliminated by the outcome can be reused as normal references.

**Insight:** A tilt leaves heavy and light hypotheses on opposite pans; a balanced result creates trusted references.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B"
    ],
    "right": [
      "C",
      "D"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "L": {
                "coin": "C",
                "deviation": -1
              },
              "=": {
                "coin": "D",
                "deviation": -1
              }
            }
          },
          "R": {
            "coin": "B",
            "deviation": 1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "E"
        ],
        "branches": {
          "L": {
            "coin": "E",
            "deviation": -1
          },
          "R": {
            "coin": "E",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "B",
            "deviation": -1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "=": {
                "coin": "D",
                "deviation": 1
              },
              "R": {
                "coin": "C",
                "deviation": 1
              }
            }
          },
          "R": {
            "coin": "A",
            "deviation": -1
          }
        }
      }
    }
  },
  "worst_case_weighings": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 10. Move suspects between pans

ID: `weigh-10`

**Task:** Find the odd pebble and whether it is heavy or light in at most 3 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [],
  "weighing_budget": 3,
  "fixed_secret": [
    "F",
    -1
  ]
}
```

**Hint:** After a tilt, moving a suspect to the other pan reverses the outcome predicted for that suspect.

**Insight:** Adaptive experiments distinguish signed hypotheses by switching some suspects and leaving others off.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B"
    ],
    "right": [
      "C",
      "D"
    ],
    "branches": {
      "L": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "A",
            "deviation": 1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "L": {
                "coin": "C",
                "deviation": -1
              },
              "=": {
                "coin": "D",
                "deviation": -1
              }
            }
          },
          "R": {
            "coin": "B",
            "deviation": 1
          }
        }
      },
      "=": {
        "left": [
          "A"
        ],
        "right": [
          "E"
        ],
        "branches": {
          "L": {
            "coin": "E",
            "deviation": -1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "F"
            ],
            "branches": {
              "L": {
                "coin": "F",
                "deviation": -1
              },
              "R": {
                "coin": "F",
                "deviation": 1
              }
            }
          },
          "R": {
            "coin": "E",
            "deviation": 1
          }
        }
      },
      "R": {
        "left": [
          "A"
        ],
        "right": [
          "B"
        ],
        "branches": {
          "L": {
            "coin": "B",
            "deviation": -1
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "=": {
                "coin": "D",
                "deviation": 1
              },
              "R": {
                "coin": "C",
                "deviation": 1
              }
            }
          },
          "R": {
            "coin": "A",
            "deviation": -1
          }
        }
      }
    }
  },
  "worst_case_weighings": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 11. Use the trusted tenth pebble

ID: `weigh-11`

**Task:** Find the odd pebble and whether it is heavy or light in at most 3 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [
    "R"
  ],
  "weighing_budget": 3,
  "fixed_secret": [
    "I",
    -1
  ]
}
```

**Hint:** Keep every first-outcome group small enough to separate with two more weighings. R can balance an uneven suspect count.

**Insight:** A reference changes the available partitions of signed hypotheses; every branch must fit the remaining information budget.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B",
      "C"
    ],
    "right": [
      "D",
      "E",
      "F"
    ],
    "branches": {
      "L": {
        "left": [
          "A",
          "D"
        ],
        "right": [
          "B",
          "E"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "A",
                "deviation": 1
              },
              "=": {
                "coin": "E",
                "deviation": -1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "=": {
                "coin": "F",
                "deviation": -1
              },
              "R": {
                "coin": "C",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "=": {
                "coin": "D",
                "deviation": -1
              },
              "R": {
                "coin": "B",
                "deviation": 1
              }
            }
          }
        }
      },
      "=": {
        "left": [
          "G"
        ],
        "right": [
          "H"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "G"
            ],
            "branches": {
              "=": {
                "coin": "H",
                "deviation": -1
              },
              "R": {
                "coin": "G",
                "deviation": 1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "I"
            ],
            "branches": {
              "L": {
                "coin": "I",
                "deviation": -1
              },
              "R": {
                "coin": "I",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "G"
            ],
            "branches": {
              "L": {
                "coin": "G",
                "deviation": -1
              },
              "=": {
                "coin": "H",
                "deviation": 1
              }
            }
          }
        }
      },
      "R": {
        "left": [
          "A",
          "D"
        ],
        "right": [
          "B",
          "E"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "B",
                "deviation": -1
              },
              "=": {
                "coin": "D",
                "deviation": 1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "C"
            ],
            "branches": {
              "L": {
                "coin": "C",
                "deviation": -1
              },
              "=": {
                "coin": "F",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "=": {
                "coin": "E",
                "deviation": 1
              },
              "R": {
                "coin": "A",
                "deviation": -1
              }
            }
          }
        }
      }
    }
  },
  "worst_case_weighings": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

#### 12. Twelve pebbles, three questions

ID: `weigh-12`

**Task:** Find the odd pebble and whether it is heavy or light in at most 3 weighings.

**Readiness:** Read balance outcomes; track which pebble and which direction of weight still fit.

**Rules:**

- Exactly one suspect pebble differs; all other pebbles have the same weight. Compare disjoint equal-size groups. A weighing reports left heavier, right heavier, or balance. The budget counts actual weighings. Declare only when the evidence uniquely identifies the pebble and, when required, whether it is heavy or light. A pebble marked Normal is a known genuine reference.

**Starting data:**

```json
{
  "coins": [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L"
  ],
  "odd_kind": "heavy_or_light",
  "known_genuine": [],
  "weighing_budget": 3,
  "fixed_secret": [
    "L",
    -1
  ]
}
```

**Hint:** Start with four against four. After a tilt, compare a mixture of heavy-side and light-side suspects.

**Insight:** Twenty-four signed possibilities must be separated in three ternary experiments. A bad first partition leaves no guaranteed completion.

**Mathematics:** Ternary decision trees, worst-case experimental design, information bounds, and signed hypotheses. A strategy must work on every consistent hidden state, not merely guess the chosen secret.

**Checked witness:**

```json
{
  "strategy": {
    "left": [
      "A",
      "B",
      "C",
      "D"
    ],
    "right": [
      "E",
      "F",
      "G",
      "H"
    ],
    "branches": {
      "L": {
        "left": [
          "A",
          "B",
          "E"
        ],
        "right": [
          "C",
          "D",
          "F"
        ],
        "branches": {
          "L": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "A",
                "deviation": 1
              },
              "=": {
                "coin": "F",
                "deviation": -1
              },
              "R": {
                "coin": "B",
                "deviation": 1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "G"
            ],
            "branches": {
              "L": {
                "coin": "G",
                "deviation": -1
              },
              "=": {
                "coin": "H",
                "deviation": -1
              }
            }
          },
          "R": {
            "left": [
              "C"
            ],
            "right": [
              "D"
            ],
            "branches": {
              "L": {
                "coin": "C",
                "deviation": 1
              },
              "=": {
                "coin": "E",
                "deviation": -1
              },
              "R": {
                "coin": "D",
                "deviation": 1
              }
            }
          }
        }
      },
      "=": {
        "left": [
          "A",
          "I"
        ],
        "right": [
          "J",
          "K"
        ],
        "branches": {
          "L": {
            "left": [
              "J"
            ],
            "right": [
              "K"
            ],
            "branches": {
              "L": {
                "coin": "K",
                "deviation": -1
              },
              "=": {
                "coin": "I",
                "deviation": 1
              },
              "R": {
                "coin": "J",
                "deviation": -1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "L"
            ],
            "branches": {
              "L": {
                "coin": "L",
                "deviation": -1
              },
              "R": {
                "coin": "L",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "J"
            ],
            "right": [
              "K"
            ],
            "branches": {
              "L": {
                "coin": "J",
                "deviation": 1
              },
              "=": {
                "coin": "I",
                "deviation": -1
              },
              "R": {
                "coin": "K",
                "deviation": 1
              }
            }
          }
        }
      },
      "R": {
        "left": [
          "A",
          "B",
          "E"
        ],
        "right": [
          "C",
          "D",
          "F"
        ],
        "branches": {
          "L": {
            "left": [
              "C"
            ],
            "right": [
              "D"
            ],
            "branches": {
              "L": {
                "coin": "D",
                "deviation": -1
              },
              "=": {
                "coin": "E",
                "deviation": 1
              },
              "R": {
                "coin": "C",
                "deviation": -1
              }
            }
          },
          "=": {
            "left": [
              "A"
            ],
            "right": [
              "G"
            ],
            "branches": {
              "=": {
                "coin": "H",
                "deviation": 1
              },
              "R": {
                "coin": "G",
                "deviation": 1
              }
            }
          },
          "R": {
            "left": [
              "A"
            ],
            "right": [
              "B"
            ],
            "branches": {
              "L": {
                "coin": "B",
                "deviation": -1
              },
              "=": {
                "coin": "F",
                "deviation": 1
              },
              "R": {
                "coin": "A",
                "deviation": -1
              }
            }
          }
        }
      }
    }
  },
  "worst_case_weighings": 3
}
```

**Adaptation:** New September 2026 app instance in the mathematical family of the listed sources; no worksheet problem or prose copied.

**Sources:** [week-06-facilitator.tex — K–1: elimination becomes a decision tree; A difficult answer that stays consistent](/Users/jamespfeiffer/math-circle/lowell-math-circle-year-2/source/week-06/week-06-facilitator.tex); [Daniel Finkel and the Balance Problem - The New York Times.pdf — The Balance Problem, page 1; solutions, pages 2–3](/Users/jamespfeiffer/math-circle/external-resources/nytimes/Daniel Finkel and the Balance Problem - The New York Times.pdf); [Odd-pebble balance — Section 10.2 extra examples: counterfeit coins and decision trees](https://faculty.washington.edu/moishe/supplements/ch-10/ExtraExamples_10_2.pdf); [Odd-pebble balance — Abstract](https://arxiv.org/abs/1005.1391).

