// Authoring list for Area traps (worksheet Week 48, inside and outside
// covers). Computes each puzzle's bounds, its best plans, its paintings and
// its slide positions with the mechanic's own exact geometry and searches,
// checks them against the table in docs/covers/README.md, and writes
// dist/families/covers/covers.json. Run: node scripts/build-covers.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {boundsOf, plansOf, treeOf, childrenOf, shapeArea, stopper, patternBounds, paintPlan, squaresOf, patternOf, slideBounds, slideRoutes, fmt, K} from '../dist/families/covers/covers.js';

// Shapes, x across and y down, in big-square units.
const SHAPES = {
  triangle: {name: 'Triangle', shape: [[0, 4], [4, 4], [4, 0]], cols: 4, rows: 4},
  diamond: {name: 'Diamond', shape: [[0, 2], [2, 0], [4, 2], [2, 4]], cols: 4, rows: 4},
  plus: {name: 'Plus', shape: [[1.25, 0.25], [1.75, 0.25], [1.75, 1.25], [2.75, 1.25], [2.75, 1.75], [1.75, 1.75], [1.75, 2.75], [1.25, 2.75], [1.25, 1.75], [0.25, 1.75], [0.25, 1.25], [1.25, 1.25]], cols: 3, rows: 3},
  hexagon: {name: 'Hexagon', shape: [[1, 0.5], [3, 0.5], [4, 2], [3, 3.5], [1, 3.5], [0, 2]], cols: 4, rows: 4},
  tree: {name: 'Tree', shape: [[1.5, 0.5], [3, 2], [1.75, 2], [1.75, 3], [1.25, 3], [1.25, 2], [0, 2]], cols: 3, rows: 3}
};
const SLIDES = {
  ell: {shape: [[2, 1], [3, 1], [3, 3], [1, 3], [1, 2], [2, 2]], width: 4, height: 4},
  octagon: {shape: [[1.75, 1.25], [3.75, 1.25], [4.25, 1.75], [4.25, 3.75], [3.75, 4.25], [1.75, 4.25], [1.25, 3.75], [1.25, 1.75]], width: 5, height: 5},
  diamond: {shape: [[0.75, 2.75], [2.75, 0.75], [4.75, 2.75], [2.75, 4.75]], width: 5, height: 5}
};

const COLOURS = 'A square is green when all of it is in the shape, yellow when the shape covers part of it, and blank when the shape misses it or only touches its edge or corner.';
const BOUNDS = 'The inside is the area of the green squares, and the cover is the area of the green and yellow squares. The shape’s area is between them. The gap is the cover take away the inside: the area of the yellow squares.';
const RULES = {
  split: [COLOURS, BOUNDS, 'A big square has area 1. A split cuts a square into four quarters, coloured the same way, and uses one slot.'],
  best: 'Press Best when you think no way of using the slots does better. If one does, Best waits until you beat what you had.',
  paint: [
    'Each small square has area ¼. The painted small squares are the shape.',
    'Each big square must end as its colour says: green all painted, yellow partly painted, blank none painted.',
    'Can’t works once your painting matches the colours. Press it when no painting that matches can meet the target, then tap the number on the bar that stops it.'
  ],
  slide: [COLOURS, BOUNDS, 'The shape stays still. The grid slides a quarter of a square at a time.']
};
const CONTROLS = {
  split: 'Tap a square to split it. Tap the dot in a split square to join its quarters again. The slots show how many splits you may use. Undo takes back the last move.',
  best: 'Tap a square to split it. Tap the dot in a split square to join its quarters again. The slots show how many splits you may use. Press Best when you are sure. Undo takes back the last move.',
  paint: 'Tap a small square to paint it or clear it, or slide across several. Press Can’t, then tap a number on the bar. Undo takes back the last move.',
  slide: 'Drag the grid, or use the arrow buttons or arrow keys, to slide it. Undo takes back the last move.',
  playground: 'Choose a shape. Tap a square to split it and tap the dot in a split square to join it again. Clear joins every square.'
};
const TARGET = {'<': 'less than', '>': 'more than', '=': 'exactly'};
const PREREQUISITES = {
  split: 'See a square as four quarters and compare two numbers on a bar. No reading; a grown-up can read the goal.',
  deep: 'See quarters of quarters, and keep going after a split that changes nothing. A grown-up can read the goal.',
  best: 'Compare a few plans of splits and keep the better one. Quarters as fractions help; a grown-up can read the goal.',
  paint: 'Count small squares as quarters and compare an area with a target. A grown-up can read the target.',
  slide: 'Drag and watch the colours change. No reading or arithmetic beyond the bar.'
};
const sources = ['covers-week48', 'covers-card48', 'covers-jordan'];

// level, title, kind and data; `check` is the table in docs/covers/README.md.
const PUZZLES = [
  {level: 'easy', title: 'Down the slope', kind: 'split', shape: 'triangle', depth: 1, budget: 4, goal: {kind: 'reach', gap: 2},
    check: {start: [6, 10], end: [7, 9], plans: 1},
    idea: 'A split helps only where the shape’s edge crosses a square, and there it can only tighten the bounds.',
    hints: ['Try splitting a green square and a yellow one. Which changes the bar?', 'Each yellow square on the slanted edge loses half its yellow when you split it.', 'Split all four yellow squares.'],
    parent: {notice: 'Whether your child splits green or blank squares first and notices the bar does not move.', prompt: 'Why does a split only help on a yellow square?', explanation: 'The triangle’s area is 8, half of the 4 × 4 square. Its slanted edge runs corner to corner through four squares, each half in the triangle. Splitting one turns one quarter green and one blank and leaves two yellow, so the inside goes up ¼, the cover down ¼ and the gap down ½. All four splits give inside 7 and cover 9, the worksheet’s small-square bounds, and 8 is between them. A green or blank square splits into quarters of the same colour, so splitting it changes nothing.', extension: 'In the playground, split the yellow quarters again. What happens to the gap each time? (It halves: 4, 2, 1.)', connection: 'Inner and outer area by squares is how Jordan content measures area: a shape has an area when the gap can be made as small as you like.'},
    provenance: 'Week 48, K–1 Problem 3 and Grades 2–3 Problem 3: the triangle on the big grid (6 and 10) and with small squares (7 and 9).'},
  {level: 'easy', title: 'The L', kind: 'slide', slide: 'ell', start: [2, 2], goal: {gap: 0}, visible: 'Make the gap 0.',
    check: {start: [0, 8], end: [[0, 0]], ends: [3, 3], route: 4},
    idea: 'Moving a grid is not refining it: the bounds depend on where the grid sits, and most places are worse.',
    hints: ['Slide the grid a little and watch the yellow squares.', 'A square is yellow when an edge of the L cuts through it.', 'Slide until the grid lines run along the edges of the L.'],
    parent: {notice: 'Whether your child expects every slide to help.', prompt: 'Did any slide make the gap bigger?', explanation: 'The L is three squares, area 3. With the grid lined up it is exactly three grid squares: inside 3, cover 3, no gap. Shifted half a square sideways, its left and right edges cut through squares: inside 1, cover 5. Half a square both ways, the start here, every square it touches is cut: inside 0, cover 8. Sliding is not splitting, so it can make both bounds worse.', extension: 'Is there a place where the gap is 0 but the grid is not lined up? (No: a gap of 0 means every square is green or blank, so every edge of the L runs along grid lines.)', connection: 'The area does not depend on where the grid sits; the bounds do. Finer grids squeeze them together wherever the grid is.'},
    provenance: 'Week 48 bonus page, Problem 1: the fixed L under a sliding grid, aligned (3 and 3), half a square sideways (1 and 5) and half a square both ways (0 and 8).'},
  {level: 'easy', title: 'First painting', kind: 'paint', pattern: ['PPP', 'WWW', 'OOO'], target: {op: '<', value: 4},
    check: {stop: null, bounds: [3, 6], area: 3.75},
    idea: 'The colours bound the area strictly: more than the green squares, less than the green and yellow ones.',
    hints: ['Start with the green squares: they must be all painted.', 'The green squares make 3. Each yellow square needs some paint, but not all of it.', 'Paint one small square in each yellow square.'],
    parent: {notice: 'Whether your child paints the yellow squares fully, sees them turn green on the board, and backs off.', prompt: 'Could you paint one more small square and stay under 4?', explanation: 'The three green squares must be all painted: 3. Each yellow square must have some paint but not all: here ¼, ½ or ¾. So the area is more than 3 and less than 6. Less than 4 leaves room for less than 1 more, and the three yellow squares need at least ¼ each, ¾ in all, so each gets exactly one small square: 3¾. A second small square anywhere makes 4, which is not less than 4.', extension: 'With these colours, what is the largest area you can paint? (5¼ with these small squares; with smaller ones, as close to 6 as you like, never 6.)', connection: 'The marks fix bounds on the area, not the area: any number strictly between the inside and the cover is possible.'},
    provenance: 'Week 48, K–1 Problem 5: a shape with 3 whole and 3 partly gray squares and less than 4 big squares of gray.'},
  {level: 'medium', title: 'The plus', kind: 'split', shape: 'plus', depth: 2, budget: 5, goal: {kind: 'reach', gap: 4}, prereq: 'deep',
    check: {start: [0, 5], end: [0.375, 4.375], plans: 5},
    idea: 'A split can change nothing and still open quarters that do.',
    hints: ['Split a yellow square and look at its quarters.', 'The plus is thin, so a first split leaves all four quarters yellow. Splitting those quarters is what helps.', 'Split one square of the plus, then all four of its quarters.'],
    parent: {notice: 'Whether your child gives up on a square after a first split that changes nothing.', prompt: 'The first split did nothing. Why split its quarters?', explanation: 'The plus is half a square wide, area 2¼. Its arms run down the middles of five squares, so every quarter of those squares holds a bit of it: a first split leaves four yellow quarters and changes nothing. Splitting a quarter again turns its pieces green or blank and takes ¼ off the gap. One square and its four quarters use five splits and take 1 off: gap 4. Spreading the splits over two squares takes at most ¾ off (two first splits and three quarters), so the splits must go deep in one place.', extension: 'How many splits would make the gap 0? (25: all five squares and their twenty quarters. Try it in the playground.)', connection: 'Refining a grid never makes the bounds worse, but one step of refinement can leave them the same.'},
    provenance: 'New, from the Week 48 review card’s App fit: a split can gain nothing and open children that do. A thin plus on quarter lines replaces the card’s small diamond, whose pieces would be too thin to see.'},
  {level: 'medium', title: 'The octagon', kind: 'slide', slide: 'octagon', start: [1, 3], goal: {gap: 4}, visible: 'Make the gap 4 or less.',
    check: {start: [6, 12], end: [[1, 1]], ends: [5, 9], route: 2, worse: 'gap'},
    idea: 'A step can make the bounds worse before the next one makes them better.',
    hints: ['Slide the grid one step at a time and watch the gap.', 'A step can make the gap bigger before a later step makes it smaller.', 'Slide until all four straight sides of the octagon lie on grid lines.'],
    parent: {notice: 'Whether your child steps back when a step makes the gap bigger.', prompt: 'The gap got worse. Should you go back?', explanation: 'The octagon is a 3 by 3 square with its corners cut off, area 8½. When all four straight sides lie on grid lines, a square sits on each cut corner and only those four are yellow: inside 5, cover 9. At the start only the left and right sides lie on grid lines, so the top and bottom rows are yellow: 6 and 12. A quarter step up or down keeps those rows yellow and also catches the cut corners: 4 and 12, a gap of 8. The next quarter step lines up the top and bottom.', extension: 'Can the gap ever be less than 4 here? (No: each cut corner makes the square holding it yellow, and no square holds two of them.)', connection: 'Moving the grid changes the bounds; the area stays put between them.'},
    provenance: 'New, after Week 48 bonus page Problem 1: a slide where the way to the best place passes through a worse one.'},
  {level: 'medium', title: 'Smallest cover', kind: 'split', shape: 'hexagon', depth: 1, budget: 2, goal: {kind: 'best', measure: 'cover'}, prereq: 'best', visible: 'Make the cover as small as you can.',
    check: {start: [4, 16], best: 14.5, plans: 6},
    idea: 'A split takes at most its own square’s blank quarters off the cover, so the best splits go where most of a square is empty.',
    hints: ['Try a split and watch the cover. Which kind of square takes the most off?', 'A split takes ¼ off the cover for each quarter that turns blank.', 'Split two of the corner squares.'],
    parent: {notice: 'Whether your child compares splits by what they take off the cover, or splits the squares with the most shape in them.', prompt: 'Which squares are mostly empty?', explanation: 'A split takes ¼ off the cover for each quarter that turns blank. A corner square holds only a small tip of the hexagon, so three of its quarters turn blank: ¾ off. A middle square of the top or bottom row loses its empty half: ½ off. A side square loses nothing. So two splits take at most ¾ + ¾ off: cover 14½, from any two corners. After a right Best, each yellow square shows what its split takes off.', extension: 'Puzzle 9 asks for the smallest gap with three splits. Do the same squares win? (No: the middles of the top and bottom rows do.)', connection: 'Each split can take off at most its own square’s share, so the best plan picks the squares with the most to lose.'},
    provenance: 'Week 48, K–1 Problem 2 (split two big tiles to remove the most small tiles from the cover), with a hexagon in place of the worksheet’s trapezoid, whose bottom corners hold slivers too thin to see (review card fix 13). The bounds are the worksheet’s: 4 and 16, then a cover of 14½.'},
  {level: 'medium', title: 'Exactly six', kind: 'paint', pattern: ['OPO', 'PWP', 'WWO'], target: {op: '=', value: 6},
    check: {stop: 'cover', bounds: [3, 6]},
    idea: 'With partial squares, the area is always less than the cover.',
    hints: ['Match the colours first, then look at the area on the bar.', 'What happens to a yellow square when you paint all of it?', 'Each yellow square keeps a clear small square, so the area stays under 6. Press Can’t and tap 6.'],
    parent: {notice: 'Whether your child paints a yellow square fully, sees its mark go wrong, and works out why 6 never comes.', prompt: 'What happens to a yellow square when you paint all of it?', explanation: 'The green squares make 3. Each yellow square must keep at least one clear small square, so it adds less than 1; three of them add less than 3. The area is less than 6, at most 5¼ with these small squares. Exactly 6 would need every yellow square fully painted, and then they would be green. After a right Can’t, a minus marks each clear small square of a yellow square in the child’s own painting.', extension: 'What is the largest area that fits these colours? (5¼ here; with smaller squares, as close to 6 as you like.)', connection: 'The cover is a strict upper bound whenever some square is partial: a partial square holds some of the shape and misses some.'},
    provenance: 'Week 48, K–1 Problem 6 (keep the whole and partial squares and make the larger shape bigger) and Grades 2–3 Problem 6 (could the area be greater than 8? decide what the markings guarantee), asked of 3 whole and 3 partial squares.'},
  {level: 'medium', title: 'The diamond', kind: 'slide', slide: 'diamond', start: [3, 3], goal: {inside: 5}, visible: 'Make the inside 5.',
    check: {start: [4, 12], end: [[1, 1]], ends: [5, 13], route: 4, worse: 'inside'},
    idea: 'Getting more squares inside can mean passing through places with fewer.',
    hints: ['Slide the grid and watch how many squares turn green.', 'The places in between have fewer green squares. Keep going.', 'Slide until one square sits right in the middle of the diamond.'],
    parent: {notice: 'Whether your child keeps going when the green squares drop.', prompt: 'Going from 4 green squares to 5 meant passing through 2. Why?', explanation: 'The diamond’s diagonals are 4 long, area 8. With its centre on a grid point, the four squares round the centre are inside it: 4. With its centre in the middle of a square, that square and its four neighbours are inside: 5, and no other place on this grid does better. Everywhere between, the diamond’s slanted edges cut those squares and only 2 or 3 stay green.', extension: 'Where is the cover smallest? (Back at the start: 12. The best place for the inside is not the best place for the cover.)', connection: 'The inside and the cover can be best at different places of the grid, and neither tells the area.'},
    provenance: 'New, after Week 48 bonus page Problem 1, with the worksheet’s diamond (diagonals 4) under a sliding grid.'},
  {level: 'hard', title: 'Smallest gap', kind: 'split', shape: 'hexagon', depth: 1, budget: 3, goal: {kind: 'best', measure: 'gap'}, prereq: 'best', visible: 'Make the gap as small as you can.',
    check: {start: [4, 16], best: 9, plans: 4},
    idea: 'Different goals pick different squares: the gap counts both what turns green and what turns blank.',
    hints: ['Try a split and watch the gap. Which kind of square takes the most off?', 'A split takes ¼ off the gap for each quarter that turns green or blank.', 'Split three of the four yellow squares in the middle of the top and bottom rows.'],
    parent: {notice: 'Whether your child reuses puzzle 6’s corners.', prompt: 'Why do the corners win for the cover but not for the gap?', explanation: 'A split takes ¼ off the gap for each quarter that turns green or blank. A middle square of the top or bottom row turns two quarters blank and two green: 1 off. A corner turns three blank: ¾. A side square turns one green: ¼. Three splits take at most 3 off: gap 9, from three of the four middles. For the cover alone the corners win; for the gap, the middles. After a right Best, each yellow square shows what its split takes off.', extension: 'With four splits, which plan is best? (All four middles: gap 8.)', connection: 'A split removes at most its own square’s uncertainty, so a best plan is a choice of the squares with the most to remove.'},
    provenance: 'Week 48, Grades 4–5 Problem 5 (split exactly three big squares to most reduce the gap), with the hexagon of puzzle 6 in place of the worksheet’s trapezoid; the bounds are the worksheet’s, 4 and 16, then a gap of 9.'},
  {level: 'hard', title: 'The tree', kind: 'split', shape: 'tree', depth: 2, budget: 6, goal: {kind: 'reach', gap: 2}, prereq: 'deep',
    check: {start: [1, 5], end: [1.75, 3.75], plans: 6, greedy: 2.125},
    idea: 'Look past the first split: one that gains nothing now can be the one that reaches the goal.',
    hints: ['Watch what each split takes off the gap.', 'The trunk’s first split takes nothing off, but each of its quarters then takes off ¼.', 'Split the three yellow squares of the crown, then the trunk and two of its quarters.'],
    parent: {notice: 'Whether your child avoids the trunk because its first split changes nothing.', prompt: 'The trunk’s split did nothing. Was it wasted?', explanation: 'The tree’s area is 2¾. Each crown square takes ½ off the gap on its first split, and its quarters then take only ⅛ each. The trunk is thin: its first split takes nothing off, but each of its quarters then takes ¼. With six splits, the crown’s three first splits take 1½ off, and the other three must go to the trunk and two of its quarters for the last ½: gap 2. Spending them on crown quarters takes only ⅜ off and leaves 2⅛.', extension: 'What is the smallest gap with seven splits? (1¾: the crown, the trunk and three of its quarters.)', connection: 'Choosing splits under a budget is a planning problem: the best next split is not always the one that gains most now.'},
    provenance: 'New, from the Week 48 review card’s App fit (nested splits; a split can gain nothing and open children that do).'},
  {level: 'hard', title: 'Exactly seven', kind: 'paint', pattern: ['PWWP', 'PWWP', 'OOOO'], target: {op: '=', value: 7},
    check: {stop: null, bounds: [4, 8], area: 7},
    idea: 'Each partial square adds more than nothing and less than a whole: here as much as it can, ¾ each.',
    hints: ['Match the colours first, then watch the area.', 'The green squares make 4. Each yellow square can add at most ¾ and stay yellow.', 'Paint three small squares in each yellow square.'],
    parent: {notice: 'Whether your child decides 7 is too close to the cover of 8.', prompt: 'How much can a yellow square add and stay yellow?', explanation: 'The four green squares make 4. Each yellow square can add up to ¾ while keeping a clear small square, and four of them add up to 3: exactly 7, with three small squares painted in every yellow square. One fewer anywhere gives 6¾.', extension: 'Is 7½ possible with these colours? (Not with these small squares, which come in quarters; with smaller ones, yes: anything between 4 and 8.)', connection: 'Every area strictly between the inside and the cover is possible: the bounds are the only constraint the marks make.'},
    provenance: 'Week 48, Grades 2–3 Problem 5: a shape with exactly 4 whole and 4 partly gray squares and an area greater than 7, asked here as exactly 7.'},
  {level: 'hard', title: 'Exactly four', kind: 'paint', pattern: ['OPPO', 'PWWP', 'OWWO'], target: {op: '=', value: 4},
    check: {stop: 'inside', bounds: [4, 8]},
    idea: 'With partial squares, the area is always more than the inside.',
    hints: ['Match the colours first, then look at the area on the bar.', 'To stay yellow, a square needs at least one painted small square.', 'The green squares make 4 and each yellow square adds some more, so the area is over 4. Press Can’t and tap 4.'],
    parent: {notice: 'Whether your child clears the yellow squares to bring the area down, and sees them turn blank.', prompt: 'How small can a yellow square’s paint be?', explanation: 'The four green squares make 4, and each yellow square needs at least one painted small square, so the area is more than 4: at least 5 with these small squares. Exactly 4 would leave the yellow squares clear, and then they would be blank. After a right Can’t, a plus marks each painted small square of a yellow square in the child’s own painting.', extension: 'What is the smallest area that fits these colours? (5 here; with smaller squares, as close to 4 as you like.)', connection: 'The inside is a strict lower bound whenever some square is partial.'},
    provenance: 'Week 48, Grades 2–3 Problem 6: could the area be smaller than 4 big squares? Decide what the square markings guarantee.'}
];

const id = n => `covers-${String(n).padStart(2, '0')}`;
const eq = (a, b, why) => assert.ok(Math.abs(a - b) < 1e-9, `${why}: ${a} is not ${b}`);
const out = PUZZLES.map((item, k) => {
  const number = k + 1, pid = id(number);
  let q, solution, objective, visible;
  if (item.kind === 'split') {
    const s = SHAPES[item.shape];
    q = {mode: 'split', shape: s.shape, cols: s.cols, rows: s.rows, depth: item.depth, budget: item.budget, goal: item.goal};
    const b0 = boundsOf(q, []), plans = plansOf(q);
    assert.deepEqual([b0.inside, b0.cover], item.check.start, `${pid}: starting bounds`);
    assert.equal(plans.good.length, item.check.plans, `${pid}: plans that work`);
    if (item.goal.kind === 'reach') {
      assert.ok(b0.gap > item.goal.gap, `${pid}: not solved at the start`);
      assert.ok(plans.good.every(g => g.splits.length === item.budget), `${pid}: every plan that works uses the whole budget`);
      const w = plans.good[0].splits, b = boundsOf(q, w);
      assert.deepEqual([b.inside, b.cover], item.check.end, `${pid}: bounds after the witness`);
      solution = {splits: w, inside: b.inside, cover: b.cover, gap: b.gap, plans: plans.good.map(g => g.splits)};
      objective = `Split squares to make the gap ${fmt(item.goal.gap)} or less, using at most ${item.budget} splits.`;
      visible = `Make the gap ${fmt(item.goal.gap)} or less.`;
      if (item.check.greedy) {
        // Leaving the trunk alone, the splits go to the crown and its yellow
        // quarters, and the best of those falls short.
        const {nodes} = treeOf(q), crown = ['1,0,0', '0,1,0', '2,1,0'], kids = crown.flatMap(childrenOf).filter(c => nodes.get(c).status === 'part');
        let greedy = Infinity;
        for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) for (let l = j + 1; l < kids.length; l++) greedy = Math.min(greedy, boundsOf(q, [...crown, kids[i], kids[j], kids[l]]).gap);
        eq(greedy, item.check.greedy, `${pid}: the best plan without the trunk`);
        assert.ok(greedy > item.goal.gap);
        eq(plansOf({...q, budget: 7, goal: {kind: 'best', measure: 'gap'}}).best, 1.75, `${pid}: the extension with seven splits`);
      }
    } else {
      assert.equal(item.depth, 1, `${pid}: Best puzzles are one level deep, where the gains add`);
      eq(plans.best, item.check.best, `${pid}: best ${item.goal.measure}`);
      solution = {best: plans.best, splits: plans.good[0].splits, plans: plans.good.map(g => g.splits)};
      objective = `Use ${item.budget} splits to make the ${item.goal.measure} as small as you can, then press Best.`;
      visible = item.visible;
    }
    const area = shapeArea(s.shape);
    assert.ok(b0.inside < area[0] / area[1] && area[0] / area[1] < b0.cover, `${pid}: the area is between the bounds`);
  } else if (item.kind === 'paint') {
    q = {mode: 'paint', pattern: item.pattern, cols: item.pattern[0].length, rows: item.pattern.length, target: item.target};
    const pb = patternBounds(q), stop = stopper(q);
    assert.deepEqual([pb.inside, pb.cover], item.check.bounds, `${pid}: the marks’ bounds`);
    assert.equal(stop, item.check.stop, `${pid}: possible or which bound stops it`);
    if (stop) {
      assert.ok(item.target.value === (stop === 'inside' ? pb.inside : pb.cover), `${pid}: an impossible target sits on a bound, so no grid resolution misleads`);
      solution = {cant: stop, bound: stop === 'inside' ? pb.inside : pb.cover};
    } else {
      const plan = paintPlan(q, []), marks = patternOf(q), painted = [];
      marks.forEach((m, big) => { const sq = squaresOf(q, big); if (m === 'whole') painted.push(...sq); if (m === 'part') painted.push(...sq.slice(0, plan.get(big))); });
      painted.sort((x, y) => x - y);
      eq(painted.length / (K * K), item.check.area, `${pid}: the witness’s area`);
      solution = {painted, area: painted.length / (K * K)};
    }
    objective = `Paint small squares so every big square matches its colour and the area is ${TARGET[item.target.op]} ${fmt(item.target.value)}, or press Can’t and tap the number that stops it.`;
    visible = `Match the colours with area ${TARGET[item.target.op]} ${fmt(item.target.value)}.`;
  } else {
    const s = SLIDES[item.slide];
    q = {mode: 'slide', ...s, steps: 4, start: item.start, goal: item.goal};
    const b0 = slideBounds(q, item.start), routes = slideRoutes(q), ends = [...routes].filter(([, v]) => v === 0).map(([key]) => key.split(',').map(Number));
    assert.deepEqual([b0.inside, b0.cover], item.check.start, `${pid}: starting bounds`);
    assert.deepEqual(ends, item.check.end, `${pid}: the places that meet the goal`);
    const be = slideBounds(q, ends[0]);
    assert.deepEqual([be.inside, be.cover], item.check.ends, `${pid}: bounds at the goal`);
    assert.equal(routes.get(item.start.join()), item.check.route, `${pid}: fewest steps`);
    // A route of nudges from the start, and how bad it gets on the way.
    const path = [], ways = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};
    let at = item.start;
    while (routes.get(at.join()) > 0) {
      const [way, [dx, dy]] = Object.entries(ways).find(([, [dx, dy]]) => routes.get([(at[0] + dx + 4) % 4, (at[1] + dy + 4) % 4].join()) === routes.get(at.join()) - 1);
      at = [(at[0] + dx + 4) % 4, (at[1] + dy + 4) % 4];
      path.push(way);
    }
    // Moving can make it worse: every first step from the start does.
    if (item.check.worse) for (const [dx, dy] of Object.values(ways)) {
      const b = slideBounds(q, [(item.start[0] + dx + 4) % 4, (item.start[1] + dy + 4) % 4]);
      assert.ok(item.check.worse === 'gap' ? b.gap > b0.gap : b.inside < b0.inside, `${pid}: a first step makes the ${item.check.worse} worse`);
    }
    solution = {at: ends[0], route: path, inside: be.inside, cover: be.cover};
    objective = item.goal.gap === 0 ? 'Slide the grid until no square is yellow: a gap of 0.' : item.goal.gap !== undefined ? `Slide the grid until the gap is ${item.goal.gap} or less.` : `Slide the grid until the inside is ${item.goal.inside}.`;
    visible = item.visible;
  }
  const mode = item.kind === 'split' && item.goal.kind === 'best' ? 'best' : item.kind;
  return {
    id: pid, number, title: item.title, difficulty_level: item.level, familyTitle: 'Area traps', mechanic: 'covers', band: 'all', revision: 1, sourceDocument: 'docs/covers/README.md',
    parameters: q,
    objective, visibleObjective: visible, instruction: objective,
    controls: CONTROLS[mode],
    rules: mode === 'best' ? [...RULES.split, RULES.best] : RULES[item.kind],
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq || item.kind], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

// The playground: every split shape with no budget, two levels deep except
// the hexagon, whose second level has pieces too thin to see.
const play = Object.fromEntries(['triangle', 'diamond', 'plus', 'hexagon', 'tree'].map(k => [k, {name: SHAPES[k].name, shape: SHAPES[k].shape, cols: SHAPES[k].cols, rows: SHAPES[k].rows, depth: k === 'hexagon' ? 1 : 2}]));
const playground = {
  id: 'covers-playground', number: 0, title: 'Area traps playground', difficulty_level: 'playground', familyTitle: 'Area traps', mechanic: 'covers', band: 'playground', revision: 1, sourceDocument: 'docs/covers/README.md',
  parameters: {mode: 'playground', shapes: play},
  objective: 'Split and join squares over any shape and watch the inside and the cover close in on its area.', visibleObjective: '',
  instruction: 'Split and join squares over any shape and watch the inside and the cover close in on its area.',
  controls: CONTROLS.playground,
  rules: [COLOURS, BOUNDS, 'A split cuts a square into four quarters, coloured the same way. Quarters split again, except on the hexagon.'],
  idea: 'Free play: split squares and their quarters over five shapes and watch the bounds close in.',
  prerequisites: 'None. A grown-up or a partner can set a goal: a gap of 1, or a cover under the next whole number.',
  hints: ['Split a yellow square.', 'Splitting a green or blank square never moves the bar.', 'Split every yellow square, then every yellow quarter.'],
  parent: {notice: 'Whether your child sees that the bar only ever tightens: the green grows and the cover shrinks.', prompt: 'Can a split ever make the inside smaller or the cover bigger?', explanation: 'No. A green square splits into four green quarters and a blank one into four blank quarters, so nothing changes there. A yellow square’s quarters are each green, yellow or blank: green quarters add to the inside, blank ones come off the cover, and yellow ones stay. So every split keeps or tightens both bounds, and the shape’s area (8 for the triangle and the diamond, 9 for the hexagon, 2¼ for the plus, 2¾ for the tree) always stays between them.', extension: 'Which shapes can reach a gap of 0? (Only the plus, at the second level, though its first level changes nothing. The triangle and the diamond halve their gap at each level, and no shape with a slanted edge ever reaches 0.)', connection: 'These are inner and outer Jordan content: a shape has an area when the gap can be made as small as wanted. Grades 4–5 Problem 6 asks why the inside can never go down.', sourceIds: sources},
  provenance: 'Week 48, Grades 4–5 Problem 6 (can a split lower the inside or raise the cover?), with the shapes of the puzzles.'
};
// The gap with every square split at each level, for the notes' extension
// (and puzzle 1's): the triangle 4, 2, 1; the diamond 8, 4, 2; the plus 5, 5, 0.
const gaps = {triangle: [4, 2, 1], diamond: [8, 4, 2], plus: [5, 5, 0]};
for (const [k, s] of Object.entries(play)) {
  const q = {...s, goal: {kind: 'free'}}, b = boundsOf(q, []), area = shapeArea(s.shape);
  assert.ok(b.inside < area[0] / area[1] && area[0] / area[1] < b.cover, `playground ${k}: area between the bounds`);
  if (!gaps[k]) continue;
  const all = [...treeOf(q).nodes.values()].filter(n => n.d < q.depth).sort((x, y) => x.d - y.d || x.y - y.y || x.x - y.x);
  assert.deepEqual([0, 1, 2].map(d => boundsOf(q, all.filter(n => n.d < d).map(n => n.key)).gap), gaps[k], `playground ${k}: the gap at each level`);
}

const json = {
  title: 'Area traps',
  version: 1,
  families: [{id: 'covers', title: 'Area traps', mathematics: 'A shape lies on a grid of unit squares. A square is whole when the shape fills it, partial when the shape covers part of it, and outside when the shape misses it or only touches an edge or a corner. The whole squares give the inside, a lower bound for the area; the whole and partial squares give the cover, an upper bound; the gap between them is the area of the partial squares. Splitting a square into four can only raise the inside and lower the cover, and it removes at most that square’s own share of the gap; one split can remove nothing and still open quarters that remove something, so spending a budget of splits is a planning problem. Turned round, if the marks of whole and partial squares are fixed, the area can be any number strictly between the inside w and the cover w + p, and no other, because a partial square holds some of the shape and misses some. Sliding a grid is not refining it, so a slide can make both bounds worse. These are the inner and outer Jordan content of the shape; a shape has an area when the gap can be made as small as wanted. Squares are classified exactly, by clipping the shape to each square in rational arithmetic.', rules: [COLOURS, BOUNDS], sourceIds: sources}],
  sources: [
    {id: 'covers-week48', title: 'Bellingham Math Circle — Week 48: Inside and outside covers (student packets, bonus page and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-48', kind: 'local curriculum'},
    {id: 'covers-card48', title: 'Week 48 review card and math check (bounds at both scales, best splits, the marks’ range w < area < w + p, the sliding L; fix 13 and App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-48.md', kind: 'local curriculum'},
    {id: 'covers-jordan', title: 'A. Sapozhnikov — Mathematics 3, lecture notes, §1.2, pages 2–4 (inner and outer Jordan content with nested dyadic boxes), as cited in the Week 48 adult guide', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/lowell-math-circle-year-2/week-48/week-48-facilitator.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/covers/covers.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level.padEnd(6)} ${p.parameters.mode.padEnd(5)} ${p.visibleObjective.padEnd(40)} ${JSON.stringify(p.solution).slice(0, 90)}`).join('\n'));
