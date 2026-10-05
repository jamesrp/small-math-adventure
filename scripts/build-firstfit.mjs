// Builds dist/families/firstfit/firstfit.json, the Neighbor Lanterns First fit
// and Why not fewer groups, from the authoring list below. Each puzzle's
// answers (the most colours any order uses, the fewest colours, an example
// order or proof) are computed here by search (dist/families/firstfit/firstfit.js)
// and checked again by scripts/validate-firstfit.mjs. Graphs use the Neighbor
// Lanterns format (vertices, edges, positions in percent), so a shared graph
// editor can read them. Design notes and sources: docs/firstfit/README.md.
import {writeFile} from 'node:fs/promises';
import {mostColors, completeOrder, fewestColors, shows} from '../dist/families/firstfit/firstfit.js';

const WEEK62 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-62';
export const sources = [
  {id: 'firstfit-week62', title: 'Bellingham Math Circle — Week 62: Conflict networks, student packet and adult guide', url: WEEK62, kind: 'local curriculum'},
  {id: 'firstfit-grundy', title: 'C. A. Christen and S. M. Selkow — Some perfect coloring properties of graphs, J. Combinatorial Theory B 27 (1979): the Grundy number (most colours first fit can use)', url: 'https://doi.org/10.1016/0095-8956(79)90067-4', kind: 'research'},
  {id: 'firstfit-konig', title: 'Bipartite graphs: two colours exactly when there is no odd cycle (Kőnig, 1936)', url: 'https://en.wikipedia.org/wiki/Bipartite_graph#Characterization', kind: 'undergraduate'}
];
export const family = {
  id: 'firstfit',
  title: 'Neighbor Lanterns first fit and why not fewer',
  mathematics: 'Colouring linked lanterns differently is scheduling with conflicts. A colouring with k colours shows k are enough; a set of lanterns that all link to each other (a clique of size r) shows r are needed, and a ring of odd length shows 3 are needed, because two colours must alternate around a ring. Two colours work exactly when there is no odd ring. The first-fit rule (each lantern, in a chosen order, takes the first colour none of its coloured neighbours has) always gives a proper colouring with at most one more colour than the most links at any lantern, but the order matters: a path of four can be made to use 3 colours, a tree of eight 4, and the crown graph on 2k lanterns k colours, although 2 suffice. The most colours any order uses is the Grundy number.',
  rules: [
    'Linked lanterns must have different colours.',
    'A crossing of two links without a lantern is not a junction.'
  ],
  sourceIds: sources.map(s => s.id)
};
const FIT_RULE = 'Each lantern you tap takes the first colour that none of its lit neighbours has. A lit lantern keeps its colour.';
const CONTROLS = {
  target: 'Tap the lanterns one at a time, in any order. Each takes the first colour none of its lit neighbours has, and a small number shows when you tapped it. Again clears the order; Undo takes back one tap.',
  decide: 'Tap the lanterns one at a time. Each takes the first colour none of its lit neighbours has. After finishing one order, you may say no order uses that many colours. Again clears the order.',
  fewest: 'Choose a colour, then tap lanterns to colour them (Clear removes a colour). When every lantern is lit with no clash, press Show why not fewer, tap lanterns for your proof, and Check.'
};

const ring = (names, cx = 50, cy = 50, rx = 36, ry = 38, turn = 0) => Object.fromEntries(names.map((v, i) => {
  const a = 2 * Math.PI * i / names.length + turn;
  return [v, [+(cx + rx * Math.sin(a)).toFixed(2), +(cy - ry * Math.cos(a)).toFixed(2)]];
}));
const cycleEdges = names => names.map((v, i) => [v, names[(i + 1) % names.length], 1]);
const crown = k => {
  const top = Array.from({length: k}, (_, i) => `${String.fromCharCode(65 + i)}`), bottom = top.map(v => v.toLowerCase());
  const edges = top.flatMap((u, i) => bottom.flatMap((v, j) => i !== j ? [[u, v, 1]] : []));
  const positions = Object.fromEntries([...top.map((v, i) => [v, [+(10 + 80 * i / (k - 1)).toFixed(2), 18]]), ...bottom.map((v, i) => [v, [+(10 + 80 * i / (k - 1)).toFixed(2), 82]])]);
  return {vertices: [...top, ...bottom], edges, positions};
};
// A tree whose first fit can reach 4 colours, with no lantern on more than 3 links.
const TREE = {
  vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
  edges: [['A', 'B', 1], ['A', 'C', 1], ['A', 'D', 1], ['C', 'E', 1], ['C', 'F', 1], ['D', 'G', 1], ['D', 'H', 1], ['H', 'I', 1], ['E', 'J', 1]],
  positions: {A: [50, 10], B: [10, 38], C: [35, 38], D: [78, 38], E: [24, 64], F: [46, 64], G: [66, 64], H: [90, 64], I: [90, 90], J: [24, 90]}
};
const CUBE = {
  vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'D', 1], ['D', 'A', 1], ['E', 'F', 1], ['F', 'G', 1], ['G', 'H', 1], ['H', 'E', 1], ['A', 'E', 1], ['B', 'F', 1], ['C', 'G', 1], ['D', 'H', 1]],
  positions: {A: [10, 10], B: [90, 10], C: [90, 90], D: [10, 90], E: [32, 32], F: [68, 32], G: [68, 68], H: [32, 68]}
};
const fit = (graph, goal, target) => ({...graph, goal, target});
const few = (graph, proof, palette = 4) => ({...graph, palette, proof});

const authored = [
  // ---- First fit
  {
    mechanic: 'firstfit', group: 'First fit', number: 1, difficulty_level: 'easy', title: 'Four in a row',
    parameters: fit({vertices: ['A', 'B', 'C', 'D'], edges: cycleEdges(['A', 'B', 'C', 'D']).slice(0, 3), positions: {A: [10, 50], B: [36.67, 50], C: [63.33, 50], D: [90, 50]}}, 'target', 3),
    objective: 'Tap the four lanterns in an order that makes the rule use 3 colours, although 2 are enough.',
    visibleObjective: 'Make the rule use 3 colours.',
    idea: 'Light both ends first: then a middle lantern sees colour 1 on one side, and the last one sees 1 and 2.',
    prerequisites: 'Neighbor Lanterns puzzle 1 (two colours on a line).',
    hints: ['Tap in order A, B, C, D. How many colours? Now try another order.', 'For a third colour, a lantern must see colours 1 and 2 already lit next to it.', 'Light A and D first.'],
    parent: {
      notice: 'Whether your child plans which lantern should see colours 1 and 2, or taps at random.',
      prompt: 'Which lantern got colour 3? What did it see when you tapped it?',
      explanation: 'A and D take colour 1. B sees 1, so takes 2. C sees 2 (from B) and 1 (from D), so takes 3. Two colours are enough for a line, so the rule wasted one.',
      extension: 'Which orders use only 2 colours?',
      connection: 'First fit can use more colours than needed; the most it can use on a graph is its Grundy number. The path of four is the smallest tree where it reaches 3.'
    },
    provenance: 'Week 62 Problem 7 (a four-card path: orders for as few and as many slots).'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 2, difficulty_level: 'easy', title: 'Close the square',
    parameters: fit({vertices: ['A', 'B', 'C', 'D'], edges: cycleEdges(['A', 'B', 'C', 'D']), positions: {A: [25, 15], B: [75, 15], C: [75, 85], D: [25, 85]}}, 'decide', 3),
    objective: 'Can any order make the rule use 3 colours on this square? Find one, or say no order does.',
    visibleObjective: 'Use 3 colours, or say no order can.',
    idea: 'No order can: every lantern links to two lanterns on opposite corners, and opposite corners always get the same colour.',
    prerequisites: 'First fit puzzle 1.',
    hints: ['Try the order that worked on the line: two lanterns that are not linked, then the others.', 'Which lanterns does each lantern link to?', 'A lantern needs to see colours 1 and 2 to take 3. Can its two neighbours ever differ?'],
    parent: {
      notice: 'Whether your child compares this with puzzle 1: one more link, yet fewer colours possible.',
      prompt: 'Why can’t a lantern here ever see colours 1 and 2 at once?',
      explanation: 'For A to take colour 3, B and D would need colours 1 and 2. Say D has 2: then C had colour 1 when D was lit. But B is linked to C, so B cannot have taken 1 after C, and if B took 1 first, C could not take 1. The same holds for every lantern, so no order uses 3.',
      extension: 'Add one diagonal. Can an order use 3 colours now? Does it need 3?',
      connection: 'Adding a link can lower the Grundy number: the 4-cycle has Grundy number 2, the path of four has 3.'
    },
    provenance: 'New: Week 62 Problem 7’s path with its ends joined.'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 3, difficulty_level: 'medium', title: 'Six in a ring',
    parameters: fit({vertices: ['A', 'B', 'C', 'D', 'E', 'F'], edges: cycleEdges(['A', 'B', 'C', 'D', 'E', 'F']), positions: ring(['A', 'B', 'C', 'D', 'E', 'F'], 50, 50, 36, 40)}, 'target', 3),
    objective: 'Tap the six lanterns in an order that makes the rule use 3 colours, although 2 are enough.',
    visibleObjective: 'Make the rule use 3 colours.',
    idea: 'Make one lantern’s two neighbours get colours 1 and 2 before you tap it.',
    prerequisites: 'First fit puzzles 1 and 2.',
    hints: ['Pick the lantern that will get colour 3. What must its two neighbours have?', 'One neighbour needs colour 2, so that neighbour must see a 1 first.', 'Try A, D, B, then C.'],
    parent: {
      notice: 'Whether your child works backward from the lantern that should get 3.',
      prompt: 'Why does a ring of six allow 3 when the square did not?',
      explanation: 'A and D take 1 (not linked). B sees A, takes 2. C sees B (2) and D (1), takes 3. On the square the two neighbours of a lantern are each other’s opposite corners; on a ring of six, C’s neighbours B and D are not forced to match.',
      extension: 'Can any order use 4 colours on this ring?',
      connection: 'Every lantern has 2 links, so first fit never needs more than 3 colours.'
    },
    provenance: 'New: Week 62 Problem 7, on a ring of six.'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 4, difficulty_level: 'medium', title: 'A branching tree',
    parameters: fit(TREE, 'target', 4),
    objective: 'Tap the ten lanterns in an order that makes the rule use 4 colours, although 2 are enough.',
    visibleObjective: 'Make the rule use 4 colours.',
    idea: 'Build up: a lantern that sees 1 and 2 takes 3; a lantern that sees 1, 2 and 3 takes 4. Only A has three neighbours that can be made to see 1, 2 and 3.',
    prerequisites: 'First fit puzzles 1 and 3.',
    hints: ['Which lantern could take colour 4? It needs three lit neighbours with colours 1, 2 and 3.', 'Give B colour 1, then make C take 2 and D take 3 before you tap A.', 'For D to take 3, it needs neighbours with 1 and 2 first: G and H, after H has seen I.'],
    parent: {
      notice: 'Whether your child plans several steps back from colour 4.',
      prompt: 'Could any order use 5 colours here?',
      explanation: 'A needs neighbours with 1, 2 and 3. B (a leaf) takes 1. C takes 2 if one of its children has 1 first (F). D takes 3 if its neighbours G and H have 1 and 2 first: G takes 1, and H takes 2 after I takes 1. Then A takes 4. Only a small share of the orders do this, so tapping at random rarely works.',
      extension: 'Remove lantern J. Can you still reach 4?',
      connection: 'The smallest tree with Grundy number 4 has 8 lanterns (a binomial tree); this one adds two leaves.'
    },
    provenance: 'Week 62 Problem 8 (a tree where first fit can use four slots), new tree.'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 5, difficulty_level: 'hard', title: 'Could any order use five?',
    parameters: fit(TREE, 'decide', 5),
    objective: 'Can any order make the rule use 5 colours on this tree? Find one, or say no order does.',
    visibleObjective: 'Use 5 colours, or say no order can.',
    idea: 'No: no lantern has more than three links, so a lantern always finds a free colour among 1 to 4.',
    prerequisites: 'First fit puzzle 4.',
    hints: ['To take colour 5, what would a lantern need to see?', 'Count the links at each lantern.', 'A lantern with three links can see at most three colours.'],
    parent: {
      notice: 'Whether your child reasons from the number of links instead of trying orders.',
      prompt: 'What would a lantern need around it to take colour 5?',
      explanation: 'A lantern takes colour 5 only if its lit neighbours already show 1, 2, 3 and 4, so it needs at least four links. Every lantern here has at most three, so no order uses 5.',
      extension: 'Add one leaf to A. Can an order use 5 now?',
      connection: 'First fit uses at most Δ + 1 colours, where Δ is the most links at a lantern.'
    },
    provenance: 'Week 62 Problem 8 (“Could any order use five? Explain.”).'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 6, difficulty_level: 'hard', title: 'Two rows of four',
    parameters: fit(crown(4), 'decide', 4),
    objective: 'Each lantern links to every lantern in the other row except its partner below or above it. Can an order make the rule use 4 colours? Find one, or say no order does.',
    visibleObjective: 'Use 4 colours, or say no order can.',
    idea: 'Yes: tap partners in pairs. Each pair is not linked, so both take the same colour, and each new pair sees all earlier colours.',
    prerequisites: 'First fit puzzles 1–4.',
    hints: ['Two colours are enough: top row one colour, bottom row the other. Now try to waste colours.', 'A and a are not linked. Tap them first.', 'Tap A, a, then B, b, then C, c, then D, d.'],
    parent: {
      notice: 'Whether your child finds the pairing after a few tries.',
      prompt: 'Why do A and a get the same colour?',
      explanation: 'A and a are not linked, so both take 1. B links to a (1), so takes 2; b links to A (1), so takes 2. C sees 1 and 2 in the other row, so takes 3, and so does c. D and d take 4. Every two partners share a colour, and each pair sees all earlier pairs.',
      extension: 'With five pairs, how many colours can the rule use?',
      connection: 'The crown graph on 2k lanterns has two colours but Grundy number k: first fit can be arbitrarily bad.'
    },
    provenance: 'New: the crown graph suggested by the Week 62 review card.'
  },
  {
    mechanic: 'firstfit', group: 'First fit', number: 7, difficulty_level: 'hard', title: 'Two rows of five',
    parameters: fit(crown(5), 'target', 5),
    objective: 'Each lantern links to every lantern in the other row except its partner. Tap the ten lanterns in an order that makes the rule use 5 colours.',
    visibleObjective: 'Make the rule use 5 colours.',
    idea: 'Tap partners in pairs: each pair takes the next new colour.',
    prerequisites: 'First fit puzzle 6.',
    hints: ['Which two lanterns are not linked?', 'Tap a lantern and its partner one after the other.', 'A, a, B, b, C, c, D, d, E, e.'],
    parent: {
      notice: 'Whether your child carries the pairing over from puzzle 6.',
      prompt: 'How many colours would ten pairs use?',
      explanation: 'Each partner pair takes one new colour, so five pairs use 5, although two colours (one per row) are enough.',
      extension: 'Is there an order that uses exactly 3?',
      connection: 'The crown graph: chromatic number 2, Grundy number k.'
    },
    provenance: 'New: the crown graph at the next size.'
  },
  // ---- Why not fewer
  {
    mechanic: 'fewest', group: 'Why not fewer', number: 1, difficulty_level: 'easy', title: 'A triangle and a tail',
    parameters: few({vertices: ['A', 'B', 'C', 'D', 'E'], edges: [['A', 'B', 1], ['B', 'C', 1], ['C', 'A', 1], ['C', 'D', 1], ['D', 'E', 1]], positions: {A: [15, 20], B: [15, 80], C: [42, 50], D: [66, 50], E: [90, 50]}}, ['A', 'B', 'C']),
    objective: 'Colour every lantern with as few colours as you can. Then show why fewer cannot work: tap lanterns that all link to each other.',
    visibleObjective: 'Use the fewest colours, then show why not fewer.',
    idea: 'Three colours, because A, B and C all link to each other.',
    prerequisites: 'Neighbor Lanterns puzzles 1–3.',
    hints: ['Colour first. How few colours can you use?', 'A, B and C all link to each other.', 'Tap A, B and C for the proof.'],
    parent: {
      notice: 'Whether your child sees the proof as a separate step from the colouring.',
      prompt: 'Your colouring shows 3 are enough. What shows 3 are needed?',
      explanation: 'A, B and C are linked in pairs, so they need three different colours. Three colours are enough for the whole picture, so 3 is the fewest.',
      extension: 'Which link could you remove so that 2 colours work?',
      connection: 'A clique of size r needs r colours: ω ≤ χ.'
    },
    provenance: 'Week 62 Problem 2 (fewest slots and why fewer cannot work).'
  },
  {
    mechanic: 'fewest', group: 'Why not fewer', number: 2, difficulty_level: 'easy', title: 'The cube',
    parameters: few(CUBE, ['A', 'B']),
    objective: 'Colour every lantern with as few colours as you can. Then show why fewer cannot work.',
    visibleObjective: 'Use the fewest colours, then show why not fewer.',
    idea: 'Two colours, alternating around every square; one link shows one colour is not enough.',
    prerequisites: 'Why not fewer puzzle 1.',
    hints: ['Many links do not always mean many colours. Try 2.', 'Alternate around the outside square, then match each inside lantern to the opposite colour of its outside partner.', 'For the proof, any two linked lanterns show one colour is not enough.'],
    parent: {
      notice: 'Whether your child expects lots of colours because of the many links.',
      prompt: 'Why is one link enough for the proof?',
      explanation: 'Colour A, C, F, H with one colour and B, D, E, G with the other: every link joins the two groups. Any link needs two colours, so 2 is the fewest.',
      extension: 'Does the cube have a ring of odd length?',
      connection: 'The cube is bipartite: two colours exactly when there is no odd cycle.'
    },
    provenance: 'Week 62 Problem 1 (networks that need few slots despite many lines), new network.'
  },
  {
    mechanic: 'fewest', group: 'Why not fewer', number: 3, difficulty_level: 'medium', title: 'A ring of five',
    parameters: few({vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], edges: [...cycleEdges(['A', 'B', 'C', 'D', 'E']), ['A', 'F', 1], ['C', 'G', 1]], positions: {...ring(['A', 'B', 'C', 'D', 'E'], 50, 56, 30, 34), F: [20, 8], G: [90, 90]}}, ['A', 'B', 'C', 'D', 'E']),
    objective: 'Colour every lantern with as few colours as you can. Then show why fewer cannot work. No three lanterns here all link to each other.',
    visibleObjective: 'Use the fewest colours, then show why not fewer.',
    idea: 'Three colours, and no triangle: the proof is the ring of five, tapped in order around it.',
    prerequisites: 'Why not fewer puzzles 1 and 2.',
    hints: ['Try two colours around the ring. What happens when you get back?', 'Two colours must alternate around a ring. Five lanterns cannot alternate.', 'Tap A, B, C, D, E in order for the proof.'],
    parent: {
      notice: 'Whether your child explains the failed alternation, not just that 2 did not work.',
      prompt: 'Why can’t two colours go around a ring of five?',
      explanation: 'Two colours must alternate around a ring, and after five steps the colour has switched an odd number of times, so the start would need both colours. Three colours are enough, so 3 is the fewest, though the largest group of linked-in-pairs lanterns has only 2.',
      extension: 'Which rings can two colours go around?',
      connection: 'An odd cycle needs 3 colours, so χ can exceed the clique number ω.'
    },
    provenance: 'Week 62 Problems 3 and 4 (the five-cycle with a leaf; a cycle that explains why two slots fail), new instance.'
  },
  {
    mechanic: 'fewest', group: 'Why not fewer', number: 4, difficulty_level: 'hard', title: 'A ring with a shortcut',
    parameters: few({vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G'], edges: [...cycleEdges(['A', 'B', 'C', 'D', 'E', 'F', 'G']), ['A', 'D', 1]], positions: ring(['A', 'B', 'C', 'D', 'E', 'F', 'G'], 50, 50, 38, 42)}, ['A', 'D', 'E', 'F', 'G']),
    objective: 'Colour every lantern with as few colours as you can. Then show why fewer cannot work.',
    visibleObjective: 'Use the fewest colours, then show why not fewer.',
    idea: 'Three colours. The whole ring of seven is odd, and so is the shortcut ring A, D, E, F, G.',
    prerequisites: 'Why not fewer puzzle 3.',
    hints: ['Is there a ring of odd length?', 'The shortcut A–D makes two smaller rings. Count each.', 'Tap A, D, E, F, G in order, or go around all seven.'],
    parent: {
      notice: 'Whether your child counts the lanterns on each ring the shortcut makes.',
      prompt: 'The shortcut makes a ring of four and a ring of five. Which one proves 3 are needed?',
      explanation: 'A–B–C–D–A has four lanterns, which two colours can alternate around. A–D–E–F–G–A has five, which they cannot. So 3 colours are needed, and 3 are enough.',
      extension: 'Which one shortcut would make a triangle?',
      connection: 'Two colours work exactly when every cycle is even.'
    },
    provenance: 'Week 62 Problems 4 and 5 (find a cycle that explains why two slots fail), new network.'
  },
  {
    mechanic: 'fewest', group: 'Why not fewer', number: 5, difficulty_level: 'hard', title: 'Hidden four',
    parameters: few({vertices: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], edges: [...cycleEdges(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']), ['A', 'D', 1], ['A', 'F', 1], ['D', 'F', 1], ['D', 'H', 1], ['F', 'H', 1]], positions: ring(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'], 50, 50, 38, 42, Math.PI / 8)}, ['A', 'D', 'F', 'H'], 5),
    objective: 'Colour every lantern with as few colours as you can. Then show why fewer cannot work.',
    visibleObjective: 'Use the fewest colours, then show why not fewer.',
    idea: 'Four colours: A, D, F and H all link to each other.',
    prerequisites: 'Why not fewer puzzles 1–3.',
    hints: ['Look for lanterns with many links.', 'Four of the lanterns all link to each other.', 'Tap A, D, F and H.'],
    parent: {
      notice: 'Whether your child finds the four lanterns by checking every pair.',
      prompt: 'How do you know A, D, F and H need four different colours?',
      explanation: 'Every two of A, D, F and H are linked (six links), so they need four colours. The other lanterns can then fit in, so 4 is the fewest.',
      extension: 'Remove one of the six links among A, D, F and H. How many colours now?',
      connection: 'A clique of size 4 needs 4 colours.'
    },
    provenance: 'Week 62 Problem 3 (the largest group in which every pair conflicts), new network.'
  }
];

const groupId = item => item.mechanic === 'firstfit' ? 'firstfit' : 'fewest';
export function answers(item) {
  const q = item.parameters;
  const fewest = fewestColors(q);
  if (item.mechanic === 'fewest') {
    const proof = q.proof.map(v => q.vertices.indexOf(v));
    if (shows(q, proof) !== fewest) throw new Error(`${item.title}: the proof shows ${shows(q, proof)}, not ${fewest}`);
    return {fewest, proof: q.proof};
  }
  const most = mostColors(q), order = completeOrder(q, [], q.target);
  return {fewest, most, reachable: Boolean(order), ...(order ? {order: order.map(v => q.vertices[v])} : {})};
}
export const puzzles = authored.map(item => ({
  id: `${groupId(item)}-${String(item.number).padStart(2, '0')}`,
  number: item.number,
  title: item.title,
  band: 'all',
  difficulty_level: item.difficulty_level,
  mechanic: item.mechanic,
  libraryFamily: 'color',
  group: item.group,
  familyTitle: 'Neighbor Lanterns',
  revision: 1,
  parameters: item.parameters,
  objective: item.objective,
  visibleObjective: item.visibleObjective ?? item.objective,
  instruction: item.objective,
  controls: CONTROLS[item.mechanic === 'fewest' ? 'fewest' : item.parameters.goal],
  rules: item.mechanic === 'firstfit' ? [...family.rules, FIT_RULE] : family.rules,
  idea: item.idea,
  prerequisites: item.prerequisites,
  hints: item.hints,
  parent: {...item.parent, sourceIds: ['firstfit-week62', item.mechanic === 'firstfit' ? 'firstfit-grundy' : 'firstfit-konig']},
  solution: answers(item),
  provenance: item.provenance,
  sourceDocument: 'docs/firstfit/README.md'
}));
export const pack = {title: 'Neighbor Lanterns first fit', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/firstfit/firstfit.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.title, JSON.stringify(p.solution));
}
