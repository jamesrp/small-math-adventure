// Authoring list for Meeting roads (worksheet Week 67). Draws each map from
// whole-number coordinates, computes every puzzle's meeting dots, pair
// distances and witness walks with the mechanic's own breadth-first search,
// checks them against the table in docs/meeting/README.md, and writes
// dist/families/meeting/meeting.json. Run: node scripts/build-meeting.mjs
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {meetingDots, distances, shortestRoute, closures, connected, PAIRS, WALKERS} from '../dist/families/meeting/meeting.js';

// A map from coordinates with y up, as on the worksheet: positions become
// percentages of a board 100 units wide, with `pad` units of margin.
function place(coords, pad) {
  const xs = Object.values(coords).map(c => c[0]), ys = Object.values(coords).map(c => c[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = (100 - 2 * pad) / (x1 - x0), height = (y1 - y0) * s + 2 * pad, r = n => Number(n.toFixed(2));
  return {aspect: r(100 / height), nodes: Object.fromEntries(Object.entries(coords).map(([id, [x, y]]) => [id, [r(pad + (x - x0) * s), r((pad + (y1 - y) * s) / height * 100)]]))};
}
const across = (x, y) => `${x} across, ${y} up`;
// A full grid of w × h dots, ids "xy", with (0, 0) at the bottom left.
function grid(w, h, pad, skip = []) {
  const coords = {}, names = {}, roads = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!skip.includes(`${x}${y}`)) { coords[`${x}${y}`] = [x, y]; names[`${x}${y}`] = across(x, y); }
  for (const id of Object.keys(coords)) {
    const [x, y] = coords[id];
    for (const next of [`${x + 1}${y}`, `${x}${y + 1}`]) if (coords[next]) roads.push([id, next]);
  }
  return {...place(coords, pad), roads, names};
}
const roadList = list => list.split(' ').map(r => r.split('-'));
const TREE = {a: [0, 0], u: [1, 0], v: [2, 0], w: [3, 0], b: [4, 1], t: [2, 1], c: [2, 2], s: [3, -1], r: [4, -1], q: [0, 1]};
const CUBE = {'000': [0, 0], '100': [3, 0], '110': [3, 3], '010': [0, 3], '001': [1.2, 1.1], '101': [4.2, 1.1], '111': [4.2, 4.1], '011': [1.2, 4.1]};
const cubeRoads = () => { const ids = Object.keys(CUBE), out = []; for (const a of ids) for (const b of ids) if (a < b && [...a].filter((d, i) => d !== b[i]).length === 1) out.push([a, b]); return out; };
export const MAPS = {
  grid3: {...grid(3, 3, 12), kind: 'grid', small: true},
  grid5: {...grid(5, 5, 9), kind: 'grid'},
  ring: {...grid(3, 3, 12, ['11']), kind: 'ring', small: true},
  tree: {...place(TREE, 9), roads: roadList('a-u u-v v-w w-b v-t t-c w-s s-r u-q'), names: Object.fromEntries(Object.entries(TREE).map(([id, [x, y]]) => [id, across(x, y + 1)])), kind: 'tree'},
  square: {...place({a: [0, 0], b: [1, 0], c: [1, 1], d: [0, 1]}, 16), roads: roadList('a-b b-c c-d d-a'), names: {a: 'bottom left', b: 'bottom right', c: 'top right', d: 'top left'}, kind: 'square', small: true},
  triangle: {...place({a: [0, 0], b: [2, 0], c: [1, 1.732]}, 14), roads: roadList('a-b b-c c-a'), names: {a: 'bottom left', b: 'bottom right', c: 'top'}, kind: 'triangle', small: true},
  crossroads: {...place({x: [0, 1], a: [1.6, 2], b: [1.6, 1], c: [1.6, 0], y: [3.2, 1]}, 12), roads: roadList('x-a x-b x-c y-a y-b y-c'), names: {x: 'left crossroads', y: 'right crossroads', a: 'top middle', b: 'middle', c: 'bottom middle'}, kind: 'crossroads', small: true},
  cube: {...place(CUBE, 10), roads: cubeRoads(), labels: Object.fromEntries(Object.keys(CUBE).map(id => [id, id])), names: Object.fromEntries(Object.keys(CUBE).map(id => [id, id])), scale: 1.15, kind: 'cube'}
};
const mapOnly = name => ({...MAPS[name]});
const homesOf = list => Object.fromEntries(list.split(' ').map((id, k) => [WALKERS[k], id]));

const RULES = {
  walk: [
    'Each road is one step. A shortest route between two dots takes the fewest steps.',
    'Each walker starts at its home. When all three stand on one dot, any two of their walks together make a route between their homes.',
    'The dot works when all three of those routes are shortest: it is a meeting dot. It may be a home, and then that walker stays at home.',
    'If one of the routes is too long, a dashed line shows a shorter route between those two homes.'
  ],
  every: 'Each meeting dot found gets a ring, and the walkers go home. Press That’s all when you think none is left. It says if there is another.',
  close: [
    'Each road is one step. A meeting dot for A, B and C is on a shortest route between each two of them. It may be a home.',
    'Tap a road to close it and again to open it. The map must stay in one piece.',
    'Press No dot works when you think no dot is a meeting dot. If one still is, it appears with a shortest walk to it from each home.'
  ]
};
const CONTROLS = {
  walk: 'Tap A, B or C to choose a walker. Tap a dot next to it, or the road between, to take a step, or slide along the dots. Tap the dot it just left to take that step back. Arrow keys move the chosen walker too. Undo takes back the last move.',
  close: 'Tap a road to close it, and tap it again to open it. The slot shows how many roads may be closed. Press No dot works when you are sure. Undo takes back the last change.',
  playground: 'Choose a map. Tap A, B or C to choose a walker, then tap or slide to walk it. Press Homes, then tap a home and another dot to move it there; press Homes again to walk.'
};
const OBJECTIVE = {
  meet: 'Bring the three walkers to one dot so that any two walks together make a shortest route between their homes.',
  every: 'Find every meeting dot: every dot where the three walkers can stand so that any two walks together make a shortest route between their homes. Press That’s all when none is left.',
  close: 'Close one road so that no dot is a meeting dot for A, B and C.'
};
const VISIBLE = {meet: '', every: 'Find every meeting dot.', close: 'Close one road so no dot works.'};
const PREREQUISITES = {
  grid: 'Count steps along roads and see when a route turns back. No reading; a grown-up can read How to play.',
  shape: 'Count steps along a few roads. No reading or arithmetic beyond counting to four.',
  cube: 'Read labels of three 0s and 1s and see which digit a road changes.',
  every: 'Keep the meeting dots already found in mind, and decide when none is left.',
  close: 'Think ahead about how closing one road changes the shortest routes. A grown-up can read the goal.'
};
const sources = ['meeting-week67', 'meeting-card67', 'meeting-ggt'];

const PUZZLES = [
  {number: 1, level: 'easy', title: 'First meeting', mode: 'meet', map: 'grid3', homes: '00 20 12', check: {answers: ['10'], pairs: [2, 3, 3]}, prereq: 'grid',
    idea: 'The meeting dot is where the homes’ shortest routes can overlap, not the middle of the board.',
    hints: ['Where would A and B meet on their way to each other?', 'A and B are two steps apart along the bottom. C has to come down to them.', 'Move A one step right, B one step left and C two steps down.'],
    parent: {notice: 'Whether your child walks all three to the middle of the board first. The middle is two steps up and back for A and B, which is too long.', prompt: 'Why can’t the meeting dot be in the middle of the board?', explanation: 'A and B are 2 steps apart, and their only shortest route is along the bottom, so the meeting dot is on the bottom row. C is 3 steps from each of them, and the bottom dot right below C is on a shortest route from C to both. The walks are one step for A, one for B and two for C; joined in pairs they take 2, 3 and 3 steps, the fewest possible.', extension: 'In the playground, put C in a top corner of a small square of the grid. Where do they meet now? (At A’s or B’s home: that walker stays put.)', connection: 'A meeting dot is a median of the three homes: a point on a shortest path between each two of them.'},
    provenance: 'New, a 3×3 warm-up before Week 67 Problem 1: every walk is short and the answer is not the middle of the board.'},
  {number: 2, level: 'easy', title: 'Middle and middle', mode: 'meet', map: 'grid5', homes: '00 41 14', check: {answers: ['11'], pairs: [5, 5, 6]}, prereq: 'grid',
    idea: 'On a full grid the meeting dot is in the middle of the homes’ three columns and the middle of their three rows.',
    hints: ['Where would the walkers meet if there were only A and B?', 'A shortest route from A to B only goes right and up. Which of those dots is also on a shortest route to C?', 'The meeting dot is one step right and one step up from A.'],
    parent: {notice: 'Whether your child plans a meeting place before walking, or walks first and adjusts.', prompt: 'When a dot fails: why does this dot work for A and B but not for C?', explanation: 'On a full grid the steps between two dots are the steps across plus the steps up. A dot is on a shortest route between two homes exactly when its column is between theirs and its row is between theirs. The homes’ columns are 0, 4 and 1, and only the middle one, 1, is between each two of them; their rows are 0, 1 and 4, with middle 1. So the dot one right and one up from A is the only meeting dot. Joined in pairs, the walks take 2 + 3, 2 + 3 and 3 + 3 steps: 5, 5 and 6, the distances between the homes.', extension: 'Move one home in the playground. Can you say where the meeting dot goes before the walkers get there?', connection: 'The grid is a product of two paths, and its medians are taken one coordinate at a time (Druţu and Kapovich, Examples 6.19).'},
    provenance: 'Week 67 Problem 1, left board.'},
  {number: 3, level: 'easy', title: 'The tree', mode: 'meet', map: 'tree', homes: 'a b c', check: {answers: ['v'], pairs: [4, 4, 4]}, prereq: 'shape',
    idea: 'On a tree the three paths between the homes share exactly one dot, where they branch.',
    hints: ['Follow the only path from A to B. Where does C’s path join it?', 'A walk into a side branch has to come back out, so a shortest walk never uses one.', 'Each walker takes two steps, to the dot where C’s branch meets the long path.'],
    parent: {notice: 'Whether your child walks into a side branch. Those branches are decoys: a walk into one must come back.', prompt: 'Is there any other way from A to B? What does that mean for the meeting dot?', explanation: 'In a tree there is exactly one path between two dots, since two different paths would make a loop. So the meeting dot must be on all three paths, A to B, A to C and B to C. Together they make a tripod: three legs joined at one dot, here the junction below C, two steps from each home. Each pair of homes is four steps apart, and two walks of two steps make four.', extension: 'In the playground, put the three homes along one path of the tree. Where is the meeting dot? (At the middle home: one leg of the tripod has no steps.)', connection: 'Every tree is a median graph, and the median of three vertices is the centre of their tripod.'},
    provenance: 'Week 67 Problem 3, the tree, with its two decoy branches.'},
  {number: 4, level: 'easy', title: 'Stay at home', mode: 'meet', map: 'square', homes: 'a b c', check: {answers: ['b'], pairs: [1, 2, 1]}, prereq: 'shape',
    idea: 'The meeting dot can be a home; that walker stays where it is.',
    hints: ['Could a walker stay at home?', 'A and C are two steps apart, through B or through the empty corner.', 'Walk A one step to B and C one step down to B. B stays at home.'],
    parent: {notice: 'Whether your child tries the empty corner. It is on a shortest route from A to C, but three steps out of the way for A to B and for B to C.', prompt: 'Why doesn’t the empty corner work?', explanation: 'A and C are two steps apart, through B or through the empty corner. A to B and B to C are single roads, and the empty corner is not on either. B is on all three: A to B takes 1 step, B to C 1 step, and A to C through B 2 steps. B’s walker stays at home.', extension: 'Put three homes on three corners of the square some other way. Which corner works? (Always the one next to the other two.)', connection: 'A square of four roads is a median graph (a 2 × 2 grid); the median of three of its corners is the middle one.'},
    provenance: 'Week 67 Problem 3, the square.'},
  {number: 5, level: 'medium', title: 'On the edge', mode: 'meet', map: 'grid5', homes: '03 40 44', check: {answers: ['43'], pairs: [7, 5, 4]}, prereq: 'grid',
    idea: 'The middle-column, middle-row rule still works when the meeting dot is on the edge.',
    hints: ['Which column is in the middle of the homes’ columns? Which row is in the middle of their rows?', 'B and C are both in the right-hand column, so that is the middle column.', 'The meeting dot is on the right edge, in A’s row.'],
    parent: {notice: 'Whether your child looks for a dot in the middle of the board first.', prompt: 'Why must the meeting dot be in the right-hand column?', explanation: 'B and C are both in the right-hand column, so every shortest route between them stays in that column, and the meeting dot is there. Its row must be between each two of the homes’ rows, 3, 0 and 4: only the middle one, 3. So the dot on the right edge in A’s row is the only meeting dot. Joined in pairs the walks take 4 + 3 = 7, 4 + 1 = 5 and 3 + 1 = 4 steps, the distances between the homes.', extension: 'If A moved one row down, where would they meet? (On the right edge, one row lower.)', connection: 'Coordinate medians in a product of paths, as in puzzle 2.'},
    provenance: 'Week 67 Problem 1, right board.'},
  {number: 6, level: 'medium', title: 'Cube labels', mode: 'meet', map: 'cube', homes: '000 110 101', check: {answers: ['100'], pairs: [2, 2, 2]}, prereq: 'cube',
    idea: 'On the cube the meeting label has, in each place, the digit that most homes have there.',
    hints: ['Each road changes one digit. In how many places do 000 and 110 differ?', 'Each pair of homes is two steps apart. Look for a label one step from each.', 'Each walker takes one step, to 100.'],
    parent: {notice: 'Whether your child compares labels digit by digit, or tries dots one at a time.', prompt: 'Two homes have a 1 in the first place. Could the meeting label have a 0 there?', explanation: 'A road changes one digit, so the steps between two labels are the places where they differ. A shortest route between two homes never changes a digit where they agree, so wherever two homes agree, the meeting label agrees with them. In each place at least two of the three homes agree, and the meeting label takes that majority digit: 1, 0 and 0, so 100. It is one step from each home, and each pair of homes is two steps apart.', extension: 'Choose three labels in the playground and say the meeting label before walking.', connection: 'The cube is the 2 × 2 × 2 grid, and the majority of three digits is their middle value, so this is the grid’s rule again. In every hypercube the median of three vertices is their bitwise majority.'},
    provenance: 'Week 67 Problem 4, left map.'},
  {number: 7, level: 'medium', title: 'Not next to all three', mode: 'meet', map: 'cube', homes: '000 001 111', check: {answers: ['001'], pairs: [1, 3, 2]}, prereq: 'cube',
    idea: '“The label next to all three homes” is not the rule; the majority digit in each place is.',
    hints: ['Look at each digit place on its own.', 'In the first two places most homes have 0. In the last place most have 1.', 'The meeting label is 001, B’s home: B stays, A takes one step and C takes two.'],
    parent: {notice: 'A child who solved puzzle 6 may look for a label next to all three homes. There is none here: 111 is three steps from 000.', prompt: 'Which label is next to both 000 and 111? (None: they differ in every place.)', explanation: 'The majority digits are 0, 0 and 1, so the meeting label is 001, B’s home. A walks one step, 000 to 001; C walks two, 111 to 011 to 001 or through 101. Joined in pairs: A to B 1 step, A to C 1 + 2 = 3, B to C 0 + 2 = 2, each the fewest possible.', extension: 'Can the meeting label ever be two steps from every home? (No: in each place at most one home differs from the majority, so the three homes differ from it in at most three places altogether.)', connection: 'The bitwise majority is the median in every hypercube.'},
    provenance: 'New, from the Week 67 review card’s fix 3: Problem 4’s homes are each next to its answer, so this triple, whose meeting label is not next to 111, breaks the idea “the dot next to all three”.'},
  {number: 8, level: 'medium', title: 'Is there a second?', mode: 'every', map: 'grid5', homes: '04 30 43', check: {answers: ['33'], pairs: [7, 5, 4]}, prereq: 'every',
    idea: 'On a full grid there is never a second meeting dot.',
    hints: ['Is there a second one?', 'Try a dot next to the one you found. Which two homes does it fail?', 'Only one dot works. Find it, then press That’s all.'],
    parent: {notice: 'After the first meeting dot, whether your child tests the dots around it or trusts the rule.', prompt: 'How do you know there isn’t another?', explanation: 'The meeting dot’s column must be between each two of the homes’ columns, 0, 3 and 4: only column 3 is. Its row must be between each two of 4, 0 and 3: only row 3. So one dot works. The validator checks all 2,300 ways to put three homes on different dots of this grid, and each has exactly one meeting dot.', extension: 'Can you place three homes on the full grid so that two dots work? (No: the column and the row are each forced, as above.)', connection: 'Medians in median graphs are unique; on the grid that is the uniqueness of the middle of three numbers.'},
    provenance: 'Week 67 Problem 2’s question “Can you make more than one work?”, asked of one placement.'},
  {number: 9, level: 'hard', title: 'Two crossroads', mode: 'every', map: 'crossroads', homes: 'a b c', check: {answers: ['x', 'y'], pairs: [2, 2, 2]}, prereq: 'every',
    idea: 'On other maps there can be more than one meeting dot.',
    hints: ['Each home is two steps from each other home. Where can two such steps meet?', 'Each crossroads is one road from every home.', 'Walk all three to one crossroads, then all three to the other, then press That’s all.'],
    parent: {notice: 'After finding one crossroads, whether your child expects it to be the only one, as on the grid.', prompt: 'Why does the grid have one meeting dot and this map two?', explanation: 'Every pair of homes is two steps apart, through either crossroads. Each crossroads is one step from all three homes, so it is on a shortest route for every pair: both work. No home works, since a route from one home through another to the third takes four steps. On a grid the shortest routes of the three pairs share only one dot; here they can share either crossroads.', extension: 'If the road from A to the left crossroads were closed, how many meeting dots would be left? (One: the right crossroads.)', connection: 'This map, the complete bipartite graph K(2, 3), is not a median graph: its three homes have two medians.'},
    provenance: 'New, from the Week 67 review card’s fix 7: two crossroads each joined to A, B and C.'},
  {number: 10, level: 'hard', title: 'The triangle', mode: 'every', map: 'triangle', homes: 'a b c', check: {answers: [], pairs: [1, 1, 1]}, prereq: 'every',
    idea: 'On a triangle no dot works: each home is off the road between the other two.',
    hints: ['Try each dot in turn: which pair is not on a shortest road through it?', 'Every pair of homes is one road apart. A route through the third dot takes two.', 'No dot works. Press That’s all.'],
    parent: {notice: 'Whether your child tries all three dots before pressing That’s all.', prompt: 'Every dot here is a home. Why doesn’t any home work?', explanation: 'Each pair of homes is joined by one road, its only shortest route. A meeting dot must be on all three roads, and no dot is: A is not on the road from B to C, and so on. Every dot has the same total travel from the homes, two steps, so choosing the least total travel would pick every dot; it is a different test, and here it gives no meeting dot.', extension: 'Imagine a fourth dot in the middle joined to all three corners. Does it work? (No: a route through it takes two steps, and each pair is one step apart.)', connection: 'A triangle is not a median graph, and outside median graphs a median can fail to exist.'},
    provenance: 'Week 67 Problem 3, the triangle.'},
  {number: 11, level: 'hard', title: 'A ring with a hole', mode: 'every', map: 'ring', homes: '00 02 21', check: {answers: [], pairs: [2, 3, 3]}, prereq: 'every',
    idea: 'A grid with a hole in it can have no meeting dot at all.',
    hints: ['The middle of the grid is missing. Does the middle-column, middle-row rule still work?', 'A and B are two steps apart up the left side, so the meeting dot would have to be on that side.', 'No dot works. Press That’s all.'],
    parent: {notice: 'Whether your child tries the full grid’s rule, and notices that the road it needs is gone.', prompt: 'Which dot does the full grid’s rule point to, and which pair does it fail here?', explanation: 'A and B are two steps apart, and their only shortest route goes up the left side through the dot between them, so a meeting dot would be A, B or that dot. C is three steps from A and from B, round the bottom or the top. The dot between A and B is four steps from C either way round, so A to C through it takes 1 + 4 = 5 steps, not 3. A fails B and C (2 + 3 = 5, not 3), and B fails A and C the same way. No dot works. On the full 3 × 3 grid the dot between A and B would work, because C could walk straight across the middle.', extension: 'Move C to another dot of the ring in the playground of your head: can you find homes where a dot works? (Yes: with C in the bottom right corner, A’s home works.)', connection: 'A ring of eight roads is not a median graph; only the ring of four is.'},
    provenance: 'Week 67 Problem 2’s question “Can you place the homes so that no meeting dot works?”, impossible on the full grid, moved to the grid with its centre taken out (the review card’s math check).'},
  {number: 12, level: 'hard', title: 'Close a road', mode: 'close', map: 'grid3', homes: '00 02 11', budget: 1, check: {answers: ['01'], pairs: [2, 2, 2], close: [['01', '11']]}, prereq: 'close',
    idea: 'Taking away one road can leave no meeting dot.',
    hints: ['Which road do the walkers to the meeting dot need?', 'Before any road is closed, the meeting dot is the one between A and B, and C reaches it along one road.', 'Close the road from C going left, then press No dot works.'],
    parent: {notice: 'Whether your child presses No dot works first, to see the meeting dot, and then closes a road its walks use.', prompt: 'Why does closing a road far from the meeting dot change nothing?', explanation: 'A and B are two steps apart, and their only shortest route goes up the left side, so a meeting dot must be A, B or the dot between them. With every road open, the dot between them works: C reaches it in one step. Close that road and C needs three steps to it, so A to C through it takes 4 steps instead of 2. A and B fail too (B to C through A takes 4, not 2). So no dot works. Every other single road leaves a meeting dot; the validator checks all twelve.', extension: 'Which other road could you close? (None on its own: with these homes, only the road from C going left works.)', connection: 'Deleting one edge from a median graph (here the 3 × 3 grid) can destroy its medians.'},
    provenance: 'New, the Week 67 review card’s App fit: “cut a road so no dot works”.'}
];

const id = n => `meeting-${String(n).padStart(2, '0')}`;
const out = PUZZLES.map(item => {
  const q = {mode: item.mode, ...mapOnly(item.map), homes: homesOf(item.homes), ...(item.budget ? {budget: item.budget} : {})};
  const D = distances(q), pairs = PAIRS.map(([x, y]) => D[q.homes[x]][q.homes[y]]);
  assert.deepEqual(pairs, item.check.pairs, `${id(item.number)}: pair distances`);
  assert.ok(connected(q), `${id(item.number)}: the map is in one piece`);
  const answers = meetingDots(q, q.homes);
  let solution;
  if (item.mode === 'close') {
    assert.deepEqual(answers, item.check.answers, `${id(item.number)}: the meeting dot before closing`);
    const roads = item.check.close.map(([u, v]) => q.roads.findIndex(([a, b]) => (a === u && b === v) || (a === v && b === u)));
    assert.deepEqual(closures(q), [roads], `${id(item.number)}: the only closure that works`);
    solution = {close: item.check.close, before: answers};
  } else {
    assert.deepEqual(answers, item.check.answers, `${id(item.number)}: meeting dots`);
    if (item.mode === 'meet') assert.equal(answers.length, 1, `${id(item.number)}: one answer`);
    solution = {answers, walks: answers.map(m => Object.fromEntries(WALKERS.map(x => [x, shortestRoute(q, q.homes[x], m)])))};
  }
  return {
    id: id(item.number), number: item.number, title: item.title, difficulty_level: item.level, familyTitle: 'Meeting roads', mechanic: 'meeting', band: 'all', revision: 1, sourceDocument: 'docs/meeting/README.md',
    parameters: q,
    objective: OBJECTIVE[item.mode], visibleObjective: VISIBLE[item.mode], instruction: OBJECTIVE[item.mode],
    controls: CONTROLS[item.mode === 'close' ? 'close' : 'walk'],
    rules: item.mode === 'close' ? RULES.close : [...RULES.walk, ...(item.mode === 'every' ? [RULES.every] : [])],
    idea: item.idea, prerequisites: PREREQUISITES[item.prereq], hints: item.hints,
    parent: {...item.parent, sourceIds: sources}, solution, provenance: item.provenance
  };
});

const playMaps = {
  grid: {name: 'Grid', ...mapOnly('grid5'), homes: homesOf('10 42 04')},
  tree: {name: 'Tree', ...mapOnly('tree'), homes: homesOf('a b c')},
  cube: {name: 'Cube', ...mapOnly('cube'), homes: homesOf('000 011 101')}
};
for (const [name, m] of Object.entries(playMaps)) assert.equal(meetingDots(m, m.homes).length, 1, `playground ${name}: one meeting dot to start`);
const playground = {
  id: 'meeting-playground', number: 0, title: 'Meeting roads playground', difficulty_level: 'playground', familyTitle: 'Meeting roads', mechanic: 'meeting', band: 'playground', revision: 1, sourceDocument: 'docs/meeting/README.md',
  parameters: {mode: 'playground', maps: playMaps},
  objective: 'Walk the three walkers on any map to find meeting dots, and move the homes to set a new puzzle.', visibleObjective: '',
  instruction: 'Walk the three walkers on any map to find meeting dots, and move the homes to set a new puzzle.',
  controls: CONTROLS.playground,
  rules: [...RULES.walk, 'Each meeting dot found gets a ring, and the walkers go home.'],
  idea: 'Free play on a grid, a tree and the cube: place three homes and find where they meet.',
  prerequisites: 'None. A grown-up or a partner can set the homes as a challenge.',
  hints: ['Put the homes somewhere new, then find the meeting dot.', 'On the grid, look at the middle column and the middle row of the three homes.', 'On the cube, take the digit most homes have in each place.'],
  parent: {notice: 'Whether your child can set homes for someone else and say the meeting dot before the walkers get there.', prompt: 'Can you place the homes on the grid so that no dot works, or so that two do?', explanation: 'On the full grid, the tree and the cube, every three different homes have exactly one meeting dot, so neither is possible here. Puzzles 9 to 12 show maps where it happens.', extension: 'Set homes on the tree whose meeting dot is one of the homes.', connection: 'Grids, trees and cubes are median graphs: every three vertices have exactly one median.', sourceIds: sources},
  provenance: 'Week 67 Problem 2: “Put A, B, and C at three different dots. Challenge your partner to find every meeting dot that works.”'
};
const json = {
  title: 'Meeting roads',
  version: 1,
  families: [{id: 'meeting', title: 'Meeting roads', mathematics: 'Three homes A, B and C sit on dots of a road map, and every road is one step. A meeting dot lies on a shortest route between each two homes: d(A, M) + d(M, B) = d(A, B), and the same for A, C and for B, C. It may be a home. Three walkers, one from each home, meet at a dot; any two walks joined there make a route between their homes, and the dot is a meeting dot exactly when all three joined routes can be shortest. On a full grid there is exactly one, the middle column with the middle row of the homes (proved one coordinate at a time); on a tree exactly one, the centre of the tripod of paths; on the cube of three-digit labels exactly one, the majority digit in each place. Other maps can have none (a triangle, a ring of eight) or two (two crossroads joined to every home), and closing one road can leave none. These are medians in median graphs. The dot with the least total travel is a different test: on the triangle every dot has it and none is a meeting dot.', rules: RULES.walk, sourceIds: sources}],
  sources: [
    {id: 'meeting-week67', title: 'Bellingham Math Circle — Week 67: Meeting on shortest roads (student packet and adult guide)', url: 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-67', kind: 'local curriculum'},
    {id: 'meeting-card67', title: 'Week 67 review card and math check (meeting dots on grids, a tree, a triangle, a square and the cube; fixes 3 and 7; App fit)', url: 'https://github.com/jamesrp/math-circle-worksheets/blob/main/plans/review/week-67.md', kind: 'local curriculum'},
    {id: 'meeting-ggt', title: 'Cornelia Druţu and Michael Kapovich — Geometric Group Theory, American Mathematical Society (2018), Definitions 6.1–6.3 (intervals and medians) and Examples 6.19 (grids, trees and other median graphs), printed pages 177–180', url: 'https://www.math.ucdavis.edu/~kapovich/EPR/ggt.pdf', kind: 'research'}
  ],
  puzzles: [playground, ...out]
};
await writeFile(new URL('../dist/families/meeting/meeting.json', import.meta.url), JSON.stringify(json, null, 1) + '\n');
console.log(out.map(p => `${p.id} ${p.parameters.mode} ${p.parameters.mode === 'close' ? `close ${p.solution.close.map(r => r.join('–')).join(', ')}` : `answers [${p.solution.answers.join(', ')}]`}`).join('\n'));
