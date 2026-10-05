// Authoring list for Routes and roadblocks (worksheet Week 13). Computes each
// packing puzzle's best count and each game's winning side from the boards,
// checks the authored claims, and writes dist/families/flow/flow.json.
// Run: node scripts/build-flow.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {bestCount, blockingSets, allRoutes, winsToMove, leak} from '../dist/families/flow/flow.js';

const arcs = list => list.split(' ').map(a => [a[0], a[1]]);
const S = 's', T = 't';
const MAPS = {
  diamond: {aspect: 1.7, nodes: {s: [7, 50], A: [50, 14], B: [50, 86], t: [93, 50]}, arcs: arcs('sA At sB Bt')},
  shortcut: {aspect: 1.7, nodes: {s: [7, 50], A: [50, 14], B: [50, 86], t: [93, 50]}, arcs: arcs('sA At sB Bt AB')},
  funnel: {aspect: 1.7, nodes: {s: [6, 50], A: [30, 14], B: [30, 86], C: [54, 50], D: [75, 50], t: [94, 50]}, arcs: arcs('sA sB AC BC CD Dt')},
  three: {aspect: 1.35, nodes: {s: [7, 50], A: [50, 12], B: [50, 50], C: [50, 88], t: [93, 50]}, arcs: arcs('sA sB sC At Bt Ct AB CB')},
  bowtie: {aspect: 1.6, nodes: {s: [6, 50], A: [29, 14], B: [29, 86], C: [50, 50], D: [71, 14], E: [71, 86], t: [94, 50]}, arcs: arcs('sA sB AC BC CD CE Dt Et')},
  squeeze: {aspect: 1.3, scale: .72, nodes: {s: [4, 50], A: [18, 13], B: [20, 50], C: [18, 87], D: [35, 50], E: [50, 22], F: [50, 78], G: [65, 50], H: [82, 13], I: [80, 50], J: [82, 87], t: [96, 50]}, arcs: arcs('sA sB sC AD BD CD DE DF EG FG GH GI GJ Ht It Jt')},
  backward: {aspect: 1.6, nodes: {s: [6, 50], A: [32, 14], B: [32, 86], C: [68, 14], D: [68, 86], t: [94, 50]}, arcs: arcs('sA sB BA AC BD CB CD Ct Dt')},
  coupled: {aspect: 1.6, nodes: {s: [6, 50], A: [27, 14], B: [27, 86], C: [50, 50], D: [73, 14], E: [73, 86], t: [94, 50]}, arcs: arcs('sA sB AB AC BC CD CE DE Dt Et')},
  ladder: {aspect: 1.4, nodes: {s: [6, 50], A: [34, 12], B: [34, 50], C: [34, 88], D: [66, 12], E: [66, 50], F: [66, 88], t: [94, 50]}, arcs: arcs('sA sB sC Dt Et Ft AD BE BF AB CB ED FE')},
  bigsqueeze: {aspect: 1.15, scale: .85, nodes: {s: [4, 50], A: [22, 8], B: [22, 36], C: [22, 64], D: [22, 92], E: [48, 22], F: [48, 50], G: [48, 78], H: [74, 8], I: [74, 36], J: [74, 64], K: [74, 92], t: [96, 50]}, arcs: arcs('sA sB sC sD AE BE BF CF CG DG EH FI GJ HF IG JK Ht It Jt Kt')}
};

const PACK_RULES = [
  'Routes follow the arrows from ▶ to ⚑ and never visit a dot twice.',
  'Two routes may share a dot but never an arrow.',
  'A roadblock closes one arrow. Roadblocks are checked on their own: they don’t stop you drawing a route.',
  'Solved when the number of routes equals the number of roadblocks and no way through is left.'
];
const PACK_CONTROLS = 'Routes: tap ▶, then tap dots along the arrows, or slide a finger from dot to dot. A route ends at ⚑. Tap a drawn route to clear it. Roadblocks: tap an arrow to close it, and tap it again to open it. While you place roadblocks, a dashed line shows a way that still gets through.';
const GAME_RULES = [
  'Take turns closing one arrow.',
  'Whoever closes the arrow that stops the last way from ▶ to ⚑ wins.',
  'The other side always plays its best.'
];
const GAME_CONTROLS = 'Choose who goes first. On your turn, tap an arrow to close it; the other side answers at once. Again starts a new game.';
const sources = ['flow-ford-fulkerson', 'flow-menger', 'flow-sedgewick', 'flow-week13'];

const pack = (map, extra) => ({mode: 'pack', ...MAPS[map], start: S, finish: T, ...extra});
const PUZZLES = [
  {number: 1, level: 'easy', title: 'Two roads', p: pack('diamond'),
    idea: 'Each road needs its own roadblock, so two routes and two roadblocks prove each other best.',
    hints: ['Draw one route along the top and one along the bottom.', 'Each route needs one roadblock somewhere on it.', 'Close one arrow on the top road and one on the bottom road.'],
    parent: {notice: 'Each roadblock can stop only one of two routes that share no arrow.', prompt: 'Could one roadblock stop both routes?', explanation: 'A roadblock closes one arrow, and two routes that share no arrow cannot both use it. So two routes need at least two roadblocks, and two roadblocks that stop everything leave room for at most two routes. Matching counts prove both are best.', extension: 'How many different pairs of roadblocks work here? (Four: one arrow from each road.)', connection: 'The easy half of the max-flow min-cut theorem: every set of roadblocks is at least as big as every set of routes that share no arrow.'},
    provenance: 'Week 13 shared launch and K–1 Problem 2 (the diamond).'},
  {number: 2, level: 'easy', title: 'The shortcut', p: pack('shortcut'),
    idea: 'A route that takes the shortcut uses both roads at once; the best answer leaves it alone.',
    hints: ['Try not to use the arrow in the middle.', 'A route through the middle arrow uses the start of one road and the end of the other.', 'Draw ▶ A ⚑ and ▶ B ⚑, then close the two arrows leaving ▶.'],
    parent: {notice: 'The route through the shortcut blocks both other routes, yet two routes fit.', prompt: 'Your first route got stuck. Is that the most, or is there a better way?', explanation: 'The route ▶ A B ⚑ uses the arrow out of ▶ to A and the arrow into ⚑ from B, so no second route fits beside it. Being stuck does not prove you have the most. Two routes fit without the shortcut, and two roadblocks prove it.', extension: 'Which single arrow can you remove from this map without losing a route? (Only the shortcut.)', connection: 'A stuck collection is a maximal packing, not a maximum one; the Ford–Fulkerson method repairs it by rerouting.'},
    provenance: 'Week 13 reference “greedy board”, K–1 Problem 1 and grades 2–3 Problem 1.'},
  {number: 3, level: 'easy', title: 'The funnel', p: pack('funnel'),
    idea: 'Two roads merge into one arrow, so one roadblock in the middle stops everything.',
    hints: ['Where do the two roads meet?', 'After they meet there is only one arrow on the way to ⚑.', 'One route is the most. Close C to D or D to ⚑.'],
    parent: {notice: 'Two arrows leave ▶, yet only one route fits.', prompt: 'Why can’t two routes reach ⚑ here?', explanation: 'Every route has to use the arrow from C to D and then the arrow from D to ⚑. Routes can share dots but not arrows, so only one route fits, and one roadblock on either of those arrows proves it.', extension: 'Which roadblocks stop everything with just one arrow? (C to D, or D to ⚑.)', connection: 'A bottleneck need not be at the start or the finish: the smallest cut can sit anywhere.'},
    provenance: 'Week 13 K–1 Problem 2, lower board (the funnel).'},
  {number: 4, level: 'easy', title: 'Three roads and two links', p: pack('three'),
    idea: 'Three routes fit only if none of them borrows a link to the middle road.',
    hints: ['Three arrows leave ▶. Can each one start its own route?', 'A route that takes a link down or up uses the middle road’s last arrow.', 'Draw ▶ A ⚑, ▶ B ⚑ and ▶ C ⚑, then close the three arrows leaving ▶.'],
    parent: {notice: 'Taking a link early leaves only two routes.', prompt: 'How do you know three is the most?', explanation: 'Only three arrows leave ▶, and each route needs one of them, so three is the most. Three roadblocks on those arrows stop everything. A route like ▶ A B ⚑ takes the arrow B needs to finish, which is how a first try can get stuck at two.', extension: 'Find a set of three roadblocks that does not use any arrow leaving ▶. (For example the three arrows into ⚑.)', connection: 'Menger’s theorem for arrows: the most routes sharing no arrow equals the fewest arrows whose removal separates ▶ from ⚑.'},
    provenance: 'New, in the style of Week 13 K–1 Problem 3 (three branches).'},
  {number: 5, level: 'medium', title: 'The bow tie', p: pack('bowtie'),
    idea: 'Routes may share the middle dot; sharing a dot costs nothing, sharing an arrow is not allowed.',
    hints: ['Can two routes go through C together?', 'They can share the dot C as long as they use different arrows in and out.', 'Draw ▶ A C D ⚑ and ▶ B C E ⚑, then close the two arrows leaving ▶.'],
    parent: {notice: 'Two routes meet at C without breaking any rule.', prompt: 'There are many ways to place two roadblocks here. How many can you find?', explanation: 'Two routes fit, both through C. Any two roadblocks that stop everything must cut off one side of C completely: one arrow from each branch before C, or one from each branch after it. That gives eight pairs.', extension: 'Why does a pair with one roadblock before C and one after C never work?', connection: 'Cuts and the sides they separate: every way through must leave the start side at least once.'},
    provenance: 'Week 13 K–1 Problems 1 and 5, grades 2–3 Problems 1 and 3 (the bow tie).'},
  {number: 6, level: 'medium', title: 'Squeeze in the middle', p: pack('squeeze'),
    idea: 'Three arrows leave ▶ and three reach ⚑, but every route must use one of the two arrows out of D.',
    hints: ['Look in the middle, not only at the ends.', 'Every route passes through D. How many arrows leave D?', 'Two routes fit. Close D to E and D to F.'],
    parent: {notice: 'The ends look roomy, but the middle is tight.', prompt: 'Why can’t three routes fit, even with three arrows at each end?', explanation: 'Every route must leave D, and only two arrows leave D. So two routes is the most, and closing those two arrows (or the two arrows into G) stops everything.', extension: 'Add one new arrow from D to G in your head. How many routes fit now? (Three.)', connection: 'An interior bottleneck: the minimum cut is the set of arrows leaving the start side {▶, A, B, C, D}.'},
    provenance: 'Week 13 interior bottleneck board (grades 2–3 Problem 2, grades 4–5 Problem 2).'},
  {number: 7, level: 'medium', title: 'The arrow that points back', p: pack('backward'),
    idea: 'A long route can use both of the arrows that matter; the best routes each use one.',
    hints: ['Try a route that stays near the top and one that stays near the bottom.', 'The route ▶ A C B D ⚑ uses two arrows that two separate routes need.', 'Draw ▶ A C ⚑ and ▶ B D ⚑, then close A to C and B to D.'],
    parent: {notice: 'One zigzag route blocks every other route.', prompt: 'Your roadblocks on A to C and B to D stop everything. Does every route cross exactly one of them?', explanation: 'Two routes fit. The roadblocks on A to C and B to D stop everything, because every route must cross from the A–B side to the C–D side, and these are the only arrows that cross that way. The zigzag route ▶ A C B D ⚑ crosses forward, back (C to B, which is not counted) and forward again, so it uses both and nothing else fits.', extension: 'Find all five pairs of roadblocks that stop everything.', connection: 'Arrows pointing back into the start side do not count in a cut; a route can cross a cut more than once.'},
    provenance: 'Week 13 grades 4–5 Problems 3 and 4.'},
  {number: 8, level: 'medium', title: 'Roadblock game: two roads', p: {mode: 'game', ...MAPS.diamond, start: S, finish: T},
    idea: 'On two separate roads, the second player can always answer on the other road.',
    hints: ['Who closes the last needed arrow: the first player or the second?', 'Every first move breaks one road. Then one more roadblock finishes the job.', 'Let the other side go first, then close an arrow on the other road.'],
    parent: {notice: 'Whoever goes first loses, however they start.', prompt: 'Why is going second the winning choice here?', explanation: 'Any first roadblock breaks one road and leaves the other open. The second player closes an arrow on the open road and wins at once.', extension: 'Play on the bow tie in your head. Who should go first there?', connection: 'A small impartial game: positions are sets of closed arrows, and every position is a win or a loss for the player to move.'},
    provenance: 'Week 13 K–1 Problem 6 (the closing game), upper board.'},
  {number: 9, level: 'hard', title: 'Two crossings', p: pack('coupled', {routes: [['s', 'A', 'B', 'C', 'D', 'E', 't']]}),
    idea: 'The map starts with a long route through every dot; it has to be undone in two places before a second route fits.',
    hints: ['The long route is stuck. Is one route really the most here?', 'The long route uses A to B and D to E. Both have to go.', 'Clear it, draw ▶ A C D ⚑ and ▶ B C E ⚑, then close the two arrows leaving ▶.'],
    parent: {notice: 'Fixing one half of the long route is not enough.', prompt: 'If you keep part of the long route, which parts must change?', explanation: 'Two routes fit, and the two arrows leaving ▶ prove it. Starting from the long route ▶ A B C D E ⚑, the repair must give up both A to B and D to E: the Ford–Fulkerson change-walk ▶ B A C E D ⚑ cancels both at once.', extension: 'There are two ways to pair the arrows into and out of C. Find both pairs of best routes.', connection: 'Augmenting paths in the residual graph: a backward step cancels an arrow an earlier route used.'},
    provenance: 'Week 13 revised coupled board (grades 2–3 Problem 5, grades 4–5 Problem 1).'},
  {number: 10, level: 'hard', title: 'Up the ladder', p: pack('ladder', {routes: [['s', 'A', 'B', 'F', 't'], ['s', 'C', 'B', 'E', 't']]}),
    idea: 'Two routes are already drawn and stuck; a third fits only after one of them is rerouted.',
    hints: ['Three arrows leave ▶, but only two routes are drawn. Which route is in the way?', 'The top route uses A to B, so the route starting at B has no way out. Send the top route along A to D.', 'Keep ▶ C B E ⚑, draw ▶ A D ⚑ and ▶ B F ⚑, then close the three arrows leaving ▶.'],
    parent: {notice: 'Of the 26 ways to keep adding routes until stuck, only 2 reach three routes.', prompt: 'Your two routes are stuck. Which one would you change, and why?', explanation: 'Three arrows leave ▶, so three is the most, and closing them stops everything. Three routes fit in just two ways. The route from C must climb to B, because C has no other arrow out. Then B’s two arrows out, to E and to F, go one to each route through B, and the top route must be ▶ A D ⚑, since A to B would leave B one arrow short. Most first tries spend an arrow another route needs.', extension: 'Find a set of three roadblocks that does not touch ▶ or ⚑. (A to D, B to E and B to F.)', connection: 'Bipartite-style rerouting: a maximum packing found by repeatedly repairing a stuck one.'},
    provenance: 'New. Chosen by exhaustive search over two-column maps for few best packings and many stuck ones.'},
  {number: 11, level: 'hard', title: 'Big squeeze', p: pack('bigsqueeze'),
    idea: 'Four arrows leave ▶ and four reach ⚑, but every route must leave the middle column through one of three arrows.',
    hints: ['Count the arrows out of the middle column that go right.', 'Arrows that point back to the middle let one route use two of those three arrows.', 'Draw routes through E to H, F to I and G to J, then close those three arrows.'],
    parent: {notice: 'The bottleneck is in the middle, and back arrows let a route waste it.', prompt: 'Three roadblocks stop everything. Why can no route sneak past them?', explanation: 'The only arrows from the left half {▶, A–G} to the right half are E to H, F to I and G to J; H to F and I to G point back and do not help a route escape. So at most three routes fit, and three do: one through each of those arrows. A route like ▶ A E H F I ⚑ uses two of them.', extension: 'Find another set of three roadblocks that stops everything. (For example E to H, G to J and I to ⚑.)', connection: 'A minimum cut that separates the map into a start side and a finish side, with arrows pointing back not counted.'},
    provenance: 'New, extending the Week 13 interior bottleneck and grades 4–5 Problem 4 (a route that crosses a cut twice).'},
  {number: 12, level: 'hard', title: 'Roadblock game: the shortcut', p: {mode: 'game', ...MAPS.shortcut, start: S, finish: T},
    idea: 'Closing the shortcut first turns the map into two separate roads, with the other side to move.',
    hints: ['On two separate roads, the player who moves second wins.', 'Which first roadblock leaves two separate roads?', 'Go first and close the shortcut from A to B.'],
    parent: {notice: 'Only one first move wins, and it doesn’t stop a single road.', prompt: 'Why does closing an arrow that no best route needs win the game?', explanation: 'Closing A to B leaves two separate roads with the other side to move, which loses for them (puzzle 8). Any other first move leaves every remaining way through sharing one arrow, which the other side closes at once.', extension: 'Can you find a map where every first move wins?', connection: 'Strategy by reduction: turn the position into one already known to be lost for the player to move.'},
    provenance: 'Week 13 K–1 Problem 6 (the closing game), lower board.'}
];

const objective = p => p.p.mode === 'game' ? 'Take turns closing arrows. Close the arrow that stops the last way through.' : 'Draw routes from ▶ to ⚑ that share no arrow, and stop them all with the same number of roadblocks.';
const out = PUZZLES.map(item => {
  const q = item.p;
  if (q.mode === 'pack') {
    q.best = bestCount(q);
    assert.ok(q.best > 0 && blockingSets(q, q.best).length > 0, `${item.title}: best count and a matching set of roadblocks`);
    assert.equal(blockingSets(q, q.best - 1).length, 0, `${item.title}: fewer roadblocks never stop everything`);
    assert.ok(allRoutes(q).length <= 60, `${item.title}: small enough to search`);
  } else {
    q.winner = winsToMove(q, []) ? 'first' : 'second';
    assert.ok(leak(q, []), `${item.title}: open at the start`);
  }
  const id = `flow-${String(item.number).padStart(2, '0')}`;
  return {
    id, number: item.number, title: item.title, band: 'all', difficulty_level: item.level, mechanic: 'flow', familyTitle: 'Routes and roadblocks', revision: 1,
    parameters: q,
    objective: objective(item),
    visibleObjective: q.mode === 'game' ? 'Close the arrow that stops the last way through.' : 'Make routes and roadblocks match, with no way through.',
    instruction: objective(item),
    controls: q.mode === 'game' ? GAME_CONTROLS : PACK_CONTROLS,
    rules: q.mode === 'game' ? GAME_RULES : PACK_RULES,
    idea: item.idea,
    prerequisites: q.mode === 'game' ? 'Follow arrows and take turns. No reading or arithmetic needed.' : q.best <= 2 ? 'Follow arrows; tell a dot from an arrow; count to two or three. No reading needed.' : 'Follow arrows; keep track of three routes; count to four.',
    hints: item.hints,
    parent: {...item.parent, sourceIds: sources},
    provenance: item.provenance,
    sourceDocument: 'docs/flow/README.md'
  };
});
const json = {
  title: 'Routes and roadblocks',
  version: 1,
  families: [{id: 'flow', title: 'Routes and roadblocks', mathematics: 'On a map of one-way arrows from a start to a finish, the most routes that share no arrow equals the fewest arrows whose closing stops every route (Menger’s theorem for arcs; the unit-capacity max-flow min-cut theorem). A set of k routes and k roadblocks that stop everything proves both numbers best at once, with no list of all routes. A stuck set of routes need not be the most; rerouting along a change-walk that cancels earlier choices repairs it (Ford–Fulkerson).', rules: PACK_RULES.slice(0, 3), sourceIds: sources}],
  sources: [
    {id: 'flow-ford-fulkerson', title: 'L. R. Ford Jr. and D. R. Fulkerson — Maximal flow through a network, Canadian Journal of Mathematics 8 (1956), 399–404', url: 'https://doi.org/10.4153/CJM-1956-045-5', kind: 'research'},
    {id: 'flow-menger', title: 'Karl Menger — Zur allgemeinen Kurventheorie, Fundamenta Mathematicae 10 (1927), 96–115', url: 'https://doi.org/10.4064/fm-10-1-96-115', kind: 'research'},
    {id: 'flow-sedgewick', title: 'Robert Sedgewick and Kevin Wayne — Algorithms, §6.4 Maximum Flow (lecture slides and companion site)', url: 'https://algs4.cs.princeton.edu/64maxflow/', kind: 'undergraduate'},
    {id: 'flow-week13', title: 'Bellingham Math Circle — Week 13: Route packing and bottlenecks (worksheets and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-13', kind: 'worksheet'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/flow/flow.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.best ?? p.parameters.winner}`).join('\n'));
