// Builds dist/families/islands/islands.json, the Islands group of Bridge
// Courier, from the authoring list below. Each puzzle's answers (where a walk
// over every bridge can start, the fewest new bridges, the fewest repeats) and
// a solution witness are computed here with the mechanic's own search
// (dist/families/islands/islands.js) and checked again, by a different search,
// in scripts/validate-islands.mjs. Towns are islands at positions in percent
// of the board box and bridges [u, v, bend], where two bridges between one
// pair of islands bend to either side (graph-board's curved edges). Design
// notes and sources: docs/islands/README.md.
import {writeFile} from 'node:fs/promises';
import {bridgesOf, oddIslands, deadEnds, walkStarts, finishOnce, fewestNew, fewestRepeats, finishDelivery, islandMechanics} from '../dist/families/islands/islands.js';

const WEEK10 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-10';
export const sources = [
  {id: 'islands-week10', title: 'Bellingham Math Circle — Week 10: Bridges and one-stroke drawings, student packets (K–1, 2–3, 4–5) and adult guide', url: WEEK10, kind: 'local curriculum'},
  {id: 'islands-euler', title: 'L. Euler — Solutio problematis ad geometriam situs pertinentis (1736): the seven bridges of Königsberg', url: 'https://scholarlycommons.pacific.edu/euler-works/53/', kind: 'research'},
  {id: 'islands-postman', title: 'J. Edmonds and E. L. Johnson — Matching, Euler tours and the Chinese postman, Mathematical Programming 5 (1973): routes that repeat as little as possible', url: 'https://doi.org/10.1007/BF01580113', kind: 'research'}
];
export const family = {
  id: 'islands',
  title: 'Bridge Courier islands',
  mathematics: 'A walk that crosses every bridge of a town exactly once leaves each island it passes through by a different bridge from the one it came in on, so every island in the middle of the walk uses its bridges in pairs; only the two ends can have an odd number of bridges. Euler (1736) showed the converse for a town in one piece: a walk over every bridge exactly once exists exactly when zero or two islands have an odd number of bridges. With zero it can start anywhere and comes back; with two it runs from one of them to the other. Königsberg has four odd islands, so no walk; the fewest new bridges for a walk that comes back is half the number of odd islands, since each odd island needs a new bridge end and a bridge has two. A delivery route that must come back may repeat bridges instead; then a repeat runs along existing bridges, so the fewest repeats can exceed half the odd islands: the three-arm star needs 3, one for each dead end, not 2 (the Chinese postman problem).',
  rules: [
    'A walk starts on an island and crosses bridges one after another, picking up each bridge’s counter.',
    'Two islands can be joined by more than one bridge.'
  ],
  sourceIds: sources.map(s => s.id)
};
const ONCE = 'A bridge without its counter can’t be crossed.';
const AGAIN = 'A bridge can be crossed again after its counter is gone; each crossing after the first is a repeat.';
const WALKING = 'Tap an island to put the token there, then tap a bridge, or the island across it, to cross. Again lifts the token and puts every counter back; Undo takes back one step.';
const CONTROLS = {
  starts: `A walk starts on an island and crosses bridges one after another, picking up each bridge’s counter; a bridge without its counter can’t be crossed. ${WALKING} A walk that picks up every counter colours the island it started on, and Color colours or uncolours an island by hand. When every island where such a walk can start is coloured, press Done. If no walk can pick up every counter, try one, then press No walk, tap every island a walk would have to start or end on, and press Check.`,
  add: `A walk starts on an island and crosses bridges one after another, picking up each bridge’s counter; a bridge without its counter can’t be crossed. With Bridge, tap two islands to build a new bridge between them, or tap a new bridge to take it away. Then, with Walk: ${WALKING}`,
  fewest: `A walk starts on an island and crosses bridges one after another, picking up each bridge’s counter; a bridge without its counter can’t be crossed. With Bridge, tap two islands to build a new bridge between them, or tap a new bridge to take it away. With Walk: ${WALKING} When your walk has picked up every counter and is back where it started, press Fewest if no smaller number of new bridges could work, tap every island that needs a new bridge, and press Check.`,
  deliver: `A route starts on an island and crosses bridges one after another, picking up each bridge’s counter. A bridge can be crossed again after its counter is gone; each crossing after the first is a repeat, and the bridge shows how many times it was crossed. ${WALKING} When the route has picked up every counter and is back where it started, press Fewest if no route could repeat less, tap every dead end, and press Check.`
};

// Islands in board units (the board is 100 wide and 100 / aspect high), turned
// into the percentages the graph board reads.
const town = (aspect, at, bridges) => ({aspect, nodes: Object.fromEntries(Object.entries(at).map(([id, [x, y]]) => [id, [+x.toFixed(2), +(y * aspect).toFixed(2)]])), bridges});
const S3 = Math.sqrt(3) / 2;
// Three-arm star (K–1 P6, 2–3 P4, 4–5 P10): B in the middle, arms to A (up), C and D.
const STAR = town(1.15, {A: [50, 9], B: [50, 49], C: [50 - 40 * S3, 69], D: [50 + 40 * S3, 69]}, [['B', 'A'], ['B', 'C'], ['B', 'D']]);
// Königsberg (4–5 P5): A the island, B the north bank, C the south bank, D the east.
const KOENIGSBERG = town(1.3, {A: [30, 38.5], B: [58, 8], C: [58, 69], D: [88, 38.5]}, [['A', 'B', 14], ['A', 'B', -14], ['A', 'C', 14], ['A', 'C', -14], ['A', 'D'], ['B', 'D'], ['C', 'D']]);

const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Three bridges',
    parameters: {mode: 'starts', ...town(2.2, {A: [18, 22.7], B: [82, 22.7]}, [['A', 'B', 22], ['A', 'B'], ['A', 'B', -22]])},
    idea: 'With three bridges between two islands, each walk over all three starts on one island and ends on the other, so both are starts.',
    prerequisites: 'None; the counters show what is left.',
    hints: ['Try a walk from each island.', 'A walk from A crosses to B, back to A and to B again.', 'Both islands work.'],
    parent: {
      notice: 'Whether your child checks the second island, or stops after one walk.',
      prompt: 'Where did your walk end? Could a walk start there?',
      explanation: 'A has three bridges and so does B. A walk from A goes A, B, A, B; turned around it starts from B. Both islands are starts, and every walk ends on the other one.',
      extension: 'What if there were four bridges?',
      connection: 'Two places joined by several roads form a multigraph; Euler’s Königsberg had two double bridges.'
    },
    provenance: 'Week 10 K–1 Problem 3, town 2 (two islands joined by three bridges), asked as Problem 2’s question.'
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Two and one',
    parameters: {mode: 'starts', ...town(2.6, {A: [10, 19.2], B: [50, 19.2], C: [90, 19.2]}, [['A', 'B', 14], ['A', 'B', -14], ['B', 'C']])},
    idea: 'A walk from A crosses the two A–B bridges and comes back to A before it can reach C; so A is no start, while B and C are.',
    prerequisites: 'Problem 1.',
    hints: ['Try a walk from each island. Which walks get stuck?', 'A walk from A comes back to A with C’s bridge left over.', 'Color B and C.'],
    parent: {
      notice: 'Whether your child predicts that starting at the end of the row works.',
      prompt: 'Your walk from A got stuck. Where was the token, and which counter was left?',
      explanation: 'A has two bridges, B three and C one. A walk from A uses both A–B bridges and is back at A with C’s counter left. From B: B, A, B, C. From C: C, B, A, B. Only the islands with an odd number of bridges work.',
      extension: 'Add a second bridge to C. Where can a walk start now?',
      connection: 'A walk over every bridge starts and ends on the islands with an odd number of bridges (Euler).'
    },
    provenance: 'Week 10 K–1 Problem 4, town 2 (a double bridge then a single one), asked as Problem 2’s question.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Star',
    parameters: {mode: 'add', budget: 1, ...STAR},
    idea: 'No walk crosses all three bridges of a star: two of its three dead ends would both have to be ends of the walk and the third too. One new bridge between any two islands removes the trouble.',
    prerequisites: 'None.',
    hints: ['Walk first: where do you get stuck?', 'A new bridge between two dead ends lets a walk go through them.', 'Add a bridge from A to C, then walk from B.'],
    parent: {
      notice: 'Whether your child walks first to find the problem, or adds a bridge at random.',
      prompt: 'Which island did your walk get stuck on? Which counters were left?',
      explanation: 'A, C and D each have one bridge, so a walk can only begin or end at each; a walk has two ends, so one counter is always left. Any new bridge joins two of the four islands with an odd number of bridges, leaving two, and then a walk runs from one to the other.',
      extension: 'Can you add the new bridge so that the walk ends where it started? (No: two islands still have an odd number of bridges.)',
      connection: 'Adding an edge between two odd vertices leaves two, and the graph gains an Euler trail.'
    },
    provenance: 'Week 10 K–1 Problem 6 and grades 2–3 Problem 4, town 1 (the three-arm star).'
  },
  {
    number: 4, difficulty_level: 'medium', title: 'Two squares',
    parameters: {mode: 'starts', ...town(1.72, {A: [12, 10], B: [50, 10], C: [88, 10], D: [12, 48], E: [50, 48], F: [88, 48]}, [['A', 'B'], ['B', 'C'], ['A', 'D'], ['C', 'F'], ['D', 'E'], ['E', 'F'], ['B', 'E', 14], ['B', 'E', -14]])},
    idea: 'Every island has an even number of bridges, so a walk over every bridge can start anywhere, and it comes back.',
    prerequisites: 'Problems 1 and 2.',
    hints: ['Try a walk from a corner, then from the middle.', 'A walk from A that goes round both squares comes back to A.', 'Every island works.'],
    parent: {
      notice: 'Whether your child expects the corners and the middle to behave differently.',
      prompt: 'Where did the walk end? What if you start from where it ended?',
      explanation: 'The corners have two bridges and B and E four. A walk A, B, C, F, E, B, E, D, A crosses all eight and is back at A; it is a loop, so it can be started anywhere along it. All six islands are starts.',
      extension: 'Take away one of the B–E bridges. Where can a walk start now?',
      connection: 'With every degree even, an Euler circuit exists and passes through every vertex, so every vertex is a start (Euler; Hierholzer).'
    },
    provenance: 'Week 10 K–1 Problem 4, town 3 (two squares with a doubled middle rung), asked as Problem 2’s question.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Fan',
    parameters: {mode: 'starts', ...town(1.25, {A: [50, 7], B: [50 - 36 * S3, 22], C: [50 + 36 * S3, 22], D: [50, 40], E: [50 - 36 * S3, 58], F: [50 + 36 * S3, 58]}, [['D', 'A'], ['D', 'B'], ['D', 'C'], ['D', 'E'], ['D', 'F'], ['B', 'E']])},
    idea: 'Four islands have an odd number of bridges (D has five, A, C and F one), and a walk has only two ends, so there is no walk. The child taps those four.',
    prerequisites: 'Problem 2.',
    hints: ['Try a few walks. Where do they get stuck?', 'A, C and F each have one bridge: a walk can only begin or end there.', 'Press No walk, tap A, C, D and F, and Check.'],
    parent: {
      notice: 'Whether your child keeps trying walks, or starts to argue that none can work.',
      prompt: 'Which islands can a walk only start or end on?',
      explanation: 'A, C and F have one bridge each, so a walk must begin or end there; D has five. Four islands with an odd number of bridges would need four ends, and a walk has two. So no walk picks up every counter.',
      extension: 'Which one bridge could you add to make a walk possible?',
      connection: 'More than two odd vertices: no Euler trail (Euler, 1736).'
    },
    provenance: 'Week 10 grades 2–3 Problem 2, town 1 (the fan without its right-hand triangle).'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Ladder with a crossing',
    parameters: {mode: 'starts', ...town(1.72, {A: [12, 10], B: [50, 10], C: [88, 10], D: [12, 48], E: [50, 48], F: [88, 48]}, [['A', 'B'], ['B', 'C'], ['A', 'D'], ['C', 'F'], ['D', 'E'], ['E', 'F'], ['B', 'D'], ['B', 'F']])},
    idea: 'Only D and F have an odd number of bridges (three each), so every walk over every bridge runs from one to the other; B, with the most bridges, is no start.',
    prerequisites: 'Problems 2 and 4.',
    hints: ['Try a walk from B, the island with the most bridges.', 'Walks from B get stuck; try the bottom corners.', 'Color D and F.'],
    parent: {
      notice: 'Whether your child expects the busiest island to be the best start.',
      prompt: 'Your walk ended on F. Could a walk start there?',
      explanation: 'D and F have three bridges, B four, the rest two. A walk D, A, B, D, E, F, B, C, F crosses all eight; reversed it starts from F. From any other island the walk would have to end there too, leaving D and F each with a bridge unused.',
      extension: 'Which bridge could you take away so that a walk can start anywhere?',
      connection: 'Exactly two odd vertices: every Euler trail runs between them.'
    },
    provenance: 'Week 10 grades 2–3 Problem 2, town 3 (the ladder ring with two diagonals from the top middle).'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Square with a cross',
    parameters: {mode: 'add', budget: 1, ...town(1.19, {A: [17, 9], B: [83, 9], C: [50, 42], D: [17, 75], E: [83, 75]}, [['A', 'B'], ['B', 'E'], ['E', 'D'], ['D', 'A'], ['C', 'A'], ['C', 'B'], ['C', 'D'], ['C', 'E']])},
    idea: 'The four corners have three bridges each. A new bridge between two corners leaves two odd islands and a walk; a new bridge to the middle island leaves four, and still no walk.',
    prerequisites: 'Problem 3.',
    hints: ['Walk first: where do you get stuck?', 'A new bridge to the middle island doesn’t help. Join two corners.', 'Add a bridge from A to B, then walk from D.'],
    parent: {
      notice: 'Whether your child tries the middle island first, and what they make of it not working.',
      prompt: 'Which islands can a walk only start or end on?',
      explanation: 'Corners have three bridges, the middle four. A new bridge between two corners makes both even and leaves the other two corners as the ends of a walk. A new bridge from a corner to the middle makes the middle odd, so four odd islands remain. Six of the ten possible new bridges work.',
      extension: 'Can a new bridge make a walk that ends where it started?',
      connection: 'An edge changes the parity of exactly its two ends.'
    },
    provenance: 'Week 10 K–1 Problem 6, town 2 (a square with both diagonals through a middle island).'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'House',
    parameters: {mode: 'fewest', ...town(1.04, {A: [50, 7], B: [28, 45.1], C: [72, 45.1], D: [28, 89.1], E: [72, 89.1]}, [['A', 'B'], ['A', 'C'], ['B', 'C'], ['B', 'D'], ['C', 'E'], ['D', 'E']])},
    idea: 'B and C have three bridges, so a walk that comes back needs a new bridge at each; one new bridge from B to C reaches both.',
    prerequisites: 'Problems 2 and 3.',
    hints: ['Can you walk it from one island and come back? Where do your walks end?', 'B and C each need a new bridge.', 'Add a bridge from B to C, then walk from A.'],
    parent: {
      notice: 'Whether your child adds bridges until it works, then tries to do with fewer.',
      prompt: 'Your walk ended on C, not where it started. What would fix that?',
      explanation: 'B and C have three bridges each and the rest two. A walk that comes back uses every island’s bridges in pairs, so B and C each need one more bridge; a single new B–C bridge gives both. Then A, B, D, E, C, B, C, A crosses all seven.',
      extension: 'With the new bridge in place, where can the walk start?',
      connection: 'A closed walk over every edge (an Euler circuit) needs every degree even.'
    },
    provenance: 'Week 10 grades 2–3 Problem 5, town 1 (the house).'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'Königsberg',
    parameters: {mode: 'starts', ...KOENIGSBERG},
    idea: 'All four land areas of Königsberg have an odd number of bridges (5, 3, 3 and 3), so no walk crosses every bridge once: Euler’s proof.',
    prerequisites: 'Problem 5.',
    hints: ['Try a few walks. Which islands do they get stuck on?', 'Every island here has an odd number of bridges.', 'Press No walk, tap A, B, C and D, and Check.'],
    parent: {
      notice: 'Whether your child counts bridges after a few walks, or keeps walking.',
      prompt: 'How many bridges does each land area have? Which could be the ends of a walk?',
      explanation: 'A has five bridges and B, C and D three each. An island in the middle of a walk is entered and left in pairs, so each odd island must be an end of the walk, and a walk has two ends. Four odd islands: no walk. This is Euler’s 1736 solution.',
      extension: 'Where could the city build one new bridge so that a walk exists?',
      connection: 'Euler’s Königsberg paper is often counted as the first theorem of graph theory.'
    },
    provenance: 'Week 10 grades 4–5 Problem 5 (Königsberg, with its double bridges), asked as Problem 2’s question.'
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Königsberg comes back',
    parameters: {mode: 'fewest', ...KOENIGSBERG},
    idea: 'Four odd islands each need a new bridge end, and a bridge has two, so two new bridges (pairing the four in any way) are the fewest for a walk that comes back.',
    prerequisites: 'Problems 8 and 9.',
    hints: ['Walk first. Which islands do your walks get stuck on?', 'Each island with an odd number of bridges needs one new bridge.', 'Add bridges from A to B and from C to D, then walk.'],
    parent: {
      notice: 'Whether your child tries one new bridge first and sees why it can’t be enough.',
      prompt: 'After one new bridge, how many islands still have an odd number?',
      explanation: 'A, B, C and D are all odd. A walk that comes back needs every island even, so each needs a new bridge end; a bridge has two ends, so at least two bridges, and A–B with C–D (or A–C with B–D, or A–D with B–C) does it.',
      extension: 'For a walk that may end anywhere, how many new bridges are needed? (One.)',
      connection: 'Making a graph Eulerian with fewest added edges: pair the odd vertices.'
    },
    provenance: 'Week 10 grades 4–5 Problem 5, last question (the fewest new bridges for a walk that ends where it started).'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Star delivery',
    parameters: {mode: 'deliver', ...STAR},
    idea: 'A route that comes back must leave each dead end along the bridge it came in on, so all three bridges are crossed twice: 3 repeats, not the 2 that half the four odd islands suggests.',
    prerequisites: 'Problems 3 and 10.',
    hints: ['Try a route. Which bridges did you cross twice?', 'A route into a dead end must come back out over the same bridge.', 'From B: to A and back, to C and back, to D and back. Then Fewest, tap A, C and D, and Check.'],
    parent: {
      notice: 'Whether your child expects 2 repeats, as two new bridges would fix four odd islands, and what they make of needing 3.',
      prompt: 'How does the truck leave a dead end?',
      explanation: 'Each of A, C and D has one bridge, so a route that visits it and comes back crosses that bridge twice. That is three repeats whichever island the route starts on, and B, A, B, C, B, D, B uses exactly three. New bridges could go anywhere; repeats must run along existing bridges, which is why the count is 3, not 2.',
      extension: 'For a route that may end anywhere, what is the fewest? (Two: start on one dead end and finish on another.)',
      connection: 'The Chinese postman problem: the fewest repeats pair the odd vertices along shortest paths (Edmonds and Johnson, 1973).'
    },
    provenance: 'Week 10 grades 4–5 Problems 10–11, town 2 (the three-arm star as a delivery route).'
  }
];

const OBJECTIVE = {
  starts: 'Color every island where a walk that picks up every counter can start.',
  add: 'Add one bridge, then pick up every counter.',
  fewest: 'Add as few bridges as you can, then pick up every counter and end where you started.',
  deliver: 'Pick up every counter and end where you started, crossing bridges again as few times as you can.'
};

// A witness: moves from a fresh board to a solve.
function witness(q) {
  const moves = [], walk = (all, start, home) => {
    moves.push({type: 'island', island: start});
    const rest = home === undefined ? finishOnce(all, start, 0) : finishOnce(all, start, 0, home);
    for (const i of rest) moves.push({type: 'bridge', bridge: i});
  };
  if (q.mode === 'starts') {
    const starts = walkStarts(q), all = bridgesOf(q);
    if (!starts.length) {
      moves.push({type: 'island', island: oddIslands(q)[0]});
      const at = oddIslands(q)[0], i = all.findIndex(([u, v]) => u === at || v === at);
      moves.push({type: 'bridge', bridge: i});
      moves.push({type: 'check', claim: 'none', picks: oddIslands(q)});
      return moves;
    }
    walk(all, starts[0]);
    for (const s of starts.slice(1)) moves.push({type: 'color', island: s});
    moves.push({type: 'done'});
    return moves;
  }
  if (q.mode === 'add' || q.mode === 'fewest') {
    const odd = oddIslands(q), pairs = [];
    for (let k = 0; k < (q.mode === 'add' ? 2 * q.budget : odd.length); k += 2) pairs.push([odd[k], odd[k + 1]]);
    for (const [u, v] of pairs) moves.push({type: 'add', u, v});
    const all = bridgesOf(q, pairs), starts = walkStarts(q, all);
    walk(all, starts[0], q.mode === 'fewest' ? starts[0] : undefined);
    if (q.mode === 'fewest') moves.push({type: 'check', claim: 'fewest', picks: odd});
    return moves;
  }
  const all = bridgesOf(q), best = fewestRepeats(q);
  const start = Object.keys(q.nodes).find(s => finishDelivery(all, s, 0, s)?.repeats === best);
  moves.push({type: 'island', island: start});
  for (const i of finishDelivery(all, start, 0, start).rest) moves.push({type: 'bridge', bridge: i});
  moves.push({type: 'check', claim: 'fewest', picks: deadEnds(q)});
  return moves;
}
function answers(q) {
  const out = {odd: oddIslands(q)};
  if (q.mode === 'starts') out.starts = walkStarts(q);
  if (q.mode === 'add') out.working = Object.keys(q.nodes).flatMap((u, i, ids) => ids.slice(i + 1).filter(v => walkStarts(q, bridgesOf(q, [[u, v]])).length).map(v => [u, v]));
  if (q.mode === 'fewest') out.fewest = fewestNew(q);
  if (q.mode === 'deliver') { out.fewest = fewestRepeats(q); out.deadEnds = deadEnds(q); }
  out.moves = witness(q);
  // The witness must solve with the mechanic itself.
  const mech = islandMechanics.islands, p = {id: 'build', parameters: q};
  let b = mech.fresh(p);
  for (const m of out.moves) { b = mech.move(p, b, m); if (!b) throw new Error(`witness move refused: ${JSON.stringify(m)}`); }
  if (!mech.solved(p, b)) throw new Error('witness does not solve');
  return out;
}

export const puzzles = authored.map(item => ({
  id: `islands-${String(item.number).padStart(2, '0')}`,
  number: item.number,
  title: item.title,
  band: 'all',
  difficulty_level: item.difficulty_level,
  mechanic: 'islands',
  libraryFamily: 'route',
  group: 'Islands',
  familyTitle: 'Bridge Courier',
  revision: 1,
  parameters: item.parameters,
  objective: OBJECTIVE[item.parameters.mode],
  visibleObjective: OBJECTIVE[item.parameters.mode],
  instruction: OBJECTIVE[item.parameters.mode],
  controls: CONTROLS[item.parameters.mode],
  rules: [...family.rules, item.parameters.mode === 'deliver' ? AGAIN : ONCE],
  idea: item.idea,
  prerequisites: item.prerequisites,
  hints: item.hints,
  parent: {...item.parent, sourceIds: ['islands-week10', item.parameters.mode === 'deliver' ? 'islands-postman' : 'islands-euler']},
  solution: answers(item.parameters),
  provenance: item.provenance,
  sourceDocument: 'docs/islands/README.md'
}));
export const pack = {title: 'Bridge Courier islands', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/islands/islands.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) { const {moves, ...rest} = p.solution; console.log(p.id, p.difficulty_level, p.parameters.mode, p.title, JSON.stringify(rest), `${moves.length} moves`); }
}
