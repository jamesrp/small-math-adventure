// Builds dist/families/holes/holes.json, the Holes group in Lantern Wires,
// from the boards and the authoring list below. Every answer is computed
// here with the module's own rules (dist/families/holes/holes.js) and the
// authored witness is replayed; scripts/validate-holes.mjs checks every
// answer again by other methods (sums of tile outlines mod 2, ray casting
// and searches over every choice). Design notes and sources:
// docs/holes/README.md.
import {writeFile} from 'node:fs/promises';
import {boardOf, validShape, edgesOf, maskOf, listOf, facesInside, certificates, canGoDark, startLit, replaySchedule, raceSets, canRace, puzzleOk, holesMechanics} from '../dist/families/holes/holes.js';

const WEEK77 = 'https://github.com/jamesrp/math-circle-worksheets/tree/main/lowell-math-circle-year-2/week-77';
export const sources = [
  {id: 'holes-week77', title: 'Bellingham Math Circle — Week 77: Persistent holes, student packet (Grades 4–5, F77-45-v2) and adult guide (F77-FAC-v2)', url: WEEK77, kind: 'local curriculum'},
  {id: 'holes-edelsbrunner', title: 'H. Edelsbrunner and J. Harer, Computational Topology: An Introduction (AMS, 2010), §IV.1 (homology over Z₂: cycles, boundaries and their quotient) and §VII.1 (persistent homology: classes born and dying in a filtration)', url: 'https://bookstore.ams.org/mbk-69', kind: 'reference'},
  {id: 'holes-ghrist', title: 'R. Ghrist, Barcodes: the persistent topology of data, Bulletin of the AMS 45 (2008) 61–75', url: 'https://doi.org/10.1090/S0273-0979-07-01191-3', kind: 'research'}
];

export const family = {
  id: 'holes',
  title: 'Lantern Wires holes',
  mathematics: 'A board is a flat region cut into triangles; some triangles carry a tile and some boards have a hole that no tile can cover. The sides of the triangles are wires. Tapping a tile flips its three wires, lit to dark and dark to lit, so the lit wires change by the tile’s outline, counted mod 2. Lit wires always make loops: an even number meets at every dot. The faces of a connected flat board (its triangles and its holes) have outlines that are independent mod 2 and add up to every loop, so each loop L is the outline of exactly one set of faces, the faces inside L: those from which a path out to the edge of the page crosses L an odd number of times. Tapping a tile changes that set by the tile alone. So the faces inside the lit wires that are not tiles never change: the wires can all go dark exactly when every face inside them is a tile, and an empty triangle or a hole inside is the certificate that they can’t. In the language of homology over Z₂, a loop is a 1-cycle, the tiles’ outlines are boundaries, and the hole is a class that no tiles can kill. On a growing board, where wires and tiles are added and never removed (a filtration), a loop is gone, the outline of some filled tiles, exactly when every face inside it is a filled triangle. So a loop goes out with the last tile inside it, a loop round a hole never goes out, and a loop that is out stays out. Of two loops, the yellow one can go out while the pink one is still lit exactly when the pink loop needs a tile the yellow one doesn’t; when every tile the pink loop needs is inside the yellow loop, the pink loop goes out first or with it. This is persistent homology in miniature: classes are born when a wire closes a loop and die when a tile fills it in, and the order of the additions decides which loop dies when.',
  rules: [
    'The sides of the triangles are wires. Wires make a loop when an even number of them meet at every dot.',
    'Tapping a tile flips its three wires: lit wires go dark and dark ones light.',
    'A hole is not a triangle and never takes a tile.'
  ],
  sourceIds: sources.map(s => s.id)
};

/* ------------------------------------------------------------------ *
 * Boards. Points are in triangle-side units with y up; dots and triangles
 * are numbered in reading order (top row first, left to right), which is
 * what their accessible names use.
 * ------------------------------------------------------------------ */
const H = Math.sqrt(3) / 2;
const r4 = x => Number(x.toFixed(4)) || 0;
// A mesh spec from points and triangles, renumbered in reading order. row
// gives a triangle's row from its centre (higher rows first).
function meshFrom(points, cells, row = ([, y]) => Math.floor(y / H + 1e-6)) {
  const dots = points.map((p, k) => ({p, k})).sort((a, b) => b.p[1] - a.p[1] || a.p[0] - b.p[0]);
  const newIndex = new Map(dots.map((d, i) => [d.k, i]));
  const centre = c => [0, 1].map(d => c.reduce((s, k) => s + points[k][d], 0) / 3);
  const tris = cells.map(c => ({c, m: centre(c)})).sort((a, b) => row(b.m) - row(a.m) || a.m[0] - b.m[0]);
  return {points: dots.map(d => d.p.map(r4)), cells: tris.map(t => t.c.map(k => newIndex.get(k)))};
}
// Lattice triangles [u, v, o]: o = 0 points up with corners (u, v),
// (u + 1, v), (u, v + 1); o = 1 points down with corners (u + 1, v),
// (u + 1, v + 1), (u, v + 1). Lattice point (u, v) sits at (u + v/2, v·√3/2).
const corners = ([u, v, o]) => o ? [[u + 1, v], [u + 1, v + 1], [u, v + 1]] : [[u, v], [u + 1, v], [u, v + 1]];
function lattice(cells) {
  const ids = new Map(), points = [];
  const id = ([u, v]) => { const k = `${u},${v}`; if (!ids.has(k)) { ids.set(k, points.length); points.push([u + v / 2, v * H]); } return ids.get(k); };
  return meshFrom(points, cells.map(c => corners(c).map(id)));
}
// A hexagon of side r round lattice point (0, 0), as lattice triangles.
function hexagon(r) {
  const out = [];
  for (let v = -r; v < r; v++) for (let u = -2 * r; u <= 2 * r; u++) for (const o of [0, 1]) {
    const inside = corners([u, v, o]).every(([a, b]) => { const x = a + b / 2, y = b * H; return Math.abs(y) <= r * H + 1e-9 && H * Math.abs(x) + Math.abs(y) / 2 <= r * H + 1e-9; });
    if (inside) out.push([u, v, o]);
  }
  return out;
}
const triangle = n => { const out = []; for (let v = 0; v < n; v++) for (let u = 0; u + v < n; u++) { out.push([u, v, 0]); if (u + v < n - 1) out.push([u, v, 1]); } return out; };
const strip = n => Array.from({length: n}, (_, i) => [i >> 1, 0, i & 1]);
const same = (a, b) => a.join() === b.join();

export const boards = {
  // Week 77's square: four rim wires and a diagonal.
  square: meshFrom([[0, 2], [2, 2], [2, 0], [0, 0]], [[0, 1, 2], [0, 2, 3]], ([, y]) => y),
  strip6: lattice(strip(6)),
  strip4: lattice(strip(4)),
  ring: lattice(hexagon(2).filter(c => !hexagon(1).some(d => same(c, d)))),
  wheel: lattice(hexagon(1)),
  big: lattice(triangle(4))
};
for (const [name, mesh] of Object.entries(boards)) if (!validShape(mesh)) throw Error(`board ${name} is not a clean board`);

// The wires of a set of faces' outlines, mod 2, as pairs of dots.
function outline(mesh, faces) {
  const B = boardOf({mesh}), mask = new Uint8Array(B.E);
  for (const f of faces) for (const e of B.faceEdges[f]) mask[e] ^= 1;
  return listOf(mask).map(e => [...B.m.edges[e]]);
}
const all = mesh => [...mesh.cells.keys()];
const except = (mesh, list) => all(mesh).filter(t => !list.includes(t));
const HOLE = boards.ring.cells.length; // the ring's one hole is face T

/* ------------------------------------------------------------------ *
 * Words shared by each kind of puzzle.
 * ------------------------------------------------------------------ */
const KEYS = things => `With a keyboard, Tab moves between the ${things} and Enter or Space taps the one in focus.`;
const CONTROLS = {
  cancel: q => `The sides of the triangles are wires. Tapping a tile flips its three wires: each lit wire goes dark and each dark one lights. Tap a tile to flip its wires. If the wires can never all go dark, tap a tile first, then press Can’t and tap the triangle${q.holes ? ' or hole' : ''} that keeps them lit. ${KEYS('tiles')} Undo takes back a tap.`,
  schedule: () => `The sides of the triangles are wires: solid lines are wires in, and dashed lines are places for more. The first loop the wires close lights up, and a lit loop goes out once some filled tiles together have it as their outline. Tap a dashed line to add a wire, and tap a triangle with all three of its wires in to fill it with a tile. ${KEYS('dashed lines and the triangles ready for a tile')} Undo takes back a step.`,
  race: () => `The sides of the triangles are wires, and two loops of them are lit, one yellow and one pink. A lit loop goes out once some filled tiles together have it as their outline. Tap a triangle to fill it with a tile. If the yellow loop can’t go out while the pink one is lit, fill a triangle first, then press Can’t, tap the tiles that fill the pink loop and press Check. ${KEYS('triangles')} Undo takes back a fill.`
};
const OBJECTIVE = {
  cancel: 'Tap tiles until every wire is dark, or show why that can’t happen.',
  schedule: 'Add wires and fill triangles so that the first loop to close goes out exactly when the marked tile is filled.',
  race: 'Fill triangles so that the yellow loop goes out while the pink loop is still lit, or show why that can’t happen.'
};
const VISIBLE = {
  cancel: 'Make every wire dark.',
  schedule: 'Make the first loop go out with the marked tile.',
  race: 'Make the yellow loop go out while the pink one is lit.'
};
const HOLE_RULE = 'The hole is not a triangle and never takes a tile.';
const RULES = {
  cancel: q => [family.rules[0], family.rules[1], ...(q.holes ? [HOLE_RULE] : []), 'Can’t needs a tap first. After a wrong Can’t, tap a tile before trying again.'],
  schedule: q => ['Solid lines are wires; a dashed line is a place for one.', 'The first loop the wires close lights up. Later loops stay dark.', 'A triangle takes a tile only when all three of its wires are in.', 'A lit loop goes out once some filled tiles together have it as their outline.', ...(q.holes ? [HOLE_RULE] : []), 'The outlines under the board stand for the tiles; the marked one is where the loop must go out.'],
  race: () => ['Every wire is in, so any triangle can take a tile.', 'A lit loop goes out once some filled tiles together have it as their outline.', 'The yellow loop must go out while the pink one is still lit.', 'Can’t needs a fill first. After a wrong Can’t, fill a triangle before trying again.']
};

/* ------------------------------------------------------------------ *
 * The puzzles. expect says what the module must find: 'dark' or the
 * certificates of a Can't board, the first wires that can still win a
 * schedule (by their loops' sizes), or whether a race can be won.
 * ------------------------------------------------------------------ */
const B77 = 'Week 77 (Grades 4–5)';
const authored = [
  {
    number: 1, difficulty_level: 'easy', title: 'Square',
    parameters: {kind: 'cancel', mesh: boards.square, filled: [0, 1], lit: outline(boards.square, [0, 1])},
    expect: {dark: true, taps: 2},
    idea: 'Tapping a tile flips its three wires. The square’s rim is the outline of both halves together, so tapping both makes it dark.',
    prerequisites: 'None. No arithmetic, and no reading beyond the line under the board.',
    hints: ['Tap one tile and watch which wires change.', 'After one tap the lit wires go round the other triangle.', 'Tap both tiles.'],
    parent: {
      notice: 'Whether your child expects one tap to finish, and what the first tap does: two rim wires go dark and the diagonal lights.',
      prompt: 'Which wire lit up when you tapped the first tile? Why did it go dark again?',
      explanation: 'A tap flips the tile’s three wires. The rim is lit; tapping the top right tile puts out its two rim wires and lights the diagonal, so the lit wires now go round the other triangle. Tapping that one puts them all out. The diagonal was flipped twice, so it ends dark: the rim is the outline of the two halves together, counted mod 2. In Week 77 this is what “gone” means: filled tiles whose combined outline is the loop.',
      extension: 'Does the order of the two taps matter? (No: a wire ends lit or dark by how many times it was flipped.)',
      connection: 'Week 77 page 1: the square’s rim AB, BC, CD, DA is gone once both halves are filled, because their shared diagonal is inside. Mod 2, the rim is the sum of the two triangles’ outlines.'
    },
    provenance: `${B77} page 1, the worked example: the saved rim AB, BC, CD, DA of the divided square is gone once both halves are filled; and Problem 1 (“build a loop that survives either choice of a single filled triangle”).`
  },
  {
    number: 2, difficulty_level: 'easy', title: 'Strip',
    parameters: {kind: 'cancel', mesh: boards.strip6, filled: [0, 1, 2, 3, 4], lit: outline(boards.strip6, [1, 2, 3])},
    expect: {dark: true, taps: 3},
    idea: 'Tap the tiles inside the lit loop: each tap takes one triangle out of the loop, and a tile outside it makes the loop bigger.',
    prerequisites: 'Square.',
    hints: ['Which triangles are inside the lit loop?', 'Tapping a tile inside the loop takes that triangle out of it.', 'Tap the three tiles inside the loop.'],
    parent: {
      notice: 'Whether your child taps a tile outside the loop, sees the loop grow to take it in, and taps it again.',
      prompt: 'What happens to the loop when you tap a tile inside it? And outside it?',
      explanation: 'The lit wires are the outline of the three triangles they go round. Tapping one of those tiles flips its three wires, so the loop then goes round the other two; tapping a tile outside adds its triangle to the loop. Tapping all three inside puts every wire out. The empty triangle at the end is outside the loop and never matters.',
      extension: 'Can every wire go dark with fewer than three taps? (No: each of the three triangles inside must be tapped an odd number of times.)',
      connection: 'Week 77’s token test adds the three edges of each filled tile and cancels matching pairs. Here the cancelling happens on the board.'
    },
    provenance: 'New for the app: Week 77’s page 1 “gone” test (add the edge tokens of the filled tiles, remove matching pairs) as taps on a strip of six triangles.'
  },
  {
    number: 3, difficulty_level: 'easy', title: 'Another strip',
    parameters: {kind: 'cancel', mesh: boards.strip6, filled: [0, 1, 3, 4, 5], lit: outline(boards.strip6, [0, 1, 2, 3, 4])},
    expect: {certificates: [2]},
    idea: 'An empty triangle inside the lit loop never leaves it: taps move the loop, but the empty triangle stays inside, so the wires can’t all go dark.',
    prerequisites: 'Strip.',
    hints: ['Tap tiles inside the loop and watch where it goes.', 'Can the empty triangle ever leave the loop?', 'The loop always goes round the empty triangle. Press Can’t and tap it.'],
    parent: {
      notice: 'Whether your child keeps tapping, trying to reach the empty triangle, and whether they can say why it never goes.',
      prompt: 'You can’t tap the empty triangle. Could the loop ever stop going round it?',
      explanation: 'Every loop on this strip goes round exactly one set of triangles, and a tap adds or removes just the triangle tapped. The empty triangle has no tile, so nothing ever takes it out of the set: the lit wires always go round it and can’t all be dark. Tapping it after Can’t shows the reason, with the triangles the loop goes round shaded.',
      extension: 'If the empty triangle were outside the loop, could the wires go dark? (Yes, as in Strip.)',
      connection: 'In Week 77’s words, the saved loop survives because a triangle it needs is never filled: a loop is gone exactly when every triangle inside it is filled.'
    },
    provenance: 'New for the app: a strip whose lit loop goes round an empty triangle, after Week 77 page 1 (a loop is gone when “some selection” of the filled triangles leaves no tokens).'
  },
  {
    number: 4, difficulty_level: 'easy', title: 'Ring',
    parameters: {kind: 'cancel', mesh: boards.ring, filled: all(boards.ring), lit: outline(boards.ring, [HOLE, 2, 6, 7])},
    expect: {certificates: [HOLE]},
    idea: 'A loop round the hole stays round the hole: taps move it, but the hole is never a tile.',
    prerequisites: 'Another strip.',
    hints: ['Tap the tiles inside the loop.', 'What is left inside the loop once you have tapped them?', 'The loop always goes round the hole. Press Can’t and tap the hole.'],
    parent: {
      notice: 'Whether your child taps the three tiles and then tries tiles further round, chasing the loop round the ring.',
      prompt: 'Every triangle has a tile. Why can’t the wires go dark?',
      explanation: 'The lit wires go round the hole and three tiles. Tapping those three leaves the hole’s own rim lit. Any tap from there moves the loop out round another triangle, but the hole stays inside, because a tap changes only the tile tapped and the hole is not a tile. So some wires are always lit. Here no lit wire is touched only by empty triangles, and still the wires can’t go dark.',
      extension: 'Is there a lit loop on this ring that goes round the hole and can go dark? (No: whatever you tap, the hole stays inside.)',
      connection: 'The hole is a permanent hole: in homology over Z₂ a loop round it is a class that no tiles can kill. This is the Week 77 card’s “ring with a permanent hole”.'
    },
    provenance: 'New for the app: a ring with a permanent hole, as the Week 77 review card’s Decision asks, with the lit loop round the hole and every triangle tiled.'
  },
  {
    number: 5, difficulty_level: 'medium', title: 'Ring again',
    parameters: {kind: 'cancel', mesh: boards.ring, filled: except(boards.ring, [0, 3]), lit: outline(boards.ring, [10, 13, 14, 15, 16, 17, 11])},
    expect: {dark: true, taps: 7},
    idea: 'The loop hugs the hole but doesn’t go round it. Every triangle inside it is a tile, so tapping them all makes it dark.',
    prerequisites: 'Ring.',
    hints: ['Does the loop go all the way round the hole?', 'Every triangle inside the loop has a tile.', 'Tap the seven tiles inside the loop.'],
    parent: {
      notice: 'Whether your child decides at a glance that the loop goes round the hole, as in Ring, and presses Can’t.',
      prompt: 'Is the hole inside this loop? How can you tell?',
      explanation: 'The loop runs along the bottom of the hole’s rim but turns back at both ends, so the hole is outside it: from the hole you can reach the edge of the board across the top without crossing a lit wire. Inside are seven triangles, all with tiles, so tapping each once puts every wire out. The two empty triangles at the top are outside the loop and don’t matter.',
      extension: 'Can you tap tiles to make the lit wires go all the way round the hole? (No: a tap never changes whether the hole is inside, and here it is outside.)',
      connection: 'Inside and outside are decided by crossings: a face is inside the lit wires when a path from it to the edge of the board crosses them an odd number of times.'
    },
    provenance: 'New for the app: a loop beside the hole that doesn’t go round it, the contrast to Ring.'
  },
  {
    number: 6, difficulty_level: 'medium', title: 'Star',
    parameters: {kind: 'cancel', mesh: boards.ring, filled: all(boards.ring), lit: outline(boards.ring, [2, 6, 7, 10, 11, 15])},
    expect: {dark: true, taps: 6},
    idea: 'Two loops round the hole together go round no hole: a path out from the hole crosses two lit wires, so the hole is outside, and the six tiles between the loops make the wires dark.',
    prerequisites: 'Ring again.',
    hints: ['Is the hole inside the lit wires? Count the lit wires a path from the hole to the edge of the board crosses.', 'A path out from the hole crosses two lit wires.', 'Tap the six tiles whose sides are all lit.'],
    parent: {
      notice: 'Whether your child says it can’t be done because the wires go round the hole, as in Ring, and what they think when Can’t on the hole is refused.',
      prompt: 'The hexagon and the star both go round the hole. Why can these wires go dark when the loop in Ring couldn’t?',
      explanation: 'There are two loops here: the hexagon round the hole and the star round that. A path from the hole to the edge of the board crosses one wire of each, two crossings, an even number, so the hole is outside the lit wires. Inside are the six triangles between the hexagon and the star, all tiles, each with all three sides lit: tapping the six puts everything out. Mod 2, two loops round the same hole add up to the outline of the tiles between them.',
      extension: 'What if only the hexagon were lit? (Then the hole is inside and the wires can’t go dark, as in Ring.)',
      connection: 'In homology over Z₂ two loops round the same hole add up to zero, twice the hole’s class. Week 77’s mod 2 rule, “two copies of one edge cancel”, is what makes it work.'
    },
    provenance: 'New for the app: two loops round the ring’s hole whose sum is the outline of the tiles between them.'
  },
  {
    number: 7, difficulty_level: 'medium', title: 'Big triangle',
    parameters: {kind: 'cancel', mesh: boards.big, filled: except(boards.big, [0, 6]), lit: outline(boards.big, except(boards.big, [0, 9, 15]))},
    expect: {certificates: [6]},
    idea: 'An empty triangle keeps the wires lit even when no lit wire touches it: it is inside the loop, and taps never move it out.',
    prerequisites: 'Another strip.',
    hints: ['Tap some tiles inside the loop and watch where the loop goes.', 'Which triangle inside the loop can’t you tap?', 'The loop always goes round the middle triangle. Press Can’t and tap it.'],
    parent: {
      notice: 'Whether your child looks for a lit wire beside an empty triangle, finds none and decides the wires can go dark, and whether they try Can’t on the empty top corner.',
      prompt: 'No lit wire touches the empty middle triangle. How does it stop the wires from going dark?',
      explanation: 'The lit hexagon goes round thirteen triangles, and one of them, in the middle, is empty. A tap adds or removes only its own tile from the set the loop goes round, so the middle triangle stays inside whatever you do and some wires are always lit. A lit wire beside an empty triangle is one way to see that a loop can’t go dark, but not the only one: here the empty triangle is buried. The empty corner at the top is outside the loop and doesn’t matter.',
      extension: 'Tap tiles until as few wires as possible are lit. What do they go round? (The middle triangle alone: its three sides.)',
      connection: 'The triangles inside a loop are its only filling. The Week 77 guide: “In a planar board a filling, if it exists, is unique.”'
    },
    provenance: 'New for the app: a buried empty triangle, which the Week 77 card’s proposed certificate (a lit edge that only unfilled tiles touch) doesn’t cover.'
  },
  {
    number: 8, difficulty_level: 'medium', title: 'Round the top',
    parameters: {kind: 'cancel', mesh: boards.ring, filled: except(boards.ring, [6, 16]), lit: outline(boards.ring, [7, 4, 3, 2, 1, 0, 6, 5, 9])},
    expect: {certificates: [6]},
    idea: 'This loop goes round an empty triangle but not the hole: the empty triangle is the reason, and the hole has no part in it.',
    prerequisites: 'Ring again and Big triangle.',
    hints: ['Is the hole inside the loop? Is every triangle inside it a tile?', 'One triangle inside the loop has no tile.', 'The loop always goes round the empty triangle beside the hole. Press Can’t and tap it.'],
    parent: {
      notice: 'Whether your child presses Can’t and taps the hole, since the loop curls round it.',
      prompt: 'Which keeps the loop lit, the hole or the empty triangle? How do you know?',
      explanation: 'The loop runs round the top of the ring and turns back at both ends, so the hole is outside it, as in Ring again. Inside are nine triangles, and one of them, beside the hole, is empty. Taps never take it out of the loop, so the wires can’t all go dark. The empty triangle at the bottom is outside the loop.',
      extension: 'If that empty triangle had a tile, how many taps would make the wires dark? (Nine.)',
      connection: 'A loop survives exactly when it goes round something no tile fills: an empty triangle or a hole.'
    },
    provenance: 'New for the app: a loop round an empty triangle beside the hole, with the hole outside it.'
  },
  {
    number: 9, difficulty_level: 'hard', title: 'First loop',
    parameters: {kind: 'schedule', mesh: boards.strip4, start: [[0, 3], [3, 4], [0, 1], [4, 5], [2, 5]], target: 3},
    expect: {first: [1, 2, 3], losing: 1},
    idea: 'The first wire decides which loop lights: the gap closes the whole rim, round all four triangles; a diagonal closes a loop round one, two or three. A loop goes out with the last tile inside it, so fill the triangles outside it first.',
    prerequisites: 'Strip.',
    hints: ['Add a dashed wire and see which loop lights. Undo and try another.', 'A loop goes out when the last triangle inside it is filled. How many triangles are inside the lit loop?', 'Add the diagonal that closes a loop round three triangles, then fill those three.'],
    parent: {
      notice: 'Whether your child fills the triangles inside the lit loop first, so that it goes out too soon, and then fills outside ones first.',
      prompt: 'Which tile put the loop out? Could you have made it go out later?',
      explanation: 'The solid wires are the rim with a gap at the top right, so the first dashed wire you add closes a loop at once. The gap closes the whole rim, which goes round all four triangles, so it can’t go out by the third tile. The diagonals close loops round one, two or three triangles. A loop goes out exactly when the last triangle inside it is filled, so for a loop round n triangles, fill 3 − n triangles outside it first and its own n after them.',
      extension: 'If the marked tile were the fourth, which first wires would work? (All four, each with the right order.)',
      connection: 'Week 77 Problem 2: on the square with AB, BC and CD in place, adding DA first saves the rim, which needs both halves; adding AC first saves triangle ABC, which goes out at stage 8 only if ACD is filled first.'
    },
    provenance: `${B77} Problem 2: “Save the first loop when it closes. Find every schedule in which that saved loop first disappears at stage 8.” The square’s start, its rim with one side missing, and its diagonal place become a strip of four triangles; the app asks for one schedule, not every one.`
  },
  {
    number: 10, difficulty_level: 'hard', title: 'Ring of wires',
    parameters: {kind: 'schedule', mesh: boards.ring, start: [[1, 2], [2, 6], [6, 10], [10, 14], [14, 17], [17, 16], [16, 15], [15, 11], [11, 7], [7, 3], [3, 0], [4, 3], [5, 1], [9, 6], [13, 14], [12, 16], [8, 11]], target: 2},
    expect: {first: [1, 2], losing: 8},
    idea: 'A loop round the hole never goes out, and a loop round three triangles can’t go out by the second tile. Choose a first wire whose loop goes round one or two triangles, then plan the order.',
    prerequisites: 'First loop and Ring.',
    hints: ['Add a dashed wire and see which loop lights. Does it go round the hole?', 'A loop round the hole never goes out. Look for a first wire whose loop goes round one or two triangles.', 'Add a wire that closes a loop round two triangles, then fill those two.'],
    parent: {
      notice: 'Whether your child adds the wire at the gap first, lighting a loop all the way round the hole, and keeps filling tiles waiting for it to go out.',
      prompt: 'Which first wires light a loop round the hole? Why can that loop never go out?',
      explanation: 'The solid wires are the outside rim with a gap at the top left and six spokes, one from each corner of the hole. Each dashed wire closes a loop through solid wires. The gap and the two wires beside it at the top close loops round the hole; the hole never takes a tile, so those loops never go out. Five wires close loops round three triangles, which need three tiles. The other eleven close loops round one or two triangles: for one, fill a triangle outside it first; for two, fill those two.',
      extension: 'If the marked tile were the third, which first wires would work? (Every one whose loop doesn’t go round the hole.)',
      connection: 'Persistent homology: a class is born when a wire closes a loop and dies when tiles fill it in. A loop round the hole is a class that never dies on this board, an endless bar in its barcode.'
    },
    provenance: 'New for the app: Week 77 Problem 2’s schedule on a ring with a permanent hole, as the Week 77 review card’s Decision asks.'
  },
  {
    number: 11, difficulty_level: 'hard', title: 'Wheel',
    parameters: {kind: 'race', mesh: boards.wheel, yellow: outline(boards.wheel, [0, 2, 3, 4, 5]), pink: outline(boards.wheel, [0, 1, 3, 4, 5])},
    expect: {race: true},
    idea: 'The yellow loop needs every triangle but the top one; the pink loop needs the top one. Fill the yellow loop’s five first.',
    prerequisites: 'Ring again.',
    hints: ['Which triangles are inside the yellow loop? Which are inside the pink one?', 'The pink loop needs a triangle the yellow loop doesn’t. Leave it till last.', 'Fill every triangle but the top one.'],
    parent: {
      notice: 'Whether your child fills the triangles in reading order and sees both loops go out together, or the pink one first.',
      prompt: 'Which triangle does the pink loop need that the yellow loop doesn’t?',
      explanation: 'A loop goes out when the last triangle inside it is filled. The yellow loop goes round every triangle but the top one; the pink loop goes round every triangle but the one at the top right. So fill the five triangles inside the yellow loop, the top right one among them, and leave the top one: the yellow loop goes out while the pink one waits for the top triangle.',
      extension: 'Can you make the pink loop go out first instead? (Yes: fill every triangle but the top right one first.)',
      connection: 'Week 77 Problem 6: on the square fan, L₁ round ABO, CDO and DAO and L₂ round BCO, CDO and DAO can disappear in either order from a fresh board, because each needs a tile the other doesn’t.'
    },
    provenance: `${B77} Problem 6 (“Save two loops with different sets of edges”) and the guide’s fresh-board orders for L₁ and L₂ (“Fill CDO, DAO, ABO, BCO: L₁ disappears at the third filling”), moved from the four-triangle square fan to a six-triangle wheel.`
  },
  {
    number: 12, difficulty_level: 'hard', title: 'Big race',
    parameters: {kind: 'race', mesh: boards.big, yellow: outline(boards.big, [1, 2, 3, 4, 5, 6, 7, 8]), pink: outline(boards.big, [4, 5, 6, 7, 8])},
    expect: {race: false},
    idea: 'Every triangle the pink loop needs is inside the yellow loop, so whenever the yellow loop goes out the pink one is out already. The tiles that fill the pink loop prove it.',
    prerequisites: 'Wheel.',
    hints: ['Try to put the yellow loop out first. What happens to the pink loop?', 'Which triangles does the pink loop need? Are they all inside the yellow loop?', 'Every tile the pink loop needs is inside the yellow loop. Press Can’t, tap the tiles that fill the pink loop and press Check.'],
    parent: {
      notice: 'Whether your child tries several orders before suspecting it can’t be done, and whether they can point to the pink loop’s triangles as the reason.',
      prompt: 'When the yellow loop goes out, which triangles must be filled? Is the pink loop out by then?',
      explanation: 'The yellow loop goes out only when all eight triangles inside it are filled. The pink loop needs just the lower row of those, five triangles, all inside the yellow loop. So when the yellow loop goes out the pink loop’s five are filled, and it went out then or before. No order of fills changes that. Tapping the five tiles that fill the pink loop shows the reason.',
      extension: 'Which pink loops on this board could the yellow loop beat? (Any that goes round a triangle outside the yellow loop.)',
      connection: 'The Week 77 guide on Problem 6: “If one required set contains another, the smaller set is completed no later than the larger, in every order.”'
    },
    provenance: `${B77} Problem 6 and the guide’s argument for it (“If one required set contains another, the smaller set is completed no later than the larger, in every order”), as a race on a triangle of sixteen.`
  }
];

/* ------------------------------------------------------------------ *
 * Checks against the module, the witness from its own hints, and the pack.
 * ------------------------------------------------------------------ */
const hooks = holesMechanics.holes;
// Plays the module's hints from a fresh board to a solve: the witness.
function hintRun(p) {
  let b = hooks.fresh(p);
  for (let i = 0; i < 300 && !hooks.solved(p, b); i++) {
    const h = hooks.hint(p, b);
    if (h.type !== 'move') throw Error(`${p.id}: hint ${h.type} ${h.text}`);
    b = hooks.move(p, b, h.action);
    if (!b) throw Error(`${p.id}: hint move refused`);
  }
  if (!hooks.solved(p, b)) throw Error(`${p.id}: hints don’t solve`);
  return b;
}
const sorted = list => [...list].sort((a, b) => a - b);
function check(p, item) {
  const q = p.parameters, B = boardOf(q), e = item.expect;
  if (!puzzleOk(p)) throw Error(`${p.id}: puzzle data`);
  if (q.kind === 'cancel') {
    const inside = facesInside(B, startLit(p)), certs = certificates(p);
    if (e.dark && (!canGoDark(p) || inside.length !== e.taps)) throw Error(`${p.id}: expected dark in ${e.taps} taps, inside ${inside}`);
    if (e.certificates && sorted(certs).join() !== sorted(e.certificates).join()) throw Error(`${p.id}: certificates ${certs}`);
  } else if (q.kind === 'schedule') {
    // Each first wire's loop: its size, or a hole inside.
    const sizes = [];
    for (let edge = 0; edge < B.E; edge++) {
      const s = replaySchedule(p, [{edge}]);
      if (!s.ok || !s.saved) continue;
      sizes.push(s.inside.some(f => f >= B.T) ? 'hole' : s.inside.length);
    }
    const winning = sizes.filter(n => n !== 'hole' && n <= q.target);
    if (sorted([...new Set(winning)]).join() !== e.first.join() || sizes.length - winning.length !== e.losing) throw Error(`${p.id}: first wires ${sizes}`);
  } else if (canRace(p) !== e.race) throw Error(`${p.id}: race ${canRace(p)}`);
}
const common = {band: 'all', group: 'Holes', mechanic: 'holes', libraryFamily: 'toggle', familyTitle: 'Lantern Wires', revision: 1, sourceDocument: 'docs/holes/README.md'};
const sourcesFor = text => ['holes-week77', ...(/homology|class/.test(text) ? ['holes-edelsbrunner'] : []), ...(/barcode|[Pp]ersistent homology/.test(text) ? ['holes-ghrist'] : [])];
export const puzzles = authored.map(item => {
  const q = item.parameters, holes = boardOf(q).holes.length > 0;
  const p = {
    id: `holes-${String(item.number).padStart(2, '0')}`,
    number: item.number,
    title: item.title,
    difficulty_level: item.difficulty_level,
    ...common,
    parameters: q,
    objective: OBJECTIVE[q.kind],
    visibleObjective: VISIBLE[q.kind],
    instruction: OBJECTIVE[q.kind],
    controls: CONTROLS[q.kind]({holes}),
    rules: RULES[q.kind]({holes}),
    idea: item.idea,
    prerequisites: item.prerequisites,
    hints: item.hints,
    parent: {...item.parent, sourceIds: sourcesFor(Object.values(item.parent).join(' '))},
    provenance: item.provenance
  };
  check(p, item);
  const end = hintRun(p);
  p.solution = q.kind === 'schedule' ? {steps: end.steps, outWith: q.target}
    : q.kind === 'race' ? {fills: end.fills, cant: end.cant, pinkTiles: sorted(raceSets(p).pink)}
    : {taps: end.taps, cant: end.cant, inside: sorted(facesInside(boardOf(q), startLit(p)))};
  return p;
});
export const pack = {title: 'Lantern Wires holes', version: 1, families: [family], sources, puzzles};

if (process.argv[1] === new URL(import.meta.url).pathname) {
  await writeFile(new URL('../dist/families/holes/holes.json', import.meta.url), JSON.stringify(pack, null, 1) + '\n');
  for (const p of puzzles) console.log(p.id, p.difficulty_level, p.parameters.kind, JSON.stringify(p.solution));
}
