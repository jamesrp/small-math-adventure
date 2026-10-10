// Authoring list for the Gaps group in Meeting roads (worksheet Week 69, thin
// and fat road triangles). Draws each map from whole-number coordinates,
// computes every puzzle's routes, triangles, biggest gap and certificate with
// the mechanic's own search, checks them against the table in
// docs/gapflood/README.md, and writes dist/families/gapflood/gapflood.json.
// Run: node scripts/build-gapflood.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {SIDES, allRoutes, triangles, bestOf, coverOf, goodTriangles, gapAt, possible, certOf, columnSides, centreClaim, forcedCentre} from '../dist/families/gapflood/gapflood.js';

// A map from coordinates with y up, as on the worksheet: positions become
// percentages of a board 100 units wide, with `pad` units of margin (the same
// placing as Meeting roads' maps).
function place(coords, pad) {
  const xs = Object.values(coords).map(c => c[0]), ys = Object.values(coords).map(c => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (100 - 2 * pad) / (x1 - x0), height = (y1 - y0) * s + 2 * pad, r = n => Number(n.toFixed(2));
  return {aspect: r(100 / height), nodes: Object.fromEntries(Object.entries(coords).map(([id, [x, y]]) => [id, [r(pad + (x - x0) * s), r((pad + (y1 - y) * s) / height * 100)]]))};
}
const across = (x, y) => `${x} across, ${y} up`;
// A full grid of w × h dots, ids "xy", with (0, 0) at the bottom left.
function grid(w, h, pad) {
  const coords = {}, names = {}, roads = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { coords[`${x}${y}`] = [x, y]; names[`${x}${y}`] = across(x, y); }
  for (const id of Object.keys(coords)) {
    const [x, y] = coords[id];
    for (const next of [`${x + 1}${y}`, `${x}${y + 1}`]) if (coords[next]) roads.push([id, next]);
  }
  return {...place(coords, pad), roads, names};
}
const roadList = list => list.split(' ').map(r => r.split('-'));
// The worksheet's first tree (Week 69 page 1), coordinates as drawn there.
const TREE = {a: [0, 0], b: [1, 0], c: [2, 0], d: [3, 0], e: [4, 1], f: [4, -1], g: [2, 1], h: [2, 2], i: [1, -1], j: [0, -1], k: [3, 2], l: [0, 1]};
// A ring of twelve dots, placed and named like a clock face.
function ring() {
  const ids = Array.from({length: 12}, (_, i) => `h${i || 12}`), nodes = {}, names = {};
  ids.forEach((id, i) => { const t = (i / 12) * 2 * Math.PI - Math.PI / 2; nodes[id] = [Number((50 + 41 * Math.cos(t)).toFixed(2)), Number((50 + 41 * Math.sin(t)).toFixed(2))]; names[id] = `${i || 12} o’clock`; });
  return {aspect: 1, nodes, names, roads: ids.map((id, i) => [id, ids[(i + 1) % 12]])};
}
const ladder = () => { const m = grid(8, 2, 6); return {...m, columns: Object.fromEntries(Object.keys(m.nodes).map(id => [id, Number(id[0])]))}; };
export const MAPS = {
  grid2: {...grid(3, 3, 13), kind: 'grid', small: true},
  grid4: {...grid(5, 5, 9), kind: 'grid'},
  grid6: {...grid(7, 7, 7), kind: 'grid', scale: 0.72},
  tree: {...place(TREE, 9), roads: roadList('a-b b-c c-d d-e d-f c-g g-h h-k b-i i-j a-l'), names: Object.fromEntries(Object.entries(TREE).map(([id, [x, y]]) => [id, across(x, y + 1)])), kind: 'tree'},
  ladder: {...ladder(), kind: 'ladder', scale: 0.72},
  ring: {...ring(), kind: 'ring'}
};
const homesOf = list => Object.fromEntries(list.split(' ').map((id, k) => [['A', 'B', 'C'][k], id]));

const RULES = [
  'Each road is one step. Draw a shortest route between each two homes: AB, BC and CA. Only steps that keep a route shortest are allowed, and routes may share roads.',
  'A dot’s gap is the fewest steps from it to another route, along any roads. A dot on two routes has gap 0.',
  'When all three routes are drawn, tap a dot on a route to flood it: the light spreads one step at a time until it meets another route, and the number is the gap.'
];
const CLAIM = {
  reach: 'Press Can’t if no choice of shortest routes gives that gap.',
  tree: 'On a tree, Can’t needs one more tap: the dot where all three routes meet.',
  best: 'Flood the biggest gap you can make and press Best. If a bigger gap is possible, it says so.'
};
const CONTROLS = 'Tap AB, BC or CA to choose a route. Tap a tinted dot next to its end, or the road between, or slide along the dots, to draw it; when it reaches its home the next route starts there. Tap a dot already on the route to take it back to there. When all three are drawn, tap a dot on a route to flood it; to change a route, tap its button first. Arrow keys draw too. Undo takes back the last move.';
const objective = item => item.goal === 'zero' ? 'Draw a shortest route between each two homes so that every gap is 0.'
  : item.goal === 'best' ? 'Draw a shortest route between each two homes to make the biggest gap you can, flood it and press Best.'
  : `Draw a shortest route between each two homes and flood a dot with a gap of ${item.k} or more. If no shortest routes give one, press Can’t.`;
const visible = item => item.goal === 'zero' ? 'Make every gap 0.' : item.goal === 'best' ? 'Make the biggest gap you can.' : `Make a gap of ${item.k} or more.`;
const PREREQUISITES = {
  draw: 'Count steps along roads and see when a route could be shorter. Reading: one short goal and the letters A, B and C; a grown-up can read them and How to play.',
  tree: 'Follow a road from one dot to the next. Reading: one short goal; a grown-up can read it.',
  plan: 'Plan three routes at once and compare a dot’s distance to two other routes. Counting to 6.'
};
const sources = ['gapflood-week69', 'gapflood-card69', 'gapflood-ggt'];

// check: route counts [AB, BC, CA], triangles, the biggest gap any triangle
// has, how many triangles reach the goal, the farthest dot from a home, and
// the dots with the biggest gap (best puzzles).
const PUZZLES = [
  {number: 1, level: 'easy', title: 'First gap', goal: 'reach', k: 1, map: 'grid2', homes: '00 20 22', prereq: 'draw',
    check: {routes: [1, 1, 6], triangles: 6, best: 2, good: 5, cover: 2},
    witness: {CA: '22 12 02 01 00', flood: '02'},
    idea: 'A route that bends away from the other two leaves a gap; the one through B leaves none.',
    hints: ['AB and BC have only one shortest route each. Where can CA go?', 'Keep CA away from B.', 'Draw CA along the top and down the left, then flood the top left corner.'],
    parent: {notice: 'Whether your child draws CA through B first (every gap 0) and then looks for another way round.', prompt: 'Which dot of CA is farthest from AB and BC? How many steps is it?', explanation: 'A, B and C are three corners of the 2 × 2 map. AB must run along the bottom and BC up the right side: each is the only shortest route. CA has six shortest routes, each two steps left and two down in some order. Only the one through B keeps every gap 0; the other five give a gap of 1 or 2. Along the top and down the left, the top left corner is two steps from A and two from C, the nearest dots of AB and BC, so its gap is 2.', extension: 'What is the biggest gap on this map? (2, in the top left corner: no dot is more than two steps from a home.)', connection: 'Three homes with a chosen shortest route between each two make a geodesic triangle, and the biggest gap measures how thin it is (Druţu and Kapovich, Definition 11.1).'},
    provenance: 'Week 69 Problem 3, the 2 × 2 map, asked for a gap of 1 as a first try at drawing and flooding.'},
  {number: 2, level: 'easy', title: 'The tree', goal: 'reach', k: 1, map: 'tree', homes: 'j e k', prereq: 'tree',
    check: {routes: [1, 1, 1], triangles: 1, best: 0, good: 0, cover: 4},
    witness: {claim: 'cant', at: 'c'},
    idea: 'On a tree there is one route between two homes, and the three routes overlap as a tripod: every gap is 0.',
    hints: ['Draw the three routes. Did you ever have a choice?', 'Every road you drew is on two routes.', 'No gap can be 1 or more here. Press Can’t and tap where all three routes meet.'],
    parent: {notice: 'Whether your child notices that only one dot is offered at each step, and that every road ends up with two colours.', prompt: 'Can you find a road that only one route uses?', explanation: 'In a tree there is exactly one route without turning back between two dots, since two would make a loop. So the triangle is forced. The three routes meet at one dot, the centre of a tripod (here the dot where the branch to C leaves the long road), and each leg, from a home to the centre, belongs to the two routes from that home. Every dot of a route is on a second route, so every gap is 0 and no choice gives a gap of 1. The same holds for any three homes on any tree: removing a road splits a tree in two, and either no route or exactly two routes cross it, so no road is on exactly one route (Problem 1’s question).', extension: 'Choose other homes on paper. Can any three homes on this tree give a gap? (No: all 220 choices make tripods.)', connection: 'Trees are 0-hyperbolic: every geodesic triangle in a tree is a tripod, 0-thin.'},
    provenance: 'Week 69 Problem 1, the first tree, with homes chosen for the app; Problem 5’s question, answered with Can’t.'},
  {number: 3, level: 'easy', title: 'Every gap 0', goal: 'zero', map: 'grid4', homes: '00 40 44', prereq: 'draw',
    check: {routes: [1, 1, 70], triangles: 70, best: 4, good: 1, cover: 4},
    witness: {CA: '44 43 42 41 40 30 20 10 00'},
    idea: 'Routes may share roads: CA can run along BC and AB and still be shortest.',
    hints: ['AB and BC have only one shortest route each. Can CA use them?', 'Down the right side and along the bottom is still 8 steps.', 'Draw CA down the right side and along the bottom.'],
    parent: {notice: 'Whether your child thinks CA must avoid the other routes. Sharing roads is allowed.', prompt: 'Is CA still a shortest route when it goes through B?', explanation: 'CA must take 4 steps left and 4 down, in any order: 70 routes. Down the right side and along the bottom is one of them, 8 steps, and every road of it is on BC or AB. Then every road is on two routes and every gap is 0: the triangle is a tripod whose centre is B, with one leg of no length. Only this one of the 70 gives every gap 0.', extension: 'Puzzle 4 has the same homes. What happens when CA goes the other way round?', connection: 'A tripod is the thinnest a triangle can be. Every map has some; thinness is about the fattest.'},
    provenance: 'Week 69 Problem 2, left map.'},
  {number: 4, level: 'medium', title: 'Same homes, a gap', goal: 'reach', k: 2, map: 'grid4', homes: '00 40 44', prereq: 'draw',
    check: {routes: [1, 1, 70], triangles: 70, best: 4, good: 53, cover: 4},
    witness: {CA: '44 34 24 14 04 03 02 01 00', flood: '04'},
    idea: 'The same homes give a thin or a fat triangle: the gap depends on the routes, not only on the homes.',
    hints: ['Keep CA far from AB and BC.', 'Try CA along the top and down the left side.', 'Draw CA along the top and down the left, then flood the top left corner.'],
    parent: {notice: 'Whether your child counts the gap along coloured roads only. The flood uses every road, uncoloured ones too, and often finds a shorter way.', prompt: 'Why is the top left corner’s gap 4 and not more?', explanation: '53 of CA’s 70 routes give a gap of 2 or more. Along the top and down the left, the top left corner needs at least 4 steps down to reach AB and at least 4 right to reach BC, so its gap is 4. A dot of any CA that is y up and x across is y steps from AB and 4 − x from BC, so no gap passes 4, and only that one route reaches it.', extension: 'On a bigger square with homes in three corners, what is the biggest gap? (The side of the square, so the gaps on the grid have no bound: Week 69 Problem 4.)', connection: 'Corner triangles of side n have a gap of n, so the gaps on the grid have no bound: the grid is not hyperbolic.'},
    provenance: 'Week 69 Problem 2, right map.'},
  {number: 5, level: 'medium', title: 'The ladder', goal: 'reach', k: 2, map: 'ladder', homes: '00 71 31', prereq: 'draw',
    check: {routes: [8, 1, 4], triangles: 32, best: 1, good: 0, cover: 3},
    witness: {claim: 'cant'},
    idea: 'However long the ladder, no gap reaches 2: two routes cross every column, and a column is one rung.',
    hints: ['Try for a gap of 2 the way you did on the grid.', 'Every route crosses each column between its homes.', 'No gap can be 2 here. Press Can’t.'],
    parent: {notice: 'Whether your child tries several places for the routes to cross from one rail to the other before pressing Can’t.', prompt: 'A dot on one route: how far can it be from the other routes?', explanation: 'A shortest route between two homes crosses every column between them, and no other. The homes are in columns 0, 3 and 7, so columns 0 to 3 lie between A and C and between A and B, and columns 3 to 7 between C and B and between A and B: two routes cross every column. A column is two dots joined by a rung, so a dot of one route is at most one step from a dot of another route in its column. Every gap is 0 or 1. The validator checks all 32 triangles of these homes, and every triangle of every three homes on ladders 3, 5 and 7 squares long: none has a gap of 2.', extension: 'Is there a ladder, however long, with a gap of 2? (No: the column argument works for every ladder.)', connection: 'A ladder is a thickened line, within one step of a tree, so its triangles stay thin (hyperbolic) however long it is. The grid’s do not.'},
    provenance: 'New, from the Week 69 review card’s App fit: ladders never beat 1, a contrast with Problem 2’s grid.'},
  {number: 6, level: 'medium', title: 'The ring', goal: 'best', map: 'ring', homes: 'h12 h6 h3', prereq: 'draw',
    check: {routes: [2, 1, 1], triangles: 2, best: 3, good: 1, cover: 3, at: ['h9']},
    witness: {AB: 'h12 h11 h10 h9 h8 h7 h6', flood: 'h9'},
    idea: 'Two homes opposite each other on a ring have two routes; the one away from the third home leaves a gap of 3.',
    hints: ['A and B are 6 steps apart either way round.', 'Send AB round the side away from C.', 'Draw AB round the left, flood 9 o’clock, then press Best.'],
    parent: {notice: 'Whether your child sends AB both ways round and compares.', prompt: 'Why can no dot have a gap of 4?', explanation: 'The ring has 12 dots. A (12 o’clock) and B (6 o’clock) are 6 steps apart both ways, so AB has two routes; BC and CA each have one, the short way through 5 and 4 and through 2 and 1. If AB goes through C’s side, the triangle is a tripod and every gap is 0. If it goes the other way, the 9 o’clock dot is 3 steps from A and 3 from B, the nearest dots of the other routes: gap 3. No gap can be bigger: every dot is within 3 steps of a home, and the other two routes of any dot hold all three homes. No three homes on this ring give more than 3.', extension: 'On a ring of 20 dots, what is the biggest gap? (5, a quarter of the way round.)', connection: 'A loop of n roads has triangles about n/4 thick: long loops make fat triangles, and a hyperbolic map has no long loops that cannot be shortcut.'},
    provenance: 'New, from the Week 69 review card’s App fit: a 12-road ring reaches 3.'},
  {number: 7, level: 'medium', title: 'Meeting roads’ homes', goal: 'zero', map: 'grid4', homes: '00 41 14', prereq: 'plan',
    check: {routes: [5, 20, 5], triangles: 500, best: 3, good: 2, cover: 3},
    witness: {AB: '00 10 11 21 31 41', BC: '41 31 21 11 12 13 14', CA: '14 13 12 11 10 00'},
    idea: 'Every gap is 0 exactly when the routes make a tripod, and its centre is the meeting dot of Meeting roads.',
    hints: ['Where would these three homes meet in Meeting roads?', 'All three routes pass the dot one right and one up from A.', 'Draw every route through the dot one right and one up from A, with AB and CA leaving A the same way.'],
    parent: {notice: 'Whether your child remembers Meeting roads puzzle 2, which has these homes, and looks for the meeting dot.', prompt: 'Why must all three routes pass the same dot?', explanation: 'On these maps every gap is 0 exactly when every road is on two routes (the validator checks every triangle), and then the routes make a tripod. Its centre is on a shortest route between each two homes: a meeting dot. These homes have one, one right and one up from A (Meeting roads puzzle 2), so all three routes pass it, and AB and CA must leave A along the same leg, first right or first up. Only 2 of the 500 triangles do.', extension: 'With the same homes, how big can a gap be? (3: puzzle 8.)', connection: 'The meeting dot is the median of the three homes; on this grid (the validator checks every triangle), a triangle with every gap 0 is a tripod centred there.'},
    provenance: 'New: Meeting roads puzzle 2’s homes (Week 67 Problem 1, left map), asked as Week 69 Problem 2 asks for every gap 0.'},
  {number: 8, level: 'hard', title: 'Same homes, fat', goal: 'best', map: 'grid4', homes: '00 41 14', prereq: 'plan',
    check: {routes: [5, 20, 5], triangles: 500, best: 3, good: 34, cover: 3, at: ['33', '44']},
    witness: {BC: '41 42 43 44 34 24 14', flood: '44'},
    idea: 'The homes of puzzle 7 also allow a gap of 3: send BC through the corner far from A.',
    hints: ['Which dot is far from all three homes?', 'BC may pass the top right corner.', 'Draw BC up the right side and along the top, flood the top right corner, then press Best.'],
    parent: {notice: 'Whether your child looks for a dot far from every home before drawing.', prompt: 'Why can no gap be 4?', explanation: 'The top right corner is 3 steps from B and 3 from C, and BC may pass it: 3 up, then 3 left, 6 steps. AB stays in the bottom two rows and CA in the left two columns, so both are at least 3 steps from that corner, and its gap is 3. No gap is bigger: every dot is within 3 steps of a home, and the other two routes of any dot hold all three homes. 34 of the 500 triangles reach 3, the others through the dot one in from the corner.', extension: 'Can you reach 3 with BC not passing the corner? (Yes: through the dot one in from it, 3 across and 3 up.)', connection: 'The gap measures the routes chosen, not the homes: puzzle 7 and this puzzle have the same homes.'},
    provenance: 'New, the same homes as puzzle 7: the review card’s “homes alone don’t fix the gap”.'},
  {number: 9, level: 'hard', title: 'Every route bends', goal: 'best', map: 'grid4', homes: '00 42 24', prereq: 'plan',
    check: {routes: [15, 6, 15], triangles: 1350, best: 3, good: 144, cover: 3, at: ['03', '30']},
    witness: {AB: '00 10 20 30 40 41 42', BC: '42 32 33 34 24', CA: '24 14 04 03 02 01 00', flood: '03'},
    idea: 'With every route free to bend, the biggest gap is 3, and no dot more than 3 steps from a home proves it.',
    hints: ['Which dots are 3 steps from two homes?', 'The dot 3 up the left side is 3 steps from A and from C.', 'Keep AB and BC away from the dot 3 up the left side, take CA through it, flood it and press Best.'],
    parent: {notice: 'Whether your child plans where the fat dot will be before drawing, or draws first and floods to look.', prompt: 'How do you know no gap can be 4?', explanation: 'All three routes have choices: 15, 6 and 15 routes, 1,350 triangles. The biggest gap is 3, only at the dot 3 up the left side or 3 along the bottom. For example AB along the bottom and up the right, BC through 3 across, 2 up and 3 across, 4 up, and CA along the top and down the left: the dot 3 up the left side is 3 steps from A and 3 from C and from BC’s nearest dots. Every dot is within 3 steps of a home, and the other two routes of any dot hold all three homes, so no gap passes 3. 144 of the 1,350 triangles reach it.', extension: 'Why does the other fat dot, 3 along the bottom, need AB to go along the bottom first?', connection: 'A bound on every triangle, here 3, is what “uniformly thin” asks for; on bigger grids it keeps growing.'},
    provenance: 'Week 69 Problem 3, middle map, with the homes of the review card’s fix 1 (0, 0; 4, 2; 2, 4).'},
  {number: 10, level: 'hard', title: 'A bigger grid', goal: 'best', map: 'grid6', homes: '00 61 16', prereq: 'plan',
    check: {routes: [7, 252, 7], triangles: 12348, best: 5, good: 74, cover: 5, at: ['55', '66']},
    witness: {AB: '00 10 20 30 40 50 60 61', BC: '61 62 63 64 65 66 56 46 36 26 16', CA: '16 06 05 04 03 02 01 00', flood: '66'},
    idea: 'Off the corners every route has choices, and the biggest gap is still pinned by how far a dot can be from every home.',
    hints: ['Which dots are far from all three homes?', 'The top right corner is 5 steps from B and 5 from C.', 'Draw BC up the right side and along the top, flood the top right corner, then press Best.'],
    parent: {notice: 'Whether your child looks for dots far from every home before drawing, as in puzzles 8 and 9.', prompt: 'Why can no gap be 6?', explanation: 'Every route has choices: 7 for AB, 252 for BC and 7 for CA, 12,348 triangles. The top right corner is 5 steps from B and 5 from C. AB stays in the bottom two rows and always ends at B, and CA stays in the left two columns and always starts at C, so when BC passes the corner its gap is 5, whatever AB and CA do. The dot one in from the corner also reaches 5, but only with AB along the bottom first and CA left along the top first. No gap can be 6: every dot is within 5 steps of a home, and the other two routes of any dot hold all three homes. 74 of the 12,348 triangles reach 5.', extension: 'Two more dots on that diagonal are 5 steps from every home. Why does neither ever have a gap of 5? (AB always passes straight below them, at most 4 steps down.)', connection: 'A bound on every triangle is what “uniformly thin” asks for. On this grid it is 5; on bigger grids it keeps growing (Week 69 Problem 4), so the grid is not hyperbolic.'},
    provenance: 'Week 69 Problem 3’s bottom map (the 6 × 6 grid) with new homes, off the corners so every route has choices, from the review of this port.'}
];

const id = n => `gapflood-${String(n).padStart(2, '0')}`;
const routeOf = (q, s, list) => list ? list.split(' ') : allRoutes(q, s)[0];
const out = PUZZLES.map(item => {
  const q = {goal: item.goal, ...(item.goal === 'reach' ? {k: item.k} : {}), ...MAPS[item.map], homes: homesOf(item.homes)};
  const c = item.check, tris = triangles(q), best = bestOf(q), name = id(item.number);
  assert.deepEqual(SIDES.map(s => allRoutes(q, s).length), c.routes, `${name}: routes`);
  assert.equal(tris.length, c.triangles, `${name}: triangles`);
  assert.equal(best, c.best, `${name}: the biggest gap`);
  assert.equal(goodTriangles(q).length, c.good, `${name}: triangles that reach the goal`);
  assert.equal(coverOf(q), c.cover, `${name}: the farthest dot from a home`);
  if (c.at) assert.deepEqual([...new Set(goodTriangles(q).flatMap(t => t.dots))].sort(), c.at, `${name}: where the biggest gap is`);
  // Certificates: Best needs every dot within the best of a home; Can't on a
  // tree or a ladder needs the tripod or the columns.
  if (item.goal === 'best') assert.equal(c.cover, best, `${name}: the homes' light covers the map in ${best} steps`);
  if (!possible(q)) {
    assert.ok(['tripod', 'columns'].includes(certOf(q)), `${name}: Can't has a certificate`);
    if (certOf(q) === 'tripod') { assert.equal(q.roads.length, Object.keys(q.nodes).length - 1, `${name}: a tree`); assert.ok(centreClaim(q) && forcedCentre(q) === item.witness.at, `${name}: Can’t is backed by a tap on the tripod’s centre`); }
    if (certOf(q) === 'columns') { assert.equal(item.k, 2); assert.ok(columnSides(q).every(col => col.sides.length >= 2), `${name}: two routes cross every column`); }
  }
  let solution;
  if (item.witness.claim) solution = {claim: 'cant', ...(item.witness.at ? {at: item.witness.at} : {}), best};
  else {
    const routes = Object.fromEntries(SIDES.map(s => [s, routeOf(q, s, item.witness[s])]));
    const t = tris.find(x => SIDES.every(s => JSON.stringify(x.routes[s]) === JSON.stringify(routes[s])));
    assert.ok(t, `${name}: the witness is a road triangle`);
    if (item.goal === 'zero') assert.equal(t.gap, 0, `${name}: the witness has every gap 0`);
    else assert.ok(gapAt(q, routes, item.witness.flood) >= (item.goal === 'best' ? best : item.k), `${name}: the witness floods a big enough gap`);
    solution = {routes, ...(item.witness.flood ? {flood: item.witness.flood, gap: gapAt(q, routes, item.witness.flood)} : {}), ...(item.goal === 'best' ? {claim: 'best'} : {}), best};
  }
  return {
    id: name, number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Meeting roads', libraryFamily: 'meeting', group: 'Gaps', mechanic: 'gapflood', band: 'all', revision: 1, sourceDocument: 'docs/gapflood/README.md',
    parameters: q,
    objective: objective(item), visibleObjective: visible(item), instruction: objective(item),
    controls: CONTROLS,
    rules: [...RULES, ...(CLAIM[item.goal] ? [CLAIM[item.goal]] : []), ...(centreClaim(q) ? [CLAIM.tree] : [])],
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const json = {
  title: 'Meeting roads gaps',
  version: 1,
  families: [{id: 'gapflood', title: 'Meeting roads gaps', mathematics: 'Three homes A, B and C sit on dots of a road map, every road one step, and a shortest route is chosen between each two: a road triangle. A dot on one route has a gap, the fewest steps from it along any roads to one of the other two routes; a dot on two routes has gap 0. The homes alone do not fix the gaps when shortest routes can be chosen in different ways. On a tree the routes are forced and meet as a tripod, so every gap is 0. On a ladder two routes cross every column and a column is one rung, so no gap passes 1, however long the ladder. On the square grid with homes in three corners of a square of side n, the corner opposite B has gap n, so the gaps have no bound; on any map a dot’s other two routes hold all three homes, so no gap passes the farthest a dot is from its nearest home. These are thin and fat geodesic triangles: trees and ladders are hyperbolic, the grid is not.', rules: RULES, sourceIds: sources}],
  sources: [
    {id: 'gapflood-week69', title: 'Bellingham Math Circle — Week 69: Thin and fat road triangles (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-69', kind: 'local curriculum'},
    {id: 'gapflood-card69', title: 'Week 69 review card and math check (trees, corner triangles, fix 1’s board, ladders and a ring of 12; App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-69.md', kind: 'local curriculum'},
    {id: 'gapflood-ggt', title: 'Cornelia Druţu and Michael Kapovich — Geometric Group Theory, American Mathematical Society (2018), Definitions 11.1–11.2 (geodesic triangles and uniformly thin triangles), printed page 363', url: 'https://www.math.ucdavis.edu/~kapovich/EPR/ggt.pdf', kind: 'research'}
  ],
  puzzles: out
};
await writeFile(new URL('../dist/families/gapflood/gapflood.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.goal}${p.parameters.k ? ` ${p.parameters.k}` : ''} best ${p.solution.best} ${p.solution.claim === 'cant' ? 'Can’t' : `gap ${p.solution.gap ?? 0}${p.solution.flood ? ` at ${p.solution.flood}` : ''}`}`).join('\n'));
