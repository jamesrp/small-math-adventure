// Authoring list for Circle strings (worksheet Week 12, Catalan bijections).
// Computes each puzzle's answer with the mechanic's own methods (completions
// region by region, the stack rule, the tree walk, the swap distance), checks
// it against the table in docs/strings/README.md, and writes
// dist/families/strings/strings.json. Run: node scripts/build-strings.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {completions, regions, keyOf, pairingOfWord, treeOfWord, walkOf, treeOfStrings, swapDistance, dBeforeU, heights, swapAt, isPath, corners, mountainOf, stuckSides, neighbours} from '../dist/families/strings/strings.js';

const sources = ['strings-week12', 'strings-card12', 'strings-stanley'];
const COMMON = [
  'Tap a dot, then another, to join them with a string. Each dot takes one string.',
  'Strings may not cross. A string that would cross another is not laid.',
  'Tap a dot with your string on it to take that string off.'
];
// Only where pairings are collected: a turned copy is a different pairing.
const DIFFERENT = 'Two pairings are different when some dot has a different partner, even if one looks like a turn of the other.';
const RULES = {
  finish: [...COMMON, 'Dark strings stay where they are.', 'Pair every dot. If that can’t be done, press Can’t, then tap the part of the circle where the free dots can’t all get partners.'],
  every: [...COMMON, DIFFERENT, 'Each pairing you make goes on the shelf below. Press That’s all when you think you have every one. It says if there is another.'],
  everyFixed: [...COMMON, DIFFERENT, 'Dark strings stay where they are.', 'Each pairing you finish goes on the shelf below. Press That’s all when you think you have every way. It says if there is another.'],
  neighbours: [...COMMON, 'Two dots next to each other round the circle are neighbours, and here no string may join them.', 'If it can’t be done, press Can’t, then tap a string with stuck dots on one side: one left over (or any odd number), or just two neighbours.'],
  decode: [...COMMON, 'Read the dots from 1 onwards. Each string makes an up step at its first dot and a down step at its other dot.', 'Lay strings so the steps make the path. A step turns green when its dot goes the right way and red when it goes the other way.'],
  tree: ['Tap a dot of the tree to give it a new child on the right. Tap an edge to take it away, with everything below it.', 'Walk round the tree from the root, each child’s branch in turn from left to right: step up for every edge going away from the root and down for every edge coming back.', 'Grow a tree whose walk is the path. Your walk is drawn over it in yellow.'],
  treepair: [...COMMON, 'Your strings make a tree, one edge for each string. A string hangs below the string just around it, or from the root when no string is around it. Strings hanging from the same place go left to right in the order of their dots.', 'Lay strings whose tree, drawn on the right, matches the dark tree on the left.'],
  swaps: ['Each step of the path goes up or down. Tap a corner to swap the two steps there: a low corner (down then up) becomes a peak, and a peak becomes a low corner.', 'The path may not go below the bottom line.', 'Tap the corner you just swapped to take that swap back. A dot appears for each swap.', 'Reach the dashed path in the fewest swaps.']
};
const CONTROLS = {
  circle: 'Tap a dot, then another, to join them. Tap the picked dot again to put it down, or a dot with your string to take the string off. Arrow keys move round the dots; Enter or Space taps. Undo takes back the last move.',
  finish: 'Tap a dot, then another, to join them. Tap a dot with your string to take it off. Can’t, then a tap on a part of the circle, says that part is trapped; press Can’t again to put it away. Undo takes back the last move.',
  every: 'Tap a dot, then another, to join them. Tap a dot with your string to take it off. Each full pairing goes on the shelf; That’s all says you have every one. Undo takes back the last move.',
  neighbours: 'Tap a dot, then another, to join them. Tap a dot with your string to take it off. Can’t, then a tap on one of your strings, says the dots beside it are stuck; press Can’t again to put it away. Undo takes back the last move.',
  tree: 'Tap a dot of the tree to give it a new child; tap an edge to take it away with everything below. Tab and Enter or Space work too. Undo takes back the last move.',
  swaps: 'Tap a ringed corner of the path to swap its two steps. Tap the same corner again to take the swap back. Tab and Enter or Space work too. Undo takes back the last swap.',
  playground: 'Tap a dot, then another, to join them; tap a dot with a string to take it off. − and + change the number of dots, and Clear takes every string off.'
};
const OBJECTIVE = {
  finish: 'Pair every dot without crossing a string, or press Can’t and tap the part of the circle where the free dots can’t all get partners.',
  every: 'Find every way to pair the dots with strings that don’t cross, then press That’s all.',
  everyFixed: 'Find every way to finish the pairing around the dark string, then press That’s all.',
  neighbours: 'Pair every dot without joining two neighbours, or press Can’t and tap a string with stuck dots beside it.',
  decode: 'Lay strings that make this path: an up step at the first dot of each string and a down step at its other dot.',
  tree: 'Grow a tree whose walk makes this path: up for each edge away from the root, down for each edge back, each child’s branch from left to right.',
  treepair: 'Lay strings whose tree matches the dark tree: strings between a string’s two dots hang below it.',
  swapsMountain: 'Turn the path into the mountain in the fewest swaps.',
  swaps: 'Make the path match the dashed one in the fewest swaps.'
};
const VISIBLE = {
  finish: 'Pair every dot.', every: 'Find every pairing.', everyFixed: 'Find every way to finish.', neighbours: 'Pair every dot without joining neighbours.',
  decode: 'Lay strings that make this path.', tree: 'Grow a tree whose walk makes this path.', treepair: 'Lay strings whose tree matches.',
  swapsMountain: 'Make the mountain in the fewest swaps.', swaps: 'Reach the dashed path in the fewest swaps.'
};
const PREREQ = {
  circle: 'Tap two dots to join them and see when strings cross. No reading once a grown-up has read How to play.',
  count: 'Count up to ten dots on each side of a string.',
  every: 'Keep track of the pairings already on the shelf, and decide when none is left.',
  path: 'Read up and down steps in order and follow them along the dots.',
  tree: 'Follow a walk round a tree, branch by branch, from left to right. A grown-up may read the rule once.',
  swaps: 'See where one path is above or below another; count small numbers.'
};

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Six dots', mode: 'every', n: 6, fixed: [], check: {count: 5}, prereq: 'every',
    idea: 'Dot 1 can only join 2, 4 or 6, and each choice leaves the rest to finish: 2 + 1 + 2 pairings.',
    hints: ['Keep one string and change the others. Did a dot get a new partner?', 'Dot 1 can only join 2, 4 or 6: joining 3 or 5 leaves an odd number of dots on one side.', 'Dot 1 joined to 2 or to 6 gives two pairings each; joined to 4, one.'],
    parent: {notice: 'Whether your child changes one string at a time, and whether a turned copy of a pairing counts as new. Here it does: the dots keep their numbers, so 1–2, 3–4, 5–6 and 1–6, 2–3, 4–5 are different.', prompt: 'Where can dot 1’s string go? Can it go to 3?', explanation: 'Dot 1 can join 2, 4 or 6. Joining 3 or 5 leaves one or three dots on one side, and no string can cross over to the other side. With 1–2 the other four dots pair in two ways (3–4 with 5–6, or 3–6 with 4–5); with 1–4 only 2–3 with 5–6; with 1–6 the four inside pair in two ways. So there are 2 + 1 + 2 = 5.', extension: 'How many ways for four dots? For eight? (2 and 14: puzzle 10.)', connection: 'Noncrossing pairings of 2n points are counted by the Catalan numbers 1, 1, 2, 5, 14, 42, …; sorting by the first dot’s partner gives C(n) = C(0)C(n − 1) + C(1)C(n − 2) + … + C(n − 1)C(0).'},
    provenance: 'Week 12 K–1 Problems 1–2 and grades 2–3 Problem 1 (six dots; the grades 2–3 page uses a row of dots).'},
  {number: 2, level: 'easy', title: 'One string down', mode: 'finish', n: 8, fixed: [[1, 4]], check: {ways: 2}, prereq: 'circle',
    idea: 'A string splits the circle; the dots on each side can only pair on their own side.',
    hints: ['Which dots can still reach each other without crossing the dark string?', 'Dots 2 and 3 are alone inside the dark string. Join them.', 'Then pair 5, 6, 7 and 8: 5–6 with 7–8, or 5–8 with 6–7.'],
    parent: {notice: 'Whether your child tries to join 2 or 3 to a dot beyond the dark string, and sees it refused.', prompt: 'Why must 2 and 3 join each other?', explanation: 'The dark string from 1 to 4 leaves 2 and 3 on one side and 5, 6, 7, 8 on the other. A string from one side to the other would cross it, so 2 joins 3 and the other four pair among themselves: 5–6 with 7–8, or 5–8 with 6–7. Either one solves the puzzle, and Can’t is refused.', extension: 'With the dark string from 1 to 6 instead, there are again two ways. Why?', connection: 'A fixed chord can be completed without crossings exactly when it leaves an even number of points on each side.'},
    provenance: 'Week 12 K–1 Problem 3, the 1–4 start.'},
  {number: 3, level: 'easy', title: 'Seven dots', mode: 'finish', n: 7, fixed: [], check: {ways: 0, attempt: [[2, 3]], gap: 1}, prereq: 'circle',
    idea: 'Each string takes two dots, so an odd number of dots can never all be paired.',
    hints: ['Join two dots, then two more. How many are left each time?', 'Each string takes two dots: 7 free, then 5, then 3, then 1.', 'Lay strings until you are stuck, press Can’t and tap the part of the circle where a dot is left over.'],
    parent: {notice: 'Whether your child keeps trying new strings, or counts what is left after each one.', prompt: 'How many dots are free after one string? After two?', explanation: 'Each string takes two dots, so the free dots go 7, 5, 3, 1: always odd, never 0. However the strings go, some part of the circle has an odd number of free dots, and that part is the certificate the app asks for after Can’t. It then shades the whole circle and rings all seven dots.', extension: 'Which of 3, 4, 5, 6 and 10 dots can be paired? (The even ones; joining neighbours round the circle always works.)', connection: 'Parity: a perfect matching needs an even number of points.'},
    provenance: 'Week 12 K–1 Problem 5, its seven-dot circle.'},
  {number: 4, level: 'easy', title: 'Strings from a path', mode: 'decode', word: 'UUDUDD', check: {pairing: '1-6 2-3 4-5'}, prereq: 'path',
    idea: 'Each down step closes the most recent string still open, so the path decides the strings.',
    hints: ['Steps 1 and 2 go up, so dots 1 and 2 each start a string. Which string does step 3 end?', 'A down step ends the newest string still open: dot 3 joins dot 2.', 'Join 2 and 3, then 4 and 5, then 1 and 6.'],
    parent: {notice: 'Whether your child joins 1 and 3 first and then finds that 2 can’t reach a later dot without crossing.', prompt: 'Could this path come from a different pairing?', explanation: 'Dots 1 and 2 start strings, and dot 3 ends one. If 3 ended 1’s string, 2’s string would have to cross it to reach a later dot, so 3 joins 2. Then 4 starts a string and 5 ends it, and 6 ends 1’s string: 1–6, 2–3, 4–5. No other pairing without crossings has this path.', extension: 'Lay the strings for up, down, up, up, down, down. (1–2, 3–6, 4–5.)', connection: 'The stack rule is a bijection between noncrossing pairings and Dyck paths.'},
    provenance: 'Week 12 grades 2–3 Problem 3, the first path (dots in a row there).'},
  {number: 5, level: 'medium', title: 'Straight across', mode: 'finish', n: 8, fixed: [[1, 5]], check: {ways: 0, attempt: [[2, 3]], gap: 3}, prereq: 'count',
    idea: 'A string that leaves an odd number of dots on a side can never be finished.',
    hints: ['Count the dots on each side of the dark string.', 'Three dots on each side, and no string can cross over.', 'Lay a string on one side, press Can’t and tap the part of the circle where a dot is left alone.'],
    parent: {notice: 'Whether your child counts the sides before laying strings, or after getting stuck.', prompt: 'What happens to the third dot on each side?', explanation: 'The dark string from 1 to 5 leaves 2, 3, 4 on one side and 6, 7, 8 on the other. Strings stay on their own side and take two dots each, so one dot on each side is always left. After Can’t and a tap on the part where a dot is left alone, the app shades that side of the dark string and rings its three dots.', extension: 'Which dark strings from dot 1 can be finished on eight dots? (1–2, 1–4, 1–6 and 1–8.)', connection: 'A fixed chord can be completed exactly when it leaves an even number of points on each side.'},
    provenance: 'Week 12 K–1 Problem 3, the 1–5 start.'},
  {number: 6, level: 'medium', title: 'Every way to finish', mode: 'every', n: 10, fixed: [[1, 6]], check: {count: 4}, prereq: 'every',
    idea: 'The two sides are finished separately, so the ways multiply: two inside times two outside.',
    hints: ['Finish one side in a new way and keep the other.', 'Dots 2 to 5 pair in two ways, and so do dots 7 to 10.', 'Two ways inside times two ways outside: four in all.'],
    parent: {notice: 'Whether your child changes one side at a time, and notices that the two sides don’t affect each other.', prompt: 'If you keep this side, how many ways are there for the other?', explanation: 'The dark string from 1 to 6 leaves 2, 3, 4, 5 on one side and 7, 8, 9, 10 on the other. Four dots in a row pair in two ways (two neighbour strings, or the outer two around the inner two), and any choice inside goes with any choice outside: 2 × 2 = 4.', extension: 'With the dark string from 1 to 8 instead, how many ways? (Six dots inside give 5, two outside give 1: 5.)', connection: 'The product rule behind the Catalan recurrence C(n) = Σ C(i) C(n − 1 − i).'},
    provenance: 'New, from Week 12 K–1 Problem 3’s “Find every way to finish it”, on ten dots.'},
  {number: 7, level: 'medium', title: 'No neighbours', mode: 'neighbours', n: 10, check: {attempt: [[1, 3]], cert: [1, 3]}, prereq: 'circle',
    idea: 'A string with no string on one side shuts its dots in; in a full pairing that side is empty, so the string joins neighbours.',
    hints: ['Lay a string, then look at the dots on its smaller side.', 'The dots on one side of a string can only pair with each other. What is left in the end?', 'Join 1 and 3: dot 2 is alone beside it. Press Can’t and tap that string.'],
    parent: {notice: 'Whether your child sees that every string shuts in the dots on each side, and looks for the smallest side.', prompt: 'What can the dots on this side of the string join?', explanation: 'The dots on one side of a string can only pair with each other. In a finished pairing, take an innermost string: one with no other string on one side (from any string, keep moving to a string on its smaller side). Any dot on that side would need a string there too, so there is no dot: the string joins neighbours. So every pairing joins two neighbours. The app asks for this on the child’s own try: after Can’t, tap a string with no string on one side and, there, an odd number of dots (one is left over) or exactly two (they are neighbours). Four or more dots there are not stuck yet, since a string that skips one dot still fits; the app says “A string can still go beside it.”', extension: 'With crossings allowed it can be done: on eight dots, 1–3, 2–4, 5–7 and 6–8 join no neighbours. Try it on paper.', connection: 'Every noncrossing perfect matching of points on a circle contains a pair of neighbours (an innermost chord).'},
    provenance: 'Week 12 K–1 Problem 6 (eight dots), moved to ten dots: on eight, every first string already leaves a stuck side, while on ten a first string such as 1–6 does not.'},
  {number: 8, level: 'medium', title: 'Grow a tree', mode: 'tree', word: 'UUDUDUDD', check: {tree: [[[], [], []]]}, prereq: 'tree',
    idea: 'The walk can be undone: each up step adds a new child on the right, each down step goes back to the parent.',
    hints: ['The first step goes up: the root needs a child.', 'After the first step up, the path goes up and down three times before it comes back down.', 'The root has one child, and that child has three children.'],
    parent: {notice: 'Whether your child walks the tree with a finger as the yellow walk grows.', prompt: 'Where is the walk after the second step?', explanation: 'Read the path as a walk. Up 1 goes from the root to a new child; up 2 goes to a child of that child and down 3 comes back; steps 4–5 and 6–7 do the same twice more; down 8 returns to the root. So the root has one child with three children. At each up step there is only one place for the new edge (a new child on the right of where the walk is), so no other tree has this walk.', extension: 'Grow the tree for up, down, up, up, down, down. (The root has two children; the second has one child.)', connection: 'Ordered trees with n edges correspond to Dyck paths of length 2n through the contour walk.'},
    provenance: 'Week 12 grades 4–5 Problem 3, the code UUDUDUDD.'},
  {number: 9, level: 'medium', title: 'Fewest swaps', mode: 'swaps', start: 'UDUDUDUD', target: 'UUUUDDDD', check: {best: 6}, prereq: 'swaps',
    idea: 'Each swap changes the number of down steps before up steps by one; the start has six, so six swaps are needed.',
    hints: ['Which corners make the path higher? Which make it lower?', 'Lowering a peak never helps on the way to the mountain.', 'Raise low corners only: six swaps.'],
    parent: {notice: 'Whether your child ever lowers a peak, and whether after a try or two they can say how many swaps it will take before starting.', prompt: 'Can you tell how many swaps a path needs before you start?', explanation: 'For each down step, count the up steps after it: 3 + 2 + 1 = 6. Swapping a low corner (down, up) to a peak lowers that count by exactly one, the other swap raises it by one, and the mountain has none. So no route takes fewer than 6, and raising low corners always takes exactly 6. The solved board numbers the six diamonds between the start and the mountain, one per swap, and tags each down step of the start with its count.', extension: 'How many for up, up, down, down, up, up, down, down? (2 + 2 = 4.)', connection: 'On Dyck paths, the distance to the highest path by adjacent swaps is the number of inversions (down steps before up steps), the area between the paths in diamonds.'},
    provenance: 'Week 12 return visit Problem 4, the first start, with its guide’s six diamonds.'},
  {number: 10, level: 'hard', title: 'Eight dots', mode: 'every', n: 8, fixed: [], check: {count: 14}, prereq: 'every',
    idea: 'Sort by dot 1’s partner: 2, 4, 6 or 8 give 5, 2, 2 and 5 pairings.',
    hints: ['Choose a partner for dot 1 and find every pairing with it before moving on.', 'Dot 1 can join 2, 4, 6 or 8. Two pairings are the same only if every dot has the same partner.', 'Dot 1 to 2, or to 8, leaves six dots: five ways each. To 4, or to 6: two ways each.'],
    parent: {notice: 'Whether your child organises the search, for instance by dot 1’s partner, or makes pairings at random and relies on Found already.', prompt: 'How can you be sure none is missing?', explanation: 'Dot 1 joins 2, 4, 6 or 8 (an odd jump leaves an odd number on one side). Joined to 2, the other six dots pair in 5 ways; joined to 8, the six inside do too; joined to 4, two inside and four outside give 1 × 2; joined to 6, four inside and two outside give 2 × 1. In all 5 + 2 + 2 + 5 = 14. Two drawings are the same only when every dot has the same partner: sort them by dot 1’s partner, then compare dot by dot within each group.', extension: 'Ten dots give 42: 14 + 5 + 4 + 5 + 14.', connection: 'C(4) = C(0)C(3) + C(1)C(2) + C(2)C(1) + C(3)C(0) = 5 + 2 + 2 + 5.'},
    provenance: 'Week 12 K–1 Problem 4 and grades 2–3 Problem 6, with the review card’s fix 1 for telling repeats apart.'},
  {number: 11, level: 'hard', title: 'Strings for a tree', mode: 'treepair', word: 'UUDUDDUUDD', check: {pairing: '1-6 2-3 4-5 7-10 8-9'}, prereq: 'tree',
    idea: 'Strings and edges match up: a string’s children are the strings just inside it, in order.',
    hints: ['The root has two children, so two strings are inside no other string.', 'The first child has two children: its string holds two strings. The second child’s string holds one.', 'Join 1 and 6 around 2–3 and 4–5, then 7 and 10 around 8–9.'],
    parent: {notice: 'Whether your child lays the outer strings first and fills them in, or the inner ones first, and whether they watch the yellow tree change.', prompt: 'Which strings are inside no other string?', explanation: 'Walk the tree: up to the first child, up and down to each of its two children, back to the root, up to the second child, up and down to its child, and back: up, up, down, up, down, down, up, up, down, down. Each up step starts a string at that dot and its down step ends it: 1–6 holds 2–3 and 4–5, and 7–10 holds 8–9. The strings just inside a string are its children, in order.', extension: 'Which strings make four edges in a row, each below the last? (1–8, 2–7, 3–6, 4–5.)', connection: 'The tree of a noncrossing pairing is its nesting order. It is also the dual tree of the regions, rooted at the region touching the arc just before dot 1.'},
    provenance: 'Week 12 grades 4–5 rules example (the five-edge tree on p. 1), with the grades 2–3 strings.'},
  {number: 12, level: 'hard', title: 'Move the mountain', mode: 'swaps', start: 'UUUDDDUDUD', target: 'UDUDUUUDDD', check: {best: 6}, prereq: 'swaps',
    idea: 'Each swap moves one corner up or down by one diamond, so the fewest swaps is the number of diamonds between the two paths.',
    hints: ['Where is the path above the dashed one, and where below?', 'Lower peaks only where the path is above the dashed one, and raise low corners only where it is below.', 'Three swaps lower the left side and three raise the right: six.'],
    parent: {notice: 'Whether your child plans which side goes down and which goes up, or swaps whatever corner is nearest.', prompt: 'How many swaps will this need? How do you know none can be saved?', explanation: 'A swap changes the height at one corner by two and nowhere else. After steps 2, 3 and 4 the path is two above the dashed one, and after steps 6, 7 and 8 two below: twelve in all. Each swap closes at most two of that, so no route is shorter than 6, and swapping only corners that move toward the dashed path takes exactly 6. The solved board shows the six diamonds between the two paths, each numbered by its swap.', extension: 'Which path of eight steps is farthest from the mountain? (Up, down, up, down, …: 6 swaps.)', connection: 'By adjacent swaps, the distance between two Dyck paths is half the sum of their height differences (checked by search for every pair up to ten steps); Week 47 has the same “fewest moves equals total change”.'},
    provenance: 'New, extending Week 12 return visit Problem 4 to a target that is not the mountain; its guide notes that the mountain score alone does not give the distance between two paths.'}
];

const id = n => `strings-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  let parameters, solution, kind = item.mode, rulesKey = item.mode, controls = CONTROLS[item.mode] || CONTROLS.circle;
  if (item.mode === 'finish' || item.mode === 'every' || item.mode === 'neighbours') {
    parameters = {mode: item.mode, n: item.n, ...(item.mode !== 'neighbours' ? {fixed: item.fixed} : {})};
    const ways = item.mode === 'neighbours' ? [] : completions(item.n, item.fixed);
    if (item.mode === 'every') {
      assert.equal(ways.length, item.check.count, `${id(item.number)}: count`);
      solution = {pairings: ways.map(w => keyOf([...item.fixed, ...w]))};
      if (item.fixed.length) { kind = 'everyFixed'; rulesKey = 'everyFixed'; }
    } else if (item.mode === 'finish') {
      assert.equal(ways.length, item.check.ways, `${id(item.number)}: completions`);
      if (ways.length) solution = {pairing: keyOf([...item.fixed, ...ways[0]]), ways: ways.length};
      else {
        // The witness: an attempt, then Can't on the trapped region.
        const odd = regions(item.n, item.fixed).list.filter(r => r.free.length % 2);
        assert.ok(odd.length, `${id(item.number)}: an odd region`);
        solution = {cant: {attempt: item.check.attempt, gap: item.check.gap}, trapped: odd.map(r => r.free)};
      }
    } else {
      // Every pairing joins neighbours; the witness is an attempt and its innermost string.
      for (const p of completions(item.n, [])) assert.ok(p.some(s => neighbours(item.n, s)), 'every pairing joins neighbours');
      assert.ok(stuckSides(item.n, item.check.attempt, item.check.cert).length, `${id(item.number)}: the witness string is stuck`);
      solution = {cant: {attempt: item.check.attempt, string: item.check.cert}};
    }
  } else if (item.mode === 'decode' || item.mode === 'treepair') {
    assert.ok(isPath(item.word));
    parameters = {mode: item.mode, n: item.word.length, word: item.word};
    const pairing = pairingOfWord(item.word);
    assert.equal(keyOf(pairing), item.check.pairing, `${id(item.number)}: pairing`);
    assert.equal(walkOf(treeOfStrings(pairing)), item.word, `${id(item.number)}: the strings' tree walks the path`);
    solution = {pairing: keyOf(pairing)};
  } else if (item.mode === 'tree') {
    parameters = {mode: 'tree', word: item.word};
    assert.deepEqual(treeOfWord(item.word), item.check.tree, `${id(item.number)}: tree`);
    // Parents in walk order: each up step adds a child of where the walk is.
    const parents = [], stack = [0];
    for (const c of item.word) { if (c === 'U') { parents.push(stack.at(-1)); stack.push(parents.length); } else stack.pop(); }
    solution = {parents};
    controls = CONTROLS.tree;
  } else {
    assert.ok(isPath(item.start) && isPath(item.target) && item.start.length === item.target.length);
    parameters = {mode: 'swaps', start: item.start, target: item.target};
    const best = swapDistance(item.start, item.target);
    assert.equal(best, item.check.best, `${id(item.number)}: fewest swaps`);
    if (item.target === mountainOf(item.target.length)) { assert.equal(dBeforeU(item.start), best, 'D-before-U count'); kind = 'swapsMountain'; }
    // A fewest route: at each step, the leftmost corner that moves toward the target.
    const route = [];
    let w = item.start;
    while (w !== item.target) {
      const ht = heights(item.target), c = corners(w).find(c => (c.kind === 'valley' && c.h < ht[c.at]) || (c.kind === 'peak' && c.h > ht[c.at]));
      route.push(c.at); w = swapAt(w, c.at);
    }
    assert.equal(route.length, best);
    solution = {route};
    controls = CONTROLS.swaps;
  }
  if (item.mode === 'finish') controls = CONTROLS.finish;
  if (item.mode === 'every') controls = CONTROLS.every;
  if (item.mode === 'neighbours') controls = CONTROLS.neighbours;
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Circle strings', mechanic: 'strings', band: 'all', revision: 1, sourceDocument: 'docs/strings/README.md',
    parameters,
    objective: OBJECTIVE[kind], visibleObjective: VISIBLE[kind], instruction: OBJECTIVE[kind],
    controls, rules: RULES[rulesKey].filter(r => item.fixed?.length !== 0 || !r.startsWith('Dark strings')), idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'strings-playground', number: 0, title: 'Circle strings playground', difficulty_level: 'playground', familyTitle: 'Circle strings', mechanic: 'strings', band: 'playground', revision: 1, sourceDocument: 'docs/strings/README.md',
  parameters: {mode: 'playground', start: 6},
  objective: 'Lay strings on a circle of 2 to 12 dots and watch the path and the tree they make.', visibleObjective: '',
  instruction: 'Lay strings on a circle of 2 to 12 dots and watch the path and the tree they make.',
  controls: CONTROLS.playground,
  rules: [...COMMON, 'The path reads the strung dots from 1 onwards: up at a string’s first dot, down at its other dot. The tree hangs each string below the string just outside it.'],
  idea: 'Free play with strings, and the path and tree that come with them.',
  prerequisites: 'None. A grown-up or a partner can set a challenge: make this path, or this tree.',
  hints: ['Make a pairing, then change one string and watch the path.', 'A string inside another is a step up while the outer string is still open.', 'Try an odd number of dots.'],
  parent: {notice: 'Whether your child predicts the path or the tree before laying the last string.', prompt: 'Which pairing makes the tallest path? Which makes the flattest?', explanation: 'Nested strings make tall paths and deep trees; side-by-side strings make low paths and wide trees. The tallest path is all strings nested, 1–n, 2–(n − 1), …; the flattest is all neighbours 1–2, 3–4, ….', extension: 'With an odd number of dots, how many can be strung at most?', connection: 'Pairings, paths and trees are three faces of the Catalan family.', sourceIds: sources},
  provenance: 'Week 12 K–1 and grades 2–3 launch (“Join every dot to one other dot”), with the paths of grades 2–3 Problem 2 and the trees of grades 4–5 Problem 2 shown beside the circle.'
};

const json = {
  title: 'Circle strings',
  version: 1,
  families: [{id: 'strings', title: 'Circle strings', mathematics: 'Dots sit round a circle, numbered clockwise from the top, and strings join pairs of dots across the inside without crossing. Noncrossing strings cut the disc into regions; strings can be finished exactly when every region has an even number of free dots, so a region with an odd number is the certificate that a start can’t be finished, and an odd number of dots in all can never be paired. Every pairing joins two neighbours, by its innermost string. Reading the dots in order, an up step at the first end of each string and a down step at the other make a path that never dips below its start, and each such path comes from exactly one pairing, since each down step must close the newest open string. The strings nest into an ordered tree whose walk is the same path. All three are counted by the Catalan numbers 1, 1, 2, 5, 14, 42, 132. Swapping a neighbouring down-up pair of steps raises one corner of a path; each swap changes the number of down steps before up steps by one, so that count is the fewest swaps to the mountain, and half the summed height gap is the fewest to any path.', rules: COMMON, sourceIds: sources}],
  sources: [
    {id: 'strings-week12', title: 'Bellingham Math Circle — Week 12: Catalan bijections, K–1, grades 2–3 and grades 4–5 packets, return visit and adult guides', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-12', kind: 'local curriculum'},
    {id: 'strings-card12', title: 'Week 12 review card and math check (Catalan bijections; fix 1, the duplicate test; App fit and Decision)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-12.md', kind: 'local curriculum'},
    {id: 'strings-stanley', title: 'Richard P. Stanley — Catalan Numbers, Cambridge University Press (2015), Chapter 2: noncrossing matchings, Dyck paths and plane trees among the 214 Catalan families', url: 'https://doi.org/10.1017/CBO9781139871495', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/strings/strings.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.difficulty_level} ${p.parameters.mode} ${JSON.stringify(p.solution).slice(0, 100)}`).join('\n'));
