// Authoring list for Trios (worksheet Week 36, Making threes, and its bonus).
// Shuffles each puzzle's tiles or cards (seeded, so the pack is stable),
// computes every answer with the mechanic's own functions, checks them
// against the table in docs/trios/README.md, and writes
// dist/families/trios/trios.json. Run: node scripts/build-trios.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {trios, third, isTrio, triosIn, capsOfSize, blockedSet, splits, splitKey, designs, throughPairs, digits, deckSize, cardName, tileName, winningClaims, appClaim, ownsTrio, opposite} from '../dist/families/trios/trios.js';

// Tiles: shape + 3 × fill (circle, triangle, square; open, striped, solid).
const T = {CO: 0, TO: 1, SO: 2, CH: 3, TH: 4, SH: 5, CF: 6, TF: 7, SF: 8};
// Cards of 27: tile + 9 × (count − 1).
const card = (tile, count) => T[tile] + 9 * (count - 1);

// A seeded shuffle (mulberry32), kept only when no three neighbours on the
// board make a trio: three in a row round the ring, or along a row or a
// column of the card grid.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function neighbourTriples(d, order) {
  const n = order.length, out = [];
  if (d === 2) for (let k = 0; k < n; k++) out.push([order[k], order[(k + 1) % n], order[(k + 2) % n]]);
  else {
    const cols = d === 3 ? 6 : 9, at = (r, c) => order[r * cols + c];
    for (let r = 0; r * cols < n; r++) for (let c = 0; c + 2 < cols; c++) if (r * cols + c + 2 < n) out.push([at(r, c), at(r, c + 1), at(r, c + 2)]);
    for (let c = 0; c < cols; c++) for (let r = 0; (r + 2) * cols + c < n; r++) out.push([at(r, c), at(r + 1, c), at(r + 2, c)]);
  }
  return out;
}
function shuffled(d, seed) {
  const random = rng(seed);
  for (let tries = 0; tries < 5000; tries++) {
    const order = Array.from({length: deckSize(d)}, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    if (!neighbourTriples(d, order).some(t => isTrio(d, ...t))) return order;
  }
  throw new Error(`no order for seed ${seed}`);
}

// The stuck eight of puzzle 10: four one-shape cards and four two-shape
// cards with no trio, every other card ruled out, and at most six of them in
// any nine with no trio (so at least two must go).
const nines = capsOfSize(3, 9).map(c => new Set(c));
const most = set => Math.max(...nines.map(k => set.filter(i => k.has(i)).length));
const countProfile = set => [0, 1, 2].map(v => set.filter(i => digits(3, i)[2] === v).length).join('/');
const stuckEight = capsOfSize(3, 8).find(c => blockedSet(3, c).size === 19 && countProfile(c) === '4/4/0' && most(c) === 6);
assert.ok(stuckEight, 'a stuck eight with four one-shape and four two-shape cards, six at most in a nine');

const TRIO9 = 'A trio is three different tiles whose shapes are all the same or all different, and whose fills are all the same or all different. Where the tiles sit doesn’t matter.';
const TRIO27 = 'A trio is three different cards whose shapes, fills and counts are each all the same or all different. Where the cards sit doesn’t matter.';
const CANT = 'If you think it can’t be done, make a full try, press Can’t and tap a trio in it. Can’t is checked.';
const RULES = {
  complete: d => [d === 2 ? TRIO9 : TRIO27, `Two ${d === 2 ? 'tiles' : 'cards'} are ringed. Tap a ${d === 2 ? 'tile' : 'card'} that makes a trio with them. After a wrong tap, a row for each attribute shows ✓ when it is all the same or all different and ✗ when two are the same.`],
  through: [TRIO9, 'One tile is ringed. Tap two other tiles to make a trio with it; each trio found is drawn. Press That’s all when you think none is left. It says if there is another.'],
  split: [TRIO9, 'Tap a tile to put it in the next tray, and tap a tile in a tray to take it out. When the three trays hold three trios, the split is kept and the trays empty. Press That’s all when you think none is left. It says if there is another.'],
  four: [TRIO9, 'Tap tiles to choose them, and again to put them back. When as many are chosen as the dots show, a trio among them is reported but not shown.', CANT],
  dim: [TRIO27, 'Tap cards to choose them, and again to put them back. A card that would make a trio with two chosen cards is dimmed; tap it to see which two.'],
  colours: [TRIO9, 'Tap a tile to change its colour. When every tile is coloured, a trio all one colour is reported but not shown.', 'If you think it can’t be done, colour all nine, press Can’t and tap a trio all one colour. Can’t is checked.'],
  counts: [TRIO27, 'Each tile is a card with one, two or three of its shape. Tap a tile to change how many. Three tiles that make a trio as cards are drawn.'],
  game: [TRIO9, 'You and the app take turns claiming a tile; you go first. Whoever first owns a trio among their own tiles loses. Tiles you own are yellow, theirs blue.']
};
const CONTROLS = {
  complete: 'Tap a tile or card. Undo takes back a wrong tap.',
  through: 'Tap two tiles. Tap a picked tile again to put it back. Press That’s all when you are sure. Undo takes back the last tap.',
  split: 'Tap a tile to put it in the next tray with room. Tap a tile in a tray to take it out. Press That’s all when you are sure. Undo takes back the last tap.',
  cap: 'Tap a tile to choose it, and tap it again to put it back. The dots show how many to choose. To claim it can’t be done, choose that many, press Can’t and tap three tiles that make a trio. Undo takes back the last tap.',
  dim: 'Tap a card to choose it, and tap it again to put it back. Tap a dimmed card to light the two chosen cards that rule it out. The dots show how many to choose. Undo takes back the last tap.',
  colours: 'Tap a tile to change its colour. To claim it can’t be done, colour all nine, press Can’t and tap three tiles that make a trio all one colour. Undo takes back the last tap.',
  counts: 'Tap a tile to give it one more shape, from three back to one. Undo takes back the last tap.',
  game: 'Tap a tile to claim it; the app answers at once. Undo takes back your last turn and the app’s answer.',
  playground: 'Choose 9, 27 or 81 cards. Tap a card to choose it, and tap it again to put it back. Dimmed cards would make a trio with two chosen cards; tap one to light those two. Clear puts every card back.'
};
const PREREQ = {
  nine: 'Tell circles, triangles and squares apart, and open, striped and solid fills, and judge the two separately. No reading; a grown-up can read How to play.',
  cards: 'Judge three attributes at once: shape, fill and how many shapes (one to three). A grown-up can read How to play.',
  find: 'Keep what has been found in mind and decide when none is left. No arithmetic.',
  cant: 'Try several times before deciding something can’t be done, and point to the trio that proves a try fails.',
  game: 'Take turns, and look ahead one move: which tile would give you a trio?'
};
const sources = ['trios-week36', 'trios-bonus36', 'trios-card36', 'trios-carney'];
const name9 = list => list.map(k => tileName(T[k]));

const PUZZLES = [
  {number: 1, level: 'easy', title: 'Third tile', mode: 'complete', deck: 2, pairs: [['CO', 'CH'], ['CO', 'TO'], ['CH', 'TF'], ['TH', 'SO']], check: ['CF', 'SO', 'SO', 'CF'], prereq: 'nine',
    objective: 'Tap the tile that makes a trio with the two ringed tiles, for four pairs in turn.', visible: 'Tap the tile that makes a trio.',
    idea: 'Two tiles decide the third: keep what they share, and where they differ take the value that is missing.',
    hints: ['Look at the two shapes first, then at the two fills.', 'If the two shapes are the same, the third tile has that shape too. If they differ, it has the missing shape. Fills work the same way.', 'The open and striped circles need the solid circle.'],
    parent: {notice: 'Whether your child judges shapes and fills separately or looks for a tile that “goes with” the pair. After a wrong tap the ✗ row shows which attribute fails.', prompt: 'Could two ringed tiles have two different third tiles?', explanation: 'Attribute by attribute the rule leaves no choice: the same value where the two agree, the missing value where they differ. So any two different tiles have exactly one third tile, and it is always one of the nine. The four pairs are the worksheet’s: same shape, same fill, and two that differ in both.', extension: 'Take turns choosing two tiles for each other and racing to the third.', connection: 'With the values written 0, 1, 2, the third tile is −(x + y) mod 3 in each attribute. The nine tiles are the points of the plane over the integers mod 3, trios are its lines, and two points lie on exactly one line.'},
    provenance: 'Week 36 Problem 1 in every band: its four pairs in page order (open + striped circle, open circle + open triangle, striped circle + solid triangle, striped triangle + open square).'},
  {number: 2, level: 'easy', title: 'Through one tile', mode: 'through', deck: 2, centre: 'CO', check: {count: 4}, prereq: 'find',
    objective: 'Find every trio that uses the ringed tile. Press That’s all when none is left.', visible: 'Find every trio with the ringed tile.',
    idea: 'The eight other tiles pair off: each pair makes one trio with the ringed tile, so there are four.',
    hints: ['Pick any other tile. Which tile makes a trio with it and the ringed tile?', 'A tile already in a trio with the ringed tile can’t be in a second one.', 'When every other tile is in a trio with the ringed tile, there are no more.'],
    parent: {notice: 'Whether your child sees that a tile already used can’t make another trio with the ringed tile.', prompt: 'How do you know there isn’t a fifth trio?', explanation: 'Any other tile has exactly one partner that completes a trio with the open circle. So the eight other tiles fall into four pairs, one trio each: 8 ÷ 2 = 4. Two trios through the open circle can’t share another tile, or that pair would have two third tiles. The four trios are the striped and solid circles, the open triangle and square, the striped triangle and solid square, and the solid triangle and striped square.', extension: 'Is it four for every tile? Try another in the playground’s nine.', connection: 'Every point of the plane of order 3 lies on (9 − 1) ÷ 2 = 4 lines.'},
    provenance: 'Week 36 Grades 4–5 Problem 3, Grades 2–3 Problem 4 and K–1 Problem 4 (every three through one chosen tile); the open circle is the guide’s example (p. 3).'},
  {number: 3, level: 'easy', title: 'Four with no trio', mode: 'cap', deck: 2, target: 4, can: true, check: {possible: true}, prereq: 'nine',
    objective: 'Choose four tiles with no trio among them.', visible: 'Choose four tiles with no trio.',
    idea: 'Two shapes with two fills, such as the open and striped circles and triangles, hold no trio.',
    hints: ['Choose two tiles. Which tile would make a trio with them? Keep it out.', 'Try using only two shapes and only two fills.', 'The open circle, striped circle, open triangle and striped triangle hold no trio.'],
    parent: {notice: 'Whether your child, told “There is a trio.”, hunts for it and swaps one tile, or starts again.', prompt: 'Why do the open and striped circles and triangles hold no trio?', explanation: 'Any three of them have two of one shape or two of one fill, because only two shapes and two fills are used. Of the 126 ways to choose four tiles, 54 hold no trio. Can’t is here too: it is refused, because four is possible.', extension: 'Puzzle 5 asks for five.', connection: 'A set of points with no line is a cap. Four is the largest cap in the plane of order 3.'},
    provenance: 'Week 36 K–1 Problem 3 and Grades 2–3 Problem 3 (keep as many tiles as you can without an allowed three).'},
  {number: 4, level: 'medium', title: 'Every split', mode: 'split', deck: 2, check: {count: 4}, prereq: 'find',
    objective: 'Split the nine tiles into three trios, in every way there is. Press That’s all when none is left.', visible: 'Find every way to split the tiles into three trios.',
    idea: 'There are exactly four splits: by shape, by fill, and two where each trio has every shape and every fill once.',
    hints: ['Start with three trios that are easy to see.', 'Every split puts the open circle in one trio, and only four trios use it.', 'Put the open circle with the striped triangle and the solid square, and see what the other trays must hold.'],
    parent: {notice: 'Whether your child finds the two mixed splits, and notices that once two trays hold trios the last three tiles make a trio too.', prompt: 'How do you know there are no more splits?', explanation: 'In every split the open circle is in one trio, and only four trios use it. Once that trio is chosen the other two are forced: two trios with no tile in common change their attributes the same way, and each such family has exactly three trios. So the four trios through one tile give exactly four splits, and between them the twelve trios each appear once.', extension: 'Read a mixed split as a Latin square: shapes as rows, fills as columns, the tray as the symbol.', connection: 'The splits are the four parallel classes of the affine plane of order 3; the two mixed ones form a pair of orthogonal Latin squares of order 3, like Symbol Orchard’s.'},
    provenance: 'Week 36 Grades 4–5 Problem 4 (find every split, and explain why the list is complete); K–1 and Grades 2–3 Problem 2.'},
  {number: 5, level: 'medium', title: 'Five with no trio', mode: 'cap', deck: 2, target: 5, can: true, check: {possible: false}, prereq: 'cant',
    objective: 'Choose five tiles with no trio among them. If it can’t be done, choose five, press Can’t and tap a trio among them.', visible: 'Choose five tiles with no trio.',
    idea: 'Five tiles always hold a trio: their ten pairs need third tiles, and the four other tiles can complete at most two pairs each.',
    hints: ['Start from four tiles with no trio. Is there a fifth that makes no trio with two of them?', 'Each tile you add makes a trio with two you have.', 'Every five you try holds a trio. That trio is the reason.'],
    parent: {notice: 'Whether your child tries several fives before pressing Can’t, and notices that from four tiles with no trio every other tile makes a trio.', prompt: 'Why can’t there be five?', explanation: 'Suppose five tiles held no trio. Each of their ten pairs has a third tile, and it must be one of the four others. Put each pair in the dish of its third tile. Two pairs in one dish can’t share a tile (that tile and the dish tile would have two third tiles), and five tiles hold at most two pairs with nothing in common, so four dishes take at most eight pairs, not ten. After a right Can’t the app draws the dishes for your child’s own five: none holds more than two, and the pairs left over lie inside a trio.', extension: 'From any three tiles with no trio exactly three tiles can be added, so choosing one tile at a time always stops at four, never sooner.', connection: 'Four is the largest cap in the plane of order 3. Counting pairs against their third points is the start of the arguments that bound caps in larger spaces.'},
    provenance: 'Week 36 Grades 4–5 Problem 2 (explain why a larger collection is impossible) and the guide’s ten pair markers in four dishes (p. 5).'},
  {number: 6, level: 'medium', title: 'Third card', mode: 'complete', deck: 3, pairs: [[['CO', 1], ['CO', 2]], [['CO', 1], ['TH', 2]], [['TH', 2], ['SH', 3]], [['CF', 1], ['SO', 1]]], check: [['CO', 3], ['SF', 3], ['CH', 1], ['TH', 1]], prereq: 'cards',
    objective: 'Tap the card that makes a trio with the two ringed cards, for four pairs in turn.', visible: 'Tap the card that makes a trio.',
    idea: 'A third attribute follows the same rule: one, two and three shapes are all different; two, two and two are all the same.',
    hints: ['Check the shapes, then the fills, then how many shapes.', 'Counts follow the same rule: the same count, or the missing one.', 'One open circle and two open circles need three open circles.'],
    parent: {notice: 'Whether your child scans all 25 cards or works out the third card attribute by attribute and then looks for it.', prompt: 'These two cards differ only in count. What must the third be?', explanation: 'With three attributes and the same rule for each, any two of the 27 cards still have exactly one third card. The second pair is the bonus page’s allowed example: an open circle, a striped triangle and a solid square with counts 1, 2 and 3. With counts 1, 1 and 2 the same three would not be a trio.', extension: 'How many trios use one card? (Thirteen: the other 26 cards pair off.)', connection: 'The 27 cards are the points of three-dimensional space over the integers mod 3, as in the card game SET, which adds a fourth attribute.'},
    provenance: 'Week 36 bonus Problem 3: numbered shape-fill tiles, with the number drawn as one, two or three shapes, and its two convention examples (1, 1, 2 not allowed; 1, 2, 3 allowed).'},
  {number: 7, level: 'medium', title: 'Two colours', mode: 'paint', values: 2, rule: 'mono', can: true, check: {possible: false}, prereq: 'cant',
    objective: 'Colour every tile yellow or blue so that no trio is all one colour. If it can’t be done, colour all nine, press Can’t and tap a trio all one colour.', visible: 'Colour every tile so no trio is all one colour.',
    idea: 'Each colour holds at most four tiles without a trio, and 4 + 4 < 9.',
    hints: ['Colour all nine, then look for a trio all one colour.', 'However you colour them, one colour has five tiles or more.', 'Every colouring you try leaves a trio all one colour. That trio is the reason.'],
    parent: {notice: 'Whether your child connects this with puzzle 5: a colour with five tiles holds a trio.', prompt: 'Why can’t two colours work?', explanation: 'The tiles of one colour may hold no trio, so each colour has at most four (puzzle 5). Two colours hold at most 4 + 4 = 8 tiles, and there are nine. None of the 512 colourings works, and even a five–four split leaves two one-colour trios. After a right Can’t the app lines up each colour’s tiles with room for four.', extension: 'Puzzle 8 allows three colours.', connection: 'Any two-colouring of the plane of order 3 has a one-colour line: the smallest case of a Ramsey-type fact about lines.'},
    provenance: 'Week 36 bonus Problem 2 (can you do it with only two counter colours?), with 9 > 4 + 4 from the bonus guide (p. 2).'},
  {number: 8, level: 'medium', title: 'Three colours', mode: 'paint', values: 3, rule: 'mono', can: true, check: {possible: true}, prereq: 'nine',
    objective: 'Colour every tile yellow, blue or red so that no trio is all one colour.', visible: 'Colour every tile so no trio is all one colour.',
    idea: 'Three colours work: for example four tiles with no trio in one colour, four in another, and one left.',
    hints: ['Give one colour to four tiles that hold no trio.', 'Then give a second colour to four more with no trio.', 'Make the open and striped circles and triangles yellow, the solid square red and the rest blue.'],
    parent: {notice: 'Whether your child builds one colour at a time, keeping each colour free of trios.', prompt: 'Can you do it with three tiles of each colour?', explanation: 'Each colour must hold no trio. Four, four and one works, and so do three of each (1,008 of the 3,762 colourings with named colours). The bonus guide’s witness (p. 2), in shape rows and fill columns, is red, red, blue / red, red, blue / blue, blue, green; here that is yellow, yellow, blue / yellow, yellow, blue / blue, blue, red. Can’t is here too: it is refused, because three colours are possible.', extension: 'Puzzle 11 is stricter: no trio all one count and none with three different counts.', connection: 'The fewest colours with no one-colour line is the chromatic number of the plane’s lines as a hypergraph: here 3.'},
    provenance: 'Week 36 bonus Problem 2 (using three colours).'},
  {number: 9, level: 'hard', title: 'Nine cards', mode: 'cap', deck: 3, target: 9, dim: true, check: {possible: true}, prereq: 'cards',
    objective: 'Choose nine of the 27 cards with no trio among them.', visible: 'Choose nine cards with no trio.',
    idea: 'Nine is the most, but choosing one card at a time sticks at eight more often than not; getting out means giving cards up.',
    hints: ['A dimmed card would make a trio with two you have. Tap it to see which two.', 'If every card is dimmed at eight, take some out and try again.', 'One open circle; two each of the striped and solid circles and the open triangle and square; three each of the striped and solid triangles and squares.'],
    parent: {notice: 'How often your child sticks at eight, and which cards they take out.', prompt: 'When you are stuck at eight, which cards are worth giving up?', explanation: 'At most nine of the 27 cards hold no trio, and 2,106 nines do. Choosing at random one card at a time sticks at eight about two times in three, and every stuck set has eight or nine cards. Each dimmed card lights the pair that rules it out, which shows the set is stuck.', extension: 'Puzzle 10 starts stuck at eight.', connection: 'Sets with no line are cap sets. The largest has 4 points in the plane, 9 in three dimensions and 20 in four (the 81 cards of the playground); Ellenberg and Gijswijt (2017) proved they grow much more slowly than 3ⁿ.'},
    provenance: 'Week 36 bonus Problem 3’s 27 numbered tiles, without its one-per-tile rule; the review card’s App fit (random choices stick at eight in 13,752 of 20,000 runs).'},
  {number: 10, level: 'hard', title: 'Stuck at eight', mode: 'cap', deck: 3, target: 9, dim: true, start: stuckEight, check: {possible: true, startMost: 6}, prereq: 'cards',
    objective: 'Choose nine of the 27 cards with no trio among them, starting from eight that are stuck.', visible: 'Choose nine cards with no trio.',
    idea: 'Four one-shape and four two-shape cards can rule out every three-shape card; reaching nine means giving up at least two.',
    hints: ['Every card is dimmed. Tap a few to see which pairs rule them out.', 'No three-shape card can join while these eight stay. Take two out.', 'At most six of these eight belong to any nine with no trio.'],
    parent: {notice: 'Whether your child takes out one card and tries again, or reasons about which cards rule out the most.', prompt: 'Why is every three-shape card ruled out here?', explanation: 'Each three-shape card is the third card of a one-shape and a two-shape card already chosen. These eight hold no trio and nothing can be added, yet no nine with no trio contains more than six of them, so at least two must go and three new cards come in.', extension: 'Find a stuck eight of your own in the playground.', connection: 'A complete cap that is not the largest: in three dimensions every complete cap has eight or nine points.'},
    provenance: 'New, from the review card’s App fit: a stuck eight, chosen so that at least two cards must go.'},
  {number: 11, level: 'hard', title: 'Counts', mode: 'paint', values: 3, rule: 'card', start: Array(9).fill(0), check: {possible: true}, prereq: 'cards',
    objective: 'Give every tile one, two or three shapes so that no three tiles make a trio as cards.', visible: 'Change counts until no trio is left.',
    idea: 'Every trio of tiles must end with exactly two counts alike: none all one count, none with three different counts.',
    hints: ['Every tile has one shape, so every trio is drawn. Change counts to break them.', 'No trio of tiles may have its counts all the same or all different.', 'One open circle; two each of the striped and solid circles and the open triangle and square; three each of the rest.'],
    parent: {notice: 'Whether your child sees that fixing one trio can make another, and starts to plan by groups of tiles.', prompt: 'Why can’t each count be used three times?', explanation: 'The tiles with one count must hold no trio, so each count is used at most four times; and no trio may use all three counts. Of the 19,683 ways to give counts, exactly 162 work, and every one uses one count once and the other two four times. The bonus guide’s design is count − 1 = x² + y² (mod 3), with shapes and fills numbered 0, 1, 2.', extension: 'Compare puzzle 8: every design here is also a three-colouring with no one-colour trio, but not the other way round.', connection: 'A design is a nine-card cap among the 27 with one card of each shape and fill, such as the quadric x² + y² over the integers mod 3.'},
    provenance: 'Week 36 bonus Problem 3 (one numbered version of every shape-fill tile, with no allowed three), with the numbers drawn as counts of shapes.'},
  {number: 12, level: 'hard', title: 'First to a trio loses', mode: 'game', deck: 2, check: {}, prereq: 'game',
    objective: 'Take turns with the app claiming tiles; you go first. Whoever first owns a trio among their own tiles loses. Win.', visible: 'Take turns with the app; the first to own a trio loses.',
    idea: 'The first player wins: claim any tile, then answer each tile they claim with the tile that makes a trio with it and your first tile.',
    hints: ['Your first tile can be any tile. Look at how it pairs up the other eight.', 'When they claim a tile, claim the one that makes a trio with theirs and your first tile.', 'With that answer you never own a trio, and they run out of safe tiles first.'],
    parent: {notice: 'Whether your child starts answering the app’s tile with its “opposite”, and whether a loss feels like information.', prompt: 'Why is the opposite tile always free when you need it?', explanation: 'Claim a tile c. Every other tile x has one opposite, the third tile of c and x, so the other eight fall into four opposite pairs. Answer each of their tiles with its opposite: you never hold both tiles of a pair, so you never own a trio through c, and a trio of yours away from c would mirror a trio of theirs made earlier. They lose by their third or fourth tile. The app plays its best: at your second turn the opposite is the only claim that keeps the win (later there are sometimes two or three).', extension: 'In the base packet’s game (Grades 2–3 and 4–5 Problem 5) both players add to one shared collection and whoever completes a trio loses: the fifth tile always completes one (every stuck set has four), so the second player wins however anyone plays.', connection: 'The opposite is the reflection through c, a symmetry of the plane of order 3 that maps trios to trios. The Week 36 guide cites Tanya Khovanova’s SET tic-tac-toe as a related game precedent, not as the same game.'},
    provenance: 'Week 36 bonus Problem 1 (private ownership, first to own an allowed three loses), with the app as the second player.'}
];
const id = n => `trios-${String(n).padStart(2, '0')}`;
const seedOf = n => 3600 + n * 17;

const out = PUZZLES.map(item => {
  const d = item.deck || 2;
  const q = {mode: item.mode, deck: d, order: shuffled(d, seedOf(item.number))};
  let solution;
  if (item.mode === 'complete') {
    q.pairs = item.pairs.map(pair => pair.map(x => d === 2 ? T[x] : card(...x)));
    const answers = q.pairs.map(([x, y]) => third(d, x, y));
    assert.deepEqual(answers, item.check.map(x => d === 2 ? T[x] : card(...x)), `${id(item.number)}: third ${d === 2 ? 'tiles' : 'cards'}`);
    solution = {answers, names: answers.map(i => cardName(d, i))};
  } else if (item.mode === 'through') {
    q.centre = T[item.centre];
    const pairs = throughPairs(q.centre);
    assert.equal(pairs.length, item.check.count, `${id(item.number)}: trios through the ringed tile`);
    solution = {pairs, names: pairs.map(k => k.split('.').map(Number).map(tileName))};
  } else if (item.mode === 'split') {
    const all = splits();
    assert.equal(all.length, item.check.count, `${id(item.number)}: splits`);
    solution = {splits: all.map(splitKey), names: all.map(s => s.map(t => t.map(tileName)))};
  } else if (item.mode === 'cap') {
    Object.assign(q, {target: item.target, can: Boolean(item.can), dim: Boolean(item.dim)});
    if (item.start) q.start = [...item.start];
    const caps = capsOfSize(d, item.target);
    assert.equal(caps.length > 0, item.check.possible, `${id(item.number)}: ${item.target} ${item.check.possible ? 'can' : 'can’t'} be done`);
    if (item.start) {
      assert.equal(triosIn(d, item.start).length, 0, `${id(item.number)}: the start holds no trio`);
      assert.equal(blockedSet(d, item.start).size + item.start.length, deckSize(d), `${id(item.number)}: the start is stuck`);
      assert.equal(most(item.start), item.check.startMost, `${id(item.number)}: at most ${item.check.startMost} of the start in any nine`);
    }
    solution = caps.length ? {witness: caps[0], names: caps[0].map(i => cardName(d, i)), count: caps.length} : {impossible: true};
  } else if (item.mode === 'paint') {
    Object.assign(q, {values: item.values, rule: item.rule, can: Boolean(item.can)});
    if (item.start) q.start = [...item.start];
    delete q.deck;
    const all = designs(item.values, item.rule);
    assert.equal(all.length > 0, item.check.possible, `${id(item.number)}: possible or not`);
    solution = all.length ? {witness: all[0], count: all.length} : {impossible: true};
  } else {
    // A winning line against the app: claim the first tile in order, then
    // answer each claim with its opposite.
    const turns = [q.order[0]];
    let you = 1 << q.order[0], app = 0;
    for (;;) {
      const a = appClaim(you, app); turns.push(a); app |= 1 << a;
      if (ownsTrio(app)) break;
      const o = opposite(q.order[0], a);
      assert.ok(winningClaims(you, app).includes(o), `${id(item.number)}: the opposite wins`);
      turns.push(o); you |= 1 << o;
    }
    solution = {turns, names: turns.map(tileName)};
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Trios', mechanic: 'trios', band: 'all', revision: 1, sourceDocument: 'docs/trios/README.md',
    parameters: q,
    objective: item.objective, visibleObjective: item.visible, instruction: item.objective,
    controls: `${d === 2 && item.rule !== 'card' ? 'A trio has three different tiles: the shapes are all the same or all different, and the fills are all the same or all different.' : 'A trio has three different cards: shapes, fills and counts are each all the same or all different.'} ${CONTROLS[item.mode === 'cap' ? (item.dim ? 'dim' : 'cap') : item.mode === 'paint' ? (item.rule === 'card' ? 'counts' : 'colours') : item.mode]}`,
    rules: item.mode === 'complete' ? RULES.complete(d) : item.mode === 'cap' ? (item.dim ? RULES.dim : RULES.four) : item.mode === 'paint' ? (item.rule === 'card' ? RULES.counts : item.can ? RULES.colours : RULES.colours.slice(0, 2)) : RULES[item.mode],
    idea: item.idea, prerequisites: PREREQ[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playground = {
  id: 'trios-playground', number: 0, title: 'Trios playground', difficulty_level: 'playground', familyTitle: 'Trios', mechanic: 'trios', band: 'playground', revision: 1, sourceDocument: 'docs/trios/README.md',
  parameters: {mode: 'playground', orders: {2: shuffled(2, 3601), 3: shuffled(3, 3602), 4: shuffled(4, 3603)}},
  objective: 'Choose as many cards as you can with no trio, from 9, 27 or 81 cards.', visibleObjective: '',
  instruction: 'Choose as many cards as you can with no trio, from 9, 27 or 81 cards.',
  controls: `A trio has three different cards: each attribute is all the same or all different. ${CONTROLS.playground}`,
  rules: ['A trio is three different cards whose shapes, fills, counts and (with 81 cards) colours are each all the same or all different. Where the cards sit doesn’t matter.', 'A card that would make a trio with two chosen cards is dimmed and can’t be chosen; tap it to light the two.'],
  idea: 'Free play: how many cards with no trio? Four of 9, nine of 27 and twenty of 81.',
  prerequisites: 'None for the nine; three or four attributes at once for the larger decks.',
  hints: ['Choose cards until every other card is dimmed. How many do you have?', 'With 27 cards, try for nine.', 'With 81 cards the most is twenty.'],
  parent: {notice: 'Whether your child aims for a big set or explores which cards rule out others.', prompt: 'When every card is dimmed, can you swap one card and keep going?', explanation: 'In the nine every stuck set has four tiles. In the 27 a stuck set has eight or nine cards. In the 81 the most is twenty, and random choices rarely get there (about 9 in 5,000 runs, the review card found).', extension: 'With 81 cards, how big a set can you reach without help?', connection: 'These are cap sets in dimensions 2, 3 and 4 over the integers mod 3; the 81 cards are the deck of the card game SET.', sourceIds: ['trios-card36', 'trios-bonus36', 'trios-carney']},
  provenance: 'The review card’s App fit: 81 cards, whose largest set with no trio has 20, as a playground; Week 36 bonus Problem 3’s 27 cards.'
};

const json = {
  title: 'Trios',
  version: 1,
  families: [{id: 'trios', title: 'Trios', mathematics: 'A card has two, three or four attributes with three values each: shape and fill for the nine tiles, then a count of one, two or three shapes for 27 cards, then an ink colour for 81. A trio is three different cards whose values are, attribute by attribute, all the same or all different: with values 0, 1, 2 that is a + b + c ≡ 0 (mod 3), so the cards are the points of affine space over the integers mod 3 and trios are its lines. Any two cards have exactly one third card. Among the nine tiles four trios pass through each tile, the twelve trios form exactly four splits, at most four tiles hold no trio (five tiles have ten pairs, and the four other tiles complete at most two each), and every stuck set has four. Among 27 cards the most is nine, though one-at-a-time choices often stick at eight. Two colours always leave a one-colour trio (4 + 4 < 9); three need not. In the game where the first to own a trio loses, the first player wins by answering every tile with its opposite through their first tile.'}],
  sources: [
    {id: 'trios-week36', title: 'Bellingham Math Circle — Week 36: Making threes (student packets K–1, 2–3 and 4–5, and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-36', kind: 'local curriculum'},
    {id: 'trios-bonus36', title: 'Week 36 bonus (W36-BONUS-v1): the avoidance game, ownership colours and numbered tiles, with its guide', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/lowell-math-circle-year-2/week-36/week-36-bonus.pdf', kind: 'local curriculum'},
    {id: 'trios-card36', title: 'Week 36 review card and math check (completion, splits, the four-tile maximum, the 27- and 81-card App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-36.md', kind: 'local curriculum'},
    {id: 'trios-carney', title: 'Julia Carney — SET and Finite Affine Geometry, University of Chicago REU (2021), sections 1–3 and section 5, pp. 15–16, as the Week 36 guide cites', url: 'https://www.math.uchicago.edu/~may/REU2021/REUPapers/Carney.pdf', kind: 'research'},
    {id: 'trios-khovanova', title: 'Tanya Khovanova — SET Tic-Tac-Toe (June 2020), a related game the Week 36 guide cites', url: 'https://blog.tanyakhovanova.com/2020/06/set-tic-tac-toe/', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
json.puzzles.at(-1).parent.sourceIds = [...sources, 'trios-khovanova'];
await writeFile(new URL('../dist/families/trios/trios.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${JSON.stringify(p.solution.names || p.solution.count || p.solution).slice(0, 110)}`).join('\n'));
