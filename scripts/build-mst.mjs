// Authoring list for Cheapest networks (worksheet Week 53). Computes each
// map's cheapest price and number of cheapest networks, checks the authored
// claims (swap budgets, forced and excluded links, the design target), and
// writes dist/families/mst/mst.json. Run: node scripts/build-mst.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {allTrees, cheapestCost, optima, forcingSplits, excludingLoops, designs, isTree, swapsUsed, DESIGN_PRICES} from '../dist/families/mst/mst.js';

const links = list => list.split(' ').map(t => { const m = t.match(/^([A-Z])([A-Z])(\d+)$/); return [m[1], m[2], Number(m[3])]; });
const linkIndex = (q, name) => q.links.findIndex(([u, v]) => u + v === name);
const MAPS = {
  square: {aspect: 1.4, nodes: {A: [12, 15], B: [88, 15], C: [88, 85], D: [12, 85]}},
  kite: {aspect: 1.45, nodes: {A: [6, 40], B: [50, 6], C: [30, 80], D: [82, 30], E: [62, 92]}},
  hexagon: {aspect: 1.8, nodes: {A: [4, 50], B: [32, 10], C: [68, 10], D: [96, 50], E: [68, 90], F: [32, 90]}},
  wheel: {aspect: 1.2, nodes: {A: [50, 50], B: [50, 6], C: [92, 36], D: [76, 92], E: [24, 92], F: [8, 36]}},
  bowtie: {aspect: 1.5, nodes: {A: [8, 14], B: [8, 86], C: [36, 50], D: [92, 30], E: [64, 92]}},
  ladder: {aspect: 1.6, nodes: {A: [10, 15], B: [50, 15], C: [90, 15], D: [10, 85], E: [50, 85], F: [90, 85]}},
  seven: {aspect: 1.45, scale: .85, nodes: {A: [6, 50], B: [30, 10], C: [30, 90], D: [55, 50], E: [78, 10], F: [78, 90], G: [95, 50]}},
  house: {aspect: 1.1, nodes: {E: [50, 6], A: [15, 36], C: [85, 36], B: [15, 94], D: [85, 94]}},
  k4: {aspect: 1.15, nodes: {A: [50, 62], B: [50, 6], C: [90, 94], D: [10, 94]}}
};
const map = (name, list, extra = {}) => ({...MAPS[name], links: links(list), ...extra});

const BUY = [
  'Buy links until every place is joined to every other by bought links.',
  'A network’s price is the total of its links’ prices.',
  'Cheapest means no network that joins every place costs less.'
];
const RULES = {
  cheapest: [...BUY, 'Press Cheapest when you think no network costs less. If one does, a cheaper swap or a link you can return appears.'],
  every: [...BUY, 'Press Cheapest to keep a network. Press That’s all when you think you have found every cheapest network.'],
  swap: [...BUY, 'The start network is already bought. Each link you buy that it didn’t have uses one swap; returning that link gives the swap back.', 'Press Cheapest when you think no network costs less.'],
  forced: ['Tap places to put them on your side of a split.', 'A link crosses the split when one end is on each side.', 'Solved when the dark link is the cheapest link that crosses, and no other crossing link costs as little.'],
  excluded: ['Tap links to pick them.', 'Solved when the picked links make one loop through the dark link, and every other link in the loop costs less than it.'],
  design: ['Tap a link to change its price: 1, 2, 3, 4, then 1 again.', 'Press Check when you think exactly 4 networks are cheapest. If not, every cheapest network for your prices is shown.']
};
const CONTROLS = {
  cheapest: 'Tap a link to buy it, and tap it again to return it. Places light up as they are joined; a loop shows dashed. The coin shows what you have paid.',
  every: 'Tap a link to buy it, and tap it again to return it. Press Cheapest to keep a network; it joins the row below. Undo keeps the networks you have found.',
  swap: 'Tap a link to buy it, and tap it again to return it. The arrows show how many new links you may still buy.',
  forced: 'Tap a place to put it on your side, and tap it again to take it off. The links that cross turn gold.',
  excluded: 'Tap a link to pick it, and tap it again to drop it.',
  design: 'Tap a link to change its price. Press Check to see whether exactly 4 networks are cheapest.'
};
const OBJECTIVES = {
  cheapest: 'Join every place for the lowest price.',
  every: 'Find every cheapest network.',
  swap: q => `Make the network cheapest, buying at most ${q.budget} new links.`,
  forced: 'Split the places so the dark link is the cheapest way across.',
  excluded: 'Make a loop in which the dark link costs the most.',
  design: q => `Set prices so exactly ${q.want} networks are cheapest.`
};
const PREREQUISITES = {
  cheapest: 'Compare small numbers. The app adds the prices. A grown-up can read the buttons.',
  every: 'Compare small numbers and keep a list of what has been found. A grown-up can read the buttons.',
  swap: 'Compare small numbers and plan two or three steps ahead.',
  forced: 'Compare small numbers. Understanding why the answer works is for older children with a grown-up.',
  excluded: 'Compare small numbers and trace a loop around a map.',
  design: 'Compare prices and reason about ties; older children.'
};
const sources = ['mst-kruskal', 'mst-graham-hell', 'mst-sedgewick', 'mst-week53'];

const PUZZLES = [
  {number: 1, check: {optima: 1}, level: 'easy', title: 'First network', p: map('square', 'AB3 BC2 CD4 AD3 AC1', {mode: 'cheapest'}),
    idea: 'A link between places that are already joined adds a loop and nothing else.',
    hints: ['Buy links until every place lights up.', 'AB and AD both cost 3. Does each one join a new place?', 'Buy AC, BC and AD.'],
    parent: {notice: 'AB and AD cost the same, but only one of them joins a new place.', prompt: 'Which link would you leave out, and why?', explanation: 'Four places need at least three links. The cheapest network is AC 1, BC 2 and AD 3, costing 6, and it is the only one at that price. AB also costs 3, but once AC and BC are bought it closes the loop A, B, C and joins nothing new.', extension: 'Change one price so that there are two cheapest networks.', connection: 'A cheapest network that joins every place is a minimum spanning tree. With positive prices it never has a loop, because returning any loop link keeps every place joined and costs less.'},
    provenance: 'New, in the style of Week 53 Problems 1 and 3 (buy until connected; a loop is wasted money).'},
  {number: 2, check: {optima: 2}, level: 'easy', title: 'Three cheap links', p: map('kite', 'AB1 BC2 AC2 BD3 CD4 DE3 CE5', {mode: 'cheapest'}),
    idea: 'The three cheapest links make a loop and leave two places out.',
    hints: ['Try the cheapest links first. What happens?', 'AB, BC and AC make a loop. One of them is not needed.', 'Buy AB, BC, BD and DE.'],
    parent: {notice: 'Buying the three cheapest links joins only A, B and C, and closes a loop.', prompt: 'You bought the three cheapest links. Why isn’t that the start of the cheapest network?', explanation: 'AB 1, BC 2 and AC 2 are the three cheapest links, but they form the loop A, B, C, so one of them is wasted. A cheapest network keeps AB and one of the two 2s, then adds BD 3 and DE 3, for 9 in all. There are two such networks: with BC or with AC.', extension: 'Is there a network that uses CD? What is the cheapest one, and why does it cost more?', connection: 'Kruskal’s rule: take links from the cheapest up, skipping any that would close a loop. It always ends with a cheapest network (Kruskal, 1956).'},
    provenance: 'Week 53 Problem 3 (the greedy trap), with a new map.'},
  {number: 3, check: {optima: 4, trees: 8}, level: 'easy', title: 'Two choices twice', p: map('square', 'AB2 BC2 CD2 AD2 AC1', {mode: 'every'}),
    idea: 'B can join through A or through C, and so can D: two choices twice.',
    hints: ['Find one cheapest network first. What does it cost?', 'Every cheapest network uses the 1. Then B and D each have two ways to join.', 'There are four: AC with AB or BC, and with AD or CD.'],
    parent: {notice: 'Every cheapest network uses the diagonal.', prompt: 'How do you know you have found them all?', explanation: 'AC costs 1, and every cheapest network uses it. Then B joins by AB or BC and D joins by AD or CD, each for 2. Two choices for B and two for D give 2 × 2 = 4 cheapest networks, each costing 5. A network without AC needs three 2s and costs 6.', extension: 'If the diagonal cost 2 like the sides, how many networks would be cheapest? (All 8.)', connection: 'When prices tie, the cheapest networks can be counted by multiplying independent choices.'},
    provenance: 'Week 53 Problems 2 and 4 (find every cheapest purchase), with a new map whose ties multiply.'},
  {number: 4, check: {optima: 1}, level: 'easy', title: 'Around the middle', p: map('hexagon', 'AB4 BC2 CD3 DE4 EF1 AF5 BF3 CE2', {mode: 'cheapest'}),
    idea: 'The four cheapest links go round a loop, so the dearest of them stays unbought.',
    hints: ['Buy cheap links, but watch for a loop.', 'EF, BC, CE and BF go round the middle. Which one can you do without?', 'Buy EF, BC, CE, CD and AB.'],
    parent: {notice: 'The four cheapest links make a loop around the middle.', prompt: 'Which link of the loop would you return?', explanation: 'EF 1, BC 2, CE 2 and BF 3 form the loop B, C, E, F, so the cheapest network leaves out the dearest of them, BF. Then A joins by AB 4 (not AF 5) and D by CD 3 (not DE 4). The total is 12, and this is the only network at that price.', extension: 'Which links could get cheaper without changing the cheapest network?', connection: 'The cycle rule: a link that is the strict dearest on some loop is in no cheapest network.'},
    provenance: 'New; a larger version of Week 53 Problem 3.'},
  {number: 5, check: {optima: 1}, level: 'medium', title: 'Two new links', p: map('wheel', 'AB6 AC3 AD3 AE2 AF6 BC6 CD2 DE2 EF5 BF4', {mode: 'swap', start: 'AB BC CD EF BF', budget: 2}),
    idea: 'A swap only helps if the new link belongs in the cheapest network.',
    hints: ['Find the cheapest network in your head first. Which of its links are missing?', 'The start needs AE and DE. Buy one and return the dearest link on its loop.', 'Buy AE and return AB; buy DE and return BC.'],
    parent: {notice: 'Most swaps that save money waste one of the two new links.', prompt: 'Before you buy, which links of the cheapest network does the start already have?', explanation: 'The cheapest network is AE, CD, DE, EF and BF, costing 15. It shares CD, EF and BF with the start, so exactly two new links are needed, AE and DE, and AB and BC must go. Buying AE makes the loop A, B, F, E; returning AB (6) saves 4. Buying DE makes the loop D, C, B, F, E; returning BC (6) saves 4. A swap such as buying AC and returning BC also saves money, but spends a new link the cheapest network doesn’t have. Of the 10 swaps that save money, only 2 make progress.', extension: 'Does the order of the two swaps matter?', connection: 'The exchange property of spanning trees: a network missing k links of a cheapest network can reach it in exactly k swaps, each buying one of those links and returning a link on the loop it makes.'},
    provenance: 'Week 53 Problems 5 and 8 (one-link swaps), turned into a fewest-swaps goal as the review card suggests. New map.'},
  {number: 6, check: {optima: 6}, level: 'medium', title: 'Two groups of ties', p: map('bowtie', 'AB2 AC2 BC2 CD1 CE3 DE3 BE4', {mode: 'every'}),
    idea: 'Two separate choices: any two of the three 2s, and either 3.',
    hints: ['Find one cheapest network. Which links could swap for others of the same price?', 'Any two of AB, AC, BC work. E joins by CE or DE.', 'Three ways for A, B, C times two ways for E: six networks.'],
    parent: {notice: 'The 2s around A, B and C can be swapped for one another, and so can the two 3s at E.', prompt: 'Why can’t E join by BE?', explanation: 'Every cheapest network uses CD 1. A, B and C are joined by three links of price 2 that form a loop, so any two of them work (3 ways). E joins by CE 3 or DE 3 (2 ways), never by BE 4. That gives 3 × 2 = 6 networks, each costing 8.', extension: 'Which link could drop to price 3 and make 9 cheapest networks? (BE.)', connection: 'Within one price level, the choices are the spanning trees of the places already joined by cheaper links, and independent levels multiply.'},
    provenance: 'Week 53 Problem 4 and the review card’s suggestion (CE = 2 makes the catalog 3 × 3), with a new map.'},
  {number: 7, check: {splits: 4}, level: 'medium', title: 'The middle rung', p: map('ladder', 'AB2 BC4 DE5 EF1 AD6 BE3 CF5', {mode: 'forced', target: 'BE'}),
    idea: 'Every network must cross every split, and the cheapest crossing link belongs in every cheapest network.',
    hints: ['Put some places on your side and watch which links turn gold.', 'Keep the cheap links AB and EF inside one side each.', 'Put E and F on your side.'],
    parent: {notice: 'BE is the cheapest link across the split between the top row and the bottom row.', prompt: 'If a network didn’t use BE, how could you make it cheaper?', explanation: 'With E and F on one side, three links cross: DE 5, BE 3 and CF 5. Every network that joins every place must cross the split. If a cheapest network left out BE, buying BE would make a loop that crosses the split twice, and returning the other crossing link would make it cheaper. So BE is in every cheapest network. Four different splits prove it.', extension: 'Find a split that proves AB is in every cheapest network.', connection: 'The cut property of minimum spanning trees.'},
    provenance: 'Week 53 Problem 6 (links in every cheapest purchase, by cuts). New map.'},
  {number: 8, check: {loops: 1}, level: 'medium', title: 'Cheap but never bought', p: map('wheel', 'AB6 AC2 AD2 AE4 AF4 BC5 CD3 DE4 EF6 BF6', {mode: 'excluded', target: 'CD'}),
    idea: 'A cheap link is still never needed if it is the dearest on some loop.',
    hints: ['Look at the places at the two ends of the dark link.', 'Find a way from C to D that only uses cheaper links.', 'Pick AC, AD and CD.'],
    parent: {notice: 'Only two links cost less than CD, yet no cheapest network uses it.', prompt: 'If a network used CD, which link could replace it?', explanation: 'CD costs 3, and only AC and AD cost less. They make the loop A, C, D with it, where CD is the dearest. A network with CD could return CD and buy AC or AD, whichever crosses back, and cost less. So no cheapest network uses CD.', extension: 'Which other links are in no cheapest network? Find a loop for each.', connection: 'The cycle property of minimum spanning trees.'},
    provenance: 'Week 53 Problem 6 (links in no cheapest purchase, by loops). New map.'},
  {number: 9, check: {optima: 2}, level: 'hard', title: 'Three new links', p: map('seven', 'AB4 AC5 BD2 CD3 BE1 DE2 DF1 CF2 EG4 FG6 AD6', {mode: 'swap', start: 'AB AC DE EG FG AD', budget: 3}),
    idea: 'When two cheapest networks tie, aim for the one closer to what you have.',
    hints: ['Find the cheapest networks in your head. Which is closest to the start?', 'BD and DE both cost 2. The start already has DE.', 'Buy BE, DF and CF; return AD, FG and AC.'],
    parent: {notice: 'There are two cheapest networks, and only one is within three swaps.', prompt: 'BD and DE cost the same. Which one would you keep, and why?', explanation: 'Two networks cost 14: AB, BE, DF, CF, EG with BD or with DE. The start already has DE, so the second needs only BE, DF and CF, three new links, and AC, FG and AD go. Aiming for the one with BD would need four. Buying BE makes the loop B, E, D, A; returning AD (6) saves 5. Then buying DF makes the loop D, F, G, E; returning FG (6) saves 5. Then buying CF makes the loop C, F, D, E, B, A; returning AC (5) saves 3.', extension: 'Is there an order of the three swaps in which one of them saves nothing?', connection: 'The exchange property again: the number of swaps needed is the number of links the start lacks from the nearest cheapest network.'},
    provenance: 'Week 53 Problem 8 (swaps toward the optimum) with ties, as a fewest-swaps goal. New map.'},
  {number: 10, check: {optima: 5}, level: 'hard', title: 'The hidden loop', p: map('house', 'AB1 CD1 AC2 BD2 AE2 CE2', {mode: 'every'}),
    idea: 'Two of the four 2s, but one pair closes a loop with the two 1s.',
    hints: ['Every cheapest network uses both 1s. How many 2s does it need?', 'Try each pair of 2s. Does any pair make a loop?', 'AC with BD makes the loop A, C, D, B. The other five pairs all work.'],
    parent: {notice: 'Four pairs look alike, a fifth uses the roof, and the sixth pair fails.', prompt: 'You have five. How do you know there isn’t a sixth?', explanation: 'Every cheapest network uses AB 1 and CD 1, then two of the four 2s, costing 6. Of the six pairs of 2s, only AC with BD fails: with AB and CD it closes the loop A, C, D, B and leaves E out. So there are exactly 5.', extension: 'Imagine a link from B to E costing 2. How many cheapest networks would there be? (8.)', connection: 'Joining the places linked by 1s into two groups, the 2s form a triangle with one doubled side, which has 5 spanning trees.'},
    provenance: 'New; extends Week 53 Problems 2 and 4 to ties that interact with cheaper links.'},
  {number: 11, check: {splits: 1}, level: 'hard', title: 'Worth its price', p: map('seven', 'AB1 AC3 BD1 CD3 BE6 DE5 DF2 CF1 EG3 FG4 AD1', {mode: 'forced', target: 'FG'}),
    idea: 'A dear link is forced when every cheaper way across can be kept on one side.',
    hints: ['Which places does FG reach? Group them with their cheap neighbours.', 'EG costs 3. Put E and G together.', 'Put E and G on your side.'],
    parent: {notice: 'Eight links cost less than FG, yet every cheapest network uses it.', prompt: 'G already has EG at 3. Why does it need FG too?', explanation: 'With E and G on one side, only BE 6, DE 5 and FG 4 cross, so FG is the cheapest way to join E and G to the rest. Every cheapest network uses it, even though eight links are cheaper. This is the only split that proves it.', extension: 'Is EG in every cheapest network? Prove it with a split, or show a loop where it is the dearest.', connection: 'The cut property: a forced link need not be cheap, only the cheapest across some split.'},
    provenance: 'Week 53 Problem 6 (CD is forced by price although it is not a bridge), made harder. New map.'},
  {number: 12, check: {designs: 144, trees: 16}, level: 'hard', title: 'Exactly four', p: map('k4', 'AB1 AC1 AD1 BC1 CD1 BD1', {mode: 'design', want: 4}),
    idea: 'Ties make several cheapest networks; four equal links around a loop make exactly four.',
    hints: ['With every price 1, all 16 networks are cheapest. Make some links dearer.', 'Try a loop of four links at price 1, and the other two dearer.', 'For example: BC, AC, AD and BD at 1; AB and CD at 2.'],
    parent: {notice: 'Most price choices give one or two cheapest networks; exactly four is rare.', prompt: 'Which prices are tied in your cheapest networks?', explanation: 'Exactly four cheapest networks come from 144 of the 4096 ways to price the six links. One answer puts four links around a loop at the lowest price and the other two dearer: drop any one link of the loop. Another uses two separate two-way choices: AB 1, AC and BC 2, AD and BD 3, CD 4, so C joins two ways and D joins two ways.', extension: 'Can you make exactly 5 cheapest networks? Exactly 7? (Five is possible; seven is not.)', connection: 'Counting minimum spanning trees with ties, level by level: the counts that occur on four places are 1, 2, 3, 4, 5, 6, 8, 9 and 16.'},
    provenance: 'Week 53 Problem 7 (design prices), with the review card’s rarer target: exactly 4 cheapest (144 of 4096) instead of exactly one (1956 of 4096).'}
];

const out = PUZZLES.map(item => {
  const q = {...item.p};
  if (q.mode === 'swap') q.start = q.start.split(' ').map(name => linkIndex(q, name)).sort((a, b) => a - b);
  if (q.target !== undefined) q.target = linkIndex(q, q.target);
  assert.ok(q.links.every(([u, v]) => Object.hasOwn(q.nodes, u) && Object.hasOwn(q.nodes, v)), `${item.title}: links join places`);
  const prices = q.links.map(l => l[2]), best = optima(q, prices);
  q.cheapest = cheapestCost(q, prices);
  if (q.mode === 'every') q.answers = best.length;
  if (q.mode === 'swap') {
    assert.ok(isTree(q, q.start), `${item.title}: the start joins every place with no loop`);
    const need = Math.min(...best.map(t => swapsUsed(q, t)));
    assert.equal(need, q.budget, `${item.title}: the budget is the fewest swaps`);
  }
  if (q.mode === 'forced') {
    assert.ok(best.every(t => t.includes(q.target)), `${item.title}: the dark link is in every cheapest network`);
    assert.ok(forcingSplits(q).length > 0, `${item.title}: a split proves it`);
  }
  if (q.mode === 'excluded') {
    assert.ok(best.every(t => !t.includes(q.target)), `${item.title}: the dark link is in no cheapest network`);
    assert.ok(excludingLoops(q).length > 0, `${item.title}: a loop proves it`);
  }
  if (q.mode === 'design') {
    assert.ok(prices.every(p => DESIGN_PRICES.includes(p)), `${item.title}: starting prices are allowed`);
    assert.ok(designs(q).length > 0 && optima(q, prices).length !== q.want, `${item.title}: reachable, and not already met`);
  }
  for (const [what, value] of Object.entries(item.check || {})) {
    const actual = {splits: () => forcingSplits(q).length, loops: () => excludingLoops(q).length, optima: () => best.length, designs: () => designs(q).length, trees: () => allTrees(q).length}[what]();
    assert.equal(actual, value, `${item.title}: ${what}`);
  }
  assert.ok(allTrees(q).length <= 400, `${item.title}: small enough to search`);
  const id = `mst-${String(item.number).padStart(2, '0')}`;
  const objective = typeof OBJECTIVES[q.mode] === 'function' ? OBJECTIVES[q.mode](q) : OBJECTIVES[q.mode];
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'mst', familyTitle: 'Cheapest networks', revision: 1,
    parameters: q,
    objective, visibleObjective: objective, instruction: objective,
    controls: CONTROLS[q.mode], rules: RULES[q.mode],
    idea: item.idea,
    prerequisites: PREREQUISITES[q.mode],
    hints: item.hints,
    parent: {...item.parent, sourceIds: sources},
    provenance: item.provenance,
    sourceDocument: 'docs/mst/README.md'
  };
});
const json = {
  title: 'Cheapest networks',
  version: 1,
  families: [{id: 'mst', title: 'Cheapest networks', mathematics: 'Places are joined by links with positive prices; a network buys links until every place is joined. The cheapest networks are the minimum spanning trees: they never contain a loop; a link that is the strict cheapest across some split of the places is in every one (cut property), and a link that is the strict dearest on some loop is in none (cycle property); a loop-free network is cheapest exactly when no single swap lowers its price, and from any network as many swaps as it lacks links reach a cheapest one (the exchange property). Distinct prices give a single cheapest network; ties multiply the choices.', rules: BUY, sourceIds: sources}],
  sources: [
    {id: 'mst-kruskal', title: 'Joseph B. Kruskal Jr. — On the shortest spanning subtree of a graph and the traveling salesman problem, Proceedings of the AMS 7 (1956), 48–50', url: 'https://doi.org/10.1090/S0002-9939-1956-0078686-7', kind: 'research'},
    {id: 'mst-graham-hell', title: 'R. L. Graham and Pavol Hell — On the history of the minimum spanning tree problem, Annals of the History of Computing 7 (1985), 43–57', url: 'https://doi.org/10.1109/MAHC.1985.10011', kind: 'research'},
    {id: 'mst-sedgewick', title: 'Robert Sedgewick and Kevin Wayne — Algorithms, §4.3 Minimum Spanning Trees (lecture slides and companion site)', url: 'https://algs4.cs.princeton.edu/43mst/', kind: 'undergraduate'},
    {id: 'mst-week53', title: 'Bellingham Math Circle — Week 53: Cheapest connected networks (worksheets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-53', kind: 'worksheet'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/mst/mst.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} cheapest ${p.parameters.cheapest}${p.parameters.answers ? ` answers ${p.parameters.answers}` : ''}`).join('\n'));
